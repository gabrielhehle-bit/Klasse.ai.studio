import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const overview = readFileSync('src/components/dossier/DossierUebersicht.tsx', 'utf8');
const dossier = readFileSync('src/components/StudentDossier.tsx', 'utf8');
const observations = readFileSync('src/components/dossier/DossierBeobachtungenVerlauf.tsx', 'utf8');
const support = readFileSync('src/components/dossier/DossierFoerderung.tsx', 'utf8');

test('Dossierübersicht: Diagramme ersetzen Förderkarten und gemischte Gesamtnoten', () => {
  assert.match(overview, /Alle Fächer auf einen Blick/);
  assert.match(overview, /Verhalten, Befinden & Anwesenheit/);
  assert.match(overview, /getAssessmentMode/);
  assert.match(overview, /berechne/);
  assert.match(overview, /Noch keine Bewertung/);
  assert.doesNotMatch(overview, /Förderbedarf|Kein Förderbedarf|Präsenz unauffällig/);
});

test('Dossierübersicht: visueller Schnellüberblick kommt vor den Fachkarten und nutzt keinen gemischten Gesamtnotenschnitt', () => {
  assert.match(overview, /data-dossier-cockpit/);
  assert.match(overview, /data-dossier-subject-grid/);
  assert.match(overview, /data-subject-sparkline/);
  assert.match(overview, />Leistung</);
  assert.match(overview, /Fächer bewertet/);
  assert.match(overview, /Punktebasis/);
  assert.doesNotMatch(overview, /Punkte \+ Prozent/);
  assert.ok(overview.indexOf('data-dossier-cockpit') < overview.indexOf('data-dossier-subject-grid'));
  assert.ok(overview.indexOf('data-dossier-subject-grid') < overview.indexOf('Verhalten, Befinden & Anwesenheit'));
});

test('Dossierübersicht: Schnellüberblick bleibt ein echter Schuljahresstand unabhängig vom Diagrammfilter', () => {
  assert.match(overview, /const trendStats=useMemo\(\(\)=>getDossierOverviewStats\(app,student\.id,period\)/);
  assert.match(overview, /const yearStats=useMemo\(\(\)=>getDossierOverviewStats\(app,student\.id,'year'\)/);
  assert.match(overview, /yearStats\.logs\.length/);
  assert.match(overview, /yearStats\.excused\+yearStats\.unexcused/);
  assert.match(overview, /yearStats\.moodCount/);
  assert.match(overview, /trendStats\.weeks/);
  assert.match(overview, /Ganzes Schuljahr · Details per Klick/);
});

test('Dossierübersicht: Mitarbeit und Hausübungen sind vor der Vertiefung direkt sichtbar und mobil verdichtet', () => {
  assert.match(overview, /Kernüberblick/);
  assert.match(overview, /Mitarbeit & HÜ/);
  assert.match(overview, /homeworkCoreText/);
  assert.match(overview, /fehlende HÜ/);
  assert.match(overview, /getStudentSubjectParticipationSummary/);
  assert.match(overview, /getStudentHomeworkSummary/);
  assert.match(overview, /Mitarbeit —/);
  assert.match(overview, /HÜ —/);
  assert.match(overview, /grid grid-cols-2 gap-2 lg:grid-cols-5/);
  assert.match(overview, /col-span-2[^"]*lg:col-span-1/);
  assert.ok(overview.indexOf('Mitarbeit & HÜ') < overview.indexOf('Verhalten, Befinden & Anwesenheit'));
});

test('Dossierübersicht: Fachkarten priorisieren konkrete Daten und vermeiden Textballast', () => {
  assert.match(overview, /Bewertung, Trend, Mitarbeit und Hausübungen direkt pro Fach/);
  assert.match(overview, /Trend ab 2 Nachweisen/);
  assert.match(overview, /Trend ab 2/);
  assert.match(overview, /aria-label={`Bewertungsstand \$\{cardData\.fach\}`}/);
  assert.match(overview, /const participationText=.*Mitarbeit —/);
  assert.match(overview, /const homeworkText=.*HÜ —/);
});

test('Dossierübersicht: Verläufe sind kompakt, einheitlich und ohne doppelte Großstatus aufgebaut', () => {
  assert.match(overview, />Verläufe</);
  assert.match(overview, /data-dossier-trend-card="behavior"/);
  assert.match(overview, /data-dossier-trend-card="mood"/);
  assert.match(overview, /data-dossier-trend-card="attendance"/);
  assert.match(overview, /['recent','6 Wochen']/);
  assert.match(overview, /['year','Schuljahr']/);
  assert.match(overview, /Werte per Tipp oder Mauszeiger/);
  assert.match(overview, /Letzter Eintrag:/);
  assert.doesNotMatch(overview, /Letzte 6 Wochen|Gesamtes Schuljahr/);
});

test('Dossierübersicht: Notizen zeigen Typ, Fach, robuste Datumsquelle und direkte Erfassung', () => {
  assert.match(overview, /Aktuelle Notizen/);
  assert.match(overview, /Elternkontakt/);
  assert.match(overview, /Fachnotiz/);
  assert.match(overview, /Positive Beobachtung/);
  assert.match(overview, /noteDateLabel/);
  assert.match(overview, /note\?\.timestamp/);
  assert.match(overview, /Alle Notizen öffnen/);
  assert.match(overview, /onQuickEntry\?onQuickEntry\('parent'\)/);
  assert.match(overview, /die neuesten 5 hier im Überblick/);
});

test('Dossier-Notizdetail nutzt dieselbe Quelle wie der Überblick und pflegt Legacy-Einträge mit', () => {
  assert.match(observations, /getStudentNotes\(app, student\.id\)/);
  assert.match(observations, /app\.journal/);
  assert.match(observations, /app\.notizen/);
  assert.match(observations, /notizen: \(prev\.notizen \|\| \[\]\)\.map\(patch\)/);
  assert.match(observations, /notizen: \(prev\.notizen \|\| \[\]\)\.filter/);
  assert.match(observations, /noteDateKey\(note\)/);
});

test('Dossierübersicht: Eintrag öffnet bestehende Erfassungsformulare für das gewählte Kind', () => {
  assert.match(overview, /Eintrag/);
  assert.match(dossier, /onQuickEntry=\{openOverviewQuickEntry\}/);
  assert.match(dossier, /initialQuickNoteCategory=\{pendingQuickEntry === 'parent' \? 'Eltern'/);
  assert.match(dossier, /initialAddGoal=\{pendingQuickEntry === 'goal'\}/);
  assert.match(dossier, /initialFocusStrength=\{pendingQuickEntry === 'strength'\}/);
  assert.match(observations, /useState\(Boolean\(initialQuickNoteCategory\)\)/);
  assert.match(support, /useState\(Boolean\(initialAddGoal\)\)/);
  assert.match(support, /strengthInputRef\.current\?\.focus/);
});

test('Dossierübersicht: vier Hauptbereiche, Kinderwechsel, KEL, PDF, Druck und Fokus bleiben verfügbar', () => {
  assert.match(dossier, /getFilteredMainAreas\(\)\.map/);
  assert.match(dossier, /onStudentChange/);
  assert.match(dossier, /KEL für Eltern/);
  assert.match(dossier, /Dossier \(PDF\)/);
  assert.match(dossier, /setPage\?\.\('drucken'\)/);
  assert.match(dossier, /dossierFocusMode:!prev\.dossierFocusMode/);
  assert.match(overview, /Aktuelle Notizen/);
  assert.match(overview, /onSubjectSelect/);
});

test('Schülerdossier: Identität, Kinderwechsel und Aktionen leben in genau einem kompakten Kopf', () => {
  assert.equal((dossier.match(/id="student-switcher"/g) || []).length, 1);
  assert.equal((dossier.match(/data-student-dossier-nav/g) || []).length, 1);
  assert.match(dossier, /COMPACT STUDENT NAVIGATION/);
  assert.doesNotMatch(dossier, /student\.foto/);
  assert.match(dossier, /aria-label="Initialen"/);
  assert.match(dossier, /🎉 Geburtstag/);
  assert.match(dossier, />SPF</);
  assert.match(dossier, />ESPF</);
  assert.match(dossier, />DAZ</);
  assert.match(dossier, /Fokusmodus starten/);
  assert.match(dossier, /Fokusmodus beenden/);
  assert.doesNotMatch(dossier, /Profile Hero Header Card/);
});

test('Schülerdossier: Fokusmodus hat nur eine schlanke Modusleiste ohne zweiten Kinderwechsler', () => {
  assert.match(dossier, /data-dossier-focus-bar/);
  assert.match(dossier, /aria-label="Fokusmodus-Bereiche"/);
  assert.doesNotMatch(dossier, /Quick Switcher inside Focus Mode/);
  assert.doesNotMatch(dossier, /Mühelose Bearbeitung von Schülerbeobachtungen/);
});
