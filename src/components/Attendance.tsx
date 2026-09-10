import React, { useState, useMemo, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { getTodayName, getSemester, isHoliday } from "../lib/utils";
import { VM_ZEITEN, STUNDEN_INFO } from "../constants";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Minus,
  Plus,
  BarChart3,
  Users,
  Calendar,
  AlertCircle,
  MessageSquare,
  Clock,
  Printer,
  History,
  Clock3,
  Undo,
  MoreHorizontal,
  CheckCircle2,
  UserCheck,
  UserX,
  SlidersHorizontal,
  FileSpreadsheet,
  HelpCircle,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import PrintHeader from "./PrintHeader";
import AttendanceTrends from "./AttendanceTrends";

export default function Attendance() {
  const { app, setApp } = useApp();

  // Date state initialized to today (or closest weekday)
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    else if (d.getDay() === 6) d.setDate(d.getDate() - 1);

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });

  // UI States
  const [viewMode, setViewMode] = useState<"compact" | "hourly">("compact");
  const [showMehrMenu, setShowMehrMenu] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [completedDays, setCompletedDays] = useState<Record<string, boolean>>({});

  // Active student modals & popovers
  const [activeNoteSid, setActiveNoteSid] = useState<string | null>(null);
  const [activeDelaySid, setActiveDelaySid] = useState<string | null>(null);
  const [activeFehlstundenSid, setActiveFehlstundenSid] = useState<string | null>(null);
  const [activeReasonSid, setActiveReasonSid] = useState<string | null>(null);
  const [absencesModalSid, setAbsencesModalSid] = useState<string | null>(null);

  const [currentNote, setCurrentNote] = useState("");
  const [currentDelay, setCurrentDelay] = useState<number>(0);
  const [currentFehlstunden, setCurrentFehlstunden] = useState<number>(0);

  // Undo stack
  const [recentChanges, setRecentChanges] = useState<
    {
      studentId: string;
      studentName: string;
      date: string;
      prevStatus: any;
      prevDetail: any;
    }[]
  >([]);

  const mehrMenuRef = useRef<HTMLDivElement>(null);

  // Close "Mehr" dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mehrMenuRef.current && !mehrMenuRef.current.contains(e.target as Node)) {
        setShowMehrMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Date Parsing & Day Info
  const [y, m, d] = selectedDate.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);

  const getDayStatus = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    const override = app.calendarOverrides?.[dateStr];
    if (override)
      return {
        status: override,
        holidayName: isHoliday(
          date,
          app.calendarSettings?.disabledHolidays,
          app.bundesland || "VBG"
        ),
      };
    const holiday = isHoliday(
      date,
      app.calendarSettings?.disabledHolidays,
      app.bundesland || "VBG"
    );
    return {
      status: (holiday ? "free" : "school") as "school" | "free",
      holidayName: holiday,
    };
  };

  const { status, holidayName: holiday } = getDayStatus(dateObj);
  const isFree = status === "free";
  const dayName = getTodayName(dateObj);
  const tageInfo = dayName ? app.tageplan?.[dayName] || {} : {};
  const activeHours: number[] = tageInfo.stunden || [];

  // Active class name
  const classLabel = app.klassenbezeichnung || app.klasse || "2a";

  // Formatted German Date string
  const formattedDate = useMemo(() => {
    return dateObj.toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }, [dateObj]);

  // Auto-default to "Alle anwesend" if no attendance data is present for the selected day yet
  useEffect(() => {
    if (isFree) return;
    if (!app.schueler || app.schueler.length === 0) return;

    const [yr, mo, dy] = selectedDate.split("-").map(Number);
    const dObj = new Date(yr, mo - 1, dy);
    const dName = getTodayName(dObj);
    const tInfo = dName ? app.tageplan?.[dName] || {} : {};
    const hours: number[] = tInfo.stunden || [];
    if (hours.length === 0) return;

    const hasAnyData = app.schueler.some((s: any) => {
      const statusData = app.anwesenheit?.[s.id]?.[selectedDate];
      return statusData && Object.keys(statusData).length > 0;
    });

    if (!hasAnyData) {
      setApp((prev: any) => {
        const newAnwesenheit = { ...(prev.anwesenheit || {}) };
        prev.schueler.forEach((s: any) => {
          const studentAttendance = { ...(newAnwesenheit[s.id] || {}) };
          const newDayAttendance: Record<string, string> = {};
          hours.forEach((hourNum) => {
            newDayAttendance[hourNum] = "a";
          });
          studentAttendance[selectedDate] = newDayAttendance;
          newAnwesenheit[s.id] = studentAttendance;
        });
        return { ...prev, anwesenheit: newAnwesenheit };
      });
    }
  }, [selectedDate, isFree, app.schueler, app.tageplan, setApp]);

  // Undo registration helper
  const registerUndo = (sid: string, studentName: string) => {
    const prevStatus = { ...(app.anwesenheit[sid]?.[selectedDate] || {}) };
    const prevDetail = { ...(app.anwesenheitDetail?.[sid]?.[selectedDate] || {}) };
    setRecentChanges((prev) => [
      {
        studentId: sid,
        studentName,
        date: selectedDate,
        prevStatus,
        prevDetail,
      },
      ...prev.slice(0, 4),
    ]);
  };

  // Undo execution
  const handleUndo = () => {
    if (recentChanges.length === 0) return;
    const lastChange = recentChanges[0];
    setApp((prev) => {
      if (lastChange.studentId === "__BULK__") {
        return {
          ...prev,
          anwesenheit: lastChange.prevStatus,
          anwesenheitDetail: lastChange.prevDetail,
        };
      }

      const newAnwesenheit = { ...prev.anwesenheit };
      const newAnwesenheitDetail = { ...prev.anwesenheitDetail };

      newAnwesenheit[lastChange.studentId] = {
        ...(newAnwesenheit[lastChange.studentId] || {}),
        [lastChange.date]: lastChange.prevStatus,
      };

      const studDetails = newAnwesenheitDetail[lastChange.studentId] || {};
      newAnwesenheitDetail[lastChange.studentId] = {
        ...studDetails,
        [lastChange.date]: lastChange.prevDetail,
      };

      return {
        ...prev,
        anwesenheit: newAnwesenheit,
        anwesenheitDetail: newAnwesenheitDetail,
      };
    });
    setRecentChanges((prev) => prev.slice(1));
  };

  // Day Stats Calculation
  const dayStats = useMemo(() => {
    let presentCount = 0;
    let absentCount = 0;
    let excusedCount = 0;
    let unexcusedCount = 0;
    let delayCount = 0;
    let untrackedCount = 0;
    let totalFehlstunden = 0;

    app.schueler.forEach((s) => {
      const statusData = app.anwesenheit[s.id]?.[selectedDate] || {};
      const details = app.anwesenheitDetail?.[s.id]?.[selectedDate];

      const states = Object.values(statusData);
      const hasE = states.some((st) => st === "e");
      const hasU = states.some((st) => st === "u");
      const isDelayed = !!(details?.verspaetung && details.verspaetung > 0);
      const absentHoursCount = states.filter((st) => st === "e" || st === "u").length;
      const studentFehlstunden =
        details?.fehlstunden !== undefined
          ? details.fehlstunden
          : absentHoursCount > 0
          ? absentHoursCount
          : 0;

      totalFehlstunden += studentFehlstunden;

      if (activeHours.length > 0 && states.length === 0) {
        untrackedCount++;
      } else {
        if (hasU || hasE || studentFehlstunden > 0) {
          absentCount++;
          if (hasU) unexcusedCount++;
          if (hasE || (!hasU && studentFehlstunden > 0)) excusedCount++;
        } else {
          presentCount++;
        }
      }

      if (isDelayed) delayCount++;
    });

    return {
      present: presentCount,
      absent: absentCount,
      excused: excusedCount,
      unexcused: unexcusedCount,
      delayed: delayCount,
      untracked: untrackedCount,
      totalFehlstunden,
      total: app.schueler.length,
    };
  }, [app.schueler, app.anwesenheit, app.anwesenheitDetail, selectedDate, activeHours]);

  // Current teaching hour matching system time
  const currentHourHighlight = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    if (selectedDate !== todayStr) return null;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const hStr of Object.keys(STUNDEN_INFO)) {
      const hNum = Number(hStr);
      const timeRange = app.stundenZeiten?.[hNum] || STUNDEN_INFO[hNum];
      if (timeRange) {
        const [startStr, endStr] = timeRange.split("–");
        if (startStr && endStr) {
          const [sh, sm] = startStr.split(":").map(Number);
          const [eh, em] = endStr.split(":").map(Number);
          const startMin = sh * 60 + sm;
          const endMin = eh * 60 + em;
          if (currentMinutes >= startMin && currentMinutes <= endMin) {
            return hNum;
          }
        }
      }
    }
    return null;
  }, [selectedDate, app.stundenZeiten]);

  const sortedStudents = [...app.schueler].sort((a, b) =>
    a.nachname.localeCompare(b.nachname, "de")
  );

  // Validation Rules
  interface ValidationError {
    id: string;
    studentId: string;
    studentName: string;
    type: "contradiction" | "missingNote" | "mixedAbsence" | "frequentAbsenceOnDay";
    message: string;
    fixOptions: {
      label: string;
      action: () => void;
      isSecondary?: boolean;
    }[];
  }

  const dismissAlert = (studentId: string, dateStr: string, alertId: string) => {
    setApp((prev) => {
      const details = prev.anwesenheitDetail || {};
      const studentDetails = details[studentId] || {};
      const dateDetails = studentDetails[dateStr] || {};
      return {
        ...prev,
        anwesenheitDetail: {
          ...details,
          [studentId]: {
            ...studentDetails,
            [dateStr]: {
              ...dateDetails,
              dismissedAlerts: [...(dateDetails.dismissedAlerts || []), alertId],
            },
          },
        },
      };
    });
  };

  const getValidationErrors = (): ValidationError[] => {
    const list: ValidationError[] = [];
    sortedStudents.forEach((s) => {
      const statusData = app.anwesenheit[s.id]?.[selectedDate] || {};
      const details = app.anwesenheitDetail?.[s.id]?.[selectedDate];
      const dismissedAlerts = details?.dismissedAlerts || [];

      const hasAbsence = Object.values(statusData).some((st) => st === "e" || st === "u");
      const hasDelay = !!(details?.verspaetung && details.verspaetung > 0);
      const isUnexcused = Object.values(statusData).some((st) => st === "u");
      const hasNote = !!(details?.notiz && details.notiz.trim().length > 0);

      // 1. Contradiction
      const contradictionId = `${s.id}-contradiction`;
      if (hasAbsence && hasDelay && !dismissedAlerts.includes(contradictionId)) {
        list.push({
          id: contradictionId,
          studentId: s.id,
          studentName: `${s.vorname} ${s.nachname}`,
          type: "contradiction",
          message: `Widerspruch bei ${s.vorname}: Verspätung von ${details.verspaetung} Min. eingetragen, obwohl abwesend.`,
          fixOptions: [
            {
              label: "Verspätung löschen",
              action: () => {
                setApp((prev) => {
                  const details = prev.anwesenheitDetail || {};
                  const studentDetails = details[s.id] || {};
                  return {
                    ...prev,
                    anwesenheitDetail: {
                      ...details,
                      [s.id]: {
                        ...studentDetails,
                        [selectedDate]: {
                          ...(studentDetails[selectedDate] || {}),
                          verspaetung: 0,
                        },
                      },
                    },
                  };
                });
              },
            },
            {
              label: "Als anwesend eintragen",
              action: () => {
                setApp((prev) => {
                  const studentAttendance = prev.anwesenheit[s.id] || {};
                  const dateAttendance = { ...(studentAttendance[selectedDate] || {}) };
                  Object.keys(dateAttendance).forEach((h) => {
                    if (dateAttendance[h] === "e" || dateAttendance[h] === "u") {
                      dateAttendance[h] = "a";
                    }
                  });
                  return {
                    ...prev,
                    anwesenheit: {
                      ...prev.anwesenheit,
                      [s.id]: {
                        ...studentAttendance,
                        [selectedDate]: dateAttendance,
                      },
                    },
                  };
                });
              },
            },
            {
              label: "Gelesen",
              action: () => dismissAlert(s.id, selectedDate, contradictionId),
              isSecondary: true,
            },
          ],
        });
      }

      // 2. Unexcused absence without note
      const missingNoteId = `${s.id}-missingNote`;
      if (isUnexcused && !hasNote && !dismissedAlerts.includes(missingNoteId)) {
        list.push({
          id: missingNoteId,
          studentId: s.id,
          studentName: `${s.vorname} ${s.nachname}`,
          type: "missingNote",
          message: `Fehlende Begründung bei ${s.vorname}: Unentschuldigt, aber keine Notiz vorhanden.`,
          fixOptions: [
            {
              label: "Mutter/Vater anrufen notieren",
              action: () => {
                setApp((prev) => {
                  const details = prev.anwesenheitDetail || {};
                  const studentDetails = details[s.id] || {};
                  return {
                    ...prev,
                    anwesenheitDetail: {
                      ...details,
                      [s.id]: {
                        ...studentDetails,
                        [selectedDate]: {
                          ...(studentDetails[selectedDate] || {}),
                          notiz: "Telefonischer Kontakt mit den Erziehungsberechtigten ausstehend",
                        },
                      },
                    },
                  };
                });
              },
            },
            {
              label: "Nachträglich entschuldigen",
              action: () => {
                setApp((prev) => {
                  const studentAttendance = prev.anwesenheit[s.id] || {};
                  const dateAttendance = { ...(studentAttendance[selectedDate] || {}) };
                  Object.keys(dateAttendance).forEach((h) => {
                    if (dateAttendance[h] === "u") {
                      dateAttendance[h] = "e";
                    }
                  });
                  return {
                    ...prev,
                    anwesenheit: {
                      ...prev.anwesenheit,
                      [s.id]: {
                        ...studentAttendance,
                        [selectedDate]: dateAttendance,
                      },
                    },
                  };
                });
              },
            },
            {
              label: "Gelesen",
              action: () => dismissAlert(s.id, selectedDate, missingNoteId),
              isSecondary: true,
            },
          ],
        });
      }
    });
    return list;
  };

  // Date Navigation
  const navDate = (days: number) => {
    const d = new Date(dateObj);
    d.setDate(d.getDate() + days);

    // Skip weekends
    while (d.getDay() === 0 || d.getDay() === 6) {
      d.setDate(d.getDate() + (days > 0 ? 1 : -1));
    }

    const yNum = d.getFullYear();
    const mNum = String(d.getMonth() + 1).padStart(2, "0");
    const dayNum = String(d.getDate()).padStart(2, "0");
    setSelectedDate(`${yNum}-${mNum}-${dayNum}`);
  };

  // Status Handlers
  const setStatus = (sid: string, hourNum: number, statusVal: string) => {
    const s = app.schueler.find((student) => student.id === sid);
    const sName = s ? `${s.vorname} ${s.nachname}` : "Schüler";
    registerUndo(sid, sName);

    setApp((prev) => {
      const studentAttendance = prev.anwesenheit[sid] || {};
      const dateAttendance = studentAttendance[selectedDate] || {};

      const currentStatus = dateAttendance[hourNum] || "a";
      const nextStatus = currentStatus === statusVal ? "a" : statusVal;

      return {
        ...prev,
        anwesenheit: {
          ...prev.anwesenheit,
          [sid]: {
            ...studentAttendance,
            [selectedDate]: {
              ...dateAttendance,
              [hourNum]: nextStatus,
            },
          },
        },
      };
    });
  };

  const setWholeDay = (sid: string, statusVal: string) => {
    const s = app.schueler.find((student) => student.id === sid);
    const sName = s ? `${s.vorname} ${s.nachname}` : "Schüler";
    registerUndo(sid, sName);

    setApp((prev) => {
      const studentAttendance = prev.anwesenheit[sid] || {};
      const newDayAttendance: Record<string, string> = {};

      const effectiveHours = activeHours.length > 0 ? activeHours : [1, 2, 3, 4, 5, 6];
      effectiveHours.forEach((hourNum) => {
        newDayAttendance[hourNum] = statusVal;
      });

      const details = prev.anwesenheitDetail || {};
      const studentDetails = details[sid] || {};
      const dayDetail = studentDetails[selectedDate] || {};

      const updatedDayDetail = { ...dayDetail };
      if (statusVal === "a") {
        delete updatedDayDetail.fehlstunden;
      } else {
        updatedDayDetail.fehlstunden = effectiveHours.length;
      }

      return {
        ...prev,
        anwesenheit: {
          ...prev.anwesenheit,
          [sid]: {
            ...studentAttendance,
            [selectedDate]: newDayAttendance,
          },
        },
        anwesenheitDetail: {
          ...details,
          [sid]: {
            ...studentDetails,
            [selectedDate]: updatedDayDetail,
          },
        },
      };
    });
  };

  // 1-Click "Alle anwesend"
  const setAllStudents = (statusVal: string = "a") => {
    setRecentChanges((prev) => [
      {
        studentId: "__BULK__",
        studentName: "Alle Schüler",
        date: selectedDate,
        prevStatus: { ...app.anwesenheit },
        prevDetail: { ...app.anwesenheitDetail },
      },
      ...prev.slice(0, 4),
    ]);

    setApp((prev) => {
      const newAnwesenheit = { ...prev.anwesenheit };
      app.schueler.forEach((s) => {
        const studentAttendance = newAnwesenheit[s.id] || {};
        const newDayAttendance: Record<string, string> = {};

        activeHours.forEach((hourNum) => {
          newDayAttendance[hourNum] = statusVal;
        });

        newAnwesenheit[s.id] = {
          ...studentAttendance,
          [selectedDate]: newDayAttendance,
        };
      });
      return { ...prev, anwesenheit: newAnwesenheit };
    });
  };

  // Completion Handler ("Abschließen")
  const handleCompleteCheck = () => {
    // If any student is untracked, default them to 'a'
    if (dayStats.untracked > 0) {
      setAllStudents("a");
    }
    setCompletedDays((prev) => ({
      ...prev,
      [selectedDate]: true,
    }));
  };

  const isChecked = completedDays[selectedDate] || (dayStats.untracked === 0 && dayStats.total > 0);

  // Note & Delay Save handlers
  const saveNote = (sid: string) => {
    setApp((prev) => {
      const details = prev.anwesenheitDetail || {};
      const studentDetails = details[sid] || {};
      return {
        ...prev,
        anwesenheitDetail: {
          ...details,
          [sid]: {
            ...studentDetails,
            [selectedDate]: {
              ...(studentDetails[selectedDate] || {}),
              notiz: currentNote,
            },
          },
        },
      };
    });
    setActiveNoteSid(null);
  };

  const saveDelay = (sid: string) => {
    setApp((prev) => {
      const details = prev.anwesenheitDetail || {};
      const studentDetails = details[sid] || {};
      return {
        ...prev,
        anwesenheitDetail: {
          ...details,
          [sid]: {
            ...studentDetails,
            [selectedDate]: {
              ...(studentDetails[selectedDate] || {}),
              verspaetung: currentDelay,
            },
          },
        },
      };
    });
    setActiveDelaySid(null);
  };

  const saveFehlstunden = (sid: string) => {
    const s = app.schueler.find((student) => student.id === sid);
    const sName = s ? `${s.vorname} ${s.nachname}` : "Schüler";
    registerUndo(sid, sName);

    const effectiveHours = activeHours.length > 0 ? activeHours : [1, 2, 3, 4, 5, 6];
    const maxH = effectiveHours.length;
    const numHours = Math.max(0, Math.min(maxH, Number(currentFehlstunden) || 0));

    setApp((prev) => {
      // 1. Update anwesenheitDetail
      const details = prev.anwesenheitDetail || {};
      const studentDetails = details[sid] || {};
      const dayDetail = studentDetails[selectedDate] || {};

      const updatedDayDetail = {
        ...dayDetail,
        fehlstunden: numHours > 0 ? numHours : undefined,
      };
      if (numHours === 0) {
        delete updatedDayDetail.fehlstunden;
      }

      // 2. Update anwesenheit hourly records
      const studentAttendance = prev.anwesenheit[sid] || {};
      const currentDayAtt = studentAttendance[selectedDate] || {};

      // Check if previously marked as 'u' (unentschuldigt)
      const isPreviouslyUnexcused =
        Object.values(currentDayAtt).some((st) => st === "u") || dayDetail.notiz === "Unentschuldigt";
      const absenceCode = isPreviouslyUnexcused ? "u" : "e";

      const newDayAttendance: Record<string, string> = { ...currentDayAtt };

      if (numHours === 0) {
        effectiveHours.forEach((h) => {
          newDayAttendance[h] = "a";
        });
      } else {
        effectiveHours.forEach((h, idx) => {
          if (idx < numHours) {
            newDayAttendance[h] = newDayAttendance[h] === "u" ? "u" : absenceCode;
          } else {
            newDayAttendance[h] = "a";
          }
        });
      }

      return {
        ...prev,
        anwesenheit: {
          ...prev.anwesenheit,
          [sid]: {
            ...studentAttendance,
            [selectedDate]: newDayAttendance,
          },
        },
        anwesenheitDetail: {
          ...details,
          [sid]: {
            ...studentDetails,
            [selectedDate]: updatedDayDetail,
          },
        },
      };
    });

    setActiveFehlstundenSid(null);
  };

  // Quick preset reason selection handler
  const handleSelectQuickReason = (sid: string, reason: string, statusType: "e" | "u") => {
    setWholeDay(sid, statusType);
    setApp((prev) => {
      const details = prev.anwesenheitDetail || {};
      const studentDetails = details[sid] || {};
      return {
        ...prev,
        anwesenheitDetail: {
          ...details,
          [sid]: {
            ...studentDetails,
            [selectedDate]: {
              ...(studentDetails[selectedDate] || {}),
              notiz: reason,
            },
          },
        },
      };
    });
    setActiveReasonSid(null);
  };

  // Stats calculation
  const getStats = (sid: string) => {
    const data = app.anwesenheit[sid] || {};
    const details = app.anwesenheitDetail?.[sid] || {};
    const res = {
      s1: { e: 0, u: 0, total: 0 },
      s2: { e: 0, u: 0, total: 0 },
      total: { e: 0, u: 0, total: 0 },
    };

    const allDates = new Set([...Object.keys(data), ...Object.keys(details)]);

    allDates.forEach((date) => {
      const sem = getSemester(date);
      const dayData = data[date] || {};
      const dayDetail = details[date];

      let dayExcused = 0;
      let dayUnexcused = 0;

      Object.values(dayData).forEach((statusVal) => {
        if (statusVal === "e") {
          dayExcused++;
        } else if (statusVal === "u") {
          dayUnexcused++;
        }
      });

      if (dayDetail?.fehlstunden !== undefined) {
        const totalCalculated = dayExcused + dayUnexcused;
        if (totalCalculated === 0 && dayDetail.fehlstunden > 0) {
          const isUnex = dayDetail.notiz === "Unentschuldigt";
          if (isUnex) dayUnexcused = dayDetail.fehlstunden;
          else dayExcused = dayDetail.fehlstunden;
        }
      }

      res.total.e += dayExcused;
      res.total.u += dayUnexcused;
      res.total.total += dayExcused + dayUnexcused;

      if (sem === 1) {
        res.s1.e += dayExcused;
        res.s1.u += dayUnexcused;
        res.s1.total += dayExcused + dayUnexcused;
      } else {
        res.s2.e += dayExcused;
        res.s2.u += dayUnexcused;
        res.s2.total += dayExcused + dayUnexcused;
      }
    });

    return res;
  };

  const chartData = useMemo(() => {
    return sortedStudents.map((s) => {
      const stats = getStats(s.id);
      return {
        name: `${s.vorname} ${s.nachname.charAt(0)}.`,
        Entschuldigt: stats.total.e,
        Unentschuldigt: stats.total.u,
      };
    });
  }, [sortedStudents, app.anwesenheit]);

  const validationErrors = getValidationErrors();

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-12">
      {/* ========================================================= */}
      {/* 3. SIMPLIFIED HEADER SECTION                             */}
      {/* ========================================================= */}
      <header className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/80 print:hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Title, Date & Class */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navDate(-1)}
            aria-label="Vorheriger Schultag"
            title="Vorheriger Schultag"
            className="p-2.5 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200/70 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <ChevronLeft size={20} />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[1.125rem] font-black text-slate-900 tracking-tight leading-none uppercase">
                Anwesenheit
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[0.6875rem] font-extrabold border border-slate-200/60">
                Klasse {classLabel}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <label className="text-[0.875rem] font-bold text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer flex items-center gap-1.5">
                <Calendar size={14} className="text-emerald-600" />
                <span>{formattedDate}</span>
                <input
                  type="date"
                  className="sr-only"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </label>
              {isFree && (
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[0.625rem] font-black uppercase tracking-wider">
                  Schulfrei
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => navDate(1)}
            aria-label="Nächster Schultag"
            title="Nächster Schultag"
            className="p-2.5 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200/70 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Main Header Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Quick "Alle anwesend" Action */}
          <button
            onClick={() => setAllStudents("a")}
            disabled={isFree || sortedStudents.length === 0}
            className={`px-3.5 py-2.5 rounded-xl text-[0.75rem] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isFree || sortedStudents.length === 0
                ? "opacity-40 grayscale cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200/80 active:scale-95 shadow-xs"
            }`}
            title="Alle Schüler für heute anwesend markieren"
          >
            <UserCheck size={16} className="text-emerald-600" />
            <span>Alle anwesend</span>
          </button>

          {/* Primary Action "Abschließen" */}
          <button
            onClick={handleCompleteCheck}
            disabled={isFree || sortedStudents.length === 0}
            className={`px-4 py-2.5 rounded-xl text-[0.75rem] font-black flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-sm ${
              isChecked
                ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/10"
                : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/10"
            }`}
          >
            <CheckCircle2 size={16} />
            <span>{isChecked ? "Geprüft ✓" : "Abschließen"}</span>
          </button>

          {/* "Mehr" Dropdown Menu */}
          <div className="relative" ref={mehrMenuRef}>
            <button
              onClick={() => setShowMehrMenu(!showMehrMenu)}
              className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-[0.75rem] font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200/60"
            >
              <MoreHorizontal size={18} />
              <span className="hidden sm:inline">Mehr</span>
              {validationErrors.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>

            <AnimatePresence>
              {showMehrMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 text-[0.8125rem]"
                >
                  <div className="px-3 py-1.5 text-[0.625rem] font-black text-slate-400 uppercase tracking-wider">
                    Anzeige & Ansicht
                  </div>

                  <button
                    onClick={() => {
                      setViewMode(viewMode === "compact" ? "hourly" : "compact");
                      setShowMehrMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center justify-between font-medium cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <SlidersHorizontal size={15} className="text-slate-500" />
                      {viewMode === "compact" ? "Stunden-Detailansicht" : "Kompaktansicht"}
                    </span>
                    <span className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                      {viewMode === "compact" ? "1.-6. Std" : "Einfach"}
                    </span>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <div className="px-3 py-1.5 text-[0.625rem] font-black text-slate-400 uppercase tracking-wider">
                    Statistiken & Berichte
                  </div>

                  <button
                    onClick={() => {
                      setShowStats(!showStats);
                      setShowMehrMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <BarChart3 size={15} className="text-indigo-600" />
                    <span>Statistik & Monatsübersicht</span>
                  </button>

                  {validationErrors.length > 0 && (
                    <button
                      onClick={() => {
                        setShowValidation(!showValidation);
                        setShowMehrMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-amber-800 hover:bg-amber-50/60 flex items-center justify-between font-medium cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <AlertCircle size={15} className="text-amber-600" />
                        Eingabehilfe & Fehler
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[0.625rem] font-black">
                        {validationErrors.length}
                      </span>
                    </button>
                  )}

                  <div className="my-1 border-t border-slate-100" />

                  <div className="px-3 py-1.5 text-[0.625rem] font-black text-slate-400 uppercase tracking-wider">
                    Aktionen
                  </div>

                  {recentChanges.length > 0 && (
                    <button
                      onClick={() => {
                        handleUndo();
                        setShowMehrMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium cursor-pointer"
                    >
                      <Undo size={15} className="text-slate-500" />
                      <span>Rückgängig ({recentChanges[0].studentName})</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      window.print();
                      setShowMehrMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <Printer size={15} className="text-slate-500" />
                    <span>Drucken / PDF Export</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 4. COMPACT DAY STATUS BANNER                              */}
      {/* ========================================================= */}
      {!isFree && (
        <div className="bg-slate-50/80 rounded-xl px-4 py-2.5 border border-slate-200/60 flex flex-wrap items-center justify-between gap-3 text-[0.8125rem] print:hidden">
          <div className="flex items-center gap-3 font-semibold text-slate-700">
            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-100/60 px-2.5 py-0.5 rounded-full">
              <Check size={14} className="stroke-[3]" />
              {dayStats.present} anwesend
            </span>

            {dayStats.absent > 0 ? (
              <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-100/60 px-2.5 py-0.5 rounded-full">
                <Minus size={14} className="stroke-[3]" />
                {dayStats.absent} abwesend
                {dayStats.excused > 0 && ` (${dayStats.excused} entschl.)`}
              </span>
            ) : (
              <span className="text-slate-400 font-medium">0 abwesend</span>
            )}

            {dayStats.totalFehlstunden > 0 && (
              <span className="inline-flex items-center gap-1 text-indigo-700 font-extrabold bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full text-[0.75rem]">
                <Clock3 size={12} className="stroke-[2.5]" />
                {dayStats.totalFehlstunden} Fehlstunde{dayStats.totalFehlstunden > 1 ? "n" : ""}
              </span>
            )}

            {dayStats.delayed > 0 && (
              <span className="inline-flex items-center gap-1 text-orange-700 font-bold bg-orange-100/60 px-2 py-0.5 rounded-full text-[0.75rem]">
                <Clock3 size={12} />
                {dayStats.delayed} verspätet
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isChecked ? (
              <span className="text-emerald-700 font-extrabold flex items-center gap-1 text-[0.75rem] bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                ✓ Anwesenheit geprüft
              </span>
            ) : dayStats.untracked > 0 ? (
              <button
                onClick={() => setAllStudents("a")}
                className="text-amber-800 font-bold text-[0.75rem] flex items-center gap-1 hover:underline cursor-pointer bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200"
              >
                <AlertCircle size={13} className="text-amber-600" />
                {dayStats.untracked} noch offen
              </button>
            ) : (
              <span className="text-slate-400 text-[0.75rem]">Alle erfasst</span>
            )}
          </div>
        </div>
      )}

      {/* Validation alert drawer if opened */}
      <AnimatePresence>
        {showValidation && validationErrors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 space-y-3 print:hidden overflow-hidden"
          >
            <div className="flex items-center justify-between text-amber-900 font-black text-[0.8125rem]">
              <span className="flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-600 animate-pulse" />
                Eingabehilfe & Auffälligkeiten ({validationErrors.length})
              </span>
              <button
                onClick={() => setShowValidation(false)}
                className="text-amber-700 hover:text-amber-900 text-[0.75rem] font-bold"
              >
                Schließen ✕
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {validationErrors.map((err) => (
                <div
                  key={err.id}
                  className="bg-white border border-amber-200 p-3 rounded-xl flex flex-col justify-between gap-2 shadow-xs text-[0.75rem]"
                >
                  <p className="font-semibold text-slate-700">{err.message}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {err.fixOptions.map((opt, oIdx) => (
                      <button
                        key={oIdx}
                        onClick={opt.action}
                        className={`text-[0.625rem] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          opt.isSecondary
                            ? "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            : "bg-amber-600 text-white hover:bg-amber-700"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* FREE / HOLIDAY STATE                                      */}
      {/* ========================================================= */}
      {isFree ? (
        <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50/50 to-white px-6 py-10 text-center shadow-xs print:hidden">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-200 bg-white text-rose-600 shadow-xs">
            <Calendar size={24} />
          </div>
          <h3 className="mt-3 text-lg font-black text-slate-900">Keine Anwesenheit erforderlich</h3>
          <p className="mx-auto mt-1 max-w-xl text-xs font-semibold text-slate-500">
            {holiday || "Dieser Tag ist schulfrei"}. Für schulfreie Tage wird keine Anwesenheitsliste geführt.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => navDate(-1)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <ChevronLeft size={14} /> Vorheriger Schultag
            </button>
            <button
              type="button"
              onClick={() => navDate(1)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer"
            >
              Nächster Schultag <ChevronRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* 5. SIMPLIFIED MAIN STUDENT LIST (COMPACT & HOURLY)        */
        /* ========================================================= */
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 print:hidden overflow-hidden">
          {viewMode === "compact" ? (
            /* COMPACT SINGLE-SCREEN VIEW (DEFAULT) */
            <div className="divide-y divide-slate-100">
              {sortedStudents.length === 0 && (
                <div className="p-8 text-center text-sm font-bold text-slate-400">
                  Noch keine Schüler:innen in Klasse {classLabel} angelegt.
                </div>
              )}

              {sortedStudents.map((s, idx) => {
                const statusData = app.anwesenheit[s.id]?.[selectedDate] || {};
                const details = app.anwesenheitDetail?.[s.id]?.[selectedDate];

                const states = Object.values(statusData);
                const absentHoursCount = states.filter((st) => st === "e" || st === "u").length;
                const studentFehlstunden =
                  details?.fehlstunden !== undefined
                    ? details.fehlstunden
                    : absentHoursCount > 0
                    ? absentHoursCount
                    : 0;

                const isAbsent = states.some((st) => st === "e" || st === "u") || studentFehlstunden > 0;
                const isUnexcused = states.some((st) => st === "u") || details?.notiz === "Unentschuldigt";
                const isExcused = (states.some((st) => st === "e") || studentFehlstunden > 0) && !isUnexcused;
                const isPresent = !isAbsent && states.length > 0;

                const missedDays = Object.values(app.anwesenheit[s.id] || {}).filter((dayData) =>
                  Object.values(dayData).some((st) => st === "e" || st === "u")
                ).length;

                return (
                  <div
                    key={s.id}
                    className={`p-3 sm:px-4 sm:py-3.5 flex flex-wrap items-center justify-between gap-3 transition-colors ${
                      isAbsent
                        ? isUnexcused
                          ? "bg-rose-50/25 hover:bg-rose-50/40"
                          : "bg-amber-50/20 hover:bg-amber-50/35"
                        : "hover:bg-slate-50/70"
                    }`}
                  >
                    {/* Left: Student Name & Info */}
                    <div className="flex items-center gap-3 min-w-[200px] flex-1">
                      <span className="text-[0.6875rem] font-black text-slate-300 tabular-nums w-5">
                        {idx + 1}
                      </span>

                      {/* Initial Avatar */}
                      <div
                        className={`w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-[0.6875rem] font-black shrink-0 ${
                          isAbsent
                            ? isUnexcused
                              ? "bg-rose-100 text-rose-800 border-rose-300"
                              : "bg-amber-100 text-amber-800 border-amber-300"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {s.vorname.charAt(0)}
                        {s.nachname.charAt(0)}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setAbsencesModalSid(s.id)}
                            className="text-[0.875rem] font-bold text-slate-900 hover:text-emerald-700 transition-colors text-left focus:outline-none truncate cursor-pointer"
                          >
                            {s.nachname} <span className="font-semibold text-slate-600">{s.vorname}</span>
                          </button>

                          {missedDays > 0 && (
                            <button
                              onClick={() => setAbsencesModalSid(s.id)}
                              className={`text-[0.5625rem] font-black px-1.5 py-0.2 rounded-md cursor-pointer ${
                                missedDays >= 5
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                              title={`${missedDays} Fehltage im Schuljahr`}
                            >
                              {missedDays} Fehltag{missedDays > 1 ? "e" : ""}
                            </button>
                          )}
                        </div>

                        {/* Note / Reason Pill / Fehlstunden if present */}
                        {(details?.notiz || details?.verspaetung || studentFehlstunden > 0) && (
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5 text-[0.6875rem]">
                            {studentFehlstunden > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCurrentFehlstunden(studentFehlstunden);
                                  setActiveFehlstundenSid(s.id);
                                }}
                                className="inline-flex items-center gap-1 text-indigo-700 font-extrabold bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md hover:bg-indigo-100 transition-colors cursor-pointer"
                                title={`${studentFehlstunden} versäumte Unterrichtsstunde(n) – Klick zum Bearbeiten`}
                              >
                                <Clock3 size={11} className="stroke-[2.5]" />
                                <span>{studentFehlstunden} Std.</span>
                              </button>
                            )}
                            {details?.notiz && (
                              <span className="text-slate-600 italic truncate max-w-xs bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                "{details.notiz}"
                              </span>
                            )}
                            {details?.verspaetung ? (
                              <span className="text-orange-700 font-extrabold bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded">
                                +{details.verspaetung}m
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Status Toggle & Quick Reason */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Presence Toggle Buttons */}
                      <div className="inline-flex p-0.5 rounded-xl bg-slate-100 border border-slate-200/80">
                        <button
                          type="button"
                          onClick={() => setWholeDay(s.id, "a")}
                          className={`px-3 py-1.5 rounded-lg text-[0.75rem] font-black transition-all cursor-pointer flex items-center gap-1 ${
                            isPresent
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "text-slate-600 hover:text-emerald-700"
                          }`}
                        >
                          <Check size={14} className={isPresent ? "stroke-[3]" : ""} />
                          <span>da</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (!isAbsent) {
                              setWholeDay(s.id, "e");
                            }
                            setActiveReasonSid(s.id);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[0.75rem] font-black transition-all cursor-pointer flex items-center gap-1 ${
                            isAbsent
                              ? isUnexcused
                                ? "bg-rose-600 text-white shadow-xs"
                                : "bg-amber-500 text-white shadow-xs"
                              : "text-slate-600 hover:text-rose-700"
                          }`}
                        >
                          <X size={14} className={isAbsent ? "stroke-[3]" : ""} />
                          <span>fehlt</span>
                        </button>
                      </div>

                      {/* Absence Reason / Detail Button */}
                      {isAbsent && (
                        <div className="relative">
                          <button
                            onClick={() => setActiveReasonSid(s.id)}
                            className="px-2.5 py-1 rounded-lg text-[0.6875rem] font-extrabold border bg-white hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-1 border-slate-200 text-slate-700"
                          >
                            <span>
                              {details?.notiz
                                ? details.notiz.length > 12
                                  ? details.notiz.slice(0, 12) + "…"
                                  : details.notiz
                                : isUnexcused
                                ? "unentschuldigt"
                                : "entschuldigt"}
                            </span>
                            <ChevronRight size={12} className="rotate-90 text-slate-400" />
                          </button>

                          {/* Quick Reason Popover */}
                          <AnimatePresence>
                            {activeReasonSid === s.id && (
                              <motion.div
                                initial={{ opacity: 0, y: 5, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                className="absolute right-0 mt-1 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 text-[0.75rem] space-y-1"
                              >
                                <div className="px-2 py-1 font-black text-slate-400 uppercase text-[0.5625rem] tracking-wider">
                                  Grund wählen
                                </div>
                                <button
                                  onClick={() => handleSelectQuickReason(s.id, "Krank", "e")}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-50 text-amber-900 font-bold flex items-center justify-between cursor-pointer"
                                >
                                  <span>🩺 Krank</span>
                                  <span className="text-[0.625rem] text-amber-700 font-semibold">entschuldigt</span>
                                </button>
                                <button
                                  onClick={() => handleSelectQuickReason(s.id, "Arztbesuch", "e")}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-50 text-amber-900 font-bold flex items-center justify-between cursor-pointer"
                                >
                                  <span>🏥 Arzt / Termine</span>
                                  <span className="text-[0.625rem] text-amber-700 font-semibold">entschuldigt</span>
                                </button>
                                <button
                                  onClick={() => handleSelectQuickReason(s.id, "Familiäre Gründe", "e")}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-50 text-amber-900 font-bold flex items-center justify-between cursor-pointer"
                                >
                                  <span>🏠 Familiär</span>
                                  <span className="text-[0.625rem] text-amber-700 font-semibold">entschuldigt</span>
                                </button>
                                <button
                                  onClick={() => handleSelectQuickReason(s.id, "Unentschuldigt", "u")}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-900 font-bold flex items-center justify-between cursor-pointer"
                                >
                                  <span>❓ Unentschuldigt</span>
                                  <span className="text-[0.625rem] text-rose-700 font-semibold">ohne Grund</span>
                                </button>

                                <div className="border-t border-slate-100 my-1" />

                                <button
                                  onClick={() => {
                                    setActiveReasonSid(null);
                                    setActiveNoteSid(s.id);
                                    setCurrentNote(details?.notiz || "");
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 font-bold flex items-center gap-1.5 cursor-pointer"
                                >
                                  <MessageSquare size={13} className="text-slate-500" />
                                  <span>Eigene Notiz schreiben...</span>
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* Fehlstunden Clock button */}
                      <button
                        type="button"
                        onClick={() => {
                          const initialVal =
                            details?.fehlstunden !== undefined
                              ? details.fehlstunden
                              : absentHoursCount > 0
                              ? absentHoursCount
                              : 0;
                          setCurrentFehlstunden(initialVal);
                          setActiveFehlstundenSid(s.id);
                        }}
                        className={`px-2 py-1.5 rounded-lg text-[0.75rem] font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                          studentFehlstunden > 0
                            ? "bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-xs hover:bg-indigo-200"
                            : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-transparent"
                        }`}
                        title={
                          studentFehlstunden > 0
                            ? `${studentFehlstunden} Fehlstunde(n) eingetragen – Klick zum Bearbeiten`
                            : "Fehlstunden eintragen"
                        }
                      >
                        <Clock3
                          size={15}
                          className={studentFehlstunden > 0 ? "text-indigo-600 stroke-[2.5]" : ""}
                        />
                        {studentFehlstunden > 0 && <span>{studentFehlstunden} Std.</span>}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveNoteSid(s.id);
                          setCurrentNote(details?.notiz || "");
                        }}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          details?.notiz
                            ? "bg-emerald-100 text-emerald-700"
                            : "text-slate-400 hover:bg-slate-100"
                        }`}
                        title="Notiz / Grund"
                      >
                        <MessageSquare size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* HOURLY MATRIX VIEW (WHEN TOGGLED VIA MEHR) */
            <div className="w-full overflow-x-auto no-scrollbar">
              <table className="w-full border-collapse text-left text-[0.8125rem]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[0.625rem] font-black uppercase text-slate-500 tracking-wider">
                    <th className="p-3 w-10">#</th>
                    <th className="p-3 w-40">Name</th>
                    <th className="p-3 text-center w-20">Tag</th>
                    {activeHours.map((hourNum) => (
                      <th key={hourNum} className="p-2 text-center w-16 border-l border-slate-200/60">
                        {hourNum}. Std
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedStudents.map((s, idx) => {
                    const statusData = app.anwesenheit[s.id]?.[selectedDate] || {};
                    return (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-300">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-900">
                          {s.nachname} {s.vorname}
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-flex gap-1">
                            <button
                              onClick={() => setWholeDay(s.id, "a")}
                              className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-extrabold text-[0.6875rem]"
                            >
                              A
                            </button>
                            <button
                              onClick={() => setWholeDay(s.id, "e")}
                              className="px-2 py-1 rounded bg-amber-100 text-amber-800 font-extrabold text-[0.6875rem]"
                            >
                              E
                            </button>
                            <button
                              onClick={() => setWholeDay(s.id, "u")}
                              className="px-2 py-1 rounded bg-rose-100 text-rose-800 font-extrabold text-[0.6875rem]"
                            >
                              U
                            </button>
                          </div>
                        </td>
                        {activeHours.map((hourNum) => {
                          const st = statusData[hourNum] || "a";
                          return (
                            <td key={hourNum} className="p-2 text-center border-l border-slate-100">
                              <button
                                onClick={() =>
                                  setStatus(s.id, hourNum, st === "a" ? "e" : st === "e" ? "u" : "a")
                                }
                                className={`w-8 h-8 rounded-lg font-black text-[0.75rem] cursor-pointer transition-all ${
                                  st === "a"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : st === "e"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {st.toUpperCase()}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* STATS & TRENDS DRAWER / SECTION                           */}
      {/* ========================================================= */}
      {showStats && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 print:shadow-none print:border-none print:p-0"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[1.25rem] font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="text-indigo-600" size={22} />
              Fehlzeiten-Statistik
            </h3>
            <button
              onClick={() => setShowStats(false)}
              className="text-slate-400 hover:text-slate-600 text-[0.75rem] font-bold cursor-pointer"
            >
              Schließen ✕
            </button>
          </div>

          <div className="w-full overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-[0.8125rem]">
              <thead>
                <tr className="border-b border-slate-200 text-[0.625rem] font-black uppercase tracking-wider text-slate-400">
                  <th className="p-3">Schüler</th>
                  <th className="p-3 text-center" colSpan={2}>
                    1. Semester
                  </th>
                  <th className="p-3 text-center" colSpan={2}>
                    2. Semester
                  </th>
                  <th className="p-3 text-center bg-slate-50" colSpan={2}>
                    Gesamt
                  </th>
                </tr>
                <tr className="border-b border-slate-100 text-[0.5625rem] font-black uppercase text-slate-400">
                  <th className="p-2"></th>
                  <th className="p-2 text-center text-amber-600">Entsch.</th>
                  <th className="p-2 text-center text-rose-600">Unentsch.</th>
                  <th className="p-2 text-center text-amber-600">Entsch.</th>
                  <th className="p-2 text-center text-rose-600">Unentsch.</th>
                  <th className="p-2 text-center text-amber-600 bg-slate-50">Entsch.</th>
                  <th className="p-2 text-center text-rose-600 bg-slate-50">Unentsch.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedStudents.map((s) => {
                  const stats = getStats(s.id);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-extrabold text-slate-900">
                        {s.nachname} {s.vorname}
                      </td>
                      <td className="p-2.5 text-center text-amber-600">{stats.s1.e || 0}</td>
                      <td className="p-2.5 text-center text-rose-600">{stats.s1.u || 0}</td>
                      <td className="p-2.5 text-center text-amber-600">{stats.s2.e || 0}</td>
                      <td className="p-2.5 text-center text-rose-600">{stats.s2.u || 0}</td>
                      <td className="p-2.5 text-center font-black text-amber-700 bg-slate-50">
                        {stats.total.e || 0}
                      </td>
                      <td className="p-2.5 text-center font-black text-rose-700 bg-slate-50">
                        {stats.total.u || 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: "#64748B", fontWeight: 700 }}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748B" }} />
                <Tooltip />
                <Bar dataKey="Entschuldigt" stackId="a" fill="#F59E0B" />
                <Bar dataKey="Unentschuldigt" stackId="a" fill="#F43F5E" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <AttendanceTrends />
        </motion.div>
      )}

      {/* ========================================================= */}
      {/* MODALS & OVERLAYS                                         */}
      {/* ========================================================= */}
      <AnimatePresence>
        {/* Fehltage Modal */}
        {absencesModalSid && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setAbsencesModalSid(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-md border border-slate-100 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[1.125rem] font-black text-slate-900 flex items-center gap-2">
                    <Calendar className="text-emerald-600" size={18} />
                    Fehltage Übersicht
                  </h3>
                  <p className="text-[0.75rem] font-bold text-slate-500 mt-0.5">
                    {app.schueler.find((s) => s.id === absencesModalSid)?.nachname}{" "}
                    {app.schueler.find((s) => s.id === absencesModalSid)?.vorname}
                  </p>
                </div>
                <button
                  onClick={() => setAbsencesModalSid(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                {(() => {
                  const studentAttendance = app.anwesenheit[absencesModalSid] || {};
                  const absenceDates = Object.keys(studentAttendance)
                    .filter((dateStrVal) =>
                      Object.values(studentAttendance[dateStrVal]).some((st) => st === "e" || st === "u")
                    )
                    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

                  if (absenceDates.length === 0) {
                    return (
                      <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                        Bisher keine Fehltage erfasst.
                      </div>
                    );
                  }

                  return absenceDates.map((dateStrVal) => {
                    const data = studentAttendance[dateStrVal];
                    const states = Object.values(data);
                    const unexcusedCount = states.filter((st) => st === "u").length;
                    const excusedCount = states.filter((st) => st === "e").length;
                    const dayDetail = app.anwesenheitDetail?.[absencesModalSid]?.[dateStrVal];
                    const note = dayDetail?.notiz;
                    const hoursMissed =
                      dayDetail?.fehlstunden !== undefined
                        ? dayDetail.fehlstunden
                        : excusedCount + unexcusedCount;
                    const dVal = new Date(dateStrVal);
                    const isUnex = unexcusedCount > 0;

                    return (
                      <div
                        key={dateStrVal}
                        className={`p-3 rounded-xl border text-[0.8125rem] ${
                          isUnex ? "bg-rose-50/60 border-rose-200" : "bg-slate-50 border-slate-200/80"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-extrabold text-slate-900">
                            {dVal.toLocaleDateString("de-AT", {
                              weekday: "short",
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {hoursMissed > 0 && (
                              <span className="text-[0.625rem] font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                                <Clock3 size={10} />
                                {hoursMissed} Std.
                              </span>
                            )}
                            <span
                              className={`text-[0.625rem] font-black px-2 py-0.5 rounded-full ${
                                isUnex ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {isUnex ? "Unentschuldigt" : "Entschuldigt"}
                            </span>
                          </div>
                        </div>
                        {note && (
                          <div className="text-[0.75rem] italic text-slate-600 bg-white/60 p-2 rounded-lg mt-1 border border-slate-100">
                            "{note}"
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </motion.div>
          </div>
        )}

        {/* Notiz Modal */}
        {activeNoteSid && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-5 shadow-2xl w-full max-w-md border border-slate-100"
            >
              <h3 className="text-[1.125rem] font-black text-slate-900 mb-2 flex items-center gap-2">
                <MessageSquare className="text-emerald-600" size={18} />
                Abwesenheitsgrund / Notiz
              </h3>
              <p className="text-[0.75rem] font-bold text-slate-500 mb-3">
                {app.schueler.find((s) => s.id === activeNoteSid)?.nachname}{" "}
                {app.schueler.find((s) => s.id === activeNoteSid)?.vorname}
              </p>

              <textarea
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[0.875rem] outline-none focus:border-emerald-500 min-h-[100px]"
                placeholder="Grund der Abwesenheit oder wichtige Notiz..."
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
                autoFocus
              />

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setActiveNoteSid(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-[0.8125rem] hover:bg-slate-200 cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => saveNote(activeNoteSid)}
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[0.8125rem] hover:bg-emerald-700 shadow-sm cursor-pointer"
                >
                  Speichern
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Fehlstunden Modal */}
        {activeFehlstundenSid && (
          <div
            id="modal-fehlstunden"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
            onClick={(e) => {
              if (e.target === e.currentTarget) setActiveFehlstundenSid(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-2xl p-5 shadow-2xl w-full max-w-sm border border-slate-100 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <Clock3 size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-tight">
                      Fehlstunden eintragen
                    </h3>
                    <p className="text-xs font-bold text-slate-500">
                      {app.schueler.find((s) => s.id === activeFehlstundenSid)?.vorname}{" "}
                      {app.schueler.find((s) => s.id === activeFehlstundenSid)?.nachname}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveFehlstundenSid(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                  title="Schließen"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Day info subtext */}
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                <span>{formattedDate}</span>
                <span>Unterrichtstag: {activeHours.length > 0 ? activeHours.length : 6} Std.</span>
              </div>

              {/* Main Stepper & Numeric Input */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 flex flex-col items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Versäumte Unterrichtsstunden
                </span>

                <div className="flex items-center gap-3 w-full justify-center">
                  <button
                    type="button"
                    onClick={() => setCurrentFehlstunden((prev) => Math.max(0, prev - 1))}
                    disabled={currentFehlstunden <= 0}
                    className="w-11 h-11 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95 text-lg font-black"
                    title="1 Stunde weniger"
                  >
                    <Minus size={18} strokeWidth={3} />
                  </button>

                  <div className="relative flex items-center justify-center">
                    <input
                      type="number"
                      min={0}
                      max={activeHours.length > 0 ? activeHours.length : 6}
                      value={currentFehlstunden}
                      autoFocus
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        const maxH = activeHours.length > 0 ? activeHours.length : 6;
                        setCurrentFehlstunden(isNaN(val) ? 0 : Math.max(0, Math.min(maxH, val)));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          saveFehlstunden(activeFehlstundenSid);
                        } else if (e.key === "Escape") {
                          setActiveFehlstundenSid(null);
                        }
                      }}
                      className="w-24 h-12 text-center text-3xl font-black text-indigo-700 bg-white border-2 border-indigo-400 rounded-xl shadow-xs focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 tabular-nums transition-all"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const maxH = activeHours.length > 0 ? activeHours.length : 6;
                      setCurrentFehlstunden((prev) => Math.min(maxH, prev + 1));
                    }}
                    disabled={currentFehlstunden >= (activeHours.length > 0 ? activeHours.length : 6)}
                    className="w-11 h-11 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95 text-lg font-black"
                    title="1 Stunde mehr"
                  >
                    <Plus size={18} strokeWidth={3} />
                  </button>
                </div>

                <div className="text-[11px] font-bold text-center">
                  {currentFehlstunden === 0 ? (
                    <span className="text-emerald-600">Kind ist voll anwesend (0 Fehlstunden)</span>
                  ) : currentFehlstunden >= (activeHours.length > 0 ? activeHours.length : 6) ? (
                    <span className="text-rose-600">Ganzer Schultag abwesend ({currentFehlstunden} Std.)</span>
                  ) : (
                    <span className="text-indigo-600">
                      {currentFehlstunden} von {activeHours.length > 0 ? activeHours.length : 6} Std. versäumt
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Select Buttons */}
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                  Schnellauswahl
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "0 (Da)", val: 0 },
                    { label: "1 Std", val: 1 },
                    { label: "2 Std", val: 2 },
                    { label: "3 Std", val: 3 },
                    { label: "4 Std", val: 4 },
                    ...(activeHours.length > 4 ? [{ label: "5 Std", val: 5 }] : []),
                    {
                      label: `Ganztag (${activeHours.length > 0 ? activeHours.length : 6})`,
                      val: activeHours.length > 0 ? activeHours.length : 6,
                    },
                  ]
                    .filter((item, idx, arr) => arr.findIndex((x) => x.val === item.val) === idx)
                    .map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setCurrentFehlstunden(item.val)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                          currentFehlstunden === item.val
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                            : "bg-slate-100 border-slate-200/80 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveFehlstundenSid(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs cursor-pointer transition-all"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={() => saveFehlstunden(activeFehlstundenSid)}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-sm cursor-pointer transition-all active:scale-98 flex items-center justify-center gap-1.5"
                >
                  <Check size={14} strokeWidth={3} />
                  <span>Speichern</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Verspätung Modal */}
        {activeDelaySid && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-5 shadow-2xl w-full max-w-sm border border-slate-100"
            >
              <h3 className="text-[1.125rem] font-black text-slate-900 mb-1 flex items-center gap-2">
                <Clock3 className="text-orange-600" size={18} />
                Verspätung eintragen
              </h3>
              <p className="text-[0.75rem] font-bold text-slate-500 mb-4">
                {app.schueler.find((s) => s.id === activeDelaySid)?.nachname}{" "}
                {app.schueler.find((s) => s.id === activeDelaySid)?.vorname}
              </p>

              <div className="text-center my-4">
                <div className="text-4xl font-black text-orange-600 tabular-nums">
                  {currentDelay}
                </div>
                <div className="text-[0.625rem] font-bold uppercase text-slate-400 mt-1">
                  Minuten zu spät
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 my-4">
                {[5, 10, 15, 20, 30, 45].map((val) => (
                  <button
                    key={val}
                    onClick={() => setCurrentDelay(val)}
                    className={`py-2 rounded-xl text-[0.75rem] font-black border transition-all cursor-pointer ${
                      currentDelay === val
                        ? "bg-orange-600 border-orange-600 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    +{val}m
                  </button>
                ))}
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setActiveDelaySid(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-[0.8125rem] hover:bg-slate-200 cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => saveDelay(activeDelaySid)}
                  className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl font-black text-[0.8125rem] hover:bg-orange-700 shadow-sm cursor-pointer"
                >
                  Übernehmen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Print View Output */}
      <div className="hidden print:block bg-white text-black p-4">
        <PrintHeader title={`Anwesenheitsprotokoll - Klasse ${classLabel}`} />
        <p className="text-sm font-bold my-2">Datum: {formattedDate}</p>
        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-black">
              <th className="p-2 text-left border-r border-black">Schüler/in</th>
              <th className="p-2 text-center border-r border-black">Status</th>
              <th className="p-2 text-left">Anmerkung</th>
            </tr>
          </thead>
          <tbody>
            {sortedStudents.map((s) => {
              const statusData = app.anwesenheit[s.id]?.[selectedDate] || {};
              const details = app.anwesenheitDetail?.[s.id]?.[selectedDate];
              const states = Object.values(statusData);
              const isAbsent = states.some((st) => st === "e" || st === "u");
              const isUnex = states.some((st) => st === "u");

              return (
                <tr key={s.id} className="border-b border-black">
                  <td className="p-2 font-bold border-r border-black">
                    {s.nachname} {s.vorname}
                  </td>
                  <td className="p-2 text-center border-r border-black font-bold">
                    {isAbsent ? (isUnex ? "Abwesend (u)" : "Abwesend (e)") : "Anwesend"}
                  </td>
                  <td className="p-2 italic">{details?.notiz || "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
