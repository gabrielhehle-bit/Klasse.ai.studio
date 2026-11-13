import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transferQuickPlannedLesson as transfer } from './quickPlanLessonTransfer';

const source = { dayIdx: 0, hourIdx: 0 };
const target = { dayIdx: 1, hourIdx: 2 };

test('Kopieren übernimmt alle Felder, lässt das Original bestehen und startet unerledigt', () => {
  const week = {
    Montag: { 0: {
      id: 'lesson-old', fach: 'Deutsch', thema: 'Silben', erledigt: true, completed: true,
      housework: 'S. 10', materialIds: ['1'], halves: { enabled: true, first: { thema: 'Laut' } },
      imKinderWochenplan: true, wochenplanMaterial: 'Arbeitsheft', updatedAt: 'alt',
    } },
    Dienstag: { 1: { fach: 'Mathematik', thema: 'Zählen' } },
  };
  const before = structuredClone(week);
  const result = transfer({ week, source, target, mode: 'copy', updatedAt: 'neu', copyId: 'lesson-new' });
  assert.equal(result.status, 'copied');
  const copy = result.week.Dienstag[2];
  assert.equal(copy.fach, 'Deutsch');
  assert.equal(copy.id, 'lesson-new');
  assert.equal(week.Montag[0].id, 'lesson-old');
  assert.equal(copy.thema, 'Silben');
  assert.equal(copy.housework, 'S. 10');
  assert.equal(copy.imKinderWochenplan, true);
  assert.equal(copy.wochenplanMaterial, 'Arbeitsheft');
  assert.equal(copy.erledigt, false);
  assert.equal(copy.completed, false);
  assert.equal(copy.updatedAt, 'neu');
  assert.deepEqual(copy.materialIds, ['1']);
  assert.notEqual(copy.materialIds, week.Montag[0].materialIds);
  assert.notEqual(copy.halves, week.Montag[0].halves);
  assert.equal(result.week.Montag[0], week.Montag[0]);
  assert.equal(result.week.Dienstag[1], week.Dienstag[1]);
  assert.deepEqual(week, before);
});

test('Verschieben arbeitet atomar ohne andere Stunden, Termine oder die Originalwoche zu verändern', () => {
  const week = {
    Montag: { 0: { fach: 'Musik', thema: 'Singen', materialIds: ['m1'], erledigt: true }, zeitunabhaengig: [{ titel: 'Konzert' }] },
    Dienstag: { 4: { fach: 'Religion', thema: 'Gemeinschaft' } },
  };
  const before = structuredClone(week);
  const moved = transfer({ week, source, target, mode: 'move' });
  assert.equal(moved.status, 'moved');
  assert.equal(moved.week.Montag[0], undefined);
  assert.deepEqual(moved.week.Dienstag[2], week.Montag[0]);
  assert.equal(moved.week.Dienstag[2].erledigt, true, 'moving is not the same as copying');
  assert.equal(moved.week.Montag.zeitunabhaengig, week.Montag.zeitunabhaengig);
  assert.equal(moved.week.Dienstag[4], week.Dienstag[4]);
  assert.deepEqual(week, before);
});

test('Belegte Zielstunden werden nicht überschrieben, auch wenn sie nur ein Fach enthalten', () => {
  for (const targetLesson of [{ fach: 'Mathematik' }, { thema: 'Unvollständig' }, { materialIds: ['x'] }, {}]) {
    const week = { Montag: { 0: { fach: 'Deutsch', thema: 'Wörter' } },
      Dienstag: { 2: targetLesson } };
    const next = transfer({ week, source, target, mode: 'move' });
    assert.equal(next.status, 'occupied-target');
    assert.equal(next.week, week);
  }
});

test('Historische numerische Slots bleiben benutzbar, werden aber nie verdeckt überschrieben', () => {
  const legacy = { 0: { 0: { fach: 'Sachunterricht', thema: 'Igel' } }, 1: {} };
  const copied = transfer({ week: legacy, source, target, mode: 'copy' });
  assert.equal(copied.status, 'copied');
  assert.equal(copied.week[1][2].thema, 'Igel');
  const occupied = { ...legacy, Dienstag: { 2: { fach: 'Musik' } } };
  assert.equal(transfer({ week: occupied, source, target, mode: 'copy' }).status, 'occupied-target');
  const duplicate = { ...legacy, Montag: { 0: { fach: 'Deutsch', thema: 'Alt' } } };
  const ambiguous = transfer({ week: duplicate, source, target, mode: 'move' });
  assert.equal(ambiguous.status, 'ambiguous-source');
  assert.equal(ambiguous.week, duplicate);
});

test('Doppelstunden und Restlicher-Tag-Blöcke dürfen keine Nachbarstunden überdecken', () => {
  const sourceTwo = { Montag: { 0: { fach: 'Deutsch', thema: 'Lesen', duration: 2 } },
    Dienstag: { 3: { fach: 'Musik', thema: 'Singen' } } };
  const blocking = transfer({ week: sourceTwo, source,
    target: { dayIdx: 1, hourIdx: 2 }, mode: 'copy' });
  assert.equal(blocking.status, 'occupied-target', 'second slot is occupied');
  assert.equal(blocking.week, sourceTwo);

  const overEnd = transfer({ week: sourceTwo, source,
    target: { dayIdx: 1, hourIdx: 9 }, mode: 'move' });
  assert.equal(overEnd.status, 'invalid-slot', 'two hours do not fit after hour 10');
  assert.equal(overEnd.week, sourceTwo);

  const earlierBlock = { ...sourceTwo, Dienstag: { 1: { fach: 'Mathematik', duration: 3 } } };
  assert.equal(transfer({ week: earlierBlock, source, target, mode: 'copy' }).status, 'occupied-target');

  const wholeDay = { Montag: { 0: { fach: 'Deutsch', thema: 'Projekt', duration: 'all' } },
    Mittwoch: { 6: { fach: 'Sachunterricht', thema: 'Igel' } } };
  assert.equal(transfer({ week: wholeDay, source,
    target: { dayIdx: 2, hourIdx: 1 }, mode: 'copy' }).status, 'occupied-target');
});

test('Leere Quelle, identisches Ziel und ungültige Tages-/Stundenplätze ändern nichts', () => {
  const week = { Mittwoch: { 0: { fach: 'Deutsch', thema: 'Lesen' } } };
  assert.equal(transfer({ week, source, target, mode: 'copy' }).status, 'empty-source');
  assert.equal(transfer({ week, source, target: source, mode: 'copy' }).status, 'same-slot');
  assert.equal(transfer({ week, source: { dayIdx: 0, hourIdx: -1 }, target, mode: 'move' }).status, 'invalid-slot');
  assert.equal(transfer({ week, source, target: { dayIdx: 5, hourIdx: 0 }, mode: 'copy' }).status, 'invalid-slot');
  assert.equal(transfer({ week, source, target: { dayIdx: 1, hourIdx: 10 }, mode: 'move' }).status, 'invalid-slot');
});

const ui = readFileSync('src/components/PlanungsZentrale.tsx', 'utf8');
test('Schnellplanung bietet bewusste Kopier-/Verschiebeaktion und schützt ungespeicherte Entwürfe', () => {
  assert.match(ui, /transferQuickPlannedLesson/);
  assert.match(ui, /hasUnsavedQuickPlanChanges\(\)/);
  assert.match(ui, /onClick=\{\(\) => handleTransferLesson\('copy'\)\}/);
  assert.match(ui, /onClick=\{\(\) => handleTransferLesson\('move'\)\}/);
  assert.match(ui, /Zielstunde ist bereits belegt/);
  assert.match(ui, /Bitte zuerst deine Änderungen speichern/);
  const weekly = readFileSync('src/components/WeeklyPlan.tsx', 'utf8');
  assert.match(weekly, /data-weekly-overview-transfer/);
  assert.match(weekly, /onClick=\{\(\) => handleOverviewLessonTransfer\('copy'\)\}/);
  assert.match(weekly, /onClick=\{\(\) => handleOverviewLessonTransfer\('move'\)\}/);
});
