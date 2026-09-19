import test from 'node:test';
import assert from 'node:assert/strict';
import { projectWeeklyPlanToClassbook } from './weeklyClassbookProjection';

const subjects = [
  'Deutsch', 'Mathematik', 'Sachunterricht', 'Musikerziehung',
  'Bewegung und Sport', 'Werken (TEC)', 'Werken (TEX)',
  'Englisch', 'Religion',
];

test('Wochenplan und Klassenbuch: Stunden, Fach-Unterbereiche, alle geschriebenen Felder und Wiederholungen bleiben exakt zugeordnet', () => {
  const planning = {
    Montag: { 0: {
      fach: 'Deutsch',
      schwerpunkte: ['Deutsch (Lesen)', 'Deutsch (Sprechen & Hören)'],
      thema: 'Gemeinsam lesen', lernziel: 'Texte verstehen',
      material: 'Lesebuch', housework: 'S. 4', method: 'Partnerarbeit',
      social: 'partner', reflexion: 'Brauchten Zeit',
    }, 1: { fach: 'Deutsch', schwerpunkte: ['Deutsch (Lesen)'], thema: 'Gemeinsam lesen' } },
    Dienstag: { 0: { fach: 'Deutsch', schwerpunkte: ['Deutsch (Lesen)'], thema: 'Gemeinsam lesen' } },
  };
  const out = projectWeeklyPlanToClassbook(planning, { activeSubjects: subjects });
  const read = out['Deutsch › Lesen'];
  assert.equal(read.length, 3, 'wiederholte Themen in verschiedenen Stunden bleiben drei getrennte Einträge');
  assert.match(read[0], /Montag, 1\. Stunde/);
  for (const field of ['Gemeinsam lesen', 'Texte verstehen', 'Lesebuch', 'S. 4', 'Partnerarbeit', 'partner', 'Brauchten Zeit']) {
    assert.ok(read[0].includes(field), 'Fehlender Unterrichtstext: ' + field);
  }
  assert.deepEqual(out['Deutsch › Sprechen & Hören'], [read[0]]);
  assert.match(read[1], /Montag, 2\. Stunde/);
  assert.match(read[2], /Dienstag, 1\. Stunde/);
  assert.equal(planning.Montag[0].material, 'Lesebuch');
});

test('Halbierte Stunden behalten jede Hälfte mit eigener Fachzuordnung und gemeinsamen Materialien', () => {
  const out = projectWeeklyPlanToClassbook({
    Donnerstag: { 2: {
      fach: 'Deutsch', material: 'Tafel', housework: 'Übungsblatt',
      schwerpunkte: ['Deutsch (Lesen)'],
      halves: { enabled: true,
        first: { fach: 'Deutsch', unterbereich: 'Deutsch (Förderung)', thema: 'Lesehilfe' },
        second: { fach: 'Mathematik', unterbereich: 'Mathematik (Operationen)', thema: 'Addieren' }
      }
    }}
  }, {activeSubjects: subjects});
  assert.match(out['Deutsch › Förderung'][0], /Donnerstag, 3\. Stunde · 1\. Hälfte.*Lesehilfe.*Tafel.*Übungsblatt/);
  assert.match(out['Mathematik › Operationen'][0], /Donnerstag, 3\. Stunde · 2\. Hälfte.*Addieren.*Tafel.*Übungsblatt/);
  assert.equal(out['Deutsch › Lesen'].length, 0, 'geerbter Unterbereich darf expliziten Halb-Stunden-Unterbereich nicht überschreiben');
});

test('Material ist freiwillig und darf weder Warnungen noch erfundene Inhalte auslösen', () => {
  const out = projectWeeklyPlanToClassbook({
    Mittwoch: { 0: { fach: 'Mathematik', thema: 'Zehnerübergang, Hefte im Regal' }}
  }, {activeSubjects: subjects});
  assert.match(out['Mathematik › Ohne Unterbereich'][0], /Zehnerübergang, Hefte im Regal/);
  assert.doesNotMatch(out['Mathematik › Ohne Unterbereich'][0], /Material:|Material fehlt/);
});

test('Nicht zugeordnete Fächer, Stammplan-Fallback, Termin und optionale Reflexion bleiben erhalten', () => {
  const plan = { Mittwoch: {
    0: { thema: 'Sitzkreis', reflexion: 'Sehr gut' },
    1: { fach: 'Eigene Werkstatt', thema: 'Holz sägen' },
    zeitunabhaengig: [{thema: 'Elterngespräch'}]
  }};
  const withEvents = projectWeeklyPlanToClassbook(plan, {stammplan: { Mittwoch: {1: 'Sachunterricht'} }});
  assert.match(withEvents.Sachunterricht[0], /Sitzkreis.*Sehr gut/);
  assert.match(withEvents['Eigene Werkstatt'][0], /Holz sägen/);
  assert.match(withEvents['Besondere Vorkommnisse'][0], /Elterngespräch/);
  const withoutEvents = projectWeeklyPlanToClassbook(plan, { includeEvents:false, includeReflection:false,
    stammplan: { Mittwoch: {1: 'Sachunterricht'} }});
  assert.equal(withoutEvents['Besondere Vorkommnisse'].length, 0);
  assert.doesNotMatch(withoutEvents.Sachunterricht[0], /Sehr gut/);
});

test('Verknüpfte Materialien werden mit dem bestehenden Titel statt bloßer IDs ins Klassenbuch übernommen', () => {
  const output = projectWeeklyPlanToClassbook({
    Mittwoch: {0: {fach:'Mathematik', thema:'Rechnen', material:'Bleistift',
      materialIds:['heft','buch'], type:'test', dauer:2, zeit:'08:00–08:50'}}
  }, {materialTitlesById: {heft:'Arbeitsheft', buch:'Schulbuch'}});
  const entry = output['Mathematik › Ohne Unterbereich'][0];
  for(const word of ['Bleistift','Arbeitsheft','Schulbuch','test','08:00–08:50']) assert.ok(entry.includes(word));
});

test('Fachwechsel in geteilter Stunde erbt keine fachfremden Unterbereiche aus dem Elternslot', () => {
  const output = projectWeeklyPlanToClassbook({
    Mittwoch: { 0: {
      fach: 'Deutsch', schwerpunkte: ['Deutsch (Lesen)'], thema: 'Gemeinsam',
      halves: {enabled: true,
        first: {fach: 'Deutsch', thema: 'Lesen'},
        second: {fach: 'Mathematik', thema: 'Rechnen'},
      }
    }}
  }, {activeSubjects: subjects});
  assert.equal(output['Deutsch › Lesen'].length, 1);
  assert.match(output['Deutsch › Lesen'][0], /1\. Hälfte/);
  assert.equal(output['Mathematik › Ohne Unterbereich'].length, 1);
  assert.match(output['Mathematik › Ohne Unterbereich'][0], /2\. Hälfte.*Rechnen/);
  assert.doesNotMatch(output['Mathematik › Ohne Unterbereich'][0], /Lesen/);
});

test('Widersprüchliche gemischte Unterbereichs-Tags ordnen einen Mathematikslot nicht Deutsch zu', () => {
  const output = projectWeeklyPlanToClassbook({
    Dienstag: { 1: { fach: 'Mathematik', schwerpunkte: ['Deutsch (Lesen)', 'Mathematik (Operationen)'], thema: 'Addieren' } }
  }, {activeSubjects: subjects});
  assert.equal(output['Deutsch › Lesen'].length, 0);
  assert.match(output['Mathematik › Operationen'][0], /Addieren/);
});
