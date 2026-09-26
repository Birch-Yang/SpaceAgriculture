"""Original code-drawn pixel artwork. Run from any directory; no dependencies.
Outputs are versioned under public/assets/cozy-v1. Never changes legacy assets.
"""
from pathlib import Path
import json
import re
ROOT = Path(__file__).resolve().parents[3] / 'public/assets/cozy-v1'
INK='#514b60'; SHADOW='#807489'; CREAM='#eddfbc'; ROOF='#c9c2a7'; WHITE='#fff0c9'; BLUE='#7696a3'; DARKBLUE='#476a82'; AMBER='#e5b361'; GREEN='#6b9e62'; LEAF='#a4c772'; RED='#c86459'
def r(x,y,w,h,c): return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{c}"/>'
def poly(points,c): return f'<polygon points="{points}" fill="{c}"/>'
def line(points,c=INK,w=2): return f'<polyline points="{points}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linejoin="miter"/>'
def image(x,y,w,h,href):
 data=(ROOT/href).read_text()
 data=re.sub(r' width="[^"]*" height="[^"]*"', '', data, count=1)
 return data.replace('<svg ', f'<svg x="{x}" y="{y}" width="{w}" height="{h}" ', 1)
def save(folder,name,body,w=96,h=96):
 p=ROOT/folder/f'{name}.svg'; p.parent.mkdir(parents=True,exist_ok=True)
 p.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" shape-rendering="crispEdges"><title>{name.replace("-"," ")}</title>{body}</svg>\n')
def box(x,y,w,d,h,roof=ROOF,front=CREAM,side='#b2a993'):
 # x/y are the front-left upper corner; compact 2:1 pixel perspective.
 return poly(f'{x},{y} {x+w},{y-w//2} {x+w+d},{y-w//2+d//2} {x+d},{y+d//2}',roof)+poly(f'{x},{y} {x+d},{y+d//2} {x+d},{y+d//2+h} {x},{y+h}',side)+poly(f'{x+d},{y+d//2} {x+w+d},{y-w//2+d//2} {x+w+d},{y-w//2+d//2+h} {x+d},{y+d//2+h}',front)+line(f'{x},{y+h} {x+d},{y+d//2+h} {x+w+d},{y-w//2+d//2+h}')
def tank(x,y,color=BLUE):
 return r(x+4,y,12,2,INK)+r(x+2,y+2,16,4,CREAM)+r(x,y+6,20,24,INK)+r(x+2,y+6,16,23,color)+r(x+4,y+7,3,19,'#afc3bb')+r(x+2,y+29,16,3,SHADOW)+r(x+7,y+9,6,15,DARKBLUE)+r(x+8,y+15,4,8,'#b6d5c7')
def window(x,y): return r(x,y,10,12,INK)+r(x+2,y+2,6,8,AMBER)+r(x+4,y+2,2,8,WHITE)
def airlock(x,y): return r(x+2,y,12,2,INK)+r(x,y+2,16,21,INK)+r(x+2,y+3,12,18,BLUE)+r(x+4,y+5,8,14,DARKBLUE)+r(x+6,y+7,4,5,AMBER)+r(x+11,y+13,2,2,WHITE)+r(x-2,y+23,20,3,SHADOW)
names=['habitat','greenhouse','livestock','oxygen','water','solar','battery','utility','communications','shelter','storage','recreation','corridor']
for name in names:
 for variant in (['compact','standard','industrial'] if name in ['greenhouse','livestock'] else ['standard']):
  w={'compact':28,'standard':40,'industrial':52}[variant] if name in ['greenhouse','livestock'] else 40
  x=8; y=43; d=28; h=24
  body=poly('6,67 49,43 91,63 50,86',SHADOW)+poly('8,65 49,45 89,65 49,84','#b3a5ad')
  body+=box(x,y,w,d,h)+line(f'{x+2},{y-1} {x+w},{y-w//2+1} {x+w+d-2},{y-w//2+d//2}',WHITE)
  body+=airlock(40,53)+window(60,44)+r(22,51,8,9,DARKBLUE)+r(24,53,4,5,AMBER)
  if name in ['greenhouse','livestock']:
   body=poly('4,66 49,43 92,65 50,88',SHADOW)+box(7,43,w,28,25,CREAM,CREAM,'#b6ac97')
   # Stepped pressure roof with exposed inspection bays.
   body+=poly(f'7,43 {7+w},{43-w//2} {35+w},{57-w//2} 35,57',INK)
   body+=poly(f'10,41 {7+w},{25 if variant=="standard" else 43-w//2+2} {31+w},{55-w//2} 35,53',BLUE if name=='greenhouse' else '#b58375')
   for n in range({'compact':2,'standard':3,'industrial':4}[variant]):
    xx=37+n*11; yy=56-n*5
    body+=r(xx,yy,9,13,INK)+r(xx+1,yy+1,7,10,DARKBLUE)+r(xx+2,yy+3,5,2,AMBER)
    if name=='greenhouse': body+=r(xx+2,yy+7,5,3,GREEN)+r(xx+3,yy+5,3,3,LEAF)
    else: body+=r(xx+2,yy+6,5,4,CREAM)+r(xx+5,yy+4,2,3,CREAM)
   body+=airlock(14,47)+r(10,68,21,3,SHADOW)
   body+=r(33,30,3,20,CREAM)+r(19,37,3,11,CREAM)
   body+=box(62,72,14,9,7,BLUE,DARKBLUE,INK)
   if variant=='industrial': body+=tank(70,11,BLUE)
   if name=='livestock': body+=r(12,39,14,3,AMBER)+r(10,44,6,3,CREAM)+r(55,72,7,6,AMBER)
  if name=='habitat': body+=r(33,22,18,3,WHITE)+r(29,25,26,3,CREAM)+r(25,28,34,3,ROOF)+r(58,25,8,6,BLUE)+r(59,24,6,2,INK)
  if name in ['oxygen','water']:
   body=poly('4,67 48,43 92,65 50,88',SHADOW)+box(8,46,26,24,22)+airlock(33,53)+tank(52,33,BLUE)+tank(72,27,BLUE if name=='water' else '#abc1ad')
   body+=r(48,61,27,4,INK)+r(50,61,23,2,CREAM)
   body+=r(18,39,12,10,DARKBLUE)
   if name=='oxygen': body+=r(21,41,5,2,WHITE)+r(20,43,2,3,WHITE)+r(25,43,2,3,WHITE)+r(21,46,5,2,WHITE)
   else: body+=r(23,40,2,3,BLUE)+r(21,43,6,4,BLUE)
  if name=='solar':
   body=poly('4,67 48,43 92,65 50,87',SHADOW)+r(26,46,5,27,INK)+r(66,38,5,25,INK)+poly('7,39 60,13 87,28 34,55',INK)+poly('10,38 60,15 83,28 34,52',DARKBLUE)
   for n in range(1,5): body+=line(f'{10+n*10},{38-n*5} {34+n*10},{51-n*5}',BLUE,1)
   body+=line('18,43 68,19',BLUE,1)+line('26,47 76,23',BLUE,1)+r(69,61,9,5,INK)+r(71,62,4,2,AMBER)
  if name=='battery':
   body=poly('8,65 48,43 90,65 50,84',SHADOW)
   for xx,yy in [(12,43),(38,31),(63,42)]:
    body+=box(xx,yy,14,12,27,BLUE,CREAM,SHADOW)+r(xx+15,yy+6,8,19,INK)
    for k in range(3): body+=r(xx+17,yy+8+k*5,4,3,LEAF if k<2 else AMBER)
   body+=r(26,76,46,3,INK)+r(28,76,42,1,AMBER)
  if name=='utility':
   body+=box(60,62,18,10,14,BLUE,DARKBLUE,SHADOW)
   for n in range(6): body+=r(63+n*3,52-n,2,15,CREAM)
   body+=r(8,60,20,5,INK)+r(8,60,20,2,BLUE)+r(8,61,4,14,BLUE)+r(59,30,11,8,DARKBLUE)
  if name=='communications':
   body=poly('8,65 48,43 90,65 50,84',SHADOW)+box(24,61,26,20,12)+airlock(39,60)+r(46,20,5,36,INK)+r(47,21,3,33,CREAM)
   body+=poly('25,15 35,15 38,23 55,29 64,27 61,35 51,39 40,35 30,25',INK)+poly('27,15 35,17 40,24 56,30 62,29 57,34 51,35 40,31 32,23',CREAM)+r(47,13,3,15,BLUE)+r(47,9,3,4,AMBER)
  if name=='shelter':
   body=poly('4,66 20,36 43,23 69,34 91,61 76,76 44,85',SHADOW)+poly('7,64 22,39 44,27 69,37 86,61 72,70 45,79','#aaa0ac')+poly('17,48 34,37 57,39 76,51 65,57 32,59','#c3b7bd')+airlock(39,55)+r(36,53,23,3,AMBER)
   body+=r(17,57,8,2,SHADOW)+r(62,45,8,2,SHADOW)+r(65,67,6,2,SHADOW)
  if name=='storage':
   body+=box(12,74,17,12,11,AMBER,'#b68d67',INK)+box(64,68,17,12,12,BLUE,DARKBLUE,INK)+r(22,74,2,13,CREAM)+r(74,68,2,13,CREAM)
  if name=='recreation': body+=r(56,44,21,16,INK)+r(58,46,17,12,AMBER)+r(61,51,12,5,'#ab7961')+r(65,47,3,5,WHITE)+r(73,51,2,4,GREEN)
  if name=='corridor': body=poly('3,55 63,25 93,40 33,70',INK)+poly('5,54 63,27 90,40 33,68',CREAM)+poly('7,53 63,29 86,40 32,65',ROOF)+line('9,54 34,66 88,40',SHADOW,3)+line('11,50 36,62 84,38',BLUE,2)+line('26,44 52,56',INK,2)+line('47,34 73,46',INK,2)+r(33,62,6,3,AMBER)
  save('modules', f'{name}-{variant}' if name in ['greenhouse','livestock'] else name,body)
  if variant=='standard' and name in ['greenhouse','livestock']: save('modules',name,body)
# Six crops with four readable growth stages; a golden tray ties the family together.
crops=['lettuce','radish','chili-pepper','potato','soybean','arabidopsis']
for crop in crops:
 for stage in ['planted','seedling','growing','ready']:
  b=r(5,24,22,6,INK)+r(7,24,18,4,'#a77d60')+r(8,24,16,2,'#6b5954')+r(10,29,12,2,SHADOW)
  if stage=='planted': b+=r(10,23,3,2,AMBER)+r(19,23,3,2,AMBER)
  elif stage=='seedling': b+=r(15,18,2,7,GREEN)+r(10,17,6,3,LEAF)+r(17,15,5,4,GREEN)
  else:
   ready=stage=='ready'
   if crop=='lettuce':
    b+=r(7,17,18,8,GREEN)+r(10,12,12,12,LEAF)+r(5,19,6,4,'#4d7f55')+r(22,18,5,5,'#4d7f55')+r(12,15,3,8,GREEN)+r(16,13,4,3,'#d1da8e')+r(17,18,5,3,GREEN)
    if ready:b+=r(6,14,5,4,LEAF)+r(22,14,4,5,LEAF)
   if crop=='radish':
    b+=r(14,11,3,10,GREEN)+r(7,10,8,4,LEAF)+r(17,7,6,5,GREEN)+r(12,5,4,6,LEAF)
    b+=r(11,19,11,5,RED if ready else '#d4ae9c')+r(13,24,7,3,WHITE)+r(16,27,2,2,WHITE)
   if crop=='chili-pepper':
    b+=r(15,8,2,17,GREEN)+r(7,10,18,5,GREEN)+r(10,6,12,6,LEAF)+r(5,15,8,5,LEAF)+r(21,14,6,5,GREEN)
    for x,y in [(9,15),(19,12),(15,20)]: b+=r(x,y,3,6,RED if ready else LEAF)+r(x-1,y+5,3,2,RED if ready else LEAF)
   if crop=='potato':
    b+=r(13,10,3,15,GREEN)+r(20,13,2,10,GREEN)+r(7,9,8,5,LEAF)+r(14,6,8,5,GREEN)+r(19,12,7,5,LEAF)
    if ready:b+=r(7,24,7,4,AMBER)+r(16,23,8,5,'#c29965')+r(9,25,2,1,'#8d6f57')+r(19,25,2,1,'#8d6f57')
   if crop=='soybean':
    b+=r(15,6,2,19,GREEN)
    for x,y in [(8,8),(17,11),(8,16),(18,19)]:b+=r(x,y,7,4,LEAF if x<15 else GREEN)
    if ready:
     for x,y in [(11,11),(19,16),(11,20)]:b+=r(x,y,4,7,'#bed084')+r(x+1,y+2,2,1,GREEN)+r(x+1,y+5,2,1,GREEN)
   if crop=='arabidopsis':
    b+=r(9,21,15,4,GREEN)+r(12,19,9,3,LEAF)+r(15,5,1,17,GREEN)+r(21,10,1,12,GREEN)+r(11,13,1,10,GREEN)
    if ready:
     for x,y in [(15,5),(21,10),(11,13)]:b+=r(x-2,y,5,1,WHITE)+r(x,y-2,1,5,WHITE)+r(x,y,1,1,AMBER)
   if ready:b+=r(26,7,3,1,AMBER)+r(27,6,1,3,AMBER)
  save('crops',f'{crop}-{stage}',b,32,32)
for name,color in [('chicken',WHITE),('pig','#d9998c'),('cow',CREAM)]:
 b=r(5,24,23,3,SHADOW)+r(7,12,18,11,INK)+r(8,11,15,11,color)+r(8,22,3,4,AMBER)+r(20,22,3,4,AMBER)+r(22,9,6,9,color)+r(25,11,2,2,INK)
 if name=='chicken':b+=r(23,6,4,3,RED)+r(27,14,4,2,AMBER)+r(5,9,4,8,color)+r(10,14,6,5,CREAM)
 if name=='pig':b+=r(22,7,3,4,color)+r(26,15,4,3,'#bc7d77')+r(5,14,3,2,color)
 if name=='cow':b+=r(10,13,5,5,INK)+r(18,17,4,4,INK)+r(21,6,2,4,AMBER)+r(27,6,2,4,AMBER)
 save('animals',name,b,32,32)
icons={
 'temperature':r(13,4,6,20,CREAM)+r(10,22,12,6,RED)+r(15,13,2,12,RED),
 'radiation':r(13,13,6,6,AMBER)+poly('5,7 11,4 14,11 10,14',AMBER)+poly('21,4 27,7 22,14 18,11',AMBER)+poly('12,22 20,22 23,29 9,29',AMBER),
 'micrometeoroid':r(7,17,10,10,ROOF)+r(17,10,5,5,AMBER)+r(22,5,5,5,AMBER)+r(27,2,3,3,AMBER),
 'communications':r(14,13,4,14,CREAM)+r(9,6,14,4,BLUE)+r(5,10,3,8,BLUE)+r(24,10,3,8,BLUE)+r(15,4,2,4,AMBER),
 'power':poly('17,3 10,17 16,17 12,29 25,12 18,12 23,3',AMBER),
 'water':poly('16,4 7,19 7,24 12,28 21,28 25,23 24,18',BLUE)+r(11,20,3,5,'#c4ded2'),
 'oxygen':r(6,8,19,18,BLUE)+r(9,11,13,12,CREAM)+r(12,14,7,6,BLUE),
 'food':r(8,14,17,12,AMBER)+r(11,10,11,5,CREAM)+r(13,13,2,9,'#ba8d62')+r(19,13,2,9,'#ba8d62'),
 'damage':line('8,3 16,12 11,16 21,27',INK,2),
}
for name,b in icons.items():save('ui',name,b,32,32)
# Terrain and corridor tiles use integer vertices and a common 2:1 footprint.
for n in range(3):
 b=poly('0,16 32,0 64,16 32,32','#b5a8b8' if n==0 else '#a99dae')+poly('0,16 32,32 32,36 0,20',SHADOW)+poly('32,32 64,16 64,20 32,36','#928397')
 for x,y in [(14,14),(32,9),(41,20),(27,23)]:b+=r(x+n*2,y,3,1,'#c7bdc7')
 if n==2:b+=poly('16,17 24,12 37,12 45,17 37,23 24,23',SHADOW)+poly('20,16 26,14 36,14 41,17 35,20 25,20','#9c8da1')
 save('terrain',f'regolith-{n}',b,64,36)
# A decorative scene, never a placement map or simulation surface.
scene=r(0,0,768,500,'#282b40')
for x,y in [(30,35),(119,69),(243,31),(469,43),(591,30),(722,86),(657,105),(378,60)]:scene+=r(x,y,2,2,CREAM)
scene+=r(650,33,24,26,BLUE)+r(646,39,32,15,BLUE)+r(652,36,8,8,LEAF)+r(663,47,10,6,CREAM)+r(646,56,26,3,INK)
for j in range(8):
 for i in range(9):
  xx=335+(i-j)*38; yy=92+(i+j)*19
  scene+=image(xx,yy,76,43,f'terrain/regolith-{(i*3+j*5)%3}.svg')
for i,j in [(2,3),(3,3),(4,3),(5,3),(6,3),(4,2),(4,4),(4,5)]:scene+=image(321+(i-j)*38,74+(i+j)*19,104,104,'modules/corridor.svg')
placements=[(1,1,'solar'),(3,1,'communications'),(5,1,'water'),(7,2,'oxygen'),(1,3,'greenhouse-standard'),(3,3,'habitat'),(6,3,'livestock-standard'),(2,5,'greenhouse-compact'),(4,5,'utility'),(7,5,'battery'),(3,7,'storage'),(5,7,'recreation'),(7,7,'shelter')]
for i,j,name in sorted(placements,key=lambda item:item[0]+item[1]):scene+=image(309+(i-j)*38,30+(i+j)*19,130,130,f'modules/{name}.svg')
save('', 'outpost-scene',scene,768,500)
manifest={'version':'cozy-v1','license':'CC0-1.0','moduleCanvas':[96,96],'moduleGroundAnchor':[48,82],'cropCanvas':[32,32],'terrainCanvas':[64,36],'notes':'Presentation artwork only. Footprints and crop stages come from host state; art sizes do not define game balance.','crops':{crop:{'stages':[f'crops/{crop}-{stage}.svg' for stage in ['planted','seedling','growing','ready']],'readyLabel':'Sample-ready' if crop=='arabidopsis' else 'Harvest-ready'} for crop in crops},'files':sorted(str(p.relative_to(ROOT)) for p in ROOT.rglob('*.svg'))}
(ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'Generated {len(manifest["files"])} original assets in {ROOT}')
