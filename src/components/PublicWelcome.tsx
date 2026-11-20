import React from 'react';
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  LayoutDashboard,
  LogIn,
  Presentation,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react';
import { getNormalizedAssessmentPercent } from '../lib/GradeUtils';
import PublicFreePromise from './PublicFreePromise';

export type PublicEntryMode = 'landing' | 'demo';

interface PublicWelcomeProps {
  mode: PublicEntryMode;
  onLogin: () => void;
  onDemo: () => void;
  onHome: () => void;
}

const demoStudents = [
  ['Lukas', 'da'],
  ['Sophie', 'da'],
  ['Mia', 'da'],
  ['Felix', 'fehlt'],
  ['Anna', 'da'],
  ['Tobias', 'da'],
] as const;

function KlassioMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-700 text-white">
        <GraduationCap size={22} strokeWidth={2} aria-hidden="true" />
      </div>
      <span className="text-lg font-black tracking-[-0.045em] text-slate-950">KLASSIO</span>
    </div>
  );
}

function HeroPreview() {
  return (
    <figure className="min-w-0 rounded-[1.75rem] border border-indigo-100 bg-[#efedf9] p-3 sm:p-6 lg:p-7">
      <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-[0_18px_42px_-24px_rgba(49,46,129,0.55)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3.5 text-sm sm:px-6">
          <span className="inline-flex items-center gap-2.5 font-bold text-slate-950">
            <LayoutDashboard size={16} className="text-indigo-700" aria-hidden="true" /> Heute
          </span>
          <span className="font-medium text-slate-600">Beispielklasse 3b</span>
        </div>
        <div className="space-y-5 p-4 sm:p-6">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-950">Dein Unterricht am Freitag</h2>
            <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200">
              <li className="flex items-center gap-3 px-3 py-3">
                <span className="h-8 w-1 shrink-0 rounded-full bg-blue-500" aria-hidden="true" />
                <span className="text-xs font-medium tabular-nums text-slate-600">08:00</span>
                <div><div className="text-sm font-bold text-slate-950">Mathematik</div><div className="text-xs text-slate-600">Einführung in die Multiplikation</div></div>
              </li>
              <li className="flex items-center gap-3 px-3 py-3">
                <span className="h-8 w-1 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                <span className="text-xs font-medium tabular-nums text-slate-600">08:55</span>
                <div><div className="text-sm font-bold text-slate-950">Deutsch</div><div className="text-xs text-slate-600">Partnerlesen</div></div>
              </li>
            </ul>
          </div>
          <div className="rounded-xl bg-indigo-50 p-4">
            <div className="flex items-center gap-2.5 text-sm font-bold text-indigo-950">
              <ClipboardCheck size={18} className="shrink-0 text-indigo-700" aria-hidden="true" /> KEL-Gespräch vorbereiten
            </div>
            <p className="mt-2 text-xs leading-5 text-indigo-950/85 sm:text-sm">
              Aus „Leseflüssigkeit“ in der Notenmappe wird ein Lernnachweis fürs Gespräch und das Elternblatt.
            </p>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs font-medium text-indigo-950/75">Vorschau mit Beispieldaten</figcaption>
    </figure>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
        <Icon size={21} />
      </div>
      <h3 className="text-lg font-black tracking-tight text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function ProductPreviewSection({ onDemo }: Pick<PublicWelcomeProps, 'onDemo'>) {
  const [tab, setTab] = React.useState<'dashboard' | 'planung' | 'cockpit' | 'dossier'>('dashboard');

  const tabs = [
    ['dashboard', 'Dashboard', LayoutDashboard],
    ['planung', 'Wochenplanung', CalendarDays],
    ['cockpit', 'Lehrer-Cockpit', Presentation],
    ['dossier', 'Schülerdossier', UserRound],
  ] as const;

  return (
    <section id="produkt" className="scroll-mt-20 border-y border-slate-200 bg-white">
      <div className="mx-auto max-w-[1240px] px-5 py-12 sm:px-7 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl">
            Schau dich in KLASSIO um
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Wähle einen Bereich und sieh dir die Beispielklasse an.
          </p>
        </div>

        <div className="-mx-1 mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-2 [scrollbar-width:none] sm:mx-0 sm:mt-9 [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max snap-x snap-mandatory gap-1 sm:mx-auto sm:justify-center">
            {tabs.map(([id, label, Icon]) => (
              <button
                type="button"
                key={id}
                onClick={() => setTab(id)}
                aria-pressed={tab === id}
                className={'inline-flex min-h-10 snap-start items-center gap-2 rounded-xl px-3.5 text-xs font-black transition-all ' + (tab === id ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-slate-800')}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50 p-2 shadow-sm sm:rounded-[1.8rem] sm:p-5">
          {tab === 'dashboard' && <DashboardDemo />}
          {tab === 'planung' && <WeeklyPlanDemo />}
          {tab === 'cockpit' && <CockpitDemo />}
          {tab === 'dossier' && <DossierDemo />}
        </div>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onDemo}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition-all hover:-translate-y-0.5 hover:bg-indigo-600"
          >
            Interaktive Demo öffnen
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
    </section>
  );
}

function Landing({ onLogin, onDemo }: Pick<PublicWelcomeProps, 'onLogin' | 'onDemo'>) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fcfbf8] text-slate-950">
      <header className="border-b border-slate-200 bg-[#fcfbf8]">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-3 px-5 py-3.5 sm:px-7 lg:px-8">
          <KlassioMark />
          <nav aria-label="Hauptnavigation" className="flex items-center gap-2">
            <a
              href="#klassio-entdecken"
              className="hidden rounded-xl px-3.5 py-2 text-sm font-bold text-slate-500 transition-colors hover:bg-white hover:text-slate-900 md:inline-flex"
            >
              Funktionen
            </a>
            <a
              href="#sicherheit"
              className="hidden rounded-xl px-3.5 py-2 text-sm font-bold text-slate-500 transition-colors hover:bg-white hover:text-slate-900 lg:inline-flex"
            >
              Sicherheit
            </a>
            <button
              type="button"
              onClick={onLogin}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-bold text-slate-800 transition-colors hover:border-indigo-300 hover:text-indigo-800"
            >
              <LogIn size={16} aria-hidden="true" />
              Anmelden
            </button>
          </nav>
        </div>
      </header>

      <main>
        <section data-public-landing-hero aria-labelledby="klassio-start-heading" className="border-b border-slate-200">
          <div className="mx-auto grid max-w-[1240px] items-center gap-8 px-5 py-7 sm:px-7 sm:py-14 lg:grid-cols-[0.94fr_1.06fr] lg:gap-12 lg:px-8 lg:py-17">
            <div>
              <p className="text-sm font-bold text-indigo-700">Die App für Lehrpersonen</p>
              <h1 id="klassio-start-heading" className="mt-3 max-w-xl text-balance text-[clamp(2.2rem,8.7vw,3.3rem)] font-black leading-[1.05] tracking-[-0.055em] text-slate-950 lg:text-[clamp(3.2rem,5.1vw,4.35rem)]">
                Dein Schulalltag, gut organisiert.
              </h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-slate-700 sm:text-lg">
                Plane deine Woche, behalte deine Klasse im Blick und nutze vorhandene Einträge für deine KEL-Gespräche.
              </p>
              <div data-public-free-promise className="mt-5 flex max-w-max flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-emerald-200 bg-[#eaf6ed] px-4 py-2.5 sm:mt-6 sm:px-5">
                <span className="whitespace-nowrap text-[2.75rem] font-black leading-none tracking-[-0.08em] text-emerald-900 sm:text-5xl">0 €</span>
                <div className="text-emerald-950">
                  <p className="text-sm font-bold sm:text-base">Dauerhaft kostenlos</p>
                  <p className="text-xs leading-5 sm:text-sm">Alle Funktionen inklusive.</p>
                </div>
              </div>
              <div className="mt-6 grid gap-2.5 min-[400px]:flex min-[400px]:flex-wrap">
                <button
                  type="button"
                  onClick={onDemo}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-800 sm:px-5"
                >
                  Demo ausprobieren
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={onLogin}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-900 transition-colors hover:border-indigo-300 hover:text-indigo-800 sm:px-5"
                >
                  Mit KLASSIO starten
                </button>
              </div>
              <p className="mt-3 text-xs font-medium leading-5 text-slate-600 sm:text-sm">Demo ohne Anmeldung, nur mit Beispieldaten.</p>
            </div>
            <HeroPreview />
          </div>
        </section>

        <section id="klassio-entdecken" className="scroll-mt-20">
          <div className="mx-auto max-w-[1240px] px-5 py-12 sm:px-7 sm:py-16 lg:px-8">
            <h2 className="text-3xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl">Was du mit KLASSIO machen kannst</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <FeatureCard
                icon={CalendarDays}
                title="Unterricht planen"
                text="Bereite deine Woche vor und sieh Unterricht, Hausübungen und Termine auf einen Blick."
              />
              <FeatureCard
                icon={Presentation}
                title="Deine Klasse im Blick behalten"
                text="Halte Anwesenheit und Beobachtungen fest. Nutze im Unterricht die digitale Tafel und die Werkzeuge im Lehrer-Cockpit."
              />
              <FeatureCard
                icon={ClipboardCheck}
                title="KEL-Gespräche vorbereiten"
                text="Nutze vorhandene Noten, Lernbereiche und Beobachtungen für die Gesprächsfolien. Drucke das Elternblatt direkt aus dem Entwurf."
              />
            </div>
          </div>
        </section>

        <ProductPreviewSection onDemo={onDemo} />

        <section id="sicherheit" className="scroll-mt-20">
          <div className="mx-auto grid max-w-[1240px] gap-5 px-5 py-12 sm:px-7 sm:py-16 lg:grid-cols-[1.06fr_0.94fr] lg:px-8">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
              <div className="mb-4 inline-flex rounded-xl bg-indigo-50 p-2.5 text-indigo-700">
                <ShieldCheck size={22} aria-hidden="true" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Geschützt arbeiten</h2>
              <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-base">
                Deine Klassendaten liegen im geschützten Arbeitsbereich. Für die öffentliche Demo gibt es eine eigene Klasse mit erfundenen Daten.
              </p>
              <ul className="mt-4 grid gap-2.5 text-sm font-medium text-slate-700">
                <li className="flex items-start gap-2.5"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" /> Lokaler Datentresor mit AES-256-Verschlüsselung</li>
                <li className="flex items-start gap-2.5"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" /> Technisch getrennte Anmeldung und Datenschlüssel</li>
              </ul>
            </div>
            <div className="flex flex-col items-start rounded-3xl border border-emerald-200 bg-[#eaf6ed] p-6 sm:p-8">
              <h2 className="text-2xl font-bold tracking-tight text-emerald-950 sm:text-3xl">Kostenlos für Lehrpersonen</h2>
              <p className="mt-3 text-sm leading-6 text-emerald-950 sm:text-base">
                Alle Funktionen von KLASSIO sind dauerhaft kostenlos. Wer das Projekt unterstützen möchte, kann das freiwillig tun.
              </p>
              <p className="mt-3 text-sm text-emerald-950">Wissenschaftlich begleitet an der PH Feldkirch.</p>
              <button
                type="button"
                onClick={onLogin}
                className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 text-sm font-bold text-white transition-colors hover:bg-emerald-900"
              >
                Mit KLASSIO starten
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-950 text-white">
        <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-7 lg:px-8">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-950">
                  <GraduationCap size={21} strokeWidth={2.2} />
                </div>
                <div>
                  <div className="text-[1.05rem] font-black tracking-[-0.04em]">KLASSIO</div>
                  <div className="mt-1 text-[0.62rem] font-bold uppercase tracking-[0.2em] text-white/40">Lehreralltag, klarer.</div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm font-bold text-white/60 sm:flex sm:flex-wrap sm:items-center">
              <a href="#klassio-entdecken" className="transition-colors hover:text-white">Funktionen</a>
              <a href="#produkt" className="transition-colors hover:text-white">Produkt ansehen</a>
              <a href="#sicherheit" className="transition-colors hover:text-white">Datenschutz & Sicherheit</a>
              <button type="button" onClick={onDemo} className="transition-colors hover:text-white">Demo</button>
              <button type="button" onClick={onLogin} className="text-white transition-colors hover:text-indigo-300">Anmelden →</button>
            </div>
          </div>
          <div className="mt-8 border-t border-white/10 pt-5 text-[0.68rem] font-semibold text-white/30">
            © 2026 KLASSIO
          </div>
        </div>
      </footer>
    </div>
  );
}

function DashboardDemo() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { value: '19', label: 'Kinder heute', icon: Users, note: '1 fehlt' },
          { value: '4', label: 'Unterrichtseinheiten', icon: BookOpen, note: 'bis 11:35' },
          { value: '3', label: 'Offene Aufgaben', icon: ClipboardCheck, note: '1 wichtig' },
        ].map(({ value, label, icon: Icon, note }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <Icon size={17} className="text-indigo-500" />
            <div className="mt-4 text-2xl font-black text-slate-950">{value}</div>
            <div className="text-xs font-black text-slate-700">{label}</div>
            <div className="mt-1 text-[0.68rem] font-semibold text-slate-400">{note}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-black text-slate-900">Heute · Unterricht</div>
              <div className="mt-1 text-[0.68rem] font-semibold text-slate-400">Freitag, Beispielwoche</div>
            </div>
            <CalendarDays size={18} className="text-slate-300" />
          </div>
          <div className="space-y-2">
            {[
              ['08:00', 'Mathematik', 'Einführung: Multiplikation', 'bg-blue-500'],
              ['08:55', 'Deutsch', 'Partnerlesen', 'bg-amber-500'],
              ['09:50', 'Sachunterricht', 'Wasser & Kreislauf', 'bg-emerald-500'],
            ].map(([time, subject, topic, dot]) => (
              <div key={time as string} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3">
                <div className={`h-8 w-1 rounded-full ${dot as string}`} />
                <div className="w-11 text-xs font-black text-slate-400">{time as string}</div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-800">{subject as string}</div>
                  <div className="truncate text-[0.7rem] font-semibold text-slate-400">{topic as string}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-xs font-black text-slate-900">
            <Bell size={16} className="text-rose-500" />
            Nicht vergessen
          </div>
          <div className="mt-4 space-y-3">
            {['Lesemappen einsammeln', 'Elterninfo hochladen', 'Material für MINT'].map((item, i) => (
              <div key={item} className="flex items-start gap-3">
                <div className={`mt-0.5 h-4 w-4 rounded-md border ${i === 0 ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white'}`} />
                <div className="text-xs font-bold leading-5 text-slate-600">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WeeklyPlanDemo() {
  const days = [
    ['Mo', 'Deutsch', 'Lesetraining'],
    ['Di', 'Mathematik', 'Malreihen entdecken'],
    ['Mi', 'Sachunterricht', 'Wasser'],
    ['Do', 'Musik', 'Rhythmus'],
    ['Fr', 'Deutsch', 'Freies Schreiben'],
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <div className="text-sm font-black text-slate-900">Wochenplanung</div>
          <div className="text-[0.68rem] font-semibold text-slate-400">KW 39 · Beispielklasse 3b</div>
        </div>
        <div className="rounded-xl bg-indigo-50 px-3 py-2 text-[0.68rem] font-black text-indigo-700">Aktuelle Woche</div>
      </div>
      <div className="grid divide-y divide-slate-100 md:grid-cols-5 md:divide-x md:divide-y-0">
        {days.map(([day, subject, topic], index) => (
          <div key={day} className="min-h-[210px] p-4">
            <div className="text-xs font-black text-slate-400">{day}</div>
            <div className="mt-4 rounded-xl border border-slate-200 p-3">
              <div className="text-[0.64rem] font-black uppercase tracking-wider text-indigo-600">{subject}</div>
              <div className="mt-1 text-xs font-black leading-5 text-slate-800">{topic}</div>
              <div className="mt-3 text-[0.67rem] font-semibold leading-4 text-slate-400">
                {index % 2 === 0 ? 'Gemeinsamer Einstieg · Übungsphase' : 'Material vorbereitet'}
              </div>
            </div>
            {index === 3 && (
              <div className="mt-3 rounded-xl bg-amber-50 p-3">
                <div className="text-[0.62rem] font-black uppercase tracking-wider text-amber-700">Hausübung</div>
                <div className="mt-1 text-[0.7rem] font-bold text-amber-900">Lesen S. 24–25 · bis Freitag</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CockpitDemo() {
  const [attendance, setAttendance] = React.useState<Record<string, 'da' | 'fehlt'>>(
    Object.fromEntries(demoStudents.map(([name, status]) => [name, status])) as Record<string, 'da' | 'fehlt'>
  );
  const [seconds, setSeconds] = React.useState(300);
  const [running, setRunning] = React.useState(false);

  React.useEffect(() => {
    if (!running || seconds <= 0) return;
    const id = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [running, seconds]);

  const minuteText = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secondText = String(seconds % 60).padStart(2, '0');

  return (
    <div className="grid min-h-[470px] gap-4 lg:grid-cols-[1fr_240px]">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5">
        <div className="absolute left-5 top-5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="flex items-center gap-2 text-[0.68rem] font-black text-slate-500">
            <Clock3 size={14} className="text-indigo-500" />
            Timer
          </div>
          <div className="mt-1 text-2xl font-black tabular-nums text-slate-950">{minuteText}:{secondText}</div>
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => setRunning(value => !value)}
              className="rounded-lg bg-slate-950 px-2.5 py-1 text-[0.62rem] font-black text-white"
            >
              {running ? 'Pause' : 'Start'}
            </button>
            <button
              type="button"
              onClick={() => {
                setRunning(false);
                setSeconds(300);
              }}
              className="rounded-lg bg-slate-100 px-2.5 py-1 text-[0.62rem] font-black text-slate-600"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-36 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 sm:ml-44 sm:mt-0">
          <h3 className="font-bold text-indigo-950">Arbeitsauftrag</h3>
          <p className="mt-2 text-sm text-indigo-950">Lies den Text leise. Markiere anschließend zwei Wörter für das Partnerlesen.</p>
          <p className="mt-2 text-xs font-semibold text-indigo-700">5 Minuten Einzelarbeit</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-black text-slate-900">Schülerliste</div>
            <div className="text-[0.65rem] font-semibold text-slate-400">Klicke den Status an</div>
          </div>
          <Users size={17} className="text-slate-300" />
        </div>
        <div className="space-y-2">
          {demoStudents.map(([name]) => {
            const status = attendance[name] || 'da';
            return (
              <button
                type="button"
                key={name}
                onClick={() => setAttendance(prev => ({ ...prev, [name]: status === 'da' ? 'fehlt' : 'da' }))}
                className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-left transition-colors hover:bg-slate-100"
              >
                <span className="text-xs font-black text-slate-700">{name}</span>
                <span className={`rounded-lg px-2 py-1 text-[0.6rem] font-black ${status === 'da' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {status === 'da' ? 'Da' : 'Fehlt'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DossierDemo() {
  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-xl font-black text-indigo-700">SM</div>
        <div className="mt-4 text-lg font-black text-slate-950">Sophie Muster</div>
        <div className="text-xs font-semibold text-slate-400">Beispielklasse 3b</div>
        <div className="mt-5 space-y-2">
          {['Übersicht', 'Lernen & Leistungen', 'Entwicklung & Diagnostik', 'Organisation'].map((item, index) => (
            <div key={item} className={`rounded-xl px-3 py-2.5 text-xs font-bold ${index === 0 ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-500'}`}>
              {item}
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-sm font-black text-slate-900">Auf einen Blick</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ['Stärke', 'Lesefreude', 'bg-emerald-50 text-emerald-700'],
              ['Nächster Schritt', 'Rechtschreibung', 'bg-amber-50 text-amber-700'],
              ['Entwicklung', 'positiv', 'bg-indigo-50 text-indigo-700'],
            ].map(([label, value, cls]) => (
              <div key={label as string} className={`rounded-2xl p-4 ${cls as string}`}>
                <div className="text-[0.62rem] font-black uppercase tracking-wider opacity-65">{label as string}</div>
                <div className="mt-2 text-sm font-black">{value as string}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-black text-slate-900">Letzte Beobachtungen</div>
            <div className="mt-4 space-y-3 text-xs font-semibold leading-5 text-slate-500">
              <p>• Liest zunehmend flüssig und betont.</p>
              <p>• Meldet sich im Sachunterricht häufig mit passenden Beiträgen.</p>
              <p>• Rechtschreibstrategien weiter automatisieren.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-black text-slate-900">Diagnostik</div>
            <div className="mt-4 space-y-3">
              {[['Leseflüssigkeit', 82], ['Zahlenspanne', 68], ['Automatisierung', 74]].map(([label, value]) => (
                <div key={label as string}>
                  <div className="mb-1.5 flex justify-between text-[0.67rem] font-bold text-slate-500">
                    <span>{label as string}</span>
                    <span>{value as number}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoLearningPath() {
  const [step, setStep] = React.useState(0);
  const [grade, setGrade] = React.useState('2');
  const steps = ['Lernnachweis', 'Schülerdossier', 'Elternblatt'];
  return (
    <section data-demo-learning-path aria-labelledby="demo-learning-title" className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <h2 id="demo-learning-title" className="text-xl font-bold text-slate-950">Vom Lernnachweis zum Elternblatt</h2>
      <p className="mt-1 text-sm text-slate-600">Sophie Muster · Deutsch · Lesen</p>
      <ol className="my-4 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
        {steps.map((title, index) => <li key={title} aria-current={step === index ? 'step' : undefined}
          className={step === index ? 'text-indigo-700' : 'text-slate-600'}>{title}</li>)}
      </ol>
      {step === 0 && <div className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_8rem_auto]">
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold">Leseflüssigkeit</p>
        <label className="grid gap-1 text-sm font-semibold">
          Note
          <select value={grade} onChange={event => setGrade(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3">
            {['1', '2', '3', '4', '5'].map(value => <option key={value}>{value}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => setStep(1)} className="min-h-11 rounded-lg bg-indigo-700 px-4 text-sm font-bold text-white">Lernnachweis erfassen</button>
      </div>}
      {step === 1 && <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 px-4 py-3">
          <h3 className="font-semibold text-slate-950">Lesen</h3>
          <p className="mt-1 text-sm text-slate-700">Leseflüssigkeit · Note {grade}</p>
        </div>
        <button type="button" onClick={() => setStep(2)} className="min-h-11 rounded-lg bg-indigo-700 px-4 text-sm font-bold text-white">Elternblatt öffnen</button>
      </div>}
      {step === 2 && <div className="space-y-4">
        <article aria-label="Elternblatt für Sophie Muster" className="rounded-lg border border-slate-200 px-4 py-3">
          <h3 className="text-lg font-semibold text-slate-950">Lern- &amp; Entwicklungsübersicht</h3>
          <p className="mt-1 text-sm text-slate-600">Sophie Muster · Beispielklasse 3b</p>
          <p className="mt-3 text-sm font-semibold">Deutsch · Lesen</p>
          <p className="mt-1 text-sm text-slate-700">Leseflüssigkeit · 1 Nachweis · {getNormalizedAssessmentPercent(grade, 'grades', 20)} %</p>
        </article>
        <button type="button" onClick={() => setStep(0)} className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-bold">Beispiel erneut starten</button>
      </div>}
    </section>
  );
}

function Demo({ onLogin, onHome }: Pick<PublicWelcomeProps, 'onLogin' | 'onHome'>) {
  const [tab, setTab] = React.useState<'dashboard' | 'planung' | 'cockpit' | 'dossier'>('dashboard');

  const tabs = [
    ['dashboard', 'Dashboard', LayoutDashboard],
    ['planung', 'Wochenplanung', CalendarDays],
    ['cockpit', 'Lehrer-Cockpit', Presentation],
    ['dossier', 'Schülerdossier', UserRound],
  ] as const;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onHome}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              aria-label="Zur Startseite"
            >
              <ChevronLeft size={20} />
            </button>
            <KlassioMark />
          </div>
          <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.13em] text-emerald-700 sm:flex">
            <Sparkles size={13} />
            Demo · nur Beispieldaten
          </div>
          <button
            type="button"
            onClick={onLogin}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-black text-white transition-colors hover:bg-indigo-600"
          >
            <LogIn size={15} />
            Anmelden
          </button>
        </div>
      </header>

      <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-[0.7rem] font-bold text-emerald-800 sm:hidden">
        Demo-Modus · ausschließlich erfundene Beispieldaten
      </div>

      <main className="mx-auto max-w-[1480px] p-4 sm:p-6">
        <div className="mb-5 rounded-[1.5rem] border border-indigo-100 bg-gradient-to-r from-indigo-50 to-white p-5 sm:flex sm:items-center sm:justify-between">
          <div>
            <div className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-indigo-600">Interaktive Vorschau</div>
            <h1 className="mt-1 text-2xl font-black tracking-[-0.035em] text-slate-950">Beispielklasse 3b</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">Du kannst hier klicken und ausprobieren. Nichts wird gespeichert.</p>
          </div>
          <div className="mt-4 flex items-center gap-2 sm:mt-0">
            <ShieldCheck size={17} className="text-emerald-600" />
            <span className="text-xs font-bold text-slate-500">Kein Zugriff auf echte KLASSIO-Daten</span>
          </div>
        </div>

        <DemoLearningPath />

        <h2 className="mb-2 text-sm font-bold text-slate-700">Weitere Ansichten ausprobieren</h2>
        <div className="mb-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max snap-x snap-mandatory gap-1">
            {tabs.map(([id, label, Icon]) => (
              <button
                type="button"
                key={id}
                onClick={() => setTab(id)}
                aria-pressed={tab === id}
                className={`inline-flex min-h-10 snap-start items-center gap-2 rounded-xl px-3.5 text-xs font-black transition-all ${tab === id ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <section className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-3 shadow-sm sm:p-5">
          {tab === 'dashboard' && <DashboardDemo />}
          {tab === 'planung' && <WeeklyPlanDemo />}
          {tab === 'cockpit' && <CockpitDemo />}
          {tab === 'dossier' && <DossierDemo />}
        </section>

        <div className="mt-5 flex flex-col items-center justify-between gap-4 rounded-[1.6rem] bg-slate-950 p-5 text-white sm:flex-row sm:px-6">
          <div>
            <div className="text-sm font-black">Gefällt dir der Arbeitsablauf?</div>
            <div className="mt-1 text-xs font-medium text-white/55">Im echten KLASSIO stehen deine eigenen Klassen und Daten hinter dem geschützten Login bereit.</div>
          </div>
          <button
            type="button"
            onClick={onLogin}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-xs font-black text-slate-950 transition-colors hover:bg-indigo-50 sm:w-auto"
          >
            Zum KLASSIO-Login
            <ArrowRight size={15} />
          </button>
        </div>
      </main>
      <footer>
        <PublicFreePromise />
      </footer>
    </div>
  );
}

export default function PublicWelcome({ mode, onLogin, onDemo, onHome }: PublicWelcomeProps) {
  if (mode === 'demo') {
    return <Demo onLogin={onLogin} onHome={onHome} />;
  }
  return <Landing onLogin={onLogin} onDemo={onDemo} />;
}
