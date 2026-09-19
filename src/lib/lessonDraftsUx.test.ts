import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const components = join(dirname(fileURLToPath(import.meta.url)), '..', 'components');
const read = (name: string) => readFileSync(join(components, name), 'utf8');

test('detailed lesson planning uses one selected week slot and is displayed in its overview', () => {
  const week = read('WeeklyPlan.tsx');
  assert.match(week, /plannerEditorTab === 'entwurf'/);
  assert.match(week, /stundenentwurf: hasLessonDraftContent\(tempStundenentwurf\)/);
  assert.match(week, /kwPlan\[tag\]\[idx\]/);
  assert.match(week, /lesson\.stundenentwurf && hasLessonDraftContent/);
  assert.match(week, /Alle Änderungen werden erst mit „Einheit speichern“ übernommen/);
});

test('reuse asks before changing a configured lesson and keeps the original collection', () => {
  const week = read('WeeklyPlan.tsx');
  assert.match(week, /savedLessonDrafts = useMemo/);
  assert.match(week, /app\.stundenentwuerfe \|\| \[\]/);
  assert.match(week, /app\.materialien \|\| \[\]/);
  assert.match(week, /Vorlage in die aktuelle Stunde übernehmen\?/);
  const drafts = read('Drafts.tsx');
  assert.match(drafts, /Diese Stunde enthält bereits eine Planung/);
  assert.match(drafts, /LESSON_SLOT_NUMBERS\.map/);
  const ai = read('LessonPlannerAI.tsx');
  assert.match(ai, /Diese Stunde enthält bereits Inhalte/);
  assert.match(ai, /getKW\(new Date\(\)\)/);
  assert.match(ai, /!embeddedInWeeklyEditor/);
});

test('existing plans are still reachable from the library; no duplicate main menu', () => {
  const library = read('Materialbibliothek.tsx');
  const hub = read('PlanungHub.tsx');
  const nav = read('Sidebar.tsx');
  assert.match(library, /Unterrichtsvorbereitungen/);
  assert.match(library, /setPage\('stunden'\)/);
  assert.match(library, /kiGeneriert: item\.kiGeneriert \?\?/);
  assert.doesNotMatch(hub, /id: 'stunden'/);
  assert.doesNotMatch(nav, /id: 'stunden'/);
});

test('KI lesson planner does not transfer individual student notes or grade data', () => {
  const ai = read('LessonPlannerAI.tsx');
  assert.doesNotMatch(ai, /app\.schueler\.map\(s => s\.notiz\)/);
  assert.doesNotMatch(ai, /app\.notenmappe \?/);
  assert.match(ai, /keine Namen, individuellen Beobachtungen, Notizen oder Leistungsdaten übertragen/);
});

test('library template reuse is opt-in and preserves unrelated weekly fields', () => {
  const library = read('Materialbibliothek.tsx');
  assert.match(library, /applyPreparation, setApplyPreparation/);
  assert.match(library, /lessonDraftFromMaterial\(item\)/);
  assert.match(library, /Unterrichtsstunde enthält bereits eine Planung/);
  assert.match(library, /\.\.\.slot,/);
  assert.match(library, /Ohne Häkchen wird nur das Material verknüpft/);
  assert.match(library, /stundenentwurf: \{/);
});
