import test from 'node:test';
import assert from 'node:assert/strict';
import { accountSyncState, appStateFingerprint } from './accountSyncService';

const defaultMitarbeit = {
  thresholds: { 1: 13, 2: 10, 3: 7, 4: 4, 5: 0 },
  mode: 'absolute',
};

test('Konto-Sync: alte sparse JSONs und nachgeladene Default-Felder haben denselben Fingerprint', () => {
  const sparse = {
    activeClassId: 'class-1',
    classes: [{ id: 'class-1', name: '1A' }],
    currentPage: 'dashboard',
    previousPage: 'klasse',
  } as any;

  const hydrated = {
    currentPage: 'noten',
    previousPage: 'dashboard',
    activeClassId: 'class-1',
    studentLernzielBewertungen: {},
    studentLernzielSemesterBewertungen: {},
    differenzierungsGruppen: [],
    kelGespraeche: [],
    kiPortfolioSummaries: {},
    klassenglas_missions: [],
    mitarbeit_settings: defaultMitarbeit,
    notes: [],
    oberauData: {},
    portfolioEntries: {},
    stundenbilderMigriert: true,
    vertretungHinweise: '',
    denkzettelNotes: [],
    classes: [{
      name: '1A',
      klassenglas_missions: [],
      id: 'class-1',
    }],
  } as any;

  assert.equal(appStateFingerprint(sparse), appStateFingerprint(hydrated));
});

test('Konto-Sync: lokale Denkzettel-Willkommensnotiz erzeugt keine Geräteänderung', () => {
  const base = {
    activeClassId: 'class-1',
    classes: [{ id: 'class-1', name: '1A' }],
  } as any;
  const withLocalWelcome = {
    ...base,
    denkzettelNotes: [{
      id: 'welcome-1',
      text: 'Lokale Hilfe',
      color: 'yellow',
      completed: false,
      category: 'allgemein',
      createdAt: 1789732435460,
    }],
  } as any;

  assert.equal(appStateFingerprint(base), appStateFingerprint(withLocalWelcome));
  assert.deepEqual((accountSyncState(withLocalWelcome) as any).denkzettelNotes, []);
});

test('Konto-Sync: echte Denkzettel-Notizen bleiben Synchronisationsdaten', () => {
  const base = {
    activeClassId: 'class-1',
    classes: [{ id: 'class-1', name: '1A' }],
  } as any;
  const withRealNote = {
    ...base,
    denkzettelNotes: [{
      id: 'note-1',
      text: 'Elterngespräch vorbereiten',
      color: 'yellow',
      completed: false,
      category: 'eltern',
      createdAt: 1789732435460,
    }],
  } as any;

  assert.notEqual(appStateFingerprint(base), appStateFingerprint(withRealNote));
  assert.equal((accountSyncState(withRealNote) as any).denkzettelNotes[0].text, 'Elterngespräch vorbereiten');
});
