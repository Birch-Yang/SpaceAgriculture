import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url)).replace(/\/$/, '');
const {createInitialState,applyBuildAction,startOperation,advanceLevel}=await import(root+'/src/game/state/reducer.ts');
const {resolveTurn,apRecovery}=await import(root+'/src/game/simulation/resolveTurn.ts');
const {seedForLevel}=await import(root+'/src/game/simulation/hazards.ts');
const {scoreRules}=await import(root+'/src/game/simulation/scoring.ts');
const {actionCost}=await import(root+'/src/game/phaser/agricultureAdapter.ts');
const placements=[['habitat-core',0,0],['solar-array',3,0],['oxygen-generator',3,3],['water-recycler',0,4],['greenhouse-standard',6,0],['livestock-compact',6,3]];
const paths=[[{x:2,y:0}],[{x:3,y:2}],[{x:0,y:2},{x:0,y:3}],[{x:5,y:0}],[{x:6,y:2}]];
function build(s,a){const r=applyBuildAction(s,a);if(r.error)throw Error(r.error);return r.state}
function setup(id,mode,layout){let s=createInitialState(id,'Offline QA',mode);for(const [moduleId,x,y]of(layout==='habitat'?placements.slice(0,1):placements))s=build(s,{type:'PLACE_MODULE',moduleId,x,y,rotation:0});if(layout==='connected')for(const cells of paths)s=build(s,{type:'PLACE_CORRIDOR',cells});return s}
const cases=[
 {name:'Connected lettuce, active care',crop:'lettuce'},
 {name:'Connected potato, active care',crop:'potato'},
 {name:'Connected radish, active care',crop:'radish'},
 {name:'Connected chili, active care',crop:'chili-pepper'},
 {name:'Connected soybean, active care',crop:'soybean'},
 {name:'Research crop with default lettuce',crop:'arabidopsis'},
 {name:'Disconnected outpost',crop:'lettuce',layout:'disconnected'},
 {name:'Habitat-only novice start',layout:'habitat'},
 {name:'Progressive active care',crop:'lettuce',mode:'progressive'},
 {name:'Progressive passive farming',crop:'lettuce',mode:'progressive',passive:true},
];
const runs=[];
for(const [i,c]of cases.entries()){
 const id=`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`;
 let state=setup(id,c.mode??'challenge',c.layout??'connected');const startingBudget=state.budget;
 state=startOperation(state);const turns=[];let planted=false;
 while(state.phase!=='complete'&&turns.length<45){
  if(state.phase==='intermission'){state=startOperation(advanceLevel(state));continue}
  const options=[];
  for(const p of state.crops)if(p.ready&&!c.passive)options.push({type:'HARVEST_CROP',moduleId:p.moduleId,slotIndex:p.slotIndex});
  if(!planted&&state.crops.some(p=>p.slotIndex===1)&&!c.passive){const p=state.crops.find(p=>p.slotIndex===1);options.push({type:'PLANT_CROP',moduleId:p.moduleId,slotIndex:1,crop:c.crop});}
  if(!c.passive){
   for(const m of state.modules)if(m.integrity<.65)options.push({type:'REPAIR',targetId:m.id});
   for(const p of state.crops)if(p.crop&&p.light!=='high')options.push({type:'SET_CROP_PARAMS',moduleId:p.moduleId,slotIndex:p.slotIndex,water:'high',light:'high',temperature:'medium'});
   for(const p of state.crops)if(p.crop&&!p.ready&&!p.wateredThisCycle)options.push({type:'WATER_PLOT',moduleId:p.moduleId,slotIndex:p.slotIndex});
   for(const a of state.livestock)if(a.animal&&!a.fedThisCycle)options.push({type:'FEED_STALL',moduleId:a.moduleId,slotIndex:a.slotIndex});
  }
  let budget=apRecovery(state);const actions=[];for(const a of options)if(actionCost(a)<=budget){actions.push(a);budget-=actionCost(a)}
  const result=resolveTurn(state,[...actions,{type:'END_TURN'}],seedForLevel(state));
  if(result.acceptedActions.some(a=>a.type==='PLANT_CROP'))planted=true;
  turns.push({level:state.level,turn:state.turn,uiAdvertisedAP:apRecovery(state),planned:actions,accepted:result.acceptedActions,rejected:result.rejectedActions,resources:result.state.resources,production:result.state.production,warnings:result.summary.warnings,hazard:result.summary.hazard,crisis:result.state.crisis});state=result.state;
 }
 runs.push({case:i+1,name:c.name,id,mode:c.mode??'challenge',startingBudget,phase:state.phase,passed:state.passed,level:state.level,turn:state.turn,totalTurns:turns.length,production:state.production,reason:state.failureReason,score:scoreRules(state),turns});
}
// Targeted economy reproduction with the same connected layout, no fabricated state.
let connected=setup('economy-repro','challenge','connected');const greenhouse=connected.modules.find(m=>m.moduleId==='greenhouse-standard');const attached=connected.utilityEdges.filter(e=>e.from===greenhouse.id||e.to===greenhouse.id);let removed=build(connected,{type:'REMOVE_MODULE',placedModuleId:greenhouse.id});const loss=attached.reduce((n,e)=>n+e.cells.length,0);
const output={commit:'029917a plus balance/qa-fixes-2026-09-26 working changes',method:'Ten offline missions using production reducer and turn resolver; authoritative recoverable AP used for planning; no state mutation, API calls, or leaderboard writes.',runs,extra:{attachedRemoval:{budgetBefore:connected.budget,budgetAfter:removed.budget,removedCorridors:attached.length,removedCorridorCells:loss, materialLoss:connected.budget+28+loss-removed.budget}}};
fs.writeFileSync(root+'/src/ui/qa/ten-missions-fixed-2026-09-26.json',JSON.stringify(output,null,2));
console.log(JSON.stringify({runs:runs.map(({turns,...r})=>({...r,rejected:turns.flatMap(t=>t.rejected),crises:turns.filter(t=>t.crisis).map(t=>`${t.level}:${t.turn}`)})),extra:output.extra},null,2));
