import { SanctuaryCharacter } from '../layout/SanctuaryCharacter';
export function EmptyState({onAdd,label='نضيف أول ذكرى؟'}:{onAdd:()=>void;label?:string}) {
  return <div className="ocean-empty-state"><div><SanctuaryCharacter mood="idle" gaze={0}/></div><p>لسه فيه مكان لحكاية جديدة.</p><button type="button" onClick={onAdd}>{label} <span>＋</span></button></div>;
}
