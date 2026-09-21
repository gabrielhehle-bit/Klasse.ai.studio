import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, ListFilter, Sparkles, RotateCcw, Undo2, X } from 'lucide-react';
import type { AppState, CockpitWidgetConfig } from '../../../types';
import { getTodayIsoDate } from '../../../lib/kidAttendanceAlgorithm';
import {
  eligibleRandomStudents, pickRandomStudent, randomSelectionPage,
  getRandomNameWidgetPreferences, remainingRandomRoundStudents, undoLastRandomPick,
} from '../../../lib/randomNameWidgetModel';
import { useApp } from '../../../context/AppContext';
import { getDisplayStudentName, getPresentStudents } from '../studentSelectionUtils';

export interface RandomNameWidgetProps {
  widget: CockpitWidgetConfig;
  onUpdate?: (updates: Partial<CockpitWidgetConfig>) => void;
  app?: AppState;
  currentIsLight: boolean;
}

function playDezentPopSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(640, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.onended = () => { void ctx.close(); };
    osc.start();
    osc.stop(ctx.currentTime + 0.14);
  } catch {
    // Audio is optional: the selection must keep working without sound.
  }
}

/** A lesson action, not a second widget-settings panel. The temporary pupil
 * inclusion list is intentionally kept only in memory and never exported. */
export const RandomNameWidget: React.FC<RandomNameWidgetProps> = ({
  widget, app: propApp, currentIsLight,
}) => {
  const context = useApp();
  const app = propApp || context?.app;
  const activeClassId = app?.activeClassId || 'no-class';
  const [dayKey, setDayKey] = useState(getTodayIsoDate);
  const scopeKey = activeClassId + ':' + dayKey;

  // A midnight switch and a return to the browser both refresh the attendance pool.
  useEffect(() => {
    const refreshDay = () => setDayKey(getTodayIsoDate());
    const interval = window.setInterval(refreshDay, 30_000);
    window.addEventListener('focus', refreshDay);
    document.addEventListener('visibilitychange', refreshDay);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshDay);
      document.removeEventListener('visibilitychange', refreshDay);
    };
  }, []);

  // app.schueler is the active class roster. An empty roster NEVER creates demo pupils.
  const allStudents = app?.activeClassId ? (app.schueler ?? []) : [];
  const presentStudents = useMemo(
    () => getPresentStudents(allStudents, app),
    [allStudents, app, dayKey],
  );

  const [sessionExcludedIds, setSessionExcludedIds] = useState<string[]>([]);
  const [sessionScope, setSessionScope] = useState(scopeKey);
  const excludedIds = sessionScope === scopeKey ? sessionExcludedIds : [];
  const eligibleStudents = useMemo(
    () => eligibleRandomStudents(presentStudents, excludedIds),
    [presentStudents, excludedIds],
  );
  // A teaching SESSION only: no class roll-call history or random result is
  // written to persistent app state or exposed to other device screens.
  const [drawnIds, setDrawnIds] = useState<string[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState(scopeKey);
  const lastPickedIdRef = useRef<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatingName, setAnimatingName] = useState('');
  const animationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showPupilSelector, setShowPupilSelector] = useState(false);
  const [selectorPage, setSelectorPage] = useState(0);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === 'undefined' ? 1024 : window.innerWidth,
    height: typeof window === 'undefined' ? 768 : window.innerHeight,
  }));
  const [widgetSize, setWidgetSize] = useState({ width: 350, height: 350 });
  const containerRef = useRef<HTMLDivElement>(null);
  const { soundEnabled, animationEnabled, selectionMode } = getRandomNameWidgetPreferences(widget.settings);

  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      if (rect && rect.width > 0 && rect.height > 0) {
        setWidgetSize({ width: rect.width, height: rect.height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Never show the previous class's selected pupil or exclusions, even for one render.
  useEffect(() => {
    if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
    animationIntervalRef.current = null;
    setIsAnimating(false);
    setAnimatingName('');
    setSessionExcludedIds([]);
    setSessionScope(scopeKey);
    setDrawnIds([]);
    setSelectedStudentId(null);
    setSelectedScope(scopeKey);
    lastPickedIdRef.current = null;
    setShowPupilSelector(false);
    setSelectorPage(0);
    return () => {
      if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    };
  }, [scopeKey]);

  const selectedStudent = selectedScope === scopeKey
    ? eligibleStudents.find(student => student.id === selectedStudentId) ?? null
    : null;
  const selectedName = selectedStudent
    ? getDisplayStudentName(selectedStudent, allStudents)
    : null;
  const remainingStudents = useMemo(
    () => selectionMode === 'round'
      ? remainingRandomRoundStudents(eligibleStudents, drawnIds)
      : eligibleStudents,
    [eligibleStudents, drawnIds, selectionMode],
  );
  const roundComplete = selectionMode === 'round' && eligibleStudents.length > 0 && remainingStudents.length === 0;
  const validDrawnIds = drawnIds.filter(id => eligibleStudents.some(student => student.id === id));
  const remainingCount = remainingStudents.length;
  const compact = widgetSize.width < 320 || widgetSize.height < 280;
  const poolFingerprint = eligibleStudents.map(student => student.id).join('|');
  const livePoolRef = useRef({ scopeKey, poolFingerprint, selectionMode });
  livePoolRef.current = { scopeKey, poolFingerprint, selectionMode };
  useEffect(() => {
    if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
    animationIntervalRef.current = null;
    setIsAnimating(false);
    setAnimatingName('');
    // Attendance changes, class changes and manual exclusions invalidate an
    // in-flight draw; the result may no longer be a pupil who can be chosen.
    if (selectedStudentId && !eligibleStudents.some(student => student.id === selectedStudentId)) {
      setSelectedStudentId(null);
    }
  }, [scopeKey, poolFingerprint, selectedStudentId]);
  useEffect(() => {
    if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
    animationIntervalRef.current = null;
    setIsAnimating(false);
    setAnimatingName('');
    setSelectedStudentId(null);
    setDrawnIds([]);
    lastPickedIdRef.current = null;
  }, [selectionMode]);
  const pageSize = viewport.height < 480 ? 2
    : viewport.width < 640 || viewport.height < 650 ? 4
    : viewport.height < 850 ? 6 : 8;
  const selectionPage = randomSelectionPage(presentStudents, selectorPage, pageSize);

  const pickPupil = useCallback(() => {
    if (isAnimating || sessionScope !== scopeKey || remainingStudents.length === 0) return;
    const chosen = pickRandomStudent(remainingStudents,
      selectionMode === 'round' ? null : lastPickedIdRef.current);
    if (!chosen) return;
    const initialPool = livePoolRef.current;
    const commitPick = () => {
      // Never commit a stale result after attendance, scope, or participant
      // selection changed while the name animation was running.
      const live = livePoolRef.current;
      if (live.scopeKey !== initialPool.scopeKey ||
          live.poolFingerprint !== initialPool.poolFingerprint ||
          live.selectionMode !== initialPool.selectionMode) {
        setIsAnimating(false);
        setAnimatingName('');
        return;
      }
      setIsAnimating(false);
      setAnimatingName('');
      setSelectedStudentId(chosen.id);
      setSelectedScope(scopeKey);
      lastPickedIdRef.current = chosen.id;
      setDrawnIds(previous => [...previous, chosen.id]);
      if (soundEnabled) playDezentPopSound();
    };
    if (!animationEnabled) { commitPick(); return; }
    setIsAnimating(true);
    let tick = 0;
    animationIntervalRef.current = window.setInterval(() => {
      const temporary = pickRandomStudent(remainingStudents, null);
      setAnimatingName(temporary ? getDisplayStudentName(temporary, allStudents) : '');
      tick += 1;
      if (tick >= 7) {
        if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
        commitPick();
      }
    }, 65);
  }, [allStudents, remainingStudents, isAnimating, scopeKey, sessionScope, soundEnabled, animationEnabled, selectionMode]);

  const resetRound = () => {
    if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
    animationIntervalRef.current = null;
    setIsAnimating(false);
    setAnimatingName('');
    setDrawnIds([]);
    setSelectedStudentId(null);
    lastPickedIdRef.current = null;
  };
  const undoPick = () => {
    if (isAnimating || drawnIds.length === 0 || sessionScope !== scopeKey) return;
    const previous = undoLastRandomPick(drawnIds);
    setDrawnIds(previous.drawnIds);
    setSelectedStudentId(previous.previousSelectedId);
    setSelectedScope(scopeKey);
    lastPickedIdRef.current = previous.previousSelectedId;
  };

  const selector = showPupilSelector && typeof document !== 'undefined' && createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/80 p-2 sm:p-5"
      role="presentation" onPointerDown={event => event.stopPropagation()}>
      <section role="dialog" aria-modal="true" aria-label="Kinder für die Zufallsauswahl auswählen"
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col gap-2 rounded-2xl bg-white p-3 text-slate-900 shadow-2xl sm:p-5">
        <div className="flex shrink-0 items-center justify-between gap-2">
          <h2 className="text-base font-black sm:text-xl">Kinder auswählen</h2>
          <button type="button" onClick={() => setShowPupilSelector(false)}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-300"
            aria-label="Kinderauswahl schließen"><X size={20} /></button>
        </div>
        <p className="text-xs sm:text-sm">Wähle, wer in dieser Unterrichtsphase gezogen werden darf. Die Auswahl wird nicht dauerhaft gespeichert.</p>
        <p className="text-sm font-semibold" role="status">{eligibleStudents.length} von {presentStudents.length} Kindern aktiv</p>
        <div className="grid min-h-0 grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Anwesende Kinder auf dieser Seite">
          {selectionPage.items.map(student => {
            const excluded = excludedIds.includes(student.id);
            return (
              <button type="button" key={student.id}
                aria-pressed={!excluded}
                onClick={() => {
                  setSessionScope(scopeKey);
                  setSessionExcludedIds(previous =>
                    previous.includes(student.id)
                      ? previous.filter(id => id !== student.id)
                      : [...previous, student.id]);
                }}
                className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-indigo-600 ${excluded ? 'border-slate-300 bg-slate-100 text-slate-600' : 'border-indigo-300 bg-indigo-50 text-indigo-900'}`}>
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">{getDisplayStudentName(student, allStudents)}</span>
                <span className="shrink-0">{excluded ? '○' : '✓'}</span>
              </button>
            );
          })}
        </div>
        {presentStudents.length === 0 && <p role="status">Keine anwesenden Kinder in dieser Klasse.</p>}
        <nav className="flex shrink-0 items-center justify-between gap-2" aria-label="Seiten der Kinderauswahl">
          <button type="button" disabled={selectionPage.page === 0}
            onClick={() => setSelectorPage(page => Math.max(0, page - 1))}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-300 disabled:opacity-40"
            aria-label="Vorherige Kinderseite"><ChevronLeft /></button>
          <span className="text-sm font-semibold">Seite {selectionPage.page + 1} von {selectionPage.pageCount}</span>
          <button type="button" disabled={selectionPage.page + 1 >= selectionPage.pageCount}
            onClick={() => setSelectorPage(page => page + 1)}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-300 disabled:opacity-40"
            aria-label="Nächste Kinderseite"><ChevronRight /></button>
        </nav>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={() => { setSessionScope(scopeKey); setSessionExcludedIds([]); }}
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-bold">Alle aktivieren</button>
          <button type="button" onClick={() => setShowPupilSelector(false)}
            className="min-h-11 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white">Fertig</button>
        </div>
      </section>
    </div>,
    document.body,
  );

  return (
    <div ref={containerRef}
      className={`relative flex h-full w-full min-h-0 flex-col gap-2 rounded-2xl border p-2 sm:p-3 ${currentIsLight ? 'border-slate-200 bg-slate-50 text-slate-900' : 'border-white/10 bg-zinc-950 text-white'}`}>
      <div className="flex shrink-0 items-center justify-between gap-1">
        <span className="min-w-0 text-sm font-black">🎯 Zufälliges Kind</span>
        <button type="button" onClick={() => { setSelectorPage(0); setShowPupilSelector(true); }}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 px-2 text-xs font-bold"
          aria-label="Kinder für diese Unterrichtsphase auswählen" title="Kinder auswählen">
          <ListFilter size={20}/>{!compact && <span className="ml-1">Kinder wählen</span>}
        </button>
      </div>
      <button type="button" onClick={pickPupil}
        disabled={isAnimating || eligibleStudents.length === 0}
        className={`flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-2 rounded-2xl border-2 p-2 text-center focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed ${currentIsLight ? 'border-indigo-200 bg-white' : 'border-indigo-500/40 bg-zinc-900'}`}
        aria-label={selectedName ? 'Weiteres Kind ziehen' : 'Zufälliges Kind ziehen'}>
        {isAnimating ? (
          <span className="w-full break-words text-lg font-black [overflow-wrap:anywhere]">{animatingName || 'Zufall …'}</span>
        ) : eligibleStudents.length === 0 ? (
          <span role="status" className="break-words text-sm font-bold">
            {allStudents.length === 0 ? 'In dieser Klasse sind noch keine Kinder angelegt.'
              : presentStudents.length === 0 ? 'Heute sind keine Kinder zur Auswahl anwesend.'
              : 'Alle Kinder sind pausiert. Wähle mindestens ein Kind aus.'}
          </span>
        ) : selectedName ? (
          <>
            {!compact && <span className="text-xs font-bold uppercase text-indigo-600">Ausgewählt</span>}
            <span className={`max-w-full break-words font-black leading-tight [overflow-wrap:anywhere] ${selectedName.length > 36 ? 'text-base sm:text-xl' : compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-4xl'}`}>{selectedName}</span>
          </>
        ) : <span className="break-words text-base font-bold">Kind auswählen</span>}
      </button>
      <div className="flex shrink-0 flex-col gap-1">
        <span className="text-center text-xs font-semibold">{eligibleStudents.length} Kinder zur Auswahl</span>
        <button type="button" onClick={pickPupil} disabled={isAnimating || eligibleStudents.length === 0}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600">
          <Sparkles size={18}/>{isAnimating ? 'Wählt aus …' : selectedName ? 'Noch einmal' : 'Kind auswählen'}
        </button>
      </div>
      {selector}
    </div>
  );
};

export default RandomNameWidget;
