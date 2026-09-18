import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../context/AppContext";
import { UNIFIED_DEFAULT_BADGES } from "../types";
import {
  getKW,
  getTodayName,
  getStartYear,
  getSchulstartKW,
  kwToMonday,
  kwYear,
  getSW,
  isHoliday,
  syncNoteToPlanning,
  inferDateFromText,
  getTeacherFirstName,
  formatLocalDateKey,
} from "../lib/utils";
import { getFerien } from "../lib/ferienOesterreich";
import { VM_ZEITEN, STUNDEN_INFO, FAECHER_ALLE, AESTHETIC_THEMES, DASHBOARD_CURATED_FONTS, DASHBOARD_FONT_SIZES, MAX_LESSON_SLOTS, LESSON_SLOT_NUMBERS } from "../constants";
import { berechne } from "../lib/GradeUtils";
import { isDiagnosticAlert } from "../lib/diagnosticData";
import { isAttendanceCompleteForDay, isAttendanceRequiredForDay } from "../lib/dashboardAttendance";
import { QRCodeCanvas } from "qrcode.react";
import {
  Users,
  Calendar,
  BarChart3,
  GraduationCap,
  MapPin,
  Wind,
  Thermometer,
  Cake,
  GripHorizontal,
  UserMinus,
  UserCheck,
  CheckSquare,
  ArrowRight,
  PlusCircle,
  Bell,
  Clock,
  Sun,
  PartyPopper,
  Target,
  Activity,
  Check,
  StickyNote,
  Settings2,
  Smartphone,
  QrCode,
  X,
  GripVertical,
  ListTodo,
  Eye,
  EyeOff,
  Gem,
  Smile,
  Trophy,
  Sparkles,
  Zap,
  Bookmark,
  MessageSquare,
  FileText,
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Lightbulb,
  FlagTriangleLeft,
  PenTool,
  Play,
  Save,
  Command,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Trash2,
  Plus,
  Edit2,
  Heart,
  Layers,
  BookOpen,
  Bot,
  Wallet,
  RefreshCw,
  Coffee,
  Sunrise,
  Focus,
  Brain,
  Star,
  TrendingUp,
  Send,
  AlertCircle,
  Download,
  Loader2,
  Grid,
  Sliders,
  Palette,
  Type,
  Bold,
  Italic,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  PieChart,
  Pie,
  AreaChart,
  Area,
} from "recharts";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { SortableWidget } from "./SortableWidget";
import { getDailyInsight, DailyInsight, askAI } from "../services/aiService";
import { LEHRPLAN_VS_2023 } from "../lehrplan";
import { memo } from "react";
import ClassPetWidget from "./ClassPetWidget";
import DashboardKlassenglasWidget from "./DashboardKlassenglasWidget";
import FlowerPuzzleWidget from "./FlowerPuzzleWidget";
import { DashboardInteractionWidget } from "./DashboardInteractionWidget";
import DashboardTodayOverview, { DashboardDayMode } from "./DashboardTodayOverview";
import { useLehrerzimmerUnread } from "../hooks/useLehrerzimmerUnread";

// Memoized widgets
const MemoizedClassPetWidget = memo(ClassPetWidget);
const MemoizedDashboardKlassenglasWidget = memo(DashboardKlassenglasWidget);
const MemoizedFlowerPuzzleWidget = memo(FlowerPuzzleWidget);
import { useToast } from "../context/ToastContext";
import Markdown from "react-markdown";
import {
  isBackupDue,
  triggerBackupDownload,
  postponeBackup,
} from "../utils/backupUtils";
import {
  startSyncSession,
  stopSyncSession,
  createSyncUrl,
  getActiveEncodedSessionKey,
} from "../lib/syncService";

const playBirthdayJingleOnDashboard = () => {
  const AudioContext =
    window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const now = ctx.currentTime;

  // Happy birthday notes
  const notes = [
    { freq: 261.63, delay: 0 },
    { freq: 261.63, delay: 0.2 },
    { freq: 293.66, delay: 0.4 },
    { freq: 261.63, delay: 0.8 },
    { freq: 349.23, delay: 1.2 },
    { freq: 329.63, delay: 1.6 },
  ];

  notes.forEach((note) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(note.freq, now + note.delay);

    gain.gain.setValueAtTime(0, now + note.delay);
    gain.gain.linearRampToValueAtTime(0.18, now + note.delay + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + note.delay + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + note.delay);
    osc.stop(now + note.delay + 0.655);
  });
};

const handleBirthdayCelebrateOnDashboard = async (studentNames: string) => {
  try {
    const confettiModule = await import("canvas-confetti");
    const confetti = confettiModule.default;
    confetti({
      particleCount: 160,
      spread: 90,
      origin: { y: 0.5 },
      zIndex: 99999,
    });
    // Side blasts for extra celebration
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        zIndex: 99999,
      });
    }, 250);
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        zIndex: 99999,
      });
    }, 400);
  } catch (e) {
    console.warn("Failed to load confetti module", e);
  }

  // playBirthdayJingleOnDashboard(); // Disabled to comply with "no autoplay sound on load" rule
};

// --- MEMOIZED BDAY WIDGET ---
interface BirthdayWidgetProps {
  students: any[];
  dashboardSettings: any;
  setApp: any;
  setPage: (page: string) => void;
  getStatsWidgetSpan: (type: string) => string;
  renderEyeOffShortcut: (field: string) => React.ReactNode;
  handleBirthdayCelebrateOnDashboard: (name: string) => void;
  handleResizeWidget: any;
  isEditMode?: boolean;
}

const ClosedBirthdayWidget: React.FC<BirthdayWidgetProps> = ({
  students,
  dashboardSettings,
  setApp,
  setPage,
  getStatsWidgetSpan,
  renderEyeOffShortcut,
  handleBirthdayCelebrateOnDashboard,
  handleResizeWidget,
  isEditMode,
}) => {
  const upcoming30 = React.useMemo(() => {
    const todayObj = new Date();
    const currentYear = todayObj.getFullYear();
    const upcoming: Array<{
      student: any;
      days: number;
      date: Date;
      isToday: boolean;
    }> = [];

    students.forEach((s) => {
      if (!s.geburtstag) return;
      let bDate: Date;
      const parts = s.geburtstag.split(".");
      if (parts.length === 3) {
        bDate = new Date(
          currentYear,
          parseInt(parts[1]) - 1,
          parseInt(parts[0]),
        );
      } else {
        bDate = new Date(s.geburtstag);
        bDate.setFullYear(currentYear);
      }
      if (isNaN(bDate.getTime())) return;

      const nextBirthday = new Date(
        currentYear,
        bDate.getMonth(),
        bDate.getDate(),
      );

      if (
        nextBirthday.getTime() < todayObj.getTime() &&
        todayObj.getTime() - nextBirthday.getTime() > 86400000
      ) {
        nextBirthday.setFullYear(currentYear + 1);
      }

      const timeDiff = nextBirthday.getTime() - todayObj.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

      let isToday = false;
      if (
        bDate.getMonth() === todayObj.getMonth() &&
        bDate.getDate() === todayObj.getDate()
      ) {
        isToday = true;
      }

      if (isToday || (daysDiff >= 0 && daysDiff <= 30)) {
        upcoming.push({
          student: s,
          days: isToday ? 0 : daysDiff,
          date: nextBirthday,
          isToday,
        });
      }
    });

    upcoming.sort((a, b) => a.days - b.days);
    return upcoming;
  }, [students]);

  if (!dashboardSettings.showGeburtstage) return null;

  return (
    <SortableWidget
      id="group4_bday"
      overrideSpan={dashboardSettings.widgetSizes?.[`group4_bday`]}
      onResize={handleResizeWidget}
      isEditMode={isEditMode}
    >
      <div
        className={`relative bg-neutral-900/80 backdrop-blur border border-neutral-800 text-white p-4 sm:p-6 rounded-3xl shadow-xl flex flex-col group hover:border-neutral-700 transition-all ${getStatsWidgetSpan("geburtstage")}`}
      >
        {renderEyeOffShortcut("showGeburtstage")}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
            <Cake size={18} />
          </div>
          <div>
            <h3 className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-neutral-450">
              Kalendereintrag
            </h3>
            <div className="text-[0.75rem] leading-tight font-black text-white">
              Anstehende Geburtstage
            </div>
          </div>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar max-h-[14rem] leading-tight">
          {upcoming30.length === 0 ? (
            <div className="text-[0.625rem] text-neutral-500 italic text-center pt-4">
              Kein Geburtstag in den nächsten 30 Tagen
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming30.map(({ student, days, isToday }) => (
                <div
                  key={student.id}
                  onClick={() => {
                    setApp((prev: any) => ({
                      ...prev,
                      selectedStudentId: student.id,
                    }));
                    setPage("schueler");
                  }}
                  className={`p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all border ${isToday ? "bg-gradient-to-r from-amber-500/20 to-orange-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]" : "bg-neutral-850 hover:bg-neutral-800 border-neutral-800 hover:border-neutral-750"}`}
                >
                  <div>
                    <span
                      className={`text-[0.75rem] font-black ${isToday ? "text-amber-400" : "text-neutral-200"}`}
                    >
                      {student.vorname} {student.nachname.charAt(0)}.
                    </span>
                    <div className="text-[0.5625rem] font-bold text-neutral-500 mt-1">
                      {new Date(student.geburtstag).toLocaleDateString(
                        "de-DE",
                        { day: "2-digit", month: "2-digit" },
                      )}
                    </div>
                  </div>

                  {isToday ? (
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[0.875rem] font-black text-amber-500 animate-pulse">
                        🎂 HEUTE!
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBirthdayCelebrateOnDashboard(student.vorname);
                        }}
                        className="text-[0.5625rem] font-black uppercase bg-amber-500 text-amber-950 px-2 py-1 rounded-md hover:bg-amber-400 active:scale-95 transition-all shadow-sm"
                      >
                        Feiern!
                      </button>
                    </div>
                  ) : days <= 3 ? (
                    <span className="text-[0.625rem] font-black uppercase tracking-wider text-rose-400 bg-rose-400/10 px-2 py-1 rounded-md border border-rose-400/20 shadow-[0_0_10px_rgba(251,113,133,0.15)]">
                      In {days} Tag{days > 1 ? "en" : ""}
                    </span>
                  ) : (
                    <span
                      className={`text-[0.6875rem] font-black ${days <= 7 ? "text-emerald-400" : "text-neutral-500"}`}
                    >
                      in {days} Tagen
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SortableWidget>
  );
};

// --- MEMOIZED EVENTS WIDGET ---
interface EventsWidgetProps {
  customEvents: { id: string; name: string; date: string; color?: string; sub?: string }[];
  dashboardSettings: any;
  setDashboardSettings: any;
  getStatsWidgetSpan: (type: string) => string;
  renderEyeOffShortcut: (field: string) => React.ReactNode;
  handleResizeWidget: any;
  isEditMode?: boolean;
}

const ClosedEventsWidget: React.FC<EventsWidgetProps> = ({
  customEvents,
  dashboardSettings,
  setDashboardSettings,
  getStatsWidgetSpan,
  renderEyeOffShortcut,
  handleResizeWidget,
  isEditMode,
}) => {
  const { app } = useApp();
  if (!dashboardSettings.showEvents) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startYear = getStartYear(app?.schuljahr || "");
  const kwNow = app?.currentKW || getKW(today);

  // We compile all events into a unified list
  const allEvents: Array<{
    id: string;
    name: string;
    date: Date;
    diffDays: number;
    type: string;
    color: string;
    sub?: string;
  }> = [];

  // 1. Custom events (already in settings)
  (customEvents || []).forEach((e: any) => {
    const parts = e.date.split(".");
    let target: Date;
    if (parts.length === 3) {
      target = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    } else {
      target = new Date(e.date);
    }
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= 90) {
      allEvents.push({
        id: `custom-${e.id}`,
        name: e.name,
        date: target,
        diffDays,
        type: "custom",
        color: e.color || "violet",
        sub: e.sub || "Termin",
      });
    }
  });

  // 2. Student birthdays (from app.schueler)
  const students = app?.schueler || [];
  students.forEach((s: any) => {
    if (!s.geburtstag) return;
    let bDate: Date;
    const parts = s.geburtstag.split(".");
    if (parts.length === 3) {
      bDate = new Date(
        today.getFullYear(),
        parseInt(parts[1]) - 1,
        parseInt(parts[0]),
      );
    } else {
      bDate = new Date(s.geburtstag);
      bDate.setFullYear(today.getFullYear());
    }
    if (isNaN(bDate.getTime())) return;

    const nextBirthday = new Date(
      today.getFullYear(),
      bDate.getMonth(),
      bDate.getDate(),
    );

    if (
      nextBirthday.getTime() < today.getTime() &&
      today.getTime() - nextBirthday.getTime() > 86400000
    ) {
      nextBirthday.setFullYear(today.getFullYear() + 1);
    }

    const timeDiff = nextBirthday.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysDiff >= 0 && daysDiff <= 30) {
      const birthYear = parts.length === 3 ? parseInt(parts[2]) : new Date(s.geburtstag).getFullYear();
      const ageStr = !isNaN(birthYear) ? ` (wird ${nextBirthday.getFullYear() - birthYear})` : "";
      allEvents.push({
        id: `bday-${s.id}`,
        name: `🎂 Geburtstag: ${s.vorname} ${s.nachname}${ageStr}`,
        date: nextBirthday,
        diffDays: daysDiff,
        type: "birthday",
        color: "amber",
        sub: "Geburtstagskind",
      });
    }
  });

  // 3. Holidays (Feiertage) for the next 30 days
  for (let d = 0; d <= 30; d++) {
    const testDate = new Date(today);
    testDate.setDate(today.getDate() + d);
    const hName = isHoliday(testDate, [], 'VBG');
    if (hName) {
      const exists = allEvents.some(
        (e) => e.type === "holiday" && e.name === `🏝️ Feiertag: ${hName}`
      );
      if (!exists) {
        allEvents.push({
          id: `holiday-${testDate.getTime()}`,
          name: `🏝️ Feiertag: ${hName}`,
          date: testDate,
          diffDays: d,
          type: "holiday",
          color: "emerald",
          sub: "Schulfrei / Feiertag",
        });
      }
    }
  }

  // 4. Wochenplanung events
  const daysDe = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const yearNow = kwYear(kwNow, startYear);
  const mondayOfCurrentWeek = kwToMonday(kwNow, yearNow);

  // We scan 13 weeks (offset weeks 0 to 12) to cover approx 90 days
  for (let offsetKW = 0; offsetKW <= 12; offsetKW++) {
    const targetMonday = new Date(mondayOfCurrentWeek);
    targetMonday.setDate(mondayOfCurrentWeek.getDate() + offsetKW * 7);
    const targetKW = getKW(targetMonday);
    const wPlan = app?.wochenplanung?.[targetKW] || {};

    Object.entries(wPlan).forEach(([dayName, dayPlan]: [string, any]) => {
      const dayIdx = daysDe.indexOf(dayName);
      if (dayIdx === -1) return;

      const targetDate = new Date(targetMonday);
      targetDate.setDate(targetMonday.getDate() + dayIdx);
      targetDate.setHours(0, 0, 0, 0);

      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));

      if (diffDays >= 0 && diffDays <= 90) {
        Object.values(dayPlan || {}).forEach((cell: any) => {
          const isEvent =
            cell?.type &&
            [
              "test",
              "schularbeit",
              "sa",
              "lzk",
              "ausflug",
              "event",
              "spielefest",
              "konferenz",
              "gespraech",
              "sonstiges",
            ].includes(cell.type);

          const hasKeyword =
            cell?.thema &&
            (cell.thema.toLowerCase().includes("test") ||
              cell.thema.toLowerCase().includes("schularbeit") ||
              cell.thema.toLowerCase().includes("sa") ||
              cell.thema.toLowerCase().includes("spielefest") ||
              cell.thema.toLowerCase().includes("konferenz") ||
              cell.thema.toLowerCase().includes("gespräch") ||
              cell.thema.toLowerCase().includes("gespräche") ||
              cell.thema.toLowerCase().includes("ausflug"));

          if (isEvent || hasKeyword) {
            let cellType = cell.type;
            if (!cellType && cell.thema) {
              const lowerThema = cell.thema.toLowerCase();
              if (lowerThema.includes("spielefest")) cellType = "spielefest";
              else if (lowerThema.includes("konferenz")) cellType = "konferenz";
              else if (lowerThema.includes("gespr")) cellType = "gespraech";
              else if (lowerThema.includes("ausflug")) cellType = "ausflug";
              else if (lowerThema.includes("sa") || lowerThema.includes("schularbeit")) cellType = "sa";
              else cellType = "test";
            }

            const typeNames: Record<string, string> = {
              spielefest: "Spielefest 🎈",
              konferenz: "Konferenz 👥",
              gespraech: "Gespräch 💬",
              event: "Event 🌟",
              ausflug: "Ausflug 🚌",
              test: "Test 📝",
              schularbeit: "SA 📑",
              sa: "SA 📑",
              lzk: "LZK ⭐",
              sonstiges: "Termin 📌",
            };
            const textLabel = typeNames[cellType || ""] || "Aktivität";

            const nameToUse = `${cellType === "konferenz" ? "👥" : cellType === "ausflug" ? "🚌" : cellType === "sa" || cellType === "schularbeit" ? "📑" : cellType === "test" || cellType === "lzk" ? "📝" : "📌"} ${cell.thema}`;
            const alreadyAdded = allEvents.some(
              (e) => e.name === nameToUse && e.diffDays === diffDays
            );

            if (!alreadyAdded) {
              allEvents.push({
                id: `wplan-${targetKW}-${dayName}-${cell.fach || "event"}-${cell.thema}`,
                name: nameToUse,
                date: targetDate,
                diffDays,
                type: "wochenplan",
                color:
                  cellType === "spielefest"
                    ? "fuchsia"
                    : cellType === "konferenz"
                      ? "blue"
                      : cellType === "gespraech"
                        ? "violet"
                        : cellType === "event" || cellType === "ausflug"
                          ? "sky"
                          : cellType === "sonstiges"
                            ? "rose"
                            : "orange",
                sub: `${textLabel} (${cell.fach || "Allgemein"})`,
              });
            }
          }
        });
      }
    });
  }

  // 5. Jahresplanung events
  for (let offsetKW = 0; offsetKW <= 12; offsetKW++) {
    const targetMonday = new Date(mondayOfCurrentWeek);
    targetMonday.setDate(mondayOfCurrentWeek.getDate() + offsetKW * 7);
    const targetKW = getKW(targetMonday);
    const weekPlan = app?.jahresplanung?.[targetKW] || {};
    targetMonday.setHours(0, 0, 0, 0);

    const diffTime = targetMonday.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));

    if (diffDays >= -7 && diffDays <= 90) {
      Object.entries(weekPlan).forEach(([subId, data]: [string, any]) => {
        const isEvent = [
          "test",
          "schularbeit",
          "sa",
          "lzk",
          "ausflug",
          "event",
          "spielefest",
          "konferenz",
          "gespraech",
          "sonstiges",
        ].includes(data?.type);

        const hasKeyword =
          data?.thema &&
          (data.thema.toLowerCase().includes("test") ||
            data.thema.toLowerCase().includes("schularbeit") ||
            data.thema.toLowerCase().includes("sa") ||
            data.thema.toLowerCase().includes("spielefest") ||
            data.thema.toLowerCase().includes("konferenz") ||
            data.thema.toLowerCase().includes("gespräch") ||
            data.thema.toLowerCase().includes("gespräche") ||
            data.thema.toLowerCase().includes("ausflug"));

        if (isEvent || hasKeyword) {
          let dataType = data.type;
          if ((!dataType || dataType === "standard") && data.thema) {
            const lowerThema = data.thema.toLowerCase();
            if (lowerThema.includes("spielefest")) dataType = "spielefest";
            else if (lowerThema.includes("konferenz")) dataType = "konferenz";
            else if (lowerThema.includes("gespr")) dataType = "gespraech";
            else if (lowerThema.includes("ausflug")) dataType = "ausflug";
            else if (lowerThema.includes("sa") || lowerThema.includes("schularbeit")) dataType = "sa";
            else if (lowerThema.includes("test") || lowerThema.includes("wh")) dataType = "test";
          }

          if (dataType && dataType !== "standard") {
            const typeNames: Record<string, string> = {
              spielefest: "Spielefest 🎈",
              konferenz: "Konferenz 👥",
              gespraech: "Gespräch 💬",
              event: "Event 🌟",
              ausflug: "Ausflug 🚌",
              test: "Test/WH 📝",
              schularbeit: "SA 📑",
              sa: "SA 📑",
              lzk: "LZK ⭐",
              sonstiges: "Termin 📌",
            };
            const textLabel = typeNames[dataType] || "Aktivität";

            const nameToUse = `${dataType === "konferenz" ? "👥" : dataType === "ausflug" ? "🚌" : dataType === "sa" || dataType === "schularbeit" ? "📑" : dataType === "test" || dataType === "lzk" ? "📝" : "📌"} ${data.thema || textLabel}`;
            const alreadyAdded = allEvents.some(
              (e) => e.name === nameToUse && Math.abs(e.diffDays - diffDays) <= 7
            );

            if (!alreadyAdded) {
              const subjectName = subId.charAt(0).toUpperCase() + subId.slice(1);
              allEvents.push({
                id: `jahresplan-${targetKW}-${subId}-${dataType}`,
                name: nameToUse,
                date: targetMonday,
                diffDays: Math.max(0, diffDays),
                type: "jahresplan",
                color:
                  dataType === "spielefest"
                    ? "fuchsia"
                    : dataType === "konferenz"
                      ? "blue"
                      : dataType === "gespraech"
                        ? "violet"
                        : dataType === "event" || dataType === "ausflug"
                          ? "sky"
                          : dataType === "sonstiges"
                            ? "rose"
                            : "orange",
                sub: `${textLabel} (Jahresplan, ${subjectName})`,
              });
            }
          }
        }
      });
    }
  }

  // Filter out any duplicates and slice to max 8
  const [activeFilter, setActiveFilter] = useState<"all" | "wochenplan" | "jahresplan" | "exams" | "custom">("all");

  const countWochenplan = allEvents.filter(e => e.type === "wochenplanung").length;
  const countJahresplan = allEvents.filter(e => e.type === "jahresplan").length;
  const countExams = allEvents.filter(e => 
    e.name.toLowerCase().includes("test") || 
    e.name.toLowerCase().includes("schularbeit") || 
    e.name.toLowerCase().includes("sa ") || 
    e.name.toLowerCase().includes("lzk") ||
    (e.sub && (e.sub.toLowerCase().includes("test") || e.sub.toLowerCase().includes("sa") || e.sub.toLowerCase().includes("lzk")))
  ).length;
  const countCustom = allEvents.filter(e => e.type === "custom").length;

  const filteredEvents = allEvents.filter((e) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "wochenplan") return e.type === "wochenplanung";
    if (activeFilter === "jahresplan") return e.type === "jahresplan";
    if (activeFilter === "custom") return e.type === "custom";
    if (activeFilter === "exams") {
      return (
        e.name.toLowerCase().includes("test") || 
        e.name.toLowerCase().includes("schularbeit") || 
        e.name.toLowerCase().includes("sa ") || 
        e.name.toLowerCase().includes("lzk") ||
        (e.sub && (e.sub.toLowerCase().includes("test") || e.sub.toLowerCase().includes("sa") || e.sub.toLowerCase().includes("lzk")))
      );
    }
    return true;
  });

  const upcomingEvents = filteredEvents
    .sort((a, b) => a.diffDays - b.diffDays)
    .filter((e, idx, self) => self.findIndex((x) => x.name === e.name && x.diffDays === e.diffDays) === idx)
    .slice(0, 10);

  const getEventDateString = (d: Date) => {
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const getColorStyles = (c: string) => {
    switch (c) {
      case "rose":
        return { text: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" };
      case "orange":
        return { text: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" };
      case "emerald":
        return { text: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" };
      case "sky":
        return { text: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" };
      case "purple":
        return { text: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" };
      case "fuchsia":
        return { text: "text-fuchsia-400", bg: "bg-fuchsia-500/10 border-fuchsia-500/20" };
      case "blue":
        return { text: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" };
      case "violet":
        return { text: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" };
      case "amber":
        return { text: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" };
      default:
        return { text: "text-neutral-400", bg: "bg-neutral-850 border border-neutral-800" };
    }
  };

  const [showAddForm, setShowAddForm] = useState(false);
  const [newEventName, setNewEventName] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventCategory, setNewEventCategory] = useState<"ausflug" | "konferenz" | "termin" | "prüfung">("termin");

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName || !newEventDate) return;

    const [yyyy, mm, dd] = newEventDate.split("-");
    const formattedDate = `${dd}.${mm}.${yyyy}`;

    const categoryConfig = {
      ausflug: { emoji: "🚌", color: "sky", sub: "Ausflug" },
      konferenz: { emoji: "👥", color: "blue", sub: "Konferenz" },
      termin: { emoji: "📌", color: "rose", sub: "Termin" },
      prüfung: { emoji: "📝", color: "orange", sub: "Prüfung" },
    };

    const config = categoryConfig[newEventCategory] || categoryConfig.termin;
    const nameWithEmoji = `${config.emoji} ${newEventName}`;

    setDashboardSettings((prev: any) => ({
      ...prev,
      customEvents: [
        ...(prev.customEvents || []),
        {
          id: Date.now().toString(),
          name: nameWithEmoji,
          date: formattedDate,
          color: config.color,
          sub: config.sub,
        },
      ],
    }));

    setNewEventName("");
    setNewEventDate("");
    setShowAddForm(false);
  };

  const filterTabs = [
    { id: "all", label: "Alle", count: allEvents.length },
    { id: "wochenplan", label: "Wochenplan", count: countWochenplan },
    { id: "jahresplan", label: "Jahresplan", count: countJahresplan },
    { id: "exams", label: "Prüfungen", count: countExams },
    { id: "custom", label: "Privat", count: countCustom },
  ] as const;

  return (
    <SortableWidget
      id="group4_events"
      overrideSpan={dashboardSettings.widgetSizes?.[`group4_events`]}
      onResize={handleResizeWidget}
      isEditMode={isEditMode}
    >
      <div
        className={`relative bg-neutral-900/80 backdrop-blur border border-neutral-800 text-white p-4 sm:p-6 rounded-3xl shadow-xl flex flex-col group/widget hover:border-neutral-700 transition-all ${getStatsWidgetSpan("events")}`}
      >
        {renderEyeOffShortcut("showEvents")}
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-neutral-450">
                Terminkalender
              </h3>
              <div className="text-[0.75rem] leading-tight font-black text-white">
                Anstehende Termine & Events
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-neutral-750"
            title="Ereignis hinzufügen"
            type="button"
          >
            {showAddForm ? <X size={14} /> : <Plus size={14} />}
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-3 mb-3 border-b border-neutral-800/40">
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-2.5 py-1 rounded-xl text-[0.625rem] font-bold tracking-wider uppercase whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 border ${
                  isActive
                    ? "bg-violet-600 border-violet-500 text-white shadow-sm shadow-violet-500/10"
                    : "bg-neutral-850 hover:bg-neutral-800 border-neutral-850 text-neutral-400 hover:text-neutral-200"
                }`}
                type="button"
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`text-[0.5625rem] px-1 py-0.2 rounded font-black ${
                      isActive ? "bg-violet-800 text-violet-100" : "bg-neutral-800 text-neutral-500"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Dynamic Add Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddEvent}
              className="mb-4 p-3 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-3 overflow-hidden text-[0.75rem]"
            >
              <div className="font-bold text-[0.6875rem] text-neutral-400 uppercase tracking-wider mb-1">Neues Ereignis eintragen</div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="z.B. Schulausflug"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  className="col-span-2 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white font-semibold focus:border-neutral-600 focus:outline-none"
                  required
                />
                <input
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 font-medium focus:border-neutral-600 focus:outline-none [&::-webkit-calendar-picker-indicator]:invert-[0.8]"
                  required
                />
                <select
                  value={newEventCategory}
                  onChange={(e: any) => setNewEventCategory(e.target.value)}
                  className="px-2 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 font-medium focus:border-neutral-600 focus:outline-none cursor-pointer"
                >
                  <option value="termin">📌 Termin</option>
                  <option value="ausflug">🚌 Ausflug</option>
                  <option value="konferenz">👥 Konferenz</option>
                  <option value="prüfung">📝 Prüfung</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-lg text-neutral-400 hover:text-white font-bold text-[0.625rem] uppercase tracking-wider cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-white font-black text-[0.625rem] uppercase tracking-wider cursor-pointer shadow-sm flex items-center gap-1"
                >
                  <Plus size={10} /> Speichern
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar max-h-[16rem] leading-tight">
          {upcomingEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-neutral-800/50 flex items-center justify-center text-neutral-500 border border-neutral-750">
                <Calendar size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-[0.6875rem] text-neutral-400 font-bold">
                  Keine anstehenden Termine
                </p>
                <p className="text-[0.625rem] text-neutral-500 max-w-[200px] leading-normal font-medium">
                  Plane Ausflüge, Konferenzen oder Termine, um sie hier auf einen Blick zu sehen.
                </p>
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-[0.625rem] rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                type="button"
              >
                <Plus size={10} />
                Termin erstellen
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map((event) => {
                const colors = getColorStyles(event.color);
                return (
                  <div
                    key={event.id}
                    className="p-3 rounded-xl flex items-center justify-between bg-neutral-850 border border-neutral-800 hover:border-neutral-700 transition-all group/item"
                  >
                    <div className="min-w-0 flex-1 mr-2">
                      <span className="text-[0.75rem] font-bold text-neutral-100 block truncate">
                        {event.name}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[0.5625rem] font-bold text-neutral-500">
                          {getEventDateString(event.date)}
                        </span>
                        {event.sub && (
                          <>
                            <span className="text-neutral-600 text-[0.5rem]">•</span>
                            <span className={`text-[0.5625rem] font-bold uppercase tracking-wider ${colors.text}`}>
                              {event.sub}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {event.diffDays === 0 ? (
                        <span className="text-[0.75rem] font-black text-amber-400 animate-pulse uppercase">
                          HEUTE!
                        </span>
                      ) : event.diffDays === 1 ? (
                        <span className="text-[0.625rem] font-black uppercase tracking-wider text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded border border-rose-400/20 shadow-sm">
                          MORGEN
                        </span>
                      ) : event.diffDays <= 3 ? (
                        <span className="text-[0.625rem] font-black uppercase tracking-wider text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded border border-orange-400/20 shadow-sm">
                          In {event.diffDays} Tg
                        </span>
                      ) : (
                        <span className="text-[0.6875rem] font-bold text-neutral-400">
                          in {event.diffDays} Tg
                        </span>
                      )}

                      {event.id.startsWith("custom-") && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const rawId = event.id.replace("custom-", "");
                            setDashboardSettings((prev: any) => ({
                              ...prev,
                              customEvents: (prev.customEvents || []).filter((c: any) => c.id !== rawId),
                            }));
                          }}
                          className="opacity-0 group-hover/item:opacity-100 text-neutral-500 hover:text-rose-400 w-6 h-6 flex items-center justify-center rounded-md hover:bg-rose-500/10 transition-all ml-1 cursor-pointer shrink-0"
                          title="Termin löschen"
                          type="button"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </SortableWidget>
  );
};

const MemoizedEventsWidget = React.memo(ClosedEventsWidget);

const MemoizedBirthdayWidget = React.memo(ClosedBirthdayWidget);

// --- MEMOIZED LEHRPLAN WIDGET ---
interface LehrplanWidgetProps {
  lehrplanStats: any[];
  dashboardSettings: any;
  setPage: (page: string) => void;
  getStatsWidgetSpan: (type: string) => string;
  renderEyeOffShortcut: (field: string) => React.ReactNode;
  handleResizeWidget: any;
  isEditMode?: boolean;
}

const ClosedLehrplanWidget: React.FC<LehrplanWidgetProps> = ({
  lehrplanStats,
  dashboardSettings,
  setPage,
  getStatsWidgetSpan,
  renderEyeOffShortcut,
  handleResizeWidget,
  isEditMode,
}) => {
  if (!dashboardSettings.showLehrplanAbdeckung) return null;

  return (
    <SortableWidget
      id="group4_lehrplan"
      overrideSpan={dashboardSettings.widgetSizes?.[`group4_lehrplan`]}
      onResize={handleResizeWidget}
      isEditMode={isEditMode}
    >
      <div
        className={`relative bg-neutral-900/80 backdrop-blur border border-neutral-800 text-white p-4 sm:p-6 rounded-3xl shadow-xl flex flex-col justify-between group cursor-pointer ${getStatsWidgetSpan("lehrplan")}`}
        onClick={() => setPage("wochenplanung")}
      >
        {renderEyeOffShortcut("showLehrplanAbdeckung")}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-450 border border-sky-500/20">
            <Layers size={18} />
          </div>
          <div>
            <h3 className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-neutral-450">
              Leistungskontrolle
            </h3>
            <div className="text-[0.75rem] leading-tight font-black text-white">
              Lehrplankompetenzen
            </div>
          </div>
        </div>

        {lehrplanStats.length > 0 && lehrplanStats.some((s) => s.count > 0) ? (
          <div className="space-y-3.5 flex-1 flex flex-col justify-center">
            {lehrplanStats.slice(0, 3).map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-[0.5625rem] font-black uppercase tracking-widest text-neutral-400">
                  <span className="text-wrap leading-tight break-words max-w-[130px]">
                    {item.label}
                  </span>
                  <span>
                    {item.count}/{item.total}
                  </span>
                </div>
                <div className="h-1.5 bg-neutral-950 rounded-full  border border-neutral-850 shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.percent}%` }}
                    className="h-full bg-sky-400 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
            <BookOpen size={24} className="text-neutral-600 mb-2" />
            <p className="text-[0.625rem] font-black text-neutral-450 uppercase tracking-widest leading-none">
              Keine Zuordnungen
            </p>
          </div>
        )}
      </div>
    </SortableWidget>
  );
};

const MemoizedLehrplanWidget = React.memo(ClosedLehrplanWidget);

export default function Dashboard() {
  const { app, setApp, updateStudent, notenUpdateTrigger } = useApp();
  const { showToast } = useToast();
  const { summary: lehrerzimmerUnread } = useLehrerzimmerUnread();
  const disabledModules = app?.settings?.disabledModules || [];
  const setPage = React.useCallback(
    (page: string) => setApp((prev) => ({ ...prev, currentPage: page })),
    [setApp],
  );
  const [showRemoteSetup, setShowRemoteSetup] = useState(false);
  const [selectedRadarEvent, setSelectedRadarEvent] = React.useState<
    any | null
  >(null);

  const handleMarkNoteCompleted = (noteId: string) => {
    setApp((prev) => ({
      ...prev,
      denkzettelNotes: (prev.denkzettelNotes || []).map((n) =>
        n.id === noteId ? { ...n, completed: true } : n,
      ),
    }));
    showToast("Notiz im Denkzettel als erledigt markiert!", "success");
    setSelectedRadarEvent(null);
  };

  const getFachColorKey = React.useCallback(
    (fachName?: string) => {
      if (!fachName) return "slate";
      const configColor = app?.fachConfig?.[fachName]?.color;
      const ln = fachName.toLowerCase();

      if (!configColor || configColor === "slate") {
        if (
          ln.includes("werken") ||
          ln.includes("technik") ||
          ln.includes("design")
        )
          return "orange";
        if (ln.includes("bewegung") || ln.includes("sport")) return "teal";
        if (ln.includes("fremdsprache") || ln.includes("englisch"))
          return "sky";
        if (ln.includes("deutsch")) return "blue";
        if (ln.includes("mathematik")) return "red";
        if (ln.includes("sachunterricht")) return "emerald";
        if (
          ln.includes("bildnerische") ||
          ln.includes("kunst") ||
          ln.includes("gestaltung")
        )
          return "purple";
        if (ln.includes("musik")) return "pink";
        if (ln.includes("religion")) return "indigo";
      }

      return configColor || "slate";
    },
    [app?.fachConfig],
  );

  const getFachStyle = React.useCallback(
    (fach: string, isCurrent: boolean) => {
      const c = getFachColorKey(fach);

      const colorMap: Record<
        string,
        {
          bg: string;
          text: string;
          subtext: string;
          border: string;
          pillBg: string;
          pillText: string;
          lightBg: string;
          lightText: string;
          lightBorder: string;
          lightHover: string;
          shadow: string;
          glow: string;
        }
      > = {
        blue: {
          bg: "bg-blue-600 border-blue-600",
          text: "text-white",
          subtext: "text-blue-100",
          border: "border-blue-700",
          pillBg: "bg-white text-blue-900 border-white",
          pillText: "text-blue-600",
          lightBg: "bg-blue-50/40",
          lightText: "text-blue-900",
          lightBorder: "border-blue-100",
          lightHover: "hover:bg-blue-50/85 hover:border-blue-200/80",
          shadow: "rgba(37,99,235,0.2)",
          glow: "shadow-[0_15px_30px_-5px_rgba(37,99,235,0.25)] border-blue-500/30",
        },
        red: {
          bg: "bg-red-600 border-red-600",
          text: "text-white",
          subtext: "text-red-100",
          border: "border-red-700",
          pillBg: "bg-white text-red-900 border-white",
          pillText: "text-red-600",
          lightBg: "bg-red-50/40",
          lightText: "text-red-900",
          lightBorder: "border-red-100",
          lightHover: "hover:bg-red-50/85 hover:border-red-200/80",
          shadow: "rgba(220,38,38,0.2)",
          glow: "shadow-[0_15px_30px_-5px_rgba(220,38,38,0.25)] border-red-500/30",
        },
        emerald: {
          bg: "bg-emerald-600 border-emerald-600",
          text: "text-white",
          subtext: "text-emerald-100",
          border: "border-emerald-700",
          pillBg: "bg-white text-emerald-950 border-white",
          pillText: "text-emerald-600",
          lightBg: "bg-emerald-50/40",
          lightText: "text-emerald-950",
          lightBorder: "border-emerald-100",
          lightHover: "hover:bg-emerald-50/85 hover:border-emerald-200/80",
          shadow: "rgba(5,150,105,0.2)",
          glow: "shadow-[0_15px_30px_-5px_rgba(5,150,105,0.25)] border-emerald-500/30",
        },
        indigo: {
          bg: "bg-indigo-600 border-indigo-600",
          text: "text-white",
          subtext: "text-indigo-100",
          border: "border-indigo-700",
          pillBg: "bg-white text-indigo-900 border-white",
          pillText: "text-indigo-600",
          lightBg: "bg-indigo-50/40",
          lightText: "text-indigo-900",
          lightBorder: "border-indigo-100",
          lightHover: "hover:bg-indigo-50/85 hover:border-indigo-200/80",
          shadow: "rgba(79,70,229,0.2)",
          glow: "shadow-[0_15px_30px_-5px_rgba(79,70,229,0.25)] border-indigo-500/30",
        },
        sky: {
          bg: "bg-sky-500 border-sky-500",
          text: "text-white",
          subtext: "text-sky-100",
          border: "border-sky-600",
          pillBg: "bg-white text-sky-900 border-white",
          pillText: "text-sky-500",
          lightBg: "bg-sky-50/40",
          lightText: "text-sky-900",
          lightBorder: "border-sky-100",
          lightHover: "hover:bg-sky-50/85 hover:border-sky-200/80",
          shadow: "rgba(14,165,233,0.15)",
          glow: "shadow-[0_15px_30px_-5px_rgba(14,165,233,0.2)] border-sky-400/30",
        },
        purple: {
          bg: "bg-purple-600 border-purple-600",
          text: "text-white",
          subtext: "text-purple-100",
          border: "border-purple-700",
          pillBg: "bg-white text-purple-900 border-white",
          pillText: "text-purple-600",
          lightBg: "bg-purple-50/40",
          lightText: "text-purple-900",
          lightBorder: "border-purple-100",
          lightHover: "hover:bg-purple-50/85 hover:border-purple-200/80",
          shadow: "rgba(147,51,234,0.2)",
          glow: "shadow-[0_15px_30px_-5px_rgba(147,51,234,0.25)] border-purple-500/30",
        },
        violet: {
          bg: "bg-violet-600 border-violet-600",
          text: "text-white",
          subtext: "text-violet-100",
          border: "border-violet-700",
          pillBg: "bg-white text-violet-900 border-white",
          pillText: "text-violet-600",
          lightBg: "bg-violet-50/40",
          lightText: "text-violet-900",
          lightBorder: "border-violet-100",
          lightHover: "hover:bg-violet-50/85 hover:border-violet-200/80",
          shadow: "rgba(124,58,237,0.2)",
          glow: "shadow-[0_15px_30px_-5px_rgba(124,58,237,0.25)] border-violet-500/30",
        },
        pink: {
          bg: "bg-pink-500 border-pink-500",
          text: "text-white",
          subtext: "text-pink-100",
          border: "border-pink-600",
          pillBg: "bg-white text-pink-900 border-white",
          pillText: "text-pink-650",
          lightBg: "bg-pink-50/40",
          lightText: "text-pink-900",
          lightBorder: "border-pink-100",
          lightHover: "hover:bg-pink-50/85 hover:border-pink-200/80",
          shadow: "rgba(236,72,153,0.15)",
          glow: "shadow-[0_15px_30px_-5px_rgba(236,72,153,0.20)] border-pink-500/30",
        },
        orange: {
          bg: "bg-orange-500 border-orange-500",
          text: "text-white",
          subtext: "text-orange-100",
          border: "border-orange-600",
          pillBg: "bg-white text-orange-950 border-white",
          pillText: "text-orange-600",
          lightBg: "bg-orange-50/40",
          lightText: "text-orange-955",
          lightBorder: "border-orange-100",
          lightHover: "hover:bg-orange-50/85 hover:border-orange-200/80",
          shadow: "rgba(236,114,36,0.15)",
          glow: "shadow-[0_15px_30px_-5px_rgba(236,114,36,0.20)] border-orange-500/30",
        },
        teal: {
          bg: "bg-teal-600 border-teal-600",
          text: "text-white",
          subtext: "text-teal-100",
          border: "border-teal-700",
          pillBg: "bg-white text-teal-950 border-white",
          pillText: "text-teal-600",
          lightBg: "bg-teal-50/40",
          lightText: "text-teal-955",
          lightBorder: "border-teal-100",
          lightHover: "hover:bg-teal-50/85 hover:border-teal-200/80",
          shadow: "rgba(13,148,136,0.2)",
          glow: "shadow-[0_15px_30px_-5px_rgba(13,148,136,0.25)] border-teal-500/30",
        },
        stone: {
          bg: "bg-stone-600 border-stone-600",
          text: "text-white",
          subtext: "text-stone-200",
          border: "border-stone-700",
          pillBg: "bg-white text-stone-900 border-white",
          pillText: "text-stone-600",
          lightBg: "bg-stone-50/40",
          lightText: "text-stone-900",
          lightBorder: "border-stone-100",
          lightHover: "hover:bg-stone-50/85 hover:border-stone-200/80",
          shadow: "rgba(120,113,108,0.2)",
          glow: "shadow-[0_15px_30px_-5px_rgba(120,113,108,0.25)] border-stone-500/30",
        },
        amber: {
          bg: "bg-amber-550 border-amber-550 text-slate-900",
          text: "text-slate-900",
          subtext: "text-amber-950/80",
          border: "border-amber-650/40",
          pillBg: "bg-amber-950 text-white border-amber-950",
          pillText: "text-amber-500",
          lightBg: "bg-amber-50/40",
          lightText: "text-amber-955",
          lightBorder: "border-amber-100",
          lightHover: "hover:bg-amber-50/85 hover:border-amber-200/80",
          shadow: "rgba(245,158,11,0.15)",
          glow: "shadow-[0_15px_30px_-5px_rgba(245,158,11,0.20)] border-amber-500/30",
        },
        fuchsia: {
          bg: "bg-fuchsia-600 border-fuchsia-600",
          text: "text-white",
          subtext: "text-fuchsia-100",
          border: "border-fuchsia-700",
          pillBg: "bg-white text-fuchsia-900 border-white",
          pillText: "text-fuchsia-600",
          lightBg: "bg-fuchsia-50/40",
          lightText: "text-fuchsia-900",
          lightBorder: "border-fuchsia-100",
          lightHover: "hover:bg-fuchsia-50/85 hover:border-fuchsia-200/80",
          shadow: "rgba(192,38,211,0.2)",
          glow: "shadow-[0_15px_30px_-5px_rgba(192,38,211,0.25)] border-fuchsia-500/30",
        },
        rose: {
          bg: "bg-rose-500 border-rose-500",
          text: "text-white",
          subtext: "text-rose-100",
          border: "border-rose-600/40",
          pillBg: "bg-white text-rose-900 border-white",
          pillText: "text-rose-500",
          lightBg: "bg-rose-50/40",
          lightText: "text-rose-900",
          lightBorder: "border-rose-100",
          lightHover: "hover:bg-rose-50/85 hover:border-rose-200/80",
          shadow: "rgba(244,63,94,0.15)",
          glow: "shadow-[0_15px_30px_-5px_rgba(244,63,94,0.20)] border-rose-500/30",
        },
        yellow: {
          bg: "bg-yellow-500 border-yellow-500 text-slate-900",
          text: "text-slate-900",
          subtext: "text-yellow-950/80",
          border: "border-yellow-600/40",
          pillBg: "bg-yellow-950 text-white border-yellow-950",
          pillText: "text-yellow-500",
          lightBg: "bg-yellow-50/40",
          lightText: "text-yellow-955",
          lightBorder: "border-yellow-100",
          lightHover: "hover:bg-yellow-50/85 hover:border-yellow-200/80",
          shadow: "rgba(234,179,8,0.15)",
          glow: "shadow-[0_15px_30px_-5px_rgba(234,179,8,0.20)] border-yellow-500/30",
        },
        lime: {
          bg: "bg-lime-500 border-lime-500 text-slate-900",
          text: "text-slate-900",
          subtext: "text-lime-950/85",
          border: "border-lime-600/40",
          pillBg: "bg-lime-950 text-white border-lime-950",
          pillText: "text-lime-600",
          lightBg: "bg-lime-50/40",
          lightText: "text-lime-955",
          lightBorder: "border-lime-100",
          lightHover: "hover:bg-lime-50/85 hover:border-lime-200/80",
          shadow: "rgba(132,204,22,0.15)",
          glow: "shadow-[0_15px_30px_-5px_rgba(132,204,22,0.20)] border-lime-500/30",
        },
        green: {
          bg: "bg-green-600 border-green-600",
          text: "text-white",
          subtext: "text-green-100",
          border: "border-green-700",
          pillBg: "bg-white text-green-950 border-white",
          pillText: "text-green-600",
          lightBg: "bg-green-50/40",
          lightText: "text-green-950",
          lightBorder: "border-green-100",
          lightHover: "hover:bg-green-50/85 hover:border-green-200/80",
          shadow: "rgba(34,197,94,0.2)",
          glow: "shadow-[0_15px_30px_-5px_rgba(34,197,94,0.25)] border-green-500/30",
        },
        cyan: {
          bg: "bg-cyan-600 border-cyan-600",
          text: "text-white",
          subtext: "text-cyan-100",
          border: "border-cyan-700",
          pillBg: "bg-white text-cyan-950 border-white",
          pillText: "text-cyan-600",
          lightBg: "bg-cyan-50/40",
          lightText: "text-cyan-955",
          lightBorder: "border-cyan-100",
          lightHover: "hover:bg-cyan-50/85 hover:border-cyan-200/80",
          shadow: "rgba(6,182,212,0.2)",
          glow: "shadow-[0_15px_30px_-5px_rgba(6,182,212,0.25)] border-cyan-500/30",
        },
        slate: {
          bg: "bg-slate-900 border-slate-900",
          text: "text-white",
          subtext: "text-slate-300",
          border: "border-slate-950",
          pillBg: "bg-white text-slate-900 border-white",
          pillText: "text-slate-500",
          lightBg: "bg-white",
          lightText: "text-slate-800 border-slate-200/80",
          lightBorder: "border-slate-100",
          lightHover: "hover:bg-slate-50/80 hover:border-slate-200/90",
          shadow: "rgba(15,23,42,0.15)",
          glow: "shadow-[0_15px_30px_-5px_rgba(15,23,42,0.2)] border-slate-900/30",
        },
      };

      const style = colorMap[c] || colorMap.slate;

      if (isCurrent) {
        return {
          card: `${style.bg} ${style.text} ${style.glow} border ${style.border}`,
          pill: style.pillBg,
          subtext: style.subtext,
          badgeText: style.pillText,
          arrow: style.text,
          bottomBar: "bg-white/80",
        };
      } else {
        return {
          card: `${style.lightBg} ${style.lightBorder} ${style.lightText} ${style.lightHover} border shadow-inner-sm`,
          pill: "bg-white/80 border-slate-200/60 text-slate-400 group-hover:bg-white group-hover:border-slate-300 transition-colors",
          subtext:
            "text-slate-400 group-hover:text-slate-500 transition-colors",
          badgeText:
            "text-slate-500 group-hover:text-slate-700 transition-colors",
          arrow: "text-slate-300 group-hover:text-slate-500",
          bottomBar: "bg-slate-300/80",
        };
      }
    },
    [getFachColorKey],
  );

  const [dismissingIds, setDismissingIds] = useState<string[]>([]);

  const handleDismissInsight = (id: string) => {
    setApp((prev) => ({
      ...prev,
      dismissedActionItems: [...(prev.dismissedActionItems || []), id],
    }));
  };

  const startDismissInsight = (id: string) => {
    setDismissingIds((prev) => [...prev, id]);
    setTimeout(() => {
      handleDismissInsight(id);
      setDismissingIds((prev) => prev.filter((x) => x !== id));
    }, 400);
  };
  const [weatherData, setWeatherData] = useState<any>(null);
  const [forecastHourly, setForecastHourly] = useState<any[]>([]);
  const [isChangingCity, setIsChangingCity] = useState(false);
  const [newCity, setNewCity] = useState(app?.schulOrt || "");
  const [selectedHourId, setSelectedHourId] = useState<number | null>(null);

  // Strengths and badges input states
  const [newStrengthInput, setNewStrengthInput] = useState("");
  const [showBadgeSection, setShowBadgeSection] = useState(false);
  const [customBadgeName, setCustomBadgeName] = useState("");
  const [customBadgeIcon, setCustomBadgeIcon] = useState("🌟");

  const students = app.schueler || [];
  const currentDateStr = new Date().toISOString().split("T")[0];
  const absentToday = students.filter((s) => {
    const dayData = app.anwesenheit?.[s.id]?.[currentDateStr];
    if (!dayData) return false;
    return Object.values(dayData).some((v) => v !== "a" && v !== "");
  }).length;

  const [showBdayModal, setShowBdayModal] = useState(() => {
    try {
      const todayStr = new Date().toDateString();
      return sessionStorage.getItem("bday_popup_shown_" + todayStr) !== "true";
    } catch (e) {
      return true;
    }
  });

  // Spaced Practice & Luuise Tracker States
  const [quizLoading, setQuizLoading] = useState<string | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<{
    id: string;
    thema: string;
    quizText: string;
  } | null>(null);
  const [luuiseInput, setLuuiseInput] = useState("");
  const [showLuuiseReflectionModal, setShowLuuiseReflectionModal] =
    useState(false);
  const [luuiseComment, setLuuiseComment] = useState("");

  const handleStartLuuise = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!luuiseInput.trim()) return;
    setApp((prev) => ({
      ...prev,
      luuiseTracker: {
        aktiv: true,
        thema: luuiseInput.trim(),
        startDatum: new Date().toISOString().split("T")[0],
        eintraege: {},
      },
    }));
    setLuuiseInput("");
  };

  const handleTrackLuuise = (value: "gruen" | "gelb" | "rot") => {
    const todayStr = formatLocalDateKey(new Date());
    setApp((prev) => {
      const tracker = prev.luuiseTracker || {
        aktiv: true,
        thema: "",
        startDatum: "",
        eintraege: {},
      };
      return {
        ...prev,
        luuiseTracker: {
          ...tracker,
          eintraege: {
            ...tracker.eintraege,
            [todayStr]: value,
          },
        },
      };
    });
  };

  const handleCompletePractice = (spId: string) => {
    const today = new Date();
    today.setDate(today.getDate() + 42);
    const nextDateStr = today.toISOString().split("T")[0];

    setApp((prev) => ({
      ...prev,
      spacedPractices: (prev.spacedPractices || []).map((sp) =>
        sp.id === spId
          ? { ...sp, intervallStufe: 2, naechsteWiederholung: nextDateStr }
          : sp,
      ),
    }));
  };

  const handleGenerateQuiz = async (spId: string, thema: string) => {
    setQuizLoading(spId);
    try {
      const prompt = `Erstelle ein kurzes, spielerisches Mini-Quiz mit genau 3 kurzen Fragen zum Thema "${thema}" für Volksschüler. Jede Frage sollte eine richtige Antwort haben. Bitte formuliere es kindgerecht und in schön formatiertem Markdown. Gib am Ende ganz kurz die Lösungen an.`;
      const result = await askAI("ki-beurteilung", prompt);
      if (result) {
        setActiveQuiz({ id: spId, thema, quizText: result });
      } else {
        alert("Quiz konnte nicht generiert werden.");
      }
    } catch (err: any) {
      alert("KI momentan nicht erreichbar: " + err.message);
    } finally {
      setQuizLoading(null);
    }
  };

  const handleFinishLuuiseReflection = () => {
    const tracker = app.luuiseTracker;
    if (!tracker) return;

    const entries = Object.values(tracker.eintraege || {});
    const greenCount = entries.filter((e) => e === "gruen").length;
    const yellowCount = entries.filter((e) => e === "gelb").length;
    const redCount = entries.filter((e) => e === "rot").length;

    const journalText = `Luuise-Reflexion für Knacknuss: "${tracker.thema}"
Startdatum: ${tracker.startDatum}
Ergebnisse: Grün/Gut: ${greenCount}, Gelb/Mittel: ${yellowCount}, Rot/Schlecht: ${redCount}.
Pädagogische Reflexionsnotiz: ${luuiseComment}`;

    const newJournalEntry = {
      id: `luuise-journal-${Date.now()}`,
      datum: new Date().toISOString().split("T")[0],
      kategorie: "Journal" as const,
      inhalt: journalText,
      quelle: "Luuise-Tracker",
      icon: "target",
    };

    setApp((prev) => ({
      ...prev,
      journal: [...(prev.journal || []), newJournalEntry],
      luuiseTracker: {
        aktiv: false,
        thema: "",
        startDatum: "",
        eintraege: {},
      },
    }));

    setLuuiseComment("");
    setShowLuuiseReflectionModal(false);
    alert(
      "Luuise-Tracker erfolgreich abgeschlossen und Reflexionsbericht im Journal gespeichert!",
    );
  };

  // Customizer and Visibility States
  const [showCustomizePanel, setShowCustomizePanel] = useState(false);
  const [dashboardDayMode, setDashboardDayMode] = useState<DashboardDayMode>(() => {
    const saved = localStorage.getItem("dashboard_day_mode_v1");
    if (saved === "morning" || saved === "teaching" || saved === "review") return saved;
    const hour = new Date().getHours();
    return hour < 10 ? "morning" : hour < 14 ? "teaching" : "review";
  });
  useEffect(() => {
    localStorage.setItem("dashboard_day_mode_v1", dashboardDayMode);
  }, [dashboardDayMode]);

  useEffect(() => {
    const handleOpenCustomize = () => setShowCustomizePanel(true);
    window.addEventListener("open-dashboard-customize", handleOpenCustomize);
    return () =>
      window.removeEventListener(
        "open-dashboard-customize",
        handleOpenCustomize,
      );
  }, []);
  const isEditMode = showCustomizePanel;

  const [dashboardSettings, setDashboardSettings] = useState(() => {
    let saved = localStorage.getItem("dashboard_settings_v7");

    // Migration: Falls v7 leer, nach anderen Versionen suchen (v1 bis v6)
    if (!saved) {
      for (const v of ["v6", "v5", "v4", "v3", "v2", "v1"]) {
        const legacy = localStorage.getItem(`dashboard_settings_${v}`);
        if (legacy) {
          saved = legacy;
          localStorage.setItem("dashboard_settings_v7", legacy);
          // Alle alten Versionen aufräumen
          ["v1", "v2", "v3", "v4", "v5", "v6"].forEach((key) =>
            localStorage.removeItem(`dashboard_settings_${key}`),
          );
          break;
        }
      }
    }

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.showZone1 === undefined) parsed.showZone1 = true;
        if (parsed.showZone2 === undefined) parsed.showZone2 = true;
        if (parsed.showZone3 === undefined) parsed.showZone3 = true;
        if (parsed.showZone4 === undefined) parsed.showZone4 = true;
        if (parsed.showClassPet === undefined) parsed.showClassPet = true;
        if (parsed.showKlassenglas === undefined) parsed.showKlassenglas = true;
        if (parsed.showFlowerPuzzle === undefined) parsed.showFlowerPuzzle = true;
        if (parsed.moveWeekendBirthdays === undefined)
          parsed.moveWeekendBirthdays = "none";
        if (parsed.customEvents === undefined)
          parsed.customEvents = [];
        if (parsed.showEvents === undefined)
          parsed.showEvents = true;
        if (!parsed.layout)
          parsed.layout = [
            "group_zone1",
            "group_zone2",
            "group_zone3",
            "group_zone4",
          ];
        return parsed;
      } catch (e) {}
    }
    return {
      showZone1: true,
      showZone2: true,
      showZone3: false,
      showZone4: false,
      showClassPet: false,
      showKlassenglas: true,
      showFlowerPuzzle: false,
      moveWeekendBirthdays: "none",
      showEvents: true,
      customEvents: [],
      layout: ["group_zone1", "group_zone2", "group_zone3", "group_zone4"],
    };
  });

  // Ensure default layout if missing from saved settings
  if (!dashboardSettings.layout) {
    dashboardSettings.layout = [
      "group_zone1",
      "group_zone2",
      "group_zone3",
      "group_zone4",
    ];
  }

  const [vorschauStunde, setVorschauStunde] = useState<number>(() => {
    const saved = localStorage.getItem("dashboard_vorschau_stunde");
    return saved ? parseInt(saved, 10) : 16;
  });
  const [vorschauModus, setVorschauModus] = useState<"automatik" | "heute" | "morgen">(() => {
    const saved = localStorage.getItem("dashboard_vorschau_modus");
    if (saved === "heute" || saved === "morgen" || saved === "automatik") {
      return saved as "automatik" | "heute" | "morgen";
    }
    const oldSaved = localStorage.getItem("dashboard_vorschau_deaktiviert");
    if (oldSaved === "true") return "heute";
    return "automatik";
  });
  const vorschauDeaktiviert = vorschauModus === "heute";
  const [manualDateOffset, setManualDateOffset] = useState<number>(0);

  useEffect(() => {
    localStorage.setItem(
      "dashboard_settings_v7",
      JSON.stringify(dashboardSettings),
    );
  }, [dashboardSettings]);

  useEffect(() => {
    localStorage.setItem(
      "dashboard_vorschau_stunde",
      vorschauStunde.toString(),
    );
    localStorage.setItem(
      "dashboard_vorschau_modus",
      vorschauModus,
    );
    localStorage.setItem(
      "dashboard_vorschau_deaktiviert",
      (vorschauModus === "heute").toString(),
    );
  }, [vorschauStunde, vorschauModus]);

  const toggleSetting = (key: keyof typeof dashboardSettings) => {
    setDashboardSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  useEffect(() => {
    async function fetchLocalWeather() {
      if (!app?.schulOrt) return;
      const cacheKey = `weather_cache_${app.schulOrt}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { timestamp, data, hourly } = JSON.parse(cached);
          if (Date.now() - timestamp < 30 * 60 * 1000) {
            setWeatherData(data);
            setForecastHourly(hourly);
            return;
          }
        } catch (e) {
          localStorage.removeItem(cacheKey);
        }
      }

      try {
        const geoUrl = `/api/weather/geocode?city=${encodeURIComponent(app.schulOrt)}`;
        const geoRes = await fetch(geoUrl);
        if (!geoRes.ok) {
          throw new Error(`Geocode fetch HTTP error: ${geoRes.status}`);
        }
        const geoContentType = geoRes.headers.get("content-type") || "";
        if (!geoContentType.includes("application/json")) {
          throw new Error("Geocode fetch returned non-JSON content");
        }
        const geoData = await geoRes.json();

        if (!geoData.results?.[0]) return;
        const { latitude: lat, longitude: lon } = geoData.results[0];

        const weatherUrl = `/api/weather/forecast?lat=${lat}&lon=${lon}`;
        const res = await fetch(weatherUrl);
        if (!res.ok) {
          throw new Error(`Weather forecast HTTP error: ${res.status}`);
        }
        const weatherContentType = res.headers.get("content-type") || "";
        if (!weatherContentType.includes("application/json")) {
          throw new Error("Weather forecast returned non-JSON content");
        }
        const d = await res.json();

        const current = d.current;
        const hourly = (d.hourly?.time || [])
          .slice(0, 6)
          .map((time: string, i: number) => ({
            time: new Date(time).getHours() + ":00",
            temp: Math.round(d.hourly.temperature_2m[i]),
            code: d.hourly.weather_code[i],
          }));

        setWeatherData(current);
        setForecastHourly(hourly);

        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            timestamp: Date.now(),
            data: current,
            hourly,
          }),
        );
      } catch (e) {
        // Fallback placeholder data during server cold-starts or external API timeouts
        const fallbackCurrent = {
          time: new Date().toISOString(),
          temperature_2m: 20.0,
          precipitation: 0.0,
          wind_speed_10m: 5.0,
          weather_code: 0,
        };
        const fallbackHourly = Array.from({ length: 6 }, (_, i) => {
          const hr = (new Date().getHours() + i) % 24;
          return {
            time: `${hr}:00`,
            temp: 20 - i,
            code: 0,
          };
        });
        setWeatherData(fallbackCurrent);
        setForecastHourly(fallbackHourly);
      }
    }

    fetchLocalWeather();
    const interval = setInterval(fetchLocalWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [app?.schulOrt]);

  const handleCityChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCity.trim()) {
      setApp((prev) => ({ ...prev, schulOrt: newCity.trim() }));
      setIsChangingCity(false);
    }
  };

  const [showNoteInput, setShowNoteInput] = useState(false);
  const [selectedCurveSubjects, setSelectedCurveSubjects] = useState<string[]>(
    () => {
      try {
        const saved = localStorage.getItem("dashboard_curve_subjects");
        if (saved) return JSON.parse(saved);
      } catch (e) {}
      return [];
    },
  );
  const [tempNote, setTempNote] = useState("");
  const [denkZettelInput, setDenkZettelInput] = useState("");
  const [denkzettelNotes, setDenkzettelNotes] = useState<any[]>([]);

  const faecherString = (app?.faecher || []).join(",");
  const fachConfigString = JSON.stringify(app?.fachConfig || {});

  // Keep selectedCurveSubjects initialized with all subjects
  useEffect(() => {
    const activeFaecherList =
      app?.faecher && app.faecher.length > 0
                      ? app.faecher.filter(f => app.fachConfig?.[f]?.unterrichtet !== false) : FAECHER_ALLE;
    if (activeFaecherList && activeFaecherList.length > 0) {
      setSelectedCurveSubjects((prev) => {
        if (
          prev.length === 0 &&
          !localStorage.getItem("dashboard_curve_subjects")
        )
          return activeFaecherList;
        return prev.filter((s) => activeFaecherList.includes(s));
      });
    }
  }, [faecherString, fachConfigString]);

  useEffect(() => {
    if (selectedCurveSubjects.length > 0) {
      localStorage.setItem(
        "dashboard_curve_subjects",
        JSON.stringify(selectedCurveSubjects),
      );
    }
  }, [selectedCurveSubjects]);

  // Synchronize with the persistent school_denkzettel_notes
  useEffect(() => {
    const loadNotes = () => {
      const saved = localStorage.getItem("school_denkzettel_notes");
      if (saved) {
        try {
          setDenkzettelNotes(JSON.parse(saved));
        } catch (e) {
          console.error(
            "Dashboard failed to parse school_denkzettel_notes:",
            e,
          );
        }
      } else {
        setDenkzettelNotes([]);
      }
    };
    loadNotes();

    window.addEventListener("denkzettel-changed", loadNotes);
    window.addEventListener("storage", loadNotes);
    return () => {
      window.removeEventListener("denkzettel-changed", loadNotes);
      window.removeEventListener("storage", loadNotes);
    };
  }, []);

  const [aiInsight, setAiInsight] = useState<DailyInsight | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  const computeIsBirthdayDisplay = (
    geburtstagStr: string | undefined | null,
    targetDate: Date,
  ) => {
    if (!geburtstagStr) return false;
    let bday: Date;
    const parts = geburtstagStr.split(".");
    if (parts.length === 3) {
      bday = new Date(
        targetDate.getFullYear(),
        parseInt(parts[1]) - 1,
        parseInt(parts[0]),
      );
    } else {
      bday = new Date(geburtstagStr);
    }

    if (isNaN(bday.getTime())) return false;

    const tMonth = targetDate.getMonth();
    const tDate = targetDate.getDate();
    const tDay = targetDate.getDay(); // 0 = Sun, 6 = Sat

    // Exact match today
    if (bday.getMonth() === tMonth && bday.getDate() === tDate) {
      if (tDay === 0 || tDay === 6) {
        // Weekend birthday
        return (
          dashboardSettings?.moveWeekendBirthdays !== "friday" &&
          dashboardSettings?.moveWeekendBirthdays !== "monday"
        );
      }
      return true; // Weekday exact match
    }

    // Move to Friday
    if (dashboardSettings?.moveWeekendBirthdays === "friday" && tDay === 5) {
      const sat = new Date(targetDate.getFullYear(), tMonth, tDate + 1);
      const sun = new Date(targetDate.getFullYear(), tMonth, tDate + 2);
      if (
        (bday.getMonth() === sat.getMonth() &&
          bday.getDate() === sat.getDate()) ||
        (bday.getMonth() === sun.getMonth() && bday.getDate() === sun.getDate())
      ) {
        return true;
      }
    }

    // Move to Monday
    if (dashboardSettings?.moveWeekendBirthdays === "monday" && tDay === 1) {
      const sun = new Date(targetDate.getFullYear(), tMonth, tDate - 1);
      const sat = new Date(targetDate.getFullYear(), tMonth, tDate - 2);
      if (
        (bday.getMonth() === sat.getMonth() &&
          bday.getDate() === sat.getDate()) ||
        (bday.getMonth() === sun.getMonth() && bday.getDate() === sun.getDate())
      ) {
        return true;
      }
    }

    return false;
  };

  const loadInsight = async () => {
    setLoadingInsight(true);
    setInsightError(null);
    try {
      // Kontext für die KI sammeln
      const today = new Date();
      const birthdaysToday = (app?.schueler || [])
        .filter((s: any) => computeIsBirthdayDisplay(s.geburtstag, today))
        .map((s: any) => s.vorname);

      const openTodos = (todos || [])
        .filter((t: any) => !t.done)
        .map((t: any) => t.text);
      const openMorgen = (app?.morgenAufgaben || [])
        .filter((t: any) => !t.completed)
        .map((t: any) => t.text);

      const schuelerMitFoerderbedarf = (app?.schueler || [])
        .filter((s: any) => {
          const fp = s.foerderprofil;
          return (
            s.spf ||
            s.daz ||
            (fp?.foerderbedarfBereiche &&
              fp.foerderbedarfBereiche.length > 0) ||
            (fp?.foerderziele && fp.foerderziele.length > 0)
          );
        })
        .map((s: any) => {
          const fp = s.foerderprofil;
          return {
            vorname: s.vorname,
            staerken: fp?.staerken || [],
            foerderbedarfBereiche: fp?.foerderbedarfBereiche || [],
            diagnosen: fp?.diagnosen || "",
            foerderziele: (fp?.foerderziele || []).map((z: any) => z.ziel),
            massnahmen: (fp?.massnahmen || []).map(
              (m: any) => m.bezeichnung || m.beschreibung || "",
            ),
          };
        });

      const contextData = {
        geburtstage:
          birthdaysToday.length > 0 ? birthdaysToday.join(", ") : "Keine heute",
        offene_todos: openTodos.slice(0, 3),
        morgenroutine: openMorgen.slice(0, 3),
        fokusKind: focusStudent
          ? {
              vorname: focusStudent.vorname,
              staerken: focusStudent.foerderprofil?.staerken || [],
              foerderbedarfBereiche:
                focusStudent.foerderprofil?.foerderbedarfBereiche || [],
              foerderziele: (
                focusStudent.foerderprofil?.foerderziele || []
              ).map((z: any) => z.ziel),
            }
          : null,
        schueler_mit_foerderbedarf: schuelerMitFoerderbedarf.slice(0, 4),
        wichtige_infos: (app?.notizen || [])
          .filter((n: any) => n.wichtig)
          .slice(0, 2)
          .map((n: any) => n.inhalt),
      };

      const insight = await getDailyInsight(
        `${app?.anrede || ""} ${app?.nachname || ""}`,
        app?.stufe || 1,
        (app?.schueler || []).length,
        contextData,
      );
      if (typeof insight === "string") {
        setInsightError(insight);
      } else if (insight) {
        setAiInsight(insight);
      } else {
        setInsightError("Keine Daten erhalten.");
      }
    } catch (err) {
      console.error("Fehler beim Laden des KI-Insights:", err);
      setInsightError("Ein unerwarteter Fehler ist aufgetreten.");
    }
    setLoadingInsight(false);
  };

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { anzeigeDatum, vorschauTyp } = React.useMemo(() => {
    let raw = new Date(currentTime);
    if (manualDateOffset !== 0) {
      raw.setDate(raw.getDate() + manualDateOffset);
      return { anzeigeDatum: raw, vorschauTyp: "Manuell" };
    }

    let anzeige = new Date(raw);
    let typ = null;

    if (vorschauModus === "heute") {
      return { anzeigeDatum: raw, vorschauTyp: null };
    }

    if (vorschauModus === "morgen") {
      const day = raw.getDay(); // 0: Sun, 1: Mon, ..., 5: Fri, 6: Sat
      if (day === 5) {
        anzeige.setDate(raw.getDate() + 3); // Montag
      } else if (day === 6) {
        anzeige.setDate(raw.getDate() + 2); // Montag
      } else {
        anzeige.setDate(raw.getDate() + 1); // Morgen
      }
      anzeige.setHours(8, 0, 0, 0);
      return { anzeigeDatum: anzeige, vorschauTyp: "Morgen" };
    }

    // Automatik-Modus
    const hour = raw.getHours();
    const day = raw.getDay(); // 0: Sun, 1: Mon, ..., 5: Fri, 6: Sat

    if (day === 5 && hour >= vorschauStunde) {
      anzeige.setDate(raw.getDate() + 3);
      anzeige.setHours(8, 0, 0, 0);
      typ = "Montag";
    } else if (day === 6) {
      anzeige.setDate(raw.getDate() + 2);
      anzeige.setHours(8, 0, 0, 0);
      typ = "Montag";
    } else if (day === 0) {
      anzeige.setDate(raw.getDate() + 1);
      anzeige.setHours(8, 0, 0, 0);
      typ = "Montag";
    } else if (hour >= vorschauStunde) {
      anzeige.setDate(raw.getDate() + 1);
      anzeige.setHours(8, 0, 0, 0);
      typ = "Morgen";
    }

    return { anzeigeDatum: anzeige, vorschauTyp: typ };
  }, [currentTime, vorschauStunde, vorschauModus, manualDateOffset]);

  const heute = currentTime;
  const isWeekend = heute.getDay() === 0 || heute.getDay() === 6;
  const scheduleDatum = anzeigeDatum;
  const weekDiff = getKW(scheduleDatum) - getKW(heute);
  const kw = (app?.currentKW || getKW(heute)) + weekDiff;
  const tagName = getTodayName(scheduleDatum);

  const specialEventsForDay = React.useMemo(() => {
    const list: Array<{ type: string; title: string; desc?: string; color: string }> = [];

    // 1. Is it a holiday?
    const hName = isHoliday(
      scheduleDatum,
      app?.calendarSettings?.disabledHolidays || [],
      app?.bundesland || "VBG",
    );
    if (hName) {
      list.push({
        type: "holiday",
        title: `🏝️ Feiertag: ${hName}`,
        desc: "Schulfreier Tag",
        color: "emerald",
      });
    }

    // 2. Is there a birthday today?
    const birthdays = (app?.schueler || []).filter((s) => {
      if (!s.geburtstag) return false;
      const parts = s.geburtstag.split(".");
      let bDate: Date;
      if (parts.length === 3) {
        bDate = new Date(scheduleDatum.getFullYear(), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        bDate = new Date(s.geburtstag);
      }
      return bDate.getMonth() === scheduleDatum.getMonth() && bDate.getDate() === scheduleDatum.getDate();
    });

    birthdays.forEach((s) => {
      list.push({
        type: "birthday",
        title: `🎂 Geburtstag: ${s.vorname} ${s.nachname}`,
        desc: "Alles Gute zum Geburtstag! 🎉",
        color: "amber",
      });
    });

    // 3. Are there any Wochenplanung events for today?
    const dayPlan = app?.wochenplanung?.[kw]?.[tagName] || {};
    Object.values(dayPlan).forEach((cell: any) => {
      const isEvent = cell?.type && ["test", "schularbeit", "sa", "lzk", "ausflug", "event", "spielefest", "konferenz", "gespraech", "sonstiges"].includes(cell.type);
      const hasKeyword = cell?.thema && (
        cell.thema.toLowerCase().includes("test") ||
        cell.thema.toLowerCase().includes("schularbeit") ||
        cell.thema.toLowerCase().includes("sa") ||
        cell.thema.toLowerCase().includes("spielefest") ||
        cell.thema.toLowerCase().includes("konferenz") ||
        cell.thema.toLowerCase().includes("gespräch") ||
        cell.thema.toLowerCase().includes("gespräche") ||
        cell.thema.toLowerCase().includes("ausflug")
      );
      if (isEvent || hasKeyword) {
        let cellType = cell.type;
        if (!cellType && cell.thema) {
          const lowerThema = cell.thema.toLowerCase();
          if (lowerThema.includes("spielefest")) cellType = "spielefest";
          else if (lowerThema.includes("konferenz")) cellType = "konferenz";
          else if (lowerThema.includes("gespr")) cellType = "gespraech";
          else if (lowerThema.includes("ausflug")) cellType = "ausflug";
          else if (lowerThema.includes("sa") || lowerThema.includes("schularbeit")) cellType = "sa";
          else cellType = "test";
        }
        const typeLabels: Record<string, string> = {
          spielefest: "Spielefest 🎈",
          konferenz: "Konferenz 👥",
          gespraech: "Gespräch 💬",
          event: "Event 🌟",
          ausflug: "Ausflug 🚌",
          test: "Test 📝",
          schularbeit: "SA 📑",
          sa: "SA 📑",
          lzk: "LZK ⭐",
          sonstiges: "Termin 📌",
        };
        list.push({
          type: "wochenplan",
          title: `${cellType === "konferenz" ? "👥" : cellType === "ausflug" ? "🚌" : "📌"} ${cell.thema || typeLabels[cellType || ""] || "Aktivität"}`,
          desc: `Fach: ${cell.fach || "Allgemein"}`,
          color: cellType === "konferenz" ? "blue" : cellType === "ausflug" ? "sky" : "orange",
        });
      }
    });

    // 4. Are there any Jahresplanung events for this week?
    const weekPlan = app?.jahresplanung?.[kw] || {};
    Object.entries(weekPlan).forEach(([subId, data]: [string, any]) => {
      const isEvent = ["test", "schularbeit", "sa", "lzk", "ausflug", "event", "spielefest", "konferenz", "gespraech", "sonstiges"].includes(data?.type);
      if (isEvent) {
        const typeLabels: Record<string, string> = {
          spielefest: "Spielefest 🎈",
          konferenz: "Konferenz 👥",
          gespraech: "Gespräch 💬",
          event: "Event 🌟",
          ausflug: "Ausflug 🚌",
          test: "Test/WH 📝",
          schularbeit: "SA 📑",
          sa: "SA 📑",
          lzk: "LZK ⭐",
          sonstiges: "Termin 📌",
        };
        list.push({
          type: "jahresplan",
          title: `${data.type === "konferenz" ? "👥" : data.type === "ausflug" ? "🚌" : "📌"} ${data.thema || typeLabels[data.type] || "Aktivität"}`,
          desc: `Diese Woche (Jahresplan, Fach: ${subId})`,
          color: data.type === "konferenz" ? "blue" : data.type === "ausflug" ? "sky" : "orange",
        });
      }
    });

    // 5. Are there any customEvents on this day?
    const fmt = `${String(scheduleDatum.getDate()).padStart(2, '0')}.${String(scheduleDatum.getMonth() + 1).padStart(2, '0')}.${scheduleDatum.getFullYear()}`;
    const fmtShort = `${String(scheduleDatum.getDate()).padStart(2, '0')}.${String(scheduleDatum.getMonth() + 1).padStart(2, '0')}.`;
    (dashboardSettings.customEvents || []).forEach((ev: any) => {
      if (ev.date === fmt || ev.date === fmtShort || ev.date === formatLocalDateKey(scheduleDatum)) {
        list.push({
          type: "custom",
          title: `📌 ${ev.name}`,
          desc: "Eigener Termin",
          color: "violet",
        });
      }
    });

    return list;
  }, [
    scheduleDatum,
    app?.schueler,
    app?.wochenplanung,
    app?.jahresplanung,
    app?.bundesland,
    app?.calendarSettings?.disabledHolidays,
    kw,
    tagName,
    dashboardSettings.customEvents,
  ]);

  const getLessonProgress = (idx: number) => {
    if (idx < 0) return 0;
    const now = heute.getHours() * 60 + heute.getMinutes();
    const zeiten = [
      { start: 480, end: 530 }, // 1: 08:00 - 08:50
      { start: 530, end: 585 }, // 2: 08:50 - 09:45
      { start: 600, end: 650 }, // 3: 10:00 - 10:50
      { start: 650, end: 705 }, // 4: 10:50 - 11:45
      { start: 705, end: 750 }, // 5: 11:45 - 12:30
      { start: 810, end: 860 }, // 6: 13:30 - 14:20
      { start: 860, end: 910 }, // 7: 14:20 - 15:10
      { start: 910, end: 960 }, // 8: 15:10 - 16:00
    ];
    const unit = zeiten[idx];
    if (!unit) return 0;
    const total = unit.end - unit.start;
    const elapsed = now - unit.start;
    return Math.max(0, Math.min(100, (elapsed / total) * 100));
  };

  const getWeatherIcon = (code: number, size = 24) => {
    if (code === 0) return <Sun size={size} className="text-amber-400" />;
    if (code <= 3) return <Cloud size={size} className="text-slate-400" />;
    if (code <= 48)
      return <Cloud size={size} className="text-slate-300 opacity-50" />;
    if (code <= 67) return <CloudRain size={size} className="text-blue-400" />;
    if (code <= 77)
      return <CloudSnow size={size} className="text-indigo-200" />;
    if (code <= 82) return <CloudRain size={size} className="text-blue-500" />;
    if (code <= 86)
      return <CloudSnow size={size} className="text-indigo-300" />;
    return <CloudLightning size={size} className="text-purple-400" />;
  };

  const getGreeting = () => {
    const h = currentTime.getHours();
    const teil = h < 11 ? "Guten Morgen" : h < 16 ? "Hallo" : "Guten Abend";
    const firstName = getTeacherFirstName(app);
    return firstName ? `${teil}, ${firstName}!` : `${teil}!`;
  };

  const birthdaysToday = (app?.schueler || []).filter((s) =>
    computeIsBirthdayDisplay(s.geburtstag, heute),
  );

  useEffect(() => {
    if (birthdaysToday.length > 0) {
      const todayStr = new Date().toISOString().split("T")[0];
      const hasShownToast = localStorage.getItem(`bday_toast_${todayStr}`);
      if (!hasShownToast) {
        setTimeout(() => {
          birthdaysToday.forEach((s) => {
            showToast(`🎂 Heute hat ${s.vorname} Geburtstag!`, "success");
          });
          localStorage.setItem(`bday_toast_${todayStr}`, "true");
        }, 1000);
      }
    }

    if (showBdayModal && birthdaysToday.length > 0) {
      const t = setTimeout(() => {
        handleBirthdayCelebrateOnDashboard(
          birthdaysToday.map((s) => s.vorname).join(", "),
        );
      }, 700);
      return () => clearTimeout(t);
    }
  }, [showBdayModal, birthdaysToday.length]);

  const getTodayLessonInfo = () => {
    if (vorschauTyp) {
      return null;
    }

    const holiday = isHoliday(
      heute,
      app?.calendarSettings?.disabledHolidays || [],
      app?.bundesland || "VBG",
    );

    if (holiday)
      return (
        <span className="text-stone-400 text-[0.875rem] leading-snug">
          Heute ist {holiday} (frei)
        </span>
      );

    const isWeekend = heute.getDay() === 0 || heute.getDay() === 6;
    if (isWeekend)
      return (
        <span className="text-stone-400 text-[0.875rem] leading-snug">
          Heute kein regulärer Unterricht
        </span>
      );
    const tagStunden = app?.stammplan?.[tagName] || {};
    const stundenIds = Object.keys(tagStunden)
      .filter((k) => !!tagStunden[parseInt(k)])
      .map(Number);
    const count = stundenIds.length;
    if (count === 0)
      return (
        <span className="text-stone-400 text-[0.875rem] leading-snug">
          Heute keine Stunden eingetragen
        </span>
      );
    const firstId = Math.min(...stundenIds);
    const startTime = (app.stundenZeiten || STUNDEN_INFO)[firstId]?.split("–")[0] || "";
    return (
      <span className="text-stone-400 text-[0.875rem] leading-snug">
        Du hast heute {count} Stunden Unterricht, erste Stunde beginnt um{" "}
        {startTime}
      </span>
    );
  };

  const birthdaysThisWeek = (app?.schueler || []).filter((s) => {
    if (!s.geburtstag) return false;
    let bday: Date;
    const parts = s.geburtstag.split(".");
    if (parts.length === 3) {
      bday = new Date(
        heute.getFullYear(),
        parseInt(parts[1]) - 1,
        parseInt(parts[0]),
      );
    } else {
      bday = new Date(s.geburtstag);
    }
    const day = bday.getDate();
    const month = bday.getMonth();

    const startOfWeek = new Date(heute);
    startOfWeek.setDate(
      heute.getDate() - (heute.getDay() === 0 ? 6 : heute.getDay() - 1),
    );
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const checkDate = new Date(heute.getFullYear(), month, day);

    return checkDate >= startOfWeek && checkDate <= endOfWeek;
  });

  const getSchoolDaysRemaining = (start: Date, end: Date) => {
    let count = 0;
    let current = new Date(start);
    while (current < end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) count++;
      current.setDate(current.getDate() + 1);
    }
    return count;
  };

  const startYear = getStartYear(app?.schuljahr);
  const schoolYearStart = kwToMonday(
    getSchulstartKW(app?.schuljahr, app?.bundesland),
    startYear,
  );
  const summerStart = (() => {
    const ferien = getFerien(app?.bundesland || 'VBG', app?.schuljahr || '2025/26');
    const sommer = ferien.find(f => f.id.startsWith('sommer_'));
    if (sommer && sommer.startMonth !== undefined && sommer.startDay !== undefined) {
      return new Date(sommer.year || (startYear + 1), sommer.startMonth, sommer.startDay);
    }
    return new Date(startYear + 1, 6, (app?.bundesland === 'W' || app?.bundesland === 'NOE' || app?.bundesland === 'BGL') ? 4 : 11);
  })();
  const schoolDaysTotal = getSchoolDaysRemaining(schoolYearStart, summerStart);
  const schoolDaysRemaining = getSchoolDaysRemaining(heute, summerStart);

  const [quickObservation, setQuickObservation] = useState("");
  const handleSaveObservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickObservation.trim()) return;
    setApp((prev) => ({
      ...prev,
      notizen: [
        ...(prev?.notizen || []),
        {
          id: Date.now().toString(),
          titel: "Beobachtung",
          inhalt: quickObservation,
          icon: "📝",
          timestamp: Date.now(),
        },
      ],
    }));
    setQuickObservation("");
  };

  const getCurrentHour = () => {
    const now = heute.getHours() * 60 + heute.getMinutes();
    const timesMap = app.stundenZeiten || STUNDEN_INFO;
    
    const parsedZeiten: { start: number; end: number; id: number }[] = [];
    for (let id = 1; id <= MAX_LESSON_SLOTS; id++) {
      const zStr = timesMap[id];
      if (zStr) {
        const parts = zStr.split(/[–-]/).map(p => p.trim());
        if (parts.length === 2) {
          const [startStr, endStr] = parts;
          const [startH, startM] = startStr.split(':').map(Number);
          const [endH, endM] = endStr.split(':').map(Number);
          if (!isNaN(startH) && !isNaN(startM) && !isNaN(endH) && !isNaN(endM)) {
            parsedZeiten.push({
              start: startH * 60 + startM,
              end: endH * 60 + endM,
              id
            });
          }
        }
      }
    }

    if (parsedZeiten.length === 0) {
      const fallbackZeiten = [
        { start: 480, end: 530, id: 1 },
        { start: 530, end: 585, id: 2 },
        { start: 600, end: 650, id: 3 },
        { start: 650, end: 705, id: 4 },
        { start: 705, end: 750, id: 5 },
        { start: 810, end: 860, id: 6 },
        { start: 860, end: 910, id: 7 },
        { start: 910, end: 960, id: 8 },
      ];
      parsedZeiten.push(...fallbackZeiten);
    }

    const currentIdx = parsedZeiten.findIndex((z) => now >= z.start && now <= z.end);
    const nextIdx = parsedZeiten.findIndex((z) => now < z.start);
    
    const tagName = getTodayName(heute);
    const tagPlan = tagName ? (app?.wochenplanung?.[kw]?.[tagName] || {}) : {};
    const stammItems = app?.stammplan?.[tagName] || {};
    
    let lastRealHourId = -1;
    for (let id = 1; id <= MAX_LESSON_SLOTS; id++) {
      const displayFach = tagPlan[id - 1]?.fach || stammItems[id] || "";
      if (displayFach) {
        lastRealHourId = id;
      }
    }

    let isDayOver = false;
    if (lastRealHourId !== -1) {
      const lastSlot = parsedZeiten.find(z => z.id === lastRealHourId);
      if (lastSlot) {
        isDayOver = now > lastSlot.end;
      } else {
        const lastSlotFallback = parsedZeiten[parsedZeiten.length - 1];
        if (lastSlotFallback) {
          isDayOver = now > lastSlotFallback.end;
        }
      }
    } else {
      isDayOver = true;
    }

    return { currentIdx, nextIdx, isDayOver, zeiten: parsedZeiten };
  };

  const { currentIdx, nextIdx, isDayOver, zeiten } = getCurrentHour();
  const displayHourIdx =
    currentIdx !== -1 ? currentIdx : nextIdx !== -1 ? nextIdx : -1;
  const isCurrent = currentIdx !== -1;

  const getHourData = (idx: number) => {
    if (idx === -1 || !tagName) return null;
    const daysDe = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];
    const dayIdx = daysDe.indexOf(tagName);
    const tagPlan = tagName ? (app?.wochenplanung?.[kw]?.[tagName] || {}) : {};
    const stammFach = app?.stammplan?.[tagName]?.[idx + 1] || "";
    return {
      fach: tagPlan[idx]?.fach || stammFach,
      zeit: (app.stundenZeiten || STUNDEN_INFO)[idx + 1],
    };
  };

  const nextHourData = getHourData(displayHourIdx);
  const currentHourData = getHourData(currentIdx);
  const upcomingHourData = getHourData(nextIdx);

  const dateStr = heute.toDateString();
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  const [manualFocusOffset, setManualFocusOffset] = useState(0);
  const studentList = app?.schueler || [];
  const focusIndex = Math.abs(hash) % (studentList.length || 1);
  const focusStudent = studentList.length > 0 ? studentList[(focusIndex + manualFocusOffset) % studentList.length] : null;

  const handleNextFocusStudent = () => {
    setManualFocusOffset((prev) => prev + 1);
  };

  const todos = app?.dashboardTodos || [];

  const [newTodoText, setNewTodoText] = useState("");
  const [newMorningTaskText, setNewMorningTaskText] = useState("");
  const [newDenkzettelText, setNewDenkzettelText] = useState("");

  const addDenkzettelNote = (e: React.FormEvent) => {
    e.preventDefault();
    const text = newDenkzettelText.trim();
    if (!text) return;
    const newNote = {
      id: `note-${Date.now()}`,
      text,
      color: "yellow" as const,
      completed: false,
      category: "allgemein" as const,
      createdAt: Date.now(),
    };
    setApp((prev) => ({
      ...prev,
      denkzettelNotes: [newNote, ...(prev.denkzettelNotes || [])],
    }));

    // Auto sync if it is a Termin (has parsed date)
    const parsedDate = inferDateFromText(text, app.schuljahr || "");
    if (parsedDate) {
      syncNoteToPlanning(text, setApp, app.schuljahr || "");
    }

    setNewDenkzettelText("");
  };

  const toggleDenkzettelNote = (id: string) => {
    setApp((prev) => ({
      ...prev,
      denkzettelNotes: (prev.denkzettelNotes || []).map((n) =>
        n.id === id ? { ...n, completed: !n.completed } : n,
      ),
    }));
  };

  const deleteDenkzettelNote = (id: string) => {
    setApp((prev) => ({
      ...prev,
      denkzettelNotes: (prev.denkzettelNotes || []).filter((n) => n.id !== id),
    }));
  };

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    const text = newTodoText.trim();
    if (!text) return;
    setApp((prev) => ({
      ...prev,
      dashboardTodos: [
        ...(prev.dashboardTodos || []),
        { id: Date.now().toString(), text, done: false },
      ],
    }));
    setNewTodoText("");
  };

  const toggleTodo = (id: string) => {
    setApp((prev) => ({
      ...prev,
      dashboardTodos: (prev.dashboardTodos || []).map((t) =>
        t.id === id ? { ...t, done: !t.done } : t,
      ),
    }));
  };

  const deleteTodo = (id: string) => {
    setApp((prev) => ({
      ...prev,
      dashboardTodos: (prev.dashboardTodos || []).filter((t) => t.id !== id),
    }));
  };

  const addMorningTask = (e: React.FormEvent) => {
    e.preventDefault();
    const text = newMorningTaskText.trim();
    if (!text) return;
    const newTask = {
      id: Date.now().toString(),
      text,
      completed: false,
    };
    setApp((prev) => ({
      ...prev,
      morgenAufgaben: [...(prev.morgenAufgaben || []), newTask],
    }));
    setNewMorningTaskText("");
  };

  const toggleMorningTask = (id: string) => {
    setApp((prev) => ({
      ...prev,
      morgenAufgaben: (prev.morgenAufgaben || []).map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t,
      ),
    }));
  };

  const kwNow = React.useMemo(() => app?.currentKW || getKW(heute), [heute, app?.currentKW]);

  const deleteMorningTask = (id: string) => {
    setApp((prev) => ({
      ...prev,
      morgenAufgaben: (prev.morgenAufgaben || []).filter(
        (t: any) => t.id !== id,
      ),
    }));
  };

  const resetMorningTasks = () => {
    setApp((prev) => ({
      ...prev,
      morgenAufgaben: (prev.morgenAufgaben || []).map((t) => ({
        ...t,
        completed: false,
      })),
    }));
  };

  const clearMorningTasks = () => {
    if (confirm("Alle Morgenaufgaben wirklich löschen?")) {
      setApp((prev) => ({ ...prev, morgenAufgaben: [] }));
    }
  };

  const displayedDateKey = formatLocalDateKey(scheduleDatum);
  const displayedDayName = getTodayName(scheduleDatum);
  const displayedActiveHours: number[] = displayedDayName
    ? (app?.tageplan?.[displayedDayName]?.stunden || [])
    : [];
  const displayedHolidayName = isHoliday(
    scheduleDatum,
    app?.calendarSettings?.disabledHolidays || [],
    app?.bundesland || "VBG",
  );
  const displayedCalendarOverride = app?.calendarOverrides?.[displayedDateKey] as 'school' | 'free' | undefined;
  const attendanceRequiredToday = isAttendanceRequiredForDay({
    studentCount: (app?.schueler || []).length,
    activeHours: displayedActiveHours,
    isWeekend: scheduleDatum.getDay() === 0 || scheduleDatum.getDay() === 6,
    holidayName: displayedHolidayName,
    calendarOverride: displayedCalendarOverride,
  });

  const missingToday = React.useMemo(() => {
    return (app?.schueler || []).filter((s) => {
      const dayRecord = app?.anwesenheit?.[s.id]?.[displayedDateKey] || {};
      return Object.values(dayRecord).some(
        (status) => status === "f" || status === "e" || status === "u",
      );
    });
  }, [app?.anwesenheit, app?.schueler, displayedDateKey]);

  const attendanceRecordedToday = React.useMemo(() => {
    if (!attendanceRequiredToday) return false;
    return isAttendanceCompleteForDay(
      app?.schueler || [],
      app?.anwesenheit,
      displayedDateKey,
      displayedActiveHours,
    );
  }, [
    app?.anwesenheit,
    app?.schueler,
    attendanceRequiredToday,
    displayedDateKey,
    displayedActiveHours,
  ]);

  const [simpleDashboardMode, setSimpleDashboardMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("dashboard_simple_mode");
    return saved !== null ? saved === "true" : true;
  });

  useEffect(() => {
    localStorage.setItem("dashboard_simple_mode", simpleDashboardMode.toString());
  }, [simpleDashboardMode]);

  const todayLessonsList = React.useMemo(() => {
    const list: any[] = [];
    const tagPlan = tagName ? (app?.wochenplanung?.[kw]?.[tagName] || {}) : {};
    const stammItems = app?.stammplan?.[tagName] || {};
    for (let id = 1; id <= MAX_LESSON_SLOTS; id++) {
      const fach = tagPlan[id - 1]?.fach || stammItems[id] || "";
      if (fach) {
        list.push({
          id,
          hourNum: id,
          fach,
          zeit: (app.stundenZeiten || STUNDEN_INFO)[id] || "",
          thema: tagPlan[id - 1]?.thema || "",
          isCurrent: currentIdx === (id - 1),
        });
      }
    }
    return list;
  }, [app?.wochenplanung, app?.stammplan, kw, tagName, currentIdx, app?.stundenZeiten]);

  const openTasksCount = React.useMemo(() => {
    const denkzettel = (app?.denkzettelNotes || []).filter((n: any) => !n.completed).length;
    const todosCount = (app?.dashboardTodos || []).filter((t: any) => !t.done).length;
    return denkzettel + todosCount;
  }, [app?.denkzettelNotes, app?.dashboardTodos]);

  const openCollectionsCount = React.useMemo(() => {
    return (app?.klassenkasse?.sammlungen || []).filter((g: any) => !g.abgeschlossen).length;
  }, [app?.klassenkasse?.sammlungen]);

  const heuteWichtigItems = React.useMemo(() => {
    const items: any[] = [];
    birthdaysToday.forEach((s: any) => {
      items.push({
        id: `bday-${s.id}`,
        type: "birthday",
        text: `🎂 Geburtstag: ${s.vorname} ${s.nachname}`,
        category: "Geburtstag",
        linkPage: "schueler",
        urgent: true,
      });
    });
    specialEventsForDay.forEach((e: any, idx: number) => {
      items.push({
        id: `event-${idx}`,
        type: e.type,
        text: e.title,
        category: e.desc || "Termin",
        linkPage: "wochenplanung",
        urgent: true,
      });
    });
    (app?.klassenkasse?.sammlungen || []).filter((g: any) => !g.abgeschlossen).slice(0, 2).forEach((g: any) => {
      items.push({
        id: `geld-${g.id}`,
        type: "money",
        text: `💶 Geldsammlung: ${g.titel}`,
        category: "Finanzen",
        linkPage: "orga",
        urgent: false,
      });
    });
    (app?.denkzettelNotes || []).filter((n: any) => !n.completed).slice(0, 3).forEach((n: any) => {
      items.push({
        id: n.id,
        type: "task",
        text: `📌 ${n.text}`,
        category: "Aufgabe",
        linkPage: "orga",
        urgent: false,
      });
    });
    return items;
  }, [birthdaysToday, specialEventsForDay, app?.klassenkasse?.sammlungen, app?.denkzettelNotes]);

  const tomorrowEventsList = React.useMemo(() => {
    const tomorrow = new Date(scheduleDatum);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const list: Array<{ title: string; subtitle?: string; type: string }> = [];
    const hName = isHoliday(tomorrow, [], 'VBG');
    if (hName) {
      list.push({ title: `🏝️ Feiertag: ${hName}`, subtitle: "Schulfreier Tag", type: "Feiertag" });
    }
    const kwTomorrow = getKW(tomorrow);
    const tagNameTomorrow = getTodayName(tomorrow);
    const dayPlan = app?.wochenplanung?.[kwTomorrow]?.[tagNameTomorrow] || {};
    Object.values(dayPlan).forEach((cell: any) => {
      if (cell?.thema) {
        list.push({ title: `${cell.fach || "Unterricht"}: ${cell.thema}`, type: "Wochenplan" });
      }
    });
    return list;
  }, [scheduleDatum, app?.wochenplanung]);

  const weekEventsList = React.useMemo(() => {
    const list: Array<{ title: string; subtitle?: string; dayLabel?: string; type: string }> = [];
    const days = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];
    days.forEach((day) => {
      const dayPlan = app?.wochenplanung?.[kw]?.[day] || {};
      Object.values(dayPlan).forEach((cell: any) => {
        if (cell?.thema && (cell.thema.toLowerCase().includes("test") || cell.thema.toLowerCase().includes("ausflug") || cell.thema.toLowerCase().includes("sa"))) {
          list.push({ dayLabel: day, title: `${cell.fach || "Fach"}: ${cell.thema}`, type: "Termin" });
        }
      });
    });
    return list;
  }, [app?.wochenplanung, kw]);

  const monthEventsList = React.useMemo(() => {
    const list: Array<{ title: string; subtitle?: string; dateLabel?: string; type: string }> = [];
    (dashboardSettings.customEvents || []).slice(0, 5).forEach((ev: any) => {
      list.push({ dateLabel: ev.date, title: ev.name, type: "Event" });
    });
    return list;
  }, [dashboardSettings.customEvents]);

  const statCards = React.useMemo(() => {
    return [
      {
        label: "Schüler/innen",
        val: (app?.schueler || []).length,
        sub: "Gesamtansahl",
        icon: <Users size={16} className="text-sky-400" />,
      },
      {
        label: "Fehlend heute",
        val: missingToday.length,
        sub:
          missingToday.length > 0
            ? missingToday.map((s) => s?.vorname).join(", ")
            : "Vollzählig",
        icon: <UserMinus size={16} className="text-rose-400" />,
      },
    ];
  }, [app?.schueler, missingToday]);

  const birthdayMonth = React.useMemo(() => {
    return (app?.schueler || []).filter((s) => {
      if (!s.geburtstag) return false;
      let bday: Date;
      const parts = s.geburtstag.split(".");
      if (parts.length === 3) {
        bday = new Date(
          heute.getFullYear(),
          parseInt(parts[1]) - 1,
          parseInt(parts[0]),
        );
      } else {
        bday = new Date(s.geburtstag);
      }
      const day = bday.getDate();
      const month = bday.getMonth();

      const endOf7Days = new Date(heute);
      endOf7Days.setDate(heute.getDate() + 7);

      const checkDate = new Date(heute.getFullYear(), month, day);

      return month === heute.getMonth() && checkDate > endOf7Days;
    });
  }, [app?.schueler]);

  const radarEvents = React.useMemo(() => {
    const events: any[] = [];

    // 1. ACTIVE FOCUS STUDENT (TODAY)
    if (focusStudent) {
      events.push({
        label: "FOKUS",
        text: `${focusStudent.vorname} ${focusStudent.nachname}`,
        sub:
          focusStudent.foerderprofil?.foerderbedarfBereiche &&
          focusStudent.foerderprofil.foerderbedarfBereiche.length > 0
            ? `Förderung: ${focusStudent.foerderprofil.foerderbedarfBereiche.slice(0, 2).join(", ")}`
            : "Besonders auf Stärken & Mitarbeit achten",
        color: "sky",
        source: "fokus",
        student: focusStudent,
      });
    }

    // 2. BIRTHDAYS
    const upcomingBdays = (app?.schueler || [])
      .filter((s) => s.geburtstag)
      .map((s) => {
        const bday = new Date(s.geburtstag!);
        const today = new Date(heute);
        const thisYearBday = new Date(
          today.getFullYear(),
          bday.getMonth(),
          bday.getDate(),
        );
        if (thisYearBday < today)
          thisYearBday.setFullYear(today.getFullYear() + 1);
        const diff = Math.ceil(
          (thisYearBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );
        const age = thisYearBday.getFullYear() - bday.getFullYear();
        return { student: s, diff, age };
      })
      .sort((a, b) => a.diff - b.diff);

    if (upcomingBdays.length > 0 && upcomingBdays[0].diff <= 14) {
      const next = upcomingBdays[0];
      events.push({
        label:
          next.diff === 0
            ? "HEUTE"
            : next.diff === 1
              ? "MORGEN"
              : `in ${next.diff} Tg.`,
        text: `Geburtstag: ${next.student.vorname} ${next.student.nachname}`,
        sub: `Wird ${next.age} Jahre alt`,
        color: "purple",
        source: "geburtstag",
        student: next.student,
        age: next.age,
        diff: next.diff,
      });
    }

    // 2b. HOLIDAYS (Feiertage)
    for (let d = 0; d <= 14; d++) {
      const testDate = new Date(heute);
      testDate.setDate(heute.getDate() + d);
      const hName = isHoliday(testDate, [], 'VBG');
      if (hName) {
        const exists = events.some(
          (e) => e.source === "holiday" && e.text === `Feiertag: ${hName}`
        );
        if (!exists) {
          events.push({
            label: d === 0 ? "HEUTE" : d === 1 ? "MORGEN" : `in ${d} Tg.`,
            text: `Feiertag: ${hName}`,
            sub: "Schulfreier Tag",
            color: "emerald",
            source: "holiday",
            diff: d,
          });
        }
      }
    }

    // 3. JAHRESPLANUNG & WOCHENPLANUNG EVENTS (Termine)
    const kwNext = kwNow + 1;
    [kwNow, kwNext].forEach((kwValue, idx) => {
      // From Jahresplanung
      const weekPlan = app?.jahresplanung?.[kwValue] || {};
      Object.entries(weekPlan).forEach(([subId, data]: [string, any]) => {
        const isEvent = [
          "test",
          "schularbeit",
          "sa",
          "lzk",
          "ausflug",
          "event",
          "spielefest",
          "konferenz",
          "gespraech",
          "sonstiges",
        ].includes(data?.type);
        if (isEvent) {
          const typeNames: Record<string, string> = {
            spielefest: "Spielefest 🎈",
            konferenz: "Konferenz 👥",
            gespraech: "Gespräch 💬",
            event: "Event 🌟",
            ausflug: "Ausflug 🚌",
            test: "Test/WH 📝",
            schularbeit: "SA 📑",
            sa: "SA 📑",
            lzk: "LZK ⭐",
            sonstiges: "Termin 📌",
          };
          const textLabel = typeNames[data.type] || "Aktivität";
          events.push({
            label: idx === 0 ? "DIESE WOCHE" : "NÄ. WOCHE",
            text: data.thema || textLabel,
            sub: `${textLabel} (Jahresplan, Fach: ${subId})`,
            color:
              data.type === "spielefest"
                ? "fuchsia"
                : data.type === "konferenz"
                  ? "blue"
                  : data.type === "gespraech"
                    ? "violet"
                    : data.type === "event" || data.type === "ausflug"
                      ? "sky"
                      : data.type === "sonstiges"
                        ? "rose"
                        : "orange",
            source: "jahresplanung",
            kw: kwValue,
            subjectId: subId,
            type: data.type,
            typeName: textLabel,
          });
        }
      });

      // From Wochenplanung
      const wPlan = app?.wochenplanung?.[kwValue] || {};
      Object.entries(wPlan).forEach(([dayName, dayPlan]: [string, any]) => {
        Object.values(dayPlan || {}).forEach((cell: any) => {
          const isEvent =
            cell?.type &&
            [
              "test",
              "schularbeit",
              "sa",
              "lzk",
              "ausflug",
              "event",
              "spielefest",
              "konferenz",
              "gespraech",
              "sonstiges",
            ].includes(cell.type);
          const hasKeyword =
            cell?.thema &&
            (cell.thema.toLowerCase().includes("test") ||
              cell.thema.toLowerCase().includes("schularbeit") ||
              cell.thema.toLowerCase().includes("sa") ||
              cell.thema.toLowerCase().includes("spielefest") ||
              cell.thema.toLowerCase().includes("konferenz") ||
              cell.thema.toLowerCase().includes("gespräch") ||
              cell.thema.toLowerCase().includes("gespräche"));

          if (isEvent || hasKeyword) {
            let cellType = cell.type;
            if (!cellType && cell.thema) {
              const lowerThema = cell.thema.toLowerCase();
              if (lowerThema.includes("spielefest")) cellType = "spielefest";
              else if (lowerThema.includes("konferenz")) cellType = "konferenz";
              else if (lowerThema.includes("gespr")) cellType = "gespraech";
              else if (
                lowerThema.includes("sa") ||
                lowerThema.includes("schularbeit")
              )
                cellType = "sa";
              else cellType = "test";
            }

            const typeNames: Record<string, string> = {
              spielefest: "Spielefest 🎈",
              konferenz: "Konferenz 👥",
              gespraech: "Gespräch 💬",
              event: "Event 🌟",
              ausflug: "Ausflug 🚌",
              test: "Test 📝",
              schularbeit: "SA 📑",
              sa: "SA 📑",
              lzk: "LZK ⭐",
              sonstiges: "Termin 📌",
            };
            const textLabel = typeNames[cellType || ""] || "Aktivität";

            const alreadyAdded = events.some((e) => e.text === cell.thema);
            if (!alreadyAdded) {
              events.push({
                label: idx === 0 ? "DIESE WOCHE" : "NÄ. WOCHE",
                text: cell.thema,
                sub: `${textLabel} (${dayName}, ${cell.fach || "Wochenplan"})`,
                color:
                  cellType === "spielefest"
                    ? "fuchsia"
                    : cellType === "konferenz"
                      ? "blue"
                      : cellType === "gespraech"
                        ? "violet"
                        : cellType === "event" || cellType === "ausflug"
                          ? "sky"
                          : cellType === "sonstiges"
                            ? "rose"
                            : "orange",
                source: "wochenplanung",
                kw: kwValue,
                dayName,
                cellFach: cell.fach,
                type: cellType,
                typeName: textLabel,
              });
            }
          }
        });
      });
    });

    // 3b. GRADEBOOK EXAMS (colDates)
    if (app.notenMeta) {
      Object.keys(app.notenMeta).forEach((fachId) => {
        const fachMeta = app.notenMeta[fachId];
        if (fachMeta?.colDates) {
          Object.keys(fachMeta.colDates).forEach((typ) => {
            Object.keys(fachMeta.colDates[typ]).forEach((idxStr) => {
              const dateStr = fachMeta.colDates[typ][idxStr];
              if (dateStr) {
                const targetDate = new Date(dateStr);
                targetDate.setHours(0, 0, 0, 0);
                const today = new Date(heute);
                today.setHours(0, 0, 0, 0);
                const diffTime = targetDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays >= 0 && diffDays <= 14) {
                  const labelMap: Record<string, string> = {
                    sa: "Schularbeit",
                    lzk: "LZK",
                    wp: "Wochenplan",
                    obj: "Abgabe"
                  };
                  const colorMap: Record<string, string> = {
                    sa: "rose",
                    lzk: "orange",
                    wp: "sky",
                    obj: "indigo"
                  };
                  
                  let label = diffDays === 0 ? "HEUTE" : diffDays === 1 ? "MORGEN" : diffDays <= 7 ? "DIESE WOCHE" : "NÄ. WOCHE";
                  const customLabel = fachMeta.colLabels?.[typ]?.[idxStr] || `${labelMap[typ] || typ} ${parseInt(idxStr)+1}`;
                  
                  events.push({
                    label,
                    text: customLabel,
                    sub: `${fachId}`,
                    color: colorMap[typ] || "slate",
                    source: "gradebook",
                  });
                }
              }
            });
          });
        }
      });
    }

    // 4. IMPORTANT OR TERMIN DENKZETTEL NOTES
    (app?.denkzettelNotes || [])
      .filter((n) => !n.completed)
      .forEach((n) => {
        let isImportant = n.category === "wichtig" || n.category === "termin";
        const parsedDate = inferDateFromText(n.text, app?.schuljahr || "");
        let isWithin2Weeks = false;
        let label = n.category === "termin" ? "TERMIN" : "WICHTIG";
        let sub =
          n.category === "termin"
            ? "Termin im Denkzettel"
            : "Notiz im Denkzettel";
        let color = n.category === "termin" ? "purple" : "rose";

        if (parsedDate) {
          const today = new Date(heute);
          today.setHours(0, 0, 0, 0);
          const targetDate = new Date(parsedDate);
          targetDate.setHours(0, 0, 0, 0);
          const diffTime = targetDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays <= 14) {
            isWithin2Weeks = true;
            label =
              diffDays === 0
                ? "HEUTE"
                : diffDays === 1
                  ? "MORGEN"
                  : `in ${diffDays} Tg.`;
            sub = `Termin am ${parsedDate.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })} (Denkzettel)`;
            color = "purple";
          }
        }

        if (isImportant || isWithin2Weeks) {
          const alreadyInEvents = events.some((e) => e.text === n.text);
          if (!alreadyInEvents) {
            events.push({
              label,
              text: n.text,
              sub,
              color,
              source: "denkzettel",
              note: n,
              parsedDate,
            });
          }
        }
      });

    // 5. SMART TOOLS (Luuise / Spaced Practice)
    if (app?.luuise_active) {
      events.push({
        label: "LUUISE",
        text: "Laufende Abfrage",
        sub: "Feedback-Loop aktiv",
        color: "emerald",
        source: "luuise",
      });
    }

    return events.slice(0, 6);
  }, [
    app?.schueler,
    app?.jahresplanung,
    app?.wochenplanung,
    app?.denkzettelNotes,
    app?.luuise_active,
    heute,
    app?.schuljahr,
    kwNow,
  ]);

  const analyticsData = React.useMemo(() => {
    // 1. Klassendurchschnitt (computed dynamically from all active subjects and students)
    const allEndnotes: number[] = [];
    const activeFaecher =
      app?.faecher && app.faecher.length > 0
                      ? app.faecher.filter(f => app.fachConfig?.[f]?.unterrichtet !== false).filter(f => app.fachConfig?.[f]?.unterrichtet !== false) : FAECHER_ALLE;
    const schoolStudents = app?.schueler || [];

    activeFaecher.forEach((subject) => {
      schoolStudents.forEach((st) => {
        const g = berechne(app, st.id, subject, "1");
        if (g !== null && !isNaN(g) && g > 0) {
          allEndnotes.push(g);
        }
      });
    });

    // 2. Compute dynamic subject averages for visual curve exactly matching Gradebook & Statistics
    const colors = [
      "#f43f5e",
      "#3b82f6",
      "#10b981",
      "#f59e0b",
      "#8b5cf6",
      "#06b6d4",
      "#ec4899",
      "#14b8a6",
      "#64748b",
      "#a855f7",
    ];

    const getSubjectColor = (subjectName: string, index: number) => {
      const lower = subjectName.toLowerCase();
      if (lower.includes("math")) return "#f43f5e"; // Rose
      if (lower.includes("deutsch")) return "#3b82f6"; // Blue
      if (lower.includes("sach")) return "#10b981"; // Emerald
      if (lower.includes("engl")) return "#f59e0b"; // Amber
      if (lower.includes("sport") || lower.includes("bewe")) return "#8b5cf6"; // Violet
      if (lower.includes("rel")) return "#06b6d4"; // Cyan
      if (lower.includes("musik")) return "#ec4899"; // Pink
      if (lower.includes("bild") || lower.includes("kunst")) return "#a855f7"; // Purple
      if (lower.includes("werk")) return "#64748b"; // Slate
      return colors[index % colors.length];
    };

    const getShortSubjectName = (fullName: string) => {
      const lower = fullName.toLowerCase();
      if (lower.includes("math")) return "M";
      if (lower.includes("deutsch")) return "D";
      if (lower.includes("sach")) return "SU";
      if (lower.includes("engl")) return "E";
      if (lower.includes("sport") || lower.includes("bewe")) return "BS";
      if (lower.includes("rel")) return "Rel";
      if (lower.includes("musik")) return "ME";
      if (lower.includes("bild")) return "BE";
      if (lower.includes("werk")) return "WE";
      return fullName.substring(0, Math.min(3, fullName.length)).toUpperCase();
    };

    const subjectWiseData = activeFaecher.map((subject, index) => {
      let classSum = 0;
      let classCount = 0;

      schoolStudents.forEach((st) => {
        const g = berechne(app, st.id, subject, "1");
        if (g !== null && !isNaN(g) && g > 0) {
          classSum += g;
          classCount++;
        }
      });

      const average = classCount > 0 ? classSum / classCount : null;

      return {
        id: `subj-${index}`,
        name: getShortSubjectName(subject),
        fullName: subject,
        // Invert key (6 - Schnitt) so standard 1.0 (Sehr gut) is taller than 5.0 (Nicht genügend)
        heightVal: average !== null ? 6 - average : 0,
        Schnitt: average,
        displaySchnitt: average !== null ? average.toFixed(2) : "—",
        isFallback: average === null,
        color: getSubjectColor(subject, index),
      };
    });

    // Dynamic global academic average (Noten-Ø)
    let avg = "—";
    if (allEndnotes.length > 0) {
      const avgValue =
        allEndnotes.reduce((a, b) => a + b, 0) / allEndnotes.length;
      avg = avgValue.toFixed(1);
    } else {
      const nonFallbackSubjects = subjectWiseData.filter(
        (s) => !s.isFallback && s.Schnitt !== null,
      );
      if (nonFallbackSubjects.length > 0) {
        const avgValue =
          nonFallbackSubjects.reduce(
            (acc, s) => acc + (s.Schnitt as number),
            0,
          ) / nonFallbackSubjects.length;
        avg = avgValue.toFixed(1);
      } else {
        avg = "—";
      }
    }

    // 3. Anwesenheit (Übers Jahr gerechnet)
    const yearlyAttendanceRate = (() => {
      const anwesenheit = app?.anwesenheit || {};
      const totalStudents = (app?.schueler || []).length;
      if (totalStudents === 0) return 100;

      // Find all distinct dates where any attendance action was taken
      const distinctDates = new Set<string>();
      let absentSlots = 0;

      Object.values(anwesenheit).forEach((studentData: any) => {
        if (!studentData) return;
        Object.entries(studentData).forEach(
          ([dateStr, dayData]: [string, any]) => {
            if (!dayData) return;
            let hasEntries = false;
            Object.values(dayData).forEach((status: any) => {
              if (status) {
                hasEntries = true;
                if (status === "e" || status === "u") {
                  absentSlots++;
                }
              }
            });
            if (hasEntries) {
              distinctDates.add(dateStr);
            }
          },
        );
      });

      const D = distinctDates.size;
      if (D === 0) {
        const presentCount = totalStudents - (missingToday || []).length;
        return Math.round((presentCount / totalStudents) * 100);
      }

      // Assume 5 lesson hours per day average
      const totalPossibleSlots = totalStudents * D * 5;
      const rate = Math.round(
        (Math.max(0, totalPossibleSlots - absentSlots) / totalPossibleSlots) *
          100,
      );
      return rate;
    })();
    const attendanceRate = yearlyAttendanceRate;

    // 4. Verhalten (Ganze Klasse)
    const stages = app.behavior_stages || [
      { id: "1", label: "Super", color: "#10b981", icon: "🌟" },
      { id: "2", label: "Gut", color: "#3b82f6", icon: "😊" },
      { id: "3", label: "OK", color: "#94a3b8", icon: "😐" },
      { id: "4", label: "Ermahnung", color: "#f59e0b", icon: "⚠️" },
      { id: "5", label: "Inakzeptabel", color: "#ef4444", icon: "🚫" },
    ];

    const logs = app.statusLog || [];
    const counts: Record<string, number> = {};
    logs.forEach((log: any) => {
      const stageId = log.iconId || "3";
      counts[stageId] = (counts[stageId] || 0) + 1;
    });

    const behaviorPieData = stages
      .map((stage: any) => {
        const count = counts[stage.id] || 0;
        return {
          name: stage.label,
          emoji: stage.icon,
          value: count,
          color: stage.color,
        };
      })
      .filter((item: any) => item.value > 0);

    const hasBehaviorData = behaviorPieData.length > 0;
    const displayBehaviorPieData = hasBehaviorData
      ? behaviorPieData
      : [{ name: "Keine Daten", value: 1, color: "#f1f5f9" }];

    // Social Score Calculation (Weighting behaviors)
    const last30Days = logs.filter((l: any) => {
      const ts =
        typeof l.timestamp === "number"
          ? l.timestamp
          : typeof l.timestamp === "string"
            ? new Date(l.timestamp).getTime()
            : 0;
      return Date.now() - ts < 30 * 24 * 60 * 60 * 1000;
    });

    const socialScore =
      last30Days.length > 0
        ? last30Days.reduce((acc: number, curr: any) => {
            const stage = stages.find((s: any) => s.id === curr.iconId);
            if (!stage) return acc + 50;

            const label = stage.label.toLowerCase();
            const icon = stage.icon;
            if (
              label.includes("super") ||
              label.includes("toll") ||
              icon === "🌟" ||
              icon === "🔥"
            )
              return acc + 100;
            if (
              label.includes("gut") ||
              label.includes("smile") ||
              icon === "😊" ||
              icon === "👍"
            )
              return acc + 80;
            if (
              label.includes("ok") ||
              label.includes("neutral") ||
              icon === "😐" ||
              icon === "👌"
            )
              return acc + 50;
            if (
              label.includes("naja") ||
              label.includes("achtung") ||
              icon === "😟" ||
              icon === "⚠️"
            )
              return acc + 20;
            if (
              label.includes("stopp") ||
              label.includes("schlecht") ||
              icon === "🛑" ||
              icon === "👎"
            )
              return acc + 0;

            return acc + 50;
          }, 0) / last30Days.length
        : 0;

    let socialEmoji = "😐";
    if (socialScore >= 80) socialEmoji = "🌟";
    else if (socialScore >= 60) socialEmoji = "😊";
    else if (socialScore >= 40) socialEmoji = "😐";
    else if (socialScore >= 15) socialEmoji = "😟";
    else if (socialScore > 0) socialEmoji = "🛑";

    // 5. GRADE DISTRIBUTION OF ENDNOTES (KEEP AS SLIGHT TOGGLE / RAW ACCUMULATOR)
    const distribution = [
      { name: "1", count: 0, color: "#0f172a" },
      { name: "2", count: 0, color: "#334155" },
      { name: "3", count: 0, color: "#64748b" },
      { name: "4", count: 0, color: "#94a3b8" },
      { name: "5", count: 0, color: "#cbd5e1" },
    ];
    allEndnotes.forEach((note) => {
      const val = Math.round(note);
      if (val >= 1 && val <= 5) {
        distribution[val - 1].count++;
      }
    });

    const teacherStats = {
      hours: app.lehrerProfil?.schulstundenJaehrlich || 0,
      tests: app.lehrerProfil?.testsManuell || 0,
      outings: app.lehrerProfil?.ausfluegeManuell || 0,
    };

    return {
      avg,
      attendanceRate,
      behaviorPieData: displayBehaviorPieData,
      hasBehaviorData,
      socialScore: socialScore.toFixed(0),
      socialEmoji,
      distribution,
      subjectWiseData,
      teacherStats,
    };
  }, [
    app?.noten,
    app?.mitarbeit,
    app?.mitarbeit_settings,
    app?.settings,
    app?.faecher,
    app?.schueler,
    missingToday,
    app.statusLog,
    app.behavior_stages,
    app.lehrerProfil,
    app?.schuljahr,
    notenUpdateTrigger,
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setDashboardSettings((prev) => {
        const layout = prev.layout || [];
        const oldIndex = layout.indexOf(active.id);
        const newIndex = layout.indexOf(over!.id);
        return {
          ...prev,
          layout: arrayMove(layout, oldIndex, newIndex),
        };
      });
    }
  };

  const handleResizeWidget = (id: string, newSpan: string) => {
    setDashboardSettings((prev) => ({
      ...prev,
      widgetSizes: {
        ...(prev.widgetSizes || {}),
        [id]: newSpan,
      },
    }));
  };

  const subjectAverages = React.useMemo(() => {
    const subjects = [
      "Deutsch",
      "Mathematik",
      "Sachunterricht",
      "Englisch",
      "Lebende Fremdsprache Englisch",
    ];
    const currentYear = app?.schuljahr || "";
    const schueler = app?.schueler || [];
    const resultMap: Record<string, string | null> = {};

    subjects.forEach((subject) => {
      let totals = 0;
      let counts = 0;

      schueler.forEach((s) => {
        const data = app?.noten?.[s.id]?.[currentYear]?.[subject];
        if (!data) return;

        const allGrades = [
          ...(data.sa || []),
          ...(data.lzk || []),
          ...(data.wp || []),
          ...(data.aufgaben || []),
          data.hue,
        ].filter(
          (g): g is number => g !== null && typeof g === "number" && g > 0,
        );

        if (allGrades.length > 0) {
          const sum = allGrades.reduce((a, b) => a + b, 0);
          totals += sum / allGrades.length;
          counts++;
        }
      });

      resultMap[subject] = counts > 0 ? (totals / counts).toFixed(1) : null;
    });

    return resultMap;
  }, [app?.noten, app?.schuljahr, app?.schueler]);

  const getSubjectAverage = React.useCallback(
    (subject: string) => {
      return subjectAverages[subject] || null;
    },
    [subjectAverages],
  );

  const diagnostikStats = React.useMemo(() => {
    const activeStudentIds = new Set((app?.schueler || []).map((s) => s.id));
    const rawErhebungen = (app?.diagnostikErhebungen || []).filter((e) =>
      activeStudentIds.has(e.schuelerId)
    );
    const count = rawErhebungen.length;
    const testIdsCount = new Set(rawErhebungen.map((e) => e.testId)).size;

    const recentIssues = rawErhebungen.filter((e) => {
      const datum = new Date(e.datum);
      const diffDays = (heute.getTime() - datum.getTime()) / (1000 * 3600 * 24);
      return isDiagnosticAlert(e) && diffDays <= 60;
    });

    const studentsWithIssues = Array.from(
      new Set(
        recentIssues.slice(0, 3).map((e) => {
          const s = (app?.schueler || []).find(
            (student) => student.id === e.schuelerId,
          );
          return s ? s.vorname : "Unbekannt";
        }),
      ),
    );

    return {
      count,
      testsCount: testIdsCount,
      studentsWithIssues,
      recentIssuesCount: recentIssues.length,
    };
  }, [app?.diagnostikErhebungen, app?.schueler]);

  const diagnostikErhebungenCount = diagnostikStats.count;
  const diagnostikTestsCount = diagnostikStats.testsCount;
  const studentsWithIssues = diagnostikStats.studentsWithIssues;
  const recentIssuesCount = diagnostikStats.recentIssuesCount;

  const attendanceQuote = React.useMemo(() => {
    const totalStudents = (app?.schueler || []).length;
    return totalStudents > 0
      ? Math.round(
          ((totalStudents - missingToday.length) / totalStudents) * 100,
        )
      : 0;
  }, [app?.schueler, missingToday]);

  const lastActivities = React.useMemo(() => {
    return (app?.activityLog || []).slice(0, 5);
  }, [app?.activityLog]);

  const weekInsights = React.useMemo(() => {
    const rawInsights: {
      id: string;
      type: string;
      text: string;
      color: string;
      icon: any;
    }[] = [];
    const currentKW = app?.currentKW || getKW(heute);
    const startYear = getStartYear(app.schuljahr);
    const kwStart = kwToMonday(currentKW, startYear);
    const kwEnd = new Date(kwStart);
    kwEnd.setDate(kwEnd.getDate() + 5);
    const todayStrFull = formatLocalDateKey(heute);

    const absenceCounts: Record<string, number> = {};
    for (let i = 0; i < 5; i++) {
      const d = new Date(kwStart);
      d.setDate(d.getDate() + i);
      const dateStr = formatLocalDateKey(d);
      (app?.schueler || []).forEach((s) => {
        const lessons = app.anwesenheit?.[s.id]?.[dateStr] || {};
        if (
          Object.values(lessons).some(
            (st) => st === "f" || st === "e" || st === "u",
          )
        ) {
          absenceCounts[s.id] = (absenceCounts[s.id] || 0) + 1;
        }
      });
    }
    Object.entries(absenceCounts).forEach(([sid, count]) => {
      if (count > 2) {
        const s = (app?.schueler || []).find((st) => st.id === sid);
        if (s) {
          const text = `${s.vorname} fehlt bereits ${count} Tage diese Woche.`;
          rawInsights.push({
            id: `absenz_${sid}_${currentKW}`,
            type: "absenz",
            text,
            color: "rose",
            icon: <UserMinus size={14} />,
          });
        }
      }
    });

    (app?.schueler || []).forEach((s) => {
      const Ziele = s.foerderprofil?.foerderziele || [];
      Ziele.forEach((z) => {
        if (
          z.status !== "erreicht" &&
          z.status !== "verworfen" &&
          z.zielDatum
        ) {
          const zDate = new Date(z.zielDatum);
          if (zDate < heute) {
            rawInsights.push({
              id: `ziel_${z.id || z.ziel}`,
              type: "ziel",
              text: `${s.vorname}: Ziel überfällig (${z.ziel})`,
              color: "amber",
              icon: <Target size={14} />,
            });
          }
        }
      });
    });

    (app?.kelGespraeche || []).forEach((k) => {
      const kDate = new Date(k.datum);
      if (kDate >= kwStart && kDate <= kwEnd) {
        const s = (app?.schueler || []).find((st) => st.id === k.schuelerId);
        if (s)
          rawInsights.push({
            id: `kel_${k.id}`,
            type: "kel",
            text: `KEL mit ${s.vorname} am ${kDate.toLocaleDateString("de-DE", { weekday: "short" })}`,
            color: "emerald",
            icon: <MessageSquare size={14} />,
          });
      }
    });

    (app?.schueler || []).forEach((s) => {
      const erhebungen = (app?.diagnostikErhebungen || []).filter(
        (e) => e.schuelerId === s.id,
      );
      if (erhebungen.length > 0) {
        const latest = erhebungen.reduce(
          (prev, curr) =>
            new Date(curr.datum) > new Date(prev.datum) ? curr : prev,
          erhebungen[0],
        );
        const diff =
          (heute.getTime() - new Date(latest.datum).getTime()) /
          (1000 * 3600 * 24);
        if (diff > 60) {
          rawInsights.push({
            id: `diagnostik_${s.id}_${latest.id}`,
            type: "diagnostik",
            text: `Diagnostik bei ${s.vorname} auffrischen`,
            color: "blue",
            icon: <Activity size={14} />,
          });
        }
      }
    });

    // Smart Action Item: Klassenkasse Check
    if (app?.klassenkasse?.sammlungen) {
      let offeneZahlungen = 0;
      const sammlungenIds = app.klassenkasse.sammlungen
        .map((s) => s.id)
        .join("_");
      app.klassenkasse.sammlungen.forEach((sammlung) => {
        (app.schueler || []).forEach((s) => {
          const paid = sammlung.betraege?.[s.id] || 0;
          if (paid < sammlung.betrag) {
            offeneZahlungen++;
          }
        });
      });
      if (offeneZahlungen > 0) {
        rawInsights.push({
          id: `klassenkasse_${sammlungenIds || "global"}`,
          type: "finanzen",
          text: `${offeneZahlungen} offene Einzahlung${offeneZahlungen > 1 ? "en" : ""} in der Klassenkasse`,
          color: "amber",
          icon: <Wallet size={14} />,
        });
      }
    }

    // 1. Smart Action Item: Attest-Erinnerung (3-Tage-Regel)
    (app?.schueler || []).forEach((s) => {
      const studentData = app?.anwesenheit?.[s.id] || {};
      const pastDates = Object.keys(studentData).sort((a, b) =>
        b.localeCompare(a),
      );
      let absentStreak = 0;
      let firstAbsentDayStr = "";
      for (const d of pastDates) {
        if (new Date(d) > heute) continue;
        const isAbsent = Object.values(studentData[d]).some(
          (v) => v === "e" || v === "u" || v === "f",
        );
        if (isAbsent) {
          absentStreak++;
          firstAbsentDayStr = d;
        } else break;
      }
      if (absentStreak >= 3) {
        rawInsights.push({
          id: `attest_${s.id}_${firstAbsentDayStr}`,
          type: "anwesenheit",
          text: `Ärztliches Attest von ${s.vorname} ausständig (>3 Tage)`,
          color: "rose",
          icon: <UserMinus size={14} />,
        });
      }
    });

    // 2. Verspätungs-Radar & Summenwarnung
    (app?.schueler || []).forEach((s) => {
      let totalDelay = 0;
      let delayCount = 0;
      const details = app?.anwesenheitDetail?.[s.id] || {};
      Object.values(details).forEach((d: any) => {
        if (d.verspaetung > 0) {
          totalDelay += d.verspaetung;
          delayCount++;
        }
      });
      if (totalDelay >= 60 || delayCount >= 3) {
        rawInsights.push({
          id: `verspaetung_${s.id}_${currentKW}`,
          type: "anwesenheit",
          text: `Verspätungs-Warnung! Elternnotiz bei ${s.vorname} vormerken.`,
          color: "amber",
          icon: <Clock size={14} />,
        });
      }
    });

    // 3. Schularbeiten-Kollisionswarner
    const heutigerWochentag = heute.toLocaleDateString("de-DE", {
      weekday: "long",
    });
    const daysDe = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];
    const dayIdx = daysDe.indexOf(heutigerWochentag);
    const todayPlan = heutigerWochentag ? (app?.wochenplanung?.[currentKW]?.[heutigerWochentag] || {}) : {};
    const examsToday = Object.values(todayPlan).filter(
      (cell: any) =>
        cell?.type === "sa" || cell?.type === "lzk" || cell?.type === "test",
    );

    if (examsToday.length > 0) {
      const examNames = examsToday
        .map((e: any) => e.fach || "Prüfung")
        .join(", ");
      (app?.schueler || []).forEach((s) => {
        const isAbsentToday = Object.values(
          app?.anwesenheit?.[s.id]?.[todayStrFull] || {},
        ).some((v) => v === "e" || v === "u" || v === "f");
        if (isAbsentToday) {
          rawInsights.push({
            id: `kollision_${s.id}_${todayStrFull}`,
            type: "kollision",
            text: `Achtung: ${s.vorname} verpasst heute ${examNames}. Ersatztermin notieren?`,
            color: "rose",
            icon: <AlertCircle size={14} />,
          });
        }
      });
    }

    return rawInsights
      .filter((i) => !(app?.dismissedActionItems || []).includes(i.id))
      .slice(0, 5);
  }, [
    app?.schueler,
    app?.anwesenheit,
    app?.diagnostikErhebungen,
    app?.klassenkasse,
    app?.anwesenheitDetail,
    app?.wochenplanung,
    app?.kelGespraeche,
    app?.dismissedActionItems,
    heute,
    kw,
    app?.schuljahr,
  ]);

  const wochenProgress = React.useMemo(() => {
    const soll: Record<string, number> = {};
    Object.values(app?.stammplan || {}).forEach((day) => {
      Object.values(day || {}).forEach((fach) => {
        if (fach) soll[fach] = (soll[fach] || 0) + 1;
      });
    });

    const ist: Record<string, number> = {};
    const wplan = app?.wochenplanung?.[kw] || {};
    Object.values(wplan).forEach((day: any) => {
      Object.values(day || {}).forEach((cell: any) => {
        if (cell?.fach && cell?.thema) {
          ist[cell.fach] = (ist[cell.fach] || 0) + 1;
        }
      });
    });

    return Object.entries(soll)
      .map(([fach, count]) => ({
        fach,
        soll: count,
        ist: ist[fach] || 0,
        percent: Math.round(((ist[fach] || 0) / count) * 105),
      }))
      .map((item) => ({ ...item, percent: Math.min(100, item.percent) }))
      .sort((a, b) => b.percent - a.percent);
  }, [app?.stammplan, app?.wochenplanung, kw]);

  const foerderStats = React.useMemo(() => {
    if (!app?.schueler || !Array.isArray(app.schueler)) return null;

    let aktiveProfile = 0;
    let offeneZiele = 0;
    let massnahmen30Tage = 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const studentsWithOldestGoals: { student: any; oldestDate: Date }[] = [];

    (app?.schueler || []).forEach((s) => {
      const p = s.foerderprofil;
      if (!p) return;

      const hasContent =
        (p.staerken?.length || 0) > 0 ||
        (p.foerderbedarfBereiche?.length || 0) > 0 ||
        (p.diagnosen?.trim() || "").length > 0 ||
        (p.foerderziele?.length || 0) > 0;

      if (hasContent) aktiveProfile++;

      if (Array.isArray(p.foerderziele)) {
        p.foerderziele.forEach((z) => {
          if (z.status === "offen" || z.status === "in Arbeit") {
            offeneZiele++;
            const startDate = z.startDatum ? new Date(z.startDatum) : null;
            if (startDate) {
              const existing = studentsWithOldestGoals.find(
                (item) => item.student.id === s.id,
              );
              if (!existing) {
                studentsWithOldestGoals.push({
                  student: s,
                  oldestDate: startDate,
                });
              } else if (startDate < existing.oldestDate) {
                existing.oldestDate = startDate;
              }
            }
          }
        });
      }

      if (Array.isArray(p.massnahmen)) {
        p.massnahmen.forEach((m) => {
          if (m.datum && new Date(m.datum) >= thirtyDaysAgo) {
            massnahmen30Tage++;
          }
        });
      }
    });

    const oldestGoals = studentsWithOldestGoals
      .sort((a, b) => a.oldestDate.getTime() - b.oldestDate.getTime())
      .slice(0, 3)
      .map((item) => {
        const diffMonths = Math.floor(
          (heute.getTime() - item.oldestDate.getTime()) /
            (1000 * 60 * 60 * 24 * 30.44),
        );
        return {
          name: item.student.vorname,
          months: diffMonths <= 0 ? 1 : diffMonths,
        };
      });

    return {
      active: aktiveProfile,
      goals: offeneZiele,
      measures: massnahmen30Tage,
      oldestList: oldestGoals,
    };
  }, [app?.schueler]);

  const lehrplanStats = React.useMemo(() => {
    const subjects = [
      "Deutsch",
      "Mathematik",
      "Sachunterricht",
      "Lebende Fremdsprache Englisch",
    ];
    const stufe = app?.stufe || 1;
    const mapping = app?.wochenplan_lehrplan || {};

    const stats = subjects
      .map((fach) => {
        const allKBs = LEHRPLAN_VS_2023[fach]?.[stufe] || [];
        const total = allKBs.length;
        if (total === 0) return null;

        const coveredKBIds = new Set<string>();
        Object.values(mapping).forEach((zuordnungen) => {
          (zuordnungen || []).forEach((z) => {
            if (z.fach === fach) {
              coveredKBIds.add(z.kompetenzbereichId);
            }
          });
        });

        const count = coveredKBIds.size;
        return {
          label: fach === "Lebende Fremdsprache Englisch" ? "Englisch" : fach,
          fach: fach === "Lebende Fremdsprache Englisch" ? "Englisch" : fach,
          count,
          total,
          prozent: Math.round((count / Math.max(total, 1)) * 100),
          percent: Math.round((count / Math.max(total, 1)) * 100),
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    const gesamtProzess = stats.reduce((sum, s) => sum + s.total, 0);
    const gesamtAbgedeckt = stats.reduce((sum, s) => sum + s.count, 0);

    return Object.assign(stats, {
      gesamtProzess,
      gesamtAbgedeckt,
      faecherProgress: stats,
    });
  }, [app?.stufe, app?.wochenplan_lehrplan]);

  const zoomLevel = app?.settings?.zoomLevel || "standard";
  const isCompact = zoomLevel === "compact" || app?.settings?.uiScale === 0.88;
  const isLarge = zoomLevel === "large";

  // --- BENTO GRID COL-SPAN CALCULATIONS ---
  // Sub-widgets of Group 2: showAnnouncements
  const visibleAnnouncements = [
    dashboardSettings.showAiInsights && "ai",
    dashboardSettings.showWocheninsights && "wochen",
    dashboardSettings.showLetzteAktivitaeten && "act",
  ].filter(Boolean);

  const getAnnouncementsSpan = (type: "ai" | "wochen" | "act") => {
    const count = visibleAnnouncements.length;
    let fallback = "col-span-12";
    if (count === 1) fallback = "col-span-12";
    else if (count === 2) {
      if (type === "ai") fallback = "col-span-12 lg:col-span-8";
      else fallback = "col-span-12 lg:col-span-4";
    } else {
      // All 3
      if (type === "ai") fallback = "col-span-12 lg:col-span-6";
      else fallback = "col-span-12 md:col-span-6 lg:col-span-3";
    }
    return `${fallback} min-w-0`;
  };

  // Sub-widgets of Group 4: showStatsMini
  const visibleStatsWidgets = [
    dashboardSettings.showSchuelerStats && "stats",
    dashboardSettings.showAnwesenheit && "anwesenheit",
    dashboardSettings.showKlassendurchschnitt && "durchschnitt",
    dashboardSettings.showDiagnostik && "diagnostik",
    dashboardSettings.showFoerderprofile && "foerderprofile",
    dashboardSettings.showWochenfortschritt && "wochenfortschritt",
    dashboardSettings.showLehrplanAbdeckung && "lehrplan",
    dashboardSettings.showGeburtstage && "geburtstage",
    dashboardSettings.showTagesFokus && "fokus",
    dashboardSettings.showMorgenAufgaben && "aufgaben",
    dashboardSettings.showTodos && "todos",
    dashboardSettings.showEvents && "events",
    dashboardSettings.showStatusBars && "status_bars",
  ].filter(Boolean);

  const getStatsWidgetSpan = (id: string) => {
    const list = visibleStatsWidgets;
    const count = list.length;
    if (count === 0) return "hidden";

    let fallback = "";
    if (count === 1) fallback = "col-span-12";
    else if (count === 2) fallback = "col-span-12 lg:col-span-6";
    else if (count === 3) fallback = "col-span-12 md:col-span-6 lg:col-span-4";
    else if (count === 4) fallback = "col-span-12 md:col-span-6 lg:col-span-3";
    else {
      // 5 or more visible widgets
      const wideWidgets = [
        "aufgaben",
        "diagnostik",
        "foerderprofile",
        "lehrplan",
        "wochenfortschritt",
      ];
      const isWide = wideWidgets.includes(id);

      if (count === 5) {
        if (id === "aufgaben") fallback = "col-span-12";
        else fallback = "col-span-12 md:col-span-6 lg:col-span-3";
      } else if (isWide) {
        fallback = "col-span-12 lg:col-span-6";
      } else {
        fallback = "col-span-12 md:col-span-6 lg:col-span-3";
      }
    }
    return `${fallback} min-w-0`;
  };

  // Dedicated inline EyeOff shortcut button for live layout editing
  const renderEyeOffShortcut = (settingKey: keyof typeof dashboardSettings) => {
    if (!isEditMode) return null;
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDashboardSettings((prev) => ({ ...prev, [settingKey]: false }));
        }}
        className="absolute top-4 right-4 z-[100] w-7 h-7 bg-neutral-900/90 border border-neutral-800 text-neutral-400 hover:text-white rounded-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg select-none"
        title="Widget ausblenden"
      >
        <EyeOff size={13} />
      </button>
    );
  };

  const getVisibleLayout = () => {
    const modeZones: Record<DashboardDayMode, string[]> = {
      morning: ["group_zone1", "group_zone2"],
      teaching: ["group_zone1", "group_zone3"],
      review: ["group_zone2", "group_zone4"],
    };
    const base = (dashboardSettings.layout || []).filter((id) => {
      if (!modeZones[dashboardDayMode].includes(id)) return false;
      switch (id) {
        case "group_zone1":
          return dashboardSettings.showZone1;
        case "group_zone2":
          return dashboardSettings.showZone2;
        case "group_zone3":
          return dashboardSettings.showZone3;
        case "group_zone4":
          return dashboardSettings.showZone4;
        default:
          return false;
      }
    });

    return base;
  };
  const visibleLayout = getVisibleLayout();

  const [showBackupBanner, setShowBackupBanner] = useState(() => {
    // Die erste Einführung soll ruhig bleiben. Eine Sicherungserinnerung
    // erscheint nicht gleichzeitig mit dem First-Run-Onboarding.
    if (app?.firstLogin) return false;

    // If backup reminders are disabled in settings, do not show the banner
    if (app?.settings?.disableBackupReminders) return false;

    const backupSettings = app?.backupEinstellungen || {
      letztesBackup: null,
      erinnerungAktiv: true,
    };
    if (!backupSettings.erinnerungAktiv) return false;

    // Check if postponed via localStorage flag (to persist "Später" click for 24h)
    const postponedUntil = localStorage.getItem(
      "backup_banner_postponed_until",
    );
    if (postponedUntil && Date.now() < parseInt(postponedUntil)) return false;

    const lastBackupTime =
      backupSettings.letztesBackup ||
      localStorage.getItem("lehrkraft_last_backup_time");
    if (!lastBackupTime) return true;
    const diff = Date.now() - new Date(lastBackupTime).getTime();
    return diff > 7 * 24 * 60 * 60 * 1000;
  });

  const handleDownloadBackup = async () => {
    try {
      await triggerBackupDownload(app);

      const nowStr = new Date().toISOString();
      localStorage.setItem("lehrkraft_last_backup_time", nowStr);
      localStorage.setItem("lastBackupTimestamp", Date.now().toString()); // Sync with backupUtils keys

      setApp((prev) => ({
        ...prev,
        backupEinstellungen: {
          ...prev.backupEinstellungen,
          letztesBackup: nowStr,
          erinnerungAktiv: prev.backupEinstellungen?.erinnerungAktiv ?? true,
        },
      }));
      setShowBackupBanner(false);
      localStorage.removeItem("backup_banner_postponed_until");
      localStorage.removeItem("backupRemindLater"); // Sync with backupUtils keys
      showToast(
        "Verschlüsseltes Backup wurde erfolgreich exportiert.",
        "success",
      );
    } catch (error: any) {
      console.error(error);
      showToast(
        error?.message || "Backup-Erstellung fehlgeschlagen. Bitte versuche es erneut.",
        "error",
      );
    }
  };

  const handlePostponeBanner = () => {
    postponeBackup(); // This sets backupRemindLater
    const until = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem("backup_banner_postponed_until", until.toString());
    setShowBackupBanner(false);
    showToast(
      "Die Wochensicherung wurde für 24 Stunden zurückgestellt.",
      "info",
    );
  };

  const handleDisableBackupReminders = () => {
    setApp((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        disableBackupReminders: true,
      },
    }));
    setShowBackupBanner(false);
  };

  return (
    <div
      className={`${isCompact ? "space-y-4" : isLarge ? "space-y-7" : "space-y-5"} dashboard-shell pb-24 w-full max-w-[1600px] mx-auto overflow-x-hidden ${app?.settings?.fontWeight === 'bold' ? 'dashboard-bold-typography font-bold' : ''} ${app?.settings?.fontStyle === 'italic' ? 'dashboard-italic-typography italic' : ''}`}
      data-zoom={app?.settings?.zoomLevel || app?.settings?.fontSize || 'standard'}
      data-font-family={app?.settings?.fontFamily || 'standard'}
      data-font-weight={app?.settings?.fontWeight || 'normal'}
      data-font-style={app?.settings?.fontStyle || 'normal'}
    >
      {lehrerzimmerUnread.count > 0 && (
        <button
          type="button"
          data-testid="dashboard-lehrerzimmer-unread"
          onClick={() => setPage("lehrerzimmer")}
          className="w-full rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent-soft)]/70 px-4 py-4 text-left shadow-sm transition hover:border-[var(--accent)]/45 hover:shadow-md"
        >
          <div className="flex items-start gap-3">
            <div className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
              <MessageSquare size={18} />
              <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[10px] font-black text-white">
                {lehrerzimmerUnread.count}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-[var(--text-primary)]">
                Neue Nachricht{lehrerzimmerUnread.count === 1 ? '' : 'en'} im Lehrerzimmer
              </div>
              {lehrerzimmerUnread.items[0] && (
                <>
                  <div className="mt-1 text-xs font-bold text-[var(--text-secondary)]">
                    {lehrerzimmerUnread.items[0].authorName}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--text-secondary)]">
                    {lehrerzimmerUnread.items[0].body}
                  </p>
                </>
              )}
            </div>
            <ChevronRight size={18} className="mt-2 shrink-0 text-[var(--accent)]" />
          </div>
        </button>
      )}

      <AnimatePresence>
        {showBackupBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-20 pointer-events-auto shadow-sm mb-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-400">
                <Save size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-emerald-400">
                  Zeit für eine Wochensicherung!
                </h4>
                <p className="text-xs text-emerald-400/80 mt-0.5">
                  {app?.backupEinstellungen?.letztesBackup
                    ? `Letzte Sicherung: vor ${Math.floor((Date.now() - new Date(app.backupEinstellungen.letztesBackup).getTime()) / (1000 * 60 * 60 * 24))} Tagen`
                    : "Es wurde noch kein Backup erstellt."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDisableBackupReminders();
                }}
                className="px-3 py-1.5 text-xs font-semibold text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer select-none"
                title="Erinnerungen dauerhaft deaktivieren"
              >
                Deaktivieren
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePostponeBanner();
                }}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-400/80 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer select-none"
              >
                Später
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadBackup();
                }}
                className="px-3 py-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 rounded-lg transition-colors flex items-center gap-1 cursor-pointer active:scale-95 select-none"
              >
                <Download size={14} /> Jetzt sichern
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GEBURTSTAG HEUTE: TOP LEVEL BANNER */}
      <AnimatePresence>
        {birthdaysToday.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full relative z-[100] mb-6"
          >
            <div className="bg-gradient-to-r from-pink-500/10 via-amber-500/10 to-violet-500/10 p-[1px] rounded-2xl sm:rounded-3xl border border-pink-500/20 shadow-[0_15px_30px_rgba(236,72,153,0.05)]">
              <div className="bg-white/95 backdrop-blur-md px-4 sm:px-6 py-4 rounded-[calc(1rem-1px)] sm:rounded-[calc(1.5rem-1px)] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-center sm:text-left">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-pink-50 text-pink-500 rounded-full flex items-center justify-center animate-bounce shadow-xs border border-pink-100">
                    <PartyPopper size={20} className="sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h4 className="text-[1rem] sm:text-[1.125rem] leading-tight font-black text-pink-600 uppercase tracking-widest mb-1.5">
                      Heute hat {birthdaysToday.map((s) => s.vorname).join(", ")} Geburtstag! 🎉
                    </h4>
                    <p className="text-[0.6875rem] sm:text-[0.75rem] leading-tight text-slate-500 font-bold italic">
                      Das ist ein Grund zu feiern 🎂 Lass uns gratulieren!
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      handleBirthdayCelebrateOnDashboard(
                        birthdaysToday.map((s) => s.vorname).join(", "),
                      );
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl text-[0.6875rem] font-black uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-lg cursor-pointer flex items-center gap-2"
                  >
                    🎉 Party!
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage("schueler")}
                    className="hidden sm:block px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-750 text-[0.6875rem] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Schülerliste
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DashboardTodayOverview
        greeting={getGreeting()}
        dateLabel={scheduleDatum.toLocaleDateString("de-DE", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}
        klasseLabel={app?.klassenbezeichnung || "Deine Klasse"}
        manualDateOffset={manualDateOffset}
        onDateOffsetChange={setManualDateOffset}
        privacyMode={false}
        onPrivacyModeChange={() => {}}
        simpleMode={simpleDashboardMode}
        onSimpleModeToggle={() => setSimpleDashboardMode(!simpleDashboardMode)}
        onNavigate={setPage}
        onOpenRemoteSetup={() => setShowRemoteSetup(true)}
        onOpenBackup={handleDownloadBackup}
        onOpenPrint={() => window.print()}
        onOpenSettings={() => setPage("settings")}
        onOpenCustomize={() => setShowCustomizePanel(true)}

        totalStudents={(app?.schueler || []).length}
        absentCount={missingToday.length}
        presentCount={Math.max(0, (app?.schueler || []).length - missingToday.length)}
        attendanceRecorded={attendanceRecordedToday}
        attendanceRequired={attendanceRequiredToday}

        todayLessonCount={todayLessonsList.length}
        currentLesson={currentHourData}
        nextLesson={upcomingHourData}
        todayEventsCount={specialEventsForDay.length}
        todayLessonsList={todayLessonsList}

        openTasksCount={openTasksCount}
        openCollectionsCount={openCollectionsCount}
        openRemindersCount={heuteWichtigItems.filter(i => i.urgent).length}

        actionItems={heuteWichtigItems}

        focusStudent={focusStudent}
        onNextFocusStudent={handleNextFocusStudent}

        tomorrowEvents={tomorrowEventsList}
        weekEvents={weekEventsList}
        monthEvents={monthEventsList}
      />

      {/* Smart Status Dashboard */}
      {!simpleDashboardMode && (
      <section>
        <div className="grid grid-cols-1 gap-5 items-stretch">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 lg:p-6 shadow-sm flex flex-col relative transition-shadow hover:shadow-md">

            <div className="relative z-10 flex flex-col gap-5 w-full">
              <div className="relative flex flex-row flex-wrap items-center justify-between gap-3 w-full pb-4 border-b border-slate-100">
                <div className="flex-1 flex flex-row flex-wrap items-center gap-x-6 gap-y-2 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <h2 className="text-[1rem] leading-normal font-display font-black text-slate-900 tracking-tight text-wrap break-words">
                      Tagesnavigation
                    </h2>
                  </div>

                  <div className="hidden lg:flex items-center gap-2 text-slate-600 text-[0.875rem] leading-snug shrink-0 bg-slate-50/50 px-3 py-1.5 border border-slate-150 rounded-xl shadow-3xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    {getTodayLessonInfo()}
                  </div>

                  {weatherData && (
                    <div className="hidden md:flex items-center gap-2 text-slate-600 text-[0.875rem] leading-snug shrink-0 bg-slate-50/50 hover:bg-slate-100/80 border border-slate-150 rounded-xl cursor-pointer shadow-3xs transition-colors" onClick={() => setIsChangingCity(true)} title="Ort ändern">
                      {getWeatherIcon(weatherData.weather_code, 15)}
                      <span className="font-semibold text-slate-800">{Math.round(weatherData.temperature_2m)}°C</span>
                      <span className="text-slate-400 text-[0.6875rem] font-medium hidden lg:inline">in {app.schulOrt || "Schule"}</span>
                    </div>
                  )}

                  {/* MANUELLE DATUMS-NAVIGIERUNG (TAG FÜR TAG & WOCHE FÜR WOCHE) */}
                  <div className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 p-1 rounded-xl border border-slate-200 transition-colors shrink-0">
                    <button
                      type="button"
                      onClick={() => setManualDateOffset((prev) => prev - 7)}
                      className="p-1.5 hover:bg-white hover:shadow-2xs text-slate-600 hover:text-indigo-600 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                      title="Eine Woche zurück (Woche für Woche)"
                    >
                      <ChevronsLeft size={15} strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualDateOffset((prev) => prev - 1)}
                      className="p-1.5 hover:bg-white hover:shadow-2xs text-slate-600 hover:text-indigo-600 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                      title="Einen Tag zurück (Tag für Tag)"
                    >
                      <ChevronLeft size={15} strokeWidth={2.5} />
                    </button>

                    <div className="flex flex-col items-center justify-center px-3.5 select-none min-w-[125px] leading-none text-center">
                      <span className="text-[0.5625rem] font-black uppercase tracking-[0.1em] text-slate-400 mb-0.5">
                        {manualDateOffset === 0 ? "LIVE-ANSICHT" : "MANUELL"}
                      </span>
                      <span className="text-xs font-black text-slate-800 tabular-nums">
                        {scheduleDatum.toLocaleDateString("de-DE", {
                          weekday: "short",
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setManualDateOffset((prev) => prev + 1)}
                      className="p-1.5 hover:bg-white hover:shadow-2xs text-slate-600 hover:text-indigo-600 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                      title="Einen Tag vorwärts (Tag für Tag)"
                    >
                      <ChevronRight size={15} strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualDateOffset((prev) => prev + 7)}
                      className="p-1.5 hover:bg-white hover:shadow-2xs text-slate-600 hover:text-indigo-600 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                      title="Eine Woche vorwärts (Woche für Woche)"
                    >
                      <ChevronsRight size={15} strokeWidth={2.5} />
                    </button>

                    {manualDateOffset !== 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setManualDateOffset(0);
                          try {
                            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                            if (AudioContext) {
                              const ctx = new AudioContext();
                              const osc = ctx.createOscillator();
                              const gain = ctx.createGain();
                              osc.connect(gain);
                              gain.connect(ctx.destination);
                              osc.frequency.setValueAtTime(440, ctx.currentTime);
                              gain.gain.setValueAtTime(0.04, ctx.currentTime);
                              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                              osc.start();
                              osc.stop(ctx.currentTime + 0.1);
                            }
                          } catch (e) {}
                        }}
                        className="ml-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[0.5625rem] uppercase tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer flex items-center gap-1 shrink-0 shadow-sm"
                        title="Zurück zur automatischen Ansicht (Heute) springen"
                      >
                        <RefreshCw size={9} strokeWidth={3} /> HEUTE
                      </button>
                    )}
                  </div>
                </div>

                {/* Header Actions removed per user request - moved to Topbar/Navigation */}
              </div>

              {/* Start Remote Setup Panel */}
              {showRemoteSetup && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border border-slate-200 bg-slate-50 rounded-3xl p-5 md:p-6 space-y-4 mt-2 shadow-inner"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-600">
                        <Smartphone size={15} />
                      </div>
                      <div>
                        <h3 className="text-[0.75rem] leading-tight font-black uppercase tracking-wider text-slate-800">
                          Handy-Fernbedienung & Live-Kopplung
                        </h3>
                        <p className="text-[0.625rem] text-slate-500 font-medium">
                          Bequeme Steuerung des Cockpits per Smartphone oder
                          Tablet.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowRemoteSetup(false)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {!app.boardSettings?.activeSyncCode && (
                    <div className="space-y-4 pt-1">
                      <p className="text-[0.6875rem] text-slate-600 font-medium leading-relaxed max-w-2xl">
                        Möchtest du das Cockpit frei im Raum steuern? Erzeuge
                        eine temporäre, sichere Live-Verbindung auf unserem
                        Server. Scanne danach einfach den erzeugten QR-Code mit
                        deinem Handy und du kannst die Anwesenheitsprüfung, die
                        MIKA-D-Diagnostik, Timer, Reflexionen oder
                        Schüler-Zufallsauswahl kabellos beim Gehen bedienen!
                      </p>

                      <button
                        onClick={async () => {
                          try {
                            const { code } = await startSyncSession(app);
                            setApp((p) => ({
                              ...p,
                              boardSettings: {
                                ...p.boardSettings,
                                activeSyncCode: code,
                                isRemoteController: false,
                              },
                            }));
                            showToast(
                              "Zero-Knowledge Sitzung gestartet! Scanne den QR-Code.",
                              "success",
                            );
                          } catch (e) {
                            console.error("Failed to start sync session:", e);
                            showToast(
                              "Fehler beim Erzeugen der Verbindung. Bitte erneut versuchen.",
                              "error",
                            );
                          }
                        }}
                        className="h-10 px-5 bg-indigo-600 hover:bg-indigo-550 text-white rounded-xl font-black text-[0.625rem] uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 self-start cursor-pointer"
                      >
                        <QrCode size={13} />
                        <span>Kopplungscode & QR-Code generieren</span>
                      </button>
                    </div>
                  )}

                  {app.boardSettings?.activeSyncCode &&
                    app.boardSettings?.isRemoteController && (
                      <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-2">
                        <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold text-[0.75rem] leading-tight">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>
                            MODUS: AKTIVE FERNBEDIENUNG (
                            {app.boardSettings.activeSyncCode})
                          </span>
                        </div>
                        <p className="text-[0.6875rem] text-slate-600 font-medium leading-relaxed">
                          Dieses Gerät ist aktuell als Fernbedienung gekoppelt.
                          Alle Änderungen, die du hier vornimmst (wie z.B.
                          Abwesenheiten markieren, Diagnosedaten eintragen)
                          werden in Echtzeit auf das verbundene Smartboard oder
                          den Hauptbildschirm übertragen!
                        </p>
                        <button
                          onClick={async () => {
                            await stopSyncSession(app.boardSettings?.activeSyncCode);
                            setApp((p) => ({
                              ...p,
                              boardSettings: {
                                ...p.boardSettings,
                                activeSyncCode: undefined,
                                isRemoteController: undefined,
                              },
                            }));
                            showToast("Kopplung beendet", "info");
                          }}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-[0.5625rem] uppercase tracking-wider rounded-lg transition-all active:scale-95 cursor-pointer"
                        >
                          Kopplung trennen
                        </button>
                      </div>
                    )}

                  {app.boardSettings?.activeSyncCode &&
                    !app.boardSettings?.isRemoteController && (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-1 items-stretch">
                        <div className="md:col-span-8 flex flex-col justify-between gap-4">
                          <div className="space-y-2">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-black text-[0.5625rem] uppercase tracking-wider">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>Live-Verbindung aktiv (Zero-Knowledge Host)</span>
                            </div>

                            <p className="text-[0.6875rem] text-slate-600 font-medium leading-relaxed">
                              Dein Hauptbildschirm dient nun als Smartboard.
                              Richtest du dein Smartphone auf den QR-Code
                              rechts, wird das Dashboard auf deinem Handy
                              geladen. Alle Daten werden Ende-zu-Ende verschlüsselt
                              synchronisiert.
                            </p>
                          </div>

                          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5 shadow-3xs">
                            <div className="flex justify-between items-center">
                              <span className="text-[0.5625rem] text-slate-400 font-bold uppercase tracking-wider">
                                Kopplungscode
                              </span>
                              <button
                                onClick={() => {
                                  const encodedKey = getActiveEncodedSessionKey() || '';
                                  const syncUrl = createSyncUrl(app.boardSettings?.activeSyncCode, encodedKey);
                                  navigator.clipboard.writeText(syncUrl);
                                  showToast(
                                    "Verschlüsselter Kopplungs-Link wurde kopiert!",
                                    "success",
                                  );
                                }}
                                className="text-[0.5625rem] text-indigo-600 hover:text-indigo-800 font-bold uppercase tracking-wider underline cursor-pointer"
                              >
                                Link kopieren
                              </button>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[1.25rem] leading-normal font-black text-slate-800 tracking-[0.2em] uppercase select-all shadow-inner">
                                {app.boardSettings?.activeSyncCode}
                              </div>
                              <span className="text-[0.625rem] text-slate-500 font-medium leading-tight">
                                Alternativ kannst du diesen 6-stelligen Code in
                                den Einstellungen deines Handys unter
                                "Smartboard & Fernbedienung" eingeben.
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={async () => {
                              await stopSyncSession(app.boardSettings?.activeSyncCode);
                              setApp((p) => ({
                                ...p,
                                boardSettings: {
                                  ...p.boardSettings,
                                  activeSyncCode: undefined,
                                  isRemoteController: undefined,
                                },
                              }));
                              showToast("Live-Kopplung beendet", "info");
                            }}
                            className="self-start px-4 h-9 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-600 hover:text-slate-900 rounded-lg font-black text-[0.5625rem] uppercase tracking-wider transition-all cursor-pointer"
                          >
                            Sitzung beenden
                          </button>
                        </div>

                        <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-sm border border-slate-200 self-start md:self-auto min-h-[160px]">
                          <QRCodeCanvas
                            value={createSyncUrl(app.boardSettings?.activeSyncCode, getActiveEncodedSessionKey() || '')}
                            size={120}
                            level="M"
                          />
                          <span className="text-[0.5625rem] text-slate-500 font-extrabold uppercase tracking-wider mt-3 text-center">
                            Mit Handy scannen 📱
                          </span>
                        </div>
                      </div>
                    )}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Birthdays this week alert slider banner */}
      <AnimatePresence>
        {birthdaysThisWeek.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className=""
          >
            <div className="bg-gradient-to-r from-amber-500/10 to-rose-500/10 p-[1px] rounded-3xl border border-amber-500/20 shadow-[0_10px_25px_rgba(245,158,11,0.03)]">
              <div className="bg-white/95 backdrop-blur-md px-6 py-4 rounded-[calc(1.5rem-1px)] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-amber-600 animate-bounce">
                    <PartyPopper size={16} />
                  </div>
                  <div>
                    <h4 className="text-[0.75rem] leading-tight font-black text-amber-800 uppercase tracking-widest leading-none mb-1">
                      Geburtstage diese Woche
                    </h4>
                    <div className="text-[0.75rem] leading-tight text-slate-600 font-bold italic flex flex-wrap gap-x-1.5 gap-y-0.5">
                      <span>Herzlichen Glückwunsch an:</span>
                      {birthdaysThisWeek.map((s, idx) => {
                        let bdayDate: Date | null = null;
                        const parts = s.geburtstag.split(".");
                        if (parts.length === 3) {
                          bdayDate = new Date(
                            heute.getFullYear(),
                            parseInt(parts[1]) - 1,
                            parseInt(parts[0])
                          );
                        } else {
                          const parsed = new Date(s.geburtstag);
                          if (!isNaN(parsed.getTime())) {
                            bdayDate = new Date(heute.getFullYear(), parsed.getMonth(), parsed.getDate());
                          }
                        }
                        const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
                        const weekdayStr = bdayDate ? WEEKDAYS[bdayDate.getDay()] : "";
                        const dateStr = bdayDate ? `${String(bdayDate.getDate()).padStart(2, '0')}.${String(bdayDate.getMonth() + 1).padStart(2, '0')}.` : "";
                        const bdayLabel = bdayDate ? ` (${weekdayStr}, ${dateStr})` : "";
                        return (
                          <span key={s.id || idx}>
                            <span className="text-amber-600 font-extrabold">{s.vorname}</span>
                            <span className="text-slate-400 font-normal">{bdayLabel}</span>
                            {idx < birthdaysThisWeek.length - 1 ? ", " : ""}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Erste Schritte Widget */}
      {(!app.schueler ||
        app.schueler.length === 0 ||
        !app.klassenbezeichnung ||
        !app.stammplan ||
        Object.keys(app.stammplan).length === 0) && (
        <div className="bg-white border border-slate-200/80 rounded-[2.5rem] p-4 sm:p-6 shadow-xs relative ">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-80" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-accent/10 text-accent rounded-xl flex items-center justify-center">
                <Lightbulb size={20} />
              </div>
              <div>
                <h3 className="text-[0.8125rem] font-black text-slate-900 uppercase tracking-wider">
                  Erste Schritte
                </h3>
                <p className="text-[0.75rem] leading-tight text-slate-500 font-medium text-balance">
                  Richte dein Klassenbuch ein, um alle Funktionen perfekt nutzen
                  zu können.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div
                className={`p-4 border rounded-2xl flex items-center gap-3 transition-colors ${app.klassenbezeichnung ? "hidden" : "bg-slate-50 border-slate-100 hover:border-slate-200"}`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${app.klassenbezeichnung ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}
                >
                  {app.klassenbezeichnung ? (
                    <Check size={12} />
                  ) : (
                    <span className="text-[0.625rem] font-bold">1</span>
                  )}
                </div>
                <div>
                  <h4 className="text-[0.75rem] leading-tight font-bold text-slate-800">
                    Klasse benennen
                  </h4>
                  {!app.klassenbezeichnung && (
                    <button
                      onClick={() => setPage("settings")}
                      className="text-[0.625rem] text-accent font-bold hover:underline mt-0.5"
                    >
                      Einstellungen öffnen
                    </button>
                  )}
                </div>
              </div>

              <div
                className={`p-4 border rounded-2xl flex items-center gap-3 transition-colors ${app.schueler && app.schueler.length > 0 ? "hidden" : "bg-slate-50 border-slate-100 hover:border-slate-200"}`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${app.schueler && app.schueler.length > 0 ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}
                >
                  {app.schueler && app.schueler.length > 0 ? (
                    <Check size={12} />
                  ) : (
                    <span className="text-[0.625rem] font-bold">2</span>
                  )}
                </div>
                <div>
                  <h4 className="text-[0.75rem] leading-tight font-bold text-slate-800">
                    Schülerliste anlegen
                  </h4>
                  {!(app.schueler && app.schueler.length > 0) && (
                    <button
                      onClick={() => setPage("schueler")}
                      className="text-[0.625rem] text-accent font-bold hover:underline mt-0.5"
                    >
                      Schüler anlegen
                    </button>
                  )}
                </div>
              </div>

              <div
                className={`p-4 border rounded-2xl flex items-center gap-3 transition-colors ${app.stammplan && Object.keys(app.stammplan).length > 0 ? "hidden" : "bg-slate-50 border-slate-100 hover:border-slate-200"}`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${app.stammplan && Object.keys(app.stammplan).length > 0 ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}
                >
                  {app.stammplan && Object.keys(app.stammplan).length > 0 ? (
                    <Check size={12} />
                  ) : (
                    <span className="text-[0.625rem] font-bold">3</span>
                  )}
                </div>
                <div>
                  <h4 className="text-[0.75rem] leading-tight font-bold text-slate-800">
                    Stundenplan konfigurieren
                  </h4>
                  {!(
                    app.stammplan && Object.keys(app.stammplan).length > 0
                  ) && (
                    <button
                      onClick={() => {
                        setApp((p) => ({
                          ...p,
                          setupInitialStepMode: "Stundenplan",
                        }));
                        setPage("setup");
                      }}
                      className="text-[0.625rem] text-accent font-bold hover:underline mt-0.5"
                    >
                      Zum SetupWizard
                    </button>
                  )}
                </div>
              </div>

              {app.stammplan && Object.keys(app.stammplan).length > 0 && (
                <div className="mt-6 border border-accent/20 rounded-2xl  bg-accent/5 shadow-sm transition-colors duration-300">
                  <div className="bg-accent/10 px-4 py-2.5 border-b border-accent/10 flex justify-between items-center">
                    <h4 className="text-[0.625rem] font-black uppercase text-accent tracking-wider flex items-center gap-2">
                      <Calendar size={12} className="text-accent" /> Stammplan
                    </h4>
                    <button
                      onClick={() => {
                        setApp((p) => ({
                          ...p,
                          setupInitialStepMode: "Stundenplan",
                        }));
                        setPage("setup");
                      }}
                      className="text-[0.5625rem] text-accent font-bold hover:underline"
                    >
                      Bearbeiten
                    </button>
                  </div>
                  <div className="p-3 grid grid-cols-5 gap-1.5">
                    {[
                      "Montag",
                      "Dienstag",
                      "Mittwoch",
                      "Donnerstag",
                      "Freitag",
                    ].map((tag) => (
                      <div key={tag} className="space-y-1">
                        <div className="text-[0.5rem] font-black uppercase tracking-wider text-accent/60 mb-1.5 text-center">
                          {tag.slice(0, 2)}
                        </div>
                        {LESSON_SLOT_NUMBERS.map((h) => {
                          const fach = app.stammplan?.[tag]?.[h];
                          if (!fach)
                            return (
                              <div
                                key={h}
                                className="h-5 rounded bg-surface/50 border border-accent/10 border-dashed"
                              ></div>
                            );
                          return (
                            <div
                              key={h}
                              className="h-5 rounded bg-surface text-accent text-[0.5rem] font-bold flex items-center justify-center px-0.5  whitespace-nowrap text-ellipsis shadow-sm"
                              title={fach}
                            >
                              {fach.slice(0, 3).toUpperCase()}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SMART ACTION ITEMS */}
      {!simpleDashboardMode && weekInsights.length > 0 && dashboardDayMode === "review" && (
        <div className="mb-8 px-2">
          <h3 className="text-[0.75rem] leading-tight font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
            <Zap size={14} className="text-amber-500" /> Smart Action Items
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {weekInsights.map((insight) => {
                const isDismissing = dismissingIds.includes(insight.id);
                return (
                  <motion.div
                    layout
                    key={insight.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={`bg-white border border-slate-200 rounded-2xl p-4 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden action-item-card ${isDismissing ? "action-item-completed" : ""}`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-${insight.color}-50 text-${insight.color}-600 border border-${insight.color}-100`}
                    >
                      {insight.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 mb-1">
                        {insight.type}
                      </div>
                      <div
                        className={`text-[0.875rem] leading-snug font-bold text-slate-700 leading-snug ${isDismissing ? "line-through text-slate-400" : ""}`}
                      >
                        {insight.text}
                      </div>
                    </div>
                    <button
                      onClick={() => startDismissInsight(insight.id)}
                      className="shrink-0 p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                      title="Als erledigt markieren"
                    >
                      <Check size={16} />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* MINI STATS WIDGETS (Geburtstage & Events) */}
      {!simpleDashboardMode && dashboardDayMode !== "teaching" && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full mb-5 z-10 relative">
        {dashboardSettings.showGeburtstage && (
          <MemoizedBirthdayWidget
            students={app.schueler || []}
            dashboardSettings={dashboardSettings}
            setApp={setApp}
            setPage={setPage}
            getStatsWidgetSpan={getStatsWidgetSpan}
            renderEyeOffShortcut={renderEyeOffShortcut}
            handleBirthdayCelebrateOnDashboard={handleBirthdayCelebrateOnDashboard}
            handleResizeWidget={handleResizeWidget}
            isEditMode={isEditMode}
          />
        )}
        {dashboardSettings.showEvents && (
          <MemoizedEventsWidget
            customEvents={dashboardSettings.customEvents || []}
            dashboardSettings={dashboardSettings}
            setDashboardSettings={setDashboardSettings}
            getStatsWidgetSpan={getStatsWidgetSpan}
            renderEyeOffShortcut={renderEyeOffShortcut}
            handleResizeWidget={handleResizeWidget}
            isEditMode={isEditMode}
          />
        )}
      </div>
      )}

      {/* COMPREHENSIVE BENTO-GRID-LAYOUT */}
      {!simpleDashboardMode && (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={visibleLayout}>
          <div
            className={`grid grid-cols-12 w-full auto-rows-max mb-10 items-stretch ${
              isCompact ? "gap-4 sm:gap-3" : isLarge ? "gap-6" : "gap-5"
            }`}
            style={{ display: "grid" }}
          >
            {visibleLayout.map((id) => {
              // Add Zone headers if they are the first item in their group
              const isFirstZone1 =
                id === "group_zone1" && visibleLayout.indexOf(id) === 0;
              const isFirstZone2 = id === "group_zone2";
              const isFirstZone3 = id === "group_zone3";

              switch (id) {
                case "group_zone1":
                  return (
                    <React.Fragment key="group_zone1">
                      {dashboardSettings.showZone1 && (
                        <SortableWidget
                          id="group_zone1"
                          className="col-span-12"
                          overrideSpan={
                            dashboardSettings.widgetSizes?.[`group_zone1`] ||
                            "col-span-12"
                          }
                          onResize={handleResizeWidget}
                          isEditMode={isEditMode}
                        >
                          <div className="relative flex flex-col bg-white border border-slate-200/80 text-slate-900 rounded-2xl shadow-sm min-w-0 transition-shadow hover:shadow-md">
                            {renderEyeOffShortcut("showAgenda")}

                            {/* HORIZONTAL TIMELINE BAR */}
                            {(() => {
                              const tagStunden = app?.tageplan?.[tagName]?.stunden || [1, 2, 3, 4, 5];
                              const tagPlan = tagName ? (app?.wochenplanung?.[kw]?.[tagName] || {}) : {};
                              const stammItems = app?.stammplan?.[tagName] || {};
                              const stundenIds = Object.keys(stammItems)
                                .filter((k) => !!stammItems[parseInt(k)])
                                .map(Number);
                              const hasLessons = stundenIds.length > 0;

                              const afternoonSlots = [6, 7, 8, 9, 10].filter((id) => {
                                const i = id - 1;
                                return tagPlan[i] || stammItems[i];
                              });
                              const allVisibleStunden = Array.from(
                                new Set([
                                  ...tagStunden,
                                  ...afternoonSlots,
                                ]),
                              ).sort((a, b) => a - b);

                              const activeHourId = currentIdx !== -1 ? (currentIdx + 1) : (nextIdx !== -1 ? (nextIdx + 1) : -1);
                              const currentSelectedHourId = selectedHourId !== null ? selectedHourId : (activeHourId !== -1 ? activeHourId : (allVisibleStunden[0] || 1));

                              const dateFormatted = scheduleDatum.toLocaleDateString("de-DE", {
                                weekday: "long",
                                day: "numeric",
                                month: "long"
                              });

                              return (
                                <React.Fragment>
                                  <div className="w-full px-5 py-4 sm:px-6 border-b border-slate-100 bg-slate-50/70 rounded-t-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-600 shadow-3xs">
                                        <Clock size={18} className="animate-pulse" />
                                      </div>
                                      <div>
                                        <div className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-slate-500">Tages-Chronik</div>
                                        <div className="text-[1.125rem] font-black text-slate-800 tracking-tight mt-0.5 flex items-center gap-2">
                                          <span>{dateFormatted}</span>
                                          <span className="text-slate-300 font-normal">|</span>
                                          <span className="text-[0.75rem] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">KW {kw}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-start md:self-auto">
                                      {isWeekend ? (
                                        <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-[0.6875rem] font-black rounded-lg uppercase tracking-wider shadow-sm">
                                          Wochenende
                                        </span>
                                      ) : isDayOver ? (
                                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[0.6875rem] font-black rounded-lg uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                                          <Check size={12} strokeWidth={3} />
                                          Feierabend
                                        </span>
                                      ) : isCurrent ? (
                                        <span className="px-2.5 py-1 bg-indigo-500 text-white text-[0.6875rem] font-black rounded-lg uppercase tracking-wider shadow-sm animate-pulse flex items-center gap-1.5">
                                          <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                                          Aktiv: {nextHourData?.fach || "Unterricht"}
                                        </span>
                                      ) : (
                                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 text-[0.6875rem] font-black rounded-lg uppercase tracking-wider shadow-sm">
                                          Demnächst
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {hasLessons && !isWeekend && (
                                    <div className="w-full px-5 sm:px-6 border-b border-slate-100/80 bg-white py-3 flex gap-2.5 overflow-x-auto scrollbar-none snap-x select-none">
                                      {allVisibleStunden.map((stundenId) => {
                                        const i = stundenId - 1;
                                        const displayFach = tagPlan[i]?.fach || stammItems[stundenId] || "";
                                        const zeit = (app.stundenZeiten || STUNDEN_INFO)[stundenId] || "";
                                        const isCurrentLesson = i === currentIdx && !vorschauTyp;
                                        const isSelected = stundenId === currentSelectedHourId;

                                        return (
                                          <button
                                            key={stundenId}
                                            onClick={() => setSelectedHourId(stundenId)}
                                            className={`snap-center flex-shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                              isSelected
                                                ? "bg-slate-900 border-slate-950 text-white shadow-md scale-[1.03]"
                                                : isCurrentLesson
                                                  ? "bg-indigo-50 border-indigo-300 text-indigo-950 shadow-inner ring-2 ring-indigo-400/20"
                                                  : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800"
                                            }`}
                                          >
                                            <div
                                              className={`w-8 h-8 rounded-xl flex flex-col items-center justify-center font-black text-[0.6875rem] leading-none shrink-0 ${
                                                isSelected
                                                  ? "bg-slate-800 text-white border border-slate-750"
                                                  : isCurrentLesson
                                                    ? "bg-indigo-600 text-white"
                                                    : displayFach
                                                      ? "bg-white text-slate-800 border border-slate-200 shadow-3xs"
                                                      : "bg-slate-200 text-slate-500"
                                              }`}
                                            >
                                              <span>{stundenId}.</span>
                                              <span className="text-[0.45rem] font-bold mt-0.5 tracking-tight">Std</span>
                                            </div>
                                            <div className="min-w-[64px]">
                                              <div className={`text-[0.75rem] font-black truncate leading-tight ${
                                                isSelected ? "text-white" : "text-slate-800"
                                              }`}>
                                                {displayFach || "Freistunde"}
                                              </div>
                                              <div className={`text-[0.5625rem] font-bold uppercase tracking-wider mt-0.5 leading-none ${
                                                isSelected ? "text-slate-300" : "text-slate-400"
                                              }`}>
                                                {zeit}
                                              </div>
                                            </div>

                                            {isCurrentLesson && (
                                              <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                              </span>
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </React.Fragment>
                              );
                            })()}

                            <div className="flex-1 flex flex-col xl:flex-row min-h-[380px]">
                              {(() => {
                                const tagStunden = app?.tageplan?.[tagName]?.stunden || [1, 2, 3, 4, 5];
                                const tagPlan = tagName ? (app?.wochenplanung?.[kw]?.[tagName] || {}) : {};
                                const stammItems = app?.stammplan?.[tagName] || {};
                                const stundenIds = Object.keys(stammItems)
                                  .filter((k) => !!stammItems[parseInt(k)])
                                  .map(Number);
                                const hasLessons = stundenIds.length > 0;

                                const afternoonSlots = [6, 7, 8, 9, 10].filter((id) => {
                                  const i = id - 1;
                                  return tagPlan[i] || stammItems[i];
                                });
                                const allVisibleStunden = Array.from(
                                  new Set([
                                    ...tagStunden,
                                    ...afternoonSlots,
                                  ]),
                                ).sort((a, b) => a - b);

                                const activeHourId = currentIdx !== -1 ? (currentIdx + 1) : (nextIdx !== -1 ? (nextIdx + 1) : -1);
                                const currentSelectedHourId = selectedHourId !== null ? selectedHourId : (activeHourId !== -1 ? activeHourId : (allVisibleStunden[0] || 1));

                                return (
                                  <React.Fragment>
                                    {/* COLUMN 1: SELECTED HOUR DETAILS */}
                                    <div className="flex-shrink-0 xl:w-[32%] p-5 sm:p-6 border-b xl:border-b-0 xl:border-r border-slate-200/60 flex flex-col justify-between bg-slate-50/20">
                                      {(() => {
                                        const stundenId = currentSelectedHourId;
                                        const i = stundenId - 1;
                                        const displayFach = tagPlan[i]?.fach || stammItems[stundenId] || "";
                                        const zeit = (app.stundenZeiten || STUNDEN_INFO)[stundenId] || "";
                                        const isCurrentLesson = i === currentIdx && !vorschauTyp;
                                        const progress = isCurrentLesson ? getLessonProgress(i) : 0;
                                        const styleObj = getFachStyle(displayFach || "Pause", isCurrentLesson);

                                        let targetDate = new Date(heute.getTime());
                                        let targetTimeContext = "heute";

                                        if (isDayOver || isWeekend) {
                                          targetDate.setDate(targetDate.getDate() + 1);
                                          while (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
                                            targetDate.setDate(targetDate.getDate() + 1);
                                          }
                                          const isTomorrow = targetDate.getDate() === new Date(heute.getTime() + 86400000).getDate();
                                          targetTimeContext = isTomorrow ? "morgen" : "zukünftig";
                                        }

                                        const tage = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
                                        const targetDayName = tage[targetDate.getDay()];
                                        let targetKw = kw;
                                        const diffDays = Math.ceil((targetDate.getTime() - heute.getTime()) / (1000 * 3600 * 24));
                                        if (diffDays > 0) {
                                          const firstJan = new Date(targetDate.getFullYear(), 0, 1);
                                          const dayOfYear = Math.floor((targetDate.getTime() - firstJan.getTime()) / 86400000) + 1;
                                          targetKw = Math.ceil(dayOfYear / 7);
                                        }

                                        const targetTagPlan = targetDayName ? (app?.wochenplanung?.[targetKw]?.[targetDayName] || {}) : {};
                                        const targetStamm = app?.stammplan?.[targetDayName] || {};

                                        let firstLessonIdx = -1;
                                        let firstLessonFach = "";
                                        for (let x = 0; x < 8; x++) {
                                          const f = targetTagPlan[x]?.fach || targetStamm[x + 1] || "";
                                          if (f) {
                                            firstLessonIdx = x;
                                            firstLessonFach = f;
                                            break;
                                          }
                                        }
                                        const zeitInfo = firstLessonIdx !== -1 ? ((app.stundenZeiten || STUNDEN_INFO)[firstLessonIdx + 1] || "") : "";
                                        const startZeit = zeitInfo.split(/[–-]/)[0]?.trim() || "";

                                        if (isWeekend) {
                                          return (
                                            <div className="space-y-4 h-full flex flex-col justify-between">
                                              <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-100/20 border border-amber-200/60 shadow-xs relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-lg pointer-events-none" />
                                                <div className="text-[1.125rem] font-black text-amber-850 tracking-tight flex items-center gap-2">
                                                  <span>🏡</span> Schulfreie Zeit
                                                </div>
                                                <p className="text-[0.75rem] font-medium text-amber-700/90 mt-1 leading-normal">
                                                  Wochenende! Entspanne dich und genieße deine freie Zeit.
                                                </p>
                                              </div>

                                              {firstLessonIdx !== -1 && (
                                                <div className="space-y-2">
                                                  <div className="text-[0.625rem] font-black text-slate-450 uppercase tracking-widest font-mono">
                                                    Vorschau Montag:
                                                  </div>
                                                  <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs flex items-center justify-between">
                                                    <div>
                                                      <div className="text-[0.875rem] font-black text-slate-800 tracking-tight">
                                                        {firstLessonFach}
                                                      </div>
                                                      <div className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                        {startZeit} Uhr ({firstLessonIdx + 1}. Std)
                                                      </div>
                                                    </div>
                                                    <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-150 flex items-center justify-center text-[0.6875rem] font-black text-slate-500 shadow-3xs">
                                                      1.
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        }

                                        if (isDayOver) {
                                          return (
                                            <div className="space-y-4 h-full flex flex-col justify-between">
                                              <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-emerald-100/20 border border-emerald-200/60 shadow-xs relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-lg pointer-events-none" />
                                                <div className="text-[1.125rem] font-black text-emerald-850 tracking-tight flex items-center gap-2">
                                                  <span>🎉</span> Feierabend!
                                                </div>
                                                <p className="text-[0.75rem] font-medium text-emerald-700/90 mt-1 leading-normal">
                                                  Der heutige Schultag ist erfolgreich beendet. Erhol dich gut!
                                                </p>
                                              </div>

                                              {firstLessonIdx !== -1 && (
                                                <div className="space-y-2">
                                                  <div className="text-[0.625rem] font-black text-slate-450 uppercase tracking-widest font-mono">
                                                    Morgen startet mit:
                                                  </div>
                                                  <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs flex items-center justify-between">
                                                    <div>
                                                      <div className="text-[0.875rem] font-black text-slate-800 tracking-tight">
                                                        {firstLessonFach}
                                                      </div>
                                                      <div className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                        {startZeit} Uhr ({firstLessonIdx + 1}. Std)
                                                      </div>
                                                    </div>
                                                    <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-150 flex items-center justify-center text-[0.6875rem] font-black text-slate-500 shadow-3xs">
                                                      1.
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        }

                                        if (!displayFach) {
                                          return (
                                            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                                              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 border border-slate-200/60 mb-3 shadow-3xs">
                                                <Coffee size={20} />
                                              </div>
                                              <h4 className="text-[0.875rem] font-black text-slate-750 tracking-tight">Pause / Freistunde</h4>
                                              <p className="text-[0.6875rem] text-slate-400 mt-1 leading-normal">
                                                Für die {stundenId}. Stunde ist kein Unterricht eingetragen. Atme kurz durch! ☕
                                              </p>
                                            </div>
                                          );
                                        }

                                        return (
                                          <div className="space-y-5 flex flex-col justify-between h-full">
                                            <div className="space-y-4">
                                              <div className="flex items-center justify-between">
                                                <span className="text-[0.625rem] font-black text-indigo-600 bg-indigo-50 border border-indigo-150 px-2.5 py-0.5 rounded-md uppercase tracking-wider font-mono">
                                                  Details: {stundenId}. Stunde
                                                </span>
                                                {isCurrentLesson && (
                                                  <span className="flex items-center gap-1.5 text-[0.5625rem] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-150 animate-pulse uppercase tracking-wider">
                                                    <span className="w-1.5 h-1.5 bg-rose-600 rounded-full" />
                                                    Aktiv
                                                  </span>
                                                )}
                                              </div>

                                              <div className={`p-5 rounded-3xl border transition-all ${styleObj.card} shadow-sm relative overflow-hidden`}>
                                                <div className="absolute top-0 right-0 w-20 h-20 bg-white/[0.04] rounded-full blur-xl pointer-events-none" />
                                                <div className="text-[1.5rem] font-black leading-tight tracking-tight">
                                                  {displayFach}
                                                </div>
                                                <div className={`text-[0.6875rem] font-black uppercase tracking-widest mt-1 opacity-90`}>
                                                  {zeit} Uhr
                                                </div>

                                                {isCurrentLesson && (
                                                  <div className="mt-4 space-y-1.5">
                                                    <div className="flex items-center justify-between text-[0.625rem] font-bold opacity-85">
                                                      <span>Unterricht läuft...</span>
                                                      <span>{Math.round(progress)}%</span>
                                                    </div>
                                                    <div className="w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
                                                      <div className="bg-white h-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                                                    </div>
                                                  </div>
                                                )}
                                              </div>

                                              <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-150 shadow-3xs">
                                                <div className="space-y-1">
                                                  <span className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest block font-mono">Stundenthema</span>
                                                  <div className="text-[0.8125rem] font-bold text-slate-800 leading-snug">
                                                    {tagPlan[i]?.thema || "Noch kein Thema eingetragen"}
                                                  </div>
                                                </div>
                                                {tagPlan[i]?.hausuebung && (
                                                  <div className="space-y-1 pt-2 border-t border-slate-100">
                                                    <span className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest block font-mono">Hausaufgabe</span>
                                                    <div className="text-[0.75rem] font-medium text-slate-600 leading-normal">
                                                      {tagPlan[i]?.hausuebung}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            </div>

                                            <div className="space-y-2 pt-4">
                                              <button
                                                onClick={() => setPage("cockpit")}
                                                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[0.75rem] font-black uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 group hover:shadow-md"
                                              >
                                                <Zap size={14} className="group-hover:scale-110 transition-transform text-amber-300 fill-amber-300" />
                                                Lehrercockpit starten
                                              </button>

                                              <button
                                                onClick={() => setPage("wochenplanung")}
                                                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-[0.6875rem] font-black uppercase tracking-widest transition-all shadow-3xs cursor-pointer flex items-center justify-center gap-1.5"
                                              >
                                                <BookOpen size={13} />
                                                Im Wochenplan bearbeiten
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>

                                    {/* COLUMN 2: CHRONOLOGICAL PREVIEW LIST */}
                                    <div className="flex-1 p-5 sm:p-6 flex flex-col border-b xl:border-b-0 xl:border-r border-slate-200/60 justify-between">
                                      <div className="flex flex-col h-full justify-between">
                                        <div>
                                          <div className="flex items-center justify-between mb-5">
                                            <div className="space-y-1">
                                              <h3 className="text-[0.625rem] font-black text-slate-400 uppercase tracking-[0.2em]">
                                                Tagesübersicht
                                              </h3>
                                              <div className="text-[1.125rem] leading-normal font-black text-slate-800 tracking-tight">
                                                Chronologischer Ablauf
                                              </div>
                                            </div>
                                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-250 flex items-center justify-center text-slate-600 shadow-sm">
                                              <Calendar size={18} />
                                            </div>
                                          </div>

                                          <div className="overflow-y-auto px-1 -mx-1 py-1 -my-1 custom-scrollbar flex-1 relative max-h-[340px]">
                                            {specialEventsForDay.length > 0 && (
                                              <div className="mb-4 space-y-2">
                                                {specialEventsForDay.map((ev, sIdx) => {
                                                  const getBannerColors = (c: string) => {
                                                    switch (c) {
                                                      case "emerald":
                                                        return "bg-emerald-50 text-emerald-850 border-emerald-200 shadow-3xs";
                                                      case "amber":
                                                        return "bg-amber-50 text-amber-850 border-amber-200/60 shadow-3xs";
                                                      case "blue":
                                                        return "bg-blue-50 text-blue-850 border-blue-200/60 shadow-3xs";
                                                      case "sky":
                                                        return "bg-sky-50 text-sky-850 border-sky-200/60 shadow-3xs";
                                                      case "violet":
                                                        return "bg-violet-50 text-violet-850 border-violet-200/60 shadow-3xs";
                                                      default:
                                                        return "bg-slate-50 text-slate-800 border-slate-200 shadow-3xs";
                                                    }
                                                  };
                                                  return (
                                                    <div
                                                      key={sIdx}
                                                      className={`px-4 py-2.5 rounded-2xl border text-[0.75rem] font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-1 shadow-3xs ${getBannerColors(ev.color)}`}
                                                    >
                                                      <div className="flex items-center gap-2">
                                                        <span className="font-extrabold tracking-tight">{ev.title}</span>
                                                      </div>
                                                      {ev.desc && (
                                                        <span className="text-[0.625rem] opacity-75 font-semibold uppercase tracking-wider">
                                                          {ev.desc}
                                                        </span>
                                                      )}
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            )}

                                            {isWeekend ? (
                                              <div className="h-full flex flex-col items-center justify-center py-8 text-center space-y-3">
                                                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 border border-amber-200/60 shadow-3xs">
                                                  <Sun size={24} />
                                                </div>
                                                <div>
                                                  <p className="text-[1rem] leading-normal font-black text-slate-800 tracking-tight">
                                                    Schönes Wochenende!
                                                  </p>
                                                  <p className="text-[0.6875rem] font-medium text-slate-500 mt-1 px-4 leading-normal">
                                                    Ganz entspannt neue Energie tanken und den Sonntag genießen.
                                                  </p>
                                                </div>
                                              </div>
                                            ) : !hasLessons ? (
                                              <div className="h-full flex flex-col items-center justify-center py-8 text-center space-y-3">
                                                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 border border-slate-200/60 italic font-serif text-[1.25rem] leading-normal shadow-3xs">
                                                  ?
                                                </div>
                                                <div>
                                                  <p className="text-[0.875rem] leading-normal font-black text-slate-800 tracking-tight">
                                                    Keine Stunden eingetragen
                                                  </p>
                                                  <button
                                                    onClick={() => {
                                                      setApp((p) => ({
                                                        ...p,
                                                        setupInitialStepMode: "Stundenplan",
                                                      }));
                                                      setPage("setup");
                                                    }}
                                                    className="text-[0.6875rem] font-black text-indigo-600 uppercase tracking-widest hover:underline mt-2"
                                                  >
                                                    Stammplan einrichten
                                                  </button>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="space-y-2">
                                                {allVisibleStunden.map((stundenId) => {
                                                  const i = stundenId - 1;
                                                  const displayFach = tagPlan[i]?.fach || stammItems[stundenId] || "";
                                                  const zeit = (app.stundenZeiten || STUNDEN_INFO)[stundenId] || "";
                                                  const isCurrentLesson = i === currentIdx && !vorschauTyp;
                                                  const isSelected = stundenId === currentSelectedHourId;

                                                  if (!displayFach) {
                                                    return (
                                                      <div
                                                        key={stundenId}
                                                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 text-[0.6875rem] font-bold text-slate-400"
                                                      >
                                                        <div className="flex items-center gap-2">
                                                          <span className="w-6 h-6 rounded-md bg-slate-100 text-[0.625rem] flex items-center justify-center font-black">
                                                            {stundenId}.
                                                          </span>
                                                          <span>Freistunde / Pause</span>
                                                        </div>
                                                        <span className="font-mono text-[0.625rem]">{zeit}</span>
                                                      </div>
                                                    );
                                                  }

                                                  return (
                                                    <button
                                                      key={stundenId}
                                                      onClick={() => setSelectedHourId(stundenId)}
                                                      className={`w-full flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all text-left cursor-pointer ${
                                                        isSelected
                                                          ? "bg-slate-900 border-slate-950 text-white shadow-sm"
                                                          : isCurrentLesson
                                                            ? "bg-indigo-50 border-indigo-250 text-indigo-950 shadow-3xs"
                                                            : "bg-white hover:bg-slate-50 border-slate-150 text-slate-800 shadow-3xs"
                                                      }`}
                                                    >
                                                      <div className="flex items-center gap-3 min-w-0">
                                                        <span className={`w-8 h-8 rounded-xl text-[0.75rem] flex flex-col items-center justify-center font-black shrink-0 ${
                                                          isSelected
                                                            ? "bg-slate-800 text-white"
                                                            : isCurrentLesson
                                                              ? "bg-indigo-600 text-white"
                                                              : "bg-slate-50 text-slate-500 border border-slate-200"
                                                        }`}>
                                                          <span>{stundenId}</span>
                                                        </span>
                                                        <div className="min-w-0">
                                                          <div className={`text-[0.8125rem] font-black truncate leading-tight ${
                                                            isSelected ? "text-white" : "text-slate-800"
                                                          }`}>
                                                            {displayFach}
                                                          </div>
                                                          <div className={`text-[0.625rem] font-bold truncate mt-0.5 opacity-80 ${
                                                            isSelected ? "text-slate-300" : "text-slate-450"
                                                          }`}>
                                                            {tagPlan[i]?.thema || "Unterrichtseinheit"}
                                                          </div>
                                                        </div>
                                                      </div>

                                                      <div className="text-right shrink-0 ml-2">
                                                        <div className={`text-[0.625rem] font-black uppercase tracking-wider ${
                                                          isSelected ? "text-slate-300" : "text-slate-400"
                                                        }`}>
                                                          {zeit}
                                                        </div>
                                                      </div>
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </React.Fragment>
                                );
                              })()}

                              {/* Fokus Schüler */}
                              <div
                                className="xl:w-[38%] p-5 sm:p-6 flex flex-col relative border-t xl:border-t-0 xl:border-l border-slate-100 bg-slate-50/50"
                              >
                                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                  <Target className="w-32 h-32 text-indigo-500" />
                                </div>
                                <div className="flex items-center justify-between mb-6 shrink-0 relative z-10">
                                  <div className="space-y-1">
                                    <h3 className="text-[0.625rem] font-black text-indigo-600/70 uppercase tracking-[0.2em]">
                                      Tagesfokus
                                    </h3>
                                    <div className="text-[1.125rem] leading-normal font-black text-slate-800 tracking-tight">
                                      Schüler:in des Tages
                                    </div>
                                  </div>
                                  <div
                                    className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 shadow-3xs transition-all hover:bg-slate-50 hover:text-slate-900 hover:shadow-xs cursor-pointer"
                                    onClick={() =>
                                      focusStudent &&
                                      (setApp((p) => ({
                                        ...p,
                                        selectedStudentId: focusStudent.id,
                                      })),
                                      setPage("schueler"))
                                    }
                                  >
                                    <Users size={18} />
                                  </div>
                                </div>
                                <div className="flex-1 flex flex-col relative z-10">
                                  <div className="flex items-center gap-4 mb-5">
                                    <div className="w-14 h-14 shrink-0 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-[1.5rem] leading-normal font-black shadow-[0_10px_20px_rgba(79,70,229,0.15)] border border-indigo-500/10">
                                      {focusStudent?.emoji || "🧑‍🎓"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h3 className="text-[1.25rem] leading-tight font-black text-slate-800 break-words">
                                        {focusStudent?.vorname || "Kein"}{" "}
                                        {focusStudent?.nachname || "Fokus"}
                                      </h3>
                                      <p className="text-[0.625rem] font-black text-indigo-600/70 uppercase tracking-widest mt-1.5">
                                        Schüler:in des Tages
                                      </p>
                                    </div>
                                  </div>

                                  {focusStudent ? (
                                    <div className="space-y-4">
                                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                                        <p className="text-slate-600 text-[0.6875rem] leading-relaxed font-semibold italic">
                                          {focusStudent.foerderprofil
                                            ?.foerderbedarfBereiche &&
                                          focusStudent.foerderprofil
                                            .foerderbedarfBereiche.length > 0
                                            ? `Fokus auf: ${focusStudent.foerderprofil.foerderbedarfBereiche.slice(0, 2).join(", ")} ...`
                                            : `Heute bei ${focusStudent.vorname} besonders auf die Mitarbeit und die individuellen Stärken achten.`}
                                        </p>
                                      </div>

                                      <div className="space-y-2.5">
                                        {/* Stärken */}
                                        <div className="p-3.5 bg-white border border-slate-150 rounded-2xl shadow-sm space-y-2">
                                          <div className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest font-mono">
                                            Stärken (aus Förderprofil)
                                          </div>
                                          {focusStudent.foerderprofil
                                            ?.staerken &&
                                          focusStudent.foerderprofil.staerken
                                            .length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5">
                                              {focusStudent.foerderprofil.staerken.map(
                                                (st, sidx) => (
                                                  <span
                                                    key={sidx}
                                                    className="bg-emerald-50 text-emerald-700 text-[0.625rem] font-bold uppercase tracking-wider px-2 py-1 rounded-xl border border-emerald-100 flex items-center gap-0.5 shadow-2xs"
                                                  >
                                                    <span>💪</span>
                                                    <span className="max-w-[120px] text-wrap leading-tight break-words">
                                                      {st}
                                                    </span>
                                                    <button
                                                      onClick={() => {
                                                        const updatedFoerderprofil =
                                                          {
                                                            ...(focusStudent.foerderprofil ||
                                                              {}),
                                                            staerken: (
                                                              focusStudent
                                                                .foerderprofil
                                                                ?.staerken || []
                                                            ).filter(
                                                              (
                                                                _: any,
                                                                idx: number,
                                                              ) => idx !== sidx,
                                                            ),
                                                          };
                                                        updateStudent({
                                                          ...focusStudent,
                                                          foerderprofil:
                                                            updatedFoerderprofil,
                                                        });
                                                      }}
                                                      className="ml-1 w-4 h-4 rounded-full hover:bg-red-100 hover:text-red-600 text-emerald-400 flex items-center justify-center text-[0.625rem] font-black transition-all cursor-pointer"
                                                      title="Löschen"
                                                    >
                                                      &times;
                                                    </button>
                                                  </span>
                                                ),
                                              )}
                                            </div>
                                          ) : (
                                            <div className="text-[0.625rem] font-bold text-slate-400 italic">
                                              Noch keine erfasst.
                                            </div>
                                          )}

                                          {/* Inline Add Strength */}
                                          <div className="pt-2 border-t border-slate-100 flex gap-1.5">
                                            <input
                                              type="text"
                                              placeholder="Neue Stärke..."
                                              value={newStrengthInput}
                                              onChange={(e) =>
                                                setNewStrengthInput(
                                                  e.target.value,
                                                )
                                              }
                                              onKeyDown={(e) => {
                                                if (
                                                  e.key === "Enter" &&
                                                  newStrengthInput.trim()
                                                ) {
                                                  const newSt =
                                                    newStrengthInput.trim();
                                                  const currentSt =
                                                    focusStudent.foerderprofil
                                                      ?.staerken || [];
                                                  if (
                                                    !currentSt.includes(newSt)
                                                  ) {
                                                    const updatedFoerderprofil =
                                                      {
                                                        ...(focusStudent.foerderprofil ||
                                                          {}),
                                                        staerken: [
                                                          ...currentSt,
                                                          newSt,
                                                        ],
                                                      };
                                                    updateStudent({
                                                      ...focusStudent,
                                                      foerderprofil:
                                                        updatedFoerderprofil,
                                                    });
                                                  }
                                                  setNewStrengthInput("");
                                                }
                                              }}
                                              className="flex-1 text-[0.6875rem] font-bold px-2 py-1 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-300 rounded-lg outline-none transition-colors"
                                            />
                                            <button
                                              onClick={() => {
                                                if (newStrengthInput.trim()) {
                                                  const newSt =
                                                    newStrengthInput.trim();
                                                  const currentSt =
                                                    focusStudent.foerderprofil
                                                      ?.staerken || [];
                                                  if (
                                                    !currentSt.includes(newSt)
                                                  ) {
                                                    const updatedFoerderprofil =
                                                      {
                                                        ...(focusStudent.foerderprofil ||
                                                          {}),
                                                        staerken: [
                                                          ...currentSt,
                                                          newSt,
                                                        ],
                                                      };
                                                    updateStudent({
                                                      ...focusStudent,
                                                      foerderprofil:
                                                        updatedFoerderprofil,
                                                    });
                                                  }
                                                  setNewStrengthInput("");
                                                }
                                              }}
                                              disabled={
                                                !newStrengthInput.trim()
                                              }
                                              className="px-2 py-1 bg-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700 border border-emerald-600 rounded-lg text-[0.625rem] font-black uppercase transition-colors shadow-2xs disabled:opacity-40 cursor-pointer"
                                            >
                                              +
                                            </button>
                                          </div>
                                        </div>

                                        {/* Badges */}
                                        <div className="p-3.5 bg-white border border-slate-150 rounded-2xl shadow-sm space-y-2">
                                          <div className="flex items-center justify-between">
                                            <div className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest font-mono">
                                              Vergebene Badges
                                            </div>
                                            <button
                                              onClick={() =>
                                                setShowBadgeSection(
                                                  !showBadgeSection,
                                                )
                                              }
                                              className="text-[0.5625rem] font-black text-indigo-600 hover:text-indigo-850 bg-indigo-50 hover:bg-indigo-100/80 px-2 py-0.5 rounded-md transition-colors"
                                            >
                                              {showBadgeSection
                                                ? "Schließen"
                                                : "+ Abzeichen"}
                                            </button>
                                          </div>

                                          {focusStudent.badges &&
                                          focusStudent.badges.length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5">
                                              {focusStudent.badges.map(
                                                (b, bidx) => (
                                                  <span
                                                    key={bidx}
                                                    className="bg-amber-50 text-amber-850 text-[0.625rem] font-black uppercase tracking-wider px-2 py-1 rounded-xl border border-amber-200 flex items-center gap-1 shadow-2xs"
                                                  >
                                                    <span>{b.icon}</span>
                                                    <span className="max-w-[120px] text-wrap leading-tight break-words">
                                                      {b.name}
                                                    </span>
                                                    <button
                                                      onClick={() => {
                                                        updateStudent({
                                                          ...focusStudent,
                                                          badges: (
                                                            focusStudent.badges ||
                                                            []
                                                          ).filter(
                                                            (
                                                              _: any,
                                                              idx: number,
                                                            ) => idx !== bidx,
                                                          ),
                                                        });
                                                      }}
                                                      className="ml-1 w-4 h-4 rounded-full hover:bg-red-100 hover:text-red-600 text-amber-400 flex items-center justify-center text-[0.625rem] font-black transition-all cursor-pointer"
                                                      title="Löschen"
                                                    >
                                                      &times;
                                                    </button>
                                                  </span>
                                                ),
                                              )}
                                            </div>
                                          ) : (
                                            <div className="text-[0.625rem] font-bold text-slate-400 italic">
                                              Keine Abzeichen erhalten.
                                            </div>
                                          )}

                                          {showBadgeSection && (
                                            <div className="pt-2 border-t border-slate-100 space-y-2 animate-in fade-in duration-200">
                                              <div className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest font-mono">
                                                Bestehende antippen:
                                              </div>
                                              <div className="max-h-24 overflow-y-auto custom-scrollbar flex flex-wrap gap-1 p-0.5">
                                                {UNIFIED_DEFAULT_BADGES.map(
                                                  (b) => {
                                                    const hasBadge = (
                                                      focusStudent.badges || []
                                                    ).some(
                                                      (item: any) =>
                                                        item.name === b.name,
                                                    );
                                                    return (
                                                      <button
                                                        key={b.id}
                                                        onClick={() => {
                                                          const freshId =
                                                            Date.now().toString() +
                                                            Math.random()
                                                              .toString(36)
                                                              .substring(2, 5);
                                                          const alreadyHas = (
                                                            focusStudent.badges ||
                                                            []
                                                          ).some(
                                                            (item: any) =>
                                                              item.name ===
                                                              b.name,
                                                          );

                                                          if (alreadyHas) {
                                                            updateStudent({
                                                              ...focusStudent,
                                                              badges: (
                                                                focusStudent.badges ||
                                                                []
                                                              ).filter(
                                                                (item: any) =>
                                                                  item.name !==
                                                                  b.name,
                                                              ),
                                                            });
                                                          } else {
                                                            updateStudent({
                                                              ...focusStudent,
                                                              badges: [
                                                                ...(focusStudent.badges ||
                                                                  []),
                                                                {
                                                                  id: freshId,
                                                                  name: b.name,
                                                                  icon: b.icon,
                                                                  date: new Date().toISOString(),
                                                                },
                                                              ],
                                                            });
                                                          }
                                                        }}
                                                        className={`px-2 py-1 rounded-lg text-[0.625rem] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                                                          hasBadge
                                                            ? "bg-amber-100 text-amber-900 border-amber-300 shadow-xs"
                                                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-800"
                                                        }`}
                                                      >
                                                        <span>{b.icon}</span>
                                                        <span>{b.name}</span>
                                                      </button>
                                                    );
                                                  },
                                                )}
                                              </div>

                                              <div className="space-y-1.5 pt-1">
                                                <div className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest font-mono">
                                                  Eigenes Abzeichen erstellen:
                                                </div>
                                                <div className="flex gap-1.5">
                                                  <input
                                                    className="w-10 text-center bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-300 rounded-lg text-[0.875rem] leading-snug outline-none font-bold"
                                                    value={customBadgeIcon}
                                                    onChange={(e) =>
                                                      setCustomBadgeIcon(
                                                        e.target.value,
                                                      )
                                                    }
                                                    placeholder="🌟"
                                                    maxLength={2}
                                                  />
                                                  <input
                                                    className="flex-1 px-2.5 py-1 text-[0.6875rem] font-bold bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-300 rounded-lg outline-none"
                                                    value={customBadgeName}
                                                    onChange={(e) =>
                                                      setCustomBadgeName(
                                                        e.target.value,
                                                      )
                                                    }
                                                    placeholder="z.B. Lese-Meister"
                                                    onKeyDown={(e) => {
                                                      if (
                                                        e.key === "Enter" &&
                                                        customBadgeName.trim()
                                                      ) {
                                                        const freshId =
                                                          Date.now().toString() +
                                                          Math.random()
                                                            .toString(36)
                                                            .substring(2, 5);
                                                        updateStudent({
                                                          ...focusStudent,
                                                          badges: [
                                                            ...(focusStudent.badges ||
                                                              []),
                                                            {
                                                              id: freshId,
                                                              name: customBadgeName.trim(),
                                                              icon:
                                                                customBadgeIcon ||
                                                                "🌟",
                                                              date: new Date().toISOString(),
                                                            },
                                                          ],
                                                        });
                                                        setCustomBadgeName("");
                                                      }
                                                    }}
                                                  />
                                                  <button
                                                    onClick={() => {
                                                      if (
                                                        customBadgeName.trim()
                                                      ) {
                                                        const freshId =
                                                          Date.now().toString() +
                                                          Math.random()
                                                            .toString(36)
                                                            .substring(2, 5);
                                                        updateStudent({
                                                          ...focusStudent,
                                                          badges: [
                                                            ...(focusStudent.badges ||
                                                              []),
                                                            {
                                                              id: freshId,
                                                              name: customBadgeName.trim(),
                                                              icon:
                                                                customBadgeIcon ||
                                                                "🌟",
                                                              date: new Date().toISOString(),
                                                            },
                                                          ],
                                                        });
                                                        setCustomBadgeName("");
                                                      }
                                                    }}
                                                    disabled={
                                                      !customBadgeName.trim()
                                                    }
                                                    className="px-2.5 py-1 bg-slate-900 border border-slate-900 text-white hover:bg-black font-black text-[0.625rem] uppercase rounded-lg transition-all disabled:opacity-40 cursor-pointer"
                                                  >
                                                    +
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center opacity-40">
                                      <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mb-3">
                                        <Focus
                                          size={20}
                                          className="text-slate-400"
                                        />
                                      </div>
                                      <p className="text-[0.625rem] font-black uppercase tracking-widest">
                                        Wähle ein Kind aus
                                      </p>
                                    </div>
                                  )}

                                  <div className="flex gap-2 mt-auto pt-6">
                                    <button
                                      onClick={() => setPage("noten")}
                                      className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 py-3 rounded-xl text-[0.625rem] font-black uppercase tracking-widest transition-all shadow-sm cursor-pointer"
                                    >
                                      Mitarbeit
                                    </button>
                                    <button
                                      onClick={() => setShowNoteInput(true)}
                                      className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 font-black py-3 rounded-xl text-[0.625rem] uppercase tracking-widest transition-all shadow-sm cursor-pointer"
                                    >
                                      Notiz
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </SortableWidget>
                      )}
                    </React.Fragment>
                  );

                case "group_zone2": {
                  return (
                    <React.Fragment key="group_zone2">
                      {dashboardSettings.showZone2 && (
                        <SortableWidget
                          id="group_zone2"
                          overrideSpan={
                            dashboardSettings.widgetSizes?.[`group_zone2`] ||
                            "col-span-12"
                          }
                          onResize={handleResizeWidget}
                          isEditMode={isEditMode}
                        >
                          <div
                            className={`relative h-full flex flex-col p-5 sm:p-6 rounded-[2rem] bg-white border border-slate-200/80 text-slate-900 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.05)] min-h-[310px]`}
                          >
                            {renderEyeOffShortcut("showZone2")}

                            <div className="flex items-center justify-between mb-6 shrink-0 border-b border-slate-100 pb-3">
                              <h3 className="text-[0.75rem] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                <ListTodo
                                  size={14}
                                  className="text-slate-900"
                                />
                                <span>Heute & Morgen</span>
                              </h3>
                              <div className="flex gap-2 text-slate-800 bg-slate-100 px-3 py-1 rounded-full items-center font-bold text-[0.625rem] tracking-widest uppercase border border-slate-200 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-900 animate-pulse" />
                                Live Status
                              </div>
                            </div>

                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4">
                              {/* TO-DOS */}
                              <div className="flex flex-col bg-white border border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                  <h4 className="text-[0.625rem] font-black tracking-widest uppercase text-slate-500">
                                    Aufgaben
                                  </h4>
                                </div>
                                <div className="space-y-2 flex-1 overflow-y-auto no-scrollbar min-h-0 pr-1">
                                  {todos.slice(0, 5).map((todo: any) => (
                                    <div
                                      key={todo.id}
                                      className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 hover:border-slate-400 transition-all group shadow-sm rounded-2xl"
                                    >
                                      <button
                                        onClick={() => toggleTodo(todo.id)}
                                        className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${todo.done ? "bg-slate-900 border-slate-900 text-white" : "border-slate-300 bg-white hover:border-slate-800"}`}
                                      >
                                        {todo.done && (
                                          <Check
                                            size={12}
                                            className="stroke-[2.5]"
                                          />
                                        )}
                                      </button>
                                      <span
                                        className={`text-[0.75rem] font-bold leading-tight flex-1 text-slate-700 mt-0.5 ${todo.done ? "line-through opacity-40" : ""}`}
                                      >
                                        {todo.text}
                                      </span>
                                      <button
                                        onClick={() => deleteTodo(todo.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-50 rounded-md transition-all text-neutral-400 hover:text-rose-500 shrink-0"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ))}
                                  {todos.length === 0 && (
                                    <div className="text-center py-4 text-[0.625rem] font-black uppercase tracking-widest text-slate-400 opacity-50">
                                      Alles erledigt!
                                    </div>
                                  )}
                                </div>
                                <form
                                  onSubmit={addTodo}
                                  className="mt-4 flex gap-2 shrink-0"
                                >
                                  <input
                                    type="text"
                                    value={newTodoText}
                                    onChange={(e: any) =>
                                      setNewTodoText(e.target.value)
                                    }
                                    placeholder="Notieren..."
                                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[0.6875rem] focus:outline-none focus:ring-1 focus:ring-slate-500/30 transition-all placeholder-slate-400 font-medium shadow-inner text-slate-800 tracking-wide"
                                  />
                                  <button
                                    type="submit"
                                    className="px-3.5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 rounded-xl font-black transition-all shadow-sm flex items-center justify-center"
                                  >
                                    <Send size={14} />
                                  </button>
                                </form>
                              </div>

                              {/* MORGENROUTINE */}
                              <div className="flex flex-col bg-white border border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-[0.625rem] font-black tracking-widest uppercase text-slate-500">
                                    Start-Routine
                                  </h4>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={resetMorningTasks}
                                      className="p-1 hover:text-slate-900 transition-colors"
                                      title="Zurücksetzen"
                                    >
                                      <Clock
                                        size={12}
                                        className="text-slate-300"
                                      />
                                    </button>
                                    <button
                                      onClick={clearMorningTasks}
                                      className="p-1 hover:text-rose-500 transition-colors"
                                      title="Löschen"
                                    >
                                      <X size={12} className="text-slate-300" />
                                    </button>
                                  </div>
                                </div>
                                <div className="space-y-2 flex-1 overflow-y-auto no-scrollbar min-h-0">
                                  {(app?.morgenAufgaben || []).map(
                                    (task: any) => (
                                      <div
                                        key={task.id}
                                        className={`flex items-start gap-2.5 p-3 bg-slate-50 rounded-2xl border transition-all group ${task.completed ? "opacity-40 border-transparent shadow-none" : "border-slate-200 hover:border-slate-400 shadow-sm"}`}
                                      >
                                        <button
                                          onClick={() =>
                                            toggleMorningTask(task.id)
                                          }
                                          className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${task.completed ? "bg-slate-900 border-slate-900 text-white" : "border-slate-300 bg-white hover:border-slate-800"}`}
                                        >
                                          {task.completed && (
                                            <Check
                                              size={12}
                                              className="stroke-[2.5]"
                                            />
                                          )}
                                        </button>
                                        <span className="text-[0.75rem] font-bold leading-tight flex-1 text-slate-700 mt-0.5">
                                          {task.text}
                                        </span>
                                        <button
                                          onClick={() =>
                                            deleteMorningTask(task.id)
                                          }
                                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-50 rounded-md transition-all text-neutral-400 hover:text-rose-500 shrink-0"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    ),
                                  )}
                                  {(app?.morgenAufgaben || []).length === 0 && (
                                    <div className="text-[0.625rem] font-medium text-slate-400 italic px-2 text-center py-4">
                                      Keine Routine.
                                    </div>
                                  )}
                                </div>
                                <form
                                  onSubmit={addMorningTask}
                                  className="mt-4 flex gap-2 w-full"
                                >
                                  <input
                                    type="text"
                                    value={newMorningTaskText}
                                    onChange={(e: any) =>
                                      setNewMorningTaskText(e.target.value)
                                    }
                                    placeholder="Add..."
                                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[0.6875rem] focus:outline-none focus:ring-1 focus:ring-slate-500/30 transition-all placeholder-slate-400 font-medium shadow-inner text-slate-800 tracking-wide"
                                  />
                                  <button
                                    type="submit"
                                    className="px-3.5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 rounded-xl font-black transition-all shadow-sm flex items-center justify-center"
                                  >
                                    <Send size={14} />
                                  </button>
                                </form>
                              </div>

                              {/* SPONTANER DENKZETTEL */}
                              <div className="flex flex-col bg-amber-50/40 border border-amber-200/50 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                                  <StickyNote className="w-24 h-24 text-amber-600" />
                                </div>
                                <div className="flex items-center justify-between mb-4 relative z-10">
                                  <h4 className="text-[0.625rem] font-black tracking-widest uppercase text-amber-700/70">
                                    Spontaner Denkzettel
                                  </h4>
                                  <span className="text-[0.625rem] font-bold text-amber-600 bg-amber-100/50 px-2 py-0.5 rounded-full border border-amber-200/50 whitespace-nowrap">
                                    {
                                      (app?.denkzettelNotes || []).filter(
                                        (n) => !n.completed,
                                      ).length
                                    }{" "}
                                    offen
                                  </span>
                                </div>
                                <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar min-h-0 relative z-10">
                                  {(app?.denkzettelNotes || [])
                                    .slice(0, 5)
                                    .map((note: any, idx: number) => {
                                      const stickyColors = [
                                        "bg-yellow-100/80 border-yellow-200/60 text-yellow-900 shadow-sm",
                                        "bg-amber-100/80 border-amber-200/60 text-amber-900 shadow-sm",
                                        "bg-orange-100/80 border-orange-200/60 text-orange-900 shadow-sm",
                                      ];
                                      const stickRotation = [
                                        "rotate-[0.5deg]",
                                        "rotate-[-0.6deg]",
                                        "rotate-[0.3deg]",
                                        "rotate-[-0.4deg]",
                                      ];

                                      const colorClass = note.completed
                                        ? "bg-slate-50/50 border-slate-200/80 opacity-50 shadow-none"
                                        : stickyColors[
                                            idx % stickyColors.length
                                          ];
                                      const rotationClass = note.completed
                                        ? "rotate-0"
                                        : stickRotation[
                                            idx % stickRotation.length
                                          ];

                                      return (
                                        <div
                                          key={note.id}
                                          className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all duration-300 group hover:scale-[1.02] hover:shadow-md ${colorClass} ${rotationClass}`}
                                        >
                                          <button
                                            onClick={() =>
                                              toggleDenkzettelNote(note.id)
                                            }
                                            className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${note.completed ? "bg-slate-800 border-slate-800 text-white" : "border-black/10 bg-white/60 hover:bg-white hover:border-black/30"}`}
                                          >
                                            {note.completed && (
                                              <Check
                                                size={12}
                                                className="stroke-[3]"
                                              />
                                            )}
                                          </button>
                                          <span
                                            className={`text-[0.75rem] font-bold leading-snug flex-1 mt-0.5 ${note.completed ? "line-through opacity-60" : ""}`}
                                          >
                                            {note.text}
                                          </span>
                                          <button
                                            onClick={() =>
                                              deleteDenkzettelNote(note.id)
                                            }
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-black/5 rounded-md transition-all text-black/30 hover:text-rose-600 shrink-0"
                                          >
                                            <X size={14} />
                                          </button>
                                        </div>
                                      );
                                    })}
                                  {(app?.denkzettelNotes || []).length ===
                                    0 && (
                                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
                                      <div className="w-10 h-10 rounded-full bg-amber-100/50 flex items-center justify-center text-amber-500/50">
                                        <StickyNote
                                          size={18}
                                          className="animate-pulse"
                                        />
                                      </div>
                                      <div className="text-[0.71875rem] font-black text-amber-800/60 uppercase tracking-tight">
                                        Dein Denkzettel ist leer
                                      </div>
                                      <div className="text-[0.59375rem] text-amber-700/50 max-w-[190px] leading-snug font-medium">
                                        Notiere schnelle Gedanken,
                                        Unterrichtsideen oder fehlende
                                        Materialien.
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <form
                                  onSubmit={addDenkzettelNote}
                                  className="mt-4 flex gap-2 w-full relative z-10"
                                >
                                  <input
                                    type="text"
                                    value={newDenkzettelText}
                                    onChange={(e: any) =>
                                      setNewDenkzettelText(e.target.value)
                                    }
                                    placeholder="Schnelle Notiz..."
                                    className="flex-1 bg-white border border-amber-200/60 rounded-xl px-4 py-2.5 text-[0.6875rem] focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all placeholder-amber-400/50 font-medium shadow-inner text-slate-800 tracking-wide"
                                  />
                                  <button
                                    type="submit"
                                    className="px-3.5 bg-amber-500 hover:bg-amber-600 text-white border border-amber-600 rounded-xl font-black transition-all shadow-sm flex items-center justify-center cursor-pointer"
                                  >
                                    <Send size={14} />
                                  </button>
                                </form>
                              </div>

                              {/* PRÜFUNGEN / RADAR & GEBURTSTAGE */}
                              <div className="flex flex-col bg-white border border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-sm">
                                <h4 className="text-[0.625rem] font-black tracking-widest uppercase text-slate-500 mb-4">
                                  Radar
                                </h4>

                                <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar">
                                  <div className="space-y-2">
                                    {radarEvents.map((event, idx) => {
                                      const getBadgeStyles = (c: string) => {
                                        switch (c) {
                                          case "rose":
                                            return "bg-rose-50 text-rose-700 border-rose-200";
                                          case "orange":
                                            return "bg-amber-50 text-amber-700 border-amber-200";
                                          case "emerald":
                                            return "bg-emerald-50 text-emerald-700 border-emerald-200";
                                          case "sky":
                                            return "bg-sky-50 text-sky-700 border-sky-200";
                                          case "purple":
                                            return "bg-purple-50 text-purple-700 border-purple-200";
                                          case "fuchsia":
                                            return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200";
                                          case "blue":
                                            return "bg-blue-50 text-blue-700 border-blue-200";
                                          case "violet":
                                            return "bg-violet-50 text-violet-750 border-violet-200";
                                          case "amber":
                                            return "bg-amber-50 text-amber-750 border-amber-200";
                                          default:
                                            return "bg-white text-slate-700 border-slate-200";
                                        }
                                      };
                                      return (
                                        <div
                                          key={idx}
                                          onClick={() =>
                                            setSelectedRadarEvent(event)
                                          }
                                          className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-150 rounded-2xl shadow-sm transition-all hover:bg-indigo-50/50 hover:border-indigo-200 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                                        >
                                          <div
                                            className={`w-14 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 border text-[0.52rem] leading-none uppercase tracking-wider font-extrabold px-1 text-center ${getBadgeStyles(event.color)}`}
                                          >
                                            {event.label}
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <div className="text-[0.75rem] leading-tight font-black text-slate-805 text-wrap leading-tight break-words">
                                              {event.text}
                                            </div>
                                            <div className="text-[0.625rem] font-bold text-slate-400">
                                              {event.sub}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}

                                    {radarEvents.length === 0 && (
                                      <div className="flex flex-col items-center justify-center py-6 text-center">
                                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                                          <Activity
                                            size={16}
                                            className="text-slate-300"
                                          />
                                        </div>
                                        <span className="text-[0.625rem] font-bold text-slate-400 whitespace-nowrap">
                                          Keine Ereignisse.
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => setPage("wochenplanung")}
                                  className="mt-4 w-full py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-xl text-[0.5625rem] font-black uppercase tracking-widest transition-all shadow-sm"
                                >
                                  Details
                                </button>
                              </div>
                            </div>
                          </div>
                        </SortableWidget>
                      )}
                    </React.Fragment>
                  );
                }

                case "group_zone3": {
                  return (
                    <React.Fragment key="group_zone3">
                      {dashboardSettings.showZone3 && (
                        <SortableWidget
                          id="group_zone3"
                          overrideSpan={
                            dashboardSettings.widgetSizes?.[`group_zone3`] ||
                            "col-span-12"
                          }
                          onResize={handleResizeWidget}
                          isEditMode={isEditMode}
                        >
                          <div
                            className="relative h-full flex flex-col p-5 sm:p-6 xl:p-8 rounded-[2.5rem] border text-text-primary shadow-[0_20px_50px_-12px_rgba(0,0,0,0.02)] min-h-[380px]"
                            style={{
                              backgroundColor:
                                "color-mix(in srgb, var(--accent, #10b981) 6%, var(--surface, #ffffff))",
                              borderColor:
                                "color-mix(in srgb, var(--accent, #10b981) 18%, var(--border, #cbd5e1))",
                            }}
                          >
                            {renderEyeOffShortcut("showZone3")}

                            <div className="flex items-center justify-between mb-6 shrink-0 border-b border-slate-200 pb-3">
                              <h3 className="text-[0.75rem] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                <Sparkles
                                  size={14}
                                  className="text-slate-900"
                                />
                                <span>Pädagogische Impulse</span>
                              </h3>
                              <Star size={16} className="text-slate-900" />
                            </div>

                            <div className="flex-1 flex flex-col gap-6">
                              {/* ZEILE 1: Teacher Wellbeing & KI Mentor */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                                {/* WELLBEING REFLEXION */}
                                <div
                                  className="flex flex-col border border-accent/20 rounded-3xl p-6 relative group shadow-sm hover:shadow-md transition-all duration-300"
                                  style={{
                                    backgroundColor:
                                      "color-mix(in srgb, var(--accent) 4%, var(--surface, #ffffff))",
                                  }}
                                >
                                  <div className="absolute top-0 right-0 p-6 opacity-[0.05] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                                    <Heart className="w-48 h-48 text-accent" />
                                  </div>
                                  <div className="flex items-center gap-2 mb-4 relative z-10">
                                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                                    <h3 className="text-[0.625rem] font-black uppercase tracking-widest text-accent">
                                      Teacher Wellbeing
                                    </h3>
                                  </div>

                                  <div className="flex-1 flex flex-col justify-center relative z-10 mb-6">
                                    <h2 className="text-[1.125rem] leading-snug font-bold italic transition-all duration-750 text-balance text-accent">
                                      {heute.getHours() >= 13
                                        ? '"Atme durch. Der Großteil des Tages ist geschafft. Nimm dir einen Moment für dich."'
                                        : '"Man kann nur entfachen, was in einem selbst brennt. Achte gut auf deine Ressourcen."'}
                                    </h2>
                                  </div>

                                  <div className="relative z-10 flex gap-4 w-full mt-auto">
                                    <div className="flex-1 bg-white rounded-2xl p-3.5 flex items-center gap-3 border border-accent/10 transition-all shadow-sm">
                                      <div className="w-10 h-10 rounded-xl bg-accent/5 border border-accent/10 flex items-center justify-center shrink-0">
                                        <Coffee className="w-5 h-5 text-accent" />
                                      </div>
                                      <div>
                                        <div className="text-[0.5625rem] font-black uppercase tracking-widest text-accent/60 font-mono">
                                          Energie
                                        </div>
                                        <div className="text-[0.6875rem] font-black text-accent">
                                          Pause
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex-1 bg-white rounded-2xl p-3.5 flex items-center gap-3 border border-accent/10 transition-all shadow-sm">
                                      <div className="w-10 h-10 rounded-xl bg-accent/5 border border-accent/10 flex items-center justify-center shrink-0">
                                        <Wind className="w-5 h-5 text-accent" />
                                      </div>
                                      <div>
                                        <div className="text-[0.5625rem] font-black uppercase tracking-widest text-accent/60 font-mono">
                                          Fokus
                                        </div>
                                        <div className="text-[0.6875rem] font-black text-accent">
                                          Atem
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* KI INSIGHTS */}
                                <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-3xl p-6 relative shadow-sm hover:shadow-md group transition-all duration-300 overflow-hidden">
                                  <div className="absolute top-0 right-0 w-80 h-80 bg-accent rounded-full -mr-28 -mt-28 blur-3xl opacity-20 group-hover:opacity-30 transition-all duration-1000" />
                                  <div className="flex items-center justify-between mb-5 shrink-0 relative z-10 border-b border-slate-700/50 pb-4">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-accent/20"
                                        style={{
                                          backgroundColor:
                                            "var(--accent, #10b981)",
                                          color: "var(--btn-text, #ffffff)",
                                        }}
                                      >
                                        <Sparkles
                                          size={18}
                                          style={{
                                            color: "var(--btn-text, #ffffff)",
                                          }}
                                        />
                                      </div>
                                      <h4 className="text-[0.6875rem] font-black tracking-widest uppercase text-white">
                                        KI Mentor
                                      </h4>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        loadInsight();
                                      }}
                                      disabled={loadingInsight}
                                      className="w-9 h-9 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all rounded-xl border border-slate-700 shadow-sm flex items-center justify-center cursor-pointer"
                                    >
                                      <RefreshCw
                                        size={14}
                                        className={
                                          loadingInsight ? "animate-spin" : ""
                                        }
                                      />
                                    </button>
                                  </div>
                                  <div className="flex-1 relative z-10 flex flex-col justify-center">
                                    {loadingInsight ? (
                                      <div className="flex flex-col items-center justify-center p-4 space-y-3">
                                        <div className="relative">
                                          <div className="absolute inset-0 bg-accent blur-md opacity-40 rounded-full animate-pulse"></div>
                                          <Loader2 className="w-8 h-8 text-accent animate-spin relative z-10" />
                                        </div>
                                        <span className="text-[0.6875rem] font-black uppercase tracking-widest text-slate-400 animate-pulse">KI Mentor denkt nach...</span>
                                      </div>
                                    ) : aiInsight && !insightError ? (
                                      <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                          <div className="w-1 h-6 bg-accent rounded-full" />
                                          <h2 className="text-[0.875rem] leading-snug font-black text-white tracking-tight uppercase">
                                            {aiInsight.greeting}
                                          </h2>
                                        </div>

                                        <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700 shadow-sm space-y-3">
                                          <div className="flex items-center gap-2">
                                            <div
                                              className="px-2 py-0.5 text-[0.5rem] font-black uppercase rounded-full"
                                              style={{
                                                backgroundColor:
                                                  "var(--accent, #10b981)",
                                                color:
                                                  "var(--btn-text, #ffffff)",
                                              }}
                                            >
                                              Fokus
                                            </div>
                                            <span className="text-[0.6875rem] font-bold text-white">
                                              {aiInsight.focus}
                                            </span>
                                          </div>

                                          <p className="text-[0.75rem] text-white/90 leading-relaxed italic border-l-2 border-slate-500 pl-3">
                                            "{aiInsight.quote}"
                                          </p>

                                          <div className="h-px bg-slate-700/50 my-1" />

                                          <div className="space-y-1">
                                            <span className="text-[0.5625rem] font-black uppercase text-accent tracking-widest block">
                                              Pädagogischer Tipp
                                            </span>
                                            <p className="text-[0.75rem] text-white/90 leading-snug font-medium">
                                              {aiInsight.tip}
                                            </p>
                                          </div>

                                          {aiInsight.studentSupportExample && (
                                            <div className="mt-3 bg-slate-900/80 p-3 rounded-xl border border-slate-700/50 shadow-inner">
                                              <span className="text-[0.5625rem] font-black uppercase text-accent tracking-widest block mb-1">
                                                Fokus:{" "}
                                                {aiInsight.focusedStudentName}
                                              </span>
                                              <p className="text-[0.71875rem] text-white/80 leading-relaxed font-medium">
                                                {
                                                  aiInsight.studentSupportExample
                                                }
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center justify-center py-6 text-center opacity-70">
                                        <Sparkles
                                          size={24}
                                          className="text-white/60 mb-3"
                                        />
                                        <span className="text-[0.6875rem] font-black uppercase tracking-widest text-white/60 mb-4">
                                          KI Mentor aktivieren
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.preventDefault();
                                            loadInsight();
                                          }}
                                          className="px-5 py-2.5 rounded-xl border font-bold tracking-wider uppercase transition-colors shadow-sm cursor-pointer hover:brightness-110 active:scale-95"
                                          style={{
                                            backgroundColor:
                                              "var(--accent, #10b981)",
                                            color: "var(--btn-text, #ffffff)",
                                            borderColor:
                                              "var(--accent, #10b981)",
                                          }}
                                        >
                                          Generieren
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* ZEILE 2: Haustier & Klassenglas */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                                {/* CLASS PET (KLASSEN-HAUSTIER) WIDGET */}
                                <div className="h-full">
                                  <MemoizedClassPetWidget />
                                </div>

                                {/* KLASSENGLAS WIDGET */}
                                <div className="h-full">
                                  {dashboardSettings.showKlassenglas && (
                                    <MemoizedDashboardKlassenglasWidget />
                                  )}
                                  {!dashboardSettings.showKlassenglas && (
                                    <div className="bg-surface p-6 rounded-[2.5rem] border border-border shadow-sm flex flex-col justify-center items-center h-full text-center space-y-3 min-h-[360px]">
                                      <div className="w-16 h-16 bg-surface2 rounded-full flex items-center justify-center text-[1.5rem] leading-normal opacity-50">
                                        🏺
                                      </div>
                                      <h4 className="text-[0.875rem] leading-snug font-black text-text-muted">
                                        Klassenglas deaktiviert
                                      </h4>
                                      <button
                                        onClick={() =>
                                          setDashboardSettings((prev: any) => ({
                                            ...prev,
                                            showKlassenglas: true,
                                          }))
                                        }
                                        className="px-4 py-2 bg-accent/10 text-accent rounded-xl font-bold text-[0.75rem] leading-snug hover:bg-accent/20 transition-all cursor-pointer"
                                      >
                                        Aktivieren
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* ZEILE 3: Interaktions-Log */}
                              <div className="grid grid-cols-1 gap-6 items-stretch">
                                <div className="h-full">
                                  <DashboardInteractionWidget />
                                </div>
                              </div>
                            </div>
                          </div>
                        </SortableWidget>
                      )}
                    </React.Fragment>
                  );
                }
                case "group_zone4": {
                  const activeFaecherList =
                    app?.faecher && app.faecher.length > 0
                      ? app.faecher.filter(f => app.fachConfig?.[f]?.unterrichtet !== false)
                      : FAECHER_ALLE;
                  const selectedCurveData = analyticsData.subjectWiseData
                    .filter(
                      (s) =>
                        selectedCurveSubjects.includes(s.fullName) ||
                        selectedCurveSubjects.length === 0,
                    )
                    .map((s) => ({
                      ...s,
                      chartSchnitt: s.Schnitt !== null ? s.Schnitt : 3.0,
                    }));
                  return (
                    <SortableWidget
                      id="group_zone4"
                      key="group_zone4"
                      onResize={handleResizeWidget}
                      className="col-span-12"
                      isEditMode={isEditMode}
                    >
                      <div
                        className="border p-5 sm:p-8 lg:p-10 rounded-[3.5rem] text-text-primary shadow-[0_30px_70px_-20px_rgba(0,0,0,0.02)] relative"
                        style={{
                          backgroundColor:
                            "color-mix(in srgb, var(--accent, #10b981) 12%, var(--surface, #ffffff))",
                          borderColor:
                            "color-mix(in srgb, var(--accent, #10b981) 25%, var(--border, #cbd5e1))",
                        }}
                      >
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-border/50 pb-8">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-surface3 text-text-primary flex items-center justify-center border border-border shadow-sm">
                                <BarChart3 size={20} />
                              </div>
                              <h3 className="text-[0.75rem] font-black uppercase tracking-[0.4em] text-text-muted font-sans">
                                Klassen-Analyse
                              </h3>
                            </div>
                            <h2 className="text-4xl font-black text-text-primary tracking-tighter uppercase leading-none">
                              Diagnostisches Dashboard
                            </h2>
                          </div>
                          <div className="flex flex-wrap gap-4">
                            <div className="px-5 py-2.5 bg-surface rounded-2xl border border-border shadow-sm flex flex-col justify-center">
                              <div className="text-[0.5625rem] font-black uppercase text-text-muted tracking-widest leading-none mb-1">
                                Hours/Year
                              </div>
                              <div className="text-[1.25rem] leading-normal font-black text-text-primary leading-none">
                                {analyticsData.teacherStats.hours || "0"}
                              </div>
                            </div>
                            <div className="px-5 py-2.5 bg-surface rounded-2xl border border-border shadow-sm flex flex-col justify-center">
                              <div className="text-[0.5625rem] font-black uppercase text-text-muted tracking-widest leading-none mb-1">
                                Tests Done
                              </div>
                              <div className="text-[1.25rem] leading-normal font-black text-text-primary leading-none">
                                {analyticsData.teacherStats.tests || "0"}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
                          {/* KPIS */}
                          <div className="md:col-span-3 flex flex-col gap-4 sm:gap-5">
                            <div className="bg-surface border border-border p-5 sm:p-6 rounded-[2rem] shadow-sm hover:shadow-xl transition-all group">
                              <div className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-text-muted mb-2 group-hover:text-rose-500 transition-colors">
                                Anwesenheit
                              </div>
                              <div className="text-5xl font-black text-text-primary tracking-tighter mb-4">
                                {analyticsData.attendanceRate}%
                              </div>
                              <div className="h-1.5 bg-surface2 rounded-full ">
                                <div
                                  className="h-full bg-text-primary transition-all duration-1000"
                                  style={{
                                    width: `${analyticsData.attendanceRate}%`,
                                  }}
                                />
                              </div>
                              <div className="text-[0.5625rem] font-black text-text-muted uppercase tracking-wider mt-2.5">
                                Übers Schuljahr
                              </div>
                            </div>

                            <div className="bg-surface border border-border p-5 sm:p-6 rounded-[2rem] shadow-sm hover:shadow-xl transition-all group">
                              <div className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-text-muted mb-2 group-hover:text-sky-500 transition-colors">
                                Notenschnitt Ø
                              </div>
                              <div className="text-5xl font-black text-text-primary tracking-tighter mb-4">
                                {analyticsData.avg}
                              </div>
                              <div className="flex gap-1.5">
                                {[1, 2, 3, 4, 5].map((i) => (
                                  <div
                                    key={i}
                                    className={`h-1.5 flex-1 rounded-full ${i <= Math.round(parseFloat(analyticsData.avg === "—" ? "0" : analyticsData.avg)) ? "bg-text-primary" : "bg-surface2"}`}
                                  />
                                ))}
                              </div>
                              <div className="text-[0.5625rem] font-black text-text-muted uppercase tracking-wider mt-2.5">
                                Zensuren gesamt
                              </div>
                            </div>
                          </div>

                          {/* SUBJECT AVERAGE GRADES CHART (FLÄCHENDIAGRAMM + ADD/DELETE SUBJ CONTROLS) */}
                          <div className="md:col-span-5 bg-surface border border-border p-5 sm:p-6 rounded-[2rem] shadow-sm flex flex-col justify-between">
                            <div className="mb-6">
                              <div className="flex items-center gap-2 mb-2">
                                <TrendingUp
                                  size={16}
                                  className="text-text-muted"
                                />
                                <h4 className="text-[0.625rem] font-black uppercase tracking-[0.3em] text-text-muted">
                                  Notenverlauf
                                </h4>
                              </div>
                              <p className="text-[0.6875rem] font-bold text-text-secondary mt-1">
                                Klick auf die Fächer-Buttons, um Fächer
                                hinzufügen/löschen (Note 1 = oben)
                              </p>
                            </div>

                            {/* Dynamic Subject Toggles */}
                            <div className="flex flex-wrap gap-1.5 mb-6">
                              {activeFaecherList.map((subject) => {
                                const isSelected =
                                  selectedCurveSubjects.includes(subject) ||
                                  (selectedCurveSubjects.length === 0 &&
                                    activeFaecherList.includes(subject));
                                return (
                                  <button
                                    key={subject}
                                    type="button"
                                    onClick={() => {
                                      const currentSelected =
                                        selectedCurveSubjects.length === 0
                                          ? activeFaecherList
                                          : selectedCurveSubjects;
                                      if (isSelected) {
                                        if (currentSelected.length > 1) {
                                          setSelectedCurveSubjects(
                                            currentSelected.filter(
                                              (s) => s !== subject,
                                            ),
                                          );
                                        } else {
                                          alert(
                                            "Mindestens ein Fach muss im Diagramm aktiv bleiben.",
                                          );
                                        }
                                      } else {
                                        setSelectedCurveSubjects((prev) => {
                                          const base =
                                            prev.length === 0
                                              ? activeFaecherList
                                              : prev;
                                          return [...base, subject];
                                        });
                                      }
                                    }}
                                    className={`px-3 py-2 rounded-xl text-[0.6875rem] font-black uppercase tracking-wider transition-all outline-none cursor-pointer hover:scale-[1.03] ${
                                      isSelected
                                        ? "bg-slate-100 text-black border-2 border-white shadow-xl"
                                        : "bg-white text-slate-400 border border-slate-100 hover:text-slate-900 hover:bg-slate-50"
                                    }`}
                                  >
                                    {isSelected ? "✓ " : "+ "}
                                    {subject}
                                  </button>
                                );
                              })}
                            </div>

                            <div className="h-[220px] min-h-[220px] min-w-0 w-full relative">
                              {selectedCurveData.length > 0 ? (
                                <ResponsiveContainer
                                  width="100%"
                                  height="100%"
                                  minWidth={0}
                                  minHeight={220}
                                  initialDimension={{ width: 800, height: 220 }}
                                >
                                  <AreaChart
                                    data={selectedCurveData}
                                    margin={{
                                      top: 10,
                                      right: 10,
                                      left: -20,
                                      bottom: 5,
                                    }}
                                  >
                                    <defs>
                                      <linearGradient
                                        id="colorAcademicCurve"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                      >
                                        <stop
                                          offset="5%"
                                          stopColor="#0f172a"
                                          stopOpacity={0.3}
                                        />
                                        <stop
                                          offset="95%"
                                          stopColor="#0f172a"
                                          stopOpacity={0.01}
                                        />
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                      strokeDasharray="3 3"
                                      vertical={false}
                                      stroke="#f1f5f9"
                                    />
                                    <XAxis
                                      dataKey="name"
                                      axisLine={false}
                                      tickLine={false}
                                      interval={0}
                                      angle={-35}
                                      textAnchor="end"
                                      tick={{
                                        fontSize: 9,
                                        fontWeight: 900,
                                        fill: "#64748b",
                                      }}
                                    />
                                    <YAxis
                                      domain={[1, 5]}
                                      ticks={[1, 2, 3, 4, 5]}
                                      reversed={true}
                                      axisLine={false}
                                      tickLine={false}
                                      tick={{
                                        fontSize: 10,
                                        fill: "#94a3b8",
                                        fontWeight: 700,
                                      }}
                                    />
                                    <Tooltip
                                      content={({ active, payload }) => {
                                        if (
                                          active &&
                                          payload &&
                                          payload.length
                                        ) {
                                          const data = payload[0].payload;
                                          return (
                                            <div className="bg-slate-950 text-white p-4 rounded-3xl border border-slate-800 shadow-xl text-[0.75rem] leading-tight space-y-1.5 font-sans">
                                              <p className="font-extrabold uppercase tracking-wide text-slate-400 text-[0.625rem]">
                                                {data.fullName}
                                              </p>
                                              <div className="flex items-center gap-2">
                                                <span
                                                  className="w-2.5 h-2.5 rounded-full"
                                                  style={{
                                                    backgroundColor: data.color,
                                                  }}
                                                />
                                                <span className="font-black text-white text-[0.8125rem]">
                                                  Schnitt: Ø{" "}
                                                  {data.displaySchnitt}
                                                </span>
                                              </div>
                                              {data.isFallback && (
                                                <p className="text-[0.5625rem] font-bold text-slate-500 uppercase tracking-widest leading-none">
                                                  Keine Noteneinträge
                                                  (Richtwert)
                                                </p>
                                              )}
                                            </div>
                                          );
                                        }
                                        return null;
                                      }}
                                    />
                                    <Area
                                      type="monotone"
                                      dataKey="chartSchnitt"
                                      stroke="#475569"
                                      strokeWidth={4}
                                      fillOpacity={1}
                                      fill="url(#colorAcademicCurve)"
                                      dot={({ cx, cy, payload }) => (
                                        <circle
                                          key={payload.id}
                                          cx={cx}
                                          cy={cy}
                                          r={5}
                                          fill={payload.color}
                                          stroke="white"
                                          strokeWidth={2}
                                        />
                                      )}
                                      activeDot={{ r: 7 }}
                                      name="Schnitt"
                                      baseValue={5}
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
                              ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 font-bold text-[0.75rem] leading-tight py-10">
                                  Keine Daten aktiv
                                </div>
                              )}
                            </div>
                          </div>

                          {/* BEHAVIOR PIE CHART */}
                          <div className="md:col-span-4 bg-white border border-slate-200 p-5 sm:p-6 rounded-[2rem] shadow-sm flex flex-col items-center justify-between text-center">
                            <div className="w-full text-left mb-6">
                              <div className="flex items-center gap-2 mb-2">
                                <Heart size={16} className="text-slate-400" />
                                <h4 className="text-[0.625rem] font-black uppercase tracking-[0.3em] text-slate-400 font-sans">
                                  Status
                                </h4>
                              </div>
                              <p className="text-[1.5rem] leading-normal font-black text-slate-900 tracking-tight leading-none uppercase">
                                Soziale Balance
                              </p>
                            </div>

                            <div className="w-full aspect-square relative flex items-center justify-center">
                              {analyticsData.hasBehaviorData ? (
                                <ResponsiveContainer
                                  width="100%"
                                  height="100%"
                                  minWidth={0}
                                  minHeight={0}
                                  initialDimension={{ width: 320, height: 320 }}
                                >
                                  <PieChart>
                                    <Pie
                                      data={analyticsData.behaviorPieData}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={80}
                                      outerRadius={110}
                                      paddingAngle={10}
                                      dataKey="value"
                                      stroke="none"
                                    >
                                      {analyticsData.behaviorPieData.map(
                                        (entry: any, index: number) => (
                                          <Cell
                                            key={`cell-${index}`}
                                            fill={entry.color}
                                          />
                                        ),
                                      )}
                                    </Pie>
                                    <Tooltip
                                      content={({ active, payload }) => {
                                        if (
                                          active &&
                                          payload &&
                                          payload.length
                                        ) {
                                          const data = payload[0].payload;
                                          return (
                                            <div className="bg-slate-950 text-white p-3.5 rounded-[1.5rem] border border-slate-800 shadow-xl text-[0.75rem] leading-tight space-y-1 font-sans">
                                              <div className="flex items-center gap-2">
                                                <span className="text-[0.875rem] leading-snug">
                                                  {data.emoji}
                                                </span>
                                                <span className="font-extrabold uppercase tracking-widest text-slate-400 text-[0.625rem]">
                                                  {data.name}
                                                </span>
                                              </div>
                                              <p className="font-black text-white text-[0.75rem] pl-5 leading-none mt-1">
                                                {data.value}{" "}
                                                {data.value === 1
                                                  ? "Eintrag"
                                                  : "Einträge"}
                                              </p>
                                            </div>
                                          );
                                        }
                                        return null;
                                      }}
                                    />
                                  </PieChart>
                                </ResponsiveContainer>
                              ) : (
                                <div className="w-48 h-48 rounded-full border-4 border-dashed border-slate-100 flex items-center justify-center text-slate-300">
                                  <Activity size={48} />
                                </div>
                              )}
                              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">
                                  Einträge
                                </span>
                                <span className="text-4xl font-black text-slate-900">
                                  {(app.statusLog || []).length}
                                </span>
                              </div>
                            </div>

                            {/* Dynamic Social Balance Chronik Feed */}
                            <div className="w-full text-left border-t border-slate-100 pt-6 mt-4">
                              <h4 className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 flex items-center gap-1.5 font-sans">
                                <Activity
                                  size={12}
                                  className="text-slate-400"
                                />
                                <span>Social Balance Chronik</span>
                              </h4>
                              {app.statusLog && app.statusLog.length > 0 ? (
                                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1 no-scrollbar w-full flex-1">
                                  {app.statusLog
                                    .slice()
                                    .sort((a, b) => b.timestamp - a.timestamp)
                                    .slice(0, 3)
                                    .map((log: any) => {
                                      const student = (
                                        app?.schueler || []
                                      ).find(
                                        (s: any) => s.id === log.schuelerId,
                                      );
                                      const fallbackStages = [
                                        {
                                          id: "1",
                                          label: "Super",
                                          color: "#10b981",
                                          icon: "🌟",
                                        },
                                        {
                                          id: "2",
                                          label: "Neutral",
                                          color: "#64748b",
                                          icon: "😐",
                                        },
                                        {
                                          id: "3",
                                          label: "Störung",
                                          color: "#f43f5e",
                                          icon: "⚠️",
                                        },
                                      ];
                                      const stage =
                                        (
                                          app?.behavior_stages || fallbackStages
                                        ).find(
                                          (bst: any) => bst.id === log.iconId,
                                        ) || fallbackStages[1];
                                      const emoji = stage?.icon || "📝";
                                      const color = stage?.color || "#64748b";
                                      const logZeit = new Date(
                                        log.timestamp,
                                      ).toLocaleTimeString("de-DE", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      });
                                      return (
                                        <div
                                          key={log.id}
                                          className="flex items-start gap-2.5 p-2.5 bg-slate-50 border border-slate-100 rounded-2xl shadow-3xs hover:border-slate-300 transition-all font-sans"
                                        >
                                          <div
                                            className="w-7 h-7 rounded-xl flex items-center justify-center text-[0.875rem] leading-snug shrink-0 border bg-white"
                                            style={{
                                              borderColor: `${color}25`,
                                            }}
                                          >
                                            {student?.emoji || "🧑‍🎓"}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1.5 font-sans">
                                              <span className="text-[0.65625rem] font-black text-slate-900 text-wrap leading-tight break-words">
                                                {student
                                                  ? `${student.vorname} ${student.nachname.charAt(0)}.`
                                                  : "Schüler:in"}
                                              </span>
                                              <span className="text-[0.53125rem] font-bold text-slate-400 font-mono shrink-0 flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-100 shadow-3xs">
                                                <span className="text-[0.625rem] leading-none">
                                                  {emoji}
                                                </span>
                                                <span>{logZeit} Uhr</span>
                                              </span>
                                            </div>
                                            <p className="text-[0.59375rem] font-medium text-slate-500 mt-0.5 text-wrap leading-tight break-words leading-none font-sans">
                                              {log.comment ||
                                                stage?.label ||
                                                "Eingetragen"}
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              ) : (
                                <div className="text-[0.59375rem] font-bold text-slate-400 italic py-2 text-center font-sans">
                                  Keine Einträge erfasst.
                                </div>
                              )}
                            </div>
                            <div className="hidden" />
                          </div>
                        </div>
                      </div>
                    </SortableWidget>
                  );
                }
                default:
                  return null;
              }
            })}
          </div>
        </SortableContext>
      </DndContext>
      )}
      {/* ============================================== */}
      {/* CONFIGURATION SIDEBAR OVERLAY PANEL             */}
      {/* ============================================== */}
      <AnimatePresence>
        {showCustomizePanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex justify-end"
            onClick={() => setShowCustomizePanel(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-full max-w-lg lg:max-w-4xl bg-neutral-950 border-l border-neutral-800 text-white flex flex-col h-full shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
                <div>
                  <h3 className="text-[1.125rem] leading-normal font-black uppercase tracking-tight text-white flex items-center gap-2">
                    <Settings2 size={20} className="text-accent" />
                    <span>Dashboard anpassen</span>
                  </h3>
                  <p className="text-[0.6875rem] text-neutral-400 font-bold uppercase tracking-widest mt-1">
                    Struktur & Vorschau-Zeiten
                  </p>
                </div>
                <button
                  onClick={() => setShowCustomizePanel(false)}
                  className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-all hover:scale-105"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 custom-scrollbar">
                {/* Section: Darstellung & Typografie (Farbe, Schriftart, Größe & Stil) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-neutral-300">
                    <Palette size={16} className="text-accent" />
                    <span className="text-[0.6875rem] font-black uppercase tracking-wider text-white">
                      Darstellung &amp; Schriftgestaltung
                    </span>
                  </div>
                  <div className="p-4 bg-neutral-900/60 rounded-2xl border border-neutral-800 space-y-5">
                    {/* 1. Farbschema */}
                    <div>
                      <label className="text-[0.65625rem] font-black uppercase text-neutral-400 block mb-2">
                        Farbe &amp; Farb-Theme
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {AESTHETIC_THEMES.map((theme) => {
                          const isSelected = (app?.theme || "classic_light") === theme.id;
                          return (
                            <button
                              key={theme.id}
                              type="button"
                              onClick={() => setApp((prev: any) => ({ ...prev, theme: theme.id }))}
                              className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-neutral-800 border-accent text-white ring-2 ring-accent/30 shadow-xs"
                                  : "bg-neutral-950/70 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                              }`}
                            >
                              <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${theme.color}`} />
                              <span className="text-[0.6875rem] font-bold truncate">{theme.label}</span>
                              {isSelected && <Check size={12} className="ml-auto text-accent shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Schriftart */}
                    <div>
                      <label className="text-[0.65625rem] font-black uppercase text-neutral-400 block mb-2 flex items-center gap-1.5">
                        <Type size={13} className="text-accent" />
                        <span>Schriftart</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {DASHBOARD_CURATED_FONTS.map((f) => {
                          const isCurrent = (app?.settings?.fontFamily || "standard") === f.id;
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => {
                                setApp((prev: any) => ({
                                  ...prev,
                                  settings: { ...prev.settings, fontFamily: f.id },
                                }));
                              }}
                              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                isCurrent
                                  ? "bg-neutral-800 border-accent text-white ring-2 ring-accent/30 shadow-xs"
                                  : "bg-neutral-950/70 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="text-[0.75rem] font-black text-white">{f.label}</span>
                                {isCurrent && <Check size={12} className="text-accent" />}
                              </div>
                              <span className="text-[0.625rem] text-neutral-400 truncate mt-0.5">{f.sub}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Schriftgröße & Schriftstil */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-800">
                      {/* Schriftgröße */}
                      <div>
                        <label className="text-[0.65625rem] font-black uppercase text-neutral-400 block mb-2">
                          Schriftgröße
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {DASHBOARD_FONT_SIZES.map((sz) => {
                            const isSelected = (app?.settings?.zoomLevel || app?.settings?.fontSize || "standard") === sz.id;
                            return (
                              <button
                                key={sz.id}
                                type="button"
                                onClick={() => {
                                  setApp((prev: any) => ({
                                    ...prev,
                                    settings: { ...prev.settings, zoomLevel: sz.id, fontSize: sz.id },
                                  }));
                                }}
                                className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                                  isSelected
                                    ? "bg-accent/20 border-accent text-white font-black shadow-xs"
                                    : "bg-neutral-950/70 border-neutral-800 text-neutral-400 font-bold hover:border-neutral-700"
                                }`}
                              >
                                <div className="text-[0.6875rem] leading-tight">{sz.label}</div>
                                <div className="text-[0.5625rem] text-neutral-400 mt-0.5">{sz.scale}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Schriftstil: Fett & Kursiv */}
                      <div>
                        <label className="text-[0.65625rem] font-black uppercase text-neutral-400 block mb-2">
                          Schriftstil
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {/* Fett */}
                          <button
                            type="button"
                            onClick={() => {
                              const nextWeight = (app?.settings?.fontWeight === "bold") ? "normal" : "bold";
                              setApp((prev: any) => ({
                                ...prev,
                                settings: { ...prev.settings, fontWeight: nextWeight },
                              }));
                            }}
                            className={`py-2 px-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              app?.settings?.fontWeight === "bold"
                                ? "bg-accent/20 border-accent text-white font-black ring-1 ring-accent/30 shadow-xs"
                                : "bg-neutral-950/70 border-neutral-800 text-neutral-400 font-bold hover:border-neutral-700"
                            }`}
                          >
                            <Bold size={13} />
                            <span className="text-[0.6875rem]">{app?.settings?.fontWeight === "bold" ? "Fett (Aktiv)" : "Fett"}</span>
                          </button>

                          {/* Kursiv */}
                          <button
                            type="button"
                            onClick={() => {
                              const nextStyle = (app?.settings?.fontStyle === "italic") ? "normal" : "italic";
                              setApp((prev: any) => ({
                                ...prev,
                                settings: { ...prev.settings, fontStyle: nextStyle },
                              }));
                            }}
                            className={`py-2 px-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              app?.settings?.fontStyle === "italic"
                                ? "bg-accent/20 border-accent text-white font-black italic ring-1 ring-accent/30 shadow-xs"
                                : "bg-neutral-950/70 border-neutral-800 text-neutral-400 font-bold hover:border-neutral-700"
                            }`}
                          >
                            <Italic size={13} />
                            <span className="text-[0.6875rem]">{app?.settings?.fontStyle === "italic" ? "Kursiv (Aktiv)" : "Kursiv"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Schnell-Voreinstellungen (Presets) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-neutral-300">
                    <Sparkles size={16} className="text-accent" />
                    <span className="text-[0.6875rem] font-black uppercase tracking-wider text-white">
                      Dashboard aufräumen / Voreinstellungen
                    </span>
                  </div>
                  <div className="p-4 bg-neutral-900/60 rounded-2xl border border-neutral-800 space-y-3">
                    <p className="text-[0.65625rem] text-neutral-400 font-medium leading-relaxed">
                      Wähle eine für deinen Kontext optimierte Voreinstellung.
                      Die Module passen sich organisch (Tageszeit, Priorität) an
                      die Situation an.
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDashboardSettings((prev) => ({
                            ...prev,
                            showZone1: true,
                            showZone2: true,
                            showZone3: false,
                          }));
                          showToast("Morgen-Briefing aktiviert!", "success");
                        }}
                        className={`p-4 hover:bg-neutral-850 active:scale-95 border hover:border-neutral-750 text-left rounded-xl transition-all ${dashboardSettings.showZone1 && dashboardSettings.showZone2 && !dashboardSettings.showZone3 ? "bg-neutral-850 border-neutral-700" : "bg-neutral-950 border-neutral-850"}`}
                      >
                        <div className="text-[0.875rem] leading-snug font-black text-amber-400 flex items-center gap-2 mb-1">
                          <Sunrise size={16} /> <span>Morgen-Briefing</span>
                        </div>
                        <div className="text-[0.625rem] text-neutral-400 leading-tight">
                          Vorbereitung auf den Tag. Zeigt Stundenplan,
                          Fokus-Schüler und To-Dos für heute. (Zone 1 & 2)
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDashboardSettings((prev) => ({
                            ...prev,
                            showZone1: true,
                            showZone2: false,
                            showZone3: false,
                          }));
                          showToast(
                            "Unterrichts-Fokus (Zen) aktiviert!",
                            "success",
                          );
                        }}
                        className={`p-4 hover:bg-neutral-850 active:scale-95 border hover:border-neutral-750 text-left rounded-xl transition-all ${dashboardSettings.showZone1 && !dashboardSettings.showZone2 && !dashboardSettings.showZone3 ? "bg-neutral-850 border-neutral-700" : "bg-neutral-950 border-neutral-850"}`}
                      >
                        <div className="text-[0.875rem] leading-snug font-black text-teal-400 flex items-center gap-2 mb-1">
                          <Focus size={16} />{" "}
                          <span>Unterrichts-Fokus (Zen)</span>
                        </div>
                        <div className="text-[0.625rem] text-neutral-400 leading-tight">
                          Minimalistischer Zen-Modus während des Unterrichts.
                          Reduziert auf den laufenden Stundenplan und
                          Fokus-Notizen. (Nur Zone 1)
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDashboardSettings((prev) => ({
                            ...prev,
                            showZone1: false,
                            showZone2: true,
                            showZone3: true,
                          }));
                          showToast("Planungs-Ansicht aktiviert!", "success");
                        }}
                        className={`p-4 hover:bg-neutral-850 active:scale-95 border hover:border-neutral-750 text-left rounded-xl transition-all ${!dashboardSettings.showZone1 && dashboardSettings.showZone2 && dashboardSettings.showZone3 ? "bg-neutral-850 border-neutral-700" : "bg-neutral-950 border-neutral-850"}`}
                      >
                        <div className="text-[0.875rem] leading-snug font-black text-indigo-400 flex items-center gap-2 mb-1">
                          <Brain size={16} />{" "}
                          <span>Wochenplanung & Übersicht</span>
                        </div>
                        <div className="text-[0.625rem] text-neutral-400 leading-tight">
                          Das große Ganze. Zeigt KI-Insights, Lehrplan-Abdeckung
                          und organisatorische To-Dos. (Zone 2 & 3)
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-neutral-300">
                    <Clock size={16} className="text-accent" />
                    <span className="text-[0.6875rem] font-black uppercase tracking-wider">
                      Stundenplan-Vorschau (Vorschau-Zeiten)
                    </span>
                  </div>
                  <div className="p-5 bg-neutral-900/40 rounded-2xl border border-neutral-800 space-y-4">
                    {/* 3-Way Mode Selector */}
                    <div className="space-y-2">
                      <span className="text-[0.6875rem] text-neutral-300 font-bold uppercase tracking-wider block">
                        Stundenplan Vorschau-Verhalten:
                      </span>
                      <div className="grid grid-cols-3 gap-2 bg-neutral-950 p-1 rounded-2xl border border-neutral-800/60">
                        <button
                          type="button"
                          onClick={() => {
                            setVorschauModus("heute");
                            showToast("Modus: Starr Heute aktiv", "info");
                          }}
                          className={`py-2 px-3 rounded-xl text-center text-xs font-black transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                            vorschauModus === "heute"
                              ? "bg-neutral-800 text-white shadow ring-1 ring-neutral-700"
                              : "text-neutral-400 hover:text-neutral-200"
                          }`}
                        >
                          <Calendar size={14} className={vorschauModus === 'heute' ? 'text-emerald-400' : 'text-neutral-500'} />
                          <span>Starr Heute</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setVorschauModus("automatik");
                            showToast("Modus: Zeit-Automatik aktiv", "info");
                          }}
                          className={`py-2 px-3 rounded-xl text-center text-xs font-black transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                            vorschauModus === "automatik"
                              ? "bg-neutral-800 text-white shadow ring-1 ring-neutral-700"
                              : "text-neutral-400 hover:text-neutral-200"
                          }`}
                        >
                          <Sparkles size={14} className={vorschauModus === 'automatik' ? 'text-indigo-400' : 'text-neutral-500'} />
                          <span>Zeit-Automatik</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setVorschauModus("morgen");
                            showToast("Modus: Starr Morgen aktiv", "info");
                          }}
                          className={`py-2 px-3 rounded-xl text-center text-xs font-black transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                            vorschauModus === "morgen"
                              ? "bg-neutral-800 text-white shadow ring-1 ring-neutral-700"
                              : "text-neutral-400 hover:text-neutral-200"
                          }`}
                        >
                          <ArrowRight size={14} className={vorschauModus === 'morgen' ? 'text-amber-400' : 'text-neutral-500'} />
                          <span>Starr Morgen</span>
                        </button>
                      </div>
                    </div>

                    {vorschauModus === "automatik" && (
                      <div className="space-y-4 pt-2 border-t border-neutral-800/60">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[0.6875rem] text-neutral-300 font-bold">
                              Uhrzeit für den automatischen Wechsel:
                            </span>
                            <span className="text-[0.75rem] leading-tight font-black text-amber-400">
                              {vorschauStunde}:00 Uhr
                            </span>
                          </div>
                          <div className="grid grid-cols-7 gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800/40 w-full overflow-hidden">
                            {[12, 14, 15, 16, 17, 18, 20].map((hour) => (
                              <button
                                key={hour}
                                type="button"
                                onClick={() => setVorschauStunde(hour)}
                                className={`py-1.5 px-0.5 text-[0.625rem] font-black rounded-lg transition-all text-center w-full min-w-0 whitespace-nowrap ${
                                  vorschauStunde === hour
                                    ? "bg-neutral-800 text-white shadow border border-neutral-700"
                                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 bg-transparent"
                                }`}
                              >
                                {hour}h
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Dynamic Explainer Box */}
                        <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800/60 text-[0.6875rem] text-neutral-400 leading-normal space-y-1">
                          <div className="font-bold text-amber-400 flex items-center gap-1.5 mb-1 text-[0.71875rem]">
                            <span>💡 So funktioniert die Zeit-Automatik:</span>
                          </div>
                          <div>• <span className="text-white font-medium">Montag bis Donnerstag</span> ab <span className="text-white font-black">{vorschauStunde}:00 Uhr</span> schaltet das Dashboard automatisch auf <span className="text-white font-medium">morgen</span> um.</div>
                          <div>• Am <span className="text-white font-medium">Freitag</span> ab <span className="text-white font-black">{vorschauStunde}:00 Uhr</span> sowie am ganzen <span className="text-white font-medium">Wochenende</span> wird der Stundenplan für <span className="text-white font-medium">Montag</span> angezeigt.</div>
                          <div>• Zu allen anderen Zeiten siehst du den Stundenplan von <span className="text-white">heute</span>.</div>
                        </div>
                      </div>
                    )}

                    {vorschauModus === "heute" && (
                      <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800/60 text-[0.6875rem] text-emerald-400 leading-normal">
                        ☀️ <strong>Starr Heute aktiv:</strong> Das Dashboard zeigt zu jeder Uhrzeit starr den aktuellen Tag an. Perfekt, wenn du am Nachmittag noch das aktuelle Tagesprogramm sehen möchtest.
                      </div>
                    )}

                    {vorschauModus === "morgen" && (
                      <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800/60 text-[0.6875rem] text-amber-400 leading-normal">
                        🔮 <strong>Starr Morgen aktiv:</strong> Das Dashboard zeigt standardmäßig immer das Programm des nächsten Schultages an (Montag bis Donnerstag schaltet auf morgen, Freitag und am Wochenende auf Montag). Bestens geeignet für Lehrer, die am Vortag arbeiten.
                      </div>
                    )}

                    {/* Info about manual controls */}
                    <div className="p-4 bg-indigo-950/40 rounded-xl border border-indigo-900/40 text-[0.6875rem] leading-normal text-indigo-300 space-y-1">
                      <div className="font-black text-indigo-200 flex items-center gap-1.5 mb-1 text-[0.71875rem]">
                        <span>📅 Manueller Planungs-Modus:</span>
                      </div>
                      <p className="font-semibold text-indigo-200/90 leading-relaxed">
                        Zusätzlich kannst du auf dem Dashboard jederzeit manuell <strong>tageweise</strong> oder <strong>wochenweise</strong> blättern. 
                        Nutze die Pfeiltasten (‹, ›, «, ») neben der Datumsanzeige im Header, um beliebig in der Zeit zu reisen – perfekt für deine tageweise und wochenweise Planung!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section: Dashboard-Struktur (Zonen & Widgets) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-neutral-300">
                    <Grid size={16} className="text-accent" />
                    <span className="text-[0.6875rem] font-black uppercase tracking-wider">
                      Dashboard-Struktur & Zonen-Sichtbarkeit
                    </span>
                  </div>
                  <div className="p-5 bg-neutral-900/40 rounded-2xl border border-neutral-800 space-y-4">
                    <p className="text-[0.65625rem] text-neutral-400 font-medium leading-relaxed">
                      Blende ganze Abschnitte (Zonen) des Dashboards aus oder ein, um die Oberfläche nach deinen Wünschen anzupassen.
                    </p>

                    <div className="space-y-2.5">
                      {/* Zone 1 Toggle */}
                      <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-850">
                        <div>
                          <span className="text-[0.75rem] font-bold text-neutral-200 block">Zone 1: Unterricht & Tag</span>
                          <span className="text-[0.625rem] text-neutral-400 block">Stundenplan-Agenda, Morgenaufgaben & Tages-Fokus</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDashboardSettings((prev: any) => ({ ...prev, showZone1: !prev.showZone1 }))}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            dashboardSettings.showZone1 ? "bg-emerald-500" : "bg-neutral-800"
                          }`}
                        >
                          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            dashboardSettings.showZone1 ? "translate-x-4" : "translate-x-0"
                          }`} />
                        </button>
                      </div>

                      {/* Zone 2 Toggle */}
                      <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-850">
                        <div>
                          <span className="text-[0.75rem] font-bold text-neutral-200 block">Zone 2: Tägliche Organisation</span>
                          <span className="text-[0.625rem] text-neutral-400 block">Persönliche To-Dos & Ankündigungen</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDashboardSettings((prev: any) => ({ ...prev, showZone2: !prev.showZone2 }))}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            dashboardSettings.showZone2 ? "bg-emerald-500" : "bg-neutral-800"
                          }`}
                        >
                          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            dashboardSettings.showZone2 ? "translate-x-4" : "translate-x-0"
                          }`} />
                        </button>
                      </div>

                      {/* Zone 3 Toggle */}
                      <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-850">
                        <div>
                          <span className="text-[0.75rem] font-bold text-neutral-200 block">Zone 3: Belohnung & Motivation</span>
                          <span className="text-[0.625rem] text-neutral-400 block">Interaktives Haustier, Klassenglas & Schülerinteraktionen</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDashboardSettings((prev: any) => ({ ...prev, showZone3: !prev.showZone3 }))}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            dashboardSettings.showZone3 ? "bg-emerald-500" : "bg-neutral-800"
                          }`}
                        >
                          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            dashboardSettings.showZone3 ? "translate-x-4" : "translate-x-0"
                          }`} />
                        </button>
                      </div>

                      {/* Zone 4 Toggle */}
                      <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-850">
                        <div>
                          <span className="text-[0.75rem] font-bold text-neutral-200 block">Zone 4: Analysen & Statistiken</span>
                          <span className="text-[0.625rem] text-neutral-400 block">Notenschnitt, Anwesenheit, Lehrplan & Diagnostik</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDashboardSettings((prev: any) => ({ ...prev, showZone4: !prev.showZone4 }))}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            dashboardSettings.showZone4 ? "bg-emerald-500" : "bg-neutral-800"
                          }`}
                        >
                          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            dashboardSettings.showZone4 ? "translate-x-4" : "translate-x-0"
                          }`} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Widget-Feineinstellung (Granulare Toggles) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-neutral-300">
                    <Sliders size={16} className="text-accent" />
                    <span className="text-[0.6875rem] font-black uppercase tracking-wider">
                      Einzelne Widgets ein- & ausblenden
                    </span>
                  </div>
                  <div className="p-5 bg-neutral-900/40 rounded-2xl border border-neutral-800 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      
                      {/* Class Pet */}
                      <div className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-xl border border-neutral-850/60">
                        <div>
                          <span className="text-[0.71875rem] font-bold text-neutral-200 block">🦕 Klassen-Haustier</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDashboardSettings((prev: any) => ({ ...prev, showClassPet: !prev.showClassPet }))}
                          className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            dashboardSettings.showClassPet ? "bg-emerald-500" : "bg-neutral-800"
                          }`}
                        >
                          <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            dashboardSettings.showClassPet ? "translate-x-3.5" : "translate-x-0"
                          }`} />
                        </button>
                      </div>

                      {/* Klassenglas */}
                      <div className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-xl border border-neutral-850/60">
                        <div>
                          <span className="text-[0.71875rem] font-bold text-neutral-200 block">🏺 Klassenglas (Belohnung)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDashboardSettings((prev: any) => ({ ...prev, showKlassenglas: !prev.showKlassenglas }))}
                          className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            dashboardSettings.showKlassenglas ? "bg-emerald-500" : "bg-neutral-800"
                          }`}
                        >
                          <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            dashboardSettings.showKlassenglas ? "translate-x-3.5" : "translate-x-0"
                          }`} />
                        </button>
                      </div>

                      {/* Countdowns / Events */}
                      <div className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-xl border border-neutral-850/60">
                        <div>
                          <span className="text-[0.71875rem] font-bold text-neutral-200 block">📅 Termine & Countdowns</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDashboardSettings((prev: any) => ({ ...prev, showEvents: !prev.showEvents }))}
                          className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            dashboardSettings.showEvents ? "bg-emerald-500" : "bg-neutral-800"
                          }`}
                        >
                          <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            dashboardSettings.showEvents ? "translate-x-3.5" : "translate-x-0"
                          }`} />
                        </button>
                      </div>

                      {/* To-Do Liste */}
                      <div className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-xl border border-neutral-850/60">
                        <div>
                          <span className="text-[0.71875rem] font-bold text-neutral-200 block">📝 Persönliche To-Dos</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDashboardSettings((prev: any) => ({ ...prev, showTodos: !prev.showTodos }))}
                          className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            dashboardSettings.showTodos ? "bg-emerald-500" : "bg-neutral-800"
                          }`}
                        >
                          <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            dashboardSettings.showTodos ? "translate-x-3.5" : "translate-x-0"
                          }`} />
                        </button>
                      </div>

                      {/* Schüler-Anwesenheit */}
                      <div className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-xl border border-neutral-850/60">
                        <div>
                          <span className="text-[0.71875rem] font-bold text-neutral-200 block">👥 Schüler-Anwesenheit</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDashboardSettings((prev: any) => ({ ...prev, showAnwesenheit: !prev.showAnwesenheit }))}
                          className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            dashboardSettings.showAnwesenheit ? "bg-emerald-500" : "bg-neutral-800"
                          }`}
                        >
                          <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            dashboardSettings.showAnwesenheit ? "translate-x-3.5" : "translate-x-0"
                          }`} />
                        </button>
                      </div>

                      {/* Schüler-Statistiken */}
                      <div className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-xl border border-neutral-850/60">
                        <div>
                          <span className="text-[0.71875rem] font-bold text-neutral-200 block">📊 Beteiligungs-Statistiken</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDashboardSettings((prev: any) => ({ ...prev, showSchuelerStats: !prev.showSchuelerStats }))}
                          className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            dashboardSettings.showSchuelerStats ? "bg-emerald-500" : "bg-neutral-800"
                          }`}
                        >
                          <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            dashboardSettings.showSchuelerStats ? "translate-x-3.5" : "translate-x-0"
                          }`} />
                        </button>
                      </div>

                      {/* Geburtstage */}
                      <div className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-xl border border-neutral-850/60">
                        <div>
                          <span className="text-[0.71875rem] font-bold text-neutral-200 block">🎂 Geburtstags-Anzeige</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDashboardSettings((prev: any) => ({ ...prev, showGeburtstage: !prev.showGeburtstage }))}
                          className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            dashboardSettings.showGeburtstage ? "bg-emerald-500" : "bg-neutral-800"
                          }`}
                        >
                          <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            dashboardSettings.showGeburtstage ? "translate-x-3.5" : "translate-x-0"
                          }`} />
                        </button>
                      </div>

                      {/* Lehrplan-Abdeckung */}
                      <div className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-xl border border-neutral-850/60">
                        <div>
                          <span className="text-[0.71875rem] font-bold text-neutral-200 block">📚 Lehrplanabdeckung</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDashboardSettings((prev: any) => ({ ...prev, showLehrplanAbdeckung: !prev.showLehrplanAbdeckung }))}
                          className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            dashboardSettings.showLehrplanAbdeckung ? "bg-emerald-500" : "bg-neutral-800"
                          }`}
                        >
                          <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            dashboardSettings.showLehrplanAbdeckung ? "translate-x-3.5" : "translate-x-0"
                          }`} />
                        </button>
                      </div>

                      {/* Morgenaufgabe */}
                      <div className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-xl border border-neutral-850/60">
                        <div>
                          <span className="text-[0.71875rem] font-bold text-neutral-200 block">🌅 Morgen-Aufgaben</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDashboardSettings((prev: any) => ({ ...prev, showMorgenAufgaben: !prev.showMorgenAufgaben }))}
                          className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            dashboardSettings.showMorgenAufgaben ? "bg-emerald-500" : "bg-neutral-800"
                          }`}
                        >
                          <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            dashboardSettings.showMorgenAufgaben ? "translate-x-3.5" : "translate-x-0"
                          }`} />
                        </button>
                      </div>

                      {/* Tages-Fokus */}
                      <div className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-xl border border-neutral-850/60">
                        <div>
                          <span className="text-[0.71875rem] font-bold text-neutral-200 block">🎯 Tages-Fokus Notiz</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDashboardSettings((prev: any) => ({ ...prev, showTagesFokus: !prev.showTagesFokus }))}
                          className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            dashboardSettings.showTagesFokus ? "bg-emerald-500" : "bg-neutral-800"
                          }`}
                        >
                          <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            dashboardSettings.showTagesFokus ? "translate-x-3.5" : "translate-x-0"
                          }`} />
                        </button>
                      </div>

                    </div>
                  </div>
                </div>

                {/* Section: Wochenend-Geburtstage */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-neutral-300">
                    <Cake size={16} className="text-accent" />
                    <span className="text-[0.6875rem] font-black uppercase tracking-wider">
                      Wochenend-Geburtstage
                    </span>
                  </div>
                  <div className="p-5 bg-neutral-900/40 rounded-2xl border border-neutral-800 space-y-4">
                    <div>
                      <span className="text-[0.75rem] leading-tight font-bold text-neutral-200">
                        Geburtstage vom Wochenende anzeigen:
                      </span>
                      <span className="block text-[0.6875rem] text-neutral-400 font-sans mt-0.5">
                        Wann sollen Kinder gefeiert werden, die am Wochenende
                        Geburtstag haben?
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-0.5 sm:gap-1 bg-neutral-950 p-0.5 sm:p-1 rounded-xl border border-neutral-800/40 w-full overflow-hidden">
                      {[
                        { id: "none", label: "Nicht verschieben" },
                        { id: "friday", label: "Am Freitag davor" },
                        { id: "monday", label: "Am Montag danach" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setDashboardSettings((prev: any) => ({
                              ...prev,
                              moveWeekendBirthdays: opt.id,
                            }))
                          }
                          className={`py-1 sm:py-1.5 px-0.5 text-[0.42rem] xs:text-[0.48rem] sm:text-[0.625rem] font-black rounded-md sm:rounded-lg transition-all text-center w-full min-w-0 leading-tight ${
                            dashboardSettings.moveWeekendBirthdays === opt.id
                              ? "bg-neutral-800 text-white shadow border border-neutral-700"
                              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 bg-transparent"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Section: Custom Events Countdowns */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-neutral-300">
                    <Calendar size={16} className="text-accent" />
                    <span className="text-[0.6875rem] font-black uppercase tracking-wider">
                      Benutzerdefinierte Countdowns
                    </span>
                  </div>
                  <div className="p-5 bg-neutral-900/40 rounded-2xl border border-neutral-800 space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[0.75rem] leading-tight font-bold text-neutral-200">
                          Countdowns anzeigen
                        </span>
                        <span className="block text-[0.6875rem] text-neutral-400 font-sans mt-0.5">
                          Ferien, Schulausflüge oder andere Ereignisse
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setDashboardSettings((prev: any) => ({
                            ...prev,
                            showEvents: !prev.showEvents,
                          }))
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          dashboardSettings.showEvents
                            ? "bg-emerald-500"
                            : "bg-neutral-800"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            dashboardSettings.showEvents
                              ? "translate-x-5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                    {dashboardSettings.showEvents && (
                      <div className="space-y-3 pt-4 border-t border-neutral-800/80">
                        {(dashboardSettings.customEvents || []).map((ev: any) => (
                           <div key={ev.id} className="flex gap-3 items-center bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                             <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                               <Calendar size={14} />
                             </div>
                             <div className="flex-1">
                               <div className="text-[0.75rem] font-bold text-neutral-200">{ev.name}</div>
                               <div className="text-[0.625rem] text-neutral-400 font-medium">{ev.date}</div>
                             </div>
                             <button
                               type="button"
                               onClick={() => setDashboardSettings((prev: any) => ({
                                 ...prev,
                                 customEvents: prev.customEvents.filter((c:any) => c.id !== ev.id)
                               }))}
                               className="text-neutral-500 hover:bg-rose-500/20 hover:text-rose-400 w-8 h-8 flex justify-center items-center rounded-lg transition-colors cursor-pointer"
                             >
                               <X size={14} />
                             </button>
                           </div>
                        ))}
                        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                          <input type="text" id="new_ev_name" placeholder="Ereignis-Name (z.B. Sommerferien)" className="flex-1 px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 font-semibold focus:border-neutral-600 focus:outline-none text-[0.75rem] text-white"/>
                          <input type="date" id="new_ev_date" className="sm:w-36 px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 font-medium focus:border-neutral-600 focus:outline-none text-[0.75rem] text-neutral-300 [&::-webkit-calendar-picker-indicator]:invert-[0.8]"/>
                          <button type="button" onClick={() => {
                            const nInput = document.getElementById('new_ev_name') as HTMLInputElement;
                            const dInput = document.getElementById('new_ev_date') as HTMLInputElement;
                            if (nInput?.value && dInput?.value) {
                              const [yyyy, mm, dd] = dInput.value.split('-');
                              const fmt = `${dd}.${mm}.${yyyy}`;
                              setDashboardSettings((prev: any) => ({
                                  ...prev,
                                  customEvents: [...(prev.customEvents||[]), {id: Date.now().toString(), name: nInput.value, date: fmt}]
                              }));
                              nInput.value = '';
                              dInput.value = '';
                            }
                          }} className="px-4 py-2.5 bg-white text-black hover:bg-neutral-200 transition-colors uppercase tracking-wider rounded-xl text-[0.6875rem] font-black cursor-pointer shadow-sm">Add</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-neutral-800 bg-neutral-900/50 flex gap-4">
                <button
                  onClick={() => setShowCustomizePanel(false)}
                  className="flex-1 py-3.5 bg-accent text-white rounded-xl font-black text-[0.75rem] uppercase tracking-widest shadow-lg hover:bg-accent/90 active:scale-95 transition-all text-center"
                >
                  Einstellungen sichern
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================== */}
      {/* ADD STICKY NOTE FOR FOCUS STUDENT MODAL         */}
      {/* ============================================== */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {showNoteInput && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 sm:p-6 w-full max-w-md text-white shadow-2xl">
                  <h3 className="text-[1rem] leading-normal font-black mb-2 uppercase tracking-wide">
                    Notiz für {focusStudent?.vorname} {focusStudent?.nachname}
                  </h3>
                  <textarea
                    className="w-full h-32 bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-[0.75rem] leading-tight font-semibold text-white focus:outline-none focus:border-neutral-750 resize-none placeholder-neutral-500 custom-scrollbar"
                    placeholder="Trage hier eine kurze Verhaltensbeobachtung, ein Lob oder eine Notiz ein..."
                    value={tempNote}
                    onChange={(e) => setTempNote(e.target.value)}
                  />
                  <div className="flex justify-end gap-3 mt-4 font-sans">
                    <button
                      onClick={() => {
                        setShowNoteInput(false);
                        setTempNote("");
                      }}
                      className="px-4 py-2 rounded-xl text-[0.75rem] leading-tight font-bold text-neutral-400 hover:text-white cursor-pointer"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={() => {
                        if (tempNote.trim() && focusStudent) {
                          setApp((prev) => ({
                            ...prev,
                            notizen: [
                              ...(prev?.notizen || []),
                              {
                                id: Date.now().toString(),
                                schuelerId: focusStudent.id,
                                titel: `Notiz zu ${focusStudent.vorname}`,
                                inhalt: tempNote,
                                icon: "👤",
                                timestamp: Date.now(),
                              },
                            ],
                          }));
                          setTempNote("");
                          setShowNoteInput(false);
                        }
                      }}
                      className="px-4 py-2 bg-white text-slate-900 hover:bg-slate-50 rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Sichern
                    </button>
                  </div>
                </div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* MINI QUIZ SCREEN OVERLAY */}
      <AnimatePresence>
        {activeQuiz && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[400] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 sm:p-6 w-full max-w-xl text-white shadow-2xl  flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between border-b border-neutral-850 pb-4 mb-4">
                <div>
                  <div className="text-[0.625rem] font-black uppercase text-indigo-400 tracking-widest mb-1">
                    KI MINI-QUIZ
                  </div>
                  <h3 className="text-[1rem] leading-normal font-black text-white text-wrap leading-tight break-words">
                    Thema: {activeQuiz.thema}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveQuiz(null)}
                  className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-all hover:scale-105 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 text-[0.75rem] leading-tight text-neutral-200 leading-relaxed font-semibold font-sans space-y-4 whitespace-pre-line custom-scrollbar markdown-body">
                <Markdown>{activeQuiz.quizText}</Markdown>
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-neutral-850">
                <button
                  onClick={() => setActiveQuiz(null)}
                  className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  Schließen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LUUISE REFLECTION OVERLAY */}
      <AnimatePresence>
        {showLuuiseReflectionModal && app.luuiseTracker && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[400] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 sm:p-6 w-full max-w-lg text-white shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-neutral-850 pb-4 mb-4">
                <div className="min-w-0 flex-1">
                  <div className="text-[0.625rem] font-black uppercase text-rose-455 text-rose-400 tracking-widest mb-1">
                    ABSCHLUSS-REFLEXION
                  </div>
                  <h3 className="text-[1rem] leading-normal font-black text-rose-400 text-wrap leading-tight break-words leading-snug">
                    Herausforderung: {app.luuiseTracker.thema}
                  </h3>
                </div>
                <button
                  onClick={() => setShowLuuiseReflectionModal(false)}
                  className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-all hover:scale-105 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-neutral-300 text-[0.75rem] leading-tight font-bold leading-normal custom-scrollbar">
                <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-850 space-y-3">
                  <p className="text-[0.625rem] text-neutral-450 font-black tracking-wider uppercase">
                    Zusammenfassung der Tracking-Werte:
                  </p>
                  {(() => {
                    const entries = Object.values(
                      app.luuiseTracker.eintraege || {},
                    );
                    const greenCount = entries.filter(
                      (e) => e === "gruen",
                    ).length;
                    const yellowCount = entries.filter(
                      (e) => e === "gelb",
                    ).length;
                    const redCount = entries.filter((e) => e === "rot").length;

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-emerald-950/20 text-emerald-400 p-3 rounded-xl border border-emerald-900 text-center">
                          <div className="text-[1.125rem] leading-normal font-black">
                            {greenCount}
                          </div>
                          <div className="text-[0.5625rem] uppercase font-black tracking-widest mt-0.5">
                            Grün
                          </div>
                        </div>
                        <div className="bg-amber-950/20 text-amber-400 p-3 rounded-xl border border-amber-900 text-center">
                          <div className="text-[1.125rem] leading-normal font-black">
                            {yellowCount}
                          </div>
                          <div className="text-[0.5625rem] uppercase font-black tracking-widest mt-0.5">
                            Gelb
                          </div>
                        </div>
                        <div className="bg-rose-950/20 text-rose-400 p-3 rounded-xl border border-rose-900 text-center">
                          <div className="text-[1.125rem] leading-normal font-black">
                            {redCount}
                          </div>
                          <div className="text-[0.5625rem] uppercase font-black tracking-widest mt-0.5">
                            Rot
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="space-y-2">
                  <label className="text-[0.625rem] text-neutral-450 font-black tracking-wider uppercase">
                    Pädagogische Erkenntnisse und Notizen:
                  </label>
                  <textarea
                    value={luuiseComment}
                    onChange={(e) => setLuuiseComment(e.target.value)}
                    placeholder="Übertrage deine Reflexion in Worte: Was lief gut? Was war ausschlaggebend für grüne/rote Phasen?"
                    className="w-full h-28 bg-neutral-950 border border-neutral-800 focus:border-rose-500 rounded-2xl p-4 text-[0.75rem] leading-tight font-semibold focus:outline-none resize-none placeholder-neutral-550 custom-scrollbar text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-neutral-850">
                <button
                  type="button"
                  onClick={() => setShowLuuiseReflectionModal(false)}
                  className="flex-1 py-3.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleFinishLuuiseReflection}
                  disabled={!luuiseComment.trim()}
                  className="flex-2 py-3.5 bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 disabled:opacity-50 text-white rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-wider transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
                >
                  Sichern & ins Journal eintragen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GEBURTSTAGS POPUP MODAL */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {showBdayModal && birthdaysToday.length > 0 && (
              <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-neutral-900 border border-neutral-800 text-white rounded-[2.5rem] p-3 sm:p-5 md:p-6 w-full max-w-lg max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(236,72,153,0.2)] text-center relative"
                >
              {/* Confetti shooter lights */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-pink-500 via-amber-400 to-indigo-500" />

              <div className="flex flex-col items-center justify-center w-full">
                <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 flex items-center justify-center text-xl sm:text-2xl animate-bounce shadow-lg shadow-rose-500/20">
                  🎂
                </div>

                <h3 className="text-lg sm:text-xl md:text-2xl font-display font-black bg-gradient-to-r from-pink-400 via-amber-300 to-indigo-400 bg-clip-text text-transparent leading-tight mt-2">
                  Alles Gute zum Geburtstag!
                </h3>

                <p className="text-[9px] sm:text-[10px] text-neutral-400 font-bold max-w-xs uppercase tracking-widest leading-relaxed mt-1 mb-1">
                  Heute gibt es an deiner Schule etwas Wunderbares zu feiern ✨
                </p>

                <div className="my-1 p-2 sm:p-3 bg-white/5 border border-white/10 rounded-2xl w-full flex flex-col items-center">
                  <div className="text-[8px] uppercase tracking-widest font-black text-rose-400 mb-1">
                    Geburtstagskind(er) heute:
                  </div>

                  <div className="space-y-1 w-full max-h-[20vh] overflow-y-auto scrollbar-thin">
                    {birthdaysToday.map((s) => (
                      <div
                        key={s.id}
                        className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight drop-shadow"
                      >
                        🎉{" "}
                        <span className="bg-gradient-to-r from-pink-400 via-amber-300 to-purple-400 bg-clip-text text-transparent">
                          {s.vorname} {s.nachname}
                        </span>{" "}
                        🎈
                      </div>
                    ))}
                  </div>

                  <p className="text-[8px] text-neutral-400 italic mt-1">
                    Die Namen wurden in der Schülerliste markiert!
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full mt-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      handleBirthdayCelebrateOnDashboard(
                        birthdaysToday.map((s) => s.vorname).join(", "),
                      );
                    }}
                    className="flex-1 py-2 sm:py-2.5 bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
                  >
                    🎉 Nochmal Feiern!
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      try {
                        sessionStorage.setItem(
                          "bday_popup_shown_" + new Date().toDateString(),
                          "true",
                        );
                      } catch (e) {}
                      setShowBdayModal(false);
                      setPage("schueler");
                    }}
                    className="flex-1 py-2 sm:py-2.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 rounded-xl text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
                  >
                    Zur Schülerliste
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    try {
                      sessionStorage.setItem(
                        "bday_popup_shown_" + new Date().toDateString(),
                        "true",
                      );
                    } catch (e) {}
                    setShowBdayModal(false);
                  }}
                  className="mt-2 text-[9px] text-neutral-500 hover:text-neutral-300 uppercase tracking-widest font-black transition-colors cursor-pointer shrink-0"
                >
                  Schließen (Heute nicht mehr anzeigen)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}

      {/* DETAILED RADAR EVENT POPUP */}
      <AnimatePresence>
        {selectedRadarEvent && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-150 rounded-[2rem] p-6 w-full max-w-md text-slate-900 shadow-2xl relative flex flex-col gap-4 font-sans"
            >
              <button
                onClick={() => setSelectedRadarEvent(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
                aria-label="Schließen"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-3.5 mt-2">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl shrink-0">
                  {selectedRadarEvent.source === "geburtstag"
                    ? "🎈"
                    : selectedRadarEvent.source === "fokus"
                      ? "🎯"
                      : selectedRadarEvent.color === "fuchsia"
                        ? "🎉"
                        : selectedRadarEvent.color === "blue"
                          ? "👥"
                          : selectedRadarEvent.color === "violet"
                            ? "💬"
                            : selectedRadarEvent.color === "sky"
                              ? "🚌"
                              : selectedRadarEvent.color === "rose"
                                ? "📌"
                                : "📝"}
                </div>
                <div className="min-w-0">
                  <div className="text-[0.625rem] font-bold uppercase tracking-widest text-slate-400 leading-none mb-1">
                    {selectedRadarEvent.label} •{" "}
                    {selectedRadarEvent.source === "geburtstag"
                      ? "Geburtstag"
                      : selectedRadarEvent.source === "denkzettel"
                        ? "Denkzettel"
                        : selectedRadarEvent.source === "wochenplanung"
                          ? "Wochenplan"
                          : selectedRadarEvent.source === "jahresplanung"
                            ? "Jahresplanung"
                            : "Aktivität"}
                  </div>
                  <h3 className="text-base font-black text-slate-800 leading-snug break-words">
                    {selectedRadarEvent.text}
                  </h3>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-[0.75rem] leading-snug text-slate-600 flex flex-col gap-2">
                <div>
                  <span className="font-extrabold text-slate-500">
                    Details:{" "}
                  </span>
                  {selectedRadarEvent.sub}
                </div>
                {selectedRadarEvent.source === "denkzettel" && (
                  <div className="mt-2 text-amber-700 bg-amber-50/50 rounded-xl p-2.5 border border-amber-100/50 flex items-center gap-2 leading-tight">
                    <span className="text-base">📌</span>
                    <span>
                      Dieser Termin wurde automatisch aus Deinem Denkzettel
                      erkannt.
                    </span>
                  </div>
                )}
                {selectedRadarEvent.source === "wochenplanung" &&
                  selectedRadarEvent.cellFach && (
                    <div>
                      <span className="font-extrabold text-slate-500">
                        Fach:{" "}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-[0.625rem]">
                        {selectedRadarEvent.cellFach}
                      </span>
                    </div>
                  )}
                {selectedRadarEvent.kw && (
                  <div>
                    <span className="font-extrabold text-slate-500">
                      Kalenderwoche:{" "}
                    </span>
                    <span className="font-bold text-slate-750">
                      KW {selectedRadarEvent.kw}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 mt-2">
                {selectedRadarEvent.source === "denkzettel" &&
                  selectedRadarEvent.note && (
                    <button
                      onClick={() =>
                        handleMarkNoteCompleted(selectedRadarEvent.note.id)
                      }
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[0.6875rem] font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      ✅ Als erledigt markieren
                    </button>
                  )}

                {selectedRadarEvent.source === "geburtstag" &&
                  selectedRadarEvent.student && (
                    <button
                      onClick={() => {
                        if (selectedRadarEvent.student?.vorname) {
                          handleBirthdayCelebrateOnDashboard(
                            selectedRadarEvent.student.vorname,
                          );
                        }
                        setSelectedRadarEvent(null);
                      }}
                      className="w-full py-3 bg-gradient-to-r from-pink-600 to-rose-500 text-white rounded-xl text-[0.6875rem] font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      🎉 Geburtstags-Konfetti!
                    </button>
                  )}

                {(selectedRadarEvent.source === "wochenplanung" ||
                  selectedRadarEvent.source === "jahresplanung") && (
                  <button
                    onClick={() => {
                      setApp((prev) => ({
                        ...prev,
                        currentPage: selectedRadarEvent.source,
                        currentKW: selectedRadarEvent.kw,
                      }));
                      setSelectedRadarEvent(null);
                    }}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[0.6875rem] font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    📅 Zum Planer wechseln
                  </button>
                )}

                {selectedRadarEvent.source === "geburtstag" && (
                  <button
                    onClick={() => {
                      setApp((p) => ({ ...p, currentPage: "schueler" }));
                      setSelectedRadarEvent(null);
                    }}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[0.6875rem] font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    👤 Zur Schülerliste
                  </button>
                )}

                <button
                  onClick={() => setSelectedRadarEvent(null)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[0.6875rem] font-black uppercase tracking-widest transition-all flex items-center justify-center cursor-pointer"
                >
                  Schließen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isChangingCity && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-neutral-800 rounded-[2rem] p-6 w-full max-w-md shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <MapPin size={16} />
                  </div>
                  <h3 className="text-[0.875rem] font-black uppercase tracking-wider text-white">Schulort ändern</h3>
                </div>
                <button
                  onClick={() => {
                    setIsChangingCity(false);
                    setNewCity(app?.schulOrt || "");
                  }}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <p className="text-[0.6875rem] text-neutral-400 leading-normal font-medium">
                Gib den Namen deiner Stadt oder Gemeinde ein. Der Wetterdienst sucht automatisch nach den passenden Vorhersagedaten für dein Cockpit.
              </p>

              <form onSubmit={handleCityChange} className="space-y-4">
                <input
                  type="text"
                  placeholder="Z.B. Bregenz, Wien, Graz..."
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-neutral-850 text-white font-semibold focus:border-neutral-700 focus:outline-none placeholder-neutral-600 text-[0.8125rem]"
                  autoFocus
                />

                <div className="flex gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingCity(false);
                      setNewCity(app?.schulOrt || "");
                    }}
                    className="px-3.5 py-2 rounded-xl text-neutral-450 hover:text-white font-bold text-[0.625rem] uppercase tracking-widest cursor-pointer transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-550 rounded-xl text-white font-black text-[0.625rem] uppercase tracking-widest cursor-pointer shadow-md flex items-center gap-1.5 transition-all"
                  >
                    <Check size={12} /> Speichern
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
