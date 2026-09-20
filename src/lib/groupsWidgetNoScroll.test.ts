import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getGroupPageLayout, GROUP_WIDGET_GRID } from './groupsWidgetPages';
import { generateStudentGroups, type GeneratedGroup } from './groupsAlgorithm';

const widget = readFileSync('src/components/cockpit/widgets/GroupsWidget.tsx', 'utf8');
const surface = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');

function sampleGroups(pupils: number, targetSize: number): GeneratedGroup[] {
  const ids = Array.from({ length: pupils }, (_, index) => `synthetic-${index}`);
  return generateStudentGroups(ids, { mode: 'size', value: targetSize }).groups;
}

test('group cards: full 25-pupil 4er division is visible on large Smartboard without inner scroll', () => {
  const groups = sampleGroups(25, 4);
  assert.equal(groups.length, 6);
  const page = getGroupPageLayout(1280, 690, groups, 0);
  assert.equal(page.fits, true);
  assert.equal(page.columns, 6);
  assert.equal(page.pageCount, 1);
  assert.equal(page.start, 0);
  assert.ok(page.cardHeight >= GROUP_WIDGET_GRID.cardChromeHeight + 5 * GROUP_WIDGET_GRID.studentRowHeight);
});

test('groups: full 30-pupil class, partner work and short surfaces remain reachable by pages', () => {
  const groups = sampleGroups(30, 2);
  const page = getGroupPageLayout(1280, 690, groups, 0);
  assert.equal(page.fits, true);
  assert.ok(page.pageCount >= 2);
  assert.ok(page.pageSize < groups.length);
  const last = getGroupPageLayout(1280, 690, groups, 5000);
  assert.equal(last.page, last.pageCount - 1);
  assert.ok(last.start < groups.length);
  assert.ok(last.start + last.pageSize >= groups.length);
  assert.equal(getGroupPageLayout(340, 360, groups, 0).fits, false);
  assert.equal(getGroupPageLayout(0, 0, [], Number.NaN).fits, false);
  assert.equal(getGroupPageLayout(1280, 690, [], 0).pageCount, 1);
});

test('group content renders only complete cards, never a cropped or scrollable list of pupils', () => {
  const main = widget.slice(widget.indexOf('HAUPTBEREICH: GRUPPEN-KARTEN'), widget.indexOf('Footer Schnellübersicht'));
  assert.match(main, /!groupLayout\.fits/);
  assert.match(main, /Gruppen groß anzeigen/);
  assert.match(main, /displayedGroups\.map\(\(segment\)/);
  assert.match(main, /const group = segment\.group/);
  assert.match(main, /getDisplayStudentName\(student, allStudents\)/);
  assert.match(main, /segment\.memberIds\.map\(\(studentId\)/);
  assert.match(main, /segment\.parts > 1/);
  assert.match(main, /role="list"/);
  assert.match(main, /aria-label="Gruppenseiten"/);
  assert.match(main, /aria-label="Vorherige Gruppenseite"/);
  assert.match(main, /aria-label="Nächste Gruppenseite"/);
  assert.match(main, /min-h-\[44px\]/);
  assert.doesNotMatch(main, /overflow-y-auto|no-scrollbar|flex-grow overflow-y/);
});

test('group configuration and manual student swaps/moves are preserved across pages', () => {
  assert.match(widget, /createPortal\(/);
  assert.match(widget, /document\.getElementById\('cockpit-groups-settings-host'\)/);
  assert.match(surface, /id="cockpit-groups-settings-host"/);
  assert.match(widget, /swapStudentsInGroups/);
  assert.match(widget, /moveStudentToGroup/);
  assert.match(widget, /selectedStudentForAction && !isSourceGroupOfSelected/);
  assert.match(widget, /setGroupPage\(0\)/);
  assert.match(widget, /persistState\(/);
  assert.match(widget, /studentScope === 'all' \? allStudents : presentStudents/);
});

test('25 children in only two groups: all are visible in non-scrolling group segments', () => {
  const groups = generateStudentGroups(
    Array.from({ length: 25 }, (_, index) => `synthetic-${index}`),
    { mode: 'count', value: 2 },
  ).groups;
  const page = getGroupPageLayout(1280, 690, groups, 0);
  assert.equal(page.fits, true);
  assert.equal(groups.length, 2);
  assert.ok(page.cards.length > groups.length, 'oversized groups must split into multiple readable cards');
  const originals = groups.flatMap(group => group.studentIds).sort();
  const visible = page.cards.flatMap(card => card.memberIds).sort();
  assert.deepEqual(visible, originals);
  assert.ok(page.cards.every(card => card.memberIds.length > 0));
  assert.ok(page.cards.every(card => card.parts >= 1 && card.part >= 1 && card.part <= card.parts));
  assert.ok(page.cardHeight <= 690 - GROUP_WIDGET_GRID.reservedHeight);
  assert.ok(page.pageCount <= Math.ceil(page.cards.length / page.pageSize));
});

test('25 children in one large group remain reachable even with two pages; no grow-button loop', () => {
  const groups = generateStudentGroups(
    Array.from({ length: 25 }, (_, index) => `synthetic-${index}`),
    { mode: 'count', value: 1 },
  ).groups;
  const page = getGroupPageLayout(1280, 690, groups, 0);
  assert.equal(page.fits, true);
  assert.equal(groups.length, 1);
  assert.ok(page.cards.length >= 4);
  const last = getGroupPageLayout(1280, 690, groups, 1000);
  assert.equal(last.page, last.pageCount - 1);
  assert.deepEqual(page.cards.flatMap(segment => segment.memberIds).sort(), groups[0].studentIds.slice().sort());
  assert.equal(getGroupPageLayout(340, 360, groups, 0).fits, true);
  assert.ok(getGroupPageLayout(340, 360, groups, 0).pageCount > 1);
});
