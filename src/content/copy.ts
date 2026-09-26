import type { ModuleCategory, HazardType } from '../game/state/types';

export const tutorialHints = {
  connection: 'Connect this greenhouse to the utility corridor.',
  distance: 'Longer utility routes lose efficiency.',
  food: 'Food shortages reduce next-turn AP.',
  lock: 'Once the mission begins, the base layout is locked.',
  repair: 'Repair damaged infrastructure before the next turn.',
  production: 'Targets count everything produced, not food left in storage.',
  crisis: 'You have one turn to recover critical systems.',
  allocation: 'Small utility reallocations cost AP and apply immediately.',
} as const;
export type TutorialHintId = keyof typeof tutorialHints;
export const moduleDescriptions: Record<ModuleCategory, string> = {
  habitat: 'The heart of your outpost. Keep its life-support supply reliable.',
  greenhouse: 'Grow crops in a controlled environment. Balance water, light, and temperature.',
  livestock: 'Produce meat while balancing feed, water, and life-support demand.',
  oxygen: 'Support breathable air through the integrated utility network.',
  water: 'Recycle and store water for the systems that keep your farm alive.',
  solar: 'Supply power to your outpost. Plan for periods of reduced generation.',
  battery: 'Reserve power for interruptions in normal supply.',
  utility: 'Share capability between thermal control, backup power, and communications.',
  communications: 'Keep the link to Mission Control available.',
  shelter: 'Invest in protection alongside agricultural capacity.',
  storage: 'Give the outpost room to hold essential reserves.',
  recreation: 'Make room for life beyond the next harvest.',
};
export const hazardDescriptions: Record<HazardType, { title: string; description: string; inspect: string }> = {
  temperature: { title: 'Thermal instability', description: 'External conditions can strain thermal control.', inspect: 'Inspect temperature and thermal allocation.' },
  radiation: { title: 'Solar radiation', description: 'Particle exposure puts the outpost under pressure.', inspect: 'Review shelter protection and damaged systems.' },
  micrometeoroid: { title: 'Impact damage', description: 'Small, fast particles can damage exposed infrastructure.', inspect: 'Inspect module and corridor integrity.' },
  communications: { title: 'Communication outage', description: 'Mission Control is unavailable while the link is down.', inspect: 'Review communications backup and local system readings.' },
  power: { title: 'Power shortage', description: 'Available supply may not meet system demand.', inspect: 'Inspect delivery paths and backup power.' },
};
export const agricultureDescriptions = {
  lettuce: 'Quick output; sensitive to growing conditions.', potato: 'A steady, medium-cycle food crop.', wheat: 'A slower crop with demanding light requirements.',
  chicken: 'A smaller, faster production cycle.', pig: 'Moderate space, feed, and water demand.', cow: 'High output with substantial space and water demand.',
};
export const scientificFraming = 'Within this simulation, agriculture is a simplified systems-engineering challenge. Large-animal lunar livestock is speculative; these game outcomes are not validated lunar farming predictions.';
