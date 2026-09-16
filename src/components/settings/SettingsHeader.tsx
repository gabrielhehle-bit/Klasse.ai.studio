import React from 'react';
import { 
  Sliders, 
  Palette, 
  LayoutGrid, 
  Smartphone, 
  Download, 
  Shield, 
  ArrowLeft, 
  Info, 
  Sparkles,
  Check,
  Heart,
  Mail
} from 'lucide-react';
import { motion } from 'motion/react';

export type SettingsCategory = 'overview' | 'account' | 'general' | 'display' | 'modules' | 'sync' | 'backup' | 'support' | 'advanced';

interface SettingsHeaderProps {
  activeCategory: SettingsCategory;
  setActiveCategory: (cat: SettingsCategory) => void;
  einfachModus: boolean;
  setEinfachModus: (val: boolean) => void;
}

export const CATEGORIES: { id: SettingsCategory; label: string; icon: any; shortDesc: string }[] = [
  { id: 'account', label: 'Konto', icon: Mail, shortDesc: 'E-Mail & Schulidentität' },
  { id: 'general', label: 'Allgemein', icon: Sliders, shortDesc: 'Schuljahr, Bundesland & Fächer' },
  { id: 'display', label: 'Darstellung', icon: Palette, shortDesc: 'Design, Schrift & Cockpit' },
  { id: 'modules', label: 'Module', icon: LayoutGrid, shortDesc: 'Bereiche ein- & ausblenden' },
  { id: 'sync', label: 'Synchronisierung', icon: Smartphone, shortDesc: 'Smartboard & Fernbedienung' },
  { id: 'backup', label: 'Daten & Backup', icon: Download, shortDesc: 'Sichern, Laden & App-Install' },
  { id: 'support', label: 'Unterstützung', icon: Heart, shortDesc: 'Freiwillige Beiträge & Unterstützer:innen' },
  { id: 'advanced', label: 'Erweitert', icon: Shield, shortDesc: 'Datenschutz & Gefahrenbereich' },
];

export default function SettingsHeader({
  activeCategory,
  setActiveCategory,
  einfachModus,
  setEinfachModus
}: SettingsHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Top Bar with Title and Einfachmodus Switch */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/90 backdrop-blur-md p-6 rounded-[2rem] border border-stone-200/80 shadow-sm">
        <div className="flex items-center gap-4">
          {activeCategory !== 'overview' && (
            <button
              onClick={() => setActiveCategory('overview')}
              className="p-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-slate-700 transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95"
              title="Zurück zur Übersicht"
              aria-label="Zurück zur Übersicht"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight font-sans">
                {activeCategory === 'overview' && 'Einstellungen'}
                {activeCategory === 'account' && 'Konto & Schulmail'}
                {activeCategory === 'general' && 'Allgemeine Einstellungen'}
                {activeCategory === 'display' && 'Darstellung & Cockpit'}
                {activeCategory === 'modules' && 'Module & Bereiche'}
                {activeCategory === 'sync' && 'Smartboard & Synchronisierung'}
                {activeCategory === 'backup' && 'Daten & Datensicherung'}
                {activeCategory === 'support' && 'Klassio unterstützen'}
                {activeCategory === 'advanced' && 'Erweitert & Sicherheit'}
              </h1>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[0.625rem] font-bold uppercase tracking-wider">
                {einfachModus ? 'Einfachmodus' : 'Alle Optionen'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Was möchtest du in Klassio anpassen?
            </p>
          </div>
        </div>

        {/* Einfachmodus Toggle Switch */}
        <div className="flex items-center gap-3 bg-stone-50 p-2.5 rounded-2xl border border-stone-200/80 shrink-0">
          <div className="flex flex-col">
            <span className="text-[0.6875rem] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={12} className={einfachModus ? "text-amber-500 fill-amber-500" : "text-slate-400"} />
              Einfachmodus
            </span>
            <span className="text-[0.5625rem] text-slate-500 font-medium">
              {einfachModus ? 'Nur wesentliche Optionen' : 'Alle Details sichtbar'}
            </span>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={einfachModus}
            aria-label="Einfachmodus umschalten"
            onClick={() => setEinfachModus(!einfachModus)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 flex items-center px-0.5 cursor-pointer shrink-0 ${
              einfachModus ? 'bg-amber-500' : 'bg-slate-300'
            }`}
          >
            <motion.div
              animate={{ x: einfachModus ? 24 : 0 }}
              className="w-5 h-5 bg-white rounded-full shadow-sm flex items-center justify-center text-[10px]"
            >
              {einfachModus && <Check size={12} className="text-amber-600 stroke-[3]" />}
            </motion.div>
          </button>
        </div>
      </div>

      {/* Pill Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setActiveCategory('overview')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeCategory === 'overview'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white hover:bg-stone-50 text-slate-600 border border-stone-200/80'
          }`}
        >
          <span>Übersicht</span>
        </button>

        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-white hover:bg-stone-50 text-slate-600 border border-stone-200/80'
              }`}
            >
              <Icon size={14} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
