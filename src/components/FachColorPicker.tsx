import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, RotateCcw, Sparkles } from 'lucide-react';
import {
  COLOR_PRESET_OPTIONS,
  STANDARD_COLOR_MAP,
  getFachHexColor,
  getContrastingTextColor,
  isHexColor,
  getDefaultFachColorKey,
  hexToRgba
} from '../lib/fachColorUtils';

interface FachColorPickerProps {
  fach: string;
  currentColor?: string;
  onChange: (newColor: string) => void;
  compact?: boolean;
  className?: string;
  align?: 'left' | 'right';
}

export const FachColorPicker: React.FC<FachColorPickerProps> = ({
  fach,
  currentColor,
  onChange,
  compact = true,
  className = '',
  align = 'left',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const activeHex = getFachHexColor(currentColor || fach);
  const [hexInput, setHexInput] = useState(activeHex);

  // Sync internal hex input with current color whenever it changes or popover opens
  useEffect(() => {
    setHexInput(activeHex);
  }, [activeHex, isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCustomPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handlePresetSelect = (presetId: string) => {
    onChange(presetId);
    setIsOpen(false);
    setShowCustomPicker(false);
  };

  const handleCustomHexChange = (newHex: string) => {
    setHexInput(newHex);
    if (isHexColor(newHex)) {
      onChange(newHex);
    }
  };

  const handleResetToDefault = () => {
    const defaultColorKey = getDefaultFachColorKey(fach);
    onChange(defaultColorKey);
    setIsOpen(false);
    setShowCustomPicker(false);
  };

  // Check if current is a custom hex or one of standard presets
  const isCustomColor = currentColor ? isHexColor(currentColor) : false;
  const currentPresetId = !isCustomColor && currentColor && STANDARD_COLOR_MAP[currentColor] ? currentColor : null;

  const textColorOnActive = getContrastingTextColor(activeHex);

  return (
    <div className={`relative inline-block ${className}`} ref={popoverRef}>
      {/* Trigger Button */}
      {compact ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="group relative flex items-center justify-center p-0.5 rounded-full transition-transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer shrink-0"
          title={`Farbe für ${fach} anpassen`}
        >
          <span
            className="w-6 h-6 rounded-full border-2 border-white shadow-xs ring-1 ring-slate-200/90 group-hover:ring-slate-400 block transition-all"
            style={{ backgroundColor: activeHex }}
          />
          <span className="sr-only">Farbe für {fach} wählen</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-3xs transition-all text-xs font-bold text-slate-700 cursor-pointer"
        >
          <span
            className="w-4 h-4 rounded-full border border-white shadow-xs ring-1 ring-slate-200 shrink-0"
            style={{ backgroundColor: activeHex }}
          />
          <span className="truncate">{fach}</span>
          <Palette size={13} className="text-slate-400 ml-auto" />
        </button>
      )}

      {/* Floating Popover */}
      {isOpen && (
        <div
          className={`absolute z-[120] top-full mt-2 ${align === 'right' ? 'right-0' : 'left-0'} w-72 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 text-left animate-in zoom-in-95 duration-150 origin-top`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header & Live Preview */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="min-w-0 flex-1 pr-2">
              <div className="text-[0.625rem] font-black text-slate-400 uppercase tracking-wider mb-0.5">
                Farbe für Fach
              </div>
              <div className="text-xs font-black text-slate-800 truncate" title={fach}>
                {fach}
              </div>
            </div>

            {/* Live Preview Badge */}
            <div
              className="px-2.5 py-1 rounded-lg text-[0.6875rem] font-black tracking-tight shrink-0 shadow-xs border transition-colors flex items-center gap-1.5"
              style={{
                backgroundColor: activeHex,
                color: textColorOnActive,
                borderColor: activeHex,
              }}
            >
              <span>Vorschau</span>
            </div>
          </div>

          {/* Preset Swatches */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between text-[0.625rem] font-black text-slate-500 uppercase tracking-wider">
              <span>Standardfarben</span>
              {currentPresetId && (
                <span className="text-slate-400 font-semibold lowercase">
                  {COLOR_PRESET_OPTIONS.find(p => p.id === currentPresetId)?.label}
                </span>
              )}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {COLOR_PRESET_OPTIONS.map((c) => {
                const isSelected = (!isCustomColor && currentColor === c.id) || (activeHex.toLowerCase() === c.hex.toLowerCase());
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handlePresetSelect(c.id)}
                    className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center relative cursor-pointer ${
                      isSelected
                        ? 'border-slate-800 scale-110 shadow-sm ring-2 ring-slate-800/20 z-10'
                        : 'border-white hover:border-slate-200 shadow-3xs ring-1 ring-slate-150'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                  >
                    {isSelected && (
                      <Check
                        size={12}
                        strokeWidth={3}
                        style={{ color: getContrastingTextColor(c.hex) }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Color Section */}
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            {!showCustomPicker ? (
              <button
                type="button"
                onClick={() => setShowCustomPicker(true)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-3xs group"
              >
                <div
                  className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs group-hover:scale-110 transition-transform"
                  style={{
                    background: 'conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)',
                  }}
                />
                <span>Freie Farbauswahl / Farbkreis</span>
                <Sparkles size={12} className="text-amber-500 ml-auto" />
              </button>
            ) : (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-[0.625rem] font-black text-slate-600 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Palette size={12} className="text-emerald-600" />
                    Freier Farbwähler
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCustomPicker(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer text-[0.5625rem]"
                  >
                    Schließen
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {/* HTML5 Native Color Picker with custom styling */}
                  <label className="relative cursor-pointer shrink-0 group">
                    <div
                      className="w-10 h-10 rounded-xl border-2 border-white shadow-sm ring-1 ring-slate-300 group-hover:ring-emerald-500 transition-all flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: activeHex }}
                    >
                      <Palette
                        size={16}
                        style={{ color: textColorOnActive }}
                        className="opacity-70 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                    <input
                      ref={colorInputRef}
                      type="color"
                      value={activeHex}
                      onChange={(e) => handleCustomHexChange(e.target.value)}
                      className="sr-only"
                    />
                  </label>

                  {/* Hex Text Input */}
                  <div className="flex-1 space-y-1">
                    <div className="text-[0.5625rem] font-bold text-slate-400 uppercase tracking-wider">
                      Hex-Code
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={hexInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setHexInput(val);
                          if (isHexColor(val)) {
                            onChange(val);
                          }
                        }}
                        placeholder="#3B82F6"
                        maxLength={7}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 uppercase focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => colorInputRef.current?.click()}
                        className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
                        title="Farbkreis öffnen"
                      >
                        <Palette size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick shade suggestions */}
                <div className="pt-2 border-t border-slate-200/60">
                  <div className="text-[0.5625rem] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Helligkeit anpassen
                  </div>
                  <div className="flex gap-1.5">
                    {[0.2, 0.4, 0.6, 0.8, 1.0].map((opacity) => (
                      <button
                        key={opacity}
                        type="button"
                        onClick={() => {
                          // Quick tone preview
                          const rgba = hexToRgba(activeHex, opacity);
                          // For solid hex, convert
                        }}
                        className="flex-1 h-4 rounded-md border border-slate-200 shadow-3xs cursor-pointer hover:scale-105 transition-transform"
                        style={{
                          backgroundColor: activeHex,
                          opacity: opacity,
                        }}
                        title={`Deckkraft ${Math.round(opacity * 100)}%`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer: Reset & Done */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="flex items-center gap-1 text-[0.625rem] font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title="Auf Standardfarbe zurücksetzen"
            >
              <RotateCcw size={10} />
              <span>Standard</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setShowCustomPicker(false);
              }}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white text-[0.6875rem] font-bold rounded-lg shadow-3xs transition-all cursor-pointer"
            >
              Fertig
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
