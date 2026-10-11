import test from 'node:test';
import assert from 'node:assert/strict';
import { CalmAudioEngine, sanitizeCalmSettings } from './calmFocusEngine';

test('active bird changes reach already scheduled synthesis and completed timers do not accumulate', t => {
  const pending = new Map<number, { callback: () => void; delay: number }>();
  let nextId = 0, oscillators = 0, closed = false;
  t.mock.method(globalThis,'setTimeout',((callback: () => void,delay: number) => {
    const id = ++nextId; pending.set(id,{callback,delay}); return id;
  }) as any);
  t.mock.method(globalThis,'clearTimeout',((id: number) => pending.delete(id)) as any);
  const parameter = () => ({setValueAtTime(){},exponentialRampToValueAtTime(){}});
  const node = () => ({connect(target: unknown){return target;},disconnect(){},start(){},stop(){},
    frequency:parameter(),gain:parameter(),Q:parameter()});
  class Context {
    sampleRate = 10; currentTime = 0; state = 'running'; destination = {};
    createGain(){return node();} createBiquadFilter(){return node();}
    createOscillator(){oscillators++; return node();} createBufferSource(){return node();}
    createBuffer(_channels: number,length: number){return {getChannelData:()=>new Float32Array(length)};}
    close(){closed=true;this.state='closed';return Promise.resolve();}
  }
  const previous = (globalThis as any).window;
  (globalThis as any).window = {AudioContext:Context};
  const engine = new CalmAudioEngine();
  const settings = sanitizeCalmSettings({activeTracks:{rain:false,wind:false,fire:false,birds:false,stream:false}});
  const runBird = () => {
    const entry = Array.from(pending).find(([,task])=>task.delay>=3000)!;
    assert.ok(entry);pending.delete(entry[0]);entry[1].callback();
  };
  try {
    assert.equal(engine.start(settings),true);const baseline=oscillators;
    engine.updateVolumes({...settings,activeTracks:{...settings.activeTracks,birds:true}});
    runBird();assert.ok(oscillators>baseline,'newly enabled birds must synthesize without restarting');
    engine.updateVolumes(settings);const afterEnable=oscillators;
    for(let i=0;i<100;i++)runBird();
    assert.equal(oscillators,afterEnable,'disabled birds must stop subsequent chirps');
    assert.equal(pending.size,3,'only one outstanding timer per episodic track');
    engine.stop();assert.equal(pending.size,0);assert.equal(closed,true);
  } finally {engine.stop();(globalThis as any).window=previous;}
});

test('damaged audio volumes cannot send non-finite gain values to Web Audio', () => {
  const settings=sanitizeCalmSettings({masterVolume:NaN,volumes:{rain:NaN,wind:Infinity,fire:-10}});
  assert.equal(settings.masterVolume,70);assert.equal(settings.volumes.rain,50);
  assert.equal(settings.volumes.wind,30);assert.equal(settings.volumes.fire,0);
});
