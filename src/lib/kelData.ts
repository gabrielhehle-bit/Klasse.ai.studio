import type { KELGespraech } from '../types';

const asRecord = (value: unknown): Record<string, any> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};

const asString = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value);

export function normalizeKelMeeting(
  raw: unknown,
  fallbackSchoolYear = '',
  index = 0,
): KELGespraech {
  const source = asRecord(raw);
  const studentId = asString(source.schuelerId || source.studentId);
  const date = asString(source.datum || source.date);
  const stableFallbackId = `legacy-kel-${studentId || 'unknown'}-${date || index}`;

  return {
    ...source,
    id: asString(source.id) || stableFallbackId,
    schuelerId: studentId,
    datum: date,
    schuljahr: asString(source.schuljahr) || fallbackSchoolYear,
    teilnehmer: Array.isArray(source.teilnehmer)
      ? source.teilnehmer.map(asString).filter(Boolean)
      : [],
    selbsteinschaetzungKind: asRecord(source.selbsteinschaetzungKind),
    einschaetzungLehrperson: asRecord(source.einschaetzungLehrperson),
    elternEindruck: asString(source.elternEindruck),
    zieleKind: Array.isArray(source.zieleKind) ? source.zieleKind : [],
    vereinbarungen: asString(source.vereinbarungen),
    naechsterTermin: asString(source.naechsterTermin),
    unterschriftKind: source.unterschriftKind === true,
    unterschriftEltern: source.unterschriftEltern === true,
    unterschriftLehrperson: source.unterschriftLehrperson === true,
    notiz: asString(source.notiz),
  } as KELGespraech;
}

export function normalizeKelMeetings(
  value: unknown,
  fallbackSchoolYear = '',
): KELGespraech[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(item => item && typeof item === 'object')
    .map((item, index) => normalizeKelMeeting(item, fallbackSchoolYear, index));
}
