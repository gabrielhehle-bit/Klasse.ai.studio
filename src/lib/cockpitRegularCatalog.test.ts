import assert from 'node:assert/strict';
import test from 'node:test';
import { COCKPIT_REGULAR_WIDGETS, getRegularCockpitGroups } from './cockpitRegularCatalog';
import { COCKPIT_WIDGET_LIBRARY_ITEMS } from './cockpitWidgetCatalog';

test('regular selection has 25 unique, available entries while retaining every legacy entry', () => {
  assert.equal(COCKPIT_REGULAR_WIDGETS.length, 25);
  assert.equal(new Set(COCKPIT_REGULAR_WIDGETS.map(group => group.id)).size, 25);
  assert.equal(COCKPIT_WIDGET_LIBRARY_ITEMS.length, 112);
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
    ['Klassen-Klavier', 'sounds'],
  ]) {
    assert.deepEqual(getRegularCockpitGroups('core', query).map(group => group.id), [id]);
  }
  assert.equal(getRegularCockpitGroups('core', 'Zahnputz').length, 0);
  assert.ok(COCKPIT_WIDGET_LIBRARY_ITEMS.some(item => item.type === 'toothbrush'));
});

test('regular categories partition the same selection and global search crosses categories', () => {
  const categories = [...new Set(COCKPIT_WIDGET_LIBRARY_ITEMS.map(item => item.category))];
  const ids = categories.flatMap(category => getRegularCockpitGroups(category).map(group => group.id));
  assert.equal(ids.length, 25);
  assert.equal(new Set(ids).size, 25);
  assert.deepEqual(getRegularCockpitGroups('mathe', 'Hausübungen').map(group => group.id), ['homework']);
  assert.equal(getRegularCockpitGroups('core', '   ').length, 25);
});
