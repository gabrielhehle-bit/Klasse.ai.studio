import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const teachingSurface = readFileSync("src/components/Unterrichtsmodus.tsx", "utf8");
const cockpitWidget = readFileSync("src/components/cockpit/CockpitWidget.tsx", "utf8");
const templatesModal = readFileSync("src/components/cockpit/CockpitVorlagenModal.tsx", "utf8");
const kidAttendance = readFileSync("src/components/cockpit/widgets/KidAttendanceWidget.tsx", "utf8");
const boardTextEditor = readFileSync("src/components/cockpit/BoardTextEditor.tsx", "utf8");
const widgetCatalog = readFileSync("src/lib/cockpitWidgetCatalog.ts", "utf8");
const widgetPlacement = readFileSync("src/lib/cockpitWidgetPlacement.ts", "utf8");

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

test("Cockpit: Widgetbibliothek hält Kernwidgets und Alt-Layouts erreichbar", () => {
  assert.match(teachingSurface, /useState<string>\("core"\)/);
  assert.match(teachingSurface, /\{ id: "core", label: "🧩 Kernwidgets" \}/);
  assert.match(teachingSurface, /\{ id: "categories", label: "▦ Alle Widgets" \}/);
  assert.match(teachingSurface, /\{ id: "recent", label: "🕘 Zuletzt verwendet" \}/);
  assert.match(teachingSurface, /PLANNED_COCKPIT_WIDGETS\.map\(\(group\)/);
  assert.match(teachingSurface, /aria-label="Widget-Bibliothek"/);
  assert.match(teachingSurface, /placeholder="Widget suchen … z\. B\. Timer, Gruppen, Brüche"/);
  assert.doesNotMatch(teachingSurface, /Wähle oben eine Kategorie/);
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
  assert.match(teachingSurface, /⭐ Favoriten/);
  assert.match(teachingSurface, /Zu Favoriten hinzufügen/);
  assert.match(teachingSurface, /Von Favoriten entfernen/);
});

test("Cockpit: alle erhaltenen Standard-Widgettypen kommen aus einem gemeinsamen Bibliothekskatalog", () => {
  const defaultStart = teachingSurface.indexOf("const DEFAULT_COCKPIT_LAYOUT");
  const defaultEnd = teachingSurface.indexOf("const DEFAULT_WORKSPACE_PROFILES", defaultStart);
  assert.ok(defaultStart >= 0 && defaultEnd > defaultStart);
  const defaults = widgetTypes(teachingSurface.slice(defaultStart, defaultEnd));
  const catalog = widgetTypes(widgetCatalog);

  assert.equal(defaults.length, 111, "Standardlayout muss alle bisherigen Typen, HÜ und Sterneauswertung enthalten");
  assert.equal(catalog.length, 111, "Gemeinsamer Widget-Katalog bietet alle Standardwidgets außer der doppelten Schülerliste");
  assert.match(teachingSurface, /const allAvailableWidgets = COCKPIT_WIDGET_LIBRARY_ITEMS;/);

  // Historic studentlist remains in the 111-entry layout/backup schema but
  // must not be offered as a duplicate of the existing student sidebar.
  assert.ok(defaults.includes("studentlist"), "Historische Schülerliste muss beim Backup-Laden erhalten bleiben");
  assert.equal(catalog.includes("studentlist"), false);
  for (const type of defaults.filter(type => type !== "studentlist")) {
    assert.ok(catalog.includes(type), `Gemeinsamer Widget-Katalog kennt ${type} nicht`);
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

test("Cockpit: Widgets folgen beim Verschieben frei dem Zeiger ohne Magnetraster", () => {
  const dragStart = cockpitWidget.indexOf("const handlePointerDownDrag");
  const dragEnd = cockpitWidget.indexOf("const handlePointerDownResize", dragStart);
  assert.ok(dragStart >= 0 && dragEnd > dragStart);
  const drag = cockpitWidget.slice(dragStart, dragEnd);
  assert.match(drag, /dragStartPos\.current\.left \+ deltaX/);
  assert.match(drag, /dragStartPos\.current\.top \+ deltaY/);
  assert.doesNotMatch(drag, /GRID_SIZE|Math\.round\(newLeftPixels|Math\.round\(newTopPixels/);
  assert.match(drag, /pointercancel/);
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
  assert.match(widgetCatalog, /label: "🖍️ Zeichenfeld"/);
  assert.match(cockpitWidget, /drawing: "🖍️ Zeichenfeld"/);
  assert.doesNotMatch(cockpitWidget, /drawing: "🖍️ Zeichentafel"/);
});

test("Cockpit: weiße Unterrichtsfläche hat direkte Schreibebene und eine gemeinsame externe Werkzeugleiste", () => {
  assert.match(teachingSurface, /<BoardInk/);
  assert.match(teachingSurface, /cockpitInkByClass/);
  assert.match(teachingSurface, /externalToolbar/);
  assert.match(teachingSurface, /hideToolbar/);
  assert.match(teachingSurface, /aria-label="Schreiben und Papier"/);
  assert.match(teachingSurface, /setBoardTool\("pen"\)/);
  assert.match(teachingSurface, /setBoardTool\("erase"\)/);
  assert.match(teachingSurface, /active=\{boardTool === "pen" \|\| boardTool === "erase"\}/);
  assert.match(teachingSurface, /boardTool === 'text'/);
  assert.doesNotMatch(teachingSurface, /Weiße Smartboard-Fläche/);
});

test("Cockpit: TEXT macht die weiße Fläche zu einem klassenlokalen Rich-Text-Dokument", () => {
  assert.match(teachingSurface, />Text<\/span>/);
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
  assert.match(teachingSurface, /const classPetEnabled = false;/);
  assert.match(teachingSurface, /case "pet":\s*return <ClassMascotWidget/);
  assert.doesNotMatch(teachingSurface, /const isEnabled = app\.classPet\?\.enabled \?\? true/);
});

test("Cockpit: sekundäre Ansichtssteuerung liegt gesammelt unter Optionen", () => {
  for (const label of [
    "Schülerliste einblenden",
    "Schülerliste ausblenden",
    "Klassenmaskottchen öffnen",
    "Klassenmaskottchen schließen",
    "Design & Farben",
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
  assert.match(teachingSurface, /aria-label="Lehrercockpit schließen · Zurück zu Heute"/);
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
  assert.match(closeHandler, /!behaviorSavedToday && commitAllowance\.allowed/);
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

test("Cockpit: Widget-Bearbeitung liegt in einem kompakten, verständlichen Kontextmenü", () => {
  assert.match(cockpitWidget, /Widget-Menü öffnen/);
  for (const label of ["Einstellungen", "Größe", "Maximieren", "Minimieren", "Widget schließen"]) {
    assert.ok(cockpitWidget.includes(label), `Widget-Menüeintrag fehlt: ${label}`);
  }
  assert.doesNotMatch(cockpitWidget, /Groß fest einstellen/);
  assert.match(cockpitWidget, />\s*Passend\s*<\/button>/);
  assert.match(cockpitWidget, />\s*Groß\s*<\/button>/);
  assert.match(cockpitWidget, />\s*Tafelfläche\s*<\/button>/);
  assert.match(cockpitWidget, /Genau einstellen/);
  assert.match(cockpitWidget, /onFocus\(\);[\s\S]*?setShowWidgetMenu/);
  assert.match(cockpitWidget, /max-w-\[calc\(100cqw-0\.5rem\)\]/);
});

test("Cockpit: Resize ist touch- und tastatursicher und räumt Pointer-Abbrüche auf", () => {
  assert.match(cockpitWidget, /aria-label="Widget-Größe ändern"/);
  assert.match(cockpitWidget, /w-11 h-11/);
  assert.match(cockpitWidget, /onKeyDown=\{handleResizeKeyDown\}/);
  assert.match(cockpitWidget, /target\.addEventListener\("pointercancel", finishResize\)/);
  assert.match(cockpitWidget, /target\.removeEventListener\("pointercancel", finishResize\)/);
  assert.match(cockpitWidget, /if \(!e\.isPrimary \|\| e\.button !== 0/);
});

test("Cockpit: jede Interaktion bringt das betroffene Fenster nach vorne", () => {
  assert.match(cockpitWidget, /onPointerDownCapture=\{!isDirect && !isFreeMascot \? onFocus : undefined\}/);
  assert.match(cockpitWidget, /data-widget-focused=\{isFocused \? "true" : "false"\}/);
  assert.match(teachingSurface, /const focusIndex = focusOrder\.indexOf\(widget\.id\)/);
  assert.match(teachingSurface, /const focusedWidgetId =/);
  assert.match(teachingSurface, /visibleFocusOrder\[visibleFocusOrder\.length - 1\]/);
  assert.match(teachingSurface, /setFocusOrder\(previous =>/);
  assert.match(cockpitWidget, /role="menuitem"/);
});

test("Cockpit: neue Widgets suchen echten freien Platz statt versetzt zu stapeln", () => {
  const openStart = teachingSurface.indexOf("const handleOpenWidgetInCockpitLayout");
  const openEnd = teachingSurface.indexOf("const handleAutoArrangeWidgets", openStart);
  assert.ok(openStart >= 0 && openEnd > openStart);
  const openHandler = teachingSurface.slice(openStart, openEnd);

  assert.match(openHandler, /measureCockpitUsableBoardArea\(\)/);
  assert.match(openHandler, /findCockpitWidgetOpeningPlacement\(/);
  assert.match(openHandler, /!minimizedWidgetIds\.includes\(widget\.id\)/);
  assert.match(openHandler, /widget\.type !== "pet"/);
  assert.match(openHandler, /!widget\.settings\?\.isDirectMode/);
  assert.match(openHandler, /usedOverlapFallback = found\.usedOverlapFallback/);
  assert.match(openHandler, /Kein vollständig freier Platz/);
  assert.doesNotMatch(openHandler, /lastW\.x \+ 3\.0/);
  assert.doesNotMatch(openHandler, /lastW\.y \+ 3\.0/);

  assert.match(widgetPlacement, /Prefer zero overlap/);
  assert.match(widgetPlacement, /Only if no free candidate exists/);
  assert.match(widgetPlacement, /overlapArea \* 1000/);
  assert.match(widgetPlacement, /shrink[\s\S]{0,80}in small steps but never below the widget's readable minimum/);
  assert.match(widgetPlacement, /usedOverlapFallback: fallback\.overlap > 0\.5/);
  assert.match(widgetPlacement, /shrankToFit:/);
});

test("Cockpit: Neu-Öffnen und Auto-Anordnen teilen dieselbe gemessene Tafelfläche", () => {
  assert.match(teachingSurface, /const measureCockpitUsableBoardArea = \(\) =>/);
  assert.match(teachingSurface, /const sidebarOverlapPx = sidebarRect/);
  assert.match(teachingSurface, /COCKPIT_AUTO_ARRANGE_DOCK_CLEARANCE_PX/);
  assert.equal(
    (teachingSurface.match(/measureCockpitUsableBoardArea\(\)/g) || []).length >= 2,
    true,
  );
});

test("Cockpit: Vorlagen und Schnell-Slots werden über einen gemeinsamen sicheren Restore geladen", () => {
  assert.match(teachingSurface, /const restoreCockpitLayout = \(layout: unknown\) =>/);
  assert.match(teachingSurface, /resetCockpitTransientUi\(\)/);
  assert.match(teachingSurface, /persistLayoutForActiveBoardPage\(cloned, previous\)/);
  assert.match(teachingSurface, /restoreCockpitLayout\(profile\.layout\)/);
  assert.match(teachingSurface, /restoreCockpitLayout\(saved\)/);
  assert.match(teachingSurface, /restoreCockpitLayout\(createEmptyCockpitBoardLayout\(DEFAULT_COCKPIT_LAYOUT\)\)/);
  assert.match(teachingSurface, /setMinimizedWidgetIds\(\[\]\)/);
  assert.match(teachingSurface, /setFocusOrder\(\[\]\)/);
  assert.match(teachingSurface, /setWidgetSettingsOpenId\(null\)/);
  assert.match(teachingSurface, /\[activeBoardPageId\]: layout/);
});

test("Cockpit: gespeicherte Geometrie wird beim Laden nicht künstlich verschoben", () => {
  const sanitizeStart = teachingSurface.indexOf("const loadAndSanitizeLayout");
  const sanitizeEnd = teachingSurface.indexOf("// F11 ClockWidget Delegation", sanitizeStart);
  assert.ok(sanitizeStart >= 0 && sanitizeEnd > sanitizeStart);
  const sanitizer = teachingSurface.slice(sanitizeStart, sanitizeEnd);
  assert.match(sanitizer, /const sanitized = rawSanitized/);
  assert.doesNotMatch(sanitizer, /seenPositions/);
  assert.doesNotMatch(sanitizer, /x \+ 3\.0/);
  assert.doesNotMatch(sanitizer, /y \+ 2\.5/);
});

test("Cockpit: Klassenwechsel lädt das Layout der neuen Klasse statt lokalen Altzustand mitzunehmen", () => {
  assert.match(teachingSurface, /const cockpitLayoutClassRef = useRef\(app\.activeClassId \|\| "unassigned"\)/);
  assert.match(teachingSurface, /if \(cockpitLayoutClassRef\.current === nextClassKey\) return/);
  assert.match(teachingSurface, /loadAndSanitizeLayout\(app\.cockpitLayout\)/);
  assert.match(teachingSurface, /setCockpitWidgets\(nextLayout\)/);
});

test("Cockpit: Vorlagen erklären klar, dass Tafelinhalt seitenlokal bleibt", () => {
  assert.match(templatesModal, /Tafeltext, Zeichnungen und Papier bleiben absichtlich seitenlokal/);
  assert.match(templatesModal, /Widget-Anordnung schnell wechseln · ohne Tafelinhalt/);
  assert.match(templatesModal, /Aktuelle Widget-Anordnung speichern/);
  assert.match(templatesModal, /if \(handleLoadLayoutSlot\(slot\)\) onClose\(\)/);
  assert.doesNotMatch(templatesModal, /mit aktuellem Board-Layout aktualisiert/);
});

test("Cockpit: automatische Anordnung nutzt die reale freie Tafelfläche", () => {
  assert.match(teachingSurface, /!minimizedWidgetIds\.includes\(w\.id\)/);
  assert.match(teachingSurface, /w\.type !== "pet"/);
  assert.match(teachingSurface, /!w\.settings\?\.isDirectMode/);
  assert.match(teachingSurface, /const boardRect = board\.getBoundingClientRect\(\)/);
  assert.match(teachingSurface, /const sidebarOverlapPx = sidebarRect/);
  assert.match(teachingSurface, /Math\.min\(boardRect\.right, sidebarRect\.right\)/);
  assert.match(teachingSurface, /COCKPIT_AUTO_ARRANGE_DOCK_CLEARANCE_PX/);
  assert.match(teachingSurface, /getCockpitAutoArrangeLayout\(/);
  assert.match(teachingSurface, /getWidgetMinSizeConfig\(String\(widget\.type\)\)/);
  assert.match(teachingSurface, /rect\.x \/ boardRect\.width/);
  assert.match(teachingSurface, /rect\.y \/ boardRect\.height/);
  assert.match(teachingSurface, /Minimiere ein Widget oder blende die Schülerliste kurz aus/);
});

test("Cockpit: Ich-bin-da zeigt Kindernamen vollständig und gibt ihnen ausreichend Kartenbreite", () => {
  assert.match(kidAttendance, /Anwesenheitsliste mit allen Kindern/);
  assert.match(kidAttendance, /students\.map\(\(student\) =>/);
  assert.match(kidAttendance, /status === 'present' \? '✓ Da' : status === 'absent'/);
  assert.match(kidAttendance, /absenceCode === 'e' \? '✓ Entschuldigt'/);
  assert.doesNotMatch(kidAttendance, /openStudents\.slice\(0, 4\)/);
  assert.match(kidAttendance, /whitespace-normal break-words font-black leading-\[1\.05\]/);
  assert.match(kidAttendance, /getStudentGridLayout\(size\.width, size\.height, students\.length/);
  assert.match(kidAttendance, /Alle \{students\.length\} Kinder groß anzeigen/);
  assert.match(kidAttendance, /gridTemplateColumns:/);
  assert.doesNotMatch(kidAttendance, /grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5/);
});
