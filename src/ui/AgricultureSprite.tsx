import type { AnimalKind, CropKind } from '../game/state/types';
/** Species portraits; maturity/failure is deliberately not inferred from cycle progress. */
export function AgricultureSprite({ crop, animal, ready = false }: { crop?: CropKind | null; animal?: AnimalKind | null; ready?: boolean }) {
  if (animal) {
    const column = { chicken: 0, pig: 1, cow: 2 }[animal];
    return <div role="img" aria-label={`${animal} species illustration`} style={{width:160,height:160,backgroundImage:'url(/assets/pixel-v2/livestock-stages.png)',backgroundSize:'300% 200%',backgroundPosition:`${column*50}% 100%`,imageRendering:'pixelated',border:'2px solid #987653',margin:'12px 0'}} />;
  }
  if (crop === 'wheat') return <img src="/assets/crops/wheat.svg" width={96} height={96} alt="Wheat species illustration" style={{imageRendering:'pixelated'}} />;
  if (crop) {
    const column = crop === 'lettuce' ? 0 : 3;
    return <div role="img" aria-label={`${crop} ${ready ? 'ready' : 'growing'} illustration`} style={{width:160,height:160,backgroundImage:'url(/assets/pixel-v2/crops.png)',backgroundSize:'600% 400%',backgroundPosition:`${column*20}% ${ready ? 100 : 200/3}%`,imageRendering:'pixelated',border:'2px solid #987653',margin:'12px 0'}} />;
  }
  return null;
}
