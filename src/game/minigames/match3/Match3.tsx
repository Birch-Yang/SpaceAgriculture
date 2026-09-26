"use client";

import { useState } from "react";

export type MinigameResult = { completed: boolean; modifier: number };
type Props = { onComplete: (result: MinigameResult) => void; onCancel: () => void };
const cropIcons = ["◉", "◆", "●", "✦", "▲"];
const cropColors = ["#91d990", "#e5bb76", "#d6a2d9", "#8bd5df", "#e8df93"];
const WIDTH = 6;
const initial = [
  0, 1, 0, 2, 3, 4,
  1, 0, 2, 3, 4, 1,
  2, 1, 3, 4, 0, 2,
  3, 4, 2, 1, 2, 3,
  4, 3, 4, 2, 3, 4,
  0, 1, 3, 4, 1, 2,
];

function matchedCells(board: number[]): Set<number> {
  const found = new Set<number>();
  for (let y = 0; y < WIDTH; y++) for (let x = 0; x < WIDTH; x++) {
    const i = y * WIDTH + x;
    if (x <= WIDTH - 3 && board[i] === board[i + 1] && board[i] === board[i + 2]) [i, i + 1, i + 2].forEach((n) => found.add(n));
    if (y <= WIDTH - 3 && board[i] === board[i + WIDTH] && board[i] === board[i + 2 * WIDTH]) [i, i + WIDTH, i + 2 * WIDTH].forEach((n) => found.add(n));
  }
  return found;
}

export function Match3({ onComplete, onCancel }: Props) {
  const [board, setBoard] = useState(initial);
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(5);
  const [matches, setMatches] = useState(0);

  function choose(index: number) {
    if (selected === null) { setSelected(index); return; }
    if (selected === index) { setSelected(null); return; }
    const near = Math.abs(Math.floor(index / WIDTH) - Math.floor(selected / WIDTH)) + Math.abs(index % WIDTH - selected % WIDTH) === 1;
    if (!near) { setSelected(index); return; }
    const next = [...board];
    [next[index], next[selected]] = [next[selected], next[index]];
    const found = matchedCells(next);
    const total = matches + found.size;
    for (const cell of found) next[cell] = (cell * 7 + moves * 3 + total) % cropIcons.length;
    setBoard(next);
    setSelected(null);
    setMatches(total);
    setMoves(moves - 1);
    if (moves === 1) onComplete({ completed: true, modifier: Math.max(-0.1, Math.min(0.1, -0.1 + total * 0.025)) });
  }

  return <div className="minigamePanel" role="dialog" aria-modal="true" aria-label="Agriculture match three">
    <div className="minigameHeader"><div><strong>Harvest alignment</strong><p>Swap adjacent samples. Match three or more in five moves.</p></div><button onClick={onCancel} aria-label="Close minigame">×</button></div>
    <p>Moves: {moves} · Matched samples: {matches} · Modifier stays within ±10%</p>
    <div className="matchBoard">{board.map((type, index) => <button key={index} className={selected === index ? "selected" : ""} style={{ color: cropColors[type] }} onClick={() => choose(index)} aria-label={`Sample ${index + 1}, type ${type + 1}`}>{cropIcons[type]}</button>)}</div>
  </div>;
}
