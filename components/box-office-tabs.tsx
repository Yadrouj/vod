"use client";
import { useState, type ReactNode } from 'react';
export function BoxOfficeTabs({ iran, world, initial = 'iran' }: { iran: ReactNode; world: ReactNode; initial?: string }) {
  const [active, setActive] = useState(initial === 'world' ? 'world' : 'iran');
  return <section id="box-office" dir="rtl"><div role="tablist" aria-label="جدول فروش سینما" className="box-office-tabs">
    {(['iran', 'world'] as const).map(key => <button id={`box-tab-${key}`} type="button" key={key} role="tab" aria-selected={active === key} aria-controls={`box-panel-${key}`} tabIndex={active === key ? 0 : -1} onClick={() => setActive(key)} onKeyDown={event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 'iran' : event.key === 'End' ? 'world' : key === 'iran' ? 'world' : 'iran'; setActive(next); document.getElementById(`box-tab-${next}`)?.focus(); } }}>{key === 'iran' ? 'سینمای ایران' : 'سینمای جهان'}</button>)}
  </div><div role="tabpanel" id="box-panel-iran" aria-labelledby="box-tab-iran" hidden={active !== 'iran'}>{iran}</div><div role="tabpanel" id="box-panel-world" aria-labelledby="box-tab-world" hidden={active !== 'world'}>{world}</div></section>;
}
