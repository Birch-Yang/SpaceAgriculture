"use client";

import { useEffect, useRef, useState } from "react";
import type { Cell } from "../state/types.ts";

const WIDTH = 12;
const HEIGHT = 10;
type Direction = "up" | "down" | "left" | "right";
const DELTA: Record<Direction, Cell> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
type Props = { onComplete: (modifier: number) => void };

function nextPart(snake: Cell[]): Cell {
  const empty: Cell[] = [];
  for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
    if (!snake.some((cell) => cell.x === x && cell.y === y)) empty.push({ x, y });
  }
  return empty[Math.floor(Math.random() * empty.length)] ?? { x: 0, y: 0 };
}

export function RepairSnake({ onComplete }: Props) {
  const snakeRef = useRef<Cell[]>([{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }]);
  const directionRef = useRef<Direction>("right");
  const callbackRef = useRef(onComplete);
  callbackRef.current = onComplete;
  const [snake, setSnake] = useState(snakeRef.current);
  const [direction, setDirection] = useState<Direction>("right");
  const [part, setPart] = useState<Cell>(() => nextPart(snakeRef.current));
  const [collected, setCollected] = useState(0);
  const [done, setDone] = useState(false);
  const [reason, setReason] = useState("");

  function finish(why: string): void { setReason(why); setDone(true); }
  function changeDirection(next: Direction): void {
    const current = directionRef.current;
    if (DELTA[next].x + DELTA[current].x === 0 && DELTA[next].y + DELTA[current].y === 0) return;
    directionRef.current = next;
    setDirection(next);
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const keys: Record<string, Direction> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
      const next = keys[event.key];
      if (next) { event.preventDefault(); changeDirection(next); }
    };
    window.addEventListener("keydown", onKey);
    const timer = window.setInterval(() => {
      if (done) return;
      const head = snakeRef.current[0];
      const delta = DELTA[directionRef.current];
      const next = { x: head.x + delta.x, y: head.y + delta.y };
      const ate = next.x === part.x && next.y === part.y;
      const body = ate ? snakeRef.current : snakeRef.current.slice(0, -1);
      if (next.x < 0 || next.y < 0 || next.x >= WIDTH || next.y >= HEIGHT || body.some((cell) => cell.x === next.x && cell.y === next.y)) {
        finish("Circuit path interrupted");
        return;
      }
      const updated = [next, ...snakeRef.current.slice(0, ate ? undefined : -1)];
      snakeRef.current = updated;
      setSnake(updated);
      if (ate) {
        setCollected((value) => {
          const count = value + 1;
          if (count >= 10) finish("Repair components recovered");
          return count;
        });
        setPart(nextPart(updated));
      }
    }, 160);
    return () => { window.removeEventListener("keydown", onKey); window.clearInterval(timer); };
  }, [done, part]);

  useEffect(() => {
    if (done) return;
    const timeout = window.setTimeout(() => { setReason("Repair window complete"); setDone(true); }, 15_000);
    return () => window.clearTimeout(timeout);
  }, [done]);

  function returnModifier(): void {
    const modifier = Math.max(-0.1, Math.min(0.1, (collected - 5) / 50));
    callbackRef.current(Number(modifier.toFixed(2)));
  }

  return <section className="mini-game" aria-label="Repair snake minigame">
    <div className="mini-game-heading"><div><p className="eyebrow">WIRING REPAIR</p><h3>Recover repair components</h3></div><span>Recovered {collected}</span></div>
    <p>{done ? reason : "Collect the bright components. Avoid the damaged wiring."}</p>
    <div className="snake-board" style={{ gridTemplateColumns: `repeat(${WIDTH}, 1fr)` }}>
      {Array.from({ length: WIDTH * HEIGHT }, (_, index) => {
        const cell = { x: index % WIDTH, y: Math.floor(index / WIDTH) };
        const isHead = snake[0]?.x === cell.x && snake[0]?.y === cell.y;
        const isBody = snake.some((partCell) => partCell.x === cell.x && partCell.y === cell.y);
        const isPart = part.x === cell.x && part.y === cell.y;
        return <span key={index} className={`snake-cell ${isBody ? (isHead ? "snake-head" : "snake-body") : ""} ${isPart ? "snake-part" : ""}`} />;
      })}
    </div>
    <div className="snake-controls" aria-label="Snake direction controls">
      <button onClick={() => changeDirection("up")} aria-label="Move up">↑</button><button onClick={() => changeDirection("left")} aria-label="Move left">←</button>
      <button onClick={() => changeDirection("down")} aria-label="Move down">↓</button><button onClick={() => changeDirection("right")} aria-label="Move right">→</button>
    </div>
    <div className="mini-game-actions"><span>Arrow keys / WASD</span><button className="button button-primary" onClick={returnModifier} disabled={!done}>Return modifier</button></div>
    {done && <small>Activity result is capped between −10% and +10%.</small>}
  </section>;
}
