import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const printCenter = readFileSync('src/components/PrintCenter.tsx', 'utf8');
const printHeader = readFileSync('src/components/PrintHeader.tsx', 'utf8');
const exportService = readFileSync('src/lib/exportService.ts', 'utf8');
const pdfEngine = readFileSync('src/lib/pdfEngine.ts', 'utf8');

test('Druckzentrum: Klassenanzeige erfindet keine 1a und Schülerauswahl wird bei Klassenwechsel zurückgesetzt', () => {
  assert.match(printCenter, /Klasse \{app\?\.klassenbezeichnung\?\.trim\(\) \|\| 'nicht angegeben'\}/);
  assert.doesNotMatch(printCenter, /activeKlasse \|\| \(app as any\)\.selectedKlasse \|\| '1a'/);
  assert.match(printCenter, /\}, \[app\?\.activeClassId\]\);/);
  assert.match(printCenter, /setDiagSelectedStudentId\(firstStudentId\)/);
  assert.match(printCenter, /setPdfStudentId\(firstStudentId\)/);
  assert.match(printCenter, /belongsToActiveClass = students\.some/);
});

test('Druckzentrum: globaler Dokumentkopf behauptet keine amtliche Rechtsgrundlage', () => {
  assert.doesNotMatch(printHeader, /§ 17|Gemäß §|amtlich|offiziell/i);
  assert.match(printHeader, /Von Klassio erzeugte Druckansicht · vor Weitergabe prüfen/);
  assert.match(printHeader, /Schule nicht angegeben/);
  assert.match(printHeader, /Klasse: \{app\?\.klassenbezeichnung\?\.trim\(\) \|\| 'nicht angegeben'\}/);
});

test('Druckzentrum: Förder-PDF ist eine pädagogische Übersicht statt eines Bescheids', () => {
  assert.match(printCenter, /foerder_uebersicht/);
  assert.match(pdfEngine, /generateFoerderUebersicht/);
  assert.match(pdfEngine, /kein amtlicher Bescheid und keine behördliche Feststellung/);
  assert.match(pdfEngine, /Klassio trifft damit keine Entscheidung über sonderpädagogischen Förderbedarf/);
  assert.doesNotMatch(pdfEngine, /Bescheid über sonderpädagogischen Förderbedarf/);
  assert.doesNotMatch(pdfEngine, /Unterschrift Direktion/);
  assert.doesNotMatch(pdfEngine, /berechtigt zur Inanspruchnahme/);
});

test('Druckzentrum: Dossier ist standardmäßig datensparsam', () => {
  assert.match(printCenter, /profShowFinanzen, setProfShowFinanzen\] = useState\(false\)/);
  assert.match(printCenter, /profShowKIPortfolio, setProfShowKIPortfolio\] = useState\(false\)/);
  assert.match(printCenter, /profShowContacts, setProfShowContacts\] = useState\(false\)/);
  assert.match(printCenter, /Grunddaten ohne SV-Nummer und Elternkontakte/);
  assert.doesNotMatch(exportService, /<strong>SV-Nummer:<\/strong>/);
  assert.match(exportService, /showContacts: false/);
  assert.match(exportService, /showFinanzen: false/);
  assert.match(exportService, /showKIPortfolio: false/);
});

test('Druckzentrum: Export nutzt verschlüsselten App-State statt alter Klartext-KI-/Profil-Caches', () => {
  assert.match(printCenter, /app\.kiPortfolioSummaries\?\.\[st\.id\] \|\| ''/);
  assert.match(exportService, /appState\.kiPortfolioSummaries\?\.\[schuelerId\] \|\| ''/);
  assert.match(printCenter, /app\.oberauData\?\.\[st\.id\]\?\.remarks/);
  assert.match(exportService, /appState\.oberauData\?\.\[schuelerId\]\?\.remarks/);
  assert.doesNotMatch(printCenter, /localStorage\.getItem\(`ki_portfolio_summary_/);
  assert.doesNotMatch(printCenter, /localStorage\.getItem\(`oberau_remarks_/);
  assert.doesNotMatch(exportService, /localStorage\.getItem\(`ki_portfolio_summary_/);
});

test('Druckzentrum: erfundene Diagnose- und KEL-Aussagen bleiben entfernt', () => {
  assert.doesNotMatch(printCenter, /8\.5 \/ 10/);
  assert.doesNotMatch(exportService, /8\.5 \/ 10/);
  assert.doesNotMatch(printCenter, /Erfüllt M-Standard/);
  assert.doesNotMatch(printCenter, /hervorragende soziale Integration/);
  assert.match(printCenter, /Keine pädagogische Stärkennotiz hinterlegt/);
  assert.match(exportService, /Es wird kein künstlicher Gesamtindex aus Einzelwerten berechnet/);
});

test('Druckzentrum: Semester-Notenspiegel respektiert Noten-, Prozent- und Punkte-Modi', () => {
  assert.match(printCenter, /label: 'Semester-Notenspiegel'/);
  assert.match(printCenter, /const mode = getAssessmentMode\(app, f\)/);
  assert.match(printCenter, /mode === 'grades'/);
  assert.match(printCenter, /Math\.round\(Number\(calculatedNum\)\)\}%/);
  assert.doesNotMatch(printCenter, /Halbjahreszeugnis/);
  assert.doesNotMatch(printCenter, /Ganzjahreszeugnis/);
});

test('Druckzentrum: Dossier-Leistungsdaten verwenden die echte Beurteilungsart ohne künstliche Zielerreichung', () => {
  assert.match(printCenter, /getAssessmentMode\(app, subject\)/);
  assert.match(printCenter, /currentDisplay/);
  assert.doesNotMatch(printCenter, /Erwarteter Standard voll erfüllt/);
  assert.doesNotMatch(printCenter, /Erwarteter Standard erfüllt/);
  assert.doesNotMatch(printCenter, /Entwicklungsbedarf/);
  assert.match(exportService, /getAssessmentMode\(appState, subject\)/);
  assert.match(exportService, /Berechnete Stände sind keine automatisch festgesetzten Endnoten/);
});

test('Druckzentrum: Namenskarten und Motivationsurkunden geben keine amtliche Gültigkeit vor', () => {
  assert.match(printCenter, /Namenskarten \(Miniformat\)/);
  assert.match(printCenter, /NAMENSKARTE · KEIN AMTLICHER AUSWEIS/);
  assert.match(printCenter, /Motivations-Urkunde/);
  assert.doesNotMatch(printCenter, /OFFIZIELLER SCHÜLERAUSWEIS/);
  assert.doesNotMatch(printCenter, /Offizielles Schul-Diplom/);
});

test('Druckzentrum: Dossier-Druckpfad nutzt sandboxed srcdoc statt document.write', () => {
  assert.match(exportService, /iframe\.setAttribute\('sandbox', 'allow-modals'\)/);
  assert.match(exportService, /iframe\.srcdoc = html/);
  assert.doesNotMatch(exportService, /document\.write\(|doc\.write\(/);
  assert.match(exportService, /escapeHtml\(markdown\)/);
});

test('Tischschilder: lesbare Einzelvorschau blättert durch echte Kinder, Sammeldruck bleibt unverändert', () => {
  assert.match(printCenter, /tischPreviewMode, setTischPreviewMode\] = useState<'detail' \| 'bogen'>\('detail'\)/);
  assert.match(printCenter, /Tischschild · vergrößerte Einzelvorschau/);
  assert.match(printCenter, /Einzelansicht/);
  assert.match(printCenter, /Alle Karten/);
  assert.match(printCenter, /setPreviewZoom\(0\.85\)/);
  assert.match(printCenter, /Vorheriges Tischschild/);
  assert.match(printCenter, /Nächstes Tischschild/);
  assert.match(printCenter, /const previewList = previewOneCard \? list\.slice\(safeTischPreviewIndex, safeTischPreviewIndex \+ 1\) : list/);
  assert.match(printCenter, /function renderPreviewTemplate\(previewOnly = false\)/);
  assert.match(printCenter, /return renderSmartToolsView\(previewOnly && tischPreviewMode === 'detail'\)/);
  assert.equal((printCenter.match(/\{renderPreviewTemplate\(true\)\}/g) || []).length, 2, 'Only screen previews use detail mode');
  assert.equal((printCenter.match(/\{renderPreviewTemplate\(\)\}/g) || []).length, 1, 'The raw print element renders the whole batch');
  assert.match(printCenter, /Beim Drucken werden weiterhin/);
});
