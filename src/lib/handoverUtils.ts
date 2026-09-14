import type { MaterialItem, VertretungsStundenbild } from '../types';

export function materialToHandoverLessonPlan(item: MaterialItem): VertretungsStundenbild | null {
  if (item.typ !== 'stundenentwurf') return null;

  return {
    id: item.id,
    titel: item.titel,
    fach: item.faecher?.[0] || 'Unterricht',
    schulstufen: Array.isArray(item.schulstufen) ? item.schulstufen : [],
    dauer: Number.isFinite(Number(item.dauer)) && Number(item.dauer) > 0 ? Number(item.dauer) : 45,
    schwierigkeit: item.schwierigkeit || 'mittel',
    beschreibung: item.beschreibung || item.inhaltText || '',
    benoetigtesMaterial: Array.isArray(item.benoetigtesMaterial) ? item.benoetigtesMaterial : [],
    lernziel: item.lernziel || '',
    tags: Array.isArray(item.tags) ? item.tags : [],
    erstelltAm: item.erstelltAm,
    zuletztVerwendet: item.zuletztVerwendet,
    istEigeneVorlage: item.istEigeneVorlage ?? item.quelleModul === 'uebergabemappe',
  };
}

export function getHandoverLessonPlans(items: MaterialItem[] | undefined): VertretungsStundenbild[] {
  return (items || [])
    .map(materialToHandoverLessonPlan)
    .filter((item): item is VertretungsStundenbild => item !== null);
}

export function getHandoverLessonTime(
  configuredTimes: Record<number, string> | undefined,
  fallbackTimes: Record<number, string>,
  slot: number,
): string {
  return configuredTimes?.[slot] || fallbackTimes[slot] || '—';
}

export function formatTransferGradeValue(
  value: number | string | null | undefined,
  mode: 'grades' | 'percent' | 'points',
): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string') return value;
  if (!Number.isFinite(value)) return '—';

  if (mode === 'grades') {
    return value.toLocaleString('de-AT', { maximumFractionDigits: 2 });
  }

  return `${value.toLocaleString('de-AT', { maximumFractionDigits: 1 })} %`;
}
