import type { MinigameProof } from "../minigames/proof.ts";

export type GameMode = "challenge" | "progressive";
export type GamePhase = "design" | "operation" | "intermission" | "complete";
export type ResourceKey = "power" | "water" | "oxygen" | "food";
export type ResourceState = Record<ResourceKey, number> & { temperature: number };
export type Rotation = 0 | 90 | 180 | 270;
export type Cell = { x: number; y: number };

export type ModuleCategory =
  | "habitat" | "greenhouse" | "livestock" | "oxygen" | "water"
  | "solar" | "battery" | "utility" | "communications" | "shelter"
  | "storage" | "recreation";

export type ModuleFlowProfile = {
  powerDemand?: number;
  powerSupply?: number;
  waterDemand?: number;
  waterSupply?: number;
  oxygenDemand?: number;
  oxygenSupply?: number;
  storage?: Partial<Record<ResourceKey, number>>;
};

export type ModuleDefinition = {
  id: string;
  label: string;
  category: ModuleCategory;
  cost: number;
  footprint: { w: number; h: number };
  flow: ModuleFlowProfile;
  heatOutput: number;
  baseYield: number;
  capacity: number;
  resilience: number;
};

export type UtilityAllocation = { thermal: number; backupPower: number; commsBackup: number };
export type PlacedModule = {
  id: string;
  moduleId: string;
  x: number;
  y: number;
  rotation: Rotation;
  integrity: number;
  allocation?: UtilityAllocation;
};
export type UtilityEdge = {
  id: string;
  from: string;
  to: string;
  length: number;
  capacity: number;
  integrity: number;
  cells: Cell[];
};
export type CropKind = import('../../data/cropCatalog.ts').CropId;
export type AnimalKind = "chicken" | "pig" | "cow";
export type Setting = "low" | "medium" | "high";
export type CropPlotState = {
  moduleId: string;
  slotIndex: number;
  crop: CropKind | null;
  growth: number;
  ready: boolean;
  wateredThisCycle: boolean;
  water: Setting;
  light: Setting;
  temperature: Setting;
};
export type LivestockState = {
  moduleId: string;
  slotIndex: number;
  animal: AnimalKind | null;
  growth: number;
  feed: "rationed" | "normal" | "high";
  fedThisCycle: boolean;
  feedMinigameModifier: number;
};
export type HazardType = "temperature" | "radiation" | "micrometeoroid" | "communications" | "power";
export type HazardInstance = { id: string; type: HazardType; severity: number; turn: number };
export type ForecastState = { solar: string; thermal: string; impact: string; systems?: string; window?: string };
export type CrisisState = { trigger: string; recoveryTurn: number };
export type GameEvent = { turn: number; type: string; message: string; amount?: number };
export type TurnSummary = {
  turn: number;
  hazard?: HazardInstance;
  resourceDelta: ResourceState;
  cropYield: number;
  meatYield: number;
  warnings: string[];
};
export type TurnRecord = {
  level: 1 | 2 | 3;
  turn: number;
  resources: ResourceState;
  resourceDelta: ResourceState;
  cropYield: number;
  meatYield: number;
  crisis: boolean;
  hazard?: HazardInstance;
};

export type GameState = {
  runId: string;
  nickname: string;
  mode: GameMode;
  rulesetVersion: 1 | 2;
  phase: GamePhase;
  level: 1 | 2 | 3;
  turn: number;
  budget: number;
  ap: number;
  resources: ResourceState;
  production: { cropCumulative: number; meatCumulative: number; researchCumulative?: number };
  modules: PlacedModule[];
  utilityEdges: UtilityEdge[];
  crops: CropPlotState[];
  livestock: LivestockState[];
  forecast: ForecastState;
  activeHazard?: HazardInstance;
  crisis?: CrisisState;
  history: GameEvent[];
  turnRecords: TurnRecord[];
  lastTurn?: TurnSummary;
  passed?: boolean;
  failureReason?: string;
  nextId: number;
};

export type PlayerAction =
  | { type: "PLACE_MODULE"; moduleId: string; x: number; y: number; rotation: Rotation }
  | { type: "REMOVE_MODULE"; placedModuleId: string }
  | { type: "MOVE_MODULE"; placedModuleId: string; x: number; y: number }
  | { type: "PLACE_CORRIDOR"; cells: Cell[] }
  | { type: "REMOVE_CORRIDOR"; edgeId: string }
  | { type: "SET_CROP_PARAMS"; moduleId: string; slotIndex?: number; water: Setting; light: Setting; temperature: Setting }
  | { type: "SET_LIVESTOCK_PARAMS"; moduleId: string; slotIndex?: number; feed: "rationed" | "normal" | "high" }
  | { type: "REALLOCATE_UTILITY"; moduleId: string; allocation: UtilityAllocation }
  | { type: "REPAIR"; targetId: string; minigameModifier?: number; minigameProof?: MinigameProof }
  | { type: "PLANT_CROP"; moduleId: string; slotIndex?: number; crop: CropKind }
  | { type: "HARVEST_CROP"; moduleId: string; slotIndex?: number; minigameModifier?: number; minigameProof?: MinigameProof }
  | { type: "SET_ANIMAL"; moduleId: string; slotIndex?: number; animal: AnimalKind }
  | { type: "WATER_PLOT"; moduleId: string; slotIndex: number }
  | { type: "FEED_STALL"; moduleId: string; slotIndex: number; minigameModifier?: number; minigameProof?: MinigameProof }
  | { type: "END_TURN" };

export type TurnResult = { state: GameState; summary: TurnSummary; acceptedActions: PlayerAction[]; rejectedActions: string[] };
