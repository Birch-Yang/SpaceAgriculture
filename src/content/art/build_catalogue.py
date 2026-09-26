# -*- coding: utf-8 -*-
"""Build a portable asset index without changing preserved previews or artwork."""
from pathlib import Path
import json, struct, re, html
ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT / 'public/assets'
recommended = {'pixel-v2/buildings.png','pixel-v2/crops.png','pixel-v2/animals-systems.png','pixel-v2/livestock-stages.png','pixel-v2/adult-failure-states.png','pixel-v2/lunar-background-v2.png','previews/ui-v11.html','previews/world-camera-v2.html','previews/pixel-elements-v5.html','previews/gameplay-concept-v3.html','previews/gameplay-concept-v3.png'}
records=[]
for p in sorted(BASE.rglob('*')):
    if p.suffix not in {'.svg','.png','.html'} or p.name == 'catalogue.html': continue
    key=p.relative_to(BASE).as_posix()
    width=height=None
    if p.suffix=='.png': width,height=struct.unpack('>II',p.read_bytes()[16:24])
    if p.suffix=='.svg':
        t=p.read_text(); v=re.search(r'viewBox="([^"]+)"',t)
        if v: width,height=map(float,v.group(1).split()[2:])
        else:
            for dim in ('width','height'):
                m=re.search(fr'{dim}="([0-9.]+)',t)
                if m:
                    if dim=='width': width=float(m.group(1))
                    else: height=float(m.group(1))
    if key.startswith('pixel-v2/'):
        status='pending-engine-preparation' if key in recommended else 'archived-art-study'
        source='Built-in image generation; src/content/art/*PROMPT*.md'
        purpose='Art direction sheet; frame extraction, transparency and anchor validation required'
        if 'background' in key: purpose='Baked lunar backdrop; not seamless, not a collision map'
    elif key.startswith('previews/'):
        status='illustrative-preview' if key in recommended else 'archived-preview'
        source='Built-in image generation' if 'concept' in key else 'React/HTML presentation snapshot; gameplay-mock PNG is browser capture'
        purpose='Presentation only; sample values, no live simulation'
    elif key.startswith('cozy-v1/'):
        status='react-placeholder'
        source='Original programmatic SVG; src/content/art/generate_assets.py'
        purpose='Current React placeholder, retained until approved sprite integration'
    else:
        status='legacy-fallback';source='Original code-drawn SVG; public/assets/ASSETS.md';purpose='Preserved original placeholder/fallback'
    records.append(dict(path='public/assets/'+key,url='/assets/'+key,width=width,height=height,bytes=p.stat().st_size,recommended=key in recommended,status=status,purpose=purpose,source=source))
(BASE/'catalogue.json').write_text(json.dumps({'schemaVersion':1,'note':'Art metadata only; no gameplay contracts. HTML sizes are viewport-dependent.','assets':records},ensure_ascii=False,indent=2)+'\n')
cards=[]
for r in records:
    rel=r['url'].removeprefix('/assets/')
    visual=f'<img loading="lazy" src="{html.escape(rel)}" alt="{html.escape(rel)}">' if not rel.endswith('.html') else '<div class="page">HTML PREVIEW</div>'
    size=f"{r['width']:g} × {r['height']:g}" if r['width'] else 'Responsive HTML'
    cards.append(f'<article data-status="{r["status"]}"><a href="{rel}">{visual}<strong>{html.escape(rel)}</strong></a><p>{"★ 推荐 / " if r["recommended"] else ""}{r["status"]} · {size}</p><p>{r["purpose"]}</p><small>{r["source"]}</small></article>')
(BASE/'catalogue.html').write_text('''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lunar Agriculture · 团队素材图鉴</title><style>*{box-sizing:border-box}body{background:#292833;color:#edddbb;font:14px/1.6 system-ui;margin:0;padding:24px}header{max-width:1400px;margin:auto}a{color:#efd09a}nav{display:flex;gap:18px;flex-wrap:wrap;margin:20px 0}input{padding:12px;width:min(100%,600px);font:inherit}main{max-width:1400px;margin:24px auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:20px}article{padding:16px;background:#3e3936;border:2px solid #967451;overflow-wrap:anywhere}img,.page{width:100%;height:210px;object-fit:contain;background:#827e79;image-rendering:pixelated}.page{display:grid;place-items:center}strong{display:block}small{color:#c5b69e}[hidden]{display:none}</style><header><h1>月面农业 · 团队素材图鉴</h1><p>推荐美术：pixel-v2；当前 React 占位：cozy-v1。图集尚待切帧和透明处理；游玩示意不是实际运行截图。所有旧版保留。</p><nav><a href="previews/pixel-elements-v5.html">推荐元素图鉴 v5</a><a href="previews/ui-v11.html">Approved onboarding v11</a><a href="previews/world-camera-v2.html">Current world design: hover-only grid</a><a href="previews/gameplay-concept-v3.html">放大温室示意 v3</a><a href="catalogue.json">完整机器可读清单</a></nav><input id="filter" aria-label="搜索素材" placeholder="搜索路径、状态或来源，例如 greenhouse / pending / preview"></header><main>'''+''.join(cards)+'''</main><script>document.getElementById('filter').addEventListener('input',e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('article').forEach(a=>a.hidden=!a.textContent.toLowerCase().includes(q))})</script></html>''')
print(f'Indexed {len(records)} assets and previews')
