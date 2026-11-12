import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const plan=readFileSync('src/components/SeatingPlan.tsx','utf8');

test('Sitzplan: Möbel-Einstellungen blockieren die Raumfläche nicht mehr',()=>{
 const workspace=plan.indexOf('data-seating-workspace');
 const sidePanel=plan.indexOf('data-seating-furniture-panel');
 const canvas=plan.indexOf('ref={planRef}',workspace);
 const end=plan.indexOf('{/* Empty State */}',canvas);
 assert.ok(workspace>=0&&sidePanel>workspace&&canvas>sidePanel);
 assert.ok(end>canvas);
 assert.match(plan, /data-seating-furniture-panel className="[^"]*overflow-y-auto/);
 assert.doesNotMatch(plan, /absolute left-6 top-1\/2 -translate-y-1\/2 w-64/);
 assert.ok(!plan.slice(canvas,end).includes('data-seating-furniture-panel'));
});

test('Sitzplan: nur eine Belegungsanzeige, direkt im externen Panel',()=>{
 const location=plan.indexOf('data-seating-desk-inspector');
 const canvas=plan.indexOf('ref={planRef}');
 assert.ok(location>0&&location<canvas);
 assert.equal(plan.split('data-seating-desk-inspector').length-1,1);
 assert.match(plan, /getStudentsOnTable\(selectedObj, sitzplan_schueler\)\.map\(studentId =>/);
 assert.match(plan, /child\.vorname/);
 assert.match(plan, /Dieser Tisch ist leer\. Andere Tische bleiben unverändert/);
 assert.doesNotMatch(plan, /-top-14\}\s*left-1\/2 -translate-x-1\/2 flex items-center gap-1 bg-white shadow-xl/);
});

test('Sitzplan: Sitzplatz- und Möbelpanel ersetzen sich ohne Datenänderungen',()=>{
 assert.match(plan, /showSeatDock && !selectedObjId && \(/);
 assert.match(plan, /editMode && !presentationMode && selectedObjId && \(\(\) =>/);
 assert.match(plan, /aria-expanded=\{showSeatDock && !selectedObjId\}/);
 assert.match(plan, /if \(selectedObjId\) \{\s*setSelectedObjId\(null\);\s*setShowSeatDock\(true\)/);
 assert.match(plan, /\[selectedObjId\]\);/);
 assert.match(plan, /setRefitSavedLayoutSignal\(value => value \+ 1\)/);
});

test('Sitzplan: Umsetzen an Tisch bleibt eine ausdrückliche Aktion',()=>{
 assert.match(plan,/disabled=\{!findDeskSeatForStudent\(selectedSeatStudent\.id, selectedObj\)\}/);
 assert.match(plan,/onClick=\{\(\) => placeStudentAtSelectedDesk\(selectedSeatStudent\.id, selectedObj\.id\)\}/);
 assert.match(plan,/if \(!vacantSeat\) return/);
 assert.match(plan,/updatePosition\(studentId, vacantSeat\.x, vacantSeat\.y\)/);
 assert.match(plan,/pushState\(\)/);
});
