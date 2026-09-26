"use client";

import { useEffect, useRef, useState } from "react";
import type { MinigameResult } from "../match3/Match3.tsx";
import { advanceRepair, initialRepairState, repairModifier, repairObstacles, repairPickups, type RepairDirection } from "../proof.ts";

type Props = { onComplete: (result: MinigameResult) => void; onCancel: () => void };
const SIZE = 8;
const key = (point: { x: number; y: number }) => `${point.x},${point.y}`;

export function RepairSnake({ onComplete, onCancel }: Props) {
  const [game, setGame] = useState(initialRepairState);
  const [running, setRunning] = useState(false);
  const gameRef = useRef(game);
  const direction = useRef<RepairDirection>("right");
  const directions = useRef<RepairDirection[]>([]);
  const finished = useRef(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const choices: Record<string, RepairDirection> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
      const choice = choices[event.key];
      if (!choice) return;
      event.preventDefault();
      const opposite: Record<RepairDirection, RepairDirection> = { up: "down", down: "up", left: "right", right: "left" };
      if (choice !== opposite[gameRef.current.direction]) direction.current = choice;
      setRunning(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      if (finished.current) return;
      const chosen = direction.current;
      const next = advanceRepair(gameRef.current, chosen);
      if (!next) return;
      directions.current.push(chosen);
      gameRef.current = next;
      setGame(next);
      if (next.done) {
        finished.current = true;
        onComplete({ completed: true, modifier: repairModifier(next.pickupIndex), proof: { kind: "repair", directions: [...directions.current] } });
      }
    }, 260);
    return () => window.clearInterval(timer);
  }, [running, onComplete]);

  const snakeCells = new Set(game.snake.map(key));
  const pickup = repairPickups[game.pickupIndex] ?? repairPickups[0];
  return <div className="minigamePanel" role="dialog" aria-modal="true" aria-label="Repair snake">
    <div className="minigameHeader"><div><strong>Wiring repair</strong><p>Collect components. Avoid exposed wiring and the walls.</p></div><button onClick={onCancel} aria-label="Close minigame">×</button></div>
    <p>Components: {game.pickupIndex}/4 · Arrow keys steer · Modifier stays within ±10%</p>
    <div className="snakeBoard">{Array.from({ length: SIZE * SIZE }, (_, i) => {
      const point = { x: i % SIZE, y: Math.floor(i / SIZE) };
      const type = snakeCells.has(key(point) ) ? "snake" : repairObstacles.has(key(point)) ? "wire" : point.x === pickup.x && point.y === pickup.y ? "pickup" : "empty";
      return <span key={i} className={type} aria-label={type}>{type === "wire" ? "×" : type === "pickup" ? "+" : type === "snake" ? "■" : ""}</span>;
    })}</div>
    {!running && <button className="minigameStart" onClick={() => setRunning(true)}>Start repair</button>}
  </div>;
}
