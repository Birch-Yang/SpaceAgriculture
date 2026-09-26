import { MODULE_BY_ID } from "../../data/modules.ts";
import type { GameState } from "../state/types.ts";
import styles from "./game.module.css";

export type TutorialProgress = { enteredGreenhouse: boolean; enteredLivestock: boolean; queuedAction: boolean; resolvedTurn: boolean };

export function tutorialStep(state: GameState, progress: TutorialProgress): { index: number; title: string; instruction: string } {
  const categories = new Set(state.modules.map((module) => MODULE_BY_ID.get(module.moduleId)?.category));
  const steps = [
    { done: categories.has("habitat"), title: "Build a habitat", instruction: "Choose Habitat Core in the catalog, then click a free map tile." },
    { done: categories.has("solar") && categories.has("water") && categories.has("oxygen"), title: "Supply the base", instruction: "Place a Solar Array, Water Recycler, and Oxygen Generator. Watch your construction budget." },
    { done: categories.has("greenhouse") && categories.has("livestock"), title: "Add food production", instruction: "Place one Greenhouse and one Livestock Module. Each occupies several tiles." },
    { done: state.utilityEdges.length > 0, title: "Connect two modules", instruction: "Choose Utility corridor, then drag across empty cells from one module to another." },
    { done: state.phase !== "design", title: "Begin operation", instruction: "Press Begin Mission. The layout locks and farming actions become available." },
    { done: progress.enteredGreenhouse && progress.enteredLivestock, title: "Enter the agriculture modules", instruction: "Select each Greenhouse and Livestock Module on the map, then press Enter." },
    { done: progress.queuedAction, title: "Plan a farming action", instruction: "Inside a module, choose a crop, animal, or setting. Actions queue now and apply when you end the turn." },
    { done: progress.resolvedTurn, title: "Resolve a turn", instruction: "Return to the base and press End Turn. Check accepted actions, resources, and production." },
  ];
  const index = steps.findIndex((step) => !step.done);
  return index < 0 ? { index: steps.length, title: "Tutorial complete", instruction: "Continue managing crops, livestock, utilities, and hazards for the mission." }
    : { index, title: steps[index].title, instruction: steps[index].instruction };
}

export function TutorialGuide({ state, progress, onDismiss }: { state: GameState; progress: TutorialProgress; onDismiss: () => void }) {
  const step = tutorialStep(state, progress);
  return <section className={styles.tutorial} aria-label="New player tutorial">
    <div className={styles.panelHeading}><strong>TUTORIAL · {Math.min(step.index + 1, 8)}/8</strong><button onClick={onDismiss}>{step.index === 8 ? "Finish" : "Skip tutorial"}</button></div>
    <strong>{step.title}</strong><p>{step.instruction}</p>
    <small>Clicking and inspecting are free. Strategic actions use AP and resolve on End Turn.</small>
  </section>;
}
