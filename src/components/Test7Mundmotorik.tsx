import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, RotateCcw, Check, X, Save, ArrowLeft, Info, AlertOctagon
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

interface MotorTask {
  id: number;
  category: 'Lippenmotorik' | 'Zungenmotorik' | 'Pusten / Atmung' | 'Artikulation-Kritisch';
  title: string;
  instruction: string; // Action for teacher to demo and look for
  aim: string; // What indicates "Unauffällig"
  wordToShow?: string; // For articulation repeat words
}

const MOTORIK_TASKS: MotorTask[] = [
  // 1. Lippenmotorik
  { 
    id: 1, 
    category: 'Lippenmotorik', 
    title: "Lächeln (Breitziehen)", 
    instruction: "Zeige dem Kind ein breites Lächeln, bei dem man die geschlossenen Zähne sieht (oder lasse es 'Käse' sagen).", 
    aim: "Lippen werden symmetrisch weit nach außen gezogen, kein Zittern der Muskulatur." 
  },
  { 
    id: 2, 
    category: 'Lippenmotorik', 
    title: "Kussmund (Lippen runden)", 
    instruction: "Lasse das Kind die Lippen spitzen wie zu einem Kuss (oder sagen 'Ooooh/Uuuuh').", 
    aim: "Symmetrische Rundung ohne Ausweichen des Unterkiefers." 
  },
  { 
    id: 3, 
    category: 'Lippenmotorik', 
    title: "Zappelmund (Wechsel)", 
    instruction: "Lasse das Kind zügig im Wechsel breit grinsen und die Lippen runden.", 
    aim: "Schneller, rhythmischer Koordinationswechsel gelingt problemlos." 
  },
  // 2. Zungenmotorik
  { 
    id: 4, 
    category: 'Zungenmotorik', 
    title: "Zungenpendel (Mundwinkel)", 
    instruction: "Lasse das Kind den Mund weit öffnen. Die Zungenspitze soll zügig im Wechsel den linken und rechten Mundwinkel berühren.", 
    aim: "Symmetrisches Hin- und Herwandern ohne Mitbewegung des Unterkiefers." 
  },
  { 
    id: 5, 
    category: 'Zungenmotorik', 
    title: "Zunge hoch / tief", 
    instruction: "Die Zunge soll weit nach oben Richtung Nasenspitze und nach unten zum Kinn gestreckt werden.", 
    aim: "Zunge wandert kontrolliert, hebt sich ab ohne Zungenbandverhärtung." 
  },
  { 
    id: 6, 
    category: 'Zungenmotorik', 
    title: "Zähneputzen (Kreisen)", 
    instruction: "Das Kind kreist bei geschlossenem Mund mit der Zunge vor den Zähnen (Kreisen im Vorhof).", 
    aim: "Flüssige Drehbewegung über mehrere Runden hinweg gelingt beidseitig." 
  },
  // 3. Pusten / Atmung
  { 
    id: 7, 
    category: 'Pusten / Atmung', 
    title: "Dauerpusten (F-Ausatmung)", 
    instruction: "Das Kind atmet tief durch die Nase ein und atmet möglichst lange und gleichmäßig auf den Reibelaut 'f...' aus.", 
    aim: "Stabiler, konstanter Luftstrom für mindestens 4-5 Sekunden." 
  },
  { 
    id: 8, 
    category: 'Pusten / Atmung', 
    title: "Explosivpusten (Kerze)", 
    instruction: "Das Kind soll kräftig und impulsiv pusten, so als würde es eine Geburtstagskerze auspusten.", 
    aim: "Kräftiger, gerichteter Atemstoß, Mundspannung baut sich rasch auf." 
  },
  // 4. Artikulation
  { 
    id: 9, 
    category: 'Artikulation-Kritisch', 
    title: "Schnecke (s / sch)", 
    instruction: "Lasse das Kind das Wort 'Schnecke' laut und deutlich nachsprechen.", 
    aim: "Präzise Unterscheidung von s und sch Lauten ohne Lispeln.", 
    wordToShow: "Schnecke" 
  },
  { 
    id: 10, 
    category: 'Artikulation-Kritisch', 
    title: "Kaktus (k / t)", 
    instruction: "Lasse das Kind das Wort 'Kaktus' laut nachsprechen.", 
    aim: "Klarer Kelt- und T-Abgleich, kein Ersetzen ('Taktus' oder 'Kakkus').", 
    wordToShow: "Kaktus" 
  },
  { 
    id: 11, 
    category: 'Artikulation-Kritisch', 
    title: "Raupe (r-Laut)", 
    instruction: "Lasse das Kind das Wort 'Raupe' nachsprechen.", 
    aim: "Klares Reibelaut-r oder Zungenr, kein Auslassen oder Ersetzen durch l ('Laupe').", 
    wordToShow: "Raupe" 
  },
  { 
    id: 12, 
    category: 'Artikulation-Kritisch', 
    title: "Herbstwind (Konsonantenhäufung)", 
    instruction: "Lasse das Kind das Wort 'Herbstwind' laut nachsprechen.", 
    aim: "Keine Silbenunterdrückung oder Buchstabendreher bei 'rbstwn'-Häufung.", 
    wordToShow: "Herbstwind" 
  }
];

export const Test7Mundmotorik: React.FC<TestProps> = ({
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
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, boolean>>({}); // maps taskIdx to true (Unauffällig) or false (Auffällig)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [customNote, setCustomNote] = useState('');

  const handleStartTest = () => {
    setAnswers({});
    setCurrentIndex(0);
    setPhase('test');
  };

  const handleScoreTask = (unauffaellig: boolean) => {
    setAnswers(prev => ({
      ...prev,
      [currentIndex]: unauffaellig
    }));

    if (currentIndex + 1 < MOTORIK_TASKS.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setPhase('result');
    }
  };

  const handleBackToTask = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Calculations
  const totalCorrect = Object.values(answers).filter(Boolean).length;
  const issuesCount = MOTORIK_TASKS.length - totalCorrect;
  // If at least 1 muscular group is marked as "Auffällig", there's an issue
  const foerderbedarf = issuesCount >= 1;

  const getCategoryStats = () => {
    const stats: Record<string, { total: number; correct: number }> = {
      'Lippenmotorik': { total: 0, correct: 0 },
      'Zungenmotorik': { total: 0, correct: 0 },
      'Pusten / Atmung': { total: 0, correct: 0 },
      'Artikulation-Kritisch': { total: 0, correct: 0 }
    };

    MOTORIK_TASKS.forEach((t, idx) => {
      stats[t.category].total += 1;
      if (answers[idx] === true) {
        stats[t.category].correct += 1;
      }
    });

    return stats;
  };

  const handleSaveResult = () => {
    const catStats = getCategoryStats();
    const strStats = Object.entries(catStats)
      .map(([k,v]) => `${k}: ${v.correct}/${v.total} unauffällig`)
      .join(', ');

    const noteText = `Mundmotorik & Lautbildung Screening (Stufe ${grade}). ` +
      `Sicher gelungen: ${totalCorrect}/12 Übungen unauffällig. ` +
      `Beobachtung nach Kategorien: ${strStats}.` +
        (grade >= 3 && foerderbedarf ? `\nHINWEIS: Wiederholt beobachtete Artikulationsauffälligkeiten können behutsam mit den Erziehungsberechtigten besprochen und bei Bedarf fachlich abgeklärt werden. Einzelne Mundbewegungsübungen sind nicht diagnostisch.` : '') +
      (customNote ? `\nBeobachtung: ${customNote}` : '');

    onSave({
      testId: 'live-mundmotorik',
      score: totalCorrect,
      foerderbedarf,
      note: noteText,
      meta: {
        type: 'mundmotorik',
        grade,
        totalCorrect,
        issuesCount,
        categoryStats: catStats,
        answers: MOTORIK_TASKS.map((t, idx) => ({
          title: t.title,
          category: t.category,
          correct: !!answers[idx]
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
              <span className="inline-block px-2.5 py-0.5 bg-rose-100 text-rose-700 text-[0.625rem] font-bold uppercase tracking-widest rounded-full mb-1">
                Artikulation & Mundmotorik
              </span>
              <h3 className="text-xl font-extrabold text-slate-800">👅 Mundmotorik & Lautbildung</h3>
              <p className="text-xs text-slate-500 mt-1">Screening zur Koordinationsprüfung von Lippen, Zunge und auditiver Artikulation.</p>
            </div>
            <button onClick={onClose} className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition-all">
              Schließen
            </button>
          </div>

          <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex gap-3 text-xs text-rose-900 leading-relaxed font-sans">
            <Info size={18} className="text-rose-500 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Ablauf:</strong> Sie machen die motorische Übung am Tisch kurz vor. Das Kind ahmt diese nach. 
              Anschließend diktieren Sie 4 Artikulationswörter mit kritischen Lautgruppen (z.B. s/sch, r) zum Nachsprechen. 
              Bewerten Sie flüssiges Gelingen mit "Unauffällig" oder muskuläre Schwäche mit "Auffällig/Mühe".
            </div>
          </div>

          {/* Stufen-Auswahl */}
          <div className="space-y-3">
            <label className="block text-[0.6875rem] font-black uppercase tracking-wider text-slate-400 font-sans">Schulstufen-Differenzierung & Bewertungsschwellen</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                    grade === g 
                      ? 'bg-rose-600 border-rose-700 text-white font-extrabold shadow-sm' 
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-sm font-extrabold font-sans">Stufe {g}</span>
                  <span className="text-[0.625rem] font-bold opacity-80 mt-1 uppercase tracking-wider leading-none">
                    {g <= 2 ? 'Leichte Toleranz' : 'Keine Toleranz ⚠️'}
                  </span>
                  <span className="text-[0.5625rem] opacity-75 font-normal mt-0.5 leading-relaxed font-sans">
                    {g <= 2 ? 'Kleine Unsicherheiten sind häufig' : 'Auffälligkeiten im Verlauf beobachten'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Warning regarding grade 3 and 4 early observation */}
          {grade >= 3 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-2.5 text-xs text-amber-900 font-sans font-medium">
              <span className="text-lg leading-none">⚠️</span>
              <div>
                <strong>Wichtiger Hinweis:</strong> Diese kurze Unterrichtsbeobachtung erlaubt keine Aussage über motorische oder logopädische Störungen.
                Wiederholt beobachtete Schwierigkeiten sollten konkret dokumentiert und mit den Erziehungsberechtigten bzw. geeigneten Fachpersonen besprochen werden.
              </div>
            </div>
          )}

          {/* Student details */}
          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between">
            <div>
              <span className="block text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">Kind am Tisch</span>
              <span className="text-sm font-extrabold text-slate-800">{student?.vorname} {student?.nachname}</span>
            </div>
            <div className="text-right">
              <span className="block text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">Screening-Inhalt</span>
              <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-sans">12 standardisierte Übungen</span>
            </div>
          </div>

          <button
            onClick={handleStartTest}
            className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-2xl shadow-sm hover:shadow transition-all text-center flex items-center justify-center gap-2 text-md"
          >
            <Play size={18} fill="white" /> Screening jetzt starten
          </button>
        </div>
      )}

      {/* 2. ACTIVE TESTING CARDS */}
      {phase === 'test' && (
        <div className="flex flex-col">
          <div className="bg-gradient-to-r from-rose-600 to-pink-700 text-white p-5 flex justify-between items-center">
            <div>
              <span className="text-[0.625rem] font-black uppercase tracking-wider block opacity-75">Sprechwerkzeug-Diagnostik • Übung {currentIndex + 1} von {MOTORIK_TASKS.length}</span>
              <h4 className="font-extrabold text-white text-md">Kind macht nach: {student?.vorname}</h4>
            </div>
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="text-xs bg-white/15 hover:bg-white/25 border border-white/20 text-white px-3.5 py-1.5 rounded-xl transition-all"
            >
              Abbrechen
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-6 bg-slate-50">
            
            <div className="flex justify-between items-center">
              <span className="text-xs font-extrabold text-rose-700 bg-rose-50 px-3 py-1 rounded-full uppercase tracking-wider">
                Bereich: {MOTORIK_TASKS[currentIndex].category}
              </span>
              {currentIndex > 0 && (
                <button
                  type="button"
                  onClick={handleBackToTask}
                  className="text-xs text-slate-500 flex items-center gap-1.5 hover:text-slate-800"
                >
                  <ArrowLeft size={13} /> Vorherigen Schritt korrigieren
                </button>
              )}
            </div>

            {/* Instruction board card for the teacher */}
            <div className="p-6 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm text-center relative overflow-hidden">
              <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-500 text-[0.625rem] font-black uppercase tracking-wider rounded">
                Übung: {MOTORIK_TASKS[currentIndex].title}
              </span>
              
              {/* If it has repeat word, show word very large for the classroom child */}
              {MOTORIK_TASKS[currentIndex].wordToShow ? (
                <div className="space-y-2 py-2">
                  <span className="text-[0.625rem] text-slate-400 uppercase font-black block tracking-widest">Kind spricht laut nach:</span>
                  <h3 className="text-4xl font-extrabold text-rose-600 tracking-wide font-sans">
                    "{MOTORIK_TASKS[currentIndex].wordToShow}"
                  </h3>
                </div>
              ) : (
                <p className="text-md sm:text-lg font-bold text-slate-800 leading-relaxed font-sans max-w-md mx-auto py-2">
                  {MOTORIK_TASKS[currentIndex].instruction}
                </p>
              )}

              {/* Aim criteria target */}
              <div className="pt-3 border-t border-slate-100 text-left space-y-1">
                <span className="text-[0.5625rem] font-black text-rose-700 uppercase tracking-widest block">Kriterium für "Unauffällig":</span>
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                  {MOTORIK_TASKS[currentIndex].aim}
                </p>
              </div>
            </div>

            {/* Assessment triggers */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleScoreTask(false)}
                className="py-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold rounded-2xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <X size={18} /> Auffällig / Mühe
              </button>
              <button
                onClick={() => handleScoreTask(true)}
                className="py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl transition-all flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg"
              >
                <Check size={18} /> Unauffällig
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 3. TEST DIAGNOSTIC SUMMARY PROFILE */}
      {phase === 'result' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-400 block uppercase">Motilitätsschnitt</span>
              <h3 className="text-xl font-extrabold text-slate-800">📊 Mundmotorik Protokoll</h3>
            </div>
            <button
              onClick={handleStartTest}
              className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1"
            >
              <RotateCcw size={12} /> Test wiederholen
            </button>
          </div>

          {/* Overview columns card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="p-4 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
              <span className="block text-[0.625rem] font-bold text-slate-400 uppercase font-sans">Sicheres Gelingen</span>
              <span className="block text-2xl font-black text-slate-900 mt-1 font-mono">
                {totalCorrect} <span className="text-sm font-medium text-slate-400">/ 12</span>
              </span>
              <span className="text-[0.625rem] text-slate-405 block mt-0.5">Übungen fehlerfrei geglückt</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
              <span className="block text-[0.625rem] font-bold text-slate-400 uppercase font-sans">Auffälligkeiten</span>
              <span className="block text-2xl font-black text-rose-600 mt-1 font-mono">
                {issuesCount}
              </span>
              <span className="text-[0.625rem] text-rose-455 block mt-0.5">Bereiche mit Mühe</span>
            </div>

            <div className={`p-4 rounded-2xl text-center shadow-sm border ${
              foerderbedarf ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <span className="block text-[0.625rem] font-black uppercase text-slate-500">Pädagogische Sprechbeobachtung</span>
              <span className="block text-md font-bold mt-1">
                {totalCorrect >= 11 ? 'Sicher beobachtet' : totalCorrect >= 9 ? 'Weiter beobachten' : 'Gezielt unterstützen'}
              </span>
              <span className="text-[0.625rem] opacity-75 block mt-0.5">{foerderbedarf ? 'Abklärung ratsam' : 'Altersgerechte Beweglichkeit'}</span>
            </div>

          </div>

          {/* Stufe 3-4 logopedic alert warning block */}
          {grade >= 3 && foerderbedarf && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex gap-3 text-xs text-rose-900 leading-relaxed font-sans font-semibold">
              <AlertOctagon size={22} className="text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-rose-800 font-extrabold uppercase text-[0.6875rem] tracking-wider mb-1">Dringender Abklärungsbedarf!</strong>
                Das Kind geht in die {grade}. Klasse. Auffälligkeiten der Mundmotorik oder Artikulation sollten ab der 3. Schulstufe nicht mehr toleriert werden, sondern bedürfen einer zeitnahen logopädischen / fachärztlichen Diagnostik am Tisch!
              </div>
            </div>
          )}

          {/* Category breakdown grids */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest font-sans">Kategorie-Auswertungen</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(getCategoryStats()).map(([k,v]) => {
                const isCatCorrect = v.correct === v.total;
                return (
                  <div key={k} className={`p-4 border rounded-2xl flex flex-col justify-between shadow-sm bg-white ${
                    isCatCorrect ? 'border-emerald-100 bg-emerald-50/10' : 'border-rose-100 bg-rose-50/10'
                  }`}>
                    <span className="text-[0.5625rem] font-black uppercase text-slate-450 tracking-wider leading-none">{k}</span>
                    <div className="flex justify-between items-end mt-2">
                      <span className="text-base font-black font-mono text-slate-800">{v.correct} / {v.total}</span>
                      <span className="text-xs font-semibold">{isCatCorrect ? '✅ Intakt' : '⚠️ Mühe'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed list and checks */}
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest font-sans">Einzelübungsprotokoll</h4>
            <div className="p-4 bg-white border border-slate-200 rounded-2xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {MOTORIK_TASKS.map((t, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center font-sans">
                  <div>
                    <strong className="text-slate-800">{t.title}</strong>
                    <span className="block text-[0.5625rem] text-slate-400 mt-0.5">{t.category}</span>
                  </div>
                  <span>{answers[idx] ? '✅' : '❌'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Observations comments */}
          <div className="space-y-2">
            <label className="block text-[0.6875rem] font-black uppercase tracking-wider text-slate-400">Lehrbeobachtungen (Optional)</label>
            <textarea
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="z.B. Lispelt leicht beim 's-Laut', sehr unruhiger Zungenkörper, weicht oft mit dem Kopf aus..."
              className="w-full text-xs p-3 bg-white border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 h-16 resize-none"
            />
          </div>

          {/* Actions footer */}
          <div className="flex gap-3 justify-end col-span-3">
            <button
              onClick={() => setPhase('setup')}
              className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-all"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSaveResult}
              className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-2xl text-xs transition-all shadow-sm flex items-center gap-1.5"
            >
              <Save size={14} /> Testergebnis speichern
            </button>
          </div>
        </div>
      )}

      {/* CANCEL ALERT DIALOG */}
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
              <h4 className="text-md font-extrabold text-slate-800">Screening abbrechen?</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Sind Sie sicher, dass Sie den Mundmotoriktest abbrechen wollen? Sämtliche Antworten dieses Durchgangs gehen unwiderruflich verloren.
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

    </div>
  );
};
