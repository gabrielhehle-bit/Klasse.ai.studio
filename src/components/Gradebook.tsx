import { removeSubjectColumn, updateSubjectColumn } from '../lib/classroomEdits';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { logActivity, getAccentTextColor } from '../lib/utils';
import { getFachCfg, berechne, getAssessmentMode, getMaxPoints, calculateItemPercent, getNotenLabel, isAssessmentValueMissing, hasCalculatedAverage, parseAssessmentInput } from '../lib/GradeUtils';
import { getFachHexColor } from '../lib/fachColorUtils';
import { FAECHER_ALLE, NOTE_LABELS, STUNDEN_INFO } from '../constants';
import { GradeData } from '../types';
import WeightSettings from './WeightSettings';
import GradeCalculatorModal from './GradeCalculatorModal';
import SchularbeitAssessment from './SchularbeitAssessment';
import { Calculator, Settings, AlertCircle, Plus, Minus, Filter, Sparkles, ChevronDown, User, FileText, BarChart2, Info, ArrowUpRight, Download, RotateCcw, Trash2, Printer, MessageSquare, Brain, TrendingUp, Check } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { NotenverlaufModal } from './NotenverlaufChart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CanvasBarChart } from './charts/CanvasBarChart';
import { DebouncedInput } from './DebouncedInput';
import BehaviorSettings from './gradebook/BehaviorSettings';
import { AssessmentItemModal } from './gradebook/AssessmentItemModal';

const StudentRowWrapper = React.memo(({ s, i, avg, nd, miRaw, isItemSelected, isRowHovered, studentErrors, activeFach, sem, cfg, colCounts, isolatedCol, heatmapMode, mitarbeitSettings, currentSymbol, relativeMiDivisor, studentsCount, assessmentMode, maxPointsMeta, renderRow }: any) => {
  return renderRow();
}, (prev, next) => {
  return prev.s === next.s &&
         prev.i === next.i &&
         prev.avg === next.avg &&
         prev.miRaw === next.miRaw &&
         prev.isItemSelected === next.isItemSelected &&
         prev.isRowHovered === next.isRowHovered &&
         prev.heatmapMode === next.heatmapMode &&
         prev.isolatedCol === next.isolatedCol &&
         prev.activeFach === next.activeFach &&
         prev.sem === next.sem &&
         prev.cfg === next.cfg &&
         prev.colCounts === next.colCounts &&
         prev.assessmentMode === next.assessmentMode &&
         JSON.stringify(prev.maxPointsMeta) === JSON.stringify(next.maxPointsMeta) &&
         prev.mitarbeitSettings === next.mitarbeitSettings &&
         prev.currentSymbol === next.currentSymbol &&
         prev.relativeMiDivisor === next.relativeMiDivisor &&
         prev.studentErrors?.length === next.studentErrors?.length &&
         prev.studentsCount === next.studentsCount &&
         JSON.stringify(prev.nd) === JSON.stringify(next.nd);
});

const getCurrentSubject = (app: any) => {
  const nowObj = new Date();
  
  // Skip weekends (Sunday = 0, Saturday = 6)
  if (nowObj.getDay() === 0 || nowObj.getDay() === 6) {
    return null;
  }
  
  // Get current day name in German
  const daysDe = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  const dayName = daysDe[nowObj.getDay()];
  if (dayName === "Sonntag" || dayName === "Samstag") return null;

  // Get current calendar week (KW)
  const getKWValue = (d: Date) => {
    const target = new Date(d.valueOf());
    const dayNr = (d.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  };
  const kw = getKWValue(nowObj);

  // Get current time in minutes since midnight
  const nowMinutes = nowObj.getHours() * 60 + nowObj.getMinutes();

  // Find which hour block we are currently in
  let currentHourNum: number | null = null;
  for (let hNum = 1; hNum <= 8; hNum++) {
    const timeRange = app.stundenZeiten?.[hNum] || STUNDEN_INFO[hNum];
    if (timeRange) {
      const parts = timeRange.includes('–') ? timeRange.split('–') : timeRange.split('-');
      const startStr = parts[0]?.trim();
      const endStr = parts[1]?.trim();
      if (startStr && endStr) {
        const [sh, sm] = startStr.split(':').map(Number);
        const [eh, em] = endStr.split(':').map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        if (nowMinutes >= startMin && nowMinutes <= endMin) {
          currentHourNum = hNum;
          break;
        }
      }
    }
  }

  if (currentHourNum === null) return null;

  // Now, get the subject for this hour from:
  // 1. wochenplanung (index is hourNum - 1)
  const tagPlan = app?.wochenplanung?.[kw]?.[dayName] || {};
  const wochenplanFach = tagPlan[currentHourNum - 1]?.fach;
  
  if (wochenplanFach) {
    return wochenplanFach;
  }

  // 2. stammplan (index is hourNum)
  const stammPlan = app?.stammplan?.[dayName] || {};
  const stammplanFach = stammPlan[currentHourNum];
  
  if (stammplanFach) {
    return stammplanFach;
  }

  return null;
};

export default function Gradebook() {
  const { app, setApp, setPage } = useApp();
  const [activeFach, setActiveFach] = useState<string>(() => {
    const currentSubject = getCurrentSubject(app);
    const validFaecher = FAECHER_ALLE.filter(f => (!app.faecher || app.faecher.includes(f)));
    
    if (currentSubject && validFaecher.includes(currentSubject)) {
      return currentSubject;
    }
    
    // Fallback: If "Unterricht" has any data, allow it as a tab
    const hasUnterrichtData = Object.values(app.mitarbeit || {}).some((mi: any) => mi["Unterricht"]);
    if (hasUnterrichtData && !validFaecher.includes("Unterricht")) validFaecher.push("Unterricht");

    return validFaecher.length > 0 ? validFaecher[0] : 'Deutsch';
  });

  useEffect(() => {
    const allPossible = [...FAECHER_ALLE];
    const hasUnterrichtData = Object.values(app.mitarbeit || {}).some((mi: any) => mi["Unterricht"]);
    if (hasUnterrichtData) allPossible.push("Unterricht");

    if (!allPossible.includes(activeFach)) {
      const currentSubject = getCurrentSubject(app);
      const validFaecher = FAECHER_ALLE.filter(f => (!app.faecher || app.faecher.includes(f)));
      if (currentSubject && validFaecher.includes(currentSubject)) {
        setActiveFach(currentSubject);
      } else if (validFaecher.length > 0) {
        setActiveFach(validFaecher[0]);
      } else {
        setActiveFach('Deutsch');
      }
    }
  }, [app.faecher, app.mitarbeit, activeFach]);
  const [activeView, setActiveView] = useState<'noten' | 'mitarbeit' | 'hue' | 'verhalten'>(() => {
    const currentSubject = getCurrentSubject(app);
    return currentSubject ? 'mitarbeit' : 'noten';
  });
  const isFachActive = !app.faecher || app.faecher.includes(activeFach) || activeFach === 'Unterricht';
  const availableSubjects = useMemo(() => {
    const subjects = [...FAECHER_ALLE];
    const hasUnterrichtData = Object.values(app.mitarbeit || {}).some((mi: any) => mi["Unterricht"]);
    if (hasUnterrichtData && !subjects.includes('Unterricht')) subjects.push('Unterricht');
    return subjects;
  }, [app.mitarbeit]);

  useEffect(() => {
    if (!isFachActive) {
      setActiveView('simple_noten' as any);
    } else if (activeView === ('simple_noten' as any)) {
      setActiveView('noten');
    }
  }, [activeFach, app.faecher, isFachActive, activeView]);
  const [showIconPicker, setShowIconPicker] = useState<number | null>(null);
  const [behaviorStatTab, setBehaviorStatTab] = useState<'aktuell' | 'chronik'>('aktuell');
  const [behaviorSearchTerm, setBehaviorSearchTerm] = useState('');
  const [viewMetaProtokoll, setViewMetaProtokoll] = useState<import('../types').MetaKognitionsProtokoll | null>(null);
  const [saAssessment, setSaAssessment] = useState<{sid: string, name: string, idx: number} | null>(null);
  const [selectedTrendStudentId, setSelectedTrendStudentId] = useState<string | null>(null);
  const behaviorStages = useMemo(() => {
    return app.behavior_stages || [
      { id: '1', label: 'Super', color: '#10b981', icon: '🌟' },
      { id: '2', label: 'Gut', color: '#3b82f6', icon: '😊' },
      { id: '3', label: 'OK', color: '#94a3b8', icon: '😐' },
      { id: '4', label: 'Ermahnung', color: '#f59e0b', icon: '⚠️' },
      { id: '5', label: 'Inakzeptabel', color: '#ef4444', icon: '🚫' }
    ];
  }, [app.behavior_stages]);
  const commonIcons = ['🌟', '😊', '😐', '⚠️', '🚫', '🔥', '❤️', '👍', '👎', '👏', '🙌', '🤝', '💎', '🏆', '👑', '✨', '🚀', '⭐', '🎈', '🎉', '📝', '💬', '📖', '💡', '🍎', '🎒', '🎨', '🧩', '⚽', '💻', '🦁', '🐘', '🦎', '🦉', '🐝'];
  const [sem, setSem] = useState<'1' | '2'>('1');
  const [showWeights, setShowWeights] = useState(false);
  const [showGradeCalculator, setShowGradeCalculator] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showClassAverage, setShowClassAverage] = useState(true);
  const [includeSpecialNeedsInStats, setIncludeSpecialNeedsInStats] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'avg' | 'triage'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterMissing, setFilterMissing] = useState(false);
  const [showHueSettings, setShowHueSettings] = useState(false);
  const [isolatedCol, setIsolatedCol] = useState<{typ: 'sa'|'lzk'|'wp'|'obj', idx: number} | null>(null);
  const [editingAssessmentModal, setEditingAssessmentModal] = useState<{
    typ: 'sa' | 'lzk' | 'wp' | 'obj';
    idx: number;
    isNew?: boolean;
  } | null>(null);
  const [editingColLabel, setEditingColLabel] = useState<{typ: 'sa'|'lzk'|'wp'|'obj', idx: number} | null>(null);
  const [tempColLabel, setTempColLabel] = useState('');
  const [tempColDate, setTempColDate] = useState('');
  const [tempMaxPoints, setTempMaxPoints] = useState<number>(20);
  const [simulateModalForSid, setSimulateModalForSid] = useState<string | null>(null);
  const [focusedCell, setFocusedCell] = useState<{sid: string, typ: string, idx: number} | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{sid: string, typ: string, idx: number} | null>(null);
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [confirmedWarnings, setConfirmedWarnings] = useState<Record<string, boolean>>({});
  const [simpleDashboardMode, setSimpleDashboardMode] = useState<boolean>(true);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);
  const [showAddAssessmentModal, setShowAddAssessmentModal] = useState<boolean>(false);
  const [selectedGradeExplanationStudent, setSelectedGradeExplanationStudent] = useState<any | null>(null);

  const [zoomLevel, setZoomLevel] = useState<'compact' | 'standard' | 'large'>(() => {
    return app?.settings?.zoomLevel || 'standard';
  });

  useEffect(() => {
    if (app?.settings?.zoomLevel) {
      setZoomLevel(app.settings.zoomLevel);
    }
  }, [app?.settings?.zoomLevel]);

  const changeZoomLevel = (level: 'compact' | 'standard' | 'large') => {
    setZoomLevel(level);
    setApp(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        zoomLevel: level
      }
    }));
  };

  const dStyle = useMemo(() => {
    switch (zoomLevel) {
      case 'compact':
        return {
          // Table Cells / Paddings
          th: "px-2 py-2 text-[0.55rem]",
          tdNum: "px-2.5 py-1.5 text-[0.6rem] w-[3rem]",
          tdName: "px-3.5 py-1.5 left-[3rem] w-[14rem]",
          tdAvg: "px-0.5 py-1 text-[0.75rem]",
          tdCell: "px-0.5 py-1",
          
          // Typography
          nameText: "text-[0.8125rem]",
          firstNameText: "text-[0.6875rem]",
          spfBadge: "text-[0.5rem] px-1 py-0",
          
          // Buttons & Actions
          actionBtn: "p-1 rounded-md",
          actionIcon: 11,
          btnPlusMinus: "w-8 h-8 rounded-md text-[0.75rem]",
          
          // Form Elements / Inputs
          gradeInput: "w-full max-w-[3rem] min-w-[2.25rem] py-0.5 text-[0.75rem] rounded-md",
          simpleSelect: "px-2 py-1.5 text-[0.6875rem] max-w-[110px]",
          simpleInput: "px-3 py-1.5 text-[0.6875rem] rounded-lg",
          
          // Mitarbeit View Specific
          miCardWidth: "w-[240px] h-12 gap-2 px-3",
          miInput: "w-[30px] text-[1.125rem]",
          miNoteBadge: "px-1.5 py-0.5 text-[0.5625rem]",
          miEmoji: "text-[1rem]",
          miRowCell: "px-4 py-2 text-[0.625rem]",
          miManualBtn: "w-8 h-8 rounded-md text-[0.75rem]",
          
          // HÜ View Specific
          hueCounter: "w-12 h-9 rounded-lg text-[1rem]",
          
          // Verhalten View Specific
          behCell: "px-3 py-2 text-[0.6875rem]",
          behSpark: "w-4.5 h-4.5 text-[0.5rem] rounded-md"
        };
      case 'large':
        return {
          // Table Cells / Paddings
          th: "px-6 py-5 text-[0.75rem]",
          tdNum: "px-5 py-4.5 text-[0.85rem] w-[5rem]",
          tdName: "px-6 py-4.5 left-[5rem] w-[22rem]",
          tdAvg: "px-2 py-2 text-[0.9375rem]",
          tdCell: "px-2 py-2.5",
          
          // Typography
          nameText: "text-[1.125rem]",
          firstNameText: "text-[0.875rem]",
          spfBadge: "text-[0.75rem] px-2.5 py-1",
          
          // Buttons & Actions
          actionBtn: "p-2 rounded-xl",
          actionIcon: 15,
          btnPlusMinus: "w-11 h-11 rounded-xl text-[1rem]",
          
          // Form Elements / Inputs
          gradeInput: "w-full max-w-[4.5rem] min-w-[3.5rem] py-2 text-[0.9375rem] rounded-xl",
          simpleSelect: "px-4 py-2.5 text-[0.875rem] max-w-[150px]",
          simpleInput: "px-5 py-2.5 text-[0.875rem] rounded-xl",
          
          // Mitarbeit View Specific
          miCardWidth: "w-[400px] h-20 gap-6 px-7",
          miInput: "w-[50px] text-[1.875rem]",
          miNoteBadge: "px-3 py-1 text-[0.75rem]",
          miEmoji: "text-[1.5rem]",
          miRowCell: "px-8 py-6 text-[0.875rem]",
          miManualBtn: "w-11 h-11 rounded-xl text-[1rem]",
          
          // HÜ View Specific
          hueCounter: "w-20 h-16 rounded-2xl text-[1.5rem]",
          
          // Verhalten View Specific
          behCell: "px-6 py-5 text-[0.875rem]",
          behSpark: "w-7 h-7 text-[0.75rem] rounded-lg"
        };
      case 'standard':
      default:
        return {
          // Table Cells / Paddings
          th: "px-4 py-3.5 text-[0.6rem]",
          tdNum: "px-4 py-3 text-[0.7rem] w-[4rem]",
          tdName: "px-5 py-3 left-[4rem] w-[18rem]",
          tdAvg: "px-1 py-1.5 text-[0.8125rem]",
          tdCell: "px-1 py-1.5",
          
          // Typography
          nameText: "text-[1rem]",
          firstNameText: "text-[0.75rem]",
          spfBadge: "text-[0.625rem] px-2 py-0.5",
          
          // Buttons & Actions
          actionBtn: "p-1.5 rounded-lg",
          actionIcon: 13,
          btnPlusMinus: "w-9 h-9 rounded-lg text-[0.8125rem]",
          
          // Form Elements / Inputs
          gradeInput: "w-full max-w-[4rem] min-w-[2.75rem] py-1 text-[0.8125rem] rounded-lg",
          simpleSelect: "px-3 py-2 text-[0.75rem] max-w-[130px]",
          simpleInput: "px-4 py-2 text-[0.75rem] rounded-xl",
          
          // Mitarbeit View Specific
          miCardWidth: "w-[320px] h-16 gap-4 px-5",
          miInput: "w-[40px] text-[1.5rem]",
          miNoteBadge: "px-2 py-0.5 text-[0.625rem]",
          miEmoji: "text-[1.25rem]",
          miRowCell: "px-6 py-4.5 text-[0.6875rem]",
          miManualBtn: "w-9 h-9 rounded-lg text-[0.875rem]",
          
          // HÜ View Specific
          hueCounter: "w-16 h-12 rounded-xl text-[1.25rem]",
          
          // Verhalten View Specific
          behCell: "px-4 py-4 text-[0.75rem]",
          behSpark: "w-5.5 h-5.5 text-[0.625rem] rounded-lg"
        };
    }
  }, [zoomLevel]);

  interface GradeValidationError {
    id: string;
    studentId: string;
    studentName: string;
    type: 'typo' | 'invalid' | 'incomplete';
    message: string;
    fixOptions: {
      label: string;
      action: () => void;
    }[];
  }

  const getLinkedMetaProtokoll = (studentId: string, typ: string, idx: number) => {
    if (!app.metaKognitionsProtokolle || app.metaKognitionsProtokolle.length === 0) return null;
    const customLabel = app.notenMeta?.[activeFach]?.colLabels?.[typ]?.[idx];
    if (!customLabel) return null; // We need some label to match against
    
    // Fuzzy matching: customLabel "Ansage 3" against pruefungsName "Mathe-Schularbeit 3"
    const searchStr = customLabel.toLowerCase().trim();
    if (!searchStr) return null;

    return app.metaKognitionsProtokolle.find(p => {
      if (!p || p.schuelerId !== studentId || p.fach !== activeFach) return false;
      const pName = p.pruefungsName || '';
      const pNameLower = pName.toLowerCase();
      const dateStr = p.pruefungsDatum ? new Date(p.pruefungsDatum).toLocaleDateString('de-DE').slice(0, -4).slice(0, -1) : '';
      return (
        pNameLower.includes(searchStr) || 
        searchStr.includes(pNameLower) ||
        (dateStr !== '' && searchStr.includes(dateStr))
      );
    });
  };

  const getGradeValidationErrors = (): GradeValidationError[] => {
    const list: GradeValidationError[] = [];
    const studentList = app.schueler || [];
    if (studentList.length === 0) return list;
    const mode = getAssessmentMode(app, activeFach);

    studentList.forEach(s => {
      const nd = app.noten?.[s.id]?.[activeFach]?.[sem] || { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] };
      const avg = berechne(app, s.id, activeFach, sem);
      
      const checkSuspiciousGrade = (grades: (number | string | null)[], typeLabel: string, typ: 'sa' | 'lzk' | 'wp' | 'aufgaben') => {
        if (!Array.isArray(grades)) return;
        grades.forEach((g, idx) => {
          if (mode === 'grades') {
            if (g === 5 && avg && avg <= 2.2) {
              list.push({
                id: `${s.id}-${typ}-${idx}-suspicious`,
                studentId: s.id,
                studentName: `${s.vorname} ${s.nachname}`,
                type: 'typo',
                message: `Möglicher Tippfehler bei ${s.vorname}: Note 5 in ${typeLabel} #${idx + 1} weicht extrem vom Gesamt-Durchschnitt (${avg.toFixed(2)}) ab.`,
                fixOptions: [
                  {
                    label: 'Auf Note 2 ändern',
                    action: () => {
                      setNote(s.id, typ, idx, '2');
                    }
                  },
                  {
                    label: 'Als korrekt bestätigen',
                    action: () => {
                      setConfirmedWarnings(prev => ({ ...prev, [`${s.id}-${typ}-${idx}-suspicious`]: true }));
                    }
                  }
                ]
              });
            }
            
            if (typeof g === 'number' && (g < 1 || g > 5)) {
              list.push({
                id: `${s.id}-${typ}-${idx}-invalid`,
                studentId: s.id,
                studentName: `${s.vorname} ${s.nachname}`,
                type: 'invalid',
                message: `Ungültige Note (${g}) bei ${s.vorname} in ${typeLabel} #${idx + 1}. Erlaubt ist nur 1 bis 5.`,
                fixOptions: [
                  {
                    label: 'Korrigieren auf 5',
                    action: () => setNote(s.id, typ, idx, '5')
                  },
                  {
                    label: 'Korrigieren auf 1',
                    action: () => setNote(s.id, typ, idx, '1')
                  },
                  {
                    label: 'Eintrag löschen',
                    action: () => setNote(s.id, typ, idx, '')
                  }
                ]
              });
            }
          } else if (mode === 'percent') {
            if (typeof g === 'number' && (g < 0 || g > 100)) {
              list.push({
                id: `${s.id}-${typ}-${idx}-invalid`,
                studentId: s.id,
                studentName: `${s.vorname} ${s.nachname}`,
                type: 'invalid',
                message: `Ungültiger Prozentwert (${g}%) bei ${s.vorname} in ${typeLabel} #${idx + 1}. Erlaubt ist 0 bis 100%.`,
                fixOptions: [
                  {
                    label: 'Auf 100% begrenzen',
                    action: () => setNote(s.id, typ, idx, '100')
                  },
                  {
                    label: 'Eintrag löschen',
                    action: () => setNote(s.id, typ, idx, '')
                  }
                ]
              });
            }
          } else if (mode === 'points') {
            const maxP = getMaxPoints(app, activeFach, typ, idx);
            if (typeof g === 'number' && (g < 0 || g > maxP)) {
              list.push({
                id: `${s.id}-${typ}-${idx}-invalid`,
                studentId: s.id,
                studentName: `${s.vorname} ${s.nachname}`,
                type: 'invalid',
                message: `Ungültige Punktzahl (${g} / ${maxP}) bei ${s.vorname} in ${typeLabel} #${idx + 1}.`,
                fixOptions: [
                  {
                    label: `Auf ${maxP} Pkt setzen`,
                    action: () => setNote(s.id, typ, idx, `${maxP}`)
                  },
                  {
                    label: 'Eintrag löschen',
                    action: () => setNote(s.id, typ, idx, '')
                  }
                ]
              });
            }
          }
        });
      };

      checkSuspiciousGrade(nd.sa || [], 'Schularbeit', 'sa');
      checkSuspiciousGrade(nd.lzk || [], 'Lernzielkontrolle', 'lzk');
      checkSuspiciousGrade(nd.wp || [], 'Wochenplan', 'wp');
      checkSuspiciousGrade(nd.aufgaben || [], 'Hausübung', 'aufgaben');

      if (mitarbeitSettings.mode === 'manual' && nd.miDirekt !== undefined) {
        if (nd.miDirekt < 1 || nd.miDirekt > 5) {
          list.push({
            id: `${s.id}-mi-invalid`,
            studentId: s.id,
            studentName: `${s.vorname} ${s.nachname}`,
            type: 'invalid',
            message: `Ungültige Mitarbeit-Direktnote (${nd.miDirekt}) bei ${s.vorname}. Erlaubt ist nur 1 bis 5.`,
            fixOptions: [
              {
                label: 'Note auf 1 setzen',
                action: () => setMIDirekt(s.id, '1')
              },
              {
                label: 'Note auf 5 setzen',
                action: () => setMIDirekt(s.id, '5')
              },
              {
                label: 'Löschen',
                action: () => setMIDirekt(s.id, '')
              }
            ]
          });
        }
      }
    });

    return list.filter(w => !confirmedWarnings[w.id]);
  };

  const [visibleLimit, setVisibleLimit] = useState(15);
  const sentinelRef = useRef<HTMLTableRowElement | null>(null);

  const focusQuickEntry = (kind: 'mitarbeit' | 'hue', currentIndex: number, direction: 1 | -1) => {
    const targetIndex = currentIndex + direction;
    const target = document.querySelector<HTMLElement>(
      `[data-quick-entry="${kind}"][data-student-index="${targetIndex}"]`
    );
    target?.focus();
  };

  const handleQuickEntryKey = (
    event: React.KeyboardEvent<HTMLElement>,
    kind: 'mitarbeit' | 'hue',
    currentIndex: number
  ) => {
    const backward = event.key === 'ArrowUp' || (event.key === 'Enter' && event.shiftKey);
    const forward = event.key === 'ArrowDown' || (event.key === 'Enter' && !event.shiftKey);
    if (!backward && !forward) return;
    event.preventDefault();
    focusQuickEntry(kind, currentIndex, backward ? -1 : 1);
  };

  useEffect(() => {
    setVisibleLimit(20);
  }, [activeFach, activeView, sortBy, sortOrder]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleLimit(prev => prev + 15);
      }
    }, { rootMargin: '120px' });
    observer.observe(el);
    return () => {
      observer.unobserve(el);
    };
  }, [app?.schueler?.length, visibleLimit]);

  const getShortName = (name: string | undefined, defaultShort: string) => {
    if (!name) return defaultShort;
    const lower = name.toLowerCase();
    if (lower.includes('schularbeit') || lower.includes('schul-arbeit')) return 'SA';
    if (lower.includes('wochenplan')) return 'WOPL';
    if (lower.includes('lernzielkontrolle')) return 'LZK';
    if (lower.includes('mitarbeit')) return 'MI';
    if (lower.includes('hausübung') || lower.includes('hausaufgabe')) return 'HÜ';
    if (name.length > 4) return name.substring(0, 3).toUpperCase() + '.';
    return name.toUpperCase();
  };

  const mitarbeitSettings = app.mitarbeit_settings || {
    symbol: 'plus',
    thresholds: { 1: 13, 2: 10, 3: 7, 4: 4, 5: 0 }
  };

  const symbols = {
    plus: { icon: '➕', label: 'Pluspunkte', color: 'text-orange-600', bg: 'bg-orange-100' },
    star: { icon: '⭐', label: 'Sterne', color: 'text-yellow-600', bg: 'bg-yellow-100' },
    marble: { icon: '🔮', label: 'Murmeln', color: 'text-purple-600', bg: 'bg-purple-100' },
    diamond: { icon: '💎', label: 'Diamanten', color: 'text-blue-600', bg: 'bg-blue-100' },
    trophy: { icon: '🏆', label: 'Pokale', color: 'text-amber-600', bg: 'bg-amber-100' },
    custom: { 
      icon: mitarbeitSettings.custom_icon || '✏️', 
      label: 'Eigene Wahl', 
      color: 'text-amber-800', 
      bg: 'bg-amber-50' 
    }
  };

  const getTrendIcon = (nd: GradeData) => {
    const allGrades = [...(nd.sa || []), ...(nd.lzk || [])].filter((v): v is number => typeof v === 'number');
    if (allGrades.length < 2) return null;
    const half = Math.floor(allGrades.length / 2);
    const avg1 = allGrades.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const avg2 = allGrades.slice(half).reduce((a, b) => a + b, 0) / (allGrades.length - half);
    if (avg2 < avg1 - 0.2) return <span title="Tendenz aufsteigend (besser werdend)" className="text-emerald-500 font-bold ml-1">📈</span>;
    if (avg2 > avg1 + 0.2) return <span title="Tendenz abfallend (schlechter werdend)" className="text-rose-500 font-bold ml-1">📉</span>;
    return <span title="Tendenz gleichbleibend" className="text-slate-400 font-bold ml-1 opacity-50">→</span>;
  };

  const currentSymbol = symbols[mitarbeitSettings.symbol as keyof typeof symbols] || symbols.plus;

  const calculateMitarbeitNote = (points: number) => {
    const s = mitarbeitSettings;
    const students = app.schueler || [];
    
    if (s.mode === 'relative' && s.relative_confirmed && app.mitarbeit) {
      const activeValues = students.map(st => app.mitarbeit?.[st.id]?.[activeFach]?.[sem] || 0);
      const valuesWithPoints = activeValues.filter(v => v > 0);
      
      // Calculate class average from students who actually have points
      // This prevents the average from being dragged down to 1-2 points by inactive students
      const sum = activeValues.reduce((a, b) => a + b, 0);
      const avg = valuesWithPoints.length > 0 ? sum / valuesWithPoints.length : 0;
      
      const rel = s.relative_thresholds || { 1: 20, 2: 10, 3: 0, 4: -10 };
      
      if (points === 0) return 5; // No participation at all
      if (avg === 0) return 3;    // Class average is 0, points > 0 gets baseline

      // Relative to class average
      if (points >= avg * (1 + (rel[1] || 20)/100)) return 1;
      if (points >= avg * (1 + (rel[2] || 10)/100)) return 2;
      if (points >= avg * (1 + (rel[3] || 0)/100)) return 3;
      if (points >= avg * (1 + (rel[4] || -10)/100)) return 4;
      return 5;
    }

    const t = s.thresholds || { 1: 13, 2: 10, 3: 7, 4: 4, 5: 0 };
    if (points >= (t[1] || 13)) return 1;
    if (points >= (t[2] || 10)) return 2;
    if (points >= (t[3] || 7)) return 3;
    if (points >= (t[4] || 4)) return 4;
    return 5;
  };

  const colCounts = app.notenMeta?.[activeFach]?.colCounts || { lzk: 4, wp: 4, obj: 4 };
  const [pendingDelete, setPendingDelete] = useState<{typ: 'lzk' | 'wp' | 'obj', label: string} | null>(null);

  const missingCount = useMemo(() => {
    let count = 0;
    if (!app.schueler || app.schueler.length === 0) return 0;
    const cfg = getFachCfg(app, activeFach);

    app.schueler.forEach(s => {
      const nd = app.noten?.[s.id]?.[activeFach]?.[sem];
      if (!nd) {
        count++;
        return;
      }
      const hasMissing = (arr: any[], limit: number) => {
        for (let i = 0; i < limit; i++) {
          if (arr[i] === undefined || arr[i] === null || arr[i] === '' || arr[i] === 'e' || arr[i] === 'f' || arr[i] === '-') return true;
        }
        return false;
      };
      const manualMitarbeitMissing =
        cfg.mi &&
        mitarbeitSettings.mode === 'manual' &&
        (nd.miDirekt === undefined || nd.miDirekt === null || (nd.miDirekt as any) === '');
      const isMissing = (cfg.sa && hasMissing(nd.sa || [], cfg.saCount)) ||
                        (cfg.lzk && hasMissing(nd.lzk || [], colCounts.lzk)) ||
                        (cfg.wp && hasMissing(nd.wp || [], colCounts.wp)) ||
                        (cfg.obj && hasMissing(nd.aufgaben || [], colCounts.obj)) ||
                        manualMitarbeitMissing;
      if (isMissing) {
        count++;
      }
    });

    return count;
  }, [app, activeFach, sem, colCounts, mitarbeitSettings.mode]);

  const hasAnyAssessment = useMemo(() => {
    return (app.schueler || []).some((student) => {
      const data = app.noten?.[student.id]?.[activeFach]?.[sem];
      if (!data) return false;
      return ["sa", "lzk", "wp", "aufgaben"].some((key) =>
        (data[key] || []).some((value: unknown) =>
          value !== undefined && value !== null && value !== "" && value !== "-" && value !== "e" && value !== "f",
        ),
      );
    });
  }, [app.schueler, app.noten, activeFach, sem]);

  const getHighlightClass = (sid: string, typ: string, idx: number) => {
    if (!hoveredCell) return '';
    const isSameRow = hoveredCell.sid === sid;
    const isSameCol = hoveredCell.typ === typ && hoveredCell.idx === idx;
    if (isSameRow && isSameCol) {
      return 'bg-indigo-100/60 shadow-inner transition-colors duration-100 border-indigo-200/50';
    } else if (isSameCol) {
      return 'bg-indigo-50/45 transition-colors duration-100 border-indigo-150/40';
    } else if (isSameRow) {
      return 'bg-slate-100/35 transition-colors duration-100';
    }
    return '';
  };

  const changeMI = (sid: string, delta: number) => {
    setApp(prev => {
      const studentMI = prev.mitarbeit[sid] || {};
      const fachMI = studentMI[activeFach] || {};
      const current = fachMI[sem] || 0;
      const nextVal = Math.max(0, current + delta);
      return {
        ...prev,
        mitarbeit: {
          ...prev.mitarbeit,
          [sid]: {
            ...studentMI,
            [activeFach]: {
              ...fachMI,
              [sem]: nextVal
            }
          }
        }
      };
    });

    if (delta > 0) {
      try {
        const student = app.schueler.find(s => s.id === sid);
        const nameText = student ? student.vorname : 'Ein Schüler';
        window.dispatchEvent(new CustomEvent('classpet-joy', {
          detail: { 
            message: `Klasse! ${nameText} hat ein Plus für Mitarbeit bekommen! ➕✨` 
          }
        }));
      } catch (e) {}
    }
  };

  const setMIVal = (sid: string, value: number) => {
    setApp(prev => {
      const studentMI = prev.mitarbeit[sid] || {};
      const fachMI = studentMI[activeFach] || {};
      const nextVal = Math.max(0, value);
      return {
        ...prev,
        mitarbeit: {
          ...prev.mitarbeit,
          [sid]: {
            ...studentMI,
            [activeFach]: {
              ...fachMI,
              [sem]: nextVal
            }
          }
        }
      };
    });
  };

  const addColumn = (e: React.MouseEvent, typ: 'lzk' | 'wp' | 'obj') => {
    e.stopPropagation();
    const currentCount = colCounts[typ] || 0;
    const dataKey: 'lzk' | 'wp' | 'aufgaben' = typ === 'obj' ? 'aufgaben' : typ;

    // Reuse the first genuinely empty visible slot before creating another column.
    let reusableIndex = -1;
    for (let idx = 0; idx < currentCount; idx++) {
      const hasStudentValue = (app.schueler || []).some((student) => {
        const values = app.noten?.[student.id]?.[activeFach]?.[sem]?.[dataKey] || [];
        const value = values[idx];
        return value !== undefined && value !== null && value !== '';
      });
      const hasMeta =
        !!app.notenMeta?.[activeFach]?.colLabels?.[typ]?.[idx] ||
        !!app.notenMeta?.[activeFach]?.colDates?.[typ]?.[idx] ||
        app.notenMeta?.[activeFach]?.maxPoints?.[typ]?.[idx] !== undefined;

      if (!hasStudentValue && !hasMeta) {
        reusableIndex = idx;
        break;
      }
    }

    const idx = reusableIndex >= 0 ? reusableIndex : currentCount;
    setEditingAssessmentModal({ typ, idx, isNew: reusableIndex < 0 });
  };

  const removeColumn = (e: React.MouseEvent, typ: 'lzk' | 'wp' | 'obj') => {
    e.stopPropagation();
    const label = typ === 'lzk' ? getNotenLabel(app, activeFach, 'lzk', 'Lernzielkontrolle') : typ === 'wp' ? getNotenLabel(app, activeFach, 'wp', 'Wochenplan') : getNotenLabel(app, activeFach, 'obj', 'Objekt');
    setPendingDelete({ typ, label });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const { typ } = pendingDelete;

    setApp(prev => {
      const currentCount = prev.notenMeta?.[activeFach]?.colCounts?.[typ] ?? 4;
      if (currentCount <= 0) return prev;

      const result = removeSubjectColumn(
        prev.noten || {},
        prev.notenMeta || {},
        activeFach,
        typ,
        currentCount - 1,
      );

      return {
        ...prev,
        noten: result.noten,
        notenMeta: result.notenMeta,
      };
    });
    setPendingDelete(null);
  };

  const cfg = getFachCfg(app, activeFach);
  const assessmentMode = getAssessmentMode(app, activeFach);

  const handleModeChange = (fach: string, newMode: 'grades' | 'percent' | 'points') => {
    const currentMode = app.notenMeta?.[fach]?.assessmentMode || 'grades';
    if (currentMode === newMode) return;

    let hasEntries = false;
    const studentList = app.schueler || [];
    for (const s of studentList) {
      const sem1 = app.noten?.[s.id]?.[fach]?.['1'];
      const sem2 = app.noten?.[s.id]?.[fach]?.['2'];
      const checkSem = (d: any) => {
        if (!d) return false;
        return (d.sa?.some((v: any) => v !== null && v !== undefined && v !== '')) ||
               (d.lzk?.some((v: any) => v !== null && v !== undefined && v !== '')) ||
               (d.wp?.some((v: any) => v !== null && v !== undefined && v !== '')) ||
               (d.aufgaben?.some((v: any) => v !== null && v !== undefined && v !== ''));
      };
      if (checkSem(sem1) || checkSem(sem2)) {
        hasEntries = true;
        break;
      }
    }

    if (hasEntries) {
      const modeNames = { grades: 'Noten (1–5)', percent: 'Prozent (0–100%)', points: 'Punkte (Pkt/Max)' };
      const confirmMsg = `Hinweis: Im Fach "${fach}" sind bereits Leistungsdaten erfasst.\n\nEin Wechsel der Bewertungsart verändert die Interpretation und Anzeige der Werte (${modeNames[newMode]}).\n\nMöchtest du die Bewertungsart für "${fach}" wirklich umstellen?`;
      if (!window.confirm(confirmMsg)) {
        return;
      }
    }

    setApp(prev => {
      const nm = { ...(prev.notenMeta || {}) };
      const currentFach = { ...(nm[fach] || {}) };
      return {
        ...prev,
        notenMeta: {
          ...nm,
          [fach]: {
            ...currentFach,
            assessmentMode: newMode
          }
        }
      };
    });
  };

  const students = useMemo(() => {
    let list = [...(app.schueler || [])].map(s => {
      let avg = null;
      try {
        avg = berechne(app, s.id, activeFach, sem);
      } catch (e) {
        console.error("Error calculating avg for s:", s.id, e);
      }
      return {
        ...s,
        currentAvg: hasCalculatedAverage(avg) ? avg : 99 // Placeholder for sorting
      };
    });

    // "Unvollständig" is a grade-entry aid only. It must never hide children in
    // the fast Mitarbeit/Hausübung views.
    if (filterMissing && activeView === 'noten') {
      list = list.filter(s => {
        const nd = app?.noten?.[s.id]?.[activeFach]?.[sem];
        if (!nd) return true; // entirely missing
        // check if any of the required columns is empty or 'e' or 'f'
        const hasMissing = (arr: any[], count: number) => {
          for (let i = 0; i < count; i++) {
            if (arr[i] === undefined || arr[i] === null || arr[i] === '' || arr[i] === 'e' || arr[i] === 'f' || arr[i] === '-') return true;
          }
          return false;
        };
        if (cfg.sa && hasMissing(nd.sa || [], cfg.saCount)) return true;
        if (cfg.lzk && hasMissing(nd.lzk || [], colCounts.lzk)) return true;
        if (cfg.wp && hasMissing(nd.wp || [], colCounts.wp)) return true;
        if (cfg.obj && hasMissing(nd.aufgaben || [], colCounts.obj)) return true;
        if (
          cfg.mi &&
          mitarbeitSettings.mode === 'manual' &&
          (nd.miDirekt === undefined || nd.miDirekt === null || (nd.miDirekt as any) === '')
        ) return true;
        return false;
      });
    }
    
    return list.sort((a, b) => {
      if (sortBy === 'name') {
        const res = (a.nachname || '').localeCompare(b.nachname || '', 'de');
        return sortOrder === 'asc' ? res : -res;
      } else if (sortBy === 'avg') {
        const res = a.currentAvg - b.currentAvg;
        return sortOrder === 'asc' ? res : -res;
      } else if (sortBy === 'triage') {
        // Triage priorities:
        // 1. Avg > 4.0 (in grade mode) or Avg < 60% (in percent/points mode)
        // 2. Wackelkandidaten (e.g. ,45 to ,55)
        // 3. Normal
        const getTriageScore = (avg: number) => {
           if (avg === 99) return 0; // missing
           if (assessmentMode === 'grades') {
             if (avg > 4.0) return 3;
             const decimal = avg - Math.floor(avg);
             if (decimal >= 0.45 && decimal <= 0.55) return 2;
             if (avg > 3.0) return 1;
           } else {
             if (avg < 50) return 3;
             if (avg < 65) return 2;
             if (avg < 75) return 1;
           }
           return 0;
        };
        const scoreA = getTriageScore(a.currentAvg);
        const scoreB = getTriageScore(b.currentAvg);
        if (scoreA !== scoreB) {
            return sortOrder === 'asc' ? scoreB - scoreA : scoreA - scoreB; // default asc: highest triage score first
        }
        return (a.nachname || '').localeCompare(b.nachname || '', 'de');
      }
      return 0;
    });
  }, [app.schueler, app.noten, activeFach, sem, sortBy, sortOrder, filterMissing, cfg, colCounts, assessmentMode, activeView, mitarbeitSettings.mode]);

  const columnAverages = useMemo(() => {
    const results: Record<string, { avg: number | null }> = {};
    const studentsToConsider = includeSpecialNeedsInStats 
      ? (app.schueler || [])
      : (app.schueler || []).filter(s => !s.spf && !s.espf);
    
    const calcAvg = (typ: 'sa' | 'lzk' | 'wp' | 'aufgaben', idx: number) => {
      const rawVals = studentsToConsider
        .map(s => app.noten?.[s.id]?.[activeFach]?.[sem]?.[typ]?.[idx]);
      
      const numericVals: number[] = [];
      rawVals.forEach(v => {
        if (typeof v === 'number') {
          numericVals.push(v);
        } else if (typeof v === 'string') {
          const parsed = parseFloat(v.replace(',', '.'));
          if (!isNaN(parsed)) numericVals.push(parsed);
        }
      });
      
      return {
        avg: numericVals.length > 0 ? numericVals.reduce((a, b) => a + b, 0) / numericVals.length : null
      };
    };

    if (cfg.sa) {
      for (let i = 0; i < cfg.saCount; i++) results[`sa-${i}`] = calcAvg('sa', i);
    }
    if (cfg.lzk) {
      for (let i = 0; i < colCounts.lzk; i++) results[`lzk-${i}`] = calcAvg('lzk', i);
    }
    if (cfg.wp) {
      for (let i = 0; i < colCounts.wp; i++) results[`wp-${i}`] = calcAvg('wp', i);
    }
    if (cfg.obj) {
      for (let i = 0; i < colCounts.obj; i++) results[`obj-${i}`] = calcAvg('aufgaben', i);
    }

    return results;
  }, [app, activeFach, sem, colCounts, cfg, includeSpecialNeedsInStats]);

  const stats = useMemo(() => {
    const allStudents = (app.schueler || []);
    const filteredForStats = includeSpecialNeedsInStats 
      ? allStudents 
      : allStudents.filter(s => !s.spf && !s.espf);
    
    const allAverages = filteredForStats
      .map(s => berechne(app, s.id, activeFach, sem))
      .filter((a): a is number => a !== null);
      
    if (allAverages.length === 0) return null;
    
    const sum = allAverages.reduce((acc, val) => acc + val, 0);
    const avg = sum / allAverages.length;
    
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (assessmentMode === 'grades') {
      allAverages.forEach(a => {
        const rounded = Math.round(a) as 1 | 2 | 3 | 4 | 5;
        if (distribution[rounded] !== undefined) distribution[rounded]++;
      });
    } else {
      allAverages.forEach(pct => {
        if (pct >= 87.5) distribution[1]++;
        else if (pct >= 75) distribution[2]++;
        else if (pct >= 62.5) distribution[3]++;
        else if (pct >= 50) distribution[4]++;
        else distribution[5]++;
      });
    }
    
    return { avg, distribution, total: allAverages.length, totalStudents: filteredForStats.length, maxStudents: allStudents.length };
  }, [app, activeFach, sem, includeSpecialNeedsInStats, assessmentMode]);

  const gradebookDataStatus = useMemo(() => {
    let assessmentEntries = 0;
    let studentsWithEntries = 0;

    (app.schueler || []).forEach(student => {
      const data: any = app.noten?.[student.id]?.[activeFach]?.[sem];
      if (!data) return;
      const values = [
        ...(data.sa || []),
        ...(data.lzk || []),
        ...(data.wp || []),
        ...(data.aufgaben || [])
      ].filter(value => value !== null && value !== undefined && value !== '' && value !== 'f');
      const hasParticipation = data.miDirekt !== undefined && data.miDirekt !== null && data.miDirekt !== '';
      assessmentEntries += values.length + (hasParticipation ? 1 : 0);
      if (values.length > 0 || hasParticipation) studentsWithEntries += 1;
    });

    return {
      assessmentEntries,
      studentsWithEntries,
      totalStudents: (app.schueler || []).length,
      calculatedStudents: stats?.total || 0
    };
  }, [app.schueler, app.noten, activeFach, sem, stats]);

  const handleExport = () => {
    const header = ['Name', assessmentMode === 'grades' ? 'Durchschnitt' : 'Prozent', 'Endnote'];
    const rows = students.map(s => {
      const avg = berechne(app, s.id, activeFach, sem);
      const nd = app.noten?.[s.id]?.[activeFach]?.[sem] || { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] };
      const en = (s.spf || s.espf) && nd.endnote ? nd.endnote : (hasCalculatedAverage(avg) ? (assessmentMode === 'grades' ? Math.round(avg) : `${Math.round(avg)}%`) : '');
      return [`${s.nachname} ${s.vorname}`, hasCalculatedAverage(avg) ? (assessmentMode === 'grades' ? avg.toFixed(2) : `${avg.toFixed(1)}%`) : '', en];
    });
    
    const csvContent = [header, ...rows].map(e => e.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Notenliste_${activeFach}_${app.schuljahr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isBorderline = (val: number | string | null | undefined) => {
    if (typeof val === 'string') {
      return val.includes('+') || val.includes('-') || val.includes('!') || val.includes('?');
    }
    return false;
  };

  const isColorableGrade = (val: number | string | null | undefined) => {
    if (val === null || val === undefined || val === '' || val === 'f' || val === 'x' || val === '-') return false;
    if (typeof val === 'number') return true;
    if (typeof val === 'string') {
      const parsed = parseFloat(val.replace(',', '.'));
      if (!isNaN(parsed)) return true;
    }
    return false;
  };

  const getGradeColor = (rawVal: number | string | null | undefined, isRequired: boolean = false, typ?: string, idx?: number) => {
    const isMissing = isAssessmentValueMissing(rawVal);
    if (filterMissing && isRequired && isMissing) {
      return '!bg-rose-100 ring-2 ring-rose-500 ring-inset border-rose-500 text-rose-800 animate-pulse z-10 font-bold';
    }
    
    if (isAssessmentValueMissing(rawVal)) return '';
    if (rawVal === 'f' || rawVal === 'x' || rawVal === '-') return 'bg-slate-50 text-slate-400 opacity-60';
    if (!heatmapMode) return '';
    
    if (assessmentMode === 'percent' || assessmentMode === 'points') {
      const maxP = typ !== undefined && idx !== undefined ? getMaxPoints(app, activeFach, typ, idx) : 100;
      const p = calculateItemPercent(rawVal, assessmentMode, maxP);
      if (p === null) return '';
      if (p >= 87.5) return '!bg-green-300/40 text-green-900 border-green-300';
      if (p >= 75) return '!bg-blue-300/40 text-blue-900 border-blue-300';
      if (p >= 62.5) return '!bg-amber-300/40 text-amber-900 border-amber-300';
      if (p >= 50) return '!bg-orange-300/40 text-orange-900 border-orange-300';
      return '!bg-red-400/50 text-red-950 border-red-400';
    }
    
    let val: number | null = null;
    if (typeof rawVal === 'number') {
      val = rawVal;
    } else if (typeof rawVal === 'string') {
      const parsed = parseFloat(rawVal.replace(',', '.'));
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) {
         val = parsed;
      } else {
         const match = rawVal.match(/([1-5])/);
         if (match) val = parseInt(match[1], 10);
      }
    }
    
    if (val === null) return '';
    if (val <= 1.5) return '!bg-green-300/40 text-green-900 border-green-300';
    if (val <= 2.5) return '!bg-blue-300/40 text-blue-900 border-blue-300';
    if (val <= 3.5) return '!bg-amber-300/40 text-amber-900 border-amber-300';
    if (val <= 4.5) return '!bg-orange-300/40 text-orange-900 border-orange-300';
    return '!bg-red-400/50 text-red-950 border-red-400';
  };

  const setNote = (sid: string, typ: 'sa' | 'lzk' | 'wp' | 'aufgaben', idx: number, val: string) => {
    const mode = getAssessmentMode(app, activeFach);
    const maxP = getMaxPoints(app, activeFach, typ, idx);
    const parsedInput = parseAssessmentInput(val, mode, maxP);
    if (!parsedInput.valid) return;
    const validated = parsedInput.value;

    setApp(prev => {
      const isSyncWP = prev.notenMeta?.syncWpDeutschMath;
      const shouldSync = isSyncWP && typ === 'wp' && (activeFach === 'Deutsch' || activeFach === 'Mathematik');
      const targetFach = activeFach === 'Deutsch' ? 'Mathematik' : 'Deutsch';

      const newNoten = { ...prev.noten };
      
      const sidData = newNoten[sid] || {};
      const fachData = sidData[activeFach] || {};
      const semData: GradeData = fachData[sem] || { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] };
      
      const newArray = [...(semData[typ] || [])];
      newArray[idx] = validated;

      const updatedFachData = { ...fachData, [sem]: { ...semData, [typ]: newArray } };
      newNoten[sid] = { ...sidData, [activeFach]: updatedFachData };

      if (shouldSync) {
        const targetSidData = newNoten[sid] || {};
        const targetFachData = targetSidData[targetFach] || {};
        const targetSemData: GradeData = targetFachData[sem] || { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] };
        const targetArray = [...(targetSemData[typ] || [])];
        targetArray[idx] = validated;
        
        const updatedTargetFachData = { ...targetFachData, [sem]: { ...targetSemData, [typ]: targetArray } };
        newNoten[sid] = { ...targetSidData, [targetFach]: updatedTargetFachData };
      }

      return {
        ...prev,
        noten: newNoten
      };
    });

    const student = app.schueler.find(s => s.id === sid);
    if (student && validated !== null) {
      logActivity(setApp, `Note/Status für ${student.vorname} ${student.nachname} in ${activeFach} erfasst`, 'note', sid);
      if (validated === 1 || validated === 2) {
        try {
          window.dispatchEvent(new CustomEvent('classpet-joy', {
            detail: { 
              message: `Super! Eine tolle Note (${validated}) für ${student.vorname}! 🏆✨` 
            }
          }));
        } catch (e) {}
      }
    }
  };

  const setEndnote = (sid: string, val: string) => {
    let validated = val;
    if (val && val.trim() !== '') {
      const upper = val.trim().toUpperCase();
      if (['SPF', 'ESPF'].includes(upper)) {
        validated = upper;
      } else {
        const n = parseFloat(val.replace(',', '.'));
        if (!isNaN(n)) {
          if (n < 1) validated = '1';
          else if (n > 5) validated = '5';
          else validated = String(n);
        }
      }
    }

    setApp(prev => {
      const sidData = prev.noten[sid] || {};
      const fachData = sidData[activeFach] || {};
      const semData: GradeData = fachData[sem] || { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] };
      
      return {
        ...prev,
        noten: {
          ...prev.noten,
          [sid]: {
            ...sidData,
            [activeFach]: {
              ...fachData,
              [sem]: {
                ...semData,
                endnote: validated
              }
            }
          }
        }
      };
    });
  };

  const updateSimpleGrade = (sid: string, targetSem: '1' | '2', val: string) => {
    let validated = val;
    if (val && val.trim() !== '') {
      const upper = val.trim().toUpperCase();
      if (['SPF', 'ESPF'].includes(upper)) {
        validated = upper;
      } else {
        const n = parseFloat(val.replace(',', '.'));
        if (!isNaN(n)) {
          if (n < 1) validated = '1';
          else if (n > 5) validated = '5';
          else validated = String(n);
        }
      }
    }

    setApp(prev => {
      const currentNoten = prev.noten || {};
      const sidData = currentNoten[sid] || {};
      const fachData = sidData[activeFach] || {};
      const semData: GradeData = fachData[targetSem] || { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] };
      
      return {
        ...prev,
        noten: {
          ...currentNoten,
          [sid]: {
            ...sidData,
            [activeFach]: {
              ...fachData,
              [targetSem]: {
                ...semData,
                endnote: validated
              }
            }
          }
        }
      };
    });
  };

  const updateSimpleComment = (sid: string, targetSem: '1' | '2', val: string) => {
    setApp(prev => {
      const currentNoten = prev.noten || {};
      const sidData = currentNoten[sid] || {};
      const fachData = sidData[activeFach] || {};
      const semData: GradeData = fachData[targetSem] || { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] };
      
      return {
        ...prev,
        noten: {
          ...currentNoten,
          [sid]: {
            ...sidData,
            [activeFach]: {
              ...fachData,
              [targetSem]: {
                ...semData,
                freitext: val
              }
            }
          }
        }
      };
    });
  };

  const setMIDirekt = (sid: string, val: string) => {
    let validated: number | undefined = undefined;
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      const n = parseFloat(String(val).replace(',', '.'));
      if (!isNaN(n)) {
        if (assessmentMode === 'percent') {
          validated = Math.min(100, Math.max(0, n));
        } else if (assessmentMode === 'points') {
          validated = Math.max(0, n);
        } else {
          validated = (n >= 1 && n <= 5) ? n : undefined;
        }
      }
    }

    setApp(prev => {
      const sidData = prev.noten[sid] || {};
      const fachData = sidData[activeFach] || {};
      const semData: GradeData = fachData[sem] || { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] };
      
      return {
        ...prev,
        noten: {
          ...prev.noten,
          [sid]: {
            ...sidData,
            [activeFach]: {
              ...fachData,
              [sem]: {
                ...semData,
                miDirekt: validated
              }
            }
          }
        }
      };
    });
  };

  const setHUEVal = (sid: string, val: number) => {
    setApp(prev => {
      const sidData = prev.noten[sid] || {};
      const fachData = sidData[activeFach] || {};
      const semData: GradeData = fachData[sem] || { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] };
      
      return {
        ...prev,
        noten: {
          ...prev.noten,
          [sid]: {
            ...sidData,
            [activeFach]: {
              ...fachData,
              [sem]: {
                ...semData,
                hue: Math.max(0, val),
                hueErfasst: true
              }
            }
          }
        }
      };
    });
  };

  const setHUEComment = (sid: string, comment: string) => {
    setApp(prev => {
      const sidData = prev.noten[sid] || {};
      const fachData = sidData[activeFach] || {};
      const semData: GradeData = fachData[sem] || { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] };
      const currentAnm = [...(semData.hueAnm || [])];
      if (comment && comment.trim()) {
        if (currentAnm.length === 0) {
          currentAnm.push(comment.trim());
        } else {
          currentAnm[0] = comment.trim();
        }
      } else {
        currentAnm.length = 0;
      }
      
      return {
        ...prev,
        noten: {
          ...prev.noten,
          [sid]: {
            ...sidData,
            [activeFach]: {
              ...fachData,
              [sem]: {
                ...semData,
                hueAnm: currentAnm
              }
            }
          }
        }
      };
    });
  };

  const changeHUE = (sid: string, delta: number) => {
    setApp(prev => {
      const sidData = prev.noten[sid] || {};
      const fachData = sidData[activeFach] || {};
      const semData: GradeData = fachData[sem] || { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] };
      
      return {
        ...prev,
        noten: {
          ...prev.noten,
          [sid]: {
            ...sidData,
            [activeFach]: {
              ...fachData,
              [sem]: {
                ...semData,
                hue: Math.max(0, (semData.hue || 0) + delta),
                hueErfasst: true
              }
            }
          }
        }
      };
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, sid: string, typ: string, idx: number) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) return;
    
    const inputs = Array.from(document.querySelectorAll('input[data-col]')) as HTMLInputElement[];
    const currentIndex = inputs.indexOf(e.target as HTMLInputElement);
    if (currentIndex === -1) return;

    const dataCol = (e.target as HTMLElement).getAttribute('data-col');

    if (e.key === 'ArrowRight') {
      inputs[currentIndex + 1]?.focus();
    } else if (e.key === 'ArrowLeft') {
      inputs[currentIndex - 1]?.focus();
    } else if (e.key === 'ArrowDown' || (e.key === 'Enter' && !e.shiftKey)) {
      e.preventDefault();
      const nextRowInput = inputs.find((el, i) => i > currentIndex && el.getAttribute('data-col') === dataCol);
      nextRowInput?.focus();
    } else if (e.key === 'ArrowUp' || (e.key === 'Enter' && e.shiftKey)) {
      e.preventDefault();
      const prevRowInputs = inputs.filter((el, i) => i < currentIndex && el.getAttribute('data-col') === dataCol);
      prevRowInputs[prevRowInputs.length - 1]?.focus();
    }
  };

  const updateColMeta = (typ: 'sa'|'lzk'|'wp'|'obj', idx: number, labelVal: string, dateVal: string, maxPointsVal?: number) => {
    setApp(prev => ({ ...prev, notenMeta: updateSubjectColumn(prev.notenMeta || {}, activeFach, typ, idx, labelVal, dateVal, maxPointsVal) }));
    setEditingColLabel(null);
  };

  const renderColHeader = (typ: 'sa'|'lzk'|'wp'|'obj', i: number, baseColorClass: string, isFirst: boolean, defaultName: string) => {
    if (isolatedCol && (isolatedCol.typ !== typ || isolatedCol.idx !== i)) {
      return null; // hide if another column is isolated
    }

    const customLabel = app.notenMeta?.[activeFach]?.colLabels?.[typ]?.[i];
    const customDate = app.notenMeta?.[activeFach]?.colDates?.[typ]?.[i];
    const maxP = getMaxPoints(app, activeFach, typ, i);
    
    return (
      <th 
        key={`h${typ}-${i}`} 
        onMouseEnter={() => setHoveredCell({sid: '', typ, idx: i})}
        onMouseLeave={() => setHoveredCell(null)}
        className={`px-1 ${zoomLevel === 'compact' ? 'py-2 text-[0.55rem]' : zoomLevel === 'large' ? 'py-5 text-[0.75rem]' : 'py-3.5 text-[0.6rem]'} w-[5.5rem] border-b-2 border-r transition-all group/col relative isolate
          ${baseColorClass} 
          ${isFirst && !isolatedCol ? `border-l-2 border-l-${baseColorClass.match(/bg-([a-z]+)-/)?.[1] || 'slate'}-600` : ''} 
          ${isolatedCol ? 'min-w-[12rem] bg-amber-50 border-amber-200' : ''}
          ${hoveredCell && hoveredCell.typ === typ && hoveredCell.idx === i ? 'bg-indigo-100 border-indigo-400 text-indigo-900 shadow-md font-black scale-[1.02] z-40' : ''}`}
        onClick={() => {
          setIsolatedCol({typ, idx: i});
          // after a small delay focus the first input in this col if we just isolated it
          setTimeout(() => {
            const input = document.querySelector(`input[data-col="${typ}-${i}"]`) as HTMLInputElement | null;
            input?.focus();
          }, 50);
        }}
      >
        <div className="flex flex-col items-center justify-center min-h-[2.5rem] gap-0.5 cursor-pointer relative z-10 w-full">
          <span className={`text-[0.6rem] font-black ${customLabel ? 'text-[0.65rem] whitespace-normal leading-tight' : 'opacity-70'} w-full text-wrap leading-tight break-words px-1`} title={customLabel || `${defaultName} ${i+1}`}>
            {customLabel || defaultName} {!customLabel && <span>{i+1}</span>}
          </span>
          {customDate && (
            <span className="text-[0.5625rem] font-medium opacity-80 mt-0.5">
              {new Date(customDate).toLocaleDateString('de-DE', {day: '2-digit', month: '2-digit'})}
            </span>
          )}
          {assessmentMode === 'points' && (
            <span className="inline-block text-[0.5625rem] font-black bg-amber-100/90 text-amber-900 px-1.5 py-0.2 rounded-full border border-amber-300 shadow-3xs" title={`Maximale Punktzahl: ${maxP}`}>
              Max: {maxP}P
            </span>
          )}
          {assessmentMode === 'percent' && (
            <span className="inline-block text-[0.5625rem] font-bold bg-blue-100/80 text-blue-900 px-1.5 py-0.2 rounded-full border border-blue-200">
              0–100%
            </span>
          )}
          
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditingAssessmentModal({ typ, idx: i, isNew: false });
              setIsolatedCol(null);
            }}
            className="absolute -top-1 -right-1 p-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-md shadow-xs opacity-0 group-hover/col:opacity-100 transition-opacity z-20 print:hidden text-[0.625rem] text-slate-700 hover:text-indigo-600"
            title="Umbenennen / Datum / Punkte bearbeiten"
          >
            ✏️
          </button>
        </div>
      </th>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 landscape !important;
            margin: 10mm !important;
          }
          .gradebook-table {
            min-width: 0 !important;
            width: 100% !important;
            table-layout: fixed !important;
            font-size: 7.2pt !important;
          }
          .gradebook-table th, 
          .gradebook-table td {
            padding: 3pt 2pt !important;
            font-size: 7.2pt !important;
            word-break: break-all !important;
          }
          .gradebook-table input {
            border: none !important;
            background: transparent !important;
            text-align: center !important;
            box-shadow: none !important;
            width: 100% !important;
            padding: 0 !important;
            font-size: 8pt !important;
          }
        }
      `}} />

      {/* Page Content Header (Buttons only, title is already in Topbar) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5 pt-1 print:hidden">
        {activeView === 'verhalten' ? (
          <div>
            <h2 className="text-[0.8125rem] leading-snug font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
              <span>🌟 Gesamt-Verhalten & Chronik</span>
            </h2>
            <p className="text-[0.6875rem] leading-tight text-slate-450 font-semibold mt-1 uppercase tracking-wider">
              Klassenweites, fächerunabhängiges Verhalten · Kontinuierliches Feedback
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <span className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400">Aktives Schulfach wählen:</span>
            <select
              value={activeFach}
              onChange={(event) => {
                setActiveFach(event.target.value);
                setShowWeights(false);
              }}
              aria-label="Aktives Schulfach auswählen"
              className="lg:hidden w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {availableSubjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
            <div className="hidden lg:flex flex-wrap gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              {(() => {
                return availableSubjects.map(f => {
                  const isFActive = !app.faecher || app.faecher.includes(f) || f === 'Unterricht';
                  const isSelected = activeFach === f;
                  const fHex = getFachHexColor(app?.fachConfig?.[f]?.color || f);
                  
                  // Map some emojis to subjects to enrich without cluttering
                  const subjectEmoji = f === 'Deutsch' ? '📚' : f === 'Mathematik' ? '📐' : f === 'Sachunterricht' ? '🌍' : f === 'Englisch' ? '🇬🇧' : f === 'Musik' ? '🎵' : f === 'Turnen' ? '🏃' : f === 'Unterricht' ? '🏫' : '📝';
                  
                  return (
                    <button 
                      key={f}
                      className={`px-3 py-2 rounded-lg text-[0.6875rem] font-bold tracking-wide transition-all cursor-pointer flex items-center gap-2 ${
                        isSelected 
                          ? isFActive 
                            ? 'bg-emerald-700 text-white shadow-sm' 
                            : 'bg-amber-700 text-white shadow-sm' 
                          : isFActive 
                            ? 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80 shadow-3xs' 
                            : 'bg-zinc-50/50 text-slate-450 hover:bg-zinc-100 hover:text-slate-600 border border-slate-200/40 opacity-75'
                      }`}
                      onClick={() => {
                        setActiveFach(f);
                        setShowWeights(false);
                        const isHueAllowed = ['deutsch', 'mathematik', 'sachunterricht', 'mathe'].some(s => f?.toLowerCase().includes(s));
                        if (activeView === 'hue' && !isHueAllowed) {
                          setActiveView('noten');
                        }
                      }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/40 shadow-xs" style={{ backgroundColor: fHex }} />
                      <span>{subjectEmoji} {f}</span>
                      {!isFActive && (
                        <span className={`text-[0.4375rem] leading-none uppercase font-black px-1.5 py-0.5 rounded border tracking-wider shrink-0 ${
                          isSelected 
                            ? 'bg-amber-500/30 border-amber-400/30 text-amber-100' 
                            : 'bg-zinc-100 border-zinc-200/50 text-slate-400'
                        }`}>
                          einfach
                        </span>
                      )}
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        )}
        {activeView !== 'verhalten' && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-stretch md:self-auto">
            <button 
              onClick={() => { setShowGradeCalculator(!showGradeCalculator); setShowWeights(false); }}
              className={`px-4 py-2.5 border rounded-xl text-[0.6875rem] font-bold uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-sm ${showGradeCalculator ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-emerald-300'}`}
            >
              <Calculator size={14} className={showGradeCalculator ? 'text-white' : 'text-emerald-600'} />
              <span>Notenrechner</span>
            </button>
            <button 
              onClick={() => { setShowWeights(!showWeights); setShowGradeCalculator(false); }}
              className={`px-4 py-2.5 border rounded-xl text-[0.6875rem] font-bold uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-sm ${showWeights ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-emerald-300'}`}
            >
              <Settings size={14} className={showWeights ? 'text-white' : 'text-slate-500'} />
              <span>Gewichtung</span>
            </button>
          </div>
        )}
      </div>

      {activeView !== 'verhalten' && app.schueler.length > 0 && (
        <section className="rounded-2xl border border-emerald-100 bg-emerald-50/35 p-4 print:hidden" aria-labelledby="gradebook-status-heading">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <h2 id="gradebook-status-heading" className="text-sm font-black text-slate-900">
                {activeFach} · Schuljahr
              </h2>
              <p className="text-xs font-bold text-slate-500 mt-1">
                Eingaben werden automatisch in Statistik, Schülerdossier und KEL-Präsentation übernommen.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 xl:min-w-[570px]">
              <div className="rounded-xl bg-white border border-white px-3 py-2 shadow-xs">
                <div className="text-lg font-black text-emerald-700 tabular-nums">{gradebookDataStatus.assessmentEntries}</div>
                <div className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-500">Einträge</div>
              </div>
              <div className="rounded-xl bg-white border border-white px-3 py-2 shadow-xs">
                <div className="text-lg font-black text-indigo-700 tabular-nums">
                  {gradebookDataStatus.studentsWithEntries}<span className="text-xs text-slate-400">/{gradebookDataStatus.totalStudents}</span>
                </div>
                <div className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-500">Kinder mit Daten</div>
              </div>
              <div className="rounded-xl bg-white border border-white px-3 py-2 shadow-xs">
                <div className="text-lg font-black text-amber-700 tabular-nums">
                  {gradebookDataStatus.calculatedStudents}<span className="text-xs text-slate-400">/{gradebookDataStatus.totalStudents}</span>
                </div>
                <div className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-500">Schnitt berechenbar</div>
              </div>
              <div className="rounded-xl bg-white border border-white px-3 py-2 shadow-xs">
                <div className="text-lg font-black text-violet-700 tabular-nums">{hasAnyAssessment ? missingCount : '–'}</div>
                <div className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-500">
                  {hasAnyAssessment ? 'Unvollständig' : 'Noch nicht begonnen'}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {app.schueler.length === 0 ? (
        <div className="py-12">
          <EmptyState 
            icon="👥"
            title="Keine Schüler:innen"
            description="Lege zuerst Schüler:innen in der Schülerliste an, um Noten verwalten zu können."
            actionLabel="Zur Schülerliste"
            onAction={() => setPage('schueler')}
          />
        </div>
      ) : (
        <div className="contents">
          {/* Streamlined Top Control Bar */}
          <div className="flex flex-col gap-3 bg-white rounded-2xl p-4 shadow-sm border border-slate-200 no-print mb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Left: Subject Selection */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={activeFach}
                  onChange={(e) => setActiveFach(e.target.value)}
                  className="bg-slate-100 border border-slate-200 hover:border-emerald-500 font-black text-slate-800 text-[0.875rem] rounded-xl px-3.5 py-2 outline-none cursor-pointer transition-all shadow-3xs"
                >
                  {availableSubjects.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setSimpleDashboardMode(!simpleDashboardMode)}
                  className={`px-3 py-2 rounded-xl text-[0.75rem] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border ${
                    simpleDashboardMode
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-3xs'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}
                  title="Einfachmodus reduziert die sichtbare Komplexität für den Schulalltag"
                >
                  <span>{simpleDashboardMode ? '✨ Einfachmodus' : '⚙️ Erweiterter Modus'}</span>
                </button>
              </div>

              {/* Right: + Bewertung & Mehr Menu */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddAssessmentModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-[0.8125rem] rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Plus size={16} strokeWidth={3} />
                  <span>Bewertung</span>
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[0.8125rem] rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200/60"
                  >
                    <span>Mehr</span>
                    <ChevronDown size={14} className={`transition-transform ${showMoreMenu ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showMoreMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowMoreMenu(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -5 }}
                          className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 flex flex-col gap-1 text-[0.8125rem]"
                        >
                          <button
                            onClick={() => {
                              setShowGradeCalculator(true);
                              setShowMoreMenu(false);
                            }}
                            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 font-semibold text-slate-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                          >
                            <span>🧮</span>
                            <span>Notenrechner</span>
                          </button>

                          <button
                            onClick={() => {
                              setShowWeights(true);
                              setShowMoreMenu(false);
                            }}
                            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 font-semibold text-slate-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                          >
                            <span>⚖️</span>
                            <span>Gewichtung</span>
                          </button>

                          <button
                            onClick={() => {
                              setShowStats(!showStats);
                              setShowMoreMenu(false);
                            }}
                            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 font-semibold text-slate-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                          >
                            <span>📊</span>
                            <span>{showStats ? 'Statistik ausblenden' : 'Statistik & Notenspiegel'}</span>
                          </button>

                          <button
                            onClick={() => {
                              setHeatmapMode(!heatmapMode);
                              setShowMoreMenu(false);
                            }}
                            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 font-semibold text-slate-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                          >
                            <span>🌡️</span>
                            <span>Heatmap: {heatmapMode ? 'AN' : 'AUS'}</span>
                          </button>

                          <button
                            onClick={() => {
                              handleExport();
                              setShowMoreMenu(false);
                            }}
                            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 font-semibold text-slate-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                          >
                            <span>🖨️</span>
                            <span>Export / Drucken</span>
                          </button>

                          <div className="my-1 border-t border-slate-100" />

                          <div className="px-3 py-1 text-[0.625rem] font-black uppercase text-slate-400 tracking-wider">
                            Darstellung
                          </div>
                          <div className="flex bg-slate-100 p-1 rounded-xl items-center">
                            {(['compact', 'standard', 'large'] as const).map((lvl) => (
                              <button
                                key={lvl}
                                onClick={() => changeZoomLevel(lvl)}
                                className={`flex-1 py-1 text-[0.625rem] font-bold rounded-lg transition-all ${
                                  zoomLevel === lvl ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
                                }`}
                              >
                                {lvl === 'compact' ? 'Klein' : lvl === 'large' ? 'Groß' : 'Normal'}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Main View Tabs */}
            <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200/50 relative z-10 w-full overflow-x-auto">
              {(isFachActive
                ? [
                    { id: 'noten', label: 'Leistungen' },
                    { id: 'mitarbeit', label: 'Mitarbeit' },
                    ...(['deutsch', 'mathematik', 'sachunterricht', 'mathe'].some((s) =>
                      activeFach?.toLowerCase().includes(s)
                    )
                      ? [{ id: 'hue', label: 'Hausübungen' }]
                      : []),
                    { id: 'verhalten', label: 'Verhalten' },
                  ]
                : [{ id: 'simple_noten', label: 'Einfache Noteneingabe' }]
              ).map((tab) => {
                const isSel = activeView === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveView(tab.id as any)}
                    className={`relative px-4 py-2 rounded-lg text-[0.8125rem] font-bold tracking-tight transition-all flex items-center justify-center gap-2 flex-1 cursor-pointer select-none leading-none z-10 ${
                      isSel ? 'text-slate-950 font-extrabold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {isSel && (
                      <motion.div
                        layoutId="activeViewPill"
                        className="absolute inset-0 bg-white rounded-lg shadow-xs border border-slate-200/40 z-[-1]"
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

      <GradeCalculatorModal isOpen={showGradeCalculator} onClose={() => setShowGradeCalculator(false)} inline={true} />
      
      <AnimatePresence>
        {simulateModalForSid && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setSimulateModalForSid(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200  w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
                <div className="flex items-center gap-3 text-indigo-900">
                  <Sparkles size={20} className="text-indigo-500" />
                  <h3 className="font-black text-[1.125rem] leading-normal tracking-tight">Was wäre wenn...?</h3>
                </div>
                <button onClick={() => setSimulateModalForSid(null)} className="text-slate-400 hover:text-slate-600 bg-white shadow-sm hover:shadow p-2 rounded-full transition-all">
                  ✕
                </button>
              </div>
              <div className="p-6">
                <p className="text-[0.875rem] leading-snug font-medium text-slate-500 mb-6">Wie verändert sich die Zeugnisnote von <span className="font-bold text-slate-800">{app.schueler.find(s => s.id === simulateModalForSid)?.vorname}</span> bei der nächsten Schularbeit / Prüfung?</p>
                <div className="grid grid-cols-1 gap-2">
                  {[1, 2, 3, 4, 5].map(note => {
                     // Shallow clone app and inject temporary test grade
                     const simApp = JSON.parse(JSON.stringify(app));
                     const sId = simulateModalForSid;
                     if (!simApp.noten) simApp.noten = {};
                     if (!simApp.noten[sId]) simApp.noten[sId] = {};
                     if (!simApp.noten[sId][activeFach]) simApp.noten[sId][activeFach] = {};
                     if (!simApp.noten[sId][activeFach][sem]) simApp.noten[sId][activeFach][sem] = { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0 };
                     
                     // Inject a new SA grade
                     if (!simApp.noten[sId][activeFach][sem].sa) simApp.noten[sId][activeFach][sem].sa = [];
                     // Put it at the first empty spot or append
                     const saArr = simApp.noten[sId][activeFach][sem].sa;
                     let injected = false;
                     for (let i = 0; i < cfg.saCount; i++) {
                         if (saArr[i] === undefined || saArr[i] === null || saArr[i] === '') {
                             saArr[i] = note;
                             injected = true;
                             break;
                         }
                     }
                     if (!injected) saArr.push(note); // just force append

                     const simAvg = berechne(simApp, sId, activeFach, sem);
                     const roundedSimAvg = simAvg ? Math.round(simAvg) : null;
                     
                     return (
                        <div key={note} className="flex justify-between items-center p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:border-indigo-200 transition-colors">
                           <div className="flex items-center gap-3">
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-[0.875rem] leading-snug ${
                               note === 1 ? 'bg-green-500' :
                               note === 2 ? 'bg-blue-500' :
                               note === 3 ? 'bg-amber-500' :
                               note === 4 ? 'bg-orange-500' :
                               'bg-red-500'
                             }`}>
                               {note}
                             </div>
                             <span className="text-[0.75rem] leading-tight font-bold text-slate-500 uppercase tracking-widest">Nächste Note</span>
                           </div>
                           
                           {simAvg !== null && (
                             <div className="flex items-center gap-4">
                               <div className="text-right">
                                 <div className="font-mono text-[0.875rem] leading-snug font-bold text-slate-600">{simAvg.toFixed(2)}</div>
                               </div>
                               <div className="text-right flex items-center gap-2">
                                 <span className="text-slate-400 text-[0.75rem] leading-tight">➔</span>
                                 <div className={`w-10 py-1 rounded-lg flex items-center justify-center font-black text-white text-[0.875rem] leading-snug shadow-sm ${
                                   roundedSimAvg === 1 ? 'bg-green-500' :
                                   roundedSimAvg === 2 ? 'bg-blue-500' :
                                   roundedSimAvg === 3 ? 'bg-amber-500' :
                                   roundedSimAvg === 4 ? 'bg-orange-500' :
                                   'bg-red-500'
                                 }`}>
                                   {roundedSimAvg}
                                 </div>
                               </div>
                             </div>
                           )}
                        </div>
                     )
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeView === ('simple_noten' as any) ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-amber-50/80 border border-amber-200/60 rounded-3xl p-6 flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-100/50 rounded-2xl flex items-center justify-center text-amber-600 shrink-0 text-xl shadow-inner border border-amber-200/20">
              📝
            </div>
            <div className="space-y-1">
              <h4 className="text-[0.875rem] font-black uppercase text-amber-900 tracking-tight flex items-center gap-2">
                <span>Einfache Noteneingabe aktiv</span>
                <span className="text-[0.625rem] bg-amber-200/50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300/40 uppercase font-black tracking-widest font-sans">Nebenfach</span>
              </h4>
              <p className="text-[0.75rem] text-amber-700 leading-relaxed">
                Dieses Fach ist derzeit nicht als aktives Hauptfach konfiguriert. Um den Verwaltungsaufwand gering zu halten, reicht hier eine direkte Eingabe der Zeugnisnote/Endnote für das Schuljahr sowie eine optionale Notiz.
              </p>
            </div>
          </div>

          <div className="card !p-0 shadow-xs border border-slate-200 bg-white rounded-3xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
              <div>
                <h3 className="text-[1rem] leading-tight font-black text-slate-900 tracking-tight uppercase">Einfache Notenliste: {activeFach}</h3>
                <p className="text-[0.6875rem] text-slate-400 font-bold uppercase tracking-wider mt-1">Direkte Notenerfassung für alle Schüler:innen</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[0.625rem] font-bold uppercase tracking-widest text-slate-400">
                    <th className={`${zoomLevel === 'compact' ? 'px-3.5 py-2 text-[0.55rem]' : zoomLevel === 'large' ? 'px-8 py-5 text-[0.75rem]' : 'px-6 py-4 text-[0.625rem]'} text-left font-black w-[250px]`}>Schüler:in</th>
                    <th className={`${zoomLevel === 'compact' ? 'px-3.5 py-2 text-[0.55rem]' : zoomLevel === 'large' ? 'px-8 py-5 text-[0.75rem]' : 'px-6 py-4 text-[0.625rem]'} text-center font-black w-[180px]`}>Jahresnote</th>
                    <th className={`${zoomLevel === 'compact' ? 'px-3.5 py-2 text-[0.55rem]' : zoomLevel === 'large' ? 'px-8 py-5 text-[0.75rem]' : 'px-6 py-4 text-[0.625rem]'} text-left font-black`}>Notiz / Kommentar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((s) => {
                    const nd1: any = app.noten?.[s.id]?.[activeFach]?.[ '1' ] || {};
                    const valSem1 = nd1.endnote || '';
                    const comment1 = nd1.freitext || '';

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className={`${zoomLevel === 'compact' ? 'px-3.5 py-1.5' : zoomLevel === 'large' ? 'px-8 py-5' : 'px-6 py-4'}`}>
                          <div className={`font-bold text-slate-800 ${zoomLevel === 'compact' ? 'text-[0.75rem]' : zoomLevel === 'large' ? 'text-[0.9375rem]' : 'text-[0.8125rem]'}`}>
                            {s.nachname} <span className="font-medium text-slate-500">{s.vorname}</span>
                          </div>
                          {(s.spf || s.espf) && (
                            <span className={`inline-flex items-center gap-1 mt-1 bg-purple-100 text-purple-700 rounded font-black uppercase tracking-widest ${zoomLevel === 'compact' ? 'text-[0.5rem] px-1 py-0' : zoomLevel === 'large' ? 'text-[0.625rem] px-2 py-1' : 'text-[0.5625rem] px-1.5 py-0.5'}`}>
                              {s.spf ? 'SPF' : 'ESPF'}
                            </span>
                          )}
                        </td>
                        <td className={`${zoomLevel === 'compact' ? 'px-3.5 py-1.5' : zoomLevel === 'large' ? 'px-8 py-5' : 'px-6 py-4'} text-center`}>
                          <select
                            value={valSem1}
                            onChange={(e) => updateSimpleGrade(s.id, '1', e.target.value)}
                            className={`bg-white border border-slate-200 hover:border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-bold outline-none transition-all shadow-3xs cursor-pointer w-full max-w-[130px] mx-auto block ${zoomLevel === 'compact' ? 'rounded-md px-2 py-1 text-[0.7rem]' : zoomLevel === 'large' ? 'rounded-2xl px-4 py-2.5 text-[0.875rem]' : 'rounded-xl px-3 py-2 text-[0.75rem]'}`}
                          >
                            <option value="">–</option>
                            <option value="1">1 (Sehr gut)</option>
                            <option value="2">2 (Gut)</option>
                            <option value="3">3 (Befriedigend)</option>
                            <option value="4">4 (Genügend)</option>
                            <option value="5">5 (Nicht genügend)</option>
                            <option value="SPF">SPF</option>
                            <option value="ESPF">ESPF</option>
                          </select>
                        </td>
                        <td className={`${zoomLevel === 'compact' ? 'px-3.5 py-1.5' : zoomLevel === 'large' ? 'px-8 py-5' : 'px-6 py-4'}`}>
                          <input
                            type="text"
                            value={comment1}
                            onChange={(e) => updateSimpleComment(s.id, '1', e.target.value)}
                            placeholder="Optionale Notiz oder Bemerkung..."
                            className={`w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-150 hover:border-slate-250 focus:border-slate-400 outline-none transition-all ${zoomLevel === 'compact' ? 'rounded-md px-2.5 py-1 text-[0.7rem]' : zoomLevel === 'large' ? 'rounded-2xl px-5 py-2.5 text-[0.875rem]' : 'rounded-xl px-4 py-2 text-[0.75rem]'}`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeView === 'mitarbeit' && !showWeights ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="card !p-0 shadow-lg border border-slate-200 bg-white rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/40 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <h3 className="text-[1.125rem] font-black text-slate-900 tracking-tight flex items-center gap-2"><span>✏️</span><span>Mitarbeit · {activeFach}</span></h3>
                    {mitarbeitSettings.mode !== 'manual' && (
                      <div className="group relative">
                         <Info size={14} className="text-amber-600/50 cursor-help" />
                         <div className="absolute left-0 top-full mt-2 w-64 p-4 bg-white rounded-2xl shadow-2xl border border-slate-200 scale-0 group-hover:scale-100 transition-all origin-top-left z-50 text-[0.6875rem] leading-relaxed">
                            <p className="font-bold text-amber-950 mb-2">{currentSymbol.label} → Notenschlüssel</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                               <div className="flex justify-between"><span>{(mitarbeitSettings.thresholds?.[1] || 13)}+ {currentSymbol.label}:</span> <span className="font-black text-green-600">Note 1</span></div>
                               <div className="flex justify-between"><span>{(mitarbeitSettings.thresholds?.[2] || 10)}-{(mitarbeitSettings.thresholds?.[1] || 13)-1} {currentSymbol.label}:</span> <span className="font-black text-blue-600">Note 2</span></div>
                               <div className="flex justify-between"><span>{(mitarbeitSettings.thresholds?.[3] || 7)}-{(mitarbeitSettings.thresholds?.[2] || 10)-1} {currentSymbol.label}:</span> <span className="font-black text-amber-600">Note 3</span></div>
                               <div className="flex justify-between"><span>{(mitarbeitSettings.thresholds?.[4] || 4)}-{(mitarbeitSettings.thresholds?.[3] || 7)-1} {currentSymbol.label}:</span> <span className="font-black text-orange-600">Note 4</span></div>
                               <div className="flex justify-between"><span>0-{(mitarbeitSettings.thresholds?.[4] || 4)-1} {currentSymbol.label}:</span> <span className="font-black text-red-600">Note 5</span></div>
                            </div>
                         </div>
                      </div>
                    )}
                 </div>
                 <span className="text-[0.625rem] font-black text-amber-800 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full uppercase tracking-widest shrink-0">
                   {mitarbeitSettings.mode === 'manual' ? 'Manuelle Bewertung' : `${currentSymbol.label} tracken`}
                 </span>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full">
                    <thead>
                       <tr className="bg-slate-50/50 text-[0.6875rem] font-black uppercase tracking-wider text-slate-500 border-b border-slate-150">
                          <th className={`${zoomLevel === 'compact' ? 'px-3 py-2 text-[0.6rem]' : zoomLevel === 'large' ? 'px-8 py-5 text-[0.75rem]' : 'px-6 py-4.5 text-[0.6875rem]'} text-left w-12`}>#</th>
                          <th className={`${zoomLevel === 'compact' ? 'px-3 py-2 text-[0.6rem]' : zoomLevel === 'large' ? 'px-8 py-5 text-[0.75rem]' : 'px-6 py-4.5 text-[0.6875rem]'} text-left`}>Schüler:innen</th>
                          <th className={`${zoomLevel === 'compact' ? 'px-3 py-2 text-[0.6rem]' : zoomLevel === 'large' ? 'px-8 py-5 text-[0.75rem]' : 'px-6 py-4.5 text-[0.6875rem]'} text-center`}>Aktivität ({currentSymbol.label})</th>
                          <th className={`${zoomLevel === 'compact' ? 'px-3 py-2 text-[0.6rem]' : zoomLevel === 'large' ? 'px-8 py-5 text-[0.75rem]' : 'px-6 py-4.5 text-[0.6875rem]'} text-center w-24`}>Note</th>
                       </tr>
                    </thead>
                    <tbody>
                       {students.map((s, idx) => {
                          const val = app.mitarbeit?.[s.id]?.[activeFach]?.[sem] || 0;
                          const nd = app.noten?.[s.id]?.[activeFach]?.[sem] || { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] };
                          const currentMIDirekt = nd.miDirekt;
                          const grade = mitarbeitSettings.mode === 'manual' ? currentMIDirekt : calculateMitarbeitNote(val);

                          return (
                             <tr key={s.id} className={`hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-0 group ${mitarbeitSettings.mode === 'manual' && !currentMIDirekt ? 'opacity-60 hover:opacity-100' : ''}`}>
                                <td className={`${zoomLevel === 'compact' ? 'px-3 py-1.5 text-[0.6rem]' : zoomLevel === 'large' ? 'px-8 py-5 text-[0.8125rem]' : 'px-6 py-4.5 text-[0.6875rem]'} font-extrabold text-slate-400`}>{idx + 1}</td>
                                <td className={`${zoomLevel === 'compact' ? 'px-3 py-1.5' : zoomLevel === 'large' ? 'px-8 py-5' : 'px-6 py-4.5'}`}>
                                   <div className={`${zoomLevel === 'compact' ? 'text-[0.75rem]' : zoomLevel === 'large' ? 'text-[1rem]' : 'text-[0.875rem]'} font-bold text-slate-850`}>{s.nachname} <span className="text-slate-500 font-semibold">{s.vorname}</span></div>
                                </td>
                                <td className="px-6 py-4">
                                   {mitarbeitSettings.mode === 'manual' ? (
                                      <div className="flex justify-center">
                                         <div className={`flex items-center border border-slate-200 shadow-3xs transition-all group-hover:border-slate-300 bg-slate-100/50 ${zoomLevel === 'compact' ? 'gap-1 p-1 rounded-lg' : zoomLevel === 'large' ? 'gap-2.5 p-2 rounded-2xl' : 'gap-1.5 p-1.5 rounded-xl'}`}>
                                            {[1, 2, 3, 4, 5].map(n => (
                                              <button
                                                key={n}
                                                onClick={() => setMIDirekt(s.id, n.toString())}
                                                onKeyDown={(event) => handleQuickEntryKey(event, 'mitarbeit', idx)}
                                                data-quick-entry={n === 1 ? 'mitarbeit' : undefined}
                                                data-student-index={n === 1 ? idx : undefined}
                                                className={`font-black transition-all transform active:scale-95 ${zoomLevel === 'compact' ? 'w-7 h-7 text-[0.75rem] rounded-md' : zoomLevel === 'large' ? 'w-11 h-11 text-[1rem] rounded-xl' : 'w-9 h-9 text-[0.875rem] rounded-lg'} ${String(currentMIDirekt) === String(n) ? (n === 1 ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-100' : n === 2 ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-100' : n === 3 ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-100' : n === 4 ? 'bg-orange-500 text-white shadow-sm ring-2 ring-orange-100' : 'bg-red-500 text-white shadow-sm ring-2 ring-red-100') : 'bg-white text-slate-500 hover:text-slate-800 hover:shadow-3xs border border-slate-150'}`}
                                              >
                                                {n}
                                              </button>
                                            ))}
                                            {currentMIDirekt && (
                                              <button 
                                                onClick={() => {
                                                  if(confirm('Mitarbeit-Note löschen?')) setMIDirekt(s.id, '');
                                                }}
                                                className={`flex items-center justify-center text-red-300 hover:text-red-500 hover:bg-red-50 transition-colors ${zoomLevel === 'compact' ? 'ml-1 w-6 h-6 rounded-md' : zoomLevel === 'large' ? 'ml-3 w-10 h-10 rounded-xl' : 'ml-2 w-8 h-8 rounded-lg'}`}
                                                title="Löschen"
                                              >
                                                <RotateCcw size={14} />
                                              </button>
                                            )}
                                         </div>
                                      </div>
                                   ) : (
                                      <div className="flex items-center gap-4 justify-center">
                                         <button 
                                           onClick={() => changeMI(s.id, -1)} 
                                           className={`shrink-0 border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 active:scale-95 transition-all text-slate-500 shadow-3xs ${zoomLevel === 'compact' ? 'w-7 h-7 rounded-md' : zoomLevel === 'large' ? 'w-11 h-11 rounded-xl' : 'w-9 h-9 rounded-lg'}`}
                                         >
                                           <Minus size={16} />
                                          </button>

                                       <div className={`flex items-center bg-white border border-slate-200 shadow-3xs transition-all group-hover:border-slate-350 group-hover:shadow-2xs relative overflow-hidden ${zoomLevel === 'compact' ? 'w-[240px] h-11 gap-2 px-3 rounded-lg' : zoomLevel === 'large' ? 'w-[380px] h-20 gap-5 px-6 rounded-2xl' : 'w-[320px] h-16 gap-4 px-5 rounded-xl'}`}>
                                          {/* Subtle background pattern/gradient */}
                                          <div className={`absolute inset-0 opacity-[0.03] pointer-events-none ${currentSymbol.bg}`} />
                                          
                                          <div className="flex-1 relative z-10">
                                            <div className="flex justify-between items-end mb-2 px-0.5">
                                              <div className="flex items-baseline gap-1.5">
                                                <input 
                                                  type="number" 
                                                  min="0"
                                                  value={val || ''}
                                                  onChange={(e) => setMIVal(s.id, e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                                                  onKeyDown={(event) => handleQuickEntryKey(event, 'mitarbeit', idx)}
                                                  data-quick-entry="mitarbeit"
                                                  data-student-index={idx}
                                                  className={`bg-transparent outline-none font-black ${currentSymbol.color} tabular-nums leading-none tracking-tight appearance-none p-0 m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${zoomLevel === 'compact' ? 'w-[32px] text-[1.125rem]' : zoomLevel === 'large' ? 'w-[52px] text-[1.875rem]' : 'w-[40px] text-[1.5rem]'}`}
                                                  placeholder="0"
                                                />
                                                <span className={`font-black text-stone-400 uppercase tracking-widest ${zoomLevel === 'compact' ? 'text-[0.55rem]' : zoomLevel === 'large' ? 'text-[0.75rem]' : 'text-[0.625rem]'}`}>{currentSymbol.label}</span>
                                              </div>
                                              <div className="flex items-center gap-1.5">
                                                <div className={`text-white font-black shadow-sm ${grade === 1 ? 'bg-emerald-500' : grade === 2 ? 'bg-blue-500' : grade === 3 ? 'bg-amber-500' : grade === 4 ? 'bg-orange-500' : 'bg-red-500'} ${zoomLevel === 'compact' ? 'px-1.5 py-0.5 rounded text-[0.55rem]' : zoomLevel === 'large' ? 'px-3 py-1 rounded-xl text-[0.75rem]' : 'px-2 py-0.5 rounded-lg text-[0.625rem]'}`}>
                                                  NOTE {grade}
                                                </div>
                                              </div>
                                            </div>
                                            
                                            <div className={`w-full bg-slate-100 rounded-full border border-slate-150 ${zoomLevel === 'compact' ? 'h-1.5' : zoomLevel === 'large' ? 'h-3' : 'h-2'}`}>
                                              <div 
                                                className={`h-full ${currentSymbol.color.replace('text-', 'bg-')} transition-all duration-1000 rounded-full shadow-[0_0_12px_rgba(0,0,0,0.1)] relative`} 
                                                style={{ 
                                                  width: (() => {
                                                    const target = mitarbeitSettings.mode === 'relative' && mitarbeitSettings.relative_confirmed 
                                                      ? (students.length > 0 ? (students.map(st => app.mitarbeit?.[st.id]?.[activeFach]?.[sem] || 0)).reduce((a,b)=>a+b,0)/students.length || 10 : 10)
                                                      : (mitarbeitSettings.thresholds?.[1] || 13);
                                                    // Bar is 100% at 2x the threshold for Note 1 (or average)
                                                    // This ensures it doesn't fill up too fast
                                                    const maxScale = target * 2;
                                                    return `${Math.min(100, (val / maxScale) * 100)}%`;
                                                  })()
                                                }}
                                              >
                                                {/* Animated shine effect */}
                                                <div className="absolute inset-0 bg-white/20 w-1/2 -skew-x-[45deg] animate-[pulse_3s_infinite]" />
                                              </div>
                                            </div>
                                          </div>

                                          <div className={`flex flex-col gap-0.5 shrink-0 items-center justify-center border-l border-stone-50 ${zoomLevel === 'compact' ? 'text-[0.95rem] w-8 pl-1.5' : zoomLevel === 'large' ? 'text-[1.625rem] w-14 pl-4' : 'text-[1.25rem] w-10 pl-3'}`}>
                                             <span className="text-[1.25rem] leading-normal animate-bounce" style={{ animationDuration: '3s' }}>
                                               {mitarbeitSettings.symbol === 'plus' ? '➕' : currentSymbol.icon}
                                             </span>
                                          </div>
                                       </div>

                                      <button 
                                        onClick={() => changeMI(s.id, 1)} 
                                        className={`shrink-0 border border-slate-200 bg-amber-50 flex items-center justify-center hover:bg-amber-100 hover:border-amber-300 active:scale-95 transition-all text-amber-700 font-black shadow-3xs ${zoomLevel === 'compact' ? 'w-7 h-7 rounded-md' : zoomLevel === 'large' ? 'w-11 h-11 rounded-xl' : 'w-9 h-9 rounded-lg'}`}
                                      >
                                        <Plus size={18} />
                                      </button>
                                   </div>
                                )}
                             </td>
                                <td className={`${zoomLevel === 'compact' ? 'px-3 py-1.5' : zoomLevel === 'large' ? 'px-8 py-5' : 'px-6 py-4'} text-center`}>
                                   <span className={`nb nb-${grade} ${zoomLevel === 'compact' ? '!scale-75 -my-1' : zoomLevel === 'large' ? '!scale-110 my-1' : ''} shadow-md`}>
                                      {grade}
                                   </span>
                                </td>
                             </tr>
                          );
                       })}
                       {false && (
                          <tr>
                             <td colSpan={4} className="px-6 py-5 text-center text-[0.75rem] leading-tight font-black text-amber-600 uppercase tracking-widest bg-amber-50/20 animate-pulse">
                                <span ref={sentinelRef} className="w-2 inline-block" />
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block mr-2" />
                                Lade weitere Schüler:innen... ({students.length - visibleLimit} verbleibend)
                             </td>
                          </tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      ) : activeView === 'hue' && !showWeights ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
          <div className="card !p-0 shadow-md border border-rose-100 bg-white rounded-3xl overflow-hidden">
            <div className="px-6 py-5 border-b border-rose-100 bg-rose-50/40 flex flex-col xl:flex-row justify-between xl:items-center gap-4">
               <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[1.125rem] font-black text-rose-950 tracking-tight flex items-center gap-2">
                      <span>📖</span>
                      <span>Hausübungen · {activeFach}</span>
                    </h3>
                    <span className={`text-[0.625rem] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${app.settings?.hueGewichten === false ? 'bg-amber-100 text-amber-900 border-amber-200' : 'bg-emerald-100 text-emerald-900 border-emerald-200'}`}>
                      {app.settings?.hueGewichten === false ? 'Nur Dokumentieren' : 'In Bewertung aktiv'}
                    </span>
                  </div>
                  <p className="text-[0.6875rem] text-rose-800/60 font-medium">
                    {app.settings?.hueGewichten === false
                      ? 'Dokumentations-Modus: Fehlende Hausübungen werden erfasst, führen aber zu keinem automatischen Noten- oder Punkteabzug.'
                      : `Bewertungs-Modus: Ausgangswert 100% minus ${app.settings?.huePercentDeduction !== undefined ? app.settings.huePercentDeduction : 5}% pro vergessene HÜ. Gewichtung: ${Math.round(cfg.g.hue * 100)}%.`}
                  </p>
               </div>
               
               <div className="flex flex-col xl:items-end gap-2.5">
                 <button
                   type="button"
                   onClick={() => setShowHueSettings(prev => !prev)}
                   aria-expanded={showHueSettings}
                   className="px-3.5 py-2 bg-white border border-rose-200 text-rose-800 rounded-xl text-[0.625rem] font-black uppercase tracking-wider shadow-3xs hover:bg-rose-50 active:scale-95 transition-all"
                 >
                   {showHueSettings ? 'HÜ-Einstellungen schließen' : 'HÜ-Einstellungen'}
                 </button>
                 {showHueSettings && (
                 <div className="flex flex-wrap items-center justify-end gap-2.5">
                 {/* Mode Toggle */}
                 <div className="flex bg-rose-100/70 p-1 rounded-xl">
                   <button
                     onClick={() => setApp(prev => ({
                       ...prev,
                       settings: {
                         ...prev.settings,
                         hueGewichten: true
                       }
                     }))}
                     className={`px-3 py-1.5 rounded-lg text-[0.625rem] font-black uppercase tracking-wider transition-all cursor-pointer ${app.settings?.hueGewichten !== false ? 'bg-white text-rose-900 shadow-xs' : 'text-rose-700 hover:text-rose-900'}`}
                   >
                     Bewerten
                   </button>
                   <button
                     onClick={() => setApp(prev => ({
                       ...prev,
                       settings: {
                         ...prev.settings,
                         hueGewichten: false,
                         hueWeight: 0
                       }
                     }))}
                     className={`px-3 py-1.5 rounded-lg text-[0.625rem] font-black uppercase tracking-wider transition-all cursor-pointer ${app.settings?.hueGewichten === false ? 'bg-white text-amber-900 shadow-xs' : 'text-rose-700 hover:text-rose-900'}`}
                   >
                     Nur Doku
                   </button>
                 </div>

                 {/* %-Deduction Config (if evaluating) */}
                 {app.settings?.hueGewichten !== false && (
                   <div className="flex items-center gap-1.5 bg-white border border-rose-200 rounded-xl px-2.5 py-1.5 shadow-3xs">
                     <span className="text-[0.5625rem] font-black text-rose-800 uppercase tracking-widest leading-none">
                       %-Abzug / HÜ:
                     </span>
                     <input
                       type="number"
                       min="0"
                       max="50"
                       className="w-10 text-center text-[0.6875rem] font-black bg-rose-50 border border-rose-200 rounded-md py-0.5 outline-none text-rose-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                       value={app.settings?.huePercentDeduction !== undefined ? app.settings.huePercentDeduction : 5}
                       onChange={(e) => {
                         const val = Math.max(0, parseInt(e.target.value) || 0);
                         setApp(prev => ({
                           ...prev,
                           settings: {
                             ...prev.settings,
                             huePercentDeduction: val
                           }
                         }));
                       }}
                     />
                     <span className="text-[0.625rem] font-black text-rose-700">%</span>
                   </div>
                 )}

                 {/* Mitarbeit Striche Deduction */}
                 <div className="flex items-center gap-1.5 bg-white border border-rose-200 rounded-xl px-2.5 py-1.5 shadow-3xs">
                   <span className="text-[0.5625rem] font-black text-rose-800 uppercase tracking-widest leading-none">
                     Strich-Abzug:
                   </span>
                   <div className="flex items-center gap-0.5">
                     <button
                       onClick={() => {
                         const currentVal = app.settings?.hueWeight !== undefined ? app.settings.hueWeight : 1;
                         const newVal = Math.max(0, currentVal - 0.5);
                         setApp(prev => ({
                           ...prev,
                           settings: {
                             ...prev.settings,
                             hueWeight: newVal
                           }
                         }));
                       }}
                       className="w-4 h-4 flex items-center justify-center bg-rose-50 border border-rose-200 text-rose-700 text-[0.6875rem] font-black rounded hover:bg-rose-100 active:scale-90"
                     >
                       -
                     </button>
                     <input
                       type="number"
                       step="0.5"
                       min="0"
                       max="10"
                       className="w-8 text-center text-[0.6875rem] font-black bg-rose-50 border border-rose-200 rounded py-0.5 outline-none text-rose-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                       value={app.settings?.hueWeight !== undefined ? app.settings.hueWeight : 1}
                       onChange={(e) => {
                         const val = Math.max(0, parseFloat(e.target.value) || 0);
                         setApp(prev => ({
                           ...prev,
                           settings: {
                             ...prev.settings,
                             hueWeight: val
                           }
                         }));
                       }}
                     />
                     <button
                       onClick={() => {
                         const currentVal = app.settings?.hueWeight !== undefined ? app.settings.hueWeight : 1;
                         const newVal = currentVal + 0.5;
                         setApp(prev => ({
                           ...prev,
                           settings: {
                             ...prev.settings,
                             hueWeight: newVal
                           }
                         }));
                       }}
                       className="w-4 h-4 flex items-center justify-center bg-rose-50 border border-rose-200 text-rose-700 text-[0.6875rem] font-black rounded hover:bg-rose-100 active:scale-90"
                     >
                       +
                     </button>
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-1.5 bg-white border border-rose-200 rounded-xl px-2.5 py-1.5 shadow-3xs text-[0.625rem] font-bold text-rose-800">
                   <span className="uppercase tracking-widest">Gewicht:</span>
                   <span className="font-black text-rose-600">
                     {Math.round(cfg.g.hue * 100)}%
                   </span>
                   <button
                     onClick={() => setShowWeights(true)}
                     className="text-[0.5625rem] font-extrabold text-white bg-rose-600 px-2 py-0.5 rounded-md hover:bg-rose-700 active:scale-95 transition-all uppercase tracking-widest ml-1 cursor-pointer"
                   >
                     Gewichten
                   </button>
                 </div>
                 </div>
                 )}
               </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50 text-[0.625rem] font-black uppercase tracking-widest text-slate-500 border-b border-slate-150">
                    <th className={`${zoomLevel === 'compact' ? 'px-3 py-2 text-[0.6rem]' : zoomLevel === 'large' ? 'px-8 py-5 text-[0.75rem]' : 'px-6 py-4 text-[0.625rem]'} text-left w-12`}>#</th>
                    <th className={`${zoomLevel === 'compact' ? 'px-3 py-2 text-[0.6rem]' : zoomLevel === 'large' ? 'px-8 py-5 text-[0.75rem]' : 'px-6 py-4 text-[0.625rem]'} text-left w-[220px]`}>Schüler:innen</th>
                    <th className={`${zoomLevel === 'compact' ? 'px-3 py-2 text-[0.6rem]' : zoomLevel === 'large' ? 'px-8 py-5 text-[0.75rem]' : 'px-6 py-4 text-[0.625rem]'} text-center w-[200px]`}>Fehlende HÜ</th>
                    <th className={`${zoomLevel === 'compact' ? 'px-3 py-2 text-[0.6rem]' : zoomLevel === 'large' ? 'px-8 py-5 text-[0.75rem]' : 'px-6 py-4 text-[0.625rem]'} text-left`}>Notiz / Grund / Nachgebracht</th>
                    <th className={`${zoomLevel === 'compact' ? 'px-3 py-2 text-[0.6rem]' : zoomLevel === 'large' ? 'px-8 py-5 text-[0.75rem]' : 'px-6 py-4 text-[0.625rem]'} text-center w-[180px]`}>Berechnete Auswirkung</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, idx) => {
                    const nd: Partial<GradeData> = app.noten?.[s.id]?.[activeFach]?.[sem] || { hue: 0, hueAnm: [] };
                    const val = nd.hue || 0;
                    const hasHueTracking = nd.hueErfasst === true || val > 0 || ((nd.hueAnm || []).length > 0);
                    const comment = (nd.hueAnm && nd.hueAnm.length > 0) ? nd.hueAnm[0] : '';
                    
                    const ded = app.settings?.huePercentDeduction !== undefined ? app.settings.huePercentDeduction : 5;
                    const pct = Math.max(0, 100 - val * ded);
                    let note = 1;
                    if (pct >= 87.5) note = 1;
                    else if (pct >= 75) note = 2;
                    else if (pct >= 62.5) note = 3;
                    else if (pct >= 50) note = 4;
                    else note = 5;

                    return (
                      <tr key={s.id} className="hover:bg-rose-50/20 transition-colors border-b border-slate-100 last:border-0">
                        <td className={`${zoomLevel === 'compact' ? 'px-3 py-1.5' : zoomLevel === 'large' ? 'px-8 py-5' : 'px-6 py-4'} text-[0.625rem] font-black text-slate-400`}>{idx + 1}</td>
                        <td className={`${zoomLevel === 'compact' ? 'px-3 py-1.5' : zoomLevel === 'large' ? 'px-8 py-5' : 'px-6 py-4'}`}>
                          <div className={`${zoomLevel === 'compact' ? 'text-[0.75rem]' : zoomLevel === 'large' ? 'text-[1rem]' : 'text-[0.875rem]'} font-bold text-slate-900`}>
                            {s.nachname} <span className="text-slate-500 font-semibold">{s.vorname}</span>
                          </div>
                        </td>
                        <td className={`${zoomLevel === 'compact' ? 'px-3 py-1.5' : zoomLevel === 'large' ? 'px-8 py-5' : 'px-6 py-4'}`}>
                           <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => changeHUE(s.id, -1)} 
                                className={`shrink-0 border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all text-slate-500 shadow-3xs ${zoomLevel === 'compact' ? 'w-6 h-6 rounded-md' : zoomLevel === 'large' ? 'w-10 h-10 rounded-xl' : 'w-8 h-8 rounded-lg'}`}
                              >
                                <Minus size={14} />
                              </button>
                              
                              <input
                                type="number"
                                min="0"
                                max="99"
                                value={hasHueTracking ? val : ''}
                                placeholder="0"
                                onChange={(e) => setHUEVal(s.id, e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                                onKeyDown={(event) => handleQuickEntryKey(event, 'hue', idx)}
                                data-quick-entry="hue"
                                data-student-index={idx}
                                className={`text-center font-black bg-rose-50/70 border border-rose-200 rounded-xl py-1 text-rose-700 outline-none focus:bg-white focus:border-rose-400 shadow-3xs ${zoomLevel === 'compact' ? 'w-12 text-[0.8125rem]' : zoomLevel === 'large' ? 'w-20 text-[1.25rem]' : 'w-16 text-[1rem]'}`}
                              />

                              <button 
                                onClick={() => changeHUE(s.id, 1)} 
                                className={`shrink-0 border border-rose-300 bg-rose-50 flex items-center justify-center hover:bg-rose-100 active:scale-95 transition-all text-rose-700 shadow-3xs font-black ${zoomLevel === 'compact' ? 'w-6 h-6 rounded-md' : zoomLevel === 'large' ? 'w-10 h-10 rounded-xl' : 'w-8 h-8 rounded-lg'}`}
                              >
                                <Plus size={16} />
                              </button>
                           </div>
                        </td>
                        <td className={`${zoomLevel === 'compact' ? 'px-3 py-1.5' : zoomLevel === 'large' ? 'px-8 py-5' : 'px-6 py-4'}`}>
                          <input
                            type="text"
                            value={comment}
                            onChange={(e) => setHUEComment(s.id, e.target.value)}
                            placeholder="Optionale Bemerkung zur HÜ..."
                            className={`w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-150 hover:border-slate-250 focus:border-rose-300 rounded-xl px-3 py-1.5 text-slate-700 outline-none transition-all ${zoomLevel === 'compact' ? 'text-[0.7rem]' : zoomLevel === 'large' ? 'text-[0.875rem]' : 'text-[0.75rem]'}`}
                          />
                        </td>
                        <td className={`${zoomLevel === 'compact' ? 'px-3 py-1.5' : zoomLevel === 'large' ? 'px-8 py-5' : 'px-6 py-4'} text-center`}>
                          {app.settings?.hueGewichten === false ? (
                            <span className="text-[0.625rem] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
                              Nur Dokumentiert
                            </span>
                          ) : (
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[0.75rem] font-black tabular-nums ${pct >= 75 ? 'text-emerald-700' : pct >= 50 ? 'text-amber-700' : 'text-rose-700'}`}>
                                  {pct}%
                                </span>
                                <span className={`text-[0.5625rem] font-black uppercase px-1.5 py-0.2 rounded ${note === 1 ? 'bg-emerald-100 text-emerald-800' : note === 2 ? 'bg-blue-100 text-blue-800' : note === 3 ? 'bg-amber-100 text-amber-800' : note === 4 ? 'bg-orange-100 text-orange-800' : 'bg-rose-100 text-rose-800'}`}>
                                  Note {note}
                                </span>
                              </div>
                              {val > 0 && (
                                <span className="text-[0.5625rem] text-rose-600/70 font-semibold">
                                  -{val * ded}% Abzug
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeView === 'verhalten' && !showWeights ? (
        <div className="space-y-8 animate-in fade-in duration-300">
           <BehaviorSettings />
           {/* Class behavior statistics card */}
           {(() => {
             const startDate = app.settings?.behaviorStartDate;
             const filteredLogs = (app.statusLog || []).filter(l => !startDate || l.datum >= startDate);
             const stages = app.behavior_stages || [
                { id: '1', label: 'Super', color: '#10b981', icon: '🌟' },
                { id: '2', label: 'Gut', color: '#3b82f6', icon: '😊' },
                { id: '3', label: 'OK', color: '#94a3b8', icon: '😐' },
                { id: '4', label: 'Ermahnung', color: '#f59e0b', icon: '⚠️' },
                { id: '5', label: 'Inakzeptabel', color: '#ef4444', icon: '🚫' }
             ];

             // 1. Current daily distribution
             const currentStatuses = app.schueler.map(s => app.behavior_status?.[s.id] || app.behavior_default_stage_id || stages[0]?.id);
             const currentTotal = currentStatuses.length;
             
             // 2. Compute dynamic stats for each stage
             const chartData = stages.map((stage, idx) => {
                // For current
                const currentCount = currentStatuses.filter(sid => sid === stage.id).length;
                const currentPercentage = currentTotal > 0 ? (currentCount / currentTotal) * 100 : 0;

                // For historical
                const historyCount = filteredLogs.filter(l => l.iconId === stage.id).length;
                const historyPercentage = filteredLogs.length > 0 ? (historyCount / filteredLogs.length) * 100 : 0;

                return {
                   name: `${stage.icon} ${stage.label}`,
                   label: stage.label,
                   icon: stage.icon,
                   color: stage.color,
                   value: behaviorStatTab === 'aktuell' ? currentCount : historyCount,
                   percentage: Number((behaviorStatTab === 'aktuell' ? currentPercentage : historyPercentage).toFixed(1)),
                   currentCount,
                   historyCount
                };
             });

             // Calculate averages
             // Lower index = better, which perfectly aligns with German/Austrian grades 1-5
             let currentAvgGrade = 0;
             let currentPointsCount = 0;
             currentStatuses.forEach(sid => {
                const sIdx = stages.findIndex(st => st.id === sid);
                if (sIdx !== -1) {
                   currentAvgGrade += (sIdx + 1);
                   currentPointsCount++;
                }
             });
             const currentAvgFormatted = currentPointsCount > 0 ? (currentAvgGrade / currentPointsCount).toFixed(2) : '—';

             let historyAvgGrade = 0;
             let historyPointsCount = 0;
             filteredLogs.forEach(l => {
                const sIdx = stages.findIndex(st => st.id === l.iconId);
                if (sIdx !== -1) {
                   historyAvgGrade += (sIdx + 1);
                   historyPointsCount++;
                }
             });
             const historyAvgFormatted = historyPointsCount > 0 ? (historyAvgGrade / historyPointsCount).toFixed(2) : '—';

             // Mood Indicator: percentage of excellent/good rankings
             const currentPositiveCount = currentStatuses.filter(sid => {
                const sIdx = stages.findIndex(st => st.id === sid);
                return sIdx === 0 || sIdx === 1;
             }).length;
             const currentPositivePct = currentTotal > 0 ? Math.round((currentPositiveCount / currentTotal) * 100) : 0;

             const historyPositiveCount = filteredLogs.filter(l => {
                const sIdx = stages.findIndex(st => st.id === l.iconId);
                return sIdx === 0 || sIdx === 1;
             }).length;
             const historyPositivePct = filteredLogs.length > 0 ? Math.round((historyPositiveCount / filteredLogs.length) * 100) : 0;

             const displayedAvg = behaviorStatTab === 'aktuell' ? currentAvgFormatted : historyAvgFormatted;
             const displayedPositivePct = behaviorStatTab === 'aktuell' ? currentPositivePct : historyPositivePct;
             const displayedTotalCount = behaviorStatTab === 'aktuell' ? currentTotal : filteredLogs.length;

             return (
                <div id="class-behavior-statistics" className="bg-white rounded-[2.5rem] border border-stone-200/60 p-8 shadow-sm space-y-6 col-span-1 lg:col-span-2 animate-in fade-in slide-in-from-bottom-3 duration-300 print:break-inside-avoid print:shadow-none print:border print:border-gray-300">
                   <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                      <div>
                         <h4 className="text-[0.8125rem] font-black uppercase tracking-wider text-slate-900 print:break-after-avoid">Klassendurchschnitt & Verhaltens-Diagramm</h4>
                         <p className="text-[0.75rem] leading-tight text-slate-400 mt-0.5 print:break-after-avoid">Visuelle Übersicht über das Verhalten der Klasse im Überblick</p>
                      </div>

                      {/* View Switch Tab */}
                      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0 print:hidden">
                         <button
                           id="stat-tab-aktuell"
                           onClick={() => setBehaviorStatTab('aktuell')}
                           className={`px-4 py-2 rounded-lg text-[0.625rem] font-black uppercase tracking-wider transition-all select-none cursor-pointer ${behaviorStatTab === 'aktuell' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                         >
                            Aktuelle Tages-Ränge
                         </button>
                         <button
                           id="stat-tab-chronik"
                           onClick={() => setBehaviorStatTab('chronik')}
                           className={`px-4 py-2 rounded-lg text-[0.625rem] font-black uppercase tracking-wider transition-all select-none cursor-pointer ${behaviorStatTab === 'chronik' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                         >
                            Historischer Verlauf
                         </button>
                      </div>
                   </div>

                   {/* Stats Grid */}
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/[0.01] border border-emerald-500/10 rounded-2xl p-5 flex flex-col justify-between">
                         <div className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-400">Verhalten Klassendurchschnitt</div>
                         <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-4xl font-black text-slate-900 tracking-tight">{displayedAvg}</span>
                            <span className="text-[0.75rem] leading-tight font-bold text-slate-400">Schnitt</span>
                         </div>
                         <div className="text-[0.5625rem] font-bold text-slate-400 mt-2 leading-relaxed">
                            {behaviorStatTab === 'aktuell' ? 'Ränge-Schnitt aller Kinder' : `Durchschnitt über ${displayedTotalCount} Verhaltensmeldungen`} (1.0 = bester, {(stages || []).length}.0 = geringster)
                         </div>
                      </div>

                      <div className="bg-gradient-to-br from-indigo-500/5 to-indigo-500/[0.01] border border-indigo-500/10 rounded-2xl p-5 flex flex-col justify-between">
                         <div className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-400">Positive Feedback Quote</div>
                         <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-4xl font-black text-indigo-600 tracking-tight">{displayedPositivePct}%</span>
                            <span className="text-[0.75rem] leading-tight font-bold text-indigo-400">Positiv</span>
                         </div>
                         <div className="text-[0.5625rem] font-bold text-slate-400 mt-2 leading-relaxed">
                            Anteil der Beststufen &apos;{stages[0]?.label || 'Super'}&apos; &amp; &apos;{stages[1]?.label || 'Gut'}&apos;
                         </div>
                      </div>

                      <div className="bg-gradient-to-br from-amber-500/5 to-amber-500/[0.01] border border-amber-500/10 rounded-2xl p-5 flex flex-col justify-between">
                         <div className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-400">Auswertungen Gesamt</div>
                         <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-4xl font-black text-amber-600 tracking-tight">{displayedTotalCount}</span>
                            <span className="text-[0.75rem] leading-tight font-bold text-amber-400">{behaviorStatTab === 'aktuell' ? 'Kinder' : 'Logs'}</span>
                         </div>
                         <div className="text-[0.5625rem] font-bold text-slate-400 mt-2 leading-relaxed">
                            {behaviorStatTab === 'aktuell' ? 'Aktive Kinder heute auf dem Board' : 'Einträge im gesetzten Verlauf'}
                         </div>
                      </div>
                   </div>

                   {/* Custom Recharts bar chart */}
                   <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                         <span className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">
                            Häufigkeitsverteilung der Feedback-Stufen
                         </span>
                         <span className="text-[0.75rem] leading-tight font-semibold text-slate-500">
                            {behaviorStatTab === 'aktuell' ? 'Einheit: Anzahl Schüler' : 'Einheit: Anzahl Einträge'}
                         </span>
                      </div>
                      <div className="h-72 w-full border border-slate-100 rounded-3xl p-4 bg-slate-50/50">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                              data={chartData}
                              margin={{ top: 20, right: 10, left: -20, bottom: 20 }}
                            >
                               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                               <XAxis 
                                 dataKey="name" 
                                 axisLine={false} 
                                 tickLine={false} 
                                 tick={{ fontSize: 11, fontWeight: 800, fill: '#475569' }} 
                               />
                               <YAxis 
                                 axisLine={false} 
                                 tickLine={false} 
                                 tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                                 allowDecimals={false}
                               />
                               <Tooltip 
                                 cursor={{ fill: '#f1f5f9', opacity: 0.6 }}
                                 content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                       const data = payload[0].payload;
                                       return (
                                          <div className="bg-white p-4 border border-stone-200/80 rounded-2xl shadow-xl space-y-1">
                                             <div className="flex items-center gap-2 text-[0.875rem] leading-snug font-black text-slate-900">
                                                <span>{data.icon}</span>
                                                <span>{data.label}</span>
                                             </div>
                                             <div className="text-[0.75rem] leading-tight font-bold text-slate-500">
                                                Anzahl: <span className="font-extrabold text-slate-800">{data.value}</span>
                                             </div>
                                             <div className="text-[0.625rem] font-black text-emerald-600">
                                                Anteil: {data.percentage}% der Klasse
                                             </div>
                                          </div>
                                       );
                                    }
                                    return null;
                                 }}
                               />
                               <Bar 
                                 dataKey="value" 
                                 radius={[8, 8, 0, 0]}
                                 maxBarSize={45}
                               >
                                  {chartData.map((entry, index) => (
                                     <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                               </Bar>
                            </BarChart>
                         </ResponsiveContainer>
                      </div>
                   </div>

                   {filteredLogs.length === 0 && behaviorStatTab === 'chronik' && (
                      <div className="p-8 text-center bg-amber-50 border border-amber-100/50 rounded-2xl text-[0.6875rem] font-bold text-amber-700/80">
                         Noch kein historischer Verlauf vorhanden. Vergib Ränge im Cockpit oder Unterrichtsmodus, um hier automatische Verlaufscharts des Klassendurchschnitts zu generieren!
                      </div>
                   )}
                </div>
             );
          })()}

          {/* INDIVIDUELLE SCHÜLER-STATISTIKEN & BADGES */}
          <div id="individual-student-behavior-badges" className="bg-white rounded-[2.5rem] border border-stone-200/60 p-8 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300 print:break-inside-avoid print:shadow-none print:border print:border-gray-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
               <div>
                  <h4 className="text-[0.8125rem] font-black uppercase tracking-wider text-slate-900">
                     Individuelle Schüler-Statistiken &amp; Verhaltens-Badges
                  </h4>
                  <p className="text-[0.75rem] leading-tight text-slate-400 mt-0.5 font-bold">
                     Fächerunabhängiges Gesamtverhalten (Es gibt nur ein insgesamtes Verhalten) · Auswertung der Feedback-Einträge, Strähnen und Emojis für jedes Kind (berechnet aus Logs)
                  </p>
               </div>
               {/* Search input to filter students */}
               <div className="relative w-full sm:w-64">
                  <input
                    id="behavior-student-search-input"
                    type="text"
                    placeholder="Kinder filtern..."
                    value={behaviorSearchTerm}
                    onChange={(e) => setBehaviorSearchTerm(e.target.value)}
                    className="w-full text-[0.75rem] leading-tight bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-3 text-slate-800 outline-none focus:border-emerald-500 font-bold transition-all placeholder:text-slate-400 shadow-inner"
                  />
               </div>
            </div>

            {/* Student Behavior & Badges Grid or Table */}
            <div className="overflow-x-auto no-scrollbar">
               <table className="w-full border-collapse">
                  <thead>
                     <tr className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 pb-3">
                        <th className="px-4 py-3 text-left">Kind</th>
                        <th className="px-4 py-3 text-center">Tages-Status</th>
                        <th className="px-4 py-3 text-center">Historischer Verlauf (Letzte 5)</th>
                        <th className="px-4 py-3 text-center">Auswertungen</th>
                        <th className="px-4 py-3 text-center">Ø Rang</th>
                        <th className="px-4 py-3 text-center">Positiv-Quote</th>
                        <th className="px-4 py-3 text-center">Strähne</th>
                        <th className="px-4 py-3 text-right">Vergebene Badges</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {(() => {
                        const stages = behaviorStages;
                        const defaultStageId = app.behavior_default_stage_id || stages[0]?.id;
                        const startDate = app.settings?.behaviorStartDate;
                        
                        const searchLower = behaviorSearchTerm.toLowerCase();
                        const filteredStudents = (app.schueler || []).filter(s => 
                           `${s.vorname} ${s.nachname}`.toLowerCase().includes(searchLower)
                        );

                        if (filteredStudents.length === 0) {
                           return (
                              <tr>
                                 <td colSpan={8} className="py-12 text-center text-[0.75rem] leading-tight text-slate-400 font-bold">
                                    Keine Kinder unter dieser Suche gefunden.
                                 </td>
                              </tr>
                           );
                        }

                        return filteredStudents.map(s => {
                           // Current status of the student
                           const currentStatusId = app.behavior_status?.[s.id] || defaultStageId;
                           const currentStageObj = stages.find(st => st.id === currentStatusId) || stages[0] || { label: 'Super', color: '#10b981', icon: '🌟' };

                           // History logs for current student
                           const studentLogs = (app.statusLog || [])
                             .filter(l => l.schuelerId === s.id && (!startDate || l.datum >= startDate))
                             .sort((a, b) => b.timestamp - a.timestamp); // latest first

                           const totalCount = studentLogs.length;

                           // Average behavior grade/rank
                           let sumRank = 0;
                           let validRankCount = 0;
                           studentLogs.forEach(log => {
                              const sIndex = stages.findIndex(st => st.id === log.iconId);
                              if (sIndex !== -1) {
                                 sumRank += (sIndex + 1);
                                 validRankCount++;
                              }
                           });
                           const averageRank = validRankCount > 0 ? (sumRank / validRankCount).toFixed(2) : '—';

                           // Positive feedback percentage
                           const positiveLogsCount = studentLogs.filter(log => {
                              const sIndex = stages.findIndex(st => st.id === log.iconId);
                              return sIndex === 0 || sIndex === 1; // Super and Gut indicators
                           }).length;
                           const positivePct = totalCount > 0 ? Math.round((positiveLogsCount / totalCount) * 100) : 100;

                           // Negative feedback indicators
                           const negativeLogsCount = studentLogs.filter(log => {
                              const sIndex = stages.findIndex(st => st.id === log.iconId);
                              return sIndex !== -1 && sIndex >= stages.length - 2; // last two ranks
                           }).length;

                           // Calculate consecutive positive day streak
                           let streak = 0;
                           let streakValid = true;
                           for (let i = 0; i < studentLogs.length; i++) {
                              const sIndex = stages.findIndex(st => st.id === studentLogs[i].iconId);
                              if (sIndex === 0 || sIndex === 1) {
                                 if (streakValid) streak++;
                              } else {
                                 streakValid = false;
                                 break;
                              }
                           }

                           // Dynamic Badge Allocation based on behavior log science
                           const badges: { text: string; details: string; emoji: string; styling: string }[] = [];

                           // 1. Streak Badge
                           if (streak >= 5) {
                              badges.push({
                                 text: 'Mustergültig',
                                 details: `${streak} positive Einträge am Stück! Höchste Vorbildfunktion.`,
                                 emoji: '🔥',
                                 styling: 'bg-orange-50 text-orange-600 border-orange-200'
                              });
                           } else if (streak >= 3) {
                              badges.push({
                                 text: 'Erfolgs-Strähne',
                                 details: `Aktuell ${streak} gute Schultage in Folge absolviert!`,
                                 emoji: '⚡',
                                 styling: 'bg-amber-50 text-amber-600 border-amber-200'
                              });
                           }

                           // 2. High Stability / No negative feedback Badge
                           if (totalCount >= 4 && negativeLogsCount === 0) {
                              badges.push({
                                 text: 'Stabilitäts-Anker',
                                 details: 'Hervorragende Selbstkontrolle! Keinerlei Ermahnungen verzeichnet.',
                                 emoji: '🛡️',
                                 styling: 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              });
                           }

                           // 3. Outstanding Performance Badges
                           if (totalCount >= 3 && positivePct === 100) {
                              badges.push({
                                 text: 'Verhaltens-Elite',
                                 details: 'Statistisch zu 100% vorbildlich im gesamten Auswertungszeitraum.',
                                 emoji: '👑',
                                 styling: 'bg-indigo-50 text-indigo-600 border-indigo-200'
                              });
                           } else if (positiveLogsCount >= 5) {
                              badges.push({
                                 text: 'Fleißiges Bienchen',
                                 details: `Bereits ${positiveLogsCount} positive Feedback-Meldungen gesammelt.`,
                                 emoji: '🐝',
                                 styling: 'bg-yellow-50 text-yellow-600 border-yellow-250'
                              });
                           }

                           // 4. Trend Aufsteiger Badge (improvement over last entries)
                           if (studentLogs.length >= 3) {
                              const lastThreeIndices = studentLogs.slice(0, 3).map(l => stages.findIndex(st => st.id === l.iconId));
                              if (lastThreeIndices[0] < lastThreeIndices[1] && lastThreeIndices[1] < lastThreeIndices[2]) {
                                 badges.push({
                                    text: 'Aufsteiger',
                                    details: 'Spürbarer positiver Trend! Das Verhalten wird von Tag zu Tag besser.',
                                    emoji: '📈',
                                    styling: 'bg-blue-50 text-blue-600 border-blue-200'
                                 });
                              }
                           }

                           // 5. Sunshine award for special Super-status counts
                           const superCount = studentLogs.filter(log => {
                              const sIndex = stages.findIndex(st => st.id === log.iconId);
                              return sIndex === 0;
                           }).length;
                           if (superCount >= 3) {
                              badges.push({
                                 text: 'Sonnenschein',
                                 details: `Hat bereits ${superCount} mal die allerhöchste Feedback-Stufe 'Super' erreicht.`,
                                 emoji: '☀️',
                                 styling: 'bg-rose-50 text-rose-600 border-rose-200'
                              });
                           }

                           // Default companion badge
                           if (badges.length === 0) {
                              badges.push({
                                 text: 'Teamplayer',
                                 details: 'Verhält sich kooperativ und leistet einen wertvollen Teil zum Klassenklima.',
                                 emoji: '🤝',
                                 styling: 'bg-slate-50 text-slate-500 border-slate-200'
                              });
                           }

                           // Last 5 events (reverse to read left-to-right chronic)
                           const lastFiveEvents = studentLogs.slice(0, 5).reverse();

                           return (
                              <tr key={s.id} className="group hover:bg-slate-50/40 transition-all">
                                 {/* Student Name */}
                                 <td className="px-4 py-4">
                                    <div className="flex flex-col">
                                       <span className="text-[0.875rem] leading-snug font-black text-slate-900 tracking-tight">
                                          {s.nachname} <span className="font-bold text-slate-450 text-slate-500">{s.vorname}</span>
                                       </span>
                                       {(s.spf || s.espf) && (
                                          <span className="text-[0.5rem] font-black uppercase text-purple-600 tracking-wider mt-0.5">
                                             SPF / ESPF
                                          </span>
                                       )}
                                    </div>
                                 </td>

                                 {/* Todays Active Rank */}
                                 <td className="px-4 py-4 text-center">
                                    <div 
                                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[0.6875rem] font-black tracking-tight"
                                      style={{
                                         backgroundColor: `${currentStageObj.color}10`,
                                         borderColor: `${currentStageObj.color}30`,
                                         color: currentStageObj.color
                                      }}
                                    >
                                       <span>{currentStageObj.icon}</span>
                                       <span className="text-[0.5625rem] uppercase font-black">{currentStageObj.label}</span>
                                    </div>
                                 </td>

                                 {/* Mini Sparkline Timeline History */}
                                 <td className="px-4 py-4">
                                    <div className="flex items-center justify-center gap-1.5">
                                       {lastFiveEvents.length === 0 ? (
                                          <span className="text-[0.59375rem] text-slate-350 italic font-semibold">keine Einträge</span>
                                       ) : (
                                          lastFiveEvents.map((log) => {
                                             const logStageObj = stages.find(x => x.id === log.iconId) || stages[0];
                                             return (
                                                <span
                                                  key={log.id}
                                                  className="w-5.5 h-5.5 rounded-lg flex items-center justify-center text-[0.625rem] border cursor-help transition-all hover:scale-125"
                                                  style={{
                                                     backgroundColor: `${logStageObj.color}12`,
                                                     borderColor: `${logStageObj.color}35`,
                                                     color: logStageObj.color
                                                  }}
                                                  title={`${new Date(log.timestamp).toLocaleDateString('de-DE')}: ${logStageObj.label}`}
                                                >
                                                   {logStageObj.icon}
                                                </span>
                                             );
                                          })
                                        )}
                                    </div>
                                 </td>

                                 {/* Total Log Actions Count */}
                                 <td className="px-4 py-4 text-center">
                                    <span className="text-[0.75rem] leading-tight font-extrabold text-slate-500 tabular-nums">
                                       {totalCount} Log{totalCount !== 1 && 's'}
                                    </span>
                                 </td>

                                 {/* Average Rank */}
                                 <td className="px-4 py-4 text-center">
                                    <span className="text-[0.75rem] leading-tight font-black text-slate-800 tabular-nums">
                                       {averageRank}
                                    </span>
                                 </td>

                                 {/* Positive Feedback Percentage */}
                                 <td className="px-4 py-4 text-center">
                                    <div className="flex flex-col items-center">
                                       <span className={`text-[0.75rem] leading-tight font-black tabular-nums ${positivePct >= 80 ? 'text-emerald-600' : positivePct >= 50 ? 'text-indigo-600' : 'text-slate-500'}`}>
                                          {positivePct}%
                                       </span>
                                       <div className="w-12 h-1 bg-slate-100 rounded-full  mt-1">
                                          <div 
                                            className={`h-full rounded-full ${positivePct >= 80 ? 'bg-emerald-500' : positivePct >= 50 ? 'bg-indigo-500' : 'bg-slate-400'}`}
                                            style={{ width: `${positivePct}%` }}
                                          />
                                       </div>
                                    </div>
                                 </td>

                                 {/* Current Positive Streak */}
                                 <td className="px-4 py-4 text-center">
                                    {streak >= 3 ? (
                                       <span className="inline-flex items-center gap-0.5 px-2.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-[0.625rem] font-black tracking-tight shadow-sm">
                                          🔥 {streak}
                                       </span>
                                    ) : streak > 0 ? (
                                       <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-full text-[0.625rem] font-bold">
                                          👍 {streak}
                                       </span>
                                    ) : (
                                       <span className="text-slate-350 text-[0.625rem] font-bold">—</span>
                                    )}
                                 </td>

                                 {/* Badges Issued */}
                                 <td className="px-4 py-4">
                                    <div className="flex flex-wrap gap-1.5 justify-end">
                                       {badges.map((b, bIdx) => (
                                          <span
                                            key={bIdx}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[0.5625rem] font-black border uppercase tracking-wider shadow-xs cursor-help transition-all hover:scale-105 active:scale-95 ${b.styling}`}
                                            title={b.details}
                                          >
                                             <span>{b.emoji}</span>
                                             <span>{b.text}</span>
                                          </span>
                                       ))}
                                    </div>
                                 </td>
                              </tr>
                           );
                        });
                     })()}
                  </tbody>
               </table>
            </div>
          </div>

          {/* Emoji icon picker overlay */}
          <AnimatePresence>
             {showIconPicker !== null && (
                <>
                   <motion.div 
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     onClick={() => setShowIconPicker(null)}
                     className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[1000] cursor-pointer"
                   />
                   <motion.div 
                     initial={{ opacity: 0, scale: 0.9, y: 30 }}
                     animate={{ opacity: 1, scale: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.9, y: 30 }}
                     className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-[2.5rem] p-8 z-[1001] shadow-2xl border border-slate-200"
                   >
                      <div className="text-center mb-6">
                         <h4 className="text-[1.25rem] leading-normal font-black text-slate-900 tracking-tight">Emoji für Ränge wählen</h4>
                         <p className="text-[0.75rem] leading-tight font-bold text-slate-400 mt-1 uppercase tracking-wider">
                            Bereich: {(app.behavior_stages || [
                              { id: '1', label: 'Super', color: '#10b981', icon: '🌟' }
                            ])[showIconPicker]?.label}
                         </p>
                      </div>

                      <div className="grid grid-cols-6 sm:grid-cols-8 gap-3 max-h-[300px] overflow-y-auto pr-1 pb-4 custom-scrollbar">
                         {commonIcons.map(icon => (
                            <button
                              key={icon}
                              onClick={() => {
                                 const currentStages = app.behavior_stages || [
                                    { id: '1', label: 'Super', color: '#10b981', icon: '🌟' },
                                    { id: '2', label: 'Gut', color: '#3b82f6', icon: '😊' },
                                    { id: '3', label: 'OK', color: '#94a3b8', icon: '😐' },
                                    { id: '4', label: 'Ermahnung', color: '#f59e0b', icon: '⚠️' },
                                    { id: '5', label: 'Inakzeptabel', color: '#ef4444', icon: '🚫' }
                                 ];
                                 const newStages = [...currentStages];
                                 newStages[showIconPicker].icon = icon;
                                 setApp(prev => ({ ...prev, behavior_stages: newStages }));
                                 setShowIconPicker(null);
                              }}
                              className="aspect-square flex items-center justify-center text-[1.5rem] leading-normal hover:bg-slate-50 hover:scale-125 active:scale-95 rounded-xl transition-all cursor-pointer"
                            >
                               {icon}
                            </button>
                         ))}
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                         <button
                           onClick={() => setShowIconPicker(null)}
                           className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-wider cursor-pointer transition-colors"
                         >
                            Schließen
                         </button>
                      </div>
                   </motion.div>
                </>
             )}
          </AnimatePresence>
        </div>
      ) : showWeights ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 print:hidden">
          <WeightSettings onBack={() => setShowWeights(false)} />
        </div>
      ) : (
        <div className="contents">
          {pendingDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center gap-3 text-red-600 mb-4">
                  <div className="bg-red-50 p-2 rounded-full">
                    <Info size={20} />
                  </div>
                  <h3 className="text-[1.125rem] leading-normal font-bold">Spalte entfernen</h3>
                </div>
                <p className="text-text-secondary mb-6 text-[0.875rem] leading-snug">
                  Möchtest du wirklich die letzte Spalte (<span className="font-bold text-text-primary">{pendingDelete.label}</span>) entfernen? 
                  Bereits eingegebene Noten in dieser Spalte gehen verloren.
                </p>
                <div className="flex gap-3 justify-end">
                  <button 
                    onClick={() => setPendingDelete(null)}
                    className="btn border border-border bg-white"
                  >
                    Abbrechen
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="btn bg-red-600 text-white hover:bg-red-700"
                  >
                    Jetzt entfernen
                  </button>
                </div>
              </div>
            </div>
          )}

          {showStats && stats && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 animate-in fade-in slide-in-from-top-4 duration-300 print:hidden mb-6">
              <div className="card bg-white flex flex-col p-6 border border-slate-200 shadow-sm rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
                <span className="text-[0.6875rem] font-black uppercase tracking-widest text-slate-400 mb-1">Klassendurchschnitt</span>
                <span className="text-5xl font-black text-slate-900 tracking-tight">{stats.avg.toFixed(2)}</span>
                
                <div className="mt-4 pt-4 border-t border-slate-100 flex-1 flex flex-col justify-between">
                   <div>
                     <div className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                       <span>Spezial-Filter</span>
                       <span className="text-emerald-600 font-extrabold">Statistik</span>
                     </div>
                     <label className="flex items-center gap-3 cursor-pointer group select-none">
                        <div 
                          onClick={() => {
                            setIncludeSpecialNeedsInStats(!includeSpecialNeedsInStats);
                          }}
                          className={`w-9 h-5 rounded-full transition-all relative ${includeSpecialNeedsInStats ? 'bg-emerald-600' : 'bg-slate-300'}`}
                        >
                           <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-xs ${includeSpecialNeedsInStats ? 'left-[1.125rem]' : 'left-0.5'}`} />
                        </div>
                        <span className="text-[0.6875rem] font-bold text-slate-600 group-hover:text-slate-900 transition-colors">SPF/ESPF einbeziehen</span>
                     </label>
                   </div>
                   
                   <p className="text-[0.625rem] text-slate-450 font-bold mt-5 leading-normal">
                     Schnitt berechnet aus <span className="text-slate-800 font-black">{stats.total}</span> von <span className="text-slate-800 font-black">{stats.maxStudents}</span> aktiven Schüler:innen.
                   </p>
                </div>
              </div>
              
              <div className="card bg-white lg:col-span-3 p-6 border border-slate-200 shadow-sm rounded-2xl flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-700 to-slate-950" />
                 <div className="flex items-center justify-between mb-4">
                   <span className="text-[0.625rem] font-bold uppercase tracking-widest text-slate-400">Verteilungsdiagramm</span>
                   <div className="flex gap-2">
                     {[1,2,3,4,5].map(n => (
                       <span key={n} className={`text-[0.625rem] px-2.5 py-1 rounded-xl border font-bold flex items-center gap-1.5 ${n === 1 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : n === 2 ? 'bg-blue-50 text-blue-700 border-blue-100' : n === 3 ? 'bg-amber-50 text-amber-700 border-amber-100' : n === 4 ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                         <span className="opacity-90">Note {n}:</span> <span className="font-black">{stats.distribution[n as 1|2|3|4|5] || 0}</span>
                       </span>
                     ))}
                   </div>
                 </div>
                 
                 <div className="h-44 w-full bg-slate-50/50 rounded-2xl p-2 border border-slate-100 shadow-inner">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={[1, 2, 3, 4, 5].map(n => ({
                          name: `Note ${n}`,
                          count: stats.distribution[n as 1|2|3|4|5] || 0,
                          color: n === 1 ? '#10b981' : n === 2 ? '#3b82f6' : n === 3 ? '#f59e0b' : n === 4 ? '#f97316' : '#ef4444'
                        }))}
                        margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                          allowDecimals={false}
                        />
                        <Tooltip 
                          cursor={{ fill: '#f1f5f9', radius: 4, opacity: 0.5 }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white p-3 border border-slate-200 rounded-xl shadow-xl space-y-1">
                                  <div className="flex items-center gap-2 text-[0.75rem] font-black text-slate-800">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                                    <span>{data.name}</span>
                                  </div>
                                  <div className="text-[0.625rem] font-bold text-slate-500">
                                    Anzahl: <span className="font-black text-slate-900">{data.count} Schüler</span>
                                  </div>
                                  <div className="text-[0.5625rem] font-bold text-emerald-600">
                                    {((data.count / stats.total) * 100).toFixed(0)}% der Klasse
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar 
                          dataKey="count" 
                          radius={[6, 6, 2, 2]}
                          maxBarSize={45}
                        >
                          {[1, 2, 3, 4, 5].map((grade, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={grade === 1 ? '#10b981' : grade === 2 ? '#3b82f6' : grade === 3 ? '#f59e0b' : grade === 4 ? '#f97316' : '#ef4444'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
              </div>
            </div>
          )}

          {/* Real-time Grade Validation and Outlier Helper */}
          {activeView === 'noten' && getGradeValidationErrors().length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-amber-50/70 to-orange-50/30 border border-amber-200 rounded-2xl p-5 mb-6 space-y-4 shadow-3xs print:hidden"
            >
              <div className="flex items-center gap-2 text-amber-800 font-extrabold tracking-tight leading-none">
                <AlertCircle size={16} className="text-amber-600 animate-pulse shrink-0" />
                <span className="text-[0.6875rem] uppercase tracking-wider">Tippfehler-Schutz &amp; Noten-Validierung ({getGradeValidationErrors().length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {getGradeValidationErrors().map((err) => (
                  <div key={err.id} className="bg-white border border-amber-150/80 p-4 rounded-xl flex flex-col justify-between gap-3 shadow-3xs hover:border-amber-250 transition-colors">
                    <p className="text-[0.75rem] font-bold text-slate-700 leading-normal">{err.message}</p>
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {err.fixOptions.map((opt, oIdx) => (
                        <button
                          key={oIdx}
                          onClick={opt.action}
                          className="text-[0.625rem] font-black uppercase tracking-wider bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg transition-all cursor-pointer active:scale-95 flex items-center gap-1 shadow-sm shadow-amber-600/10"
                        >
                          ⚡ {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <div className="card !p-0 shadow-md border border-slate-200 bg-white rounded-2xl overflow-hidden print:shadow-none print:border print:border-gray-300">
            <div className="px-6 py-4.5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <h3 className="text-[1.125rem] font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>📊</span>
                  <span>{activeFach}</span>
                </h3>
                <div className="flex flex-wrap gap-1.5 items-center">
                   {cfg.sa && <span className="text-[0.5625rem] bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full border border-sky-100 font-black uppercase tracking-wider">{getNotenLabel(app, activeFach, 'sa', 'SA')} {Math.round(cfg.g.sa * 100)}%</span>}
                   {cfg.lzk && <span className="text-[0.5625rem] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100 font-black uppercase tracking-wider">{getNotenLabel(app, activeFach, 'lzk', 'LZK')} {Math.round(cfg.g.lzk * 100)}%</span>}
                   {cfg.wp && <span className="text-[0.5625rem] bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-100 font-black uppercase tracking-wider">{getNotenLabel(app, activeFach, 'wp', 'WOPL')} {Math.round(cfg.g.wp * 100)}%</span>}
                   {cfg.obj && <span className="text-[0.5625rem] bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full border border-rose-100 font-black uppercase tracking-wider">{getNotenLabel(app, activeFach, 'obj', cfg.objLabel || 'Objekt')} {Math.round(cfg.g.obj * 100)}%</span>}
                   {cfg.mi && cfg.g.mi > 0 && <span className="text-[0.5625rem] bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full border border-orange-100 font-black uppercase tracking-wider">{getNotenLabel(app, activeFach, 'mi', 'MI')} {Math.round(cfg.g.mi * 100)}%</span>}
                   
                   <span className="inline-flex items-center gap-1.5 text-[0.5625rem] bg-slate-100 text-slate-500 hover:text-slate-750 px-2.5 py-1 rounded-full border border-slate-200/60 font-semibold select-none cursor-help transition-all duration-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-100" title="Keyboard-Modus aktiv: Nutze die Pfeiltasten (↑, ↓, ←, →) oder die Enter-Taste (Enter / Umschalt+Enter) zum extrem schnellen Ausfüllen der Notentabelle wie in Excel!">
                     <span className="font-mono bg-white px-1 py-0.5 rounded border border-slate-300 text-[0.5rem] font-black shadow-3xs">⌨ kbd</span>
                     <span>Steuerbar mit Pfeiltasten</span>
                   </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={() => setIsolatedCol(null)}
                  className={`px-3 py-2 border rounded-xl text-[0.625rem] font-black uppercase tracking-widest transition-all ${isolatedCol ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse' : 'hidden'}`}
                >
                  Vollbild beenden
                </button>
                <button 
                  onClick={() => setFilterMissing(!filterMissing)}
                  disabled={missingCount === 0}
                  aria-pressed={filterMissing}
                  aria-label={`${missingCount} von ${app.schueler?.length || 0} Schüler:innen mit unvollständiger Bewertung anzeigen`}
                  title={
                    missingCount === 0
                      ? "Alle vorgesehenen Bewertungen sind vollständig"
                      : !hasAnyAssessment
                        ? "Für dieses Fach wurden noch keine Bewertungen eingetragen"
                        : "Zeigt nur Schüler:innen, bei denen mindestens eine vorgesehene Bewertung fehlt"
                  }
                  className={`px-3 py-2 rounded-xl justify-center text-[0.625rem] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all border disabled:cursor-default ${filterMissing ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : missingCount === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}
                >
                  {missingCount === 0 ? <Check size={12} /> : <Filter size={12} className={filterMissing ? 'text-white' : 'text-blue-500'} />}
                  <span>
                    {missingCount === 0
                      ? "Bewertungen vollständig"
                      : hasAnyAssessment
                        ? "Unvollständige Bewertungen"
                        : "Noch keine Bewertungen"}
                  </span>
                  {missingCount > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[0.5625rem] font-bold ${filterMissing ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-750 animate-pulse font-black'}`}>
                      {missingCount}/{app.schueler?.length || 0}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => {
                    if (sortBy === 'avg') {
                      if (sortOrder === 'asc') {
                        setSortOrder('desc');
                      } else {
                        setSortBy('name');
                        setSortOrder('asc');
                      }
                    } else {
                      setSortBy('avg');
                      setSortOrder('asc');
                    }
                  }}
                  className={`px-3 py-2 rounded-xl text-[0.625rem] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all border ${sortBy === 'avg' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}
                >
                  <BarChart2 size={12} className={sortBy === 'avg' ? 'text-white' : 'text-slate-400'} />
                  <span>Schnitt</span>
                  {sortBy === 'avg' && <span className="text-[0.625rem] font-black">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                </button>
                <button 
                  onClick={() => setShowStats(!showStats)} 
                  className={`px-3 py-2 rounded-xl justify-center text-[0.625rem] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all border ${showStats ? 'bg-rose-600 text-white border-rose-600 shadow-xs' : 'bg-white border border-slate-200 text-slate-500 hover:bg-rose-50 hover:border-rose-200'}`}
                >
                  <BarChart2 size={12} className={showStats ? 'text-white' : 'text-slate-400'} /> 
                  <span className="whitespace-nowrap">{showStats ? 'Auswertung verbergen' : 'Auswertung zeigen'}</span>
                </button>
                
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl print:hidden">
                  <span className="text-[0.625rem] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                    Klassenschnitt <span className={showClassAverage ? 'text-emerald-600' : 'text-slate-400'}>{showClassAverage ? 'anzeigen' : 'ausblenden'}</span>
                  </span>
                  <button 
                    onClick={() => setShowClassAverage(!showClassAverage)}
                    className={`w-8 h-4 shrink-0 rounded-full transition-all relative ${showClassAverage ? 'bg-neutral-800' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showClassAverage ? 'left-[1.1rem]' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>

            {students.length === 0 && (
              <EmptyState 
                icon="👥"
                title="Noch keine Schüler/innen"
                description="Gehe zur Klassenliste, um Schüler/innen hinzuzufügen, bevor du Noten vergeben kannst."
                actionLabel="Zur Klassenliste"
                onAction={() => setApp(prev => ({ ...prev, currentPage: 'schueler' }))}
              />
            )}
            {students.length > 0 && !cfg.sa && !cfg.lzk && !cfg.wp && !cfg.obj && !cfg.mi && !cfg.hue && (
              <EmptyState 
                icon="📊"
                title="Keine Noten-Spalten aktiv"
                description="Hier landen die Noten für dieses Fach. Klicke auf +, um zu starten und neue Bewertungsspalten (wie Mitarbeit, HÜ oder Tests) hinzuzufügen."
                actionLabel="Neues Bewertungselement"
                onAction={() => setShowWeights(true)}
                className="my-8"
              />
            )}
            {students.length > 0 && (cfg.sa || cfg.lzk || cfg.wp || cfg.obj || cfg.mi || cfg.hue) && (
              <div className="w-full overflow-x-auto relative no-scrollbar rounded-2xl border border-slate-200 shadow-sm bg-white">
              <table className="w-full border-separate border-spacing-0 text-[0.875rem] leading-snug table-fixed print:table-auto min-w-[1200px] gradebook-table">
                <thead>
                  <tr className="sticky top-0 z-30 text-[0.6rem] font-bold uppercase tracking-wider text-text-muted text-center print:break-inside-avoid">
                    <th className={`${zoomLevel === 'compact' ? 'px-2.5 py-2 text-[0.55rem] w-[3rem]' : zoomLevel === 'large' ? 'px-5 py-5 text-[0.75rem] w-[5rem]' : 'px-4 py-3.5 text-[0.6rem] w-[4rem]'} text-left border-b-2 border-r border-slate-200 bg-white sticky left-0 z-[50] print:relative print:left-0 shadow-[2px_0_10px_rgba(0,0,0,0.1)]`}>#</th>
                    <th className={`${zoomLevel === 'compact' ? 'px-3.5 py-2 text-[0.55rem] w-[14rem] left-[3rem]' : zoomLevel === 'large' ? 'px-6 py-5 text-[0.75rem] w-[22rem] left-[5rem]' : 'px-5 py-3.5 text-[0.6rem] w-[18rem] left-[4rem]'} text-left border-b-2 border-r border-slate-200 bg-white sticky z-[50] print:relative print:left-0 shadow-[4px_0_10px_rgba(0,0,0,0.1)]`}>
                      <button 
                        onClick={() => {
                          if (sortBy === 'name') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortBy('name');
                            setSortOrder('asc');
                          }
                        }}
                        className="flex items-center gap-1 hover:text-primary transition-colors uppercase"
                      >
                        Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </button>
                    </th>
                    <th className={`px-2 ${zoomLevel === 'compact' ? 'py-2 text-[0.55rem]' : zoomLevel === 'large' ? 'py-5 text-[0.75rem]' : 'py-3.5 text-[0.6rem]'} w-20 border-b-2 border-r border-border bg-surface shadow-sm`}>∅</th>
                    {cfg.sa && Array.from({length: cfg.saCount}).map((_, i) => renderColHeader('sa', i, 'bg-blue-50 text-blue-800 border-blue-200/50', i === 0, getNotenLabel(app, activeFach, 'sa', 'SA')))}
                    
                    {cfg.lzk && (
                      <>
                        {Array.from({length: colCounts.lzk}).map((_, i) => renderColHeader('lzk', i, 'bg-green-50 text-green-800 border-green-200/50', i === 0, getNotenLabel(app, activeFach, 'lzk', 'LZK')))}
                        <th className={`px-1 ${zoomLevel === 'compact' ? 'py-2 text-[0.55rem]' : zoomLevel === 'large' ? 'py-5 text-[0.75rem]' : 'py-3.5 text-[0.6rem]'} w-12 bg-green-50/40 border-b-2 border-r border-green-200/50 print:hidden ${isolatedCol ? 'hidden' : ''}`}>
                          <div className="flex flex-col gap-1 items-center justify-center">
                            <button onClick={(e) => addColumn(e, 'lzk')} title={`${getNotenLabel(app, activeFach, 'lzk', 'LZK')} hinzufügen`} className="text-green-600 hover:scale-125 transition-all"><Plus size={10} strokeWidth={4} /></button>
                            <button onClick={(e) => removeColumn(e, 'lzk')} title={`${getNotenLabel(app, activeFach, 'lzk', 'LZK')} entfernen`} className="text-red-500 hover:scale-125 transition-all"><Minus size={10} strokeWidth={4} /></button>
                          </div>
                        </th>
                      </>
                    )}
                    {cfg.wp && (
                      <>
                        {Array.from({length: colCounts.wp}).map((_, i) => renderColHeader('wp', i, 'bg-purple-50 text-purple-800 border-purple-200/50', i === 0, getNotenLabel(app, activeFach, 'wp', 'WOPL')))}
                        <th className={`px-1 ${zoomLevel === 'compact' ? 'py-2 text-[0.55rem]' : zoomLevel === 'large' ? 'py-5 text-[0.75rem]' : 'py-3.5 text-[0.6rem]'} w-12 bg-purple-50/40 border-b-2 border-r border-purple-200/50 print:hidden ${isolatedCol ? 'hidden' : ''}`}>
                           <div className="flex flex-col gap-1 items-center justify-center">
                            <button onClick={(e) => addColumn(e, 'wp')} title={`${getNotenLabel(app, activeFach, 'wp', 'WOPL')} hinzufügen`} className="text-purple-600 hover:scale-125 transition-all"><Plus size={10} strokeWidth={4} /></button>
                            <button onClick={(e) => removeColumn(e, 'wp')} title={`${getNotenLabel(app, activeFach, 'wp', 'WOPL')} entfernen`} className="text-red-500 hover:scale-125 transition-all"><Minus size={10} strokeWidth={4} /></button>
                          </div>
                        </th>
                      </>
                    )}
                    {cfg.obj && (
                      <>
                        {Array.from({length: colCounts.obj}).map((_, i) => renderColHeader('obj', i, 'bg-amber-50 text-amber-800 border-amber-200/50', i === 0, getNotenLabel(app, activeFach, 'obj', 'OBJ')))}
                        <th className={`px-1 ${zoomLevel === 'compact' ? 'py-2 text-[0.55rem]' : zoomLevel === 'large' ? 'py-5 text-[0.75rem]' : 'py-3.5 text-[0.6rem]'} w-12 bg-amber-50/40 border-b-2 border-r border-amber-200/50 print:hidden ${isolatedCol ? 'hidden' : ''}`}>
                           <div className="flex flex-col gap-1 items-center justify-center">
                            <button onClick={(e) => addColumn(e, 'obj')} title={`${getNotenLabel(app, activeFach, 'obj', 'Objekt')} hinzufügen`} className="text-amber-600 hover:scale-125 transition-all"><Plus size={10} strokeWidth={4} /></button>
                            <button onClick={(e) => removeColumn(e, 'obj')} title={`${getNotenLabel(app, activeFach, 'obj', 'Objekt')} entfernen`} className="text-red-500 hover:scale-125 transition-all"><Minus size={10} strokeWidth={4} /></button>
                          </div>
                        </th>
                      </>
                    )}
                    {cfg.mi && <th className={`px-1 ${zoomLevel === 'compact' ? 'py-2 text-[0.55rem]' : zoomLevel === 'large' ? 'py-5 text-[0.75rem]' : 'py-3.5 text-[0.6rem]'} w-20 bg-orange-50/80 text-orange-800 border-b-2 border-r border-orange-200/50 border-l-2 border-l-orange-600 ${isolatedCol ? 'hidden' : ''}`}>{getShortName(getNotenLabel(app, activeFach, 'mi', 'MI'), 'MI')}</th>}
                    {cfg.hue && <th className={`px-1 ${zoomLevel === 'compact' ? 'py-2 text-[0.55rem]' : zoomLevel === 'large' ? 'py-5 text-[0.75rem]' : 'py-3.5 text-[0.6rem]'} w-20 bg-rose-50/80 text-rose-800 border-b-2 border-r border-rose-200/50 border-l-2 border-l-rose-600 ${isolatedCol ? 'hidden' : ''}`}>HÜ</th>}
                    <th className={`px-4 ${zoomLevel === 'compact' ? 'py-2 text-[0.55rem]' : zoomLevel === 'large' ? 'py-5 text-[0.75rem]' : 'py-3.5 text-[0.6rem]'} text-center w-24 border-b-2 border-border/80 bg-surface ${isolatedCol ? 'hidden' : ''}`}>Ende</th>
                  </tr>
                </thead>
                <tbody>
                    {students.map((s, i) => {
                    const avg = berechne(app, s.id, activeFach, sem);
                    const rawNd = (app.noten?.[s.id]?.[activeFach]?.[sem] || {}) as any;
                    const nd = {
                      sa: rawNd.sa || [],
                      lzk: rawNd.lzk || [],
                      wp: rawNd.wp || [],
                      aufgaben: rawNd.aufgaben || [],
                      hue: rawNd.hue || 0,
                      hueAnm: rawNd.hueAnm || [],
                      endnote: rawNd.endnote,
                      freitext: rawNd.freitext,
                      miDirekt: rawNd.miDirekt
                    };
                    const miRaw = app.mitarbeit?.[s.id]?.[activeFach]?.[sem] || 0;
                    const isItemSelected = focusedCell?.sid === s.id;
                    
                    const isRowHovered = hoveredCell && hoveredCell.sid === s.id;
                    const rowBgClass = isItemSelected 
                      ? 'bg-emerald-50' 
                      : isRowHovered 
                        ? 'bg-indigo-50/30'
                        : s.spf 
                          ? 'bg-purple-50/60' 
                          : s.espf 
                            ? 'bg-teal-50/60' 
                            : i % 2 === 0 
                              ? 'bg-white' 
                              : 'bg-slate-50/50';

                    const stickyBgClass = isItemSelected 
                      ? 'bg-emerald-100' 
                      : isRowHovered 
                        ? 'bg-indigo-50/60'
                        : s.spf 
                          ? 'bg-[#fcf8ff]' // Solid extremely light violet
                          : s.espf 
                            ? 'bg-[#f5fffe]' // Solid extremely light teal
                            : i % 2 === 0 
                              ? 'bg-white' 
                              : 'bg-slate-50';

                    const studentErrors = getGradeValidationErrors().filter(err => err.studentId === s.id);
                    const relativeMiDivisor = (mitarbeitSettings.mode === 'relative' && mitarbeitSettings.relative_confirmed ? (students.length > 0 ? (students.map(st => app.mitarbeit?.[st.id]?.[activeFach]?.[sem] || 0)).reduce((a,b)=>a+b,0)/students.length || 10 : 10) : (mitarbeitSettings.thresholds?.[1] || 13));

                    return (
                      <StudentRowWrapper
                        key={s.id}
                        s={s} i={i} avg={avg} nd={nd} miRaw={miRaw}
                        isItemSelected={isItemSelected} isRowHovered={isRowHovered} studentErrors={studentErrors}
                        activeFach={activeFach} sem={sem} cfg={cfg} colCounts={colCounts}
                        isolatedCol={isolatedCol} heatmapMode={heatmapMode} mitarbeitSettings={mitarbeitSettings}
                        currentSymbol={currentSymbol} relativeMiDivisor={relativeMiDivisor} studentsCount={students.length}
                        assessmentMode={assessmentMode} maxPointsMeta={app.notenMeta?.[activeFach]?.maxPoints}
                        renderRow={() => (
                          <tr key={s.id} className={`group transition-colors ${rowBgClass} print:break-inside-avoid relative`}>
                        <td className={`${dStyle.tdNum} text-left font-bold border-b border-r border-slate-200 sticky left-0 z-[40] print:relative print:left-0 transition-colors shadow-[4px_0_10px_rgba(0,0,0,0.08)] ${stickyBgClass} ${isItemSelected ? 'text-emerald-800' : 'text-slate-400'}`}>{i+1}</td>
                        <td className={`${dStyle.tdName} text-left border-b border-r border-slate-200 font-semibold sticky z-[40] print:relative print:left-0 transition-colors shadow-[4px_0_10px_rgba(0,0,0,0.08)] ${stickyBgClass}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col pr-4 max-w-[12rem]">
                              <div className="flex items-center gap-2">
                                <span className={`text-wrap leading-tight break-words text-slate-900 ${dStyle.nameText} leading-normal font-black leading-tight max-w-[8rem] sm:max-w-[10rem]`} title={`${s.nachname} ${s.vorname}`}>{s.nachname}</span>
                                {s.spf && <span className={`${dStyle.spfBadge} font-black uppercase text-purple-600 bg-purple-100 rounded border border-purple-200 print:bg-slate-200 print:text-black`}>SPF</span>}
                                {s.espf && <span className={`${dStyle.spfBadge} font-black uppercase text-teal-600 bg-teal-100 rounded border border-teal-200 print:bg-slate-100 print:text-black`}>ESPF</span>}
                                {studentErrors.length > 0 && (
                                  <span 
                                    className="px-1.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-[0.5625rem] font-black inline-flex items-center gap-0.5 animate-pulse cursor-help shrink-0"
                                    title={studentErrors.map(e => e.message).join('\n')}
                                  >
                                    <AlertCircle size={8} /> {studentErrors.length}
                                  </span>
                                )}
                              </div>
                              <span className={`text-slate-500 font-bold ${dStyle.firstNameText} leading-tight text-wrap leading-tight break-words max-w-[8rem] sm:max-w-[10rem]`} title={`${s.nachname} ${s.vorname}`}>{s.vorname}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => setSelectedTrendStudentId(s.id)}
                                className={`${dStyle.actionBtn} hover:bg-amber-100 hover:text-amber-750 transition-all text-slate-450 group-hover:opacity-100 opacity-0 flex items-center justify-center shrink-0 cursor-pointer`}
                                title="Notenverlauf visualisieren"
                              >
                                <TrendingUp size={dStyle.actionIcon} />
                              </button>
                              <button 
                                onClick={() => {
                                  const note = prompt('Notiz für ' + s.vorname, nd.freitext || '');
                                  if (note !== null) {
                                    setApp(prev => ({
                                      ...prev,
                                      noten: {
                                        ...prev.noten,
                                        [s.id]: {
                                          ...(prev.noten[s.id] || {}),
                                          [activeFach]: {
                                            ...(prev.noten[s.id]?.[activeFach] || {}),
                                            [sem]: {
                                              ...(prev.noten[s.id]?.[activeFach]?.[sem] || { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] }),
                                              freitext: note
                                            }
                                          }
                                        }
                                      }
                                    }));
                                  }
                                }}
                                className={`${dStyle.actionBtn} hover:bg-surface2 transition-all ${nd.freitext ? 'text-primary bg-primary/10' : 'text-text-muted opacity-0 group-hover:opacity-100 flex items-center justify-center shrink-0 cursor-pointer'}`}
                                title={nd.freitext || 'Notiz hinzufügen'}
                              >
                                <MessageSquare size={dStyle.actionIcon} />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className={`${zoomLevel === 'compact' ? 'px-0.5 py-1 text-[0.75rem]' : zoomLevel === 'large' ? 'px-2 py-2 text-[0.9375rem]' : 'px-1 py-1.5 text-[0.8125rem]'} text-center border-b border-r border-border/40 font-bold font-mono relative ${hasCalculatedAverage(avg) && assessmentMode === 'grades' && avg >= 4.5 ? 'text-red-700 bg-red-50/40' : hasCalculatedAverage(avg) && assessmentMode !== 'grades' && avg < 50 ? 'text-red-700 bg-red-50/40' : hasCalculatedAverage(avg) ? 'text-blue-900 bg-blue-50/40' : 'text-slate-400'}`}>
                          {avg !== null && assessmentMode === 'grades' && (avg % 1 >= 0.45 && avg % 1 <= 0.55) && (
                            <div className="absolute top-1 right-1 text-[0.5rem] leading-none font-black text-amber-700 bg-amber-100 border border-amber-300 rounded-full w-4 h-4 flex items-center justify-center shadow-3xs" title="Grenzentscheidung zwischen zwei Noten: Der Notendurchschnitt liegt genau in der Mitte (.5)">
                              !
                            </div>
                          )}
                          {s.spf || s.espf ? (
                            <DebouncedInput
                              type="text"
                              aria-label={`Endnote für ${s.vorname} ${s.nachname}`}
                              value={nd.endnote || ''}
                              onChange={(val) => setEndnote(s.id, val)}
                              placeholder={hasCalculatedAverage(avg) ? (assessmentMode === 'grades' ? avg.toFixed(2) : `${avg.toFixed(1)}%`) : '-'}
                              title="Endnote (SPF/ESPF) manuell überschreiben"
                              debounceMs={400}
                              className={`mx-auto block text-center bg-white/80 border border-slate-200 hover:border-emerald-500 focus:border-emerald-600 focus:bg-white transition-all outline-none font-black text-slate-800 placeholder:text-slate-400 print:bg-transparent print:border-none shadow-3xs ${zoomLevel === 'compact' ? 'rounded-md py-0.5 text-[0.75rem] w-10' : zoomLevel === 'large' ? 'rounded-xl py-2 text-[0.9375rem] w-14' : 'rounded-lg py-1 text-[0.8125rem] w-12'}`}
                            />
                          ) : (
                            <div className={`${zoomLevel === 'compact' ? 'py-1 text-[0.75rem]' : zoomLevel === 'large' ? 'py-4 text-[0.9375rem]' : 'py-2.5 text-[0.8125rem]'} font-extrabold`}>
                              {hasCalculatedAverage(avg) ? (assessmentMode === 'grades' ? avg.toFixed(2) : `${avg.toFixed(1)}%`) : '–'}
                            </div>
                          )}
                        </td>
                        {cfg.sa && Array.from({length: cfg.saCount}).map((_, idx) => {
                          const maxP = getMaxPoints(app, activeFach, 'sa', idx);
                          const itemPct = calculateItemPercent(nd.sa[idx], assessmentMode, maxP);
                          return (
                            <td key={`sa-${idx}`} 
                              onMouseEnter={() => setHoveredCell({sid: s.id, typ: 'sa', idx})}
                              onMouseLeave={() => setHoveredCell(null)}
                              className={`${dStyle.tdCell} border-b border-r border-border/30 transition-all bg-blue-50/5 ${getGradeColor(nd.sa[idx], true, 'sa', idx)} ${idx === 0 ? 'border-l-2 border-l-blue-400/50' : ''} ${isItemSelected && focusedCell?.typ === 'sa' && focusedCell?.idx === idx ? 'ring-2 ring-blue-500 ring-inset z-30' : ''} ${isolatedCol && (isolatedCol.typ !== 'sa' || isolatedCol.idx !== idx) ? 'hidden' : ''} ${getHighlightClass(s.id, 'sa', idx)}`}>
                                <div className="flex flex-col items-center justify-center gap-0.5 px-1 relative">
                                  {(() => {
                                    const p = getLinkedMetaProtokoll(s.id, 'sa', idx);
                                    if (!p) return null;
                                    return (
                                      <button 
                                        onClick={() => setViewMetaProtokoll(p)}
                                        className="absolute -top-2 -right-2 z-20 text-violet-600 bg-white rounded-full bg-violet-100 shadow-sm border border-violet-200 hover:scale-110 transition-transform flex items-center justify-center w-5 h-5"
                                        title="Metakognitions-Protokoll vorhanden – klicken zum Anzeigen"
                                      >
                                        <Brain size={12} className="fill-violet-600" />
                                      </button>
                                    );
                                  })()}
                                  <div className="flex items-center gap-1 w-full relative">
                                    <DebouncedInput 
                                      type="text"
                                      aria-label={`Schularbeit ${idx + 1} für ${s.vorname} ${s.nachname}`}
                                      data-col={`sa-${idx}`}
                                      placeholder={assessmentMode === 'points' ? `/${maxP}` : assessmentMode === 'percent' ? '%' : ''}
                                      onFocus={(e) => {
                                        e.target.select();
                                        setFocusedCell({sid: s.id, typ: 'sa', idx});
                                      }}
                                      onBlur={() => setFocusedCell(null)}
                                      onKeyDown={(e) => handleKeyDown(e, s.id, 'sa', idx)}
                                      className={`w-full mx-auto block text-center ${heatmapMode && isColorableGrade(nd.sa[idx]) ? 'bg-transparent' : 'bg-white/95'} border border-slate-250 hover:border-blue-400 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all font-bold ${getGradeColor(nd.sa[idx], true, 'sa', idx).includes('ring-rose') ? '' : getGradeColor(nd.sa[idx], true, 'sa', idx)} ${nd.sa[idx] === 5 && assessmentMode === 'grades' ? 'text-red-650 font-extrabold' : nd.sa[idx] === 'f' ? 'text-slate-400' : 'text-blue-800'} ${zoomLevel === 'compact' ? 'min-w-[2.25rem] py-0.5 text-[0.75rem] rounded-md max-w-[3.25rem]' : zoomLevel === 'large' ? 'min-w-[3.5rem] py-2 text-[0.9375rem] rounded-xl max-w-[4.75rem]' : 'min-w-[2.75rem] py-1 text-[0.8125rem] rounded-lg max-w-[4rem]'}`}
                                      value={nd.sa[idx] !== null && nd.sa[idx] !== undefined ? nd.sa[idx] : ''}
                                      onChange={(val) => setNote(s.id, 'sa', idx, val)}
                                      debounceMs={400}
                                    />
                                    {isBorderline(nd.sa[idx]) && (
                                      <div className="absolute -top-1.5 -right-0.5 z-10 text-amber-500 bg-white rounded-full shadow-sm border border-amber-200 pointer-events-none" title="Grenzentscheidung / Tendenz (+/-)">
                                        <AlertCircle size={10} className="stroke-[3]" />
                                      </div>
                                    )}
                                    {!isolatedCol && (
                                      <button 
                                        onClick={() => setSaAssessment({sid: s.id, name: `${s.vorname} ${s.nachname}`, idx})}
                                        className="p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all shrink-0 hidden sm:block"
                                        title="Beurteilungsbogen öffnen"
                                      >
                                        <FileText size={16} />
                                      </button>
                                    )}
                                  </div>
                                  {assessmentMode === 'points' && itemPct !== null && (
                                    <span className="text-[0.5625rem] font-bold text-slate-400 leading-none" title={`${nd.sa[idx]} von ${maxP} Punkten`}>
                                      {Math.round(itemPct)}%
                                    </span>
                                  )}
                                </div>
                            </td>
                          );
                        })}
                        {cfg.lzk && (
                          <>
                            {Array.from({length: colCounts.lzk}).map((_, idx) => {
                              const maxP = getMaxPoints(app, activeFach, 'lzk', idx);
                              const itemPct = calculateItemPercent(nd.lzk[idx], assessmentMode, maxP);
                              return (
                                <td key={`lzk-${idx}`} 
                                  onMouseEnter={() => setHoveredCell({sid: s.id, typ: 'lzk', idx})}
                                  onMouseLeave={() => setHoveredCell(null)}
                                  className={`${dStyle.tdCell} border-b border-r border-border/30 transition-all bg-green-50/5 ${getGradeColor(nd.lzk[idx], true, 'lzk', idx)} ${idx === 0 ? 'border-l-2 border-l-green-400/50' : ''} ${isItemSelected && focusedCell?.typ === 'lzk' && focusedCell?.idx === idx ? 'ring-2 ring-green-500 ring-inset z-30' : ''} ${isolatedCol && (isolatedCol.typ !== 'lzk' || isolatedCol.idx !== idx) ? 'hidden' : ''} ${getHighlightClass(s.id, 'lzk', idx)}`}>
                                  <div className="flex flex-col items-center justify-center gap-0.5 relative">
                                    {(() => {
                                      const p = getLinkedMetaProtokoll(s.id, 'lzk', idx);
                                      if (!p) return null;
                                      return (
                                        <button 
                                          onClick={() => setViewMetaProtokoll(p)}
                                          className="absolute -top-2 -right-2 z-20 text-violet-600 bg-white rounded-full bg-violet-100 shadow-sm border border-violet-200 hover:scale-110 transition-transform flex items-center justify-center w-5 h-5 print:hidden"
                                          title="Metakognitions-Protokoll vorhanden – klicken zum Anzeigen"
                                        >
                                          <Brain size={12} className="fill-violet-600" />
                                        </button>
                                      );
                                    })()}
                                    <div className="relative w-full">
                                      <DebouncedInput 
                                        type="text"
                                        aria-label={`Lernzielkontrolle ${idx + 1} für ${s.vorname} ${s.nachname}`}
                                        data-col={`lzk-${idx}`}
                                        placeholder={assessmentMode === 'points' ? `/${maxP}` : assessmentMode === 'percent' ? '%' : ''}
                                        onFocus={(e) => {
                                          e.target.select();
                                          setFocusedCell({sid: s.id, typ: 'lzk', idx});
                                        }}
                                        onBlur={() => setFocusedCell(null)}
                                        onKeyDown={(e) => handleKeyDown(e, s.id, 'lzk', idx)}
                                        className={`w-full mx-auto block text-center ${heatmapMode && isColorableGrade(nd.lzk[idx]) ? 'bg-transparent' : 'bg-white/95'} border border-slate-250 hover:border-green-400 focus:border-green-500 focus:bg-white focus:ring-1 focus:ring-green-500 outline-none transition-all font-bold ${getGradeColor(nd.lzk[idx], true, 'lzk', idx).includes('ring-rose') ? '' : getGradeColor(nd.lzk[idx], true, 'lzk', idx)} ${nd.lzk[idx] === 5 && assessmentMode === 'grades' ? 'text-red-650 font-extrabold' : nd.lzk[idx] === 'f' ? 'text-slate-400' : 'text-green-800'} ${zoomLevel === 'compact' ? 'min-w-[2.25rem] py-0.5 text-[0.75rem] rounded-md max-w-[3.25rem]' : zoomLevel === 'large' ? 'min-w-[3.5rem] py-2 text-[0.9375rem] rounded-xl max-w-[4.75rem]' : 'min-w-[2.75rem] py-1 text-[0.8125rem] rounded-lg max-w-[4rem]'}`}
                                        value={nd.lzk[idx] !== null && nd.lzk[idx] !== undefined ? nd.lzk[idx] : ''}
                                        onChange={(val) => setNote(s.id, 'lzk', idx, val)}
                                        debounceMs={400}
                                      />
                                      {isBorderline(nd.lzk[idx]) && (
                                        <div className="absolute -top-1.5 -right-0.5 z-10 text-amber-500 bg-white rounded-full shadow-sm border border-amber-200 pointer-events-none" title="Grenzentscheidung / Tendenz (+/-)">
                                          <AlertCircle size={10} className="stroke-[3]" />
                                        </div>
                                      )}
                                    </div>
                                    {assessmentMode === 'points' && itemPct !== null && (
                                      <span className="text-[0.5625rem] font-bold text-slate-400 leading-none" title={`${nd.lzk[idx]} von ${maxP} Punkten`}>
                                        {Math.round(itemPct)}%
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                            <td className={`w-12 border-b border-r border-border/30 bg-green-50/10 print:hidden ${isolatedCol ? 'hidden' : ''}`}></td>
                          </>
                        )}
                        {cfg.wp && (
                          <>
                            {Array.from({length: colCounts.wp}).map((_, idx) => {
                              const maxP = getMaxPoints(app, activeFach, 'wp', idx);
                              const itemPct = calculateItemPercent(nd.wp[idx], assessmentMode, maxP);
                              return (
                                <td key={`wp-${idx}`} 
                                  onMouseEnter={() => setHoveredCell({sid: s.id, typ: 'wp', idx})}
                                  onMouseLeave={() => setHoveredCell(null)}
                                  className={`${dStyle.tdCell} border-b border-r border-border/30 transition-all bg-purple-50/5 ${getGradeColor(nd.wp[idx], false, 'wp', idx)} ${idx === 0 ? 'border-l-2 border-l-purple-400/50' : ''} ${isItemSelected && focusedCell?.typ === 'wp' && focusedCell?.idx === idx ? 'ring-2 ring-purple-500 ring-inset z-30' : ''} ${isolatedCol && (isolatedCol.typ !== 'wp' || isolatedCol.idx !== idx) ? 'hidden' : ''} ${getHighlightClass(s.id, 'wp', idx)}`}>
                                  <div className="flex flex-col items-center justify-center gap-0.5 relative">
                                    {(() => {
                                      const p = getLinkedMetaProtokoll(s.id, 'wp', idx);
                                      if (!p) return null;
                                      return (
                                        <button 
                                          onClick={() => setViewMetaProtokoll(p)}
                                          className="absolute -top-2 -right-2 z-20 text-violet-600 bg-white rounded-full bg-violet-100 shadow-sm border border-violet-200 hover:scale-110 transition-transform flex items-center justify-center w-5 h-5 print:hidden"
                                          title="Metakognitions-Protokoll vorhanden – klicken zum Anzeigen"
                                        >
                                          <Brain size={12} className="fill-violet-600" />
                                        </button>
                                      );
                                    })()}
                                    <div className="relative w-full">
                                      <DebouncedInput 
                                        type="text"
                                        aria-label={`Wochenplan ${idx + 1} für ${s.vorname} ${s.nachname}`}
                                        data-col={`wp-${idx}`}
                                        placeholder={assessmentMode === 'points' ? `/${maxP}` : assessmentMode === 'percent' ? '%' : ''}
                                        onFocus={(e) => {
                                          e.target.select();
                                          setFocusedCell({sid: s.id, typ: 'wp', idx});
                                        }}
                                        onBlur={() => setFocusedCell(null)}
                                        onKeyDown={(e) => handleKeyDown(e, s.id, 'wp', idx)}
                                        className={`w-full mx-auto block text-center ${heatmapMode && isColorableGrade(nd.wp[idx]) ? 'bg-transparent' : 'bg-white/95'} border border-slate-250 hover:border-purple-400 focus:border-purple-500 focus:bg-white focus:ring-1 focus:ring-purple-500 outline-none transition-all font-bold ${getGradeColor(nd.wp[idx], false, 'wp', idx)} ${nd.wp[idx] === 5 && assessmentMode === 'grades' ? 'text-red-650 font-extrabold' : nd.wp[idx] === 'f' ? 'text-slate-400' : 'text-purple-800'} ${zoomLevel === 'compact' ? 'min-w-[2.25rem] py-0.5 text-[0.75rem] rounded-md max-w-[3.25rem]' : zoomLevel === 'large' ? 'min-w-[3.5rem] py-2 text-[0.9375rem] rounded-xl max-w-[4.75rem]' : 'min-w-[2.75rem] py-1 text-[0.8125rem] rounded-lg max-w-[4rem]'}`}
                                        value={nd.wp[idx] !== null && nd.wp[idx] !== undefined ? nd.wp[idx] : ''}
                                        onChange={(val) => setNote(s.id, 'wp', idx, val)}
                                        debounceMs={400}
                                      />
                                      {isBorderline(nd.wp[idx]) && (
                                        <div className="absolute -top-1.5 -right-0.5 z-10 text-amber-500 bg-white rounded-full shadow-sm border border-amber-200 pointer-events-none" title="Grenzentscheidung / Tendenz (+/-)">
                                          <AlertCircle size={10} className="stroke-[3]" />
                                        </div>
                                      )}
                                    </div>
                                    {assessmentMode === 'points' && itemPct !== null && (
                                      <span className="text-[0.5625rem] font-bold text-slate-400 leading-none" title={`${nd.wp[idx]} von ${maxP} Punkten`}>
                                        {Math.round(itemPct)}%
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                            <td className={`w-12 border-b border-r border-border/30 bg-purple-50/10 print:hidden ${isolatedCol ? 'hidden' : ''}`}></td>
                          </>
                        )}
                        {cfg.obj && (
                          <>
                            {Array.from({length: colCounts.obj}).map((_, idx) => {
                              const maxP = getMaxPoints(app, activeFach, 'obj', idx);
                              const itemPct = calculateItemPercent(nd.aufgaben[idx], assessmentMode, maxP);
                              return (
                                <td key={`obj-${idx}`} 
                                  onMouseEnter={() => setHoveredCell({sid: s.id, typ: 'aufgaben', idx})}
                                  onMouseLeave={() => setHoveredCell(null)}
                                  className={`${dStyle.tdCell} border-b border-r border-border/30 transition-all bg-amber-50/5 ${getGradeColor(nd.aufgaben[idx], false, 'obj', idx)} ${idx === 0 ? 'border-l-2 border-l-amber-400/50' : ''} ${isItemSelected && focusedCell?.typ === 'aufgaben' && focusedCell?.idx === idx ? 'ring-2 ring-amber-500 ring-inset z-30' : ''} ${isolatedCol && (isolatedCol.typ !== 'obj' || isolatedCol.idx !== idx) ? 'hidden' : ''} ${getHighlightClass(s.id, 'aufgaben', idx)}`}>
                                  <div className="flex flex-col items-center justify-center gap-0.5 relative">
                                    {(() => {
                                      const p = getLinkedMetaProtokoll(s.id, 'obj', idx);
                                      if (!p) return null;
                                      return (
                                        <button 
                                          onClick={() => setViewMetaProtokoll(p)}
                                          className="absolute -top-2 -right-2 z-20 text-violet-600 bg-white rounded-full bg-violet-100 shadow-sm border border-violet-200 hover:scale-110 transition-transform flex items-center justify-center w-5 h-5 print:hidden"
                                          title="Metakognitions-Protokoll vorhanden – klicken zum Anzeigen"
                                        >
                                          <Brain size={12} className="fill-violet-600" />
                                        </button>
                                      );
                                    })()}
                                    <div className="relative w-full">
                                      <DebouncedInput 
                                        type="text"
                                        aria-label={`Aufgabe ${idx + 1} für ${s.vorname} ${s.nachname}`}
                                        data-col={`obj-${idx}`}
                                        placeholder={assessmentMode === 'points' ? `/${maxP}` : assessmentMode === 'percent' ? '%' : ''}
                                        onFocus={(e) => {
                                          e.target.select();
                                          setFocusedCell({sid: s.id, typ: 'aufgaben', idx});
                                        }}
                                        onBlur={() => setFocusedCell(null)}
                                        onKeyDown={(e) => handleKeyDown(e, s.id, 'aufgaben', idx)}
                                        className={`w-full mx-auto block text-center ${heatmapMode && isColorableGrade(nd.aufgaben[idx]) ? 'bg-transparent' : 'bg-white/95'} border border-slate-250 hover:border-amber-400 focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500 outline-none transition-all font-bold ${getGradeColor(nd.aufgaben[idx], false, 'obj', idx)} ${nd.aufgaben[idx] === 5 && assessmentMode === 'grades' ? 'text-red-650 font-extrabold' : nd.aufgaben[idx] === 'f' ? 'text-slate-400' : 'text-amber-800'} ${zoomLevel === 'compact' ? 'min-w-[2.25rem] py-0.5 text-[0.75rem] rounded-md max-w-[3.25rem]' : zoomLevel === 'large' ? 'min-w-[3.5rem] py-2 text-[0.9375rem] rounded-xl max-w-[4.75rem]' : 'min-w-[2.75rem] py-1 text-[0.8125rem] rounded-lg max-w-[4rem]'}`}
                                        value={nd.aufgaben[idx] !== null && nd.aufgaben[idx] !== undefined ? nd.aufgaben[idx] : ''}
                                        onChange={(val) => setNote(s.id, 'aufgaben', idx, val)}
                                        debounceMs={400}
                                      />
                                      {isBorderline(nd.aufgaben[idx]) && (
                                        <div className="absolute -top-1.5 -right-0.5 z-10 text-amber-500 bg-white rounded-full shadow-sm border border-amber-200 pointer-events-none" title="Grenzentscheidung / Tendenz (+/-)">
                                          <AlertCircle size={10} className="stroke-[3]" />
                                        </div>
                                      )}
                                    </div>
                                    {assessmentMode === 'points' && itemPct !== null && (
                                      <span className="text-[0.5625rem] font-bold text-slate-400 leading-none" title={`${nd.aufgaben[idx]} von ${maxP} Punkten`}>
                                        {Math.round(itemPct)}%
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                            <td className={`w-12 border-b border-r border-border/30 bg-amber-50/10 print:hidden ${isolatedCol ? 'hidden' : ''}`}></td>
                          </>
                        )}
                        {cfg.mi && (
                          <td 
                            onMouseEnter={() => setHoveredCell({sid: s.id, typ: 'mi', idx: 0})}
                            onMouseLeave={() => setHoveredCell(null)}
                            className={`${zoomLevel === 'compact' ? 'px-0.5 py-1' : zoomLevel === 'large' ? 'px-2 py-3' : 'px-1 py-2'} border-b border-r border-border/30 bg-orange-50/10 border-l-2 border-l-orange-400/50 text-center ${isItemSelected && focusedCell?.typ === 'mi' ? 'ring-2 ring-orange-500 ring-inset z-30' : ''} ${isolatedCol ? 'hidden' : ''} ${getHighlightClass(s.id, 'mi', 0)}`}>
                             {mitarbeitSettings.mode === 'manual' ? (
                               <DebouncedInput 
                                 type="text"
                                 aria-label={`Mitarbeit für ${s.vorname} ${s.nachname}`}
                                 data-col="mi"
                                 onFocus={(e) => {
                                   e.target.select();
                                   setFocusedCell({sid: s.id, typ: 'mi', idx: 0});
                                 }}
                                 onBlur={() => setFocusedCell(null)}
                                 onKeyDown={(e) => handleKeyDown(e, s.id, 'mi', 0)}
                                 className={`mx-auto block text-center ${heatmapMode && isColorableGrade(nd.miDirekt) ? 'bg-transparent' : 'bg-white/95'} border border-slate-250 hover:border-orange-400 focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 outline-none transition-all font-bold ${getGradeColor(nd.miDirekt)} text-orange-900 ${zoomLevel === 'compact' ? 'rounded-md py-0.5 text-[0.75rem] w-12' : zoomLevel === 'large' ? 'rounded-xl py-2 text-[0.9375rem] w-20' : 'rounded-lg py-1 text-[0.8125rem] w-16'}`}
                                 value={nd.miDirekt !== null && nd.miDirekt !== undefined ? nd.miDirekt : ''}
                                 onChange={(val) => setMIDirekt(s.id, val)}
                                 placeholder={assessmentMode === 'percent' ? '%' : assessmentMode === 'points' ? 'Pkt' : 'Note'}
                                 debounceMs={400}
                               />
                             ) : (
                               <div className="flex flex-col items-center px-1">
                                  <div className="flex items-center gap-1 justify-center">
                                    <span className={`${zoomLevel === 'compact' ? 'text-[0.9rem]' : zoomLevel === 'large' ? 'text-[1.2rem]' : 'text-[1.0625rem]'} font-bold ${currentSymbol.color} tabular-nums leading-none`}>{miRaw}</span>
                                  </div>
                                  <div className={`w-full ${currentSymbol.bg} rounded-full h-1 mt-1.5  max-w-[36px]`}>
                                    <div 
                                      className={`h-full ${currentSymbol.color.replace('text-', 'bg-')} transition-all duration-500 rounded-full`} 
                                      style={{ width: `${Math.min(100, (miRaw / (mitarbeitSettings.mode === 'relative' && mitarbeitSettings.relative_confirmed ? (students.length > 0 ? (students.map(st => app.mitarbeit?.[st.id]?.[activeFach]?.[sem] || 0)).reduce((a,b)=>a+b,0)/students.length || 10 : 10) : (mitarbeitSettings.thresholds?.[1] || 13))) * 100)}%` }}
                                    />
                                  </div>
                               </div>
                             )}
                          </td>
                        )}
                        {cfg.hue && (
                          <td 
                            onMouseEnter={() => setHoveredCell({sid: s.id, typ: 'hue', idx: 0})}
                            onMouseLeave={() => setHoveredCell(null)}
                            title={app.settings?.hueGewichten === false ? `Hausübungen: ${nd.hue || 0}× vergessen (rein dokumentarisch, kein Notenabzug)` : `Hausübungen: ${nd.hue || 0}× vergessen (${Math.max(0, 100 - (nd.hue || 0) * (app.settings?.huePercentDeduction !== undefined ? app.settings.huePercentDeduction : 5))}% / Gewicht: ${Math.round(cfg.g.hue * 100)}%)`}
                            className={`${zoomLevel === 'compact' ? 'px-0.5 py-1' : zoomLevel === 'large' ? 'px-2 py-3' : 'px-1 py-2'} border-b border-r border-border/30 bg-rose-50/10 border-l-2 border-l-rose-400/50 text-center ${isolatedCol ? 'hidden' : ''} ${getHighlightClass(s.id, 'hue', 0)}`}>
                            <div className="flex flex-col items-center justify-center">
                              <span className={`${zoomLevel === 'compact' ? 'text-[0.75rem]' : zoomLevel === 'large' ? 'text-[0.9375rem]' : 'text-[0.8125rem]'} font-bold ${nd.hue > 0 ? 'text-rose-700 font-mono' : 'text-slate-400'}`}>
                                {nd.hue || 0}
                              </span>
                              {app.settings?.hueGewichten === false && (
                                <span className="text-[0.5rem] font-bold text-amber-700/80 uppercase tracking-tighter leading-none">
                                  doku
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                        <td className={`${zoomLevel === 'compact' ? 'px-2.5 py-1 text-[0.75rem]' : zoomLevel === 'large' ? 'px-5 py-4 text-[0.9375rem]' : 'px-4 py-3 text-[0.8125rem]'} text-center font-display font-bold border-b border-border/10 bg-surface/50 ${isolatedCol ? 'hidden' : ''}`}>
                          {hasCalculatedAverage(avg) ? (
                            <div className="flex flex-col items-center justify-center gap-1 group/ball relative">
                              {assessmentMode === 'grades' ? (
                                <div 
                                  onClick={() => setSelectedGradeExplanationStudent(s)}
                                  className="flex items-center gap-1.5 transition-transform hover:scale-105 cursor-pointer"
                                  title="Klicken für Zeugnisnoten-Erklärung"
                                >
                                  <span className={`nb nb-${Math.round(avg)} ${zoomLevel === 'compact' ? '!scale-75 -my-1' : zoomLevel === 'large' ? '!scale-110 my-1' : '!scale-95'} shadow-sm`}>{Math.round(avg)}</span>
                                  <div className="flex flex-col items-start hidden lg:flex">
                                    <span className="text-[0.5625rem] text-text-muted font-bold uppercase print:hidden tracking-tighter leading-none">{NOTE_LABELS[Math.round(avg)]}</span>
                                    <div className="text-[0.625rem] leading-none mt-0.5">{getTrendIcon(nd)}</div>
                                  </div>
                                </div>
                              ) : (
                                <div 
                                  className="flex items-center gap-1.5"
                                  title={`Gesamtwert: ${avg.toFixed(1)}%`}
                                >
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-black border shadow-3xs tabular-nums ${
                                    avg >= 87.5 ? 'bg-emerald-100 text-emerald-850 border-emerald-300' :
                                    avg >= 75 ? 'bg-blue-100 text-blue-850 border-blue-300' :
                                    avg >= 62.5 ? 'bg-amber-100 text-amber-850 border-amber-300' :
                                    avg >= 50 ? 'bg-orange-100 text-orange-850 border-orange-300' :
                                    'bg-rose-100 text-rose-850 border-rose-300'
                                  }`}>
                                    {Math.round(avg)}%
                                  </span>
                                  <div className="text-[0.625rem] leading-none">{getTrendIcon(nd)}</div>
                                </div>
                              )}
                               
                               <button 
                                 onClick={() => setSimulateModalForSid(s.id)}
                                 className="absolute -right-3 -top-1 opacity-0 group-hover/ball:opacity-100 p-1 bg-white border border-slate-200 rounded-full text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 shadow-sm transition-all"
                                 title="Was wäre wenn? (Szenario-Rechner)"
                               >
                                 <Sparkles size={10} />
                               </button>
                            </div>
                          ) : '–'}
                        </td>
                      </tr>
                        )}
                      />
                    );
                  })}
                  {false && (
                    <tr className="print:hidden">
                      <td colSpan={50} className="px-6 py-6 text-center text-[0.75rem] leading-tight font-black text-indigo-500 bg-indigo-50/10 border-b border-r border-slate-250 animate-pulse">
                        <span ref={sentinelRef} className="w-2 inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping inline-block mr-2" />
                        Lade weitere Schüler:innen... ({students.length - visibleLimit} verbleibend)
                      </td>
                    </tr>
                  )}
                </tbody>
                {showClassAverage && (
                  <tfoot className="sticky bottom-0 z-30 shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.3)]">
                    <tr className="bg-neutral-900 font-black text-[0.75rem] leading-tight text-neutral-400 text-center uppercase tracking-widest border-t-2 border-neutral-800 print:break-inside-avoid">
                      <td className="px-4 py-4 border-t px-2 border-neutral-700 border-r border-r-neutral-800 sticky left-0 z-40 bg-neutral-900 print:relative print:left-0 shadow-[2px_0_5px_rgba(0,0,0,0.2)]">∑</td>
                      <td className="px-5 py-4 text-left border-t border-neutral-700 border-r border-r-neutral-800 sticky left-[4rem] z-40 bg-neutral-900 print:relative print:left-0 uppercase text-white shadow-[2px_0_5px_rgba(0,0,0,0.2)]">∅ Klasse</td>
                      <td className="px-2 py-3 border-t border-neutral-700 border-r border-neutral-800 bg-neutral-800 text-white border-x-2">
                        {hasCalculatedAverage(stats?.avg) ? (assessmentMode === 'grades' ? stats!.avg.toFixed(2) : `${stats!.avg.toFixed(1)}%`) : '–'}
                      </td>
                      {cfg.sa && Array.from({length: cfg.saCount}).map((_, idx) => (
                        <td key={`fsa-${idx}`} className="px-1 py-3 border-t border-neutral-700 border-r border-neutral-800 bg-neutral-900 text-white">
                          {columnAverages[`sa-${idx}`]?.avg !== null && columnAverages[`sa-${idx}`]?.avg !== undefined 
                            ? (assessmentMode === 'grades' ? columnAverages[`sa-${idx}`]!.avg!.toFixed(1) : assessmentMode === 'percent' ? `${columnAverages[`sa-${idx}`]!.avg!.toFixed(1)}%` : `${columnAverages[`sa-${idx}`]!.avg!.toFixed(1)}P`) 
                            : '–'}
                        </td>
                      ))}
                      {cfg.lzk && (
                        <>
                          {Array.from({length: colCounts.lzk}).map((_, idx) => (
                            <td key={`flzk-${idx}`} className="px-1 py-3 border-t border-neutral-700 border-r border-neutral-800 bg-neutral-900 text-white">
                              {columnAverages[`lzk-${idx}`]?.avg !== null && columnAverages[`lzk-${idx}`]?.avg !== undefined 
                                ? (assessmentMode === 'grades' ? columnAverages[`lzk-${idx}`]!.avg!.toFixed(1) : assessmentMode === 'percent' ? `${columnAverages[`lzk-${idx}`]!.avg!.toFixed(1)}%` : `${columnAverages[`lzk-${idx}`]!.avg!.toFixed(1)}P`) 
                                : '–'}
                            </td>
                          ))}
                          <td className="w-12 border-t border-neutral-700 border-r border-neutral-800 bg-neutral-900/50 print:hidden"></td>
                        </>
                      )}
                      {cfg.wp && (
                        <>
                          {Array.from({length: colCounts.wp}).map((_, idx) => (
                            <td key={`fwp-${idx}`} className="px-1 py-3 border-t border-neutral-700 border-r border-neutral-800 bg-neutral-900 text-white">
                              {columnAverages[`wp-${idx}`]?.avg !== null && columnAverages[`wp-${idx}`]?.avg !== undefined 
                                ? (assessmentMode === 'grades' ? columnAverages[`wp-${idx}`]!.avg!.toFixed(1) : assessmentMode === 'percent' ? `${columnAverages[`wp-${idx}`]!.avg!.toFixed(1)}%` : `${columnAverages[`wp-${idx}`]!.avg!.toFixed(1)}P`) 
                                : '–'}
                            </td>
                          ))}
                          <td className="w-12 border-t border-neutral-700 border-r border-neutral-800 bg-neutral-900/50 print:hidden"></td>
                        </>
                      )}
                      {cfg.obj && (
                        <>
                          {Array.from({length: colCounts.obj}).map((_, idx) => (
                            <td key={`fobj-${idx}`} className="px-1 py-3 border-t border-neutral-700 border-r border-neutral-800 bg-neutral-900 text-white">
                              {columnAverages[`obj-${idx}`]?.avg !== null && columnAverages[`obj-${idx}`]?.avg !== undefined 
                                ? (assessmentMode === 'grades' ? columnAverages[`obj-${idx}`]!.avg!.toFixed(1) : assessmentMode === 'percent' ? `${columnAverages[`obj-${idx}`]!.avg!.toFixed(1)}%` : `${columnAverages[`obj-${idx}`]!.avg!.toFixed(1)}P`) 
                                : '–'}
                            </td>
                          ))}
                          <td className="w-12 border-t border-neutral-700 border-r border-neutral-800 bg-neutral-900/50 print:hidden"></td>
                        </>
                      )}
                      {cfg.mi && <td className="px-1 py-3 border-t border-neutral-700 border-r border-neutral-800 bg-neutral-900 text-white"></td>}
                      {cfg.hue && <td className="px-1 py-3 border-t border-neutral-700 border-r border-neutral-800 bg-neutral-900 text-white"></td>}
                      <td className="px-4 py-3 border-t border-neutral-700 border-neutral-800 bg-neutral-900 shadow-inner">
                         <span className="nb nb-primary !scale-75 opacity-20">Ø</span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
          </div>

          {/* Modal for + Bewertung */}
          <AnimatePresence>
            {showAddAssessmentModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
                onClick={() => setShowAddAssessmentModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="font-black text-[1.125rem] text-slate-900">
                        Neue Bewertung für {activeFach}
                      </h3>
                      <p className="text-[0.75rem] text-slate-500 font-bold">
                        Wähle die Art der Leistung, die du erfassen möchtest:
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddAssessmentModal(false)}
                      className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    <button
                      onClick={() => {
                        setShowAddAssessmentModal(false);
                        // Open SA assessment for first student as entry point or add column
                        if (students.length > 0) {
                          setSaAssessment({
                            sid: students[0].id,
                            name: `${students[0].vorname} ${students[0].nachname}`,
                            idx: 0,
                          });
                        }
                      }}
                      className="p-4 rounded-2xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 text-left transition-all hover:scale-[1.02] cursor-pointer group"
                    >
                      <div className="text-2xl mb-2">📝</div>
                      <div className="font-black text-blue-900 text-[0.9375rem] mb-1">
                        Schularbeit
                      </div>
                      <div className="text-[0.75rem] text-blue-700 leading-snug">
                        Detaillierte Korrektur mit Punkten & KI-Vorschlägen
                      </div>
                    </button>

                    <button
                      onClick={(e) => {
                        setShowAddAssessmentModal(false);
                        addColumn(e, 'lzk');
                      }}
                      className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 text-left transition-all hover:scale-[1.02] cursor-pointer group"
                    >
                      <div className="text-2xl mb-2">🎯</div>
                      <div className="font-black text-emerald-900 text-[0.9375rem] mb-1">
                        Test / LZK
                      </div>
                      <div className="text-[0.75rem] text-emerald-700 leading-snug">
                        Kurzüberprüfung oder Lernzielkontrolle eintragen
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setShowAddAssessmentModal(false);
                        setActiveView('mitarbeit');
                      }}
                      className="p-4 rounded-2xl border border-orange-200 bg-orange-50/50 hover:bg-orange-100/60 text-left transition-all hover:scale-[1.02] cursor-pointer group"
                    >
                      <div className="text-2xl mb-2">✋</div>
                      <div className="font-black text-orange-900 text-[0.9375rem] mb-1">
                        Mitarbeit
                      </div>
                      <div className="text-[0.75rem] text-orange-700 leading-snug">
                        Tägliche Mitarbeit per +, ○, − erfassen
                      </div>
                    </button>

                    <button
                      onClick={(e) => {
                        setShowAddAssessmentModal(false);
                        e.stopPropagation();

                        const subjectMeta = app.notenMeta?.[activeFach] || {};
                        const alreadyEnabled = subjectMeta.enableObj === true || getFachCfg(app, activeFach).obj;
                        if (!alreadyEnabled) {
                          setApp(prev => {
                            const meta = { ...(prev.notenMeta || {}) };
                            const current = { ...(meta[activeFach] || {}) };
                            const counts = { ...(current.colCounts || { lzk: 4, wp: 4, obj: 4 }), obj: 1 };
                            const labels = { ...(current.labels || {}), obj: current.labels?.obj || 'Sonstige Leistungen' };
                            return {
                              ...prev,
                              notenMeta: {
                                ...meta,
                                [activeFach]: {
                                  ...current,
                                  enableObj: true,
                                  labels,
                                  colCounts: counts,
                                },
                              },
                            };
                          });
                          setEditingAssessmentModal({ typ: 'obj', idx: 0, isNew: false });
                        } else {
                          addColumn(e, 'obj');
                        }
                      }}
                      className="p-4 rounded-2xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100/60 text-left transition-all hover:scale-[1.02] cursor-pointer group"
                    >
                      <div className="text-2xl mb-2">📌</div>
                      <div className="font-black text-purple-900 text-[0.9375rem] mb-1">
                        Sonstige Leistung
                      </div>
                      <div className="text-[0.75rem] text-purple-700 leading-snug">
                        Referat, Projekt, Präsentation oder andere Leistung
                      </div>
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Modal for Zeugnisnote Explanation */}
          <AnimatePresence>
            {selectedGradeExplanationStudent && (() => {
              const s = selectedGradeExplanationStudent;
              const avg = berechne(app, s.id, activeFach, sem);
              const roundedNote = hasCalculatedAverage(avg) ? Math.round(avg) : null;
              const rawNd = (app.noten?.[s.id]?.[activeFach]?.[sem] || {}) as any;

              return (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
                  onClick={() => setSelectedGradeExplanationStudent(null)}
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="font-black text-[1.125rem] text-slate-900">
                          Zeugnisnote: {s.vorname} {s.nachname}
                        </h3>
                        <p className="text-[0.75rem] text-slate-500 font-bold uppercase tracking-wider">
                          Fach: {activeFach}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedGradeExplanationStudent(null)}
                        className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl mb-5 border border-slate-100">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-md ${
                          roundedNote === 1
                            ? 'bg-emerald-500'
                            : roundedNote === 2
                            ? 'bg-blue-500'
                            : roundedNote === 3
                            ? 'bg-amber-500'
                            : roundedNote === 4
                            ? 'bg-orange-500'
                            : 'bg-red-500'
                        }`}
                      >
                        {roundedNote || '–'}
                      </div>
                      <div>
                        <div className="text-[0.75rem] font-bold text-slate-400 uppercase tracking-widest">
                          Berechneter Notenschnitt
                        </div>
                        <div className="text-[1.25rem] font-black text-slate-900">
                          {hasCalculatedAverage(avg) ? avg.toFixed(2) : 'Keine Noten'}{' '}
                          {roundedNote && (
                            <span className="text-[0.875rem] font-bold text-slate-500 font-sans">
                              ({NOTE_LABELS[roundedNote]})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-6 text-[0.8125rem]">
                      <div className="font-bold text-slate-700 text-[0.75rem] uppercase tracking-wider mb-2">
                        Zusammensetzung der Gesamtnote:
                      </div>
                      <div className="flex justify-between items-center p-2.5 rounded-xl bg-blue-50/50 border border-blue-100">
                        <span className="font-bold text-blue-900">📝 Schularbeiten:</span>
                        <span className="font-mono font-bold text-blue-800">
                          {rawNd.sa && rawNd.sa.length > 0
                            ? rawNd.sa.filter((n: any) => n !== undefined && n !== null && n !== '').join(', ') || '–'
                            : 'keine'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
                        <span className="font-bold text-emerald-900">🎯 Tests / LZKs:</span>
                        <span className="font-mono font-bold text-emerald-800">
                          {rawNd.lzk && rawNd.lzk.length > 0
                            ? rawNd.lzk.filter((n: any) => n !== undefined && n !== null && n !== '').join(', ') || '–'
                            : 'keine'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center p-2.5 rounded-xl bg-orange-50/50 border border-orange-100">
                        <span className="font-bold text-orange-900">✋ Mitarbeit:</span>
                        <span className="font-mono font-bold text-orange-800">
                          {app.mitarbeit?.[s.id]?.[activeFach]?.[sem] || 0} Punkte
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <button
                        onClick={() => setSelectedGradeExplanationStudent(null)}
                        className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-[0.75rem] uppercase tracking-wider cursor-pointer"
                      >
                        Schließen
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })()}
          </AnimatePresence>

          <AnimatePresence>
            {saAssessment && (
              <SchularbeitAssessment 
                studentId={saAssessment.sid}
                studentName={saAssessment.name}
                saIndex={saAssessment.idx}
                subject={activeFach}
                semester={sem}
                onClose={() => setSaAssessment(null)}
              />
            )}
          </AnimatePresence>

          <NotenverlaufModal
            isOpen={selectedTrendStudentId !== null}
            schuelerId={selectedTrendStudentId || ''}
            fach={activeFach}
            onClose={() => setSelectedTrendStudentId(null)}
          />

          {editingAssessmentModal && (
            <AssessmentItemModal
              isOpen={editingAssessmentModal !== null}
              onClose={() => setEditingAssessmentModal(null)}
              onSave={(labelVal, dateVal, maxPointsVal) => {
                if (editingAssessmentModal.isNew) {
                  setApp(prev => {
                    const meta = { ...(prev.notenMeta || {}) };
                    const subjectMeta = { ...(meta[activeFach] || {}) };
                    const counts = { ...(subjectMeta.colCounts || { lzk: 4, wp: 4, obj: 4 }) };
                    return {
                      ...prev,
                      notenMeta: {
                        ...meta,
                        [activeFach]: {
                          ...subjectMeta,
                          colCounts: {
                            ...counts,
                            [editingAssessmentModal.typ]: Math.max(
                              counts[editingAssessmentModal.typ] || 0,
                              editingAssessmentModal.idx + 1,
                            ),
                          },
                        },
                      },
                    };
                  });
                }
                updateColMeta(editingAssessmentModal.typ, editingAssessmentModal.idx, labelVal, dateVal, maxPointsVal);
              }}
              onOpenSchularbeitRaster={() => {
                if (editingAssessmentModal.typ === 'sa') {
                  const firstStudent = app.schueler?.[0];
                  setSaAssessment({
                    sid: firstStudent?.id || '',
                    name: firstStudent ? `${firstStudent.vorname} ${firstStudent.nachname}` : 'Klasse',
                    idx: editingAssessmentModal.idx
                  });
                }
              }}
              typ={editingAssessmentModal.typ}
              idx={editingAssessmentModal.idx}
              initialLabel={app.notenMeta?.[activeFach]?.colLabels?.[editingAssessmentModal.typ]?.[editingAssessmentModal.idx] || ''}
              initialDate={app.notenMeta?.[activeFach]?.colDates?.[editingAssessmentModal.typ]?.[editingAssessmentModal.idx] || ''}
              initialMaxPoints={getMaxPoints(app, activeFach, editingAssessmentModal.typ, editingAssessmentModal.idx)}
              assessmentMode={assessmentMode}
              subject={activeFach}
              semester={sem}
              isNew={editingAssessmentModal.isNew}
            />
          )}
        </div>
      )}
    </div>
    )}
  </div>
  );
}
