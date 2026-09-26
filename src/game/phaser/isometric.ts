// Projection adapted from the MIT-licensed pogicity-demo isometric grid.
// See THIRD_PARTY_LICENSE.txt in this directory for attribution.
import type { Cell, Rotation } from "../state/types.ts";

export const VIEW = { width: 960, height: 620, tileWidth: 48, tileHeight: 24, originX: 480, originY: 112 } as const;

export function gridToScreen(x: number, y: number): { x: number; y: number } {
  return {
    x: VIEW.originX + (x - y) * VIEW.tileWidth / 2,
    y: VIEW.originY + (x + y) * VIEW.tileHeight / 2,
  };
}

export function screenToGrid(x: number, y: number): Cell {
  const sx = x - VIEW.originX;
  const sy = y - VIEW.originY;
  return {
    x: Math.round(sx / VIEW.tileWidth + sy / VIEW.tileHeight),
    y: Math.round(sy / VIEW.tileHeight - sx / VIEW.tileWidth),
  };
}

export function rotatedFootprint(footprint: { w: number; h: number }, rotation: Rotation) {
  return rotation === 90 || rotation === 270
    ? { w: footprint.h, h: footprint.w }
    : footprint;
}
