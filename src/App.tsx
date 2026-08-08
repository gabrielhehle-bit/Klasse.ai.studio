import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider, useToast } from './context/ToastContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import ErrorBoundary from './components/ErrorBoundary';

// Robust lazy-load helper with retry mechanism to gracefully recover from network or bundler stale-chunk hashing errors
function lazyRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.error("Failed to load component dynamically, retrying in 1.5 seconds...", error);
      return new Promise((resolve, reject) => {
        setTimeout(async () => {
          try {
            const module = await componentImport();
            resolve(module);
          } catch (retryError) {
            console.error("Retry failed. Performing hard page reload to update assets...", retryError);
            window.location.reload();
            reject(retryError);
          }
        }, 1500);
      });
    }
  });
}

const Dashboard = lazyRetry(() => import('./components/Dashboard'));
const StudentList = lazyRetry(() => import('./components/StudentList'));
const Gradebook = lazyRetry(() => import('./components/Gradebook'));
const AIAssistant = lazyRetry(() => import('./components/AIAssistant'));
const SetupWizard = lazyRetry(() => import('./components/SetupWizard'));
const Attendance = lazyRetry(() => import('./components/Attendance'));
const Behavior = lazyRetry(() => import('./components/Behavior'));
const YearlyPlan = lazyRetry(() => import('./components/YearlyPlan'));
const WeeklyPlan = lazyRetry(() => import('./components/WeeklyPlan'));
const SeatingPlan = lazyRetry(() => import('./components/SeatingPlan'));
const Uebergabemappe = lazyRetry(() => import('./components/Uebergabemappe'));
const Materialbibliothek = lazyRetry(() => import('./components/Materialbibliothek'));
const Drafts = lazyRetry(() => import('./components/Drafts'));
const MeetingLogs = lazyRetry(() => import('./components/MeetingLogs'));
const GradeOverview = lazyRetry(() => import('./components/GradeOverview'));
const OrgaLists = lazyRetry(() => import('./components/OrgaLists'));
const Statistics = lazyRetry(() => import('./components/Statistics'));
const EmailAssistant = lazyRetry(() => import('./components/EmailAssistant'));
const Differentiation = lazyRetry(() => import('./components/Differentiation'));
const VerbalAssessment = lazyRetry(() => import('./components/VerbalAssessment'));
const Portfolio = lazyRetry(() => import('./components/Portfolio'));
const SubstitutionPlan = lazyRetry(() => import('./components/SubstitutionPlan'));
const Archive = lazyRetry(() => import('./components/Archive'));
const Backup = lazyRetry(() => import('./components/Backup'));
const Settings = lazyRetry(() => import('./components/Settings'));
const WorksheetGenerator = lazyRetry(() => import('./components/WorksheetGenerator'));
const PrintCenter = lazyRetry(() => import('./components/PrintCenter'));
const Unterrichtsmodus = lazyRetry(() => import('./components/Unterrichtsmodus'));
const Diagnostik = lazyRetry(() => import('./components/Diagnostik'));
const Klassengemeinschaft = lazyRetry(() => import('./components/WirGefuehl'));
const KELGespraeche = lazyRetry(() => import('./components/KELGespraeche'));
const GabicQuest = lazyRetry(() => import('./components/GabicQuest'));
const Jahresbericht = lazyRetry(() => import('./components/Jahresbericht'));
const StimmNotizen = lazyRetry(() => import('./components/StimmNotizen'));
const StationenbetriebManager = lazyRetry(() => import('./components/StationenbetriebManager').then(m => ({ default: m.StationenbetriebManager })));
const PlanungsZentrale = lazyRetry(() => import('./components/PlanungsZentrale'));
import VoiceNote from './components/VoiceNote';
import { VoiceCommander } from './components/VoiceCommander';
import WelcomeTour from './components/WelcomeTour';
import Spotlight from './components/Spotlight';
import GlobalActions from './components/GlobalActions';
import DenkzettelWidget from './components/DenkzettelWidget';
import UnifiedFAB from './components/UnifiedFAB';
import InitialModeModal from './components/InitialModeModal';
import PrivacyLock from './components/PrivacyLock';
const Cockpit = lazyRetry(() => import('./components/Cockpit'));
import PrintHeader from './components/PrintHeader';
import { AnimatePresence, motion } from 'motion/react';
import { Settings2, X, Mic, Sparkles, HelpCircle, Loader2 } from 'lucide-react';
import { getKW, getTodayName, getAccentTextColor } from './lib/utils';
const DiagnostikAnleitung = lazyRetry(() => import('./components/DiagnostikAnleitung'));
const DataConsistencyModal = lazyRetry(() => import('./components/DataConsistencyModal'));

const MobileRemoteController = lazyRetry(() => import('./components/MobileRemoteController').then(m => ({ default: m.MobileRemoteController })));

const FULL_HEIGHT_PAGES = ['ki-helfer', 'sitzplan', 'elternbrief', 'differenzierung', 'verbal', 'materialien', 'jahresplanung', 'diagnostik', 'stunden', 'eltern', 'orga', 'notenTabelle', 'arbeitsblatt', 'stationenbetrieb', 'planungszentrale'];

function AppContent() {
  const { app, setApp, setPage } = useApp();
  const { showToast } = useToast();
  const currentPage = app.currentPage || 'cockpit';
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDiagnostikAnleitung, setShowDiagnostikAnleitung] = useState(false);
  const [showConsistencyModal, setShowConsistencyModal] = useState(false);
  const pageScrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    pageScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [currentPage]);

  React.useEffect(() => {
    const handleOpenConsistency = () => setShowConsistencyModal(true);
    window.addEventListener('open-data-consistency', handleOpenConsistency);
    return () => window.removeEventListener('open-data-consistency', handleOpenConsistency);
  }, []);

  const removeDemoData = () => {
    setApp(prev => {
      const newState = { ...prev };
      
      const filterMap = (map: any) => {
        if (!map) return {};
        const newMap = { ...map };
        Object.keys(newMap).forEach(key => {
          if (key.startsWith('demo-')) delete newMap[key];
        });
        return newMap;
      };

      newState.schueler = (prev.schueler || []).filter(s => !s.id.startsWith('demo-'));
      newState.classes = (prev.classes || []).filter(c => !c.id.startsWith('demo-'));
      newState.notes = (prev.notes || []).filter(n => !n.id.startsWith('demo-') && !n.schuelerId.startsWith('demo-'));
      newState.differenzierungsGruppen = (prev.differenzierungsGruppen || []).filter(g => !g.id.startsWith('demo-'));
      (newState as any).diagnostikErgebnisse = ((prev as any).diagnostikErgebnisse || []).filter((d: any) => !d.id.startsWith('demo-') && !d.schuelerId.startsWith('demo-'));
      (newState as any).diagnostikErhebungen = ((prev as any).diagnostikErhebungen || []).filter((d: any) => !d.id.startsWith('demo-') && !d.schuelerId.startsWith('demo-'));
      
      newState.noten = filterMap(prev.noten);
      newState.mitarbeit = filterMap(prev.mitarbeit);
      newState.anwesenheit = filterMap(prev.anwesenheit);
      
      newState.demoModusAktiv = false;
      
      if (prev.activeClassId?.startsWith('demo-')) {
        newState.activeClassId = newState.classes.length > 0 ? newState.classes[0].id : undefined;
      }
      
      return newState;
    });
  };

  const setupAbgeschlossen = 
    (app?.klassenbezeichnung && app.klassenbezeichnung.trim().length > 0) ||
    (app?.classes && app.classes.length > 0) ||
    (app?.schueler && app.schueler.length > 0);
    
  const [showSetup, setShowSetup] = useState(!setupAbgeschlossen);
  const [hasAiKey, setHasAiKey] = useState<boolean | null>(null);
  const [showAiWarning, setShowAiWarning] = useState(true);

  React.useEffect(() => {
    fetch('/api/ai/status')
      .then(res => {
        if (!res.ok) throw new Error("Status API returned error state");
        return res.json();
      })
      .then(data => setHasAiKey(data.hasKey))
      .catch((e) => {
        console.error("Failed to fetch AI Status:", e);
        setHasAiKey(false);
      });
  }, []);

  // Apply UI scale and zoom level globally to the document
  React.useEffect(() => {
    const zoom = app?.settings?.zoomLevel || 'standard';
    const root = document.documentElement;
    root.setAttribute('data-zoom', zoom);
    
    // Legacy mapping for uiScale if it exists and zoomLevel doesn't
    if (!app?.settings?.zoomLevel && app?.settings?.uiScale) {
      if (app.settings.uiScale < 0.95) root.setAttribute('data-zoom', 'compact');
      else if (app.settings.uiScale > 1.05) root.setAttribute('data-zoom', 'large');
      else root.setAttribute('data-zoom', 'standard');
    }
  }, [app?.settings?.zoomLevel, app?.settings?.uiScale]);

  // Sync theme to root element for CSS variables usage in body
  React.useEffect(() => {
    const root = document.documentElement;
    const activeStyle = app?.theme || 'classic_light';
    root.setAttribute('data-style', activeStyle);
    const isLightTheme = activeStyle !== 'deep_dark';
    root.setAttribute('data-theme', isLightTheme ? 'light' : 'dark');

    if (activeStyle === 'custom_theme') {
      const bgCol = app.customBgColor || '#f3f4f6';
      const fgCol = app.customTextColor || '#171717';
      const fg2Col = app.customText2Color || '#525252';
      const accentCol = app.customAccentColor || '#10b981';

      const cleanHex = bgCol.replace('#', '');
      let isBgLight = true;
      if (cleanHex.length === 6) {
        const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
        const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
        const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
        const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        isBgLight = l > 0.5;
      }

      root.style.setProperty('--bg', bgCol);
      root.style.setProperty('--surface', isBgLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.4)');
      root.style.setProperty('--surface2', isBgLight ? '#f9fafb' : '#1e293b');
      root.style.setProperty('--surface3', isBgLight ? '#f3f4f6' : '#0f172a');
      root.style.setProperty('--border', isBgLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.12)');
      root.style.setProperty('--border2', isBgLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.22)');
      root.style.setProperty('--text', fgCol);
      root.style.setProperty('--text2', fg2Col);
      root.style.setProperty('--text3', isBgLight ? '#8c8c8c' : '#94a3b8');
      root.style.setProperty('--accent', accentCol);
      
      const btnText = getAccentTextColor(accentCol);
      root.style.setProperty('--btn-text', btnText);
      root.style.setProperty('--accent-text', btnText); // Ensure both variables are set
    } else {
      root.style.removeProperty('--bg');
      root.style.removeProperty('--surface');
      root.style.removeProperty('--surface2');
      root.style.removeProperty('--surface3');
      root.style.removeProperty('--border');
      root.style.removeProperty('--border2');
      root.style.removeProperty('--text');
      root.style.removeProperty('--text2');
      root.style.removeProperty('--text3');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--btn-text');
      root.style.removeProperty('--accent-text');
    }
  }, [app?.theme, app?.customBgColor, app?.customTextColor, app?.customText2Color, app?.customAccentColor]);

  // Sync fontFamily and font CSS custom properties to root element for live changes
  React.useEffect(() => {
    const root = document.documentElement;
    const activeFont = app?.settings?.fontFamily || 'standard';
    
    // Clean up all classes starting with 'font-'
    const classesToRemove: string[] = [];
    root.classList.forEach((cls) => {
      if (cls.startsWith('font-')) {
        classesToRemove.push(cls);
      }
    });
    classesToRemove.forEach((cls) => root.classList.remove(cls));
    
    // Add current font class
    root.classList.add(`font-${activeFont}`);

    // Map font string to explicit font-family fallback chains
    let sansFont = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    let displayFont = '"Syne", sans-serif';

    switch (activeFont) {
      case 'geometric':
        sansFont = '"Outfit", "DM Sans", ui-sans-serif, system-ui, sans-serif';
        displayFont = '"Outfit", "DM Sans", ui-sans-serif, system-ui, sans-serif';
        break;
      case 'friendly':
        sansFont = '"Fredoka", "Quicksand", sans-serif';
        displayFont = '"Fredoka", "Quicksand", sans-serif';
        break;
      case 'handwritten':
        sansFont = '"Patrick Hand", "Kalam", cursive, sans-serif';
        displayFont = '"Patrick Hand", "Kalam", cursive, sans-serif';
        break;
      case 'schulschrift':
        sansFont = '"Edu VIC WA NT Beginner", "Patrick Hand", cursive, sans-serif';
        displayFont = '"Edu VIC WA NT Beginner", "Patrick Hand", cursive, sans-serif';
        break;
      case 'druckschrift':
        sansFont = '"Playpen Sans", "Comic Neue", cursive, sans-serif';
        displayFont = '"Playpen Sans", "Comic Neue", cursive, sans-serif';
        break;
      case 'elegant':
        sansFont = '"Cinzel", "Playfair Display", ui-serif, Georgia, serif';
        displayFont = '"Cinzel", "Playfair Display", ui-serif, Georgia, serif';
        break;
      case 'comfort':
        sansFont = '"Comfortaa", "Quicksand", cursive, sans-serif';
        displayFont = '"Comfortaa", "Quicksand", cursive, sans-serif';
        break;
      case 'serif':
        sansFont = 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif';
        displayFont = 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif';
        break;
      case 'dyslexic':
        sansFont = '"Lexend", "OpenDyslexic", "Lexend Deca", ui-sans-serif, sans-serif';
        displayFont = '"Lexend", "OpenDyslexic", "Lexend Deca", ui-sans-serif, sans-serif';
        break;
      case 'playful':
        sansFont = '"Quicksand", "Comic Sans MS", cursive, sans-serif';
        displayFont = '"Quicksand", "Comic Sans MS", cursive, sans-serif';
        break;
      case 'mono':
        sansFont = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
        displayFont = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
        break;
      case 'standard':
      default:
        sansFont = '"DM Sans", ui-sans-serif, system-ui, sans-serif';
        displayFont = '"Syne", sans-serif';
        break;
    }

    // Dynamic set system property
    root.style.setProperty('--font-sans', sansFont);
    root.style.setProperty('--font-display', displayFont);
  }, [app?.settings?.fontFamily]);

  // Migration for Materialbibliothek
  React.useEffect(() => {
    if (!app?.stundenbilderMigriert && app?.vertretungsStundenbilder && app?.vertretungsStundenbilder.length > 0) {
      import('./utils/materialienUtils').then(({ migrateStundenbilderToMaterialien }) => {
        setApp(prev => ({
          ...prev,
          materialien: migrateStundenbilderToMaterialien(prev),
          stundenbilderMigriert: true
        }));
      });
    } else if (!app?.stundenbilderMigriert) {
        // Even if no items, set to true to avoid repeated checks
        setApp(prev => ({ ...prev, stundenbilderMigriert: true }));
    }
  }, [app?.stundenbilderMigriert, app?.vertretungsStundenbilder, setApp]);

  // Fallback active subject calculations for the Phone (Mobile Remote Screen)
  const getActiveSubject = () => {
    try {
      if (app?.boardSettings?.activeFach) {
        return app.boardSettings.activeFach;
      }
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      const tagNames = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
      const tagName = tagNames[now.getDay()];
      
      const zeiten = [
        { start: 480, end: 530 },
        { start: 530, end: 585 },
        { start: 600, end: 650 },
        { start: 650, end: 700 },
        { start: 710, end: 760 },
        { start: 765, end: 815 },
        { start: 825, end: 875 },
        { start: 875, end: 925 },
      ];
      
      let matchIdx = -1;
      for (let i = 0; i < zeiten.length; i++) {
        if (minutes >= zeiten[i].start && minutes < zeiten[i].end) {
          matchIdx = i + 1;
          break;
        }
      }
      
      let subject = "Unterricht";
      if (app && matchIdx !== -1) {
         const kw = app.currentKW || getKW(now) || 36;
         const daysDe = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];
         const dayIdx = daysDe.indexOf(tagName);
         const dayPlan = tagName ? (app.wochenplanung?.[kw]?.[tagName] || {}) : {};
         subject = dayPlan[matchIdx - 1]?.fach || app.stammplan?.[tagName]?.[matchIdx] || "Unterricht";
      }
      return subject;
    } catch (e) {
      return "Unterricht";
    }
  };

  // If this device is a remote controller (mobile phone), ALWAYS render the MobileRemoteController interface!
  if (app?.boardSettings?.gabicRole === 'child') {
    return (
      <div 
        className="fixed inset-0 z-[9999] bg-slate-950 overflow-auto text-slate-100 flex flex-col items-center p-4"
        style={{
          fontFamily: app?.settings?.fontFamily === 'dyslexic' ? 'OpenDyslexic' : 'Inter, system-ui, sans-serif'
        }}
      >
        <React.Suspense fallback={
          <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 gap-4">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-stone-400 font-mono text-[9px] uppercase tracking-wider font-bold">Lade GabicQuest...</div>
          </div>
        }>
          <div className="w-full min-h-full max-w-7xl relative bg-white rounded-[2.5rem] shadow-2xl flex flex-col">
             <GabicQuest forcedTab="child-game" />
          </div>
        </React.Suspense>
      </div>
    );
  }

  if (app?.boardSettings?.isRemoteController) {
    return (
      <div 
        className="fixed inset-0 z-[9999] bg-slate-950 overflow-hidden text-slate-100 select-none flex flex-col"
        style={{
          fontFamily: app?.settings?.fontFamily === 'dyslexic' ? 'OpenDyslexic' : 'Inter, system-ui, sans-serif'
        }}
      >
        <React.Suspense fallback={
          <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 gap-4">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-stone-400 font-mono text-[9px] uppercase tracking-wider font-bold">Lade Handy-Controller...</div>
          </div>
        }>
          <MobileRemoteController 
            onClose={() => {
              setApp((prev: any) => ({
                ...prev,
                boardSettings: {
                  ...prev.boardSettings,
                  activeSyncCode: undefined,
                  isRemoteController: undefined
                }
              }));
            }} 
            getActiveSubject={getActiveSubject} 
          />
        </React.Suspense>
      </div>
    );
  }
  
  if (app?.boardSettings?.gabicRole && !app.boardSettings.gabicRole) {
      // Just a placeholder to show I matched properly
  }

  if (showSetup || currentPage === 'setup' || currentPage === 'setup_new') {
    return (
      <React.Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div></div>}>
        <SetupWizard 
          isNewClass={currentPage === 'setup_new'} 
          key={currentPage === 'setup_new' ? 'new_setup' : (app?.activeClassId || 'setup')} 
          onComplete={() => {
            setShowSetup(false);
            setPage('dashboard');
          }} 
        />
      </React.Suspense>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'cockpit': return null;
      case 'dashboard': return <Dashboard />;
      case 'schueler': return <StudentList />;
      case 'noten': return <Gradebook />;
      case 'ki-helfer': 
      case 'ki-paedagogik':
      case 'ki-wissen':
      case 'ki-recht':
      case 'ki-reflexion':
      case 'ki-elternbrief':
      case 'ki-differenzierung':
      case 'ki-beurteilung':
      case 'ki-korrektur':
      case 'ki-lernziele':
      case 'ki-stationenbetrieb':
        return <AIAssistant />;
      case 'anwesenheit': return <Attendance />;
      case 'verhalten': return <Behavior />;
      case 'jahresplanung': return <YearlyPlan />;
      case 'wochenplanung': return <WeeklyPlan />;
      case 'sitzplan': return <SeatingPlan />;
      case 'uebergabemappe': return <Uebergabemappe />;
      case 'materialien': return <Materialbibliothek />;
      case 'stunden': return <Drafts />;
      case 'eltern': return <MeetingLogs />;
      case 'klassengemeinschaft': return <Klassengemeinschaft />;
      case 'diagnostik': return <Diagnostik />;
      case 'kel': return <KELGespraeche />;
      case 'elternbrief': return <EmailAssistant />;
      case 'orga': return <OrgaLists />;
      case 'statistik': return <Statistics />;
      case 'notenTabelle': return <GradeOverview />;
      case 'differenzierung': return <Differentiation />;
      case 'archiv': return <Archive />;
      case 'datensicherung': return <Backup />;
      case 'settings': return <Settings />;
      case 'arbeitsblatt': return <WorksheetGenerator />;
      case 'drucken': return <PrintCenter />;
      case 'verbal': return <VerbalAssessment />;
      case 'portfolio': return <Portfolio />;
      case 'vertretung': return <SubstitutionPlan />;
      case 'jahresbericht': return <Jahresbericht />;
      case 'stimmnotizen': return <StimmNotizen />;
      case 'stationenbetrieb': return <StationenbetriebManager />;
      case 'planungszentrale': return <PlanungsZentrale />;
      default: return (
        <div className="px-12 py-12">
          <div className="bg-white rounded-[2.5rem] text-center py-32 border border-slate-100 shadow-xl shadow-slate-900/5 space-y-6">
            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-4xl mx-auto shadow-inner ring-1 ring-slate-100">🚧</div>
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Arbeitsbereich</p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Seite folgt in Kürze</h3>
            </div>
            <div className="pt-4">
              <button onClick={() => setPage('dashboard')} className="btn btn-primary px-4 sm:px-8 h-12 text-[12px]">Zurück zum Dashboard</button>
            </div>
          </div>
        </div>
      );
    }
  };

  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard': return 'Dashboard';
      case 'schueler': return 'Schüler';
      case 'noten': return 'Notenmappe';
      case 'ki-helfer':
      case 'ki-paedagogik':
      case 'ki-wissen':
      case 'ki-recht':
      case 'ki-stationenbetrieb':
        return 'KI Helfer';
      case 'cockpit': return 'LEHRERCOCKPIT';
      case 'sitzplan': return 'Sitzplan';
      case 'anwesenheit': return 'Anwesenheit';
      case 'verhalten': return 'Verhalten & Notizen';
      case 'jahresplanung': return 'Jahresplanung';
      case 'wochenplanung': return 'Wochenplanung';
      case 'uebergabemappe': return 'Übergabemappe';
      case 'materialien': return 'Materialbibliothek';
      case 'stunden': return 'Stundenentwürfe';
      case 'eltern': return 'Erläuterungen';
      case 'klassengemeinschaft': return 'Wir-Gefühl & Klasse';
      case 'diagnostik': return 'Diagnostik';
      case 'kel': return 'KEL-Gespräche';
      case 'elternbrief': return 'Elternbrief KI';
      case 'verbal': return 'Verbale Beurteilung';
      case 'orga': return 'Kasse & Orga';
      case 'statistik': return 'Statistik';
      case 'notenTabelle': return 'Notenübersicht';
      case 'portfolio': return 'Portfolio';
      case 'differenzierung': return 'Differenzierung KI';
      case 'vertretung': return 'Vertretungsplan';
      case 'jahresbericht': return 'Jahresbericht';
      case 'stimmnotizen': return 'Stimm-Notizen';
      case 'archiv': return 'Archiv';
      case 'datensicherung': return 'Datensicherung';
      case 'settings': return 'Einstellungen';
      case 'arbeitsblatt': return 'Arbeitsblatt-Generator';
      case 'drucken': return 'Druckzentrum';
      default: return currentPage.charAt(0).toUpperCase() + currentPage.slice(1);
    }
  };

  return (
    <div 
      className={`flex h-dvh bg-bg transition-colors duration-300 print:block print:h-auto print:bg-white print-only-parent font-${app?.settings?.fontFamily || 'standard'}`} 
      data-theme={(app?.theme || 'classic_light') !== 'deep_dark' ? 'light' : 'dark'}
      data-style={app?.theme || 'classic_light'}
    >
      <GlobalActions />
      <Spotlight />
      <InitialModeModal />
      <WelcomeTour />
      {!app.dossierFocusMode && (
        <Sidebar 
          currentPage={currentPage} 
          setPage={setPage} 
          isOpen={sidebarOpen} 
          setIsOpen={setSidebarOpen} 
          openSetup={() => setShowSetup(true)}
        />
      )}
      
      <main className="flex-1 flex flex-col min-w-0 print:block print:overflow-visible print-only-parent overflow-x-hidden overflow-y-hidden bg-slate-50/10">
        {!app.dossierFocusMode && (
          <Topbar 
            title={getPageTitle()} 
            onMenuClick={() => setSidebarOpen(true)}
            className="print:hidden relative z-[60]"
            actions={
              <div className="flex items-center gap-2">
                {currentPage === 'diagnostik' && (
                  <button 
                    onClick={() => setShowDiagnostikAnleitung(true)}
                    className="flex items-center gap-1.5 p-2 px-3 rounded-xl bg-slate-50 border border-slate-200/65 text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all font-bold text-[0.75rem] shadow-sm active:scale-95 cursor-pointer"
                    title="Hilfe zur Diagnostik"
                  >
                    <HelpCircle size={14} className="text-indigo-500" />
                    <span className="hidden sm:inline">Anleitung</span>
                  </button>
                )}
                {currentPage === 'dashboard' && (
                  <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('open-dashboard-customize'))}
                    className="flex items-center gap-1.5 p-2 px-3 rounded-xl bg-slate-50 border border-slate-200/65 text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all font-bold text-[0.75rem] shadow-sm active:scale-95 cursor-pointer"
                    title="Dashboard-Layout anpassen"
                  >
                    <Settings2 size={14} className="text-accent" />
                    <span className="hidden xl:inline">Anpassen</span>
                  </button>
                )}
              </div>
            }
          />
        )}
        
        {hasAiKey === false && showAiWarning && (
          <div className="bg-amber-500 text-white font-sans text-xs py-2 px-4 sm:px-6 shrink-0 flex items-center justify-between gap-3 shadow-md z-[50] no-print">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm shrink-0" aria-hidden="true">⚠️</span>
              <span className="font-semibold truncate sm:whitespace-normal">
                KI-Funktionen sind derzeit nicht eingerichtet und stehen deshalb nicht zur Verfügung.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAiWarning(false)}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors cursor-pointer shrink-0"
              aria-label="KI-Hinweis schließen"
              title="Hinweis schließen"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {app.demoModusAktiv && currentPage !== 'cockpit' && currentPage !== 'drucken' && (
          <div className="bg-emerald-600 text-white py-3 px-4 sm:px-8 shrink-0 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg z-[50] no-print animate-in slide-in-from-top-full duration-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <Sparkles size={20} className="text-white" />
              </div>
              <p className="text-[0.875rem] font-bold leading-tight">
                Du erkundest GABIC gerade mit einer Beispielklasse. Möchtest du eine eigene Klasse anlegen oder die Beispieldaten als Basis behalten?
              </p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button 
                onClick={() => {
                  removeDemoData();
                  setShowSetup(true);
                  setPage('setup');
                }}
                className="flex-1 md:flex-none px-5 py-2 bg-white text-emerald-700 font-black text-[0.75rem] uppercase tracking-wider rounded-xl shadow-sm hover:bg-emerald-50 transition-all"
              >
                Eigene Klasse anlegen
              </button>
              <button 
                onClick={() => {
                  setApp(prev => ({ ...prev, demoModusAktiv: false }));
                  showToast('Viel Spaß beim Ausprobieren! Die Beispieldaten bleiben erhalten.', 'success');
                }}
                className="flex-1 md:flex-none px-5 py-2 bg-emerald-500/50 text-white border border-white/20 font-black text-[0.75rem] uppercase tracking-wider rounded-xl hover:bg-emerald-500/70 transition-all"
              >
                Beispieldaten behalten
              </button>
            </div>
          </div>
        )}
        
        <div ref={pageScrollRef} className="flex-1 overflow-y-auto relative custom-scrollbar print:overflow-visible overflow-x-hidden flex flex-col min-h-0">
          <div 
            className={`app-scale-container w-full print:overflow-visible ${
              app.dossierFocusMode || (FULL_HEIGHT_PAGES.includes(currentPage) || currentPage.startsWith('ki-')) ? 'flex-1 flex flex-col min-h-0 h-full' : 'h-auto min-h-full'
            }`} 
            data-zoom={app?.settings?.zoomLevel}
          >
            {!app.dossierFocusMode && (
              <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-4 sm:px-6 md:px-4 sm:px-8 lg:px-10 min-w-0 print:m-0 print:p-0 data-[zoom=large]:max-w-none shrink-0">
                <PrintHeader />
              </div>
            )}
            
            <AnimatePresence mode="wait">
                <motion.div 
                  key={currentPage}
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -15, scale: 0.98 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  data-zoom={app?.settings?.zoomLevel}
                  className={`w-full min-w-0 data-[zoom=large]:max-w-none print:max-w-none print:px-0 print:mx-0 print:py-0 print-no-transform ${
                    app.dossierFocusMode
                      ? 'max-w-none px-0 mx-0 py-0 flex-1 flex flex-col min-h-0 h-full'
                      : (FULL_HEIGHT_PAGES.includes(currentPage) || currentPage.startsWith('ki-')) 
                        ? 'max-w-[1920px] mx-auto px-4 sm:px-4 sm:px-6 md:px-4 sm:px-8 lg:px-10 flex-1 flex flex-col min-h-0 py-0 h-full print:h-auto print:min-h-0 print:block' 
                        : 'max-w-[1920px] mx-auto px-4 sm:px-4 sm:px-6 md:px-4 sm:px-8 lg:px-10 py-4 sm:py-8 h-auto'
                  }`}
                >
                  <ErrorBoundary>
                    <div className={`print-page-wrapper w-full ${
                      app.dossierFocusMode || (FULL_HEIGHT_PAGES.includes(currentPage) || currentPage.startsWith('ki-'))
                        ? 'flex-1 flex flex-col min-h-0 print:h-auto print:min-h-0 print:block'
                        : 'h-auto'
                    } ${['noten', 'jahresplanung', 'sitzplan'].includes(currentPage) ? 'print-force-landscape' : 'print-force-portrait'}`}>
                      <React.Suspense fallback={
                        <div className="flex flex-col items-center justify-center h-64 gap-4">
                          <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin relative z-10" />
                          </div>
                          <span className="text-[0.6875rem] font-black uppercase tracking-widest text-slate-400 animate-pulse">Wird geladen...</span>
                        </div>
                      }>
                        {renderPage()}
                      </React.Suspense>
                    </div>
                  </ErrorBoundary>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        {!app.dossierFocusMode && <DenkzettelWidget />}
        {!app.dossierFocusMode && <UnifiedFAB />}
        <VoiceNote />
        <VoiceCommander />
        <PrivacyLock />
        <DataConsistencyModal isOpen={showConsistencyModal} onClose={() => setShowConsistencyModal(false)} />
      </main>
      <AnimatePresence>
        {showDiagnostikAnleitung && (
          <DiagnostikAnleitung onClose={() => setShowDiagnostikAnleitung(false)} />
        )}
        {currentPage === 'cockpit' && (
          <motion.div
            key="cockpit-full-overlay"
            initial={{ opacity: 0, y: '100dvh', scale: 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: '100dvh', scale: 0.96 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[9999] bg-slate-950 overflow-hidden"
            style={{ willChange: 'transform, opacity' }}
          >
            <React.Suspense fallback={
              <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                  <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin relative z-10" />
                </div>
                <div className="text-slate-400 font-mono text-[9px] uppercase tracking-widest font-bold">Lade Lehrercockpit...</div>
              </div>
            }>
              <Unterrichtsmodus onClose={() => {
                const target = app.previousPage && app.previousPage !== 'cockpit' ? app.previousPage : 'wochenplanung';
                setPage(target);
              }} />
            </React.Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </ToastProvider>
    </AppProvider>
  );
}
