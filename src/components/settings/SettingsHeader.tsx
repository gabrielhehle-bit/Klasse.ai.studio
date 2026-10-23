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
  Mail,
  HelpCircle,
} from 'lucide-react';
import { motion } from 'motion/react';

export type SettingsCategory = 'overview' | 'account' | 'general' | 'display' | 'modules' | 'sync' | 'backup' | 'support' | 'advanced' | 'help';

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
  { id: 'help', label: 'Hilfe', icon: HelpCircle, shortDesc: 'Anleitungen zu allen Seiten und Widgets' },
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--surface)] py-5 border-b border-[var(--border)]">
        <div className="flex items-center gap-4">
          {activeCategory !== 'overview' && (
            <button
              onClick={() => setActiveCategory('overview')}
              className="min-h-11 min-w-11 rounded-lg bg-[var(--surface2)] hover:bg-[var(--surface3)] text-[var(--text2)] transition-colors cursor-pointer flex items-center justify-center shrink-0"
              title="Zurück zur Übersicht"
              aria-label="Zurück zur Übersicht"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-semibold text-[var(--text)] tracking-tight font-sans">
                {activeCategory === 'overview' && 'Einstellungen'}
                {activeCategory === 'account' && 'Konto & Schulmail'}
                {activeCategory === 'general' && 'Allgemeine Einstellungen'}
                {activeCategory === 'display' && 'Darstellung & Cockpit'}
                {activeCategory === 'modules' && 'Module & Bereiche'}
                {activeCategory === 'sync' && 'Smartboard & Synchronisierung'}
                {activeCategory === 'backup' && 'Daten & Datensicherung'}
                {activeCategory === 'support' && 'Klassio unterstützen'}
                {activeCategory === 'advanced' && 'Erweitert & Sicherheit'}
                {activeCategory === 'help' && 'Hilfe & Anleitungen'}
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-[var(--surface2)] text-[var(--text2)] text-xs font-medium">
                {einfachModus ? 'Einfachmodus' : 'Alle Optionen'}
              </span>
            </div>
            <p className="text-sm text-[var(--text2)] mt-0.5">
              Was möchtest du in Klassio anpassen?
            </p>
          </div>
        </div>

        {/* Einfachmodus Toggle Switch */}
        <div className="flex items-center gap-3 px-2.5 py-2 rounded-lg border border-[var(--border)] shrink-0">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-[var(--text)] flex items-center gap-1">
              <Sparkles size={12} className={einfachModus ? "text-[var(--accent)]" : "text-slate-400"} />
              Einfachmodus
            </span>
            <span className="text-xs text-[var(--text2)]">
              {einfachModus ? 'Nur wesentliche Optionen' : 'Alle Details sichtbar'}
            </span>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={einfachModus}
            aria-label="Einfachmodus umschalten"
            onClick={() => setEinfachModus(!einfachModus)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-150 flex items-center px-0.5 cursor-pointer shrink-0 ${
              einfachModus ? 'bg-[var(--accent)]' : 'bg-[var(--border2)]'
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
      <div className="flex items-center gap-2 overflow-x-auto border-b border-[var(--border)] pb-1 no-scrollbar">
        <button
          onClick={() => setActiveCategory('overview')}
          className={`px-4 py-2.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeCategory === 'overview'
              ? 'bg-[var(--surface2)] text-[var(--text)] border border-[var(--border2)]'
              : 'hover:bg-[var(--surface2)] text-[var(--text2)] border border-transparent'
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
              className={`px-4 py-2.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                isActive
                  ? 'bg-[var(--surface2)] text-[var(--text)] border border-[var(--border2)]'
                  : 'hover:bg-[var(--surface2)] text-[var(--text2)] border border-transparent'
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
