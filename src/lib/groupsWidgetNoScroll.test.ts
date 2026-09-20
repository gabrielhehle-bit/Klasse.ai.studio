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
  assert.match(main, /displayedGroups\.map\(\(group\)/);
  assert.match(main, /getDisplayStudentName\(student, allStudents\)/);
  assert.match(main, /group\.studentIds\.map\(\(studentId\)/);
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
