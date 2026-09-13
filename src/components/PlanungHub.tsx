import React from 'react';
import { useApp } from '../context/AppContext';
import { LayoutDashboard, CalendarDays, CalendarRange, BookOpen, Folder, Palette, Replace, ChevronRight } from 'lucide-react';

const items = [
  { id: 'planungszentrale', label: 'Übersicht', description: 'Aktuelle Woche, offene Planung und Planungswerkzeuge.', icon: LayoutDashboard },
  { id: 'wochenplanung', label: 'Woche', description: 'Wochenplan im Raster, Vollbild, Excel-Roundtrip und Aufgabenblatt.', icon: CalendarDays },
  { id: 'jahresplanung', label: 'Jahr', description: 'Jahres- und Stoffplanung mit Schulwochen und Excel-Roundtrip.', icon: CalendarRange },
  { id: 'stunden', label: 'Unterricht', description: 'Stundenentwürfe und vorbereitete Unterrichtsabläufe.', icon: BookOpen },
  { id: 'materialien', label: 'Material', description: 'Materialbibliothek, Entwürfe und Übergabe in den Wochenplan.', icon: Folder },
  { id: 'canva', label: 'Canva', description: 'Designs suchen, erstellen, in Canva bearbeiten und exportieren.', icon: Palette },
] as const;

export default function PlanungHub() {
  const { setPage } = useApp();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <header className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Planung</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">Planen, vorbereiten, verwenden</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-[var(--text2)]">
          Die wichtigsten Planungswege sind direkt erreichbar. Bestehende Detailwerkzeuge bleiben vollständig erhalten.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-3 sm:grid-cols-3 lg:grid-cols-6">
        {items.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setPage(id)}
            className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl px-3 py-3 text-center text-sm font-bold text-[var(--text2)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
            <Icon size={19} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map(({ id, label, description, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setPage(id)}
            className="group flex items-center gap-4 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-5 text-left shadow-sm transition hover:border-[var(--accent)]/35 hover:shadow-md">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]"><Icon size={21} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-black text-[var(--text)]">{label}</span>
              <span className="mt-1 block text-sm font-medium leading-relaxed text-[var(--text2)]">{description}</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-[var(--text3)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
          </button>
        ))}
      </div>

      <button type="button" onClick={() => setPage('vertretung')}
        className="flex w-full items-center gap-4 rounded-[1.5rem] border border-dashed border-[var(--border2)] bg-[var(--surface2)] p-5 text-left transition hover:border-[var(--accent)]/35">
        <Replace size={20} className="text-[var(--accent)]" />
        <span className="flex-1"><strong className="block text-sm text-[var(--text)]">Vertretung vorbereiten</strong><span className="text-sm text-[var(--text2)]">Echte Stundenplan-, Wochenplan- und Materialdaten für eine Übergabe zusammenstellen.</span></span>
        <ChevronRight size={18} className="text-[var(--text3)]" />
      </button>
    </div>
  );
}
