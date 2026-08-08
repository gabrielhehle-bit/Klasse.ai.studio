
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { StickyNote, X, User, Save, Sparkles, MessageSquare } from 'lucide-react';

export default function GlobalActions() {
  const { app, setApp, setPage } = useApp();
  const [showQuickNote, setShowQuickNote] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + N for New Note
      if (e.altKey && e.key === 'n') {
        e.preventDefault();
        setShowQuickNote(true);
      }
      // Alt + D for Dashboard
      if (e.altKey && e.key === 'd') {
        e.preventDefault();
        setPage('dashboard');
      }
      // Alt + C for Cockpit
      if (e.altKey && e.key === 'c') {
        e.preventDefault();
        setPage('cockpit');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSaveNote = () => {
    if (!noteContent.trim()) return;
    
    setApp(prev => ({
      ...prev,
      notizen: [
        ...prev.notizen,
        {
          id: Date.now().toString(),
          titel: 'Schnellnotiz',
          schuelerId: selectedStudentId || undefined,
          inhalt: noteContent,
          icon: '⚡',
          timestamp: Date.now()
        }
      ]
    }));
    
    setNoteContent('');
    setShowQuickNote(false);
  };

  return (
    <AnimatePresence>
      {showQuickNote && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          onClick={() => setShowQuickNote(false)}
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-[2.5rem] shadow-3xl w-full max-w-lg  border border-slate-100"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-8 bg-emerald-500 text-white relative">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                     <StickyNote size={24} />
                  </div>
                  <div>
                     <h3 className="text-[1.25rem] leading-normal font-black tracking-tight">Schnellnotiz</h3>
                     <p className="text-[0.625rem] font-black uppercase tracking-widest text-white/60">Spontane Beobachtung festhalten</p>
                  </div>
               </div>
               <button 
                 onClick={() => setShowQuickNote(false)}
                 className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors"
               >
                 <X size={24} />
               </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-2">
                 <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 px-1 flex items-center gap-2">
                    <User size={12} />
                    Schüler:in zuordnen (Optional)
                 </label>
                 <select 
                   className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-[0.875rem] font-bold outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer"
                   value={selectedStudentId}
                   onChange={e => setSelectedStudentId(e.target.value)}
                 >
                   <option value="">Keine Zuordnung</option>
                   {app.schueler.map(s => (
                     <option key={s.id} value={s.id}>{s.vorname} {s.nachname}</option>
                   ))}
                 </select>
              </div>

              <div className="space-y-2">
                 <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 px-1 flex items-center gap-2">
                    <MessageSquare size={12} />
                    Inhalt
                 </label>
                 <textarea 
                   autoFocus
                   placeholder="Was ist passiert?"
                   className="w-full h-40 bg-slate-50 border border-slate-100 rounded-[2rem] p-6 text-[0.9375rem] font-medium outline-none focus:border-emerald-500 focus:bg-white transition-all resize-none placeholder:text-slate-300"
                   value={noteContent}
                   onChange={e => setNoteContent(e.target.value)}
                 />
              </div>

              <div className="flex gap-4 pt-2">
                 <button 
                   onClick={() => setShowQuickNote(false)}
                   className="flex-1 h-14 bg-slate-50 text-slate-400 font-black uppercase tracking-widest text-[0.6875rem] rounded-2xl hover:bg-slate-100 transition-all"
                 >
                    Abbrechen
                 </button>
                 <button 
                   onClick={handleSaveNote}
                   disabled={!noteContent.trim()}
                   className="flex-3 h-14 bg-emerald-500 text-white font-black uppercase tracking-widest text-[0.6875rem] rounded-2xl shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                 >
                    <Save size={18} />
                    <span>Notiz speichern</span>
                 </button>
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-center gap-6">
                <div className="flex items-center gap-2 text-[0.5625rem] font-black uppercase text-slate-300 tracking-widest">
                   <div className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">ALT</div>
                   <span>+</span>
                   <div className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">N</div>
                   <span className="ml-2 opacity-60">Shortcut</span>
                </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
