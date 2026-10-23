import React from 'react';
import { 
  Sliders, 
  Palette, 
  LayoutGrid, 
  Smartphone, 
  Download, 
  Shield, 
  ArrowLeft, 
  Heart,
  Mail,
  HelpCircle,
} from 'lucide-react';

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
  activeCategory, setActiveCategory, einfachModus, setEinfachModus,
}: SettingsHeaderProps) {
  const labels: Record<SettingsCategory, string> = {
    overview: 'Einstellungen',
    account: 'Konto & Schulmail',
    general: 'Allgemein',
    display: 'Darstellung',
    modules: 'Module & Bereiche',
    sync: 'Smartboard & Synchronisierung',
    backup: 'Daten & Backup',
    support: 'Unterstützung',
    advanced: 'Erweitert & Sicherheit',
    help: 'Hilfe & Anleitungen',
  };

  return (
    <header className="space-y-5" data-testid="klassio-editorial-settings-header">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-[var(--border)] pb-5">
        <div className="flex min-w-0 items-center gap-3">
          {activeCategory !== 'overview' && (
            <button type="button" onClick={() => setActiveCategory('overview')}
              className="flex min-h-10 min-w-10 items-center justify-center rounded-lg text-[var(--text2)] hover:bg-[var(--surface2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring,var(--accent))]"
              aria-label="Zurück zur Übersicht" title="Zurück zur Übersicht">
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text)] sm:text-2xl">
            {labels[activeCategory]}
          </h1>
        </div>

        <button type="button" role="switch" aria-checked={einfachModus}
          aria-label="Einfachmodus umschalten" onClick={() => setEinfachModus(!einfachModus)}
          className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm font-medium text-[var(--text2)] hover:bg-[var(--surface2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring,var(--accent))]">
          <span>{einfachModus ? 'Einfachmodus' : 'Alle Optionen'}</span>
          <span aria-hidden="true"
            className={`relative h-6 w-11 rounded-full border transition-colors ${einfachModus
              ? 'border-[var(--accent)] bg-[var(--accent)]'
              : 'border-[var(--border2)] bg-[var(--surface3)]'}`}>
            <span className={`absolute top-[3px] h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${einfachModus ? 'translate-x-[23px]' : 'translate-x-[3px]'}`} />
          </span>
        </button>
      </div>

      <nav className="flex items-center gap-5 overflow-x-auto border-b border-[var(--border)] pb-0" aria-label="Einstellungsbereiche">
        {[{ id: 'overview' as SettingsCategory, label: 'Übersicht' }, ...CATEGORIES].map(cat => {
          const active = activeCategory === cat.id;
          return (
            <button key={cat.id} type="button" onClick={() => setActiveCategory(cat.id)}
              aria-current={active ? 'page' : undefined}
              className={`relative -mb-px min-h-11 shrink-0 border-b-2 px-1 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring,var(--accent))] ${active
                ? 'border-[var(--accent)] font-semibold text-[var(--text)]'
                : 'border-transparent font-medium text-[var(--text2)] hover:border-[var(--border2)] hover:text-[var(--text)]'}`}>
              {cat.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
