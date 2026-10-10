export const GUITAR_STRINGS = [
  {label:'E',note:'E2',freq:82.41,stringNum:6,name:'6. Saite: Tiefes E'},
  {label:'A',note:'A2',freq:110,stringNum:5,name:'5. Saite: A'},
  {label:'D',note:'D3',freq:146.83,stringNum:4,name:'4. Saite: D'},
  {label:'G',note:'G3',freq:196,stringNum:3,name:'3. Saite: G'},
  {label:'H',note:'H3',freq:246.94,stringNum:2,name:'2. Saite: H'},
  {label:'e',note:'E4',freq:329.63,stringNum:1,name:'1. Saite: Hohes E'},
];
export const MEMORY_FREQUENCIES=[261.63,293.66,329.63,349.23,392,440,523.25,587.33];
export function memoryDeck(count:number,random= Math.random){
  const frequencies=MEMORY_FREQUENCIES.slice(0,count/2);
  const cards=[...frequencies,...frequencies].map((freq,id)=>({id,freq,matched:false}));
  for(let i=cards.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
  return cards;
}
export function judgeRhythmTap(elapsed:number,bpm:number,sequence:string[],lastBeat:number){
  const period=60000/bpm,beat=Math.round(elapsed/period),error=Math.abs(elapsed-beat*period);
  const status=beat===lastBeat?'duplicate':error>Math.min(150,period*0.2)?'offbeat':sequence[beat%sequence.length]==='rest'?'rest':'hit';
  return {status,beat,error};
}
export const centsBetween=(frequency:number,target:number)=>1200*Math.log2(frequency/target);
export function nearestGuitarString(frequency:number){
  return GUITAR_STRINGS.reduce((best,item,index)=>Math.abs(centsBetween(frequency,item.freq))<Math.abs(centsBetween(frequency,GUITAR_STRINGS[best].freq))?index:best,0);
}
/** Normalized autocorrelation: reject silence and weak/nonperiodic peaks. */
export function estimatePitch(buffer:Float32Array,sampleRate:number):number|null{
  if(!Number.isFinite(sampleRate)||sampleRate<=0||buffer.length<32)return null;
  let energy=0;for(const value of buffer){if(!Number.isFinite(value))return null;energy+=value*value;}
  if(Math.sqrt(energy/buffer.length)<0.008)return null;
  const minLag=Math.max(2,Math.floor(sampleRate/800)),maxLag=Math.min(Math.ceil(sampleRate/50),Math.floor(buffer.length/2)-1);
  const correlations=new Float64Array(maxLag+2);
  for(let lag=minLag-1;lag<=maxLag+1;lag++){
    let cross=0,a=0,b=0;for(let i=0;i<buffer.length-lag;i++){cross+=buffer[i]*buffer[i+lag];a+=buffer[i]*buffer[i];b+=buffer[i+lag]*buffer[i+lag];}
    correlations[lag]=cross/Math.sqrt(a*b);
  }
  for(let lag=minLag;lag<=maxLag;lag++){
    const center=correlations[lag],left=correlations[lag-1],right=correlations[lag+1];
    if(center>0.9&&center>=left&&center>right){const divisor=left-2*center+right;const refined=lag+(divisor?0.5*(left-right)/divisor:0);const result=sampleRate/refined;return result>=50&&result<=800?result:null;}
  }
  return null;
}
