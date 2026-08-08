import React from 'react';
import { History, AlertTriangle, CheckCircle2, ChevronRight, BookOpen } from 'lucide-react';

export default function LehrplanProtocolWidget({ app }: { app: any }) {
  const history = app.lehrplanChecksHistory || [];

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
      <div className="mb-6 flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          <History size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Protokoll: Lehrplan-Abgleiche</h2>
          <p className="text-sm font-medium text-slate-500">Historie aller vergangenen KI-Checks und Warnmeldungen</p>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
          Noch keine Abgleiche durchgeführt. Starte einen Lehrplan-Abgleich, um die Historie hier zu sehen.
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((entry: any, index: number) => {
             const date = new Date(entry.date);
             const isWarning = entry.warnings && entry.warnings.length > 0;
             return (
                 <div key={index} className={`p-4 rounded-2xl border ${isWarning ? 'border-amber-200 bg-amber-50/50' : 'border-emerald-200 bg-emerald-50/50'}`}>
                    <div className="flex justify-between items-start mb-2">
                       <h3 className="font-bold flex items-center gap-2 text-slate-800">
                          {isWarning ? <AlertTriangle size={16} className="text-amber-500" /> : <CheckCircle2 size={16} className="text-emerald-500" />}
                          Check für KW {entry.kw}
                       </h3>
                       <span className="text-xs text-slate-500">{date.toLocaleDateString('de-DE')} {date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    
                    <p className="text-sm text-slate-700 mb-3 ml-6 font-medium">{entry.summary}</p>
                    
                    {isWarning && entry.warnings.length > 0 && (
                        <div className="ml-6 space-y-2 mt-2">
                            {entry.warnings.map((w: any, wIdx: number) => (
                                <div key={wIdx} className="bg-white p-2 rounded-xl text-xs border border-amber-100 flex gap-2">
                                     <ChevronRight size={14} className="text-amber-400 shrink-0 mt-0.5" />
                                     <div>
                                        <b className="text-slate-700">{w.slot}:</b> <span className="text-amber-800">{w.issue}</span>
                                     </div>
                                </div>
                            ))}
                        </div>
                    )}
                 </div>
             );
          })}
        </div>
      )}
    </div>
  );
}
