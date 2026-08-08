import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, RotateCcw, Check, X, Save, ArrowLeft, Info, HelpCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import confetti from 'canvas-confetti';

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

type TestType = 'numbers' | 'words';
type TestMode = 'forward' | 'backward';

const WORDS_POOL = [
  'Baum', 'Haus', 'Fisch', 'Katze', 'Buch', 'Sonne', 'Vogel', 'Tisch', 'Sessel', 'Blume', 
  'Schiff', 'Maus', 'Stift', 'Regen', 'Weg', 'Brot', 'Pause', 'Bruder', 'Sommer', 'Hütte'
];

export const Test8Zahlenspanne: React.FC<TestProps> = ({
  studentId,
  initialGrade,
  onClose,
  onSave
}) => {
  const { app } = useApp();
  const student = app.schueler.find(s => s.id === studentId);

  // Phase states: 'setup' | 'explain' | 'showing' | 'input' | 'feedback' | 'finish'
  const [phase, setPhase] = useState<'setup' | 'start' | 'showing' | 'input' | 'feedback' | 'finish'>('setup');
  const [grade, setGrade] = useState<number>(initialGrade || 1);
  const [testType, setTestType] = useState<TestType>('numbers'); // 'numbers' or 'words' (only available if grade >= 3)
  const [testMode, setTestMode] = useState<TestMode>('forward'); // 'forward' or 'backward'
  
  // Game limits
  const [currentLength, setCurrentLength] = useState<number>(3);
  const [trial, setTrial] = useState<number>(1); // 1 or 2
  const [sequence, setSequence] = useState<string[]>([]); // holds either numbers e.g. ["4", "7", "1"] or words e.g. ["Baum", "Haus"]
  const [showingIndex, setShowingIndex] = useState<number>(-1);
  const [userInput, setUserInput] = useState<string[]>([]);
  const [histories, setHistories] = useState<Array<{
    length: number;
    trial: number;
    sequence: string[];
    input: string[];
    correct: boolean;
  }>>([]);

  const [maxForwardSpan, setMaxForwardSpan] = useState<number>(0);
  const [maxBackwardSpan, setMaxBackwardSpan] = useState<number>(0);
  const [customNote, setCustomNote] = useState<string>('');
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);
  const [schuelerModus, setSchuelerModus] = useState<boolean>(false);

  // Audio tone helper
  const playSineTone = useCallback((freq: number, duration: number = 0.1) => {
    try {
      const gCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = gCtx.createOscillator();
      const gain = gCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, gCtx.currentTime);
      gain.gain.setValueAtTime(0.08, gCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, gCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(gCtx.destination);
      osc.start();
      osc.stop(gCtx.currentTime + duration);
    } catch (e) {
      // Ignore audio contexts blocks on preview
    }
  }, []);

  const playDigitTone = useCallback((item: string) => {
    // Beautiful major pentatonic values
    const freqMap: Record<string, number> = {
      '0': 261.63, // C4
      '1': 293.66, // D4
      '2': 329.63, // E4
      '3': 392.00, // G4
      '4': 440.00, // A4
      '5': 523.25, // C5
      '6': 587.33, // D5
      '7': 659.25, // E5
      '8': 783.99, // G5
      '9': 880.00, // A5
    };
    
    let freq = 330; 
    if (freqMap[item]) {
      freq = freqMap[item];
    } else if (item) {
      let sum = 0;
      for (let i = 0; i < item.length; i++) sum += item.charCodeAt(i);
      freq = 220 + (sum % 8) * 55;
    }
    playSineTone(freq, 0.45);
  }, [playSineTone]);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') {
        return;
      }

      if (phase === 'start' && e.code === 'Space') {
        e.preventDefault();
        handleTriggerNextTrial();
      } else if (phase === 'input') {
        if (testType === 'numbers') {
          if (e.key >= '0' && e.key <= '9') {
            e.preventDefault();
            handleItemInput(e.key);
          }
        }
        if (e.key === 'Backspace') {
          e.preventDefault();
          setUserInput([]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, userInput, sequence, testType, testMode]);

  // Update modes based on grade selection
  useEffect(() => {
    if (grade < 3) {
      setTestType('numbers');
    }
  }, [grade]);

  // Generate sequence items
  const handleGenerateSequence = (len: number): string[] => {
    const seqArr: string[] = [];
    if (testType === 'numbers') {
      for (let i = 0; i < len; i++) {
        let numStr = Math.floor(Math.random() * 10).toString();
        // Avoid repeating adjacent digits
        while (seqArr.length > 0 && numStr === seqArr[seqArr.length - 1]) {
          numStr = Math.floor(Math.random() * 10).toString();
        }
        seqArr.push(numStr);
      }
    } else {
      // Words
      const shuffledArr = [...WORDS_POOL].sort(() => 0.5 - Math.random());
      for (let i = 0; i < len; i++) {
        seqArr.push(shuffledArr[i % shuffledArr.length]);
      }
    }
    return seqArr;
  };

  const handleStartTest = () => {
    setPhase('start');
    setCurrentLength(grade === 1 ? 2 : 3);
    setTrial(1);
    setUserInput([]);
    setHistories([]);
    setMaxForwardSpan(0);
    setMaxBackwardSpan(0);
  };

  const handleTriggerNextTrial = () => {
    const seq = handleGenerateSequence(currentLength);
    setSequence(seq);
    setUserInput([]);
    setShowingIndex(0);
    setPhase('showing');
    playSineTone(440, 0.25);
  };

  // Showing presentation effect
  useEffect(() => {
    if (phase === 'showing' && showingIndex >= 0 && showingIndex < sequence.length) {
      const showDelay = testType === 'words' ? 1400 : 1000;
      const timer = setTimeout(() => {
        setShowingIndex(prev => prev + 1);
      }, showDelay);
      return () => clearTimeout(timer);
    } else if (phase === 'showing' && showingIndex >= sequence.length) {
      const postDelay = setTimeout(() => {
        setPhase('input');
        setShowingIndex(-1);
      }, 400);
      return () => clearTimeout(postDelay);
    }
  }, [phase, showingIndex, sequence, testType]);

  // Play sound when showingIndex updates during presentation
  useEffect(() => {
    if (phase === 'showing' && showingIndex >= 0 && showingIndex < sequence.length) {
      const item = sequence[showingIndex];
      playDigitTone(item);
    }
  }, [phase, showingIndex, sequence, playDigitTone]);

  // Handle numbers / words clicks
  const handleItemInput = (item: string) => {
    if (phase !== 'input') return;
    const newInput = [...userInput, item];
    setUserInput(newInput);
    playDigitTone(item);

    if (newInput.length === sequence.length) {
      handleEvaluateInput(newInput);
    }
  };

  const handleEvaluateInput = (input: string[]) => {
    const expected = testMode === 'forward' ? sequence : [...sequence].reverse();
    const isCorrect = input.every((v, idx) => v.toLowerCase().trim() === expected[idx].toLowerCase().trim());

    setPhase('feedback');

    const historyItem = {
      length: currentLength,
      trial,
      sequence: [...sequence],
      input: [...input],
      correct: isCorrect
    };

    const newHistList = [...histories, historyItem];
    setHistories(newHistList);

    if (isCorrect) {
      confetti({ particleCount: 30, spread: 35, colors: ['#6366f1', '#4f46e5'] });
      playSineTone(660, 0.3);

      if (testMode === 'forward') {
        setMaxForwardSpan(currentLength);
      } else {
        setMaxBackwardSpan(currentLength);
      }

      // Progress length
      setTimeout(() => {
        setCurrentLength(prev => prev + 1);
        setTrial(1);
        setPhase('start');
      }, 1500);

    } else {
      // Wrong response
      playSineTone(290, 0.35);

      if (trial === 1) {
        // Try the second trial at the same length
        setTimeout(() => {
          setTrial(2);
          setPhase('start');
        }, 1500);
      } else {
        // Failing twice at length -> transition to score screen
        setTimeout(() => {
          setPhase('finish');
        }, 1550);
      }
    }
  };

  // Guidelines criteria based on grade selected
  // Stufe 1: 4 vorwärts/2 rückwärts, Stufe 2: 4-5/3, Stufe 3: 5/3-4, Stufe 4: 5-6/4
  const getNormMinima = (g: number) => {
    if (g === 1) return { fw: 4, bw: 2 };
    if (g === 2) return { fw: 4, bw: 3 }; // minimum 4, safe 5
    if (g === 3) return { fw: 5, bw: 3 }; // minimum 5, safe 3-4
    return { fw: 5, bw: 4 };
  };

  const norms = getNormMinima(grade);
  const activeScoreVal = testMode === 'forward' ? maxForwardSpan : maxBackwardSpan;
  const foerderbedarf = testMode === 'forward' 
    ? activeScoreVal < norms.fw 
    : activeScoreVal < norms.bw;

  const handleSaveResult = () => {
    const fwScoreText = maxForwardSpan > 0 ? `${maxForwardSpan} Stellen` : 'Nicht gemessen';
    const bwScoreText = maxBackwardSpan > 0 ? `${maxBackwardSpan} Stellen` : 'Nicht gemessen';
    const subTypeLabel = testType === 'words' ? 'Auditiven Wortspanne' : 'Auditiven Zahlenspanne';

    const noteText = `${subTypeLabel} (Stufe ${grade} | Modus: ${testMode === 'forward' ? 'Vorwärts' : 'Rückwärts'}). ` +
      `Erreichte Spanne: ${activeScoreVal} Stellen. (Pädagogischer Orientierungswert dieses Kurzchecks für Klasse ${grade}: ${norms.fw} vorwärts / ${norms.bw} rückwärts). ` +
      `Details: ` + histories.map(h => `L${h.length} (T${h.trial}): ${h.correct ? '✅' : '❌'}`).join(', ') + '.' +
      (customNote ? `\nLehrer-Notiz: ${customNote}` : '');

    onSave({
      testId: 'live-zahlenspanne',
      score: activeScoreVal,
      foerderbedarf,
      note: noteText,
      meta: {
        type: 'zahlenspanne',
        grade,
        variant: testType,
        mode: testMode,
        maxForwardSpan,
        maxBackwardSpan,
        actualSpan: activeScoreVal,
        normFw: norms.fw,
        normBw: norms.bw,
        histories
      }
    });
  };

  return (
    <div className="bg-slate-50 rounded-3xl border border-slate-200/80 shadow-md overflow-hidden text-left font-sans">
      
      {/* 1. SETUP SCREEN */}
      {phase === 'setup' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <span className="inline-block px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-[0.625rem] font-bold uppercase tracking-widest rounded-full mb-1">
                Arbeitsgedächtnis
              </span>
              <h3 className="text-xl font-extrabold text-slate-800">🧠 Auditives Gedächtnis / Zahlenspanne</h3>
              <p className="text-xs text-slate-500 mt-1">Überprüfung der Speicherkapazität der phonologischen Schleife des Arbeitsgedächtnisses.</p>
            </div>
            <button onClick={onClose} className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition-all">
              Schließen
            </button>
          </div>

          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-3 text-xs text-indigo-900 leading-relaxed font-sans">
            <Info size={18} className="text-indigo-500 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Diagnose-Ablauf:</strong> Das Kind hört eine Sequenz aus Zahlen (oder Wörtern) nacheinander. 
              Sobald die Sequenz vorüber ist, tippt das Kind diese in der geforderten Richtung nach (entweder vorwärts oder rückwärts). 
              Sobald es eine Länge zweimal verfehlt, bricht die Testsequenz ab.
            </div>
          </div>

          {/* Stufen-Auswahl */}
          <div className="space-y-3">
            <label className="block text-[0.6875rem] font-black uppercase tracking-wider text-slate-400">Schulstufen-Differenzierung & Orientierungswerte</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(g => {
                const isGSelected = grade === g;
                const gNorms = getNormMinima(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGrade(g)}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      isGSelected 
                        ? 'bg-indigo-600 border-indigo-700 text-white font-extrabold shadow-sm' 
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-sm font-extrabold font-sans">Stufe {g}</span>
                    <span className="text-[0.625rem] font-bold uppercase mt-1 leading-none tracking-tight opacity-90">
                      {gNorms.fw} vorw. / {gNorms.bw} rückw.
                    </span>
                    <span className="text-[0.5625rem] opacity-75 font-normal mt-0.5 font-sans leading-none">
                      Orientierung im Kurzcheck
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Test variants and modes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Mode selection forward/backward */}
            <div className="space-y-2">
              <label className="block text-[0.6875rem] font-black uppercase tracking-wider text-slate-400 font-sans">Ausrichtung / Testrichtung</label>
              <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setTestMode('forward')}
                  className={`flex-1 py-2.5 rounded-xl text-center text-xs font-bold transition-all ${
                    testMode === 'forward' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  ▶️ Vorwärts nachsprechen
                </button>
                <button
                  type="button"
                  onClick={() => setTestMode('backward')}
                  className={`flex-1 py-2.5 rounded-xl text-center text-xs font-bold transition-all ${
                    testMode === 'backward' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  ◀️ Rückwärts nachsprechen
                </button>
              </div>
            </div>

            {/* Type selection: Numbers or words (Grade 3/4 only) */}
            <div className="space-y-2">
              <label className="block text-[0.6875rem] font-black uppercase tracking-wider text-slate-400 font-sans">Darbietungsart (Nur ab Stufe 3)</label>
              <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setTestType('numbers')}
                  className={`flex-1 py-2.5 rounded-xl text-center text-xs font-bold transition-all ${
                    testType === 'numbers' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  🔢 Zahlenspanne (Standard)
                </button>
                <button
                  type="button"
                  onClick={() => setTestType('words')}
                  disabled={grade < 3}
                  className={`flex-1 py-2.5 rounded-xl text-center text-xs font-bold transition-all ${
                    grade < 3 
                      ? 'text-slate-350 cursor-not-allowed opacity-50' 
                      : testType === 'words' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  🔤 Wortspanne
                </button>
              </div>
            </div>

          </div>

          {/* Student review box */}
          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between">
            <div>
              <span className="block text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">Kind am Tisch</span>
              <span className="text-sm font-extrabold text-slate-800">{student?.vorname} {student?.nachname}</span>
            </div>
            <div className="text-right">
              <span className="block text-[0.625rem] font-black text-slate-400 uppercase tracking-widest font-sans">Zielbereich</span>
              <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                Soll-Wert: {testMode === 'forward' ? `${norms.fw} Stellen` : `${norms.bw} Stellen`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <button
              type="button"
              onClick={() => {
                handleStartTest();
                setSchuelerModus(false);
              }}
              className="py-4 bg-slate-800 hover:bg-slate-900 text-white font-extrabold rounded-2xl transition-all text-center flex items-center justify-center gap-2 text-sm shadow-sm"
            >
              <Play size={16} /> Standard starten
            </button>
            <button
              type="button"
              onClick={() => {
                handleStartTest();
                setSchuelerModus(true);
              }}
              className="py-4 bg-gradient-to-r from-indigo-600 to-violet-650 text-white font-extrabold rounded-2xl shadow-md shadow-indigo-500/10 transition-all text-center flex items-center justify-center gap-2 text-sm"
            >
              <span>⚡</span> Schüler-Modus starten
            </button>
          </div>
        </div>
      )}

      {/* 2. PHASE INTERSTITIAL START BUTTON */}
      {phase === 'start' && (
        <div className="p-12 text-center space-y-6">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
            <span className="text-2xl">🧠</span>
          </div>
          <div className="space-y-2">
            <h4 className="text-md font-black uppercase text-slate-800">Vorschau: {currentLength} Stellen</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed font-sans">
              Es ertönt ein Signalton und danach blitzen nacheinander <strong>{currentLength} {testType === 'words' ? 'Wörter' : 'Ziffern'}</strong> kurz auf. 
              {testMode === 'backward' ? 'Das Kind muss sie danach RÜCKWÄRTS wiederholen!' : 'Das Kind muss sie danach in derselben Reihenfolge wiederholen!'}
            </p>
          </div>
          <div className="flex flex-col gap-2 items-center justify-center">
            <button
              onClick={handleTriggerNextTrial}
              className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl text-xs transition-all tracking-wider shadow-sm"
            >
              Sequenz starten (Signalton ertönt) 🔔
            </button>
            <button
              type="button"
              onClick={() => setSchuelerModus(true)}
              className="text-[0.6875rem] font-bold text-indigo-750 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 mt-1.5"
            >
              ⚡ Schüler-Vollbildmodus aktivieren
            </button>
          </div>
        </div>
      )}

      {/* 3. SHOWING SEQUENCE DISCOVERY */}
      {phase === 'showing' && (
        <div className="p-16 flex flex-col items-center justify-center bg-slate-100 border-b border-slate-200">
          <AnimatePresence mode="wait">
            {showingIndex >= 0 && showingIndex < sequence.length && (
              <motion.div
                key={sequence[showingIndex]}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.4 }}
                transition={{ duration: 0.35, type: 'spring' }}
                className={`font-black tracking-tight leading-none text-indigo-600 ${
                  testType === 'words' ? 'text-4xl md:text-5xl uppercase' : 'text-8xl md:text-9xl font-mono'
                }`}
              >
                {sequence[showingIndex]}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dots indicating progress */}
          <div className="flex gap-2 mt-10">
            {sequence.map((_, i) => (
              <div 
                key={i} 
                className={`w-3.5 h-3.5 rounded-full transition-all duration-350 ${
                  i <= showingIndex ? 'bg-indigo-600 scale-125' : 'bg-slate-300'
                }`} 
              />
            ))}
          </div>
        </div>
      )}

      {/* 4. KEYBOARD OR WORDS SELECTOR FOR INPUT RESULT */}
      {phase === 'input' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-4">
            
            {/* showing empty boxes based on expected response */}
            <div className="flex justify-center gap-2 flex-wrap">
              {sequence.map((_, i) => (
                <div 
                  key={i} 
                  className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center text-xs font-extrabold transition-all ${
                    userInput[i] !== undefined 
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-700 scale-105' 
                      : 'bg-white border-slate-200'
                  }`}
                >
                  {userInput[i] !== undefined ? userInput[i] : ''}
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-500 font-sans uppercase font-black tracking-wider">
              {testMode === 'backward' ? 'Tippe die Reihe RÜCKWÄRTS ein:' : 'Tippe die Reihe VORWÄRTS ein:'}
            </p>
          </div>

          {/* Keyboard input standard layout based on numbers or words */}
          {testType === 'numbers' ? (
            <div className="max-w-xs mx-auto grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  onClick={() => handleItemInput(num.toString())}
                  className="h-14 rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 text-lg font-black text-slate-800 hover:text-indigo-600 shadow-sm transition-all"
                >
                  {num}
                </button>
              ))}
              <div />
              <button
                onClick={() => handleItemInput('0')}
                className="h-14 rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 text-lg font-black text-slate-800 hover:text-indigo-600 shadow-sm transition-all"
              >
                0
              </button>
              <div />
            </div>
          ) : (
            // Word lists: Show alphabetized or localized grid representation of possible targets
            <div className="max-w-md mx-auto grid grid-cols-3 sm:grid-cols-4 gap-2">
              {WORDS_POOL.sort().map(word => (
                <button
                  key={word}
                  onClick={() => handleItemInput(word)}
                  className="p-2 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 tracking-tight"
                >
                  {word}
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => setUserInput([])}
              className="px-4 py-2 border border-slate-200 bg-white hover:bg-rose-50 text-rose-600 rounded-xl text-[0.625rem] font-bold uppercase tracking-widest transition-all"
            >
              🔄 Zurücksetzen
            </button>
            <button
              onClick={() => setSchuelerModus(true)}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[0.625rem] font-bold uppercase tracking-widest transition-all"
            >
              ⚡ Schüler-Vollbild
            </button>
          </div>
        </div>
      )}

      {/* 5. TRIAL FEEDBACK VIEW */}
      {phase === 'feedback' && (
        <div className="p-12 text-center space-y-6 bg-white">
          {histories[histories.length - 1]?.correct ? (
            <div className="space-y-3">
              <span className="text-4xl">🌟</span>
              <h3 className="text-2xl font-black text-emerald-600 uppercase tracking-tight">Korrekt!</h3>
              <p className="text-xs text-slate-500 font-sans">Das Kind hat sich die Sequenz perfekt gemerkt! Wir erhöhen das Intervall.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <span className="text-4xl text-rose-500">❌</span>
              <h3 className="text-2xl font-black text-rose-600 uppercase tracking-tight">Abweichung</h3>
              <p className="text-xs text-slate-500 font-sans">Nicht ganz richtig. {trial === 1 ? 'Versuchen wir einen zweiten Durchlauf bei dieser Länge.' : 'Diese Länge wurde zweimal verpasst.'}</p>
            </div>
          )}

          {/* Breakdown comparisons logs */}
          <div className="max-w-xs mx-auto border border-slate-200 rounded-2xl p-4 grid grid-cols-2 gap-4 text-left bg-slate-50/50">
            <div className="text-xs">
              <span className="text-[0.625rem] text-slate-400 uppercase font-black tracking-wider block">Soll:</span>
              <span className="font-extrabold text-slate-800 uppercase">
                {(testMode === 'forward' ? sequence : [...sequence].reverse()).join(' ')}
              </span>
            </div>
            <div className="text-xs border-l border-slate-200 pl-4">
              <span className="text-[0.625rem] text-slate-400 uppercase font-black tracking-wider block">Ist:</span>
              <span className={`font-extrabold uppercase ${histories[histories.length - 1]?.correct ? 'text-emerald-600' : 'text-rose-600'}`}>
                {userInput.join(' ')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 6. GAME OVER / FINISH SECTION */}
      {phase === 'finish' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-2 shadow-inner">
               🏆
            </div>
            <h3 className="text-xl font-extrabold text-slate-800 leading-tight">Auditive Spanne ermittelt!</h3>
            <p className="text-xs text-slate-500 font-sans leading-relaxed">
              Die maximale auditive Merkspanne für die {grade}. Klasse {testType === 'words' ? '(Wortliste)' : '(Ziffernliste)'} wurde bestimmt.
            </p>
          </div>

          {/* Scores details grids */}
          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
              <span className="block text-[0.625rem] font-bold text-slate-450 uppercase font-mono">{testType === 'words' ? 'Max Wortspanne' : 'Max Zahlenspanne'}</span>
              <span className="block text-3xl font-black text-indigo-650 mt-1 font-mono">{activeScoreVal} Stellen</span>
              <span className="text-[0.625rem] text-slate-400 block mt-0.5 font-sans">Richtung: {testMode === 'forward' ? 'Vorwärts' : 'Rückwärts'}</span>
            </div>

            <div className={`p-4 rounded-2xl text-center shadow-sm border ${
              foerderbedarf ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <span className="block text-[0.625rem] font-black uppercase text-slate-500 font-sans">Entwicklung</span>
              <span className="block text-md font-bold mt-1.5 leading-none">
                {foerderbedarf ? '⚠️ Auffällig' : '✅ Altersgerecht'}
              </span>
              <span className="text-[0.625rem] opacity-75 block mt-1 font-sans">
                {testMode === 'forward' ? `Soll: ${norms.fw} Stellen` : `Soll: ${norms.bw} Stellen`}
              </span>
            </div>
          </div>

          {/* Classification guidelines aid */}
          <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-2">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest font-sans">Pädagogische Einordnungshilfe für Stufe {grade}</h4>
            <div className="text-xs text-slate-600 leading-relaxed font-sans space-y-1">
              <p>Richtwerte für ein intaktes auditives Arbeitsgedächtnis:</p>
              <ul className="list-disc pl-5 py-1 space-y-1 font-medium font-sans">
                <li><strong>Klasse 1:</strong> 4 vorwärts / 2 rückwärts</li>
                <li><strong>Klasse 2:</strong> 4 - 5 vorwärts / 3 rückwärts</li>
                <li><strong>Klasse 3:</strong> 5 vorwärts / 3 - 4 rückwärts</li>
                <li><strong>Klasse 4:</strong> 5 - 6 vorwärts / 4 rückwärts</li>
              </ul>
              {foerderbedarf ? (
                <p className="text-[0.6875rem] text-amber-800 font-semibold mt-2 bg-amber-50/50 p-2 border border-amber-100 rounded-xl leading-relaxed">
                  ⚠️ Das Kind liegt <strong>unterhalb</strong> des altersgerechten Orientierungsrahmens. Eine eingeschränkte auditive Merkfähigkeit erschwert das Erfassen mehrsilbiger Diktate und das Speichern komplexerer Arbeitsanweisungen im Schulalltag.
                </p>
              ) : (
                <p className="text-[0.6875rem] text-emerald-800 font-semibold mt-2 bg-emerald-50/50 p-2 border border-emerald-100 rounded-xl leading-relaxed">
                  🎉 Das Kind hat ein <strong>vollkommen altersgerechtes</strong> auditives Kurzzeitgedächtnis! Es kann Arbeitsanweisungen und Lautfolgen hocheffizient temporär im auditiven Speicher bereithalten.
                </p>
              )}
            </div>
          </div>

          {/* Observations notes comments */}
          <div className="space-y-2">
            <label className="block text-[0.6875rem] font-black uppercase tracking-wider text-slate-400">Lehrbeobachtungen / Ergänzungen</label>
            <textarea
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="z.B. Beginnt zwischendurch lautleise mitzuflüstern um sich Ziffern einzuprägen, ermüdet rasch..."
              className="w-full text-xs p-3 bg-white border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-16 resize-none"
            />
          </div>

          {/* Action buttons footer */}
          <div className="flex gap-3 justify-end col-span-3">
            <button
              onClick={() => setPhase('setup')}
              className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-all"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSaveResult}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl text-xs transition-all shadow-sm flex items-center gap-1.5"
            >
              <Save size={14} /> Testergebnis speichern
            </button>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRMATION DIALOG OVERLAY */}
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
                Sind Sie sicher, dass Sie den Gedächtnistest abbrechen wollen? Sämtliche Antworten dieses Durchgangs gehen verloren.
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
                >
                  Nein, weiter testen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhase('setup');
                    setShowCancelConfirm(false);
                  }}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all"
                >
                  Ja, abbrechen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SCHÜLER-VOLLBILD OVERLAY FOR MEMORY TESTING */}
      <AnimatePresence>
        {schuelerModus && (phase === 'start' || phase === 'showing' || phase === 'input' || phase === 'feedback') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950 z-[99999] flex flex-col p-6 sm:p-12 overflow-hidden select-none items-center justify-center text-center font-sans"
          >
            {/* Top Toolbar */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-center text-slate-400">
              <div className="flex items-center gap-3 text-left">
                <span className="text-2xl text-indigo-500 animate-pulse">🧠</span>
                <div>
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">Gedächtnis-Test Schüler-Ansicht</span>
                  <h4 className="text-sm font-bold text-slate-200">Länge {currentLength} • Versuch {trial} von 2</h4>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setSchuelerModus(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl border border-slate-800 transition-all shadow-sm"
              >
                Beenden
              </button>
            </div>

            {/* Main stage */}
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-3xl relative space-y-8">
              
              {/* PHASE 1: START */}
              {phase === 'start' && (
                <div className="space-y-6 max-w-md">
                  <div className="w-24 h-24 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto shadow-2xl relative">
                    <motion.span
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="text-4xl"
                    >
                      🧠
                    </motion.span>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black text-white tracking-tight">Bist du bereit?</h2>
                    <p className="text-slate-400 text-sm">
                      Mach dich bereit für <strong className="text-indigo-400">{currentLength} {testType === 'words' ? 'Wörter' : 'Ziffern'}</strong>!
                    </p>
                    <p className="text-[11px] text-slate-500 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-850 inline-block">
                      {testMode === 'backward' ? '◀️ Rückwärts nachsprechen / antippen' : '▶️ Vorwärts nachsprechen / antippen'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTriggerNextTrial}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl text-sm transition-all tracking-wide shadow-lg shadow-indigo-500/20"
                  >
                    Sequenz starten 🔔
                  </button>
                </div>
              )}

              {/* PHASE 2: SHOWING */}
              {phase === 'showing' && (
                <div className="w-full h-80 flex flex-col items-center justify-center rounded-[3rem] bg-gradient-to-b from-slate-900/40 to-slate-900/80 border border-slate-800 relative shadow-2xl overflow-hidden p-8 space-y-8">
                  <span className="text-xs uppercase tracking-widest font-black text-indigo-400/80 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1.5 rounded-full">
                    Gedankenspeicher: Aufpassen...
                  </span>

                  <div className="h-28 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      {showingIndex >= 0 && showingIndex < sequence.length && (
                        <motion.div
                          key={sequence[showingIndex]}
                          initial={{ opacity: 0, scale: 0.5, y: 15 }}
                          animate={{ opacity: 1, scale: 1.2, y: 0 }}
                          exit={{ opacity: 0, scale: 1.5, y: -15 }}
                          transition={{ duration: 0.35, type: 'spring' }}
                          className={`font-black text-indigo-400 select-none filter drop-shadow-[0_0_20px_rgba(129,140,248,0.25)] ${
                            testType === 'words' ? 'text-5xl sm:text-6xl uppercase tracking-tight' : 'text-9xl font-mono'
                          }`}
                        >
                          {sequence[showingIndex]}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Pulsing Visualizer wave row */}
                  <div className="flex gap-1.5 items-center justify-center h-8">
                    {[...Array(9)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          height: showingIndex >= 0 ? [8, 24 + Math.sin(i + showingIndex) * 12, 8] : 6,
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 0.6,
                          delay: i * 0.05
                        }}
                        className="w-1.5 rounded-full bg-indigo-500/85"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* PHASE 3: INPUT */}
              {phase === 'input' && (
                <div className="w-full flex flex-col items-center justify-center space-y-6">
                  
                  {/* Empty Slots boxes */}
                  <div className="flex justify-center gap-2 flex-wrap max-w-lg">
                    {sequence.map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 flex items-center justify-center text-lg sm:text-xl font-black transition-all ${
                          userInput[i] !== undefined 
                            ? 'bg-indigo-900/40 border-indigo-500 text-indigo-300 scale-105 shadow-inner shadow-indigo-550/20' 
                            : 'bg-slate-900 border-slate-800 text-slate-600'
                        }`}
                      >
                        {userInput[i] !== undefined ? userInput[i] : ''}
                      </div>
                    ))}
                  </div>

                  <p className="text-xs uppercase tracking-widest font-black text-slate-400 bg-slate-900/40 border border-slate-800/60 px-3.5 py-1.5 rounded-full">
                    {testMode === 'backward' ? '◀️ Reihe RÜCKWÄRTS eingeben / nachsprechen!' : '▶️ Reihe VORWÄRTS eingeben / nachsprechen!'}
                  </p>

                  {/* Giant Touchscreen keypad */}
                  {testType === 'numbers' ? (
                    <div className="max-w-xs sm:max-w-sm w-full mx-auto grid grid-cols-3 gap-3">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleItemInput(num.toString())}
                          className="h-14 sm:h-16 rounded-2xl bg-slate-900 hover:bg-slate-850 active:bg-indigo-950 border border-slate-800 hover:border-indigo-500 text-xl font-black text-slate-100 shadow-md transition-all active:scale-95 flex items-center justify-center"
                        >
                          {num}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setUserInput([])}
                        className="h-14 sm:h-16 rounded-2xl bg-slate-950 border border-slate-900 hover:bg-slate-900 text-rose-500 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => handleItemInput('0')}
                        className="h-14 sm:h-16 rounded-2xl bg-slate-900 hover:bg-slate-850 active:bg-indigo-950 border border-slate-800 hover:border-indigo-500 text-xl font-black text-slate-100 shadow-md transition-all active:scale-95 flex items-center justify-center"
                      >
                        0
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (userInput.length > 0) {
                            setUserInput(userInput.slice(0, -1));
                          }
                        }}
                        className="h-14 sm:h-16 rounded-2xl bg-slate-950 border border-slate-900 hover:bg-slate-900 text-slate-400 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                      >
                        Löschen
                      </button>
                    </div>
                  ) : (
                    // Giant word list pills
                    <div className="max-w-2xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full">
                      {WORDS_POOL.sort().map(word => (
                        <button
                          key={word}
                          type="button"
                          onClick={() => handleItemInput(word)}
                          className="p-3 bg-slate-900 hover:bg-slate-850 active:scale-95 border border-slate-800 rounded-2xl text-xs sm:text-sm font-black text-slate-350 transition-all text-center"
                        >
                          {word}
                        </button>
                      ))}
                    </div>
                  )}

                </div>
              )}

              {/* PHASE 4: FEEDBACK */}
              {phase === 'feedback' && (
                <div className="space-y-6 py-12 text-center">
                  {histories[histories.length - 1]?.correct ? (
                    <div className="space-y-4">
                      <motion.span
                        animate={{ scale: [1, 1.25, 1], rotate: [0, 10, -10, 0] }}
                        className="text-6xl block"
                      >
                        🌟
                      </motion.span>
                      <h2 className="text-3xl font-black text-emerald-400 uppercase tracking-tight">Korrekt!</h2>
                      <p className="text-slate-400 text-sm max-w-sm mx-auto">
                        Das hast du dir perfekt gemerkt! Wir probieren jetzt eine noch längere Reihe.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <span className="text-5xl block animate-pulse">💡</span>
                      <h2 className="text-3xl font-black text-amber-400 uppercase tracking-tight">Ausgewichen</h2>
                      <p className="text-slate-400 text-sm max-w-sm mx-auto">
                        {trial === 1 
                          ? 'Gleich geschafft! Versuchen wir einen zweiten Durchgang bei dieser Länge.' 
                          : 'Diese Stufe wurde zweimal versucht. Wir werten den Test jetzt aus.'}
                      </p>
                    </div>
                  )}

                  {/* Sequence breakdown logs comparison */}
                  <div className="max-w-xs mx-auto border border-slate-800 rounded-2xl p-4 grid grid-cols-2 gap-4 text-left bg-slate-900/40">
                    <div className="text-xs">
                      <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block">Soll:</span>
                      <span className="font-extrabold text-slate-200 uppercase leading-relaxed">
                        {(testMode === 'forward' ? sequence : [...sequence].reverse()).join(' ')}
                      </span>
                    </div>
                    <div className="text-xs border-l border-slate-800 pl-4">
                      <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block">Ist:</span>
                      <span className={`font-extrabold uppercase leading-relaxed ${histories[histories.length - 1]?.correct ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {userInput.join(' ')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Progress track row */}
              <div className="flex gap-2 justify-center flex-wrap max-w-md pt-4">
                {sequence.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full border transition-all duration-300 ${
                      phase === 'showing' && idx <= showingIndex
                        ? 'bg-indigo-400 border-indigo-500 scale-125 shadow-[0_0_8px_rgba(129,140,248,0.5)]'
                        : phase === 'input' && userInput[idx] !== undefined
                        ? 'bg-indigo-500 border-indigo-600'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  />
                ))}
              </div>

            </div>

            {/* Helper keyboard bottom */}
            <div className="mt-8 text-[11px] text-slate-500 font-bold tracking-wide uppercase">
              Tastatur-Kürzel: [0 - 9] = Zahl eingeben • [Backspace] = Reset • [Leertaste] = Nächsten Durchgang starten
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
