import React, { useState, useRef, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { getKW, kwToMonday, getStartYear, kwYear, getSW, isHoliday, logActivity, safeJsonParse, inferDateFromText, inferEventType, sortYearlySubjects, formatLocalDateKey } from '../lib/utils';
import { TAGE_NAMEN, STUNDENTAFEL, FAECHER_ALLE, DEUTSCH_UNTERFAECHER, MATHEMATIK_UNTERFAECHER, DEFAULT_YEARLY_SUBJECTS, STUNDEN_INFO, MAX_LESSON_SLOTS, LESSON_SLOT_NUMBERS } from '../constants';
import { ChevronLeft, ChevronRight, ChevronDown, Plus, Layout, Calendar, Info, Search, X, Check, Clock, PartyPopper, Lightbulb, Filter, Flag, AlertTriangle, Star, MessageSquare, Users, User, Users2, Smartphone, BookOpen, Printer, Sparkles, Loader2, Book, RefreshCw, GripVertical, Zap, Pencil, BarChart2, Eye, EyeOff, Copy, Clipboard, CheckSquare, Paperclip, ExternalLink, MoreHorizontal, Maximize2, Minimize2, FileSpreadsheet, Download, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getLessonSuggestion, generateWeeklyPlanFromYearlyPlan, checkWeeklyPlanAlignmentAI, generateMagicPlanning } from '../services/aiService';
import { LEHRPLAN_VS_2023 } from '../lehrplan';
import { LehrplanZuordnung } from '../types';
import { getFachHexColor, getFachThemeStyles } from '../lib/fachColorUtils';
import WochenplanExcelModal from './WochenplanExcelModal';
import { WochenplanImportRow } from '../lib/planerExcelService';
import { addWeeklyLessonToEmptyYearPlan, hasWeeklyPlanningDetails, mergeYearlySuggestionIntoEmptyWeeklySlot } from '../lib/planningSync';
import { yearPlanCellEntries } from '../lib/yearlyPlanData';
import { WochenplanGeneratorModal } from './wochenplan/WochenplanGeneratorModal';
import { buildSchoolYearWeekList, collectIncompleteWeeklyLessonSlots, configuredLessonTime, getPreviousCalendarWeekKw, weeklyLessonDurationSlots } from '../lib/weeklyPlanData';
import { parseLessonTimeRange } from '../lib/lessonTimeSlots';
import { getAttendanceSemester } from '../lib/attendanceData';
import { projectWeeklyPlanToClassbook } from '../lib/weeklyClassbookProjection';
import { splitKlassenbuchCategoryKey } from '../lib/klassenbuchSubjects';

const FACH_COLORS: Record<string, { bg: string, text: string, border: string }> = {
  'Deutsch': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Deutsch (Sprache)': { bg: 'bg-blue-50/80', text: 'text-blue-600', border: 'border-blue-100' }, // Legacy
  'Deutsch (Sprachbetrachtung)': { bg: 'bg-blue-50/80', text: 'text-blue-600', border: 'border-blue-100' },
  'Deutsch (Sprechen & Hören)': { bg: 'bg-blue-50/80', text: 'text-blue-600', border: 'border-blue-100' },
  'Deutsch (Förderung)': { bg: 'bg-blue-50/80', text: 'text-blue-600', border: 'border-blue-100' },
  'Deutsch (Lesen)': { bg: 'bg-blue-50/80', text: 'text-blue-600', border: 'border-blue-100' },
  'Deutsch (Rechtschreibung)': { bg: 'bg-blue-50/80', text: 'text-blue-600', border: 'border-blue-100' },
  'Deutsch (Verfassen von Texten)': { bg: 'bg-blue-50/80', text: 'text-blue-600', border: 'border-blue-100' },
  'Mathematik': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  'Mathematik (Ebene & Raum)': { bg: 'bg-red-50/80', text: 'text-red-700', border: 'border-red-100' },
  'Mathematik (Zahlen & Daten)': { bg: 'bg-red-50/80', text: 'text-red-700', border: 'border-red-100' },
  'Mathematik (Größen)': { bg: 'bg-red-50/80', text: 'text-red-700', border: 'border-red-100' },
  'Mathematik (Operationen)': { bg: 'bg-red-50/80', text: 'text-red-700', border: 'border-red-100' },
  'Sachunterricht': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Religion': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  'Englisch': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  'Musikerziehung': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'Bildnerische Erziehung': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  'Werken (TEC)': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'Werken (TEX)': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  'Bewegung und Sport': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  'Türkisch': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  'Freizeit': { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
  'Supplierstunde': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

export const DEUTSCH_THEMENBEREICHE = [
  { id: 'Deutsch (Lesen)', label: 'Lesen', icon: BookOpen, color: 'bg-sky-500 hover:bg-sky-600 border-sky-500 text-white' },
  { id: 'Deutsch (Sprachbetrachtung)', label: 'Sprachbetrachtung', icon: MessageSquare, color: 'bg-amber-500 hover:bg-amber-600 border-amber-500 text-white' },
  { id: 'Deutsch (Sprechen & Hören)', label: 'Sprechen & Hören', icon: Users, color: 'bg-cyan-600 hover:bg-cyan-700 border-cyan-600 text-white' },
  { id: 'Deutsch (Rechtschreibung)', label: 'Rechtschreibung', icon: Zap, color: 'bg-emerald-500 hover:bg-emerald-600 border-emerald-500 text-white' },
  { id: 'Deutsch (Verfassen von Texten)', label: 'Texte verfassen', icon: Pencil, color: 'bg-indigo-500 hover:bg-indigo-600 border-indigo-500 text-white' },
  { id: 'Deutsch (Förderung)', label: 'Förderung (FÖ)', icon: Star, color: 'bg-violet-600 hover:bg-violet-700 border-violet-600 text-white' }
];

export const MATHE_THEMENBEREICHE = [
  { id: 'Mathematik (Ebene & Raum)', label: 'Ebene & Raum' },
  { id: 'Mathematik (Zahlen & Daten)', label: 'Zahlen & Daten' },
  { id: 'Mathematik (Größen)', label: 'Größen' },
  { id: 'Mathematik (Operationen)', label: 'Operationen' },
];

export const isDeutschSubSubject = (f: string): boolean => {
  if (!f) return false;
  const lower = f.trim().toLowerCase();
  if (lower === 'deutsch' || lower === 'd') return false;
  if (lower.startsWith('deutsch (') || lower.startsWith('deutsch -') || lower.startsWith('deutsch:')) return true;
  if (DEUTSCH_UNTERFAECHER.some(uf => uf.toLowerCase() === lower)) return true;
  if (['lesen', 'sprache', 'sprachbetrachtung', 'sprechen & hören', 'sprechen und hören', 'hören', 'rechtschreiben', 'rechtschreibung', 'texte verfassen', 'verfassen von texten', 'schreiben', 'förderung', 'förderung (fö)', 'd-fö'].includes(lower)) return true;
  return false;
};

export const isMatheSubSubject = (f: string): boolean => {
  if (!f) return false;
  const lower = f.trim().toLocaleLowerCase('de-AT');
  if (lower === 'mathematik' || lower === 'mathe' || lower === 'm') return false;
  if (lower.startsWith('mathematik (') || lower.startsWith('mathematik -') || lower.startsWith('mathematik:')) return true;
  if (MATHEMATIK_UNTERFAECHER.some(uf => uf.toLocaleLowerCase('de-AT') === lower)) return true;
  return ['ebene & raum', 'zahlen & daten', 'größen', 'groessen', 'operationen'].includes(lower);
};

type LessonHalfDraft = {
  fach: string;
  unterbereich: string;
  thema: string;
  farbe: string;
};

const EMPTY_LESSON_HALF: LessonHalfDraft = {
  fach: '',
  unterbereich: '',
  thema: '',
  farbe: '#ffffff',
};

const getSubareaOptionsForSubject = (fach: string) => {
  if (fach === 'Deutsch') return DEUTSCH_THEMENBEREICHE.map(item => ({ id: item.id, label: item.label }));
  if (fach === 'Mathematik') return MATHE_THEMENBEREICHE.map(item => ({ id: item.id, label: item.label }));
  if (!fach) return [];
  return [{ id: fach + ' (Förderung)', label: 'Förderung (FÖ)' }];
};

const formatSchwerpunktLabel = (value: string) => {
  if (value === 'Deutsch (Förderung)' || value === 'D-FÖ') return 'D-FÖ';
  if (value === 'Deutsch (Sprache)') return 'Sprachbetrachtung';
  return value.replace('Deutsch (', '').replace('Mathematik (', '').replace(')', '');
};

const getContrastTextClass = (bgColor?: string): string => {
  if (!bgColor || bgColor === 'bg-white' || bgColor === 'white' || bgColor === 'bg-transparent' || bgColor === 'transparent') {
    return 'text-zinc-950';
  }
  const clean = bgColor.trim();
  
  if (clean.startsWith('#')) {
    const hex = clean.substring(1);
    const len = hex.length;
    let r = 255, g = 255, b = 255;
    if (len === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (len === 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq > 140 ? 'text-zinc-950' : 'text-white';
  } else if (clean.startsWith('rgb')) {
    const match = clean.match(/\d+/g);
    let r = 255, g = 255, b = 255;
    if (match && match.length >= 3) {
      r = parseInt(match[0], 10);
      g = parseInt(match[1], 10);
      b = parseInt(match[2], 10);
    }
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq > 140 ? 'text-zinc-950' : 'text-white';
  } else {
    const lower = clean.toLowerCase();
    if (
      lower.includes('-50') ||
      lower.includes('-100') ||
      lower.includes('-200') ||
      lower.includes('-300')
    ) {
      return 'text-zinc-950';
    }
    if (
      lower.includes('-700') ||
      lower.includes('-800') ||
      lower.includes('-900') ||
      lower.includes('-950') ||
      lower.includes('bg-black') ||
      lower.includes('bg-neutral-950') ||
      lower.includes('bg-slate-950') ||
      lower.includes('bg-indigo-950')
    ) {
      return 'text-white';
    }
    const numericMatch = lower.match(/-(\d{3})/);
    if (numericMatch) {
      const shade = parseInt(numericMatch[1], 10);
      if (shade >= 400) {
        if (lower.includes('yellow') || lower.includes('lime') || lower.includes('amber') || lower.includes('emerald-400') || lower.includes('green-400') || lower.includes('sky-300')) {
          return shade > 500 ? 'text-white' : 'text-zinc-950';
        }
        return 'text-white';
      }
    }
    if (
      lower.includes('white') ||
      lower.includes('rose-50') ||
      lower.includes('stone-50') ||
      lower.includes('emerald-50') ||
      lower.includes('slate-50') ||
      lower.includes('indigo-50') ||
      lower.includes('blue-50') ||
      lower.includes('pink-50') ||
      lower.includes('amber-50') ||
      lower.includes('orange-50') ||
      lower.includes('cyan-50') ||
      lower.includes('teal-50')
    ) {
      return 'text-zinc-950';
    }
    return 'text-white';
  }
};

export default function WeeklyPlan() {
  const { app, setApp, setPage } = useApp();

  const getFachColorKey = (fachName?: string) => {
    if (!fachName) return 'slate';
    const configColor = app.fachConfig?.[fachName]?.color;
    if (configColor && configColor !== 'slate') return configColor;
    const ln = fachName.toLowerCase();
    
    if (ln.includes('werken') || ln.includes('technik') || ln.includes('design')) return 'orange';
    if (ln.includes('bewegung') || ln.includes('sport')) return 'teal';
    if (ln.includes('fremdsprache') || ln.includes('englisch')) return 'sky';
    if (ln.includes('deutsch')) return 'blue';
    if (ln.includes('mathematik')) return 'red';
    if (ln.includes('sachunterricht')) return 'emerald';
    if (ln.includes('bildnerische') || ln.includes('kunst') || ln.includes('gestaltung')) return 'purple';
    if (ln.includes('musik')) return 'pink';
    if (ln.includes('religion')) return 'indigo';
    
    return configColor || 'slate';
  };

  const getFachStyle = (fach: string) => {
    const c = getFachColorKey(fach);
    
    const colorMap: Record<string, { bg: string, text: string, border: string }> = {
      blue: { bg: 'bg-blue-50 border-blue-200/50', text: 'text-blue-700', border: 'border-blue-200' },
      red: { bg: 'bg-red-50 border-red-200/50', text: 'text-red-700', border: 'border-red-200' },
      emerald: { bg: 'bg-emerald-50 border-emerald-200/50', text: 'text-emerald-700', border: 'border-emerald-200' },
      indigo: { bg: 'bg-indigo-50 border-indigo-200/50', text: 'text-indigo-700', border: 'border-indigo-200' },
      sky: { bg: 'bg-sky-50 border-sky-200/50', text: 'text-sky-700', border: 'border-sky-200' },
      purple: { bg: 'bg-purple-50 border-purple-200/50', text: 'text-purple-700', border: 'border-purple-200' },
      pink: { bg: 'bg-pink-50 border-pink-200/50', text: 'text-pink-700', border: 'border-pink-200' },
      orange: { bg: 'bg-orange-50 border-orange-200/50', text: 'text-orange-700', border: 'border-orange-200' },
      teal: { bg: 'bg-teal-50 border-teal-200/50', text: 'text-teal-700', border: 'border-teal-200' },
      slate: { bg: 'bg-slate-50 border-slate-200/50', text: 'text-slate-700', border: 'border-slate-200' },
      stone: { bg: 'bg-stone-50 border-stone-200/50', text: 'text-stone-700', border: 'border-stone-200' },
      amber: { bg: 'bg-amber-50 border-amber-200/50', text: 'text-amber-700', border: 'border-amber-200' },
      fuchsia: { bg: 'bg-fuchsia-50 border-fuchsia-200/50', text: 'text-fuchsia-700', border: 'border-fuchsia-200' },
      rose: { bg: 'bg-rose-50 border-rose-200/50', text: 'text-rose-700', border: 'border-rose-200' },
      yellow: { bg: 'bg-yellow-50 border-yellow-200/50', text: 'text-yellow-700', border: 'border-yellow-200' },
      lime: { bg: 'bg-lime-50 border-lime-200/50', text: 'text-lime-700', border: 'border-lime-200' },
      green: { bg: 'bg-green-50 border-green-200/50', text: 'text-green-700', border: 'border-green-200' },
      cyan: { bg: 'bg-cyan-50 border-cyan-200/50', text: 'text-cyan-700', border: 'border-cyan-200' },
      violet: { bg: 'bg-violet-50 border-violet-200/50', text: 'text-violet-700', border: 'border-violet-200' },
    };

    if (colorMap[c]) return colorMap[c];
    return getFachThemeStyles(fach, app.fachConfig);
  };

  const [editingCell, setEditingCell] = useState<{ tag: string, idx: number } | null>(null);
  const [plannerEditorTab, setPlannerEditorTab] = useState<'inhalt' | 'rahmen' | 'organisation' | 'optionen'>('inhalt');
  const [viewingCell, setViewingCell] = useState<{ tag: string, idx: number } | null>(null);
  const [yearPlanSyncNotice, setYearPlanSyncNotice] = useState<string | null>(null);
  const [editingZeitunabhaengig, setEditingZeitunabhaengig] = useState<{ tag: string; item?: any } | null>(null);
  const [tempZeitThema, setTempZeitThema] = useState('');
  const [tempZeitType, setTempZeitType] = useState<'event' | 'test' | 'konferenz' | 'spielefest' | 'gespraech' | 'sonstiges' | 'sa' | 'lzk' | 'standard'>('sonstiges');
  const [tempZeitGanztaegig, setTempZeitGanztaegig] = useState(false);
  const [hideEventsInView, setHideEventsInView] = useState(false);
  const [repeatWeekly, setRepeatWeekly] = useState<boolean>(false);
  const [searchFach, setSearchFach] = useState('');
  const [tempThema, setTempThema] = useState('');
  const [tempType, setTempType] = useState('standard');
  const [tempMaterial, setTempMaterial] = useState('');
  const [tempMaterialIds, setTempMaterialIds] = useState<string[]>([]);
  const [tempHUE, setTempHUE] = useState('');
  const [tempMethod, setTempMethod] = useState('');
  const [tempSocial, setTempSocial] = useState('single');
  const [tempReflexion, setTempReflexion] = useState('');
  const [tempSchwerpunkte, setTempSchwerpunkte] = useState<string[]>([]);
  const [tempSplitLesson, setTempSplitLesson] = useState(false);
  const [tempFirstHalf, setTempFirstHalf] = useState<LessonHalfDraft>({ ...EMPTY_LESSON_HALF });
  const [tempSecondHalf, setTempSecondHalf] = useState<LessonHalfDraft>({ ...EMPTY_LESSON_HALF });
  const [tempDuration, setTempDuration] = useState<number | 'all'>(1);
  const [syncWpSubjects, setSyncWpSubjects] = useState(false);
  const [showDraftsSelector, setShowDraftsSelector] = useState(false);
  const [showLehrplanModal, setShowLehrplanModal] = useState<any>(null); // { tag, idx }
  const [lehrplanStep, setLehrplanStep] = useState(1);
  const [lpFach, setLpFach] = useState('');
  const [lpKB, setLpKB] = useState('');
  const [lpAB, setLpAB] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCheckLoading, setAiCheckLoading] = useState(false);
  const [aiCheckResult, setAiCheckResult] = useState<string | null>(null);
  
  const [showSollCheck, setShowSollCheck] = useState(false);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [dateStatusMenu, setDateStatusMenu] = useState<string | null>(null); // date string
  const [viewMode, setViewMode] = useState<'grid' | 'day' | 'klassenbuch'>('grid');
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const today = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][new Date().getDay()];
    return TAGE_NAMEN.includes(today) ? today : 'Montag';
  });
  const [showWeekMenu, setShowWeekMenu] = useState(false);
  const [showSyncSettingsModal, setShowSyncSettingsModal] = useState(false);
  const [showDenkzettelDraw, setShowDenkzettelDraw] = useState(false);
  const [assigningNote, setAssigningNote] = useState<any | null>(null);
  const [draggedLesson, setDraggedLesson] = useState<{tag: string, idx: number} | null>(null);
  
  // New state variables for custom planning enhancements
  const [showSuggestionsDraw, setShowSuggestionsDraw] = useState(false);
  const [showMagicPlanerPopup, setShowMagicPlanerPopup] = useState(false);
  const [magicPlanerLoading, setMagicPlanerLoading] = useState(false);
  const [magicPlanerResult, setMagicPlanerResult] = useState<any>(null);
  const [magicExtraPrompt, setMagicExtraPrompt] = useState('');
  
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInStep, setCheckInStep] = useState(1);
  const [checkInHighlight, setCheckInHighlight] = useState('');
  const [checkInFocusStudent, setCheckInFocusStudent] = useState('');
  const [checkInFocusNote, setCheckInFocusNote] = useState('');
  const [checkInExtraTodos, setCheckInExtraTodos] = useState('');
  const [copiedLesson, setCopiedLesson] = useState<any | null>(null);
  const [draggedOverCell, setDraggedOverCell] = useState<{tag: string, idx: number} | null>(null);
  const [showSchuelerWochenplanModal, setShowSchuelerWochenplanModal] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const [navHeight, setNavHeight] = useState(120);
  
  const actualToday = new Date();

  // Copy/Clear functions
  const copyFromLastWeek = () => {
    if (!window.confirm('Achtung: Dies überschreibt die aktuelle Woche! Fortfahren?')) return;
    setApp(prev => {
      const wp = { ...(prev.wochenplanung || {}) };
      const previousKw = getPreviousCalendarWeekKw(activeKW, prev.schuljahr);
      const lastWp = wp[previousKw];
      if (lastWp) {
        wp[activeKW] = JSON.parse(JSON.stringify(lastWp));
      }
      return { ...prev, wochenplanung: wp };
    });
    setShowWeekMenu(false);
  };
  
  const clearCurrentWeek = () => {
    if (!window.confirm('Woche wirklich komplett leeren? (Stammplan bleibt)')) return;
    setApp(prev => {
      const wp = { ...(prev.wochenplanung || {}) };
      delete wp[activeKW];
      return { ...prev, wochenplanung: wp };
    });
    setShowWeekMenu(false);
  };

  const syncWithStammplan = () => {
    if (!window.confirm('Möchten Sie diese Woche mit dem Stammplan synchronisieren? Dies setzt alle Fächer in dieser Woche auf die Fächer des Stammplans zurück (Themen und Hausübungen bleiben erhalten).')) return;
    setApp(prev => {
      const wp = { ...(prev.wochenplanung || {}) };
      const currentWeekObj = { ...(wp[activeKW] || {}) };
      
      const stamm = prev.stammplan || {};
      
      Object.keys(stamm).forEach(tag => {
        if (!currentWeekObj[tag]) currentWeekObj[tag] = {};
        const dayLessons = { ...(currentWeekObj[tag] || {}) };
        
        Object.keys(stamm[tag] || {}).forEach(idxStr => {
          const idx = parseInt(idxStr);
          const targetIdx = idx - 1; // 0-indexed target in wochenplanung
          const stammFach = stamm[tag]?.[idx];
          
          if (stammFach) {
            dayLessons[targetIdx] = {
              ...(dayLessons[targetIdx] || {}),
              fach: stammFach
            };
          } else {
            // Stammplan has nothing here, if weekly plan has a subject, clear it
            if (dayLessons[targetIdx]) {
              const updatedLesson = { ...dayLessons[targetIdx] };
              delete updatedLesson.fach;
              if (Object.keys(updatedLesson).length === 0 || (Object.keys(updatedLesson).length === 1 && updatedLesson.erledigt !== undefined && !updatedLesson.erledigt)) {
                delete dayLessons[targetIdx];
              } else {
                dayLessons[targetIdx] = updatedLesson;
              }
            }
          }
        });
        
        currentWeekObj[tag] = dayLessons;
      });
      
      wp[activeKW] = currentWeekObj;
      return { ...prev, wochenplanung: wp };
    });
    setShowWeekMenu(false);
  };

  const handleAddZeitunabhaengig = (tag: string) => {
    setEditingZeitunabhaengig({ tag });
    setTempZeitThema('');
    setTempZeitType('sonstiges');
    setTempZeitGanztaegig(false);
  };

  const handleEditZeitunabhaengig = (tag: string, item: any) => {
    setEditingZeitunabhaengig({ tag, item });
    setTempZeitThema(item.thema || '');
    setTempZeitType(item.type || 'sonstiges');
    setTempZeitGanztaegig(!!item.ganztaegig);
  };

  const handleSaveZeitunabhaengig = () => {
    if (!editingZeitunabhaengig) return;
    const { tag, item } = editingZeitunabhaengig;
    if (!tempZeitThema.trim()) return;

    setApp(prev => {
      const wp = { ...(prev.wochenplanung || {}) };
      const currentWeekObj = { ...(wp[activeKW] || {}) };
      if (!currentWeekObj[tag]) currentWeekObj[tag] = {};

      const list = [...(currentWeekObj[tag].zeitunabhaengig || [])];
      
      if (item) {
        // Edit existing
        const idx = list.findIndex(i => i.id === item.id);
        if (idx !== -1) {
          list[idx] = {
            ...list[idx],
            thema: tempZeitThema.trim(),
            type: tempZeitType,
            ganztaegig: tempZeitGanztaegig
          };
        }
      } else {
        // Add new
        list.push({
          id: `zt-${Date.now()}-${Math.random()}`,
          thema: tempZeitThema.trim(),
          type: tempZeitType,
          ganztaegig: tempZeitGanztaegig,
          erledigt: false
        });
      }

      currentWeekObj[tag] = {
        ...currentWeekObj[tag],
        zeitunabhaengig: list
      };

      wp[activeKW] = currentWeekObj;
      return { ...prev, wochenplanung: wp };
    });

    setEditingZeitunabhaengig(null);
  };

  const handleDeleteZeitunabhaengig = () => {
    if (!editingZeitunabhaengig || !editingZeitunabhaengig.item) return;
    const { tag, item } = editingZeitunabhaengig;

    setApp(prev => {
      const wp = { ...(prev.wochenplanung || {}) };
      const currentWeekObj = { ...(wp[activeKW] || {}) };
      if (!currentWeekObj[tag]) return prev;

      const list = (currentWeekObj[tag].zeitunabhaengig || []).filter((i: any) => i.id !== item.id);

      currentWeekObj[tag] = {
        ...currentWeekObj[tag],
        zeitunabhaengig: list
      };

      wp[activeKW] = currentWeekObj;
      return { ...prev, wochenplanung: wp };
    });

    setEditingZeitunabhaengig(null);
  };

  const runWeeklyPlanAlignmentCheckAI = async () => {
    const yearlyTopics = app.jahresplanung?.[activeKW] || {};
    const weeklyPlan = app.wochenplanung?.[activeKW] || {};
    
    if (Object.keys(yearlyTopics).length === 0) {
      setAiCheckResult("Keine Themen in der Jahresplanung für diese Woche gefunden.");
      return;
    }

    setAiCheckLoading(true);
    setAiCheckResult(null);
    try {
      const result = await checkWeeklyPlanAlignmentAI(yearlyTopics, weeklyPlan);
      setAiCheckResult(result);
    } catch (e) {
      console.error(e);
      setAiCheckResult("Fehler bei der KI-Prüfung.");
    } finally {
      setAiCheckLoading(false);
    }
  };

  const generateWeekFromYearlyPlanAI = async () => {
    const yearlyTopics = app.jahresplanung?.[activeKW] || {};
    if (Object.keys(yearlyTopics).length === 0) {
      alert("Es gibt keine Themen in der Jahresplanung für diese Woche.");
      return;
    }
    
    // First, sync with stammplan (silently) to have the base layout
    const stamm = app.stammplan || {};
    const baseWochenplanung = { ...(app.wochenplanung?.[activeKW] || {}) };
    
    // If empty, prefill with stammplan subjects
    Object.keys(stamm).forEach(tag => {
      if (!baseWochenplanung[tag]) baseWochenplanung[tag] = {};
      Object.keys(stamm[tag] || {}).forEach(idxStr => {
        const idx = parseInt(idxStr);
        const targetIdx = idx - 1; // 0-indexed target in baseWochenplanung
        if (!baseWochenplanung[tag][targetIdx]?.fach && stamm[tag]?.[idx]) {
          baseWochenplanung[tag][targetIdx] = { ...baseWochenplanung[tag][targetIdx], fach: stamm[tag][idx] };
        }
      });
    });

    setAiLoading(true);
    try {
      const assignments = await generateWeeklyPlanFromYearlyPlan(app.stufe || 4, yearlyTopics, baseWochenplanung);
      if (typeof assignments === 'string') {
        alert(assignments);
      } else if (Array.isArray(assignments)) {
        setApp(prev => {
          const wp = { ...(prev.wochenplanung || {}) };
          const weekPlan = { ...(wp[activeKW] || baseWochenplanung) };

          assignments.forEach(assign => {
            if (!weekPlan[assign.tag]) weekPlan[assign.tag] = {};
            const lesson = { ...(weekPlan[assign.tag][assign.idx] || {}) };
            
            // Do not override user's explicitly typed thema unless it's empty
            lesson.thema = assign.thema;
            if (assign.buch) lesson.buch = assign.buch;
            if (assign.subCategory) lesson.subCategory = assign.subCategory;
            if (assign.subCategories && assign.subCategories.length > 0) {
              lesson.schwerpunkte = assign.subCategories;
            } else if (assign.subCategory) {
              lesson.schwerpunkte = [assign.subCategory];
            }
            if (assign.type) lesson.type = assign.type;
            
            weekPlan[assign.tag][assign.idx] = lesson;
          });

          wp[activeKW] = weekPlan;
          return { ...prev, wochenplanung: wp };
        });
        alert("Wochenplan wurde mit der KI befüllt!");
      }
    } catch (e) {
      console.error(e);
      alert("Fehler bei der KI-Generierung.");
    } finally {
      setAiLoading(false);
      setShowWeekMenu(false);
    }
  };

  const handleDragStartPlan = (e: React.DragEvent, tag: string, idx: number) => {
    e.dataTransfer.setData('sourceCell', JSON.stringify({ tag, idx }));
    setDraggedLesson({ tag, idx });
  };
  
  const handleDropPlan = (e: React.DragEvent, targetTag: string, targetIdx: number) => {
    e.preventDefault();
    setDraggedLesson(null);
    const textData = e.dataTransfer.getData('text/plain');
    const sourceDataStr = e.dataTransfer.getData('sourceCell');
    const yearlyItemStr = e.dataTransfer.getData('yearlyItem');
    const parkedIndexStr = e.dataTransfer.getData('parkedLessonIndex');
    
    if (sourceDataStr) {
       // internal drag and drop
       const sourceData = safeJsonParse(sourceDataStr, null);
       if (!sourceData) return;
       if (sourceData.tag === targetTag && sourceData.idx === targetIdx) return;
       
       setApp(prev => {
         const wp = { ...(prev.wochenplanung || {}) };
         const currentWeekObj = { ...wp[activeKW] };
         
         if (!currentWeekObj[sourceData.tag]) currentWeekObj[sourceData.tag] = {};
         if (!currentWeekObj[targetTag]) currentWeekObj[targetTag] = {};
         
         const sourceItem = currentWeekObj[sourceData.tag][sourceData.idx];
         const targetItem = currentWeekObj[targetTag][targetIdx];
         
         currentWeekObj[targetTag][targetIdx] = sourceItem;
         
         if (targetItem) {
            currentWeekObj[sourceData.tag][sourceData.idx] = targetItem;
         } else {
            delete currentWeekObj[sourceData.tag][sourceData.idx];
         }
         
         wp[activeKW] = currentWeekObj;
         return { ...prev, wochenplanung: wp };
       });
    } else if (yearlyItemStr) {
       const yearlyData = safeJsonParse(yearlyItemStr, null);
       if (!yearlyData) return;
       const sourceSubject = sortYearlySubjects(app.jahresplan_faecher || DEFAULT_YEARLY_SUBJECTS)
         .find(subject => subject.id === yearlyData.subjectId);
       const suggestedSubject = sourceSubject?.label === 'SU' ? 'Sachunterricht'
         : sourceSubject?.label === 'Checks/SA' ? ''
         : sourceSubject?.label || '';
       const currentSlot = app.wochenplanung?.[activeKW]?.[targetTag]?.[targetIdx];
       const preview = mergeYearlySuggestionIntoEmptyWeeklySlot(currentSlot, yearlyData, suggestedSubject);
       if (preview.status !== 'added') {
         window.alert(preview.status === 'occupied'
           ? 'Diese Unterrichtsstunde enthält bereits eine Planung. Bitte wähle einen freien Platz; es wurde nichts überschrieben.'
           : 'Für diese Übernahme fehlt ein Jahresthema.');
         return;
       }
       setApp(prev => {
         const wp = { ...(prev.wochenplanung || {}) };
         const currentWeekObj = { ...(wp[activeKW] || {}) };
         const currentDay = { ...(currentWeekObj[targetTag] || {}) };
         const safeResult = mergeYearlySuggestionIntoEmptyWeeklySlot(
           currentDay[targetIdx], yearlyData, suggestedSubject,
         );
         if (safeResult.status !== 'added') return prev;
         currentDay[targetIdx] = safeResult.lesson;
         currentWeekObj[targetTag] = currentDay;
         wp[activeKW] = currentWeekObj;
         return { ...prev, wochenplanung: wp };
       });
    } else if (parkedIndexStr !== '' && parkedIndexStr !== undefined && parkedIndexStr !== null) {
       const pIdx = parseInt(parkedIndexStr, 10);
       setApp(prev => {
         const parked = [...(prev.parkgarage || [])];
         const item = parked[pIdx];
         if (!item) return prev;

         // Remove from parked
         parked.splice(pIdx, 1);

         // Place into weekly plan
         const wp = { ...(prev.wochenplanung || {}) };
         const currentWeekObj = { ...wp[activeKW] };
         if (!currentWeekObj[targetTag]) currentWeekObj[targetTag] = {};

         currentWeekObj[targetTag][targetIdx] = {
           fach: item.fach,
           thema: item.thema,
           type: item.type || 'standard',
           material: item.material || '',
           hue: item.hue || '',
           method: item.method || '',
           social: item.social || 'single',
           reflexion: item.reflexion || '',
           schwerpunkte: item.schwerpunkte || [],
           duration: item.duration || 1,
           erledigt: item.erledigt || false
         };

         wp[activeKW] = currentWeekObj;
         return { ...prev, wochenplanung: wp, parkgarage: parked };
       });
    } else if (textData) {
       // A plain-text drop can contain a yearly theme, but is never allowed to
       // replace existing text, homework or a differently assigned subject.
       const current = app.wochenplanung?.[activeKW]?.[targetTag]?.[targetIdx];
       const preview = mergeYearlySuggestionIntoEmptyWeeklySlot(current, { thema: textData });
       if (preview.status !== 'added') {
         window.alert('Diese Unterrichtsstunde ist bereits geplant. Der Inhalt wurde nicht überschrieben.');
         return;
       }
       setApp(prev => {
         const wp = { ...(prev.wochenplanung || {}) };
         const currentWeekObj = { ...(wp[activeKW] || {}) };
         const currentDay = { ...(currentWeekObj[targetTag] || {}) };
         const result = mergeYearlySuggestionIntoEmptyWeeklySlot(currentDay[targetIdx], { thema: textData });
         if (result.status !== 'added') return prev;
         currentDay[targetIdx] = result.lesson;
         currentWeekObj[targetTag] = currentDay;
         wp[activeKW] = currentWeekObj;
         return { ...prev, wochenplanung: wp };
       });
    }
  };

  const actualKW = getKW(actualToday);
  const activeKW = app.currentKW || actualKW;

  const parkedLessons = app.parkgarage || [];

  const incompleteWeeklySlots = useMemo(
    () => collectIncompleteWeeklyLessonSlots(app.wochenplanung?.[activeKW]),
    [app.wochenplanung, activeKW],
  );

  const incompleteDenkzettelNotes = useMemo(() => {
    return (app.denkzettelNotes || []).filter((note: any) => !note.completed);
  }, [app.denkzettelNotes]);

  const isYearlyItemScheduled = (item: any) => {
    if (!item || !item.thema) return false;
    const currentWeekPlan = app.wochenplanung?.[activeKW] || {};
    const content = `${item.thema}${item.buch ? ` (${item.buch})` : ''}`.trim().toLowerCase();
    const themeOnly = item.thema.trim().toLowerCase();
    
    return Object.values(currentWeekPlan).some((dayPlan: any) => {
      if (!dayPlan) return false;
      return Object.values(dayPlan).some((cell: any) => {
        if (!cell || !cell.thema) return false;
        const cellThema = cell.thema.trim().toLowerCase();
        return (
          cellThema === content || 
          cellThema === themeOnly || 
          cellThema.includes(themeOnly) || 
          themeOnly.includes(cellThema)
        );
      });
    });
  };
  
  const startYear = getStartYear(app.schuljahr);
  const year = kwYear(activeKW, startYear);
  const monday = kwToMonday(activeKW, year);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const [showStatsMenu, setShowStatsMenu] = useState(false);
  const [showQuickPlanModal, setShowQuickPlanModal] = useState<boolean>(false);
  const [quickPlanType, setQuickPlanType] = useState<'stunde' | 'termin' | 'test' | 'ausflug'>('stunde');
  const [quickPlanTag, setQuickPlanTag] = useState<string>('Montag');
  const [quickPlanStunde, setQuickPlanStunde] = useState<number>(0);
  const [quickPlanFach, setQuickPlanFach] = useState<string>('');
  const [quickPlanThema, setQuickPlanThema] = useState<string>('');
  const [showMoreDetailsInModal, setShowMoreDetailsInModal] = useState<boolean>(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);

  React.useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const handleWochenplanImport = (importedRows: WochenplanImportRow[], targetKW: number, mode: 'overwrite' | 'merge') => {
    setApp(prev => {
      const existingWp = prev.wochenplanung || {};
      const existingWeek = existingWp[targetKW] || {};

      // Always start from the current week. "Overwrite" applies only to slots
      // explicitly present in the import file; omitted rows must never delete lessons.
      let newWeekData: Record<string, any> = JSON.parse(JSON.stringify(existingWeek));

      importedRows.forEach(row => {
        const tag = row.tag;
        if (!newWeekData[tag]) {
          newWeekData[tag] = {};
        }

        const existingSlot = newWeekData[tag][row.idx];

        if (mode === 'merge' && existingSlot && existingSlot.thema && !row.thema) {
          return;
        }

        newWeekData[tag][row.idx] = {
          ...(existingSlot || {}),
          fach: row.fach || existingSlot?.fach || '',
          thema: row.thema || existingSlot?.thema || '',
          lernziel: row.lernziel || existingSlot?.lernziel || '',
          material: row.material || existingSlot?.material || '',
          housework: row.housework || existingSlot?.housework || '',
          reflexion: row.reflexion || existingSlot?.reflexion || '',
          zeit: row.uhrzeit || existingSlot?.zeit || configuredLessonTime(prev.stundenZeiten, STUNDEN_INFO, row.stunde),
        };
      });

      return {
        ...prev,
        wochenplanung: {
          ...existingWp,
          [targetKW]: newWeekData,
        },
        currentKW: targetKW,
      };
    });
  };

  // "Vorbereitet" bedeutet eine in der Wochenplanung eingegebene Stunde, nicht "erledigt".
  // Ein bloßes Fach aus dem Stammplan füllt den Nenner, aber nicht den Zähler.
  const lessonHasPreparation = (item: any): boolean => Boolean(item && typeof item === 'object' && (
    String(item.fach || '').trim() ||
    hasWeeklyPlanningDetails(item) ||
    ['lernziel', 'beschreibung', 'notiz', 'notizen', 'hue', 'buch'].some(key => String(item[key] || '').trim()) ||
    (Array.isArray(item.schwerpunkte) && item.schwerpunkte.length > 0)
  ));

  const weekMetrics = useMemo(() => {
    let total = 0;
    let prepared = 0;
    const currentWeekPlan = app.wochenplanung?.[activeKW] || {};
    TAGE_NAMEN.forEach(tag => {
      for (let idx = 0; idx < MAX_LESSON_SLOTS; idx++) {
        const item = currentWeekPlan[tag]?.[idx];
        const stammFach = app.stammplan?.[tag]?.[idx + 1] || '';
        if (item?.fach || item?.thema || stammFach) {
          total++;
          if (lessonHasPreparation(item)) prepared++;
        }
      }
    });
    return {
      total,
      prepared,
      open: Math.max(0, total - prepared)
    };
  }, [app.wochenplanung, app.stammplan, activeKW]);

  const thisWeekImportantEvents = useMemo(() => {
    const events: Array<{ id: string; tag: string; label: string; type: string; isTest?: boolean }> = [];
    const currentWeekPlan = app.wochenplanung?.[activeKW] || {};
    
    TAGE_NAMEN.forEach(tag => {
      const dayData = currentWeekPlan[tag] || {};
      const list = dayData.zeitunabhaengig || [];
      list.forEach((item: any) => {
        if (item?.thema) {
          events.push({
            id: item.id || `${tag}-${item.thema}`,
            tag,
            label: item.thema,
            type: item.type || 'termin',
            isTest: item.type === 'test' || item.type === 'sa'
          });
        }
      });

      for (let i = 0; i < MAX_LESSON_SLOTS; i++) {
        const item = dayData[i];
        if (item && (item.type === 'sa' || item.type === 'test' || item.type === 'event')) {
          events.push({
            id: `slot-${tag}-${i}`,
            tag,
            label: `${item.fach ? item.fach + ': ' : ''}${item.thema || 'Termin'} (${i + 1}. Std)`,
            type: item.type,
            isTest: item.type === 'sa' || item.type === 'test'
          });
        }
      }
    });

    return events;
  }, [app.wochenplanung, activeKW]);

  const handleQuickPlanSubmit = () => {
    if (!quickPlanThema.trim() && quickPlanType === 'stunde' && !quickPlanFach.trim()) return;
    
    if (quickPlanType === 'stunde' || quickPlanType === 'test') {
      setApp(prev => {
        const wp = { ...(prev.wochenplanung || {}) };
        const currentWeekObj = { ...wp[activeKW] };
        if (!currentWeekObj[quickPlanTag]) currentWeekObj[quickPlanTag] = {};
        
        currentWeekObj[quickPlanTag][quickPlanStunde] = {
          ...(currentWeekObj[quickPlanTag][quickPlanStunde] || {}),
          fach: quickPlanFach.trim(),
          thema: quickPlanThema.trim(),
          type: quickPlanType === 'test' ? 'test' : 'standard',
          erledigt: false
        };
        
        wp[activeKW] = currentWeekObj;
        return { ...prev, wochenplanung: wp };
      });
    } else {
      setApp(prev => {
        const wp = { ...(prev.wochenplanung || {}) };
        const currentWeekObj = { ...wp[activeKW] };
        if (!currentWeekObj[quickPlanTag]) currentWeekObj[quickPlanTag] = {};
        const list = currentWeekObj[quickPlanTag].zeitunabhaengig || [];
        
        const newEntry = {
          id: `zu-${Date.now()}`,
          thema: quickPlanThema.trim(),
          type: quickPlanType === 'ausflug' ? 'event' : 'termin'
        };
        
        currentWeekObj[quickPlanTag].zeitunabhaengig = [...list, newEntry];
        wp[activeKW] = currentWeekObj;
        return { ...prev, wochenplanung: wp };
      });
    }
    
    setShowQuickPlanModal(false);
    setQuickPlanFach('');
    setQuickPlanThema('');
  };

  const getMonthlyStats = () => {
    const stats: Record<string, number> = {
      'Lesen': 0,
      'Rechtschreibung': 0,
      'Sprachbetrachtung': 0,
      'Sprechen & Hören': 0,
      'Verfassen von Texten': 0
    };

    const currentMonth = monday.getMonth();
    const currentYearStr = monday.getFullYear();

    Object.entries(app.wochenplanung || {}).forEach(([kwStr, kwPlan]: [string, any]) => {
      const kwNum = parseInt(kwStr);
      const kwYearVal = kwYear(kwNum, startYear);
      const kwMon = kwToMonday(kwNum, kwYearVal);

      if (kwMon.getMonth() === currentMonth && kwMon.getFullYear() === currentYearStr) {
         Object.values(kwPlan).forEach((dayPlan: any) => {
           Object.values(dayPlan).forEach((lesson: any) => {
              if (lesson.schwerpunkte && Array.isArray(lesson.schwerpunkte)) {
                 lesson.schwerpunkte.forEach((sp: string) => {
                    const spLower = sp.toLowerCase();
                    if (spLower.includes('lesen') || spLower === 'l' || spLower === 'deutsch (lesen)') stats['Lesen']++;
                    if (spLower.includes('rechtschreibung') || spLower === 'rs' || spLower === 'deutsch (rechtschreibung)') stats['Rechtschreibung']++;
                    if (spLower.includes('sprachbetrachtung') || spLower === 'sp' || spLower === 'deutsch (sprache)') stats['Sprachbetrachtung']++;
                    if (spLower.includes('sprechen & hören') || spLower.includes('sprechen und hören')) stats['Sprechen & Hören']++;
                    if (spLower.includes('verfassen') || spLower === 'vt' || spLower.includes('texte') || spLower === 'deutsch (verfassen von texten)') stats['Verfassen von Texten']++;
                 });
              }
           });
         });
      }
    });

    const maxCount = Math.max(...Object.values(stats), 10);
    
    return [
      { label: 'Lesen', count: stats['Lesen'], color: 'bg-sky-500', iconColor: 'text-sky-500', icon: BookOpen, maxCount },
      { label: 'Rechtschreibung', count: stats['Rechtschreibung'], color: 'bg-emerald-500', iconColor: 'text-emerald-500', icon: Zap, maxCount },
      { label: 'Sprachbetrachtung', count: stats['Sprachbetrachtung'], color: 'bg-amber-500', iconColor: 'text-amber-500', icon: MessageSquare, maxCount },
      { label: 'Sprechen & Hören', count: stats['Sprechen & Hören'], color: 'bg-cyan-600', iconColor: 'text-cyan-600', icon: Users, maxCount },
      { label: 'Verfassen von Texten', count: stats['Verfassen von Texten'], color: 'bg-indigo-500', iconColor: 'text-indigo-500', icon: Pencil, maxCount },
    ];
  };

  const getDayStatus = (date: Date) => {
    const dateStr = formatLocalDateKey(date);
    const override = app.calendarOverrides?.[dateStr];
    if (override) return { status: override, isOverride: true, holidayName: isHoliday(date, app.calendarSettings?.disabledHolidays || [], app.bundesland || 'VBG') };
    
    const holiday = isHoliday(date, app.calendarSettings?.disabledHolidays || [], app.bundesland || 'VBG');
    return { status: (holiday ? 'free' : 'school') as 'school' | 'free', isOverride: false, holidayName: holiday };
  };

  // Klassenbuch-Ansicht und Druckzentrum nutzen dieselbe Projektion der gespeicherten Wochenplanung.
  const getKlassenbuchData = () => projectWeeklyPlanToClassbook(
    (app.wochenplanung || {})[activeKW],
    { activeSubjects: app.faecher, stammplan: app.stammplan,
      materialTitlesById: Object.fromEntries((app.materialien || []).map(material => [material.id, material.titel])) },
  );

  const hasFreeDayInWeek = useMemo(() => {
    return [0, 1, 2, 3, 4].some(i => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const { status } = getDayStatus(date);
      return status === 'free';
    });
  }, [monday, app.calendarOverrides, app.calendarSettings]);

  const freeWeekInfo = useMemo(() => {
    const days = [0, 1, 2, 3, 4].map((offset) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + offset);
      return getDayStatus(date);
    });
    const holidayNames = Array.from(
      new Set(days.map((day) => day.holidayName).filter(Boolean)),
    ) as string[];
    return {
      isEntireWeekFree: days.every((day) => day.status === "free"),
      label: holidayNames.join(" · ") || "Schulfreie Woche",
    };
  }, [monday, app.calendarOverrides, app.calendarSettings, app.bundesland]);

  const sw = getSW(monday, app.schuljahr, app.bundesland || 'VBG');
  const plan = (app.wochenplanung || {})[activeKW] || {};
  const lunchAfterSlot = Math.max(1, Math.min(MAX_LESSON_SLOTS - 1, app.mittagspauseNachStunde || 5));

  const isCurrentHour = (tag: string, zIdx: number): boolean => {
    const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const now = new Date();
    const dayName = days[now.getDay()];
    if (dayName !== tag) return false;

    const timeString = configuredLessonTime(app.stundenZeiten, STUNDEN_INFO, zIdx + 1);
    const parsed = parseLessonTimeRange(timeString);
    if (!parsed) return false;

    const minuteOfDay = now.getHours() * 60 + now.getMinutes();
    return minuteOfDay >= parsed.start && minuteOfDay < parsed.end;
  };

  const getDayProgress = (tag: string) => {
    const dayData = plan[tag] || {};
    let total = 0;
    let prepared = 0;
    let completed = 0;
    for (let idx = 0; idx < MAX_LESSON_SLOTS; idx++) {
      const item = dayData[idx];
      const displayFach = item?.fach || app.stammplan?.[tag]?.[idx + 1] || '';
      if (displayFach || item?.thema) {
        total++;
        if (lessonHasPreparation(item)) prepared++;
        if (item?.erledigt) completed++;
      }
    }
    return { total, prepared, completed, percent: total > 0 ? Math.round((prepared / total) * 100) : 0 };
  };

  const pasteLessonBlock = (e: React.MouseEvent, tag: string, idx: number) => {
    e.stopPropagation();
    if (!copiedLesson) return;
    setApp(prev => {
      const wp = { ...(prev.wochenplanung || {}) };
      const currentWeekObj = { ...wp[activeKW] };
      if (!currentWeekObj[tag]) currentWeekObj[tag] = {};
      
      currentWeekObj[tag][idx] = { 
        ...copiedLesson, 
        id: Math.random().toString(36).substr(2, 9),
        erledigt: false 
      };
      
      wp[activeKW] = currentWeekObj;
      return { ...prev, wochenplanung: wp };
    });
    setCopiedLesson(null);
  };

  const duplicateLessonBlock = (e: React.MouseEvent, tag: string, idx: number) => {
    e.stopPropagation();
    const item = plan[tag]?.[idx];
    if (!item) return;
    
    const nextIdx = idx + 1;
    if (nextIdx < MAX_LESSON_SLOTS) {
      setApp(prev => {
        const wp = { ...(prev.wochenplanung || {}) };
        const currentWeekObj = { ...wp[activeKW] };
        if (!currentWeekObj[tag]) currentWeekObj[tag] = {};
        
        currentWeekObj[tag][nextIdx] = { 
          ...item, 
          id: Math.random().toString(36).substr(2, 9), 
          erledigt: false 
        };
        
        wp[activeKW] = currentWeekObj;
        return { ...prev, wochenplanung: wp };
      });
    }
  };

  useLayoutEffect(() => {
    if (headerRef.current) {
      const updateHeight = () => {
        const h = headerRef.current?.offsetHeight || 120;
        setNavHeight(h);
      };
      const resizeObserver = new ResizeObserver(updateHeight);
      resizeObserver.observe(headerRef.current);
      updateHeight();
      return () => resizeObserver.disconnect();
    }
  }, []);

  const autoSuggestSchwerpunkt = () => {
    const stats = getMonthlyStats();
    stats.sort((a, b) => a.count - b.count);
    const rarest = stats[0]?.label;
    const mapping: Record<string, string> = {
      'Lesen': 'Deutsch (Lesen)',
      'Rechtschreibung': 'Deutsch (Rechtschreibung)',
      'Sprachbetrachtung': 'Deutsch (Sprachbetrachtung)',
      'Sprechen & Hören': 'Deutsch (Sprechen & Hören)',
      'Verfassen von Texten': 'Deutsch (Verfassen von Texten)'
    };
    return rarest && mapping[rarest] ? [mapping[rarest]] : [];
  };

  const handleSetSearchFach = (f: string) => {
    let normalized = f;
    if (isDeutschSubSubject(f)) {
      normalized = 'Deutsch';
      const legacyMap: Record<string, string> = {
        'Deutsch (Sprache)': 'Deutsch (Sprachbetrachtung)',
        'Sprache': 'Deutsch (Sprachbetrachtung)',
      };
      const canonical = legacyMap[f] || f;
      const matchingUf = DEUTSCH_UNTERFAECHER.find(uf =>
        uf.toLocaleLowerCase('de-AT') === canonical.toLocaleLowerCase('de-AT') ||
        uf.toLocaleLowerCase('de-AT').includes(canonical.toLocaleLowerCase('de-AT'))
      );
      setTempSchwerpunkte([matchingUf || canonical]);
    } else if (isMatheSubSubject(f)) {
      normalized = 'Mathematik';
      const matchingUf = MATHEMATIK_UNTERFAECHER.find(uf =>
        uf.toLocaleLowerCase('de-AT') === f.toLocaleLowerCase('de-AT') ||
        uf.toLocaleLowerCase('de-AT').includes(f.toLocaleLowerCase('de-AT'))
      );
      setTempSchwerpunkte([matchingUf || f]);
    } else if (f !== 'Deutsch' && f !== 'Mathematik' && !f.startsWith('Deutsch') && !f.startsWith('Mathematik')) {
      setTempSchwerpunkte([]);
    } else if (f === 'Deutsch' && app.autoSuggestSchwerpunkte) {
      setTempSchwerpunkte(prev => prev.length > 0 ? prev : autoSuggestSchwerpunkt());
    }
    setSearchFach(normalized);
  };

  const handleEditCell = (tag: string, idx: number) => {
    const current = plan[tag]?.[idx] || {};
    const stammFach = app.stammplan?.[tag]?.[idx + 1] || '';
    const initialFach = current.fach || stammFach;
    setEditingCell({ tag, idx });
    setPlannerEditorTab('inhalt');

    let normalizedFach = initialFach;
    let initialSchwerpunkte = Array.isArray(current.schwerpunkte) ? [...current.schwerpunkte] : [];

    // Legacy/imported sub-subjects are projected onto the canonical subject + subarea.
    if (isDeutschSubSubject(initialFach)) {
      normalizedFach = 'Deutsch';
      if (initialSchwerpunkte.length === 0) {
        const legacy = initialFach === 'Deutsch (Sprache)' ? 'Deutsch (Sprachbetrachtung)' : initialFach;
        const matchingUf = DEUTSCH_UNTERFAECHER.find(uf =>
          uf.toLocaleLowerCase('de-AT') === legacy.toLocaleLowerCase('de-AT') ||
          uf.toLocaleLowerCase('de-AT').includes(legacy.toLocaleLowerCase('de-AT'))
        );
        initialSchwerpunkte = [matchingUf || legacy];
      }
    } else if (isMatheSubSubject(initialFach)) {
      normalizedFach = 'Mathematik';
      if (initialSchwerpunkte.length === 0) {
        const matchingUf = MATHEMATIK_UNTERFAECHER.find(uf =>
          uf.toLocaleLowerCase('de-AT') === initialFach.toLocaleLowerCase('de-AT') ||
          uf.toLocaleLowerCase('de-AT').includes(initialFach.toLocaleLowerCase('de-AT'))
        );
        initialSchwerpunkte = [matchingUf || initialFach];
      }
    }

    setSearchFach(normalizedFach);

    if ((!initialSchwerpunkte || initialSchwerpunkte.length === 0) && (normalizedFach === 'Deutsch' || normalizedFach.startsWith('Deutsch')) && app.autoSuggestSchwerpunkte) {
      initialSchwerpunkte = autoSuggestSchwerpunkt();
    }
    
    setTempSchwerpunkte(initialSchwerpunkte);
    const storedHalves = current.halves?.enabled ? current.halves : null;
    setTempSplitLesson(Boolean(storedHalves));
    setTempFirstHalf(storedHalves?.first
      ? { ...EMPTY_LESSON_HALF, ...storedHalves.first }
      : { ...EMPTY_LESSON_HALF, fach: normalizedFach || '', unterbereich: initialSchwerpunkte[0] || '', thema: current.thema || '' });
    setTempSecondHalf(storedHalves?.second
      ? { ...EMPTY_LESSON_HALF, ...storedHalves.second }
      : { ...EMPTY_LESSON_HALF });
    setTempThema(current.thema || '');
    setTempType(current.type || 'standard');
    setTempMaterial(current.material || '');
    setTempMaterialIds(Array.isArray(current.materialIds) ? current.materialIds : []);
    setTempHUE(current.housework || current.hue || '');
    setTempMethod(current.method || '');
    setTempSocial(current.social || 'single');
    setTempReflexion(current.reflexion || '');
    setTempDuration(current.duration === 'all' || typeof current.duration === 'number' ? current.duration : 1);
    setRepeatWeekly(false);
    
    // Auto-enable sync if part of the sync set
    const syncSet = app.wochenplanSyncSet || [];
    setSyncWpSubjects(syncSet.length > 0 && syncSet.includes(normalizedFach));
  };

  const openWeeklyCell = (tag: string, idx: number) => {
    const current = plan[tag]?.[idx] || {};
    if (hasWeeklyPlanningDetails(current)) {
      setYearPlanSyncNotice(null);
      setViewingCell({ tag, idx });
      return;
    }
    handleEditCell(tag, idx);
  };

  const addWeeklyLessonToYearPlan = (tag: string, idx: number) => {
    const lesson = plan[tag]?.[idx] || {};
    const fallbackSubject = app.stammplan?.[tag]?.[idx + 1] || '';
    const availableSubjects = sortYearlySubjects(app.jahresplan_faecher || DEFAULT_YEARLY_SUBJECTS);
    const result = addWeeklyLessonToEmptyYearPlan({
      existingPlan: app.jahresplanung || {},
      kw: activeKW,
      lesson,
      fallbackSubject,
      availableSubjects,
    });

    if (result.status === 'added') {
      setApp(prev => {
        const safeResult = addWeeklyLessonToEmptyYearPlan({
          existingPlan: prev.jahresplanung || {},
          kw: activeKW,
          lesson,
          fallbackSubject,
          availableSubjects: sortYearlySubjects(prev.jahresplan_faecher || DEFAULT_YEARLY_SUBJECTS),
        });
        return safeResult.status === 'added'
          ? { ...prev, jahresplanung: safeResult.plan }
          : prev;
      });
      setYearPlanSyncNotice('Im Jahresplan ergänzt. Bestehende Jahresplan-Inhalte wurden nicht überschrieben.');
      return;
    }

    if (result.status === 'occupied') {
      setYearPlanSyncNotice('Im Jahresplan ist diese Kalenderwoche für das Fach bereits belegt. Es wurde nichts überschrieben.');
    } else if (result.status === 'missing-topic') {
      setYearPlanSyncNotice('Für die Übernahme in den Jahresplan braucht die Stunde zuerst ein Thema.');
    } else {
      setYearPlanSyncNotice('Für dieses Fach konnte keine passende Jahresplan-Spalte gefunden werden.');
    }
  };

  const handleAddToSpacedPractice = (fach: string, thema: string) => {
    if (!fach.trim() || !thema.trim()) {
      alert("Bitte geben Sie zuerst ein Fach und ein Thema ein.");
      return;
    }
    const today = formatLocalDateKey(new Date());
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 14);
    const naechsteWiederholung = formatLocalDateKey(targetDate);

    const newEntry = {
      id: `sp-${Date.now()}`,
      thema: thema.trim(),
      fach: fach.trim(),
      ursprungsDatum: today,
      naechsteWiederholung,
      intervallStufe: 1
    };

    setApp(prev => ({
      ...prev,
      spacedPractices: [...(prev.spacedPractices || []), newEntry]
    }));

    alert(`Das Thema "${thema}" wurde erfolgreich für die Wiederholung in 14 Tagen (${naechsteWiederholung}) eingeplant.`);
  };

  const saveCell = (fach: string, thema: string, type: string = 'standard', material: string = '', housework: string = '', method: string = '', social: string = 'single', reflexion: string = '', schwerpunkte: string[] = [], duration: number | 'all' = 1, materialIds: string[] = []) => {
    if (!editingCell) return;
    const { tag, idx } = editingCell;
    const trimmedFach = fach.trim();

    const futureWeeks: number[] = [];
    if (repeatWeekly) {
      const schoolWeeks = buildSchoolYearWeekList(app.schuljahr, app.bundesland || 'VBG').map((week) => week.kw);
      const activeIndex = schoolWeeks.indexOf(activeKW);
      if (activeIndex >= 0) {
        futureWeeks.push(...schoolWeeks.slice(activeIndex));
      } else {
        futureWeeks.push(activeKW);
      }
    } else {
      futureWeeks.push(activeKW);
    }

    setApp(prev => {
      const updatedWochenplanung = { ...(prev.wochenplanung || {}) };
      let updatedVerpasste = [...(prev.verpassteInhalte || [])];
      
      futureWeeks.forEach(kw => {
        const kwPlan = { ...(updatedWochenplanung[kw] || {}) };
        
        if (!kwPlan[tag]) kwPlan[tag] = {};
        
        if (!trimmedFach && !thema.trim()) {
          delete kwPlan[tag][idx];
          // Falls der Tag nun leer ist, könnte man ihn auch löschen, aber leeres Objekt schadet nicht.
        } else {
          kwPlan[tag] = {
            ...kwPlan[tag],
            [idx]: {
              // Keep imported goals, lesson IDs, preparation status and any legacy fields.
              ...(kwPlan[tag][idx] || {}),
              fach: trimmedFach, 
              thema: thema.trim(),
              type,
               material: material.trim(),
               materialIds,
              housework: housework.trim(),
              method: method.trim(),
              social,
              reflexion: reflexion.trim(),
              schwerpunkte,
              halves: tempSplitLesson
                ? {
                    enabled: true,
                    first: { ...tempFirstHalf },
                    second: { ...tempSecondHalf },
                  }
                : undefined,
              duration: duration === 'all' ? 'all' : weeklyLessonDurationSlots(duration, idx)
            }
          };
        }

        if (syncWpSubjects) {
          const syncSet = prev.wochenplanSyncSet || [];
          
          const isTargetWp = (f: string, t: string, sFach: string) => {
            if (syncSet.length > 0) {
               return syncSet.includes(f) || syncSet.includes(sFach);
            }
            const str = `${f} ${t} ${sFach}`.toLowerCase();
            return str.includes('wochenplan') || str.includes('freiarbeit');
          };
          
          Object.keys(kwPlan).forEach(dTag => {
            Object.keys(kwPlan[dTag]).forEach(dIdx => {
              if (dTag === tag && dIdx === String(idx)) return;
              const cell = kwPlan[dTag][dIdx];
              const stammFach = app.stammplan?.[dTag]?.[Number(dIdx) + 1] || '';
              
              if (cell && isTargetWp(cell.fach, cell.thema, stammFach)) {
                kwPlan[dTag] = {
                  ...kwPlan[dTag],
                  [dIdx]: {
                    ...cell,
                    thema: thema.trim(),
                    type,
                     material: material.trim(),
                     materialIds,
                    housework: housework.trim(),
                    method: method.trim(),
                    social,
                    reflexion: reflexion.trim(),
                    schwerpunkte,
                    halves: tempSplitLesson
                      ? {
                          enabled: true,
                          first: { ...tempFirstHalf },
                          second: { ...tempSecondHalf },
                        }
                      : undefined,
                    duration: duration === 'all' ? 'all' : weeklyLessonDurationSlots(duration, Number(dIdx))
                  }
                };
              }
            });
          });
        }

        updatedWochenplanung[kw] = kwPlan;

        // Auto-save missed content for absent students
        const startYearVal = getStartYear(prev.schuljahr || app.schuljahr);
        const kwY = kwYear(kw, startYearVal);
        const mon = kwToMonday(kw, kwY);
        const dayIdx = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'].indexOf(tag);
        let dateStr = '';
        if (dayIdx !== -1) {
          const d = new Date(mon);
          d.setDate(mon.getDate() + dayIdx);
          dateStr = formatLocalDateKey(d);
        }

        if (dateStr && thema.trim() && trimmedFach) {
          const absentStudents = (prev.schueler || []).filter(s => {
            const dayData = prev.anwesenheit?.[s.id]?.[dateStr];
            return dayData && Object.values(dayData).some(st => st === 'e' || st === 'u');
          });

          absentStudents.forEach(s => {
            const existsIdx = updatedVerpasste.findIndex(item => 
              item.schuelerId === s.id && 
              item.date === dateStr && 
              item.stunde === idx
            );

            if (existsIdx === -1) {
              updatedVerpasste.push({
                id: crypto.randomUUID(),
                schuelerId: s.id,
                kw,
                tag,
                date: dateStr,
                fach: trimmedFach,
                thema: thema.trim(),
                stunde: idx,
                status: 'offen',
                timestamp: Date.now()
              });
            } else {
              updatedVerpasste[existsIdx] = {
                ...updatedVerpasste[existsIdx],
                fach: trimmedFach,
                thema: thema.trim()
              };
            }
          });
        }
      });

      return {
        ...prev,
        wochenplanung: updatedWochenplanung,
        verpassteInhalte: updatedVerpasste
      };
    });

    const logMsg = repeatWeekly 
      ? `Wochenstunde wöchentlich wiederholt für den Rest des Schuljahres (KW ${activeKW}+)`
      : `Wochenplan KW ${activeKW} aktualisiert`;

    logActivity(setApp, logMsg, 'wochenplan', `${activeKW}-${tag}-${idx}`);

    setEditingCell(null);
  };

  const toggleDoneStatus = (e: React.MouseEvent, tag: string, idx: number) => {
    e.stopPropagation();
    setApp(prev => {
      const wp = { ...(prev.wochenplanung || {}) };
      const currentWeekObj = { ...wp[activeKW] };
      if (!currentWeekObj[tag]) currentWeekObj[tag] = {};
      const item = { ...(currentWeekObj[tag][idx] || {}) };
      
      const newErledigt = !item.erledigt;
      item.erledigt = newErledigt;
      currentWeekObj[tag][idx] = item;
      wp[activeKW] = currentWeekObj;

      // Update Jahresplanung if there's a matching theme in the active week
      const jp = { ...(prev.jahresplanung || {}) };
      const weekJp = { ...(jp[activeKW] || {}) };
      let jpChanged = false;

      if (item.thema) {
        Object.entries(weekJp).forEach(([subjId, subjData]: [string, any]) => {
          if (subjData.items && subjData.items.length > 0) {
            const updatedItems = subjData.items.map((it: any) => {
              if (it.thema === item.thema) {
                jpChanged = true;
                return { ...it, completed: newErledigt };
              }
              return it;
            });
            const allDone = updatedItems.every((it: any) => it.completed);
            weekJp[subjId] = { ...subjData, items: updatedItems, completed: allDone };
          } else if (subjData.thema === item.thema) {
            weekJp[subjId] = { ...subjData, completed: newErledigt };
            jpChanged = true;
          }
        });
      }

      if (jpChanged) {
        jp[activeKW] = weekJp;
        return { ...prev, wochenplanung: wp, jahresplanung: jp };
      }

      return { ...prev, wochenplanung: wp };
    });
  };

  const toggleYearlyItemCompletion = (subjectId: string, itemIndex: number | null) => {
    setApp(prev => {
      const jp = { ...(prev.jahresplanung || {}) };
      const weekData = { ...(jp[activeKW] || {}) };
      const cell = { ...(weekData[subjectId] || {}) };
      
      const isCompleted = itemIndex === null ? !cell.completed : !cell.items?.[itemIndex]?.completed;

      if (itemIndex === null) {
        cell.completed = isCompleted;
      } else {
        const items = [...(cell.items || [])];
        if (items[itemIndex]) {
          items[itemIndex] = { ...items[itemIndex], completed: isCompleted };
        }
        cell.items = items;
        cell.completed = items.every((it: any) => it.completed);
      }
      
      weekData[subjectId] = cell;
      jp[activeKW] = weekData;

      // Sync to WeeklyPlan: if marked as erledigt, also check it off in WeeklyPlan
      const wp = { ...(prev.wochenplanung || {}) };
      const weekWp = { ...(wp[activeKW] || {}) };
      let wpChanged = false;

      Object.entries(weekWp).forEach(([tag, daySlots]: [string, any]) => {
        Object.entries(daySlots).forEach(([idx, slot]: [string, any]) => {
          const itemThema = itemIndex === null ? cell.thema : cell.items?.[itemIndex]?.thema;
          if (slot && slot.thema === itemThema) {
            weekWp[tag][idx] = { ...slot, erledigt: isCompleted };
            wpChanged = true;
          }
        });
      });

      if (wpChanged) {
        wp[activeKW] = weekWp;
        return { ...prev, jahresplanung: jp, wochenplanung: wp };
      }

      return { ...prev, jahresplanung: jp };
    });
  };

  const handleParkLesson = (tag: string, idx: number) => {
    setApp(prev => {
      const wp = { ...(prev.wochenplanung || {}) };
      const currentWeekObj = { ...wp[activeKW] };
      const item = currentWeekObj[tag]?.[idx];
      if (!item || (!item.fach && !item.thema)) return prev;

      const parked = [...(prev.parkgarage || [])];
      parked.push({
        ...item,
        id: `parked-${Date.now()}-${Math.random()}`,
        parkedAt: new Date().toLocaleDateString('de-AT')
      });

      const updatedWeek = { ...currentWeekObj };
      if (updatedWeek[tag]) {
        delete updatedWeek[tag][idx];
      }
      wp[activeKW] = updatedWeek;

      return { ...prev, wochenplanung: wp, parkgarage: parked };
    });
  };

  const handleDropToParkgarage = (e: React.DragEvent) => {
    e.preventDefault();
    const sourceDataStr = e.dataTransfer.getData('sourceCell');
    if (!sourceDataStr) return;
    const sourceData = safeJsonParse(sourceDataStr, null);
    if (!sourceData) return;

    handleParkLesson(sourceData.tag, sourceData.idx);
  };

  const handleStartWochenendCheckIn = () => {
    setShowCheckInModal(true);
    setCheckInStep(1);
    setCheckInHighlight('');
    setCheckInFocusStudent('');
    setCheckInFocusNote('');
    setCheckInExtraTodos('');
  };

  const handleMagicPlanerGenerate = async () => {
    if (!searchFach) {
      alert("Bitte wähle zuerst ein Fach aus.");
      return;
    }
    setMagicPlanerLoading(true);
    setMagicPlanerResult(null);
    try {
      const result = await generateMagicPlanning(
        app.stufe || 4,
        searchFach,
        tempThema || "Allgemeines Lehrplanthema",
        magicExtraPrompt
      );
      if (typeof result === "string") {
        alert("Fehler von der KI: " + result);
      } else if (result) {
        setMagicPlanerResult(result);
      }
    } catch (e: any) {
      console.error(e);
      alert("Fehler bei der KI-Detailplanung.");
    } finally {
      setMagicPlanerLoading(false);
    }
  };

  const handleMagicPlanerApply = () => {
    if (!magicPlanerResult) return;
    if (magicPlanerResult.lernziele) {
      setTempThema(magicPlanerResult.lernziele);
    }
    
    const methodenAblauf = `Einstieg (Hook):\n${magicPlanerResult.einleitung || ""}\n\nHauptteil:\n${magicPlanerResult.hauptteil || ""}`;
    setTempMethod(methodenAblauf);
    
    if (magicPlanerResult.schluss) {
      setTempReflexion(magicPlanerResult.schluss);
    }
    
    setShowMagicPlanerPopup(false);
  };

  const pendingNotesThisWeek = useMemo(() => {
    const startOfWeek = new Date(monday);
    startOfWeek.setHours(0,0,0,0);
    const endOfWeek = new Date(friday);
    endOfWeek.setHours(23,59,59,999);

    return (app.denkzettelNotes || []).filter((n: any) => {
      if (n.completed) return false;
      const parsed = inferDateFromText(n.text, app.schuljahr || '');
      if (!parsed) return false;
      const parsedTime = parsed.getTime();
      return parsedTime >= startOfWeek.getTime() && parsedTime <= endOfWeek.getTime();
    });
  }, [app.denkzettelNotes, app.schuljahr, monday, friday]);

  const allUnscheduledNotes = useMemo(() => {
    return (app.denkzettelNotes || []).filter((n: any) => !n.completed);
  }, [app.denkzettelNotes]);

  const handleAssignNoteToWochenplan = (note: any, selectedTag: string, selectedIdx: number) => {
    const eventType = inferEventType(note.text);
    
    setApp(prev => {
      // 1. Mark note as completed
      const updatedNotes = (prev.denkzettelNotes || []).map((n: any) => 
        n.id === note.id ? { ...n, completed: true } : n
      );
      
      // 2. Put into Wochenplanung
      const wp = { ...(prev.wochenplanung || {}) };
      const currentWeekObj = { ...(wp[activeKW] || {}) };
      if (!currentWeekObj[selectedTag]) currentWeekObj[selectedTag] = {};
      
      currentWeekObj[selectedTag][selectedIdx] = {
        ...(currentWeekObj[selectedTag][selectedIdx] || {}),
        fach: 'Termin',
        thema: note.text,
        type: eventType,
        erledigt: false
      };
      
      wp[activeKW] = currentWeekObj;
      
      // 3. Put into Jahresplanung too!
      const jp = { ...(prev.jahresplanung || {}) };
      const currentKwJp = { ...(jp[activeKW] || {}) };
      const existingSonstiges = currentKwJp['sonstiges'] || {};
      
      let updatedThema = existingSonstiges.thema || '';
      if (!updatedThema.includes(note.text)) {
        updatedThema = updatedThema ? `${updatedThema} & ${note.text}` : note.text;
      }
      
      currentKwJp['sonstiges'] = {
        ...existingSonstiges,
        thema: updatedThema,
        type: eventType,
        subCategory: 'termin',
        subCategories: ['termin']
      };
      jp[activeKW] = currentKwJp;
      
      return { 
        ...prev, 
        denkzettelNotes: updatedNotes, 
        wochenplanung: wp,
        jahresplanung: jp
      };
    });
    
    logActivity(setApp, `Denkzettel-Termin "${note.text}" am ${selectedTag} in der ${selectedIdx + 1}. Stunde verplant`, 'wochenplan', `${activeKW}-${selectedTag}-${selectedIdx}`);
  };

  const handleSmartAutoAssign = (note: any) => {
    const parsedDate = inferDateFromText(note.text, app.schuljahr || '');
    let targetTag = 'Montag';
    const TAGE_VALS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
    
    if (parsedDate) {
      const dayIdx = parsedDate.getDay(); // 0 = sun, 1...5
      if (dayIdx >= 1 && dayIdx <= 5) {
        targetTag = TAGE_VALS[dayIdx - 1];
      }
    } else {
      targetTag = 'Montag';
    }
    
    // Find empty slot for that day
    const dayPlan = (app.wochenplanung?.[activeKW]?.[targetTag]) || {};
    let chosenIdx = MAX_LESSON_SLOTS - 1;
    for (let i = 0; i < MAX_LESSON_SLOTS; i++) {
      if (!dayPlan[i] || !dayPlan[i].fach) {
        chosenIdx = i;
        break;
      }
    }
    
    handleAssignNoteToWochenplan(note, targetTag, chosenIdx);
  };

  const handleAiSuggestion = async () => {
    if (!searchFach) return;
    setAiLoading(true);
    try {
      const suggestion = await getLessonSuggestion(searchFach, tempThema, app.stufe || 4, tempSchwerpunkte);
      if (typeof suggestion === 'string') {
        alert(suggestion);
      } else if (suggestion) {
        setTempThema(suggestion.thema);
        setTempMaterial(suggestion.material);
        setTempMethod(suggestion.method);
        setTempSocial(suggestion.social);
      }
    } finally {
      setAiLoading(false);
    }
  };

  const generateWeeksList = () =>
    buildSchoolYearWeekList(app.schuljahr, app.bundesland || 'VBG').map((week) => ({
      kw: week.kw,
      sw_val: week.sw,
    }));

  const handleToggleDayStatus = (dateStr: string, status: 'school' | 'free') => {
    setApp(prev => ({
      ...prev,
      calendarOverrides: {
        ...(prev.calendarOverrides || {}),
        [dateStr]: status
      }
    }));
    logActivity(setApp, `Tag ${dateStr} als ${status === 'school' ? 'Schultag' : 'Frei'} markiert`, 'calendar', dateStr);
    setDateStatusMenu(null);
  };

  const yearlyPlanForKW = (app.jahresplanung || {})[activeKW] || {};
  const yearlySubjects = sortYearlySubjects(app.jahresplan_faecher || DEFAULT_YEARLY_SUBJECTS);
  
  const yearlyPlanItems = yearlySubjects.flatMap(s => {
    const data = yearlyPlanForKW[s.id];
    if (!data) return [];
    const items = yearPlanCellEntries(data);
    const hasRootEntry = Boolean(String(data.thema || '').trim() || String(data.buch || '').trim());
    return items.map((it: any, index: number) => ({
      ...it,
      subjectId: s.id,
      itemIndex: hasRootEntry ? (index === 0 ? null : index - 1) : index,
      completed: !!(data.completed || it.completed),
    }));
  });
  
  const unscheduledSuggestionsCount = yearlyPlanItems.filter(item => !isYearlyItemScheduled(item)).length;

  const skipCells = new Set<string>();
  LESSON_SLOT_NUMBERS.forEach((slot) => {
    const zIdx = slot - 1;
    TAGE_NAMEN.forEach((tag) => {
      const item = plan[tag]?.[zIdx];
      const duration = weeklyLessonDurationSlots(item?.duration, zIdx);
      if (duration > 1) {
        for (let d = 1; d < duration; d++) {
          skipCells.add(`${tag}-${zIdx + d}`);
        }
      }
    });
  });

  const planContent = (
    <div 
      className={`weekly-plan-shell flex flex-col bg-[#f4f7f3] ${
        isFullscreen 
          ? "fixed inset-0 z-[450] w-screen h-[100dvh] overflow-hidden p-2 sm:p-4" 
          : ""
      }`} 
      style={{ '--sticky-offset': `${navHeight}px` } as React.CSSProperties}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .weekly-plan-tools > button,
        .weekly-plan-tools > div > button {
          min-height: 34px;
          padding: 0.45rem 0.7rem !important;
          border-radius: 0.75rem !important;
          font-size: 0.625rem !important;
          letter-spacing: 0.035em !important;
        }
        @media (max-width: 720px) {
          .weekly-plan-tools > button,
          .weekly-plan-tools > div > button {
            min-height: 32px;
            padding: 0.4rem 0.55rem !important;
          }
        }
      ` }} />
      
      {/* SVG PATTERNS & EFFECTS */}
      <svg className="fixed pointer-events-none opacity-0 invisible">
        <defs>
          <pattern id="dotPattern" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="currentColor" />
          </pattern>
        </defs>
      </svg>
      
      {/* 1. FIXED TOP HEADER CONTROL */}
      <div ref={headerRef} className="bg-[#f4f7f3] border-b border-slate-200 flex flex-col pt-1 shrink-0" data-zoom={app?.settings?.zoomLevel}>
        <div className="py-2 sm:py-3">
          <div className="flex flex-col bg-white border border-slate-200 rounded-2xl p-2 sm:p-3 gap-2 w-full shadow-sm">
            
            {/* Row 1: Title, Date Info, Navigation & Primary Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">WOCHENPLANUNG</h1>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[0.625rem] font-extrabold rounded-full">
                    KW {activeKW}
                  </span>
                  {sw && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[0.625rem] font-bold rounded-full">
                      SW {sw}
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  {monday.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' })} – {friday.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  {app.klassenbezeichnung || app.stufe ? ` · Klasse ${app.klassenbezeichnung || `${app.stufe}. Stufe`}` : ''}
                </p>
              </div>

              {/* Navigation & Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Week Navigation */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button 
                    onClick={() => {
                      const d = new Date(monday);
                      d.setDate(d.getDate() - 7);
                      setApp(p => ({ ...p, currentKW: getKW(d) }));
                    }} 
                    aria-label="Vorherige Woche"
                    title="Vorherige Woche"
                    className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-all active:scale-95 cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button 
                    onClick={() => setApp(p => ({ ...p, currentKW: actualKW }))}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeKW === actualKW ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    title="Zur aktuellen Woche springen"
                  >
                    Diese Woche
                  </button>
                  <button 
                    onClick={() => setShowWeekPicker(true)}
                    className="px-2 py-1 text-xs font-bold text-slate-600 hover:bg-white rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    title="Woche wählen"
                  >
                    <span>KW {activeKW}</span>
                    <ChevronDown size={12} />
                  </button>
                  <button 
                    onClick={() => {
                      const d = new Date(monday);
                      d.setDate(d.getDate() + 7);
                      setApp(p => ({ ...p, currentKW: getKW(d) }));
                    }} 
                    aria-label="Nächste Woche"
                    title="Nächste Woche"
                    className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-all active:scale-95 cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Primary Action Button: Wochenplan für Kinder erstellen */}
                <button
                  onClick={() => setShowSchuelerWochenplanModal(true)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Erstellt aus dem aktuellen Wochenplan einen kindgerechten Arbeits-/Aufgabenplan für die Kinder"
                >
                  <CheckSquare size={16} strokeWidth={2.5} />
                  <span>Wochenplan für Kinder erstellen</span>
                </button>

                {/* Import changes the editable plan; exports belong to PrintCenter. */}
                <button type="button" onClick={() => setShowExcelModal(true)}
                  className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5"
                  title="Wochenplanung aus Excel importieren">
                  <Upload size={15} /> <span>Excel importieren</span>
                </button>

                {/* Fullscreen Button */}
                <button
                  aria-pressed={isFullscreen}
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className={`px-3 py-2 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border shadow-xs ${
                    isFullscreen
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-800'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                  title={isFullscreen ? 'Vollbildmodus beenden (Esc)' : 'Vollbildmodus aktivieren (Esc zum Beenden)'}
                >
                  {isFullscreen ? (
                    <>
                      <Minimize2 size={16} />
                      <span>Vollbild beenden</span>
                      <kbd className="hidden sm:inline-block px-1 py-0.2 bg-emerald-900/60 text-[9px] text-white rounded font-mono ml-0.5">Esc</kbd>
                    </>
                  ) : (
                    <>
                      <Maximize2 size={16} />
                      <span>Vollbild</span>
                    </>
                  )}
                </button>

                {/* Dropdown Menu: Mehr */}
                <div className="relative z-[210]">
                  <button 
                    onClick={() => setShowWeekMenu(!showWeekMenu)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200"
                  >
                    <MoreHorizontal size={16} />
                    <span>Mehr</span>
                    <ChevronDown size={12} />
                  </button>
                  {showWeekMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowWeekMenu(false)} />
                      <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 flex flex-col gap-1 text-left">
                        <button onClick={() => { setShowWeekMenu(false); setShowSchuelerWochenplanModal(true); }} className="btn !bg-white !text-indigo-700 hover:!bg-indigo-50 !justify-start !text-left text-[0.75rem] leading-tight gap-3 font-bold">
                          <CheckSquare size={14} /> Wochenplan für Kinder erstellen
                        </button>
                        <button onClick={() => { setShowWeekMenu(false); setIsFullscreen(!isFullscreen); }} className="btn !bg-white !text-slate-700 hover:!bg-slate-50 !justify-start !text-left text-[0.75rem] leading-tight gap-3">
                          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />} {isFullscreen ? 'Vollbild beenden' : 'Vollbildmodus'}
                        </button>
                        <button onClick={() => { setShowWeekMenu(false); setApp(prev => ({ ...prev, currentPage: 'drucken', activePrintTemplate: 'wochenplan' })); }} className="btn !bg-white !text-indigo-700 hover:!bg-indigo-50 !justify-start !text-left text-[0.75rem] leading-tight gap-3">
                          <Printer size={14} /> Druckzentrum öffnen
                        </button>
                        <hr className="my-1 border-slate-100" />
                        <button onClick={() => { setShowWeekMenu(false); copyFromLastWeek(); }} className="btn !bg-white !text-slate-700 hover:!bg-slate-50 !justify-start !text-left text-[0.75rem] leading-tight gap-3">
                          <RefreshCw size={14} /> Letzte Woche kopieren
                        </button>
                        <button onClick={() => { setShowWeekMenu(false); syncWithStammplan(); }} className="btn !bg-white !text-emerald-700 hover:!bg-emerald-50 !justify-start !text-left text-[0.75rem] leading-tight gap-3">
                          <RefreshCw size={14} /> Mit Stammplan synchronisieren
                        </button>
                        <button onClick={() => { setShowWeekMenu(false); generateWeekFromYearlyPlanAI(); }} disabled={aiLoading} className="btn !bg-white !text-purple-700 hover:!bg-purple-50 !justify-start !text-left text-[0.75rem] leading-tight gap-3">
                          {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} 
                          KI: Jahresplan verteilen
                        </button>
                        <button onClick={() => { setShowWeekMenu(false); setShowSyncSettingsModal(true); }} className="btn !bg-white !text-indigo-700 hover:!bg-indigo-50 !justify-start !text-left text-[0.75rem] leading-tight gap-3">
                          <Zap size={14} /> Sync-Set konfigurieren
                        </button>
                        <hr className="my-1 border-slate-100" />
                        <button onClick={() => { setShowWeekMenu(false); setHideEventsInView(!hideEventsInView); }} className="btn !bg-white !text-slate-700 hover:!bg-slate-50 !justify-start !text-left text-[0.75rem] leading-tight gap-3">
                          {hideEventsInView ? <EyeOff size={14} /> : <Eye size={14} />} Schüler-WOPL (Events aus)
                        </button>
                        <button onClick={() => { setShowWeekMenu(false); setShowSollCheck(!showSollCheck); }} className="btn !bg-white !text-slate-700 hover:!bg-slate-50 !justify-start !text-left text-[0.75rem] leading-tight gap-3">
                          <Filter size={14} /> Analysen & Stundentafel
                        </button>
                        <button onClick={() => { setShowWeekMenu(false); setShowSuggestionsDraw(!showSuggestionsDraw); }} className="btn !bg-white !text-emerald-700 hover:!bg-emerald-50 !justify-start !text-left text-[0.75rem] leading-tight gap-3">
                          <BookOpen size={14} /> Vorschläge aus Jahresplanung ({unscheduledSuggestionsCount})
                        </button>
                        <button onClick={() => { setShowWeekMenu(false); setShowDenkzettelDraw(!showDenkzettelDraw); }} className="btn !bg-white !text-amber-700 hover:!bg-amber-50 !justify-start !text-left text-[0.75rem] leading-tight gap-3">
                          <Lightbulb size={14} /> Denkzettel ({allUnscheduledNotes.length})
                        </button>
                        <button onClick={() => { setShowWeekMenu(false); setShowStatsMenu(!showStatsMenu); }} className="btn !bg-white !text-sky-700 hover:!bg-sky-50 !justify-start !text-left text-[0.75rem] leading-tight gap-3">
                          <BarChart2 size={14} /> Deutsch-Statistik
                        </button>
                        <hr className="my-1 border-slate-100" />
                        <button onClick={() => { setShowWeekMenu(false); clearCurrentWeek(); }} className="btn !bg-white !text-rose-500 hover:!bg-rose-50 !justify-start !text-left text-[0.75rem] leading-tight gap-3">
                          <X size={14} /> Woche leeren
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Row 2: Secondary Toolbar (View Mode & Status Counters) */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
              {/* View Mode */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    <Layout size={12} />
                    <span>Wochenplan</span>
                  </button>
                  <button type="button" onClick={() => setViewMode('day')}
                    aria-pressed={viewMode === 'day'}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition-all ${viewMode === 'day' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                    <Calendar size={12} /> <span>Tag</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('klassenbuch')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer ${viewMode === 'klassenbuch' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    <BookOpen size={12} />
                    <span>Klassenbuch</span>
                  </button>
                </div>
              </div>

              {/* Progress Counters */}
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-xl font-bold text-[0.6875rem] flex items-center gap-1">
                  <Check size={12} />
                  <span>{weekMetrics.prepared}/{weekMetrics.total} vorbereitet</span>
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* DIESE WOCHE WICHTIG BANNER */}
        {thisWeekImportantEvents.length > 0 && (
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3 mb-3 shadow-2xs">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-amber-700" />
                <span className="text-[0.6875rem] font-black uppercase text-amber-950 tracking-wider">Diese Woche wichtig</span>
                <span className="px-2 py-0.5 bg-amber-200/80 text-amber-950 rounded-full text-[0.625rem] font-bold">
                  {thisWeekImportantEvents.length} Termine / Ereignisse
                </span>
              </div>
              <button
                onClick={() => {
                  setQuickPlanType('termin');
                  setShowQuickPlanModal(true);
                }}
                className="text-[0.6875rem] font-bold text-amber-800 hover:text-amber-950 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} />
                <span>Termin hinzufügen</span>
              </button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
              {thisWeekImportantEvents.slice(0, 8).map(ev => (
                <div
                  key={ev.id}
                  className={`px-2.5 py-1 rounded-xl border text-xs font-bold shrink-0 flex items-center gap-1.5 ${
                    ev.isTest
                      ? 'bg-rose-100/90 border-rose-300 text-rose-900'
                      : 'bg-white border-amber-200 text-slate-800 shadow-2xs'
                  }`}
                >
                  <span className="text-[0.625rem] font-black uppercase tracking-tight text-amber-700">{ev.tag.slice(0, 2)}:</span>
                  <span>{ev.label}</span>
                </div>
              ))}
              {thisWeekImportantEvents.length > 8 && (
                <span className="text-xs font-bold text-amber-800 shrink-0 px-2 py-1 bg-amber-100 rounded-xl">
                  +{thisWeekImportantEvents.length - 8} weitere
                </span>
              )}
            </div>
          </div>
        )}
      </div>

        {Object.keys(yearlyPlanForKW).length > 0 && 
          <div className="bg-amber-50/20 border-t border-amber-100/50 py-2.5 mt-4 rounded-xl">
            <div className="flex items-center gap-5">
              <Lightbulb size={16} className="text-amber-500 shrink-0" />
              <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
                {yearlySubjects.flatMap(s => {
                  const data = yearlyPlanForKW[s.id];
                  if (!data) return [];
                  
                  const items = (data.items && data.items.length > 0) 
                     ? data.items 
                     : data.thema ? [{ thema: data.thema, subCategory: data.subCategory, subCategories: data.subCategories, buch: data.buch }] : [];
                     
                  return items.map((item: any, idx: number) => {
                    const scheduled = isYearlyItemScheduled(item);
                    return (
                      <div 
                        key={`${s.id}-${idx}`} 
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-sm shrink-0 whitespace-nowrap cursor-grab active:cursor-grabbing hover:shadow-md transition-all group ${
                          scheduled 
                            ? "bg-emerald-50 border-emerald-300/80 text-emerald-800 shadow-emerald-100/50 hover:bg-emerald-100/70" 
                            : "bg-white border-amber-100 hover:bg-amber-50"
                        }`}
                        draggable
                        onDragStart={(e) => {
                           const content = `${item.thema}${item.buch ? ` (${item.buch})` : ''}`;
                           e.dataTransfer.setData('text/plain', content);
                           e.dataTransfer.setData('yearlyItem', JSON.stringify(item));
                        }}
                        title={scheduled ? "Thema bereits im Wochenplan eingetragen" : "Als Thema in eine Unterrichtsstunde ziehen"}
                      >
                         <span className={`text-[0.5625rem] font-black uppercase tracking-tight ${
                           scheduled ? "text-emerald-600" : "text-amber-600"
                         }`}>
                           {item.subCategories && item.subCategories.length > 0 ? item.subCategories.map((sc: string) => sc.replace('Deutsch ', '')).join(', ') : item.subCategory ? item.subCategory.replace('Deutsch ', '') : s.label.slice(0,3)}:
                         </span>
                         <span className={`text-[0.6875rem] font-bold ${scheduled ? "text-emerald-950" : "text-slate-800"}`}>
                           {item.thema}
                         </span>
                         {scheduled ? (
                           <Check size={12} className="text-emerald-500 ml-1 shrink-0 animate-in zoom-in duration-300" />
                         ) : (
                           <GripVertical size={12} className="text-amber-300 ml-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                         )}
                      </div>
                    );
                  });
                })}
              </div>
            </div>
          </div>
        }

      {/* 2. MAIN SCROLLABLE CONTENT AREA */}
      <div className={`w-full ${isFullscreen ? 'flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-auto flex flex-col custom-scrollbar mt-2' : 'flex flex-col'}`}>
      <AnimatePresence>
        {showSollCheck && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="bg-slate-50 border-b border-slate-200 p-4 sm:p-6"
          >
            <div className="flex flex-col gap-6">
              <div>
                <div className="text-[0.75rem] font-black uppercase text-slate-400 tracking-wider mb-4 flex items-center justify-between">
                  <span>Stundentafel (Soll-Werte)</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {app.stufe !== undefined && Number(app.stufe) !== 0 ? Object.entries(STUNDENTAFEL[Number(app.stufe)] || {}).map(([fach, soll]) => (
                    <div key={fach} className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm">
                      <div className="text-[0.5625rem] sm:text-[0.625rem] font-black text-slate-400 uppercase mb-2 text-wrap leading-tight break-words">{fach}</div>
                      <div className="text-[1.25rem] leading-normal sm:text-[1.5rem] leading-normal font-black text-slate-900">{soll} <span className="text-[0.625rem] sm:text-[0.75rem] opacity-30">Einheiten</span></div>
                    </div>
                  )) : <div className="col-span-full py-10 text-center font-black text-slate-300 uppercase">{app.stufe === 0 ? "Keine Stundentafel für die Vorschulklasse hinterlegt" : "Schulstufe konfigurieren"}</div>}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                 <div className="text-[0.75rem] font-black uppercase text-slate-400 tracking-wider mb-4 flex items-center justify-between">
                   <span className="flex items-center gap-2"><Sparkles size={14} className="text-purple-500" /> KI-Abgleich: Jahresplanung ↔ Wochenplan</span>
                   <button onClick={runWeeklyPlanAlignmentCheckAI} disabled={aiCheckLoading} className="btn !bg-white border !border-slate-200 !text-purple-700 hover:!bg-purple-50 !py-2 !px-4 text-[0.75rem] shadow-sm">
                     {aiCheckLoading ? <Loader2 size={14} className="animate-spin" /> : "Planung überprüfen"}
                   </button>
                 </div>
                 
                 {aiCheckResult && (
                   <div className="bg-white border border-purple-100 rounded-3xl p-5 shadow-sm">
                      <div className="whitespace-pre-line text-[0.875rem] text-slate-700 font-medium leading-relaxed">
                        {aiCheckResult}
                      </div>
                   </div>
                 )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. THE RESET WEEKLY GRID - CSS GRID ONLY */}
      {viewMode === 'klassenbuch' ? (
        <div className="w-full pb-6">
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-2xl p-6 sm:p-8 max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-5 gap-4">
              <div>
                <span className="text-[0.625rem] font-black uppercase text-indigo-600 tracking-[0.2em] mb-1 block">Live-Vorschau</span>
                <h3 className="text-[1.25rem] leading-normal font-black text-slate-900 tracking-tight leading-none mb-1">Klassenbuch-Wochenbericht</h3>
                <p className="text-[0.75rem] leading-tight text-slate-400 font-bold">Automatisch befüllt aus deiner Wochenplanung</p>
              </div>

              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                <button 
                  onClick={() => setApp(prev => ({ ...prev, currentPage: 'drucken', activePrintTemplate: 'klassenbuch' }))}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white transition-all rounded-2xl font-black text-[0.75rem] leading-tight uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 cursor-pointer select-none"
                >
                  <Printer size={16} />
                  <span>Im Druckzentrum öffnen</span>
                </button>

              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100/50 text-[0.75rem] leading-tight font-bold text-slate-700">
              <div className="space-y-1">
                <div className="text-[0.5625rem] uppercase tracking-wider text-slate-400">Schulstufe / Klasse</div>
                <div className="text-slate-900">{app.stufe ? `${app.stufe}. Stufe` : '—'} &nbsp;|&nbsp; {app.klassenbezeichnung || '—'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[0.5625rem] uppercase tracking-wider text-slate-400">Schuljahr</div>
                <div className="text-slate-900">{app.schuljahr || '—'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[0.5625rem] uppercase tracking-wider text-slate-400">KW / Schulwoche</div>
                <div className="text-slate-900">KW {activeKW}{sw && <>&nbsp;|&nbsp;<span className="text-[0.625rem] text-slate-500 font-medium">SW {sw}</span></>}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[0.5625rem] uppercase tracking-wider text-slate-400">Lehrperson</div>
                <div className="text-slate-900">{app.lehrerName || app.lehrerProfil?.name || '—'}</div>
              </div>
            </div>

            {/* Table with entries */}
            <div className="border border-slate-200 rounded-2xl  bg-white shadow-sm">
              <div className="divide-y divide-slate-100">
                {(() => {
                  const kData = getKlassenbuchData();
                  const subjectsToShow = Object.keys(kData).map(key => {
                    const { subject, subarea } = splitKlassenbuchCategoryKey(key);
                    return { key, label: subject, sub: subarea || 'Unterrichtsinhalt' };
                  });

                  return subjectsToShow.map(({ key, label, sub }) => {
                    const entries = kData[key] || [];
                    return (
                      <div key={key} className="p-4 sm:p-5 flex flex-col md:flex-row gap-4 items-start hover:bg-slate-50/50 transition-all">
                        <div className="w-full md:w-[280px] shrink-0">
                          <h4 className="font-extrabold text-[0.8125rem] text-slate-800 leading-tight mb-0.5">{label}</h4>
                          <span className="text-[0.625rem] text-slate-400 font-bold leading-normal block">{sub}</span>
                        </div>
                        <div className="flex-1 min-w-0 w-full space-y-1.5 pt-0.5">
                          {entries.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {entries.map((entry, eIdx) => (
                                <span key={eIdx} className="inline-block px-3 py-1.5 bg-slate-50 text-slate-700 font-bold text-[0.6875rem] rounded-xl border border-slate-200/60 shadow-sm leading-snug break-words">
                                  {entry}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[0.75rem] leading-tight text-slate-300 font-bold italic leading-none block py-1.5">— Keine Einträge für diese Woche —</span>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      ) : viewMode === 'day' ? (
        <section aria-label="Tagesansicht des Wochenplans" className="w-full rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Tagesplanung · {selectedDay}</h2>
              <p className="text-xs font-semibold text-slate-500">Dieselben Stunden und Daten wie im Wochenplan – Stunde anklicken zum Bearbeiten.</p>
            </div>
            <div className="flex flex-wrap gap-1" aria-label="Wochentag auswählen">
              {TAGE_NAMEN.map((tag, index) => {
                const date = new Date(monday);
                date.setDate(monday.getDate() + index);
                const isToday = formatLocalDateKey(date) === formatLocalDateKey(actualToday);
                return (
                  <button key={tag} type="button" onClick={() => setSelectedDay(tag)}
                    aria-pressed={selectedDay === tag}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold ${selectedDay === tag ? 'border-indigo-300 bg-indigo-50 text-indigo-800' : isToday ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {tag.slice(0, 2)} {date.getDate()}.{date.getMonth() + 1}.{isToday ? ' · Heute' : ''}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            {Array.from({ length: MAX_LESSON_SLOTS }, (_, idx) => {
              const item = plan[selectedDay]?.[idx];
              const fach = item?.fach || app.stammplan?.[selectedDay]?.[idx + 1] || '';
              const date = new Date(monday);
              date.setDate(monday.getDate() + TAGE_NAMEN.indexOf(selectedDay));
              const current = formatLocalDateKey(date) === formatLocalDateKey(actualToday) && isCurrentHour(selectedDay, idx);
              return (
                <button key={idx} type="button" onClick={() => openWeeklyCell(selectedDay, idx)}
                  className={`flex w-full min-w-0 items-start gap-3 rounded-xl border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${current ? 'border-emerald-400 bg-emerald-50' : item?.thema || fach ? 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/40' : 'border-dashed border-slate-200 bg-white hover:border-indigo-300'}`}>
                  <span className="w-20 shrink-0 text-xs font-extrabold text-slate-700">
                    {idx + 1}. Stunde
                    <span className="mt-1 block text-[0.6875rem] font-normal text-slate-500">
                      {configuredLessonTime(app.stundenZeiten, STUNDEN_INFO, idx + 1)}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-slate-600">{fach || 'Stunde planen'}</span>
                    <span className="mt-0.5 block whitespace-pre-wrap text-sm font-semibold text-slate-900">{item?.thema || (fach ? 'Unterrichtsinhalt ergänzen' : '+ Planung öffnen')}</span>
                    {Array.isArray(item?.schwerpunkte) && item.schwerpunkte.length > 0 && (
                      <span className="mt-1 block text-xs text-slate-600">{item.schwerpunkte.join(' · ')}</span>
                    )}
                    {item?.housework && <span className="mt-1 block text-xs text-slate-600">Hausübung: {item.housework}</span>}
                    {item?.halves?.enabled && <span className="mt-1 block text-xs text-slate-600">
                      1. Hälfte: {item.halves.first?.thema || '—'} · 2. Hälfte: {item.halves.second?.thema || '—'}
                    </span>}
                  </span>
                  {current && <span className="shrink-0 rounded-lg bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">Jetzt</span>}
                </button>
              );
            })}
          </div>
        </section>
      ) : freeWeekInfo.isEntireWeekFree ? (
        <div className="w-full pb-6" data-zoom={app?.settings?.zoomLevel}>
          <div className="overflow-hidden rounded-[2rem] border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-amber-50 shadow-sm">
            <div className="px-6 py-10 text-center sm:px-10 sm:py-14">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-200 bg-white text-sky-600 shadow-sm">
                <Calendar size={30} />
              </div>
              <div className="mt-5 text-[0.625rem] font-black uppercase tracking-[0.2em] text-sky-700">
                KW {activeKW} · {monday.toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit" })}–{friday.toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit" })}
              </div>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Diese Woche ist schulfrei</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-slate-600">
                {freeWeekInfo.label}. Das leere Stundenraster wird ausgeblendet, damit Termine und Planung im Vordergrund bleiben.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm">
                <ChevronLeft size={14} />
                Mit den Pfeilen oben zu einer Unterrichtswoche wechseln
                <ChevronRight size={14} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full pb-6" data-zoom={app?.settings?.zoomLevel}>
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-2xl relative">
           <div className="overflow-x-auto hide-scrollbar">
              
              {/* THE WRAPPER TO ENSURE SYNCED SCROLLING AND STICKY HEADER */}
              <div className="min-w-[62.5rem] flex flex-col">
                
                {/* ROW 1: HEADER (Sticky ABOVE the table as requested) */}
                <div className="sticky top-0 z-[160] grid grid-cols-[5rem_repeat(5,minmax(0,1fr))] bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <div className="sticky left-0 z-[165] bg-slate-50/90 backdrop-blur-sm border-r border-slate-200 flex flex-col items-center justify-center p-4">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mb-1">
                      <Clock size={14} className="text-slate-500" strokeWidth={2.5} />
                    </div>
                    <span className="text-[0.5rem] font-black text-slate-400 uppercase tracking-widest">Stunde</span>
                  </div>
                  {TAGE_NAMEN.map((tag, i) => {
                    const date = new Date(monday);
                    date.setDate(monday.getDate() + i);
                    const dateStr = formatLocalDateKey(date);
                    const isToday = date.toDateString() === actualToday.toDateString();
                    const { status, isOverride, holidayName } = getDayStatus(date);
                    
                    return (
                      <div key={tag} className={`p-4 flex flex-col items-center justify-center relative transition-all duration-300 ${isToday ? 'bg-emerald-50/50' : ''} border-r border-slate-200/50 last:border-r-0`}>
                        <button 
                          onClick={() => setDateStatusMenu(dateStatusMenu === dateStr ? null : dateStr)}
                          className="flex flex-col items-center group/header"
                        >
                          <span className={`text-[0.625rem] font-black uppercase tracking-[0.25em] mb-1.5 ${isToday ? 'text-emerald-600' : 'text-slate-400'}`}>{tag}</span>
                          <div className="flex items-baseline gap-2">
                            <span className={`text-[1.875rem] leading-tight font-black tracking-tighter ${isToday ? 'text-emerald-700' : status === 'free' ? 'text-rose-500' : 'text-slate-900'}`}>{date.getDate()}.</span>
                            <span className="text-[0.6875rem] font-bold uppercase opacity-30 text-slate-500">{date.toLocaleDateString('de-AT', { month: 'short' }).toUpperCase()}</span>
                          </div>
                        </button>

                        <div className="h-6 flex items-center justify-center">
                          {status === 'free' ? (
                            <div className="px-2 py-0.5 bg-rose-500 text-white rounded-full text-[0.4375rem] font-black uppercase tracking-tight shadow-sm shadow-rose-200 flex items-center gap-1">
                              {holidayName || 'Frei'}
                              {isOverride && <Plus size={8} className="rotate-45" />}
                            </div>
                          ) : isOverride ? (
                            <div className="px-2 py-0.5 bg-emerald-500 text-white rounded-full text-[0.4375rem] font-black uppercase tracking-tight shadow-sm flex items-center gap-1">
                              Schultag
                              <Check size={8} />
                            </div>
                          ) : null}
                        </div>

                        {/* Absence Indicator */}
                        {(() => {
                          const absentees = (app.schueler || []).filter(s => {
                            const dayData = app.anwesenheit?.[s.id]?.[dateStr];
                            return dayData && Object.values(dayData).some(st => st === 'e' || st === 'u');
                          });
                          if (absentees.length > 0) {
                            return (
                              <div className="mt-1 flex items-center justify-center">
                                <span 
                                  className="text-[0.5625rem] font-black text-rose-600 bg-rose-50 border border-rose-200/50 px-2.5 py-0.5 rounded-full flex items-center gap-1 cursor-help"
                                  title={absentees.map(s => `${s.vorname} ${s.nachname}`).join(', ')}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                  <span>{absentees.length} abwesend</span>
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {/* Day Progress Indicator */}
                        {(() => {
                          const progress = getDayProgress(tag);
                          if (progress.total > 0) {
                            return (
                              <div className="w-full max-w-[80px] mt-2 flex flex-col items-center gap-1 select-none">
                                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                  <div 
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out" 
                                    style={{ width: `${progress.percent}%` }}
                                  />
                                </div>
                                <span className="text-[0.5rem] font-black uppercase text-slate-400 tracking-wider">
                                  {progress.prepared}/{progress.total} vorbereitet · {progress.completed} erledigt
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {/* Status Toggle Menu */}
                        <AnimatePresence>
                          {dateStatusMenu === dateStr && (
                            <>
                              <div className="fixed inset-0 z-[190]" onClick={() => setDateStatusMenu(null)} />
                              <motion.div 
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[200] "
                              >
                                <div className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest p-2 mb-1">Status für {date.toLocaleDateString('de-AT')}</div>
                                <button 
                                  onClick={() => handleToggleDayStatus(dateStr, 'school')}
                                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${status === 'school' ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50 text-slate-600'}`}
                                >
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${status === 'school' ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                                    <Calendar size={14} />
                                  </div>
                                  <span className="text-[0.6875rem] font-black uppercase tracking-tight">Schultag</span>
                                </button>
                                <button 
                                  onClick={() => handleToggleDayStatus(dateStr, 'free')}
                                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${status === 'free' ? 'bg-rose-50 text-rose-700' : 'hover:bg-slate-50 text-slate-600'}`}
                                >
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${status === 'free' ? 'bg-rose-100' : 'bg-slate-100'}`}>
                                    <PartyPopper size={14} />
                                  </div>
                                  <span className="text-[0.6875rem] font-black uppercase tracking-tight">Frei / Ferien</span>
                                </button>
                                {isOverride && (
                                  <button 
                                    onClick={() => {
                                      setApp(prev => {
                                        const next = { ...prev };
                                        delete next.calendarOverrides?.[dateStr];
                                        return next;
                                      });
                                      setDateStatusMenu(null);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-400 hover:bg-slate-50 transition-all mt-1 border-t border-slate-50 pt-3"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                                      <X size={14} />
                                    </div>
                                    <span className="text-[0.625rem] font-black uppercase tracking-tight italic">Reset</span>
                                  </button>
                                )}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>

                        {isToday && <div className="absolute bottom-0 inset-x-8 h-1 bg-emerald-500 rounded-t-full shadow-[0_-4px_10px_rgba(16,185,129,0.5)]" />}
                      </div>
                    );
                  })}
                </div>

                {/* THE TABLE BODY */}
                <div id="weekly-plan-grid" className="grid grid-cols-[5rem_repeat(5,minmax(0,1fr))]">

                {/* FIRST ROW: TIME-INDEPENDENT EVENTS / APPOINTMENTS / CONFERENCES */}
                <div className="contents group/row">
                  {/* Label (Sticky Left) */}
                  <div style={{ gridColumn: 1, gridRow: 1 }} className="sticky left-0 bg-white/95 backdrop-blur-sm border-r border-slate-200 border-b border-slate-100 flex flex-col items-center justify-center p-2 z-[100] group-hover/row:bg-slate-50 transition-colors shadow-[4px_0_15px_-5px_rgba(0,0,0,0.05)] min-h-[3.75rem]">
                    <div className="text-center">
                      <span className="text-[0.5625rem] font-black text-slate-700 uppercase tracking-widest block leading-none">Termine</span>
                      <span className="text-[0.4375rem] font-bold text-slate-400 uppercase tracking-wider block mt-1">& Konf.</span>
                    </div>
                  </div>

                  {/* Day Cells for Time-Independent Entries */}
                  {TAGE_NAMEN.map((tag, tIdx) => {
                    const date = new Date(monday);
                    date.setDate(monday.getDate() + tIdx);
                    const isToday = date.toDateString() === actualToday.toDateString();
                    
                    const dayData = plan[tag] || {};
                    const list = dayData.zeitunabhaengig || [];

                    // Filter out in Schüler-WOPL if active
                    const filteredList = hideEventsInView ? [] : list;

                    return (
                      <div 
                        key={`zeitunabhaengig-${tag}`}
                        style={{ gridColumn: tIdx + 2, gridRow: 1 }}
                        className={`p-2 border-r border-b border-slate-100 min-h-[3.75rem] flex flex-col justify-between group/cell relative transition-all ${
                          isToday ? 'bg-indigo-50/15 border-b-indigo-200/40 border-r-indigo-200/40' : 'bg-white'
                        }`}
                      >
                        {/* List of items */}
                        <div className="space-y-1.5 mb-1.5">
                          {filteredList.map((item: any) => {
                            const iconMap: Record<string, any> = {
                              event: PartyPopper,
                              test: Flag,
                              konferenz: Users,
                              spielefest: Star,
                              gespraech: MessageSquare,
                              sonstiges: Calendar
                            };
                            const IconComp = iconMap[item.type] || Calendar;
                            
                            // Color scheme based on type
                            const colorMap: Record<string, string> = {
                              konferenz: 'bg-amber-50 text-amber-800 border-amber-200',
                              event: 'bg-indigo-50 text-indigo-800 border-indigo-200',
                              test: 'bg-rose-50 text-rose-800 border-rose-200',
                              sonstiges: 'bg-slate-50 text-slate-800 border-slate-200'
                            };
                            const colors = colorMap[item.type] || 'bg-slate-50 text-slate-800 border-slate-200';

                            return (
                              <div 
                                key={item.id}
                                onClick={() => handleEditZeitunabhaengig(tag, item)}
                                className={`p-1.5 rounded-xl border text-[0.6875rem] leading-tight font-semibold flex items-center justify-between gap-1.5 cursor-pointer shadow-sm hover:scale-[1.02] hover:shadow transition-all ${colors}`}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <IconComp size={11} className="shrink-0 animate-pulse" />
                                  <span className="truncate">{item.thema}</span>
                                </div>
                                {item.ganztaegig && (
                                  <span className="text-[0.4375rem] px-1 bg-white border border-slate-200/50 rounded text-slate-500 font-bold tracking-wider uppercase scale-90 shrink-0">Tag</span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Add button on hover or always if empty */}
                        <button
                          onClick={() => handleAddZeitunabhaengig(tag)}
                          aria-label={`Termin am ${tag} hinzufügen`}
                          className={`w-full py-1 border border-dashed rounded-xl text-[0.5625rem] font-bold text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all flex items-center justify-center gap-1.5 ${
                            filteredList.length === 0 ? 'opacity-100' : 'opacity-0 group-hover/cell:opacity-100'
                          }`}
                        >
                          <Plus size={10} />
                          <span>Termin</span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* FOLLOWING ROWS: TIME SLOTS */}
                {LESSON_SLOT_NUMBERS.map((slot) => {
                  const zIdx = slot - 1;
                  const zeit = configuredLessonTime(app.stundenZeiten, STUNDEN_INFO, slot);
                  const gridRowStart = zIdx + 2 + (zIdx >= lunchAfterSlot ? 1 : 0);
                  
                  return (
                  <React.Fragment key={zIdx}>
                  <div className="contents group/row">
                    
                    {/* Time Label (Sticky Left) */}
                    <div style={{ gridColumn: 1, gridRow: gridRowStart }} className="sticky left-0 bg-white/95 backdrop-blur-sm border-r border-slate-200 border-b border-slate-100 flex flex-col items-center justify-center p-2 z-[100] group-hover/row:bg-slate-50 transition-colors shadow-[4px_0_15px_-5px_rgba(0,0,0,0.05)]">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[0.875rem] font-black text-slate-400 transition-all group-hover/row:bg-white group-hover/row:text-emerald-600 group-hover/row:border-emerald-200 group-hover/row:scale-105 group-hover/row:shadow-md">
                        {zIdx + 1}
                      </div>
                      <span className="text-[0.4375rem] font-bold text-slate-400 tabular-nums mt-1 opacity-60 tracking-wider font-mono">{zeit}</span>
                    </div>

                    {/* Day Cells for Each Slot */}
                    {TAGE_NAMEN.map((tag, tIdx) => {
                      if (skipCells.has(`${tag}-${zIdx}`)) return null;
                      let item = plan[tag]?.[zIdx];
                      let displayFach = item?.fach || app.stammplan?.[tag]?.[zIdx + 1] || '';

                      const isExcludedEvent = (item && (
                        item.type === 'sa' || 
                        item.type === 'test' || 
                        item.type === 'lzk' || 
                        item.type === 'event' || 
                        item.type === 'spielefest' || 
                        item.type === 'konferenz' || 
                        item.type === 'gespraech' || 
                        item.type === 'sonstiges'
                      )) || /^sachunterricht$|^su$/i.test(displayFach);

                      if (hideEventsInView && isExcludedEvent) {
                        item = undefined;
                        displayFach = '';
                      }

                      const style = displayFach ? getFachStyle(displayFach) : null;
                      const date = new Date(monday);
                      date.setDate(monday.getDate() + tIdx);
                      const { status, holidayName } = getDayStatus(date);
                      const isFree = status === 'free';
                      const isToday = date.toDateString() === actualToday.toDateString();
                      const cellDuration = weeklyLessonDurationSlots(item?.duration, zIdx);
                      const crossesLunch = zIdx < lunchAfterSlot && (zIdx + cellDuration) > lunchAfterSlot;
                      const spanValue = cellDuration + (crossesLunch ? 1 : 0);
                      
                      const scheduleAnalysisForWeek = app.scheduleAnalysis?.[activeKW];
                      let optimizationSuggestion = null;
                      if (scheduleAnalysisForWeek?.updates) {
                         optimizationSuggestion = scheduleAnalysisForWeek.updates.find((u: any) => u.tag === tag && u.stunde === zIdx);
                      }
                      
                      const isNowLive = isCurrentHour(tag, zIdx) && activeKW === actualKW;
                      const isSelectedStunde = isNowLive;

                      const isDraggedOver = draggedOverCell && draggedOverCell.tag === tag && draggedOverCell.idx === zIdx;

                      return (
                        <div 
                          key={`${tag}-${zIdx}`}
                          draggable={!!item && (!!item.fach || !!item.thema)}
                          onDragStart={(e) => handleDragStartPlan(e, tag, zIdx)}
                          onDragOver={(e) => e.preventDefault()}
                          onDragEnter={(e) => { e.preventDefault(); setDraggedOverCell({ tag, idx: zIdx }); }}
                          onDragLeave={() => setDraggedOverCell(null)}
                          onDrop={(e) => { handleDropPlan(e, tag, zIdx); setDraggedOverCell(null); }}
                          onClick={() => !isFree && openWeeklyCell(tag, zIdx)}
                          style={{ gridColumn: tIdx + 2, gridRow: `${gridRowStart} / span ${spanValue}`, zIndex: isSelectedStunde ? 90 : (crossesLunch ? 80 : 1) }}
                          className={`min-h-[5.3125rem] border-b border-slate-100 p-1.5 relative group/cell cursor-pointer transition-all duration-300 ${isFree ? 'bg-slate-50/30' : isToday ? 'bg-emerald-50/10' : 'bg-white'} hover:bg-slate-100/30 ${isToday ? 'ring-inset ring-1 ring-emerald-200' : ''} ${isSelectedStunde ? 'ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/25 bg-indigo-50/5' : ''} ${isNowLive ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-500/25 bg-amber-50/5' : ''} ${isDraggedOver ? 'ring-2 ring-dashed ring-emerald-500 bg-emerald-50/40 scale-[0.98] z-40' : ''} ${optimizationSuggestion ? 'ring-inset ring-2 ring-emerald-400/50 bg-emerald-50/30' : ''}`}
                        >
                          {isSelectedStunde && (
                            <div className="absolute top-1 left-1.5 z-30 flex items-center gap-1 bg-indigo-600 text-white text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md shadow-md">
                              <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                              <span>Aktiv im Cockpit</span>
                            </div>
                          )}

                          {isNowLive && (
                            <div className="absolute top-[-30px] left-0 right-0 h-10 flex items-center justify-center pointer-events-none z-[45]">
                              <div className="bg-amber-500 text-slate-950 text-[0.5rem] font-black uppercase px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 animate-pulse border border-amber-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                                <span>JETZT IM UNTERRICHT</span>
                              </div>
                            </div>
                          )}

                          {optimizationSuggestion && (
                            <div className="absolute -top-3 -right-3 z-[60] group/opt">
                              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg cursor-help border-[3px] border-white transition-transform hover:scale-110">
                                <Sparkles size={14} className="animate-pulse" />
                              </div>
                              <div className="absolute -right-2 top-full mt-2 w-64 bg-slate-900 text-white rounded-2xl p-4 shadow-2xl opacity-0 group-hover/opt:opacity-100 pointer-events-none transition-all transform scale-95 group-hover/opt:scale-100 origin-top-right z-[100] border border-slate-700/50">
                                <p className="font-black text-emerald-400 mb-2 flex items-center gap-1.5 uppercase tracking-widest text-[0.625rem]"><Sparkles size={10} /> KI-Plausibiltät</p>
                                <p className="text-sm font-medium leading-snug text-slate-200 mb-3">{optimizationSuggestion.begruendung || "Die KI empfiehlt hier eine methodische oder fachliche Anpassung für eine bessere Struktur."}</p>
                                <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/50 flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-400">Vorschlag:</span>
                                  <span className="text-sm font-black text-emerald-400">{optimizationSuggestion.fach}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {isToday && zIdx === 0 && !isNowLive && (
                            <div className="absolute top-[-30px] left-0 right-0 h-10 flex items-center justify-center pointer-events-none z-50">
                               <div className="bg-emerald-500 text-white text-[0.5rem] font-black uppercase px-2 py-0.5 rounded-full shadow-lg">Heute</div>
                            </div>
                          )}
                          {/* CONFLICT INDICATOR */}
                          {!isFree && item && app.stammplan?.[tag]?.[zIdx + 1] && item.fach !== app.stammplan[tag][zIdx + 1] && (
                            <div className="absolute top-1 right-1 z-20">
                              <AlertTriangle size={10} className="text-amber-500 animate-pulse" />
                            </div>
                          )}

                          {isFree ? (
                             <div className="h-full flex items-center justify-center opacity-10">
                                <span className="text-[0.625rem] font-black uppercase tracking-widest rotate-[-15deg]">{holidayName || 'FREI'}</span>
                             </div>
                          ) : item && (item.fach || item.thema || app.stammplan?.[tag]?.[zIdx + 1]) ? (
                            <motion.div 
                               layoutId={`${activeKW}-${tag}-${zIdx}`}
                               whileHover={{ scale: 1.03, y: -2, zIndex: 50 }}
                               className={`h-full w-full rounded-xl border border-transparent pl-4 pr-2.5 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)] transition-all flex flex-col gap-1 relative  group/card contrast-container ${style?.bg || 'bg-white'} ${item.erledigt ? '!bg-white ring-2 ring-emerald-500/20 opacity-70 saturate-[0.8]' : getContrastTextClass(style?.bg)} ${item.type === 'sa' ? 'ring-2 ring-rose-500/20' : item.type === 'test' || item.type === 'lzk' ? 'ring-2 ring-amber-500/20' : ''}`}
                            >
                               {item.halves?.enabled ? (
                                 <div className="absolute inset-0 grid grid-rows-2 overflow-hidden rounded-xl bg-white">
                                   {[
                                     { label: '1. Hälfte', data: item.halves.first },
                                     { label: '2. Hälfte', data: item.halves.second },
                                   ].map((half: any) => (
                                     <div
                                       key={half.label}
                                       className="relative min-h-0 border-b last:border-b-0 border-slate-200 px-3 py-2 flex flex-col justify-center"
                                       style={{
                                         borderLeftWidth: 6,
                                         borderLeftColor: half.data?.farbe || '#cbd5e1',
                                         backgroundColor: (half.data?.farbe && /^#[0-9a-fA-F]{6}$/.test(half.data.farbe))
                                           ? `${half.data.farbe}12`
                                           : '#ffffff',
                                       }}
                                     >
                                       <div className="flex items-center gap-1.5 min-w-0">
                                         <span className="shrink-0 rounded bg-white/90 border border-slate-200 px-1.5 py-0.5 text-[0.4375rem] font-black uppercase tracking-wider text-slate-500">
                                           {half.label}
                                         </span>
                                         {half.data?.fach && (
                                           <span className="truncate text-[0.5625rem] font-black text-slate-800">{half.data.fach}</span>
                                         )}
                                         {half.data?.unterbereich && (
                                           <span className="truncate rounded bg-white/80 px-1 py-0.5 text-[0.4375rem] font-bold text-slate-600">
                                             {formatSchwerpunktLabel(half.data.unterbereich)}
                                           </span>
                                         )}
                                       </div>
                                       <div className="mt-1 truncate text-[0.6875rem] font-bold text-slate-700">
                                         {half.data?.thema || '—'}
                                       </div>
                                     </div>
                                   ))}
                                   <div className="absolute right-1.5 top-1.5 z-20 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                     <button
                                       type="button"
                                       onClick={(event) => { event.stopPropagation(); setCopiedLesson({ ...item }); }}
                                       className="flex h-5 w-5 items-center justify-center rounded bg-white/90 text-slate-600 shadow-sm"
                                       title="Geteilte Einheit kopieren"
                                     >
                                       <Copy size={9} />
                                     </button>
                                     <button
                                       type="button"
                                       onClick={(event) => toggleDoneStatus(event, tag, zIdx)}
                                       className="flex h-5 w-5 items-center justify-center rounded bg-white/90 text-emerald-600 shadow-sm"
                                       title={item.erledigt ? 'Als unerledigt markieren' : 'Als erledigt markieren'}
                                     >
                                       <Check size={9} />
                                     </button>
                                   </div>
                                 </div>
                               ) : (
                                 <>
                               {/* Left Accent timeline bar matching subject color config */}
                               {(() => {
                                 const hex = getFachHexColor(app.fachConfig?.[item.fach || app.stammplan?.[tag]?.[zIdx + 1]]?.color || item.fach || app.stammplan?.[tag]?.[zIdx + 1]);
                                 return (
                                   <div
                                     className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl opacity-85 z-20"
                                     style={{ backgroundColor: hex }}
                                   />
                                 );
                               })()}

                               {/* Subtle Pattern overlay */}
                               <div className="absolute inset-0 opacity-[0.03] pointer-events-none group-hover/card:opacity-[0.05] transition-opacity">
                                 <svg width="100%" height="100%"><rect width="100%" height="100%" fill="url(#dotPattern)" /></svg>
                               </div>

                               {item.erledigt && (
                                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 pointer-events-none z-0">
                                   <Check size={80} strokeWidth={3} className="text-emerald-500" />
                                 </div>
                               )}

                               <div className={`flex items-center justify-between relative z-10 gap-1 w-full min-w-0 ${item.erledigt ? 'opacity-50' : ''}`}>
                                   <div className="flex items-center gap-1 min-w-0 flex-1">
                          {(item.fach || app.stammplan?.[tag]?.[zIdx + 1]) && (
                            <div className="flex flex-wrap gap-1">
                              <div className={`text-wrap leading-tight break-words px-1.5 py-0.5 rounded-md text-[0.5rem] font-black uppercase tracking-widest shadow-sm ${item.type === 'sa' ? 'bg-rose-600 text-white' : item.type === 'test' || item.type === 'lzk' ? 'bg-amber-500 text-white' : 'bg-white/90 text-slate-800'}`}>
                                {item.fach || app.stammplan?.[tag]?.[zIdx + 1]}
                              </div>
                              {item.schwerpunkte?.map((sp: string) => {
                                let spColor = 'bg-blue-600 text-white';
                                let SpIcon = null;
                                const lower = sp.toLowerCase();
                                if (lower.includes('lesen') || lower === 'l' || lower === 'deutsch (lesen)') { spColor = 'bg-sky-500 text-white'; SpIcon = BookOpen; }
                                else if (lower.includes('rechtschreibung') || lower === 'rs' || lower === 'deutsch (rechtschreibung)') { spColor = 'bg-emerald-500 text-white'; SpIcon = Zap; }
                                else if (lower.includes('sprache') || lower.includes('sprachbetrachtung') || lower === 'sp' || lower === 'deutsch (sprache)') { spColor = 'bg-amber-500 text-white'; SpIcon = MessageSquare; }
                                else if (lower.includes('verfassen') || lower === 'vt' || lower.includes('texte') || lower === 'deutsch (verfassen von texten)') { spColor = 'bg-indigo-500 text-white'; SpIcon = Pencil; }
                                
                                return (
                                  <div key={sp} className={`${spColor} text-wrap leading-tight break-words px-1 py-0.5 rounded-md text-[0.4375rem] font-black uppercase tracking-tighter shadow-sm flex items-center gap-0.5`} title={sp}>
                                    {SpIcon && <SpIcon size={8} />}
                                    {sp.replace('Deutsch ', '').replace('(', '').replace(')', '').slice(0, 4)}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                                      {item.type === 'sa' && <Flag size={8} className="text-rose-600 animate-pulse shrink-0" fill="currentColor" />}
                                      {item.type === 'spielefest' && <PartyPopper size={8} className="text-fuchsia-600 shrink-0" />}
                                      {item.type === 'konferenz' && <Users size={8} className="text-blue-600 shrink-0" />}
                                      {item.type === 'gespraech' && <MessageSquare size={8} className="text-violet-600 shrink-0" />}
                                      {item.type === 'sonstiges' && <Calendar size={8} className="text-rose-600 shrink-0" />}
                                   </div>
                                  <div className={`flex items-center gap-1 transition-all ${item.erledigt ? 'opacity-100' : 'opacity-0 group-hover/card:opacity-100'} shrink-0 z-30`}>
                                     <button 
                                       onClick={(e) => { e.stopPropagation(); setCopiedLesson({ ...item }); }}
                                       className="w-5 h-5 rounded-md bg-white/50 hover:bg-white flex items-center justify-center hover:scale-110 active:scale-90 transition-all text-slate-700 shadow-sm"
                                       title="Stunde kopieren"
                                     >
                                       <Copy size={10} />
                                     </button>

                                     {zIdx < 7 && (
                                       <button 
                                         onClick={(e) => duplicateLessonBlock(e, tag, zIdx)}
                                         className="w-5 h-5 rounded-md bg-white/50 hover:bg-white flex items-center justify-center hover:scale-110 active:scale-90 transition-all text-slate-700 shadow-sm"
                                         title="In die nächste Stunde duplizieren"
                                       >
                                         <Zap size={10} />
                                       </button>
                                     )}

                                     <button 
                                       onClick={(e) => toggleDoneStatus(e, tag, zIdx)}
                                       className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${item.erledigt ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-white/40 border-slate-200 hover:border-emerald-400 hover:text-emerald-500 hover:bg-emerald-50'} z-20`}
                                       title={item.erledigt ? "Als unerledigt markieren" : "Als erledigt markieren"}
                                     >
                                        <Check size={10} strokeWidth={item.erledigt ? 3 : 2} className={item.erledigt ? 'opacity-100' : 'opacity-0 hover:opacity-100'} />
                                     </button>
                                     
                                     <button 
                                       onClick={(e) => { e.stopPropagation(); handleEditCell(tag, zIdx); }}
                                       className="w-5 h-5 rounded-md bg-white/40 flex items-center justify-center hover:bg-white hover:scale-110 transition-all text-slate-600"
                                       title="Bearbeiten"
                                     >
                                       <Layout size={9} />
                                     </button>
                                  </div>
                               </div>
                               
                               <div className={`text-[0.8125rem] font-bold leading-tight ${getContrastTextClass(style?.bg)} line-clamp-2 select-none tracking-tight group-hover/card:opacity-95 transition-colors relative z-10 break-words  text-ellipsis ${item.erledigt ? 'line-through decoration-slate-400 opacity-60' : ''}`}>
                                 {item.thema || (app.stammplan?.[tag]?.[zIdx + 1] ? 'Standardunterricht' : '')}
                               </div>

                               {/* Hover-Expanded Reflection Notes Box */}
                               {item.reflexion && (
                                 <div className="mt-1 flex items-start gap-1 bg-black/[0.03] p-1.5 rounded-lg border border-black/[0.02] relative z-10 text-[0.6875rem] italic leading-tight text-slate-500 line-clamp-1 group-hover/card:line-clamp-none transition-all duration-300 select-none shadow-inner">
                                   <MessageSquare size={9} className="shrink-0 mt-0.5 text-indigo-500" />
                                   <span>"{item.reflexion}"</span>
                                 </div>
                               )}
                               
                               {/* Footer info (Tags/Meta) */}
                               <div className="mt-auto pt-1.5 flex flex-wrap gap-1 border-t border-black/[0.03] relative z-10">
                                 {item.duration === 'all' && (
                                   <div className="px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[0.4375rem] font-black uppercase tracking-wider shadow-sm flex items-center gap-0.5">
                                     <Calendar size={8} /> Restlicher Tag
                                   </div>
                                 )}
                                 {typeof item.duration === 'number' && item.duration > 1 && (
                                   <div className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[0.4375rem] font-black uppercase tracking-wider shadow-sm">
                                     {item.duration} Std.
                                   </div>
                                 )}
                                  {(item.material || item.materialIds?.length > 0) && (
                                    <div
                                      className="px-1 py-0.5 rounded bg-white/50 text-[0.4375rem] font-black text-slate-600 uppercase tracking-tighter border border-black/5 flex items-center gap-0.5"
                                      title={[
                                        item.material,
                                        ...(item.materialIds || []).map((id: string) => app.materialien?.find(m => m.id === id)?.titel).filter(Boolean)
                                      ].filter(Boolean).join(' · ')}
                                    >
                                      <Paperclip size={7} />
                                      {item.materialIds?.length > 0 ? `${item.materialIds.length} Mat.` : 'Mat.'}
                                    </div>
                                  )}
                                 {item.housework && (
                                   <div className="px-1 py-0.5 rounded bg-emerald-500 text-white text-[0.4375rem] font-black uppercase tracking-tighter shadow-sm shadow-emerald-200">HÜ</div>
                                 )}
                                 {app.wochenplan_lehrplan?.[`${activeKW}-${tag}-${zIdx}`]?.length > 0 && (
                                   <div className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[0.375rem] font-black uppercase tracking-tighter flex items-center gap-0.5" title="Lehrplan zugeordnet">
                                     <Book size={8} /> LP
                                   </div>
                                 )}
                                 <div className="ml-auto flex items-center gap-1 grayscale opacity-40 group-hover/card:grayscale-0 group-hover/card:opacity-100 transition-all">
                                    {item.social === 'group' && <Users size={8} />}
                                    {item.social === 'partner' && <Users2 size={8} />}
                                    {item.social === 'single' && <User size={8} />}
                                 </div>
                               </div>
                                 </>
                               )}
                            </motion.div>
                          ) : (
                            <div className={`h-full min-h-[4.6875rem] rounded-2xl border border-dashed transition-all duration-300 flex flex-col items-center justify-center ${copiedLesson ? 'border-indigo-400 bg-indigo-50/20 opacity-100 animate-pulse' : 'border-slate-200 opacity-0 group-hover/cell:opacity-100 bg-white hover:bg-emerald-50/30 hover:border-emerald-200'} group/btn`}>
                               {copiedLesson ? (
                                 <button
                                   onClick={(e) => { e.stopPropagation(); pasteLessonBlock(e, tag, zIdx); }}
                                   className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white shadow-md border border-indigo-200 hover:bg-indigo-50 hover:scale-105 active:scale-95 transition-all text-indigo-700 font-extrabold text-[0.5625rem] max-w-[95%] text-center"
                                 >
                                   <Clipboard size={11} className="text-indigo-600 animate-bounce shrink-0" />
                                   <span className="truncate w-full">{copiedLesson.fach ? `${copiedLesson.fach} einfügen` : 'Hier einfügen'}</span>
                                 </button>
                               ) : (
                                 <div className="w-8 h-8 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center group-hover/btn:scale-110 group-hover/btn:rotate-90 transition-all duration-500">
                                   <Plus size={16} className="text-emerald-500" strokeWidth={2.5} />
                                 </div>
                               )}
                            </div>
                          )}
                          <div className="absolute bottom-0 inset-x-12 h-1 bg-emerald-500/20 scale-x-0 group-hover/cell:scale-x-100 transition-transform origin-center duration-500 rounded-t-full" />
                        </div>
                      );
                    })}
                    {zIdx === lunchAfterSlot - 1 && (
                      <React.Fragment>
                        <div style={{ gridColumn: 1, gridRow: lunchAfterSlot + 2 }} className="sticky left-0 bg-slate-100/50 backdrop-blur-sm border-r border-slate-200 flex items-center justify-center p-1 z-[90]">
                           <span className="text-[0.375rem] font-black text-slate-400 uppercase tracking-widest [writing-mode:vertical-lr] rotate-180">Pause</span>
                        </div>
                        {(() => {
                          const isDayCrossed = (tag: string) => {
                            return Array.from({ length: lunchAfterSlot }, (_, hIdx) => hIdx).some((hIdx) => {
                              const item = plan[tag]?.[hIdx];
                              if (!item) return false;
                              const dur = weeklyLessonDurationSlots(item.duration, hIdx);
                              return hIdx + dur > lunchAfterSlot;
                            });
                          };
                          const nonCrossedTags = TAGE_NAMEN.filter(tag => !isDayCrossed(tag));
                          const midTag = nonCrossedTags[Math.floor(nonCrossedTags.length / 2)];

                          return TAGE_NAMEN.map((tag, tIdx) => {
                            if (isDayCrossed(tag)) return null;
                            const isMid = tag === midTag;
                            return (
                              <div 
                                key={`pause-screen-${tag}`}
                                style={{ gridColumn: tIdx + 2, gridRow: lunchAfterSlot + 2 }} 
                                className="h-8 bg-slate-50/10 flex items-center justify-center border-b border-slate-100 relative z-20"
                              >
                                 <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                                   <svg width="100%" height="100%"><rect width="100%" height="100%" fill="url(#dotPattern)" /></svg>
                                 </div>
                                 {isMid && (
                                   <div className="flex items-center gap-3">
                                     <div className="h-[1px] w-4 bg-slate-200" />
                                     <span className="text-[0.5625rem] font-black uppercase tracking-[0.3em] text-slate-400/60 flex items-center gap-2">
                                       <Clock size={10} /> Mittagspause
                                     </span>
                                     <div className="h-[1px] w-4 bg-slate-200" />
                                   </div>
                                 )}
                              </div>
                            );
                          });
                        })()}
                      </React.Fragment>
                    )}
                  </div>
                  </React.Fragment>
                  );
                })}
                </div>
              </div>

           </div>
        </div>
      </div>
      )}

      {hasFreeDayInWeek && !freeWeekInfo.isEntireWeekFree && (
        <div className="bg-indigo-50/50 border border-indigo-100 py-3 px-5 mt-4 rounded-2xl flex items-center gap-3">
          <Info size={16} className="text-indigo-400 shrink-0" />
          <p className="text-[0.6875rem] font-semibold text-indigo-800 tracking-wide">
            <strong>Wichtig:</strong> Wenn ein Schultag als "frei" oder "Feiertag" markiert ist, können Sie ihn durch einen <strong>Klick auf das Datum im Spaltenkopf</strong> wieder zu einem regulären Schultag machen (und umgekehrt).
          </p>
        </div>
      )}

      {/* GARAGE & WEEKEND CHECK-IN SECTION */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PARKGARAGE */}
        <div 
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDropToParkgarage}
          className="lg:col-span-2 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-6 transition-all hover:bg-slate-100/50 hover:border-slate-300 relative flex flex-col justify-between min-h-[160px]"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚗</span>
                <h4 className="text-[0.875rem] font-bold text-slate-800">Parkgarage (Stunden-Schubser)</h4>
              </div>
              {parkedLessons.length > 0 && (
                <span className="text-[0.625rem] font-black uppercase bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md">
                  {parkedLessons.length} Einheiten geparkt
                </span>
              )}
            </div>

            {parkedLessons.length === 0 ? (
              <div className="text-center py-6 text-slate-400 select-none">
                <p className="text-[0.75rem] font-bold">Die Parkgarage ist leer</p>
                <p className="text-[0.6875rem] mt-1">Zieh eine Unterrichtsstunde aus dem Wochenplan hierher, um sie für später aufzuheben.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto no-scrollbar p-1">
                {parkedLessons.map((item: any, pIdx: number) => (
                  <div
                    key={item.id || pIdx}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('parkedLessonIndex', String(pIdx));
                    }}
                    className="bg-white border border-slate-150 p-3.5 rounded-2xl shadow-xs hover:shadow-md cursor-grab active:cursor-grabbing transition-all flex flex-col gap-2 relative group text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[0.625rem] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {item.fach}
                      </span>
                      <button 
                        onClick={() => {
                          setApp(prev => {
                            const p = [...(prev.parkgarage || [])];
                            p.splice(pIdx, 1);
                            return { ...prev, parkgarage: p };
                          });
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition-all"
                        title="Aus Parkgarage löschen"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <p className="text-[0.75rem] font-bold text-slate-800 line-clamp-2 leading-tight">
                      {item.thema}
                    </p>
                    <div className="flex justify-between items-center text-[0.5625rem] text-slate-400 mt-1 select-none">
                      <span>Geparkt am {item.parkedAt || "heute"}</span>
                      <span className="font-semibold text-indigo-500">Zieh mich im Plan!</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* WOCHENEND CHECK-IN CARD */}
        <div className="bg-gradient-to-br from-amber-500/10 to-emerald-500/5 border border-slate-150 rounded-3xl p-6 flex flex-col justify-between min-h-[160px] text-left">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">☕</span>
              <h4 className="text-[0.875rem] font-bold text-slate-800">Wochenend-Check-In & Cool Down</h4>
            </div>
            <p className="text-[0.6875rem] text-slate-500 leading-normal">
              Schließe deine Schulwoche entspannt ab! Beantworte 3 kurze Reflexionsfragen und erstelle deine "Kopf-Frei-Liste" für ein erholsames Wochenende.
            </p>
          </div>
          <button 
            onClick={() => handleStartWochenendCheckIn()}
            className="w-full mt-4 bg-slate-900 text-white hover:bg-slate-800 text-[0.75rem] font-black uppercase tracking-wider py-3.5 px-4 rounded-2xl shadow-sm hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Check-In starten</span>
            <span>➔</span>
          </button>
        </div>
      </div>
      </div>

       {/* TIME-INDEPENDENT MODAL */}
      {editingZeitunabhaengig && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-4">
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setEditingZeitunabhaengig(null)} />
           <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-lg flex flex-col max-h-[92vh] mx-auto overflow-hidden"
           >
              <div className="px-6 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div>
                    <h3 className="text-[1.25rem] leading-normal font-black text-slate-900 tracking-tight">Termin / Konferenz planen</h3>
                    <p className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest mt-1">
                      {editingZeitunabhaengig.tag} • Zeitunabhängig • KW {activeKW}
                    </p>
                 </div>
                 <button onClick={() => setEditingZeitunabhaengig(null)} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400"><X size={20} /></button>
              </div>

              <div className="p-6 space-y-4">
                 <div className="space-y-1">
                    <label className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest">Beschreibung / Thema</label>
                    <input 
                      type="text" 
                      value={tempZeitThema} 
                      onChange={(e) => setTempZeitThema(e.target.value)}
                      placeholder="z.B. Konferenz, Elternabend, Zahnarzt, Sportfest..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[0.875rem] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-900"
                    />
                 </div>

                 <div className="space-y-1">
                    <label className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest">Einheitstyp</label>
                    <select 
                      value={tempZeitType} 
                      onChange={(e) => setTempZeitType(e.target.value as any)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[0.875rem] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-900"
                    >
                      <option value="sonstiges">Termin / Sonstiges</option>
                      <option value="konferenz">Konferenz / Sitzung</option>
                      <option value="event">Ausflug / Event</option>
                      <option value="test">Test / SA</option>
                      <option value="gespraech">Gespräch</option>
                      <option value="spielefest">Spiel / Feste</option>
                    </select>
                 </div>

                 <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/50 cursor-pointer hover:bg-slate-100/50 transition-all">
                    <input 
                      type="checkbox" 
                      checked={tempZeitGanztaegig} 
                      onChange={(e) => setTempZeitGanztaegig(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-[0.75rem] leading-tight font-black text-slate-800">Ganztägiges Ereignis</span>
                      <span className="text-[0.5625rem] font-medium text-slate-400 uppercase tracking-wider">Nimmt den ganzen Schultag ein</span>
                    </div>
                 </label>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                 {editingZeitunabhaengig.item ? (
                    <button 
                      onClick={handleDeleteZeitunabhaengig}
                      className="px-4 py-3 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-2xl font-black text-[0.6875rem] leading-none uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Löschen
                    </button>
                 ) : <div />}

                 <div className="flex gap-2">
                    <button 
                      onClick={() => setEditingZeitunabhaengig(null)}
                      className="px-4 py-3 text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl font-black text-[0.6875rem] leading-none uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Abbrechen
                    </button>
                    <button 
                      onClick={handleSaveZeitunabhaengig}
                      disabled={!tempZeitThema.trim()}
                      className="px-4 py-3 text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-black text-[0.6875rem] leading-none uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-indigo-600/10"
                    >
                      Speichern
                    </button>
                 </div>
              </div>
           </motion.div>
        </div>,
        document.body
      )}

      {/* PLANNED LESSON OVERVIEW */}
      {viewingCell && (() => {
        const lesson = plan[viewingCell.tag]?.[viewingCell.idx] || {};
        const fallbackSubject = app.stammplan?.[viewingCell.tag]?.[viewingCell.idx + 1] || '';
        const displaySubject = lesson.fach || fallbackSubject || 'Ohne Fach';
        const availableSubjects = sortYearlySubjects(app.jahresplan_faecher || DEFAULT_YEARLY_SUBJECTS);
        const yearPlanState = addWeeklyLessonToEmptyYearPlan({
          existingPlan: app.jahresplanung || {},
          kw: activeKW,
          lesson,
          fallbackSubject,
          availableSubjects,
        });
        const typeLabel: Record<string, string> = {
          standard: 'Unterricht',
          sa: 'Schularbeit',
          test: 'Test',
          lzk: 'LZK',
          event: 'Ausflug / Event',
          spielefest: 'Spielefest',
          konferenz: 'Konferenz',
          gespraech: 'Gespräch',
          sonstiges: 'Termin',
          digital: 'Digital',
        };
        const socialLabel: Record<string, string> = {
          single: 'Einzelarbeit',
          partner: 'Partnerarbeit',
          group: 'Gruppenarbeit',
        };
        const linkedMaterials = (lesson.materialIds || [])
          .map((id: string) => app.materialien?.find(material => material.id === id)?.titel)
          .filter((title): title is string => Boolean(title));

        const closeOverview = () => {
          setViewingCell(null);
          setYearPlanSyncNotice(null);
        };

        return createPortal(
          <div className="fixed inset-0 z-[10020] flex items-center justify-center p-3 sm:p-5">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={closeOverview}
            />
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="relative flex max-h-[92vh] w-[94vw] max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-6 py-5 sm:px-8">
                <div>
                  <div className="text-[0.625rem] font-black uppercase tracking-[0.18em] text-emerald-600">Geplante Einheit</div>
                  <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{lesson.thema || 'Unterrichtseinheit'}</h3>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {viewingCell.tag} · {viewingCell.idx + 1}. Stunde · KW {activeKW}{sw ? ` · SW ${sw}` : ''}
                  </p>
                </div>
                <button type="button" onClick={closeOverview} className="rounded-full p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
                  <X size={22} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-6 sm:p-8">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
                    <div className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400">Fach & Inhalt</div>
                    <div className="mt-2 text-base font-black text-slate-900">{displaySubject}</div>
                    <div className="mt-2 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-700">{lesson.thema || '—'}</div>
                    {lesson.schwerpunkte?.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {lesson.schwerpunkte.map((value: string) => (
                          <span key={value} className="rounded-full bg-blue-50 px-2.5 py-1 text-[0.625rem] font-black text-blue-700">
                            {formatSchwerpunktLabel(value)}
                          </span>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                    <div className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400">Rahmen</div>
                    <dl className="mt-3 space-y-2 text-xs">
                      <div className="flex justify-between gap-3"><dt className="font-semibold text-slate-500">Typ</dt><dd className="text-right font-black text-slate-800">{typeLabel[lesson.type || 'standard'] || lesson.type || 'Unterricht'}</dd></div>
                      <div className="flex justify-between gap-3"><dt className="font-semibold text-slate-500">Dauer</dt><dd className="text-right font-black text-slate-800">{lesson.duration === 'all' ? 'Restlicher Tag' : `${lesson.duration || 1} Std.`}</dd></div>
                      <div className="flex justify-between gap-3"><dt className="font-semibold text-slate-500">Sozialform</dt><dd className="text-right font-black text-slate-800">{socialLabel[lesson.social || 'single'] || 'Einzelarbeit'}</dd></div>
                      <div className="flex justify-between gap-3"><dt className="font-semibold text-slate-500">Status</dt><dd className="text-right font-black text-slate-800">{lesson.erledigt ? 'Erledigt' : 'Geplant'}</dd></div>
                    </dl>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400">Material</div>
                    <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-slate-700">{lesson.material || 'Kein freier Materialhinweis'}</p>
                    {linkedMaterials.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {linkedMaterials.map((title: string) => <div key={title} className="text-xs font-bold text-indigo-700">• {title}</div>)}
                      </div>
                    )}
                  </section>

                  <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
                    <div className="text-[0.625rem] font-black uppercase tracking-wider text-emerald-700">Hausübung</div>
                    <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-slate-700">{lesson.housework || 'Keine Hausübung eingetragen'}</p>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400">Methodik</div>
                    <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-slate-700">{lesson.method || 'Keine Methodik-Notiz'}</p>
                  </section>

                  {lesson.reflexion && (
                    <section className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5 lg:col-span-2">
                      <div className="text-[0.625rem] font-black uppercase tracking-wider text-amber-700">Reflexion</div>
                      <p className="mt-2 whitespace-pre-wrap text-sm font-medium italic text-slate-700">{lesson.reflexion}</p>
                    </section>
                  )}

                  {lesson.halves?.enabled && (
                    <section className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-5 lg:col-span-3">
                      <div className="text-[0.625rem] font-black uppercase tracking-wider text-cyan-700">Geteilte Einheit</div>
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {[lesson.halves.first, lesson.halves.second].map((half: any, index: number) => (
                          <div key={index} className="rounded-xl border border-cyan-100 bg-white p-4">
                            <div className="text-[0.625rem] font-black uppercase text-cyan-600">{index === 0 ? '1. Hälfte' : '2. Hälfte'}</div>
                            <div className="mt-1 text-xs font-bold text-slate-500">{half?.fach || '—'}{half?.unterbereich ? ` · ${formatSchwerpunktLabel(half.unterbereich)}` : ''}</div>
                            <div className="mt-2 text-sm font-semibold text-slate-800">{half?.thema || '—'}</div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>

                <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-xs font-black text-indigo-950">Wochenplan → Jahresplan</div>
                      <p className="mt-1 text-xs font-medium leading-relaxed text-indigo-800">
                        {yearPlanState.status === 'added'
                          ? 'Für dieses Fach ist KW ' + activeKW + ' im Jahresplan noch frei. Du kannst die Einheit mit einem Klick übernehmen.'
                          : yearPlanState.status === 'occupied'
                            ? 'Der Jahresplan enthält für dieses Fach in KW ' + activeKW + ' bereits einen Eintrag. Klassio überschreibt ihn nicht.'
                            : 'Für die Übernahme braucht die Einheit ein Thema und eine passende Jahresplan-Spalte.'}
                      </p>
                    </div>
                    {yearPlanState.status === 'added' && (
                      <button
                        type="button"
                        onClick={() => addWeeklyLessonToYearPlan(viewingCell.tag, viewingCell.idx)}
                        className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white transition-colors hover:bg-indigo-700"
                      >
                        In Jahresplan übernehmen
                      </button>
                    )}
                  </div>
                  {yearPlanSyncNotice && <p className="mt-3 text-xs font-bold text-emerald-700">{yearPlanSyncNotice}</p>}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeOverview} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-black text-slate-600 hover:bg-slate-100">
                  Schließen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = { ...viewingCell };
                    setViewingCell(null);
                    setYearPlanSyncNotice(null);
                    handleEditCell(target.tag, target.idx);
                  }}
                  className="rounded-xl bg-emerald-600 px-6 py-3 text-xs font-black text-white shadow-sm hover:bg-emerald-700"
                >
                  <Pencil size={14} className="mr-2 inline" /> Bearbeiten
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        );
      })()}

      {/* PLANNER MODAL */}
      {editingCell && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-4">
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setEditingCell(null)} />
           <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              className="relative w-[calc(100vw-0.5rem)] sm:w-[calc(100vw-1rem)] max-w-none h-[calc(100vh-0.5rem)] sm:h-[calc(100vh-1rem)] max-h-none bg-white rounded-2xl shadow-2xl flex flex-col mx-auto overflow-hidden"
           >
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                 <div>
                    <h3 className="text-[1.875rem] leading-tight font-black text-slate-900 tracking-tight">Einheit planen</h3>
                    <p className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest mt-1">{editingCell.tag} • {editingCell.idx + 1}. Stunde • KW {activeKW}{sw && <span className="text-[0.53125rem] opacity-75 ml-1 font-bold"> (SW {sw})</span>}</p>
                 </div>
                 <button onClick={() => setEditingCell(null)} className="p-3 hover:bg-slate-100 rounded-full transition-all text-slate-400"><X size={24} /></button>
              </div>

              <div className="shrink-0 border-b border-slate-100 bg-white px-4 py-3 sm:px-6">
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  {([
                    { id: 'inhalt', label: '1 · Inhalt & Fach', hint: 'Thema, Lernziel, Fach, Lehrplan' },
                    { id: 'rahmen', label: '2 · Unterrichtsrahmen', hint: 'Typ, Dauer, Sozialform' },
                    { id: 'organisation', label: '3 · Material & HÜ', hint: 'Materialien und Hausübung' },
                    { id: 'optionen', label: '4 · Ablauf & Optionen', hint: 'Methodik, Reflexion, Wiederholung' },
                  ] as const).map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPlannerEditorTab(tab.id)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                        plannerEditorTab === tab.id
                          ? 'border-emerald-600 bg-emerald-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className={`block text-[0.6875rem] font-black ${
                        plannerEditorTab === tab.id ? 'text-emerald-800' : 'text-slate-700'
                      }`}>{tab.label}</span>
                      <span className="mt-0.5 hidden text-[0.5625rem] font-semibold text-slate-400 sm:block">{tab.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="shrink-0 border-b border-slate-100 bg-slate-50/70 px-5 py-2.5 lg:px-6">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[0.6875rem]">
                  <span className="font-black text-slate-800">{searchFach || 'Noch kein Fach gewählt'}</span>
                  <span className="text-slate-300">•</span>
                  <span className="max-w-[60vw] truncate font-semibold text-slate-500">{tempThema || 'Noch kein Thema / Lernziel eingetragen'}</span>
                </div>
              </div>

              <div key={`${editingCell.tag}-${editingCell.idx}`} className="p-4 sm:p-5 lg:p-6 overflow-y-auto no-scrollbar scroll-smooth flex-1 min-h-0">
                 
                 {plannerEditorTab === 'inhalt' && (
                   <div className="space-y-6">
                 {/* SECTION 1: WAS & WER */}
                 <div className="space-y-5">
                    <div className="flex items-center justify-between ml-1 pr-1">
                       <div className="flex items-center gap-3">
                          <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                          <label className="text-[0.75rem] font-black text-slate-900 uppercase tracking-[0.2em]">Fach & Thema</label>
                       </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              const zuordnung = app.wochenplan_lehrplan?.[`${activeKW}-${editingCell.tag}-${editingCell.idx}`]?.[0];
                              setLpFach(zuordnung?.fach || searchFach || 'Deutsch');
                              setLpKB(zuordnung?.kompetenzbereichId || '');
                              setLpAB(zuordnung?.anwendungsbereichIds || []);
                              setLehrplanStep(1);
                              setShowLehrplanModal({ tag: editingCell.tag, idx: editingCell.idx });
                            }}
                            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[0.625rem] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-colors"
                          >
                            <Book size={14} /> Lehrplan zuordnen
                          </button>
                          {searchFach && tempThema && (
                            <button 
                              type="button"
                              onClick={() => handleAddToSpacedPractice(searchFach, tempThema)}
                              className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-[0.625rem] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-100 transition-colors cursor-pointer"
                              title="Für Wiederholungs-Wecker vormerken"
                            >
                              <RefreshCw size={14} /> Für Wiederholung einplanen
                            </button>
                          )}
                          <button type="button" className="hidden" style={{display:'none'}}>
                          </button>
                          {plan[editingCell.tag]?.[editingCell.idx] && (
                            <button 
                              onClick={() => alert("Übersicht: " + tempThema)}
                              className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-[0.625rem] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-100 transition-colors"
                            >
                              <Layout size={14} /> Übersicht
                            </button>
                          )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 xl:items-start">
                        {/* THEMA */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-1">
                             <label className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">Inhalt & Lernziel</label>
                             <div className="flex gap-2">
                               <button 
                                 onClick={() => setShowDraftsSelector(true)}
                                 className="pill"
                               >
                                 <BookOpen size={12} />
                                 Aus Entwürfen
                               </button>
                               <button 
                                 onClick={handleAiSuggestion}
                                 disabled={aiLoading || !searchFach}
                                 className={`pill ${!aiLoading && searchFach ? 'active' : ''}`}
                               >
                                 {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                 {aiLoading ? 'Generiere...' : 'KI-Vorschlag'}
                               </button>
                             </div>
                           </div>
                           <textarea 
                              autoFocus
                              className="input-field h-32 py-5 px-6 resize-none"
                              placeholder="Was wird gelernt? (Thema/Lernziel)"
                              value={tempThema} onChange={e => setTempThema(e.target.value)}
                           />
                        </div>

                        {/* FACH SUCHE & BUTTONS */}
                        <div className="space-y-4">
                           <div className="relative group">
                              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
                              <input 
                                 type="text" 
                                 className="input-field pl-14 py-4 text-sm font-semibold"
                                 placeholder="Fach suchen oder direkt wählen..."
                                 value={searchFach} onChange={e => handleSetSearchFach(e.target.value)}
                              />
                           </div>

                           {/* EBENE 1: HAUPTFÄCHER */}
                           <div className="space-y-3 pt-1 px-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider">
                                  Hauptfach wählen
                                </span>
                                {searchFach && (
                                  <span className="text-[0.6875rem] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                    Aktiv: <strong className="text-slate-900">{searchFach}</strong>
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {(() => {
                                  const rawList = app.faecher && app.faecher.length > 0 
                                    ? app.faecher 
                                    : Object.keys(app.fachConfig || {}).length > 0 
                                      ? Object.keys(app.fachConfig || {}) 
                                      : FAECHER_ALLE;
                                  
                                  const allCandidates = Array.from(new Set(['Deutsch', ...rawList, ...Object.keys(app.fachConfig || {})]));
                                  
                                  const mainFaecher = allCandidates.filter(f => {
                                    if (!f || !f.trim()) return false;
                                    if (isDeutschSubSubject(f) || isMatheSubSubject(f)) return false;
                                    return true;
                                  });

                                  const specialOrder = ['Deutsch', 'Mathematik', 'Sachunterricht', 'Englisch', 'Religion', 'Musikerziehung', 'Bildnerische Erziehung', 'Bewegung und Sport', 'Werken (TEC)', 'Werken (TEX)'];
                                  
                                  mainFaecher.sort((a, b) => {
                                    const indexA = specialOrder.indexOf(a);
                                    const indexB = specialOrder.indexOf(b);
                                    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                                    if (indexA !== -1) return -1;
                                    if (indexB !== -1) return 1;
                                    return a.localeCompare(b, 'de');
                                  });

                                  return mainFaecher.map(f => {
                                    const isDeutsch = f === 'Deutsch';
                                    const isMathe = f === 'Mathematik';
                                    const isSelected =
                                      searchFach === f ||
                                      (isDeutsch && (searchFach === 'Deutsch' || searchFach.startsWith('Deutsch') || isDeutschSubSubject(searchFach))) ||
                                      (isMathe && (searchFach === 'Mathematik' || searchFach.startsWith('Mathematik') || isMatheSubSubject(searchFach)));
                                    return (
                                      <button 
                                        key={f} 
                                        type="button"
                                        onClick={() => handleSetSearchFach(f)} 
                                        className={`pill !capitalize transition-all font-bold cursor-pointer ${isSelected ? 'active shadow-sm scale-105' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}`}
                                      >
                                        {f}
                                      </button>
                                    );
                                  });
                                })()}
                              </div>

                              {/* EBENE 2: DEUTSCH-UNTERBEREICHE */}
                              <AnimatePresence>
                                {(searchFach === 'Deutsch' || searchFach.startsWith('Deutsch') || isDeutschSubSubject(searchFach)) && (
                                  <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-2.5 overflow-hidden"
                                  >
                                    <div className="w-full flex items-center justify-between pl-0.5">
                                      <div className="flex items-center gap-1.5 text-[0.6875rem] font-black uppercase text-blue-900 tracking-wider">
                                        <BookOpen size={13} className="text-blue-600" />
                                        <span>Deutsch-Unterbereiche / Schwerpunkte</span>
                                      </div>
                                      <label className="flex items-center gap-2 cursor-pointer normal-case tracking-normal hover:bg-blue-100/50 rounded-lg px-2 py-0.5 transition-colors">
                                        <input 
                                          type="checkbox" 
                                          className="sr-only" 
                                          checked={app.autoSuggestSchwerpunkte || false} 
                                          onChange={(e) => setApp(prev => ({...prev, autoSuggestSchwerpunkte: e.target.checked}))} 
                                        />
                                        <div className={`w-6 h-3.5 rounded-full relative transition-colors ${app.autoSuggestSchwerpunkte ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                                          <div className={`absolute top-[2px] left-[2px] w-2.5 h-2.5 bg-white rounded-full transition-transform ${app.autoSuggestSchwerpunkte ? 'translate-x-[10px]' : ''}`} />
                                        </div>
                                        <span className="text-[0.625rem] font-bold text-slate-600">Seltene priorisieren</span>
                                      </label>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                      {DEUTSCH_THEMENBEREICHE.map(sub => {
                                        const SubIcon = sub.icon;
                                        const isSelected = tempSchwerpunkte.some(p => {
                                          const pNorm = p.toLowerCase().trim();
                                          const subNorm = sub.label.toLowerCase();
                                          const subIdNorm = sub.id.toLowerCase();
                                          return pNorm === subNorm || pNorm === subIdNorm || pNorm.includes(subNorm) || subIdNorm.includes(pNorm);
                                        });

                                        return (
                                          <button 
                                            key={sub.id} 
                                            type="button"
                                            onClick={() => {
                                              if (isSelected) {
                                                setTempSchwerpunkte(prev => prev.filter(p => {
                                                  const pNorm = p.toLowerCase().trim();
                                                  const subNorm = sub.label.toLowerCase();
                                                  const subIdNorm = sub.id.toLowerCase();
                                                  return !(pNorm === subNorm || pNorm === subIdNorm || pNorm.includes(subNorm) || subIdNorm.includes(pNorm));
                                                }));
                                              } else {
                                                setTempSchwerpunkte(prev => [...prev, sub.id]);
                                              }
                                            }} 
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
                                              isSelected 
                                                ? 'bg-blue-600 text-white border-blue-700 shadow-sm scale-105' 
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                            }`}
                                          >
                                            <SubIcon size={13} className={isSelected ? 'text-white' : 'text-blue-500'} />
                                            <span>{sub.label}</span>
                                            {isSelected && <Check size={12} strokeWidth={3} className="ml-0.5 text-white" />}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              {/* EBENE 2: MATHEMATIK-UNTERBEREICHE */}
                              <AnimatePresence>
                                {(searchFach === 'Mathematik' || searchFach.startsWith('Mathematik') || isMatheSubSubject(searchFach)) && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="p-3.5 bg-rose-50/50 border border-rose-100 rounded-2xl space-y-2.5 overflow-hidden"
                                  >
                                    <div className="flex items-center gap-1.5 text-[0.6875rem] font-black uppercase text-rose-900 tracking-wider">
                                      <BookOpen size={13} className="text-rose-600" />
                                      <span>Mathematik-Unterbereiche / Schwerpunkte</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {MATHE_THEMENBEREICHE.map(sub => {
                                        const isSelected = tempSchwerpunkte.includes(sub.id);
                                        return (
                                          <button
                                            key={sub.id}
                                            type="button"
                                            onClick={() => {
                                              setTempSchwerpunkte(prev =>
                                                isSelected
                                                  ? prev.filter(value => value !== sub.id)
                                                  : [...prev, sub.id]
                                              );
                                            }}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
                                              isSelected
                                                ? 'bg-rose-600 text-white border-rose-700 shadow-sm scale-105'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                            }`}
                                          >
                                            <span>{sub.label}</span>
                                            {isSelected && <Check size={12} strokeWidth={3} className="ml-0.5 text-white" />}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                           </div>
                        </div>
                    </div>
                 </div>

                 {/* UNTERRICHTSEINHEIT IN ZWEI GLEICHE HÄLFTEN TEILEN – bewusst ohne Minutenlogik */}
                 <div className="rounded-3xl border border-cyan-100 bg-cyan-50/50 p-5 space-y-4 xl:col-span-2">
                   <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                     <div>
                       <h4 className="text-[0.875rem] font-black text-slate-800">Unterrichtseinheit halbieren</h4>
                       <p className="mt-0.5 text-[0.6875rem] font-medium text-slate-500">
                         Zwei gleich große Hälften – unabhängig von der tatsächlichen Minutenlänge der Schulstunde.
                       </p>
                     </div>
                     <button
                       type="button"
                       onClick={() => {
                         setTempSplitLesson(value => {
                           const next = !value;
                           if (next && !tempFirstHalf.fach && searchFach) {
                             setTempFirstHalf({
                               ...EMPTY_LESSON_HALF,
                               fach: searchFach,
                               unterbereich: tempSchwerpunkte[0] || '',
                               thema: tempThema,
                               farbe: getFachHexColor(app.fachConfig?.[searchFach]?.color || searchFach),
                             });
                           }
                           return next;
                         });
                       }}
                       className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-all ${
                         tempSplitLesson ? 'bg-cyan-600' : 'bg-slate-200'
                       }`}
                       aria-pressed={tempSplitLesson}
                     >
                       <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                         tempSplitLesson ? 'translate-x-6' : 'translate-x-1'
                       }`} />
                     </button>
                   </div>

                   {tempSplitLesson && (
                     <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                       {([
                         { key: 'first', label: 'Erste Hälfte', value: tempFirstHalf, setValue: setTempFirstHalf },
                         { key: 'second', label: 'Zweite Hälfte', value: tempSecondHalf, setValue: setTempSecondHalf },
                       ] as const).map(half => {
                         const subjectOptions = Array.from(new Set(['Deutsch', 'Mathematik', ...(app.faecher || FAECHER_ALLE)]));
                         const subareaOptions = getSubareaOptionsForSubject(half.value.fach);
                         return (
                           <div key={half.key} className="rounded-2xl border border-cyan-100 bg-white p-4 space-y-3">
                             <div className="text-[0.6875rem] font-black uppercase tracking-wider text-cyan-700">{half.label}</div>
                             <label className="block space-y-1">
                               <span className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-400">Fach</span>
                               <select
                                 value={half.value.fach}
                                 onChange={event => {
                                   const fach = event.target.value;
                                   half.setValue(current => ({
                                     ...current,
                                     fach,
                                     unterbereich: '',
                                     farbe: getFachHexColor(app.fachConfig?.[fach]?.color || fach),
                                   }));
                                 }}
                                 className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
                               >
                                 <option value="">Fach wählen</option>
                                 {subjectOptions.map(subject => <option key={subject} value={subject}>{subject}</option>)}
                               </select>
                             </label>
                             <label className="block space-y-1">
                               <span className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-400">Unterbereich</span>
                               <select
                                 value={half.value.unterbereich}
                                 onChange={event => half.setValue(current => ({ ...current, unterbereich: event.target.value }))}
                                 className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
                               >
                                 <option value="">Kein Unterbereich</option>
                                 {subareaOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                               </select>
                             </label>
                             <label className="block space-y-1">
                               <span className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-400">Thema / Inhalt</span>
                               <input
                                 type="text"
                                 value={half.value.thema}
                                 onChange={event => half.setValue(current => ({ ...current, thema: event.target.value }))}
                                 className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                                 placeholder="Inhalt dieser Hälfte"
                               />
                             </label>
                             <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                               <span className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-400">Farbe</span>
                               <input
                                 type="color"
                                 value={half.value.farbe || '#ffffff'}
                                 onChange={event => half.setValue(current => ({ ...current, farbe: event.target.value }))}
                                 className="h-8 w-12 cursor-pointer rounded border-0 bg-transparent"
                               />
                             </label>
                           </div>
                         );
                       })}
                     </div>
                   )}
                 </div>


                 {/* SCHNELLAUSWAHL AUS STAMMPLAN (Highlight if different) */}
                 {app.stammplan?.[editingCell.tag]?.[editingCell.idx + 1] && (
                   <motion.div 
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-8 group/suggestion"
                   >
                     <div className="flex items-center gap-6 flex-1">
                       <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-50">
                         <Lightbulb size={28} />
                       </div>
                       <div>
                         <div className="text-[0.625rem] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">Stammplan-Vorschlag</div>
                         <div className="text-[1.5rem] leading-normal font-black text-slate-900 tracking-tight">{app.stammplan[editingCell.tag][editingCell.idx + 1]}</div>
                       </div>
                     </div>
                     <button 
                        onClick={() => handleSetSearchFach(app.stammplan[editingCell.tag][editingCell.idx + 1])}
                        className={`btn ${searchFach === app.stammplan[editingCell.tag][editingCell.idx + 1] ? 'btn-accent' : 'bg-white'}`}
                     >
                        {searchFach === app.stammplan[editingCell.tag][editingCell.idx + 1] ? <Check size={16} /> : <Plus size={16} />}
                        <span>{searchFach === app.stammplan[editingCell.tag][editingCell.idx + 1] ? 'OK' : 'Übernehmen'}</span>
                     </button>
                   </motion.div>
                 )}

                   </div>
                 )}

                 {plannerEditorTab === 'rahmen' && (
                   <div className="space-y-6">
                 {/* SECTION 2: PRIORITÄT & SOZIALFORM */}
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-8">
                       <div className="space-y-4">
                          <div className="flex items-center gap-3 ml-1">
                             <div className="w-1.5 h-4 bg-rose-500 rounded-full" />
                             <label className="text-[0.6875rem] font-black text-slate-400 uppercase tracking-[0.2em]">Einheitstyp</label>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                             {[
                               { id: 'standard', label: 'Std.', icon: <BookOpen size={16} />, active: 'bg-slate-900 text-white', inactive: 'bg-slate-50 text-slate-400 border-slate-200' },
                               { id: 'sa', label: 'SA', icon: <Flag size={16} />, active: 'bg-rose-600 text-white', inactive: 'bg-rose-50 text-rose-400 border-rose-100' },
                               { id: 'test', label: 'Test', icon: <AlertTriangle size={16} />, active: 'bg-amber-500 text-white', inactive: 'bg-amber-50 text-amber-400 border-amber-100' },
                               { id: 'lzk', label: 'LZK', icon: <Star size={16} />, active: 'bg-emerald-500 text-white', inactive: 'bg-emerald-50 text-emerald-400 border-emerald-100' },
                               { id: 'event', label: 'Ausfl.', icon: <PartyPopper size={16} />, active: 'bg-purple-600 text-white', inactive: 'bg-purple-50 text-purple-400 border-purple-100' },
                               { id: 'spielefest', label: 'Spiel.', icon: <PartyPopper size={16} />, active: 'bg-fuchsia-600 text-white', inactive: 'bg-fuchsia-50 text-fuchsia-400 border-fuchsia-100' },
                               { id: 'konferenz', label: 'Konf.', icon: <Users size={16} />, active: 'bg-blue-600 text-white', inactive: 'bg-blue-50 text-blue-400 border-blue-100' },
                               { id: 'gespraech', label: 'Gespr.', icon: <MessageSquare size={16} />, active: 'bg-violet-600 text-white', inactive: 'bg-violet-50 text-violet-400 border-violet-100' },
                               { id: 'sonstiges', label: 'Termin', icon: <Calendar size={16} />, active: 'bg-rose-600 text-white', inactive: 'bg-rose-50 text-rose-400 border-rose-100' },
                               { id: 'digital', label: 'Digi.', icon: <Smartphone size={16} />, active: 'bg-blue-600 text-white', inactive: 'bg-blue-50 text-blue-400 border-blue-100' },
                             ].map(t => (
                               <button 
                                 key={t.id} 
                                 onClick={() => setTempType(t.id)}
                                 className={`p-4 rounded-[1.5rem] border transition-all flex flex-col items-center gap-2 ${tempType === t.id ? t.active + ' shadow-lg scale-105' : t.inactive + ' border-transparent hover:bg-slate-100'}`}
                               >
                                 {t.icon}
                                 <span className="text-[0.5625rem] font-black uppercase tracking-tighter">{t.label}</span>
                               </button>
                             ))}
                          </div>
                       </div>
                       
                       <div className="space-y-4">
                          <div className="flex items-center gap-3 ml-1">
                             <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
                             <label className="text-[0.6875rem] font-black text-slate-400 uppercase tracking-[0.2em]">Dauer</label>
                          </div>
                          <div className="flex flex-wrap gap-2">
                             {Array.from({ length: editingCell ? MAX_LESSON_SLOTS - editingCell.idx : MAX_LESSON_SLOTS }, (_, index) => index + 1).map(d => (
                               <button
                                 key={d}
                                 onClick={() => setTempDuration(d)}
                                 className={`flex-1 p-3 rounded-2xl border transition-all font-black text-sm ${tempDuration === d ? 'bg-amber-500 text-white border-amber-600 shadow-md scale-105' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-white hover:border-amber-300'}`}
                               >
                                 {d}
                               </button>
                             ))}
                             <button
                               onClick={() => setTempDuration('all')}
                               className={`px-4 py-3 rounded-2xl border transition-all font-black text-sm flex items-center justify-center gap-1.5 shrink-0 ${tempDuration === 'all' ? 'bg-amber-600 text-white border-amber-700 shadow-md scale-105' : 'bg-slate-50 text-amber-600/70 border-slate-200 hover:bg-amber-50/50 hover:border-amber-300'}`}
                             >
                               <Calendar size={14} />
                               <span>Restlicher Tag</span>
                             </button>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div className="flex items-center gap-3 ml-1">
                          <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                          <label className="text-[0.6875rem] font-black text-slate-400 uppercase tracking-[0.2em]">Sozialform</label>
                       </div>
                       <div className="grid grid-cols-1 gap-2">
                          {[
                            { id: 'single', label: 'Einzelarbeit', icon: <User size={16} /> },
                            { id: 'partner', label: 'Partnerarbeit', icon: <Users2 size={16} /> },
                            { id: 'group', label: 'Gruppenarbeit', icon: <Users size={16} /> },
                          ].map(s => (
                            <button 
                               key={s.id}
                               onClick={() => setTempSocial(s.id)}
                               className={`w-full px-6 py-4 rounded-3xl border flex items-center gap-4 transition-all ${tempSocial === s.id ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-slate-100/50 border-transparent text-slate-400 hover:bg-white hover:border-slate-200'}`}
                            >
                               {s.icon}
                               <span className="text-[0.75rem] font-black uppercase tracking-widest">{s.label}</span>
                               <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${tempSocial === s.id ? 'border-emerald-400 bg-emerald-400' : 'border-slate-300'}`}>
                                  {tempSocial === s.id && <Check size={12} className="text-white" strokeWidth={4} />}
                               </div>
                            </button>
                          ))}
                       </div>
                    </div>
                 </div>

                   </div>
                 )}

                 {plannerEditorTab === 'organisation' && (
                   <div className="space-y-6">
                 {/* SECTION 3: ORGA (MATERIALS & HOMEWORK) */}
                 <div className="bg-slate-50/50 rounded-2xl p-4 lg:p-5 border border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <div className="flex items-center gap-2 ml-1">
                              <BookOpen size={14} className="text-slate-400" />
                              <label className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">Materialien</label>
                           </div>
                           <textarea 
                              className="input-field h-28 py-4 px-6 resize-none bg-white"
                              placeholder="z.B. Schulbuch S. 44, Tablets..."
                              value={tempMaterial} onChange={e => setTempMaterial(e.target.value)}
                            />
                            <div className="rounded-2xl border border-indigo-100 bg-white p-3">
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <Paperclip size={13} className="text-indigo-500" />
                                  <span className="text-[0.625rem] font-black uppercase tracking-wider text-indigo-700">
                                    Aus Materialbibliothek
                                  </span>
                                  {tempMaterialIds.length > 0 && (
                                    <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[0.5625rem] font-black text-white">
                                      {tempMaterialIds.length}
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setPage('materialien')}
                                  className="text-[0.625rem] font-bold text-indigo-600 hover:underline"
                                >
                                  Bibliothek öffnen
                                </button>
                              </div>
                              {(app.materialien || []).length === 0 ? (
                                <p className="text-[0.6875rem] font-medium leading-relaxed text-slate-400">
                                  Noch keine Materialien vorhanden. Lege zuerst etwas in der Materialbibliothek ab.
                                </p>
                              ) : (
                                <div className="max-h-36 space-y-1.5 overflow-y-auto pr-1">
                                  {(app.materialien || [])
                                    .slice()
                                    .sort((a, b) => {
                                      const aFits = !searchFach || a.faecher?.includes(searchFach) ? 1 : 0;
                                      const bFits = !searchFach || b.faecher?.includes(searchFach) ? 1 : 0;
                                      return bFits - aFits || a.titel.localeCompare(b.titel, 'de');
                                    })
                                    .map(materialItem => {
                                      const selected = tempMaterialIds.includes(materialItem.id);
                                      const canOpen = Boolean(materialItem.externerLink || materialItem.dateiInhalt);
                                      return (
                                        <div
                                          key={materialItem.id}
                                          className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 transition-colors ${selected ? 'border-indigo-300 bg-indigo-50' : 'border-slate-100 bg-slate-50/70'}`}
                                        >
                                          <button
                                            type="button"
                                            onClick={() => setTempMaterialIds(prev => selected ? prev.filter(id => id !== materialItem.id) : [...prev, materialItem.id])}
                                            aria-pressed={selected}
                                            className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                          >
                                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${selected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-transparent'}`}>
                                              <Check size={11} strokeWidth={4} />
                                            </span>
                                            <span className="min-w-0">
                                              <span className="block truncate text-[0.6875rem] font-black text-slate-700">{materialItem.titel}</span>
                                              <span className="block truncate text-[0.5625rem] font-bold uppercase tracking-wide text-slate-400">
                                                {materialItem.faecher?.join(', ') || 'Ohne Fach'} · {materialItem.typ}
                                              </span>
                                            </span>
                                          </button>
                                          {canOpen && (
                                            <button
                                              type="button"
                                              aria-label={`${materialItem.titel} öffnen`}
                                              title={`${materialItem.titel} öffnen`}
                                              onClick={() => {
                                                const target = materialItem.externerLink || materialItem.dateiInhalt;
                                                if (target) window.open(target, '_blank', 'noopener,noreferrer');
                                              }}
                                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-indigo-600"
                                            >
                                              <ExternalLink size={13} />
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                              )}
                            </div>
                         </div>
                        <div className="space-y-3">
                           <div className="flex items-center gap-2 ml-1">
                              <Check size={14} className="text-emerald-500" />
                              <label className="text-[0.625rem] font-black text-emerald-600 uppercase tracking-widest">Hausübung</label>
                           </div>
                           <textarea 
                              className="input-field h-28 py-4 px-6 resize-none bg-white"
                              placeholder="Hausaufgabe notieren..."
                              value={tempHUE} onChange={e => setTempHUE(e.target.value)}
                           />
                        </div>
                    </div>
                 </div>

                   </div>
                 )}

                 {plannerEditorTab === 'optionen' && (
                   <div className="space-y-6">
                 {/* SECTION 4: FEINSCHLIFF */}
                 <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
                    <div className="space-y-3">
                       <div className="flex items-center gap-3 ml-1">
                          <MessageSquare size={16} className="text-slate-400" />
                          <label className="text-[0.625rem] font-black text-slate-400 uppercase tracking-[0.2em]">Methodik & Tipps</label>
                       </div>
                       <input 
                         type="text"
                         className="input-field py-5 px-8"
                         placeholder="Besonderheiten, Methoden..."
                         value={tempMethod} onChange={e => setTempMethod(e.target.value)}
                       />
                    </div>

                    <div className="space-y-3">
                       <div className="flex items-center gap-3 ml-1">
                          <Star size={16} className="text-amber-400" />
                          <label className="text-[0.625rem] font-black text-slate-400 uppercase tracking-[0.2em]">📝 Reflexion (nach der Stunde)</label>
                       </div>
                       <textarea 
                          className="input-field h-28 py-5 px-8 resize-none italic bg-amber-50/10 placeholder:text-amber-200"
                          placeholder="Wie war die Stunde? Reflexion..."
                          value={tempReflexion} onChange={e => setTempReflexion(e.target.value)}
                       />
                    </div>

                    {/* WÖCHENTLICHE WIEDERHOLUNG (RECURRING LESSONS) */}
                    <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:bg-indigo-50">
                       <div className="flex items-center gap-4 text-left">
                          <div className={`w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100 ${repeatWeekly ? 'animate-pulse' : ''}`}>
                             <RefreshCw size={22} className={repeatWeekly ? 'animate-spin-slow text-indigo-500' : 'text-indigo-400'} style={{ animationDuration: '6s' }} />
                          </div>
                          <div>
                             <h4 className="text-[0.875rem] leading-snug font-black text-slate-800 tracking-tight">Wöchentlich wiederholen lassen</h4>
                             <p className="text-[0.6875rem] text-slate-500 font-medium leading-relaxed max-w-sm mt-0.5">
                                Diese Stunde automatisch am <strong>{editingCell.tag}</strong> in der <strong>{editingCell.idx + 1}. Stunde</strong> für den Rest des Schuljahres eintragen.
                             </p>
                          </div>
                       </div>
                       <button
                          type="button"
                          onClick={() => setRepeatWeekly(!repeatWeekly)}
                          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-all focus:outline-none cursor-pointer ${
                             repeatWeekly ? 'bg-indigo-600 shadow-inner' : 'bg-slate-200'
                          }`}
                       >
                          <span
                             className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                                repeatWeekly ? 'translate-x-6' : 'translate-x-1'
                             }`}
                          />
                       </button>
                    </div>

                    {/* WOCHENPLAN SYNC */}
                    <div className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:bg-emerald-50">
                       <div className="flex items-center gap-4 text-left">
                          <div className={`w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100 ${syncWpSubjects ? 'animate-pulse' : ''}`}>
                             <Zap size={22} className={syncWpSubjects ? 'text-emerald-500' : 'text-emerald-400'} />
                          </div>
                          <div>
                             <h4 className="text-[0.875rem] leading-snug font-black text-slate-800 tracking-tight">Auf alle Wochenplan-Stunden anwenden</h4>
                             <p className="text-[0.6875rem] text-slate-500 font-medium leading-relaxed max-w-sm mt-0.5">
                                Kopiert diese Einheit in alle anderen Stunden der aktuellen Woche, deren Fächer im <strong>Sync-Set</strong> definiert sind (z.B. für fächerübergreifende Pläne).
                             </p>
                          </div>
                       </div>
                       <button
                          type="button"
                          onClick={() => setSyncWpSubjects(!syncWpSubjects)}
                          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-all focus:outline-none cursor-pointer ${
                             syncWpSubjects ? 'bg-emerald-600 shadow-inner' : 'bg-slate-200'
                          }`}
                       >
                          <span
                             className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                                syncWpSubjects ? 'translate-x-6' : 'translate-x-1'
                             }`}
                          />
                       </button>
                    </div>
                 </div>
                   </div>
                 )}
              </div>

              <div className="p-3 sm:p-4 lg:px-6 bg-slate-50/80 border-t border-slate-100 flex flex-col gap-2 sm:flex-row sm:items-center shrink-0">
                 <button onClick={() => saveCell('', '')} className="btn text-rose-600 hover:!bg-rose-600 hover:!text-white hover:!border-rose-600 border border-slate-200 bg-white px-6 transition-all">Löschen</button>
                 <div className="hidden flex-1 px-2 text-[0.625rem] font-semibold text-slate-400 lg:block">
                   Änderungen werden erst mit „Einheit speichern“ übernommen.
                 </div>
                 <button onClick={() => saveCell(searchFach, tempThema, tempType, tempMaterial, tempHUE, tempMethod, tempSocial, tempReflexion, tempSchwerpunkte, tempDuration, tempMaterialIds)} className="btn btn-accent sm:min-w-[260px]">Einheit speichern</button>
              </div>
           </motion.div>
        </div>,
        document.body
      )}

      {/* WEEK PICKER MODAL */}
      {showWeekPicker && createPortal(
         <div className="fixed inset-0 z-[10100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowWeekPicker(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-7xl bg-white rounded-[3.5rem] shadow-3xl  flex flex-col">
               <div className="p-10 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h3 className="text-4xl font-black text-slate-900 tracking-tight">Woche wählen</h3>
                    <p className="text-[0.6875rem] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Schuljahr {app.schuljahr}</p>
                  </div>
                  <button onClick={() => setShowWeekPicker(false)} className="p-4 hover:bg-slate-100 rounded-full transition-all text-slate-300"><X size={32} /></button>
               </div>
               <div className="p-10 max-h-[60vh] overflow-y-auto no-scrollbar bg-slate-50/20">
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                     {generateWeeksList().map((w, idx) => (
                       <button 
                         key={idx} 
                         onClick={() => { setApp(p => ({ ...p, currentKW: w.kw })); setShowWeekPicker(false); }}
                         className={`p-6 rounded-2xl border flex flex-col items-center gap-2 transition-all ${w.kw === activeKW ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-105' : 'bg-white border-slate-200 hover:border-emerald-500'}`}
                       >
                         <span className="text-[1.5rem] leading-normal font-black tracking-tighter">KW {w.kw}</span>
                         <span className="text-[0.625rem] font-black uppercase tracking-widest opacity-30">{w.sw_val ? `SW ${w.sw_val}` : '—'}</span>
                       </button>
                     ))}
                  </div>
               </div>
            </motion.div>
         </div>,
         document.body
      )}

      {/* DRAFTS SELECTOR MODAL */}
      {showDraftsSelector && createPortal(
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => setShowDraftsSelector(false)} />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative w-full max-w-4xl bg-white rounded-[40px] shadow-3xl  flex flex-col max-h-[85vh]"
          >
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-[1.5rem] leading-normal font-black text-slate-900 tracking-tighter">Stundenentwürfe</h3>
                <p className="text-[0.6875rem] font-bold text-slate-400 uppercase tracking-widest mt-1">Wähle einen Entwurf zum Übernehmen</p>
              </div>
              <button onClick={() => setShowDraftsSelector(false)} className="p-3 hover:bg-slate-100 rounded-full transition-all"><X size={24} /></button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar bg-slate-50/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(app.stundenentwuerfe || []).map(draft => (
                  <button
                    key={draft.id}
                    onClick={() => {
                      setSearchFach(draft.fach);
                      setTempThema(draft.thema);
                      setTempMaterial(draft.material);
                      setTempMethod(`Lernziele:\n${draft.lernziele}\n\nEinstieg:\n${draft.einleitung}\n\nHauptteil:\n${draft.hauptteil}\n\nSchluss:\n${draft.schluss}`);
                      setShowDraftsSelector(false);
                    }}
                    className="p-6 bg-white border border-slate-200 rounded-3xl text-left hover:border-emerald-500 hover:shadow-xl hover:-translate-y-1 transition-all group"
                  >
                    <div className="text-[0.5625rem] font-black text-emerald-600 uppercase tracking-widest mb-1">{draft.fach}</div>
                    <div className="text-[1.125rem] leading-normal font-black text-slate-900 mb-2 group-hover:text-emerald-700 transition-colors">{draft.thema}</div>
                    <div className="text-[0.6875rem] text-slate-400 line-clamp-2 italic">
                      {draft.lernziele || 'Keine Lernziele hinterlegt'}
                    </div>
                  </button>
                ))}
                {(app.stundenentwuerfe || []).length === 0 && (
                  <div className="col-span-full py-20 text-center">
                    <BookOpen size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest">Noch keine Entwürfe vorhanden</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* LEHRPLAN MODAL (Step 1-3) */}
      {showLehrplanModal && createPortal(
        <div className="fixed inset-0 z-[12000] flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setShowLehrplanModal(null)} />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-3xl  flex flex-col max-h-[85vh]"
          >
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-[1.5rem] leading-normal font-black text-slate-900 tracking-tighter">Lehrplan zuordnen</h3>
                <p className="text-[0.6875rem] font-bold text-slate-400 uppercase tracking-widest mt-1">Schritt {lehrplanStep} von 3</p>
              </div>
              <button onClick={() => setShowLehrplanModal(null)} className="p-3 hover:bg-slate-100 rounded-full transition-all"><X size={24} /></button>
            </div>
            
            <div className="p-10 overflow-y-auto no-scrollbar bg-white">
              {lehrplanStep === 1 && (
                <div className="space-y-6">
                  <h4 className="text-[1.125rem] leading-normal font-black text-slate-800">1. Fach auswählen</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.keys(LEHRPLAN_VS_2023).map(fach => (
                      <button
                        key={fach}
                        onClick={() => { setLpFach(fach); setLehrplanStep(2); }}
                        className={`p-5 rounded-3xl border-2 text-left transition-all ${lpFach === fach ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-100 hover:border-slate-300'}`}
                      >
                        <div className="text-[0.625rem] font-black uppercase tracking-widest opacity-40 mb-1">Pflichtgegenstand</div>
                        <div className="font-black text-[1.125rem] leading-normal">{fach}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {lehrplanStep === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[1.125rem] leading-normal font-black text-slate-800">2. Kompetenzbereich</h4>
                    <button onClick={() => setLehrplanStep(1)} className="text-[0.625rem] font-black uppercase text-emerald-600 hover:underline">Fach ändern</button>
                  </div>
                  <div className="space-y-3">
                    {(LEHRPLAN_VS_2023[lpFach]?.[app.stufe || 1] || []).length > 0 ? (
                      LEHRPLAN_VS_2023[lpFach][app.stufe || 1].map(kb => (
                        <button
                          key={kb.id}
                          onClick={() => { setLpKB(kb.id); setLehrplanStep(3); }}
                          className={`w-full p-6 bg-white border-2 rounded-3xl text-left transition-all ${lpKB === kb.id ? 'border-emerald-500 bg-emerald-50 shadow-lg' : 'border-slate-100 hover:border-emerald-200'}`}
                        >
                          <div className="font-black text-slate-900">{kb.titel}</div>
                        </button>
                      ))
                    ) : (
                      <div className="p-10 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400 font-bold italic">
                        Für {lpFach} (Stufe {app.stufe || 1}) sind derzeit keine Lehrplandaten hinterlegt.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {lehrplanStep === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[1.125rem] leading-normal font-black text-slate-800">3. Anwendungsbereiche</h4>
                    <button onClick={() => setLehrplanStep(2)} className="text-[0.625rem] font-black uppercase text-emerald-600 hover:underline">KB ändern</button>
                  </div>
                  <div className="space-y-2">
                    {LEHRPLAN_VS_2023[lpFach][app.stufe || 1].find(kb => kb.id === lpKB)?.anwendungsbereiche.map(ab => (
                      <button
                        key={ab.id}
                        onClick={() => {
                          setLpAB(prev => prev.includes(ab.id) ? prev.filter(id => id !== ab.id) : [...prev, ab.id]);
                        }}
                        className={`w-full p-5 rounded-2xl border-2 flex items-center justify-between transition-all ${lpAB.includes(ab.id) ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-50 text-slate-500 hover:border-slate-200'}`}
                      >
                        <span className="font-bold text-[0.8125rem]">{ab.titel}</span>
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${lpAB.includes(ab.id) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200'}`}>
                          {lpAB.includes(ab.id) && <Check size={14} strokeWidth={3} />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button 
                onClick={() => {
                  const key = `${activeKW}-${showLehrplanModal.tag}-${showLehrplanModal.idx}`;
                  setApp(prev => {
                    const newLehrplan = { ...(prev.wochenplan_lehrplan || {}) };
                    delete newLehrplan[key];
                    return { ...prev, wochenplan_lehrplan: newLehrplan };
                  });
                  setShowLehrplanModal(null);
                }}
                className="btn !bg-white !text-slate-400 hover:!text-red-500 px-8"
              >
                Löschen
              </button>
              <button 
                onClick={() => {
                  if (lpAB.length === 0) {
                    const key = `${activeKW}-${showLehrplanModal.tag}-${showLehrplanModal.idx}`;
                    setApp(prev => {
                      const newLehrplan = { ...(prev.wochenplan_lehrplan || {}) };
                      delete newLehrplan[key];
                      return { ...prev, wochenplan_lehrplan: newLehrplan };
                    });
                    setShowLehrplanModal(null);
                    return;
                  }
                  const key = `${activeKW}-${showLehrplanModal.tag}-${showLehrplanModal.idx}`;
                  const zuordnung: LehrplanZuordnung = {
                    fach: lpFach,
                    kompetenzbereichId: lpKB,
                    anwendungsbereichIds: lpAB
                  };
                  setApp(prev => ({
                    ...prev,
                    wochenplan_lehrplan: {
                      ...(prev.wochenplan_lehrplan || {}),
                      [key]: [zuordnung]
                    }
                  }));
                  setShowLehrplanModal(null);
                }}
                className={`btn btn-accent flex-1 ${lehrplanStep === 0 ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {lpAB.length === 0 ? 'Ohne Zuordnung schließen' : 'Zuordnung speichern'}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* 4. DENKZETTEL ASSISTENT DRAWER */}
      {showDenkzettelDraw && createPortal(
        <div className="fixed inset-0 z-[11000] flex justify-end">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs cursor-pointer" 
            onClick={() => setShowDenkzettelDraw(false)} 
          />
          
          {/* Drawer Panel */}
          <motion.div 
            initial={{ x: '100%', opacity: 0.95 }} 
            animate={{ x: 0, opacity: 1 }} 
            exit={{ x: '100%', opacity: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="relative w-full max-w-sm sm:max-w-md bg-white h-full shadow-3xl border-l border-slate-150 flex flex-col z-[11100] font-sans"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100/60 border border-amber-200/50 flex items-center justify-center text-base">
                  💡
                </div>
                <div>
                  <h3 className="text-[1rem] leading-tight font-black text-slate-800 uppercase tracking-wide">Denkzettel-Assistent</h3>
                  <p className="text-[0.625rem] font-bold text-slate-400">TERMINE SCHNELL IN DEN WOCHENPLAN INTEGRATION</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDenkzettelDraw(false)} 
                className="p-2 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
              >
                <X size={16} className="text-slate-500" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
              {/* SECTION 1: This Week's Notes */}
              <div>
                <div className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                  <span>Diese Kalenderwoche (KW {activeKW})</span>
                  <span className="px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 text-[8px] font-bold">
                    {pendingNotesThisWeek.length} geplant
                  </span>
                </div>
                
                {pendingNotesThisWeek.length > 0 ? (
                  <div className="space-y-2">
                    {pendingNotesThisWeek.map((note: any) => (
                      <div key={note.id} className="p-3 bg-indigo-50 border border-indigo-100/80 rounded-xl flex flex-col gap-2 shadow-sm transition-all hover:bg-indigo-50">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-[0.75rem] font-bold text-indigo-950 leading-tight break-words">{note.text}</div>
                          {note.student && (
                            <span className="px-1.5 py-0.5 rounded bg-white text-indigo-700 text-[8px] font-extrabold border border-indigo-100 shrink-0">
                              {note.student.vorname}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSmartAutoAssign(note)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Sparkles size={10} /> Auto-Einfügen
                          </button>
                          <button
                            onClick={() => setAssigningNote(note)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                          >
                            In Slot...
                          </button>
                          <button
                            onClick={() => {
                              setApp(p => ({
                                ...p,
                                denkzettelNotes: (p.denkzettelNotes || []).map((n: any) => 
                                  n.id === note.id ? { ...n, completed: true } : n
                                )
                              }));
                            }}
                            className="ml-auto p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-all cursor-pointer"
                            title="Erledigt"
                          >
                            <Check size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[0.625rem] text-slate-400 italic">Keine Termine für diese Woche erkannt.</p>
                )}
              </div>

              {/* SECTION 2: General / All Suggestion Notes */}
              <div className="pt-4 border-t border-slate-100">
                <div className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400 mb-2">
                  Alle unvollständigen Denkzettel-Notizen
                </div>
                
                {allUnscheduledNotes.filter((n: any) => !pendingNotesThisWeek.find((tw: any) => tw.id === n.id)).length > 0 ? (
                  <div className="space-y-2">
                    {allUnscheduledNotes.filter((n: any) => !pendingNotesThisWeek.find((tw: any) => tw.id === n.id)).map((note: any) => {
                      const hasDate = inferDateFromText(note.text, app.schuljahr || '');
                      return (
                        <div key={note.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex flex-col gap-2 transition-all hover:bg-slate-100/50">
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-[0.75rem] font-bold text-slate-700 leading-tight break-words">{note.text}</div>
                            {hasDate && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[8px] font-black border border-amber-100 shrink-0">
                                {hasDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSmartAutoAssign(note)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Sparkles size={10} /> In {hasDate ? 'korrekten' : 'nächsten'} Slot
                            </button>
                            <button
                              onClick={() => setAssigningNote(note)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                            >
                              Konfigurieren...
                            </button>
                            <button
                              onClick={() => {
                                setApp(p => ({
                                  ...p,
                                  denkzettelNotes: (p.denkzettelNotes || []).map((n: any) => 
                                    n.id === note.id ? { ...n, completed: true } : n
                                  )
                                }));
                              }}
                              className="ml-auto p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-all cursor-pointer"
                            >
                              <Check size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[0.625rem] text-slate-400 italic">Der Denkzettel ist leer oder alle Aufgaben wurden bereits verplant! 🎉</p>
                )}
              </div>
            </div>
            
            {/* Manual Slot Assignment Sub-Menu / Dialog */}
            {assigningNote && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-[200]">
                <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-2xl w-full max-w-sm flex flex-col gap-3">
                  <h4 className="text-[0.875rem] font-black uppercase tracking-wider text-slate-800">Manuell verplanen</h4>
                  <p className="text-[0.75rem] text-slate-500 leading-snug font-bold">Wähle Tag und Stunde für:<br/>
                    <span className="text-slate-800 italic">"{assigningNote.text}"</span>
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="flex flex-col gap-1 text-[0.625rem]">
                      <span className="font-extrabold text-slate-400 uppercase">Wochentag</span>
                      <select 
                        id="target-day-select"
                        className="p-2 border border-slate-200 rounded-lg bg-slate-50 font-bold"
                        defaultValue="Montag"
                      >
                        {TAGE_NAMEN.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    
                    <div className="flex flex-col gap-1 text-[0.625rem]">
                      <span className="font-extrabold text-slate-400 uppercase">Stunde</span>
                      <select 
                        id="target-hour-select"
                        className="p-2 border border-slate-200 rounded-lg bg-slate-50 font-bold"
                        defaultValue="0"
                      >
                        {[0,1,2,3,4,5].map(idx => (
                          <option key={idx} value={idx}>{idx + 1}. Stunde</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      onClick={() => setAssigningNote(null)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[0.6875rem] font-bold cursor-pointer"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={() => {
                        const daySelect = document.getElementById('target-day-select') as HTMLSelectElement;
                        const hourSelect = document.getElementById('target-hour-select') as HTMLSelectElement;
                        if (daySelect && hourSelect) {
                          handleAssignNoteToWochenplan(assigningNote, daySelect.value, parseInt(hourSelect.value));
                        }
                        setAssigningNote(null);
                      }}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[0.6875rem] font-black uppercase tracking-wider cursor-pointer"
                    >
                      Eintragen
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>,
        document.body
      )}

      {/* SYNC SETTINGS MODAL */}
      {showSyncSettingsModal && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowSyncSettingsModal(false)} />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col mx-auto overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
               <div>
                  <h3 className="text-[1.25rem] font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Zap className="text-indigo-500" size={20} />
                    Synchronisations-Set
                  </h3>
                  <p className="text-[0.75rem] text-slate-500 font-medium leading-relaxed mt-1">
                    Fächer auswählen, die als Gruppe zusammenhängen sollen. Aufgaben & Notizen, die mit aktivierter Sync-Option erstellt werden, werden auf alle hier ausgewählten Fächer in der jeweiligen Woche kopiert.
                  </p>
               </div>
               <button onClick={() => setShowSyncSettingsModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-400"><X size={20} /></button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
               <div className="space-y-2">
                 {(app.faecher && app.faecher.length > 0 ? app.faecher : FAECHER_ALLE).map(f => {
                   const isSelected = (app.wochenplanSyncSet || []).includes(f);
                   return (
                     <label key={f} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 bg-white'}`}>
                           {isSelected && <Check size={14} strokeWidth={3} />}
                        </div>
                        <span className={`text-[0.875rem] font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{f}</span>
                        <input 
                           type="checkbox" 
                           className="hidden" 
                           checked={isSelected}
                           onChange={(e) => {
                             setApp(prev => {
                               const current = prev.wochenplanSyncSet || [];
                               return {
                                 ...prev,
                                 wochenplanSyncSet: e.target.checked ? [...current, f] : current.filter(x => x !== f)
                               };
                             });
                           }}
                        />
                     </label>
                   );
                 })}
                 {(!app.faecher || app.faecher.length === 0) && (
                    <p className="text-[0.875rem] text-slate-500 italic p-4 text-center">Keine Fächer angelegt.</p>
                 )}
               </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-white flex justify-end">
               <button onClick={() => setShowSyncSettingsModal(false)} className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-[0.75rem] uppercase tracking-wider rounded-xl transition-all cursor-pointer">
                 Schließen
               </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* 4.5 JAHRESPLAN SUGGESTIONS DRAWER */}
      {showSuggestionsDraw && createPortal(
        <div className="fixed inset-0 z-[11000] flex justify-end">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs cursor-pointer" 
            onClick={() => setShowSuggestionsDraw(false)} 
          />
          
          {/* Drawer Panel */}
          <motion.div 
            initial={{ x: '100%', opacity: 0.95 }} 
            animate={{ x: 0, opacity: 1 }} 
            exit={{ x: '100%', opacity: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="relative w-full max-w-sm sm:max-w-md bg-white h-full shadow-3xl border-l border-slate-150 flex flex-col z-[11100] font-sans"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-[0.875rem] leading-none text-left">Planungsvorschläge (Jahresplan)</h3>
                  <p className="text-[0.6875rem] text-slate-400 mt-1 text-left">Aus deiner Jahresplanung für KW {activeKW}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSuggestionsDraw(false)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {yearlyPlanItems.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-center text-slate-400">
                  <div className="text-4xl mb-2">🌿</div>
                  <p className="text-[0.75rem] font-bold">Keine Themen in dieser Woche geplant</p>
                  <p className="text-[0.6875rem] max-w-xs mt-1">Trage Themen in der Jahresplanung für KW {activeKW} ein, damit sie hier als Vorschlag erscheinen.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[0.6875rem] text-slate-400 uppercase tracking-wider font-bold text-left font-sans">Themen der aktuellen Woche (KW {activeKW})</p>
                  
                  {yearlyPlanItems.map((item, idx) => {
                    const scheduled = isYearlyItemScheduled(item);
                    const subject = yearlySubjects.find(s => s.id === item.subjectId);
                    
                    return (
                      <div 
                        key={idx}
                        draggable
                        onDragStart={(e) => {
                          const content = `${item.thema}${item.buch ? ` (${item.buch})` : ''}`;
                          e.dataTransfer.setData('text/plain', content);
                          e.dataTransfer.setData('yearlyItem', JSON.stringify(item));
                        }}
                        className={`p-4 rounded-2xl border transition-all flex flex-col gap-3 group relative cursor-grab active:cursor-grabbing text-left ${
                          item.completed 
                            ? "bg-emerald-50/40 border-emerald-200/80 text-slate-500 shadow-sm" 
                            : scheduled 
                              ? "bg-amber-50/20 border-amber-200/50 text-slate-700" 
                              : "bg-white border-slate-150 hover:border-slate-300 hover:shadow-md text-slate-800"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            {/* Checkbox to mark as done */}
                            <input 
                              type="checkbox"
                              className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                              checked={item.completed}
                              onChange={() => toggleYearlyItemCompletion(item.subjectId, item.itemIndex)}
                            />
                            
                            <span className="text-[0.625rem] font-black uppercase px-2 py-0.5 rounded-full border" style={{
                              borderColor: subject?.color || '#cbd5e1',
                              color: subject?.color || '#475569',
                              backgroundColor: `${subject?.color}10` || '#f1f5f9'
                            }}>
                              {subject?.label || 'Fach'}
                            </span>
                          </div>
                          
                          {scheduled ? (
                            <span className="text-[0.625rem] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg font-sans">Geplant</span>
                          ) : (
                            <div className="flex items-center gap-1 text-slate-300 group-hover:text-slate-400 transition-colors font-sans">
                              <span className="text-[0.5625rem] font-semibold">Zieh mich</span>
                              <GripVertical size={14} />
                            </div>
                          )}
                        </div>

                        <div>
                          <p className={`text-[0.8125rem] font-bold leading-tight ${item.completed ? 'line-through text-slate-400 font-medium' : ''}`}>
                            {item.thema}
                          </p>
                          {item.buch && (
                            <p className="text-[0.6875rem] text-slate-400 mt-1 italic flex items-center gap-1">
                              <span>📖 {item.buch}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer info */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 text-[0.6875rem] text-slate-500 leading-normal space-y-1.5 select-none text-left font-sans">
              <p className="font-bold flex items-center gap-1.5 text-emerald-700">
                <span>💡 Tipps zur Verknüpfung:</span>
              </p>
              <p>1. Ziehe ein Thema per Drag & Drop in einen beliebigen Stunden-Slot des Wochenplans.</p>
              <p>2. Setze ein Häkchen bei erledigten Themen. Diese werden dann automatisch auch in deiner Jahresplanung als abgeschlossen markiert.</p>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* 5. WOCHENEND CHECK-IN MODAL */}
      {showCheckInModal && createPortal(
        <div className="fixed inset-0 z-[12000] flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setShowCheckInModal(false)} />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 30 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] mx-auto overflow-hidden font-sans"
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-amber-500/5">
              <div className="flex items-center gap-3">
                <span className="text-2xl">☕</span>
                <div className="text-left">
                  <h3 className="font-bold text-slate-800 text-[1.125rem]">Wochenend-Check-In</h3>
                  <p className="text-[0.6875rem] text-slate-400 mt-0.5">Lass den Kopf frei für ein entspanntes Wochenende</p>
                </div>
              </div>
              <button onClick={() => setShowCheckInModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Stepper Indicator */}
            <div className="px-8 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">
              <span>Schritt {checkInStep} von 4</span>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map(step => (
                  <div key={step} className={`w-6 h-1 rounded-full transition-all duration-300 ${checkInStep >= step ? 'bg-amber-500' : 'bg-slate-200'}`} />
                ))}
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 text-left">
              {checkInStep === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
                  <div className="space-y-1">
                    <span className="text-3xl">🌟</span>
                    <h4 className="text-[1rem] font-black text-slate-800 mt-2">Was war das Highlight deiner Schulwoche?</h4>
                    <p className="text-[0.75rem] text-slate-400">Halte einen schönen Moment fest – ob ein lächelndes Kind, ein gelungener Versuch oder ein tolles Teamgespräch.</p>
                  </div>
                  <textarea
                    autoFocus
                    className="w-full h-32 bg-stone-50 border border-slate-200 rounded-2xl px-5 py-4 text-[0.875rem] outline-none focus:ring-2 focus:ring-amber-500/20 focus:bg-white transition-all resize-none font-medium text-slate-800"
                    placeholder="Schreibe dein wöchentliches Highlight hier auf..."
                    value={checkInHighlight}
                    onChange={e => setCheckInHighlight(e.target.value)}
                  />
                </div>
              )}

              {checkInStep === 2 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
                  <div className="space-y-1">
                    <span className="text-3xl">🌸</span>
                    <h4 className="text-[1rem] font-black text-slate-800 mt-2">Gibt es ein Kind, dem du nächste Woche besondere Aufmerksamkeit schenken möchtest?</h4>
                    <p className="text-[0.75rem] text-slate-400">Vielleicht ein Kind, das ruhig war, Hilfe braucht oder einen großen Fortschritt gemacht hat.</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest ml-1">Schüler auswählen</label>
                      <select
                        className="w-full bg-stone-50 border border-slate-200 rounded-2xl px-4 py-3 text-[0.875rem] outline-none focus:ring-2 focus:ring-amber-500/20 focus:bg-white transition-all cursor-pointer font-bold text-slate-800"
                        value={checkInFocusStudent}
                        onChange={e => setCheckInFocusStudent(e.target.value)}
                      >
                        <option value="">-- Kein bestimmtes Kind --</option>
                        {(app.schueler || []).map((s: any) => (
                          <option key={s.id} value={`${s.vorname} ${s.nachname}`}>
                            {s.vorname} {s.nachname}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest ml-1">Worauf achten / Notiz</label>
                      <input
                        type="text"
                        className="w-full bg-stone-50 border border-slate-200 rounded-2xl px-4 py-3 text-[0.875rem] outline-none focus:ring-2 focus:ring-amber-500/20 focus:bg-white transition-all font-medium text-slate-800"
                        placeholder="z.B. Braucht Lob bei Mathematik, vermehrt ins Boot holen..."
                        value={checkInFocusNote}
                        onChange={e => setCheckInFocusNote(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {checkInStep === 3 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
                  <div className="space-y-1">
                    <span className="text-3xl">📝</span>
                    <h4 className="text-[1rem] font-black text-slate-800 mt-2">Welche offenen Aufgaben nehmen wir mit?</h4>
                    <p className="text-[0.75rem] text-slate-400">Hier sind unerledigte Punkte, die wir sammeln und sichern, damit du am Wochenende abschalten kannst.</p>
                  </div>

                  <div className="space-y-4 bg-slate-50 border border-slate-100 rounded-2xl p-5 max-h-[220px] overflow-y-auto no-scrollbar">
                    {incompleteWeeklySlots.length === 0 && incompleteDenkzettelNotes.length === 0 ? (
                      <p className="text-center py-4 text-emerald-600 text-[0.75rem] font-bold">🎉 Super! Keine offenen Aufgaben oder unvollständigen Einheiten gefunden!</p>
                    ) : (
                      <div className="space-y-3 text-[0.75rem]">
                        {incompleteWeeklySlots.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="font-bold text-slate-500 uppercase text-[0.5625rem] tracking-wider">Ausgefallene / Unerledigte Einheiten</p>
                            {incompleteWeeklySlots.map((slot, i) => (
                              <div key={i} className="flex items-center gap-2 text-slate-700 bg-white border border-slate-150 rounded-xl px-3 py-2">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                                <span className="font-semibold text-indigo-600 uppercase text-[9px] shrink-0">{slot.tag} • {slot.idx}. Std</span>
                                <span className="text-slate-500 shrink-0">({slot.fach}):</span>
                                <span className="truncate font-medium">{slot.thema}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {incompleteDenkzettelNotes.length > 0 && (
                          <div className="space-y-1.5 pt-1.5">
                            <p className="font-bold text-slate-500 uppercase text-[0.5625rem] tracking-wider font-bold">Offene Denkzettel Notizen</p>
                            {incompleteDenkzettelNotes.map((note, i) => (
                              <div key={i} className="flex items-center gap-2 text-slate-700 bg-white border border-slate-150 rounded-xl px-3 py-2">
                                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                                <span className="truncate font-medium text-slate-800">{note.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest ml-1">Zusätzliche Wochenend-To-Dos</label>
                    <input
                      type="text"
                      className="w-full bg-stone-50 border border-slate-200 rounded-2xl px-4 py-3 text-[0.875rem] outline-none focus:ring-2 focus:ring-amber-500/20 focus:bg-white transition-all font-medium text-slate-800"
                      placeholder="z.B. Schularbeit kopieren, etc."
                      value={checkInExtraTodos}
                      onChange={e => setCheckInExtraTodos(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {checkInStep === 4 && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-400 text-center py-4">
                  <div className="space-y-2">
                    <span className="text-5xl block">🌿</span>
                    <h4 className="text-[1.25rem] font-black text-emerald-800 mt-3">Kopf frei & Schönes Wochenende!</h4>
                    <p className="text-[0.75rem] text-slate-500 max-w-sm mx-auto leading-relaxed">Gute Arbeit! Deine Aufgaben sind sicher in der Planungszentrale abgelegt. Du kannst jetzt beruhigt abschalten.</p>
                  </div>

                  <div className="bg-gradient-to-br from-amber-500/5 to-emerald-500/5 border border-slate-150 rounded-3xl p-6 text-left space-y-4 max-w-md mx-auto">
                    <p className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">Deine Kopf-Frei-Liste</p>
                    
                    <div className="space-y-2 text-[0.75rem]">
                      {checkInHighlight && (
                        <div>
                          <p className="font-bold text-slate-500">🌟 Wochen-Highlight:</p>
                          <p className="text-slate-700 italic">"{checkInHighlight}"</p>
                        </div>
                      )}
                      
                      {checkInFocusStudent && (
                        <div className="pt-1.5">
                          <p className="font-bold text-slate-500">🌸 Fokus-Kind für nächste Woche:</p>
                          <p className="text-slate-700 font-semibold">{checkInFocusStudent} <span className="text-slate-500 font-normal">({checkInFocusNote || "Besondere Aufmerksamkeit"})</span></p>
                        </div>
                      )}

                      {(incompleteWeeklySlots.length > 0 || incompleteDenkzettelNotes.length > 0 || checkInExtraTodos) && (
                        <div className="pt-1.5 space-y-1">
                          <p className="font-bold text-slate-500">📝 Gesicherte Aufgaben:</p>
                          <div className="space-y-1 pl-1 text-[0.6875rem] text-slate-600 leading-normal">
                            {incompleteWeeklySlots.map((s, i) => (
                              <p key={i}>• {s.fach}: {s.thema}</p>
                            ))}
                            {incompleteDenkzettelNotes.map((n, i) => (
                              <p key={i}>• Notiz: {n.text}</p>
                            ))}
                            {checkInExtraTodos && <p>• {checkInExtraTodos}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
              <button
                disabled={checkInStep === 1}
                onClick={() => setCheckInStep(prev => prev - 1)}
                className={`px-5 py-3 rounded-xl border text-[0.75rem] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${checkInStep === 1 ? 'opacity-0 pointer-events-none' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              >
                <span> Zurück</span>
              </button>
              
              <button
                onClick={() => {
                  if (checkInStep < 4) {
                    setCheckInStep(prev => prev + 1);
                  } else {
                    // Complete check-in!
                    if (checkInFocusStudent) {
                      const noteText = `[Fokus-Kind] ${checkInFocusStudent} nächste Woche im Auge behalten: ${checkInFocusNote || 'Besondere Aufmerksamkeit schenken'}`;
                      setApp(prev => {
                        const notes = [...(prev.denkzettelNotes || [])];
                        notes.push({
                          id: `checkin-note-${Date.now()}`,
                          text: noteText,
                          color: 'yellow',
                          category: 'unterricht',
                          createdAt: Date.now(),
                          completed: false
                        });
                        
                        const checkins = [...(prev.wochenend_checkins || [])];
                        checkins.push({
                          id: `checkin-${Date.now()}`,
                          date: new Date().toLocaleDateString('de-AT'),
                          highlight: checkInHighlight,
                          focusStudent: checkInFocusStudent,
                          focusNote: checkInFocusNote,
                          extraTodos: checkInExtraTodos
                        });

                        return { ...prev, denkzettelNotes: notes, wochenend_checkins: checkins };
                      });
                    }
                    setShowCheckInModal(false);
                  }
                }}
                className="px-6 py-3 rounded-xl bg-amber-500 text-white hover:bg-amber-600 text-[0.75rem] font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5"
              >
                {checkInStep === 4 ? (
                  <>
                    <span>Check-In abschließen</span>
                    <span>✓</span>
                  </>
                ) : (
                  <>
                    <span>Weiter</span>
                    <span>➔</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* MAGIC PLANER POPUP MODAL */}
      {showMagicPlanerPopup && createPortal(
        <div className="fixed inset-0 z-[12500] flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setShowMagicPlanerPopup(false)} />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 30 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col max-h-[85vh] mx-auto overflow-hidden font-sans"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-purple-50">
              <div className="flex items-center gap-3">
                <span className="text-xl">🔮</span>
                <div className="text-left">
                  <h3 className="font-bold text-slate-800 text-[0.875rem] leading-none">KI-unterstützte Detailplanung</h3>
                  <p className="text-[0.6875rem] text-slate-400 mt-1">Generiert einen fertigen Mini-Verlaufsplan für das Fach {searchFach}</p>
                </div>
              </div>
              <button onClick={() => setShowMagicPlanerPopup(false)} className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-400 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Input & Action area */}
            <div className="p-6 border-b border-slate-100 bg-slate-50 space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest ml-1">Thema / Inhalt (als Vorgabe)</label>
                <input 
                  type="text"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[0.8125rem] outline-none font-medium text-slate-800"
                  placeholder="z.B. Nomen einführen, Multiplikation"
                  value={tempThema}
                  onChange={e => setTempThema(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest ml-1">Zusätzliche Wünsche / Kontext für die KI (optional)</label>
                <input 
                  type="text"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[0.8125rem] outline-none font-medium text-slate-800"
                  placeholder="z.B. spielerischer Einstieg, Legematerial nutzen..."
                  value={magicExtraPrompt}
                  onChange={e => setMagicExtraPrompt(e.target.value)}
                />
              </div>

              <button 
                onClick={handleMagicPlanerGenerate}
                disabled={magicPlanerLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white text-[0.75rem] font-black uppercase tracking-wider py-3 px-4 rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {magicPlanerLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Planung wird geschmiedet...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Mini-Verlaufsplan generieren</span>
                  </>
                )}
              </button>
            </div>

            {/* Result Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-[150px] text-left">
              {magicPlanerLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
                  <div className="text-4xl animate-bounce">🧙‍♂️</div>
                  <p className="text-[0.75rem] font-bold mt-3">Die KI mischt pädagogische Zauberzutaten...</p>
                  <p className="text-[0.6875rem] max-w-xs mt-1 leading-normal">Lernziele, Einstieg, Hauptteil und Reflexion werden aufeinander abgestimmt.</p>
                </div>
              ) : magicPlanerResult ? (
                <div className="space-y-4 animate-in fade-in duration-300 text-[0.75rem]">
                  {/* Lernziel */}
                  <div className="space-y-1 bg-purple-50/30 border border-purple-100 rounded-2xl p-4">
                    <p className="font-black text-purple-700 uppercase text-[0.5625rem] tracking-wider flex items-center gap-1">
                      <span>🎯</span> Lernziel
                    </p>
                    <p className="text-slate-700 font-semibold leading-relaxed">
                      {magicPlanerResult.lernziele}
                    </p>
                  </div>

                  {/* Einstieg */}
                  <div className="space-y-1 bg-sky-50/30 border border-sky-100 rounded-2xl p-4">
                    <p className="font-black text-sky-700 uppercase text-[0.5625rem] tracking-wider flex items-center gap-1">
                      <span>🎬</span> Einstieg (Hook)
                    </p>
                    <p className="text-slate-700 leading-relaxed font-medium">
                      {magicPlanerResult.einleitung}
                    </p>
                  </div>

                  {/* Hauptteil */}
                  <div className="space-y-1 bg-amber-50/30 border border-amber-100 rounded-2xl p-4">
                    <p className="font-black text-amber-700 uppercase text-[0.5625rem] tracking-wider flex items-center gap-1">
                      <span>🛠️</span> Hauptteil (Aktivitäten)
                    </p>
                    <p className="text-slate-700 leading-relaxed font-medium">
                      {magicPlanerResult.hauptteil}
                    </p>
                  </div>

                  {/* Schluss */}
                  <div className="space-y-1 bg-emerald-50/30 border border-emerald-100 rounded-2xl p-4">
                    <p className="font-black text-emerald-700 uppercase text-[0.5625rem] tracking-wider flex items-center gap-1">
                      <span>💬</span> Reflexion (Schluss)
                    </p>
                    <p className="text-slate-700 leading-relaxed font-medium">
                      {magicPlanerResult.schluss}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
                  <div className="text-3xl mb-2">✨</div>
                  <p className="text-[0.75rem] font-bold">Planer ist bereit</p>
                  <p className="text-[0.6875rem] max-w-xs mt-1 leading-normal">Klicke oben auf "Mini-Verlaufsplan generieren", um die Magie zu starten.</p>
                </div>
              )}
            </div>

            {/* Footer Apply */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
              <button 
                onClick={() => setShowMagicPlanerPopup(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-[0.75rem] font-bold transition-all"
              >
                Abbrechen
              </button>
              
              <button 
                disabled={!magicPlanerResult}
                onClick={handleMagicPlanerApply}
                className="px-6 py-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 text-[0.75rem] font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>In den Plan übernehmen</span>
                <span>✓</span>
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* QUICK PLAN MODAL */}
      {showQuickPlanModal && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowQuickPlanModal(false)} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5 z-10 border border-slate-100"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Schnell planen</h3>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">Neue Stunde, Termin oder Ausflug hinzufügen</p>
              </div>
              <button
                onClick={() => setShowQuickPlanModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Plan Type Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'stunde', label: 'Unterricht', icon: Layout },
                { id: 'termin', label: 'Termin', icon: Calendar },
                { id: 'test', label: 'Test / SA', icon: Flag },
                { id: 'ausflug', label: 'Ausflug', icon: PartyPopper }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setQuickPlanType(t.id as any)}
                  className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    quickPlanType === t.id
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <t.icon size={18} />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Wochentag</label>
                  <select
                    value={quickPlanTag}
                    onChange={e => setQuickPlanTag(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                  >
                    {TAGE_NAMEN.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                </div>

                {(quickPlanType === 'stunde' || quickPlanType === 'test') && (
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">Stunde</label>
                    <select
                      value={quickPlanStunde}
                      onChange={e => setQuickPlanStunde(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                    >
                      {LESSON_SLOT_NUMBERS.map((slot) => {
                        const st = slot - 1;
                        const time = configuredLessonTime(app.stundenZeiten, STUNDEN_INFO, slot);
                        return (
                          <option key={st} value={st}>
                            {slot}. Stunde{time ? ` (${time})` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>

              {(quickPlanType === 'stunde' || quickPlanType === 'test') && (
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Fach</label>
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 mb-2">
                    {['Deutsch', 'Mathematik', 'Sachunterricht', 'Englisch', 'Musikerziehung', 'BE', 'BSP'].map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setQuickPlanFach(f)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 border transition-all cursor-pointer ${
                          quickPlanFach === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Fach eingeben..."
                    value={quickPlanFach}
                    onChange={e => setQuickPlanFach(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">
                  {quickPlanType === 'stunde' ? 'Thema / Inhalt' : 'Bezeichnung / Notiz'}
                </label>
                <textarea
                  rows={3}
                  placeholder={
                    quickPlanType === 'stunde'
                      ? 'Was soll in dieser Stunde gelernt werden?'
                      : quickPlanType === 'termin'
                      ? 'z.B. Elternabend um 18:00 Uhr'
                      : quickPlanType === 'test'
                      ? 'z.B. Mathematik Schularbeit'
                      : 'z.B. Lehrausgang ins Museum'
                  }
                  value={quickPlanThema}
                  onChange={e => setQuickPlanThema(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowQuickPlanModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleQuickPlanSubmit}
                disabled={!quickPlanThema.trim() && (quickPlanType !== 'stunde' || !quickPlanFach.trim())}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer"
              >
                Speichern
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {createPortal(
        <WochenplanExcelModal
          isOpen={showExcelModal}
          onClose={() => setShowExcelModal(false)}
          onImport={handleWochenplanImport}
          activeKW={activeKW}
          app={app}
        />,
        document.body
      )}

      {showSchuelerWochenplanModal && (
        <WochenplanGeneratorModal
          activeKW={activeKW}
          onClose={() => setShowSchuelerWochenplanModal(false)}
        />
      )}

    </div>
  );
  return isFullscreen ? createPortal(planContent, document.body) : planContent;

}
