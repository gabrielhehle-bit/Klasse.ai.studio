import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const teachingSurface = readFileSync("src/components/Unterrichtsmodus.tsx", "utf8");
const cockpitWidget = readFileSync("src/components/cockpit/CockpitWidget.tsx", "utf8");
const templatesModal = readFileSync("src/components/cockpit/CockpitVorlagenModal.tsx", "utf8");
const kidAttendance = readFileSync("src/components/cockpit/widgets/KidAttendanceWidget.tsx", "utf8");
const boardTextEditor = readFileSync("src/components/cockpit/BoardTextEditor.tsx", "utf8");

const widgetTypes = (source: string) =>
  [...new Set([...source.matchAll(/type:\s*"([^"]+)"/g)].map((match) => match[1]))];

test("Cockpit: freie Unterrichtsfläche bleibt weiß und ohne Startkarte", () => {
  assert.match(
    teachingSurface,
    /currentIsLight\s*\?\s*"bg-white border-slate-200 shadow-sm"\s*:\s*"bg-white border-slate-200 shadow-inner"/,
  );
  assert.doesNotMatch(teachingSurface, /Eine Fläche für deinen Unterricht/);
  assert.doesNotMatch(teachingSurface, /cockpit-empty-state-hint/);
});

test("Cockpit: Widgetauswahl startet ruhig mit Kategorien statt mit 108 Karten", () => {
  assert.match(teachingSurface, /useState<string>\("categories"\)/);
  assert.match(teachingSurface, /\{ id: "categories", label: "Kategorien" \}/);
  assert.doesNotMatch(teachingSurface, /Alle Hilfen/);
  assert.match(teachingSurface, /Wähle oben eine Kategorie/);
  assert.match(teachingSurface, /durchsucht Klassio automatisch den gesamten Widget-Katalog/);
  assert.doesNotMatch(teachingSurface, /Für den Unterricht/);
  assert.doesNotMatch(teachingSurface, /activeWidgetCategory === "everyday"/);
  assert.doesNotMatch(teachingSurface, /DEFAULT_QUICK_WIDGETS/);
  assert.doesNotMatch(teachingSurface, /QUICK_WIDGET_META/);
});

test("Cockpit: verständliche Kategorien und eigene Favoriten bleiben erhalten", () => {
  for (const label of [
    "Ablauf & Organisation",
    "Klasse & Interaktion",
    "Mathematik",
    "Deutsch",
    "Sachunterricht",
    "Werkzeuge",
    "Spiele & Fokus",
  ]) {
    assert.ok(teachingSurface.includes(label), `Kategorie fehlt: ${label}`);
  }
  assert.match(teachingSurface, /★ Favoriten/);
  assert.match(teachingSurface, /Zu Favoriten hinzufügen/);
  assert.match(teachingSurface, /Von Favoriten entfernen/);
});

test("Cockpit: alle erhaltenen Standard-Widgettypen sind im Picker und in den Kategorie-Zählern", () => {
  const defaultStart = teachingSurface.indexOf("const DEFAULT_COCKPIT_LAYOUT");
  const defaultEnd = teachingSurface.indexOf("const DEFAULT_WORKSPACE_PROFILES", defaultStart);
  assert.ok(defaultStart >= 0 && defaultEnd > defaultStart);
  const defaults = widgetTypes(teachingSurface.slice(defaultStart, defaultEnd));

  const starts = [...teachingSurface.matchAll(/const allAvailableWidgets = \[/g)].map((match) => match.index ?? -1);
  assert.ok(starts.length >= 2, "beide Widget-Kataloge müssen vorhanden sein");
  const counterCatalog = widgetTypes(teachingSurface.slice(starts[0], starts[1]));
  const pickerEnd = teachingSurface.indexOf("const resolvedActiveFach", starts[1]);
  const pickerCatalog = widgetTypes(teachingSurface.slice(starts[1], pickerEnd));

  assert.equal(defaults.length, 108, "Standardlayout muss alle 108 Widgettypen enthalten");
  assert.equal(counterCatalog.length, 108, "Kategorie-Zähler muss alle 108 Widgettypen kennen");
  assert.equal(pickerCatalog.length, 108, "Widget-Picker muss alle 108 Widgettypen enthalten");

  for (const type of defaults) {
    assert.ok(counterCatalog.includes(type), `Kategorie-Zähler kennt ${type} nicht`);
    assert.ok(pickerCatalog.includes(type), `Widget-Picker kennt ${type} nicht`);
  }
});

test("Cockpit: gespeicherte Layouts verlieren keinen Standard-Widgettyp", () => {
  const defaultStart = teachingSurface.indexOf("const DEFAULT_COCKPIT_LAYOUT");
  const defaultEnd = teachingSurface.indexOf("const DEFAULT_WORKSPACE_PROFILES", defaultStart);
  const defaults = widgetTypes(teachingSurface.slice(defaultStart, defaultEnd));

  const knownStart = teachingSurface.indexOf("const knownTypes = [");
  const knownEnd = teachingSurface.indexOf("];", knownStart);
  assert.ok(knownStart >= 0 && knownEnd > knownStart);
  const known = [...new Set(
    [...teachingSurface.slice(knownStart, knownEnd).matchAll(/"([^"]+)"/g)].map((match) => match[1])
  )];

  for (const type of defaults) {
    assert.ok(known.includes(type), `Layout-Sanitizer würde ${type} entfernen`);
  }
  assert.ok(known.includes("zahlenraum"), "Zahlenraum muss beim Laden von Vorlagen/Layout-Slots erhalten bleiben");
});

test("Cockpit: Standardlayout öffnet keine Widgets und Beispielprofile sind leer", () => {
  const defaultStart = teachingSurface.indexOf("const DEFAULT_COCKPIT_LAYOUT");
  const defaultEnd = teachingSurface.indexOf("const DEFAULT_WORKSPACE_PROFILES", defaultStart);
  const defaults = teachingSurface.slice(defaultStart, defaultEnd);
  assert.equal((defaults.match(/visible:\s*true/g) || []).length, 0);
  assert.match(teachingSurface, /const DEFAULT_WORKSPACE_PROFILES: any\[\] = \[\];/);
});

test("Cockpit: Widgets bleiben ohne separaten Layout-Modus immer verschiebbar", () => {
  assert.match(teachingSurface, /const isLayoutLocked = false;/);
  assert.match(teachingSurface, /const isLayoutEditing = true;/);
  assert.match(teachingSurface, /Widgets immer verschiebbar/);
  assert.doesNotMatch(teachingSurface, /<span>Anordnung ändern<\/span>/);
  assert.doesNotMatch(teachingSurface, /<span>Anordnung fertig<\/span>/);
  assert.doesNotMatch(teachingSurface, /setIsLayoutLocked/);
  assert.match(cockpitWidget, /layoutLocked \? "auto" : "none"/);
});

test("Cockpit: Widgets schließen verändert die weiße Smartboard-Fläche nicht", () => {
  assert.match(teachingSurface, /Alle Widgets schließen/);
  assert.doesNotMatch(teachingSurface, /Unterrichtshilf/);
  assert.doesNotMatch(teachingSurface, /Tafel leeren \(Alle schließen\)/);
  assert.match(teachingSurface, /cockpitInkByClass/);
});

test("Cockpit: alte Tafel liegt ausschließlich im Archiv", () => {
  assert.match(teachingSurface, />\s*Archiv\s*</);
  assert.match(teachingSurface, /Alte Tafelinhalte öffnen/);
  assert.doesNotMatch(teachingSurface, /Bisherige Tafelinhalte öffnen/);
  const archiveIndex = teachingSurface.indexOf("Alte Tafelinhalte öffnen");
  const optionsIndex = teachingSurface.lastIndexOf("Weitere Funktionen", archiveIndex);
  assert.ok(optionsIndex >= 0 && archiveIndex > optionsIndex);
});

test("Cockpit: Zeichenfeld und gemeinsame Zeichenebene sind sprachlich getrennt", () => {
  assert.match(teachingSurface, /label: "🖍️ Zeichenfeld"/);
  assert.match(cockpitWidget, /drawing: "🖍️ Zeichenfeld"/);
  assert.doesNotMatch(cockpitWidget, /drawing: "🖍️ Zeichentafel"/);
});

test("Cockpit: weiße Unterrichtsfläche hat direkte Schreibebene und eine gemeinsame externe Werkzeugleiste", () => {
  assert.match(teachingSurface, /<BoardInk/);
  assert.match(teachingSurface, /cockpitInkByClass/);
  assert.match(teachingSurface, /externalToolbar/);
  assert.match(teachingSurface, /hideToolbar/);
  assert.match(teachingSurface, /aria-label="Unterrichtsfläche: Auswählen, Zeichnen und Text"/);
  assert.match(teachingSurface, /boardTool === 'pen'/);
  assert.match(teachingSurface, /boardTool === 'erase'/);
  assert.match(teachingSurface, /boardTool === 'text'/);
  assert.doesNotMatch(teachingSurface, /Weiße Smartboard-Fläche/);
});

test("Cockpit: TEXT macht die weiße Fläche zu einem klassenlokalen Rich-Text-Dokument", () => {
  assert.match(teachingSurface, /\[\x27text\x27, \x27TEXT\x27\]/);
  assert.match(teachingSurface, /<BoardTextEditor/);
  assert.match(teachingSurface, /cockpitTextByClass/);
  assert.match(teachingSurface, /boardTextClassKey = app\.activeClassId \|\| "unassigned"/);
  assert.match(boardTextEditor, /contentEditable=\{active\}/);
  assert.match(boardTextEditor, /aria-label="Text formatieren"/);
  for (const command of [
    "bold",
    "italic",
    "underline",
    "justifyLeft",
    "justifyCenter",
    "justifyRight",
    "insertUnorderedList",
    "insertOrderedList",
    "undo",
    "redo",
  ]) {
    assert.ok(boardTextEditor.includes(`runCommand("${command}"`), `Textbefehl fehlt: ${command}`);
  }
  assert.match(boardTextEditor, /clipboardData\.getData\("text\/plain"\)/);
  assert.doesNotMatch(boardTextEditor, /canvas/i);
  assert.doesNotMatch(boardTextEditor, /pointerType/);
});

test("Cockpit: nutzt die konfigurierten zehn Stunden-Slots statt acht fest verdrahteter Einheiten", () => {
  assert.match(teachingSurface, /lessonTimeSlots\.map\(\(\{ slot \}\) =>/);
  assert.match(teachingSurface, /MAX_LESSON_SLOTS/);
  assert.match(teachingSurface, /buildLessonTimeSlots\(app\.stundenZeiten, STUNDEN_INFO, MAX_LESSON_SLOTS\)/);
  assert.doesNotMatch(teachingSurface, /\[0, 1, 2, 3, 4, 5, 6, 7\]\.map/);
  assert.doesNotMatch(teachingSurface, /for \(let i = 0; i < 8; i\+\+\)/);
  assert.match(teachingSurface, /findCurrentLessonBreak\(lessonTimeSlots,/);
});

test("Cockpit: erfindet weder Klasse noch Klassentier im frischen Zustand", () => {
  assert.doesNotMatch(teachingSurface, /app\.klassenbezeichnung \|\| "4c"/);
  assert.match(teachingSurface, /const cockpitClassLabel = \(app\.klassenbezeichnung \|\| ""\)\.trim\(\)/);
  assert.match(teachingSurface, /const classPetEnabled = app\.classPet \? app\.classPet\.enabled !== false : false/);
  assert.doesNotMatch(teachingSurface, /const isEnabled = app\.classPet\?\.enabled \?\? true/);
});

test("Cockpit: sekundäre Ansichtssteuerung liegt gesammelt unter Optionen", () => {
  for (const label of [
    "Schülerliste einblenden",
    "Schülerliste ausblenden",
    "Klassentier einblenden",
    "Klassentier ausblenden",
    "Design & Darstellung",
    "Fokusmodus",
    "Vollbildmodus",
  ]) {
    assert.ok(teachingSurface.includes(label), `Ansichtsoption fehlt: ${label}`);
  }
  assert.match(teachingSurface, />\s*Ansicht\s*</);
  assert.doesNotMatch(teachingSurface, /Functional Controls Buttons Cluster/);
});

test("Cockpit: Status und Zurück-Navigation sind lehrerfreundlich beschriftet", () => {
  assert.match(teachingSurface, /Speichert beim Beenden/);
  assert.doesNotMatch(teachingSurface, /Echtzeit-Tracker/);
  assert.match(teachingSurface, /aria-label="Zurück zu Unterricht"/);
});


test("Cockpit: Tages-Sicherungsstatus ist klassenlokal", () => {
  assert.match(
    teachingSurface,
    /cockpit_last_auto_save_date_\$\{app\.activeClassId \|\| "unassigned"\}/,
  );
  assert.doesNotMatch(
    teachingSurface,
    /cockpit_last_auto_save_date_\$\{\(app as any\)\?\.id \|\| "default"\}/,
  );
});

test("Cockpit: Schließen markiert einen nicht gespeicherten Tag nicht fälschlich als gesichert", () => {
  const closeStart = teachingSurface.indexOf("const handleCloseCockpit");
  const closeEnd = teachingSurface.indexOf("const cycleBehavior", closeStart);
  assert.ok(closeStart >= 0 && closeEnd > closeStart);
  const closeHandler = teachingSurface.slice(closeStart, closeEnd);
  assert.match(closeHandler, /hasAutoSavedToday !== todayStr && commitAllowance\.allowed/);
  assert.doesNotMatch(closeHandler, /updateHasAutoSavedToday/);
});

test("Cockpit: Tagesabschluss ist verständlich statt technisch beschriftet", () => {
  assert.match(teachingSurface, /"Tag sichern"/);
  assert.match(teachingSurface, />\s*Verfügbar\s*</);
  assert.doesNotMatch(teachingSurface, />\s*Sperre\s*</);
});


test("Cockpit: Vorlage erstellen ist direkt sichtbar und öffnet den Erstellen-Tab", () => {
  assert.match(teachingSurface, />Vorlage erstellen</);
  assert.match(teachingSurface, /setVorlagenStartTab\("create"\)/);
  assert.match(teachingSurface, /initialTab=\{vorlagenStartTab\}/);
  assert.match(templatesModal, /initialTab\?: "browse" \| "create"/);
  assert.match(templatesModal, /if \(isOpen\) setActiveTab\(initialTab\)/);
});

test("Cockpit: Widget-Bearbeitung liegt in einem kompakten Kontextmenü", () => {
  assert.match(cockpitWidget, /aria-label="Widget-Menü öffnen"/);
  for (const label of ["Einstellungen", "Größe", "Groß fest einstellen", "Widget schließen"]) {
    assert.ok(cockpitWidget.includes(label), `Widget-Menüeintrag fehlt: ${label}`);
  }
  assert.doesNotMatch(cockpitWidget, /aria-label="Widget maximieren"/);
  assert.doesNotMatch(cockpitWidget, /aria-label="Widget-Einstellungen öffnen"/);
  assert.doesNotMatch(cockpitWidget, /aria-label="Widget-Größe einstellen"/);
});

test("Cockpit: automatische Anordnung kann vier Widgets als 2x2-Raster einpassen", () => {
  assert.match(teachingSurface, /const targetW = Math\.min\(w\.w, Math\.max\(18, cellW - 3\)\)/);
  assert.match(teachingSurface, /const targetH = Math\.min\(w\.h, Math\.max\(18, cellH - 3\)\)/);
  assert.match(teachingSurface, /w: targetW/);
  assert.match(teachingSurface, /h: targetH/);
});

test("Cockpit: Ich-bin-da zeigt Kindernamen vollständig und gibt ihnen ausreichend Kartenbreite", () => {
  assert.match(kidAttendance, /Anwesenheitsliste mit allen Kindern/);
  assert.match(kidAttendance, /students\.map\(\(student\) =>/);
  assert.match(kidAttendance, /status === 'present' \? '✓ Da' : status === 'absent' \? 'Fehlt' : 'Offen'/);
  assert.doesNotMatch(kidAttendance, /openStudents\.slice\(0, 4\)/);
  assert.match(kidAttendance, /whitespace-normal break-words font-black leading-tight/);
  assert.match(kidAttendance, /grid-cols-2 md:grid-cols-3 xl:grid-cols-4/);
  assert.doesNotMatch(kidAttendance, /grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5/);
});
