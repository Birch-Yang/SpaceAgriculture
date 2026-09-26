"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { MODULES, MODULE_BY_ID } from "../../data/modules.ts";
import { DIFFICULTY } from "../../data/difficulty.ts";
import { advanceLevel, applyBuildAction, createInitialState, startOperation } from "../state/reducer.ts";
import { resolveTurn } from "../simulation/resolveTurn.ts";
import type { GameMode, GameState, PlayerAction, Rotation } from "../state/types.ts";
import { Match3, type MinigameResult } from "../minigames/match3/Match3.tsx";
import { RepairSnake } from "../minigames/repairSnake/RepairSnake.tsx";
import { GameCanvas } from "./GameCanvas.tsx";
import { AgricultureInterior, type MiniTarget } from "./AgricultureInterior.tsx";
import { actionCost, actionSlotIndex, agricultureSlots, careAction, slotAction } from "./agricultureAdapter.ts";
import { TutorialGuide, type TutorialProgress } from "./TutorialGuide.tsx";
import type { BuildTool } from "./GameScene.ts";
import styles from "./game.module.css";
import { BuildingPortrait } from "../../ui/BuildingPortrait";
import { PhotonAdvisor } from "../../ui/PhotonAdvisor";

const resourceKeys = ["power", "water", "oxygen", "food", "temperature"] as const;
const tutorialKey = "agronaut:tutorial:v1";
const emptyProgress: TutorialProgress = { enteredGreenhouse: false, enteredLivestock: false, queuedAction: false, resolvedTurn: false };
type RunSubmission = { runId: string; status: "submitting" | "saved" | "unsaved" | "error"; score?: number; message?: string };

export function GameClient() {
  const [nickname, setNickname] = useState("");
  const [mode, setMode] = useState<GameMode>("challenge");
  const [state, setState] = useState<GameState | null>(null);
  const [tool, setTool] = useState<BuildTool>({ kind: "select" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [interiorId, setInteriorId] = useState<string | null>(null);
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [tutorialProgress, setTutorialProgress] = useState<TutorialProgress>(emptyProgress);
  const [pending, setPending] = useState<PlayerAction[]>([]);
  const [message, setMessage] = useState("Choose a mission mode and enter a callsign.");
  const [mini, setMini] = useState<"match3" | "snake" | null>(null);
  const [miniTarget, setMiniTarget] = useState<MiniTarget | null>(null);
  const [miniResult, setMiniResult] = useState<MinigameResult | null>(null);
  const [submission, setSubmission] = useState<RunSubmission | null>(null);
  const [submissionAttempt, setSubmissionAttempt] = useState(0);
  const activeRunId = useRef<string | null>(null);
  const lastSubmissionAttempt = useRef<string | null>(null);
  activeRunId.current = state?.runId ?? null;

  function rotatePlacement() {
    if (tool.kind !== "module") return;
    const rotation = ((tool.rotation + 90) % 360) as Rotation;
    setTool({ ...tool, rotation });
    setMessage(`Placement orientation: ${rotation}°.`);
  }

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (mini) { setMini(null); setMiniTarget(null); }
        else if (interiorId) setInteriorId(null);
        return;
      }
      if (event.key.toLowerCase() !== "r" || event.repeat || mini || interiorId || tool.kind !== "module" || (state?.phase !== "design" && state?.phase !== "intermission")) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      rotatePlacement();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mini, interiorId, tool, state?.phase]);

  useEffect(() => {
    if (!state || state.phase !== "complete") return;
    const completedRun = state;
    const attemptKey = `${completedRun.runId}:${submissionAttempt}`;
    if (lastSubmissionAttempt.current === attemptKey) return;
    lastSubmissionAttempt.current = attemptKey;
    const isCurrentRun = () => activeRunId.current === completedRun.runId;
    setSubmission({ runId: completedRun.runId, status: "submitting" });

    async function submitRun() {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: completedRun }),
      });
      const payload = await response.json().catch(() => ({})) as {
        error?: unknown;
        saved?: unknown;
        reason?: unknown;
        score?: { total?: unknown };
      };

      if (response.status === 409) {
        const existingResponse = await fetch(`/api/report/${completedRun.runId}`);
        if (!existingResponse.ok) throw new Error("This run was already submitted, but its report could not be reloaded.");
        const existing = await existingResponse.json() as { score_total?: unknown };
        const score = existing.score_total == null ? Number.NaN : Number(existing.score_total);
        if (isCurrentRun()) setSubmission({ runId: completedRun.runId, status: "saved", ...(Number.isFinite(score) ? { score } : {}) });
        return;
      }
      if (!response.ok && response.status !== 202) {
        throw new Error(typeof payload.error === "string" ? payload.error : "The mission could not be submitted.");
      }

      const score = typeof payload.score?.total === "number" ? payload.score.total : Number.NaN;
      if (isCurrentRun()) setSubmission({
        runId: completedRun.runId,
        status: payload.saved === true ? "saved" : "unsaved",
        ...(Number.isFinite(score) ? { score } : {}),
        ...(typeof payload.reason === "string" ? { message: payload.reason } : {}),
      });
    }

    void submitRun().catch((error: unknown) => {
      if (isCurrentRun()) setSubmission({ runId: completedRun.runId, status: "error", message: error instanceof Error ? error.message : "The mission could not be submitted." });
    });
  }, [state?.phase, state?.runId, submissionAttempt]);

  function launch(event: FormEvent) {
    event.preventDefault();
    try {
      setState(createInitialState(crypto.randomUUID(), nickname.trim(), mode));
      setSubmission(null); setSubmissionAttempt(0);
      setTool({ kind: "select" }); setSelectedId(null); setInteriorId(null); setPending([]); setTutorialProgress(emptyProgress);
      setTutorialVisible(window.localStorage.getItem(tutorialKey) !== "seen");
      setMessage("Build a compact outpost. A Habitat Core is required to begin.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to create mission"); }
  }

  function build(action: PlayerAction) {
    if (!state) return;
    const result = applyBuildAction(state, action);
    setState(result.state);
    setMessage(result.error ?? "Base layout updated.");
    if (!result.error && action.type === "REMOVE_MODULE") { setSelectedId(null); setInteriorId(null); }
  }

  function begin() {
    if (!state) return;
    try { setState(startOperation(state)); setTool({ kind: "select" }); setMessage("Mission active. Base layout is locked during operation."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Cannot begin mission"); }
  }

  function queue(action: PlayerAction): boolean {
    if (!state || state.phase !== "operation") { setMessage("Begin the mission before planning actions."); return false; }
    const baseline = DIFFICULTY[state.mode][state.level - 1].ap;
    const sameTarget = (current: PlayerAction) => current.type === action.type
      && (("moduleId" in current && "moduleId" in action && current.moduleId === action.moduleId && actionSlotIndex(current) === actionSlotIndex(action))
        || ("targetId" in current && "targetId" in action && current.targetId === action.targetId));
    const next = [...pending.filter((current) => !sameTarget(current)), action];
    if (next.reduce((sum, current) => sum + actionCost(current), 0) > baseline) {
      setMessage(`Only ${baseline} AP can be recovered this turn; food shortages may reduce that further. Clear an action first.`); return false;
    }
    setPending(next);
    if (["PLANT_CROP", "SET_CROP_PARAMS", "SET_ANIMAL", "SET_LIVESTOCK_PARAMS", "HARVEST_CROP", "WATER_PLOT", "FEED_STALL"].includes(action.type))
      setTutorialProgress((progress) => ({ ...progress, queuedAction: true }));
    setMessage(`${action.type.replaceAll("_", " ")} queued for End Turn (${actionCost(action)} AP).`);
    return true;
  }

  function endTurn() {
    if (!state) return;
    try {
      const result = resolveTurn(state, [...pending, { type: "END_TURN" }], `${state.runId}:${state.level}:${state.turn}`);
      setState(result.state.phase === "intermission" ? advanceLevel(result.state) : result.state); setPending([]); setMiniResult(null);
      setTutorialProgress((progress) => ({ ...progress, resolvedTurn: true }));
      setMessage([`Turn ${result.summary.turn}: ${result.acceptedActions.length - 1} action(s) accepted; crops +${result.summary.cropYield}, meat +${result.summary.meatYield}.`, ...result.rejectedActions, ...result.summary.warnings].join(" "));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Turn failed"); }
  }

  function completeMini(result: MinigameResult) {
    setMini(null);
    if (!miniTarget || !state) return;
    const accepted = miniTarget.kind === "crop"
      ? queue(slotAction({ type: "HARVEST_CROP", moduleId: miniTarget.moduleId }, miniTarget.slotIndex, true, result.modifier))
      : miniTarget.kind === "animal"
        ? queue(careAction("FEED_STALL", miniTarget.moduleId, miniTarget.slotIndex, result.modifier))
        : queue({ type: "REPAIR", targetId: miniTarget.moduleId, minigameModifier: result.modifier } as PlayerAction);
    if (accepted) setMiniResult(result);
    setMiniTarget(null);
  }

  function openInterior(moduleId: string) {
    if (!state) return;
    const view = agricultureSlots(state, moduleId);
    if (!view) return;
    setSelectedId(moduleId); setInteriorId(moduleId);
    if (state.phase === "operation") setTutorialProgress((progress) => ({ ...progress, enteredGreenhouse: progress.enteredGreenhouse || view.kind === "greenhouse", enteredLivestock: progress.enteredLivestock || view.kind === "livestock" }));
  }

  function openMini(target: MiniTarget) {
    setMiniTarget(target); setMini(target.kind === "repair" ? "snake" : "match3");
  }

  function dismissTutorial() {
    setTutorialVisible(false);
    window.localStorage.setItem(tutorialKey, "seen");
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
  const agriculture = selectedModule ? agricultureSlots(state, selectedModule.id) : null;
  const target = DIFFICULTY[state.mode][state.level - 1];
  const plannedAp = pending.reduce((sum, action) => sum + actionCost(action), 0);
  const modifierAvailable = state.crops.some((plot) => "slotIndex" in plot) || state.livestock.some((animal) => "slotIndex" in animal);

  return <main className={styles.shell}>
    <header className={styles.header}><div><p className={styles.kicker}>AGRONaut / LUNAR AGRICULTURE</p><h1>South Pole Outpost</h1><p className={styles.meta}>{state.nickname} · {state.mode.toUpperCase()} · LEVEL {state.level} · TURN {state.turn}/10</p></div><div className={styles.headerActions}><span className={`${styles.phase} ${state.crisis ? styles.crisis : ""}`}>{state.crisis ? "CRISIS" : state.phase.toUpperCase()}</span><button onClick={() => setTutorialVisible(true)}>Tutorial</button><button onClick={() => setState(null)}>New run</button></div></header>
    {tutorialVisible && <TutorialGuide state={state} progress={tutorialProgress} onDismiss={dismissTutorial} />}
    <section className={styles.dashboard} aria-label="Mission resources">{resourceKeys.map((key) => {
      const value = state.resources[key];
      const critical = key === "temperature" ? value < 5 || value > 35 : value < 12;
      const fill = key === "temperature" ? Math.max(0, 100 - Math.abs(value - 20) * 5) : Math.max(0, Math.min(100, value));
      return <div key={key} className={`${styles.resource} ${critical ? styles.low : ""}`}><span>{key.toUpperCase()}</span><strong>{value.toFixed(1)} <small>{key === "temperature" ? "°C" : "units"}</small></strong><i><b style={{ width: `${fill}%` }} /></i></div>;
    })}<div className={styles.resource}><span>CROP / MEAT</span><strong>{state.production.cropCumulative.toFixed(0)} / {state.production.meatCumulative.toFixed(0)}</strong><small>Targets {target.cropTarget} / {target.meatTarget}</small></div></section>
    <div className={styles.workspace}>
      <aside className={styles.palette}><div className={styles.panelHeading}><strong>{building ? "BUILD CATALOG" : "MISSION TOOLS"}</strong><small>{building ? `${state.budget} MATERIAL` : `${plannedAp}/${target.ap} AP PLANNED (MAX)`}</small></div>
        {building ? <><button className={`${styles.toolButton} ${tool.kind === "select" ? styles.active : ""}`} onClick={() => setTool({ kind: "select" })}>⌖ Select / inspect</button><button className={`${styles.toolButton} ${tool.kind === "corridor" ? styles.active : ""}`} onClick={() => setTool({ kind: "corridor" })}>〰 Utility corridor <small>1 / cell</small></button><div className={styles.catalog}>{MODULES.map((item) => <button key={item.id} className={`${styles.moduleCard} ${tool.kind === "module" && tool.moduleId === item.id ? styles.active : ""}`} onClick={() => setTool({ kind: "module", moduleId: item.id, rotation: 0 })}><span className={styles.moduleTop}><BuildingPortrait category={item.category} moduleId={item.id} /><strong>{item.label}</strong><b>{item.cost}</b></span><span className={styles.moduleStats}>SIZE {item.footprint.w}×{item.footprint.h} · P {item.flow.powerDemand ? `−${item.flow.powerDemand}` : `+${item.flow.powerSupply ?? 0}`} · W {item.flow.waterDemand ? `−${item.flow.waterDemand}` : `+${item.flow.waterSupply ?? 0}`}</span><span className={styles.moduleStats}>HEAT {item.heatOutput} · YIELD {item.baseYield} · RES {Math.round(item.resilience * 100)}%</span></button>)}</div>{tool.kind === "module" && <button className={styles.toolButton} onClick={rotatePlacement} aria-label={`Rotate placement, currently ${tool.rotation} degrees`}>↻ Rotate placement · {tool.rotation}° <small>R</small></button>}</> : <div className={styles.operationHelp}><p>Base layout is locked. Select a module to focus it. Enter a Greenhouse or Livestock Module to plan farming actions.</p><p>Queued actions apply on End Turn. Food shortages may reduce AP recovery.</p></div>}
        {state.phase === "operation" && <PhotonAdvisor key={`${state.runId}:${state.level}:${state.turn}`} state={state} />}
      </aside>
      <div className={styles.mapColumn}><div className={styles.mapHeader}><span>ISOMETRIC BASE / 14 × 14</span><span>{state.modules.length} MODULES · {state.utilityEdges.length} LINKS</span></div><GameCanvas state={state} tool={tool} selectedId={selectedId} onAction={build} onSelect={setSelectedId} onFeedback={setMessage} /><div className={styles.mapFooter}><span>{building ? tool.kind === "module" ? `Place ${tool.moduleId} · ${tool.rotation}° · press R to rotate` : "Click to place · Drag to draw a corridor · Select to inspect" : "Select a module to focus · Enter agriculture modules from details"}</span><span className={state.activeHazard?.type === "communications" ? styles.offline : styles.online}>{state.activeHazard?.type === "communications" ? "COMMS OUTAGE" : "COMMS NOMINAL"}</span></div></div>
      <aside className={styles.details}><div className={styles.panelHeading}><strong>MISSION STATUS</strong><small>{state.phase === "complete" ? "FINAL" : "LIVE"}</small></div><div className={styles.section}><p className={styles.label}>HAZARD FORECAST</p><p>Solar {state.forecast.solar} · Thermal {state.forecast.thermal} · Impact {state.forecast.impact}</p></div>
        {definition && selectedModule ? <div className={styles.section}><p className={styles.label}>SELECTED MODULE</p><h2>{definition.label}</h2><p>Integrity {Math.round(selectedModule.integrity * 100)}% · Grid {selectedModule.x},{selectedModule.y}</p>
          {agriculture && <><p>{agriculture.kind === "greenhouse" ? "Crop plots" : "Livestock stalls"}: {agriculture.slots.length}</p><button onClick={() => openInterior(selectedModule.id)}>Enter {agriculture.kind === "greenhouse" ? "Greenhouse" : "Livestock Module"}</button></>}
          {building && <button onClick={() => build({ type: "REMOVE_MODULE", placedModuleId: selectedModule.id })}>Remove · refund {Math.floor(definition.cost / 2)}</button>}
          {state.phase === "operation" && <>{definition.category === "utility" && <button onClick={() => queue({ type: "REALLOCATE_UTILITY", moduleId: selectedModule.id, allocation: { thermal: 0.6, backupPower: 0.2, commsBackup: 0.2 } })}>Queue thermal boost · 1 AP</button>}
            {selectedModule.integrity < 1 && <button onClick={() => queue({ type: "REPAIR", targetId: selectedModule.id })}>Repair · 2 AP</button>}
            {selectedModule.integrity < 1 && <button disabled={!modifierAvailable} title={!modifierAvailable ? "Minigame bonuses need the updated turn resolver." : undefined} onClick={() => openMini({ kind: "repair", moduleId: selectedModule.id, slotIndex: 0 })}>Repair minigame</button>}</>}
        </div> : selectedEdge ? <div className={styles.section}><p className={styles.label}>UTILITY CORRIDOR</p><h2>{selectedEdge.id}</h2><p>Length {selectedEdge.length} · Integrity {Math.round(selectedEdge.integrity * 100)}%</p>{state.phase === "operation" && selectedEdge.integrity < 1 && <><button onClick={() => queue({ type: "REPAIR", targetId: selectedEdge.id })}>Repair · 2 AP</button><button disabled={!modifierAvailable} title={!modifierAvailable ? "Minigame bonuses need the updated turn resolver." : undefined} onClick={() => openMini({ kind: "repair", moduleId: selectedEdge.id, slotIndex: 0 })}>Repair minigame</button></>}</div> : <div className={styles.section}><p className={styles.label}>INSPECT</p><p>Select a structure on the map to see its condition and actions.</p></div>}
        {pending.length > 0 && <div className={styles.section}><p className={styles.label}>QUEUED ({pending.length}) · {plannedAp} AP</p><p>Applied on End Turn. Food shortages can reduce available AP.</p>{pending.map((action, i) => <p key={i}>{action.type.replaceAll("_", " ")} · {"moduleId" in action ? `${action.moduleId} / slot ${actionSlotIndex(action) + 1}` : "targetId" in action ? action.targetId : "mission"}</p>)}<button onClick={() => setPending([])}>Clear queue</button></div>}{miniResult && <div className={styles.section}><p className={styles.label}>LAST MINIGAME</p><p>{miniResult.modifier >= 0 ? "+" : ""}{Math.round(miniResult.modifier * 100)}% bonus queued with its target action</p></div>}<div className={styles.section}><p className={styles.label}>LATEST TURN</p><p>{state.lastTurn ? `Crops +${state.lastTurn.cropYield}; meat +${state.lastTurn.meatYield}. ${state.lastTurn.warnings.join(" ")}` : "Awaiting first turn."}</p></div>{state.phase === "complete" && <><div className={styles.section}><p className={styles.label}>MISSION RESULT</p><h2 className={state.passed ? styles.pass : styles.fail}>{state.passed ? "PASS" : "FAIL"}</h2><p>{state.failureReason ?? "Production goals reached."}</p></div><div className={styles.section} aria-live="polite"><p className={styles.label}>MISSION RECORD</p>{!submission || submission.runId !== state.runId || submission.status === "submitting" ? <p>Submitting run and preparing its report…</p> : submission.status === "saved" ? <><p>Run saved{submission.score !== undefined ? ` · Score ${submission.score.toFixed(1)}/100` : ""}.</p><a href={`/report/${state.runId}`}>Open mission report</a></> : <><p>{submission.status === "error" ? "Run submission failed." : "Run could not be saved."} {submission.message}</p><button onClick={() => setSubmissionAttempt((attempt) => attempt + 1)}>Retry submission</button></>}</div></>}
      </aside>
    </div>
    <footer className={styles.command}><p role="status">{message}</p>{building ? <button className={styles.primary} onClick={begin}>{state.phase === "intermission" ? "BEGIN NEXT LEVEL →" : "BEGIN MISSION →"}</button> : state.phase === "operation" ? <button className={styles.primary} onClick={endTurn}>END TURN →</button> : <button className={styles.primary} onClick={() => setState(null)}>NEW MISSION →</button>}</footer>
    {mini && <div className={styles.modalBackdrop}><div className={styles.modal}>{mini === "match3" ? <Match3 onComplete={completeMini} onCancel={() => setMini(null)} /> : <RepairSnake onComplete={completeMini} onCancel={() => setMini(null)} />}</div></div>}
    {interiorId && <AgricultureInterior key={interiorId} state={state} moduleId={interiorId} pending={pending} feedback={message} onQueue={queue} onMini={openMini} onClose={() => setInteriorId(null)} />}
  </main>;
}
