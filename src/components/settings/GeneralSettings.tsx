import React, { useState } from 'react';
import { 
  Sliders, 
  Calendar, 
  BookOpen, 
  Palette, 
  Sparkles, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp, 
  School,
  User,
  Info,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { getFerien, Bundesland, BUNDESLAND_NAMEN } from '../../lib/ferienOesterreich';
import { COLOR_OPTIONS, FAECHER_ALLE } from '../../constants';
import { FachColorPicker } from '../FachColorPicker';
import { getFachHexColor, isHexColor, COLOR_PRESET_OPTIONS } from '../../lib/fachColorUtils';

interface GeneralSettingsProps {
  app: any;
  setApp: React.Dispatch<React.SetStateAction<any>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  einfachModus: boolean;
  onOpenDeleteClassModal?: () => void;
}

export default function GeneralSettings({
  app,
  setApp,
  showToast,
  einfachModus,
  onOpenDeleteClassModal
}: GeneralSettingsProps) {
  const [showSubjectColors, setShowSubjectColors] = useState(false);

  const toggleHoliday = (holidayId: string) => {
    setApp((prev: any) => {
      const currentDisabled = prev.calendarSettings?.disabledHolidays || [];
      const isAlreadyDisabled = currentDisabled.includes(holidayId);
      const nextDisabled = isAlreadyDisabled
        ? currentDisabled.filter((id: string) => id !== holidayId)
        : [...currentDisabled, holidayId];

      return {
        ...prev,
        calendarSettings: {
          ...prev.calendarSettings,
          disabledHolidays: nextDisabled
        }
      };
    });
  };

  return (
    <div className="space-y-8">
      {/* Stammdaten: Schule & Schuljahr */}
      <div className="bg-white rounded-[2.5rem] border border-stone-200/80 p-6 md:p-8 space-y-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-stone-150 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
            <School size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Stammdaten & Schuljahr</h2>
            <p className="text-xs text-slate-500 font-medium">Grundlegende Angaben zu deiner Person und deiner Schule.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Schuljahr Select/Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700">Aktuelles Schuljahr</label>
            <select
              value={app.schuljahr || '2025/26'}
              onChange={(e) => setApp((prev: any) => ({ ...prev, schuljahr: e.target.value }))}
              className="w-full h-11 px-4 bg-slate-50 border border-stone-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            >
              <option value="2024/25">2024/25</option>
              <option value="2025/26">2025/26 (Aktuell)</option>
              <option value="2026/27">2026/27</option>
            </select>
          </div>

          {/* Lehrkraft Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700">Name der Lehrkraft</label>
            <input
              type="text"
              value={app.lehrerName || ''}
              placeholder="z.B. Frau / Herr Müller"
              onChange={(e) => setApp((prev: any) => ({ ...prev, lehrerName: e.target.value }))}
              className="w-full h-11 px-4 bg-slate-50 border border-stone-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          {/* Schulname */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700">Schulname / Volksschule</label>
            <input
              type="text"
              value={app.schulName || ''}
              placeholder="z.B. VS Musterstadt"
              onChange={(e) => setApp((prev: any) => ({ ...prev, schulName: e.target.value }))}
              className="w-full h-11 px-4 bg-slate-50 border border-stone-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* Bundesland & Schulkalender */}
      <div className="bg-white rounded-[2.5rem] border border-stone-200/80 p-6 md:p-8 space-y-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-stone-150 pb-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Bundesland & Ferientage</h2>
              <p className="text-xs text-slate-500 font-medium">Automatische Feiertage & Ferienkalender für Österreich.</p>
            </div>
          </div>

          <div className="w-full md:w-64 space-y-1">
            <label className="text-[0.6875rem] font-black uppercase tracking-wider text-slate-600">Bundesland auswählen</label>
            <select 
              value={app.bundesland || 'VBG'} 
              onChange={e => {
                const selected = e.target.value as Bundesland;
                setApp((prev: any) => ({ ...prev, bundesland: selected }));
              }} 
              className="w-full h-11 px-4 bg-slate-50 border border-stone-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-slate-800 text-xs font-bold outline-none transition-all shadow-sm"
            >
              {Object.entries(BUNDESLAND_NAMEN).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Ferien Toggles */}
        <div className="space-y-3">
          <p className="text-xs text-slate-500 font-medium">
            Klicke auf Ferientage, um sie für deine Schule zu aktivieren oder zu deaktivieren (z.B. schulautonome Tage):
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {getFerien(app.bundesland || 'VBG', app.schuljahr || '2025/26').map(h => {
              const isDisabled = app.calendarSettings?.disabledHolidays?.includes(h.id);
              return (
                <button
                  key={h.id}
                  onClick={() => toggleHoliday(h.id)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isDisabled 
                      ? 'bg-slate-50 border-slate-200/60 opacity-60' 
                      : 'bg-white border-stone-200 hover:border-emerald-500 shadow-xs'
                  }`}
                >
                  <div className="flex flex-col items-start text-left">
                    <span className={`text-xs font-black ${isDisabled ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                      {h.name}
                    </span>
                    {h.month !== undefined && h.day !== undefined && (
                      <span className="text-[0.625rem] font-bold text-slate-400 uppercase">
                        {new Date(h.year || 2026, h.month, h.day).toLocaleDateString('de-AT', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                  </div>
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all shrink-0 ${isDisabled ? 'bg-slate-200 text-slate-400' : 'bg-emerald-500 text-white'}`}>
                    {isDisabled ? <X size={12} strokeWidth={3} /> : <Check size={12} strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fach-Konfiguration & Farben */}
      <div className="bg-white rounded-[2.5rem] border border-stone-200/80 p-6 md:p-8 space-y-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-stone-150 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Fach-Farben & Zuordnung</h2>
              <p className="text-xs text-slate-500 font-medium">Farben für den Wochenplan, Jahresplaner und Kompetenzraster.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowSubjectColors(!showSubjectColors)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
          >
            {showSubjectColors ? 'Schließen' : 'Farben anpassen'}
            {showSubjectColors ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {showSubjectColors ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-200">
            {(app.faecher || FAECHER_ALLE).map((f: string) => {
              const config = (app.fachConfig || {})[f] || { color: 'slate' };
              const hex = getFachHexColor(config.color || f);
              const isCustom = isHexColor(config.color);
              const presetLabel = !isCustom && config.color ? COLOR_PRESET_OPTIONS.find(p => p.id === config.color)?.label : null;

              return (
                <div key={f} className="p-3.5 bg-slate-50/80 rounded-2xl border border-stone-200/60 flex items-center justify-between gap-3 shadow-3xs hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FachColorPicker
                      fach={f}
                      currentColor={config.color}
                      onChange={(newColor) => setApp((prev: any) => ({
                        ...prev,
                        fachConfig: {
                          ...(prev.fachConfig || {}),
                          [f]: {
                            ...(prev.fachConfig?.[f] || {}),
                            color: newColor,
                            scaleColor: (newColor === 'red' || newColor === 'amber' || newColor === 'rose') ? 'red' : (newColor === 'emerald' || newColor === 'teal') ? 'emerald' : 'blue'
                          }
                        }
                      }))}
                      compact={true}
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-black text-slate-800 truncate block" title={f}>{f}</span>
                      <span className="text-[0.625rem] text-slate-400 font-mono font-medium block">
                        {isCustom ? config.color.toUpperCase() : (presetLabel || 'Standard')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="flex items-center gap-1.5 cursor-pointer bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-3xs hover:border-emerald-300 transition-all">
                      <input 
                        type="checkbox" 
                        checked={config.unterrichtet !== false}
                        onChange={e => setApp((prev: any) => ({
                          ...prev,
                          fachConfig: {
                            ...(prev.fachConfig || {}),
                            [f]: {
                              ...(prev.fachConfig?.[f] || {}),
                              unterrichtet: e.target.checked
                            }
                          }
                        }))}
                        className="w-3.5 h-3.5 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className={`text-[0.5625rem] font-black uppercase tracking-wider ${config.unterrichtet !== false ? 'text-emerald-700' : 'text-slate-400'}`}>
                        Notenmappe
                      </span>
                    </label>
                    <div
                      className="w-4 h-4 rounded-full border border-white shadow-3xs ring-1 ring-slate-200 shrink-0"
                      style={{ backgroundColor: hex }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-2xl border border-stone-200/60 flex items-center justify-between">
            <p className="text-xs text-slate-600 font-bold">
              {(app.faecher || FAECHER_ALLE).length} Schulfächer konfiguriert
            </p>
            <button
              type="button"
              onClick={() => setShowSubjectColors(true)}
              className="text-xs font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-wider cursor-pointer"
            >
              Farben anzeigen
            </button>
          </div>
        )}
      </div>

      {/* Klassenglas & Tour */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Klassenglas */}
        <div className="bg-white rounded-[2.5rem] border border-stone-200/80 p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-3 border-b border-stone-150 pb-3">
            <span className="text-xl">💎</span>
            <div>
              <h2 className="text-sm font-black text-slate-900">Klassenglas Zielwert</h2>
              <p className="text-[0.6875rem] text-slate-500 font-medium">Belohnungsglas im Lehrer-Cockpit</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-[0.6875rem] font-bold text-slate-600">Ziel (Murmeln/Münzen)</label>
              <input
                type="number"
                min={1}
                value={app.klassenglas_ziel || 100}
                onChange={(e) => setApp((prev: any) => ({ ...prev, klassenglas_ziel: Math.max(1, parseInt(e.target.value) || 100) }))}
                className="w-full h-11 px-4 bg-slate-50 border border-stone-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="w-28 space-y-1">
              <label className="text-[0.6875rem] font-bold text-slate-600">Symbol</label>
              <input
                type="text"
                value={app.settings?.klassenglasIcon ?? "💎"}
                onChange={(e) => setApp((prev: any) => ({ ...prev, settings: { ...prev.settings, klassenglasIcon: e.target.value } }))}
                className="w-full h-11 bg-slate-50 border border-stone-200 rounded-xl font-bold text-center text-lg outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Tour zurücksetzen */}
        <div className="bg-white rounded-[2.5rem] border border-stone-200/80 p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-emerald-500" />
              <h2 className="text-sm font-black text-slate-900">Einführungstour</h2>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Starte die interaktive Erklärung der LehrerAPP erneut beim nächsten Besuch des Cockpits.
            </p>
          </div>

          <button
            onClick={() => {
              setApp((prev: any) => ({
                ...prev,
                tourAbgeschlossen: false,
                currentPage: 'cockpit'
              }));
              showToast('Die Tour wurde zurückgesetzt. Wechsel zum Cockpit, um sie zu starten.', 'success');
            }}
            className="w-full h-11 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/60 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles size={14} />
            <span>Tour erneut starten</span>
          </button>
        </div>
      </div>

      {/* Klasse verwalten / Gefahrenbereich */}
      <div id="general-settings-manage-class" className="bg-white rounded-[2.5rem] border border-rose-200/80 p-6 md:p-8 space-y-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-rose-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-150 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">Aktuelle Klasse verwalten</h2>
                <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-[0.625rem] font-black uppercase">
                  Gefahrenbereich
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Sicheres Löschen der aktuell ausgewählten Klasse.</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-rose-50/40 rounded-2xl border border-rose-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900">
                {app.stufe ? `${app.stufe}. Klasse` : 'Klasse'} {app.klassenbezeichnung || 'Ohne Namen'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white border border-rose-200/80 text-rose-800 text-[0.625rem] font-bold">
                {app.schueler?.length || 0} Schüler:innen
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Entfernt diese Klasse vollständig inklusive aller zugeordneten Schüler:innen, Noten, Anwesenheiten und Pläne.
            </p>
          </div>

          <button
            id="btn-delete-class-general"
            type="button"
            onClick={onOpenDeleteClassModal}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm shrink-0 flex items-center gap-2"
          >
            <Trash2 size={14} />
            <span>Klasse löschen</span>
          </button>
        </div>
      </div>
    </div>
  );
}
