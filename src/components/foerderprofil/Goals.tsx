
import React from 'react';
import { Target, Plus, Sparkles, Clock, Save, Trash2 } from 'lucide-react';
import { Foerderprofil } from '../../types';

interface GoalsProps {
  profil: Partial<Foerderprofil>;
  updateGoal: (id: string, changes: any) => void;
  deleteGoal: (id: string) => void;
  addGoal: () => void;
  showAiInput: string | null;
  setShowAiInput: (id: string | null) => void;
  aiKeywords: string;
  setAiKeywords: (val: string) => void;
  handleAiFormulate: (goalId: string) => void;
  isAiLoading: boolean;
  bereiche: string[];
}

const STATUSSE = ["offen", "in Arbeit", "erreicht", "verworfen"] as const;

export default function Goals({ 
  profil, updateGoal, deleteGoal, addGoal, showAiInput, setShowAiInput, 
  aiKeywords, setAiKeywords, handleAiFormulate, isAiLoading, bereiche 
}: GoalsProps) {
  return (
    <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center">
            <Target size={24} />
          </div>
          <div>
            <h3 className="text-[1.5rem] leading-normal font-black text-slate-900">Förderziele</h3>
            <p className="text-[0.6875rem] font-black text-slate-400 uppercase tracking-widest">Was soll bis wann erreicht werden?</p>
          </div>
        </div>
        <button 
          onClick={addGoal}
          className="px-6 py-3 bg-emerald-500 text-white rounded-2xl text-[0.6875rem] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
        >
          <Plus size={18} /> Ziel hinzufügen
        </button>
      </div>

      <div className="space-y-4">
        {(profil.foerderziele || []).map(goal => (
          <div key={goal.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4 group">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6 space-y-1.5 px-1 relative">
                <div className="flex items-center justify-between">
                  <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Förderziel</label>
                  <button 
                     onClick={() => {
                       setShowAiInput(goal.id);
                       setAiKeywords('');
                     }}
                     className="text-[0.5625rem] font-black uppercase text-emerald-600 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Sparkles size={10} /> Mit KI formulieren
                  </button>
                </div>
                {showAiInput === goal.id ? (
                  <div className="relative mt-1">
                    <input 
                      autoFocus
                      className="w-full pl-4 pr-12 py-3 bg-white border-2 border-emerald-500 rounded-xl text-[0.875rem] leading-snug font-bold shadow-xl shadow-emerald-500/10 outline-none"
                      placeholder="Stichworte eingeben (z.B. Lesefluss verbessern)..."
                      value={aiKeywords}
                      onChange={(e) => setAiKeywords(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAiFormulate(goal.id);
                      }}
                    />
                    <button 
                       onClick={() => handleAiFormulate(goal.id)}
                       className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                    >
                      {isAiLoading ? <Clock size={16} className="animate-spin" /> : <Save size={16} />}
                    </button>
                  </div>
                ) : (
                  <input 
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[0.875rem] leading-snug font-bold outline-none focus:border-emerald-300"
                    value={goal.ziel}
                    onChange={(e) => updateGoal(goal.id, { ziel: e.target.value })}
                    placeholder="Zielbeschreibung..."
                  />
                )}
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 px-1">Bereich</label>
                <select 
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[0.875rem] leading-snug font-bold outline-none"
                  value={goal.bereich}
                  onChange={(e) => updateGoal(goal.id, { bereich: e.target.value })}
                >
                  {bereiche.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 px-1">Zeitraum</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="date"
                    className="w-full bg-white border border-slate-200 rounded-xl px-1 py-3 text-[0.625rem] font-bold outline-none"
                    value={goal.startDatum}
                    onChange={(e) => updateGoal(goal.id, { startDatum: e.target.value })}
                  />
                  <span className="text-slate-300">-</span>
                  <input 
                    type="date"
                    className="w-full bg-white border border-slate-200 rounded-xl px-1 py-3 text-[0.625rem] font-bold outline-none"
                    value={goal.zielDatum}
                    onChange={(e) => updateGoal(goal.id, { zielDatum: e.target.value })}
                  />
                </div>
              </div>
              <div className="md:col-span-2 flex items-end justify-end gap-2">
                <div className="flex-1 space-y-1.5">
                    <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 px-1">Status</label>
                    <select 
                      className={`w-full border-2 rounded-xl px-3 py-3 text-[0.625rem] font-black uppercase tracking-widest transition-all outline-none ${
                        goal.status === 'erreicht' ? 'bg-emerald-500 border-emerald-500 text-white' :
                        goal.status === 'in Arbeit' ? 'bg-amber-500 border-amber-500 text-white' :
                        goal.status === 'verworfen' ? 'bg-slate-400 border-slate-400 text-white' :
                        'bg-white border-slate-200 text-slate-400'
                      }`}
                      value={goal.status}
                      onChange={(e) => updateGoal(goal.id, { status: e.target.value as any })}
                    >
                      {STATUSSE.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <button 
                  onClick={() => deleteGoal(goal.id)}
                  className="p-3 text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <textarea 
               className="w-full bg-white/50 border border-slate-100 rounded-xl px-4 py-3 text-[0.8125rem] font-medium resize-none h-20 placeholder:italic outline-none focus:border-emerald-200 focus:bg-white transition-all"
               placeholder="Notizen zum Fortschritt, Beobachtungen..."
               value={goal.notiz || ''}
               onChange={(e) => updateGoal(goal.id, { notiz: e.target.value })}
            />
          </div>
        ))}
        {(profil.foerderziele || []).length === 0 && (
          <div className="text-center py-10 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
             <Target size={32} className="mx-auto mb-2 opacity-20" />
             <p className="text-[0.625rem] font-black uppercase tracking-widest">Noch keine Förderziele definiert</p>
          </div>
        )}
      </div>
    </section>
  );
}
