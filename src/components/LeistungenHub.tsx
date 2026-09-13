import React from 'react';
import { useApp } from '../context/AppContext';
import { BarChart3, Target, Activity, LineChart, MessagesSquare, Table2, FileText, ChevronRight } from 'lucide-react';

const items = [
  { id: 'noten', title: 'Notenmappe', description: 'Noten, Prozent, Punkte, Gewichtungen, Schularbeiten, LZK, WOPL und sonstige Leistungen.', icon: BarChart3 },
  { id: 'portfolio', title: 'Lernziele & Portfolio', description: 'Dokumentierte Lernziele, Portfolio-Einträge und Leistungsnachweise der Kinder.', icon: Target },
  { id: 'diagnostik', title: 'Diagnostik', description: 'Einzelkind, Klasse, Ergebnisse, iKM Plus, Antolin, Förderziele, Live-Checks und weitere Werkzeuge.', icon: Activity },
  { id: 'statistik', title: 'Statistik & Profile', description: 'Auswertungen und grafische Übersichten auf Basis tatsächlich erfasster Daten.', icon: LineChart },
  { id: 'kel', title: 'KEL-Gespräche', description: 'Vorbereiten, Einschätzen, Gespräch führen, Ziele vereinbaren und Präsentation erstellen.', icon: MessagesSquare },
  { id: 'notenTabelle', title: 'Notenübersicht', description: 'Kompakte tabellarische Übersicht über vorhandene Leistungsdaten.', icon: Table2 },
  { id: 'jahresbericht', title: 'Jahresbericht', description: 'Dokumentierte Jahresübersichten und Berichte ohne erfundene Aussagen.', icon: FileText },
] as const;

export default function LeistungenHub() {
  const { app, setPage } = useApp();
  const visible = items.filter(item => app.klassenvorstand || !['diagnostik', 'jahresbericht'].includes(item.id));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <header className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Leistungen</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">Leistungen, Entwicklung & Gespräche</h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-[var(--text2)]">
          Erfassen und auswerten – ohne Funktionen zu verstecken oder pädagogische Aussagen aus fehlenden Daten zu erfinden.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {visible.map(({ id, title, description, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setPage(id)}
            className="group flex min-h-32 items-start gap-4 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)]/35 hover:shadow-md">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]"><Icon size={21} /></span>
            <span className="min-w-0 flex-1">
              <span className="flex items-start justify-between gap-3"><span className="text-base font-black text-[var(--text)]">{title}</span><ChevronRight size={18} className="mt-0.5 shrink-0 text-[var(--text3)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" /></span>
              <span className="mt-1.5 block text-sm font-medium leading-relaxed text-[var(--text2)]">{description}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
