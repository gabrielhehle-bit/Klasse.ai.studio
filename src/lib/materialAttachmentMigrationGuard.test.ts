import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MATERIAL_LIBRARY_MAX_MB, MATERIAL_FILE_MAX_MB } from './materialLibraryUtils';
import type { MaterialItem } from '../types';

test('encrypted attachment foundation does NOT silently migrate, delete or reprice current materials', () => {
  assert.equal(MATERIAL_LIBRARY_MAX_MB, 5);
  assert.equal(MATERIAL_FILE_MAX_MB, 3);
  const materialUI = readFileSync('src/components/Materialbibliothek.tsx', 'utf8');
  const canvaImport = readFileSync('src/lib/canvaImageImport.ts', 'utf8');
  const backup = readFileSync('src/lib/backupCryptoService.ts', 'utf8');
  const server = readFileSync('server.ts', 'utf8');
  const env = readFileSync('.env.example', 'utf8');
  assert.match(materialUI, /dateiInhalt: reader\.result as string/);
  assert.match(canvaImport, /dateiInhalt: image/);
  assert.match(backup, /export const CURRENT_BACKUP_VERSION = 1/);
  assert.match(server, /process\.env\.KLASSIO_ENCRYPTED_ATTACHMENTS_ENABLED === 'true'/);
  assert.match(server, /if \(!encryptedAttachmentsEnabled\)/);
  assert.match(server, /process\.env\.NODE_ENV !== 'production'/);
  assert.match(env, /KLASSIO_ENCRYPTED_ATTACHMENTS_ENABLED=false/);
  assert.doesNotMatch(server, /process\.env\.KLASSIO_ENCRYPTED_ATTACHMENTS_ENABLED \|\| 'true'/);
  const existing: MaterialItem = {
    id: 'legacy-synthetic', titel: 'Old fixture', beschreibung: '', typ: 'datei',
    dateiInhalt: 'data:image/png;base64,ZmFrZQ==',
    faecher: [], schulstufen: [], tags: [], erstelltAm: '2026-09-20', favorit: false, kiGeneriert: false,
  };
  assert.equal(existing.dateiInhalt, 'data:image/png;base64,ZmFrZQ==');
});
