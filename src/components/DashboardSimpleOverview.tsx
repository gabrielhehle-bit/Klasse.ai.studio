import React, { useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Grid,
  Play,
  StickyNote,
  Users,
  Wallet,
} from 'lucide-react';
import type { DashboardTodayOverviewProps } from './DashboardTodayOverview';

export default function DashboardSimpleOverview(p: DashboardTodayOverviewProps) {
  const [showAllTasks, setShowAllTasks] = useState(false);
  const button = 'min-h-11 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]';
  const tasks = showAllTasks ? p.actionItems : p.actionItems.slice(0, 3);

  const primaryTarget =
    p.totalStudents === 0
      ? 'schueler'
      : p.freeDayGreeting
        ? 'wochenplanung'
        : p.attendanceRequired && !p.attendanceRecorded
          ? 'anwesenheit'
          : 'cockpit';

  const primaryLabel =
    p.totalStudents === 0
      ? 'Kinder hinzufügen'
      : p.freeDayGreeting
        ? 'Planung ansehen'
        : p.attendanceRequired && !p.attendanceRecorded
          ? 'Anwesenheit prüfen'
          : p.currentLesson
            ? 'Unterricht öffnen'
            : 'Unterricht starten';

  const attendanceValue =
    p.privacyMode
      ? '••'
      : p.totalStudents === 0
        ? 'Keine Kinder angelegt'
        : !p.attendanceRequired
          ? 'Heute nicht erforderlich'
          : p.attendanceRecorded
            ? `${p.presentCount} / ${p.totalStudents} anwesend`
            : 'Noch nicht geprüft';

  return (
    <section aria-label="Heute" className="space-y-5 text-slate-900">
      {p.freeDayGreeting && (
        <section role="status" aria-label="Wochenende, Ferien oder Feiertag"
          className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-5 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Eine kleine Auszeit</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">{p.freeDayGreeting.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{p.freeDayGreeting.message}</p>
          <p className="mt-3 text-xs text-slate-500">Deine Termine und offenen Aufgaben bleiben unten im Blick.</p>
        </section>
      )}
      <header className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-start gap-4">
          <div>
            <p className="text-sm font-medium text-slate-600">{p.klasseLabel || 'Deine Klasse'}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{p.greeting}</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">{p.dateLabel}</p>
          </div>

        </div>

        <div className="mt-6">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Jetzt</p>
          <button
            type="button"
            onClick={() => p.onNavigate(primaryTarget)}
            className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[var(--accent)] px-6 py-4 text-base font-semibold text-white transition hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:w-auto"
          >
            {primaryTarget === 'cockpit' ? <Play size={20} /> : primaryTarget === 'wochenplanung' ? <CalendarDays size={20} /> : <Users size={20} />}
            {primaryLabel}
            <ArrowRight size={18} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-5">
        <section
          aria-label="Heutiger Unterricht"
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent)]">Heute</p>
              <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold">
                <CalendarDays size={20} className="text-indigo-600" />
                Dein Unterricht
              </h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {p.freeDayGreeting ? 'Schulfrei' : `${p.todayLessonsList.length} ${p.todayLessonsList.length === 1 ? 'Stunde' : 'Stunden'}`}
            </span>
          </div>

          {p.freeDayGreeting ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm font-semibold text-emerald-900">Heute ist kein regulärer Unterricht vorgesehen.</p>
              <p className="mt-1 text-sm text-emerald-800">Dein Stundenplan und deine Planungen bleiben gespeichert.</p>
            </div>
          ) : p.todayLessonsList.length ? (
            <ol className="space-y-2">
              {p.todayLessonsList.map((lesson, index) => (
                <li key={`${lesson.id ?? index}-${index}`}>
                  <button
                    type="button"
                    onClick={() => p.onNavigate('wochenplanung')}
                    className={`w-full rounded-xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
                      lesson.isCurrent
                        ? 'border-[var(--accent)]/30 bg-[var(--accent-soft)]'
                        : 'border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-500">
                          {lesson.zeit || `${lesson.hourNum ?? index + 1}. Stunde`}
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                          {lesson.fach || 'Unterricht'}
                        </p>
                        {lesson.thema && (
                          <p className="mt-1 break-words text-sm text-slate-600">
                            {p.privacyMode ? 'Thema verborgen' : lesson.thema}
                          </p>
                        )}
                      </div>
                      {lesson.isCurrent && (
                        <span className="shrink-0 rounded-full bg-[var(--accent)] px-2.5 py-1 text-xs font-bold text-white">
                          Jetzt
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-700">Für diesen Tag ist noch kein Unterricht eingetragen.</p>
              <p className="mt-1 text-sm text-slate-500">Du kannst den Tag direkt im Wochenplan ergänzen.</p>
            </div>
          )}

          <button
            type="button"
            className={button + ' w-full sm:w-auto'}
            onClick={() => p.onNavigate('wochenplanung')}
          >
            Wochenplan öffnen
          </button>
        </section>

        <section
          aria-label="Wichtig und offen"
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2"
        >
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Wichtig</p>
            <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold">
              <ClipboardList size={20} className="text-amber-600" />
              Offen & im Blick
            </h2>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-800">Hinweise</p>
              <span className="text-xs font-medium text-slate-500">
                {p.openTasksCount} Aufgaben · {p.openCollectionsCount} Sammlungen
              </span>
            </div>

            {tasks.length ? (
              <ul className="space-y-2">
                {tasks.map(item => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-sm leading-relaxed transition hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
                      onClick={() => p.onNavigate(item.linkPage || 'orga')}
                    >
                      {item.category && (
                        <span className={`mb-1 block text-xs font-semibold ${item.type === 'birthday' ? 'text-amber-800' : item.urgent ? 'text-rose-700' : 'text-slate-500'}`}>
                          {item.category}
                        </span>
                      )}
                      {p.privacyMode ? 'Privater Eintrag – zum Öffnen auswählen' : item.text}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
                <CheckCircle2 size={18} className="shrink-0" />
                Keine zusätzlichen Hinweise für heute.
              </div>
            )}
          </div>

          {p.actionItems.length > 3 && (
            <button
              type="button"
              className={button + ' w-full'}
              aria-expanded={showAllTasks}
              onClick={() => setShowAllTasks(value => !value)}
            >
              {showAllTasks ? 'Weniger Hinweise' : `Alle ${p.actionItems.length} Hinweise`}
            </button>
          )}

          <button
            type="button"
            onClick={() => p.onNavigate(p.totalStudents ? 'anwesenheit' : 'schueler')}
            className={`w-full rounded-xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
              p.attendanceRequired && !p.attendanceRecorded && p.totalStudents > 0
                ? 'border-amber-200 bg-amber-50'
                : 'border-slate-200 bg-slate-50 hover:bg-white'
            }`}
          >
            <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              <Users size={15} />
              Anwesenheit
            </span>
            <strong className="mt-1.5 block text-sm text-slate-900">{attendanceValue}</strong>
            {!p.privacyMode && p.attendanceRecorded && p.absentCount > 0 && (
              <span className="mt-1 block text-xs text-slate-600">{p.absentCount} abwesend</span>
            )}
          </button>
        </section>
      </div>

      <section aria-label="Schnellzugriff" className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Schnell</p>
          <h2 className="mt-1 text-lg font-semibold">Was brauchst du als Nächstes?</h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => p.onNavigate('wochenplanung')}
            className="flex min-h-14 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold transition hover:border-[var(--accent)]/35 hover:bg-white"
          >
            <CalendarDays size={19} className="text-[var(--accent)]" />
            Wochenplan
          </button>
          <button
            type="button"
            onClick={() => p.onNavigate('verhalten')}
            className="flex min-h-14 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold transition hover:border-[var(--accent)]/35 hover:bg-white"
          >
            <StickyNote size={19} className="text-[var(--accent)]" />
            Notizen
          </button>
          <button
            type="button"
            onClick={() => p.onNavigate('orga')}
            className="flex min-h-14 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold transition hover:border-[var(--accent)]/35 hover:bg-white"
          >
            <Wallet size={19} className="text-[var(--accent)]" />
            Organisation
          </button>
        </div>
      </section>

      <footer className="flex justify-center">
        <button
          type="button"
          className={button + ' flex items-center gap-2'}
          onClick={p.onSimpleModeToggle}
        >
          <Grid size={17} />
          Weitere Übersichten & Widgets
        </button>
      </footer>
    </section>
  );
}
