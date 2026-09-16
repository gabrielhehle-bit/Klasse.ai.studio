import type { AppState, Student } from '../types';

export type ArchivedStudent = Omit<
  Student,
  'anschrift' | 'plz' | 'ort' | 'telefon_mutter' | 'telefon_vater' | 'email_eltern' | 'sv_nummer' | 'foto' | 'fotoFreigabe'
>;

export interface ArchivedClassSnapshot {
  id: string;
  sourceClassId: string;
  name: string;
  stufe: number;
  schuljahr: string;
  archiviertAm: string;
  schueler: ArchivedStudent[];
  faecher?: string[];
  fachConfig?: AppState['fachConfig'];
  noten: AppState['noten'];
  notenMeta: AppState['notenMeta'];
  notenGewichtung: AppState['notenGewichtung'];
  mitarbeit: AppState['mitarbeit'];
  mitarbeit_settings?: AppState['mitarbeit_settings'];
  verhalten: AppState['verhalten'];
  karten: AppState['karten'];
  anwesenheit: AppState['anwesenheit'];
  anwesenheitDetail?: AppState['anwesenheitDetail'];
  schuelerStimmung?: AppState['schuelerStimmung'];
  lernzielTracker?: AppState['lernzielTracker'];
  studentLernzielBewertungen?: AppState['studentLernzielBewertungen'];
  studentLernzielSemesterBewertungen?: AppState['studentLernzielSemesterBewertungen'];
  diagnostikErgebnisse?: AppState['diagnostikErgebnisse'];
  diagnostikErhebungen?: AppState['diagnostikErhebungen'];
  diagnosticResults?: AppState['diagnosticResults'];
  ikmRecords?: AppState['ikmRecords'];
  antolinRecords?: AppState['antolinRecords'];
  schuelerGoals?: AppState['schuelerGoals'];
  observations?: AppState['observations'];
  metaKognitionsProtokolle?: AppState['metaKognitionsProtokolle'];
  interaktionsLog?: AppState['interaktionsLog'];
  notes?: AppState['notes'];
  journal?: AppState['journal'];
  statusLog?: AppState['statusLog'];
  jahresberichte?: AppState['jahresberichte'];
  elterngespraeche?: AppState['elterngespraeche'];
  kelGespraeche?: AppState['kelGespraeche'];
  portfolioEntries?: AppState['portfolioEntries'];
  kiPortfolioSummaries?: AppState['kiPortfolioSummaries'];
  oberauData?: AppState['oberauData'];
}

const clone = <T,>(value: T): T => {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value)) as T;
};

const sanitizeStudentForArchive = (student: Student): ArchivedStudent => {
  const {
    anschrift: _anschrift,
    plz: _plz,
    ort: _ort,
    telefon_mutter: _telefonMutter,
    telefon_vater: _telefonVater,
    email_eltern: _emailEltern,
    sv_nummer: _svNummer,
    foto: _foto,
    fotoFreigabe: _fotoFreigabe,
    ...archived
  } = student;
  return clone(archived) as ArchivedStudent;
};

const archiveId = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `archive-${crypto.randomUUID()}`;
    }
  } catch {}
  return `archive-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export function createArchivedClassSnapshot(
  app: AppState,
  options: { id?: string; archivedAt?: string } = {}
): ArchivedClassSnapshot {
  if (!app.activeClassId) {
    throw new Error('Keine aktive Klasse ausgewählt.');
  }

  return {
    id: options.id || archiveId(),
    sourceClassId: app.activeClassId,
    name: app.klassenbezeichnung?.trim() || 'Unbenannte Klasse',
    stufe: Number(app.stufe) || 1,
    schuljahr: app.schuljahr?.trim() || 'Schuljahr nicht angegeben',
    archiviertAm: options.archivedAt || new Date().toISOString(),
    schueler: (app.schueler || []).map(sanitizeStudentForArchive),
    faecher: clone(app.faecher || []),
    fachConfig: clone(app.fachConfig || {}),
    noten: clone(app.noten || {}),
    notenMeta: clone(app.notenMeta || {}),
    notenGewichtung: clone(app.notenGewichtung || {}),
    mitarbeit: clone(app.mitarbeit || {}),
    mitarbeit_settings: clone(app.mitarbeit_settings),
    verhalten: clone(app.verhalten || {}),
    karten: clone(app.karten || {}),
    anwesenheit: clone(app.anwesenheit || {}),
    anwesenheitDetail: clone(app.anwesenheitDetail || {}),
    schuelerStimmung: clone(app.schuelerStimmung || {}),
    lernzielTracker: clone(app.lernzielTracker || {}),
    studentLernzielBewertungen: clone(app.studentLernzielBewertungen || {}),
    studentLernzielSemesterBewertungen: clone(app.studentLernzielSemesterBewertungen || {}),
    diagnostikErgebnisse: clone(app.diagnostikErgebnisse || []),
    diagnostikErhebungen: clone(app.diagnostikErhebungen || []),
    diagnosticResults: clone(app.diagnosticResults || []),
    ikmRecords: clone(app.ikmRecords || []),
    antolinRecords: clone(app.antolinRecords || []),
    schuelerGoals: clone(app.schuelerGoals || []),
    observations: clone(app.observations || []),
    metaKognitionsProtokolle: clone(app.metaKognitionsProtokolle || []),
    interaktionsLog: clone(app.interaktionsLog || { eintraege: [], wochenEmpfehlung: null }),
    notes: clone(app.notes || []),
    journal: clone(app.journal || []),
    statusLog: clone(app.statusLog || []),
    jahresberichte: clone(app.jahresberichte || {}),
    elterngespraeche: clone(app.elterngespraeche || []),
    kelGespraeche: clone(app.kelGespraeche || []),
    portfolioEntries: clone(app.portfolioEntries || {}),
    kiPortfolioSummaries: clone(app.kiPortfolioSummaries || {}),
    oberauData: clone(app.oberauData || {}),
  };
}

export function upsertArchivedClass(
  archivedClasses: ArchivedClassSnapshot[] | undefined,
  snapshot: ArchivedClassSnapshot
): ArchivedClassSnapshot[] {
  const current = Array.isArray(archivedClasses) ? archivedClasses : [];
  const existingIndex = current.findIndex(
    (item) => item.sourceClassId === snapshot.sourceClassId && item.schuljahr === snapshot.schuljahr
  );

  if (existingIndex < 0) return [...current, snapshot];

  return current.map((item, index) =>
    index === existingIndex ? { ...snapshot, id: item.id } : item
  );
}

export function normalizeArchivedClasses(raw: unknown): ArchivedClassSnapshot[] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const normalized: ArchivedClassSnapshot[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as any;
    const id = String(candidate.id || '').trim();
    const name = String(candidate.name || '').trim();
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);

    normalized.push({
      id,
      sourceClassId: String(candidate.sourceClassId || candidate.id),
      name,
      stufe: Number(candidate.stufe) || 1,
      schuljahr: String(candidate.schuljahr || 'Schuljahr nicht angegeben'),
      archiviertAm: String(candidate.archiviertAm || ''),
      schueler: clone(Array.isArray(candidate.schueler) ? candidate.schueler : []).map((student: any) => sanitizeStudentForArchive(student as Student)),
      faecher: clone(Array.isArray(candidate.faecher) ? candidate.faecher : []),
      fachConfig: clone(candidate.fachConfig || {}),
      noten: clone(candidate.noten || {}),
      notenMeta: clone(candidate.notenMeta || {}),
      notenGewichtung: clone(candidate.notenGewichtung || {}),
      mitarbeit: clone(candidate.mitarbeit || {}),
      mitarbeit_settings: clone(candidate.mitarbeit_settings),
      verhalten: clone(candidate.verhalten || {}),
      karten: clone(candidate.karten || {}),
      anwesenheit: clone(candidate.anwesenheit || {}),
      anwesenheitDetail: clone(candidate.anwesenheitDetail || {}),
      schuelerStimmung: clone(candidate.schuelerStimmung || {}),
      lernzielTracker: clone(candidate.lernzielTracker || {}),
      studentLernzielBewertungen: clone(candidate.studentLernzielBewertungen || {}),
      studentLernzielSemesterBewertungen: clone(candidate.studentLernzielSemesterBewertungen || {}),
      diagnostikErgebnisse: clone(candidate.diagnostikErgebnisse || []),
      diagnostikErhebungen: clone(candidate.diagnostikErhebungen || []),
      diagnosticResults: clone(candidate.diagnosticResults || []),
      ikmRecords: clone(candidate.ikmRecords || []),
      antolinRecords: clone(candidate.antolinRecords || []),
      schuelerGoals: clone(candidate.schuelerGoals || []),
      observations: clone(candidate.observations || []),
      metaKognitionsProtokolle: clone(candidate.metaKognitionsProtokolle || []),
      interaktionsLog: clone(candidate.interaktionsLog || { eintraege: [], wochenEmpfehlung: null }),
      notes: clone(candidate.notes || []),
      journal: clone(candidate.journal || []),
      statusLog: clone(candidate.statusLog || []),
      jahresberichte: clone(candidate.jahresberichte || {}),
      elterngespraeche: clone(candidate.elterngespraeche || []),
      kelGespraeche: clone(candidate.kelGespraeche || []),
      portfolioEntries: clone(candidate.portfolioEntries || {}),
      kiPortfolioSummaries: clone(candidate.kiPortfolioSummaries || {}),
      oberauData: clone(candidate.oberauData || {}),
    });
  }

  return normalized;
}

export function getArchivedFinalGrade(snapshot: ArchivedClassSnapshot, studentId: string, subject: string): string | null {
  const subjectData: any = snapshot.noten?.[studentId]?.[subject];
  for (const semester of ['2', '1']) {
    const value = subjectData?.[semester]?.endnote;
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return null;
}
