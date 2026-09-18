import React from 'react';
import { AlertTriangle, CheckCircle2, Cloud, Database, Loader2, Mail, RefreshCw, Users } from 'lucide-react';
import EmailAccountLogin from '../EmailAccountLogin';
import SchoolIdentitySettings from './SchoolIdentitySettings';
import SchoolVerificationAdmin from './SchoolVerificationAdmin';
import { useApp } from '../../context/AppContext';

export default function AccountSettings() {
  const [refreshKey, setRefreshKey] = React.useState(0);
  const {
    accountSyncStatus,
    accountSyncLastAt,
    accountSyncMessage,
    accountSyncConflictResolvable,
    retryAccountSync,
    resolveAccountSyncConflict,
  } = useApp();
  const [retryingSync, setRetryingSync] = React.useState(false);
  const [resolvingSync, setResolvingSync] = React.useState<'local' | 'remote' | null>(null);

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
        ? 'Soll der vollständige Stand dieses Geräts den Konto-Stand ersetzen? Vorher erstellt Klassio auf diesem Gerät eine verschlüsselte Notfallkopie.'
        : 'Soll der vollständige Konto-Stand auf dieses Gerät geladen werden? Lokale Änderungen werden ersetzt; vorher erstellt Klassio eine verschlüsselte Notfallkopie.'
    );
    if (!confirmed) return;

    setResolvingSync(source);
    try {
      await resolveAccountSyncConflict(source);
    } finally {
      setResolvingSync(null);
    }
  };

  const syncMeta = accountSyncStatus === 'synced'
    ? { title: 'Konto-Sync aktuell', detail: accountSyncLastAt ? 'Zuletzt erfolgreich: ' + new Date(accountSyncLastAt).toLocaleString('de-AT') : 'Verschlüsselter Stand ist abgeglichen.', tone: 'emerald' }
    : accountSyncStatus === 'syncing'
      ? { title: 'Konto wird abgeglichen …', detail: 'Lokale Daten bleiben währenddessen vollständig verfügbar.', tone: 'indigo' }
      : accountSyncStatus === 'conflict'
        ? { title: 'Sync-Konflikt – nichts überschrieben', detail: accountSyncMessage || 'Auf mehreren Geräten liegen unterschiedliche Änderungen vor.', tone: 'amber' }
        : accountSyncStatus === 'error'
          ? { title: 'Konto-Sync derzeit nicht möglich', detail: accountSyncMessage || 'Lokale Daten bleiben erhalten. Der Abgleich kann erneut versucht werden.', tone: 'rose' }
          : accountSyncStatus === 'disabled'
            ? { title: 'Konto-Sync nicht aktiv', detail: accountSyncMessage || 'Melde dich mit deiner E-Mail-Adresse an, um den verschlüsselten Konto-Sync zu verwenden.', tone: 'slate' }
            : { title: 'Konto-Sync bereit', detail: 'Nach E-Mail-Anmeldung und Entsperren des Tresors wird automatisch verschlüsselt abgeglichen.', tone: 'slate' };

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
              Die E-Mail-Anmeldung ist dein persönliches Klassio-Konto. Sobald dein Datentresor entsperrt ist, wird dein KLASSIO-Stand automatisch Ende-zu-Ende-verschlüsselt mit diesem Konto synchronisiert. Eine verifizierte Schulmail schaltet zusätzlich schulinterne Funktionen frei.
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
                Beide Stände bleiben unverändert, bis du bewusst entscheidest. Vor der Auflösung legt Klassio eine verschlüsselte Notfallkopie des aktuellen Geräte-Stands an.
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
                  Diesen Geräte-Stand verwenden
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <div className="flex items-start gap-3">
            <Database size={17} className="mt-0.5 shrink-0 text-emerald-700" />
            <p className="text-xs font-semibold leading-relaxed text-emerald-900">
              Bereits eingerichtete Klassen, Planungen, Noten und Tresordaten bleiben auf diesem Gerät erhalten und lokal verschlüsselt. Mit aktivem E-Mail-Konto wird derselbe KLASSIO-Stand zusätzlich Ende-zu-Ende-verschlüsselt auf dem Server gespeichert. Der Server erhält keinen lesbaren Schülerbestand und keinen unverschlüsselten Tresorschlüssel. Datei- oder OneDrive-Backups bleiben als freiwillige Zusatzsicherung möglich.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <SchoolIdentitySettings refreshKey={refreshKey} />
        </div>
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
