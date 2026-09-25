import React, { useState, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Users, Check, Clock, ShieldCheck, X, AlertCircle,
  Maximize2, UserCheck, UserX, RotateCcw, Sparkles
} from 'lucide-react';
import { CockpitWidgetConfig, AppState, Student } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { useWidgetSize, useWidgetOverflowGuard } from '../widgetLayout';
import {
  getDisplayStudentName,
  CockpitStudent,
} from '../studentSelectionUtils';
import {
  getTodayIsoDate,
  getStudentAttendanceStatus,
  getStudentAbsenceCode,
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
import { getStudentGridLayout } from '../../../lib/studentWidgetGrid';
import { getAdaptiveCheckInOptions, getCheckInPageLayout, shouldShowCheckInSummary } from '../../../lib/checkInWidgetLayout';
import { getCheckInMode } from '../../../lib/checkInWidgetMode';

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
  const checkInMode = getCheckInMode(widget?.settings);
  const moodEnabled = widget?.settings?.moodEnabled !== false;

  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef);
  useWidgetOverflowGuard('KidAttendanceWidget', containerRef);

  // Heutiges Datum
  const [todayStr, setTodayStr] = useState(getTodayIsoDate);

  // A Cockpit can stay open overnight. Refresh the local school-day key before
  // accepting another check-in rather than writing the previous day's record.
  React.useEffect(() => {
    const refreshToday = () => setTodayStr(getTodayIsoDate());
    const timer = window.setInterval(refreshToday, 60_000);
    document.addEventListener('visibilitychange', refreshToday);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshToday);
    };
  }, []);

  // Nur echte Kinder der aktiven Klasse. Während des Ladens bzw. bei leerer
  // Klasse niemals erfundene Namen anbieten oder Anwesenheit für sie buchen.
  const students: Student[] = app.activeClassId ? (app.schueler ?? []) : [];

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
  const [showTeacherMoodDetails, setShowTeacherMoodDetails] = useState(false);
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [isStudentPageOpen, setIsStudentPageOpen] = useState(false);
  const [studentPage, setStudentPage] = useState(0);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [recentlyTappedId, setRecentlyTappedId] = useState<string | null>(null);

  React.useEffect(() => {
    if (!isTeacherModalOpen) setShowTeacherMoodDetails(false);
  }, [isTeacherModalOpen]);

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

  // A class switch must never leave another class's name or private mood
  // prompt on the shared teaching surface.
  React.useEffect(() => {
    if (moodCloseTimerRef.current) clearTimeout(moodCloseTimerRef.current);
    moodCloseTimerRef.current = null;
    setActiveMoodStudent(null);
    setIsTeacherModalOpen(false);
    setShowTeacherMoodDetails(false);
    setIsFinalizeModalOpen(false);
    setIsStudentPageOpen(false);
    setStudentPage(0);
    if (widget?.id) window.dispatchEvent(new CustomEvent('klassio:checkin-expand', { detail: { id: widget.id, expanded: false } }));
    setSelectedStudentId(null);
    setRecentlyTappedId(null);
  }, [app.activeClassId]);

  React.useEffect(() => {
    setSelectedStudentId(null);
    setIsStudentPageOpen(false);
    setStudentPage(0);
    setActiveMoodStudent(null);
  }, [checkInMode, todayStr]);

  // Mode B selects one child before check-in; mode C never changes attendance.
  const handleStudentCardTap = useCallback((studentId: string) => {
    const currentStatus = getStudentAttendanceStatus(studentId, app, todayStr);
    if (checkInMode === 'teacher') {
      if (!moodEnabled || currentStatus.status !== 'present') return;
      const student = students.find((child) => child.id === studentId);
      setActiveMoodStudent({
        id: studentId,
        displayName: displayNames.get(studentId) || student?.vorname || 'Schüler/in',
        step: 'prompt',
      });
      return;
    }
    if (checkInMode === 'individual' && selectedStudentId !== studentId) {
      if (currentStatus.status === 'open') setSelectedStudentId(studentId);
      return;
    }
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
    setApp((prev) => prev.activeClassId === app.activeClassId && prev.schueler?.some((child) => child.id === studentId)
      ? checkInStudent(prev, studentId, todayStr).updatedAppState
      : prev);

    // The optional mood question must never hold up the attendance check-in.
    if (!moodEnabled) {
      setSelectedStudentId(null);
      return;
    }

    // Unmittelbar danach: 5-stufige Befindensabfrage öffnen
    const student = students.find((s) => s.id === studentId);
    const dName = displayNames.get(studentId) || student?.vorname || 'Schüler/in';
    setActiveMoodStudent({
      id: studentId,
      displayName: dName,
      step: 'prompt',
    });
  }, [app, setApp, todayStr, students, displayNames, checkInMode, selectedStudentId, moodEnabled]);

  // Kind wählt einen der 5 Smileys (1 = sehr gut bis 5 = schlecht)
  const handleChildSelectMood = useCallback((value: number) => {
    if (!activeMoodStudent) return;
    const studentId = activeMoodStudent.id;

    // Speichern im verschlüsselten AppState unter app.schuelerStimmung
    setApp((prev) => prev.activeClassId === app.activeClassId && prev.schueler?.some((child) => child.id === studentId)
      ? recordStudentMood(prev, studentId, value, todayStr)
      : prev);

    // Sofort auf die neutrale Danke-Ansicht umstellen (ohne den gewählten Smiley zu zeigen!)
    setActiveMoodStudent((prev) => (prev ? { ...prev, step: 'thanks' } : null));

    if (moodCloseTimerRef.current) clearTimeout(moodCloseTimerRef.current);
    moodCloseTimerRef.current = setTimeout(() => {
      setActiveMoodStudent(null);
      setSelectedStudentId(null);
    }, 1200);
  }, [activeMoodStudent, setApp, todayStr, app.activeClassId]);

  // Kind überspringt das Befinden (freiwillig)
  const handleChildSkipMood = useCallback(() => {
    if (!activeMoodStudent) return;
    // Anwesenheit bleibt unverändert auf "Da"!
    setActiveMoodStudent((prev) => (prev ? { ...prev, step: 'thanks' } : null));

    if (moodCloseTimerRef.current) clearTimeout(moodCloseTimerRef.current);
    moodCloseTimerRef.current = setTimeout(() => {
      setActiveMoodStudent(null);
      setSelectedStudentId(null);
    }, 900);
  }, [activeMoodStudent]);

  // Schließt die Danke-Ansicht sofort bei Klick
  const handleChildDismissThanks = useCallback(() => {
    if (moodCloseTimerRef.current) clearTimeout(moodCloseTimerRef.current);
    setActiveMoodStudent(null);
    setSelectedStudentId(null);
  }, []);

  // Lehrer-Aktionen
  const handleTeacherSetPresent = useCallback((studentId: string) => {
    setApp((prev) => prev.activeClassId === app.activeClassId && prev.schueler?.some(child => child.id === studentId)
      ? teacherSetStudentPresent(prev, studentId, todayStr) : prev);
  }, [app.activeClassId, setApp, todayStr]);

  const handleTeacherSetAbsent = useCallback((studentId: string, absenceCode: 'u' | 'e' = 'u') => {
    setApp((prev) => prev.activeClassId === app.activeClassId && prev.schueler?.some(child => child.id === studentId)
      ? teacherSetStudentAbsent(prev, studentId, todayStr, undefined, absenceCode) : prev);
  }, [app.activeClassId, setApp, todayStr]);

  const handleTeacherResetToOpen = useCallback((studentId: string) => {
    setApp((prev) => prev.activeClassId === app.activeClassId && prev.schueler?.some(child => child.id === studentId)
      ? teacherResetStudentToOpen(prev, studentId, todayStr) : prev);
  }, [app.activeClassId, setApp, todayStr]);

  const handleTeacherSetDelay = useCallback((studentId: string, minutes: number) => {
    setApp((prev) => prev.activeClassId === app.activeClassId && prev.schueler?.some(child => child.id === studentId)
      ? teacherSetStudentDelay(prev, studentId, todayStr, minutes) : prev);
  }, [app.activeClassId, setApp, todayStr]);

  const handleTeacherBatchAllPresent = useCallback(() => {
    setApp((prev) => {
      if (prev.activeClassId !== app.activeClassId) return prev;
      let nextApp = prev;
      students.forEach((student) => {
        if (getStudentAttendanceStatus(student.id, nextApp, todayStr).status === 'open') {
          nextApp = teacherSetStudentPresent(nextApp, student.id, todayStr);
        }
      });
      return nextApp;
    });
  }, [app.activeClassId, setApp, students, todayStr]);

  const handleTeacherFinalizeRemainingAbsent = useCallback(() => {
    setApp((prev) => {
      if (prev.activeClassId !== app.activeClassId) return prev;
      let nextApp = prev;
      students.forEach((student) => {
        if (getStudentAttendanceStatus(student.id, nextApp, todayStr).status === 'open') {
          nextApp = teacherSetStudentAbsent(nextApp, student.id, todayStr, undefined, 'u');
        }
      });
      return nextApp;
    });
    setIsFinalizeModalOpen(false);
  }, [app.activeClassId, setApp, students, todayStr]);

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

  React.useEffect(() => {
    const handleFrameSize = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; expanded: boolean }>).detail;
      if (detail?.id === widget?.id && !detail.expanded) {
        setIsStudentPageOpen(false);
        setStudentPage(0);
      }
    };
    window.addEventListener('klassio:checkin-frame-size', handleFrameSize);
    return () => window.removeEventListener('klassio:checkin-frame-size', handleFrameSize);
  }, [widget?.id]);

  // Keine Schüler in Klasse
  if (students.length === 0) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full flex flex-col items-center justify-center p-4 text-center select-none"
      >
        <Users size={32} className="text-slate-400 mb-2 opacity-60" />
        <p className="font-bold text-sm text-slate-600 dark:text-neutral-300">
          {!app.activeClassId ? 'Bitte zuerst eine Klasse auswählen' : 'Keine Kinder in dieser Klasse angelegt'}
        </p>
      </div>
    );
  }

  // Use the measured widget rectangle. Do not replace the class list with a
  // summary just because 17+ children cannot fit on one page of a small widget.
  const adaptiveLayout = getAdaptiveCheckInOptions(size.width, size.height);
  const compactControls = adaptiveLayout.compactControls;
  const studentGrid = getStudentGridLayout(size.width, size.height, students.length, adaptiveLayout.grid);
  const showCompactSummary = shouldShowCheckInSummary(size.width, studentGrid.fits, size.height) && !isStudentPageOpen;
  const pageLayout = getCheckInPageLayout(size.width, size.height, students.length, studentPage, adaptiveLayout.pages);
  const visiblePageStudents = students.slice(pageLayout.start, pageLayout.start + pageLayout.pageSize);
  const pageRows = Math.max(1, Math.ceil(visiblePageStudents.length / pageLayout.columns));
  const expandStudentGrid = () => {
    setIsStudentPageOpen(true);
    setStudentPage(0);
    // Use the shared frame's LOCAL maximize state: never overwrite saved layout.
    if (widget?.id) window.dispatchEvent(new CustomEvent('klassio:checkin-expand', { detail: { id: widget.id, expanded: true } }));
  };
  const collapseStudentGrid = () => {
    setIsStudentPageOpen(false);
    setStudentPage(0);
    if (widget?.id) window.dispatchEvent(new CustomEvent('klassio:checkin-expand', { detail: { id: widget.id, expanded: false } }));
  };
  // Render einer einzelnen Schülerkarte
  const renderStudentCard = (student: Student, cardWidth = (size.width - 32) / studentGrid.columns, cardHeight = studentGrid.cardHeight) => {
    const displayName = displayNames.get(student.id) || student.vorname;
    const compactCard = cardWidth < 190 || cardHeight < 68;
    const tinyCard = cardWidth < 145 || cardHeight < 53;
    const microCard = cardWidth < 122 || cardHeight < 47;
    const roomyCard = cardWidth >= 200 && cardHeight >= 68;
    const heroCard = cardWidth >= 240 && cardHeight >= 84;
    const { status, isPreExistingAbsent, delayMinutes } = getStudentAttendanceStatus(student.id, app, todayStr);
    const isJustCheckedIn = recentlyTappedId === student.id;
    const canTapMood = moodEnabled && checkInMode === 'teacher' && status === 'present';

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
      statusLabel = 'Abwesend';
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
    const cardPadding = tinyCard ? 'px-1.5 py-1' : compactCard ? 'px-2 py-1.5' : 'px-3 py-2';

    const initial = (student.vorname || '?')[0].toUpperCase();

    return (
      <button
        key={student.id}
        type="button"
        onClick={() => handleStudentCardTap(student.id)}
        tabIndex={checkInMode === 'individual' && selectedStudentId === student.id ? -1 : undefined}
        disabled={status === 'absent' || (checkInMode === 'teacher' && (status !== 'present' || !moodEnabled))}
        title={
          status === 'absent'
            ? `${displayName} ist bereits als abwesend erfasst`
            : status === 'present'
            ? checkInMode === 'teacher' ? `${displayName}: Freiwilliges Befinden angeben` : `${displayName} ist eingecheckt`
            : checkInMode === 'teacher' ? `${displayName}: Anwesenheit zuerst durch Lehrkraft erfassen` : checkInMode === 'individual' ? `${displayName} auswählen` : `${displayName}: Hier tippen für "Ich bin da!"`
        }
        aria-label={`${displayName}: ${canTapMood ? 'Befinden auswählen' : statusLabel}`}
        style={{ height: '100%', minHeight: adaptiveLayout.grid.minCardHeight }}
        className={`w-full min-w-0 min-h-0 ${cardPadding} rounded-xl border flex items-center justify-between ${compactCard ? 'gap-1' : 'gap-2.5'} text-left transition-all duration-150 select-none ${
          status === 'open' ? 'cursor-pointer active:scale-97' : ''
        } ${cardClasses}`}
      >
        {/* Linke Seite: Avatar-Initiale + Name */}
        <div className={`flex items-center ${compactCard ? 'gap-1.5' : 'gap-2.5'} min-w-0 flex-1`}>
          {!compactCard && <div
            className={`${heroCard ? 'w-12 h-12 text-base' : roomyCard ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs'} rounded-xl flex items-center justify-center font-black shrink-0 ${
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
          </div>}

          <div className="min-w-0 flex-1">
            <span
              className={`block whitespace-normal break-words font-black leading-[1.05] tracking-tight ${
                microCard ? 'text-[10px]' : tinyCard ? 'text-[11px]' : compactCard ? 'text-sm' : heroCard ? 'text-xl' : roomyCard ? 'text-lg' : 'text-base'
              }`}
              style={{ overflowWrap: 'anywhere' }}
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
          className={`shrink-0 flex items-center ${compactCard ? 'gap-0 px-1 py-1' : heroCard ? 'gap-2 px-3 py-2' : roomyCard ? 'gap-1.5 px-2.5 py-1.5' : 'gap-1.5 px-2 py-1'} rounded-lg ${heroCard || roomyCard ? 'text-sm' : 'text-xs'} font-black tabular-nums border ${
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
          {compactCard ? (
            <span className="sr-only">{canTapMood ? 'Befinden' : statusLabel}</span>
          ) : <span className="whitespace-nowrap">{canTapMood ? 'Befinden' : statusLabel}</span>}
        </div>
      </button>
    );
  };

  // ==========================================
  // KLEINE WIDGET-FLÄCHE: Übersicht statt abgeschnittene Schülerliste.
  // Das Kind tippt erst auf seine Karte in der vergrößerten Ansicht.
  // ==========================================
  if (showCompactSummary) {
    return (
      <div
        ref={containerRef}
        role="group"
        aria-label="Ich bin da – kompakte Anwesenheitsübersicht"
        className={`relative flex h-full min-h-0 w-full flex-col justify-between gap-2 overflow-hidden p-3 font-sans ${
          currentIsLight ? 'bg-slate-50 text-slate-900' : 'bg-zinc-900 text-zinc-100'
        }`}
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 pb-2 dark:border-zinc-700">
          <h3 className="min-w-0 text-sm font-black leading-tight">🖐️ Ich bin da!</h3>
          <span className="shrink-0 text-xs font-semibold tabular-nums opacity-70">{formattedToday}</span>
        </header>

        <div className="grid shrink-0 grid-cols-3 gap-1.5 text-center" role="status" aria-live="polite"
          aria-label={`${summary.present} anwesend, ${summary.open} offen, ${summary.absent} abwesend`}>
          <div className="flex min-h-14 flex-col justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-1 text-emerald-900">
            <strong className="text-xl tabular-nums leading-none">{summary.present}</strong>
            <span className="mt-1 text-xs font-bold">Da</span>
          </div>
          <div className="flex min-h-14 flex-col justify-center rounded-xl border border-amber-200 bg-amber-50 px-1 text-amber-900">
            <strong className="text-xl tabular-nums leading-none">{summary.open}</strong>
            <span className="mt-1 text-xs font-bold">Offen</span>
          </div>
          <div className="flex min-h-14 flex-col justify-center rounded-xl border border-rose-200 bg-rose-50 px-1 text-rose-900">
            <strong className="text-xl tabular-nums leading-none">{summary.absent}</strong>
            <span className="mt-1 text-xs font-bold">Abwesend</span>
          </div>
        </div>

        <div className="min-h-0 flex-1 content-center text-center text-xs font-medium leading-snug">
          {summary.isComplete ? 'Alle Kinder sind erfasst.' : `${summary.open} von ${summary.total} Kindern noch offen.`}
        </div>
        <div className="flex w-full shrink-0 flex-col gap-1.5">
          <button type="button" onClick={() => setIsTeacherModalOpen(true)}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-2 py-2 text-xs font-black text-white"
            aria-label="Anwesenheit bearbeiten: Da, Fehlt oder Entschuldigt">
            <ShieldCheck size={16} aria-hidden="true" /> Da · Fehlt · Entschuldigt
          </button>
          <button type="button" onClick={expandStudentGrid}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            aria-label={`Ich bin da vergrößern: ${summary.total} Kinder anzeigen und bearbeiten`}>
            <Maximize2 size={15} aria-hidden="true" /> Alle Kinder öffnen
          </button>
        </div>
        {isTeacherModalOpen && createPortal(renderTeacherModal(), document.body)}
        {isFinalizeModalOpen && renderFinalizeModal()}
        {activeMoodStudent && renderChildMoodModal()}
      </div>
    );
  }

  // ==========================================
  // AUSREICHEND GROSSE ANSICHT: Raster mit allen Kindern ohne Scrollen
  // ==========================================
  // Kinderkarten bekommen bewusst mehr Breite: Namen dürfen niemals zugunsten
  // einer möglichst hohen Spaltenzahl abgeschnitten werden.
  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col min-h-0 select-none font-sans overflow-hidden relative"
    >
      {/* Nur eine flache Kopfzeile im kleinen Widget: fast alle Pixel gehören den Kinderkarten. */}
      <div className={`flex shrink-0 items-center justify-between gap-1 border-b ${compactControls ? 'min-h-10 px-1.5 py-0.5' : 'px-3 py-2 sm:px-4 sm:py-2.5'} ${
        currentIsLight ? 'bg-slate-50/95 border-slate-200 text-slate-800' : 'bg-zinc-900/95 border-zinc-800 text-zinc-100'
      }`}>
        <div className="min-w-0 flex-1">
          {!compactControls && (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xl leading-none" aria-hidden="true">🖐️</span>
              <strong className="min-w-0 truncate text-sm font-black">Ich bin da!</strong>
              <span className="text-[11px] font-bold tabular-nums opacity-70">{formattedToday}</span>
            </div>
          )}
          <p className={`truncate font-semibold leading-tight ${compactControls ? 'text-[10px]' : 'mt-0.5 text-xs'}`}
            aria-live="polite">
            {compactControls
              ? summary.isComplete ? `${summary.total}/${summary.total} da · vollständig` : `${summary.present}/${summary.total} da · ${summary.open} offen`
              : summary.isComplete
                ? `Alle ${summary.total} Kinder erfasst`
                : `${summary.present} von ${summary.total} da · ${summary.open} noch offen`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isStudentPageOpen && <button type="button" onClick={collapseStudentGrid}
            className="min-h-11 min-w-11 rounded-lg border px-2 text-xs font-bold"
            title="Zur ursprünglichen Widgetgröße zurückkehren" aria-label="Zur ursprünglichen Widgetgröße zurückkehren">
            <Maximize2 size={16} className="inline-block rotate-180" aria-hidden="true" />
          </button>}
          <button type="button" onClick={() => setIsTeacherModalOpen(true)}
            className={`min-h-11 rounded-lg border px-2 font-bold text-xs ${compactControls ? 'min-w-11' : 'flex items-center gap-1.5'} ${currentIsLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-zinc-800 border-zinc-700 text-white'}`}
            title="Anwesenheit der Kinder bearbeiten: Da, Fehlt, Entschuldigt"
            aria-label="Anwesenheit bearbeiten: Da, Fehlt oder Entschuldigt">
            <ShieldCheck size={16} className="inline-block" aria-hidden="true" />
            {!compactControls && <span>Anwesenheit bearbeiten</span>}
          </button>
          {compactControls && !summary.isComplete && <button type="button"
            onClick={() => setIsFinalizeModalOpen(true)}
            className="min-h-11 min-w-11 rounded-lg bg-emerald-600 px-2 text-white"
            title="Check-In abschließen" aria-label="Check-In abschließen">
            <Check size={17} strokeWidth={3} className="inline-block" aria-hidden="true" />
          </button>}
        </div>
      </div>

      {/* B shows one selected child, A and C use the fitted class grid. */}
      <div className={`flex-1 overflow-hidden min-h-0 ${compactControls ? 'p-1' : 'p-2 sm:p-3'}`}>
        {checkInMode === 'individual' && selectedStudentId && students.some(child => child.id === selectedStudentId) ? (
          <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 overflow-hidden px-2">
            <p className="text-sm font-bold">Ist das dein Name?</p>
            <div className="w-full max-w-md">
              <div className="pointer-events-none" aria-hidden="true">{renderStudentCard(students.find(child => child.id === selectedStudentId)!)}</div>
            </div>
            <button type="button" onClick={() => handleStudentCardTap(selectedStudentId)}
              disabled={getStudentAttendanceStatus(selectedStudentId, app, todayStr).status !== 'open'}
              className="min-h-11 w-full max-w-md rounded-xl bg-emerald-600 px-4 text-sm font-black text-white disabled:opacity-50">
              Ich bin da! ✓
            </button>
            <button type="button" onClick={() => setSelectedStudentId(null)}
              className="min-h-11 rounded-xl border px-4 text-sm font-bold">Anderen Namen wählen</button>
          </div>
        ) : studentGrid.fits ? (
          <div className={`grid h-full min-h-0 w-full ${compactControls ? 'gap-1' : 'gap-1.5'}`} style={{
            gridTemplateColumns: `repeat(${studentGrid.columns}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${studentGrid.rows}, minmax(0, 1fr))`,
          }} aria-label="Anwesenheitsliste mit allen Kindern">
            {students.map((student) => renderStudentCard(student,
              (size.width - (compactControls ? 8 : 24) - adaptiveLayout.grid.gap * (studentGrid.columns - 1)) / studentGrid.columns))}
          </div>
        ) : pageLayout.canRender ? (
          <div className="flex h-full min-h-0 flex-col gap-1" aria-label="Anwesenheit nach Schülerseiten">
            <div className={`grid w-full min-h-0 flex-1 overflow-hidden ${compactControls ? 'gap-1' : 'gap-1.5'}`} style={{
              gridTemplateColumns: `repeat(${pageLayout.columns}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${pageRows}, minmax(0, 1fr))`,
            }} aria-label={`Kinder ${pageLayout.start + 1} bis ${Math.min(students.length, pageLayout.start + pageLayout.pageSize)} von ${students.length}`}>
              {visiblePageStudents.map((student) => renderStudentCard(student,
                (size.width - (compactControls ? 8 : 24) - adaptiveLayout.pages.gap * (pageLayout.columns - 1)) / pageLayout.columns,
                Math.max(adaptiveLayout.pages.minCardHeight,
                  (size.height - adaptiveLayout.pages.reservedHeight - adaptiveLayout.pages.gap * (pageRows - 1)) / pageRows)))}
            </div>
            <nav aria-label="Schülerseiten" className="flex shrink-0 items-center justify-between gap-1 text-xs font-bold">
              <button type="button" disabled={pageLayout.currentPage === 0}
                onClick={() => setStudentPage(page => Math.max(0, page - 1))}
                aria-label="Vorherige Schülerseite" className="min-h-11 min-w-11 rounded-lg border px-2 disabled:opacity-40">
                {compactControls ? '←' : '← Zurück'}
              </button>
              <span aria-live="polite" className="tabular-nums">{pageLayout.currentPage + 1} / {pageLayout.pageCount}</span>
              {!isStudentPageOpen && <button type="button" onClick={expandStudentGrid}
                className="min-h-11 rounded-lg border px-2 text-xs font-bold"
                aria-label="Alle Kinder groß anzeigen" title="Widget vorübergehend vergrößern">
                <Maximize2 size={15} className="inline-block" aria-hidden="true" /> {!compactControls && 'Groß'}
              </button>}
              <button type="button" disabled={pageLayout.currentPage >= pageLayout.pageCount - 1}
                onClick={() => setStudentPage(page => Math.min(pageLayout.pageCount - 1, page + 1))}
                aria-label="Nächste Schülerseite" className="min-h-11 min-w-11 rounded-lg border px-2 disabled:opacity-40">
                {compactControls ? '→' : 'Weiter →'}
              </button>
            </nav>
          </div>
        ) : (
          <div role="status" className="flex h-full flex-col items-center justify-center gap-3 rounded-xl bg-slate-50 p-4 text-center text-slate-800">
            <p className="text-sm font-bold">{students.length} Kinder benötigen mehr Platz, damit alle Namen und Schaltflächen sichtbar bleiben.</p>
            {pageLayout.canRender ? (
              <button type="button" onClick={expandStudentGrid}
                className="min-h-11 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white">
                Alle {students.length} Kinder groß anzeigen
              </button>
            ) : <p className="text-xs">Für die Namen und Schaltflächen reicht der Platz auf diesem Bildschirm noch nicht. Fenster vergrößern oder Gerät ins Querformat drehen.</p>}
          </div>
        )}
      </div>

      {/* UNTERE LEISTE (Fußbereich, fest, kein Scroll) */}
      {!compactControls && <div
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
              {checkInMode === 'teacher' ? 'Die Lehrkraft trägt die Anwesenheit ein. Befinden ist freiwillig.' : checkInMode === 'individual' ? 'Wähle deinen Namen und bestätige den Check-in.' : 'Tippe auf deinen Namen zum Einchecken.'}
            </span>
          )}
        </div>

        {/* Prominenter Abschlussbutton unten, falls noch offen */}
        {!summary.isComplete ? (
          <button
            type="button"
            onClick={() => setIsFinalizeModalOpen(true)}
            className="min-h-11 px-4 rounded-xl font-black text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
          >
            <Check size={15} strokeWidth={3} />
            Check-In abschließen
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsTeacherModalOpen(true)}
            className="min-h-11 px-3 rounded-lg border font-bold text-xs text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 cursor-pointer shrink-0"
          >
            Übersicht & Korrektur
          </button>
        )}
      </div>}

      {/* KINDER-BEFINDENSABFRAGE (unmittelbar nach Check-in) */}
      {activeMoodStudent && renderChildMoodModal()}

      {/* LEHRER-KORREKTURMODAL */}
      {isTeacherModalOpen && createPortal(renderTeacherModal(), document.body)}

      {/* ABSCHLUSSDIALOG */}
      {isFinalizeModalOpen && renderFinalizeModal()}
    </div>
  );

  // ==========================================
  // LEHRER-KORREKTURMODAL
  // ==========================================
  function renderTeacherModal() {
    return (
      <div role="dialog" aria-modal="true" aria-label="Lehrer-Anwesenheitskorrektur"
        className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs font-sans animate-in fade-in-50">
        <div
          className={`w-full max-w-2xl max-h-[95dvh] sm:max-h-[90dvh] flex flex-col rounded-2xl border shadow-xl overflow-hidden ${
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
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
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
                className="min-h-11 px-3 py-1 rounded-lg font-bold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
              >
                Alle Offenen auf Da
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2 text-xs dark:border-zinc-800">
            <span className="font-semibold">Befindensangaben sind für die Unterrichtsprojektion ausgeblendet.</span>
            {showTeacherMoodDetails ? (
              <button type="button" onClick={() => setShowTeacherMoodDetails(false)}
                className="min-h-11 rounded-lg border px-3 font-bold">Befinden verbergen</button>
            ) : (
              <button type="button" onClick={() => {
                if (window.confirm("Nur auf einem nicht projizierten Gerät öffnen. Können andere Kinder oder Eltern den Bildschirm sehen? Falls ja: Abbrechen.")) setShowTeacherMoodDetails(true);
              }} className="min-h-11 rounded-lg border px-3 font-bold">
                Befinden anzeigen (nur ohne Projektion)
              </button>
            )}
          </div>

          {/* Schülerliste mit Einzelfunktionen */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-3 divide-y divide-slate-100 dark:divide-zinc-800 min-h-0">
            {students.map((student) => {
              const displayName = displayNames.get(student.id) || student.vorname;
              const { status, delayMinutes } = getStudentAttendanceStatus(
                student.id,
                app,
                todayStr
              );
              const absenceCode = getStudentAbsenceCode(student.id, app, todayStr);
              const currentMood = getStudentMood(student.id, app, todayStr);
              const currentMoodMeta = currentMood ? getMoodMeta(currentMood) : undefined;

              return (
                <div
                  key={student.id}
                  className="py-2.5 flex flex-col gap-1.5"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-sm whitespace-normal break-words leading-tight">
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
                        {status === 'present' ? '✓ Da' : status === 'absent'
                          ? absenceCode === 'e' ? '✓ Entschuldigt' : absenceCode === 'u' ? '– Fehlt' : '– Abwesend'
                          : '○ Offen'}
                      </span>
                      {delayMinutes > 0 && (
                        <span className="text-[10px] font-bold text-amber-600">
                          +{delayMinutes}m
                        </span>
                      )}
                    </div>

                    {/* Lehrer-Korrekturknöpfe */}
                    <div role="group" aria-label={`Anwesenheit von ${displayName}: Da, Fehlt oder Entschuldigt`}
                      className="grid w-full grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleTeacherSetPresent(student.id)}
                        className={`min-h-11 min-w-0 px-1 rounded-md text-xs font-bold flex items-center justify-center gap-1 cursor-pointer border ${
                          status === 'present'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white dark:bg-zinc-800 border-slate-300 dark:border-zinc-600 text-slate-700 dark:text-zinc-200 hover:bg-emerald-50'
                        }`}
                        title="Als anwesend setzen"
                        aria-label={`${displayName}: Da`}
                        aria-pressed={status === 'present'}
                      >
                        <Check size={12} strokeWidth={3} />
                        Da
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTeacherSetAbsent(student.id, 'u')}
                        className={`min-h-11 min-w-0 px-1 rounded-md text-xs font-bold flex items-center justify-center gap-1 cursor-pointer border ${
                          status === 'absent' && absenceCode === 'u'
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-white dark:bg-zinc-800 border-slate-300 dark:border-zinc-600 text-slate-700 dark:text-zinc-200 hover:bg-rose-50'
                        }`}
                        title="Als unentschuldigt abwesend setzen"
                        aria-label={`${displayName}: Fehlt (unentschuldigt)`}
                        aria-pressed={status === 'absent' && absenceCode === 'u'}
                      >
                        Fehlt
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTeacherSetAbsent(student.id, 'e')}
                        className={`min-h-11 min-w-0 px-1 rounded-md text-[11px] sm:text-xs font-bold flex items-center justify-center break-words cursor-pointer border ${status === 'absent' && absenceCode === 'e'
                          ? 'bg-amber-500 border-amber-600 text-slate-950'
                          : 'bg-white dark:bg-zinc-800 border-slate-300 dark:border-zinc-600 text-slate-700 dark:text-zinc-200 hover:bg-amber-50'}`}
                        title="Als entschuldigt abwesend setzen"
                        aria-label={`${displayName}: Entschuldigt`}
                        aria-pressed={status === 'absent' && absenceCode === 'e'}
                      >
                        Entschuldigt
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTeacherResetToOpen(student.id)}
                        className="col-span-2 min-h-11 rounded-md text-xs font-medium flex items-center justify-center gap-1 cursor-pointer border bg-slate-50 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:bg-slate-100"
                        title="Check-In zurücksetzen auf Offen"
                        aria-label={`${displayName}: Offen`}
                        aria-pressed={status === 'open'}
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
                        className={`min-h-11 rounded-md text-[11px] font-bold border cursor-pointer ${
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

                  {/* Lehrkraft Befindens-Verwaltung: never shown by opening correction alone. */}
                  {showTeacherMoodDetails && (
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
                          className={`min-h-11 min-w-11 rounded flex items-center justify-center text-xs cursor-pointer transition-all ${
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
                          className="min-h-11 min-w-11 rounded flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer ml-0.5"
                          title="Befinden löschen (auf 'Keine Angabe' zurücksetzen)"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  )}
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
      <div className="absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs font-sans select-none animate-in fade-in-50">
        <div
          className={`w-full max-w-md sm:max-w-lg rounded-3xl border shadow-2xl p-5 sm:p-6 overflow-hidden flex flex-col items-center text-center ${
            currentIsLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
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
                className="mt-4 px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 cursor-pointer"
              >
                Weiter
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              {/* Begrüßung / Frage */}
              <div className="mb-4 sm:mb-6">
                <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Schüler-Check-In · {activeMoodStudent.displayName}
                </span>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black mt-1 leading-tight">
                  Wie geht es dir heute?
                </h2>
                <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-zinc-400 mt-1">
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
                    className={`min-h-[56px] sm:min-h-[84px] md:min-h-[96px] min-w-[48px] p-1.5 sm:p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 hover:scale-102 shadow-2xs ${
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
              <div className="mt-4 sm:mt-5 pt-3 border-t border-slate-100 dark:border-zinc-800 w-full flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleChildSkipMood}
                  className="h-11 min-h-[44px] px-6 rounded-xl text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
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
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
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
                        className="p-2.5 flex flex-col gap-2 bg-white dark:bg-zinc-800/40 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="font-bold text-sm whitespace-normal break-words leading-tight">
                          {displayName}
                        </span>

                        <div role="group" aria-label={`Offenen Check-in für ${displayName} abschließen`}
                          className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-3">
                          <button
                            type="button"
                            onClick={() => handleTeacherSetPresent(student.id)}
                            className="min-h-11 rounded-lg px-3 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Check size={12} strokeWidth={3} />
                            Ist da
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTeacherSetAbsent(student.id, 'u')}
                            className="min-h-11 rounded-lg px-3 font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <UserX size={12} />
                            Fehlt
                          </button>
                          <button type="button"
                            onClick={() => handleTeacherSetAbsent(student.id, 'e')}
                            className="min-h-11 rounded-lg px-3 font-bold text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer">
                            Entschuldigt
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
