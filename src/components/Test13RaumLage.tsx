import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Save, ArrowLeft, Check, X, HelpCircle, Compass, RefreshCw, Layers, AlertTriangle, Monitor, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface TestProps {
  studentId: string;
  initialGrade: number;
  onClose: () => void;
  onSave: (result: {
    testId: string;
    score: number; // total out of 15
    foerderbedarf: boolean;
    note: string;
    meta?: any;
  }) => void;
}

interface directionQuestion {
  grid: string[][]; // 3x3 array of emojis
  prompt: string;
  answer: string;
}

interface mirroringQuestion {
  title: string;
  svgType: 'arrow' | 'emoji' | 'letter' | 'complex';
  leftContent: string;
  rightContent: string;
  isMirrored: boolean; // true = gespiegelt, false = gleich
  isRotated?: boolean; // for Grade 4
  questionText: string;
  expectedAnswer: string;
}

export const Test13RaumLage: React.FC<TestProps> = ({ studentId, initialGrade, onClose, onSave }) => {
  const { app } = useApp();
  const student = app.schueler.find(s => s.id === studentId);

  const [grade, setGrade] = useState<number>(initialGrade || 1);
  const [phase, setPhase] = useState<'setup' | 'test' | 'result'>('setup');
  
  // 3 Modes: 'directions' | 'mirror' | 'figure'
  const [mode, setMode] = useState<'directions' | 'mirror' | 'figure'>('directions');
  const [stageIndex, setStageIndex] = useState<number>(0);
  
  // Answers recorded as booleans (Richtig / Falsch) for 5 questions in each of the 3 modes
  const [directionsScores, setDirectionsScores] = useState<boolean[]>([]);
  const [mirrorScores, setMirrorScores] = useState<boolean[]>([]);
  const [figureScores, setFigureScores] = useState<boolean[]>([]);
  
  const [kommentar, setKommentar] = useState<string>('');
  const [showSolution, setShowSolution] = useState<boolean>(false);
  const [schuelerModus, setSchuelerModus] = useState<boolean>(false);

  useEffect(() => {
    setShowSolution(false);
  }, [mode, stageIndex]);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'test') return;
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') {
        return;
      }

      if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleResponse(true);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleResponse(false);
      } else if (e.code === 'Space') {
        e.preventDefault();
        setShowSolution(prev => !prev);
      } else if (e.code === 'KeyS') {
        e.preventDefault();
        setSchuelerModus(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, mode, stageIndex, directionsScores, mirrorScores, figureScores]);

  const currentTaskIndex = stageIndex + 1;

  // DYNAMICALLY GENERATED DATA BASED ON GRADE
  const activeQuestions = useMemo(() => {
    // -------------------------------------------------------------
    // MODUS 1: RICHTUNGEN (5 Fragen)
    // -------------------------------------------------------------
    const gridData = [
      ['🐱', '🏡', '🍎'],
      ['🚗', '⚽', '🌳'],
      ['🐶', '🎁', '🍌']
    ];

    let directions: directionQuestion[] = [];
    if (grade === 1) {
      directions = [
        { grid: gridData, prompt: 'Was ist direkt über dem Fussball (⚽)?', answer: 'Das Haus (🏡)' },
        { grid: gridData, prompt: 'Was ist direkt unter dem Fussball (⚽)?', answer: 'Das Geschenk (🎁)' },
        { grid: gridData, prompt: 'Was ist neben dem Geschenk (🎁) auf der rechten Seite?', answer: 'Die Banane (🍌)' },
        { grid: gridData, prompt: 'Was ist über der Katze (🐱)?', answer: 'Nichts / Der Rand' },
        { grid: gridData, prompt: 'Was ist direkt unter der Katze (🐱)?', answer: 'Das Auto (🚗)' }
      ];
    } else if (grade === 2) {
      directions = [
        { grid: gridData, prompt: 'Was liegt links vom Fussball (⚽)?', answer: 'Das rote Auto (🚗)' },
        { grid: gridData, prompt: 'Was liegt rechts vom Hund (🐶)?', answer: 'Das Geschenk (🎁)' },
        { grid: gridData, prompt: 'Welches Obst liegt rechts neben dem Haus (🏡)?', answer: 'Der rote Apfel (🍎)' },
        { grid: gridData, prompt: 'Was liegt links von der Banane (🍌)?', answer: 'Das Geschenk (🎁)' },
        { grid: gridData, prompt: 'Was ist rechts vom Fussball (⚽) und über der Banane (🍌)?', answer: 'Der Baum (🌳)' }
      ];
    } else if (grade === 3) {
      // Perspective shift ("VOM HAUS aus gesehen" means house facing down, left is Apple (which is right in standard profile) or Dog's view)
      directions = [
        { grid: gridData, prompt: 'Vom Auto (🚗) aus gesehen (Schaufel vorn): Was ist auf der RECHTEN Seite?', answer: 'Der Hund (🐶) (liegt unter ihm)' },
        { grid: gridData, prompt: 'Schau auf den Hund (🐶). Aus seiner Sicht: Was liegt direkt LINKS neben ihm?', answer: 'Das Geschenk (🎁) (aus Hundesicht ist das rechts, links ist Rand)' },
        { grid: gridData, prompt: 'Wenn du im Haus (🏡) wohnst und zur Haustür (unten) rausgehst: Welches Tier siehst du auf deiner RECHTEN Seite?', answer: 'Das Auto / Den Hund (auf der linken Seite ist die Katze)' },
        { grid: gridData, prompt: 'Vom Apfel (🍎) aus gehend, ein Schritt nach links und ein Schritt nach unten:', answer: 'Das Fussballtor (⚽)' },
        { grid: gridData, prompt: 'Welches Tier befindet sich genau eine Zeile über dem Hund (🐶)?', answer: 'Das Auto (🚗)' }
      ];
    } else { // Grade 4: diagonal views & complex coordinates
      directions = [
        { grid: gridData, prompt: 'Was liegt diagonal rechts über dem Geschenk (🎁)?', answer: 'Der Baum (🌳)' },
        { grid: gridData, prompt: 'Was liegt diagonal links unter dem Apfel (🍎)?', answer: 'Der Fussball (⚽)' },
        { grid: gridData, prompt: 'Vom Auto (🚗) aus: Wenn du dich um 90 Grad nach rechts drehst, wohin schaust du dann?', answer: 'Nach oben (zur Katze 🐱)' },
        { grid: gridData, prompt: 'Welcher Gegenstand liegt in der mittleren Zeile ganz rechts?', answer: 'Der Baum (🌳)' },
        { grid: gridData, prompt: 'Welches Tier liegt in der untersten Zeile ganz links?', answer: 'Der Hund (🐶)' }
      ];
    }

    // -------------------------------------------------------------
    // MODUS 2: SPIEGELUNGEN / ROTATIONEN (5 Fragen)
    // -------------------------------------------------------------
    let mirroring: mirroringQuestion[] = [];
    if (grade === 1) {
      mirroring = [
        { title: 'Pfeile', svgType: 'arrow', leftContent: '➜', rightContent: '➜', isMirrored: false, questionText: 'Zeigen diese Pfeile in dieselbe Richtung?', expectedAnswer: 'Ja / Gleich' },
        { title: 'Pfeile gespiegelt', svgType: 'arrow', leftContent: '➜', rightContent: '⬅', isMirrored: true, questionText: 'Zeigen diese Pfeile in dieselbe Richtung oder sind sie gegeneinander gespiegelt?', expectedAnswer: 'Gespielt / Gegenläufig' },
        { title: 'Katzen', svgType: 'emoji', leftContent: '🐱', rightContent: '🐱', isMirrored: false, questionText: 'Sind diese beiden Katzen gleich herum orientiert?', expectedAnswer: 'Ja, sind gleich' },
        { title: 'Rechteck', svgType: 'complex', leftContent: 'L', rightContent: '⅃', isMirrored: true, questionText: 'Sind die L-Formen gleich oder gespiegelt?', expectedAnswer: 'Gespiegelt' },
        { title: 'Affe', svgType: 'emoji', leftContent: '🐒', rightContent: '🐒', isMirrored: false, questionText: 'Schauen diese Affen in dieselbe Richtung?', expectedAnswer: 'Ja / Gleich' }
      ];
    } else if (grade === 2) {
      mirroring = [
        { title: 'Fische', svgType: 'emoji', leftContent: '🐟', rightContent: '🐟', isMirrored: false, questionText: 'Schwimmen beide Fische nach links?', expectedAnswer: 'Ja, schwimmen gleich' },
        { title: 'Fische gespiegelt', svgType: 'emoji', leftContent: '🐟', rightContent: '🐠', isMirrored: true, questionText: 'Schwimmen die Tiere in dieselbe Richtung oder gespiegelt?', expectedAnswer: 'Gespiegelt (einer links, einer rechts)' },
        { title: 'Formen', svgType: 'complex', leftContent: 'b', rightContent: 'd', isMirrored: true, questionText: 'Sind "b" und "d" zueinander gespiegelt oder gleich?', expectedAnswer: 'Gespiegelt' },
        { title: 'Formen p/q', svgType: 'complex', leftContent: 'p', rightContent: 'q', isMirrored: true, questionText: 'Sind "p" und "q" zueinander gespiegelt?', expectedAnswer: 'Gespiegelt' },
        { title: 'Formen p/p', svgType: 'complex', leftContent: 'p', rightContent: 'p', isMirrored: false, questionText: 'Sind diese Buchstaben gleich?', expectedAnswer: 'Gleich' }
      ];
    } else if (grade === 3) {
      mirroring = [
        { title: 'Buchstabe F', svgType: 'letter', leftContent: 'F', rightContent: 'F', isMirrored: false, questionText: 'Sind diese F-Symbole exakt identisch ausgerichtet?', expectedAnswer: 'Ja, identisch' },
        { title: 'F gespiegelt', svgType: 'letter', leftContent: 'F', rightContent: 'Ⅎ', isMirrored: true, questionText: 'Ist das zweite F gespiegelt?', expectedAnswer: 'Gespiegelt (an der horizontalen Achse)' },
        { title: 'F vertikal gespiegelt', svgType: 'letter', leftContent: 'F', rightContent: 'ꓞ', isMirrored: true, questionText: 'Ist das zweite F gespiegelt?', expectedAnswer: 'Gespiegelt (an der vertikalen Achse)' },
        { title: 'Asymmetrie', svgType: 'complex', leftContent: 'R', rightContent: 'R', isMirrored: false, questionText: 'Sind beide R-Formen gleich?', expectedAnswer: 'Gleich' },
        { title: 'Asymmetrie gespiegelt', svgType: 'complex', leftContent: 'R', rightContent: 'Я', isMirrored: true, questionText: 'Ist das zweite R gespiegelt?', expectedAnswer: 'Gespiegelt' }
      ];
    } else { // Grade 4: Drehungen (90/180 Grad) vs Spiegelung!
      mirroring = [
        { title: 'Drehung 180 Grad', svgType: 'letter', leftContent: 'F', rightContent: 'Ⅎ', isMirrored: false, isRotated: true, questionText: 'Wurde das "F" gespiegelt oder nur um 180 Grad gedreht?', expectedAnswer: 'Gedreht (180 Grad)' },
        { title: 'Drehung vs Spiegelung', svgType: 'complex', leftContent: 'L', rightContent: '⅃', isMirrored: true, isRotated: false, questionText: 'Ist das eine Drehung des "L" oder eine Spiegelung?', expectedAnswer: 'Spiegelung' },
        { title: 'Drehung 90 Grad', svgType: 'letter', leftContent: '➜', rightContent: '⬇', isMirrored: false, isRotated: true, questionText: 'Stellt dies eine Spiegelung oder eine reine Drehung um 90 Grad dar?', expectedAnswer: 'Drehung' },
        { title: 'Asymmetrie R gedreht', svgType: 'complex', leftContent: 'R', rightContent: 'ʁ', isMirrored: false, isRotated: true, questionText: 'Ist das zweite Schild gedreht oder gespiegelt?', expectedAnswer: 'Gedreht (auf dem Kopf)' },
        { title: 'Komplexe Spiegelung', svgType: 'complex', leftContent: 'Я', rightContent: 'R', isMirrored: true, isRotated: false, questionText: 'Handelt es sich hierbei um eine Spiegelung oder Drehung?', expectedAnswer: 'Spiegelung' }
      ];
    }

    // -------------------------------------------------------------
    // MODUS 3: FIGUR-GRUND (5 Fragen)
    // -------------------------------------------------------------
    const figureColorSets = [
      { name: 'Rundkreis', question: 'Siehst du den großen blauen Kreis? Zeige ihn.', answer: 'Kreis' },
      { name: 'Spitzdreieck', question: 'Siehst du das orangefarbene Dreieck? Zeige es.', answer: 'Dreieck' },
      { name: 'Kästchen', question: 'Siehst du das violette Viereck / Quadrat? Zeige es.', answer: 'Viereck' },
      { name: 'Sternenkopf', question: 'Siehst du den glänzenden Stern? Zeige ihn.', answer: 'Stern' },
      { name: 'Achteck', question: 'Siehst du das grüne Achteck / Oval? Zeige es.', answer: 'Achteck' }
    ];

    return { directions, mirroring, figureColorSets };
  }, [grade]);

  const handleResponse = (success: boolean) => {
    if (mode === 'directions') {
      const updated = [...directionsScores, success];
      setDirectionsScores(updated);
      if (stageIndex + 1 < 5) {
        setStageIndex(stageIndex + 1);
      } else {
        setMode('mirror');
        setStageIndex(0);
      }
    } else if (mode === 'mirror') {
      const updated = [...mirrorScores, success];
      setMirrorScores(updated);
      if (stageIndex + 1 < 5) {
        setStageIndex(stageIndex + 1);
      } else {
        setMode('figure');
        setStageIndex(0);
      }
    } else {
      const updated = [...figureScores, success];
      setFigureScores(updated);
      if (stageIndex + 1 < 5) {
        setStageIndex(stageIndex + 1);
      } else {
        setPhase('result');
      }
    }
  };

  const totalCorrect = 
    directionsScores.filter(Boolean).length +
    mirrorScores.filter(Boolean).length +
    figureScores.filter(Boolean).length;

  const handleSave = () => {
    if (!student) return;

    const dirCValue = directionsScores.filter(Boolean).length;
    const mirCValue = mirrorScores.filter(Boolean).length;
    const figCValue = figureScores.filter(Boolean).length;

    const summaryReport = `### Raum-Lage-Orientierung Diagnose (Stufe ${grade})\n\n` +
      `**Evaluierte Kategorien (Gesamt: ${totalCorrect}/15 richtig)**:\n` +
      `- Richtungen & Lokalisierung: ${dirCValue}/5 richtig\n` +
      `- Spiegelungen & Rotations-Unterscheidung: ${mirCValue}/5 richtig\n` +
      `- Figur-Grund-Wahrnehmung (SVG-Überlagerungen): ${figCValue}/5 richtig\n\n` +
      `**Detaillierte Fehlerprüfung**:\n` +
      `- Richtungen: [${directionsScores.map(s => s ? '✓' : '✗').join(', ')}]\n` +
      `- Spiegelungen: [${mirrorScores.map(s => s ? '✓' : '✗').join(', ')}]\n` +
      `- Figur-Grund: [${figureScores.map(s => s ? '✓' : '✗').join(', ')}]` +
      (kommentar ? `\n\n**Freitext Beobachtung**: ${kommentar}` : '');

    onSave({
      testId: 'live-raum-lage',
      score: totalCorrect,
      foerderbedarf: totalCorrect < 10,
      note: summaryReport,
      meta: {
        grade,
        totalCorrect,
        dirCValue,
        mirCValue,
        figCValue,
        directionsScores,
        mirrorScores,
        figureScores,
        kommentar
      }
    });

    onClose();
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-[2rem] text-white p-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-md text-left">
        <div>
          <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full mb-1">
            Raum-Lage- & Raum-Orientierungs-Modul
          </span>
          <h2 className="text-[1.25rem] font-black tracking-tight flex items-center gap-2">
            🧭 Raum-Lage-Orientierung
          </h2>
          <p className="text-[0.75rem] text-sky-50">
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
              Die Orientierungsfragen sowie Komplexität der überlappenden geometrischen Figuren und Drehungsvergleiche passen sich der gewählten Schulstufe an.
            </p>
          </div>

          <div className="flex justify-center gap-2 max-w-sm mx-auto">
            {[1, 2, 3, 4].map(g => (
              <button
                key={g}
                onClick={() => setGrade(g)}
                className={`w-12 h-12 rounded-xl font-black text-sm flex items-center justify-center transition-all border ${grade === g ? 'bg-sky-500 border-sky-500 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="max-w-md mx-auto p-4 bg-slate-50 rounded-2xl border text-left text-xs text-slate-500 space-y-1 font-sans">
            <p className="font-bold text-slate-700">Drei Tests nacheinander:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li><strong>Teil 1: Richtungen</strong> (Räumliche Bezüge im Gitternetz)</li>
              <li><strong>Teil 2: Spiegelungen</strong> (Gleich vs. Gespiegelt o. Gedreht)</li>
              <li><strong>Teil 3: Figur-Grund</strong> (Überlagerte SVG-Umrisse entwirren)</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto w-full">
            <button
              onClick={() => {
                setDirectionsScores([]);
                setMirrorScores([]);
                setFigureScores([]);
                setMode('directions');
                setStageIndex(0);
                setPhase('test');
                setSchuelerModus(false);
              }}
              className="py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-wider transition-all shadow-sm"
            >
              Standard starten
            </button>
            <button
              onClick={() => {
                setDirectionsScores([]);
                setMirrorScores([]);
                setFigureScores([]);
                setMode('directions');
                setStageIndex(0);
                setPhase('test');
                setSchuelerModus(true);
              }}
              className="py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-wider transition-all shadow-md shadow-sky-500/15"
            >
              ⚡ Schüler-Vollbild starten
            </button>
          </div>
        </motion.div>
      )}

      {phase === 'test' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm space-y-6 text-center max-w-3xl mx-auto">
          
          {/* HEADER TIMING */}
          <div className="flex justify-between items-center text-slate-500 text-xs border-b pb-4 flex-wrap gap-3">
            <span className="font-extrabold text-sky-600 uppercase tracking-widest flex items-center gap-1">
              {mode === 'directions' ? (
                <> <Compass size={14} /> Teil 1: Richtungen im Raum </>
              ) : mode === 'mirror' ? (
                <> <RefreshCw size={14} /> Teil 2: Spiegelungen & Drehungen </>
              ) : (
                <> <Layers size={14} /> Teil 3: Überlagernde Formen (Figur-Grund) </>
              )}
            </span>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSchuelerModus(true)}
                className="text-[10px] font-bold bg-sky-100 hover:bg-sky-200 text-sky-800 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Monitor size={11} /> ⚡ Schüler-Vollbild
              </button>
              <span className="font-mono font-bold bg-slate-100 px-2 py-1 rounded">Aufgabe {currentTaskIndex} von 5</span>
            </div>
          </div>

          {/* DYNAMIC DRAWING IN THE SCREEN BOX */}
          <div className="py-8 bg-slate-50 border-2 border-slate-100/80 rounded-[2.5rem] flex flex-col items-center justify-center min-h-[300px]">
            
            {/* IN DIRECTIONS MODE */}
            {mode === 'directions' && (
              <div className="space-y-6">
                {/* 3x3 Grid of emojis */}
                <div className="grid grid-cols-3 gap-3 bg-white p-4 rounded-3xl shadow-sm border border-slate-200/50">
                  {activeQuestions.directions[0].grid.map((row, rIdx) => 
                    row.map((item, cIdx) => (
                      <div
                        key={`${rIdx}-${cIdx}`}
                        className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center text-3xl sm:text-4xl bg-slate-50 border border-slate-100 rounded-2xl select-none"
                      >
                        {item}
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-1.5 px-4">
                  <p className="text-xs text-slate-400 font-sans font-extrabold uppercase tracking-wide">Pädagogische Frage:</p>
                  <p className="text-base font-black text-slate-800 leading-snug">
                    "{activeQuestions.directions[stageIndex]?.prompt}"
                  </p>
                </div>
              </div>
            )}

            {/* IN MIRROR MODE */}
            {mode === 'mirror' && (
              <div className="space-y-6 w-full">
                <div className="flex justify-center items-center gap-12 pt-4">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center text-5xl sm:text-6xl select-none font-bold text-slate-800 shadow-sm">
                    {activeQuestions.mirroring[stageIndex]?.leftContent}
                  </div>
                  <div className="text-slate-300 font-bold text-xl">VS</div>
                  <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center text-5xl sm:text-6xl select-none font-bold text-slate-800 shadow-sm">
                    {activeQuestions.mirroring[stageIndex]?.rightContent}
                  </div>
                </div>

                <div className="space-y-1.5 px-6">
                  <p className="text-xs text-slate-400 font-sans font-extrabold uppercase">Frage an das Kind:</p>
                  <p className="text-base font-black text-slate-800">
                    "{activeQuestions.mirroring[stageIndex]?.questionText}"
                  </p>
                </div>
              </div>
            )}

            {/* IN FIGURE BASIC MODE (SVG OVERLAY) */}
            {mode === 'figure' && (
              <div className="space-y-6 w-full flex flex-col items-center">
                {/* Geometrically layered vector graphics based on School Stage (1-4) */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200/50 shadow-sm">
                  <svg width="220" height="220" className="bg-slate-50 rounded-2xl">
                    {/* Circle (Blue) */}
                    <circle cx="110" cy="110" r="48" fill="none" stroke="#3b82f6" strokeWidth={grade === 4 ? 6 : 4} strokeDasharray={grade === 3 ? "4" : undefined} opacity={0.65} />
                    
                    {/* Triangle (Orange) */}
                    <polygon points="110,60 170,160 50,160" fill="none" stroke="#f97316" strokeWidth={grade === 4 ? 6 : 4} opacity={0.6} />

                    {/* Rectangle/Box (Purple) - added conditionally is Stufe 2, 3, 4 */}
                    {grade >= 2 && (
                      <rect x="70" y="70" width="80" height="80" rx={8} fill="none" stroke="#a855f7" strokeWidth={grade === 4 ? 6 : 4} opacity={0.5} />
                    )}

                    {/* Star (Yellow) - added conditionally in Stufe 3, 4 */}
                    {grade >= 3 && (
                      <path d="M 110 55 L 120 90 L 155 90 L 125 110 L 138 145 L 110 125 L 82 145 L 95 110 L 65 90 L 100 90 Z" fill="none" stroke="#eab308" strokeWidth={grade === 4 ? 6 : 4} opacity={0.55} />
                    )}

                    {/* Extra complex shape (Green oval / Pentagon) - added in Stufe 4 */}
                    {grade >= 4 && (
                      <polygon points="110,40 190,90 160,180 60,180 30,90" fill="none" stroke="#10b981" strokeWidth={4} opacity={0.5} />
                    )}
                  </svg>
                </div>

                <div className="space-y-1.5 px-6">
                  <p className="text-xs text-slate-400 font-sans font-extrabold uppercase">Anweisung:</p>
                  <p className="text-base font-black text-slate-800">
                    "{activeQuestions.figureColorSets[stageIndex]?.question}"
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* TEACHER BUTTONS FOR RATING */}
          <div className="max-w-md mx-auto space-y-4">
             <div className="p-3 bg-sky-50 rounded-2xl border border-sky-100 text-[11px] leading-relaxed text-sky-700 font-sans font-semibold flex items-center justify-between min-h-[46px]">
                {showSolution ? (
                  <span>
                    Soll-Antwort des Kindes: <strong className="text-sky-900 font-black underline">
                      {mode === 'directions' 
                        ? activeQuestions.directions[stageIndex]?.answer 
                        : mode === 'mirror' 
                        ? activeQuestions.mirroring[stageIndex]?.expectedAnswer 
                        : activeQuestions.figureColorSets[stageIndex]?.answer}
                    </strong>
                  </span>
                ) : (
                  <span>
                    Soll-Antwort des Kindes: <button
                      onClick={() => setShowSolution(true)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-[9px] font-bold text-slate-500 rounded border border-slate-200 transition-all ml-1"
                    >
                      💡 Lösung anzeigen
                    </button>
                  </span>
                )}
             </div>

             <div className="grid grid-cols-2 gap-4">
               <button
                 onClick={() => handleResponse(true)}
                 className="py-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-sm flex justify-center items-center gap-1.5"
               >
                 <Check size={18} /> Richtig gelöst
               </button>
               <button
                 onClick={() => handleResponse(false)}
                 className="py-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-sm flex justify-center items-center gap-1.5"
               >
                 <X size={18} /> Falsche Zuordnung
               </button>
             </div>
          </div>

        </div>
      )}

      {phase === 'result' && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-md max-w-2xl mx-auto space-y-6 text-center">
          <div className="w-16 h-16 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mx-auto">
            <Compass size={36} />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-800">Ergebnisse Raumorientierung</h3>
            <p className="text-xs text-slate-400 font-sans">Kopfstelle Schulstufe {grade}</p>
          </div>

          <div className="p-4 bg-slate-50 border rounded-2xl inline-block px-8">
            <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Gesamtpunktzahl</span>
            <span className="text-4xl font-black text-slate-800">{totalCorrect}</span>
            <span className="text-slate-400 text-sm font-bold"> / 15</span>
          </div>

          {/* DETAIL SUMMARY CARDS */}
          <div className="grid grid-cols-3 gap-3 text-left">
            <div className="bg-slate-50 border p-4 rounded-xl text-center">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Teil 1: Richtungen</span>
              <span className="text-xl font-black text-slate-800">{directionsScores.filter(Boolean).length} / 5</span>
            </div>
            <div className="bg-slate-50 border p-4 rounded-xl text-center">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Teil 2: Spiegelungen</span>
              <span className="text-xl font-black text-slate-800">{mirrorScores.filter(Boolean).length} / 5</span>
            </div>
            <div className="bg-slate-50 border p-4 rounded-xl text-center">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Teil 3: Figur-Grund</span>
              <span className="text-xl font-black text-slate-800">{figureScores.filter(Boolean).length} / 5</span>
            </div>
          </div>

          {totalCorrect < 10 && (
            <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-100 flex items-start gap-2.5 text-left text-xs leading-relaxed font-sans font-medium">
              <AlertTriangle size={20} className="shrink-0 text-rose-500 mt-0.5" />
              <p>
                <strong>Erhöhter Unterstützungsbedarf:</strong> Das Kind hatte erhebliche Schwierigkeiten bei der räumlichen Orientierung und dem figur-grundhaften Wahrnehmen. Gezielte fein- und grobmotorische Dreidimensionale-Aufbautrainings (z.B. mit Legosteinen, Bauklötzen) werden angeraten.
              </p>
            </div>
          )}

          {/* COMMENTS */}
          <div className="text-left space-y-2">
            <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1">Beobachtungsnotiz der Lehrperson</label>
            <textarea
              value={kommentar}
              onChange={e => setKommentar(e.target.value)}
              placeholder="z.B. Spiegelungen in Drehung wurden am Anfang vertauscht, Richtungen liefen fabelhaft..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-sky-500 font-sans"
            />
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t">
            <button
              onClick={() => {
                setDirectionsScores([]);
                setMirrorScores([]);
                setFigureScores([]);
                setMode('directions');
                setStageIndex(0);
                setPhase('setup');
              }}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
            >
              Wiederholen
            </button>
            <button
              onClick={handleSave}
              className="px-8 py-3 bg-sky-500 hover:bg-sky-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-sky-500/20 transition-all"
            >
              Ergebnis speichern
            </button>
          </div>
        </motion.div>
      )}

      {/* SCHÜLER-VOLLBILD OVERLAY FOR SPATIAL AWARENESS */}
      <AnimatePresence>
        {schuelerModus && phase === 'test' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950 z-[99999] flex flex-col p-6 sm:p-12 overflow-hidden select-none items-center justify-center text-center font-sans"
          >
            {/* Top Toolbar */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-center text-slate-400">
              <div className="flex items-center gap-3 text-left">
                <span className="text-2xl text-sky-500 animate-pulse">🧭</span>
                <div>
                  <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest block">Raumorientierung Schüler-Ansicht</span>
                  <h4 className="text-sm font-bold text-slate-200">
                    {mode === 'directions' ? 'Teil 1: Richtungen' : mode === 'mirror' ? 'Teil 2: Spiegelungen' : 'Teil 3: Figur-Grund'} • Aufgabe {currentTaskIndex} von 5
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

            {/* Huge Stage Area */}
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl relative space-y-6">
              
              {/* CONTENT 1: DIRECTIONS GRID */}
              {mode === 'directions' && (
                <div className="space-y-6 flex flex-col items-center">
                  <div className="grid grid-cols-3 gap-4 bg-slate-900/60 p-6 rounded-[2.5rem] border border-slate-800 shadow-2xl">
                    {activeQuestions.directions[0].grid.map((row, rIdx) => 
                      row.map((item, cIdx) => (
                        <motion.div
                          key={`${rIdx}-${cIdx}`}
                          whileHover={{ scale: 1.05 }}
                          className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center text-4xl sm:text-5xl bg-slate-950 border border-slate-800 rounded-3xl select-none shadow-inner"
                        >
                          {item}
                        </motion.div>
                      ))
                    )}
                  </div>

                  <p className="text-slate-300 text-lg sm:text-xl font-black max-w-lg leading-relaxed pt-2">
                    "{activeQuestions.directions[stageIndex]?.prompt}"
                  </p>
                </div>
              )}

              {/* CONTENT 2: MIRRORING SIDE-BY-SIDE */}
              {mode === 'mirror' && (
                <div className="space-y-6 w-full flex flex-col items-center">
                  <div className="flex justify-center items-center gap-8 sm:gap-16 py-4">
                    <div className="w-32 h-32 sm:w-40 sm:h-40 bg-slate-900 border-2 border-slate-800 rounded-[2rem] flex items-center justify-center text-7xl sm:text-8xl select-none font-bold text-slate-100 shadow-2xl">
                      {activeQuestions.mirroring[stageIndex]?.leftContent}
                    </div>
                    <div className="text-slate-600 font-black text-2xl tracking-widest uppercase">vs</div>
                    <div className="w-32 h-32 sm:w-40 sm:h-40 bg-slate-900 border-2 border-slate-800 rounded-[2rem] flex items-center justify-center text-7xl sm:text-8xl select-none font-bold text-slate-100 shadow-2xl">
                      {activeQuestions.mirroring[stageIndex]?.rightContent}
                    </div>
                  </div>

                  <p className="text-slate-300 text-lg sm:text-xl font-black max-w-lg leading-relaxed pt-2">
                    "{activeQuestions.mirroring[stageIndex]?.questionText}"
                  </p>
                </div>
              )}

              {/* CONTENT 3: FIGURE-GROUND OVERLAYS */}
              {mode === 'figure' && (
                <div className="space-y-6 w-full flex flex-col items-center">
                  <div className="bg-slate-900/60 p-6 rounded-[2.5rem] border border-slate-800 shadow-2xl relative">
                    <svg width="280" height="280" className="bg-slate-950 rounded-[2rem]">
                      {/* Circle (Blue) */}
                      <circle cx="140" cy="140" r="62" fill="none" stroke="#3b82f6" strokeWidth={grade === 4 ? 8 : 5} strokeDasharray={grade === 3 ? "5" : undefined} opacity={0.8} />
                      
                      {/* Triangle (Orange) */}
                      <polygon points="140,70 220,205 60,205" fill="none" stroke="#f97316" strokeWidth={grade === 4 ? 8 : 5} opacity={0.75} />

                      {/* Rectangle/Box (Purple) - added conditionally */}
                      {grade >= 2 && (
                        <rect x="90" y="90" width="100" height="100" rx={10} fill="none" stroke="#a855f7" strokeWidth={grade === 4 ? 8 : 5} opacity={0.7} />
                      )}

                      {/* Star (Yellow) - added conditionally */}
                      {grade >= 3 && (
                        <path d="M 140 65 L 153 110 L 198 110 L 160 135 L 176 180 L 140 155 L 104 180 L 120 135 L 82 110 L 127 110 Z" fill="none" stroke="#eab308" strokeWidth={grade === 4 ? 8 : 5} opacity={0.75} />
                      )}

                      {/* Extra complex shape (Green pentagon) - added in Stufe 4 */}
                      {grade >= 4 && (
                        <polygon points="140,45 240,110 200,230 80,230 40,110" fill="none" stroke="#10b981" strokeWidth={5} opacity={0.7} />
                      )}
                    </svg>
                  </div>

                  <p className="text-slate-300 text-lg sm:text-xl font-black max-w-lg leading-relaxed pt-2">
                    "{activeQuestions.figureColorSets[stageIndex]?.question}"
                  </p>
                </div>
              )}

              {/* Teacher Assessment Control Box inside the overlay */}
              <div className="space-y-4 max-w-md w-full bg-slate-900/60 border border-slate-800/80 p-5 rounded-3xl mt-4">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1">
                  <span>Lehrer-Tastatur-Eingabe:</span>
                  {showSolution ? (
                    <span className="text-sky-400 font-mono text-xs font-black">
                      Soll: {
                        mode === 'directions' 
                          ? activeQuestions.directions[stageIndex]?.answer 
                          : mode === 'mirror' 
                          ? activeQuestions.mirroring[stageIndex]?.expectedAnswer 
                          : activeQuestions.figureColorSets[stageIndex]?.answer
                      }
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowSolution(true)}
                      className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded"
                    >
                      💡 Lösung einblenden
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleResponse(true)}
                    className="py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                  >
                    <Check size={14} /> Richtig (→)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResponse(false)}
                    className="py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                  >
                    <X size={14} /> Falsch (←)
                  </button>
                </div>
              </div>

              {/* Progress indication dots */}
              <div className="flex gap-1.5 justify-center mt-2 flex-wrap">
                {[0, 1, 2, 3, 4].map((idx) => (
                  <div
                    key={idx}
                    className={`w-3 h-3 rounded-full transition-all duration-300 border ${
                      idx === stageIndex
                        ? 'bg-sky-500 border-sky-600 scale-125 shadow-[0_0_10px_rgba(14,165,233,0.5)]'
                        : (mode === 'directions' && directionsScores[idx] !== undefined) ||
                          (mode === 'mirror' && mirrorScores[idx] !== undefined) ||
                          (mode === 'figure' && figureScores[idx] !== undefined)
                        ? 'bg-emerald-500 border-emerald-600'
                        : 'bg-slate-800 border-slate-700'
                    }`}
                  />
                ))}
              </div>

            </div>

            {/* Keyboard helper footer */}
            <div className="mt-8 text-[11px] text-slate-500 font-bold tracking-wide uppercase">
              Tastatur: [Leertaste] = Lösung zeigen • [Pfeiltaste links] = Falsche Zuordnung • [Pfeiltaste rechts] = Richtig gelöst
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
