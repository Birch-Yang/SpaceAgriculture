import { AppFrame } from '../src/ui/integration/AppFrame';
import { GamePresentation } from '../src/ui/integration/GamePresentation';
import { ScienceDrawer } from '../src/ui/ScienceDrawer';
import s from '../src/ui/integration/integration.module.css';
export default function HomePage() {
  return <AppFrame wide><div className={s.intro}><p>DESIGN · FARM · SURVIVE · LEARN</p><p>A playable design-space exploration platform for lunar agriculture.</p></div><GamePresentation /><div className={s.content}><ScienceDrawer /></div></AppFrame>;
}
