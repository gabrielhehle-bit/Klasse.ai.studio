import type { AppState } from '../types';
import { rotateRecoveryCode } from './vaultService';
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

/**
 * Rotiert den Recovery-Code bewusst und synchronisiert den neuen, weiterhin nur
 * verschlüsselt gespeicherten VaultRecord mit dem E-Mail-Konto.
 *
 * Der Recovery-Code selbst wird niemals an den Klassio-Server gesendet.
 * Stattdessen liefert die Funktion einen mailto:-Entwurf zurück, den die
 * Lehrperson mit ihrem eigenen Mailprogramm an sich selbst senden kann.
 */
export async function prepareRecoveryEmail(
  appState: AppState,
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
  if (remote && remote.vaultRecord.id !== vaultRecord.id) {
    throw new Error('Das E-Mail-Konto enthält einen anderen Datentresor. Recovery wurde nicht geändert.');
  }

  const rotated = await rotateRecoveryCode(vaultRecord, currentVaultPassword);

  // Zuerst lokal aktualisieren. Falls der Konto-Sync fehlschlägt, wird der alte
  // VaultRecord sofort zurückgesetzt, damit kein halb fertiger Recovery-Zustand bleibt.
  await saveVaultRecord(rotated.updatedRecord);
  setActiveVaultSession(vaultKey, rotated.updatedRecord);

  try {
    await pushAccountSyncSnapshot(
      appState,
      vaultKey,
      rotated.updatedRecord,
      remote?.revision || 0,
    );
  } catch (error) {
    await saveVaultRecord(vaultRecord);
    setActiveVaultSession(vaultKey, vaultRecord);
    throw error;
  }

  return {
    email,
    recoveryCode: rotated.newRecoveryCode,
    mailto: buildRecoveryMailto(email, rotated.newRecoveryCode),
  };
}
