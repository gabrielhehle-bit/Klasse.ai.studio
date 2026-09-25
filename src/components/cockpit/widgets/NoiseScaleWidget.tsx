import React, { useRef } from 'react';
import {
  NOISE_SCALE_STAGES,
  getNoiseScaleStage,
  migrateLegacyScaleLevel,
  NoiseScaleId,
  NoiseScaleStage,
} from '../../../lib/noisescalesAlgorithm';
import { useWidgetSize, useWidgetOverflowGuard } from '../widgetLayout';
import { Volume1, Check } from 'lucide-react';

interface NoiseScaleWidgetProps {
  widget: any;
  onUpdate?: (updates: any) => void;
  currentIsLight: boolean;
  isFullscreen?: boolean;
}

export const NoiseScaleWidget: React.FC<NoiseScaleWidgetProps> = ({
  widget,
  onUpdate,
  currentIsLight,
  isFullscreen = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef, { isFullscreen, defaultCategory: 'standard' });
  useWidgetOverflowGuard('NoiseScaleWidget', containerRef);

  const activeScaleId: NoiseScaleId = migrateLegacyScaleLevel(
    widget.settings?.activeScaleId ?? widget.settings?.activeLevel
  );

  const activeStage: NoiseScaleStage = getNoiseScaleStage(activeScaleId);

  const handleSelectStage = (stageId: NoiseScaleId) => {
    if (onUpdate) {
      onUpdate({
        settings: {
          ...widget.settings,
          activeScaleId: stageId,
        },
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex flex-col justify-between select-none p-3 overflow-hidden transition-colors ${
        currentIsLight ? 'text-slate-800' : 'text-slate-100'
      }`}
    >
      {/* 1. Header */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Volume1 size={size.isCompact ? 14 : 16} className="text-sky-500" />
          <span className="text-[11px] font-black uppercase tracking-wider truncate">
            Lautstärkevorgabe
          </span>
        </div>
        <span
          className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${activeStage.activeBg} ${activeStage.accentBorder}`}
        >
          Stufe {activeStage.level}: {activeStage.shortLabel}
        </span>
      </div>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col justify-center my-2 min-h-0 w-full">
        {/* COMPACT VIEW (280–379 px) */}
        {size.isCompact ? (
          <div className="flex flex-col items-center justify-between h-full gap-2 py-1">
            {/* Spotlight Card */}
            <div
              className={`w-full flex-1 flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                activeStage.activeBg
              } ${activeStage.accentBorder}`}
            >
              <span className="text-3xl mb-1">{activeStage.icon}</span>
              <h3 className="text-sm font-black leading-tight">{activeStage.label}</h3>
              <p className="text-[10px] opacity-80 mt-0.5 max-w-[200px] truncate">
                {activeStage.classroomRule}
              </p>
            </div>

            {/* Compact Stage Switcher Buttons */}
            <div className="grid grid-cols-5 gap-1 w-full shrink-0">
              {NOISE_SCALE_STAGES.map((s) => {
                const isSelected = s.id === activeScaleId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectStage(s.id)}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all cursor-pointer min-h-[44px] ${
                      isSelected
                        ? `${s.activeBg} ${s.accentBorder} shadow-sm scale-105`
                        : currentIsLight
                          ? 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                          : 'bg-zinc-800/80 border-zinc-700 hover:bg-zinc-700 text-zinc-300'
                    }`}
                    title={`${s.label}: ${s.classroomRule}`}
                  >
                    <span className="text-base">{s.icon}</span>
                    <span className="text-[8px] font-black">{s.level}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : size.category === 'fullscreen' || isFullscreen ? (
          /* FULLSCREEN / SMARTBOARD VIEW (>= 800 px) */
          <div className="flex flex-col items-center justify-center h-full gap-6 max-w-4xl mx-auto w-full">
            {/* Monumental Active Display */}
            <div
              className={`w-full p-8 rounded-3xl border-2 flex flex-col items-center justify-center text-center shadow-lg transition-all ${
                activeStage.activeBg
              } ${activeStage.accentBorder}`}
            >
              <span className="text-6xl md:text-7xl mb-3 animate-pulse">{activeStage.icon}</span>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-2 uppercase">
                {activeStage.label}
              </h2>
              <p className="text-base md:text-xl font-bold opacity-90 max-w-xl">
                {activeStage.classroomRule}
              </p>
              <span className="text-xs font-semibold opacity-75 mt-2">
                {activeStage.description}
              </span>
            </div>

            {/* Smartboard Stage Selector */}
            <div className="grid grid-cols-5 gap-3 w-full">
              {NOISE_SCALE_STAGES.map((s) => {
                const isSelected = s.id === activeScaleId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectStage(s.id)}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer min-h-[56px] flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? `${s.activeBg} ${s.accentBorder} shadow-md scale-105`
                        : currentIsLight
                          ? 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                          : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200'
                    }`}
                  >
                    <span className="text-2xl">{s.icon}</span>
                    <span className="text-xs font-black">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* STANDARD & LARGE VIEW (380–799 px) */
          <div className="flex flex-col justify-center gap-1.5 w-full h-full">
            {NOISE_SCALE_STAGES.map((s) => {
              const isSelected = s.id === activeScaleId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectStage(s.id)}
                  className={`w-full min-h-11 p-2 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                    isSelected
                      ? `${s.activeBg} ${s.accentBorder} shadow-sm font-bold`
                      : currentIsLight
                        ? 'bg-white border-slate-200/80 hover:bg-slate-50 text-slate-700'
                        : 'bg-zinc-850/80 border-zinc-800 hover:bg-zinc-800 text-zinc-300'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0 ${
                      isSelected
                        ? 'bg-white/80 dark:bg-black/40 shadow-sm'
                        : currentIsLight
                          ? 'bg-slate-100'
                          : 'bg-zinc-800'
                    }`}
                  >
                    {s.icon}
                  </div>

                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black">{s.label}</span>
                      <span className="text-[9px] opacity-60 font-semibold">
                        (Stufe {s.level})
                      </span>
                    </div>
                    <p className="text-[9.5px] opacity-80 truncate leading-tight mt-0.5">
                      {s.classroomRule}
                    </p>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-current/10 flex items-center justify-center shrink-0">
                      <Check size={12} className="stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Footer */}
      <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[9px] text-slate-400 shrink-0">
        <span>Didaktisches Lautstärkeziel</span>
        <span>1-Klick-Auswahl</span>
      </div>
    </div>
  );
};
