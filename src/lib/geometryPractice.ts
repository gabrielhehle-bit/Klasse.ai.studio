export type Point3 = [number, number, number];
export type Solid = { name: string; vertices: Point3[]; edges: [number, number][]; faces: number };

export const prism = (sides: number, name: string): Solid => {
  const base: Point3[] = Array.from({ length: sides }, (_, i) => {
    const angle = -Math.PI / 2 + i * 2 * Math.PI / sides;
    return [Math.cos(angle), Math.sin(angle), -0.6];
  });
  return {
    name, vertices: [...base, ...base.map(([x, y]) => [x, y, 0.6] as Point3)], faces: sides + 2,
    edges: base.flatMap((_, i) => [[i, (i + 1) % sides], [i + sides, (i + 1) % sides + sides], [i, i + sides]] as [number, number][]),
  };
};

export const GEOMETRY_FIGURES = [
  { name: 'Dreieck', sides: 3, solid: { name: 'Dreieckspyramide (Tetraeder)', vertices: [[-1, .7, -.6], [1, .7, -.6], [0, .7, 1], [0, -1, 0]] as Point3[], edges: [[0, 1], [1, 2], [2, 0], [0, 3], [1, 3], [2, 3]] as [number, number][], faces: 4 } },
  { name: 'Quadrat', sides: 4, solid: { name: 'Würfel', vertices: [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]] as Point3[], edges: [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]] as [number, number][], faces: 6 } },
  { name: 'Fünfeck', sides: 5, solid: prism(5, 'Fünfeckiges Prisma') },
  { name: 'Sechseck', sides: 6, solid: prism(6, 'Sechseckiges Prisma') },
];

export const projectSolid = (vertices: Point3[], degrees: number) => {
  const angle = degrees * Math.PI / 180, tilt = -Math.PI / 8;
  return vertices.map(([x,y,z]) => {
    const rotatedX = x * Math.cos(angle) + z * Math.sin(angle);
    const rotatedZ = z * Math.cos(angle) - x * Math.sin(angle);
    return { x: 100 + rotatedX * 45, y: 100 + (y * Math.cos(tilt) - rotatedZ * Math.sin(tilt)) * 45 };
  });
};

export const DIVISIBILITY_RULES = [2, 3, 4, 5, 6, 8, 9, 10] as const;
export const generateDivisibilityPool = (rule: number, max: number, random = Math.random) => {
  // Three distinct fitting and three distinct nonfitting numbers; bounded even for constant randomness.
  const fitting = Array.from({ length: Math.floor(max / rule) }, (_, i) => (i + 1) * rule);
  const nonfitting = Array.from({ length: max }, (_, i) => i + 1).filter(n => n % rule !== 0);
  const take = (pool: number[]) => Array.from({ length: 3 }, () => pool.splice(Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length))), 1)[0]);
  const values = [...take(fitting), ...take(nonfitting)];
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
};

export const estimatePresets = (min: number, max: number, step: number) =>
  Array.from({ length: 4 }, (_, i) => Math.max(min, Math.min(max, Math.round((min + (max - min) * i / 3) / step) * step)));
export const initialEstimate = (min: number, max: number, step: number) =>
  Math.round((min + max) / 2 / step) * step;
