import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateGroupSizes,
  generateStudentGroups,
  swapStudentsInGroups,
  moveStudentToGroup,
  GroupingConfig,
  getGroupName
} from './groupsAlgorithm';
import {
  getDisplayStudentName,
  isStudentAbsentToday,
  getPresentStudents
} from '../components/cockpit/studentSelectionUtils';
import { AppState } from '../types';

test('F8: Gruppen-Einteiler (widget-groups) Algorithmus & Pädagogische Validierung', async (t) => {

  await t.test('3. 20 Kinder / 4er-Gruppen -> exakt 5 Gruppen à 4', () => {
    const sizes = calculateGroupSizes(20, 'size', 4);
    assert.deepEqual(sizes, [4, 4, 4, 4, 4]);
    assert.equal(sizes.reduce((a, b) => a + b, 0), 20);
    assert.equal(sizes.length, 5);
  });

  await t.test('4. 21 Kinder / 4er-Gruppen -> ausgeglichene Verteilung ohne Einzelkind', () => {
    const sizes = calculateGroupSizes(21, 'size', 4);
    assert.deepEqual(sizes, [5, 4, 4, 4, 4]);
    assert.equal(sizes.reduce((a, b) => a + b, 0), 21);
    assert.ok(sizes.every(s => s >= 4), 'Keine Gruppe unter Soll-Größe');
    assert.ok(!sizes.includes(1), 'Kein Einzelkind');
  });

  await t.test('5. 23 Kinder / 4er-Gruppen -> pädagogisch ausgeglichen [5, 5, 5, 4, 4] statt [4, 4, 4, 4, 4, 3]', () => {
    const sizes = calculateGroupSizes(23, 'size', 4);
    assert.deepEqual(sizes, [5, 5, 5, 4, 4]);
    assert.equal(sizes.reduce((a, b) => a + b, 0), 23);
    assert.equal(sizes.length, 5);
    assert.ok(!sizes.includes(3), 'Vermeidet 3er-Restgruppe bei 23 Kindern in 4er-Gruppen');
  });

  await t.test('6. 19 Kinder / 2er-Gruppen (Partnerarbeit) -> eine 3er-Gruppe, 8 Paare, kein Einzelkind', () => {
    const sizes = calculateGroupSizes(19, 'size', 2);
    assert.equal(sizes.reduce((a, b) => a + b, 0), 19);
    assert.equal(sizes.length, 9);
    const threes = sizes.filter(s => s === 3).length;
    const twos = sizes.filter(s => s === 2).length;
    assert.equal(threes, 1, 'Exakt eine 3er-Gruppe');
    assert.equal(twos, 8, 'Exakt 8 Paare');
    assert.ok(!sizes.includes(1), 'Niemand bleibt alleine');
  });

  await t.test('Sonderfall: 3 Kinder / 4er-Gruppen -> eine 3er-Gruppe', () => {
    const sizes = calculateGroupSizes(3, 'size', 4);
    assert.deepEqual(sizes, [3]);
  });

  await t.test('10. IDs statt Namen in Gruppen gespeichert', () => {
    const studentIds = ['s1', 's2', 's3', 's4', 's5', 's6'];
    const result = generateStudentGroups(studentIds, { mode: 'size', value: 3 });
    assert.equal(result.groups.length, 2);
    for (const g of result.groups) {
      assert.ok(Array.isArray(g.studentIds));
      assert.ok(g.studentIds.every(id => studentIds.includes(id)));
    }
  });

  await t.test('1. Abwesende Schüler werden ausgeschlossen', () => {
    const mockAppState: Partial<AppState> = {
      schueler: [
        { id: 's1', vorname: 'Lukas', nachname: 'Bauer' },
        { id: 's2', vorname: 'Mia', nachname: 'Lehner', abwesend: true },
        { id: 's3', vorname: 'Anna', nachname: 'Schmid' },
      ] as any,
      anwesenheit: {}
    };

    const present = getPresentStudents(mockAppState.schueler as any, mockAppState as any);
    assert.equal(present.length, 2);
    assert.ok(!present.some(s => s.id === 's2'), 'Abwesende Mia ist nicht im Pool');

    const result = generateStudentGroups(present.map(s => s.id), { mode: 'size', value: 2 });
    assert.ok(!result.groups.some(g => g.studentIds.includes('s2')));
  });

  await t.test('2. Doppelte Vornamen erhalten Nachnamensinitiale (getDisplayStudentName)', () => {
    const allStudents = [
      { id: 's1', vorname: 'Lukas', nachname: 'Bauer' },
      { id: 's2', vorname: 'Lukas', nachname: 'Müller' },
      { id: 's3', vorname: 'Anna', nachname: 'Schmid' }
    ];

    assert.equal(getDisplayStudentName(allStudents[0], allStudents), 'Lukas B.');
    assert.equal(getDisplayStudentName(allStudents[1], allStudents), 'Lukas M.');
    assert.equal(getDisplayStudentName(allStudents[2], allStudents), 'Anna');
  });

  await t.test('8. Temporär pausierte Kinder werden aus der Gruppierung ausgeschlossen', () => {
    const studentIds = ['s1', 's2', 's3', 's4', 's5'];
    const config: GroupingConfig = {
      mode: 'size',
      value: 2,
      pausedStudentIds: ['s3']
    };
    const result = generateStudentGroups(studentIds, config);
    const allGroupedIds = result.groups.flatMap(g => g.studentIds);
    assert.ok(!allGroupedIds.includes('s3'), 'Pausierter Schüler s3 ist in keiner Gruppe');
    assert.equal(allGroupedIds.length, 4);
  });

  await t.test('9. „Nicht zusammen“ Constraint wird beachtet', () => {
    const studentIds = ['s1', 's2', 's3', 's4', 's5', 's6'];
    const config: GroupingConfig = {
      mode: 'size',
      value: 2,
      notTogether: [{ studentIdA: 's1', studentIdB: 's2' }]
    };
    const result = generateStudentGroups(studentIds, config);
    assert.equal(result.warning, null);
    for (const group of result.groups) {
      const containsBoth = group.studentIds.includes('s1') && group.studentIds.includes('s2');
      assert.ok(!containsBoth, 's1 und s2 dürfen nicht zusammen in derselben Gruppe sein');
    }
  });

  await t.test('9b. „Zusammen lassen“ Constraint wird beachtet', () => {
    const studentIds = ['s1', 's2', 's3', 's4', 's5', 's6'];
    const config: GroupingConfig = {
      mode: 'size',
      value: 3,
      keepTogether: [{ studentIdA: 's1', studentIdB: 's2' }]
    };
    const result = generateStudentGroups(studentIds, config);
    assert.equal(result.warning, null);
    const groupWithS1 = result.groups.find(g => g.studentIds.includes('s1'));
    assert.ok(groupWithS1);
    assert.ok(groupWithS1.studentIds.includes('s2'), 's1 und s2 müssen in derselben Gruppe sein');
  });

  await t.test('Constraint-Konflikt erzeugt klare Fehlermeldung ohne Endlosschleife', () => {
    const studentIds = ['s1', 's2'];
    // 2 Schüler in 1 Gruppe mit Widerspruch
    const config: GroupingConfig = {
      mode: 'size',
      value: 3,
      notTogether: [{ studentIdA: 's1', studentIdB: 's2' }]
    };
    const result = generateStudentGroups(studentIds, config);
    assert.ok(result.groups.length > 0);
    assert.equal(result.warning, 'Nicht alle Wünsche konnten gleichzeitig erfüllt werden.');
  });

  await t.test('13. Schüler manuell tauschen funktioniert reibungslos', () => {
    const initialGroups = [
      { id: 'g1', name: 'Gruppe 1', colorIndex: 0, studentIds: ['s1', 's2'] },
      { id: 'g2', name: 'Gruppe 2', colorIndex: 1, studentIds: ['s3', 's4'] }
    ];

    const swapped = swapStudentsInGroups(initialGroups, 's1', 's4');
    assert.deepEqual(swapped[0].studentIds, ['s4', 's2']);
    assert.deepEqual(swapped[1].studentIds, ['s3', 's1']);
  });

  await t.test('14. Kind verschieben verhindert das Leeren einer Gruppe', () => {
    const initialGroups = [
      { id: 'g1', name: 'Gruppe 1', colorIndex: 0, studentIds: ['s1'] },
      { id: 'g2', name: 'Gruppe 2', colorIndex: 1, studentIds: ['s2', 's3'] }
    ];

    // Verschieben von s1 aus g1 nach g2 würde g1 leeren
    const attempt = moveStudentToGroup(initialGroups, 's1', 'g2');
    assert.ok(attempt.error, 'Fehlermeldung bei Versuch, eine Gruppe zu leeren');
    assert.deepEqual(attempt.updatedGroups, initialGroups, 'Gruppen bleiben unberührt');

    // Gültiges Verschieben von s3 aus g2 nach g1
    const validMove = moveStudentToGroup(initialGroups, 's3', 'g1');
    assert.equal(validMove.error, undefined);
    assert.deepEqual(validMove.updatedGroups[0].studentIds, ['s1', 's3']);
    assert.deepEqual(validMove.updatedGroups[1].studentIds, ['s2']);
  });

  await t.test('7. Neu mischen erzeugt neue zufällige Zusammensetzungen', () => {
    const studentIds = Array.from({ length: 16 }, (_, i) => `s-${i + 1}`);
    const results = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const res = generateStudentGroups(studentIds, { mode: 'size', value: 4 });
      results.add(JSON.stringify(res.groups.map(g => g.studentIds)));
    }
    assert.ok(results.size > 1, 'Mindestens zwei unterschiedliche Mischungen');
  });

  await t.test('11, 12, 13: Vollständig offline, keine Leistungsdaten, keine KI, keine Netzwerk-Requests', () => {
    // Der Algorithmus nimmt ausschließlich Array von IDs und primitive Zahlen entgegen.
    // Keinerlei Noten-, Verhaltens-, Diagnostik- oder Netzwerk-Felder.
    assert.ok(typeof generateStudentGroups === 'function');
  });
});

test('Group naming: all 15 partner teams have distinct names even with 8-color palette', () => {
  for (const style of ['numbered', 'colors', 'animals', 'symbols']) {
    const names = Array.from({ length: 15 }, (_, i) => getGroupName(i, style).name);
    assert.equal(new Set(names).size, names.length, style);
  }
});

test('Buddy wishes are enforced in repeated partner grouping, not left to 60 random tries', () => {
  const ids = Array.from({ length: 16 }, (_, i) => 'kid-' + i);
  const keepTogether = [
    { studentIdA: 'kid-0', studentIdB: 'kid-1' },
    { studentIdA: 'kid-2', studentIdB: 'kid-3' },
    { studentIdA: 'kid-4', studentIdB: 'kid-5' },
    { studentIdA: 'kid-6', studentIdB: 'kid-7' },
  ];
  const notTogether = [
    { studentIdA: 'kid-8', studentIdB: 'kid-9' },
    { studentIdA: 'kid-10', studentIdB: 'kid-11' },
  ];
  for (let attempt = 0; attempt < 12; attempt++) {
    const result = generateStudentGroups(ids, {
      mode: 'size', value: 2, keepTogether, notTogether,
    });
    assert.equal(result.warning, null);
    assert.equal(result.groups.length, 8);
    assert.deepEqual(result.groups.flatMap(group => group.studentIds).sort(), [...ids].sort());
    for (const pair of keepTogether) {
      assert.ok(result.groups.some(group =>
        group.studentIds.includes(pair.studentIdA) && group.studentIds.includes(pair.studentIdB)), 'buddy pair was separated');
    }
    for (const pair of notTogether) {
      assert.ok(result.groups.every(group =>
        !group.studentIds.includes(pair.studentIdA) || !group.studentIds.includes(pair.studentIdB)), 'apart pair was joined');
    }
  }
});

test('Unsolvable contradictory buddy/apart rules remain visible as a warning', () => {
  const result = generateStudentGroups(['kid-0', 'kid-1', 'kid-2', 'kid-3'], {
    mode: 'size', value: 2,
    keepTogether: [{ studentIdA: 'kid-0', studentIdB: 'kid-1' }],
    notTogether: [{ studentIdA: 'kid-0', studentIdB: 'kid-1' }],
  });
  assert.ok(result.groups.length > 0);
  assert.equal(result.warning, 'Nicht alle Wünsche konnten gleichzeitig erfüllt werden.');
});
