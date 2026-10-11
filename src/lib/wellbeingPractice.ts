export const boundedInteger=(value:unknown,fallback:number,min:number,max:number)=>typeof value==='number'&&Number.isFinite(value)?Math.max(min,Math.min(max,Math.floor(value))):fallback;
export const MOODS=[
 {emoji:'😆',label:'Fröhlich'}, {emoji:'🙂',label:'Zufrieden'}, {emoji:'🥱',label:'Müde'}, {emoji:'😕',label:'Unsicher'}, {emoji:'😡',label:'Wütend'},
];
export function moodCounts(raw:unknown):number[]{return MOODS.map((_,i)=>boundedInteger(Array.isArray(raw)?raw[i]:undefined,0,0,999));}
export const BRUSH_STEPS=[
 {label:'Kauflächen',instruction:'Putze die Kauflächen oben und unten.'},
 {label:'Außenseiten',instruction:'Putze die Außenseiten aller Zähne mit kleinen Kreisen.'},
 {label:'Innenseiten',instruction:'Putze die Innenseiten aller Zähne vorsichtig.'},
];
export function brushPhase(elapsed:number){const seconds=boundedInteger(elapsed,0,0,120);return {index:Math.min(2,Math.floor(seconds/40)),remaining:seconds===120?0:40-seconds%40,finished:seconds===120};}
export const FEELINGS=[
 {emoji:'😡',label:'Wütend',tip:'Du darfst wütend sein. Wenn du möchtest, mache eine Pause oder sprich mit einer vertrauten Person.'},
 {emoji:'🤩',label:'Voller Energie',tip:'Wenn du möchtest, bewege dich kurz an einem sicheren Platz.'},
 {emoji:'😊',label:'Zufrieden',tip:'Was tut dir gerade gut? Du kannst davon erzählen.'},
 {emoji:'💭',label:'Nachdenklich',tip:'Nimm dir Zeit. Wenn du möchtest, male oder erzähle, was dich beschäftigt.'},
 {emoji:'🥱',label:'Müde',tip:'Wenn du möchtest, mache eine ruhige Pause oder strecke dich vorsichtig.'},
];
