import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const weekly = readFileSync('src/components/WeeklyPlan.tsx', 'utf8');
const mobile = readFileSync('src/components/wochenplan/MobileDayLessonCards.tsx', 'utf8');

test('Kleine Bildschirme öffnen die lesbare Tagesansicht; manuelle Umschaltung bleibt möglich', () => {
  assert.match(weekly, /window\.matchMedia\('\(max-width: 1199px\)'\)\.matches \? 'day' : 'grid'/);
  assert.match(weekly, /onClick=\{\(\) => setViewMode\('grid'\)\}/);
  assert.match(weekly, /onClick=\{\(\) => setViewMode\('day'\)\}/);
  assert.match(weekly, /<MobileDayLessonCards/);
});

test('Tageskarten: Fach, Titel, Stundenzeit und pädagogische Details bleiben sichtbar', () => {
  assert.match(mobile, /data-weekly-day-cards/);
  assert.match(mobile, /data-weekly-day-card/);
  assert.match(mobile, /configuredLessonTime\(/);
  assert.match(mobile, /item\?\.thema/);
  assert.match(mobile, /item\.housework \|\| item\.hue/);
  assert.match(mobile, /item\.halves\?\.enabled/);
  assert.match(mobile, /item\.schwerpunkte/);
  assert.match(mobile, /materialIds/);
  assert.match(mobile, /Für Kinder sichtbar/);
  assert.match(mobile, /getChildTaskProgress\(/);
  assert.match(mobile, /isWeeklyLessonSlotCovered\(/);
});

test('Tageskarten: eigene Tastatur- und Touch-Aktionen statt winziger Hover-Icons', () => {
  assert.match(mobile, /data-weekly-day-actions/);
  assert.match(mobile, /min-h-11/);
  assert.match(mobile, /onOpen\(day, idx\)/);
  assert.match(mobile, /onToggleDone\(event, day, idx\)/);
  assert.match(mobile, /onPark\(day, idx\)/);
  assert.match(mobile, /window\.confirm\(/);
  assert.match(mobile, /aria-label/);
  assert.doesNotMatch(mobile, /opacity-0 group-hover/);
});

test('Tageskarten: keine Direktmutation von Stunden oder Parkgarage', () => {
  assert.doesNotMatch(mobile, /setApp\(/);
  assert.doesNotMatch(mobile, /\.splice\(/);
  assert.doesNotMatch(mobile, /delete\s+dayPlan/);
  assert.match(weekly, /onPark=\{handleParkLesson\}/);
  assert.match(weekly, /onToggleDone=\{toggleDoneStatus\}/);
});

test('Mobile Kinderfreigabe ist dieselbe geprüfte Aktion wie im Wochenraster', () => {
  assert.match(mobile, /data-weekly-mobile-child-toggle/);
  assert.match(mobile, /aria-pressed=\{isPublished\}/);
  assert.match(mobile, /onToggleChildPlan\(day, idx\)/);
  assert.match(mobile, /Für Kinder freigeben/);
  assert.match(mobile, /Aus Kinderplan nehmen/);
  assert.match(mobile, /mayPublishToChildren/);
  assert.match(weekly, /onToggleChildPlan=\{\(tag, idx\) => \{/);
  assert.match(weekly, /toggleClassroomWeeklyLesson\(previous, activeKW, tag, idx\)/);
  assert.match(weekly, /previous\.activeClassId !== app\.activeClassId/);
});

test('Kopieren und Einfügen der Tageskarten verwenden exakt den sicheren Wochenplan-Transfer', () => {
  assert.match(mobile, /data-weekly-mobile-copy/);
  assert.match(mobile, /onCopyLesson\(item\)/);
  assert.match(mobile, /data-weekly-mobile-paste/);
  assert.match(mobile, /disabled=\{!canPasteHere\}/);
  assert.match(mobile, /onPasteLesson\(event, day, idx\)/);
  assert.match(weekly, /onCopyLesson=\{lesson => setCopiedLesson\(structuredClone\(lesson\)\)\}/);
  assert.match(weekly, /onPasteLesson=\{pasteLessonBlock\}/);
  assert.match(weekly, /canPasteLesson=\{\(tag, idx\) => !!copiedLesson &&/);
  assert.match(weekly, /pasteCopiedLessonIntoEmptyWeek\(\{/);
  assert.match(weekly, /Kopie verwerfen/);
  assert.match(weekly, /Die neue Kopie wird ebenfalls für Kinder freigegeben/);
});

test('Eine mobile Kinderfreigabe bewahrt alle Rückmeldungen der ursprünglichen Unterrichtsstunde', async () => {
  const { toggleClassroomWeeklyLesson, weekTaskKey } = await import('./classroomWeeklyPlan');
  const schoolYear = '2026/27';
  const key = weekTaskKey(schoolYear, 46, 'Montag', 0);
  const student = { id: 's1', vorname: 'Test', nachname: 'Kind',
    wochenplanFortschritt: { [key]: { done: true, difficulty: 'gut', updatedAt: '2026-11-13T09:30:00Z' } },
  };
  const lesson = { id: 'lesson-source', fach: 'Deutsch', thema: 'Lesen', imKinderWochenplan: true, materialIds: ['a'] };
  const initial = { schuljahr: schoolYear, schueler: [student],
    wochenplanung: { 46: { Montag: { 0: lesson } } } };
  const unpublished = toggleClassroomWeeklyLesson(initial, 46, 'Montag', 0);
  assert.equal(unpublished.wochenplanung[46].Montag[0].imKinderWochenplan, false);
  assert.equal(unpublished.schueler[0], student);
  assert.equal(unpublished.schueler[0].wochenplanFortschritt[key].difficulty, 'gut');
  const republished = toggleClassroomWeeklyLesson(unpublished, 46, 'Montag', 0);
  assert.equal(republished.wochenplanung[46].Montag[0].imKinderWochenplan, true);
  assert.equal(republished.schueler[0], student);
  assert.equal(republished.wochenplanung[46].Montag[0].materialIds, lesson.materialIds);
});

test('Mobiles Einfügen kopiert unabhängig und überschreibt weder belegt noch Doppelstunden', async () => {
  const { pasteCopiedLessonIntoEmptyWeek } = await import('./quickPlanLessonTransfer');
  const original = { id: 'source', fach: 'Mathematik', thema: 'Plus',
    materialIds: ['b'], imKinderWochenplan: true, erledigt: true };
  const week = { Montag: { 0: original, 3: { fach: 'Sport', duration: 3 } } };
  const attempted = pasteCopiedLessonIntoEmptyWeek({
    week, lesson: original, target: { dayIdx: 0, hourIdx: 4 }, copyId: 'new',
  });
  assert.equal(attempted.status, 'occupied-target');
  assert.equal(attempted.week, week);
  const copied = pasteCopiedLessonIntoEmptyWeek({
    week, lesson: original, target: { dayIdx: 0, hourIdx: 1 }, copyId: 'new',
  });
  assert.equal(copied.status, 'copied');
  assert.equal(copied.week.Montag[1].id, 'new');
  assert.equal(copied.week.Montag[1].imKinderWochenplan, true);
  assert.equal(copied.week.Montag[1].erledigt, false);
  assert.notEqual(copied.week.Montag[1].materialIds, original.materialIds);
  assert.equal(copied.week.Montag[0], original);
  assert.equal(week.Montag[1], undefined);
});
