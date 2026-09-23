import React from 'react';

export interface FlowerPetal {
  label: string;
  /** Number of documented items, shown separately from the visual progress. */
  count: number;
  total: number;
  color: string;
  /** Optional 0..1 visual progress derived from the existing four goal ratings. */
  progress?: number;
}

const CENTER = 220;
const RADIUS = 174;
const point = (index: number, radius: number, axisCount: number) => {
  const angle = -Math.PI / 2 + index * 2 * Math.PI / axisCount;
  return [CENTER + radius * Math.cos(angle), CENTER + radius * Math.sin(angle)] as const;
};
const points = (values: readonly number[]) =>
  values.map((value, index) => point(index, value, values.length).join(',')).join(' ');

/**
 * A responsive 3–8 axis radar with a large, readable plot and adjacent legend.
 * Learning-goal progress is a display of existing assessments, not a school grade.
 * Grade axes visualise entry counts only, never the mark or a predicted ability.
 */
export default function PortfolioFlower({
  title, center, caption, petals, note, showDenominator = true,
}: {
  title: string;
  center: string;
  caption: string;
  petals: readonly FlowerPetal[];
  note: string;
  showDenominator?: boolean;
}) {
  const axes = petals.slice(0, 8);
  const progress = axes.map(petal => {
    const raw = petal.progress ?? (petal.total > 0 ? petal.count / petal.total : 0);
    return Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0;
  });
  const values = progress.map(value => value * RADIUS);

  return <div data-radar-layout="hero"
    className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
      <div className="min-w-0">
        <h3 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">{title}</h3>
        <p className="mt-1 text-sm font-medium text-slate-500">{caption}</p>
      </div>
      <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
        {axes.length} Achsen
      </span>
    </div>
    <div className="mt-4 grid min-w-0 items-center gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)] lg:gap-6">
      <div className="flex min-w-0 justify-center rounded-2xl bg-slate-50/70 px-1 py-3 sm:px-3">
        <svg viewBox="0 0 440 440" role="img"
          aria-label={'Spinnennetzdiagramm ' + title + ': ' + axes.map((petal, index) =>
            petal.label + ' ' + petal.count + (showDenominator ? ' von ' + petal.total + ' eingeschätzt' : ' Einträge') +
            (showDenominator ? ', Stand ' + Math.round(progress[index] * 100) + ' Prozent' : '')).join(', ')}
          className="aspect-square h-auto w-full max-w-[440px] shrink-0">
          {([1, 0.75, 0.5, 0.25] as const).map(step =>
            <polygon key={step} data-radar-grid={step} points={points(axes.map(() => RADIUS * step))}
              fill={step === 1 ? '#ffffff' : 'none'} stroke={step === 1 ? '#94a3b8' : '#cbd5e1'}
              strokeWidth={step === 1 ? 2 : 1.4} strokeDasharray={step === 1 ? undefined : '4 5'} />)}
          {axes.map((axis, index) => {
            const [x, y] = point(index, RADIUS, axes.length);
            return <line key={axis.label} x1={CENTER} y1={CENTER} x2={x} y2={y}
              stroke="#cbd5e1" strokeWidth="1.5" />;
          })}
          <polygon data-radar-shape points={points(values)} fill="#14b8a6"
            fillOpacity="0.26" stroke="#0f766e" strokeWidth="3.5" strokeLinejoin="round" />
          {axes.map((axis, index) => {
            const [x, y] = point(index, values[index], axes.length);
            const [labelX, labelY] = point(index, 205, axes.length);
            return <g key={axis.label}>
              <line x1={CENTER} y1={CENTER} x2={x} y2={y}
                stroke={axis.color} strokeWidth="3.5" strokeLinecap="round" />
              <circle data-radar-axis={axis.label} data-radar-progress={progress[index].toFixed(3)}
                cx={x} cy={y} r="6.5" fill={axis.color} stroke="white" strokeWidth="2">
                <title>{axis.label}: {axis.count}{showDenominator ? ' von ' + axis.total +
                  ' eingeschätzt, Stand ' + Math.round(progress[index] * 100) + ' %' : ' Einträge'}</title>
              </circle>
              <circle cx={labelX} cy={labelY} r="13" fill="white" stroke={axis.color} strokeWidth="1.5" aria-hidden="true" />
              <text x={labelX} y={labelY + 4.5} textAnchor="middle" fontSize="12"
                fontWeight="800" fill={axis.color} aria-hidden="true">{index + 1}</text>
            </g>;
          })}
          <circle cx={CENTER} cy={CENTER} r="33" fill="white" stroke="#cbd5e1" strokeWidth="2" />
          <text x={CENTER} y={CENTER + 2} textAnchor="middle" fontSize={center.length > 5 ? 16 : 19}
            fontWeight="800" fill="#0f172a">{center}</text>
          <text x={CENTER} y={CENTER + 17} textAnchor="middle" fontSize="8.5" fill="#475569">
            {showDenominator ? 'Ziele' : 'Einträge'}
          </text>
        </svg>
      </div>
      <div className="min-w-0">
        <h4 className="mb-3 text-sm font-black text-slate-800">
          {showDenominator ? 'Lernbereiche im Überblick' : 'Leistungsarten im Überblick'}
        </h4>
        <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {axes.map((axis, index) => <div key={axis.label}
            className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
            <div className="flex min-w-0 items-start gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                style={{ backgroundColor: axis.color }} aria-hidden="true">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-bold leading-snug text-slate-900">{axis.label}</p>
                <p className="mt-0.5 text-xs text-slate-600">{axis.count}{showDenominator
                  ? ' von ' + axis.total + ' eingeschätzt' : ' Einträge'}</p>
                {showDenominator && <div className="mt-2">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-slate-600">
                    <span>Lernstand</span>
                    <span className="font-bold">{axis.total ? Math.round(progress[index] * 100) + ' %' : 'keine Ziele'}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full transition-[width] duration-300"
                      style={{ width: (progress[index] * 100) + '%', backgroundColor: axis.color }} />
                  </div>
                </div>}
              </div>
            </div>
          </div>)}
        </div>
      </div>
    </div>
    <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500">{note}</p>
  </div>;
}
