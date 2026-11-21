export const INSTRUCTION_MATERIAL_COLORS = [
  { id: 'green', label: 'Grün', swatch: '#258449' },
  { id: 'navy', label: 'Dunkelblau', swatch: '#254391' },
  { id: 'sky', label: 'Hellblau', swatch: '#63b5ed' },
  { id: 'orange', label: 'Orange', swatch: '#e97218' },
  { id: 'red', label: 'Rot', swatch: '#cd393b' },
  { id: 'yellow', label: 'Gelb', swatch: '#e8b629' },
  { id: 'purple', label: 'Violett', swatch: '#8555b4' },
] as const;

type MaterialColor = typeof INSTRUCTION_MATERIAL_COLORS[number]['id'];

export interface InstructionReference {
  material: string;
  color: MaterialColor | '';
  page: string;
  exercises: string;
}

export function normalizeInstructionReference(value: unknown): InstructionReference {
  const reference = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const text = (raw: unknown) => typeof raw === 'string' ? raw.trim() : '';
  return {
    material: text(reference.material),
    color: INSTRUCTION_MATERIAL_COLORS.find(color => color.id === reference.color)?.id ?? '',
    page: text(reference.page),
    exercises: text(reference.exercises),
  };
}

export function hasInstructionReference({ material, color, page, exercises }: InstructionReference): boolean {
  return Boolean(material || color || page || exercises);
}
