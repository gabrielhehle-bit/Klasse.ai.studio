import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { askAI } from '../services/aiService';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getSW, getStartYear, getKW, kwYear, kwToMonday, getCurrentSchuljahr, getSchulstartKW, formatLocalDateKey 
} from '../lib/utils';
import { LESSON_SLOT_NUMBERS, MAX_LESSON_SLOTS, TAGE_NAMEN } from '../constants';
import { ErrorBoundaryLogger } from './ErrorBoundaryLogger';
import { 
  BrainCircuit, CalendarRange, ArrowRight, Activity, AlertCircle, Sparkles, 
  CheckCircle2, Target, History, Coffee, Lightbulb, BookOpen, ChevronRight, 
  ChevronLeft, Plus, Loader2, Trash2, Check, LayoutGrid, Save, Sliders, 
  Calendar, Copy, RotateCcw, FileText, Layout, ShieldAlert, Info, X,
  ChevronDown, MoreHorizontal, Clock, AlertTriangle, CalendarDays, Layers,
  Eye, Filter, CheckSquare, Settings
} from 'lucide-react';
import WeeklyGoalsWidget from './WeeklyGoalsWidget';

export default function PlanungsZentrale() {
  const { app, setApp, setPage } = useApp();
  const zoomLevel = app.settings?.zoomLevel || 'standard';
  const students = app.schueler || [];
  
  const currDate = new Date();
  const actualKW = getKW(currDate);

  // Opening the overview must never silently change the globally selected week.
  const nextKW = app.currentKW || actualKW;
  const startYear = getStartYear(app.schuljahr);
  const year = kwYear(nextKW, startYear, app.bundesland || 'VBG');
  const monday = kwToMonday(nextKW, year);
  const kw = app.wochenplanung?.[nextKW] || {};
  const sw = getSW(new Date(monday), app?.schuljahr || getCurrentSchuljahr(), app?.bundesland || 'VBG');

  // Modernized & Simplified UI Mode state
  const [isEinfachModus, setIsEinfachModus] = useState<boolean>(true);
  const [showMehrMenu, setShowMehrMenu] = useState<boolean>(false);
  const [quickPlanOpen, setQuickPlanOpen] = useState<boolean>(false);
  const [quickPlanType, setQuickPlanType] = useState<'lesson' | 'event'>('lesson');

  // Planning Center Focus states
  const [planningFocus, setPlanningFocus] = useState<'day' | 'week' | 'year'>('week');
  const [activeTab, setActiveTab] = useState<'wochenplan' | 'jahresplan' | 'verlauf' | 'wochenplan-einblick'>('wochenplan');
  const [isAnalyzingWeek, setIsAnalyzingWeek] = useState<boolean>(false);
  const [showInfoOverlay, setShowInfoOverlay] = useState<boolean>(false);
  
  // Selection states for active planner
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);
  const [selectedHour, setSelectedHour] = useState<number>(0);
  const [hasSelectedSlot, setHasSelectedSlot] = useState(false);
  const [showExpandedDetailsInDrawer, setShowExpandedDetailsInDrawer] = useState<boolean>(false);

  // Quick Event States
  const [quickEventTitle, setQuickEventTitle] = useState<string>('');
  const [quickEventCategory, setQuickEventCategory] = useState<'Ausflug' | 'Termin' | 'Schularbeit' | 'Sonstiges'>('Termin');

  // Lesson Fields
  const [activeSubject, setActiveSubject] = useState<string>('');
  const [lessonTopic, setLessonTopic] = useState<string>('');
  const [lessonHomework, setLessonHomework] = useState<string>('');
  
  // Didactic settings
  const [didacticType, setDidacticType] = useState<'Einführung' | 'Einzelarbeit mit Kind' | 'Frontalunterricht' | 'Projektunterricht / Freiarbeit'>('Einführung');
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [customMaterialText, setCustomMaterialText] = useState<string>('');
  const [socialForm, setSocialForm] = useState<'Plenum' | 'Einzelarbeit' | 'Partnerarbeit' | 'Gruppenarbeit'>('Einzelarbeit');
  
  // Templates & AI
  const [templateName, setTemplateName] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiSuggestionError, setAiSuggestionError] = useState<string>('');
  const [weeklyInsightError, setWeeklyInsightError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [editingJahresplan, setEditingJahresplan] = useState<boolean>(false);
  const [jahresplanInput, setJahresplanInput] = useState<string>('');

  const DAYS_DE = useMemo(() => ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'], []);

  const availableSubjects = useMemo(
    () => (Array.isArray(app.faecher) ? app.faecher.filter(Boolean) : []),
    [app.faecher],
  );

  const todayDayIdx = useMemo(() => {
    const day = currDate.getDay(); // 0: Sun, 1: Mon ... 5: Fri
    if (day >= 1 && day <= 5) return day - 1;
    return 0; // Default to Monday on weekends
  }, [currDate]);

  const tomorrowDayIdx = useMemo(() => {
    return (todayDayIdx + 1) % 5;
  }, [todayDayIdx]);

  const getFachColorKey = (fachName?: string) => {
    if (!fachName) return 'slate';
    const configColor = app.fachConfig?.[fachName]?.color;
    if (configColor && configColor !== 'slate') return configColor;
    const ln = fachName.toLowerCase();
    
    if (ln.includes('werken') || ln.includes('technik') || ln.includes('design')) return 'orange';
    if (ln.includes('bewegung') || ln.includes('sport') || ln.includes('turnen')) return 'teal';
    if (ln.includes('fremdsprache') || ln.includes('englisch')) return 'sky';
    if (ln.includes('deutsch')) return 'blue';
    if (ln.includes('mathematik')) return 'red';
    if (ln.includes('sachunterricht')) return 'emerald';
    if (ln.includes('bildnerische') || ln.includes('kunst') || ln.includes('gestaltung')) return 'purple';
    if (ln.includes('musik')) return 'pink';
    if (ln.includes('religion')) return 'indigo';
    
    return configColor || 'slate';
  };

  const getLessonStyle = (fachName?: string) => {
    if (!fachName) return { bg: 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100', border: 'border-slate-200' };
    
    const c = getFachColorKey(fachName);
    
    const colorMap: Record<string, { bg: string, border: string }> = {
      blue: { bg: 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100', border: 'border-blue-200' },
      red: { bg: 'bg-red-50 border-red-200 text-red-800 hover:bg-red-100', border: 'border-red-200' },
      emerald: { bg: 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100', border: 'border-emerald-200' },
      indigo: { bg: 'bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100', border: 'border-indigo-200' },
      sky: { bg: 'bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100', border: 'border-sky-200' },
      purple: { bg: 'bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100', border: 'border-purple-200' },
      pink: { bg: 'bg-pink-50 border-pink-200 text-pink-800 hover:bg-pink-100', border: 'border-pink-200' },
      orange: { bg: 'bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100', border: 'border-orange-200' },
      teal: { bg: 'bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100', border: 'border-teal-200' },
      slate: { bg: 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100', border: 'border-slate-200' },
      stone: { bg: 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100', border: 'border-stone-200' },
      amber: { bg: 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100', border: 'border-amber-200' },
      fuchsia: { bg: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800 hover:bg-fuchsia-100', border: 'border-fuchsia-200' },
      rose: { bg: 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100', border: 'border-rose-200' },
      yellow: { bg: 'bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100', border: 'border-yellow-200' },
      lime: { bg: 'bg-lime-50 border-lime-200 text-lime-800 hover:bg-lime-100', border: 'border-lime-200' },
      green: { bg: 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100', border: 'border-green-200' },
      cyan: { bg: 'bg-cyan-50 border-cyan-200 text-cyan-800 hover:bg-cyan-100', border: 'border-cyan-200' },
      violet: { bg: 'bg-violet-50 border-violet-200 text-violet-800 hover:bg-violet-100', border: 'border-violet-200' },
    };
    
    return colorMap[c] || { bg: 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100', border: 'border-slate-200' };
  };

  const getLessonActiveStyle = (fachName?: string) => {
    const c = getFachColorKey(fachName);
    const activeColorMap: Record<string, string> = {
      blue: 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-100 ring-2 ring-blue-200',
      red: 'bg-red-600 text-white border-red-600 shadow-sm shadow-red-100 ring-2 ring-red-200',
      emerald: 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-100 ring-2 ring-emerald-200',
      indigo: 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-100 ring-2 ring-indigo-200',
      sky: 'bg-sky-600 text-white border-sky-600 shadow-sm shadow-sky-100 ring-2 ring-sky-200',
      purple: 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-100 ring-2 ring-purple-200',
      pink: 'bg-pink-600 text-white border-pink-600 shadow-sm shadow-pink-100 ring-2 ring-pink-200',
      orange: 'bg-orange-600 text-white border-orange-600 shadow-sm shadow-orange-100 ring-2 ring-orange-200',
      teal: 'bg-teal-600 text-white border-teal-600 shadow-sm shadow-teal-100 ring-2 ring-teal-200',
      slate: 'bg-slate-600 text-white border-slate-600 shadow-sm shadow-slate-100 ring-2 ring-slate-200',
      stone: 'bg-stone-600 text-white border-stone-600 shadow-sm shadow-stone-100 ring-2 ring-stone-200',
      amber: 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-100 ring-2 ring-amber-200',
      fuchsia: 'bg-fuchsia-600 text-white border-fuchsia-600 shadow-sm shadow-fuchsia-100 ring-2 ring-fuchsia-200',
      rose: 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-100 ring-2 ring-rose-200',
      yellow: 'bg-yellow-500 text-slate-900 border-yellow-500 shadow-sm shadow-yellow-100 ring-2 ring-yellow-200',
      lime: 'bg-lime-600 text-white border-lime-600 shadow-sm shadow-lime-100 ring-2 ring-lime-200',
      green: 'bg-green-600 text-white border-green-600 shadow-sm shadow-green-100 ring-2 ring-green-200',
      cyan: 'bg-cyan-600 text-white border-cyan-600 shadow-sm shadow-cyan-100 ring-2 ring-cyan-200',
      violet: 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-100 ring-2 ring-violet-200',
    };
    return activeColorMap[c] || 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-100 ring-2 ring-indigo-200';
  };

  const getJahresplanTheme = (kwNum: number) => {
    const item = app.jahresplanung?.[kwNum];
    if (!item) return '';
    if (typeof item === 'string') return item;
    return item.themen || item.titel || item.beschreibung || '';
  };

  const handleSaveJahresplan = () => {
    setApp(prev => {
      const jp = { ...(prev.jahresplanung || {}) };
      jp[nextKW] = jahresplanInput;
      return { ...prev, jahresplanung: jp };
    });
    setEditingJahresplan(false);
    setSuccessMessage('Jahresplan-Thema für diese Woche erfolgreich aktualisiert!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  useEffect(() => {
    setJahresplanInput(getJahresplanTheme(nextKW));
  }, [nextKW, app.jahresplanung]);

  // Load a planned or empty slot into active editor
  const handleSelectSlot = (dayIdx: number, hourIdx: number) => {
    setHasSelectedSlot(true);
    setSelectedDayIdx(dayIdx);
    setSelectedHour(hourIdx);
    
    const dayName = DAYS_DE[dayIdx];
    const wp = app.wochenplanung?.[nextKW] || {};
    const useIdx = wp[dayIdx] !== undefined;
    const dayKey = useIdx ? dayIdx : dayName;
    const lesson = wp[dayKey]?.[hourIdx];
    
    if (lesson && lesson.fach) {
      setActiveSubject(lesson.fach);
      setLessonTopic(lesson.thema || '');
      setLessonHomework(lesson.housework || '');
      setDidacticType(lesson.art || 'Einführung');
      setSocialForm(lesson.sozialform || 'Einzelarbeit');
      
      if (Array.isArray(lesson.materialsList)) {
        setSelectedMaterials(lesson.materialsList);
      } else if (lesson.material) {
        setSelectedMaterials([lesson.material]);
      } else {
        setSelectedMaterials([]);
      }
      setCustomMaterialText(lesson.customMaterial || '');
    } else {
      const defaultFach = app.stammplan?.[dayName]?.[hourIdx + 1] || '';
      setActiveSubject(defaultFach || availableSubjects[0] || '');
      setLessonTopic('');
      setLessonHomework('');
      setDidacticType('Einführung');
      setSocialForm('Einzelarbeit');
      setSelectedMaterials([]);
      setCustomMaterialText('');
    }
  };

  // Quick launch Ebene 2 Modal for slot
  const openSlotForQuickPlan = (dayIdx: number, hourIdx: number) => {
    handleSelectSlot(dayIdx, hourIdx);
    setQuickPlanType('lesson');
    setQuickPlanOpen(true);
  };

  // Save current lesson slot
  const handleSaveLesson = () => {
    if (!activeSubject.trim()) {
      setSuccessMessage('Bitte zuerst ein Fach auswählen oder in den Einstellungen anlegen.');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }

    const dayName = DAYS_DE[selectedDayIdx];
    const materialSummary = [
      ...selectedMaterials,
      customMaterialText.trim()
    ].filter(Boolean).join(', ');

    setApp(prev => {
      const wp = { ...(prev.wochenplanung || {}) };
      const weekPlan = { ...(wp[nextKW] || {}) };
      
      const useIdx = weekPlan[selectedDayIdx] !== undefined;
      const dayKey = useIdx ? selectedDayIdx : dayName;
      const dayPlan = { ...(weekPlan[dayKey] || {}) };

      dayPlan[selectedHour] = {
        fach: activeSubject,
        thema: lessonTopic,
        housework: lessonHomework,
        art: didacticType,
        sozialform: socialForm,
        material: materialSummary,
        materialsList: selectedMaterials,
        customMaterial: customMaterialText,
        erledigt: dayPlan[selectedHour]?.erledigt || false,
        updatedAt: new Date().toISOString()
      };

      weekPlan[dayKey] = dayPlan;
      wp[nextKW] = weekPlan;

      return { ...prev, wochenplanung: wp };
    });

    setSuccessMessage(`${activeSubject}-Stunde für ${dayName} (${selectedHour + 1}. Std.) gespeichert!`);
    setTimeout(() => setSuccessMessage(''), 2500);
    setQuickPlanOpen(false);
  };

  // Toggle completion checkmark directly
  const toggleCompleteSlot = (dayIdx: number, hourIdx: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const dayName = DAYS_DE[dayIdx];

    setApp(prev => {
      const wp = { ...(prev.wochenplanung || {}) };
      const weekPlan = { ...(wp[nextKW] || {}) };
      const useIdx = weekPlan[dayIdx] !== undefined;
      const dayKey = useIdx ? dayIdx : dayName;
      const dayPlan = { ...(weekPlan[dayKey] || {}) };
      const currentLesson = dayPlan[hourIdx];

      if (!currentLesson) return prev;

      dayPlan[hourIdx] = {
        ...currentLesson,
        erledigt: !currentLesson.erledigt
      };

      weekPlan[dayKey] = dayPlan;
      wp[nextKW] = weekPlan;

      return { ...prev, wochenplanung: wp };
    });
  };

  // Clear slot
  const handleClearSlot = () => {
    const dayName = DAYS_DE[selectedDayIdx];

    setApp(prev => {
      const wp = { ...(prev.wochenplanung || {}) };
      const weekPlan = { ...(wp[nextKW] || {}) };
      const useIdx = weekPlan[selectedDayIdx] !== undefined;
      const dayKey = useIdx ? selectedDayIdx : dayName;
      const dayPlan = { ...(weekPlan[dayKey] || {}) };

      delete dayPlan[selectedHour];
      weekPlan[dayKey] = dayPlan;
      wp[nextKW] = weekPlan;

      return { ...prev, wochenplanung: wp };
    });

    setLessonTopic('');
    setLessonHomework('');
    setSelectedMaterials([]);
    setCustomMaterialText('');
    setSuccessMessage(`Stundenfenster für ${dayName} geleert.`);
    setTimeout(() => setSuccessMessage(''), 2000);
    setQuickPlanOpen(false);
  };

  // Move lesson to parkgarage
  const handleShiftToParkgarage = () => {
    if (!lessonTopic.trim() && !activeSubject) return;

    const parkedItem = {
      id: `park-${Date.now()}`,
      fach: activeSubject,
      thema: lessonTopic,
      art: didacticType,
      sozialform: socialForm,
      material: selectedMaterials.join(', '),
      parkedFromKW: nextKW,
      parkedAt: new Date().toISOString()
    };

    setApp(prev => ({
      ...prev,
      parkgarage: [...(prev.parkgarage || []), parkedItem]
    }));

    handleClearSlot();
    setSuccessMessage('Stunde erfolgreich in die Parkgarage verschoben.');
    setTimeout(() => setSuccessMessage(''), 2500);
  };

  // Restore lesson from parkgarage
  const handleRestoreParked = (parkedItem: any) => {
    setActiveSubject(parkedItem.fach || availableSubjects[0]);
    setLessonTopic(parkedItem.thema || '');
    setDidacticType(parkedItem.art || 'Einführung');
    setSocialForm(parkedItem.sozialform || 'Einzelarbeit');

    setApp(prev => ({
      ...prev,
      parkgarage: (prev.parkgarage || []).filter((p: any) => p.id !== parkedItem.id)
    }));

    setSuccessMessage(`"${parkedItem.thema || parkedItem.fach}" aus der Parkgarage geholt!`);
    setTimeout(() => setSuccessMessage(''), 2500);
  };

  // Save as Template
  const handleSaveAsTemplate = () => {
    if (!templateName.trim()) {
      alert('Bitte gib einen Namen für die Vorlage ein.');
      return;
    }

    const currentWeekPlan = app.wochenplanung?.[nextKW] || {};

    setApp(prev => ({
      ...prev,
      savedWeekTemplates: {
        ...(prev.savedWeekTemplates || {}),
        [templateName.trim()]: currentWeekPlan
      }
    }));

    setTemplateName('');
    setSuccessMessage(`Woche als Vorlage "${templateName.trim()}" gesichert!`);
    setTimeout(() => setSuccessMessage(''), 2500);
  };

  // Load Template
  const handleLoadTemplate = (tName: string) => {
    const templateData = app.savedWeekTemplates?.[tName];
    if (!templateData) return;

    if (window.confirm(`Möchtest du die Vorlage "${tName}" in die aktuelle KW ${nextKW} laden? Bisherige Einträge dieser Woche werden überschrieben.`)) {
      setApp(prev => ({
        ...prev,
        wochenplanung: {
          ...(prev.wochenplanung || {}),
          [nextKW]: templateData
        }
      }));
      setSuccessMessage(`Vorlage "${tName}" geladen!`);
      setTimeout(() => setSuccessMessage(''), 2500);
    }
  };

  // Delete Template
  const handleDeleteTemplate = (tName: string) => {
    setApp(prev => {
      const templates = { ...(prev.savedWeekTemplates || {}) };
      delete templates[tName];
      return { ...prev, savedWeekTemplates: templates };
    });
  };

  // AI Topic Suggestion Call
  const handleSuggestAiThemes = async () => {
    if (!activeSubject) return;
    setIsAiLoading(true);
    setAiSuggestions([]);
    setAiSuggestionError('');

    const gradeContext = app.stufe ? `Schulstufe ${app.stufe}` : 'Schulstufe nicht angegeben';
    const prompt = `Du bist ein erfahrener österreichischer Volksschul-Didaktiker.
Gib mir 3 konkrete, kindgerechte, praxisnahe Unterrichts-Themenvorschläge für das Fach "${activeSubject}" (${gradeContext}).
Globales Wochenthema: "${getJahresplanTheme(nextKW) || 'Kein Wochenthema eingetragen'}".
Antworte NUR mit den 3 Themen, jeweils in einer neuen Zeile, ohne Aufzählungszeichen oder Zahlen.`;

    try {
      const response = await askAI(prompt, 'gemini-1.5-flash');
      const suggestions = response.split('\n').map(s => s.trim()).filter(s => s.length > 0);
      setAiSuggestions(suggestions);
    } catch (e) {
      console.error(e);
      setAiSuggestions([]);
      setAiSuggestionError('KI-Vorschläge konnten nicht geladen werden. Bitte später erneut versuchen.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // AI Weekly Curriculum Insight Analysis
  const handleGenerateWeeklyInsight = async () => {
    setIsAnalyzingWeek(true);
    setWeeklyInsightError('');

    const weekPlan = app.wochenplanung?.[nextKW] || {};
    const plannedLessonsSummary: string[] = [];

    DAYS_DE.forEach((dayName, dIdx) => {
      const useIdx = weekPlan[dIdx] !== undefined;
      const dayKey = useIdx ? dIdx : dayName;
      const dayPlan = weekPlan[dayKey] || {};

      Object.entries(dayPlan).forEach(([hIdx, l]: [string, any]) => {
        if (l && l.fach) {
          plannedLessonsSummary.push(`${dayName}, ${parseInt(hIdx) + 1}. Stunde: ${l.fach} - "${l.thema || 'Kein Thema'}" (${l.art || 'Standard'}, ${l.sozialform || 'Einzelarbeit'})`);
        }
      });
    });

    const gradeContext = app.stufe ? `Schulstufe ${app.stufe}` : 'Schulstufe nicht angegeben';
    const prompt = `Analysiere didaktisch den folgenden Wochenplan einer österreichischen Volksschulklasse (${gradeContext}, KW ${nextKW}, Schulwoche ${sw || 'nicht ermittelt'}).

Globales Wochenthema aus Jahresplan: "${getJahresplanTheme(nextKW) || 'Kein Wochenthema eingetragen'}"

Geplante Unterrichtseinheiten:
${plannedLessonsSummary.join('\n') || 'Bisher keine Stunden für diese Woche eingetragen.'}

Erstelle einen prägnanten, ermutigenden, pädagogisch wertvollen Wochen-Einblick:
1. **Pädagogischer Schwerpunkt & Lehrplan-Abdeckung**: Kurze Zusammenfassung der Stärken dieser Woche.
2. **Methodische Vielfalt & Balance**: Feedback zu Sozialformen, Bewegungs- und Ruhephasen.
3. **3 konkrete Impulse**: Kleine Ideen für Fächerübergreifend, Differenzierung oder Auflockerung.

Formatiere mit übersichtlichem Markdown und freundlichem Ton für Lehrpersonen.`;

    try {
      const insight = await askAI(prompt, 'gemini-1.5-flash');
      setApp(prev => ({
        ...prev,
        scheduleAnalysis: {
          ...(prev.scheduleAnalysis || {}),
          [nextKW]: insight
        }
      }));
    } catch (e) {
      console.error(e);
      setWeeklyInsightError('Der KI-Wocheneinblick konnte nicht geladen werden. Deine Planung wurde nicht verändert.');
    } finally {
      setIsAnalyzingWeek(false);
    }
  };

  // Carry forward unfinished lessons from previous week
  const handleCarryOverUnfinished = () => {
    const prevKWNum = nextKW - 1;
    const prevWeekPlan = app.wochenplanung?.[prevKWNum] || {};

    let carriedCount = 0;
    const currentWeekPlan = { ...(app.wochenplanung?.[nextKW] || {}) };

    DAYS_DE.forEach((dayName, dIdx) => {
      const useIdx = prevWeekPlan[dIdx] !== undefined;
      const dayKey = useIdx ? dIdx : dayName;
      const prevDayPlan = prevWeekPlan[dayKey] || {};

      Object.entries(prevDayPlan).forEach(([hIdxStr, lesson]: [string, any]) => {
        const hIdx = parseInt(hIdxStr);
        if (lesson && lesson.fach && !lesson.erledigt) {
          const targetUseIdx = currentWeekPlan[dIdx] !== undefined;
          const targetDayKey = targetUseIdx ? dIdx : dayName;
          const targetDayPlan = { ...(currentWeekPlan[targetDayKey] || {}) };

          if (!targetDayPlan[hIdx] || !targetDayPlan[hIdx].fach) {
            targetDayPlan[hIdx] = {
              ...lesson,
              erledigt: false,
              thema: `[Fortführung] ${lesson.thema || ''}`.trim()
            };
            currentWeekPlan[targetDayKey] = targetDayPlan;
            carriedCount++;
          }
        }
      });
    });

    if (carriedCount > 0) {
      setApp(prev => ({
        ...prev,
        wochenplanung: {
          ...(prev.wochenplanung || {}),
          [nextKW]: currentWeekPlan
        }
      }));
      setSuccessMessage(`${carriedCount} unvollendete Einheiten aus KW ${prevKWNum} übernommen!`);
    } else {
      setSuccessMessage(`Keine unvollständigen Stunden in Vorwoche KW ${prevKWNum} gefunden.`);
    }
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Quick event save
  const handleSaveQuickEvent = () => {
    if (!quickEventTitle.trim()) return;
    const eventDate = new Date(monday);
    eventDate.setDate(monday.getDate() + selectedDayIdx);
    const dateStr = formatLocalDateKey(eventDate);

    const newTermin = {
      id: `event-${Date.now()}`,
      datum: dateStr,
      titel: quickEventTitle.trim(),
      kategorie: quickEventCategory,
      kw: nextKW,
      erstelltAm: new Date().toISOString()
    };

    setApp(prev => ({
      ...prev,
      termine: [...(prev.termine || []), newTermin]
    }));

    setQuickEventTitle('');
    setSuccessMessage('Termin / Ereignis gespeichert!');
    setTimeout(() => setSuccessMessage(''), 2500);
    setQuickPlanOpen(false);
  };

  // Calculation helpers
  const countPlannedLessonsThisWeek = useMemo(() => {
    const wp = app.wochenplanung?.[nextKW] || {};
    let count = 0;
    DAYS_DE.forEach((dayName, dIdx) => {
      const useIdx = wp[dIdx] !== undefined;
      const dayKey = useIdx ? dIdx : dayName;
      const dayPlan = wp[dayKey] || {};
      Object.values(dayPlan).forEach((l: any) => {
        if (l && l.fach) count++;
      });
    });
    return count;
  }, [app.wochenplanung, nextKW, DAYS_DE]);

  const weekStats = useMemo(() => {
    const wp = app.wochenplanung?.[nextKW] || {};
    let total = 0;
    let completed = 0;
    DAYS_DE.forEach((dayName, dIdx) => {
      const useIdx = wp[dIdx] !== undefined;
      const dayKey = useIdx ? dIdx : dayName;
      const dayPlan = wp[dayKey] || {};
      Object.values(dayPlan).forEach((lesson: any) => {
        if (lesson && lesson.fach) {
          total++;
          if (lesson.erledigt) completed++;
        }
      });
    });
    return {
      total,
      completed,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [app.wochenplanung, nextKW, DAYS_DE]);

  // Find all unprepared lessons or missing topic slots across week
  const openLessonsList = useMemo(() => {
    const wp = app.wochenplanung?.[nextKW] || {};
    const list: { dayIdx: number; dayName: string; hourIdx: number; fach: string; thema: string; status: 'offen' | 'material' }[] = [];
    
    DAYS_DE.forEach((dayName, dIdx) => {
      const useIdx = wp[dIdx] !== undefined;
      const dayKey = useIdx ? dIdx : dayName;
      const dayPlan = wp[dayKey] || {};

      for (let hIdx = 0; hIdx < MAX_LESSON_SLOTS; hIdx++) {
        const lesson = dayPlan[hIdx];
        const defaultFach = app.stammplan?.[dayName]?.[hIdx + 1] || '';

        if (lesson && lesson.fach) {
          if (!lesson.erledigt && (!lesson.thema || !lesson.thema.trim())) {
            list.push({
              dayIdx: dIdx,
              dayName,
              hourIdx: hIdx,
              fach: lesson.fach,
              thema: 'Kein Thema eingetragen',
              status: 'offen'
            });
          }
        } else if (defaultFach) {
          list.push({
            dayIdx: dIdx,
            dayName,
            hourIdx: hIdx,
            fach: defaultFach,
            thema: 'Unvorbereitete Stunde',
            status: 'offen'
          });
        }
      }
    });
    return list;
  }, [app.wochenplanung, app.stammplan, nextKW, DAYS_DE]);

  // Planning Checklist
  const planningStepsChecklist = useMemo(() => {
    const hasJahresplanTheme = !!getJahresplanTheme(nextKW);
    const hasEnoughLessons = countPlannedLessonsThisWeek >= 10;
    const progressPercent = weekStats.percent;

    return {
      jahresplan: {
        done: hasJahresplanTheme,
        title: 'Schritt 1: Jahresplan-Schwerpunkt',
        description: hasJahresplanTheme 
          ? `Wochenthema hinterlegt: "${getJahresplanTheme(nextKW)}"`
          : 'Trage ein globales Thema/Projekt für diese Kalenderwoche ein.',
        info: 'Orientierung & rote Faden für das Curriculum'
      },
      wochenplan: {
        done: hasEnoughLessons,
        title: 'Schritt 2: Stunden-Planung',
        description: `${countPlannedLessonsThisWeek} Einheiten für KW ${nextKW} geplant.`,
        info: 'Tages- und Wochenstruktur für den Unterricht'
      },
      materialCheck: {
        done: progressPercent >= 80,
        title: 'Schritt 3: Vorbereitung & Materialien',
        description: `${weekStats.completed} von ${weekStats.total} Einheiten erledigt/vorbereitet (${progressPercent}%).`,
        info: 'Arbeitsblätter, Medien und Differenzierung bereithalten',
        progressPercent
      }
    };
  }, [nextKW, app.jahresplanung, countPlannedLessonsThisWeek, weekStats]);

  // Recent history stream
  const recentLessonsHistory = useMemo(() => {
    const prevKWNum = nextKW - 1;
    const prevPlan = app.wochenplanung?.[prevKWNum] || {};
    const history: any[] = [];

    DAYS_DE.forEach((dayName, dIdx) => {
      const useIdx = prevPlan[dIdx] !== undefined;
      const dayKey = useIdx ? dIdx : dayName;
      const dayPlan = prevPlan[dayKey] || {};

      Object.entries(dayPlan).forEach(([hIdx, l]: [string, any]) => {
        if (l && l.fach && l.thema) {
          history.push({
            day: dayName,
            hour: parseInt(hIdx) + 1,
            fach: l.fach,
            thema: l.thema,
            art: l.art,
            housework: l.housework
          });
        }
      });
    });
    return history.slice(0, 10);
  }, [app.wochenplanung, nextKW, DAYS_DE]);

  // Year weeks for Syllabus
  const startKW = getSchulstartKW(app.schuljahr || getCurrentSchuljahr(), app.bundesland || 'VBG');
  const yearWeeks = useMemo(() => {
    const list: { kwNum: number; swNum: number; mondayDate: Date }[] = [];
    const endYear = startYear + 1;
    const currentMonday = kwToMonday(startKW, startYear);
    let currentSW = 1;

    while (
      currentMonday.getFullYear() < endYear ||
      (currentMonday.getFullYear() === endYear && currentMonday.getMonth() < 7)
    ) {
      list.push({
        kwNum: getKW(currentMonday),
        swNum: currentSW,
        mondayDate: new Date(currentMonday)
      });
      currentSW++;
      currentMonday.setDate(currentMonday.getDate() + 7);
    }

    return list;
  }, [startKW, startYear]);

  // Group year weeks by month
  const weeksByMonth = useMemo(() => {
    const groups: Record<string, typeof yearWeeks> = {};
    const monthOrder: string[] = [];

    yearWeeks.forEach(item => {
      const monthName = item.mondayDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
      if (!groups[monthName]) {
        groups[monthName] = [];
        monthOrder.push(monthName);
      }
      groups[monthName].push(item);
    });

    return { groups, monthOrder };
  }, [yearWeeks]);

  const getKwStats = (kwNum: number) => {
    const weekPlan = app.wochenplanung?.[kwNum] || {};
    let count = 0;
    let completed = 0;

    DAYS_DE.forEach((dayName, dIdx) => {
      const useIdx = weekPlan[dIdx] !== undefined;
      const dayKey = useIdx ? dIdx : dayName;
      const dayPlan = weekPlan[dayKey] || {};

      Object.values(dayPlan).forEach((l: any) => {
        if (l && l.fach) {
          count++;
          if (l.erledigt) completed++;
        }
      });
    });

    return { count, completed };
  };

  const formattedDateToday = currDate.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <ErrorBoundaryLogger componentName="PlanungsZentrale">
      <div className="w-full h-full flex flex-col bg-slate-100 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900">
        
        {/* Print Styles */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body { background: white !important; font-size: 10pt !important; }
            .planning-center-header, .print\\:hidden { display: none !important; }
            .print\\:block { display: block !important; }
            .print\\:p-0 { padding: 0 !important; }
          }
        ` }} />

        {/* Global Toast Notification */}
        <AnimatePresence>
          {successMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-900 text-emerald-50 px-5 py-3 rounded-2xl shadow-2xl border border-emerald-700 flex items-center gap-2 font-bold text-sm"
            >
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1. ULTRA-CLEAN & INTUITIVE HEADER */}
        <header className="planning-center-header print:hidden bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
          {/* Left Title & Context info */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-200">
              <BrainCircuit size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-black text-slate-900 tracking-tight">Planungs-Zentrale</h1>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                  {app.klasse || 'Klasse 3a'}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                KW {nextKW} · Schulwoche {sw || '1'} · {formattedDateToday}
              </p>
            </div>
          </div>

          {/* Right Controls: Quick Add, Calendar Navigator, View Toggles & More Menu */}
          <div className="flex items-center gap-2.5 flex-wrap">
            
            {/* Primary Action Button: + PLANEN */}
            <button
              onClick={() => {
                setQuickPlanType('lesson');
                setQuickPlanOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md shadow-indigo-200 hover:shadow-indigo-300 transition active:scale-95 cursor-pointer"
            >
              <Plus size={16} className="stroke-[3]" />
              <span>+ Planen</span>
            </button>

            {/* Mode Selector Toggle: Einfachmodus vs. Erweiterter Modus */}
            <button
              onClick={() => setIsEinfachModus(!isEinfachModus)}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer border flex items-center gap-1.5 ${
                isEinfachModus 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' 
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
              title="Zwischen Übersicht und Planungswerkzeugen wechseln"
            >
              <Sliders size={14} className={isEinfachModus ? 'text-emerald-600' : 'text-slate-500'} />
              <span>{isEinfachModus ? 'Übersicht' : 'Planungswerkzeuge'}</span>
            </button>

            {/* KW Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button 
                onClick={() => {
                  const d = new Date(monday);
                  d.setDate(d.getDate() - 7);
                  setApp(p => ({ ...p, currentKW: getKW(d) }));
                }} 
                className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition"
                title="Vorherige Woche"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="px-2.5 text-center min-w-[70px]">
                <span className="text-xs font-black text-slate-800">KW {nextKW}</span>
              </div>
              
              <button 
                onClick={() => {
                  const d = new Date(monday);
                  d.setDate(d.getDate() + 7);
                  setApp(p => ({ ...p, currentKW: getKW(d) }));
                }} 
                className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition"
                title="Nächste Woche"
              >
                <ChevronRight size={16} />
              </button>

              {nextKW !== actualKW && (
                <button
                  onClick={() => setApp(p => ({ ...p, currentKW: actualKW }))}
                  className="px-2 py-1 bg-white hover:bg-indigo-50 text-indigo-700 rounded-lg transition border border-slate-200 font-extrabold text-[10px] ml-1"
                >
                  Heute
                </button>
              )}
            </div>

            {/* "MEHR" Menu Dropdown Button */}
            <div className="relative">
              <button
                onClick={() => setShowMehrMenu(!showMehrMenu)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-extrabold text-xs flex items-center gap-1.5 border border-slate-200 transition cursor-pointer"
              >
                <MoreHorizontal size={16} />
                <span>Mehr</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${showMehrMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Content */}
              {showMehrMenu && (
                <div 
                  className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150"
                  onClick={() => setShowMehrMenu(false)}
                >
                  <button
                    onClick={() => {
                      setPlanningFocus('year');
                      setIsEinfachModus(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 rounded-xl font-bold text-xs flex items-center gap-2.5 transition"
                  >
                    <Target size={15} className="text-indigo-600" />
                    <span>Jahresübersicht & Syllabus</span>
                  </button>

                  <button
                    onClick={() => setPage('materialbibliothek')}
                    className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 rounded-xl font-bold text-xs flex items-center gap-2.5 transition"
                  >
                    <BookOpen size={15} className="text-indigo-600" />
                    <span>Materialverwaltung</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('wochenplan-einblick');
                      setIsEinfachModus(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 rounded-xl font-bold text-xs flex items-center gap-2.5 transition"
                  >
                    <Sparkles size={15} className="text-amber-500 fill-amber-500" />
                    <span>KI-Wochen-Einblick</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('verlauf');
                      setIsEinfachModus(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 rounded-xl font-bold text-xs flex items-center gap-2.5 transition"
                  >
                    <Coffee size={15} className="text-indigo-600" />
                    <span>Unterrichts-Parkgarage ({app.parkgarage?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => setShowInfoOverlay(true)}
                    className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 rounded-xl font-bold text-xs flex items-center gap-2.5 transition"
                  >
                    <Info size={15} className="text-indigo-600" />
                    <span>Didaktische Schritte Checkliste</span>
                  </button>

                  <div className="border-t border-slate-100 pt-1 mt-1">
                    <button
                      onClick={() => window.print()}
                      className="w-full text-left px-3 py-2 hover:bg-slate-100 text-slate-600 rounded-xl font-bold text-xs flex items-center gap-2.5 transition"
                    >
                      <FileText size={15} />
                      <span>Wochenplan drucken</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* Banner with Week Goal & Theme */}
        {getJahresplanTheme(nextKW) && (
          <div className="bg-amber-50 border-b border-amber-200/60 px-6 py-2 print:hidden flex items-center justify-between text-xs font-bold text-amber-900">
            <div className="flex items-center gap-2">
              <span className="text-amber-600">🎯 Wochenthema aus Jahresplan (KW {nextKW}):</span>
              <span className="font-extrabold">{getJahresplanTheme(nextKW)}</span>
            </div>
            <button
              onClick={() => {
                setActiveTab('jahresplan');
                setIsEinfachModus(false);
              }}
              className="text-[11px] font-black text-amber-800 hover:underline cursor-pointer"
            >
              Thema anpassen →
            </button>
          </div>
        )}

        {/* MAIN BODY WORKSPACE */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">

          {/* ========================================================= */}
          {/* EBENE 1: EINFACHMODUS (STRICTLY TIME-HORIZON ORIENTED VIEW) */}
          {/* ========================================================= */}
          {isEinfachModus && planningFocus !== 'year' ? (
            <div className="space-y-6">

              {/* TOP GRID: HEUTE (PRIMARY FOCUS) & NOCH OFFEN WIDGET */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* HEUTE (8 COLS) */}
                <section className="lg:col-span-8 bg-white p-5 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                  
                  {/* Section Title */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-black">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-slate-900 tracking-tight">
                          1. Was ist heute geplant? ({DAYS_DE[todayDayIdx]})
                        </h2>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Tagesablauf für den heutigen Schultag
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => openSlotForQuickPlan(todayDayIdx, 0)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={14} /> Stunde hinzufügen
                    </button>
                  </div>

                  {/* List of Today's Scheduled Lessons */}
                  <div className="space-y-2.5">
                    {LESSON_SLOT_NUMBERS.map(slot => {
                      const hourIdx = slot - 1;
                      const dayName = DAYS_DE[todayDayIdx];
                      const wp = app.wochenplanung?.[nextKW] || {};
                      const useIdx = wp[todayDayIdx] !== undefined;
                      const dayKey = useIdx ? todayDayIdx : dayName;
                      const dayPlan = wp[dayKey] || {};
                      const lesson = dayPlan[hourIdx];
                      const defaultFach = app.stammplan?.[dayName]?.[hourIdx + 1] || '';

                      if (lesson && lesson.fach) {
                        const style = getLessonStyle(lesson.fach);
                        return (
                          <div
                            key={hourIdx}
                            onClick={() => openSlotForQuickPlan(todayDayIdx, hourIdx)}
                            className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-start justify-between gap-3 ${style.bg} ${style.border} hover:shadow-md`}
                          >
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black px-2 py-0.5 bg-black/5 rounded-md text-slate-700">
                                  {hourIdx + 1}. Std.
                                </span>
                                <span className="text-xs font-black uppercase tracking-wider">
                                  {lesson.fach}
                                </span>

                                {/* Status badge */}
                                {lesson.erledigt ? (
                                  <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                                    <CheckCircle2 size={12} /> Vorbereitet / Erledigt
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-extrabold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full flex items-center gap-1">
                                    <Clock size={12} /> Offen
                                  </span>
                                )}
                              </div>

                              <h3 className="font-extrabold text-sm text-slate-900 tracking-tight leading-snug">
                                {lesson.thema || <span className="text-slate-400 italic">Noch kein Thema eingetragen</span>}
                              </h3>

                              {(lesson.art || lesson.sozialform || lesson.material || lesson.housework) && (
                                <div className="text-[11px] text-slate-600 space-y-0.5 border-t border-black/5 pt-1.5 mt-1">
                                  {lesson.art && (
                                    <p>Setting: <strong>{lesson.art}</strong> ({lesson.sozialform || 'Einzelarbeit'})</p>
                                  )}
                                  {lesson.material && (
                                    <p className="truncate">Material: <strong>{lesson.material}</strong></p>
                                  )}
                                  {lesson.housework && (
                                    <p className="text-amber-900 font-bold">🏠 HÜ: {lesson.housework}</p>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Quick Complete Toggle Button */}
                            <button
                              onClick={(e) => toggleCompleteSlot(todayDayIdx, hourIdx, e)}
                              className={`p-2 rounded-xl border transition cursor-pointer shrink-0 ${
                                lesson.erledigt 
                                  ? 'bg-emerald-600 text-white border-emerald-600' 
                                  : 'bg-white text-slate-400 border-slate-200 hover:text-emerald-600 hover:border-emerald-300'
                              }`}
                              title={lesson.erledigt ? "Als unvollständig markieren" : "Als vorbereitet/erledigt markieren"}
                            >
                              <CheckCircle2 size={18} />
                            </button>
                          </div>
                        );
                      } else {
                        // Empty Slot
                        return (
                          <div
                            key={hourIdx}
                            onClick={() => openSlotForQuickPlan(todayDayIdx, hourIdx)}
                            className="p-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 hover:bg-indigo-50/40 hover:border-indigo-300 text-slate-400 hover:text-indigo-700 transition cursor-pointer flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-600 rounded-md">
                                {hourIdx + 1}. Std.
                              </span>
                              <span>Freies Zeitfenster {defaultFach ? `(Soll-Fach: ${defaultFach})` : ''}</span>
                            </div>
                            <span className="font-bold flex items-center gap-1 text-[11px]">
                              <Plus size={12} /> Planen
                            </span>
                          </div>
                        );
                      }
                    })}
                  </div>

                  {/* Daily Notes / Reflexion Field */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                      Tagesnotiz & Reflexion ({DAYS_DE[todayDayIdx]})
                    </label>
                    <textarea
                      value={app.wochenplanung?.[nextKW]?.reflexion?.[todayDayIdx] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setApp(prev => {
                          const wp = { ...(prev.wochenplanung || {}) };
                          const weekPlan = { ...(wp[nextKW] || {}) };
                          const reflexions = { ...(weekPlan.reflexion || {}) };
                          reflexions[todayDayIdx] = val;
                          weekPlan.reflexion = reflexions;
                          wp[nextKW] = weekPlan;
                          return { ...prev, wochenplanung: wp };
                        });
                      }}
                      placeholder="Notizen zum heutigen Schultag, Beobachtungen, Ausfälle..."
                      className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 h-16 font-medium"
                    />
                  </div>

                </section>

                {/* NOCH OFFEN & UNVORBEREITET WIDGET (4 COLS) */}
                <section className="lg:col-span-4 bg-white p-5 rounded-3xl shadow-sm border border-slate-200 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                          <AlertTriangle size={16} />
                        </span>
                        <div>
                          <h3 className="text-sm font-black text-slate-900">Offene Vorbereitungen</h3>
                          <p className="text-[11px] text-slate-500 font-medium">In dieser Schulwoche</p>
                        </div>
                      </div>
                      <span className="text-xs font-black px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full">
                        {openLessonsList.length}
                      </span>
                    </div>

                    {openLessonsList.length > 0 ? (
                      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                        {openLessonsList.slice(0, 6).map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => openSlotForQuickPlan(item.dayIdx, item.hourIdx)}
                            className="p-3 bg-amber-50/50 hover:bg-amber-100/60 border border-amber-200/80 rounded-2xl transition cursor-pointer space-y-1 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-amber-900">
                                {item.dayName}, {item.hourIdx + 1}. Stunde
                              </span>
                              <span className="text-[10px] font-black uppercase px-1.5 py-0.5 bg-amber-200 text-amber-950 rounded">
                                {item.fach}
                              </span>
                            </div>
                            <p className="text-slate-600 font-medium">{item.thema}</p>
                            <div className="text-[10px] font-black text-indigo-700 flex items-center justify-end gap-1 pt-1">
                              <span>Jetzt vorbereiten →</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 space-y-1">
                        <CheckCircle2 size={24} className="mx-auto text-emerald-600" />
                        <h4 className="font-black text-xs">Alles perfekt vorbereitet!</h4>
                        <p className="text-[11px] text-emerald-700 font-medium">Alle Einheiten dieser Woche sind aktuell ausgefüllt.</p>
                      </div>
                    )}
                  </div>

                  {/* Carrying forward unfinished from previous week */}
                  <div className="pt-3 border-t border-slate-100">
                    <button
                      onClick={handleCarryOverUnfinished}
                      className="w-full py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw size={14} /> Offenes aus Vorwoche herüberziehen
                    </button>
                  </div>
                </section>

              </div>

              {/* SECOND ROW: MORGEN & DIESE WOCHE ÜBERSICHT */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* MORGEN SUMMARY CARD (4 COLS) */}
                <div className="md:col-span-4 bg-white p-5 rounded-3xl shadow-sm border border-slate-200 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                        2. Morgen ({DAYS_DE[tomorrowDayIdx]})
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 rounded-md text-slate-600">
                        Vorschau
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-slate-900">
                      Morgen stehen 6 Stunden an
                    </h3>

                    <p className="text-xs text-slate-500 font-medium">
                      Klicke unten, um den morgigen Tag im Detail anzusehen oder vorzubereiten.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedDayIdx(tomorrowDayIdx);
                      openSlotForQuickPlan(tomorrowDayIdx, 0);
                    }}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Calendar size={14} /> Morgen öffnen & planen
                  </button>
                </div>

                {/* DIESE WOCHE 5-TAGE ÜBERSICHT (8 COLS) */}
                <div className="md:col-span-8 bg-white p-5 rounded-3xl shadow-sm border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">3. Was ist diese Woche geplant? (KW {nextKW})</h3>
                      <p className="text-xs text-slate-500 font-medium">Übersicht der 5 Schultage</p>
                    </div>

                    <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                      {weekStats.completed} / {weekStats.total} Std. erledigt
                    </span>
                  </div>

                  {/* 5 Day Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                    {DAYS_DE.map((dName, dIdx) => {
                      const wp = app.wochenplanung?.[nextKW] || {};
                      const useIdx = wp[dIdx] !== undefined;
                      const dayKey = useIdx ? dIdx : dName;
                      const dayPlan = wp[dayKey] || {};
                      const plannedCount = Object.values(dayPlan).filter((l: any) => l?.fach).length;
                      const isToday = dIdx === todayDayIdx;

                      return (
                        <button
                          key={dName}
                          onClick={() => {
                            setSelectedDayIdx(dIdx);
                            openSlotForQuickPlan(dIdx, 0);
                          }}
                          className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between h-28 ${
                            isToday 
                              ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-200' 
                              : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{dName.substring(0, 2)}</span>
                              {isToday && <span className="text-[8px] font-black px-1.5 py-0.5 bg-indigo-600 text-white rounded">Heute</span>}
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{dName}</span>
                          </div>

                          <div className="border-t border-slate-200/60 pt-1.5">
                            <span className="text-[11px] font-extrabold text-slate-700 block">
                              {plannedCount > 0 ? `${plannedCount} Std. geplant` : 'Keine Stunden'}
                            </span>
                            <span className="text-[10px] text-indigo-600 font-bold block">Öffnen →</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* THIRD ROW: TERMINE, AUSFLÜGE & BESONDERE EREIGNISSE */}
              <section className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 text-purple-700 flex items-center justify-center font-black">
                      <CalendarDays size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-slate-900">5. Termine, Ausflüge & besondere Ereignisse</h2>
                      <p className="text-xs text-slate-500 font-medium">Kalender-Highlights für diese Schulwoche</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setQuickPlanType('event');
                      setQuickPlanOpen(true);
                    }}
                    className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus size={14} /> Termin eintragen
                  </button>
                </div>

                {/* List of Termine */}
                {app.termine && app.termine.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {app.termine.map((t: any) => (
                      <div key={t.id} className="p-3 bg-purple-50/40 border border-purple-100 rounded-2xl flex items-start justify-between gap-2 text-xs">
                        <div>
                          <span className="text-[10px] font-black uppercase text-purple-700 px-1.5 py-0.5 bg-purple-100 rounded">
                            {t.kategorie || 'Termin'}
                          </span>
                          <h3 className="font-extrabold text-slate-900 mt-1">{t.titel}</h3>
                          <p className="text-[10px] font-bold text-slate-500 mt-0.5">{t.datum}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500 font-medium">
                    Keine besonderen Termine oder Ausflüge für diese Woche eingetragen.
                  </div>
                )}
              </section>

            </div>
          ) : (
            /* ========================================================= */
            /* EBENE 3 / ERWEITERTER MODUS (FULL GRID, SYLLABUS, ADVANCED) */
            /* ========================================================= */
            <div className="space-y-6">

              {/* Sub Navigation Bar for Extended Mode */}
              <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
                <button 
                  onClick={() => { setPlanningFocus('week'); setActiveTab('wochenplan'); }}
                  className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${planningFocus === 'week' && activeTab === 'wochenplan' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <LayoutGrid size={15} /> Wochenplan-Gitter (5×10)
                </button>

                <button 
                  onClick={() => setPlanningFocus('year')}
                  className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${planningFocus === 'year' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <CalendarRange size={15} /> Jahresplanung & Syllabus
                </button>

                <button 
                  onClick={() => setActiveTab('wochenplan-einblick')}
                  className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${activeTab === 'wochenplan-einblick' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <Sparkles size={15} className="text-amber-500 fill-amber-500" /> KI-Einblick
                </button>

                <button 
                  onClick={() => setActiveTab('verlauf')}
                  className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${activeTab === 'verlauf' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <History size={15} /> Historie & Parkgarage ({app.parkgarage?.length || 0})
                </button>
              </div>

              {/* EXTENDED VIEW CONTENT */}
              {planningFocus === 'year' ? (
                /* JAHRESÜBERSICHT / SYLLABUS GRID */
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-black text-slate-800 tracking-tight">Langfristige Jahresplanung & Syllabus ({app.schuljahr || 'Aktuelles Schuljahr'})</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Definiere globale Themen und Schwerpunkte für jede Schulwoche</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {weeksByMonth.monthOrder.map(monthName => {
                      const weeks = weeksByMonth.groups[monthName];
                      return (
                        <div key={monthName} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                            <h3 className="font-extrabold text-slate-800 text-xs tracking-tight uppercase">{monthName}</h3>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{weeks.length} Wochen</span>
                          </div>

                          <div className="space-y-3">
                            {weeks.map(item => {
                              const theme = getJahresplanTheme(item.kwNum);
                              const stats = getKwStats(item.kwNum);
                              const isCurrentWeek = getKW(new Date()) === item.kwNum;

                              return (
                                <div 
                                  key={item.kwNum}
                                  className={`p-3.5 rounded-2xl border transition relative flex flex-col justify-between gap-2.5 ${isCurrentWeek ? 'bg-indigo-50 border-indigo-300 shadow-xs' : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${isCurrentWeek ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                                        KW {item.kwNum}
                                      </span>
                                      <span className="text-[10px] font-black text-slate-400">SW {item.swNum}</span>
                                    </div>
                                  </div>

                                  <input
                                    type="text"
                                    value={theme}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setApp(prev => {
                                        const jp = { ...(prev.jahresplanung || {}) };
                                        jp[item.kwNum] = val;
                                        return { ...prev, jahresplanung: jp };
                                      });
                                    }}
                                    placeholder="Wochenthema / Schwerpunkt eintragen..."
                                    className="w-full text-xs font-bold text-slate-700 px-2 py-1.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-400 focus:outline-none"
                                  />

                                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px]">
                                    <span className="text-slate-500 font-bold">{stats.count} Std. geplant</span>
                                    <button
                                      onClick={() => {
                                        setApp(p => ({ ...p, currentKW: item.kwNum }));
                                        setPlanningFocus('week');
                                        setActiveTab('wochenplan');
                                      }}
                                      className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 text-indigo-700 font-black rounded-lg transition text-[10px]"
                                    >
                                      Anzeigen
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : activeTab === 'wochenplan-einblick' ? (
                /* KI WOCHEN-EINBLICK */
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                        <Sparkles size={20} className="fill-amber-500" />
                      </span>
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-sm">Wochenplan-Einblick</h3>
                        <p className="text-xs text-slate-400 font-bold">Lehrplan- & Kompetenz-Analyse für KW {nextKW}</p>
                      </div>
                    </div>

                    <button
                      onClick={handleGenerateWeeklyInsight}
                      disabled={isAnalyzingWeek}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition cursor-pointer"
                    >
                      {isAnalyzingWeek ? 'Analysiere...' : 'Einblick neu generieren'}
                    </button>
                  </div>

                  {weeklyInsightError && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800">
                      {weeklyInsightError}
                    </div>
                  )}

                  {app.scheduleAnalysis?.[nextKW] ? (
                    <div className="prose prose-slate max-w-none text-xs leading-relaxed space-y-3">
                      <Markdown>{app.scheduleAnalysis[nextKW]}</Markdown>
                    </div>
                  ) : (
                    <div className="py-12 text-center space-y-3">
                      <Sparkles size={32} className="mx-auto text-amber-500 fill-amber-100" />
                      <h4 className="font-black text-sm text-slate-800">Noch kein KI-Einblick für diese Woche generiert.</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Klicke oben auf "Einblick neu generieren", um deinen Wochenplan didaktisch analysieren zu lassen.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* CLASSIC 5x10 TIMETABLE MATRIX GRID */
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="font-extrabold text-slate-800 text-sm">Wochenstunden-Gitter (KW {nextKW})</h3>
                    <span className="text-xs text-slate-400 font-bold">Klicke eine Stunde zum Bearbeiten</span>
                  </div>

                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                    {DAYS_DE.map((dayName, dIdx) => {
                      const wp = app.wochenplanung?.[nextKW] || {};
                      const useIdx = wp[dIdx] !== undefined;
                      const dayKey = useIdx ? dIdx : dayName;
                      const dayPlan = wp[dayKey] || {};

                      return (
                        <div key={dayName} className="p-3 bg-slate-50/50 rounded-2xl border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between text-xs font-black text-slate-700 uppercase">
                            <span>{dayName}</span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-5 xl:grid-cols-10 gap-2">
                            {LESSON_SLOT_NUMBERS.map(slot => {
                      const hourIdx = slot - 1;
                              const lesson = dayPlan[hourIdx];
                              const defaultFach = app.stammplan?.[dayName]?.[hourIdx + 1] || '';

                              if (lesson && lesson.fach) {
                                const style = getLessonStyle(lesson.fach);
                                return (
                                  <button
                                    key={hourIdx}
                                    onClick={() => openSlotForQuickPlan(dIdx, hourIdx)}
                                    className={`p-2 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between h-20 ${style.bg} ${style.border}`}
                                  >
                                    <div>
                                      <span className="text-[9px] font-black uppercase">{lesson.fach}</span>
                                      <p className="text-[10px] font-bold text-slate-900 line-clamp-2 leading-tight mt-0.5">
                                        {lesson.thema}
                                      </p>
                                    </div>
                                    <div className="flex items-center justify-between text-[8px] text-slate-500 border-t border-black/5 pt-1">
                                      <span>{hourIdx + 1}. Std.</span>
                                      {lesson.erledigt ? <CheckCircle2 size={10} className="text-emerald-600" /> : null}
                                    </div>
                                  </button>
                                );
                              } else {
                                return (
                                  <button
                                    key={hourIdx}
                                    onClick={() => openSlotForQuickPlan(dIdx, hourIdx)}
                                    className="p-2 rounded-xl border border-dashed border-slate-200 bg-white hover:border-indigo-300 transition text-left h-20 flex flex-col justify-between text-slate-400"
                                  >
                                    <span className="text-[9px] font-bold">{hourIdx + 1}. Std.</span>
                                    <span className="text-[8px] uppercase">{defaultFach || 'Frei'}</span>
                                  </button>
                                );
                              }
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}

        </main>

        {/* ========================================================= */}
        {/* EBENE 2: SCHNELL PLANEN MODAL / DRAWER (+ PLANEN)           */}
        {/* ========================================================= */}
        <AnimatePresence>
          {quickPlanOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs"
              onClick={() => setQuickPlanOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 15, opacity: 0 }}
                className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 max-w-lg w-full max-h-[90vh] flex flex-col gap-4 overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black">
                      <Plus size={18} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-sm">2. Schnell Planen</h3>
                      <p className="text-[11px] text-slate-500 font-medium">Unterrichtsstunde, Termin oder Aufgabe hinzufügen</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setQuickPlanOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Type Selection Tabs */}
                <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-2xl gap-1 text-xs font-extrabold text-center">
                  <button
                    onClick={() => setQuickPlanType('lesson')}
                    className={`py-2 rounded-xl transition cursor-pointer ${quickPlanType === 'lesson' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'}`}
                  >
                    Unterrichtsstunde
                  </button>
                  <button
                    onClick={() => setQuickPlanType('event')}
                    className={`py-2 rounded-xl transition cursor-pointer ${quickPlanType === 'event' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'}`}
                  >
                    Termin / Ausflug
                  </button>
                </div>

                {/* FORM TYPE 1: UNTERRICHTSSTUNDE */}
                {quickPlanType === 'lesson' && (
                  <div className="space-y-4">
                    
                    {/* Day & Hour Selection */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Tag auswählen</label>
                        <select
                          value={selectedDayIdx}
                          onChange={(e) => setSelectedDayIdx(parseInt(e.target.value))}
                          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                        >
                          {DAYS_DE.map((d, idx) => (
                            <option key={d} value={idx}>{d}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Stunde auswählen</label>
                        <select
                          value={selectedHour}
                          onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                        >
                          {LESSON_SLOT_NUMBERS.map(slot => (
                            <option key={slot} value={slot - 1}>{slot}. Stunde</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Subject Pills */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase block">Fach wählen</label>
                      <div className="flex flex-wrap gap-1.5">
                        {availableSubjects.map(subj => {
                          const isActive = activeSubject === subj;
                          const style = getLessonStyle(subj);
                          return (
                            <button
                              key={subj}
                              type="button"
                              onClick={() => setActiveSubject(subj)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                                isActive ? 'bg-indigo-600 text-white border-indigo-600' : `${style.bg} ${style.border}`
                              }`}
                            >
                              {subj}
                            </button>
                          );
                        })}
                      </div>
                      {availableSubjects.length === 0 && !activeSubject && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                          <span className="text-[11px] font-semibold text-amber-900">
                            Für diese Klasse sind noch keine Fächer eingerichtet.
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickPlanOpen(false);
                              setPage('settings');
                            }}
                            className="text-[11px] font-black text-amber-900 underline underline-offset-2"
                          >
                            Einstellungen öffnen
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Topic Field */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Unterrichtsthema</label>
                        <button
                          type="button"
                          onClick={handleSuggestAiThemes}
                          disabled={isAiLoading || !activeSubject}
                          className="text-[10px] font-black text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles size={11} /> {isAiLoading ? 'Lade...' : 'KI Vorschlag'}
                        </button>
                      </div>

                      <textarea
                        value={lessonTopic}
                        onChange={(e) => setLessonTopic(e.target.value)}
                        placeholder="Was ist für diese Stunde geplant?"
                        className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-2xl h-20 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />

                      {aiSuggestionError && (
                        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-800">
                          {aiSuggestionError}
                        </p>
                      )}

                      {aiSuggestions.length > 0 && (
                        <div className="space-y-1.5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-2.5">
                          <p className="text-[10px] font-black uppercase tracking-wider text-indigo-700">
                            KI-Vorschläge
                          </p>
                          {aiSuggestions.slice(0, 3).map((suggestion, index) => (
                            <button
                              key={`${suggestion}-${index}`}
                              type="button"
                              onClick={() => {
                                setLessonTopic(suggestion);
                                setAiSuggestions([]);
                                setAiSuggestionError('');
                              }}
                              className="block w-full rounded-lg border border-indigo-100 bg-white px-2.5 py-2 text-left text-[11px] font-semibold text-slate-800 transition hover:border-indigo-300 hover:bg-indigo-50"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Homework / Note */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase block">Hausübung / Notiz</label>
                      <input
                        type="text"
                        value={lessonHomework}
                        onChange={(e) => setLessonHomework(e.target.value)}
                        placeholder="z.B. Buch S. 14 Nr. 1-3..."
                        className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>

                    {/* EXPANDABLE SECTION: MEHR DETAILS */}
                    <div className="border-t border-slate-100 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowExpandedDetailsInDrawer(!showExpandedDetailsInDrawer)}
                        className="text-xs font-black text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronDown size={14} className={`transition-transform ${showExpandedDetailsInDrawer ? 'rotate-180' : ''}`} />
                        <span>{showExpandedDetailsInDrawer ? 'Weniger Details' : 'Mehr Details (Didaktik, Materialien...)'}</span>
                      </button>

                      {showExpandedDetailsInDrawer && (
                        <div className="mt-3 space-y-3 pt-2 border-t border-slate-100">
                          {/* Didactic Setting */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase block">Art des Unterrichts</label>
                            <select
                              value={didacticType}
                              onChange={(e) => setDidacticType(e.target.value as any)}
                              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl"
                            >
                              <option value="Einführung">Einführung</option>
                              <option value="Einzelarbeit mit Kind">Einzelarbeit mit Kind</option>
                              <option value="Frontalunterricht">Frontalunterricht</option>
                              <option value="Projektunterricht / Freiarbeit">Projektunterricht / Freiarbeit</option>
                            </select>
                          </div>

                          {/* Social Form */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase block">Sozialform</label>
                            <select
                              value={socialForm}
                              onChange={(e) => setSocialForm(e.target.value as any)}
                              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl"
                            >
                              <option value="Plenum">Plenum</option>
                              <option value="Einzelarbeit">Einzelarbeit</option>
                              <option value="Partnerarbeit">Partnerarbeit</option>
                              <option value="Gruppenarbeit">Gruppenarbeit</option>
                            </select>
                          </div>

                          {/* Custom Material */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase block">Materialien</label>
                            <input
                              type="text"
                              value={customMaterialText}
                              onChange={(e) => setCustomMaterialText(e.target.value)}
                              placeholder="Benötigtes Material..."
                              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={handleSaveLesson}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs shadow-md shadow-indigo-200 transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Save size={15} /> Stunde speichern
                      </button>

                      <button
                        onClick={handleClearSlot}
                        className="px-3 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-2xl font-bold text-xs cursor-pointer"
                        title="Inhalt zurücksetzen"
                      >
                        Leeren
                      </button>
                    </div>

                  </div>
                )}

                {/* FORM TYPE 2: TERMIN / AUSFLUG */}
                {quickPlanType === 'event' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Tag wählen</label>
                      <select
                        value={selectedDayIdx}
                        onChange={(e) => setSelectedDayIdx(parseInt(e.target.value))}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                      >
                        {DAYS_DE.map((d, idx) => (
                          <option key={d} value={idx}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Titel / Bezeichnung</label>
                      <input
                        type="text"
                        value={quickEventTitle}
                        onChange={(e) => setQuickEventTitle(e.target.value)}
                        placeholder="z.B. Lehrausgang Museum, Elternsprechtag, Schularbeit..."
                        className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Kategorie</label>
                      <select
                        value={quickEventCategory}
                        onChange={(e) => setQuickEventCategory(e.target.value as any)}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                      >
                        <option value="Ausflug">Ausflug</option>
                        <option value="Termin">Termin</option>
                        <option value="Schularbeit">Schularbeit / Test</option>
                        <option value="Sonstiges">Sonstiges</option>
                      </select>
                    </div>

                    <button
                      onClick={handleSaveQuickEvent}
                      className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-xs shadow-md shadow-purple-200 transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Save size={15} /> Termin speichern
                    </button>
                  </div>
                )}

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* HELP & DIDACTIC STEPS OVERLAY */}
        <AnimatePresence>
          {showInfoOverlay && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs"
              onClick={() => setShowInfoOverlay(false)}
            >
              <motion.div 
                initial={{ scale: 0.95, y: 15, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 15, opacity: 0 }}
                className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 max-w-xl w-full max-h-[90vh] flex flex-col gap-4 overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                      <Info size={18} />
                    </span>
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm">Didaktische Planungsschritte</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Erfolgreicher Planungs-Check</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowInfoOverlay(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3 text-xs text-slate-600">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <h4 className="font-black text-slate-800">{planningStepsChecklist.jahresplan.title}</h4>
                    <p className="mt-0.5">{planningStepsChecklist.jahresplan.description}</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <h4 className="font-black text-slate-800">{planningStepsChecklist.wochenplan.title}</h4>
                    <p className="mt-0.5">{planningStepsChecklist.wochenplan.description}</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <h4 className="font-black text-slate-800">{planningStepsChecklist.materialCheck.title}</h4>
                    <p className="mt-0.5">{planningStepsChecklist.materialCheck.description}</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowInfoOverlay(false)}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Schließen
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </ErrorBoundaryLogger>
  );
}
