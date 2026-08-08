import React, { useEffect, useMemo, useState } from 'react';
import Markdown from 'react-markdown';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileQuestion,
  HeartHandshake,
  Loader2,
  MonitorPlay,
  Sparkles,
  Target
} from 'lucide-react';
import { Student } from '../../types';
import { FAECHER_ALLE } from '../../constants';
import { useApp } from '../../context/AppContext';
import { generateParentDiagnosticSummary } from '../../services/aiService';
import {
  getStudentAttendanceSummary,
  getStudentGradeSummary,
  getStudentNotes
} from '../../lib/studentMetrics';
import {
  getDiagnosticTestName,
  getValidStudentDiagnostics,
  isDiagnosticAlert
} from '../../lib/diagnosticData';

interface DossierElternReportProps {
  student: Student;
  onStartPresentation?: () => void;
  semester?: '1' | '2';
  onSemesterChange?: (semester: '1' | '2') => void;
}

const formatDate = (value?: string) => {
  if (!value) return 'nicht erfasst';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function DossierElternReport({ student, onStartPresentation, semester, onSemesterChange }: DossierElternReportProps) {
  const { app } = useApp();
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportStyle, setReportStyle] = useState('Aufbauend & Motivierend');
  const [selectedSemester, setSelectedSemester] = useState<'1' | '2'>(semester || '2');

  useEffect(() => {
    if (semester) setSelectedSemester(semester);
  }, [semester]);

  const diagnostics = useMemo(
    () => getValidStudentDiagnostics(app, student.id)
      .sort((a: any, b: any) => new Date(b.datum || 0).getTime() - new Date(a.datum || 0).getTime()),
    [app, student.id]
  );
  const diagnosticAlerts = diagnostics.filter(isDiagnosticAlert);
  const diagnosticsWithoutAlert = diagnostics.filter(entry => !isDiagnosticAlert(entry));
  const subjects = FAECHER_ALLE.filter(subject => !app.faecher || app.faecher.includes(subject));
  const grades = getStudentGradeSummary(app, student.id, subjects, selectedSemester);
  const attendance = getStudentAttendanceSummary(app, student.id);
  const notes = getStudentNotes(app, student.id);

  const strengths = (student.foerderprofil?.staerken || []).filter(Boolean);
  const activeSupportGoals = (student.foerderprofil?.foerderziele || [])
    .filter(goal => goal.status === 'offen' || goal.status === 'in Arbeit');
  const linkedDiagnosticIds = new Set(
    activeSupportGoals.map(goal => goal.diagnostikErhebungId).filter(Boolean)
  );
  const unlinkedDiagnosticAlerts = diagnosticAlerts.filter(entry => !linkedDiagnosticIds.has(entry.id));
  const activeSupportGoalIds = new Set(activeSupportGoals.map(goal => goal.id));
  const supportMeasures = (student.foerderprofil?.massnahmen || [])
    .filter(measure => !measure.zielId || activeSupportGoalIds.has(measure.zielId));
  const activePersonalGoals = (app.schuelerGoals || [])
    .filter((goal: any) => goal.schuelerId === student.id && goal.status === 'aktiv');
  const latestKel = (app.kelGespraeche || [])
    .filter((item: any) => item.schuelerId === student.id)
    .sort((a: any, b: any) => new Date(b.datum || 0).getTime() - new Date(a.datum || 0).getTime())[0];
  const kelGoals = latestKel?.zieleKind || [];
  const hasAnyData = Boolean(
    grades.hasData ||
    attendance.hasData ||
    notes.length ||
    diagnostics.length ||
    strengths.length ||
    activeSupportGoals.length ||
    activePersonalGoals.length ||
    latestKel
  );
  const hasRecommendationBasis = supportMeasures.length > 0 || activeSupportGoals.length > 0 || activePersonalGoals.length > 0 || kelGoals.length > 0;

  useEffect(() => {
    const cached = localStorage.getItem(`ai_parent_report_v2_${student.id}_${selectedSemester}`);
    setAiSummary(cached || null);
  }, [student.id, selectedSemester]);

  const handleGenerateAISummary = async () => {
    if (diagnostics.length === 0) return;
    setIsGenerating(true);
    try {
      const data = diagnostics.map(entry => {
        let text = `- Erhebung "${getDiagnosticTestName(entry.testId, app.diagnostikTests || [])}" am ${formatDate(entry.datum)}
  Ergebnis: ${entry.ergebniswert}
  Einordnung: ${isDiagnosticAlert(entry) ? 'pädagogischer Prüfhinweis' : 'kein Prüfhinweis nach dem hinterlegten Grenzwert'}`;
        if (entry.kommentar) text += `\n  Beobachtung der Lehrperson: ${entry.kommentar}`;
        return text;
      }).join('\n\n');

      const result = await generateParentDiagnosticSummary(student.vorname, data, reportStyle);
      if (result) {
        setAiSummary(result);
        localStorage.setItem(`ai_parent_report_v2_${student.id}_${selectedSemester}`, result);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const focusItems = [
    ...unlinkedDiagnosticAlerts.map(entry => ({
      id: `diagnostic-${entry.id}`,
      title: getDiagnosticTestName(entry.testId, app.diagnostikTests || []),
      text: entry.kommentar || 'Dieses Ergebnis wird im Gespräch gemeinsam pädagogisch eingeordnet.',
      label: 'Ergebnis prüfen'
    })),
    ...activeSupportGoals.map(goal => ({
      id: `support-${goal.id}`,
      title: goal.ziel,
      text: goal.notiz || (goal.zielDatum ? `Zieltermin: ${formatDate(goal.zielDatum)}` : 'Aktives Förderziel'),
      label: goal.status
    })),
    ...activePersonalGoals.map((goal: any) => ({
      id: `personal-${goal.id}`,
      title: goal.zielText,
      text: goal.bereich === 'schule' ? 'Schulisches Ziel' : 'Persönliches Ziel',
      label: 'Aktives Ziel'
    })),
    ...kelGoals.map((goal: any) => ({
      id: `kel-${goal.id}`,
      title: goal.ziel,
      text: goal.woranErkennbar || (goal.bisWann ? `Bis ${formatDate(goal.bisWann)}` : 'Im KEL-Gespräch vereinbart'),
      label: 'KEL-Ziel'
    }))
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 print:hidden lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-indigo-600">Elternverständlich</div>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Gesprächsblatt für Eltern</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Belegte Stärken, nächste Lernschritte und gemeinsame Vereinbarungen auf einer Seite.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedSemester}
            onChange={event => {
              const next = event.target.value as '1' | '2';
              setSelectedSemester(next);
              onSemesterChange?.(next);
            }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Semester für Elternbericht auswählen"
          >
            <option value="1">1. Semester</option>
            <option value="2">2. Semester</option>
          </select>
          {onStartPresentation && (
            <button
              type="button"
              onClick={onStartPresentation}
              className="flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-black text-white hover:bg-slate-800"
            >
              <MonitorPlay size={16} />
              KEL-Präsentation starten
            </button>
          )}
          <select
            value={reportStyle}
            onChange={event => setReportStyle(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Stil des KI-Berichts"
          >
            <option value="Aufbauend & Motivierend">Aufbauend & motivierend</option>
            <option value="Sachlich & Kurz">Sachlich & kurz</option>
            <option value="Sehr formell">Sehr formell</option>
          </select>
          <button
            type="button"
            onClick={handleGenerateAISummary}
            disabled={isGenerating || diagnostics.length === 0}
            title={diagnostics.length === 0 ? 'Erst nach einer dokumentierten Diagnostik verfügbar' : 'Formulierungshilfe aus dokumentierten Ergebnissen erstellen'}
            className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Formulierungshilfe
          </button>
        </div>
      </div>

      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg print:border-none print:p-0 print:shadow-none sm:p-8 lg:p-10">
        <header className="flex flex-col gap-5 border-b-2 border-slate-900 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Lern- und Entwicklungsgespräch</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Gemeinsam auf den Lernweg schauen</h1>
            <p className="mt-2 text-lg font-bold text-slate-600">{student.vorname} {student.nachname}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-slate-500">
              <span>{[app.stufe ? `${app.stufe}. Klasse` : '', app.klassenbezeichnung].filter(Boolean).join(' · ') || 'Klasse nicht erfasst'}</span>
              <span>Schuljahr {app.schuljahr || 'nicht erfasst'}</span>
              <span>{selectedSemester}. Semester</span>
              <span>Stand: {new Date().toLocaleDateString('de-AT')}</span>
            </div>
          </div>
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-900 bg-slate-100 text-2xl font-black text-slate-400">
            {student.foto ? (
              <img src={student.foto} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <>{student.vorname.charAt(0)}{student.nachname.charAt(0)}</>
            )}
          </div>
        </header>

        {!hasAnyData && (
          <section className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <FileQuestion className="mt-0.5 shrink-0 text-amber-700" size={22} />
              <div>
                <h2 className="font-black text-amber-950">Noch keine Grundlage für einen Lernstandsbericht</h2>
                <p className="mt-1 text-sm font-medium leading-relaxed text-amber-900">
                  Für {student.vorname} wurden noch keine Leistungen, Beobachtungen, Ziele oder diagnostischen Ergebnisse dokumentiert.
                  Deshalb enthält dieses Blatt bewusst keine Bewertung. Ergänze zuerst belegbare Einträge und öffne den Bericht anschließend erneut.
                </p>
              </div>
            </div>
          </section>
        )}

        {hasAnyData && (
          <p className="mt-7 text-base font-medium leading-relaxed text-slate-700">
            Liebe Eltern von {student.vorname}, dieses Blatt fasst die aktuell in der Schule dokumentierten Beobachtungen zusammen.
            Es dient als Gesprächsgrundlage: Wir schauen gemeinsam darauf, was bereits gelingt, woran wir als Nächstes arbeiten
            und wie Schule und Familie sinnvoll unterstützen können.
          </p>
        )}

        <section className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <BarChart3 size={18} className="text-indigo-600" />
            <div className="mt-3 text-[0.65rem] font-black uppercase tracking-wider text-slate-400">Lernleistungen · {selectedSemester}. Semester</div>
            <div className="mt-1 text-base font-black text-slate-900">
              {grades.hasData ? `${grades.gradedSubjects} ${grades.gradedSubjects === 1 ? 'Fach' : 'Fächer'} dokumentiert` : 'Noch nicht dokumentiert'}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <CalendarDays size={18} className="text-sky-600" />
            <div className="mt-3 text-[0.65rem] font-black uppercase tracking-wider text-slate-400">Anwesenheit</div>
            <div className="mt-1 text-base font-black text-slate-900">
              {attendance.hasData ? `${attendance.total} Fehlstunden erfasst` : 'Noch nicht dokumentiert'}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <Target size={18} className="text-emerald-600" />
            <div className="mt-3 text-[0.65rem] font-black uppercase tracking-wider text-slate-400">Gemeinsame Ziele</div>
            <div className="mt-1 text-base font-black text-slate-900">
              {focusItems.length ? `${focusItems.length} ${focusItems.length === 1 ? 'Punkt' : 'Punkte'} im Fokus` : 'Noch nicht vereinbart'}
            </div>
          </div>
        </section>

        {isGenerating && (
          <section className="mt-8 flex min-h-48 flex-col items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 p-7 text-center">
            <Loader2 size={32} className="animate-spin text-indigo-600" />
            <p className="mt-3 text-sm font-black text-indigo-900">Formulierungshilfe wird aus den dokumentierten Ergebnissen erstellt …</p>
          </section>
        )}

        {aiSummary && !isGenerating && (
          <section className="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-6">
            <div className="prose prose-slate max-w-none text-sm leading-relaxed">
              <Markdown>{aiSummary}</Markdown>
            </div>
            <button
              type="button"
              onClick={() => {
                setAiSummary(null);
                localStorage.removeItem(`ai_parent_report_v2_${student.id}_${selectedSemester}`);
              }}
              className="mt-5 text-xs font-black text-slate-500 hover:text-rose-700 print:hidden"
            >
              Formulierungshilfe verwerfen
            </button>
          </section>
        )}

        {!aiSummary && !isGenerating && (
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
              <h2 className="flex items-center gap-2 text-lg font-black text-emerald-950">
                <CheckCircle2 size={20} />
                Was bereits gelingt
              </h2>
              <div className="mt-4 space-y-3">
                {strengths.length > 0 && strengths.map((strength, index) => (
                  <div key={`${strength}-${index}`} className="rounded-xl bg-white p-3 text-sm font-bold text-slate-800 shadow-sm">
                    {strength}
                  </div>
                ))}
                {diagnosticsWithoutAlert.length > 0 && diagnosticsWithoutAlert.slice(0, 3).map(entry => (
                  <div key={entry.id} className="rounded-xl bg-white p-3 shadow-sm">
                    <div className="text-sm font-black text-slate-800">
                      {getDiagnosticTestName(entry.testId, app.diagnostikTests || [])}
                    </div>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">
                      {entry.kommentar || 'Bei dieser Erhebung wurde nach dem hinterlegten Grenzwert kein Prüfhinweis ausgelöst.'}
                    </p>
                  </div>
                ))}
                {strengths.length === 0 && diagnosticsWithoutAlert.length === 0 && (
                  <p className="text-sm font-medium italic text-emerald-900">
                    Noch keine belegbaren Stärken im Dossier beschrieben. Diese werden im Gespräch gemeinsam ergänzt.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
              <h2 className="flex items-center gap-2 text-lg font-black text-amber-950">
                <Target size={20} />
                Woran wir als Nächstes arbeiten
              </h2>
              <div className="mt-4 space-y-3">
                {focusItems.length > 0 ? focusItems.slice(0, 5).map(item => (
                  <div key={item.id} className="rounded-xl bg-white p-3 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="text-sm font-black text-slate-800">{item.title}</div>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-wider text-amber-800">
                        {item.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">{item.text}</p>
                  </div>
                )) : (
                  <p className="text-sm font-medium italic text-amber-900">
                    Noch kein gemeinsames Entwicklungsziel vereinbart. Ohne dokumentierte Grundlage wird kein Förderbedarf angenommen.
                  </p>
                )}
              </div>
            </section>
          </div>
        )}

        <section className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
          <h2 className="flex items-center gap-2 text-lg font-black text-indigo-950">
            <HeartHandshake size={21} />
            So unterstützen wir gemeinsam
          </h2>
          {supportMeasures.length > 0 ? (
            <div className="mt-4 space-y-3">
              {supportMeasures.slice(0, 4).map(measure => {
                const linkedGoal = activeSupportGoals.find(goal => goal.id === measure.zielId);
                return (
                  <div key={measure.id} className="rounded-xl border border-indigo-100 bg-white p-3">
                    <div className="text-sm font-black text-slate-900">
                      {measure.bezeichnung || 'Vereinbarte Unterstützung'}
                    </div>
                    {measure.beschreibung && (
                      <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">{measure.beschreibung}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.625rem] font-bold text-indigo-700">
                      {linkedGoal && <span>Passend zum Ziel: {linkedGoal.ziel}</span>}
                      {measure.kontrollDatum && <span>Gemeinsamer Rückblick: {formatDate(measure.kontrollDatum)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : hasRecommendationBasis ? (
            <p className="mt-3 text-sm font-medium leading-relaxed text-indigo-900">
              Zu den dokumentierten Zielen wurde noch keine konkrete gemeinsame Unterstützung festgehalten.
              Diese wird im Gespräch passend zu {student.vorname}s Lernweg vereinbart.
            </p>
          ) : (
            <p className="mt-3 text-sm font-medium leading-relaxed text-indigo-900">
              Eine Empfehlung für zu Hause wird erst gemeinsam festgelegt, wenn ein konkretes Ziel dokumentiert ist.
              So bleibt die Unterstützung passend und nachvollziehbar.
            </p>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-slate-300 p-5">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
            <ClipboardCheck size={20} className="text-slate-600" />
            Unsere Vereinbarung
          </h2>
          <div className="mt-4 min-h-20 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-medium text-slate-600">
            {latestKel?.vereinbarungen || 'Wird im gemeinsamen Gespräch konkret und in verständlichen Worten festgehalten.'}
          </div>
          {latestKel?.naechsterTermin && (
            <div className="mt-3 flex items-center gap-2 text-xs font-black text-slate-600">
              Nächster gemeinsamer Blick: {formatDate(latestKel.naechsterTermin)}
            </div>
          )}
        </section>

        <footer className="mt-10 grid gap-8 border-t border-slate-200 pt-8 sm:grid-cols-3">
          {['Ort, Datum', 'Unterschrift Erziehungsberechtigte', 'Unterschrift Lehrperson'].map(label => (
            <div key={label} className="pt-8 text-center">
              <div className="border-b border-slate-400" />
              <span className="mt-2 block text-[0.65rem] font-black uppercase tracking-wider text-slate-500">{label}</span>
            </div>
          ))}
        </footer>
      </article>

      {!hasAnyData && (
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-600 print:hidden">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-slate-500" />
          <p>
            Der Bericht bleibt absichtlich neutral. Sobald Einträge im Dossier vorhanden sind, werden die passenden Bereiche automatisch befüllt.
          </p>
        </div>
      )}
    </div>
  );
}
