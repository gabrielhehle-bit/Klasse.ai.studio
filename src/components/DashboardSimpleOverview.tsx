import React, { useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Eye,
  EyeOff,
  Grid,
  Play,
  StickyNote,
  Users,
  Wallet,
} from 'lucide-react';
import type { DashboardTodayOverviewProps } from './DashboardTodayOverview';

export default function DashboardSimpleOverview(p: DashboardTodayOverviewProps) {
  const [showAllTasks, setShowAllTasks] = useState(false);
  const button = 'min-h-11 px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--border-default,var(--border2))] bg-[var(--surface-card,var(--surface))] text-[var(--text-secondary,var(--text2))] hover:bg-[var(--surface-subtle,var(--surface2))] hover:text-[var(--text-primary,var(--text))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,var(--accent))]';
  const tasks = showAllTasks ? p.actionItems : p.actionItems.slice(0, 3);

  const primaryTarget =
    p.totalStudents === 0
      ? 'schueler'
      : p.attendanceRequired && !p.attendanceRecorded
        ? 'anwesenheit'
        : 'cockpit';

  const primaryLabel =
    p.totalStudents === 0
      ? 'Kinder hinzufügen'
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
    <section aria-label="Heute" className="space-y-6 text-[var(--text-primary,var(--text))]">
      <header className="rounded-2xl border border-[var(--border-subtle,var(--border))] bg-[var(--surface-card,var(--surface))] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--accent)]">{p.klasseLabel || 'Deine Klasse'}</p>
            <h1 className="mt-1 text-2xl font-black tracking-[-0.025em] sm:text-[1.75rem]">{p.greeting}</h1>
            <p className="mt-1 text-sm font-medium text-[var(--text-muted,var(--text3))]">{p.dateLabel}</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary,var(--text2))]">
              Das Wichtigste für deinen Schultag – ohne unnötige Zusatzinformationen.
            </p>
          </div>

          <button
            type="button"
            className={button + ' flex items-center gap-2'}
            aria-pressed={p.privacyMode}
            onClick={() => p.onPrivacyModeChange(!p.privacyMode)}
          >
            {p.privacyMode ? <EyeOff size={18} /> : <Eye size={18} />}
            {p.privacyMode ? 'Private Angaben verborgen' : 'Private Angaben verbergen'}
          </button>
        </div>

        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold text-[var(--text-muted,var(--text3))]">Jetzt</p>
          <button
            type="button"
            onClick={() => p.onNavigate(primaryTarget)}
            className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-[var(--accent)] px-6 py-4 text-base font-bold text-[var(--accent-text,var(--btn-text,#ffffff))] transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,var(--accent))] focus-visible:ring-offset-2 sm:w-auto"
          >
            {primaryTarget === 'cockpit' ? <Play size={20} /> : <Users size={20} />}
            {primaryLabel}
            <ArrowRight size={18} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-5">
        <section
          aria-label="Heutiger Unterricht"
          className="space-y-4 rounded-2xl border border-[var(--border-subtle,var(--border))] bg-[var(--surface-card,var(--surface))] p-5 shadow-sm lg:col-span-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[var(--accent)]">Heute</p>
              <h2 className="mt-1 flex items-center gap-2 text-lg font-bold tracking-[-0.01em]">
                <CalendarDays size={20} className="text-[var(--accent)]" />
                Dein Unterricht
              </h2>
            </div>
            <span className="rounded-full bg-[var(--surface-subtle,var(--surface2))] px-3 py-1 text-xs font-semibold text-[var(--text-secondary,var(--text2))]">
              {p.todayLessonsList.length} {p.todayLessonsList.length === 1 ? 'Stunde' : 'Stunden'}
            </span>
          </div>

          {p.todayLessonsList.length ? (
            <ol className="space-y-2">
              {p.todayLessonsList.map((lesson, index) => (
                <li key={`${lesson.id ?? index}-${index}`}>
                  <button
                    type="button"
                    onClick={() => p.onNavigate('wochenplanung')}
                    className={`w-full rounded-xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
                      lesson.isCurrent
                        ? 'border-[var(--accent)]/30 bg-[var(--accent-soft)]'
                        : 'border-[var(--border-subtle,var(--border))] bg-[var(--surface-subtle,var(--surface2))] hover:border-[var(--border-default,var(--border2))] hover:bg-[var(--surface-card,var(--surface))]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[var(--text-muted,var(--text3))]">
                          {lesson.zeit || `${lesson.hourNum ?? index + 1}. Stunde`}
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-[var(--text-primary,var(--text))]">
                          {lesson.fach || 'Unterricht'}
                        </p>
                        {lesson.thema && (
                          <p className="mt-1 break-words text-sm text-[var(--text-secondary,var(--text2))]">
                            {p.privacyMode ? 'Thema verborgen' : lesson.thema}
                          </p>
                        )}
                      </div>
                      {lesson.isCurrent && (
                        <span className="shrink-0 rounded-full bg-[var(--accent)] px-2.5 py-1 text-xs font-bold text-[var(--accent-text,var(--btn-text,#ffffff))]">
                          Jetzt
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border-default,var(--border2))] bg-[var(--surface-subtle,var(--surface2))] p-5">
              <p className="text-sm font-medium text-[var(--text-secondary,var(--text2))]">Für diesen Tag ist noch kein Unterricht eingetragen.</p>
              <p className="mt-1 text-sm text-[var(--text-muted,var(--text3))]">Du kannst den Tag direkt im Wochenplan ergänzen.</p>
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
          className="space-y-4 rounded-2xl border border-[var(--border-subtle,var(--border))] bg-[var(--surface-card,var(--surface))] p-5 shadow-sm lg:col-span-2"
        >
          <div>
            <p className="text-xs font-semibold text-[var(--warning-text)]">Wichtig</p>
            <h2 className="mt-1 flex items-center gap-2 text-lg font-bold tracking-[-0.01em]">
              <ClipboardList size={20} className="text-[var(--warning)]" />
              Offen & im Blick
            </h2>
          </div>

          <button
            type="button"
            onClick={() => p.onNavigate(p.totalStudents ? 'anwesenheit' : 'schueler')}
            className={`w-full rounded-xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
              p.attendanceRequired && !p.attendanceRecorded && p.totalStudents > 0
                ? 'border-[var(--warning)]/25 bg-[var(--warning-soft)]'
                : 'border-[var(--border-default,var(--border2))] bg-[var(--surface-subtle,var(--surface2))] hover:bg-[var(--surface-card,var(--surface))]'
            }`}
          >
            <span className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted,var(--text3))]">
              <Users size={15} />
              Anwesenheit
            </span>
            <strong className="mt-1.5 block text-sm text-[var(--text-primary,var(--text))]">{attendanceValue}</strong>
            {!p.privacyMode && p.attendanceRecorded && p.absentCount > 0 && (
              <span className="mt-1 block text-xs text-[var(--text-secondary,var(--text2))]">{p.absentCount} abwesend</span>
            )}
          </button>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--text-primary,var(--text))]">Hinweise</p>
              <span className="text-xs font-medium text-[var(--text-muted,var(--text3))]">
                {p.openTasksCount} Aufgaben · {p.openCollectionsCount} Sammlungen
              </span>
            </div>

            {tasks.length ? (
              <ul className="space-y-2">
                {tasks.map(item => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="min-h-12 w-full rounded-xl border border-[var(--border-default,var(--border2))] bg-[var(--surface-subtle,var(--surface2))] p-3 text-left text-sm leading-relaxed transition-colors hover:border-[var(--accent)]/25 hover:bg-[var(--accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,var(--accent))]"
                      onClick={() => p.onNavigate(item.linkPage || 'orga')}
                    >
                      {item.urgent && (
                        <span className="mb-1 block text-xs font-semibold text-[var(--warning-text)]">Heute beachten</span>
                      )}
                      {p.privacyMode ? 'Privater Eintrag – zum Öffnen auswählen' : item.text}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-[var(--success-soft)] p-3 text-sm font-medium text-[var(--success-text)]">
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
        </section>
      </div>

      <section aria-label="Schnellzugriff" className="rounded-2xl border border-[var(--border-subtle,var(--border))] bg-[var(--surface-card,var(--surface))] p-5 shadow-sm">
        <div className="mb-3">
          <p className="text-xs font-semibold text-[var(--text-muted,var(--text3))]">Schnell</p>
          <h2 className="mt-1 text-lg font-bold tracking-[-0.01em]">Was brauchst du als Nächstes?</h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => p.onNavigate('wochenplanung')}
            className="flex min-h-14 items-center gap-3 rounded-xl border border-[var(--border-default,var(--border2))] bg-[var(--surface-subtle,var(--surface2))] px-4 py-3 text-left text-sm font-semibold transition-colors hover:border-[var(--accent)]/30 hover:bg-[var(--accent-soft)]"
          >
            <CalendarDays size={19} className="text-[var(--accent)]" />
            Wochenplan
          </button>
          <button
            type="button"
            onClick={() => p.onNavigate('verhalten')}
            className="flex min-h-14 items-center gap-3 rounded-xl border border-[var(--border-default,var(--border2))] bg-[var(--surface-subtle,var(--surface2))] px-4 py-3 text-left text-sm font-semibold transition-colors hover:border-[var(--accent)]/30 hover:bg-[var(--accent-soft)]"
          >
            <StickyNote size={19} className="text-[var(--accent)]" />
            Notizen
          </button>
          <button
            type="button"
            onClick={() => p.onNavigate('orga')}
            className="flex min-h-14 items-center gap-3 rounded-xl border border-[var(--border-default,var(--border2))] bg-[var(--surface-subtle,var(--surface2))] px-4 py-3 text-left text-sm font-semibold transition-colors hover:border-[var(--accent)]/30 hover:bg-[var(--accent-soft)]"
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
