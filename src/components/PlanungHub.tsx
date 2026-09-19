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
    id: 'materialien',
    label: 'Materialbibliothek',
    description: 'Material und wiederverwendbare Unterrichtsvorbereitungen sammeln, ordnen und im Wochenplan einsetzen.',
    icon: Folder,
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
      className="group flex min-h-32 items-start gap-4 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)]/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
        <Icon size={21} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="text-base font-black text-[var(--text)]">{item.label}</span>
          <ChevronRight
            size={18}
            className="mt-0.5 shrink-0 text-[var(--text3)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
          />
        </span>
        <span className="mt-1.5 block text-sm font-medium leading-relaxed text-[var(--text2)]">
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
    <div className="mx-auto w-full max-w-6xl space-y-7 px-4 py-6 sm:px-6">
      <header className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Planung</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">
          Vom Schuljahr bis zur nächsten Stunde
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-[var(--text2)]">
          Plane zuerst Woche oder Jahr. Ausführliche Unterrichtsentwürfe bearbeitest du im Wochenplan; wiederverwendbare Vorlagen findest du in der Materialbibliothek.
        </p>
      </header>

      <section className="space-y-3" aria-labelledby="planung-kern">
        <div className="flex items-end justify-between gap-4 px-1">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent)]">Kernplanung</p>
            <h2 id="planung-kern" className="mt-1 text-lg font-black text-[var(--text)]">
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
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--text3)]">
            Vorbereitung & Weitergabe
          </p>
          <h2 id="planung-vorbereitung" className="mt-1 text-lg font-black text-[var(--text)]">
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
