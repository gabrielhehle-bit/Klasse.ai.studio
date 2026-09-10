import React, { useState } from 'react';
import { 
  Button, 
  IconButton, 
  SegmentedControl, 
  Badge, 
  Chip, 
  Input, 
  Select, 
  Textarea 
} from './index';
import { 
  Plus, 
  Trash2, 
  Settings, 
  Check, 
  Sparkles, 
  AlertTriangle, 
  Info, 
  Search,
  Eye,
  Sliders
} from 'lucide-react';
import { UNTERRICHTSMODUS_THEMES } from '../../lib/unterrichtsmodusThemes';
import { UnterrichtsmodusThemeId } from '../../types';

/**
 * Interne Development-Vorschau für das LehrerAPP Designsystem (F-DS2).
 * Ermöglicht das Testen aller semantischen Komponenten über jedes aktive Theme.
 * Nicht im regulären Produktiv-Menü verlinkt.
 */
export function DesignSystemPreview() {
  const [selectedTheme, setSelectedTheme] = useState<UnterrichtsmodusThemeId>('classic_light');
  const [activeTab, setActiveTab] = useState<string>('buttons');
  const [inputText, setInputText] = useState('Semantischer Text');
  const [inputError, setInputError] = useState(false);
  const [chipSelected, setChipSelected] = useState(true);

  const applyTheme = (themeId: UnterrichtsmodusThemeId) => {
    setSelectedTheme(themeId);
    document.documentElement.setAttribute('data-style', themeId);
    document.documentElement.setAttribute('data-theme', themeId === 'deep_dark' ? 'dark' : 'light');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 bg-[var(--surface-app,var(--bg))] min-h-screen text-[var(--text-primary,var(--text))]">
      {/* Header & Theme Switcher */}
      <div className="bg-[var(--surface-card,var(--surface))] p-6 rounded-2xl border border-[var(--border-default,var(--border2))] shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              <Sliders className="w-6 h-6 text-[var(--accent)]" />
              LehrerAPP Designsystem (F-DS2)
            </h1>
            <p className="text-sm text-[var(--text-secondary,var(--text2))]">
              Semantische Komponenten & Design-Tokens Vorschau
            </p>
          </div>

          <Badge variant="accent" size="md">F-DS2 Aktiv</Badge>
        </div>

        {/* Theme Picker */}
        <div className="space-y-2 pt-2">
          <label className="text-xs font-bold text-[var(--text-muted,var(--text3))] uppercase tracking-wider">
            Theme Live-Umschaltung
          </label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(UNTERRICHTSMODUS_THEMES) as UnterrichtsmodusThemeId[]).map((tId) => (
              <Button
                key={tId}
                size="sm"
                variant={selectedTheme === tId ? 'selected' : 'secondary'}
                onClick={() => applyTheme(tId)}
              >
                {UNTERRICHTSMODUS_THEMES[tId]?.label || tId}
              </Button>
            ))}
          </div>
        </div>

        {/* Tab Navigation */}
        <SegmentedControl
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: 'buttons', label: 'Buttons & Icons' },
            { value: 'inputs', label: 'Inputs & Formulare' },
            { value: 'badges', label: 'Badges & Chips' },
            { value: 'surfaces', label: 'Surfaces & Tokens' },
          ]}
        />
      </div>

      {/* Tab: Buttons & Icons */}
      {activeTab === 'buttons' && (
        <div className="space-y-6">
          {/* Button Variants */}
          <div className="bg-[var(--surface-card,var(--surface))] p-6 rounded-2xl border border-[var(--border-default,var(--border2))] space-y-4">
            <h2 className="text-lg font-bold">Button-Varianten</h2>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="selected">Selected</Button>
              <Button variant="success">Success</Button>
              <Button variant="warning">Warning</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="primary" disabled>Disabled</Button>
            </div>
          </div>

          {/* Button Sizes */}
          <div className="bg-[var(--surface-card,var(--surface))] p-6 rounded-2xl border border-[var(--border-default,var(--border2))] space-y-4">
            <h2 className="text-lg font-bold">Button-Größen & Touch-Flächen</h2>
            <div className="flex flex-wrap items-end gap-3">
              <Button size="sm" variant="primary">Small (34px)</Button>
              <Button size="md" variant="primary">Medium (44px WCAG)</Button>
              <Button size="lg" variant="primary">Large (52px)</Button>
              <Button size="md" variant="primary" isLoading>Lädt...</Button>
              <Button size="md" variant="secondary" leftIcon={<Plus className="w-4 h-4" />}>
                Mit Icon
              </Button>
            </div>
          </div>

          {/* IconButtons */}
          <div className="bg-[var(--surface-card,var(--surface))] p-6 rounded-2xl border border-[var(--border-default,var(--border2))] space-y-4">
            <h2 className="text-lg font-bold">IconButton (quadratisch, min 44x44 px)</h2>
            <div className="flex flex-wrap items-center gap-3">
              <IconButton aria-label="Einstellungen" variant="ghost" icon={<Settings className="w-5 h-5" />} />
              <IconButton aria-label="Hinzufügen" variant="secondary" icon={<Plus className="w-5 h-5" />} />
              <IconButton aria-label="Aktiv" variant="primary" icon={<Check className="w-5 h-5" />} />
              <IconButton aria-label="Ausgewählt" variant="selected" icon={<Sparkles className="w-5 h-5" />} />
              <IconButton aria-label="Löschen" variant="danger" icon={<Trash2 className="w-5 h-5" />} />
              <IconButton aria-label="Deaktiviert" variant="ghost" disabled icon={<Settings className="w-5 h-5" />} />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Inputs & Formulare */}
      {activeTab === 'inputs' && (
        <div className="bg-[var(--surface-card,var(--surface))] p-6 rounded-2xl border border-[var(--border-default,var(--border2))] space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">Formulareingaben</h2>
            <Button size="sm" variant="secondary" onClick={() => setInputError(!inputError)}>
              Fehler umschalten: {inputError ? 'Aktiv' : 'Inaktiv'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Standard Textfeld"
              placeholder="Eingabeaufforderung..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              helperText="Nutzt semantische Border- und Focus-Tokens"
              error={inputError ? 'Ungültiger Wert eingegeben!' : undefined}
              leftIcon={<Search className="w-4 h-4" />}
            />

            <Input
              label="Deaktiviertes Feld"
              disabled
              value="Deaktivierter Inhalt"
              helperText="opacity-50 & cursor-not-allowed"
            />

            <Select
              label="Auswahlfeld (Select)"
              options={[
                { value: 'opt1', label: 'Mathematik 3a' },
                { value: 'opt2', label: 'Deutsch 3a' },
                { value: 'opt3', label: 'Sachunterricht 3a' },
              ]}
              error={inputError ? 'Pflichtfeld auswählen' : undefined}
            />

            <div className="md:col-span-2">
              <Textarea
                label="Notizen / Beschreibung"
                placeholder="Mehrzeiliger Textbereich..."
                rows={3}
                helperText="Standardisiert auf dieselben Oberflächen und Fokusringe"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Badges & Chips */}
      {activeTab === 'badges' && (
        <div className="space-y-6">
          <div className="bg-[var(--surface-card,var(--surface))] p-6 rounded-2xl border border-[var(--border-default,var(--border2))] space-y-4">
            <h2 className="text-lg font-bold">Semantische Badges</h2>
            <div className="flex flex-wrap gap-2">
              <Badge variant="neutral">Neutral</Badge>
              <Badge variant="accent">Accent</Badge>
              <Badge variant="success" icon={<Check className="w-3.5 h-3.5" />}>Success</Badge>
              <Badge variant="warning" icon={<AlertTriangle className="w-3.5 h-3.5" />}>Warning</Badge>
              <Badge variant="danger" icon={<Trash2 className="w-3.5 h-3.5" />}>Danger</Badge>
              <Badge variant="info" icon={<Info className="w-3.5 h-3.5" />}>Info</Badge>
            </div>
          </div>

          <div className="bg-[var(--surface-card,var(--surface))] p-6 rounded-2xl border border-[var(--border-default,var(--border2))] space-y-4">
            <h2 className="text-lg font-bold">Interaktive Chips</h2>
            <div className="flex flex-wrap gap-2">
              <Chip
                selected={chipSelected}
                onClick={() => setChipSelected(!chipSelected)}
              >
                Auswählbar ({chipSelected ? 'Aktiv' : 'Inaktiv'})
              </Chip>
              <Chip variant="accent" onDismiss={() => alert('Entfernt')}>Mit Schließen</Chip>
              <Chip variant="success">Erledigt</Chip>
              <Chip variant="danger" onDismiss={() => alert('Gelöscht')}>Dringend</Chip>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Surfaces & Tokens */}
      {activeTab === 'surfaces' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[var(--surface-card,var(--surface))] border border-[var(--border-default,var(--border2))]">
              <div className="text-xs font-bold text-[var(--text-muted,var(--text3))]">surfaceCard</div>
              <div className="text-sm font-semibold">Standard Kartenoberfläche</div>
            </div>
            <div className="p-4 rounded-xl bg-[var(--surface-subtle,var(--surface2))] border border-[var(--border-default,var(--border2))]">
              <div className="text-xs font-bold text-[var(--text-muted,var(--text3))]">surfaceSubtle</div>
              <div className="text-sm font-semibold">Leicht abgesetzte Fläche</div>
            </div>
            <div className="p-4 rounded-xl bg-[var(--surface-muted,var(--surface3))] border border-[var(--border-default,var(--border2))]">
              <div className="text-xs font-bold text-[var(--text-muted,var(--text3))]">surfaceMuted</div>
              <div className="text-sm font-semibold">Gedämpfte Fläche</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--surface-card,var(--surface))] border border-[var(--border-default,var(--border2))] space-y-2">
            <div className="text-xs font-bold text-[var(--text-muted,var(--text3))]">Text-Tokens</div>
            <div className="text-base font-bold text-[var(--text-primary,var(--text))]">textPrimary: Hauptüberschriften und Lesetext</div>
            <div className="text-sm text-[var(--text-secondary,var(--text2))]">textSecondary: Sekundäre Beschreibungen</div>
            <div className="text-xs text-[var(--text-muted,var(--text3))]">textMuted: Gedämpfte Hinweise und Fußnoten</div>
          </div>
        </div>
      )}
    </div>
  );
}
