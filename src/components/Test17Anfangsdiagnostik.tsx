import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Save, RotateCcw, Sparkles, BookOpen, Hash, Image as ImageIcon, CheckCircle, XCircle, AlertCircle, HelpCircle, ChevronRight, Play, Eye
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

interface LetterItem {
  char: string;
  isUppercase: boolean;
}

interface MathConceptItem {
  id: string;
  type: 'recognition' | 'comparison' | 'empty_set' | 'subset';
  question: string;
  visualType: 'number' | 'shapes' | 'box';
  data: any;
  teacherNote: string;
  solution: string;
}

interface RepresentationItem {
  id: string;
  type: 'dice' | 'fingers' | 'tally' | 'tenframe';
  value: number;
  question: string;
  teacherNote: string;
}

const ALPHABET_SELECTION: LetterItem[] = [
  { char: 'A', isUppercase: true },
  { char: 'a', isUppercase: false },
  { char: 'M', isUppercase: true },
  { char: 'm', isUppercase: false },
  { char: 'L', isUppercase: true },
  { char: 'l', isUppercase: false },
  { char: 'S', isUppercase: true },
  { char: 's', isUppercase: false },
  { char: 'O', isUppercase: true },
  { char: 'o', isUppercase: false },
  { char: 'E', isUppercase: true },
  { char: 'e', isUppercase: false },
  { char: 'T', isUppercase: true },
  { char: 't', isUppercase: false },
  { char: 'I', isUppercase: true },
  { char: 'i', isUppercase: false },
  { char: 'R', isUppercase: true },
  { char: 'r', isUppercase: false },
  { char: 'N', isUppercase: true },
  { char: 'n', isUppercase: false },
];

const MATH_CONCEPT_ITEMS: MathConceptItem[] = [
  {
    id: 'c1',
    type: 'recognition',
    question: 'Welche Zahl ist das?',
    visualType: 'number',
    data: { number: 5 },
    teacherNote: 'Zahl "5" vorlesen lassen.',
    solution: '5'
  },
  {
    id: 'c2',
    type: 'recognition',
    question: 'Welche Zahl ist das?',
    visualType: 'number',
    data: { number: 9 },
    teacherNote: 'Zahl "9" vorlesen lassen (Achtung vor Verwechslung mit 6).',
    solution: '9'
  },
  {
    id: 'c3',
    type: 'comparison',
    question: 'Wo sind MEHR Äpfel?',
    visualType: 'shapes',
    data: { left: 4, right: 6, shape: '🍎' },
    teacherNote: 'Kind zeigt auf die Schüssel mit mehr Äpfeln (Rechts).',
    solution: 'Rechts (6)'
  },
  {
    id: 'c4',
    type: 'comparison',
    question: 'Wo sind WENIGER Punkte?',
    visualType: 'shapes',
    data: { left: 5, right: 3, shape: '🔵' },
    teacherNote: 'Kind zeigt auf die Seite mit weniger Punkten (Rechts).',
    solution: 'Rechts (3)'
  },
  {
    id: 'c5',
    type: 'empty_set',
    question: 'Welches Nest ist LEER (enthält NULL Eier)?',
    visualType: 'box',
    data: { left: 0, right: 3, labelLeft: 'Nest A', labelRight: 'Nest B' },
    teacherNote: 'Kind benennt das leere Nest (Links) oder nennt das Wort "Null" / "nichts".',
    solution: 'Links (Nest A)'
  },
  {
    id: 'c6',
    type: 'subset',
    question: 'Hier sind 5 Murmeln. Wenn ich 2 davon verstecke, wie viele bleiben übrig?',
    visualType: 'shapes',
    data: { total: 5, hide: 2, shape: '🔮' },
    teacherNote: 'Teilmengenverständnis prüfen. Kind rechnet im Kopf oder zählt gedanklich zurück.',
    solution: '3'
  }
];

const REPRESENTATION_ITEMS: RepresentationItem[] = [
  { id: 'r1', type: 'dice', value: 4, question: 'Wie viele Punkte siehst du?', teacherNote: 'Klassisches Würfelbild 4.' },
  { id: 'r2', type: 'dice', value: 5, question: 'Wie viele Punkte siehst du?', teacherNote: 'Klassisches Würfelbild 5.' },
  { id: 'r3', type: 'fingers', value: 3, question: 'Wie viele Finger werden gezeigt?', teacherNote: 'Fingerbild 3 (Daumen, Zeige, Mittel).' },
  { id: 'r4', type: 'fingers', value: 7, question: 'Wie viele Finger werden gezeigt?', teacherNote: 'Fünf an einer Hand, zwei an der anderen.' },
  { id: 'r5', type: 'tally', value: 5, question: 'Wie viele Striche sind das?', teacherNote: 'Fünferbündelung (4 senkrecht, 1 quer).' },
  { id: 'r6', type: 'tally', value: 8, question: 'Wie viele Striche sind das?', teacherNote: 'Ein Fünferbündel und drei Einzelstriche.' },
  { id: 'r7', type: 'tenframe', value: 6, question: 'Wie viele Punkte sind im Zehnerfeld?', teacherNote: 'Zehnerfeld: Obere Reihe voll (5) plus 1 unten.' },
  { id: 'r8', type: 'tenframe', value: 9, question: 'Wie viele Punkte sind im Zehnerfeld?', teacherNote: 'Zehnerfeld: Nur ein Feld frei.' }
];

export const Test17Anfangsdiagnostik: React.FC<TestProps> = ({
  studentId,
  initialGrade,
  onClose,
  onSave
}) => {
  const { app } = useApp();
  const student = app.schueler.find(s => s.id === studentId);

  // Flow State
  const [phase, setPhase] = useState<'setup' | 'letters' | 'concepts' | 'representations' | 'result'>('setup');
  
  // Section 1: Letter Screening State
  // letterId -> 'lautiert' | 'benannt' | 'nein'
  const [lettersState, setLettersState] = useState<Record<string, 'lautiert' | 'benannt' | 'nein'>>({});
  const [currentLetterIdx, setCurrentLetterIdx] = useState(0);

  // Section 2: Concepts State
  // itemId -> true (correct) | false (failed)
  const [conceptsState, setConceptsState] = useState<Record<string, boolean>>({});
  const [currentConceptIdx, setCurrentConceptIdx] = useState(0);

  // Section 3: Representations State
  // itemId -> { correct: boolean, method: 'subitizing' | 'counting' }
  const [representationsState, setRepresentationsState] = useState<Record<string, { correct: boolean; method: 'subitizing' | 'counting' }>>({});
  const [currentRepIdx, setCurrentRepIdx] = useState(0);

  const [kommentar, setKommentar] = useState('');
  const [showSolution, setShowSolution] = useState(false);

  // Reset solutions on item changes
  useEffect(() => {
    setShowSolution(false);
  }, [currentLetterIdx, currentConceptIdx, currentRepIdx, phase]);

  // Handle Letter Grading
  const rateLetter = (rating: 'lautiert' | 'benannt' | 'nein') => {
    const currentLetter = ALPHABET_SELECTION[currentLetterIdx];
    setLettersState(prev => ({ ...prev, [currentLetter.char]: rating }));
    
    if (currentLetterIdx + 1 < ALPHABET_SELECTION.length) {
      setCurrentLetterIdx(currentLetterIdx + 1);
    } else {
      setPhase('concepts');
    }
  };

  // Handle Concept Grading
  const rateConcept = (correct: boolean) => {
    const currentConcept = MATH_CONCEPT_ITEMS[currentConceptIdx];
    setConceptsState(prev => ({ ...prev, [currentConcept.id]: correct }));

    if (currentConceptIdx + 1 < MATH_CONCEPT_ITEMS.length) {
      setCurrentConceptIdx(currentConceptIdx + 1);
    } else {
      setPhase('representations');
    }
  };

  // Handle Representation Grading
  const rateRepresentation = (correct: boolean, method: 'subitizing' | 'counting') => {
    const currentRep = REPRESENTATION_ITEMS[currentRepIdx];
    setRepresentationsState(prev => ({
      ...prev,
      [currentRep.id]: { correct, method }
    }));

    if (currentRepIdx + 1 < REPRESENTATION_ITEMS.length) {
      setCurrentRepIdx(currentRepIdx + 1);
    } else {
      setPhase('result');
    }
  };

  // Calculate Scores
  const lettersKnown = Object.values(lettersState).filter(v => v === 'lautiert' || v === 'benannt').length;
  const lettersSounded = Object.values(lettersState).filter(v => v === 'lautiert').length;
  const lettersNamedOnly = Object.values(lettersState).filter(v => v === 'benannt').length;
  const conceptsCorrect = Object.values(conceptsState).filter(Boolean).length;
  const repsCorrect = Object.values(representationsState).filter(r => r.correct).length;
  const repsSubitized = Object.values(representationsState).filter(r => r.correct && r.method === 'subitizing').length;

  const totalScore = lettersKnown + conceptsCorrect + repsCorrect;
  const maxPossibleScore = ALPHABET_SELECTION.length + MATH_CONCEPT_ITEMS.length + REPRESENTATION_ITEMS.length;

  // Förderbedarf (At risk threshold)
  // If child knows fewer than 6 letters OR fewer than 3 math concepts OR fewer than 4 representations
  const hasLetterNeed = lettersKnown < 6;
  const hasMathNeed = (conceptsCorrect + repsCorrect) < 7;
  const hasOverallNeed = hasLetterNeed || hasMathNeed;

  const handleSave = () => {
    if (!student) return;

    const summaryNote = `### Schulanfangsdiagnose (1. Klasse) für ${student.vorname}\n` +
      `**1. Buchstabenscreening (Vorwissen)**:\n` +
      `- Bekannte Buchstaben: **${lettersKnown} von ${ALPHABET_SELECTION.length}** (${lettersSounded} lautiert, ${lettersNamedOnly} rein benannt)\n` +
      `- Unbekannte Buchstaben: ${ALPHABET_SELECTION.length - lettersKnown}\n\n` +
      `**2. Zahlen & Mengenlehre (Zahlenwissen)**:\n` +
      `- Korrekt gelöst: **${conceptsCorrect} von ${MATH_CONCEPT_ITEMS.length}** Aufgaben\n\n` +
      `**3. Zahlendarstellungen / Zahlenbilder**:\n` +
      `- Korrekt erfasst: **${repsCorrect} von ${REPRESENTATION_ITEMS.length}** Bildern\n` +
      `- Simultanerfassung (Blitzblick): ${repsSubitized} mal | Zählend erfasst: ${repsCorrect - repsSubitized} mal\n\n` +
      `**Pädagogische Orientierung**:\n` +
      `- Weiter beobachten: ${hasOverallNeed ? 'Ja – einzelne Vorwissensbereiche gezielt aufgreifen und Entwicklung dokumentieren' : 'Aktuell kein Hinweis aus diesem Kurzcheck; Vorwissen im Unterricht weiter beobachten'}\n` +
      (kommentar ? `\n**Beobachtungen**: ${kommentar}` : '');

    onSave({
      testId: 'live-anfangsdiagnostik',
      score: totalScore,
      foerderbedarf: hasOverallNeed,
      note: summaryNote,
      meta: {
        lettersState,
        conceptsState,
        representationsState,
        lettersKnown,
        lettersSounded,
        conceptsCorrect,
        repsCorrect,
        repsSubitized,
        hasOverallNeed,
        kommentar
      }
    });

    onClose();
  };

  const handleReset = () => {
    setLettersState({});
    setConceptsState({});
    setRepresentationsState({});
    setCurrentLetterIdx(0);
    setCurrentConceptIdx(0);
    setCurrentRepIdx(0);
    setKommentar('');
    setPhase('setup');
  };

  // SVGs for representations
  const renderDice = (val: number) => {
    const coords: Record<number, [number, number][]> = {
      1: [[75, 75]],
      2: [[40, 40], [110, 110]],
      3: [[40, 40], [75, 75], [110, 110]],
      4: [[40, 40], [40, 110], [110, 40], [110, 110]],
      5: [[40, 40], [40, 110], [75, 75], [110, 40], [110, 110]],
      6: [[40, 40], [40, 75], [40, 110], [110, 40], [110, 75], [110, 110]]
    };

    return (
      <svg className="w-40 h-40 bg-amber-50 border-4 border-amber-500 rounded-3xl p-2 shadow-inner" viewBox="0 0 150 150">
        {(coords[val] || []).map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="14" fill="#d97706" />
        ))}
      </svg>
    );
  };

  const renderFingers = (val: number) => {
    // Generate simple visual representations of hands with circles representing raised fingers
    return (
      <div className="flex gap-4">
        {val <= 5 ? (
          <div className="flex flex-col items-center bg-white border-2 border-orange-200 p-4 rounded-2xl shadow-sm">
            <span className="text-[3.5rem] select-none leading-none">🖐️</span>
            <span className="text-xs font-bold text-slate-500 mt-2">Eine Hand</span>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map(f => (
                <div key={f} className={`w-3.5 h-3.5 rounded-full ${f <= val ? 'bg-orange-500' : 'bg-slate-100'}`} />
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center bg-white border-2 border-orange-200 p-4 rounded-2xl shadow-sm">
              <span className="text-[3.5rem] select-none leading-none">🖐️</span>
              <span className="text-xs font-bold text-slate-500 mt-2">Erste Hand</span>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map(f => (
                  <div key={f} className="w-3.5 h-3.5 rounded-full bg-orange-500" />
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center bg-white border-2 border-orange-200 p-4 rounded-2xl shadow-sm">
              <span className="text-[3.5rem] select-none leading-none">🖐️</span>
              <span className="text-xs font-bold text-slate-500 mt-2">Zweite Hand</span>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map(f => (
                  <div key={f} className={`w-3.5 h-3.5 rounded-full ${f <= (val - 5) ? 'bg-orange-500' : 'bg-slate-100'}`} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderTally = (val: number) => {
    const isFive = val >= 5;
    const remainder = isFive ? val - 5 : val;

    return (
      <div className="flex gap-6 items-center p-6 bg-white border-2 border-orange-100 rounded-3xl shadow-sm min-h-[120px]">
        {isFive && (
          <div className="relative w-16 h-20 flex gap-2.5">
            {/* Draw 4 vertical lines and 1 diagonal over them */}
            <div className="w-1.5 h-16 bg-slate-400 rounded-full" />
            <div className="w-1.5 h-16 bg-slate-400 rounded-full" />
            <div className="w-1.5 h-16 bg-slate-400 rounded-full" />
            <div className="w-1.5 h-16 bg-slate-400 rounded-full" />
            <div className="absolute w-20 h-1.5 bg-orange-600 rounded-full rotate-[-30deg] origin-left left-[-10px] top-[26px] shadow-sm" />
          </div>
        )}
        
        {remainder > 0 && (
          <div className="flex gap-2.5 h-16 items-center">
            {Array.from({ length: remainder }).map((_, i) => (
              <div key={i} className="w-1.5 h-16 bg-slate-600 rounded-full" />
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderTenFrame = (val: number) => {
    return (
      <div className="bg-white border-2 border-orange-200 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-5 gap-2 border-2 border-slate-300 bg-slate-50 p-1.5 rounded-xl w-[260px]">
          {/* Top Row */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="aspect-square border border-slate-200 bg-white rounded-lg flex items-center justify-center p-1">
              {i < val && (
                <div className="w-full h-full rounded-full bg-orange-500 shadow-xs" />
              )}
            </div>
          ))}
          {/* Bottom Row */}
          {Array.from({ length: 5 }).map((_, i) => {
            const index = i + 5;
            return (
              <div key={index} className="aspect-square border border-slate-200 bg-white rounded-lg flex items-center justify-center p-1">
                {index < val && (
                  <div className="w-full h-full rounded-full bg-orange-500 shadow-xs" />
                )}
              </div>
            );
          })}
        </div>
        <span className="text-[0.6875rem] font-bold text-slate-400 block text-center mt-2 font-sans">Zehnerfeld (ZR 10)</span>
      </div>
    );
  };

  return (
    <div className="space-y-6" id="anfangsdiagnostik-viewport">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-[2rem] text-white p-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-md text-left">
        <div>
          <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full mb-1">
            Schulstart 1. Klasse
          </span>
          <h2 className="text-[1.25rem] font-black tracking-tight flex items-center gap-2">
            🎒 Schulanfangs-Diagnostik
          </h2>
          <p className="text-[0.75rem] text-orange-50 mt-1">
            Schüler: <strong>{student ? `${student.vorname} ${student.nachname}` : 'Kein Schüler gewählt'}</strong>
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[0.75rem] font-bold rounded-xl transition-all"
        >
          Zur Übersicht
        </button>
      </div>

      {/* SETUP PHASE */}
      {phase === 'setup' && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2rem] border border-slate-200/80 p-8 shadow-sm space-y-6">
          <div className="max-w-xl mx-auto text-center space-y-4">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
              <Sparkles size={32} />
            </div>
            <h3 className="text-[1.25rem] font-black text-slate-800 leading-tight">Mengen, Zahlen & Buchstaben Screening</h3>
            <p className="text-[0.875rem] text-slate-500 font-sans leading-relaxed">
              Dieses spezielle Schulanfangs-Screening dient der Überprüfung des vorschulischen Lernstands in den ersten Schulwochen der 1. Klasse (Diagnostik im Schulanfang).
              Es besteht aus drei Teilen:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left pt-4">
              <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
                  <BookOpen size={16} /> 1. Buchstaben
                </div>
                <p className="text-xs text-slate-500 font-sans mt-1">Laut- & Namenskenntnis von 20 zentralen Lauten (Groß- & Kleinschreibung).</p>
              </div>

              <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                <div className="flex items-center gap-2 font-bold text-orange-800 text-sm">
                  <Hash size={16} /> 2. Zahlen & Mengen
                </div>
                <p className="text-xs text-slate-500 font-sans mt-1">Ziffern erkennen, Vergleiche (mehr/weniger), leere Menge & Teilmengenbegriff.</p>
              </div>

              <div className="p-4 bg-red-50/50 rounded-2xl border border-red-100">
                <div className="flex items-center gap-2 font-bold text-red-800 text-sm">
                  <ImageIcon size={16} /> 3. Zahlenbilder
                </div>
                <p className="text-xs text-slate-500 font-sans mt-1">Mengenerfassung über Würfelaugen, Fingerbilder, Strichlisten & Zehnerfeld.</p>
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={() => setPhase('letters')}
                className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-orange-500/10 transition-all flex items-center gap-2 mx-auto"
              >
                <Play size={14} /> Screening starten
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* PHASE 1: LETTERS SCREENING */}
      {phase === 'letters' && ALPHABET_SELECTION[currentLetterIdx] && (
        <div className="bg-white rounded-[2rem] border border-slate-200/80 p-8 shadow-sm space-y-6 text-center max-w-2xl mx-auto">
          <div className="flex justify-between items-center text-slate-400 text-[0.75rem] font-mono pb-3 border-b uppercase tracking-wider">
            <span className="font-bold flex items-center gap-1 text-amber-600">
              <BookOpen size={14} /> Teil 1: Buchstabenscreening
            </span>
            <span className="font-bold">
              {currentLetterIdx + 1} / {ALPHABET_SELECTION.length}
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider font-sans">Zeigen Sie dem Kind diesen Buchstaben:</p>
            <h4 className="text-xs text-slate-500 font-medium">Frage: "Welcher Buchstabe ist das? Kennst du ihn?"</h4>
          </div>

          {/* Letter Card Display */}
          <div className="flex justify-center py-6">
            <motion.div 
              key={currentLetterIdx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-48 h-48 bg-slate-50 border-4 border-amber-400 rounded-3xl flex items-center justify-center shadow-inner relative"
            >
              <span className="text-[6.5rem] font-black text-slate-800 leading-none select-none tracking-normal">
                {ALPHABET_SELECTION[currentLetterIdx].char}
              </span>
              <span className="absolute bottom-3 right-3 text-[10px] font-mono uppercase font-semibold text-slate-400">
                {ALPHABET_SELECTION[currentLetterIdx].isUppercase ? 'Groß' : 'Klein'}
              </span>
            </motion.div>
          </div>

          {/* Grading buttons */}
          <div className="space-y-3 max-w-sm mx-auto">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Bewertung eintragen:</span>
            
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => rateLetter('lautiert')}
                className="py-3 px-1.5 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-800 rounded-xl font-bold text-[11px] leading-tight transition-all flex flex-col items-center justify-center gap-1"
              >
                <CheckCircle size={14} />
                <span>Lautiert</span>
                <span className="text-[9px] font-normal text-emerald-600 opacity-80">(z.B. "Mmm")</span>
              </button>

              <button
                onClick={() => rateLetter('benannt')}
                className="py-3 px-1.5 bg-sky-50 hover:bg-sky-100/80 border border-sky-200 text-sky-800 rounded-xl font-bold text-[11px] leading-tight transition-all flex flex-col items-center justify-center gap-1"
              >
                <HelpCircle size={14} />
                <span>Buchstabiert</span>
                <span className="text-[9px] font-normal text-sky-600 opacity-80">(z.B. "Em")</span>
              </button>

              <button
                onClick={() => rateLetter('nein')}
                className="py-3 px-1.5 bg-rose-50 hover:bg-rose-100/80 border border-rose-200 text-rose-800 rounded-xl font-bold text-[11px] leading-tight transition-all flex flex-col items-center justify-center gap-1"
              >
                <XCircle size={14} />
                <span>Nicht</span>
                <span className="text-[9px] font-normal text-rose-600 opacity-80">bekannt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 2: MATH CONCEPTS SCREENING */}
      {phase === 'concepts' && MATH_CONCEPT_ITEMS[currentConceptIdx] && (
        <div className="bg-white rounded-[2rem] border border-slate-200/80 p-8 shadow-sm space-y-6 text-center max-w-2xl mx-auto">
          <div className="flex justify-between items-center text-slate-400 text-[0.75rem] font-mono pb-3 border-b uppercase tracking-wider">
            <span className="font-bold flex items-center gap-1 text-orange-600">
              <Hash size={14} /> Teil 2: Mengenlehre & Zahlen
            </span>
            <span className="font-bold">
              {currentConceptIdx + 1} / {MATH_CONCEPT_ITEMS.length}
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider font-sans">
              Frage an das Kind vorlesen:
            </p>
            <h4 className="text-[1.125rem] font-black text-slate-800 leading-snug">
              {MATH_CONCEPT_ITEMS[currentConceptIdx].question}
            </h4>
            <p className="text-[11px] text-orange-600 font-semibold italic mt-1 bg-orange-50/50 py-1.5 px-3 rounded-lg inline-block">
              Hinweis: {MATH_CONCEPT_ITEMS[currentConceptIdx].teacherNote}
            </p>
          </div>

          {/* Conceptual Visualization Display */}
          <div className="flex justify-center py-4 min-h-[160px] items-center">
            {MATH_CONCEPT_ITEMS[currentConceptIdx].visualType === 'number' && (
              <div className="w-32 h-32 bg-slate-50 border-2 border-orange-300 rounded-2xl flex items-center justify-center shadow-inner">
                <span className="text-[5rem] font-black text-slate-800 font-mono leading-none">
                  {MATH_CONCEPT_ITEMS[currentConceptIdx].data.number}
                </span>
              </div>
            )}

            {MATH_CONCEPT_ITEMS[currentConceptIdx].visualType === 'shapes' && (
              <div className="flex items-center gap-8 w-full max-w-md justify-around">
                {/* Left Side */}
                <div className="flex flex-col items-center bg-slate-50 border border-slate-200 p-4 rounded-2xl min-w-[140px]">
                  <span className="text-xs text-slate-400 font-bold mb-2">Links</span>
                  <div className="grid grid-cols-3 gap-1.5 min-h-[60px] items-center">
                    {Array.from({ length: MATH_CONCEPT_ITEMS[currentConceptIdx].data.left || MATH_CONCEPT_ITEMS[currentConceptIdx].data.total - MATH_CONCEPT_ITEMS[currentConceptIdx].data.hide || 0 }).map((_, i) => (
                      <span key={i} className="text-2xl leading-none">{MATH_CONCEPT_ITEMS[currentConceptIdx].data.shape}</span>
                    ))}
                  </div>
                </div>

                <span className="text-slate-300 text-xl font-bold">vs</span>

                {/* Right Side */}
                <div className="flex flex-col items-center bg-slate-50 border border-slate-200 p-4 rounded-2xl min-w-[140px]">
                  <span className="text-xs text-slate-400 font-bold mb-2">Rechts</span>
                  <div className="grid grid-cols-3 gap-1.5 min-h-[60px] items-center">
                    {Array.from({ length: MATH_CONCEPT_ITEMS[currentConceptIdx].data.right || MATH_CONCEPT_ITEMS[currentConceptIdx].data.total || 0 }).map((_, i) => (
                      <span key={i} className="text-2xl leading-none">{MATH_CONCEPT_ITEMS[currentConceptIdx].data.shape}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {MATH_CONCEPT_ITEMS[currentConceptIdx].visualType === 'box' && (
              <div className="flex items-center gap-8 w-full max-w-md justify-around">
                {/* Left Nest */}
                <div className="flex flex-col items-center bg-white border-2 border-slate-200 p-4 rounded-2xl min-w-[140px] shadow-sm">
                  <span className="text-xs font-bold text-slate-400 mb-2">{MATH_CONCEPT_ITEMS[currentConceptIdx].data.labelLeft}</span>
                  <div className="w-16 h-12 bg-slate-100 border border-dashed border-slate-300 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">🥚</span>
                    <span className="text-2xl opacity-0">🥚</span>
                    <span className="text-[10px] font-bold text-slate-400 italic">Leer</span>
                  </div>
                </div>

                <span className="text-slate-300 text-xl font-bold">vs</span>

                {/* Right Nest */}
                <div className="flex flex-col items-center bg-white border-2 border-slate-200 p-4 rounded-2xl min-w-[140px] shadow-sm">
                  <span className="text-xs font-bold text-slate-400 mb-2">{MATH_CONCEPT_ITEMS[currentConceptIdx].data.labelRight}</span>
                  <div className="w-16 h-12 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center gap-0.5">
                    <span className="text-xl">🥚</span>
                    <span className="text-xl">🥚</span>
                    <span className="text-xl">🥚</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Assessment Keys */}
          <div className="space-y-4 max-w-sm mx-auto">
            <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-slate-500 font-medium flex items-center justify-between">
              {showSolution ? (
                <span>💡 Richtige Antwort: <strong className="text-slate-800">{MATH_CONCEPT_ITEMS[currentConceptIdx].solution}</strong></span>
              ) : (
                <span>💡 Richtige Antwort: <button
                  onClick={() => setShowSolution(true)}
                  className="px-2 py-0.5 bg-white hover:bg-slate-200 text-[9px] font-bold text-slate-500 rounded border border-slate-200 transition-all ml-1"
                >
                  Lösung anzeigen
                </button></span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => rateConcept(false)}
                className="py-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
              >
                🔴 Falsch / Unsicher
              </button>
              <button
                onClick={() => rateConcept(true)}
                className="py-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
              >
                🟢 Korrekt gelöst
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 3: REPRESENTATIONS (ZAHLENBILDER) SCREENING */}
      {phase === 'representations' && REPRESENTATION_ITEMS[currentRepIdx] && (
        <div className="bg-white rounded-[2rem] border border-slate-200/80 p-8 shadow-sm space-y-6 text-center max-w-2xl mx-auto">
          <div className="flex justify-between items-center text-slate-400 text-[0.75rem] font-mono pb-3 border-b uppercase tracking-wider">
            <span className="font-bold flex items-center gap-1 text-red-600">
              <ImageIcon size={14} /> Teil 3: Zahlenbilder / Darstellungen
            </span>
            <span className="font-bold">
              {currentRepIdx + 1} / {REPRESENTATION_ITEMS.length}
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider font-sans">
              Blitzblick-Frage (Zahlenbild):
            </p>
            <h4 className="text-[1.125rem] font-black text-slate-800 leading-snug">
              {REPRESENTATION_ITEMS[currentRepIdx].question}
            </h4>
            <p className="text-[11px] text-red-600 font-semibold italic mt-1 bg-red-50/50 py-1.5 px-3 rounded-lg inline-block">
              Prüfung: {REPRESENTATION_ITEMS[currentRepIdx].teacherNote}
            </p>
          </div>

          {/* Visual representations generator */}
          <div className="flex justify-center py-4 min-h-[160px] items-center">
            {REPRESENTATION_ITEMS[currentRepIdx].type === 'dice' && renderDice(REPRESENTATION_ITEMS[currentRepIdx].value)}
            {REPRESENTATION_ITEMS[currentRepIdx].type === 'fingers' && renderFingers(REPRESENTATION_ITEMS[currentRepIdx].value)}
            {REPRESENTATION_ITEMS[currentRepIdx].type === 'tally' && renderTally(REPRESENTATION_ITEMS[currentRepIdx].value)}
            {REPRESENTATION_ITEMS[currentRepIdx].type === 'tenframe' && renderTenFrame(REPRESENTATION_ITEMS[currentRepIdx].value)}
          </div>

          {/* Assessment Keys */}
          <div className="space-y-4 max-w-sm mx-auto">
            <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] text-slate-500 font-medium flex items-center justify-between">
              {showSolution ? (
                <span>💡 Soll-Menge: <strong className="text-slate-800 font-mono text-sm">{REPRESENTATION_ITEMS[currentRepIdx].value}</strong></span>
              ) : (
                <span>💡 Soll-Menge: <button
                  onClick={() => setShowSolution(true)}
                  className="px-2 py-0.5 bg-white hover:bg-slate-200 text-[9px] font-bold text-slate-500 rounded border border-slate-200 transition-all ml-1"
                >
                  Menge einblenden
                </button></span>
              )}
            </div>

            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">WIE wurde die Menge gelöst?</p>
            
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => rateRepresentation(true, 'subitizing')}
                className="py-3 px-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl font-bold text-[10px] uppercase leading-tight transition-all flex flex-col items-center justify-center gap-1 shadow-xs"
              >
                <span>⚡ Simultan</span>
                <span className="text-[8px] font-normal lowercase opacity-85">(erkannt ohne Zählen)</span>
              </button>

              <button
                onClick={() => rateRepresentation(true, 'counting')}
                className="py-3 px-1 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 rounded-xl font-bold text-[10px] uppercase leading-tight transition-all flex flex-col items-center justify-center gap-1 shadow-xs"
              >
                <span>🔢 Zählend</span>
                <span className="text-[8px] font-normal lowercase opacity-85">(einzeln abgezählt)</span>
              </button>

              <button
                onClick={() => rateRepresentation(false, 'counting')}
                className="py-3 px-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded-xl font-bold text-[10px] uppercase leading-tight transition-all flex flex-col items-center justify-center gap-1 shadow-xs"
              >
                <span>❌ Falsch</span>
                <span className="text-[8px] font-normal lowercase opacity-85">(schätzungsfehler / fail)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESULT PHASE */}
      {phase === 'result' && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-md max-w-2xl mx-auto space-y-6 text-center">
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle size={36} />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-800">Auswertung Schulanfangsdiagnose</h3>
            <p className="text-xs text-slate-500 font-sans">Schulstufe 1: Erstes Vorwissen & Mathematische Basiskonzepte</p>
          </div>

          {/* STATS TILES */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-100 text-left">
              <span className="text-[10px] uppercase font-black tracking-wider text-amber-800 block">1. Buchstaben</span>
              <p className="text-lg font-black mt-1 text-amber-900 font-mono">
                {lettersKnown} / {ALPHABET_SELECTION.length} <small className="text-xs font-normal">bekannt</small>
              </p>
              <p className="text-[10px] text-slate-400 mt-1 font-sans">
                ({lettersSounded} lautiert, {lettersNamedOnly} benannt)
              </p>
            </div>

            <div className="p-4 bg-orange-50/40 rounded-2xl border border-orange-100 text-left">
              <span className="text-[10px] uppercase font-black tracking-wider text-orange-800 block">2. Mengen & Zahlen</span>
              <p className="text-lg font-black mt-1 text-orange-900 font-mono">
                {conceptsCorrect} / {MATH_CONCEPT_ITEMS.length} <small className="text-xs font-normal">richtig</small>
              </p>
              <p className="text-[10px] text-slate-400 mt-1 font-sans">
                Vergleich & Teilmengen-Check
              </p>
            </div>

            <div className="p-4 bg-red-50/40 rounded-2xl border border-red-100 text-left">
              <span className="text-[10px] uppercase font-black tracking-wider text-red-800 block">3. Zahlenbilder</span>
              <p className="text-lg font-black mt-1 text-red-900 font-mono">
                {repsCorrect} / {REPRESENTATION_ITEMS.length} <small className="text-xs font-normal">erkannt</small>
              </p>
              <p className="text-[10px] text-slate-400 mt-1 font-sans">
                {repsSubitized} mal Simultan (Subitizing)
              </p>
            </div>
          </div>

          {/* PEDAGOGICAL SUMMARY BOX */}
          <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl text-left space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block border-b pb-1">
              Pädagogische Einordnung
            </span>
            <div className="text-xs leading-relaxed text-slate-600 font-sans space-y-1.5">
              <p className="flex items-center gap-1.5 font-bold text-slate-800">
                {hasOverallNeed ? (
                  <span className="text-amber-600">Weiter beobachten und gezielt unterstützen</span>
                ) : (
                  <span className="text-emerald-700">✓ Altersgemäßes, stabiles Fundament</span>
                )}
              </p>
              <p>
                {hasLetterNeed ? (
                  "• Das Kind kennt erst wenige Buchstaben und benötigt gezielte Unterstützung beim Aufbau der Graphem-Phonem-Korrespondenz (Buchstabenerwerb)."
                ) : (
                  "• Gutes buchstabenbezogenes Vorwissen vorhanden, Lautzuordnung gelingt stabil."
                )}
              </p>
              <p>
                {hasMathNeed ? (
                  "• Unsicherheiten beim Erfassen strukturierter Zahlenbilder und bei Mengenvergleichen deuten auf Schwächen im vorschulischen Zahlbegriff hin. Verstärktes handelndes Lernen mit Anschauungsmaterial (z.B. Rechenrabe Trax, Plättchen) empfohlen."
                ) : (
                  "• Solide mathematische Vorläuferfertigkeiten. Das Mengen- und Zählverständnis sowie das Erfassen strukturierter Zahlenbilder sind bereits altersgemäß gefestigt."
                )}
              </p>
            </div>
          </div>

          {/* OBSERVATIONS AND COMMENTS */}
          <div className="text-left space-y-2">
            <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1">
              Beobachtungsnotiz der Lehrperson (z.B. Rechenrabe Trax Bezug, Handgebrauch, etc.)
            </label>
            <textarea
              value={kommentar}
              onChange={e => setKommentar(e.target.value)}
              placeholder="z.B. Kind nutzt Finger zum Abzählen, Würfelbilder 4 und 5 gelingen simultan. Bezug zu Rechenrabe Trax herstellen..."
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs focus:outline-none focus:border-amber-500 font-sans leading-relaxed"
            />
          </div>

          {/* FOOTER ACTIONS */}
          <div className="flex gap-3 justify-end pt-3 border-t">
            <button
              onClick={handleReset}
              className="px-6 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
            >
              Test wiederholen
            </button>
            <button
              onClick={handleSave}
              className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/10 transition-all flex items-center gap-1.5"
            >
              <Save size={14} /> Ergebnis speichern & schließen
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Test17Anfangsdiagnostik;
