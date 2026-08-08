import React from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Heart,
  MessageSquareText,
  Sparkles,
  Stethoscope,
  Target,
  UserRound
} from 'lucide-react';
import { Student } from '../../types';
import { FAECHER_ALLE } from '../../constants';
import { useApp } from '../../context/AppContext';
import {
  getStudentAttendanceSummary,
  getStudentBehaviorSummary,
  getStudentGradeSummary,
  getStudentNotes
} from '../../lib/studentMetrics';
import {
  getDiagnosticTestName,
  getValidStudentDiagnostics,
  isDiagnosticAlert
} from '../../lib/diagnosticData';

interface DossierUebersichtProps {
  student: Student;
  onTabChange: (tab: any) => void;
  semester: '1' | '2';
}

const formatDate = (value?: string | number) => {
  if (!value) return 'Datum nicht erfasst';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const noteText = (note: any) =>
  note?.inhalt || note?.notiz || note?.text || note?.titel || 'Eintrag ohne Beschreibung';

export default function DossierUebersicht({ student, onTabChange, semester }: DossierUebersichtProps) {
  const { app } = useApp();
  const subjects = FAECHER_ALLE.filter(subject => !app.faecher || app.faecher.includes(subject));
  const grades = getStudentGradeSummary(app, student.id, subjects, semester);
  const attendance = getStudentAttendanceSummary(app, student.id);
  const behavior = getStudentBehaviorSummary(app, student.id);
  const notes = getStudentNotes(app, student.id);
  const diagnostics = getValidStudentDiagnostics(app, student.id)
    .sort((a: any, b: any) => new Date(b.datum || 0).getTime() - new Date(a.datum || 0).getTime());
  const diagnosticAlerts = diagnostics.filter(isDiagnosticAlert);

  const latestKel = (app.kelGespraeche || [])
    .filter((item: any) => item.schuelerId === student.id)
    .sort((a: any, b: any) => new Date(b.datum || 0).getTime() - new Date(a.datum || 0).getTime())[0];
  const isOverdue = (value?: string) =>
    Boolean(value) && new Date(`${value}T23:59:59`).getTime() < Date.now();

  const personalGoals = (app.schuelerGoals || [])
    .filter((goal: any) => goal.schuelerId === student.id && goal.status === 'aktiv')
    .map((goal: any) => ({
      id: `personal-${goal.id}`,
      text: goal.zielText,
      source: goal.bereich === 'schule' ? 'Schulisches Vorhaben' : 'Persönliches Vorhaben',
      detail: goal.datum ? `Aktiv seit ${formatDate(goal.datum)}` : 'Aktives Vorhaben',
      deadline: '',
      overdue: false,
      tab: 'diagnostik'
    }));
  const rawSupportGoals = (student.foerderprofil?.foerderziele || [])
    .filter(goal => goal.status === 'offen' || goal.status === 'in Arbeit');
  const supportGoals = rawSupportGoals
    .map(goal => ({
      id: `support-${goal.id}`,
      text: goal.ziel,
      source: 'Individuelles Förderziel',
      detail: goal.notiz || `Status: ${goal.status}`,
      deadline: goal.zielDatum,
      overdue: isOverdue(goal.zielDatum),
      tab: 'foerderprofil'
    }));
  const kelGoals = (latestKel?.zieleKind || []).map((goal: any) => ({
    id: `kel-${latestKel.id}-${goal.id}`,
    text: goal.ziel,
    source: 'KEL-Ziel',
    detail: goal.woranErkennbar || 'Im KEL-Gespräch vereinbart',
    deadline: goal.bisWann,
    overdue: isOverdue(goal.bisWann),
    tab: 'kel_reflexion'
  }));
  const openGoals = [...personalGoals, ...supportGoals, ...kelGoals]
    .sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return 0;
    });
  const overdueGoals = openGoals.filter(goal => goal.overdue);
  const linkedDiagnosticIds = new Set(
    rawSupportGoals.map(goal => goal.diagnostikErhebungId).filter(Boolean)
  );
  const unaddressedDiagnosticAlerts = diagnosticAlerts.filter(entry => !linkedDiagnosticIds.has(entry.id));
  const measures = student.foerderprofil?.massnahmen || [];
  const linkedGoalIds = new Set(measures.map(measure => measure.zielId).filter(Boolean));
  const goalsWithoutMeasure = rawSupportGoals.filter(goal => !linkedGoalIds.has(goal.id));
  const unlinkedMeasures = measures.filter(measure => !measure.zielId);
  const dueReviews = measures.filter(measure =>
    measure.kontrollDatum &&
    measure.wirksamkeit === 'unklar' &&
    new Date(`${measure.kontrollDatum}T23:59:59`).getTime() < Date.now()
  );
  const linkedMeasures = measures.filter(measure => measure.zielId);
  const workflowNextStep = unaddressedDiagnosticAlerts.length
    ? {
        title: 'Diagnostischen Hinweis prüfen',
        detail: 'Ergebnis einordnen und nur bei tatsächlichem Bedarf ein Förderziel ableiten.',
        action: 'Diagnostik öffnen',
        tab: 'diagnostik'
      }
    : unlinkedMeasures.length
      ? {
          title: 'Maßnahme einem Ziel zuordnen',
          detail: 'So bleibt nachvollziehbar, warum die Unterstützung eingesetzt wird.',
          action: 'Förderprofil öffnen',
          tab: 'foerderprofil'
        }
      : goalsWithoutMeasure.length
        ? {
            title: 'Passende Maßnahme festlegen',
            detail: 'Für ein aktives Förderziel ist noch keine konkrete Unterstützung hinterlegt.',
            action: 'Maßnahme ergänzen',
            tab: 'foerderprofil'
          }
        : dueReviews.length
          ? {
              title: 'Wirksamkeit rückblickend prüfen',
              detail: 'Mindestens ein Kontrolltermin ist erreicht und braucht eine Einschätzung.',
              action: 'Rückblick eintragen',
              tab: 'foerderprofil'
            }
          : rawSupportGoals.length
            ? {
                title: 'Förderweg ist vollständig verknüpft',
                detail: 'Ziele und Maßnahmen sind nachvollziehbar erfasst. Kontrolltermine im Blick behalten.',
                action: 'Förderweg ansehen',
                tab: 'foerderprofil'
              }
            : {
                title: 'Derzeit kein individueller Förderweg nötig',
                detail: 'Ein Förderziel wird nur angelegt, wenn Beobachtung oder Diagnostik einen konkreten Bedarf zeigen.',
                action: 'Förderprofil ansehen',
                tab: 'foerderprofil'
              };

  const recentActivities = [
    ...notes.map((note: any) => ({
      id: `note-${note.id || note.datum || note.timestamp}`,
      date: note.datum || note.timestamp,
      title: note.kategorie || note.titel || 'Pädagogische Notiz',
      text: noteText(note),
      type: 'Beobachtung',
      badge: 'Dokumentiert',
      tab: 'stats'
    })),
    ...diagnostics.map((entry: any) => ({
      id: `diagnostic-${entry.id}`,
      date: entry.datum,
      title: getDiagnosticTestName(entry.testId, app.diagnostikTests || []),
      text: linkedDiagnosticIds.has(entry.id)
        ? 'Ergebnis wurde mit einem individuellen Förderziel verknüpft.'
        : isDiagnosticAlert(entry)
        ? 'Ergebnis sollte noch pädagogisch geprüft werden.'
        : 'Diagnostische Erhebung dokumentiert.',
      type: 'Diagnostik',
      badge: linkedDiagnosticIds.has(entry.id)
        ? 'Mit Ziel verknüpft'
        : isDiagnosticAlert(entry)
          ? 'Prüfen'
          : 'Erfasst',
      tab: 'diagnostik'
    })),
    ...((app.kelGespraeche || [])
      .filter((item: any) => item.schuelerId === student.id)
      .map((item: any) => ({
        id: `kel-${item.id}`,
        date: item.datum,
        title: 'KEL-Gespräch',
        text: item.vereinbarungen || 'Gespräch und Einschätzungen dokumentiert.',
        type: 'KEL',
        badge: 'Gespräch',
        tab: 'kel_reflexion'
      }))),
    ...rawSupportGoals.map(goal => ({
      id: `support-goal-${goal.id}`,
      date: goal.startDatum,
      title: goal.ziel,
      text: goal.diagnostikErhebungId
        ? 'Individuelles Förderziel aus einer diagnostischen Erhebung abgeleitet.'
        : `Individuelles Förderziel im Bereich ${goal.bereich || 'Förderung'}.`,
      type: 'Förderziel',
      badge: goal.status,
      tab: 'foerderprofil'
    })),
    ...measures.map(measure => {
      const linkedGoal = rawSupportGoals.find(goal => goal.id === measure.zielId);
      return {
        id: `support-measure-${measure.id}`,
        date: measure.datum,
        title: measure.bezeichnung || measure.beschreibung || 'Fördermaßnahme',
        text: linkedGoal
          ? `Unterstützt das Ziel: ${linkedGoal.ziel}`
          : 'Maßnahme ist noch keinem Förderziel zugeordnet.',
        type: 'Maßnahme',
        badge: measure.wirksamkeit === 'unklar' ? 'Rückblick offen' : `Wirksamkeit: ${measure.wirksamkeit}`,
        tab: 'foerderprofil'
      };
    })
  ]
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    .slice(0, 6);

  const completedDataAreas = [
    grades.hasData,
    attendance.hasData,
    behavior.hasData || notes.length > 0,
    diagnostics.length > 0
  ].filter(Boolean).length;

  const cards = [
    {
      label: `Leistung · ${semester}. Sem.`,
      value: grades.hasData ? `Ø ${grades.average?.toFixed(2)}` : 'Noch keine Daten',
      detail: grades.hasData
        ? `${grades.gradedSubjects} ${grades.gradedSubjects === 1 ? 'Fach' : 'Fächer'} bewertet`
        : 'Notenmappe öffnen und Einträge ergänzen',
      icon: BarChart3,
      color: 'amber',
      tab: 'leistungen'
    },
    {
      label: 'Anwesenheit',
      value: attendance.hasData ? `${attendance.total} Fehlstunden` : 'Noch keine Daten',
      detail: attendance.hasData
        ? `${attendance.unexcused} unentschuldigt · ${attendance.recordedDays} erfasste Tage`
        : 'Keine Anwesenheitstage erfasst',
      icon: CalendarDays,
      color: 'sky',
      tab: 'stats'
    },
    {
      label: 'Beobachtungen',
      value: behavior.logs.length || notes.length
        ? `${behavior.logs.length + notes.length} Einträge`
        : 'Noch keine Daten',
      detail: behavior.hasData
        ? `Aktueller Status: ${behavior.stage?.label || 'erfasst'}`
        : 'Keine Bewertung ohne Beobachtung',
      icon: Activity,
      color: 'violet',
      tab: 'stats'
    },
    {
      label: 'Diagnostik',
      value: diagnostics.length ? `${diagnostics.length} Erhebungen` : 'Noch keine Daten',
      detail: unaddressedDiagnosticAlerts.length
        ? `${unaddressedDiagnosticAlerts.length} ${unaddressedDiagnosticAlerts.length === 1 ? 'Hinweis' : 'Hinweise'} noch prüfen`
        : diagnostics.length
          ? diagnosticAlerts.length
            ? 'Alle Auffälligkeiten einem Ziel zugeordnet'
            : 'Keine Auffälligkeit dokumentiert'
          : 'Keine Erhebung durchgeführt',
      icon: Stethoscope,
      color: unaddressedDiagnosticAlerts.length ? 'rose' : 'emerald',
      tab: 'diagnostik'
    }
  ];

  const colorClasses: Record<string, { icon: string; hover: string }> = {
    amber: { icon: 'bg-amber-50 text-amber-700', hover: 'hover:border-amber-300' },
    sky: { icon: 'bg-sky-50 text-sky-700', hover: 'hover:border-sky-300' },
    violet: { icon: 'bg-violet-50 text-violet-700', hover: 'hover:border-violet-300' },
    emerald: { icon: 'bg-emerald-50 text-emerald-700', hover: 'hover:border-emerald-300' },
    rose: { icon: 'bg-rose-50 text-rose-700', hover: 'hover:border-rose-300' }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-5 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-2xl">
            <div className="mb-2 flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-[0.18em] text-indigo-200">
              <Sparkles size={13} />
              Pädagogischer Überblick
            </div>
            <h2 className="text-xl font-black tracking-tight sm:text-2xl">
              Was ist bei {student.vorname} jetzt wichtig?
            </h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-300">
              Diese Übersicht zeigt nur tatsächlich erfasste Daten. Für Details wechselst du direkt in den passenden Bereich.
            </p>
          </div>
          <div className="min-w-[210px] rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-2xl font-black">{completedDataAreas}/4</div>
                <div className="mt-1 text-xs font-bold text-slate-300">Datenbereiche befüllt</div>
              </div>
              <ClipboardList className="text-indigo-300" size={24} />
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-indigo-400 transition-all"
                style={{ width: `${completedDataAreas * 25}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {unaddressedDiagnosticAlerts.length > 0 ? (
        <section className="flex flex-col gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-rose-950">
              {unaddressedDiagnosticAlerts.length} {unaddressedDiagnosticAlerts.length === 1 ? 'diagnostischer Hinweis' : 'diagnostische Hinweise'} offen
            </h3>
            <p className="mt-1 text-sm font-medium text-rose-800">
              Ergebnisse sind Hinweise und noch keine Diagnose. Bitte pädagogisch prüfen und gegebenenfalls ein Förderziel ableiten.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onTabChange('diagnostik')}
            className="flex items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-2.5 text-xs font-black text-white hover:bg-rose-800"
          >
            Hinweise prüfen <ArrowRight size={14} />
          </button>
        </section>
      ) : completedDataAreas === 0 ? (
        <section className="flex flex-col gap-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 sm:flex-row sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <UserRound size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-indigo-950">Dossier ist bereit für die ersten Einträge</h3>
            <p className="mt-1 text-sm font-medium text-indigo-800">
              Beginne mit Stammdaten oder einer pädagogischen Notiz. Es wird nichts automatisch bewertet.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onTabChange('stammdaten')}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-xs font-black text-white hover:bg-indigo-800"
          >
            Stammdaten ergänzen <ArrowRight size={14} />
          </button>
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-black text-slate-950">
              <Heart size={19} className="text-rose-600" />
              Förderweg
            </h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Vom pädagogischen Hinweis über das Ziel und die Maßnahme bis zum Rückblick.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[390px]">
            <div className="rounded-xl bg-indigo-50 px-3 py-2.5">
              <div className="text-lg font-black text-indigo-900">{rawSupportGoals.length}</div>
              <div className="text-[0.65rem] font-black uppercase tracking-wide text-indigo-600">aktive Ziele</div>
            </div>
            <div className="rounded-xl bg-emerald-50 px-3 py-2.5">
              <div className="text-lg font-black text-emerald-900">
                {linkedMeasures.length}/{measures.length}
              </div>
              <div className="text-[0.65rem] font-black uppercase tracking-wide text-emerald-600">zugeordnet</div>
            </div>
            <div className={`rounded-xl px-3 py-2.5 ${dueReviews.length ? 'bg-amber-50' : 'bg-slate-50'}`}>
              <div className={`text-lg font-black ${dueReviews.length ? 'text-amber-900' : 'text-slate-800'}`}>
                {dueReviews.length}
              </div>
              <div className={`text-[0.65rem] font-black uppercase tracking-wide ${dueReviews.length ? 'text-amber-700' : 'text-slate-500'}`}>
                Rückblicke fällig
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-700 shadow-sm">
            {unaddressedDiagnosticAlerts.length || unlinkedMeasures.length || goalsWithoutMeasure.length || dueReviews.length
              ? <AlertTriangle size={18} />
              : <CheckCircle2 size={18} />}
          </div>
          <div className="flex-1">
            <div className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-400">
              Nächster sinnvoller Schritt
            </div>
            <div className="mt-1 text-sm font-black text-slate-900">{workflowNextStep.title}</div>
            <p className="mt-0.5 text-xs font-medium leading-relaxed text-slate-600">{workflowNextStep.detail}</p>
          </div>
          <button
            type="button"
            onClick={() => onTabChange(workflowNextStep.tab)}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white hover:bg-slate-800"
          >
            {workflowNextStep.action} <ArrowRight size={14} />
          </button>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-950">Lernstand auf einen Blick</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">Kompakt, synchronisiert und ohne Schätzwerte.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(card => {
            const Icon = card.icon;
            const colors = colorClasses[card.color];
            return (
              <button
                key={card.label}
                type="button"
                onClick={() => onTabChange(card.tab)}
                className={`group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${colors.hover}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors.icon}`}>
                    <Icon size={18} />
                  </div>
                  <ArrowRight size={15} className="mt-1 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-600" />
                </div>
                <div className="mt-4 text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-400">{card.label}</div>
                <div className="mt-1 text-base font-black text-slate-900">{card.value}</div>
                <div className="mt-1.5 text-xs font-semibold leading-relaxed text-slate-500">{card.detail}</div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-black text-slate-950">
                <Target size={18} className="text-indigo-600" />
                Aktive Ziele
              </h3>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Gemeinsam priorisiert, aber nach Herkunft klar getrennt.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {overdueGoals.length > 0 && (
                <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[0.65rem] font-black text-rose-700">
                  {overdueGoals.length} überfällig
                </span>
              )}
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[0.65rem] font-black text-indigo-700">
                {openGoals.length} aktiv
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            {openGoals.length > 0 ? openGoals.slice(0, 4).map(goal => (
              <button
                key={goal.id}
                type="button"
                onClick={() => onTabChange(goal.tab)}
                className={`group flex w-full gap-3 rounded-xl border p-3 text-left transition-colors ${
                  goal.overdue
                    ? 'border-rose-200 bg-rose-50/70 hover:bg-rose-50'
                    : 'border-slate-100 bg-slate-50 hover:border-indigo-200 hover:bg-indigo-50/40'
                }`}
                aria-label={`${goal.source} öffnen: ${goal.text}`}
              >
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                  goal.overdue ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'
                }`}>
                  <Target size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[0.6rem] font-black uppercase tracking-wider text-indigo-600">
                      {goal.source}
                    </span>
                    {goal.deadline && (
                      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-black ${
                        goal.overdue ? 'bg-rose-100 text-rose-700' : 'bg-white text-slate-500'
                      }`}>
                        <CalendarDays size={10} />
                        {goal.overdue ? 'Überfällig · ' : 'Bis '}
                        {formatDate(goal.deadline)}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold leading-snug text-slate-800">{goal.text}</div>
                  <div className="mt-1 text-xs font-medium leading-relaxed text-slate-500">{goal.detail}</div>
                </div>
                <ArrowRight size={14} className="mt-2 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
              </button>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-center">
                <Target className="mx-auto text-slate-300" size={24} />
                <div className="mt-2 text-sm font-black text-slate-700">Noch kein aktives Ziel</div>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Lernziele können jederzeit erfasst werden. Individuelle Förderziele nur bei konkretem Bedarf.
                </p>
                <button
                  type="button"
                  onClick={() => onTabChange('lernziele')}
                  className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white hover:bg-slate-800"
                >
                  Lernziele öffnen
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-black text-slate-950">
                <MessageSquareText size={18} className="text-indigo-600" />
                Pädagogische Zeitleiste
              </h3>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Die neuesten Beobachtungen, Erhebungen, Ziele und Maßnahmen.
              </p>
            </div>
            {recentActivities.length > 0 && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.65rem] font-black text-slate-600">
                {recentActivities.length} zuletzt
              </span>
            )}
          </div>

          <div className="mt-4">
            {recentActivities.length > 0 ? (
              <div className="space-y-1">
                {recentActivities.map((activity, index) => (
                  <button
                    key={activity.id}
                    type="button"
                    onClick={() => onTabChange(activity.tab)}
                    className="group relative flex w-full gap-3 pb-4 text-left last:pb-0"
                    aria-label={`${activity.type} öffnen: ${activity.title}`}
                  >
                    {index < recentActivities.length - 1 && (
                      <div className="absolute left-[13px] top-7 h-[calc(100%-18px)] w-px bg-slate-200" />
                    )}
                    <div className="z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white transition-colors group-hover:border-indigo-300 group-hover:bg-indigo-50">
                      {activity.type === 'Diagnostik' ? <Stethoscope size={12} className="text-indigo-600" /> :
                        activity.type === 'KEL' ? <Heart size={12} className="text-rose-600" /> :
                          activity.type === 'Förderziel' ? <Target size={12} className="text-emerald-600" /> :
                            activity.type === 'Maßnahme' ? <CheckCircle2 size={12} className="text-amber-600" /> :
                          <FileText size={12} className="text-slate-600" />}
                    </div>
                    <div className="min-w-0 flex-1 rounded-xl px-2 py-1 transition-colors group-hover:bg-slate-50">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[0.6rem] font-black uppercase tracking-wider text-indigo-600">{activity.type}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6rem] font-bold text-slate-500">{activity.badge}</span>
                        <span className="text-[0.65rem] font-bold text-slate-400">{formatDate(activity.date)}</span>
                      </div>
                      <div className="mt-1 text-sm font-black leading-snug text-slate-800">{activity.title}</div>
                      <p className="mt-0.5 line-clamp-2 text-xs font-medium leading-relaxed text-slate-500">{activity.text}</p>
                    </div>
                    <ArrowRight size={14} className="mt-3 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-center">
                <FileText className="mx-auto text-slate-300" size={24} />
                <div className="mt-2 text-sm font-black text-slate-700">Noch keine Entwicklung dokumentiert</div>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Beobachtungen und Diagnostik erscheinen hier automatisch chronologisch.
                </p>
                <button
                  type="button"
                  onClick={() => onTabChange('stats')}
                  className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-100"
                >
                  Beobachtung erfassen
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
