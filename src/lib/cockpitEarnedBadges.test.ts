import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getCockpitEarnedBadges } from './cockpitEarnedBadges';
import { DEFAULT_COCKPIT_SIDEBAR_WIDTH, COMPACT_COCKPIT_SIDEBAR_WIDTH, getCockpitSidebarPreferredWidth, clampCockpitSidebarWidth } from './cockpitSidebarLayout';
import { getCompactStudentGridLayout } from './studentWidgetGrid';

const badges = [
  { id: 'a', name: 'Leseratte', icon: '📚', date: '2026-11-10', visibleInCockpit: true },
  { id: 'b', name: 'Zahlenprofi', icon: '🏆', date: '2026-11-11', visibleInCockpit: true },
  { id: 'c', name: 'Teamgeist', icon: '🤝', date: '2026-11-12', visibleInCockpit: true },
  { id: 'private', name: 'Nicht öffentlich', icon: '🔒', date: '2026-11-13', visibleInCockpit: false },
  { id: 'social-stars-10', name: 'Automatische Sterne', icon: '⭐', date: '2026-11-14', visibleInCockpit: true },
];

test('Verdiente Badges werden nur bei aktivem Schalter gezeigt, keine versteckten und automatischen', () => {
  const student = { badges };
  assert.deepEqual(getCockpitEarnedBadges(student, false).visible, []);
  assert.equal(getCockpitEarnedBadges(student, false).more, 0);
  const shown = getCockpitEarnedBadges(student, true, 2);
  assert.deepEqual(shown.visible.map(item => item.name), ['Leseratte', 'Zahlenprofi']);
  assert.equal(shown.more, 1);
  assert.deepEqual(shown.remainingNames, ['Teamgeist']);
  assert.equal(getCockpitEarnedBadges(student, true, 3).more, 0);
  assert.equal(getCockpitEarnedBadges({ badges: undefined }, true).visible.length, 0);
});

test('Schmalere Seitenleiste bewahrt benutzerdefinierte Breiten und kann 16 Kinder zweispaltig zeigen', () => {
  assert.equal(DEFAULT_COCKPIT_SIDEBAR_WIDTH, 304);
  assert.equal(COMPACT_COCKPIT_SIDEBAR_WIDTH, 292);
  assert.equal(getCockpitSidebarPreferredWidth(undefined), 304);
  assert.equal(getCockpitSidebarPreferredWidth(420), 304);
  assert.equal(getCockpitSidebarPreferredWidth(380), 380);
  assert.equal(clampCockpitSidebarWidth(190), 292);
  const grid = getCompactStudentGridLayout(304, 520, 16);
  assert.equal(grid.columns, 2);
  assert.equal(grid.rows, 8);
  assert.equal(grid.fits, true);
});

test('Badge-Umschalter verändert nur Anzeigeeinstellungen, nicht Punktespeicherung', () => {
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  const list = readFileSync('src/components/cockpit/PublicStudentListWidget.tsx', 'utf8');
  assert.match(cockpit, /aria-label=\{app\.boardSettings\?\.showEarnedBadgesInCockpit === true \? "Verdiente Badges ausblenden" : "Verdiente Badges anzeigen"\}/);
  assert.match(cockpit, /showEarnedBadgesInCockpit: event\.target\.checked/);
  assert.match(list, /getCockpitEarnedBadges\(student, showEarnedBadges,/);
  assert.match(list, /data-earned-badge/);
  assert.match(cockpit, /addParticipation=\{sidebarParticipationKind === "social" \? addSocialParticipation : addParticipation\}/);
});
