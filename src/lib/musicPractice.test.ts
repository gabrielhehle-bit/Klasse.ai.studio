import test from 'node:test';
import assert from 'node:assert/strict';
import {GUITAR_STRINGS,memoryDeck,judgeRhythmTap,estimatePitch,centsBetween,nearestGuitarString} from './musicPractice';
test('every memory size has exactly two of each pitch and unique card identities',()=>{
 for(const count of [4,6,8,12,16]){const deck=memoryDeck(count,()=>0);assert.equal(deck.length,count);assert.equal(new Set(deck.map(c=>c.id)).size,count);for(const freq of new Set(deck.map(c=>c.freq)))assert.equal(deck.filter(c=>c.freq===freq).length,2);}
});
test('rhythm timing rewards one tap per beat, rejects offbeat and rest taps',()=>{
 const seq=['stomp','slap','clap','rest'];assert.equal(judgeRhythmTap(40,120,seq,-1).status,'hit');assert.equal(judgeRhythmTap(40,120,seq,0).status,'duplicate');assert.equal(judgeRhythmTap(240,120,seq,-1).status,'offbeat');assert.equal(judgeRhythmTap(1520,120,seq,-1).status,'rest');assert.equal(judgeRhythmTap(3020,120,['stomp','rest','slap'],-1).beat,6);
});
test('pitch detector resolves all guitar strings at actual sample rates and detuning',()=>{
 for(const rate of [44100,48000])for(const string of GUITAR_STRINGS)for(const cents of [-30,0,30]){
  const freq=string.freq*2**(cents/1200);const data=Float32Array.from({length:4096},(_,i)=>0.25*Math.sin(2*Math.PI*freq*i/rate));const measured=estimatePitch(data,rate);assert.ok(measured);assert.ok(Math.abs(centsBetween(measured!,freq))<1);assert.equal(nearestGuitarString(measured!),GUITAR_STRINGS.indexOf(string));
 }
 assert.equal(estimatePitch(new Float32Array(4096),48000),null);assert.equal(estimatePitch(new Float32Array(4096).fill(NaN),48000),null);assert.equal(estimatePitch(new Float32Array(4096),0),null);
});
