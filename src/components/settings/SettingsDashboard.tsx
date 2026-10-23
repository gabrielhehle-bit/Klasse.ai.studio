import React from 'react';
import {
  Sliders, Palette, LayoutGrid, Smartphone, Download, Shield, Heart,
  ChevronRight, Mail, HelpCircle,
} from 'lucide-react';
import type { SettingsCategory } from './SettingsHeader';

interface SettingsDashboardProps {
  onSelectCategory: (category: SettingsCategory) => void;
  disabledModulesCount: number;
  hasActiveSync: boolean;
  hasDemoData: boolean;
}

export default function SettingsDashboard({
  onSelectCategory, disabledModulesCount, hasActiveSync, hasDemoData,
}: SettingsDashboardProps) {
  // Keep the existing order, names and destinations so experienced teachers
  // find each tool in precisely the same place as before the visual facelift.
  const TILES = [
    {
      id: 'help' as SettingsCategory,
      title: 'Hilfe & Anleitungen',
      subtitle: 'Alle Seiten und Unterrichtswerkzeuge erklärt',
      desc: 'Suche nach einem KLASSIO-Bereich oder Widget und lies Schritt für Schritt, was du damit machen kannst.',
      icon: HelpCircle,
    },
    {
      id: 'account' as SettingsCategory,
      title: 'Konto & Schulmail',
      subtitle: 'E-Mail-Anmeldung und Schulidentität',
      desc: 'Melde dich mit deiner E-Mail an. Eine verifizierte Schulmail schaltet Klassenteam und Lehrerzimmer frei.',
      icon: Mail,
    },
    {
      id: 'general' as SettingsCategory,
      title: 'Allgemein',
      subtitle: 'Schuljahr, Bundesland & Fach-Farben',
      desc: 'Konfiguriere das aktuelle Schuljahr, Ferientage deines Bundeslands, Fach-Farben und die Klassenglas-Ziele.',
      icon: Sliders,
    },
    {
      id: 'display' as SettingsCategory,
      title: 'Darstellung',
      subtitle: 'Design, Schriftgröße & Cockpit',
      desc: 'Passe Farbschema, Schriftgröße und die Darstellung auf Laptop oder Smartboard an. Das Lehrercockpit bleibt eine weiße Smartboard-Fläche mit Widgets.',
      icon: Palette,
    },
    {
      id: 'modules' as SettingsCategory,
      title: 'Module & Bereiche',
      subtitle: 'Sichtbare Bereiche verwalten',
      desc: 'Blende Bereiche wie Kasse, Sitzplan oder Diagnostik ein oder aus, um die App noch übersichtlicher zu halten.',
      icon: LayoutGrid,
      status: disabledModulesCount > 0 ? `${disabledModulesCount} ausgeblendet` : 'Alle aktiv',
    },
    {
      id: 'sync' as SettingsCategory,
      title: 'Synchronisierung',
      subtitle: 'Smartboard & Smartphone-Kopplung',
      desc: 'Steuere deine Klassio drahtlos vom Smartphone aus oder erstelle eine Live-Verbindung zum Smartboard.',
      icon: Smartphone,
      status: hasActiveSync ? 'Kopplung aktiv' : 'Live-Sync',
    },
    {
      id: 'backup' as SettingsCategory,
      title: 'Daten & Backup',
      subtitle: 'Sicherung, Import & App-Installation',
      desc: 'Exportiere eine Sicherungsdatei deiner Schülerdaten & Notizen, lade Backups oder installiere die App auf deinem Gerät.',
      icon: Download,
    },
    {
      id: 'support' as SettingsCategory,
      title: 'Unterstützung',
      subtitle: 'Freiwillige Beiträge & Dankesliste',
      desc: 'Unterstütze den laufenden Serverbetrieb freiwillig und sieh, wer mit Zustimmung auf der Dankesliste steht.',
      icon: Heart,
    },
    {
      id: 'advanced' as SettingsCategory,
      title: 'Erweitert & Sicherheit',
      subtitle: 'Datenschutz & Gefahrenbereich',
      desc: 'Verwalte die Schülernamen-Anonymisierung für KI, führe System-Checks durch oder versetze die App in den Werkszustand.',
      icon: Shield,
      status: hasDemoData ? 'Beispieldaten vorhanden' : undefined,
    },
  ];

  return (
    <div className="space-y-5" data-testid="klassio-editorial-settings">
      <header className="border-b border-[var(--border)] pb-5">
        <p className="text-xs font-medium tracking-wide text-[var(--accent-ink,var(--accent))]">DEIN KLASSIO</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--text)] sm:text-2xl">
          Einstellungen im Überblick
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--text2)]">
          Alle Bereiche sind am gewohnten Platz. Änderungen werden im lokalen App-Datenstand gespeichert.
          Löschfunktionen sind getrennt im Gefahrenbereich abgesichert.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
        aria-label="Einstellungsbereiche">
        {TILES.map(tile => {
          const Icon = tile.icon;
          return (
            <button key={tile.id} type="button" onClick={() => onSelectCategory(tile.id)}
              className="group flex min-h-[175px] flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-left transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring,var(--accent))]"
              data-settings-destination={tile.id}>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <Icon size={19} strokeWidth={1.75} className="text-[var(--text2)]" aria-hidden="true" />
                  {'status' in tile && tile.status && (
                    <span className="text-xs font-medium text-[var(--text2)]">{tile.status}</span>
                  )}
                </div>
                <h3 className="mt-4 text-base font-semibold tracking-tight text-[var(--text)]">{tile.title}</h3>
                <p className="mt-1 text-xs font-medium text-[var(--text2)]">{tile.subtitle}</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text3)]">{tile.desc}</p>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-3 text-xs font-semibold text-[var(--text2)]">
                <span>Bereich öffnen</span>
                <ChevronRight size={17} strokeWidth={1.6} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
