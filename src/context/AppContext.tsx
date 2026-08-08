
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import LZString from 'lz-string';
import localforage from 'localforage';
import { AppState, Student } from '../types';
import { DEFAULT_TAGEPLAN, FAECHER_ALLE, STUNDEN_INFO, DEFAULT_YEARLY_SUBJECTS, DEFAULT_FACH_COLORS } from '../constants';
import { getKW, getCurrentSchuljahr } from '../lib/utils';
import { DEFAULT_HISTORICAL_STUDENTS } from '../data/historicalStudents';
import { notenSyncService } from '../lib/NotenSyncService';
import { DEFAULT_MORNING_WIDGETS } from '../data/morningWidgets';

localforage.config({
  name: 'LehrerApp',
  storeName: 'app_state'
});

interface AppContextType {

  app: AppState;
  setApp: React.Dispatch<React.SetStateAction<AppState>>;
  updateApp: (changes: Partial<AppState>) => void;
  saveApp: () => void;
  updateStudent: (student: Student) => void;
  deleteStudent: (id: string) => void;
  setPage: (page: string) => void;
  switchClass: (id: string) => void;
  addClass: (name: string, stufe: number, isKV: boolean) => void;
  removeClass: (id: string) => void;
  notenUpdateTrigger: number;
  triggerGradebookUpdate: () => void;
  calculateWidgetFontSize: (scale: number) => string;
  screenLocked: boolean;
  setScreenLocked: (locked: boolean) => void;
}

const STORAGE_KEY = 'hehle_v3';

const initialAppState: AppState = {
  ipsativeGewichtung: 70,
  bundesland: 'VBG',
  schuljahr: getCurrentSchuljahr(),
  activeClassId: '',
  classes: [],
  stufe: 4,
  lehrplanText: '',
  tageplan: DEFAULT_TAGEPLAN,
  letzteKW: null,
  vorname: '',
  nachname: '',
  anrede: '',
  klassenbezeichnung: '',
  klassenvorstand: true,
  motto: 'Lernen mit Freude ✨',
  theme: 'classic_light',
  faecher: FAECHER_ALLE,
  morningWidgets: DEFAULT_MORNING_WIDGETS,
  stammplan: {},
  sitzplan_schueler: {},
  sitzplan_objekte: [],
  orga_listen: [],
  sue_kontrolle: {},
  gruppen: [],
  schueler: [],
  noten: {},
  mitarbeit: {},
  karten: {},
  stimmungsArchiv: [],
  stimmNotizen: [],
  jahresberichte: {},
  wochenrueckblick: null,
  lernzielTracker: {},
  ikmRecords: [],
  klassenglas_completed_missions: [],
  dienste: [],
  backupEinstellungen: { letztesBackup: null, erinnerungAktiv: true },
  pseudonymisierungAktiv: true,
  stundenZeiten: STUNDEN_INFO,
  jahresplanung: {},
  jahresplan_faecher: DEFAULT_YEARLY_SUBJECTS,
  fachConfig: DEFAULT_FACH_COLORS,
  wochenplanung: {},
  firstLogin: true,
  tourAbgeschlossen: false,
  currentPage: 'cockpit',
  previousPage: 'wochenplanung',
  currentKW: getKW(new Date()),
  notenMeta: {},
  notenGewichtung: {},
  stundenentwuerfe: [],
  interaktionsLog: { eintraege: [], wochenEmpfehlung: null },
  elterngespraeche: [],
  notizen: [],
  observations: [],
  journal: [],
  anwesenheit: {},
  anwesenheitDetail: {},
  hueBuch: {},
  awGruende: {},
  verbal: {},
  saAssessments: {},
  klassenglas_count: 0,
  klassenglas_ziel: 20,
  klassenglas_belohnung: 'Gemeinsame Spielzeit',
  ampel_status: 'gruen',
  lehrerProfil: {
    schulstundenJaehrlich: 120,
    schularbeitenManuell: 4,
    testsManuell: 8,
    ausfluegeManuell: 3,
    name: "Maximilian Musterlehrer",
    schule: "Volksschule Musterstadt",
    motto: "Pädagogik mit Herz ❤️",
    gegruendetYear: "2018"
  },
  unterrichtsmodus_sidebar_open: false,
  historicalStudents: DEFAULT_HISTORICAL_STUDENTS,
  klassenkasse: {
    kontostand: 0,
    sammlungen: [],
    transaktionen: []
  },
  statusLog: [],
  settings: { 
    theme: 'light',
    fontFamily: 'standard',
    verhaltenSymbol: 'diamond',
    showVerhaltenOnBoard: true,
    uiScale: 1
  },
  verhalten: {},
  behavior_stages: [
    { id: '1', label: 'Super', color: 'bg-emerald-500', icon: '🌟' },
    { id: '2', label: 'Gut', color: 'bg-blue-500', icon: '❤️' },
    { id: '3', label: 'OK', color: 'bg-slate-400', icon: '😐' },
    { id: '4', label: 'Achtung', color: 'bg-amber-500', icon: '⚠️' },
    { id: '5', label: 'Stopp', color: 'bg-rose-500', icon: '🚫' }
  ],
  behavior_default_stage_id: '3',
  behavior_status: {},
  behavior_notes: {},
  behavior_class_note: '',
  behavior_rules: '',
  quickLinks: [
    { id: '1', label: 'YouTube', url: 'https://youtube.com', icon: 'youtube', color: 'rose' },
    { id: '2', label: 'Kahoot', url: 'https://kahoot.it', icon: 'gamepad', color: 'emerald' },
    { id: '3', label: 'Gemini', url: 'https://gemini.google.com', icon: 'zap', color: 'indigo' },
    { id: '4', label: 'Antolin', url: 'https://antolin.westermann.de/', icon: 'link', color: 'sky' },
    { id: '5', label: 'Anton.app', url: 'https://anton.app/', icon: 'link', color: 'indigo' }
  ],
  schuelerNotizen: {},
  morgenAufgaben: [],
  tempQrValue: 'https://google.at',
  cockpitTheme: 'dark',
  sidebarState: 'full',
  ampelLabels: { red: 'Stopp', yellow: 'Vorbereiten', green: 'Arbeiten' },
  notenLabels: {
    sa: 'Schularbeiten',
    lzk: 'Lernzielkontrollen',
    wp: 'Wochenplan',
    obj: 'Aufgaben/Objekte',
    mi: 'Mitarbeit'
  },
  lessonFocus: '',
  lessonMaterials: [],
  boardSettings: {
    showAmpel: true,
    showKlassenglas: true,
    showTimer: true,
    showLottowinner: true,
    showArbeitsauftrag: true,
    timerRunning: false,
    timerEnd: 0,
    boardFontFamily: 'sans',
    boardFontSize: 64,
    boardTextAlign: 'left',
    boardTextColor: 'text-white/90',
    timerType: 'digital',
    studentNameStyle: 'vorname_nachname',
    showStudentEmojiInList: true
  },
  tafelVorlagen: [],
  metaKognitionsProtokolle: [],
  sitzplanRegeln: [],
  lernwoerter: { aktuelleListe: [], kw: 0, archiv: [] }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

function syncActiveClass(state: AppState): AppState {
  if (!state.activeClassId || !state.classes || !Array.isArray(state.classes)) {
    return state;
  }
  const activeIdx = state.classes.findIndex(c => c.id === state.activeClassId);
  if (activeIdx === -1) {
    return state;
  }
  
  const currentClass = state.classes[activeIdx];
  
  const updatedClass = {
    ...currentClass,
    name: state.klassenbezeichnung,
    stufe: state.stufe,
    klassenvorstand: state.klassenvorstand,
    schuljahr: state.schuljahr,
    schueler: state.schueler ? JSON.parse(JSON.stringify(state.schueler)) : [],
    noten: state.noten ? JSON.parse(JSON.stringify(state.noten)) : {},
    mitarbeit: state.mitarbeit ? JSON.parse(JSON.stringify(state.mitarbeit)) : {},
    verhalten: state.verhalten ? { ...state.verhalten } : {},
    karten: state.karten ? JSON.parse(JSON.stringify(state.karten)) : {},
    jahresplanung: state.jahresplanung ? JSON.parse(JSON.stringify(state.jahresplanung)) : {},
    jahresplan_faecher: state.jahresplan_faecher ? [...state.jahresplan_faecher] : undefined,
    wochenplanung: state.wochenplanung ? JSON.parse(JSON.stringify(state.wochenplanung)) : {},
    scheduleAnalysis: state.scheduleAnalysis ? JSON.parse(JSON.stringify(state.scheduleAnalysis)) : undefined,
    stammplan: state.stammplan ? JSON.parse(JSON.stringify(state.stammplan)) : {},
    anwesenheit: state.anwesenheit ? JSON.parse(JSON.stringify(state.anwesenheit)) : {},
    anwesenheitDetail: state.anwesenheitDetail ? JSON.parse(JSON.stringify(state.anwesenheitDetail)) : undefined,
    dienste: state.dienste ? JSON.parse(JSON.stringify(state.dienste)) : undefined,
    saAssessments: state.saAssessments ? JSON.parse(JSON.stringify(state.saAssessments)) : {},
    klassenglas_count: state.klassenglas_count,
    klassenglas_ziel: state.klassenglas_ziel,
    klassenglas_belohnung: state.klassenglas_belohnung,
    klassenglas_missions: state.klassenglas_missions,
    klassenglas_completed_missions: state.klassenglas_completed_missions,
    klassenkasse: state.klassenkasse ? JSON.parse(JSON.stringify(state.klassenkasse)) : undefined,
    behavior_status: state.behavior_status ? { ...state.behavior_status } : {},
    behavior_notes: state.behavior_notes ? { ...state.behavior_notes } : {},
    stundenZeiten: state.stundenZeiten ? { ...state.stundenZeiten } : {},
    sue_kontrolle: state.sue_kontrolle ? JSON.parse(JSON.stringify(state.sue_kontrolle)) : {},
    lastGroups: state.lastGroups,
    sitzplan_schueler: state.sitzplan_schueler ? JSON.parse(JSON.stringify(state.sitzplan_schueler)) : {},
    sitzplan_objekte: state.sitzplan_objekte ? JSON.parse(JSON.stringify(state.sitzplan_objekte)) : [],
    tageplan: state.tageplan ? JSON.parse(JSON.stringify(state.tageplan)) : undefined,
    faecher: state.faecher ? [...state.faecher] : undefined,
    fachConfig: state.fachConfig ? JSON.parse(JSON.stringify(state.fachConfig)) : undefined,
    theme: state.theme,
    customBgColor: state.customBgColor,
    customAccentColor: state.customAccentColor,
    customTextColor: state.customTextColor,
    customText2Color: state.customText2Color,
    settings: state.settings ? JSON.parse(JSON.stringify(state.settings)) : undefined
  };

  const classes = [...state.classes];
  classes[activeIdx] = updatedClass;
  
  return {
    ...state,
    classes
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [app, setAppInternal] = useState<AppState>(initialAppState);
  
  const setApp = React.useCallback((val: React.SetStateAction<AppState>) => {
    setAppInternal(prev => {
      const nextRaw = typeof val === 'function' ? (val as any)(prev) : val;
      return syncActiveClass(nextRaw);
    });
  }, []);
  const [isLoaded, setIsLoaded] = useState(false);
  const [screenLocked, setScreenLocked] = useState(false);

  useEffect(() => {
    const loadState = async () => {
      try {
        let saved = await localforage.getItem<string>(STORAGE_KEY);
        
        if (!saved) {
          // Robust multi-source state retrieval for complete offline resilience & rollback redundancy
          saved = localStorage.getItem(STORAGE_KEY) || 
                  sessionStorage.getItem(STORAGE_KEY + '_temp') ||
                  localStorage.getItem(STORAGE_KEY + '_backup') ||
                  localStorage.getItem(STORAGE_KEY + '_fallback') ||
                  localStorage.getItem('schulplan_state') ||
                  localStorage.getItem('appState') ||
                  localStorage.getItem('lm_v1_prod');
        }
      
        if (!saved) {
          setApp(initialAppState);
          setIsLoaded(true);
          return;
        }
        
        let parsed;
        try {
          parsed = JSON.parse(saved);
        } catch (e) {
          try {
            const decompressed = LZString.decompressFromUTF16(saved) || LZString.decompress(saved);
            if (decompressed) {
              parsed = JSON.parse(decompressed);
            } else {
              throw new Error('Decompression returned empty string');
            }
          } catch (decompressError) {
            console.error('Failed to parse primary state, attempting backup sources...', decompressError);
            // Attempt parsing backups directly
            const backup = localStorage.getItem(STORAGE_KEY + '_backup') || localStorage.getItem(STORAGE_KEY + '_fallback');
            if (backup) {
              try {
                const decompressedBackup = LZString.decompressFromUTF16(backup) || LZString.decompress(backup) || backup;
                parsed = JSON.parse(decompressedBackup);
                console.log('Successfully recovered state from backup source!');
              } catch (backupParseError) {
                console.error('Failed to parse backup sources too:', backupParseError);
                setApp(initialAppState);
                setIsLoaded(true);
                return;
              }
            } else {
              setApp(initialAppState);
              setIsLoaded(true);
              return;
            }
          }
        }

        parsed = {
          ...initialAppState,
          ...parsed,
          interaktionsLog: parsed.interaktionsLog ?? { eintraege: [], wochenEmpfehlung: null },
          ipsativeGewichtung: parsed.ipsativeGewichtung ?? 70,
          tourAbgeschlossen: parsed.tourAbgeschlossen ?? (parsed.schueler?.length > 0 || parsed.klassen?.length > 0 || parsed.classes?.length > 0 ? true : false),
          stimmNotizen: parsed.stimmNotizen ?? [],
          jahresberichte: parsed.jahresberichte ?? {},
          wochenrueckblick: parsed.wochenrueckblick ?? null,
          lernzielTracker: parsed.lernzielTracker ?? {},
          differenzierungsGruppen: parsed.differenzierungsGruppen ?? [],
          ikmRecords: parsed.ikmRecords ?? [],
          klassenglas_completed_missions: parsed.klassenglas_completed_missions ?? [],
          dienste: parsed.dienste ?? [],
          backupEinstellungen: parsed.backupEinstellungen ?? { letztesBackup: null, erinnerungAktiv: true },
        };
        
        // Migration: Multi-Class Support
        if (!parsed.classes || !Array.isArray(parsed.classes) || parsed.classes.length === 0) {
          const defaultClassId = 'default-' + Math.random().toString(36).substring(2, 9);
          const defaultClass: any = {
            id: defaultClassId,
            name: parsed.klassenbezeichnung || 'Meine Klasse',
            stufe: parsed.stufe !== undefined ? Number(parsed.stufe) : 4,
            klassenvorstand: parsed.klassenvorstand !== undefined ? parsed.klassenvorstand : true,
            schueler: parsed.schueler || [],
            noten: parsed.noten || {},
            mitarbeit: parsed.mitarbeit || {},
            verhalten: parsed.verhalten || {},
            karten: parsed.karten || {},
            jahresplanung: parsed.jahresplanung || {},
            jahresplan_faecher: parsed.jahresplan_faecher || DEFAULT_YEARLY_SUBJECTS,
            wochenplanung: parsed.wochenplanung || {},
            stammplan: parsed.stammplan || {},
            anwesenheit: parsed.anwesenheit || {},
            anwesenheitDetail: parsed.anwesenheitDetail || {},
            dienste: parsed.dienste || [],
            saAssessments: parsed.saAssessments || {},
            klassenglas_count: parsed.klassenglas_count || 0,
            klassenglas_ziel: parsed.klassenglas_ziel || 20,
            klassenglas_belohnung: parsed.klassenglas_belohnung || 'Gemeinsame Spielzeit',
            klassenkasse: parsed.klassenkasse || { kontostand: 0, sammlungen: [], transaktionen: [] },
            behavior_status: parsed.behavior_status || {},
            behavior_notes: parsed.behavior_notes || {},
            sue_kontrolle: parsed.sue_kontrolle || {},
            sitzplan_schueler: parsed.sitzplan_schueler || {},
            sitzplan_objekte: parsed.sitzplan_objekte || [],
            tageplan: parsed.tageplan || DEFAULT_TAGEPLAN,
            faecher: parsed.faecher || FAECHER_ALLE,
            fachConfig: parsed.fachConfig || DEFAULT_FACH_COLORS
          };
          parsed.classes = [defaultClass];
          parsed.activeClassId = defaultClassId;
        }

        // Sanitize and normalize ALL classes in classes array to have all essential properties
        if (parsed.classes && Array.isArray(parsed.classes)) {
          parsed.classes = parsed.classes.map((c: any) => {
            if (!c || typeof c !== 'object') return null;
            return {
              id: c.id || 'class-' + Math.random().toString(36).substring(2, 9),
              name: c.name || 'Meine Klasse',
              stufe: c.stufe !== undefined ? Number(c.stufe) : 4,
              klassenvorstand: c.klassenvorstand !== undefined ? c.klassenvorstand : true,
              schueler: c.schueler || [],
              noten: c.noten || {},
              mitarbeit: c.mitarbeit || {},
              verhalten: c.verhalten || {},
              karten: c.karten || {},
              jahresplanung: c.jahresplanung || {},
              jahresplan_faecher: c.jahresplan_faecher || DEFAULT_YEARLY_SUBJECTS,
              wochenplanung: c.wochenplanung || {},
              stammplan: c.stammplan || {},
              anwesenheit: c.anwesenheit || {},
              anwesenheitDetail: c.anwesenheitDetail || {},
              dienste: c.dienste || [],
              saAssessments: c.saAssessments || {},
              klassenglas_count: c.klassenglas_count !== undefined ? Number(c.klassenglas_count) : 0,
              klassenglas_ziel: c.klassenglas_ziel !== undefined ? Number(c.klassenglas_ziel) : 20,
              klassenglas_belohnung: c.klassenglas_belohnung || 'Gemeinsame Spielzeit',
              klassenkasse: c.klassenkasse || { kontostand: 0, sammlungen: [], transaktionen: [] },
              behavior_status: c.behavior_status || {},
              behavior_notes: c.behavior_notes || {},
              sue_kontrolle: c.sue_kontrolle || {},
              sitzplan_schueler: c.sitzplan_schueler || {},
              sitzplan_objekte: c.sitzplan_objekte || [],
              tageplan: c.tageplan || DEFAULT_TAGEPLAN,
              faecher: c.faecher || FAECHER_ALLE,
              fachConfig: c.fachConfig || DEFAULT_FACH_COLORS,
              theme: c.theme || 'classic_light',
              schuljahr: c.schuljahr || parsed.schuljahr || getCurrentSchuljahr(),
              settings: c.settings || {}
            };
          }).filter(Boolean);
        }

        // Ensure activeClassId is valid and exists
        let activeClass = parsed.classes?.find((c: any) => c.id === parsed.activeClassId);
        if (!activeClass && parsed.classes && parsed.classes.length > 0) {
          activeClass = parsed.classes[0];
          parsed.activeClassId = activeClass.id;
        }

        // Write current active class properties back to root of parsed state
        if (activeClass) {
          parsed.klassenbezeichnung = activeClass.name;
          parsed.stufe = activeClass.stufe;
          parsed.klassenvorstand = activeClass.klassenvorstand;
          parsed.schueler = activeClass.schueler;
          parsed.noten = activeClass.noten;
          parsed.mitarbeit = activeClass.mitarbeit;
          parsed.verhalten = activeClass.verhalten;
          parsed.karten = activeClass.karten;
          parsed.jahresplanung = activeClass.jahresplanung;
          parsed.jahresplan_faecher = activeClass.jahresplan_faecher || DEFAULT_YEARLY_SUBJECTS;
          parsed.wochenplanung = activeClass.wochenplanung;
          parsed.stammplan = activeClass.stammplan;
          parsed.anwesenheit = activeClass.anwesenheit;
          parsed.anwesenheitDetail = activeClass.anwesenheitDetail;
          parsed.dienste = activeClass.dienste;
          parsed.saAssessments = activeClass.saAssessments;
          parsed.klassenglas_count = activeClass.klassenglas_count;
          parsed.klassenglas_ziel = activeClass.klassenglas_ziel;
          parsed.klassenglas_belohnung = activeClass.klassenglas_belohnung;
          parsed.klassenkasse = activeClass.klassenkasse;
          parsed.behavior_status = activeClass.behavior_status;
          parsed.behavior_notes = activeClass.behavior_notes;
          parsed.sue_kontrolle = activeClass.sue_kontrolle;
          parsed.sitzplan_schueler = activeClass.sitzplan_schueler;
          parsed.sitzplan_objekte = activeClass.sitzplan_objekte;
          parsed.tageplan = activeClass.tageplan;
          parsed.faecher = activeClass.faecher;
          parsed.fachConfig = activeClass.fachConfig;
          parsed.theme = activeClass.theme;
          parsed.schuljahr = activeClass.schuljahr || parsed.schuljahr || getCurrentSchuljahr();
        }
        
        // Update missing settings
        parsed.morningWidgets = parsed.morningWidgets || DEFAULT_MORNING_WIDGETS;

        parsed.lehrerProfil = parsed.lehrerProfil || {
          schulstundenJaehrlich: 120,
          schularbeitenManuell: 4,
          testsManuell: 8,
          ausfluegeManuell: 3,
          name: parsed.anrede && parsed.nachname ? `${parsed.anrede} ${parsed.nachname}` : "Maximilian Musterlehrer",
          schule: parsed.schulName || "Volksschule Musterstadt",
          motto: parsed.motto || "Pädagogik mit Herz ❤️",
          gegruendetYear: "2018"
        };

        // Migration: Handle legacy string icons in behavior_stages
        const iconMap: Record<string, string> = {
          'star': '🌟',
          'heart': '❤️',
          'love': '❤️',
          'smile': '😊',
          'minus': '😐',
          'alert-triangle': '⚠️',
          'x-circle': '🚫'
        };

        if (parsed.behavior_stages && Array.isArray(parsed.behavior_stages)) {
          parsed.behavior_stages = parsed.behavior_stages.map((stage: any) => ({
            ...stage,
            icon: (stage.icon && iconMap[stage.icon.toLowerCase()]) ? iconMap[stage.icon.toLowerCase()] : stage.icon
          }));
        }

        // Migration: Handle new notes consolidation (Schritt 2)
        if (!parsed.notes) {
          const migratedNotes: any[] = [];
          
          // Migrate old 'notizen'
          if (parsed.notizen && Array.isArray(parsed.notizen)) {
            parsed.notizen.forEach((n: any) => {
              migratedNotes.push({
                id: n.id,
                datum: new Date(n.timestamp || Date.now()).toISOString(),
                kategorie: n.schuelerId ? 'Verhalten' : 'Journal',
                inhalt: n.inhalt || '',
                schuelerId: n.schuelerId,
                icon: n.icon || '📝'
              });
            });
          }
          
          // Migrate old 'observations'
          if (parsed.observations && Array.isArray(parsed.observations)) {
            parsed.observations.forEach((o: any) => {
              const catMap: Record<string, string> = {
                'behavior': 'Verhalten',
                'academic': 'allgemein',
                'social': 'allgemein',
                'incident': 'Verhalten',
                'praise': 'Erfolg',
                'reflexion': 'reflexion'
              };
              migratedNotes.push({
                id: o.id,
                datum: o.date || new Date().toISOString(),
                kategorie: catMap[o.category] || 'Journal',
                inhalt: o.text || '',
                schuelerId: o.studentId,
                quelle: o.source
              });
            });
          }

          // Migrate old 'journal' (if the previous turn already migrated but called it journal)
          if (parsed.journal && Array.isArray(parsed.journal)) {
            parsed.journal.forEach((j: any) => {
               // Avoid duplicates if they were already migrated from notizen/observations
               if (!migratedNotes.find(m => m.id === j.id)) {
                  migratedNotes.push(j);
               }
            });
          }
          
          parsed.notes = migratedNotes.sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime());
        }

        const schuelerExist = parsed.schueler && parsed.schueler.length > 0;
        const computedTourAbgeschlossen = schuelerExist ? true : (parsed.tourAbgeschlossen ?? false);

        setApp({
          ...initialAppState,
          ...parsed,
          bundesland: parsed.bundesland || 'VBG',
          tourAbgeschlossen: computedTourAbgeschlossen,
          historicalStudents: parsed.historicalStudents || DEFAULT_HISTORICAL_STUDENTS,
          notes: parsed.notes || [],
          settings: { ...initialAppState.settings, ...(parsed.settings || {}) },
          boardSettings: { ...initialAppState.boardSettings, ...(parsed.boardSettings || {}) },
          klassenkasse: { ...initialAppState.klassenkasse, ...(parsed.klassenkasse || {}) },
          ampelLabels: { ...initialAppState.ampelLabels, ...(parsed.ampelLabels || {}) },
          jahresplan_faecher: parsed.jahresplan_faecher || initialAppState.jahresplan_faecher,
          sitzplanRegeln: parsed.sitzplanRegeln || [],
          metaKognitionsProtokolle: parsed.metaKognitionsProtokolle || [],
          lernwoerter: parsed.lernwoerter || { aktuelleListe: [], kw: 0, archiv: [] }
        });
        
        // --- Notfallkopie Logik ---
        try {
          const todayDate = new Date().toISOString().split('T')[0];
          const lastKopieDate = localStorage.getItem('hehle_v3_notfallkopie_date');
          
          if (lastKopieDate !== todayDate) {
            try {
              localStorage.setItem('hehle_v3_notfallkopie', JSON.stringify(parsed));
              localStorage.setItem('hehle_v3_notfallkopie_date', todayDate);
              localStorage.setItem('hehle_v3_notfallkopie_time', new Date().toLocaleString('de-DE'));
            } catch (e: any) {
              if (e.name === 'QuotaExceededError' || e.message.includes('quota')) {
                console.warn('Quota exceeded for Notfallkopie. Removing old copy and skipping for today.');
                localStorage.removeItem('hehle_v3_notfallkopie');
                localStorage.removeItem('hehle_v3_notfallkopie_date');
                localStorage.removeItem('hehle_v3_notfallkopie_time');
              } else {
                throw e;
              }
            }
          }
        } catch (e) {
          console.warn('Error saving Notfallkopie:', e);
        }
        
      } catch (e) {
        console.error("Error loading state from offline storage", e);
        setApp(initialAppState);
      } finally {
        setIsLoaded(true);
      }
    };

    loadState();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    
    // Debounce the state compression and local storage save to prevent UI blocking
    const timeout = setTimeout(async () => {
      try {
        const serialized = JSON.stringify(app);
        
        // Fast sessionStorage fallback to handle quick reloads or single-session crashes
        try {
          sessionStorage.setItem(STORAGE_KEY + '_temp', serialized);
        } catch (e) {
          // Safe check for private browsing mode limitations
        }

        // Save to IndexedDB (asynchronous, no strict quota limitations!)
        await localforage.setItem(STORAGE_KEY, serialized);

        // Compress and save backups to localStorage directly without another timeout 
        try {
          const compressed = LZString.compressToUTF16(serialized);
          localStorage.setItem(STORAGE_KEY + '_backup', compressed);
          // Standard JSON string format as final emergency recovery option
          localStorage.setItem(STORAGE_KEY + '_fallback', serialized);
        } catch (backupError) {
          console.warn('Backup save storage quota limit reached, maintaining primary storage.', backupError);
        }

        try {
          const schuelerNamen = [
            ...(app.schueler || []),
            ...((app.classes || []).flatMap(c => c.schueler || []))
          ].map(s => ({ id: s.id, vorname: s.vorname, nachname: s.nachname, name: (s as any).name }));
          localStorage.setItem('hehle_v3_namen', JSON.stringify({
            schueler: schuelerNamen,
            schule: app.lehrerProfil?.schule || '',
            pseudonymisierungAktiv: app.pseudonymisierungAktiv !== false
          }));
        } catch (e) { console.warn('Namensliste schreiben fehlgeschlagen', e); }
      } catch (e) {
        console.error('Failed to save state to localforage or localStorage:', e);
      }
    }, 1000); // 1000ms debounce

    return () => clearTimeout(timeout);
  }, [app, isLoaded]);

  // Tab Close & Refresh Intercept: Ensure synced / pending changes are secured
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isPendingPushRef.current) {
        const message = 'Deine Daten werden gerade im Hintergrund mit der Cloud synchronisiert. Bitte warte einen Moment, um keinen Arbeitsfortschritt zu verlieren!';
        e.returnValue = message;
        return message;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Check for weekly reset
  useEffect(() => {
    const currentKW = getKW(new Date());
    if (app.letzteKW !== null && app.letzteKW !== currentKW) {
      const newKarten = { ...app.karten };
      app.schueler.forEach(s => {
        const k = newKarten[s.id] || { gelb: 0, rot: 0, archiv: [] };
        if (k.gelb > 0) {
          k.archiv = [...(k.archiv || []), { kw: app.letzteKW, gelb: k.gelb }];
        }
        k.gelb = 0;
        newKarten[s.id] = k;
      });
      setApp(prev => ({ ...prev, letzteKW: currentKW, karten: newKarten }));
    } else if (app.letzteKW === null) {
      setApp(prev => ({ ...prev, letzteKW: currentKW }));
    }
  }, [app.letzteKW, app.schueler]);

  const lastSeenTimestampRef = useRef<number>(0);
  const lastSeenStateRef = useRef<any>(null);
  const isPendingPushRef = useRef<boolean>(false);
  const currentAppRef = useRef<any>(app);

  useEffect(() => {
    currentAppRef.current = app;
  }, [app]);

  // 1) Startup URL query sync session check
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const code = query.get('sync');
    const gabicRole = query.get('gabicRole'); // either 'child' or 'teacher' or null
    
    if (code) {
      console.log("[Sync Startup] Found sync parameter in URL:", code);
      fetch(`/api/sync/${code}`)
        .then(res => {
          if (!res.ok) throw new Error("Sync status error: " + res.status);
          return res.json();
        })
        .then(data => {
          if (data && data.state) {
            console.log("[Sync Startup] Connected to session and loaded state for:", code);
            lastSeenTimestampRef.current = data.lastUpdated || 0;
            lastSeenStateRef.current = data.state;
            setApp({
              ...data.state,
              boardSettings: {
                ...data.state.boardSettings,
                activeSyncCode: code,
                isRemoteController: gabicRole === 'child' ? false : true, // Only regular remote controller if not a child
                gabicRole: gabicRole || undefined
              }
            });
            // Clear URL search params without refreshing so they can refresh/copy standard links
            const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.replaceState({ path: newUrl }, '', newUrl);
          }
        })
        .catch(err => {
          console.error("[Sync Startup] Error joining sync session:", err);
        });
    }
  }, []);

  const activeSyncCode = app.boardSettings?.activeSyncCode;
  const isRemoteController = app.boardSettings?.isRemoteController;

  // Helper helper to deeply check if state is structural identical excluding specific sync fields
  const areStatesEqual = (stateA: any, stateB: any) => {
    if (!stateA || !stateB) return false;
    const cleanA = {
      ...stateA,
      boardSettings: {
        ...stateA.boardSettings,
        activeSyncCode: undefined,
        isRemoteController: undefined,
        gabicRole: undefined
      }
    };
    const cleanB = {
      ...stateB,
      boardSettings: {
        ...stateB.boardSettings,
        activeSyncCode: undefined,
        isRemoteController: undefined,
        gabicRole: undefined
      }
    };
    return JSON.stringify(cleanA) === JSON.stringify(cleanB);
  };

  // 2) Pull effect (polls the backend to check if another device pushed an update)
  useEffect(() => {
    if (!activeSyncCode) return;
    
    let active = true;
    let fallbackTimer: NodeJS.Timeout;
    
    const poll = async () => {
      // If we are currently pushing or have debounced local modifications, skip pulling
      if (isPendingPushRef.current) {
        if (active) {
          fallbackTimer = setTimeout(poll, 1500);
        }
        return;
      }

      try {
        const res = await fetch(`/api/sync/${activeSyncCode}`);
        if (res.status === 404) {
          console.warn("[Sync BiDirect] Session not found or expired on server (404). Disconnecting...");
          setApp(prev => ({
            ...prev,
            boardSettings: {
              ...prev.boardSettings,
              activeSyncCode: undefined,
              isRemoteController: undefined
            }
          }));
          return;
        }
        if (!res.ok) throw new Error("Sync failure");
        const data = await res.json();
        
        if (active && data && data.state && !isPendingPushRef.current) {
          // If the server has a newer timestamp
          if (data.lastUpdated > lastSeenTimestampRef.current) {
            // Check if there is structurally a difference between local and server states
            const currentLocal = currentAppRef.current;
            if (!areStatesEqual(currentLocal, data.state)) {
              console.log("[Sync BiDirect] Structural change received from server. Updating...");
              lastSeenTimestampRef.current = data.lastUpdated;
              lastSeenStateRef.current = data.state;
              
              setApp(prev => {
                const localSyncCode = prev.boardSettings?.activeSyncCode;
                const localIsRemote = prev.boardSettings?.isRemoteController;
                return {
                  ...data.state,
                  boardSettings: {
                    ...data.state.boardSettings,
                    activeSyncCode: localSyncCode,
                    isRemoteController: localIsRemote,
                    remoteLastActiveTs: Date.now()
                  }
                };
              });
            } else {
              // Same content, just update the timestamp to match
              lastSeenTimestampRef.current = data.lastUpdated;
              setApp(prev => ({
                ...prev,
                boardSettings: {
                  ...prev.boardSettings,
                  remoteLastActiveTs: Date.now()
                }
              }));
            }
          }
        }
      } catch (err) {
        console.warn("[Sync BiDirect] Polling error:", err);
      } finally {
        if (active) {
          fallbackTimer = setTimeout(poll, 1500);
        }
      }
    };
    
    poll();
    
    return () => {
      active = false;
      clearTimeout(fallbackTimer);
    };
  }, [activeSyncCode]);

  // 3) Push effect (pushes any local modifications to the backend)
  useEffect(() => {
    if (!activeSyncCode) return;
    
    // Check if local state is actually different from last seen/sent state
    const currentLocal = app;
    const lastSeen = lastSeenStateRef.current;
    
    if (lastSeen && areStatesEqual(currentLocal, lastSeen)) {
      // No structural difference, skip going to server
      return;
    }

    // Mark as pending push to lock the pulling effect while we push
    isPendingPushRef.current = true;
    
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sync/${activeSyncCode}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ state: app })
        });
        if (res.status === 404) {
          console.warn("[Sync BiDirect] Pushed to an expired/missing session (404). Disconnecting...");
          setApp(prev => ({
            ...prev,
            boardSettings: {
              ...prev.boardSettings,
              activeSyncCode: undefined,
              isRemoteController: undefined
            }
          }));
          return;
        }
        if (!res.ok) throw new Error("Sync PUT error: " + res.status);
        const data = await res.json();
        if (data && data.lastUpdated) {
          console.log("[Sync BiDirect] Local state pushed and synced. TS:", data.lastUpdated);
          lastSeenTimestampRef.current = data.lastUpdated;
          lastSeenStateRef.current = app; // Save pushed state reference
          isPendingPushRef.current = false;
        }
      } catch (err) {
        console.error("[Sync BiDirect] Sync pushing error:", err);
        isPendingPushRef.current = false;
      }
    }, 400); // 400ms debounce
    
    return () => clearTimeout(delayDebounce);
  }, [app, activeSyncCode]);

  const [notenUpdateTrigger, setNotenUpdateTrigger] = useState<number>(0);

  const triggerGradebookUpdate = React.useCallback(() => {
    setNotenUpdateTrigger(prev => prev + 1);
    notenSyncService.broadcastUpdate();
  }, []);

  // Automatically trigger sync event globally when app.noten or app.mitarbeit object reference changes
  useEffect(() => {
    triggerGradebookUpdate();
  }, [app.noten, app.mitarbeit, triggerGradebookUpdate]);

  const updateApp = React.useCallback((changes: Partial<AppState>) => {
    setApp(prev => ({ ...prev, ...changes }));
  }, []);

  const saveApp = React.useCallback(async () => {
    try {
      const serialized = JSON.stringify(app);
      await localforage.setItem(STORAGE_KEY, serialized);
      const compressed = LZString.compressToUTF16(serialized);
      localStorage.setItem(STORAGE_KEY, compressed);
    } catch (e) {
      console.error('Failed to save to localforage/localStorage:', e);
    }
  }, [app]);

  const updateStudent = React.useCallback((student: Student) => {
    setApp(prev => {
      const schueler = [...prev.schueler];
      const idx = schueler.findIndex(s => s.id === student.id);
      if (idx >= 0) schueler[idx] = student;
      else schueler.push(student);
      return { ...prev, schueler };
    });
  }, []);

  const deleteStudent = React.useCallback((id: string) => {
    setApp(prev => ({
      ...prev,
      schueler: prev.schueler.filter(s => s.id !== id),
      noten: { ...prev.noten, [id]: undefined } as any,
      mitarbeit: { ...prev.mitarbeit, [id]: undefined } as any,
      karten: { ...prev.karten, [id]: undefined } as any,
    }));
  }, []);

  const setPage = React.useCallback((page: string) => {
    setApp(prev => {
      if (prev.currentPage === page) return prev;
      const previousPage = prev.currentPage && prev.currentPage !== 'cockpit'
        ? prev.currentPage
        : prev.previousPage || 'wochenplanung';
      return {
        ...prev,
        previousPage,
        currentPage: page,
      };
    });
  }, []);

  const switchClass = React.useCallback((id: string) => {
    setApp(prev => {
      // 1. Snapshot current active class back into classes array
      const classes = [...(prev.classes || [])];
      const activeIdx = classes.findIndex(c => c.id === prev.activeClassId);
      
      if (activeIdx !== -1) {
        classes[activeIdx] = {
          ...classes[activeIdx],
          name: prev.klassenbezeichnung,
          stufe: prev.stufe,
          klassenvorstand: prev.klassenvorstand,
          schueler: prev.schueler ? JSON.parse(JSON.stringify(prev.schueler)) : [],
          noten: prev.noten ? JSON.parse(JSON.stringify(prev.noten)) : {},
          mitarbeit: prev.mitarbeit ? JSON.parse(JSON.stringify(prev.mitarbeit)) : {},
          verhalten: prev.verhalten ? JSON.parse(JSON.stringify(prev.verhalten)) : {},
          karten: prev.karten ? JSON.parse(JSON.stringify(prev.karten)) : {},
          jahresplanung: prev.jahresplanung ? JSON.parse(JSON.stringify(prev.jahresplanung)) : {},
          jahresplan_faecher: prev.jahresplan_faecher,
          wochenplanung: prev.wochenplanung ? JSON.parse(JSON.stringify(prev.wochenplanung)) : {},
          stammplan: prev.stammplan ? JSON.parse(JSON.stringify(prev.stammplan)) : {},
          anwesenheit: prev.anwesenheit,
          anwesenheitDetail: prev.anwesenheitDetail,
          dienste: prev.dienste,
          klassenglas_count: prev.klassenglas_count,
          klassenglas_ziel: prev.klassenglas_ziel,
          klassenglas_belohnung: prev.klassenglas_belohnung,
          klassenkasse: prev.klassenkasse,
          behavior_status: prev.behavior_status,
          behavior_notes: prev.behavior_notes,
          sue_kontrolle: prev.sue_kontrolle,
          sitzplan_schueler: prev.sitzplan_schueler,
          sitzplan_objekte: prev.sitzplan_objekte,
          lastGroups: prev.lastGroups,
          stundenZeiten: prev.stundenZeiten,
          tageplan: prev.tageplan ? JSON.parse(JSON.stringify(prev.tageplan)) : undefined,
          faecher: prev.faecher ? [...prev.faecher] : undefined,
          fachConfig: prev.fachConfig ? JSON.parse(JSON.stringify(prev.fachConfig)) : undefined,
          theme: prev.theme,
          customBgColor: prev.customBgColor,
          customAccentColor: prev.customAccentColor,
          customTextColor: prev.customTextColor,
          customText2Color: prev.customText2Color,
          settings: prev.settings ? JSON.parse(JSON.stringify(prev.settings)) : undefined,
          schuljahr: prev.schuljahr
        };
      }

      // 2. Find target class
      const targetClass = classes.find(c => c.id === id);
      if (!targetClass) return prev;

      // 3. Set target class data to root level
      const currentLoc = prev.currentPage || 'cockpit';
      const forceCockpit = !targetClass.klassenvorstand && ['orga', 'uebergabemappe', 'diagnostik', 'kel'].includes(currentLoc);

      return {
        ...prev,
        currentPage: forceCockpit ? 'cockpit' : currentLoc,
        activeClassId: id,
        classes,
        klassenbezeichnung: targetClass.name,
        stufe: targetClass.stufe,
        klassenvorstand: targetClass.klassenvorstand,
        schuljahr: targetClass.schuljahr || prev.schuljahr || '2024/25',
        schueler: targetClass.schueler ? JSON.parse(JSON.stringify(targetClass.schueler)) : [],
        noten: targetClass.noten,
        mitarbeit: targetClass.mitarbeit,
        verhalten: targetClass.verhalten,
        karten: targetClass.karten,
        jahresplanung: targetClass.jahresplanung,
        jahresplan_faecher: targetClass.jahresplan_faecher || DEFAULT_YEARLY_SUBJECTS,
        wochenplanung: targetClass.wochenplanung ? JSON.parse(JSON.stringify(targetClass.wochenplanung)) : {},
        stammplan: targetClass.stammplan ? JSON.parse(JSON.stringify(targetClass.stammplan)) : {},
        anwesenheit: targetClass.anwesenheit,
        anwesenheitDetail: targetClass.anwesenheitDetail,
        dienste: targetClass.dienste || [],
        klassenglas_count: targetClass.klassenglas_count,
        klassenglas_ziel: targetClass.klassenglas_ziel,
        klassenglas_belohnung: targetClass.klassenglas_belohnung || 'Gemeinsame Spielzeit',
        klassenkasse: targetClass.klassenkasse || { kontostand: 0, sammlungen: [], transaktionen: [] },
        behavior_status: targetClass.behavior_status || {},
        behavior_notes: targetClass.behavior_notes || {},
        sue_kontrolle: targetClass.sue_kontrolle || {},
        sitzplan_schueler: targetClass.sitzplan_schueler || {},
        sitzplan_objekte: targetClass.sitzplan_objekte || [],
        lastGroups: targetClass.lastGroups,
        stundenZeiten: targetClass.stundenZeiten || STUNDEN_INFO,
        tageplan: targetClass.tageplan || prev.tageplan || DEFAULT_TAGEPLAN,
        faecher: targetClass.faecher || prev.faecher || FAECHER_ALLE,
        fachConfig: targetClass.fachConfig || prev.fachConfig || DEFAULT_FACH_COLORS,
        theme: targetClass.theme || prev.theme,
        customBgColor: targetClass.customBgColor || prev.customBgColor,
        customAccentColor: targetClass.customAccentColor || prev.customAccentColor,
        customTextColor: targetClass.customTextColor || prev.customTextColor,
        customText2Color: targetClass.customText2Color || prev.customText2Color,
        settings: targetClass.settings ? JSON.parse(JSON.stringify(targetClass.settings)) : (prev.settings ? JSON.parse(JSON.stringify(prev.settings)) : {})
      };
    });
  }, []);

  const addClass = React.useCallback((name: string, stufe: number, isKV: boolean) => {
    const id = 'class-' + Math.random().toString(36).substring(2, 9);
    setApp(prev => {
      const newClass: any = {
        id,
        name,
        stufe,
        klassenvorstand: isKV,
        schueler: [],
        noten: {},
        mitarbeit: {},
        verhalten: {},
        karten: {},
        jahresplanung: {},
        jahresplan_faecher: DEFAULT_YEARLY_SUBJECTS,
        wochenplanung: {},
        stammplan: {},
        anwesenheit: {},
        anwesenheitDetail: {},
        dienste: [],
        klassenglas_count: 0,
        klassenglas_ziel: 20,
        klassenglas_belohnung: 'Gemeinsame Spielzeit',
        klassenkasse: { kontostand: 0, sammlungen: [], transaktionen: [] },
        behavior_status: {},
        behavior_notes: {},
        sue_kontrolle: {},
        sitzplan_schueler: {},
        sitzplan_objekte: [],
        tageplan: DEFAULT_TAGEPLAN,
        faecher: FAECHER_ALLE,
        fachConfig: DEFAULT_FACH_COLORS,
        theme: 'classic_light',
        settings: { ...initialAppState.settings },
        schuljahr: prev.schuljahr || '2024/25'
      };

      // 1. Snapshot current active class back into classes array
      const classes = [...(prev.classes || [])];
      const activeIdx = classes.findIndex(c => c.id === prev.activeClassId);
      
      if (activeIdx !== -1) {
        classes[activeIdx] = {
          ...classes[activeIdx],
          name: prev.klassenbezeichnung,
          stufe: prev.stufe,
          klassenvorstand: prev.klassenvorstand,
          schueler: prev.schueler ? JSON.parse(JSON.stringify(prev.schueler)) : [],
          noten: prev.noten ? JSON.parse(JSON.stringify(prev.noten)) : {},
          mitarbeit: prev.mitarbeit ? JSON.parse(JSON.stringify(prev.mitarbeit)) : {},
          verhalten: prev.verhalten ? JSON.parse(JSON.stringify(prev.verhalten)) : {},
          karten: prev.karten ? JSON.parse(JSON.stringify(prev.karten)) : {},
          jahresplanung: prev.jahresplanung ? JSON.parse(JSON.stringify(prev.jahresplanung)) : {},
          jahresplan_faecher: prev.jahresplan_faecher,
          wochenplanung: prev.wochenplanung ? JSON.parse(JSON.stringify(prev.wochenplanung)) : {},
          stammplan: prev.stammplan ? JSON.parse(JSON.stringify(prev.stammplan)) : {},
          anwesenheit: prev.anwesenheit,
          anwesenheitDetail: prev.anwesenheitDetail,
          dienste: prev.dienste,
          klassenglas_count: prev.klassenglas_count,
          klassenglas_ziel: prev.klassenglas_ziel,
          klassenglas_belohnung: prev.klassenglas_belohnung,
          klassenkasse: prev.klassenkasse,
          behavior_status: prev.behavior_status,
          behavior_notes: prev.behavior_notes,
          sue_kontrolle: prev.sue_kontrolle,
          sitzplan_schueler: prev.sitzplan_schueler,
          sitzplan_objekte: prev.sitzplan_objekte,
          lastGroups: prev.lastGroups,
          stundenZeiten: prev.stundenZeiten,
          tageplan: prev.tageplan ? JSON.parse(JSON.stringify(prev.tageplan)) : undefined,
          faecher: prev.faecher ? [...prev.faecher] : undefined,
          fachConfig: prev.fachConfig ? JSON.parse(JSON.stringify(prev.fachConfig)) : undefined,
          theme: prev.theme,
          customBgColor: prev.customBgColor,
          customAccentColor: prev.customAccentColor,
          customTextColor: prev.customTextColor,
          customText2Color: prev.customText2Color,
          settings: prev.settings ? JSON.parse(JSON.stringify(prev.settings)) : undefined,
          schuljahr: prev.schuljahr
        };
      }

      // 2. Add new class and switch immediately to it with currentPage: 'setup'
      return {
        ...prev,
        currentPage: 'setup',
        activeClassId: id,
        classes: [...classes, newClass],
        klassenbezeichnung: newClass.name,
        stufe: newClass.stufe,
        klassenvorstand: newClass.klassenvorstand,
        schueler: newClass.schueler ? JSON.parse(JSON.stringify(newClass.schueler)) : [],
        noten: newClass.noten,
        mitarbeit: newClass.mitarbeit,
        verhalten: newClass.verhalten,
        karten: newClass.karten,
        jahresplanung: newClass.jahresplanung,
        jahresplan_faecher: newClass.jahresplan_faecher,
        wochenplanung: newClass.wochenplanung ? JSON.parse(JSON.stringify(newClass.wochenplanung)) : {},
        stammplan: newClass.stammplan ? JSON.parse(JSON.stringify(newClass.stammplan)) : {},
        anwesenheit: newClass.anwesenheit,
        anwesenheitDetail: newClass.anwesenheitDetail,
        dienste: newClass.dienste,
        klassenglas_count: newClass.klassenglas_count,
        klassenglas_ziel: newClass.klassenglas_ziel,
        klassenglas_belohnung: newClass.klassenglas_belohnung || 'Gemeinsame Spielzeit',
        klassenkasse: newClass.klassenkasse,
        behavior_status: newClass.behavior_status,
        behavior_notes: newClass.behavior_notes,
        sue_kontrolle: newClass.sue_kontrolle,
        sitzplan_schueler: newClass.sitzplan_schueler,
        sitzplan_objekte: newClass.sitzplan_objekte,
        lastGroups: undefined,
        stundenZeiten: STUNDEN_INFO,
        tageplan: DEFAULT_TAGEPLAN,
        faecher: FAECHER_ALLE,
        fachConfig: DEFAULT_FACH_COLORS,
        theme: newClass.theme || prev.theme,
        customBgColor: newClass.customBgColor || prev.customBgColor,
        customAccentColor: newClass.customAccentColor || prev.customAccentColor,
        customTextColor: newClass.customTextColor || prev.customTextColor,
        customText2Color: newClass.customText2Color || prev.customText2Color,
        settings: newClass.settings ? JSON.parse(JSON.stringify(newClass.settings)) : (prev.settings ? JSON.parse(JSON.stringify(prev.settings)) : {})
      };
    });
  }, [initialAppState.settings]);

  const removeClass = React.useCallback((id: string) => {
    setApp(prev => {
      if (prev.activeClassId === id) return prev; // Cannot remove active class for now or should switch first
      return {
        ...prev,
        classes: (prev.classes || []).filter(c => c.id !== id)
      };
    });
  }, []);

  const calculateWidgetFontSize = React.useCallback((scale: number): string => {
    // scale is usually between 0.4 and 3.0. We want a proportional rem value so text sizes adjust automatically
    const remValue = scale * 1.35;
    return `${Math.max(0.45, Math.min(3.5, remValue))}rem`;
  }, []);

  const contextValue = React.useMemo(() => ({
    app, 
    setApp, 
    updateApp,
    saveApp, 
    updateStudent, 
    deleteStudent, 
    setPage, 
    switchClass, 
    addClass, 
    removeClass,
    notenUpdateTrigger,
    triggerGradebookUpdate,
    calculateWidgetFontSize,
    screenLocked,
    setScreenLocked
  }), [app, notenUpdateTrigger, calculateWidgetFontSize, screenLocked, updateApp]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 flex-col gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div>
        <p className="text-slate-500 font-medium animate-pulse">Lade Arbeitsbereich...</p>
      </div>
    );
  }

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
