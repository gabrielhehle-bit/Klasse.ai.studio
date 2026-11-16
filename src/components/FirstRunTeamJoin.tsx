import React from 'react';
import { useApp } from '../context/AppContext';
import { hasCompletedInitialSetup } from '../lib/firstRunFlow';
import { adoptAcknowledgedTeamRoom } from '../lib/teamTeachingProjection';
import {
  ensureRegisteredTeamTeachingDevice,
  listSharedClasses,
  pullSharedClass,
  requestTeamTeachingDeviceAccess,
  type SharedClassSummary,
} from '../lib/teamTeachingService';
import { ACCOUNT_SESSION_CHANGED_EVENT } from '../lib/accountSyncService';

/**
 * A teacher joining an existing class must not have to invent a second
 * classroom in the first-run wizard. Read invitations from their own verified
 * school account and adopt only a decrypted, authorized shared-class snapshot.
 */
export default function FirstRunTeamJoin({ onJoined }: { onJoined: () => void }) {
  const { app, setApp } = useApp();
  const latestApp = React.useRef(app);
  latestApp.current = app;
  const [classes, setClasses] = React.useState<SharedClassSummary[]>([]);
  const [checking, setChecking] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState('');
  const [loginRequired, setLoginRequired] = React.useState(false);
  const [requestedFor, setRequestedFor] = React.useState<string | null>(null);
  const latestCheckRef = React.useRef(0);

  // Invitations can arrive after this teacher opened the first-run screen.
  // Refresh quietly, keeping the verification code and visible join button
  // intact. An older network response must not replace a more recent one.
  const check = React.useCallback(async (silent = false) => {
    const checkId = ++latestCheckRef.current;
    if (!silent) {
      setChecking(true);
      setMessage('');
    }
    try {
      // Register the device with the teacher's own verified school identity;
      // discovering an invitation never creates or overwrites a classroom.
      await ensureRegisteredTeamTeachingDevice();
      const found = await listSharedClasses();
      if (checkId !== latestCheckRef.current) return;
      setClasses(found);
      setLoginRequired(false);
    } catch (error: any) {
      if (checkId !== latestCheckRef.current) return;
      const loginNeeded = error?.status === 401 || error?.status === 403;
      setLoginRequired(loginNeeded);
      // A signed-out account must not see another session's class names.
      // Transient network failures do not erase previously verified invites.
      if (loginNeeded) setClasses([]);
      else if (!silent) setMessage(error instanceof Error ? error.message : 'Teamklassen sind gerade nicht erreichbar.');
    } finally {
      if (checkId === latestCheckRef.current) setChecking(false);
    }
  }, []);

  React.useEffect(() => {
    void check();
    const refreshSession = () => { void check(); };
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') void check(true);
    };
    const interval = window.setInterval(refreshIfVisible, 10_000);
    window.addEventListener(ACCOUNT_SESSION_CHANGED_EVENT, refreshSession);
    window.addEventListener('focus', refreshIfVisible);
    window.addEventListener('online', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener(ACCOUNT_SESSION_CHANGED_EVENT, refreshSession);
      window.removeEventListener('focus', refreshIfVisible);
      window.removeEventListener('online', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [check]);

  const open = async (summary: SharedClassSummary) => {
    if (busy) return;
    setBusy(summary.id);
    setMessage('');
    try {
      const { room } = await pullSharedClass(summary.id);
      if (hasCompletedInitialSetup(latestApp.current)) {
        throw new Error('Es wurde bereits eine Klasse eingerichtet. Öffne die geteilte Klasse jetzt im Klassenteam.');
      }
      // Never replace another classroom created while this request was in flight.
      setApp(prev => hasCompletedInitialSetup(prev) ? prev : adoptAcknowledgedTeamRoom(prev, room));
      onJoined();
    } catch (error) {
      const details = error instanceof Error ? error.message : 'Die Teamklasse konnte nicht geöffnet werden.';
      if (details.includes('noch nicht freigegeben')) {
        try {
          if (requestedFor !== summary.id) {
            const request = await requestTeamTeachingDeviceAccess(summary.id);
            setRequestedFor(summary.id);
            setMessage('Freigabe angefordert. Eine berechtigte Lehrperson muss in ihrem Klassenteam den Prüfcode '
              + request.verificationCode + ' bestätigen. Danach hier auf „Klasse öffnen“ klicken.');
          } else {
            setMessage('Deine Freigabe ist noch nicht bestätigt. Bitte die Teamlehrperson um Bestätigung bitten und erneut „Klasse öffnen“ wählen.');
          }
        } catch (cause) {
          setMessage(cause instanceof Error ? cause.message : 'Die Gerätefreigabe konnte nicht angefordert werden.');
        }
      } else {
        setMessage(details);
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="mx-6 rounded-2xl border-2 border-indigo-200 bg-white p-4 text-left shadow-sm sm:mx-auto sm:max-w-xl sm:p-5"
      data-testid="first-run-team-join" aria-label="Bestehender Klasse beitreten">
      <h2 className="text-base font-black text-slate-900">Du arbeitest in einer bestehenden Klasse mit?</h2>
      <p className="mt-1 text-sm text-slate-600">
        Dann brauchst du keine eigene Klasse anzulegen. Lass dich mit deinem Schulkonto
        von der verantwortlichen Lehrperson zum Klassenteam hinzufügen.
      </p>
      {loginRequired && (
        <p role="status" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          Melde dich zuerst mit deiner verifizierten Schul-E-Mail-Adresse an.
          Der Zugangscode allein reicht für Teamteaching nicht aus.
        </p>
      )}
      {checking ? <p className="mt-3 text-sm text-slate-600">Einladungen werden geprüft …</p> : (
        <div className="mt-3 space-y-2" aria-live="polite" data-testid="first-run-live-invitations">
          {classes.length === 0 && !loginRequired && (
            <p className="text-sm text-slate-700">
              Noch keine geteilte Klasse gefunden. Bitte eine Kollegin oder einen Kollegen,
              dich in KLASSIO unter „Klassenteam“ hinzuzufügen. Diese Seite sucht automatisch nach neuen Einladungen.
            </p>
          )}
          {classes.map(summary => (
            <div key={summary.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
              <div>
                <p className="font-black text-slate-900">{summary.classLabel}</p>
                <p className="text-xs text-slate-600">Gemeinsame Klasse · {summary.myRole === 'viewer' ? 'Nur ansehen' : 'Bearbeiten erlaubt'}</p>
              </div>
              <button type="button" onClick={() => void open(summary)} disabled={Boolean(busy)}
                className="min-h-11 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                data-testid="first-run-join-class">
                {busy === summary.id ? 'Wird geöffnet …' : 'Klasse öffnen'}
              </button>
            </div>
          ))}
        </div>
      )}
      {message && <p role="status" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">{message}</p>}
      <button type="button" onClick={() => void check()} disabled={checking || Boolean(busy)}
        className="mt-3 min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50">
        Einladungen aktualisieren
      </button>
    </section>
  );
}
