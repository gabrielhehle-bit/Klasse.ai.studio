import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, RotateCcw, Check, X, Save, ArrowLeft, Info, HelpCircle
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

const GRADE_WORD_POOLS: Record<number, string[]> = {
  1: [
    'Hund', 'Ball', 'rot', 'blau', 'Baum', 'Haus', 'Maus', 'Kind', 'Buch', 'Brot', 
    'Fisch', 'Sonne', 'Gras', 'Tisch', 'Tür', 'Weg', 'Kuh', 'Oma', 'Opa', 'Bus', 
    'Zug', 'Eis', 'Nase', 'Hand', 'Fuß', 'Auge', 'Ohr', 'Katze', 'Mond', 'Zahn', 'Schuh'
  ],
  2: [
    'Katze', 'Vogel', 'Wasser', 'Schule', 'spielen', 'laufen', 'schön', 'immer', 'schnell', 'Apfel', 
    'Wolke', 'Sommer', 'Winter', 'Garten', 'Blume', 'Sessel', 'Heft', 'Stift', 'Bruder', 'Mama', 
    'Papa', 'Kindheit', 'Sonne', 'Schatten', 'Regen', 'Schnee', 'Sterne', 'Berge', 'Kuchen', 'Pause', 'Ferien'
  ],
  3: [
    'Feuerwehr', 'Bibliothek', 'Computer', 'vorgestern', 'Bürgermeister', 'schwierig', 'Erlaubnis', 
    'Zufriedenheit', 'verabschieden', 'Verhalten', 'Spielplatz', 'Wanderung', 'Rucksack', 'Tradition', 
    'Gipfelkreuz', 'Schokolade', 'Erdbeere', 'Dinosaurier', 'Abenteuer', 'Nachmittag', 'Fahrrad', 
    'Frühstück', 'Geschenk', 'Zeitung', 'Tiergarten', 'Wochenende', 'Unterricht', 'Schülerin', 'Lehrerin', 'Klassenzimmer'
  ],
  4: [
    'Sonnensystem', 'Atmosphäre', 'faszinierend', 'Vegetation', 'Katastrophe', 'Verwandtschaft', 
    'Demokratie', 'Sauerstoff', 'Konzentration', 'Rhythmus', 'Gletscherschwund', 'Bundespräsident', 
    'Zisterzienser', 'Ökosystem', 'Ornithologe', 'Welterbe', 'Umweltauflage', 'Temperatur', 'Wissenschaft', 
    'Spezialisierung', 'Flusskraftwerk', 'Kulturlandschaft', 'Herausforderung', 'Selbstkorrektur', 
    'Bundesland', 'Österreichisch', 'Mittelalterlich', 'Prächtigkeit', 'Witterungsverhältnis', 'Entbehrlichkeit'
  ]
};

export const Test2Blitzlesen: React.FC<TestProps> = ({
  studentId,
  initialGrade,
  onClose,
  onSave
}) => {
  const { app } = useApp();
  const student = app.schueler.find(s => s.id === studentId);

  // Phase states: 'setup' | 'explain' | 'fixation' | 'flash' | 'blank' | 'evaluate' | 'result'
  const [phase, setPhase] = useState<'setup' | 'test' | 'result'>('setup');
  const [grade, setGrade] = useState<number>(initialGrade || 1);
  const [activeWords, setActiveWords] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Interactive flash sequence states
  const [testSubPhase, setTestSubPhase] = useState<'intro' | 'fixation' | 'flash' | 'blank' | 'evaluate'>('intro');
  const [customNote, setCustomNote] = useState('');

  // Premium Custom Slider & Child overlay
  const [customFlashDuration, setCustomFlashDuration] = useState<number>(1000);
  const [schuelerBlitzMode, setSchuelerBlitzMode] = useState<boolean>(false);

  // Automatically update duration when changing grade in setup
  useEffect(() => {
    if (phase === 'setup') {
      const presets: Record<number, number> = { 1: 1000, 2: 700, 3: 450, 4: 250 };
      setCustomFlashDuration(presets[grade] || 1000);
    }
  }, [grade, phase]);

  // Get duration details based on grade
  const getFlashDuration = (g: number) => {
    if (g === 1) return 1000;
    if (g === 2) return 700;
    if (g === 3) return 450;
    return 250;
  };

  const handleStartTest = () => {
    // Collect 15 random words from the selected pool
    const pool = GRADE_WORD_POOLS[grade] || GRADE_WORD_POOLS[1];
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    setActiveWords(shuffled.slice(0, 15));
    setCurrentIndex(0);
    setAnswers({});
    setPhase('test');
    setTestSubPhase('intro');
  };

  // Run the flash state machine for active word
  const triggerFlashSequence = () => {
    setTestSubPhase('fixation');

    // 1. Show fixation cross for exactly 500ms
    setTimeout(() => {
      setTestSubPhase('flash');

      // 2. Flash word for stufenabhängige or customized duration
      const duration = customFlashDuration || getFlashDuration(grade);
      setTimeout(() => {
        setTestSubPhase('blank');

        // 3. Keep empty and show rating options after a tiny delay
        setTimeout(() => {
          setTestSubPhase('evaluate');
        }, 120);

      }, duration);

    }, 500);
  };

  // Keyboard support for spacebar (flash trigger) and arrow keys (evaluation)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'test') return;
      
      if (testSubPhase === 'intro' && e.code === 'Space') {
        e.preventDefault();
        triggerFlashSequence();
      } else if (testSubPhase === 'evaluate') {
        if (e.key === 'ArrowRight' || e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          handleRating(true);
        } else if (e.key === 'ArrowLeft' || e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          handleRating(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, testSubPhase, currentIndex, activeWords, customFlashDuration]);

  const currentWord = activeWords[currentIndex] || '';

  const handleRating = (recognized: boolean) => {
    setAnswers(prev => ({
      ...prev,
      [currentIndex]: recognized
    }));

    if (currentIndex + 1 < activeWords.length) {
      setCurrentIndex(prev => prev + 1);
      setTestSubPhase('intro');
    } else {
      setPhase('result');
    }
  };

  const handleBackToLastWord = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setTestSubPhase('evaluate'); // directly allow editing last evaluated word
    }
  };

  const correctCount = Object.values(answers).filter(Boolean).length;
  // Threshold: at least 11 correct recognized words for a unauffällig score (out of 15)
  const foerderbedarf = correctCount < 10; 

  const handleSaveResult = () => {
    const durationLabel = `${getFlashDuration(grade)} ms`;
    const noteText = `Sichtwort-Blitzlesen (Stufe ${grade} | Einblendzeit: ${durationLabel}). ` +
      `Erkannt: ${correctCount}/15 Wörtern. ` +
      `Details: ` + activeWords.map((w, idx) => `${w}: ${answers[idx] ? '✅' : '❌'}`).join(', ') + '.' +
      (customNote ? `\nBeobachtung: ${customNote}` : '');

    onSave({
      testId: 'live-blitzlesen',
      score: correctCount,
      foerderbedarf,
      note: noteText,
      meta: {
        type: 'blitz',
        grade,
        correctCount,
        total: activeWords.length,
        flashDurationMs: getFlashDuration(grade),
        answers: activeWords.map((w, idx) => ({ word: w, correct: !!answers[idx] })),
        percentage: Math.round((correctCount / activeWords.length) * 100)
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
                Sichtwortschatz
              </span>
              <h3 className="text-xl font-extrabold text-slate-800">⚡ Sichtwort-Blitzlesen</h3>
              <p className="text-xs text-slate-500 mt-1">Überprüfung des automatisierten Sichtwortschatzes durch Kurzzeiteinblendungen.</p>
            </div>
            <button onClick={onClose} className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition-all">
              Schließen
            </button>
          </div>

          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-3 text-xs text-indigo-900 leading-relaxed">
            <Info size={18} className="text-indigo-500 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Methode:</strong> Dem Kind wird ein Fixationskreuz (+) gezeigt, danach blitzt das Wort für Millisekunden auf. 
              Das Kind muss das Wort ohne Verzögerung vorlesen. Das verhindert buchstabenweises Erlesen und stärkt den Direktschatz.
            </div>
          </div>

          {/* Stufen-Auswahl */}
          <div className="space-y-3">
            <label className="block text-[0.6875rem] font-black uppercase tracking-wider text-slate-400">Schulstufen-Differenzierung & Einblenddauer</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                    grade === g 
                      ? 'bg-indigo-600 border-indigo-700 text-white font-extrabold shadow-sm' 
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <span className="text-sm font-extrabold">Stufe {g}</span>
                  <span className="text-[0.625rem] font-black uppercase mt-1 leading-none tracking-widest opacity-80">
                    {g === 1 ? '1.000 ms' : g === 2 ? '700 ms' : g === 3 ? '450 ms' : '250 ms'}
                  </span>
                  <span className="text-[0.5625rem] opacity-75 font-normal mt-0.5">
                    {g === 1 ? 'einfache Einsilber' : g === 2 ? 'kurze Alltagsw.' : g === 3 ? 'Mehrsilber' : 'längere Fachwörter'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Duration Slider */}
          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl space-y-2.5 shadow-sm">
            <div className="flex justify-between items-center text-xs">
              <span className="font-extrabold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                ⏱️ Individuelle Einblenddauer:
              </span>
              <span className="font-mono bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-xl font-black text-xs">
                {customFlashDuration} ms
              </span>
            </div>
            <input 
              type="range" 
              min="100" 
              max="2000" 
              step="50"
              value={customFlashDuration}
              onChange={(e) => setCustomFlashDuration(parseInt(e.target.value))}
              className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-400 font-black uppercase tracking-wider">
              <span>100 ms (Sehr flink)</span>
              <span>2.000 ms (Gemächlich)</span>
            </div>
          </div>

          {/* Detail parameters box */}
          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between">
            <div>
              <span className="block text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">Kind am Tisch</span>
              <span className="text-sm font-extrabold text-slate-800">{student?.vorname} {student?.nachname}</span>
            </div>
            <div className="text-right">
              <span className="block text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">Testvorgabe</span>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">15 aus {GRADE_WORD_POOLS[grade].length} Wörtern</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleStartTest}
              className="flex-1 py-4 bg-slate-800 hover:bg-slate-900 text-white font-extrabold rounded-2xl shadow-sm hover:shadow transition-all text-center flex items-center justify-center gap-2 text-sm"
            >
              <Play size={16} fill="white" /> Standard starten
            </button>
            <button
              onClick={() => {
                handleStartTest();
                setSchuelerBlitzMode(true);
              }}
              className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl shadow-md hover:shadow-lg transition-all text-center flex items-center justify-center gap-2 text-sm"
            >
              <span className="text-sm">⚡</span> Schüler-Blitzmodus starten
            </button>
          </div>
        </div>
      )}

      {/* 2. ACTIVE TEST CYCLE */}
      {phase === 'test' && (
        <div className="flex flex-col">
          {/* Top Info bar */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-700 text-white p-5 flex justify-between items-center">
            <div>
              <span className="text-[0.625rem] font-black uppercase tracking-wider block opacity-75">Sichtwort-Blitzlesen • Stufe {grade} ({getFlashDuration(grade)}ms)</span>
              <h4 className="font-extrabold text-white text-md">Wort {currentIndex + 1} von {activeWords.length}</h4>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSchuelerBlitzMode(true)}
                className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-sm"
              >
                <span>⚡</span> Schüler-Vollbild
              </button>
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                className="text-xs bg-white/15 hover:bg-white/25 border border-white/20 text-white px-3.5 py-1.5 rounded-xl transition-all"
              >
                Abbrechen
              </button>
            </div>
          </div>

          {/* Test area stage */}
          <div className="p-6 sm:p-8 flex flex-col items-center justify-center min-h-[300px] bg-slate-100 border-b border-slate-200 relative">
            
            {/* Fixation + Word board container */}
            <div className="w-full max-w-md h-48 bg-white border border-slate-200 shadow-sm rounded-3xl flex items-center justify-center relative">
              <AnimatePresence mode="wait">
                {testSubPhase === 'intro' && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={triggerFlashSequence}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-750 text-white font-black text-xs rounded-2xl shadow transition-all flex items-center gap-2"
                  >
                    <Play size={14} fill="white" /> Wort aufblitzen lassen
                  </motion.button>
                )}

                {testSubPhase === 'fixation' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-6xl font-black text-indigo-400 font-sans"
                  >
                    +
                  </motion.div>
                )}

                {testSubPhase === 'flash' && (
                  <motion.div
                    initial={{ opacity: 1, scale: 1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0 }}
                    className="text-3xl sm:text-4xl font-black text-slate-800 tracking-wide font-sans select-none"
                  >
                    {currentWord}
                  </motion.div>
                )}

                {testSubPhase === 'blank' && (
                  <div className="w-full h-full bg-white rounded-3xl" />
                )}

                {testSubPhase === 'evaluate' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center space-y-1 p-4"
                  >
                    <span className="block text-[0.625rem] font-bold text-slate-400 uppercase">Dargebotenes Wort (verdeckt):</span>
                    <strong 
                      className="text-xl font-black text-indigo-600 block mb-2 blur-[6px] hover:blur-none active:blur-none transition-all duration-150 cursor-pointer select-none"
                      title="Mauszeiger drüber bewegen oder anklicken zum Einblenden"
                    >
                      {currentWord}
                    </strong>
                    <p className="text-[0.6875rem] text-slate-500 font-sans">Hat das Kind das Wort korrekt laut vorgelesen?</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Backbutton for correction */}
            {currentIndex > 0 && testSubPhase !== 'fixation' && testSubPhase !== 'flash' && (
              <button
                onClick={handleBackToLastWord}
                className="absolute left-6 bottom-4 text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-all"
              >
                <ArrowLeft size={14} /> Letztes Wort korrigieren
              </button>
            )}
          </div>

          {/* Feedback buttons container */}
          <div className="p-6 bg-white flex flex-col justify-center items-stretch gap-3">
            {testSubPhase === 'evaluate' ? (
              <div className="grid grid-cols-2 gap-4 w-full">
                <button
                  onClick={() => handleRating(false)}
                  className="py-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold rounded-2xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <X size={18} /> Nicht erkannt
                </button>
                <button
                  onClick={() => handleRating(true)}
                  className="py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl transition-all flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg"
                >
                  <Check size={18} /> Korrekt erkannt
                </button>
              </div>
            ) : (
              <p className="text-center text-xs text-slate-400 py-3">Warte auf Trigger für das Wort dargeboten am Bildschirm...</p>
            )}
          </div>
        </div>
      )}

      {/* 3. TEST RESULT VIEW */}
      {phase === 'result' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-400 block uppercase">Testergebnis</span>
              <h3 className="text-xl font-extrabold text-slate-800">📊 Blitzlese Auswertung</h3>
            </div>
            <button
              onClick={handleStartTest}
              className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1"
            >
              <RotateCcw size={12} /> Test wiederholen
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="p-4 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
              <span className="block text-[0.625rem] font-bold text-slate-400 uppercase">Erkennungs-Leistung</span>
              <span className="block text-2xl font-black text-slate-900 mt-1 font-mono">{correctCount} <span className="text-sm font-medium text-slate-400">/ 15</span></span>
              <span className="text-[0.625rem] text-slate-400 block mt-0.5">Wörter im Direktschatz erfasst</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
              <span className="block text-[0.625rem] font-bold text-slate-400 uppercase">Durchschnittliche Einblendungen</span>
              <span className="block text-2xl font-black text-slate-900 mt-1 font-mono">{getFlashDuration(grade)} ms</span>
              <span className="text-[0.625rem] text-slate-400 block mt-0.5">Leistungsstufe {grade}. Klasse</span>
            </div>

            <div className={`p-4 rounded-2xl text-center shadow-sm border ${
              foerderbedarf ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <span className="block text-[0.625rem] font-black uppercase text-slate-500">Ergebnis / Prüfhinweis</span>
              <span className="block text-md font-bold mt-1">
                {correctCount >= 13 ? 'Sicher' : correctCount >= 11 ? 'Weiter beobachten' : 'Gezielt unterstützen'}
              </span>
              <span className="text-[0.625rem] opacity-75 block mt-0.5">{correctCount < 10 ? 'Unter dem Orientierungswert dieses Durchgangs' : 'In diesem Wörterpool sicher erkannt'}</span>
            </div>

          </div>

          {/* Qualitative interpretation */}
          <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest">Pädagogische Einordnung</h4>
            <div className="text-xs text-slate-600 leading-relaxed space-y-2 font-sans leading-relaxed">
              {foerderbedarf ? (
                <p>
                  Das Kind liest mit <strong>{correctCount} von 15 Wörtern</strong> ungenügend. Es erfasst die Wörter nicht auf einen Blick, sondern versucht sie buchstabierend-lautierend zu entschlüsseln. 
                  Aufgrund der extrem kurzen Darbietungszeit ({getFlashDuration(grade)} ms) bricht dieser Leseprozess ab. Ein gezieltes visuelle Strukturübungen / Blitzleseübungen mit häufigen Funktionswörtern 
                  ist empfohlen, um ein direktes Worterkennungsnetzwerk im Gehirn aufzubauen.
                </p>
              ) : (
                <p>
                  🎉 Ausgezeichnete Worterkennung! Das Kind erfasst Wörter im Blitz-Modus ({getFlashDuration(grade)} ms) stabil im Sichtwortschatz. 
                  Mit <strong>{correctCount} von 15 Wörtern</strong> zeigt es eine starke visuelle Wort-Form-Abgleichkapazität im mentalen Lexikon. 
                  Der Leseprozess ist bezüglich des Wortschatzes vollständig teil-automatisiert und kognitiv hocheffizient.
                </p>
              )}
            </div>
          </div>

          {/* Detailed answers review list (correctable if needed? Well, it's result screen so they can repeat, let's keep it informative) */}
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest">Wort-Protokoll</h4>
            <div className="p-4 bg-white border border-slate-200 rounded-2xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {activeWords.map((word, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                  <span className="font-medium text-slate-700">{word}</span>
                  <span>{answers[idx] ? '✅' : '❌'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Custom observations notes */}
          <div className="space-y-2">
            <label className="block text-[0.6875rem] font-black uppercase tracking-wider text-slate-400">Pädagogische Notizen / Ergänzungen</label>
            <textarea
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="z.B. Reagiert frustriert bei kurzen Intervallen, liest oft willkürliche Wörter mit gleichem Anfangsbuchstaben..."
              className="w-full text-xs p-3 bg-white border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-16 resize-none"
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
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl text-xs transition-all shadow-sm flex items-center gap-1.5"
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
                Sind Sie sicher, dass Sie die Sichtwort-Blitzlesediagnose abbrechen wollen? Sämtliche Antworten dieses Durchgangs gehen verloren.
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

      {/* SCHÜLER-BLITZMODUS MULTIPLAYER/DUAL SCREEN OVERLAY */}
      <AnimatePresence>
        {schuelerBlitzMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950 z-[99999] flex flex-col p-6 sm:p-12 overflow-hidden select-none items-center justify-center text-center"
          >
            {/* Top Toolbar */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-center text-slate-400">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚡</span>
                <div className="text-left">
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block">Schüler-Ansicht</span>
                  <h4 className="text-sm font-bold text-slate-200">Wort {currentIndex + 1} von {activeWords.length}</h4>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs bg-slate-900 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-xl font-mono">
                  {customFlashDuration} ms
                </span>
                <button
                  type="button"
                  onClick={() => setSchuelerBlitzMode(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all"
                >
                  Beenden
                </button>
              </div>
            </div>

            {/* Giant Stage area */}
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl relative">
              
              {/* Animated sequence stage */}
              <div className="w-full h-80 flex items-center justify-center rounded-[2.5rem] bg-slate-900/50 border border-slate-800 relative shadow-2xl overflow-hidden">
                <AnimatePresence mode="wait">
                  {testSubPhase === 'intro' && (
                    <motion.button
                      key="intro"
                      type="button"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={triggerFlashSequence}
                      className="px-8 py-5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-md font-black uppercase tracking-widest rounded-2xl shadow-lg active:scale-95 transition-all flex items-center gap-3 font-sans"
                    >
                      <span>🚀 STARTEN</span>
                      <span className="text-[10px] bg-slate-950 text-amber-400 px-2 py-0.5 rounded-full font-mono">Leertaste</span>
                    </motion.button>
                  )}

                  {testSubPhase === 'fixation' && (
                    <motion.div
                      key="fixation"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-white text-6xl font-light font-mono select-none"
                    >
                      +
                    </motion.div>
                  )}

                  {testSubPhase === 'flash' && (
                    <motion.div
                      key="flash"
                      initial={{ opacity: 1, scale: 1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0 }}
                      className="text-amber-400 text-6xl md:text-7xl font-black tracking-tight select-none font-sans filter drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                    >
                      {currentWord}
                    </motion.div>
                  )}

                  {testSubPhase === 'blank' && (
                    <motion.div
                      key="blank"
                      className="w-full h-full bg-slate-950"
                    />
                  )}

                  {testSubPhase === 'evaluate' && (
                    <motion.div
                      key="evaluate"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="space-y-6 max-w-md px-6 text-center"
                    >
                      <h3 className="text-xl font-bold text-slate-300">Wurde das Wort richtig vorgelesen?</h3>
                      <div className="flex gap-4 justify-center">
                        <button
                          type="button"
                          onClick={() => handleRating(false)}
                          className="px-6 py-4 bg-rose-600/20 hover:bg-rose-600 border border-rose-500/30 text-rose-300 hover:text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95"
                        >
                          <X size={16} /> Falsch
                          <span className="text-[9px] bg-black/30 px-1.5 py-0.5 rounded-md text-rose-200 font-mono">← Taste</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRating(true)}
                          className="px-6 py-4 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 text-emerald-300 hover:text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95"
                        >
                          <Check size={16} /> Richtig
                          <span className="text-[9px] bg-black/30 px-1.5 py-0.5 rounded-md text-emerald-200 font-mono">Taste →</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Progress indication dots */}
              <div className="flex gap-1.5 justify-center mt-6 flex-wrap max-w-md">
                {activeWords.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-3 h-3 rounded-full transition-all duration-300 border ${
                      idx === currentIndex
                        ? 'bg-amber-400 border-amber-500 scale-125'
                        : answers[idx] === true
                        ? 'bg-emerald-500 border-emerald-600'
                        : answers[idx] === false
                        ? 'bg-rose-500 border-rose-600'
                        : 'bg-slate-800 border-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Live Helper hint */}
            <div className="mt-8 text-[11px] text-slate-500 font-bold tracking-wide uppercase">
              Tipp: Nutze die Tastatur! [Leertaste] = Blitz starten, [Pfeiltaste links] = Falsch, [Pfeiltaste rechts] = Richtig
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
