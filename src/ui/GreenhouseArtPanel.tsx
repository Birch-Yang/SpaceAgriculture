'use client';
import { cropArt, type CropArtId, type CropArtStage } from '../content/crop-art';
import type { Setting } from '../game/state/types';
import { Panel, PixelAsset } from './primitives';
import s from './ui.module.css';
// Presentation adapter for the requested roster. This never casts art IDs to CropKind.
export type GreenhouseArtPanelProps = {
  crop: CropArtId;
  stage: CropArtStage;
  settings: { water: Setting; light: Setting; temperature: Setting };
  canCollect: boolean;
  disabledReason?: string;
  onCropIntent: (crop: CropArtId) => void;
  onSettingIntent: (key: 'water' | 'light' | 'temperature', value: Setting) => void;
  onCollectIntent: () => void;
};
export function GreenhouseArtPanel({ crop, stage, settings, canCollect, disabledReason, onCropIntent, onSettingIntent, onCollectIntent }: GreenhouseArtPanelProps) {
  const entry = cropArt.find(item => item.id === crop)!;
  return <div data-crop-preview><Panel title="Greenhouse" eyebrow="Growing bay / crop presentation"><div className={s.row}><div><h3 data-crop-label>{entry.label}</h3><p className={s.muted}>{stage === 'ready' ? entry.readyLabel : stage}</p></div><PixelAsset name={`${crop}-${stage}`} folder="crops" size={64}/></div><fieldset className={s.fieldset} disabled={!!disabledReason}><label className={s.field}>Crop<select data-crop-choice value={crop} onChange={event => onCropIntent(event.target.value as CropArtId)}>{cropArt.map(item => <option key={item.id} value={item.id}>{item.label}{item.id === 'arabidopsis' ? ' · research' : ''}</option>)}</select></label>{(['water','light','temperature'] as const).map(key => <label key={key} className={s.field}>{key}<select value={settings[key]} onChange={event => onSettingIntent(key, event.target.value as Setting)}>{(['low','medium','high'] as const).map(value => <option key={value} value={value}>{value}</option>)}</select></label>)}<button data-crop-collect className={s.button} disabled={!canCollect} onClick={onCollectIntent}>{crop === 'arabidopsis' ? 'Collect sample' : 'Harvest crop'}</button></fieldset>{disabledReason && <p>{disabledReason}</p>}</Panel></div>;
}
