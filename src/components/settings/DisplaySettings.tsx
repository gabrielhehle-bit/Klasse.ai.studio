import React from 'react';
import { 
  Palette, 
  Monitor, 
  Smartphone, 
  Type, 
  Sliders, 
  Check,
  Clock,
  LayoutGrid,
  Sparkles,
  ArrowRight,
  PenTool
} from 'lucide-react';
import { motion } from 'motion/react';
import { AESTHETIC_THEMES } from '../../constants';

interface DisplaySettingsProps {
  app: any;
  setApp: React.Dispatch<React.SetStateAction<any>>;
  einfachModus: boolean;
}

export default function DisplaySettings({
  app,
  setApp,
  einfachModus
}: DisplaySettingsProps) {
  const currentZoom = app.settings?.zoomLevel || 'standard';

  return (
    <div className="space-y-8">
      {/* Theme Selection */}
      <div className="bg-white rounded-[2.5rem] border border-stone-200/80 p-6 md:p-8 space-y-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-stone-150 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
            <Palette size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Farbschema & Erscheinungsbild</h2>
            <p className="text-xs text-slate-500 font-medium">Wähle dein Lieblings-Design für die gesamte Anwendung.</p>
          </div>
        </div>

        {/* Preset Theme Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {AESTHETIC_THEMES.map(theme => {
            const isActive = (app.theme || 'classic_light') === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => setApp((prev: any) => ({ ...prev, theme: theme.id as any }))}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between gap-3 ${
                  isActive
                    ? 'border-emerald-600 bg-emerald-50/20 ring-4 ring-emerald-600/10 shadow-sm'
                    : 'border-stone-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">{theme.label}</span>
                  {isActive && (
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </div>

                <div className={`w-full h-8 rounded-xl ${theme.color}`} />
              </button>
            );
          })}
        </div>

        {/* Extended Custom Theme Color Controls (only if Einfachmodus is OFF) */}
        {!einfachModus && (
          <div className="pt-6 border-t border-stone-150 space-y-4">
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-amber-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Erweiterte Farbanpassung</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-50 rounded-2xl border border-stone-200 space-y-1">
                <label className="text-[0.625rem] font-black uppercase text-slate-500">Hintergrund</label>
                <input 
                  type="color" 
                  value={app.customBgColor || '#f8fafc'}
                  onChange={(e) => setApp((prev: any) => ({ ...prev, customBgColor: e.target.value }))}
                  className="w-full h-8 rounded-xl cursor-pointer border border-stone-200 p-0"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-stone-200 space-y-1">
                <label className="text-[0.625rem] font-black uppercase text-slate-500">Haupttext</label>
                <input 
                  type="color" 
                  value={app.customTextColor || '#121212'}
                  onChange={(e) => setApp((prev: any) => ({ ...prev, customTextColor: e.target.value }))}
                  className="w-full h-8 rounded-xl cursor-pointer border border-stone-200 p-0"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-stone-200 space-y-1">
                <label className="text-[0.625rem] font-black uppercase text-slate-500">Sekundärtext</label>
                <input 
                  type="color" 
                  value={app.customText2Color || '#4b5563'}
                  onChange={(e) => setApp((prev: any) => ({ ...prev, customText2Color: e.target.value }))}
                  className="w-full h-8 rounded-xl cursor-pointer border border-stone-200 p-0"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-stone-200 space-y-1">
                <label className="text-[0.625rem] font-black uppercase text-slate-500">Akzentfarbe</label>
                <input 
                  type="color" 
                  value={app.customAccentColor || '#10b981'}
                  onChange={(e) => setApp((prev: any) => ({ ...prev, customAccentColor: e.target.value }))}
                  className="w-full h-8 rounded-xl cursor-pointer border border-stone-200 p-0"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Schriftart: personal app preference, independent of the class content and accent color. */}
      <section className="bg-white rounded-[2.5rem] border border-stone-200/80 p-6 md:p-8 space-y-4 shadow-sm" aria-labelledby="klassio-font-heading">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center"><Type size={20} /></div>
          <div>
            <h2 id="klassio-font-heading" className="text-base font-black text-slate-900">Schriftart auswählen</h2>
            <p className="text-xs text-slate-500">Ändere die Schrift für deine KLASSIO-Oberfläche, ohne Unterrichtsdaten oder Farben zu verändern.</p>
          </div>
        </div>
        <label htmlFor="klassio-display-font" className="block text-sm font-bold text-slate-800">Schriftart der Anwendung</label>
        <select id="klassio-display-font" value={app.settings?.fontFamily || 'standard'}
          onChange={(event) => setApp((prev: any) => ({ ...prev, settings: { ...prev.settings, fontFamily: event.target.value } }))}
          className="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500">
          <option value="standard">Standard · Systemschrift</option>
          <option value="geometric">Geometrisch · Outfit</option>
          <option value="friendly">Freundlich · Fredoka</option>
          <option value="druckschrift">Druckschrift · Schule</option>
          <option value="schulschrift">Schulschrift</option>
          <option value="dyslexic">Lesefreundlich · Lexend</option>
          <option value="comfort">Rund · Comfortaa</option>
          <option value="handwritten">Handschrift</option>
          <option value="elegant">Elegant</option>
          <option value="serif">Serif</option>
          <option value="mono">Monospace</option>
        </select>
        <div className={`rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 font-${app.settings?.fontFamily || 'standard'}`}
          aria-label="Schriftart-Vorschau">Die Kinder lesen, schreiben und rechnen. 123 · ABC</div>
        <label htmlFor="klassio-board-font" className="block text-sm font-bold text-slate-800">Schriftart der digitalen Tafel</label>
        <select id="klassio-board-font" value={app.boardSettings?.activeFont || 'font-standard'}
          onChange={(event) => setApp((prev: any) => ({ ...prev, boardSettings: { ...prev.boardSettings, activeFont: event.target.value } }))}
          className="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500">
          <option value="font-standard">Standard</option>
          <option value="font-sans">Klare Druckschrift</option>
          <option value="font-druckschrift">Druckschrift (Schule)</option>
          <option value="font-schulschrift">Schulschrift</option>
          <option value="font-dyslexic">Lesefreundliche Schrift</option>
        </select>
        <p className="text-xs text-slate-500">Die Tafelschrift kannst du weiterhin unter „Farben & Design“ im Lehrercockpit ändern.</p>
      </section>

      {/* Schriftgröße & Anzeige-Modus */}
      <div className="bg-white rounded-[2.5rem] border border-stone-200/80 p-6 md:p-8 space-y-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-stone-150 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
            <Monitor size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Schriftgröße & Display-Modus</h2>
            <p className="text-xs text-slate-500 font-medium">Optimiere die Anzeige für Laptop, Desktop oder Smartboard.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { id: 'compact', label: 'Kompakt', desc: '14px • Laptop (Admin)', icon: Smartphone },
            { id: 'standard', label: 'Standard', desc: '16px • Desktop (Normal)', icon: Monitor },
            { id: 'large', label: 'Groß', desc: '20px • Smartboard', icon: Type }
          ].map(mode => {
            const Icon = mode.icon;
            const isActive = currentZoom === mode.id;

            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setApp((prev: any) => ({
                  ...prev,
                  settings: { ...prev.settings, zoomLevel: mode.id as any }
                }))}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center text-center gap-3 ${
                  isActive
                    ? 'border-emerald-600 bg-emerald-50/30 ring-4 ring-emerald-600/10'
                    : 'border-stone-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  isActive ? 'bg-emerald-600 text-white shadow-md' : 'bg-stone-100 text-slate-500'
                }`}>
                  <Icon size={20} />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-slate-900">{mode.label}</div>
                  <div className="text-[0.625rem] font-bold text-slate-400">{mode.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cockpit-Hinweis */}
      <div className="bg-white rounded-[2.5rem] border border-stone-200/80 p-6 md:p-8 space-y-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center">
            <PenTool size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Weiße Arbeitsfläche im Lehrercockpit</h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Das Lehrercockpit öffnet sofort eine weiße Arbeitsfläche. Texte, Stiftzeichnungen und Widgets werden direkt in Klassio auf derselben Fläche verwendet und bleiben klassenbezogen gespeichert.
            </p>
          </div>
        </div>
      </div>

      {/* Dashboard: Struktur & Vorschau-Zeiten Card */}
      <div className="bg-white rounded-[2.5rem] border border-stone-200/80 p-6 md:p-8 space-y-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-150 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
              <LayoutGrid size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Dashboard: Struktur &amp; Vorschau-Zeiten</h2>
              <p className="text-xs text-slate-500 font-medium">Passe Zonen, Widgets und automatische Stundenplan-Vorschauen an.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setApp((prev: any) => ({ ...prev, currentPage: 'dashboard' }));
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('open-dashboard-customize'));
              }, 100);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-3xs active:scale-95 shrink-0"
          >
            <Sliders size={14} />
            <span>Jetzt anpassen</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-stone-200 space-y-2">
            <div className="flex items-center gap-2 text-indigo-700 font-black text-xs">
              <Clock size={15} />
              <span>Vorschau-Verhalten</span>
            </div>
            <p className="text-[0.6875rem] text-slate-500 leading-relaxed font-medium">
              Wähle, ob der Stundenplan starr Heute, starr Morgen oder zeitgesteuert automatisch auf den nächsten Tag wechselt.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-stone-200 space-y-2">
            <div className="flex items-center gap-2 text-indigo-700 font-black text-xs">
              <Sparkles size={15} />
              <span>Zonen &amp; Widgets</span>
            </div>
            <p className="text-[0.6875rem] text-slate-500 leading-relaxed font-medium">
              Zone 1 (Unterricht &amp; Tag), Zone 2 (Fokus &amp; To-Dos) und Zone 3 (Planung &amp; Auswertungen) flexibel ein- und ausblenden.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
