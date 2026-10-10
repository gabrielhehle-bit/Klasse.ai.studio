import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mixPaint, matchesPaintRecipe, COLOR_TASKS, shiftClock, clockAngles, CLOCK_TASKS, WEATHER_TASKS, checkWeather, SYMMETRY_PUZZLES, mirroredGrid, CLASSROOM_RIDDLES } from './practiceLearningModel';

test('Malfarben show actual secondary colors instead of RGB gray averages',()=>{
 assert.deepEqual(mixPaint(['yellow','blue']),{name:'Grün',hex:'#16a34a'});
 assert.deepEqual(mixPaint(['red','yellow']),{name:'Orange',hex:'#f97316'});
 assert.deepEqual(mixPaint(['red','blue']),{name:'Violett',hex:'#9333ea'});
 assert.equal(mixPaint(['red','yellow','blue']).name,'Braun');
 assert.equal(mixPaint(['red','white']).name,'Rosa');
 for(const task of COLOR_TASKS){assert.ok(matchesPaintRecipe(task.recipe,task.recipe));assert.equal(mixPaint(task.recipe).name,task.name);}
 assert.ok(!matchesPaintRecipe(['yellow','blue','white'],COLOR_TASKS[0].recipe));
 assert.ok(!matchesPaintRecipe(['yellow'],COLOR_TASKS[0].recipe));
 assert.deepEqual(mixPaint(['yellow','blue']),mixPaint(['blue','yellow','blue','yellow']));
});
test('Clock crossing carries minutes in both directions and handles twelve correctly',()=>{
 assert.deepEqual(shiftClock(11,55,5),{hour:12,minute:0});
 assert.deepEqual(shiftClock(12,0,-5),{hour:11,minute:55});
 assert.deepEqual(shiftClock(12,55,5),{hour:1,minute:0});
 assert.deepEqual(clockAngles(4,30),{hour:135,minute:180});
 assert.deepEqual(CLOCK_TASKS.map(t=>[t.hour,t.minute]),[[3,0],[4,30],[11,45],[9,15],[10,10]]);
 for(let m=0;m<720;m++)for(const delta of [-60,-5,5,60]){const h=Math.floor(m/60)||12,p=m%60,next=shiftClock(h,p,delta);assert.deepEqual(shiftClock(next.hour,next.minute,-delta),{hour:h,minute:p});}
});
test('Thunderstorm task accepts substantial shelter and rejects umbrella, trees and open huts',()=>{
 const storm=WEATHER_TASKS.findIndex(t=>t.id==='tempest');
 assert.ok(checkWeather(storm,['shelter']).correct);
 for(const choice of ['umbrella','tree','shed','jacke','schirm'])assert.ok(!checkWeather(storm,[choice]).correct);
 assert.match(WEATHER_TASKS[storm].explanation,/festes Gebäude/);
 const rain=WEATHER_TASKS.findIndex(t=>t.id==='rain');
 assert.ok(checkWeather(rain,['jacke','stiefel']).correct);
 assert.ok(checkWeather(rain,['jacke','stiefel','schirm']).correct);
 assert.ok(!checkWeather(rain,['winterjacke','stiefel']).correct);
 for(let i=0;i<WEATHER_TASKS.length;i++)assert.ok(checkWeather(i,WEATHER_TASKS[i].required).correct);
});
test('Vertical reflection and half-turn differ on a non-square asymmetric pattern',()=>{
 const pattern=[[1,2,0],[3,0,4]];
 assert.deepEqual(mirroredGrid(pattern,'classic'),[[0,2,1],[4,0,3]]);
 assert.deepEqual(mirroredGrid(pattern,'rotate'),[[4,0,3],[0,2,1]]);
 assert.deepEqual(mirroredGrid(pattern,'swap'),[[0,1,2],[3,0,4]]);
 for(const puzzle of SYMMETRY_PUZZLES){assert.equal(puzzle.presets.length,puzzle.rows);for(const row of puzzle.presets){assert.equal(row.length,puzzle.size);assert.ok(row.every(x=>Number.isInteger(x)&&x>=0&&x<=6));}for(const mode of ['classic','rotate','swap'] as const)assert.deepEqual(mirroredGrid(mirroredGrid(puzzle.presets,mode),mode),puzzle.presets);}
 assert.equal(SYMMETRY_PUZZLES.length,15);
});
test('Local riddles are complete, distinct and omit the old malformed Kohlkopf answer',()=>{
 assert.equal(new Set(CLASSROOM_RIDDLES.map(r=>r.q)).size,CLASSROOM_RIDDLES.length);
 for(const r of CLASSROOM_RIDDLES){assert.ok(r.q.trim()&&r.a.trim()&&r.hint.trim());assert.doesNotMatch(r.a,/Salatstadt/);}
 assert.equal(CLASSROOM_RIDDLES.find(r=>r.q.includes('Garten'))?.a,'Ein Kohlkopf');
});
