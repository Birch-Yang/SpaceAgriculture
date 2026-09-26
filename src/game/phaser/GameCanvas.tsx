"use client";

import { useEffect, useRef } from "react";
import type { GameState, PlayerAction, Rotation } from "../state/types.ts";
import type { BuildTool, SceneCallbacks, GameScene } from "./GameScene.ts";
import { VIEW } from "./isometric.ts";

type Props = {
  state: GameState;
  tool: BuildTool;
  rotation: Rotation;
  selectedId: string | null;
  onAction: SceneCallbacks["onAction"];
  onSelect: SceneCallbacks["onSelect"];
  onRotate: SceneCallbacks["onRotate"];
};

export function GameCanvas({ state, tool, rotation, selectedId, onAction, onSelect, onRotate }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GameScene | null>(null);
  const latest = useRef({ state, tool, rotation, selectedId, onAction, onSelect, onRotate });
  latest.current = { state, tool, rotation, selectedId, onAction, onSelect, onRotate };

  useEffect(() => {
    let game: import("phaser").Game | null = null;
    let disposed = false;
    async function mount() {
      const [Phaser, { GameScene }] = await Promise.all([import("phaser"), import("./GameScene.ts")]);
      if (disposed || !hostRef.current) return;
      const scene = new GameScene({
        onAction: (action: PlayerAction) => latest.current.onAction(action),
        onSelect: (id) => latest.current.onSelect(id),
        onRotate: () => latest.current.onRotate(),
      });
      sceneRef.current = scene;
      scene.setSnapshot(latest.current.state);
      scene.setTool(latest.current.tool);
      scene.setRotation(latest.current.rotation);
      game = new Phaser.Game({
        type: Phaser.AUTO, parent: hostRef.current, width: VIEW.width, height: VIEW.height,
        backgroundColor: "#111b2b", pixelArt: true, roundPixels: true, antialias: false,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: [scene],
      });
    }
    void mount();
    return () => { disposed = true; sceneRef.current = null; game?.destroy(true); };
  }, []);

  useEffect(() => { sceneRef.current?.setSnapshot(state); }, [state]);
  useEffect(() => { sceneRef.current?.setTool(tool); }, [tool]);
  useEffect(() => { sceneRef.current?.setRotation(rotation); }, [rotation]);
  useEffect(() => { sceneRef.current?.setSelection(selectedId); }, [selectedId]);
  return <div ref={hostRef} role="application" aria-label="Isometric lunar base builder" style={{ width: "100%", aspectRatio: `${VIEW.width} / ${VIEW.height}` }} />;
}
