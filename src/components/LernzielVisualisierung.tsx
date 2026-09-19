import React from 'react';
import { getLernzielModell, lernzielHaeufigkeiten, type LernzielAnsicht, type LernzielBewertungsmodell, type LernzielWertungen } from '../lib/lernzielBewertungsmodell';

interface Props {
  goalIds: string[];
  ratings: LernzielWertungen | undefined;
  model: LernzielBewertungsmodell;
  mode: LernzielAnsicht;
  title?: string;
}

export default function LernzielVisualisierung({ goalIds, ratings, model: raw, mode, title }: Props) {
  const model = getLernzielModell(raw);
  const summary = lernzielHaeufigkeiten(goalIds, ratings, model);
  const visible = summary.counts.filter(level => level.count > 0);
  const chartEntries = [...summary.counts, ...(summary.other ? [{ value: -1, label: 'Frühere, nicht zugeordnete Stufe', kurz: 'Alte Stufe', color: '#64748b', symbol: '•', count: summary.other }] : [])];
  const chartTotal = summary.assessed;
  const ringStops = chartEntries.reduce<{ end: number; slices: string[] }>((state, item) => {
    if (!chartTotal || !item.count) return state;
    const next = state.end + item.count / chartTotal * 100;
    return { end: next, slices: [...state.slices, item.color + ' ' + state.end.toFixed(3) + '% ' + next.toFixed(3) + '%'] };
  }, { end: 0, slices: [] });
  const labels = <div className="mt-3 flex flex-wrap gap-2" aria-label="Anzahl je Lernzielstatus">
    {chartEntries.filter(item => item.count > 0).map(item =>
      <span key={item.value} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700">
        <span aria-hidden style={{ backgroundColor: item.color }} className="inline-block h-2.5 w-2.5 rounded-full" />
        {item.label}: {item.count}
      </span>)}
    <span className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600">
      {model.emptyLabel}: {summary.unassessed}
    </span>
  </div>;

  return <section className="rounded-2xl border border-slate-200 bg-white p-4" aria-label={title || 'Lernzielübersicht'}>
    {title && <h4 className="mb-2 text-sm font-black text-slate-900">{title}</h4>}
    <p className="text-xs text-slate-600">{summary.assessed} von {summary.total} Lernzielen eingeschätzt.</p>
    {chartTotal === 0
      ? <p className="mt-3 text-sm text-slate-500">Für diese Auswahl liegen noch keine Einschätzungen vor.</p>
      : <>
        {mode === 'ring' && <div className="my-4 flex items-center justify-center">
          <div role="img" aria-label={'Verteilung der ' + chartTotal + ' eingeschätzten Lernziele, ohne nicht eingeschätzte Ziele'}
            className="flex h-36 w-36 items-center justify-center rounded-full"
            style={{ background: 'conic-gradient(' + ringStops.slices.join(',') + ')' }}>
            <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-white text-center">
              <strong className="text-xl text-slate-900">{chartTotal}</strong><small className="text-[10px] text-slate-600">eingeschätzt</small>
            </div>
          </div>
        </div>}
        {mode === 'blume' && <div className="my-4 flex justify-center">
          <svg viewBox="0 0 190 190" width="176" height="176" role="img"
            aria-label={'Blume als symbolische Darstellung der ' + visible.length + ' vertretenen Statusstufen. Die Mengen stehen in der Legende.'}>
            {summary.counts.map((level, index) => {
              const angle = index / model.levels.length * 360;
              const active = level.count > 0;
              return <ellipse key={level.value} cx="95" cy="49" rx="18" ry="39"
                fill={active ? level.color : '#e2e8f0'} stroke="#fff" strokeWidth="2"
                transform={'rotate(' + angle + ' 95 95)'} />;
            })}
            <circle cx="95" cy="95" r="22" fill="#fef08a" stroke="#ca8a04" strokeWidth="2" />
            <text x="95" y="99" textAnchor="middle" fontSize="12" fill="#713f12">{chartTotal}</text>
          </svg>
        </div>}
        {mode === 'sterne' && <div className="my-3 flex flex-wrap justify-center gap-3">
          {chartEntries.filter(item => item.count > 0).map(item =>
            <div key={item.value} className="flex flex-col items-center gap-1" title={item.label + ': ' + item.count}>
              <span aria-hidden="true" className="text-3xl" style={{ color: item.color }}>★</span>
              <span className="text-xs font-bold text-slate-700">{item.count}</span>
              <span className="max-w-28 text-center text-[10px] text-slate-500">{item.kurz}</span>
            </div>)}
        </div>}
        {mode === 'balken' && <div className="mt-3 space-y-2">
          {chartEntries.map(item => <div key={item.value} className="grid grid-cols-[minmax(0,8rem)_1fr_2rem] items-center gap-2">
            <span className="truncate text-xs text-slate-700" title={item.label}>{item.kurz}</span>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ width: chartTotal ? item.count / chartTotal * 100 + '%' : '0%', backgroundColor: item.color }} />
            </div>
            <strong className="text-right text-xs text-slate-800">{item.count}</strong>
          </div>)}
        </div>}
        {mode === 'tabelle' && <table className="mt-3 w-full text-left text-xs">
          <thead><tr><th scope="col" className="pb-2">Status</th><th scope="col" className="pb-2 text-right">Lernziele</th></tr></thead>
          <tbody>{chartEntries.map(item => <tr key={item.value} className="border-t border-slate-100">
            <th scope="row" className="py-1.5 font-medium" style={{ color: item.color }}>{item.label}</th>
            <td className="text-right">{item.count}</td>
          </tr>)}</tbody>
        </table>}
        {labels}
        <p className="mt-2 text-[11px] text-slate-500">Die Darstellung zeigt ausschließlich dokumentierte Lernziele und ist keine Schulnote, Diagnose oder automatische Gesamtbeurteilung. Nicht eingeschätzte Ziele sind nicht Teil der Diagramm-Anteile.</p>
      </>}
  </section>;
}
