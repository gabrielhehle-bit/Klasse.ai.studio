import React from 'react';
import { useApp } from '../context/AppContext';
import { getKW, getStartYear, kwToMonday, kwYear } from '../lib/utils';
import { getPlanningWeekOverview } from '../lib/planningWeekOverview';
import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  Folder,
  Replace,
  ChevronRight,
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
  {
    id: 'planungszentrale',
    label: 'Wochen-Check',
    description: 'Offene Vorbereitungen erkennen und im Wochenplan ergänzen.',
    icon: LayoutDashboard,
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
      className="group flex min-h-28 items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
        <Icon size={21} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="text-base font-semibold text-[var(--text)]">{item.label}</span>
          <ChevronRight
            size={18}
            className="mt-0.5 shrink-0 text-[var(--text3)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
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
  const { app, setPage } = useApp();
  const visiblePreparationItems = preparationItems.filter(
    item => !item.klassenvorstandOnly || app.klassenvorstand,
  );
  const activeKW = app.currentKW || getKW(new Date());
  const selectedYear = kwYear(activeKW, getStartYear(app.schuljahr), app.bundesland || 'VBG');
  const monday = kwToMonday(activeKW, selectedYear);
  const weekOverview = getPlanningWeekOverview(app.wochenplanung?.[activeKW]);
  const plannedLessons = weekOverview.reduce((sum, day) => sum + day.lessons.length, 0);
  const unlabelledLessons = weekOverview.reduce((sum, day) => sum + day.missingTopics, 0);

  return (
    <div data-planning-hub className="mx-auto w-full max-w-6xl space-y-6 px-4 py-5 sm:px-6 sm:py-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text)] sm:text-2xl">Planung</h1>
          <p className="mt-1 text-sm text-[var(--text2)]">{app.klassenbezeichnung || 'Deine Klasse'} · {app.schuljahr}</p>
        </div>
        <p className="text-sm text-[var(--text2)]">Woche, Schuljahr und Vorbereitung</p>
      </header>

      <section data-planning-week-overview aria-labelledby="planung-wochenblick"
        className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 id="planung-wochenblick" className="text-base font-semibold text-[var(--text)]">
              Diese Planungswoche · KW {activeKW}
            </h2>
            <p className="text-xs text-[var(--text2)]">
              {monday.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' })} –
              {' '}{new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 4).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              {' '}· {plannedLessons} gespeicherte {plannedLessons === 1 ? 'Stunde' : 'Stunden'}
              {unlabelledLessons > 0 ? ` · ${unlabelledLessons} ohne Thema` : ''}
            </p>
          </div>
          <button type="button" onClick={() => setPage('wochenplanung')}
            className="min-h-11 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
            Wochen- oder Tagesplan öffnen
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
                    {day.lessons.slice(0, 2).map(lesson => (
                      <li key={lesson.hour} className="truncate" title={`${lesson.hour}. ${lesson.subject}: ${lesson.topic || 'Thema fehlt'}`}>
                        {lesson.hour}. {lesson.subject} · {lesson.topic || 'Thema fehlt'}
                      </li>
                    ))}
                    {day.lessons.length > 2 && <li className="text-[var(--text3)]">+ {day.lessons.length - 2} weitere</li>}
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
        <p className="text-xs text-[var(--text3)]">
          Nur gespeicherte Wochenplan-Einträge; offene Stammplanfelder werden nicht als fertige Planung gezählt.
          Zum Bearbeiten im Wochenplan „Tagesplan“ wählen.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="planung-kern">
        <div className="flex items-end justify-between gap-4 px-1">
          <div>
            <h2 id="planung-kern" className="text-base font-semibold text-[var(--text)]">
              Kernplanung
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
