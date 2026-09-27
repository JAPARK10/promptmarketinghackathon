'use client';
import { Slider } from '@/components/ui/slider';
import { PRIORITY_BUDGET, SUCCESSOR_TRAITS, allocatePriority, type SuccessorPriorities } from '@/lib/assessment';

export default function SuccessorPrioritiesPanel({value,onChange}:{value:SuccessorPriorities;onChange?:(value:SuccessorPriorities)=>void}) {
  const total=Object.values(value).reduce((sum,n)=>sum+n,0);
  return <section className="successor-priorities" aria-label="Successor priorities">
    <h3>What matters in your next owner?</h3>
    <p>{onChange?'Allocate up to 20 points across these priorities. Each slider goes from 0 to 10.':'The owner’s priorities for a future buyer. Higher points mean greater importance.'}</p>
    <div className="priority-budget" aria-live="polite"><strong>{total} / {PRIORITY_BUDGET} points allocated</strong>{onChange&&<span>{PRIORITY_BUDGET-total} remaining</span>}</div>
    {SUCCESSOR_TRAITS.map(({key,label})=><div className="priority-row" key={key}>
      <div><label id={'priority-'+key}>{label}</label><strong>{value[key]} / 10</strong></div>
      {onChange?<Slider ref={node=>{node?.querySelector('[role="slider"]')?.setAttribute('aria-label',label)}} aria-labelledby={'priority-'+key} value={[value[key]]} min={0} max={10} step={1} onValueChange={([n])=>onChange(allocatePriority(value,key,n))}/>:<meter aria-labelledby={'priority-'+key} min={0} max={10} value={value[key]}/>}
    </div>)}
    {onChange&&<p className="hint">To increase a priority when the budget is full, lower another first. These priorities are visible whenever you share your profile with buyers.</p>}
  </section>;
}
