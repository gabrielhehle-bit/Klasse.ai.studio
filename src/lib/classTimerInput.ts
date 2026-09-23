/** Time widget input limits keep UI controls and SVG progress finite. */
export const MAX_CLASS_TIMER_SECONDS = 12 * 60 * 60;
export function normalizeClassTimerSeconds(minutes: unknown, seconds: unknown): number {
  const m = typeof minutes === 'string' && /^\d+$/.test(minutes.trim()) ? Number(minutes) : NaN;
  const s = typeof seconds === 'string' && /^\d+$/.test(seconds.trim()) ? Number(seconds) : NaN;
  if (!Number.isSafeInteger(m) || !Number.isSafeInteger(s) || s > 59 || m < 0 || s < 0)
    throw new Error('Bitte gültige Minuten und Sekunden (0–59) eingeben.');
  const value = m * 60 + s;
  if (value < 1 || value > MAX_CLASS_TIMER_SECONDS)
    throw new Error('Wähle eine Zeit zwischen einer Sekunde und zwölf Stunden.');
  return value;
}
export function classTimerOwnsShortcut(container: HTMLElement | null, target: EventTarget | null): boolean {
  if (!container || !(target instanceof Node) || !container.contains(target)) return false;
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest('button, input, select, textarea, [contenteditable="true"], [role="textbox"], [role="button"]')) return false;
  return document.activeElement === container ||
    (document.activeElement instanceof Node && container.contains(document.activeElement) &&
      !document.activeElement.parentElement?.closest('button, input, select, textarea, [contenteditable="true"]'));
}
