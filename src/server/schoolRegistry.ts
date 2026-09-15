import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export const AUSTRIAN_FEDERAL_STATES = [
  'Burgenland',
  'Kärnten',
  'Niederösterreich',
  'Oberösterreich',
  'Salzburg',
  'Steiermark',
  'Tirol',
  'Vorarlberg',
  'Wien',
] as const;

export type AustrianFederalState = typeof AUSTRIAN_FEDERAL_STATES[number];
export type SchoolVerificationStatus = 'verified' | 'pending' | 'rejected';

export interface SchoolRecord {
  id: string;
  code: string;
  name: string;
  country: 'AT';
  federalState: AustrianFederalState | 'Unbekannt';
  domains: string[];
  status: 'verified';
  createdAt: string;
  updatedAt: string;
}

export interface SchoolVerificationRequest {
  id: string;
  requestedByEmail: string;
  emailDomain: string;
  schoolName: string;
  federalState: AustrianFederalState;
  status: Exclude<SchoolVerificationStatus, 'verified'> | 'verified';
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
}

type RegistryData = {
  version: 1;
  schools: SchoolRecord[];
  requests: SchoolVerificationRequest[];
};

const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'icloud.com',
  'me.com',
  'yahoo.com',
  'yahoo.de',
  'gmx.at',
  'gmx.de',
  'gmx.net',
  'web.de',
  'aon.at',
]);

function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^@/, '').replace(/\.$/, '');
}

function emailDomain(email: string): string {
  return normalizeDomain((email.trim().toLowerCase().split('@')[1] || ''));
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : '';
}

function isFederalState(value: unknown): value is AustrianFederalState {
  return typeof value === 'string' && (AUSTRIAN_FEDERAL_STATES as readonly string[]).includes(value);
}

function schoolCodeFromDomain(domain: string): string {
  const first = normalizeDomain(domain).split('.')[0] || 'schule';
  return first.replace(/[^a-z0-9-]/g, '').slice(0, 24) || 'schule';
}

function schoolIdFromDomain(domain: string): string {
  return 'at-' + crypto.createHash('sha256').update(normalizeDomain(domain)).digest('hex').slice(0, 16);
}

function cloneEmpty(): RegistryData {
  return { version: 1, schools: [], requests: [] };
}

export function isPublicEmailDomain(domain: string): boolean {
  return PUBLIC_EMAIL_DOMAINS.has(normalizeDomain(domain));
}

export class SchoolRegistryStore {
  private readonly filePath: string;
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, 'school-registry.json');
  }

  private async read(): Promise<RegistryData> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<RegistryData>;
      if (parsed.version !== 1 || !Array.isArray(parsed.schools) || !Array.isArray(parsed.requests)) return cloneEmpty();
      return {
        version: 1,
        schools: parsed.schools,
        requests: parsed.requests,
      };
    } catch (error: any) {
      if (error?.code === 'ENOENT') return cloneEmpty();
      throw error;
    }
  }

  private async write(data: RegistryData): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true, mode: 0o700 });
    const tmp = this.filePath + '.tmp-' + process.pid;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
    await fs.rename(tmp, this.filePath);
  }

  private mutate<T>(fn: (data: RegistryData) => T | Promise<T>): Promise<T> {
    const task = this.writeQueue.then(async () => {
      const data = await this.read();
      const result = await fn(data);
      await this.write(data);
      return result;
    });
    this.writeQueue = task.then(() => undefined, () => undefined);
    return task;
  }

  async ensureSeedSchools(seedSchools: Array<Omit<SchoolRecord, 'createdAt' | 'updatedAt'>>): Promise<void> {
    if (!seedSchools.length) return;
    await this.mutate(data => {
      const now = new Date().toISOString();
      for (const seed of seedSchools) {
        const domains = [...new Set(seed.domains.map(normalizeDomain).filter(Boolean))];
        if (!domains.length) continue;
        const existing = data.schools.find(school => school.id === seed.id || school.domains.some(domain => domains.includes(domain)));
        if (existing) continue;
        data.schools.push({ ...seed, domains, createdAt: now, updatedAt: now });
      }
    });
  }

  async ensureLegacyDomains(domains: string[]): Promise<void> {
    const normalized = [...new Set(domains.map(normalizeDomain).filter(Boolean))];
    if (!normalized.length) return;
    await this.mutate(data => {
      const now = new Date().toISOString();
      for (const domain of normalized) {
        if (data.schools.some(school => school.domains.includes(domain))) continue;
        data.schools.push({
          id: schoolIdFromDomain(domain),
          code: schoolCodeFromDomain(domain),
          name: domain,
          country: 'AT',
          federalState: domain.endsWith('.vobs.at') || domain === 'vobs.at' ? 'Vorarlberg' : 'Unbekannt',
          domains: [domain],
          status: 'verified',
          createdAt: now,
          updatedAt: now,
        });
      }
    });
  }

  async findVerifiedSchoolByDomain(domain: string): Promise<SchoolRecord | null> {
    const normalized = normalizeDomain(domain);
    if (!normalized) return null;
    const data = await this.read();
    return data.schools.find(school => school.status === 'verified' && school.domains.includes(normalized)) || null;
  }

  async findVerifiedSchoolByEmail(email: string): Promise<SchoolRecord | null> {
    return this.findVerifiedSchoolByDomain(emailDomain(email));
  }

  async listVerifiedSchools(): Promise<SchoolRecord[]> {
    const data = await this.read();
    return [...data.schools].sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }

  async listRequestsForDomain(domain: string): Promise<SchoolVerificationRequest[]> {
    const normalized = normalizeDomain(domain);
    const data = await this.read();
    return data.requests
      .filter(request => request.emailDomain === normalized)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async requestVerification(input: {
    requestedByEmail: string;
    schoolName: unknown;
    federalState: unknown;
  }): Promise<SchoolVerificationRequest> {
    const email = input.requestedByEmail.trim().toLowerCase();
    const domain = emailDomain(email);
    const schoolName = cleanText(input.schoolName, 160);
    if (!domain || !schoolName || !isFederalState(input.federalState)) throw new Error('INVALID_REQUEST');
    if (isPublicEmailDomain(domain)) throw new Error('PUBLIC_EMAIL_DOMAIN');

    const alreadyVerified = await this.findVerifiedSchoolByDomain(domain);
    if (alreadyVerified) throw new Error('ALREADY_VERIFIED');

    return this.mutate(data => {
      const active = data.requests.find(request => request.emailDomain === domain && request.status === 'pending');
      if (active) return active;

      const now = new Date().toISOString();
      const request: SchoolVerificationRequest = {
        id: crypto.randomUUID(),
        requestedByEmail: email,
        emailDomain: domain,
        schoolName,
        federalState: input.federalState,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };
      data.requests.push(request);
      return request;
    });
  }

  async approveRequest(requestId: string): Promise<{ request: SchoolVerificationRequest; school: SchoolRecord }> {
    return this.mutate(data => {
      const request = data.requests.find(item => item.id === requestId);
      if (!request) throw new Error('REQUEST_NOT_FOUND');

      const existing = data.schools.find(school => school.domains.includes(request.emailDomain));
      if (existing) {
        request.status = 'verified';
        request.reviewedAt = request.reviewedAt || new Date().toISOString();
        request.updatedAt = new Date().toISOString();
        return { request, school: existing };
      }

      const now = new Date().toISOString();
      const school: SchoolRecord = {
        id: schoolIdFromDomain(request.emailDomain),
        code: schoolCodeFromDomain(request.emailDomain),
        name: request.schoolName,
        country: 'AT',
        federalState: request.federalState,
        domains: [request.emailDomain],
        status: 'verified',
        createdAt: now,
        updatedAt: now,
      };
      data.schools.push(school);
      request.status = 'verified';
      request.reviewedAt = now;
      request.updatedAt = now;
      return { request, school };
    });
  }

  async rejectRequest(requestId: string): Promise<SchoolVerificationRequest> {
    return this.mutate(data => {
      const request = data.requests.find(item => item.id === requestId);
      if (!request) throw new Error('REQUEST_NOT_FOUND');
      const now = new Date().toISOString();
      request.status = 'rejected';
      request.reviewedAt = now;
      request.updatedAt = now;
      return request;
    });
  }
}

export function createSchoolRegistryStore(dataDir: string): SchoolRegistryStore {
  return new SchoolRegistryStore(dataDir);
}
