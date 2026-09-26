// Build an additive, standalone HTML review. Never overwrite an earlier design.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../..');
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
  module._compile(output.outputText, filename);
};
require.extensions['.css'] = module => { module.exports = new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) }); };
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { Preview } = require('./Preview.tsx');
const version = process.argv[2] || 'v1';
if (!/^v[1-9][0-9]*$/.test(version)) throw new Error('Use a version such as v1 or v2');
const target = path.join(root, 'public/assets/previews', `ui-${version}.html`);
if (fs.existsSync(target)) throw new Error('Snapshot already exists. Preserve it and choose a new version.');
const css = fs.readFileSync(path.join(root, 'src/ui/ui.module.css'), 'utf8');
const markup = renderToStaticMarkup(React.createElement(Preview)).replaceAll('/assets/', '../');
const previewStyles = `body{margin:0;background:#122025;color:#e9e8dc} [hidden]{display:none!important} .previewBar{background:#ede8d7;color:#263d42;padding:12px 4%;font:11px/1.5 monospace;position:sticky;top:0;z-index:5;border-bottom:3px solid #73846d}.previewBar nav{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}.previewBar button,.stateControls button{border:1px solid #75877f;background:#2c4141;color:#eef0e4;padding:8px 12px;cursor:pointer;font:12px monospace;text-transform:capitalize}.previewBar button[aria-pressed=true]{background:#bdcf9c;color:#122025}.previewBar a{color:#263d42;margin-left:auto}.previewOnly{font:12px/1.5 monospace;text-align:center;padding:14px;background:#30413d}.stateControls{display:flex;gap:8px;margin:20px 0 10px;flex-wrap:wrap}.assetGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:16px}.assetGrid figure{margin:0;padding:20px;background:#293b3d;text-align:center}.assetGrid figcaption{font:11px monospace;margin-top:12px}button:focus-visible,a:focus-visible{outline:3px solid #e6af62;outline-offset:3px}.screen> .root{max-width:1440px;margin:auto}`;
const script = `
function screen(name){document.querySelectorAll('.screen').forEach(el=>el.hidden=el.id!==name);document.querySelectorAll('[data-screen]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.screen===name)));window.scrollTo(0,0);}
document.querySelectorAll('[data-screen]').forEach(el=>el.addEventListener('click',()=>screen(el.dataset.screen)));
const form=document.querySelector('#landing form');const input=form.querySelector('input');
input.addEventListener('input',()=>form.querySelectorAll('button[type=submit]').forEach(button=>button.disabled=!input.value.trim()));
form.addEventListener('submit',event=>{event.preventDefault();if(input.value.trim())screen('systems');});
document.querySelectorAll('#landing a').forEach(a=>a.addEventListener('click',event=>{event.preventDefault();screen(a.getAttribute('href')==='/leaderboard'?'leaderboard':a.getAttribute('href')==='/analytics'?'analytics':'landing');}));
for(const name of ['comms','hazard'])document.querySelectorAll('[data-'+name+']').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-'+name+'-panel]').forEach(panel=>panel.hidden=panel.getAttribute('data-'+name+'-panel')!==button.getAttribute('data-'+name));}));
document.querySelectorAll('[data-board] .tabs button').forEach(button=>button.addEventListener('click',()=>document.querySelectorAll('[data-board]').forEach(panel=>panel.hidden=panel.dataset.board!==button.textContent)));
document.querySelectorAll('#systems .button').forEach(button=>button.addEventListener('click',()=>{if(button.textContent==='Review mission')screen('report');else if(button.textContent==='Inspect systems'){document.querySelector('#systems .panel').scrollIntoView({behavior:'smooth',block:'start'});}else document.getElementById('preview-action').textContent='Preview selected: '+button.textContent+'. No simulation action was dispatched.';}));
document.querySelectorAll('#systems select').forEach(select=>select.addEventListener('change',()=>{document.getElementById('preview-action').textContent='Preview setting: '+select.value+'. No simulation action was dispatched.';}));
screen('landing');`;
fs.writeFileSync(target, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lunar Agriculture · UI ${version}</title><style>${css}\n${previewStyles}</style></head><body>${markup}<script>${script}</script></body></html>`);
const original = path.join(root, 'public/assets/previews/original-landing.html');
if (!fs.existsSync(original)) {
  const oldCSS = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8');
  fs.writeFileSync(original, `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Original landing · preserved</title><style>${oldCSS}</style></head><body><main><p class="eyebrow">Lunar south pole · mission design</p><h1>Lunar Agriculture Design-Space Explorer</h1><p>Growing food on the Moon means balancing production against power, water, oxygen, heat, and resilience.</p><div class="grid"><section class="card"><h2>Challenge</h2><p>Build a base, then survive ten high-pressure turns.</p></section><section class="card"><h2>Progressive</h2><p>Grow one outpost across three ten-turn levels.</p></section></div><p><a href="/game">Open game</a> · <a href="/leaderboard">Leaderboards</a> · <a href="/analytics">Player patterns</a></p><hr><p>Preserved original presentation from Developer B’s bootstrap. <a href="ui-${version}.html">View proposed design</a></p></main></body></html>`);
}
console.log(path.relative(root, target));
