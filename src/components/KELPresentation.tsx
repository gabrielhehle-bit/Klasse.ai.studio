import React, { useEffect, useMemo, useRef, useState } from 'react';
import pptxgen from 'pptxgenjs';
import {
  X, Maximize2, Minimize2, ChevronLeft, ChevronRight, FileText, Printer,
  Heart, Star, Target, BookOpen, GraduationCap, Users, MessageSquare,
  CheckCircle2, Settings2, Eye, EyeOff, Clock, ShieldCheck, Loader2,
  Save, Award, Sparkles, CalendarDays
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { exportSchuelerPDF } from '../lib/exportService';
import { getAssessmentMode } from '../lib/GradeUtils';
import { getKelGradebookAssessments, pickKelAssessments } from '../lib/kelGradebookSelection';
import { getStudentAttendanceSummary } from '../lib/studentMetrics';

interface KELPresentationProps {
  student: any;
  app: any;
  sem: string;
  activeFaecher: string[];
  onClose: () => void;
  getAttendanceStats: (studentId: string) => any;
  berechne: (app: any, studentId: string, fach: string, sem: string) => number | null;
  STANDARD_KEL_BEREICHE: any[];
}

type SlideType =
  | 'cover'
  | 'path'
  | 'strengths'
  | 'voices'
  | 'learning'
  | 'individualGrades'
  | 'assessment'
  | 'portfolio'
  | 'attendance'
  | 'diagnostics'
  | 'goals'
  | 'closing';

type Slide = {
  id: string;
  type: SlideType;
  title: string;
  subtitle?: string;
};

type VisibleConfig = {
  strengths: boolean;
  voices: boolean;
  learning: boolean;
  individualGrades: boolean;
  assessment: boolean;
  portfolio: boolean;
  attendance: boolean;
  diagnostics: boolean;
  goals: boolean;
  closing: boolean;
};

const DEFAULT_CONFIG: VisibleConfig = {
  strengths: true,
  voices: true,
  learning: false,
  individualGrades: false,
  assessment: true,
  portfolio: true,
  attendance: false,
  diagnostics: false,
  goals: true,
  closing: true,
};

const UI: Record<string, Record<string, string>> = {
  de: {
    welcome: 'Schön, dass wir heute gemeinsam hinschauen.',
    path: 'Unser Gespräch heute',
    strengths: 'Das gelingt mir schon gut',
    voices: 'So sehen wir es',
    learning: 'Mein Lernen im Blick',
    assessment: 'Meine Sicht & die Sicht der Lehrperson',
    portfolio: 'Darauf bin ich stolz',
    attendance: 'Anwesenheit',
    diagnostics: 'Zusätzliche Lernstandsdaten',
    goals: 'Meine nächsten Schritte',
    closing: 'Das nehmen wir mit',
    child: 'Kind',
    parents: 'Eltern',
    teacher: 'Lehrperson',
  },
  en: {
    welcome: 'It is good that we are looking at learning together today.',
    path: 'Our conversation today',
    strengths: 'What I already do well',
    voices: 'How we see it',
    learning: 'My learning at a glance',
    assessment: 'My view & the teacher view',
    portfolio: 'What I am proud of',
    attendance: 'Attendance',
    diagnostics: 'Additional learning data',
    goals: 'My next steps',
    closing: 'What we take with us',
    child: 'Child',
    parents: 'Parents',
    teacher: 'Teacher',
  },
  tr: {
    welcome: 'Bugün öğrenmeye birlikte bakmamız çok güzel.',
    path: 'Bugünkü görüşmemiz',
    strengths: 'İyi yaptığım şeyler',
    voices: 'Biz nasıl görüyoruz',
    learning: 'Öğrenmem bir bakışta',
    assessment: 'Benim görüşüm ve öğretmenin görüşü',
    portfolio: 'Gurur duyduğum şeyler',
    attendance: 'Devam durumu',
    diagnostics: 'Ek öğrenme verileri',
    goals: 'Sonraki adımlarım',
    closing: 'Yanımıza aldıklarımız',
    child: 'Çocuk',
    parents: 'Ebeveynler',
    teacher: 'Öğretmen',
  },
  bks: {
    welcome: 'Drago nam je što danas zajedno gledamo na učenje.',
    path: 'Naš današnji razgovor',
    strengths: 'Šta mi već dobro ide',
    voices: 'Kako mi to vidimo',
    learning: 'Moje učenje na jednom mjestu',
    assessment: 'Moj pogled i pogled učitelja',
    portfolio: 'Na šta sam ponosan/ponosna',
    attendance: 'Prisustvo',
    diagnostics: 'Dodatni podaci o učenju',
    goals: 'Moji sljedeći koraci',
    closing: 'Šta nosimo sa sobom',
    child: 'Dijete',
    parents: 'Roditelji',
    teacher: 'Učitelj/ica',
  },
  ar: {
    welcome: 'من الجميل أن ننظر اليوم معًا إلى التعلم.',
    path: 'حديثنا اليوم',
    strengths: 'ما أجيده بالفعل',
    voices: 'كيف نرى الأمور',
    learning: 'تعلمي في لمحة',
    assessment: 'رؤيتي ورؤية المعلم',
    portfolio: 'ما أفتخر به',
    attendance: 'الحضور',
    diagnostics: 'بيانات تعلم إضافية',
    goals: 'خطواتي القادمة',
    closing: 'ما نأخذه معنا',
    child: 'الطفل',
    parents: 'الأهل',
    teacher: 'المعلم',
  },
};

const LANGUAGES = [
  { id: 'de', label: 'Deutsch', flag: '🇦🇹' },
  { id: 'en', label: 'English', flag: '🇬🇧' },
  { id: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { id: 'bks', label: 'BKS', flag: '🇧🇦' },
  { id: 'ar', label: 'العربية', flag: '🇸🇾' },
];

const RATING_LABELS: Record<number, string> = {
  5: 'sehr sicher',
  4: 'meistens sicher',
  3: 'oft gelungen',
  2: 'teilweise gelungen',
  1: 'noch am Anfang',
  0: 'noch nicht beobachtet',
};

const safeText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (!value || typeof value !== 'object') return '';
  const object = value as Record<string, unknown>;
  for (const key of ['text', 'titel', 'title', 'name', 'ziel', 'bezeichnung', 'beschreibung']) {
    const candidate = object[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return '';
};

const dateValue = (value: unknown): number => {
  const parsed = new Date(String(value || '')).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function KELPresentation({
  student,
  sem,
  activeFaecher,
  onClose,
  berechne,
  STANDARD_KEL_BEREICHE,
}: KELPresentationProps) {
  const { app, setApp } = useApp();
  const [view, setView] = useState<'slides' | 'prepare'>('prepare');
  const [slideIndex, setSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedLang, setSelectedLang] = useState('de');
  const [showConfig, setShowConfig] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(15 * 60);
  const [timerActive, setTimerActive] = useState(false);
  const [agreementDraft, setAgreementDraft] = useState('');
  const [agreementSaved, setAgreementSaved] = useState(false);
  const slideContainerRef = useRef<HTMLDivElement>(null);
  const t = UI[selectedLang] || UI.de;

  const currentClass = app.classes?.find((entry: any) => entry.id === app.activeClassId);
  const classLabel = currentClass?.name || app.klassenbezeichnung || 'Klasse';

  const latestKel = useMemo(() => {
    const matches = (app.kelGespraeche || [])
      .filter((entry: any) => entry.schuelerId === student.id)
      .filter((entry: any) => !app.schuljahr || !entry.schuljahr || entry.schuljahr === app.schuljahr)
      .sort((a: any, b: any) => dateValue(b.datum) - dateValue(a.datum));
    return matches[0] || null;
  }, [app.kelGespraeche, app.schuljahr, student.id]);

  // The presentation plan is per child + meeting + class + semester. Never reuse
  // a global localStorage switch from another child or an earlier meeting.
  const planKey = JSON.stringify([app.schuljahr || '', sem, latestKel?.id || 'vorbereitung']);
  const savedPlan = student.kelPraesentationAuswahl?.[planKey];
  const matchingSavedPlan = savedPlan?.classId === app.activeClassId &&
    savedPlan?.studentId === student.id && savedPlan?.semester === sem ? savedPlan : null;
  const [visible, setVisible] = useState<VisibleConfig>(() => ({
    ...DEFAULT_CONFIG, ...(matchingSavedPlan?.visible || {}),
  }));
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(() =>
    Array.isArray(matchingSavedPlan?.selectedSubjects) ? matchingSavedPlan.selectedSubjects : []);
  const [selectedAssessmentIds, setSelectedAssessmentIds] = useState<string[]>(() =>
    Array.isArray(matchingSavedPlan?.selectedAssessmentIds) ? matchingSavedPlan.selectedAssessmentIds : []);
  const [selectionSaved, setSelectionSaved] = useState(Boolean(matchingSavedPlan));
  const selectionScope = JSON.stringify([app.activeClassId, student.id, app.schuljahr, sem]);
  const scopeRef = useRef(selectionScope);
  const scopeMatches = scopeRef.current === selectionScope;

  useEffect(() => {
    scopeRef.current = selectionScope;
    setVisible({ ...DEFAULT_CONFIG, ...(matchingSavedPlan?.visible || {}) });
    setSelectedSubjects(Array.isArray(matchingSavedPlan?.selectedSubjects) ? matchingSavedPlan.selectedSubjects : []);
    setSelectedAssessmentIds(Array.isArray(matchingSavedPlan?.selectedAssessmentIds) ? matchingSavedPlan.selectedAssessmentIds : []);
    setSelectionSaved(Boolean(matchingSavedPlan));
    setView('prepare');
    setSlideIndex(0);
  // A fresh meeting/selection created by pressing Save must NOT reset the edited
  // form. Only changing the child, class or semester resets the disclosure scope.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionScope]);

  useEffect(() => {
    setAgreementDraft(latestKel?.vereinbarungen || '');
    setAgreementSaved(false);
  }, [latestKel?.id, latestKel?.vereinbarungen]);

  useEffect(() => {
    if (!timerActive) return;
    const id = window.setInterval(() => {
      setTimerSeconds(previous => {
        if (previous <= 1) {
          setTimerActive(false);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerActive]);

  useEffect(() => {
    if (view === 'slides') slideContainerRef.current?.focus();
  }, [view, slideIndex, isFullscreen]);

  const attendance = useMemo(
    () => getStudentAttendanceSummary(app, student.id),
    [app.anwesenheit, student.id]
  );

  const strengths = useMemo(() => {
    const values: string[] = [];
    for (const item of student.foerderprofil?.staerken || []) {
      const text = safeText(item);
      if (text) values.push(text);
    }
    for (const badge of student.badges || []) {
      const text = safeText(badge);
      if (text) values.push(text);
    }
    return [...new Set(values)].slice(0, 6);
  }, [student.badges, student.foerderprofil?.staerken]);

  const childVoice = useMemo(() => {
    const values = Object.values(latestKel?.selbsteinschaetzungKind || {})
      .map((entry: any) => safeText(entry?.kommentar))
      .filter(Boolean);
    const goals = Array.isArray(latestKel?.zieleKind)
      ? latestKel.zieleKind.map((entry: any) => safeText(entry)).filter(Boolean)
      : [];
    return [...new Set([...values, ...goals])].slice(0, 4);
  }, [latestKel]);

  const teacherVoice = useMemo(() => {
    const values = Object.values(latestKel?.einschaetzungLehrperson || {})
      .map((entry: any) => safeText(entry?.kommentar))
      .filter(Boolean);
    return [...new Set(values)].slice(0, 4);
  }, [latestKel]);

  const parentVoice = safeText(latestKel?.elternEindruck);

  const learningSubjects = useMemo(() => {
    const preferred = ['Deutsch', 'Mathematik', 'Sachunterricht'];
    const ordered = [
      ...preferred.filter(fach => activeFaecher.includes(fach)),
      ...activeFaecher.filter(fach => !preferred.includes(fach)),
    ];
    return ordered.flatMap(fach => {
      const value = berechne(app, student.id, fach, sem);
      const record = app.noten?.[student.id]?.[fach]?.[sem];
      const evidence = [
        ...(record?.sa || []), ...(record?.lzk || []), ...(record?.wp || []), ...(record?.aufgaben || []),
      ].filter((item: any) => item !== null && item !== undefined && item !== '').length;
      const hasParticipation = app.mitarbeit?.[student.id]?.[fach]?.[sem] !== undefined || record?.miDirekt !== undefined;
      const hasData = value !== null || evidence > 0 || hasParticipation;
      if (!hasData) return [];
      const mode = getAssessmentMode(app, fach);
      const label = value === null
        ? 'noch keine Gesamtbewertung'
        : mode === 'grades'
          ? `Note ${Number(value).toLocaleString('de-AT', { maximumFractionDigits: 2 })}`
          : `${Number(value).toLocaleString('de-AT', { maximumFractionDigits: 1 })} %`;
      return [{ fach, value, mode, label, evidence, hasParticipation }];
    }).slice(0, 8);
  }, [activeFaecher, app, berechne, sem, student.id]);

  // Read-only material from the REAL Notenmappe, limited to this child and semester.
  const availableAssessments = useMemo(() =>
    sem === '1' || sem === '2'
      ? getKelGradebookAssessments(app, student.id, sem, activeFaecher)
      : [],
    [app, student.id, sem, activeFaecher]);
  const chosenLearningSubjects = scopeMatches
    ? learningSubjects.filter(entry => selectedSubjects.includes(entry.fach)) : [];
  const chosenAssessments = scopeMatches
    ? pickKelAssessments(availableAssessments, selectedAssessmentIds) : [];
  const toggleSubject = (fach: string) => {
    setSelectedSubjects(previous => previous.includes(fach)
      ? previous.filter(item => item !== fach) : [...previous, fach]);
    setVisible(previous => ({ ...previous, learning: true }));
    setSelectionSaved(false);
  };
  const toggleAssessment = (id: string) => {
    setSelectedAssessmentIds(previous => previous.includes(id)
      ? previous.filter(item => item !== id) : [...previous, id]);
    setVisible(previous => ({ ...previous, individualGrades: true }));
    setSelectionSaved(false);
  };
  const savePresentationSelection = () => {
    if (!scopeMatches || !app.schueler.some(entry => entry.id === student.id)) return;
    const nextPlan = {
      classId: app.activeClassId, studentId: student.id, semester: sem,
      visible: { ...visible },
      selectedSubjects: chosenLearningSubjects.map(item => item.fach),
      selectedAssessmentIds: chosenAssessments.map(item => item.id),
      updatedAt: new Date().toISOString(),
    };
    setApp(previous => {
      if (previous.activeClassId !== app.activeClassId ||
          !previous.schueler.some(entry => entry.id === student.id)) return previous;
      return {
        ...previous,
        schueler: previous.schueler.map(entry => entry.id !== student.id ? entry : {
          ...entry,
          kelPraesentationAuswahl: {
            ...(entry.kelPraesentationAuswahl || {}),
            [planKey]: nextPlan,
          },
        }),
      };
    });
    setSelectionSaved(true);
  };

  const kelAreas = useMemo(() => {
    const map = new Map<string, any>();
    for (const area of STANDARD_KEL_BEREICHE || []) map.set(area.id, area);
    for (const key of [
      ...Object.keys(latestKel?.selbsteinschaetzungKind || {}),
      ...Object.keys(latestKel?.einschaetzungLehrperson || {}),
    ]) {
      if (!map.has(key)) map.set(key, { id: key, label: key.replace(/_/g, ' '), kindgerecht: '' });
    }
    return [...map.values()].flatMap(area => {
      const child = latestKel?.selbsteinschaetzungKind?.[area.id]?.wert;
      const teacher = latestKel?.einschaetzungLehrperson?.[area.id]?.wert;
      if (child === undefined && teacher === undefined) return [];
      return [{
        id: area.id,
        label: area.label || area.id,
        statement: area.kindgerecht || '',
        child: child === undefined || child === null ? null : Number(child),
        teacher: teacher === undefined || teacher === null ? null : Number(teacher),
      }];
    }).slice(0, 12);
  }, [STANDARD_KEL_BEREICHE, latestKel]);

  const selectedPortfolio = useMemo(() => (
    (student.portfolio || []).filter((entry: any) => entry.isInKEL).slice(0, 6)
  ), [student.portfolio]);

  const ikmRecord = useMemo(() => (
    (app.ikmRecords || []).find((entry: any) => entry.schuelerId === student.id) || null
  ), [app.ikmRecords, student.id]);

  const documentedGoals = useMemo(() => {
    const kelGoals = Array.isArray(latestKel?.zieleKind)
      ? latestKel.zieleKind.map((entry: any) => safeText(entry)).filter(Boolean)
      : [];
    const supportGoals = (student.foerderprofil?.foerderziele || [])
      .filter((entry: any) => !entry.status || entry.status === 'offen' || entry.status === 'in Arbeit')
      .map((entry: any) => safeText(entry)).filter(Boolean);
    return [...new Set([...kelGoals, ...supportGoals])].slice(0, 6);
  }, [latestKel?.zieleKind, student.foerderprofil?.foerderziele]);

  const slides = useMemo<Slide[]>(() => {
    const list: Slide[] = [
      { id: 'cover', type: 'cover', title: `${student.vorname} ${student.nachname}`, subtitle: t.welcome },
      { id: 'path', type: 'path', title: t.path, subtitle: 'Stärken · Sichtweisen · Lernen · nächste Schritte' },
    ];
    if (visible.strengths && strengths.length) list.push({ id: 'strengths', type: 'strengths', title: t.strengths });
    if (visible.voices && (childVoice.length || parentVoice || teacherVoice.length)) list.push({ id: 'voices', type: 'voices', title: t.voices });
    if (visible.learning && chosenLearningSubjects.length) list.push({ id: 'learning', type: 'learning', title: t.learning, subtitle: 'Nur eigene dokumentierte Lernstände – kein Klassenvergleich' });
    if (visible.individualGrades && chosenAssessments.length) list.push({ id: 'individualGrades', type: 'individualGrades', title: 'Meine ausgewählten Arbeiten', subtitle: 'Nur einzeln freigegebene Bewertungen aus der Notenmappe' });
    if (visible.assessment && kelAreas.length) list.push({ id: 'assessment', type: 'assessment', title: t.assessment });
    if (visible.portfolio && selectedPortfolio.length) list.push({ id: 'portfolio', type: 'portfolio', title: t.portfolio });
    if (visible.attendance && attendance.hasData) list.push({ id: 'attendance', type: 'attendance', title: t.attendance, subtitle: 'Optionaler organisatorischer Gesprächspunkt' });
    if (visible.diagnostics && ikmRecord) list.push({ id: 'diagnostics', type: 'diagnostics', title: t.diagnostics, subtitle: 'Nur dokumentierte Werte aus vorhandenen Erhebungen' });
    if (visible.goals) list.push({ id: 'goals', type: 'goals', title: t.goals, subtitle: 'Gemeinsam konkret und überprüfbar vereinbaren' });
    if (visible.closing) list.push({ id: 'closing', type: 'closing', title: t.closing });
    return list;
  }, [student.vorname, student.nachname, t, visible, strengths.length, childVoice.length, parentVoice, teacherVoice.length, chosenLearningSubjects.length, chosenAssessments.length, kelAreas.length, selectedPortfolio.length, attendance.hasData, ikmRecord]);

  useEffect(() => {
    if (slideIndex >= slides.length) setSlideIndex(Math.max(0, slides.length - 1));
  }, [slideIndex, slides.length]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'SELECT') return;
      if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault();
        setSlideIndex(previous => Math.min(slides.length - 1, previous + 1));
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setSlideIndex(previous => Math.max(0, previous - 1));
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        if (isFullscreen) setIsFullscreen(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen, onClose, slides.length]);

  const currentSlide = slides[slideIndex] || slides[0];
  const formatTimer = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  const saveAgreement = () => {
    const text = agreementDraft.trim();
    setApp(previous => {
      const list = [...(previous.kelGespraeche || [])];
      const index = latestKel ? list.findIndex((entry: any) => entry.id === latestKel.id) : -1;
      let nextStudents = previous.schueler;
      if (index >= 0) {
        list[index] = { ...list[index], vereinbarungen: text };
      } else {
        const newMeetingId = `kel-${Date.now()}`;
        // A plan prepared before the first KEL protocol follows this explicitly
        // created meeting; saving a preparation never creates a fake protocol.
        const oldKey = JSON.stringify([previous.schuljahr || '', sem, 'vorbereitung']);
        const newKey = JSON.stringify([previous.schuljahr || '', sem, newMeetingId]);
        nextStudents = previous.schueler.map(entry => {
          if (entry.id !== student.id || !entry.kelPraesentationAuswahl?.[oldKey]) return entry;
          const plans = { ...entry.kelPraesentationAuswahl };
          plans[newKey] = plans[oldKey];
          delete plans[oldKey];
          return { ...entry, kelPraesentationAuswahl: plans };
        });
        list.push({
          id: newMeetingId,
          schuelerId: student.id,
          datum: new Date().toISOString().slice(0, 10),
          schuljahr: previous.schuljahr || '',
          teilnehmer: [student.vorname, 'Eltern', 'Lehrperson'],
          selbsteinschaetzungKind: {},
          einschaetzungLehrperson: {},
          elternEindruck: '',
          zieleKind: [],
          vereinbarungen: text,
          naechsterTermin: '',
          unterschriftKind: false,
          unterschriftEltern: false,
          unterschriftLehrperson: false,
          notiz: '',
        });
      }
      return { ...previous, kelGespraeche: list,
        schueler: nextStudents };
    });
    setAgreementSaved(true);
    window.setTimeout(() => setAgreementSaved(false), 1800);
  };

  const exportPowerPoint = async () => {
    if (isExporting || !slides.length) return;
    setIsExporting(true);
    try {
      const pptx: any = new (pptxgen as any)();
      pptx.layout = 'LAYOUT_WIDE';
      pptx.author = 'Klassio';
      pptx.company = 'Klassio';
      pptx.subject = 'KEL-Gespräch';
      pptx.title = `KEL – ${student.vorname} ${student.nachname}`;
      const colors = { ink: '0F172A', muted: '64748B', line: 'E2E8F0', surface: 'F8FAFC', white: 'FFFFFF', primary: '4F46E5', emerald: '059669', amber: 'D97706', rose: 'E11D48' };
      const addHeader = (slide: any, title: string, subtitle?: string) => {
        slide.background = { color: colors.surface };
        slide.addText(title, { x: 0.7, y: 0.45, w: 11.9, h: 0.45, fontFace: 'Aptos Display', fontSize: 24, bold: true, color: colors.ink, margin: 0 });
        if (subtitle) slide.addText(subtitle, { x: 0.7, y: 0.95, w: 11.9, h: 0.3, fontFace: 'Aptos', fontSize: 11, color: colors.muted, margin: 0 });
        slide.addText(`Klassio · ${student.vorname} · ${app.schuljahr || ''}`, { x: 0.7, y: 7.12, w: 11.9, h: 0.18, fontFace: 'Aptos', fontSize: 7.5, color: '94A3B8', align: 'right', margin: 0 });
      };
      const addBullets = (slide: any, values: string[], x: number, y: number, w: number, h: number) => {
        const text = values.length ? values.map(value => `• ${value}`).join('\n\n') : 'Noch nichts dokumentiert.';
        slide.addText(text, { x, y, w, h, fontFace: 'Aptos', fontSize: 18, color: colors.ink, margin: 0.16, fit: 'shrink', valign: 'mid', fill: { color: colors.white }, line: { color: colors.line, pt: 1 } });
      };

      for (const slideData of slides) {
        const slide = pptx.addSlide();
        addHeader(slide, slideData.title, slideData.subtitle);
        if (slideData.type === 'cover') {
          slide.addText(student.vorname, { x: 1.2, y: 2.0, w: 10.9, h: 1.0, align: 'center', fontFace: 'Aptos Display', fontSize: 40, bold: true, color: colors.ink, margin: 0 });
          slide.addText(t.welcome, { x: 1.2, y: 3.1, w: 10.9, h: 0.7, align: 'center', fontFace: 'Aptos', fontSize: 20, color: colors.primary, margin: 0 });
          slide.addText(`${classLabel} · ${sem}. Semester · ${app.schuljahr || ''}`, { x: 2.2, y: 4.25, w: 8.9, h: 0.45, align: 'center', fontSize: 14, color: colors.muted, margin: 0 });
          continue;
        }
        if (slideData.type === 'path') {
          const names = slides.filter(entry => !['cover', 'path', 'closing'].includes(entry.type)).map(entry => entry.title);
          addBullets(slide, names, 1.25, 1.65, 10.8, 4.9);
          continue;
        }
        if (slideData.type === 'strengths') { addBullets(slide, strengths, 1.0, 1.55, 11.3, 5.1); continue; }
        if (slideData.type === 'voices') {
          slide.addText(`${t.child}\n${childVoice.join('\n') || 'Noch keine eigene Aussage dokumentiert.'}`, { x: 0.75, y: 1.55, w: 3.8, h: 4.9, fontSize: 15, bold: false, color: colors.ink, margin: 0.18, fit: 'shrink', fill: { color: 'FFF7ED' }, line: { color: 'FED7AA', pt: 1 } });
          slide.addText(`${t.parents}\n${parentVoice || 'Noch kein Elterneindruck dokumentiert.'}`, { x: 4.75, y: 1.55, w: 3.8, h: 4.9, fontSize: 15, color: colors.ink, margin: 0.18, fit: 'shrink', fill: { color: 'F0FDF4' }, line: { color: 'BBF7D0', pt: 1 } });
          slide.addText(`${t.teacher}\n${teacherVoice.join('\n') || 'Noch keine Gesprächsaussage dokumentiert.'}`, { x: 8.75, y: 1.55, w: 3.8, h: 4.9, fontSize: 15, color: colors.ink, margin: 0.18, fit: 'shrink', fill: { color: 'EEF2FF' }, line: { color: 'C7D2FE', pt: 1 } });
          continue;
        }
        if (slideData.type === 'learning') {
          const rows = chosenLearningSubjects.map(item => `${item.fach}: ${item.label}${item.evidence ? ` · ${item.evidence} dokumentierte Leistungsnachweise` : ''}`);
          addBullets(slide, rows, 0.95, 1.55, 11.5, 5.0);
          continue;
        }
        if (slideData.type === 'individualGrades') {
          const rows = chosenAssessments.map(item =>
            `${item.fach} · ${item.titel}${item.datum ? ' · ' + item.datum : ''}: ${item.ergebnis}`);
          // One real, editable native PPTX chart only when the teacher selected
          // >=2 values from the SAME subject and the SAME numeric scale.
          // Otherwise show the exact selected values as cards, never a fake ratio.
          const sameScale = chosenAssessments.length >= 2 &&
            chosenAssessments.every(item => item.fach === chosenAssessments[0].fach &&
              item.mode === chosenAssessments[0].mode);
          const mode = chosenAssessments[0]?.mode;
          const values = sameScale && (mode === 'grades' || mode === 'percent')
            ? chosenAssessments.map(item => Number(item.ergebnis.replace(/^Note\\s*/, '').replace(/\\s*%$/, '').replace(',', '.')))
            : [];
          const canChart = values.length >= 2 && values.every(value => Number.isFinite(value));
          addBullets(slide, rows, 0.9, 1.45, 11.6, canChart ? 2.2 : 5.2);
          if (canChart) {
            slide.addChart(pptx.ChartType.bar, [{
              name: mode === 'grades' ? 'Note' : 'Prozent',
              labels: chosenAssessments.map(item => item.titel),
              values,
            }], {
              x: 1.2, y: 3.85, w: 10.7, h: 2.55,
              showLegend: false, showValue: true,
              showTitle: true,
              title: mode === 'grades' ? 'Noten 1–5 (1 = Sehr gut)' : 'Prozentwerte (0–100 %)',
              valAxisMinVal: mode === 'grades' ? 1 : 0,
              valAxisMaxVal: mode === 'grades' ? 5 : 100,
              catAxisLabelFontSize: 10,
              showCatName: false,
            });
          }
          continue;
        }
        if (slideData.type === 'assessment') {
          const rows = kelAreas.map(area => `${area.label}: ${t.child} ${area.child === null ? '–' : area.child} · ${t.teacher} ${area.teacher === null ? '–' : area.teacher}`);
          addBullets(slide, rows, 0.9, 1.5, 11.6, 5.2);
          continue;
        }
        if (slideData.type === 'portfolio') {
          const items = selectedPortfolio.map((entry: any) => `${entry.titel || 'Portfolio'}${entry.beschreibung ? ` – ${entry.beschreibung}` : ''}`);
          addBullets(slide, items, 0.9, 1.5, 11.6, 5.2);
          continue;
        }
        if (slideData.type === 'attendance') {
          addBullets(slide, [`Fehlstunden gesamt: ${attendance.total}`, `davon entschuldigt: ${attendance.excused}`, `davon unentschuldigt: ${attendance.unexcused}`], 1.6, 2.0, 10.0, 3.7);
          continue;
        }
        if (slideData.type === 'diagnostics') {
          const values = [
            ikmRecord?.mathematikPR !== undefined ? `Mathematik: ${ikmRecord.mathematikPR}` : '',
            ikmRecord?.deutschLesenPR !== undefined ? `Deutsch Lesen: ${ikmRecord.deutschLesenPR}` : '',
            ikmRecord?.deutschZuhoerenPR !== undefined ? `Deutsch Zuhören: ${ikmRecord.deutschZuhoerenPR}` : '',
            ikmRecord?.diagnoseStaerken ? `Dokumentierte Stärke: ${ikmRecord.diagnoseStaerken}` : '',
            ikmRecord?.diagnoseHerausforderungen ? `Dokumentierter nächster Schritt: ${ikmRecord.diagnoseHerausforderungen}` : '',
          ].filter(Boolean);
          addBullets(slide, values, 0.9, 1.5, 11.6, 5.2);
          continue;
        }
        if (slideData.type === 'goals') {
          addBullets(slide, documentedGoals, 0.75, 1.55, 5.75, 4.85);
          slide.addText(`Unsere Vereinbarung\n\n${agreementDraft || 'Im Gespräch gemeinsam festlegen.'}`, { x: 6.8, y: 1.55, w: 5.75, h: 4.85, fontSize: 16, color: colors.ink, margin: 0.18, fit: 'shrink', fill: { color: 'FFFFFF' }, line: { color: colors.line, pt: 1 } });
          continue;
        }
        if (slideData.type === 'closing') {
          const closing = [agreementDraft || 'Eine konkrete Vereinbarung gemeinsam festhalten.', latestKel?.naechsterTermin ? `Nächster gemeinsamer Blick: ${latestKel.naechsterTermin}` : 'Einen Zeitpunkt für den nächsten Rückblick vereinbaren.', 'Mit einer Stärke und einem machbaren nächsten Schritt aus dem Gespräch gehen.'];
          addBullets(slide, closing, 1.2, 1.75, 10.9, 4.7);
        }
      }
      const safeName = `${student.vorname || 'Kind'}-${student.nachname || ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      await pptx.writeFile({ fileName: `Klassio-KEL-${safeName || 'Praesentation'}.pptx`, compression: true });
    } catch (error) {
      console.error('KEL PowerPoint export failed', error);
      window.alert('Die KEL-PowerPoint konnte nicht erstellt werden. Bitte erneut versuchen.');
    } finally {
      setIsExporting(false);
    }
  };

  const slideOptions: Array<{ key: keyof VisibleConfig; label: string; help: string; available: boolean }> = [
    { key: 'strengths', label: 'Stärken', help: 'Dokumentierte Stärken und Badges', available: strengths.length > 0 },
    { key: 'voices', label: 'Sichtweisen', help: 'Aussagen von Kind, Eltern und Lehrperson aus dem KEL-Protokoll', available: Boolean(childVoice.length || parentVoice || teacherVoice.length) },
    { key: 'learning', label: 'Lernstand', help: 'Nur die unten ausdrücklich ausgewählten Fächer', available: learningSubjects.length > 0 },
    { key: 'individualGrades', label: 'Einzelne Bewertungen', help: 'Nur die unten einzeln ausgewählten Leistungsnachweise', available: availableAssessments.length > 0 },
    { key: 'assessment', label: 'Selbst- & Fremdeinschätzung', help: 'Nur ausdrücklich erfasste KEL-Einschätzungen', available: kelAreas.length > 0 },
    { key: 'portfolio', label: 'Portfolio', help: 'Nur Einträge, die ausdrücklich „für KEL“ markiert sind', available: selectedPortfolio.length > 0 },
    { key: 'attendance', label: 'Anwesenheit', help: 'Optional; organisatorischer Punkt, standardmäßig ausgeblendet', available: attendance.hasData },
    { key: 'diagnostics', label: 'Diagnostik', help: 'Optional; nur dokumentierte Erhebungsdaten, standardmäßig ausgeblendet', available: Boolean(ikmRecord) },
    { key: 'goals', label: 'Ziele & Vereinbarung', help: 'Gemeinsame nächste Schritte', available: true },
    { key: 'closing', label: 'Abschluss', help: 'Vereinbarung und nächster Rückblick', available: true },
  ];

  const renderSlide = () => {
    if (!currentSlide) return null;
    if (currentSlide.type === 'cover') return (
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-7 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-3xl font-black text-white shadow-lg">
          {(student.vorname?.[0] || '') + (student.nachname?.[0] || '')}
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">KEL-Gespräch</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">{student.vorname}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-xl font-semibold text-slate-600">{t.welcome}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 text-xs font-bold text-slate-600">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2">{classLabel}</span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2">{sem}. Semester</span>
          {app.schuljahr && <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2">{app.schuljahr}</span>}
        </div>
        <div className="max-w-2xl rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-900">
          Heute geht es nicht darum, dich mit anderen zu vergleichen. Wir schauen auf das, was dir gelingt, wie du dein Lernen erlebst und was dein nächster guter Schritt sein kann.
        </div>
      </div>
    );

    if (currentSlide.type === 'path') {
      const route = slides.filter(entry => !['cover', 'path', 'closing'].includes(entry.type));
      return <SlideShell title={currentSlide.title} subtitle="Ein Gespräch mit einem klaren roten Faden">
        <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2">
          {route.map((entry, index) => <div key={entry.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-black text-indigo-700">{index + 1}</span>
            <div><p className="font-black text-slate-900">{entry.title}</p><p className="mt-0.5 text-xs text-slate-500">Wir sprechen darüber, statt nur Zahlen zu zeigen.</p></div>
          </div>)}
        </div>
      </SlideShell>;
    }

    if (currentSlide.type === 'strengths') return <SlideShell title={currentSlide.title} subtitle="Wir starten bewusst mit dem, was gelingt.">
      <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {strengths.map((item, index) => <div key={item + index} className="rounded-3xl border border-amber-100 bg-amber-50/70 p-5 text-center">
          <Star className="mx-auto mb-3 text-amber-500" fill="currentColor" size={28} />
          <p className="text-base font-black leading-snug text-slate-900">{item}</p>
        </div>)}
      </div>
    </SlideShell>;

    if (currentSlide.type === 'voices') return <SlideShell title={currentSlide.title} subtitle="Drei Perspektiven dürfen nebeneinander stehen – ohne automatische Wertung.">
      <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-3">
        <VoiceCard icon={<Heart size={20} />} label={t.child} items={childVoice} empty="Noch keine eigene Aussage dokumentiert." tone="amber" />
        <VoiceCard icon={<Users size={20} />} label={t.parents} items={parentVoice ? [parentVoice] : []} empty="Noch kein Elterneindruck dokumentiert." tone="emerald" />
        <VoiceCard icon={<MessageSquare size={20} />} label={t.teacher} items={teacherVoice} empty="Noch keine Gesprächsaussage dokumentiert." tone="indigo" />
      </div>
    </SlideShell>;

    if (currentSlide.type === 'learning') return <SlideShell title={currentSlide.title} subtitle={currentSlide.subtitle}>
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {chosenLearningSubjects.map(item => <div key={item.fach} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">{item.fach}</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{item.label}</p>
          <p className="mt-2 text-xs font-semibold text-slate-500">{item.evidence ? `${item.evidence} dokumentierte Leistungsnachweise` : 'Gesamtstand aus der Notenmappe'}{item.hasParticipation ? ' · Mitarbeit dokumentiert' : ''}</p>
        </div>)}
      </div>
      <p className="mt-5 text-center text-xs font-semibold text-slate-500">Keine Rangliste und kein Klassenvergleich. Punktebewertungen werden als berechneter Prozentstand gezeigt.</p>
    </SlideShell>;

    if (currentSlide.type === 'individualGrades') return <SlideShell title={currentSlide.title} subtitle={currentSlide.subtitle}>
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {chosenAssessments.map(item => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">{item.fach}{item.datum ? ' · ' + item.datum : ''}</p>
          <h3 className="mt-2 text-base font-bold text-slate-900">{item.titel}</h3>
          <p className="mt-2 text-2xl font-black text-slate-950">{item.ergebnis}</p>
        </article>)}
      </div>
    </SlideShell>;

    if (currentSlide.type === 'assessment') return <SlideShell title={currentSlide.title} subtitle="Unterschiede sind Gesprächsanlässe, keine Fehler.">
      <div className="max-h-[430px] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white">
        <div className="grid grid-cols-[minmax(0,1fr)_6rem_6rem] gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-500">
          <span>Bereich</span><span className="text-center">{t.child}</span><span className="text-center">{t.teacher}</span>
        </div>
        {kelAreas.map(area => <div key={area.id} className="grid grid-cols-[minmax(0,1fr)_6rem_6rem] items-center gap-2 border-b border-slate-100 px-4 py-3 last:border-0">
          <div><p className="font-black text-slate-900">{area.label}</p>{area.statement && <p className="mt-0.5 text-xs text-slate-500">{area.statement}</p>}</div>
          <RatingPill value={area.child} />
          <RatingPill value={area.teacher} />
        </div>)}
      </div>
      <p className="mt-3 text-center text-xs font-semibold text-slate-500">Die Zahlen werden nur als bereits dokumentierte Einschätzungen angezeigt; es wird daraus kein Gesamtwert berechnet.</p>
    </SlideShell>;

    if (currentSlide.type === 'portfolio') return <SlideShell title={currentSlide.title} subtitle="Nur Portfolioeinträge, die ausdrücklich für das KEL-Gespräch markiert wurden.">
      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {selectedPortfolio.map((entry: any) => <div key={entry.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm">
          {entry.bildUrl && <img src={entry.bildUrl} alt="Ausgewählter Portfolioeintrag" className="h-36 w-full object-cover" />}
          <div className="p-4"><p className="font-black text-slate-900">{entry.titel || 'Portfolio'}</p>{entry.beschreibung && <p className="mt-2 text-xs leading-relaxed text-slate-600">{entry.beschreibung}</p>}</div>
        </div>)}
      </div>
    </SlideShell>;

    if (currentSlide.type === 'attendance') return <SlideShell title={currentSlide.title} subtitle="Optionaler organisatorischer Punkt – ohne Vergleich mit der Klasse.">
      <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
        <Metric label="Fehlstunden gesamt" value={attendance.total} />
        <Metric label="Entschuldigt" value={attendance.excused} />
        <Metric label="Unentschuldigt" value={attendance.unexcused} />
      </div>
    </SlideShell>;

    if (currentSlide.type === 'diagnostics') {
      const values = [
        ['Mathematik', ikmRecord?.mathematikPR],
        ['Deutsch Lesen', ikmRecord?.deutschLesenPR],
        ['Deutsch Zuhören', ikmRecord?.deutschZuhoerenPR],
        ['Sprachbewusstsein', ikmRecord?.deutschSprachbewusstseinPR],
      ].filter(([, value]) => value !== undefined && value !== null);
      return <SlideShell title={currentSlide.title} subtitle={currentSlide.subtitle}>
        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-left">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Dokumentierte Werte</p>
            <div className="mt-3 space-y-2">{values.map(([label, value]) => <div key={String(label)} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span className="font-bold text-slate-700">{label}</span><strong>{String(value)}</strong></div>)}</div>
          </div>
          <div className="space-y-3 text-left">
            {ikmRecord?.diagnoseStaerken && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-xs font-black uppercase text-emerald-700">Dokumentierte Stärke</p><p className="mt-2 text-sm font-semibold text-slate-800">{ikmRecord.diagnoseStaerken}</p></div>}
            {ikmRecord?.diagnoseHerausforderungen && <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4"><p className="text-xs font-black uppercase text-amber-700">Nächster Lernschritt</p><p className="mt-2 text-sm font-semibold text-slate-800">{ikmRecord.diagnoseHerausforderungen}</p></div>}
          </div>
        </div>
      </SlideShell>;
    }

    if (currentSlide.type === 'goals') return <SlideShell title={currentSlide.title} subtitle={currentSlide.subtitle}>
      <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-5 text-left">
          <div className="mb-3 flex items-center gap-2 text-violet-700"><Target size={18} /><p className="text-xs font-black uppercase tracking-wider">Vorhandene Ziele</p></div>
          {documentedGoals.length ? <ul className="space-y-3">{documentedGoals.map(goal => <li key={goal} className="flex gap-2 text-sm font-semibold text-slate-800"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-violet-600" />{goal}</li>)}</ul> : <p className="text-sm text-slate-500">Noch keine Ziele dokumentiert. Das ist ein guter Moment, gemeinsam einen konkreten nächsten Schritt zu formulieren.</p>}
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 text-left">
          <div className="mb-3 flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-emerald-700"><Save size={18} /><p className="text-xs font-black uppercase tracking-wider">Unsere Vereinbarung</p></div>{agreementSaved && <span className="text-xs font-bold text-emerald-700">Gespeichert ✓</span>}</div>
          <textarea value={agreementDraft} onChange={event => { setAgreementDraft(event.target.value); setAgreementSaved(false); }} placeholder="Zum Beispiel: Wir lesen an vier Tagen pro Woche zehn Minuten gemeinsam …" className="min-h-44 w-full resize-y rounded-xl border border-emerald-200 bg-white p-3 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500" />
          <button type="button" onClick={saveAgreement} className="mt-3 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-black text-white">Vereinbarung speichern</button>
        </div>
      </div>
    </SlideShell>;

    if (currentSlide.type === 'closing') return <SlideShell title={currentSlide.title} subtitle="Ein guter Abschluss ist kurz, konkret und positiv.">
      <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-3">
        <ClosingCard icon={<Star size={22} />} label="Eine Stärke" text={strengths[0] || 'Was heute besonders positiv aufgefallen ist.'} />
        <ClosingCard icon={<Target size={22} />} label="Ein nächster Schritt" text={agreementDraft || documentedGoals[0] || 'Gemeinsam einen machbaren nächsten Schritt festlegen.'} />
        <ClosingCard icon={<CalendarDays size={22} />} label="Nächster Rückblick" text={latestKel?.naechsterTermin || 'Gemeinsam einen passenden Zeitpunkt vereinbaren.'} />
      </div>
      <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-indigo-100 bg-indigo-50 p-5 text-center text-base font-black text-indigo-900">Danke, dass wir gemeinsam auf Lernen, Entwicklung und die nächsten Schritte geschaut haben.</div>
    </SlideShell>;

    return null;
  };

  return <div className={`fixed inset-0 z-[99999] flex flex-col ${isFullscreen ? 'bg-slate-950' : 'bg-slate-100'}`}>
    {!isFullscreen && <header className="z-50 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700" title="KEL schließen"><X size={16} /></button>
          <div className="min-w-0"><p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-indigo-600">KEL-Präsentation</p><h2 className="truncate text-sm font-black text-slate-900">{student.vorname} {student.nachname}</h2></div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1">
            <button type="button" onClick={() => setView('slides')} className={`rounded-lg px-3 py-1.5 text-xs font-black ${view === 'slides' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>Präsentation</button>
            <button type="button" onClick={() => setView('prepare')} className={`rounded-lg px-3 py-1.5 text-xs font-black ${view === 'prepare' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>Vorbereiten</button>
          </div>
          <select aria-label="Präsentationssprache" value={selectedLang} onChange={event => setSelectedLang(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
            {LANGUAGES.map(language => <option key={language.id} value={language.id}>{language.flag} {language.label}</option>)}
          </select>
          <button type="button" onClick={() => setShowConfig(true)} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700"><Settings2 size={13} /> Folien</button>
          <button type="button" onClick={exportPowerPoint} disabled={isExporting} className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800 disabled:opacity-50">{isExporting ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />} PowerPoint</button>
          <button type="button" onClick={() => exportSchuelerPDF(student.id, app)} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700"><Printer size={13} /> Dossier-PDF</button>
          {view === 'slides' && <button type="button" onClick={() => setIsFullscreen(true)} className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white"><Maximize2 size={13} /> Präsentieren</button>}
        </div>
      </div>
    </header>}

    {showConfig && <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={event => { if (event.currentTarget === event.target) setShowConfig(false); }}>
      <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-black text-slate-950">Was soll im Gespräch sichtbar sein?</h3><p className="mt-1 text-xs text-slate-600">Standardmäßig werden nur kind- und elterngeeignete Kerninhalte gezeigt.</p></div><button onClick={() => setShowConfig(false)} className="rounded-xl border border-slate-200 p-2"><X size={15} /></button></div>
        <div className="mt-4 space-y-2">{slideOptions.map(option => <label key={option.key} className={`flex items-start gap-3 rounded-2xl border p-3 ${option.available ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
          <input type="checkbox" checked={visible[option.key]} disabled={!option.available} onChange={event => { setVisible(previous => ({ ...previous, [option.key]: event.target.checked })); setSelectionSaved(false); }} className="mt-1" />
          <div className="flex-1"><p className="text-sm font-black text-slate-900">{option.label}</p><p className="mt-0.5 text-xs text-slate-500">{option.help}</p></div>
          {visible[option.key] && option.available ? <Eye size={16} className="text-emerald-600" /> : <EyeOff size={16} className="text-slate-400" />}
        </label>)}</div>
        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900"><ShieldCheck size={16} className="mb-2" />Interne Notizen, Klassenvergleiche, Klassenkasse und automatische Persönlichkeitsurteile werden in dieser Präsentation nicht automatisch gezeigt.</div>
      </div>
    </div>}

    {view === 'prepare' ? <main className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-indigo-600">Vorbereitung</p><h1 className="mt-1 text-2xl font-black text-slate-950">Ein Gespräch, keine Datenshow</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Die Präsentation startet bei Stärken und Sichtweisen, zeigt nur ausgewählte Lerninformationen und endet mit einer gemeinsamen Vereinbarung.</p></div><span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700">{slides.length} Folien</span></div>
        </section>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <PrepCard icon={<Heart size={18} />} title="Kind im Mittelpunkt" value={`${strengths.length} Stärken · ${childVoice.length} Kind-Aussagen`} text="Die Präsentation beginnt nicht mit Noten oder Fehlzeiten." />
          <PrepCard icon={<BookOpen size={18} />} title="Ausgewählte Lernnachweise" value={`${chosenLearningSubjects.length} Fächer · ${chosenAssessments.length} Einzelbewertungen · ${selectedPortfolio.length} Portfolioeinträge`} text="Portfolio wird nur gezeigt, wenn ein Eintrag ausdrücklich für KEL markiert wurde." />
          <PrepCard icon={<ShieldCheck size={18} />} title="Geschützte Informationen" value="Keine Klassenvergleiche" text="Interne Notizen, Klassenkasse und sensible Hintergrunddaten bleiben außerhalb der Elternansicht." />
        </div>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-black text-slate-950">Datenstand</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <DataBadge label="KEL-Einschätzung" available={kelAreas.length > 0} detail={`${kelAreas.length} Bereiche`} />
            <DataBadge label="Portfolio für KEL" available={selectedPortfolio.length > 0} detail={`${selectedPortfolio.length} Einträge`} />
            <DataBadge label="Lernstand" available={learningSubjects.length > 0} detail={`${learningSubjects.length} Fächer`} />
            <DataBadge label="Diagnostik" available={Boolean(ikmRecord)} detail={ikmRecord ? 'vorhanden, standardmäßig verborgen' : 'nicht vorhanden'} />
          </div>
        </section>
        <section className="space-y-4 rounded-3xl border border-indigo-200 bg-white p-5 shadow-sm" data-testid="kel-gradebook-preparation">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-950">Notenmappe für dieses Gespräch auswählen</h2>
              <p className="mt-1 text-xs text-slate-600">Nur für {student.vorname} · {sem}. Semester. Fächer und einzelne Bewertungen erscheinen erst, wenn du sie selbst auswählst. Es werden keine anderen Kinder oder Klassenvergleiche gezeigt.</p>
            </div>
            <button type="button" onClick={() => setShowConfig(true)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold">Weitere Folien wählen</button>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-800">Fachstände (optional)</h3>
            <div className="flex flex-wrap gap-2">
              {learningSubjects.length ? learningSubjects.map(item =>
                <label key={item.fach} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                  <input type="checkbox" checked={selectedSubjects.includes(item.fach)} onChange={() => toggleSubject(item.fach)} />
                  {item.fach}: {item.label}
                </label>
              ) : <p className="text-xs text-slate-500">Noch keine dokumentierten Fachstände im gewählten Semester.</p>}
            </div>
            {chosenLearningSubjects.length > 0 && !visible.learning &&
              <p className="text-xs text-amber-800">Die Fachstand-Folie ist derzeit ausgeblendet. Du kannst sie unter „Weitere Folien wählen“ wieder einschalten.</p>}
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800">Einzelne Leistungsnachweise (optional)</h3>
            {availableAssessments.length ? [...new Set(availableAssessments.map(item => item.fach))].map(fach =>
              <details key={fach} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <summary className="cursor-pointer text-xs font-black text-slate-800">
                  {fach} · {availableAssessments.filter(item => item.fach === fach && selectedAssessmentIds.includes(item.id)).length}
                  /{availableAssessments.filter(item => item.fach === fach).length} ausgewählt
                </summary>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {availableAssessments.filter(item => item.fach === fach).map(item =>
                    <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">
                      <input type="checkbox" className="mt-0.5" checked={selectedAssessmentIds.includes(item.id)}
                        onChange={() => toggleAssessment(item.id)} />
                      <span className="min-w-0">
                        <span className="block font-black text-slate-900">{item.titel}</span>
                        <span className="mt-1 block">{item.ergebnis}{item.datum ? ' · ' + item.datum : ''}</span>
                      </span>
                    </label>
                  )}
                </div>
              </details>
            ) : <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Noch keine auswertbaren Einzelbewertungen aus der Notenmappe für dieses Kind und Semester vorhanden.</p>}
            {selectedAssessmentIds.length > chosenAssessments.length &&
              <p role="status" className="text-xs font-semibold text-amber-800">Ein zuvor ausgewählter Leistungsnachweis wurde verändert oder entfernt und wird deshalb nicht mehr gezeigt. Bitte Auswahl überprüfen und erneut speichern.</p>}
            {chosenAssessments.length > 0 && !visible.individualGrades &&
              <p className="text-xs text-amber-800">Die Einzelleistungs-Folie ist momentan ausgeblendet. Unter „Weitere Folien wählen“ kannst du sie wieder einschalten.</p>}
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={savePresentationSelection}
              className="rounded-xl bg-indigo-700 px-4 py-2 text-xs font-black text-white">
              <Save size={14} className="mr-1 inline-block" /> Auswahl für dieses KEL-Gespräch speichern
            </button>
            <span role="status" className={selectionSaved ? 'text-xs font-bold text-emerald-700' : 'text-xs font-semibold text-amber-800'}>
              {selectionSaved ? 'Auswahl für dieses Kind und Semester gespeichert.' : 'Änderungen noch nicht gespeichert.'}
            </span>
            <button type="button" onClick={() => { setShowConfig(false); setView('slides'); setSlideIndex(0); }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold">Vorschau ansehen</button>
          </div>
          <p className="text-xs text-slate-500">Die Auswahl wird in den verschlüsselten Kinddaten gespeichert, nicht als Kopie der Bewertungen. Wenn sich eine Bewertung oder ihre Bezeichnung ändert, wird sie zur Sicherheit erst nach erneuter Auswahl sichtbar. Bildschirm und PowerPoint nutzen dieselbe Freigabe.</p>
        </section>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-black text-slate-950">Vereinbarung vorbereiten</h2>
          <p className="mt-1 text-xs text-slate-500">Du kannst hier vorformulieren; gespeichert wird erst ausdrücklich.</p>
          <textarea value={agreementDraft} onChange={event => { setAgreementDraft(event.target.value); setAgreementSaved(false); }} className="mt-3 min-h-36 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Gemeinsames Ziel oder nächste Vereinbarung …" />
          <button type="button" onClick={saveAgreement} className="mt-3 rounded-xl bg-indigo-700 px-4 py-2 text-xs font-black text-white">Vereinbarung speichern</button>
        </section>
      </div>
    </main> : <main ref={slideContainerRef} tabIndex={0} className={`flex flex-1 flex-col bg-slate-950 outline-none ${isFullscreen ? 'fixed inset-0 z-[120] p-4 md:p-6' : 'min-h-0 p-4 md:p-6'}`}>
      <div className="mx-auto mb-3 flex w-full max-w-6xl items-center justify-between gap-3 text-white">
        <div><p className="text-[0.6rem] font-black uppercase tracking-[0.16em] text-slate-500">Folie {slideIndex + 1} von {slides.length}</p><p className="mt-0.5 text-sm font-black">{currentSlide?.title}</p></div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setTimerActive(previous => !previous)} className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-xs font-black text-slate-300"><Clock size={12} className="mr-1 inline" />{formatTimer(timerSeconds)} {timerActive ? 'Pause' : 'Start'}</button>
          <button type="button" onClick={() => { setTimerSeconds(15 * 60); setTimerActive(false); }} className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-black text-slate-400">Reset</button>
          {isFullscreen && <button type="button" onClick={() => setIsFullscreen(false)} className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-300"><Minimize2 size={15} /></button>}
        </div>
      </div>
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl md:p-8">
        {renderSlide()}
      </div>
      <div className="mx-auto mt-3 flex w-full max-w-6xl items-center justify-between gap-3">
        <button type="button" disabled={slideIndex === 0} onClick={() => setSlideIndex(previous => Math.max(0, previous - 1))} className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-black text-slate-300 disabled:opacity-30"><ChevronLeft size={14} /> Zurück</button>
        <div className="flex gap-1">{slides.map((slide, index) => <button key={slide.id} type="button" aria-label={`Folie ${index + 1}: ${slide.title}`} onClick={() => setSlideIndex(index)} className={`h-2 rounded-full transition-all ${index === slideIndex ? 'w-7 bg-indigo-500' : 'w-2 bg-slate-700'}`} />)}</div>
        {slideIndex < slides.length - 1 ? <button type="button" onClick={() => setSlideIndex(previous => Math.min(slides.length - 1, previous + 1))} className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white">Weiter <ChevronRight size={14} /></button> : <button type="button" onClick={onClose} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white">Gespräch abschließen</button>}
      </div>
    </main>}
  </div>;
}

function SlideShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <div className="flex h-full flex-1 flex-col">
    <div className="mb-5 border-b border-slate-100 pb-4 text-center"><h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">{title}</h2>{subtitle && <p className="mx-auto mt-2 max-w-3xl text-sm font-semibold text-slate-500">{subtitle}</p>}</div>
    <div className="flex flex-1 flex-col items-center justify-center">{children}</div>
  </div>;
}

function VoiceCard({ icon, label, items, empty, tone }: { icon: React.ReactNode; label: string; items: string[]; empty: string; tone: 'amber' | 'emerald' | 'indigo' }) {
  const styles = tone === 'amber' ? 'border-amber-100 bg-amber-50 text-amber-800' : tone === 'emerald' ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-indigo-100 bg-indigo-50 text-indigo-800';
  return <div className={`rounded-3xl border p-5 text-left ${styles}`}><div className="mb-4 flex items-center gap-2"><span>{icon}</span><p className="text-xs font-black uppercase tracking-wider">{label}</p></div>{items.length ? <ul className="space-y-3">{items.map((item, index) => <li key={index} className="rounded-xl bg-white/80 p-3 text-sm font-semibold leading-relaxed text-slate-800">„{item}“</li>)}</ul> : <p className="text-sm font-semibold text-slate-500">{empty}</p>}</div>;
}

function RatingPill({ value }: { value: number | null }) {
  if (value === null) return <span className="text-center text-xs font-bold text-slate-400">–</span>;
  return <span className="mx-auto rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-center text-xs font-black text-indigo-800" title={RATING_LABELS[value] || String(value)}>{value}</span>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm"><p className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</p><p className="mt-3 text-4xl font-black text-slate-950">{value}</p></div>;
}

function ClosingCard({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">{icon}</div><p className="mt-3 text-xs font-black uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-sm font-black leading-relaxed text-slate-900">{text}</p></div>;
}

function PrepCard({ icon, title, value, text }: { icon: React.ReactNode; title: string; value: string; text: string }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">{icon}</div><p className="mt-3 text-xs font-black uppercase tracking-wider text-slate-500">{title}</p><p className="mt-2 text-xl font-black text-slate-950">{value}</p><p className="mt-2 text-xs leading-relaxed text-slate-500">{text}</p></div>;
}

function DataBadge({ label, available, detail }: { label: string; available: boolean; detail: string }) {
  return <div className={`rounded-2xl border p-3 ${available ? 'border-emerald-100 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}><div className="flex items-center gap-2">{available ? <CheckCircle2 size={15} className="text-emerald-700" /> : <Award size={15} className="text-slate-400" />}<p className="text-xs font-black text-slate-800">{label}</p></div><p className="mt-2 text-[11px] font-semibold text-slate-500">{detail}</p></div>;
}
