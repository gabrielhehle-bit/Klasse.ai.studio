import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Calendar, ChevronLeft, ChevronRight, Coffee } from 'lucide-react';
import { CockpitWidgetConfig, AppState } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { getFachThemeStyles } from '../../../lib/fachColorUtils';
import {
  buildDayTimeline,
  getTimelineStatus,
  formatTimeRange,
  TimelineUnit,
} from '../../../lib/timelineAlgorithm';
import { useWidgetSize, useWidgetOverflowGuard } from '../widgetLayout';

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
  const panelId = useId();
  useWidgetOverflowGuard('TimelineWidget', containerRef);

  const [now, setNow] = useState(() => new Date());
  const [showDay, setShowDay] = useState(false);
  const [inspectedUnitId, setInspectedUnitId] = useState<string | null>(null);
  const [timelinePage, setTimelinePage] = useState(0);

  useEffect(() => {
    const updateTime = () => setNow(new Date());
    const timer = setInterval(updateTime, 20000);
    window.addEventListener('focus', updateTime);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', updateTime);
    };
  }, []);

  const units = useMemo(() => buildDayTimeline(app, now), [
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

  const { currentUnit, nextUnit, status, remainingMinutes, progressPct } = useMemo(
    () => getTimelineStatus(units, now),
    [units, now]
  );
  const isFullscreen = size.category === 'fullscreen';
  const roomyTimeline = isFullscreen || (size.width >= 820 && size.height >= 500);
  const short = size.height < 210;
  const stackCards = size.width < 360 && !short;
  const subjectSize = roomyTimeline
    ? 'text-4xl sm:text-5xl'
    : size.width >= 550
      ? 'text-3xl'
      : 'text-xl';

  // Keep at least 44px available for each hour and show longer days in pages.
  const unitsPerPage = Math.max(3, Math.min(8, Math.floor((size.width - 16) / 50)));
  const pageCount = Math.max(1, Math.ceil(units.length / unitsPerPage));
  const safePage = Math.min(timelinePage, pageCount - 1);
  const visibleUnits = units.slice(safePage * unitsPerPage, (safePage + 1) * unitsPerPage);
  const inspectedUnit = units.find(unit => unit.id === inspectedUnitId);
  const activeIndex = units.indexOf(currentUnit ?? nextUnit ?? units[units.length - 1]);
  const activePage = Math.max(0, Math.floor(activeIndex / unitsPerPage));

  useEffect(() => {
    setTimelinePage(activePage);
  }, [activePage, app?.activeClassId]);

  useEffect(() => {
    setInspectedUnitId(null);
  }, [units]);

  const empty = status === 'no_lessons';
  const currentTitle = status === 'pause'
    ? currentUnit?.label || 'Pause'
    : currentUnit?.fach ?? (status === 'before_school' ? 'Vor Unterrichtsbeginn' : 'Schulschluss');
  const nextTitle = nextUnit
    ? (nextUnit.isPause ? nextUnit.label : nextUnit.fach)
    : status === 'after_school' ? 'Heute nichts mehr' : 'Schulschluss';
  const getTheme = (unit: TimelineUnit | null) => getFachThemeStyles(
    unit && !unit.isPause && !unit.isFrei ? unit.fach : unit?.colorKey ?? 'slate',
    app?.fachConfig
  );
  const range = (unit: TimelineUnit) => formatTimeRange(unit.startMinutes, unit.endMinutes);
  const frameColors = currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-zinc-100';
  const buttonColors = currentIsLight
    ? 'border-slate-200 bg-white hover:bg-slate-50'
    : 'border-zinc-700 bg-zinc-900 hover:bg-zinc-800';
  const navigationButton = `min-h-11 min-w-11 rounded-xl border focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40 ${buttonColors}`;

  return (
    <div
      ref={containerRef}
      className={`flex h-full w-full flex-col gap-1.5 overflow-hidden select-none p-2 ${frameColors}`}
    >
      <div id={panelId} className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
        {empty ? (
          <div className="flex h-full items-center justify-center gap-2 px-2 text-center text-base font-bold">
            <Calendar size={20} className="shrink-0" aria-hidden="true" />
            Heute kein Unterricht eingetragen
          </div>
        ) : showDay ? (
          <div className={`flex h-full flex-col justify-start gap-2 p-0.5 ${short ? '' : 'sm:justify-center'}`}>
            {pageCount > 1 && (
              <div role="group" aria-label="Tagesabschnitte" className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  aria-label="Vorheriger Tagesabschnitt"
                  disabled={safePage === 0}
                  className={navigationButton}
                  onClick={() => { setTimelinePage(safePage - 1); setInspectedUnitId(null); }}
                >
                  <ChevronLeft size={16} className="mx-auto" aria-hidden="true" />
                </button>
                <span className="text-xs font-bold tabular-nums">{safePage + 1}/{pageCount}</span>
                <button
                  type="button"
                  aria-label="Nächster Tagesabschnitt"
                  disabled={safePage + 1 >= pageCount}
                  className={navigationButton}
                  onClick={() => { setTimelinePage(safePage + 1); setInspectedUnitId(null); }}
                >
                  <ChevronRight size={16} className="mx-auto" aria-hidden="true" />
                </button>
              </div>
            )}

            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${visibleUnits.length}, minmax(0, 1fr))` }}
            >
              {visibleUnits.map(unit => {
                const isCurrent = currentUnit?.id === unit.id;
                const isInspected = inspectedUnitId === unit.id;
                const theme = getTheme(unit);
                return (
                  <button
                    key={unit.id}
                    type="button"
                    aria-pressed={isInspected}
                    aria-current={isCurrent ? 'time' : undefined}
                    aria-label={unit.isPause ? unit.label : `${unit.label}: ${unit.fach}`}
                    title={`${unit.isPause ? unit.label : unit.fach} (${range(unit)})`}
                    onClick={() => setInspectedUnitId(isInspected ? null : unit.id)}
                    style={{
                      backgroundColor: isCurrent ? theme.bgMedium : theme.bgLight,
                      borderColor: theme.borderColor,
                    }}
                    className={`relative flex min-h-11 min-w-0 flex-col items-center justify-center rounded-lg border px-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${isInspected ? 'ring-2 ring-accent' : ''}`}
                  >
                    {unit.isPause ? <Coffee size={15} aria-hidden="true" /> : (
                      <>
                        <span className="max-w-full truncate text-xs font-black">{unit.shortFach}</span>
                        {size.width >= 550 && <span className="text-xs tabular-nums">{unit.idx}. Std</span>}
                      </>
                    )}
                    {isCurrent && (
                      <span className="absolute -bottom-0.5 size-1.5 rounded-full bg-accent" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>

            {inspectedUnit && (
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 px-1 text-sm [overflow-wrap:anywhere]">
                <span className="min-w-0">
                  <strong>{inspectedUnit.isPause ? inspectedUnit.label : inspectedUnit.fach}</strong>
                  {inspectedUnit.isVertretung && ' · Vertretung'}
                  {inspectedUnit.raum && ` · ${inspectedUnit.raum}`}
                </span>
                <span className="tabular-nums">{range(inspectedUnit)}</span>
              </div>
            )}
          </div>
        ) : (
          <div className={`grid min-h-full gap-1.5 ${stackCards ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {[
              { label: 'Jetzt', title: currentTitle, unit: currentUnit, isNow: true },
              { label: 'Als Nächstes', title: nextTitle, unit: nextUnit, isNow: false },
            ].map(({ label, title, unit, isNow }) => {
              const theme = getTheme(unit);
              const showRemaining = isNow && remainingMinutes > 0
                && (status === 'lesson' || status === 'pause' || status === 'before_school');
              return (
                <section
                  key={label}
                  aria-label={label}
                  style={{
                    backgroundColor: isNow ? theme.bgMedium : theme.bgLight,
                    borderColor: theme.borderColor,
                    borderTopColor: theme.hex,
                  }}
                  className={`flex min-w-0 flex-col justify-between rounded-xl border border-t-[3px] ${roomyTimeline ? 'p-5 sm:p-6' : short ? 'p-1.5' : 'p-2.5'}`}
                >
                  <h3 className={`font-bold ${roomyTimeline ? 'text-lg' : 'text-sm'}`}>{label}</h3>
                  <p className={`py-0.5 font-black tracking-tight leading-tight break-words [overflow-wrap:anywhere] ${subjectSize}`}>
                    {title}
                  </p>
                  <div className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-semibold ${roomyTimeline ? 'text-lg' : 'text-xs'}`}>
                    {unit && <span className="whitespace-nowrap tabular-nums">{range(unit)}</span>}
                    {showRemaining && (
                      <span className="whitespace-nowrap tabular-nums">
                        {status === 'before_school' ? 'Beginn in' : 'Noch'} {remainingMinutes} Min.
                      </span>
                    )}
                    {unit?.isVertretung && <span>Vertretung</span>}
                    {unit?.raum && <span className="min-w-0 [overflow-wrap:anywhere]">{unit.raum}</span>}
                  </div>
                  {isNow && unit && !short && (
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-500/20" aria-hidden="true">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${progressPct}%`, backgroundColor: theme.hex }}
                      />
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
      {!empty && (
        <button
          type="button"
          aria-controls={panelId}
          onClick={() => {
            if (!showDay) {
              setTimelinePage(activePage);
              setInspectedUnitId(null);
            }
            setShowDay(!showDay);
          }}
          className={`flex min-h-11 shrink-0 items-center gap-2 self-end rounded-xl border px-3 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${buttonColors}`}
        >
          {showDay && <ArrowLeft size={15} aria-hidden="true" />}
          {showDay ? 'Jetzt und als Nächstes' : 'Tagesverlauf'}
          {!showDay && <ArrowRight size={15} aria-hidden="true" />}
        </button>
      )}
    </div>
  );
};

export default TimelineWidget;
