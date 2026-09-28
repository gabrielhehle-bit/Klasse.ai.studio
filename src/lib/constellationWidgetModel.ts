export type SkyPatternKind = 'constellation' | 'asterism';
export type SkyPatternFilter = 'all' | SkyPatternKind;

export interface SkyPatternStar {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface SkyPatternEdge {
  a: string;
  b: string;
}

export interface SkyPattern {
  id: string;
  name: string;
  kind: SkyPatternKind;
  parent?: string;
  description: string;
  fact: string;
  stars: readonly SkyPatternStar[];
  edges: readonly SkyPatternEdge[];
  source: 'IAU/NASA' | 'NASA';
}

export interface ConstellationWidgetSettings {
  filter: SkyPatternFilter;
  showStarNames: boolean;
}

export const DEFAULT_CONSTELLATION_WIDGET_SETTINGS: ConstellationWidgetSettings = {
  filter: 'all',
  showStarNames: true,
};

export const SKY_PATTERN_KIND_LABELS: Record<SkyPatternKind, string> = {
  constellation: 'Sternbild',
  asterism: 'Asterismus',
};

export const SKY_PATTERN_FILTER_LABELS: Record<SkyPatternFilter, string> = {
  all: 'Alle',
  constellation: 'Nur Sternbilder',
  asterism: 'Nur Asterismen',
};

/**
 * Educational line drawings of well-known sky patterns.
 * Important: IAU constellations are official sky regions. The line segments below
 * are schematic learning aids, not official IAU constellation boundaries.
 */
export const SKY_PATTERNS: readonly SkyPattern[] = [
  {
    id: 'cassiopeia',
    name: 'Cassiopeia',
    kind: 'constellation',
    description: 'Ein offiziell anerkanntes Sternbild mit einer auffälligen W-Form.',
    fact: 'Cassiopeia gehört zu den 88 von der Internationalen Astronomischen Union anerkannten Sternbildern.',
    stars: [
      { id: 'caph', name: 'Caph', x: 14, y: 34 },
      { id: 'schedar', name: 'Schedar', x: 32, y: 66 },
      { id: 'gamma-cas', name: 'Gamma Cassiopeiae', x: 50, y: 34 },
      { id: 'ruchbah', name: 'Ruchbah', x: 68, y: 66 },
      { id: 'segin', name: 'Segin', x: 86, y: 34 },
    ],
    edges: [
      { a: 'caph', b: 'schedar' },
      { a: 'schedar', b: 'gamma-cas' },
      { a: 'gamma-cas', b: 'ruchbah' },
      { a: 'ruchbah', b: 'segin' },
    ],
    source: 'IAU/NASA',
  },
  {
    id: 'orion',
    name: 'Orion',
    kind: 'constellation',
    description: 'Ein bekanntes Sternbild mit zwei hellen Schulter-/Fußsternen und drei Gürtelsternen.',
    fact: 'NASA hebt Betelgeuse, Rigel und die drei Sterne des Oriongürtels als besonders auffällige Merkmale hervor.',
    stars: [
      { id: 'betelgeuse', name: 'Betelgeuse', x: 24, y: 18 },
      { id: 'bellatrix', name: 'Bellatrix', x: 72, y: 22 },
      { id: 'alnitak', name: 'Alnitak', x: 37, y: 47 },
      { id: 'alnilam', name: 'Alnilam', x: 50, y: 45 },
      { id: 'mintaka', name: 'Mintaka', x: 63, y: 43 },
      { id: 'saiph', name: 'Saiph', x: 28, y: 82 },
      { id: 'rigel', name: 'Rigel', x: 72, y: 82 },
    ],
    edges: [
      { a: 'betelgeuse', b: 'bellatrix' },
      { a: 'betelgeuse', b: 'alnitak' },
      { a: 'bellatrix', b: 'mintaka' },
      { a: 'alnitak', b: 'alnilam' },
      { a: 'alnilam', b: 'mintaka' },
      { a: 'alnitak', b: 'saiph' },
      { a: 'mintaka', b: 'rigel' },
    ],
    source: 'NASA',
  },
  {
    id: 'big-dipper',
    name: 'Großer Wagen',
    kind: 'asterism',
    parent: 'Großer Bär (Ursa Major)',
    description: 'Ein leicht erkennbares Sternmuster aus sieben hellen Sternen.',
    fact: 'Der Große Wagen ist kein eigenes Sternbild. Er ist ein Asterismus innerhalb des Sternbilds Großer Bär (Ursa Major).',
    stars: [
      { id: 'dubhe', name: 'Dubhe', x: 73, y: 26 },
      { id: 'merak', name: 'Merak', x: 74, y: 58 },
      { id: 'phecda', name: 'Phecda', x: 54, y: 64 },
      { id: 'megrez', name: 'Megrez', x: 48, y: 38 },
      { id: 'alioth', name: 'Alioth', x: 34, y: 34 },
      { id: 'mizar', name: 'Mizar', x: 21, y: 27 },
      { id: 'alkaid', name: 'Alkaid', x: 8, y: 18 },
    ],
    edges: [
      { a: 'alkaid', b: 'mizar' },
      { a: 'mizar', b: 'alioth' },
      { a: 'alioth', b: 'megrez' },
      { a: 'megrez', b: 'phecda' },
      { a: 'phecda', b: 'merak' },
      { a: 'merak', b: 'dubhe' },
      { a: 'dubhe', b: 'megrez' },
    ],
    source: 'NASA',
  },
  {
    id: 'summer-triangle',
    name: 'Sommerdreieck',
    kind: 'asterism',
    description: 'Ein großes Dreieck aus drei hellen Sternen, die zu drei verschiedenen Sternbildern gehören.',
    fact: 'Vega gehört zur Leier (Lyra), Deneb zum Schwan (Cygnus) und Altair zum Adler (Aquila). Das Sommerdreieck selbst ist kein offizielles Sternbild.',
    stars: [
      { id: 'vega', name: 'Vega', x: 24, y: 22 },
      { id: 'deneb', name: 'Deneb', x: 76, y: 18 },
      { id: 'altair', name: 'Altair', x: 55, y: 82 },
    ],
    edges: [
      { a: 'vega', b: 'deneb' },
      { a: 'deneb', b: 'altair' },
      { a: 'altair', b: 'vega' },
    ],
    source: 'NASA',
  },
] as const;

export function normalizeConstellationWidgetSettings(raw: unknown): ConstellationWidgetSettings {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const filters: SkyPatternFilter[] = ['all', 'constellation', 'asterism'];
  return {
    filter: filters.includes(value.filter as SkyPatternFilter)
      ? value.filter as SkyPatternFilter
      : 'all',
    showStarNames: typeof value.showStarNames === 'boolean' ? value.showStarNames : true,
  };
}

export function filterSkyPatterns(filter: SkyPatternFilter): readonly SkyPattern[] {
  return filter === 'all'
    ? SKY_PATTERNS
    : SKY_PATTERNS.filter(pattern => pattern.kind === filter);
}

export function getSkyPatternStar(pattern: SkyPattern, id: string): SkyPatternStar {
  const star = pattern.stars.find(item => item.id === id);
  if (!star) throw new Error(`Unknown star ${id} in sky pattern ${pattern.id}`);
  return star;
}

export function skyPatternEdgeKey(edge: SkyPatternEdge): string {
  return [edge.a, edge.b].sort().join('::');
}

export function doesStarPairMatchEdge(
  firstStarId: string,
  secondStarId: string,
  edge: SkyPatternEdge,
): boolean {
  return skyPatternEdgeKey({ a: firstStarId, b: secondStarId }) === skyPatternEdgeKey(edge);
}
