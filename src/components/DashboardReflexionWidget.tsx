import React, { useState, useMemo } from 'react';
import { Heart, Activity, Coffee, Check, X, BatteryFull, BatteryMedium, BatteryLow, Flame } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CanvasBarChart } from './charts/CanvasBarChart';

export default function DashboardReflexionWidget({ onClose }: { onClose?: () => void }) {
  const { app, setApp } = useApp();
  const [submitted, setSubmitted] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  
  // Read from app if already set today
  const today = new Date().toISOString().split('T')[0];
  const hasReflectedToday = app.dailyReflections?.[today];

  const handleReflect = (state: string) => {
    setSelected(state);
    
    // Save to global state
    setApp(prev => ({
      ...prev,
      dailyReflections: {
        ...(prev.dailyReflections || {}),
        [today]: state
      }
    }));
    
    setTimeout(() => {
      setSubmitted(true);
    }, 500);
  };

  const chartData = useMemo(() => {
    const data = [];
    for(let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const val = app.dailyReflections?.[dateStr];
      let numVal = 0;
      let color = 'var(--text-muted, #64748b)'; 
      let label = 'Kein Eintrag';
      
      if (val === 'good') { numVal = 3; color = 'var(--accent, #10b981)'; label = 'Volle Energie'}  
      if (val === 'medium') { numVal = 2; color = '#f59e0b'; label = 'Ausgelaugt'} 
      if (val === 'bad') { numVal = 1; color = '#f43f5e'; label = 'Überlastet'}   
      
      data.push({
        name: d.toLocaleDateString("de-DE", { weekday: 'short' }).charAt(0) + d.toLocaleDateString("de-DE", { weekday: 'short' }).charAt(1), // e.g. "Mo", "Di"
        date: dateStr,
        value: val ? numVal : 0.2, // Small baseline for empty days
        actualValue: val ? numVal : 0,
        color: val ? color : 'var(--border, #cbd5e1)', 
        label
      });
    }
    return data;
  }, [app.dailyReflections, app.settings?.theme]);
  
  if (hasReflectedToday || submitted) {
    return (
      <div className="relative h-full flex flex-col p-5 bg-gradient-to-br from-surface to-surface2 border border-border rounded-3xl shadow-xl group transition-all duration-300">
        {onClose && (
           <button onClick={onClose} className="absolute top-3 right-3 text-text-muted hover:text-text-primary bg-surface2/50 p-1.5 rounded-lg border border-border opacity-0 group-hover:opacity-100 transition-opacity z-20" title="Verbergen">
             <X size={14} />
           </button>
        )}
        
        <div className="flex items-center gap-4 mb-4 z-10 shrink-0">
           <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center border border-accent/20 shadow-inner">
             <Heart className="w-6 h-6 text-accent animate-pulse" />
           </div>
           <div>
             <h3 className="font-black text-accent text-[0.875rem] leading-snug tracking-tight mb-0.5">Gut gemacht!</h3>
             <p className="text-[0.625rem] font-bold text-text-muted uppercase tracking-widest">Tagesreflexion erfasst</p>
           </div>
        </div>

        <div className="flex-1 relative z-10 min-h-0 flex flex-col mt-2">
           <div className="text-[0.625rem] font-black uppercase text-text-muted mb-2 tracking-widest flex items-center gap-1.5">
              <Activity size={12} />
              Energie-Verlauf (14 Tage)
           </div>
           <div className="flex-1 min-h-0 w-full pb-2">
             <CanvasBarChart 
                data={chartData.map(d => ({ value: d.value, color: d.color }))} 
                labels={chartData.map(d => `${d.label} - ${d.actualValue || 0}`)}
                height={80}
             />
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col p-5 bg-gradient-to-br from-surface to-surface2 border border-border rounded-3xl shadow-xl group transition-all duration-300">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform pointer-events-none">
        <Activity className="w-24 h-24 text-accent" />
      </div>
      
      {onClose && (
         <button onClick={onClose} className="absolute top-3 right-3 text-text-muted hover:text-text-primary bg-surface2/50 p-1.5 rounded-lg border border-border opacity-0 group-hover:opacity-100 transition-opacity z-10" title="Verbergen">
           <X size={14} />
         </button>
      )}
      
      <div className="relative z-10 flex-col h-full flex justify-between space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Coffee size={14} className="text-accent" />
            <h3 className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-accent">Reflexion</h3>
          </div>
          <h4 className="text-text-primary font-black text-[1.125rem] leading-normal leading-tight mb-1">Wie geht's dir nach dem Unterricht?</h4>
          <p className="text-text-muted text-[0.75rem] leading-tight font-bold">Burnout-Prävention: Kurzer Check-in.</p>
        </div>
        
        <div className="flex gap-2">
          {/* Options */}
          <button 
            onClick={() => handleReflect('good')}
            className={`flex-1 flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${selected === 'good' ? 'bg-emerald-500/20 border-emerald-500 scale-95' : 'bg-surface2 border-border hover:bg-surface3 hover:scale-105 active:scale-95'}`}
          >
            <BatteryFull size={24} className="text-emerald-500 mb-1" />
            <span className="text-[0.625rem] font-bold text-text-secondary">Volle Energie</span>
          </button>
          
          <button 
            onClick={() => handleReflect('medium')}
            className={`flex-1 flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${selected === 'medium' ? 'bg-amber-500/20 border-amber-500 scale-95' : 'bg-surface2 border-border hover:bg-surface3 hover:scale-105 active:scale-95'}`}
          >
            <BatteryMedium size={24} className="text-amber-500 mb-1" />
            <span className="text-[0.625rem] font-bold text-text-secondary">Ausgelaugt</span>
          </button>
          
          <button 
            onClick={() => handleReflect('bad')}
            className={`flex-1 flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${selected === 'bad' ? 'bg-rose-500/20 border-rose-500 scale-95' : 'bg-surface2 border-border hover:bg-surface3 hover:scale-105 active:scale-95'}`}
          >
            <BatteryLow size={24} className="text-rose-500 mb-1" />
            <span className="text-[0.625rem] font-bold text-text-secondary">Überlastet</span>
          </button>
        </div>
      </div>
    </div>
  );
}
