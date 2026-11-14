import React from 'react';
import type { KelParentTrendBucket } from '../lib/kelParentTrend';

type Props = {
  kind: 'mood' | 'behavior';
  buckets: readonly KelParentTrendBucket[];
  period: 'recent' | 'year';
};

/** Static inline SVG: screen and Chrome's real A4 print render identical data. */
export default function KELParentTrendChart({ kind, buckets, period }: Props) {
  const observed = buckets.filter(bucket => kind === 'mood' ? bucket.moodAverage !== null : bucket.behaviorCount > 0);
  if (observed.length < 2 || buckets.length < 2) return null;
  const x = (index: number) => 30 + (index + 0.5) * 278 / buckets.length;
  const moodY = (average: number) => 12 + ((average - 1) / 4) * 43;
  const maxBehavior = Math.max(1, ...buckets.map(bucket => bucket.behaviorCount));
  const unit = period === 'recent' ? 'Woche' : 'Monat';

  return (
    <div data-kel-trend={kind} className="mt-2 border-t border-slate-100 pt-1.5">
      <p className="mb-0.5 text-[11px] font-bold text-slate-700">
        {kind === 'mood' ? 'Befinden im Zeitverlauf' : 'Dokumentation im Zeitverlauf'}
      </p>
      {kind === 'mood' ? (
        <svg data-kel-mood-trend role="img"
          aria-label={`Durchschnitt der tatsächlichen Befindens-Einschätzungen je ${unit}, Skala 1 sehr gut bis 5 schlecht. Zeiträume ohne Rückmeldung bleiben Lücken.`}
          viewBox="0 0 320 82" className="block h-[72px] w-full" preserveAspectRatio="none">
          {[1, 3, 5].map(level => (
            <g key={level}>
              <line x1="24" x2="314" y1={moodY(level)} y2={moodY(level)} stroke="#e2e8f0" strokeWidth="1"/>
              <text x="17" y={moodY(level) + 3} textAnchor="end" fontSize="9" fill="#64748b">{level}</text>
            </g>
          ))}
          {buckets.map((bucket, index) => {
            const previous = index > 0 ? buckets[index - 1] : undefined;
            const current = bucket.moodAverage;
            return (
              <g key={bucket.key}>
                {current !== null && previous?.moodAverage != null && (
                  <line x1={x(index - 1)} y1={moodY(previous.moodAverage)}
                    x2={x(index)} y2={moodY(current)} stroke="#0f766e" strokeWidth="2.5"/>
                )}
                {current !== null && (
                  <circle cx={x(index)} cy={moodY(current)} r="3.5" fill="#0f766e"
                    stroke="#ffffff" strokeWidth="1.3"/>
                )}
                <text x={x(index)} y="76" textAnchor="middle" fontSize={buckets.length > 9 ? '8' : '9'} fill="#475569">
                  {bucket.label}
                </text>
              </g>
            );
          })}
        </svg>
      ) : (
        <svg data-kel-behavior-trend role="img"
          aria-label={`Anzahl dokumentierter Verhaltenstageswerte je ${unit}; kein Urteil über das Verhalten des Kindes.`}
          viewBox="0 0 320 82" className="block h-[72px] w-full" preserveAspectRatio="none">
          <line x1="24" x2="314" y1="58" y2="58" stroke="#cbd5e1" strokeWidth="1"/>
          {buckets.map((bucket, index) => {
            const height = bucket.behaviorCount / maxBehavior * 38;
            return (
              <g key={bucket.key}>
                {bucket.behaviorCount > 0 && (
                  <>
                    <rect x={x(index) - Math.min(12, 115 / buckets.length)}
                      y={58 - height} width={Math.min(24, 230 / buckets.length)}
                      height={height} rx="2" fill="#64748b"/>
                    <text x={x(index)} y={Math.max(10, 55 - height)}
                      textAnchor="middle" fontSize="9" fontWeight="600" fill="#334155">
                      {bucket.behaviorCount}
                    </text>
                  </>
                )}
                <text x={x(index)} y="76" textAnchor="middle" fontSize={buckets.length > 9 ? '8' : '9'} fill="#475569">
                  {bucket.label}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      <p className="text-[11px] leading-snug text-slate-500">
        {kind === 'mood'
          ? `Mittelwert der tatsächlich erfassten Selbsteinschätzungen je ${unit}. Leere Abschnitte sind keine Rückmeldung; 1 = sehr gut, 5 = schlecht.`
          : `Anzahl dokumentierter Tageswerte je ${unit}. Weniger Einträge bedeuten nicht automatisch besseres Verhalten; die Dokumentationshäufigkeit kann schwanken.`}
      </p>
    </div>
  );
}
