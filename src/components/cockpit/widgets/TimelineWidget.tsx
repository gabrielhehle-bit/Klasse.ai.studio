import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Clock, Coffee, ArrowRight, MapPin, CheckCircle2, Calendar, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { CockpitWidgetConfig, AppState } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { useWidgetSize, useWidgetOverflowGuard } from '../widgetLayout';
import {
  buildDayTimeline,
  getTimelineStatus,
  formatTimeRange,
  formatMinutes,
  TimelineUnit,
  TimelineState,
} from '../../../lib/timelineAlgorithm';

export interface TimelineWidgetProps {
  widget?: CockpitWidgetConfig;
  onUpdate?: (updates: Partial<CockpitWidgetConfig>) => void;
  app?: AppState;
  setApp?: React.Dispatch<React.SetStateAction<AppState>>;
  currentIsLight?: boolean;
}

export const TimelineWidget: React.FC<TimelineWidgetProps> = ({
  app: propApp,
  currentIsLight = true,
}) => {
  const { app: contextApp } = useApp();
  const app = propApp || contextApp;

  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef);
  useWidgetOverflowGuard('TimelineWidget', containerRef);

  // Drift-free time reference: updates every 20 seconds or upon window focus
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 20000); // 20s update frequency

    const onFocus = () => setNow(new Date());
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Selected unit in timeline for inspect / detail view on touch
  const [inspectedUnitId, setInspectedUnitId] = useState<string | null>(null);
  const [timelinePage, setTimelinePage] = useState(0);

  // Daily timeline units calculation
  const units = useMemo(() => {
    return buildDayTimeline(app, now);
  }, [
    app?.tageplan,
    app?.stammplan,
    app?.stundenZeiten,
    app?.wochenplanung,
    app?.fachConfig,
    app?.activeClassId,
    app?.schuljahr,
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ]);

  // Current timeline state
  const timelineState: TimelineState = useMemo(() => {
    return getTimelineStatus(units, now);
  }, [units, now]);

  // Inspected unit object (if teacher tapped a block)
  const inspectedUnit = useMemo(() => {
    if (!inspectedUnitId) return null;
    return units.find((u) => u.id === inspectedUnitId) || null;
  }, [inspectedUnitId, units]);

  // Styling helper for subject colors
  const getColorStyles = (colorKey: string, isCurrent: boolean, isDone: boolean) => {
    if (colorKey === 'amber') {
      // Pause
      return {
        bg: isCurrent
          ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
          : isDone
          ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/40 text-amber-600/70 dark:text-amber-400/60 opacity-60'
          : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300',
        badge: 'bg-amber-500 text-white',
        bar: 'bg-amber-500',
      };
    }

    if (colorKey === 'blue') {
      return {
        bg: isCurrent
          ? 'bg-blue-100 dark:bg-blue-950/70 border-blue-400 dark:border-blue-600 text-blue-950 dark:text-blue-100 ring-2 ring-blue-400/40'
          : isDone
          ? 'bg-slate-100 dark:bg-zinc-850/60 border-slate-200/60 text-slate-500 dark:text-zinc-500 opacity-60'
          : 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/40 text-blue-800 dark:text-blue-300',
        badge: 'bg-blue-600 text-white',
        bar: 'bg-blue-600',
      };
    }

    if (colorKey === 'red') {
      return {
        bg: isCurrent
          ? 'bg-rose-100 dark:bg-rose-950/70 border-rose-400 dark:border-rose-600 text-rose-950 dark:text-rose-100 ring-2 ring-rose-400/40'
          : isDone
          ? 'bg-slate-100 dark:bg-zinc-850/60 border-slate-200/60 text-slate-500 dark:text-zinc-500 opacity-60'
          : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300',
        badge: 'bg-rose-600 text-white',
        bar: 'bg-rose-600',
      };
    }

    if (colorKey === 'emerald') {
      return {
        bg: isCurrent
          ? 'bg-emerald-100 dark:bg-emerald-950/70 border-emerald-400 dark:border-emerald-600 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-400/40'
          : isDone
          ? 'bg-slate-100 dark:bg-zinc-850/60 border-slate-200/60 text-slate-500 dark:text-zinc-500 opacity-60'
          : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300',
        badge: 'bg-emerald-600 text-white',
        bar: 'bg-emerald-600',
      };
    }

    if (colorKey === 'sky') {
      return {
        bg: isCurrent
          ? 'bg-sky-100 dark:bg-sky-950/70 border-sky-400 dark:border-sky-600 text-sky-950 dark:text-sky-100 ring-2 ring-sky-400/40'
          : isDone
          ? 'bg-slate-100 dark:bg-zinc-850/60 border-slate-200/60 text-slate-500 dark:text-zinc-500 opacity-60'
          : 'bg-sky-50/70 dark:bg-sky-950/30 border-sky-200 dark:border-sky-900/40 text-sky-800 dark:text-sky-300',
        badge: 'bg-sky-600 text-white',
        bar: 'bg-sky-600',
      };
    }

    if (colorKey === 'purple') {
      return {
        bg: isCurrent
          ? 'bg-purple-100 dark:bg-purple-950/70 border-purple-400 dark:border-purple-600 text-purple-950 dark:text-purple-100 ring-2 ring-purple-400/40'
          : isDone
          ? 'bg-slate-100 dark:bg-zinc-850/60 border-slate-200/60 text-slate-500 dark:text-zinc-500 opacity-60'
          : 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/40 text-purple-800 dark:text-purple-300',
        badge: 'bg-purple-600 text-white',
        bar: 'bg-purple-600',
      };
    }

    if (colorKey === 'teal') {
      return {
        bg: isCurrent
          ? 'bg-teal-100 dark:bg-teal-950/70 border-teal-400 dark:border-teal-600 text-teal-950 dark:text-teal-100 ring-2 ring-teal-400/40'
          : isDone
          ? 'bg-slate-100 dark:bg-zinc-850/60 border-slate-200/60 text-slate-500 dark:text-zinc-500 opacity-60'
          : 'bg-teal-50/70 dark:bg-teal-950/30 border-teal-200 dark:border-teal-900/40 text-teal-800 dark:text-teal-300',
        badge: 'bg-teal-600 text-white',
        bar: 'bg-teal-600',
      };
    }

    if (colorKey === 'orange') {
      return {
        bg: isCurrent
          ? 'bg-orange-100 dark:bg-orange-950/70 border-orange-400 dark:border-orange-600 text-orange-950 dark:text-orange-100 ring-2 ring-orange-400/40'
          : isDone
          ? 'bg-slate-100 dark:bg-zinc-850/60 border-slate-200/60 text-slate-500 dark:text-zinc-500 opacity-60'
          : 'bg-orange-50/70 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/40 text-orange-800 dark:text-orange-300',
        badge: 'bg-orange-600 text-white',
        bar: 'bg-orange-600',
      };
    }

    // Default neutral slate
    return {
      bg: isCurrent
        ? 'bg-slate-200/90 dark:bg-zinc-800 border-slate-400 dark:border-zinc-600 text-slate-900 dark:text-zinc-100 ring-2 ring-slate-400/40'
        : isDone
        ? 'bg-slate-100 dark:bg-zinc-850/60 border-slate-200/60 text-slate-400 dark:text-zinc-500 opacity-60'
        : 'bg-slate-50 dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300',
      badge: 'bg-slate-600 text-white',
      bar: 'bg-slate-600',
    };
  };

  const currentUnit = timelineState.currentUnit;
  const nextUnit = timelineState.nextUnit;
  const isCompact = size.category === 'compact';
  const isLarge = size.category === 'large';
  const isFullscreen = size.category === 'fullscreen';
  const isStandard = size.category === 'standard';
  const isShortHeight = size.height < 210;
  // Explicit pages keep even a long school day fully usable inside a small board
  // widget. Never force horizontal scroll or shrink every hour to illegibility.
  const unitsPerPage = Math.max(3, Math.min(8, Math.floor(Math.max(0, size.width - 70) / 42)));
  const pageCount = Math.max(1, Math.ceil(units.length / unitsPerPage));
  const safePage = Math.min(timelinePage, pageCount - 1);
  const visibleUnits = units.slice(safePage * unitsPerPage, (safePage + 1) * unitsPerPage);
  useEffect(() => {
    const nextIndex = timelineState.currentUnit
      ? units.findIndex(unit => unit.id === timelineState.currentUnit?.id)
      : timelineState.nextUnit ? units.findIndex(unit => unit.id === timelineState.nextUnit?.id) : -1;
    if (nextIndex >= 0) setTimelinePage(Math.floor(nextIndex / unitsPerPage));
  }, [timelineState.currentUnit?.id, timelineState.nextUnit?.id, app?.activeClassId, unitsPerPage]);

  // Empty state: no lessons scheduled
  if (timelineState.status === 'no_lessons') {
    return (
      <div
        ref={containerRef}
        className="w-full h-full flex flex-col items-center justify-center p-4 text-center select-none"
      >
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-400 mb-3">
          <Calendar size={22} className="stroke-[1.75]" />
        </div>
        <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-200 mb-1">
          Heute kein Unterricht eingetragen
        </h4>
        <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-xs">
          Für den heutigen Tag sind keine Stunden im Stundenplan hinterlegt.
        </p>
      </div>
    );
  }

  // Active theme classes
  const cardBg = currentIsLight
    ? 'bg-white border-slate-200/80 text-slate-800'
    : 'bg-zinc-900 border-zinc-800 text-zinc-100';

  const currentColors = currentUnit
    ? getColorStyles(currentUnit.colorKey, true, false)
    : getColorStyles('slate', false, false);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex flex-col overflow-hidden select-none p-3.5 sm:p-4 ${
        currentIsLight ? 'bg-slate-50/70' : 'bg-zinc-950/70'
      }`}
    >
      {/* Top Main Focus: Active Status / Current Lesson */}
      <div
        className={`flex flex-col justify-between rounded-xl border p-3 sm:p-3.5 shadow-sm transition-all ${
          currentUnit ? currentColors.bg : cardBg
        } ${isShortHeight ? 'mb-1 py-2' : 'mb-3'}`}
      >
        {/* Header row: Status indicator & Time badge */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            {timelineState.status === 'lesson' && (
              <span className="inline-flex items-center gap-1 text-[0.6875rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/80 dark:bg-black/40 shadow-xs border border-current/20 shrink-0">
                <Clock size={11} className="stroke-[2.5]" />
                {currentUnit?.label}
              </span>
            )}
            {timelineState.status === 'pause' && (
              <span className="inline-flex items-center gap-1 text-[0.6875rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500 text-white shadow-xs shrink-0">
                <Coffee size={11} className="stroke-[2.5]" />
                Pause
              </span>
            )}
            {timelineState.status === 'before_school' && (
              <span className="inline-flex items-center gap-1 text-[0.6875rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 shadow-xs shrink-0">
                Vor Unterrichtsbeginn
              </span>
            )}
            {timelineState.status === 'after_school' && (
              <span className="inline-flex items-center gap-1 text-[0.6875rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-xs shrink-0">
                <CheckCircle2 size={11} className="stroke-[2.5]" />
                Schultag beendet
              </span>
            )}

            {currentUnit?.isVertretung && (
              <span className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-white tracking-wide shrink-0">
                Vertretung
              </span>
            )}

            {/* Room (LARGE / FULLSCREEN only) */}
            {(isLarge || isFullscreen) && currentUnit?.raum && (
              <span className="inline-flex items-center gap-1 text-[0.6875rem] font-medium text-slate-500 dark:text-zinc-400 shrink-0">
                <MapPin size={11} />
                {currentUnit.raum}
              </span>
            )}
          </div>

          {/* Time range label */}
          {currentUnit && (
            <span className="text-xs font-mono font-semibold opacity-75 shrink-0">
              {formatTimeRange(currentUnit.startMinutes, currentUnit.endMinutes)}
            </span>
          )}
        </div>

        {/* Primary Information: Large Subject & Remaining Time */}
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <h2
              className={`font-black tracking-tight leading-tight truncate ${
                isFullscreen
                  ? 'text-3xl sm:text-4xl'
                  : isLarge
                  ? 'text-2xl'
                  : 'text-xl'
              }`}
            >
              {timelineState.status === 'before_school' &&
                `Beginnt um ${formatMinutes(nextUnit?.startMinutes ?? 480)}`}
              {timelineState.status === 'after_school' && 'Feierabend'}
              {timelineState.status === 'pause' && (currentUnit?.label || 'Pause')}
              {timelineState.status === 'lesson' && currentUnit?.fach}
            </h2>
          </div>

          {/* Prominent Remaining Time */}
          {(timelineState.status === 'lesson' || timelineState.status === 'pause') && (
            <div className="flex items-baseline gap-1 shrink-0 text-right">
              <span className="text-xs font-semibold opacity-70">noch</span>
              <span
                className={`font-black tracking-tight ${
                  isFullscreen
                    ? 'text-3xl sm:text-4xl'
                    : isLarge
                    ? 'text-2xl'
                    : 'text-xl'
                }`}
              >
                {timelineState.remainingMinutes}
              </span>
              <span className="text-xs font-bold opacity-75">Min</span>
            </div>
          )}

          {timelineState.status === 'before_school' && (
            <div className="flex items-baseline gap-1 shrink-0 text-right text-slate-500 dark:text-zinc-400">
              <span className="text-xs font-semibold">in</span>
              <span className="text-lg font-black text-slate-800 dark:text-zinc-200">
                {timelineState.startsInMinutes || 0}
              </span>
              <span className="text-xs font-bold">Min</span>
            </div>
          )}
        </div>

        {/* Lesson Progress Bar */}
        {(timelineState.status === 'lesson' || timelineState.status === 'pause') && (
          <div className="w-full mt-2">
            <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-700 ease-out rounded-full ${currentColors.bar}`}
                style={{ width: `${Math.max(3, timelineState.progressPct)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Secondary Information: Next Up (Als Nächstes) */}
      <div
        className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg border mb-3 shrink-0 ${
          currentIsLight
            ? 'bg-white/80 border-slate-200/80 text-slate-600'
            : 'bg-zinc-900/80 border-zinc-800 text-zinc-300'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider text-[0.625rem] shrink-0">
            Als Nächstes:
          </span>
          {nextUnit ? (
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              {nextUnit.isPause ? (
                <span className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <Coffee size={12} /> Pause
                </span>
              ) : (
                <span className="font-bold text-slate-800 dark:text-zinc-100 truncate">
                  {nextUnit.fach}
                </span>
              )}
              <span className="text-slate-400 dark:text-zinc-500 font-mono text-[0.6875rem]">
                ({formatTimeRange(nextUnit.startMinutes, nextUnit.endMinutes)})
              </span>
              {nextUnit.raum && (isLarge || isFullscreen) && (
                <span className="text-[0.625rem] text-slate-400 dark:text-zinc-500 ml-1">
                  · {nextUnit.raum}
                </span>
              )}
            </div>
          ) : (
            <span className="font-medium text-slate-500 dark:text-zinc-400">
              Schulschluss
            </span>
          )}
        </div>

        {/* Small arrow indicator */}
        {nextUnit && (
          <ArrowRight
            size={13}
            className="text-slate-400 dark:text-zinc-500 shrink-0 stroke-[2.25]"
          />
        )}
      </div>

      {/* Tertiary: Daily Timeline Bar (STANDARD, LARGE, FULLSCREEN) - hidden in COMPACT or extremely short heights */}
      {!isCompact && !isShortHeight && units.length > 0 && (
        <div className="flex-1 flex flex-col justify-end min-h-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[0.625rem] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Tagesverlauf
            </span>
            {pageCount > 1 && <div role="group" aria-label="Tagesabschnitte" className="flex items-center gap-1">
              <button type="button" aria-label="Vorheriger Tagesabschnitt" disabled={safePage === 0}
                onClick={() => { setTimelinePage(page => Math.max(0, page - 1)); setInspectedUnitId(null); }}
                className="min-h-8 min-w-8 rounded-lg border border-slate-300 disabled:opacity-30">
                <ChevronLeft size={14} className="mx-auto" />
              </button>
              <span className="text-[0.625rem] font-bold" aria-live="polite">{safePage + 1}/{pageCount}</span>
              <button type="button" aria-label="Nächster Tagesabschnitt" disabled={safePage + 1 >= pageCount}
                onClick={() => { setTimelinePage(page => Math.min(pageCount - 1, page + 1)); setInspectedUnitId(null); }}
                className="min-h-8 min-w-8 rounded-lg border border-slate-300 disabled:opacity-30">
                <ChevronRight size={14} className="mx-auto" />
              </button>
            </div>}
            <span className="text-[0.625rem] font-medium text-slate-400 dark:text-zinc-500">
              {units.filter((u) => !u.isPause).length} Unterrichtsstunden
            </span>
          </div>

          {/* Timeline Blocks Container */}
          <div className="flex items-stretch gap-1 w-full h-11 sm:h-12 min-h-[44px]">
            {visibleUnits.map((unit) => {
              const isCurrent = currentUnit?.id === unit.id;
              const isDone = unit.endTimestamp <= now.getTime();
              const isInspected = inspectedUnitId === unit.id;
              const style = getColorStyles(unit.colorKey, isCurrent, isDone);

              // Pause segments have a more slender visual weight
              const flexGrow = unit.isPause ? 'flex-grow-[0.6]' : 'flex-grow-[1.2]';

              return (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => {
                    setInspectedUnitId(inspectedUnitId === unit.id ? null : unit.id);
                  }}
                  className={`relative flex flex-col items-center justify-center px-1 rounded-lg border text-center transition-all min-w-0 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 ${flexGrow} ${
                    style.bg
                  } ${
                    isInspected ? 'ring-2 ring-indigo-500' : ''
                  }`}
                  title={`${unit.label}: ${unit.fach} (${formatTimeRange(
                    unit.startMinutes,
                    unit.endMinutes
                  )})`}
                  aria-label={`${unit.label}: ${unit.fach}`}
                >
                  {unit.isPause ? (
                    <Coffee size={13} className="stroke-[2.25]" />
                  ) : (
                    <>
                      <span className="text-[0.6875rem] font-black leading-none truncate max-w-full">
                        {unit.shortFach}
                      </span>
                      {/* Hour index for standard/large */}
                      {(isLarge || isFullscreen) && (
                        <span className="text-[0.5625rem] opacity-60 font-mono mt-0.5">
                          {unit.idx}. Std
                        </span>
                      )}
                    </>
                  )}

                  {/* Active Indicator dot */}
                  {isCurrent && (
                    <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 ring-2 ring-white dark:ring-zinc-950" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Inspected Unit Popup Detail (If teacher taps a segment) */}
          {inspectedUnit && (
            <div
              className={`mt-2 p-2 rounded-lg border text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-200 ${
                currentIsLight
                  ? 'bg-white border-slate-200 text-slate-700'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold">{inspectedUnit.label}:</span>
                <span className="font-medium">{inspectedUnit.fach}</span>
                {inspectedUnit.raum && (
                  <span className="text-slate-400 dark:text-zinc-400">
                    ({inspectedUnit.raum})
                  </span>
                )}
              </div>
              <span className="font-mono text-[0.6875rem] text-slate-500">
                {formatTimeRange(inspectedUnit.startMinutes, inspectedUnit.endMinutes)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TimelineWidget;
