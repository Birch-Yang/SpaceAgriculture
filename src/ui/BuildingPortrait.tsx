import { buildingFrame, buildingFrames } from '../content/world-art';
export function BuildingPortrait({ category, moduleId }: { category: string; moduleId: string }) {
  const frame = buildingFrames[buildingFrame(category, moduleId)];
  if (!frame) return null;
  const [x,y,w,h] = frame;
  const scale = 56 / w;
  return <span aria-hidden="true" style={{display:'inline-block',width:56,height:h*scale,overflow:'hidden',verticalAlign:'middle',position:'relative'}}><img src="/assets/pixel-v2/buildings.png" alt="" style={{position:'absolute',maxWidth:'none',width:1774*scale,height:887*scale,left:-x*scale,top:-y*scale,imageRendering:'pixelated'}} /></span>;
}
