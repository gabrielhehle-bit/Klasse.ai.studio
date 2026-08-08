import React, { useState, useMemo } from 'react';
import { X, Calculator, Settings2, SlidersHorizontal, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function GradeCalculatorModal({ isOpen, onClose, inline = false }: { isOpen: boolean; onClose?: () => void; inline?: boolean }) {
  const [maxPoints, setMaxPoints] = useState<number | ''>(50);
  const [strictness, setStrictness] = useState<'locker' | 'standard' | 'streng' | 'custom'>('standard');
  const [customBreaks, setCustomBreaks] = useState<[number, number, number, number]>([90, 75, 60, 45]);

  const isCustomBreaksInvalid = useMemo(() => {
    if (strictness !== 'custom') return false;
    return (
      customBreaks[0] <= customBreaks[1] ||
      customBreaks[1] <= customBreaks[2] ||
      customBreaks[2] <= customBreaks[3]
    );
  }, [strictness, customBreaks]);

  const scale = useMemo(() => {
    if (typeof maxPoints !== 'number' || maxPoints <= 0) return null;
    
    // Simple logic for the grading scales:
    let breaks = [0.9, 0.75, 0.6, 0.45];
    if (strictness === 'locker') breaks = [0.85, 0.7, 0.55, 0.40];
    if (strictness === 'streng') breaks = [0.93, 0.8, 0.65, 0.50];
    if (strictness === 'custom') breaks = customBreaks.map(v => v / 100);

    const getRound = (val: number) => {
      // Round to nearest 0.5 point for Austrian/German grading style
      return Math.ceil(val * 2) / 2;
    };

    const min1 = getRound(maxPoints * breaks[0]);
    const min2 = getRound(maxPoints * breaks[1]);
    const min3 = getRound(maxPoints * breaks[2]);
    const min4 = getRound(maxPoints * breaks[3]);

    return {
      n1: `${min1} - ${maxPoints}`,
      n2: `${min2} - ${min1 - 0.5}`,
      n3: `${min3} - ${min2 - 0.5}`,
      n4: `${min4} - ${min3 - 0.5}`,
      n5: `0 - ${min4 - 0.5}`,
      pts: [min1, min2, min3, min4]
    };
  }, [maxPoints, strictness, customBreaks]);

  if (inline) {
    if (!isOpen) return null;
    return (
      <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col md:grid md:grid-cols-[1fr_1.2fr] gap-6 animate-in fade-in slide-in-from-top-4 duration-300 print:hidden">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 shrink-0">
               <Calculator size={20} />
            </div>
            <div>
               <h3 className="text-[1rem] leading-normal font-black text-slate-800">Punktschlüssel-Rechner</h3>
               <p className="text-[0.625rem] font-bold uppercase tracking-widest text-slate-400">Noten- & Korrekturrechner</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest block mb-1">Maximale Punkteanzahl</label>
              <input 
                type="number"
                value={maxPoints}
                onChange={(e) => setMaxPoints(e.target.value ? parseFloat(e.target.value) : '')}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-[0.875rem] leading-snug font-black outline-none text-slate-900"
                placeholder="z.B. 40"
              />
            </div>
            
            <div>
              <label className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest block mb-1.5 flex items-center gap-1"><SlidersHorizontal size={12}/> Notenschlüssel</label>
              <div className="flex gap-1.5">
                 <button 
                   onClick={() => setStrictness('locker')}
                   className={`flex-1 py-1.5 rounded-lg text-[0.5625rem] font-black uppercase tracking-widest transition-all ${strictness === 'locker' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                 >Locker</button>
                 <button 
                   onClick={() => setStrictness('standard')}
                   className={`flex-1 py-1.5 rounded-lg text-[0.5625rem] font-black uppercase tracking-widest transition-all ${strictness === 'standard' ? 'bg-indigo-500 text-white shadow-sm' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                 >Standard</button>
                 <button 
                   onClick={() => setStrictness('streng')}
                   className={`flex-1 py-1.5 rounded-lg text-[0.5625rem] font-black uppercase tracking-widest transition-all ${strictness === 'streng' ? 'bg-rose-500 text-white shadow-sm' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                 >Streng</button>
                 <button 
                   onClick={() => setStrictness('custom')}
                   className={`flex-1 py-1.5 rounded-lg text-[0.5625rem] font-black uppercase tracking-widest transition-all ${strictness === 'custom' ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                 >Eigen %</button>
              </div>

              {strictness === 'custom' && (
                <div className="space-y-1.5 mt-2 animate-fade-in text-left">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((grade, idx) => (
                      <div key={grade} className="flex-1 relative">
                         <input 
                           type="number"
                           min="0"
                           max="100"
                           value={customBreaks[idx]}
                           onChange={(e) => {
                             let val = parseFloat(e.target.value);
                             if (isNaN(val)) val = 0;
                             const newBreaks = [...customBreaks] as [number, number, number, number];
                             newBreaks[idx] = val;
                             setCustomBreaks(newBreaks);
                           }}
                           className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-lg px-1.5 pt-4 pb-1 text-center text-[0.75rem] leading-tight font-black outline-none text-slate-900"
                         />
                         <span className="absolute top-1 left-0 right-0 text-center text-[0.5rem] font-black uppercase text-slate-400 pointer-events-none">N {grade}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-2xl text-white flex flex-col justify-center h-full">
           {scale ? (
             <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
               <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                 <span className="text-[0.625rem] uppercase font-black text-emerald-400 leading-none">Sehr gut</span>
                 <span className="font-mono text-[0.75rem] leading-tight font-black text-white mt-1">{scale.n1}</span>
               </div>
               <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                 <span className="text-[0.625rem] uppercase font-black text-blue-400 leading-none">Gut</span>
                 <span className="font-mono text-[0.75rem] leading-tight font-black text-white mt-1">{scale.n2}</span>
               </div>
               <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                 <span className="text-[0.625rem] uppercase font-black text-amber-400 leading-none">Befriedigend</span>
                 <span className="font-mono text-[0.75rem] leading-tight font-black text-white mt-1">{scale.n3}</span>
               </div>
               <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
                 <span className="text-[0.625rem] uppercase font-black text-orange-400 leading-none">Genügend</span>
                 <span className="font-mono text-[0.75rem] leading-tight font-black text-white mt-1">{scale.n4}</span>
               </div>
               <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-red-500/10 border border-red-500/20 col-span-2 lg:col-span-1">
                 <span className="text-[0.625rem] uppercase font-black text-red-400 leading-none">Nicht gen.</span>
                 <span className="font-mono text-[0.75rem] leading-tight font-black text-white mt-1">{scale.n5}</span>
               </div>
             </div>
           ) : (
             <div className="text-center text-slate-500 text-[0.75rem] leading-tight font-bold font-sans">Punkteanzahl eingeben</div>
           )}
        </div>
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-[2.5rem] p-8 shadow-2xl relative z-10 w-full max-w-md border border-slate-100 flex flex-col gap-6"
        >
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 shrink-0">
               <Calculator size={24} />
            </div>
            <div>
               <h3 className="text-[1.25rem] leading-normal font-black text-slate-800">Punktschlüssel</h3>
               <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-slate-400">Korrekturnoten-Rechner</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-[0.75rem] leading-tight font-bold text-slate-500 uppercase tracking-widest block mb-2">Maximale Punkteanzahl</label>
              <input 
                type="number"
                value={maxPoints}
                onChange={(e) => setMaxPoints(e.target.value ? parseFloat(e.target.value) : '')}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-[1.125rem] leading-normal font-black outline-none text-slate-900"
                placeholder="z.B. 40"
              />
            </div>
            
            <div>
              <label className="text-[0.75rem] leading-tight font-bold text-slate-500 uppercase tracking-widest block mb-2 flex items-center gap-1.5"><SlidersHorizontal size={14}/> Notenschlüssel</label>
              <div className="flex flex-wrap gap-2">
                 <button 
                   onClick={() => setStrictness('locker')}
                   className={`flex-[1_1_22%] py-2.5 rounded-xl text-[0.625rem] font-black uppercase tracking-widest transition-all ${strictness === 'locker' ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                 >Locker</button>
                 <button 
                   onClick={() => setStrictness('standard')}
                   className={`flex-[1_1_22%] py-2.5 rounded-xl text-[0.625rem] font-black uppercase tracking-widest transition-all ${strictness === 'standard' ? 'bg-indigo-500 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                 >Standard</button>
                 <button 
                   onClick={() => setStrictness('streng')}
                   className={`flex-[1_1_22%] py-2.5 rounded-xl text-[0.625rem] font-black uppercase tracking-widest transition-all ${strictness === 'streng' ? 'bg-rose-500 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                 >Streng</button>
                 <button 
                   onClick={() => setStrictness('custom')}
                   className={`flex-[1_1_22%] py-2.5 rounded-xl text-[0.625rem] font-black uppercase tracking-widest transition-all ${strictness === 'custom' ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                 >Eigen %</button>
              </div>

              {strictness === 'custom' && (
                <div className="space-y-2 mt-3 animate-fade-in text-left">
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((grade, idx) => (
                      <div key={grade} className="flex-1 relative">
                         <input 
                           type="number"
                           min="0"
                           max="100"
                           value={customBreaks[idx]}
                           onChange={(e) => {
                             let val = parseFloat(e.target.value);
                             if (isNaN(val)) val = 0;
                             const newBreaks = [...customBreaks] as [number, number, number, number];
                             newBreaks[idx] = val;
                             setCustomBreaks(newBreaks);
                           }}
                           className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-lg px-2 pt-5 pb-1.5 text-center text-[0.875rem] leading-snug font-black outline-none text-slate-900"
                         />
                         <span className="absolute top-1.5 left-0 right-0 text-center text-[0.5625rem] font-black uppercase text-slate-400 pointer-events-none">Note {grade}</span>
                         <span className="absolute right-2 bottom-2 text-[0.625rem] font-bold text-slate-400 pointer-events-none">%</span>
                      </div>
                    ))}
                  </div>
                  {isCustomBreaksInvalid && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 flex items-start gap-2 text-rose-800">
                      <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                      <p className="text-[0.625rem] leading-relaxed font-bold">
                        <strong className="block text-rose-950 uppercase text-[0.5625rem]">Ungültige Notengrenzen</strong>
                        Die Prozentwerte müssen absteigend sortiert sein (Sehr Gut &gt; Gut &gt; Befriedigend &gt; Genügend).
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-3xl mt-2 text-white">
             {scale ? (
               <div className="space-y-3">
                 <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                   <div className="flex items-center gap-3">
                     <span className="w-8 flex items-center justify-center h-8 rounded-lg bg-emerald-500/20 text-emerald-400 font-black">1</span>
                     <span className="text-[0.875rem] leading-snug font-bold text-slate-300">Sehr gut</span>
                   </div>
                   <span className="font-mono text-[0.875rem] leading-snug tracking-tighter text-emerald-300">{scale.n1}</span>
                 </div>
                 <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                   <div className="flex items-center gap-3">
                     <span className="w-8 flex items-center justify-center h-8 rounded-lg bg-blue-500/20 text-blue-400 font-black">2</span>
                     <span className="text-[0.875rem] leading-snug font-bold text-slate-300">Gut</span>
                   </div>
                   <span className="font-mono text-[0.875rem] leading-snug tracking-tighter text-blue-300">{scale.n2}</span>
                 </div>
                 <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                   <div className="flex items-center gap-3">
                     <span className="w-8 flex items-center justify-center h-8 rounded-lg bg-amber-500/20 text-amber-400 font-black">3</span>
                     <span className="text-[0.875rem] leading-snug font-bold text-slate-300">Befriedigend</span>
                   </div>
                   <span className="font-mono text-[0.875rem] leading-snug tracking-tighter text-amber-300">{scale.n3}</span>
                 </div>
                 <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                   <div className="flex items-center gap-3">
                     <span className="w-8 flex items-center justify-center h-8 rounded-lg bg-orange-500/20 text-orange-400 font-black">4</span>
                     <span className="text-[0.875rem] leading-snug font-bold text-slate-300">Genügend</span>
                   </div>
                   <span className="font-mono text-[0.875rem] leading-snug tracking-tighter text-orange-300">{scale.n4}</span>
                 </div>
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <span className="w-8 flex items-center justify-center h-8 rounded-lg bg-red-500/20 text-red-400 font-black">5</span>
                     <span className="text-[0.875rem] leading-snug font-bold text-slate-300">Nicht gen.</span>
                   </div>
                   <span className="font-mono text-[0.875rem] leading-snug tracking-tighter text-red-300">{scale.n5}</span>
                 </div>
               </div>
             ) : (
               <div className="text-center py-6 text-slate-500 text-[0.875rem] leading-snug font-medium">BItte Punkteanzahl eingeben.</div>
             )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
