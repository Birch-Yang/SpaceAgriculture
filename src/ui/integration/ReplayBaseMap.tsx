import { buildingFrame, buildingFrames } from '../../content/world-art';
import { MODULE_BY_ID } from '../../data/modules';
import { renderUtilityNetwork } from '../../game/phaser/adapters';
import { gridToScreen, rotatedFootprint, VIEW } from '../../game/phaser/isometric';
import type { GameState } from '../../game/state/types';

const edgeColors = { normal: '#557f98', connected: '#46d2d7', damaged: '#ee704e',
  bottleneck: '#f4b454', disconnected: '#9c697a' };

/** Read-only projection of the same pixel atlas, footprint scale and isometric coordinates used by GameScene. */
export function ReplayBaseMap({ state }: { state: GameState }) {
  const modules = [...state.modules].sort((a, b) => {
    const depth = (module: typeof a) => {
      const footprint = MODULE_BY_ID.get(module.moduleId)?.footprint ?? { w: 1, h: 1 };
      const size = rotatedFootprint(footprint, module.rotation);
      return module.x + module.y + size.w + size.h;
    };
    return depth(a) - depth(b);
  });
  const art = modules.flatMap(module => {
    const definition = MODULE_BY_ID.get(module.moduleId);
    if (!definition) return [];
    const { w, h } = rotatedFootprint(definition.footprint, module.rotation);
    const frame = buildingFrames[buildingFrame(definition.category, definition.id)];
    if (!frame) return [];
    const [, , sourceWidth, sourceHeight] = frame;
    const width = (w + h) * VIEW.tileWidth / 2;
    const height = sourceHeight * width / sourceWidth;
    const anchor = gridToScreen(module.x + (w - 1) / 2, module.y + (h - 1) / 2);
    return [{ module, frame, x: anchor.x - width / 2,
      y: anchor.y + (w + h) * VIEW.tileHeight / 4 - height, width, height }];
  });
  const points = [
    ...art.flatMap(item => [{ x: item.x, y: item.y }, { x: item.x + item.width, y: item.y + item.height }]),
    ...state.utilityEdges.flatMap(edge => edge.cells.flatMap(cell => {
      const point = gridToScreen(cell.x, cell.y);
      return [{ x: point.x - 24, y: point.y - 12 }, { x: point.x + 24, y: point.y + 12 }];
    })),
  ];
  const minX = points.length ? Math.min(...points.map(point => point.x)) : VIEW.width / 2;
  const maxX = points.length ? Math.max(...points.map(point => point.x)) : VIEW.width / 2;
  const minY = points.length ? Math.min(...points.map(point => point.y)) : VIEW.height / 2;
  const maxY = points.length ? Math.max(...points.map(point => point.y)) : VIEW.height / 2;
  const zoom = Math.min(1.8, (VIEW.width - 180) / Math.max(1, maxX - minX),
    (VIEW.height - 160) / Math.max(1, maxY - minY));
  const offsetX = VIEW.width / 2 - zoom * (minX + maxX) / 2;
  const offsetY = VIEW.height / 2 - zoom * (minY + maxY) / 2;
  return <svg viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} width="100%" role="img"
    aria-label={`Lunar base with ${state.modules.length} modules and ${state.utilityEdges.length} utility corridors at level ${state.level}, turn ${state.turn}`}
    style={{ display: 'block', background: '#111b2b', imageRendering: 'pixelated' }}>
    <image href="/assets/pixel-v2/lunar-background-v2.png" x="0" y="0" width={VIEW.width} height={VIEW.height} preserveAspectRatio="xMidYMid slice" />
    <g transform={`translate(${offsetX} ${offsetY}) scale(${zoom})`}>
    {renderUtilityNetwork(state).map(({ edge, status }) => <g key={edge.id}>
      {edge.cells.map((cell, index) => {
        const p = gridToScreen(cell.x, cell.y);
        return <polygon key={index} points={`${p.x},${p.y - 11} ${p.x + 23},${p.y} ${p.x},${p.y + 11} ${p.x - 23},${p.y}`}
          fill={edgeColors[status]} fillOpacity="0.85" stroke="#182b35" strokeWidth="1" />;
      })}
      {edge.cells.length > 1 && <polyline points={edge.cells.map(cell => {
        const p = gridToScreen(cell.x, cell.y); return `${p.x},${p.y}`;
      }).join(' ')} fill="none" stroke={edgeColors[status]} strokeWidth={status === 'connected' ? 3 : 2} opacity="0.65" />}
    </g>)}
    {art.map(({ module, frame, x, y, width, height }) => {
      const [sourceX, sourceY, sourceWidth, sourceHeight] = frame;
      return <svg key={module.id} x={x} y={y} width={width} height={height}
        viewBox={`${sourceX} ${sourceY} ${sourceWidth} ${sourceHeight}`}
        style={module.integrity < 0.65 ? { filter: 'sepia(.35) brightness(.82)' } : undefined}>
        <image href="/assets/pixel-v2/buildings.png" x="0" y="0" width="1774" height="887" />
      </svg>;
    })}
    </g>
    {state.activeHazard && <text x="480" y="38" fill="#ffb0a0" fontSize="17" textAnchor="middle" fontWeight="bold">
      ⚠ {state.activeHazard.type.toUpperCase()} · severity {state.activeHazard.severity.toFixed(1)}</text>}
    {state.crisis && <text x="480" y="65" fill="#ffe19b" fontSize="15" textAnchor="middle" fontWeight="bold">CRISIS: {state.crisis.trigger}</text>}
  </svg>;
}
