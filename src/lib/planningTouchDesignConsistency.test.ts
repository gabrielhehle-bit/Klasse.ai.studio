import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const center = readFileSync('src/components/PlanungsZentrale.tsx', 'utf8');
const weekly = readFileSync('src/components/WeeklyPlan.tsx', 'utf8');
const cards = readFileSync('src/components/wochenplan/MobileDayLessonCards.tsx', 'utf8');

test('Wochen-Check has finger-sized accessible week navigation and maintains the selected KW', () => {
  assert.match(center, /aria-label="Vorherige Kalenderwoche"/);
  assert.match(center, /aria-label="Nächste Kalenderwoche"/);
  assert.match(center, /min-h-11 min-w-11 items-center justify-center/);
  assert.match(center, /aria-label="Zur aktuellen Kalenderwoche springen"/);
  assert.match(center, /aria-expanded=\{showMehrMenu\}/);
  assert.match(center, /setApp\(p => \(\{ \.\.\.p, currentKW: getKW\(d\) \}\)\)/);
  assert.match(center, /setPage\('wochenplanung'\)/);
});

test('Schnellplanung keeps lesson or event, accessible day/hour fields and topic editing', () => {
  assert.match(center, /id="quick-plan-title"/);
  assert.match(center, /role="dialog" aria-modal="true" aria-labelledby="quick-plan-title"/);
  assert.match(center, /aria-pressed=\{quickPlanType === 'lesson'\}/);
  assert.match(center, /aria-pressed=\{quickPlanType === 'event'\}/);
  for (const field of ['day','hour','topic']) {
    assert.match(center, new RegExp('htmlFor="quick-plan-' + field + '"'));
    assert.match(center, new RegExp('id="quick-plan-' + field + '"'));
  }
  assert.match(center, /role="group" aria-labelledby="quick-plan-subject-hint"/);
  assert.match(center, /aria-pressed=\{isActive\}/);
  assert.match(center, /handleSwitchQuickSlot\(/);
  assert.match(center, /onClick=\{handleSaveLesson\}/);
  assert.match(center, /onClick=\{handleSaveQuickEvent\}/);
  assert.match(center, /aria-expanded=\{showExpandedDetailsInDrawer\}/);
  assert.match(center, /showInChildWeekPlan/);
});

test('Wochenplan day selector scrolls on small screens and retains every school day', () => {
  assert.match(weekly, /role="group" className="flex w-full min-w-0 gap-2 overflow-x-auto/);
  assert.match(weekly, /aria-label="Wochentag auswählen"/);
  assert.match(weekly, /aria-pressed=\{selectedDay === tag\}/);
  assert.match(weekly, /TAGE_NAMEN\.map\(\(tag, index\) =>/);
  assert.match(weekly, /setSelectedDay\(tag\)/);
  assert.match(weekly, /<MobileDayLessonCards/);
  assert.match(weekly, /onOpen=\{openWeeklyCell\}/);
  assert.match(weekly, /aria-expanded=\{showWeekMenu\}/);
});

test('Mobile lesson cards keep all existing actions with 44px targets', () => {
  assert.match(cards, /grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" data-weekly-day-actions/);
  assert.match(cards, /min-h-11 min-w-0 rounded-xl/);
  assert.match(cards, /onClick=\{\(\) => onOpen\(day, idx\)\}/);
  assert.match(cards, /onClick=\{\(\) => onToggleChildPlan\(day, idx\)\}/);
  assert.match(cards, /onClick=\{\(\) => onCopyLesson\(item\)\}/);
  assert.match(cards, /onClick=\{event => onToggleDone\(event, day, idx\)\}/);
  assert.match(cards, /onPark\(day, idx\)/);
  assert.match(cards, /disabled=\{!parkingPermissions\.canPark\}/);
  assert.match(cards, /parkingPermissions\.hasChildFeedback/);
});
