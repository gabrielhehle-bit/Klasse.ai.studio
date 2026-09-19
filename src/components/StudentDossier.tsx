import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  User, Sparkles, BarChart3, Heart, Target, Activity, 
  Stethoscope, GraduationCap, Banknote, FileText, ChevronRight, ChevronDown,
  ArrowLeft, Download, Printer, Clock, Save, Edit3, Trash2, Award, ClipboardList,
  AlertCircle, Compass, Maximize2, Minimize2, Calendar, Shield, CheckCircle2,
  BookOpen, Phone, ListChecks
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { exportSchuelerPDF } from '../lib/exportService';
import { berechne } from '../lib/GradeUtils';
import { FAECHER_ALLE } from '../constants';
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
import StudentPortfolio from './StudentPortfolio';
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
}

export type MainAreaId = 
  | 'uebersicht'
  | 'lernen_leistungen'
  | 'entwicklung_diagnostik'
  | 'stammdaten_organisation'
  | 'berichte_materialien';

export type DossierTab = 
  | 'uebersicht'
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
  | 'portfolio'
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
  {
    id: 'uebersicht',
    label: 'Übersicht',
    subtitle: 'Auf einen Blick & Profil',
    icon: Sparkles,
    defaultTab: 'uebersicht',
    tabs: [
      { id: 'uebersicht', label: 'Übersicht', shortLabel: 'Übersicht', icon: Sparkles, description: 'Zentrale Gesamtschau des Kindes' }
    ]
  },
  {
    id: 'lernen_leistungen',
    label: 'Lernen & Leistungen',
    subtitle: 'Leistungsübersicht, Lernziele & Sprachstand',
    icon: BarChart3,
    defaultTab: 'leistungen',
    tabs: [
      { id: 'leistungen', label: 'Leistungsübersicht', shortLabel: 'Leistungen', icon: BarChart3, description: 'Kompakte fachliche Gesamtschau und Leistungsdaten' },
      { id: 'lernziele', label: 'Lernziele & Kompetenzen', shortLabel: 'Lernziele', icon: Target, description: 'Lehrplan-Kompetenzen und erreichte Teilziele' },
      { id: 'portfolio', label: 'Portfolio', shortLabel: 'Portfolio', icon: BookOpen, description: 'Arbeiten, Fotos und echte individuelle Lernnachweise' },
      { id: 'mika_d', label: 'Sprachstand', shortLabel: 'Sprachstand', icon: GraduationCap, description: 'MIKA-D Sprachstandsfeststellung' },
    ]
  },
  {
    id: 'entwicklung_diagnostik',
    label: 'Entwicklung & Diagnostik',
    subtitle: 'Entwicklungsübersicht, Diagnostik, Förderung & Verlauf',
    icon: Activity,
    defaultTab: 'entwicklungsuebersicht',
    tabs: [
      { id: 'entwicklungsuebersicht', label: 'Entwicklungsübersicht', shortLabel: 'Übersicht', icon: Compass, description: 'Pädagogischer Gesamtblick, Stärken und Beobachtungsschwerpunkte' },
      { id: 'diagnostik', label: 'Diagnostik', shortLabel: 'Diagnostik', icon: Stethoscope, description: 'Kompetenzchecks & Erfassung von Lernvoraussetzungen' },
      { id: 'foerderung', label: 'Förderung', shortLabel: 'Förderung', icon: Heart, description: 'Aktive Förderziele, pädagogische Maßnahmen und Stärken' },
      { id: 'beobachtungen_verlauf', label: 'Beobachtungen & Verlauf', shortLabel: 'Beobachtungen & Verlauf', icon: Clock, description: 'Pädagogische Notizen, Verhaltensverlauf, Anwesenheit und KEL' },
      { id: 'entwicklungslisten', label: 'Entwicklungslisten', shortLabel: 'Entwicklungslisten', icon: ListChecks, description: 'Fortlaufende individuelle Verläufe wie Antolin, Lautlesen und Förderung' },
    ]
  },
  {
    id: 'stammdaten_organisation',
    label: 'Stammdaten & Organisation',
    subtitle: 'Stammdaten, Kontakte & Finanzen',
    icon: User,
    defaultTab: 'stammdaten',
    tabs: [
      { id: 'stammdaten', label: 'Stammdaten', shortLabel: 'Stammdaten', icon: User, description: 'Personenstandsdaten und schulische Zuordnung' },
      { id: 'kontakte_einwilligungen', label: 'Kontakte & Einwilligungen', shortLabel: 'Kontakte & Einwilligungen', icon: Phone, description: 'Erziehungsberechtigte und Fotoerlaubnis' },
      { id: 'finanzen', label: 'Finanzen & Organisation', shortLabel: 'Finanzen & Organisation', icon: Banknote, description: 'Klassenkasse, Beiträge und Zahlungsstatus' },
    ]
  },
  {
    id: 'berichte_materialien',
    label: 'Berichte & Materialien',
    subtitle: 'Berichte, Beurteilungen & Materialien',
    icon: FileText,
    defaultTab: 'berichte',
    tabs: [
      { id: 'berichte', label: 'Berichte', shortLabel: 'Berichte', icon: FileText, description: 'KI-Zusammenfassung, Eltern-Report & Exporte' },
      { id: 'beurteilung_gespraeche', label: 'Gespräche & Beurteilungen', shortLabel: 'Gespräche & Beurteilungen', icon: Award, description: 'Erläuterungsmatrix & Gesprächsvorbereitung' },
      { id: 'materialien', label: 'Materialien', shortLabel: 'Materialien', icon: BookOpen, description: 'Individuelles Fördermaterial & Arbeitsblätter' },
    ]
  }
];

export const getActiveMainArea = (tab: DossierTab): MainAreaId => {
  for (const area of MAIN_AREAS) {
    if (area.tabs.some(t => t.id === tab)) {
      return area.id;
    }
  }
  if (tab === 'foerderprofil' || tab === 'stats' || tab === 'kel_reflexion' || tab === 'notizen') return 'entwicklung_diagnostik';
  if (tab === 'prep' || tab === 'ki_summary' || tab === 'eltern_report' || tab === 'erlaeuterung' || tab === 'arbeitsblatt') return 'berichte_materialien';
  return 'uebersicht';
};

export default function StudentDossier({ schuelerId, onBack, onStudentChange }: StudentDossierProps) {
  const { app, setApp, setPage } = useApp();
  const student = app.schueler.find(s => s.id === schuelerId);
  
  // Always start with 'uebersicht'
  const [activeTab, setActiveTab] = useState<DossierTab>('uebersicht');
  const [pendingQuickEntry, setPendingQuickEntry] = useState<'note' | 'strength' | 'parent' | 'goal' | null>(null);

  const openOverviewQuickEntry = (type: 'note' | 'strength' | 'parent' | 'goal') => {
    setPendingQuickEntry(type);
    setActiveTab(type === 'goal' || type === 'strength' ? 'foerderung' : 'beobachtungen_verlauf');
  };

  // Reset activeTab to 'uebersicht' whenever student changes
  useEffect(() => {
    setActiveTab('uebersicht');
    setPendingQuickEntry(null);
  }, [schuelerId]);

  const activeMainArea = getActiveMainArea(activeTab);

  const [presentationModeActive, setPresentationModeActive] = useState<boolean>(false);
  const [sem, setSem] = useState<'1' | '2'>('1');
  const changeSemester = (nextSemester: '1' | '2') => {
    setSem(nextSemester);
  };
  const activeFaecher = FAECHER_ALLE.filter(f => !app.faecher || app.faecher.includes(f));

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
    if (targetArea.tabs.some(tab => tab.id === activeTab)) return;
    setActiveTab(targetArea.defaultTab);
  };

  const getFilteredSubTabs = (areaId: MainAreaId) => {
    const area = MAIN_AREAS.find(a => a.id === areaId);
    return area?.tabs || [];
  };

  const getFilteredMainAreas = () => MAIN_AREAS;

  // Helper metric calculations 
  const gradeSummary = getStudentGradeSummary(app, student.id, activeFaecher, sem);
  const summaryGrade = gradeSummary.average;
  const behaviorSummary = getStudentBehaviorSummary(app, student.id);
  const behaviorLogsCount = behaviorSummary.logs.length;
  const notesCount = getStudentNotes(app, student.id).length;
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
      {/* COMPACT STUDENT NAVIGATION */}
      {!app.dossierFocusMode && (
        <div className="print:hidden flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                title="Zur Schülerauswahl"
              >
                <ArrowLeft size={15} />
              </button>
            )}
            <div className="min-w-0">
              <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-slate-400">Schülerdossier</p>
              <p className="truncate text-sm font-black text-slate-900">
                {student.vorname} {student.nachname}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-xl sm:justify-end">
            <button
              type="button"
              onClick={() => switchStudent(previousStudent?.id)}
              disabled={!previousStudent}
              aria-label={previousStudent
                ? `Vorheriges Kind: ${previousStudent.vorname} ${previousStudent.nachname}`
                : 'Kein vorheriges Kind'}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ArrowLeft size={14} />
            </button>

            <div className="relative min-w-0 flex-1 sm:max-w-sm">
              <select
                id="student-switcher"
                value={student.id}
                onChange={(e) => onStudentChange && onStudentChange(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-9 text-xs font-black text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                disabled={!onStudentChange}
              >
                {app.schueler.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.vorname} {s.nachname}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <span className="hidden text-[0.65rem] font-black tabular-nums text-slate-400 sm:inline">
              {currentStudentIndex + 1}/{app.schueler.length}
            </span>

            <button
              type="button"
              onClick={() => switchStudent(nextStudent?.id)}
              disabled={!nextStudent}
              aria-label={nextStudent
                ? `Nächstes Kind: ${nextStudent.vorname} ${nextStudent.nachname}`
                : 'Kein nächstes Kind'}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className={`flex-1 min-w-0 overflow-hidden lg:overflow-visible ${
        app.dossierFocusMode 
          ? 'bg-white rounded-none border-0 shadow-none p-4 md:p-8' 
          : 'bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 md:p-6'
      } min-h-[70vh] flex flex-col justify-between print:p-0 print:border-none print:shadow-none print:rounded-none`}>
        <div>
          {/* Dossierbereiche: one compact navigation level */}
          {!app.dossierFocusMode && (
            <div className="mb-5 border-b border-slate-100 pb-4 print:hidden">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-slate-400">Dossierbereiche</p>
                <span className="text-[0.62rem] font-bold text-slate-400">5 Bereiche</span>
              </div>
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
                      className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
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

          {/* Interactive Focus Mode Header Bar */}
          {app.dossierFocusMode && (
            <div className="w-full bg-slate-900 text-white rounded-3xl p-4 md:p-5 mb-8 flex flex-col xl:flex-row xl:items-center justify-between gap-5 shadow-2xl border border-slate-800 animate-in fade-in slide-in-from-top-4 duration-300 no-print">
              <div className="flex flex-wrap items-center justify-between xl:justify-start gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/20">
                    <Sparkles size={18} className="animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-[0.9375rem] font-black tracking-tight flex items-center gap-2 text-white leading-tight">
                      <span>Fokus-Modus</span>
                      <span className="text-[0.5625rem] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Aktiv</span>
                    </h2>
                    <p className="text-[0.6875rem] text-slate-400 font-semibold mt-0.5">Mühelose Bearbeitung von Schülerbeobachtungen</p>
                  </div>
                </div>

                {/* Quick Switcher inside Focus Mode */}
                {onStudentChange && (
                  <div className="flex items-center gap-2.5 pl-4 border-l border-slate-800">
                    <span className="hidden sm:inline text-[0.6875rem] text-slate-450 font-bold uppercase tracking-wider">Schülerin/Schüler:</span>
                    <button
                      type="button"
                      onClick={() => switchStudent(previousStudent?.id)}
                      disabled={!previousStudent}
                      aria-label={previousStudent
                        ? `Vorheriges Kind: ${previousStudent.vorname} ${previousStudent.nachname}`
                        : 'Kein vorheriges Kind'}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowLeft size={13} />
                    </button>
                    <select
                      value={student.id}
                      onChange={(e) => onStudentChange(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-white text-[0.75rem] font-black rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {app.schueler.map(s => (
                        <option key={s.id} value={s.id}>{s.nachname} {s.vorname}</option>
                      ))}
                    </select>
                    <span className="text-[0.65rem] font-black tabular-nums text-slate-500">
                      {currentStudentIndex + 1}/{app.schueler.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => switchStudent(nextStudent?.id)}
                      disabled={!nextStudent}
                      aria-label={nextStudent
                        ? `Nächstes Kind: ${nextStudent.vorname} ${nextStudent.nachname}`
                        : 'Kein nächstes Kind'}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* Segmented control for the tabs in Focus Mode */}
              <div className="flex flex-wrap gap-1 bg-slate-950/45 p-1 rounded-xl border border-slate-850 max-w-full overflow-x-auto scrollbar-none">
                {[
                  { id: 'uebersicht', label: 'Übersicht', icon: Sparkles },
                  { id: 'notizen', label: 'Notizen & Beobachtungen', icon: FileText },
                  { id: 'stats', label: 'Verhalten & Präsenz', icon: Activity },
                  { id: 'kel_reflexion', label: 'KEL Selbstreflexion', icon: Compass },
                  { id: 'diagnostik', label: 'Päd. Diagnostik', icon: Stethoscope },
                  { id: 'foerderprofil', label: 'Förderplan', icon: Heart },
                ].map((item) => {
                  const isTabActive = activeTab === item.id;
                  const TabIcon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id as DossierTab)}
                      className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-[0.6875rem] font-bold transition-all cursor-pointer whitespace-nowrap ${
                        isTabActive 
                          ? 'bg-indigo-600 text-white shadow-sm font-black' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <TabIcon size={12} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Exit Focus Mode Button */}
              <button
                type="button"
                onClick={() => {
                  setApp(prev => ({
                    ...prev,
                    dossierFocusMode: false
                  }));
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 hover:text-white text-slate-300 rounded-xl text-[0.6875rem] leading-tight font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-slate-700 cursor-pointer"
                title="Fokus-Modus beenden"
              >
                <Minimize2 size={13} />
                <span>Fokus Beenden</span>
              </button>
            </div>
          )}

          {/* Profile Hero Header Card */}
          {!app.dossierFocusMode && (
            <div className={`${activeTab === 'uebersicht' ? 'mb-4 px-3 py-3 sm:px-4' : 'mb-5 px-4 py-4 sm:px-5'} bg-slate-50/70 border ${isBirthdayToday ? 'border-pink-200' : 'border-slate-200'} rounded-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 transition-all relative`}>
              
              {isBirthdayToday && (
                <div className="absolute top-0 right-0 w-28 h-28 bg-pink-500/5 rounded-full blur-2xl pointer-events-none select-none" />
              )}

              <div className="flex items-center gap-4 sm:gap-5">
                {student.foto ? (
                  <img src={student.foto} alt="" className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover ring-2 ${isBirthdayToday ? 'ring-pink-300' : 'ring-slate-200'} shadow-sm object-top`} referrerPolicy="no-referrer" />
                ) : (
                  <div className={`${activeTab === 'uebersicht' ? 'w-10 h-10 sm:w-12 sm:h-12 text-base' : 'w-14 h-14 sm:w-16 sm:h-16'} rounded-2xl bg-slate-100 border border-slate-200/80 text-slate-700 flex items-center justify-center text-xl font-black shadow-inner`}>
                    {student.vorname.charAt(0)}{student.nachname.charAt(0)}
                  </div>
                )}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className={`${activeTab === 'uebersicht' ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'} font-black text-slate-900 tracking-tight leading-tight flex items-center gap-2`}>
                      <span>{student.vorname} {student.nachname}</span>
                      {isBirthdayToday && (
                        <span className="inline-block text-lg" title="Geburtstagskind!">🎉</span>
                      )}
                    </h1>
                    <div className="flex gap-1.5 flex-wrap">
                      {isBirthdayToday && (
                        <span className="px-2 py-0.5 rounded-lg bg-pink-100 text-pink-700 font-extrabold text-[0.6rem] uppercase tracking-wider">
                          Geburtstag
                        </span>
                      )}
                      {isSpf && (
                        <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-600 font-extrabold text-[0.6rem] uppercase tracking-wider border border-rose-200" title="Sonderpädagogischer Förderbedarf">
                          SPF
                        </span>
                      )}
                      {isEspf && (
                        <span className="px-2 py-0.5 rounded-lg bg-cyan-50 text-cyan-700 font-extrabold text-[0.6rem] uppercase tracking-wider border border-cyan-200" title="Außerordentlicher Status">
                          ESPF
                        </span>
                      )}
                      {isDaz && (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 font-extrabold text-[0.6rem] uppercase tracking-wider border border-amber-200" title="Deutsch als Zweitsprache">
                          DAZ
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-semibold">
                    <span>
                      Klasse: <strong className="font-black text-slate-700">{[app.stufe ? `${app.stufe}.` : '', app.klassenbezeichnung].filter(Boolean).join(' ') || 'nicht erfasst'}</strong>
                    </span>
                    <span className="text-slate-300">·</span>
                    <span>Geschlecht: {getStudentGenderLabel(student.geschlecht)}</span>
                    {student.besuchsjahr && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span>{student.besuchsjahr}. Schulbesuchsjahr</span>
                      </>
                    )}
                    <span className="text-slate-300">·</span>
                    <span>Schuljahr: {app.schuljahr || 'nicht erfasst'}</span>
                    {(student.geburtstag || student.geburtsdatum) && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span>
                          {student.geburtstag?.includes('-')
                            ? student.geburtstag.split('-').reverse().join('.')
                            : (student.geburtstag || student.geburtsdatum)}
                          {(() => {
                            const dateStr = student.geburtstag || student.geburtsdatum;
                            if (!dateStr) return null;
                            const parts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('.');
                            let bDate: Date;
                            if (dateStr.includes('-')) {
                              bDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                            } else {
                              bDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
                            }
                            if (isNaN(bDate.getTime())) return null;
                            const ageDiff = Date.now() - bDate.getTime();
                            const age = Math.floor(ageDiff / (1000 * 60 * 60 * 24 * 365.25));
                            return age > 0 && age < 30 ? ` (${age} Jahre)` : null;
                          })()}
                        </span>
                      </>
                    )}
                    {student.niveau !== null && student.niveau !== undefined && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.65rem] font-bold text-slate-600">Niveau {student.niveau}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch lg:self-auto justify-start lg:justify-end flex-wrap">
                {/* primary action: KEL Presentation */}
                <button
                  type="button"
                  onClick={() => setPresentationModeActive(true)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                  title="KEL-Präsentationsmodus starten"
                >
                  <span>🖥️</span>
                  <span>KEL für Eltern</span>
                </button>

                {/* export and print button group */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button 
                    type="button"
                    onClick={() => exportSchuelerPDF(student.id, app)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                    title="Gesamtes Dossier als PDF exportieren"
                  >
                    <Download size={13} className="text-indigo-600" />
                    <span>Dossier (PDF)</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => {
                      setApp(prev => ({
                        ...prev,
                        activePrintTemplate: 'schuelerprofil',
                        activePrintStudentId: student.id
                      }));
                      setPage?.('drucken');
                    }}
                    className="p-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/80 rounded-lg transition-all shadow-2xs active:scale-95 cursor-pointer"
                    title="Dossier/Bericht drucken"
                  >
                    <Printer size={14} />
                  </button>
                </div>

                {/* view controls */}
                <div className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">

                  <button
                    type="button"
                    onClick={() => {
                      setApp(prev => ({
                        ...prev,
                        dossierFocusMode: true
                      }));
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200/80 rounded-xl text-[0.72rem] leading-tight font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                    title="Fokus-Modus aktivieren"
                  >
                    <Maximize2 size={12} className="text-slate-500" />
                    <span>Fokus</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Unterbereiche des gewählten Dossierbereichs */}
          {!app.dossierFocusMode && getFilteredSubTabs(activeMainArea).length > 1 && (
            <div className="mb-5 flex items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1.5 scrollbar-none lg:flex-wrap print:hidden" role="tablist" aria-label="Dossier-Unterbereiche">
              {getFilteredSubTabs(activeMainArea).map((subTab) => {
                const isSubActive = activeTab === subTab.id ||
                  (subTab.id === 'foerderung' && activeTab === 'foerderprofil') ||
                  (subTab.id === 'beobachtungen_verlauf' && (activeTab === 'stats' || activeTab === 'kel_reflexion' || activeTab === 'notizen')) ||
                  (subTab.id === 'berichte' && (activeTab === 'ki_summary' || activeTab === 'eltern_report')) ||
                  (subTab.id === 'beurteilung_gespraeche' && activeTab === 'erlaeuterung') ||
                  (subTab.id === 'materialien' && activeTab === 'arbeitsblatt');
                const SubIcon = subTab.icon;
                return (
                  <button
                    key={subTab.id}
                    type="button"
                    role="tab"
                    aria-selected={isSubActive}
                    onClick={() => setActiveTab(subTab.id)}
                    className={`flex items-center gap-1.5 py-2 px-3 rounded-lg text-[0.72rem] leading-tight font-black transition-all cursor-pointer border ${

                      isSubActive
                        ? 'bg-white text-slate-900 shadow-2xs border-slate-200/90'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 border-transparent'
                    }`}
                  >
                    <SubIcon size={14} className={isSubActive ? 'text-indigo-600' : 'text-slate-400'} />
                    <span>{subTab.label}</span>
                    
                    {/* Sub-tab-specific badges */}
                    {subTab.id === 'notizen' && notesCount > 0 && (
                      <span className={`text-[0.59375rem] font-black px-1.5 py-0.5 rounded-full ${isSubActive ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-700'}`}>
                        {notesCount}
                      </span>
                    )}
                    {subTab.id === 'stats' && behaviorLogsCount > 0 && (
                      <span className={`text-[0.59375rem] font-black px-1.5 py-0.5 rounded-full ${isSubActive ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-700'}`}>
                        {behaviorLogsCount}
                      </span>
                    )}
                    {subTab.id === 'diagnostik' && totalDiagnosticCount > 0 && (
                      <span className={`text-[0.59375rem] font-black px-1.5 py-0.5 rounded-full ${isSubActive ? 'bg-indigo-100 text-indigo-800' : (criticalCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700')}`}>
                        {totalDiagnosticCount}
                      </span>
                    )}
                    {subTab.id === 'finanzen' && totalOpen > 0 && (
                      <span className={`text-[0.59375rem] font-black px-1.5 py-0.5 rounded-full ${isSubActive ? 'bg-orange-100 text-orange-800' : 'bg-orange-50 text-orange-600'}`}>
                        {totalOpen.toFixed(0)} €
                      </span>
                    )}
                  </button>
                );
              })}
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
                    semester={sem as '1' | '2'}
                    onQuickEntry={openOverviewQuickEntry}
                  />
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
                    initialSubSection={activeTab === 'kel_reflexion' ? 'kel' : activeTab === 'stats' ? 'verhalten' : 'beobachtungen'}
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
                    initialSubView={activeTab === 'eltern_report' ? 'eltern_report' : 'ki_summary'}
                    onStartPresentation={() => setPresentationModeActive(true)}
                    semester={sem}
                    onSemesterChange={changeSemester}
                  />
                )}
                {activeTab === 'leistungen' && (
                  <DossierLeistungen
                    student={student}
                    semester={sem}
                    onSemesterChange={changeSemester}
                    onNavigateTab={(tab, payload) => {
                      if (payload?.fach) setLernzieleInitialFach(payload.fach);
                      setActiveTab(tab as DossierTab);
                    }}
                  />
                )}
                {activeTab === 'portfolio' && <StudentPortfolio key={student.id} schuelerId={student.id} />}
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
