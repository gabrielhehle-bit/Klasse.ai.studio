/** Class-local, purely teacher-controlled mascot. Contains no student data or grades. */
export type ClassMascotKind = 'otter' | 'dog' | 'cat' | 'elf';
export type ClassMascotMood = 'happy' | 'calm' | 'sleepy' | 'proud';
export type ClassMascotAction = 'praise' | 'calm' | 'encourage';

export interface ClassMascotState {
  version: 1;
  kind: ClassMascotKind;
  name: string;
  mood: ClassMascotMood;
  stars: number;
  animationEnabled: boolean;
}

export const MASCOT_OPTIONS: ReadonlyArray<{
  kind: ClassMascotKind;
  name: string;
  label: string;
  character: string;
}> = [
  { kind: 'otter', name: 'Olivia', label: 'Otter Olivia', character: 'Neugierig & freundlich' },
  { kind: 'dog', name: 'Bruno', label: 'Hund Bruno', character: 'Fröhlich & mutig' },
  { kind: 'cat', name: 'Mimi', label: 'Katze Mimi', character: 'Ruhig & aufmerksam' },
  { kind: 'elf', name: 'Elio', label: 'Hauself Elio', character: 'Magisch & hilfsbereit' },
];

export const DEFAULT_CLASS_MASCOT: ClassMascotState = {
  version: 1,
  kind: 'otter',
  name: 'Olivia',
  mood: 'happy',
  stars: 0,
  animationEnabled: false,
};

const KINDS = new Set<ClassMascotKind>(['otter', 'dog', 'cat', 'elf']);
const MOODS = new Set<ClassMascotMood>(['happy', 'calm', 'sleepy', 'proud']);
const clampStars = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
  ? Math.max(0, Math.min(5, Math.floor(value))) : 0;

export function normalizeClassMascot(value?: Partial<ClassMascotState> | null): ClassMascotState {
  const kind = value?.kind && KINDS.has(value.kind) ? value.kind : DEFAULT_CLASS_MASCOT.kind;
  const defaultName = MASCOT_OPTIONS.find(option => option.kind === kind)?.name || 'Olivia';
  const savedName = typeof value?.name === 'string' ? value.name.trim().slice(0, 24) : '';
  return {
    version: 1,
    kind,
    name: savedName || defaultName,
    mood: value?.mood && MOODS.has(value.mood) ? value.mood : 'happy',
    stars: clampStars(value?.stars),
    animationEnabled: value?.animationEnabled === true,
  };
}

export function selectClassMascot(current: ClassMascotState, kind: ClassMascotKind): ClassMascotState {
  const option = MASCOT_OPTIONS.find(item => item.kind === kind);
  if (!option) return current;
  // Switching animals deliberately also changes the pre-filled name; no legacy pet state is modified.
  return { ...current, kind, name: option.name, mood: 'happy' };
}

export function reactToMascotAction(current: ClassMascotState, action: ClassMascotAction): ClassMascotState {
  if (action === 'praise') {
    return { ...current, stars: Math.min(5, current.stars + 1), mood: 'proud' };
  }
  if (action === 'calm') return { ...current, mood: 'calm' };
  if (action === 'encourage') return { ...current, mood: 'happy' };
  return current;
}

export function mascotMessage(mascot: ClassMascotState): string {
  const name = mascot.name;
  switch (mascot.mood) {
    case 'calm': return name + ' macht mit euch eine ruhige Pause.';
    case 'sleepy': return name + ' ruht sich einen Moment aus.';
    case 'proud': return name + ' freut sich über euren gemeinsamen Erfolg!';
    default: return name + ' freut sich auf eure nächste Aufgabe!';
  }
}
