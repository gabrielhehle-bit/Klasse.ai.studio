import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { AppState } from '../types';
import { adjacentBehaviorStageId, recordClassroomBehaviorStage } from './classroomBehaviorStage';
import { collapseDailyBehaviorHistory } from './dailyBehaviorEntries';

const stages = [
  { id: '1', label: 'Super', color: 'green', icon: '🌟' },
  { id: '2', label: 'Gut', color: 'blue', icon: '❤️' },
  { id: '3', label: 'OK', color: 'gray', icon: '😐' },
  { id: '4', label: 'Achtung', color: 'yellow', icon: '⚠️' },
  { id: '5', label: 'Stopp', color: 'red', icon: '🚫' },
];

test('ein Klick ändert den bekannten Status und dokumentiert die Änderung im Schülerdossier', () => {
  const now = new Date('2026-09-20T09:30:00+02:00');
  const old = {
    activeClassId: 'class-a',
    schueler: [{ id: 's1', vorname: 'Kind A' }, { id: 's2', vorname: 'Kind B' }],
    behavior_stages: stages,
    behavior_default_stage_id: '3',
    behavior_status: { s1: '3', s2: '1' },
    behavior_notes: { s1: 'PRIVATE_COMMENT' },
    statusLog: [],
  } as unknown as AppState;
  assert.equal(adjacentBehaviorStageId(stages, '3', -1), '2');
  assert.equal(adjacentBehaviorStageId(stages, '3', 1), '4');
  assert.equal(adjacentBehaviorStageId(stages, '1', -1), null);
  assert.equal(adjacentBehaviorStageId(stages, '5', 1), null);
  const next = recordClassroomBehaviorStage(old, 's1', '2', now);
  assert.equal(next.behavior_status?.s1, '2');
  assert.equal(next.behavior_status?.s2, '1');
  assert.equal(old.behavior_status?.s1, '3', 'No mutation of existing class state');
  assert.equal(next.behavior_notes?.s1, 'PRIVATE_COMMENT', 'Private notes remain untouched');
  const today = collapseDailyBehaviorHistory(next.statusLog || [], 's1');
  assert.equal(today.length, 1);
  assert.equal(today[0].iconId, '2');
  assert.equal(today[0].datum, '2026-09-20');
  assert.equal(next.statusLog?.length, 1);
  assert.equal(recordClassroomBehaviorStage(next, 's1', '2', now), next, 'No redundant log if stage unchanged');
  assert.equal(recordClassroomBehaviorStage(next, 'unknown', '4', now), next, 'Never create logs for another pupil');
  assert.equal(recordClassroomBehaviorStage(next, 's1', 'unknown', now), next, 'Never invent a stage');
  const later = recordClassroomBehaviorStage(next, 's1', '4', new Date('2026-09-20T11:45:00+02:00'));
  assert.equal(later.statusLog?.length, 2);
  assert.equal(collapseDailyBehaviorHistory(later.statusLog || [], 's1').length, 1, 'Dossier keeps one daily status');
  assert.equal(collapseDailyBehaviorHistory(later.statusLog || [], 's1')[0].iconId, '4');
});

test('option switch is public; private behavior notes are neither shown nor sent as board text', () => {
  const widget = readFileSync('src/components/cockpit/PublicStudentListWidget.tsx', 'utf8');
  const teaching = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  assert.match(widget, /showStudentBehaviorInPluspoints === true/);
  assert.doesNotMatch(widget, /app\.behavior_notes|app\.schuelerNotizen/);
  assert.match(teaching, /Auch am Smartboard sichtbar · ohne Notizen/);
  assert.match(teaching, /recordClassroomBehaviorStage\(prev, sid, stageId\)/);
  assert.match(teaching, /max-h-\[min\(72vh,calc\(100dvh-6rem\)\)\]/);
});
