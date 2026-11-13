import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  moveOrSwapWeeklyLesson as moveOrSwap,
  parkWeeklyLessonSafely as park,
  restoreParkedWeeklyLessonSafely as restore,
} from './weeklyDragDropSafety';

const monday = { dayIdx: 0, hourIdx: 0 };
const tuesday = { dayIdx: 1, hourIdx: 2 };

test('Drag-and-drop: freie Zielstunde wird verlustfrei belegt, Quelle erst dann entfernt', () => {
  const source = {
    id: 'original', fach: 'Deutsch', thema: 'Lesen', erledigt: true,
    housework: 'ÜH S. 8', materialIds: ['m1'],
    halves: { enabled: true, first: { thema: 'Silben' } },
    wochenplanMaterial: 'Leseblatt',
  };
  const week = { Montag: { 0: source, zeitunabhaengig: [{ titel: 'Ausflug' }] },
    Dienstag: { 1: { fach: 'Mathematik', thema: 'Plus' } } };
  const before = structuredClone(week);
  const result = moveOrSwap({ week, source: monday, target: tuesday });
  assert.equal(result.status, 'moved');
  assert.equal(result.week.Montag[0], undefined);
  assert.deepEqual(result.week.Dienstag[2], source);
  assert.notEqual(result.week.Dienstag[2], source);
  assert.equal(result.week.Montag.zeitunabhaengig, week.Montag.zeitunabhaengig);
  assert.equal(result.week.Dienstag[1], week.Dienstag[1]);
  assert.deepEqual(week, before);
});

test('Belegte Zielstunde verlangt Zustimmung und tauscht dann beide vollständigen Objekte', () => {
  const a = { id: 'A', fach: 'Deutsch', thema: 'Schreiben', erledigt: true, materialIds: ['a'] };
  const b = { id: 'B', fach: 'Mathematik', thema: 'Rechnen', erledigt: false, method: 'Plenum' };
  const week = { Montag: { 0: a }, Dienstag: { 2: b } };
  const preview = moveOrSwap({ week, source: monday, target: tuesday });
  assert.equal(preview.status, 'swap-confirmation');
  assert.equal(preview.week, week);
  const swapped = moveOrSwap({ week, source: monday, target: tuesday, allowSwap: true });
  assert.equal(swapped.status, 'swapped');
  assert.deepEqual(swapped.week.Montag[0], b);
  assert.deepEqual(swapped.week.Dienstag[2], a);
  assert.equal(swapped.week.Montag[0].id, 'B');
  assert.equal(swapped.week.Dienstag[2].id, 'A');
  assert.notEqual(swapped.week.Montag[0], b);
  assert.equal(week.Montag[0], a);
  assert.equal(week.Dienstag[2], b);
});

test('Kinder-Wochenplan und existierende Rückmeldungen schützen Quell- und Zielstunde', () => {
  const lesson = { fach: 'Deutsch', thema: 'Lesen' };
  const week = { Montag: { 0: lesson }, Dienstag: { 2: { fach: 'Musik', thema: 'Singen' } } };
  for (const sourceHasChildProgress of [true, false]) {
    for (const targetHasChildProgress of [true, false]) {
      if (!sourceHasChildProgress && !targetHasChildProgress) continue;
      const result = moveOrSwap({
        week, source: monday, target: tuesday,
        sourceHasChildProgress, targetHasChildProgress, allowSwap: true,
      });
      assert.equal(result.status, 'published-child-task');
      assert.equal(result.week, week);
    }
  }
  const published = { Montag: { 0: { ...lesson, imKinderWochenplan: true } } };
  assert.equal(moveOrSwap({ week: published, source: monday, target: tuesday }).status, 'published-child-task');
  assert.equal(park({ week: published, garage: [], source: monday, parkedId: 'p', parkedAt: '13.11.', weekNumber: 46 }).status, 'published-child-task');
  assert.equal(park({ week, garage: [], source: monday, parkedId: 'p', parkedAt: '13.11.', weekNumber: 46,
    sourceHasChildProgress: true }).status, 'published-child-task');
});

test('Doppelstunden und Tageseinheiten sind bei Konflikten geschützt', () => {
  const week = {
    Montag: { 0: { fach: 'Deutsch', thema: 'Lesen', duration: 2 } },
    Dienstag: { 2: { fach: 'Mathematik', thema: 'Rechnen' } },
  };
  assert.equal(moveOrSwap({ week, source: monday, target: tuesday }).status, 'occupied-target');
  assert.equal(moveOrSwap({ week, source: monday, target: tuesday, allowSwap: true }).status, 'occupied-target');
  const overlapping = {
    Montag: { 0: { fach: 'Deutsch', thema: 'Lesen' } },
    Dienstag: { 0: { fach: 'Religion', duration: 'all' } },
  };
  assert.equal(moveOrSwap({ week: overlapping, source: monday, target: tuesday }).status, 'occupied-target');
  assert.equal(moveOrSwap({ week, source: monday, target: { dayIdx: 1, hourIdx: 9 } }).status, 'invalid-slot');
});

test('Alte Tagesformate und doppelte Stunden werden nie stillschweigend umgehängt', () => {
  const hidden = { 0: { 0: { fach: 'Deutsch' } }, Montag: { 0: { fach: 'Musik' } } };
  assert.equal(moveOrSwap({ week: hidden, source: monday, target: tuesday }).status, 'ambiguous-source');
  const oldTarget = { Montag: { 0: { fach: 'Deutsch' } }, 1: { 3: { fach: 'Mathematik' } } };
  assert.equal(moveOrSwap({ week: oldTarget, source: monday, target: tuesday }).status, 'legacy-day');
  const oldSource = { 0: { 0: { fach: 'Deutsch' } }, Dienstag: {} };
  assert.equal(moveOrSwap({ week: oldSource, source: monday, target: tuesday }).status, 'legacy-day');
  const missing = { Montag: {}, Dienstag: {} };
  assert.equal(moveOrSwap({ week: missing, source: monday, target: tuesday }).status, 'empty-source');
});

test('Parkgarage: Stunde verlustfrei parken und später vollständig wiederherstellen', () => {
  const lesson = {
    id: 'lesson-123', fach: 'Sachunterricht', thema: 'Igel', erledigt: false,
    imKinderWochenplan: false, materialIds: ['bild-1'], type: 'standard',
    halves: { enabled: true, first: { thema: 'Lebensraum' } },
    completed: false, custom: { extra: 'erhalten' },
  };
  const week = { Montag: { 0: lesson, zeitunabhaengig: [{ titel: 'Ausflug' }] }, Mittwoch: {} };
  const parked = park({ week, garage: [{ id: 'alt', thema: 'Alte Stunde' }],
    source: monday, parkedId: 'parked-new', parkedAt: '13.11.2026', weekNumber: 46 });
  assert.equal(parked.status, 'parked');
  assert.equal(parked.week.Montag[0], undefined);
  assert.equal(parked.garage.length, 2);
  assert.equal(parked.garage[1].id, 'parked-new');
  assert.deepEqual(parked.garage[1].originalLesson, lesson);
  assert.notEqual(parked.garage[1].originalLesson, lesson);
  assert.deepEqual(week.Montag[0], lesson);
  const restored = restore({ week: parked.week, garage: parked.garage,
    parkedIndex: 1, parkedIdentity: 'parked-new', target: { dayIdx: 2, hourIdx: 1 }, targetWeek: 46 });
  assert.equal(restored.status, 'restored');
  assert.deepEqual(restored.week.Mittwoch[1], lesson);
  assert.notEqual(restored.week.Mittwoch[1], lesson);
  assert.equal(restored.week.Mittwoch[1].id, 'lesson-123');
  assert.equal(restored.garage.length, 1);
  assert.equal(restored.garage[0], parked.garage[0]);
  assert.deepEqual(week.Montag[0], lesson);
});

test('Parkgarage: belegtes Ziel und veraltete Drag-Identität dürfen kein Objekt entfernen', () => {
  const garage = [{ id: 'p1', fach: 'Deutsch', thema: 'Lesen', materialIds: ['x'] }];
  const week = { Montag: { 0: { fach: 'Mathematik', thema: 'Plus' } } };
  const occupied = restore({ week, garage, parkedIndex: 0, parkedIdentity: 'p1',
    target: monday, targetWeek: 46 });
  assert.equal(occupied.status, 'occupied-target');
  assert.equal(occupied.week, week);
  assert.equal(occupied.garage, garage);
  const stale = restore({ week: {}, garage, parkedIndex: 0, parkedIdentity: 'alter-id',
    target: monday, targetWeek: 46 });
  assert.equal(stale.status, 'stale-parked-item');
  assert.equal(stale.garage, garage);
  const moved = restore({ week: {}, garage, parkedIndex: 0, parkedIdentity: 'p1',
    target: monday, targetWeek: 46 });
  assert.equal(moved.status, 'restored');
  assert.equal(moved.week.Montag[0].thema, 'Lesen');
  assert.deepEqual(moved.week.Montag[0].materialIds, ['x']);
  assert.equal(moved.week.Montag[0].id, 'p1', 'existing nonparking IDs are retained');
});

test('Kinderaufgaben aus älteren Parkgaragen werden nicht an fremde Daten verschoben', () => {
  const garage = [{ id: 'parked-legacy', fach: 'Deutsch', thema: 'Lesen',
    imKinderWochenplan: true, parkedFromKW: 46, parkedFromDay: 'Montag', parkedFromHour: 0,
    originalLesson: { id: 'lesson-01', fach: 'Deutsch', thema: 'Lesen', imKinderWochenplan: true } }];
  const blocked = restore({ week: {}, garage, parkedIndex: 0, parkedIdentity: 'parked-legacy',
    target: { dayIdx: 1, hourIdx: 0 }, targetWeek: 46 });
  assert.equal(blocked.status, 'published-child-task');
  const allowed = restore({ week: {}, garage, parkedIndex: 0, parkedIdentity: 'parked-legacy',
    target: monday, targetWeek: 46 });
  assert.equal(allowed.status, 'restored');
  assert.equal(allowed.week.Montag[0].id, 'lesson-01');
});

test('Wochenplan: Drag and Parkgarage nutzen geprüfte Aktualisierung ohne direkte Quellmutation', () => {
  const s = readFileSync('src/components/WeeklyPlan.tsx', 'utf8');
  const dnd = s.slice(s.indexOf('const handleDropPlan'), s.indexOf('const actualKW'));
  assert.match(dnd, /moveOrSwapWeeklyLesson\(/);
  assert.match(dnd, /restoreParkedWeeklyLessonSafely\(/);
  assert.doesNotMatch(dnd, /currentWeekObj\[sourceData\.tag\]\[sourceData\.idx\]/);
  assert.doesNotMatch(dnd, /currentWeekObj\[targetTag\]\[targetIdx\]\s*=/);
  assert.match(s, /parkWeeklyLessonSafely\(/);
  assert.match(s, /parkedLessonIdentity/);
  assert.match(s, /sourceHasChildProgress: hasChildProgressForSlot/);
});
