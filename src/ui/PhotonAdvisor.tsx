"use client";

import { useState, type FormEvent } from "react";
import type { GameState } from "../game/state/types.ts";
import styles from "./PhotonAdvisor.module.css";

type ChatMessage = { sender: "you" | "photon"; text: string };
const REQUESTS_PER_TURN = 2;

export function PhotonAdvisor({ state }: { state: GameState }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [used, setUsed] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const offline = state.activeHazard?.type === "communications";
  const exhausted = used >= REQUESTS_PER_TURN;

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const transmission = question.trim();
    if (!transmission || pending || exhausted || offline) return;
    setQuestion("");
    setPending(true);
    setError("");
    setUsed((count) => count + 1);
    setMessages((history) => [...history, { sender: "you", text: transmission }]);
    try {
      const response = await fetch("/api/photon/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, question: transmission }),
      });
      const payload = await response.json().catch(() => ({})) as { advice?: unknown; error?: unknown; used?: unknown };
      if (!response.ok || typeof payload.advice !== "string") throw new Error(typeof payload.error === "string" ? payload.error : "Mission Control did not receive your transmission.");
      if (typeof payload.used === "number") setUsed(payload.used);
      setMessages((history) => [...history, { sender: "photon", text: payload.advice as string }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The Earth–Moon link is unstable. Try again next turn.");
    } finally {
      setPending(false);
    }
  }

  return <section className={styles.panel} aria-labelledby="photon-heading">
    <header className={styles.header}><div><p className={styles.eyebrow}>EARTH–MOON RELAY · TURN {state.turn}</p><h2 id="photon-heading">Photon / Mission Control</h2></div><span className={offline ? styles.offline : styles.online}>{offline ? "LINK LOST" : "CONNECTED"}</span></header>
    <p className={styles.note}>Remote advisor · limited telemetry · advice only</p>
    <div className={styles.log} role="log" aria-live="polite" aria-label="Photon conversation">
      {messages.length === 0 && <p className={styles.empty}>{offline ? "Communications are down. Consult your local instruments." : "Ask Earth for a hint about your outpost. Photon cannot operate your systems."}</p>}
      {messages.map((message, index) => <article className={message.sender === "you" ? styles.player : styles.agent} key={`${index}-${message.sender}`}><small>{message.sender === "you" ? "OUTPOST" : "PHOTON · EARTH"}</small><p>{message.text}</p></article>)}
      {pending && <p className={styles.typing} role="status">Signal delay… Photon is reviewing limited telemetry.</p>}
    </div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {offline && <p className={styles.warning} role="alert">MISSION CONTROL LINK LOST — use local system readings until communications recover.</p>}
    <form className={styles.form} onSubmit={ask}>
      <label className={styles.srOnly} htmlFor="photon-question">Ask Photon for a hint</label>
      <textarea id="photon-question" maxLength={500} rows={2} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What should I pay attention to?" disabled={offline || exhausted || pending || state.phase !== "operation"} />
      <div className={styles.controls}><span>{REQUESTS_PER_TURN - used} transmission{REQUESTS_PER_TURN - used === 1 ? "" : "s"} remaining this turn</span><button type="submit" disabled={offline || exhausted || pending || !question.trim() || state.phase !== "operation"}>{pending ? "SENDING…" : "ASK PHOTON"}</button></div>
    </form>
  </section>;
}
