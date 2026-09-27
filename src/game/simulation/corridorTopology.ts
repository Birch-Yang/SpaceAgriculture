import { MODULE_BY_ID } from "../../data/modules.ts";
import type { Cell, GameState } from "../state/types.ts";

export const corridorCellId = (cell: Cell): string => `corridor:${cell.x},${cell.y}`;
export type CorridorNode = {
  id: string;
  length: number;
  integrity: number;
  capacity: number;
  damage: number;
};
export type CorridorTopology = {
  nodes: Map<string, CorridorNode>;
  neighbors: Map<string, Set<string>>;
  edgeNodes: Map<string, string[]>;
};

// Physical cells are shared at junctions: overlapping strokes must not create
// parallel capacity or charge the same cell twice when routing a resource.
export function corridorTopology(state: GameState): CorridorTopology {
  const nodes = new Map<string, CorridorNode>();
  const neighbors = new Map<string, Set<string>>();
  const edgeNodes = new Map<string, string[]>();
  const cells = new Map<string, Cell>();
  const moduleIds = new Set(state.modules.map(module => module.id));
  const add = (node: CorridorNode) => { nodes.set(node.id, node); neighbors.set(node.id, new Set()); };
  const link = (a: string, b: string) => {
    if (a === b || !nodes.has(a) || !nodes.has(b)) return;
    neighbors.get(a)!.add(b); neighbors.get(b)!.add(a);
  };
  for (const module of state.modules) add({ id: module.id, length: 0, integrity: 1, capacity: Infinity, damage: 0 });
  for (const edge of state.utilityEdges) {
    const ids = edge.cells.length ? edge.cells.map(corridorCellId) : [`corridor-edge:${edge.id}`];
    edgeNodes.set(edge.id, ids);
    ids.forEach((id, index) => {
      const node = { id, length: edge.length / ids.length, integrity: edge.integrity,
        capacity: edge.capacity * edge.integrity, damage: (1 - edge.integrity) / ids.length };
      const previous = nodes.get(id);
      if (previous) {
        previous.integrity = Math.min(previous.integrity, node.integrity);
        previous.capacity = Math.min(previous.capacity, node.capacity);
        previous.damage = Math.max(previous.damage, node.damage);
      } else add(node);
      if (edge.cells[index]) cells.set(id, edge.cells[index]);
    });
  }
  for (const edge of state.utilityEdges) {
    const ids = edgeNodes.get(edge.id)!;
    for (let i = 1; i < ids.length; i++) link(ids[i - 1], ids[i]);
    // Module endpoints remain explicit. Cell endpoints are connected spatially,
    // so removing another stroke cannot leave a phantom long-distance link.
    if (moduleIds.has(edge.from)) link(edge.from, ids[0]);
    if (moduleIds.has(edge.to)) link(edge.to, ids[ids.length - 1]);
  }
  for (const [id, { x, y }] of cells) {
    link(id, corridorCellId({ x: x + 1, y }));
    link(id, corridorCellId({ x, y: y + 1 }));
  }
  return { nodes, neighbors, edgeNodes };
}

export function reachableCorridorNodes(state: GameState, topology = corridorTopology(state)): Set<string> {
  const pending = state.modules.filter(module => MODULE_BY_ID.get(module.moduleId)?.category === "habitat").map(module => module.id);
  const reached = new Set(pending);
  while (pending.length) {
    const current = pending.pop()!;
    for (const id of topology.neighbors.get(current) ?? []) {
      const node = topology.nodes.get(id)!;
      if (reached.has(id) || node.integrity <= 0.15 || node.capacity <= 0) continue;
      reached.add(id); pending.push(id);
    }
  }
  return reached;
}
