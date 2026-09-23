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

const CENTER = 160;
const RADIUS = 102;
const point = (index: number, radius: number) => {
  const angle = -Math.PI / 2 + index * Math.PI / 2;
  return [CENTER + radius * Math.cos(angle), CENTER + radius * Math.sin(angle)] as const;
};
const points = (values: readonly number[]) =>
  values.map((value, index) => point(index, value).join(',')).join(' ');

/**
 * Four-axis radar / spider chart: each sharp, straight-edged tip points towards
 * its own subject area or assessment type, rather than forming flower petals.
 * The chart is a visualisation of explicitly recorded statuses or entry counts,
 * not a grade, diagnosis or automatically inferred student ability.
 */
export default function PortfolioFlower({
  title, center, caption, petals, note, showDenominator = true,
}: {
  title: string;
  center: string;
  caption: string;
  petals: readonly [FlowerPetal, FlowerPetal, FlowerPetal, FlowerPetal];
  note: string;
  showDenominator?: boolean;
}) {
  const progress = petals.map(petal => {
    const raw = petal.progress ?? (petal.total > 0 ? petal.count / petal.total : 0);
    return Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0;
  });
  const values = progress.map(value => value * RADIUS);

  return <div className="flex min-w-0 flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
    <h3 className="text-base font-black text-slate-900">{title}</h3>
    <svg viewBox="0 0 320 320" role="img"
      aria-label={'Spinnennetzdiagramm ' + title + ': ' + petals.map((petal, index) =>
        petal.label + ' ' + petal.count + (showDenominator ? ' von ' + petal.total + ' eingeschätzt' : ' Einträge') +
        (showDenominator ? ', Stand ' + Math.round(progress[index] * 100) + ' Prozent' : '')).join(', ')}
      className="my-1 h-52 w-52 max-w-full sm:h-60 sm:w-60">
      {([1, 0.75, 0.5, 0.25] as const).map(step =>
        <polygon key={step} data-radar-grid={step} points={points([0, 1, 2, 3].map(() => RADIUS * step))}
          fill={step === 1 ? '#f8fafc' : 'none'} stroke="#cbd5e1"
          strokeWidth={step === 1 ? 1.7 : 1} strokeDasharray={step === 1 ? undefined : '3 3'} />)}
      {[0, 1, 2, 3].map(index => {
        const [x, y] = point(index, RADIUS);
        return <line key={index} x1={CENTER} y1={CENTER} x2={x} y2={y}
          stroke="#cbd5e1" strokeWidth="1.5" />;
      })}
      <polygon data-radar-shape points={points(values)} fill="#14b8a6"
        fillOpacity="0.22" stroke="#0f766e" strokeWidth="2.5"
        strokeLinejoin="round" />
      {petals.map((petal, index) => {
        const [x, y] = point(index, values[index]);
        const [labelX, labelY] = point(index, 139);
        return <g key={petal.label}>
          <line x1={CENTER} y1={CENTER} x2={x} y2={y}
            stroke={petal.color} strokeWidth="3" strokeLinecap="round" />
          <circle data-radar-axis={petal.label} data-radar-progress={progress[index].toFixed(3)}
            cx={x} cy={y} r="5" fill={petal.color} stroke="white" strokeWidth="1.5">
            <title>{petal.label}: {petal.count}{showDenominator ? ' von ' + petal.total +
              ' eingeschätzt, Stand ' + Math.round(progress[index] * 100) + ' %' : ' Einträge'}</title>
          </circle>
          <text x={labelX} y={labelY + 4} textAnchor="middle" fontSize="13"
            fontWeight="800" fill={petal.color} aria-hidden="true">{index + 1}</text>
        </g>;
      })}
      <circle cx={CENTER} cy={CENTER} r="27" fill="white" stroke="#cbd5e1" strokeWidth="2" />
      <text x={CENTER} y={CENTER + 2} textAnchor="middle" fontSize="15" fontWeight="800"
        fill="#0f172a">{center}</text>
      <text x={CENTER} y={CENTER + 14} textAnchor="middle" fontSize="7" fill="#475569">{title}</text>
    </svg>
    <p className="text-xs font-semibold text-slate-600">{caption}</p>
    <div className="mt-3 grid w-full grid-cols-2 gap-2 text-left">
      {petals.map((petal, index) => <div key={petal.label}
        className="rounded-xl bg-slate-50 px-2.5 py-2 text-xs text-slate-700">
        <div className="flex items-start gap-1.5 font-bold">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: petal.color }} aria-hidden="true">{index + 1}</span>
          <span className="break-words">{petal.label}</span>
        </div>
        <span className="mt-1 block text-slate-600">{petal.count}{showDenominator
          ? ' von ' + petal.total + ' eingeschätzt' : ' Einträge'}</span>
        {showDenominator && <span className="block text-slate-600">
          Stand laut Einschätzung: {petal.total ? Math.round(progress[index] * 100) + ' %' : 'keine Ziele'}
        </span>}
      </div>)}
    </div>
    <p className="mt-3 text-[11px] leading-snug text-slate-500">{note}</p>
  </div>;
}
