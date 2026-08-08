import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, RotateCcw, Save, Eye, Sparkles, AlertCircle, HelpCircle, UserCheck
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

interface ZehnerQuestion {
  task: string;
  ans: string;
  type: 'addition' | 'subtraction';
}

type StrategyType = 'automatisiert' | 'zerlegung' | 'schrittweise' | 'finger' | 'falsch';

interface StrategyMapping {
  value: StrategyType;
  label: string;
  description: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

const STRATEGIES: StrategyMapping[] = [
  { value: 'automatisiert', label: 'Automatisiert', description: 'Sofort gewusst (ohne Rechenprozess)', bgColor: 'bg-emerald-50', textColor: 'text-emerald-800', borderColor: 'border-emerald-200' },
  { value: 'zerlegung', label: 'Zerlegung (z.B. 8+2+3)', description: 'Strukturiert bis 10 und dann weiter', bgColor: 'bg-blue-50', textColor: 'text-blue-800', borderColor: 'border-blue-200' },
  { value: 'schrittweise', label: 'Schrittweise / Zählend', description: 'Rechnet in kleineren Schritten hoch/runter', bgColor: 'bg-indigo-50', textColor: 'text-indigo-800', borderColor: 'border-indigo-200' },
  { value: 'finger', label: 'Fingerrechnen', description: 'Zählt mühsam unter Zuhilfenahme der Finger', bgColor: 'bg-amber-50', textColor: 'text-amber-800', borderColor: 'border-amber-200' },
  { value: 'falsch', label: 'Falsch gelöst', description: 'Weist falsches Rechenergebnis auf', bgColor: 'bg-rose-50', textColor: 'text-rose-800', borderColor: 'border-rose-200' }
];

export const MathTest5Zehneruebergang: React.FC<TestProps> = ({
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
  const [questions, setQuestions] = useState<ZehnerQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selections, setSelections] = useState<StrategyType[]>([]);
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);
  const [customNote, setCustomNote] = useState<string>('');
  const [showSolution, setShowSolution] = useState<boolean>(false);

  useEffect(() => {
    setShowSolution(false);
  }, [currentIndex]);

  // Generates 8 distinct carry questions matching the grade rules
  const generateQuestions = (selectedGrade: number): ZehnerQuestion[] => {
    const list: ZehnerQuestion[] = [];
    const usedKeys = new Set<string>();

    const tryAdd = (q: ZehnerQuestion) => {
      if (!usedKeys.has(q.task)) {
        list.push(q);
        usedKeys.add(q.task);
        return true;
      }
      return false;
    };

    const pools: Record<number, { add: ZehnerQuestion[]; sub: ZehnerQuestion[] }> = {
      1: {
        add: [
          { task: '8 + 5', ans: '13', type: 'addition' },
          { task: '9 + 4', ans: '13', type: 'addition' },
          { task: '7 + 6', ans: '13', type: 'addition' },
          { task: '8 + 7', ans: '15', type: 'addition' },
          { task: '6 + 5', ans: '11', type: 'addition' },
          { task: '9 + 8', ans: '17', type: 'addition' },
          { task: '7 + 5', ans: '12', type: 'addition' },
          { task: '8 + 6', ans: '14', type: 'addition' }
        ],
        sub: [] // Stufe 1 is addition only for standard 20-carry
      },
      2: {
        add: [
          { task: '28 + 5', ans: '33', type: 'addition' },
          { task: '47 + 6', ans: '53', type: 'addition' },
          { task: '59 + 4', ans: '63', type: 'addition' },
          { task: '36 + 8', ans: '44', type: 'addition' },
          { task: '65 + 7', ans: '72', type: 'addition' },
          { task: '78 + 9', ans: '87', type: 'addition' }
        ],
        sub: [
          { task: '32 - 5', ans: '27', type: 'subtraction' },
          { task: '45 - 8', ans: '37', type: 'subtraction' },
          { task: '53 - 6', ans: '47', type: 'subtraction' },
          { task: '61 - 4', ans: '57', type: 'subtraction' },
          { task: '74 - 7', ans: '67', type: 'subtraction' },
          { task: '85 - 9', ans: '76', type: 'subtraction' }
        ]
      },
      3: {
        add: [
          { task: '28 + 15', ans: '43', type: 'addition' },
          { task: '37 + 26', ans: '63', type: 'addition' },
          { task: '49 + 18', ans: '67', type: 'addition' },
          { task: '56 + 27', ans: '83', type: 'addition' },
          { task: '35 + 48', ans: '83', type: 'addition' },
          { task: '19 + 55', ans: '74', type: 'addition' }
        ],
        sub: [
          { task: '52 - 16', ans: '36', type: 'subtraction' },
          { task: '43 - 27', ans: '16', type: 'subtraction' },
          { task: '61 - 38', ans: '23', type: 'subtraction' },
          { task: '75 - 29', ans: '46', type: 'subtraction' },
          { task: '84 - 47', ans: '37', type: 'subtraction' },
          { task: '93 - 56', ans: '37', type: 'subtraction' }
        ]
      },
      4: {
        add: [
          { task: '285 + 37', ans: '322', type: 'addition' },
          { task: '348 + 56', ans: '404', type: 'addition' },
          { task: '519 + 63', ans: '582', type: 'addition' },
          { task: '436 + 48', ans: '484', type: 'addition' },
          { task: '659 + 45', ans: '704', type: 'addition' },
          { task: '728 + 77', ans: '805', type: 'addition' }
        ],
        sub: [
          { task: '312 - 36', ans: '276', type: 'subtraction' },
          { task: '425 - 48', ans: '377', type: 'subtraction' },
          { task: '533 - 58', ans: '475', type: 'subtraction' },
          { task: '614 - 36', ans: '578', type: 'subtraction' },
          { task: '745 - 57', ans: '688', type: 'subtraction' },
          { task: '852 - 76', ans: '776', type: 'subtraction' }
        ]
      }
    };

    const pool = pools[selectedGrade] || pools[1];

    if (selectedGrade === 1) {
      // Stufe 1 is addition pool only
      const shuffled = [...pool.add].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, 8);
    } else {
      // Mix 4 addition and 4 subtraction
      const adds = [...pool.add].sort(() => 0.5 - Math.random()).slice(0, 4);
      const subs = [...pool.sub].sort(() => 0.5 - Math.random()).slice(0, 4);
      const combined = [...adds, ...subs].sort(() => 0.5 - Math.random());
      return combined;
    }
  };

  const handleStart = () => {
    const list = generateQuestions(grade);
    setQuestions(list);
    setCurrentIndex(0);
    setSelections([]);
    setPhase('test');
  };

  const handleRate = (strategy: StrategyType) => {
    setSelections((prev) => [...prev, strategy]);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setPhase('result');
    }
  };

  const handleReset = () => {
    setQuestions([]);
    setCurrentIndex(0);
    setSelections([]);
    setPhase('setup');
  };

  // Compile statistics
  const countStats = (strat: StrategyType) => selections.filter(s => s === strat).length;

  const getPercentageStats = () => {
    const correctCount = selections.filter(s => s !== 'falsch').length;
    const isAutomated = countStats('automatisiert') >= 5;
    const isFingerDependent = countStats('finger') >= 3;
    const isFailing = countStats('falsch') >= 4;

    return {
      correctCount,
      isAutomated,
      isFingerDependent,
      isFailing
    };
  };

  const hasFörderbedarf = selections.filter(s => s === 'falsch' || s === 'finger').length >= 3;

  // Dynamic pedagogical rule text matching current selection
  const getPedagogicalText = () => {
    const { isAutomated, isFingerDependent, isFailing } = getPercentageStats();

    if (isFailing) {
      return "Beobachtungshinweis: In diesem Durchgang traten beim Zehnerübergang mehrere Fehler auf. Zehnerergänzung und Stellenbündelung können mit strukturiertem Material weiter beobachtet und geübt werden.";
    }
    if (grade >= 2 && isFingerDependent) {
      return "Pädagogischer Hinweis: Das Kind nutzte in diesem Durchgang häufig die Finger. Das ist zunächst eine beobachtbare Strategie. Ergänzend können strukturierte Strategien wie Zerlegen zur 10 mit Schüttelboxen oder Zehnerkarten angeboten werden.";
    }
    if (isAutomated) {
      return "Starkes Ergebnis in diesem Durchgang: Lösungen wurden überwiegend sicher und ohne sichtbares Abzählen gefunden. Weitere Beobachtungen in unterschiedlichen Aufgabenformaten sichern die Einschätzung ab.";
    }
    
    // Default
    return "✅ Solides Einstiegsprofil. Das Kind nutzt strukturierte Zerlegungsstrategien (z.B. erst bis zur 10 rechnen, dann Rest addieren). Dies ist eine mathematisch hervorragende und gesunde Übergangsstrategie. Zur Rechentempobeschleunigung wird regelmäßiges, kurzes Üben empfohlen.";
  };

  const handleSaveResult = () => {
    const stats = getPercentageStats();
    const mapStrats = STRATEGIES.map(st => `${st.label}: ${countStats(st.value)}`).join(', ');

    const finalNote = `1:1 Zehnerübergang & Strategien (Stufe ${grade}). ` +
      `Korrekt berechnet: ${stats.correctCount}/8 | ` +
      `Profil: ${mapStrats}. ` +
      (customNote ? `\nNotiz: ${customNote}` : '');

    onSave({
      testId: 'live-zehneruebergang',
      score: stats.correctCount,
      foerderbedarf: hasFörderbedarf,
      note: finalNote,
      meta: {
        type: 'zehneruebergang',
        grade,
        correctCount: stats.correctCount,
        selections: selections.map((sel, idx) => ({
          task: questions[idx].task,
          strategy: sel
        })),
        counts: {
          automatisiert: countStats('automatisiert'),
          zerlegung: countStats('zerlegung'),
          schrittweise: countStats('schrittweise'),
          finger: countStats('finger'),
          falsch: countStats('falsch')
        },
        pedagogicalFeedback: getPedagogicalText()
      }
    });
  };

  return (
    <div className="relative" id="zehneruebergang-diagnostic-panel">
      {/* Absolute cancellation modal */}
      <AnimatePresence>
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] p-8 max-w-md w-full border border-slate-200 shadow-2xl"
            >
              <h3 className="text-[1.25rem] font-black text-slate-800 leading-tight">Test abbrechen?</h3>
              <p className="text-[0.875rem] text-slate-500 mt-3 leading-relaxed">
                Der aktuelle Testfortschritt von {student?.vorname} geht verloren. Sicher abbrechen?
              </p>
              <div className="flex gap-3 mt-6 justify-end">
                <button 
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[0.8125rem] font-bold"
                >
                  Weiterrechnen
                </button>
                <button 
                  onClick={() => {
                    setShowCancelConfirm(false);
                    handleReset();
                  }}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[0.8125rem] font-bold"
                >
                  Ja, abbrechen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md min-h-[600px] flex flex-col">
        {/* Header bar */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-6 rounded-t-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full">
              Zehnerübergang & Strategie-Radar
            </span>
            <h3 className="text-[1.25rem] leading-none font-black">
              {student ? `${student.vorname} ${student.nachname}` : 'Schülerauswahl fehlt'}
            </h3>
          </div>
          <button 
            onClick={() => {
              if (phase === 'test') {
                setShowCancelConfirm(true);
              } else {
                onClose();
              }
            }}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-[0.75rem] leading-tight font-bold transition-all self-start sm:self-auto"
          >
            {phase === 'test' ? 'Abbrechen' : 'Zur Übersicht'}
          </button>
        </div>

        {/* SETUP PHASE */}
        {phase === 'setup' && (
          <div className="flex-1 p-8 flex flex-col justify-between">
            <div className="max-w-xl mx-auto w-full space-y-6">
              <div className="flex gap-4 items-start bg-slate-50 p-5 rounded-2xl border border-slate-200 text-slate-700">
                <HelpCircle className="text-indigo-600 shrink-0 mt-0.5" size={20} />
                <div className="space-y-1.5">
                  <h4 className="font-bold text-[0.9375rem] leading-tight text-slate-800">Was wird untersucht?</h4>
                  <p className="text-[0.8125rem] leading-relaxed text-slate-500 font-sans">
                    Der Zehnerübergang ist die wichtigste Hürde im arithmetischen Anfangsunterricht. 
                    Dieser Check prüft nicht nur das Ergebnis (richtig/falsch), sondern erfasst qualitativ die <strong className="text-indigo-950 font-bold">vom Kind genutzten Rechentaktiken</strong> (z.B. strukturiertes Zerlegen vs. mühsames Fingerzählen oder direktes Automatisieren). 
                    Dies dient als hervorragende Grundlage für zielgerichteten Förderunterricht.
                  </p>
                </div>
              </div>

              {/* School grade selector */}
              <div className="space-y-3">
                <label className="block text-[0.8125rem] font-black uppercase tracking-wider text-slate-500">
                  Schulstufe eingrenzen:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((s) => (
                    <button
                      key={s}
                      onClick={() => setGrade(s)}
                      className={`py-3.5 px-4 rounded-xl text-[0.875rem] font-black transition-all border ${
                        grade === s 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10' 
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      Stufe {s}
                    </button>
                  ))}
                </div>
                <p className="text-[0.75rem] text-slate-400 font-sans leading-normal">
                  {grade === 1 && 'Stufe 1: Additionen im Zahlenraum 20 mit Zehnerübergang (z.B. 8 + 5).'}
                  {grade === 2 && 'Stufe 2: Gemischte Plus/Minus-Aufgaben im Zahlenraum 100 mit Übergang an der Einerstelle (z.B. 45 - 8).'}
                  {grade === 3 && 'Stufe 3: Additionen und Subtraktionen mit zweistelligen Operanden (z.B. 47 + 28).'}
                  {grade === 4 && 'Stufe 4: Komplexe dreistellige Operanden mit Überschreiten der Hunderter-Grenzen (z.B. 512 - 36).'}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6 flex justify-end">
              <button
                onClick={handleStart}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl text-[0.875rem] font-black shadow-lg shadow-indigo-600/20 flex items-center gap-2 hover:opacity-95"
              >
                <Play size={16} /> Strategie-Radar starten
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE TESTING PHASE */}
        {phase === 'test' && questions.length > 0 && (
          <div className="flex-1 p-8 flex flex-col justify-between bg-slate-50/20">
            {/* Top progression progress */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-[0.8125rem] font-mono uppercase tracking-wider">
                Aufgabe {currentIndex + 1} von {questions.length} (Stufe {grade})
              </span>
              <div className="w-32 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-1.5 transition-all duration-300"
                  style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Task Area */}
            <div className="my-6 flex-1 flex flex-col items-center justify-center space-y-6">
              <span className="px-3.5 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-[0.6875rem] font-black uppercase text-indigo-800 tracking-wider">
                Bitte laut dem Kind zeigen / vorlesen
              </span>

              {/* Huge math numbers */}
              <h1 className="text-[4rem] font-black font-mono tracking-tight text-slate-800 leading-none">
                {questions[currentIndex].task}
              </h1>

              {/* Dezent gray solution under task */}
              <div className="pt-2 flex flex-col items-center">
                <span className="text-[0.6875rem] uppercase text-slate-300 block tracking-normal text-center mb-1">Ergebnis:</span>
                {showSolution ? (
                  <span className="text-[1.125rem] font-black font-mono text-slate-500 block text-center leading-none">
                    {questions[currentIndex].ans}
                  </span>
                ) : (
                  <button
                    onClick={() => setShowSolution(true)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[0.6875rem] font-bold text-slate-500 rounded-lg transition-all border border-slate-200"
                  >
                    💡 Lösung anzeigen
                  </button>
                )}
              </div>
            </div>

            {/* Qualitative strategy selection buttons */}
            <div className="space-y-4 border-t border-slate-100 pt-6">
              <span className="text-[0.8125rem] font-black uppercase tracking-wider text-slate-400 block text-center">
                Beobachtete Taktik des Kindes beim Lösen:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
                {STRATEGIES.map((strat) => (
                  <button
                    key={strat.value}
                    onClick={() => handleRate(strat.value)}
                    className={`p-3.5 rounded-2xl border text-center transition-all ${strat.bgColor} ${strat.borderColor} ${strat.textColor} hover:brightness-95 flex flex-col items-center justify-center space-y-1`}
                  >
                    <span className="text-[0.8125rem] font-black uppercase tracking-tight block">
                      {strat.label}
                    </span>
                    <span className="text-[0.625rem] font-normal leading-normal opacity-75 hidden md:block">
                      {strat.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RESULTS SCREEN */}
        {phase === 'result' && (
          <div className="flex-1 p-8 flex flex-col justify-between">
            <div className="max-w-3xl mx-auto w-full space-y-8">
              {/* Outcome status widget */}
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 justify-around shadow-sm">
                <div className="space-y-1 p-4 bg-white rounded-2xl border border-slate-100 text-center sm:text-left">
                  <span className="text-[0.6875rem] uppercase font-black text-slate-400 block tracking-wider">Errechnet</span>
                  <div className="flex items-baseline justify-center sm:justify-start gap-1">
                    <span className="text-[2.25rem] font-black text-slate-800 leading-none">
                      {selections.filter(s => s !== 'falsch').length}
                    </span>
                    <span className="text-slate-400 font-black text-[1.25rem]">/ 8</span>
                  </div>
                  <span className="text-[0.6875rem] font-bold text-slate-400 block">Korrekt gelöste Rechenschritte</span>
                </div>

                <div className="space-y-1 p-4 bg-white rounded-2xl border border-slate-100 text-center sm:text-left">
                  <span className="text-[0.6875rem] uppercase font-black text-slate-400 block tracking-wider">Statusprüfung</span>
                  <div className="flex items-baseline justify-center sm:justify-start">
                    <span className={`text-[1.125rem] font-black ${!hasFörderbedarf ? 'text-emerald-700' : 'text-amber-600'}`}>
                      {!hasFörderbedarf ? 'In dieser Erhebung stabil' : 'Pädagogischer Prüfhinweis'}
                    </span>
                  </div>
                  <span className="text-[0.6875rem] font-bold text-slate-400 block leading-normal">
                    {!hasFörderbedarf ? 'Sichere Taktiken vorhanden' : 'Zersplitterte Strategien'}
                  </span>
                </div>
              </div>

              {/* STRATEGIES PROFILE OVERVIEW */}
              <div className="space-y-3">
                <h4 className="text-[0.875rem] font-black uppercase tracking-wider text-slate-500">
                  📋 Qualitatives Strategien-Profil:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {STRATEGIES.map((strat) => {
                    const count = countStats(strat.value);
                    const percent = Math.round((count / 8) * 100);

                    return (
                      <div 
                        key={strat.value} 
                        className={`p-4 rounded-xl border text-center space-y-1.5 shadow-xs ${strat.bgColor} ${strat.borderColor} ${strat.textColor}`}
                      >
                        <span className="text-[0.8125rem] font-black uppercase block leading-none">{strat.label}</span>
                        <div className="text-[1.75rem] font-black leading-none font-mono">
                          {count}
                        </div>
                        <span className="text-[0.625rem] font-bold opacity-75 block">({percent}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pedagogical text output block */}
              <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-5 space-y-2">
                <h4 className="text-[0.8125rem] font-black uppercase text-amber-800 tracking-wider flex items-center gap-1.5">
                  <Sparkles size={16} /> Didaktische Empfehlung:
                </h4>
                <p className="text-[0.875rem] leading-relaxed text-slate-600 font-sans">
                  {getPedagogicalText()}
                </p>
              </div>

              {/* Written observations */}
              <div className="space-y-2">
                <label className="block text-[0.8125rem] font-black uppercase tracking-wider text-slate-500">
                  Freihändige Notizen zur Rechenmethode:
                </label>
                <textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Z.B.: Hat Mühe bei Minusaufgaben, Zerlegungsstrategie bei Plus klappt einwandfrei über die 10..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[0.875rem] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans leading-relaxed"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row justify-between gap-3">
              <button
                onClick={handleReset}
                className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[0.8125rem] font-bold flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} /> Test wiederholen
              </button>
              <button
                onClick={handleSaveResult}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[0.8125rem] font-black flex items-center justify-center gap-2 shadow-sm"
              >
                <Save size={16} /> Ergebnis sichern & Schließen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
