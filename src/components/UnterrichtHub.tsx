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
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <header className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Unterricht</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">
          Unterrichten, zeigen, festhalten
        </h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-[var(--text2)]">
          Das Lehrercockpit bleibt dein zentraler Unterrichtsraum. Ergänzende Werkzeuge sind hier gesammelt, statt in der Navigation verstreut zu sein.
        </p>
      </header>

      <button
        type="button"
        onClick={() => setPage('cockpit')}
        className="group flex w-full items-center gap-5 rounded-[2rem] border border-[var(--accent)]/25 bg-[var(--accent-soft)] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)]/45 hover:shadow-md sm:p-6"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--accent-text,#fff)] shadow-sm">
          <Play size={25} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-xs font-black uppercase tracking-[0.15em] text-[var(--accent)]">Zentraler Unterrichtsraum</span>
          <span className="mt-1 block text-lg font-black text-[var(--text)]">Lehrercockpit öffnen</span>
          <span className="mt-1 block text-sm font-medium leading-relaxed text-[var(--text2)]">
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
            className="group flex min-h-32 items-start gap-4 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)]/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Icon size={21} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-start justify-between gap-3">
                <span className="text-base font-black text-[var(--text)]">{title}</span>
                <ChevronRight size={18} className="mt-0.5 shrink-0 text-[var(--text3)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
              </span>
              <span className="mt-1.5 block text-sm font-medium leading-relaxed text-[var(--text2)]">{description}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
