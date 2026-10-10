export type Paint = 'red' | 'yellow' | 'blue' | 'white';
export const PAINT_LABELS: Record<Paint,string> = {red:'Rot',yellow:'Gelb',blue:'Blau',white:'Weiß'};
export const PAINT_COLORS: Record<Paint,string> = {red:'#ef4444',yellow:'#facc15',blue:'#2563eb',white:'#ffffff'};
export const COLOR_TASKS = [
 {name:'Grün',recipe:['yellow','blue'],hint:'Gelb und Blau ergeben im vereinfachten Malfarbenmodell Grün.'},
 {name:'Orange',recipe:['red','yellow'],hint:'Rot und Gelb ergeben Orange.'},
 {name:'Violett',recipe:['red','blue'],hint:'Rot und Blau ergeben Violett.'},
 {name:'Rosa',recipe:['red','white'],hint:'Weiß hellt Rot zu Rosa auf.'},
 {name:'Hellgrün',recipe:['yellow','blue','white'],hint:'Mische zuerst Grün aus Gelb und Blau. Weiß hellt es auf.'},
] as const;
export function matchesPaintRecipe(drops: readonly Paint[], recipe: readonly Paint[]) {
 return recipe.every(p=>drops.includes(p)) && drops.every(p=>recipe.includes(p));
}
// A deliberately illustrative RYB paint palette, not RGB light averaging or a pigment simulation.
export function mixPaint(drops: readonly Paint[]) {
 const n={red:0,yellow:0,blue:0,white:0};drops.forEach(p=>n[p]++);
 const pigment=n.red+n.yellow+n.blue;
 if(!drops.length)return {name:'Leer',hex:'#e2e8f0'};
 if(!pigment)return {name:'Weiß',hex:'#ffffff'};
 const max=Math.max(n.red,n.yellow,n.blue),x=n.red/max,y=n.yellow/max,z=n.blue/max;
 const corners=[[255,255,255],[37,99,235],[250,204,21],[22,163,74],[239,68,68],[147,51,234],[249,115,22],[120,72,38]];
 const rgb=[0,0,0];
 for(let i=0;i<8;i++){const w=(i&4?x:1-x)*(i&2?y:1-y)*(i&1?z:1-z);for(let c=0;c<3;c++)rgb[c]+=corners[i][c]*w;}
 const tint=n.white/drops.length;
 const hex='#'+rgb.map(v=>Math.round(v*(1-tint)+255*tint).toString(16).padStart(2,'0')).join('');
 let name=n.red&&n.yellow&&n.blue?'Braun':n.red&&n.yellow?'Orange':n.red&&n.blue?'Violett':n.yellow&&n.blue?'Grün':n.red?'Rot':n.yellow?'Gelb':'Blau';
 if(n.white)name=name==='Rot'?'Rosa':'Hell'+name.toLocaleLowerCase('de-AT');
 return {name,hex};
}
export const CLOCK_TASKS = [
 {text:'Stelle drei Uhr ein.',hour:3,minute:0},
 {text:'Stelle halb fünf ein.',hour:4,minute:30},
 {text:'Stelle Viertel vor zwölf ein.',hour:11,minute:45},
 {text:'Stelle Viertel nach neun ein.',hour:9,minute:15},
 {text:'Stelle zehn nach zehn ein.',hour:10,minute:10},
] as const;
export function shiftClock(hour:number,minute:number,delta:number){
 const total=(((hour%12)*60+minute+delta)%720+720)%720;
 return {hour:Math.floor(total/60)||12,minute:total%60};
}
export function clockAngles(hour:number,minute:number){return {hour:(hour%12)*30+minute*0.5,minute:minute*6};}
export const WEATHER_ITEMS=[
 {id:'kappe',label:'Sonnenkappe',emoji:'🧢'},{id:'tshirt',label:'T-Shirt',emoji:'👕'},
 {id:'jacke',label:'Regenjacke',emoji:'🧥'},{id:'winterjacke',label:'Winterjacke',emoji:'🧥'},
 {id:'stiefel',label:'Stiefel',emoji:'🥾'},{id:'handschuhe',label:'Handschuhe',emoji:'🧤'},
 {id:'schirm',label:'Regenschirm',emoji:'☂️'},{id:'haube',label:'Wollmütze',emoji:'🧶'},
] as const;
export const WEATHER_TASKS=[
 {id:'sun',label:'Sonne',emoji:'☀️',text:'Es ist sonnig und warm: 25 °C. Wähle aus diesen Dingen etwas für Kopf und Oberkörper.',required:['kappe','tshirt'],optional:[],explanation:'Leichte Kleidung und eine Kappe passen. Schatten und Sonnenschutz sind zusätzlich wichtig.'},
 {id:'rain',label:'Regen',emoji:'🌧️',text:'Es regnet bei 10 °C. Wähle aus diesen Dingen Schutz für Oberkörper und Füße.',required:['jacke','stiefel'],optional:['schirm','tshirt'],explanation:'Eine Regenjacke und geeignete Stiefel halten dich trocken. Ein Schirm ist bei Regen ohne Gewitter zusätzlich möglich.'},
 {id:'cloud',label:'Wolken',emoji:'☁️',text:'Es ist bewölkt und kühl: 12 °C. Wähle zwei Schichten für den Oberkörper.',required:['jacke','tshirt'],optional:[],explanation:'T-Shirt und Jacke sind zwei Schichten. Wolken allein sagen nicht, wie kalt es ist: Achte auch auf Temperatur und Wind.'},
 {id:'snow',label:'Schnee',emoji:'❄️',text:'Es schneit bei 0 °C. Wähle aus diesen Dingen etwas für Kopf, Hände, Oberkörper und Füße.',required:['winterjacke','stiefel','handschuhe','haube'],optional:['tshirt'],explanation:'Winterjacke, Mütze, Handschuhe und geeignete Stiefel wärmen. Darunter gehören passende weitere Kleidungsschichten.'},
 {id:'tempest',label:'Gewitter',emoji:'🌩️',text:'Du hörst Donner. Was ist jetzt wichtig?',required:['shelter'],optional:[],explanation:'Geh mit einer erwachsenen Person sofort in ein festes Gebäude. Ein Regenschirm, ein Baum oder eine offene Hütte schützen nicht vor Blitzschlag.'},
] as const;
export function checkWeather(index:number,selected:readonly string[]){
 const task=WEATHER_TASKS[index],allowed:readonly string[]=[...task.required,...task.optional];
 const missing=task.required.filter(id=>!selected.includes(id)),extra=selected.filter(id=>!allowed.includes(id));
 return {correct:missing.length===0&&extra.length===0,missing,extra};
}
export type MirrorMode='classic'|'swap'|'rotate';
export const SYMMETRY_PUZZLES = [
    {
      name: "Sehr leicht: Herz ❤️",
      size: 2, 
      rows: 4,
      presets: [
        [0, 1],
        [1, 1],
        [1, 1],
        [0, 1]
      ]
    },
    {
      name: "Leicht: Tannenbaum 🌲",
      size: 2,
      rows: 5,
      presets: [
        [0, 4],
        [0, 4],
        [1, 4],
        [1, 4],
        [0, 6]
      ]
    },
    {
      name: "Leicht: Schmetterling 🦋",
      size: 2,
      rows: 4,
      presets: [
        [1, 0],
        [1, 3],
        [0, 3],
        [1, 0]
      ]
    },
    {
      name: "Mittel: Bunte Krone 👑",
      size: 3,
      rows: 6,
      presets: [
        [0, 2, 0],
        [3, 3, 0],
        [0, 3, 4],
        [0, 2, 4],
        [5, 0, 0],
        [5, 0, 2]
      ]
    },
    {
      name: "Knifflig: Rakete 🚀",
      size: 3,
      rows: 6,
      presets: [
        [0, 0, 1],
        [0, 1, 2],
        [0, 2, 2],
        [0, 2, 6],
        [3, 3, 6],
        [1, 0, 0]
      ]
    },
    {
      name: "Sehr knifflig: Bunte Spinne 🕷️",
      size: 4,
      rows: 8,
      presets: [
        [6, 5, 0, 0],
        [0, 6, 5, 0],
        [6, 0, 0, 5],
        [5, 6, 4, 0],
        [0, 4, 6, 5],
        [1, 0, 6, 0],
        [0, 1, 0, 6],
        [6, 1, 0, 0]
      ]
    },
    {
      name: "Fortgeschritten: Turm 🏰",
      size: 4,
      rows: 6,
      presets: [
        [0, 2, 0, 6],
        [0, 2, 1, 6],
        [0, 3, 2, 2],
        [0, 3, 2, 6],
        [4, 4, 2, 6],
        [4, 4, 4, 4]
      ]
    },
    {
      name: "Fortgeschritten: Maske 🎭",
      size: 5,
      rows: 7,
      presets: [
        [5, 0, 5, 0, 0],
        [5, 5, 5, 2, 0],
        [0, 5, 6, 2, 2],
        [0, 5, 5, 6, 2],
        [0, 0, 5, 5, 5],
        [0, 0, 0, 5, 5],
        [0, 0, 0, 0, 5]
      ]
    },
    {
      name: "Profi: Mandala 🌺",
      size: 5,
      rows: 8,
      presets: [
        [3, 0, 0, 0, 3],
        [0, 3, 0, 3, 0],
        [0, 0, 5, 0, 0],
        [0, 5, 1, 5, 0],
        [3, 0, 1, 0, 3],
        [0, 3, 4, 3, 0],
        [0, 4, 4, 4, 0],
        [4, 0, 4, 0, 4]
      ]
    },
    {
      name: "Meister: Phönix 🦅",
      size: 6,
      rows: 8,
      presets: [
        [0, 0, 0, 0, 1, 1],
        [0, 0, 0, 1, 1, 3],
        [0, 0, 1, 1, 3, 3],
        [1, 1, 1, 3, 3, 0],
        [1, 1, 3, 3, 0, 0],
        [0, 1, 3, 0, 0, 0],
        [0, 0, 3, 4, 0, 0],
        [0, 0, 0, 4, 4, 0]
      ]
    },
    {
      name: "Meister: Pixel-Alien 👾",
      size: 6,
      rows: 9,
      presets: [
        [0, 0, 2, 2, 0, 0],
        [0, 2, 2, 2, 2, 0],
        [2, 2, 6, 2, 2, 2],
        [2, 2, 2, 2, 2, 2],
        [2, 0, 2, 2, 0, 2],
        [0, 2, 2, 2, 2, 0],
        [0, 0, 2, 2, 0, 0],
        [0, 2, 0, 0, 2, 0],
        [2, 0, 0, 0, 0, 2]
      ]
    },
    {
      name: "Großmeister: Diamant 💎",
      size: 6,
      rows: 10,
      presets: [
        [0, 0, 0, 0, 0, 2],
        [0, 0, 0, 0, 2, 2],
        [0, 0, 0, 2, 2, 5],
        [0, 0, 2, 2, 5, 5],
        [0, 2, 2, 5, 5, 2],
        [2, 2, 5, 5, 2, 0],
        [2, 5, 5, 2, 0, 0],
        [5, 5, 2, 0, 0, 0],
        [5, 2, 0, 0, 0, 0],
        [2, 0, 0, 0, 0, 0]
      ]
    },
    {
      name: "Ultra-Knifflig: Labyrinth 🕸️",
      size: 7,
      rows: 10,
      presets: [
        [6, 6, 6, 6, 6, 6, 6],
        [6, 0, 0, 0, 0, 0, 0],
        [6, 0, 6, 6, 6, 6, 6],
        [6, 0, 6, 0, 0, 0, 6],
        [6, 0, 6, 0, 6, 0, 6],
        [6, 0, 6, 0, 6, 0, 6],
        [6, 0, 0, 0, 6, 0, 6],
        [6, 6, 6, 6, 6, 0, 6],
        [0, 0, 0, 0, 0, 0, 6],
        [6, 6, 6, 6, 6, 6, 6]
      ]
    },
    {
      name: "Extrem: Yin Yang ☯️",
      size: 6,
      rows: 10,
      presets: [
        [0, 0, 6, 6, 6, 6],
        [0, 6, 6, 6, 6, 6],
        [6, 6, 6, 0, 0, 6],
        [6, 6, 6, 0, 0, 6],
        [6, 6, 6, 6, 6, 6],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 6, 6, 0],
        [0, 0, 0, 6, 6, 0],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0]
      ]
    },
    {
      name: "Große Herausforderung: Mega-Mosaik 🌌",
      size: 8,
      rows: 11,
      presets: [
        [1, 2, 3, 4, 5, 6, 1, 2],
        [2, 3, 4, 5, 6, 1, 2, 3],
        [3, 4, 5, 6, 1, 2, 3, 4],
        [4, 5, 0, 0, 0, 0, 4, 5],
        [5, 6, 0, 3, 3, 0, 5, 6],
        [6, 1, 0, 3, 3, 0, 6, 1],
        [1, 2, 0, 0, 0, 0, 1, 2],
        [2, 3, 4, 5, 6, 1, 2, 3],
        [3, 4, 5, 6, 1, 2, 3, 4],
        [4, 5, 6, 1, 2, 3, 4, 5],
        [5, 6, 1, 2, 3, 4, 5, 6]
      ]
    }
  ];
export function mirroredGrid(left:readonly (readonly number[])[],mode:MirrorMode){
 const swap=[0,2,1,4,3,6,5];
 return (mode==='rotate'?[...left].reverse():left).map(row=>[...row].reverse().map(value=>mode==='swap'?swap[value]:value));
}
export const RIDDLE_CATEGORIES=['Alles','Tiere','Schule','Natur','Scherzfragen'] as const;
export const CLASSROOM_RIDDLES=[
 {category:'Scherzfragen',q:'Was hat einen Hals, aber keinen Kopf?',a:'Eine Flasche',hint:'Du kannst Wasser hineingießen.',emoji:'🧴'},
 {category:'Tiere',q:'Wer trägt sein Haus auf dem Rücken und kriecht langsam?',a:'Eine Schnecke',hint:'Das Haus ist ein spiraliges Gehäuse.',emoji:'🐌'},
 {category:'Tiere',q:'Ich habe lange Ohren, weiches Fell und hüpfe. Wer bin ich?',a:'Ein Hase',hint:'Mein Name beginnt mit H.',emoji:'🐰'},
 {category:'Tiere',q:'Ich bin ein kleines Nagetier mit langem Schwanz. Wer bin ich?',a:'Eine Maus',hint:'Mein Name beginnt mit M.',emoji:'🐭'},
 {category:'Schule',q:'Ich habe Blätter, aber bin kein Baum. In mir stehen Geschichten. Was bin ich?',a:'Ein Buch',hint:'Du kannst darin lesen.',emoji:'📚'},
 {category:'Schule',q:'Ich mache Bleistiftspuren weg und werde dabei kleiner. Was bin ich?',a:'Ein Radiergummi',hint:'Du reibst mich über das Papier.',emoji:'✏️'},
 {category:'Schule',q:'In meinem Bauch wohnen deine Stifte. Was bin ich?',a:'Ein Federmäppchen',hint:'Du findest mich in der Schultasche.',emoji:'🎒'},
 {category:'Natur',q:'Ich falle als Tropfen aus Wolken und mache den Boden nass. Was bin ich?',a:'Regen',hint:'Pflanzen brauchen das Wasser.',emoji:'🌧️'},
 {category:'Natur',q:'Ich bin ein Stern und wärme die Erde. Wer bin ich?',a:'Die Sonne',hint:'Du siehst mich am Tag am Himmel.',emoji:'☀️'},
 {category:'Natur',q:'Ich falle im Winter als kleine Eiskristalle aus Wolken. Was bin ich?',a:'Schnee',hint:'Aus mir kannst du einen Schneemann bauen.',emoji:'❄️'},
 {category:'Scherzfragen',q:'Welcher Kopf kann nicht denken und wächst im Garten?',a:'Ein Kohlkopf',hint:'Du kannst ihn essen.',emoji:'🥬'},
 {category:'Scherzfragen',q:'Was wird nasser, je mehr du dich damit abtrocknest?',a:'Ein Handtuch',hint:'Du benutzt es nach dem Waschen.',emoji:'🧼'},
] as const;
