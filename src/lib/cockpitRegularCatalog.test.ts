import assert from 'node:assert/strict';
import test from 'node:test';
import { COCKPIT_CORE_WIDGETS, COCKPIT_REGULAR_WIDGETS, getRegularCockpitGroups } from './cockpitRegularCatalog';
import { COCKPIT_WIDGET_LIBRARY_ITEMS } from './cockpitWidgetCatalog';

test('regular selection has 26 unique, available entries while retaining every legacy entry', () => {
  assert.equal(COCKPIT_REGULAR_WIDGETS.length, 26);
  assert.equal(new Set(COCKPIT_REGULAR_WIDGETS.map(group => group.id)).size, 26);
  assert.equal(COCKPIT_WIDGET_LIBRARY_ITEMS.length, 113);
  for (const group of COCKPIT_REGULAR_WIDGETS) {
    assert.ok(COCKPIT_WIDGET_LIBRARY_ITEMS.some(item => item.type === group.id));
    for (const type of group.sources) {
      assert.ok(COCKPIT_WIDGET_LIBRARY_ITEMS.some(item => item.type === type));
    }
  }
});

test('search groups old names without opening or converting saved variants', () => {
  for (const [query, id] of [
    ['Stoppuhr', 'timer'], ['Glücksrad', 'randomname'],
    ['Bruch-Kuchen', 'fractionvisualizer'], ['Zahlenstrahl', 'zahlenraum'],
    ['Rechtschreib-Detektiv', 'vocabulary'], ['Satzbau', 'wortsatzwerkstatt'],
    ['Klassen-Klavier', 'sounds'], ['Waldtiere', 'waldruhe'],
  ]) {
    assert.deepEqual(getRegularCockpitGroups('core', query).map(group => group.id), [id]);
  }
  assert.deepEqual(getRegularCockpitGroups('core', 'Zahnputz').map(group => group.id), ['toothbrush']);
  assert.deepEqual(getRegularCockpitGroups('mathe', 'Wasserkreislauf').map(group => group.id), ['watercycle']);
});

test('six core cards start with attendance and Waldruhe', () => {
  assert.deepEqual(COCKPIT_CORE_WIDGETS.map(group => group.id), [
    'kidattendance', 'waldruhe', 'timeline', 'instruction', 'timer', 'groups',
  ]);
  assert.deepEqual(getRegularCockpitGroups('core', '   '), COCKPIT_CORE_WIDGETS);
});

test('subject categories cover every catalog type once across their grouped entries', () => {
  const categories = [...new Set(COCKPIT_WIDGET_LIBRARY_ITEMS.map(item => item.category))];
  const groups = categories.flatMap(category => getRegularCockpitGroups(category));
  assert.equal(new Set(groups.map(group => group.id)).size, groups.length);
  const types = groups.flatMap(group => group.sources);
  assert.equal(types.length, COCKPIT_WIDGET_LIBRARY_ITEMS.length);
  assert.deepEqual(new Set(types), new Set(COCKPIT_WIDGET_LIBRARY_ITEMS.map(item => item.type)));
  assert.deepEqual(getRegularCockpitGroups('mathe', 'Hausübungen').map(group => group.id), ['homework']);
});
