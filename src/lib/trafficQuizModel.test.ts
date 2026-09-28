import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_TRAFFIC_QUIZ_SETTINGS,
  TRAFFIC_QUIZ_QUESTIONS,
  createTrafficExam,
  createTrafficPracticeQuestion,
  filterTrafficQuizQuestions,
  hasPassedTrafficPracticeExam,
  normalizeTrafficQuizSettings,
} from './trafficQuizModel';

test('Fahrradtrainer enthält nur eindeutige geprüfte Fragen', () => {
  assert.equal(TRAFFIC_QUIZ_QUESTIONS.length, 16);
  assert.equal(new Set(TRAFFIC_QUIZ_QUESTIONS.map(question => question.id)).size, 16);
  assert.ok(TRAFFIC_QUIZ_QUESTIONS.every(question => question.options.length === 3));
  assert.ok(TRAFFIC_QUIZ_QUESTIONS.every(question => question.answerIndex >= 0 && question.answerIndex <= 2));
  assert.ok(TRAFFIC_QUIZ_QUESTIONS.every(question => question.source.trim().length > 0));
});

test('österreichische Begriffe verwenden Vorrang statt Vorfahrt', () => {
  const text = JSON.stringify(TRAFFIC_QUIZ_QUESTIONS);
  assert.doesNotMatch(text, /Vorfahrt|Vorfahrtsstraße/i);
  assert.match(text, /VORRANG GEBEN/);
  assert.match(text, /VORRANGSTRASSE/);
});

test('Kreisverkehr wird in Österreich nicht pauschal falsch erklärt', () => {
  const question = TRAFFIC_QUIZ_QUESTIONS.find(item => item.id === 'roundabout');
  assert.ok(question);
  assert.equal(question!.answerIndex, 0);
  assert.match(question!.options[0], /Beschilderung entscheidet/);
  assert.match(question!.explanation, /Rechtsregel/);
  assert.doesNotMatch(question!.explanation, /immer.*im Kreis.*Vorrang/i);
});

test('runde und eckige Radwegzeichen werden unterschieden', () => {
  const required = TRAFFIC_QUIZ_QUESTIONS.find(item => item.id === 'cycle-path-required');
  const optional = TRAFFIC_QUIZ_QUESTIONS.find(item => item.id === 'cycle-path-optional');
  assert.match(required!.explanation, /Benützungspflicht/);
  assert.match(optional!.explanation, /ohne Benützungspflicht/);
});

test('wichtige aktuelle Radfahrregeln sind abgedeckt', () => {
  const text = JSON.stringify(TRAFFIC_QUIZ_QUESTIONS);
  assert.match(text, /10 km\/h/);
  assert.match(text, /unter 12 Jahren/);
  assert.match(text, /Freisprecheinrichtung/);
  assert.match(text, /Schutzweg/);
});

test('Einstellungen normalisieren sicher', () => {
  assert.deepEqual(normalizeTrafficQuizSettings(null), DEFAULT_TRAFFIC_QUIZ_SETTINGS);
  assert.deepEqual(normalizeTrafficQuizSettings({
    category: 'priority',
    examLength: 10,
    readAloud: false,
  }), {
    category: 'priority',
    examLength: 10,
    readAloud: false,
  });
});

test('Themenfilter liefert nur passende Fragen', () => {
  for (const category of ['signs', 'priority', 'cycling', 'safety'] as const) {
    const questions = filterTrafficQuizQuestions(category);
    assert.ok(questions.length >= 3);
    assert.ok(questions.every(question => question.category === category));
  }
});

test('Übungsfrage wiederholt sich nach Möglichkeit nicht sofort', () => {
  const first = createTrafficPracticeQuestion('all', () => 0);
  const second = createTrafficPracticeQuestion('all', () => 0, first.id);
  assert.notEqual(second.id, first.id);
});

test('Übungsprüfung ist eindeutig und besteht ab 80 Prozent', () => {
  let n = 0;
  const exam = createTrafficExam(
    { category: 'all', examLength: 10, readAloud: true },
    () => ((n++ * 0.173) % 1),
  );
  assert.equal(exam.length, 10);
  assert.equal(new Set(exam.map(question => question.id)).size, 10);
  assert.equal(hasPassedTrafficPracticeExam(8, 10), true);
  assert.equal(hasPassedTrafficPracticeExam(7, 10), false);
  assert.equal(hasPassedTrafficPracticeExam(4, 5), true);
});
