import type { AppState } from '../types';
import { rotateRecoveryCode, type VaultRecordV1 } from './vaultService';
import {
  getActiveVaultKey,
  loadVaultRecord,
  saveVaultRecord,
  setActiveVaultSession,
} from './vaultStorage';
import {
  fetchAccountSyncSnapshot,
  pushAccountSyncSnapshot,
} from './accountSyncService';

export interface PreparedRecoveryEmail {
  email: string;
  recoveryCode: string;
  mailto: string;
  baseRevision: number;
  updatedRecord: VaultRecordV1;
}

export function buildRecoveryMailto(email: string, recoveryCode: string): string {
  const recipient = email.trim();
  const subject = 'KLASSIO – Wiederherstellungscode';
  const body = [
    'KLASSIO Wiederherstellungscode',
    '',
    recoveryCode,
    '',
    'Bewahre diese E-Mail sicher auf. Wer Zugriff auf diesen Code hat, kann deinen KLASSIO-Datentresor wiederherstellen.',
    'KLASSIO selbst speichert diesen Code nicht im Klartext.',
  ].join('\n');

  return `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

async function getSignedInEmail(): Promise<string> {
  let response: Response;
  try {
    response = await fetch('/api/access/status', { cache: 'no-store' });
  } catch {
    throw new Error('Klassio kann dein E-Mail-Konto gerade nicht erreichen. Bitte Internetverbindung prüfen.');
  }

  if (!response.ok) {
    throw new Error('Der E-Mail-Kontostatus konnte nicht geladen werden.');
  }

  const data = await response.json().catch(() => ({}));
  const email = typeof data?.account?.email === 'string' ? data.account.email.trim().toLowerCase() : '';
  if (!data?.authenticated || !email) {
    throw new Error('Melde dich zuerst mit deiner E-Mail-Adresse bei Klassio an.');
  }
  return email;
}

function sameRecoveryWrapper(a: VaultRecordV1, b: VaultRecordV1): boolean {
  return a.recoverySalt === b.recoverySalt
    && a.recoveryKdfIterations === b.recoveryKdfIterations
    && JSON.stringify(a.recoveryWrappedVaultKey) === JSON.stringify(b.recoveryWrappedVaultKey);
}

/**
 * Bereitet einen neuen Recovery-Code ausschließlich im Browser vor.
 *
 * Noch wird weder der lokale VaultRecord verändert noch etwas zum Klassio-Server
 * geschrieben. Die Lehrperson kann den neuen Code daher zuerst sicher kopieren
 * oder mit dem eigenen Mailprogramm an sich selbst senden.
 */
export async function prepareRecoveryEmail(
  currentVaultPassword: string,
): Promise<PreparedRecoveryEmail> {
  if (!currentVaultPassword) {
    throw new Error('Bitte gib zuerst dein aktuelles Tresor-Passwort ein.');
  }

  const email = await getSignedInEmail();
  const vaultRecord = await loadVaultRecord();
  const vaultKey = getActiveVaultKey();
  if (!vaultRecord || !vaultKey) {
    throw new Error('Der Datentresor muss auf diesem Gerät entsperrt sein.');
  }

  const remote = await fetchAccountSyncSnapshot();
  if (!remote) {
    throw new Error('Der verschlüsselte Kontostand ist noch nicht auf dem Server gespeichert. Starte zuerst den Konto-Abgleich.');
  }
  if (remote.vaultRecord.id !== vaultRecord.id) {
    throw new Error('Das E-Mail-Konto enthält einen anderen Datentresor. Recovery wurde nicht geändert.');
  }

  const rotated = await rotateRecoveryCode(vaultRecord, currentVaultPassword);
  return {
    email,
    recoveryCode: rotated.newRecoveryCode,
    mailto: buildRecoveryMailto(email, rotated.newRecoveryCode),
    baseRevision: remote.revision,
    updatedRecord: rotated.updatedRecord,
  };
}

/**
 * Aktiviert einen zuvor gesicherten Recovery-Code.
 *
 * Der neue VaultRecord wird erst jetzt mit einer revisionsgeschützten
 * Konto-Synchronisierung übernommen und danach lokal gespeichert. Geht die
 * Netzwerkantwort nach erfolgreicher Serverspeicherung verloren, erkennt ein
 * erneuter Versuch denselben Recovery-Wrapper und schließt die lokale Übernahme
 * sicher ab.
 *
 * Der Recovery-Code selbst wird niemals an den Klassio-Server gesendet.
 */
export async function activatePreparedRecoveryEmail(
  appState: AppState,
  prepared: PreparedRecoveryEmail,
): Promise<void> {
  const localRecord = await loadVaultRecord();
  const vaultKey = getActiveVaultKey();
  if (!localRecord || !vaultKey) {
    throw new Error('Der Datentresor muss auf diesem Gerät entsperrt sein.');
  }
  if (localRecord.id !== prepared.updatedRecord.id) {
    throw new Error('Der vorbereitete Recovery-Code gehört nicht zu diesem Datentresor.');
  }

  const remote = await fetchAccountSyncSnapshot();
  if (!remote || remote.vaultRecord.id !== localRecord.id) {
    throw new Error('Der passende verschlüsselte Kontostand konnte nicht bestätigt werden.');
  }

  // Retry-Sicherheit: Der Server kann den neuen Wrapper bereits angenommen haben,
  // obwohl die vorige Netzwerkantwort das Gerät nicht erreicht hat.
  if (!sameRecoveryWrapper(remote.vaultRecord, prepared.updatedRecord)) {
    if (remote.revision !== prepared.baseRevision) {
      throw new Error('Der Konto-Stand hat sich inzwischen geändert. Bitte den Recovery-Code neu vorbereiten, damit nichts überschrieben wird.');
    }
    await pushAccountSyncSnapshot(
      appState,
      vaultKey,
      prepared.updatedRecord,
      remote.revision,
    );
  }

  await saveVaultRecord(prepared.updatedRecord);
  setActiveVaultSession(vaultKey, prepared.updatedRecord);
}
