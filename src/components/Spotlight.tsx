
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Search, Users, Calendar, ClipboardList, BarChart3, 
  Settings, Zap, Command, X, ArrowUpRight, Plus, 
  Notebook, LayoutDashboard, Play, Map as MapIcon,
  Bot, FileText, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { IconButton } from './ui';

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
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[1000] flex items-start justify-center pt-[15vh] px-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: -16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -16 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-2xl bg-[var(--surface-card,var(--surface))] rounded-[2rem] shadow-2xl border border-[var(--border-default,var(--border))] overflow-hidden text-[var(--text-primary)]"
              onClick={e => e.stopPropagation()}
              onKeyDown={handleKeyDown}
            >
              <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 text-[var(--text-muted)] pointer-events-none">
                  <Search size={20} className="group-focus-within:text-[var(--accent)] transition-colors" />
                </div>
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Inhalte suchen, Seiten wechseln oder Schüler finden..."
                  className="w-full h-18 pl-16 pr-24 bg-transparent text-[0.9375rem] font-medium border-b border-[var(--border-default,var(--border))]/60 outline-none placeholder:text-[var(--text-muted)] text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring,var(--accent))]"
                  value={query}
                  onChange={e => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                   <div className="flex items-center gap-1 text-[0.625rem] font-black uppercase text-[var(--text-muted)] bg-[var(--surface-subtle,var(--surface2))] px-2 py-1 rounded-lg border border-[var(--border-default,var(--border))]">
                      <Command size={10} />
                      <span>K</span>
                   </div>
                   <IconButton 
                     variant="ghost" 
                     size="sm" 
                     aria-label="Schließen" 
                     onClick={() => setIsOpen(false)}
                   >
                      <X size={18} />
                   </IconButton>
                </div>
              </div>

              <div className="max-h-[50vh] overflow-y-auto no-scrollbar py-3 px-3">
                {filteredItems.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                     <div className="w-14 h-14 bg-[var(--surface-subtle,var(--surface2))] rounded-2xl flex items-center justify-center text-3xl mx-auto border border-[var(--border-default,var(--border))]">🔍</div>
                     <p className="text-[var(--text-muted)] font-bold text-[0.875rem]">Keine Ergebnisse für &quot;{query}&quot;</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Group by sections */}
                    {['Navigation', 'Planung', 'Tools', 'KI-Assistenten', 'Schüler:innen', 'Aktionen'].map(section => {
                      const sectionItems = filteredItems.filter(item => item.section === section);
                      if (sectionItems.length === 0) return null;
                      
                      return (
                        <div key={section} className="space-y-1">
                          <h4 className="px-3 text-[0.625rem] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">{section}</h4>
                          {sectionItems.map((item) => {
                            const globalIdx = filteredItems.indexOf(item);
                            const isSelected = globalIdx === selectedIndex;
                            
                            return (
                              <button
                                key={item.id}
                                type="button"
                                className={`w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl transition-all cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,var(--accent))] ${
                                  isSelected 
                                    ? 'shadow-sm font-bold' 
                                    : 'hover:bg-[var(--surface-subtle,var(--surface2))] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                                style={isSelected ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text, var(--btn-text, #ffffff))' } : {}}
                                onClick={() => handleSelect(item)}
                                onMouseEnter={() => setSelectedIndex(globalIdx)}
                              >
                                <div className="flex items-center gap-3">
                                  <div 
                                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                                      isSelected 
                                        ? 'bg-white/20' 
                                        : item.highlight 
                                          ? 'bg-[var(--warning-soft)] text-[var(--warning-text)]' 
                                          : 'bg-[var(--surface-subtle,var(--surface2))] text-[var(--text-muted)]'
                                    }`}
                                  >
                                    {item.icon}
                                  </div>
                                  <span className="text-[0.875rem] font-bold tracking-tight">{item.label}</span>
                                </div>
                                {isSelected && (
                                  <div className="flex items-center gap-1 opacity-80 shrink-0">
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

              <div className="bg-[var(--surface-subtle,var(--surface2))] p-3 px-6 border-t border-[var(--border-default,var(--border))] flex items-center gap-6">
                 <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                    <div className="p-1 bg-[var(--surface-card,var(--surface))] border border-[var(--border-default,var(--border))] rounded-md shadow-xs">
                       <ArrowUpRight size={10} className="rotate-90" />
                    </div>
                    <span className="text-[0.625rem] font-black uppercase tracking-widest">Wählen</span>
                 </div>
                 <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                    <div className="px-2 py-0.5 bg-[var(--surface-card,var(--surface))] border border-[var(--border-default,var(--border))] rounded-md shadow-xs text-[0.625rem] font-black uppercase text-[var(--text-secondary)]">Esc</div>
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
