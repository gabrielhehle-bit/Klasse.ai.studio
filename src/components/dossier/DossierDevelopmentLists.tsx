import React, { useMemo, useState } from 'react';
import { Plus, Trash2, Columns3, ListPlus, BookOpen, Gauge, TrendingUp } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CustomListColumn, StudentDevelopmentList } from '../../types';
import { toLocalDateKey } from '../../lib/localDate';

type Preset = {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number }>;
  columns: Array<{ label: string; type: 'text' | 'number' }>;
};

const PRESETS: Preset[] = [
  {
    id: 'standard',
    label: 'Entwicklungsverlauf',
    description: 'Datum, Ergebnis/Wert und Bemerkung',
    icon: TrendingUp,
    columns: [
      { label: 'Ergebnis/Wert', type: 'text' },
      { label: 'Bemerkung', type: 'text' },
    ],
  },
  {
    id: 'antolin',
    label: 'Antolin',
    description: 'Buch, Punkte, Quiz und Bemerkung',
    icon: BookOpen,
    columns: [
      { label: 'Buch', type: 'text' },
      { label: 'Punkte', type: 'number' },
      { label: 'Quiz', type: 'text' },
      { label: 'Bemerkung', type: 'text' },
    ],
  },
  {
    id: 'lautlesen',
    label: 'Lautleseprotokoll',
    description: 'Wörter/min, Fehler, Genauigkeit, Intonation',
    icon: Gauge,
    columns: [
      { label: 'Wörter/min', type: 'number' },
      { label: 'Fehler', type: 'number' },
      { label: 'Genauigkeit %', type: 'number' },
      { label: 'Intonation', type: 'text' },
      { label: 'Bemerkung', type: 'text' },
    ],
  },
  {
    id: 'foerderung',
    label: 'Förderverlauf',
    description: 'Ergebnis/Wert und Bemerkung',
    icon: TrendingUp,
    columns: [
      { label: 'Ergebnis/Wert', type: 'text' },
      { label: 'Bemerkung', type: 'text' },
    ],
  },
];

const createId = (prefix: string) =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `${prefix}_${crypto.randomUUID()}`
    : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

interface Props {
  studentId: string;
}

export default function DossierDevelopmentLists({ studentId }: Props) {
  const { app, setApp } = useApp();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [newColumnName, setNewColumnName] = useState('');
  const [entryDate, setEntryDate] = useState(toLocalDateKey());
  const [entryValues, setEntryValues] = useState<Record<string, string>>({});

  const lists = useMemo(
    () => (app.studentDevelopmentLists || []).filter(list => list.schuelerId === studentId),
    [app.studentDevelopmentLists, studentId],
  );
  const activeList = lists.find(list => list.id === selectedListId) || lists[0] || null;

  React.useEffect(() => {
    if (activeList && selectedListId !== activeList.id) setSelectedListId(activeList.id);
    if (!activeList && selectedListId) setSelectedListId(null);
  }, [activeList?.id, selectedListId]);

  React.useEffect(() => {
    setSelectedListId(null);
    setEntryDate(toLocalDateKey());
    setEntryValues({});
  }, [studentId]);

  const createList = (preset?: Preset) => {
    const title = (preset?.label || customTitle).trim();
    if (!title) return;
    const columns: CustomListColumn[] = (preset?.columns || [
      { label: 'Ergebnis/Wert', type: 'text' as const },
      { label: 'Bemerkung', type: 'text' as const },
    ]).map(column => ({
      id: createId('col'),
      label: column.label,
      type: column.type,
    }));
    const now = new Date().toISOString();
    const list: StudentDevelopmentList = {
      id: createId('devlist'),
      schuelerId: studentId,
      titel: title,
      beschreibung: preset?.description,
      spalten: columns,
      eintraege: [],
      erstelltAm: now,
      updatedAm: now,
    };
    setApp(prev => ({
      ...prev,
      studentDevelopmentLists: [...(prev.studentDevelopmentLists || []), list],
    }));
    setSelectedListId(list.id);
    setCustomTitle('');
  };

  const addColumn = () => {
    if (!activeList || !newColumnName.trim()) return;
    const column: CustomListColumn = {
      id: createId('col'),
      label: newColumnName.trim(),
      type: 'text',
    };
    setApp(prev => ({
      ...prev,
      studentDevelopmentLists: (prev.studentDevelopmentLists || []).map(list =>
        list.id === activeList.id
          ? { ...list, spalten: [...list.spalten, column], updatedAm: new Date().toISOString() }
          : list
      ),
    }));
    setNewColumnName('');
  };

  const removeColumn = (columnId: string) => {
    if (!activeList) return;
    setApp(prev => ({
      ...prev,
      studentDevelopmentLists: (prev.studentDevelopmentLists || []).map(list => {
        if (list.id !== activeList.id) return list;
        return {
          ...list,
          spalten: list.spalten.filter(column => column.id !== columnId),
          eintraege: list.eintraege.map(entry => {
            const values = { ...entry.werte };
            delete values[columnId];
            return { ...entry, werte: values };
          }),
          updatedAm: new Date().toISOString(),
        };
      }),
    }));
  };

  const addEntry = () => {
    if (!activeList || !entryDate) return;
    const values: Record<string, string | number | boolean> = {};
    activeList.spalten.forEach(column => {
      const raw = entryValues[column.id] ?? '';
      values[column.id] = column.type === 'number' && raw !== '' ? Number(raw) : raw;
    });
    const now = new Date().toISOString();
    setApp(prev => ({
      ...prev,
      studentDevelopmentLists: (prev.studentDevelopmentLists || []).map(list =>
        list.id === activeList.id
          ? {
              ...list,
              eintraege: [
                ...list.eintraege,
                { id: createId('entry'), datum: entryDate, werte: values, erstelltAm: now, updatedAm: now },
              ],
              updatedAm: now,
            }
          : list
      ),
    }));
    setEntryValues({});
  };

  const removeEntry = (entryId: string) => {
    if (!activeList) return;
    setApp(prev => ({
      ...prev,
      studentDevelopmentLists: (prev.studentDevelopmentLists || []).map(list =>
        list.id === activeList.id
          ? { ...list, eintraege: list.eintraege.filter(entry => entry.id !== entryId), updatedAm: new Date().toISOString() }
          : list
      ),
    }));
  };

  const removeList = (listId: string) => {
    setApp(prev => ({
      ...prev,
      studentDevelopmentLists: (prev.studentDevelopmentLists || []).filter(list => list.id !== listId),
    }));
    setSelectedListId(null);
  };

  const sortedEntries = activeList
    ? [...activeList.eintraege].sort((a, b) => b.datum.localeCompare(a.datum) || (b.erstelltAm || '').localeCompare(a.erstelltAm || ''))
    : [];

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-3xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900">Fortlaufende Entwicklungslisten</h3>
            <p className="mt-1 max-w-2xl text-xs font-medium leading-relaxed text-slate-500">
              Flexible, chronologische Verläufe für dieses Kind. Datum ist immer enthalten; weitere Spalten bestimmst du selbst.
            </p>
          </div>
          <div className="text-xs font-bold text-slate-400">{lists.length} {lists.length === 1 ? 'Liste' : 'Listen'}</div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {PRESETS.map(preset => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => createList(preset)}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50"
              >
                <span className="flex items-center gap-2 text-xs font-black text-slate-800"><Icon size={14} /> {preset.label}</span>
                <span className="mt-1 block text-[0.6875rem] font-medium leading-relaxed text-slate-500">{preset.description}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={customTitle}
            onChange={event => setCustomTitle(event.target.value)}
            placeholder="Eigene Liste, z. B. Lesetagebuch"
            className="min-h-10 flex-1 rounded-xl border border-slate-200 px-3 text-xs font-semibold outline-none focus:border-indigo-400"
          />
          <button
            type="button"
            onClick={() => createList()}
            disabled={!customTitle.trim()}
            className="min-h-10 rounded-xl bg-slate-900 px-4 text-xs font-black text-white disabled:opacity-40"
          >
            Eigene Liste erstellen
          </button>
        </div>
      </section>

      {lists.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {lists.map(list => (
            <button
              key={list.id}
              type="button"
              onClick={() => setSelectedListId(list.id)}
              className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                activeList?.id === list.id
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300'
              }`}
            >
              {list.titel}
            </button>
          ))}
        </div>
      )}

      {activeList && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-3xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
            <div>
              <h4 className="text-sm font-black text-slate-900">{activeList.titel}</h4>
              <p className="mt-0.5 text-[0.6875rem] font-medium text-slate-500">{activeList.eintraege.length} Einträge · chronologisch</p>
            </div>
            <button
              type="button"
              onClick={() => removeList(activeList.id)}
              className="rounded-lg px-2.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
            >
              <Trash2 size={14} className="inline mr-1" /> Liste löschen
            </button>
          </div>

          <div className="border-b border-slate-100 bg-slate-50/70 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-black text-slate-700">
              <Columns3 size={14} /> Spalten
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[0.6875rem] font-bold text-slate-600">Datum</span>
              {activeList.spalten.map(column => (
                <span key={column.id} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[0.6875rem] font-bold text-slate-600">
                  {column.label}
                  <button type="button" onClick={() => removeColumn(column.id)} aria-label={`Spalte ${column.label} löschen`} className="text-slate-300 hover:text-rose-500">×</button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={newColumnName}
                onChange={event => setNewColumnName(event.target.value)}
                placeholder="Neue Spalte"
                className="min-h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-indigo-400"
              />
              <button type="button" onClick={addColumn} disabled={!newColumnName.trim()} className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 disabled:opacity-40">
                <Plus size={13} className="inline mr-1" /> Spalte
              </button>
            </div>
          </div>

          <div className="border-b border-slate-100 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-black text-slate-700">
              <ListPlus size={14} /> Neuer Eintrag
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-1">
                <span className="block text-[0.625rem] font-black uppercase tracking-wider text-slate-400">Datum</span>
                <input type="date" value={entryDate} onChange={event => setEntryDate(event.target.value)} className="min-h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-semibold" />
              </label>
              {activeList.spalten.map(column => (
                <label key={column.id} className="space-y-1">
                  <span className="block text-[0.625rem] font-black uppercase tracking-wider text-slate-400">{column.label}</span>
                  <input
                    type={column.type === 'number' ? 'number' : 'text'}
                    value={entryValues[column.id] ?? ''}
                    onChange={event => setEntryValues(values => ({ ...values, [column.id]: event.target.value }))}
                    className="min-h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-semibold"
                  />
                </label>
              ))}
            </div>
            <button type="button" onClick={addEntry} className="mt-3 min-h-10 rounded-xl bg-indigo-600 px-4 text-xs font-black text-white hover:bg-indigo-700">
              Eintrag speichern
            </button>
          </div>

          <div className="overflow-x-auto">
            {sortedEntries.length === 0 ? (
              <div className="p-8 text-center text-xs font-semibold text-slate-400">Noch keine Einträge in diesem Verlauf.</div>
            ) : (
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-slate-50 text-[0.625rem] font-black uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Datum</th>
                    {activeList.spalten.map(column => <th key={column.id} className="px-4 py-3">{column.label}</th>)}
                    <th className="w-12 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedEntries.map(entry => (
                    <tr key={entry.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-700">{entry.datum.split('-').reverse().join('.')}</td>
                      {activeList.spalten.map(column => (
                        <td key={column.id} className="px-4 py-3 font-medium text-slate-600">{String(entry.werte[column.id] ?? '') || '—'}</td>
                      ))}
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => removeEntry(entry.id)} aria-label="Eintrag löschen" className="text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
