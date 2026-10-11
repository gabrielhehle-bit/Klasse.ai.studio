/**
 * phasesAlgorithm.ts
 * F-UI Standard-konforme Logik für Unterrichtsphasen (F12).
 * Sequenzieller Unterrichtsablauf (didaktische Phasen).
 * 100% offline, deterministisch, ohne KI oder externe Netzwerkaufrufe.
 */

export interface PhaseItem {
  id: string;
  label: string;
  subtitle?: string;
  icon?: string;
}

export const DEFAULT_LESSON_PHASES: PhaseItem[] = [
  { id: 'p1', label: 'Einstieg', subtitle: 'Begrüßung & Stundenziel', icon: '🧭' },
  { id: 'p2', label: 'Erarbeitung', subtitle: 'Neues gemeinsam entdecken', icon: '💡' },
  { id: 'p3', label: 'Übung', subtitle: 'Vertiefen & anwenden', icon: '✍️' },
  { id: 'p4', label: 'Sicherung', subtitle: 'Ergebnisse vergleichen', icon: '🎯' },
  { id: 'p5', label: 'Reflexion', subtitle: 'Rückblick & Feedback', icon: '💭' },
];

export interface PhasesSettings {
  phases: PhaseItem[];
  activePhaseId: string;
}

export function getDefaultPhasesSettings(): PhasesSettings {
  return {
    phases: [...DEFAULT_LESSON_PHASES],
    activePhaseId: DEFAULT_LESSON_PHASES[0].id,
  };
}

export function getActivePhaseIndex(phases: PhaseItem[], activePhaseId: string): number {
  const idx = phases.findIndex((p) => p.id === activePhaseId);
  return idx >= 0 ? idx : 0;
}

export function getNextPhaseId(phases: PhaseItem[], currentId: string): string {
  if (phases.length === 0) return '';
  const idx = getActivePhaseIndex(phases, currentId);
  const nextIdx = Math.min(phases.length - 1, idx + 1);
  return phases[nextIdx].id;
}

export function getPrevPhaseId(phases: PhaseItem[], currentId: string): string {
  if (phases.length === 0) return '';
  const idx = getActivePhaseIndex(phases, currentId);
  const prevIdx = Math.max(0, idx - 1);
  return phases[prevIdx].id;
}

export function addCustomPhase(
  phases: PhaseItem[],
  label?: string
): { updatedPhases: PhaseItem[]; newId: string } {
  const nextNum = phases.length + 1;
  let newId = `phase-custom-${Date.now()}`;
  while (phases.some(p => p.id === newId)) newId += "-next";
  const newPhase: PhaseItem = {
    id: newId,
    label: label?.trim() || `Phase ${nextNum}`,
    subtitle: 'Eigene Phase',
    icon: '📌',
  };
  return {
    updatedPhases: [...phases, newPhase],
    newId,
  };
}

export function removePhase(
  phases: PhaseItem[],
  idToRemove: string,
  activeId: string
): { updatedPhases: PhaseItem[]; newActiveId: string } {
  if (phases.length <= 1) {
    // Mindestens 1 Phase muss erhalten bleiben
    return { updatedPhases: phases, newActiveId: activeId };
  }
  const currentIdx = getActivePhaseIndex(phases, activeId);
  const filtered = phases.filter((p) => p.id !== idToRemove);

  let newActiveId = activeId;
  if (activeId === idToRemove) {
    const fallbackIdx = Math.min(currentIdx, filtered.length - 1);
    newActiveId = filtered[fallbackIdx].id;
  }

  return {
    updatedPhases: filtered,
    newActiveId,
  };
}

export function updatePhaseLabel(
  phases: PhaseItem[],
  id: string,
  newLabel: string
): PhaseItem[] {
  const trimmed = newLabel.trim();
  if (!trimmed) return phases;
  return phases.map((p) => (p.id === id ? { ...p, label: trimmed } : p));
}

/** Reject malformed restored entries and duplicate IDs before rendering or navigation. */
export function normalizeLessonPhases(raw: unknown): PhaseItem[] {
  const seen = new Set<string>();
  const phases: PhaseItem[] = [];
  if (Array.isArray(raw)) for (const item of raw) {
    if (!item || typeof item.id !== 'string' || !item.id.trim() || seen.has(item.id)
      || typeof item.label !== 'string' || !item.label.trim()) continue;
    seen.add(item.id);
    phases.push({ id: item.id, label: item.label.trim().slice(0, 80),
      subtitle: typeof item.subtitle === 'string' ? item.subtitle.slice(0, 120) : undefined,
      icon: typeof item.icon === 'string' ? item.icon.slice(0, 16) : undefined });
  }
  return phases.length ? phases : DEFAULT_LESSON_PHASES.map(p => ({...p}));
}

/** Derive a new phase/settings page synchronously, before any restore snapshot. */
export function getPhaseNavigationPage(navigation: {scope: string; page: number}, scope: string, activeIndex: number, pageSize: number, total: number): number {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const candidate = navigation.scope === scope && Number.isInteger(navigation.page)
    ? navigation.page : Math.floor(activeIndex / pageSize);
  return Math.max(0, Math.min(candidate, pageCount - 1));
}
