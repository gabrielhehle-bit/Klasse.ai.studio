import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { isDiagnosticAlert } from '../lib/diagnosticData';
import { 
  Printer, 
  Users, 
  Calendar, 
  CheckSquare, 
  BookOpen, 
  Award, 
  FileText, 
  Check, 
  Plus, 
  Minus, 
  Trash2, 
  Settings, 
  Search,
  Filter, 
  Eye,
  Download,
  X, 
  Sliders, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Info, 
  RotateCcw, 
  Sparkles,
  Scale,
  Stethoscope,
  GraduationCap,
  MapPin,
  Phone,
  Mail,
  Hash,
  ShieldCheck,
  Heart,
  Banknote,
  Coins,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertCircle,
  Camera
} from 'lucide-react';
import Markdown from 'react-markdown';
import PrintHeader from './PrintHeader';
import { exportSchuelerPDF } from '../lib/exportService';
import { getKW, kwToMonday, getStartYear, kwYear, getSW, isHoliday, sortYearlySubjects, getSchulstartKW, getSemester, getCurrentSchuljahr, formatLocalDateKey } from '../lib/utils';
import { getFachCfg, berechne, getNotenLabel, getAssessmentMode } from '../lib/GradeUtils';
import { DEFAULT_YEARLY_SUBJECTS, FAECHER_ALLE } from '../constants';
import { downloadKlassenbuchPdf } from '../lib/klassenbuchPdf';
import { downloadKlassenbuchDocx } from '../lib/klassenbuchDocx';
import { projectWeeklyPlanToClassbook } from '../lib/weeklyClassbookProjection';
import { buildSchoolYearWeekList } from '../lib/weeklyPlanData';
import { getAttendanceSemester } from '../lib/attendanceData';
import { generateWochenplanTemplate } from '../lib/planerExcelService';
import { SchuelerWochenplanA4Sheet } from './wochenplan/SchuelerWochenplanA4Sheet';
import {
  classifyKlassenbuchEntry,
  getKlassenbuchBaseCategories,
  orderKlassenbuchCategoryKeys,
  splitKlassenbuchCategoryKey,
} from '../lib/klassenbuchSubjects';

const STANDARD_KEL_BEREICHE = [
  { id: 'zuzuhoeren', label: 'Zuhören & Verstehen', kategorie: 'Arbeitsverhalten' },
  { id: 'lesen', label: 'Lesefreude & Technik', kategorie: 'Sachkompetenz' },
  { id: 'rechnen', label: 'Mathematisches Denken', kategorie: 'Sachkompetenz' },
  { id: 'konzentration', label: 'Ausdauer & Fokus', kategorie: 'Arbeitsverhalten' },
  { id: 'regeln', label: 'Regeln & Vereinbarungen', kategorie: 'Sozialkompetenz' },
];

// Types for the configurable lists
interface CustomChecklistCol {
  id: string;
  title: string;
}

const COMPLIMENT_TEMPLATES = [
  {
    id: 'space_champion',
    themeName: 'Space-Champion 🚀',
    accentColor: 'from-indigo-500 to-purple-600',
    borderColor: 'border-indigo-200',
    textColor: 'text-indigo-950',
    emoji: '🚀',
    complimentText: 'Du bist heute wie ein funkelnder Komet! Voller spannender Ideen, Tatkraft und unendlicher Fantasie. Danke für deinen großartigen Pioniergeist!'
  },
  {
    id: 'sunshine',
    themeName: 'Sonnenstrahl ☀️',
    accentColor: 'from-amber-400 to-orange-500',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-950',
    emoji: '☀️',
    complimentText: 'Du bist ein echter Sonnenstrahl für unsere Klasse! Mit deiner freundlichen Worte und deinem ansteckenden Lächeln machst du jeden Schultag viel schöner.'
  },
  {
    id: 'owl_wisdom',
    themeName: 'Schlauer Waldkauz 🦉',
    accentColor: 'from-emerald-500 to-teal-500',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-950',
    emoji: '🦉',
    complimentText: 'Ganz leise, weise und aufmerksam hast du heute mitgedacht. Du bist ein fantastische Zuhörer und bereicherst unsere Klassengemeinschaft ungemein.'
  },
  {
    id: 'lion_heart',
    themeName: 'Mutiges Löwenherz 🦁',
    accentColor: 'from-rose-500 to-red-600',
    borderColor: 'border-rose-200',
    textColor: 'text-rose-950',
    emoji: '🦁',
    complimentText: 'Du hast heute Mut bewiesen, hast dich einer schwierigen Aufgabe gestellt oder einem anderen Kind geholfen, als es darauf ankam. Ein echtes Löwenherz!'
  },
  {
    id: 'lightness',
    themeName: 'Leichtigkeit-Bringer 🎈',
    accentColor: 'from-blue-400 to-indigo-500',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-950',
    emoji: '🎈',
    complimentText: 'Mit deinem Humor, deiner Gelassenheit und deiner fairen Art bringst du Leichtigkeit in unseren Trubel. Es ist einfach genial, dich in der Klasse zu haben!'
  }
];

export default function PrintCenter() {
  const { app, setApp, setPage } = useApp();
  const zoomLevel = app.settings?.zoomLevel || 'standard';
  const students = app?.schueler || [];
  const startYear = getStartYear(app?.schuljahr);
  const schoolYearKws = useMemo(() => {
    const schuljahr = app?.schuljahr || getCurrentSchuljahr();
    const bundesland = app?.bundesland || 'VBG';
    const startKw = getSchulstartKW(schuljahr, bundesland);
    const startMonday = kwToMonday(startKw, startYear);
    const endYear = startYear + 1;
    const weeks: number[] = [];
    const currentMonday = new Date(startMonday);

    while (
      currentMonday.getFullYear() < endYear ||
      (currentMonday.getFullYear() === endYear && currentMonday.getMonth() < 7)
    ) {
      weeks.push(getKW(currentMonday));
      currentMonday.setDate(currentMonday.getDate() + 7);
    }
    return weeks;
  }, [app?.schuljahr, app?.bundesland, startYear]);

  const fallbackPlanningKW = schoolYearKws.includes(app?.currentKW || -1)
    ? (app?.currentKW as number)
    : (schoolYearKws[0] || getKW(new Date()));

  // Iframe check state
  const [isInIframe, setIsInIframe] = useState(false);
  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch (e) {
      setIsInIframe(true);
    }
  }, []);

  // 1. Core Printing State
  const [activeTemplate, setActiveTemplate] = useState<
    'schuelerliste' | 'checkliste' | 'zeugnis_noten' | 'wochenplan' | 'schueler_wochenplan' | 'klassenbuch' | 'jahresplanung' | 'kel' | 'stundenplan' | 'schuelerprofil' | 'kel_presentation' | 'sitzplan' | 'uebergabemappe' | 'eltern_diagnostik' | 'pdf_export' | 'lob_druckkarte' | 'fehlstunden' | 'smart_tools' | 'kassenuebersicht'
  >('schuelerliste');
  
  const [printModeActive, setPrintModeActive] = useState(false);
  const [templateCategory, setTemplateCategory] = useState<'all' | 'listen' | 'planung' | 'eltern' | 'spezial'>('all');
  const [activeTaskCategory, setActiveTaskCategory] = useState<'all' | 'klasse' | 'schueler' | 'leistung' | 'planung' | 'orga'>('all');
  const [templateSearch, setTemplateSearch] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showMoreSettings, setShowMoreSettings] = useState(false);

  const ALL_TEMPLATES = useMemo(() => [
    { id: 'schuelerliste', icon: Users, label: 'Klassenliste', desc: 'Namens- & Stammdatenliste', cat: 'listen', taskCat: 'klasse', badge: 'Klasse', keywords: 'schüler name klasse stammdaten telefon adresse' },
    { id: 'checkliste', icon: CheckSquare, label: 'Notenübersicht', desc: 'Punkteraster & Notenschnitt', cat: 'listen', taskCat: 'leistung', badge: 'Noten', keywords: 'noten punkte checkliste hausübung test kontrolle' },
    { id: 'zeugnis_noten', icon: GraduationCap, label: 'Semester-Notenspiegel', desc: '1. & 2. Semester Übersicht', cat: 'listen', taskCat: 'leistung', badge: 'Semester', keywords: 'noten semester übersicht ganzjahr halbjahr fächer' },
    { id: 'fehlstunden', icon: Clock, label: 'Anwesenheitsliste', desc: 'Entschuldigt / Unentschuldigt', cat: 'listen', taskCat: 'klasse', badge: 'Absenzen', keywords: 'fehlstunden krankenstand absenzen entschuldigt' },

    { id: 'wochenplan', icon: Calendar, label: 'Wochenplan', desc: 'Unterrichts- & Wochenplan', cat: 'planung', taskCat: 'planung', badge: 'Unterricht', keywords: 'wochenplan kalender unterricht aufgaben stunden' },
    { id: 'schueler_wochenplan', icon: CheckSquare, label: 'Wochenplan für Kinder', desc: 'Gespeicherte Aufgabenpläne für Kinder', cat: 'planung', taskCat: 'planung', badge: 'Aufgaben', keywords: 'kinder aufgaben wochenplan drucken pdf' },
    { id: 'stundenplan', icon: ClockIconFallback, label: 'Stundenplan', desc: 'Stammstundenplan der Klasse', cat: 'planung', taskCat: 'planung', badge: 'Stunden', keywords: 'stundenplan stunden zeiten fächer klassenraum' },
    { id: 'klassenbuch', icon: BookOpen, label: 'Klassenbuch', desc: 'Wochen- & Lehrbericht', cat: 'planung', taskCat: 'planung', badge: 'Lehrbericht', keywords: 'klassenbuch bericht woche unterricht ersatz' },
    { id: 'jahresplanung', icon: FileText, label: 'Jahresplan', desc: 'Syllabus & Kompetenzen', cat: 'planung', taskCat: 'planung', badge: 'Syllabus', keywords: 'jahresplan syllabus monate ziele kompetenzen' },

    { id: 'kel', icon: Award, label: 'KEL-Gespräch', desc: 'Entwicklungsdossier & Zieldialog', cat: 'eltern', taskCat: 'schueler', badge: 'Dossier', keywords: 'kel gespräch eltern entwicklung ziele vereinbarung' },
    { id: 'kel_presentation', icon: Sparkles, label: 'KEL-Präsentation', desc: 'Visuelle Bento-Karten', cat: 'eltern', taskCat: 'schueler', badge: 'Bento-Visual', keywords: 'kel bento präsentation visual stärken' },
    { id: 'eltern_diagnostik', icon: Stethoscope, label: 'Elternbericht', desc: 'Förderdiagnostik & Feedback', cat: 'eltern', taskCat: 'schueler', badge: 'Diagnostik', keywords: 'eltern bericht diagnostik förderung test ergebnis' },
    { id: 'schuelerprofil', icon: User, label: 'Schülerdossier', desc: 'Stammdaten, Noten & Profil', cat: 'eltern', taskCat: 'schueler', badge: 'Einzelblatt', keywords: 'schüler profil stammdaten notarzt eltern handy' },
    { id: 'uebergabemappe', icon: FileText, label: 'Übergabemappe', desc: 'Vertretungsinformationen', cat: 'eltern', taskCat: 'klasse', badge: 'Vertretung', keywords: 'übergabe vertretung lehrer tagesplan notfall' },

    { id: 'sitzplan', icon: Scale, label: 'Sitzplan', desc: 'Klassenzimmer-Tischordnung', cat: 'spezial', taskCat: 'klasse', badge: 'Raumplan', keywords: 'sitzplan raum tische tischordnung schüler' },
    { id: 'lob_druckkarte', icon: Award, label: 'Lob-Karten', desc: 'Urkunden & Motivation', cat: 'spezial', taskCat: 'schueler', badge: 'Motivation', keywords: 'lob karte urkunde auszeichnung karten belohnung' },
    { id: 'kassenuebersicht', icon: Banknote, label: 'Kassenübersicht', desc: 'Einnahmen, Ausgaben & Saldo', cat: 'spezial', taskCat: 'orga', badge: 'Kassa', keywords: 'kasse kassenbuch einnahmen ausgaben saldo geld finanzen buchungen klassenkasse orga beiträge sammlung' },
    { id: 'pdf_export', icon: FileText, label: 'PDF-Export', desc: 'Pädagogische Übersichten als PDF', cat: 'spezial', taskCat: 'orga', badge: 'PDF', keywords: 'pdf export förderübersicht raster layout print' },
    { id: 'smart_tools', icon: Sparkles, label: 'Geldsammlung & Orga', desc: 'Tischschilder, Kasse & Joker', cat: 'spezial', taskCat: 'orga', badge: 'Orga & Kasse', keywords: 'spezial tools powerup helfer zufall gruppen geld sammlung' },
  ], []);

  const filteredTemplates = useMemo(() => {
    return ALL_TEMPLATES.filter(t => {
      const matchCat = activeTaskCategory === 'all' || t.taskCat === activeTaskCategory;
      const q = templateSearch.trim().toLowerCase();
      const matchSearch = !q || t.label.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) || t.keywords.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [ALL_TEMPLATES, activeTaskCategory, templateSearch]);

  // 2. Global Styling & Paper Adjustments
  const [printPaperSize, setPrintPaperSize] = useState<'A4'>('A4');
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [printMargin, setPrintMargin] = useState<number>(12); // in mm
  const [printFontSize, setPrintFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  const [printTheme, setPrintTheme] = useState<'monochrome' | 'slate' | 'indigo' | 'emerald'>('monochrome');
  const [showMainHeader, setShowMainHeader] = useState(true);
  const [customHeaderTitle, setCustomHeaderTitle] = useState('');
  const [previewZoom, setPreviewZoom] = useState<number>(0.7);

  // 3. Template-Specific States
  // A. Schülerliste Options
  const [slGenderFilter, setSlGenderFilter] = useState<'all' | 'm' | 'w'>('all');
  const [slSortBy, setSlSortBy] = useState<'nachname' | 'vorname'>('nachname');
  const [slShowBirthday, setSlShowBirthday] = useState(true);
  const [slShowReligion, setSlShowReligion] = useState(false);
  const [slShowLevel, setSlShowLevel] = useState(false);
  const [slShowDaZ, setSlShowDaZ] = useState(false);
  const [slShowGender, setSlShowGender] = useState(false);
  const [slShowNationality, setSlShowNationality] = useState(false);
  const [slShowErstsprache, setSlShowErstsprache] = useState(false);
  const [slShowZweitsprache, setSlShowZweitsprache] = useState(false);
  const [slShowAddress, setSlShowAddress] = useState(false);
  const [slShowPhoneMother, setSlShowPhoneMother] = useState(false);
  const [slShowPhoneFather, setSlShowPhoneFather] = useState(false);
  const [slShowEmailParents, setSlShowEmailParents] = useState(false);
  const [slShowSvNummer, setSlShowSvNummer] = useState(false);
  const [slShowIkmNummer, setSlShowIkmNummer] = useState(false);
  const [slShowBesuchsjahr, setSlShowBesuchsjahr] = useState(false);
  const [slShowGroups, setSlShowGroups] = useState(false);
  const [slShowFehlstunden, setSlShowFehlstunden] = useState(false);
  const [slShowNotes, setSlShowNotes] = useState(false);
  const [slShowAllergies, setSlShowAllergies] = useState(false);
  const [slShowFotoFreigabe, setSlShowFotoFreigabe] = useState(false);
  const [slCustomColsCount, setSlCustomColsCount] = useState<number>(0);
  const [slCustomCols, setSlCustomCols] = useState<string[]>(['Handy', 'Notiz', 'Gruppe']);

  // B. Noten- & Punktecheckliste Options
  const [clSyncMode, setClSyncMode] = useState<'blank' | 'notenmappe'>('blank');
  const [clSelectedSubject, setClSelectedSubject] = useState<string>('Deutsch');
  const [clSelectedSemester, setClSelectedSemester] = useState<'1' | '2'>('1');
  const [clTitle, setClTitle] = useState('Hausübungs- & Schularbeits-Kontrolle');
  const [clCols, setClCols] = useState<CustomChecklistCol[]>([
    { id: '1', title: 'HÜ 1' },
    { id: '2', title: 'HÜ 2' },
    { id: '3', title: 'Test 1' },
    { id: '4', title: 'Mitarbeit' },
    { id: '5', title: 'Unterschrift' },
  ]);
  const [clNewColTitle, setClNewColTitle] = useState('');
  const [clShowAverageRow, setClShowAverageRow] = useState(true);
  const [clShowNumbers, setClShowNumbers] = useState(true);

  // B2. Zeugnis-Notenliste Options
  const [znSemester, setZnSemester] = useState<'1' | '2'>('1');
  const [znSelectedSubjects, setZnSelectedSubjects] = useState<string[]>(() => [...FAECHER_ALLE]);

  // C. Wochenplan Options
  const [wpKW, setWpKW] = useState<number>(fallbackPlanningKW);
  const [wpShowTimes, setWpShowTimes] = useState(true);
  const [wpShowSubjectOnly, setWpShowSubjectOnly] = useState(false);
  const [wpShowReflexion, setWpShowReflexion] = useState(true);
  const [wpInkSaver, setWpInkSaver] = useState(true);
  const [wpShowEmptyNotesBox, setWpShowEmptyNotesBox] = useState(true);

  const [childPlanId, setChildPlanId] = useState('');
  const [childPrintColorMode, setChildPrintColorMode] = useState<'color' | 'mono'>('color');
  const childPlans = Object.values(app?.schuelerWochenplaene || {});
  const selectedChildPlan = childPlans.find(plan => plan.id === childPlanId)
    || childPlans.filter(plan => plan.kw === (app.currentKW || wpKW))
      .sort((a, b) => String(b.aktualisiertAm).localeCompare(String(a.aktualisiertAm)))[0]
    || childPlans[0];

  // D. Klassenbuch Wochenbericht Options
  const [kbKW, setKbKW] = useState<number>(fallbackPlanningKW);
  const [kbMode, setKbMode] = useState<'single' | 'range' | 'all'>('single');
  const [kbStartKW, setKbStartKW] = useState<number>(fallbackPlanningKW);
  const [kbEndKW, setKbEndKW] = useState<number>(fallbackPlanningKW);
  const [kbIncludeAbsentees, setKbIncludeAbsentees] = useState(true);
  const [kbIncludeOccurrences, setKbIncludeOccurrences] = useState(true);
  const [kbCustomNotesValue, setKbCustomNotesValue] = useState('');
  const [kbOnlyFilledWeeks, setKbOnlyFilledWeeks] = useState(false);
  const [kbSignatures, setKbSignatures] = useState<string[]>([
    'Klassenlehrer:in',
    'Schulleitung',
  ]);

  // E. Jahresplanung Options
  const [jpSubjectFilter, setJpSubjectFilter] = useState<string>('all');
  const [jpDisplayMode, setJpDisplayMode] = useState<'list' | 'matrix' | 'bento'>('matrix');
  const [jpGroupByMonth, setJpGroupByMonth] = useState(true);
  const [jpShowHolidays, setJpShowHolidays] = useState(true);
  const [jpShowPins, setJpShowPins] = useState(true);
  const [jpShowProgressBars, setJpShowProgressBars] = useState(true);

  // F. KEL-Gespräche / Dossier Options
  const [kelStudentMode, setKelStudentMode] = useState<'single' | 'all'>('single');
  const [kelSelectedStudentId, setKelSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [kelShowGrades, setKelShowGrades] = useState(true);
  const [kelShowSelfAssessment, setKelShowSelfAssessment] = useState(true);
  const [kelShowPortfolio, setKelShowPortfolio] = useState(true);
  const [kelShowObservations, setKelShowObservations] = useState(true);
  const [kelShowAbsences, setKelShowAbsences] = useState(true);
  const [kelSignatures, setKelSignatures] = useState<string[]>([
    'Unterschrift Kind',
    'Unterschrift Erziehungsberechtigte:r',
    'Unterschrift Klassenlehrer:in',
  ]);

  // G. Stundenplan Options
  const [spShowTimes, setSpShowTimes] = useState(true);
  const [spShowClassRoom, setSpShowClassRoom] = useState(true);
  const [spCompact, setSpCompact] = useState(false);

  // H. Schülerprofil Options
  const [profStudentMode, setProfStudentMode] = useState<'single' | 'all'>('single');
  const [profSelectedStudentId, setProfSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [profShowStammdaten, setProfShowStammdaten] = useState(true);
  const [profShowContacts, setProfShowContacts] = useState(false);
  const [profShowLeistungen, setProfShowLeistungen] = useState(true);
  const [profShowFoerderprofil, setProfShowFoerderprofil] = useState(true);
  const [profShowDiagnostik, setProfShowDiagnostik] = useState(true);
  const [profShowKELReflexion, setProfShowKELReflexion] = useState(true);
  const [profShowFinanzen, setProfShowFinanzen] = useState(false);
  const [profShowMikaD, setProfShowMikaD] = useState(true);
  const [profShowVerhalten, setProfShowVerhalten] = useState(true);
  const [profShowKIPortfolio, setProfShowKIPortfolio] = useState(false);
  const [dossierPreviewOpen, setDossierPreviewOpen] = useState(false);
  const [dossierZoom, setDossierZoom] = useState(0.65);

  // XY. Elternbericht Options
  const [diagStudentMode, setDiagStudentMode] = useState<'single' | 'all'>('single');
  const [diagSelectedStudentId, setDiagSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [diagShowComments, setDiagShowComments] = useState(true);
  const [diagShowCharts, setDiagShowCharts] = useState(true);

  // I. KEL_Presentation Options
  const [kpStudentMode, setKpStudentMode] = useState<'single' | 'all'>('single');
  const [kpSelectedStudentId, setKpSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [kpShowRadarChart, setKpShowRadarChart] = useState(true);
  const [kpShowSelfAssessment, setKpShowSelfAssessment] = useState(true);

  // J. Sitzplan Options
  const [spShowChairsOnly, setSpShowChairsOnly] = useState(false);
  const [spShowStudentNotes, setSpShowStudentNotes] = useState(false);
  const [spShowStudentDaZ, setSpShowStudentDaZ] = useState(false);
  const [spBoardPosition, setSpBoardPosition] = useState<'top' | 'bottom' | 'left' | 'right' | 'none'>('top');

  // K. Übergabemappe Options
  const [umShowCoverPage, setUmShowCoverPage] = useState(true);
  const [umShowTagesplaene, setUmShowTagesplaene] = useState(true);
  const [umShowKlassenliste, setUmShowKlassenliste] = useState(true);
  const [umShowSitzplan, setUmShowSitzplan] = useState(true);
  const [umShowFeedback, setUmShowFeedback] = useState(true);
  const [umSchulleitung, setUmSchulleitung] = useState('');
  const [umSekretariat, setUmSekretariat] = useState('');
  const [umNachbarKlasse, setUmNachbarKlasse] = useState('');
  const [umVertretungsZeitraum, setUmVertretungsZeitraum] = useState('');
  const [umKrankheitNotes, setUmKrankheitNotes] = useState('');

  // Z. Pädagogischer PDF Export – ausdrücklich kein amtlicher Bescheid
  const [pdfFormType, setPdfFormType] = useState<'foerder_uebersicht'>('foerder_uebersicht');
  const [pdfStudentId, setPdfStudentId] = useState<string>(students[0]?.id || '');

  // M. Lob-Druckkarte Options
  const [lobStudentMode, setLobStudentMode] = useState<'single' | 'all'>('single');
  const [lobSelectedStudentId, setLobSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [lobSelectedTemplate, setLobSelectedTemplate] = useState<string>('gold');
  const [lobCustomText, setLobCustomText] = useState('');
  const [lobSender, setLobSender] = useState('Die Klassenlehrkraft');
  const [bypassOrientationAutoSet, setBypassOrientationAutoSet] = useState(false);

  // --- STATE FOR 10 SPECIAL SMART TOOLS ---
  const [activeSmartTool, setActiveSmartTool] = useState<
    'queue' | 'tischschilder' | 'urkunden' | 'pocket' | 'labels' | 'ids' | 'joker' | 'birthday' | 'jobs' | 'meeting'
  >('tischschilder');
  
  // 1. Desk Nameplates
  const [stTischStyle, setStTischStyle] = useState<'dino' | 'space' | 'ocean' | 'minimal'>('dino');
  const [stTischShowHelper, setStTischShowHelper] = useState(true);
  const [stTischStudentId, setStTischStudentId] = useState<string>('all'); // 'all' or specific student
  
  // 2. Student Diplomas
  const [stUrkundeType, setStUrkundeType] = useState<'rechnen' | 'lesen' | 'helfer' | 'sport' | 'custom'>('rechnen');
  const [stUrkundeTitle, setStUrkundeTitle] = useState('Urkunde: Rechen-Meister/in 🧮');
  const [stUrkundeText, setStUrkundeText] = useState('für herausragende Leistungen beim Rechnen im Zahlenraum 100 und die erfolgreiche Bewältigung aller Mathe-Quests!');
  const [stUrkundeDate, setStUrkundeDate] = useState(() => new Date().toLocaleDateString('de-AT'));
  const [stUrkundeStudentId, setStUrkundeStudentId] = useState<string>('all');
  
  // 3. Labels
  const [stLabels, setStLabels] = useState<string[]>([
    '📚 Bücher-Ecke', '🎲 Spiele-Kiste', '🧸 Klassentier', '🗑️ Papierkorb', '🧥 Fundbüro', '✏️ Malstifte', '✂️ Bastel-Ecke', '📐 Mathe-Box'
  ]);
  const [stNewLabelText, setStNewLabelText] = useState('');
  
  // 4. Mini Student IDs
  const [stSchoolName, setStSchoolName] = useState(app?.schulName || '');
  
  // 5. Homework Joker
  const [stJokerType, setStJokerType] = useState<'homework' | 'reading' | 'custom'>('homework');
  const [stJokerTitle, setStJokerTitle] = useState('Hausübungs-Joker 🌟');
  const [stJokerText, setStJokerText] = useState('Gilt einmalig für eine vergessene Hausübung. Du bist spitze!');
  
  // 6. Classroom Jobs Board
  const [stJobs, setStJobs] = useState<Record<string, string>>({
    'Tafel-Dienst 🧹': '',
    'Blumen-Dienst 🌻': '',
    'Ordnungs-Dienst 📦': '',
    'Kakao-Dienst 🥛': '',
    'Ruhe-Wächter 🤫': '',
    'Lüftungs-Chef 🍃': ''
  });
  
  // 7. Parents Meeting Slips
  const [stMeetingDate, setStMeetingDate] = useState(() => new Date().toLocaleDateString('de-AT'));
  const [stMeetingRoom, setStMeetingRoom] = useState('');
  const [stMeetingTimes, setStMeetingTimes] = useState<Record<string, string>>({});
  const [stMeetingDocs, setStMeetingDocs] = useState('');

  // --- KASSENÜBERSICHT (EINNAHMEN & AUSGABEN) OPTIONS ---
  const [koPeriodMode, setKoPeriodMode] = useState<'schuljahr' | 'monat' | 'custom'>('schuljahr');
  const [koSelectedMonth, setKoSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${m}`;
  });
  const [koCustomStartDate, setKoCustomStartDate] = useState<string>(() => {
    const startYr = getStartYear(app?.schuljahr || '');
    return `${startYr}-09-01`;
  });
  const [koCustomEndDate, setKoCustomEndDate] = useState<string>(() => {
    return formatLocalDateKey(new Date());
  });
  const [koCategoryFilter, setKoCategoryFilter] = useState<'all' | 'sammlung' | 'ausgabe' | 'sonstiges'>('all');
  const [koShowSignatures, setKoShowSignatures] = useState<boolean>(true);
  const [koShowKpiBanner, setKoShowKpiBanner] = useState<boolean>(true);

  const schoolYearMonths = useMemo(() => {
    const startYr = getStartYear(app?.schuljahr || '');
    return [
      { value: `${startYr}-09`, label: `September ${startYr}` },
      { value: `${startYr}-10`, label: `Oktober ${startYr}` },
      { value: `${startYr}-11`, label: `November ${startYr}` },
      { value: `${startYr}-12`, label: `Dezember ${startYr}` },
      { value: `${startYr + 1}-01`, label: `Jänner ${startYr + 1}` },
      { value: `${startYr + 1}-02`, label: `Februar ${startYr + 1}` },
      { value: `${startYr + 1}-03`, label: `März ${startYr + 1}` },
      { value: `${startYr + 1}-04`, label: `April ${startYr + 1}` },
      { value: `${startYr + 1}-05`, label: `Mai ${startYr + 1}` },
      { value: `${startYr + 1}-06`, label: `Juni ${startYr + 1}` },
      { value: `${startYr + 1}-07`, label: `Juli ${startYr + 1}` },
      { value: `${startYr + 1}-08`, label: `August ${startYr + 1}` },
    ];
  }, [app?.schuljahr]);

  const koDateRange = useMemo(() => {
    const startYear = getStartYear(app?.schuljahr || '');
    const endYear = startYear + 1;

    if (koPeriodMode === 'schuljahr') {
      const s = `${startYear}-09-01`;
      const e = `${endYear}-08-31`;
      const label = `Schuljahr ${app?.schuljahr || `${startYear}/${String(endYear).slice(2)}`}`;
      return { startDateStr: s, endDateStr: e, periodLabel: label };
    }

    if (koPeriodMode === 'monat') {
      const [yStr, mStr] = (koSelectedMonth || `${startYear}-09`).split('-');
      const y = parseInt(yStr, 10) || startYear;
      const m = parseInt(mStr, 10) || 9;
      const monthNames = [
        'Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
      ];
      const monthName = monthNames[m - 1] || 'Monat';
      const s = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const e = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const label = `${monthName} ${y}`;
      return { startDateStr: s, endDateStr: e, periodLabel: label };
    }

    // custom
    const s = koCustomStartDate || `${startYear}-09-01`;
    const e = koCustomEndDate || formatLocalDateKey(new Date());
    const sFormatted = new Date(s).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const eFormatted = new Date(e).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const label = `${sFormatted} – ${eFormatted}`;
    return { startDateStr: s, endDateStr: e, periodLabel: label };
  }, [koPeriodMode, koSelectedMonth, koCustomStartDate, koCustomEndDate, app?.schuljahr]);

  const koReportData = useMemo(() => {
    const allTx = [...(app?.klassenkasse?.transaktionen || [])];

    // Sort chronologically ascending
    allTx.sort((a, b) => {
      const dateA = (a.datum || '').split('T')[0];
      const dateB = (b.datum || '').split('T')[0];
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.titel || '').localeCompare(b.titel || '');
    });

    // Opening balance before start date
    let openingBal = 0;
    allTx.forEach(tx => {
      const d = (tx.datum || '').split('T')[0];
      if (d < koDateRange.startDateStr) {
        if (tx.typ === 'plus') {
          openingBal += Number(tx.betrag) || 0;
        } else {
          openingBal -= Number(tx.betrag) || 0;
        }
      }
    });

    // Filter transactions within period
    let currentRunning = openingBal;
    let totIncome = 0;
    let totExpense = 0;

    const inPeriodTx = allTx.filter(tx => {
      const d = (tx.datum || '').split('T')[0];
      const inDateRange = d >= koDateRange.startDateStr && d <= koDateRange.endDateStr;
      const matchesCat = koCategoryFilter === 'all' ||
        (koCategoryFilter === 'sammlung' && (tx.kategorie === 'sammlung' || !!tx.geldsammlungId)) ||
        (koCategoryFilter === 'ausgabe' && tx.kategorie === 'ausgabe') ||
        (koCategoryFilter === 'sonstiges' && (tx.kategorie === 'sonstiges' || (!tx.geldsammlungId && tx.kategorie !== 'ausgabe' && tx.kategorie !== 'sammlung')));
      return inDateRange && matchesCat;
    });

    const rows = inPeriodTx.map(tx => {
      const isPlus = tx.typ === 'plus';
      const amount = Number(tx.betrag) || 0;
      if (isPlus) {
        currentRunning += amount;
        totIncome += amount;
      } else {
        currentRunning -= amount;
        totExpense += amount;
      }
      return {
        ...tx,
        isPlus,
        einnahme: isPlus ? amount : null,
        ausgabe: !isPlus ? amount : null,
        saldo: currentRunning
      };
    });

    return {
      rows,
      openingBalance: openingBal,
      totalIncome: totIncome,
      totalExpense: totExpense,
      closingBalance: currentRunning,
      periodBalance: totIncome - totExpense,
      hasRows: rows.length > 0,
      totalCount: rows.length
    };
  }, [app?.klassenkasse?.transaktionen, koDateRange, koCategoryFilter]);
  useEffect(() => {
    if (app?.activePrintTemplate) {
      setActiveTemplate(app.activePrintTemplate as any);

      setApp(prev => ({ ...prev, activePrintTemplate: undefined }));
    }

    if (app?.activePrintStudentId) {
      const belongsToActiveClass = students.some((student) => student.id === app.activePrintStudentId);
      if (belongsToActiveClass) {
        setKelSelectedStudentId(app.activePrintStudentId);
        setProfSelectedStudentId(app.activePrintStudentId);
        setDiagSelectedStudentId(app.activePrintStudentId);
        setKpSelectedStudentId(app.activePrintStudentId);
        setPdfStudentId(app.activePrintStudentId);
        setLobSelectedStudentId(app.activePrintStudentId);
      }

      setApp(prev => ({ ...prev, activePrintStudentId: undefined }));
    }
  }, [app?.activePrintTemplate, app?.activePrintStudentId, students, setApp]);

  useEffect(() => {
    const firstStudentId = students[0]?.id || '';
    setKelSelectedStudentId(firstStudentId);
    setProfSelectedStudentId(firstStudentId);
    setDiagSelectedStudentId(firstStudentId);
    setKpSelectedStudentId(firstStudentId);
    setPdfStudentId(firstStudentId);
    setLobSelectedStudentId(firstStudentId);
    setStTischStudentId('all');
    setStUrkundeStudentId('all');
    setDossierPreviewOpen(false);
  }, [app?.activeClassId]);

  const applyPreset = (preset: 'klassisch' | 'raster' | 'ausflug' | 'kel') => {
    setBypassOrientationAutoSet(true);
    if (preset === 'klassisch') {
      setActiveTemplate('schuelerliste');
      setPrintOrientation('portrait');
      setSlCustomColsCount(0);
      setPrintFontSize('base');
      setPrintTheme('monochrome');
    } else if (preset === 'raster') {
      setActiveTemplate('checkliste');
      setPrintOrientation('landscape');
      setClTitle('Noten- & Punkteraster');
      setClCols([
        { id: '1', title: 'SA / Test' },
        { id: '2', title: 'Mitarbeit' },
        { id: '3', title: 'HÜ' },
        { id: '4', title: 'Mappe' },
        { id: '5', title: 'Note' }
      ]);
      setPrintFontSize('sm');
      setPrintTheme('indigo');
    } else if (preset === 'ausflug') {
      setActiveTemplate('checkliste');
      setPrintOrientation('portrait');
      setClTitle('Ausflugs- & Wandertag-Checkliste');
      setClCols([
        { id: '1', title: 'Bezahlt (€)' },
        { id: '2', title: 'Unterschrift' },
        { id: '3', title: 'Anwesend' },
        { id: '4', title: 'Handy Eltern' }
      ]);
      setPrintFontSize('base');
      setPrintTheme('emerald');
    } else if (preset === 'kel') {
      setActiveTemplate('kel');
      setPrintOrientation('portrait');
      setPrintFontSize('base');
      setPrintTheme('slate');
    }
  };

  // Automatically update orientation default based on selected template
  useEffect(() => {
    if (activeTemplate === 'schueler_wochenplan') {
      setPrintOrientation(selectedChildPlan?.orientierung === 'landscape' ? 'landscape' : 'portrait');
      return;
    }
    if (activeTemplate === 'klassenbuch') {
      setPrintOrientation('portrait');
      setPrintMargin(8.5);
      setPrintFontSize('base');
      return;
    }
    if (bypassOrientationAutoSet) {
      setBypassOrientationAutoSet(false);
      return;
    }
    if (
      activeTemplate === 'wochenplan' ||
      activeTemplate === 'stundenplan' ||
      activeTemplate === 'checkliste' ||
      activeTemplate === 'sitzplan' ||
      activeTemplate === 'kel_presentation' ||
      activeTemplate === 'jahresplanung' ||
      activeTemplate === 'zeugnis_noten' ||
      activeTemplate === 'fehlstunden'
    ) {
      setPrintOrientation('landscape');
    } else {
      setPrintOrientation('portrait');
    }
  }, [activeTemplate, bypassOrientationAutoSet, selectedChildPlan?.orientierung]);

  // Automatically adjust zoom when orientation changes, ensuring standard default fits nicely
  useEffect(() => {
    if (printOrientation === 'landscape') {
      setPreviewZoom(0.55);
    } else {
      setPreviewZoom(0.7);
    }
  }, [printOrientation]);

  // Apply printing class to body to manage visibility correctly
  useEffect(() => {
    if (printModeActive) {
      document.body.classList.add('print-center-active');
      (window as any).__printTitle = customHeaderTitle || undefined;
    } else {
      document.body.classList.remove('print-center-active');
      (window as any).__printTitle = undefined;
    }
    return () => {
      document.body.classList.remove('print-center-active');
      (window as any).__printTitle = undefined;
    };
  }, [printModeActive, customHeaderTitle]);

  // Trigger main print dialogue
  const handleTriggerPrint = () => {
    setPrintModeActive(true);
    setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.warn("Print dialogue was blocked or failed:", err);
      }
      // Wait a bit, then return to normal mode
      setTimeout(() => {
        setPrintModeActive(false);
      }, 500);
    }, 150);
  };

  // 4. Data Processing helpers
  // A. Process Students list
  const processedStudentsList = useMemo(() => {
    let list = [...students];
    if (slGenderFilter !== 'all') {
      list = list.filter(s => s.geschlecht?.toLowerCase() === slGenderFilter);
    }
    list.sort((a, b) => {
      if (slSortBy === 'nachname') {
        const lnCompare = (a.nachname || '').localeCompare(b.nachname || '', 'de');
        if (lnCompare !== 0) return lnCompare;
        return (a.vorname || '').localeCompare(b.vorname || '', 'de');
      } else {
        const fnCompare = (a.vorname || '').localeCompare(b.vorname || '', 'de');
        if (fnCompare !== 0) return fnCompare;
        return (a.nachname || '').localeCompare(b.nachname || '', 'de');
      }
    });
    return list;
  }, [students, slGenderFilter, slSortBy]);

  // B. Weekly Calendar helpers
  const kwToDates = (kw: number) => {
    try {
      const isoYear = kwYear(kw, startYear, app?.bundesland || 'VBG');
      const mon = kwToMonday(kw, isoYear);
      const fri = new Date(mon);
      fri.setDate(mon.getDate() + 4);
      const sw = getSW(mon, app?.schuljahr || getCurrentSchuljahr(), app?.bundesland || 'VBG');
      return { monday: mon, friday: fri, sw };
    } catch {
      return { monday: new Date(), friday: new Date(), sw: 1 };
    }
  };

  const selectedWpDates = useMemo(() => kwToDates(wpKW), [wpKW, startYear, app?.schuljahr]);
  const selectedKbDates = useMemo(() => kwToDates(kbKW), [kbKW, startYear, app?.schuljahr]);

  // C. Klassenbuch Weekly Lesson Plan Processor
  // Verwendet exakt dieselbe Fächer-/Unterbereichs-Struktur wie die Wochenplanung.
  const compileKlassenbuchData = (targetKW: number) => projectWeeklyPlanToClassbook(
    (app?.wochenplanung || {})[targetKW],
    { activeSubjects: app?.faecher, stammplan: app?.stammplan, includeReflection: true,
      includeEvents: kbIncludeOccurrences,
      materialTitlesById: Object.fromEntries((app?.materialien || []).map(material => [material.id, material.titel])) },
  );

  const compiledKbData = useMemo(() => compileKlassenbuchData(kbKW), [kbKW, app?.wochenplanung, app?.stammplan, app?.faecher, app?.materialien, kbIncludeOccurrences]);

  // D. Absent Students helper
  const getAbsenteesForWeek = (targetKW: number) => {
    const list: { name: string; info: string }[] = [];
    try {
      const mon = kwToDates(targetKW).monday;
      const datesOfPrevWeek = Array.from({ length: 5 }).map((_, i) => {
        const d = new Date(mon);
        d.setDate(mon.getDate() + i);
        return formatLocalDateKey(d);
      });

      const stMap: Record<string, { daysLost: string[]; reasons: string[] }> = {};

      datesOfPrevWeek.forEach(dStr => {
        const dayNameShort = new Date(dStr).toLocaleDateString('de-DE', { weekday: 'short' });

        students.forEach(s => {
          const studentData = app?.anwesenheit?.[s.id] || {};
          const dayRecord = studentData[dStr];
          if (!dayRecord) return;

          const lessonStatuses = Object.values(dayRecord);
          const isExcused = lessonStatuses.some(v => v === 'e');
          const isUnexcused = lessonStatuses.some(v => v === 'u' || v === 'f');

          if (isExcused || isUnexcused) {
            if (!stMap[s.id]) {
              stMap[s.id] = { daysLost: [], reasons: [] };
            }
            stMap[s.id].daysLost.push(dayNameShort);
            
            const detailRecord = app?.anwesenheitDetail?.[s.id]?.[dStr];
            const customReason = detailRecord?.notiz;
            if (customReason) {
              stMap[s.id].reasons.push(customReason);
            } else if (isExcused) {
              stMap[s.id].reasons.push('Entschuldigt');
            } else {
              stMap[s.id].reasons.push('Unentschuldigt');
            }
          }
        });
      });

      Object.keys(stMap).forEach(sId => {
        const s = students.find(child => child.id === sId);
        if (s) {
          const daysStr = stMap[sId].daysLost.join(', ');
          const uniqueReasons = Array.from(new Set(stMap[sId].reasons)).join(' / ');
          list.push({
            name: `${s.nachname} ${s.vorname}`,
            info: `${daysStr} (${uniqueReasons})`
          });
        }
      });
    } catch (e) {
      console.warn(e);
    }
    return list;
  };

  const getStudentFehlstunden = (studentId: string) => {
    const attendanceData = app?.anwesenheit?.[studentId] || {};
    let excused = 0;
    let unexcused = 0;
    Object.values(attendanceData).forEach((dayData: any) => {
      if (!dayData) return;
      const statuses = typeof dayData === 'object' ? Object.values(dayData) : [dayData];
      statuses.forEach(status => {
        if (!status) return;
        const sStr = String(status).toLowerCase();
        if (sStr === 'e') excused++;
        else if (sStr === 'u' || sStr === 'f') unexcused++;
      });
    });
    return { excused, unexcused, total: excused + unexcused };
  };

  const kbAbsenteesList = useMemo(() => getAbsenteesForWeek(kbKW), [kbKW, app?.anwesenheit, app?.anwesenheitDetail, students, startYear]);

  // E. Leistungsübersicht: immer mit der tatsächlich konfigurierten Beurteilungsart.
  const getStudentGradesSummary = (sId: string) => {
    const subjectRecords = app?.noten?.[sId] || {};
    const subjects = Array.from(new Set([
      ...(app?.faecher || []),
      ...Object.keys(subjectRecords),
    ]));

    return subjects.map((subject) => {
      const mode = getAssessmentMode(app, subject);
      const semesterValues = (['1', '2'] as const).map((semester) => {
        const semesterData: any = subjectRecords?.[subject]?.[semester];
        const explicitEndnote = semesterData?.endnote;
        if (explicitEndnote !== undefined && explicitEndnote !== null && String(explicitEndnote).trim() !== '') {
          return { semester, text: `Endnote ${String(explicitEndnote).trim()}`, numeric: mode === 'grades' ? Number(explicitEndnote) : null };
        }

        const calculated = berechne(app, sId, subject, semester);
        if (calculated === null) return { semester, text: '—', numeric: null };
        const text = mode === 'grades'
          ? `Berechneter Stand ${Number(calculated).toFixed(1)}`
          : `Berechneter Stand ${Math.round(Number(calculated))}%`;
        return { semester, text, numeric: mode === 'grades' ? Number(calculated) : null };
      });

      const latest = [...semesterValues].reverse().find((entry) => entry.text !== '—') || null;
      return {
        subject,
        mode,
        semester1: semesterValues[0].text,
        semester2: semesterValues[1].text,
        currentDisplay: latest?.text || '—',
        average: latest?.numeric ?? null,
      };
    }).filter((row) => row.semester1 !== '—' || row.semester2 !== '—');
  };

  // Get active KEL data for a student
  const getKelDataForStudent = (sId: string) => {
    return [...(app?.kelGespraeche || [])]
      .filter((entry: any) => entry.schuelerId === sId)
      .sort((a: any, b: any) => String(b.datum || '').localeCompare(String(a.datum || '')))[0];
  };

  // Theme styling definitions for high fidelity print/screen consistency
  const getThemeVars = () => {
    switch (printTheme) {
      case 'slate':
        return {
          primaryText: 'text-slate-900',
          accentText: 'text-slate-700',
          primaryBg: 'bg-slate-50',
          borderColor: 'border-slate-800',
          borderAccentColor: 'border-slate-400',
          accentRow: 'even:bg-slate-50/60',
          borderClassName: 'border-slate-300'
        };
      case 'indigo':
        return {
          primaryText: 'text-indigo-950',
          accentText: 'text-indigo-700',
          primaryBg: 'bg-indigo-50/50',
          borderColor: 'border-indigo-900',
          borderAccentColor: 'border-indigo-400',
          accentRow: 'even:bg-indigo-50/20',
          borderClassName: 'border-indigo-200'
        };
      case 'emerald':
        return {
          primaryText: 'text-emerald-950',
          accentText: 'text-emerald-700',
          primaryBg: 'bg-emerald-50/50',
          borderColor: 'border-emerald-900',
          borderAccentColor: 'border-emerald-400',
          accentRow: 'even:bg-emerald-50/20',
          borderClassName: 'border-emerald-200'
        };
      case 'monochrome':
      default:
        return {
          primaryText: 'text-black',
          accentText: 'text-zinc-800',
          primaryBg: 'bg-zinc-50',
          borderColor: 'border-black',
          borderAccentColor: 'border-zinc-500',
          accentRow: 'even:bg-zinc-50',
          borderClassName: 'border-zinc-400'
        };
    }
  };

  const activeThemeVars = getThemeVars();

  const getFontSizeClass = () => {
    switch (printFontSize) {
      case 'sm': return 'text-[0.625rem] leading-snug';
      case 'lg': return 'text-[0.8125rem] leading-relaxed';
      case 'xl': return 'text-[0.9375rem] leading-loose';
      case 'base':
      default:
        return 'text-[0.6875rem] leading-normal';
    }
  };

  // Custom checklist list actions
  const handleDeleteClCol = (id: string) => {
    setClCols(prev => prev.filter(c => c.id !== id));
  };

  const handleAddClCol = () => {
    if (!clNewColTitle.trim()) return;
    setClCols(prev => [...prev, {
      id: Math.random().toString(),
      title: clNewColTitle.trim()
    }]);
    setClNewColTitle('');
  };

  const isMultiPageTemplate = 
    activeTemplate === 'uebergabemappe' ||
    (activeTemplate === 'klassenbuch' && kbMode !== 'single') ||
    (activeTemplate === 'kel' && kelStudentMode === 'all') ||
    (activeTemplate === 'eltern_diagnostik' && diagStudentMode === 'all') ||
    (activeTemplate === 'schuelerprofil' && profStudentMode === 'all') ||
    (activeTemplate === 'kel_presentation' && kpStudentMode === 'all');

  return (
    <>
      {/* 5. Injected Dynamic Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body.print-center-active {
            background: #ffffff !important;
            color: #000000 !important;
          }
          body.print-center-active header,
          body.print-center-active nav,
          body.print-center-active .no-print,
          body.print-center-active .sidebar-class {
            display: none !important;
          }
          body.print-center-active .print-center-overlay {
            display: block !important;
            position: relative !important;
            width: 100% !important;
            background: #ffffff !important;
            z-index: 9999999 !important;
            overflow: visible !important;
          }
          body.print-center-active .print-center-overlay div,
          body.print-center-active .print-center-overlay table,
          body.print-center-active .overflow-x-auto {
            overflow: visible !important;
            height: auto !important;
          }
          @page {
            size: ${activeTemplate === 'klassenbuch' ? 'A4 portrait' : `${printOrientation === 'landscape' ? 'landscape' : 'portrait'} ${printPaperSize}`};
            margin: 0;
          }
          body.print-center-active .klassenbuch-a4-page {
            width: 210mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            padding: 8.5mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid-page !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .page-break {
            page-break-after: always !important;
            break-after: page !important;
          }
          .page-break:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }

        /* Interactive Dossier-Vorschau screen-only overrides */
        .interactive-dossier-preview .page-break {
          background-color: #ffffff !important;
          color: #000000 !important;
          width: 210mm !important;
          height: 297mm !important;
          padding: 20mm !important;
          margin: 0 auto 24px auto !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          position: relative !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
        }
        
        .interactive-dossier-preview {
          counter-reset: dpage;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Force black font color for maximum contrast and legibility */
        .single-sheet-preview,
        .single-sheet-preview *,
        .interactive-dossier-preview,
        .interactive-dossier-preview *,
        .print-center-overlay,
        .print-center-overlay * {
          --tw-text-opacity: 1 !important;
        }

        /* Target all common text containers to force black, excluding white badge text */
        .single-sheet-preview p,
        .single-sheet-preview span:not(.text-white):not([class*="text-white"]),
        .single-sheet-preview h1,
        .single-sheet-preview h2,
        .single-sheet-preview h3,
        .single-sheet-preview h4,
        .single-sheet-preview h5,
        .single-sheet-preview h6,
        .single-sheet-preview td,
        .single-sheet-preview th:not(.text-white):not([class*="text-white"]),
        .single-sheet-preview li,
        .interactive-dossier-preview p,
        .interactive-dossier-preview span:not(.text-white):not([class*="text-white"]),
        .interactive-dossier-preview h1,
        .interactive-dossier-preview h2,
        .interactive-dossier-preview h3,
        .interactive-dossier-preview h4,
        .interactive-dossier-preview h5,
        .interactive-dossier-preview h6,
        .interactive-dossier-preview td,
        .interactive-dossier-preview th:not(.text-white):not([class*="text-white"]),
        .interactive-dossier-preview li,
        .print-center-overlay p,
        .print-center-overlay span:not(.text-white):not([class*="text-white"]),
        .print-center-overlay h1,
        .print-center-overlay h2,
        .print-center-overlay h3,
        .print-center-overlay h4,
        .print-center-overlay h5,
        .print-center-overlay h6,
        .print-center-overlay td,
        .print-center-overlay th:not(.text-white):not([class*="text-white"]),
        .print-center-overlay li {
          color: #000000 !important;
        }

        /* Force slate/zinc/gray utility text classes to be solid black */
        .single-sheet-preview [class*="text-slate-"],
        .single-sheet-preview [class*="text-zinc-"],
        .single-sheet-preview [class*="text-gray-"],
        .single-sheet-preview [class*="text-neutral-"],
        .interactive-dossier-preview [class*="text-slate-"],
        .interactive-dossier-preview [class*="text-zinc-"],
        .interactive-dossier-preview [class*="text-gray-"],
        .interactive-dossier-preview [class*="text-neutral-"],
        .print-center-overlay [class*="text-slate-"],
        .print-center-overlay [class*="text-zinc-"],
        .print-center-overlay [class*="text-gray-"],
        .print-center-overlay [class*="text-neutral-"] {
          color: #000000 !important;
        }

        /* Make all document borders (tables, lines, dividers) clearly visible and dark enough */
        .single-sheet-preview .border,
        .single-sheet-preview table,
        .single-sheet-preview tr,
        .single-sheet-preview td,
        .single-sheet-preview th,
        .single-sheet-preview hr,
        .single-sheet-preview [class*="border-"],
        .interactive-dossier-preview .border,
        .interactive-dossier-preview table,
        .interactive-dossier-preview tr,
        .interactive-dossier-preview td,
        .interactive-dossier-preview th,
        .interactive-dossier-preview hr,
        .interactive-dossier-preview [class*="border-"],
        .print-center-overlay .border,
        .print-center-overlay table,
        .print-center-overlay tr,
        .print-center-overlay td,
        .print-center-overlay th,
        .print-center-overlay hr,
        .print-center-overlay [class*="border-"] {
          border-color: #475569 !important; /* slate-600 */
        }

        .interactive-dossier-preview.landscape .page-break {
          width: 297mm !important;
          height: 210mm !important;
        }
        
        .interactive-dossier-preview .page-break {
          counter-increment: dpage;
        }
        
        .interactive-dossier-preview .page-break::after {
          content: "Seite " counter(dpage);
          position: absolute;
          bottom: 12mm;
          right: 20mm;
          font-size: 8pt;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .interactive-dossier-preview .avoid-break.pt-8.mt-4 {
          background-color: #ffffff !important;
          padding: 12mm 20mm !important;
          margin: 0 auto 24px auto !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          width: 210mm !important;
          box-sizing: border-box !important;
        }

        /* Zoom scaling rules for PrintCenter (Screen only) */
        [data-zoom-container="compact"] {
          font-size: 0.8125rem !important;
        }
        [data-zoom-container="compact"] h2 {
          font-size: 1.125rem !important;
        }
        [data-zoom-container="compact"] h3 {
          font-size: 0.875rem !important;
        }
        [data-zoom-container="compact"] h4 {
          font-size: 0.8125rem !important;
        }
        [data-zoom-container="compact"] button:not(.no-zoom-scaling),
        [data-zoom-container="compact"] select,
        [data-zoom-container="compact"] input:not([type="checkbox"]):not([type="range"]),
        [data-zoom-container="compact"] textarea {
          font-size: 0.75rem !important;
          padding-top: 0.375rem !important;
          padding-bottom: 0.375rem !important;
          padding-left: 0.625rem !important;
          padding-right: 0.625rem !important;
        }
        [data-zoom-container="compact"] .p-6 {
          padding: 0.875rem !important;
        }
        [data-zoom-container="compact"] .p-5 {
          padding: 0.75rem !important;
        }
        [data-zoom-container="compact"] .p-4 {
          padding: 0.625rem !important;
        }
        [data-zoom-container="compact"] .gap-6 {
          gap: 0.875rem !important;
        }
        [data-zoom-container="compact"] .gap-4 {
          gap: 0.625rem !important;
        }
        [data-zoom-container="compact"] .w-14,
        [data-zoom-container="compact"] .h-14 {
          width: 2.5rem !important;
          height: 2.5rem !important;
        }
        [data-zoom-container="compact"] .w-10,
        [data-zoom-container="compact"] .h-10 {
          width: 1.75rem !important;
          height: 1.75rem !important;
        }

        [data-zoom-container="large"] {
          font-size: 1.0625rem !important;
        }
        [data-zoom-container="large"] h2 {
          font-size: 1.875rem !important;
        }
        [data-zoom-container="large"] h3 {
          font-size: 1.25rem !important;
        }
        [data-zoom-container="large"] h4 {
          font-size: 1.125rem !important;
        }
        [data-zoom-container="large"] button:not(.no-zoom-scaling),
        [data-zoom-container="large"] select,
        [data-zoom-container="large"] input:not([type="checkbox"]):not([type="range"]),
        [data-zoom-container="large"] textarea {
          font-size: 1.0625rem !important;
          padding-top: 0.75rem !important;
          padding-bottom: 0.75rem !important;
          padding-left: 1.25rem !important;
          padding-right: 1.25rem !important;
        }
        [data-zoom-container="large"] .p-6 {
          padding: 2rem !important;
        }
        [data-zoom-container="large"] .p-5 {
          padding: 1.75rem !important;
        }
        [data-zoom-container="large"] .p-4 {
          padding: 1.5rem !important;
        }
        [data-zoom-container="large"] .gap-6 {
          gap: 2rem !important;
        }
        [data-zoom-container="large"] .gap-4 {
          gap: 1.5rem !important;
        }
        [data-zoom-container="large"] .w-14,
        [data-zoom-container="large"] .h-14 {
          width: 4.5rem !important;
          height: 4.5rem !important;
        }
        [data-zoom-container="large"] .w-10,
        [data-zoom-container="large"] .h-10 {
          width: 3rem !important;
          height: 3rem !important;
        }
      ` }} />

      {/* Screen View Cockpit Framework */}
      <div className="print-center-overlay-parent max-w-7xl mx-auto space-y-4 pb-24 px-4 md:px-6 print:p-0" data-zoom-container={zoomLevel}>
        
        {/* Simplified Header */}
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/90 shadow-2xs relative no-print">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-3xs">
                <Printer size={20} strokeWidth={2.5} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black text-slate-800 tracking-tight">DRUCKZENTRUM</h1>
                  <span className="bg-slate-100 text-slate-700 text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border border-slate-200">
                    Klasse {app?.klassenbezeichnung?.trim() || 'nicht angegeben'}
                  </span>
                </div>
                <p className="text-[0.6875rem] text-slate-400 font-semibold mt-0.5">
                  Dokumente auswählen, anpassen, als PDF speichern oder direkt ausdrucken
                </p>
              </div>
            </div>

            {/* Header Right Actions: Search & More */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Dokument oder Begriff suchen..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[0.75rem] font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                />
                {templateSearch && (
                  <button
                    type="button"
                    onClick={() => setTemplateSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Mehr Button */}
              <button
                type="button"
                onClick={() => setShowMoreMenu(prev => !prev)}
                className={`px-3 py-2 rounded-xl text-[0.75rem] font-black border transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  showMoreMenu
                    ? 'bg-slate-900 text-white border-slate-900 shadow-3xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
              >
                <span>⋯ Mehr</span>
              </button>
            </div>
          </div>

          {/* "⋯ Mehr" Popover Drawer / Panel */}
          {showMoreMenu && (
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/60">
              {/* Box 1: Printer & Page Setup */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase tracking-wider">
                  <Sliders size={14} className="text-emerald-600" />
                  <span>Druck- & Seiteneinstellungen</span>
                </div>
                <div className="space-y-2 text-[0.75rem]">
                  <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-600">Ausrichtung</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setPrintOrientation('portrait')}
                        className={`px-2 py-1 rounded text-[0.625rem] font-black ${printOrientation === 'portrait' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                      >
                        Hoch
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrintOrientation('landscape')}
                        className={`px-2 py-1 rounded text-[0.625rem] font-black ${printOrientation === 'landscape' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                      >
                        Quer
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-600">Briefkopf drucken</span>
                    <input
                      type="checkbox"
                      checked={showMainHeader}
                      onChange={(e) => setShowMainHeader(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Box 2: Quick Presets */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase tracking-wider">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>Schnell-Presets</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => { applyPreset('klassisch'); setShowMoreMenu(false); }}
                    className="p-2 bg-white hover:bg-slate-100 text-left rounded-lg border border-slate-200 text-[0.6875rem] font-bold text-slate-700 cursor-pointer"
                  >
                    📋 Standard-Liste
                  </button>
                  <button
                    type="button"
                    onClick={() => { applyPreset('raster'); setShowMoreMenu(false); }}
                    className="p-2 bg-white hover:bg-slate-100 text-left rounded-lg border border-slate-200 text-[0.6875rem] font-bold text-slate-700 cursor-pointer"
                  >
                    📝 Notenraster
                  </button>
                  <button
                    type="button"
                    onClick={() => { applyPreset('ausflug'); setShowMoreMenu(false); }}
                    className="p-2 bg-white hover:bg-slate-100 text-left rounded-lg border border-slate-200 text-[0.6875rem] font-bold text-slate-700 cursor-pointer"
                  >
                    🚶 Ausflugsliste
                  </button>
                  <button
                    type="button"
                    onClick={() => { applyPreset('kel'); setShowMoreMenu(false); }}
                    className="p-2 bg-white hover:bg-slate-100 text-left rounded-lg border border-slate-200 text-[0.6875rem] font-bold text-slate-700 cursor-pointer"
                  >
                    🗣️ KEL-Dossier
                  </button>
                </div>
              </div>

              {/* Box 3: Printer Tips & Standard info */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase tracking-wider">
                  <Info size={14} className="text-indigo-600" />
                  <span>Drucktipp & Datenschutz</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[0.625rem] text-slate-600 leading-relaxed font-medium space-y-1">
                  <p>• Aktiviere im Druckfenster <strong>"Hintergrundgrafiken"</strong>, um Linien und Farben zu sehen.</p>
                  <p>• Falls im iFrame geblockt: Nutze oben <strong>"In neuem Tab öffnen"</strong>.</p>
                  <p>• Ausdrucke mit Schülernamen bitte vertraulich aufbewahren.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 1: Häufig verwendet */}
        <div className="space-y-2.5 no-print">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-emerald-600" />
              <span>Häufig verwendet</span>
            </h2>
            <span className="text-[0.625rem] font-bold text-slate-400">Schnellzugriff auf oft benötigte Dokumente</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {[
              { id: 'schuelerliste', label: 'Klassenliste', desc: 'Namens- & Stammdaten', icon: '📋', bg: 'hover:border-indigo-300' },
              { id: 'fehlstunden', label: 'Anwesenheit', desc: 'Fehlstunden & Absenzen', icon: '✓', bg: 'hover:border-emerald-300' },
              { id: 'checkliste', label: 'Notenübersicht', desc: 'Punkteraster & Schnitt', icon: '📚', bg: 'hover:border-blue-300' },
              { id: 'wochenplan', label: 'Wochenplan', desc: 'Unterrichts- & Wochenplan', icon: '📅', bg: 'hover:border-amber-300' },
              { id: 'schuelerprofil', label: 'Schülerdossier', desc: 'Stammdaten & Profil', icon: '👤', bg: 'hover:border-purple-300' },
              { id: 'smart_tools', label: 'Geldsammlung', desc: 'Orga, Kasse & Listen', icon: '💶', bg: 'hover:border-rose-300' },
            ].map(f => {
              const isActive = activeTemplate === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setActiveTemplate(f.id as any);
                    if (f.id === 'smart_tools') setActiveSmartTool('tischschilder');
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-24 ${f.bg} ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/10'
                      : 'bg-white text-slate-800 border-slate-200/80 hover:bg-slate-50 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{f.icon}</span>
                    {isActive && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                  </div>
                  <div>
                    <h3 className="text-xs font-black leading-tight">{f.label}</h3>
                    <p className={`text-[0.625rem] font-medium leading-tight mt-0.5 line-clamp-1 ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                      {f.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Alle Dokumente nach Aufgaben */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-3.5 no-print shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-black text-slate-800">Was möchtest du drucken?</h2>
              <p className="text-[0.6875rem] text-slate-400 font-medium">Alle verfügbaren Druckvorlagen übersichtlich kategorisiert</p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1 text-[0.6875rem]">
              {[
                { id: 'all', label: 'Alle', count: ALL_TEMPLATES.length },
                { id: 'klasse', label: 'Klasse', count: ALL_TEMPLATES.filter(t => t.taskCat === 'klasse').length },
                { id: 'schueler', label: 'Schüler:innen', count: ALL_TEMPLATES.filter(t => t.taskCat === 'schueler').length },
                { id: 'leistung', label: 'Leistung', count: ALL_TEMPLATES.filter(t => t.taskCat === 'leistung').length },
                { id: 'planung', label: 'Planung', count: ALL_TEMPLATES.filter(t => t.taskCat === 'planung').length },
                { id: 'orga', label: 'Organisation', count: ALL_TEMPLATES.filter(t => t.taskCat === 'orga').length },
              ].map(cat => {
                const isActive = activeTaskCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveTaskCategory(cat.id as any)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-3xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className={`ml-1 text-[0.5625rem] px-1.5 py-0.2 rounded-full font-black ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid of Templates */}
          {filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
              {filteredTemplates.map(t => {
                const IconComp = t.icon;
                const isSel = activeTemplate === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTemplate(t.id as any)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between h-28 transition-all cursor-pointer active:scale-97 ${
                      isSel
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-600/20'
                        : 'bg-slate-50/70 hover:bg-white border-slate-200/80 text-slate-700 hover:border-slate-300 shadow-3xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isSel ? 'bg-white/20 text-white' : 'bg-white text-slate-700 border border-slate-200'
                      }`}>
                        <IconComp size={15} />
                      </div>
                      <span className={`text-[0.5625rem] font-black uppercase px-1.5 py-0.5 rounded ${
                        isSel ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-600'
                      }`}>
                        {t.badge}
                      </span>
                    </div>

                    <div>
                      <div className="text-[0.75rem] font-black leading-tight tracking-tight">{t.label}</div>
                      <div className={`text-[0.625rem] mt-0.5 font-medium line-clamp-1 leading-tight ${
                        isSel ? 'text-emerald-100' : 'text-slate-400'
                      }`}>
                        {t.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-xs font-bold text-slate-500">Keine Vorlagen für diese Kategorie / Suche gefunden</p>
              <button
                type="button"
                onClick={() => { setTemplateSearch(''); setActiveTaskCategory('all'); }}
                className="mt-1.5 text-xs font-black text-emerald-600 hover:underline cursor-pointer"
              >
                Zurück zu allen Dokumenten
              </button>
            </div>
          )}
        </div>

        {/* Step Indicator Bar */}
        <div className="bg-slate-900 text-white p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 no-print shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black">
              ✓
            </span>
            <div className="text-xs font-bold">
              <span className="text-slate-400 uppercase tracking-wider text-[0.625rem] block font-black">Gewähltes Dokument:</span>
              <span className="text-white font-black text-sm">
                {ALL_TEMPLATES.find(t => t.id === activeTemplate)?.label || 'Dokument'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[0.6875rem]">
            <span className="px-2.5 py-1 bg-slate-800 rounded-lg text-slate-300 font-bold">SCHRITT 1: Dokument wählen</span>
            <span className="text-slate-600">→</span>
            <span className="px-2.5 py-1 bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 rounded-lg font-bold">SCHRITT 2: Filter &amp; Angaben</span>
            <span className="text-slate-600">→</span>
            <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg font-bold">SCHRITT 3: Vorschau &amp; Druck</span>
          </div>
        </div>

        {/* 7. Settings & Preview Dual Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Panel: Configuration Controls (Screen-only) */}
          <div className="lg:col-span-5 space-y-6 no-print">
            
            {/* General Styling Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 md:p-6 space-y-5 shadow-inner">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Sliders size={16} className="text-slate-400" />
                <h3 className="text-[0.875rem] leading-snug font-black text-slate-800">1. Globale Formatierung</h3>
              </div>

              {/* Theme & Orientation controls */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Papier-Ausrichtung</label>
                  <div className="flex bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                    <button 
                      type="button"
                      aria-pressed={printOrientation === 'portrait'}
                      onClick={() => setPrintOrientation('portrait')}
                      className={`flex-1 py-2 rounded-lg text-[0.75rem] leading-tight font-black transition-all ${printOrientation === 'portrait' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Hochformat
                    </button>
                    <button 
                      type="button"
                      aria-pressed={printOrientation === 'landscape'}
                      onClick={() => setPrintOrientation('landscape')}
                      className={`flex-1 py-2 rounded-lg text-[0.75rem] leading-tight font-black transition-all ${printOrientation === 'landscape' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Querformat
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Schriftgröße</label>
                  <div className="grid grid-cols-4 bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                    {[
                      { id: 'sm', label: 'S' },
                      { id: 'base', label: 'M' },
                      { id: 'lg', label: 'L' },
                      { id: 'xl', label: 'XL' }
                    ].map(sz => (
                      <button 
                        key={sz.id}
                        type="button"
                        aria-label={`Schriftgröße ${sz.label}`}
                        aria-pressed={printFontSize === sz.id}
                        onClick={() => setPrintFontSize(sz.id as any)}
                        className={`py-2 rounded-lg text-[0.75rem] leading-tight font-black transition-all ${printFontSize === sz.id ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        {sz.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Margin Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider">Seitenränder (Zoll/mm)</label>
                  <span className="text-[0.6875rem] font-black text-slate-700">{printMargin} mm</span>
                </div>
                <input 
                  type="range" 
                  aria-label="Seitenränder in Millimetern"
                  min="4" 
                  max="30" 
                  value={printMargin} 
                  onChange={(e) => setPrintMargin(parseInt(e.target.value))}
                  className="w-full accent-slate-800 cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none"
                />
              </div>

              {/* Tint Tint Palette Selector */}
              <div className="space-y-1.5">
                <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Optimiertes Farbschema</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'monochrome', label: 'Laser S/W', color: 'bg-zinc-200 border-zinc-400 text-zinc-900' },
                    { id: 'slate', label: 'Soft Slate', color: 'bg-slate-200 border-slate-400 text-slate-800' },
                    { id: 'indigo', label: 'Fein Indigo', color: 'bg-indigo-100 border-indigo-300 text-indigo-700' },
                    { id: 'emerald', label: 'Blatt Grün', color: 'bg-emerald-100 border-emerald-300 text-emerald-700' }
                  ].map(pal => (
                    <button
                      key={pal.id}
                      type="button"
                      aria-pressed={printTheme === pal.id}
                      onClick={() => setPrintTheme(pal.id as any)}
                      className={`p-2.5 rounded-xl border text-[0.59375rem] font-black flex flex-col items-center justify-center gap-1.5 transition-all text-center leading-none ${pal.color} ${
                        printTheme === pal.id ? 'ring-2 ring-slate-850 ring-offset-2 scale-105' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-current inline-block" />
                      {pal.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Headline Overwrite */}
              <div className="space-y-1.5">
                <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Optionale Überschrift überschreiben</label>
                <input 
                  type="text"
                  placeholder="Standardwert verwenden..."
                  value={customHeaderTitle}
                  onChange={(e) => setCustomHeaderTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[0.75rem] leading-tight font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Toggle Main Metadata Header */}
              <div className="flex items-center justify-between py-1 bg-slate-50 px-3 rounded-xl border border-slate-100">
                <div className="space-y-0.5">
                  <span className="text-[0.75rem] leading-tight font-black text-slate-700 block">Dokumentkopf drucken</span>
                  <span className="text-[0.5625rem] font-semibold text-slate-400 leading-none">Zeigt vorhandene Schuldaten, Klasse und Stand – ohne amtliche Gültigkeitsbehauptung</span>
                </div>
                <input 
                  type="checkbox"
                  checked={showMainHeader}
                  onChange={(e) => setShowMainHeader(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-550 cursor-pointer"
                />
              </div>
            </div>

            {/* Template-Specific Settings Block */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 md:p-6 space-y-5 shadow-inner">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Sliders size={16} className="text-slate-400" />
                <h3 className="text-[0.875rem] leading-snug font-black text-slate-800">2. Vorlagendetails</h3>
              </div>

              {/* A. SCHUELERLISTE CONTROLS */}
              {activeTemplate === 'schuelerliste' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Geschlechter-Filter</label>
                    <div className="grid grid-cols-3 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[0.75rem] leading-tight">
                      <button type="button" aria-pressed={slGenderFilter === 'all'} onClick={() => setSlGenderFilter('all')} className={`py-1.5 rounded-lg font-bold ${slGenderFilter === 'all' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500'}`}>Alle</button>
                      <button type="button" aria-pressed={slGenderFilter === 'm'} onClick={() => setSlGenderFilter('m')} className={`py-1.5 rounded-lg font-bold ${slGenderFilter === 'm' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500'}`}>Männlich (M)</button>
                      <button type="button" aria-pressed={slGenderFilter === 'w'} onClick={() => setSlGenderFilter('w')} className={`py-1.5 rounded-lg font-bold ${slGenderFilter === 'w' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500'}`}>Weiblich (W)</button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Sortierung</label>
                    <div className="grid grid-cols-2 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[0.75rem] leading-tight">
                      <button type="button" aria-pressed={slSortBy === 'nachname'} onClick={() => setSlSortBy('nachname')} className={`py-1.5 rounded-lg font-bold ${slSortBy === 'nachname' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500'}`}>Nachname</button>
                      <button type="button" aria-pressed={slSortBy === 'vorname'} onClick={() => setSlSortBy('vorname')} className={`py-1.5 rounded-lg font-bold ${slSortBy === 'vorname' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500'}`}>Vorname</button>
                    </div>
                  </div>

                  {/* Add extra column values */}
                  <div className="space-y-2">
                    <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Optionale Datenspalten (Stammdaten)</label>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      {[
                        { label: 'Geburtstag', checked: slShowBirthday, setChecked: setSlShowBirthday },
                        { label: 'Geschlecht', checked: slShowGender, setChecked: setSlShowGender },
                        { label: 'Religion', checked: slShowReligion, setChecked: setSlShowReligion },
                        { label: 'Schulstufe', checked: slShowLevel, setChecked: setSlShowLevel },
                        { label: 'Besuchsjahr', checked: slShowBesuchsjahr, setChecked: setSlShowBesuchsjahr },
                        { label: 'Sprachförderung/DaZ', checked: slShowDaZ, setChecked: setSlShowDaZ },
                        { label: 'Erstsprache', checked: slShowErstsprache, setChecked: setSlShowErstsprache },
                        { label: 'Zweitsprache', checked: slShowZweitsprache, setChecked: setSlShowZweitsprache },
                        { label: 'Staatsbürgerschaft', checked: slShowNationality, setChecked: setSlShowNationality },
                        { label: 'Adresse / Anschrift', checked: slShowAddress, setChecked: setSlShowAddress },
                        { label: 'Telefon Mutter', checked: slShowPhoneMother, setChecked: setSlShowPhoneMother },
                        { label: 'Telefon Vater', checked: slShowPhoneFather, setChecked: setSlShowPhoneFather },
                        { label: 'E-Mail Eltern', checked: slShowEmailParents, setChecked: setSlShowEmailParents },
                        { label: 'SV-Nummer', checked: slShowSvNummer, setChecked: setSlShowSvNummer },
                        { label: 'IKM-Nummer', checked: slShowIkmNummer, setChecked: setSlShowIkmNummer },
                        { label: 'Zugeordnete Gruppen', checked: slShowGroups, setChecked: setSlShowGroups },
                        { label: 'Fehlstunden', checked: slShowFehlstunden, setChecked: setSlShowFehlstunden },
                        { label: 'Besondere Hinweise mitdrucken', checked: slShowNotes, setChecked: setSlShowNotes },
                        { label: 'Allergien & Unverträglichkeiten mitdrucken', checked: slShowAllergies, setChecked: setSlShowAllergies },
                        { label: 'Foto-Freigabe mitdrucken', checked: slShowFotoFreigabe, setChecked: setSlShowFotoFreigabe },
                      ].map((chk, idx) => {
                        const isSpecialHealth = chk.label === 'Besondere Hinweise mitdrucken' || chk.label === 'Allergien & Unverträglichkeiten mitdrucken' || chk.label === 'Foto-Freigabe mitdrucken';
                        return (
                          <label key={idx} className={`flex items-center gap-2 cursor-pointer select-none ${isSpecialHealth ? 'col-span-2 pt-1 border-t border-slate-200/60' : ''}`}>
                            <input 
                              type="checkbox" 
                              checked={chk.checked} 
                              onChange={(e) => chk.setChecked(e.target.checked)}
                              className="w-3.5 h-3.5 text-emerald-600 rounded bg-white border-slate-300"
                            />
                            <span className={`text-[0.6875rem] ${isSpecialHealth ? 'text-slate-800 font-bold flex items-center gap-1.5' : 'text-slate-600 font-semibold'}`}>
                              {chk.label === 'Besondere Hinweise mitdrucken' && <AlertCircle size={12} className="text-amber-600 shrink-0" />}
                              {chk.label === 'Allergien & Unverträglichkeiten mitdrucken' && <AlertCircle size={12} className="text-rose-600 shrink-0" />}
                              {chk.label === 'Foto-Freigabe mitdrucken' && <Camera size={12} className="text-indigo-600 shrink-0" />}
                              <span>{chk.label}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Blank custom extra columns count helper */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[0.75rem] leading-tight font-black text-slate-700">Leere handschriftliche Spalten</span>
                      <span className="text-[0.75rem] leading-tight font-black text-slate-500">{slCustomColsCount} Spalten</span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const cnt = Math.max(0, slCustomColsCount - 1);
                          setSlCustomColsCount(cnt);
                          setSlCustomCols(prev => prev.slice(0, cnt));
                        }}
                        className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50"
                      >
                        <Minus size={14} />
                      </button>
                      
                      <div className="flex-1 bg-slate-100 rounded-xl px-3 flex items-center justify-center text-[0.75rem] leading-tight font-black text-slate-700">
                        {slCustomColsCount} Zusatzspalten
                      </div>

                      <button 
                        onClick={() => {
                          const cnt = Math.min(8, slCustomColsCount + 1);
                          setSlCustomColsCount(cnt);
                          setSlCustomCols(prev => {
                            const copy = [...prev];
                            while (copy.length < cnt) {
                              copy.push(`Spalte ${copy.length + 1}`);
                            }
                            return copy;
                          });
                        }}
                        className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Column titles config */}
                    {slCustomColsCount > 0 && (
                      <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-400 block mb-1">Spalten-Überschriften bearbeiten:</span>
                        <div className="grid grid-cols-2 gap-2">
                          {slCustomCols.map((colStr, colIdx) => (
                            <input 
                              key={colIdx} 
                              type="text" 
                              value={colStr}
                              onChange={(e) => {
                                const copy = [...slCustomCols];
                                copy[colIdx] = e.target.value;
                                setSlCustomCols(copy);
                              }}
                              placeholder={`Spalte ${colIdx + 1}`}
                              className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[0.75rem] leading-tight font-bold focus:outline-none"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* B. CHECKLISTE CONTROLS */}
              {activeTemplate === 'checkliste' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Titel der Liste</label>
                    <input 
                      type="text"
                      value={clTitle}
                      onChange={(e) => setClTitle(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[0.75rem] leading-tight font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Daten-Modus</label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                      <button
                        type="button"
                        onClick={() => setClSyncMode('blank')}
                        className={`py-2 px-3 text-[0.75rem] leading-tight font-black uppercase tracking-wider rounded-xl transition-all ${
                          clSyncMode === 'blank'
                            ? 'bg-emerald-600 text-white shadow-3xs'
                            : 'text-slate-500 hover:bg-white hover:text-slate-700 font-extrabold'
                        }`}
                      >
                        📄 Leerschablone
                      </button>
                      <button
                        type="button"
                        onClick={() => setClSyncMode('notenmappe')}
                        className={`py-2 px-3 text-[0.75rem] leading-tight font-black uppercase tracking-wider rounded-xl transition-all ${
                          clSyncMode === 'notenmappe'
                            ? 'bg-emerald-600 text-white shadow-3xs'
                            : 'text-slate-500 hover:bg-white hover:text-slate-700 font-extrabold'
                        }`}
                      >
                        📊 Noten-Sync
                      </button>
                    </div>
                  </div>

                  {clSyncMode === 'notenmappe' ? (
                    <div className="p-3 bg-indigo-50/40 rounded-2xl border border-indigo-100 space-y-1">
                      <label className="text-[0.5625rem] font-black text-indigo-700 uppercase tracking-widest block">Fach auswählen</label>
                      <select
                        value={clSelectedSubject}
                        onChange={(e) => setClSelectedSubject(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-[0.75rem] leading-tight font-bold bg-white focus:outline-none"
                      >
                        {(app.faecher && app.faecher.length > 0 ? app.faecher : FAECHER_ALLE).map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Spalten-Definitionen ({clCols.length})</label>
                        <span className="text-[0.65625rem] text-slate-400 font-bold">Max. 12 empfohlen</span>
                      </div>

                      {/* Array values */}
                      <div className="space-y-1.5 max-h-40 overflow-y-auto bg-slate-50/50 p-2 rounded-2xl border border-slate-100">
                        {clCols.map((col, idx) => (
                          <div key={col.id} className="flex items-center justify-between gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200/60 shadow-3xs">
                            <span className="text-[0.75rem] leading-tight font-bold text-slate-400 w-4">{idx + 1}.</span>
                            <input 
                              type="text"
                              value={col.title}
                              onChange={(e) => {
                                const updated = clCols.map(c => c.id === col.id ? { ...c, title: e.target.value } : c);
                                setClCols(updated);
                              }}
                              className="bg-transparent border-none text-[0.75rem] leading-tight font-black p-0 focus:ring-0 flex-1 text-slate-700"
                            />
                            <button 
                              onClick={() => handleDeleteClCol(col.id)} 
                              className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg animate-all"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add col tool */}
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          placeholder="Neue Spalte (z.B. Test 2)..."
                          value={clNewColTitle}
                          onChange={(e) => setClNewColTitle(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddClCol()}
                          className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-[0.75rem] leading-tight focus:outline-none"
                        />
                        <button 
                          onClick={handleAddClCol}
                          className="px-3 bg-slate-900 text-white rounded-xl text-[0.75rem] leading-tight font-black flex items-center justify-center gap-1 hover:bg-slate-800 transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Grid toggles */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={clShowAverageRow}
                        onChange={(e) => setClShowAverageRow(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600 border-slate-300"
                      />
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Mittelwert-Zeile</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={clShowNumbers}
                        onChange={(e) => setClShowNumbers(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600 border-slate-300"
                      />
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Nummerierung (Nr.)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Zeugnis-Notenliste Controls */}
              {activeTemplate === 'zeugnis_noten' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Semester</label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                      <button
                        type="button"
                        onClick={() => setZnSemester('1')}
                        className={`py-2 px-3 text-[0.7125rem] leading-tight font-black uppercase tracking-wider rounded-xl transition-all ${
                          znSemester === '1'
                            ? 'bg-emerald-600 text-white shadow-3xs'
                            : 'text-slate-500 hover:bg-white hover:text-slate-700'
                        }`}
                      >
                        1. Semester
                      </button>
                      <button
                        type="button"
                        onClick={() => setZnSemester('2')}
                        className={`py-2 px-3 text-[0.7125rem] leading-tight font-black uppercase tracking-wider rounded-xl transition-all ${
                          znSemester === '2'
                            ? 'bg-emerald-600 text-white shadow-3xs'
                            : 'text-slate-500 hover:bg-white hover:text-slate-700'
                        }`}
                      >
                        2. Semester
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-baseline">
                      <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Fächer auswählen</label>
                      <button
                        type="button"
                        onClick={() => setZnSelectedSubjects([...FAECHER_ALLE])}
                        className="text-[0.5625rem] font-black text-emerald-600 hover:underline uppercase"
                      >
                        Alle Fächer
                      </button>
                    </div>
                    <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-200/60 max-h-[200px] overflow-y-auto space-y-2">
                      {FAECHER_ALLE.map(f => {
                        const isFachActive = !app.faecher || app.faecher.includes(f);
                        const isSelected = znSelectedSubjects.includes(f);
                        return (
                          <label key={f} className="flex items-center gap-2.5 cursor-pointer text-[0.75rem] font-bold text-slate-600 hover:text-slate-800">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setZnSelectedSubjects(prev => [...prev, f]);
                                } else {
                                  setZnSelectedSubjects(prev => prev.filter(x => x !== f));
                                }
                              }}
                              className="w-4 h-4 rounded text-emerald-600 border-slate-300 cursor-pointer"
                            />
                            <span className="flex-1">{f}</span>
                            {!isFachActive && (
                              <span className="text-[0.5rem] bg-zinc-100 text-slate-400 border border-zinc-200/50 px-1 py-0.5 rounded uppercase tracking-wide">inaktiv</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Möchten Sie wirklich alle manuell eingetragenen Endnoten für das ausgewählte Semester zurücksetzen? Dies stellt die live berechneten Werte wieder her.")) {
                          setApp(prev => {
                            const updatedNoten = { ...(prev.noten || {}) };
                            students.forEach(st => {
                              if (!updatedNoten[st.id]) return;
                              const stNoten = { ...updatedNoten[st.id] };
                              znSelectedSubjects.forEach(f => {
                                if (!stNoten[f]) return;
                                const fData = { ...stNoten[f] };
                                if (fData[znSemester]) {
                                  const semData = { ...fData[znSemester] };
                                  delete semData.endnote;
                                  fData[znSemester] = semData;
                                }
                                stNoten[f] = fData;
                              });
                              updatedNoten[st.id] = stNoten;
                            });
                            return { ...prev, noten: updatedNoten };
                          });
                        }
                      }}
                      className="w-full py-2 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-[0.6875rem] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
                    >
                      ⚠️ Manuelle Overrides löschen
                    </button>
                  </div>

                  <div className="bg-emerald-50/50 border border-emerald-100/60 p-3.5 rounded-2xl text-[0.6875rem] text-emerald-800 space-y-1.5">
                    <p className="text-emerald-700 leading-normal font-medium">
                      <strong>🔄 Notensync aktiv:</strong> Aktive Fächer laden automatisch berechnete Noten. Sie können jede Note hier direkt anpassen (auch für inaktive Fächer!). Overrides werden farblich markiert und sofort gespeichert.
                    </p>
                  </div>
                </div>
              )}

              {/* C. WOCHENPLAN CONTROLS */}
              {activeTemplate === 'wochenplan' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Woche selektieren (Schulwoche & KW & Datum)</label>
                    <select 
                      value={wpKW}
                      onChange={(e) => setWpKW(parseInt(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[0.75rem] leading-tight font-bold focus:ring-1"
                    >
                      {schoolYearKws.map((val) => {
                        const dateDetails = kwToDates(val);
                        return (
                          <option key={val} value={val}>
                            SW {dateDetails.sw} | KW {val} ({dateDetails.monday.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} - {dateDetails.friday.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <button type="button" onClick={() => generateWochenplanTemplate(app, wpKW)}
                    className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100">
                    <Download size={14} className="mr-1.5 inline" />Excel-Vorlage für diese Woche herunterladen
                  </button>

                  <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <span className="text-[0.59375rem] font-black uppercase text-slate-400 tracking-wider block">Spezifische Zeilenoptionen</span>
                    
                    <label className="flex items-center justify-between cursor-pointer py-1.5">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Uhrzeiten der Stunden</span>
                      <input 
                        type="checkbox"
                        checked={wpShowTimes}
                        onChange={(e) => setWpShowTimes(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1.5">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Nur das Fach anzeigen (ohne Thema)</span>
                      <input 
                        type="checkbox"
                        checked={wpShowSubjectOnly}
                        onChange={(e) => setWpShowSubjectOnly(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1.5">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Notizenbox unten andocken</span>
                      <input 
                        type="checkbox"
                        checked={wpShowEmptyNotesBox}
                        onChange={(e) => setWpShowEmptyNotesBox(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1.5">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Toner-Sparen (kein Slot-Zebramuster)</span>
                      <input 
                        type="checkbox"
                        checked={wpInkSaver}
                        onChange={(e) => setWpInkSaver(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Child-friendly weekly plans are authored in the planner but printed here. */}
              {activeTemplate === 'schueler_wochenplan' && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700" htmlFor="print-child-week-plan">Wochenplan für Kinder auswählen</label>
                  <select id="print-child-week-plan" value={selectedChildPlan?.id || ''}
                    onChange={event => setChildPlanId(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800">
                    {childPlans.length === 0 && <option value="">Noch keinen Wochenplan für Kinder gespeichert</option>}
                    {childPlans.map(plan => <option key={plan.id} value={plan.id}>KW {plan.kw} · {plan.titel || plan.id}</option>)}
                  </select>
                  <label className="block text-xs font-bold text-slate-700">Druckfarbe
                    <select value={childPrintColorMode} onChange={event => setChildPrintColorMode(event.target.value as 'color' | 'mono')}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800">
                      <option value="color">Farbe</option><option value="mono">Schwarz-Weiß</option>
                    </select>
                  </label>
                  <p className="text-xs text-slate-600">Aufgaben und Gestaltung werden ausschließlich in der Erstellung des Wochenplans geändert.</p>
                </div>
              )}

              {/* D. KLASSENBUCH CONTROLS */}
              {activeTemplate === 'klassenbuch' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Druck-Umfang (Klassenbuch)</label>
                    <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
                      <button 
                        type="button"
                        onClick={() => {
                          setKbMode('single');
                        }}
                        className={`py-1.5 px-2 rounded-lg text-[0.5625rem] font-black transition-all cursor-pointer ${kbMode === 'single' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        Woche
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setKbMode('range');
                        }}
                        className={`py-1.5 px-2 rounded-lg text-[0.5625rem] font-black transition-all cursor-pointer ${kbMode === 'range' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        Bereich
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setKbMode('all');
                        }}
                        className={`py-1.5 px-2 rounded-lg text-[0.5625rem] font-black transition-all cursor-pointer ${kbMode === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        Gesamt
                      </button>
                    </div>
                  </div>

                  {kbMode === 'single' && (
                    <div className="space-y-1.5">
                      <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Woche wählen (SW & KW & Datum)</label>
                      <select 
                        value={kbKW}
                        onChange={(e) => setKbKW(parseInt(e.target.value))}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[0.75rem] leading-tight font-bold focus:ring-1"
                      >
                        {schoolYearKws.map((val) => {
                          const dateDetails = kwToDates(val);
                          return (
                            <option key={val} value={val}>
                              SW {dateDetails.sw} | KW {val} ({dateDetails.monday.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} - {dateDetails.friday.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  {kbMode === 'range' && (
                    <div className="space-y-3 bg-indigo-50/40 p-3 rounded-2xl border border-indigo-100">
                      <div className="space-y-1">
                        <label className="text-[0.5625rem] font-black text-indigo-900 uppercase tracking-wider block">Von Schulwoche/KW</label>
                        <select 
                          value={kbStartKW}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setKbStartKW(val);
                            setKbKW(val); // Sync preview
                          }}
                          className="w-full px-2 py-1.5 rounded-lg bg-white border border-indigo-100 text-[0.65625rem] font-bold focus:ring-1 text-slate-850"
                        >
                          {schoolYearKws.map((val) => {
                            const dateDetails = kwToDates(val);
                            return (
                              <option key={val} value={val}>
                                SW {dateDetails.sw} | KW {val} ({dateDetails.monday.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} - {dateDetails.friday.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[0.5625rem] font-black text-indigo-900 uppercase tracking-wider block">Bis Schulwoche/KW</label>
                        <select 
                          value={kbEndKW}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setKbEndKW(val);
                          }}
                          className="w-full px-2 py-1.5 rounded-lg bg-white border border-indigo-100 text-[0.65625rem] font-bold focus:ring-1 text-slate-850"
                        >
                          {schoolYearKws.map((val) => {
                            const dateDetails = kwToDates(val);
                            return (
                              <option key={val} value={val}>
                                SW {dateDetails.sw} | KW {val} ({dateDetails.monday.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} - {dateDetails.friday.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="text-[0.59375rem] text-indigo-800 font-bold bg-white/80 p-2 rounded-xl border border-indigo-50">
                        Umfasst {getKbWeeksToRender().length} Wochenberichte.
                      </div>
                    </div>
                  )}

                  {kbMode !== 'single' && (
                    <div className="space-y-4">
                      <label className="flex items-center gap-3 cursor-pointer p-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                        <input 
                          type="checkbox"
                          checked={kbOnlyFilledWeeks}
                          onChange={(e) => setKbOnlyFilledWeeks(e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-emerald-300"
                        />
                        <div>
                          <span className="text-[0.75rem] leading-tight text-emerald-900 font-bold block">Nur befüllte Wochen exportieren</span>
                          <span className="text-[0.625rem] text-emerald-700/80 font-medium block">Leere Wochen ohne Einträge werden übersprungen</span>
                        </div>
                      </label>
                      <div className="space-y-1.5">
                        <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Editor-Vorschau wählen</label>
                        <select 
                          value={kbKW}
                          onChange={(e) => setKbKW(parseInt(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[0.75rem] leading-tight font-bold bg-white"
                        >
                          {getKbWeeksToRender().map((val) => {
                            const dateDetails = kwToDates(val);
                            return (
                              <option key={val} value={val}>
                                SW {dateDetails.sw} | KW {val} ({dateDetails.monday.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} - {dateDetails.friday.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <span className="text-[0.59375rem] font-black uppercase text-slate-400 tracking-wider block">Bestandteile im Bericht</span>
                    
                    <label className="flex items-center justify-between cursor-pointer py-1.5">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Besondere Vorkommnisse</span>
                      <input 
                        type="checkbox"
                        checked={kbIncludeOccurrences}
                        onChange={(e) => setKbIncludeOccurrences(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1.5 border-t border-slate-200/50 pt-1.5">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Fehlstunden anzeigen</span>
                      <input 
                        type="checkbox"
                        checked={kbIncludeAbsentees}
                        onChange={(e) => setKbIncludeAbsentees(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Berichtsergänzungen / Freitext</label>
                    <textarea
                      placeholder="Bemerkungen zum Wochenverlauf, pädagogische Höhepunkte oder Ankündigungen, die auf dem Bericht erscheinen..."
                      value={kbCustomNotesValue}
                      onChange={(e) => setKbCustomNotesValue(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[0.75rem] leading-tight font-medium focus:ring-1"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Unterschriften-Felder</label>
                    <div className="flex flex-wrap gap-2">
                      {['Klassenlehrer:in', 'Schulleitung', 'Klassensprecher:in', 'Aufsicht'].map(nm => {
                        const index = kbSignatures.indexOf(nm);
                        const exists = index !== -1;
                        return (
                          <button
                            key={nm}
                            onClick={() => {
                              if (exists) {
                                setKbSignatures(prev => prev.filter(x => x !== nm));
                              } else {
                                setKbSignatures(prev => [...prev, nm]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl text-[0.65625rem] font-black transition-all ${exists ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                          >
                            + {nm}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3.5 space-y-2">
                    <p className="text-[0.6875rem] font-bold leading-relaxed text-indigo-900">
                      PDF erstellt ein sauberes A4-Klassenbuch direkt aus denselben Wochen wie die Vorschau. Für einen Papierausdruck kannst du weiterhin „Drucken“ verwenden.
                    </p>
                    <button
                      type="button"
                      onClick={handleDownloadKlassenbuchPdf}
                      className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[0.6875rem] uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                      <Download size={15} />
                      Klassenbuch als PDF herunterladen
                    </button>
                    <div aria-label="Klassenbuch DOCX exportieren" className="grid grid-cols-2 gap-2">
                      {([
                        ['week', 'Woche'], ['month', 'Monat'], ['semester', 'Semester'], ['schoolyear', 'Gesamt'],
                      ] as const).map(([range, label]) => (
                        <button key={range} type="button" onClick={() => void handleDownloadKlassenbuchDocx(range)}
                          className="rounded-xl border border-indigo-300 bg-white px-3 py-2.5 text-xs font-bold text-indigo-800 hover:bg-indigo-100">
                          <Download size={13} className="mr-1 inline" /> DOCX {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* E. JAHRESPLANUNG CONTROLS */}
              {activeTemplate === 'jahresplanung' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Fach-Schwerpunkt</label>
                    <select
                      value={jpSubjectFilter}
                      onChange={(e) => setJpSubjectFilter(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[0.75rem] leading-tight font-bold"
                    >
                      <option value="all">Alle Fächer (Bento/Matrix)</option>
                      {sortYearlySubjects(app?.jahresplan_faecher || DEFAULT_YEARLY_SUBJECTS).map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Layout-Darstellung</label>
                    <div className="grid grid-cols-3 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[0.6875rem] leading-tight">
                      <button onClick={() => setJpDisplayMode('matrix')} className={`py-1.5 rounded-lg font-bold ${jpDisplayMode === 'matrix' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500'}`}>Matrix</button>
                      <button onClick={() => setJpDisplayMode('list')} className={`py-1.5 rounded-lg font-bold ${jpDisplayMode === 'list' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500'}`}>Liste</button>
                      <button onClick={() => setJpDisplayMode('bento')} className={`py-1.5 rounded-lg font-bold ${jpDisplayMode === 'bento' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500'}`}>Bento</button>
                    </div>
                  </div>

                  <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 select-none">
                    <span className="text-[0.59375rem] font-black uppercase text-slate-450 tracking-wider block mb-1">Druck-Bestandteile:</span>

                    <label className="flex items-center justify-between cursor-pointer py-1">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Monatweise Gruppierung</span>
                      <input 
                        type="checkbox"
                        checked={jpGroupByMonth}
                        onChange={(e) => setJpGroupByMonth(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1 border-t border-slate-200/50 pt-1">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Ferien &amp; Feiertage anzeigen</span>
                      <input 
                        type="checkbox"
                        checked={jpShowHolidays}
                        onChange={(e) => setJpShowHolidays(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1 border-t border-slate-200/50 pt-1">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Milestones &amp; Fixtermine (Pins)</span>
                      <input 
                        type="checkbox"
                        checked={jpShowPins}
                        onChange={(e) => setJpShowPins(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1 border-t border-slate-200/50 pt-1">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Fortschritts-Abdeckungsbalken</span>
                      <input 
                        type="checkbox"
                        checked={jpShowProgressBars}
                        onChange={(e) => setJpShowProgressBars(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* F. KEL CONTROLS */}
              {activeTemplate === 'kel' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Druck-Modus</label>
                    <div className="grid grid-cols-2 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[0.75rem] leading-tight">
                      <button onClick={() => setKelStudentMode('single')} className={`py-1.5 rounded-lg font-bold ${kelStudentMode === 'single' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500'}`}>Einzelnes Dossier</button>
                      <button onClick={() => setKelStudentMode('all')} className={`py-1.5 rounded-lg font-bold ${kelStudentMode === 'all' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500'}`}>Gesamte Klasse (A4 Batch)</button>
                    </div>
                  </div>

                  {kelStudentMode === 'single' && (
                    <div className="space-y-1.5">
                      <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Schüler:in selektieren</label>
                      <select
                        value={kelSelectedStudentId}
                        onChange={(e) => setKelSelectedStudentId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[0.75rem] leading-tight font-bold"
                      >
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.nachname} {s.vorname}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <span className="text-[0.59375rem] font-black uppercase text-slate-400 tracking-wider block">Dossier-Komponenten</span>
                    
                    <label className="flex items-center justify-between cursor-pointer py-1.5">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Noten & Leistungsdurchschnitt</span>
                      <input 
                        type="checkbox"
                        checked={kelShowGrades}
                        onChange={(e) => setKelShowGrades(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1.5">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Einschätzungsabgleich (Lehrperson/Kind)</span>
                      <input 
                        type="checkbox"
                        checked={kelShowSelfAssessment}
                        onChange={(e) => setKelShowSelfAssessment(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1.5">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Portfolio & Meilensteine</span>
                      <input 
                        type="checkbox"
                        checked={kelShowPortfolio}
                        onChange={(e) => setKelShowPortfolio(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1.5">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Beobachtungen & Notizen</span>
                      <input 
                        type="checkbox"
                        checked={kelShowObservations}
                        onChange={(e) => setKelShowObservations(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1.5">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Schulabsenzen & Fehlstunden</span>
                      <input 
                        type="checkbox"
                        checked={kelShowAbsences}
                        onChange={(e) => setKelShowAbsences(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* G. STUNDENPLAN CONTROLS */}
              {activeTemplate === 'stundenplan' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={spShowTimes}
                        onChange={(e) => setSpShowTimes(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600 border-slate-300"
                      />
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Stundenzeiten zeigen</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={spShowClassRoom}
                        onChange={(e) => setSpShowClassRoom(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600 border-slate-300"
                      />
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Klassenraum anzeigen</span>
                    </label>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none pt-2 border-t border-slate-100">
                    <input 
                      type="checkbox"
                      checked={spCompact}
                      onChange={(e) => setSpCompact(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-emerald-600 border-slate-300"
                    />
                    <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Kompaktes Taschenformat drucken</span>
                  </label>
                </div>
              )}

              {/* H. SCHÜLERPROFIL CONTROLS */}
              {activeTemplate === 'schuelerprofil' && (
                <div className="space-y-4 text-left">
                  <div className="space-y-1.5">
                    <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider">Druck-Umfang wählen:</span>
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setProfStudentMode('single')}
                        className={`flex-1 text-center py-1.5 text-[0.75rem] leading-tight font-bold rounded-lg transition-all ${profStudentMode === 'single' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500'}`}
                      >
                        Einzelner Schüler
                      </button>
                      <button
                        type="button"
                        onClick={() => setProfStudentMode('all')}
                        className={`flex-1 text-center py-1.5 text-[0.75rem] leading-tight font-bold rounded-lg transition-all ${profStudentMode === 'all' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500'}`}
                      >
                        Ganze Klasse
                      </button>
                    </div>
                  </div>

                  {profStudentMode === 'single' && (
                    <div className="space-y-1">
                      <label className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block">Schülerin / Schüler:</label>
                      <select
                        value={profSelectedStudentId}
                        onChange={(e) => setProfSelectedStudentId(e.target.value)}
                        className="w-full text-[0.75rem] leading-tight font-bold p-2.5 rounded-xl border border-slate-200 bg-white"
                      >
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.nachname} {s.vorname}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-2 pt-2 border-t border-slate-100 select-none">
                    <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block mb-1">Eigenschaften &amp; Bereiche filtern:</span>
                    
                    <label className="flex items-center justify-between cursor-pointer py-1">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Stammdaten einblenden</span>
                      <input 
                        type="checkbox"
                        checked={profShowStammdaten}
                        onChange={(e) => setProfShowStammdaten(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Fachleistungen &amp; Notenauswertung</span>
                      <input 
                        type="checkbox"
                        checked={profShowLeistungen}
                        onChange={(e) => setProfShowLeistungen(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Förderprofil &amp; pädagogischer Fokus</span>
                      <input 
                        type="checkbox"
                        checked={profShowFoerderprofil}
                        onChange={(e) => setProfShowFoerderprofil(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Diagnostikwerte einbinden</span>
                      <input 
                        type="checkbox"
                        checked={profShowDiagnostik}
                        onChange={(e) => setProfShowDiagnostik(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">KEL-Selbstreflexion ausdrucken</span>
                      <input 
                        type="checkbox"
                        checked={profShowKELReflexion}
                        onChange={(e) => setProfShowKELReflexion(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Klassenkasse &amp; Finanzen einbinden</span>
                      <input 
                        type="checkbox"
                        checked={profShowFinanzen}
                        onChange={(e) => setProfShowFinanzen(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">MIKA-D Status ausgeben</span>
                      <input 
                        type="checkbox"
                        checked={profShowMikaD}
                        onChange={(e) => setProfShowMikaD(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Verhalten, Präsenz &amp; Notizen</span>
                      <input 
                        type="checkbox"
                        checked={profShowVerhalten}
                        onChange={(e) => setProfShowVerhalten(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">KI-Portfolio Entwicklungsbericht</span>
                      <input 
                        type="checkbox"
                        checked={profShowKIPortfolio}
                        onChange={(e) => setProfShowKIPortfolio(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => setDossierPreviewOpen(true)}
                      className="mt-4 w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-[0.75rem] leading-tight flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      <Eye size={14} />
                      <span>Dossier-Vorschau &amp; Paginierung</span>
                    </button>
                  </div>
                </div>
              )}

              {/* XY. ELTERNBERICHT CONTROLS */}
              {activeTemplate === 'eltern_diagnostik' && (
                <div className="space-y-4 text-left">
                  <div className="space-y-1.5">
                    <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider">Druck-Umfang wählen:</span>
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button
                        onClick={() => setDiagStudentMode('single')}
                        className={`flex-1 py-1.5 text-center text-[0.75rem] leading-tight font-bold rounded-lg transition-all ${diagStudentMode === 'single' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-500'}`}
                      >
                        Einzelschüler
                      </button>
                      <button
                        onClick={() => setDiagStudentMode('all')}
                        className={`flex-1 py-1.5 text-center text-[0.75rem] leading-tight font-bold rounded-lg transition-all ${diagStudentMode === 'all' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-500'}`}
                      >
                        Ganze Klasse
                      </button>
                    </div>
                  </div>
                  
                  {diagStudentMode === 'single' && (
                    <div className="space-y-1.5">
                      <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block">Schüler:in wählen:</span>
                      <select 
                        value={diagSelectedStudentId} 
                        onChange={(e) => setDiagSelectedStudentId(e.target.value)}
                        className="w-full bg-slate-100 text-slate-700 text-[0.875rem] leading-snug font-bold border-none rounded-xl p-3 focus:ring-2 focus:ring-rose-500 appearance-none cursor-pointer"
                      >
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.nachname} {s.vorname}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-2 pt-2 border-t border-slate-100 select-none">
                    <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block mb-1">Eigenschaften filtern:</span>
                    
                    <label className="flex items-center justify-between cursor-pointer py-1">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Ergänzende Lehrperson-Notizen</span>
                      <input type="checkbox" checked={diagShowComments} onChange={(e) => setDiagShowComments(e.target.checked)} className="w-3.5 h-3.5 rounded text-rose-500" />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer py-1">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Diagramme & Verläufe drucken</span>
                      <input type="checkbox" checked={diagShowCharts} onChange={(e) => setDiagShowCharts(e.target.checked)} className="w-3.5 h-3.5 rounded text-rose-500" />
                    </label>
                  </div>
                </div>
              )}

              {/* I. KEL-PRÄSENTATION CONTROLS */}
              {activeTemplate === 'kel_presentation' && (
                <div className="space-y-4 text-left">
                  <div className="space-y-1.5">
                    <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider">Druck-Umfang wählen:</span>
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setKpStudentMode('single')}
                        className={`flex-1 text-center py-1.5 text-[0.75rem] leading-tight font-bold rounded-lg transition-all ${kpStudentMode === 'single' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500'}`}
                      >
                        Einzelner Schüler
                      </button>
                      <button
                        type="button"
                        onClick={() => setKpStudentMode('all')}
                        className={`flex-1 text-center py-1.5 text-[0.75rem] leading-tight font-bold rounded-lg transition-all ${kpStudentMode === 'all' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500'}`}
                      >
                        Ganze Klasse
                      </button>
                    </div>
                  </div>

                  {kpStudentMode === 'single' && (
                    <div className="space-y-1">
                      <label className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block">Schülerin / Schüler:</label>
                      <select
                        value={kpSelectedStudentId}
                        onChange={(e) => setKpSelectedStudentId(e.target.value)}
                        className="w-full text-[0.75rem] leading-tight font-bold p-2.5 rounded-xl border border-slate-200 bg-white"
                      >
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.nachname} {s.vorname}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-2 pt-2 border-t border-slate-100 select-none">
                    <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block mb-1">Präsentationsgitter konfigurieren:</span>
                    
                    <label className="flex items-center justify-between cursor-pointer py-1.5">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Leistungsdiagramm beilegen</span>
                      <input 
                        type="checkbox"
                        checked={kpShowRadarChart}
                        onChange={(e) => setKpShowRadarChart(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1.5">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Selbsteinschätzungs-Gitter drucken</span>
                      <input 
                        type="checkbox"
                        checked={kpShowSelfAssessment}
                        onChange={(e) => setKpShowSelfAssessment(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* J. SITZPLAN CONTROLS */}
              {activeTemplate === 'sitzplan' && (
                <div className="space-y-4 text-left">
                  <div className="p-3.5 bg-indigo-50 border border-indigo-150 rounded-2xl">
                    <p className="text-[0.6875rem] text-indigo-900 font-semibold leading-relaxed">
                      💡 <strong>Drucker-Hinweis:</strong> Dieses Dokument ist exklusiv für das <strong>A4-Querformat (Landscape)</strong> optimiert und zentriert alle platzierten Schüler-Tische und Zimmer-Objekte vollkommen automatisch.
                    </p>
                  </div>

                  <div className="space-y-2 pt-1 select-none">
                    <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block mb-1">Druck-Filter auswählen:</span>
                    
                    <label className="flex items-center justify-between cursor-pointer py-1.5">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Nur unbeschriftete Plätze (für Vertretung)</span>
                      <input 
                        type="checkbox"
                        checked={spShowChairsOnly}
                        onChange={(e) => setSpShowChairsOnly(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1.5">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Notenschnitt der Kinder anzeigen</span>
                      <input 
                        type="checkbox"
                        checked={spShowStudentNotes}
                        onChange={(e) => setSpShowStudentNotes(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1.5">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">DaZ-Status hervorheben</span>
                      <input 
                        type="checkbox"
                        checked={spShowStudentDaZ}
                        onChange={(e) => setSpShowStudentDaZ(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>

                    <div className="space-y-1.5 pt-3 border-t border-slate-100">
                      <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block">Position der Tafel / Vorne:</span>
                      <select 
                        value={spBoardPosition}
                        onChange={(e) => setSpBoardPosition(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[0.75rem] leading-tight font-bold bg-white"
                      >
                        <option value="top">Oben</option>
                        <option value="bottom">Unten</option>
                        <option value="left">Links</option>
                        <option value="right">Rechts</option>
                        <option value="none">Ausblenden</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* K. ÜBERGABEMAPPE CONTROLS */}
              {activeTemplate === 'uebergabemappe' && (
                <div className="space-y-4 text-left">
                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl mb-4 text-indigo-950 space-y-3 shadow-inner">
                    <p className="text-[0.75rem] font-bold leading-normal flex items-start gap-1.5">
                      <span className="text-[1.125rem] leading-normal">💡</span>
                      <span>
                        <strong>Pro-Cockpit Tipp:</strong> Für die vollständige Mappe mit Kalender-Zeiträumen, zuzuordnenden Stundenentwürfen und tagesgenauen Plänen nutzen Sie bitte das Cockpit:
                      </span>
                    </p>
                    <button
                      onClick={() => {
                        setApp(prev => ({
                          ...prev,
                          openPrintModalOnLoad: true
                        }));
                        setPage('uebergabemappe');
                      }}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[0.75rem] font-extrabold shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sliders size={14} />
                      Zum Übergabe-Cockpit wechseln
                    </button>
                  </div>

                  <div className="space-y-2 select-none">
                    <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block mb-1">Inhalt der Vertretungsmappe:</span>
                    
                    <label className="flex items-center justify-between cursor-pointer py-1">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Ordner-Deckblatt</span>
                      <input 
                        type="checkbox"
                        checked={umShowCoverPage}
                        onChange={(e) => setUmShowCoverPage(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Tagesablauf &amp; Fächer-Lehrstoff</span>
                      <input 
                        type="checkbox"
                        checked={umShowTagesplaene}
                        onChange={(e) => setUmShowTagesplaene(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Klassenliste mit Besonderheiten</span>
                      <input 
                        type="checkbox"
                        checked={umShowKlassenliste}
                        onChange={(e) => setUmShowKlassenliste(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Sitzplan-Skizze einfügen</span>
                      <input 
                        type="checkbox"
                        checked={umShowSitzplan}
                        onChange={(e) => setUmShowSitzplan(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1">
                      <span className="text-[0.75rem] leading-tight text-slate-600 font-bold">Supplier-Feedbackbogen beilegen</span>
                      <input 
                        type="checkbox"
                        checked={umShowFeedback}
                        onChange={(e) => setUmShowFeedback(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                    </label>
                  </div>

                  <div className="space-y-2.5 pt-3 border-t border-slate-150">
                    <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block">🚨 Notfallnummern &amp; Kontakte:</span>
                    
                    <div className="space-y-1.5">
                      <span className="text-[0.5625rem] uppercase font-bold text-slate-500">Direktion Name:</span>
                      <input 
                        type="text"
                        value={umSchulleitung}
                        onChange={(e) => setUmSchulleitung(e.target.value)}
                        className="w-full text-[0.75rem] leading-tight font-semibold p-2 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[0.5625rem] uppercase font-bold text-slate-500">Sekretariat Telefon:</span>
                      <input 
                        type="text"
                        value={umSekretariat}
                        onChange={(e) => setUmSekretariat(e.target.value)}
                        className="w-full text-[0.75rem] leading-tight font-semibold p-2 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[0.5625rem] uppercase font-bold text-slate-500">Nachbarklasse Päd-Kontakt:</span>
                      <input 
                        type="text"
                        value={umNachbarKlasse}
                        onChange={(e) => setUmNachbarKlasse(e.target.value)}
                        className="w-full text-[0.75rem] leading-tight font-semibold p-2 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <span className="text-[0.625rem] font-black uppercase text-rose-500 tracking-wider block flex items-center gap-1">
                        🤒 Krankheitsvertretung / Ausfall:
                      </span>
                      
                      <div className="space-y-1">
                        <span className="text-[0.5625rem] uppercase font-bold text-slate-500">Vertretungs-Zeitraum (z.B. Tage):</span>
                        <input 
                          type="text"
                          placeholder="z.B. Mo, 29.06. - Mi, 01.07. (3 Tage)"
                          value={umVertretungsZeitraum}
                          onChange={(e) => setUmVertretungsZeitraum(e.target.value)}
                          className="w-full text-[0.75rem] leading-tight font-semibold p-2 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[0.5625rem] uppercase font-bold text-slate-500">Aufgaben & Vertretungshinweise:</span>
                        <textarea 
                          placeholder="z.B. Arbeitsblätter im blauen Ordner verwenden; Deutsch-Buch S. 44-46 lesen..."
                          value={umKrankheitNotes}
                          onChange={(e) => setUmKrankheitNotes(e.target.value)}
                          className="w-full text-[0.75rem] leading-tight font-semibold p-2 rounded-lg border border-slate-200 bg-white min-h-[70px] resize-y"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Z. PDF EXPORT CONTROLS */}
              {activeTemplate === 'pdf_export' && (
                <div className="space-y-4 text-left">
                  <div className="space-y-1.5">
                    <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block">PDF-Dokument:</span>
                    <select 
                      value={pdfFormType} 
                      onChange={(e) => setPdfFormType(e.target.value as any)}
                      className="w-full bg-slate-100 text-slate-700 text-[0.875rem] leading-snug font-bold border-none rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                    >
                      <option value="foerder_uebersicht">Pädagogische Förderübersicht</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block">Schüler:in wählen:</span>
                    <select 
                      value={pdfStudentId} 
                      onChange={(e) => setPdfStudentId(e.target.value)}
                      className="w-full bg-slate-100 text-slate-700 text-[0.875rem] leading-snug font-bold border-none rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                    >
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.nachname} {s.vorname}</option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 mt-4">
                     <p className="text-[0.625rem] text-indigo-800 font-bold leading-relaxed">
                        Diese PDF ist eine pädagogische Arbeitsübersicht und kein amtlicher Bescheid. Prüfen Sie Inhalt und Empfängerkreis vor der Weitergabe.
                     </p>
                  </div>
                </div>
              )}

              {/* M. LOB-CARD CONTROLS */}
              {activeTemplate === 'lob_druckkarte' && (
                <div className="space-y-4 text-left">
                  <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-4 w-fit border border-slate-200">
                    <button 
                      onClick={() => setLobStudentMode('single')}
                      className={`px-4 py-2 rounded-lg text-[0.75rem] leading-tight font-bold transition-all ${lobStudentMode === 'single' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200/50'}`}
                    >
                      Einzelnes Kind
                    </button>
                    <button 
                      onClick={() => setLobStudentMode('all')}
                      className={`px-4 py-2 rounded-lg text-[0.75rem] leading-tight font-bold transition-all ${lobStudentMode === 'all' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200/50'}`}
                    >
                      Ganze Klasse (Sammeldruck)
                    </button>
                  </div>

                  {lobStudentMode === 'single' && (
                    <div className="space-y-1.5">
                      <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block">Schüler:in wählen:</span>
                      <select 
                        value={lobSelectedStudentId} 
                        onChange={(e) => setLobSelectedStudentId(e.target.value)}
                        className="w-full bg-slate-100 text-slate-700 text-[0.875rem] leading-snug font-bold border-none rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                      >
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.vorname} {s.nachname}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block">Lob-Vorlage:</span>
                    <select 
                      value={lobSelectedTemplate} 
                      onChange={(e) => {
                        setLobSelectedTemplate(e.target.value);
                        const templ = COMPLIMENT_TEMPLATES.find(t => t.id === e.target.value);
                        if (templ && !lobCustomText) {
                          setLobCustomText(templ.complimentText);
                        }
                      }}
                      className="w-full bg-slate-100 text-slate-700 text-[0.875rem] leading-snug font-bold border-none rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                    >
                      {COMPLIMENT_TEMPLATES.map(t => (
                        <option key={t.id} value={t.id}>{t.emoji} {t.themeName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block">Eigener Text (Optional):</span>
                    <textarea 
                      value={lobCustomText}
                      onChange={(e) => setLobCustomText(e.target.value)}
                      placeholder="Nutze die Vorlage oder schreibe einen eigenen Text..."
                      className="w-full bg-slate-100 text-slate-700 text-[0.75rem] leading-tight p-3 rounded-xl border border-slate-200 min-h-24 resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[0.625rem] uppercase font-bold text-slate-500">Absender / Grüße von:</span>
                    <input 
                      type="text"
                      value={lobSender}
                      onChange={(e) => setLobSender(e.target.value)}
                      className="w-full text-[0.75rem] leading-tight font-semibold p-2.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>
              )}

              {/* N. FEHLSTUNDEN CONTROLS */}
              {activeTemplate === 'fehlstunden' && (
                <div className="space-y-4 text-left">
                  <p className="text-[0.6875rem] text-slate-500 font-medium leading-relaxed">
                    Diese Vorlage wertet die erfassten Fehlstunden aller Schüler für das 1. Semester, das 2. Semester und das gesamte Schuljahr aus.
                  </p>
                  
                  <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100/50 space-y-2">
                    <h4 className="text-[0.6875rem] font-black text-emerald-800 uppercase tracking-wider">Semester-Regelung (Standard):</h4>
                    <p className="text-[0.625rem] text-emerald-700 font-bold leading-normal">
                      • 1. Semester: September bis Jänner<br />
                      • 2. Semester: Februar bis August
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <span className="text-[0.5625rem] uppercase font-bold text-slate-500">Eigener Titel für Bericht:</span>
                    <input 
                      type="text"
                      placeholder="z.B. Semester-Fehlstundenliste 2026"
                      value={customHeaderTitle}
                      onChange={(e) => setCustomHeaderTitle(e.target.value)}
                      className="w-full text-[0.75rem] leading-tight font-semibold p-2.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>
              )}

              {/* KASSENÜBERSICHT CONTROLS */}
              {activeTemplate === 'kassenuebersicht' && (
                <div className="space-y-4 text-left">
                  <p className="text-[0.6875rem] text-slate-500 font-medium leading-relaxed">
                    Druckbare Übersicht aller Einnahmen, Ausgaben und des Kassenstandes aus <strong>Kasse &amp; Orga</strong>.
                  </p>

                  {/* Zeitraum Auswahl */}
                  <div className="space-y-2">
                    <label className="text-[0.625rem] font-bold text-slate-500 uppercase tracking-widest block">
                      Zeitraum auswählen
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-[0.6875rem] font-bold">
                      <button
                        type="button"
                        onClick={() => setKoPeriodMode('schuljahr')}
                        className={`py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                          koPeriodMode === 'schuljahr'
                            ? 'bg-white text-indigo-700 shadow-2xs font-black'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Schuljahr
                      </button>
                      <button
                        type="button"
                        onClick={() => setKoPeriodMode('monat')}
                        className={`py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                          koPeriodMode === 'monat'
                            ? 'bg-white text-indigo-700 shadow-2xs font-black'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Monat
                      </button>
                      <button
                        type="button"
                        onClick={() => setKoPeriodMode('custom')}
                        className={`py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                          koPeriodMode === 'custom'
                            ? 'bg-white text-indigo-700 shadow-2xs font-black'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Frei (von/bis)
                      </button>
                    </div>
                  </div>

                  {/* Monat-Auswahl Details */}
                  {koPeriodMode === 'monat' && (
                    <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      <label className="text-[0.625rem] font-bold text-slate-600 uppercase tracking-wider block">
                        Monat wählen
                      </label>
                      <select
                        value={koSelectedMonth}
                        onChange={(e) => setKoSelectedMonth(e.target.value)}
                        className="w-full text-[0.75rem] font-bold p-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500"
                      >
                        {schoolYearMonths.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Freier Zeitraum Details */}
                  {koPeriodMode === 'custom' && (
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      <div className="space-y-1">
                        <label className="text-[0.5625rem] font-bold text-slate-600 uppercase tracking-wider block">
                          Von
                        </label>
                        <input
                          type="date"
                          value={koCustomStartDate}
                          onChange={(e) => setKoCustomStartDate(e.target.value)}
                          className="w-full text-[0.6875rem] font-bold p-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[0.5625rem] font-bold text-slate-600 uppercase tracking-wider block">
                          Bis
                        </label>
                        <input
                          type="date"
                          value={koCustomEndDate}
                          onChange={(e) => setKoCustomEndDate(e.target.value)}
                          className="w-full text-[0.6875rem] font-bold p-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Kategorie-Filter */}
                  <div className="space-y-1">
                    <label className="text-[0.625rem] font-bold text-slate-500 uppercase tracking-widest block">
                      Kategorie-Filter
                    </label>
                    <select
                      value={koCategoryFilter}
                      onChange={(e) => setKoCategoryFilter(e.target.value as any)}
                      className="w-full text-[0.75rem] font-bold p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">Alle Buchungen (Einnahmen &amp; Ausgaben)</option>
                      <option value="sammlung">Nur Einnahmen &amp; Sammlungen</option>
                      <option value="ausgabe">Nur Ausgaben</option>
                      <option value="sonstiges">Nur Sonstige Buchungen</option>
                    </select>
                  </div>

                  {/* Eigener Titel */}
                  <div className="space-y-1">
                    <span className="text-[0.5625rem] uppercase font-bold text-slate-500">Eigener Titel für Bericht:</span>
                    <input 
                      type="text"
                      placeholder="z.B. Kassenübersicht – Einnahmen & Ausgaben"
                      value={customHeaderTitle}
                      onChange={(e) => setCustomHeaderTitle(e.target.value)}
                      className="w-full text-[0.75rem] leading-tight font-semibold p-2.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>

                  {/* Optionen */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer text-[0.6875rem] font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={koShowKpiBanner}
                        onChange={(e) => setKoShowKpiBanner(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Finanz-Kennzahlen (KPI-Box) anzeigen</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-[0.6875rem] font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={koShowSignatures}
                        onChange={(e) => setKoShowSignatures(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Unterschriftenzeilen am Ende andrucken</span>
                    </label>
                  </div>
                </div>
              )}

              {/* O. SPEZIAL-TOOLS CONTROLS */}
              {activeTemplate === 'smart_tools' && (
                <div className="space-y-4 text-left">
                  <div className="space-y-1">
                    <label className="text-[0.625rem] font-bold text-slate-450 uppercase tracking-widest block">Spezial-Werkzeug wählen</label>
                    <select
                      value={activeSmartTool}
                      onChange={(e) => setActiveSmartTool(e.target.value as any)}
                      className="w-full bg-slate-100 text-slate-700 text-[0.875rem] leading-snug font-bold border-none rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer font-black text-indigo-950"
                    >
                      <option value="tischschilder">🪪 1. Klassen-Tischschilder</option>
                      <option value="urkunden">🏆 2. Motivations-Urkunden</option>
                      <option value="joker">🎟️ 3. Hausübungs- & Joker-Gutscheine</option>
                      <option value="pocket">🎒 4. Taschen-Notfall-Klassenliste</option>
                      <option value="labels">🏷️ 5. Klassenzimmer-Beschriftungen</option>
                      <option value="ids">💳 6. Namenskarten (Miniformat)</option>
                      <option value="birthday">📅 7. Klassen-Geburtstagskalender</option>
                      <option value="jobs">🧹 8. Klassendienste-Plakat</option>
                      <option value="meeting">💬 9. Sprechtag-Terminkärtchen</option>
                      <option value="queue">🖨️ 10. Multi-Page Bulk Queue Manager</option>
                    </select>
                  </div>

                  {/* Sub-controls based on activeSmartTool */}
                  {activeSmartTool === 'tischschilder' && (
                    <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-150 rounded-2xl">
                      <h4 className="text-[0.6875rem] font-black uppercase text-slate-550">Tischschild-Design</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'dino', label: '🦖 Dino-Abenteuer' },
                          { id: 'space', label: '🚀 Weltraum-Crew' },
                          { id: 'ocean', label: '🐬 Meeres-Forscher' },
                          { id: 'minimal', label: '✨ Minimal-Schick' }
                        ].map(st => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setStTischStyle(st.id as any)}
                            className={`p-2 rounded-xl text-[0.71875rem] font-black border text-center transition-all cursor-pointer ${stTischStyle === st.id ? 'bg-indigo-650 border-indigo-650 text-white shadow-2xs' : 'bg-white border-slate-200 text-slate-700'}`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                        <input
                          type="checkbox"
                          checked={stTischShowHelper}
                          onChange={(e) => setStTischShowHelper(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-indigo-600 border-slate-300"
                        />
                        <span className="text-[0.71875rem] font-bold text-slate-600">Zeige ABC-Leiste & Zahlenraum 20</span>
                      </label>

                      <div className="space-y-1">
                        <span className="text-[0.5625rem] font-black text-slate-400 uppercase">Druck-Modus</span>
                        <select
                          value={stTischStudentId}
                          onChange={(e) => setStTischStudentId(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-[0.75rem] p-2 rounded-xl font-bold font-black text-indigo-950"
                        >
                          <option value="all">Alle Kinder drucken (Sammeldruck)</option>
                          {students.map(s => (
                            <option key={s.id} value={s.id}>{s.vorname} {s.nachname}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {activeSmartTool === 'urkunden' && (
                    <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-150 rounded-2xl">
                      <h4 className="text-[0.6875rem] font-black uppercase text-slate-550">Urkunden-Typ</h4>
                      <select
                        value={stUrkundeType}
                        onChange={(e) => {
                          const type = e.target.value as any;
                          setStUrkundeType(type);
                          if (type === 'rechnen') {
                            setStUrkundeTitle('Urkunde: Rechen-Meister/in 🧮');
                            setStUrkundeText('für herausragende Leistungen beim Rechnen im Zahlenraum 100 und die erfolgreiche Bewältigung aller Mathe-Quests!');
                          } else if (type === 'lesen') {
                            setStUrkundeTitle('Urkunde: Lese-König/in 👑');
                            setStUrkundeText('für unermüdlichen Leseeifer, großartige Fortschritte beim lauten Vorlesen und die Liebe zu spannenden Geschichten!');
                          } else if (type === 'helfer') {
                            setStUrkundeTitle('Urkunde: Hilfsbereite Hand 🤝');
                            setStUrkundeText('für besonders vorbildliches Sozialverhalten, Hilfsbereitschaft in der Klasse und ein großes Herz für andere Kinder.');
                          } else if (type === 'sport') {
                            setStUrkundeTitle('Urkunde: Sport-Ass 🏆');
                            setStUrkundeText('für fantastischen sportlichen Einsatz, Fairness im Spiel und tolle Ausdauer beim Bewegungstag.');
                          }
                        }}
                        className="w-full bg-white border border-slate-200 text-[0.75rem] p-2 rounded-xl font-bold font-black text-indigo-950"
                      >
                        <option value="rechnen">🧮 Rechen-Meister/in</option>
                        <option value="lesen">👑 Lese-König/in</option>
                        <option value="helfer">🤝 Hilfsbereite Hand</option>
                        <option value="sport">🏆 Sport-Ass</option>
                        <option value="custom">✏️ Eigene Urkunde gestalten</option>
                      </select>

                      <div className="space-y-1">
                        <span className="text-[0.5625rem] font-black text-slate-400 uppercase">Titel der Urkunde</span>
                        <input
                          type="text"
                          value={stUrkundeTitle}
                          onChange={(e) => setStUrkundeTitle(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-[0.75rem] p-2 rounded-xl font-bold text-slate-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[0.5625rem] font-black text-slate-400 uppercase">Begründungstext</span>
                        <textarea
                          value={stUrkundeText}
                          onChange={(e) => setStUrkundeText(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-[0.75rem] p-2 rounded-xl font-semibold h-16 resize-none text-slate-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[0.5625rem] font-black text-slate-400 uppercase">Ausstellungsdatum</span>
                        <input
                          type="text"
                          value={stUrkundeDate}
                          onChange={(e) => setStUrkundeDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-[0.75rem] p-2 rounded-xl font-bold text-slate-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[0.5625rem] font-black text-slate-400 uppercase">Für wen drucken?</span>
                        <select
                          value={stUrkundeStudentId}
                          onChange={(e) => setStUrkundeStudentId(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-[0.75rem] p-2 rounded-xl font-bold font-black text-indigo-950"
                        >
                          <option value="all">Alle Kinder (Sammelurkunde)</option>
                          {students.map(s => (
                            <option key={s.id} value={s.id}>{s.vorname} {s.nachname}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {activeSmartTool === 'joker' && (
                    <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-150 rounded-2xl">
                      <h4 className="text-[0.6875rem] font-black uppercase text-slate-550">Gutschein-Thema</h4>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { id: 'homework', label: '✍️ Hausübung' },
                          { id: 'reading', label: '📖 Lesen' },
                          { id: 'custom', label: '✏️ Custom' }
                        ].map(jk => (
                          <button
                            key={jk.id}
                            type="button"
                            onClick={() => {
                              setStJokerType(jk.id as any);
                              if (jk.id === 'homework') {
                                setStJokerTitle('Hausübungs-Joker 🌟');
                                setStJokerText('Gilt einmalig für eine vergessene Hausübung. Du bist spitze!');
                              } else if (jk.id === 'reading') {
                                setStJokerTitle('Lese-Joker 📚');
                                setStJokerText('Gilt für 15 Minuten Extra-Schmökern in der Lese-Ecke!');
                              }
                            }}
                            className={`p-1.5 rounded-lg text-[0.65rem] font-bold border text-center transition-all ${stJokerType === jk.id ? 'bg-amber-600 text-white border-amber-650' : 'bg-white border-slate-200 text-slate-700'}`}
                          >
                            {jk.label}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-1">
                        <span className="text-[0.5625rem] font-black text-slate-400 uppercase">Titel des Gutscheins</span>
                        <input
                          type="text"
                          value={stJokerTitle}
                          onChange={(e) => setStJokerTitle(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-[0.75rem] p-2 rounded-xl font-bold text-slate-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[0.5625rem] font-black text-slate-400 uppercase">Gutschein-Text</span>
                        <textarea
                          value={stJokerText}
                          onChange={(e) => setStJokerText(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-[0.75rem] p-2 rounded-xl font-semibold h-16 resize-none text-slate-800"
                        />
                      </div>
                    </div>
                  )}

                  {activeSmartTool === 'labels' && (
                    <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-150 rounded-2xl">
                      <div className="flex justify-between items-center">
                        <h4 className="text-[0.6875rem] font-black uppercase text-slate-550">Labels bearbeiten</h4>
                        <span className="text-[0.5625rem] text-slate-400 font-bold">{stLabels.length} aktiv</span>
                      </div>

                      <div className="space-y-1 max-h-40 overflow-y-auto bg-white p-2 rounded-xl border border-slate-200/60">
                        {stLabels.map((lbl, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-1 text-[0.75rem] bg-slate-50 p-1.5 rounded border border-slate-100 text-slate-800 font-bold">
                            <span className="font-semibold truncate">{lbl}</span>
                            <button
                              type="button"
                              onClick={() => setStLabels(stLabels.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Z.B. 🎨 Mal-Farben"
                          value={stNewLabelText}
                          onChange={(e) => setStNewLabelText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && stNewLabelText.trim()) {
                              setStLabels([...stLabels, stNewLabelText.trim()]);
                              setStNewLabelText('');
                            }
                          }}
                          className="flex-1 text-[0.75rem] p-2 border border-slate-200 rounded-xl bg-white text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (stNewLabelText.trim()) {
                              setStLabels([...stLabels, stNewLabelText.trim()]);
                              setStNewLabelText('');
                            }
                          }}
                          className="px-2.5 bg-slate-900 text-white rounded-xl text-[0.75rem] font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}

                  {activeSmartTool === 'ids' && (
                    <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-150 rounded-2xl">
                      <div className="space-y-1">
                        <span className="text-[0.5625rem] font-black text-slate-400 uppercase">Schulname für Namenskarten</span>
                        <input
                          type="text"
                          value={stSchoolName}
                          onChange={(e) => setStSchoolName(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-[0.75rem] p-2 rounded-xl font-bold text-slate-850"
                        />
                      </div>
                      <p className="text-[0.5625rem] text-slate-400 italic font-bold">
                        Generiert Namenskarten im Format 85 × 54 mm. Sie sind ausdrücklich keine amtlichen Schülerausweise und enthalten keinen Gültigkeitsnachweis.
                      </p>
                    </div>
                  )}

                  {activeSmartTool === 'birthday' && (
                    <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                      <p className="text-[0.6875rem] text-indigo-800 font-bold leading-relaxed">
                        📅 <strong>Klassen-Geburtstagskalender:</strong> Dieser Poster-Druck listet alle Schüler sortiert nach ihren Geburtstagsmonaten auf. Ideal als Wandplakat im Klassenzimmer!
                      </p>
                    </div>
                  )}

                  {activeSmartTool === 'jobs' && (
                    <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-150 rounded-2xl">
                      <h4 className="text-[0.6875rem] font-black uppercase text-slate-550">Dienste zuteilen</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {Object.keys(stJobs).map(job => (
                          <div key={job} className="space-y-0.5 text-left bg-white p-2 rounded-xl border border-slate-200/60">
                            <span className="text-[0.6875rem] font-black text-slate-700 block">{job}</span>
                            <select
                              value={stJobs[job]}
                              onChange={(e) => setStJobs({ ...stJobs, [job]: e.target.value })}
                              className="w-full text-[0.6875rem] p-1 bg-slate-50 border border-slate-200 rounded-lg font-bold font-black text-indigo-950"
                            >
                              <option value="">— Keiner —</option>
                              {students.map(s => (
                                <option key={s.id} value={s.id}>{s.vorname} {s.nachname}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeSmartTool === 'meeting' && (
                    <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-150 rounded-2xl">
                      <div className="space-y-1">
                        <span className="text-[0.5625rem] font-black text-slate-400 uppercase">Sprechtag-Datum</span>
                        <input
                          type="text"
                          value={stMeetingDate}
                          onChange={(e) => setStMeetingDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-[0.75rem] p-2 rounded-xl font-bold text-slate-800"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <span className="text-[0.5625rem] font-black text-slate-400 uppercase">Raum / Ort</span>
                        <input
                          type="text"
                          value={stMeetingRoom}
                          onChange={(e) => setStMeetingRoom(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-[0.75rem] p-2 rounded-xl font-bold text-slate-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[0.5625rem] font-black text-slate-400 uppercase">Mitzubringen</span>
                        <input
                          type="text"
                          value={stMeetingDocs}
                          onChange={(e) => setStMeetingDocs(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-[0.75rem] p-2 rounded-xl font-bold text-slate-800"
                        />
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <span className="text-[0.5625rem] font-black text-slate-400 uppercase block">Uhrzeiten zuteilen:</span>
                        <div className="max-h-36 overflow-y-auto space-y-1 bg-white p-2 rounded-xl border border-slate-200/60">
                          {students.map(s => (
                            <div key={s.id} className="flex items-center justify-between gap-1 text-[0.6875rem]">
                              <span className="truncate font-bold text-slate-700">{s.vorname} {s.nachname.substring(0,1)}.</span>
                              <input
                                type="text"
                                placeholder="z.B. 14:00"
                                value={stMeetingTimes[s.id] || ''}
                                onChange={(e) => setStMeetingTimes({ ...stMeetingTimes, [s.id]: e.target.value })}
                                className="w-16 text-center text-[0.6875rem] p-1 border border-slate-200 rounded text-slate-800 font-bold"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSmartTool === 'queue' && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl space-y-1.5">
                      <h4 className="text-[0.6875rem] font-black uppercase text-emerald-800">Druck-Warteschlange</h4>
                      <p className="text-[0.5625rem] text-emerald-700 leading-normal">
                        Sparen Sie Zeit! Sie können mit der Warteschlange ein gebündeltes PDF drucken, das nacheinander verschiedene Dokumententypen (z.B. Klassenliste + KEL-Bögen aller Kinder) in einem einzigen Druckauftrag zusammenstellt.
                      </p>
                      <button
                        type="button"
                        onClick={handleTriggerPrint}
                        className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg text-[0.6875rem] font-black uppercase"
                      >
                        In einem Rutsch drucken
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick print helper tips */}
            <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-3xl space-y-2.5">
              <div className="flex items-center gap-2 text-indigo-700">
                <Info size={16} />
                <span className="text-[0.75rem] leading-tight font-black uppercase tracking-wider">Drucktipps für optimale Ergebnisse</span>
              </div>
              <ul className="text-[0.625rem] text-slate-500 font-bold space-y-1.5 leading-relaxed list-disc list-inside">
                <li>Stellen Sie das Ziel im Browser auf <strong>"Als PDF speichern"</strong> oder wählen Sie Ihren physischen Drucker.</li>
                <li>Haken Sie in den <em>"Mehr Einstellungen"</em> des Druckdialogs den Punkt <strong>"Hintergrundgrafiken" an</strong>, um Rasterstriche zu sehen.</li>
                <li>Haken Sie das Kontrollfeld <strong>"Kopf- und Fußzeilen" ab</strong>, um störenden URL-Text auszublenden.</li>
              </ul>
            </div>
            
          </div>

          {/* Right Panel: Interactive Live PDF Simulator (A4 Aspect Ratio Sheet inside editor Frame) */}
          <div className="lg:col-span-7 space-y-3">
            {/* Primary Action Bar above Preview */}
            <div className="bg-slate-900 text-white p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 no-print shadow-md">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-emerald-400" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-200">SCHRITT 3: Vorschau &amp; Druck</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTriggerPrint}
                  disabled={students.length === 0}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-3xs active:scale-95 disabled:opacity-50"
                >
                  <Printer size={15} strokeWidth={2.5} />
                  <span>🖨️ Drucken (A4)</span>
                </button>

                <button
                  type="button"
                  onClick={handleTriggerPrint}
                  disabled={students.length === 0}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 border border-slate-700"
                >
                  <Download size={14} />
                  <span>📄 als PDF speichern</span>
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center no-print pt-1">
              <div className="flex items-center gap-2 text-slate-500">
                <span className="text-[0.625rem] font-black uppercase tracking-wider">Simuliertes A4 Blatt</span>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Dynamic Zoom Controls */}
                <div className="flex flex-wrap items-center gap-2 bg-slate-100/90 px-3 py-1.5 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[0.5625rem] font-black uppercase text-slate-400 tracking-widest select-none">Zoom:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewZoom(z => Math.max(0.3, parseFloat((z - 0.05).toFixed(2))))}
                      className="w-5 h-5 flex items-center justify-center text-[0.6875rem] font-black text-slate-500 bg-white hover:bg-slate-50 hover:text-indigo-600 border border-slate-200 rounded-md shadow-3xs cursor-pointer active:scale-95 select-none"
                      title="Vorschau verkleinern (-5%)"
                    >
                      －
                    </button>
                    <input
                      type="range"
                      min="0.3"
                      max="1.2"
                      step="0.05"
                      className="w-20 accent-indigo-600 h-1 bg-slate-200 rounded-lg cursor-pointer"
                      value={previewZoom}
                      onChange={(e) => setPreviewZoom(parseFloat(e.target.value))}
                    />
                    <button
                      type="button"
                      onClick={() => setPreviewZoom(z => Math.min(1.2, parseFloat((z + 0.05).toFixed(2))))}
                      className="w-5 h-5 flex items-center justify-center text-[0.6875rem] font-black text-slate-500 bg-white hover:bg-slate-50 hover:text-indigo-600 border border-slate-200 rounded-md shadow-3xs cursor-pointer active:scale-95 select-none"
                      title="Vorschau vergrößern (+5%)"
                    >
                      ＋
                    </button>
                  </div>
                  <span className="text-[0.625rem] font-black text-indigo-750 min-w-[36px] text-center select-none bg-indigo-50/50 px-1.5 py-0.5 rounded border border-indigo-100">
                    {Math.round(previewZoom * 100)}%
                  </span>
                  <div className="flex items-center gap-1 border-l border-slate-250/60 pl-2">
                    <button
                      type="button"
                      onClick={() => setPreviewZoom(printOrientation === 'portrait' ? 0.7 : 0.55)}
                      className="px-2 py-1 text-[0.5625rem] font-black text-indigo-700 hover:text-indigo-800 bg-white hover:bg-indigo-50 border border-indigo-200/50 rounded-lg transition-all active:scale-90 cursor-pointer uppercase tracking-wider"
                      title="Zurücksetzen auf Standardgröße"
                    >
                      Auto-Fit
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewZoom(1.0)}
                      className="px-2 py-1 text-[0.5625rem] font-black text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all active:scale-90 cursor-pointer uppercase tracking-wider"
                      title="100% Originalgröße"
                    >
                      100%
                    </button>
                  </div>
                </div>

                <span className="text-[0.625rem] text-indigo-700 font-black uppercase tracking-wider bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 select-none">
                  {printOrientation === 'portrait' ? 'Hochformat' : 'Querformat'}
                </span>
              </div>
            </div>

            {/* Simulated Frame with dynamic scaling */}
            <div className="bg-slate-100 rounded-3xl p-4 md:p-8 flex flex-col items-center justify-start overflow-auto shadow-inner border border-slate-200/60 no-print flex-1 w-full scrollbar-thin" style={{ minHeight: '440px', maxHeight: '85vh' }}>
              {isMultiPageTemplate ? (
                /* Multi-page template rendering as a column of beautiful A4 sheets */
                <div 
                  style={{
                    transform: `scale(${previewZoom})`,
                    transformOrigin: 'top center',
                    width: printOrientation === 'portrait' ? '210mm' : '297mm',
                    marginBottom: `calc((1 - ${previewZoom}) * -100%)`, // dynamic offset of scaling whitespace
                  }}
                  className={`interactive-dossier-preview ${printOrientation === 'landscape' ? 'landscape' : ''} shrink-0 transition-all duration-300 flex flex-col gap-6 pb-20`}
                >
                  {renderPreviewTemplate()}
                </div>
              ) : (
                /* Single-page template rendering with scroll backup on overflow */
                <div 
                  style={{
                    width: `${(printOrientation === 'portrait' ? 210 : 297) * previewZoom}mm`,
                    height: `${(printOrientation === 'portrait' ? 297 : 210) * previewZoom}mm`,
                    overflow: 'auto',
                    position: 'relative',
                  }}
                  className="shrink-0 transition-all duration-300 shadow-2xl rounded-sm border border-slate-350 bg-white scrollbar-none"
                >
                  <div 
                    style={{
                      width: printOrientation === 'portrait' ? '210mm' : '297mm',
                      minHeight: printOrientation === 'portrait' ? '297mm' : '210mm',
                      height: 'auto',
                      padding: `${printMargin}mm`,
                      transform: `scale(${previewZoom})`,
                      transformOrigin: 'top left',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                    }}
                    className={`bg-white font-sans text-black select-none shrink-0 single-sheet-preview ${getFontSizeClass()}`}
                  >
                    {/* 1. Dynamic Print Header */}
                    {showMainHeader && activeTemplate !== 'klassenbuch' && activeTemplate !== 'schueler_wochenplan' && (
                      <PrintHeader title={customHeaderTitle || undefined} />
                    )}

                    {/* 2. Core Template Sheet Contents rendering */}
                    <div style={{ color: '#000000' }} className="w-full text-black">
                      {renderPreviewTemplate()}
                    </div>
                    
                    {/* Simulated Footer */}
                    {activeTemplate !== 'schueler_wochenplan' && <div className="mt-8 pt-4 border-t border-slate-200/80 flex justify-between items-center text-[0.5625rem] text-slate-400 font-bold uppercase tracking-widest leading-none">
                      <span>Dokument gedruckt im Schul-Druckzentrum</span>
                      <span>Seite 1 / 1</span>
                    </div>}
                  </div>
                </div>
              )}
            </div>

            {/* --- HIDDEN RAW PRINT ELEMENT (Active when window.print() is called) --- */}
            <div className={`print-center-overlay hidden print:block w-full bg-white`}>
              {activeTemplate === 'klassenbuch' && kbMode !== 'single' ? (
                // Multi-page batch printing for Klassenbuch
                getKbWeeksToRender().map((kw) => (
                  <div key={kw} className="page-break klassenbuch-a4-page bg-white animate-none opacity-100 visible">
                    {showMainHeader && activeTemplate !== 'klassenbuch' && <PrintHeader title={customHeaderTitle || undefined} />}
                    {renderSingleKlassenbuchPage(kw)}
                  </div>
                ))
              ) : activeTemplate === 'kel' && kelStudentMode === 'all' ? (
                // Multi-page batch printing
                students.map((st, i) => (
                  <div key={st.id} className="page-break bg-white" style={{ padding: `${printMargin}mm` }}>
                    {showMainHeader && <PrintHeader title={customHeaderTitle || `Schüler-Dossier: ${st.nachname} ${st.vorname}`} />}
                    {renderSingleKelPortfolio(st)}
                  </div>
                ))
              ) : activeTemplate === 'eltern_diagnostik' && diagStudentMode === 'all' ? (
                // Multi-page bulk printing for Elternbericht
                students.map((st, i) => (
                  <div key={st.id} className="page-break bg-white" style={{ padding: `${printMargin}mm` }}>
                    {showMainHeader && <PrintHeader title={customHeaderTitle || `Diagnosen & Lernstand: ${st.nachname} ${st.vorname}`} />}
                    {renderSingleElternDiagnostik(st)}
                  </div>
                ))
              ) : activeTemplate === 'schuelerprofil' && profStudentMode === 'all' ? (
                // Multi-page bulk printing for profiles
                students.map((st, i) => (
                  <div key={st.id} className="page-break bg-white" style={{ padding: `${printMargin}mm` }}>
                    {showMainHeader && <PrintHeader title={customHeaderTitle || `Schülerprofil: ${st.nachname} ${st.vorname}`} />}
                    {renderSingleStudentProfile(st)}
                  </div>
                ))
              ) : activeTemplate === 'kel_presentation' && kpStudentMode === 'all' ? (
                // Multi-page bulk printing for presentations
                students.map((st, i) => (
                  <div key={st.id} className="page-break bg-white" style={{ padding: `${printMargin}mm` }}>
                    {showMainHeader && <PrintHeader title={customHeaderTitle || `KEL-Präsentation: ${st.nachname} ${st.vorname}`} />}
                    {renderSingleKelPresentation(st)}
                  </div>
                ))
              ) : (
                // Regular single page printing
                <div
                  className={activeTemplate === 'klassenbuch' ? 'klassenbuch-a4-page' : activeTemplate === 'schueler_wochenplan' ? 'schueler-wochenplan-a4-page' : undefined}
                  style={activeTemplate === 'klassenbuch' || activeTemplate === 'schueler_wochenplan'
                    ? undefined : { padding: `${printMargin}mm` }}
                >
                  {showMainHeader && activeTemplate !== 'klassenbuch' && activeTemplate !== 'schueler_wochenplan'
                    && <PrintHeader title={customHeaderTitle || undefined} />}
                  {renderPreviewTemplate()}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Interactive Dossier-Vorschau Modal */}
      {dossierPreviewOpen && (
        <div id="dossier-preview-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[999999] flex flex-col md:flex-row no-print">
          
          {/* Left Panel / Sidebar: Configuration & Controls */}
          <div id="dossier-preview-sidebar" className="w-full md:w-[360px] bg-white border-r border-slate-200 flex flex-col h-full shadow-2xl shrink-0">
            {/* Modal Header */}
            <div id="dossier-preview-sidebar-header" className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0 border border-indigo-100">
                  <Eye size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-[0.9375rem] font-black text-slate-800 tracking-tight">Dossier-Druckvorschau</h3>
                  <p className="text-slate-400 text-[0.5625rem] font-bold uppercase tracking-wider mt-0.5">Paginierung &amp; Tabs filtern</p>
                </div>
              </div>
              <button 
                id="dossier-preview-close-btn"
                type="button"
                onClick={() => setDossierPreviewOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Config Controls Scroll Area */}
            <div id="dossier-preview-sidebar-body" className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Student Selector */}
              <div className="space-y-1.5">
                <label className="text-[0.625rem] font-black uppercase text-slate-450 tracking-wider block">Schülerin / Schüler auswählen:</label>
                <select
                  value={profSelectedStudentId}
                  onChange={(e) => setProfSelectedStudentId(e.target.value)}
                  className="w-full text-[0.75rem] p-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.nachname} {s.vorname}</option>
                  ))}
                </select>
              </div>

              {/* Dynamic Pages / Tabs Toggle Section */}
              <div className="space-y-3.5 pt-4 border-t border-slate-100">
                <span className="text-[0.625rem] font-black uppercase text-slate-450 tracking-wider block">Dossier-Bereiche (Seiten) filtern:</span>
                
                <div className="space-y-2 select-none">
                  {[
                    { id: 'stammdaten', label: 'I. Stammdaten', desc: 'Grunddaten ohne SV-Nummer und Elternkontakte', checked: profShowStammdaten, setter: setProfShowStammdaten },
                    { id: 'kontakte', label: 'Kontaktdaten', desc: 'Adresse & Elternkontakte bewusst zusätzlich', checked: profShowContacts, setter: setProfShowContacts },
                    { id: 'finanzen', label: 'II. Finanzen & Beiträge', desc: 'Klassenkasse & Geldsammlungen', checked: profShowFinanzen, setter: setProfShowFinanzen },
                    { id: 'leistungen', label: 'III. Fachleistungen & Noten', desc: 'Notengitter & Notenspiegel', checked: profShowLeistungen, setter: setProfShowLeistungen },
                    { id: 'mikaD', label: 'IV. MIKA-D Sprachstand', desc: 'AO / Ordentliche DaZ Einstufung', checked: profShowMikaD, setter: setProfShowMikaD },
                    { id: 'verhalten', label: 'V. Sozialverhalten & Präsenz', desc: 'Verhaltensampel & Fehlstunden', checked: profShowVerhalten, setter: setProfShowVerhalten },
                    { id: 'kel', label: 'VI. KEL Selbstreflexion', desc: 'Schülereinschätzung & Notizen', checked: profShowKELReflexion, setter: setProfShowKELReflexion },
                    { id: 'diagnostik', label: 'VII. Pädagogische Erhebungen', desc: 'Dokumentierte Tests & 1:1-Protokolle', checked: profShowDiagnostik, setter: setProfShowDiagnostik },
                    { id: 'foerderprofil', label: 'VIII. Pädagogischer Förderplan', desc: 'Stärken & konkrete Förderziele', checked: profShowFoerderprofil, setter: setProfShowFoerderprofil },
                    { id: 'kiPortfolio', label: 'IX. KI-Zusammenfassung', desc: 'Gespeicherter KI-Entwurf · vor Weitergabe prüfen', checked: profShowKIPortfolio, setter: setProfShowKIPortfolio },
                  ].map((item) => (
                    <label key={item.id} className="flex items-start justify-between cursor-pointer p-2.5 rounded-xl border border-slate-150 hover:bg-slate-50 hover:border-slate-200 transition-all">
                      <div className="space-y-0.5 text-left">
                        <p className="text-[0.71875rem] font-extrabold text-slate-800 leading-none">{item.label}</p>
                        <p className="text-[0.53125rem] text-slate-400 font-bold leading-tight">{item.desc}</p>
                      </div>
                      <input 
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => item.setter(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 shrink-0 mt-0.5 cursor-pointer"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setProfShowStammdaten(true);
                    setProfShowContacts(true);
                    setProfShowFinanzen(true);
                    setProfShowLeistungen(true);
                    setProfShowMikaD(true);
                    setProfShowVerhalten(true);
                    setProfShowKELReflexion(true);
                    setProfShowDiagnostik(true);
                    setProfShowFoerderprofil(true);
                    setProfShowKIPortfolio(true);
                  }}
                  className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[0.625rem] font-black text-slate-700 transition-colors uppercase tracking-wider cursor-pointer"
                >
                  Alle einblenden
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfShowStammdaten(false);
                    setProfShowContacts(false);
                    setProfShowFinanzen(false);
                    setProfShowLeistungen(false);
                    setProfShowMikaD(false);
                    setProfShowVerhalten(false);
                    setProfShowKELReflexion(false);
                    setProfShowDiagnostik(false);
                    setProfShowFoerderprofil(false);
                    setProfShowKIPortfolio(false);
                  }}
                  className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[0.625rem] font-black text-slate-700 transition-colors uppercase tracking-wider cursor-pointer"
                >
                  Alle ausblenden
                </button>
              </div>
            </div>

            {/* Sidebar Footer with Export Button */}
            <div id="dossier-preview-sidebar-footer" className="p-6 border-t border-slate-100 bg-slate-50 space-y-3">
              {/* Dynamic Page Counter */}
              <div className="flex justify-between items-center text-[0.6875rem] font-bold text-slate-500">
                <span>Voraussichtliche Paginierung:</span>
                <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded font-mono font-black">
                  {(() => {
                    let pCount = 0;
                    if (profShowStammdaten || profShowFinanzen) pCount++;
                    if (profShowLeistungen || profShowMikaD) pCount++;
                    if (profShowVerhalten || (profShowKELReflexion && getKelDataForStudent(profSelectedStudentId))) pCount++;
                    if (profShowDiagnostik || profShowFoerderprofil) pCount++;
                    if (profShowKIPortfolio) pCount++;
                    return pCount;
                  })()} Seiten
                </span>
              </div>

              {/* Main PDF Export Button */}
              <button
                type="button"
                onClick={() => {
                  const options = {
                    showStammdaten: profShowStammdaten,
                    showContacts: profShowContacts,
                    showFinanzen: profShowFinanzen,
                    showLeistungen: profShowLeistungen,
                    showMikaD: profShowMikaD,
                    showVerhalten: profShowVerhalten,
                    showKELReflexion: profShowKELReflexion,
                    showDiagnostik: profShowDiagnostik,
                    showFoerderprofil: profShowFoerderprofil,
                    showKIPortfolio: profShowKIPortfolio,
                  };
                  exportSchuelerPDF(profSelectedStudentId, app, options);
                }}
                className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-[0.75rem] uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Download size={14} strokeWidth={2.5} />
                <span>PDF-Export starten</span>
              </button>

              <button
                type="button"
                onClick={handleTriggerPrint}
                className="w-full px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-black text-[0.75rem] uppercase tracking-wider text-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Printer size={13} />
                <span>Direkt drucken (A4)</span>
              </button>
            </div>
          </div>

          {/* Right Panel: Simulated Sheets Scroller */}
          <div id="dossier-preview-main" className="flex-1 bg-slate-100 flex flex-col h-full overflow-hidden">
            {/* Top Toolbar */}
            <div id="dossier-preview-toolbar" className="h-[64px] bg-white border-b border-slate-200 px-6 flex justify-between items-center shrink-0">
              <span className="text-[0.6875rem] font-bold text-slate-500 text-left">
                Aktueller Schüler: <strong className="text-slate-800">{(() => {
                  const s = students.find(x => x.id === profSelectedStudentId);
                  return s ? `${s.vorname} ${s.nachname}` : '—';
                })()}</strong>
              </span>

              {/* Zoom Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDossierZoom(prev => Math.max(0.3, prev - 0.05))}
                  className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm cursor-pointer"
                >
                  -
                </button>
                <span className="text-[0.6875rem] font-mono font-black text-slate-700 min-w-[40px] text-center">
                  {Math.round(dossierZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setDossierZoom(prev => Math.min(1.2, prev + 0.05))}
                  className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm cursor-pointer"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setDossierZoom(0.65)}
                  className="ml-2 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[0.5625rem] font-black uppercase text-slate-500 cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Scrollable Sheets Canvas */}
            <div id="dossier-preview-scroll-container" className="flex-1 overflow-auto p-8 flex flex-col items-center">
              <div 
                className="interactive-dossier-preview"
                style={{
                  transform: `scale(${dossierZoom})`,
                  transformOrigin: 'top center',
                  width: '210mm',
                  marginBottom: `${(1 - dossierZoom) * -100}px` // offsets scaling whitespace
                }}
              >
                {(() => {
                  const targetSt = students.find(s => s.id === profSelectedStudentId) || students[0];
                  if (!targetSt) return <div className="text-center py-20 text-slate-400">Keine Schülerdaten geladen</div>;
                  return renderSingleStudentProfile(targetSt);
                })()}
              </div>
            </div>
          </div>

        </div>
      )}
    </>
  );

  function getKwIndex(kw: number) {
    return schoolYearKws.indexOf(kw);
  }

  function getActiveKbWeeks() {
    const startIdx = getKwIndex(kbStartKW);
    const endIdx = getKwIndex(kbEndKW);
    if (startIdx < 0 || endIdx < 0) return [];
    const minIdx = Math.min(startIdx, endIdx);
    const maxIdx = Math.max(startIdx, endIdx);
    return schoolYearKws.slice(minIdx, maxIdx + 1);
  }

  function getKbWeeksToRender() {
    let weeks: number[] = [];
    if (kbMode === 'single') {
      weeks = [kbKW];
    } else if (kbMode === 'all') {
      weeks = [...schoolYearKws];
    } else {
      weeks = getActiveKbWeeks();
    }
    
    if (kbOnlyFilledWeeks && kbMode !== 'single') {
      weeks = weeks.filter(kw => {
        const plan = app?.wochenplanung?.[kw];
        if (!plan) return false;
        return Object.values(plan).some(day => 
          day && Object.values(day).some((item: any) => item && (item.fach || item.thema || (item.schwerpunkte && item.schwerpunkte.length > 0)))
        );
      });
      if (weeks.length === 0) {
        weeks = [kbKW]; // fallback to single if nothing matches to avoid empty UI
      }
    }
    return weeks;
  }

  async function handleDownloadKlassenbuchDocx(range: 'week' | 'month' | 'semester' | 'schoolyear') {
    const allWeeks = buildSchoolYearWeekList(app?.schuljahr || getCurrentSchuljahr(), app?.bundesland || 'VBG');
    const selectedDate = kwToDates(kbKW).monday;
    const semester = getAttendanceSemester(
      formatLocalDateKey(selectedDate), app?.schuljahr || '', app?.bundesland || 'VBG'
    );
    let selected = allWeeks.filter(week => week.kw === kbKW);
    let rangeLabel = `KW ${kbKW}`;
    if (range === 'month') {
      selected = allWeeks.filter(week => week.monday.getFullYear() === selectedDate.getFullYear()
        && week.monday.getMonth() === selectedDate.getMonth());
      rangeLabel = selectedDate.toLocaleDateString('de-AT', { month: 'long', year: 'numeric' });
    } else if (range === 'semester') {
      selected = allWeeks.filter(week => getAttendanceSemester(
        formatLocalDateKey(week.monday), app?.schuljahr || '', app?.bundesland || 'VBG'
      ) === semester);
      rangeLabel = `${semester}. Semester`;
    } else if (range === 'schoolyear') {
      selected = allWeeks;
      rangeLabel = `Schuljahr ${app?.schuljahr || ''}`.trim();
    }
    const included = selected.filter(week => Boolean((app?.wochenplanung || {})[week.kw]));
    const weeks = included.length ? included : selected.slice(0, 1);
    const sections = weeks.map(week => {
      const dates = kwToDates(week.kw);
      return {
        title: `KW ${week.kw} · ${dates.monday.toLocaleDateString('de-AT')} – ${dates.friday.toLocaleDateString('de-AT')}`,
        subtitle: dates.sw ? `Schulwoche ${dates.sw}` : undefined,
        categories: compileKlassenbuchData(week.kw),
      };
    });
    const name = [app?.anrede, app?.vorname, app?.nachname].filter(Boolean).join(' ')
      || app?.lehrerName || app?.lehrerProfil?.name || '';
    const safeClass = String(app?.klassenbezeichnung || 'Klasse').replace(/[^a-zA-Z0-9_-]+/g, '_');
    const safeRange = rangeLabel.normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g, '_');
    await downloadKlassenbuchDocx(`Klassio_Klassenbuch_${safeClass}_${safeRange}.docx`, {
      title: `Klassenbuch · ${rangeLabel}`,
      className: app?.klassenbezeichnung || '',
      schoolYear: app?.schuljahr || '',
      teacherName: name,
      sections,
    });
  }

  function handleDownloadKlassenbuchPdf() {
    const weeks = getKbWeeksToRender();
    const teacherName = [app?.anrede, app?.vorname, app?.nachname]
      .filter(Boolean)
      .join(' ')
      || app?.lehrerName
      || app?.lehrerProfil?.name
      || '';

    const pdfWeeks = weeks.map((kw) => {
      const dates = kwToDates(kw);
      const dateRange = `${dates.monday.toLocaleDateString('de-AT')} – ${dates.friday.toLocaleDateString('de-AT')}`;
      const categories = compileKlassenbuchData(kw);

      if (!kbIncludeOccurrences) {
        categories['Besondere Vorkommnisse'] = categories['Besondere Vorkommnisse']
          .filter(entry => !entry.includes(' · Termin: '));
      }

      return {
        kw,
        sw: dates.sw,
        dateRange,
        categories,
        absentees: getAbsenteesForWeek(kw),
        notes: kbCustomNotesValue.trim() || undefined,
      };
    });

    const safeClass = String(app?.klassenbezeichnung || 'Klasse')
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'Klasse';
    const rangeLabel = kbMode === 'single'
      ? `KW_${kbKW}`
      : kbMode === 'all'
        ? 'Gesamt'
        : `KW_${kbStartKW}_bis_${kbEndKW}`;

    downloadKlassenbuchPdf(
      `Klassio_Klassenbuch_${safeClass}_${rangeLabel}.pdf`,
      {
        className: app?.klassenbezeichnung || '',
        schoolYear: app?.schuljahr || '',
        teacherName,
        weeks: pdfWeeks,
        includeAbsentees: kbIncludeAbsentees,
        includeOccurrences: kbIncludeOccurrences,
        signatures: kbSignatures,
      },
    );
  }

  function renderSingleKlassenbuchPage(targetKW: number) {
    const pageKbData = compileKlassenbuchData(targetKW);
    const pageAbsenteesList = getAbsenteesForWeek(targetKW);
    const pageDates = kwToDates(targetKW);

    const monStr = `${pageDates.monday.getDate()}.${pageDates.monday.getMonth() + 1}.`;
    const friStr = `${pageDates.friday.getDate()}.${pageDates.friday.getMonth() + 1}.${pageDates.friday.getFullYear()}`;
    const kbHeaderDateStr = `(${monStr}-${friStr})`;

    const printableCategories = Object.entries(pageKbData).filter(([category]) =>
      kbIncludeOccurrences || category !== 'Besondere Vorkommnisse'
    );

    const classTeacherName = [app?.anrede, app?.vorname, app?.nachname]
      .filter(Boolean)
      .join(' ')
      || app?.lehrerName
      || app?.lehrerProfil?.name
      || '';

    return (
      <div className="space-y-2.5 print:space-y-2 font-sans">
        <div className="flex items-end justify-between gap-4 border-b border-slate-300 pb-1.5">
          <div>
            <p className="text-[0.5625rem] font-black uppercase tracking-[0.16em] text-slate-400">KLASSENBUCH</p>
            <p className="text-[0.8125rem] font-black leading-tight text-slate-900">
              {app?.klassenbezeichnung || 'Klasse'}
            </p>
          </div>
          <div className="text-right text-[0.5625rem] font-semibold leading-tight text-slate-500">
            {app?.schuljahr && <div>Schuljahr {app.schuljahr}</div>}
            {classTeacherName && <div>{classTeacherName}</div>}
          </div>
        </div>

        {/* A4-Wochenblatt */}
        <table className="w-full border-collapse border-2 border-slate-900 text-black">
          <thead>
            <tr>
              <th colSpan={2} className="bg-slate-900 border-b-2 border-slate-900 p-3 text-center text-[0.875rem] font-black tracking-wide text-white uppercase">
                {pageDates.sw}. Schulwoche {kbHeaderDateStr}
              </th>
            </tr>
            <tr className="bg-slate-100 border-b border-slate-400">
              <th className="w-[34%] border-r border-slate-400 px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider text-slate-600">
                Fach / Unterbereich
              </th>
              <th className="px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider text-slate-600">
                Unterricht / Inhalt
              </th>
            </tr>
          </thead>
          <tbody>
            {printableCategories.map(([category, entries]) => {
              const parsedCategory = splitKlassenbuchCategoryKey(category);
              return (
                <tr key={category} className="avoid-break border-b border-slate-300 last:border-b-0">
                  <td className="border-r border-slate-300 bg-slate-50 px-3 py-1.5 text-slate-800">
                    <span className="block text-[0.65625rem] font-black leading-tight">
                      {parsedCategory.subject}
                    </span>
                    {parsedCategory.subarea && (
                      <span className="mt-0.5 block text-[0.5625rem] font-bold leading-tight text-slate-500">
                        {parsedCategory.subarea}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-[0.65625rem] font-semibold leading-snug text-slate-800 whitespace-pre-wrap">
                    {entries.length > 0 ? entries.join(' · ') : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Absences / Fehlstunden section */}
        {kbIncludeAbsentees && (
          <div className="space-y-1 pt-1.5 avoid-break">
            <h4 className="text-[0.71875rem] font-black uppercase tracking-wider text-zinc-500 border-b border-[#000000]/10 pb-0.5 flex items-center gap-1.5">
              <Clock size={12} className="text-zinc-500" />
              <span>Erfasste Fehlstunden & Abwesenheiten</span>
            </h4>
            {pageAbsenteesList.length > 0 ? (
              <div className="border border-zinc-300 bg-zinc-50 divide-y divide-zinc-200">
                {pageAbsenteesList.map((abs, idx) => (
                  <div key={idx} className="px-2.5 py-1 flex justify-between items-center gap-3 text-[0.625rem] font-semibold">
                    <span className="text-zinc-900 font-bold">{abs.name}</span>
                    <span className="text-zinc-600 text-right">{abs.info}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-400 text-[0.6875rem] leading-tight italic py-1 px-1">Keine Fehlstunden in dieser Woche erfasst.</p>
            )}
          </div>
        )}

        {/* Special Vorkommnisse text block */}
        {kbIncludeOccurrences && kbCustomNotesValue.trim() && (
          <div className="space-y-1 pt-1.5 avoid-break">
            <h4 className="text-[0.65625rem] font-black uppercase tracking-wider text-zinc-500 border-b border-[#000000]/10 pb-0.5">Pädagogische Zusatznotizen & Ereignisse</h4>
            <div className="border border-zinc-300 p-2 bg-zinc-50 text-[0.625rem] font-semibold text-zinc-700 whitespace-pre-wrap leading-snug">
              {kbCustomNotesValue}
            </div>
          </div>
        )}

        {/* Signatures sections */}
        {kbSignatures.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-3 avoid-break text-center">
            {kbSignatures.map(sigName => (
              <div key={sigName} className="space-y-1 inline-block">
                <div className="border-b border-black w-32 mx-auto pb-3"></div>
                <span className="text-[0.5625rem] uppercase font-black tracking-widest text-[#000000]/50">{sigName}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 8. TEMPLATE PREVIEW RENDER SWITCHBOARDERS
  function renderPreviewTemplate() {
    switch (activeTemplate) {
      
      // A. SCHUELERLISTE
      case 'schuelerliste':
        return (
          <div className="space-y-4">
            <div className="border-b-2 border-black pb-2 flex justify-between items-baseline">
              <h3 className="text-[1.125rem] leading-normal font-black uppercase tracking-wider">{customHeaderTitle || 'Schülerliste & Stammdaten'}</h3>
              <span className="text-[0.625rem] font-bold text-zinc-500">Klasse: {app?.stufe}.Klasse {app?.klassenbezeichnung} • Gesamt: {processedStudentsList.length} Kinder</span>
            </div>

            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-[1.5pt] border-black text-left">
                  <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider w-10 text-zinc-600">Nr.</th>
                  <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-650">Name, Vorname</th>
                  {slShowBirthday && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center w-28">Geboren am</th>}
                  {slShowGender && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">Geschl.</th>}
                  {slShowReligion && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center w-24">Rel.</th>}
                  {slShowLevel && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center w-20">Stufe</th>}
                  {slShowBesuchsjahr && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">Besuchsj.</th>}
                  {slShowDaZ && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center w-16">DaZ</th>}
                  {slShowErstsprache && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">Erstsprache</th>}
                  {slShowZweitsprache && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">Zweitsprache</th>}
                  {slShowNationality && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">Staatsb.</th>}
                  {slShowAddress && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">Adresse</th>}
                  {slShowPhoneMother && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">Tel. Mutter</th>}
                  {slShowPhoneFather && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">Tel. Vater</th>}
                  {slShowEmailParents && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">E-Mail Eltern</th>}
                  {slShowSvNummer && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">SV-Nr.</th>}
                  {slShowIkmNummer && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">IKM-Nr.</th>}
                  {slShowGroups && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">Gruppen</th>}
                  {slShowFehlstunden && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center w-28">Fehlstunden</th>}
                  {slShowNotes && (
                    <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-600 text-left min-w-[12rem] max-w-[20rem]">
                      Besondere Hinweise
                    </th>
                  )}
                  {slShowAllergies && (
                    <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-600 text-left min-w-[12rem] max-w-[20rem]">
                      Allergien & Unverträglichkeiten
                    </th>
                  )}
                  {slShowFotoFreigabe && (
                    <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-600 text-center min-w-[10rem]">
                      Foto-Freigabe
                    </th>
                  )}
                  {slCustomCols.slice(0, slCustomColsCount).map((cn, ci) => (
                    <th key={ci} className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider border-l border-zinc-300 text-center text-zinc-500">{cn}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {processedStudentsList.map((st, sidx) => {
                  const formatAddress = () => {
                    const parts = [
                      st.anschrift,
                      st.plz && st.ort ? `${st.plz} ${st.ort}` : st.plz || st.ort
                    ].filter(Boolean);
                    return parts.length > 0 ? parts.join(', ') : '—';
                  };

                  return (
                    <tr key={st.id} className="border-b border-zinc-200 even:bg-zinc-50/50">
                      <td className="py-2 px-2 font-bold text-zinc-400 text-[0.6875rem]">{sidx + 1}</td>
                      <td className="py-2 px-2 font-black text-black text-[0.71875rem] max-w-[12rem] text-wrap leading-tight break-words" title={`${st.nachname}, ${st.vorname}`}>{st.nachname}, {st.vorname}</td>
                      {slShowBirthday && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{st.geburtstag || st.geburtsdatum || '—'}</td>}
                      {slShowGender && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem] uppercase">{st.geschlecht || '—'}</td>}
                      {slShowReligion && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{st.religion || 'o.B.'}</td>}
                      {slShowLevel && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{app?.stufe || st.besuchsjahr || '—'}. Schulj.</td>}
                      {slShowBesuchsjahr && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{st.besuchsjahr ? `${st.besuchsjahr}. BJ` : '—'}</td>}
                      {slShowDaZ && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{st.daz ? 'Ja' : 'Nein'}</td>}
                      {slShowErstsprache && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{st.erstsprache || '—'}</td>}
                      {slShowZweitsprache && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{st.zweitsprache || '—'}</td>}
                      {slShowNationality && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{st.staatsbuergerschaft || '—'}</td>}
                      {slShowAddress && <td className="py-2 px-2 font-semibold text-zinc-500 text-[0.65625rem] max-w-[14rem] text-wrap leading-tight break-words" title={formatAddress()}>{formatAddress()}</td>}
                      {slShowPhoneMother && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem] max-w-[10rem] text-wrap leading-tight break-words" title={st.telefon_mutter || '—'}>{st.telefon_mutter || '—'}</td>}
                      {slShowPhoneFather && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem] max-w-[10rem] text-wrap leading-tight break-words" title={st.telefon_vater || '—'}>{st.telefon_vater || '—'}</td>}
                      {slShowEmailParents && <td className="py-2 px-2 font-semibold text-zinc-500 text-[0.65625rem] max-w-[10rem] text-wrap leading-tight break-words" title={st.email_eltern || '—'}>{st.email_eltern || '—'}</td>}
                      {slShowSvNummer && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{st.sv_nummer || '—'}</td>}
                      {slShowIkmNummer && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{st.ikmNummer || '—'}</td>}
                      {slShowGroups && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem] max-w-[10rem] text-wrap leading-tight break-words" title={st.gruppen?.join(', ') || '—'}>{st.gruppen?.join(', ') || '—'}</td>}
                      {slShowFehlstunden && (
                        <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">
                          {(() => {
                            const fs = getStudentFehlstunden(st.id);
                            return `${fs.total} Std. (${fs.excused} e / ${fs.unexcused} u)`;
                          })()}
                        </td>
                      )}
                      {slShowNotes && (
                        <td className="py-2 px-2 font-medium text-zinc-700 text-[0.6875rem] max-w-[20rem] text-wrap leading-tight break-words whitespace-pre-line" title={st.notiz || ''}>
                          {st.notiz && st.notiz.trim() ? (
                            <span>{st.notiz.trim()}</span>
                          ) : (
                            <span className="text-zinc-300 font-normal">—</span>
                          )}
                        </td>
                      )}
                      {slShowAllergies && (
                        <td className="py-2 px-2 font-medium text-zinc-700 text-[0.6875rem] max-w-[20rem] text-wrap leading-tight break-words whitespace-pre-line" title={st.allergien || ''}>
                          {st.allergien && st.allergien.trim() ? (
                            <span>{st.allergien.trim()}</span>
                          ) : (
                            <span className="text-zinc-300 font-normal">—</span>
                          )}
                        </td>
                      )}
                      {slShowFotoFreigabe && (
                        <td className="py-2 px-2 font-semibold text-center text-[0.6875rem] max-w-[12rem] text-wrap leading-tight break-words">
                          {st.fotoFreigabe === 'erlaubt' && (
                            <span className="text-emerald-700 font-bold">Foto: erlaubt</span>
                          )}
                          {st.fotoFreigabe === 'nur_homepage' && (
                            <span className="text-amber-800 font-bold">Foto: nur Schulhomepage</span>
                          )}
                          {st.fotoFreigabe === 'nicht_erlaubt' && (
                            <span className="text-rose-700 font-bold">Foto: nicht erlaubt</span>
                          )}
                          {!st.fotoFreigabe && (
                            <span className="text-zinc-300 font-normal">—</span>
                          )}
                        </td>
                      )}
                      {Array.from({ length: slCustomColsCount }).map((_, cidx) => (
                        <td key={cidx} className="border-l border-zinc-300 py-2 px-2"></td>
                      ))}
                    </tr>
                  );
                })}
                {processedStudentsList.length === 0 && (
                  <tr>
                    <td colSpan={25} className="py-8 text-center font-bold text-zinc-400">Keine Schülerergebnisse gemappt. Bitte fügen Sie Schüler hinzu.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );

      // B. CHECKLISTE
      case 'checkliste': {
        const abbreviateHeader = (title: string, maxLength: number = 10): string => {
          if (!title) return '';
          let t = title.trim();
          if (t.length <= maxLength) return t;

          const replacements: Record<string, string> = {
            'lernzielkontrolle': 'LZK',
            'schularbeit': 'SA',
            'wochenplan': 'WOPL',
            'hausübung': 'HÜ',
            'hausübungen': 'HÜ',
            'mitarbeit': 'MA',
            'mitarbeiter': 'MA',
            'mittelwert': 'Ø',
            'durchschnitt': 'Ø',
            'notenspiegel': 'Noten',
            'schwerpunkt': 'SP'
          };

          let lower = t.toLowerCase();
          for (const [key, value] of Object.entries(replacements)) {
            if (lower.includes(key)) {
              t = t.replace(new RegExp(key, 'gi'), value);
              lower = t.toLowerCase();
            }
          }

          if (t.length <= maxLength) return t;

          // Split words and abbreviate individual long words
          const words = t.split(' ');
          const shortenedWords = words.map(word => {
            if (word.length > 7 && !word.includes('.') && !word.match(/^\d/)) {
              return word.substring(0, 5) + '.';
            }
            return word;
          });

          const result = shortenedWords.join(' ');
          if (result.length > maxLength) {
            return result.substring(0, maxLength - 1) + '…';
          }
          return result;
        };

        let colsToRender: { id: string; title: string; type: string; idx?: number }[] = [];
        if (clSyncMode === 'notenmappe') {
          const cfg = getFachCfg(app, clSelectedSubject);
          const colCounts = app.notenMeta?.[clSelectedSubject]?.colCounts || { lzk: 4, wp: 4, obj: 4 };

          // Schularbeiten (SA)
          if (cfg.sa) {
            const saCount = cfg.saCount || 2;
            for (let i = 0; i < saCount; i++) {
              colsToRender.push({
                id: `sa-${i}`,
                title: `${getNotenLabel(app, clSelectedSubject, 'sa', 'SA')} ${i + 1}`,
                type: 'sa',
                idx: i
              });
            }
          }
          // Lernzielkontrollen (LZK)
          if (cfg.lzk) {
            const count = colCounts.lzk || 4;
            for (let i = 0; i < count; i++) {
              const label = app.notenMeta?.[clSelectedSubject]?.colLabels?.lzk?.[i] || `${getNotenLabel(app, clSelectedSubject, 'lzk', 'LZK')} ${i + 1}`;
              colsToRender.push({
                id: `lzk-${i}`,
                title: label,
                type: 'lzk',
                idx: i
              });
            }
          }
          // Wochenplan (WP)
          if (cfg.wp) {
            const count = colCounts.wp || 4;
            for (let i = 0; i < count; i++) {
              const label = app.notenMeta?.[clSelectedSubject]?.colLabels?.wp?.[i] || `${getNotenLabel(app, clSelectedSubject, 'wp', 'WOPL')} ${i + 1}`;
              colsToRender.push({
                id: `wp-${i}`,
                title: label,
                type: 'wp',
                idx: i
              });
            }
          }
          // Kunstobjekt / Werkstück (OBJ)
          if (cfg.obj) {
            const count = colCounts.obj || 4;
            for (let i = 0; i < count; i++) {
              const label = app.notenMeta?.[clSelectedSubject]?.colLabels?.obj?.[i] || `${getNotenLabel(app, clSelectedSubject, 'obj', 'Objekt')} ${i + 1}`;
              colsToRender.push({
                id: `obj-${i}`,
                title: label,
                type: 'obj',
                idx: i
              });
            }
          }
          // Hausübungen Average/Punkte
          if (cfg.hue) {
            colsToRender.push({
              id: 'hue',
              title: getNotenLabel(app, clSelectedSubject, 'hue', 'HÜ'),
              type: 'hue'
            });
          }
          // Mitarbeit / Points
          if (cfg.g.mi > 0) {
            colsToRender.push({
              id: 'mi',
              title: getNotenLabel(app, clSelectedSubject, 'mi', 'Mitarbeit'),
              type: 'mi'
            });
          }
          // Computed Average Grade (Mittelwert)
          colsToRender.push({
            id: 'average',
            title: 'Ø Note',
            type: 'average'
          });
        } else {
          colsToRender = clCols.map(c => ({ id: c.id, title: c.title, type: 'blank' }));
        }

        const effectiveTitle = clSyncMode === 'notenmappe' 
          ? `Notenspiegel: ${clSelectedSubject}` 
          : clTitle;

        return (
          <div className="space-y-3 print:space-y-2.5">
            <div className="border-b-2 border-black pb-1.5 flex justify-between items-end">
              <div>
                <h3 className="text-[1.125rem] leading-normal font-black uppercase tracking-wider">{customHeaderTitle || effectiveTitle}</h3>
                <p className="text-[0.59375rem] font-bold text-zinc-400 uppercase tracking-widest mt-0.5 animate-fade-in">
                  Klassenliste {app?.stufe}.Klasse {app?.klassenbezeichnung || ''} • Lehrperson: {app?.anrede ? `${app.anrede} ` : ''}{app.nachname || ''} • SJ {app?.schuljahr}
                </p>
              </div>
              <div className="flex gap-4 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 pb-1">
                <span>Datum: __________________</span>
              </div>
            </div>

            <div className="w-full ">
              <table className="w-full table-fixed border-collapse">
                <thead>
                  <tr className="border-b-[1.5pt] border-black text-left font-semibold">
                    {clShowNumbers && <th className="py-2 px-1.5 text-[0.5625rem] font-black uppercase tracking-wider text-zinc-650 w-10 text-center">Nr.</th>}
                    <th className="py-2 px-2 text-[0.5625rem] font-black uppercase tracking-wider border-r-[1.5pt] border-black text-zinc-700 w-44">Name des Kindes</th>
                    {colsToRender.map((col) => (
                      <th key={col.id} title={col.title} className="py-2 px-1 text-[0.53125rem] md:text-[0.5625rem] font-black uppercase tracking-wider text-center border-r border-zinc-200 text-zinc-650 last:border-r-0 text-wrap leading-tight break-words">
                        {abbreviateHeader(col.title, 8)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((st, i) => (
                    <tr key={st.id} className="border-b border-zinc-200 even:bg-zinc-50/20">
                      {clShowNumbers && <td className="py-1.5 px-1 font-bold text-zinc-400 text-center text-[0.65625rem]">{i + 1}</td>}
                      <td className="py-1.5 px-2 font-black text-zinc-850 border-r-[1.5pt] border-zinc-400 text-[0.6875rem] text-wrap leading-tight break-words" title={`${st.nachname} ${st.vorname}`}>{st.nachname} {st.vorname}</td>
                      {colsToRender.map(col => {
                        let val = '';
                        if (clSyncMode === 'notenmappe') {
                          const nd: any = app.noten?.[st.id]?.[clSelectedSubject]?.[clSelectedSemester] || { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0 };
                          if (col.type === 'sa' && col.idx !== undefined) {
                            val = String(nd.sa?.[col.idx] ?? '-');
                          } else if (col.type === 'lzk' && col.idx !== undefined) {
                            val = String(nd.lzk?.[col.idx] ?? '-');
                          } else if (col.type === 'wp' && col.idx !== undefined) {
                            val = String(nd.wp?.[col.idx] ?? '-');
                          } else if (col.type === 'obj' && col.idx !== undefined) {
                            val = String(nd.aufgaben?.[col.idx] ?? '-');
                          } else if (col.type === 'hue') {
                            val = String(nd.hue ?? 0);
                          } else if (col.type === 'mi') {
                            val = String(app.mitarbeit?.[st.id]?.[clSelectedSubject]?.[clSelectedSemester] || 0);
                          } else if (col.type === 'average') {
                            const computed = berechne(app, st.id, clSelectedSubject, clSelectedSemester);
                            val = computed !== null ? computed.toFixed(1) : '-';
                          }
                        }
                        return (
                          <td key={col.id} className="border-r border-zinc-250 py-1.5 px-1 text-center last:border-r-0 text-[0.625rem] md:text-[0.65625rem]">
                            {clSyncMode === 'notenmappe' ? (
                              <span className={col.type === 'average' ? "font-black text-indigo-700 bg-indigo-50/70 px-1 py-0.5 rounded border border-indigo-200 text-[0.625rem]" : "font-bold text-zinc-800"}>
                                {val}
                              </span>
                            ) : (
                              <div className="w-3.5 h-3.5 mx-auto border border-zinc-300 rounded-sm"></div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  
                  {/* Average calculations row if enabled */}
                  {clShowAverageRow && (
                    <tr className="border-t-2 border-zinc-400 bg-zinc-50/80 font-black">
                      <td colSpan={clShowNumbers ? 2 : 1} className="py-2 px-2 border-r-[1.5pt] border-zinc-400 text-[0.5625rem] text-zinc-700 tracking-wide uppercase font-black font-semibold">
                        Ø-Durchschnitt / Erfüllt %
                      </td>
                      {colsToRender.map(col => {
                        let colAvgStr = '______';
                        if (clSyncMode === 'notenmappe') {
                          const vals: number[] = [];
                          students.forEach(st => {
                            const nd: any = app.noten?.[st.id]?.[clSelectedSubject]?.[clSelectedSemester] || { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0 };
                            if (col.type === 'sa' && col.idx !== undefined) {
                              const n = nd.sa?.[col.idx];
                              if (typeof n === 'number') vals.push(n);
                            } else if (col.type === 'lzk' && col.idx !== undefined) {
                              const n = nd.lzk?.[col.idx];
                              if (typeof n === 'number') vals.push(n);
                            } else if (col.type === 'wp' && col.idx !== undefined) {
                              const n = nd.wp?.[col.idx];
                              if (typeof n === 'number') vals.push(n);
                            } else if (col.type === 'obj' && col.idx !== undefined) {
                              const n = nd.aufgaben?.[col.idx];
                              if (typeof n === 'number') vals.push(n);
                            } else if (col.type === 'hue') {
                              const n = nd.hue;
                              if (typeof n === 'number') vals.push(n);
                            } else if (col.type === 'mi') {
                              const n = app.mitarbeit?.[st.id]?.[clSelectedSubject]?.[clSelectedSemester];
                              if (typeof n === 'number') vals.push(n);
                            } else if (col.type === 'average') {
                              const n = berechne(app, st.id, clSelectedSubject, clSelectedSemester);
                              if (n !== null) vals.push(n);
                            }
                          });
                          if (vals.length > 0) {
                            const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
                            colAvgStr = mean.toFixed(2);
                          } else {
                            colAvgStr = '-';
                          }
                        }
                        return (
                          <td key={col.id} className="border-r border-zinc-250 py-2 px-1 text-center text-zinc-750 font-black last:border-r-0 text-[0.625rem]">
                            {colAvgStr}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      // B2. ZEUGNIS NOTENLISTE
      case 'zeugnis_noten': {
        const titleText = znSemester === '1'
          ? 'Semester-Notenspiegel · 1. Semester'
          : 'Semester-Notenspiegel · 2. Semester';
        
        return (
          <div className="space-y-4 print:space-y-2.5">
            <div className="border-b-2 border-black pb-1.5 flex justify-between items-end">
              <div>
                <h3 className="text-[1.125rem] leading-normal font-black uppercase tracking-wider">{customHeaderTitle || titleText}</h3>
                <p className="text-[0.59375rem] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                  Klassenliste {app?.stufe}.Klasse {app?.klassenbezeichnung || ''} • Lehrperson: {app?.anrede ? `${app.anrede} ` : ''}{app.nachname || ''} • SJ {app?.schuljahr} • Semester: {znSemester}. Halbjahr
                </p>
              </div>
              <div className="flex gap-4 text-[0.625rem] font-black uppercase tracking-wider text-zinc-550 pb-1 no-print">
                <span className="text-amber-600 font-extrabold">⚠️ Orange umrandet = Manuell überschrieben</span>
                <span className="text-emerald-600 font-extrabold">✓ Grün umrandet = Berechnet (Live-Sync)</span>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full table-fixed border-collapse">
                <thead>
                  <tr className="border-b-[1.5pt] border-black text-left font-semibold bg-zinc-50/50">
                    {clShowNumbers && (
                      <th className="py-2 px-1 text-[0.5625rem] font-black uppercase tracking-wider text-zinc-650 w-8 text-center">
                        Nr.
                      </th>
                    )}
                    <th className="py-2 px-2 text-[0.5625rem] font-black uppercase tracking-wider border-r-[1.5pt] border-black text-zinc-700 w-44">
                      Schüler:in
                    </th>
                    {znSelectedSubjects.map(f => {
                      const isFachActive = !app.faecher || app.faecher.includes(f);
                      return (
                        <th 
                          key={f} 
                          className={`py-2 px-1 text-[0.53125rem] font-black uppercase tracking-wider text-center border-r border-zinc-200 text-zinc-650 text-wrap leading-tight break-words`}
                        >
                          <div>{f}</div>
                          {!isFachActive && (
                            <div className="text-[0.4375rem] lowercase text-zinc-400 font-bold no-print tracking-normal">inaktiv</div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {students.map((st, sidx) => (
                    <tr key={st.id} className="border-b border-zinc-200 even:bg-zinc-50/20">
                      {clShowNumbers && (
                        <td className="py-1 px-1 font-bold text-zinc-400 text-center text-[0.65625rem]">
                          {sidx + 1}
                        </td>
                      )}
                      <td 
                        className="py-1 px-2 font-black text-zinc-850 border-r-[1.5pt] border-zinc-400 text-[0.6875rem] text-wrap leading-tight break-words"
                        title={`${st.nachname} ${st.vorname}`}
                      >
                        {st.nachname} {st.vorname}
                      </td>
                      {znSelectedSubjects.map(f => {
                        const isFachActive = !app.faecher || app.faecher.includes(f);
                        const nd: any = app.noten?.[st.id]?.[f]?.[znSemester] || {};
                        const mode = getAssessmentMode(app, f);
                        const manualGrade = nd.endnote || '';
                        const calculatedNum = isFachActive ? berechne(app, st.id, f, znSemester) : null;
                        const hasManual = mode === 'grades' && !!nd.endnote;
                        const displayValue = mode === 'grades'
                          ? (hasManual ? String(manualGrade) : calculatedNum !== null ? Number(calculatedNum).toFixed(1) : '')
                          : calculatedNum !== null
                            ? `${Math.round(Number(calculatedNum))}%`
                            : '';

                        return (
                          <td
                            key={f}
                            className="border-r border-zinc-200 py-1 px-1 text-center last:border-r-0 text-[0.625rem]"
                          >
                            <div className="flex items-center justify-center">
                              {mode === 'grades' ? (
                                <>
                                  <select
                                    value={hasManual ? String(manualGrade) : ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setApp(prev => {
                                        const currentNoten = prev.noten || {};
                                        const sidData = currentNoten[st.id] || {};
                                        const fachData = sidData[f] || {};
                                        const semData = fachData[znSemester] || { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] };

                                        return {
                                          ...prev,
                                          noten: {
                                            ...currentNoten,
                                            [st.id]: {
                                              ...sidData,
                                              [f]: {
                                                ...fachData,
                                                [znSemester]: {
                                                  ...semData,
                                                  endnote: val
                                                }
                                              }
                                            }
                                          }
                                        };
                                      });
                                    }}
                                    className={`no-print w-full max-w-[50px] bg-white border rounded-lg py-0.5 px-0.5 text-center font-bold text-[0.6875rem] outline-none transition-all cursor-pointer ${
                                      hasManual
                                        ? 'border-amber-400 text-amber-700 bg-amber-50/20 focus:ring-1 focus:ring-amber-400'
                                        : calculatedNum !== null
                                          ? 'border-emerald-300 text-emerald-700 bg-emerald-50/15 focus:ring-1 focus:ring-emerald-400'
                                          : 'border-slate-200 text-slate-400 hover:border-slate-300 focus:ring-1 focus:ring-slate-300'
                                    }`}
                                  >
                                    <option value="">–</option>
                                    <option value="1">1</option>
                                    <option value="2">2</option>
                                    <option value="3">3</option>
                                    <option value="4">4</option>
                                    <option value="5">5</option>
                                    <option value="SPF">SPF</option>
                                    <option value="ESPF">ESPF</option>
                                  </select>
                                  <span className="hidden print:inline font-bold text-zinc-900 text-[0.7125rem]">
                                    {displayValue || '—'}
                                  </span>
                                </>
                              ) : (
                                <span className="font-bold text-zinc-700 text-[0.6875rem]">
                                  {displayValue || '—'}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 border-t border-dashed border-zinc-200 flex justify-between items-center text-[0.5625rem] text-zinc-400 font-bold uppercase tracking-wider">
              <span>* SPF/ESPF = Sonderpädagogischer Förderbedarf / Erhöhter sonderpädagogischer Förderbedarf</span>
              <span>Druckdatum: {new Date().toLocaleDateString('de-AT')} • Erstellt mit Klassio</span>
            </div>
          </div>
        );
      }

      // Child plan is the same saved encrypted document as in the generator.
      case 'schueler_wochenplan':
        return selectedChildPlan
          ? <SchuelerWochenplanA4Sheet plan={selectedChildPlan} previewOnly={false} colorMode={childPrintColorMode} />
          : <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Noch keinen Wochenplan für Kinder gespeichert. Bitte zuerst im Wochenplan erstellen.</p>;

      // C. WOCHENPLAN
      case 'wochenplan':
        const daysWp = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
        const subInfoList = Array.from({ length: 10 }, (_, index) => index + 1);
        const lessonsData = (app?.wochenplanung || {})[wpKW] || {};

        return (
          <div className="space-y-4">
            <div className="border-b-2 border-black pb-2 flex justify-between items-baseline">
              <h3 className="text-[1.125rem] leading-normal font-black uppercase tracking-wider">{customHeaderTitle || `Unterrichts-Wochenplan`}</h3>
              <span className="text-[0.625rem] font-black text-zinc-500 uppercase tracking-widest bg-zinc-150 px-2 py-0.5 rounded">
                KW {wpKW} • SW {selectedWpDates.sw} ({selectedWpDates.monday.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} - {selectedWpDates.friday.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })})
              </span>
            </div>

            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-[1.5pt] border-black bg-zinc-50">
                  <th className="py-3 px-2 text-center text-[0.625rem] font-black uppercase tracking-wider text-zinc-600 w-16">Std.</th>
                  {daysWp.map(d => (
                    <th key={d} className="py-3 px-2 text-left text-[0.6875rem] font-black uppercase tracking-wider border-l border-zinc-300 text-black">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subInfoList.map(h => {
                  return (
                    <tr key={h} className="border-b border-zinc-200 min-h-[50px]">
                      {/* Hour cell */}
                      <td className="py-2 px-2 text-center border-r-[1.5pt] border-black bg-zinc-50/50">
                        <div className="font-black text-black">{h}.</div>
                        {wpShowTimes && app?.stundenZeiten?.[h] && (
                          <div className="text-[0.5rem] font-bold text-zinc-400 mt-1">{app.stundenZeiten[h]}</div>
                        )}
                      </td>

                      {/* Content cells */}
                      {daysWp.map(d => {
                        const cellItem = lessonsData[d]?.[h - 1];
                        // Fallback to stammplan if empty
                        const stammplanFach = app?.stammplan?.[d]?.[h];
                        
                        let displayFach = cellItem?.fach || stammplanFach || '';
                        let displayThema = cellItem?.thema || '';

                        const isEmpty = !displayFach && !displayThema;

                        return (
                          <td 
                            key={d} 
                            className={`p-2 border-l border-zinc-300 align-top text-left w-1/5 ${
                              isEmpty && !wpInkSaver ? 'bg-zinc-50/30' : ''
                            }`}
                          >
                            {displayFach && (
                              <div className="font-black text-black leading-tight mb-1 text-[0.71875rem]">
                                {displayFach}
                              </div>
                            )}
                            {!wpShowSubjectOnly && displayThema && (
                              <div className="font-semibold text-zinc-600 text-[0.65625rem] leading-snug">
                                {displayThema}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Custom Notes handwriting block if enabled */}
            {wpShowEmptyNotesBox && (
              <div className="border border-zinc-450 p-4 rounded-2xl space-y-2 mt-4 avoid-break h-24">
                <span className="text-[0.5625rem] font-black uppercase tracking-wider text-zinc-400 block pb-1 border-b border-zinc-200">Wochenkommentare & Hausübungsnotizen des Klassenlehrers:</span>
                <div className="grid grid-cols-2 gap-4 h-full">
                  <div className="border-r border-zinc-350 pr-4"></div>
                  <div></div>
                </div>
              </div>
            )}
          </div>
        );

      // D. KLASSENBUCH WOCHENBERICHT
      case 'klassenbuch': {
        const weeks = getKbWeeksToRender();
        return (
          <div className="space-y-12">
            {weeks.map((kw, idx) => (
              <div key={kw} className={idx > 0 ? "page-break pt-8" : ""}>
                {renderSingleKlassenbuchPage(kw)}
              </div>
            ))}
          </div>
        );
      }

      // E. JAHRESPLANUNG
      case 'jahresplanung': {
        const jahresplanValues = app?.jahresplanung || {};
        const yearlySubjects = sortYearlySubjects(app?.jahresplan_faecher || DEFAULT_YEARLY_SUBJECTS);
        const subjectsCols = jpSubjectFilter === 'all'
          ? yearlySubjects
          : yearlySubjects.filter(sub => sub.id === jpSubjectFilter || sub.label === jpSubjectFilter);

        // Generate actual sequence of school weeks (similar to YearlyPlan.tsx)
        const startYearVal = getStartYear(app?.schuljahr);
        const startKW = getSchulstartKW(app?.schuljahr || getCurrentSchuljahr(), app?.bundesland || 'VBG');
        const endYear = startYearVal + 1;
        const startMonday = kwToMonday(startKW, startYearVal);
        const weeksList: Array<{ sw: number, kw: number, year: number, monday: Date }> = [];
        let currentMonday = new Date(startMonday);
        let swIndex = 1;
        while (currentMonday.getFullYear() < endYear || (currentMonday.getFullYear() === endYear && currentMonday.getMonth() < 7)) {
          const kw = getKW(currentMonday);
          const thursday = new Date(currentMonday);
          thursday.setDate(thursday.getDate() + 3);
          const isoYear = thursday.getFullYear();
          weeksList.push({ sw: swIndex, kw: kw, year: isoYear, monday: new Date(currentMonday) });
          currentMonday.setDate(currentMonday.getDate() + 7);
          swIndex++;
        }

        const getPayload = (planData: any, subId: string, subLabel: string) => {
          if (!planData) return null;
          let cell = planData[subId];
          if (!cell) {
            const keys = Object.keys(planData);
            const foundKey = keys.find(k => 
              k.toLowerCase() === subId.toLowerCase() || 
              k.toLowerCase() === subLabel.toLowerCase()
            );
            if (foundKey) {
              cell = planData[foundKey];
            }
          }
          if (!cell) return null;
          if (typeof cell === 'string') {
            return { thema: cell, buch: '', type: 'standard', items: [] };
          }
          return {
            thema: cell.thema || '',
            buch: cell.buch || '',
            type: cell.type || 'standard',
            items: cell.items || []
          };
        };

        // Calculate progress/coverage statistics for each subject in subjectsCols
        const subjectProgressMap = new Map<string, number>();
        subjectsCols.forEach(s => {
          let plannedCount = 0;
          let totalTeachingWeeks = 0;
          weeksList.forEach(w => {
            const holiday = isHoliday(w.monday, app?.calendarSettings?.disabledHolidays || [], app?.bundesland || 'VBG');
            const isSevereHoliday = holiday && (holiday.includes('ferien') || holiday.includes('Schluss') || holiday.includes('Beginn'));
            if (!isSevereHoliday) {
              totalTeachingWeeks++;
              const val = getPayload(jahresplanValues[w.kw], s.id, s.label);
              if (val && (val.thema || val.items?.length > 0)) {
                plannedCount++;
              }
            }
          });
          const progress = totalTeachingWeeks === 0 ? 0 : Math.round((plannedCount / totalTeachingWeeks) * 100);
          subjectProgressMap.set(s.id, progress);
        });

        const renderMatrixRows = () => {
          let lastMonth = '';
          const rows: React.ReactNode[] = [];

          weeksList.forEach(({ sw, kw, year, monday }) => {
            const planDataForKw = jahresplanValues[kw] || {};
            const holidayInfo = isHoliday(monday, app?.calendarSettings?.disabledHolidays || [], app?.bundesland || 'VBG');
            const isSevereHoliday = holidayInfo && (holidayInfo.includes('ferien') || holidayInfo.includes('Schluss') || holidayInfo.includes('Beginn'));
            const monthName = monday.toLocaleDateString('de-DE', { month: 'long' });

            // If we hide holidays and it's a severe holiday, skip rendering
            if (!jpShowHolidays && isSevereHoliday) {
              return;
            }

            if (jpGroupByMonth && monthName !== lastMonth) {
              lastMonth = monthName;
              rows.push(
                <tr key={`month-sep-${kw}`} className="bg-slate-100 text-left font-black text-slate-800 tracking-wider text-[0.5625rem] uppercase avoid-break print:bg-slate-100">
                  <td colSpan={subjectsCols.length + 1} className="py-1.5 px-2 border border-zinc-300 font-extrabold text-slate-800">
                    📅 {monthName}
                  </td>
                </tr>
              );
            }

            if (holidayInfo) {
              rows.push(
                <tr key={`holiday-${kw}`} className="bg-zinc-50 border-b border-zinc-200 align-middle avoid-break select-none opacity-75">
                  <td className="py-1 px-1 border border-zinc-300 bg-zinc-100/30 text-center select-none font-bold min-w-[70px]">
                    <span className="font-extrabold text-black text-[0.5625rem]">KW {kw}</span>
                    <span className="text-[0.46875rem] text-zinc-400 block font-bold leading-none mt-0.5">SW {sw}</span>
                    <span className="text-[0.46875rem] text-zinc-400 block leading-none mt-0.5">
                      {monday.getDate()}.${monday.getMonth() + 1}.
                    </span>
                  </td>
                  <td colSpan={subjectsCols.length} className="py-1.5 px-2 bg-zinc-50 border border-zinc-300 text-center font-bold text-slate-500 italic text-[0.5625rem] uppercase tracking-wider">
                    🏝️ {holidayInfo}
                  </td>
                </tr>
              );
            } else {
              // Gather Termin-Pins from cellData types (if jpShowPins is active)
              const weekExams = Object.entries(planDataForKw).filter(([subId, cellData]: any) => cellData?.type && cellData.type !== 'standard');

              rows.push(
                <tr key={kw} className="border-b border-zinc-200 even:bg-zinc-50/10 align-top avoid-break">
                  <td className="py-1 px-1 border border-zinc-300 bg-zinc-50/60 text-center select-none min-w-[70px]">
                    <span className="font-extrabold text-black text-[0.5625rem]">KW {kw}</span>
                    <span className="text-[0.46875rem] text-zinc-400 block font-bold leading-none mt-0.5">SW {sw}</span>
                    <span className="text-[0.46875rem] text-zinc-400 block leading-none mt-0.5 font-medium">
                      {monday.getDate()}.${monday.getMonth() + 1}.
                    </span>

                    {/* Termin-Pins */}
                    {jpShowPins && weekExams.length > 0 && (
                      <div className="mt-1 flex flex-col gap-0.5 items-center max-w-[65px] mx-auto">
                        {weekExams.map(([subId, cellData]: any, idx) => (
                          <div 
                            key={idx} 
                            className={`text-[0.45rem] font-black px-1 py-0.5 rounded leading-none border flex items-center gap-0.5 ${
                              cellData.type === 'sa' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                              cellData.type === 'test' || cellData.type === 'lzk' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                              'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}
                            title={`${cellData.type === 'sa' ? 'Schularbeit' : cellData.type === 'test' ? 'Test/LZK' : 'Schul-Termin'}: ${cellData.thema}`}
                          >
                            <span>📌</span>
                            <span>{cellData.type === 'sa' ? 'SA' : cellData.type === 'test' ? 'T' : 'FIX'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  {subjectsCols.map(sub => {
                    const content = getPayload(planDataForKw, sub.id, sub.label);
                    return (
                      <td key={sub.id} className="py-1 px-1.5 border border-zinc-300 whitespace-pre-wrap leading-tight">
                        {content && (content.thema || (content.items && content.items.length > 0)) ? (
                          <div className="space-y-1">
                            {content.items && content.items.length > 0 ? (
                              <div className="space-y-1.5">
                                {content.items.map((it: any) => (
                                  <div key={it.id} className="leading-tight border-b border-stone-100 last:border-0 pb-1 last:pb-0">
                                    {it.subCategory && (
                                      <span className="text-[0.45rem] font-black uppercase text-blue-600 block mb-0.5">{it.subCategory.replace('Deutsch ', '')}</span>
                                    )}
                                    <div className="text-[0.5625rem] font-bold text-zinc-900 leading-tight">
                                      {it.thema}
                                    </div>
                                    {it.buch && (
                                      <span className="text-[0.5rem] text-stone-500 italic">📖 {it.buch}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <>
                                <div className="text-[0.5625rem] font-bold text-zinc-900 leading-tight">
                                  {content.thema}
                                </div>
                                {content.buch && (
                                  <div className="text-[0.5rem] font-medium text-indigo-700 leading-tight">
                                    📖 {content.buch}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-300/30 text-[0.5rem] select-none">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            }
          });
          return rows;
        };

        const renderListRows = () => {
          let lastMonth = '';
          const itemsArr: React.ReactNode[] = [];

          weeksList.forEach(({ sw, kw, year, monday }) => {
            const pl = jahresplanValues[kw] || {};
            const holidayInfo = isHoliday(monday, app?.calendarSettings?.disabledHolidays || [], app?.bundesland || 'VBG');
            const isSevereHoliday = holidayInfo && (holidayInfo.includes('ferien') || holidayInfo.includes('Schluss') || holidayInfo.includes('Beginn'));
            const monthName = monday.toLocaleDateString('de-DE', { month: 'long' });

            if (!jpShowHolidays && isSevereHoliday) {
              return;
            }

            const hasAnyContent = subjectsCols.some(sub => {
              const c = getPayload(pl, sub.id, sub.label);
              return c && (c.thema || (c.items && c.items.length > 0));
            });

            if (!hasAnyContent && !holidayInfo) return;

            if (jpGroupByMonth && monthName !== lastMonth) {
              lastMonth = monthName;
              itemsArr.push(
                <div key={`month-header-${kw}`} className="py-1 px-2.5 bg-slate-100 rounded-lg text-[0.5625rem] font-black uppercase text-indigo-950 tracking-wider avoid-break border-l-4 border-indigo-500 mt-3 first:mt-0">
                  📅 {monthName}
                </div>
              );
            }

            if (holidayInfo) {
              itemsArr.push(
                <div key={`holiday-item-${kw}`} className="py-1.5 border-b border-zinc-200 flex gap-4 text-[0.5625rem] avoid-break text-zinc-400 select-none items-center">
                  <div className="w-24 shrink-0 font-extrabold text-black">
                    KW {kw} <span className="text-[0.46875rem] text-zinc-400 font-bold block">SW {sw} ({monday.getDate()}.${monday.getMonth() + 1}.)</span>
                  </div>
                  <div className="flex-1 font-bold italic uppercase tracking-wider text-emerald-800 text-[0.5625rem]">
                    🏝️ {holidayInfo}
                  </div>
                </div>
              );
            } else {
              // Gather Termin-Pins
              const weekExams = Object.entries(pl).filter(([subId, cellData]: any) => cellData?.type && cellData.type !== 'standard');

              itemsArr.push(
                <div key={kw} className="py-1.5 border-b border-zinc-150 flex gap-4 text-[0.59375rem] avoid-break items-start">
                  <div className="w-24 shrink-0 font-extrabold text-black mt-0.5">
                    KW {kw} <span className="text-[0.46875rem] text-zinc-400 font-bold block">SW {sw} ({monday.getDate()}.${monday.getMonth() + 1}.)</span>
                    
                    {/* Termin-Pins list style */}
                    {jpShowPins && weekExams.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-0.5 max-w-[80px]">
                        {weekExams.map(([subId, cellData]: any, idx) => (
                          <span 
                            key={idx} 
                            className={`text-[0.45rem] font-black px-1 py-0.5 rounded leading-none border flex items-center gap-0.5 ${
                              cellData.type === 'sa' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                              cellData.type === 'test' || cellData.type === 'lzk' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                              'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}
                          >
                            <span>📌</span> {cellData.type === 'sa' ? 'SA' : cellData.type === 'test' ? 'T' : 'FIX'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-2">
                    {subjectsCols.map(sub => {
                      const content = getPayload(pl, sub.id, sub.label);
                      if (!content || (!content.thema && (!content.items || content.items.length === 0))) return null;
                      return (
                        <div key={sub.id} className="text-[0.5625rem] border-l-2 pl-1.5" style={{ borderColor: sub.color || '#CBD5E1' }}>
                          <span className="font-extrabold text-zinc-400 text-[0.46875rem] uppercase block leading-none mb-0.5">{sub.label}</span>
                          
                          {content.items && content.items.length > 0 ? (
                            <div className="space-y-1">
                              {content.items.map((it: any) => (
                                <div key={it.id} className="leading-tight border-b border-stone-100 last:border-0 pb-0.5 last:pb-0">
                                  {it.subCategory && (
                                    <span className="text-[0.45rem] text-blue-600 font-bold block">{it.subCategory.replace('Deutsch ', '')}</span>
                                  )}
                                  <span className="font-bold text-zinc-800">{it.thema}</span>
                                  {it.buch && <span className="text-[0.46875rem] text-zinc-500 italic block">📖 {it.buch}</span>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <>
                              <span className="font-bold text-zinc-800 leading-tight">{content.thema}</span>
                              {content.buch && <span className="text-[0.46875rem] text-zinc-500 block leading-tight mt-0.5">📖 {content.buch}</span>}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
          });
          return itemsArr;
        };

        const renderBentoGrid = () => {
          const MONATE = [
            { name: 'September', num: 8 },
            { name: 'Oktober', num: 9 },
            { name: 'November', num: 10 },
            { name: 'Dezember', num: 11 },
            { name: 'Jänner', num: 0 },
            { name: 'Februar', num: 1 },
            { name: 'März', num: 2 },
            { name: 'April', num: 3 },
            { name: 'Mai', num: 4 },
            { name: 'Juni', num: 5 },
            { name: 'Juli', num: 6 },
          ];

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
              {MONATE.map(m => {
                const monthWeeks = weeksList.filter(({ kw, year, monday }) => {
                  return monday.getMonth() === m.num;
                });
                if (monthWeeks.length === 0) return null;

                const items: Array<{
                  type: 'holiday' | 'sa' | 'test' | 'lzk' | 'event' | 'spielefest' | 'konferenz' | 'gespraech' | 'sonstiges' | 'standard';
                  label: string;
                  details?: string;
                  subjectLabel?: string;
                  colorClass?: string;
                  kw: number;
                  sw: number;
                }> = [];

                monthWeeks.forEach(({ sw, kw, year, monday }) => {
                  const holiday = isHoliday(monday, app?.calendarSettings?.disabledHolidays || [], app?.bundesland || 'VBG');
                  const isSevereHoliday = holiday && (holiday.includes('ferien') || holiday.includes('Schluss') || holiday.includes('Beginn'));
                  
                  if (holiday) {
                    if (jpShowHolidays) {
                      if (!items.some(it => it.type === 'holiday' && it.label === holiday)) {
                        items.push({
                          type: 'holiday',
                          label: holiday,
                          kw,
                          sw
                        });
                      }
                    }
                    if (isSevereHoliday) {
                      return; // skip planning items on severe holidays
                    }
                  }

                  const plannedWeek = jahresplanValues[kw] || {};
                  subjectsCols.forEach(s => {
                    const data = getPayload(plannedWeek, s.id, s.label);
                    if (data && (data.thema || (data.items && data.items.length > 0))) {
                      if (data.items && data.items.length > 0) {
                        data.items.forEach((it: any) => {
                          items.push({
                            type: (it.type as any) || 'standard',
                            label: it.thema,
                            details: it.buch,
                            subjectLabel: s.label,
                            colorClass: s.color,
                            kw,
                            sw
                          });
                        });
                      } else {
                        items.push({
                          type: (data.type as any) || 'standard',
                          label: data.thema,
                          details: data.buch,
                          subjectLabel: s.label,
                          colorClass: s.color,
                          kw,
                          sw
                        });
                      }
                    }
                  });
                });

                return (
                  <div key={m.name} className="bg-white border border-zinc-300 rounded-2xl p-4 shadow-sm flex flex-col min-h-[220px] avoid-break">
                    <div className="flex items-center justify-between border-b border-zinc-200 pb-2 mb-3 shrink-0">
                      <span className="text-[0.75rem] leading-tight font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                        📅 {m.name}
                      </span>
                      <span className="text-[0.5625rem] font-bold text-zinc-400 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded">
                        SW {monthWeeks[0]?.sw || 0} - {monthWeeks[monthWeeks.length - 1]?.sw || 0}
                      </span>
                    </div>

                    {items.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-stone-400 border border-dashed border-stone-200 rounded-xl bg-stone-50/50">
                        <span className="text-[0.5625rem] font-black uppercase tracking-wider text-stone-400">Keine Themen geplant</span>
                      </div>
                    ) : (
                      <div className="flex-1 space-y-2 max-h-[280px] overflow-y-auto pr-0.5">
                        {items.map((item, idx) => {
                          const isHolidayType = item.type === 'holiday';
                          const isSA = item.type === 'sa';
                          const isTest = item.type === 'test' || item.type === 'lzk';

                          let badgeColor = 'bg-stone-50 text-stone-850 border-zinc-200';
                          if (isHolidayType) badgeColor = 'bg-emerald-50 text-emerald-850 font-bold border-emerald-100';
                          else if (isSA) badgeColor = 'bg-rose-50 border-rose-200 text-rose-850 font-bold';
                          else if (isTest) badgeColor = 'bg-amber-50 border-amber-200 text-amber-850 font-bold';

                          return (
                            <div key={idx} className={`p-2 rounded-xl border text-[0.625rem] shadow-3xs flex flex-col gap-0.5 ${badgeColor}`}>
                              <div className="flex items-start justify-between gap-2 leading-none">
                                <span className="font-black text-[0.45rem] uppercase tracking-wider bg-white/60 px-1 rounded border border-black/5 shrink-0">
                                  SW {item.sw} / KW {item.kw}
                                </span>
                                {item.subjectLabel && (
                                  <span className="text-[0.5rem] font-black uppercase tracking-wider text-right opacity-85 shrink-0">
                                    {item.subjectLabel}
                                  </span>
                                )}
                              </div>
                              <div className="font-bold leading-tight mt-0.5">
                                {item.label}
                              </div>
                              {item.details && (
                                <div className="text-[0.5rem] opacity-75 italic mt-0.5">
                                  📖 {item.details}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        };

        return (
          <div className="space-y-4 text-slate-800">
            <div className="border-b border-zinc-400 pb-1 flex justify-between items-baseline avoid-break">
              <h3 className="text-[0.875rem] leading-snug font-black uppercase tracking-wider text-zinc-900">{customHeaderTitle || `Jahres-Curriculumsplanung`}</h3>
              <span className="text-[0.5625rem] font-bold text-zinc-500 uppercase">
                Schuljahr {app?.schuljahr} • {app?.stufe}.Klasse {app?.klassenbezeichnung || ''} • LP: {app?.nachname || ''}
              </span>
            </div>

            {jpDisplayMode === 'matrix' ? (
              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse table-fixed min-w-[600px]">
                  <thead>
                    <tr className="border-b border-zinc-400 bg-zinc-50 text-left avoid-break">
                      <th className="py-1.5 px-1 border border-zinc-300 text-[0.53125rem] font-black uppercase tracking-wider text-zinc-650 w-[75px]">KW / SW</th>
                      {subjectsCols.map(sub => {
                        const progress = subjectProgressMap.get(sub.id) || 0;
                        return (
                          <th key={sub.id} className="py-1.5 px-1.5 border border-zinc-300 text-[0.53125rem] font-black uppercase tracking-wider text-zinc-650">
                            <div>{sub.label}</div>
                            {/* Fachbezogener Fortschritts- & Abdeckungsbalken */}
                            {jpShowProgressBars && (
                              <div className="mt-1 max-w-[100px]">
                                <div className="w-full bg-zinc-200 h-1 rounded-full overflow-hidden flex border border-zinc-300/30">
                                  <div className="bg-emerald-600 h-full" style={{ width: `${progress}%` }} />
                                </div>
                                <div className="text-[0.45rem] font-bold text-zinc-400 mt-0.5 uppercase tracking-wide">
                                  Abdeckung {progress}%
                                </div>
                              </div>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {renderMatrixRows()}
                  </tbody>
                </table>
              </div>
            ) : jpDisplayMode === 'bento' ? (
              <div className="space-y-2">
                <span className="text-[0.5625rem] font-extrabold text-zinc-400 uppercase tracking-wider pb-0.5 border-b border-zinc-200 block">Monatliches bento-curriculum</span>
                {renderBentoGrid()}
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-[0.5625rem] font-extrabold text-zinc-400 uppercase tracking-wider pb-0.5 border-b border-zinc-200 block">Chronologisches Syllabusverzeichnis</span>
                <div className="space-y-1">
                  {renderListRows()}
                </div>
              </div>
            )}
          </div>
        );
      }

      // F. KEL PORTFOLIO DOSSIER (Single mode)
      case 'kel':
        const defaultStudent = students.find(s => s.id === kelSelectedStudentId) || students[0];
        if (!defaultStudent) {
          return (
            <div className="py-12 text-center text-zinc-400 font-bold">
              Keine Schüler erfasst. Tragen Sie Schüler in Ihre Schülerverwaltung ein, um das KEL-Dossier zu nutzen.
            </div>
          );
        }
        return renderSingleKelPortfolio(defaultStudent);

      // G. STUNDENPLAN
      case 'stundenplan':
        const daysAll = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
        const hoursList = [1, 2, 3, 4, 5, 6, 7, 8];

        return (
          <div className="space-y-4">
            <div className="border-b-[2pt] border-black pb-2 text-center">
              <h3 className="text-[1.25rem] leading-normal font-black uppercase tracking-widest text-[#000000]">{customHeaderTitle || 'Klassen-Stundenplan'}</h3>
              <p className="text-[0.625rem] font-black text-zinc-500 uppercase tracking-widest mt-1 animate-fade-in">Klasse: {app?.stufe}.Klasse {app?.klassenbezeichnung || ''} • Lehrperson: {app?.anrede ? `${app.anrede} ` : ''}{app.nachname || ''} • Schuljahr: {app?.schuljahr}</p>
            </div>

            <table className="w-full border-collapse text-center table-fixed h-auto">
              <thead>
                <tr className="border-b-[2pt] border-black bg-zinc-50">
                  <th className="py-2.5 px-1 text-[0.6875rem] font-black uppercase tracking-wider text-zinc-650 w-20">Std.</th>
                  {daysAll.map(d => (
                    <th key={d} className="py-2.5 px-1 text-[0.75rem] font-black uppercase tracking-widest text-black border-l border-zinc-250">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hoursList.map(h => {
                  return (
                    <tr key={h} className="border-b border-zinc-200">
                      {/* Hour heading */}
                      <td className="py-2.5 px-1 bg-zinc-50/50 border-r-[1.5pt] border-black">
                        <div className="text-[0.71875rem] font-black text-black leading-tight">{h}. Std.</div>
                        {spShowTimes && app?.stundenZeiten?.[h] && (
                          <div className="text-[0.53125rem] font-bold text-zinc-450 mt-0.5 leading-none">{app.stundenZeiten[h]}</div>
                        )}
                      </td>

                      {/* Monday - Friday lessons */}
                      {daysAll.map(d => {
                        const fachName = app?.stammplan?.[d]?.[h];
                        
                        return (
                          <td key={d} className="py-2 px-1 border-l border-zinc-250 align-middle">
                            {fachName ? (
                              <div className="space-y-0.5">
                                <span className="text-[0.71875rem] font-black text-black leading-none block break-words">{fachName}</span>
                              </div>
                            ) : (
                              <span className="text-zinc-300 font-bold italic text-[0.59375rem]">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );

      case 'eltern_diagnostik': {
        const targetSt = students.find(s => s.id === diagSelectedStudentId) || students[0];
        if (!targetSt) {
          return <div className="text-center py-6 text-slate-400 font-bold">Keine Schüler vorhanden.</div>;
        }
        return renderSingleElternDiagnostik(targetSt);
      }

      case 'schuelerprofil': {
        const targetSt = students.find(s => s.id === profSelectedStudentId) || students[0];
        if (!targetSt) {
          return <div className="text-center py-6 text-slate-400 font-bold">Keine Schüler vorhanden.</div>;
        }
        return renderSingleStudentProfile(targetSt);
      }

      case 'kel_presentation': {
        const targetSt = students.find(s => s.id === kpSelectedStudentId) || students[0];
        if (!targetSt) {
          return <div className="text-center py-6 text-slate-400 font-bold">Keine Schüler vorhanden.</div>;
        }
        return renderSingleKelPresentation(targetSt);
      }

      case 'sitzplan':
        return renderSeatingPlanView();

      case 'uebergabemappe':
        return renderUebergabemappeView();

      case 'pdf_export':
        return renderPdfExportView();

      case 'lob_druckkarte':
        return renderLobDruckkarteView();

      case 'fehlstunden':
        return renderFehlstundenView();

      case 'kassenuebersicht':
        return renderKassenuebersichtView();

      case 'smart_tools':
        return renderSmartToolsView();

      default:
        return null;
    }
  }

  function getStudentFehlstundenBySemester(studentId: string) {
    const attendanceData = app?.anwesenheit?.[studentId] || {};
    let excusedSem1 = 0;
    let unexcusedSem1 = 0;
    let excusedSem2 = 0;
    let unexcusedSem2 = 0;

    Object.entries(attendanceData).forEach(([dateStr, dayData]: [string, any]) => {
      if (!dayData) return;
      const sem = getSemester(dateStr);

      const statuses = typeof dayData === 'object' ? Object.values(dayData) : [dayData];

      statuses.forEach(status => {
        if (!status) return;
        const sStr = String(status).toLowerCase();
        if (sStr === 'e') {
          if (sem === 1) excusedSem1++;
          else excusedSem2++;
        } else if (sStr === 'u' || sStr === 'f') {
          if (sem === 1) unexcusedSem1++;
          else unexcusedSem2++;
        }
      });
    });

    return {
      sem1: { excused: excusedSem1, unexcused: unexcusedSem1, total: excusedSem1 + unexcusedSem1 },
      sem2: { excused: excusedSem2, unexcused: unexcusedSem2, total: excusedSem2 + unexcusedSem2 },
      total: { 
        excused: excusedSem1 + excusedSem2, 
        unexcused: unexcusedSem1 + unexcusedSem2, 
        total: excusedSem1 + excusedSem2 + unexcusedSem1 + unexcusedSem2 
      }
    };
  };

  function renderFehlstundenView() {
    const totalAbsStats = students.reduce((acc, st) => {
      const stats = getStudentFehlstundenBySemester(st.id);
      acc.exc1 += stats.sem1.excused;
      acc.unexc1 += stats.sem1.unexcused;
      acc.exc2 += stats.sem2.excused;
      acc.unexc2 += stats.sem2.unexcused;
      acc.totalExc += stats.total.excused;
      acc.totalUnexc += stats.total.unexcused;
      return acc;
    }, { exc1: 0, unexc1: 0, exc2: 0, unexc2: 0, totalExc: 0, totalUnexc: 0 });

    const classTotalHours = totalAbsStats.totalExc + totalAbsStats.totalUnexc;
    const classAvgHours = students.length > 0 ? (classTotalHours / students.length).toFixed(1) : '0.0';

    return (
      <div className="space-y-6 text-slate-800">
        <div className="border-b-2 border-black pb-3 flex justify-between items-end">
          <div className="text-left">
            <h3 className="text-[1.25rem] leading-none font-black uppercase tracking-wider">{customHeaderTitle || 'Fehlstunden-Übersicht'}</h3>
            <p className="text-[0.6875rem] font-bold text-zinc-500 mt-1">Auswertung nach Semestern und Gesamtjahr</p>
          </div>
          <div className="text-right">
            <span className="text-[0.625rem] font-black uppercase tracking-widest text-zinc-500 block">Klasse: {app?.stufe}.Klasse {app?.klassenbezeichnung}</span>
            <span className="text-[0.5625rem] font-bold text-zinc-400">Generiert am: {new Date().toLocaleDateString('de-DE')}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 border border-zinc-200 p-4 rounded-2xl bg-zinc-50/50">
          <div className="text-center p-2">
            <span className="text-[0.5625rem] font-black uppercase text-zinc-400 tracking-wider block">Gesamte Fehlstunden</span>
            <span className="text-[1.5rem] font-black leading-none mt-1 block">{classTotalHours} Std.</span>
            <span className="text-[0.55rem] text-zinc-400 font-bold mt-1 block">({totalAbsStats.totalExc} entschuldigt / {totalAbsStats.totalUnexc} unentschuldigt)</span>
          </div>
          <div className="text-center p-2 border-x border-zinc-200">
            <span className="text-[0.5625rem] font-black uppercase text-zinc-400 tracking-wider block">Ø pro Schüler/in</span>
            <span className="text-[1.5rem] font-black leading-none mt-1 block">{classAvgHours} Std.</span>
            <span className="text-[0.55rem] text-zinc-400 font-bold mt-1 block">Durchschnittlicher Ausfall</span>
          </div>
          <div className="text-center p-2">
            <span className="text-[0.5625rem] font-black uppercase text-zinc-400 tracking-wider block">Entschuldigungsquote</span>
            <span className="text-[1.5rem] font-black leading-none mt-1 block">
              {classTotalHours > 0 ? `${((totalAbsStats.totalExc / classTotalHours) * 100).toFixed(0)}%` : '100%'}
            </span>
            <span className="text-[0.55rem] text-zinc-400 font-bold mt-1 block">Anteil entschuldigter Stunden</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-zinc-50 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
                <th className="py-3 px-3 text-left w-10">Nr.</th>
                <th className="py-3 px-3 text-left min-w-[12rem]">Schüler/in</th>
                <th className="py-3 px-2 text-center border-l border-zinc-100 bg-indigo-50/10" colSpan={3}>1. Semester</th>
                <th className="py-3 px-2 text-center border-l border-zinc-100 bg-emerald-50/10" colSpan={3}>2. Semester</th>
                <th className="py-3 px-2 text-center border-l border-zinc-100 bg-amber-50/10" colSpan={3}>Gesamtjahr</th>
                <th className="py-3 px-3 text-center border-l border-zinc-100">Status</th>
              </tr>
              <tr className="bg-zinc-50/30 text-[0.5625rem] font-bold text-zinc-400 border-b border-zinc-100">
                <th></th>
                <th></th>
                <th className="py-1.5 px-1 border-l border-zinc-100 text-emerald-600 w-12 text-center font-mono">Ent.</th>
                <th className="py-1.5 px-1 text-rose-500 w-12 text-center font-mono">Une.</th>
                <th className="py-1.5 px-1 font-black text-slate-800 w-12 text-center font-mono">Ges.</th>
                <th className="py-1.5 px-1 border-l border-zinc-100 text-emerald-600 w-12 text-center font-mono">Ent.</th>
                <th className="py-1.5 px-1 text-rose-500 w-12 text-center font-mono">Une.</th>
                <th className="py-1.5 px-1 font-black text-slate-800 w-12 text-center font-mono">Ges.</th>
                <th className="py-1.5 px-1 border-l border-zinc-100 text-emerald-600 w-12 text-center font-mono">Ent.</th>
                <th className="py-1.5 px-1 text-rose-500 w-12 text-center font-mono">Une.</th>
                <th className="py-1.5 px-1 font-black text-zinc-800 w-12 text-center font-mono">Ges.</th>
                <th className="border-l border-zinc-100"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {students.map((st, idx) => {
                const stats = getStudentFehlstundenBySemester(st.id);
                const hasUnexcused = stats.total.unexcused > 0;
                const hasAbsences = stats.total.total > 0;

                return (
                  <tr key={st.id} className="hover:bg-zinc-50/50 transition-colors text-[0.8125rem]">
                    <td className="py-2.5 px-3 font-bold text-zinc-400 text-left">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-extrabold text-zinc-900 text-left">
                      {st.nachname} <span className="text-zinc-500 font-semibold">{st.vorname}</span>
                    </td>
                    
                    {/* Sem 1 */}
                    <td className="py-2.5 px-1 border-l border-zinc-200 text-center font-semibold text-emerald-600 font-mono">{stats.sem1.excused}</td>
                    <td className={`py-2.5 px-1 text-center font-bold font-mono ${stats.sem1.unexcused > 0 ? 'text-rose-500 bg-rose-50/30' : 'text-zinc-400'}`}>{stats.sem1.unexcused}</td>
                    <td className="py-2.5 px-1 text-center font-black text-zinc-800 font-mono bg-indigo-50/10">{stats.sem1.total}</td>
                    
                    {/* Sem 2 */}
                    <td className="py-2.5 px-1 border-l border-zinc-200 text-center font-semibold text-emerald-600 font-mono">{stats.sem2.excused}</td>
                    <td className={`py-2.5 px-1 text-center font-bold font-mono ${stats.sem2.unexcused > 0 ? 'text-rose-500 bg-rose-50/30' : 'text-zinc-400'}`}>{stats.sem2.unexcused}</td>
                    <td className="py-2.5 px-1 text-center font-black text-zinc-800 font-mono bg-emerald-50/10">{stats.sem2.total}</td>
                    
                    {/* Total */}
                    <td className="py-2.5 px-1 border-l border-zinc-200 text-center font-semibold text-emerald-600 font-mono bg-amber-50/5">{stats.total.excused}</td>
                    <td className={`py-2.5 px-1 text-center font-bold font-mono ${stats.total.unexcused > 0 ? 'text-rose-500 bg-rose-50/50' : 'text-zinc-400'}`}>{stats.total.unexcused}</td>
                    <td className="py-2.5 px-1 text-center font-black text-zinc-800 font-mono bg-amber-50/10">{stats.total.total}</td>
                    
                    {/* Status badge */}
                    <td className="py-2.5 px-3 border-l border-zinc-200 text-center text-[0.625rem] font-bold">
                      {!hasAbsences ? (
                        <span className="text-zinc-400">Keine</span>
                      ) : hasUnexcused ? (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-md border border-rose-100">Offene Belege</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-100">Erledigt</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        <div className="text-[0.625rem] text-zinc-400 font-medium italic text-left">
          * Aufteilung: 1. Semester umfasst die Monate September bis Jänner. 2. Semester umfasst Februar bis August.
        </div>
      </div>
    );
  }

  function renderKassenuebersichtView() {
    const { rows, openingBalance, totalIncome, totalExpense, closingBalance, hasRows } = koReportData;
    const classNameStr = `${app?.stufe || ''}${app?.stufe ? '. Klasse ' : 'Klasse '}${app?.klassenbezeichnung || app?.klasse || ''}`.trim();
    const formatEur = (v: number) => (Number(v) || 0).toLocaleString('de-AT', { style: 'currency', currency: 'EUR' });

    return (
      <div className="space-y-6 text-slate-900 font-sans">
        {/* Kopfbereich: Dokument-Header */}
        <div className="border-b-2 border-black pb-3 flex justify-between items-end gap-4">
          <div className="text-left">
            <h3 className="text-[1.25rem] leading-tight font-black uppercase tracking-wider text-black">
              {customHeaderTitle || 'Kassenübersicht – Einnahmen & Ausgaben'}
            </h3>
            <div className="text-[0.75rem] font-bold text-zinc-600 mt-1 flex items-center gap-2 flex-wrap">
              <span><strong>Klasse:</strong> {classNameStr || 'Klassenkasse'}</span>
              <span>•</span>
              <span><strong>Zeitraum:</strong> {koDateRange.periodLabel}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[0.625rem] font-black uppercase tracking-widest text-zinc-500 block">
              Schuljahr {app?.schuljahr || getCurrentSchuljahr()}
            </span>
            <span className="text-[0.625rem] font-bold text-zinc-400">
              Gedruckt am {new Date().toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Kompakte Finanz-Kennzahlen Box */}
        {koShowKpiBanner && (
          <div className="grid grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <div className="p-1">
              <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500 block">Anfangsbestand</span>
              <span className="text-[1rem] font-black text-slate-800 font-mono block mt-0.5">{formatEur(openingBalance)}</span>
            </div>
            <div className="p-1 border-l border-slate-200">
              <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-emerald-700 block">Einnahmen</span>
              <span className="text-[1rem] font-black text-emerald-700 font-mono block mt-0.5">+{formatEur(totalIncome)}</span>
            </div>
            <div className="p-1 border-l border-slate-200">
              <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-rose-700 block">Ausgaben</span>
              <span className="text-[1rem] font-black text-rose-700 font-mono block mt-0.5">-{formatEur(totalExpense)}</span>
            </div>
            <div className="p-1 border-l border-slate-200 bg-white rounded-lg border border-slate-200/80 shadow-3xs">
              <span className="text-[0.5625rem] font-black uppercase tracking-wider text-indigo-900 block">Endsaldo</span>
              <span className={`text-[1.0625rem] font-black font-mono block mt-0.5 ${closingBalance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                {formatEur(closingBalance)}
              </span>
            </div>
          </div>
        )}

        {/* Haupttabelle */}
        <table className="w-full border-collapse text-left text-[0.75rem]">
          <thead>
            <tr className="border-b-[1.5pt] border-black bg-slate-100/70 text-black font-black uppercase text-[0.625rem] tracking-wider">
              <th className="py-2.5 px-2.5 w-24 text-left">Datum</th>
              <th className="py-2.5 px-2 text-left">Beschreibung</th>
              <th className="py-2.5 px-2 w-28 text-left">Kategorie</th>
              <th className="py-2.5 px-2.5 w-24 text-right">Einnahme</th>
              <th className="py-2.5 px-2.5 w-24 text-right">Ausgabe</th>
              <th className="py-2.5 px-2.5 w-28 text-right">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {/* Anfangsbestand Zeile falls nicht 0 */}
            {openingBalance !== 0 && (
              <tr className="bg-slate-50/60 text-slate-600 italic">
                <td className="py-2 px-2.5 font-medium whitespace-nowrap text-slate-400">
                  {new Date(koDateRange.startDateStr).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </td>
                <td className="py-2 px-2 font-bold text-slate-700" colSpan={2}>
                  Anfangsbestand / Vortrag vor {koDateRange.periodLabel}
                </td>
                <td className="py-2 px-2.5 text-right font-mono text-slate-400">—</td>
                <td className="py-2 px-2.5 text-right font-mono text-slate-400">—</td>
                <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">
                  {formatEur(openingBalance)}
                </td>
              </tr>
            )}

            {!hasRows ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 font-bold text-[0.875rem] italic">
                  Keine Buchungen im ausgewählten Zeitraum.
                </td>
              </tr>
            ) : (
              rows.map((tx, idx) => {
                const isEven = idx % 2 === 0;
                const formattedDate = tx.datum
                  ? new Date(tx.datum).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : '—';
                const katLabel = tx.kategorie === 'ausgabe'
                  ? 'Ausgabe'
                  : tx.kategorie === 'sammlung'
                  ? 'Geldsammlung'
                  : tx.kategorie === 'sonstiges'
                  ? 'Sonstiges'
                  : tx.kategorie || (tx.isPlus ? 'Einnahme' : 'Ausgabe');

                return (
                  <tr
                    key={tx.id || idx}
                    className={`break-inside-avoid ${isEven ? 'bg-white' : 'bg-slate-50/40'} hover:bg-slate-100/50 transition-colors`}
                  >
                    <td className="py-2 px-2.5 font-medium whitespace-nowrap text-slate-700 align-top">
                      {formattedDate}
                    </td>
                    <td className="py-2 px-2 font-bold text-slate-900 align-top leading-snug break-words">
                      {tx.titel}
                    </td>
                    <td className="py-2 px-2 text-slate-600 align-top text-[0.6875rem]">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200/80 font-medium">
                        {katLabel}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-700 align-top whitespace-nowrap">
                      {tx.einnahme !== null ? formatEur(tx.einnahme) : ''}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-bold text-rose-700 align-top whitespace-nowrap">
                      {tx.ausgabe !== null ? formatEur(tx.ausgabe) : ''}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-black text-slate-900 align-top whitespace-nowrap">
                      {formatEur(tx.saldo)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-[1.5pt] border-black bg-slate-100 font-bold text-slate-900">
              <td colSpan={3} className="py-2.5 px-2.5 uppercase text-[0.6875rem] font-black tracking-wider">
                Summen im Zeitraum
              </td>
              <td className="py-2.5 px-2.5 text-right font-mono font-black text-emerald-800 whitespace-nowrap">
                {formatEur(totalIncome)}
              </td>
              <td className="py-2.5 px-2.5 text-right font-mono font-black text-rose-800 whitespace-nowrap">
                {formatEur(totalExpense)}
              </td>
              <td className="py-2.5 px-2.5 text-right font-mono font-black text-black whitespace-nowrap">
                {formatEur(closingBalance)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Zusammenfassungs-Kasten */}
        <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/80 space-y-2 break-inside-avoid">
          <div className="text-[0.6875rem] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1.5">
            Zusammenfassung Kassenstand
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-[0.8125rem]">
            <div>
              <span className="text-slate-600 font-medium">Einnahmen gesamt:</span>{' '}
              <strong className="font-mono text-emerald-700">{formatEur(totalIncome)}</strong>
            </div>
            <div>
              <span className="text-slate-600 font-medium">Ausgaben gesamt:</span>{' '}
              <strong className="font-mono text-rose-700">{formatEur(totalExpense)}</strong>
            </div>
            <div>
              <span className="text-slate-900 font-black">Endsaldo:</span>{' '}
              <strong className="font-mono text-slate-950 text-[0.9375rem]">{formatEur(closingBalance)}</strong>
            </div>
          </div>
        </div>

        {/* Unterschriftenzeilen */}
        {koShowSignatures && (
          <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-12 text-[0.75rem] break-inside-avoid">
            <div className="space-y-8">
              <p className="text-slate-500 text-[0.6875rem]">
                Ort, Datum: _________________________________
              </p>
              <div className="border-t border-slate-400 pt-1.5">
                <p className="font-bold text-slate-800">{app?.anrede ? `${app.anrede} ` : ''}{app?.nachname || 'Klassenlehrer:in'}</p>
                <p className="text-[0.625rem] text-slate-500 uppercase tracking-wider font-semibold">Klassenleitung</p>
              </div>
            </div>
            <div className="space-y-8">
              <p className="text-slate-500 text-[0.6875rem] text-transparent select-none">
                .
              </p>
              <div className="border-t border-slate-400 pt-1.5">
                <p className="font-bold text-slate-800">Rechnungsprüfung / Schulleitung</p>
                <p className="text-[0.625rem] text-slate-500 uppercase tracking-wider font-semibold">Geprüft &amp; Übernommen</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderSmartToolsView() {
    switch (activeSmartTool) {
      case 'tischschilder': {
        let list = students;
        if (stTischStudentId !== 'all') {
          list = students.filter(s => s.id === stTischStudentId);
        }

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
            {list.map(st => {
              // Design specific styles
              let themeBg = 'bg-emerald-50 text-emerald-900 border-emerald-400';
              let themeEmoji = '🦖🦕🌴';
              let themeDesc = 'Dino-Crew';
              
              if (stTischStyle === 'space') {
                themeBg = 'bg-indigo-950 text-indigo-100 border-indigo-700';
                themeEmoji = '🚀🪐⭐️';
                themeDesc = 'Weltraum-Forscher';
              } else if (stTischStyle === 'ocean') {
                themeBg = 'bg-sky-50 text-sky-900 border-sky-400';
                themeEmoji = '🐬🐳🐙';
                themeDesc = 'Meeres-Entdecker';
              } else if (stTischStyle === 'minimal') {
                themeBg = 'bg-stone-50 text-stone-900 border-stone-400';
                themeEmoji = '✨🎓✨';
                themeDesc = 'Schul-Klasse';
              }

              return (
                <div key={st.id} className="avoid-break p-4 bg-white rounded-3xl border border-slate-200 shadow-sm text-left">
                  <span className="text-[0.5625rem] font-bold text-slate-400 uppercase block mb-2 select-none">
                    🖨️ A4 Querformat · Faltbares Tischschild ({themeDesc})
                  </span>
                  
                  {/* Foldable Tent Card Visual Representation */}
                  <div className={`w-full aspect-[297/210] border-2 border-dashed rounded-2xl p-4 flex flex-col justify-between ${themeBg}`}>
                    {/* Back Side (Inverted Name for other students/teachers to see when looking at the desk) */}
                    <div className="text-center rotate-180 border-b border-dashed border-current/20 pb-4">
                      <span className="text-[0.5625rem] font-black uppercase tracking-widest opacity-60">Faltkante • Rückseite</span>
                      <h4 className="text-[1.75rem] leading-none font-extrabold tracking-tight mt-1 capitalize">
                        {st.vorname}
                      </h4>
                    </div>

                    {/* Front Side (For the child to see, or for desk labeling) */}
                    <div className="space-y-4 pt-4 text-center">
                      <div className="text-xs font-bold tracking-widest uppercase opacity-75 flex justify-center gap-2">
                        <span>{themeEmoji.substring(0,2)}</span>
                        <span>{app?.stufe || st.besuchsjahr}. Klasse</span>
                        <span>{themeEmoji.substring(2,4)}</span>
                      </div>
                      
                      <h3 className="text-[2.25rem] leading-none font-black tracking-tight uppercase">
                        {st.vorname} {st.nachname}
                      </h3>

                      {/* Educational Helper Line (ABC and 1-20) if enabled */}
                      {stTischShowHelper && (
                        <div className="mt-4 p-2 bg-white/80 rounded-xl border border-current/10 text-stone-800 space-y-1 text-left font-mono">
                          <div className="text-[0.53125rem] leading-none font-black text-center border-b border-stone-200 pb-1 flex justify-between">
                            <span>A B C D E F G H I J K L M N O P Q R S T U V W X Y Z</span>
                          </div>
                          <div className="text-[0.53125rem] leading-none font-black text-center flex justify-between pt-0.5">
                            <span>1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      }

      case 'urkunden': {
        let list = students;
        if (stUrkundeStudentId !== 'all') {
          list = students.filter(s => s.id === stUrkundeStudentId);
        }

        return (
          <div className="space-y-8 p-2 text-left">
            {list.map(st => (
              <div key={st.id} className="avoid-break bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-2xl mx-auto">
                <span className="text-[0.5625rem] font-bold text-slate-400 uppercase block mb-4 select-none">
                  🖨️ A4 Hochformat · Motivations-Urkunde
                </span>

                {/* Diploma Content Frame */}
                <div className="aspect-[210/297] border-[10px] border-double border-indigo-900 bg-[#fffdfa] p-10 flex flex-col justify-between text-slate-900 text-center relative rounded-xl shadow-inner" style={{ fontFamily: 'Georgia, serif' }}>
                  <div className="absolute inset-2 border border-indigo-900/10 rounded pointer-events-none" />

                  {/* Top Emblem */}
                  <div className="space-y-2 pt-4">
                    <span className="text-5xl block">🏅</span>
                    <h1 className="text-3xl font-black uppercase tracking-widest text-indigo-950 mt-4 leading-none">
                      {stUrkundeTitle}
                    </h1>
                    <div className="h-0.5 w-24 bg-indigo-900 mx-auto mt-3" />
                  </div>

                  {/* Body Text */}
                  <div className="space-y-6 flex-1 flex flex-col justify-center py-8">
                    <p className="text-stone-500 font-sans font-bold uppercase tracking-widest text-xs">
                      Diese Auszeichnung wird feierlich verliehen an:
                    </p>
                    <h2 className="text-4xl font-black underline decoration-amber-400 decoration-wavy underline-offset-8 text-slate-950 capitalize py-2">
                      {st.vorname} {st.nachname}
                    </h2>
                    <p className="text-lg leading-relaxed text-slate-800 italic px-6 max-w-lg mx-auto">
                      „{stUrkundeText}“
                    </p>
                  </div>

                  {/* Footer & Signatures */}
                  <div className="border-t border-indigo-900/15 pt-6 pb-4">
                    <div className="grid grid-cols-2 gap-8 text-stone-600 font-sans font-bold text-[0.75rem]">
                      <div className="space-y-6">
                        <div className="border-b border-dashed border-stone-300 pb-1 font-mono text-slate-900">
                          {stUrkundeDate}
                        </div>
                        <span className="uppercase text-[0.625rem] text-stone-400 tracking-wider">Ausstellungsdatum</span>
                      </div>
                      <div className="space-y-6">
                        <div className="border-b border-dashed border-stone-300 pb-1 font-serif text-indigo-950 italic">
                          {app.lehrerName || 'Die Klassenlehrkraft'}
                        </div>
                        <span className="uppercase text-[0.625rem] text-stone-400 tracking-wider">Klassenlehrer/in</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      }

      case 'joker': {
        return (
          <div className="space-y-8 p-2 text-left">
            <span className="text-[0.5625rem] font-bold text-slate-400 uppercase block select-none">
              🖨️ A4 Hochformat · Gutschein-Coupons (Dashed cut borders)
            </span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {students.map((st, idx) => (
                <div key={st.id} className="avoid-break bg-[#faf8f5] border-2 border-dashed border-amber-600 rounded-3xl p-6 relative flex flex-col justify-between aspect-[148/105] text-left shadow-sm">
                  {/* Coupon Ticket Header */}
                  <div className="flex justify-between items-start border-b border-amber-200 pb-3">
                    <div>
                      <span className="text-[0.5625rem] bg-amber-600 text-white font-black px-2 py-0.5 rounded uppercase tracking-wider">GUTSCHEIN</span>
                      <h3 className="text-[1.125rem] leading-normal font-black text-amber-900 mt-1">{stJokerTitle}</h3>
                    </div>
                    <span className="text-3xl">🎟️</span>
                  </div>

                  {/* Coupon Core */}
                  <div className="flex-1 py-4">
                    <p className="text-[0.6875rem] font-bold text-slate-500 uppercase tracking-wider">
                      Ausgestellt für: <span className="text-slate-900 underline capitalize">{st.vorname} {st.nachname}</span>
                    </p>
                    <p className="text-[0.75rem] leading-snug font-medium text-slate-700 italic mt-2">
                      „{stJokerText}“
                    </p>
                  </div>

                  {/* Footer Stub & Signature line */}
                  <div className="border-t border-dashed border-amber-200 pt-3 flex justify-between items-end text-[0.625rem] font-bold text-amber-850">
                    <span>Gültig im laufenden Schuljahr</span>
                    <div className="text-right">
                      <div className="border-b border-amber-400/50 w-24 pb-1 italic font-serif text-slate-800">
                        {app.lehrerName || 'Lehrkraft'}
                      </div>
                      <span className="text-[0.5rem] text-stone-400 uppercase block mt-0.5">Unterschrift</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'pocket': {
        const sorted = [...students].sort((a, b) => a.nachname.localeCompare(b.nachname));

        return (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-2xl mx-auto space-y-6 text-left">
            <div className="border-b border-slate-200 pb-3">
              <span className="text-[0.5625rem] bg-rose-650 text-white font-black px-2.5 py-1 rounded uppercase tracking-wider">NOTFALL-KIT</span>
              <h2 className="text-[1.25rem] leading-normal font-black text-slate-900 mt-2">Taschen-Klassenliste (Foldable Pocket Booklet)</h2>
              <p className="text-[0.6875rem] font-bold text-slate-500 mt-1">
                Faltanleitung: Drucken Sie diese Seite auf A4 aus. Falten Sie sie einmal der Länge nach, dann zweimal quer. So erhalten Sie ein perfektes Mini-Klassentelefonbuch für Ihre Geldtasche!
              </p>
            </div>

            {/* Foldable Pocket A4 Frame Mockup */}
            <div className="border-4 border-dashed border-slate-300 rounded-2xl p-6 bg-slate-50 relative">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full h-0.5 border-t-2 border-dashed border-slate-300" />
                <div className="h-full w-0.5 border-l-2 border-dashed border-slate-300" />
              </div>

              {/* Booklet Header */}
              <div className="flex justify-between items-baseline mb-4 text-slate-900 border-b border-slate-900/10 pb-1 font-black uppercase text-[0.59375rem] tracking-widest">
                <span>🎒 Notfall-Klassenliste</span>
                <span>Klasse: {app?.stufe}.Klasse ({app?.schuljahr})</span>
              </div>

              {/* Tiny Grid list */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[0.5625rem] text-slate-800 leading-tight">
                {sorted.map((st, idx) => (
                  <div key={st.id} className="border-b border-slate-200 pb-1.5 flex flex-col justify-between">
                    <div className="flex justify-between font-black text-slate-950">
                      <span>{idx + 1}. {st.nachname} {st.vorname}</span>
                      <span className="text-stone-400 font-mono text-[0.5rem]">{st.geburtstag || 'k.A.'}</span>
                    </div>
                    <div className="flex justify-between text-[0.5rem] text-stone-500 mt-0.5">
                      <span className="truncate">👩 {st.telefon_mutter || 'Keine Nummer'}</span>
                      <span className="truncate">👨 {st.telefon_vater || 'Keine Nummer'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Extra fold markers */}
              <div className="text-[0.5rem] text-slate-400 font-bold uppercase tracking-widest text-center mt-6 select-none">
                ✂️ Faltlinien (Zweimal falten) • Passt perfekt in jeden Geldbeutel
              </div>
            </div>
          </div>
        );
      }

      case 'labels': {
        return (
          <div className="space-y-6 p-2 text-left">
            <span className="text-[0.5625rem] font-bold text-slate-400 uppercase block select-none">
              🖨️ A4 Hochformat · Große Klassenzimmer-Ordnungsbox-Labels (6 pro Blatt)
            </span>

            <div className="grid grid-cols-2 gap-4">
              {stLabels.map((lbl, idx) => (
                <div key={idx} className="avoid-break bg-white border-4 border-slate-900 rounded-3xl p-6 text-center flex flex-col justify-center items-center shadow-md aspect-[120/75] group transition-all hover:scale-[1.01]">
                  {/* Label Title with prominent typography */}
                  <h3 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-snug">
                    {lbl}
                  </h3>
                  <div className="w-12 h-1 bg-slate-900 mt-4 rounded-full" />
                  <span className="text-[0.5rem] font-black uppercase tracking-wider text-slate-400 mt-2 select-none">Klassenzimmer-Beschriftung</span>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'ids': {
        return (
          <div className="space-y-6 p-2 text-left">
            <span className="text-[0.5625rem] font-bold text-slate-400 uppercase block select-none">
              🖨️ A4 Hochformat · Namenskarten (85 × 54 mm)
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {students.map(st => (
                <div key={st.id} className="avoid-break w-full max-w-[340px] aspect-[85/54] bg-slate-950 text-white rounded-3xl p-4 flex flex-col justify-between relative overflow-hidden shadow-md border border-slate-800">
                  {/* Decorative background circle */}
                  <div className="absolute -top-12 -right-12 w-28 h-28 bg-indigo-650 rounded-full opacity-10 pointer-events-none" />
                  
                  {/* Card Header */}
                  <div className="flex justify-between items-start border-b border-white/10 pb-2">
                    <div>
                      <h4 className="text-[0.5625rem] font-black tracking-wider uppercase text-indigo-400 truncate max-w-[150px]">
                        {stSchoolName}
                      </h4>
                      <span className="text-[0.5rem] font-bold text-slate-400 block mt-0.5 leading-none">NAMENSKARTE · KEIN AMTLICHER AUSWEIS</span>
                    </div>
                    <span className="text-[0.5625rem] bg-indigo-600 text-white font-black px-1.5 py-0.5 rounded tracking-wide font-mono">
                      {app?.schuljahr}
                    </span>
                  </div>

                  {/* Card Core: Photo placeholder + Details */}
                  <div className="flex-1 py-2 flex gap-3 items-center">
                    {/* Photo Slot */}
                    <div className="w-12 h-16 bg-slate-900 border border-white/10 rounded flex flex-col items-center justify-center text-slate-500 shrink-0 select-none">
                      <span className="text-xs">👤</span>
                      <span className="text-[0.375rem] font-bold mt-1 uppercase text-slate-600 tracking-wider">FOTO</span>
                    </div>

                    {/* Details list */}
                    <div className="flex-1 text-[0.5625rem] space-y-0.5 min-w-0">
                      <div>
                        <span className="text-[0.45rem] uppercase text-slate-500 block">Name des Schülers / der Schülerin</span>
                        <strong className="text-white text-[0.6875rem] font-black leading-none truncate block capitalize">{st.nachname}, {st.vorname}</strong>
                      </div>
                      <div className="grid grid-cols-2 gap-1 pt-1 border-t border-white/5">
                        <div>
                          <span className="text-[0.45rem] uppercase text-slate-500 block">Schulstufe</span>
                          <span className="font-bold text-indigo-300 block">{app?.stufe || st.besuchsjahr}. Klasse</span>
                        </div>
                        <div>
                          <span className="text-[0.45rem] uppercase text-slate-500 block">Geburtsdatum</span>
                          <span className="font-bold text-slate-300 block">{st.geburtstag || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Class Seal watermark overlay */}
                  <div className="absolute bottom-1 right-2 w-10 h-10 border border-indigo-450/25 rounded-full flex items-center justify-center font-black text-[0.3125rem] text-indigo-450/45 rotate-12 uppercase pointer-events-none">
                    SEAL-VS
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'birthday': {
        const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
        const emojis = ['❄️', '⛄', '🌱', '🌸', '🌼', '☀️', '🏖️', '🍦', '🍂', '🍁', '🪵', '🎄'];
        
        // Group students by birth month
        const group: Record<number, any[]> = {};
        students.forEach(s => {
          if (s.geburtstag) {
            // format standard is DD.MM.YYYY
            const parts = s.geburtstag.split('.');
            if (parts.length >= 2) {
              const month = parseInt(parts[1], 10) - 1; // 0-indexed
              if (month >= 0 && month < 12) {
                if (!group[month]) group[month] = [];
                group[month].push(s);
              }
            }
          }
        });

        return (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-4xl mx-auto space-y-6 text-left">
            <div className="border-b-[2pt] border-slate-900 pb-3 flex justify-between items-end">
              <div>
                <span className="text-[0.5625rem] bg-indigo-900 text-white font-black px-2.5 py-1 rounded uppercase tracking-wider">KLASSEN-WALLPAPER</span>
                <h2 className="text-[1.5rem] leading-normal font-black text-slate-900 mt-2">Klassen-Geburtstagskalender 📅</h2>
                <p className="text-[0.6875rem] font-bold text-slate-500 mt-0.5">A4 Querformat Poster für die Klassenzimmerwand</p>
              </div>
              <span className="text-[0.625rem] font-bold text-slate-400">Klasse: {app?.stufe}.Klasse</span>
            </div>

            {/* Poster Grid of months */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {months.map((m, idx) => {
                const birthdayKids = group[idx] || [];
                return (
                  <div key={m} className={`border p-3.5 rounded-2xl bg-slate-50 flex flex-col justify-between min-h-24 transition-all hover:bg-slate-100 ${birthdayKids.length > 0 ? 'border-indigo-200 bg-indigo-50/10' : 'border-slate-150'}`}>
                    <div>
                      <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                        <span className="text-[0.6875rem] font-black text-slate-800 uppercase tracking-wider">{m}</span>
                        <span className="text-xs">{emojis[idx]}</span>
                      </div>
                      
                      <div className="space-y-1 mt-2">
                        {birthdayKids.length > 0 ? (
                          birthdayKids.map(k => {
                            const bday = k.geburtstag.split('.')[0];
                            return (
                              <div key={k.id} className="text-[0.6875rem] font-bold text-slate-700 truncate capitalize flex justify-between">
                                <span>🎉 {k.vorname}</span>
                                <span className="font-mono text-indigo-600 text-[0.625rem]">({bday}.)</span>
                              </div>
                            );
                          })
                        ) : (
                          <span className="text-[0.5625rem] text-slate-400 italic block">Keine Geburtstage</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'jobs': {
        return (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-2xl mx-auto space-y-6 text-left">
            <div className="border-b-[2pt] border-slate-900 pb-3 flex justify-between items-end">
              <div>
                <span className="text-[0.5625rem] bg-indigo-900 text-white font-black px-2.5 py-1 rounded uppercase tracking-wider">KLASSENDIENSTE</span>
                <h2 className="text-[1.5rem] leading-normal font-black text-slate-900 mt-2">Klassendienste-Poster 🧹</h2>
                <p className="text-[0.6875rem] font-bold text-slate-500 mt-0.5">Wer hilft heute im Klassenzimmer mit?</p>
              </div>
              <span className="text-[0.625rem] font-bold text-slate-400">Klasse {app?.stufe}.Klasse</span>
            </div>

            {/* Poster content */}
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(stJobs).map(([job, studId]) => {
                const targetStudent = students.find(s => s.id === studId);
                return (
                  <div key={job} className={`border-2 p-5 rounded-3xl text-center transition-all ${targetStudent ? 'border-emerald-500 bg-emerald-50/10 shadow-3xs' : 'border-slate-200 bg-slate-50 opacity-75'}`}>
                    <span className="text-3xl block mb-2">{job.split(' ').pop()}</span>
                    <h4 className="text-[0.75rem] leading-tight font-black uppercase tracking-wider text-slate-550">{job.replace(/\s\S+$/, '')}</h4>
                    
                    <div className="mt-3">
                      {targetStudent ? (
                        <span className="text-[1.125rem] leading-normal font-black text-emerald-900 capitalize block underline decoration-emerald-400 decoration-2 underline-offset-4">
                          ✨ {targetStudent.vorname} {targetStudent.nachname}
                        </span>
                      ) : (
                        <span className="text-[0.6875rem] text-slate-400 italic block font-bold">
                          — Noch unbesetzt —
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'meeting': {
        return (
          <div className="space-y-6 p-2 text-left">
            <span className="text-[0.5625rem] font-bold text-slate-400 uppercase block select-none">
              🖨️ A4 Hochformat · Sprechtag-Terminkärtchen (Dashed cut lines)
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {students.map(st => {
                const timeAllocated = stMeetingTimes[st.id] || '_________________';
                return (
                  <div key={st.id} className="avoid-break bg-[#fcfdfd] border-2 border-dashed border-sky-400 rounded-3xl p-5 relative flex flex-col justify-between shadow-2xs aspect-[130/80] text-left">
                    {/* Header */}
                    <div className="border-b border-sky-100 pb-2.5 flex justify-between items-start">
                      <div>
                        <span className="text-[0.5rem] bg-sky-600 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-wider">ERINNERUNG</span>
                        <h4 className="text-[0.875rem] leading-snug font-black text-sky-900 mt-1">Elternsprechtag-Termin</h4>
                      </div>
                      <span className="text-2xl">💬</span>
                    </div>

                    {/* Content Details */}
                    <div className="py-3 text-[0.6875rem] font-bold text-slate-600 space-y-1">
                      <p>Schüler/in: <strong className="text-slate-900 capitalize">{st.vorname} {st.nachname}</strong></p>
                      <p>Datum: <strong className="text-slate-900">{stMeetingDate}</strong></p>
                      <p>Uhrzeit: <strong className="text-indigo-600 text-[0.8125rem] bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 inline-block font-black mt-0.5">{timeAllocated} Uhr</strong></p>
                      <p>Raum: <strong className="text-slate-900">{stMeetingRoom}</strong></p>
                    </div>

                    {/* Mitzubringen note */}
                    {stMeetingDocs && (
                      <div className="text-[0.5625rem] bg-slate-50 p-1.5 rounded-lg border border-slate-100 text-slate-500 font-bold leading-normal">
                        📝 Bitte mitbringen: {stMeetingDocs}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'queue': {
        return (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm max-w-2xl mx-auto space-y-6 text-left">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center font-black">
                  🖨️
                </div>
                <div>
                  <h2 className="text-[1.25rem] leading-normal font-black text-slate-900">Druck-Warteschlange (Bulk Multi-Page Layout)</h2>
                  <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Sammelauftrag für alle {students.length} Kinder</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-[0.75rem] leading-tight font-semibold text-slate-700">
              <p className="leading-relaxed font-bold">
                Hier können Sie ein gebündeltes PDF drucken, das für alle Kinder nacheinander mehrere verschiedene Dokumente in einem Rutsch zusammenstellt. Ideal, um am Jahresende Zeit und Papier zu sparen!
              </p>

              <div className="bg-emerald-50/50 rounded-2xl border border-emerald-100 p-4 space-y-2.5">
                <h4 className="text-[0.6875rem] font-black uppercase tracking-wider text-emerald-800">Paketinhalt für dieses Jahr:</h4>
                <div className="space-y-1.5 font-bold text-emerald-950">
                  <div className="flex gap-2"><span>•</span> <span>1x Klassen-Tischschilder ({stTischStyle === 'dino' ? '🦖 Dino' : stTischStyle === 'space' ? '🚀 Space' : stTischStyle === 'ocean' ? '🐬 Ocean' : '✨ Minimal'})</span></div>
                  <div className="flex gap-2"><span>•</span> <span>1x Schul-Urkunde ({stUrkundeTitle})</span></div>
                  <div className="flex gap-2"><span>•</span> <span>1x Hausübungs- &amp; Joker-Gutschein ({stJokerTitle})</span></div>
                  <div className="flex gap-2"><span>•</span> <span>1x Taschen-Emergency-Klassenliste</span></div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-between items-center gap-4">
                <span className="text-[0.5625rem] text-slate-400 block font-bold leading-none">Status: Bereit für den A4-Druck</span>
                <button
                  type="button"
                  onClick={handleTriggerPrint}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[0.6875rem] tracking-widest px-6 py-3 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>🖨️</span>
                  <span>Jetzt Sammeldruck starten</span>
                </button>
              </div>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  }

  function renderLobDruckkarteView() {
    let toRender = students;
    if (lobStudentMode === 'single') {
      toRender = students.filter(s => s.id === lobSelectedStudentId);
    }

    const tpl = COMPLIMENT_TEMPLATES.find(t => t.id === lobSelectedTemplate) || COMPLIMENT_TEMPLATES[0];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {toRender.map((st, idx) => (
          <div key={`${st.id}-${idx}`} className="avoid-break mb-8">
            <div 
              id={`printable-compliment-card-${st.id}`}
              className="w-[148mm] h-[105mm] bg-[#fffcf5] border-[6px] border-double border-amber-600 p-8 rounded-lg shadow-md flex flex-col justify-between text-slate-900 relative mx-auto"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif', transform: 'scale(0.8)', transformOrigin: 'top center' }}
            >
              {/* Frame lines decoration */}
              <div className="absolute top-2 left-2 right-2 bottom-2 border border-amber-700/25 pointer-events-none rounded" />
              
              <div className="text-center space-y-2 mt-4">
                <span className="text-4xl block">{tpl.emoji}</span>
                <h3 className="text-amber-800 text-[1.125rem] leading-normal font-black uppercase tracking-widest leading-none mt-2">
                  Lob-Dusche & Anerkennung
                </h3>
                <p className="text-[0.625rem] font-sans font-bold text-stone-400 mt-2">EIN HERZLICHES DANKE FÜR DEINE PÄDAGOGISCHE LEISTUNG</p>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                <p className="text-[0.75rem] leading-tight text-stone-500 italic mt-2 leading-none">Gewidmet an:</p>
                <h4 className="text-[1.5rem] leading-normal font-serif font-black underline decoration-amber-300 py-2 text-slate-900 capitalize mt-2 mb-2">
                  {st.vorname} {st.nachname}
                </h4>
                <p className="text-[0.875rem] leading-snug text-slate-800 tracking-tight leading-relaxed italic px-4 max-w-sm mt-3">
                  „{lobCustomText || tpl.complimentText}“
                </p>
              </div>

              <div className="flex justify-between items-center px-4 pt-4 border-t border-amber-200/40 text-[0.6875rem] font-sans font-bold text-amber-900 mb-2">
                <span>Von: <span className="underline italic">{lobSender}</span></span>
                <span>Ein gutes Herz verändert die Welt ❤️</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // --- H. NEW HIGH-FIDELITY RENDERERS ---

  function renderSingleElternDiagnostik(st: any) {
    const tests = app?.diagnostikTests || [];
    const erhebungen = [...(app?.diagnostikErhebungen || [])]
      .filter((e: any) => e.schuelerId === st.id)
      .sort((a, b) => b.datum.localeCompare(a.datum));
      
    // wir gruppen nach testId
    const byTest: Record<string, any[]> = {};
    erhebungen.forEach(e => {
        if (!byTest[e.testId]) byTest[e.testId] = [];
        byTest[e.testId].push(e);
    });

    return (
      <div className="space-y-6 pt-4 text-[0.6875rem] print-dossier-body">
        {/* Main Cover Panel */}
        <div className="flex border-b-2 border-slate-900 pb-2 mb-4 justify-between items-end">
          <div>
            <h2 className="text-[1.25rem] leading-normal font-black text-slate-900 uppercase tracking-widest">
              Lern- &amp; Entwicklungsbericht
            </h2>
            <p className="text-[0.875rem] leading-snug text-slate-500 font-bold mt-1">Für {st.vorname} {st.nachname}</p>
          </div>
          <div className="text-right text-[0.625rem] font-bold text-slate-500 leading-tight">
            <span>Stufe: {app?.stufe || st.besuchsjahr}.Klasse • SJ {app?.schuljahr}</span>
            <span className="block mt-0.5">Bericht erstellt am: {new Date().toLocaleDateString('de-AT')}</span>
          </div>
        </div>

        {erhebungen.length === 0 ? (
           <p className="text-slate-400 font-bold italic text-center py-6">Noch keine Diagnostik-Daten für {st.vorname} erfasst.</p>
        ) : (
           <div className="space-y-8">
             {Object.entries(byTest).map(([testId, testErhebungen]) => {
                const testMeta = tests.find(t => t.id === testId);
                const isLive = testId.startsWith('live-');
                // The most recent result is the first one
                const latest = testErhebungen[0];
                return (
                  <div key={testId} className="border border-slate-200 rounded-2xl  pb-4 break-inside-avoid">
                     <div className="bg-slate-100 p-3 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                        <div>
                          <h3 className="font-black text-slate-800 text-[0.875rem] leading-snug">{testMeta?.name || 'Test'}</h3>
                          <p className="text-[0.625rem] text-slate-500">{testMeta?.kurzbeschreibung}</p>
                        </div>
                        {isLive && <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[0.5rem] font-black uppercase tracking-widest">1:1 Live-Diagnose</span>}
                     </div>

                     <div className="p-4 flex flex-col md:flex-row gap-6">
                        <div className="flex-1 space-y-4">
                           <div className="flex items-center gap-3">
                              <div className={`text-[1.5rem] leading-normal font-black tabular-nums ${isDiagnosticAlert(latest) ? 'text-amber-600' : 'text-emerald-600'}`}>
                                 {latest.ergebniswert}
                              </div>
                              <div className="text-[0.625rem] uppercase font-bold text-slate-400">Aktueller Stand<br/>({latest.datum})</div>
                           </div>

                           {diagShowComments && latest.kommentar && (
                             <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <span className="text-[0.5625rem] font-black uppercase text-slate-400 mb-1 block">Beobachtungen &amp; Notizen:</span>
                                <div className="text-[0.75rem] leading-tight text-slate-700 italic preserve-whitespace">{latest.kommentar.replace('Lehrperson-Notiz:','')}</div>
                             </div>
                           )}
                           
                           {/* Show meta data details if available */}
                           {latest.meta?.answers && (
                             <div className="mt-3 space-y-1">
                                <p className="text-[0.5625rem] font-black uppercase text-slate-400">Detail-Auswertung:</p>
                                <div className="grid grid-cols-2 gap-1 text-[0.625rem] text-slate-600">
                                   {latest.meta.type === 'zehneruebergang' ? (
                                      Object.entries(latest.meta.answers).slice(0,4).map(([k,v]:any) => (
                                         <div key={k} className="bg-slate-50 p-1.5 rounded border border-slate-100"><span className="font-bold">{k}:</span> {v}</div>
                                      ))
                                   ) : latest.meta.type === 'sozialemotional' || latest.meta.type === 'feinmotorik' ? (
                                      Object.entries(latest.meta.answers).slice(0,4).map(([k,v]:any) => (
                                         <div key={k} className="bg-slate-50 p-1.5 rounded border border-slate-100"><span className="font-bold">{k}:</span> <span className={v==='Auffällig'?'text-rose-600':'text-emerald-600'}>{v}</span></div>
                                      ))
                                   ) : null}
                                </div>
                             </div>
                           )}
                        </div>

                        {/* Chart Area if multiple measurements and settings enabled */}
                        {diagShowCharts && testErhebungen.length > 1 && (
                           <div className="flex-1 pl-4 h-32 flex flex-col justify-end relative">
                              <span className="text-[0.5625rem] font-black uppercase text-slate-400 absolute top-0 left-4 hide-on-print">Entwicklungsverlauf</span>
                              <div className="flex items-end gap-2 h-20 w-full mt-4 border-b border-slate-200 pb-1">
                                {testErhebungen.slice().reverse().map((measurement, idx) => {
                                   const maxVal = Math.max(...testErhebungen.map((m:any) => m.ergebniswert)) || 100;
                                   const heightPct = Math.min(100, Math.max(5, (measurement.ergebniswert / maxVal) * 100));
                                   return (
                                     <div key={idx} className="flex flex-col items-center flex-1 justify-end h-full relative group">
                                        <div className={`w-full rounded-t-sm transition-all ${isDiagnosticAlert(measurement) ? 'bg-amber-300' : 'bg-indigo-300'}`} style={{ height: `${heightPct}%` }} />
                                        <span className="text-[0.5rem] mt-1 text-slate-400 font-bold text-wrap leading-tight break-words max-w-full">{measurement.datum.substring(0,5)}</span>
                                        <span className="absolute -top-4 text-[0.5625rem] font-black text-slate-600 text-wrap leading-tight break-words max-w-full">{measurement.ergebniswert}</span>
                                     </div>
                                   )
                                })}
                              </div>
                           </div>
                        )}
                     </div>
                  </div>
                );
             })}
           </div>
        )}
      </div>
    );
  }

  function renderSingleStudentProfile(st: any) {
    // 1. Fetch Grades Summary
    const grades = getStudentGradesSummary(st.id);

    // 2. Fetch KEL & Reflexion
    const kelRow = getKelDataForStudent(st.id);
    const CRITERION_DICT: Record<string, string> = {
      'zuzuhoeren': 'Zuhören & Verstehen',
      'lesen': 'Lesefreude & Technik',
      'rechnen': 'Mathematisches Denken',
      'konzentration': 'Ausdauer & Fokus',
      'regeln': 'Regeln & Vereinbarungen',
      'de_hoeren_gespraeche': 'D-Hören/Sprechen: Unterrichtsbeiträge',
      'de_hoeren_standardsprache': 'D-Hören/Sprechen: Aussprache/Vortrag',
      'de_hoeren_zuhoeren': 'D-Hören/Sprechen: Zuhör-Kompetenz',
      'de_lesen_fliessend': 'D-Lesen: Flüssig lesen',
      'de_lesen_verstaendnis': 'D-Lesen: Leseverständnis',
      'de_lesen_info_verarbeit': 'D-Lesen: Textverständnis',
      'de_rechtschreiben_richtig': 'D-Rechtschreiben: Abschreiben',
      'de_rechtschreiben_lernwoerter': 'D-Rechtschreiben: Lernwörter',
      'de_rechtschreiben_wortfamilie': 'D-Rechtschreiben: Grammatik',
      'de_verfassen_planen': 'D-Verfassen: Textentwurf',
      'ma_zahlen_zahlenraum': 'M-Arithmetik: Zahlenraum',
      'ma_zahlen_stellenwert': 'M-Arithmetik: Stellenwert',
      'ma_rechnen_addition': 'M-Rechnen: Addition',
      'ma_rechnen_subtraktion': 'M-Rechnen: Subtraktion',
      'ma_rechnen_multiplikation': 'M-Rechnen: Malreihen',
      'ma_rechnen_division': 'M-Rechnen: Division',
      'ma_rechnen_sachaufgaben': 'M-Rechnen: Sachaufgaben',
      'ma_groessen_umwandeln': 'M-Größen: Maßeinheiten',
      'ma_raum_figuren': 'M-Geometrie: Figuren',
      'su_interesse': 'Sachunterricht: Eigeninteresse',
      'su_wiedergabe': 'Sachunterricht: Erklärung',
      'al_mitarbeit': 'Verhalten: Mitarbeit',
      'al_konzentration': 'Verhalten: Fokus/Ausdauer',
      'al_ordnung': 'Verhalten: Ordnung/Heftführung',
      'al_selbststaendigkeit': 'Verhalten: Selbstständigkeit',
      'al_hausuebungen': 'Verhalten: Hausübungen'
    };

    // 3. Fetch Klassenkasse Payments
    const sammlungen = app.klassenkasse?.sammlungen || [];
    const studentPayments = sammlungen.map((s: any) => {
      const status = s.status?.[st.id] || 'offen';
      const amount = s.betraege?.[st.id] || s.betrag || 0;
      return { id: s.id, titel: s.titel, datum: s.erstelltAm, status, amount };
    }).filter((p: any) => p.amount > 0);
    const totalPaid = studentPayments.filter((p: any) => p.status === 'bezahlt').reduce((a: number, b: any) => a + b.amount, 0);
    const totalOpen = studentPayments.filter((p: any) => p.status !== 'bezahlt').reduce((a: number, b: any) => a + b.amount, 0);
    const totalAmount = totalPaid + totalOpen;
    const progressPercent = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

    // 4. MIKA-D status
    const mikaDStatus = st.foerderprofil?.mikaDStatus || 'nicht erhoben';
    const mikaDDatum = st.foerderprofil?.mikaDDatum || '';
    const MIKA_STAGES = [
      { id: '3', label: 'AO - Stufe 3', desc: 'Außerordentlich (geringe Kenntnisse)', border: 'border-rose-300', text: 'text-rose-800 bg-rose-50' },
      { id: '2', label: 'AO - Stufe 2', desc: 'Außerordentlich (mäßige Kenntnisse)', border: 'border-amber-300', text: 'text-amber-800 bg-amber-50' },
      { id: '1', label: 'AO - Stufe 1', desc: 'Außerordentlich (fortgeschritten)', border: 'border-indigo-300', text: 'text-indigo-800 bg-indigo-50' },
      { id: 'ordentlich', label: 'Ordentlich', desc: 'Ausreichende Deutschkenntnisse', border: 'border-emerald-300', text: 'text-emerald-800 bg-emerald-50' },
      { id: 'nicht erhoben', label: 'Nicht erhoben', desc: 'Derzeit keine MIKA-D Daten erfasst', border: 'border-slate-200', text: 'text-slate-500 bg-slate-50' },
    ];
    const mikaCurrent = MIKA_STAGES.find(ms => ms.id === mikaDStatus) || MIKA_STAGES[4];

    // 5. Attendance Calculation
    const attendanceData = app.anwesenheit?.[st.id] || {};
    let excusedHours = 0;
    let unexcusedHours = 0;
    Object.values(attendanceData).forEach((dayData: any) => {
      Object.values(dayData).forEach(status => {
        if (status === 'e') excusedHours++;
        else if (status === 'u' || status === 'f') unexcusedHours++;
      });
    });

    // 6. Behavior logs & Status
    const behaviorStages = app.behavior_stages || [
      { id: '1', label: 'Herausragend', icon: '🌟', color: 'text-amber-500 bg-amber-50 border-amber-200' },
      { id: '2', label: 'Sehr positiv', icon: '😊', color: 'text-emerald-500 bg-emerald-50 border-emerald-200' },
      { id: '3', label: 'Normal / Neutral', icon: '😐', color: 'text-slate-500 bg-slate-50 border-slate-200' },
      { id: '4', label: 'Ermahnung', icon: '⚠️', color: 'text-orange-500 bg-orange-50 border-orange-200' },
      { id: '5', label: 'Kritisch', icon: '❌', color: 'text-rose-500 bg-rose-50 border-rose-200' }
    ];
    const currentStatusId = app.behavior_status?.[st.id] || app.behavior_default_stage_id || '3';
    const currentStage = behaviorStages.find((bs: any) => bs.id === currentStatusId) || behaviorStages[2];

    const studentNotes = (app.notizen || [])
      .filter((n: any) => n.schuelerId === st.id)
      .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));

    // 7. KI-Portfolio summary
    const cachedKiSummary = app.kiPortfolioSummaries?.[st.id] || '';

    // 8. Stars rendering helper
    const renderStars = (val?: number) => {
      if (val === undefined || val === null) return '—';
      const filled = '★'.repeat(Math.min(4, Math.max(0, val)));
      const empty = '☆'.repeat(Math.max(0, 4 - val));
      return `${filled}${empty}`;
    };

    return (
      <div className="text-left space-y-12 leading-relaxed text-black print:text-black">
        
        {/* ==================== PAGE 1: DECKBLATT, STAMMDATEN & FINANZEN ==================== */}
        <div className="page-break space-y-8 pb-8 bg-white">
          {/* Header */}
          <div className="border-b-[2.5pt] border-slate-900 pb-3.5 flex justify-between items-end avoid-break">
            <div>
              <span className="text-[0.625rem] bg-slate-900 text-white font-black tracking-widest px-2.5 py-0.5 rounded uppercase">SCHÜLERDOSSIER - LEHRERMAPPE</span>
              <h2 className="text-[1.625rem] leading-normal font-extrabold text-slate-900 mt-1 tracking-tight">
                Dossier: {st.nachname} {st.vorname}
              </h2>
            </div>
            <div className="text-right text-[0.6875rem] font-bold text-slate-500 leading-tight">
              <span>Stufe: {app?.stufe || st.besuchsjahr || '—'} • SJ {app?.schuljahr?.trim() || 'nicht angegeben'}</span>
              <span className="block mt-1 font-semibold text-slate-450">Erstellt: {new Date().toLocaleDateString('de-AT')}</span>
            </div>
          </div>

          {/* General Stammdaten */}
          {profShowStammdaten && (
            <div className="border border-slate-300 p-5 rounded-[1.5rem] bg-white space-y-4 avoid-break shadow-3xs">
              <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <User size={12} className="text-indigo-600" />
                I. Allgemeine Stammdaten &amp; Schülerdetails
              </span>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3.5 gap-x-6 text-[0.75rem] leading-tight text-slate-700 leading-normal font-semibold">
                <div><strong>Vorname:</strong> {st.vorname}</div>
                <div><strong>Nachname:</strong> {st.nachname}</div>
                <div><strong>Geburtstag:</strong> {st.geburtstag ? new Date(st.geburtstag).toLocaleDateString('de-AT') : '—'}</div>
                <div><strong>Religion / Bekenntnis:</strong> {st.religion || '—'}</div>
                <div><strong>Staatsbürgerschaft:</strong> {st.staatsbuergerschaft || '—'}</div>
                <div><strong>Besuchsjahr:</strong> {st.besuchsjahr ? `${st.besuchsjahr}. Schuljahr` : '—'}</div>
                <div><strong>Schulstufe:</strong> {app?.stufe || st.besuchsjahr}. Schulstufe</div>
                <div><strong>Klassencode:</strong> {app?.klassenbezeichnung || '—'}</div>
                <div><strong>DaZ (Deutsch als Zweitsprache):</strong> {st.daz ? 'Ja' : 'Nein'}</div>
                <div><strong>Sonderpäd. Förderbedarf (SPF):</strong> {st.spf ? 'Ja' : 'Nein'}</div>
                <div><strong>Leistungsniveau:</strong> {st.niveau || '—'}</div>
              </div>

              {profShowContacts && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block flex items-center gap-1.5">
                  <MapPin size={12} className="text-indigo-600" />
                  Wohnanschrift &amp; Kontakte der Erziehungsberechtigten
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[0.75rem] leading-tight text-slate-700 font-semibold">
                  <div className="space-y-1">
                    <div><strong>Anschrift:</strong> {st.anschrift || '—'}</div>
                    <div><strong>PLZ / Ort:</strong> {st.plz ? `${st.plz} ${st.ort || ''}` : '—'}</div>
                  </div>
                  <div className="space-y-1">
                    <div><strong>Telefon Mutter:</strong> {st.telefon_mutter || '—'}</div>
                    <div><strong>Telefon Vater:</strong> {st.telefon_vater || '—'}</div>
                    <div><strong>E-Mail Eltern:</strong> {st.email_eltern || '—'}</div>
                  </div>
                </div>
              </div>
              )}
            </div>
          )}

          {/* Klassenkasse & Finanzen */}
          {profShowFinanzen && (
            <div className="border border-slate-300 p-5 rounded-[1.5rem] bg-white space-y-4 avoid-break shadow-3xs">
              <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <Banknote size={12} className="text-cyan-600" />
                II. Klassenkasse &amp; Geldsammlungs-Beiträge
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                  <span className="text-[0.5625rem] font-bold uppercase text-slate-400">Kontostand (Gesamt)</span>
                  <span className="text-[1.125rem] leading-normal font-black text-slate-800">{totalAmount.toFixed(2)} €</span>
                </div>
                <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl flex flex-col justify-between">
                  <span className="text-[0.5625rem] font-bold uppercase text-emerald-600">Bezahlt</span>
                  <span className="text-[1.125rem] leading-normal font-black text-emerald-800">{totalPaid.toFixed(2)} €</span>
                </div>
                <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-xl flex flex-col justify-between">
                  <span className="text-[0.5625rem] font-bold uppercase text-rose-600">Offen / Ausstehend</span>
                  <span className="text-[1.125rem] leading-normal font-black text-rose-800">{totalOpen.toFixed(2)} €</span>
                </div>
              </div>

              {studentPayments.length > 0 ? (
                <div className="pt-2">
                  <table className="w-full border-collapse text-[0.75rem] leading-tight text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-[0.5625rem] text-slate-400 uppercase tracking-wider font-black">
                        <th className="py-2">Titel der Sammlung</th>
                        <th className="py-2 text-right">Soll-Betrag</th>
                        <th className="py-2 text-right">Erhalten am</th>
                        <th className="py-2 text-right">Zahlungsstatus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentPayments.map((p, idx) => (
                        <tr key={idx} className="border-b border-slate-100 last:border-b-0 font-semibold text-slate-700">
                          <td className="py-2 font-bold text-slate-800">{p.titel}</td>
                          <td className="py-2 text-right tabular-nums">{p.amount.toFixed(2)} €</td>
                          <td className="py-2 text-right text-slate-400">{p.datum || '—'}</td>
                          <td className={`py-2 text-right font-black uppercase text-[0.59375rem] ${p.status === 'bezahlt' ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {p.status === 'bezahlt' ? '● BEZAHLT' : '○ OFFEN'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-slate-400 text-[0.75rem] leading-tight italic">Keine eingetragenen Finanzforderungen oder Geldsammlungen vorhanden.</p>
              )}
            </div>
          )}
        </div>


        {/* ==================== PAGE 2: NOTENVERLAUF & MIKA-D ==================== */}
        {(profShowLeistungen || profShowMikaD) && (
          <div className="page-break space-y-8 pb-8 bg-white">
            {/* Header */}
            <div className="border-b-[2.5pt] border-slate-900 pb-3.5 flex justify-between items-end avoid-break">
              <div>
                <span className="text-[0.625rem] bg-slate-900 text-white font-black tracking-widest px-2.5 py-0.5 rounded uppercase">DOSSIER - BEREICH LEISTUNGEN &amp; SPRACHSTAND</span>
                <h2 className="text-[1.5rem] leading-normal font-extrabold text-slate-900 mt-1 tracking-tight">
                  Leistungsbilanz &amp; MIKA-D: {st.vorname} {st.nachname}
                </h2>
              </div>
              <div className="text-right text-[0.625rem] font-bold text-slate-400">
                <span>SJ {app?.schuljahr?.trim() || 'nicht angegeben'}</span>
              </div>
            </div>

            {/* Grades Table */}
            {profShowLeistungen && (
              <div className="border border-slate-300 p-5 rounded-[1.5rem] bg-white space-y-4 avoid-break shadow-3xs">
                <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <Award size={12} className="text-indigo-600" />
                  III. Notengitter &amp; Semester-Leistungen
                </span>

                <table className="w-full border-collapse text-[0.75rem] leading-tight text-left">
                  <thead>
                    <tr className="border-b border-slate-300 text-[0.59375rem] text-slate-500 uppercase tracking-widest font-black">
                      <th className="py-2.5">Pflichtgegenstand</th>
                      <th className="py-2.5 text-center">1. Semester</th>
                      <th className="py-2.5 text-center">2. Semester</th>
                      <th className="py-2.5 text-right">Beurteilungsart</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grades.length > 0 ? (
                      grades.map((gr, idx) => (
                        <tr key={idx} className="border-b border-slate-100 last:border-b-0 font-semibold text-slate-700">
                          <td className="py-2.5 font-bold text-slate-900">{gr.subject}</td>
                          <td className="py-2.5 text-center text-slate-600 font-semibold">{gr.semester1}</td>
                          <td className="py-2.5 text-center text-slate-600 font-semibold">{gr.semester2}</td>
                          <td className="py-2.5 text-right text-slate-500 font-black uppercase text-[0.59375rem]">
                            {gr.mode === 'grades' ? 'Noten' : gr.mode === 'percent' ? 'Prozent' : 'Punkte → Prozentstand'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 font-medium italic">
                          Keine Fachleistungen oder Noten in der Notenmappe eingetragen.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* MIKA-D Section */}
            {profShowMikaD && (
              <div className="border border-slate-300 p-5 rounded-[1.5rem] bg-white space-y-4 avoid-break shadow-3xs">
                <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <GraduationCap size={12} className="text-indigo-600" />
                  IV. MIKA-D Sprachstandserhebung (Deutsch als Zweitsprache)
                </span>

                <div className={`p-4 rounded-xl border ${mikaCurrent.border} ${mikaCurrent.text} flex items-start gap-4`}>
                  <div className="w-10 h-10 rounded-lg bg-white shadow-3xs flex items-center justify-center text-[1.25rem] shrink-0 font-bold border border-slate-100">
                    🗣️
                  </div>
                  <div className="space-y-1">
                    <p className="text-[0.5625rem] uppercase font-black tracking-widest text-slate-400">Eingestufter Statuswert</p>
                    <h4 className="text-[1.125rem] leading-normal font-black tracking-tight">{mikaCurrent.label}</h4>
                    <p className="text-[0.75rem] leading-tight font-medium opacity-90">{mikaCurrent.desc}</p>
                    {mikaDDatum && (
                      <p className="text-[0.625rem] font-semibold opacity-60 pt-1 flex items-center gap-1 uppercase tracking-wider">
                        <Calendar size={10} /> Letzte Erhebung am: {new Date(mikaDDatum).toLocaleDateString('de-DE')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}


        {/* ==================== PAGE 3: VERHALTENSBEOBACHTUNGEN, PRÄSENZ & SELBSTREFLEXION ==================== */}
        {(profShowVerhalten || profShowKELReflexion) && (
          <div className="page-break space-y-8 pb-8 bg-white">
            {/* Header */}
            <div className="border-b-[2.5pt] border-slate-900 pb-3.5 flex justify-between items-end avoid-break">
              <div>
                <span className="text-[0.625rem] bg-slate-900 text-white font-black tracking-widest px-2.5 py-0.5 rounded uppercase">DOSSIER - BEREICH VERHALTEN &amp; PRÄSENZ</span>
                <h2 className="text-[1.5rem] leading-normal font-extrabold text-slate-900 mt-1 tracking-tight">
                  Verhaltensbeobachtung &amp; Selbstreflexion: {st.vorname} {st.nachname}
                </h2>
              </div>
              <div className="text-right text-[0.625rem] font-bold text-slate-400">
                <span>Schulstufe: {app?.stufe || st.besuchsjahr}.Klasse</span>
              </div>
            </div>

            {/* Behavior & Attendance */}
            {profShowVerhalten && (
              <div className="border border-slate-300 p-5 rounded-[1.5rem] bg-white space-y-4 avoid-break shadow-3xs">
                <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <Clock size={12} className="text-indigo-600" />
                  V. Sozialverhalten &amp; Präsenzerfassung
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                    <div className="text-[1.25rem] leading-normal">🧭</div>
                    <div>
                      <p className="text-[0.5625rem] font-bold uppercase text-slate-400 leading-none mb-1">Verhaltensampel</p>
                      <p className="text-[0.875rem] leading-snug font-extrabold text-slate-800">{currentStage.icon} {currentStage.label}</p>
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-xl flex items-center gap-3">
                    <div className="text-[1.25rem] leading-normal text-emerald-500">✓</div>
                    <div>
                      <p className="text-[0.5625rem] font-bold uppercase text-emerald-600 leading-none mb-1">Fehlstunden (Entschuldigt)</p>
                      <p className="text-[0.875rem] leading-snug font-extrabold text-slate-800">{excusedHours} Stunden</p>
                    </div>
                  </div>
                  <div className="p-3 bg-rose-50/40 border border-rose-100 rounded-xl flex items-center gap-3">
                    <div className="text-[1.25rem] leading-normal text-rose-500">⚠️</div>
                    <div>
                      <p className="text-[0.5625rem] font-bold uppercase text-rose-600 leading-none mb-1">Fehlstunden (Unentschuldigt)</p>
                      <p className="text-[0.875rem] leading-snug font-extrabold text-slate-800">{unexcusedHours} Stunden</p>
                    </div>
                  </div>
                </div>

                {/* Latest 5 observation notes */}
                <div className="pt-2 space-y-2.5">
                  <span className="text-[0.59375rem] font-black uppercase text-slate-450 tracking-wider block">Jüngste Beobachtungsnotizen &amp; Logeinträge (Kompakt)</span>
                  {studentNotes.length > 0 ? (
                    <div className="space-y-2">
                      {studentNotes.slice(0, 5).map((n: any, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-start text-[0.75rem] leading-tight text-slate-700 leading-relaxed font-semibold">
                          <div className="space-y-0.5">
                            <span className="text-[0.5625rem] uppercase font-black text-slate-400 bg-white border border-slate-200 rounded px-1 py-0.5">
                              {n.kategorie || 'Beobachtung'}
                            </span>
                            <p className="text-slate-800 font-bold mt-1">{n.inhalt || n.text}</p>
                          </div>
                          <span className="text-[0.625rem] font-bold text-slate-400 whitespace-nowrap ml-4">
                            {n.timestamp ? new Date(n.timestamp).toLocaleDateString('de-DE') : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-450 text-[0.75rem] leading-tight italic">Es sind keine Verhaltens- oder Beobachtungsnotizen für dieses Semester vorhanden.</p>
                  )}
                </div>
              </div>
            )}

            {/* KEL Selbstreflexion Grid */}
            {profShowKELReflexion && kelRow && (
              <div className="border border-slate-300 p-5 rounded-[1.5rem] bg-white space-y-4 avoid-break shadow-3xs">
                <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <Heart size={12} className="text-rose-600" />
                  VI. KEL-Selbstreflexionskatalog (Direkter Vergleich)
                </span>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-[0.75rem] leading-tight text-slate-700 font-semibold leading-relaxed">
                    <strong>Vereinbarungen aus dem KEL-Gespräch (vom {kelRow.datum || '—'}):</strong> <br />
                    {kelRow.vereinbarungen || 'Keine spezifischen schriftlichen Zielvereinbarungen getroffen.'}
                  </p>
                </div>

                <div className="pt-2">
                  <table className="w-full border-collapse text-[0.75rem] leading-tight text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-[0.5625rem] text-slate-500 uppercase tracking-widest font-black">
                        <th className="py-2">Pädagogische Reflexionskriterien</th>
                        <th className="py-2 text-center">Selbsteinschätzung Kind</th>
                        <th className="py-2 text-center">Einschätzung Lehrperson</th>
                        <th className="py-2 text-right">Kind-Kommentar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(CRITERION_DICT).map((key, idx) => {
                        const kidVal = kelRow.selbsteinschaetzungKind?.[key];
                        const teachVal = kelRow.einschaetzungLehrperson?.[key];
                        if (!kidVal && !teachVal) return null;

                        return (
                          <tr key={idx} className="border-b border-slate-100 last:border-b-0 font-semibold text-slate-700">
                            <td className="py-2 font-bold text-slate-900">{CRITERION_DICT[key] || key}</td>
                            <td className="py-2 text-center text-amber-500 font-extrabold text-[0.8125rem]">
                              {renderStars(kidVal?.wert)}
                            </td>
                            <td className="py-2 text-center text-indigo-600 font-extrabold text-[0.8125rem]">
                              {renderStars(teachVal?.wert)}
                            </td>
                            <td className="py-2 text-right text-slate-500 text-[0.6875rem] italic text-wrap max-w-xs break-words">
                              {kidVal?.kommentar || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}


        {/* ==================== PAGE 4: PORTFOLIO & PÄDAGOGISCHE DIAGNOSTIK ==================== */}
        {(profShowDiagnostik || profShowFoerderprofil || profShowKIPortfolio) && (
          <div className="page-break space-y-8 pb-8 bg-white">
            {/* Header */}
            <div className="border-b-[2.5pt] border-slate-900 pb-3.5 flex justify-between items-end avoid-break">
              <div>
                <span className="text-[0.625rem] bg-slate-900 text-white font-black tracking-widest px-2.5 py-0.5 rounded uppercase">DOSSIER - DIAGNOSTIK &amp; FÖRDERUNGSBILANZ</span>
                <h2 className="text-[1.5rem] leading-normal font-extrabold text-slate-900 mt-1 tracking-tight">
                  Pädagogische Diagnostik &amp; Förderplan: {st.vorname} {st.nachname}
                </h2>
              </div>
              <div className="text-right text-[0.625rem] font-bold text-slate-400">
                <span>Klassencode: {app?.klassenbezeichnung || '—'}</span>
              </div>
            </div>

            {/* Diagnostik Erhebungen */}
            {profShowDiagnostik && (
              <div className="border border-slate-300 p-5 rounded-[1.5rem] bg-white space-y-4 avoid-break shadow-3xs">
                <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <Scale size={12} className="text-indigo-600" />
                  VII. Standardisierte Erhebungen &amp; 1:1 Live-Protokolle
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[0.75rem] leading-tight font-semibold leading-normal">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[0.5625rem] uppercase font-black text-slate-400 mb-1">Zusätzliche strukturierte Profildaten:</p>
                    <p className="text-slate-800 font-extrabold text-[0.875rem] leading-snug">
                      {Object.values(app.oberauData?.[st.id]?.evaluationData || {}).filter((value) => value !== null && value !== undefined).length} dokumentierte Werte
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[0.5625rem] uppercase font-black text-slate-400 mb-1">Pädagogische Zusatzbemerkung:</p>
                    <p className="text-slate-600 text-[0.6875rem] italic leading-tight">
                      {st.foerderprofil?.zusatzinfo || app.oberauData?.[st.id]?.remarks || 'Keine zusätzliche Bemerkung hinterlegt.'}
                    </p>
                  </div>
                </div>

                {/* Diagnostics table */}
                <div className="pt-2">
                  <table className="w-full border-collapse text-[0.75rem] leading-tight text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-[0.5625rem] text-slate-500 uppercase tracking-widest font-black">
                        <th className="py-2">Testverfahren</th>
                        <th className="py-2 text-center">Ergebnis / Werte</th>
                        <th className="py-2 text-right">Datum</th>
                        <th className="py-2 text-right">Durchgeführt von</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(app.diagnostikErhebungen || []).filter((e: any) => e.schuelerId === st.id).length > 0 ? (
                        (app.diagnostikErhebungen || [])
                          .filter((e: any) => e.schuelerId === st.id)
                          .map((e: any, idx) => {
                            const test = (app.diagnostikTests || []).find((t: any) => t.id === e.testId);
                            const testName = test ? test.name : (e.testId || 'Unbekannter Test');
                            return (
                              <tr key={idx} className="border-b border-slate-100 last:border-b-0 font-semibold text-slate-700">
                                <td className="py-2">
                                  <span className="font-bold text-slate-900">{testName}</span>
                                  {isDiagnosticAlert(e) && (
                                    <span className="ml-2 text-[0.5625rem] bg-rose-100 text-rose-800 px-1 rounded font-black uppercase">
                                      ⚠️ Bedarf erkannt
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 text-center font-mono text-slate-800">
                                  Wert: {e.ergebniswert} {e.rohwert ? `(Rohwert: ${e.rohwert})` : ''}
                                </td>
                                <td className="py-2 text-right text-slate-400">{e.datum || '—'}</td>
                                <td className="py-2 text-right text-slate-500 text-[0.6875rem]">{e.durchgefuehrtVon || 'Lehrkraft'}</td>
                              </tr>
                            );
                          })
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400 italic">
                            Keine spezifischen standardisierten Testergebnisse oder 1:1 Protokolle hinterlegt.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Förderprofil & Förderziele */}
            {profShowFoerderprofil && (
              <div className="border border-slate-300 p-5 rounded-[1.5rem] bg-white space-y-4 avoid-break shadow-3xs">
                <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-emerald-600" />
                  VIII. Pädagogisches Förderprofil &amp; Zielvereinbarungen
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[0.75rem] leading-tight font-semibold">
                  <div className="space-y-1 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <strong className="text-emerald-700 block uppercase text-[0.5625rem] mb-1">Individuelle Stärken:</strong>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                      {(st.foerderprofil?.staerken || []).length > 0 ? (
                        (st.foerderprofil.staerken || []).map((stg: string, idx: number) => <li key={idx}>{stg}</li>)
                      ) : (
                        <li className="italic text-slate-400">Keine Stärken explizit erfasst.</li>
                      )}
                    </ul>
                  </div>
                  <div className="space-y-1 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <strong className="text-rose-700 block uppercase text-[0.5625rem] mb-1">Erhöhter Förderbedarf:</strong>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                      {(st.foerderprofil?.foerderbedarfBereiche || []).length > 0 ? (
                        (st.foerderprofil.foerderbedarfBereiche || []).map((fb: string, idx: number) => <li key={idx}>{fb}</li>)
                      ) : (
                        <li className="italic text-slate-400">Kein spezifischer Förderbedarf erfasst.</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Förderziele */}
                {st.foerderprofil?.foerderziele && st.foerderprofil.foerderziele.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[0.59375rem] font-black uppercase text-slate-450 tracking-wider block mb-2">Festgelegte Förderplan-Ziele &amp; Fortschritt</span>
                    <table className="w-full border-collapse text-[0.725rem] leading-tight text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-[0.5625rem] text-slate-500 uppercase tracking-widest font-black">
                          <th className="py-2">Bereich / Fach</th>
                          <th className="py-2">Konkretes Förderziel</th>
                          <th className="py-2 text-center">Zieltermin</th>
                          <th className="py-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {st.foerderprofil.foerderziele.map((fz: any, idx: number) => (
                          <tr key={idx} className="border-b border-slate-100 last:border-b-0 text-slate-700 font-semibold">
                            <td className="py-2 font-bold text-slate-900">{fz.bereich}</td>
                            <td className="py-2">{fz.ziel} {fz.notiz ? `(${fz.notiz})` : ''}</td>
                            <td className="py-2 text-center text-slate-400 font-mono">
                              {fz.zielDatum ? new Date(fz.zielDatum).toLocaleDateString('de-DE') : '—'}
                            </td>
                            <td className="py-2 text-right font-black uppercase text-[0.59375rem] text-indigo-600">
                              {fz.status || 'In Arbeit'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}


        {/* ==================== PAGE 5: KI-PORTFOLIO ENTWICKLUNGSBERICHT ==================== */}
        {profShowKIPortfolio && (
          <div className="page-break space-y-8 pb-8 bg-white">
            {/* Header */}
            <div className="border-b-[2.5pt] border-slate-900 pb-3.5 flex justify-between items-end avoid-break">
              <div>
                <span className="text-[0.625rem] bg-slate-900 text-white font-black tracking-widest px-2.5 py-0.5 rounded uppercase">DOSSIER - KI-ENTWICKLUNGSBERICHT</span>
                <h2 className="text-[1.5rem] leading-normal font-extrabold text-slate-900 mt-1 tracking-tight">
                  Entwicklungs-Zusammenfassung: {st.vorname} {st.nachname}
                </h2>
              </div>
              <div className="text-right text-[0.625rem] font-bold text-slate-400">
                <span>Gespeicherter KI-Entwurf · fachlich prüfen</span>
              </div>
            </div>

            {/* KI Content */}
            <div className="border border-slate-300 p-6 md:p-8 rounded-[1.5rem] bg-slate-50 shadow-inner">
              {cachedKiSummary ? (
                <div className="markdown-body text-[0.78125rem] text-slate-800 font-semibold space-y-4">
                  <Markdown>{cachedKiSummary}</Markdown>
                </div>
              ) : (
                <div className="space-y-3 text-center py-6 text-slate-400">
                  <div className="text-[1.5rem] leading-normal">🤖</div>
                  <h4 className="text-[0.75rem] leading-tight font-black uppercase tracking-wider text-slate-500">
                    Bericht wurde noch nicht generiert
                  </h4>
                  <p className="text-[0.6875rem] font-medium max-w-md mx-auto leading-relaxed">
                    Hinweis: Der ganzheitliche KI-Entwicklungsbericht wurde für {st.vorname} noch nicht erstellt. 
                    Wechseln Sie im Cockpit direkt in das <strong>Schülerdossier &gt; Portfolio-Einträge</strong>, 
                    wählen Sie den Tab <strong>KI-Portfolio</strong> und klicken Sie auf <strong>"Generieren"</strong>. 
                    Sobald das Modell die Schülerdaten bündelt, wird der fertige Bericht automatisch hier vollwertig ausgegeben.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}


        {/* ==================== OFFICIAL DOSSIER SIGNATURE FOOTER ==================== */}
        <div className="avoid-break bg-white pt-8 mt-4 border-t border-slate-300">
          <div className="grid grid-cols-2 gap-12 text-center">
            <div className="space-y-12">
              <div className="h-10 border-b border-dashed border-slate-300" />
              <p className="text-[0.5625rem] text-slate-450 font-black uppercase tracking-widest leading-none">
                Unterschrift der Erziehungsberechtigten
              </p>
            </div>
            <div className="space-y-12">
              <div className="h-10 border-b border-dashed border-slate-300" />
              <p className="text-[0.5625rem] text-slate-450 font-black uppercase tracking-widest leading-none">
                Handzeichen der Klassenlehrkraft
              </p>
            </div>
          </div>
          <div className="pt-8 text-center text-[0.5rem] text-slate-300 font-bold uppercase tracking-widest">
            Vertraulich behandeln • Empfängerkreis und Inhalt vor Weitergabe prüfen
          </div>
        </div>

      </div>
    );
  }

  function renderSingleKelPresentation(st: any) {
    const kelRow = getKelDataForStudent(st.id);
    const grades = getStudentGradesSummary(st.id);
    const selfEval = kelRow?.selbsteinschaetzungKind || {};
    const teacherEval = kelRow?.einschaetzungLehrperson || {};

    const dimensions = [
      { key: 'zuhoeren', label: 'Zuhören & Verstehen' },
      { key: 'lesen', label: 'Lesefreude' },
      { key: 'rechnen', label: 'Sicheres Rechnen' },
      { key: 'ausdauer', label: 'Ausdauer & Fokus' },
      { key: 'regeln', label: 'Regeln einhalten' },
    ];

    return (
      <div className="space-y-6 text-left page-break">
        {/* Banner */}
        <div className="border-b-[2pt] border-slate-900 pb-2 flex justify-between items-end avoid-break">
          <div>
            <span className="text-[0.5625rem] bg-slate-900 text-white font-black tracking-widest px-2 py-0.5 rounded uppercase">KEL-PRÄSENTATION</span>
            <h2 className="text-[1.5rem] leading-normal font-black text-slate-900 tracking-tight mt-1">
              Kinder-Eltern-Lehrpersonen Gespräch: {st.vorname} {st.nachname}
            </h2>
          </div>
          <div className="text-right text-[0.625rem] font-bold text-slate-500 leading-tight">
            <span>Stufe: {app?.stufe || st.besuchsjahr}.Klasse • SJ {app?.schuljahr}</span>
            <span className="block mt-0.5">Mappe erstellt am: {new Date().toLocaleDateString('de-AT')}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 leading-normal">
          {/* Bento Col 1: Performance */}
          <div className="border border-slate-300 p-5 rounded-2xl bg-slate-50/20 space-y-4 font-bold">
            <h4 className="text-[0.625rem] font-black uppercase text-indigo-700 tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1 leading-none select-none">
              📊 Leistungs-Übersicht &amp; Klassenstand
            </h4>
            
            <table className="w-full border-collapse text-[0.75rem] leading-tight text-left leading-normal font-bold">
              <thead>
                <tr className="border-b border-slate-300 text-[0.625rem] text-slate-500 uppercase tracking-widest leading-none">
                  <th className="py-2.5">Fachgebiet</th>
                  <th className="py-2.5 text-center">Aktueller dokumentierter Stand</th>
                  <th className="py-2.5 text-right font-medium">Beurteilungsart</th>
                </tr>
              </thead>
              <tbody>
                {grades.length > 0 ? (
                  grades.map((gr, idx) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-b-0">
                      <td className="py-2.5 text-slate-800 font-extrabold">{gr.subject}</td>
                      <td className="py-2.5 text-center">
                        <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 font-black px-2.5 py-0.5 rounded text-[0.6875rem]">
                          {gr.currentDisplay}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-slate-400 text-[0.625rem] uppercase font-bold">
                        {gr.mode === 'grades' ? 'Noten' : gr.mode === 'percent' ? 'Prozent' : 'Punkte'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-400 font-bold italic">Keine Leistungsdaten vorhanden.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bento Col 2: Stärken und Auszeichnungen */}
          <div className="border border-slate-300 p-5 rounded-2xl bg-slate-50/20 space-y-4 font-bold">
            <h4 className="text-[0.625rem] font-black uppercase text-amber-600 tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1 leading-none select-none">
              ⭐ Stärkenprofil &amp; Leitstern
            </h4>
            <div className="bg-white p-4 rounded-xl border border-slate-205 text-[0.75rem] leading-tight italic font-semibold text-slate-600 leading-relaxed relative">
              <span className="text-[1.875rem] leading-tight text-indigo-200 absolute right-3 bottom-0 leading-none select-none">“</span>
              <p className="z-10 relative">
                {kelRow?.notiz || st.notiz || 'Keine pädagogische Stärkennotiz hinterlegt.'}
              </p>
            </div>
            
            <div className="space-y-1">
              <span className="text-[0.5625rem] uppercase font-black text-slate-400 tracking-wider">Verliehene Badges / Auszeichnungen:</span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(st.badges && st.badges.length > 0) ? (
                  st.badges.map((b: any, idx: number) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[0.625rem] font-black">
                      <span>{b.icon}</span> <span>{b.name}</span>
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full text-[0.625rem] font-bold uppercase border border-slate-200">
                     🌟 Hilfsbereiter Teamplayer
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Evaluation section compared */}
        {kpShowSelfAssessment && (
          <div className="border border-slate-300 p-5 rounded-2xl bg-slate-50/20 space-y-4 font-bold">
            <h4 className="text-[0.625rem] font-black uppercase text-slate-700 tracking-wider border-b border-slate-200 pb-1 leading-none select-none">
              🤝 Selbst- und Fremdeinschätzung im Kompetenzgitter (1 = Entwicklungspotenzial, 4 = Ausgezeichnet)
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 leading-normal">
              {dimensions.map(dim => {
                const sVal = Number(selfEval[dim.key]?.wert || 3);
                const tVal = Number(teacherEval[dim.key]?.wert || 3);

                return (
                  <div key={dim.key} className="space-y-1 text-[0.75rem] leading-tight font-bold text-slate-800 leading-none">
                    <div className="flex justify-between items-center text-[0.6875rem]">
                      <span>{dim.label}</span>
                      <div className="flex gap-2 text-[0.5625rem] font-black uppercase tracking-wide">
                        <span className="text-emerald-600">Kind: {sVal}</span>
                        <span className="text-indigo-600">Lehrer: {tVal}</span>
                      </div>
                    </div>
                    {/* Visual compare tracks */}
                    <div className="h-6 w-full bg-slate-200 rounded-lg relative ">
                      {/* Kind bar (top half) */}
                      <div className="absolute top-0 left-0 h-3 bg-emerald-500/75 rounded-t-lg transition-all" style={{ width: `${(sVal / 4) * 100}%` }}></div>
                      {/* Lehrer bar (bottom half) */}
                      <div className="absolute bottom-0 left-0 h-3 bg-indigo-600/75 rounded-b-lg transition-all" style={{ width: `${(tVal / 4) * 100}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Goals protocol placeholders */}
        <div className="border border-slate-300 p-5 rounded-2xl bg-white space-y-3 font-bold">
          <h4 className="text-[0.625rem] font-black uppercase text-slate-700 tracking-wide border-b border-slate-150 pb-1 leading-none select-none">
            🎯 Ziele &amp; Vereinbarungen des KEL-Gesprächs
          </h4>
          <div className="grid grid-cols-3 gap-6 text-[0.625rem] text-slate-400 leading-relaxed uppercase tracking-wider">
            <div className="space-y-1">
              <span>Meine persönlichen Lernziele (Kind):</span>
              <div className="h-20 border border-slate-250 rounded-xl bg-slate-50/10"></div>
            </div>
            <div className="space-y-1">
              <span>So unterstützen mich meine Eltern:</span>
              <div className="h-20 border border-slate-250 rounded-xl bg-slate-50/10"></div>
            </div>
            <div className="space-y-1">
              <span>Unterstützung durch die Schule:</span>
              <div className="h-20 border border-slate-250 rounded-xl bg-slate-50/10"></div>
            </div>
          </div>
        </div>

        {/* Signature Box */}
        <div className="grid grid-cols-3 gap-12 pt-8 text-center uppercase tracking-widest font-black text-slate-400 text-[0.5625rem] leading-none">
          <div className="border-t border-slate-400 pt-2">
            Schülerin / Schüler
          </div>
          <div className="border-t border-slate-400 pt-2">
            Erziehungsberechtigte:r
          </div>
          <div className="border-t border-slate-400 pt-2">
            Klassenlehrkraft
          </div>
        </div>
      </div>
    );
  }

  function renderSeatingPlanView() {
    const placedStudents = students.filter(s => app.sitzplan_schueler?.[s.id]);
    const seats = placedStudents.map(s => app.sitzplan_schueler[s.id]);
    const objs = app.sitzplan_objekte || [];
    
    // Scale and offsets calculation to fit in 100% width A4 page
    let scale = 0.65;
    let offsetX = 30;
    let offsetY = 35;
    
    if (seats.length > 0 || objs.length > 0) {
      const minX = Math.min(...seats.map(s => s.x), ...objs.map(o => o.x), 50);
      const maxX = Math.max(...seats.map(s => s.x + 110), ...objs.map(o => o.x + (o.w || 120)), 950);
      const minY = Math.min(...seats.map(s => s.y), ...objs.map(o => o.y), 50);
      const maxY = Math.max(...seats.map(s => s.y + 70), ...objs.map(o => o.y + (o.h || 60)), 550);
      
      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;
      
      const containerW = 920; // Expanded to fit A4 landscape print box
      const containerH = 460;
      
      const scaleX = contentWidth > 0 ? (containerW / contentWidth) : 1;
      const scaleY = contentHeight > 0 ? (containerH / contentHeight) : 1;
      scale = Math.min(scaleX, scaleY, 0.95);
      
      offsetX = (containerW - (contentWidth * scale)) / 2 - minX * scale;
      offsetY = (containerH - (contentHeight * scale)) / 2 - minY * scale;
    }

    return (
      <div className="space-y-4 text-left">
        {/* Header */}
        <div className="border-b-[2pt] border-slate-900 pb-2 text-center">
          <h3 className="text-[1.25rem] leading-normal font-black uppercase tracking-widest text-slate-900 leading-none">{customHeaderTitle || 'LEHRERCOCKPIT - Sitzplan'}</h3>
          <p className="text-[0.625rem] font-black text-slate-500 uppercase tracking-widest mt-1.5 leading-none">
            Klasse: {app?.stufe}.Klasse {app?.klassenbezeichnung || ''} • Lehrperson: {app?.anrede ? `${app.anrede} ` : ''}{app.nachname || ''} • Schuljahr: {app?.schuljahr} • Plätze: {placedStudents.length} Schüler platziert
          </p>
        </div>

        {/* Scaled plan viewport */}
        <div className="relative w-full border-[1.5pt] border-slate-300 bg-slate-50/50 rounded-2xl select-none overflow-hidden print:border-black print:bg-transparent" style={{ height: '540px' }}>
          
          {/* Board Indicators */}
          {spBoardPosition === 'top' && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-slate-200 text-slate-600 text-[0.625rem] font-black uppercase tracking-[0.2em] py-1.5 px-12 rounded-b-xl border border-t-0 border-slate-300 text-center z-10 print:border-black print:bg-white print:text-black">
              ▲ Tafel / Vorne ▲
            </div>
          )}
          {spBoardPosition === 'bottom' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-slate-200 text-slate-600 text-[0.625rem] font-black uppercase tracking-[0.2em] py-1.5 px-12 rounded-t-xl border border-b-0 border-slate-300 text-center z-10 print:border-black print:bg-white print:text-black">
              ▼ Tafel / Vorne ▼
            </div>
          )}
          {spBoardPosition === 'left' && (
            <div className="absolute top-1/2 left-0 -translate-y-1/2 bg-slate-200 text-slate-600 text-[0.625rem] font-black uppercase tracking-[0.2em] py-12 px-1.5 rounded-r-xl border border-l-0 border-slate-300 text-center z-10 print:border-black print:bg-white print:text-black flex items-center justify-center" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              ◀ Tafel / Vorne ◀
            </div>
          )}
          {spBoardPosition === 'right' && (
            <div className="absolute top-1/2 right-0 -translate-y-1/2 bg-slate-200 text-slate-600 text-[0.625rem] font-black uppercase tracking-[0.2em] py-12 px-1.5 rounded-l-xl border border-r-0 border-slate-300 text-center z-10 print:border-black print:bg-white print:text-black flex items-center justify-center" style={{ writingMode: 'vertical-rl' }}>
              ▶ Tafel / Vorne ▶
            </div>
          )}

          <div className="absolute inset-0">
            {/* ROOM OBJECTS */}
            {objs.map((o: any, idx: number) => {
              const xPos = o.x * scale + offsetX;
              const yPos = o.y * scale + offsetY;
              const wVal = (o.w || 120) * scale;
              const hVal = (o.h || 60) * scale;

              // Type translation for labeling
              let label = 'Möbel';
              let icon = '📦';
              if (o.type === 'teacher_desk') { label = 'Lehrertisch'; icon = '💼'; }
              else if (o.type === 'blackboard') { label = 'Tafel'; icon = '📋'; }
              else if (o.type === 'door') { label = 'Tür'; icon = '🚪'; }
              else if (o.type === 'window') { label = 'Fenster'; icon = '🖼️'; }

              return (
                <div 
                  key={`obj-${idx}`}
                  className="absolute bg-slate-200 text-slate-700 border-2 border-slate-300 rounded-xl flex flex-col items-center justify-center font-bold text-center text-[0.625rem] leading-tight"
                  style={{
                    left: `${xPos}px`,
                    top: `${yPos}px`,
                    width: `${wVal}px`,
                    height: `${hVal}px`,
                    backgroundColor: o.type === 'teacher_desk' ? '#f1f5f9' : undefined,
                    borderColor: o.type === 'teacher_desk' ? '#94a3b8' : undefined,
                  }}
                >
                  <span className="text-[0.875rem] leading-snug">{icon}</span>
                  <span className="uppercase text-[0.5rem] tracking-wider mt-0.5">{label}</span>
                </div>
              );
            })}

            {/* STUDENTS DESKS */}
            {placedStudents.map(s => {
              const sPos = app.sitzplan_schueler[s.id] || { x: 0, y: 0 };
              const xPos = sPos.x * scale + offsetX;
              const yPos = sPos.y * scale + offsetY;
              const wVal = 110 * scale;
              const hVal = 70 * scale;

              const grades = getStudentGradesSummary(s.id);
              let subtitle = '';
              if (spShowStudentNotes && grades.length > 0) {
                const nonNulls = grades.filter(g => g.average !== null);
                if (nonNulls.length > 0) {
                  const avg = nonNulls.reduce((acc, curr) => acc + (curr.average || 0), 0) / nonNulls.length;
                  subtitle = `Ø ${avg.toFixed(1)}`;
                }
              } else if (spShowStudentDaZ) {
                subtitle = s.zweitsprache ? 'DaZ' : '—';
              } else {
                subtitle = s.geschlecht === 'w' ? 'Mädchen' : 'Knaben';
              }

              return (
                <div 
                  key={`seat-${s.id}`}
                  className={`absolute bg-white rounded-2xl border-2 shadow-3xs flex flex-col items-center justify-center text-center p-1 ${s.geschlecht === 'w' ? 'border-rose-300 bg-rose-50/15' : 'border-sky-300 bg-sky-50/15'}`}
                  style={{
                    left: `${xPos}px`,
                    top: `${yPos}px`,
                    width: `${wVal}px`,
                    height: `${hVal}px`,
                  }}
                >
                  <div className="font-extrabold text-[#000000] text-[0.6875rem] text-wrap leading-tight break-words w-full">
                    {spShowChairsOnly ? 'Frei' : `${s.vorname} ${s.nachname[0]}.`}
                  </div>
                  {!spShowChairsOnly && subtitle && (
                    <div className="text-[0.5rem] font-black text-slate-500 uppercase tracking-wide mt-1.5 leading-none select-none">
                      {subtitle}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function renderPdfExportView() {
    const targetSt = students.find(s => s.id === pdfStudentId) || students[0];
    if (!targetSt) return null;
    
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200">
        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
          <FileText size={40} />
        </div>
        <h2 className="text-[1.25rem] leading-normal font-black text-slate-800 mb-2 mt-2">PDF erstellen und prüfen</h2>
        <p className="text-[0.875rem] leading-snug font-bold text-slate-500 mb-6 text-center max-w-sm">
          Die Datei wird lokal im Browser erzeugt. Sie ist eine pädagogische Arbeitsübersicht und kein amtliches Dokument.
        </p>
        
        <button
          onClick={async () => {
             const erhebungen = (app.diagnostikErhebungen || []).filter((e: any) => e.schuelerId === targetSt.id);
             
             // Dynamic import to split chunk
             const pdfEngine = await import('../lib/pdfEngine');
             if (pdfFormType === 'foerder_uebersicht') {
               await pdfEngine.generateFoerderUebersicht(targetSt, erhebungen);
             }
          }}
          className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all text-white px-8 py-4 rounded-2xl font-black shadow-lg"
        >
          <FileText size={20} />
          {pdfFormType === 'foerder_uebersicht' ? 'Förderübersicht als PDF' : 'PDF exportieren'}
        </button>
      </div>
    );
  }

  function renderUebergabemappeView() {
    const pages: React.ReactNode[] = [];
    const sortedStudents = [...students].sort((a, b) => a.nachname.localeCompare(b.nachname));

    const getGermanWeekday = () => {
      const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
      const currentDayName = days[new Date().getDay()];
      if (currentDayName === 'Sonntag' || currentDayName === 'Samstag') return 'Montag';
      return currentDayName;
    };
    const currentWeekday = getGermanWeekday();

    // Cover Page (Page 1)
    if (umShowCoverPage) {
      pages.push(
        <div key="um-cover" className="space-y-8 flex flex-col justify-between p-10 bg-white border border-slate-200 rounded-3xl text-left page-break" style={{ minHeight: '270mm' }}>
          <div className="space-y-6">
            <div className="flex justify-between items-start border-b-[2pt] border-slate-900 pb-4">
              <div>
                <span className="text-[0.59375rem] bg-slate-900 text-white font-black tracking-widest px-2.5 py-1 rounded">UEBERGABEMAPPE</span>
                <h1 className="text-[1.875rem] leading-tight font-black text-slate-900 mt-2">Klassen-Übergabemappe</h1>
                <p className="text-[0.75rem] leading-tight text-slate-500 font-bold uppercase tracking-widest mt-0.5">Dokumentation für Vertretungskräfte &amp; Supplierungen</p>
              </div>
              <div className="text-right text-[0.75rem] leading-tight font-bold leading-tight">
                <p className="text-indigo-600 font-black tracking-widest">STUFE: {app?.stufe}.KLASSE</p>
                <p className="text-slate-500">SCHULJAHR: {app?.schuljahr}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <div>
                <p className="text-[0.53125rem] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Schulklasse / Raum</p>
                <p className="font-extrabold text-slate-800 text-[0.875rem] leading-snug leading-none">{app.klassenbezeichnung || '—'} / {app.selectedRoom || 'Klassenraum'}</p>
              </div>
              <div>
                <p className="text-[0.53125rem] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Erstellt von Lehrkraft</p>
                <p className="font-extrabold text-slate-800 text-[0.875rem] leading-snug leading-none">{app.lehrerName || app.lehrerProfil?.name || 'Inhaber:in'}</p>
              </div>
              <div>
                <p className="text-[0.53125rem] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Datum der Ausfertigung</p>
                <p className="font-extrabold text-slate-800 text-[0.875rem] leading-snug leading-none">{new Date().toLocaleDateString('de-AT')}</p>
              </div>
              <div>
                <p className="text-[0.53125rem] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Anzahl Schüler</p>
                <p className="font-extrabold text-slate-800 text-[0.875rem] leading-snug leading-none">{students.length} Kinder ({students.filter(s => s.geschlecht === 'm').length} K, {students.filter(s => s.geschlecht === 'w').length} M)</p>
              </div>
              {umVertretungsZeitraum && (
                <div className="col-span-2 border-t border-slate-200/60 pt-3">
                  <p className="text-[0.53125rem] font-black uppercase tracking-widest text-rose-500 leading-none mb-1">🤒 Geplanter Vertretungs-Zeitraum (bei Krankheit)</p>
                  <p className="font-black text-rose-700 text-[0.9375rem] leading-snug leading-none">{umVertretungsZeitraum}</p>
                </div>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">📋 Inhalt dieses Ordners:</h4>
              <div className="space-y-1.5 text-[0.75rem] leading-tight font-bold text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-500 font-extrabold text-[0.875rem] leading-snug">✔</span> Organisiertes Deckblatt &amp; Notfallnummern
                </div>
                {umShowTagesplaene && (
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-extrabold text-[0.875rem] leading-snug">✔</span> Aktueller Tageskatalog &amp; Ablaufbeschreibungen
                  </div>
                )}
                {umShowKlassenliste && (
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-extrabold text-[0.875rem] leading-snug">✔</span> Komplette Schüler-Besonderheitsliste (Gesundheit, DaZ, SPF)
                  </div>
                )}
                {umShowSitzplan && (
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-extrabold text-[0.875rem] leading-snug">✔</span> LEHRERCOCKPIT-Sitzplan &  Layout
                  </div>
                )}
                {umShowFeedback && (
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-extrabold text-[0.875rem] leading-snug">✔</span> Feedback-Bogen für Supplierstunden
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-rose-200 bg-rose-50/10 p-5 rounded-2xl space-y-3 mt-6">
              <h4 className="text-[0.625rem] font-black uppercase tracking-widest text-rose-600 flex items-center gap-2 select-none">
                🚨 DRINGLICHE NOTFALL-NUMMERN &amp; ABSPRACHEN
              </h4>
              <div className="grid grid-cols-2 gap-4 text-[0.75rem] leading-tight font-bold leading-normal">
                <div>
                  <label className="text-[0.53125rem] font-black uppercase text-rose-500 tracking-wider block mb-0.5">Schulleitung / Direktion</label>
                  <p className="text-slate-850 text-[0.6875rem] text-wrap leading-tight break-words">{umSchulleitung}</p>
                </div>
                <div>
                  <label className="text-[0.53125rem] font-black uppercase text-slate-400 tracking-wider block mb-0.5">Kanzlei / Sekretariat</label>
                  <p className="text-slate-850 text-[0.6875rem] text-wrap leading-tight break-words">{umSekretariat}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-[0.53125rem] font-black uppercase text-slate-400 tracking-wider block mb-0.5">Ansprechperson Nachbarklasse</label>
                  <p className="text-slate-850 text-[0.6875rem] text-wrap leading-tight break-words">{umNachbarKlasse}</p>
                </div>
                {umKrankheitNotes && (
                  <div className="col-span-2 border-t border-rose-250 pt-3">
                    <label className="text-[0.53125rem] font-black uppercase text-rose-600 tracking-wider block mb-1">🤒 Spezielle Anweisungen für die Krankheitsvertretung:</label>
                    <p className="text-rose-950 text-[0.75rem] font-semibold whitespace-pre-wrap leading-relaxed bg-rose-50/50 p-2.5 rounded-xl border border-rose-100/50">{umKrankheitNotes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 text-center text-[0.5625rem] text-slate-400 font-bold select-none uppercase tracking-widest leading-relaxed">
            Vertraulich behandeln • Nur an berechtigte Empfänger:innen weitergeben
          </div>
        </div>
      );
    }

    // Tagespläne (Page 2)
    if (umShowTagesplaene) {
      pages.push(
        <div key="um-schedule" className="space-y-6 text-left p-10 bg-white border border-slate-200 rounded-3xl page-break">
          <div className="border-b-[2pt] border-slate-900 pb-2 flex justify-between items-end">
            <div>
              <span className="text-[0.5625rem] font-black tracking-widest bg-slate-900 text-white px-2 py-0.5 rounded uppercase">Tagesvertretung</span>
              <h1 className="text-[1.5rem] leading-normal font-black text-slate-900 mt-1">Stundeneinteilung &amp; Lehrstoffe</h1>
            </div>
            <div className="text-right text-[0.75rem] leading-tight font-black">
              Klasse {app.klassenbezeichnung || '—'}
            </div>
          </div>

          <table className="w-full border-collapse border border-slate-300 text-[0.75rem] leading-tight text-left leading-normal">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-indigo-200 select-none">
                <th className="border border-slate-300 p-2.5 text-center w-12">Std</th>
                <th className="border border-slate-300 p-2.5 text-center w-24">Uhrzeit</th>
                <th className="border border-slate-300 p-2.5 w-32">Unterrichtsfach</th>
                <th className="border border-slate-300 p-2.5">Lehr- &amp; Übungsstoffe / Übungsanleitung</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6].map(h => {
                const hourTimes = app?.stundenZeiten?.[h] || '--:--';
                return (
                  <tr key={h} className="border-b border-slate-200">
                    <td className="border border-slate-300 p-2.5 text-center font-black">{h}</td>
                    <td className="border border-slate-200 p-2.5 text-center text-[0.6875rem] font-semibold text-slate-500">{hourTimes}</td>
                    <td className="border border-slate-200 p-2.5 font-bold uppercase text-indigo-700 tracking-wider">
                      {app?.stammplan?.[currentWeekday]?.[h] || 'Klassenstunde'}
                    </td>
                    <td className="border border-slate-200 p-2.5 text-slate-600 font-semibold whitespace-pre-wrap leading-relaxed">
                      {app.vertretungHinweise || 'Individuelles Lernen, Bucharbeit oder Übungszettel laut Wochenplanung durchführen.'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    // Klassenliste mit Besonderheiten (Page 3)
    if (umShowKlassenliste) {
      pages.push(
        <div key="um-students" className="space-y-6 text-left p-10 bg-white border border-slate-200 rounded-3xl page-break">
          <div className="border-b-[2pt] border-slate-900 pb-2">
            <span className="text-[0.5625rem] font-black tracking-widest bg-slate-900 text-white px-2 py-0.5 rounded uppercase font-sans">Klassenliste</span>
            <h1 className="text-[1.5rem] leading-normal font-black text-slate-900 mt-1">Kinderverzeichnis &amp; Päd. Orientierungshilfe</h1>
          </div>

          <table className="w-full border-collapse border border-slate-300 text-[0.75rem] leading-tight text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-300 select-none">
                <th className="border border-slate-300 p-2.5 text-center w-10">#</th>
                <th className="border border-slate-300 p-2.5 w-44">Name des Kindes</th>
                <th className="border border-slate-300 p-2.5 w-16 text-center">Geschl.</th>
                <th className="border border-slate-300 p-2.5">Besonderheiten / Päd. Hinweise / DaZ-Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((st, i) => (
                <tr key={st.id} className="border-b border-slate-200 even:bg-slate-50/40">
                  <td className="border border-slate-200 p-2 text-center font-bold text-slate-400">{i + 1}</td>
                  <td className="border border-slate-200 p-2 font-black text-slate-800">{st.nachname} {st.vorname}</td>
                  <td className="border border-slate-200 p-2 text-center font-semibold text-slate-500 uppercase">{st.geschlecht}</td>
                  <td className="border border-slate-200 p-2 text-[0.6875rem] font-semibold text-slate-600 leading-normal">
                    {st.notiz || (st.zweitsprache ? `Fremdsprache: ${st.zweitsprache}` : 'Keine gesundheitlichen oder päd. Einschränkungen gemeldet.')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Seating Plan page (Page 4)
    if (umShowSitzplan) {
      pages.push(
        <div key="um-seating" className="space-y-6 text-left p-10 bg-white border border-slate-200 rounded-3xl page-break">
          {renderSeatingPlanView()}
        </div>
      );
    }

    // Feedback forms page (Page 5)
    if (umShowFeedback) {
      pages.push(
        <div key="um-feedback" className="space-y-6 text-left p-10 bg-white border border-slate-200 rounded-3xl page-break">
          <div className="border-b-[2pt] border-slate-900 pb-2">
            <span className="text-[0.5625rem] font-black tracking-widest bg-slate-900 text-white px-2 py-0.5 rounded block w-fit uppercase">QUALITÄTSSICHERUNG</span>
            <h1 className="text-[1.5rem] leading-normal font-black text-slate-900 mt-1">Supplier-Feedback &amp; Tagesbericht</h1>
            <p className="text-[0.75rem] leading-tight text-slate-500 font-bold uppercase tracking-widest mt-0.5">Bitte der Stammlehrperson ausgefüllt auf das Pult legen</p>
          </div>

          <div className="space-y-6 text-slate-700 font-semibold text-[0.75rem] leading-tight mt-4 leading-normal">
            <p className="leading-relaxed">
              Vielen Dank für Ihre Vertretung! Bitte füllen Sie diesen Bogen kurz aus, damit die Stammlehrkraft unmittelbar über die Ereignisse und den Lernfortschritt informiert ist.
            </p>

            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <span className="text-[0.625rem] uppercase font-black text-slate-400 tracking-wider">1. Lehrstoff: Was wurde heute im Detail erfolgreich erarbeitet?</span>
                <div className="h-20 w-full border border-slate-300 rounded-xl bg-slate-50/10"></div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[0.625rem] uppercase font-black text-slate-400 tracking-wider">2. Verhalten &amp; Dynamik: Wie war die Arbeitsstimmung? Gab es besondere Vorkommnisse?</span>
                <div className="h-20 w-full border border-slate-300 rounded-xl bg-slate-50/10"></div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <span className="text-[0.625rem] uppercase font-black text-slate-400 tracking-wider">3. Hausübung aufgetragen?</span>
                  <div className="flex gap-4 items-center pt-1.5">
                    <span className="inline-block w-4 h-4 border border-slate-300 rounded bg-white"></span><span>Nein</span>
                    <span className="inline-block w-4 h-4 border border-slate-300 rounded bg-white ml-4"></span><span>Ja, Seite/Übung: __________________</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[0.625rem] uppercase font-black text-slate-400 tracking-wider">4. Fehlende Kinder heute:</span>
                  <div className="h-10 w-full border border-slate-300 rounded-xl bg-slate-50/10"></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 pt-16 mt-6">
              <div className="border-t border-slate-400 text-center pt-2 text-[0.625rem] text-slate-450 uppercase tracking-widest font-black leading-none">
                Datum &amp; Schulstempel
              </div>
              <div className="border-t border-slate-400 text-center pt-2 text-[0.625rem] text-slate-450 uppercase tracking-widest font-black leading-none">
                Handzeichen der Vertretungskraft
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-10">
        {pages}
      </div>
    );
  }

  // Helper method to draw a single Student Portfolio Dossier page
  function renderSingleKelPortfolio(st: any) {
    const kelRow = getKelDataForStudent(st.id);
    const gradings = getStudentGradesSummary(st.id);

    return (
      <div key={st.id} className="space-y-6 text-left page-break">
        
        {/* Banner header of dossier child */}
        <div className="border-b-2 border-black pb-3 flex justify-between items-end avoid-break">
          <div>
            <span className="text-[0.5625rem] font-black bg-zinc-900 text-white px-2 py-0.5 rounded-[4px] uppercase tracking-wider">SCHÜLER-DOSSIER UND PORTFOLIO</span>
            <h2 className="text-[1.5rem] leading-normal font-black text-black tracking-tight mt-1">
              Dossier: {st.nachname} {st.vorname}
            </h2>
          </div>
          <div className="text-right text-[0.625rem] font-bold text-zinc-550 leading-tight">
            <span>Stufe: {app?.stufe || st.besuchsjahr}.Schulstufe • SJ {app?.schuljahr}</span>
            <span className="block mt-1 font-semibold">Geboren am: {st.geburtstag || 'k.A.'}</span>
          </div>
        </div>

        {/* Master details section info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 avoid-break">
          {/* Stammblatt */}
          <div className="border border-zinc-450 p-4 rounded-2xl bg-white space-y-2">
            <span className="text-[0.5625rem] font-black uppercase text-zinc-400 tracking-wider block border-b border-zinc-150 pb-0.5">I. Schüler-Stammdaten</span>
            <div className="grid grid-cols-2 gap-2 text-[0.71875rem] font-semibold text-zinc-700 leading-normal">
              <div><strong>Geschlecht:</strong> {st.geschlecht === 'm' ? 'Männlich' : 'Weiblich'}</div>
              <div><strong>Religion:</strong> {st.religion || 'o.B.'}</div>
              <div><strong>Staat:</strong> {st.staatsbuergerschaft || 'Österreich'}</div>
              <div><strong>Zweitsprache:</strong> {st.zweitsprache || 'keine'}</div>
              <div className="col-span-2 text-zinc-600 font-bold italic mt-2 text-[0.65625rem]">
                Gesichert im schulinternen, passwort-geschützten Datenspeicher
              </div>
            </div>
          </div>

          {/* Absences / Attendance if checked */}
          {kelShowAbsences && (
            <div className="border border-zinc-450 p-4 rounded-2xl bg-white space-y-2">
              <span className="text-[0.5625rem] font-black uppercase text-zinc-400 tracking-wider block border-b border-zinc-150 pb-0.5">II. Fehlzeiten aus Präsenzbuch</span>
              <div className="text-[0.71875rem] leading-relaxed">
                <p className="text-zinc-600 font-medium">Laufende Fehlstundenauswertung für {st.vorname}:</p>
                <div className="flex gap-6 mt-2">
                  {(() => {
                    const fs = getStudentFehlstunden(st.id);
                    const justifiedPercent = fs.total > 0 ? Math.round((fs.excused / fs.total) * 100) : 100;
                    return (
                      <>
                        <div className="text-center bg-zinc-50 p-2.5 rounded-xl border border-zinc-200/50 flex-1">
                          <span className="text-[1.25rem] leading-normal font-black text-black">
                            {fs.total}
                          </span>
                          <span className="text-[0.53125rem] font-black uppercase text-zinc-400 block mt-1">Fehlstunden ({fs.excused}e / {fs.unexcused}u)</span>
                        </div>
                        <div className="text-center bg-zinc-50 p-2.5 rounded-xl border border-zinc-200/50 flex-1">
                          <span className="text-[1.25rem] leading-normal font-black text-black">{justifiedPercent}%</span>
                          <span className="text-[0.53125rem] font-black uppercase text-zinc-400 block mt-1">Gerechtfertigt</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Grades summary matrix */}
        {kelShowGrades && gradings.length > 0 && (
          <div className="space-y-2.5 avoid-break pt-2">
            <h3 className="text-[0.75rem] leading-tight font-black uppercase tracking-wide text-zinc-500">III. Leistungsüberblick (dokumentierte Semesterstände)</h3>
            <div className="border border-zinc-450 p-4 rounded-2xl bg-white">
              <table className="w-full">
                <thead>
                  <tr className="text-left font-black text-[0.59375rem] text-zinc-400 uppercase border-b border-zinc-200 pb-1">
                    <th className="pb-1">Pflichtgegenstand / Fach</th>
                    <th className="pb-1 text-center w-56">Aktueller Stand</th>
                    <th className="pb-1 text-right w-44">Beurteilungsart</th>
                  </tr>
                </thead>
                <tbody>
                  {gradings.map((gr, gx) => (
                    <tr key={gx} className="border-b border-zinc-150 last:border-0 py-2.5">
                      <td className="py-2.5 font-black text-black">{gr.subject}</td>
                      <td className="py-2.5 text-center font-black text-zinc-800 text-[0.75rem] leading-snug">
                        {gr.currentDisplay}
                      </td>
                      <td className="py-2.5 text-right text-zinc-500 text-[0.6875rem] font-bold uppercase">
                        {gr.mode === 'grades' ? 'Noten' : gr.mode === 'percent' ? 'Prozent' : 'Punkte'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* KEL specific comparative assessments */}
        {kelShowSelfAssessment && (
          <div className="space-y-2.5 avoid-break pt-2">
            <h3 className="text-[0.75rem] leading-tight font-black uppercase tracking-wide text-zinc-500">IV. Selbst- & Fremdeinschätzungsabgleich (Aus KEL-Vorbereitung)</h3>
            <div className="border border-zinc-450 p-4 rounded-2xl bg-white space-y-3 text-[0.6875rem] font-semibold text-zinc-700 leading-relaxed">
              <div className="grid grid-cols-1 gap-3">
                {STANDARD_KEL_BEREICHE.map(field => {
                  const dbKind = kelRow?.selbsteinschaetzungKind?.[field.id];
                  const dbLehr = kelRow?.einschaetzungLehrperson?.[field.id];
                  
                  if (!dbKind?.kommentar && !dbLehr?.kommentar) return null;
                  return (
                    <div key={field.id} className="border-b border-zinc-150 last:border-0 pb-3 last:pb-0 space-y-2">
                      <span className="font-black text-black text-[0.71875rem] tracking-tight">{field.label} ({field.kategorie}):</span>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1 bg-indigo-50/40 p-2.5 rounded-xl border border-indigo-100">
                          <span className="text-[0.53125rem] font-black uppercase text-indigo-700 tracking-wider block">Kind</span>
                          <p className="italic text-zinc-650 font-bold">{dbKind?.kommentar || 'Keine Anmerkung'}</p>
                        </div>
                        <div className="space-y-1 bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100">
                          <span className="text-[0.53125rem] font-black uppercase text-emerald-700 tracking-wider block">Lehrperson</span>
                          <p className="italic text-zinc-650 font-bold">{dbLehr?.kommentar || 'Keine Anmerkung'}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(!kelRow || !STANDARD_KEL_BEREICHE.some(f => kelRow.selbsteinschaetzungKind?.[f.id]?.kommentar || kelRow.einschaetzungLehrperson?.[f.id]?.kommentar)) && (
                  <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center">
                    <span className="text-[0.625rem] font-black uppercase tracking-wider text-zinc-500">Noch keine Einschätzungen erfasst</span>
                    <p className="mt-1 text-[0.6875rem] font-medium text-zinc-500">Für dieses Kind liegen noch keine KEL-Kommentare vor.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* KEL Portfolio entries & achievements contract if checked */}
        {kelShowPortfolio && (
          <div className="space-y-2.5 avoid-break pt-2">
            <h3 className="text-[0.75rem] leading-tight font-black uppercase tracking-wide text-zinc-500">V. Erarbeitete Zielvereinbarung & Meilensteine</h3>
            <div className="border border-zinc-450 p-4 rounded-[20px] bg-zinc-50 text-[0.71875rem] space-y-3 font-semibold leading-relaxed">
              {kelRow?.vereinbarungen ? (
                <div className="whitespace-pre-wrap text-zinc-800 font-bold bg-white p-3.5 rounded-xl border border-zinc-250 leading-relaxed">
                  {kelRow.vereinbarungen}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2 items-start py-1 border-b border-zinc-200 pb-1.5">
                    <span className="w-5 h-5 bg-zinc-800 text-white rounded flex items-center justify-center font-black text-[0.5625rem] shrink-0">1</span>
                    <div>
                      <span className="font-black text-black">Kompetenzziel:</span> Einteilen von Malreihen (ZR 100) fehlerfrei anwenden.
                      <span className="text-[0.5625rem] text-zinc-400 block font-bold uppercase mt-0.5">Woran erkennbar: Wöchentliche LZK-Hefteintragung</span>
                    </div>
                  </div>
                  <div className="flex gap-2 items-start py-1 border-b border-zinc-200/60 pb-1.5 last:border-0">
                    <span className="w-5 h-5 bg-zinc-800 text-white rounded flex items-center justify-center font-black text-[0.5625rem] shrink-0">2</span>
                    <div>
                      <span className="font-black text-black">Sozialkompetenz:</span> Konstruktives Mitwirken im Morgenkreis ohne Nebengespräche.
                      <span className="text-[0.5625rem] text-zinc-400 block font-bold uppercase mt-0.5">Woran erkennbar: Selbsterhobene Emoji-Tracker-Sticker</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Signature contract area block */}
        <div className="pt-12 avoid-break font-black text-center text-zinc-500 text-[0.625rem] grid grid-cols-3 gap-4">
          {kelSignatures.map(sig => (
            <div key={sig} className="space-y-1 leading-normal">
              <div className="border-b border-black w-40 mx-auto pb-7"></div>
              <span className="uppercase tracking-widest text-zinc-400">{sig}</span>
            </div>
          ))}
        </div>

      </div>
    );
  }
}

// Compact clock icon component fallback as we import custom ones
function ClockIconFallback({ size = 16 }: { size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
