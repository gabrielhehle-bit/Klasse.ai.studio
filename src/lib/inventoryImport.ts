export type InventoryImportField =
  | 'inventoryNumber'
  | 'name'
  | 'subject'
  | 'locationName'
  | 'room'
  | 'quantity'
  | 'notes';

export type InventoryColumnMapping = Partial<Record<InventoryImportField, number>>;

export interface InventoryImportCandidate {
  inventoryNumber: string;
  name: string;
  subject?: string;
  locationName?: string;
  room?: string;
  quantity?: number;
  notes?: string;
}

const HEADER_ALIASES: Record<InventoryImportField, string[]> = {
  inventoryNumber: ['inventarnummer', 'inventar nummer', 'inventar-nr', 'inventar nr', 'inv nr', 'inv-nr', 'nummer', 'nr'],
  name: ['bezeichnung', 'gegenstand', 'lehrmittel', 'material', 'name', 'titel', 'artikel'],
  subject: ['fach', 'gegenstand fach', 'bereich', 'unterrichtsfach'],
  locationName: ['standort', 'kasten', 'schrank', 'lagerort', 'ort', 'aufbewahrung'],
  room: ['raum', 'zimmer', 'raum nr', 'raum-nr'],
  quantity: ['anzahl', 'menge', 'stück', 'stueck', 'stk', 'quantity'],
  notes: ['bemerkung', 'bemerkungen', 'notiz', 'notizen', 'hinweis', 'beschreibung'],
};

export function normalizeInventoryHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('de-AT')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[._/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectInventoryColumnMapping(headers: unknown[]): InventoryColumnMapping {
  const normalized = headers.map(normalizeInventoryHeader);
  const mapping: InventoryColumnMapping = {};
  (Object.keys(HEADER_ALIASES) as InventoryImportField[]).forEach(field => {
    const aliases = HEADER_ALIASES[field].map(normalizeInventoryHeader);
    const exact = normalized.findIndex(header => aliases.includes(header));
    if (exact >= 0) {
      mapping[field] = exact;
      return;
    }
    const fuzzy = normalized.findIndex(header =>
      header && aliases.some(alias => header.includes(alias) || alias.includes(header))
    );
    if (fuzzy >= 0) mapping[field] = fuzzy;
  });
  return mapping;
}

function cell(row: unknown[], index: number | undefined): string {
  if (index === undefined) return '';
  return String(row[index] ?? '').trim();
}

export function rowsToInventoryCandidates(
  rows: unknown[][],
  mapping: InventoryColumnMapping,
): InventoryImportCandidate[] {
  if (mapping.inventoryNumber === undefined || mapping.name === undefined) return [];
  return rows
    .map(row => {
      const inventoryNumber = cell(row, mapping.inventoryNumber);
      const name = cell(row, mapping.name);
      if (!inventoryNumber && !name) return null;
      const rawQuantity = cell(row, mapping.quantity);
      const numericQuantity = Number(rawQuantity.replace(',', '.'));
      return {
        inventoryNumber,
        name,
        ...(cell(row, mapping.subject) ? { subject: cell(row, mapping.subject) } : {}),
        ...(cell(row, mapping.locationName) ? { locationName: cell(row, mapping.locationName) } : {}),
        ...(cell(row, mapping.room) ? { room: cell(row, mapping.room) } : {}),
        ...(Number.isFinite(numericQuantity) && numericQuantity > 0 ? { quantity: Math.round(numericQuantity) } : {}),
        ...(cell(row, mapping.notes) ? { notes: cell(row, mapping.notes) } : {}),
      } satisfies InventoryImportCandidate;
    })
    .filter((row): row is InventoryImportCandidate => Boolean(row?.inventoryNumber && row?.name));
}

function splitLine(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map(value => value.trim());
  if (line.includes(';')) return line.split(';').map(value => value.trim());
  if (line.includes('|')) return line.split('|').map(value => value.trim());
  return line.split(/\s{2,}/).map(value => value.trim());
}

export function parseInventoryText(text: string): InventoryImportCandidate[] {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (!lines.length) return [];

  const firstCells = splitLine(lines[0]);
  const detected = detectInventoryColumnMapping(firstCells);
  if (detected.inventoryNumber !== undefined && detected.name !== undefined) {
    return rowsToInventoryCandidates(lines.slice(1).map(splitLine), detected);
  }

  const candidates: InventoryImportCandidate[] = [];
  for (const line of lines) {
    const delimited = splitLine(line);
    if (delimited.length >= 2) {
      const [inventoryNumber, name, subject, locationName, room, quantity, ...notes] = delimited;
      if (inventoryNumber && name) {
        candidates.push({
          inventoryNumber,
          name,
          ...(subject ? { subject } : {}),
          ...(locationName ? { locationName } : {}),
          ...(room ? { room } : {}),
          ...(quantity && Number.isFinite(Number(quantity)) ? { quantity: Math.max(1, Math.round(Number(quantity))) } : {}),
          ...(notes.filter(Boolean).length ? { notes: notes.filter(Boolean).join(' ') } : {}),
        });
      }
      continue;
    }

    const match = line.match(/^\s*([A-Za-z0-9][A-Za-z0-9./_-]{0,39})\s*[-–—:]\s*(.+)$/);
    if (match) {
      candidates.push({ inventoryNumber: match[1].trim(), name: match[2].trim() });
    }
  }
  return candidates.filter(row => row.inventoryNumber && row.name);
}
