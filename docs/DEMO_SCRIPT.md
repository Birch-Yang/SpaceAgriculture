# Current demo: six-crop supply model

Start with `npm run demo` and open http://127.0.0.1:4180/supply. Run the matching Python script with `npm run demo:script` (or `python3 scripts/supply_simulation.py --json` for full results).

1. Choose **Reference base**. Explain the normal capacity: 24/16 power, 12/7 water, and 4/4 thermal coverage.
2. Click **Choose crop** on a greenhouse. Show all six crops and their growth cycles, supply demand, harvest, and research output.
3. Advance one turn and plan the next crop. The current batch finishes before the queued crop starts; accumulated harvest is preserved. Reset to Reference base before the baseline run.
4. Advance all 12 turns. Turn 4 reduces sunlight, turn 7 raises thermal power demand, and turn 10 reduces solar output. The reference finishes with **200 harvest points / 180 target**, matching Python.
5. Choose **Six-crop showcase** to show Arabidopsis producing research samples separately from food.
6. Try **Power shortage**, **Water shortage**, and **Thermal overload** to see lower-priority greenhouses slow or stop.

This demo uses the uploaded lunar art and renderer, an English interface, a shared six-crop catalog, crop planning, batteries, and scripted hazards. The separate Mission page retains its network simulation. Supply Lab does not yet implement construction budget, AP, oxygen inventory, or emergency rescue.

## Historical full-mission rehearsal

The following describes the broader mission presentation, not the executable supply script above.

# Four-minute integrated mission demo

This is a rehearsal script, not an implemented fast-forward or seeded hazard feature. Developer A/B must provide a stable completed run and an authorized demo hazard path. The HTML preview is presentation-only and clearly labeled sample data.

| Time | Show | Say |
| --- | --- | --- |
| 0:00–0:20 | Landing, nickname, Challenge | “Growing food on the Moon isn't only an agriculture problem. Every greenhouse competes with the systems keeping it alive.” |
| 0:20–1:10 | Empty map → greenhouse, livestock, utility, shelter, corridors | “We spend one construction budget on both production and resilience. These core module stats make the trade-offs visible.” |
| 1:10–1:40 | Start operation; HUD and production targets | “The layout is now locked. We manage settings and repairs across ten turns. The targets count cumulative production.” |
| 1:40–2:10 | A supplied demo hazard, repair interaction | “A critical failure grants one recovery turn. Repair and utility allocation compete for action points.” |
| 2:10–2:35 | Mission Control, then link loss | “Mission Control sees a partial summary and offers uncertain advice. When communications fail, we rely on local readings.” |
| 2:35–3:10 | Real completed demo run | “Passing requires survival and both production targets. These are the rule and strategy score components.” |
| 3:10–3:40 | Report with citations | “Your strategy suggests a hypothesis within this simulation. The sources explain real research; they do not validate our balancing constants. Lunar livestock is speculative.” |
| 3:40–4:00 | Leaderboard and analytics | “These are observations among completed player runs, not proof of an optimal lunar farm.” |

Close: “A single run is a game. Many runs can become a design-space exploration dataset.”

## Recovery paths

- Photon unavailable: show retained history and the temporary-unavailability state; continue the run. Distinguish service failure from in-game communications loss.
- LLM unavailable: present the template report and backend-provided fallback score, labeled honestly.
- Database unavailable: keep the result local in the host flow and expose its retry action. Never invent ranked records.
- No aggregate data: show the empty analytics state; do not silently substitute sample observations.
- Sprites unavailable: use PixelAsset fallback; engine rendering fallback remains Developer A's responsibility.

## Editorial QA

Review fixtures in `src/content/prompt-qa.ts` with Developer B. Check that advice is concise, partially informed, and non-omniscient; no coordinates, hidden forecasts, or guaranteed outcomes. Reports should use “your strategy suggests,” “within this simulation,” and “among player runs.” Reject “this proves,” “NASA should use your design,” and optimal-lunar-farm claims. Verify every citation ID against `curatedSources`.

Bootstrap prompt review: Photon remains adapter-only, so live output could not be tested. The report prompt already asks for cautious language, registry-only citations, and speculative livestock framing; it does not explicitly require all three editorial phrases. Developer B should enforce those in its prompt/validation as appropriate. UI context includes the required language without rewriting generated findings.

## Cozy art preview

Use `/assets/previews/ui-v6.html` for the new visual direction; original and v1–v5 remain accessible. Show Crops for four-stage art and Arabidopsis sample readiness, Assets for building families and condition states, and the collapsed Science & Assumptions drawer for optional source context. Six-crop controls are a UI adapter only until Developer B supplies compatible state/actions. Do not imply that the revised roster is already simulated.
