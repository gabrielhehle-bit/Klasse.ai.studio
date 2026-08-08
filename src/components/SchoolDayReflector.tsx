import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BookOpen, Calendar, HelpCircle, Save, Check, History, Sparkles, Smile, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface JournalEntry {
  id: string;
  datum: string;
  schoensterMoment: string;
  huerdeGemeistert: string;
  dankbarkeit: string;
}

export default function SchoolDayReflector() {
  const { app, setApp } = useApp();
  
  // States for the 3 questions
  const [schoensterMoment, setSchoensterMoment] = useState('');
  const [huerdeGemeistert, setHuerdeGemeistert] = useState('');
  const [dankbarkeit, setDankbarkeit] = useState('');
  const [savedStatus, setSavedStatus] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Get reflection log from global lehrerProfil (or default empty)
  const reflections: JournalEntry[] = app.lehrerProfil?.reflections || [];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoensterMoment.trim() || !huerdeGemeistert.trim() || !dankbarkeit.trim()) return;

    const newEntry: JournalEntry = {
      id: crypto.randomUUID(),
      datum: new Date().toISOString(),
      schoensterMoment: schoensterMoment.trim(),
      huerdeGemeistert: huerdeGemeistert.trim(),
      dankbarkeit: dankbarkeit.trim()
    };

    setApp((prev) => ({
      ...prev,
      lehrerProfil: {
        ...(prev.lehrerProfil || {}),
        reflections: [newEntry, ...(prev.lehrerProfil?.reflections || [])]
      }
    }));

    // Reset fields & show status
    setSchoensterMoment('');
    setHuerdeGemeistert('');
    setDankbarkeit('');
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 3000);
  };

  const handleDeleteEntry = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Möchtest du diesen Journal-Eintrag wirklich löschen?")) return;
    setApp((prev) => ({
      ...prev,
      lehrerProfil: {
        ...(prev.lehrerProfil || {}),
        reflections: (prev.lehrerProfil?.reflections || []).filter((r: JournalEntry) => r.id !== id)
      }
    }));
  };

  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between h-full font-sans">
      
      {/* Header with state toggle */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-505">
            <BookOpen size={20} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-[1rem] leading-normal font-black text-slate-800">Schultags-Reflektor</h3>
            <p className="text-[0.5625rem] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">3-Satz-Journal für positive Momente</p>
          </div>
        </div>

        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[0.625rem] font-black uppercase tracking-wider border cursor-pointer transition-all ${
            showHistory 
              ? 'bg-indigo-600 text-white border-indigo-600' 
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
        >
          {showHistory ? <Smile size={12} /> : <History size={12} />}
          {showHistory ? 'Journal Schreiben' : `Historie (${reflections.length})`}
        </button>
      </div>

      {showHistory ? (
        /* HISTORY ARCHIVE STEP */
        <div className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1 custom-scrollbar min-h-[300px] max-h-[400px]">
          {reflections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-2">
              <span className="text-[1.875rem] leading-tight">📝</span>
              <p className="text-slate-400 font-bold text-[0.75rem] leading-tight uppercase tracking-wider">Noch keine Einträge vorhanden</p>
              <p className="text-[0.75rem] leading-tight text-slate-500 max-w-[200px]">
                Nimm dir am Ende des Unterrichts 1 Minute Zeit, um deinen Tag zu reflektieren.
              </p>
            </div>
          ) : (
            reflections.map((entry) => (
              <div 
                key={entry.id} 
                className="p-5 rounded-2xl bg-indigo-50/20 border border-indigo-100/50 space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 text-[0.625rem] font-bold px-2 py-0.5 rounded-full">
                    <Calendar size={10} />
                    {format(new Date(entry.datum), "EEEE, d. MMMM yyyy", { locale: de })}
                  </span>
                  
                  <button 
                    onClick={(e) => handleDeleteEntry(entry.id, e)}
                    className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center transition-all cursor-pointer"
                    title="Eintrag löschen"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3.5 pt-1.5">
                  <div className="space-y-0.5">
                    <p className="text-[0.5625rem] font-black uppercase text-indigo-500 tracking-wider">🌟 Schönster Moment mit einem Kind</p>
                    <p className="text-[0.75rem] leading-tight font-semibold text-slate-700 leading-relaxed italic">"{entry.schoensterMoment}"</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[0.5625rem] font-black uppercase text-amber-600 tracking-wider">🧗 Meisterhafte Hürde</p>
                    <p className="text-[0.75rem] leading-tight font-semibold text-slate-700 leading-relaxed italic">"{entry.huerdeGemeistert}"</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[0.5625rem] font-black uppercase text-emerald-600 tracking-wider">🙏 Dankbarkeit des Tages</p>
                    <p className="text-[0.75rem] leading-tight font-semibold text-slate-700 leading-relaxed italic">"{entry.dankbarkeit}"</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* JOURNAL FORM STEP */
        <form onSubmit={handleSave} className="flex-1 flex flex-col justify-between mt-4 gap-4">
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-[0.625rem] font-black uppercase tracking-wider text-slate-500 block">
                🌟 Was war heute der schönste Moment mit einem Kind?
              </label>
              <input
                type="text"
                value={schoensterMoment}
                onChange={(e) => setSchoensterMoment(e.target.value)}
                placeholder="Name eingeben oder Situation beschreiben..."
                className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 rounded-xl px-4 py-3 text-[0.75rem] leading-tight font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-400"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[0.625rem] font-black uppercase tracking-wider text-slate-500 block">
                🏔️ Welche scheinbare Hürde habe ich heute gemeistert oder gelernt zu akzeptieren?
              </label>
              <input
                type="text"
                value={huerdeGemeistert}
                onChange={(e) => setHuerdeGemeistert(e.target.value)}
                placeholder="Z.B.: Eine unruhige Klasse beruhigt, ein Elterngespräch gemeistert..."
                className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 rounded-xl px-4 py-3 text-[0.75rem] leading-tight font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-400"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[0.625rem] font-black uppercase tracking-wider text-slate-500 block">
                💖 Wofür oder wem bin ich heute am meisten dankbar?
              </label>
              <input
                type="text"
                value={dankbarkeit}
                onChange={(e) => setDankbarkeit(e.target.value)}
                placeholder="Für das leckere Mittagessen, den netten Kollegen-Plausch..."
                className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 rounded-xl px-4 py-3 text-[0.75rem] leading-tight font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-400"
                required
              />
            </div>
          </div>

          {/* Feedbacks / Actions */}
          <div className="flex items-center justify-between shrink-0 pt-2 border-t border-slate-100">
            <div className="text-slate-400 text-[0.625rem] uppercase font-bold flex items-center gap-1">
              <Sparkles size={11} className="text-indigo-500" />
              <span>Gute Gedanken tun gut</span>
            </div>

            <button
              type="submit"
              className={`px-5 py-3.5 rounded-xl font-black text-[0.75rem] leading-tight uppercase tracking-widest transition-all cursor-pointer shadow-md flex items-center gap-1.5 ${
                savedStatus
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/10'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/10 active:scale-95'
              }`}
            >
              {savedStatus ? <Check size={14} /> : <Save size={14} />}
              {savedStatus ? 'Gespeichert! ✔' : 'Eintragen'}
            </button>
          </div>
        </form>
      )}

    </div>
  );
}
