export type Match3Proof = { kind: "match3"; swaps: [number, number][] };
export type RepairDirection = "up" | "down" | "left" | "right";
export type RepairProof = { kind: "repair"; directions: RepairDirection[] };
export type MinigameProof = Match3Proof | RepairProof;

const width = 6;
const colors = 5;
export const initialMatch3Board = [
  0, 1, 0, 2, 3, 4,
  1, 0, 2, 3, 4, 1,
  2, 1, 3, 4, 0, 2,
  3, 4, 2, 1, 2, 3,
  4, 3, 4, 2, 3, 4,
  0, 1, 3, 4, 1, 2,
];
export type Match3State = { board: number[]; matches: number; moves: number };
export function initialMatch3State(): Match3State { return { board: [...initialMatch3Board], matches: 0, moves: 5 }; }

function matchedCells(board: number[]): Set<number> {
  const found = new Set<number>();
  for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x;
    if (x <= width - 3 && board[i] === board[i + 1] && board[i] === board[i + 2]) [i, i + 1, i + 2].forEach((n) => found.add(n));
    if (y <= width - 3 && board[i] === board[i + width] && board[i] === board[i + 2 * width]) [i, i + width, i + 2 * width].forEach((n) => found.add(n));
  }
  return found;
}

export function advanceMatch3(state: Match3State, from: number, to: number): Match3State | null {
  if (state.moves <= 0 || !Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= 36 || to >= 36
    || Math.abs(Math.floor(from / width) - Math.floor(to / width)) + Math.abs(from % width - to % width) !== 1
    || state.board[from] === state.board[to]) return null;
  const before = matchedCells(state.board);
  const board = [...state.board];
  [board[from], board[to]] = [board[to], board[from]];
  const found = matchedCells(board);
  if (![from, to].some((cell) => found.has(cell) && !before.has(cell))) return null;
  const matches = state.matches + found.size;
  for (const cell of found) board[cell] = (cell * 7 + state.moves * 3 + matches) % colors;
  return { board, matches, moves: state.moves - 1 };
}

export function match3Modifier(matches: number): number { return Math.max(-0.1, Math.min(0.1, -0.1 + matches * 0.025)); }

export function scoreMatch3Proof(proof: Match3Proof): number | null {
  if (!Array.isArray(proof.swaps) || proof.swaps.length !== 5) return null;
  let state = initialMatch3State();
  for (const pair of proof.swaps) {
    if (!Array.isArray(pair) || pair.length !== 2) return null;
    const next = advanceMatch3(state, pair[0], pair[1]);
    if (!next) return null;
    state = next;
  }
  return match3Modifier(state.matches);
}

type Point = { x: number; y: number };
const size = 8;
const obstacles = new Set(["5,2", "5,3", "5,4", "2,6", "3,6"]);
export const repairObstacles = obstacles;
export const repairPickups: Point[] = [{ x: 4, y: 3 }, { x: 6, y: 5 }, { x: 1, y: 1 }, { x: 6, y: 1 }, { x: 1, y: 5 }];
const delta: Record<RepairDirection, Point> = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};
const pointKey = (point: Point) => `${point.x},${point.y}`;
export type RepairState = { snake: Point[]; pickupIndex: number; ticks: number; direction: RepairDirection; done: boolean };
export function initialRepairState(): RepairState {
  return { snake: [{ x: 2, y: 3 }, { x: 1, y: 3 }], pickupIndex: 0, ticks: 0, direction: "right", done: false };
}

export function advanceRepair(state: RepairState, direction: RepairDirection): RepairState | null {
  if (state.done || !Object.hasOwn(delta, direction) || state.ticks >= 65) return null;
  const previous = delta[state.direction];
  const change = delta[direction];
  if (change.x === -previous.x && change.y === -previous.y) return null;
  const head = { x: state.snake[0].x + change.x, y: state.snake[0].y + change.y };
  const pickup = repairPickups[state.pickupIndex];
  const eating = head.x === pickup.x && head.y === pickup.y;
  const body = eating ? state.snake : state.snake.slice(0, -1);
  const crashed = head.x < 0 || head.y < 0 || head.x >= size || head.y >= size || obstacles.has(pointKey(head))
    || body.some((part) => pointKey(part) === pointKey(head));
  const ticks = state.ticks + 1;
  if (crashed) return { ...state, ticks, direction, done: true };
  const pickupIndex = state.pickupIndex + (eating ? 1 : 0);
  return { snake: [head, ...body], pickupIndex, ticks, direction, done: pickupIndex >= 4 || ticks >= 65 };
}

export function repairModifier(pickups: number): number { return Math.max(-0.1, Math.min(0.1, -0.1 + pickups * 0.05)); }

export function scoreRepairProof(proof: RepairProof): number | null {
  if (!Array.isArray(proof.directions) || proof.directions.length < 1 || proof.directions.length > 65) return null;
  let state = initialRepairState();
  for (const direction of proof.directions) {
    const next = advanceRepair(state, direction);
    if (!next) return null;
    state = next;
  }
  return state.done ? repairModifier(state.pickupIndex) : null;
}

export function scoreMinigameProof(value: unknown, expected: MinigameProof["kind"]): number | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const proof = value as Partial<MinigameProof>;
  if (proof.kind !== expected) return null;
  return expected === "match3" ? scoreMatch3Proof(proof as Match3Proof) : scoreRepairProof(proof as RepairProof);
}
