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

type NamedPupil = { id: string; vorname?: string; nachname?: string; name?: string };

/** A class can contain two children with the same first name AND surname initial.
 * Disambiguate in the random picker without putting internal pupil IDs on the board. */
function getUnambiguousPickerName(student: NamedPupil, roster: NamedPupil[]): string {
  const short = getDisplayStudentName(student, roster);
  const sameShort = roster.filter(child => getDisplayStudentName(child, roster) === short);
  if (sameShort.length <= 1) return short;
  const fullName = (child: NamedPupil) => {
    const first = child.vorname || child.name?.split(' ')[0] || 'Kind';
    const surname = child.nachname || child.name?.split(' ').slice(1).join(' ') || '';
    return [first, surname].filter(Boolean).join(' ');
  };
  const full = fullName(student);
  const sameFull = sameShort.filter(child => fullName(child) === full);
  return sameFull.length > 1 ? `${full} (${sameFull.findIndex(child => child.id === student.id) + 1})` : full;
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
  // Only the central Widget hinzufügen settings can change this class-local
  // attendance scope. The session participant selector remains transient.
  const { soundEnabled, animationEnabled, selectionMode, studentScope } = getRandomNameWidgetPreferences(widget.settings);
  const selectableStudents: typeof presentStudents = studentScope === 'all' ? allStudents : presentStudents;

  const [sessionExcludedIds, setSessionExcludedIds] = useState<string[]>([]);
  const [sessionScope, setSessionScope] = useState(scopeKey);
  const excludedIds = sessionScope === scopeKey ? sessionExcludedIds : [];
  const eligibleStudents = useMemo(
    () => eligibleRandomStudents(selectableStudents, excludedIds),
    [selectableStudents, excludedIds],
  );
  // A teaching SESSION only: no class roll-call history or random result is
  // written to persistent app state or exposed to other device screens.
  const [drawnIds, setDrawnIds] = useState<string[]>([]);
  const drawLockRef = useRef(false);
  useEffect(() => { drawLockRef.current = false; }, [drawnIds]);
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
    drawLockRef.current = false;
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
    ? getUnambiguousPickerName(selectedStudent, allStudents)
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
  const compact = widgetSize.width < 380 || widgetSize.height < 330;
  const veryCompact = widgetSize.width < 285 || widgetSize.height < 245;
  const poolFingerprint = eligibleStudents.map(student => student.id).join('|');
  const livePoolRef = useRef({ scopeKey, poolFingerprint, selectionMode, studentScope });
  livePoolRef.current = { scopeKey, poolFingerprint, selectionMode, studentScope };
  useEffect(() => {
    if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
    animationIntervalRef.current = null;
    setIsAnimating(false);
    setAnimatingName('');
    drawLockRef.current = false;
    // Attendance changes, class changes and manual exclusions invalidate an
    // in-flight draw; the result may no longer be a pupil who can be chosen.
    if (selectedStudentId && !eligibleStudents.some(student => student.id === selectedStudentId)) {
      setSelectedStudentId(null);
    }
  }, [scopeKey, poolFingerprint, selectedStudentId, studentScope]);
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
  const selectionPage = randomSelectionPage(selectableStudents, selectorPage, pageSize);

  const pickPupil = useCallback(() => {
    if (isAnimating || drawLockRef.current || sessionScope !== scopeKey || remainingStudents.length === 0) return;
    const chosen = pickRandomStudent(remainingStudents,
      selectionMode === 'round' ? null : lastPickedIdRef.current);
    if (!chosen) return;
    drawLockRef.current = true;
    const initialPool = livePoolRef.current;
    const commitPick = () => {
      // Never commit a stale result after attendance, scope, or participant
      // selection changed while the name animation was running.
      const live = livePoolRef.current;
      if (live.scopeKey !== initialPool.scopeKey ||
          live.poolFingerprint !== initialPool.poolFingerprint ||
          live.selectionMode !== initialPool.selectionMode ||
          live.studentScope !== initialPool.studentScope) {
        setIsAnimating(false);
        setAnimatingName('');
        drawLockRef.current = false;
        return;
      }
      setIsAnimating(false);
      setAnimatingName('');
      setSelectedStudentId(chosen.id);
      setSelectedScope(scopeKey);
      lastPickedIdRef.current = chosen.id;
      setDrawnIds(previous => selectionMode === 'round'
        ? [...previous, chosen.id] : [...previous.slice(-49), chosen.id]);
      if (soundEnabled) playDezentPopSound();
    };
    if (!animationEnabled) { commitPick(); return; }
    setIsAnimating(true);
    let tick = 0;
    animationIntervalRef.current = setInterval(() => {
      const temporary = pickRandomStudent(remainingStudents, null);
      setAnimatingName(temporary ? getUnambiguousPickerName(temporary, allStudents) : '');
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
    drawLockRef.current = false;
    setDrawnIds([]);
    setSelectedStudentId(null);
    lastPickedIdRef.current = null;
  };
  const undoPick = () => {
    if (isAnimating || drawLockRef.current || drawnIds.length === 0 || sessionScope !== scopeKey) return;
    const previous = undoLastRandomPick(drawnIds);
    setDrawnIds(previous.drawnIds);
    setSelectedStudentId(previous.previousSelectedId);
    setSelectedScope(scopeKey);
    lastPickedIdRef.current = previous.previousSelectedId;
  };

  useEffect(() => {
    if (!showPupilSelector) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowPupilSelector(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showPupilSelector]);

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
        <p className="text-xs sm:text-sm">{studentScope === 'present'
          ? 'Nur heute anwesende Kinder. Für alle Kinder ändere die zentrale Einstellung unter Widget hinzufügen → Zufallsauswahl.'
          : 'Alle Kinder der Klasse – auch abwesende. Du kannst einzelne Kinder für diese Unterrichtsphase pausieren.'} Die Auswahl wird nicht dauerhaft gespeichert.</p>
        <p className="text-sm font-semibold" role="status">
          {eligibleStudents.length} von {selectableStudents.length} {studentScope === 'all' ? 'Kindern der Klasse' : 'anwesenden Kindern'} aktiv
          {selectionMode === 'round' && ` · ${remainingCount} noch nicht gezogen`}
        </p>
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
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">{getUnambiguousPickerName(student, allStudents)}</span>
                <span className="shrink-0">{excluded ? '○' : '✓'}</span>
              </button>
            );
          })}
        </div>
        {selectableStudents.length === 0 && <p role="status">{studentScope === 'all' ? 'Keine Kinder in dieser Klasse.' : 'Keine anwesenden Kinder in dieser Klasse.'}</p>}
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
      className={`relative flex h-full w-full min-h-0 flex-col ${compact ? 'gap-1 p-1.5' : 'gap-2 p-2 sm:p-3'} rounded-2xl border ${currentIsLight ? 'border-slate-200 bg-slate-50 text-slate-900' : 'border-white/10 bg-zinc-950 text-white'}`}>
      <div className={`flex shrink-0 items-center justify-between gap-1 ${veryCompact ? 'min-h-9' : ''}`}>
        <div className="min-w-0">
          {!veryCompact && <span className={`block font-black ${compact ? 'text-xs' : 'text-sm'}`}>🎯 Zufallsauswahl</span>}
          {!compact && <span className="block text-xs font-medium opacity-75">
            {selectionMode === 'round' ? 'Jedes Kind einmal' : 'Zufällig · Wiederholungen möglich'} · {studentScope === 'all' ? 'Ganze Klasse' : 'Heute anwesend'}
          </span>}
        </div>
        <button type="button" onClick={() => { setSelectorPage(0); setShowPupilSelector(true); }}
          className={`flex shrink-0 items-center justify-center rounded-xl border border-slate-300 px-2 text-xs font-bold ${compact ? 'min-h-9 min-w-9' : 'min-h-11 min-w-11'}`}
          aria-label="Kinder für diese Unterrichtsphase auswählen" title="Kinder auswählen">
          <ListFilter size={20}/>{!compact && <span className="ml-1">Kinder wählen</span>}
        </button>
      </div>
      <button type="button" onClick={pickPupil}
        disabled={isAnimating || remainingStudents.length === 0}
        className={`flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center ${compact ? 'gap-1 p-1.5' : 'gap-2 p-2'} rounded-2xl border-2 text-center focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed ${currentIsLight ? 'border-indigo-200 bg-white' : 'border-indigo-500/40 bg-zinc-900'}`}
        aria-label={selectedName ? 'Weiteres Kind ziehen' : 'Zufälliges Kind ziehen'}>
        {isAnimating ? (
          <span className="w-full break-words text-lg font-black [overflow-wrap:anywhere]">{animatingName || 'Zufall …'}</span>
        ) : eligibleStudents.length === 0 ? (
          <span role="status" className="break-words text-sm font-bold">
            {allStudents.length === 0 ? 'In dieser Klasse sind noch keine Kinder angelegt.'
              : selectableStudents.length === 0 ? studentScope === 'all' ? 'In dieser Klasse sind keine Kinder zur Auswahl vorhanden.' : 'Heute sind keine Kinder zur Auswahl anwesend.'
              : 'Alle Kinder sind pausiert. Wähle mindestens ein Kind aus.'}
          </span>
        ) : roundComplete && !selectedName ? (
          <span role="status" className="break-words text-lg font-black">Runde abgeschlossen! Starte eine neue Runde.</span>
        ) : selectedName ? (
          <>
            {!compact && <span className="text-xs font-bold uppercase text-indigo-600">
              {roundComplete ? 'Runde abgeschlossen · letztes Kind' : 'Ausgewählt'}
            </span>}
            <span aria-live="polite" className={`max-w-full break-words font-black leading-[0.98] [overflow-wrap:anywhere] ${
              selectedName.length > 36
                ? (veryCompact ? 'text-sm' : 'text-base sm:text-xl')
                : veryCompact
                  ? 'text-xl'
                  : compact
                    ? 'text-2xl sm:text-3xl'
                    : 'text-2xl sm:text-4xl'
            }`}>{selectedName}</span>
          </>
        ) : <span className="break-words text-base font-bold">Kind auswählen</span>}
      </button>
      <div className={`flex shrink-0 flex-col ${compact ? 'gap-0.5' : 'gap-1'}`}>
        {!veryCompact && <span className={`text-center font-semibold ${compact ? 'text-[10px]' : 'text-xs'}`} aria-live="polite">
          {selectionMode === 'round'
            ? `${remainingCount} noch offen · ${validDrawnIds.length} gezogen · ${eligibleStudents.length} aktiv`
            : `${eligibleStudents.length} Kinder zur Auswahl`}
        </span>}
        <button type="button" onClick={pickPupil} disabled={isAnimating || remainingStudents.length === 0}
          className={`flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 font-black text-white ${compact ? 'min-h-10 text-xs' : 'min-h-12 text-sm'} disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600">
          <Sparkles size={18}/>{isAnimating ? 'Wählt aus …' : roundComplete ? 'Runde abgeschlossen' : selectedName ? 'Nächstes Kind' : 'Kind auswählen'}
        </button>
        {(drawnIds.length > 0 || roundComplete) && (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={undoPick} disabled={isAnimating || drawnIds.length === 0}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-2 text-xs font-bold disabled:opacity-50"
              aria-label="Letzte Ziehung zurücknehmen"><Undo2 size={16}/> Rückgängig</button>
            <button type="button" onClick={resetRound} disabled={isAnimating}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-indigo-300 px-2 text-xs font-bold disabled:opacity-50"
              aria-label={selectionMode === 'round' ? 'Neue Ziehungsrunde starten' : 'Ziehungsverlauf zurücksetzen'}>
              <RotateCcw size={16}/>{selectionMode === 'round' ? 'Neue Runde' : 'Zurücksetzen'}
            </button>
          </div>
        )}
      </div>
      {selector}
    </div>
  );
};

export default RandomNameWidget;
