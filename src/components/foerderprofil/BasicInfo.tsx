
import React from 'react';
import { Heart, Activity, AlertTriangle } from 'lucide-react';
import { Foerderprofil } from '../../types';

interface BasicInfoProps {
  profil: Partial<Foerderprofil>;
  updateProfil: (changes: Partial<Foerderprofil>) => void;
  hasDiagnostikAlert: boolean;
  bereiche: string[];
}

export default function BasicInfo({ profil, updateProfil, hasDiagnostikAlert, bereiche }: BasicInfoProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* STÄRKEN & BEDARF */}
      <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-6">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
            <Heart size={24} />
          </div>
          <div>
            <h3 className="text-[1.25rem] leading-normal font-black text-slate-900">Stärken & Ressourcen</h3>
            <p className="text-[0.6875rem] font-black text-slate-400 uppercase tracking-widest">Was kann das Kind besonders gut?</p>
          </div>
        </div>
        <textarea 
          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-[0.875rem] leading-snug font-medium focus:border-rose-300 focus:ring-4 focus:ring-rose-500/5 outline-none transition-all min-h-[120px] resize-none"
          placeholder="Interessen, soziale Stärken, kognitive Fähigkeiten..."
          value={profil.staerken?.join('\n') || ''}
          onChange={(e) => updateProfil({ staerken: e.target.value.split('\n') })}
        />

        <div className="flex items-center gap-4 mt-8 mb-2">
          <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center">
            <Activity size={24} />
          </div>
          <div>
            <h3 className="text-[1.25rem] leading-normal font-black text-slate-900">Förderbereiche</h3>
            <p className="text-[0.6875rem] font-black text-slate-400 uppercase tracking-widest">In welchen Bereichen gibt es Bedarf?</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {bereiche.map(b => (
            <button
              key={b}
              onClick={() => {
                const current = profil.foerderbedarfBereiche || [];
                updateProfil({ 
                  foerderbedarfBereiche: current.includes(b) ? current.filter(x => x !== b) : [...current, b]
                });
              }}
              className={`px-4 py-2 rounded-xl text-[0.625rem] font-black uppercase tracking-widest transition-all ${profil.foerderbedarfBereiche?.includes(b) ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-slate-50 text-slate-400 border border-slate-100 hover:border-slate-200'}`}
            >
              {b}
            </button>
          ))}
        </div>
        
        {hasDiagnostikAlert && (
          <div className="mt-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex gap-3">
             <AlertTriangle size={18} className="text-rose-500 shrink-0" />
             <p className="text-[0.625rem] font-bold text-rose-700 leading-relaxed uppercase tracking-wider">
               Die Diagnostik weist auf möglichen Förderbedarf hin – bitte prüfe die entsprechenden Bereiche & Stärken.
             </p>
          </div>
        )}
      </section>

      {/* ADDITIONAL INFO / DICTATION */}
      <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-6">
         <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center">
              <Activity size={24} />
            </div>
            <div>
              <h3 className="text-[1.25rem] leading-normal font-black text-slate-900">Sonstige Bemerkungen</h3>
              <p className="text-[0.6875rem] font-black text-slate-400 uppercase tracking-widest">Zusätzliche Informationen</p>
            </div>
          </div>
          <textarea 
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-[0.875rem] leading-snug font-medium focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all min-h-[220px] resize-none"
            placeholder="Weitere Beobachtungen zum Lern-, Arbeits- und Sozialverhalten..."
            value={profil.zusatzinfo || ''}
            onChange={(e) => updateProfil({ zusatzinfo: e.target.value })}
          />
      </section>
    </div>
  );
}
