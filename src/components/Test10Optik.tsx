import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Save, ArrowLeft, Check, X, AlertTriangle, Eye, HelpCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface TestProps {
  studentId: string;
  initialGrade: number;
  onClose: () => void;
  onSave: (result: {
    testId: string;
    score: number; // total correct items / 18
    foerderbedarf: boolean;
    note: string;
    meta?: any;
  }) => void;
}

interface LetterTask {
  char: string;
}

interface SearchTask {
  row: string;
  target: string;
}

interface NumberTask {
  numStr: string;
  expected: string;
}

export const Test10Optik: React.FC<TestProps> = ({ studentId, initialGrade, onClose, onSave }) => {
  const { app } = useApp();
  const student = app.schueler.find(s => s.id === studentId);

  const [grade, setGrade] = useState<number>(initialGrade || 1);
  const [phase, setPhase] = useState<'setup' | 'test' | 'result'>('setup');
  
  // Test states
  const [testStage, setTestStage] = useState<'letters' | 'search' | 'numbers'>('letters');
  const [stageIndex, setStageIndex] = useState<number>(0);
  
  // Results structures
  // Letters: correct/incorrect booleans
  const [letterResults, setLetterResults] = useState<boolean[]>([]);
  // Search: results containing clicked indices, correct indexes, and stats
  const [searchResults, setSearchResults] = useState<{
    correctCount: number;
    missedCount: number;
    falselyMarkedCount: number;
  }[]>([]);
  // Current search selected indices
  const [currentSearchSelections, setCurrentSearchSelections] = useState<number[]>([]);
  
  // Number/word reading results
  const [numberResults, setNumberResults] = useState<boolean[]>([]);

  const [kommentar, setKommentar] = useState<string>('');
  const [showSolution, setShowSolution] = useState<boolean>(false);

  useEffect(() => {
    setShowSolution(false);
  }, [testStage, stageIndex]);

  // Generate dynamic tasks based on Grade (Stufe)
  const tasks = React.useMemo(() => {
    // Mode 1: Letters (6 items)
    const letters: LetterTask[] = grade === 1 
      ? [{ char: 'b' }, { char: 'd' }, { char: 'b' }, { char: 'd' }, { char: 'b' }, { char: 'd' }]
      : [{ char: 'b' }, { char: 'd' }, { char: 'p' }, { char: 'q' }, { char: 'd' }, { char: 'p' }];

    // Mode 2: Search rows (6 items)
    let search: SearchTask[] = [];
    if (grade === 1) {
      search = [
        { row: 'b d b b d d', target: 'b' },
        { row: 'd b d d b b', target: 'd' },
        { row: 'b b d b d b', target: 'b' },
        { row: 'd d b d b d', target: 'd' },
        { row: 'b d d b b d', target: 'b' },
        { row: 'd b b d d b', target: 'd' }
      ];
    } else if (grade === 2) {
      search = [
        { row: 'b d p q b d p q', target: 'b' },
        { row: 'q p d b q p d b', target: 'q' },
        { row: 'p d q b p d q b', target: 'p' },
        { row: 'b b d p p q d q', target: 'd' },
        { row: 'p q p q b b d d', target: 'q' },
        { row: 'd b p q d b p q', target: 'b' }
      ];
    } else if (grade === 3) {
      search = [
        { row: 'die bunte Blume blüht', target: 'b' },
        { row: 'drei dicke Dachse drehen sich', target: 'd' },
        { row: 'quakende Quappen quetschen Querflöten', target: 'q' },
        { row: 'pfeilschnelle Papageien picken Popcorn', target: 'p' },
        { row: 'bunte Bilder bringen Freude', target: 'b' },
        { row: 'der dicke Diener dankt', target: 'd' }
      ];
    } else { // Grade 4: similar word pairs
      search = [
        { row: 'Bart Brat Bart Brat Brat Bart', target: 'Bart' },
        { row: 'Form Fron Form Fron Fron Form', target: 'Form' },
        { row: 'Kahn Kahn Kahn Kann Kann Kahn', target: 'Kahn' },
        { row: 'Mehl Mehr Mehl Mehr Mehl Mehr', target: 'Mehl' },
        { row: 'Rippe Riemen Rippe Riemen Rippe', target: 'Rippe' },
        { row: 'Teig Teig Teich Teig Teich Teich', target: 'Teig' }
      ];
    }

    // Mode 3: Numbers (6 items)
    let numbers: NumberTask[] = [];
    if (grade === 1) { // simple zweistellig b/d-Zahlendreher
      numbers = [
        { numStr: '13', expected: 'dreizehn (nicht einunddreißig 31)' },
        { numStr: '21', expected: 'einundzwanzig (nicht zwölf 12)' },
        { numStr: '45', expected: 'fünfundvierzig (nicht vierundfünfzig 54)' },
        { numStr: '17', expected: 'siebzehn (nicht einundsiebzig 71)' },
        { numStr: '35', expected: 'fünfunddreißig (nicht dreiundfünfzig 53)' },
        { numStr: '19', expected: 'neunzehn (nicht einundneunzig 91)' }
      ];
    } else if (grade === 2) { // 2-stellige komplexere Dreher
      numbers = [
        { numStr: '38', expected: 'achtunddreißig (nicht dreiundachtzig 83)' },
        { numStr: '47', expected: 'siebenundvierzig (nicht vierundsiebzig 74)' },
        { numStr: '62', expected: 'zweiundsechzig (nicht sechsundzwanzig 26)' },
        { numStr: '89', expected: 'neunundachtzig (nicht achtundneunzig 98)' },
        { numStr: '51', expected: 'einundfünfzig (nicht fünfzehn 15)' },
        { numStr: '93', expected: 'dreiundneunzig (nicht neununddreißig 39)' }
      ];
    } else if (grade === 3) { // 3-stellige Stellenwert-Spiegelungen
      numbers = [
        { numStr: '143', expected: 'einhundertdreiundvierzig (nicht 134)' },
        { numStr: '308', expected: 'dreihundertacht (nicht 380)' },
        { numStr: '521', expected: 'fünfhunderteinundzwanzig (nicht 512)' },
        { numStr: '674', expected: 'sechshundertvierundsiebzig (nicht 647)' },
        { numStr: '809', expected: 'achthundertneun (nicht 890)' },
        { numStr: '495', expected: 'vierhundertfünfundneunzig (nicht 459)' }
      ];
    } else { // Grade 4: 4-stellige
      numbers = [
        { numStr: '1043', expected: 'tausenddreiundvierzig (nicht 1034)' },
        { numStr: '4302', expected: 'viertausenddreihundertzwei (nicht 4320)' },
        { numStr: '8801', expected: 'achttausendachthunderteins (nicht 8810)' },
        { numStr: '5612', expected: 'fünftausendsechshunderzwölf (nicht 5621)' },
        { numStr: '3197', expected: 'dreitausendeinhundertsiebenundneunzig (nicht 3179)' },
        { numStr: '7024', expected: 'siebentausendvierundzwanzig (nicht 7042)' }
      ];
    }

    return { letters, search, numbers };
  }, [grade]);

  const handleLetterResponse = (success: boolean) => {
    setLetterResults(prev => [...prev, success]);
    if (stageIndex + 1 < 6) {
      setStageIndex(stageIndex + 1);
    } else {
      setTestStage('search');
      setStageIndex(0);
    }
  };

  const handleSearchNext = () => {
    // Current task
    const task = tasks.search[stageIndex];
    // Evaluate selections
    // The string is split by spaces or characters
    // S1, S2, S3, S4 characters setup
    const tokens = grade === 3 || grade === 4 
      ? task.row.split(' ') // split by words
      : task.row.replace(/\s+/g, '').split(''); // split by characters
    
    let correctIndices: number[] = [];
    tokens.forEach((tok, idx) => {
      if (grade === 3 || grade === 4) {
        // Find if contains spelling target
        if (grade === 3) {
          // looking for a character inside word
          if (tok.toLowerCase().includes(task.target)) {
            correctIndices.push(idx);
          }
        } else {
          // exact matching word
          if (tok === task.target) {
            correctIndices.push(idx);
          }
        }
      } else {
        // letter matches target
        if (tok === task.target) {
          correctIndices.push(idx);
        }
      }
    });

    let correctCount = 0;
    let missedCount = 0;
    let falselyMarkedCount = 0;

    tokens.forEach((_, idx) => {
      const isSelected = currentSearchSelections.includes(idx);
      const shouldBeSelected = correctIndices.includes(idx);

      if (isSelected && shouldBeSelected) {
        correctCount++;
      } else if (!isSelected && shouldBeSelected) {
        missedCount++;
      } else if (isSelected && !shouldBeSelected) {
        falselyMarkedCount++;
      }
    });

    setSearchResults(prev => [...prev, { correctCount, missedCount, falselyMarkedCount }]);
    setCurrentSearchSelections([]);

    if (stageIndex + 1 < 6) {
      setStageIndex(stageIndex + 1);
    } else {
      setTestStage('numbers');
      setStageIndex(0);
    }
  };

  const toggleSearchSelection = (index: number) => {
    if (currentSearchSelections.includes(index)) {
      setCurrentSearchSelections(prev => prev.filter(i => i !== index));
    } else {
      setCurrentSearchSelections(prev => [...prev, index]);
    }
  };

  const handleNumberResponse = (success: boolean) => {
    setNumberResults(prev => [...prev, success]);
    if (stageIndex + 1 < 6) {
      setStageIndex(stageIndex + 1);
    } else {
      setPhase('result');
    }
  };

  // Score computation
  // Let's compute out of 18
  const lettersCorrect = letterResults.filter(Boolean).length;
  // Search is correct if exact correct targets were clicked and no false markers
  const searchCorrect = searchResults.filter(res => res.missedCount === 0 && res.falselyMarkedCount === 0).length;
  const numbersCorrect = numberResults.filter(Boolean).length;
  const totalCorrect = lettersCorrect + searchCorrect + numbersCorrect;

  const handleSave = () => {
    if (!student) return;

    // Warning ab Stufe 2
    const hasSpaceIssue = (grade >= 2) && (lettersCorrect < 4 || searchCorrect < 4);
    
    const warningNotice = hasSpaceIssue 
      ? '**Beobachtungshinweis: Ähnliche Buchstaben wurden in diesem Durchgang häufig verwechselt. Das ist kein eigenständiger Nachweis einer Raumlage- oder Lese-Rechtschreibstörung.**\n\n'
      : '';

    const summary = `### Optische Differenzierung & Wahrnehmung (Stufe ${grade})\n\n` +
      warningNotice +
      `**Ergebnis-Zusammenfassung (Summe: ${totalCorrect}/18 correct)**:\n` +
      `- Buchstabenerkennung: ${lettersCorrect}/6 richtig benannt\n` +
      `- Buchstabensuchen: ${searchCorrect}/6 Reihen perfekt erfasst\n` +
      `- Zahlendreher-Lesen: ${numbersCorrect}/6 korrekt vorgelesen\n\n` +
      `**Rohdaten**: \n` +
      `- Buchstaben: ${letterResults.map((r, i) => `${tasks.letters[i].char}: ${r ? '✓' : '✗'}`).join(', ')}\n` +
      `- Suchen: ${searchResults.map((r, i) => `Rnd ${i+1} (${tasks.search[i].target}): Treffer ${r.correctCount}, Übersehen: ${r.missedCount}, Fehlklicks: ${r.falselyMarkedCount}`).join('\n  ')}\n` +
      `- Zahlendreher: ${numberResults.map((r, i) => `${tasks.numbers[i].numStr}: ${r ? '✓' : '✗'}`).join(', ')}` +
      (kommentar ? `\n\n**Lehrer-Notiz**: ${kommentar}` : '');

    onSave({
      testId: 'live-optik',
      score: totalCorrect,
      foerderbedarf: totalCorrect < 13 || hasSpaceIssue,
      note: summary,
      meta: {
        grade,
        totalCorrect,
        lettersCorrect,
        searchCorrect,
        numbersCorrect,
        letterResults,
        searchResults,
        numberResults,
        kommentar,
        hasSpaceIssue
      }
    });

    onClose();
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="bg-gradient-to-r from-fuchsia-500 to-purple-600 rounded-[2rem] text-white p-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-md text-left">
        <div>
          <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full mb-1">
            Optische Wahrnehmung & Differenzierung
          </span>
          <h2 className="text-[1.25rem] font-black tracking-tight flex items-center gap-2">
            👀 Optische Differenzierung (b/d, p/q, Zahlendreher)
          </h2>
          <p className="text-[0.75rem] text-fuchsia-50">
            Schüler: <strong>{student?.vorname} {student?.nachname}</strong>
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[0.75rem] font-bold rounded-xl transition-all"
        >
          Beenden
        </button>
      </div>

      {phase === 'setup' && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center space-y-6">
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-[1.25rem] font-bold text-slate-800">Schulstufe wählen</h3>
            <p className="text-xs text-slate-500 font-sans">
              Die Aufgaben-Schwierigkeit, die Suchbegriffe und die Stellenzahl der Dreher passen sich der Schulstufe an.
            </p>
          </div>

          <div className="flex justify-center gap-2 max-w-sm mx-auto">
            {[1, 2, 3, 4].map(g => (
              <button
                key={g}
                onClick={() => setGrade(g)}
                className={`w-12 h-12 rounded-xl font-black text-sm flex items-center justify-center transition-all border ${grade === g ? 'bg-fuchsia-500 border-fuchsia-500 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="max-w-md mx-auto border-2 border-dashed border-slate-100 rounded-2xl p-5 text-left bg-slate-50/50 space-y-2">
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wide">Testaufbau ({grade}. Klasse):</h4>
            <ul className="text-xs text-slate-600 space-y-1.5 font-sans list-disc list-inside">
              <li><strong>Teil 1: Buchstaben benennen</strong> ({grade === 1 ? 'nur b/d' : 'b/d/p/q'}, 6 Runden)</li>
              <li><strong>Teil 2: Zeichen suchen</strong> ({grade === 1 ? '6er Reihen' : grade === 2 ? '8-10er' : grade === 3 ? 'In Wörtern' : 'Wortpaare lesen'}, 6 Runden)</li>
              <li><strong>Teil 3: Zahlendreher</strong> ({grade === 1 || grade === 2 ? 'zweistellig' : grade === 3 ? 'dreistellig' : 'vierstellig'}, 6 Runden)</li>
            </ul>
          </div>

          <button
            onClick={() => {
              setLetterResults([]);
              setSearchResults([]);
              setNumberResults([]);
              setTestStage('letters');
              setStageIndex(0);
              setPhase('test');
            }}
            className="px-12 py-4 bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-black rounded-2xl uppercase tracking-wider text-xs shadow-lg shadow-fuchsia-500/20 active:scale-95 transition-all"
          >
            Starten
          </button>
        </motion.div>
      )}

      {phase === 'test' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm text-center space-y-8">
          
          {/* PROGRESS SUBHEADER */}
          <div className="flex justify-between items-center border-b pb-4 text-slate-500 text-xs">
            <span className="font-bold uppercase tracking-widest text-fuchsia-600">
              {testStage === 'letters' ? 'Teil 1: Buchstaben erkennen' : testStage === 'search' ? 'Teil 2: Reihen suchen' : 'Teil 3: Zahlendreher'}
            </span>
            <span className="font-mono font-bold">Aufgabe {stageIndex + 1} von 6</span>
          </div>

          {/* ACTIVE TRIAL DISPLAY */}
          <div className="py-12 bg-slate-50 border-2 border-slate-100/70 rounded-[2.5rem] shadow-[inset_0_4px_16px_rgba(0,0,0,0.02)] flex flex-col justify-center items-center min-h-[220px]">
            
            {testStage === 'letters' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-400 font-sans font-semibold">Lass das Kind diesen Buchstaben benennen:</p>
                <span className="text-8xl sm:text-9xl font-black text-slate-900 select-none tracking-wide font-sans lowercase">
                  {tasks.letters[stageIndex]?.char}
                </span>
              </div>
            )}

            {testStage === 'search' && (
              <div className="space-y-6 w-full px-6">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-sans font-semibold">Aufgabe an das Kind:</p>
                  <p className="text-md font-bold text-fuchsia-600 font-sans">
                    {grade === 3 
                      ? `Tippe alle Wörter an, die den Buchstaben "${tasks.search[stageIndex]?.target}" enthalten:`
                      : grade === 4 
                      ? `Tippe alle exakten Wörter "${tasks.search[stageIndex]?.target}" an:` 
                      : `Tippe/Zeige alle "${tasks.search[stageIndex]?.target}" an:`}
                  </p>
                </div>

                {/* CLICKABLE CHARACTERS OR WORDS LIST */}
                <div className="flex flex-wrap gap-3 justify-center items-center py-6">
                  {(grade >= 3 
                    ? tasks.search[stageIndex]?.row.split(' ') 
                    : tasks.search[stageIndex]?.row.replace(/\s+/g, '').split('')
                  ).map((item, idx) => {
                    const isSelected = currentSearchSelections.includes(idx);
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleSearchSelection(idx)}
                        className={`py-3 px-5 text-xl sm:text-2xl font-bold rounded-2xl select-none transition-all shadow-sm border ${isSelected ? 'bg-fuchsia-500 border-fuchsia-600 text-white transform scale-105' : 'bg-white border-slate-200 text-slate-800 hover:border-fuchsia-300'}`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {testStage === 'numbers' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-400 font-sans font-semibold">Lass das Kind diese Zahl laut vorlesen:</p>
                <span className="text-6xl sm:text-7xl font-sans font-black text-slate-800 tracking-wider">
                  {tasks.numbers[stageIndex]?.numStr}
                </span>
              </div>
            )}

          </div>

          {/* ACTIONS AND ASSESSMENT */}
          <div className="max-w-md mx-auto">
            {testStage === 'letters' && (
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Lehrer-Bewertung:</p>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleLetterResponse(true)}
                    className="py-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-sm flex justify-center items-center gap-2"
                  >
                    <Check size={18} /> Richtig benannt
                  </button>
                  <button
                    onClick={() => handleLetterResponse(false)}
                    className="py-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-sm flex justify-center items-center gap-2"
                  >
                    <X size={18} /> Fehlerhaft oder vertauscht
                  </button>
                </div>
              </div>
            )}

            {testStage === 'search' && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-[0.6875rem] text-slate-400 font-sans italic">
                  Tippe die getroffenen Elemente auf dem Bildschirm an, klicke anschließend auf "Nächste" für die automatisierte Auswertung.
                </p>
                <button
                  onClick={handleSearchNext}
                  className="px-10 py-4 bg-fuchsia-500 hover:bg-fuchsia-600 text-white rounded-2xl font-black uppercase text-xs tracking-wider transition-all shadow-md"
                >
                  Nächste Reihe
                </button>
              </div>
            )}

            {testStage === 'numbers' && (
              <div className="space-y-4">
                <div className="p-3 bg-fuchsia-50 rounded-xl border border-fuchsia-100/50 text-[0.625rem] text-fuchsia-700 font-sans font-bold leading-normal flex items-center justify-between gap-2 min-h-[46px]">
                  {showSolution ? (
                    <span>Sollte gelesen werden als: <span className="underline">{tasks.numbers[stageIndex]?.expected}</span></span>
                  ) : (
                    <span>Sollte gelesen werden als: <button
                      onClick={() => setShowSolution(true)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-[0.625rem] font-bold text-slate-500 rounded border border-slate-200 transition-all ml-1.5"
                    >
                      💡 Lösung anzeigen
                    </button></span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleNumberResponse(true)}
                    className="py-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-sm flex justify-center items-center gap-1.5"
                  >
                    <Check size={18} /> Richtig gelesen
                  </button>
                  <button
                    onClick={() => handleNumberResponse(false)}
                    className="py-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-sm flex justify-center items-center gap-1.5"
                  >
                    <X size={18} /> Dreher / Zahlendreher
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {phase === 'result' && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-md max-w-2xl mx-auto space-y-6 text-center">
          <div className="w-16 h-16 bg-fuchsia-50 rounded-2xl flex items-center justify-center text-fuchsia-600 mx-auto">
            <Eye size={36} />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-800">Testergebnis Optische Differenzierung</h3>
            <p className="text-xs text-slate-500 font-sans">Schulstufe {grade}</p>
          </div>

          {/* TOTAL SCORE */}
          <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl inline-block px-10">
            <span className="text-[0.625rem] font-black uppercase text-slate-400 block mb-1">Gesamtpunktzahl</span>
            <span className="text-4xl font-black text-slate-800">{totalCorrect}</span>
            <span className="text-slate-400 text-sm font-bold"> / 18</span>
          </div>

          {/* GRID SPLIT */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="bg-stone-50 border p-4 rounded-xl">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Teil 1: Buchstaben</span>
              <p className="text-lg font-black mt-1 text-slate-700">{lettersCorrect} / 6 richtig</p>
            </div>
            <div className="bg-stone-50 border p-4 rounded-xl">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Teil 2: Suchen</span>
              <p className="text-lg font-black mt-1 text-slate-700">{searchCorrect} / 6 fehlerfrei</p>
            </div>
            <div className="bg-stone-50 border p-4 rounded-xl">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Teil 3: Zahlendreher</span>
              <p className="text-lg font-black mt-1 text-slate-700">{numbersCorrect} / 6 fehlerfrei</p>
            </div>
          </div>

          {/* ADVISORY */}
          {(grade >= 2 && (lettersCorrect < 4 || searchCorrect < 4)) && (
            <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-100 flex items-start gap-3 text-left">
              <AlertTriangle size={24} className="shrink-0 text-rose-500 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs">💡 Raumlage-Schwäche vermuten</h4>
                <p className="text-[11px] text-rose-600 leading-relaxed mt-1">
                  Häufige b/d-Verwechslungen oder Leseschwierigkeiten in Stufe 2 oder höher können ein starker Hinweis auf eine visuelle Raumlage-Orientierungsschwäche sein. Wir empfehlen gezielte räumlich-visuelle Übungen.
                </p>
              </div>
            </div>
          )}

          {/* CUSTOM NOTES */}
          <div className="text-left space-y-2">
            <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Pädagogische Notiz (optional)</label>
            <textarea
              value={kommentar}
              onChange={e => setKommentar(e.target.value)}
              placeholder="z.B. Liest in b/d fehlerlos, vertauscht aber im Lesefluss manchmal p/q..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-fuchsia-500 font-sans"
            />
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t">
            <button
              onClick={() => {
                setLetterResults([]);
                setSearchResults([]);
                setNumberResults([]);
                setTestStage('letters');
                setStageIndex(0);
                setPhase('setup');
              }}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
            >
              Wiederholen
            </button>
            <button
              onClick={handleSave}
              className="px-8 py-3 bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-fuchsia-500/25 transition-all flex items-center gap-1.5"
            >
              <Save size={16} /> Speichern
            </button>
          </div>
        </motion.div>
      )}

    </div>
  );
};
