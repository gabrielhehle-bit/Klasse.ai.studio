import React from 'react';
import { useApp } from '../context/AppContext';
import { Users, UserCheck, Armchair, Wallet, MessagesSquare, Heart, ChevronRight } from 'lucide-react';

type HubItem = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  meta?: string;
  klassenvorstandOnly?: boolean;
};

export default function KlasseHub() {
  const { app, setPage } = useApp();
  const students = app.schueler || [];
  const today = new Date().toISOString().slice(0, 10);
  const todayAttendance = app.anwesenheit?.[today] || {};
  const recordedToday = Object.keys(todayAttendance).length;

  const items: HubItem[] = [
    { id: 'schueler', title: 'Kinder & Dossiers', description: 'Stammdaten, Dossiers, Kontakte und individuelle Informationen.', icon: Users, meta: `${students.length} Kinder` },
    { id: 'anwesenheit', title: 'Anwesenheit & Befinden', description: 'Anwesenheit erfassen und Befinden dokumentieren – ohne automatische Einträge.', icon: UserCheck, meta: recordedToday > 0 ? 'Heute bereits Einträge' : 'Heute noch offen' },
    { id: 'sitzplan', title: 'Sitzplan & Gruppen', description: 'Sitzordnung, feste Gruppen und organisatorische Regeln verwalten.', icon: Armchair },
    { id: 'orga', title: 'Organisation', description: 'Klassenkasse, Geldsammlungen, Listen, Checklisten und Zugänge.', icon: Wallet, klassenvorstandOnly: true },
    { id: 'kel', title: 'KEL-Gespräche', description: 'Gespräche vorbereiten, Einschätzungen vergleichen, Ziele und Vereinbarungen dokumentieren.', icon: MessagesSquare, klassenvorstandOnly: true },
    { id: 'klassengemeinschaft', title: 'Wir-Gefühl & Klasse', description: 'Klassenklima und bewusst dokumentierte Gemeinschaftsaktivitäten.', icon: Heart, klassenvorstandOnly: true },
  ];

  const visible = items.filter(item => !item.klassenvorstandOnly || app.klassenvorstand);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <header className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Klasse</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">
          Alles rund um deine Klasse
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-[var(--text2)]">
          Kinder, Anwesenheit, Sitzplan und Organisation an einem Ort. Fachliche Detailfunktionen bleiben in den jeweiligen Bereichen erhalten.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {visible.map(({ id, title, description, icon: Icon, meta }) => (
          <button
            key={id}
            type="button"
            onClick={() => setPage(id)}
            className="group flex min-h-36 items-start gap-4 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)]/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
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
              {meta && <span className="mt-3 inline-flex rounded-full bg-[var(--surface2)] px-2.5 py-1 text-xs font-bold text-[var(--text2)]">{meta}</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
