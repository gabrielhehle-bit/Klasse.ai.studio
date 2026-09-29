import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PLANETARIUM_WIDGET_SETTINGS,
  PLANETARIUM_QUIZ,
  SOLAR_SYSTEM_BODIES,
  formatOrbitLength,
  getPlanetBodies,
  getPlanetariumQuiz,
  normalizePlanetariumWidgetSettings,
  planetYearsForEarthAge,
} from './planetariumWidgetModel';

test('Sonnensystem trennt Stern und acht Planeten sauber', () => {
  assert.equal(SOLAR_SYSTEM_BODIES.length, 9);
  assert.equal(SOLAR_SYSTEM_BODIES[0].id, 'sun');
  assert.equal(SOLAR_SYSTEM_BODIES[0].kind, 'star');
  assert.equal(getPlanetBodies().length, 8);
  assert.deepEqual(
    getPlanetBodies().map(body => body.name),
    ['Merkur', 'Venus', 'Erde', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptun'],
  );
});

test('Planetentypen sind fachlich korrekt getrennt', () => {
  const byId = new Map(SOLAR_SYSTEM_BODIES.map(body => [body.id, body]));
  assert.equal(byId.get('jupiter')?.kind, 'gas-giant');
  assert.equal(byId.get('saturn')?.kind, 'gas-giant');
  assert.equal(byId.get('uranus')?.kind, 'ice-giant');
  assert.equal(byId.get('neptune')?.kind, 'ice-giant');
});

test('aktuelle Mondzahlen entsprechen dem dokumentierten Stand August 2026', () => {
  const moons = Object.fromEntries(getPlanetBodies().map(body => [body.id, body.moonCount]));
  assert.deepEqual(moons, {
    mercury: 0,
    venus: 0,
    earth: 1,
    mars: 2,
    jupiter: 115,
    saturn: 293,
    uranus: 29,
    neptune: 16,
  });
});

test('Merkur wird nicht fälschlich als völlig atmosphärenlos beschrieben', () => {
  const mercury = SOLAR_SYSTEM_BODIES.find(body => body.id === 'mercury');
  assert.ok(mercury);
  assert.match(mercury!.detail, /Exosphäre/);
  assert.doesNotMatch(mercury!.detail, /keine Atmosphäre/);
});

test('Umlaufzeiten und Umlauf-Rechner funktionieren plausibel', () => {
  const earth = SOLAR_SYSTEM_BODIES.find(body => body.id === 'earth')!;
  const mercury = SOLAR_SYSTEM_BODIES.find(body => body.id === 'mercury')!;
  const neptune = SOLAR_SYSTEM_BODIES.find(body => body.id === 'neptune')!;

  assert.equal(formatOrbitLength(mercury), '88 Erdentage');
  assert.equal(formatOrbitLength(neptune), '165 Erdenjahre');
  assert.ok(Math.abs((planetYearsForEarthAge(10, earth) ?? 0) - 10) < 0.01);
  assert.ok((planetYearsForEarthAge(10, mercury) ?? 0) > 40);
  assert.ok((planetYearsForEarthAge(10, neptune) ?? 1) < 0.1);
});

test('Quiz ist fest geprüft und kann 5 oder 8 Fragen liefern', () => {
  assert.equal(PLANETARIUM_QUIZ.length, 8);
  assert.equal(getPlanetariumQuiz(5).length, 5);
  assert.equal(getPlanetariumQuiz(8).length, 8);
  assert.ok(PLANETARIUM_QUIZ.every(question => question.options.includes(question.correct)));
});

test('Einstellungen normalisieren sicher', () => {
  assert.deepEqual(normalizePlanetariumWidgetSettings(null), DEFAULT_PLANETARIUM_WIDGET_SETTINGS);
  assert.deepEqual(normalizePlanetariumWidgetSettings({ showMoonCounts: false, quizLength: 8 }), {
    showMoonCounts: false,
    quizLength: 8,
  });
  assert.equal(normalizePlanetariumWidgetSettings({ quizLength: 7 }).quizLength, 5);
});
