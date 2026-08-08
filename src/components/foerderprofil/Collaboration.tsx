
import React from 'react';
import { Users } from 'lucide-react';
import { Foerderprofil } from '../../types';

interface CollaborationProps {
  profil: Partial<Foerderprofil>;
  updateProfil: (changes: Partial<Foerderprofil>) => void;
}

export default function Collaboration({ profil, updateProfil }: CollaborationProps) {
  return (
    <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center">
          <Users size={24} />
        </div>
        <div>
          <h3 className="text-[1.25rem] leading-normal font-black text-slate-900">Zusammenarbeit</h3>
          <p className="text-[0.6875rem] font-black text-slate-400 uppercase tracking-widest">Externe & Interne Stellen</p>
        </div>
      </div>
      <textarea 
        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-[0.875rem] leading-snug font-medium focus:border-indigo-300 outline-none transition-all min-h-[220px] resize-none"
        placeholder="Beratungslehrer/in, Sprachförderung, Schulpsychologie, Jugendwohlfahrt, Therapeuten..."
        value={profil.zusammenarbeit || ''}
        onChange={(e) => updateProfil({ zusammenarbeit: e.target.value })}
      />
    </section>
  );
}
