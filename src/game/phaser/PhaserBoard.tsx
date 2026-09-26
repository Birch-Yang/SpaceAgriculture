"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { GameState, PlayerAction, Rotation } from "../state/types.ts";
import type { SceneTool } from "./GameScene.ts";

export type PhaserBoardHandle = {
  setTool(tool: SceneTool): void;
  rotate(): Rotation | undefined;
  removeSelected(): void;
};

type Props = {
  state: GameState;
  onAction: (action: PlayerAction) => void;
  onSelection: (moduleId?: string) => void;
};

const PhaserBoard = forwardRef<PhaserBoardHandle, Props>(function PhaserBoard({ state, onAction, onSelection }, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<import("phaser").Game | null>(null);
  const sceneRef = useRef<import("./GameScene.ts").GameScene | null>(null);
  const actionRef = useRef(onAction);
  const selectionRef = useRef(onSelection);
  actionRef.current = onAction;
  selectionRef.current = onSelection;

  useImperativeHandle(ref, () => ({
    setTool: (tool) => sceneRef.current?.setTool(tool),
    rotate: () => sceneRef.current?.rotate(),
    removeSelected: () => sceneRef.current?.removeSelected(),
  }), []);

  useEffect(() => {
    let cancelled = false;
    let game: import("phaser").Game | undefined;
    void import("phaser").then(async (module) => {
      if (cancelled || !hostRef.current) return;
      const Phaser = module;
      const [{ GameScene }] = await Promise.all([import("./GameScene.ts")]);
      if (cancelled || !hostRef.current) return;
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        backgroundColor: "#151d24",
        scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
        render: { antialias: false, pixelArt: true, roundPixels: true },
        scene: [new GameScene(state, (action) => actionRef.current(action), (moduleId) => selectionRef.current(moduleId))],
      });
      game.events.once(Phaser.Core.Events.READY, () => {
        if (game && !cancelled) sceneRef.current = game.scene.getScene("LunarBase") as InstanceType<typeof GameScene>;
      });
      gameRef.current = game;
    }).catch((error: unknown) => {
      if (hostRef.current) hostRef.current.dataset.error = error instanceof Error ? error.message : "Phaser failed to load";
    });
    return () => {
      cancelled = true;
      sceneRef.current = null;
      gameRef.current?.destroy(true);
      gameRef.current = null;
      game?.destroy(true);
    };
  // Scene creation is intentionally one-time; callbacks and state are kept current by refs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { sceneRef.current?.setState(state); }, [state]);

  return <div className="lunar-board" ref={hostRef} role="application" aria-label="Interactive isometric lunar base map" />;
});

export default PhaserBoard;
