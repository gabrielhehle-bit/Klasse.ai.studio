import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, RotateCcw, Save, ArrowLeft, Target, Sparkles, Binary, Sliders
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

interface ZahlenraumQuestion {
  type: 'nachbar' | 'stellenwert' | 'runden' | 'halbieren_verdoppeln' | 'zahlenstrahl';
  taskText: string;
  questionText: string;
  solution: string;
  numberValue?: number;
  min?: number;
  max?: number;
  target?: number;
}

export const MathTest3Zahlenraum: React.FC<TestProps> = ({
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
  const [questions, setQuestions] = useState<ZahlenraumQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);
  const [customNote, setCustomNote] = useState<string>('');
  const [showSolution, setShowSolution] = useState<boolean>(false);

  useEffect(() => {
    setShowSolution(false);
  }, [currentIndex]);

  // Generates 10 math orientation questions based on rules
  const generateQuestions = (selectedGrade: number): ZahlenraumQuestion[] => {
    const list: ZahlenraumQuestion[] = [];
    const usedNumbers = new Set<number>();

    const helpers = {
      getTensOnes: (num: number) => {
        const t = Math.floor(num / 10);
        const o = num % 10;
        return `${t} Z, ${o} E`;
      },
      getHTE: (num: number) => {
        const h = Math.floor(num / 100);
        const t = Math.floor((num % 100) / 10);
        const o = num % 10;
        return `${h} H, ${t} Z, ${o} E`;
      },
      getFullPlaces: (num: number) => {
        let remaining = num;
        const ht = Math.floor(remaining / 100000);
        remaining %= 100000;
        const zt = Math.floor(remaining / 10000);
        remaining %= 10000;
        const t = Math.floor(remaining / 1000);
        remaining %= 1000;
        const h = Math.floor(remaining / 100);
        remaining %= 100;
        const z = Math.floor(remaining / 10);
        const e = remaining % 10;

        const parts = [];
        if (ht > 0) parts.push(`${ht} HT`);
        if (zt > 0) parts.push(`${zt} ZT`);
        if (t > 0) parts.push(`${t} T`);
        if (h > 0) parts.push(`${h} H`);
        if (z > 0) parts.push(`${z} Z`);
        if (e > 0 || parts.length === 0) parts.push(`${e} E`);
        return parts.join(', ');
      }
    };

    while (list.length < 10) {
      if (selectedGrade === 1) {
        // ZR 20: 5x Nachbarzahlen, 3x Verdoppeln, 2x Halbieren
        if (list.length < 5) {
          const num = Math.floor(Math.random() * 17) + 2; // 2-18
          if (!usedNumbers.has(num)) {
            usedNumbers.add(num);
            list.push({
              type: 'nachbar',
              taskText: String(num),
              questionText: 'Nenne mir den Vorgänger (eine Zahl davor) und den Nachfolger (eine Zahl danach) dieser Zahl.',
              solution: `Vorgänger: ${num - 1}, Nachfolger: ${num + 1}`,
              numberValue: num
            });
          }
        } else if (list.length < 8) {
          // Double
          const num = Math.floor(Math.random() * 9) + 2; // 2-10
          if (!usedNumbers.has(num + 100)) { // Offset key to avoid collisions
            usedNumbers.add(num + 100);
            list.push({
              type: 'halbieren_verdoppeln',
              taskText: String(num),
              questionText: `Was ist das Doppelte von dieser Zahl? (Verdoppeln)`,
              solution: String(num * 2),
              numberValue: num
            });
          }
        } else {
          // Halve
          const evens = [4, 6, 8, 10, 12, 14, 16, 18, 20];
          const num = evens[Math.floor(Math.random() * evens.length)];
          if (!usedNumbers.has(num + 200)) {
            usedNumbers.add(num + 200);
            list.push({
              type: 'halbieren_verdoppeln',
              taskText: String(num),
              questionText: `Wie viel ist die Hälfte von dieser Zahl? (Halbieren)`,
              solution: String(num / 2),
              numberValue: num
            });
          }
        }
      } else if (selectedGrade === 2) {
        // ZR 100: 3x Stellenwert (Z/E), 3x Runden (T), 2x Nachbar, 2x Verdoppeln/Halbieren
        if (list.length < 3) {
          // Stellenwert
          const num = Math.floor(Math.random() * 80) + 19; // 19-98
          if (!usedNumbers.has(num)) {
            usedNumbers.add(num);
            list.push({
              type: 'stellenwert',
              taskText: String(num),
              questionText: 'Zerlege diese Zahl: Wie viele Zehner (Z) und wie viele Einer (E) hat sie?',
              solution: helpers.getTensOnes(num),
              numberValue: num
            });
          }
        } else if (list.length < 6) {
          // Rounding to tens
          const num = Math.floor(Math.random() * 75) + 12; // 12-87 (avoid exactly X5 or XX0 for ease)
          if (num % 5 !== 0) {
            usedNumbers.add(num + 100);
            const rounded = Math.round(num / 10) * 10;
            list.push({
              type: 'runden',
              taskText: String(num),
              questionText: 'Runde diese Zahl auf den nächsten Zehner auf oder ab.',
              solution: `Gerundet: ${rounded}`,
              numberValue: num
            });
          }
        } else if (list.length < 8) {
          // Nachbar
          const num = Math.floor(Math.random() * 78) + 11; // 11-88
          usedNumbers.add(num + 200);
          list.push({
            type: 'nachbar',
            taskText: String(num),
            questionText: 'Nenne die beiden Nachbarzahlen (Vorgänger / Nachfolger) von dieser Zahl.',
            solution: `Vorgänger: ${num - 1}, Nachfolger: ${num + 1}`,
            numberValue: num
          });
        } else {
          // Halbieren/Verdoppeln ZR100
          if (Math.random() > 0.5) {
            const num = Math.floor(Math.random() * 35) + 15; // 15-49
            usedNumbers.add(num + 300);
            list.push({
              type: 'halbieren_verdoppeln',
              taskText: String(num),
              questionText: `Verdopple diese Zahl im Kopf. Was ist das Doppelte?`,
              solution: String(num * 2),
              numberValue: num
            });
          } else {
            const evens = [24, 32, 40, 56, 64, 70, 80, 96];
            const num = evens[Math.floor(Math.random() * evens.length)];
            usedNumbers.add(num + 300);
            list.push({
              type: 'halbieren_verdoppeln',
              taskText: String(num),
              questionText: `Halbiere diese Zahl im Kopf. Was ist die Hälfte?`,
              solution: String(num / 2),
              numberValue: num
            });
          }
        }
      } else if (selectedGrade === 3) {
        // ZR 1000: 3x Stellenwert (HZE), 3x Runden (Z/H), 4x Zahlenstrahl
        if (list.length < 3) {
          const num = Math.floor(Math.random() * 800) + 101; // 101-900
          if (!usedNumbers.has(num)) {
            usedNumbers.add(num);
            list.push({
              type: 'stellenwert',
              taskText: String(num),
              questionText: 'Stellenwert zerlegen: Wie viele Hunderter (H), Zehner (Z) und Einer (E) hat diese Zahl?',
              solution: helpers.getHTE(num),
              numberValue: num
            });
          }
        } else if (list.length < 6) {
          const num = Math.floor(Math.random() * 780) + 112; // 112-892
          if (num % 10 !== 0) {
            const isToHundreds = Math.random() > 0.5;
            const place = isToHundreds ? 100 : 10;
            const rounded = Math.round(num / place) * place;
            list.push({
              type: 'runden',
              taskText: String(num),
              questionText: `Runde diese Zahl auf den nächsten ${isToHundreds ? 'Hunderter' : 'Zehner'}.`,
              solution: `Gerundet: ${rounded}`,
              numberValue: num
            });
          }
        } else {
          // Numbers line ranges
          const ranges = [
            { min: 0, max: 100, target: 40 },
            { min: 0, max: 1000, target: 700 },
            { min: 500, max: 600, target: 530 },
            { min: 0, max: 1000, target: 250 }
          ];
          const choice = ranges[list.length - 6];
          list.push({
            type: 'zahlenstrahl',
            taskText: `Zahlenstrahl von ${choice.min} bis ${choice.max}`,
            questionText: 'Schätze ab, welche Zahl mit dem roten Pfeil am Zahlenstrahl markiert ist.',
            solution: `Ca. ${choice.target} (Akzeptabel: +/- 5% des Gesamtbereichs)`,
            min: choice.min,
            max: choice.max,
            target: choice.target
          });
        }
      } else {
        // Stufe 4: ZR 1 Mio: 3x Stellenwerte, 3x Runden, 4x Große Zahlenstrahl
        if (list.length < 3) {
          const num = Math.floor(Math.random() * 890000) + 105000; // 105,000 - 995,000
          usedNumbers.add(num);
          list.push({
            type: 'stellenwert',
            taskText: num.toLocaleString('de-DE'),
            questionText: 'Nenne die genauen Stellenwerte dieser großen Zahl (HT, ZT, T, H, Z, E).',
            solution: helpers.getFullPlaces(num),
            numberValue: num
          });
        } else if (list.length < 6) {
          const num = Math.floor(Math.random() * 790000) + 105151;
          const places = [
            { label: 'Tausender (T)', factor: 1000 },
            { label: 'Zehntausender (ZT)', factor: 10000 },
            { label: 'Hunderter (H)', factor: 100 }
          ];
          const pl = places[list.length - 3];
          const rounded = Math.round(num / pl.factor) * pl.factor;
          list.push({
            type: 'runden',
            taskText: num.toLocaleString('de-DE'),
            questionText: `Runde diese große Zahl auf den nächsten ${pl.label}.`,
            solution: `Gerundet: ${rounded.toLocaleString('de-DE')}`,
            numberValue: num
          });
        } else {
          // Large numbers line
          const ranges = [
            { min: 0, max: 1000000, target: 300000 },
            { min: 200000, max: 300000, target: 270000 },
            { min: 0, max: 500000, target: 450000 },
            { min: 500000, max: 1000000, target: 820000 }
          ];
          const choice = ranges[list.length - 6];
          list.push({
            type: 'zahlenstrahl',
            taskText: `Zahlenstrahl von ${choice.min.toLocaleString('de-DE')} bis ${choice.max.toLocaleString('de-DE')}`,
            questionText: 'Schätze ab, welche große Zahl mit dem roten Pfeil am Zahlenstrahl markiert ist.',
            solution: `Ca. ${choice.target.toLocaleString('de-DE')} (Akzeptabel: +/- 5% des Gesamtbereichs)`,
            min: choice.min,
            max: choice.max,
            target: choice.target
          });
        }
      }
    }
    return list;
  };

  const handleStart = () => {
    const generated = generateQuestions(grade);
    setQuestions(generated);
    setCurrentIndex(0);
    setAnswers([]);
    setPhase('test');
  };

  const handleRate = (correct: boolean) => {
    setAnswers((prev) => [...prev, correct]);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setPhase('result');
    }
  };

  const handleReset = () => {
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers([]);
    setPhase('setup');
  };

  const correctCount = answers.filter(a => a).length;

  const getCategorizedResults = () => {
    const resultsByType: Record<string, { total: number; correct: number }> = {};
    questions.forEach((q, idx) => {
      if (idx < answers.length) {
        const key = q.type === 'nachbar' ? 'Nachbarzahlen' :
                    q.type === 'stellenwert' ? 'Stellenwert & Stellen' :
                    q.type === 'runden' ? 'Runden & Schätzen' :
                    q.type === 'halbieren_verdoppeln' ? 'Halbieren / Verdoppeln' : 'Zahlenstrahl schätzen';
        if (!resultsByType[key]) {
          resultsByType[key] = { total: 0, correct: 0 };
        }
        resultsByType[key].total += 1;
        if (answers[idx]) {
          resultsByType[key].correct += 1;
        }
      }
    });
    return resultsByType;
  };

  const handleSaveResult = () => {
    const hasFörderbedarf = correctCount < 7;
    const catStats = getCategorizedResults();
    const detailsText = Object.entries(catStats)
      .map(([k, v]) => `${k}: ${v.correct}/${v.total}`)
      .join(', ');

    const finalNote = `1:1 Zahlenraum-Check (Stufe ${grade}). ` +
      `Korrekt gelöst: ${correctCount}/10. ` +
      `Bereichsleistungen: ${detailsText}. ` +
      (customNote ? `\nNotiz: ${customNote}` : '');

    onSave({
      testId: 'live-zahlenraum',
      score: correctCount,
      foerderbedarf: hasFörderbedarf,
      note: finalNote,
      meta: {
        type: 'zahlenraum',
        grade,
        score: correctCount,
        answers: answers.map((ans, idx) => ({
          type: questions[idx].type,
          task: questions[idx].taskText,
          correct: ans
        })),
        breakdown: catStats
      }
    });
  };

  // Render a visual SVG numbers line for scale testing
  const renderZahlenstrahl = (q: ZahlenraumQuestion) => {
    if (q.min === undefined || q.max === undefined || q.target === undefined) return null;
    const totalRange = q.max - q.min;
    const percentPos = ((q.target - q.min) / totalRange) * 100;

    return (
      <div className="w-full bg-slate-50 p-6 rounded-2xl border border-slate-200 mt-4 space-y-4">
        <span className="text-[0.75rem] font-bold text-slate-400 uppercase tracking-wider block text-center">
          Visueller Zahlenstrahl (Dem Kind zeigen)
        </span>
        <div className="relative py-12 px-6">
          {/* Numbers Line bar */}
          <div className="h-2 bg-slate-300 w-full rounded-full relative">
            {/* Range markers */}
            <div className="absolute left-0 -top-8 text-[0.875rem] font-bold text-slate-600">
              {q.min.toLocaleString('de-DE')}
            </div>
            <div className="absolute right-0 -top-8 text-[0.875rem] font-bold text-slate-600">
              {q.max.toLocaleString('de-DE')}
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 -top-8 text-[0.75rem] font-mono text-slate-400">
              Mitte
            </div>
            
            {/* Tick marks on line */}
            <div className="absolute left-1/4 -translate-x-1/2 -top-1 w-0.5 h-4 bg-slate-400" />
            <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-0.5 h-4 bg-slate-400 animate-pulse" />
            <div className="absolute left-3/4 -translate-x-1/2 -top-1 w-0.5 h-4 bg-slate-400" />

            {/* Pointer Pin representing target amount */}
            <div 
              className="absolute -top-12 -translate-x-1/2 flex flex-col items-center group transition-all"
              style={{ left: `${percentPos}%` }}
            >
              {/* Pin body */}
              <div className="bg-rose-600 text-white p-2 rounded-lg font-black text-[0.875rem] leading-none mb-1 shadow-md shadow-rose-600/25">
                ?
              </div>
              {/* Pointer indicator */}
              <div className="w-3 h-3 bg-rose-600 rotate-45" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative" id="zahlenraum-diagnostic-panel">
      {/* Cancellation confirmation modal */}
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
        <div className="bg-gradient-to-r from-cyan-600 to-teal-700 text-white p-6 rounded-t-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full">
              Zahlenraum & Orientierung
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
                <Binary className="text-cyan-600 shrink-0 mt-0.5" size={20} />
                <div className="space-y-1.5">
                  <h4 className="font-bold text-[0.9375rem] leading-tight text-slate-800">Beschreibung der Aufgabenbereiche:</h4>
                  <p className="text-[0.8125rem] leading-relaxed text-slate-500">
                    Dieser 10-teilige Test ermittelt das strukturelle Stellenwert- und Zahlenverständnis im altersentsprechenden Zahlenraum des Kindes.
                    Es werden Nachbarzahlen, Abstraktionen von Stellenwerten (H, Z, E), mathematisches Runden sowie Verdoppelungs-/Halbierungsoperationen geprüft. 
                    <strong className="text-teal-900 block mt-1">Stufendifferenzierung:</strong>
                    Zahlenräume steigen progressiv von 20 (Stufe 1) über 100 (Stufe 2) und 1000 (Stufe 3) bis 1 Million (Stufe 4). Bei Stufe 3 und 4 ist ein visueller Zahlenstrahl-Schätzer integriert.
                  </p>
                </div>
              </div>

              {/* School grade selector */}
              <div className="space-y-3">
                <label className="block text-[0.8125rem] font-black uppercase tracking-wider text-slate-500">
                  Schulstufe wählen:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((s) => (
                    <button
                      key={s}
                      onClick={() => setGrade(s)}
                      className={`py-3.5 px-4 rounded-xl text-[0.875rem] font-black transition-all border ${
                        grade === s 
                          ? 'bg-cyan-600 text-white border-cyan-600 shadow-md shadow-cyan-600/10' 
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      Stufe {s}
                    </button>
                  ))}
                </div>
                <p className="text-[0.75rem] text-slate-400 font-sans leading-normal">
                  {grade === 1 && 'Stufe 1: Zahlenraum 20, nur Nachbarzahlen und einfaches Verdoppeln/Halbieren gerader Zahlen.'}
                  {grade === 2 && 'Stufe 2: Zahlenraum 100, Zehner/Einer-Stellenwerte, Runden auf Zehner, Halbieren/Verdoppeln im ZR100.'}
                  {grade === 3 && 'Stufe 3: Zahlenraum 1000, H/Z/E Stellen, Runden auf Zehner/Hunderter, Schätzskala am Zahlenstrahl.'}
                  {grade === 4 && 'Stufe 4: Zahlenraum bis 1.000.000, alle großen Stellenwerte (HT/ZT/E), Runden, große Skalierung.'}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6 flex justify-end">
              <button
                onClick={handleStart}
                className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl text-[0.875rem] font-black shadow-lg shadow-cyan-600/20 flex items-center gap-2 hover:opacity-95"
              >
                <Play size={16} /> Zahlenraum-Check starten
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
                  className="bg-cyan-600 h-1.5 transition-all duration-300"
                  style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Task Area */}
            <div className="my-6 flex-1 flex flex-col items-center justify-center space-y-6">
              <span className="px-3.5 py-1 bg-cyan-50 border border-cyan-100 rounded-full text-[0.6875rem] font-black uppercase text-cyan-800 tracking-wider">
                {questions[currentIndex].type === 'nachbar' ? 'Nachbarzahlen' :
                 questions[currentIndex].type === 'stellenwert' ? 'Stellenwert zerlegen' :
                 questions[currentIndex].type === 'runden' ? 'Runden & Schätzen' :
                 questions[currentIndex].type === 'halbieren_verdoppeln' ? 'Halbieren / Verdoppeln' : 'Zahlenstrahl schätzen'}
              </span>

              {/* Huge math number */}
              <h1 className="text-[3.25rem] font-black font-mono tracking-tight text-slate-800 leading-none">
                {questions[currentIndex].taskText}
              </h1>

              {/* Spoken prompt */}
              <p className="text-[0.9375rem] font-bold text-center text-slate-600 max-w-lg leading-relaxed">
                „{questions[currentIndex].questionText}“
              </p>

              {/* Render dynamic Number line if zahlenstrahl */}
              {questions[currentIndex].type === 'zahlenstrahl' && renderZahlenstrahl(questions[currentIndex])}

              {/* Dezent gray solutions for compiler */}
              <div className="pt-4 border-t border-slate-100 w-full max-w-sm text-center flex flex-col items-center">
                <span className="text-[0.6875rem] uppercase text-slate-400 block tracking-normal mb-1">Hilfe für Lehrkraft:</span>
                {showSolution ? (
                  <span className="text-[1rem] font-black font-mono text-slate-500">
                    {questions[currentIndex].solution}
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

            {/* Rating triggers */}
            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
              <button
                onClick={() => handleRate(false)}
                className="py-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl hover:bg-rose-100/80 hover:border-rose-300 text-[1rem] font-black uppercase tracking-wider transition-all"
              >
                🔴 Falsch
              </button>
              <button
                onClick={() => handleRate(true)}
                className="py-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl hover:bg-emerald-100/80 hover:border-emerald-300 text-[1rem] font-black uppercase tracking-wider transition-all"
              >
                🟢 Richtig
              </button>
            </div>
          </div>
        )}

        {/* RESULTS SCREEN */}
        {phase === 'result' && (
          <div className="flex-1 p-8 flex flex-col justify-between">
            <div className="max-w-2xl mx-auto w-full space-y-6">
              {/* Score dashboard */}
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 flex flex-col sm:flex-row items-center gap-6 justify-around text-center sm:text-left shadow-sm">
                <div className="space-y-1">
                  <span className="text-[0.75rem] uppercase font-black tracking-wider text-slate-400">Gesamtwert</span>
                  <div className="flex items-baseline justify-center sm:justify-start gap-1">
                    <span className="text-[2.5rem] font-black text-slate-800 tracking-tight">{correctCount}</span>
                    <span className="text-slate-400 font-black text-[1.25rem]">/ 10</span>
                  </div>
                  <span className="text-[0.75rem] text-slate-400 block font-bold">Korrekt gelöste Aufgaben</span>
                </div>

                <div className="h-px sm:h-12 w-12 sm:w-px bg-slate-200" />

                <div className="space-y-1">
                  <span className="text-[0.75rem] uppercase font-black tracking-wider text-slate-400">Kompetenz</span>
                  <div className="flex items-baseline justify-center sm:justify-start">
                    <span className={`text-[1.125rem] font-black ${correctCount >= 7 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {correctCount >= 9 ? 'Sicher' : correctCount >= 7 ? 'Weiter beobachten' : 'Gezielt unterstützen'}
                    </span>
                  </div>
                  <span className="text-[0.75rem] text-slate-400 block font-bold leading-normal">
                    {correctCount >= 7 ? 'Solides ZR-Gerüst vorhanden' : 'Orientierungsschwäche erfasst'}
                  </span>
                </div>
              </div>

              {/* Categorized answers */}
              <div className="space-y-3">
                <h4 className="text-[0.875rem] font-black uppercase tracking-wider text-slate-500">Ergebnisse nach Kompetenzbereichen:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(getCategorizedResults()).map(([catLabel, data]) => {
                    const pct = Math.round((data.correct / data.total) * 100);
                    return (
                      <div key={catLabel} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-xs">
                        <span className="text-[0.8125rem] text-slate-700 font-bold">{catLabel}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[0.8125rem] font-bold text-slate-500">
                            {data.correct}/{data.total}
                          </span>
                          <span className={`text-[0.8125rem] font-black ${
                            pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-500' : 'text-rose-600'
                          }`}>
                            ({pct}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes input */}
              <div className="space-y-2">
                <label className="block text-[0.8125rem] font-black uppercase tracking-wider text-slate-500">
                  Zusätzliche Beobachtungen (z.B. Zählrichtung, Stellenwertgedanken):
                </label>
                <textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Z.B.: Rundet rein mechanisch nach Regel, hat Schwierigkeiten beim Zerlegen der Hunderter-Stelle, schätzt den Zahlenstrahl extrem präzise ein..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[0.875rem] text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 font-sans leading-relaxed"
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
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[0.8125rem] font-black flex items-center justify-center gap-2 shadow-sm"
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
