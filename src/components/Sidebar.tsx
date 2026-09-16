
import React, { memo } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { getCurrentSchuljahr } from '../lib/utils';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, Users, Map as MapIcon, Pin, BarChart3, Edit3, 
  Calendar, CalendarDays, ClipboardList, Mail, Wallet, 
  FileEdit, Notebook, CheckSquare, Play, LineChart, Table, Folder, 
  Target, Replace, Archive, Bot, ChevronLeft, ChevronRight, Database, LayoutGrid,
  MessagesSquare, Activity, Settings as SettingsIcon, Briefcase, ChevronDown, Check, Mic, FileText, Heart, Printer, X, GripVertical, ArrowUp, ArrowDown, Flag, GraduationCap, Wrench, FileSearch, UserPlus
} from 'lucide-react';
import { Button, IconButton, Badge, Chip } from './ui';

interface SidebarProps {
  currentPage: string;
  setPage: (page: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  openSetup: () => void;
}

const Sidebar = memo(({ currentPage, setPage, isOpen, setIsOpen, openSetup }: SidebarProps) => {
  const { app, setApp } = useApp();
  const { showToast } = useToast();
  const isCollapsed = app?.settings?.sidebarCollapsed || false;

  const toggleCollapse = React.useCallback(() => {
    setApp(prev => ({
      ...prev,
      settings: { ...prev.settings, sidebarCollapsed: !isCollapsed }
    }));
  }, [setApp, isCollapsed]);

  const [showClassMenu, setShowClassMenu] = React.useState(false);
  const [showCustomizeModal, setShowCustomizeModal] = React.useState(false);
  const [showMorePages, setShowMorePages] = React.useState(false);

  const disabledModules = app?.settings?.disabledModules || [];

  const sidebarOrder = app?.settings?.sidebarOrder || [];
  const sidebarPinned = app?.settings?.sidebarPinned || [];
  const [draggedModuleId, setDraggedModuleId] = React.useState<string | null>(null);

  const orderSidebarItems = React.useCallback((items: any[]) => {
    const index = new Map(sidebarOrder.map((id: string, position: number) => [id, position]));
    const pinned = new Set(sidebarPinned);
    return [...items].sort((a, b) => {
      const pinDelta = Number(pinned.has(b.id)) - Number(pinned.has(a.id));
      if (pinDelta !== 0) return pinDelta;
      const aPos = index.has(a.id) ? index.get(a.id)! : Number.MAX_SAFE_INTEGER;
      const bPos = index.has(b.id) ? index.get(b.id)! : Number.MAX_SAFE_INTEGER;
      return aPos - bPos;
    });
  }, [sidebarOrder, sidebarPinned]);


  const ALL_MODULES = [
    { id: 'dashboard', label: 'Heute', icon: <LayoutDashboard size={18} />, section: 'Start' },
    { id: 'klasse', label: 'Klasse', icon: <Users size={18} />, section: 'Start' },
    { id: 'verhalten', label: 'Notizen', icon: <Notebook size={18} />, section: 'Start' },
    { id: 'planung', label: 'Planung', icon: <CalendarDays size={18} />, section: 'Start' },
    { id: 'leistungen', label: 'Leistungen', icon: <BarChart3 size={18} />, section: 'Start' },
    { id: 'unterricht', label: 'Unterricht', icon: <Play size={18} />, section: 'Start' },
    { id: 'tools', label: 'Tools', icon: <Wrench size={18} />, section: 'Start' },
    { id: 'textanalyse', label: 'Textanalyse', icon: <FileSearch size={18} />, section: 'Tools' },
    { id: 'cockpit', label: 'Lehrercockpit', icon: <Play size={18} />, section: 'Unterricht' },
    { id: 'ki-helfer', label: 'KI-Helfer', icon: <Bot size={18} />, section: 'Unterricht' },
    { id: 'lehrerzimmer', label: 'Lehrerzimmer', icon: <MessagesSquare size={18} />, section: 'Unterricht' },
    { id: 'arbeitsblatt', label: 'Arbeitsblatt-Generator', icon: <FileEdit size={18} />, section: 'Unterricht' },
    { id: 'stationenbetrieb', label: 'Stationenbetrieb', icon: <LayoutGrid size={18} />, section: 'Unterricht' },
    { id: 'differenzierung', label: 'Differenzierung', icon: <Target size={18} />, section: 'Unterricht' },
    { id: 'elternbrief', label: 'Elternbrief', icon: <Mail size={18} />, section: 'Unterricht' },
    { id: 'schueler', label: 'Klassenliste', icon: <Users size={18} />, section: 'Klasse & Kinder' },
    { id: 'dossier', label: 'Schülerdossier', icon: <GraduationCap size={18} />, section: 'Klasse & Kinder' },
    { id: 'sitzplan', label: 'Sitzplan & Gruppen', icon: <MapIcon size={18} />, section: 'Klasse & Kinder' },
    { id: 'anwesenheit', label: 'Anwesenheit & Befinden', icon: <Pin size={18} />, section: 'Klasse & Kinder' },
    { id: 'teamteaching', label: 'Teamteaching', icon: <UserPlus size={18} />, section: 'Klasse & Kinder' },
    { id: 'orga', label: 'Kasse & Orga', icon: <Wallet size={18} />, section: 'Klasse & Kinder' },
    { id: 'noten', label: 'Notenmappe', icon: <BarChart3 size={18} />, section: 'Leistungen' },
    { id: 'statistik', label: 'Statistik & Profile', icon: <LineChart size={18} />, section: 'Leistungen' },
    { id: 'diagnostik', label: 'Diagnostik', icon: <Activity size={18} />, section: 'Leistungen' },
    { id: 'portfolio', label: 'Lernziele & Portfolio', icon: <Briefcase size={18} />, section: 'Leistungen' },
    { id: 'notenTabelle', label: 'Notenübersicht', icon: <Table size={18} />, section: 'Leistungen' },
    { id: 'verbal', label: 'Verbale Beurteilung', icon: <FileText size={18} />, section: 'Leistungen' },
    { id: 'kel', label: 'KEL-Gespräche', icon: <MessagesSquare size={18} />, section: 'Leistungen' },
    { id: 'planungszentrale', label: 'Planungs-Zentrale', icon: <Target size={18} />, section: 'Planung' },
    { id: 'jahresplanung', label: 'Jahresplanung', icon: <Calendar size={18} />, section: 'Planung' },
    { id: 'wochenplanung', label: 'Wochenplan', icon: <CalendarDays size={18} />, section: 'Planung' },
    { id: 'materialien', label: 'Materialbibliothek', icon: <Folder size={18} />, section: 'Planung' },
    { id: 'stunden', label: 'Stundenentwürfe', icon: <Notebook size={18} />, section: 'Planung' },
    { id: 'canva', label: 'Canva', icon: <LayoutGrid size={18} />, section: 'Planung' },
    { id: 'vertretung', label: 'Vertretung', icon: <Replace size={18} />, section: 'Planung' },
    { id: 'uebergabemappe', label: 'Übergabemappe', icon: <ClipboardList size={18} />, section: 'Planung' },
    { id: 'klassengemeinschaft', label: 'Wir-Gefühl', icon: <Heart size={18} />, section: 'Entwicklung & Berichte' },
    { id: 'jahresbericht', label: 'Jahresbericht', icon: <FileText size={18} />, section: 'Entwicklung & Berichte' },
    { id: 'archiv', label: 'Archiv', icon: <Archive size={18} />, section: 'Entwicklung & Berichte' },
    { id: 'drucken', label: 'Druckzentrum', icon: <Printer size={18} />, section: 'Ausgabe & Daten' },
    { id: 'datensicherung', label: 'Datensicherung', icon: <Database size={18} />, section: 'Ausgabe & Daten' },
    { id: 'settings', label: 'Einstellungen', icon: <SettingsIcon size={18} />, section: 'Ausgabe & Daten' },
  ];

  const utilityIds = new Set(['drucken', 'datensicherung', 'settings']);
  const restrictedForSubjectTeachers = new Set(['orga', 'uebergabemappe', 'diagnostik', 'klassengemeinschaft', 'jahresbericht']);

  const availableModules = ALL_MODULES.filter(item =>
    (app.klassenvorstand || !restrictedForSubjectTeachers.has(item.id)) &&
    !disabledModules.includes(item.id)
  );

  const orderedModules = orderSidebarItems(availableModules);
  const utilityModules = orderedModules.filter(item => utilityIds.has(item.id));
  const mainModules = orderedModules.filter(item => !utilityIds.has(item.id));
  const PRIMARY_VISIBLE_COUNT = 8;
  const visibleMainModules = showMorePages ? mainModules : mainModules.slice(0, PRIMARY_VISIBLE_COUNT);
  const hiddenMainCount = Math.max(0, mainModules.length - PRIMARY_VISIBLE_COUNT);

  const moveSidebarModule = React.useCallback((draggedId: string, targetId: string) => {
    if (!draggedId || draggedId === targetId) return;

    setApp(prev => {
      const allIds = ALL_MODULES.map(item => item.id);
      const saved = prev.settings?.sidebarOrder || [];
      const current = [
        ...saved.filter((id: string) => allIds.includes(id)),
        ...allIds.filter(id => !saved.includes(id)),
      ];
      const withoutDragged = current.filter(id => id !== draggedId);
      const targetIndex = withoutDragged.indexOf(targetId);
      withoutDragged.splice(targetIndex < 0 ? withoutDragged.length : targetIndex, 0, draggedId);

      return {
        ...prev,
        settings: {
          ...prev.settings,
          sidebarOrder: withoutDragged,
        },
      };
    });
  }, [setApp]);

  const toggleSidebarPin = React.useCallback((moduleId: string) => {
    setApp(prev => {
      const pinned = new Set(prev.settings?.sidebarPinned || []);
      if (pinned.has(moduleId)) pinned.delete(moduleId);
      else pinned.add(moduleId);
      return {
        ...prev,
        settings: {
          ...prev.settings,
          sidebarPinned: Array.from(pinned),
        },
      };
    });
  }, [setApp]);

  const moveSidebarModuleBy = React.useCallback((moduleId: string, offset: -1 | 1) => {
    setApp(prev => {
      const allIds = ALL_MODULES.map(item => item.id);
      const saved = prev.settings?.sidebarOrder || [];
      const current = [
        ...saved.filter((id: string) => allIds.includes(id)),
        ...allIds.filter(id => !saved.includes(id)),
      ];
      const index = current.indexOf(moduleId);
      const nextIndex = index + offset;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return prev;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return {
        ...prev,
        settings: {
          ...prev.settings,
          sidebarOrder: next,
        },
      };
    });
  }, [setApp]);

  // Alte Fokus-/Standard-Presets hatten neue Funktionen unsichtbar gemacht.
  // Nur exakt diese historischen Presets werden einmalig auf "alles sichtbar" zurückgesetzt.
  React.useEffect(() => {
    const signatures = [
      ['cockpit', 'sitzplan', 'orga', 'jahresplanung', 'wochenplanung', 'materialien', 'uebergabemappe', 'statistik', 'diagnostik', 'archiv', 'jahresbericht'],
      ['jahresplanung', 'uebergabemappe', 'statistik', 'diagnostik', 'archiv', 'jahresbericht'],
    ].map(items => [...items].sort().join('|'));
    const current = [...disabledModules].sort().join('|');
    if (!current || !signatures.includes(current)) return;
    setApp(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        disabledModules: [],
      },
    }));
  }, [disabledModules, setApp]);


  const { switchClass, addClass } = useApp();

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/40 z-[149] transition-opacity lg:hidden print:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setIsOpen(false)} 
      />
      <aside className={`fixed lg:sticky top-0 h-dvh z-[150] bg-surface border-r border-border transition-all duration-300 ease-in-out print:hidden ${isOpen ? 'w-[240px] translate-x-0 shadow-2xl lg:shadow-none' : isCollapsed ? 'w-[240px] lg:w-[70px] -translate-x-full lg:translate-x-0' : 'w-[240px] lg:w-[240px] -translate-x-full lg:translate-x-0'}`}>
        <div className="h-full flex flex-col"> 
          <div className="p-5 pb-4 border-b border-border relative">
            {/* Elegant Top Ambient Accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent/40 via-accent to-accent/40 opacity-80" />
            {!isCollapsed ? (
              <>
                <div className="text-[0.625rem] text-text-muted font-black uppercase tracking-[0.25em] mb-1 leading-none">{app.schuljahr || getCurrentSchuljahr()}</div>
                <h1 className="font-sans text-[1.125rem] font-black text-text-primary leading-tight">
                  {app.nachname ? `${app.anrede} ${app.nachname}` : 'Name fehlt'}<br />
                  <span className="text-[0.75rem] text-accent font-bold uppercase tracking-widest leading-none mt-1 inline-block">Volksschule</span>
                </h1>
                
                <div className="mt-2 flex items-center justify-between gap-2 w-full">
                  <span className="text-xs font-semibold text-text-muted">Klassio</span>
                  <button
                    type="button"
                    onClick={() => setShowCustomizeModal(true)}
                    className="px-2.5 py-1.5 hover:bg-[var(--surface-subtle,var(--surface2))] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 text-[0.625rem] font-bold uppercase tracking-wider border border-[var(--border-default,var(--border))] shrink-0 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,var(--accent))]"
                    title="Sidebar sortieren und Bereiche ein-/ausblenden"
                    aria-label="Sidebar anpassen"
                  >
                    <GripVertical size={12} />
                    <span>Sidebar</span>
                  </button>
                </div>
                
                <div className="relative mt-4">
                  <div 
                    className={`inline-flex items-center gap-2 text-[0.6875rem] font-bold px-3.5 py-2.5 rounded-xl cursor-pointer transition-all border group whitespace-nowrap w-full justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,var(--accent))] ${
                      showClassMenu 
                        ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)] ring-2 ring-[var(--accent)]/20' 
                        : 'bg-[var(--surface-subtle,var(--surface2))] hover:bg-[var(--accent-soft)] text-[var(--text-secondary)] hover:text-[var(--accent)] border-[var(--border-default,var(--border))] hover:border-[var(--accent)]/30'
                    }`}
                    onClick={() => setShowClassMenu(!showClassMenu)}
                  >
                    <div className="flex items-center gap-2 text-wrap leading-tight break-words">
                       <span className="text-wrap leading-tight break-words">{app.stufe || '?'}. Klasse {app.klassenbezeichnung || 'Ohne Namen'}</span>
                       {!app.klassenvorstand && <span className="bg-[var(--surface-muted,var(--surface3))] text-[var(--text-secondary)] text-[0.5rem] px-1.5 py-0.5 rounded-full">Fachlehrer</span>}
                    </div>
                    <ChevronDown size={11} className={`shrink-0 transition-transform ${showClassMenu ? 'rotate-180' : ''}`} /> 
                  </div>
 
                   {showClassMenu && (
                    <>
                      <div className="fixed inset-0 z-[160]" onClick={() => setShowClassMenu(false)} />
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--surface-card,var(--surface))]/98 backdrop-blur-xl rounded-2xl shadow-2xl border border-[var(--border-default,var(--border))] py-2 z-[161] min-w-[200px] max-h-[300px] overflow-y-auto elegant-scrollbar">
                        <div className="px-4 py-2 text-[0.625rem] font-black text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border-default,var(--border))]/60 mb-1">Meine Klassen</div>
                        {(app.classes || []).map(c => (
                          <div 
                            key={c.id} 
                            onClick={() => { switchClass(c.id); setShowClassMenu(false); }}
                            className={`px-4 py-3 hover:bg-[var(--surface-subtle,var(--surface2))] cursor-pointer flex items-center justify-between group transition-colors ${app.activeClassId === c.id ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-bold' : 'text-[var(--text-secondary)]'}`}
                          >
                            <div className="flex flex-col">
                              <span className="text-[0.75rem]">{c.stufe}. Klasse {c.name}</span>
                              {!c.klassenvorstand && <span className="text-[0.5625rem] opacity-70">Fachunterricht</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              {app.activeClassId === c.id && <Check size={14} className="text-[var(--accent)]" />}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (app.activeClassId !== c.id) {
                                    switchClass(c.id);
                                  }
                                  setPage('setup');
                                  setShowClassMenu(false);
                                }}
                                title="Klassen-Setup konfigurieren"
                                aria-label={`Setup für ${c.name} konfigurieren`}
                                className="p-1 hover:bg-[var(--surface-muted,var(--surface3))] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-md transition-all cursor-pointer"
                              >
                                <SettingsIcon size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                        <div className="p-2 border-t border-[var(--border-default,var(--border))]/60 mt-1">
                          <button 
                            type="button"
                            onClick={() => {
                              setPage('setup_new');
                              setShowClassMenu(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[0.6875rem] font-black text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all text-center justify-center bg-[var(--accent-soft)] border border-[var(--accent)]/20 cursor-pointer"
                          >
                            <Edit3 size={12} /> Klasse hinzufügen
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-6">
                <div className="w-10 h-10 bg-[var(--accent)] rounded-xl flex items-center justify-center text-[var(--accent-text,var(--btn-text,#ffffff))] font-black text-[0.75rem] leading-tight shadow-md shadow-[var(--accent)]/20">
                  {app.nachname ? app.nachname.charAt(0) : 'L'}
                </div>
                <IconButton 
                  onClick={toggleCollapse}
                  variant="ghost"
                  size="sm"
                  aria-label="Seitenleiste ausklappen"
                  title="Seitenleiste ausklappen"
                >
                  <ChevronRight size={18} />
                </IconButton>
              </div>
            )}
            
            {!isCollapsed && (
              <div className="absolute right-3 top-6 hidden lg:block">
                <IconButton 
                  onClick={toggleCollapse}
                  variant="ghost"
                  size="sm"
                  aria-label="Seitenleiste einklappen"
                  title="Seitenleiste einklappen"
                >
                  <ChevronLeft size={18} />
                </IconButton>
              </div>
            )}
          </div>
        
          <nav className="flex-1 py-3 overflow-y-auto no-scrollbar">
            <div className="px-2 space-y-0.5">
              {visibleMainModules.map(item => (
                <button
                  key={item.id}
                  type="button"
                  id={`tour-${item.id}`}
                  data-menu-id={item.id}
                  aria-current={currentPage === item.id ? 'page' : undefined}
                  title={isCollapsed ? item.label : ''}
                  className={`w-full text-left flex items-center gap-3 px-3.5 py-2.5 cursor-pointer rounded-xl transition-all duration-200 text-[0.8125rem] relative overflow-hidden ${
                    currentPage === item.id
                      ? 'text-white shadow-sm font-bold'
                      : 'text-text-secondary hover:bg-surface2 hover:text-text-primary group'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
                  style={currentPage === item.id ? { backgroundColor: 'var(--accent, #10b981)', color: 'var(--btn-text, #ffffff)' } : {}}
                  onClick={() => {
                    setPage(item.id);
                    if (window.innerWidth < 1024) setIsOpen(false);
                  }}
                >
                  {currentPage === item.id && (
                    <motion.div
                      layoutId="activeSideIndicator"
                      className="absolute left-0 top-2.5 bottom-2.5 w-0.5 rounded-r-full bg-white opacity-90 z-20"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span
                    className={currentPage === item.id ? '' : 'text-text-muted group-hover:text-accent transition-colors'}
                    style={currentPage === item.id ? { color: 'var(--btn-text, #ffffff)' } : {}}
                  >
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <>
                      <span className="text-wrap leading-tight break-words tracking-tight flex-1">
                        {item.label}
                      </span>
                      {sidebarPinned.includes(item.id) && (
                        <Flag
                          size={13}
                          fill="currentColor"
                          className={currentPage === item.id ? "text-white/90 shrink-0" : "text-amber-500 shrink-0"}
                          aria-label="Angepinnt"
                        />
                      )}
                    </>
                  )}
                </button>
              ))}

              {hiddenMainCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowMorePages(value => !value)}
                  className="w-full mt-1 flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-border text-[0.8125rem] font-bold text-text-secondary hover:bg-surface2 hover:text-text-primary transition-colors"
                  aria-expanded={showMorePages}
                  title={showMorePages ? 'Weniger Bereiche anzeigen' : 'Alle Bereiche anzeigen'}
                >
                  <LayoutGrid size={18} className="text-accent shrink-0" />
                  {!isCollapsed && (
                    <span>{showMorePages ? 'Weniger' : `Mehr (${hiddenMainCount})`}</span>
                  )}
                </button>
              )}
            </div>
          </nav>

          <div className="p-2 border-t border-border space-y-1">
            {utilityModules.map(item => (
              <button
                key={item.id}
                type="button"
                aria-current={currentPage === item.id ? 'page' : undefined}
                title={item.label}
                onClick={() => {
                  setPage(item.id);
                  if (window.innerWidth < 1024) setIsOpen(false);
                }}
                className={`w-full min-h-11 px-3.5 flex items-center gap-3 rounded-xl text-sm transition-colors ${
                  currentPage === item.id
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                    : 'text-text-secondary hover:bg-[var(--surface2)]'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
              >
                {item.icon}
                {!isCollapsed && <span>{item.label}</span>}
              </button>
            ))}
          </div>

          <div className={`p-4 border-t border-border ${isCollapsed ? 'flex justify-center' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-surface2 border border-border flex items-center justify-center text-[1.25rem] shadow-sm shrink-0 leading-none">
                {app.anrede === 'Frau' ? '👩‍🏫' : '👨‍🏫'}
              </div>
              {!isCollapsed && (
                <div>
                  <div className="text-[0.6875rem] font-black text-text-muted uppercase tracking-widest leading-none mb-1">Aktiv</div>
                  <div className="text-[0.8125rem] font-bold text-text-primary text-wrap leading-tight break-words">{app.vorname || 'Lehrkraft'}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Persönliche Sidebar: global sortierbar, zusätzlich Pfeile für Touch/Trackpad */}
      {showCustomizeModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-surface rounded-[2rem] border border-border shadow-2xl w-full max-w-xl flex flex-col max-h-[88vh] overflow-hidden">
            <div className="p-6 border-b border-border/50 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-[1rem] leading-normal font-black text-text-primary tracking-tight">
                  Sidebar anpassen
                </h3>
                <p className="text-[0.6875rem] text-text-muted leading-relaxed font-medium">
                  Ziehe einen Bereich an den Punkten, verschiebe ihn mit den Pfeilen oder pinne ihn mit der Flagge an. Angepinnte Bereiche stehen automatisch oben; die ersten acht Bereiche sind direkt sichtbar.
                </p>
              </div>
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="p-2 bg-surface2 hover:bg-surface3/60 border border-border text-text-secondary rounded-xl transition-all cursor-pointer"
                aria-label="Sidebar-Anpassung schließen"
              >
                <X size={17} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2">
              {orderSidebarItems(
                ALL_MODULES.filter(item =>
                  app.klassenvorstand || !restrictedForSubjectTeachers.has(item.id)
                )
              ).map((item, index, orderedItems) => {
                const isHidden = disabledModules.includes(item.id);
                const isUtility = utilityIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    draggable={!isUtility}
                    onDragStart={(event) => {
                      if (isUtility) return;
                      setDraggedModuleId(item.id);
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', item.id);
                    }}
                    onDragEnd={() => setDraggedModuleId(null)}
                    onDragOver={(event) => {
                      if (isUtility) return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(event) => {
                      if (isUtility) return;
                      event.preventDefault();
                      const draggedId = draggedModuleId || event.dataTransfer.getData('text/plain');
                      moveSidebarModule(draggedId, item.id);
                      setDraggedModuleId(null);
                    }}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
                      draggedModuleId === item.id ? 'opacity-50 ring-2 ring-accent/30' : ''
                    } ${
                      !isHidden
                        ? 'bg-surface2 border-border text-text-primary'
                        : 'bg-surface border-border/40 text-text-muted'
                    }`}
                  >
                    <div className={`shrink-0 p-1 ${isUtility ? 'opacity-30' : 'cursor-grab active:cursor-grabbing text-text-muted'}`}>
                      <GripVertical size={17} aria-hidden="true" />
                    </div>

                    <span className={!isHidden ? 'text-accent shrink-0' : 'text-text-muted/60 shrink-0'}>
                      {item.icon}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="text-[0.75rem] font-bold truncate">{item.label}</div>
                      <div className="text-[0.6rem] text-text-muted truncate">
                        {isUtility ? 'Fester Datenbereich' : item.section}
                      </div>
                    </div>

                    {!isUtility && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleSidebarPin(item.id)}
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                            sidebarPinned.includes(item.id)
                              ? "border-amber-300 bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:border-amber-500/30"
                              : "border-border bg-surface hover:bg-surface3/60 text-text-muted"
                          }`}
                          title={sidebarPinned.includes(item.id) ? "Anheftung lösen" : "Mit Flagge anpinnen"}
                          aria-label={`${item.label} ${sidebarPinned.includes(item.id) ? "Anheftung lösen" : "anpinnen"}`}
                        >
                          <Flag size={14} fill={sidebarPinned.includes(item.id) ? "currentColor" : "none"} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSidebarModuleBy(item.id, -1)}
                          disabled={index === 0}
                          className="w-8 h-8 rounded-lg border border-border bg-surface hover:bg-surface3/60 flex items-center justify-center disabled:opacity-25"
                          title="Nach oben"
                          aria-label={`${item.label} nach oben`}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSidebarModuleBy(item.id, 1)}
                          disabled={index === orderedItems.length - 1}
                          className="w-8 h-8 rounded-lg border border-border bg-surface hover:bg-surface3/60 flex items-center justify-center disabled:opacity-25"
                          title="Nach unten"
                          aria-label={`${item.label} nach unten`}
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    )}

                    <label className="flex items-center gap-1.5 shrink-0 cursor-pointer">
                      <span className="sr-only">{item.label} anzeigen</span>
                      <input
                        type="checkbox"
                        checked={!isHidden}
                        disabled={isUtility}
                        onChange={() => {
                          const active = !isHidden;
                          setApp(prev => {
                            let updated = [...(prev.settings?.disabledModules || [])];
                            if (active) {
                              if (!updated.includes(item.id)) updated.push(item.id);
                            } else {
                              updated = updated.filter(id => id !== item.id);
                            }
                            return {
                              ...prev,
                              settings: {
                                ...prev.settings,
                                disabledModules: updated,
                              },
                            };
                          });
                        }}
                        className="accent-accent scale-110 cursor-pointer disabled:cursor-default"
                      />
                    </label>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-surface2 border-t border-border/50 flex items-center justify-between gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setApp(prev => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      disabledModules: [],
                      sidebarOrder: ALL_MODULES.map(item => item.id),
                      sidebarPinned: [],
                    },
                  }));
                  showToast('Alle Bereiche sind wieder sichtbar und in der Standardreihenfolge.', 'success');
                }}
                className="px-3 py-2 rounded-xl border border-border bg-surface text-[0.6875rem] font-bold text-text-secondary hover:text-text-primary hover:bg-surface3/60"
              >
                Standard wiederherstellen
              </button>

              <button
                type="button"
                onClick={() => setShowCustomizeModal(false)}
                className="px-5 py-2 bg-accent hover:bg-accent/90 text-accent-text rounded-xl text-[0.6875rem] font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
              >
                Fertig
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default Sidebar;
