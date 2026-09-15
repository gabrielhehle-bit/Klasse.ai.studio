import React from 'react';
import { useApp } from '../context/AppContext';
import { Play, Bot, FileText, LayoutGrid, Mic, Sparkles, Mail, ChevronRight } from 'lucide-react';

const tools = [
  { id: 'ki-helfer', title: 'KI-Helfer', description: 'Unterrichtsideen, Wissen, Reflexion, Lernziele und weitere pädagogische KI-Hilfen.', icon: Bot },
  { id: 'arbeitsblatt', title: 'Arbeitsblatt-Generator', description: 'Arbeitsblätter direkt aus deinen Unterrichtsideen und Inhalten erstellen.', icon: FileText },
  { id: 'stationenbetrieb', title: 'Stationenbetrieb', description: 'Stationen vorbereiten, strukturieren und für den Unterricht organisieren.', icon: LayoutGrid },
  { id: 'stimmnotizen', title: 'Stimm-Notizen', description: 'Gedanken und Beobachtungen schnell per Sprache festhalten.', icon: Mic },
  { id: 'differenzierung', title: 'Differenzierung', description: 'Aufgaben und Lernwege für unterschiedliche Lernvoraussetzungen vorbereiten.', icon: Sparkles },
  { id: 'elternbrief', title: 'Elternbrief', description: 'Elterninformationen und Mitteilungen vorbereitet formulieren.', icon: Mail },
] as const;

export default function UnterrichtHub() {
  const { setPage } = useApp();

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-8 px-4 py-5 sm:px-6 lg:px-8">
      <header className="rounded-2xl border border-[var(--border-subtle,var(--border))] bg-[var(--surface-card,var(--surface))] p-5 sm:p-6 shadow-sm">
        <p className="text-xs font-semibold text-[var(--accent)]">Unterricht</p>
        <h1 className="mt-1.5 text-2xl font-black tracking-[-0.025em] text-[var(--text-primary,var(--text))] sm:text-[1.75rem]">
          Unterrichten, zeigen, festhalten
        </h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[var(--text-secondary,var(--text2))]">
          Das Lehrercockpit bleibt dein zentraler Unterrichtsraum. Ergänzende Werkzeuge sind hier gesammelt, statt in der Navigation verstreut zu sein.
        </p>
      </header>

      <button
        type="button"
        onClick={() => setPage('cockpit')}
        className="group flex w-full items-center gap-5 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] p-5 text-left shadow-sm transition-colors hover:border-[var(--accent)]/35 sm:p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,var(--accent))]"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-text,#fff)] shadow-sm">
          <Play size={25} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-xs font-semibold text-[var(--accent)]">Zentraler Unterrichtsraum</span>
          <span className="mt-1 block text-lg font-bold tracking-[-0.01em] text-[var(--text-primary,var(--text))]">Lehrercockpit öffnen</span>
          <span className="mt-1 block text-sm font-medium leading-6 text-[var(--text-secondary,var(--text2))]">
            Weiße Arbeitsfläche, Schreiben und Zeichnen, Widgets und Unterrichtssteuerung im Vollbild.
          </span>
        </span>
        <ChevronRight size={21} className="shrink-0 text-[var(--accent)] transition group-hover:translate-x-1" />
      </button>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {tools.map(({ id, title, description, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setPage(id)}
            className="group flex min-h-32 items-start gap-4 rounded-2xl border border-[var(--border-subtle,var(--border))] bg-[var(--surface-card,var(--surface))] p-5 text-left shadow-sm transition-colors hover:border-[var(--border-default,var(--border2))] hover:bg-[var(--surface-subtle,var(--surface2))]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,var(--accent))]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Icon size={21} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-start justify-between gap-3">
                <span className="text-base font-bold tracking-[-0.01em] text-[var(--text-primary,var(--text))]">{title}</span>
                <ChevronRight size={18} className="mt-0.5 shrink-0 text-[var(--text-muted,var(--text3))] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
              </span>
              <span className="mt-1.5 block text-sm font-medium leading-6 text-[var(--text-secondary,var(--text2))]">{description}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
