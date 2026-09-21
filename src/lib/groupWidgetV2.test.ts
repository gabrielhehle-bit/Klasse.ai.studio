import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getGroupWidgetPreferences, applyGroupPreferenceToInstance } from './groupWidgetPreferences';
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
  const measuredContent = getGroupPageLayout(960, 420, groups, 0, { reservedHeight: 76 });
  assert.equal(measuredContent.fits, true);
  assert.equal(measuredContent.pageCount, 1);
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
  assert.match(surface, /if \(selectedWidgetConfiguration === "groups" && configured\.visible && key !== "startSize"\)/);
  assert.match(surface, /applyGroupPreferenceToInstance\(/);
  assert.match(surface, /Vorhandene Gruppen bleiben erhalten/);
  assert.match(surface, /type === "groups" && !useOld/);
});

test('Widget 2: enlarging is local; editing names does not rerandomize student groups', () => {
  assert.match(widget, /isExpanded \? createPortal\(/);
  assert.match(widget, /Zurück zur Widgetgröße/);
  assert.match(widget, /setIsExpanded\(true\)/);
  assert.match(widget, /groupBodySize\.height/);
  assert.match(widget, /ref=\{groupBodyRef\}/);
  assert.doesNotMatch(widget, /size\.height - \(feedbackMessage/);
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

test('Widget 2: gear applies grouping mode and size immediately without reshuffling established pupil IDs', () => {
  const original = {
    mode: 'size', targetValue: 4, studentScope: 'present',
    groups: [
      { id: 'first', name: 'Gruppe 1', colorIndex: 0, studentIds: ['a', 'b'] },
      { id: 'second', name: 'Gruppe 2', colorIndex: 1, studentIds: ['c', 'd'] },
    ],
    pausedStudentIds: ['e'],
    notTogether: [{ studentIdA: 'a', studentIdB: 'c' }],
    keepTogether: [],
  };
  const counted = applyGroupPreferenceToInstance(original, 'mode', 'count');
  const three = applyGroupPreferenceToInstance(counted, 'targetValue', 3);
  assert.equal(three.mode, 'count');
  assert.equal(three.targetValue, 3);
  assert.deepEqual(three.groups, original.groups);
  assert.deepEqual(three.pausedStudentIds, ['e']);
  assert.deepEqual(three.notTogether, original.notTogether);
  const named = applyGroupPreferenceToInstance(three, 'namingStyle', 'animals');
  assert.notEqual(named.groups[0].name, original.groups[0].name);
  assert.deepEqual(named.groups.map(group => group.studentIds), original.groups.map(group => group.studentIds));
  assert.deepEqual(original.groups.map(group => group.name), ['Gruppe 1', 'Gruppe 2']);
  const eligible = applyGroupPreferenceToInstance(named, 'studentScope', 'all');
  assert.equal(eligible.studentScope, 'all');
  assert.deepEqual(eligible.groups.map(group => group.studentIds), original.groups.map(group => group.studentIds));
  assert.match(widget, /const mode: GroupingMode = savedSettings\.mode === 'count'/);
  assert.match(widget, /const targetValue = typeof savedSettings\.targetValue/);
  assert.doesNotMatch(widget, /setTargetValue\(|setMode\(/);
});
