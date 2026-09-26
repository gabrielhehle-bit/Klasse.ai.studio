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

test('Widget 2: central library gear saves defaults and applies the change to an existing instance without mixing', () => {
  assert.match(surface, /aria-label="Widget-Voreinstellungen öffnen"/);
  assert.match(surface, /<option value="groups">👥 Gruppen bilden<\/option>/);
  assert.match(surface, /data-widget-card-action="primary"/);
  assert.match(surface, /handleOpenWidgetInCockpitLayout\(primaryType as CockpitWidgetConfig\["type"\]\)/);
  assert.match(surface, /cockpitGroupDefaultsByClass/);
  assert.match(surface, /applyGroupWidgetPreference\(w.settings, groupKey, groupValue\)/);
  assert.match(surface, /Einstellungen übernommen/);
  assert.match(surface, /die bisherigen Kinder bleiben bis dahin in ihren Gruppen/);
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

test('Widget 2: all groups are accessible together in expanded view, never silently dropped by a page slice', () => {
  const groups = generateStudentGroups(
    Array.from({ length: 30 }, (_, index) => 'pupil-' + index),
    { mode: 'size', value: 2 },
  ).groups;
  const compact = getGroupPageLayout(340, 360, groups, 0);
  assert.equal(groups.length, 15);
  assert.ok(compact.pageCount > 1);
  assert.match(widget, /const displayedGroups = isExpanded/);
  assert.match(widget, /\? groupLayout\.cards/);
  assert.match(widget, /compactGroupWidget \? '⛶ Alle' : `Alle \${groups.length} Gruppen anzeigen`/);
  assert.match(widget, /if \(!preview\.fits \|\| preview\.pageCount > 1\) setIsExpanded\(true\)/);
  assert.match(widget, /isExpanded \? 'flex-none overflow-visible pb-2' : 'flex-1 overflow-hidden'/);
  assert.match(widget, /!isExpanded && groupLayout\.pageCount > 1/);
});

test('Widget 2: rapid picker updates do not get overwritten by group edits', () => {
  assert.match(widget, /only persist fields changed by this group action/i);
  const persist = widget.slice(widget.indexOf('const persistState'), widget.indexOf('// Die Auswahl kommt aus'));
  assert.doesNotMatch(persist, /mode: updatedMode|targetValue: updatedValue/);
  assert.match(persist, /\.\.\.\(persistNamingStyle \? \{ namingStyle: updatedNamingStyle \} : \{\}\)/);
  assert.match(widget, /const namingStyle: 'numbered'/);
  assert.match(widget, /setPausedStudentIds\(next\)/);
  assert.doesNotMatch(widget, /setPausedStudentIds\(prev =>/);
  assert.match(widget, /studentScope === 'all' \? allStudents : presentStudents\)\.map/);
  assert.match(surface, /w\.type === "groups" && updates\.settings/);
  assert.match(surface, /settings: \{ \.\.\.\(w\.settings \|\| \{\}\), \.\.\.updates\.settings \}/);
});
