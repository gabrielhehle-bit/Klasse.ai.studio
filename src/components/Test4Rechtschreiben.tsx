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

interface DictItem {
  word: string;
  category: 'Großschreibung' | 'Dehnung' | 'Doppelkonsonant' | 'Zischlaute' | 'Lauttreu' | 'ck/tz' | 'Umlaut' | 'Auslaut';
  hint: string;
}

const GRADE_DICT_ITEMS: Record<number, DictItem[]> = {
  1: [
    { word: 'Hund', category: 'Großschreibung', hint: 'Nomen großschreiben, Verhärtung d/t am Ende.' },
    { word: 'Sonne', category: 'Großschreibung', hint: 'Nomen großschreiben, n-Verdopplung.' },
    { word: 'Haus', category: 'Lauttreu', hint: 'Basis-Buchstaben rein lauttreu schreiben.' },
    { word: 'Maus', category: 'Lauttreu', hint: 'Basis-Buchstaben rein lauttreu schreiben.' },
    { word: 'Blume', category: 'Großschreibung', hint: 'Nomen großschreiben.' },
    { word: 'rot', category: 'Lauttreu', hint: 'Adjektiv kleinschreiben.' }
  ],
  2: [
    { word: 'Katze', category: 'ck/tz', hint: 'tz-Regel nach Kurzvokal.' },
    { word: 'Wasser', category: 'Doppelkonsonant', hint: 'Fokus ss-Doppel-Mitlaut nach weichem s.' },
    { word: 'schmecken', category: 'ck/tz', hint: 'ck-Regel nach Kurzvokal.' },
    { word: 'hoffen', category: 'Doppelkonsonant', hint: 'Doppel-f Mitlaut.' },
    { word: 'Blitz', category: 'ck/tz', hint: 'tz-Regel nach Kurzvokal.' },
    { word: 'rennen', category: 'Doppelkonsonant', hint: 'Doppel-n Mitlaut.' },
    { word: 'Zucker', category: 'ck/tz', hint: 'ck-Regel nach Kurzvokal.' },
    { word: 'Sommer', category: 'Doppelkonsonant', hint: 'Doppel-m Mitlaut.' }
  ],
  3: [
    { word: 'Zahn', category: 'Dehnung', hint: 'Stummes Dehnungs-h.' },
    { word: 'fliegen', category: 'Dehnung', hint: 'ie-Dehnung bei langem i.' },
    { word: 'groß', category: 'Zischlaute', hint: 'ß-Schreibung nach Langvokal.' },
    { word: 'Schiff', category: 'Doppelkonsonant', hint: 'Doppel-f Mitlaut.' },
    { word: 'Sonne', category: 'Doppelkonsonant', hint: 'Doppel-n Mitlaut.' },
    { word: 'Katze', category: 'ck/tz', hint: 'tz-Regel.' },
    { word: 'gehen', category: 'Dehnung', hint: 'Silbentrennendes h.' },
    { word: 'Spiel', category: 'Dehnung', hint: 'ie-Dehnung / Sp-Muster.' },
    { word: 'Fuß', category: 'Zischlaute', hint: 'ß-Schreibung nach langem u.' },
    { word: 'essen', category: 'Zischlaute', hint: 'ss-Schreibung nach Kurzvokal.' }
  ],
  4: [
    { word: 'Biene', category: 'Dehnung', hint: 'ie-Dehnung.' },
    { word: 'Zucker', category: 'ck/tz', hint: 'ck-Regel.' },
    { word: 'Sauerstoff', category: 'Doppelkonsonant', hint: 'Doppel-f am Wortende.' },
    { word: 'Sitzplatz', category: 'ck/tz', hint: 'tz-Regel.' },
    { word: 'weißen', category: 'Zischlaute', hint: 'ß-Schreibung nach Diphthong.' },
    { word: 'Flusskraftwerk', category: 'Zischlaute', hint: 'ss-Schreibung / zusammengesetztes Wort.' },
    { word: 'nehmen', category: 'Dehnung', hint: 'Dehnungs-h / stummes h.' },
    { word: 'Kätzchen', category: 'Umlaut', hint: 'Umlaut-Ableitung Katze + Verkleinerung.' },
    { word: 'Hände', category: 'Umlaut', hint: 'Umlaut-Ableitung Hand.' },
    { word: 'Rhythmus', category: 'Dehnung', hint: 'Außergewöhnliche Fremdwortschreibung.' },
    { word: 'Boot', category: 'Dehnung', hint: 'Vokalverdopplung oo.' },
    { word: 'schwierig', category: 'Auslaut', hint: 'ig-Endung (Auslautverhärtung).' }
  ]
};

export const Test4Rechtschreiben: React.FC<TestProps> = ({
  studentId,
  initialGrade,
  onClose,
  onSave
}) => {
  const { app } = useApp();
  const student = app.schueler.find(s => s.id === studentId);

  // States
  const [phase, setPhase] = useState<'setup' | 'dictation' | 'result'>('setup');
  const [grade, setGrade] = useState<number>(initialGrade || 1);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, number>>({}); // maps wordIndex to score (0, 1, or 2)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [customNote, setCustomNote] = useState('');
  const [showSolution, setShowSolution] = useState<boolean>(false);
  const [schuelerModus, setSchuelerModus] = useState<boolean>(false);
  const [studentInput, setStudentInput] = useState<string>('');

  useEffect(() => {
    setShowSolution(false);
  }, [currentIndex]);

  useEffect(() => {
    setStudentInput('');
  }, [currentIndex]);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'dictation') return;
      if (document.activeElement?.tagName === 'TEXTAREA') return;
      if (document.activeElement?.tagName === 'INPUT' && !e.ctrlKey) {
        // Allow student to type in the spelling input box without triggering shortcuts
        return;
      }

      if (e.code === 'KeyS') {
        e.preventDefault();
        setSchuelerModus(prev => !prev);
      } else if (e.code === 'Space') {
        e.preventDefault();
        setShowSolution(prev => !prev);
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyF' || e.code === 'Digit0') {
        e.preventDefault();
        handleScoreWord(0);
      } else if (e.code === 'ArrowDown' || e.code === 'KeyT' || e.code === 'Digit1') {
        e.preventDefault();
        handleScoreWord(1);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyR' || e.code === 'Digit2') {
        e.preventDefault();
        handleScoreWord(2);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, currentIndex, schuelerModus, grade, answers]);

  const activePool = GRADE_DICT_ITEMS[grade] || GRADE_DICT_ITEMS[1];
  const itemsCount = activePool.length;

  const handleStartTest = () => {
    setAnswers({});
    setCurrentIndex(0);
    setPhase('dictation');
  };

  const handleScoreWord = (points: number) => {
    setAnswers(prev => ({
      ...prev,
      [currentIndex]: points
    }));

    if (currentIndex + 1 < itemsCount) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setPhase('result');
    }
  };

  const handleBackToWord = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Calculations for results
  const maxPossiblePoints = itemsCount * 2;
  const earnedPoints = Object.values(answers).reduce((acc, v) => acc + v, 0);
  const foerderbedarf = earnedPoints < (maxPossiblePoints * 0.65); // below 65% is risk

  // Category breakdown calculation
  const getCategoryStats = () => {
    const stats: Record<string, { total: number; score: number }> = {};
    activePool.forEach((item, idx) => {
      const cat = item.category;
      if (!stats[cat]) {
        stats[cat] = { total: 0, score: 0 };
      }
      stats[cat].total += 2; // max 2 per word
      stats[cat].score += answers[idx] !== undefined ? answers[idx] : 0;
    });
    return stats;
  };

  const handleSaveResult = () => {
    const stats = getCategoryStats();
    const subBreakdown = Object.entries(stats)
      .map(([cat, val]) => `${cat}: ${val.score}/${val.total} P.`)
      .join(', ');

    const noteText = `Rechtschreib-Strategiecheck (Stufe ${grade}). ` +
      `Punkte: ${earnedPoints}/${maxPossiblePoints} | ` +
      `Schwerpunkte: ${subBreakdown}.` +
      (customNote ? `\nLehrer-Notiz: ${customNote}` : '');

    onSave({
      testId: 'live-rechtschreiben',
      score: earnedPoints,
      foerderbedarf,
      note: noteText,
      meta: {
        type: 'rechtschreiben',
        grade,
        earnedPoints,
        maxPossiblePoints,
        percentage: Math.round((earnedPoints / maxPossiblePoints) * 100),
        answers: activePool.map((item, idx) => ({
          word: item.word,
          category: item.category,
          score: answers[idx] || 0
        }))
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
              <span className="inline-block px-2.5 py-0.5 bg-pink-100 text-pink-700 text-[0.625rem] font-bold uppercase tracking-widest rounded-full mb-1">
                Rechtschreiben
              </span>
              <h3 className="text-xl font-extrabold text-slate-800">✍️ Rechtschreib-Strategien</h3>
              <p className="text-xs text-slate-500 mt-1">Gezieltes Diktieren eines stufengerechten Wörterpools zur Beobachtung verwendeter Rechtschreibstrategien.</p>
            </div>
            <button onClick={onClose} className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition-all">
              Schließen
            </button>
          </div>

          <div className="p-4 bg-pink-50 border border-pink-100 rounded-2xl flex gap-3 text-xs text-pink-900 leading-relaxed">
            <Info size={18} className="text-pink-500 flex-shrink-0 mt-0.5" />
            <div>
              <strong>So läuft das lautlose Diktat:</strong> Schreiben Sie die Wörter dem Kind einzeln vor (auf Papier/Heft). 
              Sie lesen das Diktierwort groß vom Bildschirm ab und diktieren es. 
              Geben Sie die Bewertung ab, je nachdem, ob das Kind das Wort richtig schreibt oder die Regel schlüssig erklären kann.
            </div>
          </div>

          {/* Stufen-Auswahl */}
          <div className="space-y-3">
            <label className="block text-[0.6875rem] font-black uppercase tracking-wider text-slate-400">Schulstufen-Differenzierung & Wörterzahl</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                    grade === g 
                      ? 'bg-pink-600 border-pink-700 text-white font-extrabold shadow-sm' 
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs font-black">Stufe {g}</span>
                  <span className="text-[0.625rem] font-bold uppercase tracking-wider mt-1.5 leading-none">
                    {g === 1 ? '6 Wörter' : g === 2 ? '8 Wörter' : g === 3 ? '10 Wörter' : '12 Wörter'}
                  </span>
                  <span className="text-[0.5625rem] opacity-75 font-normal mt-0.5">
                    {g === 1 ? 'Lauttreu & Nomen' : g === 2 ? 'ck, tz & ss' : g === 3 ? 'ie- & stummes h' : 'Mischregeln / Auslaut'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Student review segment */}
          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between">
            <div>
              <span className="block text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">Kind am Tisch</span>
              <span className="text-sm font-extrabold text-slate-800">{student?.vorname} {student?.nachname}</span>
            </div>
            <div className="text-right">
              <span className="block text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">Lehrplan-Pool</span>
              <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">Stufe {grade} Standards</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleStartTest}
              className="py-4 bg-pink-600 hover:bg-pink-700 text-white font-extrabold rounded-2xl shadow-sm hover:shadow transition-all text-center flex items-center justify-center gap-2 text-md"
            >
              <Play size={18} fill="white" /> Diagnosediktat starten
            </button>
            <button
              onClick={() => {
                handleStartTest();
                setSchuelerModus(true);
              }}
              className="py-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl shadow-sm hover:shadow transition-all text-center flex items-center justify-center gap-2 text-md"
            >
              🖥️ Schüler-Vollbild starten
            </button>
          </div>
        </div>
      )}

      {/* 2. ACTIVE DICTATION SCREEN (TEACHER VIEW) */}
      {phase === 'dictation' && (
        <div className="flex flex-col">
          <div className="bg-gradient-to-r from-pink-600 to-rose-700 text-white p-5 flex justify-between items-center">
            <div>
              <span className="text-[0.625rem] font-black uppercase tracking-wider block opacity-75">Diktat läuft • Stufe {grade}</span>
              <h4 className="font-extrabold text-white text-md">Lies dem Kind laut vor</h4>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSchuelerModus(true)}
                className="text-xs bg-amber-500 hover:bg-amber-600 border border-amber-600 text-slate-950 px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 shadow"
              >
                🖥️ Schüler-Vollbild
              </button>
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="text-xs bg-white/15 hover:bg-white/25 border border-white/20 text-white px-3.5 py-1.5 rounded-xl transition-all"
              >
                Abbrechen
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            
            <div className="flex justify-between items-center">
              <span className="text-xs font-extrabold text-pink-700 bg-pink-50 px-3 py-1 rounded-full uppercase tracking-wider">
                Wort {currentIndex + 1} von {itemsCount}
              </span>
              {currentIndex > 0 && (
                <button
                  onClick={handleBackToWord}
                  className="text-xs text-slate-500 flex items-center gap-1.5 hover:text-slate-800 font-sans"
                >
                  <ArrowLeft size={13} /> Vorheriges Wort bearbeiten
                </button>
              )}
            </div>

            {/* Main showing word card for the teacher */}
            <div className="p-8 bg-white border border-slate-200 rounded-3xl text-center space-y-3 shadow-sm relative overflow-hidden flex flex-col items-center">
              <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-500 text-[0.625rem] font-black uppercase tracking-wider rounded mb-2">
                Diktierwort ({activePool[currentIndex].category})
              </span>
              
              {showSolution ? (
                <>
                  {/* Very large word for the teacher to easy spot and read */}
                  <h2 className="text-4xl font-extrabold text-pink-600 font-sans tracking-wide leading-none">{activePool[currentIndex].word}</h2>
                  
                  <p className="text-xs text-slate-500 italic max-w-sm mx-auto pt-2">
                    "Soll-Vorgabe: {activePool[currentIndex].hint}"
                  </p>
                </>
              ) : (
                <button
                  onClick={() => setShowSolution(true)}
                  className="px-4 py-2.5 bg-pink-50 hover:bg-pink-100 text-[0.75rem] font-black text-pink-600 rounded-xl transition-all border border-pink-100 uppercase tracking-wider"
                >
                  👁️ Wort anzeigen / diktieren
                </button>
              )}
            </div>

            {/* Score rating panel */}
            <div className="space-y-3">
              <span className="block text-center text-xs text-slate-400 uppercase tracking-widest font-sans">Schreibvorgang bewerten:</span>
              
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleScoreWord(0)}
                  className="p-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all"
                >
                  <span className="text-xl">❌</span>
                  <span className="font-extrabold text-xs">Falsch</span>
                  <span className="text-[0.5625rem] opacity-75 font-sans">0 Punkte</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleScoreWord(1)}
                  className="p-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all"
                >
                  <span className="text-xl">🌗</span>
                  <span className="font-extrabold text-xs">Regel erklärt</span>
                  <span className="text-[0.5625rem] opacity-75 font-sans">1 Punkt</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleScoreWord(2)}
                  className="p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl flex flex-col items-center justify-center gap-1 transition-all shadow-md"
                >
                  <span className="text-xl">✅</span>
                  <span className="font-extrabold text-xs">Richtig</span>
                  <span className="text-[0.5625rem] opacity-75 font-sans">2 Punkte</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 3. DIAGNOSTIC RESULT DETAIL SCREEN */}
      {phase === 'result' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-400 block uppercase">Diktat-Abschluss</span>
              <h3 className="text-xl font-extrabold text-slate-800">📊 Strategie-Fehleranalyse</h3>
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
              <span className="block text-[0.625rem] font-bold text-slate-400 uppercase">Strategie-Gesamtpunkte</span>
              <span className="block text-2xl font-black text-slate-900 mt-1 font-mono">
                {earnedPoints} <span className="text-sm font-medium text-slate-400">/ {maxPossiblePoints}</span>
              </span>
              <span className="text-[0.625rem] text-slate-400 block mt-0.5">Diktierpunkte erreicht</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
              <span className="block text-[0.625rem] font-bold text-slate-400 uppercase">Erkennungs-Prozentsatz</span>
              <span className="block text-2xl font-black text-slate-900 mt-1 font-mono">
                {Math.round((earnedPoints / maxPossiblePoints) * 100)}%
              </span>
              <span className="text-[0.625rem] text-slate-400 block mt-0.5">Aufgabenpool für die {grade}. Klasse</span>
            </div>

            <div className={`p-4 rounded-2xl text-center shadow-sm border ${
              foerderbedarf ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <span className="block text-[0.625rem] font-black uppercase text-slate-500">Pädagogischer Prüfhinweis</span>
              <span className="block text-md font-bold mt-1">
                {earnedPoints >= maxPossiblePoints * 0.8 ? 'Sicher' : earnedPoints >= maxPossiblePoints * 0.65 ? 'Weiter beobachten' : 'Gezielt unterstützen'}
              </span>
              <span className="text-[0.625rem] opacity-75 block mt-0.5">
                {earnedPoints < (maxPossiblePoints * 0.65) ? 'Strategien gezielt weiter beobachten' : 'In diesem Wörterpool überwiegend sicher'}
              </span>
            </div>

          </div>

          {/* Categories Sub-Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest font-sans">Aufschlüsselung nach Fehlerquelle und Strategie</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(getCategoryStats()).map(([cat, val]) => {
                const percent = Math.round((val.score / val.total) * 100);
                let badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
                if (percent < 50) badgeColor = "bg-rose-50 text-rose-700 border-rose-100";
                else if (percent < 75) badgeColor = "bg-amber-50 text-amber-700 border-amber-100";

                return (
                  <div key={cat} className={`p-4 bg-white border rounded-2xl shadow-sm flex flex-col justify-between ${badgeColor}`}>
                    <span className="text-[0.625rem] uppercase font-black tracking-wider opacity-95">{cat}</span>
                    <div className="flex justify-between items-end mt-2">
                      <span className="text-lg font-black font-mono">{val.score} <span className="text-xs font-normal">/ {val.total} P.</span></span>
                      <span className="text-xs font-black">{percent}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* List of dictation results */}
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest font-sans">Einzelwort-Bewertung</h4>
            <div className="p-4 bg-white border border-slate-200 rounded-2xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {activePool.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center font-sans">
                  <div>
                    <strong className="text-slate-800">{item.word}</strong>
                    <span className="block text-[0.5625rem] text-slate-450 mt-0.5">{item.category}</span>
                  </div>
                  <span className="font-extrabold text-slate-800 font-mono">
                    {answers[idx] === 2 ? '2P' : answers[idx] === 1 ? '1P' : '0P'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Observations input notes */}
          <div className="space-y-2">
            <label className="block text-[0.6875rem] font-black uppercase tracking-wider text-slate-400">Lehrbeobachtungen (Optional)</label>
            <textarea
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="z.B. Lässt oft Endungen aus, verwechselt d/t systematisch, arbeitet langsam aber sehr ordentlich..."
              className="w-full text-xs p-3 bg-white border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500 h-16 resize-none"
            />
          </div>

          {/* Save & Repeat buttons footer */}
          <div className="flex gap-3 justify-end col-span-3">
            <button
              onClick={() => setPhase('setup')}
              className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-all"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSaveResult}
              className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-extrabold rounded-2xl text-xs transition-all shadow-sm flex items-center gap-1.5"
            >
              <Save size={14} /> Testergebnis speichern
            </button>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRMATION DIALOG */}
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
              <h4 className="text-md font-extrabold text-slate-800">Diktat abbrechen?</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Sind Sie sicher, dass Sie das Diktat vorzeitig abbrechen möchten? Sämtliche Antworten dieses Durchgangs gehen unwiderruflich verloren.
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

      {/* SCHÜLER-VOLLBILD OVERLAY */}
      <AnimatePresence>
        {schuelerModus && phase === 'dictation' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950 z-[99999] flex flex-col p-6 sm:p-12 overflow-y-auto select-none items-center justify-center text-center font-sans"
          >
            {/* Top Toolbar */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-center text-slate-400">
              <div className="flex items-center gap-3 text-left">
                <span className="text-2xl text-pink-500 animate-pulse">✍️</span>
                <div>
                  <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest block">Rechtschreiben Schüler-Ansicht</span>
                  <h4 className="text-sm font-bold text-slate-200">
                    Wortschatz-Diagnose • Wort {currentIndex + 1} von {itemsCount}
                  </h4>
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

            {/* Giant Center Card */}
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl relative space-y-6 my-12">
              <div className="w-full flex flex-col items-center space-y-6">
                
                {/* Child typing area */}
                <div className="bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-2xl border border-slate-200 text-center relative w-full space-y-6">
                  <div>
                    <span className="text-xs font-black text-pink-500 uppercase tracking-widest block mb-2">Tippe das Wort ein:</span>
                    <h2 className="text-lg font-bold text-slate-400">Höre genau zu und schreibe das diktierte Wort hier hinein</h2>
                  </div>

                  <input
                    type="text"
                    value={studentInput}
                    onChange={(e) => setStudentInput(e.target.value)}
                    placeholder="Wort eintippen..."
                    className="w-full max-w-lg text-center text-3xl font-black py-4 border-b-4 border-slate-200 focus:border-pink-500 focus:outline-none text-slate-900 placeholder:text-slate-200"
                    autoFocus
                  />
                </div>

                {/* Teacher scoring panel in the overlay (with solution toggle) */}
                <div className="space-y-4 max-w-md w-full bg-slate-900/60 border border-slate-800/80 p-5 rounded-3xl">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1">
                    <span>Erwartete Schreibweise ({activePool[currentIndex].category}):</span>
                    {showSolution ? (
                      <span className="text-pink-400 font-black tracking-wide text-md">
                        {activePool[currentIndex].word}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowSolution(true)}
                        className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded"
                      >
                        💡 Wort einblenden
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleScoreWord(0)}
                      className="py-3 bg-rose-600/20 hover:bg-rose-600 border border-rose-500/30 text-rose-300 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 shadow-md"
                    >
                      <span>Falsch (0 P)</span>
                      <span className="text-[8px] opacity-75 font-mono">Taste ←</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleScoreWord(1)}
                      className="py-3 bg-amber-600/20 hover:bg-amber-600 border border-amber-500/30 text-amber-300 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 shadow-md"
                    >
                      <span>Teilweise (1 P)</span>
                      <span className="text-[8px] opacity-75 font-mono">Taste ↓</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleScoreWord(2)}
                      className="py-3 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 text-emerald-300 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 shadow-md"
                    >
                      <span>Richtig (2 P)</span>
                      <span className="text-[8px] opacity-75 font-mono">Taste →</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Keyboard helper footer */}
            <div className="mt-8 text-[11px] text-slate-500 font-bold tracking-wide uppercase">
              Tastatur: [Leertaste] = Wort einblenden • [Pfeil links] = 0 Punkte • [Pfeil unten] = 1 Punkt • [Pfeil rechts] = 2 Punkte
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
