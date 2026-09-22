import type { AppState } from '../types';
import { DEFAULT_TAGEPLAN, FAECHER_ALLE, STUNDEN_INFO, DEFAULT_YEARLY_SUBJECTS, DEFAULT_FACH_COLORS } from '../constants';
import { getCurrentSchuljahr, getKW } from './utils';
import { DEFAULT_MORNING_WIDGETS } from '../data/morningWidgets';
import { sanitizeSeatingRules } from './seatingPlanRules';
import { normalizeKlassenkasse } from './orgaData';
import { normalizeArchivedClasses } from './archiveData';
import { normalizeKelMeetings } from './kelData';
import { normalizeSchulart } from './schularten';

export const initialAppState: AppState = {
  ipsativeGewichtung: 70,
  bundesland: 'VBG',
  schuljahr: getCurrentSchuljahr(),
  activeClassId: '',
  classes: [],
  schulart: 'volksschule',
  stufe: 4,
  lehrplanText: '',
  tageplan: DEFAULT_TAGEPLAN,
  letzteKW: null,
  vorname: '',
  nachname: '',
  anrede: '',
  klassenbezeichnung: '',
  klassenvorstand: true,
  motto: '',
  theme: 'classic_light',
  faecher: FAECHER_ALLE,
  morningWidgets: DEFAULT_MORNING_WIDGETS,
  stammplan: {},
  sitzplan_schueler: {},
  sitzplan_objekte: [],
  sitzplanLayouts: [],
  orga_listen: [],
  customLists: [],
  studentDevelopmentLists: [],
  checklisten: [],
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
  diagnostikErgebnisse: [],
  diagnostikErhebungen: [],
  diagnosticResults: [],
  ikmRecords: [],
  antolinRecords: [],
  schuelerGoals: [],
  klassenglas_completed_missions: [],
  classContracts: [],
  councilNotes: [],
  dienste: [],
  backupEinstellungen: { letztesBackup: null, erinnerungAktiv: true },
  pseudonymisierungAktiv: true,
  stundenZeiten: STUNDEN_INFO,
  jahresplanung: {},
  jahresplan_faecher: DEFAULT_YEARLY_SUBJECTS,
  fachConfig: DEFAULT_FACH_COLORS,
  wochenplanung: {},
  klassenbuchErgaenzungen: {},
  firstLogin: true,
  tourAbgeschlossen: false,
  currentPage: 'dashboard',
  previousPage: 'dashboard',
  currentKW: getKW(new Date()),
  parkgarage: [],
  savedWeekTemplates: {},
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
  schuelerStimmung: {},
  hueBuch: {},
  awGruende: {},
  verbal: {},
  saAssessments: {},
  klassenglas_count: 0,
  klassenglas_ziel: 20,
  klassenglas_belohnung: 'Gemeinsame Spielzeit',
  ampel_status: 'gruen',
  lehrerProfil: {
    schulstundenJaehrlich: 0,
    schularbeitenManuell: 0,
    testsManuell: 0,
    ausfluegeManuell: 0,
    name: '',
    schule: '',
    motto: '',
    gegruendetYear: ''
  },
  unterrichtsmodus_sidebar_open: false,
  historicalStudents: [],
  archivedClasses: [],
  retiredClasses: [],
  klassenkasse: {
    kontostand: 0,
    sammlungen: [],
    transaktionen: []
  },
  zugangsdaten: [],
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
  quickLinks: [],
  schuelerNotizen: {},
  morgenAufgaben: [],
  tempQrValue: '',
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
    showStudentEmojiInList: true,
    isTafelOpen: false
  },
  tafelVorlagen: [],
  metaKognitionsProtokolle: [],
  sitzplanRegeln: [],
  lernwoerter: { aktuelleListe: [], kw: 0, archiv: [] },
  schuelerWochenplaene: {}
};

export function syncActiveClass(state: AppState): AppState {
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
    schulart: normalizeSchulart(state.schulart ?? currentClass.schulart),
    klassenvorstand: state.klassenvorstand,
    schuljahr: state.schuljahr,
    schueler: state.schueler ? JSON.parse(JSON.stringify(state.schueler)) : [],
    ...(state.classMascot ? { classMascot: { ...state.classMascot } } : {}),
    noten: state.noten ? JSON.parse(JSON.stringify(state.noten)) : {},
    notenMeta: state.notenMeta ? JSON.parse(JSON.stringify(state.notenMeta)) : {},
    notenGewichtung: state.notenGewichtung ? JSON.parse(JSON.stringify(state.notenGewichtung)) : {},
    lernzielTracker: state.lernzielTracker ? JSON.parse(JSON.stringify(state.lernzielTracker)) : {},
    studentLernzielBewertungen: state.studentLernzielBewertungen ? JSON.parse(JSON.stringify(state.studentLernzielBewertungen)) : {},
    studentLernzielSemesterBewertungen: state.studentLernzielSemesterBewertungen ? JSON.parse(JSON.stringify(state.studentLernzielSemesterBewertungen)) : {},
    lernzielBewertungsmodell: state.lernzielBewertungsmodell ? JSON.parse(JSON.stringify(state.lernzielBewertungsmodell)) : undefined,
    diagnostikErgebnisse: state.diagnostikErgebnisse ? JSON.parse(JSON.stringify(state.diagnostikErgebnisse)) : [],
    diagnostikErhebungen: state.diagnostikErhebungen ? JSON.parse(JSON.stringify(state.diagnostikErhebungen)) : [],
    diagnosticResults: state.diagnosticResults ? JSON.parse(JSON.stringify(state.diagnosticResults)) : [],
    ikmRecords: state.ikmRecords ? JSON.parse(JSON.stringify(state.ikmRecords)) : [],
    antolinRecords: state.antolinRecords ? JSON.parse(JSON.stringify(state.antolinRecords)) : [],
    schuelerGoals: state.schuelerGoals ? JSON.parse(JSON.stringify(state.schuelerGoals)) : [],
    observations: state.observations ? JSON.parse(JSON.stringify(state.observations)) : [],
    metaKognitionsProtokolle: state.metaKognitionsProtokolle ? JSON.parse(JSON.stringify(state.metaKognitionsProtokolle)) : [],
    interaktionsLog: state.interaktionsLog ? JSON.parse(JSON.stringify(state.interaktionsLog)) : { eintraege: [], wochenEmpfehlung: null },
    mitarbeit: state.mitarbeit ? JSON.parse(JSON.stringify(state.mitarbeit)) : {},
    mitarbeit_settings: state.mitarbeit_settings ? JSON.parse(JSON.stringify(state.mitarbeit_settings)) : { thresholds: { 1: 13, 2: 10, 3: 7, 4: 4, 5: 0 }, mode: 'absolute' },
    verhalten: state.verhalten ? { ...state.verhalten } : {},
    karten: state.karten ? JSON.parse(JSON.stringify(state.karten)) : {},
    jahresplanung: state.jahresplanung ? JSON.parse(JSON.stringify(state.jahresplanung)) : {},
    jahresplan_faecher: state.jahresplan_faecher ? [...state.jahresplan_faecher] : undefined,
    wochenplanung: state.wochenplanung ? JSON.parse(JSON.stringify(state.wochenplanung)) : {},
    klassenbuchErgaenzungen: state.klassenbuchErgaenzungen ? JSON.parse(JSON.stringify(state.klassenbuchErgaenzungen)) : {},
    parkgarage: state.parkgarage ? JSON.parse(JSON.stringify(state.parkgarage)) : [],
    savedWeekTemplates: state.savedWeekTemplates ? JSON.parse(JSON.stringify(state.savedWeekTemplates)) : {},
    scheduleAnalysis: state.scheduleAnalysis ? JSON.parse(JSON.stringify(state.scheduleAnalysis)) : undefined,
    stammplan: state.stammplan ? JSON.parse(JSON.stringify(state.stammplan)) : {},
    anwesenheit: state.anwesenheit ? JSON.parse(JSON.stringify(state.anwesenheit)) : {},
    anwesenheitDetail: state.anwesenheitDetail ? JSON.parse(JSON.stringify(state.anwesenheitDetail)) : undefined,
    schuelerStimmung: state.schuelerStimmung ? JSON.parse(JSON.stringify(state.schuelerStimmung)) : {},
    dienste: state.dienste ? JSON.parse(JSON.stringify(state.dienste)) : undefined,
    saAssessments: state.saAssessments ? JSON.parse(JSON.stringify(state.saAssessments)) : {},
    klassenglas_count: state.klassenglas_count,
    klassenglas_ziel: state.klassenglas_ziel,
    klassenglas_belohnung: state.klassenglas_belohnung,
    klassenglas_missions: state.klassenglas_missions,
    klassenglas_completed_missions: state.klassenglas_completed_missions,
    classContracts: state.classContracts ? JSON.parse(JSON.stringify(state.classContracts)) : [],
    councilNotes: state.councilNotes ? JSON.parse(JSON.stringify(state.councilNotes)) : [],
    klassenkasse: normalizeKlassenkasse(state.klassenkasse),
    checklisten: state.checklisten ? JSON.parse(JSON.stringify(state.checklisten)) : [],
    customLists: state.customLists ? JSON.parse(JSON.stringify(state.customLists)) : [],
    studentDevelopmentLists: state.studentDevelopmentLists ? JSON.parse(JSON.stringify(state.studentDevelopmentLists)) : [],
    zugangsdaten: state.zugangsdaten ? JSON.parse(JSON.stringify(state.zugangsdaten)) : [],
    behavior_status: state.behavior_status ? { ...state.behavior_status } : {},
    behavior_notes: state.behavior_notes ? { ...state.behavior_notes } : {},
    notes: state.notes ? JSON.parse(JSON.stringify(state.notes)) : [],
    journal: state.journal ? JSON.parse(JSON.stringify(state.journal)) : [],
    statusLog: state.statusLog ? JSON.parse(JSON.stringify(state.statusLog)) : [],
    jahresberichte: state.jahresberichte ? JSON.parse(JSON.stringify(state.jahresberichte)) : {},
    elterngespraeche: state.elterngespraeche ? JSON.parse(JSON.stringify(state.elterngespraeche)) : [],
    kelGespraeche: state.kelGespraeche ? JSON.parse(JSON.stringify(state.kelGespraeche)) : [],
    portfolioEntries: state.portfolioEntries ? JSON.parse(JSON.stringify(state.portfolioEntries)) : {},
    kiPortfolioSummaries: state.kiPortfolioSummaries ? JSON.parse(JSON.stringify(state.kiPortfolioSummaries)) : {},
    oberauData: state.oberauData ? JSON.parse(JSON.stringify(state.oberauData)) : {},
    vertretungHinweise: state.vertretungHinweise || '',
    vertretungsVorbereitung: state.vertretungsVorbereitung ? JSON.parse(JSON.stringify(state.vertretungsVorbereitung)) : undefined,
    stundenZeiten: state.stundenZeiten ? { ...state.stundenZeiten } : {},
    sue_kontrolle: state.sue_kontrolle ? JSON.parse(JSON.stringify(state.sue_kontrolle)) : {},
    lastGroups: state.lastGroups,
    sitzplan_schueler: state.sitzplan_schueler ? JSON.parse(JSON.stringify(state.sitzplan_schueler)) : {},
    sitzplan_objekte: state.sitzplan_objekte ? JSON.parse(JSON.stringify(state.sitzplan_objekte)) : [],
    sitzplanLayouts: state.sitzplanLayouts ? JSON.parse(JSON.stringify(state.sitzplanLayouts)) : [],
    sitzplanDefaultLayoutId: state.sitzplanDefaultLayoutId,
    sitzplanRegeln: state.sitzplanRegeln ? JSON.parse(JSON.stringify(state.sitzplanRegeln)) : [],
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

// Normalisiert und migriert beliebige eingelesene Zustände auf das aktuelle AppState-Schema
export function normalizeAppState(raw: any): AppState {
  if (!raw || typeof raw !== 'object') {
    return initialAppState;
  }

  const legacyArchivedClassEntries = Array.isArray(raw.archivedClasses)
    ? raw.archivedClasses.filter((item: any) =>
        item &&
        typeof item === 'object' &&
        !item.sourceClassId &&
        (item.klassenvorstand !== undefined || item.jahresplanung !== undefined || item.wochenplanung !== undefined)
      )
    : [];
  const archiveSnapshotEntries = Array.isArray(raw.archivedClasses)
    ? raw.archivedClasses.filter((item: any) => !legacyArchivedClassEntries.includes(item))
    : [];

  // Historical multi-class builds already referenced `raw.klassen` as a legacy
  // source but never projected it to the current `classes` field. Preserve those
  // real class snapshots before defaults can collapse them into one generated class.
  const currentClasses = Array.isArray(raw.classes) ? raw.classes : undefined;
  const legacyClasses = (!currentClasses || currentClasses.length === 0)
    && Array.isArray(raw.klassen)
    && raw.klassen.length > 0
    ? raw.klassen
    : undefined;

  const parsed = {
    ...initialAppState,
    ...raw,
    ...(legacyClasses ? { classes: legacyClasses } : {}),
    ipsativeGewichtung: raw.ipsativeGewichtung ?? 70,
    tourAbgeschlossen: raw.tourAbgeschlossen ?? (raw.schueler?.length > 0 || raw.klassen?.length > 0 || raw.classes?.length > 0 ? true : false),
    stimmNotizen: raw.stimmNotizen ?? [],
    kelGespraeche: normalizeKelMeetings(raw.kelGespraeche, raw.schuljahr || getCurrentSchuljahr()),
    jahresberichte: raw.jahresberichte ?? {},
    wochenrueckblick: raw.wochenrueckblick ?? null,
    lernzielTracker: raw.lernzielTracker ?? {},
    differenzierungsGruppen: raw.differenzierungsGruppen ?? [],
    diagnostikErgebnisse: raw.diagnostikErgebnisse ?? [],
    diagnostikErhebungen: raw.diagnostikErhebungen ?? [],
    diagnosticResults: raw.diagnosticResults ?? [],
    ikmRecords: raw.ikmRecords ?? [],
    antolinRecords: raw.antolinRecords ?? [],
    studentDevelopmentLists: Array.isArray(raw.studentDevelopmentLists) ? raw.studentDevelopmentLists : [],
    schuelerGoals: raw.schuelerGoals ?? [],
    observations: raw.observations ?? [],
    metaKognitionsProtokolle: raw.metaKognitionsProtokolle ?? [],
    interaktionsLog: raw.interaktionsLog ?? { eintraege: [], wochenEmpfehlung: null },
    klassenglas_completed_missions: raw.klassenglas_completed_missions ?? [],
    dienste: raw.dienste ?? [],
    backupEinstellungen: raw.backupEinstellungen ?? { letztesBackup: null, erinnerungAktiv: true },
    archivedClasses: normalizeArchivedClasses(archiveSnapshotEntries),
    retiredClasses: JSON.parse(JSON.stringify([
      ...(Array.isArray(raw.retiredClasses) ? raw.retiredClasses : []),
      ...legacyArchivedClassEntries,
    ].filter((item: any, index: number, items: any[]) =>
      item?.id && items.findIndex((candidate: any) => candidate?.id === item.id) === index
    ))),
  };

  // Migration only for legacy data that actually contained a class. Never
  // manufacture a random "4. Klasse Meine Klasse" from a failed or empty
  // initial state: that placeholder can otherwise be automatically encrypted,
  // mistaken for the teacher's account, and propagated to their other devices.
  const hasLegacyClassContent = Boolean(
    parsed.klassenbezeichnung?.trim()
    || (Array.isArray(parsed.schueler) && parsed.schueler.length > 0)
    || Object.keys(parsed.wochenplanung || {}).length > 0
    || Object.keys(parsed.stammplan || {}).length > 0
  );
  if ((!parsed.classes || !Array.isArray(parsed.classes) || parsed.classes.length === 0)
    && hasLegacyClassContent) {
    const defaultClassId = 'default-' + Math.random().toString(36).substring(2, 9);
    const defaultClass: any = {
      id: defaultClassId,
      name: parsed.klassenbezeichnung || 'Meine Klasse',
      stufe: parsed.stufe !== undefined ? Number(parsed.stufe) : 4,
      schulart: normalizeSchulart(raw.schulart),
      klassenvorstand: parsed.klassenvorstand !== undefined ? parsed.klassenvorstand : true,
      schueler: parsed.schueler || [],
      noten: parsed.noten || {},
      notenMeta: parsed.notenMeta || {},
      notenGewichtung: parsed.notenGewichtung || {},
      lernzielTracker: parsed.lernzielTracker || {},
      studentLernzielBewertungen: parsed.studentLernzielBewertungen || {},
      studentLernzielSemesterBewertungen: parsed.studentLernzielSemesterBewertungen || {},
      lernzielBewertungsmodell: parsed.lernzielBewertungsmodell,
      diagnostikErgebnisse: parsed.diagnostikErgebnisse || [],
      diagnostikErhebungen: parsed.diagnostikErhebungen || [],
      diagnosticResults: parsed.diagnosticResults || [],
      ikmRecords: parsed.ikmRecords || [],
      antolinRecords: parsed.antolinRecords || [],
      schuelerGoals: parsed.schuelerGoals || [],
      observations: parsed.observations || [],
      metaKognitionsProtokolle: parsed.metaKognitionsProtokolle || [],
      interaktionsLog: parsed.interaktionsLog || { eintraege: [], wochenEmpfehlung: null },
      mitarbeit: parsed.mitarbeit || {},
      mitarbeit_settings: parsed.mitarbeit_settings || { thresholds: { 1: 13, 2: 10, 3: 7, 4: 4, 5: 0 }, mode: 'absolute' },
      verhalten: parsed.verhalten || {},
      karten: parsed.karten || {},
      jahresplanung: parsed.jahresplanung || {},
      jahresplan_faecher: parsed.jahresplan_faecher || DEFAULT_YEARLY_SUBJECTS,
      wochenplanung: parsed.wochenplanung || {},
      klassenbuchErgaenzungen: parsed.klassenbuchErgaenzungen || {},
      stammplan: parsed.stammplan || {},
      anwesenheit: parsed.anwesenheit || {},
      anwesenheitDetail: parsed.anwesenheitDetail || {},
      schuelerStimmung: parsed.schuelerStimmung || {},
      dienste: parsed.dienste || [],
      saAssessments: parsed.saAssessments || {},
      klassenglas_count: parsed.klassenglas_count || 0,
      klassenglas_ziel: parsed.klassenglas_ziel || 20,
      klassenglas_belohnung: parsed.klassenglas_belohnung || 'Gemeinsame Spielzeit',
      klassenkasse: normalizeKlassenkasse(parsed.klassenkasse),
      zugangsdaten: parsed.zugangsdaten || [],
      behavior_status: parsed.behavior_status || {},
      behavior_notes: parsed.behavior_notes || {},
      sue_kontrolle: parsed.sue_kontrolle || {},
      sitzplan_schueler: parsed.sitzplan_schueler || {},
      sitzplan_objekte: parsed.sitzplan_objekte || [],
      sitzplanLayouts: Array.isArray(parsed.sitzplanLayouts) ? parsed.sitzplanLayouts : [],
      sitzplanDefaultLayoutId: parsed.sitzplanDefaultLayoutId,
      sitzplanRegeln: parsed.sitzplanRegeln || [],
      tageplan: parsed.tageplan || DEFAULT_TAGEPLAN,
      faecher: parsed.faecher || FAECHER_ALLE,
      fachConfig: parsed.fachConfig || DEFAULT_FACH_COLORS
    };
    parsed.classes = [defaultClass];
    parsed.activeClassId = defaultClassId;
    parsed.classes = syncActiveClass(parsed).classes;
  }

  // Klassen-Sanitization
  if (parsed.classes && Array.isArray(parsed.classes)) {
    parsed.classes = parsed.classes.map((c: any) => {
      if (!c || typeof c !== 'object') return null;
      return {
        ...c,
        id: c.id || 'class-' + Math.random().toString(36).substring(2, 9),
        name: c.name || 'Meine Klasse',
        stufe: c.stufe !== undefined ? Number(c.stufe) : 4,
        schulart: normalizeSchulart(c.schulart),
        klassenvorstand: c.klassenvorstand !== undefined ? c.klassenvorstand : true,
        schueler: c.schueler || [],
        noten: c.noten || {},
        notenMeta: c.notenMeta ?? (c.id === parsed.activeClassId ? parsed.notenMeta : undefined) ?? {},
        notenGewichtung: c.notenGewichtung ?? (c.id === parsed.activeClassId ? parsed.notenGewichtung : undefined) ?? {},
        lernzielTracker: c.lernzielTracker ?? (c.id === parsed.activeClassId ? parsed.lernzielTracker : undefined) ?? {},
        studentLernzielBewertungen: c.studentLernzielBewertungen ?? (c.id === parsed.activeClassId ? parsed.studentLernzielBewertungen : undefined) ?? {},
        studentLernzielSemesterBewertungen: c.studentLernzielSemesterBewertungen ?? (c.id === parsed.activeClassId ? parsed.studentLernzielSemesterBewertungen : undefined) ?? {},
        lernzielBewertungsmodell: c.lernzielBewertungsmodell ?? (c.id === parsed.activeClassId ? parsed.lernzielBewertungsmodell : undefined),
        diagnostikErgebnisse: c.diagnostikErgebnisse ?? (c.id === parsed.activeClassId ? parsed.diagnostikErgebnisse : undefined) ?? [],
        diagnostikErhebungen: c.diagnostikErhebungen ?? (c.id === parsed.activeClassId ? parsed.diagnostikErhebungen : undefined) ?? [],
        diagnosticResults: c.diagnosticResults ?? (c.id === parsed.activeClassId ? parsed.diagnosticResults : undefined) ?? [],
        ikmRecords: c.ikmRecords ?? (c.id === parsed.activeClassId ? parsed.ikmRecords : undefined) ?? [],
        antolinRecords: c.antolinRecords ?? (c.id === parsed.activeClassId ? parsed.antolinRecords : undefined) ?? [],
        schuelerGoals: c.schuelerGoals ?? (c.id === parsed.activeClassId ? parsed.schuelerGoals : undefined) ?? [],
        observations: c.observations ?? (c.id === parsed.activeClassId ? parsed.observations : undefined) ?? [],
        metaKognitionsProtokolle: c.metaKognitionsProtokolle ?? (c.id === parsed.activeClassId ? parsed.metaKognitionsProtokolle : undefined) ?? [],
        interaktionsLog: c.interaktionsLog ?? (c.id === parsed.activeClassId ? parsed.interaktionsLog : undefined) ?? { eintraege: [], wochenEmpfehlung: null },
        mitarbeit: c.mitarbeit || {},
        // Legacy multi-class snapshots had one shared root setting; copy it to every class once during migration.
        mitarbeit_settings: c.mitarbeit_settings ?? parsed.mitarbeit_settings ?? { thresholds: { 1: 13, 2: 10, 3: 7, 4: 4, 5: 0 }, mode: 'absolute' },
        verhalten: c.verhalten || {},
        karten: c.karten || {},
        jahresplanung: c.jahresplanung || {},
        jahresplan_faecher: c.jahresplan_faecher || DEFAULT_YEARLY_SUBJECTS,
        wochenplanung: c.wochenplanung || {},
        klassenbuchErgaenzungen: c.klassenbuchErgaenzungen ?? (c.id === parsed.activeClassId ? parsed.klassenbuchErgaenzungen : undefined) ?? {},
        // Legacy planning-center data lived at root level. Preserve it on the
        // active class only so it cannot leak into unrelated classes.
        parkgarage:
          c.parkgarage ??
          (c.id === parsed.activeClassId ? parsed.parkgarage : undefined) ??
          [],
        savedWeekTemplates:
          c.savedWeekTemplates ??
          (c.id === parsed.activeClassId ? parsed.savedWeekTemplates : undefined) ??
          {},
        stammplan: c.stammplan || {},
        anwesenheit: c.anwesenheit || {},
        anwesenheitDetail: c.anwesenheitDetail || {},
        schuelerStimmung: c.schuelerStimmung || {},
        dienste: c.dienste || [],
        checklisten: c.checklisten || [],
        customLists: c.customLists || [],
        studentDevelopmentLists: c.studentDevelopmentLists || [],
        // Legacy Kassa & Orga credentials were global; copy them into each class once.
        zugangsdaten: c.zugangsdaten ?? parsed.zugangsdaten ?? [],
        saAssessments: c.saAssessments ?? (c.id === parsed.activeClassId ? parsed.saAssessments : undefined) ?? {},
        klassenglas_count: c.klassenglas_count !== undefined ? Number(c.klassenglas_count) : 0,
        klassenglas_ziel: c.klassenglas_ziel !== undefined ? Number(c.klassenglas_ziel) : 20,
        klassenglas_belohnung: c.klassenglas_belohnung || 'Gemeinsame Spielzeit',
        classContracts: c.classContracts ?? (c.id === parsed.activeClassId ? parsed.classContracts : undefined) ?? [],
        councilNotes: c.councilNotes ?? (c.id === parsed.activeClassId ? parsed.councilNotes : undefined) ?? [],
        klassenkasse: normalizeKlassenkasse(c.klassenkasse),
        behavior_status: c.behavior_status || {},
        behavior_notes: c.behavior_notes || {},
        jahresberichte:
          c.jahresberichte ??
          (c.id === parsed.activeClassId ? parsed.jahresberichte : undefined) ??
          {},
        // Legacy statistics/profile records lived at root. Attach them only to
        // the active class so they cannot leak into unrelated classes.
        elterngespraeche:
          c.elterngespraeche ??
          (c.id === parsed.activeClassId ? parsed.elterngespraeche : undefined) ??
          [],
        kelGespraeche: normalizeKelMeetings(
          c.kelGespraeche ??
          (c.id === parsed.activeClassId ? parsed.kelGespraeche : undefined) ??
          [],
          c.schuljahr || parsed.schuljahr || getCurrentSchuljahr(),
        ),
        portfolioEntries:
          c.portfolioEntries ??
          (c.id === parsed.activeClassId ? parsed.portfolioEntries : undefined) ??
          {},
        kiPortfolioSummaries:
          c.kiPortfolioSummaries ??
          (c.id === parsed.activeClassId ? parsed.kiPortfolioSummaries : undefined) ??
          {},
        oberauData:
          c.oberauData ??
          (c.id === parsed.activeClassId ? parsed.oberauData : undefined) ??
          {},
        sue_kontrolle: c.sue_kontrolle || {},
        sitzplan_schueler: c.sitzplan_schueler || {},
        sitzplan_objekte: c.sitzplan_objekte || [],
        sitzplanLayouts: Array.isArray(c.sitzplanLayouts)
          ? c.sitzplanLayouts
          : c.id === parsed.activeClassId && Array.isArray(parsed.sitzplanLayouts)
            ? parsed.sitzplanLayouts : [],
        sitzplanDefaultLayoutId: c.sitzplanDefaultLayoutId ??
          (c.id === parsed.activeClassId ? parsed.sitzplanDefaultLayoutId : undefined),
        sitzplanRegeln: c.sitzplanRegeln,
        tageplan: c.tageplan || DEFAULT_TAGEPLAN,
        faecher: c.faecher || FAECHER_ALLE,
        fachConfig: c.fachConfig || DEFAULT_FACH_COLORS,
        theme: c.theme || 'classic_light',
        schuljahr: c.schuljahr || parsed.schuljahr || getCurrentSchuljahr(),
        settings: c.settings || {}
      };
    }).filter(Boolean);

    // Keep the root projection aligned with the active class immediately after
    // loading. Otherwise the first class switch would sync stale root planning
    // data back into the active class and overwrite its Parkgarage/templates.
    const activePlanningClass = parsed.classes.find(
      (classroom: any) => classroom?.id === parsed.activeClassId,
    );
    if (activePlanningClass) {
      parsed.parkgarage = activePlanningClass.parkgarage
        ? JSON.parse(JSON.stringify(activePlanningClass.parkgarage))
        : [];
      parsed.savedWeekTemplates = activePlanningClass.savedWeekTemplates
        ? JSON.parse(JSON.stringify(activePlanningClass.savedWeekTemplates))
        : {};
    }
  }

  // Migration / projection: seating-plan rules are class-local.
  // Older snapshots stored them only at root level, so partition them by the
  // students referenced by each rule. Unknown legacy references stay with the
  // active class instead of leaking into every class.
  if (parsed.classes && Array.isArray(parsed.classes) && parsed.classes.length > 0) {
    const rootRules = Array.isArray(parsed.sitzplanRegeln) ? parsed.sitzplanRegeln : [];
    const knownStudentIds = new Set<string>(
      parsed.classes.flatMap((classroom: any) =>
        (classroom.schueler || []).map((student: any) => student?.id).filter(Boolean)
      )
    );

    parsed.classes = parsed.classes.map((c: any) => {
      const studentIds = new Set<string>((c.schueler || []).map((student: any) => student?.id).filter(Boolean));
      const isActive = c.id === parsed.activeClassId;
      const legacyRules = rootRules.filter((rule: any) => {
        const ids = Array.isArray(rule?.schuelerIds) ? rule.schuelerIds.filter(Boolean) : [];
        if (ids.length === 0) return isActive;
        if (ids.every((id: string) => studentIds.has(id))) return true;
        return isActive && ids.every((id: string) => !knownStudentIds.has(id));
      });
      const sourceRules = Array.isArray(c.sitzplanRegeln) ? c.sitzplanRegeln : legacyRules;

      return {
        ...c,
        sitzplanRegeln: sanitizeSeatingRules(
          sourceRules,
          c.schueler || [],
          c.sitzplan_schueler || {}
        )
      };
    });
  }

  // Active Class Sync
  let activeClass = parsed.classes?.find((c: any) => c.id === parsed.activeClassId);
  if (!activeClass && parsed.classes && parsed.classes.length > 0) {
    activeClass = parsed.classes[0];
    parsed.activeClassId = activeClass.id;
  }

  if (activeClass) {
    parsed.klassenbezeichnung = activeClass.name;
    // A mascot belongs to the active class, not to the teacher or another room.
    parsed.classMascot = activeClass.classMascot ? { ...activeClass.classMascot } : undefined;
    parsed.stufe = activeClass.stufe;
    parsed.schulart = normalizeSchulart(activeClass.schulart);
    parsed.klassenvorstand = activeClass.klassenvorstand;
    parsed.schueler = activeClass.schueler;
    parsed.noten = activeClass.noten;
    parsed.notenMeta = activeClass.notenMeta || {};
    parsed.notenGewichtung = activeClass.notenGewichtung || {};
    parsed.lernzielTracker = activeClass.lernzielTracker || {};
    parsed.studentLernzielBewertungen = activeClass.studentLernzielBewertungen || {};
    parsed.studentLernzielSemesterBewertungen = activeClass.studentLernzielSemesterBewertungen || {};
    parsed.lernzielBewertungsmodell = activeClass.lernzielBewertungsmodell;
    parsed.diagnostikErgebnisse = activeClass.diagnostikErgebnisse || [];
    parsed.diagnostikErhebungen = activeClass.diagnostikErhebungen || [];
    parsed.diagnosticResults = activeClass.diagnosticResults || [];
    parsed.ikmRecords = activeClass.ikmRecords || [];
    parsed.antolinRecords = activeClass.antolinRecords || [];
    parsed.schuelerGoals = activeClass.schuelerGoals || [];
    parsed.observations = activeClass.observations || [];
    parsed.metaKognitionsProtokolle = activeClass.metaKognitionsProtokolle || [];
    parsed.interaktionsLog = activeClass.interaktionsLog || { eintraege: [], wochenEmpfehlung: null };
    parsed.mitarbeit = activeClass.mitarbeit;
    parsed.mitarbeit_settings = activeClass.mitarbeit_settings || { thresholds: { 1: 13, 2: 10, 3: 7, 4: 4, 5: 0 }, mode: 'absolute' };
    parsed.verhalten = activeClass.verhalten;
    parsed.karten = activeClass.karten;
    parsed.jahresplanung = activeClass.jahresplanung;
    parsed.jahresplan_faecher = activeClass.jahresplan_faecher || DEFAULT_YEARLY_SUBJECTS;
    parsed.wochenplanung = activeClass.wochenplanung;
    parsed.klassenbuchErgaenzungen = activeClass.klassenbuchErgaenzungen || {};
    parsed.stammplan = activeClass.stammplan;
    parsed.anwesenheit = activeClass.anwesenheit;
    parsed.anwesenheitDetail = activeClass.anwesenheitDetail;
    parsed.schuelerStimmung = activeClass.schuelerStimmung || {};
    parsed.dienste = activeClass.dienste;
    parsed.checklisten = activeClass.checklisten || [];
    parsed.customLists = activeClass.customLists || [];
    parsed.studentDevelopmentLists = activeClass.studentDevelopmentLists || [];
    parsed.zugangsdaten = activeClass.zugangsdaten || [];
    parsed.saAssessments = activeClass.saAssessments;
    parsed.klassenglas_count = activeClass.klassenglas_count;
    parsed.klassenglas_ziel = activeClass.klassenglas_ziel;
    parsed.klassenglas_belohnung = activeClass.klassenglas_belohnung;
    parsed.classContracts = activeClass.classContracts || [];
    parsed.councilNotes = activeClass.councilNotes || [];
    parsed.klassenkasse = normalizeKlassenkasse(activeClass.klassenkasse);
    parsed.behavior_status = activeClass.behavior_status;
    parsed.behavior_notes = activeClass.behavior_notes;
    parsed.jahresberichte = activeClass.jahresberichte || {};
    parsed.elterngespraeche = activeClass.elterngespraeche || [];
    parsed.kelGespraeche = normalizeKelMeetings(
      activeClass.kelGespraeche,
      activeClass.schuljahr || parsed.schuljahr || getCurrentSchuljahr(),
    );
    parsed.portfolioEntries = activeClass.portfolioEntries || {};
    parsed.kiPortfolioSummaries = activeClass.kiPortfolioSummaries || {};
    parsed.oberauData = activeClass.oberauData || {};
    parsed.vertretungHinweise = activeClass.vertretungHinweise ?? parsed.vertretungHinweise ?? '';
    parsed.vertretungsVorbereitung = activeClass.vertretungsVorbereitung;
    parsed.sue_kontrolle = activeClass.sue_kontrolle;
    parsed.sitzplan_schueler = activeClass.sitzplan_schueler;
    parsed.sitzplan_objekte = activeClass.sitzplan_objekte;
    parsed.sitzplanLayouts = activeClass.sitzplanLayouts || [];
    parsed.sitzplanDefaultLayoutId = activeClass.sitzplanDefaultLayoutId;
    parsed.sitzplanRegeln = activeClass.sitzplanRegeln || [];
    parsed.tageplan = activeClass.tageplan;
    parsed.faecher = activeClass.faecher;
    parsed.fachConfig = activeClass.fachConfig;
    parsed.stundenZeiten = activeClass.stundenZeiten ?? parsed.stundenZeiten ?? STUNDEN_INFO;
    parsed.scheduleAnalysis = activeClass.scheduleAnalysis ?? parsed.scheduleAnalysis ?? undefined;
    parsed.lastGroups = activeClass.lastGroups ?? parsed.lastGroups ?? undefined;
    parsed.klassenglas_missions = activeClass.klassenglas_missions ?? parsed.klassenglas_missions ?? [];
    parsed.klassenglas_completed_missions = activeClass.klassenglas_completed_missions ?? parsed.klassenglas_completed_missions ?? [];
    parsed.customBgColor = activeClass.customBgColor ?? parsed.customBgColor ?? undefined;
    parsed.customAccentColor = activeClass.customAccentColor ?? parsed.customAccentColor ?? undefined;
    parsed.customTextColor = activeClass.customTextColor ?? parsed.customTextColor ?? undefined;
    parsed.customText2Color = activeClass.customText2Color ?? parsed.customText2Color ?? undefined;
    parsed.theme = activeClass.theme;
    parsed.schuljahr = activeClass.schuljahr || parsed.schuljahr || getCurrentSchuljahr();
  }

  parsed.schuelerWochenplaene = parsed.schuelerWochenplaene || {};
  parsed.morningWidgets = parsed.morningWidgets || DEFAULT_MORNING_WIDGETS;
  const legacyHistoricalStudents = Array.isArray(parsed.historicalStudents) ? parsed.historicalStudents : [];
  const isLegacyBundledArchive = legacyHistoricalStudents.length === 25
    && legacyHistoricalStudents[0]?.id === 'h1'
    && legacyHistoricalStudents[0]?.name === 'Alina Beck'
    && legacyHistoricalStudents[24]?.id === 'h25'
    && legacyHistoricalStudents[24]?.name === 'Elena Rhomberg';
  parsed.historicalStudents = isLegacyBundledArchive ? [] : legacyHistoricalStudents;

  const parsedIdentityName = [parsed.anrede || parsed.vorname, parsed.nachname]
    .filter(Boolean)
    .join(' ')
    .trim();
  const hasLegacyDemoProfile = parsed.lehrerProfil
    && parsed.lehrerProfil.name === 'Maximilian Musterlehrer'
    && parsed.lehrerProfil.schule === 'Volksschule Musterstadt'
    && parsed.lehrerProfil.motto === 'Pädagogik mit Herz ❤️';
  if (hasLegacyDemoProfile) parsed.lehrerProfil = undefined;

  parsed.lehrerProfil = parsed.lehrerProfil || {
    schulstundenJaehrlich: 0,
    schularbeitenManuell: 0,
    testsManuell: 0,
    ausfluegeManuell: 0,
    name: parsedIdentityName,
    schule: parsed.schulName || '',
    motto: parsed.motto || '',
    gegruendetYear: ''
  };

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

  if (!parsed.notes) {
    const migratedNotes: any[] = [];
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
    if (parsed.journal && Array.isArray(parsed.journal)) {
      parsed.journal.forEach((j: any) => {
        if (!migratedNotes.find(m => m.id === j.id)) {
          migratedNotes.push(j);
        }
      });
    }
    parsed.notes = migratedNotes.sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime());
  }

  // Migration / projection: chronicle, journal and behavior history are class-local.
  // For old multi-class snapshots, student-linked root records are assigned to the
  // class that actually contains that child. General entries without a child stay
  // with the active class because older data has no reliable class marker for them.
  if (parsed.classes && Array.isArray(parsed.classes) && parsed.classes.length > 0) {
    const rootNotes = Array.isArray(parsed.notes) ? parsed.notes : [];
    const rootJournal = Array.isArray(parsed.journal) ? parsed.journal : [];
    const rootStatusLog = Array.isArray(parsed.statusLog) ? parsed.statusLog : [];
    const knownStudentIds = new Set<string>(
      parsed.classes.flatMap((classroom: any) =>
        (classroom.schueler || []).map((student: any) => student?.id).filter(Boolean)
      )
    );

    parsed.classes = parsed.classes.map((c: any) => {
      const isActive = c.id === parsed.activeClassId;
      const studentIds = new Set<string>((c.schueler || []).map((student: any) => student?.id).filter(Boolean));
      const belongsToClass = (entry: any) => {
        if (!entry?.schuelerId) return isActive;
        if (studentIds.has(entry.schuelerId)) return true;
        return isActive && !knownStudentIds.has(entry.schuelerId);
      };

      return {
        ...c,
        notes: c.notes ?? rootNotes.filter(belongsToClass),
        journal: c.journal ?? rootJournal.filter(belongsToClass),
        statusLog: c.statusLog ?? rootStatusLog.filter(belongsToClass)
      };
    });

    const activeClassWithNotes = parsed.classes.find((c: any) => c.id === parsed.activeClassId);
    parsed.notes = activeClassWithNotes?.notes || [];
    parsed.journal = activeClassWithNotes?.journal || [];
    parsed.statusLog = activeClassWithNotes?.statusLog || [];
  }

  // Preserve an explicit false after first setup (or an intentional tour restart),
  // even when the newly imported class already contains children. Only legacy
  // snapshots without a tour flag infer that onboarding was previously done.
  const computedTourAbgeschlossen = typeof raw.tourAbgeschlossen === 'boolean'
    ? raw.tourAbgeschlossen
    : Boolean(parsed.schueler?.length || parsed.classes?.length || parsed.klassenbezeichnung?.trim());

  return {
    ...initialAppState,
    ...parsed,
    bundesland: parsed.bundesland || 'VBG',
    tourAbgeschlossen: computedTourAbgeschlossen,
    historicalStudents: parsed.historicalStudents || [],
    archivedClasses: normalizeArchivedClasses(parsed.archivedClasses),
    retiredClasses: Array.isArray(parsed.retiredClasses) ? parsed.retiredClasses : [],
    notes: parsed.notes || [],
    settings: { ...initialAppState.settings, ...(parsed.settings || {}) },
    boardSettings: {
      ...initialAppState.boardSettings,
      ...(parsed.boardSettings || {}),
      isTafelOpen: false // Digitale Tafel darf niemals automatisch beim App-Start oder Laden geöffnet sein
    },
    klassenkasse: { ...initialAppState.klassenkasse, ...(parsed.klassenkasse || {}) },
    ampelLabels: { ...initialAppState.ampelLabels, ...(parsed.ampelLabels || {}) },
    jahresplan_faecher: parsed.jahresplan_faecher || initialAppState.jahresplan_faecher,
    sitzplanRegeln: parsed.sitzplanRegeln || [],
    metaKognitionsProtokolle: parsed.metaKognitionsProtokolle || [],
    diagnosticResults: parsed.diagnosticResults || [],
    lernwoerter: parsed.lernwoerter || { aktuelleListe: [], kw: 0, archiv: [] }
  };
}


export function switchClassState(prev: AppState, id: string): AppState {
  const { classes } = syncActiveClass(prev);

  // 2. Find target class
  const targetClass = classes.find(c => c.id === id);
  if (!targetClass) return prev;

  // 3. Set target class data to root level
  const currentLoc = prev.currentPage || 'dashboard';
  const needsSafeLanding = !targetClass.klassenvorstand && ['orga', 'uebergabemappe', 'diagnostik', 'kel'].includes(currentLoc);

  return {
    ...prev,
    currentPage: needsSafeLanding ? 'dashboard' : currentLoc,
    activeClassId: id,
    classes,
    klassenbezeichnung: targetClass.name,
    classMascot: targetClass.classMascot ? { ...targetClass.classMascot } : undefined,
    stufe: targetClass.stufe,
    schulart: normalizeSchulart(targetClass.schulart),
    klassenvorstand: targetClass.klassenvorstand,
    schuljahr: targetClass.schuljahr || prev.schuljahr || '2024/25',
    schueler: targetClass.schueler ? JSON.parse(JSON.stringify(targetClass.schueler)) : [],
    saAssessments: targetClass.saAssessments || {},
    scheduleAnalysis: targetClass.scheduleAnalysis,
    noten: targetClass.noten || {},
    notenMeta: targetClass.notenMeta || {},
    notenGewichtung: targetClass.notenGewichtung || {},
    lernzielTracker: targetClass.lernzielTracker ? JSON.parse(JSON.stringify(targetClass.lernzielTracker)) : {},
    studentLernzielBewertungen: targetClass.studentLernzielBewertungen ? JSON.parse(JSON.stringify(targetClass.studentLernzielBewertungen)) : {},
    studentLernzielSemesterBewertungen: targetClass.studentLernzielSemesterBewertungen ? JSON.parse(JSON.stringify(targetClass.studentLernzielSemesterBewertungen)) : {},
    lernzielBewertungsmodell: targetClass.lernzielBewertungsmodell ? JSON.parse(JSON.stringify(targetClass.lernzielBewertungsmodell)) : undefined,
    diagnostikErgebnisse: targetClass.diagnostikErgebnisse ? JSON.parse(JSON.stringify(targetClass.diagnostikErgebnisse)) : [],
    diagnostikErhebungen: targetClass.diagnostikErhebungen ? JSON.parse(JSON.stringify(targetClass.diagnostikErhebungen)) : [],
    diagnosticResults: targetClass.diagnosticResults ? JSON.parse(JSON.stringify(targetClass.diagnosticResults)) : [],
    ikmRecords: targetClass.ikmRecords ? JSON.parse(JSON.stringify(targetClass.ikmRecords)) : [],
    antolinRecords: targetClass.antolinRecords ? JSON.parse(JSON.stringify(targetClass.antolinRecords)) : [],
    schuelerGoals: targetClass.schuelerGoals ? JSON.parse(JSON.stringify(targetClass.schuelerGoals)) : [],
    observations: targetClass.observations ? JSON.parse(JSON.stringify(targetClass.observations)) : [],
    metaKognitionsProtokolle: targetClass.metaKognitionsProtokolle ? JSON.parse(JSON.stringify(targetClass.metaKognitionsProtokolle)) : [],
    interaktionsLog: targetClass.interaktionsLog ? JSON.parse(JSON.stringify(targetClass.interaktionsLog)) : { eintraege: [], wochenEmpfehlung: null },
    mitarbeit: targetClass.mitarbeit || {},
    mitarbeit_settings: targetClass.mitarbeit_settings ? JSON.parse(JSON.stringify(targetClass.mitarbeit_settings)) : { thresholds: { 1: 13, 2: 10, 3: 7, 4: 4, 5: 0 }, mode: 'absolute' },
    verhalten: targetClass.verhalten,
    karten: targetClass.karten,
    jahresplanung: targetClass.jahresplanung,
    jahresplan_faecher: targetClass.jahresplan_faecher || DEFAULT_YEARLY_SUBJECTS,
    wochenplanung: targetClass.wochenplanung ? JSON.parse(JSON.stringify(targetClass.wochenplanung)) : {},
    klassenbuchErgaenzungen: targetClass.klassenbuchErgaenzungen ? JSON.parse(JSON.stringify(targetClass.klassenbuchErgaenzungen)) : {},
    parkgarage: targetClass.parkgarage ? JSON.parse(JSON.stringify(targetClass.parkgarage)) : [],
    savedWeekTemplates: targetClass.savedWeekTemplates ? JSON.parse(JSON.stringify(targetClass.savedWeekTemplates)) : {},
    stammplan: targetClass.stammplan ? JSON.parse(JSON.stringify(targetClass.stammplan)) : {},
    anwesenheit: targetClass.anwesenheit,
    anwesenheitDetail: targetClass.anwesenheitDetail,
    schuelerStimmung: targetClass.schuelerStimmung || {},
    dienste: targetClass.dienste || [],
    checklisten: targetClass.checklisten || [],
    customLists: targetClass.customLists || [],
    studentDevelopmentLists: targetClass.studentDevelopmentLists || [],
    zugangsdaten: targetClass.zugangsdaten ? JSON.parse(JSON.stringify(targetClass.zugangsdaten)) : [],
    klassenglas_missions: targetClass.klassenglas_missions || [],
    klassenglas_completed_missions: targetClass.klassenglas_completed_missions || [],
    klassenglas_count: targetClass.klassenglas_count,
    klassenglas_ziel: targetClass.klassenglas_ziel,
    klassenglas_belohnung: targetClass.klassenglas_belohnung || 'Gemeinsame Spielzeit',
    classContracts: targetClass.classContracts ? JSON.parse(JSON.stringify(targetClass.classContracts)) : [],
    councilNotes: targetClass.councilNotes ? JSON.parse(JSON.stringify(targetClass.councilNotes)) : [],
    klassenkasse: normalizeKlassenkasse(targetClass.klassenkasse),
    behavior_status: targetClass.behavior_status || {},
    behavior_notes: targetClass.behavior_notes || {},
    notes: targetClass.notes ? JSON.parse(JSON.stringify(targetClass.notes)) : [],
    journal: targetClass.journal ? JSON.parse(JSON.stringify(targetClass.journal)) : [],
    statusLog: targetClass.statusLog ? JSON.parse(JSON.stringify(targetClass.statusLog)) : [],
    jahresberichte: targetClass.jahresberichte ? JSON.parse(JSON.stringify(targetClass.jahresberichte)) : {},
    elterngespraeche: targetClass.elterngespraeche ? JSON.parse(JSON.stringify(targetClass.elterngespraeche)) : [],
    kelGespraeche: normalizeKelMeetings(
      targetClass.kelGespraeche,
      targetClass.schuljahr || prev.schuljahr || getCurrentSchuljahr(),
    ),
    portfolioEntries: targetClass.portfolioEntries ? JSON.parse(JSON.stringify(targetClass.portfolioEntries)) : {},
    kiPortfolioSummaries: targetClass.kiPortfolioSummaries ? JSON.parse(JSON.stringify(targetClass.kiPortfolioSummaries)) : {},
    oberauData: targetClass.oberauData ? JSON.parse(JSON.stringify(targetClass.oberauData)) : {},
    vertretungHinweise: targetClass.vertretungHinweise || '',
    vertretungsVorbereitung: targetClass.vertretungsVorbereitung ? JSON.parse(JSON.stringify(targetClass.vertretungsVorbereitung)) : undefined,
    sue_kontrolle: targetClass.sue_kontrolle || {},
    sitzplan_schueler: targetClass.sitzplan_schueler || {},
    sitzplan_objekte: targetClass.sitzplan_objekte || [],
    sitzplanLayouts: targetClass.sitzplanLayouts ? JSON.parse(JSON.stringify(targetClass.sitzplanLayouts)) : [],
    sitzplanDefaultLayoutId: targetClass.sitzplanDefaultLayoutId,
    sitzplanRegeln: targetClass.sitzplanRegeln || [],
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
}
