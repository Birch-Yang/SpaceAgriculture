"use client";

import { useState } from "react";
import { MODULE_BY_ID } from "../../data/modules.ts";
import type { AnimalKind, CropKind, GameState, PlayerAction, Setting } from "../state/types.ts";
import { actionSlotIndex, agricultureSlots, careAction, slotAction } from "./agricultureAdapter.ts";
import styles from "./game.module.css";
import { AgricultureSprite } from "../../ui/AgricultureSprite";

type MiniTarget = { kind: "crop" | "animal" | "repair"; moduleId: string; slotIndex: number };
type Props = { state: GameState; moduleId: string; pending: PlayerAction[]; feedback: string; onQueue: (action: PlayerAction) => void; onMini: (target: MiniTarget) => void; onClose: () => void };

const crops: CropKind[] = ["lettuce", "potato", "wheat"];
const animals: AnimalKind[] = ["chicken", "pig", "cow"];
const settings: Setting[] = ["low", "medium", "high"];

export function AgricultureInterior({ state, moduleId, pending, feedback, onQueue, onMini, onClose }: Props) {
  const module = state.modules.find((item) => item.id === moduleId);
  const definition = module && MODULE_BY_ID.get(module.moduleId);
  const agriculture = agricultureSlots(state, moduleId);
  const [cropSettings, setCropSettings] = useState<Record<number, { water: Setting; light: Setting; temperature: Setting }>>({});
  if (!module || !definition || !agriculture) return null;
  const operating = state.phase === "operation";
  const queued = (type: string, index: number) => pending.some((action) => action.type === type && "moduleId" in action && action.moduleId === moduleId && actionSlotIndex(action) === index);
  const lockedReason = operating ? "This slot is not active in this build." : "Begin the mission to manage this slot.";

  return <div className={styles.interiorBackdrop} role="dialog" aria-modal="true" aria-label={`${definition.label} interior`}>
    <div className={styles.interiorPanel}>
      <div className={styles.panelHeading}><div><strong>{definition.label.toUpperCase()}</strong><p>{agriculture.kind === "greenhouse" ? "Grow and harvest crops" : "Raise and care for livestock"} · {agriculture.slots.length} {agriculture.kind === "greenhouse" ? "plots" : "stalls"}</p></div><button onClick={onClose}>← Return to base (Esc)</button></div>
      <p className={styles.interiorHelp}>Actions are queued here and take effect after End Turn. One action costs 1 AP; repair costs 2 AP.</p>
      <p className={styles.interiorHelp} role="status">{feedback}</p>
      {!agriculture.fullContract && agriculture.slots.length > 1 && <p role="status" className={styles.interiorHelp}>Only the first slot is active in this build. Other slots show the module capacity and will become available with independent slot simulation.</p>}
      <div className={styles.slotGrid}>{agriculture.kind === "greenhouse" ? agriculture.slots.map((slot) => {
        const value = cropSettings[slot.index] ?? { water: slot.water, light: slot.light, temperature: slot.temperature };
        const canUse = operating && slot.supported;
        const settingsChanged = value.water !== slot.water || value.light !== slot.light || value.temperature !== slot.temperature;
        return <section className={styles.slotCard} key={slot.index} aria-label={`Crop plot ${slot.index + 1}`}>
          <h2>Plot {slot.index + 1}</h2><AgricultureSprite crop={slot.crop} ready={slot.ready} /><p>{slot.crop ? `${slot.crop} · ${slot.ready ? "Ready to harvest" : `${slot.progress}% grown`}` : "Empty plot"}</p>
          {!canUse && <p>{lockedReason}</p>}
          <div className={styles.buttonGroup}>{crops.map((crop) => <button key={crop} disabled={!canUse} title={!canUse ? lockedReason : undefined} onClick={() => onQueue(slotAction({ type: "PLANT_CROP", moduleId, crop }, slot.index, agriculture.fullContract))}>{crop}</button>)}</div>
          <div className={styles.settingRow}>{(["water", "light", "temperature"] as const).map((key) => <label key={key}>{key}<select disabled={!canUse} value={value[key]} onChange={(event) => setCropSettings({ ...cropSettings, [slot.index]: { ...value, [key]: event.target.value as Setting } })}>{settings.map((setting) => <option key={setting}>{setting}</option>)}</select></label>)}</div>
          <div className={styles.buttonGroup}><button disabled={!canUse || !settingsChanged} title={!settingsChanged ? "Choose a different setting first." : undefined} onClick={() => onQueue(slotAction({ type: "SET_CROP_PARAMS", moduleId, ...value }, slot.index, agriculture.fullContract))}>Set environment{queued("SET_CROP_PARAMS", slot.index) ? " · queued" : ""}</button>
            <button disabled={!canUse || !agriculture.fullContract || !slot.crop || slot.wateredThisCycle || queued("WATER_PLOT", slot.index)} title={!agriculture.fullContract ? "Watering needs independent slot simulation." : slot.wateredThisCycle ? "Already watered this growth cycle." : undefined} onClick={() => onQueue(careAction("WATER_PLOT", moduleId, slot.index))}>Water once per cycle{queued("WATER_PLOT", slot.index) ? " · queued" : ""}</button></div>
          <div className={styles.buttonGroup}><button disabled={!canUse || !slot.ready || queued("HARVEST_CROP", slot.index)} title={!slot.ready ? "Crop is not ready." : undefined} onClick={() => onQueue(slotAction({ type: "HARVEST_CROP", moduleId }, slot.index, agriculture.fullContract))}>Harvest{queued("HARVEST_CROP", slot.index) ? " · queued" : ""}</button>
            <button disabled={!canUse || !agriculture.fullContract || !slot.ready || queued("HARVEST_CROP", slot.index)} title={!agriculture.fullContract ? "Minigame bonuses need the updated turn resolver." : undefined} onClick={() => onMini({ kind: "crop", moduleId, slotIndex: slot.index })}>Harvest minigame</button></div>
        </section>;
      }) : agriculture.slots.map((slot) => {
        const canUse = operating && slot.supported;
        return <section className={styles.slotCard} key={slot.index} aria-label={`Livestock stall ${slot.index + 1}`}>
          <h2>Stall {slot.index + 1}</h2><AgricultureSprite animal={slot.animal} /><p>{slot.animal ? `${slot.animal} · ${slot.progress}% cycle` : "Empty stall"}</p>
          {!canUse && <p>{lockedReason}</p>}
          <div className={styles.buttonGroup}>{animals.map((animal) => <button key={animal} disabled={!canUse} onClick={() => onQueue(slotAction({ type: "SET_ANIMAL", moduleId, animal }, slot.index, agriculture.fullContract))}>{animal}</button>)}</div>
          <p>Feed level · current: {slot.feed}</p><div className={styles.buttonGroup}>{(["rationed", "normal", "high"] as const).map((feed) => <button key={feed} disabled={!canUse || feed === slot.feed} title={feed === slot.feed ? "Already active." : undefined} onClick={() => onQueue(slotAction({ type: "SET_LIVESTOCK_PARAMS", moduleId, feed }, slot.index, agriculture.fullContract))}>{feed}</button>)}</div>
          <div className={styles.buttonGroup}><button disabled={!canUse || !agriculture.fullContract || !slot.animal || slot.fedThisCycle || queued("FEED_STALL", slot.index)} title={!agriculture.fullContract ? "Feeding needs independent slot simulation." : slot.fedThisCycle ? "Already fed this growth cycle." : undefined} onClick={() => onQueue(careAction("FEED_STALL", moduleId, slot.index))}>Feed once per cycle{queued("FEED_STALL", slot.index) ? " · queued" : ""}</button>
            <button disabled={!canUse || !agriculture.fullContract || !slot.animal || queued("FEED_STALL", slot.index)} title={!agriculture.fullContract ? "Minigame bonuses need the updated turn resolver." : undefined} onClick={() => onMini({ kind: "animal", moduleId, slotIndex: slot.index })}>Livestock minigame</button></div>
        </section>;
      })}</div>
    </div>
  </div>;
}

export type { MiniTarget };
