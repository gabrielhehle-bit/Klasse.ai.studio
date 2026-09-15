import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path: string) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
}

test('planner Excel exports use Klassio branding', () => {
  const source = read('src/lib/planerExcelService.ts');
  assert.match(source, /KLASSIO WOCHENPLANER - AUSFÜLLHILFE/);
  assert.match(source, /KLASSIO JAHRESPLANER - AUSFÜLLHILFE/);
  assert.doesNotMatch(source, /LEHRERAPP WOCHENPLANER|LEHRERAPP JAHRESPLANER/);
});

test('OneDrive setup help uses current Klassio naming', () => {
  const source = read('src/components/Backup.tsx');
  assert.match(source, /Klassio OneDrive Sync/);
  assert.doesNotMatch(source, /Schul-Lehrermappe Sync|digitale Lehrermappe|AI Studio Secrets/);
});

test('visible backup labels distinguish the supported legacy extension', () => {
  const backup = read('src/components/Backup.tsx');
  const settings = read('src/components/settings/BackupSettings.tsx');
  assert.match(backup, /Legacy \.lehrerapp/);
  assert.match(settings, /Legacy \.lehrerapp/);
});
