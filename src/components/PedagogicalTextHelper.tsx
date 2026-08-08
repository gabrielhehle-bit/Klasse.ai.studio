import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, MessageSquare, ArrowRight, Copy, Check, Wand2, X } from 'lucide-react';
import Markdown from 'react-markdown';

interface PedagogicalTextHelperProps {
  initialText?: string;
  onApply?: (optimizedText: string) => void;
  onClose?: () => void;
  isOpen: boolean;
}

export const PedagogicalTextHelper: React.FC<PedagogicalTextHelperProps> = ({
  initialText = '',
  onApply,
  onClose,
  isOpen
}) => {
  const [inputText, setInputText] = useState(initialText);
  const [optimizedText, setOptimizedText] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const optimizeText = async () => {
    if (!inputText.trim()) return;
    
    setIsOptimizing(true);
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'askAI',
          params: {
            modusId: 'ki-pedagogical-helper',
            userMessage: inputText
          }
        })
      });
      
      const data = await response.json();
      if (data.text) {
        setOptimizedText(data.text);
      }
    } catch (error) {
      console.error('Fehler bei der Text-Optimierung:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(optimizedText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleApply = () => {
    if (onApply && optimizedText) {
      onApply(optimizedText);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl border border-slate-200 "
        >
          {/* Header */}
          <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-[1.125rem] leading-normal font-black tracking-tight leading-none">Beurteilungs-Helfer</h3>
                <p className="text-[0.75rem] leading-tight text-indigo-100 font-bold mt-1">Pädagogischer Text-Baukasten (KI)</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-8 space-y-6">
            {/* Input Section */}
            <div className="space-y-2">
              <label className="text-[0.625rem] uppercase font-black tracking-widest text-slate-400 px-1">Deine Beobachtung (Stichpunkte)</label>
              <div className="relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="z.B. stört oft im Unterricht, rechnet aber schnell und richtig..."
                  className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all min-h-[120px] font-bold text-slate-700 resize-none"
                />
                <button
                  onClick={optimizeText}
                  disabled={!inputText.trim() || isOptimizing}
                  className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-[0.75rem] leading-tight font-black rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                >
                  {isOptimizing ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Wand2 size={14} />
                    </motion.div>
                  ) : (
                    <Wand2 size={14} />
                  )}
                  Optimieren
                </button>
              </div>
            </div>

            {/* Animation Bridge */}
            {isOptimizing && (
              <div className="flex justify-center py-4">
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 1, 0.3]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="flex gap-1"
                >
                  <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                  <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                  <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                </motion.div>
              </div>
            )}

            {/* Result Section */}
            <AnimatePresence>
              {optimizedText && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <label className="text-[0.625rem] uppercase font-black tracking-widest text-emerald-500 px-1">Wertschätzende Übersetzung</label>
                  <div className="p-6 bg-emerald-50/50 rounded-2xl border-2 border-emerald-100 text-slate-800 font-bold leading-relaxed relative group markdown-body">
                    <Markdown>{optimizedText}</Markdown>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-emerald-200 text-emerald-600 text-[0.625rem] font-black rounded-lg hover:bg-emerald-50 transition-colors"
                      >
                        {copySuccess ? <Check size={12} /> : <Copy size={12} />}
                        {copySuccess ? 'Kopiert!' : 'Kopieren'}
                      </button>
                      {onApply && (
                        <button
                          onClick={handleApply}
                          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white text-[0.625rem] font-black rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          <ArrowRight size={12} /> Übernehmen
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-2 text-slate-400">
              <MessageSquare size={14} />
              <span className="text-[0.625rem] font-bold uppercase tracking-wider">KI-gestützter Formulierungshilfe</span>
            </div>
            <button
              onClick={onClose}
              className="text-[0.75rem] leading-tight font-black text-slate-500 hover:text-slate-700 uppercase tracking-widest px-4 py-2 hover:bg-slate-100 rounded-xl transition-all"
            >
              Abbrechen
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
