import React, { useState } from 'react';
import { Lightbulb, Brain, Divide, Smile, Plus, Trash2, ChevronRight, Check, Sparkles } from 'lucide-react';
import { MOCK_RIDDLE_DB, Riddle, RiddleCategory, MatheLevel } from '../data/riddles';
import { useApp } from '../context/AppContext';

export default function MorningRiddleWidget() {
  const { app, setApp } = useApp();
  
  // State for the main navigation
  const [activeCategory, setActiveCategory] = useState<RiddleCategory>('deutsch');
  const [activeMathLevel, setActiveMathLevel] = useState<MatheLevel>(1);
  
  // Interaction states
  const [currentRiddle, setCurrentRiddle] = useState<Riddle | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [addMode, setAddMode] = useState(false);
  
  // Custom add state
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');

  // Get combined riddles (preset + custom from Global App state if any)
  const allRiddles = [...MOCK_RIDDLE_DB, ...(app.customRiddles || [])];
  
  // Filter by category
  const filteredRiddles = allRiddles.filter(r => {
    if (activeCategory === 'mathe') {
      return r.category === 'mathe' && r.level === activeMathLevel;
    }
    return r.category === activeCategory;
  });

  const generateRandomRiddle = () => {
    if (filteredRiddles.length === 0) return;
    const randomIdx = Math.floor(Math.random() * filteredRiddles.length);
    setCurrentRiddle(filteredRiddles[randomIdx]);
    setShowAnswer(false);
  };

  const handleAddCustomRiddle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    
    const newRiddle: Riddle = {
      id: `custom-${Date.now()}`,
      category: activeCategory,
      level: activeCategory === 'mathe' ? activeMathLevel : undefined,
      question: newQuestion,
      answer: newAnswer,
      isCustom: true
    };
    
    setApp(prev => ({
      ...prev,
      customRiddles: [...(prev.customRiddles || []), newRiddle]
    }));
    
    setNewQuestion('');
    setNewAnswer('');
    setAddMode(false);
  };

  const handleDeleteRiddle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setApp(prev => ({
      ...prev,
      customRiddles: (prev.customRiddles || []).filter(r => r.id !== id)
    }));
    if (currentRiddle?.id === id) {
      setCurrentRiddle(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/40 text-slate-100 p-5 shadow-2xl relative  font-sans">
      
      {/* Background Ornaments */}
      <div className="absolute -top-32 -right-32 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700 shadow-xl">
            <Lightbulb size={22} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-[1.125rem] leading-normal font-black tracking-tight text-white">Morgen-Rätsel</h2>
            <p className="text-slate-400 font-bold text-[0.625rem] uppercase tracking-widest mt-0.5">Wort, Mathe, Logik & Spaß</p>
          </div>
        </div>
        
        <button 
          onClick={() => setAddMode(!addMode)}
          className={`px-4 py-2 text-[0.75rem] leading-tight font-black uppercase tracking-widest rounded-xl transition-all border ${
            addMode 
              ? 'bg-rose-500 text-white border-rose-600' 
              : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
          }`}
        >
          {addMode ? 'Abbrechen' : '+ Neu'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-800/80 p-1 rounded-2xl border border-slate-700/50 mb-4 shrink-0 z-10 w-fit">
        {[
          { id: 'deutsch', label: 'Wort des Tages', icon: Brain, color: 'text-emerald-400' },
          { id: 'mathe', label: 'Rechnung', icon: Divide, color: 'text-indigo-400' },
          { id: 'logik', label: 'Logik', icon: Lightbulb, color: 'text-amber-400' },
          { id: 'spass', label: 'Spaß', icon: Smile, color: 'text-pink-400' },
          { id: 'funke', label: 'Kreativer Funke', icon: Sparkles, color: 'text-yellow-400' }
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => {
              setActiveCategory(cat.id as RiddleCategory);
              setCurrentRiddle(null);
              setAddMode(false);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-wider transition-all"
            style={{
              backgroundColor: activeCategory === cat.id ? '#334155' : 'transparent',
              color: activeCategory === cat.id ? '#ffffff' : '#94a3b8'
            }}
          >
            <cat.icon size={14} className={activeCategory === cat.id ? cat.color : ''} />
            {cat.label}
          </button>
        ))}
      </div>

      {activeCategory === 'mathe' && (
        <div className="flex gap-2 mb-4 z-10">
          {[1, 2, 3, 4].map(l => (
            <button
              key={l}
              onClick={() => {
                setActiveMathLevel(l as MatheLevel);
                setCurrentRiddle(null);
                setAddMode(false);
              }}
              className={`px-4 py-1.5 rounded-xl text-[0.625rem] font-black uppercase tracking-widest border transition-all ${
                activeMathLevel === l
                  ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg'
                  : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              Klasse {l}
            </button>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 bg-slate-800/50 rounded-[1.5rem] border border-slate-700/50 p-5 flex flex-col items-center justify-center relative overflow-y-auto custom-scrollbar z-10">
        
        {addMode ? (
          <form onSubmit={handleAddCustomRiddle} className="w-full max-w-xl mx-auto space-y-6">
            <div>
              <h3 className="text-[1.25rem] leading-normal font-black text-white mb-2">Eigenes Rätsel / Wort hinzufügen</h3>
              <p className="text-slate-400 text-[0.75rem] leading-tight font-bold uppercase tracking-wider">Kategorie: {activeCategory} {activeCategory === 'mathe' && `- Klasse ${activeMathLevel}`}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[0.75rem] leading-tight font-black uppercase text-slate-400 tracking-wider block mb-2">
                  {activeCategory === 'deutsch' ? 'Wort' : activeCategory === 'mathe' ? 'Rechnung' : 'Frage / Rätsel'}
                </label>
                <input
                  type="text"
                  value={newQuestion}
                  onChange={e => setNewQuestion(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 p-4 rounded-xl text-white font-bold text-[1.125rem] leading-normal focus:border-indigo-500 outline-none"
                  placeholder={activeCategory === 'deutsch' ? 'z.B. Toleranz' : '...'}
                  required
                />
              </div>
              <div>
                <label className="text-[0.75rem] leading-tight font-black uppercase text-slate-400 tracking-wider block mb-2">
                  Auflösung / Bedeutung
                </label>
                <textarea
                  value={newAnswer}
                  onChange={e => setNewAnswer(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 p-4 rounded-xl text-white font-bold text-[1rem] leading-normal focus:border-indigo-500 outline-none resize-none"
                  rows={3}
                  required
                />
              </div>
            </div>
            <button type="submit" className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase tracking-widest text-[0.875rem] leading-snug transition-all shadow-lg active:scale-95">
              Speichern & Zurück
            </button>
          </form>
        ) : (
          <>
            {!currentRiddle ? (
              <div className="text-center space-y-4">
                <div className="text-5xl mb-2">
                  {activeCategory === 'deutsch' ? '📖' : activeCategory === 'mathe' ? '🧮' : activeCategory === 'logik' ? '🧩' : activeCategory === 'funke' ? '✨' : '🤡'}
                </div>
                <h3 className="text-[1.25rem] leading-normal font-black text-slate-300">
                  {activeCategory === 'funke' ? 'Bereit für den 3-Minuten Stunden-Ausklang?' : 'Bereit für das Morgen-Rätsel?'}
                </h3>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[0.75rem] leading-tight">
                  ( {filteredRiddles.length} {activeCategory === 'funke' ? 'Phänomene & Paradoxien' : 'Rätsel'} in der Datenbank )
                </p>
                <button
                  onClick={generateRandomRiddle}
                  className="mx-auto mt-2 px-6 py-4 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-2xl text-[1rem] leading-normal font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  Los geht's! <ChevronRight size={18} />
                </button>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col justify-center max-w-2xl mx-auto space-y-3.5">
                
                {currentRiddle.isCustom && (
                  <div className="absolute top-4 right-4 group">
                    <button 
                      onClick={(e) => handleDeleteRiddle(currentRiddle.id, e)}
                      className="w-10 h-10 bg-slate-900/50 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-full flex items-center justify-center transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
                
                <div className="text-center space-y-2">
                  <span className="inline-flex px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-[0.5625rem] font-black uppercase tracking-widest text-indigo-400">
                    {activeCategory} {currentRiddle.level ? `- Klasse ${currentRiddle.level}` : ''}
                  </span>
                  
                  <h3 className="text-[1.25rem] leading-normal md:text-[1.5rem] leading-normal font-black leading-tight text-white drop-shadow-md pb-2 leading-relaxed">
                    {currentRiddle.question}
                  </h3>
                </div>

                <div className="flex flex-col items-center">
                  {!showAnswer ? (
                    <button
                      onClick={() => setShowAnswer(true)}
                      className="px-6 py-3.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/50 text-amber-500 rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                    >
                      Auflösung anzeigen
                    </button>
                  ) : (
                    <div className="animate-fadeIn w-full bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-2xl text-center space-y-2">
                      <span className="text-[0.625rem] font-black uppercase text-emerald-500 tracking-wider flex items-center justify-center gap-1.5">
                        <Check size={14} /> Auflösung
                      </span>
                      <p className="text-[1.125rem] leading-normal md:text-[1.25rem] leading-normal font-bold text-emerald-50 leading-relaxed max-w-2xl mx-auto">
                        {currentRiddle.answer}
                      </p>
                    </div>
                  )}
                </div>

                {showAnswer && (
                  <button
                    onClick={generateRandomRiddle}
                    className="mx-auto mt-6 px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-1.5"
                  >
                    Nächstes Rätsel <ChevronRight size={12} />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
