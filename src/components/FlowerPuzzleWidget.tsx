import React, { useState, useEffect } from "react";
import { Flower, RefreshCw, Eye, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { generateHangmanWord } from "../services/aiService";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ".split("");

interface FlowerPuzzleWidgetProps {
  currentTopic?: string;
  stufe?: number;
}

const FlowerPuzzleWidget: React.FC<FlowerPuzzleWidgetProps> = ({ currentTopic, stufe = 4 }) => {
  const [word, setWord] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const MAX_MISTAKES = 6;

  const handleSuggestAIWord = async () => {
    if (!currentTopic) return;
    setIsGenerating(true);
    try {
      const generatedWord = await generateHangmanWord(currentTopic, stufe);
      if (generatedWord) {
        const input = document.getElementById("flower-word-input") as HTMLInputElement;
        if (input) input.value = generatedWord;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    const input = (document.getElementById("flower-word-input") as HTMLInputElement).value;
    if (input.trim()) {
      setWord(input.trim().toUpperCase());
      setGuesses([]);
      setMistakes(0);
      setIsPlaying(true);
    }
  };

  const handleGuess = (letter: string) => {
    if (guesses.includes(letter) || mistakes >= MAX_MISTAKES || isWon) return;
    
    setGuesses(prev => [...prev, letter]);
    if (!word.includes(letter)) {
      setMistakes(prev => prev + 1);
    }
  };

  const isWon = word.length > 0 && word.split("").every(l => l === " " || l === "-" || guesses.includes(l));
  const isLost = mistakes >= MAX_MISTAKES;

  // Flower SVG based on mistakes (less mistakes = more petals)
  const renderFlower = () => {
    const petals = 6 - mistakes;
    
    return (
      <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto mt-4 mb-4 flex items-center justify-center">
        {/* Stem */}
        <div className="absolute bottom-0 w-2 h-12 sm:h-16 bg-emerald-500 rounded-full translate-y-6 sm:translate-y-8" />
        
        {/* Leaves */}
        <div className={`absolute bottom-0 right-10 sm:right-14 w-6 h-3 sm:w-8 sm:h-4 bg-emerald-400 rounded-full origin-right -rotate-45 translate-y-3 sm:translate-y-4 transition-all duration-500 ${mistakes > 4 ? 'scale-0' : 'scale-100'}`} />
        <div className={`absolute bottom-0 left-10 sm:left-14 w-6 h-3 sm:w-8 sm:h-4 bg-emerald-400 rounded-full origin-left rotate-45 translate-y-1 sm:translate-y-2 transition-all duration-500 ${mistakes > 5 ? 'scale-0' : 'scale-100'}`} />

        {/* Petals */}
        <AnimatePresence>
          {Array.from({ length: 6 }).map((_, i) => {
            const angle = i * 60;
            const isVisible = i < petals;
            if (!isVisible) return null;
            return (
              <motion.div
                key={`petal-${i}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, rotate: angle }}
                exit={{ scale: 0, opacity: 0, y: 20 }}
                className="absolute w-8 h-8 sm:w-12 sm:h-12 bg-pink-400 rounded-full origin-bottom-right -translate-x-4 -translate-y-4 sm:-translate-x-6 sm:-translate-y-6"
              />
            );
          })}
        </AnimatePresence>

        {/* Center */}
        <div className="absolute w-6 h-6 sm:w-10 sm:h-10 bg-yellow-400 rounded-full z-10 border-2 sm:border-4 border-yellow-500" />
        
        {isLost && (
          <div className="absolute inset-0 flex items-center justify-center z-20 text-3xl sm:text-4xl">
            🥀
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col h-full relative overflow-hidden min-h-[360px]">
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-pink-50 flex items-center justify-center text-pink-500">
            <Flower size={20} />
          </div>
          <div>
            <h3 className="text-[0.75rem] font-black uppercase tracking-widest text-slate-400 line-clamp-1">Blumen-Rätsel</h3>
            <p className="text-[0.625rem] text-slate-400/80 font-bold uppercase tracking-widest">Kindgerechtes Hangman</p>
          </div>
        </div>
        
        {isPlaying && (
          <button 
            onClick={() => setIsPlaying(false)}
            className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full overflow-hidden">
        {!isPlaying ? (
           <form onSubmit={handleStart} className="flex flex-col gap-2 sm:gap-4 flex-1 justify-center w-full max-w-sm mx-auto">
             <div className="text-center space-y-1 sm:space-y-2 mb-1 sm:mb-2">
                <span className="text-3xl sm:text-4xl inline-block mb-1 sm:mb-2">🌸</span>
                <h4 className="text-[0.875rem] sm:text-[1rem] font-black text-slate-700">Neues Wort</h4>
                <p className="text-[0.625rem] sm:text-[0.75rem] text-slate-500 font-medium leading-relaxed px-2 sm:px-4">Finden deine Schüler das Wort, bevor die Blume verblüht?</p>
             </div>
             <input
               id="flower-word-input"
               type="password"
               placeholder="Geheimes Wort eingeben..."
               className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-50 border-2 border-slate-100 rounded-xl sm:rounded-2xl text-center font-bold text-slate-700 outline-none focus:border-pink-200 transition-colors text-[0.875rem] sm:text-base"
               autoComplete="off"
             />
             
             {currentTopic && (
               <button
                 type="button"
                 onClick={handleSuggestAIWord}
                 disabled={isGenerating}
                 className="flex justify-center items-center gap-1.5 w-full py-2 bg-indigo-50 text-indigo-600 rounded-lg sm:rounded-xl font-bold uppercase tracking-wider text-[0.55rem] sm:text-[0.6875rem] hover:bg-indigo-100 transition-colors disabled:opacity-50"
               >
                 {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                 {isGenerating ? "Generiert..." : "KI-Wort vorschlagen"}
               </button>
             )}

             <button
               type="submit"
               className="w-full py-2 sm:py-3 bg-pink-500 text-white rounded-xl sm:rounded-2xl font-bold tracking-wider uppercase text-[0.65rem] sm:text-[0.75rem] hover:bg-pink-600 transition-colors shadow-lg shadow-pink-500/20 active:scale-95"
             >
               Spiel Starten
             </button>
           </form>
        ) : (
          <div className="flex flex-col items-center justify-between flex-1 w-full relative">
            <div className="flex-shrink-0 scale-75 sm:scale-100 transition-transform origin-top">
                {renderFlower()}
            </div>
            
            <div className="flex flex-wrap justify-center gap-1 my-2 max-w-full overflow-x-auto pb-1">
              {word.split("").map((letter, i) => (
                <div 
                  key={i} 
                  className={`w-4 h-6 sm:w-8 sm:h-10 border-b-[2px] sm:border-b-[3px] flex items-end justify-center pb-0 sm:pb-1 text-sm sm:text-lg font-black ${
                    letter === " " || letter === "-" ? "border-transparent" : "border-slate-300"
                  } ${(guesses.includes(letter) || isLost) ? "text-slate-700" : "text-transparent"}`}
                >
                  {letter === " " ? "\u00A0" : letter}
                </div>
              ))}
            </div>

            {isWon && (
              <div className="mb-2 text-center px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg font-bold animate-bounce-short text-[0.75rem] sm:text-[0.875rem]">
                Gewonnen! 🌟
              </div>
            )}

            {isLost && (
              <div className="mb-2 text-center px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg font-bold text-[0.75rem] sm:text-[0.875rem]">
                Das Wort war: {word} 🥀
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-0.5 sm:gap-1 w-full max-w-sm mt-auto z-10 pb-1">
              {ALPHABET.map((letter) => {
                const isGuessed = guesses.includes(letter);
                const isCorrect = isGuessed && word.includes(letter);
                const isWrong = isGuessed && !word.includes(letter);
                
                return (
                  <button
                    key={letter}
                    disabled={isGuessed || isWon || isLost}
                    onClick={() => handleGuess(letter)}
                    className={`flex-shrink-0 flex items-center justify-center w-5 h-6 sm:w-7 sm:h-8 rounded-md text-[0.65rem] sm:text-[0.75rem] font-bold transition-all ${
                      isCorrect ? "bg-emerald-500 text-white border-emerald-600 shadow-inner" :
                      isWrong ? "bg-slate-200 text-slate-400/50" :
                      "bg-white border sm:border-2 border-slate-100 text-slate-600 hover:border-pink-200 hover:text-pink-600 shadow-sm active:scale-95 cursor-pointer"
                    } ${isGuessed ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlowerPuzzleWidget;
