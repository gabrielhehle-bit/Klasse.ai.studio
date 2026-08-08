import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  User, Sparkles, BarChart3, Heart, Target, Activity, 
  Stethoscope, GraduationCap, Banknote, FileText, ChevronRight, ChevronDown,
  ArrowLeft, Download, Printer, Clock, Save, Edit3, Trash2, Award, ClipboardList,
  AlertCircle, Compass, Maximize2, Minimize2, Calendar, Shield, CheckCircle2,
  SlidersHorizontal, BookOpen
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

// Sub-components (to be created)
import DossierStammdaten from './dossier/DossierStammdaten';
import DossierUebersicht from './dossier/DossierUebersicht';
import DossierKIPortfolio from './dossier/DossierKIPortfolio';
import DossierLeistungen from './dossier/DossierLeistungen';
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

type DossierTab = 
  | 'uebersicht'
  | 'stammdaten' 
  | 'ki_summary'
  | 'notizen'
  | 'prep'
  | 'leistungen' 
  | 'foerderprofil' 
  | 'diagnostik' 
  | 'mika_d' 
  | 'finanzen' 
  | 'stats'
  | 'erlaeuterung'
  | 'lernziele'
  | 'arbeitsblatt'
  | 'eltern_report'
  | 'kel_reflexion';

export default function StudentDossier({ schuelerId, onBack, onStudentChange }: StudentDossierProps) {
  const { app, setApp, setPage } = useApp();
  const student = app.schueler.find(s => s.id === schuelerId);
  const [activeTab, setActiveTab] = useState<DossierTab>('uebersicht');

  const [expandedSections, setExpandedSections] = useState<Record<MainTab, boolean>>({
    ueberblick: true,
    lernen: true,
    entwicklung: true,
    organisation: true
  });

  // Auto-expand the main category containing the active tab
  useEffect(() => {
    const mainTab = getActiveMainTab(activeTab);
    setExpandedSections(prev => ({
      ...prev,
      [mainTab]: true
    }));
  }, [activeTab]);
  const [presentationModeActive, setPresentationModeActive] = useState<boolean>(false);
  const [sem, setSem] = useState<'1' | '2'>(() =>
    new URLSearchParams(window.location.search).get('yearly-final') === '2' ? '2' : '1'
  );
  const changeSemester = (nextSemester: '1' | '2') => {
    setSem(nextSemester);
    const url = new URL(window.location.href);
    url.searchParams.set('yearly-final', nextSemester);
    window.history.replaceState(window.history.state, '', url);
  };
  const activeFaecher = FAECHER_ALLE.filter(f => !app.faecher || app.faecher.includes(f));

  // Mode and Custom Visibility states
  const [dossierMode, setDossierMode] = useState<'einfach' | 'experte'>(() => {
    return (localStorage.getItem('dossier_mode') as 'einfach' | 'experte') || 'einfach';
  });

  const [customVisibleTabs, setCustomVisibleTabs] = useState<Record<DossierTab, boolean>>(() => {
    try {
      const saved = localStorage.getItem('dossier_custom_visible_tabs');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    
    return {
      uebersicht: true,
      stammdaten: true,
      finanzen: true,
      leistungen: true,
      mika_d: true,
      stats: true,
      kel_reflexion: true,
      ki_summary: true,
      diagnostik: true,
      foerderprofil: true,
      erlaeuterung: true,
      lernziele: true,
      arbeitsblatt: true,
      eltern_report: true,
    } as Record<DossierTab, boolean>;
  });

  const [showVisibilityModal, setShowVisibilityModal] = useState(false);

  const EINFACH_TABS: DossierTab[] = [
    'uebersicht',
    'leistungen',
    'diagnostik',
    'stats',
    'lernziele',
    'kel_reflexion',
    'stammdaten',
    'eltern_report'
  ];

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
    if (targetId && onStudentChange) onStudentChange(targetId);
  };

  const studentErhebungen = getValidStudentDiagnostics(app, student.id);
  const criticalCount = studentErhebungen.filter(isDiagnosticAlert).length;

  type MainTab = 'ueberblick' | 'lernen' | 'entwicklung' | 'organisation';

  const MAIN_TABS = [
    {
      id: 'ueberblick' as MainTab,
      label: 'Überblick',
      subtitle: 'Lernstand & Elternansicht',
      icon: Sparkles,
      defaultSubTab: 'uebersicht' as DossierTab
    },
    {
      id: 'lernen' as MainTab,
      label: 'Lernen & Diagnostik',
      subtitle: 'Leistungen, Tests & Sprache',
      icon: BarChart3,
      defaultSubTab: 'leistungen' as DossierTab
    },
    {
      id: 'entwicklung' as MainTab,
      label: 'Entwicklung & Ziele',
      subtitle: 'Beobachtung, KEL & Förderung',
      icon: Target,
      defaultSubTab: 'stats' as DossierTab
    },
    {
      id: 'organisation' as MainTab,
      label: 'Organisation',
      subtitle: 'Stammdaten, Kontakt & Finanzen',
      icon: User,
      defaultSubTab: 'stammdaten' as DossierTab
    },
  ];

  const SUB_TABS: Record<MainTab, { id: DossierTab; label: string; icon: React.ComponentType<{ size: number; className?: string }> }[]> = {
    ueberblick: [
      { id: 'uebersicht', label: 'Pädagogischer Überblick', icon: Sparkles },
      { id: 'eltern_report', label: 'Eltern-Report', icon: Printer },
    ],
    lernen: [
      { id: 'leistungen', label: 'Noten & Schnitt', icon: BarChart3 },
      { id: 'mika_d', label: 'MIKA-D Sprachbewertung', icon: GraduationCap },
      { id: 'diagnostik', label: 'Pädagogische Diagnostik', icon: Stethoscope },
      { id: 'erlaeuterung', label: 'Erläuterungsmatrix', icon: Award },
    ],
    entwicklung: [
      { id: 'stats', label: 'Beobachtung & Präsenz', icon: Activity },
      { id: 'kel_reflexion', label: 'KEL-Entwicklung', icon: Compass },
      { id: 'lernziele', label: 'Lehrplan-Lernziele', icon: Target },
      { id: 'foerderprofil', label: 'Individuelle Förderung', icon: Heart },
      { id: 'ki_summary', label: 'Pädagogischer Bericht', icon: Sparkles },
      { id: 'arbeitsblatt', label: 'Individuelles Fördermaterial', icon: FileText },
    ],
    organisation: [
      { id: 'stammdaten', label: 'Stammdaten & Kontakt', icon: User },
      { id: 'finanzen', label: 'Klassenkasse & Finanzen', icon: Banknote },
    ],
  };

  const getActiveMainTab = (tab: DossierTab): MainTab => {
    if (SUB_TABS.ueberblick.some(t => t.id === tab)) return 'ueberblick';
    if (SUB_TABS.lernen.some(t => t.id === tab)) return 'lernen';
    if (SUB_TABS.entwicklung.some(t => t.id === tab)) return 'entwicklung';
    return 'organisation';
  };

  const activeMainTab = getActiveMainTab(activeTab);

  const isTabVisible = (tabId: DossierTab): boolean => {
    if (tabId === 'uebersicht') return true;
    const customVisible = customVisibleTabs[tabId] !== false;
    if (dossierMode === 'einfach') {
      return EINFACH_TABS.includes(tabId) && customVisible;
    }
    return customVisible;
  };

  const getFilteredSubTabs = (mainTabId: MainTab) => {
    return SUB_TABS[mainTabId].filter(subTab => isTabVisible(subTab.id));
  };

  const getFilteredMainTabs = () => {
    return MAIN_TABS.filter(mainTab => {
      const subtabs = getFilteredSubTabs(mainTab.id);
      return subtabs.length > 0;
    });
  };

  // Adjust active tab if it gets hidden
  useEffect(() => {
    if (!isTabVisible(activeTab)) {
      const allTabs: DossierTab[] = [
        'uebersicht', 'stammdaten', 'finanzen', 'leistungen', 
        'mika_d', 'stats', 'kel_reflexion', 'ki_summary', 
        'diagnostik', 'foerderprofil', 'erlaeuterung', 
        'lernziele', 'arbeitsblatt', 'eltern_report'
      ];
      const visibleFallback = allTabs.find(t => isTabVisible(t)) || 'uebersicht';
      setActiveTab(visibleFallback);
    }
  }, [activeTab, dossierMode, customVisibleTabs]);

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
        : 'max-w-none w-full flex flex-col lg:flex-row gap-4 lg:gap-5 xl:gap-6 min-h-[85vh] pb-20 px-2 sm:px-4 lg:px-6 xl:px-8'
    } animate-in fade-in slide-in-from-bottom-4 duration-500`}>
      {/* SIDEBAR NAVIGATION */}
      {!app.dossierFocusMode && (
        <div className="lg:w-64 xl:w-72 flex flex-col gap-5 shrink-0 min-w-0 print:hidden">
        {/* Profile Navigator Mini Card */}
        <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-[2.5rem] border border-slate-205/65 shadow-2xl shadow-slate-900/5 space-y-5 min-w-0">
          <div className="flex items-center gap-3.5">
            {onBack && (
              <button 
                onClick={onBack}
                className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-550 hover:text-slate-900 transition-all border border-slate-200 shadow-3xs hover:bg-slate-100"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <h2 className="text-[1.25rem] leading-normal font-black text-slate-900 tracking-tight">Schüler-Dossier</h2>
          </div>

          {/* Quick switcher select dropdown */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between gap-2 px-1">
              <label htmlFor="student-switcher" className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-slate-400">
                Schüler/in wechseln
              </label>
              <span className="text-[0.6rem] font-black tabular-nums text-slate-400">
                {currentStudentIndex + 1} von {app.schueler.length}
              </span>
            </div>
            <div className="relative">
              <select
                id="student-switcher"
                value={student.id}
                onChange={(e) => onStudentChange && onStudentChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 text-[0.75rem] leading-tight font-black text-slate-800 shadow-3xs focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:bg-slate-100 transition-all cursor-pointer appearance-none"
                disabled={!onStudentChange}
              >
                {app.schueler.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.vorname} {s.nachname}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-450">
                <ChevronRight size={14} className="rotate-90" />
              </div>
            </div>
            {onStudentChange && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => switchStudent(previousStudent?.id)}
                  disabled={!previousStudent}
                  aria-label={previousStudent
                    ? `Vorheriges Kind: ${previousStudent.vorname} ${previousStudent.nachname}`
                    : 'Kein vorheriges Kind'}
                  className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-left text-[0.65rem] font-black text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ArrowLeft size={13} className="shrink-0" />
                  <span className="truncate">{previousStudent?.vorname || 'Anfang'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => switchStudent(nextStudent?.id)}
                  disabled={!nextStudent}
                  aria-label={nextStudent
                    ? `Nächstes Kind: ${nextStudent.vorname} ${nextStudent.nachname}`
                    : 'Kein nächstes Kind'}
                  className="flex min-w-0 items-center justify-end gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-right text-[0.65rem] font-black text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <span className="truncate">{nextStudent?.vorname || 'Ende'}</span>
                  <ChevronRight size={13} className="shrink-0" />
                </button>
              </div>
            )}
            {!onStudentChange && (
              <p className="text-[0.5625rem] text-slate-400 pl-1 leading-normal">
                Navigation über Registerkarten oder Gesamtschülerliste.
              </p>
            )}
          </div>

          {/* Dossier-Ansicht Configurator (Simple / Expert & Custom Visibility) */}
          <div className="border-t border-slate-100 pt-4 space-y-2.5">
            <span className="text-[0.5625rem] font-black uppercase tracking-[0.18em] text-slate-400 pl-1 block">
              Dossier-Ansicht
            </span>
            
            {/* 1st Div: Mode Switcher (2 rows to prevent out of bounds) */}
            <div className="flex flex-row lg:flex-col gap-1.5 w-full min-w-0">
              <button
                type="button"
                onClick={() => {
                  setDossierMode('einfach');
                  localStorage.setItem('dossier_mode', 'einfach');
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-[0.72rem] sm:text-[0.75rem] font-black transition-all cursor-pointer active:scale-[0.98] min-w-0 ${
                  dossierMode === 'einfach'
                    ? 'bg-indigo-50/70 border-indigo-200 text-indigo-700 shadow-3xs'
                    : 'bg-slate-50/40 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="truncate">Einfache Ansicht</span>
                <span className={`w-2 h-2 rounded-full ${dossierMode === 'einfach' ? 'bg-indigo-600' : 'bg-slate-300'} shrink-0`} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setDossierMode('experte');
                  localStorage.setItem('dossier_mode', 'experte');
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-[0.72rem] sm:text-[0.75rem] font-black transition-all cursor-pointer active:scale-[0.98] min-w-0 ${
                  dossierMode === 'experte'
                    ? 'bg-indigo-50/70 border-indigo-200 text-indigo-700 shadow-3xs'
                    : 'bg-slate-50/40 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="truncate">Experten-Ansicht</span>
                <span className={`w-2 h-2 rounded-full ${dossierMode === 'experte' ? 'bg-indigo-600' : 'bg-slate-300'} shrink-0`} />
              </button>
            </div>

            {/* 2nd Div: Areas customizer button */}
            <div className="hidden lg:block w-full min-w-0">
              <button 
                type="button"
                onClick={() => setShowVisibilityModal(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200/80 rounded-xl text-[0.72rem] sm:text-[0.75rem] font-black text-indigo-650 hover:text-indigo-700 transition-all shadow-3xs cursor-pointer group active:scale-[0.98] min-w-0"
                title="Sichtbare Bereiche anpassen"
              >
                <SlidersHorizontal size={12} className="text-indigo-500 group-hover:rotate-45 transition-transform duration-300 shrink-0" />
                <span className="truncate">Bereiche anpassen</span>
              </button>
            </div>
          </div>

          {/* Main Tab Navigation */}
          <div className="hidden lg:block border-t border-slate-100 pt-4.5 space-y-3" role="tablist" aria-label="Schülerdossier-Hauptbereiche">
            <span className="text-[0.5625rem] font-black uppercase tracking-[0.18em] text-slate-400 pl-1 block">
              Bereiche
            </span>
            <div className="flex flex-col gap-3">
              {getFilteredMainTabs().map((tab) => {
                const isSectionExpanded = expandedSections[tab.id];
                const isSectionActive = activeMainTab === tab.id;
                const TabIcon = tab.icon;
                
                // Determine badge/metric to display on each main tab
                let badgeNode = null;
                if (tab.id === 'organisation' && totalOpen > 0) {
                  badgeNode = (
                    <span className="text-[0.5625rem] font-black px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100 shrink-0">
                      {totalOpen.toFixed(0)} €
                    </span>
                  );
                } else if (tab.id === 'lernen' && summaryGrade !== null) {
                  badgeNode = (
                    <span className="text-[0.5625rem] font-black px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 shrink-0">
                      ∅ {summaryGrade.toFixed(1)}
                    </span>
                  );
                } else if (tab.id === 'entwicklung' && behaviorLogsCount > 0) {
                  badgeNode = (
                    <span className="text-[0.5625rem] font-black px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 shrink-0">
                      {behaviorLogsCount}
                    </span>
                  );
                } else if (tab.id === 'ueberblick') {
                  if (criticalCount > 0) {
                    badgeNode = (
                      <span className="text-[0.5625rem] font-black px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 shrink-0">
                        {criticalCount} Bed.
                      </span>
                    );
                  } else if (studentErhebungen.length > 0) {
                    badgeNode = (
                      <span className="text-[0.5625rem] font-black px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                        {studentErhebungen.length}
                      </span>
                    );
                  }
                }

                const subTabs = getFilteredSubTabs(tab.id);

                return (
                  <div key={tab.id} className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/20">
                    {/* Section Header */}
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedSections(prev => ({
                          ...prev,
                          [tab.id]: !prev[tab.id]
                        }));
                      }}
                      className={`w-full flex items-center justify-between p-3 text-left transition-all hover:bg-slate-50 select-none cursor-pointer group/header focus:outline-none focus:ring-1 focus:ring-indigo-500/30 ${
                        isSectionActive ? 'bg-indigo-50/15 border-b border-indigo-100/30' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-2 rounded-xl shrink-0 transition-colors ${
                          isSectionActive ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500 group-hover/header:bg-slate-200'
                        }`}>
                          <TabIcon size={14} />
                        </div>
                        <div className="min-w-0">
                          <div className={`text-[0.75rem] font-black tracking-tight leading-tight mb-0.5 ${isSectionActive ? 'text-indigo-950' : 'text-slate-800'}`}>{tab.label}</div>
                          <div className="text-[0.5625rem] font-semibold leading-none text-slate-400">{tab.subtitle}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 pl-1">
                        {badgeNode}
                        <div className="text-slate-450 transition-transform duration-200">
                          {isSectionExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>
                      </div>
                    </button>

                    {/* Subtabs list */}
                    {isSectionExpanded && subTabs.length > 0 && (
                      <div className="p-1.5 bg-white/40 space-y-1 border-t border-slate-50">
                        {subTabs.map((subTab) => {
                          const isSubActive = activeTab === subTab.id;
                          const SubIcon = subTab.icon;

                          // Count subtab-specific indicators
                          let subBadge = null;
                          if (subTab.id === 'notizen' && notesCount > 0) {
                            subBadge = <span className={`text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full ${isSubActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>{notesCount}</span>;
                          } else if (subTab.id === 'stats' && behaviorLogsCount > 0) {
                            subBadge = <span className={`text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full ${isSubActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>{behaviorLogsCount}</span>;
                          } else if (subTab.id === 'diagnostik' && studentErhebungen.length > 0) {
                            subBadge = <span className={`text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full ${isSubActive ? 'bg-white/20 text-white' : (criticalCount > 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700')}`}>{studentErhebungen.length}</span>;
                          }

                          return (
                            <button
                              key={subTab.id}
                              type="button"
                              onClick={() => setActiveTab(subTab.id)}
                              className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer select-none focus:outline-none ${
                                isSubActive
                                  ? 'bg-slate-900 text-white font-extrabold shadow-sm'
                                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <SubIcon size={12} className={isSubActive ? 'text-accent animate-pulse' : 'text-slate-405'} />
                                <span className={`text-[0.6875rem] font-bold truncate leading-tight ${isSubActive ? 'text-white' : 'text-slate-650'}`}>{subTab.label}</span>
                              </div>
                              {subBadge}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Button Suite */}
        <div className="hidden lg:block bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-[2rem] shadow-xl text-white space-y-4">
          <div className="flex items-center gap-3.5">
             {student.foto ? (
               <img src={student.foto} alt="" className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/10 shadow-md" referrerPolicy="no-referrer" />
             ) : (
               <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center text-[1rem] leading-normal font-black shrink-0 shadow-inner">
                 {student.vorname.charAt(0)}{student.nachname.charAt(0)}
               </div>
             )}
             <div className="min-w-0">
                <div className="text-[0.5625rem] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Dossier</div>
                <div className="text-[0.875rem] font-black leading-tight text-white text-wrap break-words">{student.vorname} {student.nachname}</div>
             </div>
          </div>
          
          <button 
            type="button"
            onClick={() => exportSchuelerPDF(student.id, app)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white/10 rounded-xl hover:bg-white/15 transition-all border border-white/5 active:scale-95 cursor-pointer text-[0.75rem] leading-tight font-black tracking-widest uppercase text-white shadow-3xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            title="Vollständiges Dossier als internes PDF exportieren"
          >
            <Download size={14} className="text-emerald-400" />
            <span>Interner Export (PDF)</span>
          </button>
        </div>
      </div>
    )}

      {/* MAIN CONTENT AREA */}
      <div className={`flex-1 min-w-0 overflow-hidden lg:overflow-visible ${
        app.dossierFocusMode 
          ? 'bg-white rounded-none border-0 shadow-none p-4 md:p-8' 
          : 'bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-900/5 p-4 sm:p-5 md:p-6 lg:p-6 xl:p-8'
      } min-h-[70vh] flex flex-col justify-between print:p-0 print:border-none print:shadow-none print:rounded-none`}>
        <div>
          {/* Mobile High-Level Category Tabs */}
          {!app.dossierFocusMode && (
            <>
              <div className="lg:hidden flex overflow-x-auto gap-2 pb-2 mb-2.5 scrollbar-none border-b border-slate-100/70" role="tablist" aria-label="Mobile Hauptbereiche">
                {getFilteredMainTabs().map((tab) => {
                  const isActive = activeMainTab === tab.id;
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      role="tab"
                      aria-selected={isActive}
                      id={`dossier-mobile-main-tab-${tab.id}`}
                      onClick={() => {
                        const subtabs = getFilteredSubTabs(tab.id);
                        if (subtabs.length > 0) {
                          setActiveTab(subtabs[0].id);
                        }
                      }}
                      className={`flex items-center gap-1.5 py-2 px-3 rounded-xl text-[0.7rem] leading-tight font-black whitespace-nowrap transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isActive
                          ? 'bg-slate-900 text-accent shadow-xs scale-102'
                          : 'bg-slate-50 text-slate-550 hover:text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <span><TabIcon size={12} /></span>
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Mobile Sub-category Tabs */}
              <div className="lg:hidden flex overflow-x-auto gap-1.5 pb-3 mb-6 scrollbar-none border-b border-slate-100" role="tablist" aria-label="Mobile Registerkarten">
                {getFilteredSubTabs(activeMainTab).map((subTab) => {
                  const isActive = activeTab === subTab.id;
                  const SubIcon = subTab.icon;
                  return (
                    <button
                      key={subTab.id}
                      role="tab"
                      aria-selected={isActive}
                      id={`dossier-mobile-sub-tab-${subTab.id}`}
                      onClick={() => setActiveTab(subTab.id)}
                      className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-[0.6875rem] leading-tight font-bold whitespace-nowrap transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-3xs'
                          : 'bg-slate-50 text-slate-550 hover:text-slate-800'
                      }`}
                    >
                      <span><SubIcon size={11} /></span>
                      <span>{subTab.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
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
                <div
                  className="flex items-center rounded-xl border border-slate-700 bg-slate-950/50 p-1"
                  role="group"
                  aria-label="Dossier-Semester auswählen"
                >
                  {(['1', '2'] as const).map(value => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => changeSemester(value)}
                      aria-pressed={sem === value}
                      className={`rounded-lg px-2.5 py-1.5 text-[0.65rem] font-black transition-all ${
                        sem === value
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {value}. Sem.
                    </button>
                  ))}
                </div>
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
            <div className={`mb-8 p-6 bg-gradient-to-r ${isBirthdayToday ? 'from-pink-500/10 via-rose-500/5 to-indigo-500/10 border-pink-200 shadow-[0_12px_40px_rgba(244,63,94,0.08)]' : 'from-slate-50 via-indigo-50/15 to-slate-50 border-slate-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.015)] hover:shadow-[0_12px_40px_rgba(99,102,241,0.035)]'} border rounded-[2rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all duration-300 relative overflow-hidden`}>
              
              {isBirthdayToday && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-full blur-2xl pointer-events-none select-none" />
              )}

              <div className="flex items-center gap-5">
                {student.foto ? (
                  <img src={student.foto} alt="" className={`w-16 h-16 rounded-2xl object-cover ring-4 ${isBirthdayToday ? 'ring-pink-300' : 'ring-white'} shadow-md object-top hover:scale-105 transition-transform duration-300`} referrerPolicy="no-referrer" />
                ) : (
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${isBirthdayToday ? 'from-pink-500/20 to-rose-600/30 text-pink-700 border-pink-200/60' : 'from-indigo-500/10 to-indigo-600/20 border-indigo-200/60 text-indigo-700'} border flex items-center justify-center text-[1.5rem] leading-normal font-black shadow-inner`}>
                    {student.vorname.charAt(0)}{student.nachname.charAt(0)}
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-[1.625rem] font-black text-slate-950 tracking-tight leading-none flex items-center gap-2">
                      <span>{student.vorname} {student.nachname}</span>
                      {isBirthdayToday && (
                        <span className="animate-bounce inline-block" title="Geburtstagskind!">🎉</span>
                      )}
                    </h1>
                    <div className="flex gap-1.5 flex-wrap">
                      {isBirthdayToday && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white font-extrabold text-[0.55rem] uppercase tracking-wider shadow-sm animate-pulse flex items-center gap-1">
                          <Sparkles size={9} /> B-Day!
                        </span>
                      )}
                      {isSpf && (
                        <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 font-extrabold text-[0.55rem] uppercase tracking-wider border border-rose-200 shadow-3xs flex items-center gap-1" title="Sonderpädagogischer Förderbedarf">
                          <Heart size={9} className="fill-rose-500 text-rose-500" /> SPF
                        </span>
                      )}
                      {isEspf && (
                        <span className="px-2.5 py-1 rounded-lg bg-cyan-50 text-cyan-600 font-extrabold text-[0.55rem] uppercase tracking-wider border border-cyan-200 shadow-3xs flex items-center gap-1" title="Außerordentlicher Status">
                          <Award size={9} /> ESPF
                        </span>
                      )}
                      {isDaz && (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 font-extrabold text-[0.55rem] uppercase tracking-wider border border-amber-200 shadow-3xs flex items-center gap-1" title="Deutsch als Zweitsprache">
                          <BookOpen size={9} /> DAZ
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[0.72rem] leading-tight text-slate-500 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                      Klasse: {[app.stufe ? `${app.stufe}.` : '', app.klassenbezeichnung].filter(Boolean).join(' ') || 'nicht erfasst'}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                      Schuljahr: {app.schuljahr || 'nicht erfasst'}
                    </span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> Geburtstag: {student.geburtstag ? (student.geburtstag.includes('-') ? student.geburtstag.split('-').reverse().join('.') : student.geburtstag) : 'nicht erfasst'}</span>
                    {student.niveau !== null && student.niveau !== undefined && (
                      <>
                        <span className="flex items-center gap-1"><span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-black tracking-tight border border-slate-200">Niveau {student.niveau}</span></span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch md:self-auto justify-end flex-wrap md:flex-nowrap">
                <div
                  className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1"
                  role="group"
                  aria-label="Dossier-Semester auswählen"
                >
                  {(['1', '2'] as const).map(value => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => changeSemester(value)}
                      aria-pressed={sem === value}
                      className={`rounded-lg px-3 py-2 text-[0.7rem] font-black transition-all ${
                        sem === value
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-500 hover:bg-white hover:text-slate-800'
                      }`}
                    >
                      {value}. Sem.
                    </button>
                  ))}
                </div>
                {/* DOSSIER SCOPE SWITCHER */}
                <button
                  type="button"
                  onClick={() => setShowVisibilityModal(true)}
                  className="hidden lg:flex px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-widest items-center justify-center gap-2 transition-all shadow-3xs active:scale-95 cursor-pointer"
                  title="Sichtbare Dossier-Bereiche konfigurieren"
                >
                  <SlidersHorizontal size={13} className="text-indigo-500" />
                  <span>Bereiche anpassen</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setApp(prev => ({
                      ...prev,
                      dossierFocusMode: true
                    }));
                  }}
                  className="hidden lg:flex px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-widest items-center justify-center gap-2 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 active:scale-95 cursor-pointer"
                  title="Fokus-Modus aktivieren: Blendet alle Seitenelemente aus, um die Bearbeitung zu erleichtern"
                >
                  <Maximize2 size={13} />
                  <span>Fokus-Modus</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPresentationModeActive(true)}
                  className="flex-1 lg:flex-none px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 active:scale-95 cursor-pointer"
                  title="KEL-Präsentationsmodus starten"
                >
                  <span className="animate-pulse">🖥️</span>
                  <span>KEL für Eltern starten</span>
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
                  className="p-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all shadow-3xs focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 active:scale-95 cursor-pointer"
                  title="Dossier/Bericht drucken"
                >
                  <Printer size={15} />
                </button>
                <button 
                  type="button"
                  onClick={() => exportSchuelerPDF(student.id, app)}
                  className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-black text-[0.75rem] leading-tight flex items-center gap-2 transition-all shadow-3xs focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 active:scale-95 cursor-pointer"
                  title="Gesamtes Dossier inklusive aller Tabs als einzelne zusammenhängende PDF-Datei exportieren (jeder Tab auf einer neuen Seite)"
                >
                  <Download size={13} className="text-indigo-600" />
                  <span>Gesamtes Dossier (PDF)</span>
                </button>
              </div>
            </div>
          )}

          {/* Desktop Sub-Tabs horizontal bar (visible on large screens only) */}
          {!app.dossierFocusMode && (
            <div className="hidden lg:flex flex-wrap gap-2 mb-8 bg-slate-50/50 border border-slate-205/65 p-2.5 rounded-[1.5rem] print:hidden">
              {getFilteredSubTabs(activeMainTab).map((subTab) => {
                const isSubActive = activeTab === subTab.id;
                const SubIcon = subTab.icon;
                return (
                  <button
                    key={subTab.id}
                    onClick={() => setActiveTab(subTab.id)}
                    className={`flex items-center gap-2 py-2 px-4 rounded-xl text-[0.75rem] leading-tight font-black transition-all cursor-pointer border ${
                      isSubActive
                        ? 'bg-white text-slate-900 shadow-3xs border-slate-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 border-transparent'
                    }`}
                  >
                    <SubIcon size={14} className={isSubActive ? 'text-indigo-600' : 'text-slate-450'} />
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
                    {subTab.id === 'diagnostik' && studentErhebungen.length > 0 && (
                      <span className={`text-[0.59375rem] font-black px-1.5 py-0.5 rounded-full ${isSubActive ? 'bg-indigo-100 text-indigo-800' : (criticalCount > 0 ? 'bg-rose-100 text-rose-800 animate-pulse' : 'bg-slate-200 text-slate-700')}`}>
                        {studentErhebungen.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* 4-Bento Metrics Summary Deck */}
          {activeTab === 'ki_summary' && (isTabVisible('leistungen') || isTabVisible('stats') || isTabVisible('finanzen') || isTabVisible('diagnostik')) && (
            <>
            <div className="mb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-black text-slate-900">Auf einen Blick</h2>
                <p className="text-xs font-bold text-slate-500 mt-1">
                  Synchronisiert aus Notenmappe, Anwesenheit, Beobachtungen, Klassenkasse und Diagnostik.
                </p>
              </div>
              <div className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400">
                {gradeSummary.gradedSubjects} Fächer · {attendanceSummary.recordedDays} Anwesenheitstage · {notesCount} Notizen
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {/* Bento Card 1: Noten */}
              {isTabVisible('leistungen') && (
                <button 
                  type="button"
                  onClick={() => setActiveTab('leistungen')} 
                  aria-label={`Notenschnitt öffnen: ${summaryGrade !== null ? summaryGrade.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'Keine Noten vorhanden'}`}
                  className={`p-4 sm:p-5 bg-white border rounded-[1.75rem] shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_25px_rgba(245,158,11,0.08)] hover:border-amber-250 transition-all duration-300 cursor-pointer text-left w-full space-y-2 focus:outline-none focus:ring-2 focus:ring-amber-500 hover:-translate-y-0.5 ${
                    (activeTab as string) === 'leistungen' 
                      ? 'ring-2 ring-slate-900 border-amber-250 bg-amber-50/5' 
                      : 'border-slate-150'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400">Notenschnitt</span>
                    <div className="p-1 bg-amber-50 rounded-lg">
                      <BarChart3 size={13} className="text-amber-500" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[1.625rem] leading-none font-black text-slate-900 tabular-nums tracking-tight">
                      {summaryGrade !== null ? summaryGrade.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                    </span>
                    {summaryGrade !== null && <span className="text-[0.6875rem] text-slate-400 font-extrabold">∅</span>}
                  </div>
                  <p className="text-[0.5625rem] text-slate-400 font-black uppercase tracking-wider text-wrap break-words leading-none">Leistungen & Schnitt</p>
                </button>
              )}

              {/* Bento Card 2: Verhalten */}
              {isTabVisible('stats') && (
                <button 
                  type="button"
                  onClick={() => setActiveTab('stats')} 
                  aria-label={hasBehaviorData
                    ? `Verhaltensübersicht öffnen. Aktuelle Stufe: ${currentStage?.label}`
                    : 'Verhaltensübersicht öffnen. Noch keine Verhaltenseinträge vorhanden'}
                  className={`p-4 sm:p-5 bg-white border rounded-[1.75rem] shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_25px_rgba(100,116,139,0.08)] hover:border-slate-300 transition-all duration-300 cursor-pointer text-left w-full space-y-2 focus:outline-none focus:ring-2 focus:ring-slate-500 hover:-translate-y-0.5 ${
                    (activeTab as string) === 'stats' 
                      ? 'ring-2 ring-slate-900 border-slate-300 bg-slate-50/5' 
                      : 'border-slate-150'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400">Verhalten</span>
                    <div className="p-1 bg-slate-50 rounded-lg">
                      <span className="text-[0.875rem] leading-none select-none">{hasBehaviorData ? currentStage?.icon : '–'}</span>
                    </div>
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-[0.875rem] leading-tight font-black text-slate-800 text-wrap break-words max-w-full tracking-tight">
                      {hasBehaviorData ? currentStage?.label : 'Noch keine Einträge'}
                    </span>
                  </div>
                  <p className="text-[0.5625rem] text-slate-400 font-black uppercase tracking-wider text-wrap leading-tight break-words">
                    {behaviorLogsCount === 1 ? '1 Beobachtung' : `${behaviorLogsCount} Beobachtungen`}
                  </p>
                </button>
              )}

              {/* Bento Card 3: Finanzen */}
              {isTabVisible('finanzen') && (
                <button 
                  type="button"
                  onClick={() => setActiveTab('finanzen')} 
                  aria-label={hasFinanceData
                    ? `Finanzübersicht öffnen. Bezahlt: ${formatEuro(totalPaid)} Euro. ${totalOpen > 0 ? `${formatEuro(totalOpen)} Euro offen` : 'Kein offener Betrag'}`
                    : 'Finanzübersicht öffnen. Noch keine Zahlungsdaten vorhanden'}
                  className={`p-4 sm:p-5 bg-white border rounded-[1.75rem] shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_25px_rgba(16,185,129,0.08)] hover:border-emerald-250 transition-all duration-300 cursor-pointer text-left w-full space-y-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 hover:-translate-y-0.5 ${
                    (activeTab as string) === 'finanzen' 
                      ? 'ring-2 ring-slate-900 border-emerald-250 bg-emerald-50/5' 
                      : 'border-slate-150'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400">Klassenkasse</span>
                    <div className={`p-1 rounded-lg ${totalOpen > 0 ? 'bg-orange-50' : 'bg-emerald-50'}`}>
                      <Banknote size={13} className={totalOpen > 0 ? "text-orange-500" : "text-emerald-500"} />
                    </div>
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-[1.3125rem] leading-none font-black text-slate-900 tabular-nums tracking-tight">
                      {hasFinanceData ? `${formatEuro(totalPaid)} €` : '–'}
                    </span>
                  </div>
                  {!hasFinanceData ? (
                    <p className="text-[0.5625rem] text-slate-500 font-black uppercase tracking-wider text-wrap break-words leading-none">Keine Zahlungsdaten</p>
                  ) : totalOpen > 0 ? (
                    <p className="text-[0.5625rem] text-orange-600 font-black uppercase tracking-wider text-wrap break-words leading-none">- {formatEuro(totalOpen)} € offen</p>
                  ) : (
                    <p className="text-[0.5625rem] text-emerald-600 font-black uppercase tracking-wider text-wrap break-words leading-none">Kein offener Betrag</p>
                  )}
                </button>
              )}

              {/* Bento Card 4: Diagnostik */}
              {isTabVisible('diagnostik') && (
                <button 
                  type="button"
                  onClick={() => setActiveTab('diagnostik')} 
                  aria-label={studentErhebungen.length === 0
                    ? 'Diagnostik-Erhebungen öffnen. Noch keine Erhebungen vorhanden'
                    : `Diagnostik-Erhebungen öffnen. Anzahl Tests: ${studentErhebungen.length}. ${criticalCount > 0 ? `${criticalCount} auffälliger Bedarf` : 'Keine Auffälligkeiten dokumentiert'}`}
                  className={`p-4 sm:p-5 bg-white border rounded-[1.75rem] shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_25px_rgba(99,102,241,0.08)] hover:border-indigo-250 transition-all duration-300 cursor-pointer text-left w-full space-y-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:-translate-y-0.5 ${
                    (activeTab as string) === 'diagnostik' 
                      ? 'ring-2 ring-slate-900 border-indigo-200 bg-indigo-50/5' 
                      : 'border-slate-150'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400">Erhebungen</span>
                    <div className={`p-1 rounded-lg ${criticalCount > 0 ? 'bg-rose-50' : 'bg-indigo-50'}`}>
                      <Stethoscope size={13} className={criticalCount > 0 ? "text-rose-500" : "text-indigo-500"} />
                    </div>
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-[1.3125rem] leading-none font-black text-slate-900 tabular-nums tracking-tight">
                      {studentErhebungen.length === 0 ? '–' : `${studentErhebungen.length} ${studentErhebungen.length === 1 ? 'Test' : 'Tests'}`}
                    </span>
                  </div>
                  {studentErhebungen.length === 0 ? (
                    <p className="text-[0.5625rem] text-slate-500 font-black uppercase tracking-wider text-wrap break-words leading-none">Noch nicht erhoben</p>
                  ) : criticalCount > 0 ? (
                    <p className="text-[0.5625rem] text-rose-600 font-black uppercase tracking-wider animate-pulse text-wrap break-words leading-none">{criticalCount} kritischer Bedarf</p>
                  ) : (
                    <p className="text-[0.5625rem] text-indigo-600 font-black uppercase tracking-wider text-wrap break-words leading-none">Keine Auffälligkeit dokumentiert</p>
                  )}
                </button>
              )}
            </div>
            </>
          )}

          {/* Smart Recommendation Prompt Engine */}
          {criticalCount > 0 && ['diagnostik', 'foerderprofil'].includes(activeTab) && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-start gap-3.5 shadow-3xs">
              <div className="p-2 rounded-xl bg-rose-500 text-white shrink-0 shadow-sm font-black text-[0.75rem] leading-tight select-none">🧪</div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[0.75rem] leading-tight font-black text-rose-950 uppercase tracking-wider">Förderbedarf erkannt ({criticalCount} Tests auffällig)</h4>
                <p className="text-[0.75rem] leading-tight text-rose-700 font-bold mt-1 leading-relaxed">
                  In den Diagnostik-Erhebungen wurden Auffälligkeiten beim Lernen dokumentiert. Es wird dringend empfohlen, unter <button onClick={() => setActiveTab('foerderprofil')} className="underline font-black text-rose-800 hover:text-rose-900 transition-colors cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-rose-500 rounded px-1">Förderprofil & Maßnahmen</button> konkrete didaktische Ziele für {student.vorname} festzulegen.
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
                  />
                )}
                {activeTab === 'stammdaten' && <DossierStammdaten student={student} />}
                {activeTab === 'eltern_report' && (
                  <DossierElternReport 
                    student={student} 
                    onStartPresentation={() => setPresentationModeActive(true)}
                    semester={sem}
                    onSemesterChange={changeSemester}
                  />
                )}
                {activeTab === 'ki_summary' && (
                  <DossierKIPortfolio
                    student={student}
                    semester={sem}
                    onSemesterChange={changeSemester}
                  />
                )}
                {activeTab === 'leistungen' && (
                  <DossierLeistungen
                    student={student}
                    semester={sem}
                    onSemesterChange={changeSemester}
                  />
                )}
                {activeTab === 'foerderprofil' && <DossierFoerderprofil student={student} />}
                {activeTab === 'diagnostik' && (
                  <DossierDiagnostik
                    student={student}
                    onNavigateTab={tab => setActiveTab(tab)}
                  />
                )}
                {activeTab === 'mika_d' && <DossierMikaD student={student} />}
                {activeTab === 'finanzen' && <DossierFinanzen student={student} />}
                {activeTab === 'stats' && (
                  <StudentStatsEditor 
                    schuelerId={student.id} 
                    onStartPresentation={() => setPresentationModeActive(true)} 
                  />
                )}
                {activeTab === 'kel_reflexion' && (
                  <DossierKELReflexion 
                    student={student} 
                    onStartPresentation={() => setPresentationModeActive(true)} 
                  />
                )}
                {activeTab === 'erlaeuterung' && (
                  <DossierErlaeuterungsmatrix
                    student={student}
                    controlledSemester={sem}
                    onSemesterChange={changeSemester}
                  />
                )}
                {activeTab === 'lernziele' && (
                  <StudentLernziele
                    schuelerId={student.id}
                    onOpenSupportProfile={() => setActiveTab('foerderprofil')}
                    semester={sem}
                    onSemesterChange={changeSemester}
                  />
                )}
                {activeTab === 'arbeitsblatt' && <WorksheetGenerator initialStudentId={student.id} embeddedMode={true} />}
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

      {/* VISIBILITY CONFIGURATION MODAL */}
      <AnimatePresence>
        {showVisibilityModal && (
          <ModalPortal>
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-250">
              <div 
                className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-250"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="space-y-1">
                    <h3 className="text-[1.25rem] leading-normal font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <span>⚙️ Sichtbare Bereiche konfigurieren</span>
                    </h3>
                    <p className="text-[0.75rem] text-slate-500 font-bold leading-normal">
                      Entscheiden Sie selbst, welche Bereiche im Schülerprofil sichtbar sein sollen, um die Übersichtlichkeit zu maximieren.
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowVisibilityModal(false)}
                    className="w-10 h-10 rounded-full bg-white hover:bg-slate-100 text-slate-450 hover:text-slate-900 border border-slate-200/60 transition-all flex items-center justify-center cursor-pointer shadow-3xs"
                  >
                    ✕
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
                  {/* Quick presets */}
                  <div className="bg-indigo-50/40 border border-indigo-100/50 p-4.5 rounded-2xl space-y-2">
                    <span className="text-[0.625rem] font-black uppercase tracking-widest text-indigo-850">Schnell-Einstellungen</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const reset: Record<DossierTab, boolean> = {} as any;
                          const allTabs: DossierTab[] = [
                            'uebersicht', 'stammdaten', 'finanzen', 'leistungen', 
                            'mika_d', 'stats', 'kel_reflexion', 'ki_summary', 
                            'diagnostik', 'foerderprofil', 'erlaeuterung', 
                            'lernziele', 'arbeitsblatt', 'eltern_report'
                          ];
                          allTabs.forEach(t => { reset[t] = true; });
                          setCustomVisibleTabs(reset);
                          localStorage.setItem('dossier_custom_visible_tabs', JSON.stringify(reset));
                        }}
                        className="px-3.5 py-1.5 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-750 font-black text-[0.6875rem] leading-tight uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-3xs"
                      >
                        Alle einblenden
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const reset: Record<DossierTab, boolean> = {} as any;
                          const allTabs: DossierTab[] = [
                            'uebersicht', 'stammdaten', 'finanzen', 'leistungen', 
                            'mika_d', 'stats', 'kel_reflexion', 'ki_summary', 
                            'diagnostik', 'foerderprofil', 'erlaeuterung', 
                            'lernziele', 'arbeitsblatt', 'eltern_report'
                          ];
                          allTabs.forEach(t => {
                            reset[t] = EINFACH_TABS.includes(t);
                          });
                          setCustomVisibleTabs(reset);
                          localStorage.setItem('dossier_custom_visible_tabs', JSON.stringify(reset));
                        }}
                        className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-705 font-black text-[0.6875rem] leading-tight uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-3xs"
                      >
                        Standard-Auswahl
                      </button>
                    </div>
                  </div>

                  {/* Tab Categories List */}
                  <div className="space-y-6">
                    {MAIN_TABS.map((mainTab) => {
                      const subTabs = SUB_TABS[mainTab.id];
                      return (
                        <div key={mainTab.id} className="space-y-2.5">
                          <h4 className="text-[0.6875rem] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1 flex items-center gap-2">
                            <span>{mainTab.label}</span>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {subTabs.map((subTab) => {
                              const isChecked = customVisibleTabs[subTab.id] !== false;
                              const Icon = subTab.icon;
                              
                              // Overview (uebersicht) cannot be disabled to avoid blank screens
                              const isRequired = subTab.id === 'uebersicht';
                              
                              return (
                                <label 
                                  key={subTab.id}
                                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all select-none ${
                                    isRequired
                                      ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                                      : isChecked
                                        ? 'bg-indigo-50/20 border-indigo-200/80 hover:bg-indigo-50/40 cursor-pointer'
                                        : 'bg-slate-50/30 border-slate-100 hover:border-slate-200 cursor-pointer'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${isChecked ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                      <Icon size={14} />
                                    </div>
                                    <span className="text-[0.75rem] font-bold text-slate-800 leading-tight">
                                      {subTab.label}
                                    </span>
                                  </div>
                                  {!isRequired ? (
                                    <input 
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const updated = {
                                          ...customVisibleTabs,
                                          [subTab.id]: e.target.checked
                                        };
                                        setCustomVisibleTabs(updated);
                                        localStorage.setItem('dossier_custom_visible_tabs', JSON.stringify(updated));
                                      }}
                                      className="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-550 cursor-pointer"
                                    />
                                  ) : (
                                    <span className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">Erforderlich</span>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 md:p-8 border-t border-slate-100 flex justify-end bg-slate-50/50">
                  <button 
                    type="button"
                    onClick={() => setShowVisibilityModal(false)}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-[0.75rem] leading-tight uppercase tracking-widest rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    Schließen & Anwenden
                  </button>
                </div>
              </div>
            </div>
          </ModalPortal>
        )}
      </AnimatePresence>
    </div>
  );
}
