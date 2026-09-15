import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const archive = readFileSync('src/components/Archive.tsx', 'utf8');
const archiveData = readFileSync('src/lib/archiveData.ts', 'utf8');
const appState = readFileSync('src/lib/appState.ts', 'utf8');
const types = readFileSync('src/types.ts', 'utf8');

test('Archiv uses full class snapshots instead of the old flat statistics prototype', () => {
  assert.match(archive, /app\.archivedClasses \|\| \[\]/);
  assert.match(archive, /Aktuelle Klasse archivieren/);
  assert.match(archive, /Archivstand aktualisieren/);
  assert.match(archive, /Archiv ansehen/);
  assert.doesNotMatch(archive, /Notenschnitt Gesamt/);
  assert.doesNotMatch(archive, /Schnitt bis 1,5/);
  assert.doesNotMatch(archive, /XLS-Export folgt/);
});

test('new archive snapshots exclude operational secrets and unnecessary contact identifiers', () => {
  for (const forbidden of [
    'zugangsdaten:',
    'klassenkasse:',
    'sitzplan_schueler:',
    'jahresplanung:',
    'wochenplanung:',
  ]) {
    assert.doesNotMatch(archiveData, new RegExp(forbidden));
  }

  for (const removedStudentKey of [
    'sv_nummer',
    'email_eltern',
    'telefon_mutter',
    'telefon_vater',
    'anschrift',
    'fotoFreigabe',
  ]) {
    assert.match(archiveData, new RegExp(removedStudentKey));
  }
});

test('archive snapshots are normalized during app restore and are typed separately from live classrooms', () => {
  assert.match(appState, /normalizeArchivedClasses\(raw\.archivedClasses\)/);
  assert.match(appState, /archivedClasses: normalizeArchivedClasses\(parsed\.archivedClasses\)/);
  assert.match(types, /archivedClasses\?: import\('\.\/lib\/archiveData'\)\.ArchivedClassSnapshot\[\]/);
});

test('legacy historical students remain clearly separated for backup compatibility', () => {
  assert.match(archive, /Legacy-Archiv aus älteren Klassio-Versionen/);
  assert.match(archive, /keine vollständige Klassenakte/);
  assert.match(archive, /historicalStudents/);
});

test('archive detail only displays explicit stored end grades and never fabricates averages', () => {
  assert.match(archive, /getArchivedFinalGrade/);
  assert.match(archive, /nur tatsächlich gespeicherte Endnoten/);
  assert.match(archiveData, /for \(const semester of \['2', '1'\]\)/);
  assert.doesNotMatch(archive, /average\.toFixed/);
});
