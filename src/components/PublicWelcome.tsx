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
  ListChecks,
  LogIn,
  Presentation,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  Users,
} from 'lucide-react';

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
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/10">
        <GraduationCap size={21} strokeWidth={2.2} />
      </div>
      <div className="leading-none">
        <div className="text-[1.05rem] font-black tracking-[-0.04em] text-slate-950">KLASSIO</div>
        <div className="mt-1 text-[0.62rem] font-bold uppercase tracking-[0.2em] text-slate-400">Lehreralltag, klarer.</div>
      </div>
    </div>
  );
}

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[720px]">
      <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-indigo-200/35 blur-3xl" />
      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_30px_80px_-28px_rgba(15,23,42,0.32)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
            <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
            <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
          </div>
          <div className="rounded-full bg-emerald-50 px-3 py-1 text-[0.63rem] font-black uppercase tracking-[0.14em] text-emerald-700">
            Beispielklasse 3b
          </div>
        </div>
        <div className="grid min-h-[390px] grid-cols-[78px_1fr] bg-slate-50 sm:grid-cols-[164px_1fr]">
          <aside className="border-r border-slate-100 bg-slate-950 p-3 text-white sm:p-4">
            <div className="mb-5 flex h-9 items-center justify-center rounded-xl bg-white/10 text-xs font-black">K</div>
            <div className="space-y-2">
              {[
                ['Heute', LayoutDashboard],
                ['Klasse', Users],
                ['Planung', CalendarDays],
                ['Cockpit', Presentation],
              ].map(([label, Icon], index) => (
                <div
                  key={label as string}
                  className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-[0.68rem] font-bold ${index === 0 ? 'bg-white text-slate-950' : 'text-white/55'}`}
                >
                  <Icon size={14} />
                  <span className="hidden sm:inline">{label as string}</span>
                </div>
              ))}
            </div>
          </aside>
          <main className="min-w-0 p-4 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <div className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-indigo-600">Guten Morgen</div>
                <div className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">Dein Schultag auf einen Blick.</div>
              </div>
              <div className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-right sm:block">
                <div className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-400">Heute</div>
                <div className="text-xs font-black text-slate-700">Freitag</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {[
                ['19', 'Kinder', Users],
                ['4', 'Einheiten', BookOpen],
                ['3', 'Aufgaben', ListChecks],
              ].map(([value, label, Icon]) => (
                <div key={label as string} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                  <Icon size={16} className="mb-3 text-indigo-500" />
                  <div className="text-xl font-black text-slate-950">{value as string}</div>
                  <div className="text-[0.68rem] font-bold text-slate-400">{label as string}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-black text-slate-800">Nächste Einheit</div>
                <div className="rounded-lg bg-indigo-50 px-2 py-1 text-[0.6rem] font-black text-indigo-600">08:55</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <BookOpen size={18} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-slate-900">Deutsch · Lesen</div>
                  <div className="truncate text-xs font-semibold text-slate-400">Leseflüssigkeit · Partnerlesen</div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
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
    <div className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm transition-transform duration-200 hover:-translate-y-1">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
        <Icon size={21} />
      </div>
      <h3 className="text-lg font-black tracking-tight text-slate-950">{title}</h3>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{text}</p>
    </div>
  );
}

function Landing({ onLogin, onDemo }: Pick<PublicWelcomeProps, 'onLogin' | 'onDemo'>) {
  return (
    <div className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f7f8fb]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-4 sm:px-7 lg:px-8">
          <KlassioMark />
          <div className="flex items-center gap-2">
            <a
              href="#klassio-entdecken"
              className="hidden rounded-xl px-3.5 py-2 text-sm font-bold text-slate-500 transition-colors hover:bg-white hover:text-slate-900 sm:inline-flex"
            >
              Was ist KLASSIO?
            </a>
            <button
              type="button"
              onClick={onLogin}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
            >
              <LogIn size={16} />
              Anmelden
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="overflow-hidden">
          <div className="mx-auto grid max-w-[1240px] items-center gap-12 px-5 py-16 sm:px-7 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-24">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.16em] text-indigo-700">
                <Sparkles size={13} />
                Für den echten Schulalltag
              </div>
              <h1 className="max-w-[720px] text-[2.7rem] font-black leading-[0.96] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-[4.6rem]">
                Deine Klasse.<br />
                Dein Unterricht.<br />
                <span className="text-indigo-600">Alles an einem Ort.</span>
              </h1>
              <p className="mt-7 max-w-xl text-base font-medium leading-7 text-slate-550 sm:text-lg">
                Wochenplanung, Schülerverwaltung, Diagnostik, Leistungen und eine digitale Unterrichtsfläche – ohne dass dein Lehreralltag in fünf verschiedenen Werkzeugen auseinanderfällt.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={onDemo}
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 text-sm font-black text-white shadow-xl shadow-slate-950/15 transition-all hover:-translate-y-0.5 hover:bg-indigo-600"
                >
                  KLASSIO ausprobieren
                  <ArrowRight size={17} />
                </button>
                <button
                  type="button"
                  onClick={onLogin}
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 text-sm font-black text-slate-800 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
                >
                  Ich habe schon einen Zugang
                </button>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-slate-400">
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> Demo ohne Anmeldung</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> Nur erfundene Beispieldaten</span>
              </div>
            </div>
            <HeroPreview />
          </div>
        </section>

        <section id="klassio-entdecken" className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-[1240px] px-5 py-18 sm:px-7 sm:py-20 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-indigo-600">Ein Arbeitsbereich statt Tool-Chaos</div>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl">KLASSIO begleitet den ganzen Schultag.</h2>
              <p className="mt-4 text-sm font-medium leading-6 text-slate-500 sm:text-base">
                Nicht als starres Verwaltungssystem, sondern als Oberfläche, die sich an deine Klasse und deine Arbeitsweise anpasst.
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <FeatureCard
                icon={CalendarDays}
                title="Planen"
                text="Wochenplanung, Hausübungen, Jahresplanung und Termine dort, wo du sie im Alltag brauchst."
              />
              <FeatureCard
                icon={Presentation}
                title="Unterrichten"
                text="Eine freie digitale Tafel mit Widgets, Schülerliste und Werkzeugen für den laufenden Unterricht."
              />
              <FeatureCard
                icon={UserRound}
                title="Entwicklung sehen"
                text="Schülerdossier, Beobachtungen, Diagnostik und Leistungen zusammenführen, statt Informationen zu suchen."
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1240px] px-5 py-18 sm:px-7 sm:py-20 lg:px-8">
          <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[2rem] bg-slate-950 p-7 text-white sm:p-9">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-emerald-300">
                <ShieldCheck size={23} />
              </div>
              <h2 className="mt-7 text-3xl font-black tracking-[-0.04em]">Schülerdaten sind keine gewöhnlichen App-Daten.</h2>
              <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-white/60 sm:text-base">
                Deshalb trennt KLASSIO die öffentliche Vorschau strikt vom geschützten Arbeitsbereich. In der Demo werden ausschließlich erfundene Daten gezeigt. Der echte Bereich bleibt hinter Anmeldung und verschlüsseltem Datentresor.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {[
                  'Demo ohne Zugriff auf echte Klassendaten',
                  'Verschlüsselte Speicherung im Arbeitsbereich',
                  'Keine Anmeldung nötig, um KLASSIO kennenzulernen',
                  'Direkter Login für bestehende Nutzer:innen',
                ].map(item => (
                  <div key={item} className="flex items-start gap-2.5 rounded-2xl bg-white/5 px-4 py-3 text-sm font-bold text-white/75">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col justify-between rounded-[2rem] border border-slate-200 bg-white p-7 sm:p-9">
              <div>
                <div className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-indigo-600">Am besten selbst ansehen</div>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950">Nach 30 Sekunden weißt du, ob KLASSIO zu dir passt.</h2>
                <p className="mt-4 text-sm font-medium leading-6 text-slate-500">
                  Öffne die Beispielklasse, wechsle zwischen Dashboard, Wochenplanung, Cockpit und Schülerdossier und probiere die Oberfläche direkt aus.
                </p>
              </div>
              <button
                type="button"
                onClick={onDemo}
                className="mt-8 inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 text-sm font-black text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-700"
              >
                Interaktive Vorschau öffnen
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:px-8">
          <KlassioMark />
          <button type="button" onClick={onLogin} className="text-left text-sm font-black text-slate-600 hover:text-indigo-600 sm:text-right">
            Bereits bei KLASSIO? Anmelden →
          </button>
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
          ['19', 'Kinder heute', Users, '1 fehlt'],
          ['4', 'Unterrichtseinheiten', BookOpen, 'bis 11:35'],
          ['3', 'Offene Aufgaben', ClipboardCheck, '1 wichtig'],
        ].map(([value, label, Icon, note]) => (
          <div key={label as string} className="rounded-2xl border border-slate-200 bg-white p-4">
            <Icon size={17} className="text-indigo-500" />
            <div className="mt-4 text-2xl font-black text-slate-950">{value as string}</div>
            <div className="text-xs font-black text-slate-700">{label as string}</div>
            <div className="mt-1 text-[0.68rem] font-semibold text-slate-400">{note as string}</div>
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

        <div className="absolute right-5 top-5 w-[190px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[0.68rem] font-black text-slate-500">
            <Star size={14} className="text-amber-500" />
            Wochensterne
          </div>
          <div className="mt-3 space-y-2">
            {[
              ['Sophie', 18],
              ['Mia', 16],
              ['Lukas', 14],
            ].map(([name, value], index) => (
              <div key={name as string} className="flex items-center gap-2">
                <div className="w-4 text-[0.65rem] font-black text-slate-400">{index + 1}</div>
                <div className="flex-1 text-[0.68rem] font-bold text-slate-700">{name as string}</div>
                <div className="text-[0.68rem] font-black text-amber-600">{value as number}★</div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
          {[Clock3, Users, Star, ListChecks].map((Icon, index) => (
            <button
              type="button"
              key={index}
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${index === 0 ? 'bg-slate-950 text-white' : 'text-slate-400 hover:bg-slate-100'}`}
              aria-label="Demo-Widget"
            >
              <Icon size={17} />
            </button>
          ))}
          <div className="mx-1 h-7 w-px bg-slate-200" />
          <button type="button" className="rounded-xl bg-indigo-50 px-3 py-2 text-[0.65rem] font-black text-indigo-700">+ Widgets</button>
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
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
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

        <div className="mb-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="flex min-w-max gap-1">
            {tabs.map(([id, label, Icon]) => (
              <button
                type="button"
                key={id}
                onClick={() => setTab(id)}
                className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-black transition-all ${tab === id ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
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
    </div>
  );
}

export default function PublicWelcome({ mode, onLogin, onDemo, onHome }: PublicWelcomeProps) {
  if (mode === 'demo') {
    return <Demo onLogin={onLogin} onHome={onHome} />;
  }
  return <Landing onLogin={onLogin} onDemo={onDemo} />;
}
