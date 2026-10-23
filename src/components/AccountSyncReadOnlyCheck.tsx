import React from 'react';
import { useApp } from '../context/AppContext';
import {
  appStateFingerprint,
  decryptAccountSyncSnapshot,
  fetchAccountSyncSnapshot,
  loadAccountSyncMetadata,
} from '../lib/accountSyncService';
import { getActiveVaultKey, loadVaultRecord } from '../lib/vaultStorage';

type ServerComparison = {
  email: string;
  revision: number;
  updatedAt: string;
  localRevision: number | null;
  localUpdatedAt: string | null;
  result: 'same' | 'different' | 'wrong-vault' | 'local-changed';
};

const formatTimestamp = (stamp: string | null) => {
  if (!stamp) return 'keine Bestätigung auf diesem Gerät';
  const date = new Date(stamp);
  return Number.isFinite(date.getTime()) ? date.toLocaleString('de-AT') : 'Zeitangabe ungültig';
};

/**
 * Read-only, authenticated inspection. Do not perform PUTs or call setApp here.
 * A matching e-mail login alone is never proof that school and home hold the
 * same encrypted classroom data.
 */
export default function AccountSyncReadOnlyCheck() {
  const { app, isVaultUnlocked, accountSyncStatus } = useApp();
  const currentApp = React.useRef(app);
  currentApp.current = app;
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<ServerComparison | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const check = async () => {
    if (busy) return;
    setBusy(true);
    setResult(null);
    setMessage(null);
    try {
      const key = getActiveVaultKey();
      if (!key || !isVaultUnlocked) throw new Error('Bitte den KLASSIO-Datentresor zuerst entsperren.');
      const vault = await loadVaultRecord();
      if (!vault) throw new Error('Auf diesem Gerät wurde kein Datentresor gefunden.');

      const statusResponse = await fetch('/api/access/status', { cache: 'no-store' });
      if (!statusResponse.ok) throw new Error('Der E-Mail-Kontostatus ist nicht erreichbar.');
      const status = await statusResponse.json();
      if (!status?.authenticated || !status.account?.email) {
        throw new Error('Keine aktive persönliche E-Mail-Anmeldung. Die Schulverifizierung allein synchronisiert keine Daten.');
      }

      const before = appStateFingerprint(currentApp.current);
      const remote = await fetchAccountSyncSnapshot();
      if (!remote) {
        setMessage('Unter diesem E-Mail-Konto liegt noch kein verschlüsselter Serverstand. Nichts wurde verändert. Sichere zuerst den aktuellen Schul-Laptop.');
        return;
      }
      const baseline = loadAccountSyncMetadata(vault.id);
      const shared = {
        email: status.account.email as string,
        revision: remote.revision,
        updatedAt: remote.updatedAt,
        localRevision: baseline?.revision ?? null,
        localUpdatedAt: baseline?.updatedAt ?? null,
      };
      if (remote.vaultRecord.id !== vault.id) {
        setResult({ ...shared, result: 'wrong-vault' });
        return;
      }
      const remoteState = await decryptAccountSyncSnapshot(remote, key);
      const after = appStateFingerprint(currentApp.current);
      setResult({
        ...shared,
        result: before !== after ? 'local-changed'
          : appStateFingerprint(remoteState) === after ? 'same' : 'different',
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Der Serverstand konnte nicht gelesen werden.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800" data-testid="account-sync-read-only-check">
      <h4 className="font-bold">Schul-Laptop und Zuhause: Datenstand vergleichen</h4>
      <p className="mt-1 text-slate-600">
        Diese Prüfung liest deinen verschlüsselten Kontostand und vergleicht ihn nur auf diesem Gerät.
        Es werden keine Daten in deinen Arbeitsstand übernommen, überschrieben oder hochgeladen.
      </p>
      <button type="button" onClick={() => void check()} disabled={busy}
        className="mt-3 min-h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 font-bold text-slate-900 disabled:opacity-60">
        {busy ? 'Serverstand wird geprüft …' : 'Serverstand prüfen (nur lesen)'}
      </button>
      {message && <p role="status" className="mt-2 font-semibold text-amber-900">{message}</p>}
      {result && (
        <div role="status" data-account-comparison={result.result} className="mt-3 space-y-1">
          <p>Angemeldetes Konto: <strong>{result.email}</strong></p>
          <p>Server: Version {result.revision} · {formatTimestamp(result.updatedAt)}</p>
          <p>Letzte Bestätigung dieses Geräts: {result.localRevision === null
            ? 'keine' : 'Version ' + result.localRevision + ' · ' + formatTimestamp(result.localUpdatedAt)}</p>
          {result.result === 'same' && (
            <p className="font-bold text-emerald-800">
              Die aktuell geöffneten Kontodaten stimmen inhaltlich mit der Serverkopie überein.
              {accountSyncStatus !== 'synced' ? ' Der letzte lokale Speichervorgang ist möglicherweise noch nicht bestätigt.' : ''}
            </p>
          )}
          {result.result === 'different' && (
            <p className="font-bold text-amber-900">
              Unterschiedliche Datenstände festgestellt. Es wurde nichts verändert. Bitte zuerst
              auf beiden Geräten ein verschlüsseltes Backup erstellen und nicht den alten lokalen Stand hochladen.
            </p>
          )}
          {result.result === 'wrong-vault' && (
            <p className="font-bold text-rose-800">
              E-Mail-Konto und lokaler Datentresor gehören nicht zusammen. Keine Daten überschreiben.
            </p>
          )}
          {result.result === 'local-changed' && (
            <p className="font-bold text-amber-900">
              Während der Prüfung hat sich der lokale Stand verändert. Bitte die Prüfung wiederholen.
            </p>
          )}
          <p className="text-slate-600">
            Gemeinsame Teamteaching-Klassen besitzen zusätzlich einen eigenen, gesonderten Abgleich.
            Diese Prüfung betrifft den persönlichen Konto-Datenstand.
          </p>
        </div>
      )}
    </section>
  );
}
