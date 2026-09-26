import { MODULE_BY_ID } from "../data/modules.ts";
import { EMERGENCY } from "../data/emergency.ts";
import { emergencyResources, emergencySupplyAmount, suppliesRemaining, isEmergencyAction } from "../game/simulation/emergency.ts";
import type { GameState, PlayerAction } from "../game/state/types.ts";
import styles from "./emergency.module.css";

export function EmergencyPanel({ state, pending, onQueue, onCancel }: {
  state: GameState; pending: PlayerAction[]; onQueue: (action: PlayerAction) => boolean; onCancel: (index: number) => void;
}) {
  const supplyQueued = pending.some(action => action.type === "USE_EMERGENCY_SUPPLY");
  const free = !!state.crisis && !pending.some(isEmergencyAction);
  const modules = state.modules.filter(module => ["greenhouse", "livestock"].includes(MODULE_BY_ID.get(module.moduleId)!.category));
  return <section className={styles.panel} aria-label="Emergency actions">
    <header><div><p className={styles.eyebrow}>{state.crisis ? "CRISIS RESPONSE" : "CONTINGENCY CONTROLS"}</p>
      <h2>{state.crisis ? "One recovery turn remaining" : "Protect your reserves"}</h2></div>
      <strong>{suppliesRemaining(state)} / {EMERGENCY.suppliesPerRun} supplies</strong></header>
    {state.crisis && <p role="alert">{state.crisis.trigger}. Restore all resources above zero and temperature to 5–35°C by the next settlement.</p>}
    <p>{free ? "Your first emergency action this turn is free. Additional emergency actions cost 1 AP." : "Each emergency action costs 1 AP."} Orders apply on End Turn; cancel before settlement without spending supplies.</p>
    <div className={styles.columns}><div><h3>Pause agriculture · {free ? "Free" : "1 AP"}</h3>
      <p>One turn without growth, harvest or output. Fixed utility demand and livestock feed drop to 25%; extra agriculture consumption stops. Progress is preserved. Automatically resumes next turn.</p>
      {modules.length ? modules.map(module => {
        const index = pending.findIndex(action => action.type === "PAUSE_MODULE" && action.moduleId === module.id);
        return <button key={module.id} onClick={() => index >= 0 ? onCancel(index) : onQueue({ type: "PAUSE_MODULE", moduleId: module.id })}>
          {index >= 0 ? "Cancel pause" : "Pause"} · {MODULE_BY_ID.get(module.moduleId)!.label} ({module.id})
        </button>;
      }) : <p>No agriculture modules to pause.</p>}</div>
      <div><h3>Emergency supply · {free ? "Free" : "1 AP"}</h3><p>Two uses for the whole run, including all Progressive levels. One supply per turn. A refill buys time; it does not guarantee survival.</p>
      {emergencyResources.map(resource => <button key={resource} disabled={suppliesRemaining(state) <= 0 || supplyQueued} onClick={() => onQueue({ type: "USE_EMERGENCY_SUPPLY", resource })}>
        Supply {resource} · up to +{emergencySupplyAmount(resource)}
      </button>)}
      {supplyQueued && <p>Supply queued. Cancel it in the action queue to choose another resource.</p>}</div></div>
  </section>;
}
