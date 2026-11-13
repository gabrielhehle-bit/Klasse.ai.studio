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
  assert.match(mobile, /summarizeChildTaskProgress\(/);
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

test('Mobiler Wochenplan: veröffentlichte oder rückgemeldete Stunden zeigen eine gesperrte Parkfunktion', () => {
  assert.match(mobile, /getMobileWeeklyLessonPermissions\(/);
  assert.match(mobile, /students: app\.schueler \|\| \[\]/);
  assert.match(mobile, /data-weekly-mobile-parking-explanation/);
  assert.match(mobile, /data-weekly-mobile-park/);
  assert.match(mobile, /disabled=\{!parkingPermissions\.canPark\}/);
  assert.match(mobile, /if \(!parkingPermissions\.canPark\) return/);
  assert.match(mobile, /Kinder-Rückmeldungen sind für diese Stunde gespeichert/);
  assert.match(mobile, /title=\{parkingReason \|\|/);
  assert.doesNotMatch(mobile, /onClick=\{\(\) => onPark\(day, idx\)\}/);
});

test('Mobile Kinderaufgaben zeigen einen zugänglichen Fortschrittsbalken und offene Hilferufe', () => {
  assert.match(mobile, /data-weekly-mobile-child-progress/);
  assert.match(mobile, /isPublished && childProgress/);
  assert.match(mobile, /role="progressbar"/);
  assert.match(mobile, /aria-valuemin=\{0\}/);
  assert.match(mobile, /aria-valuenow=\{childProgress\.done\}/);
  assert.match(mobile, /aria-valuemax=\{childProgress\.total\}/);
  assert.match(mobile, /childProgress\.percentage/);
  assert.match(mobile, /data-weekly-mobile-help-needed/);
  assert.match(mobile, /childProgress\.helpNeeded > 0/);
  assert.doesNotMatch(mobile, /getChildTaskProgress\(/);
});

test('Hilferuf-Namen bleiben bis zur bewussten Lehrer-Aktion zugeklappt', () => {
  assert.match(mobile, /getPendingChildHelpRequests\(/);
  assert.match(mobile, /isPublished && childProgress\?\.helpNeeded/);
  assert.match(mobile, /<details data-weekly-mobile-help-details/);
  assert.match(mobile, /<summary data-weekly-mobile-help-needed/);
  assert.match(mobile, /data-weekly-mobile-help-children/);
  assert.match(mobile, /pendingHelp\.map\(child =>/);
  assert.match(mobile, /key=\{child\.studentId\}/);
  assert.match(mobile, /\{child\.displayName\}/);
  assert.doesNotMatch(mobile, /<details data-weekly-mobile-help-details\s+open/);
  assert.match(mobile, /min-h-11 cursor-pointer/);
});

test('Tagesübersicht zeigt ausschließlich aggregierten Hilfebedarf mit erreichbarerer Stunde', () => {
  assert.match(mobile, /summarizeDailyPendingHelp\(dayPlan, students, app\.schuljahr \|\| '', activeKW, day\)/);
  assert.match(mobile, /dailyHelp\.requests > 0/);
  assert.match(mobile, /data-weekly-mobile-help-overview/);
  assert.match(mobile, /aria-label="Offene Hilferufe dieses Schultages"/);
  assert.match(mobile, /dailyHelp\.children/);
  assert.match(mobile, /dailyHelp\.lessons/);
  assert.match(mobile, /dailyHelp\.slots\.map\(slot =>/);
  assert.match(mobile, /data-weekly-mobile-help-shortcut/);
  assert.match(mobile, /card\?\.scrollIntoView/);
  assert.match(mobile, /card\?\.focus/);
  assert.match(mobile, /tabIndex=\{-1\} data-weekly-day-card/);
});

test('Wochentage zeigen Hilferuf-Zahlen ohne Namen; ohne Hilferuf gibt es kein Badge', () => {
  assert.match(weekly, /const visibleWeekPupils = \(app\.schueler \|\| \[\]\)\.filter\(student => !student\.id\.startsWith\('demo-'\)\)/);
  assert.match(weekly, /const pendingHelpCount = summarizeDailyPendingHelp\(/);
  assert.match(weekly, /plan\?\.\[tag\], visibleWeekPupils, app\.schuljahr \|\| '', activeKW, tag/);
  assert.match(weekly, /pendingHelpCount > 0 && \(/);
  assert.match(weekly, /data-weekly-day-help-count aria-hidden="true"/);
  assert.match(weekly, /\{pendingHelpCount\} Hilfe/);
  assert.match(weekly, /aria-label=\{\x60[^\x60]*?pendingHelpCount/);
  assert.match(weekly, /setSelectedDay\(tag\)/);
});
