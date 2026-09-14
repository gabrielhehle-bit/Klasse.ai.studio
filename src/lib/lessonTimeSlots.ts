export type LessonTimeSlot = {
  slot: number;
  label: string;
  start: number;
  end: number;
};

export function parseLessonTimeRange(value: string | undefined | null): { start: number; end: number } | null {
  if (!value) return null;
  const match = value
    .trim()
    .match(/^(\d{1,2})[:.](\d{2})\s*[–—-]\s*(\d{1,2})[:.](\d{2})$/);
  if (!match) return null;

  const startHour = Number(match[1]);
  const startMinute = Number(match[2]);
  const endHour = Number(match[3]);
  const endMinute = Number(match[4]);

  if (
    startHour < 0 || startHour > 23 ||
    endHour < 0 || endHour > 23 ||
    startMinute < 0 || startMinute > 59 ||
    endMinute < 0 || endMinute > 59
  ) {
    return null;
  }

  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  if (end <= start) return null;
  return { start, end };
}

export function buildLessonTimeSlots(
  configured: Record<number, string> | undefined,
  fallback: Record<number, string>,
  maxSlots: number,
): LessonTimeSlot[] {
  const slots: LessonTimeSlot[] = [];

  for (let slot = 1; slot <= maxSlots; slot += 1) {
    const hasConfiguredValue =
      configured != null && Object.prototype.hasOwnProperty.call(configured, slot);
    const label = hasConfiguredValue ? configured?.[slot] : fallback[slot];
    const parsed = parseLessonTimeRange(label);
    if (!parsed || !label) continue;
    slots.push({ slot, label, ...parsed });
  }

  return slots;
}

export function findCurrentLessonSlot(slots: LessonTimeSlot[], minuteOfDay: number): LessonTimeSlot | null {
  return slots.find(slot => minuteOfDay >= slot.start && minuteOfDay < slot.end) || null;
}

export type LessonBreak = {
  afterSlot: number;
  beforeSlot: number;
  start: number;
  end: number;
};

export function findCurrentLessonBreak(
  slots: LessonTimeSlot[],
  minuteOfDay: number,
): LessonBreak | null {
  const ordered = [...slots].sort((a, b) => a.slot - b.slot);
  for (let index = 0; index < ordered.length - 1; index += 1) {
    const current = ordered[index];
    const next = ordered[index + 1];
    if (minuteOfDay >= current.end && minuteOfDay < next.start) {
      return {
        afterSlot: current.slot,
        beforeSlot: next.slot,
        start: current.end,
        end: next.start,
      };
    }
  }
  return null;
}
