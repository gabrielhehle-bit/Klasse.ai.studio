import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const cockpitWidget = readFileSync("src/components/cockpit/CockpitWidget.tsx", "utf8");
const widgetLayout = readFileSync("src/components/cockpit/widgetLayout.ts", "utf8");
const kidAttendance = readFileSync("src/components/cockpit/widgets/KidAttendanceWidget.tsx", "utf8");
const teachingSurface = readFileSync("src/components/Unterrichtsmodus.tsx", "utf8");

test("Cockpit-Widgets: jeder Typ erhält eine sichere Mindestgröße", () => {
  assert.match(widgetLayout, /DEFAULT_WIDGET_MIN_SIZE/);
  assert.match(widgetLayout, /minW: 260/);
  assert.match(widgetLayout, /minH: 180/);
  assert.match(widgetLayout, /getWidgetMinSizeConfig/);
  assert.match(cockpitWidget, /const safeMinSize = getWidgetMinSizeConfig\(widget\.type\)/);
  assert.match(cockpitWidget, /Math\.max\(5, widget\.w, minWPercent\)/);
  assert.match(cockpitWidget, /Math\.max\(5, widget\.h, minHPercent\)/);
});

test("Cockpit-Widgets: feste große Darstellung wird im Layout gespeichert", () => {
  assert.match(cockpitWidget, /const handleSetPersistentLargeSize = \(\) =>/);
  assert.match(cockpitWidget, /onUpdate\(\{ x: 4, y: 4, w: 92, h: 90 \}\)/);
  assert.match(cockpitWidget, /Groß fest einstellen/);
  assert.match(cockpitWidget, /Widget dauerhaft groß auf der Smartboard-Fläche ablegen/);
});

test("Cockpit-Widgets: kleiner Inhalt bleibt überlauf-sicher, Schüler-Widgets bieten bei vielen Kindern eine große Ansicht", () => {
  assert.match(cockpitWidget, /className="cockpit-widget-content absolute inset-0 flex min-h-0 min-w-0 flex-col overflow-auto"/);
  assert.match(cockpitWidget, /touchAction: "auto"/);
  assert.match(kidAttendance, /Alle \{students\.length\} Kinder groß anzeigen/);
  // The check-in redesign now shows all pupils using explicitly paged native controls.\n  assert.match(kidAttendance, /getCheckInPageLayout\(size\.width, size\.height, students\.length, studentPage\)/);\n  assert.match(kidAttendance, /aria-label="Vorherige Schülerseite"/);\n  assert.match(kidAttendance, /aria-label="Nächste Schülerseite"/);
});

test("Ich-bin-da: Kindernamen werden nicht mit Ellipsen gekürzt", () => {
  assert.match(kidAttendance, /whitespace-normal break-words font-black leading-tight/);
  assert.match(kidAttendance, /getStudentGridLayout\(size\.width, size\.height, students\.length/);
  assert.match(kidAttendance, /gridTemplateColumns:/);
  assert.doesNotMatch(kidAttendance, /block truncate font-black leading-tight/);
  assert.doesNotMatch(kidAttendance, /flex-1 truncate text-\[11px\] font-black/);
});

test("Lehrercockpit: Smartboard-Beschriftung belegt keinen Platz mehr in der Werkzeugleiste", () => {
  assert.doesNotMatch(teachingSurface, /Weiße Smartboard-Fläche/);
  assert.match(teachingSurface, />TEXT<\/button>/);
  assert.match(teachingSurface, />Vorlage erstellen</);
});
