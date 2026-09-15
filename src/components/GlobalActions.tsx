
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { StickyNote, X, User, Save, MessageSquare } from 'lucide-react';
import { Button, IconButton, Select, Textarea } from './ui';

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
  }, [setPage]);

  const handleSaveNote = () => {
    if (!noteContent.trim()) return;
    
    setApp(prev => ({
      ...prev,
      notizen: [
        ...(prev.notizen || []),
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
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setShowQuickNote(false)}
        >
          <motion.div 
            initial={{ scale: 0.95, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 16 }}
            transition={{ duration: 0.15 }}
            className="bg-[var(--surface-card,var(--surface))] rounded-2xl shadow-2xl w-full max-w-lg border border-[var(--border-default,var(--border))] overflow-hidden text-[var(--text-primary,var(--text))]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 sm:p-6 bg-[var(--surface-subtle,var(--surface2))] border-b border-[var(--border-subtle,var(--border))] text-[var(--text-primary,var(--text))] relative flex items-center justify-between">
               <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 bg-[var(--accent-soft)] text-[var(--accent)] rounded-xl flex items-center justify-center border border-[var(--accent)]/20">
                     <StickyNote size={22} />
                  </div>
                  <div>
                     <h3 className="text-[1.125rem] leading-normal font-black tracking-tight">Schnellnotiz</h3>
                     <p className="text-[0.625rem] font-bold tracking-wide text-[var(--text-muted,var(--text3))]">Spontane Beobachtung festhalten</p>
                  </div>
               </div>
               <IconButton
                 variant="ghost"
                 size="sm"
                 aria-label="Schließen"
                 onClick={() => setShowQuickNote(false)}
               >
                 <X size={20} />
               </IconButton>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-1.5">
                 <label htmlFor="quicknote-student-select" className="text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--text-muted)] px-0.5 flex items-center gap-1.5">
                    <User size={13} />
                    Schüler:in zuordnen (Optional)
                 </label>
                 <Select
                   id="quicknote-student-select"
                   value={selectedStudentId}
                   onChange={e => setSelectedStudentId(e.target.value)}
                 >
                   <option value="">Keine Zuordnung</option>
                   {(app.schueler || []).map(s => (
                     <option key={s.id} value={s.id}>{s.vorname} {s.nachname}</option>
                   ))}
                 </Select>
              </div>

              <div className="space-y-1.5">
                 <label htmlFor="quicknote-content-input" className="text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--text-muted)] px-0.5 flex items-center gap-1.5">
                    <MessageSquare size={13} />
                    Inhalt
                 </label>
                 <Textarea
                   id="quicknote-content-input"
                   autoFocus
                   rows={4}
                   placeholder="Was ist passiert?"
                   value={noteContent}
                   onChange={e => setNoteContent(e.target.value)}
                 />
              </div>

              <div className="flex gap-3 pt-2">
                 <Button
                   variant="secondary"
                   className="flex-1"
                   onClick={() => setShowQuickNote(false)}
                 >
                    Abbrechen
                 </Button>
                 <Button
                   variant="primary"
                   className="flex-2"
                   leftIcon={<Save size={16} />}
                   onClick={handleSaveNote}
                   disabled={!noteContent.trim()}
                 >
                    Notiz speichern
                 </Button>
              </div>
            </div>

            <div className="bg-[var(--surface-subtle,var(--surface2))] p-3 border-t border-[var(--border-default,var(--border))] flex items-center justify-center gap-6">
                <div className="flex items-center gap-2 text-[0.625rem] font-bold uppercase text-[var(--text-muted)] tracking-widest">
                   <div className="px-2 py-0.5 bg-[var(--surface-card,var(--surface))] border border-[var(--border-default,var(--border))] rounded-md shadow-xs text-[var(--text-secondary)]">ALT</div>
                   <span>+</span>
                   <div className="px-2 py-0.5 bg-[var(--surface-card,var(--surface))] border border-[var(--border-default,var(--border))] rounded-md shadow-xs text-[var(--text-secondary)]">N</div>
                   <span className="ml-2 opacity-70">Shortcut</span>
                </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
