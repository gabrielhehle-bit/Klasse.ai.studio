import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const material = readFileSync('src/components/Materialbibliothek.tsx', 'utf8');
const worksheet = readFileSync('src/components/WorksheetGenerator.tsx', 'utf8');

test('Materialbibliothek: Wochenplan-Übergabe unterstützt alle zehn Stunden-Slots', () => {
  assert.match(material, /LESSON_SLOT_NUMBERS/);
  assert.match(material, /const availableHours = LESSON_SLOT_NUMBERS/);
  assert.doesNotMatch(material, /\[1, 2, 3, 4, 5, 6, 7, 8\]/);
  assert.match(material, /useState\(app\.currentKW \|\| getIsoWeekNumber\(\)\)/);
});

test('Materialbibliothek: Löschen räumt Wochenplan-Verknüpfungen konsistent auf', () => {
  assert.match(material, /removeMaterialReferencesFromWeeklyPlan\(prev\.wochenplanung, removedIds\)/);
  assert.match(material, /removeMaterialReferencesFromWeeklyPlan\(prev\.wochenplanung, \[id\]\)/);
  assert.match(material, /removeMaterialReferencesFromWeeklyPlan\(prev\.wochenplanung\)/);
});

test('Materialbibliothek: Datei- und Linkdaten werden validiert und typgerecht bereinigt', () => {
  assert.match(material, /validateMaterialFile\(file\)/);
  assert.match(material, /normalizeMaterialExternalLink\(formData\.externerLink\)/);
  assert.match(material, /sanitizeMaterialForType\(/);
  assert.doesNotMatch(material, /win\.document\.write/);
  assert.match(material, /window\.open\(item\.dateiInhalt, '_blank', 'noopener,noreferrer'\)/);
});

test('Materialbibliothek: versteckte Auswahl kann nicht unbemerkt gesammelt gelöscht werden', () => {
  assert.match(material, /const visibleIds = new Set\(filteredMaterials\.map\(material => material\.id\)\)/);
  assert.match(material, /setSelectedItems\(prev => prev\.filter\(id => visibleIds\.has\(id\)\)\)/);
  assert.match(material, /filteredMaterials\.every\(material => selectedItems\.includes\(material\.id\)\)/);
});

test('Materialbibliothek: KI-Speichern dedupliziert IDs und respektiert das Speicherlimit', () => {
  assert.match(material, /const nextMaterials = upsertMaterial\(prev\.materialien \|\| \[\], newItem\)/);
  assert.match(material, /calculateMaterialStorageSize\(nextMaterials\) > MATERIAL_LIBRARY_MAX_MB/);
  assert.doesNotMatch(material, /materialien: \[\.\.\.\(prev\.materialien \|\| \[\]\), newItem\]/);
});

test('Materialbibliothek: manuelle KI-Erstellung startet mit der aktiven Schulstufe', () => {
  assert.match(material, /setAiStufe\] = useState\(Math\.min\(4, Math\.max\(1, Number\(app\.stufe\) \|\| 1\)\)\)/);
});

test('Arbeitsblatt-Generator: Prompt und Bibliotheksmetadaten nutzen die aktive Schulstufe', () => {
  assert.match(worksheet, /const worksheetGrade = Math\.min\(4, Math\.max\(1, Number\(app\.stufe\) \|\| 1\)\)/);
  assert.match(worksheet, /Didaktik der \$\{worksheetGrade\}\. Schulstufe/);
  assert.match(worksheet, /Schulstufe: \$\{worksheetGrade\}\. Schulstufe/);
  assert.match(worksheet, /schulstufen: \[worksheetGrade\]/);
  assert.match(worksheet, />\{worksheetGrade\}\. Schulstufe</);
  assert.doesNotMatch(worksheet, /schulstufen: \[4\]/);
  assert.doesNotMatch(worksheet, />4\. Schulstufe</);
});
