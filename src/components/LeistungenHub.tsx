import React from 'react';
import { useApp } from '../context/AppContext';
import { BarChart3, Target, Activity, LineChart, MessagesSquare, Table2, FileText, MessageSquareText, ChevronRight } from 'lucide-react';

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
    description: 'Noten, Prozent, Punkte, Gewichtungen, Schularbeiten, LZK, WOPL und sonstige Leistungen.',
    icon: BarChart3,
  },
  {
    id: 'notenTabelle',
    title: 'Notenübersicht',
    description: 'Kompakte tabellarische Übersicht über vorhandene Leistungsdaten.',
    icon: Table2,
  },
  {
    id: 'verbal',
    title: 'Verbale Beurteilung',
    description: 'Formulierungen und dokumentierte Beobachtungen für verbale Rückmeldungen nutzen.',
    icon: MessageSquareText,
  },
];

const developmentItems: PerformanceItem[] = [
  {
    id: 'portfolio',
    title: 'Lernziele & Portfolio',
    description: 'Dokumentierte Lernziele, Portfolio-Einträge und Leistungsnachweise der Kinder.',
    icon: Target,
  },
  {
    id: 'diagnostik',
    title: 'Diagnostik',
    description: 'Einzelkind, Klasse, Ergebnisse, iKM Plus, Antolin, Förderziele, Live-Checks und weitere Werkzeuge.',
    icon: Activity,
    klassenvorstandOnly: true,
  },
  {
    id: 'statistik',
    title: 'Statistik & Profile',
    description: 'Auswertungen und grafische Übersichten auf Basis tatsächlich erfasster Daten.',
    icon: LineChart,
  },
  {
    id: 'kel',
    title: 'KEL-Gespräche',
    description: 'Vorbereiten, Einschätzen, Gespräch führen, Ziele vereinbaren und Präsentation erstellen.',
    icon: MessagesSquare,
  },
  {
    id: 'jahresbericht',
    title: 'Jahresbericht',
    description: 'Dokumentierte Jahresübersichten und Berichte ohne erfundene Aussagen.',
    icon: FileText,
    klassenvorstandOnly: true,
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
      className="group flex min-h-32 items-start gap-4 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)]/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
        <Icon size={21} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="text-base font-black text-[var(--text)]">{item.title}</span>
          <ChevronRight size={18} className="mt-0.5 shrink-0 text-[var(--text3)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
        </span>
        <span className="mt-1.5 block text-sm font-medium leading-relaxed text-[var(--text2)]">
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
    <div className="mx-auto w-full max-w-6xl space-y-7 px-4 py-6 sm:px-6">
      <header className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Leistungen</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">
          Bewerten und Lernentwicklung begleiten
        </h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-[var(--text2)]">
          Bewertung und Beurteilung stehen getrennt von Lernentwicklung, Diagnostik und Gesprächen. So findest du schneller den passenden Arbeitsweg.
        </p>
      </header>

      <section className="space-y-3" aria-labelledby="leistungen-bewerten">
        <div className="px-1">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent)]">Bewerten & Beurteilen</p>
          <h2 id="leistungen-bewerten" className="mt-1 text-lg font-black text-[var(--text)]">
            Leistungen erfassen und zusammenfassen
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {assessmentItems.map(item => (
            <PerformanceCard key={item.id} item={item} onOpen={setPage} />
          ))}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="leistungen-entwicklung">
        <div className="px-1">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--text3)]">
            Lernentwicklung & Gespräche
          </p>
          <h2 id="leistungen-entwicklung" className="mt-1 text-lg font-black text-[var(--text)]">
            Entwicklung verstehen, dokumentieren und besprechen
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
