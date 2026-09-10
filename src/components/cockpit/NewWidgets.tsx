import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { TableCheckWidget } from './widgets/TableCheckWidget';
import { FairCallWidget } from './widgets/FairCallWidget';
import { LernwoerterStudioWidget } from './widgets/LernwoerterStudioWidget';
import { StoryEmojisWidget } from './widgets/StoryEmojisWidget';
import { useApp } from '../../context/AppContext';
import { 
  Backpack, 
  Trash2, 
  Plus, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Filter, 
  Play, 
  Smile, 
  X,
  Volume2,
  ListFilter,
  CheckCircle,
  HelpCircle,
  BookOpen,
  Edit2
} from 'lucide-react';

// ========================================================
// 31. WIDGET: EINMALEINS-TRAINER (MultitrainerWidgetContent)
// ========================================================
export const MultitrainerWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const [num1, setNum1] = useState(2);
  const [num2, setNum2] = useState(2);
  const [options, setOptions] = useState<number[]>([]);
  const [feedback, setFeedback] = useState("Rechne das Ergebnis aus!");

  const generate = useCallback(() => {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    setNum1(a);
    setNum2(b);
    const correct = a * b;
    let newOptions = [correct, correct + 2, correct - 2, correct + 10];
    newOptions = newOptions.sort(() => Math.random() - 0.5);
    setOptions(newOptions);
    setFeedback("Rechne das Ergebnis aus!");
  }, []);

  useEffect(() => { generate(); }, [generate]);

  const guess = (v: number) => {
    if (v === num1 * num2) {
      setFeedback("🎉 Richtig! Gut gemacht.");
      setTimeout(generate, 1500);
    } else {
      setFeedback("⚠️ Das stimmt leider nicht ganz.");
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-2.5 justify-between select-none min-h-0 overflow-y-auto overflow-x-hidden">
      <div className="shrink-0 flex justify-between items-center mb-1">
        <div className="flex flex-col">
          <span className={`text-[9px] font-black uppercase tracking-widest ${currentIsLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
            ✖️ Einmaleins-Trainer
          </span>
          <span className="text-[7.5px] font-mono opacity-80 font-black">Multiplikation bis 100</span>
        </div>
      </div>
      <div className="flex-grow flex flex-col justify-center items-center py-2 gap-2 min-h-0">
         <span className="text-3xl font-black">{num1} × {num2} = ?</span>
         <div className="grid grid-cols-2 gap-2 w-full mt-2">
            {options.map((opt, i) => (
              <button key={i} onClick={() => guess(opt)} className="py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-lg cursor-pointer">
                {opt}
              </button>
            ))}
         </div>
      </div>
      <p className="shrink-0 text-[7px] font-extrabold text-blue-500 text-center truncate mt-0.5">{feedback}</p>
    </div>
  );
};

// ========================================================
// 32. WIDGET: GELDBÖRSE (MoneycalcWidgetContent)
// ========================================================
export const MoneycalcWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const [activeTab, setActiveTab] = useState<'count' | 'quiz'>('count');
  const [total, setTotal] = useState<number>(0);
  const [addedItems, setAddedItems] = useState<Array<{ id: number, value: number, label: string, isBill: boolean, color: string }>>([]);
  
  // Quiz states
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [quizTarget, setQuizTarget] = useState<number>(10);
  const [feedback, setFeedback] = useState<string>("Zähle Geld oder spiele das Quiz! 💶");
  const [score, setScore] = useState<number>(0);
  const [quizSolved, setQuizSolved] = useState<boolean>(false);

  // Counter to give unique ids to added coins/bills
  const idCounter = useRef(0);

  // Generate a new quiz challenge
  const startNewQuiz = useCallback((diff = difficulty) => {
    let target = 0;
    if (diff === 'easy') {
      // Round whole euros
      const choices = [3, 5, 8, 10, 12, 15, 20, 25, 40, 50, 75, 100, 150, 200, 300, 500];
      target = choices[Math.floor(Math.random() * choices.length)];
      setFeedback(`🛒 Zahle passend: Lege genau ${target} € auf den Ladentisch!`);
    } else if (diff === 'medium') {
      // simple decimals like x,50
      const euros = Math.floor(Math.random() * 45) + 2;
      const cents = Math.random() > 0.5 ? 0.5 : 0.0;
      target = euros + cents;
      const formatted = target.toFixed(2).replace('.', ',');
      setFeedback(`🛒 Zahle passend: Lege genau ${formatted} € auf den Ladentisch!`);
    } else {
      // complex decimals
      const euros = Math.floor(Math.random() * 145) + 5;
      const cents = (Math.floor(Math.random() * 99) + 1) / 100;
      target = euros + cents;
      const formatted = target.toFixed(2).replace('.', ',');
      setFeedback(`🛒 Zahle passend: Lege genau ${formatted} € auf den Ladentisch!`);
    }

    setQuizTarget(parseFloat(target.toFixed(2)));
    setTotal(0);
    setAddedItems([]);
    setQuizSolved(false);
  }, [difficulty]);

  useEffect(() => {
    if (activeTab === 'quiz') {
      startNewQuiz(difficulty);
    }
  }, [activeTab, difficulty, startNewQuiz]);

  const handleAddItem = (val: number, label: string, isBill: boolean, color: string) => {
    if (quizSolved && activeTab === 'quiz') return;
    
    idCounter.current += 1;
    const newItem = {
      id: idCounter.current,
      value: val,
      label,
      isBill,
      color
    };
    
    setAddedItems(prev => [...prev, newItem]);
    setTotal(t => parseFloat((t + val).toFixed(2)));

    // play dynamic click audio
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(isBill ? 330 : 660, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      }
    } catch {}
  };

  const handleRemoveItem = (id: number, val: number) => {
    if (quizSolved && activeTab === 'quiz') return;
    setAddedItems(prev => prev.filter(item => item.id !== id));
    setTotal(t => parseFloat(Math.max(0, t - val).toFixed(2)));
  };

  const checkQuizAnswer = () => {
    const diff = Math.abs(total - quizTarget);
    if (diff < 0.001) {
      setFeedback("🎉 Fantastisch! Du hast den Betrag exakt passend bezahlt! ⭐");
      setScore(s => s + 10);
      setQuizSolved(true);
      
      // confetti
      import('canvas-confetti').then(m => m.default({ particleCount: 30, spread: 25 }));
      
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(523.25, ctx.currentTime);
          gain.gain.setValueAtTime(0.05, ctx.currentTime);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.25);
        }
      } catch {}
    } else {
      const formattedTotal = total.toFixed(2).replace('.', ',');
      const formattedTarget = quizTarget.toFixed(2).replace('.', ',');
      if (total > quizTarget) {
        setFeedback(`⚠️ Zuviel gegeben! Du hast ${formattedTotal} € aufgelegt, gesucht waren aber ${formattedTarget} €!`);
      } else {
        setFeedback(`⚠️ Zu wenig! Es fehlen noch ${(quizTarget - total).toFixed(2).replace('.', ',')} € (aufgelegt: ${formattedTotal} € / gesucht: ${formattedTarget} €).`);
      }
      
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(130, ctx.currentTime);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.2);
        }
      } catch {}
    }
  };

  const resetAll = () => {
    setTotal(0);
    setAddedItems([]);
    setQuizSolved(false);
    if (activeTab === 'quiz') {
      startNewQuiz(difficulty);
    } else {
      setFeedback("Zähle Geld oder spiele das Quiz! 💶");
    }
  };

  // Euro units definitions
  const bills = [
    { value: 500, label: "500 €", color: "bg-purple-600/20 text-purple-700 border-purple-500 hover:bg-purple-600/30 dark:bg-purple-950/40 dark:text-purple-300" },
    { value: 200, label: "200 €", color: "bg-yellow-600/20 text-yellow-700 border-yellow-500 hover:bg-yellow-600/30 dark:bg-yellow-950/40 dark:text-yellow-300" },
    { value: 100, label: "100 €", color: "bg-emerald-600/20 text-emerald-700 border-emerald-500 hover:bg-emerald-600/30 dark:bg-emerald-950/40 dark:text-emerald-300" },
    { value: 50, label: "50 €", color: "bg-orange-600/20 text-orange-700 border-orange-500 hover:bg-orange-600/30 dark:bg-orange-950/40 dark:text-orange-300" },
    { value: 20, label: "20 €", color: "bg-blue-600/20 text-blue-700 border-blue-500 hover:bg-blue-600/30 dark:bg-blue-950/40 dark:text-blue-300" },
    { value: 10, label: "10 €", color: "bg-rose-600/20 text-rose-700 border-rose-500 hover:bg-rose-600/30 dark:bg-rose-950/40 dark:text-rose-300" },
    { value: 5, label: "5 €", color: "bg-slate-600/20 text-slate-700 border-slate-500 hover:bg-slate-600/30 dark:bg-slate-900/40 dark:text-slate-300" }
  ];

  const coins = [
    { value: 2, label: "2 €", color: "border-yellow-600 bg-amber-100 text-yellow-800 font-black", radiusClass: "w-7 h-7 text-[8px]" },
    { value: 1, label: "1 €", color: "border-yellow-600 bg-slate-100 text-yellow-800 font-black", radiusClass: "w-6.5 h-6.5 text-[8px]" },
    { value: 0.5, label: "50c", color: "border-yellow-500 bg-yellow-105 bg-amber-50 text-amber-700 font-bold", radiusClass: "w-6 h-6 text-[7.5px]" },
    { value: 0.2, label: "20c", color: "border-yellow-500 bg-yellow-105 bg-amber-50 text-amber-700 font-bold", radiusClass: "w-5.5 h-5.5 text-[7.5px]" },
    { value: 0.1, label: "10c", color: "border-yellow-500 bg-yellow-105 bg-amber-50 text-amber-700 font-bold", radiusClass: "w-5 h-5 text-[7px]" },
    { value: 0.05, label: "5c", color: "border-orange-600 bg-orange-100 text-orange-800 font-bold", radiusClass: "w-4.5 h-4.5 text-[6.5px]" },
    { value: 0.02, label: "2c", color: "border-orange-600 bg-orange-100 text-orange-800 font-bold", radiusClass: "w-4 h-4 text-[6px]" },
    { value: 0.01, label: "1c", color: "border-orange-600 bg-orange-100 text-orange-800 font-bold", radiusClass: "w-3.5 h-3.5 text-[5.5px]" }
  ];

  return (
    <div className="flex flex-col h-full w-full p-2.5 justify-between select-none min-h-0 overflow-y-auto overflow-x-hidden">
      
      {/* Top Header Row with game mode selections */}
      <div className="shrink-0 flex justify-between items-center mb-1.5 border-b border-slate-200 dark:border-zinc-800 pb-1.5">
        <div className="flex flex-col">
          <span className={`text-[9px] font-black uppercase tracking-widest ${currentIsLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
            💶 Taschengeld-Zähler
          </span>
          <span className="text-[7.5px] font-mono opacity-80 font-black">Euro & Cent spielerisch lernen</span>
        </div>
        
        {/* Count/Quiz Tabs */}
        <div className="flex gap-1">
          <button
            onClick={() => { setActiveTab('count'); resetAll(); }}
            className={`px-1.5 py-0.5 rounded text-[7.5px] font-black cursor-pointer transition-colors ${
              activeTab === 'count' ? 'bg-indigo-500 text-white shadow' : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-neutral-400'
            }`}
          >
            Spardose 🐷
          </button>
          <button
            onClick={() => { setActiveTab('quiz'); }}
            className={`px-1.5 py-0.5 rounded text-[7.5px] font-black cursor-pointer transition-colors ${
              activeTab === 'quiz' ? 'bg-indigo-500 text-white shadow' : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-neutral-400'
            }`}
          >
            Einkaufs-Quiz 🛒
          </button>
        </div>
      </div>

      {/* Quiz Difficulty Level Bar */}
      {activeTab === 'quiz' && (
        <div className={`p-1 rounded-xl border shrink-0 flex items-center justify-between text-[7px] font-black mb-1 bg-slate-100/50 dark:bg-black/10 border-slate-200/50 dark:border-white/5`}>
          <div className="flex gap-0.5 items-center">
            <span className="text-slate-400 mr-1 uppercase">Quiz-Level:</span>
            {(['easy', 'medium', 'hard'] as const).map(diff => (
              <button
                key={diff}
                onClick={() => { setDifficulty(diff); startNewQuiz(diff); }}
                className={`px-1.5 py-0.5 rounded text-[6.5px] font-extrabold cursor-pointer transition-colors ${
                  difficulty === diff
                    ? 'bg-indigo-500 text-white'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
                }`}
              >
                {diff === 'easy' ? 'Einfach (Ganzzahl)' : diff === 'medium' ? 'Mittel (einfache Cent)' : 'Schwer (Dezimal)'}
              </button>
            ))}
          </div>
          <span className="text-[7px] uppercase font-mono bg-teal-500 text-white px-1.5 rounded">Score: {score}</span>
        </div>
      )}

      {/* Main Panel */}
      <div className="flex-grow flex flex-col justify-between py-1 gap-1.5 min-h-0">
        
        {/* Centered Total Wallet Board */}
        <div className={`flex flex-col items-center justify-center py-2.5 rounded-2xl border transition-all shrink-0 ${
          currentIsLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/50 border-white/5'
        }`}>
          {activeTab === 'quiz' && (
            <div className="text-[7px] font-mono text-indigo-400 font-extrabold uppercase leading-none mb-0.5">
              Gesucht: {quizTarget.toFixed(2).replace('.', ',')} €
            </div>
          )}
          <span className="text-2xl font-black text-emerald-500 tracking-tight leading-none">
            {total.toFixed(2).replace('.', ',')} €
          </span>
          <span className="text-[6.5px] uppercase font-bold text-slate-400 tracking-wider mt-1">
            {activeTab === 'quiz' ? 'Aufgelegtes Geld' : 'Inhalt deiner Geldbörse'}
          </span>
        </div>

        {/* Checkout Table Desk: Displays what items have been added, with click-to-remove feature */}
        <div className={`h-11 rounded-xl border border-dashed flex flex-wrap gap-1 p-1 items-center justify-center overflow-y-auto shrink-0 ${
          addedItems.length === 0 ? 'border-slate-300 dark:border-zinc-800' : 'border-emerald-500/50 bg-emerald-500/5'
        }`}>
          {addedItems.length === 0 ? (
            <span className="text-[7px] font-mono font-bold text-slate-400 uppercase">
              {activeTab === 'quiz' ? 'Lege Geld auf den Tresen...' : 'Deine Geldbörse ist leer. Füge Münzen/Scheine hinzu!'}
            </span>
          ) : (
            addedItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleRemoveItem(item.id, item.value)}
                title="Tippe zum Entfernen"
                className={`flex items-center justify-center p-0.5 font-bold transition-transform hover:scale-105 active:scale-95 cursor-pointer border ${
                  item.isBill 
                    ? 'w-10 h-5 text-[6.5px] rounded border-dashed' 
                    : 'w-6 h-6 rounded-full text-[6px] border-dashed'
                } ${item.color}`}
              >
                {item.label}
              </button>
            ))
          )}
        </div>

        {/* Euro Note & Coins Selections container */}
        <div className="flex flex-col gap-1.5 shrink-0">
          
          {/* Bills row */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[6.5px] uppercase font-bold text-slate-400 dark:text-zinc-500 leading-none mb-0.5">Scheine:</span>
            <div className="grid grid-cols-7 gap-1">
              {bills.map((bill) => (
                <button
                  key={bill.value}
                  onClick={() => handleAddItem(bill.value, bill.label, true, bill.color)}
                  className={`py-1 text-center font-black rounded border text-[8px] transition-all cursor-pointer transform hover:scale-102 active:scale-95 leading-none ${bill.color}`}
                >
                  {bill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Coins row */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[6.5px] uppercase font-bold text-slate-400 dark:text-zinc-500 leading-none mb-0.5">Münzen:</span>
            <div className="flex flex-wrap gap-1 justify-between items-center px-0.5">
              {coins.map((coin) => (
                <button
                  key={coin.value}
                  onClick={() => handleAddItem(coin.value, coin.label, false, coin.color)}
                  className={`rounded-full border-2 flex items-center justify-center transition-all cursor-pointer transform hover:scale-105 active:scale-90 leading-none shrink-0 ${coin.color} ${coin.radiusClass}`}
                >
                  {coin.label}
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Bottom control row */}
      <div className="shrink-0 flex gap-1 items-center mt-1.5 pt-1.5 border-t border-slate-200 dark:border-zinc-800">
        {activeTab === 'quiz' ? (
          <>
            <button
              onClick={checkQuizAnswer}
              disabled={quizSolved}
              className={`flex-grow py-1 rounded bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white font-black text-[8px] uppercase tracking-widest cursor-pointer transition-all active:scale-95`}
            >
              Betrag Bezahlen ✔
            </button>
            <button
              onClick={() => startNewQuiz(difficulty)}
              className="py-1 px-2 rounded bg-indigo-500 hover:bg-indigo-600 text-white font-black text-[8px] uppercase cursor-pointer"
            >
              Nächstes ➔
            </button>
          </>
        ) : (
          <button
            onClick={resetAll}
            className="w-full py-1 rounded bg-red-500 hover:bg-red-600 text-white font-black text-[8px] uppercase tracking-widest cursor-pointer transition-all active:scale-95 text-center"
          >
            Geldbörse Leeren 🗑️
          </button>
        )}
      </div>

      <p className="shrink-0 text-[7px] font-extrabold text-blue-500 text-center truncate mt-1">{feedback}</p>
    </div>
  );
};

// ========================================================
// 33. WIDGET: STORY-EMOJIS (StoryemojisWidgetContent)
// F26.3: Ruhiger, kreativer Schreib- & Erzählanlass
// ========================================================
export const StoryemojisWidgetContent: React.FC<{
  widget: any;
  currentIsLight: boolean;
  onUpdate?: (updates: { settings?: any; [key: string]: any }) => void;
  isFullscreen?: boolean;
}> = (props) => {
  return <StoryEmojisWidget {...props} />;
};

// ========================================================
// 34. WIDGET: ABC-SORTIERER (AbcorderWidgetContent)
// Konsolidiert in Lernwörter-Studio (Modus: alphabet)
// ========================================================
export const AbcorderWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ widget, currentIsLight }) => {
  return (
    <LernwoerterStudioWidget
      widget={widget}
      currentIsLight={currentIsLight}
      defaultMode="alphabet"
    />
  );
};

// ========================================================
// 35. WIDGET: PLANETARIUM (PlanetariumWidgetContent)
// ========================================================
export const PlanetariumWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const planets = [
    { name: "Sonne", color: "bg-yellow-400", desc: "Zentrum unseres Systems. Sie spendet uns Licht und Wärme.", emoji: "☀️", ageFactor: 0.00001, temp: "~5.500 °C", moonCount: 0 },
    { name: "Merkur", color: "bg-orange-300", desc: "Der sonnennächste und kleinste Planet. Hat keine Atmosphäre.", emoji: "🪨", ageFactor: 4.15, temp: "-170 bis 430 °C", moonCount: 0 },
    { name: "Venus", color: "bg-amber-200", desc: "Der heißeste Planet wegen seiner dichten Treibhaus-Atmosphäre.", emoji: "🟡", ageFactor: 1.62, temp: "ca. 460 °C", moonCount: 0 },
    { name: "Erde", color: "bg-blue-500", desc: "Unser Heimatplanet. Der einzige bekannte Himmelskörper mit flüssigem Wasser und Leben.", emoji: "🌍", ageFactor: 1, temp: "-89 bis 58 °C", moonCount: 1 },
    { name: "Mars", color: "bg-red-500", desc: "Der rote Planet. Sein felsiger Boden ist von rotem Eisenstaub bedeckt.", emoji: "🔴", ageFactor: 0.53, temp: "-130 bis 20 °C", moonCount: 2 },
    { name: "Jupiter", color: "bg-orange-600", desc: "Der größte Planet des Sonnensystems. Ein gigantischer Gasriese.", emoji: "🟠", ageFactor: 0.084, temp: "-110 °C", moonCount: 95 },
    { name: "Saturn", color: "bg-yellow-200", desc: "Berühmt für sein riesiges, schillerndes Ringsystem aus Eis und Gestein.", emoji: "🪐", ageFactor: 0.034, temp: "-140 °C", moonCount: 146 },
    { name: "Uranus", color: "bg-teal-300", desc: "Ein eisiger, hellblauer Eisriese aus Wasser, Methan und Ammoniak. Er besitzt feine, vertikale Ringe und rollt extrem gekippt um die Sonne.", emoji: "🪐", ageFactor: 0.012, temp: "-195 °C", moonCount: 28 },
    { name: "Neptun", color: "bg-blue-700", desc: "Der am weitesten entfernte Planet. Ein stürmischer, tiefblauer Gasriese.", emoji: "🔵", ageFactor: 0.006, temp: "-200 °C", moonCount: 16 }
  ];
  
  const [activeTab, setActiveTab] = useState<'info' | 'calculator' | 'quiz'>('info');
  const [idx, setIdx] = useState(3);
  
  // Calculator state
  const [earthAge, setEarthAge] = useState<number>(9);

  // Quiz state
  const [quizScore, setQuizScore] = useState<number>(0);
  const [quizAnswered, setQuizAnswered] = useState<boolean>(false);
  const [quizFeedback, setQuizFeedback] = useState<string>("");
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);

  const triviaQuestions = [
    { q: "Welcher Planet ist der Sonne am nächsten?", options: ["Sonne", "Erde", "Merkur", "Venus"], correct: "Merkur" },
    { q: "Welcher Planet ist für seine prächtigen Ringe berühmt?", options: ["Mars", "Saturn", "Neptun", "Jupiter"], correct: "Saturn" },
    { q: "Welcher Planet ist der heißeste in unserem System?", options: ["Venus", "Merkur", "Sonne", "Jupiter"], correct: "Venus" },
    { q: "Auf welchem Planeten dauert ein Jahr fast 165 Erdenjahre?", options: ["Mars", "Uranus", "Neptun", "Saturn"], correct: "Neptun" },
    { q: "Wie viele Monde umkreisen unsere Erde?", options: ["Keiner", "1", "2", "Über 50"], correct: "1" }
  ];

  const handleQuizAnswer = (opt: string) => {
    if (quizAnswered) return;
    setQuizAnswered(true);
    if (opt === triviaQuestions[currentQuestionIdx].correct) {
      setQuizScore(prev => prev + 1);
      setQuizFeedback("Richtig! 🌟 Gut gemacht!");
      import('canvas-confetti').then(m => m.default({ particleCount: 30, spread: 30 }));
    } else {
      setQuizFeedback(`Schade, fast! Richtig war: ${triviaQuestions[currentQuestionIdx].correct}`);
    }
  };

  const handleNextQuestion = () => {
    setQuizAnswered(false);
    setQuizFeedback("");
    setCurrentQuestionIdx(prev => (prev + 1) % triviaQuestions.length);
  };

  return (
    <div className="flex flex-col h-full w-full p-2.5 justify-between select-none min-h-0 bg-slate-950 text-white rounded-2xl relative overflow-hidden border border-indigo-900/30">
      
      {/* Space starry ambient background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute top-2 right-4 text-[7px] text-indigo-300 opacity-60 font-mono animate-pulse">✨ Orbit Simulator v2.0</div>

      {/* Header and Mini Tabs */}
      <div className="shrink-0 flex justify-between items-center mb-1.5 relative z-10">
        <div className="flex flex-col">
          <span className="text-[9.5px] font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-fuchsia-300">
            🌌 Welten-Entdecker
          </span>
          <span className="text-[7px] font-mono opacity-60 text-slate-300">Unser Sonnensystem erleben</span>
        </div>

        {/* Tab Controllers */}
        <div className="flex gap-1.5">
          <button 
            onClick={() => setActiveTab('info')}
            className={`px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase transition-all cursor-pointer ${activeTab === 'info' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-slate-300'}`}
          >
            Info
          </button>
          <button 
            onClick={() => setActiveTab('calculator')}
            className={`px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase transition-all cursor-pointer ${activeTab === 'calculator' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-slate-300'}`}
          >
            Weltraum-Alter
          </button>
          <button 
            onClick={() => setActiveTab('quiz')}
            className={`px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase transition-all cursor-pointer ${activeTab === 'quiz' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-slate-300'}`}
          >
            Space-Quiz
          </button>
        </div>
      </div>

      {/* Main Core Content Container based on Tabs */}
      <div className="flex-grow flex flex-col justify-center min-h-0 relative z-10 py-1">
        
        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className="flex-grow flex flex-col justify-between min-h-0">
            <div className="flex-grow flex items-center justify-center gap-3 py-1.5">
              <span className="text-5xl filter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] animate-pulse">{planets[idx].emoji}</span>
              <div className="flex flex-col text-left">
                <span className="text-xs font-black tracking-widest uppercase text-indigo-200">{planets[idx].name}</span>
                <span className="text-[8px] italic opacity-80 text-fuchsia-300">Temp: {planets[idx].temp} | Monde: {planets[idx].moonCount}</span>
                <p className="text-[8.5px] leading-normal opacity-90 mt-1 max-w-[140px] break-words">{planets[idx].desc}</p>
              </div>
            </div>
            {/* Nav controls */}
            <div className="flex justify-between w-full px-2 mt-1 gap-2 shrink-0">
              <button 
                onClick={() => setIdx(i => Math.max(0, i - 1))} 
                disabled={idx === 0}
                className="bg-white/10 py-1 px-2.5 rounded-lg text-[8px] font-extrabold uppercase hover:bg-white/20 transition-all cursor-pointer disabled:opacity-40"
              >
                ◀ Zurück
              </button>
              <span className="text-[7.5px] font-mono text-slate-400 self-center">Planet {idx + 1} von {planets.length}</span>
              <button 
                onClick={() => setIdx(i => Math.min(planets.length - 1, i + 1))} 
                disabled={idx === planets.length - 1}
                className="bg-white/10 py-1 px-2.5 rounded-lg text-[8px] font-extrabold uppercase hover:bg-white/20 transition-all cursor-pointer disabled:opacity-40"
              >
                Weiter ▶
              </button>
            </div>
          </div>
        )}

        {/* Calculator Tab */}
        {activeTab === 'calculator' && (
          <div className="flex-grow flex flex-col justify-between items-center py-1 min-h-0">
            {/* Age Input */}
            <div className="flex items-center gap-1.5 shrink-0 bg-white/5 px-2 py-1 rounded-xl border border-white/5 w-full justify-center">
              <span className="text-[8.5px] font-black uppercase text-indigo-300">Dein Alter auf der Erde:</span>
              <input 
                type="number"
                min="5"
                max="100"
                value={earthAge}
                onChange={(e) => setEarthAge(Math.max(1, parseInt(e.target.value) || 9))}
                className="w-10 text-center font-bold text-[10px] bg-slate-900 border border-indigo-500/40 rounded py-0.5 text-white outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-[8.5px] opacity-75">Jahre</span>
            </div>

            {/* Simulated Space Ages */}
            <div className="grid grid-cols-3 gap-1.5 w-full py-1.5 my-auto text-center scrollable max-h-[80px] overflow-y-auto pr-0.5">
              {planets.filter(p => p.name !== "Sonne").map((p) => {
                const calculatedAge = (earthAge * p.ageFactor).toFixed(1);
                return (
                  <div key={p.name} className="bg-white/5 py-1 px-1 rounded-xl border border-white/5 flex flex-col items-center">
                    <span className="text-xs">{p.emoji}</span>
                    <span className="text-[7px] font-black uppercase text-indigo-300 mt-0.5">{p.name}</span>
                    <span className="text-[8.5px] font-bold font-mono text-fuchsia-300">{calculatedAge} <span className="opacity-60 text-[6.5px]">J.</span></span>
                  </div>
                );
              })}
            </div>
            <span className="text-[6.5px] opacity-60 text-center px-1">Weil Planeten unterschiedlich schnell um die Sonne kreisen! 🚀</span>
          </div>
        )}

        {/* Quiz Tab */}
        {activeTab === 'quiz' && (
          <div className="flex-grow flex flex-col justify-between min-h-0 py-0.5 text-center">
            <div className="shrink-0 flex justify-between items-center text-[7px] font-mono text-slate-400">
              <span>Frage {currentQuestionIdx + 1} von {triviaQuestions.length}</span>
              <span>Richtig gelöst: {quizScore} 🏅</span>
            </div>

            <p className="text-[9px] font-extrabold text-indigo-200 py-1 leading-snug">
              {triviaQuestions[currentQuestionIdx].q}
            </p>

            <div className="grid grid-cols-2 gap-1 px-2">
              {triviaQuestions[currentQuestionIdx].options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleQuizAnswer(opt)}
                  disabled={quizAnswered}
                  className={`py-1 px-1.5 rounded-lg text-[8.5px] font-bold border transition-all cursor-pointer ${
                    quizAnswered 
                      ? opt === triviaQuestions[currentQuestionIdx].correct
                        ? "bg-emerald-600 text-white border-transparent"
                        : "bg-white/5 text-slate-400 border-white/5"
                      : "bg-white/10 hover:bg-white/20 border-white/10 text-white"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            {/* Quiz Action Feedback */}
            <div className="h-5 flex items-center justify-center shrink-0 mt-1">
              {quizAnswered && (
                <div className="flex items-center gap-1.5 justify-center w-full">
                  <span className="text-[8px] font-black text-amber-300">{quizFeedback}</span>
                  <button
                    onClick={handleNextQuestion}
                    className="px-2 py-0.5 rounded bg-indigo-500 hover:bg-indigo-600 text-[8px] font-extrabold uppercase text-white shadow"
                  >
                    Nächste ➜
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// ========================================================
// 36. WIDGET: TISCH-CHECK (TischCheckWidgetContent)
// ========================================================
interface TischCheckWidgetProps {
  widget: any;
  onUpdate: (updates: any) => void;
  currentIsLight: boolean;
}

export const TischCheckWidgetContent: React.FC<TischCheckWidgetProps> = ({ widget, onUpdate, currentIsLight }) => {
  return <TableCheckWidget widget={widget} onUpdate={onUpdate} currentIsLight={currentIsLight} />;
};

// ========================================================
// 37. WIDGET: FAIR-CALL (FairCallWidgetContent)
// ========================================================
interface FairCallWidgetProps {
  widget: any;
  onUpdate: (updates: any) => void;
  currentIsLight: boolean;
}

export const FairCallWidgetContent: React.FC<FairCallWidgetProps> = ({ widget, onUpdate, currentIsLight }) => {
  return <FairCallWidget widget={widget} onUpdate={onUpdate} currentIsLight={currentIsLight} />;
};

