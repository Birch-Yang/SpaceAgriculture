"use client";
import { CROP_IDS, CROP_CATALOG } from '../../data/cropCatalog';

import { useState } from "react";
import { MODULE_BY_ID } from "../../data/modules.ts";
import type { AnimalKind, CropKind, GameState, PlayerAction, Setting } from "../state/types.ts";
import { actionSlotIndex, agricultureSlots, careAction, slotAction } from "./agricultureAdapter.ts";
import styles from "./game.module.css";
import { AgricultureSprite } from "../../ui/AgricultureSprite";

type MiniTarget = { kind: "crop" | "animal" | "repair"; moduleId: string; slotIndex: number };
type Props = { state: GameState; moduleId: string; pending: PlayerAction[]; feedback: string; onQueue: (action: PlayerAction) => void; onMini: (target: MiniTarget) => void; onClose: () => void };

const crops = CROP_IDS;
const animals: AnimalKind[] = ["chicken", "pig", "cow"];
const settings: Setting[] = ["low", "medium", "high"];

export function AgricultureInterior({ state, moduleId, pending, feedback, onQueue, onMini, onClose }: Props) {
  const module = state.modules.find((item) => item.id === moduleId);
  const definition = module && MODULE_BY_ID.get(module.moduleId);
  const agriculture = agricultureSlots(state, moduleId);
  const [cropSettings, setCropSettings] = useState<Record<number, { water: Setting; light: Setting; temperature: Setting }>>({});
  const [tool, setTool] = useState<string | null>(null);
  if (!module || !definition || !agriculture) return null;
  const operating = state.phase === "operation";
  const queued = (type: string, index: number) => pending.some((action) => action.type === type && "moduleId" in action && action.moduleId === moduleId && actionSlotIndex(action) === index);
  const lockedReason = operating ? "This slot is not active in this build." : "Begin the mission to manage this slot.";
  const useTool = (index: number, selected: string | null) => {
    if (!operating || !selected) return;
    if (agriculture.kind === "greenhouse") {
      if (selected.startsWith("seed:")) onQueue(slotAction({ type: "PLANT_CROP", moduleId, crop: selected.slice(5) as CropKind }, index, agriculture.fullContract));
      if (selected === "water") onQueue({ type: "WATER_PLOT", moduleId, slotIndex: index });
      if (selected === "prune") onQueue({ type: "PRUNE_PLOT", moduleId, slotIndex: index });
    } else {
      if (selected.startsWith("animal:")) onQueue(slotAction({ type: "SET_ANIMAL", moduleId, animal: selected.slice(7) as AnimalKind }, index, agriculture.fullContract));
      if (selected === "feed") onQueue({ type: "FEED_STALL", moduleId, slotIndex: index });
      if (selected === "clean") onQueue({ type: "CLEAN_STALL", moduleId, slotIndex: index });
    }
  };
  const dragTool = (event: React.DragEvent, selected: string) => { event.dataTransfer.setData("text/plain", selected); setTool(selected); };

  return <div className={styles.interiorBackdrop} role="dialog" aria-modal="true" aria-label={`${definition.label} interior`}>
    <div className={styles.interiorPanel}>
      <div className={styles.panelHeading}><div><strong>{definition.label.toUpperCase()}</strong><p>{agriculture.kind === "greenhouse" ? "Grow and harvest crops" : "Raise and care for livestock"} · {agriculture.slots.length} {agriculture.kind === "greenhouse" ? "plots" : "stalls"}</p></div><button onClick={onClose}>← Return to base (Esc)</button></div>
      <p className={styles.interiorHelp}>Actions are queued here and take effect after End Turn. One action costs 1 AP; repair costs 2 AP.</p>
      <p className={styles.interiorHelp} role="status">{feedback}</p><p className={styles.interiorHelp}>Research samples: {state.production.researchCumulative ?? 0} · Arabidopsis does not provide food or crop score.</p>
      {state.rulesetVersion >= 3 && <div className={styles.careTray} aria-label="Care tools">
        <p>Choose a tool, then click a bed or stall. You can also drag it onto one. Actions resolve at End Turn.</p>
        {agriculture.kind === "greenhouse" ? <>
          {crops.map(crop => <button key={crop} type="button" draggable onDragStart={event => dragTool(event, `seed:${crop}`)} onClick={() => setTool(`seed:${crop}`)} aria-pressed={tool === `seed:${crop}`}>◈ {CROP_CATALOG[crop].label} seed</button>)}
          <button type="button" draggable onDragStart={event => dragTool(event, "water")} onClick={() => setTool("water")} aria-pressed={tool === "water"}>💧 Water · 1 Water + 1 AP</button>
          <button type="button" draggable onDragStart={event => dragTool(event, "prune")} onClick={() => setTool("prune")} aria-pressed={tool === "prune"}>✂ Inspect / prune · 1 AP</button>
        </> : <>
          {animals.map(animal => <button key={animal} type="button" draggable onDragStart={event => dragTool(event, `animal:${animal}`)} onClick={() => setTool(`animal:${animal}`)} aria-pressed={tool === `animal:${animal}`}>◈ {animal}</button>)}
          <button type="button" draggable onDragStart={event => dragTool(event, "feed")} onClick={() => setTool("feed")} aria-pressed={tool === "feed"}>▣ Feed · 1 Food + 1 AP</button>
          <button type="button" draggable onDragStart={event => dragTool(event, "clean")} onClick={() => setTool("clean")} aria-pressed={tool === "clean"}>✧ Clean · 1 AP</button>
        </>}
      </div>}
      {state.rulesetVersion >= 3 && <p className={styles.interiorHelp}>Soybean residue: {state.production.cropResidue ?? 0} · Feed reserve: {state.production.feedReserve ?? 0} · Nutrients: {state.production.nutrients ?? 0} · Available samples: {state.production.researchAvailable ?? 0} <button disabled={!operating || !(state.production.cropResidue ?? 0)} onClick={() => onQueue({ type: "ALLOCATE_RESIDUE", destination: "feed" })}>Residue → feed</button> <button disabled={!operating || !(state.production.cropResidue ?? 0)} onClick={() => onQueue({ type: "ALLOCATE_RESIDUE", destination: "nutrients" })}>Residue → nutrients</button> <button disabled={!operating || !(state.production.researchAvailable ?? 0)} onClick={() => onQueue({ type: "USE_RESEARCH", purpose: "diagnostic" })}>Research → diagnostic</button> <button disabled={!operating || !(state.production.researchAvailable ?? 0)} onClick={() => onQueue({ type: "USE_RESEARCH", purpose: "forecast" })}>Research → forecast</button></p>}
      {!agriculture.fullContract && agriculture.slots.length > 1 && <p role="status" className={styles.interiorHelp}>Only the first slot is active in this build. Other slots show the module capacity and will become available with independent slot simulation.</p>}
      <div className={styles.slotGrid}>{agriculture.kind === "greenhouse" ? agriculture.slots.map((slot) => {
        const value = cropSettings[slot.index] ?? { water: slot.water, light: slot.light, temperature: slot.temperature };
        const canUse = operating && slot.supported;
        const settingsChanged = value.water !== slot.water || value.light !== slot.light || value.temperature !== slot.temperature;
        return <section className={styles.slotCard} key={slot.index} aria-label={`Crop plot ${slot.index + 1}`}>
          <h2>Plot {slot.index + 1}</h2><AgricultureSprite crop={slot.crop} ready={slot.ready} /><p>{slot.crop ? `${CROP_CATALOG[slot.crop].label} · ${slot.ready ? "Ready to harvest" : `${slot.progress}% grown`}` : "Empty plot"}</p>
          {state.rulesetVersion >= 3 && <button className={styles.careTarget} disabled={!canUse} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); useTool(slot.index, event.dataTransfer.getData("text/plain")); }} onClick={() => useTool(slot.index, tool)} aria-label={`Use ${tool ?? "selected tool"} on plot ${slot.index + 1}`}><span className={`${styles.bedSoil} ${slot.ready ? styles.bedReady : slot.progress < 30 ? styles.bedSprout : slot.progress < 70 ? styles.bedSeedling : styles.bedMature}`}>{slot.crop ? <AgricultureSprite crop={slot.crop} ready={slot.ready} /> : "· · ·"}</span><span>{slot.ready ? "Harvest ready" : slot.crop ? slot.progress < 30 ? "Sprouting" : slot.progress < 70 ? "Seedling" : "Maturing" : "Empty bed"}</span></button>}
          {state.rulesetVersion >= 3 && <p>Moisture {Math.round(slot.moisture ?? 60)}/100 · Health {Math.round(slot.health ?? 100)}/100</p>}
          {!canUse && <p>{lockedReason}</p>}
          <div className={styles.buttonGroup}>{crops.map((crop) => <button key={crop} disabled={!canUse} title={!canUse ? lockedReason : undefined} onClick={() => onQueue(slotAction({ type: "PLANT_CROP", moduleId, crop }, slot.index, agriculture.fullContract))}>{CROP_CATALOG[crop].label}{CROP_CATALOG[crop].role === 'research' ? ' · Research' : ''}</button>)}</div>
          <div className={styles.settingRow}>{(["water", "light", "temperature"] as const).map((key) => <label key={key}>{key}<select disabled={!canUse} value={value[key]} onChange={(event) => setCropSettings({ ...cropSettings, [slot.index]: { ...value, [key]: event.target.value as Setting } })}>{settings.map((setting) => <option key={setting}>{setting}</option>)}</select></label>)}</div>
          <div className={styles.buttonGroup}><button disabled={!canUse || !settingsChanged} title={!settingsChanged ? "Choose a different setting first." : undefined} onClick={() => onQueue(slotAction({ type: "SET_CROP_PARAMS", moduleId, ...value }, slot.index, agriculture.fullContract))}>Set environment{queued("SET_CROP_PARAMS", slot.index) ? " · queued" : ""}</button>
            <button disabled={!canUse || !agriculture.fullContract || !slot.crop || (state.rulesetVersion < 3 && slot.wateredThisCycle) || queued("WATER_PLOT", slot.index)} onClick={() => onQueue(careAction("WATER_PLOT", moduleId, slot.index))}>{state.rulesetVersion >= 3 ? "Water this bed" : "Water once per cycle"}{queued("WATER_PLOT", slot.index) ? " · queued" : ""}</button></div>
          <div className={styles.buttonGroup}><button disabled={!canUse || !slot.ready || queued("HARVEST_CROP", slot.index)} title={!slot.ready ? "Crop is not ready." : undefined} onClick={() => onQueue(slotAction({ type: "HARVEST_CROP", moduleId }, slot.index, agriculture.fullContract))}>{slot.crop && CROP_CATALOG[slot.crop].role === 'research' ? 'Collect research sample' : 'Harvest'}{queued("HARVEST_CROP", slot.index) ? " · queued" : ""}</button>
            <button disabled={!canUse || !agriculture.fullContract || !slot.ready || queued("HARVEST_CROP", slot.index)} title={!agriculture.fullContract ? "Minigame bonuses need the updated turn resolver." : undefined} onClick={() => onMini({ kind: "crop", moduleId, slotIndex: slot.index })}>Harvest minigame</button></div>
        </section>;
      }) : agriculture.slots.map((slot) => {
        const canUse = operating && slot.supported;
        return <section className={styles.slotCard} key={slot.index} aria-label={`Livestock stall ${slot.index + 1}`}>
          <h2>Stall {slot.index + 1}</h2><AgricultureSprite animal={slot.animal} /><p>{slot.animal ? `${slot.animal} · ${slot.progress}% cycle` : "Empty stall"}</p>
          {state.rulesetVersion >= 3 && <><button className={styles.careTarget} disabled={!canUse} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); useTool(slot.index, event.dataTransfer.getData("text/plain")); }} onClick={() => useTool(slot.index, tool)} aria-label={`Use ${tool ?? "selected tool"} on stall ${slot.index + 1}`}><span className={styles.barnFloor}><span className={styles.roamingAnimal}><AgricultureSprite animal={slot.animal} /></span> ▤ trough</span><span>Feed / clean this stall</span></button><p>Satiety {Math.round(slot.satiety ?? 70)}/100 · Cleanliness {Math.round(slot.cleanliness ?? 90)}/100 · Health {Math.round(slot.health ?? 100)}/100</p></>}
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
