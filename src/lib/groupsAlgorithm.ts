/**
 * Gruppen-Einteiler Algorithmus (F8 – widget-groups)
 * Rein client-seitig, deterministisch / randomisiert, ohne externe APIs oder KI.
 * Berücksichtigt faire Restgruppenverteilung, Ausschlusskriterien und Buddy-Vorgaben.
 */

export type GroupingMode = 'size' | 'count';

export interface GroupConstraint {
  studentIdA: string;
  studentIdB: string;
}

export interface GeneratedGroup {
  id: string;
  name: string;
  symbol?: string;
  colorIndex: number;
  studentIds: string[];
}

export interface GroupingConfig {
  mode: GroupingMode; // 'size' = Gruppengröße (Standard), 'count' = Anzahl Gruppen
  value: number; // z.B. 2, 3, 4, 5
  namingStyle?: 'numbered' | 'colors' | 'symbols' | 'animals';
  pausedStudentIds?: string[];
  notTogether?: GroupConstraint[]; // [A, B] dürfen nicht in selbe Gruppe
  keepTogether?: GroupConstraint[]; // [A, B] müssen in selbe Gruppe
}

export interface GroupingResult {
  groups: GeneratedGroup[];
  warning?: string | null;
}

export const GROUP_COLOR_PALETTES = [
  {
    border: 'border-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-700 dark:text-blue-300',
    headerBg: 'bg-blue-500 text-white',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200',
    colorName: 'Blau',
    symbol: '🔷',
    animal: 'Delfin'
  },
  {
    border: 'border-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    headerBg: 'bg-emerald-500 text-white',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
    colorName: 'Grün',
    symbol: '🟢',
    animal: 'Eule'
  },
  {
    border: 'border-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-300',
    headerBg: 'bg-amber-500 text-white',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
    colorName: 'Gelb',
    symbol: '🟡',
    animal: 'Fuchs'
  },
  {
    border: 'border-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    text: 'text-purple-700 dark:text-purple-300',
    headerBg: 'bg-purple-500 text-white',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200',
    colorName: 'Violett',
    symbol: '🟣',
    animal: 'Koala'
  },
  {
    border: 'border-pink-500',
    bg: 'bg-pink-50 dark:bg-pink-950/30',
    text: 'text-pink-700 dark:text-pink-300',
    headerBg: 'bg-pink-500 text-white',
    badge: 'bg-pink-100 text-pink-800 dark:bg-pink-900/60 dark:text-pink-200',
    colorName: 'Pink',
    symbol: '🌸',
    animal: 'Panda'
  },
  {
    border: 'border-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    text: 'text-orange-700 dark:text-orange-300',
    headerBg: 'bg-orange-500 text-white',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200',
    colorName: 'Orange',
    symbol: '🟠',
    animal: 'Biber'
  },
  {
    border: 'border-cyan-500',
    bg: 'bg-cyan-50 dark:bg-cyan-950/30',
    text: 'text-cyan-700 dark:text-cyan-300',
    headerBg: 'bg-cyan-500 text-white',
    badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-200',
    colorName: 'Türkis',
    symbol: '🩵',
    animal: 'Falke'
  },
  {
    border: 'border-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    text: 'text-rose-700 dark:text-rose-300',
    headerBg: 'bg-rose-500 text-white',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200',
    colorName: 'Rot',
    symbol: '🔴',
    animal: 'Igel'
  }
];

/**
 * Berechnet die optimale Gruppenanzahl und Größenverteilung für n Schüler.
 * Verhindert Einzelkinder (1 Kind) und sorgt für maximale Ausgeglichenheit.
 *
 * Beispiele:
 * - 20 Kinder, 4er -> [4, 4, 4, 4, 4]
 * - 21 Kinder, 4er -> [5, 4, 4, 4, 4]
 * - 23 Kinder, 4er -> [5, 5, 5, 4, 4] (nicht 4/4/4/4/4/3!)
 * - 19 Kinder, 2er -> [3, 2, 2, 2, 2, 2, 2, 2, 2] (eine 3er-Gruppe)
 * - 3 Kinder, 4er  -> [3]
 */
export function calculateGroupSizes(totalStudents: number, mode: GroupingMode, value: number): number[] {
  if (totalStudents <= 0) return [];
  if (totalStudents === 1) return [1];

  let numGroups = 1;

  if (mode === 'size') {
    const targetSize = Math.max(2, Math.floor(value));

    if (totalStudents <= targetSize) {
      return [totalStudents];
    }

    if (targetSize === 2) {
      // Partnerarbeit
      numGroups = Math.max(1, Math.floor(totalStudents / 2));
      // Wenn ungerade, bildet der Rest eine 3er-Gruppe (wird über Restverteilung automatisch gelöst)
    } else {
      // Größere Gruppen (3er, 4er, 5er)
      if (totalStudents < 2 * targetSize) {
        if (totalStudents <= targetSize + 1) {
          numGroups = 1;
        } else {
          numGroups = 2;
        }
      } else {
        // Größere Klassen: floor(totalStudents / targetSize) verhindert unterbesetzte Restgruppen
        numGroups = Math.floor(totalStudents / targetSize);
      }
    }
  } else {
    // mode === 'count' (Anzahl Gruppen)
    numGroups = Math.max(1, Math.floor(value));
    if (totalStudents >= 2 && numGroups > Math.floor(totalStudents / 2)) {
      // Verhindere Einzelkinder
      numGroups = Math.floor(totalStudents / 2);
    }
  }

  // Gleichmäßige Aufteilung auf numGroups
  numGroups = Math.max(1, Math.min(totalStudents, numGroups));
  const baseSize = Math.floor(totalStudents / numGroups);
  const remainder = totalStudents % numGroups;

  const sizes: number[] = [];
  for (let i = 0; i < numGroups; i++) {
    // Verteile den Rest auf die ersten Gruppen
    sizes.push(i < remainder ? baseSize + 1 : baseSize);
  }

  return sizes;
}

/**
 * Erzeugt einen neutralen Namen für eine Gruppe abhängig vom gewählten Stil.
 */
export function getGroupName(index: number, style: string = 'numbered'): { name: string; symbol?: string } {
  const palette = GROUP_COLOR_PALETTES[index % GROUP_COLOR_PALETTES.length];
  // A 30-child class can have 15 partner groups: color/animal names must not
  // silently repeat after the palette's eighth entry.
  const suffix = index >= GROUP_COLOR_PALETTES.length
    ? ` ${Math.floor(index / GROUP_COLOR_PALETTES.length) + 1}` : '';
  switch (style) {
    case 'colors':
      return { name: `Team ${palette.colorName}${suffix}`, symbol: palette.symbol };
    case 'symbols':
      return { name: `Gruppe ${palette.symbol}${suffix}`, symbol: palette.symbol };
    case 'animals':
      return { name: `Team ${palette.animal}${suffix}`, symbol: palette.symbol };
    case 'numbered':
    default:
      return { name: `Gruppe ${index + 1}`, symbol: palette.symbol };
  }
}

/**
 * Fisher-Yates Shuffle
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

/**
 * Prüft, ob ein gegebener Gruppenentwurf alle Vorgaben (Zusammen/Getrennt) erfüllt.
 */
function evaluateConstraints(
  groups: string[][],
  notTogether: GroupConstraint[] = [],
  keepTogether: GroupConstraint[] = []
): { satisfied: boolean; violations: number } {
  let violations = 0;

  // Student to group map
  const studentGroupMap = new Map<string, number>();
  groups.forEach((group, gIdx) => {
    group.forEach((studentId) => {
      studentGroupMap.set(studentId, gIdx);
    });
  });

  // Not together: dürfen nicht in derselben Gruppe sein
  for (const c of notTogether) {
    const gA = studentGroupMap.get(c.studentIdA);
    const gB = studentGroupMap.get(c.studentIdB);
    if (gA !== undefined && gB !== undefined && gA === gB) {
      violations++;
    }
  }

  // Keep together: müssen in derselben Gruppe sein
  for (const c of keepTogether) {
    const gA = studentGroupMap.get(c.studentIdA);
    const gB = studentGroupMap.get(c.studentIdB);
    if (gA !== undefined && gB !== undefined && gA !== gB) {
      violations++;
    }
  }

  return { satisfied: violations === 0, violations };
}

/**
 * Place connected "together" children as indivisible blocks, then fit them
 * into the requested balanced group sizes without violating "apart" pairs.
 * A bounded search avoids random failure for straightforward buddy rules
 * (e.g. four prescribed pairs in a partner-work class). Impossible or very
 * complex combinations fall back to the warning-producing best effort below.
 */
function findConstraintSafePartition(
  pool: string[],
  sizes: number[],
  notTogether: GroupConstraint[],
  keepTogether: GroupConstraint[],
): string[][] | null {
  const present = new Set(pool);
  const parent = new Map(pool.map(id => [id, id]));

  const rootOf = (id: string): string => {
    const current = parent.get(id)!;
    if (current === id) return id;
    const root = rootOf(current);
    parent.set(id, root);
    return root;
  };

  for (const { studentIdA: a, studentIdB: b } of keepTogether) {
    if (a !== b && present.has(a) && present.has(b)) {
      parent.set(rootOf(a), rootOf(b));
    }
  }

  const blocksByRoot = new Map<string, string[]>();
  for (const id of pool) {
    const root = rootOf(id);
    const block = blocksByRoot.get(root) || [];
    block.push(id);
    blocksByRoot.set(root, block);
  }

  const apart = new Map<string, Set<string>>();
  for (const { studentIdA: a, studentIdB: b } of notTogether) {
    if (!present.has(a) || !present.has(b)) continue;
    if (a === b || rootOf(a) === rootOf(b)) return null;
    if (!apart.has(a)) apart.set(a, new Set());
    if (!apart.has(b)) apart.set(b, new Set());
    apart.get(a)!.add(b);
    apart.get(b)!.add(a);
  }

  const blocks = shuffle([...blocksByRoot.values()]).sort((a, b) => b.length - a.length);
  if (blocks.some(block => block.length > Math.max(...sizes))) return null;
  const partition: string[][] = sizes.map(() => []);
  const free = [...sizes];
  let nodes = 0;
  const search = (blockIndex: number): boolean => {
    if (++nodes > 25000) return false;
    if (blockIndex === blocks.length) return free.every(remaining => remaining === 0);

    const block = blocks[blockIndex];
    const options = shuffle(sizes.map((_, index) => index)).sort((a, b) => free[a] - free[b]);
    const triedEmptyCapacities = new Set<number>();
    for (const groupIndex of options) {
      const remaining = free[groupIndex];
      if (remaining < block.length) continue;
      if (partition[groupIndex].length === 0) {
        if (triedEmptyCapacities.has(remaining)) continue;
        triedEmptyCapacities.add(remaining);
      }
      if (block.some(id => partition[groupIndex].some(other => apart.get(id)?.has(other)))) continue;
      partition[groupIndex].push(...block);
      free[groupIndex] -= block.length;
      if (search(blockIndex + 1)) return true;
      free[groupIndex] += block.length;
      partition[groupIndex].splice(partition[groupIndex].length - block.length, block.length);
    }
    return false;
  };

  return search(0) ? partition.map(shuffle) : null;
}

/**
 * Hauptfunktion zur Erstellung der Gruppen.
 * Vollständig offline, ohne Leistungs-/Verhaltensdaten oder KI.
 */
export function generateStudentGroups(
  activeStudentIds: string[],
  config: GroupingConfig
): GroupingResult {
  const pausedSet = new Set(config.pausedStudentIds || []);
  const pool = activeStudentIds.filter((id) => !pausedSet.has(id));

  if (pool.length === 0) {
    return { groups: [], warning: null };
  }

  const sizes = calculateGroupSizes(pool.length, config.mode, config.value);
  const notTogether = config.notTogether || [];
  const keepTogether = config.keepTogether || [];
  const hasConstraints = notTogether.length > 0 || keepTogether.length > 0;

  const exactPartition = hasConstraints
    ? findConstraintSafePartition(pool, sizes, notTogether, keepTogether)
    : null;
  let bestPartition: string[][] = exactPartition || [];
  let minViolations = exactPartition ? 0 : Infinity;
  const maxAttempts = hasConstraints ? 60 : 1;

  for (let attempt = 0; !exactPartition && attempt < maxAttempts; attempt++) {
    const shuffled = shuffle(pool);
    const currentPartition: string[][] = [];
    let currentIdx = 0;

    for (const size of sizes) {
      currentPartition.push(shuffled.slice(currentIdx, currentIdx + size));
      currentIdx += size;
    }

    if (!hasConstraints) {
      bestPartition = currentPartition;
      minViolations = 0;
      break;
    }

    const { satisfied, violations } = evaluateConstraints(
      currentPartition,
      notTogether,
      keepTogether
    );

    if (violations < minViolations) {
      minViolations = violations;
      bestPartition = currentPartition;
    }

    if (satisfied) {
      break;
    }
  }

  const style = config.namingStyle || 'numbered';
  const groups: GeneratedGroup[] = bestPartition.map((memberIds, idx) => {
    const { name, symbol } = getGroupName(idx, style);
    return {
      id: `group-${idx + 1}-${Date.now().toString(36)}`,
      name,
      symbol,
      colorIndex: idx % GROUP_COLOR_PALETTES.length,
      studentIds: memberIds
    };
  });

  const warning =
    hasConstraints && minViolations > 0
      ? 'Nicht alle Wünsche konnten gleichzeitig erfüllt werden.'
      : null;

  return { groups, warning };
}

/**
 * Tauscht zwei Schüler zwischen zwei Positionen (oder Gruppen).
 */
export function swapStudentsInGroups(
  groups: GeneratedGroup[],
  studentIdA: string,
  studentIdB: string
): GeneratedGroup[] {
  if (studentIdA === studentIdB) return groups;

  return groups.map((group) => {
    const hasA = group.studentIds.includes(studentIdA);
    const hasB = group.studentIds.includes(studentIdB);

    if (hasA && hasB) {
      // Beide in derselben Gruppe -> Reihenfolge tauschen
      return {
        ...group,
        studentIds: group.studentIds.map((id) =>
          id === studentIdA ? studentIdB : id === studentIdB ? studentIdA : id
        )
      };
    } else if (hasA) {
      return {
        ...group,
        studentIds: group.studentIds.map((id) => (id === studentIdA ? studentIdB : id))
      };
    } else if (hasB) {
      return {
        ...group,
        studentIds: group.studentIds.map((id) => (id === studentIdB ? studentIdA : id))
      };
    }
    return group;
  });
}

/**
 * Verschiebt einen Schüler in eine Zielgruppe.
 * Verhindert das Leeren von Gruppen.
 */
export function moveStudentToGroup(
  groups: GeneratedGroup[],
  studentId: string,
  targetGroupId: string
): { updatedGroups: GeneratedGroup[]; error?: string; warning?: string } {
  const sourceGroup = groups.find((g) => g.studentIds.includes(studentId));
  const targetGroup = groups.find((g) => g.id === targetGroupId);

  if (!sourceGroup || !targetGroup) {
    return { updatedGroups: groups, error: 'Gruppe oder Schüler nicht gefunden.' };
  }

  if (sourceGroup.id === targetGroup.id) {
    return { updatedGroups: groups };
  }

  // Schutz: Eine Gruppe darf nicht komplett leer werden
  if (sourceGroup.studentIds.length <= 1) {
    return {
      updatedGroups: groups,
      error: 'Diese Gruppe darf nicht leer werden.'
    };
  }

  let warning: string | undefined;
  if (targetGroup.studentIds.length >= 7) {
    warning = 'Hinweis: Die Zielgruppe wird dadurch relativ groß.';
  }

  const updatedGroups = groups.map((g) => {
    if (g.id === sourceGroup.id) {
      return {
        ...g,
        studentIds: g.studentIds.filter((id) => id !== studentId)
      };
    }
    if (g.id === targetGroup.id) {
      return {
        ...g,
        studentIds: [...g.studentIds, studentId]
      };
    }
    return g;
  });

  return { updatedGroups, warning };
}
