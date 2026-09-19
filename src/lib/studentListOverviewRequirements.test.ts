import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const studentList = readFileSync('src/components/StudentList.tsx', 'utf8');
const stats = readFileSync('src/components/ClassOverviewStats.tsx', 'utf8');
const studentMap = readFileSync('src/components/StudentMap.tsx', 'utf8');

test('Klassenliste: OpenStreetMap-Wohnortansicht bleibt ein eigenständiger Reiter', () => {
  assert.match(studentList, /setViewMode\('map'\)/);
  assert.match(studentList, /viewMode === 'map'/);
  assert.match(studentList, /<StudentMap students=\{filteredStudents\} \/>/);
  assert.match(studentMap, /leaflet|react-leaflet/);
});

test('Klassenliste: aufklappbare Statistik zeigt gesamte Klasse unabhängig von Suche', () => {
  assert.match(studentList, /aria-expanded=\{showClassStatistics\}/);
  assert.match(studentList, /<ClassOverviewStats students=\{schueler\} \/>/);
  assert.doesNotMatch(studentList, /<ClassOverviewStats students=\{filteredStudents\} \/>/);
  assert.match(stats, /Erstsprachen/);
  assert.match(stats, /Zweitsprachen/);
  assert.match(stats, /Religionen/);
  assert.match(stats, /Staatsbürgerschaften/);
});

test('Klassenliste: kompakte Tabelle mit selbst wählbaren Spalten behält Dossier, Förderkennzeichen und sichere Löschung', () => {
  assert.match(studentList, /<table className="w-full min-w-\[620px\]/);
  assert.match(studentList, /klassio_student_list_columns_v1/);
  assert.match(studentList, /Spalten anpassen/);
  assert.match(studentList, /setSelectedFolderStudent\(student.id\)/);
  assert.match(studentList, /updateStudent\(\{ \.\.\.student, daz: !student.daz \}\)/);
  assert.match(studentList, /updateStudent\(\{ \.\.\.student, spf: !student.spf \}\)/);
  assert.match(studentList, /handleDeleteStudent\(student\)/);
  assert.doesNotMatch(studentList, /<span>Liste drucken<\/span>/);
});

test('Klassenliste: Förderfilter sind kombinierbar und verändern keine Schülerdaten', () => {
  assert.match(studentList, /activeFilters\.every\(filter => Boolean\(s\[filter\]\)\)/);
  assert.match(studentList, /aria-pressed=\{activeFilters\.includes\(filter\)\}/);
});
