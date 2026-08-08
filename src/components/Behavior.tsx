
import React, { useState } from 'react';
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
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DebouncedInput } from './DebouncedInput';
import { polishText } from '../services/aiService';
import { logObservation, logActivity } from '../lib/utils';
import { NoteEntry } from '../types';

export default function Behavior() {
  const { app, setApp } = useApp();
  const [activeTab, setActiveTab] = useState<'verhalten' | 'config' | 'chronik'>('verhalten');
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

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [behaviorHistory, redoHistory]);

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
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);

  const [showIconPicker, setShowIconPicker] = useState<number | null>(null);
  const commonIcons = ['🌟', '😊', '😐', '⚠️', '🚫', '🔥', '❤️', '👍', '👎', '👏', '🙌', '🤝', '💎', '🏆', '👑', '✨', '🚀', '⭐', '🎈', '🎉', '📝', '💬', '📖', '💡', '⏰', '🍎', '🎒', '🎨', '🧩', '⚽', '💻', '🦁', '🐘', '🦎', '🦉', '🐝'];

  const resetAllStatuses = () => {
    if (confirm('Möchtest du alle Schüler auf die Standard-Stufe zurücksetzen?')) {
      pushToHistory();
      const newStatusMap: Record<string, string> = {};
      const now = new Date().toISOString().split('T')[0];
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
        behavior_notes: {},
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
        datum: new Date().toISOString().split('T')[0],
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
    if (!newEntryText.trim()) return;

    const kategorie = selectedStudentId ? 'Verhalten' : 'Journal';

    logObservation(
      setApp, 
      selectedStudentId || undefined, 
      newEntryText, 
      kategorie, 
      'Chronik-Eingabe'
    );
    
    setNewEntryText('');
    logActivity(setApp, `Eintrag erstellt: ${kategorie}`, 'note');
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
    <div className="py-4 space-y-8 max-w-7xl mx-auto w-full min-h-screen pb-20">
      
      {/* Master Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/80 backdrop-blur-xl p-4 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-900/5 relative  print:hidden">
        <div className="flex flex-wrap gap-2 p-1.5 bg-slate-50 rounded-[2rem] border border-slate-100 relative z-10 w-full sm:w-auto">
          {[
            { id: 'verhalten', label: 'Status', icon: <ShieldAlert size={14} /> },
            { id: 'chronik', label: 'Chronik & Notizen', icon: <BookOpen size={14} /> },
            { id: 'config', label: 'Setup', icon: <Settings size={14} /> }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 sm:flex-none px-6 py-3 rounded-full text-[0.6875rem] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg shadow-black/20 translate-y-[-2px]' : 'text-slate-400 hover:bg-white hover:text-slate-900'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 pr-4 relative z-10">
          <div className="text-right hidden md:block">
            <p className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Modul</p>
            <p className="text-[0.875rem] leading-snug font-black text-slate-900">Verhalten & Notizen</p>
          </div>
          <div className="w-10 h-10 bg-accent/10 rounded-2xl flex items-center justify-center text-accent shadow-inner">
             <Notebook size={20} />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'verhalten' ? (
          <motion.div 
            key="verhalten"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm ">
               <div className="px-10 py-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center flex-wrap gap-4">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-accent text-white flex items-center justify-center shadow-lg shadow-accent/20">
                      <ShieldAlert size={28} />
                    </div>
                    <div>
                      <h3 className="text-[1.25rem] leading-normal font-black text-slate-900 tracking-tight">Verhaltens-Dashboard</h3>
                      <p className="text-[0.875rem] text-slate-400 font-bold uppercase tracking-widest mt-1">Aktueller Status der Kinder</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button 
                      onClick={handleUndo}
                      disabled={behaviorHistory.length === 0}
                      className={`px-5 py-3 rounded-2xl text-[0.6875rem] font-black uppercase tracking-widest flex items-center gap-2 border transition-all shadow-sm ${behaviorHistory.length === 0 ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-50' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-accent cursor-pointer active:scale-95'}`}
                      title="Letzte Aktion rückgängig machen (Strg+Z)"
                    >
                      <RotateCcw size={14} /> Rückgängig
                    </button>
                    <button 
                      onClick={handleRedo}
                      disabled={redoHistory.length === 0}
                      className={`px-5 py-3 rounded-2xl text-[0.6875rem] font-black uppercase tracking-widest flex items-center gap-2 border transition-all shadow-sm ${redoHistory.length === 0 ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-50' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-accent cursor-pointer active:scale-95'}`}
                      title="Zuletzt rückgängig gemachte Aktion wiederholen"
                    >
                      <History size={14} /> Wiederholen
                    </button>
                    <button 
                      onClick={resetAllStatuses}
                      className="px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[0.6875rem] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
                    >
                      <XCircle size={14} /> Tages-Reset
                    </button>
                  </div>
               </div>

               <div className="p-10">
                 <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">
                          <th className="px-6 py-4 text-left border-b border-slate-100">Schüler/in</th>
                          <th className="px-6 py-4 text-center border-b border-slate-100">Status</th>
                          <th className="px-6 py-4 text-left border-b border-slate-100">Schnell-Notiz</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {sortedStudents.map((s) => {
                          const currentId = app.behavior_status?.[s.id] || defaultStageId;
                          return (
                            <tr key={s.id} className="group hover:bg-slate-50/30 transition-all">
                              <td className="px-6 py-6">
                                <button 
                                  onClick={() => setSelectedStatStudentId(s.id)}
                                  className="text-[1rem] font-black text-slate-900 tracking-tight hover:text-accent flex items-center gap-2 group/name"
                                >
                                  {s.nachname} <span className="text-slate-400 font-bold">{s.vorname}</span>
                                  <History size={14} className="opacity-0 group-hover/name:opacity-100 transition-opacity" />
                                </button>
                              </td>
                              <td className="px-6 py-6">
                                <div className="flex gap-2 justify-center">
                                  {stages.map(stage => (
                                    <button
                                      key={stage.id}
                                      onClick={() => toggleStatus(s.id, stage.id)}
                                      className={`w-10 h-10 rounded-xl border-2 transition-all flex items-center justify-center cursor-pointer hover:scale-125 ${currentId === stage.id ? 'bg-white shadow-xl scale-110 border-accent' : 'bg-slate-50 border-transparent grayscale opacity-30 hover:opacity-100 hover:grayscale-0'}`}
                                      title={stage.label}
                                    >
                                      <span className="text-[1.125rem] leading-normal">{stage.icon}</span>
                                    </button>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-6">
                                <div className="flex items-center gap-3">
                                  <DebouncedInput 
                                    className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-[0.875rem] font-medium text-slate-900 outline-none focus:border-accent/40 transition-all placeholder:text-slate-300"
                                    placeholder="Kurze Anmerkung..."
                                    value={app.behavior_notes?.[s.id] || ''}
                                    onChange={(val) => updateBehaviorNote(s.id, val)}
                                  />
                                  <button 
                                    onClick={() => {
                                      const txt = app.behavior_notes?.[s.id];
                                      if (txt?.trim()) {
                                        logObservation(setApp, s.id, txt, 'Verhalten', 'Status-Dashboard');
                                        updateBehaviorNote(s.id, '');
                                      }
                                    }}
                                    className="p-2.5 bg-accent/10 text-accent rounded-xl hover:bg-accent hover:text-white transition-all shadow-sm active:scale-95"
                                  >
                                    <Save size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                 </div>
               </div>
            </div>
          </motion.div>
        ) : activeTab === 'chronik' ? (
          <motion.div
            key="chronik"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* New Entry Input - Schritt 3.2 */}
            <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl relative  group print:hidden">
               <div className="absolute top-0 right-0 p-12 transform translate-x-1/4 -translate-y-1/4">
                  <Bot size={180} className="text-white/5 group-hover:rotate-12 transition-transform duration-1000" />
               </div>
               
               <form onSubmit={handleCreateEntry} className="relative z-10 space-y-6">
                  <div className="flex flex-wrap items-center gap-4 mb-4">
                     <div className="flex-1 min-w-[300px] relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                        <select
                          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-10 py-4 text-white text-[0.875rem] font-black outline-none focus:border-accent/40 appearance-none transition-all cursor-pointer"
                          value={selectedStudentId}
                          onChange={e => setSelectedStudentId(e.target.value)}
                        >
                           <option value="" className="bg-slate-900 text-white">Allgemeiner Eintrag (Journal)</option>
                           <optgroup label="Schüler/innen" className="bg-slate-900 text-white font-black">
                              {sortedStudents.map(s => (
                                <option key={s.id} value={s.id} className="bg-slate-900 text-white italic">{s.nachname} {s.vorname}</option>
                              ))}
                           </optgroup>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">
                          <ChevronRight size={16} className="rotate-90" />
                        </div>
                     </div>
                     <div className="hidden sm:block">
                        <span className="text-[0.625rem] font-black text-white/30 uppercase tracking-[0.2em]">
                           {selectedStudentId ? 'Kategorie: Verhalten' : 'Kategorie: Journal'}
                        </span>
                     </div>
                  </div>

                  <div className="relative">
                     <textarea 
                        className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] p-8 text-[1.125rem] leading-normal font-medium text-white outline-none focus:border-accent/50 focus:ring-12 ring-accent/5 transition-all placeholder:text-white/20 resize-none h-40 leading-relaxed custom-scrollbar"
                        placeholder={selectedStudentId ? "Beobachtung zum Schüler festhalten..." : "Allgemeines Ereignis für das Journal notieren..."}
                        value={newEntryText}
                        onChange={e => setNewEntryText(e.target.value)}
                     />
                     <div className="absolute bottom-6 right-6 flex items-center gap-3">
                        <button 
                          type="button"
                          onClick={polishNewEntry}
                          className={`p-4 bg-white/5 text-white/50 hover:text-amber-400 hover:bg-amber-400/10 rounded-2xl transition-all ${aiLoading ? 'animate-pulse' : ''}`}
                          title="Text durch KI verbessern lassen"
                        >
                           <Sparkles size={20} />
                        </button>
                        <button 
                          type="submit"
                          disabled={!newEntryText.trim()}
                          className="px-10 py-4 bg-accent text-white rounded-2xl font-black uppercase text-[0.75rem] tracking-[0.2em] shadow-2xl shadow-accent/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100"
                        >
                           Speichern
                        </button>
                     </div>
                  </div>
               </form>
            </div>

            {/* Filter & Chronicle List - Schritt 3.3 / 3.4 */}
            <div className="space-y-6">
               <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm print:hidden">
                  <div className="flex flex-wrap gap-2">
                     {[
                       { id: 'all', label: 'Alles', icon: <History size={14} /> },
                       { id: 'journal', label: 'Nur Journal', icon: <Notebook size={14} /> },
                       { id: 'student', label: 'Nur Schüler-Notizen', icon: <Users size={14} /> }
                     ].map(f => (
                       <button
                         key={f.id}
                         onClick={() => setChronikFilter(f.id as any)}
                         className={`px-6 py-3 rounded-2xl text-[0.6875rem] font-black uppercase tracking-widest transition-all flex items-center gap-3 cursor-pointer ${chronikFilter === f.id ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900'}`}
                       >
                          {f.icon} {f.label}
                       </button>
                     ))}
                  </div>
                  
                  <div className="relative w-full lg:w-96 group">
                     <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-accent transition-colors" size={18} />
                     <input 
                        className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] pl-12 pr-6 py-4 text-[0.875rem] font-bold outline-none focus:border-accent/40 shadow-inner transition-all placeholder:text-slate-300"
                        placeholder="Durchsuche die Chronik..."
                        value={chronikSearch}
                        onChange={e => setChronikSearch(e.target.value)}
                     />
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 print:grid-cols-1 print:gap-4">
                  <AnimatePresence>
                    {(app.notes || [])
                      .filter(entry => {
                         const searchLower = chronikSearch.toLowerCase();
                         const matchesSearch = entry.inhalt.toLowerCase().includes(searchLower) || (entry.kategorie || '').toLowerCase().includes(searchLower);
                         const matchesFilter = chronikFilter === 'all' ? true : chronikFilter === 'journal' ? entry.kategorie === 'Journal' : entry.kategorie === 'Verhalten';
                         return matchesSearch && matchesFilter;
                      })
                      .sort((a,b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())
                      .map((entry) => {
                         const student = entry.schuelerId ? app.schueler.find(s => s.id === entry.schuelerId) : null;
                         const categoryColors: Record<string, string> = {
                           'Journal': 'bg-blue-50 text-blue-600 border-blue-100 print:bg-white print:text-black print:border-black',
                           'Verhalten': 'bg-amber-50 text-amber-600 border-amber-100 print:bg-white print:text-black print:border-black',
                           'Erfolg': 'bg-emerald-50 text-emerald-600 border-emerald-100',
                           'Eltern': 'bg-purple-50 text-purple-600 border-purple-100',
                           'Notiz': 'bg-slate-50 text-slate-600 border-slate-200'
                         };

                         return (
                           <motion.div 
                               layout
                               initial={{ opacity: 0, scale: 0.95 }}
                               animate={{ opacity: 1, scale: 1 }}
                               exit={{ opacity: 0, scale: 0.95 }}
                               key={entry.id}
                               className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-900/5 transition-all group flex flex-col gap-5 relative  print:shadow-none print:border-slate-300 print:rounded-none print:p-4"
                           >
                              <div className="flex items-center justify-between relative z-10">
                                 <div className="flex items-center gap-3">
                                    <div className={`px-4 py-1.5 rounded-full border text-[0.5625rem] font-black uppercase tracking-widest ${categoryColors[entry.kategorie] || 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                       {entry.kategorie}
                                    </div>
                                    <div className="text-[0.625rem] font-black text-slate-300 uppercase tracking-widest tabular-nums print:text-black">
                                       {new Date(entry.datum).toLocaleDateString('de-AT')}
                                    </div>
                                 </div>
                                 <button 
                                   onClick={() => deleteJournalEntry(entry.id)}
                                   className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 print:hidden"
                                 >
                                    <Trash2 size={16} />
                                 </button>
                              </div>

                              {student && (
                                 <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-accent/5 group-hover:border-accent/10 transition-colors print:bg-white print:border-0 print:p-0">
                                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-[0.875rem] leading-snug font-black text-accent  print:hidden">
                                       {student.vorname.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                       <div className="text-[0.8125rem] font-black text-slate-900 text-wrap leading-tight break-words tracking-tight">{student.vorname} {student.nachname}</div>
                                       <div className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest print:hidden">Verknüpftes Kind</div>
                                    </div>
                                 </div>
                              )}

                              <div className="flex-1 relative z-10">
                                 <p className="text-[0.9375rem] font-medium text-slate-600 leading-relaxed whitespace-pre-wrap print:text-black print:font-normal">{entry.inhalt}</p>
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
               
               {(!app.notes || app.notes.length === 0) && (
                  <div className="py-32 bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 space-y-6">
                     <History size={64} className="opacity-10" strokeWidth={1} />
                     <div className="text-center space-y-2">
                        <p className="text-[0.875rem] leading-snug font-black uppercase tracking-[0.2em]">Deine Chronik ist noch leer</p>
                        <p className="text-[0.75rem] leading-tight font-bold opacity-60">Erfasse deinen ersten Eintrag im Feld oben.</p>
                     </div>
                  </div>
               )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="config"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-10"
          >
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm space-y-8">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center">
                     <Settings size={24} />
                  </div>
                  <div>
                     <h3 className="text-[1.5rem] leading-normal font-black text-slate-900 tracking-tight">Status-Definition</h3>
                     <p className="text-[0.875rem] text-slate-400 font-bold uppercase tracking-widest">Feedback-Stufen bearbeiten</p>
                  </div>
               </div>

               <div className="space-y-4">
                  {stages.map((stage: any, idx: number) => (
                    <div key={stage.id} className="flex items-center gap-4 p-5 bg-slate-50 border border-slate-200 rounded-[2rem] group transition-all hover:bg-white hover:border-accent/30 hover:shadow-xl hover:shadow-slate-900/5">
                        <button 
                          onClick={() => setShowIconPicker(idx)}
                          className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-[1.875rem] leading-tight shadow-sm hover:scale-110 active:scale-95 transition-all"
                        >
                           {stage.icon}
                        </button>
                        
                        <div className="flex-1 space-y-2">
                           <input 
                              type="text" 
                              className="w-full bg-transparent border-b-2 border-slate-200 p-2 text-[1rem] font-black text-slate-900 outline-none focus:border-accent transition-all"
                              value={stage.label}
                              onChange={e => {
                                 const newStages = [...stages];
                                 newStages[idx].label = e.target.value;
                                 setApp(prev => ({ ...prev, behavior_stages: newStages }));
                              }}
                           />
                           <div className="flex items-center gap-4">
                              <label className="flex items-center gap-2 text-[0.625rem] font-black uppercase text-slate-400 cursor-pointer">
                                 <input 
                                    type="radio" 
                                    name="default_stage" 
                                    checked={defaultStageId === stage.id}
                                    onChange={() => setApp(prev => ({ ...prev, behavior_default_stage_id: stage.id }))}
                                    className="accent-accent"
                                 /> Standard
                              </label>
                              <div className="flex items-center gap-1.5  rounded-full border border-slate-200 p-1 bg-white">
                                 <input 
                                   type="color" 
                                   className="w-5 h-5 border-none p-0 bg-transparent cursor-pointer scale-150"
                                   value={stage.color}
                                   onChange={e => {
                                      const newStages = [...stages];
                                      newStages[idx].color = e.target.value;
                                      setApp(prev => ({ ...prev, behavior_stages: newStages }));
                                   }}
                                 />
                              </div>
                           </div>
                        </div>

                        <button 
                          onClick={() => {
                             if(stages.length > 2) {
                                setApp(prev => ({ ...prev, behavior_stages: stages.filter((_, i) => i !== idx) }));
                             }
                          }}
                          className="p-3 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        >
                           <Trash2 size={18} />
                        </button>
                    </div>
                  ))}
                  
                  <button 
                    onClick={() => {
                       const newStage = { id: Date.now().toString(), label: 'Neu', color: '#64748b', icon: '❓' };
                       setApp(prev => ({ ...prev, behavior_stages: [...stages, newStage] }));
                    }}
                    className="w-full py-6 border-4 border-dashed border-slate-100 rounded-[2rem] text-[0.75rem] font-black uppercase text-slate-300 hover:border-accent/20 hover:text-accent hover:bg-accent/5 hover:scale-[0.99] transition-all flex items-center justify-center gap-3"
                  >
                     <Plus size={20} /> Stufe hinzufügen
                  </button>
               </div>
            </div>

            <div className="space-y-10">
               <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative  h-full">
                  <h4 className="text-[0.875rem] font-black uppercase tracking-[0.3em] text-accent mb-8 flex items-center gap-3">
                    <Monitor size={20} /> Display-Settings
                  </h4>
                  <div className="space-y-8 relative z-10">
                     <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/10">
                        <div>
                           <div className="text-[1.125rem] leading-normal font-black mb-1">Board-Sichtbarkeit</div>
                           <p className="text-[0.8125rem] text-white/40">Status im Unterrichtsmodus anzeigen</p>
                        </div>
                        <button 
                          onClick={() => setApp(prev => ({ ...prev, settings: { ...prev.settings, showVerhaltenOnBoard: !prev?.settings?.showVerhaltenOnBoard } }))}
                          className={`w-14 h-7 rounded-full relative transition-all shadow-inner border-2 ${app?.settings?.showVerhaltenOnBoard ? 'bg-accent border-accent/40 text-accent' : 'bg-white/10 border-white/10'}`}
                        >
                          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all ${app?.settings?.showVerhaltenOnBoard ? 'left-7.5' : 'left-0.5'}`} />
                        </button>
                     </div>

                     <div className="space-y-4">
                        <label className="text-[0.625rem] font-black uppercase tracking-widest text-white/40">Belohnungssymbol</label>
                        <div className="grid grid-cols-4 gap-4">
                           {['diamond', 'smiley', 'trophy', 'plus'].map(sym => {
                              const icons: any = { diamond: '💎', smiley: '😊', trophy: '🏆', plus: '➕' };
                              return (
                                <button
                                  key={sym}
                                  onClick={() => setApp(prev => ({ ...prev, settings: { ...prev.settings, verhaltenSymbol: sym as any } }))}
                                  className={`aspect-square rounded-2xl flex items-center justify-center text-[1.5rem] leading-normal border-2 transition-all ${app.settings.verhaltenSymbol === sym ? 'border-accent bg-accent/20 scale-110 shadow-xl shadow-accent/20' : 'border-white/5 bg-white/5 grayscale opacity-30 hover:opacity-100 hover:grayscale-0'}`}
                                >
                                   {icons[sym]}
                                </button>
                              );
                           })}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
            
            {/* Icon Picker Modal - Fullscreen */}
            <AnimatePresence>
               {showIconPicker !== null && (
                 <>
                    <motion.div 
                       initial={{ opacity: 0 }} 
                       animate={{ opacity: 1 }} 
                       exit={{ opacity: 0 }} 
                       onClick={() => setShowIconPicker(null)}
                       className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[1000]" 
                    />
                    <motion.div 
                       initial={{ opacity: 0, scale: 0.9, y: 50 }}
                       animate={{ opacity: 1, scale: 1, y: 0 }}
                       exit={{ opacity: 0, scale: 0.9, y: 50 }}
                       className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:max-w-xl md:mx-auto bg-white rounded-[3rem] p-10 z-[1001] shadow-2xl border border-slate-200"
                    >
                       <div className="text-center mb-8">
                          <h4 className="text-[1.5rem] leading-normal font-black text-slate-900 tracking-tight">Icon wählen</h4>
                          <p className="text-[0.875rem] leading-snug font-bold text-slate-400 mt-1">Stufe: {stages[showIconPicker].label}</p>
                       </div>
                       <div className="grid grid-cols-6 sm:grid-cols-8 gap-4 max-h-[400px] overflow-y-auto no-scrollbar pb-10">
                          {commonIcons.map(icon => (
                             <button
                               key={icon}
                               onClick={() => {
                                  const newStages = [...stages];
                                  newStages[showIconPicker].icon = icon;
                                  setApp(prev => ({ ...prev, behavior_stages: newStages }));
                                  setShowIconPicker(null);
                               }}
                               className="aspect-square flex items-center justify-center text-[1.875rem] leading-tight hover:bg-slate-50 hover:scale-125 active:scale-90 rounded-2xl transition-all cursor-pointer"
                             >
                                {icon}
                             </button>
                          ))}
                       </div>
                    </motion.div>
                 </>
               )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedStatStudentId && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200]"
              onClick={() => setSelectedStatStudentId(null)}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-[201] flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center text-white shadow-lg shadow-accent/20">
                    <History size={24} />
                  </div>
                  <div>
                    <h3 className="text-[1.25rem] leading-normal font-black text-slate-900 tracking-tight">Icon-Statistik</h3>
                    <p className="text-[0.6875rem] font-black text-slate-400 uppercase tracking-widest mt-1">
                      {app.schueler.find(s => s.id === selectedStatStudentId)?.vorname} {app.schueler.find(s => s.id === selectedStatStudentId)?.nachname}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedStatStudentId(null)}
                  className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm transition-all"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <div className="flex bg-slate-100 p-1 rounded-2xl">
                  {(['week', 'month', 'total'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setStatsPeriod(p)}
                      className={`flex-1 py-3 text-[0.625rem] font-black uppercase tracking-widest rounded-xl transition-all ${statsPeriod === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {p === 'week' ? 'Woche' : p === 'month' ? 'Monat' : 'Gesamt'}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <h4 className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest px-1">Verlauf letzte 7 Tage</h4>
                  <div className="flex gap-2 justify-between">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const d = new Date();
                      d.setDate(d.getDate() - (6 - i));
                      const dateStr = d.toISOString().split('T')[0];
                      const dayLogs = (app.statusLog || []).filter(l => l.schuelerId === selectedStatStudentId && l.datum === dateStr);
                      const lastLog = dayLogs.length > 0 ? dayLogs.sort((a,b) => b.timestamp - a.timestamp)[0] : null;
                      const stage = lastLog ? stages.find(s => s.id === lastLog.iconId) : null;
                      
                      return (
                        <div key={dateStr} className="flex-1 flex flex-col items-center gap-2">
                          <div 
                            className={`w-full aspect-square rounded-xl border flex items-center justify-center transition-all ${stage ? 'shadow-sm' : 'border-dashed border-slate-100 bg-slate-50 opacity-50'}`}
                            style={{ 
                              backgroundColor: stage ? `${stage.color}15` : undefined,
                              borderColor: stage ? `${stage.color}40` : undefined,
                              color: stage?.color
                            }}
                          >
                            <span className="text-[1.125rem] leading-normal">{stage?.icon || ''}</span>
                          </div>
                          <div className="text-[0.5rem] font-black text-slate-400 uppercase tracking-tighter">
                            {d.toLocaleDateString('de-DE', { weekday: 'short' })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest px-1">Verteilung</h4>
                  {studentStats ? (
                    <div className="space-y-6">
                      {studentStats.statsMap.map(stat => (
                        <div key={stat.id} className="space-y-3">
                          <div className="flex justify-between items-center px-1">
                            <div className="flex items-center gap-3">
                              <span className="text-[1.25rem] leading-normal">{stat.icon}</span>
                              <span className="text-[0.875rem] leading-snug font-black text-slate-700">{stat.label}</span>
                            </div>
                            <div className="bg-slate-100 px-3 py-1 rounded-full text-[0.75rem] font-black text-slate-900 tabular-nums">
                              {stat.count}×
                            </div>
                          </div>
                          <div className="h-3 bg-slate-50 rounded-full  border border-slate-100 shadow-inner">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(stat.count / studentStats.maxCount) * 100}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: stat.color }}
                            />
                          </div>
                        </div>
                      ))}

                      {studentStats.logCount === 0 && (
                        <div className="py-20 text-center space-y-4 text-slate-300">
                          <History size={48} className="mx-auto opacity-20" />
                          <p className="text-[0.6875rem] font-black uppercase tracking-[0.2em]">Keine Daten für diesen Zeitraum</p>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* History List */}
                <div className="border-t border-slate-100 pt-8 space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">Letzte Änderungen</h4>
                    {selectedStatStudentId && (
                      <button 
                        onClick={() => clearStudentHistory(selectedStatStudentId)}
                        className="text-[0.625rem] font-black text-rose-500 hover:text-rose-700 uppercase tracking-widest flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
                        title="Gesamten Icon-Verlauf für dieses Kind zurücksetzen"
                      >
                        <Trash2 size={12} />
                        Verlauf leeren
                      </button>
                    )}
                  </div>
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                    {(app.statusLog || [])
                      .filter(l => l.schuelerId === selectedStatStudentId && (!startDate || l.datum >= startDate))
                      .map(log => {
                        const stage = stages.find(st => st.id === log.iconId);
                        return (
                          <div key={log.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/50 group/log transition-all hover:bg-slate-100/20">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-[1.125rem] leading-normal">
                                {stage?.icon || '❓'}
                              </div>
                              <div>
                                <div className="text-[0.75rem] font-black text-slate-900">{stage?.label || 'Unbekannt'}</div>
                                <div className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-tight">Status-Update</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-right">
                              <div>
                                <div className="text-[0.6875rem] font-black text-slate-900 tabular-nums">{new Date(log.timestamp).toLocaleDateString('de-DE')}</div>
                                <div className="text-[0.5625rem] font-bold text-slate-400 tabular-nums">{new Date(log.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div>
                              </div>
                              <button 
                                onClick={() => deleteLogEntry(log.id)}
                                className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover/log:opacity-100 cursor-pointer"
                                title="Diesen Eintrag löschen"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    {!(app.statusLog || []).some(l => l.schuelerId === selectedStatStudentId && (!startDate || l.datum >= startDate)) && (
                      <div className="py-8 text-center text-[0.75rem] leading-tight text-slate-400 font-bold">Keine Statusänderungen aufgezeichnet.</div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="p-8 bg-slate-50 border-t border-slate-100">
                <button 
                  onClick={() => setSelectedStatStudentId(null)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[0.75rem] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
                >
                  <CheckCircle size={18} />
                  Schließen
                </button>
              </div>
            </motion.div>
          </>
        )}
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
