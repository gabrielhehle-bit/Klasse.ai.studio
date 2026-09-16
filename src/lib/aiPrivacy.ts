import type { AppState } from '../types';

export const AI_IMAGE_PRIVACY_ERROR =
  'Bildanalyse blockiert: Bitte bestätige zuerst, dass Namen und andere personenbezogene Angaben im Bild unkenntlich gemacht wurden.';

export const MAX_AI_IMAGE_BYTES = 8 * 1024 * 1024;

export function validateAiImagePrivacy(
  imageBase64: { data: string; mimeType: string } | undefined,
  confirmed: boolean,
): string | null {
  if (!imageBase64) return null;
  return confirmed ? null : AI_IMAGE_PRIVACY_ERROR;
}

export function buildAiClassContext(
  app: Pick<AppState, 'stufe' | 'bundesland' | 'schueler' | 'currentKW' | 'wochenplanung'>,
): string {
  const currentWeek = app.currentKW;
  const weekPlan = currentWeek ? app.wochenplanung?.[currentWeek] : undefined;
  const weekTopics: string[] = [];

  if (weekPlan && typeof weekPlan === 'object') {
    Object.entries(weekPlan).forEach(([day, cells]: [string, any]) => {
      if (!cells || typeof cells !== 'object') return;
      Object.values(cells).forEach((cell: any) => {
        if (!cell?.thema && !cell?.fach) return;
        const summary = [day, cell?.fach, cell?.thema].filter(Boolean).join(' – ');
        if (summary && !weekTopics.includes(summary)) weekTopics.push(summary);
      });
    });
  }

  return `\n\n[KLASSIO-KLASSENKONTEXT – ohne automatisch übermittelte Schülernamen]
Schulstufe: ${app.stufe || 'nicht angegeben'}
Bundesland: ${app.bundesland || 'nicht angegeben'}
Klassengröße: ${(app.schueler || []).length}
Aktuelle Kalenderwoche: ${currentWeek || 'nicht angegeben'}
Wochenplanthemen:
${weekTopics.slice(0, 12).map(topic => `- ${topic}`).join('\n') || '- keine Themen hinterlegt'}`;
}

export function buildAiLearningGoalContext(
  app: Pick<AppState, 'lernzielTracker' | 'studentLernzielBewertungen'>,
): string {
  const tracker = app.lernzielTracker || {};
  const classProgress: string[] = [];

  Object.entries(tracker).forEach(([fach, goals]) => {
    const goalLines = Object.values(goals || {}).map(goal => {
      const state = goal.abgehakt ? 'erreicht' : 'offen';
      return `- ${state}: ${goal.text}`;
    });
    if (goalLines.length > 0) {
      classProgress.push(`Fach ${fach}:\n${goalLines.join('\n')}`);
    }
  });

  let totalRatings = 0;
  let fullyReached = 0;
  let partlyReached = 0;
  let minimallyReached = 0;

  Object.values(app.studentLernzielBewertungen || {}).forEach(studentRatings => {
    Object.values(studentRatings || {}).forEach(value => {
      if (typeof value !== 'number') return;
      totalRatings += 1;
      if (value === 1) fullyReached += 1;
      if (value === 2) partlyReached += 1;
      if (value === 3) minimallyReached += 1;
    });
  });

  return `\n\n[KLASSIO-LERNZIELKONTEXT – ausschließlich aggregiert, ohne Schülernamen]
Aktuelle Ziele im Klassen-Tracker:
${classProgress.join('\n') || 'Keine Ziele definiert.'}

Aggregierte Einschätzungen:
- Bewertungen gesamt: ${totalRatings}
- voll erreicht: ${fullyReached}
- teilweise erreicht: ${partlyReached}
- minimal erreicht: ${minimallyReached}`;
}

export function getAiChatHistoryKey(activeClassId: string | undefined, tab: string): string {
  return `${activeClassId || 'unassigned'}::${tab}`;
}

export function getAiChatHistory<T>(
  aiChats: Record<string, T[]> | undefined,
  activeClassId: string | undefined,
  tab: string,
  classCount: number,
): T[] {
  const scoped = aiChats?.[getAiChatHistoryKey(activeClassId, tab)] || [];
  if (scoped.length > 0) return scoped;

  // Legacy compatibility: a global pre-multiclass history can only be shown
  // when there is at most one class. With multiple classes its origin is ambiguous.
  if (classCount <= 1) {
    return aiChats?.[tab] || [];
  }
  return [];
}

function estimateBase64DecodedBytes(data: string): number {
  const compact = data.replace(/\s/g, '');
  if (!compact) return 0;
  const padding = compact.endsWith('==') ? 2 : compact.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((compact.length * 3) / 4) - padding);
}

export function validateAiServerImageRequest(
  action: string,
  imageBase64: { data?: unknown; mimeType?: unknown } | undefined,
  confirmed: boolean,
): string | null {
  if (!imageBase64) return null;
  if (action !== 'askAI') return 'Bildanhänge sind für diese KI-Aktion nicht zulässig.';
  if (!confirmed) return 'Bildanalyse blockiert: Datenschutzbestätigung fehlt.';
  if (
    typeof imageBase64.data !== 'string' ||
    typeof imageBase64.mimeType !== 'string' ||
    !/^image\/(jpeg|png|webp)$/i.test(imageBase64.mimeType) ||
    imageBase64.data.trim().length === 0
  ) {
    return 'Bildanalyse blockiert: Ungültiges Bildformat.';
  }
  if (estimateBase64DecodedBytes(imageBase64.data) > MAX_AI_IMAGE_BYTES) {
    return 'Bildanalyse blockiert: Bild zu groß (max. 8 MB).';
  }
  return null;
}
