import assert from 'node:assert/strict';
import test from 'node:test';
import { COCKPIT_ARCHIVED_WIDGETS, COCKPIT_TEACHING_WIDGET_SECTIONS, COCKPIT_CORE_WIDGETS, COCKPIT_REGULAR_WIDGETS, getCockpitGroupsForTypes, getRegularCockpitGroups, isCockpitTeachingBoardWidget } from './cockpitRegularCatalog';
import { COCKPIT_WIDGET_LIBRARY_ITEMS, matchesCockpitWidgetSearch } from './cockpitWidgetCatalog';

test('favorites and history group supported variants once and omit retired tools', () => {
  assert.deepEqual(getCockpitGroupsForTypes([
    'clock', 'timer', 'spellingdetective', 'vocabulary', 'fractionvisualizer', 'toothbrush', 'removed-widget',
  ]).map(group => group.id), ['timer', 'vocabulary']);
});

test('grouped variants and uncurated widgets keep their original library entries', () => {
  assert.equal(new Set(COCKPIT_REGULAR_WIDGETS.map(group => group.id)).size, COCKPIT_REGULAR_WIDGETS.length);
  assert.equal(COCKPIT_WIDGET_LIBRARY_ITEMS.length, 113);
  for (const group of COCKPIT_REGULAR_WIDGETS) {
    assert.ok(COCKPIT_WIDGET_LIBRARY_ITEMS.some(item => item.type === group.id));
    for (const type of group.sources) {
      assert.ok(COCKPIT_WIDGET_LIBRARY_ITEMS.some(item => item.type === type));
    }
  }
});

test('retired types belong only to the archive; the integrated tools stay on the board', () => {
  assert.equal(COCKPIT_ARCHIVED_WIDGETS.length, 91);
  assert.deepEqual(
    COCKPIT_WIDGET_LIBRARY_ITEMS.filter(item => isCockpitTeachingBoardWidget(item.type)).map(item => item.type).sort(),
    [...COCKPIT_REGULAR_WIDGETS.map(group => group.id), 'randomname', 'pet'].sort(),
  );
  for (const type of ['clock', 'stopwatch', 'trafficlight', 'noisemeter', 'wheel', 'faircall', 'toothbrush']) {
    assert.ok(COCKPIT_ARCHIVED_WIDGETS.some(item => item.type === type), type);
  }
});

test('search groups old names without opening or converting saved variants', () => {
  for (const [query, id] of [
    ['Stoppuhr', 'timer'], ['Glücksrad', 'groups'],
    ['Zahlenstrahl', 'zahlenraum'], ['Lernwörter', 'vocabulary'], ['Waldtiere', 'waldruhe'],
    ['Klassen-Klavier', 'sounds'], ['Wasserkreislauf', 'watercycle'], ['Tafel-Würfel', 'dice'],
  ]) {
    assert.deepEqual(getRegularCockpitGroups('core', query).map(group => group.id), [id]);
  }
  assert.deepEqual(getRegularCockpitGroups('core', 'Zahnputz'), []);
  assert.deepEqual(COCKPIT_WIDGET_LIBRARY_ITEMS.filter(item => matchesCockpitWidgetSearch(item, 'Zahnputz')).map(item => item.type), ['toothbrush']);
  for (const query of ['Bruch-Kuchen', 'Blitz-Reaktions-Trainer']) {
    assert.deepEqual(getRegularCockpitGroups('mathe', query), [], query);
  }
});

test('search results open the requested tool mode inside the integrated widget', () => {
  for (const [query, type, mode, label] of [
    ['Stoppuhr', 'timer', 'stopwatch', 'Stoppuhr'],
    ['Stoppu', 'timer', 'stopwatch', 'Stoppuhr'],
    ['Stop Uhr', 'timer', 'stopwatch', 'Stoppuhr'],
    ['Countdown', 'timer', 'timer', 'Timer'],
    ['Uhrzeit', 'timer', 'clock', 'Uhrzeit'],
    ['Glücksrad', 'randomname', 'wheel', 'Glücksrad'],
    ['gluecksrad', 'randomname', 'wheel', 'Glücksrad'],
    ['Faire Runde', 'randomname', 'fair', 'Faire Runde'],
    ['fair-call', 'randomname', 'fair', 'Faire Runde'],
    ['Namen ziehen', 'randomname', 'names', 'Namen ziehen'],
  ]) {
    const result = getRegularCockpitGroups('core', query).find(group => group.id === (type === 'randomname' ? 'groups' : type));
    assert.deepEqual(result?.openMode, { type, mode, label }, query);
  }
  assert.ok(COCKPIT_CORE_WIDGETS.every(group => group.openMode === undefined));
  assert.equal(getRegularCockpitGroups('core', 'Zufallsauswahl')[0]?.openMode?.mode, 'names');
});

test('six core cards start with attendance and Waldruhe', () => {
  assert.deepEqual(COCKPIT_CORE_WIDGETS.map(group => group.id), [
    'kidattendance', 'waldruhe', 'timeline', 'instruction', 'timer', 'groups',
  ]);
  assert.deepEqual(getRegularCockpitGroups('core', '   '), COCKPIT_CORE_WIDGETS);
});

test('classroom and subject categories show a short, distinct teaching selection', () => {
  const categories = COCKPIT_TEACHING_WIDGET_SECTIONS.map(section => section.id);
  assert.deepEqual(categories, ['core', 'classroom', 'mathe', 'deutsch', 'sachunterricht', 'musik', 'play']);
  const groups = categories.flatMap(category => getRegularCockpitGroups(category));
  assert.equal(groups.length, 20);
  assert.equal(new Set(groups.map(group => group.id)).size, groups.length);
  assert.deepEqual(getRegularCockpitGroups('classroom').map(group => group.id), [
    'tischcheck', 'classweeklyplan', 'homework', 'dienste', 'image', 'qrcode',
  ]);
  assert.deepEqual(getRegularCockpitGroups('mathe').map(group => group.id), ['zahlenraum', 'kopfrechnen']);
  assert.deepEqual(getRegularCockpitGroups('deutsch').map(group => group.id), ['vocabulary', 'wortsatzwerkstatt']);
  assert.deepEqual(getRegularCockpitGroups('sachunterricht').map(group => group.id), ['compass', 'watercycle']);
  assert.deepEqual(getRegularCockpitGroups('musik').map(group => group.id), ['sounds']);
  assert.deepEqual(getRegularCockpitGroups('play').map(group => group.id), ['dice']);
  assert.ok(groups.every(group => group.sources.every(type => COCKPIT_WIDGET_LIBRARY_ITEMS.some(item => item.type === type))));
  assert.deepEqual(getRegularCockpitGroups('mathe', 'Hausübungen').map(group => group.id), ['homework']);
});
