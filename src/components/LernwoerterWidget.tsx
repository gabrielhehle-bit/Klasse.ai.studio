import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { BookA, Settings2, Play, EyeOff, X, List, Sparkles, Wand2, Archive, RefreshCw, Check, Zap, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function LernwoerterWidget({ isFullscreen }: { isFullscreen?: boolean }) {
  const { app, setApp } = useApp();
  const [activeTab, setActiveTab] = useState<'liste' | 'blitz' | 'geheim' | 'verwalten'>('liste');
  
  const lernwoerterConfig = app.lernwoerter || { aktuelleListe: [], kw: 0, archiv: [] };
  const woerter = lernwoerterConfig.aktuelleListe || [];

  // Verwalten State
  const [inputText, setInputText] = useState(woerter.join('\n'));
  
  // Blitzwörter State
  const [blitzDauer, setBlitzDauer] = useState(1.5);
  const [blitzActive, setBlitzActive] = useState(false);
  const [blitzIndex, setBlitzIndex] = useState(0);
  const [blitzCountdown, setBlitzCountdown] = useState<number | null>(null);

  // Geheimschrift State
  const [geheimVariation, setGeheimVariation] = useState<'vokale' | 'gemischt' | 'rueckwaerts'>('vokale');
  const [showSolutionIndex, setShowSolutionIndex] = useState<number | null>(null);

  const handleSave = () => {
    let parsed = inputText.split(/[\n,]+/).map(w => w.trim()).filter(w => w.length > 0);
    // Remove duplicates
    parsed = Array.from(new Set(parsed));
    if (parsed.length > 20) {
       parsed = parsed.slice(0, 20);
       alert('Maximal 20 Lernwörter erlaubt. Es wurden nur die ersten 20 gespeichert.');
    }
    
    setApp({
      ...app,
      lernwoerter: {
        ...lernwoerterConfig,
        aktuelleListe: parsed,
      }
    });
    setInputText(parsed.join('\n'));
    setActiveTab('liste');
  };

  // Blitzwörter Logic
  useEffect(() => {
    let timer: any;
    if (blitzCountdown !== null && blitzCountdown > 0) {
      timer = setTimeout(() => setBlitzCountdown(blitzCountdown - 1), 1000);
    } else if (blitzCountdown === 0) {
      setBlitzCountdown(null);
      setBlitzActive(true);
      setBlitzIndex(0);
    }
    return () => clearTimeout(timer);
  }, [blitzCountdown]);

  useEffect(() => {
    let timer: any;
    if (blitzActive && blitzIndex < woerter.length) {
      timer = setTimeout(() => {
         setBlitzIndex(prev => prev + 1);
      }, blitzDauer * 1000);
    } else if (blitzActive && blitzIndex >= woerter.length) {
      setBlitzActive(false);
    }
    return () => clearTimeout(timer);
  }, [blitzActive, blitzIndex, blitzDauer, woerter.length]);

  const startBlitz = () => {
    setBlitzCountdown(3);
  };

  const getGeheimwort = (wort: string, varType: string) => {
    if (varType === 'vokale') {
      return wort.replace(/[aeiouäöüAEIOUÄÖÜ]/g, '_');
    }
    if (varType === 'gemischt') {
      if (wort.length <= 3) return wort;
      const first = wort[0];
      const last = wort[wort.length - 1];
      const middle = wort.slice(1, -1).split('').sort(() => 0.5 - Math.random()).join('');
      return first + middle + last;
    }
    if (varType === 'rueckwaerts') {
      return wort.split('').reverse().join('');
    }
    return wort;
  };

  return (
    <div className={`flex flex-col h-full bg-white rounded-3xl ${isFullscreen ? 'p-8' : 'p-4'}`}>
      
      {/* Header Tabs */}
      <div className="flex items-center space-x-2 mb-4 bg-slate-100 p-1 rounded-2xl shrink-0">
        {[
          { id: 'liste', icon: List, label: 'LISTE' },
          { id: 'blitz', icon: Zap, label: 'BLITZ' },
          { id: 'geheim', icon: Wand2, label: 'GEHEIM' },
          { id: 'verwalten', icon: Settings2, label: 'EDIT' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex-1 flex flex-col md:flex-row items-center justify-center gap-2 py-2 md:py-2.5 rounded-xl text-[10px] md:text-xs font-black transition-all ${activeTab === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}
          >
            <t.icon size={14} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {woerter.length === 0 && activeTab !== 'verwalten' ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6 min-h-[200px]">
           <BookA size={48} className="mb-4 opacity-20" />
           <p className="text-sm font-bold text-center">Keine Lernwörter vorhanden.</p>
           <button onClick={() => setActiveTab('verwalten')} className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors">
              Jetzt hinzufügen
           </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto no-scrollbar relative min-h-0">
          
          {/* TAB: LISTE */}
          {activeTab === 'liste' && (
            <div className={`grid gap-3 flex-wrap items-center justify-center ${isFullscreen ? 'grid-cols-3 xl:grid-cols-4' : 'grid-cols-2'}`}>
              {woerter.map((w, idx) => (
                <div key={idx} className={`bg-amber-50 text-amber-900 border border-amber-100 rounded-2xl flex items-center justify-center font-bold tracking-tight shadow-sm ${isFullscreen ? 'text-4xl p-6' : 'text-lg p-3'}`}>
                  {w}
                </div>
              ))}
            </div>
          )}

          {/* TAB: GEHEIMSCHRIFT */}
          {activeTab === 'geheim' && (
             <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 mb-4 shrink-0 justify-center">
                    {[
                      { id: 'vokale', label: 'Ohne Vokale' },
                      { id: 'gemischt', label: 'Wortsalat' },
                      { id: 'rueckwaerts', label: 'Rückwärts' },
                    ].map(v => (
                       <button
                         key={v.id}
                         onClick={() => { setGeheimVariation(v.id as any); setShowSolutionIndex(null); }}
                         className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${geheimVariation === v.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                       >
                         {v.label}
                       </button>
                    ))}
                </div>
                <div className={`grid gap-3 ${isFullscreen ? 'grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
                  {woerter.map((w, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => setShowSolutionIndex(showSolutionIndex === idx ? null : idx)}
                      className={`relative overflow-hidden rounded-2xl flex items-center justify-center font-bold tracking-tight shadow-sm transition-all duration-300 ${isFullscreen ? 'p-8 text-3xl' : 'p-4 text-xl'} ${showSolutionIndex === idx ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                    >
                      {showSolutionIndex === idx ? w : getGeheimwort(w, geheimVariation)}
                      {showSolutionIndex !== idx && <Sparkles size={12} className="absolute top-2 right-2 opacity-30" />}
                    </button>
                  ))}
                </div>
             </div>
          )}

          {/* TAB: BLITZWÖRTER */}
          {activeTab === 'blitz' && (
             <div className="flex flex-col items-center justify-center h-full">
                {!blitzActive && blitzCountdown === null && (
                   <div className="flex flex-col items-center space-y-6">
                      <div className="p-4 bg-amber-100 text-amber-600 rounded-full">
                        <Zap size={48} />
                      </div>
                      <div className="space-y-2 text-center">
                         <h3 className="text-xl font-black text-slate-800">Blitzwörter-Training</h3>
                         <p className="text-sm text-slate-500 max-w-sm">Die Kinder haben pro Wort nur kurz Zeit es zu lesen. Danach sollen sie es aus dem Gedächtnis aufschreiben.</p>
                      </div>
                      
                      <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                         <span className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">Anzeigedauer:</span>
                         <select 
                           value={blitzDauer} 
                           onChange={e => setBlitzDauer(Number(e.target.value))}
                           className="bg-white border border-slate-200 text-sm font-bold text-slate-700 py-1.5 px-3 rounded-xl outline-none"
                         >
                            <option value={0.5}>0,5 Sekunden (Profi)</option>
                            <option value={1}>1 Sekunde</option>
                            <option value={1.5}>1,5 Sekunden</option>
                            <option value={2}>2 Sekunden</option>
                            <option value={3}>3 Sekunden</option>
                         </select>
                      </div>

                      <button 
                         onClick={startBlitz} 
                         className="px-8 py-3 bg-indigo-600 text-white font-black rounded-2xl text-lg shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-colors flex items-center gap-2"
                      >
                         <Play size={20} fill="currentColor" /> Starten
                      </button>
                   </div>
                )}

                {blitzCountdown !== null && (
                   <div className="flex items-center justify-center h-full">
                      <motion.div 
                        key={blitzCountdown}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.5, opacity: 0 }}
                        className="text-8xl font-black text-indigo-600"
                      >
                         {blitzCountdown}
                      </motion.div>
                   </div>
                )}

                {blitzActive && blitzIndex < woerter.length && (
                   <div className="flex flex-col items-center justify-center w-full h-full">
                      <motion.div
                         key={blitzIndex}
                         initial={{ opacity: 0, scale: 0.8 }}
                         animate={{ opacity: 1, scale: 1 }}
                         exit={{ opacity: 0, scale: 1.2 }}
                         className={`font-black text-slate-900 tracking-tighter ${isFullscreen ? 'text-[8rem]' : 'text-5xl md:text-7xl'}`}
                      >
                         {woerter[blitzIndex]}
                      </motion.div>
                      <div className="absolute bottom-6 font-bold text-slate-300 text-sm uppercase tracking-widest">
                         Wort {blitzIndex + 1} von {woerter.length}
                      </div>
                   </div>
                )}

                {blitzActive && blitzIndex >= woerter.length && (
                   <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="p-4 bg-emerald-100 text-emerald-600 rounded-full mb-2">
                        <Check size={48} />
                      </div>
                      <h3 className="text-2xl font-black text-slate-800">Fertig!</h3>
                      <button onClick={() => setBlitzActive(false)} className="px-6 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200">
                        Zurück
                      </button>
                   </div>
                )}
             </div>
          )}

          {/* TAB: VERWALTEN */}
          {activeTab === 'verwalten' && (
             <div className="flex flex-col h-full space-y-4 min-h-[300px]">
                <div className="bg-amber-50 text-amber-800 p-3 rounded-xl text-xs font-medium border border-amber-200 flex items-start gap-2 shrink-0">
                  <BookA size={16} className="shrink-0 mt-0.5" />
                  <p>Trage hier die aktuellen Lernwörter ein (max. 20). Trenne sie durch Kommas oder Zeilenumbrüche.</p>
                </div>
                <textarea
                   className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 resize-none"
                   value={inputText}
                   onChange={(e) => setInputText(e.target.value)}
                   placeholder="Haus, Garten, blühen, wachsen..."
                />
                <button 
                  onClick={handleSave} 
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black shadow-md shrink-0 flex items-center justify-center gap-2"
                >
                  <Save size={16} /> Lernwörter speichern
                </button>
             </div>
          )}
        </div>
      )}
    </div>
  );
}

// Ensure Check is imported since I used it inside blitzworter. Wait, I didn't import Check. I'll use Sparkles or similar or fix the import.
