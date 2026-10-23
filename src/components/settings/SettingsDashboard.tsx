import React from 'react';
import {
  Sliders, Palette, LayoutGrid, Smartphone, Download,
  Shield, Heart, ChevronRight, Mail, HelpCircle,
} from 'lucide-react';
import type { SettingsCategory } from './SettingsHeader';

interface SettingsDashboardProps {
  onSelectCategory: (category: SettingsCategory) => void;
  disabledModulesCount: number;
  hasActiveSync: boolean;
  hasDemoData: boolean;
}

type SettingEntry = {
  id: SettingsCategory;
  title: string;
  description: string;
  icon: typeof Sliders;
  status?: string;
};

export default function SettingsDashboard({
  onSelectCategory, disabledModulesCount, hasActiveSync, hasDemoData,
}: SettingsDashboardProps) {
  const entries: SettingEntry[] = [
    { id: 'general', title: 'Allgemein', description: 'Schuljahr, Ferientage, Fächer und Klassenglas.', icon: Sliders },
    { id: 'display', title: 'Darstellung', description: 'Schrift, Kontrast, Arbeitsflächen und Smartboard.', icon: Palette },
    { id: 'modules', title: 'Module & Bereiche', description: 'Entscheide, welche Werkzeuge du sehen möchtest.', icon: LayoutGrid,
      status: disabledModulesCount > 0 ? `${disabledModulesCount} ausgeblendet` : undefined },
    { id: 'account', title: 'Konto & Schulmail', description: 'Deine Anmeldung, Schulzugehörigkeit und Geräte.', icon: Mail },
    { id: 'sync', title: 'Smartboard & Kopplung', description: 'Smartphone und Smartboard miteinander verbinden.', icon: Smartphone,
      status: hasActiveSync ? 'Kopplung aktiv' : undefined },
    { id: 'backup', title: 'Daten & Backup', description: 'Verschlüsselte Sicherungen, Wiederherstellung und Installation.', icon: Download },
    { id: 'help', title: 'Hilfe & Anleitungen', description: 'Antworten und Schritt-für-Schritt-Hilfe zu KLASSIO.', icon: HelpCircle },
    { id: 'support', title: 'Unterstützung', description: 'Freiwillige Beiträge für den laufenden Betrieb.', icon: Heart },
    { id: 'advanced', title: 'Erweitert & Sicherheit', description: 'Datenschutz, Diagnose und geschützte Löschfunktionen.', icon: Shield,
      status: hasDemoData ? 'Beispieldaten vorhanden' : undefined },
  ];

  const sections: Array<{ label: string; detail: string; ids: SettingsCategory[] }> = [
    { label: 'Arbeitsplatz', detail: 'So arbeitest du mit KLASSIO.',
      ids: ['general', 'display', 'modules'] },
    { label: 'Verbindungen & Daten', detail: 'Zugang und Datenstand im Blick.',
      ids: ['account', 'sync', 'backup'] },
    { label: 'Wissenswertes', detail: 'Unterstützung und Verwaltung.',
      ids: ['help', 'support', 'advanced'] },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl pb-8 text-[var(--text)]" data-testid="klassio-editorial-settings">
      <div className="max-w-2xl pb-8 pt-1 sm:pb-10">
        <p className="mb-3 text-xs font-semibold tracking-[0.1em] text-[var(--accent-ink,var(--accent))]">
          KLASSIO / Verwaltung
        </p>
        <h2 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
          Dein Unterricht. Deine Einstellungen.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text2)] sm:text-base">
          Hier passt du deinen Arbeitsplatz an. Änderungen werden im lokalen App-Datenstand gespeichert.
          Löschfunktionen sind getrennt im Gefahrenbereich abgesichert.
        </p>
      </div>

      <div className="border-t border-[var(--border)]">
        {sections.map(section => (
          <section key={section.label}
            className="grid gap-4 border-b border-[var(--border)] py-7 sm:grid-cols-[minmax(150px,0.85fr)_minmax(0,2fr)] sm:gap-10 sm:py-9"
            aria-label={section.label}>
            <div className="sm:pt-1">
              <h3 className="text-base font-semibold tracking-tight text-[var(--text)]">{section.label}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--text3)]">{section.detail}</p>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {section.ids.map(id => {
                const entry = entries.find(item => item.id === id);
                if (!entry) return null;
                const Icon = entry.icon;
                return (
                  <button key={entry.id} type="button" onClick={() => onSelectCategory(entry.id)}
                    className="group flex min-h-[76px] w-full items-start gap-4 py-4 text-left transition-colors first:pt-1 hover:text-[var(--accent-ink,var(--accent))] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring,var(--accent))] sm:gap-5"
                    aria-label={entry.title}>
                    <Icon size={19} strokeWidth={1.75} aria-hidden="true"
                      className="mt-1 shrink-0 text-[var(--text3)] transition-colors group-hover:text-[var(--accent-ink,var(--accent))]" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="text-[0.9375rem] font-semibold leading-6 text-[var(--text)] group-hover:text-[var(--accent-ink,var(--accent))]">
                          {entry.title}
                        </span>
                        {entry.status && (
                          <span className="text-xs font-medium text-[var(--text2)]">{entry.status}</span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-sm leading-relaxed text-[var(--text2)]">{entry.description}</span>
                    </span>
                    <ChevronRight size={18} strokeWidth={1.6} aria-hidden="true"
                      className="mt-1 shrink-0 text-[var(--text3)] transition-transform group-hover:translate-x-0.5" />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
