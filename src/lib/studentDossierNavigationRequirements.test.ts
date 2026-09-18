import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dossier = readFileSync("src/components/StudentDossier.tsx", "utf8");

test("Schülerdossier: fünf Hauptbereiche sind als eine einheitliche Navigation sichtbar", () => {
  assert.match(dossier, /Dossierbereiche/);
  assert.match(dossier, /5 Bereiche/);
  assert.match(dossier, /aria-label="Schülerdossier-Hauptbereiche"/);
  assert.match(dossier, /flex gap-2 overflow-x-auto pb-1 scrollbar-none/);
  for (const label of [
    "Übersicht",
    "Lernen & Leistungen",
    "Entwicklung & Diagnostik",
    "Stammdaten & Organisation",
    "Berichte & Materialien",
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
