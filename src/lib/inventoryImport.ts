export type InventoryImportRecord = {
  inventoryNumber: string;
  name: string;
  subject: string;
  location: string;
  room: string;
  quantity: number;
  condition: string;
  note: string;
};

type HeaderKey = keyof InventoryImportRecord;

const HEADER_ALIASES: Record<HeaderKey, string[]> = {
  inventoryNumber: ['inventarnummer', 'inventar nummer', 'inventar-nr', 'inventarnr', 'nr', 'nummer', 'id', 'etikett', 'kennung'],
  name: ['bezeichnung', 'lehrmittel', 'material', 'gegenstand', 'name', 'titel', 'beschreibung'],
  subject: ['fach', 'gegenstandsbereich', 'bereich', 'kategorie'],
  location: ['standort', 'kasten', 'schrank', 'lagerort', 'ablage', 'ort'],
  room: ['raum', 'zimmer', 'raum nr', 'raumnummer'],
  quantity: ['anzahl', 'menge', 'stück', 'stueck', 'bestand', 'gesamt'],
  condition: ['zustand', 'status', 'condition'],
  note: ['notiz', 'bemerkung', 'hinweis', 'kommentar'],
};

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function quantity(value: unknown): number {
  const parsed = typeof value === 'number'
    ? value
    : Number.parseInt(normalizeText(value).replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(9999, Math.round(parsed)) : 1;
}

function scoreHeader(header: string, alias: string): number {
  const h = normalizeHeader(header);
  const a = normalizeHeader(alias);
  if (!h || !a) return 0;
  if (h === a) return 100;
  if (h.startsWith(a) || a.startsWith(h)) return 80;
  if (h.includes(a) || a.includes(h)) return 60;
  const hParts = new Set(h.split(' '));
  const aParts = a.split(' ');
  const overlap = aParts.filter(part => hParts.has(part)).length;
  return overlap ? 20 + overlap * 10 : 0;
}

export function detectInventoryColumns(headers: string[]): Partial<Record<HeaderKey, string>> {
  const result: Partial<Record<HeaderKey, string>> = {};
  const used = new Set<string>();

  (Object.keys(HEADER_ALIASES) as HeaderKey[]).forEach(key => {
    let bestHeader = '';
    let bestScore = 0;
    for (const header of headers) {
      if (used.has(header)) continue;
      for (const alias of HEADER_ALIASES[key]) {
        const score = scoreHeader(header, alias);
        if (score > bestScore) {
          bestScore = score;
          bestHeader = header;
        }
      }
    }
    if (bestHeader && bestScore >= 50) {
      result[key] = bestHeader;
      used.add(bestHeader);
    }
  });

  return result;
}

export function mapInventoryRows(
  rows: Array<Record<string, unknown>>,
  mapping?: Partial<Record<HeaderKey, string>>,
): InventoryImportRecord[] {
  if (!rows.length) return [];
  const headers = [...new Set(rows.flatMap(row => Object.keys(row)))];
  const resolved = mapping || detectInventoryColumns(headers);

  return rows.map(row => ({
    inventoryNumber: normalizeText(resolved.inventoryNumber ? row[resolved.inventoryNumber] : ''),
    name: normalizeText(resolved.name ? row[resolved.name] : ''),
    subject: normalizeText(resolved.subject ? row[resolved.subject] : ''),
    location: normalizeText(resolved.location ? row[resolved.location] : ''),
    room: normalizeText(resolved.room ? row[resolved.room] : ''),
    quantity: quantity(resolved.quantity ? row[resolved.quantity] : 1),
    condition: normalizeText(resolved.condition ? row[resolved.condition] : ''),
    note: normalizeText(resolved.note ? row[resolved.note] : ''),
  })).filter(record => record.name || record.inventoryNumber);
}

function splitLine(line: string): string[] {
  // Explicit table delimiters must preserve empty cells, otherwise a blank
  // subject/location column shifts every following value into the wrong field.
  if (line.includes('\t')) return line.split('\t').map(part => part.trim());
  if (line.includes(';')) return line.split(';').map(part => part.trim());
  if (line.includes('|')) return line.split('|').map(part => part.trim());
  return line.split(/\s{2,}/).map(part => part.trim()).filter(Boolean);
}

export function parseInventoryText(text: string): InventoryImportRecord[] {
  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const firstCells = splitLine(lines[0]);
  const headerMapping = detectInventoryColumns(firstCells);
  const detectedHeaderCount = Object.keys(headerMapping).length;

  if (detectedHeaderCount >= 2) {
    const rows = lines.slice(1).map(line => {
      const cells = splitLine(line);
      const row: Record<string, string> = {};
      firstCells.forEach((header, index) => {
        row[header] = cells[index] || '';
      });
      return row;
    });
    return mapInventoryRows(rows, headerMapping);
  }

  const records: InventoryImportRecord[] = [];
  for (const line of lines) {
    const cells = splitLine(line);
    if (!cells.length) continue;

    let inventoryNumber = '';
    let name = '';
    let qty = 1;

    const first = cells[0];
    if (/^(?:[A-Za-z]{0,5}[-_/]?)?\d{1,10}[A-Za-z0-9._/-]*$/.test(first)) {
      inventoryNumber = first;
      name = cells.slice(1).join(' ');
    } else {
      name = cells.join(' ');
    }

    const qtyMatch = name.match(/(?:^|\s)(\d{1,4})\s*(?:x|stk\.?|stueck|stück)\s*$/i);
    if (qtyMatch) {
      qty = quantity(qtyMatch[1]);
      name = name.slice(0, qtyMatch.index).trim();
    }

    if (!name) continue;
    records.push({
      inventoryNumber,
      name,
      subject: '',
      location: '',
      room: '',
      quantity: qty,
      condition: '',
      note: '',
    });
  }

  return records;
}

export function uniqueImportRecords(records: InventoryImportRecord[]): InventoryImportRecord[] {
  const seen = new Set<string>();
  return records.filter(record => {
    const key = record.inventoryNumber
      ? 'n:' + record.inventoryNumber.toLowerCase()
      : 'm:' + [record.name, record.location, record.subject].join('|').toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(record.name);
  });
}
