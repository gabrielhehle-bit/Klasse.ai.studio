
import React from 'react';
import { Target, Plus, Search, Trash2, CheckSquare } from 'lucide-react';
import { Foerderprofil } from '../../types';

interface MeasuresProps {
  profil: Partial<Foerderprofil>;
  updateMeasure: (id: string, changes: any) => void;
  deleteMeasure: (id: string) => void;
  addMeasure: () => void;
}

const WIRKSAMKEITEN = ["hoch", "mittel", "gering", "unklar"] as const;

export default function Measures({ profil, updateMeasure, deleteMeasure, addMeasure }: MeasuresProps) {
  return (
    <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center">
            <CheckSquare size={24} />
          </div>
          <div>
            <h3 className="text-[1.5rem] leading-normal font-black text-slate-900">Maßnahmen</h3>
            <p className="text-[0.6875rem] font-black text-slate-400 uppercase tracking-widest">Pädagogische & therapeutische Maßnahmen</p>
          </div>
        </div>
        <button 
          onClick={addMeasure}
          className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[0.6875rem] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg cursor-pointer"
        >
          <Plus size={18} /> Maßnahme hinzufügen
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {(profil.massnahmen || []).map(measure => (
          <div key={measure.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-6 group relative">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Datum</label>
              <input 
                type="date"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[0.875rem] leading-snug font-bold outline-none"
                value={measure.datum}
                onChange={(e) => updateMeasure(measure.id, { datum: e.target.value })}
              />
            </div>
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Bezeichnung / Maßnahme</label>
              <input 
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[0.875rem] leading-snug font-bold outline-none focus:border-amber-300"
                value={measure.bezeichnung}
                placeholder="z.B. Logopädie, Lesetraining, Förderunterricht..."
                onChange={(e) => updateMeasure(measure.id, { bezeichnung: e.target.value })}
              />
            </div>
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Wirksamkeit</label>
              <select 
                className={`w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[0.875rem] leading-snug font-bold outline-none transition-colors ${
                  measure.wirksamkeit === 'hoch' ? 'text-emerald-600 bg-emerald-50' : 
                  measure.wirksamkeit === 'gering' ? 'text-rose-600 bg-rose-50' : 'text-slate-700'
                }`}
                value={measure.wirksamkeit}
                onChange={(e) => updateMeasure(measure.id, { wirksamkeit: e.target.value as any })}
              >
                {WIRKSAMKEITEN.map(w => <option key={w} value={w}>{w.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="md:col-span-2 flex items-end justify-end">
               <button 
                onClick={() => deleteMeasure(measure.id)}
                className="p-3 text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <div className="md:col-span-12">
               <textarea 
                  className="w-full bg-white/50 border border-slate-100 rounded-xl px-4 py-3 text-[0.8125rem] font-medium resize-none h-20 outline-none focus:border-amber-200 focus:bg-white transition-all"
                  placeholder="Zusätzliche Notizen zur Maßnahme..."
                  value={measure.notiz || ''}
                  onChange={(e) => updateMeasure(measure.id, { notiz: e.target.value })}
               />
            </div>
          </div>
        ))}
        {(profil.massnahmen || []).length === 0 && (
          <div className="text-center py-10 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
             <CheckSquare size={32} className="mx-auto mb-2 opacity-20" />
             <p className="text-[0.625rem] font-black uppercase tracking-widest">Noch keine Maßnahmen erfasst</p>
          </div>
        )}
      </div>
    </section>
  );
}
