import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import type { TeacherIdentity } from './teacherIdentity';

export type SchoolInventoryStatus = 'available' | 'borrowed' | 'missing' | 'defective' | 'retired';
export type SchoolInventoryUnitType = 'single' | 'set' | 'box';

export interface SchoolInventoryLocation {
  id: string;
  name: string;
  subject?: string;
  room?: string;
  detail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolInventoryItem {
  id: string;
  inventoryNumber: string;
  name: string;
  subject?: string;
  locationId?: string;
  unitType: SchoolInventoryUnitType;
  quantity: number;
  notes?: string;
  status: SchoolInventoryStatus;
  borrowedByUserId?: string;
  borrowedByName?: string;
  borrowedAt?: string;
  lastInventoryCheckAt?: string;
  lastInventoryCheckBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolInventoryHistoryEntry {
  id: string;
  itemId: string;
  inventoryNumber: string;
  itemName: string;
  type: 'create' | 'update' | 'import' | 'borrow' | 'return' | 'status' | 'inventory_check';
  actorId: string;
  actorName: string;
  createdAt: string;
  detail?: string;
}

type SchoolInventoryData = {
  locations: SchoolInventoryLocation[];
  items: SchoolInventoryItem[];
  history: SchoolInventoryHistoryEntry[];
};

type StoreData = {
  version: 1;
  schools: Record<string, SchoolInventoryData>;
};

const EMPTY: StoreData = { version: 1, schools: {} };
const MAX_HISTORY = 5000;

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function normalizedKey(value: unknown): string {
  return cleanText(value, 120).toLocaleLowerCase('de-AT');
}

function validStatus(value: unknown): value is SchoolInventoryStatus {
  return value === 'available' || value === 'borrowed' || value === 'missing' || value === 'defective' || value === 'retired';
}

function validUnitType(value: unknown): value is SchoolInventoryUnitType {
  return value === 'single' || value === 'set' || value === 'box';
}

function positiveQuantity(value: unknown): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.max(1, Math.min(999, Math.round(number)));
}

function cloneEmpty(): StoreData {
  return { version: 1, schools: {} };
}

function schoolData(data: StoreData, schoolId: string): SchoolInventoryData {
  return data.schools[schoolId] || (data.schools[schoolId] = {
    locations: [],
    items: [],
    history: [],
  });
}

function addHistory(
  school: SchoolInventoryData,
  identity: TeacherIdentity,
  item: SchoolInventoryItem,
  type: SchoolInventoryHistoryEntry['type'],
  detail?: string,
): void {
  school.history.unshift({
    id: crypto.randomUUID(),
    itemId: item.id,
    inventoryNumber: item.inventoryNumber,
    itemName: item.name,
    type,
    actorId: identity.userId,
    actorName: identity.displayName,
    createdAt: new Date().toISOString(),
    ...(detail ? { detail } : {}),
  });
  if (school.history.length > MAX_HISTORY) school.history.length = MAX_HISTORY;
}

export class SchoolInventoryStore {
  private readonly filePath: string;
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, 'school-inventory.json');
  }

  private async read(): Promise<StoreData> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<StoreData>;
      if (parsed.version !== 1 || !parsed.schools || typeof parsed.schools !== 'object') {
        return cloneEmpty();
      }
      return { version: 1, schools: parsed.schools as Record<string, SchoolInventoryData> };
    } catch (error: any) {
      if (error?.code === 'ENOENT') return cloneEmpty();
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

  async snapshot(identity: TeacherIdentity) {
    const data = await this.read();
    const school = data.schools[identity.schoolId] || { locations: [], items: [], history: [] };
    return {
      school: {
        id: identity.schoolId,
        code: identity.schoolCode,
        name: identity.schoolName || identity.schoolCode,
      },
      me: {
        userId: identity.userId,
        displayName: identity.displayName,
      },
      locations: [...school.locations].sort((a, b) =>
        (a.subject || '').localeCompare(b.subject || '', 'de') || a.name.localeCompare(b.name, 'de')
      ),
      items: [...school.items].sort((a, b) =>
        a.inventoryNumber.localeCompare(b.inventoryNumber, 'de', { numeric: true })
      ),
      history: [...school.history].slice(0, 250),
    };
  }

  async createLocation(identity: TeacherIdentity, input: {
    name: unknown; subject?: unknown; room?: unknown; detail?: unknown;
  }): Promise<SchoolInventoryLocation> {
    const name = cleanText(input.name, 120);
    if (!name) throw new Error('INVALID_LOCATION');
    return this.mutate(data => {
      const school = schoolData(data, identity.schoolId);
      const room = cleanText(input.room, 80);
      const duplicate = school.locations.find(location =>
        normalizedKey(location.name) === normalizedKey(name) &&
        normalizedKey(location.room) === normalizedKey(room)
      );
      if (duplicate) return duplicate;
      const now = new Date().toISOString();
      const location: SchoolInventoryLocation = {
        id: crypto.randomUUID(),
        name,
        ...(cleanText(input.subject, 80) ? { subject: cleanText(input.subject, 80) } : {}),
        ...(room ? { room } : {}),
        ...(cleanText(input.detail, 120) ? { detail: cleanText(input.detail, 120) } : {}),
        createdAt: now,
        updatedAt: now,
      };
      school.locations.push(location);
      return location;
    });
  }

  async updateLocation(identity: TeacherIdentity, locationId: string, input: {
    name?: unknown; subject?: unknown; room?: unknown; detail?: unknown;
  }): Promise<SchoolInventoryLocation> {
    return this.mutate(data => {
      const school = schoolData(data, identity.schoolId);
      const location = school.locations.find(item => item.id === locationId);
      if (!location) throw new Error('LOCATION_NOT_FOUND');
      if (input.name !== undefined) {
        const name = cleanText(input.name, 120);
        if (!name) throw new Error('INVALID_LOCATION');
        location.name = name;
      }
      if (input.subject !== undefined) location.subject = cleanText(input.subject, 80) || undefined;
      if (input.room !== undefined) location.room = cleanText(input.room, 80) || undefined;
      if (input.detail !== undefined) location.detail = cleanText(input.detail, 120) || undefined;
      location.updatedAt = new Date().toISOString();
      return location;
    });
  }

  private ensureLocation(school: SchoolInventoryData, locationId: unknown): string | undefined {
    const id = cleanText(locationId, 80);
    if (!id) return undefined;
    if (!school.locations.some(location => location.id === id)) throw new Error('LOCATION_NOT_FOUND');
    return id;
  }

  async createItem(identity: TeacherIdentity, input: {
    inventoryNumber: unknown; name: unknown; subject?: unknown; locationId?: unknown;
    unitType?: unknown; quantity?: unknown; notes?: unknown;
  }): Promise<SchoolInventoryItem> {
    const inventoryNumber = cleanText(input.inventoryNumber, 80);
    const name = cleanText(input.name, 180);
    if (!inventoryNumber || !name) throw new Error('INVALID_ITEM');
    return this.mutate(data => {
      const school = schoolData(data, identity.schoolId);
      if (school.items.some(item => normalizedKey(item.inventoryNumber) === normalizedKey(inventoryNumber))) {
        throw new Error('INVENTORY_NUMBER_EXISTS');
      }
      const now = new Date().toISOString();
      const item: SchoolInventoryItem = {
        id: crypto.randomUUID(),
        inventoryNumber,
        name,
        ...(cleanText(input.subject, 80) ? { subject: cleanText(input.subject, 80) } : {}),
        ...(this.ensureLocation(school, input.locationId) ? { locationId: this.ensureLocation(school, input.locationId) } : {}),
        unitType: validUnitType(input.unitType) ? input.unitType : 'single',
        quantity: positiveQuantity(input.quantity),
        ...(cleanText(input.notes, 500) ? { notes: cleanText(input.notes, 500) } : {}),
        status: 'available',
        createdAt: now,
        updatedAt: now,
      };
      school.items.push(item);
      addHistory(school, identity, item, 'create');
      return item;
    });
  }

  async updateItem(identity: TeacherIdentity, itemId: string, input: {
    inventoryNumber?: unknown; name?: unknown; subject?: unknown; locationId?: unknown;
    unitType?: unknown; quantity?: unknown; notes?: unknown;
  }): Promise<SchoolInventoryItem> {
    return this.mutate(data => {
      const school = schoolData(data, identity.schoolId);
      const item = school.items.find(entry => entry.id === itemId);
      if (!item) throw new Error('ITEM_NOT_FOUND');

      if (input.inventoryNumber !== undefined) {
        const next = cleanText(input.inventoryNumber, 80);
        if (!next) throw new Error('INVALID_ITEM');
        const duplicate = school.items.some(entry =>
          entry.id !== item.id && normalizedKey(entry.inventoryNumber) === normalizedKey(next)
        );
        if (duplicate) throw new Error('INVENTORY_NUMBER_EXISTS');
        item.inventoryNumber = next;
      }
      if (input.name !== undefined) {
        const next = cleanText(input.name, 180);
        if (!next) throw new Error('INVALID_ITEM');
        item.name = next;
      }
      if (input.subject !== undefined) item.subject = cleanText(input.subject, 80) || undefined;
      if (input.locationId !== undefined) item.locationId = this.ensureLocation(school, input.locationId);
      if (input.unitType !== undefined && validUnitType(input.unitType)) item.unitType = input.unitType;
      if (input.quantity !== undefined) item.quantity = positiveQuantity(input.quantity);
      if (input.notes !== undefined) item.notes = cleanText(input.notes, 500) || undefined;
      item.updatedAt = new Date().toISOString();
      addHistory(school, identity, item, 'update');
      return item;
    });
  }

  async borrow(identity: TeacherIdentity, itemId: string): Promise<SchoolInventoryItem> {
    return this.mutate(data => {
      const school = schoolData(data, identity.schoolId);
      const item = school.items.find(entry => entry.id === itemId);
      if (!item) throw new Error('ITEM_NOT_FOUND');
      if (item.status === 'borrowed' && item.borrowedByUserId === identity.userId) return item;
      if (item.status !== 'available') throw new Error('ITEM_NOT_AVAILABLE');
      const now = new Date().toISOString();
      item.status = 'borrowed';
      item.borrowedByUserId = identity.userId;
      item.borrowedByName = identity.displayName;
      item.borrowedAt = now;
      item.updatedAt = now;
      addHistory(school, identity, item, 'borrow');
      return item;
    });
  }

  async returnItem(identity: TeacherIdentity, itemId: string): Promise<SchoolInventoryItem> {
    return this.mutate(data => {
      const school = schoolData(data, identity.schoolId);
      const item = school.items.find(entry => entry.id === itemId);
      if (!item) throw new Error('ITEM_NOT_FOUND');
      if (item.status !== 'borrowed') return item;
      item.status = 'available';
      item.borrowedByUserId = undefined;
      item.borrowedByName = undefined;
      item.borrowedAt = undefined;
      item.updatedAt = new Date().toISOString();
      addHistory(school, identity, item, 'return');
      return item;
    });
  }

  async setStatus(identity: TeacherIdentity, itemId: string, rawStatus: unknown): Promise<SchoolInventoryItem> {
    if (!validStatus(rawStatus)) throw new Error('INVALID_STATUS');
    return this.mutate(data => {
      const school = schoolData(data, identity.schoolId);
      const item = school.items.find(entry => entry.id === itemId);
      if (!item) throw new Error('ITEM_NOT_FOUND');
      if (rawStatus === 'borrowed') throw new Error('USE_BORROW_ACTION');
      item.status = rawStatus;
      item.borrowedByUserId = undefined;
      item.borrowedByName = undefined;
      item.borrowedAt = undefined;
      item.updatedAt = new Date().toISOString();
      addHistory(school, identity, item, 'status', rawStatus);
      return item;
    });
  }

  async checkItem(identity: TeacherIdentity, itemId: string): Promise<SchoolInventoryItem> {
    return this.mutate(data => {
      const school = schoolData(data, identity.schoolId);
      const item = school.items.find(entry => entry.id === itemId);
      if (!item) throw new Error('ITEM_NOT_FOUND');
      const now = new Date().toISOString();
      item.lastInventoryCheckAt = now;
      item.lastInventoryCheckBy = identity.displayName;
      item.updatedAt = now;
      addHistory(school, identity, item, 'inventory_check');
      return item;
    });
  }

  async importItems(identity: TeacherIdentity, rawRows: unknown, duplicateMode: unknown) {
    if (!Array.isArray(rawRows) || rawRows.length === 0 || rawRows.length > 5000) {
      throw new Error('INVALID_IMPORT');
    }
    const mode = duplicateMode === 'update' ? 'update' : 'skip';

    return this.mutate(data => {
      const school = schoolData(data, identity.schoolId);
      let imported = 0;
      let updated = 0;
      let skipped = 0;
      const errors: Array<{ row: number; message: string }> = [];

      const findOrCreateLocation = (nameRaw: unknown, subjectRaw: unknown, roomRaw: unknown): string | undefined => {
        const name = cleanText(nameRaw, 120);
        if (!name) return undefined;
        const room = cleanText(roomRaw, 80);
        let location = school.locations.find(entry =>
          normalizedKey(entry.name) === normalizedKey(name) &&
          (!room || normalizedKey(entry.room) === normalizedKey(room))
        );
        if (!location) {
          const now = new Date().toISOString();
          location = {
            id: crypto.randomUUID(),
            name,
            ...(cleanText(subjectRaw, 80) ? { subject: cleanText(subjectRaw, 80) } : {}),
            ...(room ? { room } : {}),
            createdAt: now,
            updatedAt: now,
          };
          school.locations.push(location);
        }
        return location.id;
      };

      rawRows.forEach((raw: any, index) => {
        const inventoryNumber = cleanText(raw?.inventoryNumber, 80);
        const name = cleanText(raw?.name, 180);
        if (!inventoryNumber || !name) {
          errors.push({ row: index + 1, message: 'Inventarnummer oder Bezeichnung fehlt.' });
          return;
        }
        const existing = school.items.find(item =>
          normalizedKey(item.inventoryNumber) === normalizedKey(inventoryNumber)
        );
        const locationId = findOrCreateLocation(raw?.locationName, raw?.subject, raw?.room);
        const subject = cleanText(raw?.subject, 80) || undefined;
        const notes = cleanText(raw?.notes, 500) || undefined;
        const unitType: SchoolInventoryUnitType = validUnitType(raw?.unitType) ? raw.unitType : 'single';
        const quantity = positiveQuantity(raw?.quantity);

        if (existing) {
          if (mode === 'skip') {
            skipped += 1;
            return;
          }
          existing.name = name;
          if (subject) existing.subject = subject;
          if (locationId) existing.locationId = locationId;
          existing.unitType = unitType;
          existing.quantity = quantity;
          if (notes) existing.notes = notes;
          existing.updatedAt = new Date().toISOString();
          addHistory(school, identity, existing, 'import', 'updated');
          updated += 1;
          return;
        }

        const now = new Date().toISOString();
        const item: SchoolInventoryItem = {
          id: crypto.randomUUID(),
          inventoryNumber,
          name,
          ...(subject ? { subject } : {}),
          ...(locationId ? { locationId } : {}),
          unitType,
          quantity,
          ...(notes ? { notes } : {}),
          status: 'available',
          createdAt: now,
          updatedAt: now,
        };
        school.items.push(item);
        addHistory(school, identity, item, 'import', 'created');
        imported += 1;
      });

      return { imported, updated, skipped, errors: errors.slice(0, 100) };
    });
  }
}

export function createSchoolInventoryStore(dataDir: string): SchoolInventoryStore {
  return new SchoolInventoryStore(dataDir);
}
