import React from 'react';
import { useApp } from '../context/AppContext';
import {
  ChevronRight,
  FileSearch,
  LayoutGrid,
  Palette,
  Printer,
  Wrench,
} from 'lucide-react';

const tools = [
  {
    id: 'textanalyse',
    title: 'Textanalyse',
    description: 'Lesbarkeit und formale Textschwierigkeit lokal mit nachvollziehbaren Kennzahlen prüfen.',
    icon: FileSearch,
    featured: true,
  },
  {
    id: 'stationenbetrieb',
    title: 'Stationenbetrieb',
    description: 'Stationen planen, Fortschritt verfolgen und Beobachtungen festhalten.',
    icon: LayoutGrid,
    featured: false,
  },
  {
    id: 'canva',
    title: 'Canva',
    description: 'Unterrichtsmaterialien und Designs gestalten und exportieren.',
    icon: Palette,
    featured: false,
  },
  {
    id: 'drucken',
    title: 'Druckzentrum',
    description: 'Listen, Klassenbuch und weitere Ausgabeformate zentral vorbereiten.',
    icon: Printer,
    featured: false,
  },
] as const;

export default function ToolsHub() {
  const { setPage } = useApp();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <header className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <Wrench size={22} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Werkzeuge</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">Tools</h1>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-[var(--text2)]">
          Kleine, konkrete Helfer an einem Ort. Bestehende Funktionen bleiben weiterhin auch in ihren Fachbereichen erreichbar.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {tools.map(({ id, title, description, icon: Icon, featured }) => (
          <button
            key={id}
            type="button"
            onClick={() => setPage(id)}
            className={`group flex min-h-32 items-start gap-4 rounded-[1.75rem] border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
              featured
                ? 'border-[var(--accent)]/30 bg-[var(--accent-soft)]'
                : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/35'
            }`}
          >
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              featured ? 'bg-[var(--accent)] text-[var(--accent-text,#fff)]' : 'bg-[var(--accent-soft)] text-[var(--accent)]'
            }`}>
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
