import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url)).replace(/\/$/, '');
const {createInitialState,applyBuildAction,startOperation,advanceLevel}=await import(root+'/src/game/state/reducer.ts');
const {resolveTurn,apRecovery,planOperationActions}=await import(root+'/src/game/simulation/resolveTurn.ts');
const {seedForLevel}=await import(root+'/src/game/simulation/hazards.ts');
const {DIFFICULTY}=await import(root+'/src/data/difficulty.ts');
const powerDelta=Number(process.env.CALIBRATION_POWER_DELTA??0);
if(!Number.isInteger(powerDelta)||powerDelta< -4||powerDelta>10)throw Error('CALIBRATION_POWER_DELTA must be an integer from -4 to 10');
DIFFICULTY.progressive[0].starting.power+=powerDelta;
DIFFICULTY.challenge[0].starting.power+=powerDelta;
const cropTarget=process.env.CALIBRATION_CHALLENGE_CROP_TARGET?Number(process.env.CALIBRATION_CHALLENGE_CROP_TARGET):DIFFICULTY.challenge[0].cropTarget;
if(!Number.isInteger(cropTarget)||cropTarget<1)throw Error('CALIBRATION_CHALLENGE_CROP_TARGET must be a positive integer');
DIFFICULTY.challenge[0].cropTarget=cropTarget;
const progressiveL3Pressure=process.env.CALIBRATION_PROG_L3_PRESSURE?Number(process.env.CALIBRATION_PROG_L3_PRESSURE):DIFFICULTY.progressive[2].hazardPressure;
if(!Number.isFinite(progressiveL3Pressure)||progressiveL3Pressure<80||progressiveL3Pressure>100)throw Error('CALIBRATION_PROG_L3_PRESSURE must be 80–100');
DIFFICULTY.progressive[2].hazardPressure=progressiveL3Pressure;
const placements=[['habitat-core',0,0],['solar-array',3,0],['oxygen-generator',3,3],['water-recycler',0,4],['greenhouse-standard',6,0],['livestock-compact',6,3]];
const paths=[[{x:2,y:0}],[{x:3,y:2}],[{x:0,y:2},{x:0,y:3}],[{x:5,y:0}],[{x:6,y:2}]];
function build(s,a){const r=applyBuildAction(s,a);if(r.error)throw Error(r.error);return r.state}
function setup(id,mode,layout){let s=createInitialState(id,'Offline QA',mode);for(const [moduleId,x,y]of(layout==='habitat'?placements.slice(0,1):placements))s=build(s,{type:'PLACE_MODULE',moduleId,x,y,rotation:0});if(layout==='connected')for(const cells of paths)s=build(s,{type:'PLACE_CORRIDOR',cells});return s}
const strategies=[
 {name:'Challenge high-input active',crop:'lettuce',setting:'high'},
 {name:'Challenge medium-input active',crop:'lettuce',setting:'medium'},
 {name:'Challenge passive',crop:'lettuce',passive:true},
 {name:'Challenge disconnected active',crop:'lettuce',layout:'disconnected',setting:'high'},
 {name:'Progressive high-input active',crop:'lettuce',mode:'progressive',setting:'high'},
];
const seeds=process.env.CALIBRATION_SEEDS
 ? process.env.CALIBRATION_SEEDS.split(',').filter(Boolean).map(Number)
 : [101,102,103,104];
if(!seeds.length||seeds.some(seed=>!Number.isInteger(seed)||seed<0))throw Error('CALIBRATION_SEEDS must be a comma-separated list of nonnegative integers');
const cases=[false,true].flatMap(rescue=>strategies.flatMap(c=>seeds.map(seed=>({...c,seed,rescue}))));
const runs=[];
for(const [i,c]of cases.entries()){
 const id=`00000000-0000-4000-8000-${String(c.seed).padStart(12,'0')}`;
 let state=setup(id,c.mode??'challenge',c.layout??'connected');
 state=startOperation(state);const turns=[];let planted=false;
 while(state.phase!=='complete'&&turns.length<45){
  if(state.phase==='intermission'){state=startOperation(advanceLevel(state));continue}
  const options=[];
  const paused=new Set();
  if(c.rescue){
   const resource=['oxygen','water','food','power'].find(key=>state.resources[key]<=8);
   if(resource&&(state.emergencySuppliesRemaining??2)>0)options.push({type:'USE_EMERGENCY_SUPPLY',resource});
   if(state.resources.power<=8||state.resources.water<=8){
    const m=state.modules.find(m=>m.moduleId==='greenhouse-standard');
    if(m){options.push({type:'PAUSE_MODULE',moduleId:m.id});paused.add(m.id)}
   }
  }
  for(const p of state.crops)if(p.ready&&!c.passive&&!paused.has(p.moduleId))options.push({type:'HARVEST_CROP',moduleId:p.moduleId,slotIndex:p.slotIndex});
  if(!planted&&!paused.size&&state.crops.some(p=>p.slotIndex===1)&&!c.passive){const p=state.crops.find(p=>p.slotIndex===1);options.push({type:'PLANT_CROP',moduleId:p.moduleId,slotIndex:1,crop:c.crop});}
  if(!c.passive){
   for(const m of state.modules)if(m.integrity<.65)options.push({type:'REPAIR',targetId:m.id});
   for(const p of state.crops)if(!paused.has(p.moduleId)&&p.crop&&(p.light!==c.setting||p.water!==c.setting))options.push({type:'SET_CROP_PARAMS',moduleId:p.moduleId,slotIndex:p.slotIndex,water:c.setting,light:c.setting,temperature:'medium'});
   for(const p of state.crops)if(!paused.has(p.moduleId)&&p.crop&&!p.ready&&!p.wateredThisCycle)options.push({type:'WATER_PLOT',moduleId:p.moduleId,slotIndex:p.slotIndex});
   for(const a of state.livestock)if(a.animal&&!a.fedThisCycle)options.push({type:'FEED_STALL',moduleId:a.moduleId,slotIndex:a.slotIndex});
  }
  const actions=[];for(const a of options)if(!planOperationActions(state,[...actions,a]).rejectedActions.length)actions.push(a);
  const result=resolveTurn(state,[...actions,{type:'END_TURN'}],seedForLevel(state));
  if(result.acceptedActions.some(a=>a.type==='PLANT_CROP'))planted=true;
  turns.push({level:state.level,turn:state.turn,uiAdvertisedAP:apRecovery(state),planned:actions,accepted:result.acceptedActions,rejected:result.rejectedActions,resources:result.state.resources,production:result.state.production,warnings:result.summary.warnings,hazard:result.summary.hazard,crisis:result.state.crisis});state=result.state;
 }
 runs.push({case:i+1,name:c.name,rescue:c.rescue,seed:c.seed,id,mode:c.mode??'challenge',phase:state.phase,passed:state.passed,level:state.level,turn:state.turn,totalTurns:turns.length,production:state.production,reason:state.failureReason,turns});
}
const summary={powerDelta,cropTarget,progressiveL3Pressure,seeds,assisted:{passed:runs.filter(r=>r.rescue&&r.passed).length,total:runs.filter(r=>r.rescue).length},unassisted:{passed:runs.filter(r=>!r.rescue&&r.passed).length,total:runs.filter(r=>!r.rescue).length},cases:runs.map(r=>({name:r.name,seed:r.seed,rescue:r.rescue,passed:r.passed,level:r.level,turn:r.turn,reason:r.reason,production:r.production,resources:r.turns.at(-1)?.resources}))};
if(process.env.CALIBRATION_OUTPUT)fs.writeFileSync(process.env.CALIBRATION_OUTPUT,JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary));
