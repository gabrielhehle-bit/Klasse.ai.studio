import React from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Sparkles, Settings2, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function InitialModeModal() {
  const { app, setApp } = useApp();
  const { showToast } = useToast();

  if (!app.firstLogin) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className="bg-white rounded-[2.5rem] p-8 md:p-10 max-w-2xl w-full shadow-2xl relative "
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-60"></div>
        
        <div className="relative z-10 space-y-8 text-center sm:text-left">
          
          <div className="space-y-3">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto sm:mx-0 shadow-inner">
              <Sparkles size={32} />
            </div>
            <h2 className="text-[1.875rem] leading-tight font-black text-slate-900 tracking-tight">Willkommen im Klassenbuch!</h2>
            <p className="text-slate-500 font-medium text-[1.125rem] leading-normal leading-relaxed max-w-lg">
              Wie möchtest du starten? Wähle deinen Arbeitsmodus. Du kannst dies in den Einstellungen jederzeit ändern.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <button
              onClick={() => {
                setApp(prev => ({
                  ...prev,
                  firstLogin: false,
                  settings: {
                    ...prev.settings,
                    disabledModules: ['cockpit', 'sitzplan', 'orga', 'jahresplanung', 'wochenplanung', 'materialien', 'uebergabemappe', 'statistik', 'diagnostik', 'archiv', 'jahresbericht']
                  }
                }));
                showToast("Fokus-Modus aktiviert! Alles ist schön übersichtlich.", "success");
              }}
              className="group relative flex flex-col items-center sm:items-start text-left p-6 rounded-[2rem] border-2 border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50 hover:border-emerald-300 transition-all cursor-pointer active:scale-95"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform origin-bottom-left">🌱</div>
              <h3 className="text-[1.125rem] leading-normal font-black text-emerald-900 mb-1">Fokus-Modus</h3>
              <p className="text-[0.75rem] leading-tight text-emerald-700/80 font-medium">Minimalistisch: Nur Dashboard, Schüler, Noten, Anwesenheit und der KI-Helfer. Keine Ablenkung.</p>
            </button>

            <button
              onClick={() => {
                setApp(prev => ({
                  ...prev,
                  firstLogin: false,
                  settings: {
                    ...prev.settings,
                    disabledModules: [] // Zeige alles an
                  }
                }));
                showToast("Experten-Modus aktiviert! Du hast alle Werkzeuge.", "success");
              }}
              className="group relative flex flex-col items-center sm:items-start text-left p-6 rounded-[2rem] border-2 border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer active:scale-95 shadow-sm"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform origin-bottom-left">👑</div>
              <h3 className="text-[1.125rem] leading-normal font-black text-slate-800 mb-1">Experte (Voll)</h3>
              <p className="text-[0.75rem] leading-tight text-slate-500 font-medium">Voller Umfang: Diagnostik, Statistiken, Archiv, Kasse und sämtliche Checklisten sind sofort sichtbar.</p>
            </button>

          </div>

        </div>
      </motion.div>
    </div>
  );
}
