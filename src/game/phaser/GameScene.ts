import * as Phaser from "phaser";
import { buildingFrames, buildingFrame } from "../../content/world-art";
import { MODULE_BY_ID } from "../../data/modules.ts";
import { MAP_SIZE } from "../state/reducer.ts";
import type { Cell, GameState, PlacedModule, PlayerAction } from "../state/types.ts";
import { occupiedModuleCells, previewModule, renderUtilityNetwork } from "./adapters.ts";
import { agricultureSlots } from "./agricultureAdapter.ts";
import { gridToScreen, rotatedFootprint, screenToGrid, VIEW } from "./isometric.ts";

export type BuildTool = { kind: "select" } | { kind: "module"; moduleId: string } | { kind: "corridor" };
export type SceneCallbacks = {
  onAction: (action: PlayerAction) => void;
  onSelect: (id: string | null) => void;
  onFeedback: (message: string) => void;
};

const colors: Record<string, number> = {
  habitat: 0x5baac3, greenhouse: 0x5fc88d, livestock: 0xd1a76a,
  oxygen: 0x73c9e5, water: 0x638fe0, solar: 0xe5c675,
  battery: 0xeaaa5a, utility: 0xa289dc, communications: 0x88b9e1,
  shelter: 0xa8a9b3, storage: 0x8faaa2, recreation: 0xe2a9ba,
};

export class GameScene extends Phaser.Scene {
  private snapshot: GameState | null = null;
  private tool: BuildTool = { kind: "select" };
  private selectedId: string | null = null;
  private hover: Cell | null = null;
  private corridorPath: Cell[] = [];
  private down: Cell | null = null;
  private graphics: Phaser.GameObjects.Graphics | null = null;
  private labels: Phaser.GameObjects.Text[] = [];
  private lastPulse = -1;
  private sprites: Phaser.GameObjects.Image[] = [];
  private hasBackdrop = false;

  constructor(private readonly callbacks: SceneCallbacks) {
    super({ key: "LunarBase" });
  }

  preload(): void {
    this.load.image('pixel-buildings', '/assets/pixel-v2/buildings.png');
    this.load.image('lunar-ground', '/assets/pixel-v2/lunar-background-v2.png');
  }

  create(): void {
    if (this.textures.exists('pixel-buildings')) {
      const texture = this.textures.get('pixel-buildings');
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      for (const [name, [x,y,w,h]] of Object.entries(buildingFrames)) texture.add(name, 0, x,y,w,h);
    }
    this.hasBackdrop = this.textures.exists('lunar-ground');
    if (this.hasBackdrop) {
      const ground = this.add.image(VIEW.width / 2, VIEW.height / 2, 'lunar-ground');
      // Terrain uses the same world camera as cells and sprites, including selection focus.
      ground.setScale(Math.max(VIEW.width / ground.width, VIEW.height / ground.height));
      ground.setDepth(-2).setScrollFactor(1);
    }
    // Keep focus zoom within the backdrop instead of revealing empty canvas at its edges.
    this.cameras.main.setBounds(0, 0, VIEW.width, VIEW.height);

    this.graphics = this.add.graphics();
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => this.onMove(pointer));
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.onDown(pointer));
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => this.onUp(pointer));
    this.input.on("gameout", () => { this.hover = null; this.paint(); });
    this.paint();
  }

  update(time: number): void {
    const pulse = Math.floor(time / 500);
    if (this.snapshot?.phase === "operation" && pulse !== this.lastPulse) {
      this.lastPulse = pulse;
      this.paint();
    }
  }

  setSnapshot(state: GameState): void { this.snapshot = state; this.paint(); }
  setTool(tool: BuildTool): void { this.tool = tool; this.corridorPath = []; this.paint(); }
  setSelection(id: string | null): void {
    if (this.selectedId === id) return;
    this.selectedId = id;
    const module = this.snapshot?.modules.find((item) => item.id === id);
    const definition = module ? MODULE_BY_ID.get(module.moduleId) : undefined;
    const camera = this.cameras.main;
    if (module && definition) {
      const { w, h } = rotatedFootprint(definition.footprint, module.rotation);
      const center = gridToScreen(module.x + (w - 1) / 2, module.y + (h - 1) / 2);
      camera.pan(center.x, center.y, 350);
      camera.zoomTo(1.2, 350);
    } else {
      camera.pan(VIEW.width / 2, VIEW.height / 2, 350);
      camera.zoomTo(1, 350);
    }
    this.paint();
  }

  private inBounds(cell: Cell): boolean {
    return cell.x >= 0 && cell.y >= 0 && cell.x < MAP_SIZE.width && cell.y < MAP_SIZE.height;
  }

  private pointerCell(pointer: Phaser.Input.Pointer): Cell | null {
    const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const cell = screenToGrid(point.x, point.y);
    return this.inBounds(cell) ? cell : null;
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    const cell = this.pointerCell(pointer);
    if (cell?.x === this.hover?.x && cell?.y === this.hover?.y) return;
    this.hover = cell;
    if (this.down && cell && this.tool.kind === "corridor") this.extendPath(cell);
    this.paint();
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    const cell = this.pointerCell(pointer);
    if (!cell) return;
    this.down = cell;
    if (this.tool.kind === "corridor" && this.buildEnabled()) this.corridorPath = [cell];
    this.paint();
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    const cell = this.pointerCell(pointer);
    const state = this.snapshot;
    const down = this.down;
    this.down = null;
    if (!state || !cell) { this.corridorPath = []; this.paint(); return; }
    if (this.tool.kind === "module" && this.buildEnabled()) {
      const definition = MODULE_BY_ID.get(this.tool.moduleId);
      const preview = definition && previewModule(state, definition, cell.x, cell.y, 0);
      if (definition && preview?.valid) {
        this.callbacks.onAction({ type: "PLACE_MODULE", moduleId: definition.id, x: cell.x, y: cell.y, rotation: 0 });
      } else this.callbacks.onFeedback(preview?.reason ?? "This module cannot be placed here.");
    } else if (this.tool.kind === "corridor" && this.buildEnabled()) {
      this.extendPath(cell);
      if (this.corridorPath.length > 0) this.callbacks.onAction({ type: "PLACE_CORRIDOR", cells: [...this.corridorPath] });
    } else if (this.tool.kind === "select" && state.phase === "design" && state.level === 1 && state.turn === 1 && down && (down.x !== cell.x || down.y !== cell.y) && this.moduleAt(down, state)) {
      const module = this.moduleAt(down, state)!;
      // Preserve the grabbed cell's offset within a multi-cell building.
      this.callbacks.onAction({ type: "MOVE_MODULE", placedModuleId: module.id,
        x: module.x + cell.x - down.x, y: module.y + cell.y - down.y });
    } else {
      const module = this.moduleAt(cell, state);
      const edge = state.utilityEdges.find((item) => item.cells.some((part) => part.x === cell.x && part.y === cell.y));
      this.callbacks.onSelect(module?.id ?? edge?.id ?? null);
    }
    this.corridorPath = [];
    this.paint();
  }

  private buildEnabled(): boolean {
    return this.snapshot?.phase === "design" || this.snapshot?.phase === "intermission";
  }

  private extendPath(cell: Cell): void {
    if (!this.inBounds(cell)) return;
    const path = this.corridorPath;
    if (!path.length) { path.push(cell); return; }
    const previous = path[path.length - 1];
    if (previous.x === cell.x && previous.y === cell.y) return;
    if (path.length > 1 && path[path.length - 2].x === cell.x && path[path.length - 2].y === cell.y) { path.pop(); return; }
    let x = previous.x;
    let y = previous.y;
    while (x !== cell.x || y !== cell.y) {
      if (x !== cell.x) x += Math.sign(cell.x - x);
      else y += Math.sign(cell.y - y);
      if (path.some((part) => part.x === x && part.y === y)) break;
      path.push({ x, y });
    }
  }

  private moduleAt(cell: Cell, state: GameState): PlacedModule | undefined {
    return state.modules.find((module) => {
      const definition = MODULE_BY_ID.get(module.moduleId);
      if (!definition) return false;
      const { w, h } = rotatedFootprint(definition.footprint, module.rotation);
      return cell.x >= module.x && cell.x < module.x + w && cell.y >= module.y && cell.y < module.y + h;
    });
  }

  private diamond(x: number, y: number, fill: number, alpha = 1, stroke = 0x52626a): void {
    const graphics = this.graphics!;
    const center = gridToScreen(x, y);
    const halfW = VIEW.tileWidth / 2 - 1;
    const halfH = VIEW.tileHeight / 2 - 1;
    graphics.fillStyle(fill, alpha);
    graphics.lineStyle(1, stroke, 0.75);
    graphics.beginPath();
    graphics.moveTo(center.x, center.y - halfH);
    graphics.lineTo(center.x + halfW, center.y);
    graphics.lineTo(center.x, center.y + halfH);
    graphics.lineTo(center.x - halfW, center.y);
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
  }

  private block(x: number, y: number, color: number, integrity: number, selected: boolean): void {
    const g = this.graphics!;
    const point = gridToScreen(x, y);
    const px = point.x;
    const py = point.y - 9;
    const w = VIEW.tileWidth / 2 - 1;
    const h = VIEW.tileHeight / 2 - 1;
    g.fillStyle(0x243846, Math.max(0.55, integrity));
    g.fillPoints([new Phaser.Geom.Point(px - w, py), new Phaser.Geom.Point(px, py + h), new Phaser.Geom.Point(px, py + h + 10), new Phaser.Geom.Point(px - w, py + 10)], true);
    g.fillStyle(0x1b303e, Math.max(0.55, integrity));
    g.fillPoints([new Phaser.Geom.Point(px, py + h), new Phaser.Geom.Point(px + w, py), new Phaser.Geom.Point(px + w, py + 10), new Phaser.Geom.Point(px, py + h + 10)], true);
    g.fillStyle(color, Math.max(0.45, integrity));
    g.lineStyle(selected ? 2 : 1, selected ? 0xffffff : 0x35515c);
    g.beginPath();
    g.moveTo(px, py - h); g.lineTo(px + w, py); g.lineTo(px, py + h); g.lineTo(px - w, py);
    g.closePath(); g.fillPath(); g.strokePath();
  }

  private text(x: number, y: number, value: string, color = "#ecf6f2", size = 11): void {
    this.labels.push(this.add.text(x, y, value, { fontFamily: "monospace", fontSize: `${size}px`, color, backgroundColor: "#10232dbb", padding: { x: 3, y: 2 } }).setOrigin(0.5).setResolution(2).setDepth(20000));
  }

  private paint(): void {
    if (!this.graphics) return;
    const g = this.graphics;
    g.clear();
    this.labels.forEach((label) => label.destroy());
    this.labels = [];
    this.sprites.forEach(sprite => sprite.destroy());
    this.sprites = [];
    const state = this.snapshot;
    if (!this.hasBackdrop) {
    g.fillStyle(0x111b2b);
    g.fillRect(0, 0, VIEW.width, VIEW.height);
    g.fillStyle(0x223044, 0.4);
    for (let i = 0; i < 44; i++) {
      const x = (i * 197 + 73) % VIEW.width;
      const y = (i * 101 + 17) % VIEW.height;
      g.fillCircle(x, y, i % 3 + 1);
    }
    }
    // Keep the lunar surface clear; build targets are drawn only beneath the pointer.
    if (!state) return;

    const edgeColors = { normal: 0x557f98, connected: 0x46d2d7, damaged: 0xee704e, bottleneck: 0xf4b454, disconnected: 0x9c697a };
    for (const { edge, status } of renderUtilityNetwork(state)) {
      for (const cell of edge.cells) this.diamond(cell.x, cell.y, edgeColors[status], 0.85, 0x182b35);
      if (edge.cells.length) {
        g.lineStyle(status === "connected" ? 3 : 2, edgeColors[status], status === "connected" && this.lastPulse % 2 === 0 ? 0.95 : 0.6);
        g.beginPath();
        edge.cells.forEach((cell, index) => {
          const point = gridToScreen(cell.x, cell.y);
          if (index === 0) g.moveTo(point.x, point.y);
          else g.lineTo(point.x, point.y);
        });
        g.strokePath();
      }
      if (edge.id === this.selectedId) for (const cell of edge.cells) this.diamond(cell.x, cell.y, edgeColors[status], 0.3, 0xffffff);
    }

    const frontDepth = (module: PlacedModule) => {
      const def = MODULE_BY_ID.get(module.moduleId);
      const size = def ? rotatedFootprint(def.footprint, module.rotation) : {w:1,h:1};
      return module.x + module.y + size.w + size.h;
    };
    const sorted = [...state.modules].sort((a, b) => frontDepth(a) - frontDepth(b));
    for (const module of sorted) {
      const definition = MODULE_BY_ID.get(module.moduleId);
      if (!definition) continue;
      const { w, h } = rotatedFootprint(definition.footprint, module.rotation);
      const color = colors[definition.category] ?? 0xa2a6ad;
      const frame = buildingFrame(definition.category, definition.id);
      const artAvailable = this.textures.exists('pixel-buildings') && this.textures.get('pixel-buildings').has(frame);
      for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < h; dy++) {
        if (!artAvailable) this.block(module.x + dx, module.y + dy, color, module.integrity, module.id === this.selectedId);
        else if (module.id === this.selectedId) this.diamond(module.x + dx, module.y + dy, 0xe8c36e, 0.35, 0xffe2a0);
      }
      if (artAvailable) {
        const anchor = gridToScreen(module.x + (w-1)/2, module.y + (h-1)/2);
        const sprite = this.add.image(anchor.x, anchor.y + (w+h)*VIEW.tileHeight/4, 'pixel-buildings', frame).setOrigin(0.5,1);
        // Fit visual width to the projected footprint. Selection zoom improves crop readability without changing occupancy.
        sprite.setScale(((w+h)*VIEW.tileWidth/2) / sprite.width).setDepth(100 + frontDepth(module));
        if (module.integrity < 0.65) sprite.setTint(0xc49c84);
        this.sprites.push(sprite);
      }
      const center = gridToScreen(module.x + (w - 1) / 2, module.y + (h - 1) / 2);
      const agriculture = agricultureSlots(state, module.id);
      const crop = agriculture?.kind === "greenhouse" ? agriculture.slots.find((slot) => slot.crop) : undefined;
      const animal = agriculture?.kind === "livestock" ? agriculture.slots.find((slot) => slot.animal) : undefined;
      const short = definition.category === "greenhouse" ? `🌱 ${crop?.crop?.slice(0, 3) ?? "empty"} ${crop?.ready ? "READY" : `${crop?.progress ?? 0}%`}`
        : definition.category === "livestock" ? `● ${animal?.animal ?? "empty"} ${animal?.progress ?? 0}%`
        : definition.label.split(" ").map((word) => word[0]).join("").slice(0, 4).toUpperCase();
      if (!artAvailable || module.id === this.selectedId) this.text(center.x, center.y + (w+h)*VIEW.tileHeight/4 + 10, short, "#f5fbf6", 11);
      if (!artAvailable && crop?.crop) {
        const mature = crop.ready || crop.progress > 65;
        g.fillStyle(mature ? 0xb1e794 : 0x83cf97);
        g.fillRect(center.x - 12, center.y - 25, 6, mature ? 7 : 4);
        g.fillRect(center.x + 6, center.y - 25, 6, mature ? 7 : 4);
      }
      if (!artAvailable && animal?.animal) {
        g.fillStyle(animal.animal === "chicken" ? 0xf0d3a5 : animal.animal === "pig" ? 0xe8a9ad : 0xe9e4d0);
        g.fillRect(center.x - 8, center.y - 23, 16, 7);
        g.fillRect(center.x + 5, center.y - 27, 4, 5);
      }
      if (definition.category === "battery" || definition.category === "water" || definition.category === "oxygen") {
        const value = definition.category === "battery" ? state.resources.power : definition.category === "water" ? state.resources.water : state.resources.oxygen;
        g.fillStyle(0x203d49);
        g.fillRect(center.x - 14, center.y + 11, 28, 4);
        g.fillStyle(value < 12 ? 0xee876e : 0x91e0c4);
        g.fillRect(center.x - 14, center.y + 11, Math.max(0, Math.min(28, value * 0.35)), 4);
      }
      if (module.integrity < 0.65) this.text(center.x + 19, center.y - 29, "!", "#ff9c76", 14);
    }

    if (this.corridorPath.length) {
      const blocked = occupiedModuleCells(state);
      for (const cell of this.corridorPath) this.diamond(cell.x, cell.y, blocked.has(`${cell.x},${cell.y}`) ? 0xe4645e : 0x77e1db, 0.75, 0xffffff);
    } else if (this.hover && this.tool.kind === "module" && this.buildEnabled()) {
      const definition = MODULE_BY_ID.get(this.tool.moduleId);
      if (definition) {
        const preview = previewModule(state, definition, this.hover.x, this.hover.y, 0);
        for (const cell of preview.cells) if (this.inBounds(cell)) this.diamond(cell.x, cell.y, preview.valid ? 0x8de0be : 0xe7746d, preview.valid ? 0.65 : 0.2, 0xffffff);
        const point = gridToScreen(this.hover.x, this.hover.y);
        this.text(point.x, point.y - 30, preview.valid ? "PLACE" : preview.reason ?? "BLOCKED", preview.valid ? "#adf6cd" : "#ffc0b5", 10);
      }
    } else if (this.hover && this.buildEnabled()) {
      this.diamond(this.hover.x, this.hover.y, 0xffffff, 0.1, 0xffffff);
    }

    if (state.activeHazard) this.text(VIEW.width / 2, 38, `⚠ ${state.activeHazard.type.toUpperCase()} • severity ${state.activeHazard.severity.toFixed(1)}`, "#ffb0a0", 16);
    if (state.crisis) this.text(VIEW.width / 2, 65, `CRISIS: ${state.crisis.trigger}`, "#ffe19b", 14);
  }
}
