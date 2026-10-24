/**
 * Read-only Prüfung des Wiederherstellungscodes gegen den AKTUELLEN
 * verschlüsselten E-Mail-Kontostand. Der Code bleibt ausschließlich im Browser:
 * HTTP sendet ihn weder als Body noch als Query-Parameter.
 */
import { assertRestorableAppState } from './backupRestore';
import { hasEstablishedClassroom } from './appStateContinuity';
import { decryptAccountSyncSnapshot, fetchAccountSyncSnapshot } from './accountSyncService';
import { recoverVault } from './vaultService';

export type RecoveryCodeCheckResult = {
  hasEstablishedClassroom: boolean;
};

export async function verifyRecoveryCodeReadOnly(recoveryCode: string): Promise<RecoveryCodeCheckResult> {
  if (!recoveryCode.trim()) {
    throw new Error('Bitte gib den Wiederherstellungscode ein.');
  }

  // Nur GET. Niemals Codes oder entschlüsselte Klassendaten hochladen.
  const snapshot = await fetchAccountSyncSnapshot();
  if (!snapshot) {
    throw new Error('Zu diesem E-Mail-Konto wurde kein verschlüsselter Datenstand gefunden. Nichts wurde verändert.');
  }

  let recoveredKey: CryptoKey;
  try {
    recoveredKey = await recoverVault(snapshot.vaultRecord, recoveryCode);
  } catch {
    throw new Error('Der Code passt nicht zum aktuellen Datentresor dieses E-Mail-Kontos. Prüfe alle acht Viererblöcke und ob ein neuer Code aktiviert wurde.');
  }

  let data;
  try {
    data = await decryptAccountSyncSnapshot(snapshot, recoveredKey);
    assertRestorableAppState(data);
  } catch {
    throw new Error('Der Code öffnet den Tresorschlüssel, aber der verschlüsselte Kontostand konnte nicht vollständig gelesen werden. Bitte keine Daten zurücksetzen.');
  }

  return { hasEstablishedClassroom: hasEstablishedClassroom(data) };
}
