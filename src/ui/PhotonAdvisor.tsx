"use client";

import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { GameState } from "../game/state/types.ts";
import { communicationsAvailable } from "../data/systems.ts";
import styles from "./PhotonAdvisor.module.css";

type RelayStatus = { history: string[]; turn: number; outage: boolean; used: number };
type Question = { id: string; text: string; before: number };

export function PhotonAdvisor({ state, token, connection, detail }: {
  state: GameState; token: string | null; connection: "online" | "offline" | "unavailable"; detail: string;
}) {
  const [question, setQuestion] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [relay, setRelay] = useState<RelayStatus>({ history: [], turn: 0, outage: true, used: 0 });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [syncFailed, setSyncFailed] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(true);
  const turn = (state.level - 1) * 10 + Math.min(state.turn, 10);
  const offline = !communicationsAvailable(state);
  const used = relay.turn === turn ? relay.used : 0;
  const ready = !!token && !syncFailed && !offline && state.phase === "operation" && relay.turn === turn && !relay.outage;

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!token) return;
    const response = await fetch("/api/mission-control/status", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId: state.runId, token }), signal: signal ?? AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Earth relay status could not be read.");
    const data = await response.json() as RelayStatus;
    if (mounted.current && !signal?.aborted) { setRelay(data); setSyncFailed(false); }
  }, [state.runId, token]);

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try { await refresh(AbortSignal.any([controller.signal, AbortSignal.timeout(10000)])); }
      catch { if (!controller.signal.aborted) setSyncFailed(true); }
      if (!controller.signal.aborted) timer = setTimeout(poll, 5000);
    };
    void poll();
    return () => { mounted.current = false; controller.abort(); clearTimeout(timer); };
  }, [refresh, turn, state.phase]);

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const transmission = question.trim();
    if (!ready || !transmission || busy.current || used >= 2) return;
    busy.current = true; setPending(true); setError("");
    setQuestion("");
    setQuestions((history) => [...history, { id: crypto.randomUUID(), text: transmission, before: relay.history.length }]);
    try {
      const response = await fetch("/api/photon/advice", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: state.runId, token, turn, question: transmission }), signal: AbortSignal.timeout(30000),
      });
      const payload = await response.json() as { advice?: string; error?: string; used?: number; historySaved?: boolean };
      if (!mounted.current) return;
      if (typeof payload.used === "number") setRelay((current) => current.turn === turn ? { ...current, used: payload.used! } : current);
      if (!response.ok) throw new Error(payload.error ?? "Photon could not confirm your transmission.");
      if (payload.historySaved === false && payload.advice) setError(`Photon accepted this reply, but it could not be saved: ${payload.advice}`);
      await refresh();
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : "Earth relay is temporarily unavailable.");
    } finally { busy.current = false; if (mounted.current) setPending(false); }
  }

  const label = state.phase !== "operation" ? "STANDBY" : offline ? "LINK LOST" : ready ? "RELAY LINKED" : "RELAY UNAVAILABLE";
  return <section className={styles.panel} aria-labelledby="photon-heading">
    <header className={styles.header}><div><p className={styles.eyebrow}>EARTH–MOON RELAY · LEVEL {state.level} / TURN {Math.min(state.turn, 10)}</p><h2 id="photon-heading">Photon / Mission Control</h2></div><span className={ready ? styles.online : styles.offline}>{label}</span></header>
    <p className={styles.note}>Limited telemetry · inspection hints · shared allowance for the game and Messages</p>
    {detail && <p className={styles.note} role="status">{detail}</p>}
    <div className={styles.log} role="log" aria-live="polite" aria-label="Photon conversation">
      {!relay.history.length && !questions.length && <p className={styles.empty}>Begin operations to ask Earth about water, power, crops, or another outpost system.</p>}
      {Array.from({ length: relay.history.length + 1 }, (_, index) => <Fragment key={index}>
        {questions.filter((item) => item.before === index).map((item) => <article className={styles.player} key={item.id}><small>OUTPOST</small><p>{item.text}</p></article>)}
        {relay.history[index] && <article className={styles.agent}><small>PHOTON · EARTH</small><p>{relay.history[index]}</p></article>}
      </Fragment>)}
      {pending && <p className={styles.typing} role="status">Transmitting through Photon…</p>}
    </div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {offline && <p className={styles.warning} role="alert">MISSION CONTROL LINK LOST — use local system readings until communications recover.</p>}
    {!token && <p className={styles.note}>The relay has not been linked. Confirm that the address entered at launch is registered with your Photon project.</p>}
    {token && (syncFailed || connection === "unavailable") && <p className={styles.note}>Earth telemetry or messaging is temporarily unavailable. The relay will check again shortly.</p>}
    <form className={styles.form} onSubmit={ask}>
      <label className={styles.srOnly} htmlFor="photon-question">Ask Photon for a hint</label>
      <textarea id="photon-question" maxLength={500} rows={2} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What should I inspect about water?" disabled={!ready || used >= 2 || pending} />
      <div className={styles.controls}><span>{ready ? `${Math.max(0, 2 - used)} of 2 questions left this turn` : "Waiting for the Earth relay"}</span><button type="submit" disabled={!ready || used >= 2 || pending || !question.trim()}>{pending ? "SENDING…" : "ASK PHOTON"}</button></div>
    </form>
  </section>;
}
