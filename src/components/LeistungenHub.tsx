import React from 'react';
import { useApp } from '../context/AppContext';
import { getConfiguredGradebookSubjects } from '../lib/sek1Subjects';
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
      data-klassio-module-card className="group flex min-h-28 items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-colors hover:border-[var(--border2)] hover:bg-[var(--surface2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface2)] text-[var(--text2)]">
        <Icon size={21} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="text-base font-semibold text-[var(--text)]">{item.title}</span>
          <ChevronRight size={18} className="mt-0.5 shrink-0 text-[var(--text3)] transition-colors group-hover:text-[var(--accent)]" />
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-[var(--text2)]">
          {item.description}
        </span>
      </span>
    </button>
  );
}

export default function LeistungenHub({ onOpenGradebook }: { onOpenGradebook: (subject: string) => void }) {
  const { app, setPage } = useApp();
  const [subject, setSubject] = React.useState('');
  const subjects = getConfiguredGradebookSubjects(app);
  const selectedSubject = subjects.includes(subject) ? subject : '';
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
      </header>

      <section aria-labelledby="leistungen-notenmappe" data-performance-gradebook
        className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <BarChart3 size={22} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--accent)]" />
          <div>
            <h2 id="leistungen-notenmappe" className="text-lg font-semibold text-[var(--text)]">Notenmappe</h2>
            <p className="mt-1 text-sm text-[var(--text2)]">Bewertungen, Mitarbeit und Zeugnisnoten erfassen und auswerten.</p>
          </div>
        </div>
        <form onSubmit={event => { event.preventDefault(); onOpenGradebook(selectedSubject); }} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          {subjects.length > 0 && (
            <div className="w-full min-w-0 sm:max-w-xs">
              <label htmlFor="leistungen-fach" className="mb-1 block text-sm font-semibold text-[var(--text)]">Fach wählen</label>
              <select id="leistungen-fach" value={selectedSubject} onChange={event => setSubject(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-sm text-[var(--text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
                <option value="">Automatisch auswählen</option>
                {subjects.map(fach => <option key={fach} value={fach}>{fach}</option>)}
              </select>
            </div>
          )}
          <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--btn-text,#fff)] hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
            Notenmappe öffnen <ChevronRight size={17} aria-hidden="true" />
          </button>
        </form>
      </section>

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
