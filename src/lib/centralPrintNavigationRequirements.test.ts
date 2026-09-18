import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const weeklyPlan = readFileSync("src/components/WeeklyPlan.tsx", "utf8");
const planningCenter = readFileSync("src/components/PlanungsZentrale.tsx", "utf8");
const attendance = readFileSync("src/components/Attendance.tsx", "utf8");
const yearlyPlan = readFileSync("src/components/YearlyPlan.tsx", "utf8");
const gradebook = readFileSync("src/components/Gradebook.tsx", "utf8");
const printCenter = readFileSync("src/components/PrintCenter.tsx", "utf8");

test("Druckwege: Wochenplan wird konsequent im Druckzentrum geöffnet", () => {
  assert.match(weeklyPlan, /activePrintTemplate:\s*'wochenplan'/);
  assert.match(weeklyPlan, /Druckzentrum öffnen/);
  assert.match(planningCenter, /activePrintTemplate:\s*'wochenplan'/);
  assert.match(planningCenter, /Wochenplan im Druckzentrum öffnen/);
  assert.doesNotMatch(planningCenter, /window\.print\(\)/);
});

test("Druckwege: Anwesenheit und Jahresplanung drucken nicht mehr direkt", () => {
  assert.match(attendance, /activePrintTemplate:\s*'fehlstunden'/);
  assert.match(attendance, /Im Druckzentrum öffnen/);
  assert.doesNotMatch(attendance, /window\.print\(\)/);

  assert.match(yearlyPlan, /activePrintTemplate:\s*'jahresplanung'/);
  assert.match(yearlyPlan, />\s*Druckzentrum\s*</);
  assert.doesNotMatch(yearlyPlan, /window\.print\(\)/);
});

test("Druckwege: Notenmappe trennt CSV-Export klar vom Drucken", () => {
  assert.match(gradebook, /CSV exportieren/);
  assert.match(gradebook, /activePrintTemplate:\s*'zeugnis_noten'/);
  assert.match(gradebook, /Im Druckzentrum öffnen/);
  assert.doesNotMatch(gradebook, /Export \/ Drucken/);
});

test("Wochenplan-Druck: gewählte KW und Sachunterricht bleiben erhalten", () => {
  assert.match(printCenter, /const \[wpKW, setWpKW\] = useState<number>\(fallbackPlanningKW\)/);
  assert.match(printCenter, /const lessonsData = \(app\?\.wochenplanung \|\| \{\}\)\[wpKW\] \|\| \{\}/);
  assert.doesNotMatch(printCenter, /\^sachunterricht\$\|\^su\$/i);
});
