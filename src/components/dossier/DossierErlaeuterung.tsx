
import React, { useState, useEffect } from 'react';
import { Student } from '../../types';
import { useApp } from '../../context/AppContext';
import { FileText, Save, Info, MessageSquare } from 'lucide-react';

interface DossierErlaeuterungProps {
  student: Student;
}

export default function DossierErlaeuterung({ student }: DossierErlaeuterungProps) {
  const { setApp } = useApp();
  const [text, setText] = useState(() => {
    const saved = localStorage.getItem(`oberau_remarks_${student.id}`);
    if (saved !== null) return saved;
    return student.foerderprofil?.zusatzinfo || '';
  });
  const [isSaved, setIsSaved] = useState(false);

  // Synchronize component state with student changes
  useEffect(() => {
    const saved = localStorage.getItem(`oberau_remarks_${student.id}`);
    if (saved !== null) {
      setText(saved);
    } else {
      setText(student.foerderprofil?.zusatzinfo || '');
    }
  }, [student.id, student.foerderprofil?.zusatzinfo]);

  const handleSave = () => {
    // Save to App State (so that PDF exports, backups and JSON use the updated text)
    setApp(prev => ({
      ...prev,
      schueler: prev.schueler.map(s => s.id === student.id ? {
        ...s,
        foerderprofil: { ...s.foerderprofil, zusatzinfo: text }
      } : s)
    }));
    
    // Save to the Oberau Skala Key in LocalStorage so the Matrix uses this explanation
    localStorage.setItem(`oberau_remarks_${student.id}`, text);

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-8 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-7 bg-indigo-500 rounded-full" />
          <h3 className="text-[1.5rem] leading-normal font-black text-slate-900 tracking-tight">Erläuterung</h3>
        </div>
        <button 
          onClick={handleSave}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[0.625rem] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 cursor-pointer ${
            isSaved ? 'bg-emerald-500 text-white shadow-emerald-500/20 shadow-sm' : 'bg-slate-950 text-white hover:bg-slate-800'
          }`}
        >
          {isSaved ? 'Gespeichert!' : 'Speichern'}
          {!isSaved && <Save size={13} />}
        </button>
      </div>

      <div className="flex-1 flex flex-col space-y-6">
        <div className="flex gap-4 p-5 bg-indigo-50/40 border border-indigo-100/60 rounded-2xl shadow-3xs">
           <MessageSquare size={18} className="text-indigo-500 shrink-0 mt-0.5" />
           <p className="text-[0.8125rem] text-indigo-950/80 leading-relaxed font-semibold">
             Dieser Bereich steuert die <strong className="text-indigo-900 font-extrabold">Erläuterungen und Bemerkungen der Oberau-Bewertungsmatrix</strong> in Ihren Statistiken. Der hier eingegebene Text wird automatisch synchronisiert und im Portfolio-Dossier anstelle des Standardblocks angezeigt.
           </p>
        </div>

        <div className="flex-1 min-h-[300px] relative">
          <textarea 
            className="w-full h-full p-8 bg-slate-50 border border-slate-200/90 rounded-[2rem] shadow-inner focus:bg-white focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20 outline-none transition-all text-[0.875rem] leading-snug lg:text-[0.90625rem] font-medium leading-relaxed resize-none"
            placeholder="Schreibe hier zusätzliche Erläuterungen, Bemerkungen oder pädagogische Notizen zur Oberau-Skala..."
            value={text}
            onChange={e => setText(e.target.value)}
          />
        </div>

        <div className="p-5 bg-amber-50/80 border border-amber-100/90 rounded-2xl flex items-center gap-3 shadow-3xs">
           <Info size={16} className="text-amber-500 shrink-0" />
           <p className="text-[0.75rem] font-black text-amber-800 leading-relaxed uppercase tracking-wider">
             Diese Bemerkungen stehen im Portfolio-Dossier und bilden eine wertvolle Gesprächsgrundlage für KEL-Gespräche.
           </p>
        </div>
      </div>
    </div>
  );
}
