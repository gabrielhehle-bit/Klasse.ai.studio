import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CLASSROOM_QUIZ, normalizeQuizSession, quizAnswerFeedback } from './classroomQuizSession';

test('quiz restores the answer with its exact question and retains a topic draft', () => {
  const s = normalizeQuizSession({item:DEFAULT_CLASSROOM_QUIZ,selected:2,customTopic:'Wald',category:'Tiere',difficulty:'Schwer',configuring:true});
  assert.equal(s.questionDifficulty,'Mittel');
  assert.equal(s.difficulty,'Schwer');
  assert.equal(s.selected,2); assert.equal(s.customTopic,'Wald'); assert.equal(s.configuring,true);
  assert.equal(quizAnswerFeedback(s.item,s.selected),'Die richtige Antwort ist: Elefant.');
});
test('quiz rejects an answer attached to an invalid question rather than grading the fallback', () => {
  const s = normalizeQuizSession({item:{q:'invalid'},selected:0},DEFAULT_CLASSROOM_QUIZ);
  assert.equal(s.selected,null); assert.equal(quizAnswerFeedback(s.item,s.selected),'');
});
test('quiz validates saved answer indices and malformed settings', () => {
  for (const selected of [-1,4,1.5,'1',null]) assert.equal(normalizeQuizSession({item:DEFAULT_CLASSROOM_QUIZ,selected}).selected,null);
  assert.equal(normalizeQuizSession(null).difficulty,'Mittel');
  assert.equal(normalizeQuizSession({difficulty:'unknown',customTopic:42}).customTopic,'');
});
test('legacy quiz questions migrate without inventing a prior answer', () => {
  const s=normalizeQuizSession({}, {...DEFAULT_CLASSROOM_QUIZ,a:3},'Leicht');
  assert.equal(s.item.a,3); assert.equal(s.difficulty,'Leicht'); assert.equal(s.selected,null);
});
test('quiz correct feedback follows actual shuffled answer position', () => {
  const item={...DEFAULT_CLASSROOM_QUIZ,a:2 as const,o:['Giraffe','Nilpferd','Elefant','Nashorn'] as [string,string,string,string]};
  assert.equal(quizAnswerFeedback(item,2),'Richtig gelöst!');
  assert.equal(quizAnswerFeedback(item,0),'Die richtige Antwort ist: Elefant.');
});
