import React from 'react';

export interface FlowerPetal {
  label: string;
  /** Number of documented items; intentionally not an attainment score. */
  count: number;
  total: number;
  color: string;
}

/**
 * Four soft petals grow radially from the central circle as entries are documented.
 * The length is a documentation visualisation, never a calculated school mark or
 * a diagnostic statement about the pupil's ability.
 */
export default function PortfolioFlower({
  title, center, caption, petals, note,
}: {
  title: string;
  center: string;
  caption: string;
  petals: readonly [FlowerPetal, FlowerPetal, FlowerPetal, FlowerPetal];
  note: string;
}) {
  return <div className="flex min-w-0 flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
    <h3 className="text-base font-black text-slate-900">{title}</h3>
    <svg viewBox="0 0 280 280" role="img"
      aria-label={'Blumenübersicht ' + title + ': ' + petals.map(petal =>
        petal.label + ' ' + petal.count + ' von ' + petal.total).join(', ')}
      className="my-1 h-52 w-52 max-w-full overflow-visible sm:h-60 sm:w-60">
      <defs>
        <radialGradient id={'klassio-flower-center-' + (title === 'Noten' ? 'grades' : 'goals')}>
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e0f2fe" />
        </radialGradient>
      </defs>
      {petals.map((petal, index) => {
        const fraction = petal.total > 0
          ? Math.min(1, Math.max(0, petal.count / petal.total)) : 0;
        const outerRadius = 29 + fraction * 66;
        const halfLength = (outerRadius - 23) / 2;
        const cy = 140 - 23 - halfLength;
        return <g key={petal.label} transform={'rotate(' + (index * 90) + ' 140 140)'}>
          <ellipse cx="140" cy="80.5" rx="24" ry="36.5"
            fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 3" />
          <ellipse data-flower-petal={petal.label} data-flower-progress={fraction.toFixed(3)}
            cx="140" cy={cy} rx={18 + fraction * 6} ry={halfLength}
            fill={petal.color} fillOpacity="0.83" stroke={petal.color} strokeWidth="1.5">
            <title>{petal.label}: {petal.count} von {petal.total} dokumentiert</title>
          </ellipse>
        </g>;
      })}
      <circle cx="140" cy="140" r="31" fill="#ffffff" stroke="#dbeafe" strokeWidth="3" />
      <circle cx="140" cy="140" r="26" fill={'url(#klassio-flower-center-' + (title === 'Noten' ? 'grades' : 'goals') + ')'} />
      <text x="140" y="143" textAnchor="middle" fontSize="15" fontWeight="800" fill="#0f172a">{center}</text>
      <text x="140" y="155" textAnchor="middle" fontSize="7" fill="#475569">{title}</text>
    </svg>
    <p className="text-xs font-semibold text-slate-600">{caption}</p>
    <div className="mt-3 grid w-full grid-cols-2 gap-2 text-left">
      {petals.map(petal => <div key={petal.label} className="rounded-xl bg-slate-50 px-2.5 py-2 text-xs text-slate-700">
        <div className="flex items-center gap-1.5 font-bold">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: petal.color }} aria-hidden="true" />
          <span className="break-words">{petal.label}</span>
        </div>
        <span className="ml-4 block text-slate-600">{petal.count} von {petal.total}</span>
      </div>)}
    </div>
    <p className="mt-3 text-[11px] leading-snug text-slate-500">{note}</p>
  </div>;
}
