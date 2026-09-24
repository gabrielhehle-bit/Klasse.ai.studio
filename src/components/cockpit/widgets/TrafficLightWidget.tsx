import React, { useRef, useMemo, useCallback, useState } from 'react';
import { CockpitWidgetConfig } from '../../../types';
import { NoiseScaleWidget } from './NoiseScaleWidget';
import { NoiseMeterWidget } from './NoiseMeterWidget';
import { useWidgetSize, useWidgetOverflowGuard } from '../widgetLayout';
import {
  TRAFFIC_LIGHT_MODES,
  TrafficLightModeId,
  getTrafficLightMode,
  migrateLegacyAmpelStatus,
} from '../../../lib/trafficlightAlgorithm';

export interface TrafficLightWidgetProps {
  widget?: CockpitWidgetConfig;
  onUpdate?: (updates: Partial<CockpitWidgetConfig>) => void;
  app?: any;
  setApp?: (fn: any) => void;
  currentIsLight?: boolean;
}

export const TrafficLightWidget: React.FC<TrafficLightWidgetProps> = ({
  widget,
  onUpdate,
  app,
  setApp,
  currentIsLight = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef);
  useWidgetOverflowGuard('TrafficLightWidget', containerRef);

  // Class-wide legacy ampel_status is the shared source of truth so a second
  // lamp or a synced device does not display a stale widget-local selection.
  const activeModeId: TrafficLightModeId = useMemo(() => {
    if (app?.ampel_status) return migrateLegacyAmpelStatus(app.ampel_status);
    return migrateLegacyAmpelStatus(widget?.settings?.activeModeId);
  }, [widget?.settings?.activeModeId, app?.ampel_status]);
  // The selected view is local UI state. Microphone access is NEVER started
  // when the widget mounts or simply switches views.
  const [view, setView] = useState<'ampel' | 'vorgabe' | 'pegel'>('ampel');

  const activeMode = useMemo(
    () => getTrafficLightMode(activeModeId),
    [activeModeId]
  );

  // Handle switching modes
  const handleSelectMode = useCallback(
    (modeId: TrafficLightModeId) => {
      // 1. Update widget settings
      if (onUpdate && widget) {
        onUpdate({
          settings: {
            ...widget.settings,
            activeModeId: modeId,
          },
        });
      }

      // 2. Sync to central app.ampel_status for backward compatibility
      if (setApp) {
        // Map modeId to legacy key if needed (or store directly)
        const legacyKey =
          modeId === 'zuhören'
            ? 'rot'
            : modeId === 'leise'
            ? 'gelb'
            : modeId === 'austausch'
            ? 'gruen'
            : 'pause';

        setApp((prev: any) => ({
          ...prev,
          ampel_status: legacyKey,
        }));
      }
    },
    [onUpdate, widget, setApp]
  );

  const isCompact = size.category === 'compact';
  const isLarge = size.category === 'large';
  const isFullscreen = size.category === 'fullscreen';

  const textColor = currentIsLight ? 'text-slate-900' : 'text-slate-100';
  const subTextColor = currentIsLight ? 'text-slate-500' : 'text-zinc-400';
  const cardBg = currentIsLight ? 'bg-white' : 'bg-zinc-900';
  const borderColor = currentIsLight ? 'border-slate-200' : 'border-zinc-800';

  // Get active styling based on active mode colorName
  const getActiveThemeClasses = (colorName: string) => {
    switch (colorName) {
      case 'rose':
        return {
          banner: 'bg-rose-500 text-white shadow-rose-500/30',
          dot: 'bg-rose-500 shadow-[0_0_16px_rgba(244,63,94,0.7)]',
          badge: currentIsLight
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : 'bg-rose-950/40 text-rose-300 border-rose-800',
        };
      case 'amber':
        return {
          banner: 'bg-amber-500 text-white shadow-amber-500/30',
          dot: 'bg-amber-500 shadow-[0_0_16px_rgba(245,158,11,0.7)]',
          badge: currentIsLight
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-amber-950/40 text-amber-300 border-amber-800',
        };
      case 'emerald':
        return {
          banner: 'bg-emerald-600 text-white shadow-emerald-600/30',
          dot: 'bg-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.7)]',
          badge: currentIsLight
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-emerald-950/40 text-emerald-300 border-emerald-800',
        };
      case 'blue':
      default:
        return {
          banner: 'bg-blue-600 text-white shadow-blue-600/30',
          dot: 'bg-blue-500 shadow-[0_0_16px_rgba(59,130,246,0.7)]',
          badge: currentIsLight
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : 'bg-blue-950/40 text-blue-300 border-blue-800',
        };
    }
  };

  const activeTheme = getActiveThemeClasses(activeMode.colorName);
  const safeSettings = widget?.settings || {};
  const scaleSettings = {
    ...safeSettings,
    activeScaleId: safeSettings.noiseScaleId ?? safeSettings.activeScaleId,
  };
  const meterSettings = {
    ...safeSettings,
    sensitivity: safeSettings.noiseSensitivity || safeSettings.sensitivity || 'normal',
  };
  const updateScale = (updates: any) => {
    if (onUpdate && widget) onUpdate({ settings: {
      ...widget.settings,
      noiseScaleId: updates.settings?.activeScaleId,
    } });
  };
  const updateMeter = (updates: any) => {
    if (onUpdate && widget) onUpdate({ settings: {
      ...widget.settings,
      noiseSensitivity: updates.settings?.sensitivity,
    } });
  };

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={`Arbeitsmodus: ${activeMode.label}`}
      className={`w-full h-full flex flex-col justify-between overflow-hidden select-none p-3 sm:p-4 transition-colors relative ${textColor} ${
        currentIsLight ? 'bg-slate-50/70' : 'bg-zinc-950/70'
      }`}
    >
      <nav aria-label="Lautstärke und Arbeitsampel" className="mb-2 grid shrink-0 grid-cols-3 gap-1">
        {([
          ['ampel', 'Arbeitsampel'],
          ['vorgabe', 'Lautstärke'],
          ['pegel', 'Live-Pegel'],
        ] as const).map(([key, label]) => <button type="button" key={key}
          aria-pressed={view === key} title={label}
          onClick={() => setView(key)}
          className={`min-h-10 min-w-0 rounded-xl border px-1 py-1 text-[10px] font-bold sm:text-xs ${view === key
            ? 'border-indigo-400 bg-indigo-100 text-indigo-900'
            : currentIsLight ? 'border-slate-200 bg-white text-slate-700' : 'border-zinc-700 bg-zinc-900 text-zinc-200'}`}>
          {label}
        </button>)}
      </nav>
      {view === 'vorgabe' && <div className="min-h-0 flex-1">
        <NoiseScaleWidget widget={{ ...(widget || {}), settings: scaleSettings }}
          onUpdate={updateScale} currentIsLight={currentIsLight} />
      </div>}
      {view === 'pegel' && <div className="min-h-0 flex-1">
        <NoiseMeterWidget widget={{ ...(widget || {}), settings: meterSettings }}
          onUpdate={updateMeter} currentIsLight={currentIsLight} />
      </div>}
      {view === 'ampel' && <div className="min-h-0 flex-1">
      {/* COMPACT VIEW (280–379 px) */}
      {isCompact && (
        <div className="flex flex-col justify-between h-full w-full">
          {/* Active Mode Card */}
          <div
            className={`my-auto p-3 rounded-2xl border transition-all text-center flex flex-col items-center justify-center ${cardBg} ${borderColor} shadow-xs`}
          >
            <div className="text-3xl mb-1">{activeMode.icon}</div>
            <h2 className="text-lg font-black tracking-tight leading-snug line-clamp-1">
              {activeMode.label}
            </h2>
            <p className={`text-xs mt-1 ${subTextColor} line-clamp-2`}>
              {activeMode.description}
            </p>
          </div>

          {/* Quick Switch Buttons Grid */}
          <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-200 dark:border-zinc-800">
            {TRAFFIC_LIGHT_MODES.map((m) => {
              const isCurrent = m.id === activeModeId;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectMode(m.id)}
                  aria-pressed={isCurrent}
                  className={`min-h-[44px] flex flex-col items-center justify-center rounded-xl p-1 transition-all cursor-pointer border ${
                    isCurrent
                      ? `${getActiveThemeClasses(m.colorName).banner} font-black shadow-xs`
                      : currentIsLight
                      ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                      : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                  }`}
                  title={`${m.label}: ${m.description}`}
                >
                  <span className="text-sm leading-none">{m.icon}</span>
                  <span className="text-[9px] font-bold mt-0.5 truncate max-w-full">
                    {m.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STANDARD / LARGE / FULLSCREEN VIEW */}
      {!isCompact && (
        <div className="flex flex-col justify-between h-full w-full gap-3">
          {/* Header Row */}
          <div className="flex items-center justify-between shrink-0">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Arbeitsmodus & Sozialform
            </span>
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${activeTheme.badge}`}
            >
              <span className={`w-2 h-2 rounded-full ${activeTheme.dot}`} />
              <span>Aktiv</span>
            </div>
          </div>

          {/* Hero Banner for Active Mode */}
          <div
            className={`rounded-2xl p-4 sm:p-5 border transition-all text-center flex flex-col items-center justify-center flex-1 min-h-0 ${cardBg} ${borderColor} shadow-xs ${
              isFullscreen ? 'py-10' : ''
            }`}
          >
            <div
              className={`mb-2 transition-transform ${
                isFullscreen ? 'text-6xl sm:text-7xl' : 'text-4xl sm:text-5xl'
              }`}
            >
              {activeMode.icon}
            </div>
            <h2
              className={`font-black tracking-tight leading-tight ${
                isFullscreen
                  ? 'text-4xl sm:text-5xl md:text-6xl'
                  : 'text-xl sm:text-2xl text-slate-900 dark:text-white'
              }`}
            >
              {activeMode.label}
            </h2>
            <p
              className={`mt-1.5 font-medium ${subTextColor} max-w-md ${
                isFullscreen ? 'text-lg sm:text-xl mt-3' : 'text-xs sm:text-sm'
              }`}
            >
              {activeMode.description}
            </p>
          </div>

          {/* Selector Grid of All Modes (Touch targets >= 44px) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0 pt-1">
            {TRAFFIC_LIGHT_MODES.map((m) => {
              const isCurrent = m.id === activeModeId;
              const theme = getActiveThemeClasses(m.colorName);

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectMode(m.id)}
                  aria-pressed={isCurrent}
                  className={`min-h-[48px] px-3 py-2 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                    isCurrent
                      ? `${theme.banner} font-black shadow-sm scale-102`
                      : currentIsLight
                      ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                      : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                  }`}
                >
                  <span className="text-xl shrink-0">{m.icon}</span>
                  <div className="text-left min-w-0 flex-1">
                    <div className="text-xs font-bold truncate leading-tight">
                      {m.shortLabel}
                    </div>
                    {!isCurrent && (
                      <div className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">
                        {m.label}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
      </div>}
    </div>
  );
};

export default TrafficLightWidget;
