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
  type MoneyItem = { id: number; value: number; label: string; isBill: boolean; color: string };
  const [activeTab, setActiveTab] = useState<'count' | 'quiz'>('count');
  const [total, setTotal] = useState<number>(0);
  const [addedItems, setAddedItems] = useState<MoneyItem[]>([]);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [quizTarget, setQuizTarget] = useState<number>(10);
  const [feedback, setFeedback] = useState<string>('Lege Münzen und Scheine in die Geldbörse.');
  const [quizSolved, setQuizSolved] = useState<boolean>(false);
  const [quizChecked, setQuizChecked] = useState<boolean>(false);
  const idCounter = useRef(0);

  const formatEuro = (value: number) =>
    value.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const createQuizTarget = useCallback((diff: 'easy' | 'medium' | 'hard') => {
    if (diff === 'easy') {
      const choices = [3, 5, 8, 10, 12, 15, 20, 25, 40, 50, 75, 100];
      return choices[Math.floor(Math.random() * choices.length)];
    }
    if (diff === 'medium') {
      const euros = Math.floor(Math.random() * 45) + 2;
      const cents = [0, 0.2, 0.5, 0.8][Math.floor(Math.random() * 4)];
      return Number((euros + cents).toFixed(2));
    }
    const euros = Math.floor(Math.random() * 95) + 5;
    const cents = Math.floor(Math.random() * 100) / 100;
    return Number((euros + cents).toFixed(2));
  }, []);

  const startNewQuiz = useCallback((diff: 'easy' | 'medium' | 'hard') => {
    const target = createQuizTarget(diff);
    setQuizTarget(target);
    setTotal(0);
    setAddedItems([]);
    setQuizSolved(false);
    setQuizChecked(false);
    setFeedback(`Lege genau ${formatEuro(target)} € auf den Ladentisch.`);
  }, [createQuizTarget]);

  const enterCountMode = () => {
    setActiveTab('count');
    setTotal(0);
    setAddedItems([]);
    setQuizSolved(false);
    setQuizChecked(false);
    setFeedback('Lege Münzen und Scheine in die Geldbörse.');
  };

  const enterQuizMode = () => {
    setActiveTab('quiz');
    startNewQuiz(difficulty);
  };

  const changeDifficulty = (diff: 'easy' | 'medium' | 'hard') => {
    setDifficulty(diff);
    startNewQuiz(diff);
  };

  const playMoneySound = (isBill: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(isBill ? 330 : 660, ctx.currentTime);
      gain.gain.setValueAtTime(0.035, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  };

  const handleAddItem = (val: number, label: string, isBill: boolean, color: string) => {
    if (quizSolved && activeTab === 'quiz') return;
    idCounter.current += 1;
    setAddedItems((prev) => [...prev, { id: idCounter.current, value: val, label, isBill, color }]);
    setTotal((current) => Number((current + val).toFixed(2)));
    setQuizChecked(false);
    playMoneySound(isBill);
  };

  const handleRemoveOne = (value: number) => {
    if (quizSolved && activeTab === 'quiz') return;
    setAddedItems((prev) => {
      const index = prev.findIndex((item) => item.value === value);
      if (index < 0) return prev;
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
    setTotal((current) => Number(Math.max(0, current - value).toFixed(2)));
    setQuizChecked(false);
  };

  const groupedItems = useMemo(() => {
    const groups = new Map<number, { value: number; label: string; isBill: boolean; color: string; count: number }>();
    for (const item of addedItems) {
      const existing = groups.get(item.value);
      if (existing) existing.count += 1;
      else groups.set(item.value, { value: item.value, label: item.label, isBill: item.isBill, color: item.color, count: 1 });
    }
    return [...groups.values()].sort((a, b) => b.value - a.value);
  }, [addedItems]);

  const difference = Number((quizTarget - total).toFixed(2));
  const targetProgress = quizTarget > 0 ? Math.min(100, Math.max(0, (total / quizTarget) * 100)) : 0;

  const checkQuizAnswer = () => {
    setQuizChecked(true);
    if (Math.abs(difference) < 0.001) {
      setQuizSolved(true);
      setFeedback(`Genau richtig: ${formatEuro(total)} €.`);
      import('canvas-confetti').then((module) => module.default({ particleCount: 24, spread: 22 }));
      return;
    }
    if (difference > 0) {
      setFeedback(`Es fehlen noch ${formatEuro(difference)} €.`);
    } else {
      setFeedback(`Du hast ${formatEuro(Math.abs(difference))} € zu viel aufgelegt.`);
    }
  };

  const resetMoney = () => {
    setTotal(0);
    setAddedItems([]);
    setQuizSolved(false);
    setQuizChecked(false);
    if (activeTab === 'quiz') {
      startNewQuiz(difficulty);
    } else {
      setFeedback('Lege Münzen und Scheine in die Geldbörse.');
    }
  };

  const bills = [
    { value: 100, label: '100 €', color: 'bg-emerald-100 text-emerald-800 border-emerald-400 dark:bg-emerald-950/50 dark:text-emerald-200' },
    { value: 50, label: '50 €', color: 'bg-orange-100 text-orange-800 border-orange-400 dark:bg-orange-950/50 dark:text-orange-200' },
    { value: 20, label: '20 €', color: 'bg-blue-100 text-blue-800 border-blue-400 dark:bg-blue-950/50 dark:text-blue-200' },
    { value: 10, label: '10 €', color: 'bg-rose-100 text-rose-800 border-rose-400 dark:bg-rose-950/50 dark:text-rose-200' },
    { value: 5, label: '5 €', color: 'bg-slate-100 text-slate-800 border-slate-400 dark:bg-slate-800 dark:text-slate-200' },
  ];

  const coins = [
    { value: 2, label: '2 €', color: 'border-amber-500 bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200' },
    { value: 1, label: '1 €', color: 'border-amber-500 bg-slate-100 text-amber-900 dark:bg-slate-800 dark:text-amber-200' },
    { value: 0.5, label: '50 c', color: 'border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200' },
    { value: 0.2, label: '20 c', color: 'border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200' },
    { value: 0.1, label: '10 c', color: 'border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200' },
    { value: 0.05, label: '5 c', color: 'border-orange-500 bg-orange-100 text-orange-900 dark:bg-orange-950/50 dark:text-orange-200' },
    { value: 0.02, label: '2 c', color: 'border-orange-500 bg-orange-100 text-orange-900 dark:bg-orange-950/50 dark:text-orange-200' },
    { value: 0.01, label: '1 c', color: 'border-orange-500 bg-orange-100 text-orange-900 dark:bg-orange-950/50 dark:text-orange-200' },
  ];

  return (
    <div className="min-h-full w-full p-3 sm:p-4 flex flex-col gap-3 select-none overflow-visible">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-1" role="tablist" aria-label="Taschengeld-Modus">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'count'}
            onClick={enterCountMode}
            className={`min-h-11 px-3 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
              activeTab === 'count' ? 'bg-accent text-accent-text shadow-sm' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Geld zählen
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'quiz'}
            onClick={enterQuizMode}
            className={`min-h-11 px-3 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
              activeTab === 'quiz' ? 'bg-accent text-accent-text shadow-sm' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Passend zahlen
          </button>
        </div>

        {activeTab === 'quiz' && (
          <div className="flex flex-wrap gap-1" role="group" aria-label="Schwierigkeitsstufe">
            {(['easy', 'medium', 'hard'] as const).map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => changeDifficulty(diff)}
                className={`min-h-11 px-2.5 rounded-lg text-xs font-bold border transition-colors ${
                  difficulty === diff
                    ? 'bg-accent text-accent-text border-accent'
                    : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-accent'
                }`}
              >
                {diff === 'easy' ? 'Einfach' : diff === 'medium' ? 'Mittel' : 'Schwer'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={`shrink-0 rounded-2xl border p-3 sm:p-4 ${
        currentIsLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/70 border-slate-700'
      }`}>
        <div className="grid grid-cols-2 gap-3 items-center">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {activeTab === 'quiz' ? 'Zielbetrag' : 'Geldbörse'}
            </div>
            <div className="mt-1 text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
              {activeTab === 'quiz' ? `${formatEuro(quizTarget)} €` : 'Lege Geld hinein'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Aktuell</div>
            <div className="mt-1 text-3xl sm:text-4xl font-black text-accent tabular-nums">{formatEuro(total)} €</div>
          </div>
        </div>

        {activeTab === 'quiz' && (
          <div className="mt-3">
            <div className="flex items-center justify-between gap-2 text-xs font-bold">
              <span className="text-slate-500 dark:text-slate-400">
                {Math.abs(difference) < 0.001
                  ? 'Ziel erreicht'
                  : difference > 0
                    ? `Noch ${formatEuro(difference)} €`
                    : `${formatEuro(Math.abs(difference))} € zu viel`}
              </span>
              <span className="tabular-nums text-slate-500 dark:text-slate-400">{Math.round(targetProgress)}%</span>
            </div>
            <div className="mt-1.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden" aria-label="Fortschritt zum Zielbetrag">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  difference < 0 ? 'bg-rose-500' : Math.abs(difference) < 0.001 ? 'bg-emerald-500' : 'bg-accent'
                }`}
                style={{ width: `${targetProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className={`shrink-0 min-h-20 rounded-2xl border border-dashed p-2 flex flex-wrap items-center justify-center gap-2 ${
        groupedItems.length === 0
          ? 'border-slate-300 dark:border-slate-700'
          : 'border-accent/40 bg-accent-soft'
      }`} aria-label="Aufgelegtes Geld">
        {groupedItems.length === 0 ? (
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 text-center">
            Tippe unten auf Münzen oder Scheine.
          </span>
        ) : (
          groupedItems.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => handleRemoveOne(item.value)}
              aria-label={`${item.label} entfernen`}
              title="Ein Stück entfernen"
              className={`min-h-11 min-w-16 px-2 rounded-xl border-2 font-black text-xs sm:text-sm flex items-center justify-center gap-1 active:scale-95 transition-transform ${item.color}`}
            >
              <span>{item.label}</span>
              {item.count > 1 && <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px]">×{item.count}</span>}
            </button>
          ))
        )}
      </div>

      <div className="flex-1 flex flex-col gap-3 min-h-0">
        <section>
          <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Scheine</div>
          <div className="grid grid-cols-5 gap-2">
            {bills.map((bill) => (
              <button
                key={bill.value}
                type="button"
                onClick={() => handleAddItem(bill.value, bill.label, true, bill.color)}
                disabled={quizSolved && activeTab === 'quiz'}
                className={`min-h-14 rounded-lg border-2 font-black text-sm sm:text-base shadow-sm active:scale-95 transition-transform disabled:opacity-40 ${bill.color}`}
              aria-label={`${bill.label} hinzufügen`}
              >
                <span className="block">{bill.label}</span>
                <span className="block mt-0.5 text-[10px] font-semibold opacity-70">Schein</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Münzen</div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {coins.map((coin) => (
              <button
                key={coin.value}
                type="button"
                onClick={() => handleAddItem(coin.value, coin.label, false, coin.color)}
                disabled={quizSolved && activeTab === 'quiz'}
                className={`min-h-12 min-w-12 rounded-full border-2 font-black text-xs sm:text-sm shadow-sm active:scale-95 transition-transform disabled:opacity-40 ${coin.color}`}
              aria-label={`${coin.label} hinzufügen`}
              >
                {coin.label}
              </button>
            ))}
          </div>
        </section>
      </div>

      {activeTab === 'quiz' && quizChecked && !quizSolved && (
        <div className={`shrink-0 rounded-xl border px-3 py-2 text-center text-sm font-bold ${
          difference > 0
            ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
            : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
        }`}>
          {difference > 0 ? `Noch ${formatEuro(difference)} € ergänzen.` : `${formatEuro(Math.abs(difference))} € wieder wegnehmen.`}
        </div>
      )}

      <div className="shrink-0 flex flex-wrap gap-2">
        {activeTab === 'quiz' ? (
          <>
            <button
              type="button"
              onClick={checkQuizAnswer}
              disabled={quizSolved || addedItems.length === 0}
              className="flex-1 min-h-11 px-3 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 text-accent-text font-black text-sm shadow-sm"
            >
              Betrag prüfen
            </button>
            <button
              type="button"
              onClick={() => startNewQuiz(difficulty)}
              className="min-h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-sm hover:border-accent"
            >
              Neue Aufgabe
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={resetMoney}
            disabled={addedItems.length === 0}
            className="w-full min-h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-sm hover:border-rose-400 hover:text-rose-600 disabled:opacity-40"
          >
            Geldbörse leeren
          </button>
        )}
      </div>

      <p
        aria-live="polite"
        className={`shrink-0 min-h-11 rounded-xl border px-3 py-2 flex items-center justify-center text-center text-xs sm:text-sm font-semibold ${
          quizSolved
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
            : quizChecked && activeTab === 'quiz'
              ? difference > 0
                ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
                : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
              : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
        }`}
      >
        {feedback}
      </p>
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

