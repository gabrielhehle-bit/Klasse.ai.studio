import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { getDossierOverviewStats } from '../lib/dossierOverviewStats';
import { getStudentNotes } from '../lib/studentMetrics';
import { getStudentSubjectYearParticipationSummary } from '../lib/studentParticipation';
import { getStudentAssessmentDomainPerformance } from '../lib/assessmentDomainPerformance';
import { summarizeKelMood, summarizeKelBehavior } from '../lib/kelParentReportMetrics';
import { selectKelParentLearningAreas } from '../lib/kelParentAreaSelection';
import { buildKelParentTrend } from '../lib/kelParentTrend';
import KELParentTrendChart from './KELParentTrendChart';

export interface KELParentReportOptions {
  period: 'recent' | 'year';
  showMood: boolean;
  showBehavior: boolean;
  showParticipation: boolean;
  showLearning: boolean;
  showNotes: boolean;
  showSignatures: boolean;
  subjects: string[];
  subjectAreas?: Record<string, string[]>;
  sharedNoteIds: string[];
  strengthsText: string;
  goalsText: string;
  agreementsText: string;
}

const COLORS = ['#0d9488', '#4f46e5', '#c67e4c', '#7c3aed'];
const fmt = (number: number) => number.toLocaleString('de-AT', { maximumFractionDigits: 1 });
const tidy = (input: unknown) => typeof input === 'string' ? input.trim() : '';

function Section({ title, detail, children, allowPageBreak = false }: { title: string; detail?: string; children: React.ReactNode; allowPageBreak?: boolean }) {
  return (
    <section data-kel-learning-section={allowPageBreak ? true : undefined}
      className={`rounded-xl border border-[#d8e3e5] bg-white p-3 ${allowPageBreak ? 'break-inside-auto' : 'break-inside-avoid'}`}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-[12px] font-extrabold uppercase tracking-[0.045em] text-slate-800">{title}</h3>
        {detail && <span className="text-[11px] text-slate-500">{detail}</span>}
      </div>
      {children}
    </section>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="min-h-7 border-b border-slate-200 py-1 text-[12px] leading-snug text-slate-700">{children}</p>;
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

  // Period-scoped source values, not reconstructed from weekly averages.
  const mood = summarizeKelMood(app.schuelerStimmung?.[studentId], stats.start, stats.today);
  const moodLabels = ['Sehr gut', 'Gut', 'Okay', 'Nicht so gut', 'Schlecht'];
  const moodColors = ['#047857', '#2563eb', '#64748b', '#d97706', '#be123c'];
  const behavior = summarizeKelBehavior(stats.logs, stats.stages);
  const behaviorRows = behavior.rows;
  const behaviorTotal = behavior.total;
  const trend = useMemo(() => buildKelParentTrend(
    options.period, stats.start, stats.today,
    app.schuelerStimmung?.[studentId], stats.logs, stats.stages,
  ), [app.schuelerStimmung, studentId, options.period, stats.start, stats.today, stats.logs, stats.stages]);

  const participation = options.subjects.map(subject => ({
    subject,
    ...getStudentSubjectYearParticipationSummary(app, studentId, subject),
  })).filter(row => row.hasData);

  const learning = options.subjects.map(subject => {
    const documented = getStudentAssessmentDomainPerformance(app, studentId, subject, 'both');
    const selected = options.subjectAreas?.[subject];
    return {
      subject,
      documentedCount: documented.length,
      rows: selectKelParentLearningAreas(documented, selected),
    };
  });
  const intentionallyHiddenAreas = learning.some(row => row.documentedCount > 0) &&
    learning.every(row => row.rows.length === 0);
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
          {app.schulName && <span>Schule: {app.schulName}</span>}
          <span>Gespräch am: {new Date().toLocaleDateString('de-AT')}</span>
          {(app.anrede || app.nachname) && <span>Lehrperson: {[app.anrede, app.nachname].filter(Boolean).join(' ')}</span>}
        </div>
      </div>

      <div data-kel-summary-grid className="grid grid-cols-2 gap-2.5">
        {options.showMood && (
          <Section title="Befinden" detail={mood.total + ' Rückmeldungen'}>
            {mood.average === null ? (
              <p className="text-[12px] text-slate-500">Noch keine Befindens-Rückmeldungen im Zeitraum.</p>
            ) : (
              <div data-kel-mood-distribution className="space-y-2">
                <p className="text-[12px] font-bold leading-snug text-slate-800">
                  {mood.positiveCount} von {mood.total} Einschätzungen waren gut oder sehr gut ({Math.round(mood.positiveCount / mood.total * 100)} %).
                </p>
                <svg data-kel-mood-bar role="img" aria-label={'Verteilung von ' + mood.total + ' Befindens-Einschätzungen'}
                  viewBox="0 0 100 10" preserveAspectRatio="none" className="block h-[10px] w-full">
                  <rect x="0" y="0" width="100" height="10" rx="3" fill="#e2e8f0" />
                  {mood.counts.map((count, index) => count > 0 && (
                    <rect key={index} x={mood.counts.slice(0, index).reduce((sum, n) => sum + n, 0) / mood.total * 100}
                      y="0" width={count / mood.total * 100} height="10" fill={moodColors[index]} />
                  ))}
                </svg>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {moodLabels.map((label, index) => (
                    <div key={label} data-kel-mood-row className="flex items-center justify-between gap-1 text-[11px] leading-tight text-slate-700">
                      <span className="flex min-w-0 items-center gap-1">
                        <span aria-hidden="true" className="inline-block h-2 w-2 shrink-0 rounded-sm"
                          style={{ backgroundColor: moodColors[index] }} />
                        <span>{label}</span>
                      </span>
                      <strong className="whitespace-nowrap tabular-nums">{mood.counts[index]} · {mood.percentages[index]} %</strong>
                    </div>
                  ))}
                </div>
                <KELParentTrendChart kind="mood" buckets={trend.buckets} period={options.period} />
                <p className="text-[11px] leading-snug text-slate-600">
                  Durchschnitt {fmt(mood.average)} / 5
                  {mood.mostFrequent ? ' · häufigste Antwort: ' + moodLabels[mood.mostFrequent - 1] : ''}
                </p>
                <p className="text-[11px] leading-snug text-slate-500">
                  Selbsteinschätzung des Kindes · 1 = sehr gut, 5 = schlecht · keine Diagnose
                </p>
              </div>
            )}
          </Section>
        )}

        {options.showBehavior && (
          <Section title="Verhalten &amp; Sozialverhalten" detail={behaviorTotal + ' Tageswerte'}>
            {behaviorTotal === 0 ? (
              <p className="text-[12px] text-slate-500">Keine dokumentierten Verhaltensereignisse im Zeitraum.</p>
            ) : (
              <div data-kel-behavior-distribution className="space-y-2">
                <p className="text-[12px] font-bold leading-snug text-slate-800">
                  {behavior.leading
                    ? 'Am häufigsten dokumentiert: ' + behavior.leading.label + ' (' + behavior.leading.count + ' von ' + behaviorTotal + ').'
                    : behaviorTotal + ' dokumentierte Tageswerte'}
                </p>
                <svg data-kel-behavior-bar role="img" aria-label={'Verteilung von ' + behaviorTotal + ' dokumentierten Verhaltenstageswerten'}
                  viewBox="0 0 100 10" preserveAspectRatio="none" className="block h-[10px] w-full">
                  <rect x="0" y="0" width="100" height="10" rx="3" fill="#e2e8f0" />
                  {behaviorRows.map((row, index) => (
                    <rect key={row.id}
                      x={behaviorRows.slice(0, index).reduce((sum, entry) => sum + entry.count, 0) / behaviorTotal * 100}
                      y="0" width={row.count / behaviorTotal * 100} height="10" fill={row.color} />
                  ))}
                </svg>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {behaviorRows.map(row => (
                    <div key={row.id} data-kel-behavior-row className="flex items-center justify-between gap-1 text-[11px] leading-tight text-slate-700">
                      <span className="flex min-w-0 items-center gap-1">
                        <span aria-hidden="true" className="inline-block h-2 w-2 shrink-0 rounded-sm"
                          style={{ backgroundColor: row.color }} />
                        <span className="break-words">{row.label}</span>
                      </span>
                      <strong className="whitespace-nowrap tabular-nums">{row.count} · {row.percent} %</strong>
                    </div>
                  ))}
                </div>
                <KELParentTrendChart kind="behavior" buckets={trend.buckets} period={options.period} behaviorRows={behaviorRows} />
                <p className="text-[11px] leading-snug text-slate-500">
                  Anteil an dokumentierten Tageswerten, nicht an allen Schultagen · keine Persönlichkeitsnote
                </p>
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
          <Section title="Lernen" detail="Ganzes Schuljahr" allowPageBreak>
            {learning.every(subject => subject.rows.length === 0) ? (
              <p className="text-[12px] text-slate-500">
                {intentionallyHiddenAreas
                  ? 'Für diesen Ausdruck wurden keine dokumentierten Lernbereiche ausgewählt.'
                  : 'Noch keine auswertbaren Lernbereiche mit zugeordneten Bewertungen.'}
              </p>
            ) : (
              <div className="space-y-2">
                {learning.map(subject => subject.rows.length > 0 && (
                  <div key={subject.subject}>
                    <p className="mb-1 text-[11px] font-extrabold text-slate-700">{subject.subject}{subject.documentedCount > subject.rows.length && <span className="ml-1 font-normal text-slate-500">({subject.rows.length} von {subject.documentedCount} Bereichen ausgewählt)</span>}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {subject.rows.map((row, index) => {
                        const percentage = Math.min(100, Math.max(0, row.percent));
                        const color = COLORS[index % COLORS.length];
                        return (
                          <div key={row.area} data-kel-learning-item data-kel-learning-area={row.area}
                            className="flex items-center gap-1.5 break-inside-avoid">
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
                <p data-kel-learning-scale-note className="text-[11px] leading-snug text-slate-500">
                  Angezeigt werden nur ausgewählte, tatsächlich bewertete Lernbereiche.
                  Prozentwerte sind rechnerische Mittelwerte der Nachweise (bei Noten auf einer Vergleichsskala),
                  keine vollständige Kompetenzdiagnose. Einzelne Nachweise erlauben noch keine verlässliche Tendenz.
                </p>
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
        <section data-kel-signatures className="mt-3 break-inside-avoid">
          <h3 className="mb-1.5 text-[12px] font-black uppercase tracking-wide text-slate-800">Bestätigung des Gesprächs</h3>
          <div className="grid grid-cols-2 gap-3">
            {['Erziehungsberechtigte', 'Lehrperson'].map(label => (
              <div key={label} data-kel-signature-field className="rounded-lg border border-slate-300 px-3 pt-2 pb-1">
                <p className="text-[12px] font-semibold text-slate-800">{label}</p>
                <div data-kel-signature-space aria-hidden="true" className="min-h-[34mm] border-b border-slate-400" />
                <p className="pt-1 text-[11px] text-slate-500">Unterschrift</p>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-end gap-3 text-[11px] text-slate-700">
            <span>Ort / Datum</span>
            <div className="h-4 flex-1 border-b border-slate-400" />
          </div>
        </section>
      )}
      <p className="mt-3 text-[11px] text-slate-500">
        Gesprächsgrundlage sind die dokumentierten Rückmeldungen und ausgewählten Lernnachweise. Die Übersicht ergänzt das persönliche Gespräch.
      </p>
    </article>
  );
}
