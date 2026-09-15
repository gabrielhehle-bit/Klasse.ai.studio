import React from 'react';
import { 
  Sliders, 
  Palette, 
  LayoutGrid, 
  Smartphone, 
  Download, 
  Shield, 
  ChevronRight,
  Info
} from 'lucide-react';
import { motion } from 'motion/react';
import { SettingsCategory } from './SettingsHeader';

interface SettingsDashboardProps {
  onSelectCategory: (category: SettingsCategory) => void;
  disabledModulesCount: number;
  hasActiveSync: boolean;
  hasDemoData: boolean;
}

export default function SettingsDashboard({
  onSelectCategory,
  disabledModulesCount,
  hasActiveSync,
  hasDemoData
}: SettingsDashboardProps) {
  const TILES = [
    {
      id: 'general' as SettingsCategory,
      title: 'Allgemein',
      subtitle: 'Schuljahr, Bundesland & Fach-Farben',
      desc: 'Konfiguriere das aktuelle Schuljahr, Ferientage deines Bundeslands, Fach-Farben und die Klassenglas-Ziele.',
      icon: Sliders,
      badge: 'Basis-Einstellungen',
      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
    },
    {
      id: 'display' as SettingsCategory,
      title: 'Darstellung',
      subtitle: 'Design, Schriftgröße & Whiteboard',
      desc: 'Passe Farben, Schriftgröße für Laptops/Smartboards, Whiteboard-Muster (Karos/Linien) und Board-Sichtbarkeit an.',
      icon: Palette,
      badge: 'Farben & Smartboard',
      color: 'bg-amber-500/10 text-amber-600 border-amber-200'
    },
    {
      id: 'modules' as SettingsCategory,
      title: 'Module & Bereiche',
      subtitle: 'Sichtbare Bereiche verwalten',
      desc: 'Blende Bereiche wie Kasse, Sitzplan oder Diagnostik ein oder aus, um die App noch übersichtlicher zu halten.',
      icon: LayoutGrid,
      badge: disabledModulesCount > 0 ? `${disabledModulesCount} ausgeblendet` : 'Alle aktiv',
      badgeColor: disabledModulesCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600',
      color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200'
    },
    {
      id: 'sync' as SettingsCategory,
      title: 'Synchronisierung',
      subtitle: 'Smartboard & Smartphone-Kopplung',
      desc: 'Steuere deine Klassio drahtlos vom Smartphone aus oder erstelle eine Live-Verbindung zum Smartboard.',
      icon: Smartphone,
      badge: hasActiveSync ? 'Kopplung aktiv' : 'Live-Sync',
      badgeColor: hasActiveSync ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600',
      color: 'bg-teal-500/10 text-teal-600 border-teal-200'
    },
    {
      id: 'backup' as SettingsCategory,
      title: 'Daten & Backup',
      subtitle: 'Sicherung, Import & App-Installation',
      desc: 'Exportiere eine Sicherungsdatei deiner Schülerdaten & Notizen, lade Backups oder installiere die App auf deinem Gerät.',
      icon: Download,
      badge: 'Sicherheit & Import',
      color: 'bg-blue-500/10 text-blue-600 border-blue-200'
    },
    {
      id: 'advanced' as SettingsCategory,
      title: 'Erweitert & Sicherheit',
      subtitle: 'Datenschutz & Gefahrenbereich',
      desc: 'Verwalte die Schülernamen-Anonymisierung für KI, führe System-Checks durch oder versetze die App in den Werkszustand.',
      icon: Shield,
      badge: hasDemoData ? 'Beispieldaten vorhanden' : 'Datenschutz & Pflege',
      badgeColor: hasDemoData ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600',
      color: 'bg-purple-500/10 text-purple-600 border-purple-200'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-[2rem] p-6 md:p-8 shadow-xl shadow-emerald-900/10 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-wider text-emerald-100">
            <Info size={14} />
            Übersichtliche Verwaltung
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight font-sans">
            Möchtest du Anpassungen an deiner Klassio vornehmen?
          </h2>
          <p className="text-sm text-emerald-100 font-medium leading-relaxed">
            Wähle unten einen der 6 Hauptbereiche aus. Änderungen werden im lokalen App-Datenstand gespeichert. Löschfunktionen sind getrennt im Gefahrenbereich abgesichert.
          </p>
        </div>

        {/* Decorative circle */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/5 pointer-events-none blur-2xl" />
      </div>

      {/* 6 Tiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {TILES.map((tile, idx) => {
          const Icon = tile.icon;
          return (
            <motion.button
              key={tile.id}
              onClick={() => onSelectCategory(tile.id)}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white hover:bg-slate-50/80 rounded-[2rem] border border-stone-200/80 p-6 text-left transition-all cursor-pointer group flex flex-col justify-between gap-6 shadow-sm hover:shadow-md hover:border-emerald-300 relative overflow-hidden"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${tile.color} transition-transform group-hover:scale-105`}>
                    <Icon size={22} />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[0.625rem] font-black uppercase tracking-wider ${tile.badgeColor || 'bg-slate-100 text-slate-600'}`}>
                    {tile.badge}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {tile.title}
                  </h3>
                  <p className="text-xs font-bold text-slate-500">
                    {tile.subtitle}
                  </p>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed pt-1">
                    {tile.desc}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs font-black uppercase tracking-wider text-slate-600 group-hover:text-emerald-600">
                <span>Bereich öffnen</span>
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
