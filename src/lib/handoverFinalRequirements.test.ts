import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const handover = readFileSync('src/components/Uebergabemappe.tsx', 'utf8');
const appState = readFileSync('src/lib/appState.ts', 'utf8');

test('Übergabemappe: all schedule and assignment paths use the ten-slot contract', () => {
  assert.match(handover, /LESSON_SLOT_NUMBERS/);
  assert.doesNotMatch(handover, /\[1, 2, 3, 4, 5, 6\]\.map\(std =>/);
  assert.match(handover, /getHandoverLessonTime\(app\.stundenZeiten, STUNDEN_INFO, std\)/);
});

test('Übergabemappe: shared material lesson plans are normalized instead of cast to legacy shape', () => {
  assert.match(handover, /getHandoverLessonPlans\(app\.materialien\)/);
  assert.match(handover, /const lessonPlans = useMemo/);
  assert.doesNotMatch(handover, /as unknown as VertretungsStundenbild\[\]/);
  assert.doesNotMatch(handover, /filter\(m => m\.typ === 'stundenentwurf'\) as unknown/);
});

test('Übergabemappe: old lesson-plan collection migrates once into the material library', () => {
  assert.match(handover, /if \(app\.stundenbilderMigriert\) return/);
  assert.match(handover, /migrateStundenbilderToMaterialien\(migrationState\)/);
  assert.match(handover, /stundenbilderMigriert: true/);
});

test('Übergabemappe: deleting a lesson plan also removes weekly-plan references in every class', () => {
  assert.match(handover, /removeMaterialReferencesFromWeeklyPlan\(prev\.wochenplanung, \[id\]\)/);
  assert.match(handover, /removeMaterialReferencesFromClasses\(prev\.classes, \[id\]\)/);
});

test('Übergabemappe: lesson-plan editor respects the shared material storage limit and preserves metadata', () => {
  assert.match(handover, /calculateMaterialStorageSize\(nextMaterials\) > MATERIAL_LIBRARY_MAX_MB/);
  assert.match(handover, /favorit: existing\.favorit/);
  assert.match(handover, /zuletztVerwendet: existing\.zuletztVerwendet/);
  assert.match(handover, /upsertMaterial\(prev\.materialien \|\| \[\], materialItem\)/);
});

test('Übergabemappe: emergency preparation is never pre-confirmed and school contacts are not hardcoded', () => {
  assert.match(handover, /Klassenzimmer-Schlüssel beim Schulwart hinterlegt', checked: false/);
  assert.match(handover, /Klassendienste \(Tafeldienst etc\.\) zugeteilt', checked: false/);
  assert.match(handover, /Allergie- & Notfallkontaktliste liegt sichtbar am Lehrertisch', checked: false/);
  assert.doesNotMatch(handover, /Volker Gabriel/);
  assert.doesNotMatch(handover, /5522 72412/);
  assert.doesNotMatch(handover, /Petra Gruber/);
});

test('Übergabemappe: sorting control contains all implemented sort modes', () => {
  assert.match(handover, /<option value="used">Zuletzt verwendet<\/option>/);
  assert.match(handover, /<option value="date">Neueste zuerst<\/option>/);
  assert.match(handover, /<option value="title">Titel A–Z<\/option>/);
});

test('Schulwechselpaket: promised performance and diagnostics modules are selectable and rendered', () => {
  assert.match(handover, /key: 'leistungen', label: 'Leistungsstand'/);
  assert.match(handover, /key: 'diagnostik', label: 'Diagnostik & Förderbedarf'/);
  assert.match(handover, /transferModules\.leistungen &&/);
  assert.match(handover, /transferModules\.diagnostik &&/);
  assert.match(handover, /berechne\(app, transferStudentId, fach, '1'\)/);
  assert.match(handover, /app\.diagnosticResults \|\| \[\]/);
});

test('Schulwechselpaket: pedagogical notes come from class-local chronicle data', () => {
  assert.match(handover, /const source = \(app\.notes && app\.notes\.length > 0\) \? app\.notes : \(app\.journal \|\| \[\]\)/);
  assert.doesNotMatch(handover, /app\.notizen/);
});

test('Übergabemappe: handover notes participate in class projection and class switching', () => {
  assert.match(appState, /vertretungHinweise: state\.vertretungHinweise \|\| ''/);
  assert.match(appState, /parsed\.vertretungHinweise = activeClass\.vertretungHinweise/);
  assert.match(appState, /vertretungHinweise: targetClass\.vertretungHinweise \|\| ''/);
});

test('Übergabemappe: class change clears temporary print, transfer and checklist selections', () => {
  assert.match(handover, /setAssignedStundenbilder\(\{\}\)/);
  assert.match(handover, /setDayNotes\(\{\}\)/);
  assert.match(handover, /setTransferStudentId\(null\)/);
  assert.match(handover, /setEmergencyChecklist\(DEFAULT_EMERGENCY_CHECKLIST\.map/);
  assert.match(handover, /\}, \[app\.activeClassId\]\)/);
});

test('Übergabemappe: date inputs use local dates instead of UTC serialization', () => {
  assert.match(handover, /toLocalDateInputValue\(new Date\(\)\)/);
  assert.doesNotMatch(handover, /setSingleDate\(new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]\)/);
});

test('Schulwechselpaket: privacy view hides sensitive identity fields, not only the name', () => {
  assert.match(handover, /Datenschutzansicht \(Initialen, sensible Stammdaten ausgeblendet\)/);
  assert.match(handover, /privacyMode \? 'Ausgeblendet' : \(app\.schueler\.find\(s => s\.id === transferStudentId\)\?\.geburtstag/);
  assert.match(handover, /privacyMode \? 'Ausgeblendet' : \(app\.schueler\.find\(s => s\.id === transferStudentId\)\?\.religion/);
});
