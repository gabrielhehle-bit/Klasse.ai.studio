import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, TrendingUp, TrendingDown, AlertTriangle, BarChart3, FileCheck, Plus, Trash2, Edit3, ArrowLeft, Grid, Database, Printer, History, User, CheckCircle2, AlertCircle, Info, UploadCloud, Sparkles, Map as MapIcon, Flag, Star, Lightbulb, MessageCircle, ArrowRight, Microscope, ChevronRight, Gamepad2, ClipboardList, Brain, Zap, Hand, X, BookOpen, Calendar, Target, Loader2, Sliders, Search, ChevronDown, MoreVertical
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { useApp } from '../context/AppContext';
import { DiagnostikTest, DiagnostikErhebung, VORSCHLAG_DIAGNOSTIK_TESTS, Student } from '../types';
import { formatLocalDateKey, logActivity } from '../lib/utils';
import { berechneIpsativ } from '../lib/ipsativeAnalyse';
import { PedagogicalTextHelper } from './PedagogicalTextHelper';
import ErrorDetective from './ErrorDetective';
import { EmptyState } from './EmptyState';
import GabicQuest from './GabicQuest';
import LiveDiagnostik from './LiveDiagnostik';
import Markdown from 'react-markdown';
import KlassenScreening from './KlassenScreening';
import { ZahlenspanneTest } from './ZahlenspanneTest';
import { MengenBlitzenTest } from './MengenBlitzenTest';
import { GoNoGoTest } from './GoNoGoTest';
import { askAI, callServerAI } from '../services/aiService';
import {
  getDiagnosticAlert,
  getDiagnosticClassId,
  getDiagnosticDataQuality,
  getDiagnosticTestName,
  getDiagnosticUnitGuidance,
  isDiagnosticAlert,
  upsertByKey,
  validateDiagnosticEntry
} from '../lib/diagnosticData';

const KATEGORIE_COLORS = {
  lesen: 'bg-blue-50 text-blue-600 border-blue-100',
  rechtschreiben: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  mathematik: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  sprache: 'bg-amber-50 text-amber-600 border-amber-100',
  konzentration: 'bg-purple-50 text-purple-600 border-purple-100',
  kognition: 'bg-slate-50 text-slate-600 border-slate-100',
  sonstige: 'bg-slate-50 text-slate-400 border-slate-100'
};

const KATEGORIE_LABELS: Record<string, string> = { lesen: 'Lesen', rechtschreiben: 'Rechtschreiben', mathematik: 'Mathematik', sprache: 'Sprache', konzentration: 'Konzentration', kognition: 'Kognition', verhalten: 'Verhalten', sonstige: 'Sonstige' };

const TEST_TEMPLATES: Omit<DiagnostikTest, 'id'>[] = [
  {
    name: 'SLS (Salzburger Lese-Screening)',
    kategorie: 'lesen',
    kurzbeschreibung: 'Erfasst die basale Lesefertigkeit (Lesegeschwindigkeit) zur Früherkennung von Leseschwächen.',
    einheit: 'prozentrang',
    schwellenwert: 16,
    schwellenrichtung: 'unter',
    schulstufen: [1, 2, 3, 4]
  },
  {
    name: 'iKMPLUS (Deutsch Lesen)',
    kategorie: 'lesen',
    kurzbeschreibung: 'Individuelle Kompetenzmessung PLUS: Ergebnisse aus der offiziellen IQS-Rückmeldung dokumentieren und pädagogisch reflektieren.',
    einheit: 'prozentrang',
    schwellenwert: 25,
    schwellenrichtung: 'unter',
    schulstufen: [3, 4]
  },
  {
    name: 'iKMPLUS (Mathematik)',
    kategorie: 'mathematik',
    kurzbeschreibung: 'Individuelle Kompetenzmessung PLUS: Ergebnisse aus der offiziellen IQS-Rückmeldung dokumentieren und pädagogisch reflektieren.',
    einheit: 'prozentrang',
    schwellenwert: 25,
    schwellenrichtung: 'unter',
    schulstufen: [3, 4]
  },
  {
    name: 'Hamburger Schreib-Probe (HSP)',
    kategorie: 'rechtschreiben',
    kurzbeschreibung: 'Erfasst die grundlegenden Rechtschreibstrategien zur Feststellung des orthografischen Entwicklungsstands.',
    einheit: 'prozentrang',
    schwellenwert: 16,
    schwellenrichtung: 'unter',
    schulstufen: [1, 2, 3, 4]
  },
  {
    name: 'DEMAT (Deutscher Mathematiktest)',
    kategorie: 'mathematik',
    kurzbeschreibung: 'Schulleistungstest zur Erfassung der Rechenleistung (orientiert am Lehrplan).',
    einheit: 'tWert',
    schwellenwert: 40,
    schwellenrichtung: 'unter',
    schulstufen: [1, 2, 3, 4]
  },
  {
    name: 'Zahlenzorro (Rechentest)',
    kategorie: 'mathematik',
    kurzbeschreibung: 'Informelle schulische Lernstandsprobe. Der Schwellenwert muss an Aufgabenanzahl, Schulstufe und verwendetes Material angepasst werden.',
    einheit: 'punkte',
    schwellenwert: 10,
    schwellenrichtung: 'unter',
    schulstufen: [1, 2, 3, 4]
  },
  {
    name: 'D2-R (Aufmerksamkeits-Belastungs-Test)',
    kategorie: 'konzentration',
    kurzbeschreibung: 'Ergebnisse eines extern durchgeführten d2-R dokumentieren. Nur mit Originalmaterial, standardisierter Durchführung und altersbezogener Norm auswerten.',
    einheit: 'prozentrang',
    schwellenwert: 16,
    schwellenrichtung: 'unter',
    schulstufen: [4]
  }
];

import { InteractionLogView } from './InteractionLogView';
import { MetakognitionView } from './MetakognitionView';
import { InteractionModal } from './InteractionModal';

const Diagnostik: React.FC<{ onBackToNew?: () => void }> = ({ onBackToNew }) => {
  const { app, setApp, setPage } = useApp();
  const [activeTab, setActiveTab] = useState<'uebersicht' | 'katalog' | 'eintragen' | 'verlaeufe' | 'ikm' | 'detective' | 'gabicquest' | 'liveDiagnostik' | 'klassenscreening' | 'ipsativ' | 'exekutiv' | 'interaktion' | 'metakognition' | 'antolin' | 'ziele'>('uebersicht');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [diagnostikMode, setDiagnostikMode] = useState<'einfach' | 'experte'>('einfach');
  const [showStudentRawDetails, setShowStudentRawDetails] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [interactionPresetId, setInteractionPresetId] = useState<string | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<Partial<DiagnostikTest> | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [batchEntry, setBatchEntry] = useState<Record<string, { rohwert: string, ergebniswert: string, kommentar: string }>>({});
  const [batchMeta, setBatchMeta] = useState({ datum: formatLocalDateKey(new Date()), schulstufe: app.stufe, durchgefuehrtVon: 'Lehrperson' });
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>('class-overview');
  const [classChartSelectedTestId, setClassChartSelectedTestId] = useState<string>('live-lesefluessigkeit');
  const [classChartOverlayStudents, setClassChartOverlayStudents] = useState<string[]>([]);
  const [singleStudentCompareIds, setSingleStudentCompareIds] = useState<string[]>([]);
  const [showThresholdLine, setShowThresholdLine] = useState<boolean>(true);
  const [customTargetVal, setCustomTargetVal] = useState<number | ''>('');
  const [showClassAvgLine, setShowClassAvgLine] = useState<boolean>(false);
  const [printMode, setPrintMode] = useState<'class' | 'student' | null>(null);
  const [subtabKlassenAnalyse, setSubtabKlassenAnalyse] = useState<'screening' | 'antolin'>('screening');
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | 'quarter' | 'schoolyear'>('all');
  const [diagnostikViewMode, setDiagnostikViewMode] = useState<'chart' | 'table'>('chart');
  const [tableSearch, setTableSearch] = useState<string>('');
  const [studentTableTestFilter, setStudentTableTestFilter] = useState<string>('all');
  const [trendListFilter, setTrendListFilter] = useState<'all' | 'improved' | 'worsened' | 'stable'>('all');
  const [trendListSubj, setTrendListSubj] = useState<'all' | 'deutsch' | 'mathematik' | 'sachunterricht'>('all');
  
  const [textHelperOpen, setTextHelperOpen] = useState(false);
  const [textHelperInitial, setTextHelperInitial] = useState('');
  const [textHelperTarget, setTextHelperTarget] = useState<{ studentId: string, ikmId: string } | null>(null);
  const [isGeneratingPath, setIsGeneratingPath] = useState<string | null>(null);

  const [ikmUploadState, setIkmUploadState] = useState<{
    schuelerId: string;
    datum: string;
    schuljahr: string;
    schulstufe: number;
    deutschLesenPR?: string;
    deutschZuhoerenPR?: string;
    deutschSprachbewusstseinPR?: string;
    mathematikPR?: string;
    pdfInhalt?: string;
    pdfName?: string;
    kommentar?: string;
  } | null>(null);

  const [antolinUploadRawText, setAntolinUploadRawText] = useState('');
  const [antolinSelectedStudentId, setAntolinSelectedStudentId] = useState<string>('all');
  const [antolinUploadDate, setAntolinUploadDate] = useState(formatLocalDateKey(new Date()));
  const [isAnalyzingAntolin, setIsAnalyzingAntolin] = useState(false);
  const [antolinAnalysisPreview, setAntolinAnalysisPreview] = useState<any[] | null>(null);
  
  const [manualAntolinStudentId, setManualAntolinStudentId] = useState('');
  const [manualAntolinBooks, setManualAntolinBooks] = useState('');
  const [manualAntolinPoints, setManualAntolinPoints] = useState('');
  const [manualAntolinLeistung, setManualAntolinLeistung] = useState('');
  const [manualAntolinSchwierigkeit, setManualAntolinSchwierigkeit] = useState('');

  // States for Goal-Diagnostic (Ziele)
  const [goalStudentId, setGoalStudentId] = useState('');
  const [goalBereich, setGoalBereich] = useState<'schule' | 'leben'>('schule');
  const [goalText, setGoalText] = useState('');
  const [goalDate, setGoalDate] = useState(formatLocalDateKey(new Date()));
  const [isRefiningGoal, setIsRefiningGoal] = useState(false);
  const [goalFilterStudentId, setGoalFilterStudentId] = useState('all');
  const [goalFilterStatus, setGoalFilterStatus] = useState<'all' | 'aktiv' | 'erreicht' | 'verworfen'>('all');

  // States for AI IKM Import
  const [isAiImporting, setIsAiImporting] = useState(false);
  const [aiImportError, setAiImportError] = useState<string | null>(null);
  const [aiImportFile, setAiImportFile] = useState<File | null>(null);

  // Exekutive form states
  const [exeStudentId, setExeStudentId] = useState<string>('');
  const [exeDate, setExeDate] = useState<string>(formatLocalDateKey(new Date()));
  const [exeKontext, setExeKontext] = useState<string>('Plenum');
  const [exeScores, setExeScores] = useState({ arbeitsgedaechtnis: 5, inhibition: 5, flexibilitaet: 5, aktivierung: 5, emotionen: 5 });
  const [exeComment, setExeComment] = useState<string>('');

  // Ipsativ view state
  const [ipsativStudentId, setIpsativStudentId] = useState<string>('');
  
  // Exekutive Submit Handler
  const handleSaveExekutiv = () => {
    if (!exeStudentId || !(app.schueler || []).some(student => student.id === exeStudentId)) {
      return alert('Bitte ein Kind aus der aktuellen Klasse wählen.');
    }
    const auffaellig = Object.values(exeScores).some(value => value < 3);
    const newErhebung: DiagnostikErhebung = {
      id: crypto.randomUUID(),
      schuelerId: exeStudentId,
      testId: 'exekutiv_1', 
      datum: exeDate,
      schuljahr: app.schuljahr,
      schulstufe: app.stufe,
      rohwert: 0,
      ergebniswert: 0,
      kommentar: exeComment,
      durchgefuehrtVon: 'Lehrperson',
      foerderbedarfErkannt: false,
      auffaelligkeitErkannt: auffaellig,
      classId: getDiagnosticClassId(app),
      quelle: 'beobachtung',
      type: 'exekutiv',
      meta: {
        kontext: exeKontext,
        ...exeScores
      }
    };
    const validation = validateDiagnosticEntry(app, newErhebung);
    if (!validation.valid) return alert(`Erhebung kann nicht gespeichert werden:\n${validation.errors.join('\n')}`);
    setApp(prev => ({
      ...prev,
      diagnostikErhebungen: upsertByKey(
        prev.diagnostikErhebungen || [],
        [newErhebung],
        entry => `${entry.schuelerId}|${entry.testId}|${entry.datum}`
      )
    }));
    setExeScores({ arbeitsgedaechtnis: 5, inhibition: 5, flexibilitaet: 5, aktivierung: 5, emotionen: 5 });
    setExeComment('');
    alert(auffaellig
      ? 'Beobachtung gespeichert. Ein Wert liegt im Prüfbereich und sollte pädagogisch eingeordnet werden.'
      : 'Beobachtung wurde im Verlauf des Kindes gespeichert.');
  };

  const [aiImportPreview, setAiImportPreview] = useState<Array<{
    studentNumber: number;
    studentNameConfirmed?: string;
    mappedStudentId?: string;
    mappedStudentName?: string;
    deutschLesenPR?: number;
    deutschZuhoerenPR?: number;
    deutschSprachbewusstseinPR?: number;
    mathematikPR?: number;
    kommentar?: string;
    diagnoseStaerken?: string;
    diagnoseHerausforderungen?: string;
    matheDetails?: {
      zahlen?: number;
      operationen?: number;
      groessen?: number;
      ebeneRaum?: number;
      modellieren?: number;
      operieren?: number;
      kommunizieren?: number;
      problemloesen?: number;
    };
    shouldImport: boolean;
  }> | null>(null);

  // Exekutive History
  const exeHistory = useMemo(() => {
    if (!exeStudentId) return [];
    return (app.diagnostikErhebungen || []).filter(e => e.type === 'exekutiv' && e.schuelerId === exeStudentId).sort((a, b) => b.datum.localeCompare(a.datum));
  }, [app.diagnostikErhebungen, exeStudentId]);

  // Ipsativ Calculation
  const ipsativeResults = useMemo(() => {
    if (activeTab !== 'ipsativ' || !ipsativStudentId) return null;
    const userNotes: {wert: number, datum: string, fach: string}[] = [];
    if (app.noten && app.noten[ipsativStudentId]) {
      for (const fachId in app.noten[ipsativStudentId]) {
        for (const sem in app.noten[ipsativStudentId][fachId]) {
          const g = app.noten[ipsativStudentId][fachId][sem];
          if (!g) continue;
          
          const mapList = (arr: any[], prefix: string) => {
            if (Array.isArray(arr)) {
              arr.forEach((v, idx) => {
                if (typeof v === 'number') {
                  userNotes.push({ wert: v, datum: `${sem} ${prefix} ${idx+1}`, fach: fachId });
                }
              });
            }
          };
          mapList(g.sa, 'SA');
          mapList(g.lzk, 'LZK');
          mapList(g.wp, 'WP');
        }
      }
    }
    return berechneIpsativ(userNotes, app.ipsativeGewichtung ?? 70);
  }, [activeTab, ipsativStudentId, app.noten, app.ipsativeGewichtung]);

  const ikmRecords = useMemo(() => app.ikmRecords || [], [app.ikmRecords]);

  const { avgRead, avgListen, avgLanguage, avgMath } = useMemo(() => {
    const calcAvg = (key: 'deutschLesenPR' | 'deutschZuhoerenPR' | 'deutschSprachbewusstseinPR' | 'mathematikPR') => {
      const validScores = ikmRecords
        .map((r: any) => r[key])
        .filter((v: any) => typeof v === 'number' && !isNaN(v));
      if (validScores.length === 0) return 0;
      return Math.round((validScores.reduce((a: number, b: number) => a + b, 0) / validScores.length) * 10) / 10;
    };
    return {
      avgRead: calcAvg('deutschLesenPR'),
      avgListen: calcAvg('deutschZuhoerenPR'),
      avgLanguage: calcAvg('deutschSprachbewusstseinPR'),
      avgMath: calcAvg('mathematikPR'),
    };
  }, [ikmRecords]);

  const generateLernpfad = async (studentId: string, ikmData: any) => {
    setIsGeneratingPath(studentId);
    try {
      const responseText = await askAI('ki-lernpfad', `Erstelle einen Lernpfad basierend auf diesen Daten: ${JSON.stringify(ikmData)}`);
      if (responseText) {
        let cleanText = responseText.trim();
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.substring(7);
        }
        if (cleanText.endsWith('```')) {
          cleanText = cleanText.substring(0, cleanText.length - 3);
        }
        cleanText = cleanText.trim();
        const pathData = JSON.parse(cleanText);
        const newLernpfade = { ...(app.lernpfade || {}), [studentId]: pathData };
        setApp({ ...app, lernpfade: newLernpfade });
      }
    } catch (error) {
      console.error('Lernpfad-Generierung fehlgeschlagen:', error);
    } finally {
      setIsGeneratingPath(null);
    }
  };

  const handleApplyOptimizedText = (text: string) => {
    if (!textHelperTarget) return;
    const { ikmId } = textHelperTarget;
    const newIkmRecords = app.ikmRecords.map((r: any) => 
      r.id === ikmId ? { ...r, kommentar: text } : r
    );
    setApp({ ...app, ikmRecords: newIkmRecords });
    setTextHelperOpen(false);
  };

  const renderMiniComparison = (val: number | undefined, avg: number, colorClass: string, bgClass: string) => {
    if (val === undefined || val === null) {
      return <div className="text-slate-400 text-[0.625rem] font-medium text-center">—</div>;
    }
    
    const maxVal = val > 100 || avg > 100 ? 250 : 100;
    const studentPct = Math.min(100, Math.max(0, (val / maxVal) * 100));
    const avgPct = Math.min(100, Math.max(0, (avg / maxVal) * 100));
    const diff = val - avg;

    return (
      <div className="flex flex-col gap-1 w-full min-w-[120px] select-none text-left font-sans">
        <div className="flex justify-between items-center text-[0.625rem] font-black leading-none">
          <span className="text-slate-900">{val}{val > 100 ? '' : ' PR'}</span>
          <span className={`flex items-center gap-0.5 ${diff >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
            {diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)}
            <TrendingUp size={8} className={diff < 0 ? 'rotate-180' : ''} />
          </span>
        </div>
        
        <div className="relative h-4 w-full flex items-end gap-[1px]">
          <div className="absolute inset-0 border-b border-slate-100 opacity-50" />
          <div className="absolute top-0 bottom-0 w-0.5 bg-slate-400/30 z-10" style={{ left: `${avgPct}%` }} />
          <div className={`h-[70%] rounded-sm opacity-90 transition-all duration-1000 ${colorClass}`} style={{ width: `${studentPct}%` }} />
          <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-600 border border-white z-20" style={{ left: `${avgPct}%` }} />
        </div>
        
        <div className="flex justify-between text-[0.4375rem] text-slate-400 font-bold uppercase tracking-tighter opacity-80">
          <span className="text-slate-500">Ø {avg.toFixed(1)}</span>
          <span>Max {maxVal}</span>
        </div>
      </div>
    );
  };

  const formatIkmScore = (val: number | undefined) => {
    if (val === undefined || val === null) return '--';
    return val > 100 ? `${val} Pkt.` : `${val} PR`;
  };

  const STUDENT_REPORT_AI_DISABLED = true;
  const startAiAnalysis = async (base64: string, fileName: string) => {
    if (STUDENT_REPORT_AI_DISABLED) {
      setAiImportError('Der IKM-KI-Import ist aus Datenschutzgründen vorübergehend deaktiviert. Bitte keine Schülerberichte hochladen.');
      return;
    }
    setIsAiImporting(true);
    setAiImportError(null);
    setAiImportPreview(null);

    const sortedStudents = [...app.schueler].sort((a, b) => {
      const comp = a.nachname.localeCompare(b.nachname, 'de');
      if (comp !== 0) return comp;
      return a.vorname.localeCompare(b.vorname, 'de');
    });

    // B1.5 DATENSCHUTZ: Keine echten Schülernamen oder echten IDs an die KI senden!
    // Stattdessen lokale temporäre Codes (S01, S02...) generieren.
    const localIkmMap = new Map<string, typeof sortedStudents[0]>();
    const studentsPayload = sortedStudents.map((s, idx) => {
      const tempCode = `S${String(idx + 1).padStart(2, '0')}`;
      localIkmMap.set(tempCode, s);
      const studentIndex = s.ikmNummer !== undefined && s.ikmNummer !== null ? Number(s.ikmNummer) : (idx + 1);
      return {
        id: tempCode,
        name: `Kind ${String(idx + 1).padStart(2, '0')}`,
        index: studentIndex
      };
    });

    try {
      const response = await fetch('/api/ai/analyze-ikm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64: base64, students: studentsPayload })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Fehler beim Analysieren des PDFs.');
      }
      const parsed = await response.json();
      const recordsArray = parsed.records || [];
      const preview = recordsArray.map((rec: any) => {
        const mappedStudent = sortedStudents.find((s, idx) => {
          if (s.ikmNummer !== undefined && s.ikmNummer !== null && s.ikmNummer !== 0) {
            return Number(s.ikmNummer) === Number(rec.studentNumber);
          }
          return (idx + 1) === Number(rec.studentNumber);
        }) || (rec.studentId ? localIkmMap.get(rec.studentId) : undefined);
        return {
          studentNumber: rec.studentNumber,
          studentNameConfirmed: mappedStudent ? `${mappedStudent.nachname} ${mappedStudent.vorname}` : (rec.studentNameConfirmed || ''),
          mappedStudentId: mappedStudent?.id || '',
          mappedStudentName: mappedStudent ? `${mappedStudent.nachname} ${mappedStudent.vorname}` : '',
          deutschLesenPR: rec.deutschLesenPR,
          deutschZuhoerenPR: rec.deutschZuhoerenPR,
          deutschSprachbewusstseinPR: rec.deutschSprachbewusstseinPR,
          mathematikPR: rec.mathematikPR,
          kommentar: rec.kommentar || '',
          diagnoseStaerken: rec.diagnoseStaerken || '',
          diagnoseHerausforderungen: rec.diagnoseHerausforderungen || '',
          matheDetails: rec.matheDetails || null,
          shouldImport: !!mappedStudent
        };
      });
      setAiImportPreview(preview);
    } catch (err: any) {
      console.error(err);
      setAiImportError(err.message || 'Die KI-Analyse ist fehlgeschlagen.');
    } finally { setIsAiImporting(false); }
  };

  const handleConfirmAiImport = () => {
    if (!aiImportPreview) return;
    const importedRecords = aiImportPreview
      .filter(p => p.shouldImport && p.mappedStudentId)
      .map(p => ({
        id: crypto.randomUUID(),
        schuelerId: p.mappedStudentId!,
        datum: formatLocalDateKey(new Date()),
        schuljahr: app.schuljahr || '2023/24',
        schulstufe: app.stufe || 3,
        classId: getDiagnosticClassId(app),
        quelle: 'import' as const,
        deutschLesenPR: p.deutschLesenPR,
        deutschZuhoerenPR: p.deutschZuhoerenPR,
        deutschSprachbewusstseinPR: p.deutschSprachbewusstseinPR,
        mathematikPR: p.mathematikPR,
        kommentar: p.kommentar,
        diagnoseStaerken: p.diagnoseStaerken,
        diagnoseHerausforderungen: p.diagnoseHerausforderungen,
        matheDetails: p.matheDetails,
        pdfName: aiImportFile?.name || 'IKM_Klassenanalyse_KI_Import.pdf'
      }));
    if (importedRecords.length === 0) return alert('Keine Datensätze zum Importieren ausgewählt.');
    setApp((prev: any) => {
      const updated = [...(prev.ikmRecords || [])];
      importedRecords.forEach(newRec => {
        const matchIdx = updated.findIndex(r =>
          r.schuelerId === newRec.schuelerId && r.datum === newRec.datum
        );
        if (matchIdx !== -1) {
          updated[matchIdx] = {
            ...updated[matchIdx],
            deutschLesenPR: newRec.deutschLesenPR !== undefined ? newRec.deutschLesenPR : updated[matchIdx].deutschLesenPR,
            deutschZuhoerenPR: newRec.deutschZuhoerenPR !== undefined ? newRec.deutschZuhoerenPR : updated[matchIdx].deutschZuhoerenPR,
            deutschSprachbewusstseinPR: newRec.deutschSprachbewusstseinPR !== undefined ? newRec.deutschSprachbewusstseinPR : updated[matchIdx].deutschSprachbewusstseinPR,
            mathematikPR: newRec.mathematikPR !== undefined ? newRec.mathematikPR : updated[matchIdx].mathematikPR,
            kommentar: newRec.kommentar ? (updated[matchIdx].kommentar ? `${updated[matchIdx].kommentar}\n${newRec.kommentar}` : newRec.kommentar) : updated[matchIdx].kommentar,
            diagnoseStaerken: newRec.diagnoseStaerken !== undefined && newRec.diagnoseStaerken !== "" ? newRec.diagnoseStaerken : updated[matchIdx].diagnoseStaerken,
            diagnoseHerausforderungen: newRec.diagnoseHerausforderungen !== undefined && newRec.diagnoseHerausforderungen !== "" ? newRec.diagnoseHerausforderungen : updated[matchIdx].diagnoseHerausforderungen,
            matheDetails: newRec.matheDetails !== undefined && newRec.matheDetails !== null ? newRec.matheDetails : updated[matchIdx].matheDetails,
            pdfName: newRec.pdfName ? (updated[matchIdx].pdfName && !updated[matchIdx].pdfName.includes(newRec.pdfName) ? `${updated[matchIdx].pdfName}, ${newRec.pdfName}` : newRec.pdfName) : updated[matchIdx].pdfName,
            datum: newRec.datum
          };
        } else { updated.push(newRec); }
      });
      return { ...prev, ikmRecords: updated };
    });
    logActivity(setApp, `IKM AI-Import für ${importedRecords.length} Schüler:innen durchgeführt`, 'diagnostik');
    setAiImportPreview(null); setAiImportFile(null);
  };

  const tests = useMemo(() => app.diagnostikTests || [], [app.diagnostikTests]);
  const erhebungen = useMemo(() => {
    const activeStudentIds = new Set((app.schueler || []).map(s => s.id));
    return (app.diagnostikErhebungen || []).filter(e =>
      activeStudentIds.has(e.schuelerId) && validateDiagnosticEntry(app, e).valid
    );
  }, [app]);
  const diagnosticDataQuality = useMemo(() => getDiagnosticDataQuality(app), [app]);
  const sortedStudentsForDiagnostik = useMemo(() => [...(app.schueler || [])].sort((a, b) => a.nachname.localeCompare(b.nachname, 'de')), [app.schueler]);
  
  const computeStudentTrend = useCallback((studentId: string, customSubject?: 'all' | 'deutsch' | 'mathematik' | 'sachunterricht') => {
    const activeSubj = customSubject || trendListSubj;
    
    // 1. Get tests filtered by category/subject
    const filteredTests = tests.filter(test => {
      if (activeSubj === 'all') return true;
      if (activeSubj === 'deutsch') {
        return ['lesen', 'rechtschreiben', 'sprache'].includes(test.kategorie);
      }
      if (activeSubj === 'mathematik') {
        return test.kategorie === 'mathematik';
      }
      // 'sachunterricht' or other categories
      return !['lesen', 'rechtschreiben', 'sprache', 'mathematik'].includes(test.kategorie);
    });
    
    const filteredTestIds = filteredTests.map(t => t.id);

    // 2. Get erhebungen for this student matching filtered test IDs
    const studentErhebungen = erhebungen.filter(e => e.schuelerId === studentId && filteredTestIds.includes(e.testId));
    if (studentErhebungen.length < 2) {
      return { trend: 'none', changePercent: 0, changeStr: '0%', detailsText: 'Zu wenige Daten', scoresArray: [], label: 'Erstmessung' };
    }

    // Sort by date ascending
    const sorted = [...studentErhebungen].sort((a, b) => a.datum.localeCompare(b.datum));

    // Take the last 3 entries
    const lastThree = sorted.slice(-3);

    // Map to normalized performance relative to thresholds
    const normalizedScores = lastThree.map(e => {
      const test = tests.find(t => t.id === e.testId);
      if (!test) return { score: e.ergebniswert, valid: false, testName: '', originalVal: e.ergebniswert, einheit: '' };
      
      const threshold = test.schwellenwert || 1;
      let scoreMetric = 1;
      if (test.schwellenrichtung === 'unter') {
        scoreMetric = e.ergebniswert / threshold;
      } else {
        scoreMetric = threshold / (e.ergebniswert || 1);
      }
      return { score: scoreMetric, valid: true, testName: test.name, originalVal: e.ergebniswert, einheit: test.einheit };
    });

    const validScores = normalizedScores.filter(s => s.valid);
    if (validScores.length < 2) {
      return { trend: 'none', changePercent: 0, changeStr: '0%', detailsText: 'Zu wenige Daten', scoresArray: [], label: 'Erstmessung' };
    }

    // Compare oldest and latest of the last three
    const oldest = validScores[0];
    const latest = validScores[validScores.length - 1];

    let change = 0;
    if (oldest.score > 0) {
      change = (latest.score - oldest.score) / oldest.score;
    } else {
      change = latest.score - oldest.score;
    }

    let trend: 'improved' | 'worsened' | 'stable' = 'stable';
    if (change >= 0.05) {
      trend = 'improved';
    } else if (change <= -0.05) {
      trend = 'worsened';
    }

    const changePercentStr = change > 0 ? `+${(change * 100).toFixed(0)}%` : `${(change * 100).toFixed(0)}%`;
    const detailsText = `Letzten 3 Ergebnisse: ${validScores.map(v => `${v.originalVal} ${v.einheit}`).join(' ➡️ ')}`;

    return {
      trend,
      changePercent: change * 100,
      changeStr: changePercentStr,
      detailsText,
      scoresArray: validScores,
      label: trend === 'improved' ? 'verbessert' : trend === 'worsened' ? 'verschlechtert' : 'stabil'
    };
  }, [erhebungen, tests, trendListSubj]);

  const filteredStudentsByTrend = useMemo(() => {
    return sortedStudentsForDiagnostik.filter(student => {
      const trendData = computeStudentTrend(student.id, trendListSubj);
      
      // Filter by trend direction
      if (trendListFilter !== 'all') {
        if (trendData.trend !== trendListFilter) return false;
      }
      
      return true;
    });
  }, [sortedStudentsForDiagnostik, computeStudentTrend, trendListFilter, trendListSubj]);
  const criticalIssues = useMemo(() => erhebungen.filter(isDiagnosticAlert).sort((a,b) => b.datum.localeCompare(a.datum)).slice(0, 10), [erhebungen]);

  const criticalStudentsCount = useMemo(() => {
    const alertedIds = new Set<string>();
    (criticalIssues || []).forEach(issue => alertedIds.add(issue.schuelerId));
    (sortedStudentsForDiagnostik || []).forEach(s => {
      const studentEntries = (erhebungen || []).filter(e => e.schuelerId === s.id);
      if (studentEntries.some(e => isDiagnosticAlert(e))) alertedIds.add(s.id);
    });
    return alertedIds.size;
  }, [criticalIssues, sortedStudentsForDiagnostik, erhebungen]);

  const openGoalsCountClass = useMemo(() => {
    let count = 0;
    (sortedStudentsForDiagnostik || []).forEach(s => {
      const prof = s.foerderprofil || {};
      const profGoals = (prof.foerderziele || []).filter((g: any) => g.status === 'offen' || g.status === 'in Arbeit').length;
      const schuelerGoals = ((app as any).schuelerGoals || []).filter((lz: any) => lz.schuelerId === s.id && lz.status !== 'erreicht').length;
      count += profGoals + schuelerGoals;
    });
    return count;
  }, [sortedStudentsForDiagnostik, app]);

  const positiveDevCount = useMemo(() => {
    let count = 0;
    (sortedStudentsForDiagnostik || []).forEach(s => {
      const trend = computeStudentTrend(s.id);
      if (trend?.trend === 'improved') count++;
    });
    return count;
  }, [sortedStudentsForDiagnostik, computeStudentTrend]);

  const sparseDataStudents = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 28);
    const cutoffStr = formatLocalDateKey(thirtyDaysAgo);

    return (sortedStudentsForDiagnostik || []).filter(s => {
      const studentEntries = (erhebungen || []).filter(e => e.schuelerId === s.id);
      if (studentEntries.length < 2) return true;
      const hasRecent = studentEntries.some(e => e.datum >= cutoffStr);
      return !hasRecent;
    });
  }, [sortedStudentsForDiagnostik, erhebungen]);

  const classInsights = useMemo(() => {
    const insights: { type: 'alert' | 'positive' | 'goal' | 'sparse'; studentId: string; studentName: string; text: string; badge: string; badgeColor: string }[] = [];

    (sortedStudentsForDiagnostik || []).forEach(s => {
      const studentEntries = (erhebungen || []).filter(e => e.schuelerId === s.id);
      const lastAlert = studentEntries.find(e => isDiagnosticAlert(e));
      if (lastAlert) {
        const testName = tests.find(t => t.id === lastAlert.testId)?.name || 'Standard-Test';
        insights.push({
          type: 'alert',
          studentId: s.id,
          studentName: `${s.vorname} ${s.nachname}`,
          text: `Ergebnis bei "${testName}" weicht vom Erwartungsbereich ab.`,
          badge: 'Beobachten',
          badgeColor: 'bg-rose-100 text-rose-800 border-rose-200'
        });
      }
    });

    (sortedStudentsForDiagnostik || []).forEach(s => {
      const trend = computeStudentTrend(s.id);
      if (trend?.trend === 'improved') {
        insights.push({
          type: 'positive',
          studentId: s.id,
          studentName: `${s.vorname} ${s.nachname}`,
          text: `Positive Lernentwicklung in den letzten Erhebungen erkennbar.`,
          badge: 'Positive Entwicklung',
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200'
        });
      }
    });

    (sortedStudentsForDiagnostik || []).forEach(s => {
      const prof = s.foerderprofil || {};
      const activeGoals = (prof.foerderziele || []).filter((g: any) => g.status === 'offen' || g.status === 'in Arbeit');
      if (activeGoals.length > 0) {
        const studentEntries = (erhebungen || []).filter(e => e.schuelerId === s.id);
        const recent = studentEntries.find(e => {
          const diff = (new Date().getTime() - new Date(e.datum).getTime()) / (1000 * 3600 * 24);
          return diff <= 28;
        });
        if (!recent) {
          insights.push({
            type: 'goal',
            studentId: s.id,
            studentName: `${s.vorname} ${s.nachname}`,
            text: `Aktives Förderziel "${activeGoals[0].ziel || 'Förderziel'}", aber seit 4 Wochen keine neue Beobachtung.`,
            badge: 'Förderziel offen',
            badgeColor: 'bg-amber-100 text-amber-800 border-amber-200'
          });
        }
      }
    });

    sparseDataStudents.forEach(s => {
      insights.push({
        type: 'sparse',
        studentId: s.id,
        studentName: `${s.vorname} ${s.nachname}`,
        text: `Seit mehr als 4 Wochen keine Diagnostik oder Beobachtung eingetragen.`,
        badge: 'Wenig Daten',
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-200'
      });
    });

    return insights.slice(0, 5);
  }, [sortedStudentsForDiagnostik, erhebungen, sparseDataStudents, computeStudentTrend, tests]);

  const getStudentDiagnosticAlerts = useCallback((studentId: string) => {
    const studentEntries = (erhebungen || []).filter(e => e.schuelerId === studentId);
    const alerts: string[] = [];
    studentEntries.forEach(e => {
      if (isDiagnosticAlert(e)) {
        const testName = tests.find(t => t.id === e.testId)?.name || 'Test';
        alerts.push(`Auffälliger Wert bei ${testName} (${e.datum})`);
      }
    });
    return alerts;
  }, [erhebungen, tests]);

  const getStudentLastObservationDate = useCallback((studentId: string) => {
    const studentEntries = (erhebungen || []).filter(e => e.schuelerId === studentId);
    if (studentEntries.length === 0) return 'Keine Erhebungen';
    const sorted = [...studentEntries].sort((a, b) => b.datum.localeCompare(a.datum));
    return sorted[0].datum;
  }, [erhebungen]);

  const getStudentKeyNotes = useCallback((studentId: string) => {
    const notes: string[] = [];
    const student = (app.schueler || []).find(s => s.id === studentId);
    const studentEntries = (erhebungen || []).filter(e => e.schuelerId === studentId);
    const trend = computeStudentTrend(studentId);

    if (trend?.trend === 'improved') {
      notes.push('Zeigt eine positive Trendentwicklung über die letzten Messungen.');
    } else if (trend?.trend === 'worsened') {
      notes.push('Ergebnisse zeigen einen leichten Abwärtstrend – genauer beobachten.');
    }

    const alerts = getStudentDiagnosticAlerts(studentId);
    if (alerts.length > 0) {
      notes.push(...alerts);
    }

    const prof = student?.foerderprofil || {};
    const activeGoals = (prof.foerderziele || []).filter((g: any) => g.status === 'offen' || g.status === 'in Arbeit');
    if (activeGoals.length > 0) {
      notes.push(`Aktives Förderziel: "${activeGoals[0].ziel}"`);
    }

    if (studentEntries.length < 2) {
      notes.push('Es liegen bisher wenige Erhebungsdaten vor. Weitere Beobachtungen empfohlen.');
    }

    if (notes.length === 0) {
      notes.push('Bisher liegen keine Werte außerhalb der hinterlegten Prüfbereiche; die Einordnung bleibt eine pädagogische Aufgabe.');
    }

    return notes.slice(0, 5);
  }, [erhebungen, app.schueler, computeStudentTrend, getStudentDiagnosticAlerts]);

  const classTrendStats = useMemo(() => {
    let improved = 0;
    let stable = 0;
    let worsened = 0;
    let total = 0;
    
    (app.schueler || []).forEach(s => {
      const data = computeStudentTrend(s.id);
      if (data.trend === 'improved') improved++;
      else if (data.trend === 'stable') stable++;
      else if (data.trend === 'worsened') worsened++;
      if (data.trend !== 'none') total++;
    });
    
    return { improved, stable, worsened, total };
  }, [app.schueler, computeStudentTrend]);

  const renderStudentTrend = useCallback((studentId: string, minimalist = false) => {
    const trendData = computeStudentTrend(studentId);
    
    if (trendData.trend === 'none') {
      if (minimalist) return null;
      return (
        <span 
          className="inline-flex items-center gap-1 text-[0.625rem]/3 font-extrabold text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-2 py-0.5"
          title="Erstmessung: Nur ein Testergebnis vorhanden. Verlauf benötigt mindestens zwei Messergebnisse."
        >
          <span className="text-[8px]">⚪</span>
          <span>Erstmessung</span>
        </span>
      );
    }

    if (trendData.trend === 'improved') {
      return (
        <span 
          className={`inline-flex items-center gap-1 text-[0.625rem]/3 font-extrabold rounded-lg px-2 py-0.5 border transition-all ${
            minimalist 
              ? 'text-emerald-500 bg-transparent border-none p-0 shadow-none' 
              : 'bg-emerald-50 text-emerald-700 border-emerald-150'
          }`}
          title={`Trend: ${trendData.label} - ${trendData.detailsText}`}
        >
          <TrendingUp size={11} className={minimalist ? 'text-emerald-500' : 'text-emerald-600'} />
          {!minimalist && <span>{trendData.label}</span>}
        </span>
      );
    }

    if (trendData.trend === 'worsened') {
      return (
        <span 
          className={`inline-flex items-center gap-1 text-[0.625rem]/3 font-extrabold rounded-lg px-2 py-0.5 border transition-all ${
            minimalist 
              ? 'text-rose-500 bg-transparent border-none p-0 shadow-none' 
              : 'bg-rose-50 text-rose-700 border-rose-150'
          }`}
          title={`Trend: ${trendData.label} - ${trendData.detailsText}`}
        >
          <TrendingDown size={11} className={minimalist ? 'text-rose-500' : 'text-rose-600'} />
          {!minimalist && <span>{trendData.label}</span>}
        </span>
      );
    }

    // Stable
    return (
      <span 
        className={`inline-flex items-center gap-1 text-[0.625rem]/3 font-extrabold rounded-lg px-2 py-0.5 border transition-all ${
          minimalist 
            ? 'text-amber-500 bg-transparent border-none p-0 shadow-none' 
            : 'bg-amber-50 text-amber-700 border-amber-150'
        }`}
        title={`Trend: ${trendData.label} - ${trendData.detailsText}`}
      >
        <ArrowRight size={11} className={minimalist ? 'text-amber-500' : 'text-amber-600'} />
        {!minimalist && <span>{trendData.label}</span>}
      </span>
    );
  }, [computeStudentTrend]);

  const renderStudentSparkline = useCallback((studentId: string) => {
    const trendData = computeStudentTrend(studentId);
    if (!trendData || trendData.trend === 'none' || !trendData.scoresArray || trendData.scoresArray.length < 2) {
      return (
        <span className="text-[9px] text-slate-350 font-black tracking-wider uppercase px-2 py-0.5 bg-slate-50 border border-slate-100/70 rounded-md">Erstmessung</span>
      );
    }
    
    // Normalize scoresArray between 4 and 16 for height
    const scores = trendData.scoresArray.map(s => s.score);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const range = max - min || 1;
    
    const height = 14;
    const width = 36;
    
    const points = scores.map((val, idx) => {
      const x = (idx / (scores.length - 1)) * width;
      // invert Y because SVG 0 is at top
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    }).join(' ');

    let strokeColor = '#f59e0b'; // stable (amber)
    if (trendData.trend === 'improved') strokeColor = '#10b981'; // improved (emerald)
    if (trendData.trend === 'worsened') strokeColor = '#ef4444'; // worsened (rose)
    
    return (
      <div className="flex items-center gap-2" title={`Visueller Trend: ${trendData.detailsText}`}>
        <svg className="overflow-visible" width={width} height={height}>
          <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="#f1f5f9" strokeWidth={1} strokeDasharray="1,1" />
          <polyline
            fill="none"
            stroke={strokeColor}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
          <circle cx={width} cy={height - ((scores[scores.length - 1] - min) / range) * (height - 4) - 2} r={2} fill={strokeColor} />
        </svg>
        <span className={`text-[9px] font-extrabold ${trendData.trend === 'improved' ? 'text-emerald-500' : trendData.trend === 'worsened' ? 'text-rose-500' : 'text-amber-500'}`}>
          {trendData.changeStr}
        </span>
      </div>
    );
  }, [computeStudentTrend]);

  const [gradeTransferTarget, setGradeTransferTarget] = useState<{
    entry: DiagnostikErhebung;
    test: DiagnostikTest;
  } | null>(null);

  const [transGradesForm, setTransGradesForm] = useState({
    fach: 'Deutsch',
    sem: '1. Semester',
    typ: 'lzk' as 'lzk' | 'wp' | 'obj' | 'sa',
    idx: -1,
    grade: '3',
    kommentar: ''
  });

  const previousEntries = useMemo(() => {
    if (!gradeTransferTarget) return [];
    const { entry } = gradeTransferTarget;
    return erhebungen
      .filter(e => e.schuelerId === entry.schuelerId && e.testId === entry.testId && e.datum < entry.datum)
      .sort((a, b) => b.datum.localeCompare(a.datum));
  }, [gradeTransferTarget, erhebungen]);

  const recommendedGrade = useMemo(() => {
    if (!gradeTransferTarget) return '3';
    const { entry, test } = gradeTransferTarget;
    const val = entry.ergebniswert;
    const th = test.schwellenwert;
    const past = previousEntries[0]?.ergebniswert;
    
    let baseGrade = 3;
    if (test.schwellenrichtung === 'unter') {
      if (val < th) {
        baseGrade = val < th * 0.7 ? 5 : 4;
      } else {
        if (val >= th * 1.5) baseGrade = 1;
        else if (val >= th * 1.2) baseGrade = 2;
        else baseGrade = 3;
      }
    } else {
      if (val > th) {
        baseGrade = val > th * 1.3 ? 5 : 4;
      } else {
        if (val <= th * 0.5) baseGrade = 1;
        else if (val <= th * 0.8) baseGrade = 2;
        else baseGrade = 3;
      }
    }
    
    if (past !== undefined) {
      let improved = false;
      let percentImprovement = 0;
      if (test.schwellenrichtung === 'unter') {
        improved = val > past;
        if (past > 0) percentImprovement = ((val - past) / past) * 100;
      } else {
        improved = val < past;
        if (val > 0) percentImprovement = ((past - val) / val) * 100;
      }
      
      if (improved && percentImprovement >= 20) {
        baseGrade = Math.max(1, baseGrade - 1);
      }
    }
    
    return String(baseGrade);
  }, [gradeTransferTarget, previousEntries]);

  // Synchronize dynamic default form options when a new target is set
  React.useEffect(() => {
    if (gradeTransferTarget) {
      const { test, entry } = gradeTransferTarget;
      
      let defaultFach = 'Deutsch';
      const cat = test.kategorie?.toLowerCase() || '';
      if (cat.includes('les') || cat.includes('schreib') || cat.includes('sprach') || cat.includes('phon')) {
        defaultFach = 'Deutsch';
      } else if (cat.includes('math') || cat.includes('rechen') || cat.includes('meng') || cat.includes('zahl')) {
        defaultFach = 'Mathematik';
      } else {
        defaultFach = 'Sachunterricht';
      }
      
      setTransGradesForm({
        fach: defaultFach,
        sem: '1. Semester',
        typ: 'lzk',
        idx: -1,
        grade: recommendedGrade,
        kommentar: `Diagnostik-Abgleich: Leistung im Test "${test.name}" (${entry.ergebniswert} ${test.einheit})`
      });
    }
  }, [gradeTransferTarget, recommendedGrade]);

  const handleTransferToGradebook = () => {
    if (!gradeTransferTarget) return;
    const { entry, test } = gradeTransferTarget;
    const { fach, sem, typ, idx, grade, kommentar } = transGradesForm;
    
    const sid = entry.schuelerId;
    const numericGrade = parseFloat(grade.replace(',', '.'));
    if (isNaN(numericGrade) || numericGrade < 1 || numericGrade > 5) {
      alert('Bitte wähle eine gültige Note zwischen 1 und 5.');
      return;
    }
    
    setApp(prev => {
      const sidData = prev.noten[sid] || {};
      const fachData = sidData[fach] || {};
      const semData: any = fachData[sem] || { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] };
      
      const stateKey = typ === 'obj' ? 'aufgaben' : typ;
      const currentArray = [...(semData[stateKey] || [])];
      
      let newNotenMeta = prev.notenMeta ? { ...prev.notenMeta } : {};
      let targetIdx = idx;
      
      if (idx === -1) {
        const currentFachMeta = { ...(newNotenMeta[fach] || {}) };
        const counts = { ...(currentFachMeta.colCounts || { lzk: 4, wp: 4, obj: 4 }) };
        
        if (typ !== 'sa') {
          const nextColCount = (counts[typ] || 0) + 1;
          targetIdx = (counts[typ] || 0);
          
          newNotenMeta[fach] = {
            ...currentFachMeta,
            colCounts: {
              ...counts,
              [typ]: nextColCount
            }
          };
        } else {
          const nextSaCount = (currentFachMeta.saCount ?? 4) + 1;
          targetIdx = (currentFachMeta.saCount ?? 4);
          
          newNotenMeta[fach] = {
            ...currentFachMeta,
            saCount: nextSaCount
          };
        }
      }
      
      currentArray[targetIdx] = numericGrade;
      
      const nextNoten = {
        ...prev.noten,
        [sid]: {
          ...sidData,
          [fach]: {
            ...fachData,
            [sem]: {
              ...semData,
              [stateKey]: currentArray
            }
          }
        }
      };
      
      return {
        ...prev,
        noten: nextNoten,
        notenMeta: newNotenMeta
      };
    });
    
    const student = app.schueler.find(s => s.id === sid);
    if (student) {
      logActivity(setApp, `Diagnostik-Abgleich: Note ${numericGrade} für ${student.vorname} ${student.nachname} im Fach ${fach} (${typ.toUpperCase()}) eingetragen`, 'note', sid);
      try {
        window.dispatchEvent(new CustomEvent('classpet-joy', {
          detail: { 
            message: `Klasse! Das Diagnostik-Ergebnis von ${student.vorname} wurde in die Notenmappe übertragen! 🏆📝` 
          }
        }));
      } catch (e) {}
    }
    
    alert(`Die Note ${numericGrade} wurde erfolgreich im Fach ${fach} (${sem}) eingetragen!`);
    setGradeTransferTarget(null);
  };

  const filterDates = useCallback((datumStr: string, filterType: 'all' | 'month' | 'quarter' | 'schoolyear') => {
    if (filterType === 'all') return true;
    const d = new Date(datumStr);
    const today = new Date();
    
    // Normalize time to midnight for clean comparison
    d.setHours(0,0,0,0);
    today.setHours(0,0,0,0);

    if (filterType === 'month') {
      const oneMonthAgo = new Date(today);
      oneMonthAgo.setDate(today.getDate() - 30);
      return d >= oneMonthAgo;
    }
    if (filterType === 'quarter') {
      const oneQuarterAgo = new Date(today);
      oneQuarterAgo.setDate(today.getDate() - 90);
      return d >= oneQuarterAgo;
    }
    if (filterType === 'schoolyear') {
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth(); // 0-indexed, Sep is 8
      let schoolYearStart: Date;
      if (currentMonth >= 8) { // Sep or later
        schoolYearStart = new Date(currentYear, 8, 1);
      } else {
        schoolYearStart = new Date(currentYear - 1, 8, 1);
      }
      schoolYearStart.setHours(0,0,0,0);
      return d >= schoolYearStart;
    }
    return true;
  }, []);

  const handleAddTemplate = (template: DiagnostikTest) => {
    if (tests.some(t => t.id === template.id)) return alert('Bereits vorhanden.');
    setApp(prev => ({ ...prev, diagnostikTests: [...(prev.diagnostikTests || []), template] }));
  };

  const handleSaveTest = () => {
    if (!editingTest?.name || !editingTest?.kategorie) return alert('Fehlende Angaben.');
    const testToSave = { ...editingTest, id: editingTest.id || crypto.randomUUID(), schulstufen: editingTest.schulstufen || [1,2,3,4] } as DiagnostikTest;
    const updated = tests.find(t => t.id === testToSave.id) ? tests.map(t => t.id === testToSave.id ? testToSave : t) : [...tests, testToSave];
    setApp(prev => ({ ...prev, diagnostikTests: updated }));
    setIsTestModalOpen(false); setEditingTest(null);
  };

  const handleDeleteTest = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Diesen Test wirklich aus dem Katalog entfernen? (Vorhandene Erhebungsdaten bleiben erhalten)')) return;
    setApp(prev => ({
      ...prev,
      diagnostikTests: (prev.diagnostikTests || []).filter(t => t.id !== id)
    }));
  };

  const handleDeleteErhebung = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Diese Erhebung wirklich löschen?')) return;
    setApp(prev => ({
      ...prev,
      diagnostikErhebungen: (prev.diagnostikErhebungen || []).filter(erh => erh.id !== id)
    }));
  };

  const handleDeleteIkm = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Dieses IKM-Ergebnis wirklich löschen?')) return;
    setApp(prev => ({
      ...prev,
      ikmRecords: (prev.ikmRecords || []).filter(r => r.id !== id)
    }));
  };

  const handleBatchSave = () => {
    if (!selectedTestId) return alert('Wähle zuerst ein Verfahren.');
    const test = tests.find(t => t.id === selectedTestId);
    if (!test) return;
    const enteredRows = Object.entries(batchEntry).filter(([, data]) =>
      data.rohwert.trim() !== '' || data.ergebniswert.trim() !== '' || data.kommentar.trim() !== ''
    );
    if (enteredRows.length === 0) return alert('Trage mindestens ein vollständiges Ergebnis ein.');

    const newErhebungen: DiagnostikErhebung[] = [];
    const rowErrors: string[] = [];
    enteredRows.forEach(([schuelerId, data]) => {
      const student = (app.schueler || []).find(item => item.id === schuelerId);
      const rawValue = data.rohwert.trim() === '' ? 0 : Number(data.rohwert);
      const resultValue = Number(data.ergebniswert);
      if (!Number.isFinite(rawValue) || !Number.isFinite(resultValue)) {
        rowErrors.push(`${student ? `${student.vorname} ${student.nachname}` : 'Unbekanntes Kind'}: Roh- und Auswertungswert müssen Zahlen sein.`);
        return;
      }
      const entry: DiagnostikErhebung = {
        id: crypto.randomUUID(),
        schuelerId,
        testId: selectedTestId,
        datum: batchMeta.datum,
        schuljahr: app.schuljahr,
        schulstufe: batchMeta.schulstufe,
        rohwert: rawValue,
        ergebniswert: resultValue,
        kommentar: data.kommentar.trim(),
        durchgefuehrtVon: batchMeta.durchgefuehrtVon.trim(),
        foerderbedarfErkannt: false,
        auffaelligkeitErkannt: getDiagnosticAlert(test, resultValue),
        classId: getDiagnosticClassId(app),
        quelle: 'manuell'
      };
      const validation = validateDiagnosticEntry(app, entry);
      if (!validation.valid) {
        rowErrors.push(`${student ? `${student.vorname} ${student.nachname}` : 'Unbekanntes Kind'}: ${validation.errors.join(' ')}`);
        return;
      }
      newErhebungen.push(entry);
    });

    if (rowErrors.length > 0) {
      return alert(`Bitte korrigiere diese Zeilen:\n\n${rowErrors.join('\n')}`);
    }
    setApp(prev => ({
      ...prev,
      diagnostikErhebungen: upsertByKey(
        prev.diagnostikErhebungen || [],
        newErhebungen,
        entry => `${entry.schuelerId}|${entry.testId}|${entry.datum}`
      )
    }));
    logActivity(setApp, `Diagnostik ${test.name} erfasst`, 'diagnostik', test.id);
    setBatchEntry({}); setSelectedTestId(null);
    alert(`${newErhebungen.length} vollständige Erhebung${newErhebungen.length === 1 ? '' : 'en'} gespeichert. Gleicher Test, gleiches Kind und gleiches Datum werden aktualisiert statt doppelt angelegt.`);
  };

  const handleSaveIkm = () => {
    if (!ikmUploadState) return;
    const studentExists = (app.schueler || []).some(student => student.id === ikmUploadState.schuelerId);
    if (!studentExists) return alert('Bitte ein Kind aus der aktuellen Klasse auswählen.');
    if (!ikmUploadState.datum || ikmUploadState.datum > formatLocalDateKey(new Date())) {
      return alert('Bitte ein gültiges Datum verwenden, das nicht in der Zukunft liegt.');
    }
    const prValues = [
      ikmUploadState.deutschLesenPR,
      ikmUploadState.deutschZuhoerenPR,
      ikmUploadState.deutschSprachbewusstseinPR,
      ikmUploadState.mathematikPR
    ].filter(value => value !== undefined && value !== '');
    if (prValues.length === 0 || prValues.some(value => !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100)) {
      return alert('Mindestens ein gültiger Prozentrang zwischen 0 und 100 ist erforderlich.');
    }
    const newRecord = {
      ...ikmUploadState,
      id: crypto.randomUUID(),
      classId: getDiagnosticClassId(app),
      quelle: 'manuell' as const,
      deutschLesenPR: ikmUploadState.deutschLesenPR === '' ? undefined : Number(ikmUploadState.deutschLesenPR),
      deutschZuhoerenPR: ikmUploadState.deutschZuhoerenPR === '' ? undefined : Number(ikmUploadState.deutschZuhoerenPR),
      deutschSprachbewusstseinPR: ikmUploadState.deutschSprachbewusstseinPR === '' ? undefined : Number(ikmUploadState.deutschSprachbewusstseinPR),
      mathematikPR: ikmUploadState.mathematikPR === '' ? undefined : Number(ikmUploadState.mathematikPR)
    };
    setApp(prev => ({
      ...prev,
      ikmRecords: upsertByKey(
        prev.ikmRecords || [],
        [newRecord],
        record => `${record.schuelerId}|${record.datum}`
      )
    }));
    logActivity(setApp, `IKM Ergebnis für ${getStudentName(newRecord.schuelerId)} erfasst`, 'diagnostik');
    setIkmUploadState(null);
    alert('iKM-Ergebnis gespeichert. Frühere Messzeitpunkte bleiben im Verlauf erhalten.');
  };

  const getStudentName = (id: string) => {
    const s = app.schueler.find(x => x.id === id);
    return s ? `${s.nachname} ${s.vorname}` : 'Unbekannt';
  };

  const getTestName = (id: string) => getDiagnosticTestName(id, tests);

  const startAntolinAnalysis = async (pdfBase64?: string, rawText?: string) => {
    setIsAnalyzingAntolin(true);
    setAntolinAnalysisPreview(null);
    try {
      // B1.5 DATENSCHUTZ: Keine echten Schülernamen oder echten IDs an die KI senden!
      // Erzeuge temporäre Kennungen L01, L02... und maskiere Textdaten lokal vor der Übertragung.
      const localAntolinMap = new Map<string, typeof app.schueler[0]>();
      let sanitizedRawText = rawText || '';

      const sanitizedStudents = (app.schueler || []).map((s, idx) => {
        const tempCode = `L${String(idx + 1).padStart(2, '0')}`;
        localAntolinMap.set(tempCode, s);

        if (sanitizedRawText) {
          const vor = (s.vorname || '').trim();
          const nach = (s.nachname || '').trim();
          if (nach && vor) {
            sanitizedRawText = sanitizedRawText.replace(new RegExp(`\\b${nach}\\s+${vor}\\b`, 'gi'), tempCode);
            sanitizedRawText = sanitizedRawText.replace(new RegExp(`\\b${vor}\\s+${nach}\\b`, 'gi'), tempCode);
          }
          if (nach && nach.length > 2) {
            sanitizedRawText = sanitizedRawText.replace(new RegExp(`\\b${nach}\\b`, 'gi'), tempCode);
          }
        }

        return {
          id: tempCode,
          vorname: tempCode,
          nachname: ''
        };
      });

      const response = await fetch('/api/ai/analyze-antolin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64,
          rawText: sanitizedRawText,
          students: sanitizedStudents
        })
      });
      if (!response.ok) {
        throw new Error('Fehler beim Analysieren des Antolin-Berichts.');
      }
      const data = await response.json();
      if (data && data.records) {
        const mappedRecords = (data.records || []).map((rec: any) => {
          const matchedStudent = localAntolinMap.get(rec.studentId);
          return {
            ...rec,
            studentId: matchedStudent?.id || '',
            studentNameConfirmed: matchedStudent ? `${matchedStudent.nachname} ${matchedStudent.vorname}` : (rec.studentNameConfirmed || '')
          };
        });
        setAntolinAnalysisPreview(mappedRecords);
      } else {
        throw new Error('Keine Schüler-Ergebnisse im Dokument gefunden.');
      }
    } catch (err: any) {
      alert(err.message || 'Fehler beim Analysieren des Antolin-Berichts.');
    } finally {
      setIsAnalyzingAntolin(false);
    }
  };

  const handleUpdatePreviewItem = (index: number, field: string, value: any) => {
    if (!antolinAnalysisPreview) return;
    const updated = [...antolinAnalysisPreview];
    updated[index] = { ...updated[index], [field]: value };
    setAntolinAnalysisPreview(updated);
  };

  const handleConfirmAntolinImport = () => {
    if (!antolinAnalysisPreview) return;
    
    const unmapped = antolinAnalysisPreview.filter(p => !p.studentId);
    if (unmapped.length > 0) {
      if (!confirm(`Es gibt ${unmapped.length} Zeile(n) ohne zugewiesenen Schüler. Diese werden nicht importiert. Fortfahren?`)) {
        return;
      }
    }

    const validPreviews = antolinAnalysisPreview.filter(preview =>
      preview.studentId && (app.schueler || []).some(student => student.id === preview.studentId)
    );
    if (validPreviews.length === 0) {
      alert('Keine gültigen Schüler-Zuordnungen vorhanden.');
      return;
    }
    
    if (!antolinUploadDate || antolinUploadDate > formatLocalDateKey(new Date())) {
      return alert('Bitte ein gültiges Importdatum verwenden, das nicht in der Zukunft liegt.');
    }
    const hasInvalidValues = validPreviews.some(preview => {
      const values = [preview.anzahlBuecher, preview.punkte, preview.leistung, preview.schwierigkeit].map(Number);
      return values.some(value => !Number.isFinite(value) || value < 0) || values[2] > 100;
    });
    if (hasInvalidValues) return alert('Bitte prüfe die importierten Werte. Zahlen dürfen nicht negativ sein; die Leistung muss zwischen 0 und 100 liegen.');

    const newRecords = validPreviews.map(preview => ({
      id: crypto.randomUUID(),
      schuelerId: preview.studentId,
      datum: antolinUploadDate,
      schuljahr: app.schuljahr || '2025/2026',
      classId: getDiagnosticClassId(app),
      quelle: 'import' as const,
      anzahlBuecher: Number(preview.anzahlBuecher),
      punkte: Number(preview.punkte),
      leistung: Number(preview.leistung),
      schwierigkeit: Number(preview.schwierigkeit)
    }));

    setApp((prev: any) => ({
      ...prev,
      antolinRecords: upsertByKey(
        prev.antolinRecords || [],
        newRecords,
        record => `${record.schuelerId}|${record.datum}`
      )
    }));

    setAntolinAnalysisPreview(null);
    setAntolinUploadRawText('');
    alert(`${newRecords.length} Antolin-Einträge wurden erfolgreich importiert und gespeichert!`);
  };

  const antolinClassStats = useMemo(() => {
    const activeStudentIds = new Set((app.schueler || []).map(s => s.id));
    const classRecords = (app.antolinRecords || []).filter(r => activeStudentIds.has(r.schuelerId));

    const latestRecordsByStudent: Record<string, any> = {};
    classRecords.forEach(r => {
      const existing = latestRecordsByStudent[r.schuelerId];
      if (!existing || r.datum.localeCompare(existing.datum) > 0) {
        latestRecordsByStudent[r.schuelerId] = r;
      }
    });

    const latestRecords = Object.values(latestRecordsByStudent);
    const totalBooks = latestRecords.reduce((sum, r) => sum + r.anzahlBuecher, 0);
    const totalPoints = latestRecords.reduce((sum, r) => sum + r.punkte, 0);
    const avgLeistung = latestRecords.length ? (latestRecords.reduce((sum, r) => sum + r.leistung, 0) / latestRecords.length).toFixed(1) : '0';
    const avgSchwierigkeit = latestRecords.length ? (latestRecords.reduce((sum, r) => sum + r.schwierigkeit, 0) / latestRecords.length).toFixed(1) : '0';

    const classChartData = (app.schueler || []).map(student => {
      const rec = latestRecordsByStudent[student.id] || { anzahlBuecher: 0, punkte: 0, leistung: 0, schwierigkeit: 0 };
      return {
        name: student.vorname,
        fullName: `${student.vorname} ${student.nachname}`,
        id: student.id,
        books: rec.anzahlBuecher,
        points: rec.punkte,
        success: rec.leistung,
        difficulty: rec.schwierigkeit
      };
    }).sort((a, b) => b.points - a.points);

    return { totalBooks, totalPoints, avgLeistung, avgSchwierigkeit, classChartData, hasData: latestRecords.length > 0 };
  }, [app.antolinRecords, app.schueler]);

  const antolinTimelineData = useMemo(() => {
    const activeStudentIds = new Set((app.schueler || []).map(s => s.id));
    const datesSet = new Set<string>();
    const recordsByStudentAndDate: Record<string, Record<string, any>> = {};
    const records = (app.antolinRecords || []).filter(r => activeStudentIds.has(r.schuelerId));
    
    records.forEach(r => {
      datesSet.add(r.datum);
      if (!recordsByStudentAndDate[r.schuelerId]) {
        recordsByStudentAndDate[r.schuelerId] = {};
      }
      recordsByStudentAndDate[r.schuelerId][r.datum] = r;
    });

    const dates = Array.from(datesSet).sort();

    // Class Timeline
    const classTimeline = dates.map((date, idx) => {
      let booksTotal = 0;
      let pointsTotal = 0;
      (app.schueler || []).forEach(s => {
        // use record on this date, or if not found, use latest record before this date?
        // Antolin data is cumulative, so if a student didn't get uploaded this time, we probably want their previous total,
        // but simplest is just what's in the records for that date (assuming teacher uploads full class each time)
        const rec = recordsByStudentAndDate[s.id]?.[date];
        if (rec) {
          booksTotal += rec.anzahlBuecher;
          pointsTotal += rec.punkte;
        }
      });
      
      // Calculate diffs
      let booksDiff = 0;
      let pointsDiff = 0;
      if (idx > 0) {
        let prevBooksTotal = 0;
        let prevPointsTotal = 0;
        (app.schueler || []).forEach(s => {
          const rec = recordsByStudentAndDate[s.id]?.[dates[idx-1]];
          if (rec) {
            prevBooksTotal += rec.anzahlBuecher;
            prevPointsTotal += rec.punkte;
          }
        });
        booksDiff = booksTotal - prevBooksTotal;
        pointsDiff = pointsTotal - prevPointsTotal;
      }

      return {
        date,
        formattedDate: new Date(date).toLocaleDateString('de-DE', { month: 'short', day: 'numeric', year: 'numeric' }),
        books: booksTotal,
        points: pointsTotal,
        booksDiff,
        pointsDiff
      };
    });

    // Student Timelines
    const studentTimelines = (app.schueler || []).map(student => {
      const studentRecords = dates.map((date, idx) => {
        const rec = recordsByStudentAndDate[student.id]?.[date];
        
        let booksDiff = 0;
        let pointsDiff = 0;
        if (idx > 0) {
           const prevRec = recordsByStudentAndDate[student.id]?.[dates[idx-1]];
           if (rec && prevRec) {
             booksDiff = rec.anzahlBuecher - prevRec.anzahlBuecher;
             pointsDiff = rec.punkte - prevRec.punkte;
           } else if (rec && !prevRec) {
             booksDiff = rec.anzahlBuecher;
             pointsDiff = rec.punkte;
           }
        } else if (idx === 0 && rec) {
           booksDiff = rec.anzahlBuecher;
           pointsDiff = rec.punkte;
        }

        return {
          date,
          formattedDate: new Date(date).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' }),
          books: rec ? rec.anzahlBuecher : 0,
          points: rec ? rec.punkte : 0,
          booksDiff,
          pointsDiff,
          hasRecord: !!rec
        };
      }).filter(r => r.hasRecord); // only keep dates where they have records, or keep all to show flat line? Keep all for consistent x-axis.

      return {
        id: student.id,
        name: student.vorname,
        fullName: `${student.vorname} ${student.nachname}`,
        timeline: studentRecords
      };
    });

    return { classTimeline, studentTimelines, dates };
  }, [app.antolinRecords, app.schueler]);

  const handleAddManualAntolin = () => {
    if (!manualAntolinStudentId || !(app.schueler || []).some(student => student.id === manualAntolinStudentId)) {
      alert('Bitte ein Kind aus der aktuellen Klasse auswählen.');
      return;
    }
    const values = [manualAntolinBooks, manualAntolinPoints, manualAntolinLeistung, manualAntolinSchwierigkeit].map(Number);
    if (!antolinUploadDate || antolinUploadDate > formatLocalDateKey(new Date())) {
      return alert('Bitte ein gültiges Datum verwenden, das nicht in der Zukunft liegt.');
    }
    if (values.some(value => !Number.isFinite(value) || value < 0) || values[2] > 100) {
      return alert('Bitte alle Werte vollständig und gültig eingeben. Die Leistung muss zwischen 0 und 100 liegen.');
    }

    const newRecord = {
      id: crypto.randomUUID(),
      schuelerId: manualAntolinStudentId,
      datum: antolinUploadDate,
      schuljahr: app.schuljahr || '2025/2026',
      classId: getDiagnosticClassId(app),
      quelle: 'manuell' as const,
      anzahlBuecher: values[0],
      punkte: values[1],
      leistung: values[2],
      schwierigkeit: values[3]
    };

    setApp((prev: any) => ({
      ...prev,
      antolinRecords: upsertByKey(
        prev.antolinRecords || [],
        [newRecord],
        record => `${record.schuelerId}|${record.datum}`
      )
    }));

    // Reset single manual input
    setManualAntolinStudentId('');
    setManualAntolinBooks('');
    setManualAntolinPoints('');
    setManualAntolinLeistung('');
    setManualAntolinSchwierigkeit('');
    alert('Antolin-Stand gespeichert. Ein vorhandener Eintrag desselben Tages wurde aktualisiert.');
  };

  const handleDeleteAntolinRecord = (id: string) => {
    if (!confirm('Diesen Antolin-Eintrag wirklich löschen?')) return;
    setApp((prev: any) => ({
      ...prev,
      antolinRecords: (prev.antolinRecords || []).filter((r: any) => r.id !== id)
    }));
  };

  const [showGuide, setShowGuide] = useState(false);

  const getGuideContent = () => {
    switch (activeTab as string) {
      case 'ipsativ': return {
        title: "Lernentwicklung (ipsativ)",
        tag: "Individuelle Fortschritte",
        description: "Hier vergleichen wir das Kind nicht mit der Klasse oder einer Norm, sondern nur mit sich selbst. Das ist besonders motivierend für Kinder mit Förderbedarf, da auch kleine Fortschritte sichtbar werden.",
        tipp: "Nutzen Sie diese Kurven für Elterngespräche, um zu zeigen: 'Dein Kind lernt, auch wenn die Note noch nicht bei 1 ist.'"
      };
      case 'exekutiv': return {
        title: "Exekutive Funktionen",
        tag: "Lern-Voraussetzungen",
        description: "Das sind die 'Manager im Gehirn'. Dazu gehören Arbeitsgedächtnis (Sachen merken), Inhibition (Impulse kontrollieren) und Flexibilität (umschalten können).",
        tipp: "Wenn ein Kind trotz Motivation nicht lernt, liegt es oft an diesen Basisfunktionen. Hier dokumentieren Sie Beobachtungen aus dem Unterricht."
      };
      case 'klassenscreening': return {
        title: "Basis-Check (Klasse)",
        tag: "Schnell-Überblick",
        description: "Ein systematisches Raster, um die gesamte Klasse auf grundlegende Fertigkeiten zu prüfen. So geht kein Kind im Trubel unter.",
        tipp: "Füllen Sie das Raster nach einer Beobachtungsphase aus. Markierte Felder sind Hinweise für eine pädagogische Prüfung und weitere Beobachtung."
      };
      case 'gabicquest': return {
        title: "Klassio Quest 🎮",
        tag: "Spielerische Lernstandserhebung",
        description: "Kinder erleben hier ein Abenteuer. Dabei werden Aufgaben zu mathematischen und sprachlichen Kompetenzen in einer spielerischen Form angeboten.",
        tipp: "Die Ergebnisse können standardisierte Beobachtungen ergänzen, sollten aber immer im pädagogischen Gesamtkontext betrachtet werden."
      };
      case 'detective': return {
        title: "Fehler-Detektiv",
        tag: "Qualitative Analyse",
        description: "Es geht nicht um 'Richtig oder Falsch', sondern um das Gehirn-Muster hinter dem Fehler. Warum schreibt das Kind 'Hund' mit 't'?",
        tipp: "Suchen Sie gezielt nach Fehlermustern. Wenn Sie das Muster verstehen, wissen Sie genau, welche Übung das Kind jetzt braucht."
      };
      case 'interaktion': return {
        title: "Interaktions-Log",
        tag: "Beziehungs-Dokumentation",
        description: "Erfasst besondere Momente: Lob, Konflikte oder wichtige Einzelgespräche. Hilft, eine objektive Sicht auf die sozial-emotionale Entwicklung zu behalten.",
        tipp: "Dokumentieren Sie auch positive Durchbrüche! Das ist wertvoll für die Förderplan-Erstellung."
      };
      case 'metakognition': return {
        title: "Metakognition",
        tag: "Lernen lernen",
        description: "Hier geht es darum, ob das Kind über sein eigenes Lernen nachdenkt. Weiß es, wie es sich auf eine Prüfung vorbereitet? Kann es sich selbst einschätzen?",
        tipp: "Nutzen Sie die Vor- und Nachphase, um mit dem Kind ins Gespräch zu kommen: 'Was hat dir beim Lernen geholfen?'"
      };
      case 'liveDiagnostik': return {
        title: "1:1 Live-Beobachtung",
        tag: "Direktbeobachtung",
        description: "Werkzeuge für die direkte Arbeit mit dem Kind. Mengen blitzen oder Zahlenspanne geben kurze Hinweise auf den momentanen Lernstand.",
        tipp: "Führen Sie die Aufgaben in einer ruhigen Umgebung durch und beziehen Sie weitere Beobachtungen in die Einschätzung ein."
      };
      default: return null;
    }
  };

  const guide = getGuideContent();

  if (printMode === 'class') return <PrintClassOverview tests={tests} erhebungen={erhebungen} students={app.schueler} onClose={() => setPrintMode(null)} />;
  if (printMode === 'student' && selectedStudentId) {
    const student = app.schueler.find(s => s.id === selectedStudentId);
    if (student) return <PrintStudentReport student={student} tests={tests} erhebungen={erhebungen} onClose={() => setPrintMode(null)} />;
  }

  if (activeTab === 'detective') {
    return (
      <div className="space-y-6">
        <ErrorDetective />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Quiet Top Header */}
      <div className="bg-white p-5 sm:p-6 rounded-[2.5rem] shadow-xs border border-slate-200 print:hidden space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveTab('uebersicht')}
              className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all cursor-pointer"
            >
              <ClipboardList size={22} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 cursor-pointer" onClick={() => setActiveTab('uebersicht')}>
                  Diagnostik
                </h2>
                {(app.klassenbezeichnung?.trim() || app.klasse?.trim()) && (
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-black">
                    Klasse {app.klassenbezeichnung?.trim() || app.klasse?.trim()}
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                Gezielte Beobachtungen, 1:1 Live-Tests & Lernstandsanalysen
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Subject/Domain Pills */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/60 text-xs font-extrabold">
              {[
                { id: 'all', label: 'Alle' },
                { id: 'deutsch', label: 'Lesen' },
                { id: 'mathematik', label: 'Mathe' },
                { id: 'rechtschreiben', label: 'Rechtschreiben' },
                { id: 'sachunterricht', label: 'Konzentration' }
              ].map(domain => (
                <button
                  key={domain.id}
                  onClick={() => setTrendListSubj(domain.id as any)}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    trendListSubj === domain.id
                      ? 'bg-white text-indigo-600 shadow-3xs font-black'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {domain.label}
                </button>
              ))}
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Schüler:in suchen..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-36 sm:w-44"
              />
            </div>

            {/* Print & New Test Actions */}
            <div className="flex items-center gap-1.5">
              {onBackToNew && (
                <button
                  id="btn-return-to-new-diagnostik"
                  onClick={onBackToNew}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  title="Zurück zur vereinfachten neuen Diagnostik"
                >
                  <ArrowLeft size={14} />
                  <span>Zur neuen Diagnostik</span>
                </button>
              )}
              <button 
                onClick={() => setPrintMode('class')}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Klassenübersicht drucken"
              >
                <Printer size={16} />
              </button>
              <button 
                onClick={() => { setEditingTest({ name: '', kategorie: 'lesen', einheit: 'prozentrang', schwellenwert: 15, schwellenrichtung: 'unter', schulstufen: [1,2,3,4] }); setIsTestModalOpen(true); }}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Plus size={14} /> Neuer Test
              </button>
            </div>
          </div>
        </div>

        {/* Prominente Diagnostik-Werkzeuge Navigation Bar */}
        <div className="pt-2 border-t border-slate-150">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar select-none">
            {[
              { id: 'uebersicht', label: 'Übersicht', icon: ClipboardList, color: 'text-slate-700' },
              { id: 'liveDiagnostik', label: '1:1 Live-Tests (24)', icon: Activity, color: 'text-emerald-600', badge: 'Live' },
              { id: 'klassenscreening', label: 'Basis-Check', icon: Brain, color: 'text-indigo-600' },
              { id: 'detective', label: 'Error Detective', icon: Microscope, color: 'text-rose-600', badge: 'KI' },
              { id: 'gabicquest', label: 'Klassio Quest 🎮', icon: Gamepad2, color: 'text-amber-600' },
              { id: 'exekutiv', label: 'Exekutiv-Funktionen', icon: Zap, color: 'text-purple-600' },
              { id: 'eintragen', label: 'Erfassen', icon: Grid, color: 'text-teal-600' },
              { id: 'verlaeufe', label: 'Verläufe', icon: TrendingUp, color: 'text-blue-600' },
              { id: 'ikm', label: 'iKM Plus', icon: FileCheck, color: 'text-indigo-600' },
              { id: 'antolin', label: 'Antolin', icon: BookOpen, color: 'text-amber-600' },
              { id: 'ziele', label: 'Förderziele', icon: Target, color: 'text-rose-600' },
              { id: 'interaktion', label: 'Interaktions-Log', icon: MessageCircle, color: 'text-sky-600' },
              { id: 'metakognition', label: 'Metakognition', icon: Lightbulb, color: 'text-indigo-600' },
              { id: 'ipsativ', label: 'Ipsativ', icon: TrendingUp, color: 'text-teal-600' },
              { id: 'katalog', label: 'Test-Katalog', icon: Database, color: 'text-slate-600' },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-white' : tab.color} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`text-[0.5625rem] px-1.5 py-0.5 rounded-md uppercase font-black ${
                      isActive ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showGuide && guide && (
          <motion.div
            id="diagnostik-hilfe"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-8"
          >
            <div className="bg-amber-50 border border-amber-200/80 rounded-[2rem] p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-start shadow-3xs">
              <div className="w-14 h-14 bg-white border border-amber-200 rounded-2xl flex items-center justify-center text-amber-500 shadow-sm shrink-0">
                <Lightbulb size={28} />
              </div>
              <div className="space-y-3 flex-1 text-left">
                <div className="flex items-center gap-3">
                  <h3 className="text-[1.125rem] font-black text-slate-900 leading-none">{guide.title}</h3>
                  <span className="px-3 py-1 bg-amber-100/60 text-amber-700 rounded-full text-[0.5625rem] font-black uppercase tracking-widest">{guide.tag}</span>
                </div>
                <p className="text-[0.8125rem] text-slate-700 leading-relaxed font-semibold">{guide.description}</p>
                <div className="mt-4 p-4 bg-white/60 rounded-2xl border border-amber-100/50">
                  <p className="text-[0.75rem] text-amber-950 font-bold flex items-start gap-2 leading-relaxed">
                    <Sparkles size={14} className="shrink-0 mt-0.5 text-amber-500 animate-pulse" />
                    Pädagogischer Tipp: {guide.tipp}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                aria-label="Diagnostik-Hilfe schließen"
                onClick={() => setShowGuide(false)}
                className="p-2 hover:bg-amber-100 rounded-xl text-amber-900 transition-colors shrink-0"
              >
                <X size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {app.schueler.length === 0 ? (
        <div className="py-12">
          <EmptyState 
            icon="🧪"
            title="Keine Schüler:innen"
            description="Lege zuerst Schüler:innen an, um diagnostische Daten erfassen zu können."
            actionLabel="Zur Schülerliste"
            onAction={() => setPage('schueler')}
          />
        </div>
      ) : (
        <>
          {/* Bento warning banner integrated into stats but backup listed if needed */}
          {criticalIssues.length > 0 && activeTab === 'verlaeufe' && (
            <div className="bg-rose-50/60 border border-rose-100 rounded-[2rem] p-6 shadow-3xs mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-rose-500 shadow-3xs border border-rose-100"><AlertTriangle size={20} /></div>
                <div><h2 className="text-[1rem] leading-none font-black text-slate-900">Aktuelle Förderhinweise im Blick</h2></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
                {criticalIssues.map(issue => (
                  <button key={issue.id} onClick={() => { setSelectedStudentId(issue.schuelerId); setActiveTab('verlaeufe'); }} className="bg-white p-4 rounded-2xl border border-rose-100 hover:border-rose-300 shadow-3xs transition-all text-left group">
                    <div className="text-[0.5625rem] font-black uppercase text-rose-400 mb-1 text-wrap leading-tight break-words">{getTestName(issue.testId)}</div>
                    <div className="text-[0.75rem] font-black text-slate-800 text-wrap leading-tight break-words group-hover:text-indigo-600 transition-colors">{getStudentName(issue.schuelerId)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          <AnimatePresence mode="wait">
            {activeTab === 'uebersicht' && (
              <motion.div key="uebersicht" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                {selectedStudentId === 'class-overview' ? (
                  /* CLASS OVERVIEW VIEW */
                  <div className="space-y-8 text-left">
                    {/* 1. LEVEL 1: 4 COMPACT KPI CARDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-[2rem] border border-rose-100/80 shadow-xs flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                          <AlertTriangle size={22} />
                        </div>
                        <div>
                          <span className="text-[0.625rem] font-extrabold uppercase tracking-wider text-slate-400 block">1. Prüfhinweise</span>
                          <div className="text-xl font-black text-slate-900 mt-0.5">{criticalStudentsCount} Kinder</div>
                          <span className="text-[0.6875rem] font-bold text-rose-600">Beobachten</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-[2rem] border border-indigo-100/80 shadow-xs flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <Target size={22} />
                        </div>
                        <div>
                          <span className="text-[0.625rem] font-extrabold uppercase tracking-wider text-slate-400 block">2. Förderziele</span>
                          <div className="text-xl font-black text-slate-900 mt-0.5">{openGoalsCountClass} Offen</div>
                          <span className="text-[0.6875rem] font-bold text-indigo-600">Aktive Maßnahmen</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-[2rem] border border-emerald-100/80 shadow-xs flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <TrendingUp size={22} />
                        </div>
                        <div>
                          <span className="text-[0.625rem] font-extrabold uppercase tracking-wider text-slate-400 block">3. Positive Trends</span>
                          <div className="text-xl font-black text-slate-900 mt-0.5">{positiveDevCount} Kinder</div>
                          <span className="text-[0.6875rem] font-bold text-emerald-600">Verbessert</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-[2rem] border border-slate-200/80 shadow-xs flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0">
                          <Info size={22} />
                        </div>
                        <div>
                          <span className="text-[0.625rem] font-extrabold uppercase tracking-wider text-slate-400 block">4. Datenlücken</span>
                          <div className="text-xl font-black text-slate-900 mt-0.5">{sparseDataStudents.length} Kinder</div>
                          <span className="text-[0.6875rem] font-bold text-slate-500">Wenig Daten</span>
                        </div>
                      </div>
                    </div>

                    {/* DIAGNOSTIK-TOOLS & TEST-CENTER SCHNELLZUGRIFF */}
                    <div className="bg-white p-6 sm:p-7 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                        <div>
                          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                            <Activity size={20} className="text-indigo-600" /> Diagnostik-Werkzeuge &amp; Test-Center
                          </h3>
                          <p className="text-xs font-semibold text-slate-400 mt-0.5">
                            Wähle ein dokumentiertes Verfahren oder eine informelle Lernstandsbeobachtung. Normwerte dürfen nur aus der jeweiligen Originalauswertung übernommen werden.
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-black self-start sm:self-center">
                          15 Fach-Module
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pt-1">
                        {/* 1:1 Live-Tests (24 Tests) */}
                        <button
                          type="button"
                          onClick={() => setActiveTab('liveDiagnostik')}
                          className="p-4 bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200/80 rounded-2xl text-left transition-all hover:shadow-xs group cursor-pointer flex flex-col justify-between space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="w-9 h-9 rounded-xl bg-white text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-3xs">
                              <Activity size={18} />
                            </div>
                            <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-md text-[0.5625rem] font-black uppercase tracking-wider">
                              24 Tests
                            </span>
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 text-sm group-hover:text-emerald-800 transition-colors">
                              1:1 Live-Diagnostik
                            </h4>
                            <p className="text-[0.6875rem] text-slate-500 font-semibold line-clamp-2 mt-0.5">
                              Leseflüssigkeit, Blitzlesen, Kopfrechnen, Phonologie, Graphomotorik &amp; 24 Live-Tests.
                            </p>
                          </div>
                          <div className="text-[0.6875rem] font-black text-emerald-700 flex items-center gap-1 pt-1">
                            <span>Test starten</span>
                            <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </button>

                        {/* Kognitiver Basis-Check */}
                        <button
                          type="button"
                          onClick={() => setActiveTab('klassenscreening')}
                          className="p-4 bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-200/80 rounded-2xl text-left transition-all hover:shadow-xs group cursor-pointer flex flex-col justify-between space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="w-9 h-9 rounded-xl bg-white text-indigo-600 border border-indigo-200 flex items-center justify-center shadow-3xs">
                              <Brain size={18} />
                            </div>
                            <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-md text-[0.5625rem] font-black uppercase tracking-wider">
                              Screening
                            </span>
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 text-sm group-hover:text-indigo-800 transition-colors">
                              Basis-Check (Screening)
                            </h4>
                            <p className="text-[0.6875rem] text-slate-500 font-semibold line-clamp-2 mt-0.5">
                              Ganzheitliche Erfassung von Motorik, Visuell, Auditiv, Pränumerik &amp; Sprache.
                            </p>
                          </div>
                          <div className="text-[0.6875rem] font-black text-indigo-700 flex items-center gap-1 pt-1">
                            <span>Screening öffnen</span>
                            <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </button>

                        {/* Error Detective */}
                        <button
                          type="button"
                          onClick={() => setActiveTab('detective')}
                          className="p-4 bg-rose-50/70 hover:bg-rose-100/70 border border-rose-200/80 rounded-2xl text-left transition-all hover:shadow-xs group cursor-pointer flex flex-col justify-between space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="w-9 h-9 rounded-xl bg-white text-rose-600 border border-rose-200 flex items-center justify-center shadow-3xs">
                              <Microscope size={18} />
                            </div>
                            <span className="px-2 py-0.5 bg-rose-600 text-white rounded-md text-[0.5625rem] font-black uppercase tracking-wider">
                              KI-Detektiv
                            </span>
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 text-sm group-hover:text-rose-800 transition-colors">
                              Error Detective
                            </h4>
                            <p className="text-[0.6875rem] text-slate-500 font-semibold line-clamp-2 mt-0.5">
                              Symptombasierte Fehlermusteranalyse für Rechen- und Rechtschreibschwierigkeiten.
                            </p>
                          </div>
                          <div className="text-[0.6875rem] font-black text-rose-700 flex items-center gap-1 pt-1">
                            <span>Analyse starten</span>
                            <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </button>

                        {/* GabicQuest */}
                        <button
                          type="button"
                          onClick={() => setActiveTab('gabicquest')}
                          className="p-4 bg-amber-50/70 hover:bg-amber-100/70 border border-amber-200/80 rounded-2xl text-left transition-all hover:shadow-xs group cursor-pointer flex flex-col justify-between space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="w-9 h-9 rounded-xl bg-white text-amber-600 border border-amber-200 flex items-center justify-center shadow-3xs">
                              <Gamepad2 size={18} />
                            </div>
                            <span className="px-2 py-0.5 bg-amber-600 text-white rounded-md text-[0.5625rem] font-black uppercase tracking-wider">
                              Game
                            </span>
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 text-sm group-hover:text-amber-800 transition-colors">
                              Klassio Quest 🎮
                            </h4>
                            <p className="text-[0.6875rem] text-slate-500 font-semibold line-clamp-2 mt-0.5">
                              Gamifizierte Lernstands-Reise für Kinder mit animierten Aufgaben und Belohnungen.
                            </p>
                          </div>
                          <div className="text-[0.6875rem] font-black text-amber-700 flex items-center gap-1 pt-1">
                            <span>Quest starten</span>
                            <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </button>

                        {/* Exekutive Funktionen */}
                        <button
                          type="button"
                          onClick={() => setActiveTab('exekutiv')}
                          className="p-4 bg-purple-50/70 hover:bg-purple-100/70 border border-purple-200/80 rounded-2xl text-left transition-all hover:shadow-xs group cursor-pointer flex flex-col justify-between space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="w-9 h-9 rounded-xl bg-white text-purple-600 border border-purple-200 flex items-center justify-center shadow-3xs">
                              <Zap size={18} />
                            </div>
                            <span className="px-2 py-0.5 bg-purple-600 text-white rounded-md text-[0.5625rem] font-black uppercase tracking-wider">
                              Kognition
                            </span>
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 text-sm group-hover:text-purple-800 transition-colors">
                              Exekutive Funktionen
                            </h4>
                            <p className="text-[0.6875rem] text-slate-500 font-semibold line-clamp-2 mt-0.5">
                              Zahlenspanne, Mengenblitzen &amp; Go/No-Go als kurze schulische Lernstands- und Aufmerksamkeitsbeobachtungen.
                            </p>
                          </div>
                          <div className="text-[0.6875rem] font-black text-purple-700 flex items-center gap-1 pt-1">
                            <span>Tests öffnen</span>
                            <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </button>

                        {/* iKM Plus Import & Auswertung */}
                        <button
                          type="button"
                          onClick={() => setActiveTab('ikm')}
                          className="p-4 bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200/80 rounded-2xl text-left transition-all hover:shadow-xs group cursor-pointer flex flex-col justify-between space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="w-9 h-9 rounded-xl bg-white text-blue-600 border border-blue-200 flex items-center justify-center shadow-3xs">
                              <FileCheck size={18} />
                            </div>
                            <span className="px-2 py-0.5 bg-blue-600 text-white rounded-md text-[0.5625rem] font-black uppercase tracking-wider">
                              IQS
                            </span>
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 text-sm group-hover:text-blue-800 transition-colors">
                              iKM-PLUS Auswertung
                            </h4>
                            <p className="text-[0.6875rem] text-slate-500 font-semibold line-clamp-2 mt-0.5">
                              Offizielle Rückmelde-Daten importieren, darstellen und pädagogisch einordnen.
                            </p>
                          </div>
                          <div className="text-[0.6875rem] font-black text-blue-700 flex items-center gap-1 pt-1">
                            <span>iKM-PLUS öffnen</span>
                            <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </button>

                        {/* Entwicklungsverläufe */}
                        <button
                          type="button"
                          onClick={() => setActiveTab('verlaeufe')}
                          className="p-4 bg-sky-50/70 hover:bg-sky-100/70 border border-sky-200/80 rounded-2xl text-left transition-all hover:shadow-xs group cursor-pointer flex flex-col justify-between space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="w-9 h-9 rounded-xl bg-white text-sky-600 border border-sky-200 flex items-center justify-center shadow-3xs">
                              <TrendingUp size={18} />
                            </div>
                            <span className="px-2 py-0.5 bg-sky-600 text-white rounded-md text-[0.5625rem] font-black uppercase tracking-wider">
                              Trends
                            </span>
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 text-sm group-hover:text-sky-800 transition-colors">
                              Entwicklungsverläufe
                            </h4>
                            <p className="text-[0.6875rem] text-slate-500 font-semibold line-clamp-2 mt-0.5">
                              Längsschnitt-Verläufe, Schwellenwerte, Klassenvergleiche und Förderhinweise.
                            </p>
                          </div>
                          <div className="text-[0.6875rem] font-black text-sky-700 flex items-center gap-1 pt-1">
                            <span>Verläufe ansehen</span>
                            <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </button>

                        {/* Erfassen & Schnelleintrag */}
                        <button
                          type="button"
                          onClick={() => setActiveTab('eintragen')}
                          className="p-4 bg-teal-50/70 hover:bg-teal-100/70 border border-teal-200/80 rounded-2xl text-left transition-all hover:shadow-xs group cursor-pointer flex flex-col justify-between space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="w-9 h-9 rounded-xl bg-white text-teal-600 border border-teal-200 flex items-center justify-center shadow-3xs">
                              <Grid size={18} />
                            </div>
                            <span className="px-2 py-0.5 bg-teal-600 text-white rounded-md text-[0.5625rem] font-black uppercase tracking-wider">
                              Eingabe
                            </span>
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 text-sm group-hover:text-teal-800 transition-colors">
                              Erfassen &amp; Eintragen
                            </h4>
                            <p className="text-[0.6875rem] text-slate-500 font-semibold line-clamp-2 mt-0.5">
                              Ergebnisse manuell eintragen, Klassen-Erhebungen tabellarisch erfassen.
                            </p>
                          </div>
                          <div className="text-[0.6875rem] font-black text-teal-700 flex items-center gap-1 pt-1">
                            <span>Eingabemaske öffnen</span>
                            <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* 2. CENTRAL SECTION: "Was fällt auf?" */}
                    <div className="bg-white p-6 sm:p-7 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div>
                          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                            <Sparkles size={18} className="text-amber-500" /> Was fällt aktuell auf?
                          </h3>
                          <p className="text-xs font-semibold text-slate-400 mt-0.5">
                            Konkrete Beobachtungshinweise direkt aus den erfassten Daten der Klasse.
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-extrabold">
                          {classInsights.length} Hinweise
                        </span>
                      </div>

                      {classInsights.length === 0 ? (
                        <div className="py-6 text-center text-xs font-bold text-slate-400">
                          Keine besonderen Auffälligkeiten oder Datenlücken im gewählten Bereich.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {classInsights.map((insight, idx) => (
                            <div key={idx} className="p-4 bg-slate-50/70 border border-slate-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <span className={`px-2.5 py-1 rounded-full text-[0.625rem] font-black uppercase tracking-wider border shrink-0 mt-0.5 ${insight.badgeColor}`}>
                                  {insight.badge}
                                </span>
                                <div>
                                  <span className="text-xs font-black text-slate-900 mr-2">{insight.studentName}:</span>
                                  <span className="text-xs font-semibold text-slate-600">{insight.text}</span>
                                </div>
                              </div>
                              <button 
                                onClick={() => setSelectedStudentId(insight.studentId)}
                                className="self-end sm:self-center px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 text-indigo-600 rounded-xl text-xs font-black transition-all flex items-center gap-1 shrink-0"
                              >
                                Ansehen <ChevronRight size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 3. BLINDE FLECKEN (SPARSE DATA WARNINGS) */}
                    {sparseDataStudents.length > 0 && (
                      <div className="bg-slate-50 border border-slate-200 rounded-[2.5rem] p-6 space-y-3">
                        <div className="flex items-center gap-2 text-slate-700 font-black text-xs uppercase tracking-wider">
                          <Info size={15} className="text-slate-500" /> Blinde Flecken & Seltene Beobachtungen
                        </div>
                        <p className="text-xs font-semibold text-slate-500">
                          Bei folgenden Schüler:innen wurden seit über 4 Wochen keine neuen Diagnostikdaten oder Beobachtungen erfasst:
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {sparseDataStudents.map(s => (
                            <button
                              key={s.id}
                              onClick={() => setSelectedStudentId(s.id)}
                              className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-extrabold text-slate-700 flex items-center gap-1.5 transition-all"
                            >
                              <span>{s.vorname} {s.nachname}</span>
                              <span className="text-[0.625rem] text-slate-400 font-normal">(4+ Wo.)</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 4. SIMPLIFIED STUDENT LIST */}
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <h3 className="text-base font-black text-slate-900">
                          Schüler:innen der Klasse ({sortedStudentsForDiagnostik.length})
                        </h3>
                        <div className="text-xs font-bold text-slate-400">
                          Filter: {trendListSubj === 'all' ? 'Alle Fächer' : trendListSubj}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sortedStudentsForDiagnostik
                          .filter(s => {
                            if (!tableSearch) return true;
                            const searchLower = tableSearch.toLowerCase();
                            return `${s.vorname} ${s.nachname}`.toLowerCase().includes(searchLower);
                          })
                          .map(student => {
                            const trend = computeStudentTrend(student.id);
                            const studentAlerts = getStudentDiagnosticAlerts(student.id);
                            const isSparse = sparseDataStudents.some(s => s.id === student.id);
                            const studentGoals = ((app as any).schuelerGoals || []).filter((lz: any) => lz.schuelerId === student.id && lz.status !== 'erreicht');
                            const profGoals = (student.foerderprofil?.foerderziele || []).filter((g: any) => g.status === 'offen' || g.status === 'in Arbeit');

                            return (
                              <div key={student.id} className="bg-white rounded-[2rem] border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                                <div className="space-y-3">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className="font-black text-slate-900 text-base leading-tight">
                                        {student.nachname} {student.vorname}
                                      </h4>
                                      <span className="text-[0.6875rem] font-bold text-slate-400 uppercase">
                                        Stufe {(student as any).schulstufe || student.niveau || app.stufe || 2}
                                      </span>
                                    </div>
                                    {/* Status Badge */}
                                    {studentAlerts.length > 0 ? (
                                      <span className="px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-700 text-[0.625rem] font-black uppercase rounded-full">
                                        ⚠️ Auffällig
                                      </span>
                                    ) : trend?.trend === 'improved' ? (
                                      <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[0.625rem] font-black uppercase rounded-full">
                                        ↗ Positiv
                                      </span>
                                    ) : isSparse ? (
                                      <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-600 text-[0.625rem] font-black uppercase rounded-full">
                                        ℹ️ Wenig Daten
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-600 text-[0.625rem] font-black uppercase rounded-full">
                                        → Stabil
                                      </span>
                                    )}
                                  </div>

                                  {/* 1-2 key notes */}
                                  <div className="space-y-1.5 text-xs font-medium text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    {studentAlerts.length > 0 ? (
                                      <p className="text-rose-700 font-bold leading-tight">
                                        • Alert: {studentAlerts[0]}
                                      </p>
                                    ) : (
                                      <p className="leading-tight">
                                        • Letzte Beobachtung: {getStudentLastObservationDate(student.id)}
                                      </p>
                                    )}
                                    {(profGoals.length > 0 || studentGoals.length > 0) && (
                                      <p className="text-indigo-700 font-bold leading-tight">
                                        • Förderziel: {profGoals[0]?.ziel || studentGoals[0]?.zielText || 'Aktives Ziel'}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                                  <button
                                    onClick={() => {
                                      setPage('dossier');
                                    }}
                                    className="text-[0.6875rem] font-extrabold text-slate-400 hover:text-slate-700"
                                  >
                                    Dossier
                                  </button>
                                  <button
                                    onClick={() => setSelectedStudentId(student.id)}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1 shadow-xs"
                                  >
                                    Öffnen <ChevronRight size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* INDIVIDUAL STUDENT DIAGNOSTIC DETAIL VIEW */
                  <div className="space-y-6 text-left">
                    {/* Top bar: Back button + Student Name + Dossier Link */}
                    <div className="bg-white p-5 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSelectedStudentId('class-overview')}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-1.5"
                        >
                          <ArrowLeft size={16} /> Klassenübersicht
                        </button>
                        <div>
                          <h2 className="text-xl font-black text-slate-900">
                            {getStudentName(selectedStudentId)}
                          </h2>
                          <p className="text-xs font-bold text-slate-400 uppercase">
                            Diagnostik & Entwicklungsstand
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setPage('dossier')}
                        className="px-4 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5"
                      >
                        <User size={15} /> Schülerdossier öffnen
                      </button>
                    </div>

                    {/* EBENE 1: Compact Student Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-xs space-y-1">
                        <span className="text-[0.625rem] font-extrabold uppercase text-slate-400 tracking-wider">Entwicklungs-Trend</span>
                        <div className="text-base font-black text-slate-900 flex items-center gap-2">
                          {renderStudentTrend(selectedStudentId, false)}
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-xs space-y-1">
                        <span className="text-[0.625rem] font-extrabold uppercase text-slate-400 tracking-wider">Letzte Beobachtung</span>
                        <div className="text-base font-black text-slate-900">
                          {getStudentLastObservationDate(selectedStudentId)}
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-xs space-y-1 flex flex-col justify-between">
                        <span className="text-[0.625rem] font-extrabold uppercase text-slate-400 tracking-wider">Förderziele & Maßnahmen</span>
                        <button
                          onClick={() => setPage('dossier')}
                          className="mt-1 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-all text-center"
                        >
                          Förderprofil öffnen
                        </button>
                      </div>
                    </div>

                    {/* "Was sollte ich beachten?" (max 3-5 notes) */}
                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-3">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles size={16} className="text-amber-500" /> Was sollte ich bei {getStudentName(selectedStudentId).split(' ')[0]} beachten?
                      </h3>

                      <div className="space-y-2">
                        {getStudentKeyNotes(selectedStudentId).map((note, idx) => (
                          <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold text-slate-700 flex items-start gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                            <span>{note}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* EBENE 2 & 3: DETAILS & UNDERLYING RAW DATA */}
                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                        <div>
                          <h3 className="text-base font-black text-slate-900">
                            Details & Messdaten
                          </h3>
                          <p className="text-xs font-semibold text-slate-400">
                            Rohwerte, Testreihen, Normwerte und historische Auswertungen.
                          </p>
                        </div>

                        <button
                          onClick={() => setShowStudentRawDetails(!showStudentRawDetails)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black transition-all flex items-center gap-1.5"
                        >
                          {showStudentRawDetails ? 'Details ausblenden' : 'Alle Daten anzeigen'}
                          <ChevronDown size={16} className={`transition-transform ${showStudentRawDetails ? 'rotate-180' : ''}`} />
                        </button>
                      </div>

                      {showStudentRawDetails && (
                        <div className="space-y-6 pt-2 animate-in fade-in duration-200">
                          {/* Detailed Test History Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-400 font-black uppercase text-[0.625rem] tracking-wider border-b border-slate-100">
                                  <th className="p-3">Datum</th>
                                  <th className="p-3">Verfahren / Test</th>
                                  <th className="p-3">Ergebnis / Wert</th>
                                  <th className="p-3">Status</th>
                                  <th className="p-3">Notiz</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                {erhebungen
                                  .filter(e => e.schuelerId === selectedStudentId)
                                  .map((entry, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50">
                                      <td className="p-3 font-mono">{entry.datum}</td>
                                      <td className="p-3 font-bold">{getTestName(entry.testId)}</td>
                                      <td className="p-3 font-mono font-black text-slate-900">
                                        {entry.ergebniswert} {tests.find(t => t.id === entry.testId)?.einheit || ''}
                                      </td>
                                      <td className="p-3">
                                        {isDiagnosticAlert(entry) ? (
                                          <span className="text-rose-600 font-bold">⚠️ Auffällig</span>
                                        ) : (
                                          <span className="text-emerald-600 font-bold">Normalbereich</span>
                                        )}
                                      </td>
                                      <td className="p-3 text-slate-500 font-normal">{entry.kommentar || '--'}</td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'ikm' && (
          <motion.div key="ikm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-slate-200 rounded-[2rem] p-4 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 text-left">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[0.5625rem] font-black uppercase tracking-wider text-indigo-600 bg-indigo-100/60 rounded-full">
                      <Sparkles size={10} className="fill-indigo-600" /> KI-Klassenanalyse
                    </span>
                    <h4 className="text-[1.125rem] leading-normal font-black text-slate-900">IKM PLUS Import mit KI</h4>
                  </div>
                </div>

                {STUDENT_REPORT_AI_DISABLED && (
                  <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950">
                    Datenschutz: Die automatische IKM-Auswertung über Gemini ist vorübergehend gesperrt. Bitte keine Schülerberichte hochladen. Bereits erfasste Ergebnisse bleiben erhalten.
                  </p>
                )}
                {!STUDENT_REPORT_AI_DISABLED && !aiImportPreview && !isAiImporting && (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/15 p-4 sm:p-8 rounded-3xl cursor-pointer transition-all text-center">
                    <input type="file" accept="application/pdf" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setAiImportFile(file);
                        const reader = new FileReader();
                        reader.onload = () => startAiAnalysis(reader.result as string, file.name);
                        reader.readAsDataURL(file);
                      }
                    }} />
                    <UploadCloud size={32} className="text-indigo-600 mb-3" />
                    <span className="text-[0.75rem] leading-tight font-black text-slate-800">IKM Klassenanalyse hierher ziehen</span>
                  </label>
                )}

                {isAiImporting && (
                  <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 bg-indigo-50/50 rounded-3xl border border-indigo-100">
                    <Loader2 size={32} className="animate-spin text-indigo-500" />
                    <span className="text-[0.75rem] font-black text-indigo-600 uppercase tracking-widest animate-pulse">KI analysiert IKM PDF...</span>
                  </div>
                )}

                {aiImportPreview && (
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-left">
                    <div className="p-5 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
                      <div>
                        <h5 className="text-[0.875rem] leading-snug font-black text-slate-900">Import-Vorschau ({aiImportPreview.length} Zeilen)</h5>
                        <p className="text-slate-400 text-[0.7rem] font-medium font-sans mt-0.5">Überprüfen Sie die vorgeschlagenen Ergebnisse vor dem Speichern.</p>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={() => setAiImportPreview(null)} className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[0.625rem] font-black uppercase font-sans tracking-wider">Verwerfen</button>
                        <button onClick={handleConfirmAiImport} className="flex-1 sm:flex-none px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[0.625rem] font-black uppercase shadow-sm font-sans tracking-wider">Import bestätigen</button>
                      </div>
                    </div>
                    <div className="overflow-x-auto max-h-[450px]">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-600 uppercase text-[0.5625rem] tracking-widest font-black border-b border-slate-100 font-sans">
                            <th className="p-2.5 rounded-l-xl">Schüler:in (Zugeordnet)</th>
                            <th className="p-2.5 text-center text-blue-600">Lesen PR</th>
                            <th className="p-2.5 text-center text-indigo-600">Zuhören PR</th>
                            <th className="p-2.5 text-center text-purple-600">Sprachbewusst. PR</th>
                            <th className="p-2.5 text-center text-emerald-600">Mathematik PR</th>
                            <th className="p-2.5 rounded-r-xl text-center">Import</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                          {aiImportPreview.map((item, idx) => (
                            <motion.tr 
                              key={idx} 
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.25, delay: idx * 0.04 }}
                              className="hover:bg-slate-50/40"
                            >
                              <td className="p-2.5">
                                <select 
                                  aria-label={`Schülerzuordnung für Importzeile ${idx + 1}`}
                                  value={item.mappedStudentId || ''} 
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const matched = app.schueler.find(s => s.id === val);
                                    const updated = [...aiImportPreview];
                                    updated[idx] = { 
                                      ...item, 
                                      mappedStudentId: val,
                                      mappedStudentName: matched ? `${matched.nachname} ${matched.vorname}` : '',
                                      shouldImport: !!val
                                    };
                                    setAiImportPreview(updated);
                                  }}
                                  className="w-full min-h-8 border border-slate-200 rounded-lg px-2 py-0.5 bg-white text-slate-700 text-xs font-sans font-bold"
                                >
                                  <option value="">-- Nicht zugeordnet --</option>
                                  {(app.schueler || []).map(s => (
                                    <option key={s.id} value={s.id}>{s.nachname} {s.vorname}</option>
                                  ))}
                                </select>
                                {item.studentNameConfirmed && (
                                  <div className="text-[0.625rem] text-slate-400 pl-2 mt-0.5 font-sans font-medium">
                                    Aus PDF: <span className="font-bold text-slate-550">{item.studentNameConfirmed}</span>
                                  </div>
                                )}
                              </td>
                              <td className="p-2.5 text-center font-mono text-slate-850 font-black">{item.deutschLesenPR ?? '--'}</td>
                              <td className="p-2.5 text-center font-mono text-slate-850 font-black">{item.deutschZuhoerenPR ?? '--'}</td>
                              <td className="p-2.5 text-center font-mono text-slate-850 font-black">{item.deutschSprachbewusstseinPR ?? '--'}</td>
                              <td className="p-2.5 text-center font-mono text-slate-850 font-black">{item.mathematikPR ?? '--'}</td>
                              <td className="p-2.5 text-center">
                                <input 
                                  type="checkbox" 
                                  aria-label={`Importzeile ${idx + 1} übernehmen`}
                                  checked={item.shouldImport} 
                                  onChange={(e) => {
                                    const updated = [...aiImportPreview];
                                    updated[idx] = { ...item, shouldImport: e.target.checked };
                                    setAiImportPreview(updated);
                                  }}
                                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                                />
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

               {/* Vergleichsmatrix Table */}
               <div className="bg-white rounded-[2rem] p-7 border border-slate-200 shadow-sm space-y-5 text-left mb-8 col-span-full">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                   <h4 className="text-[1rem] leading-normal font-black text-slate-900 flex items-center gap-2"><BarChart3 size={18} className="text-indigo-600" /> Vergleichsmatrix</h4>
                 </div>
                 <div className="overflow-x-auto custom-scrollbar">
                   <table className="ikm-records-table w-full text-left border-collapse text-[0.75rem] leading-tight">
                     <thead>
                       <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-400 text-[0.5625rem] font-black uppercase tracking-wider">
                         <th className="py-4 px-5">Schüler:in</th>
                         <th className="py-4 px-5 text-center text-blue-600">Lesen</th>
                         <th className="py-4 px-5 text-center text-indigo-600">Zuhören</th>
                         <th className="py-4 px-5 text-center text-purple-600">Sprachbewusst.</th>
                         <th className="py-4 px-5 text-center text-emerald-600">Math</th>
                         <th className="py-4 px-5 text-center">Aktion</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                       {sortedStudentsForDiagnostik.map((student: any) => {
                         const rec = ikmRecords.find((r: any) => r.schuelerId === student.id);
                         return (
                           <tr key={student.id} className="hover:bg-slate-50/40">
                             <td className="py-4 px-5"><span className="font-extrabold text-slate-900 flex items-center gap-2"><span>{student.nachname} {student.vorname}</span>{renderStudentTrend(student.id, true)}</span></td>
                             <td className="py-4 px-5">{rec ? renderMiniComparison(rec.deutschLesenPR, avgRead, 'bg-blue-500', 'bg-blue-100') : '--'}</td>
                             <td className="py-4 px-5">{rec ? renderMiniComparison(rec.deutschZuhoerenPR, avgListen, 'bg-indigo-500', 'bg-indigo-100') : '--'}</td>
                             <td className="py-4 px-5">{rec ? renderMiniComparison(rec.deutschSprachbewusstseinPR, avgLanguage, 'bg-purple-500', 'bg-purple-100') : '--'}</td>
                             <td className="py-4 px-5">{rec ? renderMiniComparison(rec.mathematikPR, avgMath, 'bg-emerald-500', 'bg-emerald-100') : '--'}</td>
                             <td className="py-4 px-5 text-center">
                               {rec && (
                                 <button 
                                   onClick={(e) => handleDeleteIkm(rec.id, e)}
                                   className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-all"
                                   title="IKM Löschen"
                                 >
                                   <Trash2 size={14} />
                                 </button>
                               )}
                             </td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                 </div>
               </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:p-6">
                {sortedStudentsForDiagnostik.map((student: any) => {
                  const studentIkm = ikmRecords.find((r: any) => r.schuelerId === student.id);
                  const lernpfad = (app.lernpfade || {})[student.id];
                  const isGenerating = isGeneratingPath === student.id;

                  return (
                     <div key={student.id} className="bg-white rounded-[2rem] border border-slate-200 hover:border-slate-350 shadow-sm flex flex-col justify-between h-full relative  group hover:shadow-md transition-all">
                        <div className="p-4 sm:p-6 space-y-4 flex-1">
                           <div className="flex justify-between items-start text-left">
                              <div>
                                 <h4 className="text-[1.25rem] leading-normal font-black text-slate-900 leading-tight flex items-center gap-2"><span>{student.nachname} {student.vorname}</span>{renderStudentTrend(student.id, true)}</h4>
                                 <p className="text-[0.625rem] text-slate-500 font-bold uppercase">{studentIkm ? `Stufe ${studentIkm.schulstufe} • ${studentIkm.schuljahr}` : 'Keine IKM Daten'}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                 {studentIkm && (
                                    <button 
                                       onClick={(e) => handleDeleteIkm(studentIkm.id, e)}
                                       className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                       title="IKM Löschen"
                                    >
                                       <Trash2 size={16} />
                                    </button>
                                 )}
                                 {studentIkm?.pdfInhalt && <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><FileCheck size={16} /></div>}
                              </div>
                           </div>

                           {studentIkm ? (
                             <div className="space-y-4 pt-2 text-left">
                                <div className="grid grid-cols-2 gap-2">
                                   <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col">
                                      <span className="text-[0.5rem] font-extrabold text-slate-400">PR Lesen</span>
                                      <span className="text-[0.875rem] leading-snug font-black text-slate-700">{formatIkmScore(studentIkm.deutschLesenPR)}</span>
                                   </div>
                                   <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col">
                                      <span className="text-[0.5rem] font-extrabold text-slate-400">PR Mathe</span>
                                      <span className="text-[0.875rem] leading-snug font-black text-slate-700">{formatIkmScore(studentIkm.mathematikPR)}</span>
                                   </div>
                                </div>

                                <div className="pt-2 border-t border-slate-100 space-y-4">
                                  <div className="flex justify-between items-center">
                                    <h5 className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MapIcon size={11} className="text-indigo-500" /> Schatzkarten-Pfad</h5>
                                    {!lernpfad && <button onClick={() => generateLernpfad(student.id, studentIkm)} disabled={isGenerating} className="text-[0.5625rem] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{isGenerating ? 'Weg zeichnen...' : 'Karte erstellen'}</button>}
                                  </div>

                                  <AnimatePresence mode="wait">
                                    {lernpfad ? (
                                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                                        {/* Visual Treasure Map Path */}
                                        <div className="relative h-24 mb-4 bg-slate-50 rounded-2xl border border-slate-100 ">
                                          <svg className="absolute inset-0 w-full h-full p-2" viewBox="0 0 100 60">
                                            <defs>
                                              <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                                                <path d="M 0 0 L 10 5 L 0 10 z" fill="#818cf8" />
                                              </marker>
                                            </defs>
                                            <path 
                                              d="M 10 50 C 30 50, 20 10, 50 10 C 80 10, 70 50, 90 50" 
                                              fill="none" 
                                              stroke="#e2e8f0" 
                                              strokeWidth="2" 
                                              strokeDasharray="4 3" 
                                            />
                                            <motion.path 
                                              d="M 10 50 C 30 50, 20 10, 50 10 C 80 10, 70 50, 90 50" 
                                              fill="none" 
                                              stroke="#818cf8" 
                                              strokeWidth="2" 
                                              strokeDasharray="4 3"
                                              initial={{ pathLength: 0 }}
                                              animate={{ pathLength: 1 }}
                                              transition={{ duration: 2, ease: "easeInOut" }}
                                            />
                                            {/* Station 1 */}
                                            <circle cx="10" cy="50" r="4" fill="#818cf8" />
                                            <text x="10" y="44" fontSize="5" fontWeight="bold" textAnchor="middle" fill="#6366f1">1</text>
                                            
                                            {/* Station 2 */}
                                            <circle cx="50" cy="10" r="4" fill="#818cf8" />
                                            <text x="50" y="20" fontSize="5" fontWeight="bold" textAnchor="middle" fill="#6366f1">2</text>
                                            
                                            {/* Station 3 / Goal */}
                                            <path d="M 88 45 L 95 45 L 91.5 53 z" fill="#fbbf24" stroke="#d97706" />
                                            <text x="90" y="42" fontSize="5" fontWeight="bold" textAnchor="middle" fill="#d97706">Ziel</text>
                                          </svg>
                                        </div>

                                        <div className="space-y-3">
                                          {lernpfad.stationen.map((st: any, i: number) => (
                                            <motion.div 
                                              key={i} 
                                              initial={{ opacity: 0, x: -12 }} 
                                              animate={{ opacity: 1, x: 0 }} 
                                              transition={{ duration: 0.25, delay: i * 0.08 }}
                                              className="flex gap-3 items-start group"
                                            >
                                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[0.5625rem] font-black text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors">{i+1}</span>
                                              <div className="text-left">
                                                <p className="text-[0.625rem] font-black text-slate-800 leading-tight">{st.titel}</p>
                                                <p className="text-[0.5625rem] text-slate-400 font-bold leading-tight line-clamp-2">{st.aufgabe}</p>
                                              </div>
                                            </motion.div>
                                          ))}
                                        </div>

                                        {/* Eltern-Ratgeber logic integration */}
                                        <div className="pt-4 border-t border-slate-100">
                                          <div className="flex items-center gap-2 mb-2">
                                            <Lightbulb size={12} className="text-amber-500" />
                                            <span className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Spielerischer Eltern-Ratgeber</span>
                                          </div>
                                          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 flex flex-col gap-2">
                                            <p className="text-[0.625rem] text-slate-700 font-bold leading-tight">
                                              {studentIkm.mathematikPR < 40 && (studentIkm.matheDetails?.groessen < 30 || studentIkm.matheDetails?.ebeneRaum < 30) 
                                                ? "🎲 Mathe-Idee: Backen Sie am Wochenende gemeinsam einen Kuchen (Größen abwiegen) oder spielen Sie 'Stadt-Land-Fülle' mit Raumlage-Begriffen."
                                                : lernpfad.elternTipps?.[0] || "Tipp: Integrieren Sie kleine Lese-Rätsel in den Alltag, z.B. beim Einkaufen oder Kochen."}
                                            </p>
                                          </div>
                                        </div>
                                      </motion.div>
                                    ) : !isGenerating && <div className="text-center text-[0.625rem] text-slate-300 font-bold italic py-4 sm:py-8 border-2 border-dashed border-slate-50 rounded-2xl">Kein Pfad erstellt.</div>}
                                  </AnimatePresence>
                                </div>
                             </div>
                           ) : <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl text-[0.75rem] leading-tight text-slate-300 italic">IKM-Daten erfassen</div>}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                           <button onClick={() => { setTextHelperInitial(studentIkm?.kommentar || ''); setTextHelperTarget({ studentId: student.id, ikmId: studentIkm?.id || '' }); setTextHelperOpen(true); }} className="flex items-center gap-1.5 text-[0.5625rem] font-black text-slate-500"><MessageCircle size={12} /> KI-Text</button>
                           <button onClick={() => { setSelectedStudentId(student.id); setActiveTab('verlaeufe'); }} className="flex items-center gap-1 text-[0.625rem] font-black text-indigo-600">Details <ChevronRight size={14} /></button>
                        </div>
                     </div>
                  );
                })}
              </div>
          </motion.div>
        )}

        {activeTab === 'antolin' && (
          <motion.div key="antolin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/30 border border-slate-200 rounded-[2rem] p-6 sm:p-8 space-y-6 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[0.5625rem] font-black uppercase tracking-wider text-blue-600 bg-blue-100 rounded-full">
                    📖 Antolin Leseförderung
                  </span>
                  <h4 className="text-[1.125rem] leading-normal font-black text-slate-900">Antolin-Leistungsberichte verwalten</h4>
                  <p className="text-slate-500 text-xs">Füge Klassenberichte via PDF-Upload, Copy-Paste oder manuell hinzu, wertete deren Trends in der Statistik aus.</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-600 block">Erhebungsdatum:</label>
                  <input 
                    type="date" 
                    value={antolinUploadDate} 
                    onChange={(e) => setAntolinUploadDate(e.target.value)} 
                    className="border border-slate-200 rounded-xl px-3 py-1 text-xs bg-white text-slate-700 font-medium"
                  />
                </div>
              </div>

              {/* Import Options: PDF & Copy-Paste Bento Boxes */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Option 1: PDF Upload */}
                <div className="bg-white border border-slate-100 rounded-3xl p-5 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h5 className="text-[0.875rem] leading-snug font-black text-slate-800">1. Antolin PDF Hochladen</h5>
                    <p className="text-slate-500 text-[0.75rem]">Wähle den PDF-Klassenbericht aus. Die KI erstellt einen Auslesevorschlag, den du vor dem Speichern vollständig prüfen musst.</p>
                  </div>
                  
                  {!isAnalyzingAntolin && !antolinAnalysisPreview && (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/10 py-8 px-4 rounded-2xl cursor-pointer transition-all text-center">
                      <input type="file" accept="application/pdf" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => startAntolinAnalysis(reader.result as string, undefined);
                          reader.readAsDataURL(file);
                        }
                      }} />
                      <UploadCloud size={28} className="text-blue-500 mb-2" />
                      <span className="text-[0.7rem] font-bold text-slate-700">Klassenbericht PDF hier ablegen</span>
                    </label>
                  )}

                  {isAnalyzingAntolin && (
                    <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 bg-blue-50/50 rounded-3xl border border-blue-100">
                      <Loader2 size={32} className="animate-spin text-blue-500" />
                      <span className="text-[0.75rem] font-black text-blue-600 uppercase tracking-widest animate-pulse">KI analysiert Antolin-Report...</span>
                    </div>
                  )}
                  
                  {antolinAnalysisPreview && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl text-[0.7rem] font-medium flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                      <span>Bericht erfolgreich eingelesen. Bitte überprüfe die Vorschau unten!</span>
                    </div>
                  )}
                </div>

                {/* Option 2: Copy-Paste Text */}
                <div className="bg-white border border-slate-100 rounded-3xl p-5 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h5 className="text-[0.875rem] leading-snug font-black text-slate-800">2. Text kopieren & einfügen</h5>
                    <p className="text-slate-500 text-[0.75rem]">Kopiere die Tabelle oder Zeilen aus der Browser-Klassenübersicht und füge sie hier ein.</p>
                  </div>

                  <div className="space-y-3">
                    <textarea 
                      placeholder="Z.B.: Eymen Alici 16 345 75,5% 2,4..."
                      value={antolinUploadRawText}
                      onChange={(e) => setAntolinUploadRawText(e.target.value)}
                      className="w-full h-24 border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-medium resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-inner"
                    />
                    <button
                      onClick={() => {
                        if (!antolinUploadRawText.trim()) { alert('Bitte Text einfügen.'); return; }
                        startAntolinAnalysis(undefined, antolinUploadRawText);
                      }}
                      disabled={isAnalyzingAntolin || !antolinUploadRawText.trim()}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-[0.625rem] tracking-wider uppercase rounded-xl transition-all disabled:opacity-50"
                    >
                      Einlesen & Analysieren
                    </button>
                  </div>
                </div>

              </div>

              {/* Preview & Confirmation Section */}
              {antolinAnalysisPreview && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4 text-left">
                  <div className="flex justify-between items-center border-b pb-3 border-slate-100">
                    <div>
                      <h5 className="text-[0.875rem] leading-snug font-black text-slate-800">Gefundene Auswertungszeilen ({antolinAnalysisPreview.length})</h5>
                      <p className="text-slate-400 text-[0.7rem]">Überprüfe und bestätige den Eintrag.</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setAntolinAnalysisPreview(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[0.625rem] font-black uppercase">Verwerfen</button>
                      <button onClick={handleConfirmAntolinImport} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[0.625rem] font-black uppercase shadow-sm">Übernehmen & Speichern</button>
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-[450px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 uppercase text-[0.5625rem] tracking-widest font-black border-b border-slate-100 font-sans">
                          <th className="p-2.5 rounded-l-xl">Zugeordneter Schüler</th>
                          <th className="p-2.5 text-center">Bücher</th>
                          <th className="p-2.5 text-center">Punkte</th>
                          <th className="p-2.5 text-center">Erfolg %</th>
                          <th className="p-2.5 text-center">Schwierigkeit</th>
                          <th className="p-2.5 rounded-r-xl text-right">Aktion</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                        {antolinAnalysisPreview.map((item, idx) => (
                          <motion.tr 
                            key={idx} 
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: idx * 0.04 }}
                            className="hover:bg-slate-50/40"
                          >
                            <td className="p-2.5">
                              <select 
                                value={item.studentId || ''} 
                                onChange={(e) => handleUpdatePreviewItem(idx, 'studentId', e.target.value)}
                                className="w-full min-h-8 border border-slate-200 rounded-lg px-2 py-0.5 bg-white text-slate-700 text-xs font-sans font-bold select-none"
                              >
                                <option value="">-- Nicht zugeordnet --</option>
                                {(app.schueler || []).map(s => (
                                  <option key={s.id} value={s.id}>{s.nachname} {s.vorname}</option>
                                ))}
                              </select>
                              {item.studentNameConfirmed && (
                                <div className="text-[0.625rem] text-slate-400 pl-2 mt-0.5 font-sans font-medium" title={item.studentNameConfirmed}>
                                  Aus PDF: <span className="font-bold">{item.studentNameConfirmed}</span>
                                </div>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              <input 
                                type="number" 
                                value={item.anzahlBuecher ?? ''} 
                                onChange={(e) => handleUpdatePreviewItem(idx, 'anzahlBuecher', e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-16 border border-slate-200 rounded-lg px-1.5 py-1 text-center font-mono text-slate-700 text-xs"
                              />
                            </td>
                            <td className="p-2.5 text-center">
                              <input 
                                type="number" 
                                value={item.punkte ?? ''} 
                                onChange={(e) => handleUpdatePreviewItem(idx, 'punkte', e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-20 border border-slate-200 rounded-lg px-1.5 py-1 text-center font-mono text-slate-800 font-bold text-xs bg-amber-50/50"
                              />
                            </td>
                            <td className="p-2.5 text-center">
                              <div className="inline-flex items-center gap-1">
                                <input 
                                  type="number" 
                                  step="0.1" 
                                  value={item.leistung ?? ''} 
                                  onChange={(e) => handleUpdatePreviewItem(idx, 'leistung', e.target.value === '' ? '' : Number(e.target.value))}
                                  className="w-16 border border-slate-200 rounded-lg px-1.5 py-1 text-center font-mono text-slate-700 text-xs"
                                />
                                <span className="text-slate-400 font-mono text-[0.65rem]">%</span>
                              </div>
                            </td>
                            <td className="p-2.5 text-center">
                              <input 
                                type="number" 
                                step="0.1" 
                                value={item.schwierigkeit ?? ''} 
                                onChange={(e) => handleUpdatePreviewItem(idx, 'schwierigkeit', e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-16 border border-slate-200 rounded-lg px-1.5 py-1 text-center font-mono text-slate-700 text-xs"
                              />
                            </td>
                            <td className="p-2.5 text-right">
                              <button 
                                onClick={() => {
                                  const updated = antolinAnalysisPreview.filter((_, i) => i !== idx);
                                  setAntolinAnalysisPreview(updated.length > 0 ? updated : null);
                                }}
                                className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                                title="Zeile entfernen"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Manual Single Entry Form */}
              <div className="bg-white rounded-3xl border border-slate-100 p-5 space-y-4">
                <h5 className="text-[0.875rem] leading-snug font-black text-slate-800">Alternativ: Manueller Einzeleintrag</h5>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="space-y-1">
                    <label className="text-[0.625rem] font-black uppercase text-slate-500 tracking-wider">Schüler/in</label>
                    <select 
                      value={manualAntolinStudentId} 
                      onChange={(e) => setManualAntolinStudentId(e.target.value)}
                      className="w-full min-h-10 border border-slate-200 rounded-xl px-3 py-1 bg-white text-slate-700 text-xs font-sans"
                    >
                      <option value="">Wählen...</option>
                      {(app.schueler || []).map(s => (
                        <option key={s.id} value={s.id}>{s.nachname} {s.vorname}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[0.625rem] font-black uppercase text-slate-500 tracking-wider">Gelesene Bücher</label>
                    <input 
                      type="number" 
                      placeholder="z.B. 12"
                      value={manualAntolinBooks} 
                      onChange={(e) => setManualAntolinBooks(e.target.value)}
                      className="w-full min-h-10 border border-slate-200 rounded-xl px-3 py-1 bg-white text-slate-700 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[0.625rem] font-black uppercase text-slate-500 tracking-wider">Punkte</label>
                    <input 
                      type="number" 
                      placeholder="z.B. 250"
                      value={manualAntolinPoints} 
                      onChange={(e) => setManualAntolinPoints(e.target.value)}
                      className="w-full min-h-10 border border-slate-200 rounded-xl px-3 py-1 bg-white text-slate-700 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[0.625rem] font-black uppercase text-slate-500 tracking-wider">Erfolg %</label>
                    <input 
                      type="number" 
                      step="0.1"
                      placeholder="z.B. 85.5"
                      value={manualAntolinLeistung} 
                      onChange={(e) => setManualAntolinLeistung(e.target.value)}
                      className="w-full min-h-10 border border-slate-200 rounded-xl px-3 py-1 bg-white text-slate-700 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[0.625rem] font-black uppercase text-slate-500 tracking-wider">Ø Schwierigkeit</label>
                    <input 
                      type="number" 
                      step="0.1"
                      placeholder="z.B. 2.1"
                      value={manualAntolinSchwierigkeit} 
                      onChange={(e) => setManualAntolinSchwierigkeit(e.target.value)}
                      className="w-full min-h-10 border border-slate-200 rounded-xl px-3 py-1 bg-white text-slate-700 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button 
                    onClick={handleAddManualAntolin}
                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-[0.625rem] font-black uppercase tracking-wider transition-all"
                  >
                    Eintragen
                  </button>
                </div>
              </div>

            </div>

            {/* Current Table Of All Records */}
            {(() => {
              const activeStudentIds = new Set((app.schueler || []).map(s => s.id));
              const classAntolinRecords = (app.antolinRecords || []).filter(r => activeStudentIds.has(r.schuelerId));

              return (
                <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm text-left">
                  <h5 className="text-[1rem] font-black text-slate-800 mb-4 font-sans">Gespeicherte Antolin-Einträge ({ classAntolinRecords.length })</h5>
                  
                  {classAntolinRecords.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-xs">Noch keine Antolin-Einträge für diese Klasse erfasst. Nutze die obigen Optionen.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-600 uppercase text-[0.5625rem] tracking-widest font-black border-b border-slate-100 font-sans">
                            <th className="p-3">Datum</th>
                            <th className="p-3">Schüler/in</th>
                            <th className="p-3">Gelesene Bücher</th>
                            <th className="p-3">Punkte</th>
                            <th className="p-3">Leistung %</th>
                            <th className="p-3">Schwierigkeit</th>
                            <th className="p-3 text-right">Aktion</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {[...classAntolinRecords]
                            .sort((a,b) => b.datum.localeCompare(a.datum) || getStudentName(a.schuelerId).localeCompare(getStudentName(b.schuelerId)))
                            .map((rec) => (
                            <tr key={rec.id} className="hover:bg-slate-50/50">
                              <td className="p-3 font-mono text-slate-500 whitespace-nowrap">{new Date(rec.datum).toLocaleDateString('de-DE')}</td>
                              <td className="p-3 font-black text-slate-700">{getStudentName(rec.schuelerId)}</td>
                              <td className="p-3 font-mono text-slate-600">{rec.anzahlBuecher}</td>
                              <td className="p-3 font-mono text-slate-800 font-bold"><span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[0.65rem] font-sans font-black">{rec.punkte} Pkt</span></td>
                              <td className="p-3 font-mono text-slate-600">{rec.leistung}%</td>
                              <td className="p-3 font-mono text-slate-600">ST {rec.schwierigkeit}</td>
                              <td className="p-3 text-right">
                                <button onClick={() => handleDeleteAntolinRecord(rec.id)} className="text-rose-500 hover:text-rose-700 p-1 rounded-lg transition-colors cursor-pointer inline-flex items-center">
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}

          </motion.div>
        )}

        {activeTab === 'ziele' && (
          <motion.div key="ziele" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8 text-left">
            {/* Header info */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <h3 className="text-[1.25rem] leading-normal font-black text-slate-900 tracking-tight">Kind-Zentrierte Ziel-Diagnostik 🎯</h3>
                <p className="text-slate-500 font-bold text-[0.75rem] leading-tight font-sans">Hier können Kinder eigenständige, kurzfristige Meilensteine in der Schule oder im Leben formulieren und reflektieren.</p>
              </div>
              <div className="flex gap-2">
                <span className="px-3.5 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[0.65rem] rounded-full">
                  SMART-Methode integriert
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Form: Formulate Goals */}
              <div className="lg:col-span-5 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                <div>
                  <h4 className="text-[1rem] font-black text-slate-800 flex items-center gap-2">
                    <Plus className="text-indigo-600" size={18} />
                    Neues Ziel eintragen
                  </h4>
                  <p className="text-slate-400 text-xs mt-0.5 font-sans">Formulieren Sie gemeinsam mit dem Kind ein motivierendes, erreichbares Ziel.</p>
                </div>

                {/* Student dropdown */}
                <div className="space-y-2 font-sans">
                  <label className="block text-[0.625rem] font-black uppercase text-slate-400 tracking-wider">Möchte ein Ziel vereinbaren:</label>
                  <select 
                    value={goalStudentId}
                    onChange={(e) => setGoalStudentId(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Kind auswählen --</option>
                    {(app.schueler || []).map(student => (
                      <option key={student.id} value={student.id}>
                        {student.emoji || '👤'} {student.vorname} {student.nachname}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category selectors */}
                <div className="space-y-2 font-sans">
                  <label className="block text-[0.625rem] font-black uppercase text-slate-400 tracking-wider">Ziel-Bereich:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGoalBereich('schule')}
                      className={`py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                        goalBereich === 'schule' 
                          ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-sm' 
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      🏫 In der Schule
                    </button>
                    <button
                      type="button"
                      onClick={() => setGoalBereich('leben')}
                      className={`py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                        goalBereich === 'leben' 
                          ? 'bg-indigo-50 text-indigo-800 border-indigo-200 shadow-sm' 
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      🌟 Im Leben & Alltag
                    </button>
                  </div>
                </div>

                {/* Goal suggestions */}
                <div className="space-y-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 font-sans">
                  <span className="block text-[0.625rem] font-black uppercase text-slate-400 tracking-wider">Inspirierende Vorschläge (Klick zum Übernehmen):</span>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pt-1">
                    {goalBereich === 'schule' ? (
                      [
                        'Ich melde mich in jeder Stunde mindestens zweimal.',
                        'Ich halte meinen Tisch am Unterrichtsende sauber.',
                        'Ich frage am Tisch 3 Kinder, bevor ich die Lehrperson frage.',
                        'Ich lese täglich 15 Minuten in meinem Lieblingsbuch.',
                        'Ich beende meine Stationenarbeiten vor dem Wochenende.',
                        'Ich gehe nach dem Läuten direkt an meinen Sitzplatz.'
                      ].map((s, i) => (
                        <button
                          key={i}
                          onClick={() => setGoalText(s)}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-amber-50 hover:border-amber-300 text-[0.65rem] text-slate-600 rounded-lg transition-colors cursor-pointer text-left font-bold"
                        >
                          {s}
                        </button>
                      ))
                    ) : (
                      [
                        'Ich gehe abends pünktlich um 20:30 Uhr schlafen.',
                        'Ich helfe jeden Tag einmal freiwillig im Haushalt.',
                        'Ich trinke am Vormittag meine ganze Trinkflasche aus.',
                        'Ich mache jeden Tag ein echtes Kompliment an jemanden.',
                        'Ich packe meine Schultasche am Vorabend fertig packen.',
                        'Ich atme dreimal durch, wenn ich mich beim Spielen ärgere.'
                      ].map((s, i) => (
                        <button
                          key={i}
                          onClick={() => setGoalText(s)}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 text-[0.65rem] text-slate-600 rounded-lg transition-colors cursor-pointer text-left font-bold"
                        >
                          {s}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Goal Input text */}
                <div className="space-y-2 font-sans">
                  <div className="flex justify-between items-center">
                    <label className="block text-[0.625rem] font-black uppercase text-slate-400 tracking-wider">Das formulierte Ziel (Ich-Form):</label>
                    <button
                      type="button"
                      disabled={isRefiningGoal || !goalText.trim()}
                      onClick={async () => {
                        if (!goalText.trim()) return;
                        setIsRefiningGoal(true);
                        try {
                          const text = await callServerAI('generateContent', {
                            contents: `Du bist ein einfühlsamer Pädagoge und Coach für Volksschulkinder (6-10 Jahre in Österreich). Deine Aufgabe ist es, das folgende kurzfristige Ziel des Kindes kindgerecht, motivierend, konkret handlungsorientiert und nach der SMART-Methode zu veredeln.
                         
Das Ziel MUSS in der ICH-Form verfasst sein. Es soll so einfach und klar sein, dass das Kind es sofort begreift und selbst überprüfen kann. Nutze keine komplizierte Sprache. Bring es auf den Punkt in maximal 1-2 Sätzen (unter 25 Wörtern).

Ziel: "${goalText}"
Bereich: ${goalBereich === 'schule' ? 'in der Schule' : 'im Leben'}

Antworte NUR mit dem veredelten Ich-Ziel, ohne Anführungszeichen, ohne Einleitung, ohne Floskeln.`,
                            config: { temperature: 0.5 }
                          });
                          if (text) {
                            setGoalText(text.trim());
                          }
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setIsRefiningGoal(false);
                        }
                      }}
                      className="inline-flex items-center gap-1 text-[0.65rem] text-indigo-600 font-extrabold hover:text-indigo-800 disabled:opacity-50 cursor-pointer"
                    >
                      <Sparkles size={11} className={isRefiningGoal ? "animate-spin" : ""} />
                      {isRefiningGoal ? "Veredele..." : "SMART Veredelung 🪄"}
                    </button>
                  </div>
                  <textarea
                    value={goalText}
                    onChange={(e) => setGoalText(e.target.value)}
                    rows={3}
                    placeholder="z.B. Ich möchte mich öfter im Matheunterricht melden..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
                  />
                </div>

                {/* Date */}
                <div className="space-y-2 font-sans">
                  <label className="block text-[0.625rem] font-black uppercase text-slate-400 tracking-wider">Datum der Vereinbarung:</label>
                  <input
                    type="date"
                    value={goalDate}
                    onChange={(e) => setGoalDate(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!goalStudentId) {
                      alert('Bitte wähle zuerst ein Kind aus.');
                      return;
                    }
                    if (!goalText.trim()) {
                      alert('Bitte formuliere zuerst einen Zieltext.');
                      return;
                    }

                    const newGoal = {
                      id: 'goal_' + Date.now(),
                      schuelerId: goalStudentId,
                      bereich: goalBereich,
                      zielText: goalText,
                      datum: goalDate,
                      status: 'aktiv' as const
                    };

                    setApp((prev: any) => ({
                      ...prev,
                      schuelerGoals: [
                        ...(prev.schuelerGoals || []),
                        newGoal
                      ]
                    }));

                    setGoalText('');
                    alert('Ziel erfolgreich vereinbart!');
                  }}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 font-sans uppercase tracking-widest text-[0.625rem]"
                >
                  <Target size={16} />
                  Ziel aktiv vereinbaren
                </button>
              </div>

              {/* Right Column: List & Filter of existing children goals */}
              <div className="lg:col-span-7 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h4 className="text-[1rem] font-black text-slate-800">Vereinbarte Meilensteine</h4>
                    <p className="text-slate-400 text-xs font-sans">Verwalten und dokumentieren Sie die Zielerreichung der Klasse.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto font-sans">
                    {/* Student selector filter */}
                    <select
                      value={goalFilterStudentId}
                      onChange={(e) => setGoalFilterStudentId(e.target.value)}
                      className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-[0.7rem] font-bold text-slate-600 focus:outline-none"
                    >
                      <option value="all">Alle Kinder</option>
                      {(app.schueler || []).map(student => (
                        <option key={student.id} value={student.id}>
                          {student.vorname} {student.nachname}
                        </option>
                      ))}
                    </select>

                    {/* Status selection */}
                    <select
                      value={goalFilterStatus}
                      onChange={(e) => setGoalFilterStatus(e.target.value as any)}
                      className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-[0.7rem] font-bold text-slate-600 focus:outline-none"
                    >
                      <option value="all">Alle Statuswerte</option>
                      <option value="aktiv">Aktiv 🎯</option>
                      <option value="erreicht">Erreicht 🏆</option>
                      <option value="verworfen">Verworfen 🗑️</option>
                    </select>
                  </div>
                </div>

                {/* List container */}
                {(() => {
                  const filteredGoals = (app.schuelerGoals || []).filter((goal: any) => {
                    const studentMatch = goalFilterStudentId === 'all' || goal.schuelerId === goalFilterStudentId;
                    const statusMatch = goalFilterStatus === 'all' || goal.status === goalFilterStatus;
                    return studentMatch && statusMatch;
                  });

                  if (filteredGoals.length === 0) {
                    return (
                      <div className="py-12 text-center text-slate-400 space-y-2 font-sans">
                        <Target size={36} className="mx-auto text-slate-200 block" />
                        <span className="block text-xs font-bold text-slate-500">Keine vereinbarten Ziele gefunden</span>
                        <span className="block text-[0.65rem] text-slate-400 max-w-sm mx-auto">Verwenden Sie das linke Formular, um das erste Ziel für ein Schulkind zu hinterlegen.</span>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4 max-h-[32rem] overflow-y-auto pr-1">
                      {filteredGoals.map((goal: any) => {
                        const student = (app.schueler || []).find((s: any) => s.id === goal.schuelerId);
                        if (!student) return null;

                        return (
                          <motion.div 
                            key={goal.id} 
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                            className={`p-4 rounded-2xl border transition-all text-left space-y-3 relative ${
                              goal.status === 'erreicht' 
                                ? 'bg-emerald-50/40 border-emerald-100' 
                                : goal.status === 'verworfen'
                                ? 'bg-slate-50 border-slate-100 opacity-60'
                                : goal.bereich === 'schule'
                                ? 'bg-amber-50/30 border-amber-100'
                                : 'bg-indigo-50/20 border-indigo-100'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 font-sans">
                                  <span className="text-xs font-black text-slate-900">
                                    {student.emoji || '👤'} {student.vorname} {student.nachname}
                                  </span>
                                  <span className="text-[0.65rem] text-slate-450">•</span>
                                  <span className="text-[0.65rem] text-slate-450 font-bold">
                                    {new Date(goal.datum).toLocaleDateString('de-DE')}
                                  </span>
                                </div>
                                
                                <p className="text-xs font-bold text-slate-700 leading-relaxed font-sans italic">
                                  "{goal.zielText}"
                                </p>
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0 font-sans">
                                {goal.bereich === 'schule' ? (
                                  <span className="px-2 py-0.5 bg-amber-50 text-amber-800 text-[0.55rem] font-black uppercase rounded-md tracking-wider border border-amber-200">
                                    🏫 Schule
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 text-[0.55rem] font-black uppercase rounded-md tracking-wider border border-indigo-100">
                                    🌟 Leben
                                  </span>
                                )}

                                {goal.status === 'aktiv' && (
                                  <span className="px-2 py-0.5 bg-sky-50 text-sky-800 text-[0.55rem] font-black uppercase rounded-md tracking-wider border border-sky-200">
                                    Aktiv 🎯
                                  </span>
                                )}
                                {goal.status === 'erreicht' && (
                                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[0.55rem] font-black uppercase rounded-md tracking-wider border border-emerald-250">
                                    Erreicht 🏆
                                  </span>
                                )}
                                {goal.status === 'verworfen' && (
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[0.55rem] font-black uppercase rounded-md tracking-wider">
                                    Verworfen
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Optional reflection block for achieved goals */}
                            {goal.status === 'erreicht' && goal.reflexion && (
                              <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 text-[0.7rem] text-emerald-800 font-bold font-sans">
                                <span className="block text-[0.55rem] uppercase tracking-wider text-emerald-500 font-black mb-0.5">Reflexion / Rückmeldung:</span>
                                {goal.reflexion}
                              </div>
                            )}

                            {/* Action Row */}
                            <div className="flex justify-between items-center pt-2 border-t border-slate-100 font-sans">
                              <div className="flex items-center gap-2">
                                {goal.status === 'aktiv' && (
                                  <>
                                    <button
                                      onClick={() => {
                                        const reflexion = prompt('Füge eine kurze Reflexion oder Belobigung für das Kind hinzu (optional):') || '';
                                        setApp((prev: any) => ({
                                          ...prev,
                                          schuelerGoals: prev.schuelerGoals.map((g: any) => 
                                            g.id === goal.id 
                                              ? { ...g, status: 'erreicht', erledigtAm: formatLocalDateKey(new Date()), reflexion } 
                                              : g
                                          )
                                        }));
                                      }}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[0.5625rem] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                                    >
                                      🏆 Erreicht
                                    </button>
                                    <button
                                      onClick={() => {
                                        setApp((prev: any) => ({
                                          ...prev,
                                          schuelerGoals: prev.schuelerGoals.map((g: any) => 
                                            g.id === goal.id ? { ...g, status: 'verworfen' } : g
                                          )
                                        }));
                                      }}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider transition-all cursor-pointer"
                                    >
                                      🗑️ Verwerfen
                                    </button>
                                  </>
                                )}
                                {goal.status !== 'aktiv' && (
                                  <button
                                    onClick={() => {
                                      setApp((prev: any) => ({
                                        ...prev,
                                        schuelerGoals: prev.schuelerGoals.map((g: any) => 
                                          g.id === goal.id ? { ...g, status: 'aktiv', erledigtAm: undefined, reflexion: undefined } : g
                                        )
                                      }));
                                    }}
                                    className="px-2.5 py-1 bg-slate-150 hover:bg-slate-200 text-slate-600 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider transition-all cursor-pointer"
                                  >
                                    Reaktivieren 🔄
                                  </button>
                                )}
                              </div>

                              <button
                                onClick={() => {
                                  if (confirm('Dieses Ziel wirklich endgültig löschen?')) {
                                    setApp((prev: any) => ({
                                      ...prev,
                                      schuelerGoals: prev.schuelerGoals.filter((g: any) => g.id !== goal.id)
                                    }));
                                  }
                                }}
                                className="text-rose-500 hover:text-rose-700 p-1 rounded-md transition-colors cursor-pointer"
                                title="Endgültig löschen"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  );
                })()}

              </div>

            </div>

          </motion.div>
        )}

        {activeTab === 'gabicquest' && (
          <motion.div key="gabicquest" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <GabicQuest />
          </motion.div>
        )}

        {activeTab === 'liveDiagnostik' && (
          <motion.div key="liveDiagnostik" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <LiveDiagnostik />
          </motion.div>
        )}

        {activeTab === 'klassenscreening' && (
          <motion.div key="klassenscreening" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            {/* Horizontal subtab navigation */}
            <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 w-fit mb-4 select-none">
              <button 
                onClick={() => setSubtabKlassenAnalyse('screening')}
                className={`px-4 py-2 rounded-xl text-[0.6875rem] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${subtabKlassenAnalyse === 'screening' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <ClipboardList size={14} /> 1. Kognitiver Basis-Check
              </button>
              <button 
                onClick={() => setSubtabKlassenAnalyse('antolin')}
                className={`px-4 py-2 rounded-xl text-[0.6875rem] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${subtabKlassenAnalyse === 'antolin' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <BookOpen size={14} /> 2. Antolin Klassen-Analyse (Lese-Profil)
              </button>
            </div>

            {subtabKlassenAnalyse === 'screening' ? (
              <KlassenScreening />
            ) : (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <h3 className="text-[1.25rem] leading-normal font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <BookOpen className="text-amber-500" size={24} /> Antolin Lese-Statistik & Klassen-Entwicklung
                    </h3>
                    <p className="text-slate-500 font-bold text-[0.75rem] leading-tight">Zusammengefasste Analyse über das aktuelle Leseverhalten der gesamten Schulklasse.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-3.5 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 font-bold text-xs rounded-full">
                      Antolin-Klassenbericht
                    </span>
                  </div>
                </div>

                {!antolinClassStats.hasData ? (
                  <div className="bg-white border border-slate-100 rounded-[2rem] p-12 text-center max-w-2xl mx-auto space-y-4">
                    <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-600">
                      <BookOpen size={32} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-[1rem] font-black text-slate-950">Noch keine Antolin-Daten vorhanden</h4>
                      <p className="text-slate-500 text-xs max-w-md mx-auto">
                        In der Schule machen viele Klassen Antolin. Um die Daten, Punkte und Auswertungen der Schüler hier in der Klassen-Analyse zu sehen, lade bitte zuerst Klassenberichte unter dem Reiter "Antolin 📖" hoch.
                      </p>
                    </div>
                    <div>
                      <button 
                        onClick={() => setActiveTab('antolin')}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[0.625rem] font-black uppercase rounded-lg tracking-wider transition-all cursor-pointer"
                      >
                        Zu den Antolin-Uploads
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      
                      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex items-center gap-4">
                        <span className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
                          <BookOpen size={24} />
                        </span>
                        <div>
                          <span className="block text-[0.625rem] font-black uppercase text-slate-400 tracking-wider">Klasse gelesene Bücher</span>
                          <h4 className="text-[1.5rem] leading-none font-black text-slate-900 mt-1">{antolinClassStats.totalBooks}</h4>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex items-center gap-4">
                        <span className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                          <TrendingUp size={24} />
                        </span>
                        <div>
                          <span className="block text-[0.625rem] font-black uppercase text-slate-400 tracking-wider">Gesamte Antolinpunkte</span>
                          <h4 className="text-[1.5rem] leading-none font-black text-slate-900 mt-1">{antolinClassStats.totalPoints} Pkt</h4>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex items-center gap-4">
                        <span className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                          <Activity size={24} />
                        </span>
                        <div>
                          <span className="block text-[0.625rem] font-black uppercase text-slate-400 tracking-wider">Ø Lese-Erfolg</span>
                          <h4 className="text-[1.5rem] leading-none font-black text-slate-900 mt-1">{antolinClassStats.avgLeistung}%</h4>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex items-center gap-4">
                        <span className="p-4 bg-sky-50 text-sky-600 rounded-2xl">
                          <Info size={24} />
                        </span>
                        <div>
                          <span className="block text-[0.625rem] font-black uppercase text-slate-400 tracking-wider">Ø Schwierigkeitsstufe</span>
                          <h4 className="text-[1.5rem] leading-none font-black text-slate-900 mt-1">Stufe {antolinClassStats.avgSchwierigkeit}</h4>
                        </div>
                      </div>

                    </div>

                    {/* Chart & Ranking Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Bar Chart of points */}
                      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm lg:col-span-2 space-y-4">
                        <h4 className="text-[0.8125rem] font-black uppercase text-slate-400 tracking-widest font-sans flex items-center gap-1.5">
                          <BarChart3 size={16} /> Punkte-Vergleich der Schüler:innen
                        </h4>
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={antolinClassStats.classChartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} fontWeight="bold" />
                              <YAxis stroke="#94a3b8" fontSize={9} fontWeight="bold" />
                              <Tooltip cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} />
                              <Bar dataKey="points" name="Antolin-Punkte" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                                {antolinClassStats.classChartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.points > 0 ? '#f59e0b' : '#cbd5e1'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Top readers side list */}
                      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                        <h4 className="text-[0.8125rem] font-black uppercase text-slate-400 tracking-widest font-sans flex items-center gap-1.5 text-amber-700">
                          👑 Lese-König:innen (Ranking)
                        </h4>
                        <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto pr-2 space-y-3 pt-1">
                          {antolinClassStats.classChartData.slice(0, 5).map((row, idx) => (
                            <div key={row.id} className="flex justify-between items-center py-2">
                              <div className="flex items-center gap-2 w-2/3">
                                <span className="text-xs font-black text-slate-400">#{idx + 1}</span>
                                <span className="text-[0.8125rem] font-semibold text-slate-800 truncate">{row.fullName}</span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-xs font-black text-emerald-600">{row.points} Pkt.</span>
                                <span className="text-[10px] text-slate-400">{row.books} Bücher</span>
                              </div>
                            </div>
                          ))}
                          {antolinClassStats.classChartData.length === 0 && (
                            <div className="text-center py-4 text-xs font-bold text-slate-400 italic">Noch keine Daten</div>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Class List Table with comparisons */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-white">
                        <h4 className="text-[0.8125rem] font-black uppercase text-slate-400 tracking-widest font-sans">
                          Schüler-Leseleistungen im Klassenvergleich
                        </h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/70 text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">
                              <th className="px-6 py-4">Name</th>
                              <th className="px-6 py-4">Gelesene Bücher</th>
                              <th className="px-6 py-4">Antolin Punkte</th>
                              <th className="px-6 py-4">Erfolgs-Quote (%)</th>
                              <th className="px-6 py-4">Durchschnittl. Schwierigkeit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-55 flex-1">
                            {antolinClassStats.classChartData.map((student) => {
                              const successColor = student.success >= 75 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : student.success >= 50 
                                  ? 'bg-amber-50 text-amber-700' 
                                  : student.success > 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-400';

                              return (
                                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-6 py-4 font-black text-slate-900 text-[0.875rem]">
                                    {student.fullName}
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <span className="text-[0.875rem] font-bold text-slate-700">{student.books}</span>
                                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                        <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, (student.books / (Math.max(1, antolinClassStats.totalBooks) / antolinClassStats.classChartData.length) * 50))}%` }} />
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-extrabold text-xs rounded-full">
                                      {student.points} Pkt.
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${successColor}`}>
                                      {student.success > 0 ? `${student.success}%` : 'Keine'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-xs font-bold text-slate-500">
                                    {student.difficulty > 0 ? `Klasse ${student.difficulty}` : '—'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {/* Trend & Verlauf Analysis */}
                    <div className="space-y-6 mt-8">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                          <TrendingUp className="text-indigo-500" size={20} /> Antolin Trend-Analyse
                        </h3>
                      </div>
                      
                      {antolinTimelineData.dates.length > 1 ? (
                        <>
                          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-4">
                            <h4 className="text-[0.8125rem] font-black uppercase text-slate-400 tracking-widest font-sans flex items-center gap-1.5">
                              <Activity size={16} /> Punkte-Entwicklung (Klasse)
                            </h4>
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={antolinTimelineData.classTimeline} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                  <XAxis dataKey="formattedDate" stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                                  <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }} />
                                  <Line type="monotone" dataKey="points" name="Gesamtpunkte" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', r: 4, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                  <Line type="monotone" dataKey="books" name="Bücher" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-50 pb-4">
                              <h4 className="text-[0.8125rem] font-black uppercase text-slate-400 tracking-widest font-sans flex items-center gap-1.5">
                                <Activity size={16} /> Schüler:in Vergleich (Verlauf)
                              </h4>
                              <select
                                value={antolinSelectedStudentId}
                                onChange={(e) => setAntolinSelectedStudentId(e.target.value)}
                                className="bg-slate-50 border border-slate-200 text-slate-800 text-[0.875rem] font-bold rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
                              >
                                <option value="all">-- Alle Schüler:innen --</option>
                                {app.schueler?.map(s => (
                                  <option key={s.id} value={s.id}>{s.vorname} {s.nachname}</option>
                                ))}
                              </select>
                            </div>

                            {antolinSelectedStudentId !== 'all' ? (
                              <div className="space-y-4">
                                {antolinTimelineData.studentTimelines.filter(st => st.id === antolinSelectedStudentId).map(studentData => (
                                  <div key={studentData.id} className="space-y-4">
                                    <div className="h-64">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={studentData.timeline} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                          <XAxis dataKey="formattedDate" stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                                          <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }} />
                                          <Line type="monotone" dataKey="points" name={`${studentData.name} (Punkte)`} stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                      </ResponsiveContainer>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      {studentData.timeline.slice(1).map((t, i) => (
                                        <div key={i} className="bg-slate-50 rounded-xl p-4 flex justify-between items-center">
                                          <span className="text-xs font-bold text-slate-500">{studentData.timeline[i].formattedDate} ➔ {t.formattedDate}</span>
                                          <div className="flex gap-4 text-sm font-black">
                                            <span className={t.pointsDiff >= 0 ? "text-emerald-600" : "text-rose-500"}>
                                              {t.pointsDiff > 0 ? '+' : ''}{t.pointsDiff} Pkt
                                            </span>
                                            <span className={t.booksDiff >= 0 ? "text-blue-600" : "text-rose-500"}>
                                              {t.booksDiff > 0 ? '+' : ''}{t.booksDiff} Bücher
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {antolinTimelineData.studentTimelines.filter(st => st.timeline.length > 1).map(studentData => {
                                  const latest = studentData.timeline[studentData.timeline.length - 1];
                                  const diffPkt = latest.pointsDiff;
                                  const diffBooks = latest.booksDiff;
                                  return (
                                    <div key={studentData.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setAntolinSelectedStudentId(studentData.id)}>
                                      <div className="flex justify-between items-center mb-3">
                                        <h5 className="font-bold text-slate-800 text-[0.875rem]">{studentData.name}</h5>
                                        <div className="flex flex-col items-end">
                                           <span className={`text-[0.6875rem] font-black px-2 py-0.5 rounded-full ${diffPkt >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                              {diffPkt > 0 ? '+' : ''}{diffPkt} Pkt
                                           </span>
                                        </div>
                                      </div>
                                      <div className="h-16">
                                        <ResponsiveContainer width="100%" height="100%">
                                          <LineChart data={studentData.timeline}>
                                            <Line type="monotone" dataKey="points" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                                          </LineChart>
                                        </ResponsiveContainer>
                                      </div>
                                      <div className="flex justify-between items-center mt-2 text-[0.625rem] font-bold text-slate-400">
                                         <span>{studentData.timeline[0].formattedDate}</span>
                                         <span>{latest.formattedDate}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                                {antolinTimelineData.studentTimelines.filter(st => st.timeline.length > 1).length === 0 && (
                                  <div className="col-span-full py-8 text-center text-sm font-bold text-slate-400">
                                    Nicht genug Verlaufsdaten für einzelne Schüler vorhanden (mindestens 2 Uploads benötigt).
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="bg-amber-50 rounded-[2rem] p-8 text-center text-amber-700 font-bold text-sm">
                          Für eine Trendanalyse müssen Antolin-Berichte von mindestens zwei unterschiedlichen Tagen hochgeladen sein. Aktuell ist erst ein Datum erfasst.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* --- IPSATIV TAB --- */}
        {activeTab === 'ipsativ' && (
          <motion.div key="ipsativ" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
             <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-3xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-[1.25rem] leading-normal font-black text-slate-900 flex items-center gap-2"><TrendingUp size={20} className="text-emerald-500"/> Lernentwicklung (ipsativ)</h3>
                    <p className="text-[0.75rem] font-medium text-slate-500 mt-1">Stellt den individuellen Lernfortschritt eines Kindes unabhängig vom absoluten Klassenschnitt dar.</p>
                  </div>
                  <div className="flex items-center gap-3">
                     <select 
                       value={ipsativStudentId} 
                       onChange={(e) => setIpsativStudentId(e.target.value)}
                       className="bg-slate-50 border border-slate-200 text-slate-800 text-[0.875rem] font-bold rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20"
                     >
                       <option value="">-- Kind Auswählen --</option>
                       {app.schueler?.map(s => <option key={s.id} value={s.id}>{s.vorname} {s.nachname}</option>)}
                     </select>
                  </div>
                </div>

                {!ipsativStudentId ? (
                   <div className="py-12 flex items-center justify-center text-[0.75rem] font-bold text-slate-400 italic bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">Bitte wähle oben ein Kind aus.</div>
                ) : !ipsativeResults || ipsativeResults.length === 0 ? (
                   <div className="py-12 flex items-center justify-center text-[0.75rem] font-bold text-slate-400 italic bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">Nicht genügend Noten für dieses Kind erfasst (es werden mind. 6 Noten pro Fach benötigt).</div>
                ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                      {ipsativeResults.map((res, i) => (
                         <div key={i} className="bg-white border border-slate-100 rounded-[2rem] shadow-sm p-6 space-y-6 hover:shadow-md transition-shadow relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform"><TrendingUp size={64} /></div>
                           <div className="relative z-10 flex items-center justify-between">
                             <h4 className="font-black text-slate-800 uppercase tracking-widest">{res.fach}</h4>
                             <span className="text-[0.625rem] font-black tracking-widest bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">{res.datenpunkte} Werte</span>
                           </div>

                           <div className="relative z-10 grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                 <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest">Ipsativer Trend</span>
                                 <div className={`text-[1.5rem] font-black ${res.trend === 'steigend' ? 'text-emerald-500' : res.trend === 'fallend' ? 'text-rose-500' : 'text-slate-500'}`}>
                                    {res.trend === 'steigend' ? '📈' : res.trend === 'fallend' ? '📉' : '➡️'} {res.trend === 'steigend' ? '+' : ''}{res.fortschrittProzent.toFixed(1)}%
                                 </div>
                              </div>
                              <div className="space-y-1">
                                 <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest">Schnitt (Absolut)</span>
                                 <div className="text-[1.5rem] font-black text-slate-800">
                                    {res.aktuellerDurchschnitt.toFixed(2)}
                                 </div>
                              </div>
                           </div>
                           
                           <div className="relative z-10 border-t border-slate-50 pt-4">
                             <button
                               onClick={() => {
                                 const er: DiagnostikErhebung = {
                                    id: crypto.randomUUID(),
                                    schuelerId: ipsativStudentId,
                                    testId: 'ipsativ_1',
                                    datum: formatLocalDateKey(new Date()),
                                    schuljahr: app.schuljahr,
                                    schulstufe: app.stufe,
                                    rohwert: 0,
                                    ergebniswert: 0,
                                    durchgefuehrtVon: 'System',
                                    foerderbedarfErkannt: false,
                                    auffaelligkeitErkannt: res.trend === 'fallend',
                                    classId: getDiagnosticClassId(app),
                                    quelle: 'ipsativ',
                                    type: 'ipsativ',
                                    meta: { fach: res.fach, trend: res.trend, wert: res.fortschrittProzent }
                                 };
                                 setApp(prev => ({
                                   ...prev,
                                   diagnostikErhebungen: upsertByKey(
                                     prev.diagnostikErhebungen || [],
                                     [er],
                                     entry => `${entry.schuelerId}|${entry.testId}|${entry.datum}|${entry.meta?.fach || ''}`
                                   )
                                 }));
                                 alert(`Ipsativer Trend für ${res.fach} als Erhebung gespeichert.`);
                               }}
                               className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[0.625rem] font-black uppercase tracking-widest rounded-xl transition-colors"
                             >
                               Zeitschnitt in Dossier Sichern
                             </button>
                           </div>
                         </div>
                      ))}
                   </div>
                )}
             </div>
          </motion.div>
        )}

        {/* --- EXEKUTIVE TAB --- */}
        {activeTab === 'exekutiv' && (
          <motion.div key="exekutiv" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Form Col */}
                <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-3xs space-y-6">
                   <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                     <div>
                       <h3 className="text-[1.25rem] leading-normal font-black text-slate-900 flex items-center gap-2"><Brain size={20} className="text-purple-500"/> Exekutive Erhebung</h3>
                       <p className="text-[0.75rem] font-medium text-slate-500 mt-1">Erfasse basale Steuerungsfunktionen zur Einschätzung des Regulationsverhaltens.</p>
                     </div>
                     <select 
                       value={exeStudentId} 
                       onChange={(e) => setExeStudentId(e.target.value)}
                       className="bg-slate-50 border border-slate-200 text-slate-800 text-[0.875rem] font-bold rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-purple-500/20"
                     >
                       <option value="">-- Kind Auswählen --</option>
                       {app.schueler?.map(s => <option key={s.id} value={s.id}>{s.vorname} {s.nachname}</option>)}
                     </select>
                   </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-1.5 flex-1">
                         <label className="text-[0.625rem] font-black text-slate-500 uppercase tracking-widest block">Datum</label>
                         <input type="date" value={exeDate} onChange={e => setExeDate(e.target.value)} className="w-full px-3 h-10 bg-slate-50 border border-slate-200 rounded-xl text-[0.875rem] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/20" />
                      </div>
                      <div className="space-y-1.5 flex-1">
                         <label className="text-[0.625rem] font-black text-slate-500 uppercase tracking-widest block">Kontext</label>
                         <select value={exeKontext} onChange={e => setExeKontext(e.target.value)} className="w-full px-3 h-10 bg-slate-50 border border-slate-200 rounded-xl text-[0.875rem] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/20">
                            <option value="Freispiel">Freispiel</option>
                            <option value="Plenum">Plenum</option>
                            <option value="Gruppenarbeit">Gruppenarbeit</option>
                            <option value="Einzelarbeit">Einzelarbeit</option>
                            <option value="Übergang">Übergangsphase</option>
                            <option value="Turnen">Turnen / Pause</option>
                         </select>
                      </div>
                   </div>

                   <div className="space-y-6 pt-4">
                      {[
                        { key: 'arbeitsgedaechtnis', label: 'Arbeitsgedächtnis', desc: 'Fähigkeit, Informationen kurzzeitig zu speichern und damit zu arbeiten.' },
                        { key: 'inhibition', label: 'Inhibition (Hemmung)', desc: 'Impulse kontrollieren, Ablenkungen ausblenden, Bedürfnisse aufschieben.' },
                        { key: 'flexibilitaet', label: 'Kognitive Flexibilität', desc: 'Auf Veränderungen einstellen, Perspektiven wechseln, Umdenken.' },
                        { key: 'aktivierung', label: 'Aktivierungsregulation', desc: 'Aufmerksamkeitsfokus aufrecht erhalten, Handlungen initiieren.' },
                        { key: 'emotionen', label: 'Emotionale Kontrolle', desc: 'Eigene Gefühle regulieren, Frustrationstoleranz.' }
                      ].map(fkt => (
                        <div key={fkt.key} className="space-y-2">
                           <div className="flex items-end justify-between">
                             <div>
                               <div className="text-[0.875rem] font-black text-slate-800">{fkt.label}</div>
                               <div className="text-[0.6875rem] font-medium text-slate-400">{fkt.desc}</div>
                             </div>
                             <div className="text-[1.125rem] font-black text-purple-600">{exeScores[fkt.key as keyof typeof exeScores]} <span className="text-[0.75rem] text-slate-400">/ 10</span></div>
                           </div>
                           <input 
                             type="range" min="0" max="10" step="1" 
                             value={exeScores[fkt.key as keyof typeof exeScores]} 
                             onChange={(e) => setExeScores(prev => ({...prev, [fkt.key]: parseInt(e.target.value)}))}
                             className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                           />
                           <div className="flex justify-between text-[0.5625rem] font-black text-slate-300 uppercase tracking-widest px-1">
                             <span>Schwach (0)</span>
                             <span>Mittel (5)</span>
                             <span>Stark (10)</span>
                           </div>
                        </div>
                      ))}
                   </div>

                   <div className="space-y-1.5 pt-4">
                      <label className="text-[0.625rem] font-black text-slate-500 uppercase tracking-widest block">Zusätzliche Beobachtungen</label>
                      <textarea 
                        rows={3} 
                        value={exeComment}
                        onChange={e => setExeComment(e.target.value)}
                        placeholder="Kurze Notizen zur Beobachtung..."
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[0.875rem] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/20"
                      />
                   </div>

                   <div className="flex justify-end pt-2">
                      <button 
                        onClick={handleSaveExekutiv}
                        disabled={!exeStudentId}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[0.75rem] font-black uppercase tracking-widest rounded-xl transition-colors shadow-lg active:scale-95"
                      >
                        Erhebung Sichern
                      </button>
                   </div>
                </div>

                {/* History Col */}
                <div className="bg-white border border-slate-100 rounded-3xl shadow-3xs p-6 space-y-6 h-fit sticky top-6">
                   <h3 className="text-[0.875rem] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-4">
                     <History size={16} className="text-slate-400" /> Bisherige Erhebungen
                   </h3>

                   {!exeStudentId ? (
                      <div className="py-8 text-center text-[0.75rem] font-bold text-slate-400 italic">Kind auswählen für Verlauf.</div>
                   ) : exeHistory.length === 0 ? (
                      <div className="py-8 text-center text-[0.75rem] font-bold text-slate-400 italic">Keine bisherigen Erhebungen dokumentiert.</div>
                   ) : (
                      <div className="space-y-4">
                        {exeHistory.map((erh: any) => (
                          <div key={erh.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 group relative">
                             <div className="flex justify-between items-start">
                               <div className="space-y-1">
                                 <div className="text-[0.625rem] font-black uppercase tracking-widest text-purple-600 bg-purple-100 px-2 py-0.5 rounded-lg w-fit">{erh.datum}</div>
                                 <div className="text-[0.6875rem] font-bold text-slate-500">{erh.meta?.kontext}</div>
                               </div>
                               <button 
                                 onClick={(e) => handleDeleteErhebung(erh.id, e)}
                                 className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                                 title="Löschen"
                               >
                                 <Trash2 size={14} />
                               </button>
                             </div>
                             <div className="grid grid-cols-5 gap-1 pt-2">
                                <div className="text-center">
                                  <div className="text-[0.875rem] font-black text-slate-800">{erh.meta?.arbeitsgedaechtnis}</div>
                                  <div className="text-[0.4375rem] font-black uppercase tracking-tighter text-slate-400">AG</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-[0.875rem] font-black text-slate-800">{erh.meta?.inhibition}</div>
                                  <div className="text-[0.4375rem] font-black uppercase tracking-tighter text-slate-400">Inh</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-[0.875rem] font-black text-slate-800">{erh.meta?.flexibilitaet}</div>
                                  <div className="text-[0.4375rem] font-black uppercase tracking-tighter text-slate-400">Flex</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-[0.875rem] font-black text-slate-800">{erh.meta?.aktivierung}</div>
                                  <div className="text-[0.4375rem] font-black uppercase tracking-tighter text-slate-400">Akt</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-[0.875rem] font-black text-slate-800">{erh.meta?.emotionen}</div>
                                  <div className="text-[0.4375rem] font-black uppercase tracking-tighter text-slate-400">Emo</div>
                                </div>
                             </div>
                             {erh.kommentar && (
                                <div className="text-[0.6875rem] text-slate-600 italic border-t border-slate-200/50 pt-2">{erh.kommentar}</div>
                             )}
                          </div>
                        ))}
                      </div>
                   )}
                </div>

             </div>
          </motion.div>
        )}

        {/* INTERAKTION LOG TAB */}
        {activeTab === 'interaktion' && (
           <motion.div key="interaktion" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
             <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                 <div>
                   <h3 className="text-[1.25rem] font-black text-slate-900 leading-tight">Interaktions-Log</h3>
                   <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Dokumentation von Beziehungen & Sozialverhalten</p>
                 </div>
                 <button
                   onClick={() => { setInteractionPresetId(null); setIsInteractionModalOpen(true); }}
                   className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-[0.6875rem] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95"
                 >
                   <Plus size={16} /> Interaktion erfassen
                 </button>
               </div>
               
               <InteractionLogView />
             </div>
           </motion.div>
        )}

        {activeTab === 'metakognition' && (
           <motion.div key="metakognition" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <MetakognitionView />
           </motion.div>
        )}

        {/* Other tabs remain essentially as they were in functionality, logic preserved from full view */}
        {activeTab === 'katalog' && (
          <motion.div key="katalog" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:p-6">
            <div className="md:col-span-2 lg:col-span-3 flex justify-between items-center mb-2">
              <div>
                <h3 className="text-[1.25rem] leading-normal font-black text-slate-900">Test-Katalog</h3>
                <p className="text-[0.75rem] leading-tight text-slate-500 font-bold uppercase tracking-wider">Verfügbare diagnostische Instrumente</p>
              </div>
              <button 
                onClick={() => setIsTemplateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[0.625rem] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
              >
                <Database size={14} /> Vorlagen laden
              </button>
            </div>
            
            {tests.length === 0 ? (
              <div className="col-span-full py-6">
                <EmptyState 
                  icon="🧪"
                  title="Noch keine Tests im Katalog"
                  description="Nutze unsere erprobten, standardisierten Erhebungsvorlagen (z.B. SLS, IKM, MPT) oder erstelle eigene Diagnostiktests, um direkt zu starten."
                  actionLabel="Aus Vorlagen wählen"
                  onAction={() => setIsTemplateModalOpen(true)}
                />
              </div>
            ) : (
              tests.map(test => (
                <div key={test.id} className="bg-white rounded-[2rem] border border-slate-200 p-4 sm:p-6 flex flex-col justify-between hover:border-indigo-300 transition-all group  relative">
                  <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[0.5625rem] font-black uppercase tracking-widest ${KATEGORIE_COLORS[test.kategorie]}`}>
                    {KATEGORIE_LABELS[test.kategorie]}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[1.125rem] leading-normal font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{test.name}</h4>
                      <p className="text-[0.75rem] leading-tight text-slate-400 font-bold line-clamp-2 mt-1">{test.kurzbeschreibung}</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-slate-50 text-slate-500 rounded-lg text-[0.5625rem] font-black uppercase border border-slate-100">
                        {test.einheit}
                      </span>
                      <span className="px-2 py-1 bg-slate-50 text-slate-500 rounded-lg text-[0.5625rem] font-black uppercase border border-slate-100">
                        Schwellenwert: {test.schwellenwert}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-8 flex justify-between items-center pt-4 border-t border-slate-50">
                    <div className="flex gap-1">
                      <button 
                        onClick={() => { setEditingTest(test); setIsTestModalOpen(true); }}
                        className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-all"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteTest(test.id, e)}
                        className="p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-500 transition-all"
                        title="Test entfernen"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setSelectedTestId(test.id); setActiveTab('eintragen'); }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[0.625rem] font-black uppercase tracking-wider shadow-sm hover:shadow-md transition-all active:scale-95"
                      >
                        Daten erfassen
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'eintragen' && (
          <motion.div key="eintragen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="bg-white rounded-[2rem] border border-slate-200 p-4 sm:p-8 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:p-6 mb-8">
                <div>
                  <h3 className="text-[1.5rem] leading-normal font-black text-slate-900">Datenerfassung</h3>
                  <p className="text-[0.875rem] leading-snug text-slate-500 font-bold uppercase tracking-wider">Vollständige Ergebnisse sicher der aktuellen Klasse zuordnen</p>
                  <div className="flex flex-wrap gap-2 mt-3 text-[0.625rem] font-black uppercase tracking-wider">
                    <span className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700">{app.klassenbezeichnung || 'Aktuelle Klasse'}</span>
                    <span className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600">{app.schuljahr}</span>
                    <span className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600">{batchMeta.schulstufe}. Schulstufe</span>
                    <span className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600">{sortedStudentsForDiagnostik.length} Kinder</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-4 w-full md:w-auto">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[0.625rem] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Test wählen</label>
                    <select 
                      value={selectedTestId || ''} 
                      onChange={e => setSelectedTestId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[0.875rem] leading-snug font-black text-slate-700 outline-none focus:border-indigo-500 transition-all"
                    >
                      <option value="">Bitte wählen...</option>
                      {tests.map(t => <option key={t.id} value={t.id}>{t.name} ({KATEGORIE_LABELS[t.kategorie]})</option>)}
                    </select>
                  </div>
                  <div className="w-[150px]">
                    <label className="block text-[0.625rem] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Datum</label>
                    <input 
                      type="date" 
                      value={batchMeta.datum} 
                      onChange={e => setBatchMeta(prev => ({ ...prev, datum: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[0.875rem] leading-snug font-black text-slate-700 outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </div>
              
              {!selectedTestId ? (
                <div className="py-20 text-center flex flex-col items-center justify-center space-y-4">
                  <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl"><Grid size={32} /></div>
                  <p className="text-slate-400 font-bold">Bitte wähle zuerst einen Test aus dem Katalog.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className={`rounded-2xl border p-4 text-sm ${
                    tests.find(test => test.id === selectedTestId)?.schulstufen.includes(batchMeta.schulstufe)
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}>
                    <p className="font-black">
                      {tests.find(test => test.id === selectedTestId)?.schulstufen.includes(batchMeta.schulstufe)
                        ? 'Verfahren und Schulstufe passen zusammen.'
                        : `Hinweis: Dieses Verfahren ist im Katalog nicht für die ${batchMeta.schulstufe}. Schulstufe vorgesehen.`}
                    </p>
                    <p className="text-xs font-semibold mt-1">
                      Pro ausgefüllter Zeile ist ein gültiger Auswertungswert erforderlich. Ein Grenzwert erzeugt nur einen Prüfhinweis; die pädagogische Einordnung bleibt bei der Lehrperson.
                    </p>
                    <p className="text-xs font-black mt-2">
                      {getDiagnosticUnitGuidance(tests.find(test => test.id === selectedTestId)!)}
                    </p>
                  </div>
                  <div className=" border border-slate-100 rounded-3xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">
                          <th className="px-6 py-4">Schüler:in</th>
                          <th className="px-6 py-4">Rohwert (optional)</th>
                          <th className="px-6 py-4">Auswertungswert* ({tests.find(t => t.id === selectedTestId)?.einheit})</th>
                          <th className="px-6 py-4">Anmerkung</th>
                          <th className="px-6 py-4 text-center">Interaktion</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {sortedStudentsForDiagnostik.map(student => (
                          <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <span className="text-[0.875rem] leading-snug font-black text-slate-900 flex items-center gap-2"><span>{student.nachname} {student.vorname}</span>{renderStudentTrend(student.id, true)}</span>
                            </td>
                            <td className="px-6 py-4">
                              <input 
                                type="number"
                                placeholder="0"
                                value={batchEntry[student.id]?.rohwert || ''}
                                onChange={e => setBatchEntry(prev => ({ ...prev, [student.id]: { ...(prev[student.id] || { ergebniswert: '', kommentar: '' }), rohwert: e.target.value } }))}
                                className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-xl text-[0.875rem] leading-snug font-bold text-slate-700 focus:border-indigo-500 outline-none transition-all"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <input 
                                type="number"
                                placeholder="0"
                                value={batchEntry[student.id]?.ergebniswert || ''}
                                onChange={e => setBatchEntry(prev => ({ ...prev, [student.id]: { ...(prev[student.id] || { rohwert: '', kommentar: '' }), ergebniswert: e.target.value } }))}
                                className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-xl text-[0.875rem] leading-snug font-bold text-slate-700 focus:border-indigo-500 outline-none transition-all"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <input 
                                type="text"
                                placeholder="Notiz..."
                                value={batchEntry[student.id]?.kommentar || ''}
                                onChange={e => setBatchEntry(prev => ({ ...prev, [student.id]: { ...(prev[student.id] || { rohwert: '', ergebniswert: '' }), kommentar: e.target.value } }))}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-[0.875rem] leading-snug font-bold text-slate-700 focus:border-indigo-500 outline-none transition-all"
                              />
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button 
                                onClick={() => { setInteractionPresetId(student.id); setIsInteractionModalOpen(true); }}
                                className="px-2.5 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-[0.625rem] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer mx-auto"
                                title="Interaktion loggen"
                              >
                                <MessageCircle size={12} /> Loggen
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="flex justify-end pt-4 border-t border-slate-50">
                    <button 
                      onClick={handleBatchSave}
                      className="px-4 sm:px-8 py-4 bg-slate-900 text-white rounded-2xl text-[0.6875rem] font-black uppercase tracking-widest shadow-xl hover:shadow-indigo-900/10 transition-all active:scale-95"
                    >
                      Speichern & Dokumentieren
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'verlaeufe' && (
          <motion.div key="verlaeufe" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:p-8">
            {/* Sidebar: Student Selection */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-[2rem] border border-slate-200 p-4 sm:p-6 shadow-sm flex flex-col h-[750px]">
                <h4 className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <User size={14} /> Schüler-Auswahl
                </h4>

                {/* Fach-Filter für Trends */}
                <div className="mb-3 space-y-1">
                  <label className="block text-[0.6rem] font-black text-slate-400 uppercase tracking-widest">Trend-Bereich</label>
                  <select 
                    value={trendListSubj}
                    onChange={e => setTrendListSubj(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[0.725rem] font-black text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="all">📚 Alle Testbereiche</option>
                    <option value="deutsch">🇩🇪 Deutsch (Lese-Profil)</option>
                    <option value="mathematik">🔢 Mathematik (Rechnen)</option>
                    <option value="sachunterricht">🌿 Sonstige / Kognitiv</option>
                  </select>
                </div>

                {/* Trend-Filter Pills */}
                <div className="mb-4 space-y-1">
                  <label className="block text-[0.6rem] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nach Trend filtern</label>
                  <div className="grid grid-cols-4 gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/40">
                    <button
                      onClick={() => setTrendListFilter('all')}
                      title="Alle Schüler"
                      className={`py-1 text-[0.65rem] font-black uppercase rounded-lg transition-all ${trendListFilter === 'all' ? 'bg-white text-slate-850 shadow-3xs' : 'text-slate-400 hover:text-slate-700'}`}
                    >
                      Alle
                    </button>
                    <button
                      onClick={() => setTrendListFilter('improved')}
                      title="Verbessert"
                      className={`py-1 text-[0.65rem] font-black uppercase rounded-lg transition-all ${trendListFilter === 'improved' ? 'bg-emerald-500 text-white shadow-3xs' : 'text-emerald-500 hover:bg-emerald-50/50'}`}
                    >
                      📈
                    </button>
                    <button
                      onClick={() => setTrendListFilter('stable')}
                      title="Stabil"
                      className={`py-1 text-[0.65rem] font-black uppercase rounded-lg transition-all ${trendListFilter === 'stable' ? 'bg-amber-500 text-white shadow-3xs' : 'text-amber-500 hover:bg-amber-50/50'}`}
                    >
                      ➡️
                    </button>
                    <button
                      onClick={() => setTrendListFilter('worsened')}
                      title="Abwärtstrend"
                      className={`py-1 text-[0.65rem] font-black uppercase rounded-lg transition-all ${trendListFilter === 'worsened' ? 'bg-rose-500 text-white shadow-3xs' : 'text-rose-500 hover:bg-rose-50/50'}`}
                    >
                      📉
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {/* Klassen-Verlauf Button */}
                  <button 
                    onClick={() => setSelectedStudentId('class-overview')}
                    className={`w-full p-3 rounded-2xl text-left transition-all border-2 flex justify-between items-center group mb-2 ${selectedStudentId === 'class-overview' ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-50 border-slate-100 hover:border-slate-200 text-slate-800'}`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm">📊</span>
                      <span className="text-[0.725rem] font-black uppercase tracking-wider truncate">Klassen-Verlauf</span>
                    </div>
                    <ChevronRight size={14} className={selectedStudentId === 'class-overview' ? 'text-white' : 'text-slate-400 group-hover:translate-x-0.5 transition-transform'} />
                  </button>

                  <div className="h-px bg-slate-100 my-2" />

                  {filteredStudentsByTrend.length === 0 ? (
                    <div className="py-8 text-center text-[0.7rem] text-slate-400 font-bold bg-slate-50/50 rounded-2xl border border-dashed border-slate-100">
                      Keine Schüler mit diesem Profil.
                    </div>
                  ) : (
                    filteredStudentsByTrend.map(student => (
                      <button 
                        key={student.id} 
                        onClick={() => setSelectedStudentId(student.id)}
                        className={`w-full p-3 rounded-2xl text-left transition-all border-2 flex justify-between items-center group ${selectedStudentId === student.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-50 hover:border-slate-200 text-slate-700'}`}
                      >
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <span className="text-[0.75rem] leading-tight font-black break-words whitespace-normal break-all">{student.nachname} {student.vorname}</span>
                          <div className="flex">{renderStudentSparkline(student.id)}</div>
                        </div>
                        {selectedStudentId === student.id ? <ChevronRight size={14} className="shrink-0" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-indigo-300 shrink-0" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
            
            {/* Main: Trends & History */}
            <div className="lg:col-span-3 space-y-8">
              {!selectedStudentId ? (
                <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-indigo-50/30 rounded-[3rem] border border-dashed border-indigo-100 p-12 text-center text-indigo-400 space-y-4">
                  <div className="p-5 bg-white rounded-full shadow-sm"><TrendingUp size={48} /></div>
                  <div>
                    <h5 className="text-[1.125rem] leading-normal font-black text-indigo-900 mb-1">Entwicklungsverläufe</h5>
                    <p className="max-w-md mx-auto text-[0.75rem] leading-tight font-medium text-indigo-500/70">Wähle links eine Person aus, um ihre individuellen Testergebnisse und Lernfortschritte zu analysieren.</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Zeitraum-Einschränkung / Timeframe & View Mode Control Bar */}
                  <div className="bg-white rounded-[2rem] p-4 sm:p-5 border border-slate-200 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-200">
                    <div className="text-left flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <span className="text-[0.625rem] font-black text-indigo-600 uppercase tracking-widest block mb-0.5">📅 Analyse-Filter & Ansicht</span>
                        <span className="text-[0.7rem] font-semibold text-slate-500 block">Zeitraum eingrenzen und Darstellungsmodus wählen</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Time Filter Tabs */}
                      <div className="flex flex-wrap gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                        {(['all', 'schoolyear', 'quarter', 'month'] as const).map(filter => {
                          const label = { all: 'Gesamt', schoolyear: 'Schuljahr', quarter: 'Quartal', month: 'Monat' }[filter];
                          return (
                            <button
                              key={filter}
                              type="button"
                              onClick={() => setTimeFilter(filter)}
                              className={`px-3.5 py-1.5 rounded-xl text-[0.625rem] font-extrabold uppercase tracking-wide transition-all cursor-pointer ${timeFilter === filter ? 'bg-indigo-600 text-white shadow-3xs hover:bg-indigo-700' : 'text-slate-500 hover:text-slate-805 hover:bg-white/50'}`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>

                      <div className="w-px h-6 bg-slate-200 hidden md:block" />

                      {/* Display Mode Toggle */}
                      <span className="text-[0.625rem] font-black text-slate-400 uppercase tracking-wider block md:hidden mt-1 text-left">Ansicht:</span>
                      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/60">
                        <button
                          type="button"
                          onClick={() => setDiagnostikViewMode('chart')}
                          className={`px-3 py-1.5 rounded-xl text-[0.625rem] font-extrabold uppercase tracking-wide transition-all cursor-pointer flex items-center gap-1 ${diagnostikViewMode === 'chart' ? 'bg-white text-indigo-600 shadow-3xs border border-white/50' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          📈 Grafik
                        </button>
                        <button
                          type="button"
                          onClick={() => setDiagnostikViewMode('table')}
                          className={`px-3 py-1.5 rounded-xl text-[0.625rem] font-extrabold uppercase tracking-wide transition-all cursor-pointer flex items-center gap-1 ${diagnostikViewMode === 'table' ? 'bg-white text-indigo-600 shadow-3xs border border-white/50' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          📋 Tabelle
                        </button>
                      </div>
                    </div>
                  </div>

                  {selectedStudentId === 'class-overview' ? (
                    <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="bg-white rounded-[2.5rem] p-4 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-[1.5rem] leading-normal font-black text-slate-900 flex items-center gap-2">
                          <span>📊</span> Klassen-Entwicklungsanalyse
                        </h3>
                        <p className="text-[0.625rem] text-slate-400 font-bold uppercase tracking-widest mt-1">Fortschritte aller Schüler:innen im Zeitverlauf</p>
                      </div>

                      <button 
                        type="button"
                        onClick={() => setPrintMode('class')}
                        className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-[0.625rem] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                      >
                        <Printer size={14} /> Klassen-Bericht
                      </button>
                    </div>

                    {/* SUGGESTION 1: Klassen-Gesamttrend KPI Dashboard Widget */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-150/80 rounded-[2rem]">
                      <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
                        <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Fokus-Messgruppe</span>
                        <span className="text-xl font-black text-slate-800 mt-1">{classTrendStats.total} Schüler:innen</span>
                        <span className="text-[9px] font-semibold text-slate-400 mt-0.5">Mit ≥ 2 Testergebnissen</span>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-slate-100 border-l-4 border-l-emerald-500">
                        <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">📈 Trend: Verbessert</span>
                        <span className="text-xl font-black text-emerald-600 mt-1">
                          {classTrendStats.improved} <span className="text-[0.75rem] text-slate-400 font-bold">({classTrendStats.total > 0 ? ((classTrendStats.improved / classTrendStats.total) * 100).toFixed(0) : 0}%)</span>
                        </span>
                        <span className="text-[9px] font-semibold text-emerald-500 mt-0.5 block">Kompetenzzuwachs etabliert</span>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-slate-100 border-l-4 border-l-amber-500">
                        <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">➡️ Trend: Stabil</span>
                        <span className="text-xl font-black text-amber-600 mt-1">
                          {classTrendStats.stable} <span className="text-[0.75rem] text-slate-400 font-bold">({classTrendStats.total > 0 ? ((classTrendStats.stable / classTrendStats.total) * 105).toFixed(0) : 0}%)</span>
                        </span>
                        <span className="text-[9px] font-semibold text-amber-500 mt-0.5 block">Leistungen konsolidiert</span>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-slate-100 border-l-4 border-l-rose-500">
                        <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">📉 Trend: Abwärtstrend</span>
                        <span className="text-xl font-black text-rose-600 mt-1">
                          {classTrendStats.worsened} <span className="text-[0.75rem] text-slate-405 font-bold">({classTrendStats.total > 0 ? ((classTrendStats.worsened / classTrendStats.total) * 100).toFixed(0) : 0}%)</span>
                        </span>
                        <span className="text-[9px] font-semibold text-rose-500 mt-0.5 block">Spezifischer Förderbedarf weisen</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest block text-left">Ausgewählter Diagnostik-Test</label>
                      <div className="flex flex-wrap gap-2 justify-start">
                        {tests.map(test => {
                          const count = erhebungen.filter(e => e.testId === test.id).length;
                          if (count === 0) return null;
                          return (
                            <button
                              key={test.id}
                              type="button"
                              onClick={() => {
                                setClassChartSelectedTestId(test.id);
                              }}
                              className={`px-4 py-2 rounded-2xl text-[0.6875rem] font-black uppercase tracking-wider border-2 transition-all flex items-center gap-1.5 cursor-pointer ${classChartSelectedTestId === test.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-150 text-slate-600 hover:border-slate-300'}`}
                            >
                              <span>⚡</span>
                              <span>{test.name}</span>
                              <span className={`px-1.5 py-0.5 rounded-md text-[0.5625rem] font-bold ${classChartSelectedTestId === test.id ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {(() => {
                      const selectedTest = tests.find(t => t.id === classChartSelectedTestId);
                      if (!selectedTest) {
                        return (
                          <div className="py-20 text-center text-slate-400 font-bold">
                            Kein Test ausgewählt oder keine Daten vorhanden.
                          </div>
                        );
                      }

                      const testErhebungenRaw = erhebungen.filter(e => e.testId === classChartSelectedTestId);
                      const testErhebungen = testErhebungenRaw.filter(e => filterDates(e.datum, timeFilter));

                      if (testErhebungen.length === 0) {
                        return (
                          <div className="py-20 text-center bg-slate-50 border border-slate-150 rounded-[2rem] p-8 text-slate-450 font-bold max-w-lg mx-auto animate-in fade-in duration-200">
                            <span className="text-2xl block mb-2">📅</span>
                            Keine Messergebnisse für diesen Test im ausgewählten Zeitraum vorhanden.
                          </div>
                        );
                      }

                      const uniqueDates = Array.from(new Set(testErhebungen.map(e => e.datum))).sort();
                      
                      const chartData = uniqueDates.map(date => {
                        const daily = testErhebungen.filter(e => e.datum === date);
                        const sum = daily.reduce((val, curr) => val + curr.ergebniswert, 0);
                        const avg = daily.length > 0 ? (sum / daily.length) : 0;
                        
                        const pt: any = {
                          datum: date,
                          'Klassenschnitt': Number(avg.toFixed(1))
                        };

                        daily.forEach(e => {
                          const s = app.schueler?.find(std => std.id === e.schuelerId);
                          if (s) {
                            pt[s.id] = e.ergebniswert;
                            pt[`${s.id}_name`] = s.vorname;
                          }
                        });

                        return pt;
                      });

                      const studentsWithData = Array.from(new Set(testErhebungen.map(e => e.schuelerId)))
                        .map(id => app.schueler?.find(s => s.id === id))
                        .filter(Boolean) as Student[];

                      const colorsPalette = ['#10b981', '#ef4444', '#f59e0b', '#06b6d4', '#8b5cf6', '#ec4899', '#3b82f6'];

                      const allScores = testErhebungen.map(e => e.ergebniswert);
                      const maxScore = allScores.length > 0 ? Math.max(...allScores) : 0;
                      const minScore = allScores.length > 0 ? Math.min(...allScores) : 0;
                      const avgScore = allScores.length > 0 ? (allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;

                      let improvementPercent = 'N/A';
                      if (uniqueDates.length >= 2) {
                        const firstDate = uniqueDates[0];
                        const lastDate = uniqueDates[uniqueDates.length - 1];
                        const firstDateErhebungen = testErhebungen.filter(e => e.datum === firstDate);
                        const lastDateErhebungen = testErhebungen.filter(e => e.datum === lastDate);
                        const firstAvg = firstDateErhebungen.reduce((a, b) => a + b.ergebniswert, 0) / firstDateErhebungen.length;
                        const lastAvg = lastDateErhebungen.reduce((a, b) => a + b.ergebniswert, 0) / lastDateErhebungen.length;
                        if (firstAvg > 0) {
                          const rawDiffPercent = ((lastAvg - firstAvg) / firstAvg) * 100;
                          improvementPercent = `${rawDiffPercent >= 0 ? '+' : ''}${rawDiffPercent.toFixed(1)}%`;
                        } else {
                          const rawDiff = lastAvg - firstAvg;
                          improvementPercent = `${rawDiff >= 0 ? '+' : ''}${rawDiff.toFixed(1)}`;
                        }
                      }

                      const criticalStudents = studentsWithData.filter(student => {
                        const studentTests = testErhebungen.filter(e => e.schuelerId === student.id).sort((a,b) => b.datum.localeCompare(a.datum));
                        if (studentTests.length === 0) return false;
                        const latestScore = studentTests[0].ergebniswert;
                        if (selectedTest.schwellenrichtung === 'unter') {
                          return latestScore < selectedTest.schwellenwert;
                        } else {
                          return latestScore > selectedTest.schwellenwert;
                        }
                      });

                      return (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="space-y-2.5">
                              <span className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest block text-left">Einzellinien einblenden (Schüler-Vergleich)</span>
                              <div className="flex flex-wrap gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 justify-start">
                                <button
                                  type="button"
                                  onClick={() => setClassChartOverlayStudents([])}
                                  className={`px-2.5 py-1 rounded-xl text-[0.625rem] font-bold transition-all cursor-pointer ${classChartOverlayStudents.length === 0 ? 'bg-slate-350 text-slate-800' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-350'}`}
                                >
                                  Zurücksetzen
                                </button>
                                
                                <div className="w-px bg-slate-200 self-stretch my-1 mx-1" />

                                {studentsWithData.map((std, index) => {
                                  const isSelected = classChartOverlayStudents.includes(std.id);
                                  const colorIdx = index % colorsPalette.length;
                                  const studentColor = colorsPalette[colorIdx];
                                  return (
                                    <button
                                      key={std.id}
                                      type="button"
                                      onClick={() => {
                                        if (isSelected) {
                                          setClassChartOverlayStudents(prev => prev.filter(id => id !== std.id));
                                        } else {
                                          setClassChartOverlayStudents(prev => [...prev, std.id]);
                                        }
                                      }}
                                      className={`px-3 py-1.5 rounded-xl text-[0.625rem] font-black tracking-normal border transition-all flex items-center gap-1.5 cursor-pointer ${isSelected ? 'bg-white border-slate-300 shadow-3xs text-slate-800' : 'bg-white border-slate-150 text-slate-500 hover:border-slate-250'}`}
                                    >
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isSelected ? studentColor : '#cbd5e1' }} />
                                      <span>{std.vorname} {std.nachname.slice(0, 1)}.</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="space-y-2.5 text-left">
                              <span className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest block">🎯 Horizontale Referenzlinien & Lernziele</span>
                              <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 fill-slate-50">
                                <button
                                  type="button"
                                  onClick={() => setShowThresholdLine(!showThresholdLine)}
                                  className={`px-2.5 py-1.5 rounded-xl text-[0.625rem] font-black uppercase tracking-wider transition-all cursor-pointer border ${showThresholdLine ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-150 text-slate-500 hover:bg-slate-50'}`}
                                >
                                  🚨 Schwellenwert
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowClassAvgLine(!showClassAvgLine)}
                                  className={`px-2.5 py-1.5 rounded-xl text-[0.625rem] font-black uppercase tracking-wider transition-all cursor-pointer border ${showClassAvgLine ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-150 text-slate-500 hover:bg-slate-50'}`}
                                >
                                  📊 Gesamt-Klassenschnitt
                                </button>
                                
                                <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-xl border border-slate-150 shadow-3xs min-w-[130px] flex-1">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">🎯 Ziel:</span>
                                  <input
                                    type="number"
                                    placeholder="Wert..."
                                    value={customTargetVal}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      setCustomTargetVal(v === '' ? '' : Number(v));
                                    }}
                                    className="w-full text-[11px] font-black text-slate-700 bg-transparent border-none outline-none focus:ring-0 p-0 text-right min-w-[40px]"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-slate-50/30 p-5 rounded-[2rem] border border-slate-150/60 shadow-inner">
                            <div className="h-80 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 15, right: 15, left: -25, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                  <XAxis 
                                    dataKey="datum" 
                                    tickLine={false}
                                    axisLine={false}
                                    fontSize={9}
                                    fontWeight="bold"
                                    tickFormatter={(val) => new Date(val).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
                                  />
                                  <YAxis 
                                    tickLine={false}
                                    axisLine={false}
                                    fontSize={9}
                                    fontWeight="bold"
                                  />
                                  <Tooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '11px', padding: '12px' }}
                                    labelFormatter={(val: any) => `Datum: ${new Date(val).toLocaleDateString('de-DE')}`}
                                  />

                                  {showThresholdLine && (
                                    <ReferenceLine 
                                      y={selectedTest.schwellenwert} 
                                      stroke="#ef4444" 
                                      strokeDasharray="4 4" 
                                      strokeWidth={1.5}
                                      label={{ value: `Sollwert (${selectedTest.schwellenwert})`, fill: '#ef4444', fontSize: '9px', fontWeight: 'bold', position: 'insideBottomRight' }} 
                                    />
                                  )}

                                  {showClassAvgLine && avgScore > 0 && (
                                    <ReferenceLine 
                                      y={Number(avgScore.toFixed(1))} 
                                      stroke="#4f46e5" 
                                      strokeDasharray="2 2" 
                                      strokeWidth={2}
                                      label={{ value: `Ø-Klassenschnitt (${Number(avgScore.toFixed(1))})`, fill: '#4f46e5', fontSize: '9px', fontWeight: 'bold', position: 'insideTopLeft' }} 
                                    />
                                  )}

                                  {customTargetVal !== '' && (
                                    <ReferenceLine 
                                      y={Number(customTargetVal)} 
                                      stroke="#10b981" 
                                      strokeDasharray="6 3" 
                                      strokeWidth={2}
                                      label={{ value: `Zielwert (${customTargetVal})`, fill: '#10b981', fontSize: '9px', fontWeight: 'black', position: 'insideTopRight' }} 
                                    />
                                  )}

                                  <Line 
                                    type="monotone" 
                                    dataKey="Klassenschnitt" 
                                    name="Klassenschnitt"
                                    stroke="#4f46e5" 
                                    strokeWidth={4.5} 
                                    dot={{ r: 6, fill: '#4f46e5', strokeWidth: 0 }} 
                                    activeDot={{ r: 8, strokeWidth: 0 }}
                                  />

                                  {classChartOverlayStudents.map((studentId) => {
                                    const studentDef = app.schueler?.find(s => s.id === studentId);
                                    if (!studentDef) return null;
                                    const colorIdx = studentsWithData.findIndex(s => s.id === studentId);
                                    const col = colorsPalette[colorIdx >= 0 ? colorIdx % colorsPalette.length : 0];
                                    return (
                                      <Line
                                        key={studentId}
                                        type="monotone"
                                        dataKey={studentId}
                                        name={studentDef.vorname}
                                        stroke={col}
                                        strokeWidth={2.5}
                                        dot={{ r: 4, fill: col, strokeWidth: 0 }}
                                        activeDot={{ r: 5 }}
                                        strokeDasharray="2 2"
                                      />
                                    );
                                  })}
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-2 text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">
                              <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
                                <span className="w-3.5 h-1.5 bg-indigo-600 rounded-lg block" />
                                <span>Klassenschnitt-Verlauf (Mittelwert)</span>
                              </div>
                              {classChartOverlayStudents.map((studentId) => {
                                const studentDef = app.schueler?.find(s => s.id === studentId);
                                if (!studentDef) return null;
                                const colorIdx = studentsWithData.findIndex(s => s.id === studentId);
                                const col = colorsPalette[colorIdx >= 0 ? colorIdx % colorsPalette.length : 0];
                                return (
                                  <div key={studentId} className="flex items-center gap-1.5 flex-nowrap shrink-0">
                                    <span className="w-3.5 h-1.5 rounded-lg block" style={{ backgroundColor: col }} />
                                    <span className="text-slate-700">{studentDef.vorname} {studentDef.nachname.slice(0, 1)}.</span>
                                  </div>
                                );
                              })}
                              {showThresholdLine && (
                                <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
                                  <span className="w-3.5 h-px border-t border-dashed border-rose-500 block" />
                                  <span>Schwellenwert ({selectedTest.schwellenwert})</span>
                                </div>
                              )}
                              {showClassAvgLine && avgScore > 0 && (
                                <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
                                  <span className="w-3.5 h-1.5 bg-indigo-600 rounded-lg block opacity-80" />
                                  <span>Klassenschnitt ({avgScore.toFixed(1)})</span>
                                </div>
                              )}
                              {customTargetVal !== '' && (
                                <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
                                  <span className="w-3.5 h-1.5 bg-emerald-500 rounded-lg block" />
                                  <span>Zielwert ({customTargetVal})</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-slate-50/10 border border-slate-100 p-4 rounded-2xl flex flex-col justify-between text-left">
                              <span className="text-[0.6rem] font-bold text-slate-400 uppercase block tracking-wider">Ergebniswert (Schnitt)</span>
                              <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-2xl font-black text-indigo-700 font-mono">{avgScore.toFixed(1)}</span>
                                <span className="text-[0.625rem] font-bold text-slate-400 uppercase">{selectedTest.einheit}</span>
                              </div>
                            </div>

                            <div className="bg-slate-50/10 border border-slate-100 p-4 rounded-2xl flex flex-col justify-between text-left">
                              <span className="text-[0.6rem] font-bold text-slate-400 uppercase block tracking-wider">Lernfortschritt (Gesamt)</span>
                              <div className="flex items-baseline gap-2 mt-1">
                                <span className={`text-2xl font-black font-mono ${improvementPercent.startsWith('+') ? 'text-emerald-650' : 'text-slate-705'}`}>{improvementPercent}</span>
                                <span className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-wider block">Verlauf</span>
                              </div>
                            </div>

                            <div className="bg-slate-50/10 border border-slate-100 p-4 rounded-2xl flex flex-col justify-between text-left">
                              <span className="text-[0.6rem] font-bold text-slate-400 uppercase block tracking-wider">Spitzenleistung</span>
                              <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-2xl font-black text-amber-600 font-mono">Max {maxScore}</span>
                                <span className="text-[0.625rem] font-bold text-amber-600 uppercase">{selectedTest.einheit}</span>
                              </div>
                            </div>

                            <div className="bg-slate-50/10 border border-slate-100 p-4 rounded-2xl flex flex-col justify-between text-left">
                              <span className="text-[0.6rem] font-bold text-slate-400 uppercase block tracking-wider">Erhebungen erfasst</span>
                              <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-2xl font-black text-slate-700 font-mono">{testErhebungen.length}</span>
                                <span className="text-[0.625rem] font-black text-slate-400 uppercase tracking-wider block">Gesamt</span>
                              </div>
                            </div>
                          </div>

                          <div className="p-5 rounded-3xl border border-rose-100 bg-rose-50/20 space-y-3 text-left animate-in fade-in duration-300">
                            <div className="flex items-center gap-2 text-rose-700 font-extrabold text-xs uppercase tracking-wider">
                              <AlertCircle size={15} /> Handlungsbedarf & Förderfokus ({criticalStudents.length})
                            </div>
                            <p className="text-[0.725rem] font-semibold text-slate-505 leading-relaxed">
                              Die folgenden Schüler:innen liegen im jüngsten Ergebnis außerhalb des eingestellten Orientierungsbereichs von <span className="font-extrabold text-slate-800">{selectedTest.schwellenwert} {selectedTest.einheit}</span>. Das ist ein Hinweis für weitere Beobachtung, keine Diagnose:
                            </p>
                            
                            {criticalStudents.length === 0 ? (
                              <div className="text-[0.7rem] bg-emerald-50 text-emerald-700 border border-emerald-100/60 p-3 rounded-xl font-bold">
                                👏 Alle Schüler:innen übertreffen das pädagogische Minimum für diesen Test!
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {criticalStudents.map(student => {
                                  const studentHistory = testErhebungen.filter(e => e.schuelerId === student.id).sort((a,b) => b.datum.localeCompare(a.datum));
                                  const latestVal = studentHistory[0]?.ergebniswert;
                                  return (
                                    <button 
                                      key={student.id} 
                                      type="button"
                                      onClick={() => setSelectedStudentId(student.id)}
                                      className="group px-3 py-1.5 bg-white border border-rose-150 rounded-xl flex items-center gap-2 text-[0.7rem] font-extrabold text-slate-800 cursor-pointer shadow-3xs hover:border-rose-400 hover:bg-rose-50/20 transition-all active:scale-95 text-left"
                                    >
                                      <span>🔴</span>
                                      <span>{student.vorname} {student.nachname}</span>
                                      <span className="font-mono text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 group-hover:bg-rose-105">{latestVal} {selectedTest.einheit}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <>
                  {/* Trends Summary */}
                  <div className="bg-white rounded-[2.5rem] p-4 sm:p-8 border border-slate-200 shadow-sm space-y-8 animate-in fade-in duration-350">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
                      <div>
                        <h3 className="text-[1.5rem] leading-normal font-black text-slate-900 flex items-center gap-2"><span>{getStudentName(selectedStudentId)}</span>{renderStudentTrend(selectedStudentId, false)}</h3>
                        <p className="text-[0.625rem] text-slate-400 font-bold uppercase tracking-widest mt-1">Diagnostische Historie & Trends</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button 
                          onClick={() => { setInteractionPresetId(selectedStudentId); setIsInteractionModalOpen(true); }}
                          className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl text-[0.625rem] font-black uppercase tracking-widest hover:bg-emerald-100 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                        >
                          <MessageCircle size={14} /> Interaktion loggen
                        </button>
                        <button 
                          onClick={() => setPrintMode('student')}
                          className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-[0.625rem] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
                        >
                          <Printer size={14} /> Bericht
                        </button>
                      </div>
                    </div>

                    {/* SUGGESTION 6, 8, 9: Schüler-Lernzuwachs & Meilenstein-Bar */}
                    {(() => {
                      const trendData = computeStudentTrend(selectedStudentId);
                      if (!trendData || trendData.trend === 'none') return null;
                      
                      let velocityText = 'Gleichmäßig';
                      let velocityColor = 'text-amber-600 bg-amber-50';
                      if (trendData.changePercent > 10) {
                        velocityText = 'Dynamisch steigend';
                        velocityColor = 'text-emerald-600 bg-emerald-50 border border-emerald-150';
                      } else if (trendData.changePercent < -10) {
                        velocityText = 'Kompensationsbedarf';
                        velocityColor = 'text-rose-600 bg-rose-50 border border-rose-150';
                      }

                      let targetProgressText = null;
                      if (customTargetVal !== '' && typeof customTargetVal === 'number' && trendData.scoresArray.length > 0) {
                        const latestScore = trendData.scoresArray[trendData.scoresArray.length - 1].originalVal;
                        const progressRate = (latestScore / customTargetVal) * 100;
                        targetProgressText = `${progressRate.toFixed(0)}% erreicht`;
                      }

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-slate-100 p-4 bg-slate-50 rounded-[2rem] animate-in slide-in-from-top-3 duration-250 text-left">
                          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 flex flex-col justify-center">
                            <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Lern-Geschwindigkeit</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[0.6875rem] font-black uppercase px-2 py-0.5 rounded-lg ${velocityColor}`}>
                                {velocityText}
                              </span>
                              <span className="text-[0.8125rem] font-black text-slate-700">{trendData.changeStr}</span>
                            </div>
                          </div>
                          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 flex flex-col justify-center">
                            <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Verlauf Detail</span>
                            <span className="text-[0.6875rem] font-black text-slate-600 mt-1 block line-clamp-1">{trendData.detailsText}</span>
                          </div>
                          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 flex flex-col justify-center">
                            <div>
                              <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Lernziel-Annäherung</span>
                              {targetProgressText ? (
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[0.875rem] font-black text-indigo-600 whitespace-nowrap">{targetProgressText}</span>
                                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, Math.max(0, (trendData.scoresArray[trendData.scoresArray.length - 1].originalVal / (customTargetVal as number)) * 100))}%` }} />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[0.6875rem] font-semibold text-slate-400 mt-1.5 block">Kein Zielwert definiert.</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Schüler-Vergleichsauswahl & Referenzlinien für den Schüler-Detail-Graphen */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100/80 space-y-2 text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest block">🗣️ Fortschrittsvergleich: Weitere Schüler:innen einblenden</span>
                          {singleStudentCompareIds.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setSingleStudentCompareIds([])}
                              className="text-[0.5625rem] font-black text-rose-600 hover:text-rose-700 uppercase tracking-widest cursor-pointer hover:underline text-left"
                            >
                              Vergleich zurücksetzen
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {app.schueler?.filter(s => s.id !== selectedStudentId).map((std, index) => {
                            const isSelected = singleStudentCompareIds.includes(std.id);
                            const colorsPalette = ['#10b981', '#3b82f6', '#f59e0b', '#06b6d4', '#8b5cf6', '#ec4899', '#ef4444'];
                            const colorIdx = index % colorsPalette.length;
                            const studentColor = colorsPalette[colorIdx];
                            return (
                              <button
                                key={std.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setSingleStudentCompareIds(prev => prev.filter(id => id !== std.id));
                                  } else {
                                    setSingleStudentCompareIds(prev => [...prev, std.id]);
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-xl text-[0.625rem] font-black tracking-normal border transition-all flex items-center gap-1.5 cursor-pointer ${isSelected ? 'bg-white border-slate-300 shadow-3xs text-slate-800' : 'bg-white border-slate-150 text-slate-500 hover:border-slate-250'}`}
                              >
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isSelected ? studentColor : '#cbd5e1' }} />
                                <span>{std.vorname} {std.nachname.slice(0, 1)}.</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100/80 space-y-2 text-left">
                        <span className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest block">🎯 Horizontale Referenzlinien & Lernziele</span>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowThresholdLine(!showThresholdLine)}
                            className={`px-2.5 py-1.5 rounded-xl text-[0.625rem] font-black uppercase tracking-wider transition-all cursor-pointer border ${showThresholdLine ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-150 text-slate-500 hover:bg-slate-50'}`}
                          >
                            🚨 Schwellenwert
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowClassAvgLine(!showClassAvgLine)}
                            className={`px-2.5 py-1.5 rounded-xl text-[0.625rem] font-black uppercase tracking-wider transition-all cursor-pointer border ${showClassAvgLine ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-150 text-slate-500 hover:bg-slate-50'}`}
                          >
                            📊 Klassenschnitt
                          </button>
                          
                          <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-xl border border-slate-150 shadow-3xs min-w-[130px] flex-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">🎯 Ziel:</span>
                            <input
                              type="number"
                              placeholder="Wert..."
                              value={customTargetVal}
                              onChange={(e) => {
                                const v = e.target.value;
                                setCustomTargetVal(v === '' ? '' : Number(v));
                              }}
                              className="w-full text-[11px] font-black text-slate-700 bg-transparent border-none outline-none focus:ring-0 p-0 text-right min-w-[40px]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                     
                    {/* Switcher to swap between the charts and tabular overview */}
                    {diagnostikViewMode === 'table' ? (
                      (() => {
                        const studentRecordsRaw = erhebungen.filter(e => e.schuelerId === selectedStudentId);
                        const studentRecords = studentRecordsRaw.filter(e => filterDates(e.datum, timeFilter));
                        const availableStudentTests = tests.filter(t => studentRecordsRaw.some(r => r.testId === t.id));

                        const filteredRecords = studentRecords.filter(e => {
                          if (studentTableTestFilter === 'all') return true;
                          return e.testId === studentTableTestFilter;
                        }).sort((a, b) => b.datum.localeCompare(a.datum));

                        return (
                          <div className="space-y-4 text-left animate-in fade-in duration-300">
                            {/* Filter bar for test types */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 border border-slate-150 p-4 rounded-3xl">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest block sm:inline">⚡ Test filtern:</span>
                                <div className="flex flex-wrap gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setStudentTableTestFilter('all')}
                                    className={`px-3 py-1.5 rounded-xl text-[0.625rem] font-extrabold uppercase tracking-wide transition-all cursor-pointer ${studentTableTestFilter === 'all' ? 'bg-indigo-600 text-white shadow-3xs hover:bg-indigo-700' : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-700'}`}
                                  >
                                    Alle ({studentRecords.length})
                                  </button>
                                  {availableStudentTests.map(t => {
                                    const count = studentRecords.filter(e => e.testId === t.id).length;
                                    return (
                                      <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setStudentTableTestFilter(t.id)}
                                        className={`px-3 py-1.5 rounded-xl text-[0.625rem] font-extrabold uppercase tracking-wide transition-all cursor-pointer ${studentTableTestFilter === t.id ? 'bg-indigo-600 text-white shadow-3xs hover:bg-indigo-700' : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-700'}`}
                                      >
                                        {t.name} ({count})
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="text-[0.675rem] font-bold text-slate-500 uppercase tracking-wider">
                                Einträge: <span className="font-mono font-black text-slate-800">{filteredRecords.length}</span>
                              </div>
                            </div>

                            {/* Table */}
                            {filteredRecords.length === 0 ? (
                              <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-[2rem] text-slate-400 font-bold max-w-lg mx-auto">
                                <span className="text-xl block mb-1">📋</span>
                                Keine Messergebnisse für den ausgewählten Filter im gewählten Zeitraum vorhanden.
                              </div>
                            ) : (
                              <div className="overflow-x-auto bg-white border border-slate-200 rounded-[2rem] shadow-3xs duration-200">
                                <table className="w-full min-w-[700px] border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 font-black text-[0.625rem] text-slate-400 uppercase tracking-widest text-left">
                                      <th className="px-5 py-4">⚡ Test & Kategorie</th>
                                      <th className="px-5 py-3 text-right">🔢 Rohwert</th>
                                      <th className="px-5 py-3 text-right">📊 Ergebnis</th>
                                      <th className="px-5 py-4">🚨 Sollwert & Status</th>
                                      <th className="px-5 py-4">📝 Notiz / Kommentar</th>
                                      <th className="px-5 py-4 text-center">⚙️ Aktionen</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-150/75">
                                    {filteredRecords.map((entry) => {
                                      const test = tests.find(t => t.id === entry.testId);
                                      if (!test) return null;

                                      // Evaluate alert status
                                      let isProblematic = false;
                                      if (test.schwellenrichtung === 'unter') {
                                        isProblematic = entry.ergebniswert < test.schwellenwert;
                                      } else {
                                        isProblematic = entry.ergebniswert > test.schwellenwert;
                                      }

                                      // Evaluate custom warning if set
                                      const student = app.schueler?.find(s => s.id === selectedStudentId);
                                      const hasCustomWarnValue = student?.warnThresholds?.[test.id] !== undefined;
                                      const customWarnVal = hasCustomWarnValue ? student?.warnThresholds[test.id] : null;
                                      let customWarns = false;
                                      if (customWarnVal !== null && customWarnVal !== undefined) {
                                        customWarns = test.schwellenrichtung === 'unter' ? entry.ergebniswert < customWarnVal : entry.ergebniswert > customWarnVal;
                                      }

                                      return (
                                        <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors text-[0.75rem] font-bold text-slate-700">
                                          <td className="px-5 py-3.5 flex flex-col items-start gap-1">
                                            <span className="font-black text-slate-900 block">{test.name}</span>
                                            <span className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-wider block">{test.kategorie || 'Allgemein'}</span>
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] font-mono leading-none">📅 {new Date(entry.datum).toLocaleDateString('de-DE')}</span>
                                          </td>
                                          <td className="px-5 py-3.5 text-right font-mono text-slate-605">
                                            {entry.rohwert !== undefined && entry.rohwert !== null ? entry.rohwert : '—'}
                                          </td>
                                          <td className="px-5 py-3.5 text-right font-mono text-indigo-600 font-black">
                                            {entry.ergebniswert} <span className="text-[10px] text-slate-400 font-normal">{test.einheit}</span>
                                          </td>
                                          <td className="px-5 py-3.5">
                                            <div className="flex flex-col gap-1 items-start">
                                              {isProblematic ? (
                                                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-150 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                                  Weiter beobachten: Orientierungswert unterschritten ({test.schwellenwert} {test.einheit})
                                                </span>
                                              ) : (
                                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                                  Im Orientierungsbereich ({test.schwellenwert})
                                                </span>
                                              )}
                                              {customWarnVal !== null && customWarnVal !== undefined && (
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold flex items-center gap-1 border ${customWarns ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-600 border-slate-200/60'}`}>
                                                  🎯 Indiv. Warn: {customWarnVal} ({customWarns ? 'Schwellenwert verletzt' : 'Ziel erreicht!'})
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="px-5 py-3.5 text-slate-500 font-medium italic overflow-hidden max-w-[150px] text-ellipsis whitespace-nowrap" title={entry.kommentar || 'Keine Notiz'}>
                                            {entry.kommentar || <span className="text-slate-300">Keine Notiz</span>}
                                          </td>
                                          <td className="px-5 py-3.5">
                                            <div className="flex items-center justify-center gap-1.5">
                                              {/* Transfer to learning goals */}
                                              {student && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setApp(prev => {
                                                      const sIdx = prev.schueler.findIndex(s => s.id === student.id);
                                                      if (sIdx === -1) return prev;
                                                      const students = [...prev.schueler];
                                                      const fp = student.foerderprofil || { staerken: [], foerderbedarfBereiche: [], foerderziele: [], diagnosen: '', zusatzinfo: '' };
                                                      const ziele = fp.foerderziele || [];
                                                      const newLabel = `Fokusbedarf aufholen: ${test.name} (Ergebnis: ${entry.ergebniswert} ${test.einheit})`;
                                                      if (!ziele.some(z => z.ziel === newLabel)) {
                                                        ziele.push({
                                                          id: crypto.randomUUID(),
                                                          bereich: test.kategorie || 'Lernen',
                                                          ziel: newLabel,
                                                          status: 'offen',
                                                          startDatum: formatLocalDateKey(new Date()),
                                                          zielDatum: ''
                                                        });
                                                      }
                                                      students[sIdx] = { ...student, foerderprofil: { ...fp, foerderziele: ziele } };
                                                      return { ...prev, schueler: students };
                                                    });
                                                    alert('Erfolgreich als Ziel ins Förderprofil übernommen!');
                                                  }}
                                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border border-indigo-150 transition-all cursor-pointer"
                                                  title="In Förderprofil übernehmen"
                                                >
                                                  <ClipboardList size={11} /> <span>+Ziel</span>
                                                </button>
                                              )}

                                              {/* Transfer to grades administration */}
                                              {student && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setGradeTransferTarget({
                                                      entry,
                                                      test
                                                    });
                                                  }}
                                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border border-emerald-150 transition-all cursor-pointer"
                                                  title="In Notenverwaltung als Note übernehmen"
                                                >
                                                  <FileCheck size={11} /> <span>+Note</span>
                                                </button>
                                              )}

                                              {/* Delete */}
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  if (confirm(`Möchtest du dieses Messergebnis vom ${new Date(entry.datum).toLocaleDateString()} für ${test.name} wirklich löschen?`)) {
                                                    setApp(prev => ({
                                                      ...prev,
                                                      diagnostikErhebungen: prev.diagnostikErhebungen.filter(e => e.id !== entry.id)
                                                    }));
                                                  }
                                                }}
                                                className="p-1 px-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200 hover:border-rose-200 transition-all cursor-pointer"
                                                title="Löschen"
                                              >
                                                <Trash2 size={12} />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <>
                        {/* Charts per Category if data exists */}
                        {tests.map(test => {
                      const primaryRecordsRaw = erhebungen.filter(e => e.schuelerId === selectedStudentId && e.testId === test.id);
                      if (primaryRecordsRaw.length === 0) return null;

                      const primaryRecords = primaryRecordsRaw.filter(e => filterDates(e.datum, timeFilter));
                      if (primaryRecords.length === 0) return null;

                      // Make a set of all active students for this test's chart
                      const relevantStudentIds = [selectedStudentId, ...singleStudentCompareIds];
                      const testErhebungenRaw = erhebungen.filter(e => e.testId === test.id);
                      const testErhebungen = testErhebungenRaw.filter(e => filterDates(e.datum, timeFilter));
                      const uniqueDates = Array.from(new Set(testErhebungen
                        .filter(e => relevantStudentIds.includes(e.schuelerId))
                        .map(e => e.datum)
                      )).sort();

                      const chartData = uniqueDates.map(date => {
                        const pt: any = { datum: date };
                        relevantStudentIds.forEach(id => {
                          const recordOnDate = testErhebungen.find(e => e.schuelerId === id && e.datum === date);
                          if (recordOnDate) {
                            pt[id] = recordOnDate.ergebniswert;
                          }
                        });
                        return pt;
                      });

                      const colorsPalette = ['#10b981', '#3b82f6', '#f59e0b', '#06b6d4', '#8b5cf6', '#ec4899', '#ef4444'];
                      
                      const cStudent = app.schueler?.find(s => s.id === selectedStudentId);
                      const currentWarnValue = cStudent?.warnThresholds?.[test.id] ?? '';

                      return (
                        <div key={test.id} className="space-y-4 pt-6 border-t border-slate-100 first:border-t-0 first:pt-0">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                            <h4 className="text-[0.875rem] leading-snug font-black text-slate-800">
                              {test.name} <span className="text-[0.625rem] text-slate-400 font-medium ml-2">({test.einheit})</span>
                            </h4>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1.5 rounded-xl border border-slate-100">
                                Eingestellter Orientierungswert: {test.schwellenwert}
                              </div>
                              <div className="flex items-center gap-1.5 bg-rose-50/30 px-2.5 py-1.5 rounded-xl border border-rose-100/60 shadow-3xs">
                                <span className="text-[0.625rem] font-bold text-rose-700 uppercase tracking-wider whitespace-nowrap">⚠️ Eigener Warnwert ({getStudentName(selectedStudentId)}):</span>
                                <input
                                  type="number"
                                  placeholder="Keins..."
                                  value={currentWarnValue}
                                  onChange={(e) => {
                                    const valStr = e.target.value;
                                    setApp((prev: any) => {
                                      const updatedSchueler = (prev.schueler || []).map((s: any) => {
                                        if (s.id === selectedStudentId) {
                                          const nextThresholds = { ...(s.warnThresholds || {}) };
                                          if (valStr === '') {
                                            delete nextThresholds[test.id];
                                          } else {
                                            nextThresholds[test.id] = Number(valStr);
                                          }
                                          return { ...s, warnThresholds: nextThresholds };
                                        }
                                        return s;
                                      });
                                      return { ...prev, schueler: updatedSchueler };
                                    });
                                  }}
                                  className="w-14 text-right text-[11px] font-black text-rose-800 bg-transparent border-none outline-none p-0 focus:ring-0 whitespace-nowrap"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-slate-50/35 rounded-3xl p-4 md:p-5 border border-slate-100/50">
                            <div className="h-56 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                  <XAxis 
                                    dataKey="datum" 
                                    fontSize={9} 
                                    fontWeight="bold" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tickFormatter={(val: any) => new Date(val).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
                                  />
                                  <YAxis fontSize={9} fontWeight="bold" axisLine={false} tickLine={false} />
                                  <Tooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '11px', padding: '12px' }}
                                    labelFormatter={(val: any) => `Datum: ${new Date(val).toLocaleDateString()}`}
                                  />
                                  {showThresholdLine && (
                                    <ReferenceLine 
                                      y={test.schwellenwert} 
                                      stroke="#ef4444" 
                                      strokeDasharray="5 5" 
                                      label={{ value: `Sollwert (${test.schwellenwert})`, fill: '#ef4444', fontSize: 8, fontWeight: 'black', position: 'insideBottomRight' }} 
                                    />
                                  )}

                                  {currentWarnValue !== '' && (
                                    <ReferenceLine 
                                      y={Number(currentWarnValue)} 
                                      stroke="#ef4444" 
                                      strokeDasharray="4 4" 
                                      strokeWidth={1.5}
                                      label={{ value: `Indiv. Warnwert (${currentWarnValue})`, fill: '#ef4444', fontSize: 8, fontWeight: 'bold', position: 'insideTopLeft' }} 
                                    />
                                  )}

                                  {showClassAvgLine && (() => {
                                    const testErhebungen = erhebungen.filter(e => e.testId === test.id);
                                    const allScores = testErhebungen.map(e => e.ergebniswert);
                                    const avgScoreForTest = allScores.length > 0 ? (allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
                                    if (avgScoreForTest <= 0) return null;
                                    return (
                                      <ReferenceLine 
                                        y={Number(avgScoreForTest.toFixed(1))} 
                                        stroke="#4f46e5" 
                                        strokeDasharray="2 2" 
                                        strokeWidth={2}
                                        label={{ value: `Klassenschnitt (${Number(avgScoreForTest.toFixed(1))})`, fill: '#4f46e5', fontSize: 8, fontWeight: 'black', position: 'insideTopLeft' }} 
                                      />
                                    );
                                  })()}

                                  {customTargetVal !== '' && (
                                    <ReferenceLine 
                                      y={Number(customTargetVal)} 
                                      stroke="#10b981" 
                                      strokeDasharray="6 3" 
                                      strokeWidth={2}
                                      label={{ value: `Zielwert (${customTargetVal})`, fill: '#10b981', fontSize: 8, fontWeight: 'black', position: 'insideTopRight' }} 
                                    />
                                  )}
                                  
                                  {/* Primary student's curve */}
                                  <Line 
                                    type="monotone" 
                                    dataKey={selectedStudentId} 
                                    name={getStudentName(selectedStudentId)}
                                    stroke="#6366f1" 
                                    strokeWidth={4.5} 
                                    dot={{ r: 6, fill: '#6366f1', strokeWidth: 0 }} 
                                    activeDot={{ r: 8, strokeWidth: 0 }}
                                    connectNulls={true}
                                  />

                                  {/* Overlay compared students curves */}
                                  {singleStudentCompareIds.map((cId, idx) => {
                                    const sDef = app.schueler?.find(s => s.id === cId);
                                    if (!sDef) return null;
                                    const col = colorsPalette[idx % colorsPalette.length];
                                    return (
                                      <Line
                                        key={cId}
                                        type="monotone"
                                        dataKey={cId}
                                        name={sDef.vorname}
                                        stroke={col}
                                        strokeWidth={2.5}
                                        dot={{ r: 4, fill: col, strokeWidth: 0 }}
                                        activeDot={{ r: 5 }}
                                        strokeDasharray="2 2"
                                        connectNulls={true}
                                      />
                                    );
                                  })}
                                </LineChart>
                              </ResponsiveContainer>
                            </div>

                            {/* Dynamic Legend */}
                            <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 mt-3.5 text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">
                              <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
                                <span className="w-3.5 h-1.5 bg-indigo-505 rounded-lg block" style={{ backgroundColor: '#6366f1' }} />
                                <span className="text-slate-900">{getStudentName(selectedStudentId)} (Aktiv)</span>
                              </div>
                              {singleStudentCompareIds.map((cId, idx) => {
                                const sDef = app.schueler?.find(s => s.id === cId);
                                if (!sDef) return null;
                                const col = colorsPalette[idx % colorsPalette.length];
                                return (
                                  <div key={cId} className="flex items-center gap-1.5 flex-nowrap shrink-0">
                                    <span className="w-3.5 h-1.5 rounded-lg block" style={{ backgroundColor: col }} />
                                    <span className="text-slate-700">{sDef.vorname} {sDef.nachname?.slice(0, 1)}.</span>
                                  </div>
                                );
                              })}
                              {showThresholdLine && (
                                <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
                                  <span className="w-3.5 h-px border-t border-dashed border-rose-500 block" />
                                  <span>Schwellenwert ({test.schwellenwert})</span>
                                </div>
                              )}
                              {currentWarnValue !== '' && (
                                <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
                                  <span className="w-3.5 h-px border-t border-dashed border-rose-500 block" style={{ borderColor: '#ef4444' }} />
                                  <span className="text-rose-650">Indiv. Warnwert ({currentWarnValue})</span>
                                </div>
                              )}
                              {showClassAvgLine && (() => {
                                const testErhebungen = erhebungen.filter(e => e.testId === test.id);
                                const allScores = testErhebungen.map(e => e.ergebniswert);
                                const avgScoreForTest = allScores.length > 0 ? (allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
                                if (avgScoreForTest <= 0) return null;
                                return (
                                  <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
                                    <span className="w-3.5 h-1.5 bg-indigo-600 rounded-lg block opacity-80" />
                                    <span>Klassenschnitt ({avgScoreForTest.toFixed(1)})</span>
                                  </div>
                                );
                              })()}
                              {customTargetVal !== '' && (
                                <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
                                  <span className="w-3.5 h-1.5 bg-emerald-500 rounded-lg block" />
                                  <span>Zielwert ({customTargetVal})</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                      </>
                    )}
                  </div>
                  
                  {/* Antolin Comparative Card */}
                  {(() => {
                    const activeStudentIds = new Set((app.schueler || []).map(s => s.id));
                    const allRecords = (app.antolinRecords || []).filter(r => activeStudentIds.has(r.schuelerId));
                    const latestRecordsByStudent = allRecords.reduce((acc: any[], rec) => {
                      const existing = acc.find(r => r.schuelerId === rec.schuelerId);
                      if (!existing || rec.datum > existing.datum) {
                        if (existing) {
                          acc = acc.filter(r => r.schuelerId !== rec.schuelerId);
                        }
                        acc.push(rec);
                      }
                      return acc;
                    }, []);

                    const totalBooks = latestRecordsByStudent.reduce((sum, r) => sum + r.anzahlBuecher, 0);
                    const totalPoints = latestRecordsByStudent.reduce((sum, r) => sum + r.punkte, 0);
                    const avgLeistung = latestRecordsByStudent.length ? (latestRecordsByStudent.reduce((sum, r) => sum + r.leistung, 0) / latestRecordsByStudent.length) : 0;
                    const avgSchwierigkeit = latestRecordsByStudent.length ? (latestRecordsByStudent.reduce((sum, r) => sum + r.schwierigkeit, 0) / latestRecordsByStudent.length) : 0;

                    const avgBooksValue = latestRecordsByStudent.length ? (totalBooks / latestRecordsByStudent.length) : 0;
                    const avgPointsValue = latestRecordsByStudent.length ? (totalPoints / latestRecordsByStudent.length) : 0;

                    const studentRecords = allRecords
                      .filter(r => r.schuelerId === selectedStudentId)
                      .sort((a, b) => b.datum.localeCompare(a.datum));
                    
                    const latestStudentRec = studentRecords.length > 0 ? studentRecords[0] : null;

                    if (!latestStudentRec) return null;

                    const diffBooks = latestStudentRec.anzahlBuecher - avgBooksValue;
                    const diffPoints = latestStudentRec.punkte - avgPointsValue;
                    const diffLeistung = latestStudentRec.leistung - avgLeistung;
                    const diffSchwierigkeit = latestStudentRec.schwierigkeit - avgSchwierigkeit;

                    return (
                      <div className="bg-white rounded-[2.5rem] p-4 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                             <BookOpen size={14} className="text-emerald-500" /> Antolin-Leseanalyse & Klassenvergleich
                          </h4>
                          <span className="text-[0.5625rem] font-black uppercase text-slate-655 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 tracking-wider">
                            Aktiver Lese-Snapshot
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-amber-50/20 p-3.5 rounded-2xl border border-amber-105 text-left">
                            <span className="text-[0.6rem] font-bold text-slate-500 block uppercase font-sans">Bücher gesamt</span>
                            <span className="text-lg font-black text-amber-700 font-mono mt-1 block">{latestStudentRec.anzahlBuecher}</span>
                          </div>
                          <div className="bg-emerald-50/20 p-3.5 rounded-2xl border border-emerald-105 text-left">
                            <span className="text-[0.6rem] font-bold text-slate-500 block uppercase font-sans">Punkte gesamt</span>
                            <span className="text-lg font-black text-emerald-700 font-mono mt-1 block">{latestStudentRec.punkte}</span>
                          </div>
                          <div className="bg-indigo-50/20 p-3.5 rounded-2xl border border-indigo-105 text-left">
                            <span className="text-[0.6rem] font-bold text-slate-500 block uppercase font-sans">Erfolgsquote</span>
                            <span className="text-lg font-black text-indigo-700 font-mono mt-1 block">{latestStudentRec.leistung}%</span>
                          </div>
                          <div className="bg-sky-50/20 p-3.5 rounded-2xl border border-sky-105 text-left">
                            <span className="text-[0.6rem] font-bold text-slate-500 block uppercase font-sans">Ø Schwierigkeit</span>
                            <span className="text-lg font-black text-sky-700 font-mono mt-1 block">ST {latestStudentRec.schwierigkeit}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-2 text-left">
                            <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block">Vergleich mit dem Klassendurchschnitt</span>
                            
                            <div className="space-y-1.5">
                              {/* Books */}
                              <div className="flex justify-between items-center py-1">
                                <span className="text-xs font-semibold text-slate-650">📖 Gelesene Bücher</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[0.6rem] text-slate-400">Schnitt: {avgBooksValue.toFixed(1)}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[0.65rem] font-bold font-mono ${diffBooks >= 0 ? 'bg-emerald-50 text-emerald-650' : 'bg-rose-50 text-rose-650'}`}>
                                    {diffBooks >= 0 ? `+${diffBooks.toFixed(1)}` : diffBooks.toFixed(1)}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Points */}
                              <div className="flex justify-between items-center py-1">
                                <span className="text-xs font-semibold text-slate-655">🏆 Antolinpunkte</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[0.6rem] text-slate-400">Schnitt: {avgPointsValue.toFixed(0)}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[0.65rem] font-bold font-mono ${diffPoints >= 0 ? 'bg-emerald-50 text-emerald-655' : 'bg-rose-50 text-rose-655'}`}>
                                    {diffPoints >= 0 ? `+${diffPoints.toFixed(0)}` : diffPoints.toFixed(0)}
                                  </span>
                                </div>
                              </div>

                              {/* Leistung */}
                              <div className="flex justify-between items-center py-1">
                                <span className="text-xs font-semibold text-slate-655">🎯 Erfolgsquote</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[0.6rem] text-slate-400">Schnitt: {avgLeistung.toFixed(1)}%</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[0.65rem] font-bold font-mono ${diffLeistung >= 0 ? 'bg-emerald-50 text-emerald-655' : 'bg-rose-50 text-rose-655'}`}>
                                    {diffLeistung >= 0 ? `+${diffLeistung.toFixed(1)}%` : `${diffLeistung.toFixed(1)}%`}
                                  </span>
                                </div>
                              </div>

                              {/* Schwierigkeit */}
                              <div className="flex justify-between items-center py-1">
                                <span className="text-xs font-semibold text-slate-655">⚖️ Ø Buchschwierigkeit</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[0.6rem] text-slate-400">Schnitt: ST {avgSchwierigkeit.toFixed(1)}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[0.65rem] font-bold font-mono ${diffSchwierigkeit >= 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
                                    {diffSchwierigkeit >= 0 ? `+${diffSchwierigkeit.toFixed(1)}` : diffSchwierigkeit.toFixed(1)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* KI analysis block */}
                          <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between text-left">
                            <div className="space-y-1.5">
                              <span className="text-[0.625rem] font-black uppercase text-indigo-600 tracking-wider flex items-center gap-1">
                                <Sparkles size={12} className="text-amber-500 animate-pulse" />
                                Pädagogisches Leseprofil (KI-Musteranalyse)
                              </span>
                              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                                {(() => {
                                  const interpretations: string[] = [];
                                  
                                  if (diffBooks > 3 && diffPoints > 80) {
                                    interpretations.push(`📚 **Herausragender Lese-Eifer**: Das Kind liest mit ${latestStudentRec.anzahlBuecher} Werken weit über dem Durchschnitt der Klasse (${avgBooksValue.toFixed(1)}) und sammelt eifrig Bonuspunkte.`);
                                  } else if (diffBooks > 0) {
                                    interpretations.push(`📚 **Aktiver Leser**: Das Lesevolumen (${latestStudentRec.anzahlBuecher} Bücher) liegt solides über dem Klassenschnitt.`);
                                  } else if (diffBooks < -2) {
                                    interpretations.push(`📚 **Wenig Lesemotivation**: Mit erst ${latestStudentRec.anzahlBuecher} gelesenen Büchern liegt das Kind unter dem Klassenschnitt (${avgBooksValue.toFixed(1)}). Förderung empfohlen.`);
                                  } else {
                                    interpretations.push(`📚 **Durchschnittlich**: Das Lesetempo liegt im stabilen Mittelfeld der Klasse.`);
                                  }

                                  if (diffSchwierigkeit >= 0.7) {
                                    interpretations.push(`🧠 **Anspruchsvoller Geschmack**: Das Kind traut sich an sichtlich schwerere Kost heran als die Klasse (Ø-Schwierigkeit ST ${latestStudentRec.schwierigkeit} im Vergleich zum Schulschnitt von ST ${avgSchwierigkeit.toFixed(1)}).`);
                                  } else if (diffSchwierigkeit >= 0.2) {
                                    interpretations.push(`🧠 **Anspruchsvoll**: Die ausgewählten Bücher fallen tendenziell etwas schwieriger aus als bei den Mitschülern.`);
                                  } else if (diffSchwierigkeit <= -0.7) {
                                    interpretations.push(`🌱 **Leichtere Kost**: Das Kind wählt deutlich einfachere Bücher (ST ${latestStudentRec.schwierigkeit} vs. Klassendurchschnitt ST ${avgSchwierigkeit.toFixed(1)}). Das ist ideal zur Steigerung des Leseflusses und Selbstvertrauens.`);
                                  } else {
                                    interpretations.push(`⚖️ **Standardniveau**: Die gewählte Lektüre passt genau zum durchschnittlichen Leseniveau der Klasse (ST ${latestStudentRec.schwierigkeit}).`);
                                  }

                                  if (latestStudentRec.leistung >= 90) {
                                    interpretations.push(`🎯 **Hohe Lesepräzision**: Mit ${latestStudentRec.leistung}% richtigen Antworten werden Buchinhalte exzellent verstanden und erinnert.`);
                                  } else if (diffLeistung < -8) {
                                    interpretations.push(`⚠️ **Flüchtigkeitsrisiko**: Die Erfolgsquote liegt mit ${latestStudentRec.leistung}% deutlich unter dem Schnitt von ${avgLeistung.toFixed(0)}%. Das Kind liest womöglich unaufmerksam.`);
                                  }

                                  return interpretations.join(' ');
                                })()}
                              </p>
                            </div>
                            <div className="text-[0.6rem] text-slate-400 mt-2 border-t pt-2 flex justify-between">
                              <span>Snapshot: {new Date(latestStudentRec.datum).toLocaleDateString('de-DE')}</span>
                              <span>{studentRecords.length} Importe insgesamt</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Detailed Log */}
                  <div className="bg-white rounded-[2.5rem] p-4 sm:p-8 border border-slate-200 shadow-sm">
                    <h4 className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                       <History size={14} /> Alle Messungen
                    </h4>
                    <div className="space-y-3">
                      {erhebungen.filter(e => e.schuelerId === selectedStudentId && filterDates(e.datum, timeFilter)).sort((a,b) => b.datum.localeCompare(a.datum)).map((entry, idx) => {
                        const test = tests.find(t => t.id === entry.testId);
                        return (
                          <motion.div 
                            key={entry.id} 
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: idx * 0.04 }}
                            className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col md:flex-row justify-between gap-4"
                          >
                            <div className="flex gap-4 items-center">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-[1.125rem] leading-normal ${isDiagnosticAlert(entry) ? 'bg-amber-100 text-amber-700 shadow-sm shadow-amber-200' : 'bg-white text-slate-800 shadow-sm'}`}>
                                {entry.ergebniswert}
                              </div>
                              <div>
                                <h5 className="text-[0.875rem] leading-snug font-black text-slate-900">{getDiagnosticTestName(entry.testId, tests)}</h5>
                                <div className="flex items-center gap-2 text-[0.625rem] font-bold text-slate-400">
                                  <span>{new Date(entry.datum).toLocaleDateString()}</span>
                                  <span>•</span>
                                  <span>Stufe {entry.schulstufe}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex-1 max-w-sm">
                              {entry.kommentar && (
                                <div className="text-[0.6875rem] text-slate-500 italic bg-white p-2 rounded-lg border border-slate-100 markdown-body">
                                  <Markdown>{entry.kommentar}</Markdown>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center md:justify-end gap-2">
                              {isDiagnosticAlert(entry) && (
                                <button 
                                  onClick={() => {
                                    setApp(prev => {
                                      const students = [...prev.schueler];
                                      const sIdx = students.findIndex(s => s.id === entry.schuelerId);
                                      if (sIdx === -1) return prev;
                                      const student = students[sIdx];
                                      const fp = student.foerderprofil || { staerken: [], foerderbedarfBereiche: [], foerderziele: [], diagnosen: '', zusatzinfo: '' };
                                      const ziele = fp.foerderziele || [];
                                      const testName = test?.name || 'Unbekannter Test';
                                      const newZiel = `Fokusbedarf aufholen: ${testName} (Ergebnis: ${entry.ergebniswert})`;
                                      if (!ziele.some(z => z.ziel === newZiel)) {
                                        ziele.push({ id: crypto.randomUUID(), bereich: test?.kategorie || 'Lernen', ziel: newZiel, status: 'offen', startDatum: formatLocalDateKey(new Date()), zielDatum: '' });
                                      }
                                      students[sIdx] = { ...student, foerderprofil: { ...fp, foerderziele: ziele } };
                                      return { ...prev, schueler: students };
                                    });
                                    alert('Erfolgreich als Ziel ins Förderprofil übernommen!');
                                  }}
                                  className="p-2 text-indigo-500 hover:text-indigo-700 transition-all rounded-lg hover:bg-indigo-50 flex items-center gap-1 text-[0.625rem] font-black uppercase tracking-widest"
                                  title="Als Ziel ins Förderprofil übernehmen"
                                >
                                  <ClipboardList size={16} /> 
                                  <span className="hidden sm:inline">In Förderprofil</span>
                                </button>
                              )}
                              <button 
                                onClick={() => {
                                  if(confirm('Eintrag löschen?')) {
                                    setApp(prev => ({ ...prev, diagnostikErhebungen: prev.diagnostikErhebungen.filter(e => e.id !== entry.id) }));
                                  }
                                }}
                                className="p-2 text-slate-300 hover:text-rose-500 transition-all rounded-lg hover:bg-rose-50"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                      {erhebungen.filter(e => e.schuelerId === selectedStudentId && filterDates(e.datum, timeFilter)).length === 0 && (
                        <div className="text-center py-12 text-slate-300 italic text-[0.875rem] leading-snug">Keine Daten vorhanden</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vorlagen-Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-black text-slate-800 flex items-center gap-2"><Database size={18} className="text-indigo-500" /> Test-Vorlagen</h3>
                <p className="text-[0.75rem] font-bold text-slate-400 mt-1">Übernehme standardisierte Tests in deinen Katalog.</p>
              </div>
              <button onClick={() => setIsTemplateModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {TEST_TEMPLATES.map((tpl, i) => (
                  <div key={i} className="bg-white border text-left border-slate-200 p-4 rounded-3xl flex flex-col justify-between hover:border-indigo-300 transition-all group shadow-sm hover:shadow-md">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                         <span className={`px-2 py-1 rounded-lg text-[0.5rem] font-black uppercase tracking-widest ${KATEGORIE_COLORS[tpl.kategorie]}`}>
                            {KATEGORIE_LABELS[tpl.kategorie]}
                         </span>
                         <span className="text-[0.6rem] font-bold text-slate-400 border border-slate-200 px-2 rounded-md">{tpl.einheit}</span>
                      </div>
                      <h4 className="text-[1rem] leading-tight font-black text-slate-800 mb-2">{tpl.name}</h4>
                      <p className="text-[0.7rem] text-slate-500 mb-4">{tpl.kurzbeschreibung}</p>
                    </div>
                    <button 
                      onClick={() => {
                        const newTest: DiagnostikTest = { ...tpl, id: crypto.randomUUID() };
                        setApp(prev => ({ ...prev, diagnostikTests: [...prev.diagnostikTests, newTest] }));
                        setIsTemplateModalOpen(false);
                      }}
                      className="w-full py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[0.625rem] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all overflow-hidden flex items-center justify-center gap-2 group-hover:shadow-md"
                    >
                      <Plus size={14} className="group-hover:scale-110 transition-transform" /> In Katalog übernehmen
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <PedagogicalTextHelper
        isOpen={textHelperOpen}
        initialText={textHelperInitial}
        onClose={() => setTextHelperOpen(false)}
        onApply={handleApplyOptimizedText}
      />

      <InteractionModal 
        isOpen={isInteractionModalOpen}
        onClose={() => setIsInteractionModalOpen(false)}
        presetStudentId={interactionPresetId}
      />

      {/* Diagnostik-zu-Notenverwaltung Übertrags-Modal */}
      {gradeTransferTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-black text-slate-800 flex items-center gap-2">
                  <FileCheck size={18} className="text-emerald-500" />
                  In Notenverwaltung übertragen
                </h3>
                <p className="text-[0.75rem] font-bold text-slate-400 mt-1">
                  Trage das Ergebnis direkt in die Notenmappe ein.
                </p>
              </div>
              <button
                onClick={() => setGradeTransferTarget(null)}
                className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white space-y-6">
              {/* Schüler Info */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-150 rounded-2xl">
                <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-sm">
                  {(() => {
                    const st = app.schueler.find(s => s.id === gradeTransferTarget.entry.schuelerId);
                    return st ? st.vorname[0] : '?';
                  })()}
                </div>
                <div>
                  <h4 className="font-black text-[0.9rem] text-slate-800">
                    {(() => {
                      const st = app.schueler.find(s => s.id === gradeTransferTarget.entry.schuelerId);
                      return st ? `${st.vorname} ${st.nachname}` : 'Unbekannter Schüler';
                    })()}
                  </h4>
                  <p className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Test: {gradeTransferTarget.test.name}
                  </p>
                </div>
              </div>

              {/* Progress and Analysis Widget */}
              {(() => {
                const currentVal = gradeTransferTarget.entry.ergebniswert;
                const thresholdVal = gradeTransferTarget.test.schwellenwert;
                const previous = previousEntries[0];
                const isPos = gradeTransferTarget.test.schwellenrichtung === 'unter';
                const isSuccess = isPos ? currentVal >= thresholdVal : currentVal <= thresholdVal;

                return (
                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-3xl text-left space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">📈</span>
                      <h4 className="font-extrabold text-[0.75rem] text-slate-800 uppercase tracking-wide">
                        Leistungs- & Fortschritts-Check
                      </h4>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-2xl border border-slate-150">
                        <span className="text-[0.55rem] font-black text-slate-400 uppercase tracking-wider block mb-0.5">
                          Ergebniswert
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-black text-indigo-600 font-mono">
                            {currentVal}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">
                            {gradeTransferTarget.test.einheit}
                          </span>
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-2xl border border-slate-150">
                        <span className="text-[0.55rem] font-black text-slate-400 uppercase tracking-wider block mb-0.5">
                          Sollwert
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-black text-slate-700 font-mono">
                            {thresholdVal}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">
                            {gradeTransferTarget.test.einheit}
                          </span>
                        </div>
                      </div>
                    </div>

                    {previous ? (
                      (() => {
                        const diff = currentVal - previous.ergebniswert;
                        const isBetter = isPos ? diff > 0 : diff < 0;
                        const pct = previous.ergebniswert > 0 ? (Math.abs(diff) / previous.ergebniswert) * 100 : 0;

                        return (
                          <div className="bg-white p-3 rounded-2xl border border-slate-150 space-y-1">
                            <span className="text-[0.55rem] font-black text-slate-400 uppercase tracking-wider block">
                              Vergleich zum Vorwert ({new Date(previous.datum).toLocaleDateString()})
                            </span>
                            <div className="flex items-center justify-between font-bold">
                              <span className="text-[0.7rem] text-slate-600">
                                Vorwert: <span className="font-extrabold font-mono">{previous.ergebniswert}</span>
                              </span>
                              <span
                                className={`text-[0.65rem] px-2 py-0.5 rounded-lg flex items-center gap-0.5 font-black uppercase tracking-wider ${
                                  isBetter ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                                }`}
                              >
                                {isBetter ? 'Fortschritt ▲ ' : 'Rückschritt ▼ '}
                                {diff > 0 ? `+${diff}` : diff} ({pct.toFixed(0)}%)
                              </span>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="bg-white p-3 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-[0.65rem] font-bold uppercase text-center tracking-wider py-4">
                        ℹ️ Erstmessung dieses Schülers (Kein Vorwert)
                      </div>
                    )}

                    <div className="bg-indigo-50/50 border border-indigo-100/50 p-3 rounded-2xl text-[0.7rem] leading-relaxed text-indigo-800">
                      <span className="font-black uppercase tracking-wider block mb-1 text-[0.6rem]">
                        💡 System-Vorschlag:
                      </span>
                      {isSuccess ? (
                        <span>
                          Sollwert erfüllt!
                          {previous && currentVal > previous.ergebniswert && (
                            <span className="font-semibold">
                              {" "}
                              Ein kontinuierlicher Fortschritt ({currentVal - previous.ergebniswert} {gradeTransferTarget.test.einheit}) wurde registriert!
                            </span>
                          )}
                          {" "}Daher wird die Note **{recommendedGrade}** vorgeschlagen.
                        </span>
                      ) : (
                        <span>
                          Sollwert unterlaufen. Pädagogischer Förderbedarf besteht. Vorgeschlagene Note: **{recommendedGrade}**.
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Form Options */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Fach */}
                  <div>
                    <label className="block text-[0.625rem] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                      Fach (Gegenstand)
                    </label>
                    <select
                      value={transGradesForm.fach}
                      onChange={e => setTransGradesForm(prev => ({ ...prev, fach: e.target.value }))}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[0.8rem] font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                    >
                      {['Deutsch', 'Mathematik', 'Sachunterricht', 'Englisch', 'Musikerziehung', 'Bildnerische Erziehung', 'Werken (TEC)', 'Werken (TEX)', 'Bewegung und Sport', 'Religion'].map(f => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Semester */}
                  <div>
                    <label className="block text-[0.625rem] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                      Semester
                    </label>
                    <select
                      value={transGradesForm.sem}
                      onChange={e => setTransGradesForm(prev => ({ ...prev, sem: e.target.value }))}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[0.8rem] font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="1. Semester">1. Semester</option>
                      <option value="2. Semester">2. Semester</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Grade Type */}
                  <div>
                    <label className="block text-[0.625rem] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                      Noten-Kategorie
                    </label>
                    <select
                      value={transGradesForm.typ}
                      onChange={e => setTransGradesForm(prev => ({ ...prev, typ: e.target.value as any, idx: -1 }))}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[0.8rem] font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="lzk">Lernzielkontrolle (LZK)</option>
                      <option value="wp">Wochenplan (WOPL)</option>
                      <option value="obj">Objekt/Aufgabe (OBJ)</option>
                      <option value="sa">Schularbeit (SA)</option>
                    </select>
                  </div>

                  {/* Column Slot */}
                  <div>
                    <label className="block text-[0.625rem] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                      Zielspalte in Notenmappe
                    </label>
                    <select
                      value={transGradesForm.idx}
                      onChange={e => setTransGradesForm(prev => ({ ...prev, idx: parseInt(e.target.value, 10) }))}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[0.8rem] font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                    >
                      <option value={-1}>Sollwert / Neue Spalte erstellen (+)</option>
                      {(() => {
                        const currentCounts = app.notenMeta?.[transGradesForm.fach]?.colCounts || { lzk: 4, wp: 4, obj: 4 };
                        const count = transGradesForm.typ === 'sa' 
                          ? (app.notenMeta?.[transGradesForm.fach]?.saCount ?? 4) 
                          : (currentCounts[transGradesForm.typ] || 4);
                        return Array.from({ length: count }).map((_, i) => (
                          <option key={i} value={i}>
                            Spalte {i + 1} überschreiben
                          </option>
                        ));
                      })()}
                    </select>
                  </div>
                </div>

                {/* Grade Selection (Note 1-5) */}
                <div>
                  <label className="block text-[0.625rem] font-black uppercase tracking-widest text-slate-400 mb-2">
                    Festzulegende Schulnote
                  </label>
                  <div className="flex justify-between gap-1.5">
                    {['1', '2', '3', '4', '5'].map(g => {
                      const isActive = transGradesForm.grade === g;
                      const labels = ['Sehr gut', 'Gut', 'Befriedigend', 'Genügend', 'Nicht genügend'];
                      const subLabel = labels[parseInt(g, 10) - 1];
                      
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setTransGradesForm(prev => ({ ...prev, grade: g }))}
                          className={`flex-1 py-2 rounded-xl flex flex-col items-center border transition-all cursor-pointer ${
                            isActive
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <span className="text-sm font-black">{g}</span>
                          <span className={`text-[0.45rem] font-black tracking-wide uppercase mt-0.5 ${isActive ? 'text-white' : 'text-slate-400'}`}>
                            {subLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Kommentar / Notiz */}
                <div>
                  <label className="block text-[0.625rem] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                    Noten-Bemerkung (optional)
                  </label>
                  <input
                    type="text"
                    value={transGradesForm.kommentar}
                    onChange={e => setTransGradesForm(prev => ({ ...prev, kommentar: e.target.value }))}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[0.8rem] font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                    placeholder="Bezeichnung des Abgleichs"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setGradeTransferTarget(null)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-[0.7rem] font-extrabold uppercase tracking-wider"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleTransferToGradebook}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[0.7rem] font-black uppercase tracking-wider shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
              >
                <FileCheck size={14} /> Note eintragen
              </button>
            </div>
          </motion.div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

const getStaticTrend = (studentId: string, erhebungen: DiagnostikErhebung[], tests: DiagnostikTest[]) => {
  const studentErhebungen = erhebungen.filter(e => e.schuelerId === studentId);
  if (studentErhebungen.length < 2) {
    return { trend: 'none', label: 'Erstmessung', changeStr: '0%' };
  }
  const sorted = [...studentErhebungen].sort((a, b) => a.datum.localeCompare(b.datum));
  const lastThree = sorted.slice(-3);
  const normalizedScores = lastThree.map(e => {
    const test = tests.find(t => t.id === e.testId);
    if (!test) return { score: e.ergebniswert, valid: false };
    const threshold = test.schwellenwert || 1;
    let scoreMetric = 1;
    if (test.schwellenrichtung === 'unter') {
      scoreMetric = e.ergebniswert / threshold;
    } else {
      scoreMetric = threshold / (e.ergebniswert || 1);
    }
    return { score: scoreMetric, valid: true };
  });
  const validScores = normalizedScores.filter(s => s.valid);
  if (validScores.length < 2) return { trend: 'none', label: 'Erstmessung', changeStr: '0%' };
  const oldest = validScores[0];
  const latest = validScores[validScores.length - 1];
  let change = 0;
  if (oldest.score > 0) {
    change = (latest.score - oldest.score) / oldest.score;
  } else {
    change = latest.score - oldest.score;
  }
  let trend: 'improved' | 'worsened' | 'stable' = 'stable';
  if (change >= 0.05) trend = 'improved';
  else if (change <= -0.05) trend = 'worsened';
  const changeStr = change > 0 ? `+${(change * 100).toFixed(0)}%` : `${(change * 100).toFixed(0)}%`;
  return { trend, label: trend === 'improved' ? 'verbessert' : trend === 'worsened' ? 'verschlechtert' : 'stabil', changeStr };
};

const PrintClassOverview: React.FC<{ tests: DiagnostikTest[], erhebungen: DiagnostikErhebung[], students: Student[], onClose: () => void }> = ({ tests, erhebungen, students, onClose }) => (
  <div className="fixed inset-0 z-[500] bg-white p-12 overflow-y-auto print:p-0">
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 print:hidden">
        <div>
          <h1 className="text-[1.875rem] leading-tight sm:text-4xl font-black text-slate-900 tracking-tight">Klassenübersicht Diagnostik</h1>
          <p className="text-slate-500 font-bold uppercase mt-2">{new Date().toLocaleDateString('de-AT', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => window.print()} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[0.6875rem] font-black uppercase tracking-widest hover:bg-indigo-700">
            Druckbefehl
          </button>
          <button onClick={onClose} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl text-[0.6875rem] font-black uppercase tracking-widest">
            Schließen
          </button>
        </div>
      </div>

      <div className="space-y-12">
        {tests.map(test => {
          const testResults = erhebungen.filter(e => e.testId === test.id);
          if (testResults.length === 0) return null;

          return (
            <div key={test.id} className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h2 className="text-[1.5rem] leading-normal font-black text-slate-900">{test.name}</h2>
                <span className="text-[0.75rem] leading-tight font-black uppercase tracking-widest text-slate-400">{test.kurzbeschreibung}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                {[...students].sort((a,b) => a.nachname.localeCompare(b.nachname)).map(student => {
                  const latest = testResults.filter(r => r.schuelerId === student.id).sort((a,b) => b.datum.localeCompare(a.datum))[0];
                  const stTrend = getStaticTrend(student.id, erhebungen, tests);
                  return (
                    <div key={student.id} className="flex justify-between items-center py-2 border-b border-slate-50">
                      <div className="flex items-center gap-2">
                        <span className="text-[0.875rem] leading-snug font-bold text-slate-800">{student.nachname} {student.vorname}</span>
                        {stTrend.trend === 'improved' && <span className="text-[10px] text-emerald-600 font-bold" title="Verbessert">📈</span>}
                        {stTrend.trend === 'worsened' && <span className="text-[10px] text-rose-600 font-bold" title="Verschlechtert">📉</span>}
                        {stTrend.trend === 'stable' && <span className="text-[10px] text-amber-600 font-bold" title="Stabil">➡️</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[0.875rem] leading-snug font-black px-2 py-1 rounded-md ${latest && isDiagnosticAlert(latest) ? 'bg-amber-100 text-amber-700' : 'text-slate-600'}`}>
                          {latest ? latest.ergebniswert : '—'}
                          {latest && <span className="text-[10px] text-slate-400 font-normal ml-1">({test.einheit})</span>}
                        </span>
                        <span className="text-[0.625rem] text-slate-300 font-medium w-16 text-right">
                          {latest ? new Date(latest.datum).toLocaleDateString() : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="pt-20 text-[0.625rem] text-slate-400 font-bold uppercase tracking-widest text-center border-t border-slate-100 italic">
        Vertrauliche Dokumentation • Generiert durch Klassio Diagnostik • {new Date().toLocaleString()}
      </div>
    </div>
  </div>
);

const PrintStudentReport: React.FC<{ student: Student, tests: DiagnostikTest[], erhebungen: DiagnostikErhebung[], onClose: () => void }> = ({ student, tests, erhebungen, onClose }) => {
  const tData = getStaticTrend(student.id, erhebungen, tests);
  return (
    <div className="fixed inset-0 z-[500] bg-white p-12 overflow-y-auto print:p-0">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 print:hidden">
          <div>
            <h1 className="text-[1.875rem] leading-tight sm:text-4xl font-black text-slate-900 tracking-tight">Diagnostik-Bericht</h1>
            <p className="text-[1.25rem] leading-normal font-black text-indigo-600 mt-2">{student.nachname} {student.vorname}</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => window.print()} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[0.6875rem] font-black uppercase tracking-widest hover:bg-indigo-700">
              Druckbefehl
            </button>
            <button onClick={onClose} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl text-[0.6875rem] font-black uppercase tracking-widest">
              Schließen
            </button>
          </div>
        </div>

        {/* Global Trend Block inside Student PDF Report */}
        <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <span className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest block mb-1">Entwicklungstrend (Letzte 3 Tests)</span>
            <div className="flex items-center gap-3 mt-1.5">
              <span className={`text-[0.8125rem] leading-normal font-extrabold px-3 py-1.5 rounded-xl border ${
                tData.trend === 'improved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                tData.trend === 'worsened' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {tData.trend === 'improved' ? '📈 Verbessert' :
                 tData.trend === 'worsened' ? '📉 Verschlechtert' : '➡️ Stabil'}
              </span>
              {tData.trend !== 'none' && (
                <span className="text-[0.75rem] leading-tight font-black text-slate-500">Ipsativer Zuwachs: {tData.changeStr}</span>
              )}
            </div>
          </div>
          <div className="md:text-right">
            <span className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest block mb-1">Pädagogische Einschätzung</span>
            <span className="text-[0.8125rem] font-black text-slate-800 mt-1 block">
              {tData.trend === 'improved' ? 'Exzellente Lernentwicklung im letzten Zyklus.' :
               tData.trend === 'worsened' ? 'Spezifische Förderdiagnostik & Unterstützung empfohlen.' :
               'Konsolidierte Leistungen ohne signifikante Abweichungen.'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:p-8">
          {tests.map(test => {
            const results = erhebungen.filter(e => e.schuelerId === student.id && e.testId === test.id).sort((a,b) => b.datum.localeCompare(a.datum));
            if (results.length === 0) return null;

            return (
              <div key={test.id} className="p-4 sm:p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                <h3 className="text-[1.125rem] leading-normal font-black text-slate-900 border-b border-slate-200 pb-2">{test.name}</h3>
                <div className="space-y-3">
                  {results.map((res, i) => (
                    <div key={res.id} className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-[0.75rem] leading-tight font-black text-slate-500">{new Date(res.datum).toLocaleDateString()}</span>
                        {i === 0 && <span className="text-[0.5625rem] font-black uppercase text-indigo-500 tracking-wider">Aktuell</span>}
                      </div>
                      <div className={`text-[1.25rem] leading-normal font-black ${isDiagnosticAlert(res) ? 'text-amber-600' : 'text-slate-800'}`}>
                        {res.ergebniswert} <span className="text-[0.625rem] font-bold text-slate-400 uppercase">{test.einheit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="pt-20 text-[0.625rem] text-slate-400 font-bold uppercase tracking-widest text-center border-t border-slate-100 italic">
           Diagnostische Dokumentation • {student.nachname} {student.vorname} • Generiert {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};

export default Diagnostik;
