import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyGroupWidgetPreference, getGroupWidgetPreferences } from './groupWidgetPreferences';
import { generateStudentGroups } from './groupsAlgorithm';

const src = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const groupWidget = readFileSync('src/components/cockpit/widgets/GroupsWidget.tsx', 'utf8');

const ids = Array.from({ length: 17 }, (_, i) => 'synthetic-'+i);
const groups = generateStudentGroups(ids, { mode: 'size', value: 4, namingStyle: 'numbered' }).groups;
const original = {
  studentScope: 'present', mode: 'size', targetValue: 4, namingStyle: 'numbered', startSize: 'large',
  pausedStudentIds: ['synthetic-16'],
  notTogether: [{ studentIdA: 'synthetic-0', studentIdB: 'synthetic-1' }],
  keepTogether: [{ studentIdA: 'synthetic-2', studentIdB: 'synthetic-3' }],
  groups,
};

test('changing group size and count changes next draw settings while keeping all current members', () => {
  let changed = applyGroupWidgetPreference(original, 'targetValue', 3);
  assert.equal(changed.mode, 'size');
  assert.equal(changed.targetValue, 3);
  assert.deepEqual(changed.groups, original.groups);
  assert.deepEqual(changed.keepTogether, original.keepTogether);
  assert.deepEqual(changed.notTogether, original.notTogether);
  assert.deepEqual(changed.pausedStudentIds, original.pausedStudentIds);
  changed = applyGroupWidgetPreference(changed, 'mode', 'count');
  assert.equal(changed.mode, 'count');
  assert.equal(changed.targetValue, 4, 'switching count/size uses a visible valid selection');
  assert.deepEqual(changed.groups, original.groups);
  const next = generateStudentGroups(
    ids.filter(id => !changed.pausedStudentIds.includes(id)),
    { mode: changed.mode, value: changed.targetValue },
  );
  assert.equal(next.groups.length, 4, 'newly generated groups use the changed count');
  assert.equal(original.mode, 'size', 'original backup settings are unchanged');
});

test('selecting all/present takes effect on existing widget without clearing membership or pair rules', () => {
  const updated = applyGroupWidgetPreference(original, 'studentScope', 'all');
  assert.equal(updated.studentScope, 'all');
  assert.deepEqual(updated.groups, groups);
  assert.deepEqual(updated.notTogether, original.notTogether);
  assert.deepEqual(updated.keepTogether, original.keepTogether);
  assert.deepEqual(updated.pausedStudentIds, original.pausedStudentIds);
});

test('changing group names immediately only relabels groups and preserves children, identity and private rules', () => {
  const updated = applyGroupWidgetPreference(original, 'namingStyle', 'animals');
  assert.equal(updated.namingStyle, 'animals');
  assert.notEqual(updated.groups[0].name, groups[0].name);
  assert.deepEqual(updated.groups.map((g: typeof groups[number]) => g.studentIds), groups.map(g => g.studentIds));
  assert.deepEqual(updated.groups.map((g: typeof groups[number]) => g.id), groups.map(g => g.id));
  assert.deepEqual(updated.notTogether, original.notTogether);
  assert.deepEqual(updated.keepTogether, original.keepTogether);
});

test('initial widget size is a new-instance preset, never resizes or clears an existing widget', () => {
  const result = applyGroupWidgetPreference(original, 'startSize', 'compact');
  assert.strictEqual(result, original);
  assert.equal(getGroupWidgetPreferences({ startSize: 'compact' }).startSize, 'compact');
});

test('picker updates both class defaults and the open class widget without extra apply click', () => {
  assert.match(src, /setCockpitWidgets\(current => current.map\(updateExistingGroup\)\)/);
  assert.match(src, /cockpitLayout: \(prev.cockpitLayout \|\| cockpitWidgets\).map\(updateExistingGroup\)/);
  assert.match(src, /cockpitGroupDefaultsByClass/);
  assert.match(src, /applyGroupWidgetPreference\(w.settings, groupKey, groupValue\)/);
  assert.match(src, /key === "mode" \? \{ targetValue: 4 \} : \{\}/);
  assert.match(src, /Gruppennamen werden sofort angepasst/);
  assert.match(groupWidget, /const mode: GroupingMode = savedSettings\.mode === 'count' \? 'count' : 'size'/);
  assert.match(groupWidget, /const targetValue = typeof savedSettings\.targetValue/);
  assert.doesNotMatch(groupWidget, /setMode\(|setTargetValue\(/);
});

test('group settings chosen before the very first add are not masked by old hidden defaults', () => {
  const source = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  assert.match(source, /type === "groups" &&[\s\S]{0,80}Array\.isArray\(targetWidget\.settings\?\.groups\) &&[\s\S]{0,80}targetWidget\.settings\.groups\.length > 0/);
  assert.match(source, /type === "groups" && !useOld[\s\S]{0,120}groupPreset/);
  assert.match(source, /type === "groups" \? groupStartSize\.w/);
  assert.match(source, /type === "groups" \? groupStartSize\.h/);
});
