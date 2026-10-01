import React from 'react';
import { useApp } from '../context/AppContext';
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

  return (
    <div data-planning-hub className="mx-auto w-full max-w-6xl space-y-6 px-4 py-5 sm:px-6 sm:py-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text)] sm:text-2xl">Planung</h1>
          <p className="mt-1 text-sm text-[var(--text2)]">{app.klassenbezeichnung || 'Deine Klasse'} · {app.schuljahr}</p>
        </div>
        <p className="text-sm text-[var(--text2)]">Woche, Schuljahr und Vorbereitung</p>
      </header>

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
