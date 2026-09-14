import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const container = readFileSync("src/components/diagnostics/DiagnosticContainer.tsx", "utf8");
const home = readFileSync("src/components/diagnostics/DiagnosticHome.tsx", "utf8");
const results = readFileSync("src/components/diagnostics/DiagnosticResults.tsx", "utf8");
const individual = readFileSync("src/components/diagnostics/results/IndividualProfileView.tsx", "utf8");
const classPerspective = readFileSync("src/components/diagnostics/results/ClassPerspectiveView.tsx", "utf8");
const classKpis = readFileSync("src/components/diagnostics/results/ClassOverviewKPIs.tsx", "utf8");
const coreUtils = readFileSync("src/lib/diagnosticCoreUtils.ts", "utf8");

test("Diagnostik: pädagogischer Ablauf Erkennen → Verstehen → Fördern ist sichtbar", () => {
  assert.match(home, /Erkennen/);
  assert.match(home, /Verstehen/);
  assert.match(home, /Fördern/);
  assert.match(home, /Diagnostischer Ablauf/);
  assert.match(home, /Verstehen & Fördern/);
});

test("Diagnostik: bisherige Verfahren bleiben nur als sekundärer Archivzugang erreichbar", () => {
  assert.match(home, /Archiv & bisherige Diagnostik/);
  assert.doesNotMatch(home, /Neues Diagnostiksystem • Schritt 2/);
  assert.match(container, /view === 'legacy'/);
  assert.match(container, /<DiagnostikLegacy/);
});

test("Diagnostik: keine erfundene Beispielklasse 2a wird angezeigt", () => {
  for (const [name, source] of [
    ["Container", container],
    ["Ergebnisse", results],
    ["Kindprofil", individual],
    ["Klassenperspektive", classPerspective],
    ["Klassen-KPIs", classKpis],
  ] as const) {
    assert.ok(!source.includes("'2a'"), `${name} enthält noch den Fallback '2a'`);
    assert.ok(!source.includes('"2a"'), `${name} enthält noch den Fallback "2a"`);
  }

  assert.match(
    container,
    /app\.klassenbezeichnung\?\.trim\(\) \|\| app\.klasse\?\.trim\(\) \|\| undefined/,
  );
});

test("Diagnostik: Klassenübersicht bleibt auf vier ruhige Kern-KPIs begrenzt", () => {
  for (const id of [
    "kpi-card-students-total",
    "kpi-card-students-tested",
    "kpi-card-diagnostic-runs",
    "kpi-card-competencies-distinct",
  ]) {
    assert.ok(classKpis.includes(id), `Kern-KPI fehlt: ${id}`);
  }
  assert.equal((classKpis.match(/id="kpi-card-/g) || []).length, 4);
});

test("Diagnostik: vier qualitative Kompetenzstatus bleiben verbindlich", () => {
  assert.match(
    coreUtils,
    /const validStatuses: CompetencyStatus\[\] = \['secure', 'mostlySecure', 'partlySecure', 'needsObservation'\]/,
  );
});

test("Diagnostik: Ergebniszähler behauptet nicht fälschlich, alle Ergebnisse seien neu", () => {
  assert.match(results, /\{results\.length\} Diagnostikergebnisse/);
  assert.doesNotMatch(results, /\{results\.length\} neue Diagnostikergebnisse/);
});
