import crypto from 'node:crypto';

export interface TeacherIdentity {
  userId: string;
  email: string;
  schoolId: string;
  schoolCode: string;
  schoolDomain: string;
  displayName: string;
  handle: string;
}

function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^@/, '');
}

export function resolveSchoolDomain(email: string, allowedDomains: string[]): string | null {
  const domain = email.trim().toLowerCase().split('@')[1] || '';
  if (!domain) return null;

  const normalized = allowedDomains
    .map(normalizeDomain)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  return normalized.find(allowed => domain === allowed || domain.endsWith('.' + allowed)) || null;
}

function titleCasePart(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function displayNameFromEmail(email: string): string {
  const local = (email.split('@')[0] || '').trim();
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (!parts.length) return 'Lehrperson';
  return parts.map(titleCasePart).join(' ');
}

export function handleFromEmail(email: string): string {
  const local = (email.split('@')[0] || 'lehrperson').trim().toLowerCase();
  const cleaned = local
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return cleaned || 'lehrperson';
}

export function createTeacherIdentity(email: string, allowedDomains: string[]): TeacherIdentity | null {
  const normalizedEmail = email.trim().toLowerCase();
  const schoolDomain = resolveSchoolDomain(normalizedEmail, allowedDomains);
  if (!schoolDomain) return null;

  const schoolCode = schoolDomain.split('.')[0] || schoolDomain;
  const userId = crypto
    .createHash('sha256')
    .update('klassio-teacher:' + normalizedEmail)
    .digest('hex')
    .slice(0, 24);

  return {
    userId,
    email: normalizedEmail,
    schoolId: schoolDomain,
    schoolCode,
    schoolDomain,
    displayName: displayNameFromEmail(normalizedEmail),
    handle: handleFromEmail(normalizedEmail),
  };
}
