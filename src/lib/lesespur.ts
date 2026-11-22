export interface TrailTask { text: string; question: string; choices: string[]; answer: number; labels?: string[]; sentences?: string[]; clues?: number[] }
export const trails: TrailTask[][] = [
  [
    {text:'Hase', question:'Welches Bild passt?', choices:['🐭','🐰','🐱'], labels:['Maus','Hase','Katze'],answer:1},
    {text:'Sonne', question:'Welches Bild passt?', choices:['☀️','🌙','⭐'], labels:['Sonne','Mond','Stern'],answer:0},
    {text:'Rose', question:'Welches Bild passt?', choices:['🌳','🍄','🌹'], labels:['Baum','Pilz','Rose'],answer:2},
  ], [
    {text:'Der Hund geht hinter der Katze. Beide gehen nach rechts.',question:'Welche Reihe passt?',choices:['🐱 🐶 →','🐶 🐱 →','🐶 🐶 →'],labels:['Katze links und Hund rechts','Hund links und Katze rechts','Zwei Hunde'],answer:1},
    {text:'Im Korb liegen zwei Äpfel und eine Birne.',question:'Was liegt im Korb?',choices:['🍎 🍐 🍐','🍎 🍎 🍎','🍎 🍎 🍐'],labels:['Ein Apfel und zwei Birnen','Drei Äpfel','Zwei Äpfel und eine Birne'],answer:2},
    {text:'Zwischen zwei Bäumen steht ein Haus.',question:'Welche Reihe passt?',choices:['🌳 🏠 🌳','🏠 🌳 🌳','🌳 🌳 🏠'],labels:['Baum, Haus, Baum','Haus, Baum, Baum','Baum, Baum, Haus'],answer:0},
  ], [
    {text:'',question:'Welcher Satz verrät, wo Ina ihren Stift findet?',choices:['Ina sucht ihren Stift.','Unter der Bank entdeckt sie ihn.','Sie steckt ihn ins Federpennal.'],answer:1},
    {text:'',question:'Welcher Satz erklärt, warum Leo gießen will?',choices:['Leo geht in den Garten.','Die Erde im Beet ist trocken.','Leo füllt seine Gießkanne.'],answer:1},
    {text:'',question:'Welcher Satz nennt den Rückgabetag?',choices:['Die Klasse besucht die Bücherei.','Mira wählt ein Buch über Füchse.','Sie gibt es am Freitag zurück.'],answer:2},
  ], [
    {text:'',question:'Welche Farbe hat Leas Rucksack?',sentences:['Es ist Pause.','Lea und Tom haben zwei Rucksäcke, einen roten und einen blauen.','Der rote gehört Tom.'],choices:['Rot','Blau','Grün'],answer:1,clues:[1,2]},
    {text:'',question:'Welches Buch liest Mila?',sentences:['Nur das Tierbuch hat ein grünes Band.','Mila liest das Buch mit dem grünen Band.','Draußen läutet die Glocke.'],choices:['Kochbuch','Märchenbuch','Tierbuch'],answer:2,clues:[0,1]},
    {text:'',question:'Wen braucht die Klasse zum Öffnen des Ballkastens?',sentences:['Der Ballkasten ist versperrt.','Im Hof scheint die Sonne.','Nur Oskar hat den Schlüssel.'],choices:['Oskar','Die Torfrau','Den Busfahrer'],answer:0,clues:[0,2]},
  ],
];
