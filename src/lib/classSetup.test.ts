import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_TAGEPLAN, TAGE_NAMEN } from '../constants';
import { normalizeAppState, switchClassState, syncActiveClass } from './appState';
import { standardKlassenrolle, leererSek1Tageplan, istUnveraenderterVsTageplan, istLeererTageplan, abweichendeKlassenbezeichnung } from './classSetup';

test('VS defaults to Klassenlehrperson; new MS and AHS-Unterstufe default to Fachlehrperson', () => {
  assert.equal(standardKlassenrolle(undefined), true);
  assert.equal(standardKlassenrolle('volksschule'), true);
  assert.equal(standardKlassenrolle('mittelschule'), false);
  assert.equal(standardKlassenrolle('ahs_unterstufe'), false);
});

test('new secondary classes have blank day schedules, existing VS default remains unchanged', () => {
  const secondaryPlan = leererSek1Tageplan();
  for (const day of TAGE_NAMEN) {
    assert.deepEqual(secondaryPlan[day].stunden, []);
    assert.equal(secondaryPlan[day].vm, 0);
    assert.equal(secondaryPlan[day].nm, false);
  }
  assert.equal(istLeererTageplan(secondaryPlan), true);
  assert.equal(istUnveraenderterVsTageplan(DEFAULT_TAGEPLAN), true);
  assert.equal(istLeererTageplan(DEFAULT_TAGEPLAN), false);
  assert.equal(istUnveraenderterVsTageplan({}), false);
  assert.deepEqual(DEFAULT_TAGEPLAN.Montag.stunden, [1, 2, 3, 4, 5]);
});

test('class name-stage discrepancy is a warning and never rewrites labels or stage', () => {
  assert.equal(abweichendeKlassenbezeichnung('1a', 'volksschule', 2), true);
  assert.equal(abweichendeKlassenbezeichnung('1a', 'volksschule', 1), false);
  assert.equal(abweichendeKlassenbezeichnung('1a', 'mittelschule', 5), false);
  assert.equal(abweichendeKlassenbezeichnung('1a', 'ahs_unterstufe', 6), true);
  assert.equal(abweichendeKlassenbezeichnung('Physikgruppe', 'mittelschule', 7), false);
});

test('role and school type stay class-local across switches and serialized backups', () => {
  const original = normalizeAppState({
    activeClassId: 'vs', klassenbezeichnung: '2a', stufe: 2,
    schulart: 'volksschule', klassenvorstand: true,
    classes: [
      { id:'vs', name:'2a', stufe:2, schulart:'volksschule', klassenvorstand:true, schueler:[] },
      { id:'ms', name:'1b', stufe:5, schulart:'mittelschule', klassenvorstand:false, schueler:[] },
      { id:'ahs', name:'2b', stufe:6, schulart:'ahs_unterstufe', klassenvorstand:true, schueler:[] },
    ],
  });
  const ms = switchClassState(original, 'ms');
  assert.equal(ms.schulart, 'mittelschule');
  assert.equal(ms.klassenvorstand, false);
  const ahs = switchClassState(ms, 'ahs');
  assert.equal(ahs.schulart, 'ahs_unterstufe');
  assert.equal(ahs.klassenvorstand, true);
  const restored = normalizeAppState(JSON.parse(JSON.stringify(syncActiveClass(ahs))));
  assert.equal(switchClassState(restored, 'ms').klassenvorstand, false);
  assert.equal(switchClassState(restored, 'vs').klassenvorstand, true);
});

test('setup persists role, does not overwrite a class on school-type switch and shows real preview numbers', () => {
  const setup = readFileSync('src/components/SetupWizardCore.tsx', 'utf8');
  assert.match(setup, /const \[klassenvorstand, setKlassenvorstand\]/);
  assert.match(setup, /if \(isEditing\) return;/);
  assert.doesNotMatch(setup, /klassenvorstand: true/);
  assert.match(setup, /id: classId, name: klassenbezeichnung, stufe, schulart, klassenvorstand/);
  assert.match(setup, /klassenvorstand, schuljahr: schuljahr/);
  assert.match(setup, /studentsList.length\}<\/div>/);
  assert.doesNotMatch(setup, /studentsList.length \|\| 24/);
  assert.match(setup, /!isSek1 \? quickSteps : expertSteps/);
});
