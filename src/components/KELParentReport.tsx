import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { getDossierOverviewStats } from '../lib/dossierOverviewStats';
import { getStudentNotes } from '../lib/studentMetrics';
import { getStudentSubjectParticipationSummary } from '../lib/studentParticipation';
import { getStudentAssessmentDomainPerformance } from '../lib/assessmentDomainPerformance';

export interface KELParentReportOptions {
  period: 'recent' | 'year';
  showMood: boolean;
  showBehavior: boolean;
  showParticipation: boolean;
  showLearning: boolean;
  showNotes: boolean;
  showSignatures: boolean;
  subjects: string[];
  sharedNoteIds: string[];
}

const COLORS = ['#0d9488', '#4f46e5', '#c67e4c', '#7c3aed'];
const fmt = (number: number) => number.toLocaleString('de-AT', { maximumFractionDigits: 1 });
const tidy = (input: unknown) => typeof input === 'string' ? input.trim() : '';

function Section({ title, detail, children }: { title: string; detail?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 break-inside-avoid">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-[10px] font-black uppercase tracking-[0.09em] text-slate-800">{title}</h3>
        {detail && <span className="text-[9px] text-slate-500">{detail}</span>}
      </div>
      {children}
    </section>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="min-h-7 border-b border-dashed border-slate-300 py-1 text-[10px] leading-snug text-slate-700">{children}</p>;
}

/** Read-only, parent-safe A4 sheet; no changes to the original classroom records. */
export default function KELParentReport({
  studentId, options,
}: {
  studentId: string;
  options: KELParentReportOptions;
}) {
  const { app } = useApp();
  const student = app.schueler.find(child => child.id === studentId);
  const stats = useMemo(
    () => getDossierOverviewStats(app, studentId, options.period),
    [app, studentId, options.period],
  );
  const notes = useMemo(
    () => getStudentNotes(app, studentId),
    [app, studentId],
  );
  const approvedNotes = options.showNotes
    ? notes.filter((note: any) => typeof note.id === 'string' && options.sharedNoteIds.includes(note.id))
    : [];
  const strengths = approvedNotes.filter((note: any) => note.art === 'positiv' || note.kategorie === 'Erfolg');
  const nextSteps = approvedNotes.filter((note: any) => note.art === 'beobachten');
  const otherNotes = approvedNotes.filter((note: any) => !strengths.includes(note) && !nextSteps.includes(note));

  const moodSamples = stats.weeks.reduce((count, week) => count + week.moodCount, 0);
  const moodSum = stats.weeks.reduce((sum, week) =>
    sum + (typeof week.mood === 'number' && Number.isFinite(week.mood) ? week.mood * week.moodCount : 0), 0);
  const moodAverage = moodSamples > 0 ? moodSum / moodSamples : null;
  const moodLabels = ['sehr gut', 'gut', 'okay', 'nicht so gut', 'schlecht'];
  const roundedMood = moodAverage === null ? null : Math.max(1, Math.min(5, Math.round(moodAverage)));

  const behaviorRows = stats.stages.map((stage: any) => ({
    id: String(stage.id),
    label: tidy(stage.label) || 'Beobachtung',
    count: stats.logs.filter(log => log.iconId === stage.id).length,
    color: typeof stage.color === 'string' ? stage.color : '#64748b',
  })).filter(row => row.count > 0);
  const behaviorTotal = behaviorRows.reduce((sum, row) => sum + row.count, 0);

  const participation = options.subjects.map(subject => ({
    subject,
    ...getStudentSubjectParticipationSummary(app, studentId, subject, '1'),
  })).filter(row => row.hasData);

  const learning = options.subjects.map(subject => ({
    subject,
    rows: getStudentAssessmentDomainPerformance(app, studentId, subject, '1'),
  }));
  const rangeTitle = options.period === 'recent' ? 'Letzte 6 Wochen' : 'Bisheriges Schuljahr';

  if (!student) return <p>Kein Kind aus der aktiven Klasse ausgewählt.</p>;

  return (
    <article data-kel-parent-report data-kel-parent-student-id={student.id}
      className="mx-auto w-full max-w-[186mm] bg-white text-slate-900 font-sans [print-color-adjust:exact]">
      <header className="mb-3 border-b-2 border-[#d6e5e5] pb-3">
        <div className="mb-1 flex items-center justify-between text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#0f766e]">
          <span>KLASSIO · KEL-Gespräch</span><span>Befinden &amp; Verhalten: {rangeTitle}</span>
        </div>
        <h1 className="text-[22px] leading-tight font-black tracking-tight text-slate-950">Lern- &amp; Entwicklungsübersicht</h1>
        <p className="mt-1 text-[12px] font-semibold text-slate-700">{student.vorname} {student.nachname}</p>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[9px] text-slate-600">
          <span>Klasse: {app.klassenbezeichnung || '—'}</span>
          <span>Schuljahr: {app.schuljahr || '—'}</span>
          <span>Schule: {app.schulName || '—'}</span>
          <span>Gespräch am: {new Date().toLocaleDateString('de-AT')}</span>
          <span>Lehrperson: {[app.anrede, app.nachname].filter(Boolean).join(' ') || '—'}</span>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2.5">
        {options.showMood && (
          <Section title="Befinden" detail={moodSamples + ' Rückmeldungen'}>
            {moodAverage === null ? (
              <p className="text-[10px] text-slate-500">Noch keine Befindens-Rückmeldungen im Zeitraum.</p>
            ) : (
              <>
                <div className="flex items-center gap-1.5" role="img"
                  aria-label={'Befinden: gerundeter Mittelwert ' + fmt(moodAverage) + ' auf einer Skala von 1 (sehr gut) bis 5 (schlecht)'}>
                  {moodLabels.map((label, index) => (
                    <span key={label} aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-black"
                      style={index + 1 === roundedMood
                        ? { backgroundColor: '#cdece6', borderColor: '#0f766e', color: '#115e59' }
                        : { backgroundColor: '#f8fafc', borderColor: '#cbd5e1', color: '#94a3b8' }}>
                      {index + 1}
                    </span>
                  ))}
                </div>
                <p className="mt-1.5 text-[10px] font-semibold text-slate-700">
                  Durchschnitt {fmt(moodAverage)} / 5 · {moodLabels[roundedMood! - 1]}
                </p>
                <p className="text-[8px] text-slate-500">1 = sehr gut, 5 = schlecht · Selbsteinschätzungen, kein Urteil</p>
              </>
            )}
          </Section>
        )}

        {options.showBehavior && (
          <Section title="Verhalten &amp; Sozialverhalten" detail={behaviorTotal + ' Einträge'}>
            {behaviorTotal === 0 ? (
              <p className="text-[10px] text-slate-500">Keine dokumentierten Verhaltensereignisse im Zeitraum.</p>
            ) : (
              <div className="space-y-1.5">
                {behaviorRows.slice(0, 5).map(row => (
                  <div key={row.id}>
                    <div className="flex justify-between gap-2 text-[9px] text-slate-700">
                      <span className="truncate">{row.label}</span><strong>{row.count}</strong>
                    </div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: (row.count / behaviorTotal * 100) + '%', backgroundColor: row.color }}/>
                    </div>
                  </div>
                ))}
                <p className="text-[8px] text-slate-500">Häufigkeit dokumentierter Einträge, keine Persönlichkeitsnote</p>
              </div>
            )}
          </Section>
        )}

        {options.showParticipation && (
          <Section title="Mitarbeit &amp; Arbeitsverhalten" detail="Ganzes Schuljahr">
            {participation.length === 0 ? (
              <p className="text-[10px] text-slate-500">Keine Mitarbeitspunkte in den gewählten Fächern dokumentiert.</p>
            ) : (
              <div className="space-y-1.5">
                {participation.map(row => (
                  <div key={row.subject} className="flex items-baseline justify-between gap-2 border-b border-slate-100 pb-1 text-[10px]">
                    <span className="text-slate-700">{row.subject}</span>
                    <span className="font-bold tabular-nums text-slate-900">{row.total} Punkte</span>
                  </div>
                ))}
                <p className="text-[8px] text-slate-500">Gespeicherte Schuljahres-Punkte; nicht zwischen Fächern vergleichbar</p>
              </div>
            )}
          </Section>
        )}

        {options.showLearning && (
          <Section title="Lernen" detail="Bewertete Teilbereiche">
            {learning.every(subject => subject.rows.length === 0) ? (
              <p className="text-[10px] text-slate-500">Noch keine auswertbaren Lernbereiche mit zugeordneten Bewertungen.</p>
            ) : (
              <div className="space-y-2">
                {learning.map(subject => subject.rows.length > 0 && (
                  <div key={subject.subject}>
                    <p className="mb-1 text-[9px] font-extrabold text-slate-700">{subject.subject}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {subject.rows.slice(0, 4).map((row, index) => {
                        const percentage = Math.min(100, Math.max(0, row.percent));
                        const color = COLORS[index % COLORS.length];
                        return (
                          <div key={row.area} className="flex items-center gap-1.5">
                            <svg aria-label={row.area + ': ' + fmt(row.percent) + '% aus ' + row.assessments + ' Nachweisen'}
                              role="img" viewBox="0 0 40 40" className="h-9 w-9 shrink-0">
                              <circle cx="20" cy="20" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="6"/>
                              <circle cx="20" cy="20" r="15.9" fill="none" stroke={color} strokeWidth="6"
                                strokeDasharray={percentage + ' ' + (100 - percentage)} pathLength="100"
                                transform="rotate(-90 20 20)"/>
                              <text x="20" y="22.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="#0f172a">
                                {Math.round(percentage)}%
                              </text>
                            </svg>
                            <div className="min-w-0">
                              <p className="break-words text-[9px] font-semibold leading-tight text-slate-700">{row.area}</p>
                              <p className="text-[8px] text-slate-500">{row.assessments} Nachweise</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <p className="text-[8px] text-slate-500">Rechnerischer Mittelwert erfasster Leistungen; keine vollständige Kompetenzdiagnose</p>
              </div>
            )}
          </Section>
        )}
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <Section title="Das gelingt schon gut">
          {strengths.length
            ? strengths.map((note: any) => <EmptyLine key={note.id}>{tidy(note.inhalt)}</EmptyLine>)
            : <><EmptyLine> </EmptyLine><EmptyLine> </EmptyLine></>}
        </Section>
        <Section title="Daran arbeiten wir weiter">
          {nextSteps.length
            ? nextSteps.map((note: any) => <EmptyLine key={note.id}>{tidy(note.inhalt)}</EmptyLine>)
            : <><EmptyLine> </EmptyLine><EmptyLine> </EmptyLine></>}
        </Section>
      </div>

      <div className="mt-2.5">
        <Section title="Gesprächsnotizen &amp; Vereinbarungen" detail="Platz zum Ergänzen">
          {otherNotes.map((note: any) => (
            <p key={note.id} className="mb-1.5 whitespace-pre-wrap break-words text-[10px] text-slate-700">{tidy(note.inhalt)}</p>
          ))}
          <EmptyLine> </EmptyLine><EmptyLine> </EmptyLine>
        </Section>
      </div>

      {options.showSignatures && (
        <div className="mt-5 grid grid-cols-2 gap-8 text-[9px] text-slate-600">
          <div className="border-t border-slate-400 pt-1">Erziehungsberechtigte</div>
          <div className="border-t border-slate-400 pt-1">Lehrperson</div>
        </div>
      )}
      <p className="mt-3 text-[8px] text-slate-500">
        Persönliche Beobachtungen werden nur nach ausdrücklicher Auswahl übernommen. Ohne Daten keine geschätzten Bewertungen.
      </p>
    </article>
  );
}
