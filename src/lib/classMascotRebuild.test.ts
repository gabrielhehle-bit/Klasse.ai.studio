import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_CLASS_MASCOT, MASCOT_OPTIONS, mascotMessage, normalizeClassMascot, reactToMascotAction, selectClassMascot } from './classMascot';
import { initialAppState, normalizeAppState, switchClassState, syncActiveClass } from './appState';

test('four original, independent mascots; Elio has a separate woodland-elf illustration', () => {
  assert.deepEqual(MASCOT_OPTIONS.map(item => item.kind), ['otter', 'dog', 'cat', 'elf']);
  assert.deepEqual(MASCOT_OPTIONS.map(item => item.name), ['Olivia', 'Bruno', 'Mimi', 'Elio']);
  const art = readFileSync('src/components/cockpit/ClassMascotArtwork.tsx', 'utf8');
  for (const kind of ['otter', 'dog', 'cat', 'elf']) assert.match(art, new RegExp("kind === '" + kind + "'"));
  assert.match(art, /teal vest|Wald|woodland-school helper/);
  assert.doesNotMatch(art, /Dobby|Harry Potter|Hogwarts/);
});

test('the mascot is intentionally simple and only teacher-led, without per-child inference', () => {
  assert.deepEqual(normalizeClassMascot(), DEFAULT_CLASS_MASCOT);
  assert.equal(selectClassMascot(DEFAULT_CLASS_MASCOT, 'elf').name, 'Elio');
  assert.equal(normalizeClassMascot({ kind: 'elf', name: '   ', mood: 'proud', stars: 99 }).name, 'Elio');
  const praised = reactToMascotAction(DEFAULT_CLASS_MASCOT, 'praise');
  assert.deepEqual({ mood: praised.mood, stars: praised.stars }, { mood: 'proud', stars: 1 });
  assert.equal(reactToMascotAction({ ...praised, stars: 5 }, 'praise').stars, 5);
  assert.equal(reactToMascotAction(praised, 'calm').mood, 'calm');
  assert.equal(reactToMascotAction(praised, 'encourage').mood, 'happy');
  assert.match(mascotMessage(selectClassMascot(DEFAULT_CLASS_MASCOT, 'elf')), /Elio/);
  const model = readFileSync('src/lib/classMascot.ts', 'utf8');
  assert.doesNotMatch(model, /studentId|schueler|diagnostik|noten|verhalten|anwesenheit|helpRequested/);
});

test('mascot state is encrypted with the selected class and cannot leak on class switch or restore', () => {
  const roomA = { id: 'A', name: 'A', schuljahr: '2026/27', stufe: 1, schueler: [] } as any;
  const roomB = { id: 'B', name: 'B', schuljahr: '2026/27', stufe: 2, schueler: [] } as any;
  const olivia = { ...DEFAULT_CLASS_MASCOT, kind: 'elf' as const, name: 'Elio', stars: 4 };
  const state = { ...initialAppState, activeClassId: 'A', klassenbezeichnung: 'A', classes: [roomA, roomB], classMascot: olivia };
  const saved = syncActiveClass(state);
  assert.equal(saved.classes?.[0].classMascot?.name, 'Elio');
  assert.equal(saved.classes?.[1].classMascot, undefined);
  const inB = switchClassState(saved, 'B');
  assert.equal(inB.classMascot, undefined);
  const inA = switchClassState(inB, 'A');
  assert.equal(inA.classMascot?.stars, 4);
  assert.equal(normalizeAppState(saved).classMascot?.name, 'Elio');
});

test('the new widget fully replaces the old widget and no floating pet or accessories can appear', () => {
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  const widget = readFileSync('src/components/cockpit/ClassMascotWidget.tsx', 'utf8');
  assert.match(cockpit, /case "pet":\s*return <ClassMascotWidget/);
  assert.match(cockpit, /const classPetEnabled = false;/);
  assert.match(cockpit, /\{false && actualShowPet &&/);
  assert.match(cockpit, /\{false && petAccessoryOverlayOpen &&/);
  assert.match(cockpit, /handleOpenWidgetInCockpitLayout\("pet"\)/);
  assert.doesNotMatch(cockpit, /<PetWidgetContent/);
  assert.match(widget, /Unser Klassenmaskottchen/);
  assert.match(widget, /ClassMascotArtwork/);
  assert.match(widget, /Stimmung wird bewusst von der Lehrkraft gewählt/);
  assert.doesNotMatch(widget, /getStudent|studentId|schueler|noten|verhalten|anwesenheit/);
  const app = readFileSync('src/App.tsx', 'utf8');
  assert.doesNotMatch(app, /<UnifiedFAB\s*\/>/);
});
