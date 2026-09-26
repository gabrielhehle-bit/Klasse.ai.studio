import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const cockpitWidget = readFileSync("src/components/cockpit/CockpitWidget.tsx", "utf8");
const widgetLayout = readFileSync("src/components/cockpit/widgetLayout.ts", "utf8");
const kidAttendance = readFileSync("src/components/cockpit/widgets/KidAttendanceWidget.tsx", "utf8");
const teachingSurface = readFileSync("src/components/Unterrichtsmodus.tsx", "utf8");
const wheelWidget = readFileSync("src/components/cockpit/widgets/WheelWidget.tsx", "utf8");
const timerWidget = readFileSync("src/components/cockpit/widgets/TimerWidget.tsx", "utf8");
const randomNameWidget = readFileSync("src/components/cockpit/widgets/RandomNameWidget.tsx", "utf8");
const groupsWidget = readFileSync("src/components/cockpit/widgets/GroupsWidget.tsx", "utf8");
const weeklyPlanWidget = readFileSync("src/components/cockpit/widgets/ClassroomWeeklyPlanWidget.tsx", "utf8");
const homeworkWidget = readFileSync("src/components/cockpit/widgets/HomeworkWidget.tsx", "utf8");
const starsReviewWidget = readFileSync("src/components/cockpit/widgets/StarsReviewWidget.tsx", "utf8");
const classRewardWidget = readFileSync("src/components/cockpit/widgets/ClassRewardWidget.tsx", "utf8");
const clockWidget = readFileSync("src/components/cockpit/widgets/ClockWidget.tsx", "utf8");
const trafficLightWidget = readFileSync("src/components/cockpit/widgets/TrafficLightWidget.tsx", "utf8");
const noiseMeterWidget = readFileSync("src/components/cockpit/widgets/NoiseMeterWidget.tsx", "utf8");
const noiseScaleWidget = readFileSync("src/components/cockpit/widgets/NoiseScaleWidget.tsx", "utf8");
const timelineWidget = readFileSync("src/components/cockpit/widgets/TimelineWidget.tsx", "utf8");
const todoWidget = readFileSync("src/components/cockpit/widgets/TodoWidget.tsx", "utf8");
const instructionWidget = readFileSync("src/components/cockpit/widgets/InstructionWidget.tsx", "utf8");
const zahlenraumWidget = readFileSync("src/components/cockpit/widgets/ZahlenraumStudio.tsx", "utf8");
const mentalMathWidget = readFileSync("src/components/cockpit/widgets/KopfrechenStudio.tsx", "utf8");
const fractionWidget = readFileSync("src/components/cockpit/widgets/FractionVisualizer.tsx", "utf8");
const musicSoundsWidget = readFileSync("src/components/cockpit/widgets/MusicSoundsStudio.tsx", "utf8");
const dutiesWidget = readFileSync("src/components/cockpit/widgets/DiensteWidget.tsx", "utf8");
const qrWidget = readFileSync("src/components/cockpit/widgets/QRCodeWidget.tsx", "utf8");
const imageWidget = readFileSync("src/components/cockpit/widgets/ImageWidget.tsx", "utf8");
const vocabularyWidget = readFileSync("src/components/cockpit/widgets/LernwoerterStudioWidget.tsx", "utf8");
const legacyWidgetContents = readFileSync("src/components/cockpit/CockpitWidgetContents.tsx", "utf8");

test("Cockpit-Widgets: jeder Typ erhält eine sichere Mindestgröße", () => {
  assert.match(widgetLayout, /DEFAULT_WIDGET_MIN_SIZE/);
  assert.match(widgetLayout, /minW: 260/);
  assert.match(widgetLayout, /minH: 180/);
  assert.match(widgetLayout, /getWidgetMinSizeConfig/);
  assert.match(cockpitWidget, /const safeMinSize = getWidgetMinSizeConfig\(widget\.type\)/);
  assert.match(cockpitWidget, /Math\.max\(5, widget\.w, minWPercent\)/);
  assert.match(cockpitWidget, /Math\.max\(5, widget\.h, minHPercent\)/);
});

test("Cockpit-Widgets: Größen-Voreinstellungen werden gemeinsam und dauerhaft im Layout gespeichert", () => {
  assert.match(cockpitWidget, /const applyPersistentSize = \(targetW: number, targetH: number, moveToBoardInset = false\) =>/);
  assert.match(cockpitWidget, /const applySizePreset = \(preset: "fit" \| "large" \| "board"\) =>/);
  assert.match(cockpitWidget, /applyPersistentSize\(92, 90, true\)/);
  assert.match(cockpitWidget, /onClick=\{\(\) => applySizePreset\("board"\)\}/);
  assert.match(cockpitWidget, />\s*Tafelfläche\s*<\/button>/);
});

test("Cockpit-Widgets: kleiner Inhalt bleibt überlauf-sicher, Schüler-Widgets bieten bei vielen Kindern eine große Ansicht", () => {
  assert.match(cockpitWidget, /className="cockpit-widget-content absolute inset-0 flex min-h-0 min-w-0 flex-col overflow-auto"/);
  assert.match(cockpitWidget, /touchAction: "auto"/);
  assert.match(kidAttendance, /Alle \{students\.length\} Kinder groß anzeigen/);
  // The check-in redesign shows all pupils using explicitly paged native controls.
  assert.match(kidAttendance, /getCheckInPageLayout\(size\.width, size\.height, students\.length, studentPage, adaptiveLayout\.pages\)/);
  assert.match(kidAttendance, /aria-label="Vorherige Schülerseite"/);
  assert.match(kidAttendance, /aria-label="Nächste Schülerseite"/);
});

test("Ich-bin-da: Kindernamen werden nicht mit Ellipsen gekürzt", () => {
  assert.match(kidAttendance, /whitespace-normal break-words font-black leading-\[1\.05\]/);
  assert.match(kidAttendance, /getStudentGridLayout\(size\.width, size\.height, students\.length/);
  assert.match(kidAttendance, /gridTemplateColumns:/);
  assert.doesNotMatch(kidAttendance, /block truncate font-black/);
  assert.doesNotMatch(kidAttendance, /flex-1 truncate text-\[11px\] font-black/);
});

test("Lehrercockpit: Smartboard-Beschriftung belegt keinen Platz mehr in der Werkzeugleiste", () => {
  assert.doesNotMatch(teachingSurface, /Weiße Smartboard-Fläche/);
  assert.match(teachingSurface, />Text<\/span>/);
  assert.match(teachingSurface, />Vorlage erstellen</);
});


test("Kernwidgets verkleinern Touch-Ziele auch im Kompaktmodus nicht unter 44px", () => {
  assert.doesNotMatch(timerWidget, /veryCompactTimer \? 'min-h-\[40px\]'/);
  assert.match(timerWidget, /w-full min-h-11 px-4 rounded-xl/);
  assert.match(timerWidget, /aria-label=\{isMuted \? 'Signalton einschalten' : 'Signalton stummschalten'\}/);

  assert.doesNotMatch(wheelWidget, /isSmall \? 'min-h-9 min-w-9'/);
  assert.match(wheelWidget, /min-h-11 min-w-11 p-1 rounded-lg border/);
  assert.match(wheelWidget, /min-h-14 text-lg/);
  assert.match(wheelWidget, /min-h-12 text-base/);
  assert.doesNotMatch(wheelWidget, /min-h-\[40px\]/);

  assert.doesNotMatch(randomNameWidget, /compact \? 'min-h-9 min-w-9'/);
  assert.match(randomNameWidget, /min-h-11 min-w-11/);
  assert.match(randomNameWidget, /compact \? 'min-h-11 text-xs'/);

  assert.doesNotMatch(groupsWidget, /compactGroupWidget \? 'min-h-9/);
  assert.doesNotMatch(groupsWidget, /min-h-\[38px\]/);
  assert.match(groupsWidget, /min-h-11 px-2/);

  assert.doesNotMatch(weeklyPlanWidget, /compactBoard \? "min-h-9 min-w-9"/);
  assert.match(weeklyPlanWidget, /min-h-11 min-w-11/);

  assert.doesNotMatch(kidAttendance, /className="h-9 px-3 rounded-lg border font-bold text-xs/);
  assert.doesNotMatch(kidAttendance, /h-10 min-h-\[40px\]/);
  assert.match(kidAttendance, /className="min-h-11 px-3 rounded-lg border font-bold text-xs/);
});


test("Gemeinsamer Widget-Rahmen behält 44px-Touchziele auch bei engem Inhalt", () => {
  assert.doesNotMatch(cockpitWidget, /viewportDensity === "tight" \? "h-9 " : "h-11 "/);
  assert.doesNotMatch(cockpitWidget, /viewportDensity === "tight" \? "w-8 h-8" : "w-9 h-9"/);
  assert.match(cockpitWidget, /"w-full relative h-11 " \+/);
  assert.match(cockpitWidget, /inline-flex h-11 w-11 shrink-0 items-center justify-center/);
  assert.match(cockpitWidget, /w-11 h-11 flex items-center justify-center rounded-lg border/);
  assert.match(cockpitWidget, /w-full min-h-11 px-2\.5 py-2 rounded-lg text-xs font-semibold/);
  assert.match(cockpitWidget, /w-full min-h-11 p-1\.5 rounded-lg text-sm font-bold border/);
  assert.match(cockpitWidget, /cockpit-widget-size-apply w-full min-h-11 py-2 bg-accent/);
});


test("Hausübungen, Sterne und Klassenziel behalten touch-sichere Bedienflächen", () => {
  assert.doesNotMatch(homeworkWidget, /compact \? 'min-h-9/);
  assert.match(homeworkWidget, /min-h-11 min-w-11/);
  assert.match(homeworkWidget, /className={\`min-h-11 rounded-xl/);

  assert.doesNotMatch(starsReviewWidget, /const button = compact \? 'min-h-9/);
  assert.match(starsReviewWidget, /const button = compact \? 'min-h-11/);
  // Ergebniszeilen dürfen kompakter sein: sie sind keine interaktiven Touch-Ziele.
  assert.match(starsReviewWidget, /compact \? "min-h-10 gap-1/);

  assert.doesNotMatch(classRewardWidget, /className="w-8 h-8 rounded-lg flex items-center justify-center/);
  assert.match(classRewardWidget, /className="w-11 h-11 rounded-xl flex items-center justify-center/);
  assert.match(classRewardWidget, /aria-label="Klassenziel einstellen"/);
  assert.match(classRewardWidget, /className="min-h-11 w-full px-2\.5 py-1\.5/);
  assert.match(classRewardWidget, /min-h-11 min-w-11 px-2 py-1 rounded-lg/);
  assert.match(classRewardWidget, /w-11 h-11 rounded-xl text-base/);
  assert.match(classRewardWidget, /min-h-11 py-1\.5 px-2 rounded-lg text-\[10px\]/);
  assert.match(classRewardWidget, /flex-1 min-h-11 py-2 rounded-xl/);
});


test("Uhr, Ampel, Lautstärke, Tagesablauf und To-Do bleiben touch-sicher", () => {
  assert.doesNotMatch(clockWidget, /isCompact \? 'w-9 h-9'/);
  assert.match(clockWidget, /w-11 h-11 flex items-center justify-center rounded-xl/);

  assert.doesNotMatch(trafficLightWidget, /isCompact \? 'min-h-9' : 'min-h-10'/);
  assert.match(trafficLightWidget, /className=\{\`min-h-11 min-w-0 rounded-xl/);

  assert.doesNotMatch(noiseMeterWidget, /min-h-9 px-2 rounded-lg border/);
  assert.doesNotMatch(noiseMeterWidget, /min-h-\[36px\]/);
  assert.match(noiseMeterWidget, /min-h-11 px-2 rounded-lg border/);

  assert.match(noiseScaleWidget, /w-full min-h-11 p-2 rounded-xl/);

  assert.doesNotMatch(timelineWidget, /min-h-8 min-w-8/);
  assert.match(timelineWidget, /min-h-11 min-w-11 rounded-xl/);
  assert.match(timelineWidget, /leading-tight break-words \[overflow-wrap:anywhere\]/);

  assert.doesNotMatch(todoWidget, /min-h-9 rounded-lg border px-3/);
  assert.match(todoWidget, /min-h-11 min-w-11 p-1\.5 rounded/);
  assert.match(todoWidget, /min-h-11 rounded-lg border px-3/);
  assert.match(todoWidget, /shrink-0 min-h-11 min-w-11 p-2/);
  assert.doesNotMatch(todoWidget, /className="p-1\.5 rounded text-slate-400/);
});


test("Arbeitsauftrag und Mathe-/Musik-Kernwidgets unterschreiten keine 44px-Touchziele", () => {
  for (const source of [instructionWidget, zahlenraumWidget, mentalMathWidget, fractionWidget, musicSoundsWidget]) {
    assert.doesNotMatch(source, /min-h-\[(?:32|36|38|40|42)px\]/);
    assert.doesNotMatch(source, /className="min-h-(?:8|9|10) /);
  }

  assert.match(instructionWidget, /min-h-11 rounded-lg border border-current\/20 px-3/);
  assert.match(zahlenraumWidget, /min-h-11 min-w-11/);
  assert.match(mentalMathWidget, /min-h-11/);
  assert.match(mentalMathWidget, /min-w-11/);
  assert.match(fractionWidget, /min-h-11 px-3 py-1\.5/);
  assert.match(musicSoundsWidget, /min-h-11 rounded-lg border border-current\/20 px-3/);
});


test("Klassendienste, QR, Bild, Lernwörter und Rätsel sind im Kernkatalog touch-sicher", () => {
  assert.doesNotMatch(dutiesWidget, /min-h-10 rounded-lg border border-slate-300 px-3/);
  assert.match(dutiesWidget, /min-h-11 min-w-11/);

  assert.doesNotMatch(qrWidget, /min-h-\[(?:34|40)px\]/);
  assert.doesNotMatch(qrWidget, /min-w-\[(?:34|40)px\]/);
  assert.match(qrWidget, /min-h-11/);

  assert.doesNotMatch(imageWidget, /className="p-1 rounded-md hover:bg-rose-100/);
  assert.match(imageWidget, /min-h-11 min-w-11/);

  assert.doesNotMatch(vocabularyWidget, /min-h-\[(?:32|36|40)px\]/);
  assert.doesNotMatch(vocabularyWidget, /min-w-\[(?:32|36)px\]/);
  assert.match(vocabularyWidget, /min-h-11/);

  assert.match(legacyWidgetContents, /min-h-11 px-2\.5 rounded-lg bg-emerald-500/);
});


test("Kernwidgets nutzen große Flächen für Hierarchie statt nur für Leerraum", () => {
  assert.match(timerWidget, /const compactClockTextPixels = Math\.max\(42, Math\.min\(96,/);
  assert.match(timerWidget, /const largeRingPixels = Math\.max\(176, Math\.min\(/);
  assert.match(timerWidget, /style=\{\{ width: largeRingPixels, height: largeRingPixels/);
  assert.match(timerWidget, /style=\{\{ fontSize: largeClockTextPixels \}\}/);
  assert.doesNotMatch(timerWidget, /min-h-\[(?:32|36|42)px\]/);
  assert.doesNotMatch(timerWidget, /min-w-\[(?:32|38)px\]/);

  assert.match(wheelWidget, /const isXL = containerSize\.width > 820 && containerSize\.height > 620/);
  assert.match(wheelWidget, /const maxLabelChars = isXL \? 24 : isLarge \? 19 : isSmall \? 10 : 15/);
  assert.match(wheelWidget, /<title>\{item\}<\/title>/);
  assert.match(wheelWidget, /break-words text-center font-black tracking-tight/);

  assert.match(kidAttendance, /const roomyCard = cardWidth >= 200 && cardHeight >= 68/);
  assert.match(kidAttendance, /const heroCard = cardWidth >= 240 && cardHeight >= 84/);
  assert.match(kidAttendance, /heroCard \? 'text-xl' : roomyCard \? 'text-lg'/);

  assert.match(groupsWidget, /const roomyGroupCards = isExpanded \|\| \(size\.width >= 900 && groupLayout\.cardHeight >= 92\)/);
  assert.match(groupsWidget, /roomyGroupCards \? 'text-base sm:text-lg font-black'/);

  assert.match(weeklyPlanWidget, /const roomyBoard = isExpanded \|\| \(size\.width >= 1050 && size\.height >= 620\)/);
  assert.match(weeklyPlanWidget, /const taskColumns = size\.width >= 1320 \? 3 : size\.width >= 820 \? 2 : 1/);
  assert.match(weeklyPlanWidget, /scale=\{tinyBoard \? 'compact' : roomyBoard \? 'large' : 'normal'\}/);
});


test("Präsentationswidgets nutzen große Tafelflächen sichtbar aus", () => {
  assert.match(clockWidget, /const digitalFontPixels = Math\.max\(44, Math\.min\(/);
  assert.match(clockWidget, /const analogFacePixels = Math\.max\(110, Math\.min\(/);
  assert.match(clockWidget, /style=\{\{ fontSize: digitalFontPixels \}\}/);
  assert.match(clockWidget, /style=\{\{ width: analogFacePixels, height: analogFacePixels/);

  assert.match(trafficLightWidget, /const roomyDisplay = isFullscreen \|\| \(size\.width >= 720 && size\.height >= 500\)/);
  assert.match(trafficLightWidget, /roomyDisplay \? 'text-7xl sm:text-8xl'/);

  assert.match(noiseMeterWidget, /const roomyMeter = size\.category === 'fullscreen' \|\| size\.width >= 760 && size\.height >= 500/);
  assert.match(noiseMeterWidget, /roomyMeter \? 'h-9 p-1\.5'/);

  assert.match(timelineWidget, /const roomyTimeline = isFullscreen \|\| \(size\.width >= 820 && size\.height >= 500\)/);
  assert.match(timelineWidget, /roomyTimeline\s+\? 'text-4xl sm:text-5xl'/);

  assert.match(randomNameWidget, /const roomyPicker = widgetSize\.width >= 700 && widgetSize\.height >= 480/);
  assert.match(randomNameWidget, /roomyPicker\s+\? 'text-5xl sm:text-6xl'/);

  assert.match(starsReviewWidget, /const roomy = size\.width >= 900 && size\.height >= 520/);
  assert.match(starsReviewWidget, /roomy \? "min-h-16 gap-4 px-5 py-3"/);

  assert.match(homeworkWidget, /const roomy = size\.width >= 980 && size\.height >= 520/);
  assert.match(homeworkWidget, /const columns = size\.width >= 1280 \? 3 : size\.width >= 760 \? 2 : 1/);
  assert.match(homeworkWidget, /gridTemplateColumns: `repeat\(\$\{columns\}, minmax\(0, 1fr\)\)`/);
});


test("Große Arbeitswidgets skalieren Inhalt und Aktionen", () => {
  assert.match(todoWidget, /const roomyTodo = isFullscreen \|\| \(size\.width >= 780 && size\.height >= 480\)/);
  assert.match(todoWidget, /roomyTodo\s+\? 'text-xl font-bold'/);
  assert.match(todoWidget, /roomyTodo \? 'p-3\.5 gap-3\.5'/);

  assert.match(classRewardWidget, /const roomyReward = isFullscreen \|\| \(size\.width >= 720 && size\.height >= 500\)/);
  assert.match(classRewardWidget, /roomyReward \? 560 : 480/);
  assert.match(classRewardWidget, /roomyReward \? 'h-14 text-lg' : 'h-11 text-sm'/);

  assert.match(noiseScaleWidget, /const roomyScale = isFullscreen \|\| size\.category === 'fullscreen' \|\| \(size\.isLarge && size\.width >= 700 && size\.height >= 480\)/);
  assert.match(noiseScaleWidget, /\) : roomyScale \? \(/);

  assert.doesNotMatch(qrWidget, /min-h-\[38px\]/);
  assert.match(qrWidget, /qrcode-copy-btn[\s\S]*min-h-11/);
});


test("Sekundäre Widget-Einstellungen bleiben ebenfalls fingergerecht", () => {
  assert.match(wheelWidget, /min-h-14 p-2 rounded-xl border text-xs font-bold/);
  assert.match(wheelWidget, /min-h-11 px-2\.5 py-1 rounded-xl bg-indigo-50/);
  assert.match(wheelWidget, /min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-400/);
  assert.doesNotMatch(wheelWidget, /className="text-slate-400 hover:text-rose-500 p-0\.5/);

  assert.match(instructionWidget, /w-11 h-11 rounded-xl text-xs font-bold border/);
  assert.match(instructionWidget, /min-h-11 min-w-11 p-2 rounded-xl border cursor-pointer/);
  assert.match(instructionWidget, /min-h-11 px-2\.5 py-1 rounded-lg text-\[11px\] font-bold/);
  assert.doesNotMatch(instructionWidget, /w-8 h-8 rounded-xl text-xs font-bold border/);

  assert.doesNotMatch(mentalMathWidget, /w-(?:6|7) h-(?:6|7) rounded text-xs font-mono font-bold/);
  assert.match(mentalMathWidget, /min-h-11 min-w-11 rounded text-xs font-mono font-bold/);
  assert.match(mentalMathWidget, /min-h-11 px-2 py-1 rounded text-xs font-mono font-medium/);

  assert.match(dutiesWidget, /dienste-rotate-btn-header[\s\S]*min-h-11 px-2\.5 py-1/);
  assert.match(dutiesWidget, /dienste-menu-toggle-btn[\s\S]*min-h-11 min-w-11/);
  assert.match(dutiesWidget, /min-h-11 px-2 py-0\.5 rounded-lg text-\[10px\] font-bold border/);
  assert.match(dutiesWidget, /min-h-11 px-2 py-1\.5 rounded-lg border text-left text-xs font-bold/);
  assert.doesNotMatch(dutiesWidget, /p-1 rounded-md text-slate-400/);
});
