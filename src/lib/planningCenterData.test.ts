import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAppState, syncActiveClass, switchClassState } from './appState';

function minimalClass(id: string) {
  return {
    id,
    name: `Klasse ${id}`,
    stufe: 3,
    klassenvorstand: true,
    schueler: [],
    noten: {},
    mitarbeit: {},
    verhalten: {},
    karten: {},
    jahresplanung: {},
    wochenplanung: {},
    stammplan: {},
    anwesenheit: {},
    klassenglas_count: 0,
    klassenglas_ziel: 20,
    sue_kontrolle: {},
    sitzplan_schueler: {},
    sitzplan_objekte: [],
  };
}

test('Legacy-Parkgarage und Wochenvorlagen wandern nur in die aktive Klasse', () => {
  const normalized = normalizeAppState({
    activeClassId: 'a',
    classes: [minimalClass('a'), minimalClass('b')],
    klassenbezeichnung: 'Klasse a',
    parkgarage: [{ id: 'legacy-park', fach: 'Deutsch' }],
    savedWeekTemplates: { Alt: { Montag: { 0: { fach: 'Deutsch' } } } },
  } as any);

  const classA = normalized.classes?.find(c => c.id === 'a') as any;
  const classB = normalized.classes?.find(c => c.id === 'b') as any;

  assert.equal(classA.parkgarage[0].id, 'legacy-park');
  assert.ok(classA.savedWeekTemplates.Alt);
  assert.deepEqual(classB.parkgarage, []);
  assert.deepEqual(classB.savedWeekTemplates, {});
});

test('Parkgarage und Wochenvorlagen bleiben beim Klassenwechsel getrennt', () => {
  let state = normalizeAppState({
    activeClassId: 'a',
    classes: [
      {
        ...minimalClass('a'),
        parkgarage: [{ id: 'park-a', fach: 'Deutsch' }],
        savedWeekTemplates: { A: { marker: 'a' } },
      },
      {
        ...minimalClass('b'),
        parkgarage: [{ id: 'park-b', fach: 'Mathematik' }],
        savedWeekTemplates: { B: { marker: 'b' } },
      },
    ],
  } as any);

  state = switchClassState(state, 'b');
  assert.equal(state.parkgarage?.[0]?.id, 'park-b');
  assert.equal((state.savedWeekTemplates as any)?.B?.marker, 'b');

  state = syncActiveClass({
    ...state,
    parkgarage: [...(state.parkgarage || []), { id: 'park-b-2', fach: 'Musik' }],
    savedWeekTemplates: {
      ...(state.savedWeekTemplates || {}),
      B2: { marker: 'b2' },
    },
  } as any);

  state = switchClassState(state, 'a');
  assert.deepEqual((state.parkgarage || []).map((item: any) => item.id), ['park-a']);
  assert.equal((state.savedWeekTemplates as any)?.A?.marker, 'a');
  assert.equal((state.savedWeekTemplates as any)?.B, undefined);

  state = syncActiveClass(state);
  state = switchClassState(state, 'b');
  assert.deepEqual((state.parkgarage || []).map((item: any) => item.id), ['park-b', 'park-b-2']);
  assert.equal((state.savedWeekTemplates as any)?.B2?.marker, 'b2');
});
