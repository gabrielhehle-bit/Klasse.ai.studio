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
  const newId = `phase-custom-${Date.now()}`;
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
