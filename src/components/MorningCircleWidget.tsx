import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, BookOpen, Calculator, Sparkles, Settings2, Plus, Trash2, X, ChevronRight, ChevronLeft, Gamepad2, MessageSquare, Wind } from 'lucide-react';
import { MorningWidget, MorningWidgetType } from '../types';
import { UNTERRICHTSMODUS_THEMES } from '../lib/unterrichtsmodusThemes';

export default function MorningCircleWidget() {
  const { app, setApp } = useApp();
  const [activeCategory, setActiveCategory] = useState<MorningWidgetType>('deutsch');
  const [currentWidget, setCurrentWidget] = useState<MorningWidget | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  // Extract dynamic theme settings
  const currentThemeId = app.unterrichtsmodus_theme || app.theme || 'classic_light';
  const currentTheme = UNTERRICHTSMODUS_THEMES[currentThemeId] || UNTERRICHTSMODUS_THEMES.classic_light;

  const widgets = app.morningWidgets || [];
  
  // Pick random on category change
  useEffect(() => {
    pickRandomWidget(activeCategory);
  }, [activeCategory, app.morningWidgets]);

  const pickRandomWidget = (cat: MorningWidgetType) => {
    const available = widgets.filter(w => w.type === cat && (w.stufe === 'all' || w.stufe === app.stufe));
    if (available.length > 0) {
      const idx = Math.floor(Math.random() * available.length);
      setCurrentWidget(available[idx]);
    } else {
      setCurrentWidget(null);
    }
    setIsRevealed(false);
  };

  const getCategoryTheme = (cat: MorningWidgetType) => {
    switch(cat) {
      case 'deutsch': return { icon: <BookOpen size={24} />, color: 'bg-emerald-500', text: 'Wort des Tages' };
      case 'mathe': return { icon: <Calculator size={24} />, color: 'bg-blue-500', text: 'Blitzrechnen' };
      case 'logik': return { icon: <Lightbulb size={24} />, color: 'bg-amber-500', text: 'Zahlen & Logik' };
      case 'spass': return { icon: <Sparkles size={24} />, color: 'bg-rose-500', text: 'Spaß & Witze' };
      case 'spiel': return { icon: <Gamepad2 size={24} />, color: 'bg-purple-500', text: '5-Min-Spiel' };
      case 'diskussion': return { icon: <MessageSquare size={24} />, color: 'bg-indigo-500', text: 'Frage des Tages' };
      case 'achtsamkeit': return { icon: <Wind size={24} />, color: 'bg-sky-500', text: 'Achtsamkeit' };
    }
  };

  const theme = getCategoryTheme(activeCategory);

  return (
    <>
      <div className="rounded-[3rem] p-8 lg:p-10 border col-span-1 md:col-span-3 lg:col-span-12 xl:col-span-12 flex flex-col min-h-[300px] relative  bg-transparent" style={{ borderColor: currentTheme.colors.border }}>
        
        {/* Header Tabs */}
        <div className="flex flex-wrap items-center justify-between mb-8 gap-4 relative z-10">
          <div className="flex flex-wrap gap-2">
            {(['diskussion', 'mathe', 'spiel', 'achtsamkeit', 'logik', 'deutsch', 'spass'] as MorningWidgetType[]).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="px-4 py-2 rounded-full text-[0.75rem] leading-tight font-black uppercase tracking-widest transition-all shadow-sm border cursor-pointer"
                style={{
                  backgroundColor: activeCategory === cat ? currentTheme.colors.accent : 'transparent',
                  color: activeCategory === cat ? currentTheme.colors.buttonText : currentTheme.colors.textSecondary,
                  borderColor: activeCategory === cat ? currentTheme.colors.accent : currentTheme.colors.border
                }}
              >
                {getCategoryTheme(cat).text}
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => setIsManagerOpen(true)}
            className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all border cursor-pointer"
            style={{ backgroundColor: `${currentTheme.colors.textPrimary}05`, borderColor: currentTheme.colors.border, color: currentTheme.colors.textSecondary }}
          >
            <Settings2 size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentWidget ? currentWidget.id : 'empty'}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="w-full max-w-4xl"
            >
              {currentWidget ? (
                <div 
                  onClick={() => setIsRevealed(!isRevealed)}
                  className="cursor-pointer group p-8 lg:p-16 rounded-[2.5rem] md:rounded-[3.5rem] border-2 transition-all duration-500 relative "
                  style={{
                    backgroundColor: isRevealed ? currentTheme.colors.accent : `${currentTheme.colors.textPrimary}05`,
                    borderColor: isRevealed ? currentTheme.colors.accent : currentTheme.colors.border,
                    color: isRevealed ? currentTheme.colors.buttonText : currentTheme.colors.textPrimary
                  }}
                >
                  <div className="absolute top-0 right-0 p-8 opacity-5 scale-[2] pointer-events-none transition-all duration-500 text-black">
                    {theme.icon}
                  </div>
                  
                  <div className="relative z-10">
                    <h3 className="text-4xl md:text-5xl lg:text-7xl font-black italic tracking-tighter leading-tight mb-8">
                      {currentWidget.frage}
                    </h3>
                    
                    <AnimatePresence>
                      {isRevealed && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, scale: 0.9 }}
                          animate={{ opacity: 1, height: 'auto', scale: 1 }}
                          className="pt-8 border-t border-white/20 mt-8"
                        >
                          <p className="text-[1.25rem] leading-normal md:text-[1.5rem] leading-normal lg:text-[1.875rem] leading-tight font-bold leading-snug">
                            {currentWidget.loesung}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {!isRevealed && (
                      <div className="text-[0.625rem] font-black uppercase tracking-[0.2em] transition-colors mt-8" style={{ color: currentTheme.colors.textMuted }}>
                        Klicken zum Auflösen
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center" style={{ color: currentTheme.colors.textMuted }}>
                  Leider keine passenden Einträge für diese Kategorie und Jahrgansstufe gefunden.
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          
          <div className="mt-8">
            <button 
              onClick={() => pickRandomWidget(activeCategory)}
              className="px-6 py-3 rounded-full font-bold text-[0.875rem] leading-snug transition-all flex items-center gap-2 border cursor-pointer"
              style={{ backgroundColor: `${currentTheme.colors.accent}10`, color: currentTheme.colors.accent, borderColor: `${currentTheme.colors.accent}20` }}
            >
              Nächstes Rätsel
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {isManagerOpen && (
        <MorningWidgetManager 
          onClose={() => setIsManagerOpen(false)} 
        />
      )}
    </>
  );
}

function MorningWidgetManager({ onClose }: { onClose: () => void }) {
  const { app, setApp } = useApp();
  const [filterCat, setFilterCat] = useState<MorningWidgetType | 'all'>('all');
  const [newFrage, setNewFrage] = useState('');
  const [newLoesung, setNewLoesung] = useState('');
  const [newCat, setNewCat] = useState<MorningWidgetType>('deutsch');
  const [newStufe, setNewStufe] = useState<string>('all');

  const widgets = app.morningWidgets || [];
  const filtered = widgets.filter(w => filterCat === 'all' || w.type === filterCat);

  const handleDelete = (id: string) => {
    setApp(prev => ({
      ...prev,
      morningWidgets: (prev.morningWidgets || []).filter(w => w.id !== id)
    }));
  };

  const handleAdd = () => {
    if (!newFrage.trim() || !newLoesung.trim()) return;
    const newWidget: MorningWidget = {
      id: Date.now().toString(),
      type: newCat,
      stufe: newStufe === 'all' ? 'all' : parseInt(newStufe) || 1,
      frage: newFrage.trim(),
      loesung: newLoesung.trim()
    };
    setApp(prev => ({
      ...prev,
      morningWidgets: [newWidget, ...(prev.morningWidgets || [])]
    }));
    setNewFrage('');
    setNewLoesung('');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl max-h-[90vh] bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl  flex flex-col"
      >
        <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-2xl bg-accent text-white flex items-center justify-center">
                <Settings2 size={18} />
             </div>
             <div>
                <h2 className="text-[1.125rem] leading-normal font-black text-slate-900">Morgenkreis Widgets</h2>
                <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">Datenbank verwalten</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 active:scale-95 transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8 bg-slate-50/50">
          
          {/* Add Form */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-[0.75rem] leading-tight font-black uppercase tracking-widest text-slate-400">Neuen Eintrag erstellen</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-1">
                <select 
                  value={newCat} 
                  onChange={e => setNewCat(e.target.value as MorningWidgetType)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-[0.875rem] leading-snug font-bold outline-none"
                >
                  <option value="diskussion">🗣️ Frage des Tages</option>
                  <option value="mathe">🧮 Blitzrechnen</option>
                  <option value="spiel">🎲 5-Minuten-Spiel</option>
                  <option value="achtsamkeit">🧘 Achtsamkeit</option>
                  <option value="deutsch">German (Wort des Tages)</option>
                  <option value="logik">🧩 Logik & Rätsel</option>
                  <option value="spass">🤡 Spaß (Witze)</option>
                </select>
              </div>
              <div className="md:col-span-1">
                <select 
                  value={newStufe} 
                  onChange={e => setNewStufe(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-[0.875rem] leading-snug font-bold outline-none"
                >
                  <option value="all">Alle Stufen</option>
                  <option value="1">1. Klasse</option>
                  <option value="2">2. Klasse</option>
                  <option value="3">3. Klasse</option>
                  <option value="4">4. Klasse</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <input 
                  type="text" 
                  placeholder="Frage / Wort / Rechnung" 
                  value={newFrage}
                  onChange={e => setNewFrage(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-[0.875rem] leading-snug font-bold outline-none"
                />
              </div>
              <div className="md:col-span-3">
                <input 
                  type="text" 
                  placeholder="Lösung / Erklärung" 
                  value={newLoesung}
                  onChange={e => setNewLoesung(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-[0.875rem] leading-snug font-bold outline-none"
                />
              </div>
              <div className="md:col-span-1">
                <button 
                  onClick={handleAdd}
                  disabled={!newFrage.trim() || !newLoesung.trim()}
                  className="w-full h-12 rounded-xl bg-slate-900 text-white font-black text-[0.75rem] leading-tight uppercase tracking-widest disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Add
                </button>
              </div>
            </div>
          </div>

          {/* List and Filters */}
          <div className="space-y-4">
             <div className="flex flex-wrap gap-2 mb-4">
                {(['all', 'diskussion', 'mathe', 'spiel', 'achtsamkeit', 'logik', 'deutsch', 'spass'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFilterCat(cat)}
                    className={`px-3 py-1.5 rounded-lg text-[0.625rem] font-black uppercase tracking-widest transition-all ${filterCat === cat ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 hover:bg-slate-100 border border-slate-100'}`}
                  >
                    {cat}
                  </button>
                ))}
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {filtered.map(w => (
                 <div key={w.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative group space-y-2">
                    <button 
                      onClick={() => handleDelete(w.id)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                    >
                       <Trash2 size={14} />
                    </button>
                    <div className="flex items-center gap-2">
                       <span className={`px-2 py-0.5 rounded text-[0.5rem] font-black uppercase tracking-widest
                         ${w.type === 'deutsch' ? 'bg-emerald-50 text-emerald-600' :
                           w.type === 'mathe' ? 'bg-blue-50 text-blue-600' : 
                           w.type === 'logik' ? 'bg-amber-50 text-amber-600' : 
                           w.type === 'spiel' ? 'bg-purple-50 text-purple-600' :
                           w.type === 'diskussion' ? 'bg-indigo-50 text-indigo-600' :
                           w.type === 'achtsamkeit' ? 'bg-sky-50 text-sky-600' :
                           'bg-rose-50 text-rose-600'}`}>
                         {w.type}
                       </span>
                       <span className="text-[0.5rem] font-black uppercase tracking-widest text-slate-400">
                         {w.stufe === 'all' ? 'Alle' : `Kl. ${w.stufe}`}
                       </span>
                    </div>
                    <div className="font-bold text-slate-900 text-[0.875rem] leading-snug leading-snug">{w.frage}</div>
                    <div className="text-[0.75rem] leading-tight text-slate-500 font-medium leading-snug">{w.loesung}</div>
                 </div>
               ))}
             </div>
          </div>
          
        </div>
      </motion.div>
    </div>
  );
}
