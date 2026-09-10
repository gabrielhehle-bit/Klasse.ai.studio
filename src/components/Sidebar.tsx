
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
  MessagesSquare, Activity, Settings as SettingsIcon, Briefcase, ChevronDown, Check, Mic, FileText, Heart, Printer, X
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

  const disabledModules = app?.settings?.disabledModules || [];

  const ALL_MODULES = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={14} />, section: 'Unterricht' },
    { id: 'cockpit', label: 'LEHRERCOCKPIT', icon: <Play size={14} />, section: 'Unterricht' },
    { id: 'ki-helfer', label: 'KI Helfer', icon: <Bot size={14} />, section: 'Unterricht' },
    { id: 'schueler', label: 'Schüler', icon: <Users size={14} />, section: 'Werkzeuge' },
    { id: 'sitzplan', label: 'Sitzplan', icon: <MapIcon size={14} />, section: 'Werkzeuge' },
    { id: 'anwesenheit', label: 'Anwesenheit', icon: <Pin size={14} />, section: 'Werkzeuge' },
    { id: 'noten', label: 'Notenmappe', icon: <BarChart3 size={14} />, section: 'Werkzeuge' },
    { id: 'orga', label: 'Kasse & Orga', icon: <Wallet size={14} />, section: 'Werkzeuge' },
    { id: 'planungszentrale', label: 'Planungs-Zentrale', icon: <Target size={14} />, section: 'Planung' },
    { id: 'jahresplanung', label: 'Jahresplanung', icon: <Calendar size={14} />, section: 'Planung' },
    { id: 'wochenplanung', label: 'Wochenplan', icon: <CalendarDays size={14} />, section: 'Planung' },
    { id: 'materialien', label: 'Materialbibliothek', icon: <Folder size={14} />, section: 'Planung' },
    { id: 'uebergabemappe', label: 'Übergabemappe', icon: <ClipboardList size={14} />, section: 'Planung' },
    { id: 'statistik', label: 'Statistik & Profile', icon: <LineChart size={14} />, section: 'Extras' },
    { id: 'diagnostik', label: 'Diagnostik', icon: <Activity size={14} />, section: 'Extras' },
    { id: 'klassengemeinschaft', label: 'Wir-Gefühl', icon: <Heart size={14} />, section: 'Extras' },
    { id: 'jahresbericht', label: 'Jahresbericht', icon: <FileText size={14} />, section: 'Extras' },
    { id: 'archiv', label: 'Archiv', icon: <Archive size={14} />, section: 'Extras' },
  ];

  const rawNavItems = [
    { section: 'Unterricht', items: [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
      { id: 'cockpit', label: 'LEHRERCOCKPIT', icon: <Play size={18} />, highlight: true },
      { id: 'ki-helfer', label: 'KI Helfer', icon: <Bot size={18} />, highlight: true },
    ]},
    { section: 'Werkzeuge', items: [
      { id: 'schueler', label: 'Schüler', icon: <Users size={18} /> },
      { id: 'sitzplan', label: 'Sitzplan', icon: <MapIcon size={18} /> },
      { id: 'anwesenheit', label: 'Anwesenheit', icon: <Pin size={18} /> },
      { id: 'noten', label: 'Notenmappe', icon: <BarChart3 size={18} /> },
      app.klassenvorstand && { id: 'orga', label: 'Kasse & Orga', icon: <Wallet size={18} /> },
    ].filter(Boolean) as any },
    { section: 'Planung', items: [
      { id: 'planungszentrale', label: 'Planungs-Zentrale', icon: <Target size={18} /> },
      { id: 'jahresplanung', label: 'Jahresplanung', icon: <Calendar size={18} /> },
      { id: 'wochenplanung', label: 'Wochenplan', icon: <CalendarDays size={18} /> },
      { id: 'materialien', label: 'Materialbibliothek', icon: <Folder size={18} /> },
      app.klassenvorstand && { id: 'uebergabemappe', label: 'Übergabemappe', icon: <ClipboardList size={18} /> },
    ].filter(Boolean) as any },
    { section: 'Extras', items: [
      { id: 'statistik', label: 'Statistik & Profile', icon: (
        <div className="relative w-5 h-5">
          <LineChart size={14} className="absolute left-0 top-0" />
          <Users size={11} className="absolute right-0 bottom-0 opacity-85" />
        </div>
      ) },
      app.klassenvorstand && { id: 'diagnostik', label: 'Diagnostik', icon: <Activity size={18} /> },
      app.klassenvorstand && { id: 'klassengemeinschaft', label: 'Wir-Gefühl', icon: <Heart size={18} /> },
      app.klassenvorstand && { id: 'jahresbericht', label: 'Jahresbericht', icon: <FileText size={18} /> },
      { id: 'archiv', label: 'Archiv', icon: <Archive size={18} /> },
    ].filter(Boolean) as any },
    { section: 'Ausgabe & Daten', items: [
      { id: 'drucken', label: 'Druckzentrum', icon: <Printer size={18} /> },
      { id: 'datensicherung', label: 'Datensicherung', icon: <Database size={18} /> },
      { id: 'settings', label: 'Einstellungen', icon: <SettingsIcon size={18} /> },
    ]}
  ];

  const navItems = rawNavItems.map(sec => ({
    ...sec,
    items: sec.items.filter(item => !disabledModules.includes(item.id))
  })).filter(sec => sec.items.length > 0);

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
                
                <div className="mt-2 flex items-center justify-between gap-1 w-full">
                  <div className="flex flex-wrap gap-1">
                    {disabledModules.includes('jahresplanung') && disabledModules.includes('statistik') && disabledModules.includes('sitzplan') ? (
                      <Badge variant="success" size="sm">🌱 Fokus</Badge>
                    ) : disabledModules.includes('statistik') && !disabledModules.includes('orga') ? (
                      <Badge variant="info" size="sm">🚀 Standard</Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">👑 Experte</Badge>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCustomizeModal(true)}
                    className="p-1 px-2 hover:bg-[var(--surface-subtle,var(--surface2))] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1 text-[0.625rem] font-bold uppercase tracking-wider border border-[var(--border-default,var(--border))] shrink-0 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,var(--accent))]"
                    title="Seitenleiste anpassen"
                    aria-label="Seitenleiste anpassen"
                  >
                    <SettingsIcon size={11} className="text-[var(--text-muted)] group-hover:rotate-45 transition-transform" />
                    <span>Anpassen</span>
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
        
          <nav className="flex-1 py-3 overflow-y-auto no-scrollbar space-y-3">
            {navItems.map((sec, idx) => (
              <div key={idx} className="px-2">
                {!isCollapsed && (
                  <div className="px-3.5 py-1.5 text-[0.625rem] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)] mb-1">
                    {sec.section}
                  </div>
                )}
                <div className="space-y-0.5">
                  {sec.items.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      id={`tour-${item.id}`}
                      data-menu-id={item.id}
                      aria-current={currentPage === item.id ? 'page' : undefined}
                      title={isCollapsed ? item.label : ''}
                      className={`w-full text-left flex items-center gap-3 px-3.5 py-2.5 cursor-pointer rounded-xl transition-all duration-200 text-[0.8125rem] relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,var(--accent))]
                        ${currentPage === item.id 
                          ? 'shadow-xs font-bold'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-subtle,var(--surface2))] hover:text-[var(--text-primary)] group'}
                        ${item.highlight && currentPage !== item.id && item.id !== 'ki-helfer' ? 'bg-[var(--warning-soft)] text-[var(--warning-text)] font-extrabold border border-[var(--warning)]/30' : ''}
                        ${isCollapsed ? 'justify-center px-0' : ''}`}
                      style={currentPage === item.id ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text, var(--btn-text, #ffffff))' } : {}}
                      onClick={() => {
                        setPage(item.id);
                        if (window.innerWidth < 1024) setIsOpen(false);
                      }}
                    >
                      {/* Left glowing indicator bar */}
                      {currentPage === item.id && (
                        <motion.div 
                          layoutId="activeSideIndicator"
                          className="absolute left-0 top-2.5 bottom-2.5 w-0.5 rounded-r-full bg-white opacity-90 z-20"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className={`${currentPage === item.id ? '' : item.highlight ? 'text-[var(--warning-text)]' : 'text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors'}`} style={currentPage === item.id ? { color: 'var(--accent-text, var(--btn-text, #ffffff))' } : {}}>{item.icon}</span>
                      {!isCollapsed && <span className="text-wrap leading-tight break-words tracking-tight" style={currentPage === item.id ? { color: 'var(--accent-text, var(--btn-text, #ffffff))' } : {}}>{item.label}</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className={`p-5 border-t border-[var(--border-default,var(--border))] ${isCollapsed ? 'flex justify-center' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--surface-subtle,var(--surface2))] border border-[var(--border-default,var(--border))] flex items-center justify-center text-[1.25rem] shadow-xs shrink-0 leading-none">
                {app.anrede === 'Frau' ? '👩‍🏫' : '👨‍🏫'}
              </div>
              {!isCollapsed && (
                <div className="">
                  <div className="text-[0.6875rem] font-black text-[var(--text-muted)] uppercase tracking-widest leading-none mb-1">Aktiv</div>
                  <div className="text-[0.8125rem] font-bold text-[var(--text-primary)] text-wrap leading-tight break-words">{app.vorname || 'Lehrkraft'}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Freikonfigurierbares Sidebar-Anpassungsmodal */}
      {showCustomizeModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-[var(--surface-card,var(--surface))] rounded-[2rem] border border-[var(--border-default,var(--border))] shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden text-[var(--text-primary)]">
            {/* Header */}
            <div className="p-6 border-b border-[var(--border-default,var(--border))]/60 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-[1rem] leading-normal font-black text-[var(--text-primary)] tracking-tight flex items-center gap-2">
                  📋 Seitenleiste anpassen
                </h3>
                <p className="text-[0.6875rem] text-[var(--text-muted)] leading-relaxed font-medium">
                  Schalte einzelne Werkzeuge aus oder ein, um das Klassenbuch exakt auf deine Bedürfnisse abzustimmen.
                </p>
              </div>
              <IconButton
                variant="ghost"
                size="sm"
                aria-label="Schließen"
                onClick={() => setShowCustomizeModal(false)}
              >
                <X size={18} />
              </IconButton>
            </div>

            {/* List with Groups */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {['Unterricht', 'Werkzeuge', 'Planung', 'Extras'].map(section => {
                const sectItems = ALL_MODULES.filter(m => m.section === section);
                return (
                  <div key={section} className="space-y-2">
                    <h4 className="text-[0.5625rem] font-black uppercase tracking-wider text-[var(--text-muted)]">
                      {section}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {sectItems.map(item => {
                        const isHidden = disabledModules.includes(item.id);
                        return (
                          <label
                            key={item.id}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                              !isHidden
                                ? 'bg-[var(--surface-subtle,var(--surface2))] border-[var(--border-default,var(--border))] text-[var(--text-primary)] font-bold'
                                : 'bg-[var(--surface-card,var(--surface))] border-[var(--border-default,var(--border))]/40 text-[var(--text-muted)] font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={!isHidden ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]/60'}>
                                {item.icon}
                              </span>
                              <span className="text-[0.6875rem] text-wrap leading-tight break-words">
                                {item.label}
                              </span>
                            </div>
                            <input
                              type="checkbox"
                              checked={!isHidden}
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
                                      disabledModules: updated
                                    }
                                  };
                                });
                              }}
                              className="accent-[var(--accent)] scale-105 cursor-pointer"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions Footer */}
            <div className="p-4 bg-[var(--surface-subtle,var(--surface2))] border-t border-[var(--border-default,var(--border))]/60 flex items-center justify-between gap-2.5 flex-wrap">
              <div className="flex gap-1.5 items-center">
                <Button
                  size="sm"
                  variant={disabledModules.includes('jahresplanung') && disabledModules.includes('statistik') && disabledModules.includes('sitzplan') ? 'success' : 'secondary'}
                  onClick={() => {
                    setApp(prev => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        disabledModules: ['cockpit', 'sitzplan', 'orga', 'jahresplanung', 'wochenplanung', 'materialien', 'uebergabemappe', 'statistik', 'diagnostik', 'archiv', 'jahresbericht']
                      }
                    }));
                    showToast("🌱 Auf minimalistischen Fokus-Modus umgestellt!", "success");
                  }}
                >
                  🌱 Fokus
                </Button>
                <Button
                  size="sm"
                  variant={disabledModules.includes('statistik') && !disabledModules.includes('sitzplan') && !disabledModules.includes('orga') ? 'selected' : 'secondary'}
                  onClick={() => {
                    setApp(prev => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        disabledModules: ['jahresplanung', 'uebergabemappe', 'statistik', 'diagnostik', 'archiv', 'jahresbericht']
                      }
                    }));
                    showToast("🚀 Auf Standard-Modus umgestellt!", "success");
                  }}
                >
                  🚀 Standard
                </Button>
                <Button
                  size="sm"
                  variant={disabledModules.length === 0 ? 'primary' : 'secondary'}
                  onClick={() => {
                    setApp(prev => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        disabledModules: []
                      }
                    }));
                    showToast("👑 Alle Werkzeuge wurden aktiviert!", "success");
                  }}
                >
                  👑 Experte
                </Button>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowCustomizeModal(false)}
              >
                Akzeptieren
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default Sidebar;
