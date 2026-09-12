import type { AppState } from '../types';
import { isEncryptedBackupV1, decryptBackup, unlockAndDecryptBackup, recoverBackup } from './backupCryptoService';
import { getActiveVaultKey } from './vaultStorage';
import { saveEncryptedAppState, saveEncryptedPreImportBackup } from './secureStorageService';

const object = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Validate known collection shapes; preserve unknown fields for compatible future exports. */
export function validateBackupState(value: unknown): asserts value is AppState {
  if (!object(value) || (!Array.isArray(value.schueler) && !Array.isArray(value.classes))) {
    throw new Error('Keine vollständige LehrerAPP-Sicherung: Schüler- oder Klassendaten fehlen.');
  }
  if (!value.classes?.length && !(typeof value.klassenbezeichnung === 'string' && ['noten', 'settings', 'stammplan'].some(k => object(value[k])))) {
    throw new Error('Keine vollständige LehrerAPP-Sicherung: Klassenangaben und App-Daten fehlen.');
  }
  function validateScope(scope: Record<string, any>) {
    for (const key of ['schueler', 'classes', 'archivedClasses', 'dienste', 'checklisten', 'customLists']) {
      if (scope[key] !== undefined && !Array.isArray(scope[key])) throw new Error(`Ungültiges Datenfeld: ${key}.`);
    }
    for (const key of ['noten', 'mitarbeit', 'karten', 'saAssessments', 'settings', 'wochenplanung', 'stammplan']) {
      if (scope[key] !== undefined && !object(scope[key])) throw new Error(`Ungültiges Datenfeld: ${key}.`);
    }
    const ids = new Set<string>();
    for (const student of scope.schueler || []) {
      if (!object(student) || typeof student.id !== 'string' || !student.id || ids.has(student.id) ||
          typeof student.vorname !== 'string' || typeof student.nachname !== 'string') {
        throw new Error('Ungültige Schülerdaten oder doppelte Schüler-ID.');
      }
      ids.add(student.id);
    }
  }
  validateScope(value);
  for (const key of ['classes', 'archivedClasses']) {
    const ids = new Set<string>();
    for (const c of value[key] || []) {
      if (!object(c) || typeof c.id !== 'string' || !c.id || ids.has(c.id)) throw new Error('Ungültige oder doppelte Klassen-ID.');
      ids.add(c.id);
      validateScope(c);
    }
  }
  if (value.classes?.length && value.activeClassId && !value.classes.some((c: any) => c.id === value.activeClassId)) {
    throw new Error('Die aktive Klasse fehlt in der Sicherung.');
  }
}

export function parseBackupJSON(text: string): unknown {
  try { return JSON.parse(text.replace(/^\uFEFF/, '').trim()); }
  catch { throw new Error('Die Datei enthält kein gültiges JSON. Bitte die ursprüngliche Sicherungsdatei auswählen.'); }
}

/** Decrypt without replacing the current vault session (also on cancellation/failure). */
export async function prepareBackupRestore(
  value: unknown,
  askPassword: () => string | null | Promise<string | null>,
  activeKey = getActiveVaultKey(),
): Promise<AppState | null> {
  let state: unknown = value;
  if (object(value) && ('format' in value || 'encryptedState' in value || 'vaultRecord' in value)) {
    if (!isEncryptedBackupV1(value)) throw new Error('Beschädigte Sicherung oder nicht unterstützte Backup-Version.');
    state = null;
    if (activeKey) {
      try { state = await decryptBackup(value, activeKey); } catch { /* Try the source backup's password. */ }
    }
    if (!state) {
      const credential = await askPassword();
      if (!credential) return null;
      // Always try passwords first: a 32-character password is not necessarily a recovery code.
      try { state = (await unlockAndDecryptBackup(value, credential)).appState; }
      catch {
        if (!/^[0-9a-f]{32}$/i.test(credential.replace(/[-\s]/g, ''))) throw new Error('Das Passwort passt nicht zu dieser Sicherung.');
        state = (await recoverBackup(value, credential)).appState;
      }
    }
  }
  validateBackupState(state);
  return structuredClone(state);
}

export const backupPasswordPrompt = () => window.prompt('Passwort oder Wiederherstellungscode dieser Sicherung eingeben. Dein aktuelles Tresorpasswort bleibt unverändert.');

/** Write a verified, encrypted rollback copy before changing the primary state. */
export async function commitBackupRestore(
  current: AppState, next: AppState, key: CryptoKey,
  storage = { savePrevious: saveEncryptedPreImportBackup, saveState: saveEncryptedAppState },
): Promise<void> {
  validateBackupState(next);
  if (!key) throw new Error('Bitte zuerst den Tresor entsperren.');
  await storage.savePrevious(current, key);
  try { await storage.saveState(next, key); }
  catch (error) {
    try { await storage.saveState(current, key); }
    catch { throw new Error('Speicherfehler. Die Rücksicherung ist erhalten; bitte keine weiteren Änderungen vornehmen.'); }
    throw error;
  }
}
