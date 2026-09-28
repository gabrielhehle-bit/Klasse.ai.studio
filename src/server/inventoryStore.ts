import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import type { TeacherIdentity } from './teacherIdentity';

export type InventoryCondition = 'ok' | 'beschaedigt' | 'fehlt' | 'wartung';

export interface InventoryLocation {
  id: string;
  schoolId: string;
  name: string;
  subject: string;
  room: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  schoolId: string;
  inventoryNumber: string;
  name: string;
  subject: string;
  locationId: string | null;
  quantity: number;
  condition: InventoryCondition;
  note: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface InventoryLoan {
  id: string;
  schoolId: string;
  itemId: string;
  borrowerUserId: string;
  borrowerName: string;
  quantity: number;
  borrowedAt: string;
  dueAt: string | null;
  returnedAt: string | null;
  createdBy: string;
  returnedBy: string | null;
}

export interface InventoryHistoryEntry {
  id: string;
  schoolId: string;
  type: 'item-created' | 'item-updated' | 'item-deleted' | 'location-created' | 'location-updated' | 'loan-created' | 'loan-returned' | 'import';
  actorUserId: string;
  actorName: string;
  itemId?: string;
  locationId?: string;
  loanId?: string;
  message: string;
  createdAt: string;
}

export interface InventoryImportRecord {
  inventoryNumber?: unknown;
  name?: unknown;
  subject?: unknown;
  location?: unknown;
  room?: unknown;
  quantity?: unknown;
  condition?: unknown;
  note?: unknown;
}

type SchoolInventory = {
  items: InventoryItem[];
  locations: InventoryLocation[];
  loans: InventoryLoan[];
  history: InventoryHistoryEntry[];
};

type StoreData = {
  version: 1;
  schools: Record<string, SchoolInventory>;
};

const MAX_HISTORY = 1500;

function emptyData(): StoreData {
  return { version: 1, schools: {} };
}

function cleanText(value: unknown, max = 160): string {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').slice(0, max)
    : value === null || value === undefined
      ? ''
      : String(value).trim().replace(/\s+/g, ' ').slice(0, max);
}

function cleanInventoryNumber(value: unknown): string {
  return cleanText(value, 80).replace(/[^0-9A-Za-zÄÖÜäöüß._/-]+/g, '-').replace(/^-+|-+$/g, '');
}

function normalizeQuantity(value: unknown, fallback = 1): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(9999, Math.round(parsed)));
}

function normalizeCondition(value: unknown): InventoryCondition {
  const raw = cleanText(value, 40).toLowerCase();
  if (raw.includes('besch') || raw.includes('defekt')) return 'beschaedigt';
  if (raw.includes('fehl') || raw.includes('verlor')) return 'fehlt';
  if (raw.includes('wart') || raw.includes('repar')) return 'wartung';
  return 'ok';
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export class InventoryStore {
  private readonly filePath: string;
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, 'lehrmittel-inventar.json');
  }

  private async read(): Promise<StoreData> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<StoreData>;
      if (parsed.version !== 1 || !parsed.schools || typeof parsed.schools !== 'object') return emptyData();
      return { version: 1, schools: parsed.schools as Record<string, SchoolInventory> };
    } catch (error: any) {
      if (error?.code === 'ENOENT') return emptyData();
      throw error;
    }
  }

  private async write(data: StoreData): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true, mode: 0o700 });
    const tempPath = this.filePath + '.tmp-' + process.pid;
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
    await fs.rename(tempPath, this.filePath);
  }

  private mutate<T>(fn: (data: StoreData) => T | Promise<T>): Promise<T> {
    const task = this.writeQueue.then(async () => {
      const data = await this.read();
      const result = await fn(data);
      await this.write(data);
      return result;
    });
    this.writeQueue = task.then(() => undefined, () => undefined);
    return task;
  }

  private school(data: StoreData, schoolId: string): SchoolInventory {
    return data.schools[schoolId] || (data.schools[schoolId] = {
      items: [],
      locations: [],
      loans: [],
      history: [],
    });
  }

  private addHistory(school: SchoolInventory, entry: Omit<InventoryHistoryEntry, 'id' | 'createdAt'>) {
    school.history.unshift({
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    });
    if (school.history.length > MAX_HISTORY) school.history.length = MAX_HISTORY;
  }

  async snapshot(identity: TeacherIdentity) {
    const data = await this.read();
    const school = this.school(data, identity.schoolId);
    return {
      school: {
        id: identity.schoolId,
        code: identity.schoolCode,
        name: identity.schoolName,
        federalState: identity.schoolFederalState,
        domain: identity.schoolDomain,
      },
      user: {
        userId: identity.userId,
        displayName: identity.displayName,
      },
      items: clone(school.items),
      locations: clone(school.locations),
      loans: clone(school.loans),
      history: clone(school.history.slice(0, 250)),
    };
  }

  async createLocation(identity: TeacherIdentity, input: { name: unknown; subject?: unknown; room?: unknown; note?: unknown }) {
    const name = cleanText(input.name, 120);
    if (!name) throw new Error('INVALID_LOCATION');
    return this.mutate(data => {
      const school = this.school(data, identity.schoolId);
      const duplicate = school.locations.find(location => location.name.localeCompare(name, 'de', { sensitivity: 'base' }) === 0);
      if (duplicate) return clone(duplicate);
      const now = new Date().toISOString();
      const location: InventoryLocation = {
        id: crypto.randomUUID(),
        schoolId: identity.schoolId,
        name,
        subject: cleanText(input.subject, 80),
        room: cleanText(input.room, 80),
        note: cleanText(input.note, 500),
        createdAt: now,
        updatedAt: now,
      };
      school.locations.push(location);
      this.addHistory(school, {
        schoolId: identity.schoolId,
        type: 'location-created',
        actorUserId: identity.userId,
        actorName: identity.displayName,
        locationId: location.id,
        message: `Standort „${location.name}“ angelegt.`,
      });
      return clone(location);
    });
  }

  async updateLocation(identity: TeacherIdentity, locationId: string, input: { name: unknown; subject?: unknown; room?: unknown; note?: unknown }) {
    const name = cleanText(input.name, 120);
    if (!name) throw new Error('INVALID_LOCATION');
    return this.mutate(data => {
      const school = this.school(data, identity.schoolId);
      const location = school.locations.find(item => item.id === locationId);
      if (!location) throw new Error('LOCATION_NOT_FOUND');
      location.name = name;
      location.subject = cleanText(input.subject, 80);
      location.room = cleanText(input.room, 80);
      location.note = cleanText(input.note, 500);
      location.updatedAt = new Date().toISOString();
      this.addHistory(school, {
        schoolId: identity.schoolId,
        type: 'location-updated',
        actorUserId: identity.userId,
        actorName: identity.displayName,
        locationId: location.id,
        message: `Standort „${location.name}“ aktualisiert.`,
      });
      return clone(location);
    });
  }

  async createItem(identity: TeacherIdentity, input: InventoryImportRecord & { locationId?: unknown }) {
    const name = cleanText(input.name, 180);
    if (!name) throw new Error('INVALID_ITEM');
    const inventoryNumber = cleanInventoryNumber(input.inventoryNumber);
    return this.mutate(data => {
      const school = this.school(data, identity.schoolId);
      if (inventoryNumber && school.items.some(item => item.inventoryNumber.toLowerCase() === inventoryNumber.toLowerCase())) {
        throw new Error('INVENTORY_NUMBER_EXISTS');
      }
      const locationId = cleanText(input.locationId, 80);
      if (locationId && !school.locations.some(location => location.id === locationId)) throw new Error('LOCATION_NOT_FOUND');
      const now = new Date().toISOString();
      const item: InventoryItem = {
        id: crypto.randomUUID(),
        schoolId: identity.schoolId,
        inventoryNumber,
        name,
        subject: cleanText(input.subject, 80),
        locationId: locationId || null,
        quantity: normalizeQuantity(input.quantity),
        condition: normalizeCondition(input.condition),
        note: cleanText(input.note, 500),
        createdAt: now,
        updatedAt: now,
        updatedBy: identity.userId,
      };
      school.items.push(item);
      this.addHistory(school, {
        schoolId: identity.schoolId,
        type: 'item-created',
        actorUserId: identity.userId,
        actorName: identity.displayName,
        itemId: item.id,
        message: `${item.inventoryNumber ? item.inventoryNumber + ' · ' : ''}${item.name} angelegt.`,
      });
      return clone(item);
    });
  }

  async updateItem(identity: TeacherIdentity, itemId: string, input: InventoryImportRecord & { locationId?: unknown }) {
    const name = cleanText(input.name, 180);
    if (!name) throw new Error('INVALID_ITEM');
    const inventoryNumber = cleanInventoryNumber(input.inventoryNumber);
    return this.mutate(data => {
      const school = this.school(data, identity.schoolId);
      const item = school.items.find(entry => entry.id === itemId);
      if (!item) throw new Error('ITEM_NOT_FOUND');
      if (inventoryNumber && school.items.some(entry => entry.id !== itemId && entry.inventoryNumber.toLowerCase() === inventoryNumber.toLowerCase())) {
        throw new Error('INVENTORY_NUMBER_EXISTS');
      }
      const locationId = cleanText(input.locationId, 80);
      if (locationId && !school.locations.some(location => location.id === locationId)) throw new Error('LOCATION_NOT_FOUND');
      item.inventoryNumber = inventoryNumber;
      item.name = name;
      item.subject = cleanText(input.subject, 80);
      item.locationId = locationId || null;
      item.quantity = normalizeQuantity(input.quantity, item.quantity);
      item.condition = normalizeCondition(input.condition);
      item.note = cleanText(input.note, 500);
      item.updatedAt = new Date().toISOString();
      item.updatedBy = identity.userId;
      this.addHistory(school, {
        schoolId: identity.schoolId,
        type: 'item-updated',
        actorUserId: identity.userId,
        actorName: identity.displayName,
        itemId: item.id,
        message: `${item.inventoryNumber ? item.inventoryNumber + ' · ' : ''}${item.name} aktualisiert.`,
      });
      return clone(item);
    });
  }

  async deleteItem(identity: TeacherIdentity, itemId: string) {
    return this.mutate(data => {
      const school = this.school(data, identity.schoolId);
      if (school.loans.some(loan => loan.itemId === itemId && !loan.returnedAt)) throw new Error('ITEM_ON_LOAN');
      const index = school.items.findIndex(item => item.id === itemId);
      if (index < 0) throw new Error('ITEM_NOT_FOUND');
      const [item] = school.items.splice(index, 1);
      this.addHistory(school, {
        schoolId: identity.schoolId,
        type: 'item-deleted',
        actorUserId: identity.userId,
        actorName: identity.displayName,
        itemId,
        message: `${item.inventoryNumber ? item.inventoryNumber + ' · ' : ''}${item.name} entfernt.`,
      });
    });
  }

  async importRecords(identity: TeacherIdentity, records: unknown) {
    if (!Array.isArray(records)) throw new Error('INVALID_IMPORT');
    const rawRecords = records.slice(0, 5000) as InventoryImportRecord[];
    return this.mutate(data => {
      const school = this.school(data, identity.schoolId);
      let created = 0;
      let updated = 0;
      let skipped = 0;
      let locationsCreated = 0;

      for (const raw of rawRecords) {
        const name = cleanText(raw?.name, 180);
        if (!name) {
          skipped += 1;
          continue;
        }
        const locationName = cleanText(raw?.location, 120);
        const subject = cleanText(raw?.subject, 80);
        const room = cleanText(raw?.room, 80);
        let location: InventoryLocation | undefined;
        if (locationName) {
          location = school.locations.find(entry => entry.name.localeCompare(locationName, 'de', { sensitivity: 'base' }) === 0);
          if (!location) {
            const now = new Date().toISOString();
            location = {
              id: crypto.randomUUID(),
              schoolId: identity.schoolId,
              name: locationName,
              subject,
              room,
              note: '',
              createdAt: now,
              updatedAt: now,
            };
            school.locations.push(location);
            locationsCreated += 1;
          }
        }

        const inventoryNumber = cleanInventoryNumber(raw?.inventoryNumber);
        const existing = inventoryNumber
          ? school.items.find(item => item.inventoryNumber.toLowerCase() === inventoryNumber.toLowerCase())
          : undefined;
        const now = new Date().toISOString();

        if (existing) {
          existing.name = name;
          existing.subject = subject || existing.subject;
          existing.locationId = location?.id || existing.locationId;
          existing.quantity = normalizeQuantity(raw?.quantity, existing.quantity);
          existing.condition = normalizeCondition(raw?.condition ?? existing.condition);
          existing.note = cleanText(raw?.note, 500) || existing.note;
          existing.updatedAt = now;
          existing.updatedBy = identity.userId;
          updated += 1;
        } else {
          school.items.push({
            id: crypto.randomUUID(),
            schoolId: identity.schoolId,
            inventoryNumber,
            name,
            subject,
            locationId: location?.id || null,
            quantity: normalizeQuantity(raw?.quantity),
            condition: normalizeCondition(raw?.condition),
            note: cleanText(raw?.note, 500),
            createdAt: now,
            updatedAt: now,
            updatedBy: identity.userId,
          });
          created += 1;
        }
      }

      this.addHistory(school, {
        schoolId: identity.schoolId,
        type: 'import',
        actorUserId: identity.userId,
        actorName: identity.displayName,
        message: `Import: ${created} neu, ${updated} aktualisiert, ${skipped} übersprungen, ${locationsCreated} Standorte angelegt.`,
      });

      return { created, updated, skipped, locationsCreated };
    });
  }

  async createLoan(identity: TeacherIdentity, input: {
    itemId: unknown;
    borrowerUserId?: unknown;
    borrowerName?: unknown;
    quantity?: unknown;
    dueAt?: unknown;
  }) {
    const itemId = cleanText(input.itemId, 80);
    if (!itemId) throw new Error('INVALID_LOAN');
    return this.mutate(data => {
      const school = this.school(data, identity.schoolId);
      const item = school.items.find(entry => entry.id === itemId);
      if (!item) throw new Error('ITEM_NOT_FOUND');
      if (item.condition === 'fehlt') throw new Error('ITEM_UNAVAILABLE');

      const quantity = normalizeQuantity(input.quantity);
      const alreadyLoaned = school.loans
        .filter(loan => loan.itemId === item.id && !loan.returnedAt)
        .reduce((sum, loan) => sum + loan.quantity, 0);
      if (alreadyLoaned + quantity > item.quantity) throw new Error('ITEM_UNAVAILABLE');

      const requestedBorrowerName = cleanText(input.borrowerName, 120);
      const requestedBorrowerUserId = cleanText(input.borrowerUserId, 120);
      const borrowerName = requestedBorrowerName || identity.displayName;
      const borrowerUserId = requestedBorrowerUserId || (requestedBorrowerName ? '' : identity.userId);
      const dueAtRaw = cleanText(input.dueAt, 80);
      const dueDate = dueAtRaw ? new Date(dueAtRaw) : null;
      const dueAt = dueDate && Number.isFinite(dueDate.getTime()) ? dueDate.toISOString() : null;
      const now = new Date().toISOString();
      const loan: InventoryLoan = {
        id: crypto.randomUUID(),
        schoolId: identity.schoolId,
        itemId: item.id,
        borrowerUserId,
        borrowerName,
        quantity,
        borrowedAt: now,
        dueAt,
        returnedAt: null,
        createdBy: identity.userId,
        returnedBy: null,
      };
      school.loans.unshift(loan);
      this.addHistory(school, {
        schoolId: identity.schoolId,
        type: 'loan-created',
        actorUserId: identity.userId,
        actorName: identity.displayName,
        itemId: item.id,
        loanId: loan.id,
        message: `${borrowerName} hat ${quantity}× ${item.name} ausgeliehen.`,
      });
      return clone(loan);
    });
  }

  async returnLoan(identity: TeacherIdentity, loanId: string) {
    return this.mutate(data => {
      const school = this.school(data, identity.schoolId);
      const loan = school.loans.find(entry => entry.id === loanId);
      if (!loan) throw new Error('LOAN_NOT_FOUND');
      if (loan.returnedAt) return clone(loan);
      const item = school.items.find(entry => entry.id === loan.itemId);
      loan.returnedAt = new Date().toISOString();
      loan.returnedBy = identity.userId;
      this.addHistory(school, {
        schoolId: identity.schoolId,
        type: 'loan-returned',
        actorUserId: identity.userId,
        actorName: identity.displayName,
        itemId: loan.itemId,
        loanId: loan.id,
        message: `${loan.borrowerName} hat ${loan.quantity}× ${item?.name || 'Lehrmittel'} zurückgegeben.`,
      });
      return clone(loan);
    });
  }
}

export function createInventoryStore(dataDir: string): InventoryStore {
  return new InventoryStore(dataDir);
}
