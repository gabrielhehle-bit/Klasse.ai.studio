import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PLANNED_COCKPIT_WIDGETS, getPlannedCockpitWidgetForLegacyType } from '../components/cockpit/plannedCockpitCatalog';
import { COCKPIT_QUICKBAR_ITEMS, normalizeCockpitQuickbarSettings } from './cockpitQuickbar';

const source = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const panel = readFileSync('src/components/cockpit/PublicStudentListWidget.tsx', 'utf8');

test('Retired floating studentlist cannot be opened via core, catalogue, quickbar or old visible layout', () => {
  assert.equal(PLANNED_COCKPIT_WIDGETS.some(item => String(item.id) === 'studentlist'), false);
  assert.equal(getPlannedCockpitWidgetForLegacyType('studentlist'), null);
  assert.equal(COCKPIT_QUICKBAR_ITEMS.some(item => String(item.id) === 'studentlist'), false);
  assert.deepEqual(normalizeCockpitQuickbarSettings({ enabled: true, itemIds: ['studentlist', 'timer'] }).itemIds, ['timer']);
  assert.doesNotMatch(source, /type: "studentlist", label: "⭐ Schülerliste"/);
  assert.doesNotMatch(source, /\{ type: "studentlist", category: "interactivity" \}/);
  assert.match(source, /if \(type === "studentlist"\) return;/);
  assert.match(source, /visible: w\.type === "studentlist" \? false : !!w\.visible/);
  // The retired studentlist stays out of the visible widget map. Minimized widgets,
  // however, remain mounted so their local state survives restore.
  assert.match(source, /\.filter\(\(w\) => w\.visible && w\.type !== "studentlist"\)/);
  assert.match(source, /!minimizedWidgetIds\.includes\(candidate\.id\)/);
  assert.doesNotMatch(source, /case "studentlist":/);
});

test('Existing student sidebar keeps pluspoint actions, names and classes; legacy backups remain parseable', () => {
  assert.match(source, /PublicStudentListWidget as StudentListWidgetContent/);
  const sidebar = source.slice(source.indexOf('sidebarMode === "expanded"'), source.indexOf('FOKUS BOTTOM DOCK'));
  assert.match(sidebar, /<StudentListWidgetContent/);
  assert.match(sidebar, /getTodayPoints=\{sidebarParticipationKind === "social" \? sid => getSocialStars\(app, sid\) : getTodayPoints\}/);
  assert.match(sidebar, /addParticipation=\{sidebarParticipationKind === "social" \? addSocialParticipation : addParticipation\}/);
  assert.match(sidebar, /removeParticipation=\{sidebarParticipationKind === "social" \? removeSocialParticipation : removeParticipation\}/);
  assert.match(panel, /app\.activeClassId/);
  const known = source.slice(source.indexOf('const knownTypes = ['), source.indexOf('];', source.indexOf('const knownTypes = [')));
  assert.match(known, /"studentlist"/);
  assert.match(source, /id: "widget-studentlist"/);
});
