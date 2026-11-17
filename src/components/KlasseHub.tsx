import React from 'react';
import { useApp } from '../context/AppContext';
import { Users, UserCheck, Armchair, Wallet, MessagesSquare, Heart, Notebook, ChevronRight, UserPlus, FileText, ContactRound, BarChart3, ArrowLeft, Search, X } from 'lucide-react';
import { toLocalDateKey } from '../lib/localDate';
import { countStudentsWithAttendanceForDay } from '../lib/dashboardAttendance';
import { filterClassHubItems } from '../lib/classHubSearch';
import ClassDossier from './ClassDossier';
import StudentDossier from './StudentDossier';

type HubItem = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  meta?: string;
  keywords?: string;
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
        <span className="mt-1 block text-sm leading-relaxed text-[var(--text2)]">{item.description}</span>
        {item.meta && (
          <span className="mt-2 inline-flex rounded-md bg-[var(--surface2)] px-2.5 py-1 text-xs font-medium text-[var(--text2)]">
            {item.meta}
          </span>
        )}
      </span>
    </button>
  );
}

export default function KlasseHub() {
  const { app, setPage } = useApp();
  const [showClassDossier, setShowClassDossier] = React.useState(false);
  const [selectedStudentId, setSelectedStudentId] = React.useState<string | null>(null);
  const [functionQuery, setFunctionQuery] = React.useState('');
  const students = app.schueler || [];
  const today = toLocalDateKey();
  const recordedToday = countStudentsWithAttendanceForDay(students, app.anwesenheit, today);
  const className = app.klassenbezeichnung?.trim();
  const schoolYear = app.schuljahr?.replace(/^(\d{4})\/\d{2}(\d{2})$/, '$1/$2');
  const attendanceLabel = recordedToday > 0 ? `${recordedToday} von ${students.length} erfasst` : 'Heute noch offen';

  React.useEffect(() => {
    setShowClassDossier(false);
    setSelectedStudentId(null);
    setFunctionQuery('');
  }, [app.activeClassId]);

  if (selectedStudentId) {
    return (
      <StudentDossier
        schuelerId={selectedStudentId}
        onBack={() => setSelectedStudentId(null)}
        onStudentChange={setSelectedStudentId}
      />
    );
  }

  if (showClassDossier) {
    return (
      <div className="mx-auto w-full max-w-[1500px] space-y-4 px-3 py-4 sm:px-5 sm:py-5" data-class-dossier-page>
        <button
          type="button"
          onClick={() => setShowClassDossier(false)}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text2)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <ArrowLeft size={17} />
          Zur Klassenübersicht
        </button>
        <ClassDossier onSelectStudent={setSelectedStudentId} />
      </div>
    );
  }

  const dailyItems: HubItem[] = [
    {
      id: 'schueler',
      title: 'Klassenliste',
      description: 'Kinder und Stammdaten verwalten.',
      icon: Users,
      meta: `${students.length} Kinder`,
      keywords: 'Kinderliste Namen Schüler Schülerliste Stammdaten Klasse',
    },
    {
      id: 'anwesenheit',
      title: 'Anwesenheit & Befinden',
      description: 'Anwesenheit und Befinden erfassen.',
      icon: UserCheck,
      keywords: 'Fehlzeiten Fehlstunden krank anwesend Stimmung Tagesbeginn',
    },
    {
      id: 'dossier',
      title: 'Schülerdossier',
      description: 'Entwicklung und Informationen eines Kindes ansehen.',
      icon: ContactRound,
      keywords: 'Kind Lernstand Entwicklung Beobachtungen Elternbericht Elterngespräch',
    },
    {
      id: 'klassendossier',
      title: 'Klassendossier',
      description: 'Überblick und Entwicklung der gesamten Klasse ansehen.',
      icon: BarChart3,
      keywords: 'Statistik Klassenentwicklung Leistungen Diagramme',
    },
    {
      id: 'sitzplan',
      title: 'Sitzplan & Gruppen',
      description: 'Sitzplätze und feste Gruppen organisieren.',
      icon: Armchair,
      keywords: 'Sitzordnung Tische Plätze Platztausch Gruppeneinteilung Raumplan',
    },
    {
      id: 'verhalten',
      title: 'Notizen',
      description: 'Klassen- und Schülernotizen sammeln und finden.',
      icon: Notebook,
      keywords: 'Beobachtungen Journaleinträge Verhalten Notiz',
    },
  ];

  const organizationItems: HubItem[] = [
    {
      id: 'orga',
      title: 'Organisation & Listen',
      description: 'Klassenkasse, Sammlungen, Ausflüge, Checklisten und eigene Listen.',
      icon: Wallet,
      meta: 'Kasse · Checklisten · Listen',
      keywords: 'Geld Beiträge Zahlungen Kassenbuch Ausflug Checkliste Organisation Sammelgeld Passwort Zugangsdaten',
      klassenvorstandOnly: true,
    },
    {
      id: 'jahresbericht',
      title: 'Jahresabschluss',
      description: 'Freigegebene Jahresberichte prüfen und gesammelt drucken.',
      icon: FileText,
      keywords: 'Jahresbericht Zeugnis Abschluss Berichte Druck',
      klassenvorstandOnly: true,
    },
    {
      id: 'kel',
      title: 'KEL-Gespräche',
      description: 'Gespräche vorbereiten und Vereinbarungen festhalten.',
      icon: MessagesSquare,
      keywords: 'Eltern Elterngespräch Elternsprechtag Entwicklungsgespräch Protokoll KEL Gesprächsnotizen',
      klassenvorstandOnly: true,
    },
    {
      id: 'klassengemeinschaft',
      title: 'Wir-Gefühl & Klasse',
      description: 'Klassenklima und gemeinsame Aktivitäten dokumentieren.',
      icon: Heart,
      keywords: 'Klassengemeinschaft Klassenklima Wohlbefinden Aktivitäten',
      klassenvorstandOnly: true,
    },
    {
      id: 'teamteaching',
      title: 'Teamteaching / Klassenteam',
      description: 'Klasse mit Kolleg:innen derselben Schule teilen und bearbeiten.',
      meta: 'Schulmail erforderlich',
      icon: UserPlus,
      keywords: 'Team Zusammenarbeit gemeinsam Synchronisieren Kollegium Freigabe Laptop',
    },
  ];

  const visibleDailyItems = filterClassHubItems(dailyItems, functionQuery);
  const visibleOrganizationItems = filterClassHubItems(
    organizationItems.filter(item => !item.klassenvorstandOnly || app.klassenvorstand),
    functionQuery,
  );
  const matchingFunctions = visibleDailyItems.length + visibleOrganizationItems.length;

  const openItem = (id: string) => {
    if (id === 'klassendossier') {
      setShowClassDossier(true);
      return;
    }
    setPage(id);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-5 sm:px-6 sm:py-6" data-class-hub>
      <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)] break-words">
            {className ? `Klasse ${className}` : 'Deine Klasse'}
          </h1>
          <p className="mt-1 text-sm text-[var(--text2)]">
            {students.length} {students.length === 1 ? 'Kind' : 'Kinder'}{schoolYear && <> · Schuljahr {schoolYear}</>}
          </p>
        </div>
        {students.length > 0 && (
          <button type="button" onClick={() => setPage('anwesenheit')}
            className="group flex min-h-14 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left transition-colors hover:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label={`Anwesenheit öffnen: ${attendanceLabel}`}>
            <UserCheck size={20} className={recordedToday === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--text2)]'} />
            <span className="min-w-0">
              <span className="block text-xs text-[var(--text2)]">Anwesenheit heute</span>
              <span className={`block text-sm font-semibold ${recordedToday === 0 ? 'text-amber-700 dark:text-amber-300' : 'text-[var(--text)]'}`}>{attendanceLabel}</span>
            </span>
            <ChevronRight size={16} className="ml-auto shrink-0 text-[var(--text3)] group-hover:text-[var(--accent)]" />
          </button>
        )}
      </header>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4" data-class-function-search>
        <label htmlFor="class-function-search" className="mb-2 block text-sm font-semibold text-[var(--text)]">Was möchtest du erledigen?</label>
        <div className="relative">
          <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
          <input id="class-function-search" type="search"
            value={functionQuery} onChange={event => setFunctionQuery(event.target.value)}
            placeholder="z. B. Sitzplan, Ausflug, Eltern, Checkliste"
            autoComplete="off"
            className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface2)] py-2 pl-10 pr-12 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          />
          {functionQuery.length > 0 && (
            <button type="button" onClick={() => setFunctionQuery('')}
              aria-label="Funktionssuche leeren"
              className="absolute right-2 top-1/2 inline-flex min-h-9 min-w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text2)] hover:bg-[var(--surface)]">
              <X size={17} />
            </button>
          )}
        </div>
        {functionQuery.trim() && (
          <p className="mt-2 text-xs text-[var(--text2)]" role="status" aria-live="polite">
            {matchingFunctions} {matchingFunctions === 1 ? 'passende Funktion' : 'passende Funktionen'} gefunden.
          </p>
        )}
      </div>

      {functionQuery.trim() && matchingFunctions === 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center" data-class-search-empty>
          <p className="text-sm font-semibold text-[var(--text)]">Keine passende Funktion gefunden</p>
          <p className="mt-1 text-sm text-[var(--text2)]">Versuche einen anderen Begriff oder zeige alle Funktionen an.</p>
          <button type="button" onClick={() => setFunctionQuery('')}
            className="mt-3 min-h-11 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white">
            Alle Funktionen anzeigen
          </button>
        </div>
      )}

      {visibleDailyItems.length > 0 && <section className="space-y-3" aria-labelledby="klasse-alltag">
        <div className="px-1">
          <h2 id="klasse-alltag" className="text-base font-semibold text-[var(--text)]">
            Kinder & Alltag
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {visibleDailyItems.map(item => (
            <ClassCard key={item.id} item={item} onOpen={openItem} />
          ))}
        </div>
      </section>}

      {visibleOrganizationItems.length > 0 && (
        <section className="space-y-3" aria-labelledby="klasse-organisation">
          <div className="px-1">
            <h2 id="klasse-organisation" className="text-base font-semibold text-[var(--text)]">
              Organisation & Gemeinschaft
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {visibleOrganizationItems.map(item => (
              <ClassCard key={item.id} item={item} onOpen={setPage} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
