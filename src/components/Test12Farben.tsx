import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Save, AlertTriangle, CheckCircle2, RefreshCw, X, Check, Eye, EyeOff, Sparkles, Monitor, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface TestProps {
  studentId: string;
  initialGrade: number;
  onClose: () => void;
  onSave: (result: {
    testId: string;
    score: number; // number of correctly recognized plates out of non-controls
    foerderbedarf: boolean;
    note: string;
    meta?: any;
  }) => void;
}

interface IshiharaPlate {
  id: string;
  type: 'shape' | 'number' | 'control';
  label: string;
  target: string;
  desc: string;
  backgroundColors: string[];
  motifColors: string[];
}

// Organic size-staged circle packing algorithm to generate authentic-looking Ishihara plates.
// We place larger circles first, then medium, then fill gaps with tiny dots.
// Uses a stable deterministic pseudo-random generator so the dots don't fluctuate on render.
const generateDotsData = () => {
  const list: { cx: number; cy: number; r: number }[] = [];
  const centerX = 130;
  const centerY = 130;
  const maxR = 120;
  
  let seed = 98765;
  const random = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  // Size categories in descending order to achieve tight packing
  const sizeCategories = [
    { rMin: 5.5, rMax: 7.2, count: 28 },  // large primary dots
    { rMin: 3.8, rMax: 5.5, count: 65 },  // medium-large dots
    { rMin: 2.5, rMax: 3.8, count: 130 }, // medium filler dots
    { rMin: 1.4, rMax: 2.5, count: 260 }  // tiny gap-filler dots
  ];

  for (const cat of sizeCategories) {
    let placed = 0;
    let attempts = 0;
    const maxAttemptsForCat = cat.count * 18;
    
    while (placed < cat.count && attempts < maxAttemptsForCat) {
      attempts++;
      const cx = centerX + (random() - 0.5) * 240;
      const cy = centerY + (random() - 0.5) * 240;
      
      const dist = Math.hypot(cx - centerX, cy - centerY);
      const rVal = cat.rMin + random() * (cat.rMax - cat.rMin);
      
      // Keep inside circular plate with a small margin
      if (dist + rVal > maxR - 2) continue;
      
      // Ensure no overlaps with already placed dots
      let overlap = false;
      for (const dot of list) {
        const d = Math.hypot(cx - dot.cx, cy - dot.cy);
        if (d < rVal + dot.r + 1.2) { // 1.2px minimum gap
          overlap = true;
          break;
        }
      }
      
      if (!overlap) {
        list.push({ cx, cy, r: rVal });
        placed++;
      }
    }
  }
  
  return list;
};

// Premium, organic Ishihara color palettes.
// Real Ishihara plates blend earthy, natural, slightly desaturated tones to target color-deficiency zones.
const PALETTE_RED_GREEN_BG = [
  '#748b5c', '#8b9b6e', '#a0aa7a', '#546341', '#bfa772', '#a08f5d', '#847953', '#62704f', '#aaab84'
];
const PALETTE_RED_GREEN_MOTIF = [
  '#e2643a', '#d64d2b', '#ee7f5a', '#be3c20', '#a42c14', '#f0987d', '#c2553a', '#eb8d6c'
];

const PALETTE_INVERTED_BG = [
  '#cf5f5f', '#b34848', '#df8b8b', '#d89774', '#a6593b', '#c48565', '#d67474', '#e29b8c', '#ab4343'
];
const PALETTE_INVERTED_MOTIF = [
  '#3a8445', '#4ca45a', '#266530', '#60bb6f', '#2d7a46', '#549062', '#438a4d', '#71c981'
];

const PALETTE_CONTROL_BG = [
  '#e2b522', '#f0ca35', '#cca017', '#ffd84d', '#dab351', '#ebd061', '#c79d1a'
];
const PALETTE_CONTROL_MOTIF = [
  '#1d4fad', '#2c6ae0', '#183e8c', '#407bf2', '#102961', '#336df5'
];

const SHAPE_PLATES: IshiharaPlate[] = [
  {
    id: 'shape_circle',
    type: 'shape',
    label: 'Form: Kreis',
    target: 'Kreis',
    desc: 'Ein orange-roter, voll ausgefüllter Kreis auf olivgrünem/khakifarbenem Grund.',
    backgroundColors: PALETTE_RED_GREEN_BG,
    motifColors: PALETTE_RED_GREEN_MOTIF
  },
  {
    id: 'shape_triangle',
    type: 'shape',
    label: 'Form: Dreieck',
    target: 'Dreieck',
    desc: 'Ein lachs-rotes Dreieck auf olivgrünem Grund.',
    backgroundColors: PALETTE_RED_GREEN_BG,
    motifColors: PALETTE_RED_GREEN_MOTIF
  },
  {
    id: 'shape_cross',
    type: 'shape',
    label: 'Form: Kreuz',
    target: 'Kreuz',
    desc: 'Ein waldgrünes Kreuz auf rötlichem/braunem Grund (invertierte Farbwirkung).',
    backgroundColors: PALETTE_INVERTED_BG,
    motifColors: PALETTE_INVERTED_MOTIF
  },
  {
    id: 'shape_diamond',
    type: 'shape',
    label: 'Form: Raute',
    target: 'Raute',
    desc: 'Eine rötliche Raute auf olivgrünem Grund.',
    backgroundColors: PALETTE_RED_GREEN_BG,
    motifColors: PALETTE_RED_GREEN_MOTIF
  }
];

const NUMBER_PLATES: IshiharaPlate[] = [
  {
    id: 'num_1',
    type: 'number',
    label: 'Zahl: 1',
    target: '1',
    desc: 'Eine rötliche Eins auf olivgrünem Grund.',
    backgroundColors: PALETTE_RED_GREEN_BG,
    motifColors: PALETTE_RED_GREEN_MOTIF
  },
  {
    id: 'num_7',
    type: 'number',
    label: 'Zahl: 7',
    target: '7',
    desc: 'Eine waldgrüne Sieben auf rötlich-braunem Grund (invertiert).',
    backgroundColors: PALETTE_INVERTED_BG,
    motifColors: PALETTE_INVERTED_MOTIF
  },
  {
    id: 'num_0',
    type: 'number',
    label: 'Zahl: 0',
    target: '0',
    desc: 'Eine rötliche Null (ovaler Ring) auf olivgrünem Grund.',
    backgroundColors: PALETTE_RED_GREEN_BG,
    motifColors: PALETTE_RED_GREEN_MOTIF
  },
  {
    id: 'num_3',
    type: 'number',
    label: 'Zahl: 3',
    target: '3',
    desc: 'Eine rötliche Drei (geschwungene Linien) auf olivgrünem Grund.',
    backgroundColors: PALETTE_RED_GREEN_BG,
    motifColors: PALETTE_RED_GREEN_MOTIF
  }
];

const CONTROL_PLATES: IshiharaPlate[] = [
  {
    id: 'ctrl_1',
    type: 'control',
    label: 'Kontroll-Platte: Kreis',
    target: 'Kreis',
    desc: 'Ein klares blaues Symbol auf leuchtend gelb-orangefarbenem Grund. Für normalsichtiges und farbfehlsichtiges Auge gleichermaßen klar sichtbar.',
    backgroundColors: PALETTE_CONTROL_BG,
    motifColors: PALETTE_CONTROL_MOTIF
  },
  {
    id: 'ctrl_2',
    type: 'control',
    label: 'Kontroll-Platte: Zahl 1',
    target: '1',
    desc: 'Eine klare blaue Eins auf leuchtend gelb-orangefarbenem Grund. Dient als Orientierung und zur Erkennung von Verständnisfehlern.',
    backgroundColors: PALETTE_CONTROL_BG,
    motifColors: PALETTE_CONTROL_MOTIF
  }
];

export const Test12Farben: React.FC<TestProps> = ({ studentId, initialGrade, onClose, onSave }) => {
  const { app } = useApp();
  const student = app.schueler.find(s => s.id === studentId);

  const [grade, setGrade] = useState<number>(initialGrade || 1);
  const [phase, setPhase] = useState<'setup' | 'test' | 'result'>('setup');
  
  const [activePlateIdx, setActivePlateIdx] = useState<number>(0);
  // Results map: plateId -> rating: 'Richtig' | 'Nicht erkannt' | 'Falsch benannt'
  const [resultsMap, setResultsMap] = useState<Record<string, 'Richtig' | 'Nicht erkannt' | 'Falsch benannt'>>({});
  const [kommentar, setKommentar] = useState<string>('');
  const [showSolution, setShowSolution] = useState<boolean>(false);
  const [schuelerModus, setSchuelerModus] = useState<boolean>(false);
  const [showContourHelper, setShowContourHelper] = useState<boolean>(false);

  useEffect(() => {
    setShowSolution(false);
    setShowContourHelper(false);
  }, [activePlateIdx]);

  // Generate static packed dots ONCE per mount to avoid lag
  const staticDots = useMemo(() => generateDotsData(), []);

  // Assemble the plate series dynamically based on selected school grade (Stufe)
  const activePlatesSeries = useMemo(() => {
    const list: IshiharaPlate[] = [];
    
    // Always start with 1 Control plate to verify understanding and explain the task
    list.push(CONTROL_PLATES[0]);

    if (grade === 1) {
      // Shape only for Grade 1 (young children who might not name numbers with high reliability)
      list.push(...SHAPE_PLATES);
    } else {
      // Numbers + some shapes for Grade 2-4
      list.push(...NUMBER_PLATES);
      list.push(...SHAPE_PLATES.slice(1, 3)); // Add triangle & cross as backup
    }

    // Add final Control plate
    list.push(CONTROL_PLATES[1]);

    return list;
  }, [grade]);

  // Keyboard controls listener for comfortable rapid testing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'test') return;
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') {
        return;
      }

      if (e.code === 'ArrowRight' || e.code === 'KeyR' || e.code === 'Digit2') {
        e.preventDefault();
        handleAssessment('Richtig');
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyF' || e.code === 'Digit0') {
        e.preventDefault();
        handleAssessment('Nicht erkannt');
      } else if (e.code === 'ArrowDown' || e.code === 'KeyT' || e.code === 'Digit1') {
        e.preventDefault();
        handleAssessment('Falsch benannt');
      } else if (e.code === 'Space') {
        e.preventDefault();
        setShowSolution(prev => !prev);
      } else if (e.code === 'KeyH') {
        e.preventDefault();
        setShowContourHelper(prev => !prev);
      } else if (e.code === 'KeyS') {
        e.preventDefault();
        setSchuelerModus(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, activePlateIdx, activePlatesSeries, resultsMap]);

  // Geometric classification to decide if a center point of a dot lies inside the target motif
  const isInsideMotifCheck = (cx: number, cy: number, plateId: string): boolean => {
    const dx = cx - 130;
    const dy = cy - 130;
    const r = Math.hypot(dx, dy);

    // Circle (Kreis) - now a beautiful filled circle of radius 52, highly intuitive for children
    if (plateId.includes('circle') || plateId.includes('ctrl_1')) {
      return r < 52;
    }
    // Triangle (Dreieck) pointing UP
    if (plateId.includes('triangle')) {
      return dy >= -55 && dy <= 50 && Math.abs(dx) <= (dy + 55) * 0.65;
    }
    // Cross (Kreuz)
    if (plateId.includes('cross')) {
      return (Math.abs(dx) < 16 && Math.abs(dy) < 62) || (Math.abs(dy) < 16 && Math.abs(dx) < 62);
    }
    // Diamond (Raute)
    if (plateId.includes('diamond')) {
      return Math.abs(dx) * 1.0 + Math.abs(dy) * 1.0 < 58;
    }
    
    // Number 1 & Control Number 1
    if (plateId.includes('num_1') || plateId.includes('ctrl_2')) {
      const isVerticalBar = Math.abs(dx) < 10 && dy >= -65 && dy <= 60;
      const isFlag = dx <= 0 && dx >= -35 && dy >= -65 && dy <= -35 && (dy - dx) < -30;
      return isVerticalBar || isFlag;
    }
    // Number 7
    if (plateId.includes('num_7')) {
      const topBar = dy >= -65 && dy <= -45 && dx >= -50 && dx <= 50;
      const diagonalPath = Math.abs((35 - (dy + 45) * 0.6) - dx) < 13 && dy >= -45 && dy <= 60;
      return topBar || diagonalPath;
    }
    // Number 0
    if (plateId.includes('num_0')) {
      const ovalRadius = Math.hypot(dx * 1.3, dy);
      return ovalRadius < 62 && ovalRadius > 26;
    }
    // Number 3
    if (plateId.includes('num_3')) {
      const distTop = Math.hypot(dx - 10, dy + 28);
      const distBottom = Math.hypot(dx - 10, dy - 28);
      const topLobe = distTop < 33 && distTop > 18 && dx >= -12;
      const bottomLobe = distBottom < 37 && distBottom > 20 && dx >= -14;
      const middleBar = Math.abs(dy) < 8 && dx >= -10 && dx <= 12;
      return topLobe || bottomLobe || middleBar;
    }

    return false;
  };

  // Helper to generate the pulsing SVG contour line for "Outline Help"
  const getPlateOverlayPath = (plateId: string) => {
    if (plateId.includes('circle') || plateId.includes('ctrl_1')) {
      return <circle cx="130" cy="130" r="48" fill="none" stroke="#ef4444" strokeWidth="3.5" strokeDasharray="6 4" className="animate-pulse" />;
    }
    if (plateId.includes('triangle')) {
      return <polygon points="130,73 198,178 62,178" fill="none" stroke="#ef4444" strokeWidth="3.5" strokeDasharray="6 4" className="animate-pulse" />;
    }
    if (plateId.includes('cross')) {
      return <path d="M114,68 L146,68 L146,114 L192,114 L192,146 L146,146 L146,192 L114,192 L114,146 L68,146 L68,114 L114,114 Z" fill="none" stroke="#ef4444" strokeWidth="3.5" strokeDasharray="6 4" className="animate-pulse" />;
    }
    if (plateId.includes('diamond')) {
      return <polygon points="130,72 188,130 130,188 72,130" fill="none" stroke="#ef4444" strokeWidth="3.5" strokeDasharray="6 4" className="animate-pulse" />;
    }
    if (plateId.includes('num_1') || plateId.includes('ctrl_2')) {
      return <path d="M100,85 L130,65 L130,190 M115,190 L145,190" fill="none" stroke="#ef4444" strokeWidth="3.5" strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse" />;
    }
    if (plateId.includes('num_7')) {
      return <path d="M80,75 L180,75 L120,190" fill="none" stroke="#ef4444" strokeWidth="3.5" strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse" />;
    }
    if (plateId.includes('num_0')) {
      return <ellipse cx="130" cy="130" rx="33" ry="50" fill="none" stroke="#ef4444" strokeWidth="3.5" strokeDasharray="6 4" className="animate-pulse" />;
    }
    if (plateId.includes('num_3')) {
      return <path d="M110,70 C110,70 140,70 140,95 C140,118 116,120 116,120 C116,120 144,122 144,148 C144,175 110,175 110,175" fill="none" stroke="#ef4444" strokeWidth="3.5" strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse" />;
    }
    return null;
  };

  const handleAssessment = (assessment: 'Richtig' | 'Nicht erkannt' | 'Falsch benannt') => {
    const currentPlate = activePlatesSeries[activePlateIdx];
    setResultsMap(prev => ({ ...prev, [currentPlate.id]: assessment }));
    
    if (activePlateIdx + 1 < activePlatesSeries.length) {
      setActivePlateIdx(activePlateIdx + 1);
    } else {
      setPhase('result');
    }
  };

  // Analyze scores (excluding control plates)
  const targetPlates = activePlatesSeries.filter(p => p.type !== 'control');
  const controlPlates = activePlatesSeries.filter(p => p.type === 'control');

  const targetCorrect = targetPlates.filter(p => resultsMap[p.id] === 'Richtig').length;
  const controlCorrect = controlPlates.filter(p => resultsMap[p.id] === 'Richtig').length;

  const isInterpretable = controlCorrect === controlPlates.length;
  const isSuspicious = isInterpretable && targetCorrect <= (targetPlates.length / 2);
  const needsRepeat = !isInterpretable;
  const totalPlatesRun = targetPlates.length;

  const handleSave = () => {
    if (!student) return;

    const disclaimerBlock = 
      `**WICHTIGER SCREENING-HINWEIS**:\n` +
      `*Dies ist KEIN medizinischer Sehtest, sondern ein pädagogischer Suchtest.*\n` +
      `*Bei wiederholten Auffälligkeiten können Erziehungsberechtigte auf eine fachliche Abklärung hingewiesen werden.*\n` +
      `*Bitte das Testergebnis nicht voreilig als feste Diagnose kommunizieren!*\n\n`;

    const summary = `### Farbunterscheidungs-Check am Bildschirm (Stufe ${grade})\n\n` +
      disclaimerBlock +
      `**Ergebnis-Auswertung**:\n` +
      `- Standard-Platten erkannt: **${targetCorrect} von ${totalPlatesRun}**\n` +
      `- Kontroll-Platten erkannt: **${controlCorrect} von 2**\n` +
      `- Einschätzung: ${needsRepeat ? 'Nicht auswertbar – Kontrollaufgaben wiederholen' : isSuspicious ? 'Pädagogischer Prüfhinweis bei der Farbunterscheidung' : 'In diesem Bildschirm-Check unauffällig'}\n\n` +
      `**Einzel-Messwerte**:\n` +
      activePlatesSeries.map((p, idx) => `* Platte ${idx + 1} (${p.label}): ${resultsMap[p.id] || 'Unbearbeitet'}`).join('\n') +
      (kommentar ? `\n\n**Lehrer-Notiz**: ${kommentar}` : '');

    onSave({
      testId: 'live-farben',
      score: targetCorrect,
      foerderbedarf: isSuspicious || needsRepeat,
      note: summary,
      meta: {
        grade,
        targetCorrect,
        controlCorrect,
        resultsMap,
        isSuspicious,
        isInterpretable,
        needsRepeat,
        kommentar
      }
    });

    onClose();
  };

  const currentPlate = activePlatesSeries[activePlateIdx];

  return (
    <div className="space-y-6">
      
      {/* MEDICAL DISCLAIMER CALLOUT */}
      <div className="bg-rose-50 text-rose-800 p-4 rounded-2xl border border-rose-100 flex items-start gap-3 text-left text-xs leading-relaxed max-w-3xl mx-auto shadow-sm">
        <AlertTriangle size={20} className="shrink-0 text-rose-500 mt-0.5" />
        <div>
          <strong className="block font-black mb-0.5">⚠️ Wichtiger pädagogischer Hinweis:</strong> 
          Dies ist nur ein unverbindlicher Farbunterscheidungs-Check. Bildschirm, Helligkeit und Umgebungslicht verändern die Farben; das Verfahren kann eine Rot-Grün-Sehschwäche weder feststellen noch ausschließen.
          Wiederholte alltagsbezogene Beobachtungen sollten behutsam mit den Eltern besprochen und bei Bedarf augenärztlich abgeklärt werden.
        </div>
      </div>

      {/* HEADER BAR */}
      <div className="bg-gradient-to-r from-rose-500 to-red-600 rounded-[2rem] text-white p-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-md text-left">
        <div>
          <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full mb-1">
            Bildschirmbasierter Farb-Check
          </span>
          <h2 className="text-[1.25rem] font-black tracking-tight flex items-center gap-2">
            👁️ Farbunterscheidungs-Check
          </h2>
          <p className="text-[0.75rem] text-rose-50">
            Schüler: <strong>{student?.vorname} {student?.nachname}</strong>
          </p>
        </div>
        <div className="flex gap-2">
          {phase === 'test' && (
            <button
              onClick={() => setPhase('setup')}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[0.75rem] font-bold rounded-xl transition-all"
            >
              Zurück zum Setup
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/25 hover:bg-white/35 text-white text-[0.75rem] font-bold rounded-xl transition-all shadow"
          >
            Beenden
          </button>
        </div>
      </div>

      {phase === 'setup' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center space-y-6 max-w-xl mx-auto"
        >
          <div className="max-w-md mx-auto space-y-2">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto text-rose-500 text-xl font-bold">
              👁️
            </div>
            <h3 className="text-[1.25rem] font-bold text-slate-800">Schulstufe für den Farb-Check</h3>
            <p className="text-xs text-slate-500 font-sans leading-relaxed">
              Kinder in <strong>Stufe 1</strong> erhalten rein geometrische Formen (Kreis, Dreieck, Kreuz, Raute), da Zahlen eventuell noch nicht flüssig benannt werden. Höhere Stufen kombinieren kontraststarke Zahlen.
            </p>
          </div>

          <div className="flex justify-center gap-3 max-w-sm mx-auto">
            {[1, 2, 3, 4].map(g => (
              <button
                key={g}
                onClick={() => setGrade(g)}
                className={`w-14 h-14 rounded-2xl font-black text-sm flex flex-col items-center justify-center transition-all border ${
                  grade === g 
                    ? 'bg-rose-500 border-rose-500 text-white shadow-md scale-105' 
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="text-[9px] opacity-75 font-normal uppercase">Stufe</span>
                <span className="text-base font-black">{g}</span>
              </button>
            ))}
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-200/60 text-xs text-slate-600 font-sans leading-relaxed space-y-1">
            <p className="font-bold text-slate-700">📋 Ablauf des Farb-Checks:</p>
            <p>1. Eine blaue Kontrollplatte zu Beginn, um das Verständnis zu sichern.</p>
            <p>2. Vier farbige Suchmuster (angepasst an die Schulstufe).</p>
            <p>3. Eine blaue Kontrollplatte am Ende zur Verifizierung der Aufmerksamkeit.</p>
          </div>

          <button
            onClick={() => {
              setResultsMap({});
              setActivePlateIdx(0);
              setPhase('test');
            }}
            className="w-full sm:w-auto px-10 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-500/20 transition-all active:scale-95"
          >
            Farb-Check starten ➡️
          </button>
        </motion.div>
      )}

      {phase === 'test' && currentPlate && (
        <div className="space-y-6">
          
          {/* INTERACTIVE CAROUSEL / PLATE SELECTOR BAR */}
          <div className="bg-white rounded-2xl border border-slate-100 p-2.5 max-w-2xl mx-auto shadow-sm">
            <div className="flex gap-1.5 overflow-x-auto justify-start sm:justify-center px-1">
              {activePlatesSeries.map((p, idx) => {
                const isCompleted = resultsMap[p.id] !== undefined;
                const isCurrent = idx === activePlateIdx;
                const status = resultsMap[p.id];
                
                let stateStyle = 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200';
                if (isCurrent) {
                  stateStyle = 'bg-rose-500 border-rose-600 text-white font-black shadow-md scale-105';
                } else if (isCompleted) {
                  if (status === 'Richtig') {
                    stateStyle = 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200';
                  } else if (status === 'Nicht erkannt') {
                    stateStyle = 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200';
                  } else {
                    stateStyle = 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200';
                  }
                }
                
                return (
                  <button
                    key={p.id}
                    onClick={() => setActivePlateIdx(idx)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all shrink-0 flex items-center gap-1.5 ${stateStyle}`}
                    title={p.label}
                  >
                    <span>Platte {idx + 1}</span>
                    {p.type === 'control' ? (
                      <span className="text-[8px] bg-blue-100 text-blue-800 font-bold px-1 rounded">Ctrl</span>
                    ) : (
                      isCompleted && (
                        <span className="text-[10px]">
                          {status === 'Richtig' ? '✓' : status === 'Nicht erkannt' ? '✗' : '⚠'}
                        </span>
                      )
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm max-w-2xl mx-auto space-y-6">
            
            {/* Top plate indicator */}
            <div className="flex justify-between items-center text-slate-400 text-xs pb-3 border-b border-slate-100">
              <span className="font-bold flex items-center gap-1.5">
                <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700 font-black">
                  Platte {activePlateIdx + 1} / {activePlatesSeries.length}
                </span>
                {currentPlate.type === 'control' && (
                  <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">
                    Kontroll-Aufgabe
                  </span>
                )}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSchuelerModus(true)}
                  className="text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-sm"
                  title="Öffnet eine ablenkungsfreie Ansicht für den Schüler [Taste: S]"
                >
                  <Monitor size={12} /> Schüler-Ansicht
                </button>
                <button
                  type="button"
                  onClick={() => setShowContourHelper(prev => !prev)}
                  className={`text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 border shadow-sm ${
                    showContourHelper 
                      ? 'bg-rose-600 border-rose-600 text-white font-black' 
                      : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700'
                  }`}
                  title="Blendet den Hintergrund ab und legt ein Hilfsraster auf das Motiv [Taste: H]"
                >
                  <Sparkles size={12} /> {showContourHelper ? 'Muster-Verstärker AN' : 'Muster-Verstärker'}
                </button>
              </div>
            </div>

            {/* Prompt Instruction */}
            <div className="text-slate-600 text-sm leading-relaxed max-w-md mx-auto">
              Fragen Sie das Kind am Tisch: 
              <span className="block text-rose-600 font-black text-base mt-1 italic">
                "Schau mal genau in den Kreis: Siehst du dort ein Zeichen, ein Bild oder ein Symbol? Was genau ist es?"
              </span>
            </div>

            {/* Center packed plate frame with overlay contours */}
            <div className="flex justify-center py-2">
              <div className="relative p-5 bg-slate-50 border border-slate-100 rounded-[3rem] shadow-inner">
                <svg width="260" height="260" className="rounded-full shadow-md bg-stone-100 relative overflow-hidden">
                  {staticDots.map((dot, idx) => {
                    const isMotif = isInsideMotifCheck(dot.cx, dot.cy, currentPlate.id);
                    const colors = isMotif ? currentPlate.motifColors : currentPlate.backgroundColors;
                    // Deterministic color assignment using coordinate math
                    const colorHashIdx = Math.floor((dot.cx * 11 + dot.cy * 17) % colors.length);
                    const color = colors[colorHashIdx];

                    return (
                      <circle
                        key={idx}
                        cx={dot.cx}
                        cy={dot.cy}
                        r={dot.r}
                        fill={color}
                        style={{
                          opacity: showContourHelper && !isMotif ? 0.08 : 1,
                          transition: 'opacity 0.3s ease'
                        }}
                      />
                    );
                  })}
                  
                  {/* Subtle red dashed overlay line when solution/contour is toggled */}
                  {(showSolution || showContourHelper) && getPlateOverlayPath(currentPlate.id)}
                </svg>
              </div>
            </div>

            {/* Teacher Assessment Buttons and Soll-Answer */}
            <div className="space-y-4 max-w-sm mx-auto pt-2">
              
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 text-xs text-slate-600 font-medium flex items-center justify-between min-h-[44px]">
                {showSolution ? (
                  <div className="text-left leading-normal">
                    <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">Erwartete Antwort:</span>
                    <strong className="text-slate-800 text-sm font-black">{currentPlate.target}</strong> 
                    <span className="text-[11px] text-slate-500 block">{currentPlate.desc}</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center w-full">
                    <span className="text-slate-500 text-xs">💡 Soll-Antwort verdeckt:</span>
                    <button
                      onClick={() => setShowSolution(true)}
                      className="px-3 py-1 bg-white hover:bg-slate-100 text-[10px] font-black text-slate-700 rounded-xl border border-slate-200 transition-all shadow-sm"
                    >
                      Lösung anzeigen
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Ergebnis der Platte eintragen:</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleAssessment('Richtig')}
                    className="py-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl font-bold text-xs transition-all active:scale-95 shadow-sm"
                  >
                    Richtig
                  </button>
                  <button
                    onClick={() => handleAssessment('Nicht erkannt')}
                    className="py-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded-xl font-bold text-xs transition-all active:scale-95 shadow-sm"
                  >
                    Nicht erkannt
                  </button>
                  <button
                    onClick={() => handleAssessment('Falsch benannt')}
                    className="py-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-xl font-bold text-xs transition-all active:scale-95 shadow-sm"
                    title="Das Kind sieht etwas, nennt aber eine andere Form/Zahl."
                  >
                    Falsch benannt
                  </button>
                </div>
              </div>

              {/* Prev / Next manual jump */}
              <div className="flex justify-between pt-2">
                <button
                  disabled={activePlateIdx === 0}
                  onClick={() => setActivePlateIdx(prev => prev - 1)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1"
                >
                  <ChevronLeft size={14} /> Zurück
                </button>
                <button
                  onClick={() => {
                    if (activePlateIdx + 1 < activePlatesSeries.length) {
                      setActivePlateIdx(prev => prev + 1);
                    } else {
                      setPhase('result');
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 font-bold"
                >
                  {activePlateIdx + 1 === activePlatesSeries.length ? 'Zur Auswertung' : 'Überspringen'} <ChevronRight size={14} />
                </button>
              </div>

              <div className="text-[10px] text-slate-400 font-sans">
                💡 Tastatur: <kbd className="bg-slate-100 px-1 rounded text-[9px] font-mono">←</kbd> = Nicht erkannt, <kbd className="bg-slate-100 px-1 rounded text-[9px] font-mono">→</kbd> = Richtig, <kbd className="bg-slate-100 px-1 rounded text-[9px] font-mono">↓</kbd> = Falsch, <kbd className="bg-slate-100 px-1 rounded text-[9px] font-mono">Leertaste</kbd> = Lösung, <kbd className="bg-slate-100 px-1 rounded text-[9px] font-mono">H</kbd> = Verstärker
              </div>
            </div>

          </div>
        </div>
      )}

      {phase === 'result' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-md max-w-2xl mx-auto space-y-6 text-center"
        >
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 size={36} />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-800">Ergebnis des Farb-Checks</h3>
            <p className="text-xs text-slate-500 font-sans">Erhebung durchgeführt auf Schulstufe {grade}</p>
          </div>

          {/* DIAGNOSTIC SCORE CARD */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`p-5 rounded-2xl border text-left ${isSuspicious ? 'bg-rose-50 border-rose-200 text-rose-800 animate-pulse' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
              <span className="text-[10px] uppercase font-black tracking-wider block opacity-75">Einordnung dieses Durchgangs</span>
              <p className="text-lg font-black mt-1">
                {isSuspicious ? 'Auffällig (Hinweise vorhanden)' : 'Unauffälliges Ergebnis'}
              </p>
              <p className="text-[10.5px] mt-2 leading-relaxed opacity-90">
                {isSuspicious 
                  ? 'In diesem Bildschirm-Durchgang wurden mehrere Farbmuster nicht richtig erkannt. Bitte zunächst unter kontrollierten Bedingungen wiederholen und bei wiederholter Auffälligkeit eine fachliche Abklärung mit den Erziehungsberechtigten besprechen.'
                  : 'Das Kind hat fast alle Platten problemlos erkannt. Es liegen keine akuten pädagogischen Hinweise auf eine Farbfehlsichtigkeit vor.'}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl text-left flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-black tracking-wider block text-slate-400">Erkennungsrate</span>
                <p className="text-3xl font-black mt-1 text-slate-800">
                  {targetCorrect} <span className="text-sm font-semibold text-slate-400">/ {totalPlatesRun} richtig</span>
                </p>
              </div>
              <div className="text-[11px] text-slate-500 font-sans border-t pt-2 mt-3">
                Zusätzlich Kontrollplatten: <strong className="text-slate-700">{controlCorrect} von 2</strong> korrekt.
              </div>
            </div>
          </div>

          {/* WARNING ON FAILING CONTROLS */}
          {controlCorrect < 2 && (
            <div className="bg-amber-50 text-amber-800 border border-amber-100 p-4 rounded-2xl text-left text-xs space-y-1 font-sans leading-relaxed">
              <p className="font-black flex items-center gap-1">⚠️ Kontrollaufgaben nicht korrekt gelöst ({controlCorrect}/2)</p>
              <p className="text-amber-700">
                Der Durchgang ist nicht zuverlässig auswertbar, weil die kontrastreichen Kontrollaufgaben nicht vollständig gelöst wurden. Bitte Anleitung, Begriffswissen, Beleuchtung und Bildschirmdarstellung prüfen und den Durchgang später wiederholen.
              </p>
            </div>
          )}

          {/* INDIVIDUAL PLATE DETAIL LOG */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 text-left space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block border-b pb-1.5">Auswertung der Platten im Detail</label>
            <div className="space-y-2">
              {activePlatesSeries.map((p, idx) => {
                const res = resultsMap[p.id] || 'Nicht bearbeitet';
                let badgeClass = 'bg-slate-200 text-slate-600';
                if (res === 'Richtig') badgeClass = 'bg-emerald-100 text-emerald-800';
                else if (res === 'Nicht erkannt') badgeClass = 'bg-rose-100 text-rose-800';
                else if (res === 'Falsch benannt') badgeClass = 'bg-amber-100 text-amber-800';

                return (
                  <div key={p.id} className="flex justify-between items-center py-1 border-b border-slate-200/40 last:border-0 text-xs">
                    <div className="flex flex-col text-left">
                      <span className="font-black text-slate-700">Platte {idx + 1}: {p.label}</span>
                      <span className="text-[10px] text-slate-400 font-sans italic">{p.desc.slice(0, 75)}...</span>
                    </div>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${badgeClass}`}>{res}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* REMARK INPUT */}
          <div className="text-left space-y-2">
            <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1">Beobachtungsnotiz (z.B. Zögern, Näherrücken an den Bildschirm)</label>
            <textarea
              value={kommentar}
              onChange={e => setKommentar(e.target.value)}
              placeholder="Z.B.: Das Kind zögerte bei Platte 3 lange, ging sehr nah an das Display heran und kniff die Augen zusammen. Die Kontrollplatten wurden sofort und freudig benannt."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-rose-500 font-sans min-h-[75px]"
            />
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex gap-3 justify-end pt-3 border-t">
            <button
              onClick={() => {
                setResultsMap({});
                setActivePlateIdx(0);
                setPhase('setup');
              }}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
            >
              Wiederholen
            </button>
            <button
              onClick={handleSave}
              className="px-8 py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-rose-500/20 transition-all"
            >
              Ergebnis speichern
            </button>
          </div>
        </motion.div>
      )}

      {/* SCHÜLER-VOLLBILDMODUS FOR DISTRACTION-FREE TESTING */}
      <AnimatePresence>
        {schuelerModus && phase === 'test' && currentPlate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950 z-[99999] flex flex-col p-6 sm:p-12 overflow-hidden select-none items-center justify-center text-center font-sans"
          >
            {/* Top Toolbar */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-center text-slate-400">
              <div className="flex items-center gap-3 text-left">
                <span className="text-2xl text-rose-500 animate-pulse">👁️</span>
                <div>
                  <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block">Farb-Check · Kinderansicht</span>
                  <h4 className="text-sm font-bold text-slate-200">Platte {activePlateIdx + 1} von {activePlatesSeries.length}</h4>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowContourHelper(prev => !prev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                    showContourHelper 
                      ? 'bg-rose-600 border-rose-500 text-white font-black shadow-md' 
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-rose-300'
                  }`}
                  title="Schaltet Hilfskontur ein/aus [Taste H]"
                >
                  <Sparkles size={13} /> {showContourHelper ? 'Muster-Verstärker AN' : 'Muster-Verstärker'}
                </button>
                <button
                  type="button"
                  onClick={() => setSchuelerModus(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl border border-slate-800 transition-all shadow-sm"
                >
                  Beenden
                </button>
              </div>
            </div>

            {/* Giant Centered Plate Area */}
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl relative space-y-6">
              <p className="text-slate-300 text-sm sm:text-base font-medium max-w-md">
                "Schau mal ganz genau hin: Siehst du ein Bild, ein Zeichen oder ein Symbol in diesem großen Kreis? Was ist es?"
              </p>

              {/* Giant Plate Frame */}
              <div className="relative p-6 bg-slate-900/40 border border-slate-800/80 rounded-[3.5rem] shadow-2xl flex items-center justify-center">
                <svg width="260" height="260" className="rounded-full shadow-inner bg-slate-950">
                  {staticDots.map((dot, idx) => {
                    const isMotif = isInsideMotifCheck(dot.cx, dot.cy, currentPlate.id);
                    const colors = isMotif ? currentPlate.motifColors : currentPlate.backgroundColors;
                    const colorHashIdx = Math.floor((dot.cx * 11 + dot.cy * 17) % colors.length);
                    const color = colors[colorHashIdx];

                    return (
                      <circle
                        key={idx}
                        cx={dot.cx}
                        cy={dot.cy}
                        r={dot.r}
                        fill={color}
                        style={{
                          opacity: showContourHelper && !isMotif ? 0.08 : 1,
                          transition: 'opacity 0.3s ease'
                        }}
                      />
                    );
                  })}
                  
                  {/* Contour line in student mode too if toggled */}
                  {(showSolution || showContourHelper) && getPlateOverlayPath(currentPlate.id)}
                </svg>
              </div>

              {/* Teacher Assessment Buttons at bottom of Schüler-Modus */}
              <div className="space-y-4 max-w-md w-full bg-slate-900/60 border border-slate-850 p-5 rounded-3xl mt-4">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1">
                  <span>Eingabe für Lehrkraft:</span>
                  {showSolution ? (
                    <span className="text-rose-400 font-mono text-xs font-black">Erwartet: {currentPlate.target} ({currentPlate.desc.slice(0, 30)}...)</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowSolution(true)}
                      className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded"
                    >
                      💡 Lösung zeigen
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleAssessment('Richtig')}
                    className="py-3 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 text-emerald-300 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 shadow-md"
                  >
                    <span>Richtig</span>
                    <span className="text-[8px] opacity-75 font-mono">Taste →</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAssessment('Nicht erkannt')}
                    className="py-3 bg-rose-600/20 hover:bg-rose-600 border border-rose-500/30 text-rose-300 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 shadow-md"
                  >
                    <span>Nicht erkannt</span>
                    <span className="text-[8px] opacity-75 font-mono">Taste ←</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAssessment('Falsch benannt')}
                    className="py-3 bg-amber-600/20 hover:bg-amber-600 border border-amber-500/30 text-amber-300 hover:text-slate-950 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 shadow-md"
                  >
                    <span>Falsch benannt</span>
                    <span className="text-[8px] opacity-75 font-mono">Taste ↓</span>
                  </button>
                </div>
              </div>

              {/* Progress Tracker Dots */}
              <div className="flex gap-1.5 justify-center mt-2 flex-wrap max-w-md">
                {activePlatesSeries.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`w-3 h-3 rounded-full transition-all duration-300 border ${
                      idx === activePlateIdx
                        ? 'bg-rose-500 border-rose-600 scale-125 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                        : resultsMap[p.id] === 'Richtig'
                        ? 'bg-emerald-500 border-emerald-600'
                        : resultsMap[p.id] === 'Nicht erkannt'
                        ? 'bg-rose-500 border-rose-600'
                        : resultsMap[p.id] === 'Falsch benannt'
                        ? 'bg-amber-500 border-amber-600'
                        : 'bg-slate-800 border-slate-700'
                    }`}
                  />
                ))}
              </div>

            </div>

            {/* Keyboard shortcut footer */}
            <div className="mt-8 text-[11px] text-slate-500 font-bold tracking-wide uppercase">
              Tastatur: [Leertaste] = Lösung zeigen • [Taste H] = Muster-Verstärker • [Pfeiltaste links] = Nicht erkannt • [Pfeiltaste rechts] = Richtig • [Pfeiltaste unten] = Falsch
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
