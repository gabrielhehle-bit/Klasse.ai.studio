import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, X, Plus, Trash2, Copy, Check, Info, Search, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { syncNoteToPlanning, inferDateFromText } from '../lib/utils';

interface QuickNote {
  id: string;
  text: string;
  color: 'yellow' | 'mint' | 'blue' | 'coral';
  completed?: boolean;
  category?: 'wichtig' | 'eltern' | 'idee' | 'unterricht' | 'termin' | 'allgemein';
  createdAt?: number;
}

const CATEGORIES = [
  { id: 'all', label: 'Alle', emoji: '📂', color: 'bg-stone-100 text-stone-800' },
  { id: 'wichtig', label: 'Wichtig', emoji: '🔴', color: 'bg-rose-50 text-rose-800 border-rose-100' },
  { id: 'eltern', label: 'Eltern', emoji: '📞', color: 'bg-amber-50 text-amber-800 border-amber-100' },
  { id: 'idee', label: 'Idee', emoji: '💡', color: 'bg-indigo-50 text-indigo-800 border-indigo-100' },
  { id: 'unterricht', label: 'Unterricht', emoji: '🎒', color: 'bg-emerald-50 text-emerald-800 border-emerald-100' },
  { id: 'termin', label: 'Termine', emoji: '📅', color: 'bg-purple-50 text-purple-800 border-purple-100' },
  { id: 'allgemein', label: 'Allgemein', emoji: '📌', color: 'bg-sky-50 text-sky-800 border-sky-100' }
] as const;

export default function DenkzettelWidget() {
  const { app, setApp } = useApp();
  const isOpen = app.showDenkzettel || false;
  const setIsOpen = (val: boolean) => setApp(prev => ({ ...prev, showDenkzettel: val }));
  
  const notes = app.denkzettelNotes || [];
  const setNotes = (newNotes: QuickNote[] | ((prev: QuickNote[]) => QuickNote[])) => {
    setApp(prev => {
      const currentNotes = prev.denkzettelNotes || [];
      const updatedNotes = typeof newNotes === 'function' ? (newNotes as any)(currentNotes) : newNotes;
      return { ...prev, denkzettelNotes: updatedNotes };
    });
  };
  
  const [activeColor, setActiveColor] = useState<'yellow' | 'mint' | 'blue' | 'coral'>('yellow');
  const [activeCategory, setActiveCategory] = useState<'wichtig' | 'eltern' | 'idee' | 'unterricht' | 'termin' | 'allgemein'>('allgemein');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  const [hasCopied, setHasCopied] = useState<boolean>(false);
  const [channelingNoteId, setChannelingNoteId] = useState<string | null>(null);
  const [assignStudentId, setAssignStudentId] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // LocalStorage sync is now handled by the global AppContext provider, 
  // but we keep the friendly initial note seeding if empty
  useEffect(() => {
    if (notes.length === 0 && !localStorage.getItem('denkzettel_seeded')) {
      setNotes([
        {
          id: 'welcome-1',
          text: '📝 Willkommen im Denkzettel! Hier kannst du spontane Ideen, Elterngesprächs-Notizen oder To-Dos während des Unterrichts festhalten.',
          color: 'yellow',
          completed: false,
          category: 'allgemein',
          createdAt: Date.now()
        }
      ]);
      localStorage.setItem('denkzettel_seeded', 'true');
    }
  }, []);

  const saveNotes = (updatedNotes: QuickNote[]) => {
    setNotes(updatedNotes);
  };

  const handleAddNote = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedText = inputText.trim();
    if (!trimmedText) return;

    const newNote: QuickNote = {
      id: `note-${Date.now()}`,
      text: trimmedText,
      color: activeColor,
      completed: false,
      category: activeCategory,
      createdAt: Date.now()
    };

    const updated = [newNote, ...notes];
    saveNotes(updated);

    // Auto sync to planning if it is a Termin (has parsed date)
    const parsedDate = inferDateFromText(trimmedText, app.schuljahr || '');
    if (parsedDate) {
      syncNoteToPlanning(trimmedText, setApp, app.schuljahr || '');
      setSuccessMsg('Termin in Jahres- & Wochenplanung übernommen 📅');
      setTimeout(() => setSuccessMsg(''), 4000);
    }

    setInputText('');
  };

  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = notes.filter(n => n.id !== id);
    saveNotes(updated);
  };

  const handleToggleComplete = (id: string) => {
    const updated = notes.map(n => n.id === id ? { ...n, completed: !n.completed } : n);
    saveNotes(updated);
  };

  const handleCopyNotes = () => {
    const textToCopy = notes
      .map(n => {
        const cat = CATEGORIES.find(c => c.id === (n.category || 'allgemein'));
        const catEmoji = cat ? cat.emoji : '📌';
        return `${n.completed ? '[x]' : '[ ]'} ${catEmoji} [${cat?.label || 'Allgemein'}] ${n.text}`;
      })
      .join('\n');
    
    navigator.clipboard.writeText(textToCopy);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleClearAll = () => {
    if (window.confirm('Möchtest du wirklich alle Notizen löschen?')) {
      saveNotes([]);
    }
  };

  // Tonal styled backgrounds
  const colorSchemes = {
    yellow: {
      bg: 'bg-amber-50/95 border-amber-200 text-amber-900',
      pill: 'bg-amber-400',
      text: 'text-amber-800',
      button: 'hover:bg-amber-100 text-amber-700',
      input: 'border-amber-200 focus:ring-amber-500 focus:border-amber-500'
    },
    mint: {
      bg: 'bg-emerald-50/95 border-emerald-250 text-emerald-900',
      pill: 'bg-emerald-400',
      text: 'text-emerald-800',
      button: 'hover:bg-emerald-100 text-emerald-700',
      input: 'border-emerald-250 focus:ring-emerald-500 focus:border-emerald-500'
    },
    blue: {
      bg: 'bg-sky-50/95 border-sky-200 text-sky-900',
      pill: 'bg-sky-400',
      text: 'text-sky-800',
      button: 'hover:bg-sky-100 text-sky-700',
      input: 'border-sky-200 focus:ring-sky-500 focus:border-sky-500'
    },
    coral: {
      bg: 'bg-rose-50/95 border-rose-200 text-rose-900',
      pill: 'bg-rose-400',
      text: 'text-rose-800',
      button: 'hover:bg-rose-100 text-rose-700',
      input: 'border-rose-200 focus:ring-rose-500 focus:border-rose-500'
    }
  };

  // Filter & Search Logic
  const filteredNotes = notes.filter(n => {
    const noteCategory = n.category || 'allgemein';
    const matchesFilter = selectedFilter === 'all' || noteCategory === selectedFilter;
    const matchesSearch = n.text.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getUncompletedCount = (filterId: string) => {
    return notes.filter(n => {
      const noteCategory = n.category || 'allgemein';
      const matchesFilter = filterId === 'all' || noteCategory === filterId;
      return matchesFilter && !n.completed;
    }).length;
  };

  return (
    <>
      {/* STICKY PANEL DRAWER / OVERLAY */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={`fixed bottom-22 right-6 w-85 sm:w-105 rounded-2xl border bg-white shadow-2xl  z-[998] flex flex-col h-[520px] no-print border-stone-200`}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[1rem] leading-normal">📝</span>
                <span className="text-[0.6875rem] font-black tracking-wider text-slate-800 uppercase">Spontaner Denkzettel</span>
              </div>
              <div className="flex items-center gap-1">
                {notes.length > 0 && (
                  <>
                    <button
                      onClick={handleCopyNotes}
                      className="p-1 px-1.5 hover:bg-stone-200 text-stone-500 rounded text-[0.5625rem] font-bold transition-all flex items-center gap-1"
                      title="Alle Notizen kopieren"
                    >
                      {hasCopied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                      <span>{hasCopied ? 'Kopiert' : 'Kopieren'}</span>
                    </button>
                    <button
                      onClick={handleClearAll}
                      className="p-1 hover:bg-rose-100 text-rose-600 rounded transition-all"
                      title="Alle löschen"
                    >
                      <Trash2 size={11} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-stone-200 rounded text-stone-400 hover:text-stone-700"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Suchen & Filtrieren Controls */}
            <div className="px-4 py-2 border-b border-stone-100 bg-white space-y-2">
              {/* Search input to quickly search notes */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Notizen durchsuchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-[0.75rem] leading-tight font-semibold focus:outline-none focus:bg-white focus:border-stone-300 transition-all text-stone-800 placeholder-stone-400"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="absolute right-2.5 top-2.5 h-4 w-4 flex items-center justify-center rounded-full bg-stone-200 text-stone-500 hover:bg-stone-300 text-[0.5625rem]"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Category Filter Pills Grid */}
              <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
                {CATEGORIES.map(cat => {
                  const isActive = selectedFilter === cat.id;
                  const count = getUncompletedCount(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedFilter(cat.id)}
                      className={`px-2 py-1 rounded-lg text-[0.625rem] font-bold transition-all flex items-center gap-1 shrink-0 border border-transparent ${
                        isActive
                          ? 'bg-stone-900 border-stone-950 text-white shadow-xs scale-[1.02]'
                          : 'bg-stone-50 text-stone-600 hover:bg-stone-100 hover:text-stone-900 border-stone-200'
                      }`}
                    >
                      <span>{cat.emoji}</span>
                      <span>{cat.label}</span>
                      {count > 0 && (
                        <span className={`text-[0.5rem] px-1 rounded-md font-black ${isActive ? 'bg-amber-400 text-black' : 'bg-stone-200 text-stone-700'}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sticky Notepad Canvas */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/50 custom-scrollbar">
              {filteredNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center h-full py-10 text-stone-400 space-y-2">
                  <span className="text-[1.875rem] leading-tight">📭</span>
                  <p className="text-[0.625rem] font-bold uppercase tracking-widest text-stone-400">Keine passende Notiz</p>
                  <p className="text-[0.625rem] text-stone-400 max-w-[200px]">Passe den Filter oder deine Suche an oder füge unten einen neuen Denkzettel hinzu.</p>
                </div>
              ) : (
                filteredNotes.map((note) => {
                  const scheme = colorSchemes[note.color] || colorSchemes.yellow;
                  const cat = CATEGORIES.find(c => c.id === (note.category || 'allgemein'));
                  return (
                    <motion.div
                      layout
                      key={note.id}
                      onClick={() => handleToggleComplete(note.id)}
                      className={`p-3.5 rounded-xl border ${scheme.bg} transition-all duration-200 shadow-xs group cursor-pointer relative hover:-translate-y-0.5`}
                    >
                      <p className={`text-[0.75rem] leading-tight font-bold leading-relaxed pr-12 ${
                        note.completed ? 'line-through opacity-50 text-stone-400' : ''
                      }`}>
                        {note.text}
                      </p>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setChannelingNoteId(channelingNoteId === note.id ? null : note.id);
                          setAssignStudentId('');
                          setSuccessMsg('');
                        }}
                        className={`absolute top-2.5 right-8 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${scheme.button}`}
                        title="Vom Gedanken zur Aufgabe (Kanalisieren)"
                      >
                        <Zap size={11} className="text-amber-500 animate-pulse" />
                      </button>

                      <button
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        className={`absolute top-2.5 right-2.5 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${scheme.button}`}
                      >
                        <Trash2 size={11} />
                      </button>
                      
                      {channelingNoteId === note.id && (
                        <div className="mt-3 p-3 bg-white/95 border border-stone-200 rounded-lg space-y-2.5 shadow-md text-stone-850" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-between items-center pb-1.5 border-b border-stone-100 text-[0.625rem] font-black text-stone-500 uppercase tracking-wider">
                             <span>Kanalisieren ⚡</span>
                             <button onClick={() => setChannelingNoteId(null)} className="text-stone-400 hover:text-stone-600 text-[0.75rem] leading-tight font-black">×</button>
                          </div>
                          
                          {successMsg ? (
                            <p className="text-[0.6875rem] font-bold text-emerald-600 text-center py-2 flex items-center justify-center gap-1.5 animate-bounce">
                              <Check size={12} /> {successMsg}
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {/* Option 1: Convert to Dashboard To-Do */}
                              <button
                                onClick={() => {
                                  setApp((prev: any) => {
                                    const currentTodos = prev.dashboardTodos || [];
                                    const updatedTodos = [...currentTodos, { id: Date.now().toString(), text: note.text, done: false }];
                                    return { ...prev, dashboardTodos: updatedTodos };
                                  });
                                  
                                  setSuccessMsg('Als To-Do ans Dashboard gesendet!');
                                  setTimeout(() => {
                                    setChannelingNoteId(null);
                                    saveNotes(notes.map(n => n.id === note.id ? { ...n, completed: true } : n));
                                  }, 1500);
                                }}
                                className="w-full py-1.5 px-2 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-lg text-[0.6875rem] font-black tracking-normal text-indigo-900 flex items-center gap-2 transition-all cursor-pointer"
                              >
                                📋 Als To-Do ans Dashboard senden
                              </button>

                              {/* Option 2: Zuweisen to a student */}
                              <div className="space-y-1">
                                <span className="text-[0.5625rem] font-black uppercase text-stone-400 ml-0.5">Schüler zuweisen & als Beobachtung speichern:</span>
                                <div className="flex gap-1.5">
                                  <select
                                    value={assignStudentId}
                                    onChange={(e) => setAssignStudentId(e.target.value)}
                                    className="flex-1 text-[0.6875rem] font-bold p-1 border border-stone-200 bg-stone-50 rounded-md focus:outline-none focus:border-stone-300"
                                  >
                                    <option value="">-- Schüler wählen --</option>
                                    {(app.schueler || []).map((s: any) => (
                                      <option key={s.id} value={s.id}>{s.vorname} {s.nachname}</option>
                                    ))}
                                  </select>
                                  <button
                                    disabled={!assignStudentId}
                                    onClick={() => {
                                      if (!assignStudentId) return;
                                      
                                      // 1. Create student observation entry
                                      const newEntry = {
                                        id: Math.random().toString(36).substr(2, 9),
                                        schuelerId: assignStudentId,
                                        datum: new Date().toISOString(),
                                        inhalt: note.text.trim(),
                                        kategorie: 'Journal',
                                        quelle: 'Denkzettel'
                                      };
                                      
                                      setApp((prev: any) => {
                                        const newNotes = [newEntry, ...(prev.notes || [])];
                                        const newJournal = [newEntry, ...(prev.journal || [])];
                                        return { ...prev, notes: newNotes, journal: newJournal };
                                      });

                                      // 2. Attach student id to Denkzettel matching
                                      const updatedNotes = notes.map(n => n.id === note.id ? { ...n, schuelerId: assignStudentId, completed: true } : n);
                                      saveNotes(updatedNotes);

                                      setSuccessMsg('Als Beobachtungsnotiz gespeichert!');
                                      setTimeout(() => {
                                        setChannelingNoteId(null);
                                      }, 1500);
                                    }}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-[0.6875rem] font-black rounded-md transition-all cursor-pointer"
                                  >
                                    Speichern
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="mt-2.5 flex justify-between items-center text-[0.5625rem] font-bold text-stone-500">
                        <span className={`px-1.5 py-0.5 rounded-md flex items-center gap-1 border border-stone-200 font-extrabold shadow-2xs ${cat ? cat.color : ''}`}>
                          <span>{cat?.emoji}</span>
                          <span>{cat?.label || 'Allgemein'}</span>
                        </span>
                        <span className="font-extrabold text-[0.5rem] tracking-wider">
                          {note.completed ? '✅ Erledigt' : '📌 Geöffnet'}
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Input Footer Area */}
            <form onSubmit={handleAddNote} className="p-3.5 border-t border-stone-100 bg-white space-y-3">
              
              {/* Category Chooser (Tacitle horizontal grid) */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[0.5625rem] font-extrabold text-stone-400 uppercase tracking-wider">
                  <span>Kategorie wählen:</span>
                  <span className="text-[0.5rem] text-stone-500 font-bold bg-stone-100 rounded-md px-1">
                    Aktuell: {CATEGORIES.find(c => c.id === activeCategory)?.label || 'Allgemein'}
                  </span>
                </div>
                <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5">
                  {CATEGORIES.filter(c => c.id !== 'all').map((cat) => {
                    const isSelected = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategory(cat.id as any)}
                        className={`px-2 py-1 rounded-lg border text-[0.5625rem] font-black tracking-tight cursor-pointer transition-all shrink-0 ${
                          isSelected 
                            ? 'bg-amber-400 border-amber-500 text-stone-900 shadow-xs scale-102 font-extrabold' 
                            : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        <span className="mr-0.5">{cat.emoji}</span>
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Chooser */}
              <div className="flex items-center justify-between">
                <span className="text-[0.5625rem] font-black text-stone-400 uppercase tracking-widest">Zettelfarbe:</span>
                <div className="flex gap-1.5">
                  {(Object.keys(colorSchemes) as Array<keyof typeof colorSchemes>).map((c) => {
                    const scheme = colorSchemes[c];
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setActiveColor(c)}
                        className={`h-5 w-5 rounded-full ${scheme.pill} border transition-all cursor-pointer ${
                          activeColor === c ? 'ring-2 ring-stone-900 ring-offset-1 border-white scale-110 shadow-sm' : 'border-stone-200 hover:scale-105'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Input Control */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Notiz eingeben..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className={`flex-1 text-[0.75rem] leading-tight px-3.5 py-2.5 rounded-xl border bg-stone-50 placeholder-stone-400 font-bold focus:outline-none focus:bg-white transition-all ${
                    colorSchemes[activeColor].input
                  }`}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="px-4.5 bg-stone-950 hover:bg-stone-800 text-white rounded-xl flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                >
                  <Plus size={18} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
