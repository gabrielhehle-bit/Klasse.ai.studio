import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const studentList = readFileSync("src/components/StudentList.tsx", "utf8");

test("Schülerformular: lange Eingabe ist in drei klare Bereiche geteilt", () => {
  assert.match(
    studentList,
    /useState<'basis' \| 'paedagogik' \| 'kontakte'>\('basis'\)/,
  );
  for (const label of ["Basisdaten", "Pädagogik", "Kontakte"]) {
    assert.ok(studentList.includes(label), `Bereich fehlt: ${label}`);
  }
  assert.match(studentList, /aria-label="Schülerformular Bereiche"/);
  assert.match(studentList, /studentFormSection === 'basis'/);
  assert.match(studentList, /studentFormSection === 'paedagogik'/);
  assert.match(studentList, /studentFormSection === 'kontakte'/);
});

test("Schülerformular: bestehende Stammdaten bleiben vollständig editierbar", () => {
  for (const field of [
    "vorname",
    "nachname",
    "geschlecht",
    "besuchsjahr",
    "niveau",
    "geburtstag",
    "sv_nummer",
    "ikmNummer",
    "staatsbuergerschaft",
    "religion",
  ]) {
    assert.ok(studentList.includes(`editingStudent?.${field}`), `Stammdatenfeld fehlt: ${field}`);
  }
});

test("Schülerformular: pädagogische Daten bleiben vollständig editierbar", () => {
  for (const field of [
    "erstsprache",
    "zweitsprache",
    "daz",
    "espf",
    "spf",
    "foerderprofil",
    "wunschpartner",
    "sperrpartner",
  ]) {
    assert.ok(studentList.includes(`editingStudent?.${field}`), `Pädagogikfeld fehlt: ${field}`);
  }
  assert.match(studentList, /Förderung & Sprache/);
  assert.match(studentList, /Sitzplatz-Beziehungen/);
});

test("Schülerformular: Kontakt-, Freigabe- und Hinweisfelder bleiben erhalten", () => {
  for (const field of [
    "anschrift",
    "plz",
    "ort",
    "telefon_mutter",
    "telefon_vater",
    "email_eltern",
    "foto",
    "emoji",
    "fotoFreigabe",
    "allergien",
    "notiz",
  ]) {
    assert.ok(studentList.includes(`editingStudent?.${field}`), `Kontaktfeld fehlt: ${field}`);
  }
});

test("Schülerformular: Navigation schützt Pflichtnamen und speichert unverändert über updateStudent", () => {
  assert.match(studentList, /if \(!editingStudent \|\| !vorname \|\| !nachname\) \{\s*setStudentFormSection\('basis'\);/);
  assert.match(studentList, /updateStudent\(student\)/);
  assert.match(studentList, /disabled=\{studentFormSection === 'basis' && \(!editingStudent\?\.vorname\?\.trim\(\) \|\| !editingStudent\?\.nachname\?\.trim\(\)\)\}/);
  assert.match(studentList, /studentFormSection !== 'kontakte'/);
  assert.match(studentList, />\s*Weiter\s*</);
  assert.match(studentList, />\s*Zurück\s*</);
});
