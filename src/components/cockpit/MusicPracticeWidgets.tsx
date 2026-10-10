import React,{useState,useEffect,useRef} from 'react';
import {readWidgetLifecycleState,usePersistedWidgetLifecycleState} from '../../lib/widgetLifecycleState';
import {GUITAR_STRINGS,memoryDeck,judgeRhythmTap,estimatePitch,centsBetween,nearestGuitarString} from '../../lib/musicPractice';
type Props={widget:any;currentIsLight:boolean;onUpdate?:(updates:any)=>void};
const button='min-h-11 min-w-11 px-3 rounded-xl border border-slate-300 dark:border-slate-600 font-bold text-sm aria-pressed:bg-accent aria-pressed:text-accent-text';
const root='h-full w-full p-2 flex flex-col gap-2 overflow-hidden select-none';
function useTone(){
 const contexts=useRef(new Set<AudioContext>());
 useEffect(()=>()=>{for(const ctx of contexts.current)void ctx.close().catch(()=>{});contexts.current.clear();},[]);
 return (freq:number,wave:OscillatorType='sine',duration=0.35)=>{
  const C=window.AudioContext||(window as any).webkitAudioContext;if(!C)return;
  const ctx:AudioContext=new C();contexts.current.add(ctx);const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=wave;osc.frequency.setValueAtTime(freq,ctx.currentTime);gain.gain.setValueAtTime(0.1,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+duration);osc.connect(gain).connect(ctx.destination);osc.onended=()=>{contexts.current.delete(ctx);void ctx.close().catch(()=>{});};osc.start();osc.stop(ctx.currentTime+duration);
 };
}
function useMemoryTone(){
 const contexts=useRef(new Set<AudioContext>());
 useEffect(()=>()=>{for(const ctx of contexts.current)void ctx.close().catch(()=>{});contexts.current.clear();},[]);
 return (freq:number,instrument:string)=>{
  const ctx=new AudioContext();contexts.current.add(ctx);const osc=ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();
  const duration=instrument==='piano'?1.2:instrument==='flute'?0.85:instrument==='guitar'?0.9:instrument==='retro'?0.3:0.5;
  osc.type=instrument==='retro'?'square':instrument==='piano'||instrument==='guitar'?'triangle':'sine';osc.frequency.setValueAtTime(freq,ctx.currentTime);
  filter.type='lowpass';filter.frequency.setValueAtTime(instrument==='guitar'?1800:10000,ctx.currentTime);if(instrument==='guitar')filter.frequency.exponentialRampToValueAtTime(180,ctx.currentTime+duration);
  gain.gain.setValueAtTime(0.001,ctx.currentTime);gain.gain.linearRampToValueAtTime(instrument==='retro'?0.04:0.12,ctx.currentTime+(instrument==='flute'?0.08:0.005));gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+duration);
  osc.connect(filter).connect(gain).connect(ctx.destination);
  if(instrument==='xylophone'||instrument==='piano'){const partial=ctx.createOscillator(),partialGain=ctx.createGain();partial.frequency.setValueAtTime(freq*(instrument==='xylophone'?3:2),ctx.currentTime);partialGain.gain.setValueAtTime(0.035,ctx.currentTime);partialGain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+(instrument==='xylophone'?0.08:duration));partial.connect(partialGain).connect(ctx.destination);partial.start();partial.stop(ctx.currentTime+duration);}
  osc.onended=()=>{contexts.current.delete(ctx);void ctx.close().catch(()=>{});};osc.start();osc.stop(ctx.currentTime+duration);
 };
}
export function SoundmemoryWidgetContent({widget,onUpdate}:Props){
 const saved=readWidgetLifecycleState(widget,'soundmemory',{difficulty:6,cards:memoryDeck(6),selected:[] as number[],instrument:'xylophone',feedback:'Höre zwei Karten an und finde gleiche Tonhöhen.'});
 const [difficulty,setDifficulty]=useState(saved.difficulty),[cards,setCards]=useState(saved.cards),[selected,setSelected]=useState(saved.selected),[instrument,setInstrument]=useState(saved.instrument),[feedback,setFeedback]=useState(saved.feedback);
 usePersistedWidgetLifecycleState(widget,onUpdate,'soundmemory',{difficulty,cards,selected,instrument,feedback});
 const tone=useMemoryTone(),selectionRef=useRef(selected);selectionRef.current=selected;
 const reset=(count=difficulty)=>{setDifficulty(count);setCards(memoryDeck(count));setSelected([]);selectionRef.current=[];setFeedback('Höre zwei Karten an und finde gleiche Tonhöhen.');};
 const tap=(id:number)=>{
  const card=cards.find(c=>c.id===id);if(!card||card.matched||selectionRef.current.includes(id)||selectionRef.current.length===2)return;
  tone(card.freq,instrument);const next=[...selectionRef.current,id];selectionRef.current=next;setSelected(next);
  if(next.length===2){const first=cards.find(c=>c.id===next[0])!;if(first.freq===card.freq){setCards(prev=>prev.map(c=>next.includes(c.id)?{...c,matched:true}:c));setSelected([]);selectionRef.current=[];setFeedback('Klangpaar gefunden!');}else setFeedback('Diese Tonhöhen sind verschieden. Merke dir die Karten und wähle Weiter.');}
 };
 const matched=cards.filter(c=>c.matched).length;
 return <div data-practice-root className={root}>
  <div className="flex gap-2 items-center justify-between"><span className="text-sm font-bold">Gleiche Tonhöhen finden</span><button className={button} onClick={()=>reset()}>Mischen 🔁</button></div>
  <div className="flex gap-2 justify-center">{[4,6,8,12,16].map(n=><button key={n} className={button} aria-pressed={difficulty===n} onClick={()=>{if(n!==difficulty)reset(n);}}>{n} Karten</button>)}</div>
  <label className="flex items-center gap-2 justify-center text-sm font-bold">Klangfarbe <select aria-label="Memory-Klangfarbe" className={button} value={instrument} onChange={e=>setInstrument(e.target.value)}>{[['xylophone','Xylophon'],['piano','Klavier'],['flute','Flöte'],['guitar','Gitarre'],['retro','Retro']].map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
  <div className="flex-1 min-h-0 grid grid-cols-4 gap-2">{cards.map((c,i)=><button key={c.id} data-memory-card={i+1} className={button+' '+(c.matched?'bg-emerald-100 text-emerald-800':'')} disabled={c.matched||selected.length===2} aria-label={'Klangkarte '+(i+1)} aria-pressed={selected.includes(c.id)} onClick={()=>tap(c.id)}>{c.matched?'✓':selected.includes(c.id)?'♫':i+1}</button>)}</div>
  <div className="flex gap-2 items-center pr-11"><p role="status" className="flex-1 text-sm font-bold">{matched===cards.length?'Alle Klangpaare gefunden!':feedback} · {matched/2}/{cards.length/2} Paare</p><button className={button} disabled={selected.length!==2} onClick={()=>{selectionRef.current=[];setSelected([]);setFeedback('Höre zwei weitere Karten an.');}}>Weiter</button></div>
 </div>;
}
export function RhythmWidgetContent({widget,onUpdate}:Props){
 const saved=readWidgetLifecycleState(widget,'rhythm',{bpm:90,timeSignature:'4_4',numBars:1,sequence:['stomp','slap','clap','rest','stomp','slap','clap','rest'],isMuted:false,streak:0,rating:'Starte den Rhythmus und klopfe im Takt.'});
 const [bpm,setBpm]=useState(saved.bpm),[timeSignature,setTimeSignature]=useState(saved.timeSignature),[numBars,setNumBars]=useState(saved.numBars),[sequence,setSequence]=useState(saved.sequence),[isMuted,setIsMuted]=useState(saved.isMuted),[streak,setStreak]=useState(saved.streak),[rating,setRating]=useState(saved.rating),[isPlaying,setIsPlaying]=useState(false),[currentStep,setCurrentStep]=useState(0);
 usePersistedWidgetLifecycleState(widget,onUpdate,'rhythm',{bpm,timeSignature,numBars,sequence,isMuted,streak,rating});
 const tone=useTone(),clock=useRef({start:0,played:-1,lastHit:-1});const count=(timeSignature==='4_4'?4:3)*numBars;
 const stop=()=>{setIsPlaying(false);setCurrentStep(0);};
 const change=()=>{stop();setStreak(0);setRating('Muster geändert. Starte den Rhythmus.');};
 const moves=['stomp','slap','clap','rest'];const labels:Record<string,string>={stomp:'Stampfen',slap:'Patschen',clap:'Klatschen',rest:'Pause'};
 useEffect(()=>{if(!isPlaying)return;const tick=()=>{const beat=Math.floor((performance.now()-clock.current.start)/(60000/bpm));setCurrentStep(beat%count);if(beat!==clock.current.played){clock.current.played=beat;const action=sequence[beat%count];if(!isMuted&&action!=='rest')tone(action==='stomp'?110:action==='slap'?330:660,'triangle',0.1);}};tick();const timer=setInterval(tick,20);return()=>clearInterval(timer);},[isPlaying,bpm,count,sequence,isMuted]);
 const tap=()=>{if(!isPlaying){setRating('Starte zuerst den Rhythmus.');return;}const result=judgeRhythmTap(performance.now()-clock.current.start,bpm,sequence.slice(0,count),clock.current.lastHit);if(result.status==='duplicate'){setRating('Dieser Schlag zählt schon. Warte auf den nächsten.');return;}if(result.status==='hit'){clock.current.lastHit=result.beat;setStreak(s=>s+1);setRating('Im Takt!');}else{setStreak(0);setRating(result.status==='rest'?'Das war eine Pause. Hier bleibt es still.':'Noch nicht im Takt. Klopfe beim Aufleuchten.');}};
 return <div data-practice-root tabIndex={0} aria-label="Rhythmus-Klopfer" onKeyDown={e=>{if(e.code==='Space'&&!e.repeat&&e.target===e.currentTarget){e.preventDefault();tap();}}} className={root}>
  <div className="flex justify-between items-center"><span className="text-sm font-bold">Komponieren und im Takt klopfen</span><button className={button} aria-pressed={isMuted} onClick={()=>setIsMuted(!isMuted)}>{isMuted?'🔇 Stumm':'🔊 Ton'}</button></div>
  <div className="flex gap-2 justify-center">{['4_4','3_4'].map(sig=><button key={sig} className={button} aria-pressed={sig===timeSignature} onClick={()=>{if(sig!==timeSignature){change();setTimeSignature(sig);}}}>{sig==='4_4'?'4/4':'3/4'}</button>)}{[1,2].map(n=><button key={n} className={button} aria-pressed={n===numBars} onClick={()=>{if(n!==numBars){change();setNumBars(n);}}}>{n} {n===1?'Takt':'Takte'}</button>)}</div>
  <label className="flex gap-2 items-center text-sm font-bold">Tempo: {bpm} BPM <input className="min-h-11 flex-1 accent-accent" aria-label="Rhythmustempo" type="range" min="55" max="160" value={bpm} onChange={e=>{change();setBpm(Number(e.target.value));}}/></label>
  <div className="flex gap-2 justify-center">{[['basic','Grundmuster'],['waltz','Walzer'],['funky','Wechsel']].map(([id,label])=><button key={id} className={button} onClick={()=>{change();setTimeSignature(id==='waltz'?'3_4':'4_4');setSequence(id==='waltz'?['stomp','slap','slap','stomp','slap','slap','stomp','slap']:id==='funky'?['stomp','clap','slap','clap','stomp','clap','slap','clap']:['stomp','slap','clap','rest','stomp','slap','clap','rest']);}}>{label}</button>)}</div>
  <p className="text-sm text-center">Jedes Feld ist ein Viertelschlag. Tippen wechselt Stampfen → Patschen → Klatschen → Pause.</p>
  <div className="flex-1 min-h-0 grid grid-cols-4 gap-2">{sequence.slice(0,count).map((move,i)=><button key={i} aria-label={'Schlag '+(i+1)+': '+labels[move]} data-rhythm-step={i} aria-current={isPlaying&&currentStep===i?'step':undefined} className={button+(isPlaying&&currentStep===i?' bg-accent text-accent-text':'')} onClick={()=>{change();setSequence(prev=>prev.map((v,j)=>j===i?moves[(moves.indexOf(v)+1)%4]:v));}}>{i+1} · {labels[move]}</button>)}</div>
  <p role="status" className="text-sm font-bold text-center">{rating} · {streak} Treffer in Folge</p>
  <div className="flex gap-2 pr-11"><button className={button+' flex-1'} onClick={()=>{if(isPlaying){stop();setRating('Rhythmus pausiert.');}else{clock.current={start:performance.now(),played:-1,lastHit:-1};setCurrentStep(0);setIsPlaying(true);setStreak(0);setRating('Klopfe beim Aufleuchten.');}}}>{isPlaying?'Rhythmus stoppen':'Rhythmus starten'}</button><button className={button+' flex-1 bg-accent text-accent-text'} onClick={tap}>Mitklopfen</button></div>
 </div>;
}
export function GuitartunerWidgetContent({widget,onUpdate}:Props){
 const saved=readWidgetLifecycleState(widget,'guitartuner',{activeStringIndex:3,autoDetectString:true});
 const [activeStringIndex,setActiveStringIndex]=useState(saved.activeStringIndex),[autoDetectString,setAutoDetectString]=useState(saved.autoDetectString),[isListening,setIsListening]=useState(false),[isPlayingRef,setIsPlayingRef]=useState(false),[detectedFreq,setDetectedFreq]=useState<number|null>(null),[deviationCents,setDeviationCents]=useState<number|null>(null),[audioError,setAudioError]=useState('');
 usePersistedWidgetLifecycleState(widget,onUpdate,'guitartuner',{activeStringIndex,autoDetectString});
 const toneContext=useRef<AudioContext|null>(null),micContext=useRef<AudioContext|null>(null),streamRef=useRef<MediaStream|null>(null),frame=useRef(0),generation=useRef(0),settingsRef=useRef({activeStringIndex,autoDetectString});settingsRef.current={activeStringIndex,autoDetectString};
 const stopReferenceTone=()=>{if(toneContext.current){void toneContext.current.close().catch(()=>{});toneContext.current=null;}setIsPlayingRef(false);};
 const stopListening=()=>{generation.current++;cancelAnimationFrame(frame.current);streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;if(micContext.current)void micContext.current.close().catch(()=>{});micContext.current=null;setIsListening(false);setDetectedFreq(null);setDeviationCents(null);};
 useEffect(()=>()=>{stopReferenceTone();stopListening();},[]);
 const playReferenceTone=(index=activeStringIndex)=>{stopReferenceTone();setAudioError('');try{const ctx=new AudioContext();toneContext.current=ctx;const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='triangle';osc.frequency.value=GUITAR_STRINGS[index].freq;gain.gain.setValueAtTime(0.15,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+2);osc.connect(gain).connect(ctx.destination);osc.onended=()=>{void ctx.close().catch(()=>{});if(toneContext.current===ctx){toneContext.current=null;setIsPlayingRef(false);}};osc.start();osc.stop(ctx.currentTime+2.1);setIsPlayingRef(true);}catch{setAudioError('Tonwiedergabe ist hier nicht verfügbar.');}};
 const startListening=async()=>{stopReferenceTone();stopListening();setAudioError('');const request=generation.current;try{if(!navigator.mediaDevices?.getUserMedia)throw Error();const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});if(request!==generation.current){stream.getTracks().forEach(t=>t.stop());return;}streamRef.current=stream;const ctx=new AudioContext();micContext.current=ctx;const analyser=ctx.createAnalyser();analyser.fftSize=4096;ctx.createMediaStreamSource(stream).connect(analyser);setIsListening(true);const data=new Float32Array(4096);let last=0;const sample=(now:number)=>{if(request!==generation.current)return;if(now-last>=80){last=now;analyser.getFloatTimeDomainData(data);const freq=estimatePitch(data,ctx.sampleRate);setDetectedFreq(freq);if(freq!==null){const index=settingsRef.current.autoDetectString?nearestGuitarString(freq):settingsRef.current.activeStringIndex;if(settingsRef.current.autoDetectString)setActiveStringIndex(index);setDeviationCents(centsBetween(freq,GUITAR_STRINGS[index].freq));}else setDeviationCents(null);}frame.current=requestAnimationFrame(sample);};frame.current=requestAnimationFrame(sample);}catch{if(request===generation.current){stopListening();setAudioError('Mikrofon ist nicht verfügbar oder die Berechtigung wurde verweigert. Du kannst weiter Referenztöne abspielen.');}}};
 const active=GUITAR_STRINGS[activeStringIndex],hasPitch=isListening&&detectedFreq!==null&&deviationCents!==null;
 return <div data-practice-root className={root}>
  <div className="flex justify-between items-center gap-2"><span className="text-sm font-bold">Standardstimmung · A = 440 Hz</span><button className={button} onClick={isListening?stopListening:startListening}>{isListening?'Mikrofon stoppen':'Mikrofon starten'}</button></div>
  <p role="status" className="text-sm text-center">{audioError||(!isListening?'Wähle eine Saite zum Anhören.':!hasPitch?'Kein stabiler Ton erkannt. Schlage eine einzelne Saite an.':Math.abs(deviationCents!)<=3.5?'Gut gestimmt.':deviationCents!<0?'Zu tief – vorsichtig höher stimmen.':'Zu hoch – vorsichtig tiefer stimmen.')}</p>
  <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2"><div className="text-4xl font-bold">{active.label} · {active.note}</div><div className="text-xl font-mono">{hasPitch?detectedFreq!.toFixed(1)+' Hz':'— Hz'}</div><div className="relative w-80 h-24 rounded-xl bg-slate-100 dark:bg-slate-800"><span className="absolute left-2 bottom-2 text-sm">zu tief</span><span className="absolute right-2 bottom-2 text-sm">zu hoch</span><div className="absolute left-1/2 top-2 h-16 border-l-2 border-emerald-600"/>{hasPitch&&<div aria-label="Stimmzeiger" className="absolute top-2 h-16 w-1 bg-accent" style={{left:(50+Math.max(-50,Math.min(50,deviationCents!)))+'%'}}/>}</div><span className="text-sm">{hasPitch?deviationCents!.toFixed(1)+' Cent Abweichung':'Erst ein erkannter Ton wird bewertet.'}</span></div>
  <div className="grid grid-cols-6 gap-2">{GUITAR_STRINGS.map((str,index)=><button key={str.stringNum} className={button} aria-label={str.name} aria-pressed={index===activeStringIndex} onClick={()=>{setActiveStringIndex(index);setDetectedFreq(null);setDeviationCents(null);if(!isListening)playReferenceTone(index);}}>{str.stringNum}. {str.label}<br/>{str.freq} Hz</button>)}</div>
  <div className="flex gap-2 pr-11"><button className={button+' flex-1'} onClick={()=>isPlayingRef?stopReferenceTone():playReferenceTone()}>{isPlayingRef?'Referenzton stoppen':'Referenzton abspielen'}</button><button className={button+' flex-1'} aria-pressed={autoDetectString} onClick={()=>{setAutoDetectString(!autoDetectString);setDetectedFreq(null);setDeviationCents(null);}}>Automatische Saite: {autoDetectString?'an':'aus'}</button></div>
 </div>;
}
