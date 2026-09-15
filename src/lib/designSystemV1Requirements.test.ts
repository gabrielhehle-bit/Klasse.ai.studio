import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('Login verwendet das semantische Klassio-Designsystem statt hartcodierter Indigo-Oberfläche', () => {
  const source = read('src/components/AccessGate.tsx');

  assert.match(source, /from '\.\/ui'/);
  assert.match(source, /<Input/);
  assert.match(source, /<Button/);
  assert.match(source, /var\(--surface-app/);
  assert.match(source, /var\(--accent\)/);

  assert.doesNotMatch(source, /bg-slate-950/);
  assert.doesNotMatch(source, /bg-indigo-600/);
  assert.doesNotMatch(source, /focus:ring-indigo-500/);
});

test('Themes tauschen nicht mehr still die globale UI-Schrift aus', () => {
  const css = read('src/index.css');
  const appFontDeclarations = [...css.matchAll(/--app-font:\s*([^;]+);/g)].map(match => match[1].trim());

  assert.ok(appFontDeclarations.length >= 10, 'Theme-Schriftdeklarationen wurden nicht gefunden.');
  assert.ok(
    appFontDeclarations.every(value => value.startsWith('"DM Sans"')),
    'Jedes Theme muss dieselbe Klassio-UI-Grundschrift verwenden.'
  );
});

test('Große semantische Controls behalten einen einheitlichen Radius', () => {
  const button = read('src/components/ui/Button.tsx');
  const input = read('src/components/ui/Input.tsx');
  const select = read('src/components/ui/Select.tsx');
  const iconButton = read('src/components/ui/IconButton.tsx');

  assert.match(button, /lg: 'min-h-\[52px\][^']*rounded-xl/);
  assert.match(input, /lg: 'min-h-\[52px\][^']*rounded-xl/);
  assert.match(select, /lg: 'min-h-\[52px\][^']*rounded-xl/);
  assert.match(iconButton, /lg: 'w-13 h-13[^']*rounded-xl/);
});


test('Topbar bündelt seltene Aktionen unter Mehr und enthält keinen wirkungslosen Einfachmodus', () => {
  const source = read('src/components/Topbar.tsx');

  assert.doesNotMatch(source, /header_simple_mode/);
  assert.doesNotMatch(source, /setSimpleHeaderMode/);
  assert.equal((source.match(/paypal\.me\/gabrielhehle/g) || []).length, 1);
  assert.equal((source.match(/docs\.google\.com\/spreadsheets/g) || []).length, 1);
  assert.match(source, /setPage\('settings'\)/);
});

test('Sidebar verwendet eine ruhige aktive Navigation ohne Sonderbehandlung für Unterricht', () => {
  const source = read('src/components/Sidebar.tsx');

  assert.match(source, /Klassio/);
  assert.match(source, /app\.schulName \|\| app\.schulOrt/);
  assert.match(source, /bg-\[var\(--accent-soft\)\].*border-\[var\(--accent\)\]\/20/s);
  assert.doesNotMatch(source, /item\.id === 'unterricht'/);
  assert.doesNotMatch(source, />Aktiv<\/div>/);
});


test('Haupt-Hubs verwenden dieselbe ruhige Karten- und Seitenhierarchie', () => {
  for (const file of [
    'src/components/KlasseHub.tsx',
    'src/components/PlanungHub.tsx',
    'src/components/LeistungenHub.tsx',
    'src/components/UnterrichtHub.tsx',
  ]) {
    const source = read(file);
    assert.match(source, /max-w-\[1180px\]/, file + ' muss die gemeinsame Seitenbreite verwenden.');
    assert.match(source, /border-\[var\(--border-subtle,var\(--border\)\)\]/, file + ' muss semantische Border-Tokens verwenden.');
    assert.doesNotMatch(source, /hover:-translate-y-0\.5/, file + ' soll Karten nicht mehr springen lassen.');
    assert.doesNotMatch(source, /rounded-\[1\.75rem\]|rounded-\[2rem\]/, file + ' soll keine alten übergroßen Bubble-Radien mehr verwenden.');
  }
});


test('Standard Heute Ansicht verwendet semantische Klassio Tokens statt fixer Slate/Indigo Oberfläche', () => {
  const source = read('src/components/DashboardSimpleOverview.tsx');

  assert.match(source, /surface-card/);
  assert.match(source, /surface-subtle/);
  assert.match(source, /border-default/);
  assert.match(source, /focus-ring/);
  assert.doesNotMatch(source, /border-slate-200/);
  assert.doesNotMatch(source, /bg-white/);
  assert.doesNotMatch(source, /text-indigo-600|bg-indigo-50|outline-indigo-600/);
});


test('Setup Einstieg verwendet Klassio Branding und semantische Oberflächen', () => {
  const source = read('src/components/SetupWizard.tsx');

  assert.match(source, /Willkommen bei Klassio/);
  assert.match(source, /Dein digitaler Lehrerarbeitsplatz/);
  assert.match(source, /surface-app/);
  assert.match(source, /surface-card/);
  assert.match(source, /accent-hover/);
  assert.doesNotMatch(source, /Gabriel Intelligent Classroom/);
  assert.doesNotMatch(source, /bg-slate-50 flex items-start justify-center/);
});


test('Kinderliste nutzt im primären Arbeitsbereich semantische Klassio-Flächen', () => {
  const source = read('src/components/StudentList.tsx');

  assert.match(source, /bg-\[var\(--surface-card,var\(--surface\)\)\] rounded-2xl border border-\[var\(--border-subtle,var\(--border\)\)\]/);
  assert.match(source, /bg-\[var\(--accent\)\].*Schüler hinzufügen/s);
  assert.match(source, /focus:border-\[var\(--accent\)\]/);
  assert.match(source, /hover:bg-\[var\(--accent-soft\)\]\/55/);
});

test('Notenmappe zeigt Fachwahl und Zusatzwerkzeuge nicht mehr in zwei aufeinanderfolgenden Steuerleisten', () => {
  const source = read('src/components/Gradebook.tsx');

  assert.doesNotMatch(source, /Aktives Schulfach wählen:/);
  assert.match(source, /Streamlined Top Control Bar/);
  assert.match(source, /setShowGradeCalculator\(true\)/);
  assert.match(source, /setShowWeights\(true\)/);
  assert.match(source, /bg-\[var\(--surface-card,var\(--surface\)\)\] rounded-2xl p-4/);
  assert.match(source, /bg-\[var\(--accent\)\].*>Bewertung</s);
});


test('Wochenplanung bündelt Primäraktionen ohne doppelte Einträge im Mehr-Menü', () => {
  const source = read('src/components/WeeklyPlan.tsx');

  assert.match(source, />Wochenplanung</);
  assert.match(source, /weekly-plan-shell flex flex-col bg-\[var\(--surface-app,var\(--bg\)\)\]/);
  assert.equal((source.match(/Wochenplan für Kinder erstellen/g) || []).length, 2, 'Beschriftung darf nur im Primärbutton und im zugehörigen Titel vorkommen.');
  assert.equal((source.match(/setShowSchuelerWochenplanModal\(true\)/g) || []).length, 1, 'Kinder-Wochenplan darf nur eine sichtbare Aktion haben.');
  assert.equal((source.match(/setIsFullscreen\(!isFullscreen\)/g) || []).length, 1, 'Vollbild darf nur eine sichtbare Umschaltaktion haben.');
});

test('Jahresplanung verwendet semantische Klassio-Flächen im Arbeitsrahmen', () => {
  const source = read('src/components/YearlyPlan.tsx');

  assert.match(source, /yearly-plan-shell flex flex-col space-y-4 bg-\[var\(--surface-app,var\(--bg\)\)\]/);
  assert.match(source, /bg-\[var\(--surface-card,var\(--surface\)\)\].*border-\[var\(--border-subtle,var\(--border\)\)\]/s);
  assert.match(source, /bg-\[var\(--accent\)\].*Heute/s);
  assert.doesNotMatch(source, /yearly-plan-shell flex flex-col space-y-4 bg-\[#f4f7f3\]/);
});


test('Anwesenheit und Befindens-Check-in verwenden die gemeinsame Klassio Oberflächensprache', () => {
  const attendance = read('src/components/Attendance.tsx');
  const kidCheckIn = read('src/components/cockpit/widgets/KidAttendanceWidget.tsx');

  assert.match(attendance, /max-w-\[1180px\]/);
  assert.match(attendance, /bg-\[var\(--surface-card,var\(--surface\)\)\].*Anwesenheit/s);
  assert.match(attendance, /bg-\[var\(--accent\)\].*Offene Einträge als anwesend bestätigen/s);
  assert.doesNotMatch(attendance, /<h1[^>]*uppercase[^>]*>\s*Anwesenheit/);

  assert.match(kidCheckIn, /Ich bin da!/);
  assert.match(kidCheckIn, /freiwilliger Check-in/);
  assert.match(kidCheckIn, /rounded-2xl border shadow-xl/);
  assert.doesNotMatch(kidCheckIn, /Schüler-Check-In ·/);
});

test('Sitzplan verwendet ruhige Modusschalter und keine springenden Schülerkarten', () => {
  const source = read('src/components/SeatingPlan.tsx');
  const studentCardClassIndex = source.indexOf('student-card transform-gpu');
  assert.ok(studentCardClassIndex > 0, 'Schülerkarten-Stil wurde nicht gefunden.');
  const studentCardContext = source.slice(Math.max(0, studentCardClassIndex - 1800), studentCardClassIndex + 500);

  assert.match(source, /surface-card/);
  assert.match(source, /surface-subtle/);
  assert.match(source, /focus-ring/);
  assert.doesNotMatch(studentCardContext, /whileHover=\{\{ scale: 1\.02 \}\}/);
  assert.match(source, /bg-\[var\(--surface-card,var\(--surface\)\)\].*Sitzplan-Modus/s);
});

test('Diagnostik verwendet über Start, Navigation und Arbeitsansichten dieselbe Klassio Hierarchie', () => {
  const home = read('src/components/diagnostics/DiagnosticHome.tsx');
  const nav = read('src/components/diagnostics/DiagnosticNavigationHeader.tsx');
  const individual = read('src/components/diagnostics/DiagnosticIndividual.tsx');
  const klass = read('src/components/diagnostics/DiagnosticClass.tsx');
  const results = read('src/components/diagnostics/DiagnosticResults.tsx');

  for (const source of [home, individual, klass, results]) {
    assert.match(source, /max-w-\[1180px\]/);
  }
  assert.match(home, /surface-card/);
  assert.match(home, /accent-soft/);
  assert.doesNotMatch(home, /whileHover=\{\{ y: -3/);
  assert.match(nav, /rounded-2xl border border-\[var\(--border-subtle,var\(--border\)\)\]/);
  assert.match(nav, /focus|accent|surface-subtle/);
});

test('Druckzentrum modernisiert nur die Bedienoberfläche und lässt A4 Druckflächen weiß', () => {
  const source = read('src/components/PrintCenter.tsx');

  assert.match(source, /max-w-\[1180px\]/);
  assert.match(source, />Druckzentrum</);
  assert.match(source, /1\. Dokument/);
  assert.match(source, /2\. Anpassen/);
  assert.match(source, /3\. Vorschau &amp; Druck/);
  assert.match(source, /surface-card/);
  assert.match(source, /focus-ring/);

  assert.match(source, /print-center-overlay hidden print:block w-full bg-white/);
  assert.match(source, /bg-white[^"]*single-sheet-preview/);
});


test('Materialbibliothek, Kasse & Orga und Einstellungen verwenden semantische Klassio-Flächen', () => {
  const material = read('src/components/Materialbibliothek.tsx');
  const orga = read('src/components/OrgaLists.tsx');
  const settings = read('src/components/Settings.tsx');
  const settingsHeader = read('src/components/settings/SettingsHeader.tsx');
  const settingsDashboard = read('src/components/settings/SettingsDashboard.tsx');

  assert.match(material, /material-library-shell max-w-\[1180px\]/);
  assert.match(material, /sticky top-0 z-\[150\] bg-\[var\(--surface-app/);
  assert.match(material, /activeTab === tab \? 'bg-\[var\(--accent\)\]/);
  assert.match(material, /Neues Material<\/span>/);
  assert.match(material, /bg-\[var\(--accent\)\] hover:bg-\[var\(--accent-hover\)\][^\n]*transition-colors/);

  assert.match(orga, /max-w-\[1180px\]/);
  assert.match(orga, /bg-\[var\(--surface-card,var\(--surface\)\)\] rounded-2xl border/);
  assert.match(orga, /bg-\[var\(--accent\)\] hover:bg-\[var\(--accent-hover\)\]/);

  assert.match(settings, /max-w-\[1180px\]/);
  assert.match(settingsHeader, /bg-\[var\(--surface-card,var\(--surface\)\)\]/);
  assert.match(settingsHeader, /bg-\[var\(--accent\)\] text-\[var\(--accent-text,#fff\)\]/);
  assert.match(settingsDashboard, /hover:bg-\[var\(--surface-subtle,var\(--surface2\)\)\]/);
  assert.doesNotMatch(settingsDashboard, /hover:shadow-md hover:border-emerald-300/);
});


test('Übergabemappe modernisiert nur die Bedienoberfläche und lässt Druckseiten unverändert weiß', () => {
  const source = read('src/components/Uebergabemappe.tsx');

  assert.match(source, /handover-folder-shell max-w-\[1180px\]/);
  assert.match(source, /activeTab === 'config' \? 'bg-\[var\(--surface-card/);
  assert.match(source, /bg-\[var\(--accent\)\].*Notfallmappe konfigurieren/s);
  assert.match(source, /bg-\[var\(--surface-card,var\(--surface\)\)\] rounded-2xl p-6 sm:p-8/);
  assert.match(source, /focus:ring-2 focus:ring-\[var\(--focus-ring,var\(--accent\)\)\]/);

  assert.match(source, /printable-page/);
  assert.match(source, /bg-white text-slate-800/);
});


test('Notizen, Statistik, Archiv und Backup verwenden die gemeinsame Klassio Arbeitsoberfläche', () => {
  const behavior = read('src/components/Behavior.tsx');
  const statistics = read('src/components/Statistics.tsx');
  const archive = read('src/components/Archive.tsx');
  const backup = read('src/components/Backup.tsx');

  assert.match(behavior, /max-w-\[1180px\]/);
  assert.match(behavior, /bg-\[var\(--surface-card,var\(--surface\)\)\].*Notizen & Beobachtungen/s);
  assert.match(behavior, /activeTab === tab\.id \? 'bg-\[var\(--accent\)\]/);
  assert.match(behavior, /chronikFilter === f\.id \? 'bg-\[var\(--accent\)\]/);

  assert.match(statistics, /statistics-shell[^\n]*max-w-\[1180px\]/);
  assert.match(statistics, /bg-\[var\(--surface-subtle,var\(--surface2\)\)\] p-1 rounded-xl/);
  assert.match(statistics, /bg-\[var\(--surface-card,var\(--surface\)\)\] p-4 rounded-2xl/);

  assert.match(archive, /archive-shell max-w-\[1180px\]/);
  assert.match(archive, /sticky top-0 z-20 bg-\[var\(--surface-app/);
  assert.match(archive, /bg-\[var\(--accent\)\] hover:bg-\[var\(--accent-hover\)\]/);

  assert.match(backup, /max-w-\[1180px\]/);
  assert.match(backup, /Datensicherung & Import/);
  assert.match(backup, /order-3 bg-\[var\(--surface-card,var\(--surface\)\)\]/);
  assert.match(backup, /border-\[var\(--border-subtle,var\(--border\)\)\]/);
});


test('Portfolio, Jahresbericht, KEL und Stundenentwürfe folgen der gemeinsamen Klassio Hierarchie', () => {
  const portfolio = read('src/components/Portfolio.tsx');
  const yearlyReport = read('src/components/Jahresbericht.tsx');
  const kel = read('src/components/KELGespraeche.tsx');
  const drafts = read('src/components/Drafts.tsx');

  assert.match(portfolio, /max-w-\[1180px\]/);
  assert.match(portfolio, /rounded-2xl border border-\[var\(--border-subtle,var\(--border\)\)\] bg-\[var\(--surface-card,var\(--surface\)\)\]/);
  assert.match(portfolio, /activeTab === 'lernziele'[\s\S]*bg-\[var\(--accent\)\] text-\[var\(--accent-text,#fff\)\]/);

  assert.match(yearlyReport, /year-report-shell[^\n]*max-w-\[1180px\]/);
  assert.match(yearlyReport, /bg-\[var\(--surface-app,var\(--bg\)\)\]/);
  assert.match(yearlyReport, /bg-\[var\(--accent\)\] border border-transparent hover:bg-\[var\(--accent-hover\)\]/);
  assert.match(yearlyReport, /Fehlende Entwürfe erstellen/);

  assert.match(kel, /max-w-\[1180px\]/);
  assert.match(kel, /KEL-Gespräche/);
  assert.match(kel, /bg-\[var\(--accent\)\] text-\[var\(--accent-text,#fff\)\]/);

  assert.match(drafts, /max-w-\[1180px\]/);
  assert.match(drafts, /bg-\[var\(--surface-card,var\(--surface\)\)\] border border-\[var\(--border-subtle,var\(--border\)\)\] rounded-2xl/);
  assert.match(drafts, /KI-Planer/);
});


test('Elterngespräche, Differenzierung, verbale Beurteilung und Arbeitsblatt-Generator verwenden Klassio Oberflächen', () => {
  const meetings = read('src/components/MeetingLogs.tsx');
  const differentiation = read('src/components/Differentiation.tsx');
  const verbal = read('src/components/VerbalAssessment.tsx');
  const worksheet = read('src/components/WorksheetGenerator.tsx');

  assert.match(meetings, /max-w-\[1180px\]/);
  assert.match(meetings, /bg-\[var\(--surface-card,var\(--surface\)\)\].*border-\[var\(--border-subtle,var\(--border\)\)\]/s);
  assert.match(meetings, /bg-\[var\(--accent\)\] hover:bg-\[var\(--accent-hover\)\]/);

  assert.match(differentiation, /max-w-\[1180px\]/);
  assert.match(differentiation, /activeMainTab === 'ki'[\s\S]*bg-\[var\(--accent\)\]/);
  assert.match(differentiation, /bg-\[var\(--surface-card,var\(--surface\)\)\] rounded-2xl/);

  assert.match(verbal, /max-w-\[1180px\]/);
  assert.match(verbal, /Verbale Beurteilung KI/);
  assert.match(verbal, /bg-\[var\(--accent\)\] hover:bg-\[var\(--accent-hover\)\]/);

  assert.match(worksheet, /worksheet-generator-container[^\n]*bg-\[var\(--surface-app,var\(--bg\)\)\]/);
  assert.match(worksheet, /max-w-\[1180px\]/);
  assert.match(worksheet, /Arbeitsblatt generieren/);
  assert.match(worksheet, /bg-\[var\(--accent\)\] hover:bg-\[var\(--accent-hover\)\]/);

  assert.match(worksheet, /\.print-sheet-area/);
  assert.match(worksheet, /print:bg-white/);
});


test('Stationenbetrieb, Stimm-Notizen, Elternbrief und Notenübersicht folgen der Klassio Oberfläche', () => {
  const stations = read('src/components/StationenbetriebManager.tsx');
  const voice = read('src/components/StimmNotizen.tsx');
  const email = read('src/components/EmailAssistant.tsx');
  const grades = read('src/components/GradeOverview.tsx');

  assert.match(stations, /bg-\[var\(--surface-app,var\(--bg\)\)\]/);
  assert.match(stations, /max-w-\[1180px\]/);
  assert.match(stations, /bg-\[var\(--surface-card,var\(--surface\)\)\].*border-\[var\(--border-subtle,var\(--border\)\)\]/s);

  assert.match(voice, /max-w-\[1180px\]/);
  assert.match(voice, /Stimm-Notizen/);
  assert.match(voice, /bg-\[var\(--accent\)\] text-\[var\(--accent-text,#fff\)\]/);

  assert.match(email, /max-w-\[1180px\]/);
  assert.match(email, /bg-\[var\(--accent\)\] hover:bg-\[var\(--accent-hover\)\]/);
  assert.match(email, /Generierter Entwurf/);

  assert.match(grades, /max-w-\[1180px\]/);
  assert.match(grades, /Gesamtübersicht Noten/);
  assert.match(grades, /bg-\[var\(--surface-card,var\(--surface\)\)\] border border-\[var\(--border-subtle,var\(--border\)\)\] rounded-2xl/);
});
