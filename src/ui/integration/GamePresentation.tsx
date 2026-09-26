'use client';
import { GameClient } from '../../game/phaser/GameClient';
import game from '../../game/phaser/game.module.css';
import s from './integration.module.css';
// Read-only presentation bridge: use A's exported CSS names, never mutate its state or DOM.
const select = (...names: string[]) => names.map(name => `.${s.theme} .${game[name]}`).join(',');
const descendant = (names: string[], suffix: string) => names.map(name => `${select(name)} ${suffix}`).join(',');
const theme = `
${select('shell','launch')}{background:#282936;color:#eadbbf;font-family:system-ui,sans-serif;min-height:80vh}
${select('resource','palette','details','command','tutorial','slotCard','interiorPanel','modal')}{background:#efe0bf;color:#3d352c;border:2px solid #977552;border-radius:3px}
${descendant(['resource','section','command','tutorial','interiorPanel','slotCard'], 'p')}{color:#51483a}
${select('resource')} span,${select('resource')} small{color:#5d5744}
${select('panelHeading','label','operationHelp')}{color:#60543f}
${select('panelHeading')} small,${select('tutorial')} small{color:#60543f}
${select('moduleStats')}{color:#f4dfba}
${select('moduleTop')}{grid-template-columns:56px 1fr auto}
${descendant(['shell','launch'], 'button')}{border:2px solid #96704d;border-radius:3px;background:#70523a;color:#fff0ce}
${descendant(['shell','launch'], 'button:hover')}{background:#866443}
${descendant(['shell','launch'], 'button:disabled')}{opacity:.48}
${select('primary')}{background:#a9bd85!important;color:#263723!important}
${select('active')}{box-shadow:inset 4px 0 #ebc477;border-color:#e8c177!important}
${select('low','crisis')}{border-color:#b45532}
${select('pass')}{color:#365c32}
${select('fail')}{color:#992c25}
${select('launchForm')} input,${select('launchForm')} select{background:#f2e5c9;color:#40352a;border:2px solid #96704d}
${select('moon')}{border-radius:3px;box-shadow:4px 4px #171820;background:url('/assets/cozy-v1/outpost-scene.svg') center/contain no-repeat;image-rendering:pixelated}
${select('moon')}::after{display:none}
`;
export function GamePresentation() {
  return <div className={s.theme}><style>{theme}</style><GameClient /></div>;
}
