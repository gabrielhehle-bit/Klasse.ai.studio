
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Map, LayoutGrid, Users, ArrowRight, X, Sparkles, Settings } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function DashboardTour() {
  const { app, setApp } = useApp();
  const [currentStep, setCurrentStep] = useState(0);

  if (!app.firstLogin) return null;

  const t = app.settings?.theme || 'warm_sand';
  let b = 'amber';
  if (t === 'soft_sage' || t === 'cozy_mint') b = 'emerald';
  else if (t === 'ocean_breeze') b = 'blue';
  else if (t === 'lavender_field') b = 'violet';
  else if (t === 'sakura_dream') b = 'rose';
  else if (t === 'peach_blossom') b = 'amber';
  else if (t === 'classic_light' || t === 'minimal_slate') b = 'slate';

  const map = {
    amber: { bg: 'bg-amber-50', bg800: 'bg-amber-800', bg900: 'bg-amber-900', border: 'border-amber-100', text950: 'text-amber-950', text800: 'text-amber-800', text80040: 'text-amber-800/40', text500: 'text-amber-500', hoverBg: 'hover:bg-amber-900', hoverText: 'hover:text-amber-800', shadow: 'shadow-amber-900/20', hoverIconBg: 'hover:bg-amber-50', iconHover: 'text-amber-900/20' },
    emerald: { bg: 'bg-emerald-50', bg800: 'bg-emerald-800', bg900: 'bg-emerald-900', border: 'border-emerald-100', text950: 'text-emerald-950', text800: 'text-emerald-800', text80040: 'text-emerald-800/40', text500: 'text-emerald-500', hoverBg: 'hover:bg-emerald-900', hoverText: 'hover:text-emerald-800', shadow: 'shadow-emerald-900/20', hoverIconBg: 'hover:bg-emerald-50', iconHover: 'text-emerald-900/20' },
    blue: { bg: 'bg-blue-50', bg800: 'bg-blue-800', bg900: 'bg-blue-900', border: 'border-blue-100', text950: 'text-blue-950', text800: 'text-blue-800', text80040: 'text-blue-800/40', text500: 'text-blue-500', hoverBg: 'hover:bg-blue-900', hoverText: 'hover:text-blue-800', shadow: 'shadow-blue-900/20', hoverIconBg: 'hover:bg-blue-50', iconHover: 'text-blue-900/20' },
    violet: { bg: 'bg-violet-50', bg800: 'bg-violet-800', bg900: 'bg-violet-900', border: 'border-violet-100', text950: 'text-violet-950', text800: 'text-violet-800', text80040: 'text-violet-800/40', text500: 'text-violet-500', hoverBg: 'hover:bg-violet-900', hoverText: 'hover:text-violet-800', shadow: 'shadow-violet-900/20', hoverIconBg: 'hover:bg-violet-50', iconHover: 'text-violet-900/20' },
    rose: { bg: 'bg-rose-50', bg800: 'bg-rose-800', bg900: 'bg-rose-900', border: 'border-rose-100', text950: 'text-rose-950', text800: 'text-rose-800', text80040: 'text-rose-800/40', text500: 'text-rose-500', hoverBg: 'hover:bg-rose-900', hoverText: 'hover:text-rose-800', shadow: 'shadow-rose-900/20', hoverIconBg: 'hover:bg-rose-50', iconHover: 'text-rose-900/20' },
    slate: { bg: 'bg-slate-50', bg800: 'bg-slate-800', bg900: 'bg-slate-900', border: 'border-slate-100', text950: 'text-slate-950', text800: 'text-slate-800', text80040: 'text-slate-800/40', text500: 'text-slate-500', hoverBg: 'hover:bg-slate-900', hoverText: 'hover:text-slate-800', shadow: 'shadow-slate-900/20', hoverIconBg: 'hover:bg-slate-50', iconHover: 'text-slate-900/20' },
  } as any;
  const c = map[b] || map['amber'];

  const steps = [
    {
      title: "Willkommen im Cockpit!",
      text: "Das Dashboard ist deine Schaltzentrale. Hier siehst du alles Wichtige für den aktuellen Tag auf einen Blick.",
      icon: <Sparkles className={c.text500} size={32} />,
      position: "center"
    },
    {
      title: "Dein Stundenplan",
      text: "Unter 'Wochenplanung' findest du deinen Stammplan und kannst Stunden inhaltlich vorbereiten.",
      icon: <LayoutGrid className={c.text500} size={32} />,
      position: "left"
    },
    {
      title: "Deine Schüler",
      text: "In der Schülerliste verwaltest du Notizen, Fehlzeiten und die Noten deiner Klasse.",
      icon: <Users className={c.text500} size={32} />,
      position: "right"
    },
    {
      title: "Alle Einstellungen",
      text: "Weitere Infos und Konfigurationen findest du jederzeit unter 'Einstellungen' oben rechts.",
      icon: <Settings className={c.text500} size={32} />,
      position: "center"
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setApp(prev => ({ ...prev, firstLogin: false }));
    }
  };

  const handleClose = () => {
    setApp(prev => ({ ...prev, firstLogin: false }));
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm cursor-pointer"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-[40px] shadow-2xl max-w-md w-full  border border-white cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-8 text-center space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex gap-1.5">
                {steps.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? `w-8 ${c.bg500}` : `w-2 ${c.bg100}`}`} 
                  />
                ))}
              </div>
              <button 
                onClick={handleClose}
                className={`p-2 ${c.hoverIconBg} rounded-full ${c.iconHover} hover:text-rose-500 transition-all`}
              >
                <X size={20} />
              </button>
            </div>

            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 py-4"
            >
              <div className={`w-20 h-20 ${c.bg} rounded-3xl flex items-center justify-center mx-auto shadow-sm border ${c.border}`}>
                {steps[currentStep].icon}
              </div>
              <div className="space-y-2">
                <h3 className={`text-[1.5rem] leading-normal font-bold ${c.text950} font-display`}>{steps[currentStep].title}</h3>
                <p className={`${c.text80040} leading-relaxed font-medium`}>
                  {steps[currentStep].text}
                </p>
              </div>
            </motion.div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleNext}
                className={`w-full py-4 ${c.bg800} text-white rounded-2xl font-bold flex items-center justify-center gap-2 ${c.hoverBg} transition-all shadow-xl ${c.shadow} active:scale-[0.98]`}
              >
                <span>{currentStep === steps.length - 1 ? 'Tour beenden' : 'Weiter'}</span>
                <ArrowRight size={18} />
              </button>

              {currentStep < steps.length - 1 && (
                <button 
                  onClick={handleClose}
                  className={`w-full py-3 text-[0.6875rem] font-black uppercase tracking-widest ${c.text80040} ${c.hoverText} transition-colors`}
                >
                  Tour überspringen
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
