/**
 * Single source of truth for every widget shown in the classroom widget library.
 * The same catalog powers the lower quick-access bar, so newly listed widgets can
 * be pinned there without maintaining a second whitelist.
 */
export const COCKPIT_WIDGET_LIBRARY_ITEMS = [
                                      {
                                        type: "timeline",
                                        label: "🛤 Tages-Zeitstrahl",
                                        desc: "Interaktiver visueller Ablaufplan",
                                        category: "struct",
                                      },
                                      {
                                        type: "clock",
                                        label: "⏱️ Uhrzeit & Datum",
                                        desc: "Analoge/Digitale Zeitanzeige",
                                        category: "struct",
                                      },
                                      {
                                        type: "timer",
                                        label: "⏳ Timer / Sanduhr",
                                        desc: "Countdown-Timer & Sanduhr",
                                        category: "struct",
                                      },
                                      {
                                        type: "stopwatch",
                                        label: "⏱️ Stoppuhr",
                                        desc: "Rundenzeitzähler",
                                        category: "struct",
                                      },
                                      {
                                        type: "trafficlight",
                                        label: "🚦 Status-Ampel",
                                        desc: "Verhalten und Lernampel",
                                        category: "struct",
                                      },
                                      {
                                        type: "todo",
                                        label: "📝 Aufgaben-Checkliste",
                                        desc: "Schnelle Tafel-To-Do-Listen",
                                        category: "struct",
                                      },
                                      {
                                        type: "dienste",
                                        label: "🧹 Klassendienste",
                                        desc: "Ämter- & Diensteverteilung",
                                        category: "struct",
                                      },
                                      {
                                        type: "links",
                                        label: "🔗 Link- & Dateispeicher",
                                        desc: "Eigene Verknüpfungen ablegen",
                                        category: "struct",
                                      },
                                      {
                                        type: "phases",
                                        label: "🧭 Unterrichtsphasen",
                                        desc: "Erarbeitung, Reflexion, etc.",
                                        category: "struct",
                                      },
                                      {
                                        type: "wordclock",
                                        label: "⏰ Deutsche Wort-Uhr",
                                        desc: "Kindgerechtes Uhrlernen",
                                        category: "struct",
                                      },

                                      {
                                        type: "classweeklyplan",
                                        label: "📋 Wochenplan der Kinder",
                                        desc: "Gemeinsamer Plan, persönliche Häkchen und Schwierigkeitseinschätzung",
                                        category: "struct",
                                      },
                                      {
                                        type: "homework",
                                        label: "📚 Hausübungen",
                                        desc: "Alle HÜ nach Ausgabetag, Fach und Abgabetermin",
                                        category: "struct",
                                      },
                                      {
                                        type: "randomname",
                                        label: "🎯 Zufallsauswahl",
                                        desc: "Namen aus Schülerliste ziehen",
                                        category: "interactivity",
                                      },
                                      {
                                        type: "groups",
                                        label: "👥 Gruppen-Einteiler",
                                        desc: "Zufällige Teams auslosen",
                                        category: "interactivity",
                                      },
                                      {
                                        type: "wheel",
                                        label: "🎡 Glücksrad",
                                        desc: "Zufallsauswahl Rad",
                                        category: "interactivity",
                                      },
                                      {
                                        type: "kidattendance",
                                        label: "🖐️ Ich bin da!",
                                        desc: "Kinder bestätigen ihre Anwesenheit selbst",
                                        category: "interactivity",
                                      },
                                      {
                                        type: "scoreboard",
                                        label: "🏆 Gruppen-Punkte",
                                        desc: "Team-Punktetafel",
                                        category: "interactivity",
                                      },
                                      {
                                        type: "starsreview",
                                        label: "⭐ Sterne der Woche",
                                        desc: "Sterne nach Woche, Monat oder eigener Zeit, Top 3, Top 10 und einzelne Fächer",
                                        category: "interactivity",
                                      },
                                      {
                                        type: "challenge",
                                        label: "🎯 Klassen-Challenge",
                                        desc: "Herausforderungen für die Klasse",
                                        category: "interactivity",
                                      },
                                      {
                                        type: "secretagent",
                                        label: "🕵️‍♂️ Klassen-Kryptograph",
                                        desc: "Caesar-Chiffre & Safe-Knacker Rätsel",
                                        category: "interactivity",
                                      },
                                      {
                                        type: "weightscale",
                                        label: "⚖️ Waagen-Schätzer",
                                        desc: "Gewichte vergleichen & ausbalancieren",
                                        category: "interactivity",
                                      },
                                      {
                                        type: "reflexgame",
                                        label: "⚡ Blitz-Reaktions-Trainer",
                                        desc: "Reaktionsgeschwindigkeit-Duell für Kinder",
                                        category: "interactivity",
                                      },

                                      {
                                        type: "zahlenraum",
                                        label: "🔢 Zahlenraum-Studio",
                                        desc: "Mengenbilder, Hunderterfeld & Zahlenstrahl (ZR 10 bis 1000)",
                                        category: "mathe",
                                      },
                                      {
                                        type: "kopfrechnen",
                                        label: "🧠 Kopfrechentrainer",
                                        desc: "Blitzrechnen, Einmaleins/Einsineins & Rechenketten",
                                        category: "mathe",
                                      },
                                      {
                                        type: "mathcards",
                                        label: "🃏 Mathe-Karten",
                                        desc: "Schnelle Rechenkarten für Kopfrechnen und Wiederholung",
                                        category: "mathe",
                                      },
                                      {
                                        type: "fractionvisualizer",
                                        label: "◐ Bruch-Visualisierer",
                                        desc: "Brüche im Kreis & Streifen darstellen und vergleichen",
                                        category: "mathe",
                                      },
                                      {
                                        type: "mathbalancer",
                                        label: "⚖️ Gewichte-Waage",
                                        desc: "Gleiche die Balkenwaage aus",
                                        category: "mathe",
                                      },
                                      {
                                        type: "moneycalc",
                                        label: "💶 Taschengeld-Zähler",
                                        desc: "Geldbeträge zusammenzählen",
                                        category: "mathe",
                                      },
                                      {
                                        type: "mathpyramid",
                                        label: "📐 Mathe-Pyramide",
                                        desc: "Löse die Zahlenpyramide durch Addition",
                                        category: "mathe",
                                      },
                                      {
                                        type: "clockpuzzle",
                                        label: "⏰ Uhren-Lern-Trainer",
                                        desc: "Lerne analoge Uhrzeiten einzustellen",
                                        category: "mathe",
                                      },
                                      {
                                        type: "geometry",
                                        label: "📐 Geometrie-Muster",
                                        desc: "Bunte geometrische Collagen",
                                        category: "mathe",
                                      },
                                      {
                                        type: "angledetective",
                                        label: "📐 Winkel-Detektiv",
                                        desc: "Schätze Winkel im rotierenden Scheinwerferstrahl",
                                        category: "mathe",
                                      },
                                      {
                                        type: "estimationjar",
                                        label: "🫙 Schätz-Glas",
                                        desc: "Mengen und Murmel-Anzahlen schätzen",
                                        category: "mathe",
                                      },

                                      {
                                        type: "vocabulary",
                                        label: "🔤 Lernwörter-Studio",
                                        desc: "Lernkartei, Stolperstellen & ABC-Ordnung",
                                        category: "deutsch",
                                      },
                                      {
                                        type: "wortsatzwerkstatt",
                                        label: "✍️ Wort- & Satzwerkstatt",
                                        desc: "Wörter bauen, zerlegen & Sätze ordnen",
                                        category: "deutsch",
                                      },
                                      {
                                        type: "wordchain",
                                        label: "🔗 Wortketten-Spiel",
                                        desc: "Kettenwörter-Generator",
                                        category: "deutsch",
                                      },
                                      {
                                        type: "wordgrid",
                                        label: "🔍 Buchstaben-Suchgitter",
                                        desc: "Wortsuchspiel auf Deutsch",
                                        category: "deutsch",
                                      },
                                      {
                                        type: "dictionary",
                                        label: "📚 Emoji-Wörterbuch",
                                        desc: "Flips-Vokabelkarten DE & EN",
                                        category: "deutsch",
                                      },
                                      {
                                        type: "wordscramble",
                                        label: "🍲 Wort-Salat (Anagramm)",
                                        desc: "Anagramme entschlüsseln",
                                        category: "deutsch",
                                      },

                                      {
                                        type: "secretcode",
                                        label: "🕵️ Geheimsprachen-Box",
                                        desc: "Verschlüssle Botschaften",
                                        category: "deutsch",
                                      },
                                      {
                                        type: "storyemojis",
                                        label: "🎭 Story-Emojis",
                                        desc: "Bildimpulse für Geschichten & Erzählungen",
                                        category: "deutsch",
                                      },

                                      {
                                        type: "wordexplorer",
                                        label: "🔍 Wort-Analysator",
                                        desc: "Silben, Vokale & Wortart bestimmen",
                                        category: "deutsch",
                                      },
                                      {
                                        type: "patternmaker",
                                        label: "🎨 Sequenz-Muster-Macher",
                                        desc: "Logische Muster fortführen",
                                        category: "deutsch",
                                      },
                                      {
                                        type: "rhymemachine",
                                        label: "🎰 Reim-Maschine",
                                        desc: "Finde das passende Reimwort",
                                        category: "deutsch",
                                      },
                                      {
                                        type: "alphabetsoup",
                                        label: "🥣 Buchstaben-Suppe",
                                        desc: "Wörter buchstabieren",
                                        category: "deutsch",
                                      },
                                      {
                                        type: "morsecode",
                                        label: "🔦 Morse-Code-Station",
                                        desc: "Sende Lichtsignale",
                                        category: "deutsch",
                                      },
                                      {
                                        type: "punctuationzoo",
                                        label: "🐒 Satzzeichen-Zoo",
                                        desc: "Finde die fehlenden Satzzeichen",
                                        category: "deutsch",
                                      },

                                      {
                                        type: "bodyparts",
                                        label: "🦴 Körper-Entdecker",
                                        desc: "Kindgerechte Anatomie-Fakten",
                                        category: "sachunterricht",
                                      },
                                      {
                                        type: "compass",
                                        label: "🧭 Geographie-Kompass",
                                        desc: "Orientierung & Himmelsrichtungen lernen",
                                        category: "sachunterricht",
                                      },
                                      {
                                        type: "weekdays",
                                        label: "📅 Wochentage-Trainer",
                                        desc: "Wochentage und Monate lernen",
                                        category: "sachunterricht",
                                      },
                                      {
                                        type: "trafficquiz",
                                        label: "🚴 Fahrrad-Führerschein",
                                        desc: "Lerne wichtige Verkehrszeichen",
                                        category: "sachunterricht",
                                      },
                                      {
                                        type: "watercycle",
                                        label: "💧 Wasserkreislauf-Puzzle",
                                        desc: "Stationen des Wasserkreislaufs",
                                        category: "sachunterricht",
                                      },
                                      {
                                        type: "constellation",
                                        label: "✨ Sternbilder-Zeichner",
                                        desc: "Verbinde Sterne zu echten Himmels-Sternbildern",
                                        category: "sachunterricht",
                                      },
                                      {
                                        type: "planetarium",
                                        label: "🌍 Planetensystem",
                                        desc: "Planeten unseres Sonnensystems entdecken",
                                        category: "sachunterricht",
                                      },
                                      {
                                        type: "geographyquiz",
                                        label: "🗺️ Bundesländer-Forscher",
                                        desc: "Bundesländer & Hauptstädte raten",
                                        category: "sachunterricht",
                                      },

                                      {
                                        type: "instruction",
                                        label: "📝 Arbeitsanweisung",
                                        desc: "Großes Textfeld für Aufgaben",
                                        category: "tools",
                                      },
                                      {
                                        type: "tischcheck",
                                        label: "🎒 Tisch-Check",
                                        desc: "Visualisiere benötigte Materialien am Platz",
                                        category: "tools",
                                      },
                                      {
                                        type: "faircall",
                                        label: "🙋‍♀️ Fair-Call",
                                        desc: "Gerechter Zufallsaufrufer mit Aufrufhistorie",
                                        category: "tools",
                                      },
                                      {
                                        type: "hangman",
                                        label: "🌸 Blumen-Rätsel",
                                        desc: "Sätze oder Wörter schrittweise erraten",
                                        category: "play",
                                      },
                                      {
                                        type: "calculator",
                                        label: "🧮 Grundschulrechner",
                                        desc: "Klarer Smartboard-Rechner für Grundrechenarten",
                                        category: "tools",
                                      },
                                      {
                                        type: "noisemeter",
                                        label: "🔊 Lärmampel / Messer",
                                        desc: "Lautstärkekontrolle visualisiert",
                                        category: "tools",
                                      },
                                      {
                                        type: "image",
                                        label: "🖼️ Tafelbild-Projektor",
                                        desc: "Eigene Tafelfiles hochladen",
                                        category: "tools",
                                      },
                                      {
                                        type: "qrcode",
                                        label: "🔗 QR-Code-Generator",
                                        desc: "Links für Schüler bereitstellen",
                                        category: "tools",
                                      },
                                      {
                                        type: "drawing",
                                        label: "🖍️ Zeichenfeld",
                                        desc: "Skizzen & Handschrift auf Tafel",
                                        category: "tools",
                                      },
                                      {
                                        type: "sounds",
                                        label: "🎵 Musik & Klänge",
                                        desc: "Signale, Klavier, Rhythmus, Tontraining & Naturklänge",
                                        category: "tools",
                                      },
                                      {
                                        type: "klassenglas",
                                        label: "💎 Klassenziel & Belohnungsglas",
                                        desc: "Gemeinsames Klassenziel (Glas, Thermometer, Barometer)",
                                        category: "tools",
                                      },
                                      {
                                        type: "noisescales",
                                        label: "🤫 Lautstärke-Modelle",
                                        desc: "Lautstärke-Pegel als Orientierung",
                                        category: "tools",
                                      },
                                      {
                                        type: "guitartuner",
                                        label: "🎸 Gitarren-Stimmgerät",
                                        desc: "Saiten stimmen mit Referenztönen",
                                        category: "tools",
                                      },

                                      {
                                        type: "aiquiz",
                                        label: "🤖 KI Lern-Quiz",
                                        desc: "Lernfragen beantworten",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "riddle",
                                        label: "🧩 Scherz- & Logikrätsel",
                                        desc: "Tägliche Knobelfragen für Kinder",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "colormixer",
                                        label: "🎨 Kunst Farbmischung",
                                        desc: "Farbzusammenstellungen spielerisch",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "dice",
                                        label: "🎲 Tafel-Würfel",
                                        desc: "Zweifarbwürfel werfen",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "shadowshapes",
                                        label: "🦋 Symmetrie-Spiel",
                                        desc: "Schattenmotive spiegeln",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "clocksync",
                                        label: "⏰ Uhrzeit-Macher",
                                        desc: "Stelle analoge Zeiger passend zur digitalen Uhr",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "soundmemory",
                                        label: "🎵 Klang-Memory",
                                        desc: "Finde gleiche Töne über Gehör",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "breathing",
                                        label: "🍃 Atempause",
                                        desc: "Ruhige angeleitete Atemübung",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "kidweather",
                                        label: "🕶️ Wetterfrosch Station",
                                        desc: "Wie zieht man sich passend an?",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "pet",
                                        label: "🐾 Klassenmaskottchen",
                                        desc: "Olivia, Bruno, Mimi oder Hauself Elio · ruhig & ohne Floating",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "weather",
                                        label: "☁️ Aktueller Wetterbericht",
                                        desc: "Wetterdaten abrufen",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "moodmeter",
                                        label: "🙂 Stimmungsmesser",
                                        desc: "Befinden der Schüler erfassen",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "watertracker",
                                        label: "💧 Wasserbedarf-Tracker",
                                        desc: "Tagesbedarfskontrolle",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "rhythm",
                                        label: "🥁 Rhythmus-Klopfer",
                                        desc: "Beats & Takte interaktiv üben",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "dailyquotes",
                                        label: "💡 Morgen-Mottos",
                                        desc: "Positive Affirmationen am Morgen",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "toothbrush",
                                        label: "🪥 Zahnputz-Station",
                                        desc: "Schritt-für-Schritt Putzanleitung",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "emotions",
                                        label: "🎭 Gefühls-Barometer",
                                        desc: "Auseinandersetzung mit Gefühlen",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "animalvoice",
                                        label: "🤖 Roboter-Sounds",
                                        desc: "Welcher Roboter macht dieses Geräusch?",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "piano",
                                        label: "🎹 Klassen-Klavier",
                                        desc: "Spielbare Tonleiter & Musik",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "calmrain",
                                        label: "🌧️ Fokus-Klänge",
                                        desc: "Beruhigende Natur- und Fokusgeräusche für Stillarbeit",
                                        category: "mindfulness",
                                      },

                                      {
                                        type: "wastebin",
                                        label: "♻️ Müll-Trenner",
                                        desc: "Ordne Abfallprodukte richtig ein",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "tonetrainer",
                                        label: "🎵 Tonleiter-Entdecker",
                                        desc: "Spiele Töne und lerne Melodien nach Gehör",
                                        category: "mindfulness",
                                      },
                                      { type: "scrambler", label: "✍️ Wort- & Satzwerkstatt", desc: "Wörter und Sätze spielerisch ordnen und untersuchen", category: "deutsch" },
                                      { type: "fractions", label: "◐ Bruch-Visualisierer", desc: "Brüche anschaulich darstellen", category: "mathe" },
                                      { type: "sorting", label: "🔢 Zahlensortierer", desc: "Zahlen vergleichen und sortieren", category: "mathe" },
                                      { type: "piggybank", label: "🐷 Klassen-Sparschwein", desc: "Geldbeträge spielerisch darstellen", category: "mathe" },
                                      { type: "spellingdetective", label: "🔤 Rechtschreib-Detektiv", desc: "Wörter untersuchen und Rechtschreibung trainieren", category: "deutsch" },
                                      { type: "numberline", label: "🔢 Zahlenstrahl", desc: "Zahlen auf dem Zahlenstrahl verorten", category: "mathe" },
                                      { type: "mathchain", label: "🧠 Rechenkette", desc: "Rechenketten gemeinsam bearbeiten", category: "mathe" },
                                      { type: "thermometer", label: "🌡️ Ziel-Thermometer", desc: "Fortschritt und Ziele sichtbar machen", category: "struct" },
                                      { type: "compoundsplit", label: "✍️ Zusammengesetzte Wörter", desc: "Wortbausteine erkennen und zusammensetzen", category: "deutsch" },
                                      { type: "mathduel", label: "⚔️ Mathe-Duell", desc: "Kurze Rechenduelle für die Klasse", category: "mathe" },
                                      { type: "shapepuzzle", label: "📐 Formen-Entdecker", desc: "Geometrische Formen entdecken und zuordnen", category: "mathe" },
                                      { type: "fractioncake", label: "🍰 Bruch-Kuchen", desc: "Bruchteile mit anschaulichen Flächen darstellen", category: "mathe" },
                                      { type: "sentencebuilding", label: "✍️ Satzbau", desc: "Sätze aufbauen und Satzteile ordnen", category: "deutsch" },
                                      { type: "divrobot", label: "🤖 Teilbarkeits-Roboter", desc: "Teilbarkeit spielerisch untersuchen", category: "mathe" },
                                      { type: "classtarget", label: "🎯 Klassen-Ziel", desc: "Gemeinsame Ziele sichtbar verfolgen", category: "interactivity" },
                                      { type: "fractiongrid", label: "◐ Bruch-Raster", desc: "Brüche im Raster visualisieren", category: "mathe" },
                                      { type: "wordbuilder", label: "🔤 Wort-Baukasten", desc: "Wörter aus Bausteinen zusammensetzen", category: "deutsch" },
                                      { type: "soundmachine", label: "🎵 Klang-Maschine", desc: "Klänge und Signale im Unterricht einsetzen", category: "tools" },
                                      { type: "multitrainer", label: "🧠 Multi-Trainer", desc: "Verschiedene Rechenarten trainieren", category: "mathe" },
                                      { type: "abcorder", label: "🔤 ABC-Sortierer", desc: "Wörter alphabetisch ordnen", category: "deutsch" },
                                      { type: "anschauung", label: "🔢 Zahlenraum-Studio", desc: "Zahlenräume anschaulich darstellen", category: "mathe" },
                                    ] as const;

export type CockpitWidgetLibraryItem = (typeof COCKPIT_WIDGET_LIBRARY_ITEMS)[number];
export type CockpitWidgetLibraryId = CockpitWidgetLibraryItem["type"];

/**
 * Per-instance settings are intentionally exposed in one predictable place:
 * the gear directly in the shared widget header. Keep this capability list here
 * beside the catalog so the classroom surface does not maintain a second UX map.
 */
const COCKPIT_WIDGET_SETTINGS_IDS = new Set<string>([
  "clock",
  "noisemeter",
  "vocabulary",
  "qrcode",
  "image",
  "timer",
  "drawing",
  "instruction",
  "zahlenraum",
  "anschauung",
  "numberline",
  "kopfrechnen",
  "mathcards",
  "multitrainer",
  "mathchain",
  "fractionvisualizer",
  "fractions",
  "fractioncake",
  "fractiongrid",
  "sounds",
]);

const COCKPIT_WIDGET_LIBRARY_BY_TYPE = new Map<string, CockpitWidgetLibraryItem>(
  COCKPIT_WIDGET_LIBRARY_ITEMS.map(item => [item.type, item]),
);

export function getCockpitWidgetLibraryItem(type: string): CockpitWidgetLibraryItem | undefined {
  return COCKPIT_WIDGET_LIBRARY_BY_TYPE.get(type);
}

/** Canonical visible title used by library cards and widget headers. */
export function getCockpitWidgetDisplayLabel(type: string): string {
  if (type === "studentlist") return "👥 Schülerliste";
  // Very old layouts may still contain the former vocabulary alias.
  if (type === "lernwoerter") return COCKPIT_WIDGET_LIBRARY_BY_TYPE.get("vocabulary")?.label || "🔤 Lernwörter-Studio";
  return COCKPIT_WIDGET_LIBRARY_BY_TYPE.get(type)?.label || "🧩 Widget";
}

export function cockpitWidgetSupportsSettings(type: string): boolean {
  return COCKPIT_WIDGET_SETTINGS_IDS.has(type);
}

export function splitCockpitWidgetLabel(label: string): { icon: string; label: string } {
  const parts = String(label || "").trim().split(/\s+/);
  if (parts.length <= 1) return { icon: "🧩", label: label || "Widget" };
  return { icon: parts[0] || "🧩", label: parts.slice(1).join(" ") || "Widget" };
}
