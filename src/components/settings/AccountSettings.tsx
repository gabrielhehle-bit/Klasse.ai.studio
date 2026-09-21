import React from 'react';
import { AlertTriangle, CheckCircle2, Cloud, Copy, Database, Eye, EyeOff, KeyRound, Loader2, Mail, RefreshCw, Users } from 'lucide-react';
import EmailAccountLogin from '../EmailAccountLogin';
import SchoolIdentitySettings from './SchoolIdentitySettings';
import SchoolVerificationAdmin from './SchoolVerificationAdmin';
import { useApp } from '../../context/AppContext';
import { activatePreparedRecoveryEmail, prepareRecoveryEmail, type PreparedRecoveryEmail } from '../../lib/emailRecoveryService';

export default function AccountSettings() {
  const [refreshKey, setRefreshKey] = React.useState(0);
  const {
    app,
    isVaultUnlocked,
    accountSyncStatus,
    accountSyncLastAt,
    accountSyncMessage,
    accountSyncConflictResolvable,
    retryAccountSync,
    resolveAccountSyncConflict,
  } = useApp();
  const [retryingSync, setRetryingSync] = React.useState(false);
  const [resolvingSync, setResolvingSync] = React.useState<'local' | 'remote' | null>(null);
  const [recoveryPassword, setRecoveryPassword] = React.useState('');
  const [showRecoveryPassword, setShowRecoveryPassword] = React.useState(false);
  const [preparingRecovery, setPreparingRecovery] = React.useState(false);
  const [activatingRecovery, setActivatingRecovery] = React.useState(false);
  const [preparedRecovery, setPreparedRecovery] = React.useState<PreparedRecoveryEmail | null>(null);
  const [recoverySaved, setRecoverySaved] = React.useState(false);
  const [recoveryError, setRecoveryError] = React.useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = React.useState<string | null>(null);

  const retrySync = async () => {
    if (retryingSync) return;
    setRetryingSync(true);
    try {
      await retryAccountSync();
    } finally {
      setRetryingSync(false);
    }
  };

  const resolveSync = async (source: 'local' | 'remote') => {
    if (resolvingSync) return;
    const confirmed = window.confirm(
      source === 'local'
        ? 'Soll der Stand dieses Geräts übernommen werden? Klassio erstellt vorher automatisch eine Sicherheitskopie.'
        : 'Soll der zuletzt gespeicherte Konto-Stand auf dieses Gerät geladen werden? Änderungen nur auf diesem Gerät werden ersetzt; Klassio erstellt vorher automatisch eine Sicherheitskopie.'
    );
    if (!confirmed) return;

    setResolvingSync(source);
    try {
      await resolveAccountSyncConflict(source);
    } finally {
      setResolvingSync(null);
    }
  };

  const prepareEmailRecovery = async () => {
    if (preparingRecovery || !recoveryPassword) return;
    setPreparingRecovery(true);
    setRecoveryError(null);
    setRecoverySuccess(null);
    setPreparedRecovery(null);
    setRecoverySaved(false);
    try {
      const prepared = await prepareRecoveryEmail(recoveryPassword);
      setPreparedRecovery(prepared);
      setRecoveryPassword('');
    } catch (cause) {
      setRecoveryError(cause instanceof Error ? cause.message : 'E-Mail-Recovery konnte nicht vorbereitet werden.');
    } finally {
      setPreparingRecovery(false);
    }
  };

  const activateEmailRecovery = async () => {
    if (!preparedRecovery || !recoverySaved || activatingRecovery) return;
    setActivatingRecovery(true);
    setRecoveryError(null);
    setRecoverySuccess(null);
    try {
      await activatePreparedRecoveryEmail(app, preparedRecovery);
      setRecoverySuccess('Der neue Wiederherstellungscode ist jetzt aktiv und mit deinem verschlüsselten Konto-Stand verknüpft.');
      setPreparedRecovery(null);
      setRecoverySaved(false);
      await retryAccountSync();
    } catch (cause) {
      setRecoveryError(cause instanceof Error ? cause.message : 'Der neue Wiederherstellungscode konnte nicht aktiviert werden.');
    } finally {
      setActivatingRecovery(false);
    }
  };

  const copyPreparedRecoveryCode = async () => {
    if (!preparedRecovery) return;
    try {
      await navigator.clipboard.writeText(preparedRecovery.recoveryCode);
    } catch {
      setRecoveryError('Kopieren ist fehlgeschlagen. Der Code bleibt unten sichtbar.');
    }
  };

  const syncMeta = accountSyncStatus === 'synced'
    ? { title: 'Auf allen Geräten verfügbar', detail: accountSyncLastAt ? 'Letzte Änderung vom Server bestätigt: ' + new Date(accountSyncLastAt).toLocaleString('de-AT') : 'Der neueste Stand wurde vom Server bestätigt.', tone: 'emerald' }
    : accountSyncStatus === 'saving-local'
      ? { title: 'Änderungen werden gespeichert …', detail: 'Bitte KLASSIO geöffnet lassen: Die neueste Eingabe wird gerade verschlüsselt auf diesem Gerät gesichert.', tone: 'amber' }
      : accountSyncStatus === 'saved-local'
        ? { title: 'Auf diesem Gerät gespeichert', detail: 'Auf den anderen Geräten noch nicht bestätigt. Internetverbindung prüfen und KLASSIO geöffnet lassen.', tone: 'amber' }
        : accountSyncStatus === 'syncing'
          ? { title: 'Übertragung auf andere Geräte läuft …', detail: 'Noch nicht auf allen Geräten verfügbar. Bitte auf die grüne Bestätigung warten.', tone: 'indigo' }
          : accountSyncStatus === 'conflict'
        ? { title: 'Änderungen auf zwei Geräten', detail: accountSyncMessage || 'Auf zwei Geräten wurden unterschiedliche Änderungen gefunden. Wähle, welchen Stand du weiterverwenden möchtest.', tone: 'amber' }
        : accountSyncStatus === 'error'
          ? { title: 'Datenabgleich gerade nicht möglich', detail: accountSyncMessage || 'Deine Daten auf diesem Gerät bleiben erhalten. Versuche es später erneut.', tone: 'rose' }
          : accountSyncStatus === 'disabled'
            ? { title: 'Geräte-Sync nicht aktiv', detail: accountSyncMessage || 'Melde dich mit deiner E-Mail-Adresse an, um deine Daten auch auf weiteren Geräten verwenden zu können.', tone: 'slate' }
            : { title: 'Geräte-Sync bereit', detail: 'Nach der Anmeldung hält Klassio deine Geräte automatisch auf demselben Stand.', tone: 'slate' };

  const syncToneClasses = syncMeta.tone === 'emerald'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
    : syncMeta.tone === 'indigo'
      ? 'border-indigo-200 bg-indigo-50 text-indigo-900'
      : syncMeta.tone === 'amber'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : syncMeta.tone === 'rose'
          ? 'border-rose-200 bg-rose-50 text-rose-900'
          : 'border-slate-200 bg-slate-50 text-slate-800';

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-5 flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
            <Mail size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-950">Konto & Schulmail</h2>
            <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600">
              Deine E-Mail-Adresse ist dein persönliches KLASSIO-Konto. Die Anmeldung läuft ohne separates Kontopasswort über einen 6-stelligen E-Mail-Code. Danach hält KLASSIO deinen verschlüsselten Datenstand automatisch auf deinen Geräten aktuell. Eine verifizierte Schulmail schaltet zusätzlich schulinterne Funktionen frei.
            </p>
          </div>
        </div>
        <EmailAccountLogin onSuccess={() => setRefreshKey(value => value + 1)} />

        <div className={`mt-5 rounded-2xl border p-4 ${syncToneClasses}`} data-testid="account-sync-status">
          <div className="flex items-start gap-3">
            {accountSyncStatus === 'synced' ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> :
              accountSyncStatus === 'syncing' ? <Loader2 size={18} className="mt-0.5 shrink-0 animate-spin" /> :
              accountSyncStatus === 'error' || accountSyncStatus === 'conflict' ? <AlertTriangle size={18} className="mt-0.5 shrink-0" /> :
              <Cloud size={18} className="mt-0.5 shrink-0" />}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black">{syncMeta.title}</div>
              <p className="mt-1 text-xs font-semibold leading-relaxed opacity-85">{syncMeta.detail}</p>
            </div>
            {(accountSyncStatus === 'error' || (accountSyncStatus === 'conflict' && !accountSyncConflictResolvable)) && (
              <button
                type="button"
                onClick={() => void retrySync()}
                disabled={retryingSync}
                className="shrink-0 rounded-xl border border-current/20 bg-white/70 px-3 py-2 text-xs font-black disabled:opacity-50"
              >
                <RefreshCw size={13} className={`mr-1.5 inline ${retryingSync ? 'animate-spin' : ''}`} />
                Erneut versuchen
              </button>
            )}
          </div>

          {accountSyncStatus === 'conflict' && accountSyncConflictResolvable && (
            <div
              className="mt-4 rounded-xl border border-amber-300/70 bg-white/70 p-3"
              data-testid="account-sync-conflict-actions"
            >
              <p className="text-xs font-bold leading-relaxed">
                Nichts wird automatisch überschrieben. Wähle bewusst den Stand, den du weiterverwenden möchtest. Vorher erstellt Klassio eine Sicherheitskopie.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void resolveSync('remote')}
                  disabled={Boolean(resolvingSync)}
                  className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-black text-amber-950 disabled:opacity-50"
                >
                  {resolvingSync === 'remote' ? <Loader2 size={13} className="mr-1.5 inline animate-spin" /> : <Cloud size={13} className="mr-1.5 inline" />}
                  Konto-Stand laden
                </button>
                <button
                  type="button"
                  onClick={() => void resolveSync('local')}
                  disabled={Boolean(resolvingSync)}
                  className="rounded-xl bg-amber-900 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                >
                  {resolvingSync === 'local' ? <Loader2 size={13} className="mr-1.5 inline animate-spin" /> : <Database size={13} className="mr-1.5 inline" />}
                  Stand dieses Geräts verwenden
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <div className="flex items-start gap-3">
            <Database size={17} className="mt-0.5 shrink-0 text-emerald-700" />
            <p className="text-xs font-semibold leading-relaxed text-emerald-900">
              Auf einem neuen PC genügt dieselbe E-Mail-Adresse, der Anmeldecode und einmal dein bestehendes Tresor-Passwort. KLASSIO lädt dann automatisch deinen verschlüsselten Kontostand. Datei- oder OneDrive-Backups sind nur eine freiwillige zusätzliche Sicherung und für einen Gerätewechsel nicht erforderlich.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <SchoolIdentitySettings refreshKey={refreshKey} />
        </div>
      </section>

      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-8" data-testid="email-recovery-settings">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
            <KeyRound size={19} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black text-slate-900">Wiederherstellung per E-Mail sichern</h3>
            <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
              Du kannst einen neuen Wiederherstellungscode erzeugen und mit deinem eigenen Mailprogramm an deine angemeldete Adresse senden. Der Code selbst wird dabei nicht an den Klassio-Server übertragen oder dort gespeichert.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-relaxed text-amber-900">
          Wichtig: Der bisherige Wiederherstellungscode bleibt gültig, bis du den neuen Code unten ausdrücklich aktivierst. Danach wird der alte Code ungültig. Jede Person mit Zugriff auf die E-Mail mit dem neuen Code kann deinen Datentresor wiederherstellen.
        </div>

        {!isVaultUnlocked ? (
          <p className="mt-4 text-xs font-bold text-slate-500">Entsperre zuerst deinen Datentresor.</p>
        ) : accountSyncStatus !== 'synced' ? (
          <p className="mt-4 text-xs font-bold text-slate-500">
            Warte zuerst, bis oben „Auf allen Geräten verfügbar“ angezeigt wird. So wird der neue Recovery-Code sicher auf allen Geräten übernommen.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="relative">
              <input
                type={showRecoveryPassword ? 'text' : 'password'}
                value={recoveryPassword}
                onChange={event => setRecoveryPassword(event.target.value)}
                placeholder="Aktuelles Tresor-Passwort"
                autoComplete="current-password"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 pr-11 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowRecoveryPassword(value => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label={showRecoveryPassword ? 'Passwort ausblenden' : 'Passwort anzeigen'}
              >
                {showRecoveryPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => void prepareEmailRecovery()}
              disabled={!recoveryPassword || preparingRecovery}
              className="w-full rounded-xl bg-amber-600 px-4 py-3 text-xs font-black text-white disabled:opacity-50"
            >
              {preparingRecovery ? <Loader2 size={14} className="mr-2 inline animate-spin" /> : <KeyRound size={14} className="mr-2 inline" />}
              Neuen Recovery-Code erzeugen
            </button>
          </div>
        )}

        {recoveryError && (
          <p className="mt-3 text-xs font-bold leading-relaxed text-rose-600">{recoveryError}</p>
        )}

        {recoverySuccess && (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold leading-relaxed text-emerald-800">
            {recoverySuccess}
          </p>
        )}

        {preparedRecovery && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4" data-testid="prepared-email-recovery">
            <div className="text-xs font-black uppercase tracking-wider text-emerald-700">Neuen Code zuerst sichern</div>
            <div className="mt-2 break-all rounded-xl border border-emerald-200 bg-white px-3 py-3 font-mono text-sm font-black text-emerald-950">
              {preparedRecovery.recoveryCode}
            </div>
            <p className="mt-2 text-xs font-semibold leading-relaxed text-emerald-900">
              Dieser neue Code ist <strong>noch nicht aktiv</strong>. Sende ihn zuerst an <strong>{preparedRecovery.email}</strong> oder kopiere ihn an einen anderen sicheren Ort. Dein bisheriger Recovery-Code funktioniert bis zur Aktivierung weiter.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <a
                href={preparedRecovery.mailto}
                className="flex-1 rounded-xl bg-emerald-700 px-4 py-2.5 text-center text-xs font-black text-white"
              >
                <Mail size={14} className="mr-1.5 inline" />
                E-Mail an mich vorbereiten
              </a>
              <button
                type="button"
                onClick={() => void copyPreparedRecoveryCode()}
                className="flex-1 rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-xs font-black text-emerald-800"
              >
                <Copy size={14} className="mr-1.5 inline" />
                Code kopieren
              </button>
            </div>

            <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl border border-emerald-200 bg-white px-3 py-3 text-xs font-semibold text-emerald-950">
              <input
                type="checkbox"
                checked={recoverySaved}
                onChange={event => setRecoverySaved(event.target.checked)}
                className="mt-0.5"
              />
              <span>Ich habe den neuen Wiederherstellungscode sicher gespeichert.</span>
            </label>

            <button
              type="button"
              onClick={() => void activateEmailRecovery()}
              disabled={!recoverySaved || activatingRecovery}
              className="mt-3 w-full rounded-xl bg-amber-600 px-4 py-3 text-xs font-black text-white disabled:opacity-50"
            >
              {activatingRecovery ? <Loader2 size={14} className="mr-2 inline animate-spin" /> : <KeyRound size={14} className="mr-2 inline" />}
              Gesicherten Code jetzt aktivieren
            </button>
            <p className="mt-2 text-[11px] font-semibold leading-relaxed text-amber-800">
              Erst mit diesem Schritt wird der bisherige Recovery-Code ungültig.
            </p>
          </div>
        )}

      </section>

      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-3">
          <Users size={18} className="mt-0.5 shrink-0 text-emerald-700" />
          <div>
            <h3 className="text-sm font-black text-slate-900">Teamteaching</h3>
            <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
              Nach der Anmeldung mit einer verifizierten Schulmail findest du das Klassenteam direkt unter „Klasse“. Dort kannst du eine Klasse gezielt mit Kolleg:innen derselben Schule teilen.
            </p>
          </div>
        </div>
      </section>

      <SchoolVerificationAdmin refreshKey={refreshKey} />
    </div>
  );
}
