import React from 'react';
import { useApp } from '../context/AppContext';
import { getKW, getStartYear, kwToMonday, kwYear } from '../lib/utils';
import { getPlanningWeekOverview, summarizePlanningWeekPreparation } from '../lib/planningWeekOverview';
import { resolveWeeklyPlanOpeningWeek } from '../lib/planningWeekNavigation';
import { buildSchoolYearWeekList } from '../lib/weeklyPlanData';
import { getFachThemeStyles } from '../lib/fachColorUtils';
import {
  CalendarDays,
  CalendarRange,
  Folder,
  Replace,
  ChevronRight,
  Play,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

type PlanningItem = {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  klassenvorstandOnly?: boolean;
};

const coreItems: PlanningItem[] = [
  {
    id: 'wochenplanung',
    label: 'Wochenplan',
    description: 'Unterricht, Hausübungen und Termine für die Woche planen.',
    icon: CalendarDays,
  },
  {
    id: 'jahresplanung',
    label: 'Jahresplanung',
    description: 'Themen und Lernziele über das Schuljahr verteilen.',
    icon: CalendarRange,
  },
];

const preparationItems: PlanningItem[] = [
  {
    id: 'materialien',
    label: 'Materialbibliothek',
    description: 'Material und Unterrichtsvorlagen sammeln und wiederverwenden.',
    icon: Folder,
  },
  {
    id: 'vertretung',
    label: 'Vertretung & Übergabe',
    description: 'Vertretungen mit Wochenplan, Checkliste und Druckausgabe vorbereiten.',
    icon: Replace,
  },
];

function PlanningCard({
  item,
  onOpen,
}: {
  item: PlanningItem;
  onOpen: (id: string) => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      data-klassio-module-card className="group flex min-h-28 items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-colors hover:border-[var(--border2)] hover:bg-[var(--surface2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface2)] text-[var(--text2)]">
        <Icon size={21} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="text-base font-semibold text-[var(--text)]">{item.label}</span>
          <ChevronRight
            size={18}
            className="mt-0.5 shrink-0 text-[var(--text3)] transition-colors group-hover:text-[var(--accent)]"
          />
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-[var(--text2)]">
          {item.description}
        </span>
      </span>
    </button>
  );
}

export default function PlanungHub() {
  const { app, setApp, setPage } = useApp();
  const visiblePreparationItems = preparationItems.filter(
    item => !item.klassenvorstandOnly || app.klassenvorstand,
  );
  const now = new Date();
  const calendarKW = getKW(now);
  const activeKW = resolveWeeklyPlanOpeningWeek('planung', app.currentKW, calendarKW);
  const schoolWeeks = React.useMemo(() => buildSchoolYearWeekList(app.schuljahr, app.bundesland), [app.schuljahr, app.bundesland]);
  const selectedWeek = schoolWeeks.find(week => week.kw === activeKW);
  const monday = selectedWeek?.monday ?? kwToMonday(activeKW, kwYear(activeKW, getStartYear(app.schuljahr), app.bundesland));
  const currentWeek = schoolWeeks.find(week => week.kw === calendarKW &&
    week.monday <= now && now < new Date(week.monday.getFullYear(), week.monday.getMonth(), week.monday.getDate() + 7));
  const selectWeek = (week: number) => setApp(previous => previous.currentKW === week
    ? previous
    : { ...previous, currentKW: week });
  const weekOverview = getPlanningWeekOverview(app.wochenplanung?.[activeKW]);
  const plannedLessons = weekOverview.reduce((sum, day) => sum + day.lessons.length, 0);
  const unlabelledLessons = weekOverview.reduce((sum, day) => sum + day.missingTopics, 0);
  const preparation = summarizePlanningWeekPreparation(weekOverview);
  const isCurrentCalendarWeek = currentWeek?.kw === activeKW;
  const openLesson = (day: string, index: number) => {
    setApp(previous => ({
      ...previous,
      currentKW: activeKW,
      weeklyPlanTarget: { classId: previous.activeClassId, schoolYear: previous.schuljahr, week: activeKW, day, index },
    }));
    setPage('wochenplanung');
  };

  return (
    <div data-planning-hub className="mx-auto w-full max-w-6xl space-y-6 px-4 py-5 sm:px-6 sm:py-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text)] sm:text-2xl">Planung</h1>
          <p className="mt-1 text-sm text-[var(--text2)]">{app.klassenbezeichnung || 'Deine Klasse'} · {app.schuljahr}</p>
        </div>
      </header>

      <section data-planning-week-overview aria-labelledby="planung-wochenblick"
        className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 id="planung-wochenblick" aria-live="polite" className="text-base font-semibold text-[var(--text)]">
              Ausgewählte Planungswoche · KW {activeKW}
            </h2>
            <p className="text-xs text-[var(--text2)]">
              {monday.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' })} –
              {' '}{new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 4).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              {' '}· {plannedLessons} gespeicherte {plannedLessons === 1 ? 'Stunde' : 'Stunden'}
              {unlabelledLessons > 0 ? ` · ${unlabelledLessons} ohne Thema` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2" data-planning-next-actions>
            <button type="button" onClick={() => setPage('wochenplanung')}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--btn-text,#fff)] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
              <CalendarDays size={17} aria-hidden="true" />
              {preparation.actionLabel}
            </button>
            <button type="button" onClick={() => setPage('cockpit')}
              data-testid="planning-open-cockpit"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
              <Play size={17} aria-hidden="true" />
              Unterrichtsmodus öffnen
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2" data-planning-week-navigation>
          <div className="w-full min-w-0 sm:w-auto">
            <label htmlFor="planning-week-picker" className="mb-1 block text-sm font-semibold text-[var(--text)]">Planungswoche wählen</label>
            <select id="planning-week-picker" value={activeKW} onChange={event => selectWeek(Number(event.target.value))}
              className="min-h-11 w-full max-w-full rounded-xl border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-sm text-[var(--text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
              {!selectedWeek && <option value={activeKW}>KW {activeKW}</option>}
              {schoolWeeks.map(week => (
                <option key={week.monday.toISOString()} value={week.kw}>
                  KW {week.kw} · {week.monday.toLocaleDateString('de-AT', { day: 'numeric', month: 'short', year: 'numeric' })}
                </option>
              ))}
            </select>
          </div>
          {currentWeek && (
            <button type="button" onClick={() => selectWeek(currentWeek.kw)} disabled={isCurrentCalendarWeek}
              className="min-h-11 rounded-xl border border-[var(--border)] px-3 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] disabled:opacity-60">
              Diese Woche
            </button>
          )}
        </div>
        <div data-testid="planning-preparation-status"
          className="flex flex-wrap items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface2)] p-3">
          <span aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--text2)]">
            {preparation.kind === 'topics-entered' ? <CheckCircle2 size={19} /> : <AlertCircle size={19} />}
          </span>
          <div role="status" className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--text)]">{preparation.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text2)]">{preparation.explanation}</p>
            {!isCurrentCalendarWeek && (
              <p data-testid="planning-selected-week-handoff" className="mt-1 text-xs font-medium text-[var(--text2)]">
                Beim Öffnen des Wochenplans bleibst du in KW {activeKW}.
              </p>
            )}
          </div>
          <button type="button" onClick={() => setPage('planungszentrale')}
            className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text)]">
            Wochen-Check öffnen
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {weekOverview.map(day => {
            const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + day.index);
            return (
              <div key={day.day} data-planning-day-summary={day.day}
                className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface2)] p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <strong className="text-sm text-[var(--text)]">{day.day}</strong>
                  <span className="text-xs text-[var(--text3)]">{date.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' })}</span>
                </div>
                <p className="mt-2 text-xs font-semibold text-[var(--text)]">
                  {day.lessons.length} {day.lessons.length === 1 ? 'Stunde' : 'Stunden'}
                  {day.appointmentCount > 0 ? ` · ${day.appointmentCount} Termine` : ''}
                </p>
                {day.lessons.length ? (
                  <ul className="mt-2 space-y-1 text-xs text-[var(--text2)]">
                    {day.lessons.map(lesson => {
                      const fachTheme = getFachThemeStyles(lesson.subject, app.fachConfig);
                      return (
                        <li key={lesson.hour}>
                          <button type="button" data-klassio-subject-card={lesson.subject} data-klassio-subject-stripe="true"
                            data-planning-lesson={`${day.day}-${lesson.hour}`}
                            aria-label={`${day.day}, ${lesson.hour}. Stunde, ${lesson.subject}: ${lesson.topic || 'Thema fehlt'}, bearbeiten`}
                            onClick={() => openLesson(day.day, lesson.hour - 1)}
                            style={{ '--fach-card-bg': fachTheme.bgLight, '--fach-card-stripe': fachTheme.hex } as React.CSSProperties}
                            className="min-h-11 w-full min-w-0 rounded-md border-l-4 border-solid px-2 py-1.5 text-left hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
                            <span className="block break-words font-semibold text-[var(--text)]">{lesson.hour}. {lesson.subject}</span>
                            <span className="mt-0.5 line-clamp-2 break-words">{lesson.topic || 'Thema fehlt'}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-[var(--text3)]">Noch keine Stunden eingetragen</p>
                )}
                {day.missingTopics > 0 && (
                  <p className="mt-2 text-xs font-medium text-amber-700">{day.missingTopics} {day.missingTopics === 1 ? 'Thema fehlt' : 'Themen fehlen'}</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="planung-kern">
        <div className="flex items-end justify-between gap-4 px-1">
          <div>
            <h2 id="planung-kern" className="text-base font-semibold text-[var(--text)]">
              Kernplanung
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {coreItems.map(item => (
            <PlanningCard key={item.id} item={item} onOpen={setPage} />
          ))}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="planung-vorbereitung">
        <div className="px-1">
          <h2 id="planung-vorbereitung" className="text-base font-semibold text-[var(--text)]">
            Vorbereitung & Weitergabe
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {visiblePreparationItems.map(item => (
            <PlanningCard key={item.id} item={item} onOpen={setPage} />
          ))}
        </div>
      </section>
    </div>
  );
}
