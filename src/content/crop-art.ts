// Art/content IDs only: intentionally separate from Developer B's CropKind.
export const cropArt = [
  { id: 'lettuce', label: 'Lettuce', subtitle: 'Leafy greens', description: 'Layered leaves form a compact green rosette.', readyLabel: 'Harvest-ready' },
  { id: 'radish', label: 'Radish', subtitle: 'Root crop', description: 'A bright red bulb with a tiny pale root and lively leaves.', readyLabel: 'Harvest-ready' },
  { id: 'chili-pepper', label: 'Chili Pepper', subtitle: 'Fruiting crop', description: 'Bushy foliage carries hanging peppers that turn vivid red.', readyLabel: 'Harvest-ready' },
  { id: 'potato', label: 'Potato', subtitle: 'Tuber crop', description: 'Rounded leafy stems above golden-brown tubers, revealed in the harvest cutaway.', readyLabel: 'Harvest-ready' },
  { id: 'soybean', label: 'Soybean', subtitle: 'Legume', description: 'Upright stems carry broad leaves and chunky green pods.', readyLabel: 'Harvest-ready' },
  { id: 'arabidopsis', label: 'Arabidopsis', subtitle: 'Research plant', description: 'A delicate rosette, slender stems, and tiny white flowers mark a research sample.', readyLabel: 'Sample-ready' },
] as const;
export type CropArtId = typeof cropArt[number]['id'];
export type CropArtStage = 'planted' | 'seedling' | 'growing' | 'ready';
export const cropArtStages: readonly CropArtStage[] = ['planted', 'seedling', 'growing', 'ready'];
