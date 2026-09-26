"use client";

import { useEffect, useRef, useState } from "react";
import type { MinigameResult } from "../match3/Match3.tsx";

type Point = { x: number; y: number };
type Props = { onComplete: (result: MinigameResult) => void; onCancel: () => void };
const SIZE = 8;
const obstacles = new Set(["5,2", "5,3", "5,4", "2,6", "3,6"]);
const pickups: Point[] = [{ x: 4, y: 3 }, { x: 6, y: 5 }, { x: 1, y: 1 }, { x: 6, y: 1 }, { x: 1, y: 5 }];
const key = (point: Point) => `${point.x},${point.y}`;

export function RepairSnake({ onComplete, onCancel }: Props) {
  const [snake, setSnake] = useState<Point[]>([{ x: 2, y: 3 }, { x: 1, y: 3 }]);
  const [pickupIndex, setPickupIndex] = useState(0);
  const [ticks, setTicks] = useState(0);
  const [running, setRunning] = useState(false);
  const direction = useRef<Point>({ x: 1, y: 0 });
  const finished = useRef(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const choices: Record<string, Point> = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 } };
      const choice = choices[event.key];
      if (!choice) return;
      event.preventDefault();
      if (choice.x !== -direction.current.x || choice.y !== -direction.current.y) direction.current = choice;
      setRunning(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setTicks((value) => value + 1), 260);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (!ticks || finished.current) return;
    const head = { x: snake[0].x + direction.current.x, y: snake[0].y + direction.current.y };
    const pickup = pickups[pickupIndex % pickups.length];
    const eating = head.x === pickup.x && head.y === pickup.y;
    const body = eating ? snake : snake.slice(0, -1);
    const crashed = head.x < 0 || head.y < 0 || head.x >= SIZE || head.y >= SIZE || obstacles.has(key(head)) || body.some((part) => key(part) === key(head));
    if (crashed || ticks >= 65 || pickupIndex >= 4) {
      finished.current = true;
      onComplete({ completed: true, modifier: Math.max(-0.1, Math.min(0.1, -0.1 + pickupIndex * 0.05)) });
      return;
    }
    setSnake([head, ...body]);
    if (eating) setPickupIndex(pickupIndex + 1);
  }, [ticks]); // Each interval tick advances the current board exactly once.

  const snakeCells = new Set(snake.map(key));
  const pickup = pickups[pickupIndex % pickups.length];
  return <div className="minigamePanel" role="dialog" aria-modal="true" aria-label="Repair snake">
    <div className="minigameHeader"><div><strong>Wiring repair</strong><p>Collect components. Avoid exposed wiring and the walls.</p></div><button onClick={onCancel} aria-label="Close minigame">×</button></div>
    <p>Components: {pickupIndex}/4 · Arrow keys steer · Modifier stays within ±10%</p>
    <div className="snakeBoard">{Array.from({ length: SIZE * SIZE }, (_, i) => {
      const point = { x: i % SIZE, y: Math.floor(i / SIZE) };
      const type = snakeCells.has(key(point)) ? "snake" : obstacles.has(key(point)) ? "wire" : point.x === pickup.x && point.y === pickup.y ? "pickup" : "empty";
      return <span key={i} className={type} aria-label={type}>{type === "wire" ? "×" : type === "pickup" ? "+" : type === "snake" ? "■" : ""}</span>;
    })}</div>
    {!running && <button className="minigameStart" onClick={() => setRunning(true)}>Start repair</button>}
  </div>;
}
