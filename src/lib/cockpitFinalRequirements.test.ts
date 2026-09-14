import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const teachingSurface = readFileSync("src/components/Unterrichtsmodus.tsx", "utf8");
const boardInk = readFileSync("src/components/cockpit/BoardInk.tsx", "utf8");
const cockpitWidget = readFileSync("src/components/cockpit/CockpitWidget.tsx", "utf8");

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

test("Cockpit: Widgetauswahl startet ohne vorgegebene Schnellkategorie", () => {
  assert.match(teachingSurface, /useState<string>\("all"\)/);
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

  for (const type of defaults) {
    assert.ok(counterCatalog.includes(type), `Kategorie-Zähler kennt ${type} nicht`);
    assert.ok(pickerCatalog.includes(type), `Widget-Picker kennt ${type} nicht`);
  }
});

test("Cockpit: Standardlayout öffnet keine Widgets und Beispielprofile sind leer", () => {
  const defaultStart = teachingSurface.indexOf("const DEFAULT_COCKPIT_LAYOUT");
  const defaultEnd = teachingSurface.indexOf("const DEFAULT_WORKSPACE_PROFILES", defaultStart);
  const defaults = teachingSurface.slice(defaultStart, defaultEnd);
  assert.equal((defaults.match(/visible:\s*true/g) || []).length, 0);
  assert.match(teachingSurface, /const DEFAULT_WORKSPACE_PROFILES: any\[\] = \[\];/);
});

test("Cockpit: Anordnung liegt unter Optionen und beendet den Schreibmodus", () => {
  assert.doesNotMatch(teachingSurface, /aria-pressed=\{!isLayoutLocked\}/);
  assert.match(teachingSurface, /<span>Anordnung ändern<\/span>/);
  assert.match(teachingSurface, /<span>Anordnung fertig<\/span>/);
  assert.match(
    teachingSurface,
    /setIsBoardWriting\(false\);\s*setIsLayoutLocked\(\(prev\) => !prev\);/,
  );
});

test("Cockpit: Unterrichtshilfen schließen lässt Schrift und Zeichnung bestehen", () => {
  assert.match(teachingSurface, /Alle Unterrichtshilfen schließen/);
  assert.doesNotMatch(teachingSurface, /Tafel leeren \(Alle schließen\)/);
  const clearStart = teachingSurface.indexOf("const handleClearAllWidgets");
  const clearEnd = teachingSurface.indexOf("const handleCloseWidget", clearStart);
  const clearHandler = teachingSurface.slice(clearStart, clearEnd);
  assert.doesNotMatch(clearHandler, /cockpitInkByClass/);
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

test("Cockpit: Schrift und Zeichnung lassen sich getrennt löschen", () => {
  assert.match(boardInk, />Zeichnung löschen<\/button>/);
  assert.match(boardInk, />Schrift löschen<\/button>/);
  assert.match(boardInk, /items\.filter\(item => item\.text !== undefined\)/);
  assert.match(boardInk, /items\.filter\(item => item\.text === undefined\)/);
  assert.match(boardInk, />Rückgängig<\/button>/);
  assert.match(boardInk, />Wiederholen<\/button>/);
  assert.match(boardInk, /\['pen', 'Stift'\]/);
  assert.match(boardInk, /\['text', 'Text'\]/);
  assert.match(boardInk, /\['erase', 'Radierer'\]/);
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
  assert.match(teachingSurface, />\s*Tag sichern\s*</);
  assert.match(teachingSurface, />\s*Verfügbar\s*</);
  assert.doesNotMatch(teachingSurface, />\s*Sperre\s*</);
});
