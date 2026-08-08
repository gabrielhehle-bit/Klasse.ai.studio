import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
// 33. WIDGET: STORY-WÜRFEL (StoryemojisWidgetContent)
// ========================================================
export const StoryemojisWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const emojisPool = [
    // Charaktere & Fabelwesen
    "🦁", "🐼", "🦊", "🧙", "👻", "🦄", "👽", "🦖", "👸", "🕵️", "👩‍🚀", "🏴‍☠️", "🤖", "🧚", "🐉", "🧛", "🧞", "🥷", "🐸", "🐻", "🐝",
    // Orte & Natur
    "🏰", "🚀", "🏔", "🏝", "🌋", "🌲", "🏠", "⛺", "🛸", "🚢", "🎈", "☀️", "🌧", "❄️", "🌊", "🌙", "🪐", "🎡", "🏫", "🪵", "🏜",
    // Gegenstände & Schätze
    "🍕", "🍦", "🎸", "🚲", "🎁", "⚽", "🔑", "💎", "🎒", "🧪", "🪱", "🍿", "🪄", "📦", "✉️", "💡", "🛡️", "🏹", "🧭", "🍎", "⚓"
  ];

  const [diceCount, setDiceCount] = useState<number>(3);
  const [playMode, setPlayMode] = useState<'classic' | 'sequential'>('classic');
  const [dice, setDice] = useState<{ emoji: string; revealed: boolean; rolling: boolean }[]>([
    { emoji: "🏰", revealed: true, rolling: false },
    { emoji: "🧙", revealed: true, rolling: false },
    { emoji: "🍕", revealed: true, rolling: false }
  ]);
  const [feedback, setFeedback] = useState<string>("Erfinde eine Geschichte aus den Bildern!");

  const playDiceSound = (type: 'roll' | 'reveal' | 'add') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      if (type === 'roll') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
      } else if (type === 'add') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.setValueAtTime(440, now + 0.08);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.08);
        osc.frequency.setValueAtTime(659.25, now + 0.16);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch (e) {}
  };

  const rollAll = () => {
    playDiceSound('roll');
    setFeedback("Die Würfel rollen... 🎲");
    const rolled = Array.from({ length: diceCount }).map(() => {
      const randomEmoji = emojisPool[Math.floor(Math.random() * emojisPool.length)];
      return {
        emoji: randomEmoji,
        revealed: false, // roll face-down for suspense
        rolling: true
      };
    });
    setDice(rolled);

    // Stop rolling animation shortly
    setTimeout(() => {
      setDice(prev => prev.map(d => ({ ...d, rolling: false })));
      setFeedback("Tippe auf die Würfel, um sie nacheinander aufzudecken!");
    }, 500);
  };

  const changeDiceCount = (count: number) => {
    setDiceCount(count);
    if (playMode === 'classic') {
      const rolled = Array.from({ length: count }).map(() => {
        const randomEmoji = emojisPool[Math.floor(Math.random() * emojisPool.length)];
        return {
          emoji: randomEmoji,
          revealed: true,
          rolling: false
        };
      });
      setDice(rolled);
      setFeedback(`Klassisch: ${count} Würfel geladen.`);
    } else {
      // In sequential mode, reset to 1 active die of the count
      const randomEmoji = emojisPool[Math.floor(Math.random() * emojisPool.length)];
      setDice([{ emoji: randomEmoji, revealed: true, rolling: false }]);
      setFeedback("Nacheinander-Modus: Der erste Würfel liegt bereit!");
    }
  };

  // Add next die one-by-one in sequential mode
  const addNextDie = () => {
    if (dice.length >= diceCount) {
      setFeedback(`Maximale Würfelanzahl (${diceCount}) bereits erreicht! Erhöhe das Limit oben.`);
      return;
    }
    playDiceSound('add');
    const randomEmoji = emojisPool[Math.floor(Math.random() * emojisPool.length)];
    const newDie = {
      emoji: randomEmoji,
      revealed: false,
      rolling: true
    };
    setDice(prev => [...prev, newDie]);
    setFeedback(`Würfel ${dice.length + 1} wird hinzugefügt...`);

    const newIndex = dice.length;
    setTimeout(() => {
      setDice(prev => prev.map((d, idx) => idx === newIndex ? { ...d, rolling: false, revealed: true } : d));
      setFeedback(`Die Geschichte wächst! Erzähle weiter... 🗣️`);
      playDiceSound('reveal');
    }, 600);
  };

  // Re-roll a single individual die
  const rollIndividual = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent card toggle
    playDiceSound('roll');
    setDice(prev => prev.map((d, i) => i === idx ? { ...d, rolling: true } : d));
    
    setTimeout(() => {
      const randomEmoji = emojisPool[Math.floor(Math.random() * emojisPool.length)];
      setDice(prev => prev.map((d, i) => i === idx ? { emoji: randomEmoji, revealed: true, rolling: false } : d));
      setFeedback(`Würfel ${idx + 1} wurde neu gewürfelt! 🔄`);
    }, 400);
  };

  const revealOneByOne = () => {
    const nextIdx = dice.findIndex(d => !d.revealed);
    if (nextIdx !== -1) {
      playDiceSound('reveal');
      setDice(prev => prev.map((d, i) => i === nextIdx ? { ...d, revealed: true } : d));
      setFeedback(`Würfel ${nextIdx + 1} aufgedeckt!`);
    }
  };

  const revealAll = () => {
    playDiceSound('reveal');
    setDice(prev => prev.map(d => ({ ...d, revealed: true })));
    setFeedback("Alle Würfel sind aufgedeckt! 🌟");
  };

  const hideAll = () => {
    playDiceSound('roll');
    setDice(prev => prev.map(d => ({ ...d, revealed: false })));
    setFeedback("Alle Würfel wurden verdeckt!");
  };

  const toggleDie = (idx: number) => {
    if (!dice[idx].revealed) {
      playDiceSound('reveal');
    }
    setDice(prev => prev.map((d, i) => i === idx ? { ...d, revealed: !d.revealed } : d));
  };

  // Synchronize when switching playMode
  useEffect(() => {
    changeDiceCount(diceCount);
  }, [playMode]);

  const hasUnrevealed = dice.some(d => !d.revealed);

  return (
    <div className="flex flex-col h-full w-full p-2.5 justify-between select-none min-h-0 overflow-y-auto overflow-x-hidden gap-2">
      {/* Title block with Dice Count & Mode Toggles */}
      <div className="shrink-0 flex flex-col gap-1.5 pb-2 border-b border-slate-100 dark:border-zinc-800">
        <div className="flex justify-between items-center">
          <div className="flex flex-col text-left">
            <span className={`text-[9px] font-black uppercase tracking-widest ${currentIsLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
              🎲 Story-Würfel
            </span>
            <span className="text-[6.5px] font-semibold text-slate-400 dark:text-slate-500 leading-none">Spannende Erzähl- & Schreibimpulse</span>
          </div>
          
          {/* Dice Limit Selection */}
          <div className="flex gap-0.5 items-center bg-slate-50 dark:bg-zinc-900 px-1.5 py-0.5 rounded-lg border dark:border-zinc-800 scale-90">
            <span className="text-[6px] font-black uppercase text-slate-400 mr-1">Limit:</span>
            {[1, 3, 5, 7, 9].map(num => (
              <button
                key={num}
                onClick={() => changeDiceCount(num)}
                className={`w-4 h-4 rounded text-[7px] font-black cursor-pointer transition-all ${
                  diceCount === num ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-300'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Play Mode Switcher */}
        <div className="flex gap-1 w-full justify-center">
          <button
            onClick={() => setPlayMode('classic')}
            className={`flex-1 py-0.5 rounded-lg text-[7px] font-extrabold uppercase transition-all border cursor-pointer ${
              playMode === 'classic'
                ? 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-850'
                : 'bg-slate-50 text-slate-500 border-slate-150 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 hover:bg-slate-100'
            }`}
          >
            🏁 Alle auf einmal
          </button>
          <button
            onClick={() => setPlayMode('sequential')}
            className={`flex-1 py-0.5 rounded-lg text-[7px] font-extrabold uppercase transition-all border cursor-pointer ${
              playMode === 'sequential'
                ? 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-850'
                : 'bg-slate-50 text-slate-500 border-slate-150 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 hover:bg-slate-100'
            }`}
          >
            ➕ Nacheinander einblenden
          </button>
        </div>
      </div>

      {/* Main Dice Board Stage */}
      <div className="flex-grow flex flex-col justify-center items-center py-1 min-h-0">
        <div className="flex flex-wrap gap-2 justify-center max-w-[250px] py-1">
          {dice.map((d, i) => (
            <div 
              key={i}
              className="relative group transition-transform hover:scale-105"
            >
              <button 
                onClick={() => toggleDie(i)}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 shadow-sm cursor-pointer transition-all transform active:scale-95 ${
                  d.rolling 
                    ? 'animate-spin border-indigo-400 bg-indigo-50/50' 
                    : d.revealed 
                      ? 'bg-white dark:bg-zinc-850 border-indigo-400 text-2xl' 
                      : 'bg-gradient-to-br from-amber-400 to-amber-500 border-amber-600 text-white text-xl font-black shadow-inner'
                }`}
              >
                {d.rolling ? (
                  "🎲"
                ) : d.revealed ? (
                  d.emoji
                ) : (
                  <span className="animate-pulse">?</span>
                )}
              </button>

              {/* Small Individual Re-roll Button */}
              {d.revealed && !d.rolling && (
                <button
                  onClick={(e) => rollIndividual(i, e)}
                  title="Diesen Würfel neu werfen"
                  className="absolute -top-1 -right-1 bg-rose-500 text-white w-4 h-4 rounded-full flex items-center justify-center border border-white hover:bg-rose-600 cursor-pointer shadow-xs active:scale-75 transition-all text-[8px] font-black"
                >
                  🔄
                </button>
              )}
            </div>
          ))}

          {/* Sequential Mode Plus Placeholder */}
          {playMode === 'sequential' && dice.length < diceCount && (
            <button
              onClick={addNextDie}
              className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-indigo-300 dark:border-zinc-700 hover:border-indigo-500 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-500 cursor-pointer transition-all active:scale-90"
              title="Nächsten Würfel hinzufügen"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[6px] font-black uppercase mt-0.5">Mehr</span>
            </button>
          )}
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex gap-1.5 mt-2.5 select-none pointer-events-auto shrink-0 scale-95">
          {playMode === 'classic' ? (
            <button 
              onClick={rollAll} 
              className="px-2.5 py-1 text-[8px] bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider rounded-lg cursor-pointer active:scale-95 transition-all shadow-xs flex items-center gap-0.5"
            >
              🎲 Mischen
            </button>
          ) : (
            <button 
              onClick={() => changeDiceCount(diceCount)} 
              className="px-2.5 py-1 text-[8px] bg-slate-500 hover:bg-slate-600 text-white font-black uppercase tracking-wider rounded-lg cursor-pointer active:scale-95 transition-all shadow-xs flex items-center gap-0.5"
            >
              <RotateCcw className="w-2.5 h-2.5" /> Neustart
            </button>
          )}

          {hasUnrevealed ? (
            <button 
              onClick={revealOneByOne} 
              className="px-2 py-1 text-[8px] bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-wider rounded-lg cursor-pointer active:scale-95 transition-all shadow-xs flex items-center gap-0.5"
            >
              ✨ Aufdecken
            </button>
          ) : (
            playMode === 'classic' && (
              <button 
                onClick={hideAll} 
                className="px-2 py-1 text-[8px] bg-zinc-500 hover:bg-zinc-600 text-white font-black uppercase tracking-wider rounded-lg cursor-pointer active:scale-95 transition-all shadow-xs flex items-center gap-0.5"
              >
                🔒 Verdecken
              </button>
            )
          )}

          {hasUnrevealed && (
            <button 
              onClick={revealAll} 
              className="px-2.5 py-1 text-[8px] bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-lg cursor-pointer active:scale-95 transition-all shadow-xs"
            >
              Alle
            </button>
          )}
        </div>
      </div>

      {/* Feedback & Suggestion prompt */}
      <p className="shrink-0 text-[7px] font-extrabold text-indigo-500 dark:text-indigo-400 text-center leading-tight">
        {feedback}
      </p>
    </div>
  );
};

// ========================================================
// 34. WIDGET: ABC-SORTIERER (AbcorderWidgetContent)
// ========================================================
export const AbcorderWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const [level, setLevel] = useState<'easy' | 'medium' | 'hard' | 'extreme'>('easy');

  const wordPools = useMemo(() => ({
    easy: [
      ["Auge", "Baum", "Dach", "Fisch", "Gras"],
      ["Hand", "Insel", "Kopf", "Licht", "Mond"],
      ["Nacht", "Obst", "Pilz", "Rad", "Sonne"],
      ["Turm", "Uhr", "Wald", "Zahn", "Katze"]
    ],
    medium: [
      ["Affe", "Apfel", "Ampel", "Ananas", "Auto"],
      ["Birne", "Buch", "Brot", "Baby", "Biene"],
      ["Katze", "Kuh", "Keks", "Kopf", "Kanu"],
      ["Sonne", "Schiff", "Salat", "Seife", "Suppe"]
    ],
    hard: [
      ["Schaf", "Schere", "Schiff", "Schuh", "Schule"],
      ["Traube", "Traktor", "Träne", "Trage", "Trampolin"],
      ["Feder", "Feuer", "Feld", "Fels", "Fest"],
      ["Winter", "Wind", "Winkel", "Wiese", "Wippe"]
    ],
    extreme: [
      ["Regen", "Regenbogen", "Regenjacke", "Regenschirm", "Regenwurm"],
      ["Spiel", "Spielkarte", "Spielmann", "Spielplatz", "Spielzeug"],
      ["Bibel", "Biber", "Biene", "Biologie", "Birne"],
      ["Hand", "Handschuh", "Handtasche", "Handtuch", "Handy"]
    ]
  }), []);

  const [words, setWords] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string>("Bringe die Wörter in die richtige ABC-Reihenfolge! 🔤");
  const [checked, setChecked] = useState<boolean>(false);
  const [correctFlags, setCorrectFlags] = useState<boolean[]>([]);

  const loadNewWords = useCallback((lvl = level) => {
    const list = wordPools[lvl];
    const chosen = list[Math.floor(Math.random() * list.length)];
    const shuffled = [...chosen].sort(() => 0.5 - Math.random());
    setWords(shuffled);
    setFeedback(
      lvl === 'easy' ? "Vergleiche die Anfangsbuchstaben! 🔍" :
      lvl === 'medium' ? "Achtung: Gleicher Anfangsbuchstabe! Vergleiche den 2. Buchstaben! 🔍" :
      lvl === 'hard' ? "Knifflig: Mehrere Buchstaben sind gleich! Schau genau hin! 🔍" :
      "Extrem schwer: Die Wörter sind fast identisch! Sortiere sorgfältig! 🧠⚡"
    );
    setChecked(false);
    setCorrectFlags([]);
  }, [level, wordPools]);

  useEffect(() => {
    loadNewWords();
  }, [level, loadNewWords]);

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const nextWords = [...words];
    [nextWords[idx - 1], nextWords[idx]] = [nextWords[idx], nextWords[idx - 1]];
    setWords(nextWords);
    setChecked(false);
  };

  const moveDown = (idx: number) => {
    if (idx === words.length - 1) return;
    const nextWords = [...words];
    [nextWords[idx + 1], nextWords[idx]] = [nextWords[idx], nextWords[idx + 1]];
    setWords(nextWords);
    setChecked(false);
  };

  const checkSorting = () => {
    const sorted = [...words].sort((a, b) => a.localeCompare(b, 'de'));
    const flags = words.map((w, i) => w === sorted[i]);
    setCorrectFlags(flags);
    setChecked(true);

    const allCorrect = flags.every(Boolean);
    if (allCorrect) {
      setFeedback("🎉 Super! Alle Wörter sind perfekt alphabetisch sortiert! 🌟");
      import('canvas-confetti').then(m => m.default({ particleCount: 30, spread: 30 }));
    } else {
      let hint = "";
      for (let i = 0; i < words.length; i++) {
        if (words[i] !== sorted[i]) {
          hint = `Upps! '${words[i]}' ist noch nicht am richtigen Platz.`;
          break;
        }
      }
      setFeedback(`❌ Noch nicht ganz richtig! ${hint} Versuche es weiter!`);
    }
  };

  const showSolution = () => {
    const sorted = [...words].sort((a, b) => a.localeCompare(b, 'de'));
    setWords(sorted);
    setCorrectFlags(Array(words.length).fill(true));
    setChecked(true);
    setFeedback("Das ist die richtige Reihenfolge! Schau dir die Buchstaben genau an. 🎓");
  };

  return (
    <div className="flex flex-col h-full w-full p-2.5 justify-between select-none min-h-0 overflow-y-auto overflow-x-hidden">
      {/* Header and Level Toggles */}
      <div className="shrink-0 flex flex-col gap-1.5 mb-1.5">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <span className={`text-[9.5px] font-black uppercase tracking-widest ${currentIsLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
              🔤 ABC-Sortierer
            </span>
            <span className="text-[7.5px] font-mono opacity-80 font-black">Alphabetisches Sortiertraining</span>
          </div>
          <button
            onClick={() => loadNewWords(level)}
            className="px-1.5 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-white font-bold text-[7px]"
          >
            Mischen 🎲
          </button>
        </div>

        {/* Difficulty Selectors */}
        <div className="grid grid-cols-4 gap-1">
          {(['easy', 'medium', 'hard', 'extreme'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevel(lvl)}
              className={`py-0.5 rounded text-[7px] font-black uppercase tracking-wide border cursor-pointer transition-colors text-center ${
                level === lvl
                  ? 'bg-indigo-600 border-indigo-700 text-white shadow-xs'
                  : currentIsLight
                    ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    : 'bg-zinc-800 border-zinc-700 text-slate-350 hover:bg-zinc-750'
              }`}
            >
              {lvl === 'easy' ? 'Leicht' : lvl === 'medium' ? 'Mittel' : lvl === 'hard' ? 'Schwer' : 'Extrem'}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Word Sorting List */}
      <div className="flex-grow flex flex-col justify-center gap-1.5 min-h-0 py-2">
        {words.map((w, idx) => {
          let rowColor = currentIsLight ? 'bg-slate-100/80 border-slate-200' : 'bg-zinc-850 border-zinc-750';
          if (checked) {
            rowColor = correctFlags[idx]
              ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900 text-rose-850 dark:text-rose-300';
          }

          return (
            <div
              key={idx}
              className={`flex justify-between items-center px-2.5 py-1.5 rounded-xl border-2 transition-all ${rowColor}`}
            >
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-mono font-black text-[9px] flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest">{w}</span>
              </div>

              {/* Swap Controls */}
              <div className="flex gap-1">
                <button
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  className="w-4 h-4 rounded bg-slate-200 hover:bg-slate-300 dark:bg-zinc-700 dark:hover:bg-zinc-650 text-slate-800 dark:text-zinc-200 font-extrabold text-[8px] flex items-center justify-center disabled:opacity-30 cursor-pointer"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveDown(idx)}
                  disabled={idx === words.length - 1}
                  className="w-4 h-4 rounded bg-slate-200 hover:bg-slate-300 dark:bg-zinc-700 dark:hover:bg-zinc-650 text-slate-800 dark:text-zinc-200 font-extrabold text-[8px] flex items-center justify-center disabled:opacity-30 cursor-pointer"
                >
                  ▼
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons & Feedback Footer */}
      <div className="shrink-0 flex flex-col gap-1 mt-1">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={checkSorting}
            className="py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[8px] uppercase tracking-wider cursor-pointer shadow-xs transition-colors"
          >
            Prüfen ✔
          </button>
          <button
            onClick={showSolution}
            className="py-1 rounded bg-indigo-500 hover:bg-indigo-600 text-white font-black text-[8px] uppercase tracking-wider cursor-pointer shadow-xs transition-colors"
          >
            Lösung 🎓
          </button>
        </div>
        <p className="text-[7.5px] font-bold text-center block leading-tight text-slate-500 dark:text-neutral-400 mt-0.5">
          {feedback}
        </p>
      </div>
    </div>
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
  const selectedIds = useMemo(() => new Set<string>(widget.settings?.selectedIds || []), [widget.settings?.selectedIds]);
  const customItems = useMemo(() => widget.settings?.customItems || [], [widget.settings?.customItems]);
  const activeTab = widget.settings?.activeTab || 'show'; // 'show' or 'edit'

  const [customEmoji, setCustomEmoji] = useState('🎒');
  const [customName, setCustomName] = useState('');

  const defaultMaterials = [
    { id: 'math-book', name: 'Mathebuch', emoji: '📘' },
    { id: 'read-book', name: 'Lesebuch', emoji: '📙' },
    { id: 'notebook', name: 'Schreibheft', emoji: '📓' },
    { id: 'pencil', name: 'Bleistift', emoji: '✏️' },
    { id: 'ruler', name: 'Lineal', emoji: '📏' },
    { id: 'scissors', name: 'Schere', emoji: '✂️' },
    { id: 'glue', name: 'Kleber', emoji: '🧪' },
    { id: 'colors', name: 'Buntstifte', emoji: '🖍️' },
    { id: 'pen', name: 'Füller', emoji: '🖊️' },
    { id: 'eraser', name: 'Radiergummi', emoji: '🧼' },
    { id: 'triangle', name: 'Geodreieck', emoji: '📐' },
    { id: 'homework', name: 'Hausaufgabenheft', emoji: '📔' },
    { id: 'lunch', name: 'Frühstück', emoji: '🥪' },
    { id: 'bottle', name: 'Trinkflasche', emoji: '🥤' }
  ];

  const allMaterials = useMemo(() => [...defaultMaterials, ...customItems], [customItems]);

  const toggleItem = (id: string) => {
    const nextSelected = new Set(selectedIds);
    if (nextSelected.has(id)) {
      nextSelected.delete(id);
    } else {
      nextSelected.add(id);
    }
    onUpdate({
      settings: {
        ...widget.settings,
        selectedIds: Array.from(nextSelected)
      }
    });
  };

  const applyPreset = (type: 'math' | 'german' | 'craft' | 'lunch' | 'clear') => {
    let ids: string[] = [];
    if (type === 'math') {
      ids = ['math-book', 'notebook', 'pencil', 'ruler', 'triangle'];
    } else if (type === 'german') {
      ids = ['read-book', 'notebook', 'pencil', 'pen', 'eraser'];
    } else if (type === 'craft') {
      ids = ['pencil', 'scissors', 'glue', 'colors'];
    } else if (type === 'lunch') {
      ids = ['lunch', 'bottle'];
    }
    onUpdate({
      settings: {
        ...widget.settings,
        selectedIds: ids
      }
    });
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    const newItem = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      emoji: customEmoji || '🎒'
    };
    onUpdate({
      settings: {
        ...widget.settings,
        customItems: [...customItems, newItem],
        selectedIds: [...Array.from(selectedIds), newItem.id]
      }
    });
    setCustomName('');
  };

  const handleRemoveCustom = (id: string) => {
    const nextCustom = customItems.filter((item: any) => item.id !== id);
    const nextSelected = new Set(selectedIds);
    nextSelected.delete(id);
    onUpdate({
      settings: {
        ...widget.settings,
        customItems: nextCustom,
        selectedIds: Array.from(nextSelected)
      }
    });
  };

  const setActiveTab = (tab: 'show' | 'edit') => {
    onUpdate({
      settings: {
        ...widget.settings,
        activeTab: tab
      }
    });
  };

  const activeSelectedItems = useMemo(() => allMaterials.filter(item => selectedIds.has(item.id)), [allMaterials, selectedIds]);

  return (
    <div className="flex flex-col h-full w-full p-4.5 justify-between select-none min-h-0 overflow-y-auto no-scrollbar font-sans">
      {/* Header section with tabs */}
      <div className="shrink-0 flex justify-between items-center border-b border-border/10 pb-3 mb-3">
        <div className="flex flex-col">
          <span className={`text-xs font-black tracking-wider flex items-center gap-1 &${currentIsLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
            🎒 Tisch-Check
          </span>
          <span className="text-[8.5px] opacity-75 font-bold">Was muss jetzt einsatzbereit vor dir liegen?</span>
        </div>
        <div className="flex gap-1 bg-slate-100 dark:bg-zinc-900 p-1 rounded-full border border-slate-200 dark:border-white/5">
          <button
            onClick={() => setActiveTab('show')}
            className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'show' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Anzeige ({selectedIds.size})
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'edit' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Wählen
          </button>
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar py-1">
        {activeTab === 'show' ? (
          /* Presentation Mode */
          <div className="min-h-full flex flex-col justify-center animate-fade-in">
            {activeSelectedItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 text-center items-center justify-center p-1.5">
                {activeSelectedItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 w-full border p-3 rounded-2xl shadow-sm hover:scale-[1.03] active:scale-95 duration-150 transition-all ${
                      currentIsLight 
                        ? 'bg-white border-slate-200/95 shadow-slate-100/50 text-slate-800' 
                        : 'bg-zinc-900 border-zinc-800/80 shadow-black/40 text-neutral-100'
                    }`}
                  >
                    <span className="text-3xl filter drop-shadow select-none">{item.emoji}</span>
                    <span className="text-xs font-black text-left leading-tight tracking-tight">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-text-muted">
                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-zinc-900/70 flex items-center justify-center mb-3">
                  <Backpack size={26} className="stroke-[1.5] text-indigo-500 animate-pulse" />
                </div>
                <p className="text-[11px] font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400">Tisch bleibt leer!</p>
                <p className="text-[9px] font-bold mt-1.5 max-w-[210px] leading-relaxed">Klicke oben auf "Wählen" um benötigtes Unterrichts- und Arbeitsmaterial anzuzeigen.</p>
              </div>
            )}
          </div>
        ) : (
          /* Selection / Editor Mode */
          <div className="space-y-4 animate-fade-in">
            {/* Presets */}
            <div className="space-y-1.5">
              <span className="text-[8px] font-black opacity-60 uppercase tracking-widest text-text-muted">Schnell-Auswahl Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => applyPreset('math')} className="px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-500 dark:text-blue-300 rounded-xl text-[8.5px] font-black uppercase transition-all cursor-pointer">📐 Mathe</button>
                <button type="button" onClick={() => applyPreset('german')} className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-600 dark:text-amber-300 rounded-xl text-[8.5px] font-black uppercase transition-all cursor-pointer">🔤 Deutsch</button>
                <button type="button" onClick={() => applyPreset('craft')} className="px-2.5 py-1.5 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 text-pink-600 dark:text-pink-300 rounded-xl text-[8.5px] font-black uppercase transition-all cursor-pointer">🎨 Basteln</button>
                <button type="button" onClick={() => applyPreset('lunch')} className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300 rounded-xl text-[8.5px] font-black uppercase transition-all cursor-pointer">🍎 Pause</button>
                <button type="button" onClick={() => applyPreset('clear')} className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 rounded-xl text-[8.5px] font-black uppercase transition-all cursor-pointer">🧹 Leeren</button>
              </div>
            </div>

            {/* Custom item form */}
            <form onSubmit={handleAddCustom} className="flex gap-1.5 bg-slate-100 dark:bg-zinc-900/60 p-2 rounded-xl border border-border/10">
              <select
                value={customEmoji}
                onChange={(e) => setCustomEmoji(e.target.value)}
                className="bg-surface border border-border/20 rounded-lg p-1 text-xs cursor-pointer outline-none font-bold text-text-primary"
              >
                {['🎒', '📕', '📗', '📘', '📙', '📓', '📔', '✏️', '🖍️', '🖊️', '🧼', '📐', '📏', '✂️', '🧪', '🥪', '🥤', '🍎', '💻', '🎨', '🧩', '🔨'].map((em) => (
                  <option key={em} value={em}>{em}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Eigene Sache hinzufügen..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="flex-grow bg-surface border border-border/20 rounded-lg px-2 text-[9px] outline-none text-text-primary focus:border-indigo-500 font-bold"
              />
              <button
                type="submit"
                className="px-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-[8.5px] font-black uppercase flex items-center justify-center cursor-pointer"
              >
                <Plus size={12} />
              </button>
            </form>

            {/* Grid checklist */}
            <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto no-scrollbar pr-0.5">
              {allMaterials.map((item) => {
                const isSel = selectedIds.has(item.id);
                const isCustom = item.id.startsWith('custom-');
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`flex items-center justify-between p-2 rounded-2xl border transition-all cursor-pointer select-none ${
                      isSel 
                        ? 'bg-indigo-500/15 border-indigo-500 text-indigo-950 dark:text-indigo-200 font-black' 
                        : 'bg-surface/40 border-border/10 hover:border-border/30 text-text-secondary font-bold hover:bg-surface'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base select-none">{item.emoji}</span>
                      <span className="text-[9.5px] font-black truncate">{item.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isCustom && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRemoveCustom(item.id); }}
                          className="p-1 text-text-muted hover:text-rose-500 hover:bg-rose-500/10 bg-transparent rounded border-none transition-all cursor-pointer"
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSel ? 'bg-indigo-500 border-indigo-400 text-white' : 'border-border/20 bg-black/5'}`}>
                        {isSel && <Check size={10} strokeWidth={4} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 text-center text-[7.5px] text-text-muted pt-2 border-t border-border/5 font-bold">
        🎒 Der Ausrüstungs-Check hilft Kindern beim strukturierten Ankommen im Fachunterricht!
      </div>
    </div>
  );
};

// ========================================================
// 37. WIDGET: FAIR-CALL (FairCallWidgetContent)
// ========================================================
interface FairCallWidgetProps {
  widget: any;
  onUpdate: (updates: any) => void;
  currentIsLight: boolean;
}

const DEFAULT_MOCK_SCHUELER = [
  { id: 'mock-1', name: 'Max M.', vorname: 'Max', nachname: 'Müller', emoji: '👦' },
  { id: 'mock-2', name: 'Anna S.', vorname: 'Anna', nachname: 'Schmid', emoji: '👧' },
  { id: 'mock-3', name: 'Lukas B.', vorname: 'Lukas', nachname: 'Bauer', emoji: '👦' },
  { id: 'mock-4', name: 'Emma F.', vorname: 'Emma', nachname: 'Fischer', emoji: '👧' },
  { id: 'mock-5', name: 'Ben W.', vorname: 'Ben', nachname: 'Weber', emoji: '👦' },
  { id: 'mock-6', name: 'Mia L.', vorname: 'Mia', nachname: 'Lehner', emoji: '👧' },
  { id: 'mock-7', name: 'Jonas K.', vorname: 'Jonas', nachname: 'Kraus', emoji: '👦' },
  { id: 'mock-8', name: 'Laura H.', vorname: 'Laura', nachname: 'Hofer', emoji: '👧' },
  { id: 'mock-9', name: 'Felix E.', vorname: 'Felix', nachname: 'Eder', emoji: '👦' },
  { id: 'mock-10', name: 'Sophie G.', vorname: 'Sophie', nachname: 'Gruber', emoji: '👧' }
];

export const FairCallWidgetContent: React.FC<FairCallWidgetProps> = ({ widget, onUpdate, currentIsLight }) => {
  const { app } = useApp();

  const students = useMemo(() => {
    return app?.schueler && app.schueler.length > 0 ? app.schueler : DEFAULT_MOCK_SCHUELER;
  }, [app?.schueler]);

  const callCounts = useMemo(() => {
    return widget.settings?.callCounts || {};
  }, [widget.settings?.callCounts]);

  const filterType = widget.settings?.filterType || 'all'; // 'all' | 'few' | 'never'

  const [spinning, setSpinning] = useState(false);
  const [spinIndex, setSpinIndex] = useState(0);
  const [pickedStudent, setPickedStudent] = useState<any | null>(null);

  // Eligible students under the current filter
  const eligibleStudents = useMemo(() => {
    if (filterType === 'never') {
      return students.filter(s => (callCounts[s.id] || 0) === 0);
    }
    if (filterType === 'few') {
      // Find the average count or median, or simply count < 2
      return students.filter(s => (callCounts[s.id] || 0) < 2);
    }
    return students;
  }, [students, callCounts, filterType]);

  const updateCount = (studentId: string, diff: number) => {
    const nextCounts = { ...callCounts };
    nextCounts[studentId] = Math.max(0, (nextCounts[studentId] || 0) + diff);
    onUpdate({
      settings: {
        ...widget.settings,
        callCounts: nextCounts
      }
    });
  };

  const resetAllCounts = () => {
    onUpdate({
      settings: {
        ...widget.settings,
        callCounts: {}
      }
    });
    setPickedStudent(null);
  };

  const handlePickStudent = () => {
    if (spinning) return;
    const pool = eligibleStudents.length > 0 ? eligibleStudents : students;

    setSpinning(true);
    setPickedStudent(null);
    let counter = 0;
    const maxTicks = 16;

    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * pool.length);
      setSpinIndex(idx);
      counter++;

      if (counter >= maxTicks) {
        clearInterval(interval);
        const finalStudent = pool[idx];
        setPickedStudent(finalStudent);
        setSpinning(false);
        // Auto-increment
        const nextCounts = { ...callCounts };
        nextCounts[finalStudent.id] = (nextCounts[finalStudent.id] || 0) + 1;
        onUpdate({
          settings: {
            ...widget.settings,
            callCounts: nextCounts
          }
        });
      }
    }, 75);
  };

  const setFilterType = (type: 'all' | 'few' | 'never') => {
    onUpdate({
      settings: {
        ...widget.settings,
        filterType: type
      }
    });
  };

  return (
    <div className="flex flex-col h-full w-full p-3 justify-between select-none min-h-0 overflow-hidden font-sans">
      {/* Header section with category details */}
      <div className="shrink-0 flex justify-between items-center border-b border-border/10 pb-2 mb-2">
        <div className="flex flex-col text-left">
          <span className={`text-[10px] font-black tracking-wider flex items-center gap-1 ${currentIsLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
            🙋‍♀️ Fair-Call Zufall
          </span>
          <span className="text-[7.5px] opacity-75 font-bold">Gerechte Beteiligung & Protokoll</span>
        </div>
        <button
          onClick={resetAllCounts}
          className="px-2 py-0.5 text-[7.5px] border border-rose-500/30 text-rose-500 hover:bg-rose-500/15 rounded-lg font-black uppercase transition-all cursor-pointer"
        >
          Reset
        </button>
      </div>

      {/* Main interactive area */}
      <div className="flex-grow flex flex-col gap-2 min-h-0 overflow-hidden">
        {/* Active pick arena */}
        <div className={`shrink-0 border rounded-2xl p-2.5 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[80px] shadow-xs transition-all duration-300 ${
          spinning 
            ? 'bg-indigo-50/70 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-800/40 animate-pulse' 
            : pickedStudent 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200' 
              : currentIsLight ? 'bg-slate-50 border-slate-200/80 text-slate-800' : 'bg-zinc-900/40 border-zinc-800/80 text-neutral-100'
        }`}>
          {spinning ? (
            <div className="animate-bounce text-center">
              <span className="text-2xl filter drop-shadow animate-ping block mb-0.5">
                {eligibleStudents[spinIndex]?.emoji || '🙋'}
              </span>
              <span className="text-xs font-black tracking-normal text-indigo-600 dark:text-indigo-300">
                {eligibleStudents[spinIndex]?.vorname || 'Suche...'}
              </span>
            </div>
          ) : pickedStudent ? (
            <div className="space-y-1">
              <span className="text-2xl filter drop-shadow block animate-bounce">
                {pickedStudent.emoji || '🙋‍♀️'}
              </span>
              <span className="text-sm font-black tracking-tight text-emerald-600 dark:text-emerald-400 block animate-scale-in">
                {pickedStudent.vorname} {pickedStudent.nachname ? pickedStudent.nachname[0] + '.' : ''}
              </span>
              <span className="text-[7.5px] font-black uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full inline-block">
                Aufgerufen! (Insgesamt: {callCounts[pickedStudent.id] || 0}x)
              </span>
            </div>
          ) : (
            <div className="text-center text-text-muted py-1">
              <Smile size={24} className="stroke-[1.5] mx-auto text-indigo-500/60 mb-1" />
              <p className="text-[8.5px] font-black uppercase tracking-wider text-indigo-500">Wer fängt an?</p>
              <p className="text-[7.5px] font-bold mt-0.5">Klicke auf den Button "Gerecht Aufrufen!"</p>
            </div>
          )}
        </div>

        {/* Filter segment tabs */}
        <div className="space-y-1 shrink-0">
          <span className="text-[7.5px] font-black opacity-60 uppercase tracking-widest text-text-muted flex items-center gap-0.5 text-left">
            <Filter size={8} /> Gerechtigkeitsschlüssel:
          </span>
          <div className="flex gap-1 bg-slate-100 dark:bg-zinc-900 p-0.5 rounded-xl border border-slate-200 dark:border-white/5">
            <button
              onClick={() => setFilterType('all')}
              className={`flex-1 py-1 rounded-lg text-[7.5px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${filterType === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-text-muted hover:text-text-primary'}`}
            >
              Alle ({students.length})
            </button>
            <button
              onClick={() => setFilterType('few')}
              className={`flex-1 py-1 rounded-lg text-[7.5px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${filterType === 'few' ? 'bg-indigo-600 text-white shadow-xs' : 'text-text-muted hover:text-text-primary'}`}
            >
              Wenig (&lt;2x) ({students.filter(s => (callCounts[s.id] || 0) < 2).length})
            </button>
            <button
              onClick={() => setFilterType('never')}
              className={`flex-1 py-1 rounded-lg text-[7.5px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${filterType === 'never' ? 'bg-indigo-600 text-white shadow-xs' : 'text-text-muted hover:text-text-primary'}`}
            >
              Noch Nie ({students.filter(s => (callCounts[s.id] || 0) === 0).length})
            </button>
          </div>
        </div>

        {/* List of roster for adjustments */}
        <div className="flex-grow h-0 min-h-0 overflow-y-auto no-scrollbar border border-border/10 bg-slate-50 dark:bg-zinc-900/40 rounded-2xl p-1.5 space-y-1">
          {students.map((student) => {
            const count = callCounts[student.id] || 0;
            const isEligible = eligibleStudents.some(s => s.id === student.id);
            return (
              <div
                key={student.id}
                className={`flex items-center justify-between px-2 py-1 rounded-lg border text-[8.5px] ${
                  isEligible 
                    ? 'bg-white border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 text-text-primary font-bold shadow-xs' 
                    : 'bg-black/5 border-transparent text-text-muted opacity-60'
                }`}
              >
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-xs">{student.emoji || '👦'}</span>
                  <span className="truncate">{student.vorname} {student.nachname ? student.nachname[0] + '.' : ''}</span>
                  {isEligible && (
                    <span className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" title="Im Losetopf" />
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0 font-mono text-[8.5px]">
                  <span className="font-bold opacity-75">{count}x Dran</span>
                  <div className="flex rounded-md border border-border/20 overflow-hidden bg-surface shadow-xs">
                    <button
                      onClick={() => updateCount(student.id, -1)}
                      className="px-1.5 py-0.5 text-text-secondary hover:text-rose-500 hover:bg-rose-500/10 transition-colors border-r border-border/10 font-black cursor-pointer"
                    >
                      -
                    </button>
                    <button
                      onClick={() => updateCount(student.id, 1)}
                      className="px-1.5 py-0.5 text-text-secondary hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors font-black cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Control Drawer trigger */}
      <div className="shrink-0 pt-2 mt-1 border-t border-border/5">
        <button
          onClick={handlePickStudent}
          disabled={spinning || (eligibleStudents.length === 0 && students.length === 0)}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl text-[8.5px] uppercase tracking-wider shadow-xs active:scale-95 transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
        >
          <Play size={10} className="fill-white" /> Gerecht Aufrufen!
        </button>
      </div>
    </div>
  );
};

