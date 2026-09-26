import * as Phaser from "phaser";
import { MODULE_BY_ID } from "../../data/modules.ts";
import { MAP_SIZE } from "../state/reducer.ts";
import type { Cell, GameState, PlayerAction, Rotation } from "../state/types.ts";
import { footprint, getDisconnectedModuleIds, getPlacementPreview, hasCorridorAt, ISO_TILE_HEIGHT, ISO_TILE_WIDTH, occupiedCells, renderUtilityNetwork } from "./adapters.ts";

const MODULE_COLORS: Record<string, number> = {
  habitat: 0x9cb7bf, greenhouse: 0x72ad85, livestock: 0xc59767, oxygen: 0x4a9ea1,
  water: 0x5489a6, solar: 0x3a6283, battery: 0x777f95, utility: 0xa98772,
  communications: 0xbba96d, shelter: 0x77838a, storage: 0x8b8272, recreation: 0x9b789a,
};
const FLOW_COLORS = { normal: 0x6d9b9b, active: 0x81f6d1, bottleneck: 0xf2c46e, damaged: 0xf07064, disconnected: 0x7d8580 } as const;

export type SceneTool = { moduleId?: string; corridor?: boolean; remove?: boolean };

export class GameScene extends Phaser.Scene {
  private state: GameState;
  private emitAction: (action: PlayerAction) => void;
  private onSelection: (moduleId?: string) => void;
  private tool: SceneTool = {};
  private rotation: Rotation = 0;
  private selectedId?: string;
  private hoveredCell?: Cell;
  private corridorStart?: string;
  private corridorCells: Cell[] = [];
  private preview?: Phaser.GameObjects.Graphics;
  private cursorLabel?: Phaser.GameObjects.Text;

  constructor(state: GameState, emitAction: (action: PlayerAction) => void, onSelection: (moduleId?: string) => void) {
    super({ key: "LunarBase" });
    this.state = state;
    this.emitAction = emitAction;
    this.onSelection = onSelection;
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#151d24");
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => this.movePointer(pointer));
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => this.click(pointer));
    this.scale.on("resize", () => this.paint());
    this.paint();
  }

  setState(state: GameState): void {
    this.state = state;
    if (state.phase !== "design" && state.phase !== "intermission") this.tool = {};
    if (this.selectedId && !state.modules.some((module) => module.id === this.selectedId)) {
      this.selectedId = undefined;
      this.onSelection(undefined);
    }
    this.paint();
  }

  setTool(tool: SceneTool): void {
    this.tool = tool;
    this.rotation = 0;
    this.corridorStart = undefined;
    this.corridorCells = [];
    this.paintPreview();
  }

  rotate(): Rotation {
    this.rotation = ((this.rotation + 90) % 360) as Rotation;
    this.paintPreview();
    return this.rotation;
  }

  getRotation(): Rotation { return this.rotation; }
  getSelectedId(): string | undefined { return this.selectedId; }

  removeSelected(): void {
    if (!this.selectedId) return;
    this.emitAction({ type: "REMOVE_MODULE", placedModuleId: this.selectedId });
    this.selectedId = undefined;
    this.onSelection(undefined);
  }

  private boardOriginX(): number { return this.scale.width / 2; }
  private boardOriginY(): number { return (this.scale.height - MAP_SIZE.height * ISO_TILE_HEIGHT) / 2 + ISO_TILE_HEIGHT / 2; }
  private toScreen(x: number, y: number): { x: number; y: number } {
    return { x: this.boardOriginX() + (x - y) * ISO_TILE_WIDTH / 2, y: this.boardOriginY() + (x + y) * ISO_TILE_HEIGHT / 2 };
  }

  private toCell(screenX: number, screenY: number): Cell {
    const u = (screenX - this.boardOriginX()) / (ISO_TILE_WIDTH / 2);
    const v = (screenY - this.boardOriginY()) / (ISO_TILE_HEIGHT / 2);
    return { x: Math.round((u + v) / 2), y: Math.round((v - u) / 2) };
  }

  private polygon(graphics: Phaser.GameObjects.Graphics, points: Array<{ x: number; y: number }>, fill: number, stroke?: number, alpha = 1): void {
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) graphics.lineTo(point.x, point.y);
    graphics.closePath();
    graphics.fillStyle(fill, alpha);
    graphics.fillPath();
    if (stroke !== undefined) {
      graphics.lineStyle(1.5, stroke, alpha);
      graphics.strokePath();
    }
  }

  private cellDiamond(x: number, y: number, inset = 0): Array<{ x: number; y: number }> {
    const center = this.toScreen(x, y);
    const halfW = ISO_TILE_WIDTH / 2 - inset;
    const halfH = ISO_TILE_HEIGHT / 2 - inset / 2;
    return [
      { x: center.x, y: center.y - halfH },
      { x: center.x + halfW, y: center.y },
      { x: center.x, y: center.y + halfH },
      { x: center.x - halfW, y: center.y },
    ];
  }

  private paint(): void {
    if (!this.add) return;
    this.children.removeAll(true);
    const g = this.add.graphics();
    g.fillStyle(0x202b31, 1);
    g.fillRect(0, 0, this.scale.width, this.scale.height);
    // Moon surface underlay and compact, hidden-snap grid.
    const ground: Array<{ x: number; y: number }> = [
      this.toScreen(-0.5, -0.5), this.toScreen(13.5, -0.5), this.toScreen(13.5, 13.5), this.toScreen(-0.5, 13.5),
    ];
    this.polygon(g, ground, 0x46504d, 0x758076, 0.92);
    for (let y = 0; y < MAP_SIZE.height; y++) {
      for (let x = 0; x < MAP_SIZE.width; x++) {
        this.polygon(g, this.cellDiamond(x, y, 1), (x * 3 + y * 7) % 5 === 0 ? 0x515a55 : 0x4b5551, 0x626d66, 0.55);
        const stone = (x * 13 + y * 19) % 7;
        if (stone < 2) {
          const center = this.toScreen(x, y);
          g.fillStyle(stone === 0 ? 0x303a39 : 0x697168, 0.55);
          g.fillRect(center.x + ((x * 17) % 9) - 4, center.y + ((y * 11) % 5) - 2, 3, 2);
        }
      }
    }

    const corridors = renderUtilityNetwork(this.state);
    for (const { edge, status } of corridors) {
      const color = FLOW_COLORS[status];
      for (const cell of edge.cells) this.polygon(g, this.cellDiamond(cell.x, cell.y, 5), color, 0x24363a, status === "active" ? 0.9 : 0.76);
      const points = edge.cells.map((cell) => this.toScreen(cell.x, cell.y));
      g.lineStyle(status === "active" ? 4 : 2, color, status === "active" ? 0.95 : 0.8);
      if (points.length) {
        g.beginPath(); g.moveTo(points[0].x, points[0].y);
        for (const point of points.slice(1)) g.lineTo(point.x, point.y);
        g.strokePath();
      }
    }
    for (const cell of this.corridorCells) this.polygon(g, this.cellDiamond(cell.x, cell.y, 4), 0xa8d3b1, 0xe3f3d8, 0.9);

    const modules = [...this.state.modules].sort((a, b) => a.x + a.y - b.x - b.y);
    for (const module of modules) this.drawModule(module);
    const disconnected = getDisconnectedModuleIds(this.state);
    for (const module of modules) {
      if (!disconnected.has(module.id)) continue;
      const pos = this.moduleCenter(module);
      this.add.text(pos.x + 17, pos.y - 15, "!", { fontFamily: "monospace", fontSize: "15px", color: "#ffbe7a", backgroundColor: "#292729", padding: { x: 4, y: 1 } }).setDepth(900);
    }

    if (this.state.activeHazard) {
      this.add.text(16, 14, `HAZARD · ${this.state.activeHazard.type.toUpperCase()}`, {
        fontFamily: "monospace", fontSize: "12px", color: "#ffb2a1", backgroundColor: "#402b2c", padding: { x: 8, y: 5 },
      }).setScrollFactor(0).setDepth(1000);
    }
    this.add.text(16, this.scale.height - 25, "SOUTH POLE  ·  GRID 14×14  ·  CLICK TO SNAP", {
      fontFamily: "monospace", fontSize: "10px", color: "#d3ddce", backgroundColor: "#263136", padding: { x: 6, y: 4 },
    }).setScrollFactor(0).setDepth(1000);
    this.preview = this.add.graphics().setDepth(850);
    this.cursorLabel = this.add.text(0, 0, "", { fontFamily: "monospace", fontSize: "10px", color: "#f0f1de", backgroundColor: "#29363a", padding: { x: 4, y: 2 } }).setDepth(1000);
    this.paintPreview();
  }

  private moduleCenter(module: GameState["modules"][number]): { x: number; y: number } {
    const size = footprint(module.moduleId, module.rotation);
    const pos = this.toScreen(module.x + (size.w - 1) / 2, module.y + (size.h - 1) / 2);
    return { x: pos.x, y: pos.y - 5 };
  }

  private drawModule(module: GameState["modules"][number]): void {
    const definition = MODULE_BY_ID.get(module.moduleId);
    if (!definition) return;
    const size = footprint(module.moduleId, module.rotation);
    const x0 = module.x - 0.5, y0 = module.y - 0.5;
    const x1 = x0 + size.w, y1 = y0 + size.h;
    const corners = [this.toScreen(x0, y0), this.toScreen(x1, y0), this.toScreen(x1, y1), this.toScreen(x0, y1)];
    const depth = 14 + (module.x + module.y) * 12;
    const graphics = this.add.graphics().setDepth(depth);
    const color = MODULE_COLORS[definition.category] ?? 0x91a0a0;
    const wall = Phaser.Display.Color.ValueToColor(color).darken(28).color;
    const lower = corners.map((point) => ({ x: point.x, y: point.y + 17 }));
    this.polygon(graphics, [corners[3], corners[2], lower[2], lower[3]], wall, 0x1e292b);
    this.polygon(graphics, [corners[1], corners[2], lower[2], lower[1]], Phaser.Display.Color.ValueToColor(color).darken(17).color, 0x1e292b);
    this.polygon(graphics, corners, color, this.selectedId === module.id ? 0xf2d99b : 0xd0d3be);
    graphics.lineStyle(1, 0xe8ead8, 0.5);
    graphics.beginPath(); graphics.moveTo(corners[0].x + 5, corners[0].y + 4); graphics.lineTo(corners[1].x - 5, corners[1].y + 4); graphics.strokePath();
    const center = this.moduleCenter(module);
    const line1 = definition.label.replace("Greenhouse", "GH").replace("Livestock", "LIVESTOCK").replace("Module", "").toUpperCase();
    this.add.text(center.x, center.y - 2, line1.length > 15 ? line1.slice(0, 14) : line1, {
      fontFamily: "monospace", fontSize: size.w * size.h <= 2 ? "8px" : "9px", color: "#f0f3e6", stroke: "#233034", strokeThickness: 3, align: "center",
    }).setOrigin(0.5).setDepth(depth + 2);
    if (this.selectedId === module.id) {
      const highlight = corners.map((point) => ({ x: point.x, y: point.y - 2 }));
      graphics.lineStyle(2, 0xffe09b, 1);
      graphics.beginPath(); graphics.moveTo(highlight[0].x, highlight[0].y);
      for (const point of highlight.slice(1)) graphics.lineTo(point.x, point.y);
      graphics.closePath(); graphics.strokePath();
    }
    if (definition.category === "greenhouse") this.drawCrops(module, center, depth + 3);
    if (definition.category === "livestock") this.drawAnimals(module, center, depth + 3);
  }

  private drawCrops(module: GameState["modules"][number], center: { x: number; y: number }, depth: number): void {
    const plot = this.state.crops.find((crop) => crop.moduleId === module.id);
    if (!plot) return;
    const g = this.add.graphics().setDepth(depth);
    for (let i = 0; i < 5; i++) {
      const x = center.x - 22 + (i % 3) * 20;
      const y = center.y + 10 + Math.floor(i / 3) * 8;
      const height = plot.ready ? 8 : plot.growth > 0.3 ? 5 : 2;
      g.fillStyle(plot.ready ? 0xe1c66d : 0x91c787, 0.95);
      g.fillRect(x, y - height, 3, height);
      g.fillRect(x - 2, y - Math.min(height, 5), 3, 2);
    }
    if (plot.ready) this.add.text(center.x + 13, center.y + 4, "✦", { fontSize: "11px", color: "#ffeb93" }).setDepth(depth + 1);
  }

  private drawAnimals(module: GameState["modules"][number], center: { x: number; y: number }, depth: number): void {
    const animal = this.state.livestock.find((item) => item.moduleId === module.id)?.animal;
    if (!animal) return;
    const g = this.add.graphics().setDepth(depth);
    const color = animal === "chicken" ? 0xf2d78a : animal === "pig" ? 0xe59b91 : 0xd6d5c7;
    for (let i = 0; i < 2; i++) {
      const x = center.x + 8 + i * 12;
      const y = center.y + 12 + (i % 2) * 4;
      g.fillStyle(color, 1); g.fillRect(x - 4, y - 3, 8, 5); g.fillRect(x + 2, y - 5, 4, 4);
      g.fillStyle(0x252a27, 1); g.fillRect(x + 4, y - 4, 1, 1);
    }
  }

  private movePointer(pointer: Phaser.Input.Pointer): void {
    const cell = this.toCell(pointer.worldX, pointer.worldY);
    this.hoveredCell = cell;
    this.paintPreview();
  }

  private moduleAt(cell: Cell): GameState["modules"][number] | undefined {
    return [...this.state.modules].reverse().find((module) => occupiedCells(module).some((occupied) => occupied.x === cell.x && occupied.y === cell.y));
  }

  private moduleTouches(moduleId: string, cell: Cell): boolean {
    const module = this.state.modules.find((item) => item.id === moduleId);
    return !!module && occupiedCells(module).some((occupied) => Math.abs(occupied.x - cell.x) + Math.abs(occupied.y - cell.y) === 1);
  }

  private click(pointer: Phaser.Input.Pointer): void {
    if (pointer.button !== 0) return;
    const cell = this.toCell(pointer.worldX, pointer.worldY);
    const module = this.moduleAt(cell);
    const buildPhase = this.state.phase === "design" || this.state.phase === "intermission";
    if (this.tool.remove && buildPhase && module) {
      this.selectedId = module.id;
      this.onSelection(module.id);
      this.emitAction({ type: "REMOVE_MODULE", placedModuleId: module.id });
      this.selectedId = undefined;
      this.onSelection(undefined);
      return;
    }
    if (this.tool.moduleId && buildPhase) {
      const { valid } = getPlacementPreview(this.state, this.tool.moduleId, cell.x, cell.y, this.rotation);
      if (valid) this.emitAction({ type: "PLACE_MODULE", moduleId: this.tool.moduleId, x: cell.x, y: cell.y, rotation: this.rotation });
      return;
    }
    if (this.tool.corridor && buildPhase) {
      if (module) {
        if (!this.corridorStart) this.corridorStart = module.id;
        else if (module.id !== this.corridorStart && this.corridorCells.length && this.moduleTouches(module.id, this.corridorCells[this.corridorCells.length - 1])) {
          this.emitAction({ type: "PLACE_CORRIDOR", cells: this.corridorCells });
          this.corridorStart = undefined; this.corridorCells = [];
        }
      } else if (this.corridorStart && this.hoveredCell && cell.x >= 0 && cell.y >= 0 && cell.x < MAP_SIZE.width && cell.y < MAP_SIZE.height && !hasCorridorAt(this.state, cell.x, cell.y) && !module) {
        const previous = this.corridorCells[this.corridorCells.length - 1];
        if ((!previous && this.moduleTouches(this.corridorStart, cell)) || (previous && Math.abs(previous.x - cell.x) + Math.abs(previous.y - cell.y) === 1)) {
          if (!previous || previous.x !== cell.x || previous.y !== cell.y) this.corridorCells.push(cell);
        }
      }
      this.paint();
      return;
    }
    if (module) {
      this.selectedId = module.id;
      this.onSelection(module.id);
      this.paint();
    }
  }

  private paintPreview(): void {
    if (!this.preview || !this.hoveredCell || !this.cursorLabel) return;
    this.preview.clear();
    const { x, y } = this.hoveredCell;
    const center = this.toScreen(x, y);
    this.cursorLabel.setPosition(center.x + 19, center.y - 9);
    if (this.tool.moduleId) {
      const validity = getPlacementPreview(this.state, this.tool.moduleId, x, y, this.rotation);
      const size = footprint(this.tool.moduleId, this.rotation);
      for (let row = 0; row < size.h; row++) for (let col = 0; col < size.w; col++) {
        this.polygon(this.preview, this.cellDiamond(x + col, y + row, 2), validity.valid ? 0x91d9ad : 0xe77d70, validity.valid ? 0xd2f7c8 : 0xffc6b5, 0.45);
      }
      this.cursorLabel.setText(validity.valid ? `R${this.rotation} · CLICK TO PLACE` : validity.reason ?? "INVALID").setVisible(true);
    } else if (this.tool.corridor) {
      this.polygon(this.preview, this.cellDiamond(x, y, 2), 0xa8d3b1, 0xe3f3d8, 0.34);
      this.cursorLabel.setText(this.corridorStart ? "ROUTE · CLICK CELLS, THEN MODULE" : "CLICK START MODULE").setVisible(true);
    } else {
      this.polygon(this.preview, this.cellDiamond(x, y, 2), 0xe7d98e, 0xf5eab5, 0.25);
      this.cursorLabel.setText(this.tool.remove ? "CLICK TO REMOVE" : "SELECT MODULE").setVisible(Boolean(this.tool.remove));
    }
    for (const cell of this.corridorCells) this.polygon(this.preview, this.cellDiamond(cell.x, cell.y, 4), 0xa8d3b1, 0xe3f3d8, 0.4);
  }
}
