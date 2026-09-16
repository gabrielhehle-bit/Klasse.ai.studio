import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CustomList, CustomListColumn, CustomListColumnType } from '../../types';
import {
  Plus, Trash2, Edit2, Check, X, Printer, Download, Search,
  AlertTriangle, Sliders, CheckSquare, Hash, Type, Sparkles,
  ChevronDown, HelpCircle, Columns, Filter, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FlexibleListsViewProps {
  onOpenCreateModal: () => void;
  selectedListId?: string | null;
  onSelectListId: (id: string | null) => void;
}

// Predefined Quick Templates for easy start
export const PRESET_TEMPLATES: {
  title: string;
  icon: string;
  description: string;
  columns: { label: string; type: CustomListColumnType; options?: string[] }[];
}[] = [
  {
    title: 'Schikurs / Wintersport',
    icon: '⛷️',
    description: 'Ausrüstung, Schuhgrößen, Helm und Fahrkönnen',
    columns: [
      { label: 'Schuhgröße', type: 'number' },
      { label: 'Körpergröße (cm)', type: 'number' },
      { label: 'Helm vorhanden', type: 'boolean' },
      { label: 'Leihausrüstung', type: 'select', options: ['Keine', 'Ski + Schuhe', 'Nur Ski', 'Nur Schuhe', 'Snowboard'] },
      { label: 'Fahrkönnen', type: 'select', options: ['Anfänger', 'Leicht fortgeschritten', 'Fortgeschritten', 'Profi'] }
    ]
  },
  {
    title: 'T-Shirts & Merch / Schulfest',
    icon: '👕',
    description: 'Größen, Farbwunsch, Stückzahl und Bezahlung',
    columns: [
      { label: 'Größe', type: 'select', options: ['128', '140', '152', '164', 'XS', 'S', 'M', 'L', 'XL'] },
      { label: 'Farbe', type: 'select', options: ['Königsblau', 'Sonnengelb', 'Waldgrün', 'Weiß', 'Schwarz'] },
      { label: 'Anzahl', type: 'number' },
      { label: 'Bezahlt', type: 'boolean' },
      { label: 'Ausgegeben', type: 'boolean' }
    ]
  },
  {
    title: 'Verpflegung & Allergien',
    icon: '🥗',
    description: 'Essensform, Unverträglichkeiten und Notfallkontakte',
    columns: [
      { label: 'Kostform', type: 'select', options: ['Standard', 'Vegetarisch', 'Vegan', 'Halal', 'Schweinefleischfrei'] },
      { label: 'Allergien / Unverträglichkeiten', type: 'text' },
      { label: 'Eigene Trinkflasche', type: 'boolean' },
      { label: 'Notiz', type: 'text' }
    ]
  },
  {
    title: 'Schwimmabzeichen & Sport',
    icon: '🏊',
    description: 'Schwimmstufe, Brille und Leistungsabzeichen',
    columns: [
      { label: 'Schwimmstufe', type: 'select', options: ['Nichtschwimmer', 'Frühschwimmer (Seepferdchen)', 'Freischwimmer (Bronze)', 'Fahrtenschwimmer (Silber)', 'Allrounder (Gold)'] },
      { label: 'Schwimmbrille vorhanden', type: 'boolean' },
      { label: 'Einverständnis Tieftauchen', type: 'boolean' },
      { label: 'Bemerkung', type: 'text' }
    ]
  },
  {
    title: 'Material- & Bücherrückgabe',
    icon: '📚',
    description: 'Leihbücher, Arbeitshefte und Geräte-Rücklauf',
    columns: [
      { label: 'Lesebuch abgegeben', type: 'boolean' },
      { label: 'Mathebuch abgegeben', type: 'boolean' },
      { label: 'Tablet / iPad Zustand', type: 'select', options: ['Einwandfrei', 'Leichte Gebrauchsspuren', 'Beschädigt', 'Fehlt'] },
      { label: 'Offene Gebühr (€)', type: 'number' },
      { label: 'Notiz', type: 'text' }
    ]
  }
];

export default function FlexibleListsView({
  onOpenCreateModal,
  selectedListId,
  onSelectListId
}: FlexibleListsViewProps) {
  const { app, setApp } = useApp();
  const students = app.schueler || [];
  const rawLists = app.customLists || [];

  // Normalize custom lists (handling both new multi-column and legacy single-column format)
  const customLists: CustomList[] = useMemo(() => {
    return rawLists.map(list => {
      // If legacy single column format
      if (!list.spalten || list.spalten.length === 0) {
        const legacyColName = (list as any).spaltenName || 'Wert';
        const legacyColId = 'col-legacy';
        const convertedWerte: Record<string, Record<string, any>> = {};
        if (list.werte) {
          Object.keys(list.werte).forEach(sid => {
            const rawVal = (list.werte as any)[sid];
            if (rawVal && typeof rawVal === 'object' && !Array.isArray(rawVal)) {
              convertedWerte[sid] = rawVal;
            } else {
              convertedWerte[sid] = { [legacyColId]: rawVal };
            }
          });
        }
        return {
          id: list.id,
          titel: list.titel,
          spalten: [{ id: legacyColId, label: legacyColName, type: 'text' as CustomListColumnType }],
          werte: convertedWerte,
          erstelltAm: list.erstelltAm || new Date().toISOString()
        };
      }
      return list;
    });
  }, [rawLists]);

  // Current active list
  const activeList = useMemo(() => {
    if (!customLists.length) return null;
    if (selectedListId) {
      const found = customLists.find(l => l.id === selectedListId);
      if (found) return found;
    }
    return customLists[0];
  }, [customLists, selectedListId]);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Column management modal states
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [newColLabel, setNewColLabel] = useState('');
  const [newColType, setNewColType] = useState<CustomListColumnType>('text');
  const [newColOptions, setNewColOptions] = useState('');

  // Edit column state
  const [editingColumn, setEditingColumn] = useState<CustomListColumn | null>(null);

  // Edit list title modal state
  const [isEditListTitleOpen, setIsEditListTitleOpen] = useState(false);
  const [editListTitleInput, setEditListTitleInput] = useState('');
  const [editListDescInput, setEditListDescInput] = useState('');

  // Delete column confirmation state
  const [columnToDelete, setColumnToDelete] = useState<{ column: CustomListColumn; dataCount: number } | null>(null);

  // Delete list confirmation state
  const [listToDelete, setListToDelete] = useState<CustomList | null>(null);

  useEffect(() => {
    setSearchQuery('');
    setIsAddColumnOpen(false);
    setNewColLabel('');
    setNewColType('text');
    setNewColOptions('');
    setEditingColumn(null);
    setIsEditListTitleOpen(false);
    setEditListTitleInput('');
    setEditListDescInput('');
    setColumnToDelete(null);
    setListToDelete(null);
  }, [app.activeClassId]);

  // Filtered students
  const sortedAndFilteredStudents = useMemo(() => {
    let list = [...students].sort((a, b) => {
      const nameA = `${a.nachname || ''} ${a.vorname || ''}`.trim().toLowerCase();
      const nameB = `${b.nachname || ''} ${b.vorname || ''}`.trim().toLowerCase();
      return nameA.localeCompare(nameB, 'de');
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(st => {
        const fullName = `${st.vorname} ${st.nachname}`.toLowerCase();
        const reversed = `${st.nachname} ${st.vorname}`.toLowerCase();
        return fullName.includes(q) || reversed.includes(q);
      });
    }

    return list;
  }, [students, searchQuery]);

  // Handle cell value change
  const handleCellChange = (studentId: string, columnId: string, value: any) => {
    if (!activeList) return;

    setApp(prev => {
      const currentLists = prev.customLists || [];
      const updated = currentLists.map(l => {
        if (l.id !== activeList.id) return l;

        const currentWerte = l.werte || {};
        const studentWerte = currentWerte[studentId] ? { ...currentWerte[studentId] } : {};

        if (value === '' || value === null || value === undefined) {
          delete studentWerte[columnId];
        } else {
          studentWerte[columnId] = value;
        }

        const newWerte = { ...currentWerte };
        if (Object.keys(studentWerte).length === 0) {
          delete newWerte[studentId];
        } else {
          newWerte[studentId] = studentWerte;
        }

        return {
          ...l,
          werte: newWerte,
          updatedAm: new Date().toISOString()
        };
      });

      return { ...prev, customLists: updated };
    });
  };

  // Add new column
  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeList || !newColLabel.trim()) return;

    const columnId = 'col_' + Math.random().toString(36).substring(2, 9);
    const optionsArray = newColType === 'select'
      ? newColOptions.split(',').map(o => o.trim()).filter(Boolean)
      : undefined;

    const newColumn: CustomListColumn = {
      id: columnId,
      label: newColLabel.trim(),
      type: newColType,
      options: optionsArray && optionsArray.length > 0 ? optionsArray : (newColType === 'select' ? ['Ja', 'Nein'] : undefined)
    };

    setApp(prev => {
      const currentLists = prev.customLists || [];
      const updated = currentLists.map(l => {
        if (l.id !== activeList.id) return l;
        return {
          ...l,
          spalten: [...(l.spalten || []), newColumn],
          updatedAm: new Date().toISOString()
        };
      });
      return { ...prev, customLists: updated };
    });

    setNewColLabel('');
    setNewColType('text');
    setNewColOptions('');
    setIsAddColumnOpen(false);
  };

  // Save edited column
  const handleSaveEditColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeList || !editingColumn || !editingColumn.label.trim()) return;

    const optionsArray = editingColumn.type === 'select' && editingColumn.options
      ? editingColumn.options
      : undefined;

    setApp(prev => {
      const currentLists = prev.customLists || [];
      const updated = currentLists.map(l => {
        if (l.id !== activeList.id) return l;
        const newCols = (l.spalten || []).map(col => {
          if (col.id !== editingColumn.id) return col;
          return {
            ...col,
            label: editingColumn.label.trim(),
            type: editingColumn.type,
            options: optionsArray
          };
        });
        return {
          ...l,
          spalten: newCols,
          updatedAm: new Date().toISOString()
        };
      });
      return { ...prev, customLists: updated };
    });

    setEditingColumn(null);
  };

  // Trigger column deletion check
  const confirmDeleteColumn = (column: CustomListColumn) => {
    if (!activeList) return;

    // Count existing non-empty values
    let count = 0;
    if (activeList.werte) {
      Object.values(activeList.werte).forEach(stObj => {
        if (stObj && stObj[column.id] !== undefined && stObj[column.id] !== '' && stObj[column.id] !== null) {
          count++;
        }
      });
    }

    if (count > 0) {
      setColumnToDelete({ column, dataCount: count });
    } else {
      executeDeleteColumn(column.id);
    }
  };

  // Execute column deletion
  const executeDeleteColumn = (columnId: string) => {
    if (!activeList) return;

    setApp(prev => {
      const currentLists = prev.customLists || [];
      const updated = currentLists.map(l => {
        if (l.id !== activeList.id) return l;

        const newCols = (l.spalten || []).filter(c => c.id !== columnId);
        const newWerte = { ...(l.werte || {}) };

        // Clean up values for this column
        Object.keys(newWerte).forEach(sid => {
          if (newWerte[sid] && newWerte[sid][columnId] !== undefined) {
            const stObj = { ...newWerte[sid] };
            delete stObj[columnId];
            if (Object.keys(stObj).length === 0) {
              delete newWerte[sid];
            } else {
              newWerte[sid] = stObj;
            }
          }
        });

        return {
          ...l,
          spalten: newCols,
          werte: newWerte,
          updatedAm: new Date().toISOString()
        };
      });
      return { ...prev, customLists: updated };
    });

    setColumnToDelete(null);
  };

  // Delete entire list
  const executeDeleteList = (listId: string) => {
    setApp(prev => {
      const currentLists = (prev.customLists || []).filter(l => l.id !== listId);
      return { ...prev, customLists: currentLists };
    });

    if (activeList && activeList.id === listId) {
      const remaining = customLists.filter(l => l.id !== listId);
      onSelectListId(remaining.length > 0 ? remaining[0].id : null);
    }
    setListToDelete(null);
  };

  // Rename list
  const handleSaveEditList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeList || !editListTitleInput.trim()) return;

    setApp(prev => {
      const currentLists = prev.customLists || [];
      const updated = currentLists.map(l => {
        if (l.id !== activeList.id) return l;
        return {
          ...l,
          titel: editListTitleInput.trim(),
          beschreibung: editListDescInput.trim() || undefined,
          updatedAm: new Date().toISOString()
        };
      });
      return { ...prev, customLists: updated };
    });

    setIsEditListTitleOpen(false);
  };

  // Create list from preset
  const handleCreateFromPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    const listId = 'custom_' + Math.random().toString(36).substring(2, 9);
    const columns: CustomListColumn[] = preset.columns.map((c, i) => ({
      id: `col_${i}_` + Math.random().toString(36).substring(2, 7),
      label: c.label,
      type: c.type,
      options: c.options
    }));

    const newList: CustomList = {
      id: listId,
      titel: preset.title,
      beschreibung: preset.description,
      spalten: columns,
      werte: {},
      erstelltAm: new Date().toISOString()
    };

    setApp(prev => ({
      ...prev,
      customLists: [...(prev.customLists || []), newList]
    }));

    onSelectListId(listId);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!activeList) return;

    const headers = ['Nachname', 'Vorname', ...(activeList.spalten || []).map(c => `"${c.label.replace(/"/g, '""')}"`)];
    const rows = sortedAndFilteredStudents.map(st => {
      const stWerte = activeList.werte?.[st.id] || {};
      const rowCols = (activeList.spalten || []).map(col => {
        const val = stWerte[col.id];
        if (val === undefined || val === null) return '""';
        if (col.type === 'boolean') return val ? '"Ja"' : '"Nein"';
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      return [`"${st.nachname || ''}"`, `"${st.vorname || ''}"`, ...rowCols].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Klassenliste_${activeList.titel.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print list
  const handlePrint = () => {
    window.print();
  };

  // Helper for column statistics
  const getColumnSummary = (col: CustomListColumn) => {
    if (!activeList) return null;
    const values = sortedAndFilteredStudents.map(st => activeList.werte?.[st.id]?.[col.id]);
    const filledCount = values.filter(v => v !== undefined && v !== '' && v !== null).length;

    if (col.type === 'boolean') {
      const yesCount = values.filter(v => v === true).length;
      return `${yesCount} von ${students.length} Ja (${Math.round((yesCount / (students.length || 1)) * 100)}%)`;
    }

    if (col.type === 'number') {
      const numValues = values.filter(v => typeof v === 'number' || (typeof v === 'string' && !isNaN(Number(v)) && v !== '')).map(Number);
      if (numValues.length === 0) return 'Keine Zahlen eingetragen';
      const avg = (numValues.reduce((a, b) => a + b, 0) / numValues.length).toFixed(1);
      return `Ø ${avg} (${numValues.length} ausgefüllt)`;
    }

    if (col.type === 'select') {
      const counts: Record<string, number> = {};
      values.forEach(v => {
        if (v) counts[String(v)] = (counts[String(v)] || 0) + 1;
      });
      const entries = Object.entries(counts);
      if (entries.length === 0) return '0 ausgefüllt';
      return entries.map(([opt, cnt]) => `${opt}: ${cnt}`).join(' • ');
    }

    return `${filledCount} von ${students.length} eingetragen`;
  };

  return (
    <div className="space-y-5">
      {/* HEADER SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[1.125rem] font-black text-slate-900 tracking-tight">
              Flexible Klassenlisten
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[0.6875rem] font-bold border border-purple-100">
              {customLists.length} {customLists.length === 1 ? 'Liste' : 'Listen'}
            </span>
          </div>
          <p className="text-[0.75rem] font-medium text-slate-500">
            Eigene Organisationslisten mit frei wählbaren Spalten (Größen, Wünsche, Ausrüstung, etc.)
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={onOpenCreateModal}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[0.75rem] flex items-center gap-1.5 shadow-xs transition-all"
          >
            <Plus size={15} />
            <span>Neue Liste</span>
          </button>
        </div>
      </div>

      {/* NO LISTS EMPTY STATE */}
      {customLists.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs space-y-6 text-center max-w-3xl mx-auto">
          <div className="w-14 h-14 bg-purple-50 rounded-2xl border border-purple-100 flex items-center justify-center text-purple-600 mx-auto">
            <Columns size={28} />
          </div>

          <div className="space-y-1">
            <h3 className="text-[1.125rem] font-bold text-slate-900">Noch keine Flexible Liste angelegt</h3>
            <p className="text-[0.8125rem] text-slate-500 max-w-md mx-auto">
              Erstelle flexible Tabellen mit beliebigen Spalten für die Schüler:innen dieser Klasse oder wähle eine praktische Vorlage:
            </p>
          </div>

          {/* TEMPLATE QUICK STARTERS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
            {PRESET_TEMPLATES.slice(0, 4).map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleCreateFromPreset(preset)}
                className="p-4 rounded-2xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/80 hover:border-indigo-200 text-left space-y-1.5 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-[0.875rem] text-slate-900 group-hover:text-indigo-900">
                    <span className="text-xl">{preset.icon}</span>
                    <span>{preset.title}</span>
                  </div>
                  <Plus size={14} className="text-slate-400 group-hover:text-indigo-600" />
                </div>
                <p className="text-[0.6875rem] text-slate-500 leading-snug">
                  {preset.description}
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {preset.columns.map((c, ci) => (
                    <span key={ci} className="px-1.5 py-0.5 rounded bg-white text-[0.625rem] font-medium text-slate-600 border border-slate-200/60">
                      {c.label}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>

          <div className="pt-2">
            <button
              onClick={onOpenCreateModal}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[0.8125rem] shadow-xs inline-flex items-center gap-2 transition-all"
            >
              <Plus size={16} />
              <span>Eigene leere Liste erstellen</span>
            </button>
          </div>
        </div>
      ) : (
        /* LIST VIEW WITH TABS & ACTIVE TABLE */
        <div className="space-y-4">
          
          {/* HORIZONTAL LIST TABS */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {customLists.map(list => {
              const isActive = activeList?.id === list.id;
              return (
                <button
                  key={list.id}
                  onClick={() => onSelectListId(list.id)}
                  className={`px-4 py-2 rounded-xl font-bold text-[0.8125rem] flex items-center gap-2 shrink-0 transition-all ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-3xs'
                      : 'bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{list.titel}</span>
                  <span className={`text-[0.6875rem] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isActive ? 'bg-purple-700 text-purple-100' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {(list.spalten || []).length}
                  </span>
                </button>
              );
            })}

            <button
              onClick={onOpenCreateModal}
              className="px-3 py-2 rounded-xl border border-dashed border-slate-300 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/40 text-[0.75rem] font-bold flex items-center gap-1.5 shrink-0 transition-all"
            >
              <Plus size={14} />
              <span>Neue Liste</span>
            </button>
          </div>

          {/* ACTIVE LIST CONTENT CARD */}
          {activeList && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              
              {/* TABLE CONTROLS TOOLBAR */}
              <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/50">
                
                {/* LIST TITLE & ACTIONS */}
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-[1rem] font-black text-slate-900">
                        {activeList.titel}
                      </h3>
                      <button
                        onClick={() => {
                          setEditListTitleInput(activeList.titel);
                          setEditListDescInput(activeList.beschreibung || '');
                          setIsEditListTitleOpen(true);
                        }}
                        title="Titel bearbeiten"
                        className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white transition-all"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                    {activeList.beschreibung && (
                      <p className="text-[0.6875rem] text-slate-500 font-medium">{activeList.beschreibung}</p>
                    )}
                  </div>
                </div>

                {/* SEARCH & ACTIONS BAR */}
                <div className="flex flex-wrap items-center gap-2 justify-end">
                  {/* SEARCH INPUT */}
                  <div className="relative min-w-[160px] max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Schüler suchen..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[0.75rem] font-medium outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200 transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* ADD COLUMN BUTTON */}
                  <button
                    onClick={() => {
                      setNewColLabel('');
                      setNewColType('text');
                      setNewColOptions('');
                      setIsAddColumnOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[0.75rem] flex items-center gap-1.5 shadow-3xs transition-all"
                  >
                    <Plus size={14} />
                    <span>Spalte hinzufügen</span>
                  </button>

                  {/* EXPORT CSV */}
                  <button
                    onClick={handleExportCSV}
                    title="Als CSV herunterladen"
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[0.75rem] flex items-center gap-1 transition-all"
                  >
                    <Download size={14} />
                    <span className="hidden sm:inline">Export</span>
                  </button>

                  {/* PRINT */}
                  <button
                    onClick={handlePrint}
                    title="Liste drucken"
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[0.75rem] flex items-center gap-1 transition-all"
                  >
                    <Printer size={14} />
                    <span className="hidden sm:inline">Drucken</span>
                  </button>

                  {/* DELETE LIST */}
                  <button
                    onClick={() => setListToDelete(activeList)}
                    title="Ganze Liste löschen"
                    className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* TABLE DISPLAY */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[0.8125rem] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-600">
                      <th className="p-3 font-bold text-[0.75rem] text-slate-500 uppercase tracking-wider min-w-[180px] sticky left-0 bg-slate-50 z-10">
                        Schüler:in ({sortedAndFilteredStudents.length})
                      </th>

                      {(activeList.spalten || []).map(col => (
                        <th key={col.id} className="p-3 font-bold text-[0.75rem] min-w-[160px] text-slate-700 border-l border-slate-200/50">
                          <div className="flex items-center justify-between gap-1 group">
                            <div className="flex items-center gap-1.5">
                              {col.type === 'number' && <Hash size={13} className="text-blue-500" />}
                              {col.type === 'boolean' && <CheckSquare size={13} className="text-emerald-500" />}
                              {col.type === 'select' && <Sliders size={13} className="text-amber-500" />}
                              {col.type === 'text' && <Type size={13} className="text-slate-400" />}
                              <span className="font-bold text-slate-900">{col.label}</span>
                            </div>

                            <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setEditingColumn({ ...col })}
                                title="Spalte bearbeiten"
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-200/60"
                              >
                                <Edit2 size={11} />
                              </button>
                              <button
                                onClick={() => confirmDeleteColumn(col)}
                                title="Spalte löschen"
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                          
                          {/* Type indicator */}
                          <div className="text-[0.625rem] font-semibold text-slate-400 mt-0.5">
                            {col.type === 'number' ? 'Zahl' :
                             col.type === 'boolean' ? 'Ja / Nein' :
                             col.type === 'select' ? `Auswahl (${col.options?.length || 0})` : 'Text'}
                          </div>
                        </th>
                      ))}

                      {(!activeList.spalten || activeList.spalten.length === 0) && (
                        <th className="p-4 text-slate-400 text-center font-normal">
                          Noch keine Spalten angelegt
                        </th>
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {sortedAndFilteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={(activeList.spalten?.length || 0) + 1} className="p-8 text-center text-slate-400">
                          {searchQuery ? 'Kein Schüler mit diesem Suchbegriff gefunden' : 'Keine Schüler in dieser Klasse vorhanden'}
                        </td>
                      </tr>
                    ) : (
                      sortedAndFilteredStudents.map(st => {
                        const stWerte = activeList.werte?.[st.id] || {};

                        return (
                          <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                            {/* STUDENT NAME */}
                            <td className="p-3 font-bold text-slate-900 sticky left-0 bg-white hover:bg-slate-50/70 z-10 border-r border-slate-100">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-800 text-[0.6875rem] font-black flex items-center justify-center shrink-0">
                                  {(st.vorname?.[0] || '') + (st.nachname?.[0] || '')}
                                </div>
                                <span className="truncate">
                                  {st.nachname} {st.vorname}
                                </span>
                              </div>
                            </td>

                            {/* DYNAMIC COLUMNS */}
                            {(activeList.spalten || []).map(col => {
                              const cellValue = stWerte[col.id];

                              return (
                                <td key={col.id} className="p-2 border-l border-slate-100 align-middle">
                                  {/* TYPE: BOOLEAN */}
                                  {col.type === 'boolean' && (
                                    <button
                                      type="button"
                                      onClick={() => handleCellChange(st.id, col.id, !cellValue)}
                                      className={`w-full py-1.5 px-3 rounded-xl font-bold text-[0.75rem] flex items-center justify-center gap-1.5 transition-all ${
                                        cellValue === true
                                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300/60 shadow-3xs'
                                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200/80 border border-slate-200/60'
                                      }`}
                                    >
                                      {cellValue === true ? (
                                        <>
                                          <Check size={14} className="stroke-[3]" />
                                          <span>Ja</span>
                                        </>
                                      ) : (
                                        <>
                                          <X size={14} className="opacity-40" />
                                          <span>Nein</span>
                                        </>
                                      )}
                                    </button>
                                  )}

                                  {/* TYPE: NUMBER */}
                                  {col.type === 'number' && (
                                    <input
                                      type="number"
                                      value={cellValue !== undefined && cellValue !== null ? cellValue : ''}
                                      onChange={e => {
                                        const val = e.target.value === '' ? '' : Number(e.target.value);
                                        handleCellChange(st.id, col.id, val);
                                      }}
                                      placeholder="—"
                                      className="w-full px-2.5 py-1.5 rounded-xl bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-purple-500 font-mono font-bold text-slate-800 outline-none text-center transition-all"
                                    />
                                  )}

                                  {/* TYPE: SELECT / DROPDOWN */}
                                  {col.type === 'select' && (
                                    <div className="relative">
                                      <select
                                        value={cellValue || ''}
                                        onChange={e => handleCellChange(st.id, col.id, e.target.value)}
                                        className={`w-full px-2.5 py-1.5 pr-7 rounded-xl font-medium text-[0.75rem] outline-none transition-all cursor-pointer appearance-none ${
                                          cellValue
                                            ? 'bg-amber-50/80 text-amber-900 border border-amber-200 font-bold'
                                            : 'bg-transparent hover:bg-white border border-transparent hover:border-slate-200 text-slate-400'
                                        }`}
                                      >
                                        <option value="">— Bitte wählen —</option>
                                        {(col.options || []).map((opt, idx) => (
                                          <option key={idx} value={opt} className="text-slate-800 font-medium">
                                            {opt}
                                          </option>
                                        ))}
                                      </select>
                                      <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                  )}

                                  {/* TYPE: TEXT */}
                                  {col.type === 'text' && (
                                    <input
                                      type="text"
                                      value={cellValue || ''}
                                      onChange={e => handleCellChange(st.id, col.id, e.target.value)}
                                      placeholder="Eintragen..."
                                      className="w-full px-2.5 py-1.5 rounded-xl bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-purple-500 text-slate-800 text-[0.75rem] font-medium outline-none transition-all"
                                    />
                                  )}
                                </td>
                              );
                            })}

                            {(!activeList.spalten || activeList.spalten.length === 0) && (
                              <td className="p-3 text-slate-400 text-center">
                                Keine Spalten
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>

                  {/* SUMMARY FOOTER */}
                  {(activeList.spalten || []).length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-50/80 border-t border-slate-200 font-semibold text-[0.6875rem] text-slate-500">
                        <td className="p-3 font-bold sticky left-0 bg-slate-50/80 z-10 border-r border-slate-100">
                          Zusammenfassung
                        </td>
                        {(activeList.spalten || []).map(col => (
                          <td key={col.id} className="p-3 border-l border-slate-100">
                            {getColumnSummary(col)}
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* QUICK ADD COLUMN FOOTER (IF NO COLUMNS YET) */}
              {(!activeList.spalten || activeList.spalten.length === 0) && (
                <div className="p-6 text-center bg-slate-50/50 border-t border-slate-100 space-y-2">
                  <p className="text-[0.8125rem] text-slate-500">Diese Liste hat noch keine Spalten.</p>
                  <button
                    onClick={() => {
                      setNewColLabel('');
                      setNewColType('text');
                      setNewColOptions('');
                      setIsAddColumnOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[0.75rem] inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus size={14} /> Erste Spalte anlegen
                  </button>
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: SPALTE HINZUFÜGEN                                             */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {isAddColumnOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddColumnOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4 z-10"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Columns size={18} className="text-purple-600" />
                  <h3 className="text-[1rem] font-bold text-slate-900">Neue Spalte hinzufügen</h3>
                </div>
                <button onClick={() => setIsAddColumnOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddColumn} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[0.6875rem] font-bold text-slate-700">Spaltenname*</label>
                  <input
                    type="text"
                    required
                    placeholder="z.B. Schuhgröße, Helm vorhanden, Essen"
                    value={newColLabel}
                    onChange={e => setNewColLabel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[0.8125rem] font-bold outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[0.6875rem] font-bold text-slate-700">Datentyp*</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewColType('text')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                        newColType === 'text'
                          ? 'border-purple-500 bg-purple-50/50 text-purple-900 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Type size={16} className="text-slate-400" />
                      <div>
                        <div className="text-[0.75rem]">Text</div>
                        <div className="text-[0.625rem] text-slate-400 font-normal">Beliebiger Text</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewColType('number')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                        newColType === 'number'
                          ? 'border-purple-500 bg-purple-50/50 text-purple-900 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Hash size={16} className="text-blue-500" />
                      <div>
                        <div className="text-[0.75rem]">Zahl</div>
                        <div className="text-[0.625rem] text-slate-400 font-normal">Größe, Anzahl</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewColType('boolean')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                        newColType === 'boolean'
                          ? 'border-purple-500 bg-purple-50/50 text-purple-900 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <CheckSquare size={16} className="text-emerald-500" />
                      <div>
                        <div className="text-[0.75rem]">Ja / Nein</div>
                        <div className="text-[0.625rem] text-slate-400 font-normal">Häkchen Toggle</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewColType('select')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                        newColType === 'select'
                          ? 'border-purple-500 bg-purple-50/50 text-purple-900 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Sliders size={16} className="text-amber-500" />
                      <div>
                        <div className="text-[0.75rem]">Auswahl</div>
                        <div className="text-[0.625rem] text-slate-400 font-normal">Dropdown Menü</div>
                      </div>
                    </button>
                  </div>
                </div>

                {newColType === 'select' && (
                  <div className="space-y-1 bg-amber-50/50 p-3 rounded-2xl border border-amber-100">
                    <label className="text-[0.6875rem] font-bold text-amber-900">
                      Optionen (durch Komma getrennt)*
                    </label>
                    <input
                      type="text"
                      placeholder="z.B. S, M, L, XL oder Normal, Veggie, Halal"
                      value={newColOptions}
                      onChange={e => setNewColOptions(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-amber-200 text-[0.75rem] font-bold outline-none"
                    />
                    <p className="text-[0.625rem] text-amber-700">
                      Tipp: Gib die gewünschten Auswahlmöglichkeiten getrennt mit Komma ein.
                    </p>
                  </div>
                )}

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddColumnOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-[0.75rem] hover:bg-slate-50"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[0.75rem] shadow-xs"
                  >
                    Spalte anlegen
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================================== */}
      {/* MODAL: SPALTE BEARBEITEN                                             */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {editingColumn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingColumn(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4 z-10"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Edit2 size={18} className="text-purple-600" />
                  <h3 className="text-[1rem] font-bold text-slate-900">Spalte anpassen</h3>
                </div>
                <button onClick={() => setEditingColumn(null)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEditColumn} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[0.6875rem] font-bold text-slate-700">Spaltenname*</label>
                  <input
                    type="text"
                    required
                    value={editingColumn.label}
                    onChange={e => setEditingColumn({ ...editingColumn, label: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[0.8125rem] font-bold outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>

                {editingColumn.type === 'select' && (
                  <div className="space-y-1 bg-amber-50/50 p-3 rounded-2xl border border-amber-100">
                    <label className="text-[0.6875rem] font-bold text-amber-900">
                      Optionen (durch Komma getrennt)*
                    </label>
                    <input
                      type="text"
                      value={editingColumn.options?.join(', ') || ''}
                      onChange={e => setEditingColumn({
                        ...editingColumn,
                        options: e.target.value.split(',').map(o => o.trim()).filter(Boolean)
                      })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-amber-200 text-[0.75rem] font-bold outline-none"
                    />
                  </div>
                )}

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingColumn(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-[0.75rem] hover:bg-slate-50"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[0.75rem] shadow-xs"
                  >
                    Speichern
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================================== */}
      {/* MODAL: SICHERHEITSABFRAGE SPALTE LÖSCHEN                             */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {columnToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setColumnToDelete(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4 z-10"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 className="text-[1rem] font-bold text-slate-900">Spalte wirklich löschen?</h3>
                  <p className="text-[0.6875rem] text-rose-600 font-bold">Bereits eingetragene Daten gehen verloren</p>
                </div>
              </div>

              <p className="text-[0.8125rem] text-slate-600 leading-relaxed">
                In der Spalte <strong className="text-slate-900">„{columnToDelete.column.label}“</strong> sind bereits bei <strong className="text-rose-600">{columnToDelete.dataCount} Schülern</strong> Daten eingetragen. Wenn du die Spalte löschst, werden diese Einträge unwiderruflich entfernt.
              </p>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setColumnToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-[0.75rem] hover:bg-slate-50"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={() => executeDeleteColumn(columnToDelete.column.id)}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[0.75rem] shadow-xs"
                >
                  Ja, Spalte löschen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================================== */}
      {/* MODAL: LISTE BEARBEITEN (TITEL & BESCHREIBUNG)                       */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {isEditListTitleOpen && activeList && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditListTitleOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4 z-10"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-[1rem] font-bold text-slate-900">Liste umbenennen</h3>
                <button onClick={() => setIsEditListTitleOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEditList} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[0.6875rem] font-bold text-slate-700">Listentitel*</label>
                  <input
                    type="text"
                    required
                    value={editListTitleInput}
                    onChange={e => setEditListTitleInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[0.8125rem] font-bold outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[0.6875rem] font-bold text-slate-700">Beschreibung / Zweck (optional)</label>
                  <input
                    type="text"
                    value={editListDescInput}
                    onChange={e => setEditListDescInput(e.target.value)}
                    placeholder="z.B. Für den Schikurs im Februar"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[0.8125rem] font-medium outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditListTitleOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-[0.75rem] hover:bg-slate-50"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[0.75rem] shadow-xs"
                  >
                    Speichern
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================================== */}
      {/* MODAL: SICHERHEITSABFRAGE LISTE LÖSCHEN                              */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {listToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setListToDelete(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4 z-10"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
                  <Trash2 size={22} />
                </div>
                <div>
                  <h3 className="text-[1rem] font-bold text-slate-900">Liste löschen?</h3>
                  <p className="text-[0.6875rem] text-rose-600 font-bold">Unwiderruflicher Vorgang</p>
                </div>
              </div>

              <p className="text-[0.8125rem] text-slate-600 leading-relaxed">
                Möchtest du die Liste <strong className="text-slate-900">„{listToDelete.titel}“</strong> mit allen Spalten und eingetragenen Werten wirklich löschen?
              </p>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setListToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-[0.75rem] hover:bg-slate-50"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={() => executeDeleteList(listToDelete.id)}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[0.75rem] shadow-xs"
                >
                  Ja, Liste löschen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
