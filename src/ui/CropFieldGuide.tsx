import { cropArt, cropArtStages } from '../content/crop-art';
import { PixelAsset } from './primitives';
import { ScienceDrawer } from './ScienceDrawer';
import s from './ui.module.css';
export function CropFieldGuide() {
  return <section className={s.root}><p className={s.eyebrow}>Greenhouse journal / six-crop art collection</p><h1>A little green.<br /><span className={s.leafText}>A long way from home.</span></h1><p className={s.muted}>From the first sprout to the last sample. Each stage has its own silhouette.</p><div className={s.cropGrid}>{cropArt.map(crop => <article className={s.cropCard} key={crop.id}><header className={s.row}><div><p className={s.eyebrow}>{crop.subtitle}</p><h2>{crop.label}</h2></div><PixelAsset name={`${crop.id}-ready`} folder="crops" size={64} /></header><p>{crop.description}</p><ol className={s.cropStages}>{cropArtStages.map((stage,i) => <li key={stage}><PixelAsset name={`${crop.id}-${stage}`} folder="crops" size={64}/><span>{i === 3 ? crop.readyLabel : stage}</span></li>)}</ol></article>)}</div><ScienceDrawer /></section>;
}
