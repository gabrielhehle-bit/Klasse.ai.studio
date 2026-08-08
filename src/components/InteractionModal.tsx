import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageSquare, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { logActivity } from '../lib/utils';
import { InteraktionsEintrag } from '../types';

interface InteractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetStudentId?: string | null;
}

export const InteractionModal: React.FC<InteractionModalProps> = ({ isOpen, onClose, presetStudentId }) => {
  const { app, setApp } = useApp();
  const [schuelerId, setSchuelerId] = useState<string>(presetStudentId || '');
  const [typ, setTyp] = useState<InteraktionsEintrag['typ']>('gespraech');
  const [kontext, setKontext] = useState('');
  const [war1zu1, setWar1zu1] = useState(false);
  const [dauer, setDauer] = useState<number>(5);
  const [notiz, setNotiz] = useState('');

  // Update preset student id when it changes
  useEffect(() => {
    if (presetStudentId) setSchuelerId(presetStudentId);
  }, [presetStudentId]);

  // Power-User Shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // "Leertaste" für nächsten Schüler (nur wenn kein Input fokussiert ist)
      if (e.key === ' ' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault(); // Verhindere Scrollen
        if (app.schueler.length > 0) {
          const currentIndex = app.schueler.findIndex(s => s.id === schuelerId);
          const nextIndex = (currentIndex + 1) % app.schueler.length;
          setSchuelerId(app.schueler[nextIndex].id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, schuelerId, app.schueler, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!schuelerId) return;

    const student = app.schueler.find(s => s.id === schuelerId);
    if (!student) return;

    const now = new Date().toISOString();
    const newInteraction: InteraktionsEintrag = {
      id: `int_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      schuelerId,
      datum: now,
      typ,
      kontext,
      dauer,
      notiz,
      war1zu1
    };

    setApp(prev => {
      const log = prev.interaktionsLog || { eintraege: [], wochenEmpfehlung: null };
      return {
        ...prev,
        interaktionsLog: {
           ...log,
           eintraege: [...log.eintraege, newInteraction]
        }
      };
    });

    try {
       logActivity(setApp, `Interaktion erfasst: ${student.vorname}, ${typ}`, 'interaktion', newInteraction.id);
    } catch (e) {}

    onClose();
    
    // Reset form
    setTyp('gespraech');
    setKontext('');
    setWar1zu1(false);
    setDauer(5);
    setNotiz('');
  };

  const TYPES: {value: InteraktionsEintrag['typ'], label: string}[] = [
    { value: 'gespraech', label: 'Gespräch' },
    { value: 'feedback', label: 'Feedback' },
    { value: 'beobachtung', label: 'Beobachtung' },
    { value: 'konflikt', label: 'Konflikt' },
    { value: 'lob', label: 'Lob' },
    { value: 'foerderung', label: 'Förderung' }
  ];

  const KONTEXT_PRESETS = ['Unterricht', 'Pause', 'Nachmittagsbetreuung', 'Elterngespräch'];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-emerald-500 p-6 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                <MessageSquare size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-black text-xl leading-tight">Interaktion erfassen</h3>
                <p className="text-emerald-100 text-sm font-medium">Beziehungsprotokoll & 1:1 Kontakte</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors backdrop-blur-md">
              <X size={20} className="text-white" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Schüler/in</label>
              <select 
                value={schuelerId} 
                onChange={e => setSchuelerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 font-medium outline-none focus:border-emerald-500 focus:bg-white transition-all"
              >
                <option value="" disabled>Bitte wählen...</option>
                {[...app.schueler].sort((a,b) => a.vorname.localeCompare(b.vorname)).map(s => (
                  <option key={s.id} value={s.id}>{s.vorname} {s.nachname}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Interaktions-Typ</label>
              <div className="flex flex-wrap gap-2">
                {TYPES.map(t => (
                  <button 
                    key={t.value}
                    onClick={() => setTyp(t.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${typ === t.value ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
               <label className="flex items-center gap-3 cursor-pointer group">
                 <div className={`w-10 h-6 rounded-full transition-colors flex items-center shrink-0 ${war1zu1 ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${war1zu1 ? 'translate-x-4' : 'translate-x-0'}`} />
                 </div>
                 <div>
                    <span className="block text-[0.875rem] font-black text-slate-800">1:1-Interaktion (nur wir zwei)</span>
                    <span className="block text-[0.75rem] text-slate-500 font-medium">Aktiviere, wenn keine anderen Kinder anwesend waren</span>
                 </div>
               </label>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Kontext <span className="text-slate-400 font-normal">(optional)</span></label>
              <div className="flex flex-wrap gap-2 mb-2">
                 {KONTEXT_PRESETS.map(kp => (
                   <button 
                      key={kp}
                      onClick={() => setKontext(kp)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs font-semibold transition-colors"
                   >
                     {kp}
                   </button>
                 ))}
              </div>
              <input 
                 type="text" 
                 value={kontext}
                 onChange={e => setKontext(e.target.value)}
                 placeholder="Eigener Kontext..."
                 className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2 font-medium outline-none focus:border-emerald-500 focus:bg-white transition-all text-sm"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                 <label className="block text-sm font-bold text-slate-700">Dauer (Minuten)</label>
                 <span className="text-emerald-600 font-black">{dauer} Min</span>
              </div>
              <input 
                type="range" 
                min="1" max="30" 
                value={dauer} 
                onChange={e => setDauer(parseInt(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Notiz <span className="text-slate-400 font-normal">(optional)</span></label>
              <textarea 
                 value={notiz}
                 onChange={e => setNotiz(e.target.value)}
                 className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 font-medium outline-none focus:border-emerald-500 focus:bg-white transition-all resize-none h-24"
                 placeholder="Besondere Auffälligkeiten oder Vereinbarungen..."
              />
            </div>
            
          </div>
          
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-3 shrink-0">
             <button disabled={!schuelerId} onClick={handleSave} className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black uppercase tracking-wider py-4 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95">
                Speichern
             </button>
             <div className="flex justify-center items-center gap-4 text-[0.6875rem] font-bold text-slate-400">
               <span className="flex items-center gap-1"><kbd className="bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">Space</kbd> Nächster Schüler</span>
               <span className="flex items-center gap-1"><kbd className="bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">Esc</kbd> Schließen</span>
             </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
