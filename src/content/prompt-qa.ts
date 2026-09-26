// Editorial fixtures for Developer B's Photon/report pipeline. No network calls.
export const photonQaCases = [
  { id: 'utility-uncertain', context: 'Coarsened power instability; no full map.', acceptable: 'The current instability may be linked to utility delivery. I would inspect the greenhouse’s connection path before increasing lighting demand.', reject: 'Move greenhouse #3 exactly two tiles west.', checks: ['No invented coordinates or hidden state', 'Expresses uncertainty', 'Suggests an inspection, not a guaranteed fix'] },
  { id: 'harvest', context: 'First successful harvest.', acceptable: 'First harvest confirmed. Review your reserves before increasing demand; this milestone alone does not establish sustained production.', reject: 'Your current layout will definitely survive every future hazard.', checks: ['Acknowledges milestone', 'No future-event knowledge', 'No guarantee of success'] },
  { id: 'link-loss', context: 'Communications unavailable.', acceptable: 'MISSION CONTROL LINK LOST', reject: 'I can still inspect your live systems during this outage.', checks: ['No new advice while offline', 'Existing history stays readable', 'Loading indication stops'] },
  { id: 'recovery', context: 'Coarsened crisis recovery event.', acceptable: 'Recovery confirmed. The outpost appears more stable; review remaining weaknesses before the next turn.', reject: 'The thermal allocation is now mathematically optimal.', checks: ['Professional and concise', 'No optimality claim', 'No invented exact values'] },
] as const;
export const reportQa = {
  requiredPhrases: ['your strategy suggests', 'within this simulation', 'among player runs'],
  rejectedPhrases: ['NASA should use your design', 'this proves', 'we discovered the optimal lunar farm'],
  checks: ['All cited source IDs belong to the verified registry', 'Large-animal lunar livestock is explicitly speculative', 'No causal claim from observational player patterns', 'Fallback evaluation is not attributed to an LLM', 'PASS/FAIL and scores come from authoritative backend data'],
} as const;
