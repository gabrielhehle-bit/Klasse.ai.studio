import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  Users, Check, Clock, ShieldCheck, X, AlertCircle,
  Maximize2, UserCheck, UserX, RotateCcw, Sparkles
} from 'lucide-react';
import { CockpitWidgetConfig, AppState, Student } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { useWidgetSize, useWidgetOverflowGuard } from '../widgetLayout';
import {
  getDisplayStudentName,
  DEFAULT_MOCK_STUDENTS,
  CockpitStudent,
} from '../studentSelectionUtils';
import {
  getTodayIsoDate,
  getStudentAttendanceStatus,
  checkInStudent,
  teacherSetStudentPresent,
  teacherSetStudentAbsent,
  teacherResetStudentToOpen,
  teacherSetStudentDelay,
  computeKidAttendanceSummary,
  KidAttendanceStatus,
  recordStudentMood,
  teacherSetStudentMood,
  teacherClearStudentMood,
  getStudentMood,
} from '../../../lib/kidAttendanceAlgorithm';
import { KID_MOOD_SCALE, getMoodMeta } from '../../../lib/moodTypes';

export interface KidAttendanceWidgetProps {
  widget?: CockpitWidgetConfig;
  onUpdate?: (updates: Partial<CockpitWidgetConfig>) => void;
  app?: AppState;
  setApp?: React.Dispatch<React.SetStateAction<AppState>>;
  currentIsLight: boolean;
}

export const KidAttendanceWidget: React.FC<KidAttendanceWidgetProps> = ({
  widget,
  onUpdate,
  app: propApp,
  setApp: propSetApp,
  currentIsLight,
}) => {
  const { app: contextApp, setApp: contextSetApp } = useApp();
  const app = propApp || contextApp;
  const setApp = propSetApp || contextSetApp;

  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef);
  useWidgetOverflowGuard('KidAttendanceWidget', containerRef);

  // Heutiges Datum
  const todayStr = useMemo(() => getTodayIsoDate(), []);

  // Schülerliste in stabiler Reihenfolge
  const students: Student[] = useMemo(() => {
    if (app.schueler && app.schueler.length > 0) {
      return app.schueler;
    }
    // Fallback für Demo/Vorschau ohne importierte Klasse
    return DEFAULT_MOCK_STUDENTS as unknown as Student[];
  }, [app.schueler]);

  // Disambiguierte Namen nach Standard (Vorname; bei Doppelung Vorname + N.)
  const displayNames = useMemo(() => {
    const map = new Map<string, string>();
    students.forEach((s) => {
      map.set(s.id, getDisplayStudentName(s, students));
    });
    return map;
  }, [students]);

  // Anwesenheitszusammenfassung
  const summary = useMemo(() => {
    return computeKidAttendanceSummary(students, app, todayStr);
  }, [students, app, todayStr]);

  // Lokale UI-Modi (flüchtig)
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [isCompactCheckInOpen, setIsCompactCheckInOpen] = useState(false);
  const [recentlyTappedId, setRecentlyTappedId] = useState<string | null>(null);

  // Aktiver Befindens-Check-in für ein Kind (direkt nach "Da"-Klick)
  const [activeMoodStudent, setActiveMoodStudent] = useState<{
    id: string;
    displayName: string;
    step: 'prompt' | 'thanks';
  } | null>(null);
  const moodCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    return () => {
      if (moodCloseTimerRef.current) {
        clearTimeout(moodCloseTimerRef.current);
      }
    };
  }, []);

  // Schüler tippt auf Karte (Schülermodus)
  const handleStudentCardTap = useCallback((studentId: string) => {
    const currentStatus = getStudentAttendanceStatus(studentId, app, todayStr);
    if (currentStatus.status !== 'open') {
      // Wenn bereits 'da' oder 'abwesend', kein automatisches erneutes Fragen
      return;
    }

    const res = checkInStudent(app, studentId, todayStr);
    if (!res.changed) {
      return;
    }

    // Ruhiges visuelles Feedback
    setRecentlyTappedId(studentId);
    setTimeout(() => {
      setRecentlyTappedId((cur) => (cur === studentId ? null : cur));
    }, 1200);

    // Anwesenheit auf 'da' setzen
    setApp(res.updatedAppState);

    // Unmittelbar danach: 5-stufige Befindensabfrage öffnen
    const student = students.find((s) => s.id === studentId);
    const dName = displayNames.get(studentId) || student?.vorname || 'Schüler/in';
    setActiveMoodStudent({
      id: studentId,
      displayName: dName,
      step: 'prompt',
    });
  }, [app, setApp, todayStr, students, displayNames]);

  // Kind wählt einen der 5 Smileys (1 = sehr gut bis 5 = schlecht)
  const handleChildSelectMood = useCallback((value: number) => {
    if (!activeMoodStudent) return;
    const studentId = activeMoodStudent.id;

    // Speichern im verschlüsselten AppState unter app.schuelerStimmung
    setApp((prev) => recordStudentMood(prev, studentId, value, todayStr));

    // Sofort auf die neutrale Danke-Ansicht umstellen (ohne den gewählten Smiley zu zeigen!)
    setActiveMoodStudent((prev) => (prev ? { ...prev, step: 'thanks' } : null));

    if (moodCloseTimerRef.current) clearTimeout(moodCloseTimerRef.current);
    moodCloseTimerRef.current = setTimeout(() => {
      setActiveMoodStudent(null);
    }, 1200);
  }, [activeMoodStudent, setApp, todayStr]);

  // Kind überspringt das Befinden (freiwillig)
  const handleChildSkipMood = useCallback(() => {
    if (!activeMoodStudent) return;
    // Anwesenheit bleibt unverändert auf "Da"!
    setActiveMoodStudent((prev) => (prev ? { ...prev, step: 'thanks' } : null));

    if (moodCloseTimerRef.current) clearTimeout(moodCloseTimerRef.current);
    moodCloseTimerRef.current = setTimeout(() => {
      setActiveMoodStudent(null);
    }, 900);
  }, [activeMoodStudent]);

  // Schließt die Danke-Ansicht sofort bei Klick
  const handleChildDismissThanks = useCallback(() => {
    if (moodCloseTimerRef.current) clearTimeout(moodCloseTimerRef.current);
    setActiveMoodStudent(null);
  }, []);

  // Lehrer-Aktionen
  const handleTeacherSetPresent = useCallback((studentId: string) => {
    setApp((prev) => teacherSetStudentPresent(prev, studentId, todayStr));
  }, [setApp, todayStr]);

  const handleTeacherSetAbsent = useCallback((studentId: string, absenceCode: 'u' | 'e' = 'u') => {
    setApp((prev) => teacherSetStudentAbsent(prev, studentId, todayStr, undefined, absenceCode));
  }, [setApp, todayStr]);

  const handleTeacherResetToOpen = useCallback((studentId: string) => {
    setApp((prev) => teacherResetStudentToOpen(prev, studentId, todayStr));
  }, [setApp, todayStr]);

  const handleTeacherSetDelay = useCallback((studentId: string, minutes: number) => {
    setApp((prev) => teacherSetStudentDelay(prev, studentId, todayStr, minutes));
  }, [setApp, todayStr]);

  const handleTeacherBatchAllPresent = useCallback(() => {
    let nextApp = app;
    students.forEach((s) => {
      const status = getStudentAttendanceStatus(s.id, nextApp, todayStr);
      if (status.status === 'open') {
        nextApp = teacherSetStudentPresent(nextApp, s.id, todayStr);
      }
    });
    setApp(nextApp);
  }, [app, setApp, students, todayStr]);

  const handleTeacherFinalizeRemainingAbsent = useCallback(() => {
    let nextApp = app;
    students.forEach((s) => {
      const status = getStudentAttendanceStatus(s.id, nextApp, todayStr);
      if (status.status === 'open') {
        nextApp = teacherSetStudentAbsent(nextApp, s.id, todayStr, undefined, 'u');
      }
    });
    setApp(nextApp);
    setIsFinalizeModalOpen(false);
  }, [app, setApp, students, todayStr]);

  // Liste der aktuell noch offenen Kinder
  const openStudents = useMemo(() => {
    return students.filter((s) => {
      const { status } = getStudentAttendanceStatus(s.id, app, todayStr);
      return status === 'open';
    });
  }, [students, app, todayStr]);

  // Formatierter Wochentag / Datum auf Deutsch
  const formattedToday = useMemo(() => {
    try {
      const [y, m, d] = todayStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('de-DE', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return todayStr;
    }
  }, [todayStr]);

  // Keine Schüler in Klasse
  if (students.length === 0) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full flex flex-col items-center justify-center p-4 text-center select-none"
      >
        <Users size={32} className="text-slate-400 mb-2 opacity-60" />
        <p className="font-bold text-sm text-slate-600 dark:text-neutral-300">
          Keine Schüler in der Klassenliste
        </p>
      </div>
    );
  }

  // Render einer einzelnen Schülerkarte
  const renderStudentCard = (student: Student, isCompactView = false) => {
    const displayName = displayNames.get(student.id) || student.vorname;
    const { status, isPreExistingAbsent, delayMinutes } = getStudentAttendanceStatus(student.id, app, todayStr);
    const isJustCheckedIn = recentlyTappedId === student.id;

    // Farb- und Styling-Definition gemäß Status
    let cardClasses = '';
    let statusLabel = '';
    let statusIcon: React.ReactNode = null;

    if (status === 'present') {
      statusLabel = isJustCheckedIn ? 'Ich bin da!' : 'Da';
      statusIcon = <Check size={16} strokeWidth={3} className="text-emerald-600 dark:text-emerald-300 shrink-0" />;
      cardClasses = currentIsLight
        ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-2xs hover:bg-emerald-100/70'
        : 'bg-emerald-950/40 border-emerald-600/50 text-emerald-100 hover:bg-emerald-950/60';
    } else if (status === 'absent') {
      statusLabel = isPreExistingAbsent ? 'Abwesend' : 'Fehlt';
      statusIcon = <UserX size={14} className="text-rose-500 dark:text-rose-400 shrink-0" />;
      cardClasses = currentIsLight
        ? 'bg-rose-50/50 border-rose-200 text-rose-900/80 cursor-not-allowed opacity-85'
        : 'bg-rose-950/20 border-rose-800/40 text-rose-200/80 cursor-not-allowed opacity-85';
    } else {
      // open (noch nicht eingecheckt)
      statusLabel = 'Offen';
      statusIcon = <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />;
      cardClasses = currentIsLight
        ? 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-900 shadow-2xs'
        : 'bg-zinc-800 hover:bg-zinc-700/80 border-zinc-700 text-zinc-100 shadow-2xs';
    }

    // Touch-Target-Größen je nach Modus
    const cardHeight = size.isXL
      ? 'h-20 min-h-[72px] px-4'
      : size.isLarge
      ? 'h-16 min-h-[58px] px-3.5'
      : size.isStandard
      ? 'h-14 min-h-[50px] px-3'
      : 'h-13 min-h-[48px] px-2.5';

    const initial = (student.vorname || '?')[0].toUpperCase();

    return (
      <button
        key={student.id}
        type="button"
        onClick={() => handleStudentCardTap(student.id)}
        disabled={status === 'absent'}
        title={
          status === 'absent'
            ? `${displayName} ist bereits als abwesend erfasst`
            : status === 'present'
            ? `${displayName} ist eingecheckt`
            : `${displayName}: Hier tippen für "Ich bin da!"`
        }
        className={`w-full ${cardHeight} rounded-xl border flex items-center justify-between gap-2.5 text-left transition-all duration-150 select-none ${
          status === 'open' ? 'cursor-pointer active:scale-97' : ''
        } ${cardClasses}`}
      >
        {/* Linke Seite: Avatar-Initiale + Name */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
              status === 'present'
                ? 'bg-emerald-500 text-white shadow-2xs'
                : status === 'absent'
                ? 'bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                : currentIsLight
                ? 'bg-slate-100 text-slate-700 border border-slate-200'
                : 'bg-zinc-700 text-zinc-200 border border-zinc-600'
            }`}
          >
            {initial}
          </div>

          <div className="min-w-0 flex-1">
            <span
              className={`block truncate font-black leading-tight ${
                size.isXL
                  ? 'text-lg sm:text-xl tracking-tight'
                  : size.isLarge
                  ? 'text-base font-bold'
                  : 'text-sm'
              }`}
            >
              {displayName}
            </span>
            {delayMinutes > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                <Clock size={10} />
                +{delayMinutes}m
              </span>
            )}
          </div>
        </div>

        {/* Rechte Seite: Ruhiger Status-Badge */}
        <div
          className={`shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-black tabular-nums border ${
            status === 'present'
              ? currentIsLight
                ? 'bg-emerald-100/90 border-emerald-300/80 text-emerald-900'
                : 'bg-emerald-900/60 border-emerald-600 text-emerald-100'
              : status === 'absent'
              ? currentIsLight
                ? 'bg-rose-100/80 border-rose-200 text-rose-800'
                : 'bg-rose-950/60 border-rose-800 text-rose-300'
              : currentIsLight
              ? 'bg-slate-50 border-slate-200 text-slate-600'
              : 'bg-zinc-900 border-zinc-700 text-zinc-300'
          }`}
        >
          {statusIcon}
          <span className="truncate">{statusLabel}</span>
        </div>
      </button>
    );
  };

  // ==========================================
  // COMPACT LAYOUT (< 380px)
  // ==========================================
  if (size.isCompact && !isCompactCheckInOpen) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full flex flex-col justify-between p-3 select-none font-sans overflow-hidden"
      >
        {/* Header mit Titel & Datum */}
        <div className="flex items-center justify-between gap-1.5 border-b pb-2 mb-2 shrink-0 border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-base shrink-0">🖐️</span>
            <span className="font-bold text-xs truncate text-slate-800 dark:text-zinc-100">
              Ich bin da!
            </span>
          </div>
          <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 tabular-nums">
            {formattedToday}
          </span>
        </div>

        {/* Fortschritts-Anzeige */}
        <div className="flex-1 flex flex-col justify-center gap-2 min-h-0 py-1">
          {summary.isComplete ? (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-center">
              <span className="flex items-center justify-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-black text-sm">
                <Check size={16} strokeWidth={3} />
                Alle Kinder erfasst ✓
              </span>
              <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-medium mt-0.5">
                {summary.present} da · {summary.absent} abwesend
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-center">
              <div
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center ${
                  currentIsLight
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-emerald-950/30 border-emerald-800 text-emerald-100'
                }`}
              >
                <span className="text-2xl font-black tabular-nums leading-none">
                  {summary.present}
                </span>
                <span className="text-[11px] font-bold mt-1">da</span>
              </div>

              <div
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center ${
                  currentIsLight
                    ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                    : 'bg-amber-950/30 border-amber-800 text-amber-100'
                }`}
              >
                <span className="text-2xl font-black tabular-nums leading-none">
                  {summary.open}
                </span>
                <span className="text-[11px] font-bold mt-1">noch offen</span>
              </div>
            </div>
          )}

          {/* Vorschau der offenen Kinder (falls < 380px Platz reicht) */}
          {!summary.isComplete && openStudents.length > 0 && !size.isVeryShort && (
            <div className="flex flex-wrap gap-1 items-center justify-center max-h-14 overflow-hidden py-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 mr-0.5">
                Offen:
              </span>
              {openStudents.slice(0, 4).map((s) => (
                <span
                  key={s.id}
                  className="px-1.5 py-0.5 rounded text-[10px] font-black bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700"
                >
                  {displayNames.get(s.id) || s.vorname}
                </span>
              ))}
              {openStudents.length > 4 && (
                <span className="text-[10px] font-bold text-slate-400">
                  +{openStudents.length - 4} weitere
                </span>
              )}
            </div>
          )}
        </div>

        {/* Aktionsleiste COMPACT */}
        <div className="flex flex-col gap-1.5 shrink-0 pt-2 border-t border-slate-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setIsCompactCheckInOpen(true)}
            className="w-full h-11 min-h-[44px] rounded-xl font-bold text-xs bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text,var(--btn-text,#ffffff))] flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors"
          >
            <Maximize2 size={14} />
            Check-In öffnen
          </button>

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setIsTeacherModalOpen(true)}
              className="flex-1 h-9 min-h-[36px] rounded-lg border font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700"
            >
              <ShieldCheck size={13} />
              Korrigieren
            </button>

            {!summary.isComplete && (
              <button
                type="button"
                onClick={() => setIsFinalizeModalOpen(true)}
                className="flex-1 h-9 min-h-[36px] rounded-lg border font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100"
              >
                Abschließen
              </button>
            )}
          </div>
        </div>

        {/* Kinder-Befindensabfrage (unmittelbar nach Check-in) */}
        {activeMoodStudent && renderChildMoodModal()}
        {/* Lehrer-Korrekturmodal */}
        {isTeacherModalOpen && renderTeacherModal()}
        {/* Abschlussdialog */}
        {isFinalizeModalOpen && renderFinalizeModal()}
      </div>
    );
  }

  // ==========================================
  // STANDARD (380-549px), LARGE (550-799px), FULLSCREEN (≥ 800px)
  // und COMPACT-Overlay (wenn geöffnet)
  // ==========================================
  const gridColumnsClass = size.isXL
    ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
    : size.isLarge
    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
    : size.isStandard
    ? 'grid-cols-2 sm:grid-cols-3'
    : 'grid-cols-1 sm:grid-cols-2'; // Für aufgeklapptes Compact

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col min-h-0 select-none font-sans overflow-hidden relative"
    >
      {/* OBERE LEISTE (Kopfbereich, fest, kein Scroll) */}
      <div
        className={`px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-2 border-b shrink-0 ${
          currentIsLight
            ? 'bg-slate-50/95 border-slate-200 text-slate-800'
            : 'bg-zinc-900/95 border-zinc-800 text-zinc-100'
        }`}
      >
        {/* Titel & Status */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl sm:text-2xl shrink-0 leading-none">🖐️</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-black text-xs sm:text-sm uppercase tracking-wider truncate">
                {size.isXL ? 'Schüler-Check-In' : 'Ich bin da!'}
              </span>
              <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 tabular-nums">
                {formattedToday}
              </span>
            </div>

            {/* Fortschrittstext */}
            <div className="text-[11px] sm:text-xs font-bold leading-tight mt-0.5">
              {summary.isComplete ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-black">
                  <Check size={12} strokeWidth={3} />
                  Alle {summary.total} Kinder erfasst
                </span>
              ) : (
                <span className="text-slate-600 dark:text-zinc-300">
                  <strong className="text-emerald-600 dark:text-emerald-400 font-black">{summary.present}</strong> von{' '}
                  <strong className="font-black">{summary.total}</strong> da
                  {summary.open > 0 && (
                    <span className="text-amber-600 dark:text-amber-400 ml-1.5">
                      ({summary.open} noch offen)
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Aktionsbuttons oben rechts */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Zurück-Button für aufgeklapptes Compact */}
          {size.isCompact && isCompactCheckInOpen && (
            <button
              type="button"
              onClick={() => setIsCompactCheckInOpen(false)}
              className="px-2.5 py-1.5 rounded-lg border font-bold text-xs flex items-center gap-1 cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border-slate-300 dark:border-zinc-600"
              title="Kompaktansicht"
            >
              <X size={14} />
              <span className="hidden sm:inline">Schließen</span>
            </button>
          )}

          {/* Lehrer-Korrektur */}
          <button
            type="button"
            onClick={() => setIsTeacherModalOpen(true)}
            className="h-9 px-3 rounded-lg border font-bold text-xs flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 shadow-2xs"
            title="Lehrer-Korrekturmodus öffnen"
          >
            <ShieldCheck size={14} className="text-slate-500 dark:text-zinc-400" />
            <span className={size.isStandard && !size.isLarge ? 'hidden sm:inline' : 'inline'}>
              Korrigieren
            </span>
          </button>

          {/* Abschlussbutton im Header für große Bildschirme */}
          {!summary.isComplete && (
            <button
              type="button"
              onClick={() => setIsFinalizeModalOpen(true)}
              className="h-9 px-3 rounded-lg font-black text-xs flex items-center gap-1.5 cursor-pointer bg-amber-500 hover:bg-amber-600 active:scale-98 text-white shadow-2xs"
              title="Check-In abschließen"
            >
              <Check size={14} strokeWidth={3} />
              <span className={size.isStandard && !size.isLarge ? 'hidden md:inline' : 'inline'}>
                Abschließen
              </span>
            </button>
          )}
        </div>
      </div>

      {/* MITTLERER BEREICH: Scrollbares Schüler-Karten-Raster (Kartenbereich scrollt vertikal) */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-3 sm:p-4 min-h-0">
        <div className={`grid gap-2.5 sm:gap-3 w-full ${gridColumnsClass}`}>
          {students.map((student) => renderStudentCard(student))}
        </div>
      </div>

      {/* UNTERE LEISTE (Fußbereich, fest, kein Scroll) */}
      <div
        className={`px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-2 border-t shrink-0 ${
          currentIsLight
            ? 'bg-slate-50/90 border-slate-200 text-slate-600'
            : 'bg-zinc-900/90 border-zinc-800 text-zinc-400'
        }`}
      >
        <div className="text-xs font-semibold truncate flex items-center gap-1.5">
          {summary.isComplete ? (
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Sparkles size={13} />
              Klasse ist vollständig erfasst ({summary.present} da, {summary.absent} abwesend)
            </span>
          ) : (
            <span>
              Tippe auf deinen Namen zum Einchecken.
            </span>
          )}
        </div>

        {/* Prominenter Abschlussbutton unten, falls noch offen */}
        {!summary.isComplete ? (
          <button
            type="button"
            onClick={() => setIsFinalizeModalOpen(true)}
            className="h-10 min-h-[40px] px-4 rounded-xl font-black text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
          >
            <Check size={15} strokeWidth={3} />
            Check-In abschließen
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsTeacherModalOpen(true)}
            className="h-9 px-3 rounded-lg border font-bold text-xs text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 cursor-pointer shrink-0"
          >
            Übersicht & Korrektur
          </button>
        )}
      </div>

      {/* KINDER-BEFINDENSABFRAGE (unmittelbar nach Check-in) */}
      {activeMoodStudent && renderChildMoodModal()}

      {/* LEHRER-KORREKTURMODAL */}
      {isTeacherModalOpen && renderTeacherModal()}

      {/* ABSCHLUSSDIALOG */}
      {isFinalizeModalOpen && renderFinalizeModal()}
    </div>
  );

  // ==========================================
  // LEHRER-KORREKTURMODAL
  // ==========================================
  function renderTeacherModal() {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs font-sans select-none animate-in fade-in-50">
        <div
          className={`w-full max-w-xl max-h-[90%] flex flex-col rounded-2xl border shadow-xl overflow-hidden ${
            currentIsLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
          }`}
        >
          {/* Modal Header */}
          <div className="p-4 border-b flex items-center justify-between gap-2 shrink-0 border-slate-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base leading-tight">
                  Lehrer-Korrekturmodus
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Status für {formattedToday} manuell anpassen
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsTeacherModalOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Schnelle Sammelaktionen */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2 shrink-0 text-xs">
            <span className="font-bold text-slate-500 dark:text-zinc-400">
              Schnellaktionen:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTeacherBatchAllPresent}
                className="px-2.5 py-1 rounded-md font-bold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
              >
                Alle Offenen auf Da
              </button>
            </div>
          </div>

          {/* Schülerliste mit Einzelfunktionen */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-3 divide-y divide-slate-100 dark:divide-zinc-800 min-h-0">
            {students.map((student) => {
              const displayName = displayNames.get(student.id) || student.vorname;
              const { status, isPreExistingAbsent, delayMinutes } = getStudentAttendanceStatus(
                student.id,
                app,
                todayStr
              );
              const currentMood = getStudentMood(student.id, app, todayStr);
              const currentMoodMeta = currentMood ? getMoodMeta(currentMood) : undefined;

              return (
                <div
                  key={student.id}
                  className="py-2.5 flex flex-col gap-1.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-sm truncate">
                        {displayName}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                          status === 'present'
                            ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-300 text-emerald-800 dark:text-emerald-300'
                            : status === 'absent'
                            ? 'bg-rose-100 dark:bg-rose-950 border-rose-300 text-rose-800 dark:text-rose-300'
                            : 'bg-slate-100 dark:bg-zinc-800 border-slate-200 text-slate-600 dark:text-zinc-400'
                        }`}
                      >
                        {status === 'present' ? '✓ Da' : status === 'absent' ? '– Fehlt' : '○ Offen'}
                      </span>
                      {delayMinutes > 0 && (
                        <span className="text-[10px] font-bold text-amber-600">
                          +{delayMinutes}m
                        </span>
                      )}
                    </div>

                    {/* Lehrer-Korrekturknöpfe */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleTeacherSetPresent(student.id)}
                        className={`h-8 px-2.5 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer border ${
                          status === 'present'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white dark:bg-zinc-800 border-slate-300 dark:border-zinc-600 text-slate-700 dark:text-zinc-200 hover:bg-emerald-50'
                        }`}
                        title="Als anwesend setzen"
                      >
                        <Check size={12} strokeWidth={3} />
                        Da
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTeacherSetAbsent(student.id, 'u')}
                        className={`h-8 px-2.5 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer border ${
                          status === 'absent'
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-white dark:bg-zinc-800 border-slate-300 dark:border-zinc-600 text-slate-700 dark:text-zinc-200 hover:bg-rose-50'
                        }`}
                        title="Als unentschuldigt abwesend setzen"
                      >
                        Fehlt
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTeacherSetAbsent(student.id, 'e')}
                        className="h-8 px-2 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer border bg-white dark:bg-zinc-800 border-slate-300 dark:border-zinc-600 text-slate-600 dark:text-zinc-300 hover:bg-amber-50"
                        title="Als entschuldigt setzen (z.B. Krankmeldung)"
                      >
                        Entsch.
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTeacherResetToOpen(student.id)}
                        className="h-8 px-2 rounded-md text-xs font-medium flex items-center gap-1 cursor-pointer border bg-slate-50 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:bg-slate-100"
                        title="Check-In zurücksetzen auf Offen"
                      >
                        <RotateCcw size={11} />
                        Offen
                      </button>

                      {/* Verspätungs-Schnellknopf */}
                      <button
                        type="button"
                        onClick={() => {
                          const nextDelay = delayMinutes > 0 ? 0 : 5;
                          handleTeacherSetDelay(student.id, nextDelay);
                        }}
                        className={`h-8 px-1.5 rounded-md text-[11px] font-bold border cursor-pointer ${
                          delayMinutes > 0
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-slate-100 dark:bg-zinc-800 border-slate-200 text-slate-500'
                        }`}
                        title="Verspätung umschalten (+5m)"
                      >
                        ⏱
                      </button>
                    </div>
                  </div>

                  {/* Lehrkraft Befindens-Verwaltung */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100 dark:border-zinc-800/60 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500">
                        Befinden heute:
                      </span>
                      {currentMoodMeta ? (
                        <span className="font-bold flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200">
                          <span>{currentMoodMeta.emoji}</span>
                          <span className="text-[11px]">{currentMoodMeta.label}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Keine Angabe
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 mr-0.5">Ändern:</span>
                      {KID_MOOD_SCALE.map((meta) => (
                        <button
                          key={meta.value}
                          type="button"
                          onClick={() => setApp((prev) => teacherSetStudentMood(prev, student.id, meta.value, todayStr))}
                          className={`w-6 h-6 rounded flex items-center justify-center text-xs cursor-pointer transition-all ${
                            currentMood === meta.value
                              ? 'bg-slate-200 dark:bg-zinc-700 ring-2 ring-emerald-500 scale-105'
                              : 'hover:bg-slate-100 dark:hover:bg-zinc-800 opacity-70 hover:opacity-100'
                          }`}
                          title={`Auf „${meta.label}“ (${meta.emoji}) setzen`}
                        >
                          {meta.emoji}
                        </button>
                      ))}
                      {currentMood && (
                        <button
                          type="button"
                          onClick={() => setApp((prev) => teacherClearStudentMood(prev, student.id, todayStr))}
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer ml-0.5"
                          title="Befinden löschen (auf 'Keine Angabe' zurücksetzen)"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Modal Footer */}
          <div className="p-3 border-t flex justify-end shrink-0 border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsTeacherModalOpen(false)}
              className="h-10 px-5 rounded-xl font-bold text-xs bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 cursor-pointer"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // KINDER-BEFINDENSABFRAGE (freiwillig, 5 Smileys)
  // ==========================================
  function renderChildMoodModal() {
    if (!activeMoodStudent) return null;

    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/45 backdrop-blur-xs font-sans select-none animate-in fade-in-50">
        <div
          className={`w-full max-w-md sm:max-w-lg rounded-2xl border shadow-xl p-5 sm:p-6 overflow-hidden flex flex-col items-center text-center ${
            currentIsLight ? 'bg-[var(--surface-card,var(--surface))] border-[var(--border-default,var(--border2))] text-[var(--text-primary,var(--text))]' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
          }`}
        >
          {activeMoodStudent.step === 'thanks' ? (
            <div className="py-4 sm:py-6 flex flex-col items-center justify-center animate-in zoom-in-95 duration-150">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <Check size={36} strokeWidth={3} />
              </div>
              <h3 className="text-xl sm:text-2xl font-black">
                Danke! ✓
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-zinc-400 mt-1">
                Guten Start in den Schultag!
              </p>
              <button
                type="button"
                onClick={handleChildDismissThanks}
                className="mt-4 px-5 py-2 rounded-xl text-xs font-semibold bg-[var(--surface-subtle,var(--surface2))] hover:bg-[var(--surface-muted,var(--surface3))] dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[var(--text-secondary,var(--text2))] dark:text-zinc-200 cursor-pointer transition-colors"
              >
                Weiter
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              {/* Begrüßung / Frage */}
              <div className="mb-4 sm:mb-6">
                <span className="text-[11px] sm:text-xs font-semibold text-[var(--accent)] dark:text-emerald-400">
                  {activeMoodStudent.displayName} · freiwilliger Check-in
                </span>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-[-0.025em] mt-1 leading-tight">
                  Wie geht es dir heute?
                </h2>
                <p className="text-xs sm:text-sm font-medium text-[var(--text-muted,var(--text3))] dark:text-zinc-400 mt-1">
                  Tippe auf einen Smiley. Freiwillig – du musst nicht antworten.
                </p>
              </div>

              {/* 5 Große Smileys */}
              <div className="grid grid-cols-5 gap-1.5 sm:gap-3 w-full my-2">
                {KID_MOOD_SCALE.map((meta) => (
                  <button
                    key={meta.value}
                    type="button"
                    onClick={() => handleChildSelectMood(meta.value)}
                    className={`min-h-[56px] sm:min-h-[84px] md:min-h-[96px] min-w-[48px] p-1.5 sm:p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs ${
                      currentIsLight
                        ? `${meta.badgeBg} ${meta.badgeBorder} hover:shadow-md`
                        : 'bg-zinc-800/80 hover:bg-zinc-700/80 border-zinc-700'
                    }`}
                    title={`${meta.label} (${meta.description})`}
                  >
                    <span className="text-3xl sm:text-4xl md:text-5xl leading-none">
                      {meta.emoji}
                    </span>
                    <span
                      className={`text-[9px] sm:text-xs font-black leading-tight truncate max-w-full ${
                        currentIsLight ? meta.badgeText : 'text-zinc-200'
                      }`}
                    >
                      {meta.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Überspringen Button */}
              <div className="mt-4 sm:mt-5 pt-3 border-t border-[var(--border-subtle,var(--border))] dark:border-zinc-800 w-full flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleChildSkipMood}
                  className="h-11 min-h-[44px] px-6 rounded-xl text-xs sm:text-sm font-semibold text-[var(--text-muted,var(--text3))] hover:text-[var(--text-primary,var(--text))] dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-[var(--surface-subtle,var(--surface2))] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Überspringen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // ABSCHLUSSDIALOG (Check-In abschließen)
  // ==========================================
  function renderFinalizeModal() {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs font-sans select-none animate-in fade-in-50">
        <div
          className={`w-full max-w-lg max-h-[85%] flex flex-col rounded-2xl border shadow-xl overflow-hidden ${
            currentIsLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between gap-2 shrink-0 border-slate-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <AlertCircle size={18} />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base leading-tight">
                  Check-In abschließen
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  {openStudents.length > 0
                    ? `Noch ${openStudents.length} Kinder nicht eingecheckt`
                    : 'Alle Kinder sind erfasst'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsFinalizeModalOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Inhalt */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-4 min-h-0 space-y-3">
            {openStudents.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                <p className="font-black text-sm text-emerald-800 dark:text-emerald-200">
                  Alle Kinder sind erfasst!
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  {summary.present} Kinder anwesend · {summary.absent} Kinder abwesend.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-600 dark:text-zinc-300">
                  Folgende Kinder haben sich heute noch nicht eingecheckt. Bitte entscheide pro Kind oder übernimm alle Verbleibenden als abwesend:
                </p>

                <div className="divide-y divide-slate-100 dark:divide-zinc-800 border rounded-xl overflow-hidden">
                  {openStudents.map((student) => {
                    const displayName = displayNames.get(student.id) || student.vorname;
                    return (
                      <div
                        key={student.id}
                        className="p-2.5 flex items-center justify-between gap-2 bg-white dark:bg-zinc-800/40"
                      >
                        <span className="font-bold text-sm truncate">
                          {displayName}
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleTeacherSetPresent(student.id)}
                            className="h-8 px-2.5 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 cursor-pointer"
                          >
                            <Check size={12} strokeWidth={3} />
                            Ist da
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTeacherSetAbsent(student.id, 'u')}
                            className="h-8 px-2.5 rounded-lg font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 cursor-pointer"
                          >
                            <UserX size={12} />
                            Abwesend
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Footer mit Optionen */}
          <div className="p-3 border-t flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50">
            <button
              type="button"
              onClick={() => setIsFinalizeModalOpen(false)}
              className="w-full sm:w-auto h-10 px-4 rounded-xl border font-bold text-xs text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-zinc-600 hover:bg-slate-100 dark:hover:bg-zinc-700 cursor-pointer"
            >
              Zurück zum Check-In
            </button>

            {openStudents.length > 0 ? (
              <button
                type="button"
                onClick={handleTeacherFinalizeRemainingAbsent}
                className="w-full sm:w-auto h-10 px-4 rounded-xl font-black text-xs uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs"
              >
                Alle Offenen als abwesend eintragen
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsFinalizeModalOpen(false)}
                className="w-full sm:w-auto h-10 px-5 rounded-xl font-black text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
              >
                Fertig
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
};
