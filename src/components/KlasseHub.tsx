import React from 'react';
import { useApp } from '../context/AppContext';
import { Users, UserCheck, Armchair, Wallet, MessagesSquare, Heart, Notebook, ChevronRight } from 'lucide-react';
import { toLocalDateKey } from '../lib/localDate';

type HubItem = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  meta?: string;
  klassenvorstandOnly?: boolean;
};

function ClassCard({
  item,
  onOpen,
}: {
  item: HubItem;
  onOpen: (id: string) => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      className="group flex min-h-36 items-start gap-4 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)]/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
        <Icon size={21} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="text-base font-black text-[var(--text)]">{item.title}</span>
          <ChevronRight size={18} className="mt-0.5 shrink-0 text-[var(--text3)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
        </span>
        <span className="mt-1.5 block text-sm font-medium leading-relaxed text-[var(--text2)]">{item.description}</span>
        {item.meta && (
          <span className="mt-3 inline-flex rounded-full bg-[var(--surface2)] px-2.5 py-1 text-xs font-bold text-[var(--text2)]">
            {item.meta}
          </span>
        )}
      </span>
    </button>
  );
}

export default function KlasseHub() {
  const { app, setPage } = useApp();
  const students = app.schueler || [];
  const today = toLocalDateKey();
  const todayAttendance = app.anwesenheit?.[today] || {};
  const recordedToday = Object.keys(todayAttendance).length;

  const dailyItems: HubItem[] = [
    {
      id: 'schueler',
      title: 'Kinder & Dossiers',
      description: 'Stammdaten, Dossiers, Kontakte und individuelle Informationen.',
      icon: Users,
      meta: `${students.length} Kinder`,
    },
    {
      id: 'anwesenheit',
      title: 'Anwesenheit & Befinden',
      description: 'Anwesenheit erfassen und Befinden dokumentieren – ohne automatische Einträge.',
      icon: UserCheck,
      meta: recordedToday > 0 ? 'Heute bereits Einträge' : 'Heute noch offen',
    },
    {
      id: 'sitzplan',
      title: 'Sitzplan & Gruppen',
      description: 'Sitzordnung, feste Gruppen und organisatorische Regeln verwalten.',
      icon: Armchair,
    },
    {
      id: 'verhalten',
      title: 'Notizen & Beobachtungen',
      description: 'Pädagogische Beobachtungen und wichtige Notizen zur Klasse festhalten.',
      icon: Notebook,
    },
  ];

  const organizationItems: HubItem[] = [
    {
      id: 'orga',
      title: 'Organisation',
      description: 'Klassenkasse, Geldsammlungen, Listen, Checklisten und Zugänge.',
      icon: Wallet,
      klassenvorstandOnly: true,
    },
    {
      id: 'kel',
      title: 'KEL-Gespräche',
      description: 'Gespräche vorbereiten, Einschätzungen vergleichen, Ziele und Vereinbarungen dokumentieren.',
      icon: MessagesSquare,
      klassenvorstandOnly: true,
    },
    {
      id: 'klassengemeinschaft',
      title: 'Wir-Gefühl & Klasse',
      description: 'Klassenklima und bewusst dokumentierte Gemeinschaftsaktivitäten.',
      icon: Heart,
      klassenvorstandOnly: true,
    },
  ];

  const visibleOrganizationItems = organizationItems.filter(
    item => !item.klassenvorstandOnly || app.klassenvorstand,
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7 px-4 py-6 sm:px-6">
      <header className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Klasse</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">
          Kinder und Klassenalltag im Blick
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-[var(--text2)]">
          Alles, was du im täglichen Umgang mit der Klasse brauchst, ist oben gebündelt. Organisation und Gemeinschaft stehen getrennt darunter.
        </p>
      </header>

      <section className="space-y-3" aria-labelledby="klasse-alltag">
        <div className="px-1">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent)]">Kinder & Alltag</p>
          <h2 id="klasse-alltag" className="mt-1 text-lg font-black text-[var(--text)]">
            Häufig gebrauchte Klassenwerkzeuge
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {dailyItems.map(item => (
            <ClassCard key={item.id} item={item} onOpen={setPage} />
          ))}
        </div>
      </section>

      {visibleOrganizationItems.length > 0 && (
        <section className="space-y-3" aria-labelledby="klasse-organisation">
          <div className="px-1">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--text3)]">
              Organisation & Gemeinschaft
            </p>
            <h2 id="klasse-organisation" className="mt-1 text-lg font-black text-[var(--text)]">
              Gespräche, Klasse und organisatorische Aufgaben
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {visibleOrganizationItems.map(item => (
              <ClassCard key={item.id} item={item} onOpen={setPage} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
