import React from 'react';
import { useApp } from '../context/AppContext';
import { Users, UserCheck, Armchair, Wallet, MessagesSquare, Heart, Notebook, ChevronRight, UserPlus, FileText, ContactRound, BarChart3, ArrowLeft } from 'lucide-react';
import { toLocalDateKey } from '../lib/localDate';
import { countStudentsWithAttendanceForDay } from '../lib/dashboardAttendance';
import ClassDossier from './ClassDossier';
import StudentDossier from './StudentDossier';

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
      className="group flex min-h-28 items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
        <Icon size={21} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="text-base font-semibold text-[var(--text)]">{item.title}</span>
          <ChevronRight size={18} className="mt-0.5 shrink-0 text-[var(--text3)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
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
  const students = app.schueler || [];
  const today = toLocalDateKey();
  const recordedToday = countStudentsWithAttendanceForDay(students, app.anwesenheit, today);
  const className = app.klassenbezeichnung?.trim();
  const schoolYear = app.schuljahr?.replace(/^(\d{4})\/\d{2}(\d{2})$/, '$1/$2');
  const attendanceLabel = recordedToday > 0 ? `${recordedToday} von ${students.length} erfasst` : 'Heute noch offen';

  React.useEffect(() => {
    setShowClassDossier(false);
    setSelectedStudentId(null);
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
    },
    {
      id: 'anwesenheit',
      title: 'Anwesenheit & Befinden',
      description: 'Anwesenheit und Befinden erfassen.',
      icon: UserCheck,
    },
    {
      id: 'dossier',
      title: 'Schülerdossier',
      description: 'Entwicklung und Informationen eines Kindes ansehen.',
      icon: ContactRound,
    },
    {
      id: 'klassendossier',
      title: 'Klassendossier',
      description: 'Überblick und Entwicklung der gesamten Klasse ansehen.',
      icon: BarChart3,
    },
    {
      id: 'sitzplan',
      title: 'Sitzplan & Gruppen',
      description: 'Sitzplätze und feste Gruppen organisieren.',
      icon: Armchair,
    },
    {
      id: 'verhalten',
      title: 'Notizen',
      description: 'Klassen- und Schülernotizen sammeln und finden.',
      icon: Notebook,
    },
  ];

  const organizationItems: HubItem[] = [
    {
      id: 'orga',
      title: 'Klassenkasse',
      description: 'Beiträge, Zahlungen und Kassenbuch verwalten.',
      icon: Wallet,
      klassenvorstandOnly: true,
    },
    {
      id: 'jahresbericht',
      title: 'Jahresabschluss',
      description: 'Freigegebene Jahresberichte prüfen und gesammelt drucken.',
      icon: FileText,
      klassenvorstandOnly: true,
    },
    {
      id: 'kel',
      title: 'KEL-Gespräche',
      description: 'Gespräche vorbereiten und Vereinbarungen festhalten.',
      icon: MessagesSquare,
      klassenvorstandOnly: true,
    },
    {
      id: 'klassengemeinschaft',
      title: 'Wir-Gefühl & Klasse',
      description: 'Klassenklima und gemeinsame Aktivitäten dokumentieren.',
      icon: Heart,
      klassenvorstandOnly: true,
    },
    {
      id: 'teamteaching',
      title: 'Teamteaching / Klassenteam',
      description: 'Klasse mit Kolleg:innen derselben Schule teilen und bearbeiten.',
      meta: 'Schulmail erforderlich',
      icon: UserPlus,
    },
  ];

  const visibleOrganizationItems = organizationItems.filter(
    item => !item.klassenvorstandOnly || app.klassenvorstand,
  );

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

      <section className="space-y-3" aria-labelledby="klasse-alltag">
        <div className="px-1">
          <h2 id="klasse-alltag" className="text-base font-semibold text-[var(--text)]">
            Kinder & Alltag
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {dailyItems.map(item => (
            <ClassCard key={item.id} item={item} onOpen={openItem} />
          ))}
        </div>
      </section>

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
