import type { AppState } from '../types';

export const AI_IMAGE_PRIVACY_ERROR =
  'Bildanalyse blockiert: Bitte bestätige zuerst, dass Namen und andere personenbezogene Angaben im Bild unkenntlich gemacht wurden.';

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
    !/^image\/(jpeg|png|webp)$/i.test(imageBase64.mimeType)
  ) {
    return 'Bildanalyse blockiert: Ungültiges Bildformat.';
  }
  return null;
}
