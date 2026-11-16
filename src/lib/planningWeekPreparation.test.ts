import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getPlanningWeekOverview, summarizePlanningWeekPreparation } from './planningWeekOverview';

test('empty or appointment-only week is never shown as prepared', () => {
  const empty = summarizePlanningWeekPreparation(getPlanningWeekOverview({}));
  assert.equal(empty.kind, 'no-lessons');
  assert.equal(empty.lessonCount, 0);
  assert.equal(empty.missingTopicCount, 0);
  assert.equal(empty.actionLabel, 'Stunden im Wochenplan planen');

  const appointmentOnly = summarizePlanningWeekPreparation(
    getPlanningWeekOverview({ Montag: { zeitunabhaengig: [{ thema: 'Elterngespräch' }] } }),
  );
  assert.equal(appointmentOnly.kind, 'no-lessons');
});

test('only actual saved lessons with missing topics trigger a concrete action', () => {
  const week = {
    Montag: {
      0: { fach: 'Deutsch', thema: 'Buchstaben' },
      1: { fach: 'Mathematik', thema: '  ' },
    },
    Mittwoch: { 3: { fach: 'Musik', thema: '' } },
    Freitag: { 1: { fach: '', thema: 'Should not count' } },
  };
  const before = structuredClone(week);
  const status = summarizePlanningWeekPreparation(getPlanningWeekOverview(week));
  assert.equal(status.kind, 'missing-topics');
  assert.equal(status.lessonCount, 3);
  assert.equal(status.missingTopicCount, 2);
  assert.equal(status.label, '2 Stundenthemen fehlen');
  assert.equal(status.actionLabel, 'Fehlende Themen ergänzen');
  assert.deepEqual(week, before);
});

test('entered topics never claim material readiness or completed teaching', () => {
  const status = summarizePlanningWeekPreparation(getPlanningWeekOverview({
    Montag: { 0: { fach: 'Deutsch', thema: 'Lesen', erledigt: false } },
  }));
  assert.equal(status.kind, 'topics-entered');
  assert.equal(status.lessonCount, 1);
  assert.equal(status.missingTopicCount, 0);
  assert.match(status.label, /gespeicherten Stunden/);
  assert.match(status.explanation, /nicht ob Materialien/);
});

test('planning dashboard has meaningful actions without modifying week data', () => {
  const hub = readFileSync('src/components/PlanungHub.tsx', 'utf8');
  assert.match(hub, /summarizePlanningWeekPreparation\(weekOverview\)/);
  assert.match(hub, /data-testid="planning-preparation-status"/);
  assert.match(hub, /data-planning-next-actions/);
  assert.match(hub, /preparation\.actionLabel/);
  assert.match(hub, /data-testid="planning-open-cockpit"/);
  assert.match(hub, /onClick=\{\(\) => setPage\('cockpit'\)\}/);
  assert.match(hub, /Ausgewählte Planungswoche/);
  assert.match(hub, /data-testid="planning-selected-week-handoff"/);
  assert.match(hub, /Beim Öffnen des Wochenplans bleibst du in KW/);
  assert.doesNotMatch(hub, /setApp\(/);
});
