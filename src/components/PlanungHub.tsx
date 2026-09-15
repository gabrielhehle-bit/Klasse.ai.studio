import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  BookOpen,
  Folder,
  Palette,
  Replace,
  ClipboardList,
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
    description: 'Die konkrete Unterrichtswoche im Raster planen, im Vollbild bearbeiten und bei Bedarf mit Excel austauschen.',
    icon: CalendarDays,
  },
  {
    id: 'jahresplanung',
    label: 'Jahresplanung',
    description: 'Themen, Stoffverteilung und Schulwochen über das ganze Schuljahr hinweg strukturieren.',
    icon: CalendarRange,
  },
  {
    id: 'planungszentrale',
    label: 'Planungsübersicht',
    description: 'Aktuelle Woche, offene Planung und wichtige Planungswege kompakt zusammenführen.',
    icon: LayoutDashboard,
  },
];

const preparationItems: PlanningItem[] = [
  {
    id: 'stunden',
    label: 'Stundenentwürfe',
    description: 'Einzelne Unterrichtsstunden und vorbereitete Abläufe ausarbeiten und wiederverwenden.',
    icon: BookOpen,
  },
  {
    id: 'materialien',
    label: 'Materialbibliothek',
    description: 'Material sammeln, ordnen und direkt in den Wochenplan übernehmen.',
    icon: Folder,
  },
  {
    id: 'canva',
    label: 'Canva',
    description: 'Designs suchen, erstellen, in Canva bearbeiten und in passenden Formaten exportieren.',
    icon: Palette,
  },
  {
    id: 'vertretung',
    label: 'Vertretung vorbereiten',
    description: 'Stundenplan-, Wochenplan- und Materialdaten für eine Vertretung zusammenstellen.',
    icon: Replace,
  },
  {
    id: 'uebergabemappe',
    label: 'Übergabemappe',
    description: 'Wichtige Informationen und Unterlagen für eine Klassenübergabe bündeln.',
    icon: ClipboardList,
    klassenvorstandOnly: true,
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
      className="group flex min-h-32 items-start gap-4 rounded-2xl border border-[var(--border-subtle,var(--border))] bg-[var(--surface-card,var(--surface))] p-5 text-left shadow-sm transition-colors hover:border-[var(--border-default,var(--border2))] hover:bg-[var(--surface-subtle,var(--surface2))]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,var(--accent))]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
        <Icon size={21} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="text-base font-bold tracking-[-0.01em] text-[var(--text-primary,var(--text))]">{item.label}</span>
          <ChevronRight
            size={18}
            className="mt-0.5 shrink-0 text-[var(--text-muted,var(--text3))] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
          />
        </span>
        <span className="mt-1.5 block text-sm font-medium leading-6 text-[var(--text-secondary,var(--text2))]">
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
    <div className="mx-auto w-full max-w-[1180px] space-y-8 px-4 py-5 sm:px-6 lg:px-8">
      <header className="rounded-2xl border border-[var(--border-subtle,var(--border))] bg-[var(--surface-card,var(--surface))] p-5 sm:p-6 shadow-sm">
        <p className="text-xs font-semibold text-[var(--accent)]">Planung</p>
        <h1 className="mt-1.5 text-2xl font-black tracking-[-0.025em] text-[var(--text-primary,var(--text))] sm:text-[1.75rem]">
          Vom Schuljahr bis zur nächsten Stunde
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--text-secondary,var(--text2))]">
          Plane zuerst Woche oder Jahr. Materialien, Stundenentwürfe und Übergaben findest du gesammelt darunter – jedes Werkzeug genau einmal.
        </p>
      </header>

      <section className="space-y-3" aria-labelledby="planung-kern">
        <div className="flex items-end justify-between gap-4 px-1">
          <div>
            <p className="text-xs font-semibold text-[var(--accent)]">Kernplanung</p>
            <h2 id="planung-kern" className="mt-1 text-lg font-bold tracking-[-0.01em] text-[var(--text-primary,var(--text))]">
              Was möchtest du planen?
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
          <p className="text-xs font-semibold text-[var(--text-muted,var(--text3))]">
            Vorbereitung & Weitergabe
          </p>
          <h2 id="planung-vorbereitung" className="mt-1 text-lg font-bold tracking-[-0.01em] text-[var(--text-primary,var(--text))]">
            Material, Entwürfe und Organisation
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
