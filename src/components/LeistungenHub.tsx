import React from 'react';
import { useApp } from '../context/AppContext';
import { BarChart3, Target, Activity, MessagesSquare, MessageSquareText, ChevronRight } from 'lucide-react';

type PerformanceItem = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  klassenvorstandOnly?: boolean;
};

const assessmentItems: PerformanceItem[] = [
  {
    id: 'noten',
    title: 'Notenmappe',
    description: 'Bewertungen, Mitarbeit und Zeugnisnoten erfassen und auswerten.',
    icon: BarChart3,
  },
  {
    id: 'verbal',
    title: 'Verbale Beurteilung',
    description: 'Beurteilungen formulieren und die Entwicklung zusammenfassen.',
    icon: MessageSquareText,
  },
];

const developmentItems: PerformanceItem[] = [
  {
    id: 'portfolio',
    title: 'Lernziele & Portfolio',
    description: 'Lernziele einschätzen und die Entwicklung eines Kindes dokumentieren.',
    icon: Target,
  },
  {
    id: 'diagnostik',
    title: 'Diagnostik',
    description: 'Kompetenzen prüfen und Förderbedarf erkennen.',
    icon: Activity,
    klassenvorstandOnly: true,
  },
  {
    id: 'kel',
    title: 'KEL-Gespräche',
    description: 'Gespräche vorbereiten, Entwicklung besprechen und Ziele vereinbaren.',
    icon: MessagesSquare,
  },
];

function PerformanceCard({
  item,
  onOpen,
}: {
  item: PerformanceItem;
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
          <span className="text-base font-semibold text-[var(--text)]">{item.title}</span>
          <ChevronRight size={18} className="mt-0.5 shrink-0 text-[var(--text3)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-[var(--text2)]">
          {item.description}
        </span>
      </span>
    </button>
  );
}

export default function LeistungenHub() {
  const { app, setPage } = useApp();
  const visibleDevelopmentItems = developmentItems.filter(
    item => !item.klassenvorstandOnly || app.klassenvorstand,
  );

  return (
    <div data-performance-hub className="mx-auto w-full max-w-6xl space-y-6 px-4 py-5 sm:px-6 sm:py-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text)] sm:text-2xl">Leistungen</h1>
          <p className="mt-1 text-sm text-[var(--text2)]">{app.klassenbezeichnung || 'Deine Klasse'} · {app.schuljahr}</p>
        </div>
        <p className="text-sm text-[var(--text2)]">Bewertungen und Lernentwicklung</p>
      </header>

      <section className="space-y-3" aria-labelledby="leistungen-bewerten">
        <div className="px-1">
          <h2 id="leistungen-bewerten" className="text-base font-semibold text-[var(--text)]">
            Bewerten & Beurteilen
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {assessmentItems.map(item => (
            <PerformanceCard key={item.id} item={item} onOpen={setPage} />
          ))}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="leistungen-entwicklung">
        <div className="px-1">
          <h2 id="leistungen-entwicklung" className="text-base font-semibold text-[var(--text)]">
            Lernentwicklung & Gespräche
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {visibleDevelopmentItems.map(item => (
            <PerformanceCard key={item.id} item={item} onOpen={setPage} />
          ))}
        </div>
      </section>
    </div>
  );
}
