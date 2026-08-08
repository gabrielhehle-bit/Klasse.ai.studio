import React from 'react';
import { useApp } from '../../context/AppContext';
import { RotateCcw, Plus, Trash2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function BehaviorSettings() {
  const { app, setApp } = useApp();
  const stages = app.behavior_stages || [];

  return (
    <div id="behavior-grades-settings" className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
      <div id="behavior-grades-header-card" className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-6 rounded-[2rem] border border-emerald-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-[1.25rem] leading-normal font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span>🌟 Verhaltenseinstellungen</span>
          </h3>
          <p className="text-[0.75rem] leading-tight font-semibold text-slate-400 mt-1 uppercase tracking-wider">
            Feedback-Stufen, Emojis, Standard-Schnittstellen und Auswertungszeiträume anpassen
          </p>
        </div>
        <button
          id="reset-behavior-stages-default-btn"
          onClick={() => {
            if (confirm('Möchtest du alle Feedback-Stufen auf die Standardeinstellungen zurücksetzen? Deine eigenen Stufen gehen dabei verloren.')) {
              const defaultStages = [
                { id: '1', label: 'Super', color: '#10b981', icon: '🌟' },
                { id: '2', label: 'Gut', color: '#3b82f6', icon: '😊' },
                { id: '3', label: 'OK', color: '#94a3b8', icon: '😐' },
                { id: '4', label: 'Ermahnung', color: '#f59e0b', icon: '⚠️' },
                { id: '5', label: 'Inakzeptabel', color: '#ef4444', icon: '🚫' }
              ];
              setApp(prev => ({
                ...prev,
                behavior_stages: defaultStages,
                behavior_default_stage_id: '1'
              }));
            }
          }}
          className="px-4 py-2 bg-white border border-slate-200 hover:border-emerald-200 hover:text-emerald-600 text-[0.625rem] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <RotateCcw size={14} />
          Auf Standard zurücksetzen
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div id="behavior-grades-stages-config">
          <div className="mb-4">
            <h4 className="font-bold text-slate-800">Feedback-Stufen konfigurieren</h4>
            <p className="text-[0.75rem] leading-tight text-slate-400 mt-0.5">Definiere die Emojis, Bezeichnungen und Farben für die Feedback-Ebenen. Stelle ein, welche Stufe als Standard vorausgewählt wird.</p>
          </div>
          <div className="space-y-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm relative ">
            <AnimatePresence>
              {stages.map((stage, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={stage.id} 
                  className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl group transition-all"
                >
                  <label className="flex items-center justify-center p-2 rounded-xl hover:bg-slate-200 cursor-pointer transition-colors relative" title="Als Standard festlegen">
                    <input 
                      type="radio" 
                      name="default-behavior-stage"
                      checked={app.behavior_default_stage_id === stage.id}
                      onChange={() => setApp(prev => ({ ...prev, behavior_default_stage_id: stage.id }))}
                      className="peer sr-only"
                    />
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 peer-checked:border-emerald-500 peer-checked:bg-emerald-500 transition-all shadow-inner"></div>
                  </label>
                  
                  <div className="relative group/emoji">
                    <input 
                      type="text" 
                      value={stage.icon || ''}
                      onChange={e => {
                        const newStages = [...stages];
                        newStages[idx].icon = e.target.value;
                        setApp(prev => ({ ...prev, behavior_stages: newStages }));
                      }}
                      className="w-12 h-12 text-[1.5rem] leading-normal text-center bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all font-emoji shadow-sm"
                      placeholder="🌟"
                    />
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-1">
                    <input 
                      type="text" 
                      value={stage.label || ''}
                      onChange={e => {
                        const newStages = [...stages];
                        newStages[idx].label = e.target.value;
                        setApp(prev => ({ ...prev, behavior_stages: newStages }));
                      }}
                      className="w-full bg-transparent border-b-2 border-transparent focus:border-emerald-400 text-[0.875rem] leading-snug font-black text-slate-700 outline-none transition-colors px-1 py-0.5"
                      placeholder="Bezeichnung..."
                    />
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <div className="relative rounded-lg  border border-slate-200 w-8 h-8 shadow-sm flex-shrink-0 cursor-pointer hover:border-emerald-400 transition-colors">
                      <input 
                        id={`behavior-stage-color-input-${stage.id}`}
                        type="color" 
                        value={stage.color || '#64748b'}
                        onChange={e => {
                          const newStages = [...stages];
                          newStages[idx].color = e.target.value;
                          setApp(prev => ({ ...prev, behavior_stages: newStages }));
                        }}
                        className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                      />
                    </div>
                    
                    <button
                      onClick={() => {
                        if (stages.length <= 1) {
                          alert('Es muss mindestens eine Stufe übrig bleiben.');
                          return;
                        }
                        const newStages = stages.filter((_, i) => i !== idx);
                        const isRemovingDefault = app.behavior_default_stage_id === stage.id;
                        setApp(prev => ({ 
                          ...prev, 
                          behavior_stages: newStages,
                          behavior_default_stage_id: isRemovingDefault ? newStages[0].id : prev.behavior_default_stage_id
                        }));
                      }}
                      className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Stufe löschen"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            <button
              onClick={() => {
                const newStage = { id: Date.now().toString(), label: 'Neue Stufe', color: '#64748b', icon: '❓' };
                setApp(prev => ({ ...prev, behavior_stages: [...stages, newStage] }));
              }}
              className="w-full mt-2 py-3 border-2 border-dashed border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-2xl transition-all flex items-center justify-center gap-2 font-bold text-[0.75rem] leading-tight uppercase tracking-wider"
            >
              <Plus size={14} />
              Stufe hinzufügen
            </button>
          </div>
        </div>
        
        <div id="behavior-grades-evaluation-config">
          <div className="mb-4">
            <h4 className="font-bold text-slate-800">Auswertungs-Startdatum</h4>
            <p className="text-[0.75rem] leading-tight text-slate-400 mt-0.5">Definiere, ab welchem Tag Symbole für Statistiken gezählt werden.</p>
          </div>
          
          <div className="space-y-4">
            <div className="relative">
              <input 
                id="behavior-grades-startdate-picker"
                type="date" 
                value={app.settings?.behaviorStartDate || ''} 
                onChange={(e) => {
                  const val = e.target.value;
                  setApp(prev => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      behaviorStartDate: val
                    } as any
                  }));
                }}
                className="w-full focus:ring-emerald-500 bg-white border border-slate-200 rounded-2xl px-4 py-3 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 transition-all shadow-sm cursor-pointer"
              />
            </div>
            
            <div className="bg-amber-50 border border-amber-200/50 p-4 rounded-2xl relative ">
               <div className="absolute -right-4 -top-4 w-16 h-16 bg-amber-500/10 rounded-full blur-xl"></div>
               <p className="text-[0.75rem] leading-tight text-amber-800/80 leading-relaxed font-medium relative z-10">
                 <span className="font-bold flex items-center gap-1 mb-1 text-amber-900"><Info size={12} /> Startdatum leer lassen</span>
                 Wenn kein Datum angegeben ist, werden alle Eintragungen des aktuellen Semesters ab dem ersten Schultag berücksichtigt. Emojis vor diesem Datum scheinen nicht in den Summengrafiken auf.
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
