import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  User, Sparkles, BarChart3, Heart, Target, Activity, 
  Stethoscope, GraduationCap, Banknote, FileText, ChevronRight, ChevronDown,
  ArrowLeft, Clock, Save, Edit3, Trash2, Award, ClipboardList,
  AlertCircle, Compass, Calendar, Shield, CheckCircle2,
  BookOpen, Phone, ListChecks
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { exportSchuelerPDF } from '../lib/exportService';
import { berechne } from '../lib/GradeUtils';
import { FAECHER_ALLE } from '../constants';
import { faecherFuerKlasse } from '../lib/sek1Subjects';
import {
  getStudentAttendanceSummary,
  getStudentBehaviorSummary,
  getStudentFinanceSummary,
  getStudentGradeSummary,
  getStudentNotes
} from '../lib/studentMetrics';

// Sub-components
import DossierStammdaten from './dossier/DossierStammdaten';
import DossierKontakteEinwilligungen from './dossier/DossierKontakteEinwilligungen';
import DossierUebersicht from './dossier/DossierUebersicht';
import DossierKIPortfolio from './dossier/DossierKIPortfolio';
import DossierLeistungen from './dossier/DossierLeistungen';
import AntolinBereich from './AntolinBereich';
import VerbalAssessment from './VerbalAssessment';
import StudentPortfolio from './StudentPortfolio';
import DossierLernzielErlaeuterung from './dossier/DossierLernzielErlaeuterung';
import DossierFoerderprofil from './dossier/DossierFoerderprofil';
import DossierDiagnostik from './dossier/DossierDiagnostik';
import DossierMikaD from './dossier/DossierMikaD';
import DossierFinanzen from './dossier/DossierFinanzen';
import DossierErlaeuterung from './dossier/DossierErlaeuterung';
import DossierElternReport from './dossier/DossierElternReport';
import DossierKELReflexion from './dossier/DossierKELReflexion';
import StudentStatsEditor from './StudentStatsEditor';
import DossierErlaeuterungsmatrix from './dossier/DossierErlaeuterungsmatrix';
import StudentLernziele from './StudentLernziele';
import WorksheetGenerator from './WorksheetGenerator';
import { DossierEntwicklungsuebersicht } from './dossier/DossierEntwicklungsuebersicht';
import DossierDevelopmentLists from './dossier/DossierDevelopmentLists';
import { getStudentGenderLabel } from '../lib/studentListData';
import { DossierFoerderung } from './dossier/DossierFoerderung';
import { DossierBeobachtungenVerlauf } from './dossier/DossierBeobachtungenVerlauf';
import DossierBerichte from './dossier/DossierBerichte';
import DossierGespraecheBeurteilungen from './dossier/DossierGespraecheBeurteilungen';
import DossierMaterialien from './dossier/DossierMaterialien';

import { createPortal } from 'react-dom';
import KELPresentation from './KELPresentation';
import { STANDARD_KEL_BEREICHE } from '../types';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { getValidStudentDiagnostics, isDiagnosticAlert } from '../lib/diagnosticData';

const ModalPortal = ({ children }: { children: React.ReactNode }) => {
  return createPortal(children, document.body);
};

interface StudentDossierProps {
  schuelerId: string;
  onBack?: () => void;
  onStudentChange?: (id: string) => void;
  /** Optional deep link from class-year report management, no persisted navigation state. */
  initialReportView?: boolean;
}

export type MainAreaId = 
  | 'uebersicht'
  | 'lernen_leistungen'
  | 'entwicklung_diagnostik'
  | 'stammdaten_organisation'
  | 'berichte_materialien';

export type DossierTab = 
  | 'uebersicht'
  | 'mehr'
  | 'stammdaten' 
  | 'kontakte_einwilligungen'
  | 'finanzen'
  | 'berichte'
  | 'beurteilung_gespraeche'
  | 'materialien'
  | 'ki_summary'
  | 'notizen'
  | 'prep'
  | 'leistungen' 
  | 'leistungsfeedback'
  | 'antolin'
  | 'portfolio'
  | 'lernziel_erlaeuterung'
  | 'foerderprofil' 
  | 'diagnostik' 
  | 'mika_d' 
  | 'stats'
  | 'erlaeuterung'
  | 'lernziele'
  | 'arbeitsblatt'
  | 'eltern_report'
  | 'kel_reflexion'
  | 'entwicklungsuebersicht'
  | 'foerderung'
  | 'beobachtungen_verlauf'
  | 'entwicklungslisten';

export interface MainAreaDef {
  id: MainAreaId;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  defaultTab: DossierTab;
  tabs: {
    id: DossierTab;
    label: string;
    shortLabel?: string;
    icon: React.ComponentType<{ size: number; className?: string }>;
    description?: string;
  }[];
}

export const MAIN_AREAS: MainAreaDef[] = [
  { id: 'uebersicht', label: 'Überblick', subtitle: 'Noten und Alltag', icon: Sparkles, defaultTab: 'uebersicht', tabs: [
    { id: 'uebersicht', label: 'Überblick', icon: Sparkles }
  ] },
  { id: 'lernen_leistungen', label: 'Leistungen', subtitle: 'Alle Fachbewertungen', icon: BarChart3, defaultTab: 'leistungen', tabs: [
    { id: 'leistungen', label: 'Leistungen', icon: BarChart3 }
  ] },
  { id: 'entwicklung_diagnostik', label: 'Beobachtungen', subtitle: 'Verhalten, Befinden und Anwesenheit', icon: Clock, defaultTab: 'beobachtungen_verlauf', tabs: [
    { id: 'beobachtungen_verlauf', label: 'Beobachtungen & Verlauf', icon: Clock }
  ] },
  { id: 'berichte_materialien', label: 'Mehr', subtitle: 'Vertiefung und Organisation', icon: FileText, defaultTab: 'mehr', tabs: [

      { id: 'leistungsfeedback', label: 'Leistungsfeedback erstellen', shortLabel: 'Feedback', icon: FileText, description: 'Ausgewählte Daten und Beobachtungen zu einer Rückmeldung formulieren' },
      { id: 'lernziele', label: 'Lernziele & Kompetenzen', shortLabel: 'Lernziele', icon: Target, description: 'Lehrplan-Kompetenzen und erreichte Teilziele' },
      { id: 'portfolio', label: 'Portfolio', shortLabel: 'Portfolio', icon: BookOpen, description: 'Arbeiten, Fotos und echte individuelle Lernnachweise' },
      { id: 'lernziel_erlaeuterung', label: 'Erläuterung', shortLabel: 'Erläuterung', icon: FileText, description: 'Schulinterne Lernziel-Rückmeldung mit eigenem Text, keine automatische Notenentscheidung' },
      { id: 'mika_d', label: 'Sprachstand', shortLabel: 'Sprachstand', icon: GraduationCap, description: 'MIKA-D Sprachstandsfeststellung' },
      { id: 'antolin', label: 'Lesen & Antolin', shortLabel: 'Antolin', icon: BookOpen, description: 'Dokumentierte Antolin-Berichte und Leseentwicklung des Kindes' },

      { id: 'entwicklungsuebersicht', label: 'Entwicklungsübersicht', shortLabel: 'Übersicht', icon: Compass, description: 'Pädagogischer Gesamtblick, Stärken und Beobachtungsschwerpunkte' },
      { id: 'diagnostik', label: 'Diagnostik', shortLabel: 'Diagnostik', icon: Stethoscope, description: 'Kompetenzchecks & Erfassung von Lernvoraussetzungen' },
      { id: 'foerderung', label: 'Förderung', shortLabel: 'Förderung', icon: Heart, description: 'Aktive Förderziele, pädagogische Maßnahmen und Stärken' },
      { id: 'entwicklungslisten', label: 'Entwicklungslisten', shortLabel: 'Entwicklungslisten', icon: ListChecks, description: 'Fortlaufende individuelle Verläufe wie Antolin, Lautlesen und Förderung' },

      { id: 'stammdaten', label: 'Stammdaten', shortLabel: 'Stammdaten', icon: User, description: 'Personenstandsdaten und schulische Zuordnung' },
      { id: 'kontakte_einwilligungen', label: 'Kontakte & Einwilligungen', shortLabel: 'Kontakte & Einwilligungen', icon: Phone, description: 'Erziehungsberechtigte und Fotoerlaubnis' },
      { id: 'finanzen', label: 'Finanzen & Organisation', shortLabel: 'Finanzen & Organisation', icon: Banknote, description: 'Klassenkasse, Beiträge und Zahlungsstatus' },

      { id: 'berichte', label: 'Berichte', shortLabel: 'Berichte', icon: FileText, description: 'KI-Zusammenfassung, Eltern-Report, Jahresbericht & Exporte' },
      { id: 'beurteilung_gespraeche', label: 'Gespräche & Beurteilungen', shortLabel: 'Gespräche & Beurteilungen', icon: Award, description: 'Erläuterungsmatrix & Gesprächsvorbereitung' },
      { id: 'materialien', label: 'Materialien', shortLabel: 'Materialien', icon: BookOpen, description: 'Individuelles Fördermaterial & Arbeitsblätter' },
  ] }
];

export const MORE_DOSSIER_GROUPS: {
  id: 'lernen' | 'entwicklung' | 'organisation' | 'berichte';
  label: string;
  description: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  tabs: DossierTab[];
}[] = [
  {
    id: 'lernen',
    label: 'Lernen & Rückmeldung',
    description: 'Lernziele, Portfolio, Lesen und individuelle Rückmeldungen',
    icon: BookOpen,
    tabs: ['leistungsfeedback', 'lernziele', 'portfolio', 'lernziel_erlaeuterung', 'antolin', 'mika_d']
  },
  {
    id: 'entwicklung',
    label: 'Entwicklung & Förderung',
    description: 'Vertiefende Diagnostik, Förderziele und Entwicklungsverläufe',
    icon: Heart,
    tabs: ['entwicklungsuebersicht', 'diagnostik', 'foerderung', 'entwicklungslisten']
  },
  {
    id: 'organisation',
    label: 'Organisation',
    description: 'Stammdaten, Kontakte, Einwilligungen und Finanzen',
    icon: User,
    tabs: ['stammdaten', 'kontakte_einwilligungen', 'finanzen']
  },
  {
    id: 'berichte',
    label: 'Berichte & Materialien',
    description: 'Gespräche, Berichte, Exporte und individuelles Material',
    icon: FileText,
    tabs: ['berichte', 'beurteilung_gespraeche', 'materialien']
  }
];

export const getActiveMainArea = (tab: DossierTab): MainAreaId => {
  if (tab === 'mehr') return 'berichte_materialien';
  for (const area of MAIN_AREAS) {
    if (area.tabs.some(t => t.id === tab)) {
      return area.id;
    }
  }
  if (tab === 'stats' || tab === 'kel_reflexion' || tab === 'notizen') return 'entwicklung_diagnostik';
  if (tab === 'foerderprofil') return 'berichte_materialien';
  if (tab === 'prep' || tab === 'ki_summary' || tab === 'eltern_report' || tab === 'erlaeuterung' || tab === 'arbeitsblatt') return 'berichte_materialien';
  return 'uebersicht';
};

export default function StudentDossier({ schuelerId, onBack, onStudentChange, initialReportView = false }: StudentDossierProps) {
  const { app, setApp, setPage } = useApp();
  const student = app.schueler.find(s => s.id === schuelerId);
  
  // Always start with 'uebersicht'
  const [activeTab, setActiveTab] = useState<DossierTab>(initialReportView ? 'berichte' : 'uebersicht');
  const [overviewSubject, setOverviewSubject] = useState<string | undefined>();
  const [pendingQuickEntry, setPendingQuickEntry] = useState<'note' | 'strength' | 'parent' | 'goal' | null>(null);

  const openOverviewQuickEntry = (type: 'note' | 'strength' | 'parent' | 'goal') => {
    setPendingQuickEntry(type);
    setActiveTab(type === 'goal' || type === 'strength' ? 'foerderung' : 'beobachtungen_verlauf');
  };

  // Respect the explicit class-year deep link; ordinary dossier visits still
  // start at the overview and no navigation preference is persisted.
  useEffect(() => {
    setActiveTab(initialReportView ? 'berichte' : 'uebersicht');
    setPendingQuickEntry(null);
    setOverviewSubject(undefined);
  }, [schuelerId, initialReportView]);

  const activeMainArea = getActiveMainArea(activeTab);

  const [presentationModeActive, setPresentationModeActive] = useState<boolean>(false);
  // All dossier tabs read/write the original first bucket as one school year.
  // Do not delete any historical encrypted second-bucket records.
  const sem: '1' | '2' = '1';
  const changeSemester = (_nextSemester: '1' | '2') => { /* Single school-year view. */ };
  const activeFaecher = faecherFuerKlasse(app).filter(f => !app.faecher || app.faecher.includes(f));

  const [lernzieleInitialFach, setLernzieleInitialFach] = useState<string | undefined>(undefined);


  useEscapeKey(() => setPresentationModeActive(false), presentationModeActive);

  // --- Attendance aggregation ---
  const getAttendanceStats = (sid: string) => getStudentAttendanceSummary(app, sid);

  if (!student) return null;

  const currentStudentIndex = app.schueler.findIndex(s => s.id === student.id);
  const previousStudent = currentStudentIndex > 0 ? app.schueler[currentStudentIndex - 1] : null;
  const nextStudent = currentStudentIndex < app.schueler.length - 1
    ? app.schueler[currentStudentIndex + 1]
    : null;

  const switchStudent = (targetId?: string) => {
    if (targetId && onStudentChange) {
      onStudentChange(targetId);
      setActiveTab('uebersicht');
    }
  };

  const studentErhebungen = getValidStudentDiagnostics(app, student.id);
  const criticalCount = studentErhebungen.filter(isDiagnosticAlert).length;
  const newDiagnosticResults = (app.diagnosticResults || []).filter((r: any) => r.studentId === student.id);
  const totalDiagnosticCount = studentErhebungen.length + newDiagnosticResults.length;

  const handleSelectArea = (areaId: MainAreaId) => {
    setPendingQuickEntry(null);
    const targetArea = MAIN_AREAS.find(area => area.id === areaId);
    if (!targetArea) return;
    if (areaId === 'berichte_materialien' && activeTab !== 'mehr') {
      setActiveTab('mehr');
      return;
    }
    if (targetArea.tabs.some(tab => tab.id === activeTab)) return;
    setActiveTab(targetArea.defaultTab);
  };

  const getFilteredSubTabs = (areaId: MainAreaId) => {
    const area = MAIN_AREAS.find(a => a.id === areaId);
    return area?.tabs || [];
  };

  const getFilteredMainAreas = () => MAIN_AREAS;

  const isSubTabActive = (subTabId: DossierTab) =>
    activeTab === subTabId ||
    (subTabId === 'foerderung' && activeTab === 'foerderprofil') ||
    (subTabId === 'beobachtungen_verlauf' && (activeTab === 'stats' || activeTab === 'kel_reflexion' || activeTab === 'notizen')) ||
    (subTabId === 'berichte' && (activeTab === 'ki_summary' || activeTab === 'eltern_report')) ||
    (subTabId === 'beurteilung_gespraeche' && activeTab === 'erlaeuterung') ||
    (subTabId === 'materialien' && activeTab === 'arbeitsblatt');

  const activeMoreGroup = MORE_DOSSIER_GROUPS.find(group =>
    group.tabs.some(tabId => isSubTabActive(tabId))
  );

  const moreTabById = new Map(
    MAIN_AREAS.find(area => area.id === 'berichte_materialien')?.tabs.map(tab => [tab.id, tab]) || []
  );

  // Helper metric calculations 
  const gradeSummary = getStudentGradeSummary(app, student.id, activeFaecher, sem);
  const summaryGrade = gradeSummary.average;
  const behaviorSummary = getStudentBehaviorSummary(app, student.id);
  const attendanceSummary = getStudentAttendanceSummary(app, student.id);
  const financeSummary = getStudentFinanceSummary(app, student.id);
  const totalPaid = financeSummary.paid;
  const totalOpen = financeSummary.open;
  const hasFinanceData = financeSummary.hasData;
  const formatEuro = (value: number) => value.toLocaleString('de-AT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const isSpf = student.spf;
  const isEspf = student.espf;
  const isDaz = student.daz;

  const currentStage = behaviorSummary.stage;
  const hasBehaviorData = behaviorSummary.hasData;

  const checkIsBirthdayToday = () => {
    if (!student.geburtstag) return false;
    const parts = student.geburtstag.includes('-') ? student.geburtstag.split('-') : student.geburtstag.split('.');
    if (parts.length < 2) return false;
    
    let day = 0;
    let month = 0;
    if (student.geburtstag.includes('-')) {
      day = parseInt(parts[2], 10);
      month = parseInt(parts[1], 10);
    } else {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
    }
    
    const today = new Date();
    return today.getDate() === day && (today.getMonth() + 1) === month;
  };
  const isBirthdayToday = checkIsBirthdayToday();

  return (
    <div className={`${
      app.dossierFocusMode 
        ? 'max-w-none w-full flex flex-col gap-0 min-h-screen pb-10' 
        : 'mx-auto w-full max-w-7xl flex flex-col gap-4 min-h-[85vh] pb-20 px-3 sm:px-5 lg:px-7'
    } animate-in fade-in slide-in-from-bottom-4 duration-500`}>
      {/* COMPACT STUDENT NAVIGATION — single shared header for normal and focus mode */}
      <div data-student-dossier-nav className={`print:hidden flex flex-col gap-2 rounded-2xl border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between ${app.dossierFocusMode?'mx-3 mt-3 border-slate-700 bg-slate-900 text-white':'border-slate-200 bg-white'}`}>
        <div className="flex min-w-0 items-center gap-2.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${app.dossierFocusMode?'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700':'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
              title="Zur Schülerauswahl"
            >
              <ArrowLeft size={15} />
            </button>
          )}
          <div aria-label="Initialen" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xs font-black ${app.dossierFocusMode?'border-slate-700 bg-slate-800 text-slate-200':'border-slate-200 bg-slate-100 text-slate-700'}`}>
            {student.vorname.charAt(0)}{student.nachname.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <p className={`truncate text-sm font-black ${app.dossierFocusMode?'text-white':'text-slate-900'}`}>{student.vorname} {student.nachname}</p>
              {isBirthdayToday&&<span className="rounded-md bg-pink-100 px-1.5 py-0.5 text-[0.58rem] font-black text-pink-700">🎉 Geburtstag</span>}
              {isSpf&&<span className="rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[0.58rem] font-black text-rose-700">SPF</span>}
              {isEspf&&<span className="rounded-md border border-cyan-200 bg-cyan-50 px-1.5 py-0.5 text-[0.58rem] font-black text-cyan-700">ESPF</span>}
              {isDaz&&<span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[0.58rem] font-black text-amber-700">DAZ</span>}
            </div>
            <p className={`truncate text-[0.62rem] font-semibold ${app.dossierFocusMode?'text-slate-400':'text-slate-500'}`}>Schülerdossier · {app.klassenbezeichnung || 'Klasse'} · {app.schuljahr || 'Schuljahr'} · Geschlecht: {getStudentGenderLabel(student.geschlecht)}</p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => switchStudent(previousStudent?.id)}
            disabled={!previousStudent}
            aria-label={previousStudent ? `Vorheriges Kind: ${previousStudent.vorname} ${previousStudent.nachname}` : 'Kein vorheriges Kind'}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-30 ${app.dossierFocusMode?'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700':'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            <ArrowLeft size={14} />
          </button>
          <div className="relative min-w-0 flex-1 sm:w-60 sm:flex-none">
            <select
              id="student-switcher"
              value={student.id}
              onChange={(e) => onStudentChange && onStudentChange(e.target.value)}
              className={`min-h-10 w-full appearance-none rounded-xl border px-3 py-2 pr-8 text-xs font-black outline-none transition focus:ring-2 focus:ring-indigo-400 ${app.dossierFocusMode?'border-slate-700 bg-slate-800 text-white':'border-slate-200 bg-slate-50 text-slate-800'}`}
              disabled={!onStudentChange}
            >
              {app.schueler.map((s) => <option key={s.id} value={s.id}>{s.vorname} {s.nachname}</option>)}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <span className={`hidden text-[0.62rem] font-black tabular-nums sm:inline ${app.dossierFocusMode?'text-slate-500':'text-slate-400'}`}>{currentStudentIndex + 1}/{app.schueler.length}</span>
          <button
            type="button"
            onClick={() => switchStudent(nextStudent?.id)}
            disabled={!nextStudent}
            aria-label={nextStudent ? `Nächstes Kind: ${nextStudent.vorname} ${nextStudent.nachname}` : 'Kein nächstes Kind'}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-30 ${app.dossierFocusMode?'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700':'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            <ChevronRight size={14} />
          </button>
          <details className="relative shrink-0">
            <summary className={`cursor-pointer list-none rounded-xl border px-2.5 py-2 text-xs font-semibold ${app.dossierFocusMode?'border-slate-700 bg-slate-800 text-slate-300':'border-slate-200 text-slate-600'}`}>•••</summary>
            <div className="absolute right-0 top-full z-40 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 text-slate-800 shadow-lg">
              <button type="button" onClick={() => exportSchuelerPDF(student.id, app)} className="block w-full rounded-lg p-2 text-left text-xs hover:bg-slate-50">Dossier (PDF)</button>
              <button type="button" onClick={() => setPresentationModeActive(true)} className="block w-full rounded-lg p-2 text-left text-xs hover:bg-slate-50">KEL für Eltern</button>
              <button type="button" onClick={() => { setApp(prev => ({ ...prev, activePrintTemplate: 'schuelerprofil', activePrintStudentId: student.id })); setPage?.('drucken'); }} className="block w-full rounded-lg p-2 text-left text-xs hover:bg-slate-50">Dossier drucken</button>
              <button type="button" onClick={() => setApp(prev => ({...prev,dossierFocusMode:!prev.dossierFocusMode}))} className="block w-full rounded-lg p-2 text-left text-xs font-semibold text-indigo-700 hover:bg-indigo-50">{app.dossierFocusMode?'Fokusmodus beenden':'Fokusmodus starten'}</button>
            </div>
          </details>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className={`flex-1 min-w-0 overflow-hidden lg:overflow-visible ${
        app.dossierFocusMode 
          ? 'bg-white rounded-none border-0 shadow-none p-3 md:p-5' 
          : 'bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 md:p-6'
      } min-h-[70vh] flex flex-col justify-between print:p-0 print:border-none print:shadow-none print:rounded-none`}>
        <div>
          {/* Dossierbereiche: one compact navigation level */}
          {!app.dossierFocusMode && (
          <div data-student-dossier-areas className="mb-4 border-b border-slate-100 pb-3 print:hidden">
              <span className="sr-only">4 Bereiche</span>
              <div
                className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
                role="tablist"
                aria-label="Schülerdossier-Hauptbereiche"
              >
                {getFilteredMainAreas().map((area) => {
                  const isActive = activeMainArea === area.id;
                  const AreaIcon = area.icon;
                  let badgeNode = null;
                  if (area.id === 'lernen_leistungen' && summaryGrade !== null) {
                    badgeNode = <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[0.55rem] font-black text-slate-700">∅ {summaryGrade.toFixed(1)}</span>;
                  } else if (area.id === 'entwicklung_diagnostik' && criticalCount > 0) {
                    badgeNode = <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[0.55rem] font-black text-rose-800">{criticalCount} Bed.</span>;
                  } else if (area.id === 'entwicklung_diagnostik' && totalDiagnosticCount > 0) {
                    badgeNode = <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[0.55rem] font-black text-indigo-800">{totalDiagnosticCount}</span>;
                  } else if (area.id === 'stammdaten_organisation' && totalOpen > 0) {
                    badgeNode = <span className="rounded-full border border-orange-100 bg-orange-50 px-1.5 py-0.5 text-[0.55rem] font-black text-orange-700">{totalOpen.toFixed(0)} €</span>;
                  }

                  return (
                    <button
                      key={area.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => handleSelectArea(area.id)}
                      className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isActive
                          ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <AreaIcon size={14} className={isActive ? 'text-indigo-300' : 'text-slate-400'} />
                      <span>{area.label}</span>
                      {badgeNode}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Compact Focus Mode Bar */}
          {app.dossierFocusMode && (
            <div data-dossier-focus-bar className="mb-4 flex w-full flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-white shadow-lg no-print lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2 text-xs font-black">
                <Sparkles size={14} className="text-indigo-300" />
                <span>Fokusmodus</span>
              </div>
              <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-950/45 p-1 scrollbar-none" role="tablist" aria-label="Fokusmodus-Bereiche">
                {[
                  { id: 'uebersicht', label: 'Übersicht', icon: Sparkles },
                  { id: 'notizen', label: 'Notizen', icon: FileText },
                  { id: 'stats', label: 'Verhalten & Präsenz', icon: Activity },
                  { id: 'kel_reflexion', label: 'KEL', icon: Compass },
                  { id: 'diagnostik', label: 'Diagnostik', icon: Stethoscope },
                  { id: 'foerderprofil', label: 'Förderung', icon: Heart },
                ].map((item) => {
                  const isTabActive = activeTab === item.id;
                  const TabIcon = item.icon;
                  return <button key={item.id} type="button" onClick={() => setActiveTab(item.id as DossierTab)} className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.68rem] font-bold transition ${isTabActive?'bg-indigo-600 text-white':'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}><TabIcon size={12}/><span>{item.label}</span></button>;
                })}
              </div>
            </div>
          )}

          {/* Student identity and primary actions live in the single compact header above. */}

          {/* Unterbereiche des gewählten Dossierbereichs */}
          {!app.dossierFocusMode && activeMainArea !== 'berichte_materialien' && getFilteredSubTabs(activeMainArea).length > 1 && (
            <div className="mb-4 flex items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1.5 scrollbar-none lg:flex-wrap print:hidden" role="tablist" aria-label="Dossier-Unterbereiche">
              {getFilteredSubTabs(activeMainArea).map((subTab) => {
                const isSubActive = isSubTabActive(subTab.id);
                const SubIcon = subTab.icon;
                return (
                  <button
                    key={subTab.id}
                    type="button"
                    role="tab"
                    aria-selected={isSubActive}
                    onClick={() => setActiveTab(subTab.id)}
                    className={`flex min-h-11 items-center gap-1.5 py-2 px-3 rounded-lg text-[0.72rem] leading-tight font-black transition-all cursor-pointer border ${

                      isSubActive
                        ? 'bg-white text-slate-900 shadow-2xs border-slate-200/90'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 border-transparent'
                    }`}
                  >
                    <SubIcon size={14} className={isSubActive ? 'text-indigo-600' : 'text-slate-400'} />
                    <span>{subTab.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {!app.dossierFocusMode && activeMainArea === 'berichte_materialien' && activeTab !== 'mehr' && activeMoreGroup && (
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-1.5 print:hidden">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none lg:flex-wrap" role="tablist" aria-label="Dossier-Unterbereiche">
                <button
                  type="button"
                  onClick={() => setActiveTab('mehr')}
                  className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-transparent px-3 py-2 text-[0.72rem] font-black text-slate-500 transition hover:border-slate-200 hover:bg-white hover:text-slate-900"
                >
                  <ArrowLeft size={14} />
                  <span>Mehr</span>
                </button>
                <span className="hidden h-6 w-px bg-slate-200 sm:block" aria-hidden="true" />
                {activeMoreGroup.tabs.map((tabId) => {
                  const subTab = moreTabById.get(tabId);
                  if (!subTab) return null;
                  const isSubActive = isSubTabActive(tabId);
                  const SubIcon = subTab.icon;
                  return (
                    <button
                      key={tabId}
                      type="button"
                      role="tab"
                      aria-selected={isSubActive}
                      onClick={() => setActiveTab(tabId)}
                      className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-[0.72rem] font-black transition ${isSubActive ? 'border-slate-200 bg-white text-slate-900 shadow-2xs' : 'border-transparent text-slate-600 hover:bg-white/70 hover:text-slate-900'}`}
                    >
                      <SubIcon size={14} className={isSubActive ? 'text-indigo-600' : 'text-slate-400'} />
                      <span>{subTab.shortLabel || subTab.label}</span>
                      {tabId === 'diagnostik' && totalDiagnosticCount > 0 && (
                        <span className={`rounded-full px-1.5 py-0.5 text-[0.58rem] font-black ${criticalCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'}`}>
                          {totalDiagnosticCount}
                        </span>
                      )}
                      {tabId === 'finanzen' && totalOpen > 0 && (
                        <span className="rounded-full bg-orange-50 px-1.5 py-0.5 text-[0.58rem] font-black text-orange-700">
                          {totalOpen.toFixed(0)} €
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Smart Recommendation Prompt Engine */}
          {criticalCount > 0 && ['diagnostik', 'foerderprofil', 'foerderung'].includes(activeTab) && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-start gap-3.5 shadow-3xs">
              <div className="p-2 rounded-xl bg-rose-500 text-white shrink-0 shadow-sm font-black text-[0.75rem] leading-tight select-none">🧪</div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[0.75rem] leading-tight font-black text-rose-950 uppercase tracking-wider">Förderbedarf erkannt ({criticalCount} Tests auffällig)</h4>
                <p className="text-[0.75rem] leading-tight text-rose-700 font-bold mt-1 leading-relaxed">
                  In den Diagnostik-Erhebungen wurden Auffälligkeiten beim Lernen dokumentiert. Es wird empfohlen, unter <button onClick={() => setActiveTab('foerderung')} className="underline font-black text-rose-800 hover:text-rose-900 transition-colors cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-rose-500 rounded px-1">Förderung</button> konkrete didaktische Ziele für {student.vorname} festzulegen.
                </p>
              </div>
            </div>
          )}

          {/* Tab Subcomponent Render Section */}
          <div className="mt-4" id="dossier-tabpanel" role="tabpanel" aria-labelledby={`dossier-tab-${activeTab}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeTab}-${student.id}`}
                initial={{ opacity: 0, y: 7 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -7 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                {activeTab === 'uebersicht' && (
                  <DossierUebersicht
                    student={student}
                    onTabChange={setActiveTab}
                    onSubjectSelect={fach => { setOverviewSubject(fach); setActiveTab('leistungen'); }}
                    semester={sem as '1' | '2'}
                    onQuickEntry={openOverviewQuickEntry}
                  />
                )}
                {activeTab === 'mehr' && (
                  <section className="space-y-4" aria-label="Weitere Dossierbereiche">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                      <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-slate-400">Vertiefung</p>
                      <h2 className="mt-1 text-lg font-black text-slate-900">Weitere Bereiche</h2>
                      <p className="mt-1 max-w-3xl text-sm text-slate-500">
                        Alles, was du nicht für den täglichen Überblick brauchst, ist hier bewusst eine Ebene tiefer gebündelt.
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {MORE_DOSSIER_GROUPS.map(group => {
                        const GroupIcon = group.icon;
                        return (
                          <section key={group.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="mb-3 flex items-start gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                <GroupIcon size={17} />
                              </div>
                              <div>
                                <h3 className="text-sm font-black text-slate-900">{group.label}</h3>
                                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{group.description}</p>
                              </div>
                            </div>
                            <div className="grid gap-2">
                              {group.tabs.map(tabId => {
                                const tab = moreTabById.get(tabId);
                                if (!tab) return null;
                                const TabIcon = tab.icon;
                                return (
                                  <button
                                    key={tabId}
                                    type="button"
                                    onClick={() => setActiveTab(tabId)}
                                    className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-left transition hover:border-slate-200 hover:bg-white"
                                  >
                                    <TabIcon size={15} className="shrink-0 text-indigo-600" />
                                    <span className="min-w-0 flex-1">
                                      <span className="block text-xs font-black text-slate-800">{tab.label}</span>
                                      {tab.description && <span className="mt-0.5 block text-[0.68rem] leading-relaxed text-slate-500">{tab.description}</span>}
                                    </span>
                                    <ChevronRight size={14} className="shrink-0 text-slate-300" />
                                  </button>
                                );
                              })}
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  </section>
                )}
                {activeTab === 'entwicklungsuebersicht' && (
                  <DossierEntwicklungsuebersicht
                    student={student}
                    onTabChange={setActiveTab}
                  />
                )}
                {activeTab === 'diagnostik' && (
                  <DossierDiagnostik
                    student={student}
                    onNavigateTab={tab => setActiveTab(tab === 'foerderprofil' ? 'foerderung' : tab)}
                    onTabChange={setActiveTab}
                  />
                )}
                {(activeTab === 'foerderung' || activeTab === 'foerderprofil') && (
                  <DossierFoerderung
                    student={student}
                    onNavigateToDiagnostics={() => setActiveTab('diagnostik')}
                    onTabChange={setActiveTab}
                    initialAddGoal={pendingQuickEntry === 'goal'}
                    initialFocusStrength={pendingQuickEntry === 'strength'}
                    onQuickEntryConsumed={() => setPendingQuickEntry(null)}
                  />
                )}
                {(activeTab === 'beobachtungen_verlauf' || activeTab === 'stats' || activeTab === 'kel_reflexion') && (
                  <DossierBeobachtungenVerlauf
                    student={student}
                    initialSubSection={activeTab === 'kel_reflexion' ? 'kel' : 'verhalten'}
                    initialQuickNoteCategory={pendingQuickEntry === 'parent' ? 'Eltern' : pendingQuickEntry === 'note' ? 'Notiz' : undefined}
                    onQuickEntryConsumed={() => setPendingQuickEntry(null)}
                  />
                )}
                {activeTab === 'entwicklungslisten' && (
                  <DossierDevelopmentLists studentId={student.id} />
                )}
                {activeTab === 'stammdaten' && <DossierStammdaten student={student} />}
                {activeTab === 'kontakte_einwilligungen' && <DossierKontakteEinwilligungen student={student} />}
                {activeTab === 'finanzen' && <DossierFinanzen student={student} />}
                {(activeTab === 'berichte' || activeTab === 'ki_summary' || activeTab === 'eltern_report') && (
                  <DossierBerichte 
                    student={student} 
                    initialSubView={activeTab === 'eltern_report' ? 'eltern_report' : initialReportView && activeTab === 'berichte' ? 'jahresbericht' : 'ki_summary'}
                    onStartPresentation={() => setPresentationModeActive(true)}
                    semester={sem}
                    onSemesterChange={changeSemester}
                  />
                )}
                {activeTab === 'leistungen' && (
                  <DossierLeistungen
                    initialSubject={overviewSubject}
                    student={student}
                    semester={sem}
                    onSemesterChange={changeSemester}
                    onNavigateTab={(tab, payload) => {
                      if (payload?.fach) setLernzieleInitialFach(payload.fach);
                      setActiveTab(tab as DossierTab);
                    }}
                  />
                )}
                {activeTab === 'leistungsfeedback' && (
                  <VerbalAssessment mode="feedback" initialStudentId={student.id} initialSemester={sem} onBack={() => setActiveTab('leistungen')} />
                )}
                {activeTab === 'antolin' && <AntolinBereich studentId={student.id} />}
                {activeTab === 'portfolio' && <StudentPortfolio key={student.id} schuelerId={student.id} />}
                {activeTab === 'lernziel_erlaeuterung' && (
                  <DossierLernzielErlaeuterung student={student} semester={sem} onSemesterChange={changeSemester} />
                )}
                {activeTab === 'mika_d' && (
                  <DossierMikaD
                    student={student}
                    onNavigateTab={(tab) => setActiveTab(tab as DossierTab)}
                  />
                )}
                {(activeTab === 'beurteilung_gespraeche' || activeTab === 'erlaeuterung') && (
                  <DossierGespraecheBeurteilungen
                    student={student}
                    semester={sem}
                    onSemesterChange={changeSemester}
                  />
                )}
                {activeTab === 'lernziele' && (
                  <StudentLernziele
                    schuelerId={student.id}
                    initialSubject={lernzieleInitialFach}
                    onOpenSupportProfile={() => setActiveTab('foerderung')}
                    onNavigateTab={(tab) => setActiveTab(tab as DossierTab)}
                    semester={sem}
                    onSemesterChange={changeSemester}
                  />
                )}
                {(activeTab === 'materialien' || activeTab === 'arbeitsblatt') && (
                  <DossierMaterialien student={student} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* KEL PRESENTATION MODE OVERLAY */}
      <AnimatePresence>
        {presentationModeActive && (
          <ModalPortal>
            <KELPresentation
              student={student}
              app={app}
              sem={sem}
              activeFaecher={activeFaecher}
              onClose={() => setPresentationModeActive(false)}
              getAttendanceStats={getAttendanceStats}
              berechne={berechne}
              STANDARD_KEL_BEREICHE={STANDARD_KEL_BEREICHE}
            />
          </ModalPortal>
        )}
      </AnimatePresence>
    </div>
  );
}
