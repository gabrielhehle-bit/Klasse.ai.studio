import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, RotateCcw, CheckCircle, Save, ArrowLeft, Info, Printer,
  Sparkles, Mic, Volume2, Tv, Maximize2, Minimize2, Award, Headphones
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface TestProps {
  studentId: string;
  initialGrade: number;
  onClose: () => void;
  onSave: (result: {
    testId: string;
    score: number;
    foerderbedarf: boolean;
    note: string;
    meta?: any;
  }) => void;
}

// Highly optimized German syllable splitter with a dictionary of vocabulary from our reading texts
function splitWordIntoSyllables(word: string): string[] {
  const clean = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
  if (clean.length <= 3) return [word];
  
  const dictionary: Record<string, string[]> = {
    "Leni": ["Le", "ni"],
    "gehen": ["ge", "hen"],
    "sehen": ["se", "hen"],
    "Sonne": ["Son", "ne"],
    "grüne": ["grü", "ne"],
    "leise": ["lei", "se"],
    "über": ["ü", "ber"],
    "einen": ["ei", "nen"],
    "Susi": ["Su", "si"],
    "kleinen": ["klei", "nen"],
    "Bello": ["Bel", "lo"],
    "roten": ["ro", "ten"],
    "großen": ["gro", "ßen"],
    "Garten": ["Gar", "ten"],
    "heute": ["heu", "te"],
    "süßen": ["sü", "ßen"],
    "Kuchen": ["Ku", "chen"],
    "treuen": ["treu", "en"],
    "kleines": ["klei", "nes"],
    "Sommer": ["Som", "mer"],
    "baden": ["ba", "den"],
    "alle": ["al", "le"],
    "Kinder": ["Kin", "der"],
    "kühlen": ["küh", "len"],
    "Wasser": ["Was", "ser"],
    "kleiner": ["klei", "ner"],
    "lachen": ["la", "chen"],
    "hellen": ["hel", "len"],
    // Grade 2
    "Heute": ["Heu", "te"],
    "Klasse": ["Klas", "se"],
    "Wanderung": ["Wan", "de", "rung"],
    "Salzburg": ["Salz", "burg"],
    "packen": ["pa", "cken"],
    "Rucksäcke": ["Ruck", "sä", "cke"],
    "leckerem": ["le", "cke", "rem"],
    "Proviant": ["Pro", "vi", "ant"],
    "frische": ["fri", "sche"],
    "Äpfel": ["Äp", "fel"],
    "Semmeln": ["Sem", "meln"],
    "Lehrer": ["Leh", "rer"],
    "Gipfel": ["Gip", "fel"],
    "wandern": ["wan", "dern"],
    "eifrig": ["eif", "rig"],
    "oben": ["o", "ben"],
    "wartet": ["war", "tet"],
    "gemütliche": ["ge", "müt", "li", "che"],
    "Hütte": ["Hüt", "te"],
    "Bergen": ["Ber", "gen"],
    "warme": ["war", "me"],
    "Jacke": ["Ja", "cke"],
    "dicken": ["di", "cken"],
    "Handschuhe": ["Hand", "schu", "he"],
    "Schlitten": ["Schlit", "ten"],
    "Keller": ["Kel", "ler"],
    "Hügel": ["Hü", "gel"],
    "Freunde": ["Freun", "de"],
    "Schule": ["Schu", "le"],
    "bauen": ["bau", "en"],
    "gemeinsam": ["ge", "mein", "sam"],
    "riesigen": ["rie", "si", "gen"],
    "Schneemann": ["Schnee", "mann"],
    "Karotte": ["Ka", "rot", "te"],
    "sausen": ["sau", "sen"],
    "schneebedeckten": ["schnee", "be", "deck", "ten"],
    "Burgenland": ["Bur", "gen", "land"],
    "Familie": ["Fa", "mi", "lie"],
    "Weintrauben": ["Wein", "trau", "ben"],
    "Hügeln": ["Hü", "geln"],
    "pflücken": ["pflü", "cken"],
    "süße": ["sü", "ße"],
    "Kübel": ["Kü", "bel"],
    "Beeren": ["Bee", "ren"],
    "wunderbar": ["wun", "der", "bar"],
    "fruchtig": ["fruch", "tig"],
    "schmecken": ["schme", "cken"],
    "Später": ["Spä", "ter"],
    "Picknick": ["Pick", "nick"],
    "schneidet": ["schnei", "det"],
    "frisches": ["fri", "sches"],
    "Käse": ["Kä", "se"],
    "Tiroler": ["Ti", "ro", "ler"],
    "Bundesland": ["Bun", "des", "land"],
    "Tirol": ["Ti", "rol"],
    "prächtigen": ["präch", "ti", "gen"],
    "Berggipfel": ["Berg", "gip", "fel"],
    "tiefen": ["tie", "fen"],
    "Täler": ["Tä", "ler"],
    "weithin": ["weit", "hin"],
    "Frühling": ["Früh", "ling"],
    "Winterschnee": ["Win", "ter", "schnee"],
    "Gebirgsbäche": ["Ge", "birgs", "bä", "che"],
    "reichlich": ["reich", "lich"],
    "glasklares": ["glas", "kla", "res"],
    "saftigen": ["saf", "ti", "gen"],
    "Alpenwiesen": ["Al", "pen", "wie", "sen"],
    "blühen": ["blüh", "en"],
    "Alpenblumen": ["Al", "pen", "blu", "men"],
    "Edelweiß": ["E", "del", "weiß"],
    "Enzian": ["En", "zi", "an"],
    "Bergkühe": ["Berg", "kü", "he"],
    "friedlich": ["fried", "lich"],
    "Eichhörnchen": ["Eich", "hörn", "chen"],
    "Fritzi": ["Frit", "zi"],
    "neugieriges": ["neu", "gie", "ri", "ges"]
  };

  const cleanLower = clean.toLowerCase();
  for (const [key, syllables] of Object.entries(dictionary)) {
    if (key.toLowerCase() === cleanLower) {
      const res = [...syllables];
      const diff = word.length - clean.length;
      if (diff > 0) {
        const endPunct = word.slice(clean.length);
        res[res.length - 1] = res[res.length - 1] + endPunct;
      }
      return res;
    }
  }

  // Fallback split using a simple regex rule: split after vowels (a, e, i, o, u, ä, ö, ü, ei, au, eu, ie) if followed by consonant + vowel
  const pattern = /([aeiouäöü]{1,2}|ei|au|eu|ie)([bcdfghjklmnpqrstvwxyz]{1,2}[aeiouäöü])/gi;
  let splitWord = word.replace(pattern, "$1-$2");
  return splitWord.split("-");
}


const GRADE_TEXTS: Record<number, Array<{ titel: string; text: string }>> = {
  1: [
    {
      titel: "Reh am Bergbach",
      text: "Leni und Paul gehen im Wald. Sie sehen ein Reh. Das Reh trinkt am Bach. Die Sonne scheint warm auf das grüne Gras. Paul ruft leise. Das Reh läuft schnell fort. Es springt über einen Stein."
    },
    {
      titel: "Bellos Ballspiel",
      text: "Susi hat einen kleinen Hund. Er heißt Bello und ist braun. Bello holt einen roten Ball im großen Garten. Susi backt heute einen süßen Kuchen. Sie gibt dem treuen Tier ein kleines Stück Brot."
    },
    {
      titel: "Sommer am See",
      text: "Im Sommer baden alle Kinder im kühlen See. Das Wasser ist blau. Ein kleiner Fisch schwimmt flink am Ufer. Mia fängt ihn nicht. Der Fisch taucht tief ab. Alle lachen laut im hellen Sand."
    }
  ],
  2: [
    {
      titel: "Wanderung im Salzburger Land",
      text: "Heute macht die Klasse eine Wanderung auf den Berg in Salzburg. Die Kinder packen ihre Rucksäcke mit leckerem Proviant. Es gibt frische Äpfel, Semmeln und viel Wasser. Auf dem Weg sehen sie eine Kuh mit einer großen Glocke. Der Lehrer zeigt auf den Gipfel. Alle wandern eifrig nach oben, denn dort wartet eine gemütliche Hütte auf sie."
    },
    {
      titel: "Winterschneemann in den Alpen",
      text: "Im Winter schneit es in den Bergen sehr viel. David zieht seine warme Jacke und die dicken Handschuhe an. Er nimmt den Schlitten aus dem Keller und geht zum Hügel. Dort trifft er seine Freunde aus der Schule. Sie bauen gemeinsam einen riesigen Schneemann mit einer Nase aus einer Karotte. Danach sausen sie den schneebedeckten Hang hinunter."
    },
    {
      titel: "Weinlese im Burgenland",
      text: "Im schönen Burgenland scheint im Herbst oft die warme Sonne. Die Familie hilft bei der Weintrauben-Lese auf den Hügeln. Alle pflücken die süßen Weintrauben in große Kübel. Luna nascht ein paar Beeren, die wunderbar fruchtig schmecken. Später machen sie ein Picknick im Gras. Der Vater schneidet frisches Brot und Käse für alle auf."
    }
  ],
  3: [
    {
      titel: "Tiroler Berglandschaft",
      text: "Das Bundesland Tirol ist für seine prächtigen Berggipfel und tiefen Täler weithin bekannt. Im Frühling schmilzt der weiße Winterschnee, wodurch die Gebirgsbäche reichlich glasklares Wasser führen. Auf den saftigen Alpenwiesen blühen bunte Alpenblumen wie das edle Edelweiß und der blaue Enzian. Die Bergkühe grasen friedlich, während die Murmeltiere laut pfeifen, um sich vor Gefahren zu warnen. Viele Wanderbegeisterte nutzen das sonnige Wochenende für eine ausgiebige Klettertour. Nach dem anstrengenden Aufstieg schmeckt die herzhafte Jause auf der Almhütte besonders gut. Alle genießen die herrliche Aussicht über die Tiroler Bergwelt."
    },
    {
      titel: "Abenteuer im Wiener Prater",
      text: "Ein Ausflug in den Wiener Prater ist für viele Volksschulkinder ein unvergessliches Ferienerlebnis. Sobald man das historische Pratergelände betritt, hört man das fröhliche Kinderlachen. Die größte Attraktion ist das weltberühmte Riesenrad, von dessen roten Waggons aus man eine atemberaubende Aussicht über die gesamte Bundeshauptstadt hat. Nebenan drehen sich bunte Karussells, und die aufregende Geisterbahn sorgt für ein kleines Gruseln. Beliebt ist auch die Fahrt mit der Liliputbahn durch die grünen Praterauen. Nach den vielen Abenteuern gibt es zur Stärkung eine süße Zuckerwatte oder traditionelle Wiener Krapfen. Müde, aber überglücklich kehren die Ausflügler abends heim."
    },
    {
      titel: "Fritzi das schlaue Eichhörnchen",
      text: "Im schattigen Wienerwald lebt ein neugieriges Eichhörnchen namens Fritzi. Es klettert geschickt auf den hohen Buchenbäumen herum und sammelt eifrig Wintervorräte. Am liebsten mag es braune Haselnüsse und reife Eicheln. Fritzi versteckt seine gesammelten Schätze sorgfältig in kleinen Erdlöchern unter dem weichen Moos. Manchmal vergisst das vergessliche Tierchen jedoch, wo seine geheimen Vorratslager liegen. Im nächsten Frühjahr wachsen an diesen unentdeckten Stellen dann neue, junge Bäumchen heran. So hilft das kleine Eichhörnchen unbewusst dabei, dass der wunderschöne Mischwald stetig wächst und gedeiht. Die Waldspaziergänger beobachten das flinke Tier sehr gerne bei seiner emsigen Arbeit."
    }
  ],
  4: [
    {
      titel: "Die Donau im Weltkulturerbe",
      text: "Die Donau ist mit einer Gesamtlänge von fast 2850 Kilometern der zweitlängste Fluss in Europa und durchfließt auf ihrem Weg zum Schwarzen Meer auch Österreich. In der Wachau, einer wunderschönen Kulturlandschaft in Niederösterreich, ist die Donau von steilen Weinterrassen und mittelalterlichen Burgruinen umgeben. Dieser malerische Flussabschnitt wurde von der UNESCO zum Weltkulturerbe ernannt, um seine einzigartige Schönheit und historische Bedeutung dauerhaft zu bewahren. Neben dem Schiffstourismus dient die starke Strömung der Donau auch der Gewinnung von umweltfreundlicher Energie durch modernste Flusskraftwerke. Große Donau-Dampfschiffe transportieren täglich tonnenweise Waren zwischen den europäischen Ländern. Entlang des schattigen Flussufers verläuft ein flacher Donauradweg, der bei Sportbegeisterten und Radreisenden aus aller Welt äußerst beliebt ist. Er bietet Erholungssuchenden eine ideale Gelegenheit, die vielfältige Tierwelt und seltene Pflanzenarten der österreichischen Flussauen hautnah zu studieren, während die weite Uferlandschaft gemächlich an ihnen vorbeizeiht."
    },
    {
      titel: "Nationalpark Hohe Tauern",
      text: "Der Nationalpark Hohe Tauern ist das größte Naturschutzgebiet in den gesamten Alpen und beheimatet Österreichs höchsten Berg, den Großglockner, mit einer stolzen Höhe von 3798 Metern. In dieser hochalpine Gebirgsregion erstrecken sich ausgedehnte Gletscherlandschaften, die aufgrund der globalen Erwärmung leider stetig schrumpfen. Dieses Ökosystem ist der Lebensraum für zahlreiche bedrohte Tierarten wie den majestätischen Steinadler, die flinke Gämse und den seltenen Bartgeier. Biologen erforschen hier die Überlebensstrategien von Spezialisten, die extreme Witterungsverhältnisse mit eisigen Temperaturen und heftigen Stürmen meistern müssen. Auch die alpine Flora, wie die polsterbildenden Steinbrechgewächse, schützt sich durch spezielle Anpassungen vor dem Austrocknen. Für interessierte Schulklassen bieten ausgebildete Nationalpark-Ranger spannende Exkursionen an, bei denen die ökologischen Zusammenhänge anschaulich erklärt werden. Der Schutz dieser einzigartigen Wildnis sichert das biologische Überleben seltener Organismen und dient der Wissenschaft als wichtiges Freiluftlabor für den Klimaschutz."
    },
    {
      titel: "Der Neusiedler Steppensee",
      text: "Der Neusiedler See liegt im Osten Österreichs im Burgenland und ist einer der wenigen echten Steppenseen in Mitteleuropa. Das markante Merkmal des Sees ist seine geringe Wassertiefe, die im Durchschnitt lediglich eineinhalb Meter beträgt, sowie der schier endlose Schilfgürtel, der das gesamte Gewässer umgibt. Dieser dichte Röhrichtgürtel ist ein international bedeutender Brutplatz für über dreihundert seltene Vogelarten, weshalb die gesamte Region Nationalpark und UNESCO-Welterbe ist. Ornithologen aus der ganzen Welt reisen an, um Silberreiher, Löffler und verschiedene seltene Falkenarten mit Ferngläsern zu beobachten. Aufgrund der flachen Wasserfläche erwärmt sich der See im Sommer sehr rasch, was hervorragende Bedingungen für Badegäste schafft. Gleichzeitig machen die beständigen Windverhältnisse den Neusiedler See zu einem weltbekannten Paradies für Segler und Windsurfer. Um das fragile ökologische Gleichgewicht dieses sensiblen Lebensraumes nicht zu gefährden, gelten strenge Umweltauflagen für den Tourismus und die Landwirtschaft."
    }
  ]
};

export const Test1Lesefluessigkeit: React.FC<TestProps> = ({
  studentId,
  initialGrade,
  onClose,
  onSave
}) => {
  const { app } = useApp();
  const student = app.schueler.find(s => s.id === studentId);

  // States
  const [phase, setPhase] = useState<'setup' | 'test' | 'result'>('setup');
  const [grade, setGrade] = useState<number>(initialGrade || 1);
  const [textIndex, setTextIndex] = useState<number>(0);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Active testing states
  const [elapsedMs, setElapsedMs] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [errorWordIndices, setErrorWordIndices] = useState<Record<number, boolean>>({});
  const [selfCorrectionWordIndices, setSelfCorrectionWordIndices] = useState<Record<number, boolean>>({});
  const [lastReadWordIndex, setLastReadWordIndex] = useState<number>(-1);
  const [customNote, setCustomNote] = useState('');
  
  // Premium child-friendly states
  const [syllableHighlight, setSyllableHighlight] = useState(false);
  const [schuelerMode, setSchuelerMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // Touch/Tablet Mode: 'mark' (Mark errors/corrections) vs 'last' (Set final read word)
  const [tabletMode, setTabletMode] = useState<'mark' | 'last'>('mark');
  
  // Custom reading font style preferences
  const [fontSizeClass, setFontSizeClass] = useState<'text-xl' | 'text-2xl' | 'text-3xl'>('text-2xl');
  const [fontFamilyClass, setFontFamilyClass] = useState<'font-serif' | 'font-sans' | 'font-mono'>('font-serif');

  // Refs for requestAnimationFrame Stopwatch
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const accumulatedTimeRef = useRef<number>(0);

  // Rotate text automatically on each launch or manually
  useEffect(() => {
    const randomIdx = Math.floor(Math.random() * 3);
    setTextIndex(randomIdx);
  }, [grade]);

  const activeText = GRADE_TEXTS[grade]?.[textIndex] || GRADE_TEXTS[1][0];
  const words = activeText.text.split(' ');

  // Stopwatch effect using requestAnimationFrame
  useEffect(() => {
    if (timerRunning) {
      startTimeRef.current = performance.now();
      const updateTimer = () => {
        if (startTimeRef.current !== null) {
          const now = performance.now();
          const currentElapsed = now - startTimeRef.current;
          setElapsedMs(accumulatedTimeRef.current + currentElapsed);
        }
        animationFrameRef.current = requestAnimationFrame(updateTimer);
      };
      animationFrameRef.current = requestAnimationFrame(updateTimer);
    } else {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (startTimeRef.current !== null) {
        accumulatedTimeRef.current += performance.now() - startTimeRef.current;
        startTimeRef.current = null;
      }
    }

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [timerRunning]);

  // Audio / Visual Alert when reaching 1 Minute (60 seconds) benchmark
  const [hasNotified60s, setHasNotified60s] = useState(false);
  useEffect(() => {
    if (elapsedMs >= 60000 && !hasNotified60s) {
      setHasNotified60s(true);
      // Optional: Gentle vibration/alert if supported
      if ('vibrate' in navigator) {
        try { navigator.vibrate([200, 100, 200]); } catch (e) {}
      }
    }
    if (elapsedMs === 0) {
      setHasNotified60s(false);
    }
  }, [elapsedMs, hasNotified60s]);

  const handleStartTest = () => {
    setElapsedMs(0);
    accumulatedTimeRef.current = 0;
    setTimerRunning(false);
    setErrorWordIndices({});
    setSelfCorrectionWordIndices({});
    setLastReadWordIndex(-1);
    setHasNotified60s(false);
    setPhase('test');
  };

  const handleCancelTest = () => {
    setShowCancelConfirm(true);
    setTimerRunning(false);
  };

  const confirmCancel = () => {
    setPhase('setup');
    setShowCancelConfirm(false);
  };

  // Cycling toggle for errors and self-corrections on tablet
  const handleWordClick = (idx: number) => {
    if (tabletMode === 'last') {
      setLastReadWordIndex(idx);
      return;
    }

    // Cycle: Normal -> Error -> Self-Correction -> Normal
    const isError = !!errorWordIndices[idx];
    const isSelfCorr = !!selfCorrectionWordIndices[idx];

    if (!isError && !isSelfCorr) {
      // Go to Error
      setErrorWordIndices(prev => ({ ...prev, [idx]: true }));
    } else if (isError) {
      // Go to Self-Correction
      setErrorWordIndices(prev => ({ ...prev, [idx]: false }));
      setSelfCorrectionWordIndices(prev => ({ ...prev, [idx]: true }));
    } else {
      // Go back to Normal
      setSelfCorrectionWordIndices(prev => ({ ...prev, [idx]: false }));
    }
  };

  const handleWordRightClick = (idx: number, e: React.MouseEvent) => {
    e.preventDefault();
    setLastReadWordIndex(idx);
  };

  const handleStopTest = () => {
    setTimerRunning(false);
    if (lastReadWordIndex === -1) {
      setLastReadWordIndex(words.length - 1);
    }
    setPhase('result');
  };

  const formatTime = (totalMs: number) => {
    const totalSeconds = Math.floor(totalMs / 1000);
    const msStr = Math.floor((totalMs % 1000) / 10).toString().padStart(2, '0');
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}.${msStr}`;
  };

  // Calculations for results (Excluding Self-Corrections from total errors count)
  const totalWordsRead = lastReadWordIndex + 1;
  const errorsCount = Object.keys(errorWordIndices).filter(k => {
    const idx = parseInt(k, 10);
    return errorWordIndices[idx] && idx <= lastReadWordIndex;
  }).length;
  
  const selfCorrectionsCount = Object.keys(selfCorrectionWordIndices).filter(k => {
    const idx = parseInt(k, 10);
    return selfCorrectionWordIndices[idx] && idx <= lastReadWordIndex;
  }).length;

  const correctWords = Math.max(0, totalWordsRead - errorsCount);
  const timeInMinutes = (elapsedMs || 1000) / 60000;
  const rgw = Math.round(correctWords / timeInMinutes);
  const accuracy = totalWordsRead > 0 ? Math.round((correctWords / totalWordsRead) * 100) : 100;

  // Austrian Benchmark based on school grade
  const targetThreshold = grade === 1 ? 30 : grade === 2 ? 55 : grade === 3 ? 75 : 90;
  const foerderbedarf = rgw < targetThreshold;

  const handleSaveResult = () => {
    const customTextNote = `Lesefluss-Diagnose (${activeText.titel} - Stufe ${grade}). ` +
      `RGW: ${rgw} (Soll: ${targetThreshold}) | Gelesen: ${totalWordsRead}/${words.length} | ` +
      `Fehler: ${errorsCount} | Selbstkorrekturen: ${selfCorrectionsCount} | Genauigkeit: ${accuracy}% | Zeit: ${formatTime(elapsedMs)}.` +
      (customNote ? `\nLehrbeobachtung: ${customNote}` : '');

    onSave({
      testId: 'live-lesefluessigkeit',
      score: rgw,
      foerderbedarf,
      note: customTextNote,
      meta: {
        type: 'lesen',
        grade,
        titel: activeText.titel,
        durationMs: elapsedMs,
        totalWordsRead,
        correctWords,
        errorsCount,
        selfCorrectionsCount,
        accuracy,
        targetThreshold,
        rgw
      }
    });
  };

  const handlePrintText = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Lesetext: ${activeText.titel}</title>
            <style>
              body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
              h1 { font-size: 24px; color: #0f172a; margin-bottom: 8px; }
              .meta { font-size: 14px; color: #64748b; margin-bottom: 24px; }
              .text { font-size: 20px; word-spacing: 4px; letter-spacing: 0.5px; max-width: 600px; }
            </style>
          </head>
          <body>
            <h1>${activeText.titel}</h1>
            <div class="meta">Lesetext für die ${grade}. Schulstufe (Vorlege-Blatt für das Kind)</div>
            <div class="text">${activeText.text}</div>
            <script>window.print();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="bg-slate-50 rounded-3xl border border-slate-200/80 shadow-md overflow-hidden text-left font-sans">
      
      {/* 1. SETUP / CONFIG SCREEN */}
      {phase === 'setup' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <span className="inline-block px-2.5 py-0.5 bg-blue-100 text-blue-700 text-[0.625rem] font-bold uppercase tracking-widest rounded-full mb-1">
                Lese-Flüssigkeit
              </span>
              <h3 className="text-xl font-extrabold text-slate-800">📖 Leseflüssigkeits-Trainer</h3>
              <p className="text-xs text-slate-500 mt-1">Prüfung der Lesegeschwindigkeit (RGW/min) und Lesegenauigkeit.</p>
            </div>
            <button onClick={onClose} className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition-all">
              Schließen
            </button>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3 text-xs text-blue-900 leading-relaxed">
            <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Ablauf:</strong> Das Kind liest den ausgewählten Text laut vor. Starten Sie die Uhr. 
              Tippen Sie auf Wörter, um fehlerhaft gelesene Lautungen zu markieren (rot). 
              Tippen Sie per Rechtklick auf das letzte gelesene Wort am Ende der Lesung.
            </div>
          </div>

          {/* Stufen-Auswahl */}
          <div className="space-y-3">
            <label className="block text-[0.6875rem] font-black uppercase tracking-wider text-slate-400">Schulstufen-Differenzierung</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    grade === g 
                      ? 'bg-blue-600 border-blue-700 text-white font-extrabold shadow-sm' 
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <span className="block text-sm">Stufe {g}</span>
                  <span className="text-[0.625rem] opacity-75 font-normal">
                    {g === 1 ? '30-40 W.' : g === 2 ? '60-80 W.' : g === 3 ? '100-120 W.' : '150-180 W.'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Schüler-Anzeigen */}
          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between">
            <div>
              <span className="block text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">Kind am Tisch</span>
              <span className="text-sm font-extrabold text-slate-800">{student?.vorname} {student?.nachname}</span>
            </div>
            <div className="text-right">
              <span className="block text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">Klassifizierung</span>
              <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">Stufe {student?.besuchsjahr || 1}</span>
            </div>
          </div>

          {/* Text-Auswahl Rotation */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="block text-[0.6875rem] font-black uppercase tracking-wider text-slate-400">Ausgewählter Lesetext (3 rotierende Vorlagen)</label>
              <button
                onClick={() => setTextIndex(prev => (prev + 1) % 3)}
                className="text-xs text-blue-600 font-bold hover:underline"
              >
                Nächster Text 🔄
              </button>
            </div>
            <div className="p-4 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800">📖 {activeText.titel}</span>
                <span className="block text-[0.625rem] text-slate-400 mt-0.5">{words.length} Wörter</span>
              </div>
              <button
                onClick={handlePrintText}
                className="flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl transition-all"
              >
                <Printer size={14} /> Drucken
              </button>
            </div>
          </div>

          <button
            onClick={handleStartTest}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl shadow-sm hover:shadow transition-all text-center flex items-center justify-center gap-2 text-md"
          >
            <Play size={18} fill="white" /> Diagnose jetzt starten
          </button>
        </div>
      )}

      {/* 2. ACTIVE TEST SCREEN */}
      {phase === 'test' && (
        <div className="flex flex-col">
          {/* Header toolbar */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-[0.625rem] font-black uppercase tracking-wider block opacity-75">Lesediagnostik aktiv • Stufe {grade}</span>
              <h4 className="font-extrabold text-white text-md flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                Liest gerade: {student?.vorname}
              </h4>
            </div>
            
            {/* Typography Controls */}
            <div className="flex flex-wrap items-center gap-3 bg-white/10 p-1.5 rounded-xl border border-white/10 text-xs self-stretch md:self-auto justify-between">
              <div className="flex items-center gap-1.5 border-r border-white/10 pr-2">
                <span className="opacity-80">Schriftart:</span>
                <select 
                  value={fontFamilyClass} 
                  onChange={(e) => setFontFamilyClass(e.target.value as any)}
                  className="bg-slate-800 text-white border-none outline-none font-bold rounded px-1.5 py-0.5"
                >
                  <option value="font-serif">Serif</option>
                  <option value="font-sans">Sans</option>
                  <option value="font-mono">Mono</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="opacity-80 font-medium">Größe:</span>
                <button 
                  onClick={() => setFontSizeClass('text-xl')} 
                  className={`px-1.5 py-0.5 rounded font-black ${fontSizeClass === 'text-xl' ? 'bg-white text-blue-700' : 'text-white'}`}
                >
                  A
                </button>
                <button 
                  onClick={() => setFontSizeClass('text-2xl')} 
                  className={`px-1.5 py-0.5 rounded font-black ${fontSizeClass === 'text-2xl' ? 'bg-white text-blue-700' : 'text-white'}`}
                >
                  A+
                </button>
                <button 
                  onClick={() => setFontSizeClass('text-3xl')} 
                  className={`px-1.5 py-0.5 rounded font-black ${fontSizeClass === 'text-3xl' ? 'bg-white text-blue-700' : 'text-white'}`}
                >
                  A++
                </button>
              </div>
            </div>

            <button
              onClick={handleCancelTest}
              className="text-xs bg-white/15 hover:bg-white/25 border border-white/20 text-white px-3.5 py-1.5 rounded-xl transition-all font-black uppercase tracking-wider"
            >
              Abbrechen
            </button>
          </div>

          {/* Timer and Controls Frame */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col lg:flex-row items-center justify-between gap-4 bg-slate-100/50">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-bold">Text:</span>
              <span className="text-xs font-black text-slate-800 bg-white px-3 py-1.5 border border-slate-200 rounded-xl">📖 {activeText.titel}</span>
            </div>

            {/* Standardized 1-Minute Benchmark Alert Banner */}
            <AnimatePresence>
              {elapsedMs >= 60000 && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="bg-emerald-500 text-white px-4 py-1.5 rounded-2xl text-[0.6875rem] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm animate-pulse"
                >
                  🏆 60 Sekunden erreicht (SLS Richtzeit)!
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-4">
              {/* Dynamic pulsed circular elapsed time display */}
              <div className="flex items-center gap-3">
                <div className={`w-3.5 h-3.5 rounded-full ${timerRunning ? 'bg-red-500 animate-ping' : 'bg-slate-400'}`} />
                <div className="text-right">
                  <span className="block text-[0.5625rem] font-bold text-slate-400 uppercase tracking-wider">Verstrichene Zeit</span>
                  <span className={`text-xl font-black font-mono transition-colors ${elapsedMs >= 60000 ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {formatTime(elapsedMs)}
                  </span>
                </div>
              </div>

              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setTimerRunning(!timerRunning)}
                  className={`px-4 py-2.5 rounded-xl text-white font-extrabold text-xs transition-all flex items-center gap-1.5 ${
                    timerRunning ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700 shadow-md'
                  }`}
                >
                  {timerRunning ? (
                    <>
                      <Pause size={14} fill="white" /> Pause
                    </>
                  ) : (
                    <>
                      <Play size={14} fill="white" /> Starten
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTimerRunning(false);
                    setElapsedMs(0);
                    accumulatedTimeRef.current = 0;
                    setErrorWordIndices({});
                    setSelfCorrectionWordIndices({});
                    setLastReadWordIndex(-1);
                    setHasNotified60s(false);
                  }}
                  title="Zurücksetzen"
                  className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            
            {/* PREMIUM DIAGNOSTICS HUB */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100/80 p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Sparkles size={18} className="animate-pulse" />
                </span>
                <div className="text-left">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">Premium Diagnostik-Werkzeuge</span>
                  <span className="text-xs font-bold text-slate-700">Aktiviere Hilfestellungen und Begleitaufnahmen für das Kind.</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
                {/* 1. Silbenschrift Toggle */}
                <button
                  type="button"
                  onClick={() => setSyllableHighlight(!syllableHighlight)}
                  className={`flex-1 md:flex-initial px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    syllableHighlight 
                      ? 'bg-red-500 border-red-600 text-white shadow-md shadow-red-500/15' 
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="text-sm">🔴🔵</span>
                  <span>{syllableHighlight ? 'Silbenschrift Ein' : 'Silbenschrift Aus'}</span>
                </button>

                {/* 2. Audio-Aufnahme Toggle */}
                <button
                  type="button"
                  onClick={() => setIsRecording(!isRecording)}
                  className={`flex-1 md:flex-initial px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    isRecording 
                      ? 'bg-emerald-600 border-emerald-700 text-white shadow-md shadow-emerald-600/15 animate-pulse' 
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <Mic size={14} />
                  <span>{isRecording ? 'Aufnahme läuft...' : 'Aufnahme starten'}</span>
                </button>

                {/* 3. Schüler-Vollbildmodus */}
                <button
                  type="button"
                  onClick={() => setSchuelerMode(true)}
                  className="flex-1 md:flex-initial px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 border border-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/10"
                >
                  <Tv size={14} />
                  <span>Schüler-Ansicht</span>
                </button>
              </div>
            </div>

            {/* Simulated Voice Recording Waveform Visualizer */}
            <AnimatePresence>
              {isRecording && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Mund-zu-Ohr Audioaufzeichnung aktiv
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Simulierte Frequenz: 44.1 kHz</span>
                  </div>
                  {/* Beautiful animated audio bars */}
                  <div className="flex items-end justify-center gap-1 h-12 bg-white rounded-xl p-3 border border-emerald-100/50">
                    {Array.from({ length: 24 }).map((_, i) => {
                      const animDelay = (i * 0.05).toFixed(2);
                      return (
                        <motion.div
                          key={i}
                          animate={{ height: ['20%', '90%', '20%'] }}
                          transition={{ duration: 0.8 + Math.random() * 0.5, repeat: Infinity, delay: parseFloat(animDelay) }}
                          className="w-1.5 bg-emerald-400 rounded-full"
                          style={{ height: '30%' }}
                        />
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tablet Mode Selector - CRITICAL IMPROVEMENT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50">
              <button
                type="button"
                onClick={() => setTabletMode('mark')}
                className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  tabletMode === 'mark' 
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/40' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="text-sm">🔴 / 🟡</span>
                <span>Fehler / Selbstkorrektur markieren</span>
              </button>
              <button
                type="button"
                onClick={() => setTabletMode('last')}
                className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  tabletMode === 'last' 
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/40' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="text-sm">🏁</span>
                <span>Letztes gelesenes Wort setzen</span>
              </button>
            </div>

            {/* Instruction Banner */}
            <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2.5 text-xs text-blue-800 leading-normal">
              <Info size={16} className="mt-0.5 text-blue-600 flex-shrink-0" />
              <div>
                <strong>Anleitung:</strong> Starten Sie die Uhr. 
                {tabletMode === 'mark' ? (
                  <span>
                    {" "}Tippen Sie auf Wörter um sie als <span className="text-red-700 font-bold bg-red-100 px-1 rounded">Fehler</span> zu markieren. Ein zweiter Klick markiert eine <span className="text-amber-800 font-bold bg-amber-100 px-1 rounded">Selbstkorrektur</span> (wird nicht als Fehler gewertet!).
                  </span>
                ) : (
                  <span>
                    {" "}Tippen Sie auf das <strong>letzte gelesene Wort</strong>, um das Lesefeld abzugrenzen.
                  </span>
                )}
                {" "}Oder nutzen Sie wie gewohnt den <strong>Rechtsklick</strong> auf Desktop-Geräten.
              </div>
            </div>

            {/* Word board display - Touch targets enlarged, beautifully colored */}
            <div className={`p-6 sm:p-10 bg-white border border-slate-200 rounded-2xl min-h-[200px] leading-[2.5] flex flex-wrap gap-x-2 gap-y-3 select-none touch-manipulation border-dashed border-2 ${fontFamilyClass}`}>
              {words.map((word, idx) => {
                const isError = !!errorWordIndices[idx];
                const isSelfCorr = !!selfCorrectionWordIndices[idx];
                const isLast = lastReadWordIndex === idx;
                const isUntouchedAfterLast = lastReadWordIndex !== -1 && idx > lastReadWordIndex;

                let btnClass = `px-2 py-0.5 ${fontSizeClass} rounded-lg transition-all relative cursor-pointer active:scale-95 `;
                if (isError) {
                  btnClass += "bg-rose-100 text-rose-800 underline decoration-rose-500 decoration-wavy decoration-2 font-black shadow-3xs";
                } else if (isSelfCorr) {
                  btnClass += "bg-amber-100 text-amber-900 border border-dashed border-amber-400 font-bold shadow-3xs";
                } else if (isLast) {
                  btnClass += "text-slate-900 font-black bg-emerald-100 ring-2 ring-emerald-500 pr-3 relative pl-3";
                } else if (isUntouchedAfterLast) {
                  btnClass += "text-slate-350 opacity-40 pointer-events-none";
                } else {
                  btnClass += "text-slate-800 hover:bg-slate-100 font-medium border border-transparent";
                }

                return (
                  <span
                    key={idx}
                    onClick={() => handleWordClick(idx)}
                    onContextMenu={(e) => handleWordRightClick(idx, e)}
                    className={btnClass}
                  >
                    {syllableHighlight ? (
                      splitWordIntoSyllables(word).map((syll, sIdx) => (
                        <span 
                          key={sIdx} 
                          className={sIdx % 2 === 0 ? 'text-red-600 font-bold' : 'text-blue-600 font-bold'}
                        >
                          {syll}
                        </span>
                      ))
                    ) : (
                      word
                    )}
                    {isLast && (
                      <span className="absolute -top-3.5 -right-2 text-[10px] bg-emerald-600 text-white rounded-full p-0.5 font-bold shadow">
                        🏁
                      </span>
                    )}
                  </span>
                );
              })}
            </div>

            {/* Completion Buttons bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex flex-wrap gap-4 text-xs text-slate-600 justify-center">
                <div>Gelesen: <strong className="text-slate-900 font-mono">{totalWordsRead}</strong></div>
                <div className="w-px bg-slate-200 h-4 self-center" />
                <div>Fehler: <strong className="text-red-600 font-mono">{errorsCount}</strong></div>
                <div className="w-px bg-slate-200 h-4 self-center" />
                <div>Selbstkorrekturen: <strong className="text-amber-600 font-mono">{selfCorrectionsCount}</strong></div>
              </div>
              <button
                onClick={handleStopTest}
                disabled={elapsedMs === 0}
                className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
              >
                <CheckCircle size={15} /> Diagnose auswerten
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. DIAGNOSTIC RESULT SCREEN */}
      {phase === 'result' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-400 block uppercase">Testergebnis</span>
              <h3 className="text-xl font-extrabold text-slate-800">📊 Leseflüssigkeit Auswertung</h3>
            </div>
            <button
              onClick={handleStartTest}
              className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1"
            >
              <RotateCcw size={12} /> Test wiederholen
            </button>
          </div>

          {/* Scores board */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div className="p-4 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
              <span className="block text-[0.625rem] font-bold text-slate-400 uppercase">WPM-Leistung (RGW)</span>
              <span className="block text-2xl font-black text-slate-900 mt-1 font-mono">{rgw}</span>
              <span className="text-[0.625rem] text-slate-400 block mt-0.5">Soll: {targetThreshold} RGW/min</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
              <span className="block text-[0.625rem] font-bold text-slate-400 uppercase">Genauigkeits-Rate</span>
              <span className="block text-2xl font-black text-slate-900 mt-1 font-mono">{accuracy}%</span>
              <span className="text-[0.625rem] text-slate-400 block mt-0.5">Ziel: &gt;95% Genauigkeit</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
              <span className="block text-[0.625rem] font-bold text-slate-400 uppercase">Fehleranzahl</span>
              <span className="block text-2xl font-black text-rose-600 mt-1 font-mono">{errorsCount}</span>
              <span className="text-[0.625rem] text-slate-400 block mt-0.5">bei {totalWordsRead} Wörtern</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
              <span className="block text-[0.625rem] font-bold text-slate-400 uppercase">Selbstkorrekturen</span>
              <span className="block text-2xl font-black text-amber-600 mt-1 font-mono">{selfCorrectionsCount}</span>
              <span className="text-[0.625rem] text-slate-400 block mt-0.5">Spontane Korrektur</span>
            </div>

            <div className={`p-4 rounded-2xl text-center shadow-sm border col-span-2 lg:col-span-1 ${
              foerderbedarf ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <span className="block text-[0.625rem] font-black uppercase text-slate-500">Pädagogischer Prüfhinweis</span>
              <span className="block text-md font-bold mt-1">
                {rgw >= targetThreshold * 1.15 ? 'Sicher' : rgw >= targetThreshold ? 'Weiter beobachten' : 'Gezielt unterstützen'}
              </span>
              <span className="text-[0.625rem] opacity-75 block mt-0.5">{rgw < targetThreshold ? 'Unter dem hinterlegten Orientierungswert' : 'Im Orientierungsbereich dieses Kurzchecks'}</span>
            </div>

          </div>

          {/* Qualitative interpretation */}
          <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest">Pädagogische Einordnung</h4>
            <div className="text-xs text-slate-600 leading-relaxed space-y-2">
              {foerderbedarf ? (
                <p>
                  Das Kind liest mit <strong>{rgw} RGW/Minute</strong> deutlich unter dem Orientierungswert der {grade}. Klasse ({targetThreshold} RGW). 
                  Der Lesevorgang ist noch stark lautierend-buchtstabierend geprägt, wodurch das Arbeitsgedächtnis überfordert ist. Ein gezieltes 
                  Gezieltes Sichtwort- und Silbentraining kann als nächster Unterrichtsschritt erprobt und im Verlauf beobachtet werden.
                </p>
              ) : (
                <p>
                  🎉 Hervorragende Leseautomatisierung für das Niveau der {grade}. Klasse! Mit <strong>{rgw} RGW/Minute</strong> liegt das Kind 
                  über dem geforderten Richtwert ({targetThreshold} RGW). Der Lesevorgang läuft flüssig und entlastend ab, sodass wertvolle kognitive 
                  Ressourcen für das sinnentnehmende, verstehende Lesen und Erfassen bereitstehen.
                </p>
              )}
            </div>
          </div>

          {/* Observations input */}
          <div className="space-y-2">
            <label className="block text-[0.6875rem] font-black uppercase tracking-wider text-slate-400">Lehrbeobachtungen (Optional)</label>
            <textarea
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="z.B. Liest sehr hektisch, korrigiert sich selten, deutliche Atemschwierigkeiten bei langen Wörtern..."
              className="w-full text-xs p-3 bg-white border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
            />
          </div>

          {/* Action buttons footer */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setPhase('setup')}
              className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-all"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSaveResult}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl text-xs transition-all shadow-sm flex items-center gap-1.5"
            >
              <Save size={14} /> Testergebnis speichern
            </button>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRMATION POPUP OVERLAY */}
      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl max-w-sm w-full space-y-4 text-center"
            >
              <h4 className="text-md font-extrabold text-slate-800">Laufenden Test abbrechen?</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Sind Sie sicher, dass Sie die Lesediagnose abbrechen möchten? Alle bisherigen Messergebnisse dieses Durchgangs gehen verloren.
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
                >
                  Nein, weiterlesen
                </button>
                <button
                  type="button"
                  onClick={confirmCancel}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all"
                >
                  Ja, abbrechen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SCHÜLER-VOLLBILDMODUS MODAL */}
      <AnimatePresence>
        {schuelerMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-amber-50/95 z-[99999] flex flex-col p-6 sm:p-12 overflow-y-auto select-none"
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-amber-100 pb-4 mb-8">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🌟</span>
                <div className="text-left">
                  <span className="text-xs font-black text-amber-700 uppercase tracking-widest block">Hallo {student?.vorname}!</span>
                  <h3 className="text-xl font-black text-slate-800">Lies diesen Text ganz entspannt vor.</h3>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSyllableHighlight(!syllableHighlight)}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                    syllableHighlight 
                      ? 'bg-red-500 border-red-600 text-white shadow-md' 
                      : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  🔴🔵 Silben-Hilfe
                </button>
                <button
                  type="button"
                  onClick={() => setSchuelerMode(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  Schließen
                </button>
              </div>
            </div>

            {/* Giant, beautiful text container */}
            <div className="flex-1 flex items-center justify-center max-w-4xl mx-auto w-full">
              <div className="bg-white rounded-[2.5rem] p-10 sm:p-16 shadow-xl border border-amber-100 text-left relative min-h-[350px]">
                {/* Floating badge */}
                <div className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  <Sparkles size={11} /> {activeText.titel}
                </div>

                <p className={`leading-[2.5] text-slate-800 tracking-wide select-none ${fontFamilyClass} text-3xl font-medium whitespace-pre-line`}>
                  {words.map((word, idx) => (
                    <span 
                      key={idx}
                      className="inline-block mr-3"
                    >
                      {syllableHighlight ? (
                        splitWordIntoSyllables(word).map((syll, sIdx) => (
                          <span 
                            key={sIdx} 
                            className={sIdx % 2 === 0 ? 'text-red-500 font-extrabold' : 'text-blue-500 font-extrabold'}
                          >
                            {syll}
                          </span>
                        ))
                      ) : (
                        word
                      )}
                    </span>
                  ))}
                </p>
              </div>
            </div>

            {/* Soft footer */}
            <div className="mt-8 text-center text-xs text-amber-600 font-medium">
              Du machst das toll! Lass dir so viel Zeit, wie du brauchst. ✨
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
