import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dossier = readFileSync("src/components/StudentDossier.tsx", "utf8");

test("Schülerdossier: vier Hauptbereiche sind als eine einheitliche Navigation sichtbar", () => {
  assert.match(dossier, /Dossierbereiche/);
  assert.match(dossier, /4 Bereiche/);
  assert.match(dossier, /aria-label="Schülerdossier-Hauptbereiche"/);
  assert.match(dossier, /flex gap-2 overflow-x-auto pb-1 scrollbar-none/);
  for (const label of [
    "Überblick",
    "Leistungen",
    "Beobachtungen",
    "Mehr",
  ]) {
    assert.ok(dossier.includes(`label: '${label}'`), `Hauptbereich fehlt: ${label}`);
  }
});

test("Schülerdossier: interne Seitenleiste, verschachtelte Desktop-Navigation und doppelte Seitenkarten sind entfernt", () => {
  assert.doesNotMatch(dossier, /SIDEBAR NAVIGATION/);
  assert.match(dossier, /COMPACT STUDENT NAVIGATION/);
  assert.doesNotMatch(dossier, /Main Area Navigation/);
  assert.doesNotMatch(dossier, /Mobile 5 Main Areas Navigation/);
  assert.doesNotMatch(dossier, /Action Button Suite/);
  assert.doesNotMatch(dossier, /Interner Export \(PDF\)/);
  assert.match(dossier, /Dossier \(PDF\)/);
});

test("Schülerdossier: Unterbereiche funktionieren auf Desktop und Mobil gleich", () => {
  assert.match(dossier, /aria-label="Dossier-Unterbereiche"/);
  assert.match(dossier, /role="tab"/);
  assert.match(dossier, /aria-selected=\{isSubActive\}/);
  assert.doesNotMatch(dossier, /hidden lg:flex flex-wrap items-center gap-2 mb-8/);
  assert.match(dossier, /overflow-x-auto/);
  assert.match(dossier, /lg:flex-wrap/);
});

test("Schülerdossier: Kindwechsel und Kernaktionen bleiben erhalten", () => {
  assert.match(dossier, /id="student-switcher"/);
  assert.match(dossier, /Vorheriges Kind:/);
  assert.match(dossier, /Nächstes Kind:/);
  assert.match(dossier, /exportSchuelerPDF\(student\.id, app\)/);
  assert.match(dossier, /activePrintTemplate: 'schuelerprofil'/);
  assert.match(dossier, /dossierFocusMode: true/);
  assert.match(dossier, /Geschlecht: \{getStudentGenderLabel\(student\.geschlecht\)\}/);
});

test("Schülerdossier: alle bisherigen Detailbereiche bleiben erreichbar", () => {
  for (const tab of [
    "leistungen",
    "lernziele",
    "mika_d",
    "entwicklungsuebersicht",
    "diagnostik",
    "foerderung",
    "beobachtungen_verlauf",
    "entwicklungslisten",
    "stammdaten",
    "kontakte_einwilligungen",
    "finanzen",
    "berichte",
    "beurteilung_gespraeche",
    "materialien",
  ]) {
    assert.ok(dossier.includes(`id: '${tab}'`), `Detailbereich fehlt: ${tab}`);
  }
});


test("Schülerdossier: Mehr öffnet zuerst eine gruppierte Vertiefungsübersicht", () => {
  assert.match(dossier, /defaultTab: 'mehr'/);
  assert.match(dossier, /Weitere Bereiche/);
  assert.match(dossier, /Lernen & Rückmeldung/);
  assert.match(dossier, /Entwicklung & Förderung/);
  assert.match(dossier, /Organisation/);
  assert.match(dossier, /Berichte & Materialien/);
  assert.match(dossier, /Alles, was du nicht für den täglichen Überblick brauchst/);
});

test("Schülerdossier: in Mehr werden nur die Unterbereiche der aktiven Gruppe direkt gezeigt", () => {
  assert.match(dossier, /activeMoreGroup\.tabs\.map/);
  assert.match(dossier, /onClick=\{\(\) => setActiveTab\('mehr'\)\}/);
  assert.match(dossier, /areaId === 'berichte_materialien' && activeTab !== 'mehr'/);
  assert.doesNotMatch(dossier, /activeMainArea === 'berichte_materialien' && getFilteredSubTabs\(activeMainArea\)\.length > 1/);
});
