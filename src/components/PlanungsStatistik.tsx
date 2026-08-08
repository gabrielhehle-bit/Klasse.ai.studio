import React from 'react';
import { Calendar, Clock, BookOpen, Layers, BarChart, Target, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function PlanungsStatistik() {
  const { app } = useApp();

  // 1. Stammplan Stats
  let totalWochenstunden = 0;
  const faecherVerteilung: Record<string, number> = {};
  Object.values(app.stammplan || {}).forEach(dayMap => {
    Object.values(dayMap).forEach(fach => {
      if (fach && typeof fach === 'string' && fach.trim() !== '') {
        totalWochenstunden++;
        faecherVerteilung[fach] = (faecherVerteilung[fach] || 0) + 1;
      }
    });
  });

  const sortedFaecher = Object.entries(faecherVerteilung).sort((a, b) => b[1] - a[1]);

  // 2. Wochenplan Stats
  const geplanteWochenWochenplan = Object.keys(app.wochenplanung || {}).length;
  let totalThemenWochenplan = 0;
  Object.values(app.wochenplanung || {}).forEach((weekPlan: any) => {
    Object.values(weekPlan).forEach((faecherPlan: any) => {
      if (faecherPlan && typeof faecherPlan === 'object' && faecherPlan.thema) {
        if (faecherPlan.thema.trim() !== '') {
          totalThemenWochenplan++;
        }
      }
    });
  });

  // 3. Jahresplan Stats
  const geplanteWochenJahresplan = Object.keys(app.jahresplanung || {}).length;
  let totalThemenJahresplan = 0;
  Object.values(app.jahresplanung || {}).forEach((weekPlan: any) => {
    Object.values(weekPlan).forEach((faecherPlan: any) => {
      if (faecherPlan && typeof faecherPlan === 'object' && faecherPlan.thema) {
        if (faecherPlan.thema.trim() !== '') {
          totalThemenJahresplan++;
        }
      }
    });
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* HEADER CONTROLS */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart className="text-indigo-600" size={24} />
            <h3 className="text-[1.25rem] leading-normal font-black text-slate-900 tracking-tight">Planungs-Statistik</h3>
          </div>
          <p className="text-slate-400 font-bold text-[0.75rem] leading-tight mt-1">
            Reale Auswertung basierend auf Stammstundenplan, Wochenplanung und Jahresplan.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Stammplan */}
        <div className="bg-white border-2 border-indigo-100 rounded-[2.5rem] shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600">
              <Clock size={20} />
            </div>
            <div>
              <h4 className="text-[0.875rem] leading-snug font-black text-slate-900">Stammstundenplan</h4>
              <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">Regelmäßiger Unterricht</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center">
              <span className="text-[0.75rem] font-black text-slate-500 uppercase">Wochenstunden</span>
              <span className="text-[1.5rem] font-black text-indigo-600">{totalWochenstunden}</span>
            </div>
            <div>
              <span className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest block mb-2">Fächerverteilung</span>
              <div className="space-y-2">
                {sortedFaecher.length > 0 ? sortedFaecher.map(([fach, count]) => (
                  <div key={fach} className="flex justify-between items-center text-[0.75rem] font-bold text-slate-700 bg-white border border-slate-100 px-3 py-1.5 rounded-xl">
                    <span className="truncate pr-2">{fach}</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono">{count} Std.</span>
                  </div>
                )) : (
                  <p className="text-[0.75rem] text-slate-400 italic">Noch keine Fächer eingetragen.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Wochenplan */}
        <div className="bg-white border-2 border-teal-100 rounded-[2.5rem] shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="bg-teal-50 p-2.5 rounded-xl text-teal-600">
              <Layers size={20} />
            </div>
            <div>
              <h4 className="text-[0.875rem] leading-snug font-black text-slate-900">Wochenplanung</h4>
              <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">Detailplanung</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center">
              <span className="text-[0.75rem] font-black text-slate-500 uppercase">Geplante Wochen</span>
              <span className="text-[1.5rem] font-black text-teal-600">{geplanteWochenWochenplan}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center">
              <span className="text-[0.75rem] font-black text-slate-500 uppercase">Geplante Themen</span>
              <span className="text-[1.5rem] font-black text-teal-600">{totalThemenWochenplan}</span>
            </div>
          </div>
        </div>

        {/* Jahresplan */}
        <div className="bg-white border-2 border-amber-100 rounded-[2.5rem] shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="bg-amber-50 p-2.5 rounded-xl text-amber-600">
              <FileText size={20} />
            </div>
            <div>
              <h4 className="text-[0.875rem] leading-snug font-black text-slate-900">Jahresplanung</h4>
              <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">Langzeit-Ziele</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center">
              <span className="text-[0.75rem] font-black text-slate-500 uppercase">Geplante Wochen</span>
              <span className="text-[1.5rem] font-black text-amber-600">{geplanteWochenJahresplan}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center">
              <span className="text-[0.75rem] font-black text-slate-500 uppercase">Festgelegte Ziele</span>
              <span className="text-[1.5rem] font-black text-amber-600">{totalThemenJahresplan}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
