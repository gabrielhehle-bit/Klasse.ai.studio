import React, { useState, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { getTodayName, getSemester, isHoliday } from "../lib/utils";
import { VM_ZEITEN, STUNDEN_INFO } from "../constants";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Minus,
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
  Cell
} from "recharts";
import PrintHeader from "./PrintHeader";
import AttendanceTrends from "./AttendanceTrends";

export default function Attendance() {
  const { app, setApp } = useApp();
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    // If today is Sunday, move to Monday (+1). If today is Saturday, move to Friday (-1).
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    else if (d.getDay() === 6) d.setDate(d.getDate() - 1);

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
  const [showStats, setShowStats] = useState(false);
  const [activeNoteSid, setActiveNoteSid] = useState<string | null>(null);
  const [activeDelaySid, setActiveDelaySid] = useState<string | null>(null);
  const [absencesModalSid, setAbsencesModalSid] = useState<string | null>(null);
  const [currentNote, setCurrentNote] = useState("");
  const [currentDelay, setCurrentDelay] = useState<number>(0);
  const [visibleLimit, setVisibleLimit] = useState(15);
  const [recentChanges, setRecentChanges] = useState<{
    studentId: string;
    studentName: string;
    date: string;
    prevStatus: any;
    prevDetail: any;
  }[]>([]);

  React.useEffect(() => {
    setVisibleLimit(15);
  }, [app?.schueler?.length, selectedDate]);

  const [y, m, d] = selectedDate.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const getDayStatus = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    const override = app.calendarOverrides?.[dateStr];
    if (override)
      return {
        status: override,
        holidayName: isHoliday(date, app.calendarSettings?.disabledHolidays, app.bundesland || 'VBG'),
      };
    const holiday = isHoliday(date, app.calendarSettings?.disabledHolidays, app.bundesland || 'VBG');
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

  // Auto-default to "Alle anwesend" if no attendance data is present for the selected day yet.
  React.useEffect(() => {
    if (isFree) return;
    if (!app.schueler || app.schueler.length === 0) return;

    const [yr, mo, dy] = selectedDate.split("-").map(Number);
    const dObj = new Date(yr, mo - 1, dy);
    const dName = getTodayName(dObj);
    const tInfo = dName ? app.tageplan?.[dName] || {} : {};
    const hours: number[] = tInfo.stunden || [];
    if (hours.length === 0) return;

    // Check if any student has data for this date
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

  // Register change for undo history
  const registerUndo = (sid: string, studentName: string) => {
    const prevStatus = { ...(app.anwesenheit[sid]?.[selectedDate] || {}) };
    const prevDetail = { ...(app.anwesenheitDetail?.[sid]?.[selectedDate] || {}) };
    setRecentChanges(prev => [
      {
        studentId: sid,
        studentName,
        date: selectedDate,
        prevStatus,
        prevDetail
      },
      ...prev.slice(0, 4) // Keep last 5 entries
    ]);
  };

  // Execute undo action
  const handleUndo = () => {
    if (recentChanges.length === 0) return;
    const lastChange = recentChanges[0];
    setApp(prev => {
      if (lastChange.studentId === "__BULK__") {
        return {
          ...prev,
          anwesenheit: lastChange.prevStatus,
          anwesenheitDetail: lastChange.prevDetail
        };
      }

      const newAnwesenheit = { ...prev.anwesenheit };
      const newAnwesenheitDetail = { ...prev.anwesenheitDetail };

      newAnwesenheit[lastChange.studentId] = {
        ...(newAnwesenheit[lastChange.studentId] || {}),
        [lastChange.date]: lastChange.prevStatus
      };

      const studDetails = newAnwesenheitDetail[lastChange.studentId] || {};
      newAnwesenheitDetail[lastChange.studentId] = {
        ...studDetails,
        [lastChange.date]: lastChange.prevDetail
      };

      return {
        ...prev,
        anwesenheit: newAnwesenheit,
        anwesenheitDetail: newAnwesenheitDetail
      };
    });
    setRecentChanges(prev => prev.slice(1));
  };

  // Memoized current day statistics
  const dayStats = useMemo(() => {
    let presentCount = 0;
    let excusedCount = 0;
    let unexcusedCount = 0;
    let delayCount = 0;
    let untrackedCount = 0;

    app.schueler.forEach(s => {
      const statusData = app.anwesenheit[s.id]?.[selectedDate] || {};
      const details = app.anwesenheitDetail?.[s.id]?.[selectedDate];
      
      const states = Object.values(statusData);
      const hasE = states.some(st => st === 'e');
      const hasU = states.some(st => st === 'u');
      const isDelayed = !!(details?.verspaetung && details.verspaetung > 0);

      if (activeHours.length > 0 && states.length === 0) {
        untrackedCount++;
      } else {
        if (hasU) {
          unexcusedCount++;
        } else if (hasE) {
          excusedCount++;
        } else {
          presentCount++;
        }
      }

      if (isDelayed) {
        delayCount++;
      }
    });

    return {
      present: presentCount,
      excused: excusedCount,
      unexcused: unexcusedCount,
      delayed: delayCount,
      untracked: untrackedCount,
      total: app.schueler.length
    };
  }, [app.schueler, app.anwesenheit, app.anwesenheitDetail, selectedDate, activeHours]);

  // Memoized current teaching hour matching system time
  const currentHourHighlight = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (selectedDate !== todayStr) return null;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const hStr of Object.keys(STUNDEN_INFO)) {
      const hNum = Number(hStr);
      const timeRange = app.stundenZeiten?.[hNum] || STUNDEN_INFO[hNum];
      if (timeRange) {
        const [startStr, endStr] = timeRange.split('–');
        if (startStr && endStr) {
          const [sh, sm] = startStr.split(':').map(Number);
          const [eh, em] = endStr.split(':').map(Number);
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
    a.nachname.localeCompare(b.nachname, "de"),
  );

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

      const hasAbsence = Object.values(statusData).some(
        (st) => st === "e" || st === "u",
      );
      const hasDelay = !!(details?.verspaetung && details.verspaetung > 0);
      const isUnexcused = Object.values(statusData).some((st) => st === "u");
      const hasNote = !!(details?.notiz && details.notiz.trim().length > 0);

      // 1. Contradiction: Absence & Delay
      const contradictionId = `${s.id}-contradiction`;
      if (hasAbsence && hasDelay && !dismissedAlerts.includes(contradictionId)) {
        list.push({
          id: contradictionId,
          studentId: s.id,
          studentName: `${s.vorname} ${s.nachname}`,
          type: "contradiction",
          message: `Widerspruch bei ${s.vorname}: Verspätung von ${details.verspaetung} Min. eingetragen, obwohl er/sie heute abwesend ist.`,
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
                  const dateAttendance = {
                    ...(studentAttendance[selectedDate] || {}),
                  };
                  Object.keys(dateAttendance).forEach((h) => {
                    if (
                      dateAttendance[h] === "e" ||
                      dateAttendance[h] === "u"
                    ) {
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
          message: `Fehlende Begründung bei ${s.vorname}: Er/sie hat unentschuldigte Fehlzeiten, aber es wurde keine Notiz erfasst.`,
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
                          notiz:
                            "Telefonischer Kontakt mit den Erziehungsberechtigten ausstehend",
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
                  const dateAttendance = {
                    ...(studentAttendance[selectedDate] || {}),
                  };
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

      // 3. Mixed absence within the same day
      const hasExcused = Object.values(statusData).some((st) => st === "e");
      const mixedAbsenceId = `${s.id}-mixedAbsence`;
      if (hasExcused && isUnexcused && !dismissedAlerts.includes(mixedAbsenceId)) {
        list.push({
          id: mixedAbsenceId,
          studentId: s.id,
          studentName: `${s.vorname} ${s.nachname}`,
          type: "mixedAbsence",
          message: `Gemischte Fehlzeiten bei ${s.vorname}: Teils entschuldigt ('e'), teils unentschuldigt ('u') am selben Tag.`,
          fixOptions: [
            {
              label: "Alle Stunden entschuldigen",
              action: () => {
                setApp((prev) => {
                  const studentAttendance = prev.anwesenheit[s.id] || {};
                  const dateAttendance = {
                    ...(studentAttendance[selectedDate] || {}),
                  };
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
              label: "Alle Stunden unentschuldigt",
              action: () => {
                setApp((prev) => {
                  const studentAttendance = prev.anwesenheit[s.id] || {};
                  const dateAttendance = {
                    ...(studentAttendance[selectedDate] || {}),
                  };
                  Object.keys(dateAttendance).forEach((h) => {
                    if (dateAttendance[h] === "e") {
                      dateAttendance[h] = "u";
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
              action: () => dismissAlert(s.id, selectedDate, mixedAbsenceId),
              isSecondary: true,
            },
          ],
        });
      }
      // 4. Frequent absences on this weekday
      const frequentAbsenceId = `${s.id}-frequentAbsence`;
      if (hasAbsence && !dismissedAlerts.includes(frequentAbsenceId)) {
        const targetDay = new Date(selectedDate).getDay();
        const weekdayNames = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
        let missedCount = 0;
        const historyDates = Object.keys(app.anwesenheit[s.id] || {});
        historyDates.forEach((dateStr) => {
          if (dateStr !== selectedDate) {
            const dObj = new Date(dateStr);
            if (dObj.getDay() === targetDay) {
              const dayData = app.anwesenheit[s.id]?.[dateStr] || {};
              if (Object.values(dayData).some((st) => st === "e" || st === "u")) {
                missedCount++;
              }
            }
          }
        });

        if (missedCount >= 3) {
          list.push({
            id: `${s.id}-frequentAbsence`,
            studentId: s.id,
            studentName: `${s.vorname} ${s.nachname}`,
            type: "frequentAbsenceOnDay",
            message: `Auffälligkeit bei ${s.vorname}: Fehlt auffällig oft an einem ${weekdayNames[targetDay]} (${missedCount + 1}. Mal).`,
            fixOptions: [
              {
                label: "Elterngespräch notieren",
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
                            notiz: "Elterngespräch wegen gehäufter Fehlzeiten erforderlich",
                          },
                        },
                      },
                    };
                  });
                },
              },
              {
                label: "Gelesen",
                action: () => dismissAlert(s.id, selectedDate, frequentAbsenceId),
                isSecondary: true,
              }
            ],
          });
        }
      }
    });
    return list;
  };

  const navDate = (days: number) => {
    const d = new Date(dateObj);
    d.setDate(d.getDate() + days);

    // Skip weekends (0 = Sunday, 6 = Saturday)
    while (d.getDay() === 0 || d.getDay() === 6) {
      d.setDate(d.getDate() + (days > 0 ? 1 : -1));
    }

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dayNum = String(d.getDate()).padStart(2, "0");
    setSelectedDate(`${y}-${m}-${dayNum}`);
  };

  const setStatus = (sid: string, hourNum: number, status: string) => {
    const s = app.schueler.find(student => student.id === sid);
    const sName = s ? `${s.vorname} ${s.nachname}` : "Schüler";
    registerUndo(sid, sName);

    setApp((prev) => {
      const studentAttendance = prev.anwesenheit[sid] || {};
      const dateAttendance = studentAttendance[selectedDate] || {};

      const currentStatus = dateAttendance[hourNum] || "a";
      const nextStatus = currentStatus === status ? "a" : status;

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

  const setWholeDay = (sid: string, status: string) => {
    const s = app.schueler.find(student => student.id === sid);
    const sName = s ? `${s.vorname} ${s.nachname}` : "Schüler";
    registerUndo(sid, sName);

    setApp((prev) => {
      const studentAttendance = prev.anwesenheit[sid] || {};
      const newDayAttendance: Record<string, string> = {};

      // Only set status for hours that exist in the schedule for that day
      activeHours.forEach((hourNum) => {
        newDayAttendance[hourNum] = status;
      });

      return {
        ...prev,
        anwesenheit: {
          ...prev.anwesenheit,
          [sid]: {
            ...studentAttendance,
            [selectedDate]: newDayAttendance,
          },
        },
      };
    });
  };

  const setAllStudents = (status: string) => {
    setRecentChanges(prev => [
      {
        studentId: "__BULK__",
        studentName: "Alle Schüler",
        date: selectedDate,
        prevStatus: { ...app.anwesenheit },
        prevDetail: { ...app.anwesenheitDetail }
      },
      ...prev.slice(0, 4)
    ]);

    setApp((prev) => {
      const newAnwesenheit = { ...prev.anwesenheit };
      app.schueler.forEach((s) => {
        const studentAttendance = newAnwesenheit[s.id] || {};
        const newDayAttendance: Record<string, string> = {};

        activeHours.forEach((hourNum) => {
          newDayAttendance[hourNum] = status;
        });

        newAnwesenheit[s.id] = {
          ...studentAttendance,
          [selectedDate]: newDayAttendance,
        };
      });
      return { ...prev, anwesenheit: newAnwesenheit };
    });
  };

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

  // Stats calculation
  const getStats = (sid: string) => {
    const data = app.anwesenheit[sid] || {};
    const res = {
      s1: { e: 0, u: 0 },
      s2: { e: 0, u: 0 },
      total: { e: 0, u: 0 },
    };

    Object.entries(data).forEach(([date, dayData]) => {
      const sem = getSemester(date);
      Object.values(dayData).forEach((status) => {
        if (status === "e") {
          res.total.e++;
          if (sem === 1) res.s1.e++;
          else res.s2.e++;
        } else if (status === "u") {
          res.total.u++;
          if (sem === 1) res.s1.u++;
          else res.s2.u++;
        }
      });
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

  return (
    <div className="space-y-5">
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white rounded-2xl p-5 shadow-sm border border-slate-200 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navDate(-1)}
            aria-label="Vorheriger Schultag"
            title="Vorheriger Schultag"
            className="p-3 hover:bg-accent/5 text-slate-600 hover:text-accent rounded-xl border border-slate-200 transition-all active:scale-95"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="relative group">
            <div className="flex flex-col items-center">
              <div className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
                {dayName}
              </div>
              <input
                type="date"
                aria-label="Anwesenheitsdatum"
                className={`px-5 py-3 border rounded-xl bg-slate-50 text-[1.125rem] leading-normal font-black outline-none transition-all cursor-pointer hover:border-accent/30 focus:ring-4 ring-accent/10 ${isFree ? "border-rose-300 text-rose-700" : "border-slate-200 text-slate-900"}`}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            {isFree && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[0.625rem] font-black uppercase px-4 py-1 rounded-full whitespace-nowrap shadow-xl shadow-rose-500/20">
                Schulfrei
              </div>
            )}
          </div>

          <button
            onClick={() => navDate(1)}
            aria-label="Nächster Schultag"
            title="Nächster Schultag"
            className="p-3 hover:bg-accent/5 text-slate-600 hover:text-accent rounded-xl border border-slate-200 transition-all active:scale-95"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {isFree && (
          <div className="flex items-center gap-3 px-5 py-4 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-rose-600 border border-rose-100">
              <AlertCircle size={22} />
            </div>
            <div>
              <div className="text-[1.125rem] leading-normal font-black tracking-tight leading-none mb-1">
                {holiday}
              </div>
              <p className="text-[0.75rem] font-bold text-rose-600 uppercase tracking-wider leading-none">
                Kein Unterricht!
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowStats(!showStats)}
            className={`btn px-5 py-3 rounded-xl text-[0.6875rem] font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${showStats ? "btn-accent" : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200"}`}
          >
            <BarChart3 size={18} /> Statistik
          </button>

          <button
            onClick={() => setAllStudents("a")}
            disabled={isFree || sortedStudents.length === 0}
            className={`btn btn-accent px-5 py-3 rounded-xl text-[0.6875rem] font-bold uppercase tracking-wider flex items-center gap-2 ${isFree || sortedStudents.length === 0 ? "opacity-40 grayscale cursor-not-allowed" : ""}`}
          >
            <Check size={18} /> Alle Anwesend
          </button>
        </div>
      </div>

      {/* 2. Real-time Day Statistics KPI Cards */}
      {!isFree && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 print:hidden">
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-5 flex items-center gap-4 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Check size={22} className="stroke-[3px]" />
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-800 tabular-nums leading-none mb-1">
                {dayStats.present}
              </div>
              <div className="text-[0.625rem] font-black uppercase text-emerald-600/70 tracking-wider">
                Anwesend
              </div>
            </div>
          </div>

          <div className="bg-amber-50/50 border border-amber-100 rounded-3xl p-5 flex items-center gap-4 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Minus size={22} className="stroke-[3px]" />
            </div>
            <div>
              <div className="text-2xl font-black text-amber-800 tabular-nums leading-none mb-1">
                {dayStats.excused}
              </div>
              <div className="text-[0.625rem] font-black uppercase text-amber-600/70 tracking-wider">
                Entschuldigt
              </div>
            </div>
          </div>

          <div className="bg-rose-50/50 border border-rose-100 rounded-3xl p-5 flex items-center gap-4 hover:shadow-lg hover:shadow-rose-500/5 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/10">
              <X size={22} className="stroke-[3px]" />
            </div>
            <div>
              <div className="text-2xl font-black text-rose-800 tabular-nums leading-none mb-1">
                {dayStats.unexcused}
              </div>
              <div className="text-[0.625rem] font-black uppercase text-rose-600/70 tracking-wider">
                Unentschuldigt
              </div>
            </div>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 rounded-3xl p-5 flex items-center gap-4 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/10">
              <Clock3 size={22} />
            </div>
            <div>
              <div className="text-2xl font-black text-indigo-800 tabular-nums leading-none mb-1">
                {dayStats.delayed}
              </div>
              <div className="text-[0.625rem] font-black uppercase text-indigo-600/70 tracking-wider">
                Verspätet
              </div>
            </div>
          </div>

          <div className="col-span-2 md:col-span-4 lg:col-span-1 bg-slate-50/50 border border-slate-100 rounded-3xl p-5 flex items-center gap-4 hover:shadow-lg hover:shadow-slate-500/5 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-slate-600 text-white flex items-center justify-center shadow-lg shadow-slate-500/10">
              <Users size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xl font-black text-slate-800 tabular-nums leading-none">
                  {dayStats.total ? Math.round(((dayStats.total - dayStats.untracked) / dayStats.total) * 100) : 0}%
                </span>
                <span className="text-[0.6875rem] font-bold text-slate-400 tabular-nums">
                  {dayStats.total - dayStats.untracked}/{dayStats.total}
                </span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-slate-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${dayStats.total ? ((dayStats.total - dayStats.untracked) / dayStats.total) * 100 : 0}%` }}
                />
              </div>
              <div className="text-[0.5625rem] font-black uppercase text-slate-500 tracking-wider mt-1.5">
                Erfassungs-Quote
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Undo Last Action Floating Toast */}
      <AnimatePresence>
        {recentChanges.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] w-full max-w-sm px-4 print:hidden">
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-4 flex items-center justify-between gap-4 shadow-2xl border border-slate-800"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[0.75rem] font-bold text-slate-300">
                  Geändert: <strong className="text-white font-black">{recentChanges[0].studentName}</strong>
                </span>
              </div>
              <button
                onClick={handleUndo}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl text-[0.6875rem] font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                <Undo size={12} /> Rückgängig
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-900/10 border border-slate-100 p-10 print:shadow-none print:border-none print:p-0 print:m-0 print:block"
        >
          <div className="flex items-center gap-4 mb-10 print:mb-6">
            <div className="w-14 h-14 bg-accent text-white rounded-2xl flex items-center justify-center shadow-lg shadow-accent/20 print:hidden">
              <BarChart3 size={28} />
            </div>
            <div>
              <h3 className="text-[1.5rem] leading-normal font-black text-slate-900 tracking-tight">
                Fehlzeiten-Statistik (Gesamtübersicht)
              </h3>
              <p className="text-[0.875rem] text-accent font-bold uppercase tracking-widest print:text-[0.5625rem]">
                Gelistet nach Semester in Stunden (Entschuldigt /
                Unentschuldigt)
              </p>
            </div>
          </div>
          <div className="w-full overflow-x-auto no-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[0.6875rem] font-black uppercase tracking-[0.2em] text-slate-300">
                  <th className="px-6 py-4 print:py-1 print:px-2 print:text-[8.5pt]">
                    Schüler
                  </th>
                  <th
                    className="px-6 py-4 text-center print:py-1 print:px-2 print:text-[8.5pt]"
                    colSpan={2}
                  >
                    1. Semester
                  </th>
                  <th
                    className="px-6 py-4 text-center print:py-1 print:px-2 print:text-[8.5pt]"
                    colSpan={2}
                  >
                    2. Semester
                  </th>
                  <th
                    className="px-6 py-4 text-center bg-slate-50/50 print:py-1 print:px-2 print:text-[8.5pt]"
                    colSpan={2}
                  >
                    Gesamt
                  </th>
                </tr>
                <tr className="border-b border-slate-50 text-[0.625rem] font-black uppercase tracking-widest">
                  <th className="px-6 py-2 print:py-0.5 print:px-2"></th>
                  <th className="px-6 py-2 text-center text-amber-500 print:py-0.5 print:px-2 print:text-[8.5pt]">
                    Ent.
                  </th>
                  <th className="px-6 py-2 text-center text-rose-500 border-r border-slate-50 print:py-0.5 print:px-2 print:text-[8.5pt]">
                    Une.
                  </th>
                  <th className="px-6 py-2 text-center text-amber-500 print:py-0.5 print:px-2 print:text-[8.5pt]">
                    Ent.
                  </th>
                  <th className="px-6 py-2 text-center text-rose-500 border-r border-slate-50 print:py-0.5 print:px-2 print:text-[8.5pt]">
                    Une.
                  </th>
                  <th className="px-6 py-2 text-center text-amber-500 bg-slate-50/50 print:py-0.5 print:px-2 print:text-[8.5pt]">
                    Ent.
                  </th>
                  <th className="px-6 py-2 text-center text-rose-500 bg-slate-50/50 print:py-0.5 print:px-2 print:text-[8.5pt]">
                    Une.
                  </th>
                </tr>
              </thead>
              <tbody className="text-[0.875rem]">
                {sortedStudents.map((s) => {
                  const stats = getStats(s.id);
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-3 max-w-[12rem] text-wrap leading-tight break-words" title={`${s.nachname} ${s.vorname}`}>
                        <button onClick={() => setAbsencesModalSid(s.id)} className="font-black text-slate-900 tracking-tight hover:text-emerald-600 transition-colors focus:outline-none text-left">
                          {s.nachname} {s.vorname}
                        </button>
                      </td>
                      <td className="px-6 py-3 text-center text-amber-600 font-medium print:py-1 print:px-2 print:text-[9pt]">
                        {stats.s1.e || "0"}
                      </td>
                      <td className="px-6 py-3 text-center text-rose-600 font-medium border-r border-slate-50 print:py-1 print:px-2 print:text-[9pt]">
                        {stats.s1.u || "0"}
                      </td>
                      <td className="px-6 py-3 text-center text-amber-600 font-medium print:py-1 print:px-2 print:text-[9pt]">
                        {stats.s2.e || "0"}
                      </td>
                      <td className="px-6 py-3 text-center text-rose-600 font-medium border-r border-slate-50 print:py-1 print:px-2 print:text-[9pt]">
                        {stats.s2.u || "0"}
                      </td>
                      <td className="px-6 py-3 text-center text-amber-600 font-black bg-slate-50/50 print:py-1 print:px-2 print:text-[9.5pt]">
                        {stats.total.e || "0"}
                      </td>
                      <td className="px-6 py-3 text-center text-rose-600 font-black bg-slate-50/50 print:py-1 print:px-2 print:text-[9.5pt]">
                        {stats.total.u || "0"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-100 print:hidden h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 0, bottom: 50 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#E2E8F0"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: "#64748B", fontWeight: 650 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={65}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#64748B" }}
                />
                <Tooltip
                  cursor={{ fill: "#F1F5F9" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                  }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{
                    fontSize: 12,
                    fontWeight: 700,
                    marginTop: "20px",
                  }}
                />
                <Bar
                  dataKey="Entschuldigt"
                  stackId="a"
                  fill="#F59E0B"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="Unentschuldigt"
                  stackId="a"
                  fill="#F43F5E"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-12 print:hidden">
            <div className="hidden print:block mb-6">
              <PrintHeader title="Anwesenheitsprotokoll - Monatsstatistik" />
            </div>
            <div className="flex items-center justify-between mb-6 print:mb-4">
              <div className="flex items-center gap-3">
                <Calendar className="text-accent print:hidden" size={20} />
                <h4 className="text-[1.125rem] leading-normal font-black text-slate-900 tracking-tight">
                  Monats-Zusammenfassung (
                  {new Date().toLocaleDateString("de-DE", {
                    month: "long",
                    year: "numeric",
                  })}
                  )
                </h4>
              </div>
            </div>

            <div className="w-full overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-900 text-[0.625rem] font-black uppercase tracking-widest text-slate-400">
                    <th className="px-4 py-3">Schüler</th>
                    <th className="px-4 py-3 text-center text-amber-600">
                      Entschuldigt (h)
                    </th>
                    <th className="px-4 py-3 text-center text-rose-600">
                      Unentschuldigt (h)
                    </th>
                    <th className="px-4 py-3 text-center text-indigo-600">
                      Verspätungen (min)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.map((s) => {
                    const month = new Date().getMonth();
                    const year = new Date().getFullYear();
                    let mEnt = 0;
                    let mUne = 0;
                    let mDelay = 0;

                    const data = app.anwesenheit[s.id] || {};
                    const details = app.anwesenheitDetail?.[s.id] || {};

                    Object.entries(data).forEach(([date, dayData]) => {
                      const d = new Date(date);
                      if (d.getMonth() === month && d.getFullYear() === year) {
                        Object.values(dayData).forEach((status) => {
                          if (status === "e") mEnt++;
                          else if (status === "u") mUne++;
                        });
                        if (details[date]?.verspaetung)
                          mDelay += details[date].verspaetung || 0;
                      }
                    });

                    return (
                      <tr
                        key={s.id}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3 max-w-[12rem] text-wrap leading-tight break-words" title={`${s.nachname} ${s.vorname}`}>
                          <button onClick={() => setAbsencesModalSid(s.id)} className="font-bold text-slate-900 hover:text-emerald-600 transition-colors focus:outline-none text-left">
                            {s.nachname} {s.vorname}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center font-black text-amber-600">
                          {mEnt || "–"}
                        </td>
                        <td className="px-4 py-3 text-center font-black text-rose-600">
                          {mUne || "–"}
                        </td>
                        <td className="px-4 py-3 text-center font-black text-indigo-600">
                          {mDelay ? `${mDelay}m` : "–"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <AttendanceTrends />
        </motion.div>
      )}

      {/* Main Table was here - now handled by previous edit */}

      {/* Popovers */}
      <AnimatePresence>
        {absencesModalSid && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setAbsencesModalSid(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md border border-slate-100 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-[1.125rem] leading-normal font-black text-slate-900 flex items-center gap-2">
                    <Calendar className="text-emerald-500" size={20} />
                    Fehltage Übersicht
                  </h3>
                  <p className="text-[0.75rem] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {app.schueler.find((s) => s.id === absencesModalSid)?.nachname}{" "}
                    {app.schueler.find((s) => s.id === absencesModalSid)?.vorname}
                  </p>
                </div>
                <button onClick={() => setAbsencesModalSid(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                {(() => {
                  const studentAttendance = app.anwesenheit[absencesModalSid] || {};
                  const absenceDates = Object.keys(studentAttendance).filter(date => {
                    return Object.values(studentAttendance[date]).some(st => st === 'e' || st === 'u');
                  }).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

                  if (absenceDates.length === 0) {
                    return <div className="text-center py-8 text-slate-400 font-medium">Bisher keine Fehltage erfasst.</div>;
                  }

                  const isFreeDay = (dateObj: Date) => {
                    const day = dateObj.getDay();
                    if (day === 0 || day === 6) return true;
                    const dStr = dateObj.toISOString().split('T')[0];
                    const override = app.calendarOverrides?.[dStr];
                    if (override === 'free') return true;
                    if (override === 'school') return false;
                    return !!isHoliday(dateObj, app.calendarSettings?.disabledHolidays, app.bundesland || 'VBG');
                  };

                  const chartData = absenceDates.slice().reverse().map(dateStr => {
                    const d = new Date(dateStr);
                    const states = Object.values(studentAttendance[dateStr]);
                    const unexcusedCount = states.filter(st => st === 'u').length;
                    const excusedCount = states.filter(st => st === 'e').length;
                    
                    const prev = new Date(d); prev.setDate(prev.getDate() - 1);
                    const next = new Date(d); next.setDate(next.getDate() + 1);
                    const isAdjacent = isFreeDay(prev) || isFreeDay(next);
                    
                    const note = app.anwesenheitDetail?.[absencesModalSid]?.[dateStr]?.notiz;

                    return {
                      dateStr,
                      shortDate: d.toLocaleDateString("de-AT", { day: '2-digit', month: '2-digit' }),
                      fullDate: d.toLocaleDateString("de-AT", { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }),
                      total: unexcusedCount + excusedCount,
                      unexcused: unexcusedCount,
                      excused: excusedCount,
                      note,
                      isAdjacent
                    };
                  });

                  return (
                    <div className="space-y-6">
                      <div className="h-48 w-full bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col">
                        <div className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 mb-2">Fehlstunden Verlauf</div>
                        <div className="flex-1 min-h-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis dataKey="shortDate" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                              <Tooltip 
                                cursor={{ fill: '#f1f5f9' }}
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                      <div className="bg-white p-3 rounded-xl shadow-xl border border-slate-100 relative z-50 min-w-[140px]">
                                        <div className="font-bold text-slate-900 mb-1">{data.fullDate || data.dateStr}</div>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                          {data.excused > 0 && <div className="text-[0.8125rem] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">{data.excused} entschl.</div>}
                                          {data.unexcused > 0 && <div className="text-[0.8125rem] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md">{data.unexcused} unentschl.</div>}
                                        </div>
                                        {data.note && (
                                          <div className="text-[0.75rem] text-slate-600 bg-slate-50 p-2 rounded-lg italic mt-1 border border-slate-100">
                                            "{data.note}"
                                          </div>
                                        )}
                                        {data.isAdjacent && (
                                          <div className="text-[0.6875rem] font-bold text-amber-600 mt-2 flex items-center gap-1.5 bg-amber-50 px-2 py-1 rounded-md">
                                            <AlertCircle size={12} />
                                            Fenstertag / Randstunde
                                          </div>
                                        )}
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.isAdjacent ? '#f59e0b' : '#94a3b8'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex items-center gap-4 mt-3 justify-center">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded bg-slate-400"></div>
                            <span className="text-[0.5625rem] font-bold text-slate-500 uppercase tracking-widest">Regulär</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded bg-amber-500"></div>
                            <span className="text-[0.5625rem] font-bold text-slate-500 uppercase tracking-widest">Fenstertag/Randstunde</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {absenceDates.map(dateStr => {
                          const data = studentAttendance[dateStr];
                          const states = Object.values(data);
                          const unexcusedCount = states.filter(st => st === 'u').length;
                          const excusedCount = states.filter(st => st === 'e').length;
                          const totalHours = states.length;
                          
                          let summary = '';
                          if (unexcusedCount > 0 && excusedCount > 0) summary = `Teilweise unentschuldigt (${unexcusedCount}/${totalHours} Std)`;
                          else if (unexcusedCount > 0) summary = unexcusedCount === totalHours ? 'Ganzen Tag unentschuldigt' : `Unentschuldigt (${unexcusedCount}/${totalHours} Std)`;
                          else summary = excusedCount === totalHours ? 'Ganzen Tag entschuldigt' : `Entschuldigt (${excusedCount}/${totalHours} Std)`;
                          
                          const note = app.anwesenheitDetail?.[absencesModalSid]?.[dateStr]?.notiz;

                          const d = new Date(dateStr);
                          const isUnexcused = unexcusedCount > 0;
                          
                          const prev = new Date(d); prev.setDate(prev.getDate() - 1);
                          const next = new Date(d); next.setDate(next.getDate() + 1);
                          const isAdjacent = isFreeDay(prev) || isFreeDay(next);

                          return (
                            <div key={dateStr} className={`p-4 rounded-2xl border transition-all ${isUnexcused ? 'bg-rose-50/50 border-rose-100' : 'bg-slate-50/50 border-slate-100'} ${isAdjacent ? 'ring-2 ring-amber-400/50 shadow-md shadow-amber-500/10' : ''}`}>
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-slate-900 text-[0.875rem] flex items-center gap-2">
                                  {d.toLocaleDateString("de-AT", { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                  {isAdjacent && <span title="Direkt vor oder nach einem schulfreien Tag"><AlertCircle size={14} className="text-amber-500" /></span>}
                                </span>
                                <span className={`text-[0.625rem] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${isUnexcused ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                  {isUnexcused ? 'Unentschuldigt' : 'Entschuldigt'}
                                </span>
                              </div>
                              <div className="text-[0.75rem] text-slate-600 font-medium mb-2">{summary}</div>
                              {note && (
                                <div className="text-[0.75rem] italic text-slate-500 bg-white/50 p-2 rounded-lg">
                                  <MessageSquare size={12} className="inline mr-1 opacity-50" />
                                  {note}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}

        {activeNoteSid && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md border border-slate-100"
            >
              <h3 className="text-[1.125rem] leading-normal font-black text-slate-900 mb-4 flex items-center gap-2">
                <MessageSquare className="text-emerald-500" size={20} />
                Abwesenheitsgrund / Notiz
              </h3>
              <p className="text-[0.75rem] font-bold text-slate-400 uppercase tracking-widest mb-2">
                {app.schueler.find((s) => s.id === activeNoteSid)?.nachname}{" "}
                {app.schueler.find((s) => s.id === activeNoteSid)?.vorname}
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {[
                  "Krank gemeldet",
                  "Arztbesuch",
                  "Zahnarzt",
                  "Verschlafen",
                  "Familiäre Gründe",
                  "Schulveranstaltung",
                  "Entschuldigung liegt vor",
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setCurrentNote((prev) => {
                        const trimmed = prev.trim();
                        return trimmed ? `${trimmed}, ${preset}` : preset;
                      });
                    }}
                    className="text-[0.625rem] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100/50 px-2.5 py-1 rounded-lg transition-all active:scale-95 cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
              <textarea
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[0.875rem] leading-snug outline-none focus:ring-4 ring-emerald-500/5 focus:border-emerald-500 transition-all min-h-[120px]"
                placeholder="Grund der Abwesenheit oder wichtige Notiz..."
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
                autoFocus
              />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setActiveNoteSid(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => saveNote(activeNoteSid)}
                  className="flex-2 py-3 bg-emerald-500 text-white rounded-xl font-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
                >
                  Speichern
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {activeDelaySid && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md border border-slate-100"
            >
              <h3 className="text-[1.125rem] leading-normal font-black text-slate-900 mb-4 flex items-center gap-2">
                <Clock3 className="text-indigo-500" size={20} />
                Verspätung tracken
              </h3>
              <p className="text-[0.75rem] font-bold text-slate-400 uppercase tracking-widest mb-6">
                {app.schueler.find((s) => s.id === activeDelaySid)?.nachname}{" "}
                {app.schueler.find((s) => s.id === activeDelaySid)?.vorname}
              </p>

              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-5xl font-black text-indigo-600 tabular-nums mb-1">
                    {currentDelay}
                  </div>
                  <div className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest">
                    Minuten zu spät
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max="60"
                  step="5"
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  value={currentDelay}
                  onChange={(e) => setCurrentDelay(parseInt(e.target.value))}
                />

                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 20, 30, 45].map((val) => (
                    <button
                      key={val}
                      onClick={() => setCurrentDelay(val)}
                      className={`py-2 rounded-xl text-[0.75rem] font-black border transition-all ${currentDelay === val ? "bg-indigo-600 border-indigo-600 text-white" : "bg-slate-50 border-slate-100 text-slate-500 hover:bg-white hover:border-indigo-200"}`}
                    >
                      +{val}m
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentDelay(0)}
                    className="col-span-2 py-2 bg-rose-50 text-rose-600 rounded-xl text-[0.75rem] font-black border border-rose-100"
                  >
                    Zurücksetzen
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setActiveDelaySid(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => saveDelay(activeDelaySid)}
                  className="flex-2 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                >
                  Übernehmen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Print View Only (Summarized for official records) */}
      <div
        className={`hidden ${showStats ? "print:hidden" : "print:block"} bg-white text-black`}
      >
        <div className="mb-4">
          <p className="text-[0.875rem] leading-snug font-bold text-slate-700 uppercase tracking-widest mb-1">
            Statusbericht:{" "}
            {new Date(selectedDate).toLocaleDateString("de-DE", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b-2 border-black">
              <th className="p-3 text-left w-1/3">Schüler/in</th>
              <th className="p-3 text-center w-16">E (h)</th>
              <th className="p-3 text-center w-16">U (h)</th>
              <th className="p-3 text-center w-16">V (m)</th>
              <th className="p-3 text-left">Anmerkungen / Gründe</th>
            </tr>
          </thead>
          <tbody>
            {sortedStudents.map((s) => {
              const dObj = new Date(selectedDate);
              const month = dObj.getMonth();
              const year = dObj.getFullYear();
              let mEnt = 0;
              let mUne = 0;
              let mDelay = 0;
              let mNotes: string[] = [];

              const data = app.anwesenheit[s.id] || {};
              const detailsList = app.anwesenheitDetail?.[s.id] || {};

              Object.entries(data).forEach(([date, dayData]) => {
                const d = new Date(date);
                if (d.getMonth() === month && d.getFullYear() === year) {
                  Object.values(dayData).forEach((status) => {
                    if (status === "e") mEnt++;
                    else if (status === "u") mUne++;
                  });
                  if (detailsList[date]?.verspaetung)
                    mDelay += detailsList[date].verspaetung || 0;
                  if (detailsList[date]?.notiz) {
                    const dayNum = d.getDate();
                    mNotes.push(`${dayNum}.: ${detailsList[date].notiz}`);
                  }
                }
              });

              return (
                <tr key={s.id} className="border-b border-black/10">
                  <td className="p-3 font-bold text-[0.875rem] leading-snug max-w-[12rem] text-wrap leading-tight break-words" title={`${s.nachname} ${s.vorname}`}>
                    {s.nachname} {s.vorname}
                  </td>
                  <td className="p-3 text-center text-[0.875rem] leading-snug">{mEnt || "0"}</td>
                  <td className="p-3 text-center text-[0.875rem] leading-snug">{mUne || "0"}</td>
                  <td className="p-3 text-center text-[0.875rem] leading-snug font-medium">
                    {mDelay ? `${mDelay}` : "0"}
                  </td>
                  <td className="p-3 text-[9pt] italic leading-tight">
                    {mNotes.join("; ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-16 grid grid-cols-3 gap-12">
          <div className="border-t border-black pt-2 text-center">
            <p className="text-[8pt] font-bold uppercase tracking-widest text-slate-400">
              Handzeichen
            </p>
            <p className="text-[9pt] mt-1 italic">Lehrperson</p>
          </div>
          <div className="border-t border-black pt-2 text-center text-[9pt] italic">
            <p className="text-[8pt] font-bold uppercase tracking-widest text-slate-400">
              Datum
            </p>
            <p className="mt-1">{new Date().toLocaleDateString("de-DE")}</p>
          </div>
          <div className="border-t border-black pt-2 text-center">
            <p className="text-[8pt] font-bold uppercase tracking-widest text-slate-400">
              Bestätigung
            </p>
            <p className="text-[9pt] mt-1 italic">Schulleitung</p>
          </div>
        </div>
      </div>

      {/* Real-time Data Validation and Auto-correction Banner */}
      {!isFree && getValidationErrors().length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50/80 border border-amber-200/90 rounded-[2rem] p-6 space-y-4 print:hidden"
        >
          <div className="flex items-center gap-2.5 text-amber-900 font-black tracking-tight leading-none">
            <AlertCircle size={20} className="text-amber-600 animate-pulse" />
            <span className="text-[0.875rem] uppercase tracking-wider">
              Intelligente Eingabe-Hilfe & Fehlererkennung (
              {getValidationErrors().length})
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getValidationErrors().map((err) => (
              <div
                key={err.id}
                className="bg-white border border-amber-200/70 p-4 rounded-2xl flex flex-col justify-between gap-3 shadow-xs"
              >
                <p className="text-[0.75rem] font-bold text-slate-700 leading-relaxed">
                  {err.message}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {err.fixOptions.map((opt, oIdx) => (
                    <button
                      key={oIdx}
                      onClick={opt.action}
                      className={`text-[0.625rem] font-black uppercase tracking-widest px-3 py-2 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-sm ${
                        opt.isSecondary
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700"
                          : "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/10"
                      }`}
                    >
                      {opt.isSecondary ? "✓" : "⚡"} {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {isFree ? (
        <div className="rounded-3xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white px-6 py-10 text-center shadow-sm print:hidden">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-200 bg-white text-rose-600 shadow-sm">
            <Calendar size={26} />
          </div>
          <h3 className="mt-4 text-xl font-black text-slate-900">Keine Anwesenheit erforderlich</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-slate-500">
            {holiday || "Dieser Tag ist schulfrei"}. Für schulfreie Tage wird keine Anwesenheitsliste geführt.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => navDate(-1)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition-colors hover:bg-slate-50"
            >
              <ChevronLeft size={15} /> Vorheriger Schultag
            </button>
            <button
              type="button"
              onClick={() => navDate(1)}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-black text-white transition-colors hover:bg-rose-700"
            >
              Nächster Schultag <ChevronRight size={15} />
            </button>
          </div>
        </div>
      ) : (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 print:hidden overflow-hidden">
        <div className="w-full overflow-x-auto no-scrollbar">
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-4 text-left text-[0.625rem] font-bold uppercase tracking-wider text-slate-600 w-10 sticky left-0 bg-slate-50 z-20 border-r border-slate-200">
                  #
                </th>
                <th className="px-4 py-4 text-left text-[0.625rem] font-bold uppercase tracking-wider text-slate-600 w-32 sm:w-48 sticky left-10 bg-slate-50 z-20 border-r border-slate-200">
                  Name
                </th>
                <th className="px-1 py-4 text-center text-[0.625rem] font-bold uppercase tracking-wider text-slate-600 w-16 sm:w-20">
                  Tag
                </th>
                {activeHours.length > 0 && !isFree ? (
                  activeHours.map((hourNum) => {
                    const z = STUNDEN_INFO[hourNum] || "";
                    const fach = app.stammplan[dayName || ""]?.[hourNum] || "";
                    const isCurrent = currentHourHighlight === hourNum;
                    return (
                      <th
                        key={hourNum}
                        className={`px-0.5 py-5 text-center border-l border-slate-100 w-14 sm:w-16 relative transition-all ${isCurrent ? 'bg-indigo-50/50 border-x border-indigo-200' : ''}`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          {isCurrent && (
                            <span className="absolute -top-1 bg-indigo-600 text-[0.375rem] text-white font-black uppercase px-1 rounded-sm leading-none py-0.5 animate-pulse">
                              Jetzt
                            </span>
                          )}
                          <span className={`text-[0.5rem] font-black uppercase tracking-widest leading-none ${isCurrent ? 'text-indigo-600' : 'text-slate-400'}`}>
                            {hourNum}.
                          </span>
                          <span className={`text-[0.4375rem] tabular-nums leading-none ${isCurrent ? 'text-indigo-500 font-extrabold' : 'text-slate-300 font-bold'}`}>
                            {z.split("–")[0]}
                          </span>
                          <span className={`text-[0.4375rem] font-black uppercase text-wrap leading-tight break-words max-w-[40px] leading-none ${isCurrent ? 'text-indigo-600' : 'text-emerald-500'}`}>
                            {fach || "–"}
                          </span>
                        </div>
                      </th>
                    );
                  })
                ) : (
                  <th className="px-8 py-5 text-center text-[0.625rem] text-rose-400 font-black uppercase tracking-widest italic border-l border-slate-100">
                    Kein Unterricht
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {sortedStudents.length === 0 && (
                <tr>
                  <td
                    colSpan={activeHours.length > 0 && !isFree ? activeHours.length + 3 : 4}
                    className="px-6 py-12 text-center text-sm font-bold text-slate-400"
                  >
                    Noch keine Schüler:innen angelegt. Füge zuerst Kinder in der Schülerliste hinzu.
                  </td>
                </tr>
              )}
              {sortedStudents.map((s, i) => {
                const statusData = app.anwesenheit[s.id]?.[selectedDate] || {};
                const details = app.anwesenheitDetail?.[s.id]?.[selectedDate];
                const isAbsent = Object.values(statusData).some(
                  (st) => st === "e" || st === "u",
                );
                const anyUnexcused = Object.values(statusData).some(
                  (st) => st === "u",
                );
                const studentErrors = getValidationErrors().filter(
                  (err) => err.studentId === s.id,
                );
                const isAllPresent = activeHours.length > 0 && activeHours.every(h => statusData[h] === "a");

                let rowBgClass = "hover:bg-slate-50/50";
                let stickyBgClass = "bg-white group-hover:bg-slate-50";

                if (isAbsent) {
                  if (anyUnexcused) {
                    rowBgClass = "bg-rose-50/20 hover:bg-rose-50/40";
                    stickyBgClass = "bg-rose-50/40 group-hover:bg-rose-100/30";
                  } else {
                    rowBgClass = "bg-amber-50/20 hover:bg-amber-50/40";
                    stickyBgClass = "bg-amber-50/40 group-hover:bg-amber-100/30";
                  }
                } else if (isAllPresent) {
                  rowBgClass = "bg-emerald-50/10 hover:bg-emerald-50/25";
                  stickyBgClass = "bg-emerald-50/20 group-hover:bg-emerald-100/20";
                }

                return (
                  <tr
                    key={s.id}
                    className={`border-b border-slate-50 transition-all last:border-0 group ${rowBgClass}`}
                  >
                    <td
                      className={`px-3 py-4 text-[0.6875rem] text-slate-300 font-black tabular-nums sticky left-0 z-10 transition-all ${stickyBgClass}`}
                    >
                      {i + 1}
                    </td>
                    <td
                      className={`px-4 py-4 sticky left-10 z-10 border-r border-slate-100 transition-all ${stickyBgClass}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {/* Student Initial Avatar (Suggestion 5) */}
                          {(() => {
                            const initials = `${s.vorname.charAt(0)}${s.nachname.charAt(0)}`.toUpperCase();
                            const missedDays = Object.values(app.anwesenheit[s.id] || {}).filter(dayData => Object.values(dayData).some(st => st === 'e' || st === 'u')).length;
                            const ringColor = missedDays >= 5 
                              ? 'border-rose-400 ring-rose-400/25' 
                              : missedDays >= 3 
                                ? 'border-amber-400 ring-amber-400/25' 
                                : 'border-emerald-400 ring-emerald-400/25';
                            
                            const colors = [
                              'bg-indigo-50 text-indigo-700',
                              'bg-emerald-50 text-emerald-700',
                              'bg-sky-50 text-sky-700',
                              'bg-amber-50 text-amber-700',
                              'bg-rose-50 text-rose-700',
                              'bg-purple-50 text-purple-700'
                            ];
                            const colorIndex = (s.vorname.charCodeAt(0) + s.nachname.charCodeAt(0)) % colors.length;
                            const colorClass = colors[colorIndex];

                            return (
                              <div className={`w-8 h-8 rounded-full border-2 ${ringColor} ring-4 ${colorClass} flex items-center justify-center text-[0.6875rem] font-extrabold shadow-xs shrink-0`}>
                                {initials}
                              </div>
                            );
                          })()}

                          <div className="flex flex-col gap-0.5">
                            <div className="text-[0.75rem] sm:text-[0.875rem] font-black text-slate-900 tracking-tight text-wrap leading-tight break-words flex items-center gap-1.5">
                              <button onClick={() => setAbsencesModalSid(s.id)} className="hover:text-emerald-600 transition-colors cursor-pointer text-left focus:outline-none">
                                {s.nachname}{" "}
                                <span className="hidden sm:inline text-slate-400 font-medium hover:text-emerald-500">
                                  {s.vorname}
                                </span>
                              </button>
                              {studentErrors.length > 0 && (
                                <span
                                  className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[0.5625rem] font-black inline-flex items-center gap-0.5 animate-pulse cursor-help shrink-0"
                                  title={studentErrors
                                    .map((e) => e.message)
                                    .join("\n")}
                                >
                                  <AlertCircle size={8} /> {studentErrors.length}
                                </span>
                              )}
                            </div>
                            
                            {/* TREND INDICATOR */}
                            {(() => {
                              const missedDays = Object.values(app.anwesenheit[s.id] || {}).filter(dayData => Object.values(dayData).some(st => st === 'e' || st === 'u')).length;
                              return (
                                <button 
                                  onClick={() => setAbsencesModalSid(s.id)}
                                  className="flex items-center gap-1.5 mt-0.5 hover:opacity-75 transition-opacity cursor-pointer text-left" 
                                  title={`${missedDays} Fehltage insgesamt - Klicken für Details`}
                                >
                                  <div className={`w-1.5 h-1.5 rounded-full ${missedDays >= 5 ? 'bg-rose-500 animate-pulse' : missedDays >= 3 ? 'bg-amber-500' : 'bg-emerald-400'}`} />
                                  <span className="text-[0.5625rem] font-bold text-slate-400 uppercase tracking-widest">{missedDays} {missedDays === 1 ? 'Fehltag' : 'Fehltage'}</span>
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {details?.verspaetung ? (
                            <button
                              onClick={() => {
                                setActiveDelaySid(s.id);
                                setCurrentDelay(details.verspaetung || 0);
                              }}
                              className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center hover:bg-indigo-200 transition-colors"
                              title={`${details.verspaetung} Min. Verspätung`}
                            >
                              <Clock3 size={10} />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setActiveDelaySid(s.id);
                                setCurrentDelay(0);
                              }}
                              className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-slate-50 text-slate-300 flex items-center justify-center hover:bg-slate-100 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Clock3 size={10} />
                            </button>
                          )}

                          {details?.notiz ? (
                            <button
                              onClick={() => {
                                setActiveNoteSid(s.id);
                                setCurrentNote(details.notiz || "");
                              }}
                              className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-200 transition-colors"
                              title="Notiz vorhanden"
                            >
                              <MessageSquare size={10} />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setActiveNoteSid(s.id);
                                setCurrentNote("");
                              }}
                              className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-slate-50 text-slate-300 flex items-center justify-center hover:bg-slate-100 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <MessageSquare size={10} />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td
                      className={`px-1 py-4 border-l border-slate-100 whitespace-nowrap transition-all ${rowBgClass}`}
                    >
                      <div className="flex items-center justify-center gap-0.5">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setWholeDay(s.id, "a")}
                          disabled={activeHours.length === 0 || isFree}
                          className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[0.625rem] sm:text-[0.6875rem] font-black rounded-xl border border-emerald-200 transition-all disabled:opacity-20 shadow-sm flex items-center justify-center cursor-pointer"
                          title="Ganzen Tag anwesend"
                        >
                          A
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setWholeDay(s.id, "e");
                            setActiveNoteSid(s.id);
                            setCurrentNote(
                              app.anwesenheitDetail?.[s.id]?.[selectedDate]
                                ?.notiz || "",
                            );
                          }}
                          disabled={activeHours.length === 0 || isFree}
                          className="w-7 h-7 sm:w-8 sm:h-8 bg-amber-50 text-amber-700 hover:bg-amber-100 text-[0.625rem] sm:text-[0.6875rem] font-black rounded-xl border border-amber-200 transition-all disabled:opacity-20 shadow-sm flex items-center justify-center cursor-pointer"
                          title="Ganzen Tag entschuldigt"
                        >
                          E
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setWholeDay(s.id, "u");
                            setActiveNoteSid(s.id);
                            setCurrentNote(
                              app.anwesenheitDetail?.[s.id]?.[selectedDate]
                                ?.notiz || "",
                            );
                          }}
                          disabled={activeHours.length === 0 || isFree}
                          className="w-7 h-7 sm:w-8 sm:h-8 bg-rose-50 text-rose-700 hover:bg-rose-100 text-[0.625rem] sm:text-[0.6875rem] font-black rounded-xl border border-rose-200 transition-all disabled:opacity-20 shadow-sm flex items-center justify-center cursor-pointer"
                          title="Ganzen Tag unentschuldigt"
                        >
                          U
                        </motion.button>
                      </div>
                    </td>
                    {activeHours.length > 0 && !isFree ? (
                      activeHours.map((hourNum) => {
                        const st = statusData[hourNum] || "a";
                        const isCurrent = currentHourHighlight === hourNum;
                        return (
                          <td
                            key={hourNum}
                            className={`px-0.5 py-4 border-l border-slate-100 transition-all ${isCurrent ? 'bg-indigo-50/30 border-x border-indigo-200/40' : rowBgClass}`}
                          >
                            <div className="flex items-center justify-center gap-0.5">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setStatus(s.id, hourNum, "a")}
                                disabled={isFree}
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${st === "a" ? "bg-emerald-100 border border-emerald-300 text-emerald-800 shadow-sm" : "text-slate-400 border border-transparent hover:bg-emerald-50 hover:text-emerald-600"}`}
                                title="Anwesend"
                              >
                                <span className="text-[0.625rem] sm:text-[0.75rem] font-black">
                                  A
                                </span>
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setStatus(s.id, hourNum, "e")}
                                disabled={isFree}
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${st === "e" ? "bg-amber-100 border border-amber-300 text-amber-800 shadow-sm" : "text-slate-400 border border-transparent hover:bg-amber-50 hover:text-amber-600"}`}
                                title="Entschuldigt"
                              >
                                <span className="text-[0.625rem] sm:text-[0.75rem] font-black">
                                  E
                                </span>
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setStatus(s.id, hourNum, "u")}
                                disabled={isFree}
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${st === "u" ? "bg-rose-100 border border-rose-300 text-rose-800 shadow-sm" : "text-slate-400 border border-transparent hover:bg-rose-50 hover:text-rose-600"}`}
                                title="Unentschuldigt"
                              >
                                <span className="text-[0.625rem] sm:text-[0.75rem] font-black">
                                  U
                                </span>
                              </motion.button>
                            </div>
                          </td>
                        );
                      })
                    ) : (
                      <td
                        colSpan={activeHours.length || 1}
                        className={`px-8 py-4 text-center text-slate-500 font-semibold italic border-l border-slate-200 ${isFree ? "bg-rose-50/50 text-rose-600" : ""}`}
                      >
                        {isFree ? "Keine Schule" : "–"}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}
