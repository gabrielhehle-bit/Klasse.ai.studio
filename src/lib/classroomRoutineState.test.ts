import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileFairCallRound, isFairCallRoundComplete } from './classroomRoutineState';
import { normalizeLessonPhases, addCustomPhase, removePhase, getPhaseNavigationPage } from './phasesAlgorithm';

const scope = 'class-a:2026-10-11';
test('same-day fair round retains order/current/pauses across reopening and admits arrivals once', () => {
  assert.deepEqual(reconcileFairCallRound({roundScope: scope, remainingIds:['b','b'], calledIds:['a'], currentId:'a', pausedIds:['b']}, scope, ['a','b','c']),
    {remainingIds:['b','c'],calledIds:['a'],currentId:'a',pausedIds:['b'],roundScope:scope});
});
for (const nextScope of ['class-b:2026-10-11', 'class-a:2026-10-12']) test(`fair round clears historical calls and pauses in ${nextScope}`, () => {
  const next = reconcileFairCallRound({roundScope:scope,remainingIds:['b'],calledIds:['a'],currentId:'a',pausedIds:['b']}, nextScope, ['a','b']);
  assert.deepEqual(next.calledIds, []); assert.equal(next.currentId,null); assert.deepEqual(next.pausedIds,[]); assert.deepEqual(next.remainingIds,['a','b']);
});
test('deleted/absent/foreign IDs, malformed values and overlap cannot inflate a fair round', () => {
  const next = reconcileFairCallRound({roundScope:scope,remainingIds:['a','b',3,'foreign'],calledIds:['a','a',null],currentId:'foreign',pausedIds:['a','b','foreign']},scope,['a','b']);
  assert.deepEqual(next.remainingIds,['b']); assert.deepEqual(next.calledIds,['a']); assert.deepEqual(next.pausedIds,['b']); assert.equal(next.currentId,null);
});
test('paused open children do not count as called or as a finished round', () => {
  assert.equal(isFairCallRoundComplete(['a'],['b'],['a','b']),false);
  assert.equal(isFairCallRoundComplete(['a','b'],[],['a','b']),true);
  assert.equal(isFairCallRoundComplete([],[],[]),false);
});
test('legacy rounds migrate without losing a valid same-day selection', () => {
  const next = reconcileFairCallRound({remainingIds:['b'],calledIds:['a'],currentId:'a'},scope,['a','b']);
  assert.equal(next.currentId,'a'); assert.equal(next.roundScope,scope);
});
test('restored phases reject nulls, missing labels/IDs and duplicate IDs', () => {
  assert.deepEqual(normalizeLessonPhases([null,{}, {id:'x',label:' Test '},{id:'x',label:'duplicate'},{id:'blank',label:' '}]).map(p=>[p.id,p.label]),[['x','Test']]);
  assert.equal(normalizeLessonPhases([]).length,5);
});
test('adding twice in the same clock tick produces distinct navigable phases', () => {
  const old = Date.now; Date.now = () => 1000;
  try { const first=addCustomPhase([], 'A'); const second=addCustomPhase(first.updatedPhases,'B'); assert.notEqual(first.newId, second.newId); }
  finally { Date.now=old; }
});
test('deleting the active middle/end phase selects its successor/predecessor and retains a last phase', () => {
  const phases=normalizeLessonPhases([{id:'a',label:'A'},{id:'b',label:'B'},{id:'c',label:'C'}]);
  assert.equal(removePhase(phases,'b','b').newActiveId,'c');
  assert.equal(removePhase(phases,'c','c').newActiveId,'b');
  assert.equal(removePhase([phases[0]],'a','a').newActiveId,'a');
});

test('closing phase settings derives the active page immediately instead of retaining an obsolete management page', () => {
  assert.equal(getPhaseNavigationPage({scope:'b:1',page:1},'b:2',1,2,3),0);
});
test('a new active phase chooses its own page while a deliberate same-scope page survives remount', () => {
  assert.equal(getPhaseNavigationPage({scope:'a:2',page:0},'e:2',4,2,5),2);
  assert.equal(getPhaseNavigationPage({scope:'b:2',page:1},'b:2',1,2,3),1);
});
test('restored phase navigation clamps invalid and out-of-range pages', () => {
  assert.equal(getPhaseNavigationPage({scope:'b:2',page:99},'b:2',1,2,3),1);
  assert.equal(getPhaseNavigationPage({scope:'b:2',page:NaN},'b:2',1,2,3),0);
});
