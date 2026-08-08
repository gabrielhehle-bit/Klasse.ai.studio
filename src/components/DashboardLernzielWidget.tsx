import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CheckSquare, Target, ChevronRight } from 'lucide-react';
import { getKW, getSW } from '../lib/utils';
import { motion } from 'motion/react';

export default function DashboardLernzielWidget() {
  const { app, setApp } = useApp();
  
  const currentKW = app?.currentKW || getKW(new Date());
  
  // Minimal set of subjects to show
  const subjects = ['Deutsch', 'Mathematik', 'Sachunterricht'];
  
  const getProgress = (fach: string) => {
      const db = app.lernzielTracker?.[fach] || {};
      const all = Object.values(db).filter(l => l.kw === currentKW);
      const total = all.length;
      if (total === 0) return { checked: 0, total: 0, percent: 0 };
      const checked = all.filter(l => l.abgehakt).length;
      return { checked, total, percent: Math.round((checked / total) * 100) };
  };

  return (
    <div 
        onClick={() => setApp(prev => ({ ...prev, currentPage: 'jahresplanung', settings: { ...prev.settings, planTab: 'lernziele' } }))}
        className="bg-neutral-900/80 backdrop-blur border border-neutral-800 rounded-3xl p-6 shadow-sm flex flex-col group cursor-pointer hover:border-neutral-700 transition-all h-full"
    >
        <div className="flex items-center justify-between opacity-80 group-hover:opacity-100 transition-opacity mb-4">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                 <CheckSquare size={16} />
               </div>
               <div>
                  <div className="text-[0.625rem] font-black uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                      <Target size={10} className="text-emerald-500" /> KW {currentKW}
                      {(() => {
                        const sw = getSW(new Date(), app?.schuljahr);
                        return sw ? (
                          <>
                            <span className="opacity-40">•</span>
                            <span className="text-[0.53125rem] text-neutral-500 font-bold">SW {sw}</span>
                          </>
                        ) : null;
                      })()}
                  </div>
                  <div className="text-[0.75rem] leading-tight font-bold text-neutral-300">Lernziel-Fortschritt</div>
               </div>
            </div>
            <ChevronRight size={16} className="text-neutral-600 group-hover:text-emerald-400 transition transform group-hover:translate-x-1" />
        </div>

        <div className="flex-1 space-y-3 mt-2">
            {subjects.map(fach => {
                const { checked, total, percent } = getProgress(fach);
                return (
                    <div key={fach} className="space-y-1.5">
                        <div className="flex items-center justify-between text-[0.6875rem] font-bold">
                            <span className="text-neutral-400">{fach}</span>
                            <span className={percent === 100 ? "text-emerald-400" : "text-neutral-500"}>
                                {total > 0 ? `${checked}/${total}` : '-'}
                            </span>
                        </div>
                        <div className="h-2 w-full bg-neutral-800 rounded-full  flex items-center">
                            {total > 0 ? (
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percent}%` }}
                                    className={`h-full rounded-full transition-all duration-1000 ${percent === 100 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-neutral-600'}`}
                                />
                            ) : (
                                <div className="text-[0.5625rem] font-black uppercase text-neutral-600 tracking-widest px-2 leading-none">Keine Ziele</div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    </div>
  );
}
