import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Sparkles, RotateCcw, Volume2, VolumeX, ListFilter, 
  X, Check, Users, UserCheck
} from 'lucide-react';
import { CockpitWidgetConfig, Student, AppState } from '../../../types';
import { useApp } from '../../../context/AppContext';
import {
  getDisplayStudentName,
  isStudentAbsentToday,
  DEFAULT_MOCK_STUDENTS,
  CockpitStudent,
} from '../studentSelectionUtils';

export interface RandomNameWidgetProps {
  widget: CockpitWidgetConfig;
  onUpdate?: (updates: Partial<CockpitWidgetConfig>) => void;
  app?: AppState;
  currentIsLight: boolean;
}

/**
 * Dezenter, extrem kurzer "Pop"-Klang für das Ziehen (Web Audio API)
 */
function playDezentPopSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Sanfter Frequenz-Sweep: 420 Hz -> 640 Hz in 80ms
    osc.frequency.setValueAtTime(420, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(640, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.14);
  } catch {
    // Geräuschlos ignorieren
  }
}

export const RandomNameWidget: React.FC<RandomNameWidgetProps> = ({
  widget,
  onUpdate,
  app: propApp,
  currentIsLight,
}) => {
  const context = useApp();
  const app = propApp || context?.app;

  // Alle Schüler der Klasse bzw. Demo-Fallback
  const allStudents = useMemo(() => {
    return app?.schueler && app.schueler.length > 0 ? app.schueler : DEFAULT_MOCK_STUDENTS;
  }, [app?.schueler]);

  // Automatisch anwesende Kinder ermitteln (Abwesende nach F5-Logik ausgeschlossen)
  const presentStudents = useMemo(() => {
    return allStudents.filter((s) => !isStudentAbsentToday(s.id, app));
  }, [allStudents, app]);

  // Temporär lokal ausgeschlossene Schüler-IDs (nur für die aktuelle Session im Speicher, nicht persistiert!)
  const [sessionExcludedIds, setSessionExcludedIds] = useState<string[]>([]);

  // Schülerpool für die spontane Ziehung: anwesend UND nicht session-ausgeschlossen
  const eligibleStudents = useMemo(() => {
    const filtered = presentStudents.filter((s) => !sessionExcludedIds.includes(s.id));
    return filtered.length > 0 ? filtered : presentStudents;
  }, [presentStudents, sessionExcludedIds]);

  // Lokaler State für das aktuell gezogene Kind (keine dauerhafte Persistenz nötig)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Schutzlogik: Letztes Kind für die unmittelbar nächste Ziehung merken
  const lastPickedIdRef = useRef<string | null>(null);

  // Sound-Einstellung (lokal im Widget oder Settings)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Schnelle Misch-Animation
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatingName, setAnimatingName] = useState<string>('');

  // Temporäre Filter-Ansicht („Auswahl einschränken“)
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Container-Größe für responsives Smartboard-Layout
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 350, height: 350 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setContainerSize({ width, height });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return allStudents.find((s) => s.id === selectedStudentId) || null;
  }, [selectedStudentId, allStudents]);

  /**
   * Ein-Klick-Auswahl:
   * Wählt sofort spontan ein anwesendes Kind aus dem Pool.
   * Direkte Wiederholung wird vermieden, sofern >= 2 Kinder zur Auswahl stehen.
   */
  const handlePickRandomStudent = useCallback(() => {
    if (isAnimating || eligibleStudents.length === 0) return;

    // Schutzlogik: Vermeidung direkter Wiederholung bei >= 2 Kindern
    let candidatePool = eligibleStudents;
    if (eligibleStudents.length >= 2 && lastPickedIdRef.current) {
      const poolWithoutLast = eligibleStudents.filter((s) => s.id !== lastPickedIdRef.current);
      if (poolWithoutLast.length > 0) {
        candidatePool = poolWithoutLast;
      }
    }

    const randomIndex = Math.floor(Math.random() * candidatePool.length);
    const chosenOne = candidatePool[randomIndex];
    if (!chosenOne) return;

    setIsAnimating(true);

    // Schneller Namenswechsel für ca. 450-500ms
    let tick = 0;
    const maxTicks = 7;
    const interval = setInterval(() => {
      const randPoolIdx = Math.floor(Math.random() * eligibleStudents.length);
      const tempStudent = eligibleStudents[randPoolIdx] || chosenOne;
      setAnimatingName(getDisplayStudentName(tempStudent, allStudents));
      tick++;

      if (tick >= maxTicks) {
        clearInterval(interval);
        setIsAnimating(false);
        setAnimatingName('');
        setSelectedStudentId(chosenOne.id);
        lastPickedIdRef.current = chosenOne.id;

        if (soundEnabled) {
          playDezentPopSound();
        }
      }
    }, 65);
  }, [isAnimating, eligibleStudents, allStudents, soundEnabled]);

  // Tastaturbedienung (Space oder Enter wählt sofort ein Kind)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handlePickRandomStudent();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePickRandomStudent]);

  // Temporäres Umschalten einzelner Schüler in der Session
  const toggleStudentSessionExclusion = (studentId: string) => {
    setSessionExcludedIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const isSmall = containerSize.width < 280 || containerSize.height < 240;
  const isLargeOrFullscreen = containerSize.width > 600 || containerSize.height > 480;

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col justify-between w-full h-full p-3 sm:p-5 rounded-2xl overflow-hidden select-none transition-colors duration-200 border ${
        currentIsLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-white/10'
      }`}
    >
      {/* ========================================================================= */}
      {/* TOP BAR: Dezente Kennzeichnung, Anwesend-Zähler & Schnelleinstellungen     */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between gap-2 shrink-0 pb-2 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-base sm:text-lg">🎯</span>
          <div className="min-w-0">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider block text-slate-800 dark:text-white leading-tight truncate">
              Zufallsname
            </span>
            {!isSmall && (
              <span className="text-[10px] font-bold text-slate-400 block truncate">
                Spontane Schülerauswahl
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Anwesenheits-Hinweis */}
          {!isSmall && (
            <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-200/70 dark:bg-white/5 text-slate-600 dark:text-slate-400">
              {eligibleStudents.length} aktiv
            </span>
          )}

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`min-h-[32px] min-w-[32px] p-1.5 rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-center ${
              soundEnabled
                ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                : 'bg-black/5 dark:bg-white/5 border-transparent text-slate-400'
            }`}
            title={soundEnabled ? 'Ton ausschalten' : 'Ton einschalten'}
            aria-label="Ton umschalten"
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>

          {/* Temporäre Auswahl einschränken */}
          <button
            type="button"
            onClick={() => setShowFilterDrawer(true)}
            className={`min-h-[32px] px-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
              sessionExcludedIds.length > 0
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                : currentIsLight
                  ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-white/10 text-slate-300'
            }`}
            title="Auswahl für diese Stunde einschränken"
            aria-label="Auswahl einschränken"
          >
            <ListFilter size={13} />
            {!isSmall && <span>Filter</span>}
            {sessionExcludedIds.length > 0 && (
              <span className="text-[9px] bg-amber-500 text-white font-black px-1 rounded-full">
                -{sessionExcludedIds.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN DISPLAY: Großzügige Namens- oder Aufforderungsfläche                  */}
      {/* ========================================================================= */}
      <div className="flex-grow flex flex-col justify-center items-center my-2 sm:my-4 min-h-0 w-full overflow-hidden">
        <div
          onClick={handlePickRandomStudent}
          className={`w-full h-full max-h-[360px] flex flex-col items-center justify-center text-center p-4 sm:p-7 rounded-3xl border-2 transition-all duration-200 cursor-pointer shadow-xs ${
            isAnimating
              ? 'bg-indigo-50/80 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-600 scale-[1.01]'
              : selectedStudent
                ? currentIsLight
                  ? 'bg-white hover:bg-slate-50/90 border-indigo-200 text-slate-900'
                  : 'bg-zinc-900 hover:bg-zinc-900/90 border-indigo-500/30 text-white'
                : currentIsLight
                  ? 'bg-white hover:bg-indigo-50/40 border-slate-200 hover:border-indigo-300 text-slate-700'
                  : 'bg-zinc-900 hover:bg-zinc-800/80 border-white/10 hover:border-indigo-500/30 text-slate-300'
          }`}
          title="Klicken zum Ziehen"
        >
          {isAnimating ? (
            /* Animation läuft */
            <div className="py-2">
              <span className="text-3xl sm:text-5xl animate-spin block mb-2 opacity-80">
                🎲
              </span>
              <span className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-indigo-600 dark:text-indigo-400">
                {animatingName || 'Zufall...'}
              </span>
            </div>
          ) : selectedStudent ? (
            /* Ein Kind wurde gezogen */
            <div className="py-2 w-full">
              <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 block mb-1">
                Zufällige Wahl:
              </span>
              <h2
                className={`font-black tracking-tight leading-tight px-2 break-words text-slate-900 dark:text-white ${
                  isLargeOrFullscreen
                    ? 'text-5xl sm:text-6xl md:text-7xl'
                    : isSmall
                      ? 'text-2xl sm:text-3xl'
                      : 'text-3xl sm:text-5xl'
                }`}
              >
                {getDisplayStudentName(selectedStudent, allStudents)}
              </h2>
              <span className="text-[11px] font-bold text-slate-400 block mt-2">
                Klicken für ein weiteres Kind
              </span>
            </div>
          ) : (
            /* Startzustand vor der ersten Auswahl */
            <div className="py-3 flex flex-col items-center justify-center">
              <span className="text-4xl sm:text-5xl block mb-2">🎯</span>
              <h3 className="text-base sm:text-xl font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Kind auswählen
              </h3>
              <p className="text-xs sm:text-sm font-bold text-slate-400 mt-1 max-w-[260px]">
                Ein Klick oder Leertaste zieht sofort einen spontanen Namen.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM BAR: Ein-Klick-Aktionsbutton                                      */}
      {/* ========================================================================= */}
      <div className="shrink-0 pt-2 border-t border-slate-200 dark:border-white/10 flex items-center gap-2">
        <button
          type="button"
          onClick={handlePickRandomStudent}
          disabled={isAnimating || eligibleStudents.length === 0}
          className={`w-full min-h-[48px] sm:min-h-[52px] rounded-2xl font-black text-sm sm:text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer ${
            isAnimating || eligibleStudents.length === 0
              ? 'bg-slate-200 dark:bg-zinc-800 text-slate-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
          }`}
          aria-label={selectedStudent ? 'Noch einmal ziehen' : 'Kind auswählen'}
        >
          <Sparkles size={18} />
          <span>
            {isAnimating
              ? 'Wählt aus...'
              : selectedStudent
                ? 'Noch einmal'
                : 'Kind auswählen'}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* FILTER DRAWER: Temporäre Einschränkung der Kinder für die aktuelle Stunde */}
      {/* ========================================================================= */}
      {showFilterDrawer && (
        <div className="absolute inset-0 z-20 bg-black/50 backdrop-blur-xs flex flex-col justify-end sm:justify-center p-2 sm:p-4 animate-fade-in">
          <div
            className={`w-full max-h-[85%] flex flex-col rounded-3xl shadow-2xl border p-4 sm:p-5 overflow-hidden ${
              currentIsLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-white/10'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <Users size={17} className="text-indigo-600" />
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
                  Auswahl für diese Stunde einschränken
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowFilterDrawer(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 cursor-pointer"
                title="Schließen"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-[11px] font-bold text-slate-400 my-2 shrink-0">
              Klicke auf ein Kind, um es für die spontane Ziehung temporär zu pausieren (z. B. wenn nur Gruppe A im Raum ist). Wird nicht dauerhaft gespeichert.
            </p>

            <div className="flex-grow overflow-y-auto no-scrollbar grid grid-cols-2 gap-1.5 my-2 pr-1 min-h-[140px]">
              {presentStudents.map((s) => {
                const isExcluded = sessionExcludedIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleStudentSessionExclusion(s.id)}
                    className={`flex items-center justify-between p-2 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                      isExcluded
                        ? 'bg-slate-100 dark:bg-zinc-800/40 border-slate-200 dark:border-white/5 text-slate-400 line-through opacity-60'
                        : currentIsLight
                          ? 'bg-slate-50 hover:bg-indigo-50/50 border-slate-200 text-slate-800'
                          : 'bg-zinc-800 hover:bg-zinc-700 border-white/5 text-slate-200'
                    }`}
                  >
                    <span className="truncate">{getDisplayStudentName(s, allStudents)}</span>
                    <span className="shrink-0 text-xs">
                      {isExcluded ? '✕' : '✓'}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-white/10 shrink-0 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSessionExcludedIds([])}
                className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Alle aktivieren
              </button>
              <button
                type="button"
                onClick={() => setShowFilterDrawer(false)}
                className="min-h-[38px] px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Fertig
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RandomNameWidget;
