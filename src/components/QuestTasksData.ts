import { QuestTask } from "./DiagnosticEvaluationDashboard";

// ============================================================================
// PEDAGOGICAL GABICQUEST TASKS FOR AUSTRIAN PRIMARY SCHOOLS (GRADES 1 - 4)
// Highly engaging storylines, proper categorization, and rich interactive visual indicators.
// ============================================================================

export const GRADE_1_TASKS: QuestTask[] = [
  {
    id: 0,
    title: "Das geheimnisvolle Suchspiel",
    category: "kognition",
    categoryLabel: "Kognition",
    storyDescription: "Wir schleichen leise durch den dichten Zauberwald, vorbei an schlafenden Einhörnern und dicken Eichen.",
    instructions: "Welches Tier hat sich hier versteckt, das eigentlich gar nicht in unseren heimischen Wald gehört?",
    character: "Fridolin",
    characterMood: "thinking",
    quote: "Schau genau hin! Eines dieser Tiere lebt normalerweise weit weg in der heißen Savanne!",
    correctAnswerId: "1",
    choices: [
      { id: "0", label: "Das schüchterne Reh", icon: "🦌" },
      { id: "1", label: "Der wilde Löwe", icon: "🦁" },
      { id: "2", label: "Das flinke Eichhörnchen", icon: "🐿️" }
    ],
    visualType: "cards"
  },
  {
    id: 1,
    title: "Der leuchtende Kristallschatz",
    category: "mathe",
    categoryLabel: "Mathematik",
    storyDescription: "In der dunklen Kristallgrotte glitzern magische Erzkristalle im sanften Moosboden.",
    instructions: "Wie viele glitzernde blaue Diamanten siehst du auf dem feuchten Höhlenboden?",
    character: "Lumi",
    characterMood: "excited",
    quote: "Tippe alle funkelnden Kristalle oben an, um sie zum magischen Glühen zu bringen, und zähle laut mit!",
    correctAnswerId: "7",
    choices: [
      { id: "6", label: "6 Kristalle", icon: "💎" },
      { id: "7", label: "7 Kristalle", icon: "💎" },
      { id: "8", label: "8 Kristalle", icon: "💎" }
    ],
    visualType: "crystals"
  },
  {
    id: 2,
    title: "Das Mondlicht-Anlauträtsel",
    category: "rechtschreiben",
    categoryLabel: "Rechtschreiben",
    storyDescription: "Die weise Elfenkönigin zeigt auf den silbernen Himmelskörper am Nachthimmel.",
    instructions: "Mit welchem Anlaut (Anfangslaut) beginnt das wunderschöne Wort 'M-O-N-D'?",
    character: "Fridolin",
    characterMood: "wise",
    quote: "Sprich das Wort ganz langsam aus: Mmmm...ond. Welchen magischen Buchstaben hörst du zuerst?",
    correctAnswerId: "M",
    choices: [
      { id: "A", label: "Anlaut A wie Affe", icon: "🅰️" },
      { id: "M", label: "Anlaut M wie Mond", icon: "🌙" },
      { id: "S", label: "Anlaut S wie Stern", icon: "🆂" }
    ],
    visualType: "cards"
  },
  {
    id: 3,
    title: "Der magische Runenpfad",
    category: "kognition",
    categoryLabel: "Kognition",
    storyDescription: "Die magischen Runensteine weisen uns den Weg über den wilden Bach. Doch einer fehlt!",
    instructions: "Welche Farbe muss der nächste Stein am Ende haben, um die Brücke zu vollenden? (🔴 🔵 🔴 🔵 ...)",
    character: "Lumi",
    characterMood: "happy",
    quote: "Setze die Reihe logisch fort, damit wir trockenen Fußes ans andere Ufer gelangen können!",
    correctAnswerId: "red",
    choices: [
      { id: "red", label: "Roter Stein", icon: "🔴" },
      { id: "blue", label: "Blauer Stein", icon: "🔵" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "rune-pattern"
  },
  {
    id: 4,
    title: "Das geheimnisvolle Blumenmuster",
    category: "kognition",
    categoryLabel: "Kognition",
    storyDescription: "In der Kräuterwiese wachsen wundersame geometrische Blüten in symmetrischen Kreisen.",
    instructions: "Welches farbige Muster bricht die Kette ab? Setze fort: 🟡 🔵 🟡 🔵 ...",
    character: "Lumi",
    characterMood: "happy",
    quote: "Schau dir den geheimnisvollen Rhythmus der Farben an! Was kommt nach dem blauen Kreis?",
    correctAnswerId: "0",
    choices: [
      { id: "0", label: "Gelber Kreis", icon: "🟡" },
      { id: "1", label: "Blauer Kreis", icon: "🔵" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 5,
    title: "Das Reimwörter-Eichhörnchen",
    category: "lesen",
    categoryLabel: "Lesen",
    storyDescription: "Nussknacker Barnaby sucht nach Wörtern, die wie Musik in seinen klitzekleinen Ohren klingen.",
    instructions: "Welches dieser versteckten Worte reimt sich perfekt auf das Wort 'H-A-U-S'?",
    character: "Fridolin",
    characterMood: "excited",
    quote: "Spreche Haus laut aus und finde das Wort, das am Ende genau den gleichen Klang hat!",
    correctAnswerId: "1",
    choices: [
      { id: "0", label: "Der grüne Baum", icon: "🌳" },
      { id: "1", label: "Die kleine Maus", icon: "🐭" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 6,
    title: "Der Silben-Schmetterlingstanz",
    category: "rechtschreiben",
    categoryLabel: "Rechtschreiben",
    storyDescription: "Die bunten Feenschmetterlinge tanzen fröhlich singend im Rhythmus des Waldes.",
    instructions: "Wie viele Silben (Klatscher) hörst du beim Sprechen des Wortes: 'SCHMET-TER-LING'?",
    character: "Fridolin",
    characterMood: "excited",
    quote: "Klatsche bei jedem Wortteil kräftig in die Hände: Schmet - ter - ling! Jeder Klatscher zündet einen Stern!",
    correctAnswerId: "3",
    choices: [
      { id: "1", label: "1 Silbe", icon: "⭐" },
      { id: "2", label: "2 Silben", icon: "⭐⭐" },
      { id: "3", label: "3 Silben", icon: "⭐⭐⭐" }
    ],
    visualType: "syllables",
    extraData: { syllables: ["Schmet", "ter", "ling"] }
  },
  {
    id: 7,
    title: "Die magische Brückenmauer",
    category: "mathe",
    categoryLabel: "Mathematik",
    storyDescription: "Die Kobolde haben eine Sicherheitsmauer gebaut, um den Durchgang zur Lichtung zu sperren.",
    instructions: "Welcher Ziegelstein fehlt im Fundament, damit das mathematische Dach hält (7 + ? = 10)?",
    character: "Lumi",
    characterMood: "wise",
    quote: "Die Summe der beiden nebeneinanderliegenden Grundsteine ergibt genau die Zahl darüber!",
    correctAnswerId: "3",
    choices: [
      { id: "2", label: "2er Stein", icon: "🧩" },
      { id: "3", label: "3er Stein", icon: "🧩" },
      { id: "4", label: "4er Stein", icon: "🧩" }
    ],
    visualType: "math-wall",
    extraData: { top: 10, left: 7 }
  },
  {
    id: 8,
    title: "Das magische Schattenspiel",
    category: "kognition",
    categoryLabel: "Kognition",
    storyDescription: "Die Mittagssonne wirft wunderliche Abbilder hinter die hohle Hexeneiche.",
    instructions: "Welchen exakten Schatten wirft das goldene, kreisrunde Sonnenschild auf die Lehmwand?",
    character: "Lumi",
    characterMood: "happy",
    quote: "Runde Formen werfen runde Schatten! Suche das passende Gegenstück!",
    correctAnswerId: "0",
    choices: [
      { id: "0", label: "Runder Kreis", icon: "🟡" },
      { id: "1", label: "Eckiges Quadrat", icon: "🟦" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 9,
    title: "Das sprechende Apfel-Bild",
    category: "lesen",
    categoryLabel: "Lesen",
    storyDescription: "Am Ast des sprechenden Baumes hängt eine rote, süß duftende Belohnung.",
    instructions: "Lies das magische Zauberwort: A-P-F-E-L. Was ist das für eine Frucht?",
    character: "Fridolin",
    characterMood: "excited",
    quote: "Nimm dir Zeit, verbinde die Laute Buchstabe für Buchstabe im Kopf!",
    correctAnswerId: "0",
    choices: [
      { id: "0", label: "Süßer Apfel", icon: "🍎" },
      { id: "1", label: "Grüne Birne", icon: "🍐" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 10,
    title: "Das Rätsel im Waldsee",
    category: "kognition",
    categoryLabel: "Kognition",
    storyDescription: "Wir knien am funkelnden Seeufer nieder. Eine Mondsichel spiegelt sich im stillen Wasser.",
    instructions: "Welches der Bilder zeigt die korrekte, seitenrichtige Spiegelung der Mondsichel?",
    character: "Lumi",
    characterMood: "curious",
    quote: "Das Wasser wirft das Licht wie ein Spiegel zurück! Finde den richtigen glitzernden See!",
    correctAnswerId: "korrekt",
    choices: [
      { id: "oben", label: "Verzerrt / Verdreht", icon: "🌙" },
      { id: "korrekt", label: "Exakte Spiegelung", icon: "🌙" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "mirror"
  },
  {
    id: 11,
    title: "Der Zahlenpfad der Waldgeister",
    category: "mathe",
    categoryLabel: "Mathematik",
    storyDescription: "Die Ziffern-Geister hüpfen aufgeregt im Gänsemarsch den schmalen Wanderweg hinauf.",
    instructions: "Welche magische Zahl folgt direkt auf die Zahl 9?",
    character: "Lumi",
    characterMood: "wise",
    quote: "Zähle laut im Takt vorwärts: Sieben, Acht, Neun... und jetzt?",
    correctAnswerId: "10",
    choices: [
      { id: "8", label: "Nummer 8", icon: "8️⃣" },
      { id: "10", label: "Nummer 10", icon: "🔟" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 12,
    title: "Die geheime Farbmischung",
    category: "kognition",
    categoryLabel: "Kognition",
    storyDescription: "In der Kräuterküche mischen wir magische Beeren für einen feinen Elfentee.",
    instructions: "Welche Farbe hat eine reife Banane am Bananenstrauch?",
    character: "Lumi",
    characterMood: "happy",
    quote: "Sie leuchtet fast so gelb wie die warme Sommersonne!",
    correctAnswerId: "1",
    choices: [
      { id: "0", label: "Feuerrot", icon: "🔴" },
      { id: "1", label: "Sonnengelb", icon: "🟡" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 13,
    title: "Die Schatztruhe der Waldfee",
    category: "kognition",
    categoryLabel: "Kognition",
    storyDescription: "Die Fee hat ein geheimnisvolles, dreieckiges Schloss an ihrem Schmuckkästchen angebracht.",
    instructions: "Welcher geformte Zauberschlüssel schließt dieses dreieckige Schloss auf?",
    character: "Fridolin",
    characterMood: "excited",
    quote: "Form und Einbuchtung müssen genau übereinstimmen! Guck dir den spitzen Umriss an!",
    correctAnswerId: "dreieck",
    choices: [
      { id: "kreis", label: "Kreis-Schlüssel", icon: "🟡" },
      { id: "quadrat", label: "Quadrat-Schlüssel", icon: "🟦" },
      { id: "dreieck", label: "Dreieck-Schlüssel", icon: "🔺" }
    ],
    visualType: "lock"
  },
  {
    id: 14,
    title: "Die Zaubertränke-Inventur",
    category: "kognition",
    categoryLabel: "Kognition",
    storyDescription: "Der Zauberer schüttelnde Flaschen in seinem Rucksack durcheinander.",
    instructions: "Bringe die Behälter in die richtige Reihenfolge: von klein nach groß geordnet!",
    character: "Fridolin",
    characterMood: "wise",
    quote: "Stelle dir vor, du packst sie ordentlich in dein Regal: Zuerst das kleinste Fläschchen!",
    correctAnswerId: "0",
    choices: [
      { id: "0", label: "Flasche ➔ Kanne ➔ Riesentopf", icon: "🧪" },
      { id: "1", label: "Riesentopf ➔ Flasche ➔ Kanne", icon: "🏺" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "sorting"
  },
  {
    id: 15,
    title: "Der Minus-Zwerg im Stollen",
    category: "mathe",
    categoryLabel: "Mathematik",
    storyDescription: "In der Erzhöhle klauen uns freche Zwerge glänzendes Werkzeug.",
    instructions: "Du hast 4 Äpfel und der Zwerg nimmt kichernd 1 Apfel weg. Wie viele bleiben dir übrig?",
    character: "Lumi",
    characterMood: "wise",
    quote: "Subtrahieren bedeutet, dass uns weniger übrig bleibt. Lass uns rechnen!",
    correctAnswerId: "3",
    choices: [
      { id: "2", label: "2 Äpfel", icon: "2️⃣" },
      { id: "3", label: "3 Äpfel", icon: "3️⃣" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 16,
    title: "Das rollende Kutschenrad",
    category: "kognition",
    categoryLabel: "Kognition",
    storyDescription: "Die hölzerne Kutsche rumpelt über Stock und Stein hinweg.",
    instructions: "Welche geometrische Form muss ein Kutschenrad haben, damit es gut rollen kann?",
    character: "Lumi",
    characterMood: "happy",
    quote: "Eine Form ohne Ecken gleitet sanft über den staubigen Waldboden!",
    correctAnswerId: "1",
    choices: [
      { id: "0", label: "Eckig & flach", icon: "🧱" },
      { id: "1", label: "Rund & weich", icon: "制" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 17,
    title: "Das Ablese-Schild",
    category: "lesen",
    categoryLabel: "Lesen",
    storyDescription: "An der Weggabelung steht ein uraltes, verwittertes Holzschild.",
    instructions: "Lies den kurzen Satz laut: 'Das ist ein Ball.' Was wird hier beschrieben?",
    character: "Fridolin",
    characterMood: "excited",
    quote: "Lies leise für dich und wähle dann den passenden Gegenstand aus!",
    correctAnswerId: "0",
    choices: [
      { id: "0", label: "Ein runder Ball", icon: "⚽" },
      { id: "1", label: "Ein schöner Baum", icon: "🌳" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 18,
    title: "Der Seerosen-Hüpfer",
    category: "mathe",
    categoryLabel: "Mathematik",
    storyDescription: "Kröte Karli möchte über den Teich hüpfen, doch ein Blatt ist leer geblieben.",
    instructions: "Welche Zahl fehlt in der Kette auf der leeren Seerose? (10 - 20 - 30 - ?? - 50)",
    character: "Fridolin",
    characterMood: "curious",
    quote: "Wir zählen in großen Zehnerschritten vorwärts! Welche Zahl wohnt zwischen 30 und 50?",
    correctAnswerId: "40",
    choices: [
      { id: "35", label: "Nummer 35", icon: "🐸" },
      { id: "40", label: "Nummer 40", icon: "🐸" },
      { id: "45", label: "Nummer 45", icon: "🐸" }
    ],
    visualType: "lily-pads",
    extraData: { sequence: [10, 20, 30, "??", 50] }
  },
  {
    id: 19,
    title: "Das Zehner-Abenteuer",
    category: "mathe",
    categoryLabel: "Mathematik",
    storyDescription: "Zum Abschluss der ersten Stufe recken wir beide Hände hoch in die Luft.",
    instructions: "Wie viele Finger hast du insgesamt an deinen beiden Händen?",
    character: "Lumi",
    characterMood: "wise",
    quote: "Zähle deine Finger einzeln ab! Fünf links, fünf rechts... das ergibt?",
    correctAnswerId: "10",
    choices: [
      { id: "5", label: "5 Finger", icon: "🖐️" },
      { id: "10", label: "10 Finger", icon: "👐" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  }
];

export const GRADE_2_TASKS: QuestTask[] = [
  {
    id: 0,
    title: "Das Hüpfspiel der Zahlen",
    category: "kognition",
    categoryLabel: "Kognition",
    storyDescription: "Zahlen hüpfen in regelmäßigen magischen Sprüngen.",
    instructions: "Setze die Reihe sinnvoll fort: 2, 4, 6, 8, ... Что kommt danach?",
    character: "Lumi",
    characterMood: "happy",
    quote: "Wir zählen immer zwei dazu! Eine klassische Zweier-Reihe!",
    correctAnswerId: "10",
    choices: [
      { id: "9", label: "Zahl 9", icon: "9️⃣" },
      { id: "10", label: "Zahl 10", icon: "🔟" },
      { id: "12", label: "Zahl 12", icon: "1️⃣2️⃣" }
    ],
    visualType: "cards"
  },
  {
    id: 1,
    title: "Die rollende Zeitmaschine",
    category: "kognition",
    categoryLabel: "Kognition",
    storyDescription: "Wir drehen an den Zahnrädern der Zeit im Uhrenturm.",
    instructions: "Ein kleiner Rätselspruch: Gestern war Montag. Welcher Tag ist morgen?",
    character: "Fridolin",
    characterMood: "excited",
    quote: "Denke zuerst daran, welcher Tag heute ist! Von dort ist es ganz leicht!",
    correctAnswerId: "mittwoch",
    choices: [
      { id: "mittwoch", label: "Mittwoch", icon: "📅" },
      { id: "dienstag", label: "Dienstag", icon: "📅" },
      { id: "donnerstag", label: "Donnerstag", icon: "📅" }
    ],
    visualType: "cards"
  },
  {
    id: 2,
    title: "Das Rad der Jahreszeiten",
    category: "kognition",
    categoryLabel: "Kognition",
    storyDescription: "Die Natur ändert stetig ihr farbenfrohes Gewand.",
    instructions: "Welche dieser Naturschönheiten gehört untrennbar zum Frühling?",
    character: "Fridolin",
    characterMood: "curious",
    quote: "Wenn die Kälte weicht, erwachen wunderschöne bunte Blumen im Gras!",
    correctAnswerId: "blueten",
    choices: [
      { id: "schnee", label: "Weißer Schnee", icon: "❄️" },
      { id: "blueten", label: "Zarte Frühlingsblüten", icon: "🌸" },
      { id: "ernte", label: "Goldene Herbsternte", icon: "🍎" }
    ],
    visualType: "cards"
  },
  {
    id: 3,
    title: "Das magische Farbenmischbecken",
    category: "kognition",
    categoryLabel: "Kognition",
    storyDescription: "Wir gießen flüssige Glitzerfarben im Kessel des Alchemisten zusammen.",
    instructions: "Welche neue Mischfarbe entsteht, wenn du blaue und gelbe Tinte verrührst?",
    character: "Lumi",
    characterMood: "wise",
    quote: "Das ist reine Zauberei! Zwei Primärfarben schmelzen harmonisch ineinander!",
    correctAnswerId: "gruen",
    choices: [
      { id: "lila", label: "Leuchtendes Violett", icon: "🟣" },
      { id: "gruen", label: "Naturfrisches Grün", icon: "🟢" },
      { id: "orange", label: "Warmes Orange", icon: "🟠" }
    ],
    visualType: "cards"
  },
  {
    id: 4,
    title: "Die Ecken-Zählung",
    category: "kognition",
    categoryLabel: "Kognition",
    storyDescription: "Wir untersuchen hölzerne Geometriesteine auf dem Zeichentisch.",
    instructions: "Wie viele Ecken hat ein mathematisch exaktes Quadrat?",
    character: "Lumi",
    characterMood: "happy",
    quote: "Fahre die Kanten im Kopf ab und zähle jede spitze Ecke einzeln!",
    correctAnswerId: "4",
    choices: [
      { id: "3", label: "3 Ecken", icon: "🔺" },
      { id: "4", label: "4 Ecken", icon: "🟦" },
      { id: "5", label: "5 Ecken", icon: "⬠" }
    ],
    visualType: "cards"
  },
  {
    id: 5,
    title: "Das hüpfende Zeitwort",
    category: "lesen",
    categoryLabel: "Lesen",
    storyDescription: "Ein kleiner Laubfrosch sitzt aufgeregt quakend am Teichufer.",
    instructions: "Welches Tunwort (Verb) passt in die Lücke: 'Der Frosch ___ durch das Gras.'?",
    character: "Fridolin",
    characterMood: "excited",
    quote: "Verben beschreiben, was Lebewesen tun! Was macht der Frosch am besten?",
    correctAnswerId: "huepft",
    choices: [
      { id: "huepft", label: "hüpft flink", icon: "🐸" },
      { id: "fliegt", label: "fliegt hoch", icon: "🦅" },
      { id: "singt", label: "singt laut", icon: "🎤" }
    ],
    visualType: "cards"
  },
  {
    id: 6,
    title: "Die Höhle der Gegenteile",
    category: "lesen",
    categoryLabel: "Lesen",
    storyDescription: "In dieser Höhle ist alles umgekehrt, was man hineinruft.",
    instructions: "Was ist das genaue Gegenteil von dem Wort 'hell'?",
    character: "Fridolin",
    characterMood: "curious",
    quote: "Wenn wir am Abend das Licht löschen, wird es sofort ganz...",
    correctAnswerId: "dunkel",
    choices: [
      { id: "laut", label: "lauter Lärm", icon: "📣" },
      { id: "dunkel", label: "bittere Dunkelheit", icon: "🌃" },
      { id: "kalt", label: "eisiger Frost", icon: "❄️" }
    ],
    visualType: "cards"
  },
  {
    id: 7,
    title: "Die Namenwörter-Schatzkiste",
    category: "lesen",
    categoryLabel: "Lesen",
    storyDescription: "Wir ordnen Wortkärtchen in unserer Zauber-Schatulle.",
    instructions: "Welches der folgenden Wörter ist ein echtes Nomen (Namenwort / Hauptwort)?",
    character: "Lumi",
    characterMood: "wise",
    quote: "Nomen bezeichnen Menschen, Tiere, Pflanzen und Dinge! Man schreibt sie groß!",
    correctAnswerId: "haus",
    choices: [
      { id: "laufen", label: "laufen (Tunwort)", icon: "🏃" },
      { id: "haus", label: "Haus (Namenwort)", icon: "🏠" },
      { id: "schnell", label: "schnell (Eigenschaftswort)", icon: "⚡" }
    ],
    visualType: "cards"
  },
  {
    id: 8,
    title: "Die Schreibfehler-Tierfalle",
    category: "lesen",
    categoryLabel: "Lesen",
    storyDescription: "Ein frecher Waldtroll hat heimlich Buchstaben aus den Schildern geklaut.",
    instructions: "Welches Tier-Namenwort ist hier fehlerhaft aufgeschrieben?",
    character: "Lumi",
    characterMood: "happy",
    quote: "Lies dir alle drei Tiernamen genau durch! Eines klingt am Ende reichlich schief!",
    correctAnswerId: "igl",
    choices: [
      { id: "hase", label: "Der Hase", icon: "🐰" },
      { id: "fuchs", label: "Der Fuchs", icon: "🦊" },
      { id: "igl", label: "Der Igl", icon: "🦔" }
    ],
    visualType: "cards"
  },
  {
    id: 9,
    title: "Das kühle Nass",
    category: "lesen",
    categoryLabel: "Lesen",
    storyDescription: "Im reißenden Gebirgsbach schwimmen muntere Wassertiere.",
    instructions: "Welches dieser Tiere atmet unter Wasser und lebt im tiefen See?",
    character: "Fridolin",
    characterMood: "excited",
    quote: "Wer hat Flossen und schuppige Haut zum Schwimmen?",
    correctAnswerId: "hecht",
    choices: [
      { id: "amsel", label: "Die Amsel", icon: "🐦" },
      { id: "hecht", label: "Der Hecht", icon: "🐟" },
      { id: "reh", label: "Das Reh", icon: "🦌" }
    ],
    visualType: "cards"
  },
  {
    id: 10,
    title: "Das Rechtschreib-Grundgesetz",
    category: "rechtschreiben",
    categoryLabel: "Rechtschreiben",
    storyDescription: "Die weise Schreib-Eule Elias hütet die goldene Grammatikrolle.",
    instructions: "Wird das Namenwort 'B-A-U-M' am Wortanfang großgeschrieben?",
    character: "Fridolin",
    characterMood: "curious",
    quote: "In der deutschen Rechtschreibung gilt ein wichtiges Gesetz für alle Dinge, die man anfassen kann!",
    correctAnswerId: "ja",
    choices: [
      { id: "ja", label: "Ja, am Anfang groß", icon: "👍" },
      { id: "nein", label: "Nein, klein schreiben", icon: "👎" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 11,
    title: "Die flinke Waldkatze",
    category: "rechtschreiben",
    categoryLabel: "Rechtschreiben",
    storyDescription: "Am Stamm der alten Eiche klettert geschmeidig eine Wildkatze empor.",
    instructions: "Welches Wort wird mit dem scharfen Mitlaut 'tz' geschrieben?",
    character: "Lumi",
    characterMood: "wise",
    quote: "Horche auf das scharfe Zischen im Wort! Ist es die Katze oder der Bach?",
    correctAnswerId: "katze",
    choices: [
      { id: "katze", label: "Ka-tze", icon: "🐱" },
      { id: "bach", label: "Ba-ch", icon: "🏞️" },
      { id: "haus", label: "Hau-s", icon: "🏠" }
    ],
    visualType: "cards"
  },
  {
    id: 12,
    title: "Die Mehrheit der Zauberbücher",
    category: "rechtschreiben",
    categoryLabel: "Rechtschreiben",
    storyDescription: "Auf dem Schreibtisch häufen sich staubige Folianten.",
    instructions: "Die Mehrzahl heißt 'Bücher'. Wie lautet die korrekte Einzahl für ein einzelnes Stück?",
    character: "Lumi",
    characterMood: "happy",
    quote: "Vom Umlaut 'ü' wandeln wir zurück zum Stamm-Selbstlaut!",
    correctAnswerId: "buch",
    choices: [
      { id: "buchs", label: "Das Buchs", icon: "📚" },
      { id: "buch", label: "Das Buch", icon: "📖" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 13,
    title: "Der kurze Vokal-Flüsterer",
    category: "rechtschreiben",
    categoryLabel: "Rechtschreiben",
    storyDescription: "Der Wind weht unterschiedliche Tonlängen durch das Unterholz.",
    instructions: "In welchem dieser geschriebenen Wörter hörst du einen ganz kurzen Selbstlaut (A)?",
    character: "Fridolin",
    characterMood: "excited",
    quote: "Sprich beide Wörter nacheinander flüsternd aus! 'Kamm' oder 'kam'?",
    correctAnswerId: "kamm",
    choices: [
      { id: "kamm", label: "Der Kamm (kurz)", icon: "🪮" },
      { id: "kam", label: "Er kam (lang)", icon: "🏃" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 14,
    title: "Das stumme Dehnungs-H",
    category: "rechtschreiben",
    categoryLabel: "Rechtschreiben",
    storyDescription: "Wir basteln ein fabelhaftes Holzfahrrad mit dem Schreiner.",
    instructions: "Wie schreibt man das zweirädrige Gefährt fehlerfrei auf?",
    character: "Fridolin",
    characterMood: "curious",
    quote: "Das stumme H im Inneren dehnt das Sprechen! Lass dich nicht austricksen!",
    correctAnswerId: "fahrrad",
    choices: [
      { id: "farad", label: "Farad (ohne h)", icon: "🚲" },
      { id: "fahrrad", label: "Fahrrad (mit h)", icon: "🚲" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 15,
    title: "Der weite Sprung über die Zehn",
    category: "mathe",
    categoryLabel: "Mathematik",
    storyDescription: "Wir addieren wertvolle Goldmünzen in unserem Lederbeutel.",
    instructions: "Wie viel ergibt die Plusaufgabe: 15 + 7?",
    character: "Lumi",
    characterMood: "wise",
    quote: "Rechne am besten in zwei Schritten: Erst 5 dazu bis zur 20, und dann den Rest!",
    correctAnswerId: "22",
    choices: [
      { id: "21", label: "Ergebnis 21", icon: "2️⃣1️⃣" },
      { id: "22", label: "Ergebnis 22", icon: "2️⃣2️⃣" },
      { id: "23", label: "Ergebnis 23", icon: "2️⃣3️⃣" }
    ],
    visualType: "cards"
  },
  {
    id: 16,
    title: "Das Verdopplungs-Ritual",
    category: "mathe",
    categoryLabel: "Mathematik",
    storyDescription: "Der Spiegelstein verdoppelt alle magischen Objekte, die davor liegen.",
    instructions: "Eine Kiste hat 6 leuchtende Steinchen. Der Spiegelstein verdoppelt sie. Wie viele hast du nun?",
    character: "Lumi",
    characterMood: "happy",
    quote: "Das Doppelte bedeutet: Multipliziere die Zahl mit zwei oder rechne 6 + 6!",
    correctAnswerId: "12",
    choices: [
      { id: "10", label: "Zahl 10", icon: "🔟" },
      { id: "12", label: "Zahl 12", icon: "1️⃣2️⃣" },
      { id: "14", label: "Zahl 14", icon: "1️⃣4️⃣" }
    ],
    visualType: "cards"
  },
  {
    id: 17,
    title: "Die Dreierreihe im Einmaleins",
    category: "mathe",
    categoryLabel: "Mathematik",
    storyDescription: "Drei Waldwichtel tragen jeweils 5 schwere Holzscheite zur Feuerstelle.",
    instructions: "Wie viele Holzscheite wurden insgesamt herbeigeschleppt (3 x 5)?",
    character: "Fridolin",
    characterMood: "excited",
    quote: "Das schnelle Einmaleins hilft uns! Addiere 5 + 5 + 5 im Nu!",
    correctAnswerId: "15",
    choices: [
      { id: "8", label: "Ergebnis 8", icon: "8️⃣" },
      { id: "15", label: "Ergebnis 15", icon: "1️⃣5️⃣" },
      { id: "18", label: "Ergebnis 18", icon: "1️⃣8️⃣" }
    ],
    visualType: "cards"
  },
  {
    id: 18,
    title: "Die Einsiedler-Zahlen",
    category: "mathe",
    categoryLabel: "Mathematik",
    storyDescription: "Unter den Nummern gibt es solche, die man nicht gerecht durch zwei teilen kann.",
    instructions: "Welche dieser Zahlen ist ungerade (es bleibt immer ein Rest)?",
    character: "Fridolin",
    characterMood: "curious",
    quote: "Gegenstände paarweise verteilen. Bleibt einer am Ende alleine übrig?",
    correctAnswerId: "7",
    choices: [
      { id: "4", label: "Die gerade 4", icon: "4️⃣" },
      { id: "7", label: "Die ungerade 7", icon: "7️⃣" },
      { id: "10", label: "Die gerade 10", icon: "🔟" }
    ],
    visualType: "cards"
  },
  {
    id: 19,
    title: "Rückzug aus der Koboldhütte",
    category: "mathe",
    categoryLabel: "Mathematik",
    storyDescription: "Wir räumen eilig 12 von unseren 20 Proviantbeuteln auf halbem Weg weg.",
    instructions: "Wie viele Proviantbeutel behalten wir im Lager zurück? (20 - 12)",
    character: "Lumi",
    characterMood: "wise",
    quote: "Ziehe erst 10 ab, und dann die restlichen Zweier! Was bleibt übrig?",
    correctAnswerId: "8",
    choices: [
      { id: "8", label: "8 Beutel übrig", icon: "8️⃣" },
      { id: "7", label: "7 Beutel übrig", icon: "7️⃣" },
      { id: "9", label: "9 Beutel übrig", icon: "9️⃣" }
    ],
    visualType: "cards"
  }
];

export const GRADE_3_TASKS: QuestTask[] = [
  {
    id: 0,
    title: "Der Taktgeber des Königs",
    category: "kognition",
    categoryLabel: "Kognition",
    storyDescription: "Wir richten das goldene Zifferblatt auf der Festungsmauer ein.",
    instructions: "Wie viele Sekunden hat eine volle Minute, beziehungsweise wie viele Minuten eine Stunde?",
    character: "Lumi",
    characterMood: "happy",
    quote: "Die Zeit vergeht unaufhaltsam im mathematischen Sechziger-Takt!",
    correctAnswerId: "60",
    choices: [
      { id: "50", label: "50 Einheiten", icon: "5️⃣0️⃣" },
      { id: "60", label: "60 Einheiten", icon: "6️⃣0️⃣" },
      { id: "100", label: "100 Einheiten", icon: "1️⃣0️⃣0️⃣" }
    ],
    visualType: "cards"
  },
  {
    id: 1,
    title: "Der weite Weltenbummler",
    category: "kognition",
    categoryLabel: "Kognition",
    storyDescription: "Wir breiten die riesige Landkarte der Erde vor uns aus.",
    instructions: "Welcher dieser bekannten Begriffe bezeichnet KEINEN eigenständigen Kontinent?",
    character: "Fridolin",
    characterMood: "excited",
    quote: "Ein Kontinent ist eine riesige zusammenhängende Landmasse mit Flüssen und Gebirgen!",
    correctAnswerId: "berlin",
    choices: [
      { id: "afrika", label: "Kontinent Afrika", icon: "🌍" },
      { id: "europa", label: "Kontinent Europa", icon: "🇪🇺" },
      { id: "berlin", label: "Hauptstadt Berlin", icon: "🐻" }
    ],
    visualType: "cards"
  },
  {
    id: 2,
    title: "Das verkehrte Buchstabenrätsel",
    category: "kognition",
    categoryLabel: "Kognition",
    storyDescription: "Der Zauberspiegel im Flur wirft alle Lettern seitenverkehrt zurück.",
    instructions: "Wie sieht der Großbuchstabe 'L' aus, wenn er exakt gespiegelt wird?",
    character: "Fridolin",
    characterMood: "curious",
    quote: "Die linke und rechte Seite tauschen im Spiegelbild direkt ihre Rollen!",
    correctAnswerId: "sym",
    choices: [
      { id: "standard", label: "Normales L", icon: "L" },
      { id: "j", label: "Buchstabe J", icon: "J" },
      { id: "sym", label: "Gespiegeltes L (╝)", icon: "╝" }
    ],
    visualType: "cards"
  },
  {
    id: 3,
    title: "Die Nadel des Entdeckers",
    category: "kognition",
    categoryLabel: "Kognition",
    storyDescription: "Wir drehen an der magnetischen Windrose unseres Messingkompasses.",
    instructions: "Welche bekannte Himmelsrichtung liegt exakt gegenüber von der Richtung NORDEN?",
    character: "Lumi",
    characterMood: "wise",
    quote: "Im Norden liegt das ewige Eis. Wo fliegen die Vögel im kalten Winter hin?",
    correctAnswerId: "sueden",
    choices: [
      { id: "westen", label: "Der Westen", icon: "⬅️" },
      { id: "sueden", label: "Der Süden", icon: "⬇️" },
      { id: "osten", label: "Der Osten", icon: "➡️" }
    ],
    visualType: "cards"
  },
  {
    id: 4,
    title: "Das Säugetier-Geheimnis",
    category: "kognition",
    categoryLabel: "Kognition",
    storyDescription: "Der Biologe ordnet die vielfältigen Tierarten des Nationalparks.",
    instructions: "Welches der aufgezählten Tiere bringt lebende Junge zur Welt und säugt diese?",
    character: "Lumi",
    characterMood: "happy",
    quote: "Sie tragen meist ein weiches Fell und legen im warmen Nest keine kalkigen Eier!",
    correctAnswerId: "hund",
    choices: [
      { id: "forelle", label: "Die Forelle (Fisch)", icon: "🐟" },
      { id: "hund", label: "Der Hund (Säugetier)", icon: "🐶" },
      { id: "kaefer", label: "Der Marienkäfer (Insekt)", icon: "🐞" }
    ],
    visualType: "cards"
  },
  {
    id: 5,
    title: "Das strahlende Himmelsbild",
    category: "lesen",
    categoryLabel: "Lesen",
    storyDescription: "Am blauen Himmel strahlen weiße Wolkenbänder um die Wette.",
    instructions: "Welches passende Wort schließt den Satz sinnvoll ab: 'Am Tag die Sonne ___.'?",
    character: "Fridolin",
    characterMood: "excited",
    quote: "Achte auf den logischen Sinn des Satzes! Die Sonne wärmt die Erde!",
    correctAnswerId: "scheint",
    choices: [
      { id: "friert", label: "friert erbärmlich", icon: "🥶" },
      { id: "scheint", label: "scheint wunderbar", icon: "☀️" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 6,
    title: "Die Kettenglieder der Verben",
    category: "lesen",
    categoryLabel: "Lesen",
    storyDescription: "Wir untersuchen die Bausteine unserer Muttersprache in Sätzen.",
    instructions: "Welches dieser Wörter beschreibt eine Tätigkeit (Verb / Zeitwort)?",
    character: "Fridolin",
    characterMood: "curious",
    quote: "Verben verraten uns genau, was jemand tut oder geschieht! Singen, lachen, tanzen...",
    correctAnswerId: "singen",
    choices: [
      { id: "singen", label: "singen (Zeitwort)", icon: "🎤" },
      { id: "haus", label: "das Haus (Namenwort)", icon: "🏠" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 7,
    title: "Das dicke Gegenteil-Buch",
    category: "lesen",
    categoryLabel: "Lesen",
    storyDescription: "Auf dem Dachboden finden wir ein staubiges Wörterbuch.",
    instructions: "Wie lautet das exakte und logische Gegenteil von dem Eigenschaftswort 'fleißig'?",
    character: "Lumi",
    characterMood: "wise",
    quote: "Wenn jemand keine Lust zu arbeiten hat und lieber im Schatten faulenzt!",
    correctAnswerId: "faul",
    choices: [
      { id: "stark", label: "stark & kräftig", icon: "💪" },
      { id: "faul", label: "faul & träge", icon: "🦥" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 8,
    title: "Das bunte Adjektiv-Gemälde",
    category: "lesen",
    categoryLabel: "Lesen",
    storyDescription: "Wir malen das prachtvolle Schloss Elfenstein mit Worten aus.",
    instructions: "Zu welcher Wortart gehört das beschreibende Wort 'schön'?",
    character: "Lumi",
    characterMood: "happy",
    quote: "Es beschreibt, WIE eine Sache oder Person beschaffen ist! Ein Eigenschaftswort!",
    correctAnswerId: "adjektiv",
    choices: [
      { id: "nomen", label: "Namenwort (Nomen)", icon: "🏷️" },
      { id: "adjektiv", label: "Eigenschaftswort (Adjektiv)", icon: "🎨" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 9,
    title: "Die tapfere Waldfolklore",
    category: "lesen",
    categoryLabel: "Lesen",
    storyDescription: "Wir blättern in dem reich bebilderten Märchenbuch der Gebrüder Grimm.",
    instructions: "Wer spaziert mit einem gefüllten Weinkorb im roten Umhang tief in den Wald hinein?",
    character: "Fridolin",
    characterMood: "excited",
    quote: "Guck dir die Zeichnung an! Ein junges Mädchen mit einer roten Haube auf dem Kopf!",
    correctAnswerId: "maedchen",
    choices: [
      { id: "wolf", label: "Der gierige Wolf", icon: "🐺" },
      { id: "maedchen", label: "Das Rotkäppchen", icon: "👧" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 10,
    title: "Die weite Reise im Kutschenzug",
    category: "rechtschreiben",
    categoryLabel: "Rechtschreiben",
    storyDescription: "Auf dem sandigen Waldweg donnern gefiederte Postkutschen vorbei.",
    instructions: "Wie schreibt man das Wort 'f-a-h-r-e-n' vollkommen regelkonform auf?",
    character: "Fridolin",
    characterMood: "curious",
    quote: "Wer fährt, dehnt den Vokal! Ein H im Inneren hilft uns bei der Dehnung!",
    correctAnswerId: "fahren",
    choices: [
      { id: "faren", label: "faren (ohne h)", icon: "🚗" },
      { id: "fahren", label: "fahren (mit h)", icon: "🚗" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 11,
    title: "Das schnelle Wettrennen",
    category: "rechtschreiben",
    categoryLabel: "Rechtschreiben",
    storyDescription: "Die athletischen Waldläufer jagen rasend schnell über die Rennbahn.",
    instructions: "Wie wird das sportliche Wort 'r-e-n-n-e-n' orthografisch korrekt verfasst?",
    character: "Lumi",
    characterMood: "wise",
    quote: "Der kurze Brief 'e' verlangt nach einem verdoppelten Mitlaut directly danach!",
    correctAnswerId: "rennen",
    choices: [
      { id: "renen", label: "renen (ein n)", icon: "🏃" },
      { id: "rennen", label: "rennen (Doppel-n)", icon: "🏃" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 12,
    title: "Der kluge Verwandtschafts-Check",
    category: "rechtschreiben",
    categoryLabel: "Rechtschreiben",
    storyDescription: "Wir ermitteln Stamm-Zusammenhänge in unserer Schreibwerkstatt.",
    instructions: "Heißt die Mehrzahl von dem Wort Haus 'Häuser' oder 'Heuser'?",
    character: "Lumi",
    characterMood: "happy",
    quote: "Leite das schwierige Wort immer vom Grundwort 'Haus' (mit AU) logisch ab!",
    correctAnswerId: "haeuser",
    choices: [
      { id: "haeuser", label: "Häuser (mit Umlaut äu)", icon: "🏡" },
      { id: "heuser", label: "Heuser (mit eu)", icon: "🏡" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 13,
    title: "Die felsige Stolperkante",
    category: "rechtschreiben",
    categoryLabel: "Rechtschreiben",
    storyDescription: "Im grauen Schotterpfad liegt ein großer Kiesel im Weg.",
    instructions: "Wie schreibt man das harte Naturobjekt 'S-t-e-i-n' fehlerfrei auf?",
    character: "Fridolin",
    characterMood: "excited",
    quote: "Wir sprechen zwar 'Schtein', doch wir schreiben am Wortanfang nur zwei Zeichen!",
    correctAnswerId: "stein",
    choices: [
      { id: "sctein", label: "Sctein", icon: "🪨" },
      { id: "stein", label: "Stein", icon: "🪨" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 14,
    title: "Die giftige Herbstwald-Kante",
    category: "rechtschreiben",
    categoryLabel: "Rechtschreiben",
    storyDescription: "Unter feuchten Herbstblättern wächst ein prächtiger Fliegenpilz.",
    instructions: "Schreibt man das wunderliche Gewächs 'Pilz' mit einem 'z' am Ende?",
    character: "Fridolin",
    characterMood: "curious",
    quote: "Verlängere das Wort im Geiste: Pil-ze! Welcher Mitlaut klingelt deutlich?",
    correctAnswerId: "ja",
    choices: [
      { id: "ja", label: "Ja, Pilz mit Z", icon: "🍄" },
      { id: "nein", label: "Nein, Pils mit S", icon: "🍄" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 15,
    title: "Das schnelle kleine Einmaleins",
    category: "mathe",
    categoryLabel: "Mathematik",
    storyDescription: "Wir zählen Eicheln auf dem Ladentisch des Kaufmanns ab.",
    instructions: "Wie viel ergibt die Multiplikation: 7 mal 8?",
    character: "Lumi",
    characterMood: "wise",
    quote: "Der Einmaleins-Klassiker schlechthin! Ein schnelles Kopfrechenfeuerwerk!",
    correctAnswerId: "56",
    choices: [
      { id: "54", label: "Zahl 54", icon: "5️⃣4️⃣" },
      { id: "56", label: "Zahl 56", icon: "5️⃣6️⃣" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 16,
    title: "Das Hunderter-Gipfeltreffen",
    category: "mathe",
    categoryLabel: "Mathematik",
    storyDescription: "Zwei große Zwergenclans packen ihre schweren Kisten zusammen.",
    instructions: "Wie viel ergibt die Addition großer Hunderterzahlen: 400 + 300?",
    character: "Lumi",
    characterMood: "happy",
    quote: "Rechne ganz einfach 4 + 3 und hänge die beiden glänzenden Nullen an!",
    correctAnswerId: "700",
    choices: [
      { id: "700", label: "Zahl 700", icon: "💯" },
      { id: "800", label: "Zahl 800", icon: "💯" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 17,
    title: "Das gerechte Kobold-Teilen",
    category: "mathe",
    categoryLabel: "Mathematik",
    storyDescription: "Wir wollen 24 blaue Brombeeren gleichmäßig an 4 Kobolde verteilen.",
    instructions: "Wie viele süße Bromberen erhält jeder Kobold bei gerechter Division?",
    character: "Fridolin",
    characterMood: "excited",
    quote: "Die Umkehroperator hilft: Wie oft passt die 4 in die Zahl 24 hinein?",
    correctAnswerId: "6",
    choices: [
      { id: "5", label: "5 Beeren", icon: "🖐️" },
      { id: "6", label: "6 Beeren", icon: "🎲" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 18,
    title: "Das Gesetz des Tages",
    category: "mathe",
    categoryLabel: "Mathematik",
    storyDescription: "Wir beobachten den Lauf der Sonne und des Mondes am Himmelszelt.",
    instructions: "Wie viele volle Stunden hat ein ganzer Astronomischer Erdentag?",
    character: "Fridolin",
    characterMood: "curious",
    quote: "Ein halber Tag hat 12 Stunden. Wie viele Stunden vergehen, bis die Erde sich einmal im Kreis dreht?",
    correctAnswerId: "24",
    choices: [
      { id: "12", label: "12 Stunden", icon: "🕛" },
      { id: "24", label: "24 Stunden", icon: "📅" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 19,
    title: "Das Zaubertrank-Fundament",
    category: "mathe",
    categoryLabel: "Mathematik",
    storyDescription: "Wir teilen unseren Zaubertrank-Vorrat von 50 Phiolen exakt in zwei Hälften.",
    instructions: "Wie viel ergibt genau die Hälfte von der Zahl 50?",
    character: "Lumi",
    characterMood: "wise",
    quote: "Stelle dir zwei Körbe vor! Wie viele Fläschchen packst du in jeden Korb?",
    correctAnswerId: "25",
    choices: [
      { id: "20", label: "Zahl 20", icon: "2️⃣0️⃣" },
      { id: "25", label: "Zahl 25", icon: "2️⃣🖐️" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  }
];

export const GRADE_4_TASKS: QuestTask[] = [
  {
    id: 0,
    title: "Die Bundeshauptstadt an der Donau",
    category: "kognition",
    categoryLabel: "Kognition",
    storyDescription: "Wir reisen durch die wunderschönen neun Bundesländer unseres Heimatlandes.",
    instructions: "In welchem mitteleuropäischen Land liegt die Prachtstadt Wien?",
    character: "Lumi",
    characterMood: "happy",
    quote: "Wien ist berühmt für den Stephansdom, das Riesenrad und köstliche Sachertorten!",
    correctAnswerId: "at",
    choices: [
      { id: "de", label: "Deutschland", icon: "🇩🇪" },
      { id: "ch", label: "Schweiz", icon: "🇨🇭" },
      { id: "at", label: "Österreich", icon: "🇦🇹" }
    ],
    visualType: "cards"
  },
  {
    id: 1,
    title: "Der pulsierende Muskel",
    category: "kognition",
    categoryLabel: "Kognition",
    storyDescription: "Wir untersuchen die Wunder des lebendigen menschlichen Körpers.",
    instructions: "Welches lebenswichtige Organ pumpt unaufhörlich Blut durch unsere Adern?",
    character: "Fridolin",
    characterMood: "excited",
    quote: "Es schlägt rhythmisch in deiner linken Brusthälfte, Tag und Nacht!",
    correctAnswerId: "herz",
    choices: [
      { id: "lunge", label: "Die Lunge", icon: "🫁" },
      { id: "herz", label: "Das Herz", icon: "❤️" },
      { id: "magen", label: "Der Magen", icon: "🍕" }
    ],
    visualType: "cards"
  },
  {
    id: 2,
    title: "Die Planeten-Karussell",
    category: "kognition",
    categoryLabel: "Kognition",
    storyDescription: "Wir blicken durch das große Messing-Teleskop der Sternwarte.",
    instructions: "Wie viele Planeten kreisen fest um unsere leuchtende Zentralsonne?",
    character: "Fridolin",
    characterMood: "curious",
    quote: "Merkur, Venus, Erde, Mars... Erinnere dich an den Planeten-Merksatz!",
    correctAnswerId: "8",
    choices: [
      { id: "7", label: "7 Planeten", icon: "7️⃣" },
      { id: "8", label: "8 Planeten", icon: "8️⃣" },
      { id: "9", label: "9 Planeten", icon: "9️⃣" }
    ],
    visualType: "cards"
  },
  {
    id: 3,
    title: "Die bewegliche Druckerpresse",
    category: "kognition",
    categoryLabel: "Kognition",
    storyDescription: "Wir blättern im Geschichtsbuch über die folgenschwersten Erfindungen.",
    instructions: "Wer erfand im 15. Jahrhundert den modernen Buchdruck mit beweglichen Metall-Lettern?",
    character: "Lumi",
    characterMood: "wise",
    quote: "Seine Erfindung veränderte die Verbreitung des Wissens auf der ganzen Welt für immer!",
    correctAnswerId: "gutenberg",
    choices: [
      { id: "einstein", label: "Albert Einstein", icon: "⚛️" },
      { id: "gutenberg", label: "Johannes Gutenberg", icon: "🖨️" },
      { id: "newton", label: "Isaac Newton", icon: "🍎" }
    ],
    visualType: "cards"
  },
  {
    id: 4,
    title: "Die Metropole an der Seine",
    category: "kognition",
    categoryLabel: "Kognition",
    storyDescription: "Wir fliegen im Heißluftballon über die Dächer der europäischen Hauptstädte.",
    instructions: "Wie heißt die weltbekannte, von Kunst geprägte Hauptstadt von Frankreich?",
    character: "Lumi",
    characterMood: "happy",
    quote: "Dort thront der berühmte eiserne Eiffelturm stolz im Abendlicht!",
    correctAnswerId: "paris",
    choices: [
      { id: "london", label: "London", icon: "🇬🇧" },
      { id: "paris", label: "Paris", icon: "🗼" },
      { id: "berlin", label: "Berlin", icon: "🐻" }
    ],
    visualType: "cards"
  },
  {
    id: 5,
    title: "Das Bild im Satz",
    category: "lesen",
    categoryLabel: "Lesen",
    storyDescription: "Die Poetin nutzt kunstvolle sprachliche Vergleiche für ihre Gedichte.",
    instructions: "Was beschreibt eine sogenannte Metapher in der Literatur am besten?",
    character: "Fridolin",
    characterMood: "excited",
    quote: "Zum Beispiel: 'Eine Mauer des Schweigens'. Es bezeichnet ein Wortbild!",
    correctAnswerId: "bildlich",
    choices: [
      { id: "vergleich", label: "Einen direkten Vergleich", icon: "⚖️" },
      { id: "bildlich", label: "Einen bildhaften Ausdruck", icon: "🖼️" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 6,
    title: "Der Fall des Besitzes",
    category: "lesen",
    categoryLabel: "Lesen",
    storyDescription: "Wir bestimmen die vier Fälle (Kasus) in unseren Grammatik-Übungen.",
    instructions: "In welchem grammatikalischen Fall steht die Ergänzung 'des Vaters'?",
    character: "Fridolin",
    characterMood: "curious",
    quote: "Frage nach dem Wessen-Fall! Wessen Mantel ist das? Des Vaters!",
    correctAnswerId: "genitiv",
    choices: [
      { id: "genitiv", label: "2. Fall: Genitiv", icon: "🔍" },
      { id: "dativ", label: "3. Fall: Dativ", icon: "🔍" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 7,
    title: "Der Chronist von Phantasien",
    category: "lesen",
    categoryLabel: "Lesen",
    storyDescription: "Wir lesen das unendliche Abenteuer über Atréju, Fuchur und den Glücksdrachen.",
    instructions: "Welcher berühmte deutsche Schriftsteller verfasste 'Die unendliche Geschichte'?",
    character: "Lumi",
    characterMood: "wise",
    quote: "Er erfand auch Momo und die geheimnisvollen grauen Herren der Zeit!",
    correctAnswerId: "ende",
    choices: [
      { id: "preussler", label: "Otfried Preußler", icon: "🧙‍♀️" },
      { id: "ende", label: "Michael Ende", icon: "🐉" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 8,
    title: "Das Fundament der Behauptung",
    category: "lesen",
    categoryLabel: "Lesen",
    storyDescription: "In einer lebhaften Podiumsdiskussion tauschen wir kluge Sichtweisen aus.",
    instructions: "Was ist ein stichhaltiges Argument bei einer sachlichen Erörterung?",
    character: "Lumi",
    characterMood: "happy",
    quote: "Ein Argument stützt deine Meinung! Es liefert eine nachvollziehbare...",
    correctAnswerId: "begruendung",
    choices: [
      { id: "behauptung", label: "Eine bloße Behauptung", icon: "🗣️" },
      { id: "begruendung", label: "Eine begründete Kausalkette", icon: "💡" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 9,
    title: "Der Blick nach vorne",
    category: "lesen",
    categoryLabel: "Lesen",
    storyDescription: "Wir richten den Zeitkompass auf Ereignisse, die erst in Tagen geschehen werden.",
    instructions: "Welche grammatikalische Zeitform nutzen wir für Geschehnisse in der Zukunft?",
    character: "Fridolin",
    characterMood: "excited",
    quote: "Ich werde morgen fleißig lernen! Wie heißt diese Zukunfts-Zeitform?",
    correctAnswerId: "futur",
    choices: [
      { id: "praesens", label: "Gegenwart (Präsens)", icon: "⏱️" },
      { id: "futur", label: "Zukunft (Futur I)", icon: "🚀" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 10,
    title: "Das große Gefühl am Wegesrand",
    category: "rechtschreiben",
    categoryLabel: "Rechtschreiben",
    storyDescription: "Die nächtlichen Schatten können einem ganz schön unheimlich vorkommen.",
    instructions: "Wird das gefühlsbetonte Wort 'Angst' am Wortanfang großgeschrieben?",
    character: "Fridolin",
    characterMood: "curious",
    quote: "Wir können Angst empfinden und anfassen wie ein schweres Paket im Bauch! Ein klares Nomen!",
    correctAnswerId: "ja",
    choices: [
      { id: "ja", label: "Ja, groß schreiben", icon: "😱" },
      { id: "nein", label: "Nein, klein schreiben", icon: "🚫" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 11,
    title: "Der gleichmäßige Trommelschlag",
    category: "rechtschreiben",
    categoryLabel: "Rechtschreiben",
    storyDescription: "Die Musiker klopfen im anspruchsvollen, asymmetrischen Rhythmus.",
    instructions: "Wie schreibt man das knifflige Wort 'R-h-y-t-h-m-u-s' fehlerfrei?",
    character: "Lumi",
    characterMood: "wise",
    quote: "Dieses knifflige Wort hat gleich zwei stumme Dehnungs-H! Guck genau aufs Schiffsdeck!",
    correctAnswerId: "rhythm",
    choices: [
      { id: "rhythm", label: "Rhythmus", icon: "🥁" },
      { id: "rythmus", label: "Rythmus (fehlerhaft)", icon: "🥁" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 12,
    title: "Das laute Signal am Satzende",
    category: "rechtschreiben",
    categoryLabel: "Rechtschreiben",
    storyDescription: "Ein Wachposten warnt lautstark vor herannahenden Trollen im Unterholz: 'Halt, stop!'",
    instructions: "Welches Satzendzeichen setzt du hinter einen dringenden Befehl oder Ausruf?",
    character: "Lumi",
    characterMood: "happy",
    quote: "Es sieht aus wie ein kleiner Strich mit einem dicken Warnpunkt darunter!",
    correctAnswerId: "ausruf",
    choices: [
      { id: "punkt", label: "Einfacher Punkt .", icon: "⚫" },
      { id: "frage", label: "Fragezeichen ?", icon: "❓" },
      { id: "ausruf", label: "Ausrufezeichen !", icon: "❗️" }
    ],
    visualType: "cards"
  },
  {
    id: 13,
    title: "Widerstände überwinden",
    category: "rechtschreiben",
    categoryLabel: "Rechtschreiben",
    storyDescription: "Die Abenteurer stellen sich dem stürmischen Gegenwind trotzig entgegen.",
    instructions: "Wie schreibt man das entschlossene Wort 'W-i-d-e-r-s-p-r-u-c-h'?",
    character: "Fridolin",
    characterMood: "excited",
    quote: "Es bedeutet 'gegen etwas sein'! Braucht man hier ein langes Mitlaut-e oder das kurze I?",
    correctAnswerId: "ohne",
    choices: [
      { id: "mit", label: "Wiederspruch (mit e)", icon: "✍️" },
      { id: "ohne", label: "Widerspruch (ohne e)", icon: "✍️" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 14,
    title: "Die vollendete Tat",
    category: "rechtschreiben",
    categoryLabel: "Rechtschreiben",
    storyDescription: "Wir packen unsere Rucksäcke am verlassenen Biwak-Lagerplatz ein.",
    instructions: "Welches der beiden Wörter steht in der grammatikalischen Partizip II Form?",
    character: "Fridolin",
    characterMood: "curious",
    quote: "Es zeigt an, dass eine bestimmte Tätigkeit bereits vollendet wurde: 'Er ist...'",
    correctAnswerId: "partizip",
    choices: [
      { id: "inf", label: "laufen (Nennform)", icon: "🏃" },
      { id: "partizip", label: "gelaufen (Partizip)", icon: "🏁" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 15,
    title: "Die verschlossene Gleichung",
    category: "mathe",
    categoryLabel: "Mathematik",
    storyDescription: "Ein Alchemist verschlüsselt sein Geheimbuch mit einer mathematischen Variablen.",
    instructions: "Löse das Rätsel nach dem Platzhalter X auf: 12 mal X ergibt 48. Was ist X?",
    character: "Lumi",
    characterMood: "wise",
    quote: "Teile das Ergebnis 48 ganz einfach durch die Zahl 12! Welcher Multiplikator kommt heraus?",
    correctAnswerId: "4",
    choices: [
      { id: "3", label: "X ist gleich 3", icon: "3️⃣" },
      { id: "4", label: "X ist gleich 4", icon: "4️⃣" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 16,
    title: "Die Vermessung der Blumenwiese",
    category: "mathe",
    categoryLabel: "Mathematik",
    storyDescription: "Wir spannen Messseile um ein rechteckiges Beet für seltene Heilkräuter.",
    instructions: "Das Beet hat eine Länge von 5 Meter und eine Breite von 4 Meter. Wie groß ist die Fläche?",
    character: "Lumi",
    characterMood: "happy",
    quote: "Nutze die mathematische Formel für Rechtecke: Länge multipliziert mit der Breite!",
    correctAnswerId: "20",
    choices: [
      { id: "9", label: "9 Quadratmeter", icon: "📐" },
      { id: "20", label: "20 Quadratmeter", icon: "🟩" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 17,
    title: "Das große Teilen der Beute",
    category: "mathe",
    categoryLabel: "Mathematik",
    storyDescription: "Wir wollen 1000 glänzende Kupfermünzen treu zu gleichen Teilen unter 8 Abenteurern aufteilen.",
    instructions: "Wie viele Kupfermünzen erhält jeder fleißige Gefährte bei der Division?",
    character: "Fridolin",
    characterMood: "excited",
    quote: "Halbiere die Zahl 1000 nacheinander dreimal! 1000 -> 500 -> 250 -> ?",
    correctAnswerId: "125",
    choices: [
      { id: "125", label: "125 Münzen", icon: "🍕" },
      { id: "150", label: "150 Münzen", icon: "🍕" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 18,
    title: "Die unantastbare Zahl",
    category: "mathe",
    categoryLabel: "Mathematik",
    storyDescription: "Unter allen Nummern gibt es stolze Einzelgänger, die keine Verteilung dulden.",
    instructions: "Welche dieser Zahlen ist eine echte Primzahl (nur durch 1 und sich selbst teilbar)?",
    character: "Fridolin",
    characterMood: "curious",
    quote: "Kann man die Zahl 9 noch zerlegen? Ja, 3 x 3! Gelingt dir das auch bei der 13?",
    correctAnswerId: "13",
    choices: [
      { id: "9", label: "Die Zahl 9", icon: "9️⃣" },
      { id: "13", label: "Die Primzahl 13", icon: "⭐️" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  },
  {
    id: 19,
    title: "Das Zirkel-Geheimnis",
    category: "mathe",
    categoryLabel: "Mathematik",
    storyDescription: "Wir vermessen die präzisen Ecken eines hölzernen Quadrats mit der Schmiege.",
    instructions: "Wie viel Grad misst die rechtwinklige Ecke eines perfekten Quadrats?",
    character: "Lumi",
    characterMood: "wise",
    quote: "Ein sogenannter rechter Winkel steht vollkommen senkrecht auf dem Erdboden!",
    correctAnswerId: "90",
    choices: [
      { id: "45", label: "45 Grad (Spitz)", icon: "📐" },
      { id: "90", label: "90 Grad (Rechter Winkel)", icon: "⬜" },
      { id: "none_of_above", label: "Weder noch", icon: "❓" }
    ],
    visualType: "cards"
  }
];

const GRADE_1_STANDARDS = [
  "BiST-Kognition: Kategorisierung & Logisches Ausschließen (Alltagswissen)",
  "BiST M1: Zahlen und Operationen - Simultanerfassung & Zählen bis 10",
  "BiST D1: Schreiben - Phonologische Bewusstheit (Laute lokalisieren)",
  "BiST-Kognition: Fortsetzung logischer Muster & Reihenfolgen",
  "BiST-Kognition: Symmetrische Mustererfassung",
  "BiST D1: Lesen - Akustische Differenzierung & Reimpaarbildung",
  "BiST D1: Schreiben - Silben segmentieren & klatschen",
  "BiST M1: Arithmetik - Ergänzen im Zahlenraum 10 (Zahlzerlegung)",
  "BiST-Kognition: Geometrische Abstraktion (Schattenerfassung)",
  "BiST D1: Lesen - Synthetisches Erlesen von Erstlesewörtern",
  "BiST-Kognition: Räumliche Orientierung & Achsenspiegelung",
  "BiST M1: Zahlen und Operationen - Vorgänger/Nachfolger bis 10",
  "BiST-Kognition: Visuelle Diskriminierung & Farbzuordnung",
  "BiST-Kognition: Formkonstanz & zweidimensionale Geometrie",
  "BiST-Kognition: Seriation (Sortieren nach physikalischen Dimensionen)",
  "BiST M1: Arithmetik - Operatives Subtrahieren im Zahlenraum 10",
  "BiST-Kognition: Funktionale Eigenschaften geometrischer Körper/Formen",
  "BiST D1: Lesen - Sinnerfassung einfacher Sätze",
  "BiST M1: Zahlen und Operationen - Strukturierte Zehnerreihen bis 50",
  "BiST M1: Mengen und Zahlen - Körpergestützte Mengendarstellung (10 Finger)"
];

const GRADE_2_STANDARDS = [
  "BiST M2: Operatives Rechnen - Zweiersprünge & Zahlenfolgen bis 100",
  "BiST-Kognition: Zeitverständnis - Wochentage & zyklische Zeitrechnungen",
  "BiST-Kognition: Natur & Umwelt - Phänomenologische Jahreszeiten",
  "BiST-Kognition: Farblehre - Synthese von Sekundärfarben",
  "BiST M2: Geometrie - Eigenschaften ebener Figuren (Eckenanzahl)",
  "BiST D2: Lesen - Semantische Sinnerfassung & Verben im Kontext",
  "BiST D2: Lesen - Antonyme & lexikalisches Bedeutungsnetz",
  "BiST D2: Wortarten - Erkennen von Nomen anhand semantischer Kriterien",
  "BiST D2: Rechtschreiben - Korrekturlesen & Fehleridentifikation",
  "BiST-Kognition: Biologie - Lebensraum & Atemphysiologie von Fischen",
  "BiST D2: Wortkunde - Groß-/Kleinschreibung bei konkreten Nomen",
  "BiST D2: Rechtschreiben - Wortstamm-Regel ('tz' nach kurzen Vokalen)",
  "BiST D2: Rechtschreiben - Pluralbildung & Umlautung (U-Ü)",
  "BiST D2: Rechtschreiben - Vokallängen & Konsonantenverdopplung",
  "BiST D2: Rechtschreiben - Stummes h zur Dehnungsverlängerung",
  "BiST M2: Arithmetik - Zehnerübergang beim Addieren im Zahlenraum 100",
  "BiST M2: Arithmetik - Multiplikation als fortgesetzte Addition (Spiegel)",
  "BiST M2: Arithmetik - Grundrechenarten - Kleines Einmaleins (Dreierreihe)",
  "BiST M2: Arithmetik - Zahlcharakteristik - Gerade & ungerade Division",
  "BiST M2: Arithmetik - Subtrahieren mit Zehnerübergang im ZR 100"
];

const GRADE_3_STANDARDS = [
  "BiST-Kognition: Maßeinheiten - Zeitskalen, Sekunden, Minuten, Stunden",
  "BiST-Kognition: Geographie - Kontinentale Gliederung & Topographie",
  "BiST-Kognition: Räumliche Geometrie - Spiegelsymmetrie bei Buchstaben",
  "BiST-Kognition: Orientierung - Kompass & die vier Himmelsrichtungen",
  "BiST-Kognition: Biologie - Systematik der Wirbeltiere (Säugetiere)",
  "BiST D3: Sinnerfassung - Satzzusammenhang & Prädikatsbestimmung",
  "BiST D3: Sprachbewusstsein - Wortartbestimmung - Vollverben erfassen",
  "BiST D3: Sinnerfassung - Synonyme & Antonyme (Adjektive)",
  "BiST D3: Wortartbestimmung - Adjektive & Eigenschaftsbeschreibung",
  "BiST D3: Textverständnis - Literarische Figuren & Märchenerfassung",
  "BiST D3: Rechtschreiben - Dehnungs-H bei Stammvokalen",
  "BiST D3: Rechtschreiben - Konsonantenverdopplung nach kurzen Vokalen",
  "BiST D3: Rechtschreiben - Wortfamilienableitung (äu von au)",
  "BiST D3: Rechtschreiben - Anlautcluster (St-Sp Regelhaftigkeit)",
  "BiST D3: Rechtschreiben - Auslautverhärtung prüfen durch Verlängern",
  "BiST M3: Grundrechenarten - Kopfrechnen im kleinen Einmaleins (7x8)",
  "BiST M3: Arithmetik - Hunderter-Addition im Zahlenraum 1000",
  "BiST M3: Arithmetik - Division & gerechte Aufteilung (ZR 100)",
  "BiST M3: Größen & Maße - Zeitdauer - Astronomischer Tag (24h)",
  "BiST M3: Arithmetik - Division und Halbbildung (Teilen durch Zwei)"
];

const GRADE_4_STANDARDS = [
  "BiST-Kognition: Geographie - Politische Gliederung & Bundesländer Österreichs",
  "BiST-Kognition: Humanbiologie - Herz-Kreislauf-System & Organfunktion",
  "BiST-Kognition: Astronomie - Aufbau des Sonnensystems & Planeten",
  "BiST-Kognition: Medingeschichte - Buchdruck & gesellschaftlicher Nutzen",
  "BiST-Kognition: Geographie - Europäische Hauptstädte & Länderkunde",
  "BiST D4: Sprachbewusstsein - Stilmittel & Metaphorik verstehen",
  "BiST D4: Sprachbewusstsein - Deklinationsanalyse - Die 4 Fälle (Genitiv)",
  "BiST D4: Sinnerfassendes Lesen - Literarische Werke der Weltliteratur",
  "BiST D4: Textverfassen - Strukturierung einer Argumentation (Erörterung)",
  "BiST D4: Wortgrammatik - Zeitformenvergleich (Futur I Hilfsverben)",
  "BiST D4: Rechtschreiben - Nominalisierung von Gefühlsabstrakta",
  "BiST D4: Rechtschreiben - Fremdwortschreibung & Phonem-Graphem-Diskrepanz",
  "BiST D4: Rechtschreiben - Satzzeichensetzung - Befehlssätze & Interpunktion",
  "BiST D4: Rechtschreiben - Homophone unterscheiden (wider vs. wieder)",
  "BiST D4: Rechtschreiben - Verbflexion & Nominalformen (Partizip II)",
  "BiST M4: Arithmetik - Lösen von Grundgleichungen mit Variablen (Platzhalter)",
  "BiST M4: Geometrie - Flächeninhaltsermittlung bei Rechtecken (A = a*b)",
  "BiST M4: Arithmetik - Division großer Zahlen & Kopfrechnen im ZR 1000",
  "BiST M4: Arithmetik - Zahlcharakterisierung - Erkennen von Primzahlen",
  "BiST M4: Geometrie - Winkelmessung - Rechter Winkel (90-Grad-Soll)"
];

GRADE_1_TASKS.forEach((task, idx) => {
  task.bildungsstandard = GRADE_1_STANDARDS[idx] || "BiST Allgemein";
});
GRADE_2_TASKS.forEach((task, idx) => {
  task.bildungsstandard = GRADE_2_STANDARDS[idx] || "BiST Allgemein";
});
GRADE_3_TASKS.forEach((task, idx) => {
  task.bildungsstandard = GRADE_3_STANDARDS[idx] || "BiST Allgemein";
});
GRADE_4_TASKS.forEach((task, idx) => {
  task.bildungsstandard = GRADE_4_STANDARDS[idx] || "BiST Allgemein";
});

export const QUEST_TASKS_BY_GRADE: Record<"1" | "2" | "3" | "4", QuestTask[]> = {
  "1": GRADE_1_TASKS,
  "2": GRADE_2_TASKS,
  "3": GRADE_3_TASKS,
  "4": GRADE_4_TASKS,
};
