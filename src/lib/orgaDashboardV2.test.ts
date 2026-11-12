import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  getOrgaDueGroup, summarizeCollectionPayments,
} from './orgaData';

const source = readFileSync('src/components/OrgaLists.tsx','utf8');

test('Kasse & Orga: Teilzahlungen zählen in den echten Zahlungseingang',()=>{
  const collection: any={ betrag:15, betraege:{a:15,b:7.5,c:0},
    status:{a:'offen',b:'offen',c:'bezahlt'} }; // Stale statuses must not override actual payments
  const snapshot=JSON.stringify(collection);
  const summary=summarizeCollectionPayments(collection,['a','b','c']);
  assert.deepEqual(summary,{
    total:3,fullyPaid:1,partlyPaid:1,unpaid:1,outstandingChildren:2,
    collected:22.5,outstanding:22.5,expected:45,percentCollected:50,
  });
  assert.equal(JSON.stringify(collection),snapshot);
});

test('Kasse & Orga: Dezimalbeträge sind centgenau und überzahlte Beträge ändern die Darstellung nicht',()=>{
  const summary=summarizeCollectionPayments({betrag:0.3,betraege:{a:0.1+0.2,b:0.1}} as any,['a','b']);
  assert.equal(summary.collected,0.4);
  assert.equal(summary.outstanding,0.2);
  assert.equal(summary.fullyPaid,1);
  assert.equal(summary.partlyPaid,1);
  assert.equal(summary.outstandingChildren,1);
});

test('Kasse & Orga: Diese Woche bedeutet Montag bis Sonntag, Überfälliges wird gesondert geführt',()=>{
  const today='2026-11-12'; // Donnerstag in Feldkirch
  assert.equal(getOrgaDueGroup('2026-11-11',today),'overdue');
  assert.equal(getOrgaDueGroup('2026-11-09',today),'overdue');
  assert.equal(getOrgaDueGroup('2026-11-12',today),'thisWeek');
  assert.equal(getOrgaDueGroup('2026-11-15',today),'thisWeek');
  assert.equal(getOrgaDueGroup('2026-11-16',today),'later');
  assert.equal(getOrgaDueGroup('2026-11-08',today),'overdue');
  assert.equal(getOrgaDueGroup(undefined,today),'undated');
  assert.equal(getOrgaDueGroup('2026-02-30',today),'undated');
});

test('Kasse & Orga: echte Wochenkennzahlen und Zugriff auf alle Checklisten',()=>{
  assert.match(source,/const thisWeekCount = dueThisWeekChecklisten\.length \+ dueThisWeekCollections\.length/);
  assert.match(source,/const overdueCount = overdueChecklisten\.length \+ overdueCollections\.length/);
  assert.match(source,/getOrgaDueGroup\(c\.datum, todayOrgaKey\)/);
  assert.match(source,/getOrgaDueGroup\(s\.faelligkeit, todayOrgaKey\)/);
  assert.match(source,/data-orga-week-empty/);
  assert.match(source,/data-orga-week-items/);
  assert.match(source,/data-orga-other-checklists/);
  assert.match(source,/Alle Ausflüge & Checklisten öffnen/);
  assert.doesNotMatch(source,/activeSammlungen\.filter\(s => s\.faelligkeit\)\.length \+ activeChecklisten\.length/);
});

test('Kasse & Orga: verlässliche Fachinformation statt irreführender Vollbezahlt-Statusflags',()=>{
  assert.match(source,/const summary = summarizeCollectionPayments\(s, students\.map\(st => st\.id\)\)/);
  assert.match(source,/aria-valuenow=\{Math\.round\(summary\.percentCollected\)\}/);
  assert.match(source,/summary\.partlyPaid/);
  assert.match(source,/formatEuro\(summary\.collected\)/);
  assert.match(source,/Gebuchtes Geld, ohne offene Forderungen/);
  assert.match(source,/getCollectionPaymentStatus\(currentSammlung\.betraege\?\.\[st\.id\] \|\| 0, currentSammlung\.betrag\)/);
  assert.doesNotMatch(source,/const paidCount = students\.filter\(st => \(s\.status\[st\.id\]/);
});

test('Kasse & Orga: einzelne Zahlung ist klar beschriftet und Rückbuchung wird bestätigt',()=>{
  assert.match(source,/Rest \{formatEuro\(currentSammlung\.betrag - paidAmount\)\} buchen/);
  assert.match(source,/erhalten buchen<\/span>/);
  assert.match(source,/Bezahlt · Korrigieren/);
  assert.match(source,/Zahlung von \$\{formatEuro\(amountBefore\)\}/);
  assert.match(source,/Gegenbuchungseintrag erstellt/);
});

test('Kasse & Orga: Sammelbuchung ist bewusst und betragsgenau zu bestätigen',()=>{
  assert.match(source,/if \(summary\.outstandingChildren === 0\) return/);
  assert.match(source,/window\.confirm\(/);
  assert.match(source,/summary\.outstandingChildren/);
  assert.match(source,/formatEuro\(summary\.outstanding\)/);
  assert.match(source,/Dieser Vorgang erstellt Kassenbuch-Einträge/);
  assert.match(source,/markCollectionPaidForStudents\(/);
  assert.equal(source.split('onClick={() => markAllPaidForSammlung(s.id)}').length-1,0);
  assert.match(source,/onClick=\{\(\) => markAllPaidForSammlung\(currentSammlung\.id\)\}/);
});
