import React, { useState } from 'react';
import { 
  LayoutGrid, 
  Search, 
  Check, 
  EyeOff, 
  Info, 
  School, 
  Calendar, 
  BookOpen, 
  Backpack, 
  Sliders 
} from 'lucide-react';
import { motion } from 'motion/react';
import { AVAILABLE_MODULES } from '../Settings';

interface ModuleSettingsProps {
  app: any;
  toggleModuleDisable: (moduleId: string) => void;
}

export default function ModuleSettings({
  app,
  toggleModuleDisable
}: ModuleSettingsProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const disabledModules: string[] = app.settings?.disabledModules || [];

  // Group modules into 4 logical primary school categories
  const GROUPS = [
    {
      title: 'Unterricht & Digitales Board',
      icon: School,
      ids: ['cockpit', 'ki-helfer', 'sitzplan']
    },
    {
      title: 'Planung & Stundenbilder',
      icon: Calendar,
      ids: ['wochenplanung', 'jahresplanung', 'materialien', 'uebergabemappe']
    },
    {
      title: 'Leistung & Schülerförderung',
      icon: BookOpen,
      ids: ['schueler', 'noten', 'diagnostik', 'statistik']
    },
    {
      title: 'Organisation & Klassengemeinschaft',
      icon: Backpack,
      ids: ['anwesenheit', 'orga', 'archiv', 'datensicherung']
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="bg-white rounded-[2.5rem] border border-stone-200/80 p-6 md:p-8 space-y-4 shadow-sm">
        <div className="flex items-center gap-3 border-b border-stone-150 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
            <LayoutGrid size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Module & Bereiche ein- oder ausblenden</h2>
            <p className="text-xs text-slate-500 font-medium">Passe deine Navigationsleiste an. Nicht genutzte Werkzeuge lassen sich ganz einfach verbergen.</p>
          </div>
        </div>

        <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-100 text-emerald-800 text-xs font-semibold leading-relaxed flex items-start gap-2.5">
          <Info size={16} className="text-emerald-600 shrink-0 mt-0.5" />
          <span>
            <strong>Deine Daten bleiben 100% sicher erhalten:</strong> Wenn du ein Modul ausblendest, werden nur die Menüeinträge unsichtbar gemacht. Es werden niemals Notizen, Noten oder Einträge gelöscht.
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative pt-2">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Nach Modul suchen (z.B. Kasse, Noten, Wochenplan...)"
            className="w-full h-11 pl-11 pr-4 bg-slate-50 border border-stone-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Module Groups */}
      <div className="space-y-6">
        {GROUPS.map(group => {
          const GroupIcon = group.icon;

          // Find modules belonging to this group
          const modulesInGroup = AVAILABLE_MODULES.filter(m => {
            if (group.ids.includes(m.id)) {
              if (m.condition && !m.condition(app)) return false;
              if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                return m.label.toLowerCase().includes(term) || m.desc.toLowerCase().includes(term);
              }
              return true;
            }
            return false;
          });

          if (modulesInGroup.length === 0) return null;

          return (
            <div key={group.title} className="bg-white rounded-[2.5rem] border border-stone-200/80 p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-stone-150 pb-3">
                <GroupIcon size={18} className="text-indigo-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  {group.title}
                </h3>
                <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[0.625rem] font-bold text-slate-500">
                  {modulesInGroup.length} Module
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {modulesInGroup.map(m => {
                  const isHidden = disabledModules.includes(m.id);

                  return (
                    <div
                      key={m.id}
                      onClick={() => toggleModuleDisable(m.id)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-4 ${
                        isHidden
                          ? 'border-stone-200 bg-stone-50/50 opacity-70 hover:opacity-100'
                          : 'border-indigo-100 bg-white hover:border-indigo-300 shadow-xs'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-black ${isHidden ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                            {m.label}
                          </span>
                        </div>
                        <p className="text-[0.6875rem] text-slate-400 font-medium truncate">
                          {m.desc}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-[0.625rem] font-black uppercase tracking-wider ${
                          isHidden ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isHidden ? 'Ausgeblendet' : 'Aktiv'}
                        </span>

                        <button
                          type="button"
                          className={`w-10 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                            isHidden ? 'bg-slate-300' : 'bg-emerald-500'
                          }`}
                        >
                          <motion.div
                            animate={{ x: isHidden ? 0 : 16 }}
                            className="w-5 h-5 bg-white rounded-full shadow-sm flex items-center justify-center text-[10px]"
                          >
                            {!isHidden && <Check size={10} className="text-emerald-600 stroke-[3]" />}
                          </motion.div>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
