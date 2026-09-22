import React, { useState } from 'react';
import {
  BookOpen, CalendarDays, ClipboardCheck, MonitorSmartphone,
  NotebookPen, UsersRound, ArrowRight, ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

type MobileDestination = 'dashboard' | 'schueler' | 'anwesenheit' | 'verhalten' | 'wochenplanung';

interface MobileHomeProps {
  onNavigate: (destination: MobileDestination) => void;
}

const shortcuts: {
  id: MobileDestination;
  title: string;
  detail: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { id: 'dashboard', title: 'Heute', detail: 'Dein Schultag', icon: CalendarDays },
  { id: 'schueler', title: 'Meine Klasse', detail: 'Kinder & Kontakte', icon: UsersRound },
  { id: 'anwesenheit', title: 'Anwesenheit', detail: 'Schnell eintragen', icon: ClipboardCheck },
  { id: 'verhalten', title: 'Notizen', detail: 'Schnell festhalten', icon: NotebookPen },
  { id: 'wochenplanung', title: 'Wochenplanung', detail: 'Plan ansehen', icon: BookOpen },
];

export default function MobileHome({ onNavigate }: MobileHomeProps) {
  const { app, accountSyncStatus } = useApp();
  const [showPairing, setShowPairing] = useState(false);
  const activeClass = app.classes?.find(room => room.id === app.activeClassId);
  const classLabel = activeClass?.name || app.klassenbezeichnung || 'Meine Klasse';
  const studentCount = activeClass?.schueler?.length ?? app.schueler?.length ?? 0;

  return (
    <main className="min-h-dvh overflow-y-auto bg-slate-50 text-slate-900" data-testid="klassio-mobile-home">
      <div className="mx-auto max-w-lg px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
        <header className="mb-7">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-violet-700">KLASSIO Mobile</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Dein Schulalltag.</h1>
          <p className="mt-2 text-sm text-slate-600">
            {classLabel} · {studentCount} {studentCount === 1 ? 'Kind' : 'Kinder'}
          </p>
          <p role="status" aria-live="polite" className={`mt-3 inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${accountSyncStatus === 'synced'
            ? 'bg-emerald-50 text-emerald-800'
            : ['conflict', 'error', 'local-error'].includes(accountSyncStatus)
              ? 'bg-amber-50 text-amber-800'
              : 'bg-violet-50 text-violet-800'}`}>
            {accountSyncStatus === 'synced'
              ? '✓ Geräte synchronisiert'
              : ['conflict', 'error', 'local-error'].includes(accountSyncStatus)
                ? '⚠ Speichern / Abgleich prüfen'
                : 'Speichern / Abgleich läuft'}
          </p>
        </header>

        <section aria-label="Schnellzugriff" className="grid grid-cols-2 gap-3">
          {shortcuts.map(({ id, title, detail, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className="flex min-h-32 flex-col items-start justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                <Icon size={21} />
              </span>
              <span className="mt-3">
                <span className="block text-base font-extrabold leading-tight">{title}</span>
                <span className="mt-1 block text-xs text-slate-500">{detail}</span>
              </span>
            </button>
          ))}
        </section>

        <section aria-label="Lehrercockpit-Fernbedienung" className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-950 p-4 text-white shadow-lg">
          <div className="flex gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-indigo-100">
              <MonitorSmartphone size={25} />
            </span>
            <div>
              <h2 className="text-lg font-extrabold">Lehrercockpit Remote</h2>
              <p className="mt-1 text-sm leading-relaxed text-indigo-100/80">
                Steuere das geöffnete Lehrercockpit am PC oder Smartboard direkt vom Handy.
              </p>
            </div>
          </div>
          <>
              <button
                type="button"
                onClick={() => setShowPairing(open => !open)}
                aria-expanded={showPairing}
                aria-controls="klassio-mobile-remote-pairing"
                className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-extrabold text-indigo-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Fernbedienung verbinden <ArrowRight size={18} />
              </button>
              {showPairing && (
                <div id="klassio-mobile-remote-pairing" className="mt-4 rounded-xl border border-white/15 bg-white/10 p-3 text-sm leading-relaxed">
                  <p className="font-extrabold">So verbindest du dein Handy:</p>
                  <p className="mt-2">1. Öffne am PC das Lehrercockpit und starte dort die Live-Verbindung.</p>
                  <p className="mt-1">2. Zeige den Kopplungs-QR-Code an und scanne ihn mit der Handykamera.</p>
                  <p className="mt-1">3. Öffne den KLASSIO-Link. Nach der sicheren Kopplung startet die Fernbedienung automatisch.</p>
                  <p className="mt-3 flex items-start gap-2 text-xs text-indigo-100/80">
                    <ShieldCheck size={16} className="mt-0.5 shrink-0" />
                    Die Fernbedienung braucht den Sitzungsschlüssel aus dem QR-Code. Die E-Mail-Anmeldung allein ersetzt die Kopplung nicht.
                  </p>
                </div>
              )}
          </>
        </section>
        <p className="mt-5 text-center text-xs text-slate-500">
          Die mobile Ansicht und der PC verwenden denselben verschlüsselten KLASSIO-Datenbestand.
        </p>
      </div>
    </main>
  );
}
