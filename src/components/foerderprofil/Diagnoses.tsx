
import React from 'react';
import { TrendingUp, ChevronRight, Info, Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Foerderprofil } from '../../types';
import { isDiagnosticAlert } from '../../lib/diagnosticData';

interface DiagnosesProps {
  profil: Partial<Foerderprofil>;
  updateProfil: (changes: Partial<Foerderprofil>) => void;
  diagnosenErhebungen: any[];
  app: any;
  setPage: (page: string) => void;
}

export default function Diagnoses({ profil, updateProfil, diagnosenErhebungen, app, setPage }: DiagnosesProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* DIAGNOSTIK ÜBERSICHT */}
      <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-6">
         <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center">
                <TrendingUp size={24} />
              </div>
              <div>
                <h3 className="text-[1.25rem] leading-normal font-black text-slate-900">Diagnostik</h3>
                <p className="text-[0.6875rem] font-black text-slate-400 uppercase tracking-widest">Testergebnisse im Überblick</p>
              </div>
            </div>
            <button 
              onClick={() => setPage('diagnostik')}
              className="px-4 py-2 bg-indigo-50 text-indigo-500 rounded-xl text-[0.5625rem] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center gap-2 cursor-pointer"
            >
              Details <ChevronRight size={14} />
            </button>
         </div>
         
         <div className="space-y-3">
            {diagnosenErhebungen.slice(0, 5).map(e => {
              const test = (app.diagnostikTests || []).find((t: any) => t.id === e.testId);
              return (
                <div key={e.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <div>
                      <div className="text-[0.625rem] font-black text-slate-900">{test?.name || 'Unbekannter Test'}</div>
                      <div className="text-[0.5625rem] font-bold text-slate-400">{new Date(e.datum).toLocaleDateString()}</div>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="text-[0.75rem] leading-tight font-black text-slate-700">{e.ergebniswert} <span className="text-[0.5625rem] opacity-50 uppercase">{test?.einheit}</span></div>
                      {isDiagnosticAlert(e) ? (
                        <AlertTriangle size={14} className="text-amber-500" aria-label="Pädagogischer Prüfhinweis" />
                      ) : (
                        <CheckCircle2 size={14} className="text-emerald-500" />
                      )}
                   </div>
                </div>
              );
            })}
            {diagnosenErhebungen.length === 0 && (
              <div className="text-center py-10 text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest italic">
                Keine Diagnostik-Daten vorhanden
              </div>
            )}
         </div>
      </section>

      {/* MIKA-D & DIAGNOSEN */}
      <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-8">
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center">
              <Info size={24} />
            </div>
            <div>
              <h3 className="text-[1.25rem] leading-normal font-black text-slate-900">MIKA-D Status (DaZ)</h3>
              <p className="text-[0.6875rem] font-black text-slate-400 uppercase tracking-widest">Sprachstandserhebung</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Status</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[0.875rem] leading-snug font-bold outline-none focus:border-emerald-300"
                value={profil.mikaDStatus || ''}
                onChange={(e) => updateProfil({ mikaDStatus: e.target.value as any })}
              >
                <option value="">Wählen...</option>
                <option value="1">1 (Außerordentlich)</option>
                <option value="2">2 (Außerordentlich)</option>
                <option value="3">3 (Außerordentlich)</option>
                <option value="ordentlich">Ordentlicher Status</option>
                <option value="nicht erhoben">Nicht erhoben</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Letzte Erhebung</label>
              <input 
                type="date"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[0.875rem] leading-snug font-bold outline-none focus:border-emerald-300"
                value={profil.mikaDDatum || ''}
                onChange={(e) => updateProfil({ mikaDDatum: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="space-y-6 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center">
              <Activity size={24} />
            </div>
            <div>
              <h3 className="text-[1.25rem] leading-normal font-black text-slate-900">Diagnosen & Befunde</h3>
              <p className="text-[0.6875rem] font-black text-slate-400 uppercase tracking-widest">Medizinische / Psychologische Daten</p>
            </div>
          </div>
          <textarea 
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-[0.875rem] leading-snug font-medium focus:border-slate-400 outline-none transition-all min-h-[100px] resize-none"
            placeholder="z.B. ADHS, LRS (Befund vom...), Autismus-Spektrum..."
            value={profil.diagnosen || ''}
            onChange={(e) => updateProfil({ diagnosen: e.target.value })}
          />
        </div>
      </section>
    </div>
  );
}
