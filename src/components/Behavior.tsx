
import React, { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Notebook, 
  Trash2, 
  Search, 
  Plus, 
  StickyNote, 
  AlertCircle,
  MessageSquare,
  Filter,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Calendar,
  Gem,
  Smile,
  Trophy,
  Users,
  Monitor,
  Sparkles,
  RotateCcw,
  History,
  Printer,
  ChevronRight,
  Check,
  Settings,
  Bot,
  Save,
  Award,
  Target,
  Zap,
  CheckCircle,
  Hash,
  Send,
  User,
  MoreVertical,
  Edit2,
  SmilePlus,
  BookOpen,
  Mic,
  ListTodo
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DebouncedInput } from './DebouncedInput';
import { polishText } from '../services/aiService';
import { formatLocalDateKey, logObservation, logActivity } from '../lib/utils';
import { filterChronicleEntries } from '../lib/behaviorChronicle';
import { NoteEntry } from '../types';
import { useInlineDictation } from '../hooks/useInlineDictation';
import { noteCategoryAppearance } from '../lib/noteCategoryAppearance';

export default function Behavior() {
  const { app, setApp } = useApp();
  const activeTab: 'chronik' = 'chronik';
  const [selectedStatStudentId, setSelectedStatStudentId] = useState<string | null>(null);
  const [statsPeriod, setStatsPeriod] = useState<'week' | 'month' | 'total'>('month');
  const [visibleLimit, setVisibleLimit] = useState(15);

  React.useEffect(() => {
    setVisibleLimit(15);
  }, [app?.schueler?.length, activeTab]);

  const sortedStudents = React.useMemo(() => {
    return [...(app?.schueler || [])].sort((a, b) => a.nachname.localeCompare(b.nachname, 'de'));
  }, [app?.schueler]);

  const startDate = app.settings?.behaviorStartDate;

  // Undo / Redo history stacks
  const [behaviorHistory, setBehaviorHistory] = useState<{
    statusLog: any[];
    behavior_status: Record<string, string>;
  }[]>([]);
  const [redoHistory, setRedoHistory] = useState<{
    statusLog: any[];
    behavior_status: Record<string, string>;
  }[]>([]);

  React.useEffect(() => {
    // Undo/redo snapshots belong to exactly one class.
    setBehaviorHistory([]);
    setRedoHistory([]);
    setSelectedStatStudentId(null);
  }, [app.activeClassId]);

  const pushToHistory = (customLog?: any[], customStatus?: Record<string, string>) => {
    const logSnapshot = (customLog || app.statusLog || []).map((l: any) => ({ ...l }));
    const statusSnapshot = { ...(customStatus || app.behavior_status || {}) };
    setBehaviorHistory(prev => [...prev, {
      statusLog: logSnapshot,
      behavior_status: statusSnapshot
    }]);
    setRedoHistory([]); // Reset redo stack representing a new action
  };

  const handleUndo = () => {
    if (behaviorHistory.length === 0) return;
    const previous = behaviorHistory[behaviorHistory.length - 1];
    setBehaviorHistory(prev => prev.slice(0, prev.length - 1));

    const currentLog = (app.statusLog || []).map((l: any) => ({ ...l }));
    const currentStatus = { ...(app.behavior_status || {}) };
    setRedoHistory(prev => [...prev, {
      statusLog: currentLog,
      behavior_status: currentStatus
    }]);

    setApp(prev => ({
      ...prev,
      statusLog: previous.statusLog,
      behavior_status: previous.behavior_status
    }));
  };

  const handleRedo = () => {
    if (redoHistory.length === 0) return;
    const next = redoHistory[redoHistory.length - 1];
    setRedoHistory(prev => prev.slice(0, prev.length - 1));

    const currentLog = (app.statusLog || []).map((l: any) => ({ ...l }));
    const currentStatus = { ...(app.behavior_status || {}) };
    setBehaviorHistory(prev => [...prev, {
      statusLog: currentLog,
      behavior_status: currentStatus
    }]);

    setApp(prev => ({
      ...prev,
      statusLog: next.statusLog,
      behavior_status: next.behavior_status
    }));
  };

  // Native undo must remain available while typing notes. The old global
  // Ctrl+Z/Ctrl+Y listener belonged to the removed status editor.

  // Behavioral System State
  const defaultStages = [
    { id: '1', label: 'Super', color: '#10b981', icon: '🌟' },
    { id: '2', label: 'Gut', color: '#3b82f6', icon: '😊' },
    { id: '3', label: 'OK', color: '#94a3b8', icon: '😐' },
    { id: '4', label: 'Ermahnung', color: '#f59e0b', icon: '⚠️' },
    { id: '5', label: 'Inakzeptabel', color: '#ef4444', icon: '🚫' }
  ];

  const stages = app.behavior_stages || defaultStages;
  const defaultStageId = app.behavior_default_stage_id || stages[0]?.id;

  const studentStats = React.useMemo(() => {
    if (!selectedStatStudentId) return null;
    
    let logs = (app.statusLog || []).filter((l: any) => l.schuelerId === selectedStatStudentId);
    if (startDate) {
      logs = logs.filter((l: any) => l.datum >= startDate);
    }
    const now = Date.now();
    const filteredLogs = logs.filter((l: any) => {
      if (statsPeriod === 'total') return true;
      const diffDays = (now - l.timestamp) / (1000 * 3600 * 24);
      return statsPeriod === 'week' ? diffDays <= 7 : diffDays <= 30;
    });

    const statsMap = stages.map(stage => ({
      ...stage,
      count: filteredLogs.filter((l: any) => l.iconId === stage.id).length
    }));

    const maxCount = Math.max(...statsMap.map(s => s.count), 1);

    return { statsMap, maxCount, logCount: filteredLogs.length };
  }, [selectedStatStudentId, statsPeriod, app.statusLog, stages, startDate]);
  
  // Chronik State
  const [chronikFilter, setChronikFilter] = useState<'all' | 'journal' | 'student'>('all');
  const [chronikSearch, setChronikSearch] = useState('');
  const [newEntryText, setNewEntryText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week'>('all');
  const appendDictation = useCallback((text: string) => {
    setNewEntryText(previous => [previous.trim(), text.trim()].filter(Boolean).join(' '));
  }, []);
  const dictation = useInlineDictation(appendDictation);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [noteCategory, setNoteCategory] = useState<'Journal' | 'Verhalten' | 'Erfolg' | 'Eltern' | 'Notiz'>('Notiz');
  const [entryMode, setEntryMode] = useState<'note' | 'todo'>('note');
  const [aiLoading, setAiLoading] = useState(false);

  React.useEffect(() => {
    // Never carry a selected child from one class into another class's chronicle.
    dictation.stop();
    setSelectedStudentId('');
    setNewEntryText('');
    setChronikSearch('');
    setCategoryFilter('');
    setDateFilter('all');
    setVisibleLimit(15);
  }, [app.activeClassId]);

  const chronicleEntries = React.useMemo(() => {
    const now = new Date();
    const todayKey = formatLocalDateKey(now);
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    return filterChronicleEntries(app.notes || [], chronikFilter, chronikSearch, app.schueler || [])
      .filter(entry => !categoryFilter || entry.kategorie === categoryFilter)
      .filter(entry => {
        if (dateFilter === 'all') return true;
        const date = new Date(entry.datum);
        if (!Number.isFinite(date.getTime())) return false;
        if (dateFilter === 'today') return formatLocalDateKey(date) === todayKey;
        return date >= weekStart && date <= now;
      })
      .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime());
  }, [app.notes, app.schueler, chronikFilter, chronikSearch, categoryFilter, dateFilter]);

  const [showIconPicker, setShowIconPicker] = useState<number | null>(null);
  const commonIcons = ['🌟', '😊', '😐', '⚠️', '🚫', '🔥', '❤️', '👍', '👎', '👏', '🙌', '🤝', '💎', '🏆', '👑', '✨', '🚀', '⭐', '🎈', '🎉', '📝', '💬', '📖', '💡', '⏰', '🍎', '🎒', '🎨', '🧩', '⚽', '💻', '🦁', '🐘', '🦎', '🦉', '🐝'];

  const resetAllStatuses = () => {
    if (confirm('Möchtest du alle Schüler auf die Standard-Stufe zurücksetzen?')) {
      pushToHistory();
      const newStatusMap: Record<string, string> = {};
      const now = formatLocalDateKey(new Date());
      const timestamp = Date.now();
      
      const newHistoryEntries = app.schueler.map((s: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        schuelerId: s.id,
        datum: now,
        iconId: defaultStageId,
        timestamp
      }));

      app.schueler.forEach((s: any) => { newStatusMap[s.id] = defaultStageId; });
      setApp((prev: any) => ({ 
        ...prev, 
        behavior_status: newStatusMap,
        statusLog: [...newHistoryEntries, ...(prev.statusLog || [])]
      }));
    }
  };

  const toggleStatus = (sid: string, stageId: string) => {
    const currentStatusId = app.behavior_status?.[sid] || defaultStageId;
    if (currentStatusId === stageId) {
      return; // Keine Änderung vom Verhalten her, also nicht redundant speichern!
    }
    pushToHistory();
    setApp((prev: any) => {
      const newEntry = {
        id: Math.random().toString(36).substr(2, 9),
        schuelerId: sid,
        datum: formatLocalDateKey(new Date()),
        iconId: stageId,
        timestamp: Date.now()
      };
      return { 
        ...prev, 
        behavior_status: { ...(prev.behavior_status || {}), [sid]: stageId },
        statusLog: [newEntry, ...(prev.statusLog || [])]
      };
    });

    if (stageId === '1' || stageId === '2') {
      try {
        const student = app.schueler.find(s => s.id === sid);
        const nameText = student ? student.vorname : 'Ein Schüler';
        const labelText = stageId === '1' ? 'Super 🌟' : 'Gut ❤️';
        window.dispatchEvent(new CustomEvent('classpet-joy', {
          detail: { 
            message: `Hervorragend! ${nameText} wurde mit "${labelText}" bewertet! 🎉✨` 
          }
        }));
      } catch (e) {}
    }
  };

  const deleteLogEntry = (id: string) => {
    pushToHistory();
    setApp((prev: any) => {
      const updatedLog = (prev.statusLog || []).filter((l: any) => l.id !== id);
      const targetEntry = (prev.statusLog || []).find((l: any) => l.id === id);
      const newStatus = { ...(prev.behavior_status || {}) };
      
      if (targetEntry) {
        const studentId = targetEntry.schuelerId;
        const studentLogsLeft = updatedLog.filter((l: any) => l.schuelerId === studentId);
        if (studentLogsLeft.length > 0) {
          const latestLog = studentLogsLeft.sort((a: any, b: any) => b.timestamp - a.timestamp)[0];
          newStatus[studentId] = latestLog.iconId;
        } else {
          newStatus[studentId] = defaultStageId;
        }
      }

      return {
        ...prev,
        statusLog: updatedLog,
        behavior_status: newStatus
      };
    });
  };

  const clearStudentHistory = (studentId: string) => {
    if (confirm('Verlauf für dieses Kind wirklich leeren?')) {
      pushToHistory();
      setApp((prev: any) => {
        const updatedLog = (prev.statusLog || []).filter((l: any) => l.schuelerId !== studentId);
        const newStatus = { ...(prev.behavior_status || {}) };
        newStatus[studentId] = defaultStageId;
        return {
          ...prev,
          statusLog: updatedLog,
          behavior_status: newStatus
        };
      });
    }
  };

  const updateBehaviorNote = (sid: string, note: string) => {
    setApp((prev: any) => ({ ...prev, behavior_notes: { ...(prev.behavior_notes || {}), [sid]: note } }));
  };

  const handleCreateEntry = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = newEntryText.trim();
    if (!text || dictation.status !== 'idle') return;

    if (entryMode === 'todo') {
      const todo = {
        id: `todo-${Date.now()}`,
        text,
        done: false,
      };
      setApp(prev => ({
        ...prev,
        dashboardTodos: [todo, ...(prev.dashboardTodos || [])],
      }));
      setNewEntryText('');
      logActivity(setApp, 'To-Do erstellt', 'note');
      return;
    }

    logObservation(
      setApp, 
      selectedStudentId || undefined, 
      text, 
      noteCategory, 
      'Notizen-Hauptbereich'
    );
    
    setNewEntryText('');
    logActivity(setApp, `Notiz erstellt: ${noteCategory}`, 'note');
  };

  const togglePersonalTodo = (id: string) => {
    setApp(prev => ({
      ...prev,
      dashboardTodos: (prev.dashboardTodos || []).map(todo =>
        todo.id === id ? { ...todo, done: !todo.done } : todo
      ),
    }));
  };

  const deletePersonalTodo = (id: string) => {
    setApp(prev => ({
      ...prev,
      dashboardTodos: (prev.dashboardTodos || []).filter(todo => todo.id !== id),
    }));
  };

  const deleteJournalEntry = (id: string) => {
    if (confirm('Eintrag wirklich löschen?')) {
      setApp(prev => ({ 
        ...prev, 
        notes: (prev.notes || []).filter(j => j.id !== id),
        journal: (prev.journal || []).filter(j => j.id !== id) 
      }));
    }
  };

  const polishNewEntry = async () => {
    if (!newEntryText.trim() || aiLoading) return;
    setAiLoading(true);
    try {
      const result = await polishText(newEntryText);
      if (result) setNewEntryText(result.trim());
    } catch (error) {
      console.error("AI Polish failed", error);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="py-3 space-y-4 max-w-7xl mx-auto w-full pb-12">
      
      <header className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm print:hidden">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">Notizen & Beobachtungen</h1>
          <p className="text-xs text-slate-600">Schnell erfassen · in der Chronik und im Schülerdossier wiederfinden</p>
        </div>
        <span className="text-xs font-semibold text-slate-600">{chronicleEntries.length} Einträge</span>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'chronik' ? (
          <motion.div
            key="chronik"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* New Entry Input - Schritt 3.2 */}
            <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-sm relative print:hidden">
               <form onSubmit={handleCreateEntry} className="relative z-10 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEntryMode('note')}
                      disabled={dictation.status !== 'idle'}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${entryMode === 'note' ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                    >
                      <Notebook size={15} /> Notiz
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEntryMode('todo');
                        setSelectedStudentId('');
                      }}
                      disabled={dictation.status !== 'idle'}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${entryMode === 'todo' ? 'bg-amber-50 text-amber-900 border border-amber-300' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                    >
                      <ListTodo size={15} /> To-Do
                    </button>
                  </div>

                  {entryMode === 'note' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                     <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <select
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-10 py-2.5 text-slate-800 text-sm font-semibold outline-none focus:border-indigo-400 appearance-none cursor-pointer"
                          value={selectedStudentId}
                          disabled={dictation.status !== 'idle'}
                          onChange={e => setSelectedStudentId(e.target.value)}
                        >
                           <option value="" className="bg-white text-slate-900">Allgemeine Notiz</option>
                           <optgroup label="Schüler/innen" className="bg-white text-slate-900">
                              {sortedStudents.map(s => (
                                <option key={s.id} value={s.id} className="bg-white text-slate-900">{s.nachname} {s.vorname}</option>
                              ))}
                           </optgroup>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                          <ChevronRight size={16} className="rotate-90" />
                        </div>
                     </div>

                     <div className="relative">
                        <Notebook className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <select
                          className={`w-full rounded-xl border bg-slate-50 pl-11 pr-10 py-2.5 text-sm font-semibold text-slate-800 outline-none appearance-none cursor-pointer ${noteCategoryAppearance(noteCategory).field}`}
                          aria-label="Notizkategorie"
                          disabled={dictation.status !== 'idle'}
                          value={noteCategory}
                          onChange={e => setNoteCategory(e.target.value as typeof noteCategory)}
                        >
                           <option value="Notiz" className="bg-white text-slate-900">Notiz</option>
                           <option value="Verhalten" className="bg-white text-slate-900">Beobachtung / Verhalten</option>
                           <option value="Erfolg" className="bg-white text-slate-900">Lob / Stärke</option>
                           <option value="Eltern" className="bg-white text-slate-900">Elternkontakt</option>
                           <option value="Journal" className="bg-white text-slate-900">Klassenjournal</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                          <ChevronRight size={16} className="rotate-90" />
                        </div>
                     </div>
                  </div>
                  )}

                  <div className="relative">
                    <label htmlFor="klassio-note-input" className="sr-only">Notiztext</label>
                    <textarea id="klassio-note-input"
                      className={`w-full min-h-28 rounded-xl border bg-slate-50 p-3 pb-16 text-sm leading-relaxed text-slate-900 outline-none resize-y ${entryMode === 'note' ? noteCategoryAppearance(noteCategory).field : 'border-amber-300'}`}
                      placeholder={entryMode === 'todo' ? "To-Do eingeben, z. B. Bus für Ausflug bestellen..." : selectedStudentId ? "Notiz zu diesem Kind eingeben..." : "Allgemeine Notiz für die Klasse eingeben..."}
                      value={newEntryText}
                      onChange={e => setNewEntryText(e.target.value)}
                      disabled={dictation.status === 'preparing'}
                    />
                    <div className="absolute bottom-2 right-2 flex flex-wrap items-center justify-end gap-1.5">
                      {entryMode === 'note' && <>
                        <button type="button" onClick={() => dictation.status === 'recording' ? dictation.stop() : void dictation.start()}
                          disabled={dictation.status === 'preparing' || dictation.status === 'stopping'}
                          aria-label={dictation.status === 'recording' ? 'Diktieren beenden' : 'Notiz diktieren'}
                          aria-pressed={dictation.status === 'recording'}
                          className={`flex items-center gap-1 rounded-lg border px-2.5 py-2 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${dictation.status === 'recording' ? 'border-rose-300 bg-rose-100 text-rose-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}>
                          <Mic size={16} /> {dictation.status === 'recording' ? 'Stopp' : dictation.status === 'preparing' ? 'Vorbereitung…' : dictation.status === 'stopping' ? 'Wird beendet…' : 'Diktieren'}
                        </button>
                        <button type="button" onClick={polishNewEntry} disabled={aiLoading || dictation.status !== 'idle' || !newEntryText.trim()}
                          aria-label="Notiztext mit KI überarbeiten"
                          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                          title="KI-Bearbeitung: mögliche externe Datenübertragung beachten">
                          <Sparkles size={16} />
                        </button>
                      </>}
                      <button type="submit" disabled={!newEntryText.trim() || dictation.status !== 'idle'}
                        className={`rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-40 ${entryMode === 'todo' ? 'bg-amber-600' : 'bg-teal-700 hover:bg-teal-800'}`}>
                        {entryMode === 'todo' ? 'To-Do speichern' : 'Notiz speichern'}
                      </button>
                    </div>
                  </div>
                  {entryMode === 'note' && (
                    <div className="space-y-1" aria-live="polite">
                      {(dictation.status === 'recording' || dictation.status === 'stopping') && <p className="text-xs font-semibold text-rose-700">
                        {dictation.status === 'stopping' ? 'Spracherkennung wird beendet; letztes Ergebnis wird übernommen…' : `● Aufnahme läuft (${dictation.mode === 'local' ? 'lokal' : 'Browser-Spracherkennung'}) · Zum Speichern zuerst Stopp drücken.`}
                      </p>}
                      {dictation.interim && <p className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs italic text-slate-600">Erkannt: {dictation.interim}</p>}
                      {dictation.error && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{dictation.error}</p>}
                    </div>
                  )}
               </form>
            </div>

            {(app.dashboardTodos || []).length > 0 && (
              <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-6 sm:p-8 print:hidden">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-[0.625rem] font-black uppercase tracking-[0.18em] text-amber-600">Persönliche Aufgaben</p>
                    <h3 className="mt-1 text-[1rem] font-black text-slate-900">Meine To-Do-Liste</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[0.625rem] font-black border border-amber-200">
                    {(app.dashboardTodos || []).filter(todo => !todo.done).length} offen
                  </span>
                </div>
                <div className="space-y-2">
                  {(app.dashboardTodos || []).map(todo => (
                    <div key={todo.id} className={`flex items-center gap-3 rounded-2xl border p-3 transition-all ${todo.done ? 'border-slate-100 bg-slate-50 opacity-65' : 'border-amber-100 bg-amber-50/50'}`}>
                      <button
                        type="button"
                        onClick={() => togglePersonalTodo(todo.id)}
                        className={`w-7 h-7 shrink-0 rounded-xl border flex items-center justify-center transition-all ${todo.done ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300 text-transparent hover:border-amber-400'}`}
                        aria-label={todo.done ? 'To-Do wieder öffnen' : 'To-Do erledigen'}
                      >
                        <Check size={15} strokeWidth={3} />
                      </button>
                      <span className={`flex-1 text-sm font-semibold ${todo.done ? 'line-through text-slate-400' : 'text-slate-800'}`}>{todo.text}</span>
                      <button
                        type="button"
                        onClick={() => deletePersonalTodo(todo.id)}
                        className="p-2 rounded-xl text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition-all"
                        aria-label="To-Do löschen"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Chronik – aktuelle Klasse, Filter ändern keine gespeicherten Notizen. */}
            <section className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm print:hidden">
                {([
                  ['all', 'Alle'], ['journal', 'Allgemein'], ['student', 'Schüler/innen']
                ] as const).map(([id,label]) => (
                  <button key={id} type="button" onClick={() => setChronikFilter(id)}
                    aria-pressed={chronikFilter === id}
                    className={`rounded-lg border px-3 py-2 text-xs font-bold ${chronikFilter === id ? 'border-indigo-200 bg-indigo-50 text-indigo-800' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'}`}>
                    {label}
                  </button>
                ))}
                <select aria-label="Kategorie filtern" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-800">
                  <option value="">Alle Kategorien</option>
                  <option value="Notiz">Notiz</option>
                  <option value="Verhalten">Verhalten / Beobachtung</option>
                  <option value="Erfolg">Lob / Stärke</option>
                  <option value="Eltern">Elternkontakt</option>
                  <option value="Journal">Klassenjournal</option>
                </select>
                <select aria-label="Zeitraum filtern" value={dateFilter} onChange={e => setDateFilter(e.target.value as typeof dateFilter)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-800">
                  <option value="all">Alle Zeiten</option>
                  <option value="today">Heute</option>
                  <option value="week">Letzte 7 Tage</option>
                </select>
                <div className="relative min-w-44 flex-1">
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="search" aria-label="Notizen durchsuchen" value={chronikSearch}
                    onChange={e => setChronikSearch(e.target.value)}
                    placeholder="Notizen, Namen und Kategorien suchen…"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-indigo-400" />
                </div>
              </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:grid-cols-1 print:gap-4">
                  <AnimatePresence>
                    {chronicleEntries.map((entry) => {
                         const student = entry.schuelerId ? app.schueler.find(s => s.id === entry.schuelerId) : null;
                         const appearance = noteCategoryAppearance(entry.kategorie);

                         return (
                           <motion.div 
                               layout
                               initial={{ opacity: 0, scale: 0.95 }}
                               animate={{ opacity: 1, scale: 1 }}
                               exit={{ opacity: 0, scale: 0.95 }}
                               key={entry.id}
                               className={`p-4 rounded-xl border shadow-sm hover:shadow-md transition-all group flex flex-col gap-2 relative print:shadow-none print:border-slate-300 print:rounded-none print:p-4 ${appearance.card}`}
                           >
                              <div className="flex items-center justify-between relative z-10">
                                 <div className="flex items-center gap-3">
                                    <div className={`px-2 py-1 rounded-full border text-xs font-bold ${appearance.badge}`}>
                                       {appearance.label}
                                    </div>
                                    <div className="text-[0.625rem] font-black text-slate-300 uppercase tracking-widest tabular-nums print:text-black">
                                       {new Date(entry.datum).toLocaleDateString('de-AT')}
                                    </div>
                                 </div>
                                 <button 
                                   onClick={() => deleteJournalEntry(entry.id)}
                                   className="p-2 text-slate-600 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-all print:hidden" aria-label="Notiz löschen"
                                 >
                                    <Trash2 size={16} />
                                 </button>
                              </div>

                              {student && (
                                 <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/70 px-2 py-1.5 print:border-0 print:p-0">
                                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-[0.875rem] leading-snug font-black text-accent  print:hidden">
                                       {student.vorname.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                       <div className="text-[0.8125rem] font-black text-slate-900 text-wrap leading-tight break-words tracking-tight">{student.vorname} {student.nachname}</div>
                                       <div className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest print:hidden">Verknüpftes Kind</div>
                                    </div>
                                 </div>
                              )}

                              <div className="relative z-10">
                                 <p className="text-sm font-medium text-slate-800 leading-relaxed whitespace-pre-wrap print:text-black print:font-normal">{entry.inhalt}</p>
                              </div>

                              {!student && !entry.quelle?.includes('Direkt') && (
                                <div className="pt-4 border-t border-slate-50 text-[0.625rem] italic text-slate-300 flex items-center gap-2 print:hidden">
                                   <Hash size={12} className="opacity-40" /> {entry.quelle || 'Manuell'}
                                </div>
                              )}
                           </motion.div>
                         );
                      })}
                  </AnimatePresence>
               </div>
               
               {chronicleEntries.length === 0 && (
                  <div className="py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-500 space-y-2">
                     <History size={64} className="opacity-10" strokeWidth={1} />
                     <div className="text-center space-y-2">
                        <p className="text-[0.875rem] leading-snug font-black uppercase tracking-[0.2em]">
                          {(app.notes || []).length === 0 ? 'Deine Chronik ist noch leer' : 'Keine passenden Einträge'}
                        </p>
                        <p className="text-[0.75rem] leading-tight font-bold opacity-60">
                          {(app.notes || []).length === 0
                            ? 'Erfasse deinen ersten Eintrag im Feld oben.'
                            : 'Passe Suche oder Filter an.'}
                        </p>
                     </div>
                  </div>
               )}
            </section>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <style>{`
        @media print {
          .print\:hidden { display: none !important; }
          .max-w-7xl { max-width: none !important; }
          .shadow-xl, .shadow-sm { box-shadow: none !important; }
          .border { border: 1px solid #111 !important; }
          .bg-slate-900 { background: white !important; color: black !important; }
          .text-white { color: black !important; }
          .text-slate-600, .text-slate-400, .text-slate-300 { color: black !important; }
          .rounded-[2.5rem], .rounded-[3rem], .rounded-2xl { border-radius: 0 !important; }
          .grid-cols-2, .grid-cols-3 { grid-template-columns: repeat(1, minmax(0, 1fr)) !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
