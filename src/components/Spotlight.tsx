
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Search, Users, Calendar, ClipboardList, BarChart3, 
  Settings, Zap, Command, X, ArrowUpRight, Plus, 
  Notebook, LayoutDashboard, Play, Map as MapIcon,
  Bot, FileText, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SpotlightItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  section: string;
  action: () => void;
  highlight?: boolean;
}

export default function Spotlight() {
  const { app, setPage, setApp } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        setQuery('');
        setSelectedIndex(0);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const pages: (Omit<SpotlightItem, 'action'> & { id: string })[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, section: 'Navigation' },
    { id: 'cockpit', label: 'Live Cockpit', icon: <Play size={18} />, section: 'Navigation', highlight: true },
    { id: 'schueler', label: 'Schülerliste', icon: <Users size={18} />, section: 'Navigation' },
    { id: 'noten', label: 'Notenmappe', icon: <BarChart3 size={18} />, section: 'Navigation' },
    { id: 'verhalten', label: 'Verhalten & Notizen', icon: <Notebook size={18} />, section: 'Navigation' },
    { id: 'wochenplanung', label: 'Wochenplan', icon: <Calendar size={18} />, section: 'Navigation' },
    { id: 'stunden', label: 'Stundenentwürfe', icon: <ClipboardList size={18} />, section: 'Navigation' },
    { id: 'sitzplan', label: 'Sitzplan', icon: <MapIcon size={18} />, section: 'Navigation' },
    { id: 'materialien', label: 'Materialbibliothek', icon: <Play size={18} />, section: 'Tools' },
    { id: 'jahresplanung', label: 'Jahresplanung', icon: <Calendar size={18} />, section: 'Planung' },
    { id: 'ki-helfer', label: 'Pädagogik KI', icon: <Bot size={18} />, section: 'KI-Assistenten' },
    { id: 'ki-elternbrief', label: 'Elternbrief KI', icon: <FileText size={18} />, section: 'KI-Assistenten' },
    { id: 'ki-differenzierung', label: 'Differenzierung KI', icon: <Layers size={18} />, section: 'KI-Assistenten' },
    { id: 'ki-beurteilung', label: 'Verbal-KI', icon: <Zap size={18} />, section: 'KI-Assistenten' },
  ];

  const students: SpotlightItem[] = (app.schueler || []).map(s => ({
    id: `student-${s.id}`,
    label: `${s.vorname} ${s.nachname}`,
    icon: <Users size={18} />,
    section: 'Schüler:innen',
    action: () => {
       setApp(prev => ({ ...prev, selectedStudentId: s.id }));
       setPage('schueler');
    }
  }));

  const actions: SpotlightItem[] = [
    { id: 'toggle-edit', label: 'Dashboard anpassen', icon: <Settings size={18} />, section: 'Aktionen', action: () => setApp(prev => ({ ...prev, dashboardEditMode: !prev.dashboardEditMode })) },
  ];

  const allItems: SpotlightItem[] = [
    ...pages.map(p => ({ ...p, action: () => setPage(p.id) })),
    ...students,
    ...actions
  ];

  const filteredItems = allItems.filter(item => 
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.section.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (item: SpotlightItem) => {
    item.action();
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex]);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000]  flex items-start justify-center pt-[15vh] px-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-[0_30px_90px_rgba(0,0,0,0.5)] border border-slate-100 "
              onClick={e => e.stopPropagation()}
              onKeyDown={handleKeyDown}
            >
              <div className="relative group">
                <div className="absolute left-8 top-1/2 -translate-y-1/2 flex items-center gap-2 text-slate-300">
                  <Search size={22} className="group-focus-within:text-emerald-500 transition-colors" />
                </div>
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Inhalte suchen, Seiten wechseln oder Schüler finden..."
                  className="w-full h-20 pl-20 pr-8 bg-transparent text-[1rem] font-medium border-b border-slate-50 outline-none placeholder:text-slate-200"
                  value={query}
                  onChange={e => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                />
                <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-2">
                   <div className="flex items-center gap-1 text-[0.5625rem] font-black uppercase text-slate-300 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                      <Command size={10} />
                      <span>K</span>
                   </div>
                   <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-50 rounded-lg text-slate-300 transition-colors">
                      <X size={18} />
                   </button>
                </div>
              </div>

              <div className="max-h-[50vh] overflow-y-auto no-scrollbar py-4 px-4">
                {filteredItems.length === 0 ? (
                  <div className="py-20 text-center space-y-4">
                     <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-4xl mx-auto opacity-50">🔍</div>
                     <p className="text-slate-400 font-bold text-[0.875rem]">Keine Ergebnisse für "{query}"</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Group by sections */}
                    {['Navigation', 'Planung', 'Tools', 'KI-Assistenten', 'Schüler:innen', 'Aktionen'].map(section => {
                      const sectionItems = filteredItems.filter(item => item.section === section);
                      if (sectionItems.length === 0) return null;
                      
                      return (
                        <div key={section} className="space-y-1">
                          <h4 className="px-4 text-[0.625rem] font-black uppercase tracking-[0.25em] text-slate-300 mb-2">{section}</h4>
                          {sectionItems.map((item, idx) => {
                            const globalIdx = filteredItems.indexOf(item);
                            const isSelected = globalIdx === selectedIndex;
                            
                            return (
                              <button
                                key={item.id}
                                className={`w-full flex items-center justify-between gap-4 px-4 py-4 rounded-2xl transition-all ${isSelected ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'hover:bg-slate-50 text-slate-600'}`}
                                onClick={() => handleSelect(item)}
                                onMouseEnter={() => setSelectedIndex(globalIdx)}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isSelected ? 'bg-white/20' : item.highlight ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
                                    {item.icon}
                                  </div>
                                  <span className="text-[0.875rem] font-bold tracking-tight">{item.label}</span>
                                </div>
                                {isSelected && (
                                  <div className="flex items-center gap-1 opacity-60">
                                    <span className="text-[0.625rem] font-black uppercase">Auswählen</span>
                                    <ArrowUpRight size={14} />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-4 px-8 border-t border-slate-100 flex items-center gap-6">
                 <div className="flex items-center gap-1.5 text-slate-400">
                    <div className="p-1 bg-white border border-slate-200 rounded shadow-sm">
                       <ArrowUpRight size={10} className="rotate-90" />
                    </div>
                    <span className="text-[0.625rem] font-black uppercase tracking-widest">Wählen</span>
                 </div>
                 <div className="flex items-center gap-1.5 text-slate-400">
                    <div className="px-2 py-0.5 bg-white border border-slate-200 rounded shadow-sm text-[0.625rem] font-black uppercase">Esc</div>
                    <span className="text-[0.625rem] font-black uppercase tracking-widest">Schließen</span>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
