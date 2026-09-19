import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLessonDraft, lessonDraftFromMaterial, lessonDraftToText, hasLessonDraftContent } from './lessonDrafts';

test('manual legacy draft is read without modifying source fields or extra metadata', () => {
  const old = { id: 'old-1', datum: '2025-09-02', fach: 'Deutsch', thema: 'Lesen',
    lernziele: 'Flüssig lesen', einleitung: 'Begrüßung', hauptteil: 'Lesetandem',
    schluss: 'Rückblick', material: 'Buch', anotherLegacyField: { preserved: true } };
  const original = structuredClone(old);
  const view = normalizeLessonDraft(old);
  assert.equal(view.hauptteil, 'Lesetandem');
  assert.equal(view.datum, '2025-09-02');
  assert.deepEqual(old, original);
});

test('old KI plan array is fully projected into named phases rather than discarded', () => {
  const saved = { id: 'ai-1', date: '2026-09-19T09:00:00.000Z', fach: 'Mathematik', thema: 'Zahlen', plan: {
    lernziele: { kognitiv: 'Bis 20', affektiv: 'Freude', instrumental: 'Karten legen' },
    verlaufsplan: [
      { phase: 'Einstieg', zeit: '5 min', aktion: 'Impuls', sozialform: 'Plenum', medien: 'Tafel' },
      { phase: 'Erarbeitung', zeit: '20 min', aktion: 'Zahlen legen', sozialform: 'Partner' },
      { phase: 'Schluss', zeit: '5 min', aktion: 'Sichern' },
    ],
    differenzierung: { starke: 'Zusatzaufgabe', schwache: 'Hilfekarten' }, materialien: 'Karten'
  }};
  const view = normalizeLessonDraft(saved);
  assert.match(view.lernziele, /Karten legen/);
  assert.match(view.einleitung, /Impuls/);
  assert.match(view.hauptteil, /Zusatzaufgabe/);
  assert.match(view.hauptteil, /Hilfekarten/);
  assert.match(view.schluss, /Sichern/);
  assert.equal(view.material, 'Karten');
  assert.equal(view.datum, '2026-09-19');
  assert.ok(hasLessonDraftContent(view));
});

test('draft saved as a library item roundtrips through the library text', () => {
  const first = { lernziele: 'Zählen', einleitung: 'Raten', hauptteil: 'Sortieren', schluss: 'Spiel', material: 'Würfel' };
  const record = { id: 'library-1', titel: 'Würfel', faecher: ['Mathematik'], erstelltAm: '2026-09-19', inhaltText: lessonDraftToText(first) };
  const restored = lessonDraftFromMaterial(record);
  for (const field of Object.keys(first)) assert.equal(restored[field as keyof typeof first], first[field as keyof typeof first]);
});

test('old unstructured library content is never dropped', () => {
  const old = { titel: 'Notizen', inhaltText: 'Ganz ursprünglicher, freier Text' };
  assert.equal(lessonDraftFromMaterial(old).hauptteil, old.inhaltText);
});

test('saved detailed lesson is plain JSON and roundtrips without dropping additional legacy fields', () => {
  const original = { fach: 'Mathematik', thema: 'Zehnerübergang', method: 'Vorhandener Ablauf',
    housework: 'Seite 7', legacyAnnotation: 'Bitte erhalten',
    stundenentwurf: { lernziele: 'Rechnen', einleitung: 'Würfel', hauptteil: 'Rechnen', schluss: 'Rückblick', material: 'Plättchen' } };
  const restored = JSON.parse(JSON.stringify(original));
  assert.deepEqual(restored, original);
  assert.equal(restored.legacyAnnotation, 'Bitte erhalten');
  assert.equal(restored.stundenentwurf.material, 'Plättchen');
});
