import React, { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { useApp } from '../../context/AppContext';
import { getStudentAssessmentDomainPerformance } from '../../lib/assessmentDomainPerformance';

const PALETTE = ['#047857', '#2563eb', '#a16207', '#7c3aed', '#0f766e', '#be185d'] as const;

export default function AssessmentDomainDonuts({
  studentId, subject, semester = '1', compact = false, hideWhenEmpty = false,
}: {
  studentId: string;
  subject: string;
  semester?: '1' | '2' | 'both';
  compact?: boolean;
  hideWhenEmpty?: boolean;
}) {
  const { app } = useApp();
  const areas = useMemo(() =>
    getStudentAssessmentDomainPerformance(app, studentId, subject, semester),
    [app, studentId, subject, semester]);
  const maxVisible = compact ? 4 : 8;
  const visible = areas.slice(0, maxVisible);

  if (areas.length === 0 && hideWhenEmpty) return null;

  return (
    <section data-assessment-domain-donuts
      aria-label={`Leistungsnachweise nach Teilbereichen in ${subject}`}
      className="rounded-2xl border border-emerald-100 bg-white p-3 sm:p-4 print:break-inside-avoid">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className={`${compact ? 'text-sm' : 'text-base'} font-black text-slate-900`}>
            Lernbereiche in {subject}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Kreisdiagramme zeigen den rechnerischen Stand der tatsächlich erfassten
            Leistungen pro Teilbereich – keine vollständige Kompetenzdiagnose.
          </p>
        </div>
        {areas.length > 0 && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[0.68rem] font-bold text-emerald-800">
          {areas.length} {areas.length === 1 ? 'Bereich' : 'Bereiche'}
        </span>}
      </div>
      {!areas.length ? (
        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
          Noch keine bewerteten LZK, Wochenpläne oder Aufgaben mit zugeordnetem Teilbereich.
          Unterbereiche kannst du in der Notenmappe bei der jeweiligen Bewertung eintragen.
        </p>
      ) : (
        <>
          <div className={`mt-3 grid gap-2 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'}`}>
            {visible.map((row, index) => {
              const color = PALETTE[index % PALETTE.length];
              const percent = Math.max(0, Math.min(100, row.percent));
              const chart = [{ name: 'Leistungsstand', value: percent },
                { name: 'Rest zur Darstellung', value: 100 - percent }];
              const evidence = row.assessments === 1 ? '1 Nachweis' : `${row.assessments} Nachweise`;
              return (
                <div key={row.area} data-assessment-area={row.area}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/40 p-2.5">
                  <div className="relative h-24 w-24 shrink-0" role="img"
                    aria-label={`${row.area}: ${row.percent.toLocaleString('de-AT', { maximumFractionDigits: 1 })} Prozent aus ${evidence}`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chart} dataKey="value" cx="50%" cy="50%"
                          innerRadius={29} outerRadius={40} stroke="none" paddingAngle={0}
                          startAngle={90} endAngle={-270} isAnimationActive={false}>
                          <Cell fill={color}/>
                          <Cell fill="#e2e8f0"/>
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <span className="text-base font-black tabular-nums text-slate-900">{Math.round(percent)}%</span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-black text-slate-900">{row.area}</p>
                    <p className="mt-1 text-xs font-semibold tabular-nums text-slate-700">
                      {row.percent.toLocaleString('de-AT', { maximumFractionDigits: 1 })} % · {evidence}
                    </p>
                    <p className="mt-1 text-[0.68rem] text-slate-500">{row.categories.join(' · ')}</p>
                    {row.assessments < 2 && <p className="mt-1 text-[0.65rem] font-semibold text-amber-800">
                      Erst ein Nachweis: begrenzte Aussagekraft
                    </p>}
                  </div>
                </div>
              );
            })}
          </div>
          {areas.length > maxVisible && <p className="mt-2 text-xs text-slate-500">
            {areas.length - maxVisible} weitere Teilbereiche sind im Dossier erfasst.
          </p>}
          <p className="mt-3 text-[0.68rem] leading-relaxed text-slate-500">
            Die Kreise entsprechen dem mittleren normalisierten Leistungswert innerhalb des Teilbereichs.
            Noten (1–5) werden für die Darstellung linear umgerechnet; 0 Punkte bleiben 0 %.
            Nichtteilnahmen und fehlende Werte zählen nicht als Leistung. Kein Klassenvergleich.
          </p>
        </>
      )}
    </section>
  );
}
