"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { MODULE_BY_ID, MODULES } from "../../data/modules.ts";
import type { CropKind, GameState, LivestockState, PlayerAction, Setting } from "../state/types.ts";
import { advanceLevel, applyBuildAction, createInitialState, startOperation } from "../state/reducer.ts";
import { resolveTurn } from "../simulation/resolveTurn.ts";
import { Match3 } from "../minigames/Match3.tsx";
import { RepairSnake } from "../minigames/RepairSnake.tsx";
import PhaserBoard, { type PhaserBoardHandle } from "./PhaserBoard.tsx";
import "./game.css";

type MiniGame = "match3" | "repair" | undefined;
const cropChoices: CropKind[] = ["lettuce", "potato", "wheat"];
const settings: Setting[] = ["low", "medium", "high"];

export function GameClient() {
  const [nickname, setNickname] = useState("Lunar Scout");
  const [state, setState] = useState<GameState>(() => createInitialState("run-local-1", "Lunar Scout", "challenge"));
  const [selectedId, setSelectedId] = useState<string>();
  const [queue, setQueue] = useState<PlayerAction[]>([]);
  const [notice, setNotice] = useState("");
  const [miniGame, setMiniGame] = useState<MiniGame>();
  const [miniResult, setMiniResult] = useState<number>();
  const boardRef = useRef<PhaserBoardHandle>(null);
  const selected = useMemo(() => state.modules.find((module) => module.id === selectedId), [state.modules, selectedId]);
  const definition = selected ? MODULE_BY_ID.get(selected.moduleId) : undefined;
  const crop = state.crops.find((item) => item.moduleId === selectedId);
  const animal = state.livestock.find((item) => item.moduleId === selectedId);
  const buildPhase = state.phase === "design" || state.phase === "intermission";

  const handleAction = useCallback((action: PlayerAction) => {
    if (state.phase === "design" || state.phase === "intermission") {
      const result = applyBuildAction(state, action);
      if (result.error) { setNotice(result.error); return; }
      setNotice("");
      setState(result.state);
      return;
    }
    if (state.phase === "operation") {
      setQueue((pending) => {
        if (action.type !== "SET_CROP_PARAMS") return [...pending, action];
        const baseline = state.crops.find((item) => item.moduleId === action.moduleId);
        const previous = [...pending].reverse().find((item) => item.type === "SET_CROP_PARAMS" && item.moduleId === action.moduleId);
        if (!baseline) return [...pending, action];
        const merged = {
          ...action,
          water: action.water !== baseline.water ? action.water : previous?.type === "SET_CROP_PARAMS" ? previous.water : baseline.water,
          light: action.light !== baseline.light ? action.light : previous?.type === "SET_CROP_PARAMS" ? previous.light : baseline.light,
          temperature: action.temperature !== baseline.temperature ? action.temperature : previous?.type === "SET_CROP_PARAMS" ? previous.temperature : baseline.temperature,
        };
        return [...pending.filter((item) => item.type !== "SET_CROP_PARAMS" || item.moduleId !== action.moduleId), merged];
      });
      setNotice(`${action.type.replaceAll("_", " ")} queued for this turn.`);
    }
  }, [state]);

  function beginMission(): void {
    try {
      const ready = { ...state, nickname: nickname.trim() || "Lunar Scout" };
      setState(startOperation(ready));
      setNotice("Operations started. The base layout is locked.");
      boardRef.current?.setTool({});
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to begin mission");
    }
  }

  function resolveCurrentTurn(): void {
    try {
      const result = resolveTurn(state, [...queue, { type: "END_TURN" }], `${state.runId}:${state.level}:${state.turn}`);
      setState(result.state);
      setQueue([]);
      setNotice(result.rejectedActions.length ? result.rejectedActions.join(" · ") : `Turn ${result.summary.turn} resolved.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Turn could not resolve");
    }
  }

  function queueSetting(action: PlayerAction): void {
    handleAction(action);
  }

  function onMiniComplete(modifier: number): void {
    setMiniResult(modifier);
    setMiniGame(undefined);
    setNotice(`Minigame returned a ${modifier >= 0 ? "+" : ""}${Math.round(modifier * 100)}% modifier.`);
  }

  function startNextLevel(): void {
    try { setState(startOperation(advanceLevel(state))); setNotice("Next level started."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Unable to advance level"); }
  }

  return <main className="game-page">
    <header className="game-topbar">
      <div><a className="game-back" href="/">← Mission brief</a><p className="eyebrow">LUNAR AGRICULTURE · SOUTH POLE</p><h1>Outpost operations</h1></div>
      <label className="nickname-field"><span>CALLSIGN</span><input value={nickname} maxLength={32} onChange={(event) => setNickname(event.target.value)} disabled={!buildPhase} /></label>
    </header>

    <section className="mission-strip">
      <div className="mission-mode"><span className="status-dot" />{state.phase === "design" ? "BASE DESIGN" : state.phase === "intermission" ? "INTERMISSION" : state.phase === "complete" ? (state.passed ? "MISSION PASSED" : "MISSION COMPLETE") : "MISSION OPERATIONS"}</div>
      <div>CHALLENGE <b>·</b> 10 TURNS</div><div>LEVEL <b>{state.level}</b></div><div>TURN <b>{Math.min(state.turn, 10)} / 10</b></div>
      <div className="budget-readout">BUILD BUDGET <strong>{state.budget}</strong></div>
    </section>

    <section className="resource-rail" aria-label="Mission resources">
      {([ ["POWER", state.resources.power, "#f1cb76"], ["WATER", state.resources.water, "#83c8ec"], ["OXYGEN", state.resources.oxygen, "#9fdbc0"], ["FOOD", state.resources.food, "#c7db83"], ["TEMP", `${state.resources.temperature}°`, "#e39a83"] ] as const).map(([label, value, color]) => <div className="resource-card" key={label}><span style={{ color }}>{label}</span><strong>{value}</strong><small>{label === "TEMP" ? "SYSTEM" : "RESERVE"}</small></div>)}
      <div className="resource-card production-card"><span>PRODUCTION</span><strong>{state.production.cropCumulative} <i>crop</i> / {state.production.meatCumulative} <i>meat</i></strong><small>CUMULATIVE YIELD</small></div>
    </section>

    <div className="game-workspace">
      <section className="board-column">
        <div className="board-toolbar"><div><span className="panel-kicker">TACTICAL MAP</span><strong>{buildPhase ? "Design your outpost" : "Base status · layout locked"}</strong></div><div className="board-legend"><span><i className="legend-flow" />CONNECTED</span><span><i className="legend-active" />ACTIVE FLOW</span><span><i className="legend-warning" />WARNING</span></div></div>
        <PhaserBoard ref={boardRef} state={state} onAction={handleAction} onSelection={setSelectedId} />
        <div className="board-status"><span>GRID 14 × 14</span><span>ISOMETRIC VIEW · SNAP ENABLED</span><span>{state.modules.length} MODULES · {state.utilityEdges.length} LINKS</span></div>
        {state.activeHazard && <p className="hazard-banner">⚠ {state.activeHazard.type.toUpperCase()} EVENT · Severity {state.activeHazard.severity.toFixed(1)}</p>}
      </section>

      <aside className="mission-sidebar">
        {buildPhase ? <>
          <section className="sidebar-panel module-panel">
            <div className="panel-heading"><div><p className="panel-kicker">CONSTRUCTION MENU</p><h2>Infrastructure</h2></div><span className="phase-chip">BUILD PHASE</span></div>
            <p className="muted-copy">Select a module, then click a clear map tile to place it. Press rotate before placement to change orientation.</p>
            <div className="module-list">
              {MODULES.map((module) => <button key={module.id} className="module-option" onClick={() => { boardRef.current?.setTool({ moduleId: module.id }); setNotice(`${module.label} selected · click the map to place.`); }}>
                <span className="module-glyph" style={{ background: MODULE_COLORS[module.category] }} />
                <span className="module-copy"><strong>{module.label}</strong><small>{module.footprint.w}×{module.footprint.h} · P{module.flow.powerDemand ?? `+${module.flow.powerSupply ?? 0}`} W{module.flow.waterDemand ?? `+${module.flow.waterSupply ?? 0}`} H{module.heatOutput} Y{module.baseYield} R{Math.round(module.resilience * 100)}%</small></span>
                <b className="module-cost">{module.cost}</b>
              </button>)}
            </div>
            <div className="tool-row"><button className="button" onClick={() => { boardRef.current?.setTool({ corridor: true }); setNotice("Utility corridor: click a start module, route empty tiles, then click an adjacent destination module."); }}>＋ Corridor</button><button className="button" onClick={() => { boardRef.current?.setTool({ remove: true }); setNotice("Select a placed module to remove it."); }}>⌫ Remove</button><button className="button" onClick={() => { const rotation = boardRef.current?.rotate(); if (rotation !== undefined) setNotice(`Placement orientation: ${rotation}°`); }}>↻ Rotate</button></div>
            <button className="button button-primary button-wide" onClick={beginMission}>BEGIN MISSION <span>→</span></button>
          </section>
          {selected && <SelectedPanel module={selected} category={definition?.category} crop={crop} animal={animal} phase={state.phase} onAction={queueSetting} />}
        </> : state.phase === "operation" ? <>
          <section className="sidebar-panel ops-panel">
            <div className="panel-heading"><div><p className="panel-kicker">FLIGHT DIRECTOR</p><h2>Turn {state.turn} operations</h2></div><span className="ap-chip">{state.ap} AP</span></div>
            <p className="muted-copy">The base is locked. Queue repairs or management actions, then resolve the turn.</p>
            {selected ? <SelectedPanel module={selected} category={definition?.category} crop={crop} animal={animal} phase={state.phase} onAction={queueSetting} /> : <p className="selection-hint">Select a module on the map to inspect its status and available actions.</p>}
            <div className="ops-actions"><button className="button" onClick={() => setMiniGame("match3")}>▦ Crop activity</button><button className="button" onClick={() => setMiniGame("repair")}>⌁ Repair activity</button></div>
            {miniResult !== undefined && <p className="modifier-readout">Last activity returned <b>{miniResult >= 0 ? "+" : ""}{Math.round(miniResult * 100)}%</b>.</p>}
            <div className="queue-list"><span>QUEUED ACTIONS <b>{queue.length}</b></span>{queue.length ? queue.map((action, index) => <small key={`${action.type}-${index}`}>{action.type.replaceAll("_", " ")}</small>) : <small>No actions queued.</small>}</div>
            <button className="button button-primary button-wide" onClick={resolveCurrentTurn}>RESOLVE TURN <span>→</span></button>
          </section>
          <TurnSummary state={state} />
        </> : state.phase === "intermission" ? <section className="sidebar-panel result-panel"><p className="panel-kicker">LEVEL {state.level} COMPLETE</p><h2>Base secured</h2><p>{state.lastTurn?.warnings.join(" · ") || "Your production targets were met."}</p><button className="button button-primary button-wide" onClick={startNextLevel}>START NEXT LEVEL →</button></section>
          : <section className="sidebar-panel result-panel"><p className="panel-kicker">MISSION RESULT</p><h2>{state.passed ? "Mission passed" : "Mission ended"}</h2><p>{state.failureReason ?? "All mission turns have resolved."}</p><div className="result-stats"><span>Crop production<b>{state.production.cropCumulative}</b></span><span>Meat production<b>{state.production.meatCumulative}</b></span></div><button className="button button-primary button-wide" onClick={() => window.location.reload()}>NEW RUN →</button></section>}
      </aside>
    </div>

    <footer className="game-footer"><span>MISSION CONTROL · LOCAL SIMULATION</span><span>Deterministic turn engine · Build costs and outcomes supplied by the mission systems</span></footer>
    {notice && <div className="game-notice" role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
    {miniGame && <div className="modal-scrim" role="presentation"><div className="mini-game-modal"><button className="modal-close" onClick={() => setMiniGame(undefined)} aria-label="Close activity">×</button>{miniGame === "match3" ? <Match3 onComplete={onMiniComplete} /> : <RepairSnake onComplete={onMiniComplete} />}</div></div>}
  </main>;
}

const MODULE_COLORS: Record<string, string> = {
  habitat: "#9cb7bf", greenhouse: "#72ad85", livestock: "#c59767", oxygen: "#4a9ea1", water: "#5489a6",
  solar: "#3a6283", battery: "#777f95", utility: "#a98772", communications: "#bba96d", shelter: "#77838a", storage: "#8b8272", recreation: "#9b789a",
};

type SelectedPanelProps = { module: GameState["modules"][number]; category?: string; crop?: GameState["crops"][number]; animal?: LivestockState; phase: GameState["phase"]; onAction: (action: PlayerAction) => void };
function SelectedPanel({ module, category, crop, animal, phase, onAction }: SelectedPanelProps) {
  const def = MODULE_BY_ID.get(module.moduleId);
  if (!def) return null;
  const operation = phase === "operation";
  return <section className="sidebar-panel selected-panel">
    <div className="panel-heading"><div><p className="panel-kicker">{operation ? "SELECTED ASSET" : "MODULE STATUS"}</p><h2>{def.label}</h2></div><span className={`integrity-chip ${module.integrity < 0.75 ? "integrity-low" : ""}`}>{Math.round(module.integrity * 100)}% INTEGRITY</span></div>
    <div className="module-metrics"><span>FOOTPRINT<b>{def.footprint.w}×{def.footprint.h}</b></span><span>RESILIENCE<b>{Math.round(def.resilience * 100)}%</b></span><span>POWER<b>{def.flow.powerDemand ?? `+${def.flow.powerSupply ?? 0}`}</b></span><span>WATER<b>{def.flow.waterDemand ?? `+${def.flow.waterSupply ?? 0}`}</b></span></div>
    {category === "greenhouse" && crop && <div className="management-controls"><b>AGRICULTURE · {crop.crop.toUpperCase()} {crop.ready ? "· READY" : `· ${Math.round(crop.growth * 100)}% GROWTH`}</b>
      <label>Crop<select value={crop.crop} disabled={!operation} onChange={(event) => onAction({ type: "PLANT_CROP", moduleId: module.id, crop: event.target.value as CropKind })}>{cropChoices.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      {(["water", "light", "temperature"] as const).map((key) => <label key={key}>{key}<select value={crop[key]} disabled={!operation} onChange={(event) => onAction({ type: "SET_CROP_PARAMS", moduleId: module.id, water: key === "water" ? event.target.value as Setting : crop.water, light: key === "light" ? event.target.value as Setting : crop.light, temperature: key === "temperature" ? event.target.value as Setting : crop.temperature })}>{settings.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>)}
      {crop.ready && <button className="button" disabled={!operation} onClick={() => onAction({ type: "HARVEST_CROP", moduleId: module.id })}>Queue harvest</button>}
    </div>}
    {category === "livestock" && animal && <div className="management-controls"><b>LIVESTOCK · {animal.animal.toUpperCase()} · {Math.round(animal.growth * 100)}% CYCLE</b><label>Feed<select value={animal.feed} disabled={!operation} onChange={(event) => onAction({ type: "SET_LIVESTOCK_PARAMS", moduleId: module.id, feed: event.target.value as LivestockState["feed"] })}>{["rationed", "normal", "high"].map((value) => <option key={value}>{value}</option>)}</select></label><label>Animal<select value={animal.animal} disabled={!operation} onChange={(event) => onAction({ type: "SET_ANIMAL", moduleId: module.id, animal: event.target.value as LivestockState["animal"] })}>{["chicken", "pig", "cow"].map((value) => <option key={value}>{value}</option>)}</select></label></div>}
    {category === "utility" && <p className="muted-copy">Thermal {Math.round((module.allocation?.thermal ?? 0) * 100)}% · backup power {Math.round((module.allocation?.backupPower ?? 0) * 100)}% · communications {Math.round((module.allocation?.commsBackup ?? 0) * 100)}%</p>}
    {operation && <button className="button repair-button" onClick={() => onAction({ type: "REPAIR", targetId: module.id })}>⌁ Queue module repair · 2 AP</button>}
  </section>;
}

function TurnSummary({ state }: { state: GameState }) {
  const turn = state.lastTurn;
  if (!turn) return null;
  return <section className="sidebar-panel turn-summary"><p className="panel-kicker">LAST TURN · {turn.turn}</p><h2>Systems report</h2>
    <div className="turn-deltas">{(["power", "water", "oxygen", "food", "temperature"] as const).map((key) => <span key={key}>{key.toUpperCase()}<b className={turn.resourceDelta[key] >= 0 ? "delta-positive" : "delta-negative"}>{turn.resourceDelta[key] >= 0 ? "+" : ""}{turn.resourceDelta[key]}</b></span>)}</div>
    {turn.hazard && <p className="hazard-banner">⚠ {turn.hazard.type.toUpperCase()} EVENT</p>}{turn.warnings.map((warning) => <p className="turn-warning" key={warning}>• {warning}</p>)}
  </section>;
}
