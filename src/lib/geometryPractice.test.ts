import test from 'node:test';
import assert from 'node:assert/strict';
import { GEOMETRY_FIGURES, projectSolid, DIVISIBILITY_RULES, generateDivisibilityPool, estimatePresets, initialEstimate } from './geometryPractice';

test('every displayed solid has the correct topology, including one tetrahedron apex', () => {
  const expected = [[4,6,4],[8,12,6],[10,15,7],[12,18,8]];
  GEOMETRY_FIGURES.forEach(({ solid }, i) => {
    assert.deepEqual([solid.vertices.length, solid.edges.length, solid.faces], expected[i]);
    assert.equal(solid.vertices.length - solid.edges.length + solid.faces, 2);
    const edges = new Set(solid.edges.map(([a,b]) => [a,b].sort((x,y)=>x-y).join('-')));
    assert.equal(edges.size, solid.edges.length);
    for(const [a,b] of solid.edges) { assert.notEqual(a,b); assert.ok(solid.vertices[a] && solid.vertices[b]); }
    for(const angle of [-45,0,28,45])for(const p of projectSolid(solid.vertices,angle))assert.ok(p.x>0 && p.x<200 && p.y>0 && p.y<200);
  });
});

test('robot rounds always contain three fitting and three nonfitting unique numbers without retry loops', () => {
  for(const rule of DIVISIBILITY_RULES)for(const max of [40,120,300])for(const random of [()=>0,()=>.5,()=>.999999,Math.random]) {
    for(let i=0;i<20;i++) {
      const values=generateDivisibilityPool(rule,max,random);
      assert.equal(values.length,6);assert.equal(new Set(values).size,6);
      assert.equal(values.filter(n=>n%rule===0).length,3);
      assert.ok(values.every(n=>Number.isInteger(n)&&n>=1&&n<=max));
    }
  }
});

test('estimate start is independent of hidden quantity and presets cover all ranges without duplicates', () => {
  for(const [min,max,step] of [[10,25,1],[25,60,5],[60,120,5]]) {
    const values=estimatePresets(min,max,step);
    assert.equal(new Set(values).size,4);assert.equal(values[0],min);assert.equal(values[3],max);
    assert.ok(values.every(n=>n>=min&&n<=max));
    assert.ok(Math.abs(initialEstimate(min,max,step)-(min+max)/2)<=step/2);
  }
});
