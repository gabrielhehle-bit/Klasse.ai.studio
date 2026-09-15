import type { AppState } from '../types';

function omitKey<T extends Record<string, any> | undefined>(record: T, key: string): T {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return record;
  const next = { ...record };
  delete next[key];
  return next as T;
}

function removeStudentRefs<T>(items: T[] | undefined, studentId: string): T[] | undefined {
  if (!Array.isArray(items)) return items;
  return items.filter((item: any) =>
    item?.schuelerId !== studentId &&
    item?.studentId !== studentId &&
    item?.sid !== studentId
  );
}

export function removeStudentFromAppState(state: AppState, studentId: string): AppState {
  const next: AppState = {
    ...state,
    schueler: (state.schueler || []).filter(student => student.id !== studentId),
    noten: omitKey(state.noten, studentId) || {},
    mitarbeit: omitKey(state.mitarbeit, studentId) || {},
    verhalten: omitKey(state.verhalten, studentId) || {},
    karten: omitKey(state.karten, studentId) || {},
    anwesenheit: omitKey(state.anwesenheit, studentId) || {},
    anwesenheitDetail: omitKey(state.anwesenheitDetail, studentId),
    schuelerStimmung: omitKey(state.schuelerStimmung, studentId),
    hueBuch: omitKey(state.hueBuch, studentId) || {},
    awGruende: omitKey(state.awGruende, studentId) || {},
    verbal: omitKey(state.verbal, studentId) || {},
    saAssessments: omitKey(state.saAssessments, studentId),
    behavior_status: omitKey(state.behavior_status, studentId),
    behavior_notes: omitKey(state.behavior_notes, studentId),
    sue_kontrolle: omitKey(state.sue_kontrolle, studentId) || {},
    sitzplan_schueler: omitKey(state.sitzplan_schueler, studentId) || {},
    studentLernzielBewertungen: omitKey(state.studentLernzielBewertungen, studentId),
    studentLernzielSemesterBewertungen: omitKey(state.studentLernzielSemesterBewertungen, studentId),
    schuelerNotizen: omitKey(state.schuelerNotizen, studentId),
    jahresberichte: omitKey(state.jahresberichte, studentId),
    schuelerWochenplaene: omitKey(state.schuelerWochenplaene, studentId),

    notizen: removeStudentRefs(state.notizen, studentId) || [],
    notes: removeStudentRefs(state.notes, studentId),
    journal: removeStudentRefs(state.journal, studentId) || [],
    statusLog: removeStudentRefs(state.statusLog, studentId),
    stimmNotizen: removeStudentRefs(state.stimmNotizen, studentId),
    ikmRecords: removeStudentRefs(state.ikmRecords, studentId),
    antolinRecords: removeStudentRefs(state.antolinRecords, studentId),
    schuelerGoals: removeStudentRefs(state.schuelerGoals, studentId),
    observations: removeStudentRefs(state.observations, studentId),
    metaKognitionsProtokolle: removeStudentRefs(state.metaKognitionsProtokolle, studentId),
    diagnostikErhebungen: removeStudentRefs(state.diagnostikErhebungen, studentId),
    diagnosticResults: removeStudentRefs(state.diagnosticResults, studentId),
    diagnostikErgebnisse: (state.diagnostikErgebnisse || []).filter((item: any) =>
      item?.schuelerId !== studentId &&
      item?.studentId !== studentId &&
      item?.id !== studentId
    ),
    mitarbeitLogs: removeStudentRefs(state.mitarbeitLogs as any[], studentId) as any,
    verpassteInhalte: removeStudentRefs(state.verpassteInhalte, studentId),
    elterngespraeche: removeStudentRefs(state.elterngespraeche, studentId) || [],
    kelGespraeche: removeStudentRefs(state.kelGespraeche, studentId),

    differenzierungsGruppen: (state.differenzierungsGruppen || []).map(group => ({
      ...group,
      schuelerIds: (group.schuelerIds || []).filter(id => id !== studentId)
    })),
    dienste: (state.dienste || []).map(service => {
      const substitutions = { ...(service.substitutions || {}) };
      delete substitutions[studentId];
      Object.keys(substitutions).forEach(key => {
        if (substitutions[key] === studentId) delete substitutions[key];
      });
      return {
        ...service,
        schuelerIds: (service.schuelerIds || []).filter(id => id !== studentId),
        substitutions
      };
    }),
    sitzplanRegeln: (state.sitzplanRegeln || [])
      .map(rule => ({
        ...rule,
        schuelerIds: (rule.schuelerIds || []).filter(id => id !== studentId)
      }))
      .filter(rule => {
        const minStudents = rule.typ === 'nebeneinander' || rule.typ === 'nicht_nebeneinander' ? 2 : 1;
        return rule.schuelerIds.length >= minStudents;
      }),
    stationenbetriebe: (state.stationenbetriebe || []).map(plan => ({
      ...plan,
      erledigt: omitKey(plan.erledigt, studentId) || {}
    })),
    checklisten: (state.checklisten || []).map(list => ({
      ...list,
      eintraege: omitKey(list.eintraege, studentId) || {}
    })),
    customLists: (state.customLists || []).map(list => ({
      ...list,
      werte: omitKey(list.werte, studentId)
    })),
    interaktionsLog: state.interaktionsLog ? {
      ...state.interaktionsLog,
      eintraege: (state.interaktionsLog.eintraege || []).filter(entry => entry.schuelerId !== studentId),
      wochenEmpfehlung: state.interaktionsLog.wochenEmpfehlung ? {
        ...state.interaktionsLog.wochenEmpfehlung,
        schuelerIds: (state.interaktionsLog.wochenEmpfehlung.schuelerIds || []).filter(id => id !== studentId)
      } : null
    } : state.interaktionsLog,
    klassenkasse: state.klassenkasse ? {
      ...state.klassenkasse,
      sammlungen: (state.klassenkasse.sammlungen || []).map(collection => ({
        ...collection,
        status: omitKey(collection.status, studentId) || {},
        betraege: omitKey(collection.betraege, studentId) || {}
      })),
      transaktionen: (state.klassenkasse.transaktionen || []).map(transaction =>
        transaction.schuelerId === studentId
          ? { ...transaction, schuelerId: undefined }
          : transaction
      )
    } : state.klassenkasse,
    lehrerProfil: state.lehrerProfil ? {
      ...state.lehrerProfil,
      anekdoten: (state.lehrerProfil.anekdoten || []).filter(entry => entry.schuelerId !== studentId)
    } : state.lehrerProfil,
    selectedDiagnosticStudentId: state.selectedDiagnosticStudentId === studentId ? undefined : state.selectedDiagnosticStudentId,
    selectedStudentForPortfolio: state.selectedStudentForPortfolio === studentId ? undefined : state.selectedStudentForPortfolio,
    activePrintStudentId: state.activePrintStudentId === studentId ? undefined : state.activePrintStudentId,
    unterrichtsmodus_geburtstagskinder: (state.unterrichtsmodus_geburtstagskinder || []).filter(id => id !== studentId),
    gabicState: state.gabicState && state.gabicState.selectedStudentId === studentId
      ? { ...state.gabicState, selectedStudentId: '', childDraftAnswer: null }
      : state.gabicState,
  };

  return next;
}
