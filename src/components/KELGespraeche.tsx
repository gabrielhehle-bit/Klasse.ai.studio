import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessagesSquare, 
  Smile, 
  Target, 
  FileText, 
  Printer, 
  Plus, 
  Calendar, 
  Users, 
  User, 
  ChevronRight, 
  Trash2, 
  Save, 
  X, 
  ArrowLeft, 
  Sparkles,
  CheckCircle2,
  Clock,
  LayoutGrid,
  Info,
  History,
  BarChart3,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Wallet,
  AlertCircle,
  ThumbsUp,
  Compass,
  Heart,
  SmilePlus,
  GraduationCap,
  BookOpen,
  Star,
  Map,
  Award
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EmptyState } from './EmptyState';
import { logActivity } from '../lib/utils';
import { 
  KELGespraech, 
  STANDARD_KEL_BEREICHE, 
  KELBereich, 
  Student 
} from '../types';
import { FAECHER_ALLE } from '../constants';
import { FlowerChart, KEL_GRADES_INFO } from './FlowerChart';
import { berechne } from '../lib/GradeUtils';
import { generateKELAssessment, generateKELAgreement } from '../services/aiService';
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  Legend, 
  Tooltip as RechartsTooltip, 
  BarChart, 
  Bar, 
  CartesianGrid, 
  XAxis, 
  YAxis,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

const SMILEYS = [
  { wert: 5, icon: '🏆', label: 'Hervorragend' },
  { wert: 4, icon: '🌟', label: 'Sehr gut' },
  { wert: 3, icon: '👍', label: 'Gut' },
  { wert: 2, icon: '✍️', label: 'Teilweise' },
  { wert: 1, icon: '⏳', label: 'In Ansätzen' }
];

const normalizeRating = (v: any, meeting?: any) => {
  if (v === undefined || v === null) return 3;
  const val = Number(v);
  if (val === 5) return 5;
  if (val === 0) return 1;

  // Detect if the meeting is on the new 1-5 scale:
  const hasFive = meeting ? (
    Object.values(meeting.selbsteinschaetzungKind || {}).some((k: any) => (k as any).wert === 5) || 
    Object.values(meeting.einschaetzungLehrperson || {}).some((l: any) => (l as any).wert === 5)
  ) : false;

  if (!hasFive && val >= 1 && val <= 4) {
    if (val === 1) return 5;
    if (val === 2) return 4;
    if (val === 3) return 3;
    if (val === 4) return 2;
  }
  return val;
};

const KATEGORIE_COLORS = {
  lernen: 'bg-blue-50 text-blue-600 border-blue-100',
  arbeitsverhalten: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  sozialverhalten: 'bg-rose-50 text-rose-600 border-rose-100',
  interessen: 'bg-amber-50 text-amber-600 border-amber-100'
};

const KATEGORIE_LABELS = {
  lernen: 'Lernen',
  arbeitsverhalten: 'Arbeitsverhalten',
  sozialverhalten: 'Sozialverhalten',
  interessen: 'Interessen'
};

const KELGespraeche: React.FC = () => {
  const { app, setApp, setPage } = useApp();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Partial<KELGespraech> | null>(null);
  const [activeTab, setActiveTab] = useState<'vorbereitung' | 'kind' | 'lehrperson' | 'ziele'>('vorbereitung');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<string | null>(null);
  const [viewingMeeting, setViewingMeeting] = useState<KELGespraech | null>(null);
  const [isPrintMode, setIsPrintMode] = useState<'child' | 'protocol' | null>(null);
  const [filterStudentId, setFilterStudentId] = useState<string>('all');

  const [kelTab, setKelTab] = useState<'protokolle' | 'analyse'>('protokolle');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [analyseChartType, setAnalyseChartType] = useState<'column' | 'bar' | 'pie' | 'line'>('column');
  const [notesFilterCategory, setNotesFilterCategory] = useState<string>('all');
  const [kelCategoriesToShow, setKelCategoriesToShow] = useState<string[]>(['lernen', 'arbeitsverhalten', 'sozialverhalten', 'interessen']);
  const [isFullWidthChart, setIsFullWidthChart] = useState<boolean>(false);
  const [portfolioEntries, setPortfolioEntries] = useState<Record<string, { id: string; titel: string; fach: string; datum: string; bewertung: string; beschreibung: string }[]>>(() => {
    try {
      const raw = localStorage.getItem('lm_portfolio_entries_v2');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  });

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const meetings = useMemo(() => app.kelGespraeche || [], [app.kelGespraeche]);

  const filteredMeetings = useMemo(() => {
    if (filterStudentId === 'all') return meetings;
    return meetings.filter(m => m.schuelerId === filterStudentId);
  }, [meetings, filterStudentId]);

  const groupedMeetings = useMemo(() => {
    const groups: Record<string, KELGespraech[]> = {};
    filteredMeetings.forEach(m => {
      if (!groups[m.schuljahr]) groups[m.schuljahr] = [];
      groups[m.schuljahr].push(m);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredMeetings]);

  const handleCreateNew = () => {
    const newMeeting: Partial<KELGespraech> = {
      id: crypto.randomUUID(),
      datum: new Date().toISOString().split('T')[0],
      schuljahr: app.schuljahr || '2023/24',
      teilnehmer: ['Kind', 'Klassenlehrerin'],
      selbsteinschaetzungKind: {},
      einschaetzungLehrperson: {},
      zieleKind: [],
      vereinbarungen: '',
      naechsterTermin: '',
      unterschriftKind: false,
      unterschriftEltern: false,
      unterschriftLehrperson: false,
      notiz: ''
    };
    setEditingMeeting(newMeeting);
    setActiveTab('vorbereitung');
    setIsEditorOpen(true);
  };

  const handleEdit = (meeting: KELGespraech) => {
    setEditingMeeting(meeting);
    setActiveTab('vorbereitung');
    setIsEditorOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Möchtest du dieses KEL-Gespräch wirklich löschen?')) {
      const updated = meetings.filter(m => m.id !== id);
      setApp(prev => ({ ...prev, kelGespraeche: updated }));
    }
  };

  const handleSave = () => {
    if (!editingMeeting?.schuelerId) return alert('Bitte wähle ein Kind aus.');
    
    const meetingToSave = editingMeeting as KELGespraech;
    const existingIndex = meetings.findIndex(m => m.id === meetingToSave.id);
    
    let updatedMeetings;
    if (existingIndex >= 0) {
      updatedMeetings = meetings.map((m, i) => i === existingIndex ? meetingToSave : m);
    } else {
      updatedMeetings = [...meetings, meetingToSave];
    }
    
    setApp(prev => ({ ...prev, kelGespraeche: updatedMeetings }));
    
    const student = app.schueler.find(s => s.id === meetingToSave.schuelerId);
    if (student) {
      logActivity(setApp, `KEL-Gespräch mit ${student.vorname} ${student.nachname} gespeichert`, 'kel', meetingToSave.id);
    }

    setIsEditorOpen(false);
    setEditingMeeting(null);
  };

  const handleAiAssessment = async (bereich: KELBereich) => {
    const current = editingMeeting?.einschaetzungLehrperson?.[bereich.id]?.kommentar || '';
    if (!current && !window.confirm('Soll ein Text basierend auf dem Bereichsnamen generiert werden?')) return;
    
    setIsAiLoading(bereich.id);
    const result = await generateKELAssessment(bereich.label, current);
    if (result) {
      setEditingMeeting(prev => ({
        ...prev,
        einschaetzungLehrperson: {
          ...prev?.einschaetzungLehrperson,
          [bereich.id]: {
            ...prev?.einschaetzungLehrperson?.[bereich.id],
            wert: prev?.einschaetzungLehrperson?.[bereich.id]?.wert || 2,
            kommentar: result
          }
        }
      }));
    }
    setIsAiLoading(null);
  };

  const handleAiAgreement = async () => {
    const current = editingMeeting?.vereinbarungen || '';
    if (!current && !window.confirm('Soll eine Vereinbarung basierend auf den Zielen generiert werden?')) return;
    
    setIsAiLoading('agreement');
    const goalsText = editingMeeting?.zieleKind?.map(z => z.ziel).join(', ') || '';
    const result = await generateKELAgreement(current || goalsText);
    if (result) {
      setEditingMeeting(prev => ({
        ...prev,
        vereinbarungen: result
      }));
    }
    setIsAiLoading(null);
  };

  const getStudentName = (id: string) => {
    const s = app.schueler.find(x => x.id === id);
    return s ? `${s.vorname} ${s.nachname}` : 'Unbekannt';
  };

  const getAbsenceStatsForStudent = (sid: string) => {
    const data = app.anwesenheit?.[sid] || {};
    let excused = 0;
    let unexcused = 0;
    Object.values(data).forEach(dayData => {
      Object.values(dayData).forEach(status => {
        if (status === 'e') excused++;
         else if (status === 'u') unexcused++;
      });
    });
    return { excused, unexcused, total: excused + unexcused };
  };

  const classAvgAbsences = useMemo(() => {
    if (app.schueler.length === 0) return { excused: 0, unexcused: 0, total: 0 };
    let totalExcused = 0;
    let totalUnexcused = 0;
    app.schueler.forEach(s => {
      const stats = getAbsenceStatsForStudent(s.id);
      totalExcused += stats.excused;
      totalUnexcused += stats.unexcused;
    });
    const cExcused = Number((totalExcused / app.schueler.length).toFixed(1));
    const cUnexcused = Number((totalUnexcused / app.schueler.length).toFixed(1));
    return {
      excused: cExcused,
      unexcused: cUnexcused,
      total: Number((cExcused + cUnexcused).toFixed(1))
    };
  }, [app.anwesenheit, app.schueler]);

  const [portalSearch, setPortalSearch] = useState('');

  const renderStudentPortal = () => {
    const sortedStudents = [...app.schueler].sort((a,b) => a.nachname.localeCompare(b.nachname));
    const searchedStudents = sortedStudents.filter(s => 
      `${s.vorname} ${s.nachname}`.toLowerCase().includes(portalSearch.toLowerCase())
    );

    return (
      <div className="space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div>
            <h2 className="text-[0.75rem] font-black uppercase tracking-[0.2em] text-indigo-600 flex items-center gap-2 mb-1">
              <BarChart3 size={16} />
              Eltern-Dashboard & Analyse
            </h2>
            <h1 className="text-[1.875rem] leading-tight font-black text-slate-900 tracking-tight">KEL-Visuelle Analyse</h1>
            <p className="text-[0.875rem] leading-snug font-medium text-slate-400 mt-1">Interaktive Leistungsbeurteilungen & Auswertungen für Elterngespräche</p>
          </div>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 shadow-xs shrink-0 gap-1">
            <button 
              onClick={() => { setKelTab('protokolle'); setSelectedStudentId(null); }}
              className="px-6 py-3 text-[0.75rem] leading-tight font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 text-slate-500 hover:text-slate-800"
            >
              <MessagesSquare size={14} className="text-rose-500" />
              Protokolle
            </button>
            <button 
              className="px-6 py-3 text-[0.75rem] leading-tight font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 bg-white text-slate-950 shadow-md"
            >
              <BarChart3 size={14} className="text-indigo-600" />
              Visuelle Analyse
            </button>
          </div>
        </header>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
          <div>
            <h3 className="text-[1.125rem] leading-normal font-black text-slate-900 tracking-tight">Schulinterne Analyse-Portal</h3>
            <p className="text-slate-400 text-[0.75rem] leading-tight font-bold uppercase mt-0.5 tracking-wider">Wähle ein Kind aus, um das interaktive Eltern-Dashboard zu laden</p>
          </div>
          <div className="relative w-full sm:w-80">
            <input 
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-350 focus:border-indigo-500 rounded-2xl pl-10 pr-4 py-2.5 text-[0.75rem] leading-tight font-bold text-slate-700 cursor-text outline-none transition-all placeholder:text-slate-400"
              placeholder="Suchen nach Name..."
              value={portalSearch}
              onChange={e => setPortalSearch(e.target.value)}
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[0.75rem] leading-tight">🔍</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {searchedStudents.map(s => {
            let totalGradeSum = 0;
            let activeGradesCount = 0;
            FAECHER_ALLE.forEach(fach => {
              const grade = berechne(app, s.id, fach, '1');
              if (grade && grade > 0) {
                totalGradeSum += grade;
                activeGradesCount++;
              }
            });
            const localAvg = activeGradesCount > 0 ? totalGradeSum / activeGradesCount : null;
            const att = getAbsenceStatsForStudent(s.id);
            const portfolioCount = (portfolioEntries[s.id] || []).length;

            return (
              <div 
                key={s.id}
                onClick={() => setSelectedStudentId(s.id)}
                className="group bg-white p-6 rounded-[2.5rem] border border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-xl hover:shadow-slate-900/5 hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between min-h-[220px]"
              >
                <div className="flex items-start gap-4">
                  {s.foto ? (
                    <img 
                      src={s.foto} 
                      alt="" 
                      className="w-12 h-12 rounded-2xl object-cover shrink-0 border border-slate-100"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-[0.875rem] leading-snug shrink-0 border border-indigo-100/50">
                      {s.vorname.charAt(0)}{s.nachname.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-[1rem] leading-normal font-black text-slate-800 uppercase tracking-tight group-hover:text-indigo-650 transition-colors">{s.nachname} {s.vorname}</h3>
                    <p className="text-[0.75rem] leading-tight font-bold text-slate-400 uppercase tracking-wider">{s.niveau ? `Level ${s.niveau}` : 'Einschulungsklasse'}</p>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {s.spf && <span className="px-1.5 py-0.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 text-[0.5rem] font-black uppercase">SPF</span>}
                      {s.daz && <span className="px-1.5 py-0.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 text-[0.5rem] font-black uppercase">DAZ</span>}
                      {portfolioCount > 0 && <span className="px-1.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 text-[0.5rem] font-black uppercase">{portfolioCount} Portfolio</span>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 py-3 bg-slate-50/50 rounded-2xl px-3 border border-slate-100/50 text-left">
                  <div>
                    <span className="text-[0.5rem] font-black uppercase text-slate-400 tracking-wider">Fehlzeiten</span>
                    <span className="block text-[0.875rem] leading-snug font-black text-slate-800">{att.total} Std.</span>
                  </div>
                  <div>
                    <span className="text-[0.5rem] font-black uppercase text-slate-400 tracking-wider">GPA Ø Noten</span>
                    <span className="block text-[0.875rem] leading-snug font-black text-slate-800">{localAvg ? localAvg.toFixed(2) : '–'}</span>
                  </div>
                </div>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStudentId(s.id);
                  }}
                  className="w-full mt-4 py-3 bg-slate-50 group-hover:bg-indigo-600 group-hover:text-white text-slate-400 rounded-2xl text-[0.5625rem] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-slate-100"
                >
                  Analyse öffnen
                  <ChevronRight size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderParentsDashboardView = (sid: string) => {
    const student = app.schueler.find(s => s.id === sid);
    if (!student) return null;

    // Grades comparatives
    const activeFaecher = FAECHER_ALLE.filter(f => !app.faecher || app.faecher.includes(f));
    const gradeData = activeFaecher.map(fach => {
      const sAvg = berechne(app, sid, fach, '1');
      let classSum = 0;
      let classCount = 0;
      app.schueler.forEach(st => {
        const g = berechne(app, st.id, fach, '1');
        if (g !== null) {
          classSum += g;
          classCount++;
        }
      });
      const cAvg = classCount > 0 ? classSum / classCount : null;
      if (sAvg === null && cAvg === null) return null;
      return {
        subject: fach.length > 15 ? `${fach.substring(0, 15)}...` : fach,
        fullSubjectName: fach,
        'Schüler': sAvg !== null ? Number(sAvg.toFixed(2)) : 0,
        'Klassen-Ø': cAvg !== null ? Number(cAvg.toFixed(2)) : 0
      };
    }).filter(Boolean) as { subject: string; fullSubjectName: string; 'Schüler': number; 'Klassen-Ø': number }[];

    let totalGradeSumOverall = 0;
    let activeGradesCountOverall = 0;
    FAECHER_ALLE.forEach(fach => {
      const grade = berechne(app, sid, fach, '1');
      if (grade && grade > 0) {
        totalGradeSumOverall += grade;
        activeGradesCountOverall++;
      }
    });
    const overallAvg = activeGradesCountOverall > 0 ? totalGradeSumOverall / activeGradesCountOverall : null;

    // Absences
    const studentAbs = getAbsenceStatsForStudent(sid);
    const absenceData = [
      { name: 'Entschuldigt', 'Schüler': studentAbs.excused, 'Klassen-Ø': classAvgAbsences.excused },
      { name: 'Unentschuldigt', 'Schüler': studentAbs.unexcused, 'Klassen-Ø': classAvgAbsences.unexcused },
      { name: 'Gesamt', 'Schüler': studentAbs.total, 'Klassen-Ø': classAvgAbsences.total }
    ];

    // Finances
    const samCollections = (app.klassenkasse?.sammlungen || []).map(s => {
      const statusValue = s.status?.[sid] || 'offen';
      const paidAmount = s.betraege?.[sid] || 0;
      const totalAmount = s.betrag;
      return {
        id: s.id,
        titel: s.titel,
        paidAmount,
        totalAmount,
        status: statusValue,
        datum: s.erstelltAm || ''
      };
    });
    
    let financeRequired = 0;
    let financePaid = 0;
    samCollections.forEach(c => {
      financeRequired += c.totalAmount;
      financePaid += c.paidAmount;
    });
    const isFinanceBalanced = financePaid >= financeRequired;

    // Portfolio
    const customPortfolio = portfolioEntries[sid] || [];
    const defaultPortfolio = [
      {
        id: `def-1-${sid}`,
        titel: 'Forschungstagebuch: Waldökologie',
        fach: 'Sachunterricht',
        datum: new Date().toISOString().split('T')[0],
        bewertung: 'Sehr Gut',
        beschreibung: 'Detaillierte Analyse lokaler Ökosysteme und eigenständiges Herbarium. Großer Fokus auf den Schutz einheimischer Bäume.'
      },
      {
        id: `def-2-${sid}`,
        titel: 'Portfolio-Mappe: Geometrisches Zeichnen',
        fach: 'Mathematik',
        datum: new Date().toISOString().split('T')[0],
        bewertung: 'Gut',
        beschreibung: 'Präzise Rekonstruktionen geometrischer Grundformen und kreative Symmetriebilder.'
      }
    ];
    const portfolioToDisplay = customPortfolio.length > 0 ? customPortfolio : defaultPortfolio;

    // Latest KEL Evaluation
    const latestMeeting = meetings.find(m => m.schuelerId === sid);

    // IKM Record Extraction
    const ikmRecord = (app.ikmRecords || []).find((r: any) => r.schuelerId === sid);
    let ikmLernpfad: any = null;
    if (ikmRecord && ikmRecord.kommentar) {
      try { ikmLernpfad = JSON.parse(ikmRecord.kommentar); } catch(e) {}
    }

    // Support Profile
    const profil = student.foerderprofil || {};
    const strengths = profil.staerken || ['Besonders hilfsbereit in Gruppenarbeiten', 'Starkes logisch-mathematisches Verständnis'];
    const supportAreas = profil.foerderbedarfBereiche || ['Arbeitsorganisation', 'Schriftlicher Ausdruck'];
    const supportGoals = profil.foerderziele || [];
    const supportMeasures = profil.massnahmen || [];

    // Behavioral Notes
    const studentNotes = (app.notizen || []).filter(n => n.schuelerId === sid);
    const filteredNotes = notesFilterCategory === 'all' 
      ? studentNotes 
      : studentNotes.filter(n => n.kategorie === notesFilterCategory);

    return (
      <div className="space-y-10 pb-24 text-left">
        {/* Header Block with actions */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 no-print">
          <div className="flex items-center gap-5">
            <button 
              onClick={() => setSelectedStudentId(null)}
              className="p-4 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-3xl transition-all cursor-pointer font-bold border border-slate-100"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2 text-[0.625rem] font-black uppercase tracking-[0.25em] text-indigo-600 mb-1">
                <SmilePlus size={16} />
                <span>Interaktives Eltern-Dossier</span>
              </div>
              <h1 className="text-[1.875rem] leading-tight font-black text-slate-900 tracking-tight">{student.vorname} {student.nachname}</h1>
              <p className="text-[0.875rem] leading-snug font-bold text-slate-400 mt-1">Überblick für das KEL-Gespräch am {new Date().toLocaleDateString('de-DE')}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            
            <button 
              onClick={() => setSelectedStudentId(null)}
              className="px-6 py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-[1.25rem] text-[0.6875rem] font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer"
            >
              <Users size={15} />
              Andere Schüler:innen
            </button>
          </div>
        </header>

        {/* PRINT BANNER (only shown when printing) */}
        <div className="hidden print:block border-b-4 border-slate-900 pb-6 mb-10">
          <h2 className="text-[1.875rem] leading-tight font-black uppercase tracking-tighter">KEL-Gespräch Komplett-Dossier</h2>
          <p className="text-[0.875rem] leading-snug font-bold text-slate-500 uppercase tracking-widest mt-1">Schulstufe: {app.stufe ? `${app.stufe}. Klasse` : 'Volksschule'} • Schuljahr: {app.schuljahr || '2023/24'}</p>
          <div className="mt-6 p-6 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 gap-4">
             <div>
                <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest block">Schüler/in:</span>
                <span className="text-[1.125rem] leading-normal font-black text-slate-900 uppercase">{student.nachname} {student.vorname}</span>
             </div>
             <div>
                <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest block">Datum des Berichts:</span>
                <span className="text-[1.125rem] leading-normal font-black text-slate-900">{new Date().toLocaleDateString('de-AT')}</span>
             </div>
          </div>
        </div>

        {/* 1. VISUAL KEY INDICATORS PANELS RANGE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 shrink-0">
               <GraduationCap size={20} />
            </div>
            <div>
              <span className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-450 block">Grade GPA-Ø</span>
              <span className="text-[1.25rem] leading-normal font-black text-slate-800">{overallAvg ? overallAvg.toFixed(2) : '–'}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center border border-rose-100 shrink-0">
               <Clock size={20} />
            </div>
            <div>
              <span className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-450 block">Fehlstunden</span>
              <span className="text-[1.25rem] leading-normal font-black text-slate-800">{studentAbs.total} Stunden</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${isFinanceBalanced ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
               <Wallet size={20} />
            </div>
            <div>
              <span className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-450 block">Klassenkassa</span>
              <span className="text-[1.25rem] leading-normal font-black text-slate-800">{financePaid} € / {financeRequired} €</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center border border-sky-100 shrink-0">
               <BookOpen size={20} />
            </div>
            <div>
              <span className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-450 block">Portfolio-Einträge</span>
              <span className="text-[1.25rem] leading-normal font-black text-slate-800">{portfolioToDisplay.length} Arbeiten</span>
            </div>
          </div>
        </div>

        {/* 2. GRADE COMPARISONS DIAGRAM WIDGET (FULL WIDTH) */}
        <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm col-span-full">
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6 mb-8">
              <div>
                 <h2 className="text-[1.125rem] leading-normal font-black text-slate-900 flex items-center gap-2 tracking-tight">
                    <TrendingUp size={20} className="text-indigo-650" />
                    Noten-Schnitt & Leistungsvergleich
                 </h2>
                 <p className="text-slate-400 text-[0.75rem] leading-tight font-bold uppercase tracking-wider mt-0.5">Detaillierter Leistungsstand im Klassenvergleich (GPA Noten 1-5)</p>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 no-print">
                 {[
                   { id: 'column', label: 'Säulen' },
                   { id: 'bar', label: 'Balken' },
                   { id: 'line', label: 'Linien' }
                 ].map(opt => (
                   <button 
                     key={opt.id}
                     onClick={() => setAnalyseChartType(opt.id as any)}
                     className={`px-3 py-1.5 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider transition-all cursor-pointer ${analyseChartType === opt.id ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-950'}`}
                   >
                     {opt.label}
                   </button>
                 ))}
              </div>
           </div>

           {gradeData.length === 0 ? (
             <div className="p-8 border border-dashed border-slate-200 rounded-3xl text-center text-slate-400 italic text-[0.75rem] leading-tight">
                Keine ausreichenden Notendaten erfasst, um ein Vergleichendes Diagramm darzustellen.
             </div>
           ) : (
             <div className="w-full">
               <div className="h-[340px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     {analyseChartType === 'column' ? (
                        <BarChart data={gradeData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                           <XAxis dataKey="subject" tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
                           <YAxis domain={[1, 5]} reversed tickLine={false} tickCount={5} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                           <RechartsTooltip 
                             cursor={{ fill: '#f8fafc' }}
                             contentStyle={{ borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '12px' }}
                             itemStyle={{ fontWeight: 850, fontSize: '11px' }}
                             labelStyle={{ fontWeight: 900, marginBottom: '2px', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}
                           />
                           <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                           <Bar name="Schüler GPA" dataKey="Schüler" fill="#4f46e5" radius={[5, 5, 0, 0]} barSize={22} />
                           <Bar name="Klassen-Durchschnitt" dataKey="Klassen-Ø" fill="#94a3b8" radius={[5, 5, 0, 0]} barSize={22} />
                        </BarChart>
                     ) : analyseChartType === 'bar' ? (
                        <BarChart data={gradeData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                           <XAxis type="number" domain={[1, 5]} reversed tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} />
                           <YAxis dataKey="subject" type="category" tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
                           <RechartsTooltip 
                             contentStyle={{ borderRadius: '16px', border: '1px solid #f1f5f9' }}
                           />
                           <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                           <Bar name="Schüler GPA" dataKey="Schüler" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={12} />
                           <Bar name="Klassen-Durchschnitt" dataKey="Klassen-Ø" fill="#94a3b8" radius={[0, 4, 4, 0]} barSize={12} />
                        </BarChart>
                     ) : (
                        <LineChart data={gradeData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                           <XAxis dataKey="subject" tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
                           <YAxis domain={[1, 5]} reversed tickLine={false} tickCount={5} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                           <RechartsTooltip contentStyle={{ borderRadius: '16px', border: '1px solid #f1f5f9' }} />
                           <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                           <Line name="Schüler GPA" type="monotone" dataKey="Schüler" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 8 }} />
                           <Line name="Klassen-Durchschnitt" type="monotone" dataKey="Klassen-Ø" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" />
                        </LineChart>
                     )}
                  </ResponsiveContainer>
               </div>
               <div className="mt-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[0.625rem] font-bold text-slate-500 text-center uppercase tracking-wider leading-relaxed">
                  Hinweis in Österreichs Notensystem: Niedrigere Werte sind vorteilhafter (1.00 = Sehr gut, 5.00 = Genügend). Ein höherer Balken auf der umgekehrten Skala reflektiert eine bessere Leistung.
               </div>
             </div>
           )}
        </div>

        {/* 3. ABSENCES COMPARATIVE CHART WIDGET (FULL WIDTH) */}
        <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm col-span-full">
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-4 space-y-4">
                 <div>
                    <h2 className="text-[1.125rem] leading-normal font-black text-slate-900 flex items-center gap-2 tracking-tight">
                       <Clock size={20} className="text-rose-500" />
                       Fehlzeiten & Anwesenheit
                    </h2>
                    <p className="text-slate-450 text-[0.75rem] leading-tight font-bold uppercase tracking-wider mt-0.5">Versäumte Schulstunden im Vergleich zum Klassendurschnitt</p>
                 </div>
                 <div className="p-5 bg-rose-50/20 border border-rose-100/50 rounded-3xl space-y-3">
                    <div className="flex justify-between items-center text-[0.75rem] leading-tight">
                       <span className="font-bold text-slate-500 uppercase tracking-widest text-[0.5625rem]">Entschuldigt:</span>
                       <span className="font-black text-slate-800">{studentAbs.excused} Stunden</span>
                    </div>
                    <div className="flex justify-between items-center text-[0.75rem] leading-tight">
                       <span className="font-bold text-slate-500 uppercase tracking-widest text-[0.5625rem]">Unentschuldigt:</span>
                       <span className="font-black text-slate-800 text-rose-600">{studentAbs.unexcused} Stunden</span>
                    </div>
                    <div className="h-[1px] bg-slate-200"></div>
                    <div className="flex justify-between items-center text-[0.75rem] leading-tight">
                       <span className="font-bold text-slate-600 uppercase tracking-widest text-[0.5625rem]">Akkumuliert:</span>
                       <span className="font-black text-slate-900">{studentAbs.total} Stunden</span>
                    </div>
                 </div>
              </div>
              <div className="lg:col-span-8">
                 <div className="h-[250px] w-full bg-slate-50/30 p-4 border border-slate-100 rounded-3xl">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={absenceData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <XAxis dataKey="name" tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                          <YAxis tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <RechartsTooltip cursor={{ fill: '#edf2f7', opacity: 0.4 }} />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                          <Bar name="Schüler/in" dataKey="Schüler" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={25} />
                          <Bar name="Class-Ø Schnitt" dataKey="Klassen-Ø" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={25} />
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
              </div>
           </div>
        </div>

        {/* 4. FINANCES WIDGET (FULL WIDTH) */}
        <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm col-span-full">
           <div className="flex justify-between items-start border-b border-slate-100 pb-6 mb-8 gap-4 flex-wrap">
              <div>
                 <h2 className="text-[1.125rem] leading-normal font-black text-slate-900 flex items-center gap-2 tracking-tight">
                    <Wallet size={20} className="text-emerald-550" />
                    Finanzen & Elternbeiträge
                 </h2>
                 <p className="text-slate-450 text-[0.75rem] leading-tight font-bold uppercase tracking-wider mt-0.5">Übersicht der eingezahlten Beiträge für Schulmaterial und Veranstaltungen</p>
              </div>
              <div className="shrink-0">
                 {isFinanceBalanced ? (
                   <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-[0.625rem] font-black uppercase tracking-widest shadow-xs">
                     <CheckCircle2 size={14} />
                     Ausgeglichen
                   </span>
                 ) : (
                   <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-[0.625rem] font-black uppercase tracking-widest shadow-xs">
                     <AlertCircle size={14} />
                     Rückstand
                   </span>
                 )}
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-8">
              <div className="lg:col-span-5">
                 <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100/80">
                     <span className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest block mb-2">Gesamteinzahlung Schüler</span>
                     <div className="font-black text-[1.875rem] leading-tight text-slate-800">{financePaid} € <span className="text-[0.875rem] leading-snug font-medium text-slate-400">von {financeRequired} €</span></div>
                     
                     <div className="w-full bg-slate-250 h-3 rounded-full mt-4  shadow-inner">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 shadow-sm ${isFinanceBalanced ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                          style={{ width: `${financeRequired > 0 ? (financePaid / financeRequired) * 100 : 100}%` }}
                        />
                     </div>
                 </div>
              </div>
              <div className="lg:col-span-7">
                 <h3 className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest mb-4">Einzelne Beiträge & Sammlungen:</h3>
                 <div className="space-y-3">
                    {samCollections.length === 0 ? (
                      <p className="text-[0.75rem] leading-tight text-slate-400 italic p-4 border border-dashed border-slate-200 rounded-xl">Keine Finanzsammlungen erfasst.</p>
                    ) : (
                      samCollections.map(sam => (
                        <div key={sam.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors">
                           <div className="flex items-center gap-3">
                              <div className={`w-2.5 h-2.5 rounded-full ${sam.status === 'bezahlt' ? 'bg-emerald-500' : 'bg-rose-550'}`} />
                              <div>
                                 <h4 className="text-[0.75rem] leading-tight font-black text-slate-800">{sam.titel}</h4>
                                 <span className="text-[0.5rem] font-black text-slate-400 uppercase tracking-wider">{sam.datum ? new Date(sam.datum).toLocaleDateString() : ''} • Soll: {sam.totalAmount} €</span>
                              </div>
                           </div>
                           <div className="flex items-center gap-3">
                             <span className="text-[0.75rem] leading-tight font-black text-slate-700">{sam.paidAmount} €</span>
                             <span className={`text-[0.5rem] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${sam.status === 'bezahlt' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-550 border-rose-100'}`}>
                                {sam.status === 'bezahlt' ? 'Bezahlt' : 'Offen'}
                             </span>
                           </div>
                        </div>
                      ))
                    )}
                 </div>
              </div>
           </div>
        </div>

        {/* 4.5 IKM PLUS & SCHATZKARTE WIDGET */}
        {ikmLernpfad && (ikmLernpfad.stationen || ikmLernpfad.elternTipps) && (
          <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-indigo-100/50 shadow-sm col-span-full relative  mb-10">
             <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 blur-3xl rounded-full opacity-50 -mr-20 -mt-20 pointer-events-none"></div>
             
             <div className="relative border-b border-indigo-100 pb-6 mb-8 flex justify-between items-start flex-wrap gap-4">
                <div>
                  <h2 className="text-[1.125rem] leading-normal font-black text-indigo-900 flex items-center gap-2 tracking-tight">
                     <Map size={20} className="text-indigo-500" />
                     IKM Plus & Individueller Schatzkartenpfad
                  </h2>
                  <p className="text-indigo-400 text-[0.75rem] leading-tight font-bold uppercase tracking-wider mt-0.5">Diagnose & Spielerischer Eltern-Ratgeber zur Förderung</p>
                </div>
                <div className="shrink-0 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-[0.625rem] font-black uppercase tracking-widest border border-indigo-100/50">
                  <Star size={14} className="inline-block mr-1.5" /> Diagnose basierte Förderung
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
               {ikmLernpfad.stationen && ikmLernpfad.stationen.length > 0 && (
                 <div className="space-y-4">
                   <h3 className="text-[0.875rem] leading-snug font-black text-indigo-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                     <Compass size={16} className="text-indigo-500" /> Stationen & Aufgaben
                   </h3>
                   <div className="space-y-3">
                     {ikmLernpfad.stationen.map((st: any, i: number) => (
                       <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white border border-indigo-50 shadow-sm shadow-indigo-900/5">
                         <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[0.75rem] leading-tight font-black text-white shrink-0 shadow-xs ${i === 0 ? 'bg-indigo-500' : (i === 1 ? 'bg-pink-500' : 'bg-amber-500')}`}>
                           {i + 1}
                         </div>
                         <div>
                           <p className="text-[0.875rem] leading-snug font-black text-slate-800 tracking-tight leading-tight mb-1">{st.titel}</p>
                           <p className="text-[0.6875rem] font-medium text-slate-500 leading-relaxed">{st.aufgabe}</p>
                           <p className="text-[0.5625rem] font-black uppercase text-indigo-500 mt-2 tracking-wider flex items-center gap-1"><Target size={10} /> Ziel: {st.ziel}</p>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               {ikmLernpfad.elternTipps && ikmLernpfad.elternTipps.length > 0 && (
                 <div className="space-y-4">
                   <h3 className="text-[0.875rem] leading-snug font-black text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                     <Award size={16} className="text-amber-500" /> Spielerischer Eltern-Ratgeber
                   </h3>
                   <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100/50">
                     <p className="text-[0.6875rem] font-bold text-slate-600 leading-relaxed mb-5">
                       Mit diesen analogen Alltags-Abenteuern können Sie {student.vorname} zu Hause spielerisch unterstützen:
                     </p>
                     <div className="space-y-4">
                       {ikmLernpfad.elternTipps.map((tipp: string, i: number) => (
                         <div key={i} className="flex gap-3 items-start bg-white p-4 rounded-2xl shadow-xs border border-amber-100">
                           <span className="text-[1.125rem] leading-normal shrink-0 select-none">💡</span>
                           <p className="text-[0.75rem] leading-tight font-bold text-amber-950 font-sans leading-relaxed pt-0.5">{tipp}</p>
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>
               )}
             </div>
          </div>
        )}

        {/* 5. PORTFOLIO ENTRIES WITH TEXT OUT-COLLAPSIBLE (FULL WIDTH) */}
        <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm col-span-full">
           <div className="border-b border-slate-100 pb-6 mb-8">
              <h2 className="text-[1.125rem] leading-normal font-black text-slate-900 flex items-center gap-2 tracking-tight">
                 <BookOpen size={20} className="text-indigo-650" />
                 Portfolio-Ausstellung & Arbeiten
              </h2>
              <p className="text-slate-450 text-[0.75rem] leading-tight font-bold uppercase tracking-wider mt-0.5">Übersicht aller erfassten Leistungen und Arbeiten der Kinder. Klicken Sie auf ein Element, um die vollständige Beschreibung auszuklappen.</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {portfolioToDisplay.map(p => {
                 const isExpanded = expandedItems[p.id];
                 return (
                   <div 
                     key={p.id}
                     onClick={() => toggleExpand(p.id)}
                     className="bg-slate-50 border border-slate-150 hover:border-indigo-300 rounded-[2rem] p-6 transition-all hover:bg-slate-100/50 cursor-pointer flex flex-col justify-between"
                   >
                     <div>
                        <div className="flex justify-between items-start gap-3">
                           <span className="inline-flex px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-[0.5rem] font-black text-indigo-700 uppercase">{p.fach}</span>
                           <span className="text-[0.5rem] font-black text-slate-400 uppercase tracking-widest">{p.datum ? new Date(p.datum).toLocaleDateString() : ''}</span>
                        </div>
                        <h3 className="text-[1rem] leading-normal font-black text-slate-800 mt-2 hover:text-indigo-650 transition-colors">{p.titel}</h3>
                        
                        <div className="flex items-center gap-1.5 mt-2">
                           <span className="inline-flex px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-[0.5rem] font-black text-emerald-700 uppercase">Note: {p.bewertung}</span>
                        </div>

                        {/* Expandable description element */}
                        <div className={`mt-3 text-[0.75rem] leading-tight leading-relaxed text-slate-650 transition-all ${isExpanded ? 'max-h-[500px] opacity-100 whitespace-pre-wrap mt-4 p-4 bg-white rounded-2xl border border-slate-150 shadow-inner' : 'max-h-12 opacity-80  line-clamp-2 italic'}`}>
                           {p.beschreibung}
                        </div>
                     </div>

                     <div className="flex items-center justify-between text-[0.5rem] font-black uppercase text-slate-400 tracking-wider mt-4 pt-4 border-t border-slate-200/50">
                        <span>{isExpanded ? 'Klicken zum Schließen' : 'Klicken für Beschreibung'}</span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                     </div>
                   </div>
                 );
              })}
           </div>
        </div>

        {/* 6. KEL EVALUATIONS & EXPLANATIONS ACCORDION (FULL WIDTH) */}
        <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm col-span-full">
           <div className="border-b border-slate-100 pb-6 mb-8">
              <h2 className="text-[1.125rem] leading-normal font-black text-slate-900 flex items-center gap-2 tracking-tight">
                 <SmilePlus size={20} className="text-rose-500" />
                 Einschätzungen & Erläuterungen (KEL)
              </h2>
              <p className="text-slate-450 text-[0.75rem] leading-tight font-bold uppercase tracking-wider mt-0.5">Direkter Abgleich der Selbsteinschätzung des Kindes mit der Beurteilung der Lehrperson. Nutzen Sie die Pillenbereiche zur Detailsteuerung.</p>
            </div>

            {/* COMPACT PILL FILTERS FOR THE FLOWER DIAGRAM */}
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-150 space-y-3 mb-6 font-sans">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[0.625rem] font-black uppercase text-slate-400 tracking-wide pb-1 border-b border-slate-200/50">
                <div className="flex items-center gap-2">
                  <span>Bereiche filtern (Blume / Liste)</span>
                  <span className="text-slate-350">•</span>
                  <span className="text-indigo-600 font-bold">{kelCategoriesToShow.length} von 4 aktiv</span>
                </div>
                {/* Logical Width / Layout adjustment buttons */}
                <div className="flex items-center bg-white/85 border border-slate-200 rounded-xl p-1 shrink-0 shadow-3xs">
                  <button
                    type="button"
                    onClick={() => setIsFullWidthChart(false)}
                    className={`px-3 py-1 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${!isFullWidthChart ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-850'}`}
                  >
                    <span>📋</span>
                    <span>Kompakt (Nebeneinander)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFullWidthChart(true)}
                    className={`px-3 py-1 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${isFullWidthChart ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-850'}`}
                  >
                    <span>🖥️</span>
                    <span>Anpassen / Volle Breite</span>
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {['lernen', 'arbeitsverhalten', 'sozialverhalten', 'interessen'].map(kat => {
                  const isActive = kelCategoriesToShow.includes(kat);
                  const symbol = kat === 'lernen' ? '📚' : kat === 'arbeitsverhalten' ? '⚙️' : kat === 'sozialverhalten' ? '🤝' : '💡';
                  const label = kat === 'lernen' ? 'Lernen' : kat === 'arbeitsverhalten' ? 'Arbeitsverhalten' : kat === 'sozialverhalten' ? 'Sozialverhalten' : 'Interessen';
                  return (
                    <button
                      key={kat}
                      type="button"
                      onClick={() => {
                        if (isActive) {
                          setKelCategoriesToShow(prev => prev.filter(c => c !== kat));
                        } else {
                          setKelCategoriesToShow(prev => [...prev, kat]);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl text-[0.625rem] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border cursor-pointer select-none bg-white text-slate-550 border-slate-200 hover:bg-slate-50"
                      style={{
                        backgroundColor: isActive ? '#0f172a' : '#ffffff',
                        color: isActive ? '#ffffff' : '#64748b',
                        borderColor: isActive ? 'transparent' : '#ebd2f0'
                      }}
                    >
                      <span>{symbol}</span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* INTEGRATED FLOWER CHART & DIALOG INFO KEY SIDE-BY-SIDE OR FULL WIDTH */}
            <div className={`grid grid-cols-1 ${isFullWidthChart ? 'lg:grid-cols-1' : 'lg:grid-cols-12'} gap-8 items-center bg-slate-50/70 p-6 sm:p-8 rounded-[2.5rem] border border-slate-150/80 mb-8 font-sans transition-all duration-300`}>
              {/* Left/Main Column: Bloom Chart */}
              <div className={`${isFullWidthChart ? 'w-full max-w-4xl mx-auto' : 'lg:col-span-6'} flex flex-col justify-center items-center transition-all duration-300`}>
                <FlowerChart 
                  studentId={student.id} 
                  app={app} 
                  selectedKats={kelCategoriesToShow} 
                />
              </div>

              {/* Right/Bottom Column: Legible Legend Info Key */}
              <div className={`${isFullWidthChart ? 'w-full border-t border-slate-200/60 pt-6' : 'lg:col-span-6'} space-y-4 transition-all duration-300`}>
                <div className="border-l-4 border-indigo-500 pl-3">
                  <h4 className="text-[0.875rem] leading-snug font-black text-slate-800 tracking-tight uppercase">Kompetenz-Skala & Erklärung</h4>
                  <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">Beschreibung des KEL-Entwicklungsstands (0-5)</p>
                </div>
                
                <div className={isFullWidthChart 
                  ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3"
                  : "space-y-2 max-h-[300px] overflow-y-auto pr-1"
                }>
                  {KEL_GRADES_INFO.map((g) => (
                    <div key={g.item} className="flex gap-3 p-3 bg-white rounded-2xl border border-slate-150/60 shadow-3xs hover:border-slate-300 transition-colors">
                      <span className="text-[1.5rem] leading-normal shrink-0">{g.icon}</span>
                      <div>
                        <span className="text-[0.75rem] leading-tight font-black text-slate-800 flex items-center gap-2">
                          Stufe {g.item}: <span className="text-[0.5625rem] px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold uppercase">{g.text.split(' / ')[0]}</span>
                        </span>
                        <p className="text-[0.75rem] leading-tight leading-relaxed text-slate-500 font-bold mt-1 font-sans">{g.text.split(' / ')[1] || g.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {['lernen', 'arbeitsverhalten', 'sozialverhalten', 'interessen'].map(kat => {
                 const fields = STANDARD_KEL_BEREICHE.filter(b => b.kategorie === kat);
                 return (
                   <div key={kat} className="space-y-4">
                      <h3 className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400 border-l-4 border-rose-400 pl-3">{KATEGORIE_LABELS[kat as keyof typeof KATEGORIE_LABELS]}</h3>
                      <div className="grid grid-cols-1 gap-4">
                         {fields.map(field => {
                            const kindRatingValue = normalizeRating(latestMeeting?.selbsteinschaetzungKind?.[field.id]?.wert, latestMeeting);
                            const lehrRatingValue = normalizeRating(latestMeeting?.einschaetzungLehrperson?.[field.id]?.wert, latestMeeting);
                            const commentValue = latestMeeting?.einschaetzungLehrperson?.[field.id]?.kommentar || '';
                            const kindSmileyObj = SMILEYS.find(s => s.wert === kindRatingValue) || SMILEYS[2];
                            const lehrSmileyObj = SMILEYS.find(s => s.wert === lehrRatingValue) || SMILEYS[2];

                            const isExpandedField = expandedItems[field.id];

                            return (
                              <div 
                                key={field.id}
                                onClick={() => toggleExpand(field.id)}
                                className="bg-slate-50 border border-slate-150 hover:border-slate-250 rounded-2xl p-5 cursor-pointer hover:bg-slate-100/30 transition-all"
                              >
                                 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                    <div>
                                       <span className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-400">{field.kategorie.toUpperCase()}</span>
                                       <h4 className="text-[0.75rem] leading-tight font-black text-slate-800 leading-snug">{field.label}</h4>
                                    </div>
                                    <div className="flex gap-4 items-center self-start sm:self-auto uppercase tracking-widest text-[0.5rem] font-black">
                                       <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl">
                                          <span>Kind:</span>
                                          <span className="text-[0.875rem] leading-snug">{kindSmileyObj.icon}</span>
                                          <span className="hidden sm:inline text-[0.5rem]">{kindSmileyObj.label}</span>
                                       </div>
                                       <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl">
                                          <span>Lehr:</span>
                                          <span className="text-[0.875rem] leading-snug">{lehrSmileyObj.icon}</span>
                                          <span className="hidden sm:inline text-[0.5rem]">{lehrSmileyObj.label}</span>
                                       </div>
                                    </div>
                                 </div>

                                 {/* Explanations text expand-accordion */}
                                 <div className={`transition-all ${isExpandedField ? 'max-h-[300px] opacity-100 mt-4 p-4 bg-white rounded-xl border border-slate-150' : 'max-h-0 opacity-0 '}`}>
                                    <h5 className="text-[0.5rem] font-black uppercase tracking-wider text-slate-400 mb-1">Erläuterung & Pädagogisches Feedback:</h5>
                                    <p className="text-[0.75rem] leading-tight leading-relaxed text-slate-700 font-bold">
                                       {commentValue || `Keine spezifische Erläuterung für den Bereich "${field.label}" eingegeben.`}
                                    </p>
                                 </div>

                                 <div className="flex justify-end mt-2 text-[0.5rem] font-black text-slate-400 uppercase tracking-widest">
                                    <span className="flex items-center gap-1">
                                       {isExpandedField ? 'Zuklappen' : 'Erläuterung ausklappen'}
                                       {isExpandedField ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
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
        </div>

        {/* 7. STRENGTHS AND NATURAL RESOURCES (FULL WIDTH) */}
        <div className="bg-amber-500 text-white p-8 sm:p-10 rounded-[2.5rem] shadow-lg shadow-amber-500/10 col-span-full">
           <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white border border-white/20">
                 <ThumbsUp size={24} />
              </div>
              <div>
                 <h2 className="text-[1.125rem] leading-normal font-black tracking-tight uppercase">Stärken & Ressourcen (Ressourcenorientierung)</h2>
                 <p className="text-amber-100 text-[0.75rem] leading-tight font-bold uppercase tracking-wider">Erfasste Stärken, Interessen und soziale Fähigkeiten des Kindes</p>
              </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {strengths.map((str, idx) => (
                <div key={idx} className="p-5 bg-white/10 rounded-2xl border border-white/10 flex items-start gap-3">
                   <div className="text-[1.125rem] leading-normal mt-0.5">🌟</div>
                   <div>
                      <p className="text-[0.75rem] leading-tight font-bold leading-relaxed">{str}</p>
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* 8. ACTIVE SUPPORT AREAS, TARGET GOALS & MEASURES (FULL WIDTH) */}
        <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm col-span-full">
           <div className="border-b border-slate-100 pb-6 mb-8">
              <h2 className="text-[1.125rem] leading-normal font-black text-slate-900 flex items-center gap-2 tracking-tight">
                 <Compass className="text-indigo-650" />
                 Förderziele, Maßnahmen & Pläne (IFP)
              </h2>
              <p className="text-slate-450 text-[0.75rem] leading-tight font-bold uppercase tracking-wider mt-0.5">Individuelle Einzelförderungen für das Kind mit konkreten Lernzielen und pädagogischen Behelfen</p>
           </div>

           <div className="space-y-8">
              {/* Support Areas block */}
              <div>
                 <h3 className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest mb-3">Ausgewählte Förderbereiche</h3>
                 <div className="flex gap-2 flex-wrap">
                    {supportAreas.map((area, idx) => (
                      <span key={idx} className="px-4 py-2.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[0.5625rem] font-black uppercase tracking-wider rounded-xl">
                         {area}
                      </span>
                    ))}
                    {supportAreas.length === 0 && (
                      <p className="text-[0.75rem] leading-tight text-slate-400 italic">Noch keine definierten Förderbereiche festgelegt.</p>
                    )}
                 </div>
              </div>

              {/* Support Goals collapsible array */}
              <div>
                 <h3 className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest mb-4">Lern- & Förderziele</h3>
                 <div className="space-y-3">
                    {supportGoals.map((goal, idx) => {
                      const isExpandedGoal = expandedItems[`goal-${goal.id || idx}`];
                      return (
                        <div 
                          key={goal.id || idx}
                          onClick={() => toggleExpand(`goal-${goal.id || idx}`)}
                          className="p-5 bg-slate-50 border border-slate-150 rounded-2xl cursor-pointer hover:bg-slate-100/50 transition-colors"
                        >
                           <div className="flex justify-between items-center flex-wrap gap-2 text-[0.75rem] leading-tight">
                              <span className="font-black text-slate-800 leading-snug">{goal.ziel}</span>
                              <div className="flex items-center gap-2">
                                 {goal.status && (
                                   <span className={`text-[0.5rem] font-black px-2 py-0.5 rounded-md uppercase border ${goal.status === 'erreicht' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                      {goal.status}
                                   </span>
                                 )}
                                 {goal.zielDatum && (
                                   <span className="text-[0.5rem] font-black bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-md uppercase">
                                      Bis: {new Date(goal.zielDatum).toLocaleDateString()}
                                   </span>
                                 )}
                              </div>
                           </div>
                           
                           <div className={` transition-all text-[0.75rem] leading-tight leading-relaxed text-slate-650 ${isExpandedGoal ? 'max-h-[150px] opacity-100 mt-3 p-3 bg-white rounded-xl border border-slate-200' : 'max-h-0 opacity-0'}`}>
                              Bereich: {goal.bereich} • Startdatum: {goal.startDatum ? new Date(goal.startDatum).toLocaleDateString() : ''} • Notiz: {goal.notiz || '–'}
                           </div>

                           <div className="flex justify-end text-[0.5rem] text-slate-400 font-black uppercase tracking-widest mt-2">
                             <span>{isExpandedGoal ? 'Zuklappen' : 'Details ausklappen'}</span>
                           </div>
                        </div>
                      );
                    })}
                    {supportGoals.length === 0 && (
                      <p className="text-[0.75rem] leading-tight text-slate-400 italic p-4 border border-dashed border-slate-200 rounded-2xl">Keine expliziten Förderziele erfasst.</p>
                    )}
                 </div>
              </div>

              {/* Support Measures collapsible array */}
              <div>
                 <h3 className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest mb-4">Eingeleitete Maßnahmen</h3>
                 <div className="space-y-3">
                    {supportMeasures.map((measure, idx) => {
                      const isExpandedMeasure = expandedItems[`measure-${measure.id || idx}`];
                      return (
                        <div 
                          key={measure.id || idx}
                          onClick={() => toggleExpand(`measure-${measure.id || idx}`)}
                          className="p-5 bg-slate-50 border border-slate-150 rounded-2xl cursor-pointer hover:bg-slate-100/50 transition-colors"
                        >
                           <div className="flex justify-between items-center flex-wrap gap-2 text-[0.75rem] leading-tight">
                              <span className="font-black text-slate-800 leading-snug text-wrap leading-tight break-words max-w-lg">{measure.beschreibung}</span>
                              <div className="flex items-center gap-2">
                                 {measure.wirksamkeit && (
                                   <span className={`text-[0.5rem] font-black px-2 py-0.5 rounded-md uppercase border ${measure.wirksamkeit === 'hoch' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-250 text-slate-600'}`}>
                                      Wirksamkeit: {measure.wirksamkeit}
                                   </span>
                                 )}
                                 {measure.datum && (
                                   <span className="text-[0.5rem] font-black bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md uppercase">
                                      Am: {new Date(measure.datum).toLocaleDateString()}
                                   </span>
                                 )}
                              </div>
                           </div>

                           <div className={` transition-all text-[0.75rem] leading-tight leading-relaxed text-slate-650 ${isExpandedMeasure ? 'max-h-[150px] opacity-100 mt-3 p-3 bg-white rounded-xl border border-slate-200' : 'max-h-0 opacity-0'}`}>
                              Maßnahme: {measure.beschreibung} • Evaluierungsbereich: {measure.wirksamkeit}
                           </div>

                           <div className="flex justify-end text-[0.5rem] text-slate-400 font-black uppercase tracking-widest mt-2">
                             <span>{isExpandedMeasure ? 'Zuklappen' : 'Details ausklappen'}</span>
                           </div>
                        </div>
                      );
                    })}
                    {supportMeasures.length === 0 && (
                      <p className="text-[0.75rem] leading-tight text-slate-400 italic p-4 border border-dashed border-slate-200 rounded-2xl">Keine spezifischen Maßnahmen eingetragen.</p>
                    )}
                 </div>
              </div>
           </div>
        </div>

        {/* 9. BEHAVIORAL OBSERVATION JOURNAL NOTES CARD LIST (FULL WIDTH) */}
        <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm col-span-full">
           <div className="flex justify-between items-start border-b border-slate-100 pb-6 mb-8 gap-4 flex-wrap">
              <div>
                 <h2 className="text-[1.125rem] leading-normal font-black text-slate-900 flex items-center gap-2 tracking-tight">
                    <History size={20} className="text-slate-500" />
                    Beobachtungsjournal & Verhaltensnotizen
                 </h2>
                 <p className="text-slate-450 text-[0.75rem] leading-tight font-bold uppercase tracking-wider mt-0.5">Fortlaufende Notizen zum Arbeits- und Sozialverhalten des Kindes</p>
              </div>
              
              {/* Category selector */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 no-print">
                 {[
                   { id: 'all', label: 'Alle' },
                   { id: 'Verhalten', label: 'Verhalten' },
                   { id: 'Arbeitsverhalten', label: 'Arbeit' },
                   { id: 'Sozialverhalten', label: 'Sozial' },
                   { id: 'Mitarbeit', label: 'Mitarbeit' }
                 ].map(cat => (
                   <button 
                     key={cat.id}
                     onClick={() => setNotesFilterCategory(cat.id)}
                     className={`px-3 py-1 text-[0.5625rem] font-black uppercase tracking-wider transition-all cursor-pointer ${notesFilterCategory === cat.id ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-950'}`}
                   >
                     {cat.label}
                   </button>
                 ))}
              </div>
           </div>

           <div className="space-y-4">
              {filteredNotes.length === 0 ? (
                <p className="text-[0.75rem] leading-tight text-slate-400 italic p-6 border border-dashed border-slate-200 rounded-2xl text-center">Keine passenden Verhaltensnotizen oder Beobachtungen erfasst.</p>
              ) : (
                filteredNotes.map(note => {
                  const isExpandedNote = expandedItems[`note-${note.id}`];
                  return (
                    <div 
                      key={note.id}
                      onClick={() => toggleExpand(`note-${note.id}`)}
                      className="p-5 bg-slate-50 border border-slate-150 rounded-2xl cursor-pointer hover:bg-slate-100/40 transition-all text-left"
                    >
                       <div className="flex justify-between items-center text-[0.5625rem] font-black uppercase tracking-wider text-slate-400 mb-2">
                          <span>{new Date(note.timestamp || '').toLocaleDateString('de-DE')}</span>
                          <span className="px-2 py-0.5 bg-white border border-slate-150 rounded-md text-slate-600">{note.kategorie || 'Allgemein'}</span>
                       </div>
                       
                       <h4 className="text-[0.75rem] leading-tight font-black text-slate-850 text-wrap leading-tight break-words">{note.titel || 'Beobachtungseintrag'}</h4>
                       
                       <div className={`mt-2 text-[0.75rem] leading-tight text-slate-650 transition-all ${isExpandedNote ? 'max-h-[300px] opacity-100 pt-2 whitespace-pre-wrap border-t border-slate-200 mt-3' : 'max-h-12 opacity-80  line-clamp-2 italic'}`}>
                          {note.inhalt}
                       </div>

                       <div className="flex justify-end text-[0.5rem] font-black uppercase tracking-widest text-slate-400 mt-2">
                          <span>{isExpandedNote ? 'Zuklappen' : 'Notiz ausklappen'}</span>
                       </div>
                    </div>
                  );
                })
              )}
           </div>
        </div>
      </div>
    );
  };

  if (viewingMeeting) {
    const student = app.schueler.find(s => s.id === viewingMeeting.schuelerId);
    if (!student) return null;

    const studentObservations = (app.journal || []).filter(o => o.schuelerId === student.id);

    if (isPrintMode) {
      return (
        <PrintView 
          meeting={viewingMeeting} 
          student={student} 
          type={isPrintMode} 
          onClose={() => setIsPrintMode(null)} 
        />
      );
    }

    return (
      <div className="space-y-8 pb-20">
        <header className="flex items-center justify-between bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setViewingMeeting(null)}
              className="p-4 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-3xl transition-all"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <div className="flex items-center gap-3 text-[0.6875rem] font-black uppercase tracking-[0.2em] text-rose-500 mb-1">
                <MessagesSquare size={14} />
                <span>KEL-Gespräch Protokoll</span>
              </div>
              <h1 className="text-[1.875rem] leading-tight font-black text-slate-900">{student.vorname} {student.nachname}</h1>
              <p className="text-[0.875rem] leading-snug font-medium text-slate-400 mt-1">{new Date(viewingMeeting.datum).toLocaleDateString()} • {viewingMeeting.schuljahr}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button 
              onClick={() => {
                setApp(prev => ({
                  ...prev,
                  activePrintTemplate: 'kel_presentation',
                  activePrintStudentId: student.id
                }));
                setPage?.('drucken');
              }}
              className="px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-2xl text-[0.6875rem] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <Printer size={16} />
              Selbsteinschätzung
            </button>
            <button 
              onClick={() => {
                setApp(prev => ({
                  ...prev,
                  activePrintTemplate: 'kel',
                  activePrintStudentId: student.id
                }));
                setPage?.('drucken');
              }}
              className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[0.6875rem] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 flex items-center gap-2"
            >
              <Printer size={16} />
              Protokoll drucken
            </button>
          </div>
        </header>

        <ComparisonView meeting={viewingMeeting} />

        {/* Observation Journal Summary - NEW CONTEXTUAL SECTION */}
        {studentObservations.length > 0 && (
          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm relative  no-print">
            <div className="flex items-center gap-4 mb-8 relative z-10">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-100">
                <History size={24} />
              </div>
              <div>
                <h4 className="text-[0.75rem] font-black uppercase tracking-[0.3em] text-slate-900 mb-1">Beobachtungs-Journal</h4>
                <p className="text-slate-400 text-[0.6875rem] font-bold uppercase tracking-widest leading-none">Letzte Einträge vor dem Gespräch</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
              {studentObservations.slice(0, 3).map(obs => (
                <div key={obs.id} className="bg-slate-50 border border-slate-200 rounded-3xl p-6 hover:bg-slate-100 transition-all">
                   <div className="flex items-center justify-between mb-3 text-[0.625rem] font-black uppercase tracking-widest text-slate-400">
                      <span>{new Date(obs.datum).toLocaleDateString('de-AT')}</span>
                      <span className="bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-lg">{obs.kategorie}</span>
                   </div>
                   <p className="text-[0.8125rem] text-slate-700 leading-relaxed font-bold line-clamp-3">
                     "{obs.inhalt}"
                   </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio Highlights Summary */}
        {(student.portfolio || []).filter(p => p.isInKEL).length > 0 && (
          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm relative  no-print">
            <div className="flex items-center gap-4 mb-8 relative z-10">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 border border-indigo-100">
                <Star size={24} />
              </div>
              <div>
                <h4 className="text-[0.75rem] font-black uppercase tracking-[0.3em] text-slate-900 mb-1">Portfolio Highlights</h4>
                <p className="text-slate-400 text-[0.6875rem] font-bold uppercase tracking-widest leading-none">Gesammelte Werke für das KEL-Gespräch</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
              {(student.portfolio || []).filter(p => p.isInKEL).map(port => (
                <div key={port.id} className="bg-slate-50 border border-slate-200 rounded-3xl  hover:bg-slate-100 transition-all flex flex-col">
                   {port.bildUrl && (
                     <div className="h-32 w-full border-b border-slate-200">
                       <img src={port.bildUrl} className="w-full h-full object-cover" alt="Portfolio" />
                     </div>
                   )}
                   <div className="p-6">
                     <div className="flex items-center justify-between mb-2 text-[0.625rem] font-black uppercase tracking-widest text-slate-400">
                        <span>{new Date(port.datum).toLocaleDateString('de-AT')}</span>
                     </div>
                     <h5 className="text-[0.875rem] leading-snug font-black text-slate-900 leading-tight mb-2">{port.titel}</h5>
                     {port.beschreibung && (
                       <p className="text-[0.75rem] leading-tight text-slate-500 leading-relaxed font-bold line-clamp-3">
                         {port.beschreibung}
                       </p>
                     )}
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
              <div>
                <h3 className="text-[0.6875rem] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                  <Target size={14} />
                  Ziele des Kindes
                </h3>
                <div className="space-y-4">
                  {viewingMeeting.zieleKind.length > 0 ? viewingMeeting.zieleKind.map(z => (
                    <div key={z.id} className="p-5 bg-rose-50/30 rounded-3xl border border-rose-100/50">
                       <div className="text-[0.875rem] leading-snug font-black text-slate-900 mb-2">{z.ziel}</div>
                       <div className="grid grid-cols-2 gap-4 text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">
                          <div><span className="text-rose-500 mr-1">Woran?</span> {z.woranErkennbar}</div>
                          <div><span className="text-rose-500 mr-1">Wann?</span> {z.bisWann}</div>
                       </div>
                    </div>
                  )) : (
                    <p className="text-[0.875rem] leading-snug italic text-slate-400 p-4 border border-dashed border-slate-200 rounded-2xl">Keine Ziele definiert</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-[0.6875rem] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                  <CheckCircle2 size={14} />
                  Vereinbarungen
                </h3>
                <div className="p-6 bg-slate-50 rounded-3xl text-[0.875rem] leading-snug leading-relaxed text-slate-600 whitespace-pre-wrap">
                  {viewingMeeting.vereinbarungen || 'Keine Vereinbarungen getroffen'}
                </div>
              </div>
           </div>

           <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-6 bg-slate-50 rounded-3xl">
                    <h4 className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400 mb-2">Datum</h4>
                    <div className="text-[0.875rem] leading-snug font-black text-slate-900">{new Date(viewingMeeting.datum).toLocaleDateString()}</div>
                 </div>
                 <div className="p-6 bg-slate-50 rounded-3xl">
                    <h4 className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400 mb-2">Nächster Termin</h4>
                    <div className="text-[0.875rem] leading-snug font-black text-slate-900">{viewingMeeting.naechsterTermin || 'Offen'}</div>
                 </div>
              </div>

              <div>
                <h3 className="text-[0.6875rem] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                  <Users size={14} />
                  Teilnehmer:innen
                </h3>
                <div className="flex flex-wrap gap-2">
                  {viewingMeeting.teilnehmer.map(t => (
                    <span key={t} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-full text-[0.625rem] font-black uppercase tracking-wider">{t}</span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-[0.6875rem] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                  <Smile size={14} />
                  Eindruck der Eltern
                </h3>
                <div className="p-6 bg-slate-50 rounded-3xl text-[0.875rem] leading-snug leading-relaxed text-slate-600 italic">
                  "{viewingMeeting.elternEindruck || 'Kein Eindruck erfasst'}"
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <h3 className="text-[0.6875rem] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Status Unterschriften</h3>
                <div className="flex gap-4">
                   {[
                     { label: 'Kind', active: viewingMeeting.unterschriftKind },
                     { label: 'Eltern', active: viewingMeeting.unterschriftEltern },
                     { label: 'Lehrperson', active: viewingMeeting.unterschriftLehrperson }
                   ].map(u => (
                     <div key={u.label} className={`flex-1 p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${u.active ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                        {u.active ? <CheckCircle2 size={24} /> : <div className="w-6 h-6 rounded-full border-2 border-slate-200" />}
                        <span className="text-[0.5625rem] font-black uppercase tracking-widest">{u.label}</span>
                     </div>
                   ))}
                </div>
              </div>
           </div>
        </div>
      </div>
    );
  }

  if (kelTab === 'analyse') {
    if (selectedStudentId) {
      return renderParentsDashboardView(selectedStudentId);
    } else {
      return renderStudentPortal();
    }
  }

  return (
    <div className="space-y-8 pb-20 text-left">
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div>
          <h1 className="text-[1.5rem] leading-normal sm:text-[1.875rem] leading-tight font-display font-black text-slate-900 tracking-tight">KEL-Gespräche</h1>
          <p className="text-[0.875rem] leading-snug font-medium text-slate-500 mt-1">Vorbereitung und Dokumentation der Kind-Eltern-Lehrer-Gespräche</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full xl:w-auto">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-205/60 shadow-xs shrink-0 gap-1 justify-center">
            <button 
              onClick={() => { setKelTab('protokolle'); setSelectedStudentId(null); }}
              className="px-6 py-3 text-[0.75rem] leading-tight font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 bg-white text-slate-950 shadow-md"
            >
              <MessagesSquare size={14} className="text-rose-500" />
              Protokolle
            </button>
            <button 
              onClick={() => { setKelTab('analyse'); setSelectedStudentId(null); }}
              className="px-6 py-3 text-[0.75rem] leading-tight font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 text-slate-500 hover:text-slate-800"
            >
              <BarChart3 size={14} className="text-indigo-650" />
              Visuelle Analyse
            </button>
          </div>
          <button 
            onClick={handleCreateNew}
            className="px-6 py-3.5 bg-rose-500 text-white rounded-[1.25rem] text-[0.6875rem] font-black uppercase tracking-widest hover:bg-rose-505 transition-all shadow-xl shadow-rose-500/20 flex items-center gap-2 justify-center cursor-pointer"
          >
            <Plus size={16} />
            Neues Protokoll
          </button>
        </div>
      </header>

      <div className="flex items-center gap-3 bg-white p-3 rounded-3xl shadow-sm border border-slate-100 w-fit">
        <div className="px-3 py-1 text-[0.5625rem] font-black uppercase tracking-widest text-slate-400 border-r border-slate-100">Filter</div>
        <select 
          value={filterStudentId}
          onChange={(e) => setFilterStudentId(e.target.value)}
          className="bg-transparent border-none focus:ring-0 text-[0.75rem] leading-tight font-black uppercase tracking-widest text-slate-600 pr-8"
        >
          <option value="all">Alle Schüler:innen</option>
          {[...app.schueler].sort((a,b) => a.nachname.localeCompare(b.nachname, 'de')).map(s => (
            <option key={s.id} value={s.id}>{s.nachname} {s.vorname}</option>
          ))}
        </select>
      </div>

      <div className="space-y-12">
        {groupedMeetings.length > 0 ? groupedMeetings.map(([jahr, group]) => (
          <div key={jahr} className="space-y-6">
            <h2 className="text-[0.6875rem] font-black uppercase tracking-[0.2em] text-slate-400 px-4 flex items-center gap-3">
              <span className="w-10 h-[1px] bg-slate-200"></span>
              Schuljahr {jahr}
              <span className="flex-1 h-[1px] bg-slate-200"></span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {group.map(m => (
                <motion.div 
                  key={m.id}
                  layout
                  className="group bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 hover:border-rose-200 hover:shadow-xl hover:shadow-rose-500/5 transition-all"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-14 h-14 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                      <MessagesSquare size={28} />
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleEdit(m)}
                        className="p-2 text-slate-300 hover:text-slate-600 transition-colors"
                      >
                        <FileText size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(m.id)}
                        className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="text-[1.125rem] leading-normal font-black text-slate-900 group-hover:text-rose-500 transition-colors">{getStudentName(m.schuelerId)}</h3>
                    <div className="flex items-center gap-4 mt-2">
                       <div className="flex items-center gap-1.5 text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider">
                          <Calendar size={12} className="text-slate-300" />
                          {new Date(m.datum).toLocaleDateString()}
                       </div>
                       <div className="flex items-center gap-1.5 text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider">
                          <Users size={12} className="text-slate-300" />
                          {m.teilnehmer.length} Teilnehmer
                       </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="p-3 bg-slate-50 rounded-2xl flex flex-col items-center">
                       <span className="text-[0.5rem] font-black uppercase text-slate-400 mb-1">Ziele</span>
                       <span className="text-[0.875rem] leading-snug font-black text-slate-700">{m.zieleKind.length}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl flex flex-col items-center">
                       <span className="text-[0.5rem] font-black uppercase text-slate-400 mb-1">Status</span>
                       <div className="flex gap-1">
                          {[m.unterschriftKind, m.unterschriftEltern, m.unterschriftLehrperson].map((u, i) => (
                            <div key={i} className={`w-2 h-2 rounded-full ${u ? 'bg-emerald-500 shadow-sm shadow-emerald-500/20' : 'bg-slate-200'}`} />
                          ))}
                       </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setViewingMeeting(m)}
                    className="w-full py-4 bg-slate-50 group-hover:bg-rose-500 text-slate-400 group-hover:text-white rounded-2xl text-[0.625rem] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    Details ansehen
                    <ChevronRight size={14} />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )) : (
          <div className="py-8">
            <EmptyState 
              icon="💬"
              title="Keine KEL-Gespräche vorhanden"
              description="Erfasse strukturierte Entwicklungs- und Vereinbarungsgespräche zwischen Kind, Eltern und Lehrperson, um Lernziele partnerschaftlich zu begleiten."
              actionLabel="Gesprächsprotokoll erstellen"
              onAction={handleCreateNew}
            />
          </div>
        )}
      </div>

      <AnimatePresence>
        {isEditorOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsEditorOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl bg-white rounded-[3rem] shadow-2xl  flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-[0.75rem] font-black uppercase tracking-[0.2em] text-rose-500">Editor</h2>
                  <h3 className="text-[1.5rem] leading-normal font-black text-slate-900">KEL-Gespräch bearbeiten</h3>
                </div>
                <button 
                  onClick={() => setIsEditorOpen(false)}
                  className="p-4 bg-slate-100 text-slate-400 hover:text-slate-900 rounded-3xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex bg-white border-b border-slate-100 overflow-x-auto custom-scrollbar">
                {[
                  { id: 'vorbereitung', label: '1. Vorbereitung', icon: Calendar },
                  { id: 'kind', label: '2. Selbsteinschätzung', icon: Smile },
                  { id: 'lehrperson', label: '3. Lehrperson', icon: User },
                  { id: 'ziele', label: '4. Ziele & Abschluss', icon: Target }
                ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-3 px-8 py-5 text-[0.625rem] font-black uppercase tracking-widest transition-all whitespace-nowrap border-b-4 ${activeTab === tab.id ? 'border-rose-500 text-rose-500 bg-rose-50/30' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {activeTab === 'vorbereitung' && (
                  <div className="max-w-3xl mx-auto space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                           <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 block px-4">Schüler:in</label>
                           <select 
                            value={editingMeeting?.schuelerId || ''}
                            onChange={(e) => setEditingMeeting(prev => ({ ...prev, schuelerId: e.target.value }))}
                            className="w-full p-5 bg-slate-50 border-none rounded-3xl text-[0.875rem] leading-snug font-bold focus:ring-4 focus:ring-rose-500/10"
                           >
                            <option value="">Wähle ein Kind...</option>
                            {[...app.schueler].sort((a,b) => a.nachname.localeCompare(b.nachname, 'de')).map(s => (
                              <option key={s.id} value={s.id}>{s.nachname} {s.vorname}</option>
                            ))}
                           </select>
                        </div>
                        <div className="space-y-4">
                           <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 block px-4">Datum</label>
                           <input 
                            type="date"
                            value={editingMeeting?.datum || ''}
                            onChange={(e) => setEditingMeeting(prev => ({ ...prev, datum: e.target.value }))}
                            className="w-full p-5 bg-slate-50 border-none rounded-3xl text-[0.875rem] leading-snug font-bold focus:ring-4 focus:ring-rose-500/10"
                           />
                        </div>
                     </div>

                     <div className="space-y-4">
                        <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 block px-4">Teilnehmer:innen</label>
                        <div className="flex flex-wrap gap-3">
                          {['Kind', 'Mutter', 'Vater', 'Klassenlehrerin', 'Schulleitung', 'Beratungslehrerin', 'Assistenz'].map(t => {
                            const isSelected = editingMeeting?.teilnehmer?.includes(t);
                            return (
                              <button 
                                key={t}
                                onClick={() => {
                                  const current = editingMeeting?.teilnehmer || [];
                                  const updated = isSelected 
                                    ? current.filter(x => x !== t)
                                    : [...current, t];
                                  setEditingMeeting(prev => ({ ...prev, teilnehmer: updated }));
                                }}
                                className={`px-5 py-3 rounded-2xl text-[0.75rem] leading-tight font-black uppercase tracking-wider transition-all border ${isSelected ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-white border-slate-100 text-slate-400'}`}
                              >
                                {t}
                              </button>
                            );
                          })}
                        </div>
                     </div>

                     <div className="space-y-4">
                        <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 block px-4">Schuljahr</label>
                        <input 
                          type="text"
                          value={editingMeeting?.schuljahr || ''}
                          onChange={(e) => setEditingMeeting(prev => ({ ...prev, schuljahr: e.target.value }))}
                          placeholder="z.B. 2023/24"
                          className="w-full p-5 bg-slate-50 border-none rounded-3xl text-[0.875rem] leading-snug font-bold focus:ring-4 focus:ring-rose-500/10"
                        />
                     </div>
                  </div>
                )}

                {(activeTab === 'kind' || activeTab === 'lehrperson') && (
                  <div className="max-w-4xl mx-auto space-y-12">
                     {['lernen', 'arbeitsverhalten', 'sozialverhalten', 'interessen'].map(kat => {
                       const fields = STANDARD_KEL_BEREICHE.filter(b => b.kategorie === kat);
                       return (
                         <div key={kat} className="space-y-4">
                            <h3 className={`text-[0.6875rem] font-black uppercase tracking-widest px-4 py-2 rounded-full w-fit ${KATEGORIE_COLORS[kat as keyof typeof KATEGORIE_COLORS]}`}>
                              {KATEGORIE_LABELS[kat as keyof typeof KATEGORIE_LABELS]}
                            </h3>
                            <div className="space-y-6">
                               {fields.map(field => {
                                  const dataKey = activeTab === 'kind' ? 'selbsteinschaetzungKind' : 'einschaetzungLehrperson';
                                  const fieldData = editingMeeting?.[dataKey]?.[field.id] || { wert: 2 };
                                  
                                  return (
                                    <div key={field.id} className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                                       <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                          <div className="flex-1 w-full">
                                             <div className="text-[0.75rem] leading-tight font-black text-slate-400 uppercase tracking-widest mb-1">{field.label}</div>
                                             <div className="text-[1.125rem] leading-normal font-black text-slate-900 leading-tight">{activeTab === 'kind' ? field.kindgerecht : field.label}</div>
                                          </div>
                                          <div className="grid grid-cols-5 gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                                             {SMILEYS.map(s => (
                                               <button 
                                                key={s.wert}
                                                onClick={() => {
                                                  setEditingMeeting(prev => ({
                                                    ...prev,
                                                    [dataKey]: {
                                                      ...prev?.[dataKey],
                                                      [field.id]: { ...fieldData, wert: s.wert as any }
                                                    }
                                                  }));
                                                }}
                                                className={`w-full sm:w-14 h-14 rounded-2xl text-[1.5rem] leading-normal flex items-center justify-center transition-all ${normalizeRating(fieldData.wert, editingMeeting) === s.wert ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 scale-110 z-10 relative' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 font-normal opacity-85 hover:opacity-100 hover:scale-105'}`}
                                                title={s.label}
                                               >
                                                  {s.icon}
                                               </button>
                                             ))}
                                          </div>
                                       </div>
                                       
                                       <div className="relative group">
                                          <textarea 
                                            value={fieldData.kommentar || ''}
                                            onChange={(e) => {
                                              setEditingMeeting(prev => ({
                                                ...prev,
                                                [dataKey]: {
                                                  ...prev?.[dataKey],
                                                  [field.id]: { ...fieldData, kommentar: e.target.value }
                                                }
                                              }));
                                            }}
                                            rows={2}
                                            placeholder={activeTab === 'kind' ? "Was möchtest du dazu sagen?" : "Pädagogische Erläuterung..."}
                                            className="w-full p-6 bg-slate-50 border-none rounded-3xl text-[1rem] leading-normal md:text-[1.125rem] leading-normal font-bold focus:ring-4 focus:ring-rose-500/10 resize-none pr-14 text-slate-800"
                                          />
                                          {activeTab === 'lehrperson' && (
                                            <button 
                                              onClick={() => handleAiAssessment(field)}
                                              disabled={isAiLoading === field.id}
                                              className="absolute right-4 top-4 p-3 bg-white text-rose-500 rounded-2xl shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                                            >
                                              {isAiLoading === field.id ? <Sparkles className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                            </button>
                                          )}
                                       </div>
                                    </div>
                                  );
                               })}
                            </div>
                         </div>
                       );
                     })}
                  </div>
                )}

                {activeTab === 'ziele' && (
                  <div className="max-w-4xl mx-auto space-y-12">
                     <div className="space-y-6">
                        <div className="flex items-center justify-between px-4">
                          <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Ziele des Kindes</label>
                          <button 
                            onClick={() => {
                              const current = editingMeeting?.zieleKind || [];
                              setEditingMeeting(prev => ({
                                ...prev,
                                zieleKind: [...current, { id: crypto.randomUUID(), ziel: '', woranErkennbar: '', bisWann: '' }]
                              }));
                            }}
                            className="flex items-center gap-2 text-[0.625rem] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors"
                          >
                            <Plus size={14} /> Ziel hinzufügen
                          </button>
                        </div>
                        <div className="space-y-4">
                          {editingMeeting?.zieleKind?.map((z, idx) => (
                            <div key={z.id} className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm relative group">
                               <button 
                                 onClick={() => {
                                   const updated = editingMeeting.zieleKind?.filter(x => x.id !== z.id);
                                   setEditingMeeting(prev => ({ ...prev, zieleKind: updated }));
                                 }}
                                 className="absolute top-4 right-4 p-3 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                               >
                                 <Trash2 size={18} />
                               </button>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="md:col-span-2 space-y-2">
                                     <label className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400 ml-4">Ziel {idx + 1}</label>
                                     <input 
                                      type="text"
                                      value={z.ziel}
                                      onChange={(e) => {
                                        const updated = editingMeeting.zieleKind?.map(x => x.id === z.id ? { ...x, ziel: e.target.value } : x);
                                        setEditingMeeting(prev => ({ ...prev, zieleKind: updated }));
                                      }}
                                      placeholder="Was möchte ich lernen oder besser können?"
                                      className="w-full p-4 bg-slate-50 border-none rounded-2xl text-[0.875rem] leading-snug font-bold focus:ring-4 focus:ring-rose-500/10"
                                     />
                                  </div>
                                  <div className="space-y-2">
                                     <label className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400 ml-4">Woran merke ich das?</label>
                                     <input 
                                      type="text"
                                      value={z.woranErkennbar}
                                      onChange={(e) => {
                                        const updated = editingMeeting.zieleKind?.map(x => x.id === z.id ? { ...x, woranErkennbar: e.target.value } : x);
                                        setEditingMeeting(prev => ({ ...prev, zieleKind: updated }));
                                      }}
                                      placeholder="Z.B. Ich kann das 1x1 auswendig..."
                                      className="w-full p-4 bg-slate-50 border-none rounded-2xl text-[0.875rem] leading-snug font-bold focus:ring-4 focus:ring-rose-500/10"
                                     />
                                  </div>
                                  <div className="space-y-2">
                                     <label className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400 ml-4">Bis wann?</label>
                                     <input 
                                      type="text"
                                      value={z.bisWann}
                                      onChange={(e) => {
                                        const updated = editingMeeting.zieleKind?.map(x => x.id === z.id ? { ...x, bisWann: e.target.value } : x);
                                        setEditingMeeting(prev => ({ ...prev, zieleKind: updated }));
                                      }}
                                      placeholder="Z.B. Weihnachten"
                                      className="w-full p-4 bg-slate-50 border-none rounded-2xl text-[0.875rem] leading-snug font-bold focus:ring-4 focus:ring-rose-500/10"
                                     />
                                  </div>
                               </div>
                            </div>
                          ))}
                        </div>
                     </div>

                     <div className="space-y-4">
                        <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 block px-4">Eindruck der Eltern</label>
                        <textarea 
                          value={editingMeeting?.elternEindruck || ''}
                          onChange={(e) => setEditingMeeting(prev => ({ ...prev, elternEindruck: e.target.value }))}
                          rows={3}
                          placeholder="Wie sehen die Eltern die Entwicklung ihres Kindes?"
                          className="w-full p-6 bg-slate-50 border-none rounded-3xl text-[0.875rem] leading-snug font-bold focus:ring-4 focus:ring-rose-500/10 resize-none"
                        />
                     </div>

                     <div className="space-y-4">
                        <div className="flex items-center justify-between px-4">
                           <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Vereinbarungen (Protokoll)</label>
                           <button 
                             onClick={handleAiAgreement}
                             disabled={isAiLoading === 'agreement'}
                             className="flex items-center gap-2 text-[0.625rem] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors disabled:opacity-50"
                           >
                             {isAiLoading === 'agreement' ? <Sparkles className="animate-spin" size={14} /> : <Sparkles size={14} />}
                             Mit KI formulieren
                           </button>
                        </div>
                        <textarea 
                          value={editingMeeting?.vereinbarungen || ''}
                          onChange={(e) => setEditingMeeting(prev => ({ ...prev, vereinbarungen: e.target.value }))}
                          rows={4}
                          placeholder="Welche gemeinsamen Schritte wurden vereinbart?"
                          className="w-full p-6 bg-slate-50 border-none rounded-3xl text-[0.875rem] leading-snug font-bold focus:ring-4 focus:ring-rose-500/10 resize-none"
                        />
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                           <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 block px-4">Nächster Termin</label>
                           <input 
                            type="text"
                            value={editingMeeting?.naechsterTermin || ''}
                            onChange={(e) => setEditingMeeting(prev => ({ ...prev, naechsterTermin: e.target.value }))}
                            placeholder="Z.B. Juni 2024"
                            className="w-full p-5 bg-slate-50 border-none rounded-3xl text-[0.875rem] leading-snug font-bold focus:ring-4 focus:ring-rose-500/10"
                           />
                        </div>
                        <div className="space-y-4">
                           <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 block px-4">Unterschriften (Vorhanden)</label>
                           <div className="grid grid-cols-3 gap-3">
                              {[
                                { key: 'unterschriftKind', label: 'Kind' },
                                { key: 'unterschriftEltern', label: 'Eltern' },
                                { key: 'unterschriftLehrperson', label: 'Lehrer' }
                              ].map(u => (
                                <button 
                                  key={u.key}
                                  onClick={() => setEditingMeeting(prev => ({ ...prev, [u.key]: !prev?.[u.key as keyof Partial<KELGespraech>] }))}
                                  className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${editingMeeting?.[u.key as keyof Partial<KELGespraech>] ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-300'}`}
                                >
                                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${editingMeeting?.[u.key as keyof Partial<KELGespraech>] ? 'bg-emerald-500 border-emerald-500' : 'border-slate-200'}`}>
                                    {editingMeeting?.[u.key as keyof Partial<KELGespraech>] && <CheckCircle2 size={12} className="text-white" />}
                                  </div>
                                  <span className="text-[0.5625rem] font-black uppercase tracking-widest">{u.label}</span>
                                </button>
                              ))}
                           </div>
                        </div>
                     </div>
                  </div>
                )}
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                 <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const tabs = ['vorbereitung', 'kind', 'lehrperson', 'ziele'];
                        const idx = tabs.indexOf(activeTab);
                        if (idx > 0) setActiveTab(tabs[idx - 1] as any);
                      }}
                      disabled={activeTab === 'vorbereitung'}
                      className="px-6 py-4 bg-white text-slate-600 rounded-2xl text-[0.625rem] font-black uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-20 border border-slate-200"
                    >
                      Zurück
                    </button>
                    <button 
                      onClick={() => {
                        const tabs = ['vorbereitung', 'kind', 'lehrperson', 'ziele'];
                        const idx = tabs.indexOf(activeTab);
                        if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1] as any);
                      }}
                      disabled={activeTab === 'ziele'}
                      className="px-6 py-4 bg-white text-slate-600 rounded-2xl text-[0.625rem] font-black uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-20 border border-slate-200"
                    >
                      Weiter
                    </button>
                 </div>
                 <button 
                   onClick={handleSave}
                   className="px-10 py-4 bg-rose-500 text-white rounded-2xl text-[0.6875rem] font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-xl shadow-rose-500/20 flex items-center gap-2"
                 >
                   <Save size={18} />
                   Änderungen speichern
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ComparisonView: React.FC<{ meeting: KELGespraech }> = ({ meeting }) => {
  const radarData = useMemo(() => {
    return STANDARD_KEL_BEREICHE.map(bereich => {
      const dbKind = meeting.selbsteinschaetzungKind?.[bereich.id]?.wert;
      const dbLehr = meeting.einschaetzungLehrperson?.[bereich.id]?.wert;
      const kind = normalizeRating(dbKind, meeting);
      const lehr = normalizeRating(dbLehr, meeting);
      return {
        subject: bereich.label,
        Kind: kind,
        Lehrperson: lehr,
        fullMark: 5
      };
    });
  }, [meeting]);

  const barData = useMemo(() => {
     const data: any[] = [];
     ['lernen', 'arbeitsverhalten', 'sozialverhalten', 'interessen'].forEach(kat => {
        let kindSum = 0;
        let lehrSum = 0;
        let count = 0;
        STANDARD_KEL_BEREICHE.filter(b => b.kategorie === kat).forEach(field => {
           const dbK = meeting.selbsteinschaetzungKind?.[field.id]?.wert;
           const dbL = meeting.einschaetzungLehrperson?.[field.id]?.wert;
           const k = normalizeRating(dbK, meeting);
           const l = normalizeRating(dbL, meeting);
           kindSum += k;
           lehrSum += l;
           count++;
        });
        data.push({
           name: KATEGORIE_LABELS[kat as keyof typeof KATEGORIE_LABELS],
           Kind: Number((kindSum / count).toFixed(1)),
           Lehrperson: Number((lehrSum / count).toFixed(1))
        });
     });
     return data;
  }, [meeting]);

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 mb-8">
       <h3 className="text-[0.6875rem] font-black uppercase tracking-[0.2em] text-slate-400 mb-8 flex items-center gap-2">
         <LayoutGrid size={16} />
         Direktvergleich der Einschätzungen
       </h3>
       
       <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
         <div className="xl:col-span-1 border-r border-slate-100 pr-0 xl:pr-8 flex flex-col pt-4 gap-8">
            <div>
              <h4 className="text-[0.75rem] font-black uppercase tracking-[0.3em] text-slate-900 mb-2">Visuelle Analyse (Radar)</h4>
              <p className="text-slate-500 text-[0.625rem] font-bold uppercase tracking-widest leading-relaxed mb-6">
                Radardiagramm der Einschätzungen. Größere Fläche bedeutet positivere Einschätzung.
              </p>
              <div className="h-[320px] w-full bg-white rounded-3xl border border-slate-100 p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="60%" data={radarData}>
                    <PolarGrid stroke="#f1f5f9" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 900 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 4]} tick={false} axisLine={false} />
                    <Radar name="Kind" dataKey="Kind" stroke="#f43f5e" strokeWidth={3} fill="#f43f5e" fillOpacity={0.15} isAnimationActive={true} animationDuration={1500} />
                    <Radar name="Lehrperson" dataKey="Lehrperson" stroke="#10b981" strokeWidth={3} fill="#10b981" fillOpacity={0.15} isAnimationActive={true} animationDuration={1500} />
                    <Legend 
                      wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }}
                      iconType="circle"
                    />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '12px' }}
                      itemStyle={{ fontWeight: 800, fontSize: '12px' }}
                      labelStyle={{ fontWeight: 900, marginBottom: '4px', fontSize: '11px', color: '#64748b' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h4 className="text-[0.75rem] font-black uppercase tracking-[0.3em] text-slate-900 mb-2">Kategorien im Durchschnitt</h4>
              <p className="text-slate-500 text-[0.625rem] font-bold uppercase tracking-widest leading-relaxed mb-6">
                Positive Ausprägung nach Bereichen
              </p>
              <div className="h-[250px] w-full bg-white rounded-3xl border border-slate-100 p-4 pt-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
                       <YAxis domain={[0, 4]} tickCount={5} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} />
                       <RechartsTooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '12px' }}
                          itemStyle={{ fontWeight: 800, fontSize: '12px' }}
                       />
                       <Bar dataKey="Kind" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={12} isAnimationActive={true} animationDuration={1500} />
                       <Bar dataKey="Lehrperson" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} isAnimationActive={true} animationDuration={1500} />
                    </BarChart>
                 </ResponsiveContainer>
              </div>
            </div>
         </div>

         <div className="xl:col-span-2 space-y-12">
          {['lernen', 'arbeitsverhalten', 'sozialverhalten', 'interessen'].map(kat => (
            <div key={kat} className="space-y-4">
               <h4 className={`text-[0.625rem] font-black uppercase tracking-widest w-fit px-4 py-2 rounded-full ${KATEGORIE_COLORS[kat as keyof typeof KATEGORIE_COLORS]}`}>
                 {KATEGORIE_LABELS[kat as keyof typeof KATEGORIE_LABELS]}
               </h4>
               <div className="grid grid-cols-1 gap-1">
                  {STANDARD_KEL_BEREICHE.filter(b => b.kategorie === kat).map(field => {
                    const nKindVal = normalizeRating(meeting.selbsteinschaetzungKind[field.id]?.wert, meeting);
                    const nLehrVal = normalizeRating(meeting.einschaetzungLehrperson[field.id]?.wert, meeting);
                    const kind = { ...meeting.selbsteinschaetzungKind[field.id], wert: nKindVal };
                    const lehr = { ...meeting.einschaetzungLehrperson[field.id], wert: nLehrVal };
                    const diff = Math.abs(kind.wert - lehr.wert);
                    const isIssue = diff >= 2;

                    return (
                      <div key={field.id} className={`p-4 rounded-3xl transition-all border ${isIssue ? 'bg-amber-50/50 border-amber-100 shadow-[0_4px_15px_-5px_rgba(251,191,36,0.2)]' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                         <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
                            <div className="lg:col-span-1">
                               <div className="text-[0.75rem] leading-tight font-black text-slate-800 leading-tight">{field.label}</div>
                               {isIssue && (
                                 <div className="text-[0.5625rem] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded mt-1 w-fit uppercase tracking-wider flex items-center gap-1">
                                    <Info size={10} />
                                    Gesprächsanlass
                                 </div>
                               )}
                            </div>
                            
                            <div className="lg:col-span-1 flex items-center gap-3">
                               <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-[1.25rem] leading-normal">
                                  {SMILEYS.find(s => s.wert === kind.wert)?.icon}
                               </div>
                               <div className="flex-1 min-w-0">
                                  <div className="text-[0.5rem] font-black uppercase tracking-widest text-rose-500 mb-0.5">Kind</div>
                                  <div className="text-[0.625rem] text-slate-500 italic text-wrap leading-tight break-words">"{kind.kommentar || 'Kein Kommentar'}"</div>
                               </div>
                            </div>

                            <div className="lg:col-span-1 flex items-center gap-3">
                               <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-[1.25rem] leading-normal">
                                  {SMILEYS.find(s => s.wert === lehr.wert)?.icon}
                               </div>
                               <div className="flex-1 min-w-0">
                                  <div className="text-[0.5rem] font-black uppercase tracking-widest text-emerald-500 mb-0.5">Lehrperson</div>
                                  <div className="text-[0.625rem] text-slate-500 italic text-wrap leading-tight break-words">"{lehr.kommentar || 'Kein Kommentar'}"</div>
                               </div>
                            </div>

                            <div className="lg:col-span-1 flex justify-end">
                               <div className="flex gap-2">
                                  {kind.wert === lehr.wert ? (
                                    <div className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[0.5625rem] font-black uppercase tracking-widest flex items-center gap-1 shadow-[0_2px_10px_-2px_rgba(16,185,129,0.1)]">
                                       <CheckCircle2 size={10} /> Überstimmend
                                    </div>
                                  ) : (
                                    <div className={`px-3 py-1.5 rounded-lg text-[0.5625rem] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm ${isIssue ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                                       <Clock size={10} /> Differenz: {diff}
                                    </div>
                                  )}
                               </div>
                            </div>
                         </div>
                      </div>
                    );
                  })}
               </div>
            </div>
          ))}
       </div>
       </div>
    </div>
  );
};

const PrintView: React.FC<{ 
  meeting: KELGespraech; 
  student: Student; 
  type: 'child' | 'protocol';
  onClose: () => void;
}> = ({ meeting, student, type, onClose }) => {
  return (
    <div className="fixed inset-0 z-[200] bg-white overflow-y-auto no-scrollbar print:relative print:overflow-visible print:bg-white">
       <div className="max-w-4xl mx-auto p-12 space-y-10 print:p-0 print:m-0 print:max-w-none">
          <div className="flex justify-between items-center print:hidden border-b pb-6 mb-8">
             <button 
               onClick={onClose}
               className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl font-black text-[0.75rem] leading-tight uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
             >
               <ArrowLeft size={16} /> Zurück
             </button>
             
          </div>

          <header className="border-b-4 border-slate-900 pb-10">
             <div className="flex justify-between items-start mb-6">
                <div>
                   <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">
                     {type === 'child' ? 'Meine Selbsteinschätzung' : 'KEL-Gespräch Protokoll'}
                   </h1>
                   <p className="text-[1.125rem] leading-normal font-bold text-slate-500 mt-1">Individueller Entwicklungsplan (Volksschule)</p>
                </div>
                <div className="text-right">
                   <div className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Datum</div>
                   <div className="text-[1.25rem] leading-normal font-black text-slate-900">{new Date(meeting.datum).toLocaleDateString()}</div>
                </div>
             </div>
             
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-4">
                <div className="space-y-1">
                   <span className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400 block px-1">Schüler:in</span>
                   <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[0.75rem] leading-tight font-black">{student.vorname} {student.nachname}</div>
                </div>
                <div className="space-y-1">
                   <span className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400 block px-1">Klasse</span>
                   <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[0.75rem] leading-tight font-black">2b</div>
                </div>
                <div className="space-y-1">
                   <span className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400 block px-1">Schuljahr</span>
                   <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[0.75rem] leading-tight font-black">{meeting.schuljahr}</div>
                </div>
                <div className="space-y-1">
                   <span className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400 block px-1">Nächster Termin</span>
                   <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[0.75rem] leading-tight font-black">{meeting.naechsterTermin || '--'}</div>
                </div>
             </div>
             
             {type === 'protocol' && (
               <div className="space-y-1">
                  <span className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400 block px-1">Teilnehmer:innen</span>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[0.75rem] leading-tight font-black">{meeting.teilnehmer.join(', ')}</div>
               </div>
             )}
          </header>

          <div className="space-y-6 print:hidden">
             {STANDARD_KEL_BEREICHE.map((field, idx) => {
               const nKindVal = normalizeRating(meeting.selbsteinschaetzungKind[field.id]?.wert, meeting);
               const nLehrVal = normalizeRating(meeting.einschaetzungLehrperson[field.id]?.wert, meeting);
               const kind = { ...meeting.selbsteinschaetzungKind[field.id], wert: nKindVal };
               const lehr = { ...meeting.einschaetzungLehrperson[field.id], wert: nLehrVal };
               const isEven = idx % 2 === 0;

               return (
                 <div key={field.id} className={`p-6 rounded-3xl border ${isEven ? 'bg-slate-50/30' : 'bg-white'} border-slate-100`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-8">
                       <div className="flex-1 space-y-4 w-full">
                          <div>
                             <h3 className="text-[0.75rem] leading-tight font-black text-slate-900 leading-tight mb-1">{field.kindgerecht}</h3>
                             <p className="text-[0.5rem] font-black text-slate-400 uppercase tracking-widest">{field.label}</p>
                          </div>
                          
                          <div className={`grid ${type === 'protocol' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                             {type === 'child' ? (
                               <div className="h-10 border-b border-dashed border-slate-300"></div>
                             ) : (
                               <>
                                 <div className="p-3 bg-white rounded-xl border border-slate-100">
                                    <div className="text-[0.4375rem] font-black uppercase tracking-widest text-rose-500 mb-1">Meinung Kind</div>
                                    <p className="text-[0.625rem] text-slate-600 leading-relaxed italic">"{kind.kommentar || '...'}"</p>
                                 </div>
                                 <div className="p-3 bg-white rounded-xl border border-slate-100">
                                    <div className="text-[0.4375rem] font-black uppercase tracking-widest text-emerald-500 mb-1">Meinung Lehrperson</div>
                                    <p className="text-[0.625rem] text-slate-600 leading-relaxed">"{lehr.kommentar || '...'}"</p>
                                 </div>
                               </>
                             )}
                          </div>
                       </div>

                       <div className={`flex gap-3 justify-end shrink-0 ${type === 'protocol' ? 'pt-4' : 'pt-0'}`}>
                          {SMILEYS.map(s => {
                            let isActive = false;
                            let isTeacherActive = false;
                            
                            if (type === 'protocol') {
                              isActive = kind.wert === s.wert;
                              isTeacherActive = lehr.wert === s.wert;
                            } else if (type === 'child') {
                              isActive = false; // Empty for child to fill out
                            }

                            return (
                              <div key={s.wert} className="flex flex-col items-center gap-1">
                                 <div className={`w-10 h-10 rounded-xl border-4 text-[1.25rem] leading-normal flex items-center justify-center transition-all ${isActive ? 'border-rose-500 bg-rose-50' : isTeacherActive ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 opacity-30 grayscale'}`}>
                                    {s.icon}
                                 </div>
                                 <div className="flex gap-1 h-3">
                                    {type === 'protocol' && isActive && <div className="w-2 h-2 rounded-full bg-rose-500" />}
                                    {type === 'protocol' && isTeacherActive && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                                    {type === 'child' && <div className="w-5 h-5 rounded-full border-2 border-slate-200" />}
                                 </div>
                              </div>
                            );
                          })}
                       </div>
                    </div>
                 </div>
               );
             })}
          </div>

          {/* PRINT-ONLY BEAUTIFUL TABLE LAYOUT */}
          <div className="hidden print:block mb-8">
            <table className="w-full border-collapse border border-slate-300 text-[10pt]">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 p-2 text-left w-1/4">Bereich</th>
                  <th className="border border-slate-300 p-2 text-center w-1/4">Einschätzung</th>
                  {type === 'protocol' && (
                    <th className="border border-slate-300 p-2 text-left w-1/2">Kommentare & Notizen</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {STANDARD_KEL_BEREICHE.map(field => {
                  const nKindVal = normalizeRating(meeting.selbsteinschaetzungKind[field.id]?.wert, meeting);
                  const nLehrVal = normalizeRating(meeting.einschaetzungLehrperson[field.id]?.wert, meeting);
                  const kind = { ...meeting.selbsteinschaetzungKind[field.id], wert: nKindVal };
                  const lehr = { ...meeting.einschaetzungLehrperson[field.id], wert: nLehrVal };
                  const kindIcon = SMILEYS.find(s => s.wert === kind.wert)?.icon || '';
                  const lehrIcon = SMILEYS.find(s => s.wert === lehr.wert)?.icon || '';

                  return (
                    <tr key={field.id} className="break-inside-avoid">
                      <td className="border border-slate-300 p-2 align-top">
                        <div className="font-bold">{field.kindgerecht}</div>
                        <div className="text-[7pt] text-slate-500 uppercase">{field.label}</div>
                      </td>
                      <td className="border border-slate-300 p-2 align-top text-center">
                        {type === 'protocol' ? (
                          <div className="flex flex-col gap-1 items-center justify-center">
                            <span className="text-[0.5rem] uppercase font-bold text-rose-600 block">Kind: {kindIcon}</span>
                            <span className="text-[0.5rem] uppercase font-bold text-emerald-600 block">Lehrperson: {lehrIcon}</span>
                          </div>
                        ) : (
                          <div className="flex justify-between px-2 text-[1.125rem] leading-normal text-slate-300">
                            {SMILEYS.map(s => <span key={s.wert}>{s.icon}</span>)}
                          </div>
                        )}
                      </td>
                      {type === 'protocol' && (
                        <td className="border border-slate-300 p-2 align-top space-y-1">
                          <div className="text-[8pt]"><span className="font-bold text-rose-600 uppercase text-[6pt]">Kind:</span> {kind.kommentar || '-'}</div>
                          <div className="text-[8pt]"><span className="font-bold text-emerald-600 uppercase text-[6pt]">Lehrperson:</span> {lehr.kommentar || '-'}</div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {type === 'protocol' && (
            <>
            <div className="grid grid-cols-2 gap-12 pt-10">
               <div className="space-y-6">
                  <div>
                     <h3 className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 mb-4 px-2">Ziele des Kindes</h3>
                     <div className="space-y-3">
                        {meeting.zieleKind.map(z => (
                          <div key={z.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                             <div className="text-[0.75rem] leading-tight font-black text-slate-900 mb-2">{z.ziel}</div>
                             <div className="flex gap-4 text-[0.5rem] font-bold text-slate-400 uppercase tracking-widest">
                                <span>Woran: {z.woranErkennbar}</span>
                                <span>Bis: {z.bisWann}</span>
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>
                  <div>
                    <h3 className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 mb-4 px-2">Eindruck der Eltern</h3>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[0.75rem] leading-tight text-slate-600 leading-relaxed italic">
                      "{meeting.elternEindruck || '...'}"
                    </div>
                  </div>
               </div>
               <div className="space-y-6">
                  <div>
                    <h3 className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 mb-4 px-2">Vereinbarungen</h3>
                    <div className="p-5 bg-white border border-slate-200 text-slate-800 rounded-3xl text-[0.875rem] leading-snug leading-relaxed min-h-[200px] whitespace-pre-wrap shadow-sm">
                      {meeting.vereinbarungen || '...'}
                    </div>
                  </div>
               </div>
            </div>

            <div className="hidden print:block space-y-4 pt-10 border-t border-slate-100">
                <p className="text-[0.625rem] font-black uppercase text-slate-400 mb-4 tracking-widest">Ergänzende Notizen</p>
                <div className="h-40 border-b border-dashed border-slate-300 w-full mb-4"></div>
                <div className="h-40 border-b border-dashed border-slate-300 w-full"></div>
            </div>
            </>
          )}

          <footer className="pt-20 border-t-2 border-slate-100 grid grid-cols-3 gap-12">
             {[
               { label: 'Unterschrift Kind', key: 'unterschriftKind' },
               { label: 'Unterschrift Eltern', key: 'unterschriftEltern' },
               { label: 'Unterschrift Lehrperson', key: 'unterschriftLehrperson' }
             ].map(u => (
               <div key={u.key} className="space-y-3">
                  <div className="h-10 border-b-2 border-slate-200"></div>
                  <div className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 text-center">{u.label}</div>
               </div>
             ))}
          </footer>
       </div>
    </div>
  );
};

export default KELGespraeche;
