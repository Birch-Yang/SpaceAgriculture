"use client";

import { useMemo, useState } from "react";

const SIZE = 6;
const COLORS = ["#67c79a", "#efb46d", "#88b8e7", "#d9879c"];
type Props = { onComplete: (modifier: number) => void };

function randomBoard(): number[] {
  return Array.from({ length: SIZE * SIZE }, () => Math.floor(Math.random() * COLORS.length));
}

function matchedCells(board: number[]): Set<number> {
  const result = new Set<number>();
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const at = y * SIZE + x;
    if (x <= SIZE - 3 && board[at] === board[at + 1] && board[at] === board[at + 2]) {
      let end = x + 3;
      while (end < SIZE && board[y * SIZE + end] === board[at]) end++;
      for (let i = x; i < end; i++) result.add(y * SIZE + i);
    }
    if (y <= SIZE - 3 && board[at] === board[at + SIZE] && board[at] === board[at + SIZE * 2]) {
      let end = y + 3;
      while (end < SIZE && board[end * SIZE + x] === board[at]) end++;
      for (let i = y; i < end; i++) result.add(i * SIZE + x);
    }
  }
  return result;
}

export function Match3({ onComplete }: Props) {
  const [board, setBoard] = useState(randomBoard);
  const [selected, setSelected] = useState<number>();
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState("Swap neighboring tiles to line up three crops.");
  const done = moves >= 5;
  const boardStyle = useMemo(() => ({ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }), []);

  function choose(index: number): void {
    if (done) return;
    if (selected === undefined) { setSelected(index); return; }
    const adjacent = Math.abs(Math.floor(index / SIZE) - Math.floor(selected / SIZE)) + Math.abs(index % SIZE - selected % SIZE) === 1;
    if (!adjacent) { setSelected(index); return; }
    const swapped = [...board];
    [swapped[index], swapped[selected]] = [swapped[selected], swapped[index]];
    const matches = matchedCells(swapped);
    setMoves((value) => value + 1);
    setSelected(undefined);
    if (matches.size === 0) { setMessage("No match that time. Try another pair."); return; }
    setScore((value) => value + matches.size);
    for (const at of matches) swapped[at] = Math.floor(Math.random() * COLORS.length);
    setBoard(swapped);
    setMessage(`${matches.size} crops aligned. Nice work.`);
  }

  function finish(): void {
    const modifier = Math.max(-0.1, Math.min(0.1, (score - 8) / 100));
    onComplete(Number(modifier.toFixed(2)));
  }

  return <section className="mini-game" aria-label="Crop alignment minigame">
    <div className="mini-game-heading"><div><p className="eyebrow">GREENHOUSE TASK</p><h3>Crop alignment</h3></div><span>{Math.min(moves, 5)} / 5 moves</span></div>
    <p>{message}</p>
    <div className="match-board" style={boardStyle}>
      {board.map((crop, index) => <button key={index} className={`match-tile ${selected === index ? "is-selected" : ""}`} onClick={() => choose(index)} aria-label={`Crop tile ${index + 1}`} style={{ "--crop-color": COLORS[crop] } as React.CSSProperties}><span /></button>)}
    </div>
    <div className="mini-game-actions"><span>Aligned: {score}</span><button className="button button-primary" onClick={finish} disabled={!done}>Return modifier</button></div>
    {done && <small>Activity result is capped between −10% and +10%.</small>}
  </section>;
}
