import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialAppState, normalizeAppState } from './appState';
import { DEFAULT_HISTORICAL_STUDENTS } from '../data/historicalStudents';

test('fresh production state contains no invented teacher, archive, links or QR data', () => {
  assert.deepEqual(initialAppState.historicalStudents, []);
  assert.deepEqual(DEFAULT_HISTORICAL_STUDENTS, []);
  assert.deepEqual(initialAppState.quickLinks, []);
  assert.equal(initialAppState.tempQrValue, '');
  assert.equal(initialAppState.motto, '');
  assert.deepEqual(initialAppState.lehrerProfil, {
    schulstundenJaehrlich: 0,
    schularbeitenManuell: 0,
    testsManuell: 0,
    ausfluegeManuell: 0,
    name: '',
    schule: '',
    motto: '',
    gegruendetYear: '',
  });
});

test('normalization preserves real user profile and real historical records', () => {
  const historicalStudents = [{ id: 'real-1', name: 'Eigener Eintrag', class: '4a', year: '2025/26', average: 2 }];
  const lehrerProfil = {
    schulstundenJaehrlich: 700,
    schularbeitenManuell: 5,
    testsManuell: 9,
    ausfluegeManuell: 4,
    name: 'Eigener Name',
    schule: 'Eigene Schule',
    motto: 'Eigenes Motto',
    gegruendetYear: '2014',
  };
  const normalized = normalizeAppState({ historicalStudents, lehrerProfil });
  assert.deepEqual(normalized.historicalStudents, historicalStudents);
  assert.deepEqual(normalized.lehrerProfil, lehrerProfil);
});

test('known legacy bundled demo profile and demo archive are removed during normalization', () => {
  const bundledArchive = Array.from({ length: 25 }, (_, index) => ({
    id: `h${index + 1}`,
    name: index === 0 ? 'Alina Beck' : index === 24 ? 'Elena Rhomberg' : `Demo ${index}`,
    class: 'Demo', year: '2023/24', average: 2,
  }));
  const normalized = normalizeAppState({
    anrede: 'Herr',
    nachname: 'Hehle',
    schulName: 'Eigene Schule',
    historicalStudents: bundledArchive,
    lehrerProfil: {
      schulstundenJaehrlich: 120,
      schularbeitenManuell: 4,
      testsManuell: 8,
      ausfluegeManuell: 3,
      name: 'Maximilian Musterlehrer',
      schule: 'Volksschule Musterstadt',
      motto: 'Pädagogik mit Herz ❤️',
      gegruendetYear: '2018',
    },
  });
  assert.deepEqual(normalized.historicalStudents, []);
  assert.equal(normalized.lehrerProfil?.name, 'Herr Hehle');
  assert.equal(normalized.lehrerProfil?.schule, 'Eigene Schule');
  assert.equal(normalized.lehrerProfil?.motto, '');
  assert.equal(normalized.lehrerProfil?.schulstundenJaehrlich, 0);
});

test('teacher profile UI contains no invented identity or fallback workload statistics', () => {
  const source = readFileSync(new URL('../components/LehrerProfilView.tsx', import.meta.url), 'utf8');
  for (const forbidden of [
    'Maximilian Musterlehrer',
    'Volksschule Musterstadt',
    'Grundschule Musterstadt',
    'Pädagogik mit Herz ❤️',
    'app.schueler?.length || 22',
    'Math.max(1, Math.floor(totalPaperSaved / 150))',
    'profile.schulstundenJaehrlich || 120',
    'profile.schularbeitenManuell || 4',
    'profile.testsManuell || 8',
    'profile.ausfluegeManuell || 3',
    'averageHoursPerArchivedYear = 720',
    'lifetimeStudentsTotal * 38',
  ]) {
    assert.equal(source.includes(forbidden), false, `forbidden demo fallback remains: ${forbidden}`);
  }
});


test('topbar and weather server contain no invented live data or credentials', () => {
  const topbar = readFileSync(new URL('../components/Topbar.tsx', import.meta.url), 'utf8');
  const server = readFileSync(new URL('../../server.ts', import.meta.url), 'utf8');

  for (const forbidden of [
    'Schul-WLAN-Klasse',
    'Schule2026!',
    'Lehrer-Smartphone-Hotspot',
    'Klassenzimmer123',
    'Schule-Gaeste',
    "app?.klassenbezeichnung || 'Klasse 3a'",
    ": '20°C'",
    ": 'Sonnig'",
    ": '5 km/h'",
    'Vorarlberg / Öst.',
    'latitude=47.2333&longitude=9.6',
  ]) {
    assert.equal(topbar.includes(forbidden), false, `invented Topbar fallback remains: ${forbidden}`);
  }

  assert.match(topbar, /app\?\.schulOrt \|\| 'Ort nicht gesetzt'/);
  assert.match(topbar, /Noch keine WLAN-Daten hinterlegt/);
  assert.match(topbar, /Keine Wetterprognose verfügbar/);

  assert.equal(server.includes('getFallbackWeatherData'), false);
  assert.equal(server.includes('getFallbackGeocodingData'), false);
  assert.equal(server.includes('temperature_2m: 21.5'), false);
  assert.equal(server.includes('47.2333'), false);
  assert.match(server, /Wetterdaten sind derzeit nicht verfügbar/);
  assert.match(server, /Wetter-Ortssuche ist derzeit nicht verfügbar/);
});
