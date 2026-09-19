import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext';
import {
  SchuelerWochenplan,
  SchuelerWochenplanAufgabe,
  SchuelerWochenplanDarstellung,
  SchuelerAufgabeTyp,
  SchuelerDifferenzierung
} from '../../types';
import {
  createInitialSchuelerWochenplan,
  analyzeWochenplanForStudents,
  hasWochenplanChanged,
  computeWochenplanHash,
  makeChildFriendlyTask,
  WOCHENPLAN_TAGE
} from '../../lib/wochenplanAnalyzer';
import { SchuelerWochenplanA4Sheet } from './SchuelerWochenplanA4Sheet';
import {
  X,
  Printer,
  Save,
  CheckSquare,
  Square,
  Sparkles,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Filter,
  Layers,
  Calendar,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Star,
  Clock,
  Eye,
  Settings,
  Archive,
  Download,
  Check,
  Search,
  Pencil,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  activeKW: number;
  onClose: () => void;
}

export const WochenplanGeneratorModal: React.FC<Props> = ({ activeKW, onClose }) => {
  const { app, setApp } = useApp();

  // Find if there is an existing saved student weekly plan for this KW
  const existingSavedPlan = useMemo(() => {
    const plans = app.schuelerWochenplaene || {};
    // Find plan matching this KW
    const found = Object.values(plans).find(p => p.kw === activeKW);
    return found || null;
  }, [app.schuelerWochenplaene, activeKW]);

  // Current working plan state
  const [plan, setPlan] = useState<SchuelerWochenplan>(() => {
    if (existingSavedPlan) {
      return JSON.parse(JSON.stringify(existingSavedPlan));
    }
    return createInitialSchuelerWochenplan(app, activeKW);
  });

  const [activeTab, setActiveTab] = useState<'auswahl' | 'gestaltung' | 'vorschau' | 'gespeichert'>('auswahl');
  const [filterDay, setFilterDay] = useState<string>('alle');
  const [filterFach, setFilterFach] = useState<string>('alle');
  const [filterTyp, setFilterTyp] = useState<string>('alle');
  const [filterDiff, setFilterDiff] = useState<string>('alle');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [colorMode, setColorMode] = useState<'color' | 'mono'>('color');

  // New task form state
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDetail, setNewTaskDetail] = useState('');
  const [newTaskFach, setNewTaskFach] = useState('Deutsch');
  const [newTaskTag, setNewTaskTag] = useState('Montag');
  const [newTaskTyp, setNewTaskTyp] = useState<SchuelerAufgabeTyp>('pflicht');
  const [newTaskDiff, setNewTaskDiff] = useState<SchuelerDifferenzierung>('alle');
  const [newTaskMin, setNewTaskMin] = useState<number>(20);

  // Status feedback
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'warn' } | null>(null);

  // Check if original teacher's weekly plan changed since the student plan was created
  const isOriginalChanged = useMemo(() => {
    return hasWochenplanChanged(plan, app);
  }, [plan, app]);

  const showToast = (msg: string, type: 'success' | 'info' | 'warn' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // List of all unique subjects present in current tasks or app config
  const availableFaecher = useMemo(() => {
    const set = new Set<string>();
    plan.aufgaben.forEach(a => { if (a.fach) set.add(a.fach); });
    (app.faecher || []).forEach(f => set.add(f));
    ['Deutsch', 'Mathematik', 'Sachunterricht', 'Englisch', 'Sport', 'Musik', 'Werken', 'Religion'].forEach(f => set.add(f));
    return Array.from(set);
  }, [plan.aufgaben, app.faecher]);

  // Filtered tasks
  const filteredAufgaben = useMemo(() => {
    return plan.aufgaben.filter(a => {
      if (filterDay !== 'alle' && a.tag !== filterDay) return false;
      if (filterFach !== 'alle' && a.fach !== filterFach) return false;
      if (filterTyp !== 'alle' && a.typ !== filterTyp) return false;
      if (filterDiff !== 'alle' && a.differenzierung && a.differenzierung !== filterDiff && a.differenzierung !== 'alle') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = a.titel.toLowerCase().includes(q);
        const matchDetail = (a.detail || '').toLowerCase().includes(q);
        const matchFach = (a.fach || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDetail && !matchFach) return false;
      }
      return true;
    });
  }, [plan.aufgaben, filterDay, filterFach, filterTyp, filterDiff, searchQuery]);

  // Task manipulation helpers
  const handleToggleTask = (id: string) => {
    setPlan(prev => ({
      ...prev,
      aufgaben: prev.aufgaben.map(a => a.id === id ? { ...a, selected: !a.selected } : a)
    }));
  };

  const handleSelectAll = (selected: boolean) => {
    setPlan(prev => ({
      ...prev,
      aufgaben: prev.aufgaben.map(a => ({ ...a, selected }))
    }));
    showToast(selected ? 'Alle Aufgaben ausgewählt' : 'Alle Aufgaben abgewählt', 'info');
  };

  const handleSelectByDay = (tag: string, selected: boolean) => {
    setPlan(prev => ({
      ...prev,
      aufgaben: prev.aufgaben.map(a => a.tag === tag ? { ...a, selected } : a)
    }));
    showToast(`${tag}: Aufgaben ${selected ? 'ausgewählt' : 'abgewählt'}`);
  };

  const handleSelectByFach = (fach: string, selected: boolean) => {
    setPlan(prev => ({
      ...prev,
      aufgaben: prev.aufgaben.map(a => a.fach === fach ? { ...a, selected } : a)
    }));
    showToast(`${fach}: Aufgaben ${selected ? 'ausgewählt' : 'abgewählt'}`);
  };

  const handleUpdateTaskField = (id: string, updates: Partial<SchuelerWochenplanAufgabe>) => {
    setPlan(prev => ({
      ...prev,
      aufgaben: prev.aufgaben.map(a => a.id === id ? { ...a, ...updates } : a)
    }));
  };

  const handleDeleteTask = (id: string) => {
    setPlan(prev => ({
      ...prev,
      aufgaben: prev.aufgaben.filter(a => a.id !== id)
    }));
    showToast('Aufgabe entfernt');
  };

  const handleMoveTask = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= plan.aufgaben.length) return;

    setPlan(prev => {
      const list = [...prev.aufgaben];
      const temp = list[index];
      list[index] = list[targetIdx];
      list[targetIdx] = temp;
      return { ...prev, aufgaben: list };
    });
  };

  const handleReformulateSingle = (task: SchuelerWochenplanAufgabe) => {
    const res = makeChildFriendlyTask(task.fach, task.titel, task.originalMaterial);
    handleUpdateTaskField(task.id, {
      titel: res.titel,
      detail: res.detail || task.detail
    });
    showToast(`„${task.fach}“ kindgerecht formuliert ✨`);
  };

  const handleReformulateAll = () => {
    setPlan(prev => ({
      ...prev,
      aufgaben: prev.aufgaben.map(a => {
        const res = makeChildFriendlyTask(a.fach, a.originalThema || a.titel, a.originalMaterial);
        return {
          ...a,
          titel: res.titel,
          detail: res.detail || a.detail
        };
      })
    }));
    showToast('Alle Aufgaben wurden kindgerecht formuliert! ✨');
  };

  const handleAddNewTask = () => {
    if (!newTaskTitle.trim()) return;

    const newTask: SchuelerWochenplanAufgabe = {
      id: `custom-task-${Date.now()}`,
      fach: newTaskFach,
      tag: newTaskTag,
      titel: newTaskTitle.trim(),
      detail: newTaskDetail.trim() || undefined,
      typ: newTaskTyp,
      differenzierung: newTaskDiff,
      zeitAufwandMin: newTaskMin,
      selected: true,
      order: plan.aufgaben.length + 1
    };

    setPlan(prev => ({
      ...prev,
      aufgaben: [...prev.aufgaben, newTask]
    }));

    setNewTaskTitle('');
    setNewTaskDetail('');
    setIsAddingTask(false);
    showToast('Neue Aufgabe hinzugefügt');
  };

  // Re-synchronize with current teacher plan
  const handleRegenerateFromTeacherPlan = () => {
    const newTasks = analyzeWochenplanForStudents(app, plan.kw);
    // Keep user's manually added custom tasks if any
    const customTasks = plan.aufgaben.filter(a => a.id.startsWith('custom-task-'));
    const currentHash = computeWochenplanHash(app, plan.kw);

    setPlan(prev => ({
      ...prev,
      aufgaben: [...newTasks, ...customTasks],
      originalPlanHash: currentHash,
      aktualisiertAm: new Date().toISOString()
    }));
    showToast('Aufgaben aus aktuellem Wochenplan neu analysiert!');
  };

  const handleDismissChangeNotice = () => {
    const currentHash = computeWochenplanHash(app, plan.kw);
    setPlan(prev => ({
      ...prev,
      originalPlanHash: currentHash
    }));
    showToast('Änderungshinweis bestätigt (Plan unverändert gelassen)');
  };

  // Save to AppContext encrypted state
  const handleSavePlan = () => {
    const updatedPlan: SchuelerWochenplan = {
      ...plan,
      aktualisiertAm: new Date().toISOString()
    };

    setApp(prev => {
      const existing = { ...(prev.schuelerWochenplaene || {}) };
      existing[updatedPlan.id] = updatedPlan;
      return {
        ...prev,
        schuelerWochenplaene: existing
      };
    });

    setPlan(updatedPlan);
    showToast('Schüler-Wochenplan sicher im Tresor gespeichert! 🔒');
  };

  // Prepare the existing saved plan; all document output happens in PrintCenter.
  const handlePrint = () => {
    const updatedPlan: SchuelerWochenplan = {
      ...plan, aktualisiertAm: new Date().toISOString(),
    };
    setApp(previous => ({
      ...previous,
      schuelerWochenplaene: {
        ...(previous.schuelerWochenplaene || {}),
        [updatedPlan.id]: updatedPlan,
      },
      currentKW: updatedPlan.kw,
      currentPage: 'drucken',
      activePrintTemplate: 'schueler_wochenplan',
    }));
    onClose();
  };

  // Load an existing plan from storage
  const handleLoadSavedPlan = (saved: SchuelerWochenplan) => {
    setPlan(JSON.parse(JSON.stringify(saved)));
    setActiveTab('auswahl');
    showToast(`Wochenplan KW ${saved.kw} geladen`);
  };

  const handleDeleteSavedPlan = (id: string) => {
    if (!window.confirm('Diesen gespeicherten Schüler-Wochenplan wirklich löschen?')) return;
    setApp(prev => {
      const existing = { ...(prev.schuelerWochenplaene || {}) };
      delete existing[id];
      return { ...prev, schuelerWochenplaene: existing };
    });
    showToast('Gespeicherter Plan gelöscht');
  };

  const selectedCount = plan.aufgaben.filter(a => a.selected).length;

  return createPortal(
    <div
      id="schueler-wochenplan-modal-root"
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/80 backdrop-blur-md overflow-hidden text-slate-900 select-none p-2 sm:p-4"
    >
      <div className="w-full h-full max-w-7xl bg-slate-50 rounded-3xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden">
        {/* ================= 1. MODAL HEADER ================= */}
        <header className="bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between gap-4 shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <CheckSquare size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  Wochenplan-Generator für Kinder
                </h2>
                <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-900 rounded-full font-black text-xs">
                  KW {plan.kw}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {plan.datumVon} – {plan.datumBis}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Erstellt aus Ihrer Unterrichtsplanung einen kindgerechten Aufgaben-Wochenplan zum Ausdrucken
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveTab('auswahl')}
              className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'auswahl' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckSquare size={14} />
              <span>1. Aufgaben auswählen ({selectedCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('gestaltung')}
              className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'gestaltung' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings size={14} />
              <span>2. Layout & Design</span>
            </button>
            <button
              onClick={() => setActiveTab('vorschau')}
              className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'vorschau' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye size={14} />
              <span>3. A4-Vorschau</span>
            </button>
            <button
              onClick={() => setActiveTab('gespeichert')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'gespeichert' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Gespeicherte Pläne"
            >
              <Archive size={14} />
              <span>Archiv</span>
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSavePlan}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
              title="Im verschlüsselten Tresor speichern"
            >
              <Save size={15} className="text-emerald-600" />
              <span className="hidden sm:inline">Speichern</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 cursor-pointer active:scale-95"
              title="Gespeicherten Wochenplan im Druckzentrum öffnen"
            >
              <Printer size={15} />
              <span>Zum Druckzentrum</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              title="Schließen"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Change Detection Banner */}
        {isOriginalChanged && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center justify-between gap-3 text-xs font-medium text-amber-900">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              <span>
                <strong>Hinweis:</strong> Der zugrunde liegende Wochenplan der Lehrperson wurde geändert.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRegenerateFromTeacherPlan}
                className="px-2.5 py-1 bg-amber-200/80 hover:bg-amber-300 text-amber-950 rounded-lg font-bold transition-colors cursor-pointer"
              >
                Änderungen übernehmen
              </button>
              <button
                onClick={handleDismissChangeNotice}
                className="px-2.5 py-1 bg-white hover:bg-amber-100/50 border border-amber-300 text-amber-900 rounded-lg font-bold transition-colors cursor-pointer"
              >
                Bestehenden Plan behalten
              </button>
            </div>
          </div>
        )}

        {/* Floating Notification */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-2xl shadow-xl border border-white/20 flex items-center gap-2"
            >
              <Check size={14} className="text-emerald-400" />
              <span>{notification.msg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ================= 2. MAIN WORKSPACE ================= */}
        <div className="flex-1 flex overflow-hidden">
          {/* TAB 1: AUFGABEN AUSWÄHLEN & BEARBEITEN */}
          {activeTab === 'auswahl' && (
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* LEFT COLUMN: FILTER & TASK LIST */}
              <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200">
                {/* Filter and Quick Selector Bar */}
                <div className="p-3.5 bg-white border-b border-slate-200 space-y-2.5 shrink-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Bulk Select/Deselect */}
                      <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200 text-xs font-bold">
                        <button
                          onClick={() => handleSelectAll(true)}
                          className="px-2.5 py-1 rounded-lg text-slate-700 hover:bg-white transition-all cursor-pointer flex items-center gap-1"
                        >
                          <CheckSquare size={13} className="text-indigo-600" />
                          <span>Alle an</span>
                        </button>
                        <button
                          onClick={() => handleSelectAll(false)}
                          className="px-2.5 py-1 rounded-lg text-slate-700 hover:bg-white transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Square size={13} className="text-slate-400" />
                          <span>Alle ab</span>
                        </button>
                      </div>

                      {/* Day Filter */}
                      <select
                        value={filterDay}
                        onChange={(e) => setFilterDay(e.target.value)}
                        aria-label="Filter nach Wochentag"
                        className="text-xs font-bold bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 cursor-pointer"
                      >
                        <option value="alle">Alle Wochentage</option>
                        {WOCHENPLAN_TAGE.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>

                      {/* Subject Filter */}
                      <select
                        value={filterFach}
                        onChange={(e) => setFilterFach(e.target.value)}
                        aria-label="Filter nach Schulfach"
                        className="text-xs font-bold bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 cursor-pointer"
                      >
                        <option value="alle">Alle Fächer</option>
                        {availableFaecher.map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>

                      {/* Type Filter */}
                      <select
                        value={filterTyp}
                        onChange={(e) => setFilterTyp(e.target.value)}
                        aria-label="Filter nach Aufgabentyp"
                        className="text-xs font-bold bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 cursor-pointer"
                      >
                        <option value="alle">Alle Typen</option>
                        <option value="pflicht">Nur Pflichtaufgaben (□)</option>
                        <option value="zusatz">Nur Zusatzaufgaben (☆)</option>
                        <option value="freiwillig">Nur Freiwillig</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleReformulateAll}
                        className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Formuliert alle Lehrernotizen in freundliche Kinder-Aufgaben um"
                      >
                        <Sparkles size={13} />
                        <span>Alle kindgerecht formulieren</span>
                      </button>

                      <button
                        onClick={() => setIsAddingTask(true)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Plus size={14} />
                        <span>Aufgabe hinzufügen</span>
                      </button>
                    </div>
                  </div>

                  {/* Search input */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Aufgaben durchsuchen (z.B. Lesebuch, Multiplikation, Wetter...)"
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                </div>

                {/* Form to add custom task */}
                {isAddingTask && (
                  <div className="p-4 bg-emerald-50/50 border-b border-emerald-200 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                        <Plus size={14} /> Neue eigene Schüler-Aufgabe anlegen
                      </h4>
                      <button
                        onClick={() => setIsAddingTask(false)}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        <X size={15} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Aufgabentext</label>
                        <input
                          type="text"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          placeholder="z.B. Lesebuch S. 24–25 lesen"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Fach</label>
                        <select
                          value={newTaskFach}
                          onChange={(e) => setNewTaskFach(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                        >
                          {availableFaecher.map(f => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Wochentag</label>
                        <select
                          value={newTaskTag}
                          onChange={(e) => setNewTaskTag(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                        >
                          {WOCHENPLAN_TAGE.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                          <option value="Woche">Ganze Woche</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Aufgabentyp</label>
                        <select
                          value={newTaskTyp}
                          onChange={(e) => setNewTaskTyp(e.target.value as SchuelerAufgabeTyp)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                        >
                          <option value="pflicht">Pflichtaufgabe (□)</option>
                          <option value="zusatz">Zusatzaufgabe (☆)</option>
                          <option value="freiwillig">Freiwillig</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Zeitaufwand</label>
                        <input
                          type="number"
                          value={newTaskMin}
                          onChange={(e) => setNewTaskMin(parseInt(e.target.value) || 15)}
                          min={5}
                          max={90}
                          step={5}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Zusätzliches Detail / Materialhinweis (optional)</label>
                        <input
                          type="text"
                          value={newTaskDetail}
                          onChange={(e) => setNewTaskDetail(e.target.value)}
                          placeholder="z.B. Fragen 1–4 ins blaue Heft schreiben"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setIsAddingTask(false)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 cursor-pointer"
                      >
                        Abbrechen
                      </button>
                      <button
                        onClick={handleAddNewTask}
                        disabled={!newTaskTitle.trim()}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                      >
                        Aufgabe speichern
                      </button>
                    </div>
                  </div>
                )}

                {/* Task List items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                  {filteredAufgaben.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 space-y-2">
                      <BookOpen size={36} className="mx-auto text-slate-300" />
                      <p className="font-bold text-sm text-slate-600">Keine Aufgaben gefunden</p>
                      <p className="text-xs max-w-sm mx-auto">
                        Passe die Filter an oder klicke oben auf „Aufgabe hinzufügen“, um eine eigene Aufgabe zu erstellen.
                      </p>
                    </div>
                  ) : (
                    filteredAufgaben.map((task, idx) => (
                      <div
                        key={task.id}
                        className={`p-3 rounded-2xl border transition-all ${
                          task.selected
                            ? 'bg-white border-slate-300 shadow-xs'
                            : 'bg-slate-100/70 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <button
                            onClick={() => handleToggleTask(task.id)}
                            className="mt-1 text-indigo-600 hover:scale-110 transition-transform cursor-pointer"
                            title={task.selected ? 'Aus Wochenplan abwählen' : 'In Wochenplan übernehmen'}
                          >
                            {task.selected ? (
                              <CheckSquare size={20} className="fill-indigo-600 text-white" />
                            ) : (
                              <Square size={20} className="text-slate-400" />
                            )}
                          </button>

                          {/* Task Content Fields */}
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 rounded-md text-[10px] font-black uppercase tracking-wider">
                                {task.fach}
                              </span>

                              <span className="text-[11px] font-bold text-slate-500">
                                {task.tag} {task.stunde && `• ${task.stunde}. Std`}
                              </span>

                              {/* Pflicht vs Zusatz Toggle */}
                              <button
                                onClick={() => handleUpdateTaskField(task.id, {
                                  typ: task.typ === 'pflicht' ? 'zusatz' : 'pflicht'
                                })}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-colors cursor-pointer ${
                                  task.typ === 'pflicht'
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                                }`}
                              >
                                {task.typ === 'pflicht' ? '□ Pflicht' : '★ Zusatz / Stern'}
                              </button>

                              {/* Differentiation Tag */}
                              <select
                                value={task.differenzierung || 'alle'}
                                onChange={(e) => handleUpdateTaskField(task.id, {
                                  differenzierung: e.target.value as SchuelerDifferenzierung
                                })}
                                aria-label="Differenzierungs-Stufe"
                                className="text-[10px] font-bold bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-600"
                              >
                                <option value="alle">Alle Kinder</option>
                                <option value="basis">Basis</option>
                                <option value="standard">Standard</option>
                                <option value="plus">Plus / Talent</option>
                              </select>

                              {task.originalThema && task.originalThema !== task.titel && (
                                <span className="text-[10px] text-slate-400 italic truncate max-w-[200px]" title={`Ursprung: ${task.originalThema}`}>
                                  (Ursprung: {task.originalThema})
                                </span>
                              )}
                            </div>

                            {/* Editable Title Input */}
                            <input
                              type="text"
                              value={task.titel}
                              onChange={(e) => handleUpdateTaskField(task.id, { titel: e.target.value })}
                              className="w-full text-xs font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 px-1 py-0.5 rounded transition-all focus:outline-none"
                              placeholder="Aufgabentext..."
                            />

                            {/* Detail / Material line */}
                            <input
                              type="text"
                              value={task.detail || ''}
                              onChange={(e) => handleUpdateTaskField(task.id, { detail: e.target.value })}
                              className="w-full text-[11px] text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 px-1 py-0.5 rounded transition-all focus:outline-none"
                              placeholder="+ Detail / Materialhinweis hinzufügen..."
                            />
                          </div>

                          {/* Quick Card Controls */}
                          <div className="flex items-center gap-1 shrink-0 pt-1">
                            <button
                              onClick={() => handleReformulateSingle(task)}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                              title="Kindgerecht umformulieren"
                            >
                              <Sparkles size={14} />
                            </button>

                            <button
                              onClick={() => handleMoveTask(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                              title="Nach oben schieben"
                            >
                              <ChevronUp size={14} />
                            </button>

                            <button
                              onClick={() => handleMoveTask(idx, 'down')}
                              disabled={idx === filteredAufgaben.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                              title="Nach unten schieben"
                            >
                              <ChevronDown size={14} />
                            </button>

                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Aufgabe löschen"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: LIVE MINI PREVIEW */}
              <div className="hidden xl:flex w-[480px] bg-slate-200/70 p-4 flex-col border-l border-slate-200 overflow-y-auto items-center">
                <div className="w-full flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Eye size={13} /> Live-Vorschau
                  </span>
                  <button
                    onClick={() => setActiveTab('vorschau')}
                    className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Vollansicht öffnen →
                  </button>
                </div>

                <div className="w-full origin-top scale-[0.8] transition-transform">
                  <SchuelerWochenplanA4Sheet
                    plan={plan}
                    previewOnly={true}
                    colorMode={colorMode}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GESTALTUNG & DIFFERENZIERUNG */}
          {activeTab === 'gestaltung' && (
            <div className="flex-1 p-6 overflow-y-auto bg-slate-50 space-y-6">
              <div className="max-w-4xl mx-auto space-y-6">
                {/* 1. DARSTELLUNGSFORM */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Layers size={16} className="text-indigo-600" />
                    1. Darstellungsform des Wochenplans
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { id: 'fach', title: 'Nach Fächern', desc: 'Gruppiert nach Deutsch, Mathematik, Sachunterricht...' },
                      { id: 'tag', title: 'Nach Wochentagen', desc: 'Montag bis Freitag mit allen Aufgaben des Tages' },
                      { id: 'liste', title: 'Einfache Aufgabenliste', desc: 'Ruhige fortlaufende Checkliste mit Fach-Badges' },
                      { id: 'gitter', title: 'Wochenraster (5 Spalten)', desc: 'Kompakte Spalten von Montag bis Freitag nebeneinander' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setPlan(p => ({ ...p, darstellung: opt.id as SchuelerWochenplanDarstellung }))}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                          plan.darstellung === opt.id
                            ? 'bg-indigo-50 border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-bold text-xs text-slate-900">{opt.title}</div>
                        <div className="text-[11px] text-slate-500 mt-1 leading-snug">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. KOPFZEILE & BESCHRIFTUNG */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Settings size={16} className="text-indigo-600" />
                    2. Kopfzeile & Angaben
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Hauptüberschrift</label>
                      <input
                        type="text"
                        value={plan.titel}
                        onChange={(e) => setPlan(p => ({ ...p, titel: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                        placeholder="WOCHENPLAN"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Klassenbezeichnung / Untertitel</label>
                      <input
                        type="text"
                        value={plan.untertitel || ''}
                        onChange={(e) => setPlan(p => ({ ...p, untertitel: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                        placeholder="z.B. Klasse 3a"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700 block mb-1">Motto oder Wochenziel der Klasse (optional)</label>
                      <input
                        type="text"
                        value={plan.motto || ''}
                        onChange={(e) => setPlan(p => ({ ...p, motto: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                        placeholder="z.B. Gemeinsam schaffen wir jede Aufgabe Schritt für Schritt!"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-100 text-xs font-bold text-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={plan.showNameField}
                        onChange={(e) => setPlan(p => ({ ...p, showNameField: e.target.checked }))}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Schülername-Feld einblenden („Name: _________“)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={plan.showKw}
                        onChange={(e) => setPlan(p => ({ ...p, showKw: e.target.checked }))}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Kalenderwoche anzeigen</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={plan.showDatum}
                        onChange={(e) => setPlan(p => ({ ...p, showDatum: e.target.checked }))}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Datumsspanne (von/bis) anzeigen</span>
                    </label>
                  </div>
                </div>

                {/* 3. DRUCK-OPTIONEN & KINDER-ELEMENTE */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Printer size={16} className="text-indigo-600" />
                    3. Druckformat & Kindgerechte Elemente
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Schriftgröße */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Schriftgröße</label>
                      <select
                        value={plan.fontSize}
                        onChange={(e) => setPlan(p => ({ ...p, fontSize: e.target.value as any }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                      >
                        <option value="kompakt">Kompakt (viele Aufgaben auf 1 Seite)</option>
                        <option value="normal">Normal (Standard Volksschule)</option>
                        <option value="gross">Groß (1. & 2. Klasse Lesestufe)</option>
                      </select>
                    </div>

                    {/* Orientierung */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Seitenformat</label>
                      <select
                        value={plan.orientierung}
                        onChange={(e) => setPlan(p => ({ ...p, orientierung: e.target.value as any }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                      >
                        <option value="portrait">Hochformat (A4 Portrait)</option>
                        <option value="landscape">Querformat (A4 Landscape)</option>
                      </select>
                    </div>

                    {/* Farbmodus */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Druck-Farbe</label>
                      <select
                        value={colorMode}
                        onChange={(e) => setColorMode(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                      >
                        <option value="color">Sanfte Pastellfarben (Farbdrucker)</option>
                        <option value="mono">Reines Schwarz-Weiß (Kopierer-optimiert)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-100 text-xs font-bold text-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={plan.showReflexion}
                        onChange={(e) => setPlan(p => ({ ...p, showReflexion: e.target.checked }))}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Selbsteinschätzungs-Smileys für Kinder am Fuß des Plans (😀 🙂 🤔)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={plan.showUnterschrift}
                        onChange={(e) => setPlan(p => ({ ...p, showUnterschrift: e.target.checked }))}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Unterschriftenlinie für Eltern / Lehrkraft</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setActiveTab('vorschau')}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer"
                  >
                    <span>Zur A4-Vorschau →</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: A4 VORSCHAU & VOLLBILD DRUCK */}
          {activeTab === 'vorschau' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-200">
              <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-700">Druckansicht:</span>
                  <button
                    onClick={() => setColorMode('color')}
                    className={`px-2.5 py-1 rounded-lg font-bold ${colorMode === 'color' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-500'}`}
                  >
                    Farbe
                  </button>
                  <button
                    onClick={() => setColorMode('mono')}
                    className={`px-2.5 py-1 rounded-lg font-bold ${colorMode === 'mono' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}
                  >
                    Schwarz-Weiß (Kopierer)
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">
                    {plan.aufgaben.filter(a => a.selected).length} Aufgaben gewählt
                  </span>
                  <button
                    onClick={handlePrint}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Printer size={14} />
                    <span>Im Druckzentrum öffnen</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center items-start">
                <div className="w-full flex justify-center">
                  <SchuelerWochenplanA4Sheet
                    plan={plan}
                    previewOnly={true}
                    colorMode={colorMode}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ARCHIV GESPEICHERTER PLÄNE */}
          {activeTab === 'gespeichert' && (
            <div className="flex-1 p-6 overflow-y-auto bg-slate-50">
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Gespeicherte Schüler-Wochenpläne
                    </h3>
                    <p className="text-xs text-slate-500">
                      Alle im verschlüsselten Tresor gesicherten Wochenpläne dieser Klasse
                    </p>
                  </div>
                  <button
                    onClick={handleSavePlan}
                    className="px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save size={14} />
                    <span>Aktuellen Plan sichern</span>
                  </button>
                </div>

                {Object.keys(app.schuelerWochenplaene || {}).length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 space-y-2">
                    <Archive size={32} className="mx-auto text-slate-300" />
                    <p className="font-bold text-sm text-slate-700">Noch keine Wochenpläne gespeichert</p>
                    <p className="text-xs">Klicke oben rechts auf „Speichern“, um den aktuellen Wochenplan zu sichern.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.values(app.schuelerWochenplaene || {}).map((savedPlan) => (
                      <div
                        key={savedPlan.id}
                        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                              KW {savedPlan.kw}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(savedPlan.aktualisiertAm || savedPlan.erstelltAm).toLocaleDateString('de-AT')}
                            </span>
                          </div>
                          <h4 className="text-sm font-black text-slate-900">
                            {savedPlan.titel} {savedPlan.untertitel && `• ${savedPlan.untertitel}`}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {savedPlan.datumVon} – {savedPlan.datumBis}
                          </p>
                          <p className="text-[11px] text-slate-600 mt-2 font-medium">
                            {savedPlan.aufgaben?.filter(a => a.selected).length || 0} Aufgaben • Darstellung: {savedPlan.darstellung}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <button
                            onClick={() => handleDeleteSavedPlan(savedPlan.id)}
                            className="text-xs text-rose-600 hover:text-rose-800 font-bold p-1 cursor-pointer"
                          >
                            Löschen
                          </button>
                          <button
                            onClick={() => handleLoadSavedPlan(savedPlan)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            Diesen Plan öffnen
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>,
    document.body
  );
};
