"use client";

import { useState } from "react";
import { advanceMatch3, initialMatch3State, match3Modifier, type MinigameProof } from "../proof.ts";

export type MinigameResult = { completed: boolean; modifier: number; proof?: MinigameProof };
type Props = { onComplete: (result: MinigameResult) => void; onCancel: () => void };
const cropIcons = ["◉", "◆", "●", "✦", "▲"];
const cropColors = ["#91d990", "#e5bb76", "#d6a2d9", "#8bd5df", "#e8df93"];
export function Match3({ onComplete, onCancel }: Props) {
  const [game, setGame] = useState(initialMatch3State);
  const [swaps, setSwaps] = useState<[number, number][]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [notice, setNotice] = useState("");

  function choose(index: number) {
    if (selected === null) { setSelected(index); setNotice(""); return; }
    if (selected === index) { setSelected(null); setNotice(""); return; }
    const near = Math.abs(Math.floor(index / 6) - Math.floor(selected / 6)) + Math.abs(index % 6 - selected % 6) === 1;
    if (!near) { setSelected(index); setNotice(""); return; }
    const next = advanceMatch3(game, selected, index);
    if (!next) {
      setNotice("No match formed. Choose another adjacent sample.");
      return;
    }
    const nextSwaps: [number, number][] = [...swaps, [selected, index]];
    setSwaps(nextSwaps);
    setGame(next);
    setSelected(null);
    setNotice("");
    if (next.moves === 0) onComplete({ completed: true, modifier: match3Modifier(next.matches), proof: { kind: "match3", swaps: nextSwaps } });
  }

  return <div className="minigamePanel" role="dialog" aria-modal="true" aria-label="Agriculture match three">
    <div className="minigameHeader"><div><strong>Harvest alignment</strong><p>Swap adjacent samples. Match three or more in five moves.</p></div><button onClick={onCancel} aria-label="Close minigame">×</button></div>
    <p>Moves: {game.moves} · Matched samples: {game.matches} · Modifier stays within ±10%</p>
    {notice && <p role="status">{notice}</p>}
    <div className="matchBoard">{game.board.map((type, index) => <button key={index} className={selected === index ? "selected" : ""} style={{ color: cropColors[type] }} onClick={() => choose(index)} aria-label={`Sample ${index + 1}, type ${type + 1}`}>{cropIcons[type]}</button>)}</div>
  </div>;
}
