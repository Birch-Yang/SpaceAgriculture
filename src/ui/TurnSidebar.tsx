import type { ReactNode } from "react";
import { MODULE_BY_ID } from "../data/modules.ts";
import type { GameState, PlayerAction } from "../game/state/types.ts";
import styles from "./TurnSidebar.module.css";

type Props = {
  state: GameState;
  apAvailable: number;
  apPlanned: number;
  pending: PlayerAction[];
  connection: "online" | "offline" | "unavailable";
  latestAdvice?: string;
  greenhouseId?: string;
  livestockId?: string;
  systemsId?: string;
  onOpenAgriculture: (moduleId: string) => void;
  onSelectSystem: (moduleId: string) => void;
  onRemoveAction: (index: number) => void;
  onEndTurn: () => void;
  children: ReactNode;
  className?: string;
};

function actionLabel(action: PlayerAction): string {
  return action.type.replaceAll("_", " ").toLowerCase();
}

export function TurnSidebar({ state, apAvailable, apPlanned, pending, connection, latestAdvice, greenhouseId, livestockId, systemsId, onOpenAgriculture, onSelectSystem, onRemoveAction, onEndTurn, children, className }: Props) {
  const greenhouse = greenhouseId ? state.modules.find((module) => module.id === greenhouseId) : undefined;
  const livestock = livestockId ? state.modules.find((module) => module.id === livestockId) : undefined;
  const systems = systemsId ? state.modules.find((module) => module.id === systemsId) : undefined;
  const outlook = state.forecast;
  const latestHazard = state.lastTurn?.hazard;

  return <aside className={`${styles.rail} ${className ?? ""}`} aria-label="Persistent turn sidebar">
    <div className={styles.header}>
      <span className={styles.eyebrow}>MISSION CONTROL · LINK {connection.toUpperCase()}</span>
      <strong>{state.crisis ? "Crisis response" : "Mission operations"}</strong>
      <small>LEVEL {state.level} · TURN {state.turn}{state.turn <= 10 ? " / 10" : " · RECOVERY"} · {apAvailable} AP AVAILABLE</small>
      <button className={styles.primary} onClick={onEndTurn}>END TURN →</button>
    </div>

    <section className={styles.card} aria-label="Turn resources">
      <span className={styles.eyebrow}>TURN RESOURCES</span>
      <div className={styles.metrics}>
        <span>AP <b>{Math.max(0, apAvailable - apPlanned)}</b></span>
        <span>POWER <b>{state.resources.power.toFixed(0)}</b></span>
        <span>WATER <b>{state.resources.water.toFixed(0)}</b></span>
      </div>
    </section>

    <section className={styles.card} aria-label="This turn operations">
      <span className={styles.eyebrow}>THIS TURN · WHAT TO DO</span>
      <div className={styles.row}><span>01</span><div><b>Hazard outlook</b><small>Inspect the forecast before End Turn</small></div><span className={styles.rowState}>LOOK</span></div>
      <div className={styles.row}><span>02</span><div><b>Greenhouse care</b><small>{greenhouse ? MODULE_BY_ID.get(greenhouse.moduleId)?.label : "Build a greenhouse first"}</small></div><button disabled={!greenhouseId} onClick={() => greenhouseId && onOpenAgriculture(greenhouseId)}>Open</button></div>
      <div className={styles.row}><span>03</span><div><b>Livestock care</b><small>{livestock ? MODULE_BY_ID.get(livestock.moduleId)?.label : "Build a livestock module first"}</small></div><button disabled={!livestockId} onClick={() => livestockId && onOpenAgriculture(livestockId)}>Open</button></div>
      <div className={styles.row}><span>04</span><div><b>Systems &amp; repairs</b><small>{systems ? MODULE_BY_ID.get(systems.moduleId)?.label : "Select a system on the map"}</small></div><button disabled={!systemsId} onClick={() => systemsId && onSelectSystem(systemsId)}>Focus</button></div>
    </section>

    <section className={`${styles.card} ${styles.outlook}`} aria-label="Fuzzy hazard forecast">
      <span className={styles.eyebrow}>FUZZY OUTLOOK · {outlook.window ?? "UPCOMING"}</span>
      <p>Solar {outlook.solar} · Thermal {outlook.thermal} · Impact {outlook.impact} · Systems {outlook.systems ?? "unknown"}</p>
      <small>The exact event is revealed by the current turn resolver at End Turn.</small>
    </section>

    {state.lastTurn && <section className={`${styles.card} ${latestHazard ? styles.warning : styles.outlook}`} aria-label="Last turn result">
      <span className={styles.eyebrow}>LAST TURN · {state.lastTurn.turn}</span>
      <h2>{latestHazard ? latestHazard.type.replaceAll("_", " ") : "No major hazard"}</h2>
      <p>Crops +{state.lastTurn.cropYield} · Meat +{state.lastTurn.meatYield}</p>
      {state.lastTurn.warnings.length > 0 && <p>{state.lastTurn.warnings.join(" ")}</p>}
    </section>}

    <section className={styles.card} aria-label="Selected structure">
      <span className={styles.eyebrow}>SELECTED STRUCTURE</span>
      {children}
    </section>

    <section className={`${styles.card} ${styles.message}`} aria-label="Mission Control status">
      <span className={styles.eyebrow}>MISSION CONTROL · {connection.toUpperCase()}</span>
      <p>{connection === "offline" ? "MISSION CONTROL LINK LOST" : latestAdvice ?? (connection === "online" ? "Awaiting the next advisory." : "Advisor unavailable; the mission can continue.")}</p>
    </section>

    <section className={styles.card} aria-label="Queued turn actions">
      <span className={styles.eyebrow}>QUEUED ACTIONS · {Math.max(0, apAvailable - apPlanned)} AP LEFT</span>
      {pending.length ? <ul className={styles.queue}>{pending.map((action, index) => <li key={`${action.type}-${index}`}><span>{actionLabel(action)}</span><button onClick={() => onRemoveAction(index)} aria-label={`Remove ${actionLabel(action)}`}>Cancel</button></li>)}</ul> : <p>Nothing queued yet. Actions apply on End Turn.</p>}
    </section>
  </aside>;
}
