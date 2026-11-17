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
  { id: 'sync', label: 'Smartboard', icon: Smartphone, shortDesc: 'Nur Smartboard & Fernbedienung' },
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
  // Keep a deep-linked section visible in the tabs, even when normally hidden by easy mode.
  const visibleCategories = einfachModus
    ? CATEGORIES.filter(cat => (cat.id !== 'advanced' && cat.id !== 'support') || cat.id === activeCategory)
    : CATEGORIES;
  const navRef = React.useRef<HTMLElement>(null);

  // On a narrow phone the active tab may otherwise be offscreen after selecting a category.
  React.useEffect(() => {
    const nav = navRef.current;
    const activeTab = nav?.querySelector<HTMLButtonElement>('[aria-current="page"]');
    if (!nav || !activeTab) return;
    const bounds = nav.getBoundingClientRect();
    const tabBounds = activeTab.getBoundingClientRect();
    if (tabBounds.left < bounds.left + 8) {
      nav.scrollBy({ left: tabBounds.left - bounds.left - 8, behavior: 'auto' });
    } else if (tabBounds.right > bounds.right - 8) {
      nav.scrollBy({ left: tabBounds.right - bounds.right + 8, behavior: 'auto' });
    }
  }, [activeCategory, einfachModus]);

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
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="text-xl md:text-2xl font-semibold text-[var(--text)] tracking-tight font-sans break-words">
                {activeCategory === 'overview' && 'Einstellungen'}
                {activeCategory === 'account' && 'Konto & Schulmail'}
                {activeCategory === 'general' && 'Allgemeine Einstellungen'}
                {activeCategory === 'display' && 'Darstellung & Cockpit'}
                {activeCategory === 'modules' && 'Module & Bereiche'}
                {activeCategory === 'sync' && 'Smartboard & Fernbedienung'}
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
              <Sliders size={14} aria-hidden="true" className="text-[var(--text2)]" />
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
            className="relative flex min-h-11 w-12 shrink-0 cursor-pointer items-center rounded-lg px-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <span aria-hidden="true" className={`pointer-events-none absolute inset-x-0 top-1/2 h-6 -translate-y-1/2 rounded-full transition-colors duration-150 ${einfachModus ? 'bg-[var(--accent)]' : 'bg-[var(--border2)]'}`} />
            <motion.div
              aria-hidden="true"
              animate={{ x: einfachModus ? 24 : 0 }}
              className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] shadow-sm"
            >
              {einfachModus && <Check size={12} className="text-amber-600 stroke-[3]" />}
            </motion.div>
          </button>
        </div>
      </div>

      {/* On narrow phones, a native picker makes every section discoverable
          without requiring teachers to spot a horizontally hidden tab. */}
      <div className="space-y-2 sm:hidden" data-testid="settings-mobile-section-picker">
        <label htmlFor="klassio-settings-mobile-category"
          className="block text-sm font-semibold text-[var(--text)]">
          Einstellungsbereich auswählen
        </label>
        <select
          id="klassio-settings-mobile-category"
          aria-label="Einstellungsbereich auswählen"
          value={activeCategory}
          onChange={(event) => setActiveCategory(event.target.value as SettingsCategory)}
          className="block min-h-12 w-full rounded-xl border border-[var(--border2)] bg-[var(--surface)] px-3 py-2.5 text-base font-medium text-[var(--text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring,var(--accent))]"
        >
          <option value="overview">Übersicht</option>
          {visibleCategories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.label}</option>
          ))}
        </select>
        <p className="text-xs leading-relaxed text-[var(--text2)]">
          Wähle einen Bereich. Deine Änderungen bleiben beim Wechsel erhalten.
        </p>
      </div>

      {/* Pill Navigation */}
      <nav ref={navRef} aria-label="Einstellungen: Bereiche" className="hidden sm:flex items-center gap-2 overflow-x-auto border-b border-[var(--border)] pb-1 no-scrollbar">
        <button
          type="button"
          aria-current={activeCategory === 'overview' ? 'page' : undefined}
          onClick={() => setActiveCategory('overview')}
          className={`min-h-11 px-4 py-2.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeCategory === 'overview'
              ? 'bg-[var(--surface2)] text-[var(--text)] border border-[var(--border2)]'
              : 'hover:bg-[var(--surface2)] text-[var(--text2)] border border-transparent'
          }`}
        >
          <span>Übersicht</span>
        </button>

        {visibleCategories.map(cat => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => setActiveCategory(cat.id)}
              className={`min-h-11 px-4 py-2.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
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
      </nav>
      {einfachModus && <p className="text-xs text-[var(--text2)]">Weitere Optionen findest du auf der Übersicht oder über „Alle Optionen“.</p>}
    </div>
  );
}
