import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Activity, ArrowLeft, ArrowRight, Backpack, BookOpen, Calculator, Calendar,
  CalendarRange, ChevronLeft, ChevronRight, CirclePause, Clock3, Flag, Globe2,
  Heart, Languages, LibraryBig, Music, Palette, Sandwich, Scissors, Star,
  UsersRound, type LucideIcon,
} from 'lucide-react';
import { CockpitWidgetConfig, AppState } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { getFachThemeStyles } from '../../../lib/fachColorUtils';
import {
  buildDayTimeline,
  getTimelineStatus,
  formatMinutes,
  formatTimeRange,
  TimelineUnit,
} from '../../../lib/timelineAlgorithm';
import { useWidgetSize, useWidgetOverflowGuard } from '../widgetLayout';
import { getSubjectIcon } from '../../../lib/wochenplanAnalyzer';

const subjectIcons: Record<string, LucideIcon> = {
  book: BookOpen, calculator: Calculator, globe: Globe2, languages: Languages,
  music: Music, palette: Palette, scissors: Scissors, activity: Activity,
  heart: Heart, star: Star,
};

function getUnitIcon(unit: TimelineUnit): LucideIcon {
  if (unit.isPause) return Sandwich;
  if (unit.isFrei) return CirclePause;
  const subject = unit.fach.toLocaleLowerCase('de');
  if (subject.includes('morgenkreis')) return UsersRound;
  if (subject.includes('bibliothek')) return LibraryBig;
  if (subject.includes('wochenplan')) return CalendarRange;
  return subjectIcons[getSubjectIcon(unit.fach)] ?? Backpack;
}

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
    let timer = 0;
    const updateTime = () => {
      const time = new Date();
      setNow(time);
      window.clearTimeout(timer);
      timer = window.setTimeout(updateTime, 60000 - time.getTime() % 60000);
    };
    updateTime();
    window.addEventListener('focus', updateTime);
    document.addEventListener('visibilitychange', updateTime);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', updateTime);
      document.removeEventListener('visibilitychange', updateTime);
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
  const roomyTimeline = size.width >= 700 && size.height >= 340;
  const short = size.height < 230;
  const finished = status === 'after_school';
  const subjectSize = roomyTimeline
    ? 'text-4xl sm:text-5xl'
    : size.width >= 550
      ? short ? 'text-2xl' : 'text-3xl'
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
    : currentUnit?.fach ?? (status === 'before_school' ? 'Unterricht beginnt' : 'Schulschluss');
  const nextTitle = nextUnit ? (nextUnit.isPause ? nextUnit.label : nextUnit.fach) : 'Schulschluss';
  const cards = [{ label: 'Jetzt', title: currentTitle, unit: currentUnit, isNow: true }];
  if (!finished) cards.push({ label: 'Danach', title: nextTitle, unit: nextUnit, isNow: false });
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
      className={`flex h-full w-full flex-col gap-1.5 overflow-hidden rounded-b-2xl select-none p-2 ${frameColors}`}
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
                const Icon = getUnitIcon(unit);
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
                    <Icon size={16} strokeWidth={2.3} aria-hidden="true" />
                    {!unit.isPause && (
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
                {inspectedUnit.tafelhinweis && (
                  <p className="basis-full font-medium">{inspectedUnit.tafelhinweis}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className={`grid min-h-full gap-2 ${finished ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {cards.map(({ label, title, unit, isNow }) => {
              const theme = getTheme(unit);
              const Icon = unit ? getUnitIcon(unit)
                : finished || !isNow ? Flag : status === 'pause' ? Sandwich : Clock3;
              const time = unit ? range(unit) : !isNow && currentUnit ? `${formatMinutes(currentUnit.endMinutes)} Uhr` : null;
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
                  className={`flex min-w-0 flex-col gap-1 rounded-xl border ${isNow ? 'border-t-4' : 'border-t-2'} ${roomyTimeline ? 'p-5' : short ? 'p-1.5' : 'p-2.5'}`}
                >
                  <div className={roomyTimeline ? 'my-auto flex min-w-0 flex-col items-center gap-2 text-center' : 'contents'}>
                    <div className={`flex items-center ${roomyTimeline ? 'flex-col-reverse gap-3' : 'justify-between gap-1'}`}>
                      <h3 className={`font-bold ${roomyTimeline ? 'text-xl' : 'text-base'}`}>{label}</h3>
                      <span className={`grid shrink-0 place-items-center rounded-xl ${roomyTimeline ? 'size-20' : short ? 'size-9' : 'size-11'}`}
                        style={{ backgroundColor: theme.bgMedium, color: currentIsLight ? theme.darkTextColor : undefined }}>
                        <Icon aria-hidden="true" data-timeline-symbol className={roomyTimeline ? 'size-14' : short ? 'size-7' : 'size-9'} strokeWidth={2.3} />
                      </span>
                    </div>
                    <p data-timeline-title aria-live="polite"
                      className={`max-w-full font-black tracking-tight leading-tight [overflow-wrap:anywhere] ${subjectSize}`}>{title}</p>
                    {unit?.tafelhinweis && (
                      <p className={`max-w-full font-semibold leading-snug [overflow-wrap:anywhere] ${roomyTimeline ? 'text-xl' : short ? 'text-xs' : 'text-sm'}`}>
                        {unit.tafelhinweis}
                      </p>
                    )}
                  </div>
                  {(time || showRemaining || unit?.isVertretung || unit?.raum) && (
                    <div className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-semibold ${roomyTimeline ? 'justify-center text-lg' : 'mt-auto text-xs'}`}>
                      {time && <span className="whitespace-nowrap tabular-nums">{time}</span>}
                      {showRemaining && (
                        <span className="whitespace-nowrap tabular-nums">
                          {status === 'before_school' ? 'In' : 'Noch'} {remainingMinutes} Min.
                        </span>
                      )}
                      {unit?.isVertretung && <span>Vertretung</span>}
                      {unit?.raum && <span className="min-w-0 [overflow-wrap:anywhere]">{unit.raum}</span>}
                    </div>
                  )}
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
          className={`flex min-h-11 shrink-0 items-center gap-2 self-start rounded-xl border px-3 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${buttonColors}`}
        >
          {showDay && <ArrowLeft size={15} aria-hidden="true" />}
          {showDay ? 'Jetzt und danach' : 'Tagesverlauf'}
          {!showDay && <ArrowRight size={15} aria-hidden="true" />}
        </button>
      )}
    </div>
  );
};

export default TimelineWidget;
