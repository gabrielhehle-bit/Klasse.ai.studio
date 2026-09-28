import React from 'react';
import {
  AlertTriangle,
  Archive,
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  Box,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  Loader2,
  MapPin,
  Package,
  Plus,
  Printer,
  QrCode,
  RotateCcw,
  Search,
  ShieldCheck,
  Upload,
  Wrench,
  X,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import { useToast } from '../context/ToastContext';
import {
  detectInventoryColumnMapping,
  parseInventoryText,
  rowsToInventoryCandidates,
  type InventoryColumnMapping,
  type InventoryImportCandidate,
} from '../lib/inventoryImport';

type InventoryStatus = 'available' | 'borrowed' | 'missing' | 'defective' | 'retired';
type InventoryUnitType = 'single' | 'set' | 'box';

interface InventoryLocation {
  id: string;
  name: string;
  subject?: string;
  room?: string;
  detail?: string;
  createdAt: string;
  updatedAt: string;
}

interface InventoryItem {
  id: string;
  inventoryNumber: string;
  name: string;
  subject?: string;
  locationId?: string;
  unitType: InventoryUnitType;
  quantity: number;
  notes?: string;
  status: InventoryStatus;
  borrowedByUserId?: string;
  borrowedByName?: string;
  borrowedAt?: string;
  lastInventoryCheckAt?: string;
  lastInventoryCheckBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface InventorySnapshot {
  school: { id: string; code: string; name: string };
  me: { userId: string; displayName: string };
  locations: InventoryLocation[];
  items: InventoryItem[];
  history: Array<{
    id: string;
    itemId: string;
    inventoryNumber: string;
    itemName: string;
    type: string;
    actorName: string;
    createdAt: string;
    detail?: string;
  }>;
}

const STATUS_LABELS: Record<InventoryStatus, string> = {
  available: 'Verfügbar',
  borrowed: 'Ausgeliehen',
  missing: 'Fehlt',
  defective: 'Defekt',
  retired: 'Ausgemustert',
};

const STATUS_CLASSES: Record<InventoryStatus, string> = {
  available: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  borrowed: 'border-sky-200 bg-sky-50 text-sky-700',
  missing: 'border-rose-200 bg-rose-50 text-rose-700',
  defective: 'border-amber-200 bg-amber-50 text-amber-800',
  retired: 'border-slate-200 bg-slate-100 text-slate-500',
};

const FIELD_LABELS: Array<{ key: keyof InventoryColumnMapping; label: string }> = [
  { key: 'inventoryNumber', label: 'Inventarnummer' },
  { key: 'name', label: 'Bezeichnung' },
  { key: 'subject', label: 'Fach' },
  { key: 'locationName', label: 'Kasten / Standort' },
  { key: 'room', label: 'Raum' },
  { key: 'quantity', label: 'Anzahl' },
  { key: 'notes', label: 'Bemerkung' },
];

function normalize(value: string | undefined): string {
  return (value || '').trim().toLocaleLowerCase('de-AT');
}

function formatDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

async function inventoryApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error: any = new Error(data?.error || 'Die Lehrmittelverwaltung konnte die Anfrage nicht ausführen.');
    error.status = response.status;
    error.requiresSchoolEmail = data?.requiresSchoolEmail;
    throw error;
  }
  return data as T;
}

export default function Lehrmittelverwaltung() {
  const { showToast } = useToast();
  const [snapshot, setSnapshot] = React.useState<InventorySnapshot | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [requiresSchoolIdentity, setRequiresSchoolIdentity] = React.useState(false);
  const [busyItemId, setBusyItemId] = React.useState<string | null>(null);

  const deepLinkedLocation = React.useMemo(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('inventoryLocation');
      const fromSession = sessionStorage.getItem('klassio_inventory_location');
      if (fromSession) sessionStorage.removeItem('klassio_inventory_location');
      return fromUrl || fromSession || '';
    } catch {
      return '';
    }
  }, []);

  const [search, setSearch] = React.useState('');
  const [quickCode, setQuickCode] = React.useState('');
  const [quickItemId, setQuickItemId] = React.useState<string | null>(null);
  const [locationFilter, setLocationFilter] = React.useState(deepLinkedLocation);
  const [statusFilter, setStatusFilter] = React.useState<'all' | InventoryStatus>('all');
  const [subjectFilter, setSubjectFilter] = React.useState('all');

  const [showLocationForm, setShowLocationForm] = React.useState(false);
  const [locationDraft, setLocationDraft] = React.useState({ name: '', subject: '', room: '', detail: '' });
  const [showItemForm, setShowItemForm] = React.useState(false);
  const [itemDraft, setItemDraft] = React.useState({
    inventoryNumber: '',
    name: '',
    subject: '',
    locationId: '',
    unitType: 'single' as InventoryUnitType,
    quantity: 1,
    notes: '',
  });

  const [showImport, setShowImport] = React.useState(false);
  const [importHeaders, setImportHeaders] = React.useState<string[]>([]);
  const [importBodyRows, setImportBodyRows] = React.useState<unknown[][]>([]);
  const [importMapping, setImportMapping] = React.useState<InventoryColumnMapping>({});
  const [importCandidates, setImportCandidates] = React.useState<InventoryImportCandidate[]>([]);
  const [pasteText, setPasteText] = React.useState('');
  const [duplicateMode, setDuplicateMode] = React.useState<'skip' | 'update'>('skip');
  const [importing, setImporting] = React.useState(false);

  const [inventoryMode, setInventoryMode] = React.useState(false);
  const [inventoryLocationId, setInventoryLocationId] = React.useState('');
  const [checkedThisSession, setCheckedThisSession] = React.useState<Set<string>>(() => new Set());
  const [printLocationId, setPrintLocationId] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      const data = await inventoryApi<InventorySnapshot>('/api/inventory');
      setSnapshot(data);
      setError(null);
      setRequiresSchoolIdentity(false);
    } catch (err: any) {
      setError(err?.message || 'Lehrmittel konnten nicht geladen werden.');
      setRequiresSchoolIdentity(Boolean(err?.requiresSchoolEmail || err?.status === 403));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const locationsById = React.useMemo(
    () => new Map((snapshot?.locations || []).map(location => [location.id, location])),
    [snapshot?.locations],
  );

  React.useEffect(() => {
    if (!snapshot || !locationFilter) return;
    if (!snapshot.locations.some(location => location.id === locationFilter)) {
      setLocationFilter('');
    }
  }, [snapshot, locationFilter]);

  const subjects = React.useMemo(() => {
    const values = new Set<string>();
    snapshot?.locations.forEach(location => { if (location.subject) values.add(location.subject); });
    snapshot?.items.forEach(item => { if (item.subject) values.add(item.subject); });
    return [...values].sort((a, b) => a.localeCompare(b, 'de'));
  }, [snapshot]);

  const filteredItems = React.useMemo(() => {
    if (!snapshot) return [];
    const query = normalize(search);
    return snapshot.items.filter(item => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (locationFilter && item.locationId !== locationFilter) return false;
      if (subjectFilter !== 'all' && item.subject !== subjectFilter) return false;
      if (!query) return true;
      const location = item.locationId ? locationsById.get(item.locationId) : undefined;
      const haystack = [
        item.inventoryNumber,
        item.name,
        item.subject,
        location?.name,
        location?.room,
        item.borrowedByName,
        item.notes,
      ].filter(Boolean).join(' ').toLocaleLowerCase('de-AT');
      return haystack.includes(query);
    });
  }, [snapshot, search, statusFilter, locationFilter, subjectFilter, locationsById]);

  const quickItem = snapshot?.items.find(item => item.id === quickItemId) || null;
  const myLoans = snapshot?.items.filter(item =>
    item.status === 'borrowed' && item.borrowedByUserId === snapshot.me.userId
  ) || [];

  const locationStats = React.useMemo(() => {
    const map = new Map<string, { total: number; borrowed: number; problem: number }>();
    snapshot?.locations.forEach(location => map.set(location.id, { total: 0, borrowed: 0, problem: 0 }));
    snapshot?.items.forEach(item => {
      if (!item.locationId || item.status === 'retired') return;
      const stats = map.get(item.locationId);
      if (!stats) return;
      stats.total += 1;
      if (item.status === 'borrowed') stats.borrowed += 1;
      if (item.status === 'missing' || item.status === 'defective') stats.problem += 1;
    });
    return map;
  }, [snapshot]);

  const actOnItem = async (item: InventoryItem, action: 'borrow' | 'return') => {
    setBusyItemId(item.id);
    try {
      await inventoryApi(`/api/inventory/items/${encodeURIComponent(item.id)}/${action}`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      showToast(action === 'borrow' ? `„${item.name}“ ist bei dir eingetragen.` : `„${item.name}“ wurde zurückgegeben.`, 'success');
      await refresh();
    } catch (err: any) {
      showToast(err?.message || 'Aktion fehlgeschlagen.', 'error');
    } finally {
      setBusyItemId(null);
    }
  };

  const setItemStatus = async (item: InventoryItem, status: Exclude<InventoryStatus, 'borrowed'>) => {
    setBusyItemId(item.id);
    try {
      await inventoryApi(`/api/inventory/items/${encodeURIComponent(item.id)}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      showToast(`Status von „${item.name}“ aktualisiert.`, 'success');
      await refresh();
    } catch (err: any) {
      showToast(err?.message || 'Status konnte nicht geändert werden.', 'error');
    } finally {
      setBusyItemId(null);
    }
  };

  const handleQuickLookup = () => {
    if (!snapshot) return;
    const code = normalize(quickCode);
    const match = snapshot.items.find(item => normalize(item.inventoryNumber) === code);
    if (!match) {
      setQuickItemId(null);
      showToast(`Inventarnummer „${quickCode.trim()}“ wurde nicht gefunden.`, 'error');
      return;
    }
    setQuickItemId(match.id);
    setSearch('');
    setLocationFilter('');
    setStatusFilter('all');
    setSubjectFilter('all');
  };

  const createLocation = async () => {
    if (!locationDraft.name.trim()) {
      showToast('Bitte einen Namen für den Kasten oder Standort eingeben.', 'error');
      return;
    }
    try {
      await inventoryApi('/api/inventory/locations', {
        method: 'POST',
        body: JSON.stringify(locationDraft),
      });
      setLocationDraft({ name: '', subject: '', room: '', detail: '' });
      setShowLocationForm(false);
      await refresh();
      showToast('Standort angelegt.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Standort konnte nicht angelegt werden.', 'error');
    }
  };

  const createItem = async () => {
    if (!itemDraft.inventoryNumber.trim() || !itemDraft.name.trim()) {
      showToast('Inventarnummer und Bezeichnung sind erforderlich.', 'error');
      return;
    }
    try {
      await inventoryApi('/api/inventory/items', {
        method: 'POST',
        body: JSON.stringify(itemDraft),
      });
      setItemDraft({
        inventoryNumber: '',
        name: '',
        subject: '',
        locationId: '',
        unitType: 'single',
        quantity: 1,
        notes: '',
      });
      setShowItemForm(false);
      await refresh();
      showToast('Lehrmittel angelegt.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Lehrmittel konnte nicht angelegt werden.', 'error');
    }
  };

  const handleSpreadsheet = async (file: File | null) => {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, defval: '' });
      if (!rows.length) throw new Error('Die Datei enthält keine lesbaren Zeilen.');
      const headers = (rows[0] || []).map(value => String(value ?? '').trim());
      const mapping = detectInventoryColumnMapping(headers);
      setImportHeaders(headers);
      setImportBodyRows(rows.slice(1));
      setImportMapping(mapping);
      setImportCandidates(rowsToInventoryCandidates(rows.slice(1), mapping));
      setPasteText('');
    } catch (err: any) {
      showToast(err?.message || 'Die Excel-/CSV-Datei konnte nicht gelesen werden.', 'error');
    }
  };

  React.useEffect(() => {
    if (!importBodyRows.length) return;
    setImportCandidates(rowsToInventoryCandidates(importBodyRows, importMapping));
  }, [importBodyRows, importMapping]);

  const handlePastePreview = () => {
    const rows = parseInventoryText(pasteText);
    setImportHeaders([]);
    setImportBodyRows([]);
    setImportMapping({});
    setImportCandidates(rows);
    if (!rows.length) {
      showToast('Keine eindeutigen Zeilen erkannt. Am sichersten: Inventarnummer – Bezeichnung, eine Zeile pro Lehrmittel.', 'error');
    }
  };

  const duplicateCount = React.useMemo(() => {
    if (!snapshot) return 0;
    const existing = new Set(snapshot.items.map(item => normalize(item.inventoryNumber)));
    return importCandidates.filter(row => existing.has(normalize(row.inventoryNumber))).length;
  }, [snapshot, importCandidates]);

  const runImport = async () => {
    if (!importCandidates.length) {
      showToast('Es gibt noch keine gültigen Importzeilen.', 'error');
      return;
    }
    setImporting(true);
    try {
      const result = await inventoryApi<{ imported: number; updated: number; skipped: number; errors: Array<{ row: number; message: string }> }>('/api/inventory/import', {
        method: 'POST',
        body: JSON.stringify({ rows: importCandidates, duplicateMode }),
      });
      await refresh();
      showToast(
        `${result.imported} neu, ${result.updated} aktualisiert, ${result.skipped} übersprungen.`,
        result.errors.length ? 'error' : 'success',
      );
      if (!result.errors.length) {
        setShowImport(false);
        setImportCandidates([]);
        setPasteText('');
      }
    } catch (err: any) {
      showToast(err?.message || 'Import fehlgeschlagen.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const exportExcel = () => {
    if (!snapshot) return;
    const rows = snapshot.items.map(item => {
      const location = item.locationId ? locationsById.get(item.locationId) : undefined;
      return {
        Inventarnummer: item.inventoryNumber,
        Bezeichnung: item.name,
        Fach: item.subject || '',
        Standort: location?.name || '',
        Raum: location?.room || '',
        Anzahl: item.quantity,
        Einheit: item.unitType === 'single' ? 'Einzelstück' : item.unitType === 'set' ? 'Set' : 'Box',
        Status: STATUS_LABELS[item.status],
        'Ausgeliehen an': item.borrowedByName || '',
        'Ausgeliehen seit': item.borrowedAt ? formatDate(item.borrowedAt) : '',
        Bemerkung: item.notes || '',
      };
    });
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Lehrmittel');
    XLSX.writeFile(book, `KLASSIO-Lehrmittel-${snapshot.school.code || 'Schule'}.xlsx`);
  };

  const markInventoried = async (item: InventoryItem) => {
    setBusyItemId(item.id);
    try {
      await inventoryApi(`/api/inventory/items/${encodeURIComponent(item.id)}/check`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setCheckedThisSession(prev => new Set([...prev, item.id]));
      await refresh();
    } catch (err: any) {
      showToast(err?.message || 'Inventurstatus konnte nicht gespeichert werden.', 'error');
    } finally {
      setBusyItemId(null);
    }
  };

  const inventoryItems = React.useMemo(
    () => (snapshot?.items || []).filter(item =>
      item.locationId === inventoryLocationId && item.status !== 'retired'
    ),
    [snapshot, inventoryLocationId],
  );

  const qrValueForLocation = (location: InventoryLocation) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/?inventoryLocation=${encodeURIComponent(location.id)}`;
  };

  const printLocation = (locationId: string) => {
    setPrintLocationId(locationId);
    window.setTimeout(() => window.print(), 80);
  };

  const printedLocation = snapshot?.locations.find(location => location.id === printLocationId);
  const printedItems = snapshot?.items.filter(item => item.locationId === printLocationId && item.status !== 'retired') || [];

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-bold text-[var(--text-secondary,var(--text2))]">
          <Loader2 size={20} className="animate-spin" /> Schulbestand wird geladen …
        </div>
      </div>
    );
  }

  if (error && !snapshot) {
    return (
      <div className="mx-auto max-w-3xl p-6 sm:p-10">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <AlertTriangle size={26} className="text-amber-600" />
          <h1 className="mt-3 text-xl font-black text-amber-950">Lehrmittel & Inventar</h1>
          <p className="mt-2 text-sm leading-relaxed text-amber-800">{error}</p>
          {requiresSchoolIdentity && (
            <p className="mt-3 text-xs font-bold leading-relaxed text-amber-700">
              Der Bestand ist schulweit. Deshalb ist eine verifizierte Schulidentität nötig, damit Lehrpersonen nur das Inventar ihrer eigenen Schule sehen.
            </p>
          )}
          <button type="button" onClick={() => { setLoading(true); void refresh(); }} className="mt-5 rounded-xl bg-amber-900 px-4 py-2.5 text-xs font-black text-white">
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  if (!snapshot) return null;

  const activeLocation = locationFilter ? locationsById.get(locationFilter) : undefined;
  const totalActive = snapshot.items.filter(item => item.status !== 'retired').length;
  const borrowedCount = snapshot.items.filter(item => item.status === 'borrowed').length;
  const problemCount = snapshot.items.filter(item => item.status === 'missing' || item.status === 'defective').length;

  return (
    <div className="min-h-full bg-[var(--surface-app,var(--bg))] p-4 sm:p-6 lg:p-8 print:p-0">
      <div className="mx-auto max-w-7xl space-y-6 print:hidden">
        <header className="rounded-[28px] border border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))] p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-[var(--accent-soft)] p-3 text-[var(--accent)]"><Boxes size={27} /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted,var(--text3))]">Schulweit · {snapshot.school.name}</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-[var(--text-primary,var(--text))]">Lehrmittel & Inventar</h1>
                <p className="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-[var(--text-secondary,var(--text2))]">
                  Suchen, ausleihen und zurückgeben ohne Verwaltungsumweg. Die Inventarliste bleibt trotzdem vollständig und für das Kollegium gemeinsam aktuell.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setShowImport(true)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default,var(--border))] px-3.5 py-2.5 text-xs font-black text-[var(--text-primary,var(--text))]">
                <Upload size={15} /> Import
              </button>
              <button type="button" onClick={exportExcel} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default,var(--border))] px-3.5 py-2.5 text-xs font-black text-[var(--text-primary,var(--text))]">
                <Download size={15} /> Excel
              </button>
              <button type="button" onClick={() => setInventoryMode(value => !value)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default,var(--border))] px-3.5 py-2.5 text-xs font-black text-[var(--text-primary,var(--text))]">
                <ClipboardCheck size={15} /> Inventur
              </button>
              <button type="button" onClick={() => setShowItemForm(true)} className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-3.5 py-2.5 text-xs font-black text-[var(--accent-text,#fff)]">
                <Plus size={15} /> Lehrmittel
              </button>
            </div>
          </div>
        </header>

        {activeLocation && (
          <div className="flex flex-col gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black text-sky-900">QR-Standort geöffnet: {activeLocation.name}</p>
              <p className="text-[11px] text-sky-700">{activeLocation.subject || 'ohne Fach'}{activeLocation.room ? ` · Raum ${activeLocation.room}` : ''}</p>
            </div>
            <button type="button" onClick={() => setLocationFilter('')} className="text-xs font-black text-sky-800">Alle Lehrmittel anzeigen</button>
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))] p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted,var(--text3))]">Bestand</p>
            <p className="mt-1 text-2xl font-black text-[var(--text-primary,var(--text))]">{totalActive}</p>
            <p className="text-xs text-[var(--text-secondary,var(--text2))]">aktive Lehrmittel</p>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-sky-700">Unterwegs</p>
            <p className="mt-1 text-2xl font-black text-sky-900">{borrowedCount}</p>
            <p className="text-xs text-sky-700">ausgeliehen</p>
          </div>
          <div className={`rounded-2xl border p-4 ${problemCount ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
            <p className={`text-[10px] font-black uppercase tracking-wider ${problemCount ? 'text-amber-700' : 'text-emerald-700'}`}>Zu klären</p>
            <p className={`mt-1 text-2xl font-black ${problemCount ? 'text-amber-900' : 'text-emerald-900'}`}>{problemCount}</p>
            <p className={`text-xs ${problemCount ? 'text-amber-700' : 'text-emerald-700'}`}>fehlend oder defekt</p>
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))] p-5 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
            <label className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted,var(--text3))]" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Lehrmittel, Inventarnummer, Fach, Kasten oder Person suchen …"
                className="h-12 w-full rounded-2xl border border-[var(--border-default,var(--border))] bg-[var(--surface-subtle,var(--surface2))] pl-11 pr-4 text-sm font-bold text-[var(--text-primary,var(--text))] outline-none focus:border-[var(--accent)]"
              />
            </label>
            <form
              onSubmit={event => { event.preventDefault(); handleQuickLookup(); }}
              className="flex gap-2"
            >
              <input
                value={quickCode}
                onChange={event => setQuickCode(event.target.value)}
                placeholder="Inventarnr. z. B. 2137"
                className="min-w-0 flex-1 rounded-xl border border-[var(--border-default,var(--border))] bg-[var(--surface-subtle,var(--surface2))] px-3 text-xs font-bold outline-none focus:border-[var(--accent)]"
              />
              <button type="submit" className="rounded-xl bg-[var(--accent)] px-3 text-xs font-black text-[var(--accent-text,#fff)]">Öffnen</button>
            </form>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <select value={subjectFilter} onChange={event => setSubjectFilter(event.target.value)} className="rounded-xl border border-[var(--border-default,var(--border))] bg-[var(--surface-subtle,var(--surface2))] px-3 py-2 text-xs font-bold">
              <option value="all">Alle Fächer</option>
              {subjects.map(subject => <option key={subject} value={subject}>{subject}</option>)}
            </select>
            <select value={locationFilter} onChange={event => setLocationFilter(event.target.value)} className="rounded-xl border border-[var(--border-default,var(--border))] bg-[var(--surface-subtle,var(--surface2))] px-3 py-2 text-xs font-bold">
              <option value="">Alle Standorte</option>
              {snapshot.locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as any)} className="rounded-xl border border-[var(--border-default,var(--border))] bg-[var(--surface-subtle,var(--surface2))] px-3 py-2 text-xs font-bold">
              <option value="all">Alle Status</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button type="button" onClick={() => setShowLocationForm(true)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default,var(--border))] px-3 py-2 text-xs font-black">
              <MapPin size={14} /> Standort anlegen
            </button>
          </div>
        </section>

        {quickItem && (
          <section className="rounded-3xl border-2 border-[var(--accent)] bg-[var(--accent-soft)] p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)]">Schnellzugriff · {quickItem.inventoryNumber}</p>
                <h2 className="mt-1 text-lg font-black text-[var(--text-primary,var(--text))]">{quickItem.name}</h2>
                <p className="mt-1 text-xs text-[var(--text-secondary,var(--text2))]">
                  {quickItem.subject || 'Ohne Fach'} · {quickItem.locationId ? locationsById.get(quickItem.locationId)?.name || 'Standort unbekannt' : 'Kein Standort'}
                </p>
                {quickItem.status === 'borrowed' && <p className="mt-2 text-xs font-black text-sky-800">Bei {quickItem.borrowedByName || 'einer Lehrperson'} seit {formatDate(quickItem.borrowedAt)}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {quickItem.status === 'available' && (
                  <button type="button" onClick={() => actOnItem(quickItem, 'borrow')} disabled={busyItemId === quickItem.id} className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-black text-[var(--accent-text,#fff)]">
                    <ArrowUpRight size={17} /> Ausleihen
                  </button>
                )}
                {quickItem.status === 'borrowed' && (
                  <button type="button" onClick={() => actOnItem(quickItem, 'return')} disabled={busyItemId === quickItem.id} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white">
                    <ArrowDownLeft size={17} /> Zurückgeben
                  </button>
                )}
                <button type="button" onClick={() => setQuickItemId(null)} className="rounded-xl border border-[var(--border-default,var(--border))] px-4 py-3 text-xs font-black">Schließen</button>
              </div>
            </div>
          </section>
        )}

        {myLoans.length > 0 && (
          <section className="rounded-3xl border border-sky-200 bg-sky-50 p-5">
            <h2 className="flex items-center gap-2 text-sm font-black text-sky-950"><Package size={17} /> Meine Ausleihen</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {myLoans.map(item => (
                <button key={item.id} type="button" onClick={() => setQuickItemId(item.id)} className="rounded-xl border border-sky-200 bg-white px-3 py-3 text-left">
                  <p className="text-xs font-black text-sky-950">{item.name}</p>
                  <p className="mt-1 text-[10px] font-bold text-sky-700">{item.inventoryNumber} · seit {formatDate(item.borrowedAt)}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {inventoryMode && (
          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Inventurmodus</p>
                <h2 className="mt-1 text-lg font-black text-emerald-950">Kasten durchgehen und nur abhaken</h2>
              </div>
              <select value={inventoryLocationId} onChange={event => { setInventoryLocationId(event.target.value); setCheckedThisSession(new Set()); }} className="rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-xs font-black text-emerald-950">
                <option value="">Standort auswählen …</option>
                {snapshot.locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
              </select>
            </div>
            {inventoryLocationId && (
              <>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-white px-4 py-3 text-xs font-bold text-emerald-900">
                  <span>{checkedThisSession.size} / {inventoryItems.length} in dieser Runde bestätigt</span>
                  <span>{inventoryItems.length - checkedThisSession.size} offen</span>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {inventoryItems.map(item => {
                    const checked = checkedThisSession.has(item.id);
                    return (
                      <button key={item.id} type="button" onClick={() => !checked && markInventoried(item)} disabled={checked || busyItemId === item.id} className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-left ${checked ? 'border-emerald-300 bg-emerald-100' : 'border-emerald-200 bg-white'}`}>
                        <span>
                          <span className="block text-xs font-black text-emerald-950">{item.inventoryNumber} · {item.name}</span>
                          <span className="mt-0.5 block text-[10px] text-emerald-700">{STATUS_LABELS[item.status]}</span>
                        </span>
                        {checked ? <CheckCircle2 size={18} className="text-emerald-600" /> : <span className="text-[10px] font-black text-emerald-800">Vorhanden</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        )}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted,var(--text3))]">Bestand</p>
                <h2 className="text-lg font-black text-[var(--text-primary,var(--text))]">{plural(filteredItems.length, 'Treffer', 'Treffer')}</h2>
              </div>
            </div>
            {filteredItems.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))] p-8 text-center">
                <BookOpen size={28} className="mx-auto text-[var(--text-muted,var(--text3))]" />
                <p className="mt-3 text-sm font-black text-[var(--text-primary,var(--text))]">Nichts gefunden</p>
                <p className="mt-1 text-xs text-[var(--text-secondary,var(--text2))]">Suche ändern oder den Bestand per Excel/Liste importieren.</p>
              </div>
            ) : filteredItems.map(item => {
              const location = item.locationId ? locationsById.get(item.locationId) : undefined;
              return (
                <article key={item.id} className="rounded-2xl border border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))] p-4 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-[var(--surface-subtle,var(--surface2))] px-2 py-1 text-[10px] font-black text-[var(--text-secondary,var(--text2))]">{item.inventoryNumber}</span>
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${STATUS_CLASSES[item.status]}`}>{STATUS_LABELS[item.status]}</span>
                        {item.quantity > 1 && <span className="text-[10px] font-bold text-[var(--text-muted,var(--text3))]">{item.quantity} Stück</span>}
                      </div>
                      <h3 className="mt-2 truncate text-sm font-black text-[var(--text-primary,var(--text))]">{item.name}</h3>
                      <p className="mt-1 text-xs text-[var(--text-secondary,var(--text2))]">
                        {[item.subject, location?.name, location?.room ? `Raum ${location.room}` : ''].filter(Boolean).join(' · ') || 'Noch ohne Standort'}
                      </p>
                      {item.status === 'borrowed' && <p className="mt-2 text-xs font-black text-sky-700">Bei {item.borrowedByName || 'Lehrperson'} · seit {formatDate(item.borrowedAt)}</p>}
                      {item.notes && <p className="mt-2 text-[11px] text-[var(--text-muted,var(--text3))]">{item.notes}</p>}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {item.status === 'available' && (
                        <button type="button" disabled={busyItemId === item.id} onClick={() => actOnItem(item, 'borrow')} className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-3 py-2.5 text-xs font-black text-[var(--accent-text,#fff)]">
                          <ArrowUpRight size={14} /> Ausleihen
                        </button>
                      )}
                      {item.status === 'borrowed' && (
                        <button type="button" disabled={busyItemId === item.id} onClick={() => actOnItem(item, 'return')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-black text-white">
                          <ArrowDownLeft size={14} /> Zurück
                        </button>
                      )}
                      {item.status === 'missing' && (
                        <button type="button" disabled={busyItemId === item.id} onClick={() => setItemStatus(item, 'available')} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2.5 text-xs font-black text-emerald-700">
                          <RotateCcw size={14} /> Gefunden
                        </button>
                      )}
                      {item.status === 'defective' && (
                        <button type="button" disabled={busyItemId === item.id} onClick={() => setItemStatus(item, 'available')} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2.5 text-xs font-black text-emerald-700">
                          <CheckCircle2 size={14} /> Wieder OK
                        </button>
                      )}
                      {item.status !== 'borrowed' && item.status !== 'retired' && (
                        <details className="relative">
                          <summary className="cursor-pointer list-none rounded-xl border border-[var(--border-default,var(--border))] px-3 py-2.5 text-xs font-black text-[var(--text-secondary,var(--text2))]">Stimmt nicht</summary>
                          <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))] p-2 shadow-xl">
                            <button type="button" onClick={() => setItemStatus(item, 'missing')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold hover:bg-[var(--surface-subtle,var(--surface2))]"><AlertTriangle size={13} /> Fehlt</button>
                            <button type="button" onClick={() => setItemStatus(item, 'defective')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold hover:bg-[var(--surface-subtle,var(--surface2))]"><Wrench size={13} /> Defekt</button>
                            <button type="button" onClick={() => setItemStatus(item, 'retired')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold hover:bg-[var(--surface-subtle,var(--surface2))]"><Archive size={13} /> Ausmustern</button>
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))] p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted,var(--text3))]">Physische Ordnung</p>
                  <h2 className="mt-1 text-base font-black text-[var(--text-primary,var(--text))]">Kästen & Standorte</h2>
                </div>
                <QrCode size={20} className="text-[var(--accent)]" />
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-secondary,var(--text2))]">
                Jeder Standort bekommt automatisch einen QR-Code. Aufkleben oder auf die Kastenliste drucken – beim Scannen öffnet KLASSIO genau diesen Bestand.
              </p>
              <div className="mt-4 space-y-2">
                {snapshot.locations.map(location => {
                  const stats = locationStats.get(location.id) || { total: 0, borrowed: 0, problem: 0 };
                  return (
                    <div key={location.id} className="rounded-xl border border-[var(--border-default,var(--border))] p-3">
                      <button type="button" onClick={() => setLocationFilter(location.id)} className="w-full text-left">
                        <p className="text-xs font-black text-[var(--text-primary,var(--text))]">{location.name}</p>
                        <p className="mt-0.5 text-[10px] text-[var(--text-muted,var(--text3))]">{[location.subject, location.room ? `Raum ${location.room}` : ''].filter(Boolean).join(' · ') || 'Ohne Zusatz'}</p>
                        <p className="mt-2 text-[10px] font-bold text-[var(--text-secondary,var(--text2))]">{stats.total} Lehrmittel{stats.borrowed ? ` · ${stats.borrowed} ausgeliehen` : ''}{stats.problem ? ` · ${stats.problem} Problem` : ''}</p>
                      </button>
                      <button type="button" onClick={() => printLocation(location.id)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[var(--border-default,var(--border))] px-2.5 py-2 text-[10px] font-black text-[var(--text-secondary,var(--text2))]">
                        <Printer size={13} /> Kastenliste + QR
                      </button>
                    </div>
                  );
                })}
                {snapshot.locations.length === 0 && <p className="py-3 text-center text-xs text-[var(--text-muted,var(--text3))]">Noch kein Standort angelegt.</p>}
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
              <ShieldCheck size={20} className="text-emerald-700" />
              <p className="mt-2 text-xs font-black text-emerald-950">Bestehende Etiketten bleiben gültig</p>
              <p className="mt-1 text-[11px] leading-relaxed text-emerald-800">KLASSIO verwendet die Inventarnummern eurer Schule. Es muss nichts neu etikettiert werden.</p>
            </div>
          </aside>
        </section>

        {showLocationForm && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-950">Kasten / Standort anlegen</h2>
                <button type="button" onClick={() => setShowLocationForm(false)} className="rounded-lg p-2 text-slate-500"><X size={18} /></button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2"><span className="text-[10px] font-black uppercase text-slate-500">Name *</span><input value={locationDraft.name} onChange={e => setLocationDraft(v => ({ ...v, name: e.target.value }))} placeholder="z. B. Mathematik – Kasten 1" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold" /></label>
                <label><span className="text-[10px] font-black uppercase text-slate-500">Fach</span><input value={locationDraft.subject} onChange={e => setLocationDraft(v => ({ ...v, subject: e.target.value }))} placeholder="Mathematik" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
                <label><span className="text-[10px] font-black uppercase text-slate-500">Raum</span><input value={locationDraft.room} onChange={e => setLocationDraft(v => ({ ...v, room: e.target.value }))} placeholder="z. B. 12" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
                <label className="sm:col-span-2"><span className="text-[10px] font-black uppercase text-slate-500">Detail</span><input value={locationDraft.detail} onChange={e => setLocationDraft(v => ({ ...v, detail: e.target.value }))} placeholder="z. B. linke Tür, Fach 2" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setShowLocationForm(false)} className="rounded-xl px-4 py-2.5 text-xs font-black text-slate-600">Abbrechen</button>
                <button type="button" onClick={createLocation} className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white">Standort anlegen</button>
              </div>
            </div>
          </div>
        )}

        {showItemForm && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-950">Lehrmittel anlegen</h2>
                <button type="button" onClick={() => setShowItemForm(false)} className="rounded-lg p-2 text-slate-500"><X size={18} /></button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label><span className="text-[10px] font-black uppercase text-slate-500">Inventarnummer *</span><input value={itemDraft.inventoryNumber} onChange={e => setItemDraft(v => ({ ...v, inventoryNumber: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold" /></label>
                <label><span className="text-[10px] font-black uppercase text-slate-500">Fach</span><input value={itemDraft.subject} onChange={e => setItemDraft(v => ({ ...v, subject: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
                <label className="sm:col-span-2"><span className="text-[10px] font-black uppercase text-slate-500">Bezeichnung *</span><input value={itemDraft.name} onChange={e => setItemDraft(v => ({ ...v, name: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold" /></label>
                <label><span className="text-[10px] font-black uppercase text-slate-500">Standort</span><select value={itemDraft.locationId} onChange={e => setItemDraft(v => ({ ...v, locationId: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="">Noch keiner</option>{snapshot.locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
                <label><span className="text-[10px] font-black uppercase text-slate-500">Einheit</span><select value={itemDraft.unitType} onChange={e => setItemDraft(v => ({ ...v, unitType: e.target.value as InventoryUnitType }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="single">Einzelstück</option><option value="set">Set</option><option value="box">Box / Kiste</option></select></label>
                <label><span className="text-[10px] font-black uppercase text-slate-500">Anzahl</span><input type="number" min={1} max={999} value={itemDraft.quantity} onChange={e => setItemDraft(v => ({ ...v, quantity: Math.max(1, Number(e.target.value) || 1) }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
                <label className="sm:col-span-2"><span className="text-[10px] font-black uppercase text-slate-500">Bemerkung</span><input value={itemDraft.notes} onChange={e => setItemDraft(v => ({ ...v, notes: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setShowItemForm(false)} className="rounded-xl px-4 py-2.5 text-xs font-black text-slate-600">Abbrechen</button>
                <button type="button" onClick={createItem} className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white">Lehrmittel speichern</button>
              </div>
            </div>
          </div>
        )}

        {showImport && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div role="dialog" aria-modal="true" className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Bestand übernehmen</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">Excel, CSV oder vorhandene Kastenliste</h2>
                  <p className="mt-1 text-xs text-slate-600">KLASSIO schreibt erst nach deiner Vorschau in den Schulbestand.</p>
                </div>
                <button type="button" onClick={() => setShowImport(false)} className="rounded-lg p-2 text-slate-500"><X size={18} /></button>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <label className="rounded-2xl border-2 border-dashed border-slate-200 p-5">
                  <FileSpreadsheet size={24} className="text-emerald-600" />
                  <p className="mt-2 text-sm font-black text-slate-900">Excel / CSV auswählen</p>
                  <p className="mt-1 text-[11px] text-slate-500">Spalten werden automatisch erkannt und können danach korrigiert werden.</p>
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={event => handleSpreadsheet(event.target.files?.[0] || null)} className="mt-4 block w-full text-xs" />
                </label>
                <div className="rounded-2xl border border-slate-200 p-5">
                  <p className="text-sm font-black text-slate-900">Liste einfügen</p>
                  <p className="mt-1 text-[11px] text-slate-500">Auch einfache Zeilen wie „1042 - Geometriekörper“ funktionieren.</p>
                  <textarea value={pasteText} onChange={event => setPasteText(event.target.value)} rows={5} placeholder={'1042 - Geometriekörper\n1081 - Rechenrahmen groß'} className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-xs" />
                  <button type="button" onClick={handlePastePreview} className="mt-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black">Liste erkennen</button>
                </div>
              </div>

              {importHeaders.length > 0 && (
                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black text-slate-900">Spaltenzuordnung prüfen</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {FIELD_LABELS.map(field => (
                      <label key={field.key}>
                        <span className="text-[10px] font-black uppercase text-slate-500">{field.label}{field.key === 'inventoryNumber' || field.key === 'name' ? ' *' : ''}</span>
                        <select
                          value={importMapping[field.key] ?? ''}
                          onChange={event => setImportMapping(prev => ({
                            ...prev,
                            [field.key]: event.target.value === '' ? undefined : Number(event.target.value),
                          }))}
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
                        >
                          <option value="">Nicht verwenden</option>
                          {importHeaders.map((header, index) => <option key={index} value={index}>{header || `Spalte ${index + 1}`}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {importCandidates.length > 0 && (
                <div className="mt-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-900">{importCandidates.length} gültige Zeilen erkannt</p>
                      <p className="text-[11px] text-slate-500">{duplicateCount} Inventarnummern existieren bereits.</p>
                    </div>
                    <label className="text-xs font-bold text-slate-700">
                      Bei vorhandener Inventarnummer:
                      <select value={duplicateMode} onChange={event => setDuplicateMode(event.target.value as 'skip' | 'update')} className="ml-2 rounded-lg border border-slate-200 px-2 py-2">
                        <option value="skip">überspringen</option>
                        <option value="update">Angaben aktualisieren</option>
                      </select>
                    </label>
                  </div>
                  <div className="mt-3 max-h-64 overflow-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-100 text-[10px] font-black uppercase text-slate-500">
                        <tr><th className="px-3 py-2">Nr.</th><th className="px-3 py-2">Bezeichnung</th><th className="px-3 py-2">Fach</th><th className="px-3 py-2">Standort</th></tr>
                      </thead>
                      <tbody>
                        {importCandidates.slice(0, 200).map((row, index) => (
                          <tr key={index} className="border-t border-slate-100">
                            <td className="px-3 py-2 font-black">{row.inventoryNumber}</td>
                            <td className="px-3 py-2">{row.name}</td>
                            <td className="px-3 py-2">{row.subject || '—'}</td>
                            <td className="px-3 py-2">{row.locationName || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {importCandidates.length > 200 && <p className="mt-2 text-[10px] text-slate-500">Vorschau zeigt die ersten 200 Zeilen.</p>}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-2">
                <button type="button" onClick={() => setShowImport(false)} className="rounded-xl px-4 py-2.5 text-xs font-black text-slate-600">Abbrechen</button>
                <button type="button" disabled={!importCandidates.length || importing} onClick={runImport} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white disabled:opacity-40">
                  {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Importieren
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {printedLocation && (
        <section className="hidden print:block print:bg-white print:p-8 print:text-black">
          <div className="flex items-start justify-between gap-8 border-b-2 border-black pb-6">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest">KLASSIO · {snapshot.school.name}</p>
              <h1 className="mt-2 text-3xl font-black">{printedLocation.name}</h1>
              <p className="mt-1 text-sm">{[printedLocation.subject, printedLocation.room ? `Raum ${printedLocation.room}` : '', printedLocation.detail].filter(Boolean).join(' · ')}</p>
              <p className="mt-4 text-sm font-bold">QR scannen → Bestand dieses Kastens öffnen, ausleihen oder zurückgeben.</p>
            </div>
            <div className="shrink-0 text-center">
              <QRCodeSVG value={qrValueForLocation(printedLocation)} size={150} level="M" includeMargin />
              <p className="mt-1 text-[10px] font-bold">KLASSIO</p>
            </div>
          </div>
          <table className="mt-6 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-black text-left"><th className="py-2 pr-3">Inventarnr.</th><th className="py-2 pr-3">Lehrmittel</th><th className="py-2 pr-3">Fach</th><th className="py-2 text-right">Anzahl</th></tr>
            </thead>
            <tbody>
              {printedItems.map(item => (
                <tr key={item.id} className="border-b border-slate-300">
                  <td className="py-2 pr-3 font-bold">{item.inventoryNumber}</td>
                  <td className="py-2 pr-3">{item.name}</td>
                  <td className="py-2 pr-3">{item.subject || ''}</td>
                  <td className="py-2 text-right">{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-6 text-xs">Stand: {new Date().toLocaleDateString('de-AT')} · {printedItems.length} aktive Einträge</p>
        </section>
      )}
    </div>
  );
}
