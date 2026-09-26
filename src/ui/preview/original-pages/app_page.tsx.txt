import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <p className="eyebrow">Lunar south pole · mission design</p>
      <h1>agronaut</h1>
      <p>Growing food on the Moon means balancing production against power, water, oxygen, heat, and resilience.</p>
      <div className="grid">
        <section className="card"><h2>Challenge</h2><p>Build a base, then survive ten high-pressure turns.</p></section>
        <section className="card"><h2>Progressive</h2><p>Grow one outpost across three ten-turn levels.</p></section>
      </div>
      <p><Link href="/game">Open game</Link> · <Link href="/leaderboard">Leaderboards</Link> · <Link href="/analytics">Player patterns</Link></p>
    </main>
  );
}
