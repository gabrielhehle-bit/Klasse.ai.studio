import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { QRCodeSVG } from 'qrcode.react';
import {
  AlertTriangle,
  ArrowDownToLine,
  Boxes,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  Loader2,
  MapPin,
  PackageOpen,
  PackageSearch,
  Pencil,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import {
  detectInventoryColumns,
  mapInventoryRows,
  parseInventoryText,
  uniqueImportRecords,
  type InventoryImportRecord,
} from '../lib/inventoryImport';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type Condition = 'ok' | 'beschaedigt' | 'fehlt' | 'wartung';
type Tab = 'overview' | 'stock' | 'locations' | 'loans' | 'import';

type InventoryLocation = {
  id: string;
  schoolId: string;
  name: string;
  subject: string;
  room: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

type InventoryItem = {
  id: string;
  schoolId: string;
  inventoryNumber: string;
  name: string;
  subject: string;
  locationId: string | null;
  quantity: number;
  condition: Condition;
  note: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
};

type InventoryLoan = {
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
};

type InventoryHistory = {
  id: string;
  type: string;
  actorName: string;
  message: string;
  createdAt: string;
};

type InventorySnapshot = {
  school: {
    id: string;
    code: string;
    name?: string;
    federalState?: string;
    domain: string;
  };
  user: {
    userId: string;
    displayName: string;
  };
  items: InventoryItem[];
  locations: InventoryLocation[];
  loans: InventoryLoan[];
  history: InventoryHistory[];
};

type Colleague = {
  userId: string;
  displayName: string;
};

type ItemDraft = {
  id?: string;
  inventoryNumber: string;
  name: string;
  subject: string;
  locationId: string;
  quantity: number;
  condition: Condition;
  note: string;
};

type LocationDraft = {
  id?: string;
  name: string;
  subject: string;
  room: string;
  note: string;
};

const EMPTY_ITEM: ItemDraft = {
  inventoryNumber: '',
  name: '',
  subject: '',
  locationId: '',
  quantity: 1,
  condition: 'ok',
  note: '',
};

const EMPTY_LOCATION: LocationDraft = {
  name: '',
  subject: '',
  room: '',
  note: '',
};

const CONDITION_META: Record<Condition, { label: string; className: string }> = {
  ok: { label: 'In Ordnung', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  beschaedigt: { label: 'Beschädigt', className: 'bg-amber-50 text-amber-800 ring-amber-200' },
  fehlt: { label: 'Fehlt', className: 'bg-rose-50 text-rose-700 ring-rose-200' },
  wartung: { label: 'Wartung', className: 'bg-sky-50 text-sky-700 ring-sky-200' },
};

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Übersicht' },
  { id: 'stock', label: 'Bestand' },
  { id: 'locations', label: 'Standorte' },
  { id: 'loans', label: 'Ausleihen' },
  { id: 'import', label: 'Import & QR' },
];

function formatDate(value: string | null | undefined, withTime = false): string {
  if (!value) return '–';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '–';
  return new Intl.DateTimeFormat('de-AT', withTime
    ? { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' }
  ).format(date);
}

async function readJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error || 'Die Anfrage konnte nicht ausgeführt werden.') as Error & {
      status?: number;
      requiresSchoolEmail?: boolean;
    };
    error.status = response.status;
    error.requiresSchoolEmail = data?.requiresSchoolEmail === true;
    throw error;
  }
  return data;
}

function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm print:hidden">
      <div className={'max-h-[92vh] w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl ' + (wide ? 'max-w-4xl' : 'max-w-xl')}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-black tracking-tight text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Schließen"
          >
            <X size={19} />
          </button>
        </div>
        <div className="max-h-[calc(92vh-72px)] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: number | string;
  helper: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</span>
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-600">{icon}</span>
      </div>
      <div className="text-3xl font-black tracking-tight text-slate-950">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{helper}</div>
    </div>
  );
}

export default function InventoryManager() {
  const { setPage } = useApp();
  const { showToast } = useToast();
  const [snapshot, setSnapshot] = useState<InventorySnapshot | null>(null);
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requiresSchoolEmail, setRequiresSchoolEmail] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [query, setQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [itemDraft, setItemDraft] = useState<ItemDraft | null>(null);
  const [locationDraft, setLocationDraft] = useState<LocationDraft | null>(null);
  const [loanItem, setLoanItem] = useState<InventoryItem | null>(null);
  const [loanBorrowerId, setLoanBorrowerId] = useState('');
  const [loanBorrowerName, setLoanBorrowerName] = useState('');
  const [loanQuantity, setLoanQuantity] = useState(1);
  const [loanDueAt, setLoanDueAt] = useState('');
  const [importRows, setImportRows] = useState<InventoryImportRecord[]>([]);
  const [importSource, setImportSource] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [printLocationIds, setPrintLocationIds] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetch('/api/lehrmittel', { cache: 'no-store' }).then(readJson) as InventorySnapshot;
      setSnapshot(data);
      setRequiresSchoolEmail(false);
      fetch('/api/lehrerzimmer/colleagues', { cache: 'no-store' })
        .then(readJson)
        .then(result => setColleagues((result.users || []).map((user: any) => ({
          userId: user.userId,
          displayName: user.displayName,
        }))))
        .catch(() => setColleagues([]));
    } catch (error: any) {
      if (error?.requiresSchoolEmail || error?.status === 403) {
        setRequiresSchoolEmail(true);
        setSnapshot(null);
      } else {
        showToast(error instanceof Error ? error.message : 'Lehrmittel konnten nicht geladen werden.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!snapshot) return;
    const target = new URLSearchParams(window.location.search).get('lehrmittel');
    if (!target) return;
    if (target.startsWith('location:')) {
      const id = target.slice('location:'.length);
      if (snapshot.locations.some(location => location.id === id)) {
        setLocationFilter(id);
        setTab('stock');
      }
    }
    if (target.startsWith('item:')) {
      const id = target.slice('item:'.length);
      const item = snapshot.items.find(entry => entry.id === id);
      if (item) {
        setTab('stock');
        setQuery(item.inventoryNumber || item.name);
        setLoanItem(item);
        setLoanBorrowerId(snapshot.user.userId);
        setLoanBorrowerName(snapshot.user.displayName);
      }
    }
  }, [snapshot?.school.id]);

  const locationById = useMemo(
    () => new Map((snapshot?.locations || []).map(location => [location.id, location])),
    [snapshot?.locations],
  );

  const activeLoans = useMemo(
    () => (snapshot?.loans || []).filter(loan => !loan.returnedAt),
    [snapshot?.loans],
  );

  const loanedQuantityByItem = useMemo(() => {
    const map = new Map<string, number>();
    activeLoans.forEach(loan => map.set(loan.itemId, (map.get(loan.itemId) || 0) + loan.quantity));
    return map;
  }, [activeLoans]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('de-AT');
    return (snapshot?.items || [])
      .filter(item => !locationFilter || item.locationId === locationFilter)
      .filter(item => {
        if (!normalized) return true;
        const location = item.locationId ? locationById.get(item.locationId) : null;
        const borrowerNames = activeLoans
          .filter(loan => loan.itemId === item.id)
          .map(loan => loan.borrowerName)
          .join(' ');
        const haystack = [
          item.inventoryNumber,
          item.name,
          item.subject,
          location?.name,
          location?.room,
          item.note,
          borrowerNames,
        ].join(' ').toLocaleLowerCase('de-AT');
        return haystack.includes(normalized);
      })
      .sort((a, b) => {
        const numberCompare = a.inventoryNumber.localeCompare(b.inventoryNumber, 'de', { numeric: true });
        return numberCompare || a.name.localeCompare(b.name, 'de');
      });
  }, [snapshot?.items, query, locationFilter, locationById, activeLoans]);

  const totalQuantity = (snapshot?.items || []).reduce((sum, item) => sum + item.quantity, 0);
  const problemCount = (snapshot?.items || []).filter(item => item.condition !== 'ok').length;
  const overdueCount = activeLoans.filter(loan => loan.dueAt && new Date(loan.dueAt).getTime() < Date.now()).length;

  const saveItem = async () => {
    if (!itemDraft?.name.trim()) {
      showToast('Bitte gib eine Bezeichnung ein.', 'error');
      return;
    }
    setSaving(true);
    try {
      const method = itemDraft.id ? 'PUT' : 'POST';
      const url = itemDraft.id ? '/api/lehrmittel/items/' + itemDraft.id : '/api/lehrmittel/items';
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemDraft),
      }).then(readJson);
      setItemDraft(null);
      await load();
      showToast(itemDraft.id ? 'Lehrmittel aktualisiert.' : 'Lehrmittel angelegt.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Lehrmittel konnte nicht gespeichert werden.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveLocation = async () => {
    if (!locationDraft?.name.trim()) {
      showToast('Bitte gib einen Standortnamen ein.', 'error');
      return;
    }
    setSaving(true);
    try {
      const method = locationDraft.id ? 'PUT' : 'POST';
      const url = locationDraft.id ? '/api/lehrmittel/locations/' + locationDraft.id : '/api/lehrmittel/locations';
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locationDraft),
      }).then(readJson);
      setLocationDraft(null);
      await load();
      showToast(locationDraft.id ? 'Standort aktualisiert.' : 'Standort angelegt.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Standort konnte nicht gespeichert werden.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (item: InventoryItem) => {
    if (!window.confirm('„' + item.name + '“ wirklich aus dem Inventar entfernen?')) return;
    try {
      const response = await fetch('/api/lehrmittel/items/' + item.id, { method: 'DELETE' });
      if (!response.ok) await readJson(response);
      await load();
      showToast('Lehrmittel entfernt.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Lehrmittel konnte nicht entfernt werden.', 'error');
    }
  };

  const openLoan = (item: InventoryItem) => {
    setLoanItem(item);
    setLoanBorrowerId(snapshot?.user.userId || '');
    setLoanBorrowerName(snapshot?.user.displayName || '');
    setLoanQuantity(1);
    setLoanDueAt('');
  };

  const createLoan = async () => {
    if (!loanItem || !loanBorrowerName.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/lehrmittel/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: loanItem.id,
          borrowerUserId: loanBorrowerId,
          borrowerName: loanBorrowerName,
          quantity: loanQuantity,
          dueAt: loanDueAt || null,
        }),
      }).then(readJson);
      setLoanItem(null);
      await load();
      showToast('Ausleihe eingetragen.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Ausleihe konnte nicht gespeichert werden.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const returnLoan = async (loan: InventoryLoan) => {
    setSaving(true);
    try {
      await fetch('/api/lehrmittel/loans/' + loan.id + '/return', { method: 'POST' }).then(readJson);
      await load();
      showToast('Rückgabe erledigt.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Rückgabe konnte nicht gespeichert werden.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const parseWorkbook = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    if (!rows.length) return [];
    const headers = [...new Set(rows.flatMap(row => Object.keys(row)))];
    return uniqueImportRecords(mapInventoryRows(rows, detectInventoryColumns(headers)));
  };

  const parsePdf = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const document = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const text = await page.getTextContent();
      pages.push(text.items.map((item: any) => ('str' in item ? item.str : '')).join('  '));
    }
    return uniqueImportRecords(parseInventoryText(pages.join('\n')));
  };

  const handleFile = async (file: File) => {
    setSaving(true);
    try {
      const name = file.name.toLowerCase();
      let records: InventoryImportRecord[] = [];
      if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
        records = await parseWorkbook(file);
      } else if (name.endsWith('.pdf')) {
        records = await parsePdf(file);
      } else if (name.endsWith('.txt') || name.endsWith('.tsv')) {
        records = uniqueImportRecords(parseInventoryText(await file.text()));
      } else if (file.type.startsWith('image/')) {
        setImportSource(file.name);
        setImportRows([]);
        showToast('Foto erkannt. Die automatische Bildlesung folgt im nächsten Sicherheitsdurchlauf; du kannst den Listentext unten bereits einfügen.', 'info');
        return;
      } else {
        throw new Error('Dieses Dateiformat wird noch nicht unterstützt.');
      }
      setImportSource(file.name);
      setImportRows(records);
      if (!records.length) showToast('Keine sicheren Lehrmittelzeilen erkannt. Du kannst den Text unten einfügen.', 'info');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Datei konnte nicht gelesen werden.', 'error');
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const parsePastedText = () => {
    const records = uniqueImportRecords(parseInventoryText(pasteText));
    setImportSource('Eingefügter Text');
    setImportRows(records);
    if (!records.length) showToast('Keine Lehrmittelzeilen erkannt.', 'error');
  };

  const updateImportRow = (index: number, patch: Partial<InventoryImportRecord>) => {
    setImportRows(rows => rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  };

  const runImport = async () => {
    const records = importRows.filter(row => row.name.trim());
    if (!records.length) return;
    setSaving(true);
    try {
      const result = await fetch('/api/lehrmittel/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      }).then(readJson);
      setImportRows([]);
      setImportSource('');
      setPasteText('');
      await load();
      showToast(
        String(result.created || 0) + ' neu, ' + String(result.updated || 0) + ' aktualisiert.',
        'success',
      );
      setTab('stock');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Import fehlgeschlagen.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const printQr = (locationIds: string[]) => {
    setPrintLocationIds(locationIds);
    window.setTimeout(() => window.print(), 100);
  };

  const clearDeepLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('lehrmittel');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  };

  if (loading && !snapshot) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
          <Loader2 size={20} className="animate-spin" />
          Lehrmittel werden geladen …
        </div>
      </div>
    );
  }

  if (requiresSchoolEmail) {
    return (
      <div className="mx-auto flex h-full max-w-3xl items-center px-4 py-10">
        <div className="w-full rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-3xl bg-amber-50 text-amber-700">
            <PackageSearch size={30} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">Lehrmittel gehören zur Schule</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
            Damit alle Kolleg:innen denselben Bestand sehen, braucht dieser Bereich eine verifizierte Schulidentität.
            Private oder voneinander getrennte Inventarlisten legt KLASSIO hier bewusst nicht an.
          </p>
          <button
            type="button"
            onClick={() => setPage('lehrerzimmer')}
            className="mt-6 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
          >
            Schulidentität einrichten
          </button>
        </div>
      </div>
    );
  }

  if (!snapshot) return null;

  const schoolLabel = snapshot.school.name || snapshot.school.code || snapshot.school.domain;
  const activePrintLocations = snapshot.locations.filter(location => printLocationIds.includes(location.id));

  return (
    <>
      <div className="h-full overflow-y-auto print:hidden">
        <div className="mx-auto max-w-[1500px] px-4 pb-16 pt-4 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Schulweit · {schoolLabel}</div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Lehrmittel & Inventar</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Finden, ausleihen, zurückgeben. Die Inventarnummern und Beschriftungen der Schule bleiben bestehen.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setItemDraft({ ...EMPTY_ITEM })}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white hover:bg-slate-800"
              >
                <Plus size={17} /> Lehrmittel
              </button>
              <button
                type="button"
                onClick={() => setTab('import')}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                <Upload size={17} /> Importieren
              </button>
            </div>
          </div>

          <div className="mb-5 overflow-x-auto">
            <div className="inline-flex min-w-max gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              {TABS.map(entry => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    setTab(entry.id);
                    if (entry.id !== 'stock') setLocationFilter('');
                    clearDeepLink();
                  }}
                  className={'rounded-xl px-4 py-2.5 text-sm font-black transition ' + (
                    tab === entry.id
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>

          {(tab === 'overview' || tab === 'stock') && (
            <div className="mb-5 rounded-[26px] border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500">
                  <Search size={19} />
                </div>
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Wo ist …? Name, Inventarnummer, Fach, Kasten oder Person suchen"
                  className="h-11 min-w-0 flex-1 bg-transparent px-1 text-base font-semibold text-slate-950 outline-none placeholder:font-medium placeholder:text-slate-400"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-800"
                    aria-label="Suche löschen"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
          )}

          {tab === 'overview' && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Bestand" value={totalQuantity} helper={snapshot.items.length + ' verschiedene Einträge'} icon={<Boxes size={20} />} />
                <StatCard label="Ausgeliehen" value={activeLoans.reduce((sum, loan) => sum + loan.quantity, 0)} helper={activeLoans.length + ' offene Ausleihen'} icon={<ArrowDownToLine size={20} />} />
                <StatCard label="Standorte" value={snapshot.locations.length} helper="Kästen, Räume und Lagerorte" icon={<MapPin size={20} />} />
                <StatCard label="Zu prüfen" value={problemCount + overdueCount} helper={problemCount + ' Zustand · ' + overdueCount + ' überfällig'} icon={<AlertTriangle size={20} />} />
              </div>

              {query.trim() ? (
                <div className="rounded-[26px] border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-5 py-4">
                    <div className="text-sm font-black text-slate-950">{filteredItems.length} Treffer</div>
                  </div>
                  <ItemList
                    items={filteredItems.slice(0, 12)}
                    locations={locationById}
                    loans={activeLoans}
                    loanedQuantityByItem={loanedQuantityByItem}
                    onLoan={openLoan}
                    onEdit={item => setItemDraft({
                      id: item.id,
                      inventoryNumber: item.inventoryNumber,
                      name: item.name,
                      subject: item.subject,
                      locationId: item.locationId || '',
                      quantity: item.quantity,
                      condition: item.condition,
                      note: item.note,
                    })}
                  />
                  {filteredItems.length > 12 && (
                    <button
                      type="button"
                      onClick={() => setTab('stock')}
                      className="w-full border-t border-slate-100 px-5 py-4 text-sm font-black text-slate-600 hover:bg-slate-50"
                    >
                      Alle {filteredItems.length} Treffer anzeigen
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
                  <div className="rounded-[26px] border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                      <div>
                        <h2 className="font-black text-slate-950">Gerade ausgeliehen</h2>
                        <p className="mt-0.5 text-xs text-slate-500">Damit WhatsApp-Fragen „Hat das jemand?“ überflüssig werden.</p>
                      </div>
                      <button type="button" onClick={() => setTab('loans')} className="text-xs font-black text-slate-500 hover:text-slate-950">Alle</button>
                    </div>
                    {activeLoans.length ? (
                      <div className="divide-y divide-slate-100">
                        {activeLoans.slice(0, 8).map(loan => {
                          const item = snapshot.items.find(entry => entry.id === loan.itemId);
                          return (
                            <div key={loan.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-black text-slate-900">{item?.name || 'Lehrmittel'}</div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {loan.borrowerName} · seit {formatDate(loan.borrowedAt)}
                                  {loan.quantity > 1 ? ' · ' + loan.quantity + '×' : ''}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => void returnLoan(loan)}
                                className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 text-xs font-black text-emerald-700 hover:bg-emerald-100"
                              >
                                <RotateCcw size={14} /> Zurück
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="px-5 py-10 text-center text-sm text-slate-500">Aktuell ist nichts ausgeliehen.</div>
                    )}
                  </div>

                  <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="font-black text-slate-950">Schnellstart</h2>
                      <QrCode size={18} className="text-slate-400" />
                    </div>
                    <div className="space-y-2">
                      <button type="button" onClick={() => setTab('stock')} className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-left hover:bg-slate-100">
                        <PackageSearch size={18} className="text-slate-500" />
                        <span>
                          <span className="block text-sm font-black text-slate-900">Bestand durchsuchen</span>
                          <span className="block text-xs text-slate-500">Nummer, Name oder Kasten</span>
                        </span>
                      </button>
                      <button type="button" onClick={() => setTab('locations')} className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-left hover:bg-slate-100">
                        <MapPin size={18} className="text-slate-500" />
                        <span>
                          <span className="block text-sm font-black text-slate-900">Kästen & Räume</span>
                          <span className="block text-xs text-slate-500">Standorte organisieren</span>
                        </span>
                      </button>
                      <button type="button" onClick={() => setTab('import')} className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-left hover:bg-slate-100">
                        <Upload size={18} className="text-slate-500" />
                        <span>
                          <span className="block text-sm font-black text-slate-900">Alte Liste übernehmen</span>
                          <span className="block text-xs text-slate-500">Excel, CSV, PDF oder Text</span>
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {snapshot.history.length > 0 && (
                <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-3 font-black text-slate-950">Letzte Änderungen</h2>
                  <div className="grid gap-2 lg:grid-cols-2">
                    {snapshot.history.slice(0, 6).map(entry => (
                      <div key={entry.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                        <div className="text-sm font-bold text-slate-800">{entry.message}</div>
                        <div className="mt-1 text-xs text-slate-400">{entry.actorName} · {formatDate(entry.createdAt, true)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'stock' && (
            <div className="rounded-[26px] border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black text-slate-950">{filteredItems.length} Lehrmittel</span>
                  {locationFilter && (
                    <button
                      type="button"
                      onClick={() => {
                        setLocationFilter('');
                        clearDeepLink();
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600"
                    >
                      {locationById.get(locationFilter)?.name || 'Standort'} <X size={12} />
                    </button>
                  )}
                </div>
                <select
                  value={locationFilter}
                  onChange={event => setLocationFilter(event.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-slate-400"
                >
                  <option value="">Alle Standorte</option>
                  {snapshot.locations.map(location => (
                    <option key={location.id} value={location.id}>{location.name}</option>
                  ))}
                </select>
              </div>
              {filteredItems.length ? (
                <ItemList
                  items={filteredItems}
                  locations={locationById}
                  loans={activeLoans}
                  loanedQuantityByItem={loanedQuantityByItem}
                  onLoan={openLoan}
                  onEdit={item => setItemDraft({
                    id: item.id,
                    inventoryNumber: item.inventoryNumber,
                    name: item.name,
                    subject: item.subject,
                    locationId: item.locationId || '',
                    quantity: item.quantity,
                    condition: item.condition,
                    note: item.note,
                  })}
                  onDelete={removeItem}
                />
              ) : (
                <div className="px-5 py-16 text-center">
                  <PackageOpen size={34} className="mx-auto mb-3 text-slate-300" />
                  <div className="font-black text-slate-700">Nichts gefunden</div>
                  <div className="mt-1 text-sm text-slate-400">Suche ändern oder das erste Lehrmittel anlegen.</div>
                </div>
              )}
            </div>
          )}

          {tab === 'locations' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setLocationDraft({ ...EMPTY_LOCATION })}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white hover:bg-slate-800"
                >
                  <Plus size={17} /> Standort
                </button>
              </div>
              {snapshot.locations.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {snapshot.locations.map(location => {
                    const items = snapshot.items.filter(item => item.locationId === location.id);
                    const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
                    return (
                      <div key={location.id} className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <MapPin size={17} className="shrink-0 text-slate-400" />
                              <h3 className="truncate text-lg font-black text-slate-950">{location.name}</h3>
                            </div>
                            <div className="mt-2 text-sm text-slate-500">
                              {[location.subject, location.room].filter(Boolean).join(' · ') || 'Noch keine Zusatzangaben'}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setLocationDraft({
                              id: location.id,
                              name: location.name,
                              subject: location.subject,
                              room: location.room,
                              note: location.note,
                            })}
                            className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-800"
                          >
                            <Pencil size={15} />
                          </button>
                        </div>
                        <div className="mt-5 grid grid-cols-2 gap-2">
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <div className="text-xl font-black text-slate-900">{items.length}</div>
                            <div className="text-xs text-slate-500">Einträge</div>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <div className="text-xl font-black text-slate-900">{quantity}</div>
                            <div className="text-xs text-slate-500">Stück gesamt</div>
                          </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setLocationFilter(location.id);
                              setQuery('');
                              setTab('stock');
                            }}
                            className="flex-1 rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-black text-white"
                          >
                            Inhalt ansehen
                          </button>
                          <button
                            type="button"
                            onClick={() => printQr([location.id])}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-50"
                          >
                            <QrCode size={14} /> QR
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                  <MapPin size={34} className="mx-auto mb-3 text-slate-300" />
                  <div className="font-black text-slate-700">Noch keine Kästen oder Räume</div>
                  <p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">
                    Standorte entstehen beim Import automatisch oder können hier manuell angelegt werden.
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === 'loans' && (
            <div className="space-y-5">
              <div className="rounded-[26px] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="font-black text-slate-950">Offene Ausleihen</h2>
                  <p className="mt-1 text-xs text-slate-500">Eine Rückgabe braucht nur einen Klick.</p>
                </div>
                {activeLoans.length ? (
                  <div className="divide-y divide-slate-100">
                    {activeLoans.map(loan => {
                      const item = snapshot.items.find(entry => entry.id === loan.itemId);
                      const overdue = Boolean(loan.dueAt && new Date(loan.dueAt).getTime() < Date.now());
                      return (
                        <div key={loan.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[1.4fr_1fr_1fr_auto] lg:items-center">
                          <div>
                            <div className="font-black text-slate-900">{item?.name || 'Lehrmittel'}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {item?.inventoryNumber ? 'Nr. ' + item.inventoryNumber + ' · ' : ''}{loan.quantity}×
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Bei</div>
                            <div className="mt-1 text-sm font-bold text-slate-800">{loan.borrowerName}</div>
                          </div>
                          <div>
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Seit / bis</div>
                            <div className={'mt-1 text-sm font-bold ' + (overdue ? 'text-rose-700' : 'text-slate-700')}>
                              {formatDate(loan.borrowedAt)}{loan.dueAt ? ' / ' + formatDate(loan.dueAt) : ''}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => void returnLoan(loan)}
                            disabled={saving}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 text-xs font-black text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            <RotateCcw size={14} /> Zurückgeben
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-5 py-14 text-center text-sm text-slate-500">Keine offenen Ausleihen.</div>
                )}
              </div>

              <div className="rounded-[26px] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="font-black text-slate-950">Letzte Rückgaben</h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {snapshot.loans.filter(loan => loan.returnedAt).slice(0, 12).map(loan => {
                    const item = snapshot.items.find(entry => entry.id === loan.itemId);
                    return (
                      <div key={loan.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm font-bold text-slate-800">{item?.name || 'Lehrmittel'} · {loan.borrowerName}</div>
                        <div className="text-xs text-slate-400">zurück {formatDate(loan.returnedAt)}</div>
                      </div>
                    );
                  })}
                  {!snapshot.loans.some(loan => loan.returnedAt) && (
                    <div className="px-5 py-10 text-center text-sm text-slate-500">Noch keine Rückgaben gespeichert.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'import' && (
            <div className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-4">
                <ImportCard icon={<FileSpreadsheet size={22} />} title="Excel / CSV" helper="Bestehende Inventarliste direkt übernehmen" onClick={() => fileRef.current?.click()} />
                <ImportCard icon={<FileText size={22} />} title="PDF" helper="Textbasierte Kastenlisten lokal lesen" onClick={() => fileRef.current?.click()} />
                <ImportCard icon={<Camera size={22} />} title="Foto" helper="Foto auswählen; Bildlesung wird separat abgesichert" onClick={() => fileRef.current?.click()} />
                <ImportCard icon={<ClipboardCheck size={22} />} title="Text einfügen" helper="Liste kopieren und unten prüfen" onClick={() => document.getElementById('inventory-paste')?.focus()} />
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv,.pdf,.txt,.tsv,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={event => {
                  const file = event.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />

              <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3">
                  <h2 className="font-black text-slate-950">Liste einfügen</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Funktioniert mit Tabellen aus Excel/Word und einfachen Listen. Trennzeichen wie Tab, Semikolon oder mehrere Leerzeichen werden erkannt.
                  </p>
                </div>
                <textarea
                  id="inventory-paste"
                  value={pasteText}
                  onChange={event => setPasteText(event.target.value)}
                  placeholder={'Inventarnr.   Bezeichnung   Fach   Kasten   Anzahl\n231   Zahlenstrahl magnetisch   Mathematik   Kasten 4   2'}
                  className="min-h-32 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm text-slate-800 outline-none focus:border-slate-400"
                />
                <button
                  type="button"
                  onClick={parsePastedText}
                  disabled={!pasteText.trim()}
                  className="mt-3 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white disabled:opacity-40"
                >
                  Vorschau erstellen
                </button>
              </div>

              {importRows.length > 0 && (
                <div className="rounded-[26px] border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-black text-slate-950">Import prüfen</h2>
                      <p className="mt-1 text-xs text-slate-500">{importSource || 'Liste'} · {importRows.length} erkannte Zeilen</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void runImport()}
                      disabled={saving}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      {importRows.length} Zeilen übernehmen
                    </button>
                  </div>
                  <div className="max-h-[520px] overflow-auto">
                    <table className="min-w-[1000px] w-full text-left">
                      <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <tr>
                          <th className="px-3 py-3">Nr.</th>
                          <th className="px-3 py-3">Bezeichnung</th>
                          <th className="px-3 py-3">Fach</th>
                          <th className="px-3 py-3">Standort</th>
                          <th className="px-3 py-3">Raum</th>
                          <th className="px-3 py-3">Anzahl</th>
                          <th className="px-3 py-3">Zustand</th>
                          <th className="w-10 px-3 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importRows.map((row, index) => (
                          <tr key={index}>
                            <td className="p-2">
                              <input value={row.inventoryNumber} onChange={event => updateImportRow(index, { inventoryNumber: event.target.value })} className="w-28 rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold" />
                            </td>
                            <td className="p-2">
                              <input value={row.name} onChange={event => updateImportRow(index, { name: event.target.value })} className="w-64 rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold" />
                            </td>
                            <td className="p-2">
                              <input value={row.subject} onChange={event => updateImportRow(index, { subject: event.target.value })} className="w-36 rounded-lg border border-slate-200 px-2 py-2 text-xs" />
                            </td>
                            <td className="p-2">
                              <input value={row.location} onChange={event => updateImportRow(index, { location: event.target.value })} className="w-40 rounded-lg border border-slate-200 px-2 py-2 text-xs" />
                            </td>
                            <td className="p-2">
                              <input value={row.room} onChange={event => updateImportRow(index, { room: event.target.value })} className="w-28 rounded-lg border border-slate-200 px-2 py-2 text-xs" />
                            </td>
                            <td className="p-2">
                              <input type="number" min={1} max={9999} value={row.quantity} onChange={event => updateImportRow(index, { quantity: Math.max(1, Number(event.target.value) || 1) })} className="w-20 rounded-lg border border-slate-200 px-2 py-2 text-xs" />
                            </td>
                            <td className="p-2">
                              <input value={row.condition} onChange={event => updateImportRow(index, { condition: event.target.value })} className="w-28 rounded-lg border border-slate-200 px-2 py-2 text-xs" />
                            </td>
                            <td className="p-2">
                              <button type="button" onClick={() => setImportRows(rows => rows.filter((_, rowIndex) => rowIndex !== index))} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X size={14} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="border-t border-slate-100 px-5 py-3 text-xs leading-5 text-slate-500">
                    Gleiche Inventarnummern aktualisieren den bestehenden Eintrag. Ohne Inventarnummer wird ein neuer Eintrag angelegt.
                  </div>
                </div>
              )}

              <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="font-black text-slate-950">QR-Codes für Kästen</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                      Der QR-Code wird von KLASSIO erzeugt. Es braucht keinen externen QR-Dienst und nicht jedes einzelne Lehrmittel muss neu etikettiert werden.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => printQr(snapshot.locations.map(location => location.id))}
                    disabled={!snapshot.locations.length}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <Printer size={17} /> Alle Kastenblätter drucken
                  </button>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {snapshot.locations.map(location => (
                    <div key={location.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black text-slate-900">{location.name}</div>
                        <div className="mt-1 text-xs text-slate-500">{snapshot.items.filter(item => item.locationId === location.id).length} Einträge</div>
                      </div>
                      <button type="button" onClick={() => printQr([location.id])} className="grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-600 shadow-sm hover:text-slate-950"><QrCode size={18} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="hidden print:block print:bg-white">
        {activePrintLocations.map(location => {
          const items = snapshot.items
            .filter(item => item.locationId === location.id)
            .sort((a, b) => a.inventoryNumber.localeCompare(b.inventoryNumber, 'de', { numeric: true }) || a.name.localeCompare(b.name, 'de'));
          const value = window.location.origin + '/?lehrmittel=location:' + location.id;
          return (
            <section key={location.id} className="mx-auto min-h-[270mm] w-[190mm] break-after-page p-8 text-black">
              <div className="flex items-start justify-between gap-8 border-b-2 border-black pb-6">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.18em]">KLASSIO · {schoolLabel}</div>
                  <h1 className="mt-2 text-3xl font-black">{location.name}</h1>
                  <div className="mt-2 text-sm">{[location.subject, location.room].filter(Boolean).join(' · ')}</div>
                </div>
                <div className="shrink-0 text-center">
                  <QRCodeSVG value={value} size={118} level="M" />
                  <div className="mt-2 text-[10px] font-bold">Scannen · ansehen · ausleihen</div>
                </div>
              </div>
              <table className="mt-6 w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-black text-left">
                    <th className="py-2 pr-3">Nr.</th>
                    <th className="py-2 pr-3">Lehrmittel</th>
                    <th className="py-2 pr-3">Fach</th>
                    <th className="py-2 text-right">Anzahl</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-b border-slate-300">
                      <td className="py-2.5 pr-3 font-bold">{item.inventoryNumber || '–'}</td>
                      <td className="py-2.5 pr-3">{item.name}</td>
                      <td className="py-2.5 pr-3">{item.subject || '–'}</td>
                      <td className="py-2.5 text-right">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!items.length && <div className="py-16 text-center text-sm">Noch kein Bestand für diesen Standort.</div>}
            </section>
          );
        })}
      </div>

      {itemDraft && (
        <Modal title={itemDraft.id ? 'Lehrmittel bearbeiten' : 'Lehrmittel anlegen'} onClose={() => setItemDraft(null)}>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[0.7fr_1.3fr]">
              <Field label="Inventarnummer">
                <input value={itemDraft.inventoryNumber} onChange={event => setItemDraft({ ...itemDraft, inventoryNumber: event.target.value })} placeholder="z. B. 231" className="input-field" />
              </Field>
              <Field label="Bezeichnung *">
                <input value={itemDraft.name} onChange={event => setItemDraft({ ...itemDraft, name: event.target.value })} placeholder="z. B. Geometriekoffer" className="input-field" autoFocus />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Fach / Bereich">
                <input value={itemDraft.subject} onChange={event => setItemDraft({ ...itemDraft, subject: event.target.value })} placeholder="Mathematik" className="input-field" />
              </Field>
              <Field label="Standort">
                <select value={itemDraft.locationId} onChange={event => setItemDraft({ ...itemDraft, locationId: event.target.value })} className="input-field">
                  <option value="">Kein Standort</option>
                  {snapshot.locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Anzahl">
                <input type="number" min={1} max={9999} value={itemDraft.quantity} onChange={event => setItemDraft({ ...itemDraft, quantity: Math.max(1, Number(event.target.value) || 1) })} className="input-field" />
              </Field>
              <Field label="Zustand">
                <select value={itemDraft.condition} onChange={event => setItemDraft({ ...itemDraft, condition: event.target.value as Condition })} className="input-field">
                  {Object.entries(CONDITION_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Notiz">
              <textarea value={itemDraft.note} onChange={event => setItemDraft({ ...itemDraft, note: event.target.value })} placeholder="Optional" className="input-field min-h-24 resize-y" />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setItemDraft(null)} className="rounded-xl px-4 py-2.5 text-sm font-black text-slate-500 hover:bg-slate-100">Abbrechen</button>
              <button type="button" onClick={() => void saveItem()} disabled={saving} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50">
                {saving ? 'Speichert …' : 'Speichern'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {locationDraft && (
        <Modal title={locationDraft.id ? 'Standort bearbeiten' : 'Standort anlegen'} onClose={() => setLocationDraft(null)}>
          <div className="space-y-4">
            <Field label="Name *">
              <input value={locationDraft.name} onChange={event => setLocationDraft({ ...locationDraft, name: event.target.value })} placeholder="z. B. Mathematik · Kasten 4" className="input-field" autoFocus />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Fach / Bereich">
                <input value={locationDraft.subject} onChange={event => setLocationDraft({ ...locationDraft, subject: event.target.value })} placeholder="Mathematik" className="input-field" />
              </Field>
              <Field label="Raum">
                <input value={locationDraft.room} onChange={event => setLocationDraft({ ...locationDraft, room: event.target.value })} placeholder="z. B. Lehrerzimmer" className="input-field" />
              </Field>
            </div>
            <Field label="Notiz">
              <textarea value={locationDraft.note} onChange={event => setLocationDraft({ ...locationDraft, note: event.target.value })} className="input-field min-h-24 resize-y" />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setLocationDraft(null)} className="rounded-xl px-4 py-2.5 text-sm font-black text-slate-500 hover:bg-slate-100">Abbrechen</button>
              <button type="button" onClick={() => void saveLocation()} disabled={saving} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50">
                {saving ? 'Speichert …' : 'Speichern'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {loanItem && (
        <Modal title="Lehrmittel ausleihen" onClose={() => setLoanItem(null)}>
          <div className="mb-5 rounded-2xl bg-slate-50 p-4">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400">{loanItem.inventoryNumber ? 'Nr. ' + loanItem.inventoryNumber : 'Lehrmittel'}</div>
            <div className="mt-1 text-lg font-black text-slate-950">{loanItem.name}</div>
            <div className="mt-1 text-sm text-slate-500">
              {Math.max(0, loanItem.quantity - (loanedQuantityByItem.get(loanItem.id) || 0))} von {loanItem.quantity} verfügbar
            </div>
          </div>
          <div className="space-y-4">
            <Field label="Wer nimmt es mit?">
              <select
                value={loanBorrowerId}
                onChange={event => {
                  const id = event.target.value;
                  setLoanBorrowerId(id);
                  const colleague = colleagues.find(entry => entry.userId === id);
                  setLoanBorrowerName(colleague?.displayName || (id === snapshot.user.userId ? snapshot.user.displayName : loanBorrowerName));
                }}
                className="input-field"
              >
                <option value={snapshot.user.userId}>{snapshot.user.displayName} (ich)</option>
                {colleagues.filter(entry => entry.userId !== snapshot.user.userId).map(entry => (
                  <option key={entry.userId} value={entry.userId}>{entry.displayName}</option>
                ))}
                <option value="">Andere Person …</option>
              </select>
            </Field>
            {!loanBorrowerId && (
              <Field label="Name">
                <input value={loanBorrowerName} onChange={event => setLoanBorrowerName(event.target.value)} className="input-field" placeholder="Name" />
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Anzahl">
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, loanItem.quantity - (loanedQuantityByItem.get(loanItem.id) || 0))}
                  value={loanQuantity}
                  onChange={event => setLoanQuantity(Math.max(1, Number(event.target.value) || 1))}
                  className="input-field"
                />
              </Field>
              <Field label="Rückgabe bis (optional)">
                <input type="date" value={loanDueAt} onChange={event => setLoanDueAt(event.target.value)} className="input-field" />
              </Field>
            </div>
            <button
              type="button"
              onClick={() => void createLoan()}
              disabled={saving || !loanBorrowerName.trim()}
              className="w-full rounded-2xl bg-slate-950 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {saving ? 'Speichert …' : 'Ausleihe eintragen'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function ImportCard({
  icon,
  title,
  helper,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  helper: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[24px] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-600">{icon}</div>
      <div className="text-sm font-black text-slate-950">{title}</div>
      <div className="mt-1 text-xs leading-5 text-slate-500">{helper}</div>
    </button>
  );
}

function ItemList({
  items,
  locations,
  loans,
  loanedQuantityByItem,
  onLoan,
  onEdit,
  onDelete,
}: {
  items: InventoryItem[];
  locations: Map<string, InventoryLocation>;
  loans: InventoryLoan[];
  loanedQuantityByItem: Map<string, number>;
  onLoan: (item: InventoryItem) => void;
  onEdit: (item: InventoryItem) => void;
  onDelete?: (item: InventoryItem) => void;
}) {
  return (
    <div className="divide-y divide-slate-100">
      {items.map(item => {
        const location = item.locationId ? locations.get(item.locationId) : null;
        const itemLoans = loans.filter(loan => loan.itemId === item.id);
        const loaned = loanedQuantityByItem.get(item.id) || 0;
        const available = Math.max(0, item.quantity - loaned);
        const condition = CONDITION_META[item.condition];
        return (
          <div key={item.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[1.45fr_1fr_1.2fr_auto] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-black text-slate-950">{item.name}</span>
                {item.condition !== 'ok' && (
                  <span className={'rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ring-inset ' + condition.className}>
                    {condition.label}
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {item.inventoryNumber ? 'Nr. ' + item.inventoryNumber : 'ohne Inventarnummer'}
                {item.subject ? ' · ' + item.subject : ''}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Standort</div>
              <div className="mt-1 text-sm font-bold text-slate-700">{location?.name || 'Nicht zugeordnet'}</div>
              {location?.room && <div className="mt-0.5 text-xs text-slate-400">{location.room}</div>}
            </div>
            <div>
              {itemLoans.length ? (
                <>
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Gerade bei</div>
                  <div className="mt-1 text-sm font-bold text-slate-800">
                    {itemLoans.map(loan => loan.borrowerName).join(', ')}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">{available} von {item.quantity} verfügbar</div>
                </>
              ) : (
                <>
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Verfügbar</div>
                  <div className="mt-1 text-sm font-bold text-emerald-700">{available} von {item.quantity}</div>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5 lg:justify-end">
              <button
                type="button"
                onClick={() => onLoan(item)}
                disabled={available <= 0 || item.condition === 'fehlt'}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-slate-950 px-3 text-xs font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowDownToLine size={14} /> Ausleihen
              </button>
              <button type="button" onClick={() => onEdit(item)} className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-800" aria-label="Bearbeiten"><Pencil size={15} /></button>
              {onDelete && (
                <button type="button" onClick={() => onDelete(item)} className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Löschen"><Trash2 size={15} /></button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
