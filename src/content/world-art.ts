/** Pixel-v2 source rectangles in original 1774×887 sheet. Art metadata only. */
export const buildingFrames: Record<string, readonly [number, number, number, number]> = {
  habitat: [0, 0, 284, 300],
  'greenhouse-compact': [284, 0, 289, 300],
  'greenhouse-standard': [573, 0, 307, 300],
  'greenhouse-industrial': [880, 0, 337, 310],
  'livestock-compact': [1217, 0, 270, 310],
  'livestock-standard': [1487, 0, 287, 310],
  'livestock-industrial': [0, 310, 358, 269],
  oxygen: [358, 310, 290, 269], water: [648, 310, 286, 269],
  solar: [934, 310, 297, 269], battery: [1231, 310, 269, 269],
  utility: [1500, 310, 274, 269],
  communications: [0, 579, 271, 308], shelter: [271, 579, 324, 308],
  storage: [595, 579, 288, 308], recreation: [883, 579, 298, 308],
  corridor: [1181, 579, 297, 308], junction: [1478, 579, 296, 308],
};
export function buildingFrame(category: string, moduleId: string): string {
  return (category === 'greenhouse' || category === 'livestock') && buildingFrames[moduleId] ? moduleId : category;
}
