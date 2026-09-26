"use client";

import { useState, type FormEvent } from "react";
import { MODULES, MODULE_BY_ID } from "../../data/modules.ts";
import { DIFFICULTY } from "../../data/difficulty.ts";
import { advanceLevel, applyBuildAction, createInitialState, startOperation } from "../state/reducer.ts";
import { resolveTurn } from "../simulation/resolveTurn.ts";
import type { AnimalKind, CropKind, GameMode, GameState, PlayerAction, Rotation, Setting } from "../state/types.ts";
import { Match3, type MinigameResult } from "../minigames/match3/Match3.tsx";
import { RepairSnake } from "../minigames/repairSnake/RepairSnake.tsx";
import { GameCanvas } from "./GameCanvas.tsx";
import { nextRotation } from "./isometric.ts";
import type { BuildTool } from "./GameScene.ts";
import styles from "./game.module.css";

const resourceKeys = ["power", "water", "oxygen", "food", "temperature"] as const;
const icons: Record<string, string> = { habitat: "⌂", greenhouse: "✿", livestock: "♜", oxygen: "◎", water: "◉", solar: "☼", battery: "▣", utility: "✥", communications: "⌁", shelter: "⬟", storage: "▤", recreation: "✧" };

export function GameClient() {
  const [nickname, setNickname] = useState("");
  const [mode, setMode] = useState<GameMode>("challenge");
  const [state, setState] = useState<GameState | null>(null);
  const [tool, setTool] = useState<BuildTool>({ kind: "select" });
  const [rotation, setRotation] = useState<Rotation>(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<PlayerAction[]>([]);
  const [message, setMessage] = useState("Choose a mission mode and enter a callsign.");
  const [mini, setMini] = useState<"match3" | "snake" | null>(null);
  const [miniResult, setMiniResult] = useState<MinigameResult | null>(null);
  const [cropSettings, setCropSettings] = useState<{ water: Setting; light: Setting; temperature: Setting }>({ water: "medium", light: "medium", temperature: "medium" });

  function launch(event: FormEvent) {
    event.preventDefault();
    try {
      setState(createInitialState(crypto.randomUUID(), nickname.trim(), mode));
      setTool({ kind: "select" }); setSelectedId(null); setPending([]);
      setMessage("Build a compact outpost. A Habitat Core is required to begin.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to create mission"); }
  }

  function build(action: PlayerAction) {
    if (!state) return;
    const result = applyBuildAction(state, action);
    setState(result.state);
    setMessage(result.error ?? "Base layout updated.");
    if (!result.error && action.type === "REMOVE_MODULE") setSelectedId(null);
  }

  function begin() {
    if (!state) return;
    try { setState(startOperation(state)); setTool({ kind: "select" }); setMessage("Mission active. Base layout is locked during operation."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Cannot begin mission"); }
  }

  function queue(action: PlayerAction) {
    setPending((actions) => [...actions, action]);
    setMessage(`${action.type.replaceAll("_", " ")} queued for next turn.`);
  }

  function endTurn() {
    if (!state) return;
    try {
      const result = resolveTurn(state, [...pending, { type: "END_TURN" }], `${state.runId}:${state.level}:${state.turn}`);
      setState(result.state.phase === "intermission" ? advanceLevel(result.state) : result.state); setPending([]);
      setMessage([`Turn ${result.summary.turn}: crops +${result.summary.cropYield}, meat +${result.summary.meatYield}.`, ...result.rejectedActions, ...result.summary.warnings].join(" "));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Turn failed"); }
  }

  function completeMini(result: MinigameResult) {
    setMiniResult(result); setMini(null);
    if (mini === "snake" && selectedId) queue({ type: "REPAIR", targetId: selectedId });
    if (mini === "match3" && selectedId && state?.crops.find((plot) => plot.moduleId === selectedId)?.ready) queue({ type: "HARVEST_CROP", moduleId: selectedId });
  }

  if (!state) return <main className={styles.launch}>
    <div className={styles.moon} aria-hidden="true" />
    <div className={styles.launchContent}><p className={styles.kicker}>LUNAR SOUTH POLE / MISSION SIMULATOR</p><h1>Build food systems<br /><em>where survival comes first.</em></h1><p>Design an outpost, connect utilities, grow food, and survive the lunar environment.</p>
      <form onSubmit={launch} className={styles.launchForm}><label>Mission callsign<input required maxLength={32} value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="Your nickname" /></label><label>Mode<select value={mode} onChange={(event) => setMode(event.target.value as GameMode)}><option value="challenge">Challenge · 10 turns</option><option value="progressive">Progressive · 3 levels</option></select></label><button className={styles.primary} type="submit">LAUNCH MISSION →</button></form><p role="status">{message}</p>
    </div>
  </main>;

  const building = state.phase === "design" || state.phase === "intermission";
  const selectedModule = state.modules.find((item) => item.id === selectedId);
  const selectedEdge = state.utilityEdges.find((item) => item.id === selectedId);
  const definition = selectedModule ? MODULE_BY_ID.get(selectedModule.moduleId) : undefined;
  const crop = state.crops.find((item) => item.moduleId === selectedId);
  const animal = state.livestock.find((item) => item.moduleId === selectedId);
  const target = DIFFICULTY[state.mode][state.level - 1];

  return <main className={styles.shell}>
    <header className={styles.header}><div><p className={styles.kicker}>AGRONaut / LUNAR AGRICULTURE</p><h1>South Pole Outpost</h1><p className={styles.meta}>{state.nickname} · {state.mode.toUpperCase()} · LEVEL {state.level} · TURN {state.turn}/10</p></div><div className={styles.headerActions}><span className={`${styles.phase} ${state.crisis ? styles.crisis : ""}`}>{state.crisis ? "CRISIS" : state.phase.toUpperCase()}</span><button onClick={() => setState(null)}>New run</button></div></header>
    <section className={styles.dashboard} aria-label="Mission resources">{resourceKeys.map((key) => {
      const value = state.resources[key];
      const critical = key === "temperature" ? value < 5 || value > 35 : value < 12;
      const fill = key === "temperature" ? Math.max(0, 100 - Math.abs(value - 20) * 5) : Math.max(0, Math.min(100, value));
      return <div key={key} className={`${styles.resource} ${critical ? styles.low : ""}`}><span>{key.toUpperCase()}</span><strong>{value.toFixed(1)} <small>{key === "temperature" ? "°C" : "units"}</small></strong><i><b style={{ width: `${fill}%` }} /></i></div>;
    })}<div className={styles.resource}><span>CROP / MEAT</span><strong>{state.production.cropCumulative.toFixed(0)} / {state.production.meatCumulative.toFixed(0)}</strong><small>Targets {target.cropTarget} / {target.meatTarget}</small></div></section>
    <div className={styles.workspace}>
      <aside className={styles.palette}><div className={styles.panelHeading}><strong>{building ? "BUILD CATALOG" : "MISSION TOOLS"}</strong><small>{building ? `${state.budget} MATERIAL` : `${state.ap} AP LAST TURN`}</small></div>
        {building ? <><button className={`${styles.toolButton} ${tool.kind === "select" ? styles.active : ""}`} onClick={() => setTool({ kind: "select" })}>⌖ Select / inspect</button><button className={`${styles.toolButton} ${tool.kind === "corridor" ? styles.active : ""}`} onClick={() => setTool({ kind: "corridor" })}>〰 Utility corridor <small>1 / cell</small></button><div className={styles.rotateRow}>Facing {rotation}° <button onClick={() => setRotation(nextRotation(rotation))}>↻ Rotate (R)</button></div><div className={styles.catalog}>{MODULES.map((item) => <button key={item.id} className={`${styles.moduleCard} ${tool.kind === "module" && tool.moduleId === item.id ? styles.active : ""}`} onClick={() => setTool({ kind: "module", moduleId: item.id })}><span className={styles.moduleTop}><b className={styles.icon}>{icons[item.category]}</b><strong>{item.label}</strong><b>{item.cost}</b></span><span className={styles.moduleStats}>SIZE {item.footprint.w}×{item.footprint.h} · P {item.flow.powerDemand ? `−${item.flow.powerDemand}` : `+${item.flow.powerSupply ?? 0}`} · W {item.flow.waterDemand ? `−${item.flow.waterDemand}` : `+${item.flow.waterSupply ?? 0}`}</span><span className={styles.moduleStats}>HEAT {item.heatOutput} · YIELD {item.baseYield} · RES {Math.round(item.resilience * 100)}%</span></button>)}</div></> : <div className={styles.operationHelp}><p>Base layout is locked. Select a module to plan actions.</p><button onClick={() => setMini("match3")}>Play harvest alignment</button><button onClick={() => setMini("snake")}>Play wiring repair</button></div>}
      </aside>
      <div className={styles.mapColumn}><div className={styles.mapHeader}><span>ISOMETRIC BASE / 14 × 14</span><span>{state.modules.length} MODULES · {state.utilityEdges.length} LINKS</span></div><GameCanvas state={state} tool={tool} rotation={rotation} selectedId={selectedId} onAction={build} onSelect={setSelectedId} onRotate={() => setRotation((value) => nextRotation(value))} /><div className={styles.mapFooter}><span>Click to place · Drag to draw a corridor · R to rotate</span><span className={state.activeHazard?.type === "communications" ? styles.offline : styles.online}>{state.activeHazard?.type === "communications" ? "COMMS OUTAGE" : "COMMS NOMINAL"}</span></div></div>
      <aside className={styles.details}><div className={styles.panelHeading}><strong>MISSION STATUS</strong><small>{state.phase === "complete" ? "FINAL" : "LIVE"}</small></div><div className={styles.section}><p className={styles.label}>HAZARD FORECAST</p><p>Solar {state.forecast.solar} · Thermal {state.forecast.thermal} · Impact {state.forecast.impact}</p></div>
        {definition && selectedModule ? <div className={styles.section}><p className={styles.label}>SELECTED MODULE</p><h2>{definition.label}</h2><p>Integrity {Math.round(selectedModule.integrity * 100)}% · Grid {selectedModule.x},{selectedModule.y} · {selectedModule.rotation}°</p>{building && <button onClick={() => build({ type: "REMOVE_MODULE", placedModuleId: selectedModule.id })}>Remove · refund {Math.floor(definition.cost / 2)}</button>}{state.phase === "operation" && <>
          {crop && <><p>{crop.crop} · {crop.ready ? "Ready to harvest" : `${Math.round(crop.growth * 100)}% grown`}</p><div className={styles.buttonGroup}>{(["lettuce", "potato", "wheat"] as CropKind[]).map((kind) => <button key={kind} onClick={() => queue({ type: "PLANT_CROP", moduleId: selectedModule.id, crop: kind })}>{kind}</button>)}</div><div className={styles.settingRow}>{(["water", "light", "temperature"] as const).map((key) => <label key={key}>{key}<select value={cropSettings[key]} onChange={(event) => setCropSettings({ ...cropSettings, [key]: event.target.value as Setting })}>{["low", "medium", "high"].map((value) => <option key={value}>{value}</option>)}</select></label>)}</div><button onClick={() => queue({ type: "SET_CROP_PARAMS", moduleId: selectedModule.id, ...cropSettings })}>Queue crop settings</button><button onClick={() => setMini("match3")}>Harvest minigame</button></>}
          {animal && <><p>{animal.animal} · {Math.round(animal.growth * 100)}% cycle</p><div className={styles.buttonGroup}>{(["chicken", "pig", "cow"] as AnimalKind[]).map((kind) => <button key={kind} onClick={() => queue({ type: "SET_ANIMAL", moduleId: selectedModule.id, animal: kind })}>{kind}</button>)}</div><div className={styles.buttonGroup}>{(["rationed", "normal", "high"] as const).map((feed) => <button key={feed} onClick={() => queue({ type: "SET_LIVESTOCK_PARAMS", moduleId: selectedModule.id, feed })}>{feed}</button>)}</div><button onClick={() => setMini("match3")}>Livestock minigame</button></>}
          {definition.category === "utility" && <button onClick={() => queue({ type: "REALLOCATE_UTILITY", moduleId: selectedModule.id, allocation: { thermal: 0.6, backupPower: 0.2, commsBackup: 0.2 } })}>Queue thermal boost</button>}<button onClick={() => setMini("snake")}>Repair minigame</button></>}</div> : selectedEdge ? <div className={styles.section}><p className={styles.label}>UTILITY CORRIDOR</p><h2>{selectedEdge.id}</h2><p>Length {selectedEdge.length} · Integrity {Math.round(selectedEdge.integrity * 100)}%</p>{state.phase === "operation" && <button onClick={() => setMini("snake")}>Repair minigame</button>}</div> : <div className={styles.section}><p className={styles.label}>INSPECT</p><p>Select a structure on the map to see its condition and actions.</p></div>}
        {pending.length > 0 && <div className={styles.section}><p className={styles.label}>QUEUED ({pending.length})</p>{pending.map((action, i) => <p key={i}>{action.type.replaceAll("_", " ")}</p>)}<button onClick={() => setPending([])}>Clear queue</button></div>}{miniResult && <div className={styles.section}><p className={styles.label}>LAST MINIGAME</p><p>{miniResult.modifier >= 0 ? "+" : ""}{Math.round(miniResult.modifier * 100)}% interaction result</p></div>}<div className={styles.section}><p className={styles.label}>LATEST TURN</p><p>{state.lastTurn ? `Crops +${state.lastTurn.cropYield}; meat +${state.lastTurn.meatYield}. ${state.lastTurn.warnings.join(" ")}` : "Awaiting first turn."}</p></div>{state.phase === "complete" && <div className={styles.section}><p className={styles.label}>MISSION RESULT</p><h2 className={state.passed ? styles.pass : styles.fail}>{state.passed ? "PASS" : "FAIL"}</h2><p>{state.failureReason ?? "Production goals reached."}</p></div>}
      </aside>
    </div>
    <footer className={styles.command}><p role="status">{message}</p>{building ? <button className={styles.primary} onClick={begin}>{state.phase === "intermission" ? "BEGIN NEXT LEVEL →" : "BEGIN MISSION →"}</button> : state.phase === "operation" ? <button className={styles.primary} onClick={endTurn}>END TURN →</button> : <button className={styles.primary} onClick={() => setState(null)}>NEW MISSION →</button>}</footer>
    {mini && <div className={styles.modalBackdrop}><div className={styles.modal}>{mini === "match3" ? <Match3 onComplete={completeMini} onCancel={() => setMini(null)} /> : <RepairSnake onComplete={completeMini} onCancel={() => setMini(null)} />}</div></div>}
  </main>;
}
