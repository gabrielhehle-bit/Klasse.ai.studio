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
  strengthsText: string;
  goalsText: string;
  agreementsText: string;
}

const COLORS = ['#0d9488', '#4f46e5', '#c67e4c', '#7c3aed'];
const fmt = (number: number) => number.toLocaleString('de-AT', { maximumFractionDigits: 1 });
const tidy = (input: unknown) => typeof input === 'string' ? input.trim() : '';

function Section({ title, detail, children }: { title: string; detail?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 break-inside-avoid">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-[12px] font-black uppercase tracking-[0.09em] text-slate-800">{title}</h3>
        {detail && <span className="text-[11px] text-slate-500">{detail}</span>}
      </div>
      {children}
    </section>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="min-h-7 border-b border-dashed border-slate-300 py-1 text-[12px] leading-snug text-slate-700">{children}</p>;
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
  // These parent-facing lines are written explicitly for this print session.
  // They never modify private pupil observations or become permanent records.
  const splitPrintLines = (text: string) => text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const strengthLines = splitPrintLines(options.strengthsText);
  const goalLines = splitPrintLines(options.goalsText);
  const agreementLines = splitPrintLines(options.agreementsText);

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

  const participation = options.subjects.map(subject => {
    const first = getStudentSubjectParticipationSummary(app, studentId, subject, '1');
    const second = getStudentSubjectParticipationSummary(app, studentId, subject, '2');
    return {
      subject,
      total: first.total + second.total,
      hasData: first.hasData || second.hasData,
    };
  }).filter(row => row.hasData);

  const learning = options.subjects.map(subject => ({
    subject,
    rows: getStudentAssessmentDomainPerformance(app, studentId, subject, 'both'),
  }));
  const rangeTitle = options.period === 'recent' ? 'Letzte 6 Wochen' : 'Bisheriges Schuljahr';

  if (!student) return <p>Kein Kind aus der aktiven Klasse ausgewählt.</p>;

  return (
    <article data-kel-parent-report data-kel-parent-student-id={student.id}
      className="mx-auto w-full max-w-[186mm] bg-white text-slate-900 font-sans [print-color-adjust:exact]">
      <div data-kel-report-head className="mb-3 border-b-2 border-[#d6e5e5] pb-3">
        <div className="mb-1 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0f766e]">
          <span>KLASSIO · KEL-Gespräch</span><span>Befinden &amp; Verhalten: {rangeTitle}</span>
        </div>
        <h1 className="text-[22px] leading-tight font-black tracking-tight text-slate-950">Lern- &amp; Entwicklungsübersicht</h1>
        <p className="mt-1 text-[14px] font-semibold text-slate-700">{student.vorname} {student.nachname}</p>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-slate-600">
          <span>Klasse: {app.klassenbezeichnung || '—'}</span>
          <span>Schuljahr: {app.schuljahr || '—'}</span>
          <span>Schule: {app.schulName || '—'}</span>
          <span>Gespräch am: {new Date().toLocaleDateString('de-AT')}</span>
          <span>Lehrperson: {[app.anrede, app.nachname].filter(Boolean).join(' ') || '—'}</span>
        </div>
      </div>

      <div data-kel-summary-grid className="grid grid-cols-2 gap-2.5">
        {options.showMood && (
          <Section title="Befinden" detail={moodSamples + ' Rückmeldungen'}>
            {moodAverage === null ? (
              <p className="text-[12px] text-slate-500">Noch keine Befindens-Rückmeldungen im Zeitraum.</p>
            ) : (
              <>
                <div className="flex items-center gap-1.5" role="img"
                  aria-label={'Befinden: gerundeter Mittelwert ' + fmt(moodAverage) + ' auf einer Skala von 1 (sehr gut) bis 5 (schlecht)'}>
                  {moodLabels.map((label, index) => (
                    <span key={label} aria-hidden="true" data-kel-mood-selected={index + 1 === roundedMood ? "true" : "false"} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[12px] font-black"
                      style={index + 1 === roundedMood
                        ? { backgroundColor: '#cdece6', borderColor: '#0f766e', color: '#115e59' }
                        : { backgroundColor: '#f8fafc', borderColor: '#cbd5e1', color: '#94a3b8' }}>
                      {index + 1}
                    </span>
                  ))}
                </div>
                <p className="mt-1.5 text-[14px] font-semibold text-slate-700">
                  Durchschnitt {fmt(moodAverage)} / 5 · {moodLabels[roundedMood! - 1]}
                </p>
                <p className="text-[11px] text-slate-500">1 = sehr gut, 5 = schlecht · Selbsteinschätzungen, kein Urteil</p>
              </>
            )}
          </Section>
        )}

        {options.showBehavior && (
          <Section title="Verhalten &amp; Sozialverhalten" detail={behaviorTotal + ' Einträge'}>
            {behaviorTotal === 0 ? (
              <p className="text-[12px] text-slate-500">Keine dokumentierten Verhaltensereignisse im Zeitraum.</p>
            ) : (
              <div className="space-y-1.5">
                {behaviorRows.slice(0, 5).map(row => (
                  <div key={row.id}>
                    <div className="flex justify-between gap-2 text-[11px] text-slate-700">
                      <span className="truncate">{row.label}</span><strong>{row.count}</strong>
                    </div>
                    <svg data-kel-behavior-bar role="img" aria-label={row.label + ': ' + row.count + ' von ' + behaviorTotal + ' Verhaltensbeobachtungen'}
                      viewBox="0 0 100 6" preserveAspectRatio="none" className="mt-0.5 block h-[6px] w-full">
                      <rect x="0" y="0" width="100" height="6" rx="3" fill="#e2e8f0" />
                      <rect x="0" y="0" width={row.count / behaviorTotal * 100} height="6" rx="3" fill={row.color} />
                    </svg>
                  </div>
                ))}
                <p className="text-[11px] text-slate-500">Häufigkeit dokumentierter Einträge, keine Persönlichkeitsnote</p>
              </div>
            )}
          </Section>
        )}

        {options.showParticipation && (
          <Section title="Mitarbeit &amp; Arbeitsverhalten" detail="Ganzes Schuljahr">
            {participation.length === 0 ? (
              <p className="text-[12px] text-slate-500">Keine Mitarbeitspunkte in den gewählten Fächern dokumentiert.</p>
            ) : (
              <div className="space-y-1.5">
                {participation.map(row => (
                  <div key={row.subject} className="flex items-baseline justify-between gap-2 border-b border-slate-100 pb-1 text-[12px]">
                    <span className="text-slate-700">{row.subject}</span>
                    <span className="font-bold tabular-nums text-slate-900">{row.total} {row.total === 1 ? 'Punkt' : 'Punkte'}</span>
                  </div>
                ))}
                <p className="text-[11px] text-slate-500">Gespeicherte Schuljahres-Punkte; nicht zwischen Fächern vergleichbar</p>
              </div>
            )}
          </Section>
        )}

        {options.showLearning && (
          <Section title="Lernen" detail="Beide Semester">
            {learning.every(subject => subject.rows.length === 0) ? (
              <p className="text-[12px] text-slate-500">Noch keine auswertbaren Lernbereiche mit zugeordneten Bewertungen.</p>
            ) : (
              <div className="space-y-2">
                {learning.map(subject => subject.rows.length > 0 && (
                  <div key={subject.subject}>
                    <p className="mb-1 text-[11px] font-extrabold text-slate-700">{subject.subject}{subject.rows.length > 4 && <span className="ml-1 font-normal text-slate-500">(4 von {subject.rows.length} Bereichen – weitere im Dossier)</span>}</p>
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
                              <p className="break-words text-[11px] font-semibold leading-tight text-slate-700">{row.area}</p>
                              <p className="text-[11px] text-slate-500">{row.assessments} Nachweise</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <p className="text-[11px] text-slate-500">Rechnerischer Mittelwert erfasster Leistungen; keine vollständige Kompetenzdiagnose</p>
              </div>
            )}
          </Section>
        )}
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <Section title="Das gelingt schon gut">
          {strengthLines.map((line, index) => <EmptyLine key={'typed-strength-' + index}>{line}</EmptyLine>)}
          {strengths.map((note: any) => <EmptyLine key={note.id}>{tidy(note.inhalt)}</EmptyLine>)}
          {strengthLines.length === 0 && strengths.length === 0 && <><EmptyLine> </EmptyLine><EmptyLine> </EmptyLine></>}
        </Section>
        <Section title="Daran arbeiten wir weiter">
          {goalLines.map((line, index) => <EmptyLine key={'typed-goal-' + index}>{line}</EmptyLine>)}
          {nextSteps.map((note: any) => <EmptyLine key={note.id}>{tidy(note.inhalt)}</EmptyLine>)}
          {goalLines.length === 0 && nextSteps.length === 0 && <><EmptyLine> </EmptyLine><EmptyLine> </EmptyLine></>}
        </Section>
      </div>

      <div className="mt-2.5">
        <Section title="Gesprächsnotizen &amp; Vereinbarungen" detail="Platz zum Ergänzen">
          {agreementLines.map((line, index) => <EmptyLine key={'typed-agreement-' + index}>{line}</EmptyLine>)}
          {otherNotes.map((note: any) => (
            <p key={note.id} className="mb-1.5 whitespace-pre-wrap break-words text-[12px] text-slate-700">{tidy(note.inhalt)}</p>
          ))}
          <EmptyLine> </EmptyLine><EmptyLine> </EmptyLine>
        </Section>
      </div>

      {options.showSignatures && (
        <div className="mt-5 grid grid-cols-2 gap-8 text-[11px] text-slate-600">
          <div className="border-t border-slate-400 pt-1">Erziehungsberechtigte</div>
          <div className="border-t border-slate-400 pt-1">Lehrperson</div>
        </div>
      )}
      <p className="mt-3 text-[11px] text-slate-500">
        Persönliche Beobachtungen werden nur nach ausdrücklicher Auswahl übernommen. Ohne Daten keine geschätzten Bewertungen.
      </p>
    </article>
  );
}
