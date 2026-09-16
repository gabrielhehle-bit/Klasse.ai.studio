import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dossier = readFileSync("src/components/StudentDossier.tsx", "utf8");
const studentList = readFileSync("src/components/StudentList.tsx", "utf8");
const klasseHub = readFileSync("src/components/KlasseHub.tsx", "utf8");

test("Schülerdossier: genau fünf feste Hauptbereiche sind definiert", () => {
  const required = [
    ["uebersicht", "Übersicht"],
    ["lernen_leistungen", "Lernen & Leistungen"],
    ["entwicklung_diagnostik", "Entwicklung & Diagnostik"],
    ["stammdaten_organisation", "Stammdaten & Organisation"],
    ["berichte_materialien", "Berichte & Materialien"],
  ] as const;

  for (const [id, label] of required) {
    assert.ok(dossier.includes(`id: '${id}'`), `Hauptbereich fehlt: ${id}`);
    assert.ok(dossier.includes(`label: '${label}'`), `Beschriftung fehlt: ${label}`);
  }

  assert.match(dossier, /const getFilteredMainAreas = \(\) => MAIN_AREAS;/);
  assert.match(dossier, /const handleSelectArea = \(areaId: MainAreaId\) =>/);
  assert.match(dossier, /setActiveTab\(targetArea\.defaultTab\)/);
});

test("Schülerdossier: alte Sichtbarkeits- und Einfach/Experte-Logik ist aus der Oberfläche entfernt", () => {
  for (const obsolete of [
    "dossier_mode",
    "dossier_custom_visible_tabs",
    "showVisibilityModal",
    "customVisibleTabs",
    "EINFACH_TABS",
    "dossierMode",
  ]) {
    assert.ok(!dossier.includes(obsolete), `Altlogik noch vorhanden: ${obsolete}`);
  }

  assert.ok(!dossier.includes("<span>Bereiche</span>"));
  assert.ok(!dossier.includes("Sichtbare Bereiche konfigurieren"));
});

test("Schülerdossier: Semesterwechsel übernimmt die gewählte Hälfte", () => {
  assert.match(
    dossier,
    /const changeSemester = \(nextSemester: '1' \| '2'\) => \{\s*setSem\(nextSemester\);\s*\};/,
  );
});

test("Schülerdossier: Detailfunktionen der fünf Bereiche bleiben vorhanden", () => {
  for (const tab of [
    "leistungen",
    "lernziele",
    "mika_d",
    "entwicklungsuebersicht",
    "diagnostik",
    "foerderung",
    "beobachtungen_verlauf",
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

test("Schülerliste: Suche, Filter, Ansichten, Import und Dossier bleiben erhalten", () => {
  assert.match(studentList, /const \[searchTerm, setSearchTerm\] = useState\(''\)/);
  assert.match(studentList, /const \[activeFilter, setActiveFilter\].*'all'.*'daz'.*'spf'.*'espf'/s);
  assert.match(studentList, /useState<'list' \| 'grid' \| 'map'>\('list'\)/);
  assert.match(studentList, /KlassenlistenImport/);
  assert.match(studentList, /Dossier öffnen/);
  assert.match(studentList, /title="Bearbeiten"/);
  assert.doesNotMatch(studentList, /Notiz oder Interaktion/);
  assert.doesNotMatch(studentList, /InteractionModal/);
});

test("Klasse-Hub: zentrale Klassenfunktionen bleiben erreichbar", () => {
  for (const label of [
    "Kinder & Dossiers",
    "Anwesenheit & Befinden",
    "Sitzplan & Gruppen",
    "Organisation",
    "KEL-Gespräche",
    "Wir-Gefühl & Klasse",
  ]) {
    assert.ok(klasseHub.includes(label), `Klasse-Hub-Eintrag fehlt: ${label}`);
  }
});
