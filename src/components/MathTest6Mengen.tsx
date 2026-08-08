import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, RotateCcw, Save, Eye, EyeOff, Sparkles, AlertCircle, HelpCircle, Layers
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

interface MengenItem {
  quantity: number;
  isStructured: boolean;
}

interface DotPosition {
  x: number;
  y: number;
}

export const MathTest6Mengen: React.FC<TestProps> = ({
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
  const [items, setItems] = useState<MengenItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);
  const [customNote, setCustomNote] = useState<string>('');
  const [showSolution, setShowSolution] = useState<boolean>(false);

  useEffect(() => {
    setShowSolution(false);
  }, [currentIndex]);

  // Flash visibility state
  const [flashStatus, setFlashStatus] = useState<'hidden' | 'ready' | 'flashing' | 'expired'>('ready');
  const flashTimerRef = useRef<any>(null);

  // Get display limit based on school grade
  const getDisplayLimitMs = (g: number): number => {
    if (g === 1) return 2000;
    if (g === 2) return 1500;
    return 1000; // Grades 3 and 4 have 1 second limits
  };

  // Generate 10 quantities: 5 structured, 5 unstructured
  const generateItems = (selectedGrade: number): MengenItem[] => {
    const list: MengenItem[] = [];
    
    // Choose quantities range
    let minQty = 1;
    let maxQty = 6;
    if (selectedGrade === 2) { minQty = 2; maxQty = 10; }
    else if (selectedGrade === 3) { minQty = 5; maxQty = 20; }
    else if (selectedGrade === 4) { minQty = 10; maxQty = 30; }

    const quantitiesStructured: number[] = [];
    const quantitiesUnstructured: number[] = [];

    const getRandQty = () => Math.floor(Math.random() * (maxQty - minQty + 1)) + minQty;

    // We want 5 of each type, no duplicate quantities within the sub-sets if possible
    while (quantitiesStructured.length < 5) {
      const q = getRandQty();
      if (!quantitiesStructured.includes(q)) {
        quantitiesStructured.push(q);
      }
    }
    while (quantitiesUnstructured.length < 5) {
      const q = getRandQty();
      if (!quantitiesUnstructured.includes(q)) {
        quantitiesUnstructured.push(q);
      }
    }

    // Interleave Structured and Unstructured
    for (let i = 0; i < 5; i++) {
      list.push({ quantity: quantitiesStructured[i], isStructured: true });
      list.push({ quantity: quantitiesUnstructured[i], isStructured: false });
    }

    return list;
  };

  const handleStart = () => {
    const generated = generateItems(grade);
    setItems(generated);
    setCurrentIndex(0);
    setAnswers([]);
    setPhase('test');
    setFlashStatus('ready');
  };

  // Triggers the timed flashing of the card
  const handleTriggerFlash = () => {
    if (flashStatus !== 'ready') return;
    
    setFlashStatus('flashing');
    const limit = getDisplayLimitMs(grade);

    flashTimerRef.current = setTimeout(() => {
      setFlashStatus('expired');
    }, limit);
  };

  // Record grading and proceed
  const handleRate = (correct: boolean) => {
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
    }
    setAnswers((prev) => [...prev, correct]);

    if (currentIndex + 1 < items.length) {
      setCurrentIndex((prev) => prev + 1);
      setFlashStatus('ready');
    } else {
      setPhase('result');
    }
  };

  const handleReset = () => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setItems([]);
    setCurrentIndex(0);
    setAnswers([]);
    setFlashStatus('ready');
    setPhase('setup');
  };

  // Compile calculations
  const correctStructured = items.filter((item, idx) => item.isStructured && answers[idx]).length;
  const correctUnstructured = items.filter((item, idx) => !item.isStructured && answers[idx]).length;
  const totalCorrect = answers.filter(a => a).length;
  const hasFörderbedarf = totalCorrect < 6;

  const handleSaveResult = () => {
    const finalNote = `1:1 Mengenverständnis-Check (Stufe ${grade}). ` +
      `Insgesamt korrekt: ${totalCorrect}/10. ` +
      `Strukturierte Bilder: ${correctStructured}/5 | Unstrukturierte Punktwolken: ${correctUnstructured}/5. ` +
      (customNote ? `\nNotiz: ${customNote}` : '');

    onSave({
      testId: 'live-mengen',
      score: totalCorrect,
      foerderbedarf: hasFörderbedarf,
      note: finalNote,
      meta: {
        type: 'mengen',
        grade,
        score: totalCorrect,
        correctStructured,
        correctUnstructured,
        items: items.map((it, idx) => ({
          quantity: it.quantity,
          isStructured: it.isStructured,
          correct: answers[idx]
        }))
      }
    });
  };

  // Procedural SVG DOT Coordinates generator
  const getDotPositions = (item: MengenItem): DotPosition[] => {
    const qty = item.quantity;
    const dots: DotPosition[] = [];

    if (!item.isStructured) {
      // UNSTRUCTURED: random coordinates inside 360x220 container with safe distance buffering
      let attempts = 0;
      while (dots.length < qty && attempts < 1000) {
        attempts++;
        const candidateX = Math.floor(Math.random() * 300) + 30; // 30 to 330
        const candidateY = Math.floor(Math.random() * 160) + 30; // 30 to 190
        
        const collision = dots.some(d => {
          const dist = Math.sqrt((d.x - candidateX) ** 2 + (d.y - candidateY) ** 2);
          return dist < 36; // 36px buffer enforces nice spacing so dots never touch
        });

        if (!collision) {
          dots.push({ x: candidateX, y: candidateY });
        }
      }
      return dots;
    }

    // STRUCTURED LAYOUTS (Visual groupings)
    if (grade === 1) {
      // Dice Layout for amounts 1-6
      const sizeRect = 150;
      const mid = 180; // horizontal center
      const midY = 110; // vertical center
      const d = 35; // offset

      if (qty === 1) {
        dots.push({ x: mid, y: midY });
      } else if (qty === 2) {
        dots.push({ x: mid - d, y: midY - d });
        dots.push({ x: mid + d, y: midY + d });
      } else if (qty === 3) {
        dots.push({ x: mid - d, y: midY - d });
        dots.push({ x: mid, y: midY });
        dots.push({ x: mid + d, y: midY + d });
      } else if (qty === 4) {
        dots.push({ x: mid - d, y: midY - d });
        dots.push({ x: mid + d, y: midY - d });
        dots.push({ x: mid - d, y: midY + d });
        dots.push({ x: mid + d, y: midY + d });
      } else if (qty === 5) {
        dots.push({ x: mid - d, y: midY - d });
        dots.push({ x: mid + d, y: midY - d });
        dots.push({ x: mid, y: midY });
        dots.push({ x: mid - d, y: midY + d });
        dots.push({ x: mid + d, y: midY + d });
      } else if (qty === 6) {
        dots.push({ x: mid - d, y: midY - d });
        dots.push({ x: mid + d, y: midY - d });
        dots.push({ x: mid - d, y: midY });
        dots.push({ x: mid + d, y: midY });
        dots.push({ x: mid - d, y: midY + d });
        dots.push({ x: mid + d, y: midY + d });
      } else {
        // Fallback row
        for (let i = 0; i < qty; i++) {
          dots.push({ x: 60 + i * 40, y: midY });
        }
      }
    } else if (grade === 2) {
      // 5er Reihe layout up to 10
      // Row 1 at y = 75, Row 2 at y = 145. X spacing = 40
      const startX = 100;
      for (let i = 0; i < qty; i++) {
        if (i < 5) {
          dots.push({ x: startX + (i * 45), y: 75 });
        } else {
          dots.push({ x: startX + ((i - 5) * 45), y: 145 });
        }
      }
    } else if (grade === 3) {
      // 10-frames layout (Zehnerfelder side-by-side) up to 20
      // Frame 1 is x from 50 to 180, Frame 2 is x from 210 to 340
      // Each frame has 2 rows of 5 slots
      for (let i = 0; i < qty; i++) {
        const isFrame2 = i >= 10;
        const index = isFrame2 ? i - 10 : i;
        const frameOffset = isFrame2 ? 185 : 45;
        
        const column = index % 5;
        const row = Math.floor(index / 5);
        
        dots.push({
          x: frameOffset + (column * 30),
          y: 75 + (row * 60)
        });
      }
    } else {
      // Stufe 4: 5-dot mini groups up to 30.
      // We partition them into dice-5 sub constellations
      // Mini-constellation centroids:
      const centroids = [
        { cx: 70, cy: 60 },
        { cx: 180, cy: 60 },
        { cx: 290, cy: 60 },
        { cx: 70, cy: 150 },
        { cx: 180, cy: 150 },
        { cx: 290, cy: 150 }
      ];

      for (let i = 0; i < qty; i++) {
        const clusterIdx = Math.floor(i / 5);
        if (clusterIdx >= centroids.length) break;
        const itemIdx = i % 5;
        const center = centroids[clusterIdx];
        const r = 20;

        // Position on 5-group map
        if (itemIdx === 0) dots.push({ x: center.cx - r, y: center.cy - r });
        else if (itemIdx === 1) dots.push({ x: center.cx + r, y: center.cy - r });
        else if (itemIdx === 2) dots.push({ x: center.cx, y: center.cy });
        else if (itemIdx === 3) dots.push({ x: center.cx - r, y: center.cy + r });
        else if (itemIdx === 4) dots.push({ x: center.cx + r, y: center.cy + r });
      }
    }

    return dots;
  };

  return (
    <div className="relative" id="mengen-diagnostic-panel">
      {/* Abort warning dialog */}
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
                  Weiter prüfen
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
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 rounded-t-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full">
              Mengenverständnis (Simultanerfassung)
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
                <Layers className="text-teal-600 shrink-0 mt-0.5" size={20} />
                <div className="space-y-1.5 font-sans">
                  <h4 className="font-bold text-[0.9375rem] leading-tight text-slate-800">Prüfungscharakteristik:</h4>
                  <p className="text-[0.8125rem] leading-relaxed text-slate-500">
                    Dieser Test erfasst das Verständnis strukturierter Mengendifferenzierungen (Gruppenbilder, 10er-Felder) sowie allgemeines, unstrukturiertes Quantitätsgefühl. 
                    Insgesamt werden 10 Mengenproben (5 strukturiert, 5 unstrukturiert) kurzzeitig eingeblendet.
                    <strong className="block text-teal-900 mt-1">Stufendifferenzierung:</strong>
                    Zeitspanne verringert sich von 2 Sek (Stufe 1) über 1,5 Sek (Stufe 2) auf 1 Sek (Stufe 3 & 4), während die Anzahl der Kreise ansteigt (bis zu 30).
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
                          ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/10' 
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      Stufe {s}
                    </button>
                  ))}
                </div>
                <p className="text-[0.75rem] text-slate-400 font-sans leading-normal">
                  {grade === 1 && 'Stufe 1: Mengen 1-6. Einblendzeit: 2,0 Sekunden. Klassische Würfelbilder.'}
                  {grade === 2 && 'Stufe 2: Mengen 1-10. Einblendzeit: 1,5 Sekunden. Würfelbilder und 5er-Reihen.'}
                  {grade === 3 && 'Stufe 3: Mengen 5-20. Einblendzeit: 1,0 Sekunde. Strukturierte 10er-Zehnerfelder.'}
                  {grade === 4 && 'Stufe 4: Mengen 10-30. Einblendzeit: 1,0 Sekunde. Große 5er-Konstellationen.'}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6 flex justify-end">
              <button
                onClick={handleStart}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-[0.875rem] font-black shadow-lg shadow-teal-600/20 flex items-center gap-2 hover:opacity-95"
              >
                <Play size={16} /> Mengen-Test starten
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE TESTING PHASE */}
        {phase === 'test' && items.length > 0 && (
          <div className="flex-1 p-8 flex flex-col justify-between bg-slate-50/20">
            {/* Top progression progress */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-[0.8125rem] font-mono uppercase tracking-wider">
                Aufgabe {currentIndex + 1} von {items.length} ({items[currentIndex].isStructured ? 'Strukturiert' : 'Unstrukturiert'} | Stufe {grade})
              </span>
              <div className="w-32 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-teal-600 h-1.5 transition-all duration-300"
                  style={{ width: `${((currentIndex) / items.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Flash probe display box */}
            <div className="my-6 flex-1 flex flex-col items-center justify-center">
              <div className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-md p-6 max-w-lg w-full min-h-[300px] flex flex-col items-center justify-center relative overflow-hidden">
                
                {/* READY state (Pre-flash trigger button) */}
                {flashStatus === 'ready' && (
                  <button
                    onClick={handleTriggerFlash}
                    className="px-6 py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-[0.9375rem] font-black shadow-md shadow-teal-600/20 flex items-center gap-2.5"
                  >
                    <Eye size={18} /> Menge einblenden
                  </button>
                )}

                {/* FLASHING state (Procedural rendering of SVG dot map) */}
                {flashStatus === 'flashing' && (
                  <svg className="w-[360px] h-[220px] max-w-full" viewBox="0 0 360 220" id="mengen-canvas">
                    {/* Draw borders for structure alignment if appropriate */}
                    {items[currentIndex].isStructured && grade === 3 && (
                      <>
                        {/* 10-frame outlines */}
                        <rect x="40" y="55" width="135" height="110" rx="8" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="3 3" />
                        <rect x="180" y="55" width="135" height="110" rx="8" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="3 3" />
                      </>
                    )}
                    
                    {getDotPositions(items[currentIndex]).map((dot, index) => (
                      <circle
                        key={index}
                        cx={dot.x}
                        cy={dot.y}
                        r={grade === 4 ? 11 : 12} // slightly smaller radius for denser packings
                        fill="#059669"
                        stroke="#047857"
                        strokeWidth="2.5"
                        className="transition-all"
                      />
                    ))}
                  </svg>
                )}

                {/* EXPIRED state (Dots disappeared, hidden from student) */}
                {flashStatus === 'expired' && (
                  <div className="text-center space-y-3 p-4">
                    <EyeOff className="text-slate-300 mx-auto" size={40} />
                    <span className="text-[1rem] font-bold text-slate-800 block">
                      Menge erloschen.
                    </span>
                    <p className="text-[0.8125rem] text-slate-400 max-w-xs font-sans leading-normal">
                      Fragen Sie das Kind, wie viele Punkte es gesehen hat. Vergleichen Sie mit der Pufferkarte und bewerten Sie.
                    </p>
                    <div className="pt-2 flex flex-col items-center">
                      <span className="text-[0.6875rem] text-slate-300 block font-mono mb-1">Richtige Menge:</span>
                      {showSolution ? (
                        <span className="text-[1.5rem] font-black font-mono text-teal-600">
                          {items[currentIndex].quantity}
                        </span>
                      ) : (
                        <button
                          onClick={() => setShowSolution(true)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-[0.6875rem] font-bold text-slate-500 rounded-lg transition-all border border-slate-200"
                        >
                          Lösung anzeigen
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Assessment triggers (Only active once flashed or expired) */}
            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
              <button
                disabled={flashStatus === 'ready'}
                onClick={() => handleRate(false)}
                className={`py-4 border text-[1rem] font-black uppercase tracking-wider rounded-2xl transition-all ${
                  flashStatus === 'ready'
                    ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                    : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100/80 hover:border-rose-300'
                }`}
              >
                🔴 Falsch
              </button>
              <button
                disabled={flashStatus === 'ready'}
                onClick={() => handleRate(true)}
                className={`py-4 border text-[1rem] font-black uppercase tracking-wider rounded-2xl transition-all ${
                  flashStatus === 'ready'
                    ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/80 hover:border-emerald-300'
                }`}
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
              {/* Score card bar */}
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-center sm:text-left shadow-sm">
                <div className="space-y-1 p-4 bg-white rounded-2xl border border-slate-100">
                  <span className="text-[0.6875rem] uppercase font-black text-slate-400 block tracking-wider">Ergebnis</span>
                  <div className="flex items-baseline justify-center sm:justify-start gap-1">
                    <span className="text-[2.25rem] font-black text-slate-800 leading-none">{totalCorrect}</span>
                    <span className="text-slate-300 font-normal text-[1.25rem]">/ 10</span>
                  </div>
                  <span className="text-[0.6875rem] font-bold text-slate-400 block">Kompakte Ganzheitserfassung</span>
                </div>

                <div className="space-y-1 p-4 bg-white rounded-2xl border border-slate-100">
                  <span className="text-[0.6875rem] uppercase font-black text-slate-400 block tracking-wider">Pädagogische Orientierung</span>
                  <div className="flex items-baseline justify-center sm:justify-start">
                    <span className={`text-[1.125rem] font-black ${!hasFörderbedarf ? 'text-emerald-700' : 'text-amber-600'}`}>
                      {totalCorrect >= 8 ? 'Sicher' : totalCorrect >= 6 ? 'Weiter beobachten' : 'Gezielt unterstützen'}
                    </span>
                  </div>
                  <span className="text-[0.6875rem] font-bold text-slate-400 block leading-normal">
                    {!hasFörderbedarf ? 'Mengenerfassung altersgemäß' : 'Rechnerische Begleitung empfohlen'}
                  </span>
                </div>
              </div>

              {/* Structured vs. Unstructured split stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                  <span className="text-[0.75rem] font-black uppercase text-teal-700 tracking-wider block">
                    Strukturierte Mengen:
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[1.5rem] font-black text-slate-800 font-mono">
                      {correctStructured} <small className="text-slate-400 font-bold text-[0.875rem]">/ 5</small>
                    </span>
                    <span className="text-[0.875rem] font-bold text-slate-500">
                      ({Math.round((correctStructured / 5) * 100)}%)
                    </span>
                  </div>
                  <p className="text-[0.6875rem] font-normal leading-relaxed text-slate-400">
                    Sicherung über bekannte Strukturen (z.B. Würfelmuster, Zehnerfelder).
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                  <span className="text-[0.75rem] font-black uppercase text-indigo-700 tracking-wider block">
                    Unstrukturierte Mengen:
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[1.5rem] font-black text-slate-800 font-mono">
                      {correctUnstructured} <small className="text-slate-400 font-bold text-[0.875rem]">/ 5</small>
                    </span>
                    <span className="text-[0.875rem] font-bold text-slate-500">
                      ({Math.round((correctUnstructured / 5) * 100)}%)
                    </span>
                  </div>
                  <p className="text-[0.6875rem] font-normal leading-relaxed text-slate-400">
                    Erfassung über das ungefilterte, angeborene visuelle Mengengefühl.
                  </p>
                </div>
              </div>

              {/* Analytical pedagogical advice */}
              <div className="bg-teal-50 border border-teal-100 p-5 rounded-2xl space-y-1.5">
                <h4 className="text-[0.8125rem] font-black uppercase text-teal-800 tracking-wider flex items-center gap-1.5">
                  <Sparkles size={16} /> Pädagogischer Hinweis:
                </h4>
                <p className="text-[0.875rem] leading-relaxed text-slate-600 font-sans">
                  {correctStructured > correctUnstructured ? (
                    "Das Kind nutzt erfolgreich Strukturhilfen zur Mengenerfassung. Ein unstrukturiertes Quantitätsgefühl ist schwächer ausgebildet. Trainingsempfehlung: Gezieltes Üben mit unstrukturierten Mengenbildern zur Vertiefung des Abstraktionsvermögens."
                  ) : correctStructured === 5 && correctUnstructured === 5 ? (
                    "Exzellent! Das Kind erfasst sowohl klassische Ordnungen als auch willkürliche Punktwolken stabil. Das visuelle Fundament ist hervorragend ausgebildet."
                  ) : totalCorrect <= 4 ? (
                    "Auffälligkeit: Das Kind rechnet primär zählend und verfügt über eine schwache Fähigkeit zur Simultanerfassung. Dringend strukturierte Übungsmöglichkeiten (z.B. Fingerbilder, Plättchenschieben) anbieten."
                  ) : (
                    "Das Profil ist ausgewogen. Das Kind erfasst Mengen altersgerecht und nutzt visuelle Strukturen zielführend."
                  )}
                </p>
              </div>

              {/* Qualitative observations input */}
              <div className="space-y-2">
                <label className="block text-[0.8125rem] font-black uppercase tracking-wider text-slate-500">
                  Beobachtungen (z.B. Augenrollen, zählendes Kopfnicken, Unsicherheiten):
                </label>
                <textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Z.B.: Beginnt bei unstrukturierten Mengen ab 4 Punkten unruhig zu nicken (sucht abzuzählen). Strukturierte Bilder gelingen tadellos..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[0.875rem] text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-sans leading-relaxed"
                />
              </div>
            </div>

            {/* Actions footer */}
            <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row justify-between gap-3">
              <button
                onClick={handleReset}
                className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[0.8125rem] font-bold flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} /> Test wiederholen
              </button>
              <button
                onClick={handleSaveResult}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-[0.8125rem] font-black flex items-center justify-center gap-2 shadow-sm"
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
