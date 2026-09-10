import { decryptData } from './crypto';
import { isEncryptedBackupV1, isLegacyPlaintextBackup, decryptBackup, unlockAndDecryptBackup, recoverBackup } from './backupCryptoService';
import { isEncryptedLocalState } from './secureStorageService';

/** Decode only. Never changes the active vault, storage or application state. */
export async function prepareBackupRestore(
  input: unknown,
  localKey: CryptoKey,
  requestCredential: () => string | null | Promise<string | null>,
): Promise<Record<string, any> | null> {
  let state: unknown;
  if (isEncryptedLocalState(input)) {
    state = await decryptData(input.encryptedState, localKey);
  } else if (isEncryptedBackupV1(input)) {
    try {
      state = await decryptBackup(input, localKey);
    } catch {
      const credential = await requestCredential();
      if (!credential) return null;
      // A 32-character password is still a password; try recovery only after it fails.
      try {
        state = (await unlockAndDecryptBackup(input, credential)).appState;
      } catch {
        state = (await recoverBackup(input, credential)).appState;
      }
    }
  } else {
    state = input;
  }
  assertRestorableAppState(state);
  return state;
}

export function assertRestorableAppState(state: unknown): asserts state is Record<string, any> {
  if (!isLegacyPlaintextBackup(state) || Array.isArray(state)) {
    throw new Error('Diese Datei enthält keinen gültigen LehrerAPP-Datenbestand.');
  }
  const data = state as Record<string, any>;
  if (data.schueler !== undefined && !Array.isArray(data.schueler)) {
    throw new Error('Die Schülerliste im Backup ist beschädigt.');
  }
  if (data.classes !== undefined && (!Array.isArray(data.classes) || data.classes.some((c: any) =>
    !c || typeof c !== 'object' || Array.isArray(c) || (c.schueler !== undefined && !Array.isArray(c.schueler))))) {
    throw new Error('Die Klassenliste im Backup ist beschädigt.');
  }
}

/** Accept legacy JSON exports and simple JS assignments, but never execute code.
 * Full input must match: arbitrary surrounding text is not silently discarded.
 */
export function parseBackupText(text: string): unknown {
  const clean = text.replace(/^\uFEFF/, '').trim();
  try { return JSON.parse(clean); } catch { /* Try the documented legacy wrapper. */ }
  const assignment = /^(?:(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*|export\s+default\s+)(\{[\s\S]*\})\s*;?$/.exec(clean);
  if (assignment) {
    try { return JSON.parse(assignment[1]); } catch { /* Report invalid JSON below. */ }
  }
  throw new Error('Die Datei enthält kein lesbares JSON-Backup.');
}
