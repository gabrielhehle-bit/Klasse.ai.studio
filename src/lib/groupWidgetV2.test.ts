import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getGroupWidgetPreferences } from './groupWidgetPreferences';
import { generateStudentGroups } from './groupsAlgorithm';
import { getGroupPageLayout } from './groupsWidgetPages';

const widget = readFileSync('src/components/cockpit/widgets/GroupsWidget.tsx', 'utf8');
const surface = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');

test('Widget 2: 17 real class IDs in 4er groups fit together on a moderately large teaching surface', () => {
  const groups = generateStudentGroups(
    Array.from({ length: 17 }, (_, index) => 'synthetic-' + index),
    { mode: 'size', value: 4 },
  ).groups;
  const layout = getGroupPageLayout(960, 520, groups, 0);
  assert.equal(groups.length, 4);
  assert.equal(layout.fits, true);
  assert.equal(layout.pageCount, 1);
  assert.deepEqual(layout.cards.flatMap(card => card.memberIds).sort(),
    groups.flatMap(group => group.studentIds).sort());
});

test('Widget 2: old or invalid stored presets use safe class-local defaults', () => {
  assert.deepEqual(getGroupWidgetPreferences(null), {
    studentScope: 'present', mode: 'size', targetValue: 4,
    startSize: 'large', namingStyle: 'numbered',
  });
  assert.deepEqual(getGroupWidgetPreferences({
    studentScope: 'all', mode: 'count', targetValue: 3,
    startSize: 'compact', namingStyle: 'animals',
  }), {
    studentScope: 'all', mode: 'count', targetValue: 3,
    startSize: 'compact', namingStyle: 'animals',
  });
  assert.equal(getGroupWidgetPreferences({ targetValue: -90, startSize: 'bad' }).targetValue, 2);
});

test('Widget 2: dedicated gear saves defaults without replacing the existing instance', () => {
  assert.match(surface, /aria-label="Gruppen bilden einstellen"/);
  assert.match(surface, /aria-label="Gruppen bilden hinzufügen"/);
  assert.match(surface, /cockpitGroupDefaultsByClass/);
  assert.match(surface, /Voreinstellungen auf vorhandenes Widget anwenden/);
  assert.match(surface, /Bestehende Gruppen werden nicht ungefragt neu gemischt/);
  assert.match(surface, /groups: previousGroups\.map/);
  assert.match(surface, /type === "groups" && !useOld/);
});

test('Widget 2: enlarging is local; editing names does not rerandomize student groups', () => {
  assert.match(widget, /isExpanded \? createPortal\(/);
  assert.match(widget, /Zurück zur Widgetgröße/);
  assert.match(widget, /setIsExpanded\(true\)/);
  assert.doesNotMatch(widget, /onUpdate\?\.\(\{ x: 2, y: 2, w: 96, h: 90 \}\)/);
  const style = widget.slice(widget.indexOf('Tab 3: Namen & Stil'), widget.indexOf('HAUPTBEREICH: GRUPPEN-KARTEN'));
  assert.match(style, /getGroupName\(index, nextStyle\)/);
  assert.doesNotMatch(style, /handleGenerate\(mode, targetValue\)/);
});

test('Widget 2: undo, stored constraints, and private pair settings remain available', () => {
  assert.match(widget, /Vorherige Gruppeneinteilung wiederhergestellt/);
  assert.match(widget, /persistState\(groups, mode, targetValue, \[\]/);
  assert.match(widget, /persistState\(groups, mode, targetValue, pausedStudentIds, updated, keepTogether, namingStyle\)/);
  assert.match(widget, /persistState\(groups, mode, targetValue, pausedStudentIds, notTogether, updated, namingStyle\)/);
  assert.match(widget, /pairRulesAcknowledged/);
  assert.match(widget, /window\.confirm\(/);
  assert.match(widget, /widget\?\.settings\?\.groups/);
});