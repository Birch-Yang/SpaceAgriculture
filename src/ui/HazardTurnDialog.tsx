"use client";

import { useEffect, useState } from "react";
import type { HazardInstance } from "../game/state/types.ts";
import styles from "./HazardTurnDialog.module.css";

export type HazardChoice = {
  label: string;
  detail: string;
  available: boolean;
  onChoose: () => void;
};

type Props = {
  hazard: HazardInstance;
  affectedLocation: string;
  choices: HazardChoice[];
  onClose: () => void;
};

const names: Record<HazardInstance["type"], string> = {
  temperature: "Extreme temperature",
  radiation: "Solar particle event",
  micrometeoroid: "Micrometeoroid impact",
  communications: "Communication outage",
  power: "Power shortage",
};

export function HazardTurnDialog({ hazard, affectedLocation, choices, onClose }: Props) {
  const [showChoices, setShowChoices] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return <div className={styles.backdrop} role="presentation">
    <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="hazard-dialog-title">
      <div className={styles.eventHeader}>
        <img src={`/assets/ui/hazards/${hazard.type}.svg`} alt="" className={styles.icon} />
        <div><span className={styles.eyebrow}>TURN {hazard.turn} · EVENT RESOLVED</span><h2 id="hazard-dialog-title">{names[hazard.type]}</h2><p>Severity {hazard.severity.toFixed(1)} · {affectedLocation}</p></div>
      </div>
      {!showChoices ? <>
        <p>This event was applied at End Turn. Review the affected system and plan a response for the next turn.</p>
        <button className={styles.primary} onClick={() => setShowChoices(true)} autoFocus>Inspect event →</button>
      </> : <>
        <span className={styles.eyebrow}>NEXT-TURN RESPONSE OPTIONS</span>
        <p>These use the current game actions. They cannot reverse the turn that just settled.</p>
        <div className={styles.choices}>{choices.map((choice) => <button key={choice.label} className={styles.choice} disabled={!choice.available} onClick={choice.onChoose}>
          <b>{choice.label}</b><small>{choice.detail}</small>
        </button>)}</div>
      </>}
      <button className={styles.dismiss} onClick={onClose}>Continue mission</button>
    </section>
  </div>;
}
