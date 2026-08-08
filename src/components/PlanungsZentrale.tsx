import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { askAI } from '../services/aiService';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getSW, getStartYear, getKW, kwYear, kwToMonday, getCurrentSchuljahr, getSchulstartKW 
} from '../lib/utils';
import { TAGE_NAMEN } from '../constants';
import { ErrorBoundaryLogger } from './ErrorBoundaryLogger';
import { 
  BrainCircuit, CalendarRange, ArrowRight, Activity, AlertCircle, Sparkles, 
  CheckCircle2, Target, History, Coffee, Lightbulb, BookOpen, ChevronRight, 
  ChevronLeft, Plus, Loader2, Trash2, Check, LayoutGrid, Save, Sliders, 
  Calendar, Copy, RotateCcw, FileText, Layout, ShieldAlert, Info, X
} from 'lucide-react';
import WeeklyGoalsWidget from './WeeklyGoalsWidget';

export default function PlanungsZentrale() {
  const { app, setApp, setPage } = useApp();
  const zoomLevel = app.settings?.zoomLevel || 'standard';
  const students = app.schueler || [];
  
  const currDate = new Date();
  const actualKW = getKW(currDate);
  const isWeekend = currDate.getDay() === 0 || currDate.getDay() === 6;

  const [hasBumped, setHasBumped] = useState(false);

  // Auto-advance calendar week during weekend
  useEffect(() => {
    if (isWeekend && app.currentKW === actualKW && !hasBumped) {
       const bumpedKw = actualKW === 52 ? 1 : actualKW + 1;
       setApp(prev => ({ ...prev, currentKW: bumpedKw }));
       setHasBumped(true);
    }
  }, [isWeekend, actualKW, app.currentKW, hasBumped, setApp]);

  const nextKW = app.currentKW || actualKW;
  const startYear = getStartYear(app.schuljahr);
  const year = kwYear(nextKW, startYear);
  const monday = kwToMonday(nextKW, year);
  const kw = app.wochenplanung?.[nextKW] || {};
  const sw = getSW(new Date(monday), app?.schuljahr || getCurrentSchuljahr(), app?.bundesland || 'VBG');

  // Planning Center states
  const [planningFocus, setPlanningFocus] = useState<'day' | 'week' | 'year'>('week');
  const [activeTab, setActiveTab] = useState<'wochenplan' | 'jahresplan' | 'verlauf' | 'wochenplan-einblick'>('wochenplan');
  const [isAnalyzingWeek, setIsAnalyzingWeek] = useState<boolean>(false);
  const [showInfoOverlay, setShowInfoOverlay] = useState<boolean>(false);
  
  // Selection states for active planner
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);
  const [selectedHour, setSelectedHour] = useState<number>(0);
  const [hasSelectedSlot, setHasSelectedSlot] = useState(false);
  
  // Lesson Fields
  const [activeSubject, setActiveSubject] = useState<string>('');
  const [lessonTopic, setLessonTopic] = useState<string>('');
  const [lessonHomework, setLessonHomework] = useState<string>('');
  
  // Step 4: Didactic settings
  const [didacticType, setDidacticType] = useState<'Einführung' | 'Einzelarbeit mit Kind' | 'Frontalunterricht' | 'Projektunterricht / Freiarbeit'>('Einführung');
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [customMaterialText, setCustomMaterialText] = useState<string>('');
  const [socialForm, setSocialForm] = useState<'Plenum' | 'Einzelarbeit' | 'Partnerarbeit' | 'Gruppenarbeit'>('Einzelarbeit');
  
  // Templates & AI
  const [templateName, setTemplateName] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [editingJahresplan, setEditingJahresplan] = useState<boolean>(false);
  const [jahresplanInput, setJahresplanInput] = useState<string>('');

  const DAYS_DE = useMemo(() => ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'], []);

  const availableSubjects = useMemo(() => {
    return app.faecher && app.faecher.length > 0 ? app.faecher : [
      'Mathematik', 'Deutsch', 'Sachunterricht', 'Religion', 'Englisch', 
      'Musikerziehung', 'Bildnerische Erziehung', 'Werken (TEC)', 'Werken (TEX)', 'Bewegung und Sport'
    ];
  }, [app.faecher]);

  const getFachColorKey = (fachName?: string) => {
    if (!fachName) return 'slate';
    const configColor = app.fachConfig?.[fachName]?.color;
    const ln = fachName.toLowerCase();
    
    if (!configColor || configColor === 'slate') {
      if (ln.includes('werken') || ln.includes('technik') || ln.includes('design')) return 'orange';
      if (ln.includes('bewegung') || ln.includes('sport') || ln.includes('turnen')) return 'teal';
      if (ln.includes('fremdsprache') || ln.includes('englisch')) return 'sky';
      if (ln.includes('deutsch')) return 'blue';
      if (ln.includes('mathematik')) return 'red';
      if (ln.includes('sachunterricht')) return 'emerald';
      if (ln.includes('bildnerische') || ln.includes('kunst') || ln.includes('gestaltung')) return 'purple';
      if (ln.includes('musik')) return 'pink';
      if (ln.includes('religion')) return 'indigo';
    }
    
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

  // Helper to resolve Jahresplan themes
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

  // Initialize Jahresplan input when week changes
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
      // Load existing planned lesson
      setActiveSubject(lesson.fach);
      setLessonTopic(lesson.thema || '');
      setLessonHomework(lesson.housework || '');
      setDidacticType(lesson.art || 'Einführung');
      setSocialForm(lesson.sozialform || 'Einzelarbeit');
      
      // Parse materials list
      const materialsStr = lesson.material || '';
      const items = materialsStr.split(',').map((s: string) => s.trim()).filter(Boolean);
      const preconfigured = ['Arbeitsblätter', 'Tablets / PCs', 'Montessori-Material', 'Schulbuch / Arbeitsheft', 'Experimentier-Set', 'Bastel- / Kreativzeug'];
      const selected = items.filter((i: string) => preconfigured.includes(i));
      const custom = items.filter((i: string) => !preconfigured.includes(i)).join(', ');
      
      setSelectedMaterials(selected);
      setCustomMaterialText(custom);
    } else {
      // Clean slot - pre-fill subject from timetable (stammplan)
      const stammFach = app.stammplan?.[dayName]?.[hourIdx + 1] || '';
      setActiveSubject(stammFach);
      setLessonTopic('');
      setLessonHomework('');
      setDidacticType('Einführung');
      setSocialForm('Einzelarbeit');
      setSelectedMaterials([]);
      setCustomMaterialText('');
    }
  };

  // Save lesson back to AppState
  const handleSaveLesson = () => {
    if (!activeSubject) {
      alert("Bitte wählen Sie zuerst ein Fach aus.");
      return;
    }
    
    // Combine toggle materials and custom material text
    const materialsList = [...selectedMaterials];
    if (customMaterialText.trim()) {
      materialsList.push(customMaterialText.trim());
    }
    const combinedMaterial = materialsList.join(', ');

    setApp(prev => {
      const wp = { ...(prev.wochenplanung || {}) };
      const weekPlan = { ...(wp[nextKW] || {}) };
      
      const useIdx = wp[nextKW] && wp[nextKW][selectedDayIdx] !== undefined;
      const dayKey = useIdx ? selectedDayIdx : DAYS_DE[selectedDayIdx];
      
      const dayPlan = { ...(weekPlan[dayKey] || {}) };
      dayPlan[selectedHour] = {
        ...(dayPlan[selectedHour] || {}),
        fach: activeSubject,
        thema: lessonTopic.trim(),
        material: combinedMaterial,
        housework: lessonHomework.trim(),
        erledigt: dayPlan[selectedHour]?.erledigt || false,
        art: didacticType,
        sozialform: socialForm
      };
      
      weekPlan[dayKey] = dayPlan;
      wp[nextKW] = weekPlan;
      return { ...prev, wochenplanung: wp };
    });

    // Brief success toast
    setSuccessMessage(`Stunde erfolgreich in ${DAYS_DE[selectedDayIdx]} (${selectedHour + 1}. Std.) eingetragen!`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Quick complete toggle directly from the Week Plan Grid
  const toggleCompleteSlot = (dayIdx: number, hourIdx: number, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent loading the editor
    const dayName = DAYS_DE[dayIdx];
    
    setApp(prev => {
      const wp = { ...(prev.wochenplanung || {}) };
      const weekPlan = { ...(wp[nextKW] || {}) };
      
      const useIdx = wp[nextKW] && wp[nextKW][dayIdx] !== undefined;
      const dayKey = useIdx ? dayIdx : dayName;
      
      const dayPlan = { ...(weekPlan[dayKey] || {}) };
      if (dayPlan[hourIdx]) {
        dayPlan[hourIdx] = {
          ...dayPlan[hourIdx],
          erledigt: !dayPlan[hourIdx].erledigt
        };
      }
      weekPlan[dayKey] = dayPlan;
      wp[nextKW] = weekPlan;
      return { ...prev, wochenplanung: wp };
    });
  };

  // Clear specific hour slot
  const handleClearSlot = () => {
    if (window.confirm(`${DAYS_DE[selectedDayIdx]}, ${selectedHour + 1}. Stunde wirklich leeren?`)) {
      setApp(prev => {
        const wp = { ...(prev.wochenplanung || {}) };
        const weekPlan = { ...(wp[nextKW] || {}) };
        
        const useIdx = wp[nextKW] && wp[nextKW][selectedDayIdx] !== undefined;
        const dayKey = useIdx ? selectedDayIdx : DAYS_DE[selectedDayIdx];
        
        const dayPlan = { ...(weekPlan[dayKey] || {}) };
        delete dayPlan[selectedHour];
        
        weekPlan[dayKey] = dayPlan;
        wp[nextKW] = weekPlan;
        return { ...prev, wochenplanung: wp };
      });
      
      setLessonTopic('');
      setLessonHomework('');
      setCustomMaterialText('');
      setSelectedMaterials([]);
      setSuccessMessage('Stundeninhalt gelöscht.');
      setTimeout(() => setSuccessMessage(''), 2000);
    }
  };

  // Move active lesson details to Parkgarage
  const handleShiftToParkgarage = () => {
    if (!lessonTopic.trim() && !activeSubject) return;
    
    setApp(prev => {
      const wp = { ...(prev.wochenplanung || {}) };
      const weekPlan = { ...(wp[nextKW] || {}) };
      
      const useIdx = wp[nextKW] && wp[nextKW][selectedDayIdx] !== undefined;
      const dayKey = useIdx ? selectedDayIdx : DAYS_DE[selectedDayIdx];
      
      const dayPlan = { ...(weekPlan[dayKey] || {}) };
      const item = dayPlan[selectedHour] || { fach: activeSubject, thema: lessonTopic };
      
      const parked = [...(prev.parkgarage || [])];
      parked.push({
        ...item,
        id: `parked-${Date.now()}-${Math.random()}`,
        parkedAt: new Date().toLocaleDateString('de-AT')
      });
      
      delete dayPlan[selectedHour];
      weekPlan[dayKey] = dayPlan;
      wp[nextKW] = weekPlan;
      
      return { ...prev, wochenplanung: wp, parkgarage: parked };
    });

    setLessonTopic('');
    setLessonHomework('');
    setCustomMaterialText('');
    setSelectedMaterials([]);
    setSuccessMessage('Stunde in die Parkgarage verschoben!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Re-insert parked lesson into current slot
  const handleRestoreParked = (item: any) => {
    setActiveSubject(item.fach);
    setLessonTopic(item.thema || '');
    setLessonHomework(item.housework || '');
    setDidacticType(item.art || 'Einführung');
    
    // Parse materials
    const materialsStr = item.material || '';
    const items = materialsStr.split(',').map((s: string) => s.trim()).filter(Boolean);
    const preconfigured = ['Arbeitsblätter', 'Tablets / PCs', 'Montessori-Material', 'Schulbuch / Arbeitsheft', 'Experimentier-Set', 'Bastel- / Kreativzeug'];
    const selected = items.filter((i: string) => preconfigured.includes(i));
    const custom = items.filter((i: string) => !preconfigured.includes(i)).join(', ');
    
    setSelectedMaterials(selected);
    setCustomMaterialText(custom);

    // Remove from garage
    setApp(prev => {
      const parked = (prev.parkgarage || []).filter((p: any) => p.id !== item.id);
      return { ...prev, parkgarage: parked };
    });

    setSuccessMessage('Geparkte Stunde in den Editor geladen. Bitte speichern zum Bestätigen!');
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // AI suggestion tool based on curriculum week theme & previous topic
  const handleSuggestAiThemes = async () => {
    if (!activeSubject) {
      alert("Bitte wählen Sie zuerst ein Fach aus, für das Sie KI-Ideen generieren möchten.");
      return;
    }
    
    setIsAiLoading(true);
    setAiSuggestions([]);
    
    const jpTheme = getJahresplanTheme(nextKW);
    
    // Find previous topic for this subject for context awareness
    let lastTopic = '';
    const lastWeekKW = nextKW - 1;
    const lastWeekPlan = app.wochenplanung?.[lastWeekKW] || {};
    Object.values(lastWeekPlan).forEach((dayPlan: any) => {
      if (dayPlan) {
        Object.values(dayPlan).forEach((lesson: any) => {
          if (lesson?.fach?.toLowerCase() === activeSubject.toLowerCase() && lesson?.thema) {
            lastTopic = lesson.thema;
          }
        });
      }
    });

    const prompt = `Du bist ein erfahrener Volksschullehrer. Der Lehrer plant gerade eine Unterrichtsstunde für das Fach "${activeSubject}".
Hier ist der aktuelle Kontext:
- Globales Wochenthema aus dem Jahresplan: ${jpTheme || 'Keines definiert'}
- Letztes behandeltes Thema in diesem Fach: ${lastTopic || 'Unbekannt'}

Generiere 3 konkrete, kreative und altersgerechte Vorschläge für das Thema dieser Stunde.
Gib die Antwort im folgenden JSON-Format zurück (ohne Markdown, nur roher JSON-String):
{
  "vorschlaege": [
    "Vorschlag 1 (z.B.: Rechnen mit Zehnerübergang anhand von Murmeln)",
    "Vorschlag 2",
    "Vorschlag 3"
  ]
}`;

    try {
      const res = await askAI('ki-helfer', prompt);
      if (res) {
        const cleaned = res.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.vorschlaege) {
          setAiSuggestions(parsed.vorschlaege);
        }
      }
    } catch (e) {
      console.error("AI theme suggestion failed", e);
      setAiSuggestions([
        "Einführung in das neue Wochenthema",
        "Festigung und selbstständiges Üben",
        "Kreatives Vertiefungsprojekt"
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Count planned lessons for this week
  const countPlannedLessonsThisWeek = useMemo(() => {
    const wp = app.wochenplanung?.[nextKW] || {};
    let count = 0;
    DAYS_DE.forEach((dayName, dIdx) => {
      const useIdx = wp[dIdx] !== undefined;
      const dayKey = useIdx ? dIdx : dayName;
      const dayPlan = wp[dayKey] || {};
      for (let h = 0; h < 6; h++) {
        if (dayPlan[h]?.fach) {
          count++;
        }
      }
    });
    return count;
  }, [app.wochenplanung, nextKW, DAYS_DE]);

  // Generate Weekly Competence Insight via AI
  const handleGenerateWeeklyInsight = async () => {
    setIsAnalyzingWeek(true);
    
    const wp = app.wochenplanung?.[nextKW] || {};
    let planSummary = '';
    DAYS_DE.forEach((dayName, dIdx) => {
      const useIdx = wp[dIdx] !== undefined;
      const dayKey = useIdx ? dIdx : dayName;
      const dayPlan = wp[dayKey] || {};
      let dayText = '';
      for (let h = 0; h < 6; h++) {
        const lesson = dayPlan[h];
        if (lesson && lesson.fach) {
          dayText += `- ${h+1}. Stunde: Fach: ${lesson.fach}, Thema: "${lesson.thema || 'Kein Thema'}", Art: ${lesson.art || 'nicht angegeben'}, Sozialform: ${lesson.sozialform || 'nicht angegeben'}, Material: ${lesson.material || 'keine'}\n`;
        }
      }
      if (dayText) {
        planSummary += `### ${dayName}:\n${dayText}\n`;
      }
    });

    const jpTheme = getJahresplanTheme(nextKW);

    const prompt = `Rolle: Du bist ein hochqualifizierter Lehrplan-Experte und didaktischer Berater für Volksschulen in Österreich.
Aufgabe: Analysiere den folgenden Wochenplan für die ${app.stufe || 1}. Schulstufe für die Kalenderwoche ${nextKW}.

Globales Wochenthema aus dem Jahresplan: "${jpTheme || 'Keines definiert'}"

Geplanter Unterrichtsablauf:
${planSummary || 'Bisher keine Stunden explizit eingetragen.'}

Erstelle eine professionelle, pädagogisch wertvolle Analyse der Kompetenzschwerpunkte und didaktische Empfehlungen für diese Woche. Gliedere die Analyse zwingend in folgende Abschnitte (verwende Markdown für die Formatierung):

1. **Kompetenzschwerpunkte der Woche**
   Identifiziere die wesentlichen Kompetenzen (z.B. nach dem österreichischen Lehrplan für Volksschulen), die durch die geplanten Themen abgedeckt werden. Strukturiere dies nach Fächern (z.B. Deutsch, Mathematik, Sachunterricht). Nenne konkrete Kompetenzbereiche (z.B. "Deutsch - Verfassen von Texten", "Mathematik - Operieren").

2. **Didaktische Stärken des Wochenplans**
   Hebe positive Aspekte hervor (z.B. Methodenvielfalt, ausgeglichene Sozialformen, Einsatz anschaulicher Materialien, Bezüge zum globalen Wochenthema).

3. **Didaktische Empfehlungen & cross-curriculare Bezüge**
   Gib 2-3 konkrete Vorschläge, wie der Unterricht noch runder gestaltet werden kann (z.B. Verknüpfungen zwischen Deutsch und Sachunterricht, Differenzierungstipps für stärkere/schwächere Kinder oder Ideen zur Vertiefung).

Schreibe motivierend, professionell und klar verständlich für Lehrerinnen und Lehrer. Vermeide Allgemeinplätze, beziehe dich konkret auf die oben angegebenen Themen und Fächer.`;

    try {
      const res = await askAI('ki-helfer', prompt);
      if (res) {
        setApp(prev => {
          const sa = { ...(prev.scheduleAnalysis || {}) };
          sa[nextKW] = res;
          return { ...prev, scheduleAnalysis: sa };
        });
        setSuccessMessage('Wochenplan-Einblick erfolgreich generiert!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (e) {
      console.error("Failed to generate weekly insight", e);
      alert("Fehler bei der Generierung des Wochenplan-Einblicks.");
    } finally {
      setIsAnalyzingWeek(false);
    }
  };

  // Carry over all unfinished lessons from last week (KW - 1)
  const handleCarryOverUnfinished = () => {
    const lastWeekKW = nextKW - 1;
    const lastWeekPlan = app.wochenplanung?.[lastWeekKW];
    if (!lastWeekPlan || Object.keys(lastWeekPlan).length === 0) {
      alert(`Keine Planungsdaten für die letzte Woche (KW ${lastWeekKW}) gefunden.`);
      return;
    }
    
    let count = 0;
    setApp(prev => {
      const wp = { ...(prev.wochenplanung || {}) };
      const currentWeekPlan = { ...(wp[nextKW] || {}) };
      
      Object.keys(lastWeekPlan).forEach(dayKey => {
        const dayLessons = lastWeekPlan[dayKey] || {};
        Object.keys(dayLessons).forEach(hourIdx => {
          const lesson = dayLessons[hourIdx];
          if (lesson?.thema && !lesson.erledigt) {
            const curDayLessons = { ...(currentWeekPlan[dayKey] || {}) };
            const curLesson = curDayLessons[hourIdx] || {};
            
            if (!curLesson.thema) {
              curDayLessons[hourIdx] = {
                ...curLesson,
                fach: lesson.fach,
                thema: lesson.thema,
                material: lesson.material,
                housework: lesson.housework,
                erledigt: false,
                art: lesson.art,
                sozialform: lesson.sozialform
              };
              count++;
            } else {
              curDayLessons[hourIdx] = {
                ...curLesson,
                thema: `[Nachholen] ${lesson.thema} / ${curLesson.thema}`,
                material: lesson.material ? `${lesson.material}; ${curLesson.material || ''}` : curLesson.material,
                erledigt: false
              };
              count++;
            }
            currentWeekPlan[dayKey] = curDayLessons;
          }
        });
      });
      
      if (count === 0) {
        alert("Alle Stunden der Vorwoche waren bereits als erledigt markiert!");
        return prev;
      }
      
      wp[nextKW] = currentWeekPlan;
      return { ...prev, wochenplanung: wp };
    });
    
    setSuccessMessage(`${count} nicht erledigte Themen aus KW ${lastWeekKW} übernommen!`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Template Managers
  const handleSaveAsTemplate = () => {
    if (!templateName.trim()) {
      alert("Bitte geben Sie einen Namen für die Vorlage ein.");
      return;
    }
    setApp(prev => {
      const templates = { ...(prev.savedWeekTemplates || {}) };
      const currentWeekData = prev.wochenplanung?.[nextKW] || {};
      const cleanWeek = JSON.parse(JSON.stringify(currentWeekData));
      delete cleanWeek.reflexion;
      templates[templateName] = cleanWeek;
      return { ...prev, savedWeekTemplates: templates };
    });
    alert(`Die aktuelle Woche wurde als Vorlage "${templateName}" gespeichert!`);
    setTemplateName('');
  };

  const handleLoadTemplate = (name: string) => {
    if (window.confirm(`Möchten Sie die Vorlage "${name}" in die aktuelle Woche laden? Bestehende Fächer und Themen dieser Woche werden überschrieben.`)) {
      setApp(prev => {
        const templates = prev.savedWeekTemplates || {};
        const templateData = templates[name];
        if (!templateData) return prev;
        const wp = { ...(prev.wochenplanung || {}) };
        wp[nextKW] = JSON.parse(JSON.stringify(templateData));
        return { ...prev, wochenplanung: wp };
      });
      alert(`Vorlage "${name}" geladen!`);
    }
  };

  const handleDeleteTemplate = (name: string) => {
    if (window.confirm(`Vorlage "${name}" wirklich löschen?`)) {
      setApp(prev => {
        const templates = { ...(prev.savedWeekTemplates || {}) };
        delete templates[name];
        return { ...prev, savedWeekTemplates: templates };
      });
    }
  };

  // Calculate stats for current week
  const weekStats = useMemo(() => {
    let total = 0;
    let completed = 0;
    TAGE_NAMEN.forEach((_, i) => {
      const dayPlan = kw[i] || {};
      for (let h = 0; h < 6; h++) {
        if (dayPlan[h]?.fach) {
          total++;
          if (dayPlan[h]?.erledigt) completed++;
        }
      }
    });
    return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [kw]);

  // Computed checklist of the active planning steps
  const planningStepsChecklist = useMemo(() => {
    const jpTheme = getJahresplanTheme(nextKW);
    const hasJahresplan = !!jpTheme;

    const lessonsPlanned = weekStats.total;
    const hasWochenplan = lessonsPlanned > 0;

    let lessonsDetailed = 0;
    TAGE_NAMEN.forEach((_, i) => {
      const dayPlan = kw[i] || {};
      for (let h = 0; h < 6; h++) {
        const l = dayPlan[h];
        if (l?.fach && (l?.thema || l?.material || l?.art || l?.sozialform)) {
          lessonsDetailed++;
        }
      }
    });

    return {
      jahresplan: {
        title: 'Schritt 1: Globales Wochenthema (Jahresplan)',
        description: hasJahresplan 
          ? `Wochenthema definiert: „${jpTheme}“` 
          : 'Kein globales Wochenthema für diese Woche im Jahresplan hinterlegt.',
        done: hasJahresplan,
        info: 'Stellt alle Unterrichtsstunden unter ein gemeinsames didaktisches Leitmotiv.'
      },
      wochenplan: {
        title: 'Schritt 2: Wochenstruktur (Stundenplan)',
        description: hasWochenplan 
          ? `${lessonsPlanned} Unterrichtsstunde${lessonsPlanned === 1 ? '' : 'n'} für diese Woche verplant.` 
          : 'Es wurden noch keine Fächer in den Stundenplan eingetragen.',
        done: hasWochenplan,
        info: 'Trage Fächer in das Stundenraster ein, um deine Woche grob zu strukturieren.'
      },
      materialCheck: {
        title: 'Schritt 3: Didaktische Details & Material-Check',
        description: hasWochenplan
          ? `${lessonsDetailed} von ${lessonsPlanned} Stunde${lessonsPlanned === 1 ? '' : 'n'} mit didaktischen Details (Thema, Material, Sozialform) ausgearbeitet.`
          : 'Plane zuerst Stunden im Wochenplan, um Details und Materialien festzulegen.',
        done: hasWochenplan && lessonsDetailed > 0 && lessonsDetailed === lessonsPlanned,
        progressPercent: hasWochenplan ? Math.round((lessonsDetailed / lessonsPlanned) * 100) : 0,
        info: 'Bestimme für jede Stunde ein konkretes Thema, Sozialform, Ablaufart und benötigte Unterrichtsmaterialien.'
      }
    };
  }, [kw, nextKW, app.jahresplanung, weekStats.total]);

  // Scan previous weeks for Step 3 history
  const recentLessonsHistory = useMemo(() => {
    const list: any[] = [];
    const prevWp = app.wochenplanung?.[nextKW - 1] || {};
    DAYS_DE.forEach((dayName, dIdx) => {
      const useIdx = prevWp[dIdx] !== undefined;
      const dayKey = useIdx ? dIdx : dayName;
      const dayLessons = prevWp[dayKey] || {};
      for (let h = 0; h < 6; h++) {
        const lesson = dayLessons[h];
        if (lesson?.fach && lesson?.thema) {
          list.push({
            day: dayName,
            hour: h + 1,
            fach: lesson.fach,
            thema: lesson.thema,
            material: lesson.material,
            art: lesson.art,
            housework: lesson.housework,
            erledigt: lesson.erledigt
          });
        }
      }
    });
    return list;
  }, [app.wochenplanung, nextKW, DAYS_DE]);

  // Helper for counting KW stats
  const getKwStats = (kwNum: number) => {
    const kwData = app.wochenplanung?.[kwNum] || {};
    let count = 0;
    let completed = 0;
    DAYS_DE.forEach((dayName, dIdx) => {
      const useIdx = kwData[dIdx] !== undefined;
      const dayKey = useIdx ? dIdx : dayName;
      const dayPlan = kwData[dayKey] || {};
      for (let h = 0; h < 6; h++) {
        if (dayPlan[h]?.fach) {
          count++;
          if (dayPlan[h]?.erledigt) completed++;
        }
      }
    });
    return { count, completed };
  };

  const startKW = getSchulstartKW(app?.schuljahr || getCurrentSchuljahr(), app?.bundesland || 'VBG');
  
  // School Year Weeks generator
  const yearWeeks = useMemo(() => {
    const weeks: { kwNum: number; swNum: number; mondayDate: Date; yearNum: number }[] = [];
    const startYearNum = getStartYear(app?.schuljahr || getCurrentSchuljahr());
    
    // Generate 42 school weeks
    for (let swIdx = 1; swIdx <= 42; swIdx++) {
      const firstMonday = kwToMonday(startKW, startYearNum);
      const curMonday = new Date(firstMonday);
      curMonday.setDate(firstMonday.getDate() + (swIdx - 1) * 7);
      
      const kwNum = getKW(curMonday);
      const yearNum = curMonday.getFullYear();
      
      weeks.push({
        kwNum,
        swNum: swIdx,
        mondayDate: curMonday,
        yearNum
      });
    }
    return weeks;
  }, [app?.schuljahr, app?.bundesland, startKW]);

  // Group school weeks by month
  const weeksByMonth = useMemo(() => {
    const groups: { [monthName: string]: typeof yearWeeks } = {};
    const monthOrder: string[] = [];
    
    yearWeeks.forEach(item => {
      const monthName = item.mondayDate.toLocaleString('de-DE', { month: 'long', year: 'numeric' });
      if (!groups[monthName]) {
        groups[monthName] = [];
        monthOrder.push(monthName);
      }
      groups[monthName].push(item);
    });
    
    return { groups, monthOrder };
  }, [yearWeeks]);

  return (
    <ErrorBoundaryLogger>
      <div className="planning-center-shell h-full bg-[#f4f7f3] flex flex-col relative" data-zoom-container={zoomLevel}>
        {/* Custom CSS for compact density if enabled */}
        <style dangerouslySetInnerHTML={{ __html: `
          [data-zoom-container="compact"] {
            font-size: 0.8125rem !important;
          }
          [data-zoom-container="compact"] h1 { font-size: 1.15rem !important; }
          [data-zoom-container="compact"] h2 { font-size: 0.95rem !important; }
          [data-zoom-container="compact"] h3 { font-size: 0.85rem !important; }
          [data-zoom-container="compact"] p { font-size: 0.75rem !important; }
          [data-zoom-container="compact"] button,
          [data-zoom-container="compact"] input,
          [data-zoom-container="compact"] select,
          [data-zoom-container="compact"] textarea {
            font-size: 0.75rem !important;
            padding: 0.35rem 0.625rem !important;
          }
        ` }} />

        {/* Global Success Toast Notification */}
        <AnimatePresence>
          {successMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-900 text-emerald-50 px-5 py-3 rounded-2xl shadow-xl border border-emerald-700/50 flex items-center gap-2 font-bold text-sm tracking-wide"
            >
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header Section */}
        <header className="planning-center-header print:hidden bg-white border-b border-slate-200 px-6 py-3 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 shrink-0 sticky top-0 z-10 w-full shadow-sm">
          <div className="flex items-center gap-4 w-full xl:w-auto min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <BrainCircuit size={21} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-lg font-black text-slate-900 tracking-tight leading-tight">Pädagogisches Planungs-Zentrum</h1>
                <button
                  onClick={() => setShowInfoOverlay(true)}
                  className="px-2.5 py-1 text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/80 rounded-xl transition cursor-pointer flex items-center gap-1 text-[10px] font-black tracking-wide border border-indigo-100/50"
                  title="Planungsschritte-Checkliste anzeigen"
                >
                  <Info size={13} />
                  <span>Schritte</span>
                </button>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Jahresziele, Wochenstruktur und Unterrichtsvorbereitung an einem Ort</p>
            </div>
          </div>

          {/* View Focus Selector */}
          <div className="flex items-center justify-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0 w-full xl:w-auto overflow-x-auto">
            <button
              onClick={() => {
                setPlanningFocus('day');
                setActiveTab('wochenplan');
              }}
              aria-pressed={planningFocus === 'day'}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${planningFocus === 'day' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/50 shadow-sm' : 'text-slate-600 hover:text-indigo-600 hover:bg-white/50 border border-transparent'}`}
            >
              <Calendar size={14} />
              Tagesansicht
            </button>
            <button
              onClick={() => {
                setPlanningFocus('week');
                setActiveTab('wochenplan');
              }}
              aria-pressed={planningFocus === 'week'}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${planningFocus === 'week' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/50 shadow-sm' : 'text-slate-600 hover:text-indigo-600 hover:bg-white/50 border border-transparent'}`}
            >
              <LayoutGrid size={14} />
              Wochenansicht
            </button>
            <button
              onClick={() => setPlanningFocus('year')}
              aria-pressed={planningFocus === 'year'}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${planningFocus === 'year' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/50 shadow-sm' : 'text-slate-600 hover:text-indigo-600 hover:bg-white/50 border border-transparent'}`}
            >
              <CalendarRange size={14} />
              Jahresübersicht
            </button>
          </div>

          {/* Calendar Week (KW) Selector */}
          <div className="flex items-center gap-3 shrink-0 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-center xl:self-auto">
            <button 
              onClick={() => {
                const d = new Date(monday);
                d.setDate(d.getDate() - 7);
                setApp(p => ({ ...p, currentKW: getKW(d) }));
              }} 
              className="p-1.5 bg-white text-slate-700 hover:bg-indigo-50 rounded-xl transition border border-slate-200 active:scale-95 cursor-pointer"
              title="Vorherige Woche"
            >
              <ChevronLeft size={16} />
            </button>
            
            <div className="px-3 py-1 flex flex-col items-center justify-center gap-0.5 leading-none min-w-[100px]">
              <span className="text-sm font-black text-slate-800">KW {nextKW}</span>
              {sw && <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Schulwoche {sw}</span>}
            </div>
            
            <button 
              onClick={() => {
                const d = new Date(monday);
                d.setDate(d.getDate() + 7);
                setApp(p => ({ ...p, currentKW: getKW(d) }));
              }} 
              className="p-1.5 bg-white text-slate-700 hover:bg-indigo-50 rounded-xl transition border border-slate-200 active:scale-95 cursor-pointer"
              title="Nächste Woche"
            >
              <ChevronRight size={16} />
            </button>

            {nextKW !== actualKW && (
              <button
                onClick={() => setApp(p => ({ ...p, currentKW: actualKW }))}
                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition border border-indigo-100 font-black text-[10px] cursor-pointer"
                title="Zur aktuellen Kalenderwoche springen"
              >
                Heute
              </button>
            )}
          </div>
        </header>

        {/* Weekly Reflection & Goals Header Banner */}
        <div className="bg-white/90 border-b border-slate-200 px-6 py-2.5 print:hidden">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
            {/* Left part: Progress statistics and modern progress bar */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
              <div className="flex items-center gap-2 shrink-0">
                <span className="p-1 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Activity size={14} />
                </span>
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Statistik KW {nextKW}</span>
              </div>
              
              {/* Progress visualizer block */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto text-xs font-bold text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium">Verplant:</span>
                  <span className="text-slate-800 font-extrabold">{weekStats.total} Std.</span>
                  <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                    <div 
                      className="bg-indigo-500 h-full rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min((weekStats.total / 30) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="hidden sm:block text-slate-300">|</div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium">Erledigt:</span>
                  <span className="text-emerald-700 font-extrabold">{weekStats.completed} / {weekStats.total} Std. ({weekStats.percent}%)</span>
                  <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300" 
                      style={{ width: `${weekStats.percent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right part: Actions */}
            <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
              {getJahresplanTheme(nextKW) && (
                <div className="bg-amber-50 border border-amber-100 text-amber-800 px-3 py-1 rounded-xl text-[11px] font-black flex items-center gap-1.5">
                  <span className="text-amber-500">🎯</span>
                  <span className="truncate max-w-[200px]" title={getJahresplanTheme(nextKW)}>
                    Schwerpunkt: {getJahresplanTheme(nextKW)}
                  </span>
                </div>
              )}

              <button 
                onClick={handleCarryOverUnfinished}
                className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/50 border border-indigo-100/50 px-3 py-1 rounded-xl font-black text-[11px] transition cursor-pointer"
                title="Nicht-erledigte Aufgaben aus der Vorwoche herüberziehen"
              >
                <RotateCcw size={11} /> Unvollständiges fortsetzen
              </button>
            </div>
          </div>
        </div>
        {/* Split-Screen Workspace */}
        <main className="flex-1 overflow-y-auto p-5 space-y-5">
          {planningFocus === 'year' ? (
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header stats bar */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-black text-slate-800 tracking-tight">Langfristige Jahresplanung & Schuljahr-Syllabus ({app.schuljahr || 'Aktuelles Schuljahr'})</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Definiere globale Themen, Projekte und Kompetenzen für jede Schulwoche</p>
                </div>
                <div className="flex items-center gap-4 text-center">
                  <div className="bg-indigo-50 px-3.5 py-1.5 rounded-2xl border border-indigo-150">
                    <span className="text-[10px] text-indigo-600 font-bold block uppercase tracking-wider">Planungsfortschritt</span>
                    <span className="text-sm font-black text-indigo-900">
                      {yearWeeks.filter(w => getKwStats(w.kwNum).count > 0).length} / {yearWeeks.length} Schulwochen geplant
                    </span>
                  </div>
                  <div className="bg-slate-50 px-3.5 py-1.5 rounded-2xl border border-slate-150">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Erster Schultag</span>
                    <span className="text-sm font-black text-slate-700">KW {startKW}</span>
                  </div>
                </div>
              </div>

              {/* Monthly Groupings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {weeksByMonth.monthOrder.map(monthName => {
                  const weeks = weeksByMonth.groups[monthName];
                  return (
                    <div key={monthName} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                      <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                        <h3 className="font-extrabold text-slate-800 text-xs tracking-tight uppercase tracking-wider">{monthName}</h3>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{weeks.length} Wochen</span>
                      </div>

                      <div className="space-y-3">
                        {weeks.map(item => {
                          const theme = getJahresplanTheme(item.kwNum);
                          const stats = getKwStats(item.kwNum);
                          const isCurrentWeek = getKW(new Date()) === item.kwNum;

                          // calculate week dates format (e.g. 15.09 - 19.09)
                          const mondayFmt = item.mondayDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                          const fridayDate = new Date(item.mondayDate);
                          fridayDate.setDate(item.mondayDate.getDate() + 4);
                          const fridayFmt = fridayDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

                          return (
                            <div 
                              key={item.kwNum}
                              className={`p-3.5 rounded-2xl border transition relative flex flex-col justify-between gap-2.5 ${isCurrentWeek ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200 shadow-sm' : 'bg-slate-50/50 border-slate-150 hover:bg-slate-50'}`}
                            >
                              {/* Header info row */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${isCurrentWeek ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                                    KW {item.kwNum}
                                  </span>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    SW {item.swNum}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400">
                                    ({mondayFmt} - {fridayFmt})
                                  </span>
                                </div>
                                
                                {isCurrentWeek && (
                                  <span className="text-[8px] font-black uppercase text-indigo-700 tracking-wider animate-pulse">Aktuelle KW</span>
                                )}
                              </div>

                              {/* Editable theme field */}
                              <div className="space-y-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Wochenthema / Schwerpunkt</span>
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
                                  placeholder="z.B. Kennenlernen, Geometrie..."
                                  className="w-full text-xs font-bold text-slate-700 px-2 py-1.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                                />
                              </div>

                              {/* Progress bar and Plan CTA */}
                              <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px]">
                                <div className="flex items-center gap-1 text-slate-500">
                                  <span>📅</span>
                                  <span>
                                    {stats.count === 0 ? (
                                      <span className="text-slate-400 italic">Keine Stunden</span>
                                    ) : (
                                      <strong>{stats.count} Std. geplant ({stats.completed} erledigt)</strong>
                                    )}
                                  </span>
                                </div>

                                <button
                                  onClick={() => {
                                    setApp(p => ({ ...p, currentKW: item.kwNum }));
                                    setPlanningFocus('week');
                                    setActiveTab('wochenplan');
                                  }}
                                  className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-indigo-700 font-black rounded-lg transition text-[10px]"
                                >
                                  Wochenplan
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
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
              
              {/* LEFT COLUMN: Planungs-Kontext (Steps 1, 2, 3) - 5 Cols */}
              <div className="lg:col-span-5 space-y-5 flex flex-col h-full">
                
                {/* Tab Navigation for Context Panel */}
                <div className="grid grid-cols-2 bg-white p-1.5 rounded-2xl border border-slate-200 gap-1.5 shrink-0 shadow-sm">
                  <button 
                    onClick={() => setActiveTab('jahresplan')} 
                    className={`flex-1 py-2 px-1.5 rounded-xl text-[10px] sm:text-xs font-black flex items-center justify-center gap-1 transition-all whitespace-nowrap ${activeTab === 'jahresplan' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100'}`}
                  >
                    <Target size={12} /> 1. Jahresplan
                  </button>

                  <button 
                    onClick={() => setActiveTab('wochenplan')} 
                    className={`flex-1 py-2 px-1.5 rounded-xl text-[10px] sm:text-xs font-black flex items-center justify-center gap-1 transition-all whitespace-nowrap ${activeTab === 'wochenplan' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100'}`}
                  >
                    <CalendarRange size={12} /> {planningFocus === 'day' ? '2. Tagesplan' : '2. Wochenplan'}
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('verlauf')} 
                    className={`flex-1 py-2 px-1.5 rounded-xl text-[10px] sm:text-xs font-black flex items-center justify-center gap-1 transition-all whitespace-nowrap ${activeTab === 'verlauf' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100'}`}
                  >
                    <History size={12} /> 3. Verlauf
                  </button>

                  <button 
                    onClick={() => setActiveTab('wochenplan-einblick')} 
                    className={`flex-1 py-2 px-1.5 rounded-xl text-[10px] sm:text-xs font-black flex items-center justify-center gap-1 transition-all whitespace-nowrap ${activeTab === 'wochenplan-einblick' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100'}`}
                  >
                    <Sparkles size={12} className="text-amber-500 fill-amber-500 animate-pulse" /> 4. KI-Einblick
                  </button>
                </div>

                {/* Tab Content Canvas with Fade Animation */}
                <div className="flex-1 min-h-[500px]">
                  <AnimatePresence mode="wait">
                    
                    {/* TAB 1: TAGESPLAN / WOCHENPLAN (STEP 2) */}
                    {activeTab === 'wochenplan' && (
                      <motion.div 
                        key="wochenplan" 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4 h-full flex flex-col justify-between"
                      >
                        {planningFocus === 'day' ? (
                          /* TAGESANSICHT TIMELINE */
                          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 space-y-4 font-sans">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <div>
                                <h3 className="font-extrabold text-slate-800 tracking-tight text-sm">Tagesablauf (KW {nextKW})</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Wähle eine Stunde zum Planen und passe den Tag flexibel an</p>
                              </div>
                            </div>

                            {/* Beautiful Horizontal Day Selectors */}
                            <div className="grid grid-cols-5 gap-1.5">
                              {DAYS_DE.map((dayName, dIdx) => {
                                const isSelected = selectedDayIdx === dIdx;
                                const wp = app.wochenplanung?.[nextKW] || {};
                                const useIdx = wp[dIdx] !== undefined;
                                const dayKey = useIdx ? dIdx : dayName;
                                const dayPlan = wp[dayKey] || {};
                                const countPlanned = Object.values(dayPlan).filter((l: any) => l?.fach).length;
                                
                                // Calculate date for this day
                                const dayDate = new Date(monday);
                                dayDate.setDate(monday.getDate() + dIdx);
                                const dayFmt = dayDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

                                return (
                                  <button
                                    key={dayName}
                                    onClick={() => {
                                      setSelectedDayIdx(dIdx);
                                      handleSelectSlot(dIdx, 0); // select first period of that day
                                    }}
                                    className={`py-2 px-1 rounded-xl text-center flex flex-col justify-center items-center transition cursor-pointer border ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-100' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'}`}
                                  >
                                    <span className="text-[10px] font-black uppercase tracking-tight">{dayName.substring(0, 2)}</span>
                                    <span className={`text-[9px] font-medium mt-0.5 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>{dayFmt}</span>
                                    {countPlanned > 0 && (
                                      <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full mt-1 ${isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                        {countPlanned}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Vertical Detailed Timeline of the Selected Day */}
                            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                              {[0, 1, 2, 3, 4, 5].map(hourIdx => {
                                const dayName = DAYS_DE[selectedDayIdx];
                                const wp = app.wochenplanung?.[nextKW] || {};
                                const useIdx = wp[selectedDayIdx] !== undefined;
                                const dayKey = useIdx ? selectedDayIdx : dayName;
                                const dayPlan = wp[dayKey] || {};
                                const lesson = dayPlan[hourIdx];
                                
                                const defaultFach = app.stammplan?.[dayName]?.[hourIdx + 1] || '';
                                const isCurrentSelected = selectedHour === hourIdx;

                                if (lesson && lesson.fach) {
                                  const style = getLessonStyle(lesson.fach);
                                  return (
                                    <div
                                      key={hourIdx}
                                      onClick={() => handleSelectSlot(selectedDayIdx, hourIdx)}
                                      className={`p-3.5 rounded-2xl border transition text-left cursor-pointer flex flex-col gap-2 relative ${style.bg} ${isCurrentSelected ? 'ring-2 ring-indigo-600 border-indigo-300 shadow-md' : 'hover:scale-[1.01]'}`}
                                    >
                                      {/* Hour and checkmark */}
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-black/5 rounded-lg text-slate-700">
                                            {hourIdx + 1}. Std.
                                          </span>
                                          <span className="text-[10px] font-black uppercase tracking-wider">
                                            {lesson.fach}
                                          </span>
                                        </div>
                                        
                                        <div className="flex items-center gap-1.5">
                                          <div 
                                            onClick={(e) => toggleCompleteSlot(selectedDayIdx, hourIdx, e)}
                                            className="p-1 hover:bg-black/5 rounded-lg cursor-pointer animate-none"
                                            title={lesson.erledigt ? "Als unvollständig markieren" : "Als erledigt markieren"}
                                          >
                                            <CheckCircle2 size={14} className={lesson.erledigt ? "text-emerald-600" : "text-slate-300"} />
                                          </div>
                                        </div>
                                      </div>

                                      {/* Topic */}
                                      <h4 className="font-extrabold text-xs text-slate-900 tracking-tight leading-snug">
                                        {lesson.thema || <span className="text-slate-400 italic">Kein Thema eingetragen</span>}
                                      </h4>

                                      {/* Materials, setting, homework inline */}
                                      {(lesson.art || lesson.sozialform || lesson.material || lesson.housework) && (
                                        <div className="text-[9px] space-y-1 text-slate-600 border-t border-black/5 pt-1.5 mt-0.5">
                                          {lesson.art && (
                                            <div>
                                              Setting: <strong className="text-slate-800">{lesson.art}</strong> {lesson.sozialform && `(${lesson.sozialform})`}
                                            </div>
                                          )}
                                          {lesson.material && (
                                            <div className="flex items-start gap-1">
                                              <span className="shrink-0">📄</span>
                                              <span className="truncate" title={lesson.material}>Material: <strong className="text-slate-800">{lesson.material}</strong></span>
                                            </div>
                                          )}
                                          {lesson.housework && (
                                            <div className="flex items-start gap-1 text-amber-900 bg-amber-500/10 px-1 py-0.5 rounded">
                                              <span className="shrink-0">🏠</span>
                                              <span className="truncate" title={lesson.housework}>HÜ: <strong>{lesson.housework}</strong></span>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                } else {
                                  // Empty Slot Card
                                  return (
                                    <div
                                      key={hourIdx}
                                      onClick={() => handleSelectSlot(selectedDayIdx, hourIdx)}
                                      className={`p-3 rounded-2xl border border-dashed text-left cursor-pointer transition flex items-center justify-between bg-white text-slate-400 border-slate-200 hover:border-indigo-400 hover:text-indigo-600 ${isCurrentSelected ? 'ring-2 ring-indigo-600 border-indigo-300 shadow-md bg-indigo-50/10' : ''}`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-[10px] font-bold text-slate-300 bg-slate-50 border border-slate-150 px-1.5 py-0.5 rounded-lg">
                                          {hourIdx + 1}. Std.
                                        </span>
                                        <div className="min-w-0">
                                          <p className="text-[10px] font-bold text-slate-500">Freies Zeitfenster</p>
                                          {defaultFach && (
                                            <p className="text-[9px] text-slate-400 truncate">Soll-Fach: <strong className="uppercase">{defaultFach}</strong></p>
                                          )}
                                        </div>
                                      </div>
                                      <Plus size={12} className="text-slate-300 hover:text-indigo-600 shrink-0" />
                                    </div>
                                  );
                                }
                              })}
                            </div>

                            {/* Daily notes / Reflection area */}
                            <div className="pt-2 border-t border-slate-100">
                              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block mb-1">
                                Tagesnotiz & Reflexion ({DAYS_DE[selectedDayIdx]})
                              </span>
                              <textarea
                                value={app.wochenplanung?.[nextKW]?.reflexion?.[selectedDayIdx] || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setApp(prev => {
                                    const wp = { ...(prev.wochenplanung || {}) };
                                    const weekPlan = { ...(wp[nextKW] || {}) };
                                    const reflexions = { ...(weekPlan.reflexion || {}) };
                                    reflexions[selectedDayIdx] = val;
                                    weekPlan.reflexion = reflexions;
                                    wp[nextKW] = weekPlan;
                                    return { ...prev, wochenplanung: wp };
                                  });
                                }}
                                placeholder="Notizen zum heutigen Schultag, besondere Vorkommnisse, Schülerbeobachtungen..."
                                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 h-16 font-medium leading-relaxed"
                              />
                            </div>
                          </div>
                        ) : (
                          /* CLASSIC WOVENANSICHT GRID */
                          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-extrabold text-slate-800 tracking-tight font-sans text-sm">Wochenstunden-Gitter (KW {nextKW})</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Wähle eine Stunde zum Planen oder Bearbeiten</p>
                              </div>
                              <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-100 rounded-full text-slate-500">Mo - Fr</span>
                            </div>

                            {/* Interactive Weekly Matrix Grid */}
                            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                              {DAYS_DE.map((dayName, dIdx) => {
                                const wp = app.wochenplanung?.[nextKW] || {};
                                const useIdx = wp[dIdx] !== undefined;
                                const dayKey = useIdx ? dIdx : dayName;
                                const dayPlan = wp[dayKey] || {};

                                return (
                                  <div key={dayName} className="p-3 bg-slate-50/50 rounded-2xl border border-slate-150 space-y-2">
                                    <div className="flex items-center justify-between text-xs font-black text-slate-600 uppercase tracking-wider border-b border-slate-100 pb-1">
                                      <span>{dayName}</span>
                                      {/* Completion counter for this day */}
                                      <span className="text-[10px] text-slate-400 normal-case">
                                        {Object.values(dayPlan).filter((l: any) => l?.fach).length} geplant
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-6 gap-1.5">
                                      {[0, 1, 2, 3, 4, 5].map(hourIdx => {
                                        const lesson = dayPlan[hourIdx];
                                        const isTarget = selectedDayIdx === dIdx && selectedHour === hourIdx;
                                        const defaultFach = app.stammplan?.[dayName]?.[hourIdx + 1] || '';
                                        
                                        if (lesson && lesson.fach) {
                                          const style = getLessonStyle(lesson.fach);
                                          return (
                                            <button
                                              key={hourIdx}
                                              onClick={() => handleSelectSlot(dIdx, hourIdx)}
                                              aria-label={`${dayName}, ${hourIdx + 1}. Stunde: ${lesson.fach}, ${lesson.thema || 'kein Thema'}`}
                                              className={`relative p-2 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between h-20 ${style.bg} ${isTarget ? 'ring-2 ring-indigo-600 scale-[1.02] shadow-md border-indigo-300' : 'hover:scale-[1.01] hover:shadow-sm'}`}
                                              title={`${lesson.fach}: ${lesson.thema || 'Kein Thema'}`}
                                            >
                                              <div className="w-full">
                                                <div className="flex items-center justify-between">
                                                  <span className="text-[9px] font-black uppercase tracking-wider truncate max-w-[80%]">
                                                    {lesson.fach.substring(0, 5)}..
                                                  </span>
                                                  <span className="text-[8px] font-extrabold text-slate-400 shrink-0">
                                                    {hourIdx + 1}.
                                                  </span>
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-800 line-clamp-2 leading-snug mt-0.5">
                                                  {lesson.thema}
                                                </p>
                                              </div>

                                              {/* Tiny bottom badges for didactic art or materials */}
                                              <div className="flex items-center justify-between w-full mt-1 border-t border-slate-500/10 pt-1">
                                                <div className="flex items-center gap-0.5">
                                                  {lesson.art && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" title={lesson.art} />
                                                  )}
                                                  {lesson.material && (
                                                    <span className="text-[8px]" title={lesson.material}>📄</span>
                                                  )}
                                                </div>

                                                {/* Done click handler */}
                                                <div 
                                                  onClick={(e) => toggleCompleteSlot(dIdx, hourIdx, e)}
                                                  className="p-0.5 hover:bg-black/5 rounded cursor-pointer animate-none"
                                                  title={lesson.erledigt ? "Als unvollständig markieren" : "Als erledigt markieren"}
                                                >
                                                  <CheckCircle2 size={11} className={lesson.erledigt ? "text-emerald-600" : "text-slate-300"} />
                                                </div>
                                              </div>
                                            </button>
                                          );
                                        } else {
                                          // Render Empty Slot
                                          return (
                                            <button
                                              key={hourIdx}
                                              onClick={() => handleSelectSlot(dIdx, hourIdx)}
                                              aria-label={`${dayName}, ${hourIdx + 1}. Stunde: leer${defaultFach ? `, vorgesehenes Fach ${defaultFach}` : ''}`}
                                              className={`p-2 rounded-xl border border-dashed text-left transition cursor-pointer flex flex-col justify-between h-20 bg-white text-slate-400 border-slate-200 hover:border-indigo-400 hover:text-indigo-600 ${isTarget ? 'ring-2 ring-indigo-600 scale-[1.02] shadow-md border-indigo-300' : ''}`}
                                            >
                                              <div className="flex justify-between items-start w-full">
                                                <span className="text-[9px] font-extrabold">Leer</span>
                                                <span className="text-[8px] font-black text-slate-300">{hourIdx + 1}.</span>
                                              </div>
                                              {defaultFach ? (
                                                <span className="text-[8px] font-black text-slate-400 truncate uppercase tracking-tight">
                                                  ({defaultFach.substring(0, 5)})
                                                </span>
                                              ) : (
                                                <Plus size={10} className="mx-auto" />
                                              )}
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

                      {/* Wochen-Vorlagenverwaltung (Save/Load templates) */}
                      <div className="bg-white p-4 rounded-3xl border border-slate-200 space-y-3 shrink-0">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Wochen-Planungsvorlagen</span>
                        
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            placeholder="Name für diese Woche als Vorlage..."
                            className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <button
                            onClick={handleSaveAsTemplate}
                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                          >
                            Als Vorlage sichern
                          </button>
                        </div>

                        {app.savedWeekTemplates && Object.keys(app.savedWeekTemplates).length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                            {Object.keys(app.savedWeekTemplates).map(tName => (
                              <div key={tName} className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-700">
                                <span className="truncate max-w-[120px]">{tName}</span>
                                <button onClick={() => handleLoadTemplate(tName)} className="text-emerald-600 hover:underline px-0.5 ml-1">Laden</button>
                                <button onClick={() => handleDeleteTemplate(tName)} className="text-rose-500 hover:text-rose-700 font-bold ml-1">×</button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 2: JAHRESPLAN (STEP 1) */}
                  {activeTab === 'jahresplan' && (
                    <motion.div 
                      key="jahresplan" 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 space-y-5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                          <Target size={16} />
                        </span>
                        <div>
                          <h3 className="font-extrabold text-slate-800 tracking-tight font-sans text-sm">Schritt 1: Globaler Jahresplan-Fokus</h3>
                          <p className="text-xs text-slate-400 mt-0.5">Syllabus-Themenschwerpunkte & Curriculums-Ziele</p>
                        </div>
                      </div>

                      {/* Active Week Theme Editor */}
                      <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                            Fokus für die aktuelle Woche (KW {nextKW})
                          </span>
                          {!editingJahresplan ? (
                            <button 
                              onClick={() => setEditingJahresplan(true)}
                              className="text-xs text-indigo-600 hover:underline font-bold cursor-pointer"
                            >
                              Bearbeiten
                            </button>
                          ) : null}
                        </div>

                        {!editingJahresplan ? (
                          <div className="bg-white p-3 rounded-xl border border-slate-100 min-h-16 flex items-center">
                            {getJahresplanTheme(nextKW) ? (
                              <p className="text-xs font-bold text-slate-700 leading-relaxed italic">
                                " {getJahresplanTheme(nextKW)} "
                              </p>
                            ) : (
                              <p className="text-xs text-slate-400 italic">Noch kein Themenschwerpunkt für KW {nextKW} im Jahresplan eingetragen.</p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <textarea
                              value={jahresplanInput}
                              onChange={(e) => setJahresplanInput(e.target.value)}
                              placeholder="Trage das globale Wochenthema ein (z.B. Erntedankfest, Jahreszeiten Herbst, Zehnerübergang)..."
                              className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 h-20"
                            />
                            <div className="flex items-center gap-1.5 justify-end">
                              <button 
                                onClick={() => setEditingJahresplan(false)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                              >
                                Abbrechen
                              </button>
                              <button 
                                onClick={handleSaveJahresplan}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                              >
                                Sichern
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Adjacent Weeks Syllabus Timeline Overview */}
                      <div className="space-y-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                          Jahresplan Chronologie (Übersicht)
                        </span>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                          {[-2, -1, 0, 1, 2].map(offset => {
                            const kwNum = nextKW + offset;
                            if (kwNum < 1 || kwNum > 52) return null;
                            const isCurrent = offset === 0;
                            const themeText = getJahresplanTheme(kwNum);

                            return (
                              <div 
                                key={offset} 
                                className={`p-3 rounded-xl border text-xs flex items-start gap-3 transition ${isCurrent ? 'bg-indigo-50/40 border-indigo-200 ring-1 ring-indigo-200' : 'bg-slate-50 border-slate-150'}`}
                              >
                                <span className={`text-[10px] font-black px-2 py-1 rounded-lg shrink-0 ${isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                  KW {kwNum}
                                </span>
                                <div className="flex-1 min-w-0">
                                  {themeText ? (
                                    <p className="font-bold text-slate-700 leading-snug truncate">{themeText}</p>
                                  ) : (
                                    <p className="text-slate-400 italic">Noch unbepflanzt</p>
                                  )}
                                  <span className="text-[9px] font-bold text-slate-400 block mt-0.5">
                                    {isCurrent ? 'Aktuelle Woche' : offset < 0 ? 'Vorherige Woche' : 'Zukünftige Woche'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 3: VERLAUF / LETZTE PLANUNGEN (STEP 3) */}
                  {activeTab === 'verlauf' && (
                    <motion.div 
                      key="verlauf" 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                            <History size={16} />
                          </span>
                          <div>
                            <h3 className="font-extrabold text-slate-800 tracking-tight font-sans text-sm">Schritt 3: Letzte Planungen & Historie</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Nutze Unterrichts-Continuity für reibungslose Übergänge</p>
                          </div>
                        </div>

                        {/* Carrying unfinished forward */}
                        <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100/50 flex items-center justify-between gap-3">
                          <div className="text-xs leading-relaxed text-indigo-900 font-medium">
                            <p className="font-bold">Pedagogische Kontinuität</p>
                            <p className="text-indigo-700/80 text-[11px] mt-0.5">Führe unvollendete Themen der Vorwoche automatisch fort.</p>
                          </div>
                          <button
                            onClick={handleCarryOverUnfinished}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap shrink-0 transition"
                          >
                            Fortführen
                          </button>
                        </div>

                        {/* Recent Lessons Stream */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                            Zuletzt geplant (KW {nextKW - 1})
                          </span>

                          {recentLessonsHistory.length > 0 ? (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                              {recentLessonsHistory.map((lh, lidx) => {
                                const style = getLessonStyle(lh.fach);
                                return (
                                  <div 
                                    key={lidx} 
                                    className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 text-xs"
                                  >
                                    <div className="min-w-0 flex-1 space-y-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${style.bg}`}>
                                          {lh.fach}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400">
                                          {lh.day}, {lh.hour}. Stunde
                                        </span>
                                      </div>
                                      <p className="font-bold text-slate-700 leading-snug truncate">
                                        {lh.thema}
                                      </p>
                                    </div>

                                    {/* Action button to continue the same topic */}
                                    <button
                                      onClick={() => {
                                        setActiveSubject(lh.fach);
                                        setLessonTopic(`Fortsetzung: ${lh.thema}`);
                                        setLessonHomework(lh.housework || '');
                                        setDidacticType(lh.art || 'Einführung');
                                        setSuccessMessage(`Thema von ${lh.day} (${lh.fach}) geladen!`);
                                        setTimeout(() => setSuccessMessage(''), 2000);
                                      }}
                                      className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-indigo-700 font-black rounded-xl transition cursor-pointer text-[10px]"
                                      title="Thema in aktuellen Plan übernehmen"
                                    >
                                      <Copy size={10} /> Übernehmen
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded-2xl border border-slate-150">
                              Keine Stunden in der Vorwoche (KW {nextKW - 1}) gefunden.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Parkgarage list inside Verlauf */}
                      <div className="bg-slate-900 text-slate-100 p-5 rounded-3xl shadow-sm border border-slate-800 space-y-3 shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-slate-800 text-amber-400">
                            <Coffee size={14} />
                          </span>
                          <h4 className="font-extrabold text-sm tracking-tight text-white font-sans">Unterrichts-Parkgarage</h4>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-normal">
                          Lagere stornierte, verschobene oder gestrichene Stunden hier, um sie bei Gelegenheit wieder aufzugreifen.
                        </p>

                        {app.parkgarage && app.parkgarage.length > 0 ? (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {app.parkgarage.map((item: any) => {
                              const style = getLessonStyle(item.fach);
                              return (
                                <div key={item.id} className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 text-xs">
                                  <div className="min-w-0 flex-1">
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${style.bg}`}>
                                      {item.fach}
                                    </span>
                                    <p className="font-bold text-slate-200 truncate mt-1">{item.thema || 'Kein Thema'}</p>
                                  </div>
                                  <button
                                    onClick={() => handleRestoreParked(item)}
                                    className="px-2 py-1 bg-slate-800 hover:bg-amber-500 hover:text-slate-900 text-slate-300 rounded-xl font-bold text-[10px] cursor-pointer"
                                  >
                                    Reaktivieren
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic text-center py-2">Die Parkgarage ist leer.</p>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'wochenplan-einblick' && (
                    <motion.div 
                      key="wochenplan-einblick"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col gap-5 h-full min-h-[500px]"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                            <Sparkles size={18} className="fill-amber-500 animate-pulse" />
                          </span>
                          <div>
                            <h3 className="font-extrabold text-slate-800 tracking-tight font-sans text-sm">Wochenplan-Einblick</h3>
                            <p className="text-xs text-slate-400 mt-0.5 font-bold">Lehrplan- & Kompetenzschwerpunkt-Analyse</p>
                          </div>
                        </div>
                        
                        {app.scheduleAnalysis?.[nextKW] && (
                          <button
                            onClick={handleGenerateWeeklyInsight}
                            disabled={isAnalyzingWeek}
                            className="text-[11px] font-black text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-100/50 px-2.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0 disabled:opacity-50"
                          >
                            <RotateCcw size={12} className={isAnalyzingWeek ? 'animate-spin' : ''} />
                            Neu laden
                          </button>
                        )}
                      </div>

                      {isAnalyzingWeek ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center space-y-4">
                          <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin flex items-center justify-center">
                            <BrainCircuit size={20} className="text-indigo-600" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-800 text-sm">Unterrichtskompetenzen werden analysiert...</h4>
                            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto font-medium">
                              Die KI prüft deine geplante Woche anhand des österreichischen Lehrplans, verknüpft Lernbereiche und formuliert didaktische Empfehlungen.
                            </p>
                          </div>
                        </div>
                      ) : app.scheduleAnalysis?.[nextKW] ? (
                        <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[550px]">
                          <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 flex gap-3 text-xs text-emerald-800">
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-extrabold">Erfolgreich generiert</p>
                              <p className="text-emerald-700/80 text-[11px] mt-0.5 font-medium">
                                Dieser Einblick basiert auf deinen geplanten Stunden und dem globalen Thema der Kalenderwoche {nextKW}.
                              </p>
                            </div>
                          </div>

                          <div className="markdown-body text-xs text-slate-650 leading-relaxed space-y-3 prose prose-slate max-w-none">
                            <Markdown>{app.scheduleAnalysis[nextKW]}</Markdown>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center space-y-5">
                          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shadow-sm shrink-0">
                            <Sparkles size={30} className="fill-amber-100 animate-pulse text-amber-500" />
                          </div>
                          
                          <div className="space-y-2 max-w-sm">
                            <h4 className="font-extrabold text-slate-800 text-sm">Kompetenz-Einblick generieren</h4>
                            <p className="text-xs text-slate-400 leading-normal font-medium">
                              Lass deinen Wochenplan für KW {nextKW} KI-gestützt analysieren. Du hast aktuell <span className="font-bold text-slate-600">{countPlannedLessonsThisWeek} Stunden</span> geplant.
                            </p>
                          </div>

                          <button
                            onClick={handleGenerateWeeklyInsight}
                            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black shadow-md shadow-indigo-100 hover:shadow-indigo-200 transition cursor-pointer flex items-center gap-2"
                          >
                            <BrainCircuit size={14} />
                            KI-Einblick für diese Woche erstellen
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>

            {/* RIGHT COLUMN: Die Planungs-Kommandozentrale (Steps 4, 5) - 7 Cols */}
            <div className="lg:col-span-7 space-y-6 h-full">
              {!hasSelectedSlot ? (
                <div className="flex min-h-[32rem] flex-col items-center justify-center rounded-3xl border border-dashed border-indigo-200 bg-gradient-to-b from-white to-indigo-50/60 px-8 py-12 text-center shadow-sm">
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-100 text-indigo-700">
                    <CalendarRange size={30} />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">Wähle zuerst eine Unterrichtsstunde</h3>
                  <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-500">
                    Klicke links im Wochenraster auf eine Stunde. Danach kannst du Fach, Thema, Sozialform und Materialien gezielt für diesen Termin planen.
                  </p>
                  <div className="mt-6 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500 shadow-sm">
                    <ArrowRight size={15} className="rotate-180 text-indigo-500" />
                    Eine leere oder bereits geplante Stunde auswählen
                  </div>
                </div>
              ) : (
              <>

              {/* STEP 4: DIDAKTISCHE VORBEREITUNG */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-5">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <Sliders size={18} />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-slate-800 tracking-tight font-sans text-sm">Schritt 4: Didaktische Vorbereitung</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Wähle Unterrichtsmethodik, Sozialform & benötigte Materialien</p>
                  </div>
                </div>

                {/* Didactic Setting Cards */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Art des Unterrichts (Setting)</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { 
                        type: 'Einführung', 
                        icon: '🌟', 
                        desc: 'Neuen Stoff präsentieren, erklären & demonstrieren', 
                        activeStyle: 'bg-blue-50 border-blue-400 ring-2 ring-blue-100 text-blue-900' 
                      },
                      { 
                        type: 'Einzelarbeit mit Kind', 
                        icon: '🧒', 
                        desc: 'Gezieltes One-on-One Coaching & individuelle Hilfe', 
                        activeStyle: 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-100 text-emerald-900' 
                      },
                      { 
                        type: 'Frontalunterricht', 
                        icon: '👥', 
                        desc: 'Lehrperson führt durch das Thema, Plenum, Tafelarbeit', 
                        activeStyle: 'bg-purple-50 border-purple-400 ring-2 ring-purple-100 text-purple-900' 
                      },
                      { 
                        type: 'Projektunterricht / Freiarbeit', 
                        icon: '🛠️', 
                        desc: 'Kooperatives Lernen, Stationenbetrieb, freie Forscherarbeit', 
                        activeStyle: 'bg-amber-50 border-amber-400 ring-2 ring-amber-100 text-amber-900' 
                      }
                    ].map(card => {
                      const isActive = didacticType === card.type;
                      return (
                        <button
                          key={card.type}
                          onClick={() => setDidacticType(card.type as any)}
                          className={`p-3 rounded-xl border text-left transition duration-200 cursor-pointer flex items-start gap-3 min-h-20 ${isActive ? card.activeStyle : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white'}`}
                        >
                          <span className="text-2xl mt-0.5 shrink-0">{card.icon}</span>
                          <div className="min-w-0">
                            <p className="font-black text-slate-800 text-xs">{card.type}</p>
                            <p className="text-[10px] text-slate-500 leading-snug line-clamp-2 mt-0.5">{card.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Social Forms */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Sozialform</span>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { key: 'Plenum', label: 'Plenum 👥' },
                      { key: 'Einzelarbeit', label: 'Einzelarbeit 🧒' },
                      { key: 'Partnerarbeit', label: 'Partnerarbeit 👥' },
                      { key: 'Gruppenarbeit', label: 'Gruppenarbeit 👥👥' }
                    ].map(sf => {
                      const isActive = socialForm === sf.key;
                      return (
                        <button
                          key={sf.key}
                          onClick={() => setSocialForm(sf.key as any)}
                          className={`py-1.5 px-1 rounded-xl text-[11px] font-bold text-center border transition cursor-pointer ${isActive ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'}`}
                        >
                          {sf.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Available Materials & Resources Checklist */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Benötigte Materialien</span>
                  
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Arbeitsblätter',
                      'Tablets / PCs',
                      'Montessori-Material',
                      'Schulbuch / Arbeitsheft',
                      'Experimentier-Set',
                      'Bastel- / Kreativzeug'
                    ].map(mat => {
                      const isSelected = selectedMaterials.includes(mat);
                      return (
                        <button
                          key={mat}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedMaterials(selectedMaterials.filter(m => m !== mat));
                            } else {
                              setSelectedMaterials([...selectedMaterials, mat]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer ${isSelected ? 'bg-indigo-50 border-indigo-300 text-indigo-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                          {isSelected && <Check size={12} className="text-indigo-600" />}
                          <span>{mat}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Optional Custom Materials Text */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">Zusätzliches, individuelles Material:</label>
                    <input 
                      type="text"
                      value={customMaterialText}
                      onChange={(e) => setCustomMaterialText(e.target.value)}
                      placeholder="z.B. Kreide, Tafelbilder, Geodreiecke, Legosteine..."
                      className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

              </div>

              {/* STEP 5: FINAL PLANNING INTERFACE */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
                
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                      <Calendar size={18} />
                    </span>
                    <div>
                      <h3 className="font-extrabold text-slate-800 tracking-tight font-sans text-sm">Schritt 5: Stundenplanung abschließen</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Befülle die gewählte Stunde mit Inhalten</p>
                    </div>
                  </div>

                  {/* Target Slot Indicator */}
                  <div className="px-3 py-1.5 bg-indigo-50 text-indigo-900 border border-indigo-150 rounded-2xl flex items-center gap-2 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                    <span className="text-xs font-black">
                      {DAYS_DE[selectedDayIdx]}, {selectedHour + 1}. Stunde
                    </span>
                  </div>
                </div>

                {/* Interactive Subject Pill Selection */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Fach auswählen</span>
                  
                  <div className="flex flex-wrap gap-1.5">
                    {availableSubjects.map(subjName => {
                      const isActive = activeSubject === subjName;
                      const style = getLessonStyle(subjName);
                      const activeStyle = getLessonActiveStyle(subjName);
                      return (
                        <button
                          key={subjName}
                          onClick={() => setActiveSubject(subjName)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition duration-150 cursor-pointer ${
                            isActive 
                              ? activeStyle 
                              : `${style.bg} ${style.border}`
                          }`}
                        >
                          {subjName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Lesson Topic & AI Suggestion Button */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Unterrichtsthema</label>
                    
                    <div className="flex items-center gap-2">
                      {/* Jahresplan Theme Importer */}
                      {getJahresplanTheme(nextKW) && (
                        <button
                          onClick={() => {
                            setLessonTopic(prev => {
                              const jpTheme = getJahresplanTheme(nextKW);
                              if (!prev.trim()) return jpTheme;
                              if (prev.includes(jpTheme)) return prev;
                              return `${jpTheme} — ${prev}`;
                            });
                            setSuccessMessage('Thema aus Jahresplan übernommen!');
                            setTimeout(() => setSuccessMessage(''), 2000);
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 rounded-xl transition duration-150 cursor-pointer text-xs font-black"
                          title="Füge das geplante Wochenthema des Jahresplans in diese Stunde ein"
                        >
                          <Target size={12} className="text-amber-600" />
                          <span>Aus Jahresplan laden</span>
                        </button>
                      )}

                      {/* Ask Gemini suggestion tool */}
                      <button
                        onClick={handleSuggestAiThemes}
                        disabled={isAiLoading || !activeSubject}
                        className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 rounded-xl transition duration-150 cursor-pointer disabled:opacity-50 text-xs font-black"
                      >
                        {isAiLoading ? (
                          <>
                            <Loader2 size={12} className="animate-spin text-indigo-600" />
                            <span>KI sucht Ideen...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={12} className="text-indigo-500" />
                            <span>KI Themen-Vorschlag</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Render AI Suggestions Box if present */}
                  {aiSuggestions.length > 0 ? (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 bg-indigo-900 text-indigo-100 rounded-2xl border border-indigo-800 space-y-2.5 shadow-md"
                    >
                      <span className="text-[9px] font-black uppercase tracking-widest block text-indigo-300">💡 KI-Vorschläge für "{activeSubject}":</span>
                      <div className="space-y-1.5">
                        {aiSuggestions.map((sug, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setLessonTopic(sug);
                              setAiSuggestions([]);
                            }}
                            className="w-full text-left p-2 bg-slate-950/80 hover:bg-indigo-700 hover:text-white transition rounded-xl text-xs font-bold leading-relaxed border border-indigo-800/60 cursor-pointer"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-end pt-1">
                        <button onClick={() => setAiSuggestions([])} className="text-[10px] font-bold hover:underline text-indigo-300">Schließen</button>
                      </div>
                    </motion.div>
                  ) : null}

                  <textarea
                    value={lessonTopic}
                    onChange={(e) => setLessonTopic(e.target.value)}
                    placeholder="Woran arbeiten die Kinder? z.B.: Einführung der Multiplikation mit anschaulichem Material, Leseübung zu Kapitel 3, Plakatgestaltung..."
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-2xl h-24 font-medium leading-relaxed shadow-inner"
                  />
                </div>

                {/* Homework Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Hausübung / Nachbereitung (Optional)</label>
                  <input 
                    type="text"
                    value={lessonHomework}
                    onChange={(e) => setLessonHomework(e.target.value)}
                    placeholder="z.B.: Buch Seite 14 Nr. 1-4, Arbeitsblatt fertigstellen, Lese-Protokoll..."
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Didactic Preview Line */}
                <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200 text-[11px] text-slate-500 flex items-center justify-between gap-3">
                  <span>
                    Verknüpftes Setting: <strong>{didacticType}</strong> ({socialForm})
                  </span>
                  <span className="text-slate-400 font-bold">
                    {selectedMaterials.length + (customMaterialText ? 1 : 0)} Materialien
                  </span>
                </div>

                {/* Execution Save/Clear Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
                  <button
                    onClick={handleSaveLesson}
                    className="sm:col-span-8 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition shadow-md shadow-indigo-150 active:scale-95 cursor-pointer"
                  >
                    <Save size={16} />
                    Unterrichtsstunde in Wochenplan eintragen
                  </button>

                  <button
                    onClick={handleShiftToParkgarage}
                    disabled={!lessonTopic.trim() && !activeSubject}
                    className="sm:col-span-2 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 font-bold text-xs py-3 px-2 rounded-2xl flex items-center justify-center transition cursor-pointer"
                    title="In die Parkgarage schieben für späteren Zugriff"
                  >
                    Parken
                  </button>

                  <button
                    onClick={handleClearSlot}
                    className="sm:col-span-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs py-3 px-2 rounded-2xl flex items-center justify-center transition cursor-pointer"
                    title="Stundeninhalt komplett zurücksetzen"
                  >
                    Leeren
                  </button>
                </div>

              </div>
              </>
              )}

            </div>
          </div>
          )}
        </main>

        {/* Help & Planning Steps Overlay Modal */}
        <AnimatePresence>
          {showInfoOverlay && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-[2px]"
              onClick={() => setShowInfoOverlay(false)}
            >
              <motion.div 
                initial={{ scale: 0.95, y: 15, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 15, opacity: 0 }}
                transition={{ type: 'spring', duration: 0.4 }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="planning-steps-dialog-title"
                className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 max-w-xl w-full max-h-[calc(100vh-2rem)] flex flex-col gap-4 overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                      <Sliders size={18} />
                    </span>
                    <div>
                      <h3 id="planning-steps-dialog-title" className="font-extrabold text-slate-800 tracking-tight text-sm">Didaktische Planungsschritte</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">Erfolgreicher Planungs-Check</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowInfoOverlay(false)}
                    type="button"
                    aria-label="Planungshinweis schließen"
                    title="Schließen"
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Info Text */}
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Herzlich willkommen im Planungs-Zentrum! Ein didaktisch runder Unterricht baut auf drei essenziellen Schritten auf. Hier siehst du deinen aktuellen Fortschritt für die ausgewählte <strong>KW {nextKW}</strong>:
                </p>

                {/* Checklist Content */}
                <div className="space-y-3.5">
                  {/* Step 1: Jahresplan */}
                  <div className="flex gap-3 items-start p-3.5 rounded-2xl bg-slate-50/50 border border-slate-200/40 hover:bg-slate-50 transition">
                    <span className={`p-1.5 rounded-full shrink-0 mt-0.5 border ${
                      planningStepsChecklist.jahresplan.done 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200/80' 
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}>
                      {planningStepsChecklist.jahresplan.done ? <CheckCircle2 size={16} /> : <Target size={16} />}
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-xs text-slate-800">{planningStepsChecklist.jahresplan.title}</h4>
                        {planningStepsChecklist.jahresplan.done ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded-full font-bold">Erledigt</span>
                        ) : (
                          <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded-full font-bold">Ausstehend</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-normal font-medium">{planningStepsChecklist.jahresplan.description}</p>
                      <p className="text-[10px] text-slate-400 font-bold leading-relaxed italic">{planningStepsChecklist.jahresplan.info}</p>
                    </div>
                  </div>

                  {/* Step 2: Wochenplan */}
                  <div className="flex gap-3 items-start p-3.5 rounded-2xl bg-slate-50/50 border border-slate-200/40 hover:bg-slate-50 transition">
                    <span className={`p-1.5 rounded-full shrink-0 mt-0.5 border ${
                      planningStepsChecklist.wochenplan.done 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200/80' 
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}>
                      {planningStepsChecklist.wochenplan.done ? <CheckCircle2 size={16} /> : <CalendarRange size={16} />}
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-xs text-slate-800">{planningStepsChecklist.wochenplan.title}</h4>
                        {planningStepsChecklist.wochenplan.done ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded-full font-bold">Erledigt</span>
                        ) : (
                          <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded-full font-bold">Ausstehend</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-normal font-medium">{planningStepsChecklist.wochenplan.description}</p>
                      <p className="text-[10px] text-slate-400 font-bold leading-relaxed italic">{planningStepsChecklist.wochenplan.info}</p>
                    </div>
                  </div>

                  {/* Step 3: Material Check */}
                  <div className="flex gap-3 items-start p-3.5 rounded-2xl bg-slate-50/50 border border-slate-200/40 hover:bg-slate-50 transition">
                    <span className={`p-1.5 rounded-full shrink-0 mt-0.5 border ${
                      planningStepsChecklist.materialCheck.done 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200/80' 
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}>
                      {planningStepsChecklist.materialCheck.done ? <CheckCircle2 size={16} /> : <BookOpen size={16} />}
                    </span>
                    <div className="space-y-1.5 w-full">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-xs text-slate-800">{planningStepsChecklist.materialCheck.title}</h4>
                        {planningStepsChecklist.materialCheck.done ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded-full font-bold">Erledigt</span>
                        ) : (
                          <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded-full font-bold">In Arbeit</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-normal font-medium">{planningStepsChecklist.materialCheck.description}</p>
                      
                      {weekStats.total > 0 && (
                        <div className="space-y-1.5 pt-0.5">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-black uppercase tracking-wider">
                            <span>Ausarbeitungs-Grad</span>
                            <span className="text-indigo-650">{planningStepsChecklist.materialCheck.progressPercent}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                            <div 
                              className="bg-indigo-600 h-full rounded-full transition-all duration-300" 
                              style={{ width: `${planningStepsChecklist.materialCheck.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <p className="text-[10px] text-slate-400 font-bold leading-relaxed italic">{planningStepsChecklist.materialCheck.info}</p>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="border-t border-slate-100 pt-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-black uppercase tracking-wider">
                    <Activity size={12} className="text-slate-400 animate-pulse" />
                    <span>Schulwoche {sw || 'N/A'} (KW {nextKW})</span>
                  </div>
                  <button
                    onClick={() => setShowInfoOverlay(false)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition shadow-md hover:shadow-indigo-100 active:scale-95 cursor-pointer"
                  >
                    Verstanden & weiterplanen
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundaryLogger>
  );
}
