import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SKY_PATTERNS,
  DEFAULT_CONSTELLATION_WIDGET_SETTINGS,
  doesStarPairMatchEdge,
  filterSkyPatterns,
  normalizeConstellationWidgetSettings,
} from './constellationWidgetModel';

test('Sternbilder und Asterismen werden fachlich getrennt', () => {
  const cassiopeia = SKY_PATTERNS.find(pattern => pattern.id === 'cassiopeia');
  const orion = SKY_PATTERNS.find(pattern => pattern.id === 'orion');
  const bigDipper = SKY_PATTERNS.find(pattern => pattern.id === 'big-dipper');
  const summerTriangle = SKY_PATTERNS.find(pattern => pattern.id === 'summer-triangle');

  assert.equal(cassiopeia?.kind, 'constellation');
  assert.equal(orion?.kind, 'constellation');
  assert.equal(bigDipper?.kind, 'asterism');
  assert.equal(bigDipper?.parent, 'Großer Bär (Ursa Major)');
  assert.equal(summerTriangle?.kind, 'asterism');
});

test('Großer Wagen wird nicht fälschlich als Ursa Major selbst bezeichnet', () => {
  const bigDipper = SKY_PATTERNS.find(pattern => pattern.id === 'big-dipper');
  assert.ok(bigDipper);
  assert.equal(bigDipper!.name, 'Großer Wagen');
  assert.match(bigDipper!.fact, /kein eigenes Sternbild/);
  assert.match(bigDipper!.parent!, /Ursa Major/);
});

test('Orion enthält die drei Gürtelsterne sowie Betelgeuse und Rigel', () => {
  const orion = SKY_PATTERNS.find(pattern => pattern.id === 'orion')!;
  const starNames = new Set(orion.stars.map(star => star.name));

  for (const name of ['Betelgeuse', 'Rigel', 'Alnitak', 'Alnilam', 'Mintaka']) {
    assert.ok(starNames.has(name));
  }
});

test('Sommerdreieck enthält Vega, Deneb und Altair', () => {
  const summerTriangle = SKY_PATTERNS.find(pattern => pattern.id === 'summer-triangle')!;
  assert.deepEqual(
    new Set(summerTriangle.stars.map(star => star.name)),
    new Set(['Vega', 'Deneb', 'Altair']),
  );
});

test('Filter trennt offizielle Sternbilder und Asterismen', () => {
  assert.equal(filterSkyPatterns('all').length, 4);
  assert.ok(filterSkyPatterns('constellation').every(pattern => pattern.kind === 'constellation'));
  assert.ok(filterSkyPatterns('asterism').every(pattern => pattern.kind === 'asterism'));
});

test('Einstellungen normalisieren sicher', () => {
  assert.deepEqual(normalizeConstellationWidgetSettings(null), DEFAULT_CONSTELLATION_WIDGET_SETTINGS);
  assert.deepEqual(normalizeConstellationWidgetSettings({
    filter: 'asterism',
    showStarNames: false,
  }), {
    filter: 'asterism',
    showStarNames: false,
  });
});

test('Kanten können in beiden Klickrichtungen verbunden werden', () => {
  const edge = { a: 'vega', b: 'deneb' };
  assert.equal(doesStarPairMatchEdge('vega', 'deneb', edge), true);
  assert.equal(doesStarPairMatchEdge('deneb', 'vega', edge), true);
  assert.equal(doesStarPairMatchEdge('vega', 'altair', edge), false);
});

test('jede Lernfigur verwendet vorhandene Sterne und eindeutige Kanten', () => {
  for (const pattern of SKY_PATTERNS) {
    const ids = new Set(pattern.stars.map(star => star.id));
    assert.equal(ids.size, pattern.stars.length);
    const edges = new Set<string>();

    for (const edge of pattern.edges) {
      assert.ok(ids.has(edge.a));
      assert.ok(ids.has(edge.b));
      const key = [edge.a, edge.b].sort().join('::');
      assert.ok(!edges.has(key));
      edges.add(key);
    }
  }
});
