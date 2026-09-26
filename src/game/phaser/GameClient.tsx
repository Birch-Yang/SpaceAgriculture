"use client";

import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { MODULES, MODULE_BY_ID } from "../../data/modules.ts";
import { DIFFICULTY } from "../../data/difficulty.ts";
import { advanceLevel, applyBuildAction, createInitialState, startOperation } from "../state/reducer.ts";
import { maxActionPoints, resolveTurn } from "../simulation/resolveTurn.ts";
import { seedForLevel } from "../simulation/hazards.ts";
import type { GameMode, GameState, PlayerAction } from "../state/types.ts";
import type { RunTranscript } from "../state/transcript.ts";
import type { MissionReport as MissionReportData } from "../../ai/report.ts";
import { MissionReport } from "../../ui/MissionReport";
import { curatedSources } from "../../content/sources";
import { communicationsAvailable } from "../../data/systems.ts";
import { deriveAgentEvent, toAgentPublicState } from "../../ai/publicState.ts";
import { MissionControlPanel, type MessageView } from "../../ui/MissionControlPanel";
import type { MinigameResult } from "../minigames/match3/Match3.tsx";
import { MinigameBoundary } from "../minigames/MinigameBoundary.tsx";
import { GameCanvas } from "./GameCanvas.tsx";
import { AgricultureInterior, type MiniTarget } from "./AgricultureInterior.tsx";
import { actionCost, actionSlotIndex, agricultureSlots, careAction, slotAction } from "./agricultureAdapter.ts";
import { TutorialGuide, type TutorialProgress } from "./TutorialGuide.tsx";
import type { BuildTool } from "./GameScene.ts";
import styles from "./game.module.css";
import { BuildingPortrait } from "../../ui/BuildingPortrait";

const resourceKeys = ["power", "water", "oxygen", "food", "temperature"] as const;
const Match3 = lazy(() => import("../minigames/match3/Match3.tsx").then((module) => ({ default: module.Match3 })));
const RepairSnake = lazy(() => import("../minigames/repairSnake/RepairSnake.tsx").then((module) => ({ default: module.RepairSnake })));
const tutorialKey = "agronaut:tutorial:v1";
const emptyProgress: TutorialProgress = { enteredGreenhouse: false, enteredLivestock: false, queuedAction: false, resolvedTurn: false };
type SubmittedResult = { runId: string; score: { rules: number; llm: number; total: number; usedFallback: boolean }; report: MissionReportData; saved: boolean; reason?: string };

export function GameClient() {
  const [nickname, setNickname] = useState("");
  const [imessageAddress, setImessageAddress] = useState("");
  const advisorToken = useRef<string | null>(null);
  const advisorRun = useRef<string | null>(null);
  const advisorEnrollment = useRef<Promise<void> | null>(null);
  const [mode, setMode] = useState<GameMode>("challenge");
  const [state, setState] = useState<GameState | null>(null);
  const [transcript, setTranscript] = useState<RunTranscript | null>(null);
  const [submitted, setSubmitted] = useState<SubmittedResult | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<"idle" | "submitting" | "failed" | "done">("idle");
  const [savedRunId, setSavedRunId] = useState<string | null>(null);
  const [advisorConnection, setAdvisorConnection] = useState<"online" | "offline" | "unavailable">("unavailable");
  const [advisorMessages, setAdvisorMessages] = useState<MessageView[]>([]);
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

  function launch(event: FormEvent) {
    event.preventDefault();
    try {
      const runId = crypto.randomUUID();
      const initial = createInitialState(runId, nickname.trim(), mode);
      setState(initial);
      setTranscript({ version: 1, runId, nickname: nickname.trim().slice(0, 32), mode, steps: [] });
      setSubmitted(null); setSubmissionStatus("idle"); setSavedRunId(null);
      advisorToken.current = null;
      advisorRun.current = runId;
      advisorEnrollment.current = null;
      setAdvisorConnection("unavailable"); setAdvisorMessages([]);
      if (imessageAddress.trim()) advisorEnrollment.current = enrollAdvisor(runId, imessageAddress.trim(), initial);
      setTool({ kind: "select" }); setSelectedId(null); setInteriorId(null); setPending([]); setTutorialProgress(emptyProgress);
      setTutorialVisible(window.localStorage.getItem(tutorialKey) !== "seen");
      setMessage("Build a compact outpost. A Habitat Core is required to begin.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to create mission"); }
  }

  function build(action: PlayerAction) {
    if (!state) return;
    const result = applyBuildAction(state, action);
    setState(result.state);
    if (!result.error) setTranscript((current) => current ? { ...current, steps: [...current.steps, { kind: "build", action }] } : current);
    setMessage(result.error ?? "Base layout updated.");
    if (!result.error && action.type === "REMOVE_MODULE") { setSelectedId(null); setInteriorId(null); }
    if (!result.error && action.type === "REMOVE_CORRIDOR") setSelectedId(null);
  }

  function begin() {
    if (!state) return;
    try { setState(startOperation(state)); setTranscript((current) => current ? { ...current, steps: [...current.steps, { kind: "start" }] } : current); setTool({ kind: "select" }); setMessage("Mission active. Base layout is locked during operation."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Cannot begin mission"); }
  }

  function queue(action: PlayerAction): boolean {
    if (!state || state.phase !== "operation") { setMessage("Begin the mission before planning actions."); return false; }
    const baseline = maxActionPoints(state);
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
      const result = resolveTurn(state, [...pending, { type: "END_TURN" }], seedForLevel(state));
      const betweenLevels = result.state.phase === "intermission";
      const nextTranscript = transcript ? { ...transcript, steps: [...transcript.steps, { kind: "turn" as const, actions: result.acceptedActions }, ...(betweenLevels ? [{ kind: "advance" as const }] : [])] } : null;
      if (nextTranscript) setTranscript(nextTranscript);
      setState(betweenLevels ? advanceLevel(result.state) : result.state); setPending([]); setMiniResult(null);
      if (result.state.phase === "complete" && nextTranscript) {
        void (async () => { await notifyAdvisor(result.state, result.summary.turn); await submitRun(nextTranscript); })();
      } else void notifyAdvisor(result.state, result.summary.turn);
      setTutorialProgress((progress) => ({ ...progress, resolvedTurn: true }));
      setMessage([`Turn ${result.summary.turn}: ${result.acceptedActions.length - 1} action(s) accepted; crops +${result.summary.cropYield}, meat +${result.summary.meatYield}.`, ...result.rejectedActions, ...result.summary.warnings].join(" "));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Turn failed"); }
  }

  async function enrollAdvisor(runId: string, address: string, initial: GameState) {
    try {
      const response = await fetch("/api/mission-control/session", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId, address, publicState: toAgentPublicState(initial) }), signal: AbortSignal.timeout(8000) });
      const result = await response.json() as { token?: string };
      if (advisorRun.current !== runId) return;
      advisorToken.current = response.ok && result.token ? result.token : null;
      setAdvisorConnection(advisorToken.current ? "online" : "unavailable");
    } catch { if (advisorRun.current === runId) setAdvisorConnection("unavailable"); }
  }

  async function notifyAdvisor(next: GameState, turn: number) {
    if (advisorRun.current !== next.runId) return;
    await advisorEnrollment.current;
    if (!advisorToken.current || advisorRun.current !== next.runId) return;
    const outage = !communicationsAvailable(next);
    setAdvisorConnection(outage ? "offline" : "online");
    try {
      const response = await fetch("/api/mission-control/turn", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: next.runId, token: advisorToken.current, turn: (next.level - 1) * 10 + turn,
          publicState: toAgentPublicState(next), event: deriveAgentEvent(next), outage }), signal: AbortSignal.timeout(8000) });
      const data = await response.json() as { status?: string; text?: string };
      if (!response.ok || data.status === "unavailable") setAdvisorConnection("unavailable");
      else if (data.status === "offline") setAdvisorConnection("offline");
      else setAdvisorConnection("online");
      if (data.status === "sent" && data.text) setAdvisorMessages((current) => [...current,
        { id: `${next.level}-${turn}`, sender: "control", text: data.text!, timeLabel: `Turn ${turn}` }]);
    } catch { setAdvisorConnection("unavailable"); }
  }

  async function submitRun(run: RunTranscript) {
    setSubmissionStatus("submitting");
    try {
      const response = await fetch("/api/runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript: run }) });
      const data = await response.json() as SubmittedResult & { error?: string };
      if (response.status === 409 && data.runId) { setSavedRunId(data.runId); setSubmissionStatus("done"); return; }
      if (!response.ok || !data.report || !data.score) throw new Error(data.error ?? "Run submission unavailable");
      setSubmitted(data); setSubmissionStatus("done");
      if (data.saved) setSavedRunId(data.runId);
    } catch (error) {
      setSubmissionStatus("failed");
      setMessage(error instanceof Error ? error.message : "Run submission unavailable");
    }
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
      <form onSubmit={launch} className={styles.launchForm}><label>Mission callsign<input required maxLength={32} value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="Your nickname" /></label><label>Mode<select value={mode} onChange={(event) => setMode(event.target.value as GameMode)}><option value="challenge">Challenge · 10 turns</option><option value="progressive">Progressive · 3 levels</option></select></label><label>iMessage address (optional; sends Mission Control advice to you)<input maxLength={254} value={imessageAddress} onChange={(event) => setImessageAddress(event.target.value)} placeholder="+15551234567 or Apple ID email" /></label><button className={styles.primary} type="submit">LAUNCH MISSION →</button></form><p role="status">{message}</p>
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
      <aside className={styles.palette}><div className={styles.panelHeading}><strong>{building ? "BUILD CATALOG" : "MISSION TOOLS"}</strong><small>{building ? `${state.budget} MATERIAL` : `${plannedAp}/${maxActionPoints(state)} AP PLANNED (MAX)`}</small></div>
        {building ? <><button className={`${styles.toolButton} ${tool.kind === "select" ? styles.active : ""}`} onClick={() => setTool({ kind: "select" })}>⌖ Select / inspect</button><button className={`${styles.toolButton} ${tool.kind === "corridor" ? styles.active : ""}`} onClick={() => setTool({ kind: "corridor" })}>〰 Utility corridor <small>1 / cell</small></button><div className={styles.catalog}>{MODULES.map((item) => <button key={item.id} className={`${styles.moduleCard} ${tool.kind === "module" && tool.moduleId === item.id ? styles.active : ""}`} onClick={() => setTool({ kind: "module", moduleId: item.id })}><span className={styles.moduleTop}><BuildingPortrait category={item.category} moduleId={item.id} /><strong>{item.label}</strong><b>{item.cost}</b></span><span className={styles.moduleStats}>SIZE {item.footprint.w}×{item.footprint.h} · P {item.flow.powerDemand ? `−${item.flow.powerDemand}` : `+${item.flow.powerSupply ?? 0}`} · W {item.flow.waterDemand ? `−${item.flow.waterDemand}` : `+${item.flow.waterSupply ?? 0}`}</span><span className={styles.moduleStats}>HEAT {item.heatOutput} · YIELD {item.baseYield} · RES {Math.round(item.resilience * 100)}%</span></button>)}</div></> : <div className={styles.operationHelp}><p>Base layout is locked. Select a module to focus it. Enter a Greenhouse or Livestock Module to plan farming actions.</p><p>Queued actions apply on End Turn. Food shortages may reduce AP recovery.</p></div>}
      </aside>
      <div className={styles.mapColumn}><div className={styles.mapHeader}><span>ISOMETRIC BASE / 14 × 14</span><span>{state.modules.length} MODULES · {state.utilityEdges.length} LINKS</span></div><GameCanvas state={state} tool={tool} selectedId={selectedId} onAction={build} onSelect={setSelectedId} onFeedback={setMessage} /><div className={styles.mapFooter}><span>{building ? "Click to place · Drag to draw a corridor · Select or drag to move a disconnected module" : "Select a module to focus · Enter agriculture modules from details"}</span><span className={!communicationsAvailable(state) ? styles.offline : styles.online}>{!communicationsAvailable(state) ? "COMMS OUTAGE" : "COMMS NOMINAL"}</span></div></div>
      <aside className={styles.details}><div className={styles.panelHeading}><strong>MISSION STATUS</strong><small>{state.phase === "complete" ? "FINAL" : "LIVE"}</small></div><div className={styles.section}><p className={styles.label}>HAZARD FORECAST</p><p>Solar {state.forecast.solar} · Thermal {state.forecast.thermal} · Impact {state.forecast.impact}</p></div>
        {definition && selectedModule ? <div className={styles.section}><p className={styles.label}>SELECTED MODULE</p><h2>{definition.label}</h2><p>Integrity {Math.round(selectedModule.integrity * 100)}% · Grid {selectedModule.x},{selectedModule.y}</p>
          {agriculture && <><p>{agriculture.kind === "greenhouse" ? "Crop plots" : "Livestock stalls"}: {agriculture.slots.length}</p><button onClick={() => openInterior(selectedModule.id)}>Enter {agriculture.kind === "greenhouse" ? "Greenhouse" : "Livestock Module"}</button></>}
          {building && <button onClick={() => build({ type: "REMOVE_MODULE", placedModuleId: selectedModule.id })}>Remove · refund {Math.floor(definition.cost / 2)}</button>}
          {state.phase === "operation" && <>{definition.category === "utility" && <button onClick={() => queue({ type: "REALLOCATE_UTILITY", moduleId: selectedModule.id, allocation: { thermal: 0.6, backupPower: 0.2, commsBackup: 0.2 } })}>Queue thermal boost · 1 AP</button>}
            {selectedModule.integrity < 1 && <button onClick={() => queue({ type: "REPAIR", targetId: selectedModule.id })}>Repair · 2 AP</button>}
            {selectedModule.integrity < 1 && <button disabled={!modifierAvailable} title={!modifierAvailable ? "Minigame bonuses need the updated turn resolver." : undefined} onClick={() => openMini({ kind: "repair", moduleId: selectedModule.id, slotIndex: 0 })}>Repair minigame</button>}</>}
        </div> : selectedEdge ? <div className={styles.section}><p className={styles.label}>UTILITY CORRIDOR</p><h2>{selectedEdge.id}</h2><p>Length {selectedEdge.length} · Integrity {Math.round(selectedEdge.integrity * 100)}%</p>{building && <button onClick={() => build({ type: "REMOVE_CORRIDOR", edgeId: selectedEdge.id })}>Remove corridor · 1 material</button>}{state.phase === "operation" && selectedEdge.integrity < 1 && <><button onClick={() => queue({ type: "REPAIR", targetId: selectedEdge.id })}>Repair · 2 AP</button><button disabled={!modifierAvailable} title={!modifierAvailable ? "Minigame bonuses need the updated turn resolver." : undefined} onClick={() => openMini({ kind: "repair", moduleId: selectedEdge.id, slotIndex: 0 })}>Repair minigame</button></>}</div> : <div className={styles.section}><p className={styles.label}>INSPECT</p><p>Select a structure on the map to see its condition and actions.</p></div>}
        {pending.length > 0 && <div className={styles.section}><p className={styles.label}>QUEUED ({pending.length}) · {plannedAp} AP</p><p>Applied on End Turn. Food shortages can reduce available AP.</p>{pending.map((action, i) => <p key={i}>{action.type.replaceAll("_", " ")} · {"moduleId" in action ? `${action.moduleId} / slot ${actionSlotIndex(action) + 1}` : "targetId" in action ? action.targetId : "mission"}</p>)}<button onClick={() => setPending([])}>Clear queue</button></div>}{miniResult && <div className={styles.section}><p className={styles.label}>LAST MINIGAME</p><p>{miniResult.modifier >= 0 ? "+" : ""}{Math.round(miniResult.modifier * 100)}% bonus queued with its target action</p></div>}<div className={styles.section}><p className={styles.label}>LATEST TURN</p><p>{state.lastTurn ? `Crops +${state.lastTurn.cropYield}; meat +${state.lastTurn.meatYield}. ${state.lastTurn.warnings.join(" ")}` : "Awaiting first turn."}</p></div>{state.phase === "complete" && <div className={styles.section}><p className={styles.label}>MISSION RESULT</p><h2 className={state.passed ? styles.pass : styles.fail}>{state.passed ? "PASS" : "FAIL"}</h2><p>{state.failureReason ?? "Production goals reached."}</p></div>}
      </aside>
    </div>
    <footer className={styles.command}><p role="status">{message}</p>{building ? <button className={styles.primary} onClick={begin}>{state.phase === "intermission" ? "BEGIN NEXT LEVEL →" : "BEGIN MISSION →"}</button> : state.phase === "operation" ? <button className={styles.primary} onClick={endTurn}>END TURN →</button> : <button className={styles.primary} onClick={() => setState(null)}>NEW MISSION →</button>}</footer>
    {imessageAddress.trim() && <MissionControlPanel connection={advisorConnection} messages={advisorMessages} />}
    {state.phase === "complete" && <section aria-label="Mission result">
      {submissionStatus === "submitting" && <p role="status">Calculating and saving the mission result…</p>}
      {(submissionStatus === "failed" || (submitted && !submitted.saved)) && <button onClick={() => transcript && void submitRun(transcript)}>Retry saving result</button>}
      {submitted && <><MissionReport report={submitted.report} nickname={state.nickname} scores={submitted.score} sources={curatedSources} />{!submitted.saved && <p role="status">{submitted.reason ?? "Result is available locally; saving can be retried."}</p>}</>}
      {savedRunId && <p><a href={`/report/${savedRunId}`}>Open saved mission report</a></p>}
    </section>}
    {mini && <div className={styles.modalBackdrop}><div className={styles.modal}><MinigameBoundary key={`${mini}-${miniTarget?.moduleId}`} onFallback={() => completeMini({ completed: false, modifier: 0 })}><Suspense fallback={<p role="status">Loading minigame…</p>}>{mini === "match3" ? <Match3 onComplete={completeMini} onCancel={() => setMini(null)} /> : <RepairSnake onComplete={completeMini} onCancel={() => setMini(null)} />}</Suspense></MinigameBoundary></div></div>}
    {interiorId && <AgricultureInterior key={interiorId} state={state} moduleId={interiorId} pending={pending} feedback={message} onQueue={queue} onMini={openMini} onClose={() => setInteriorId(null)} />}
  </main>;
}
