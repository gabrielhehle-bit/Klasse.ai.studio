import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Trash2, RotateCcw, RectangleHorizontal, Triangle, Square, RefreshCw, 
  Maximize2, Minimize2, Shuffle, Grid, Layout, Users, Star, UserPlus, Zap, 
  Ghost, Flame, Waves, Palette, Eye, Activity, UserMinus, Hand, Menu,
  Printer, Move, EyeOff, Info, LogIn, Monitor, DoorOpen, LayoutTemplate,
  Languages, ShieldAlert, MonitorPlay, Undo, Notebook, Sparkles, Smile, ChevronLeft, ChevronRight,
  Calendar, Camera, Upload, Copy, Layers, Sliders, Paintbrush, TrendingUp, AlertTriangle, Locate
} from 'lucide-react';
import { berechne } from '../lib/GradeUtils';
import SeatingPlanAnalysis from './SeatingPlanAnalysis';
import { classifySeatPositions, findSeatingRuleViolations, sanitizeSeatingRules, sameSeat } from '../lib/seatingPlanRules';

const isBirthdayToday = (geburtstagStr: string | undefined | null) => {
  if (!geburtstagStr) return false;
  try {
    const today = new Date();
    let bday: Date;
    const parts = geburtstagStr.split(".");
    if (parts.length === 3) {
      bday = new Date(today.getFullYear(), parseInt(parts[1]) - 1, parseInt(parts[0]));
    } else {
      bday = new Date(geburtstagStr);
    }
    return bday.getDate() === today.getDate() && bday.getMonth() === today.getMonth();
  } catch (e) {
    return false;
  }
};

const getContrastTextClass = (bgColor?: string): string => {
  if (!bgColor || bgColor === 'bg-white' || bgColor === 'white' || bgColor === 'bg-transparent' || bgColor === 'transparent') {
    return 'text-zinc-950';
  }
  const clean = bgColor.trim();
  
  if (clean.startsWith('#')) {
    const hex = clean.substring(1);
    const len = hex.length;
    let r = 255, g = 255, b = 255;
    if (len === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (len === 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq > 140 ? 'text-zinc-950' : 'text-white';
  } else if (clean.startsWith('rgb')) {
    const match = clean.match(/\d+(\.\d+)?/g);
    let r = 255, g = 255, b = 255;
    if (match && match.length >= 3) {
      r = parseInt(match[0], 10);
      g = parseInt(match[1], 10);
      b = parseInt(match[2], 10);
    }
    if (match && match.length >= 4) {
      const alpha = parseFloat(match[3]);
      if (!isNaN(alpha)) {
        r = Math.round(r * alpha + 255 * (1 - alpha));
        g = Math.round(g * alpha + 255 * (1 - alpha));
        b = Math.round(b * alpha + 255 * (1 - alpha));
      }
    }
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq > 140 ? 'text-zinc-950' : 'text-white';
  } else {
    const lower = clean.toLowerCase();
    if (
      lower.includes('-50') ||
      lower.includes('-100') ||
      lower.includes('-200') ||
      lower.includes('-300')
    ) {
      return 'text-zinc-950';
    }
    if (
      lower.includes('-700') ||
      lower.includes('-800') ||
      lower.includes('-900') ||
      lower.includes('-950') ||
      lower.includes('black') ||
      lower.includes('blue') ||
      lower.includes('navy') ||
      lower.includes('indigo')
    ) {
      return 'text-white';
    }
    const numericMatch = lower.match(/-(\d{3})/);
    if (numericMatch) {
      const shade = parseInt(numericMatch[1], 10);
      if (shade >= 400) {
        if (lower.includes('yellow') || lower.includes('lime') || lower.includes('amber') || lower.includes('emerald-400') || lower.includes('green-400') || lower.includes('sky-300')) {
          return shade > 500 ? 'text-white' : 'text-zinc-950';
        }
        return 'text-white';
      }
    }
    if (
      lower.includes('white') ||
      lower.includes('rose-50') ||
      lower.includes('stone-50') ||
      lower.includes('emerald-50') ||
      lower.includes('slate-50') ||
      lower.includes('indigo-50') ||
      lower.includes('blue-50') ||
      lower.includes('pink-50') ||
      lower.includes('amber-50') ||
      lower.includes('orange-50') ||
      lower.includes('cyan-50') ||
      lower.includes('teal-50')
    ) {
      return 'text-zinc-950';
    }
    return 'text-white';
  }
};

// Memoized Student Card for Performance
const StudentCard = React.memo(({ 
  s, 
  pos, 
  editMode, 
  zoom, 
  isWinner, 
  isHovered, 
  isPinned,
  isAbsent,
  overlayFilter,
  bgColor,
  borderColor,
  onDrag,
  onDragEnd, 
  onMouseEnter, 
  onMouseLeave,
  onClick,
  onDelete,
  behaviorNote,
  relationHighlight,
  hasSperrViolation,
  hasWunschMatch,
  isSwapTarget,
  isDragging,
  showEmojis,
  isHighlighted,
  isDimmed
}: any) => {
  const { app } = useApp();
  
  // Boundary positioning states for the tooltip info box
  const [isPositioned, setIsPositioned] = useState(false);
  const [tooltipStyles, setTooltipStyles] = useState<React.CSSProperties>({});
  const cardRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Calculate average
  const getStudentAverage = () => {
    let sum = 0;
    let count = 0;
    const faecher = app.faecher || [];
    faecher.forEach(f => {
      const g = berechne(app, s.id, f, '1');
      if (g !== null && !isNaN(g)) {
        sum += g;
        count++;
      }
    });
    return count > 0 ? (sum / count).toFixed(2) : '-';
  };

  const isTodayAbsent = () => {
    const today = new Date().toISOString().split('T')[0];
    const data = app.anwesenheit?.[s.id]?.[today];
    if (data && Object.values(data).some(v => v && v !== 'a')) return true;
    return false;
  };

  // Boundary logic to prevent info box from clipping at screen edges
  React.useEffect(() => {
    if (!isHovered) {
      setIsPositioned(false);
      return;
    }

    const measureAndPosition = () => {
      if (!cardRef.current || !tooltipRef.current) return;

      const card = cardRef.current;
      const tooltip = tooltipRef.current;
      const container = card.closest('.canvas-area') || document.body;

      const cardRect = card.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const z = zoom || 1;

      // Screen coordinate calculation for optimal centered tooltip above card
      let targetLeft = cardRect.left + (cardRect.width / 2) - (tooltipRect.width / 2);
      let targetTop = cardRect.top - tooltipRect.height - (8 * z);

      const padding = 12 * z; // scalable container padding

      // Check left/right alignment
      if (targetLeft < containerRect.left + padding) {
        targetLeft = containerRect.left + padding;
      } else if (targetLeft + tooltipRect.width > containerRect.right - padding) {
        targetLeft = containerRect.right - padding - tooltipRect.width;
      }

      // Check top/bottom alignment (flip underneath card if space at top is tight)
      let positionBelow = false;
      if (targetTop < containerRect.top + padding) {
        targetTop = cardRect.bottom + (8 * z);
        positionBelow = true;

        if (targetTop + tooltipRect.height > containerRect.bottom - padding) {
          // If it intersects both top and bottom edges, pin to top boundary
          targetTop = containerRect.top + padding;
          positionBelow = false;
        }
      }

      // Map back relative to the student table parent
      const relativeLeft = (targetLeft - cardRect.left) / z;
      const spacing = 8; // standard local gap relative to scaled pixels

      if (positionBelow) {
        setTooltipStyles({
          position: 'absolute',
          top: `calc(100% + ${spacing}px)`,
          left: `${relativeLeft}px`,
          bottom: 'auto',
          transform: 'none',
        });
      } else {
        setTooltipStyles({
          position: 'absolute',
          bottom: `calc(100% + ${spacing}px)`,
          left: `${relativeLeft}px`,
          top: 'auto',
          transform: 'none',
        });
      }
      setIsPositioned(true);
    };

    const timer = setTimeout(measureAndPosition, 0);
    return () => clearTimeout(timer);
  }, [isHovered, zoom]);

  return (
    <motion.div
      ref={cardRef}
      drag={editMode}
      dragMomentum={false}
      whileDrag={{ 
        scale: 1.1, 
        opacity: 0.9, 
        zIndex: 9999, 
        cursor: "grabbing",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
      }}
      whileHover={{ scale: 1.02 }}
      onDrag={onDrag}
      onDragEnd={onDragEnd}
      initial={false}
      animate={{ x: pos.x, y: pos.y }}
      transition={isDragging ? { duration: 0 } : {
        x: { type: "spring", stiffness: 400, damping: 35 },
        y: { type: "spring", stiffness: 400, damping: 35 },
        scale: { duration: 0.15 }
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
        if (!editMode && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onClick(event);
        }
      }}
      role={!editMode ? 'button' : undefined}
      tabIndex={!editMode ? 0 : -1}
      aria-pressed={!editMode ? Boolean(isPinned) : undefined}
      aria-label={`${s.vorname} ${s.nachname || ''}${isAbsent ? ', heute abwesend' : ''}. ${editMode ? 'Sitzplatz verschieben' : (isPinned ? 'Details geöffnet' : 'Details öffnen')}`}
      className={`absolute w-[112px] h-[72px] rounded-2xl border flex flex-col justify-between p-1.5 shrink-0 group student-card transform-gpu contrast-container transition-[background-color,border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-2 ${editMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer hover:shadow-md'} ${isAbsent ? 'opacity-55 grayscale' : ''} ${isDimmed ? 'opacity-15 pointer-events-none scale-95 saturate-50' : ''}`}
      style={{ 
        backgroundColor: bgColor,
        borderColor: isHighlighted
          ? '#4f46e5'
          : (isSwapTarget
            ? '#6366f1'
            : (relationHighlight === 'sperr' ? '#ef4444' : (relationHighlight === 'wunsch' ? '#10b981' : (isWinner ? '#f59e0b' : borderColor)))),
        boxShadow: isHighlighted
          ? '0 0 25px rgba(79, 70, 229, 0.95), 0 0 0 2px #4f46e5'
          : (isSwapTarget
            ? '0 0 25px rgba(99, 102, 241, 0.75), ring-4 ring-indigo-105'
            : (relationHighlight === 'sperr' 
              ? '0 0 20px rgba(239, 68, 68, 0.7), inset 0 0 0 1px #ef4444' 
              : (relationHighlight === 'wunsch' 
                ? '0 0 20px rgba(16, 185, 129, 0.7), inset 0 0 0 1px #10b981' 
                : (isWinner 
                  ? '0 0 20px rgba(245, 158, 11, 0.5)' 
                  : (hasSperrViolation 
                    ? '0 0 10px rgba(239, 68, 68, 0.3)' 
                    : (editMode ? '0 4px 12px -2px rgb(0 0 0 / 0.12)' : '0 2px 4px -1px rgb(0 0 0 / 0.06)')))))),
        zIndex: isHighlighted ? 400 : (isSwapTarget ? 300 : (relationHighlight ? 150 : (isWinner || isHovered ? 200 : 10)))
      }}
    >
        {isHovered && !editMode && !isDragging && (
           <div 
             ref={tooltipRef}
             style={{
               ...tooltipStyles,
               opacity: isPositioned ? 1 : 0,
               transition: 'opacity 150ms ease-in-out'
             }}
             className="bg-slate-900 border border-slate-700 text-white rounded-2xl shadow-[0_12px_45px_rgba(0,0,0,0.6)] w-60 z-[1000] p-3 flex flex-col gap-2 text-[0.625rem] pointer-events-none animate-in fade-in leading-relaxed"
           >
             {/* Header */}
             <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="font-extrabold text-[0.6875rem] text-wrap leading-tight break-words pr-2 text-slate-100">{s.vorname} {s.nachname}</span>
                <span className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-400 font-bold tabular-nums shrink-0">∅ {getStudentAverage()}</span>
             </div>
             
             {/* Core Traits & Properties Grid */}
             <div className="flex flex-col gap-1.5">
                {/* Status, Level, DaZ/SPF Row */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="bg-slate-800 text-slate-300 font-extrabold px-1.5 py-0.5 rounded text-[0.5rem] uppercase tracking-wider">Level {s.niveau}</span>
                  {s.daz && <span className="bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider text-[0.5rem]">DaZ</span>}
                  {(s.spf || s.espf) && <span className="bg-rose-500/20 text-rose-300 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider text-[0.5rem]">SPF</span>}
                  <span className="text-slate-400 ml-auto whitespace-nowrap text-[0.5625rem]">
                    Status: <span className={isTodayAbsent() ? 'text-rose-450 font-extrabold animate-pulse' : 'text-emerald-400 font-extrabold'}>{isTodayAbsent() ? 'Ist Abwesend' : 'Anwesend'}</span>
                  </span>
                </div>

                {/* Character Traits */}
                {s.charakter && s.charakter.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {s.charakter.map((c: string) => {
                      const traitsMap: Record<string, string> = {
                        lebhaft: '🏃‍♂️ Lebhaft',
                        interessiert: '💡 Interessiert',
                        ruhig: '🤫 Ruhig',
                        konzentriert: '🎯 Konzentriert',
                        aufmerksam: '👁️ Aufmerksam',
                        hilfsbereit: '🤝 Hilfsbereit',
                        kreativ: '🎨 Kreativ',
                        braucht_ruhepol: '🕊️ Ruhepol',
                        braucht_fokus: '🎯 Fokus',
                        impulsstark: '⚡ Impulsiv',
                        braucht_naehe: '🧑‍🏫 Nähe'
                      };
                      return (
                        <span key={c} className="bg-slate-800/85 text-slate-205 px-1.5 py-0.5 rounded border border-slate-700/60 font-medium">
                          {traitsMap[c] || c}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Partners info */}
                {((s.wunschpartner && s.wunschpartner.length > 0) || (s.sperrpartner && s.sperrpartner.length > 0)) && (
                  <div className="border-t border-slate-800/60 pt-1.5 mt-0.5 flex flex-col gap-1 text-[0.5625rem]">
                    {s.wunschpartner && s.wunschpartner.length > 0 && (
                      <div className="flex items-center gap-1 text-slate-300">
                        <span className="text-emerald-400 font-bold shrink-0">❤️ Wunsch:</span>
                        <span className="text-wrap leading-tight break-words text-slate-400">
                          {(s.wunschpartner || [])
                            .map((id: string) => app.schueler.find((st: any) => st.id === id)?.vorname)
                            .filter(Boolean)
                            .join(', ') || 'Keiner'}
                        </span>
                      </div>
                    )}
                    {s.sperrpartner && s.sperrpartner.length > 0 && (
                      <div className="flex items-center gap-1 text-slate-300">
                        <span className="text-rose-400 font-bold shrink-0">⚠️ Sperr:</span>
                        <span className="text-wrap leading-tight break-words text-slate-400">
                          {(s.sperrpartner || [])
                            .map((id: string) => app.schueler.find((st: any) => st.id === id)?.vorname)
                            .filter(Boolean)
                            .join(', ') || 'Keiner'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Pedagogical notes / Behavior notes */}
                {(behaviorNote || s.notiz) && (
                  <div className="border-t border-slate-800/60 pt-1.5 mt-0.5 text-slate-450 italic font-medium line-clamp-2 leading-relaxed text-[0.5625rem]">
                    📝 {behaviorNote || s.notiz}
                  </div>
                )}
             </div>
           </div>
        )}

        {/* Left Side Gender Indicator Strip - Elegant, floating pill with soft pastel tones */}
        <div className={`absolute left-1.5 top-3.5 bottom-3.5 w-1 rounded-full transition-all duration-300 gender-marker ${
          s.geschlecht === 'weiblich' 
            ? 'bg-rose-300 dark:bg-rose-400/90 shadow-[0_0_4px_rgba(244,63,94,0.15)]' 
            : s.geschlecht === 'männlich' 
              ? 'bg-sky-300 dark:bg-sky-400/90 shadow-[0_0_4px_rgba(14,165,233,0.15)]' 
              : 'bg-slate-200 dark:bg-slate-700'
        }`} />

        <div className="flex flex-col justify-between w-full h-full p-0.5 select-none relative pointer-events-none text-center">
          {isAbsent && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-rose-600 px-1.5 py-0.5 text-[6px] font-black uppercase tracking-wide text-white shadow-sm">
              Abwesend
            </span>
          )}
          
          {/* Top Row: Indicators like Level, SPF, DAZ, Birthday etc. */}
          <div className="flex items-center justify-between w-full h-4 leading-none select-none px-1 ">
            {/* Left side: indicators */}
            <div className="flex items-center gap-1">
              <span className={`font-black opacity-80 px-1 py-0.5 rounded-md leading-none shrink-0 ${getContrastTextClass(bgColor) === 'text-white' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`} style={{ fontSize: '7px' }}>
                L{s.niveau}
              </span>
              {s.daz && <Languages size={10} className="text-amber-500 shrink-0 indicator-icon filter drop-shadow-sm" />}
              {(s.spf || s.espf) && <ShieldAlert size={10} className="text-rose-500 shrink-0 indicator-icon filter drop-shadow-sm" />}
            </div>

            {/* Right side: relationship check and birthdays */}
            <div className="flex items-center gap-1">
              {app.sitzplanRegeln?.some((r: any) => r.schuelerIds.includes(s.id)) && (
                <div className="group/rule relative shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 block ring-1 ring-white/50" title="Aktive Sitzplan-Regel"></span>
                </div>
              )}
              {isBirthdayToday(s.geburtstag) && <span style={{ fontSize: '11px' }} className="animate-bounce shrink-0" title="Geburtstagskind heute! 🎂">🎂</span>}
              {hasSperrViolation && <span style={{ fontSize: '9px' }} className="animate-pulse shrink-0" title="Sperrpartner-Konflikt!">⚠️</span>}
              {hasWunschMatch && <span style={{ fontSize: '9px' }} className="shrink-0" title="Wunschpartner-Match!">❤️</span>}
            </div>
          </div>

          {/* Middle Row: Student Name - Improved centering and spacing */}
          <div className="flex-1 flex items-center justify-center min-w-0 py-0.5 -mt-0.5">
            <span className={`font-black tracking-tighter leading-none block truncate w-full px-1 ${
              isBirthdayToday(s.geburtstag) 
                ? 'text-pink-600 dark:text-pink-400 animate-pulse' 
                : getContrastTextClass(bgColor)
            }`} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: s.vorname.length > 12 ? '11px' : s.vorname.length > 9 ? '13px' : '15px' }}>
              {s.vorname}
            </span>
          </div>

          {/* Bottom Row: Emojis of Characters & Earned Badges - Improved Spacing to prevent overlap */}
          {showEmojis && (
            <div className="flex items-center justify-center gap-1.5 h-6 mt-auto pb-0.5 select-none border-t border-black/5 dark:border-white/5 pt-1 animate-fade-in">
              {(() => {
                // Get current behavior icon from latest status log
                const studentLogs = (app.statusLog || [])
                  .filter((l: any) => l.schuelerId === s.id)
                  .sort((a: any, b: any) => b.timestamp - a.timestamp);
                
                const currentStatusIconId = studentLogs[0]?.iconId;
                const behaviorStages = app.behavior_stages || [
                  { id: '1', label: 'Super', color: '#10b981', icon: '🌟' },
                  { id: '2', label: 'Gut', color: '#3b82f6', icon: '😊' },
                  { id: '3', label: 'OK', color: '#94a3b8', icon: '😐' },
                  { id: '4', label: 'Ermahnung', color: '#f59e0b', icon: '⚠️' },
                  { id: '5', label: 'Inakzeptabel', color: '#ef4444', icon: '🚫' }
                ];
                const currentStatusIcon = behaviorStages.find((st: any) => st.id === currentStatusIconId)?.icon || '⚪';

                const activeTraits = (s.charakter || []).map((chr: string) => {
                  const emMap: Record<string, string> = {
                    lebhaft: '🏃‍♂️',
                    interessiert: '💡',
                    ruhig: '🤫',
                    konzentriert: '🎯',
                    aufmerksam: '👁️',
                    hilfsbereit: '🤝',
                    kreativ: '🎨',
                    braucht_ruhepol: '🕊️',
                    braucht_fokus: '🎯',
                    impulsstark: '⚡',
                    braucht_naehe: '🧑‍🏫'
                  };
                  return emMap[chr] || '';
                }).filter(Boolean);

                const badgeEmojis = (s.badges || []).map((b: any) => b.icon).filter(Boolean);

                // Merged list of indicators to display, cap at 4 to maintain spacing since we now have more width
                const displayItems = [...activeTraits.slice(0, 1), ...badgeEmojis.splice(0, 3)].slice(0, 4);

                return (
                  <div className="flex items-center justify-between gap-1 w-full scale-100 origin-center px-1">
                    <div className="flex items-center gap-1">
                      {displayItems.map((icon, idx) => (
                        <span key={idx} className="text-[0.625rem] filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)] hover:scale-125 transition-transform">
                          {icon}
                        </span>
                      ))}
                    </div>
                    {/* Current Behavior Status (Abzeichen) - Highly visible on the right */}
                    <div className={`flex items-center justify-center w-5 h-5 rounded-md border shadow-sm ${getContrastTextClass(bgColor) === 'text-white' ? 'bg-white/20 border-white/30' : 'bg-black/5 border-black/10'}`}>
                      <span className="text-[0.75rem]">{currentStatusIcon}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {editMode && (
          <button 
            onClick={onDelete}
            aria-label={`${s.vorname} aus dem Sitzplan entfernen`}
            title={`${s.vorname} aus dem Sitzplan entfernen`}
            className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 transition-opacity border-2 border-white pointer-events-auto shadow-rose-500/25 active:scale-90"
          >
            <Trash2 size={12} />
          </button>
        )}
    </motion.div>
  );
});

const parseDateToMs = (dateStr: string) => {
  if (!dateStr) return 0;
  if (dateStr.includes('-')) {
    return new Date(dateStr).getTime() || 0;
  }
  const parts = dateStr.split('.');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    return new Date(year, month, day).getTime() || 0;
  }
  if (parts.length === 2) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = new Date().getFullYear();
    return new Date(year, month, day).getTime() || 0;
  }
  return 0;
};

const getTodayAttendanceStatus = (sid: string, app: any) => {
  const todayStr = new Date().toISOString().split("T")[0];
  const todayRecord = app?.anwesenheit?.[sid]?.[todayStr] || {};
  const statusValues = Object.values(todayRecord);
  
  if (statusValues.length === 0) {
    return { label: "Kein Eintrag", color: "text-slate-500", bgColor: "bg-slate-50 border-slate-100", icon: "⚪" };
  }
  
  if (statusValues.some(st => st === 'u')) {
    return { label: "Unentschuldigt fehlend", color: "text-rose-600", bgColor: "bg-rose-50 border-rose-150", icon: "🔴" };
  }
  if (statusValues.some(st => st === 'e')) {
    return { label: "Entschuldigt fehlend", color: "text-amber-600", bgColor: "bg-amber-50 border-amber-150", icon: "🟡" };
  }
  return { label: "Anwesend", color: "text-emerald-600", bgColor: "bg-emerald-50 border-emerald-150", icon: "🟢" };
};

const getAttendanceStats = (sid: string, app: any) => {
  const data = app?.anwesenheit?.[sid] || {};
  let totalExcused = 0;
  let totalUnexcused = 0;
  let totalLatenesses = 0;

  Object.entries(data).forEach(([date, dayData]) => {
    Object.values(dayData).forEach((status) => {
      if (status === "e") totalExcused++;
      else if (status === "u") totalUnexcused++;
    });
    const details = app?.anwesenheitDetail?.[sid]?.[date];
    if (details?.verspaetung) {
      totalLatenesses += details.verspaetung;
    }
  });

  return {
    totalExcused,
    totalUnexcused,
    totalLatenesses,
    totalAbsences: totalExcused + totalUnexcused
  };
};

const getLatestNotes = (sid: string, app: any) => {
  const journalNotes = (app.journal || [])
    .filter((n: any) => n.schuelerId === sid)
    .map((n: any) => ({
      id: n.id,
      date: n.datum,
      timestamp: parseDateToMs(n.datum),
      category: n.kategorie || 'Journal',
      content: n.inhalt,
      icon: n.icon || '📝'
    }));

  const appNotes = (app.notes || [])
    .filter((n: any) => n.schuelerId === sid)
    .map((n: any) => ({
      id: n.id,
      date: n.datum,
      timestamp: parseDateToMs(n.datum),
      category: n.kategorie || 'Notiz',
      content: n.inhalt,
      icon: n.icon || '📌'
    }));

  const notizenNotes = (app.notizen || [])
    .filter((n: any) => n.schuelerId === sid)
    .map((n: any) => ({
      id: n.id,
      date: new Date(n.timestamp).toLocaleDateString('de-DE'),
      timestamp: n.timestamp,
      category: n.kategorie || n.titel || 'Notiz',
      content: n.inhalt,
      icon: n.icon || '📝'
    }));

  const attendanceNotes: any[] = [];
  const attendanceDetails = app.anwesenheitDetail?.[sid] || {};
  Object.entries(attendanceDetails).forEach(([date, detail]: [string, any]) => {
    if (detail?.notiz) {
      attendanceNotes.push({
        id: `att-${date}`,
        date: date.split('-').reverse().join('.'),
        timestamp: new Date(date).getTime() || 0,
        category: 'Anwesenheit',
        content: detail.notiz,
        icon: '📅'
      });
    }
  });

  const allNotes = [...journalNotes, ...appNotes, ...notizenNotes, ...attendanceNotes];
  return allNotes.sort((a, b) => b.timestamp - a.timestamp);
};

// Centered Student Detail Panel (Always visible in the center when hovering/clicked)
const StudentDetailPanel = ({ s, app, onClose, isPinned, behaviorNote, onUpdateFoto }: any) => {
  if (!s) return null;
  const [showCameraOptions, setShowCameraOptions] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera stream on unmount
  React.useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const handleStartCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 400, height: 400, facingMode: 'user' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error(err);
      setCameraError("Kamera nicht verfügbar oder Zugriff verweigert.");
      setIsCameraActive(false);
    }
  };

  const handleStopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const video = videoRef.current;
        const size = Math.min(video.videoWidth, video.videoHeight);
        const xOffset = (video.videoWidth - size) / 2;
        const yOffset = (video.videoHeight - size) / 2;
        ctx.drawImage(video, xOffset, yOffset, size, size, 0, 0, 400, 400);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        if (onUpdateFoto) {
          onUpdateFoto(dataUrl);
        }
        handleStopCamera();
        setShowCameraOptions(false);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string' && onUpdateFoto) {
          onUpdateFoto(reader.result);
          setShowCameraOptions(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteFoto = () => {
    if (onUpdateFoto) {
      onUpdateFoto(null);
    }
    setShowCameraOptions(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 15 }}
      transition={{ type: "spring", damping: 25, stiffness: 350 }}
      className={`w-[21rem] max-w-sm bg-white backdrop-blur-xl rounded-[2rem] shadow-[0_30px_70px_rgba(15,23,42,0.15)] border border-slate-200 relative overflow-hidden ${isPinned ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
      {/* Camera Options Overlay */}
      <AnimatePresence>
        {showCameraOptions && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 bg-white/98 backdrop-blur-md rounded-[2rem] p-5 z-[210] flex flex-col justify-between"
          >
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Profilbild verwalten</h3>
              
              {isCameraActive ? (
                <div className="relative w-44 h-44 bg-black rounded-2xl overflow-hidden shadow-inner border border-slate-200">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  <div className="absolute inset-x-0 bottom-2 flex justify-center gap-2">
                    <button 
                      onClick={handleCapture}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[0.625rem] font-bold shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      Aufnehmen
                    </button>
                    <button 
                      onClick={handleStopCamera}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[0.625rem] font-bold shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4 w-full max-w-[14rem]">
                  {s.foto ? (
                    <img 
                      src={s.foto} 
                      alt={s.vorname} 
                      className="w-20 h-20 rounded-2xl object-cover ring-4 ring-indigo-50 shadow-md"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center font-black text-2xl ring-4 ring-indigo-50 shadow-md ${s.geschlecht === 'weiblich' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'}`}>
                      {s.vorname.charAt(0)}{s.nachname.charAt(0)}
                    </div>
                  )}

                  {cameraError && (
                    <p className="text-[0.625rem] text-rose-600 font-bold text-center bg-rose-50 px-2.5 py-1 rounded-lg">{cameraError}</p>
                  )}

                  <div className="flex flex-col gap-2 w-full">
                    <button 
                      onClick={handleStartCamera}
                      className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[0.6875rem] font-black transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Camera size={13} /> Kamera starten
                    </button>
                    
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-[0.6875rem] font-black transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Upload size={13} /> Foto hochladen
                    </button>
                    
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                    />

                    {s.foto && (
                      <button 
                        onClick={handleDeleteFoto}
                        className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[0.6875rem] font-black transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Trash2 size={13} /> Foto löschen
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={() => { handleStopCamera(); setShowCameraOptions(false); }}
              className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Schließen
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header with Visual Decor - Soft pastel look */}
      <div className={`h-24 w-full relative flex items-center p-5 border-b border-slate-100 ${s.geschlecht === 'weiblich' ? 'bg-rose-50/90' : 'bg-blue-50/90'}`}>
        <div className={`absolute top-0 right-0 p-4 opacity-10 rotate-12 ${s.geschlecht === 'weiblich' ? 'text-rose-600' : 'text-blue-600'}`}>
           <Users size={64} />
         </div>
        <div className="relative z-10 w-full flex justify-between items-center gap-3">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            {/* Profile Photo Avatar */}
            <div className="relative shrink-0 group">
              {s.foto ? (
                <img 
                  src={s.foto} 
                  alt={s.vorname} 
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white shadow-md"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg ring-2 ring-white shadow-md ${s.geschlecht === 'weiblich' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'}`}>
                  {s.vorname.charAt(0)}{s.nachname.charAt(0)}
                </div>
              )}
              {isPinned && (
                <button
                  onClick={() => setShowCameraOptions(true)}
                  className="absolute inset-0 bg-slate-900/60 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                  title="Foto verwalten"
                >
                  <Camera size={14} />
                </button>
              )}
            </div>

            <div className="min-w-0 pr-1 flex-1">
              <p className={`text-[1rem] font-black tracking-tight leading-tight text-wrap break-words ${s.geschlecht === 'weiblich' ? 'text-rose-950' : 'text-blue-950'}`}>{s.vorname} {s.nachname}</p>
              <p className={`text-[0.5625rem] font-black uppercase tracking-widest mt-1 ${s.geschlecht === 'weiblich' ? 'text-rose-600/80' : 'text-blue-600/80'}`}>
                {isPinned ? '📍 Fixierte Ansicht' : '🔍 Live-Vorschau'}
              </p>
            </div>
          </div>

          {isPinned && onClose && (
            <button 
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className={`p-1.5 rounded-xl transition-all active:scale-95 cursor-pointer pointer-events-auto relative z-20 shrink-0 ${s.geschlecht === 'weiblich' ? 'bg-rose-200/30 hover:bg-rose-200/50 text-rose-700' : 'bg-blue-200/30 hover:bg-blue-200/50 text-blue-700'}`}
              title="Schließen"
            >
              <Minimize2 size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4 max-h-[21.875rem] overflow-y-auto pr-2 custom-scrollbar">
          {/* Status & Indicators Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100/80 flex items-center gap-3">
               {(() => {
                 const studentLogs = (app.statusLog || [])
                   .filter((l: any) => l.schuelerId === s.id)
                   .sort((a: any, b: any) => b.timestamp - a.timestamp);
                 const currentStatusIconId = studentLogs[0]?.iconId;
                 const behaviorStages = app.behavior_stages || [
                   { id: '1', label: 'Super', color: '#10b981', icon: '🌟' },
                   { id: '2', label: 'Gut', color: '#3b82f6', icon: '😊' },
                   { id: '3', label: 'OK', color: '#94a3b8', icon: '😐' },
                   { id: '4', label: 'Ermahnung', color: '#f59e0b', icon: '⚠️' },
                   { id: '5', label: 'Inakzeptabel', color: '#ef4444', icon: '🚫' }
                 ];
                 const stage = behaviorStages.find((st: any) => st.id === currentStatusIconId) || behaviorStages[2];
                 return (
                   <>
                     <span className="text-[1.25rem] leading-normal filter drop-shadow-sm select-none">{stage.icon}</span>
                     <div className="flex flex-col">
                        <span className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest leading-none">Status</span>
                        <span className="text-[0.6875rem] font-black text-slate-800 mt-1">{stage.label}</span>
                     </div>
                   </>
                 );
               })()}
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100/80 flex items-center gap-3">
               <span className="text-[1.25rem] leading-normal filter drop-shadow-sm select-none">🎂</span>
               <div className="flex flex-col">
                  <span className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest leading-none">Geburtstag</span>
                  <span className="text-[0.6875rem] font-black text-slate-800 mt-1">
                    {s.geburtstag ? (s.geburtstag.includes('-') ? s.geburtstag.split('-').reverse().slice(0, 2).join('.') + '.' : s.geburtstag.split('.').slice(0, 2).join('.') + '.') : '—'}
                  </span>
               </div>
            </div>
          </div>

          {/* Attendance Section */}
          <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between text-[0.5625rem] font-black uppercase text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar size={12} className="text-indigo-500" /> Anwesenheit
              </span>
              {(() => {
                const todayStatus = getTodayAttendanceStatus(s.id, app);
                return (
                  <span className={`px-2 py-0.5 rounded-lg text-[0.5625rem] font-bold border ${todayStatus.bgColor} ${todayStatus.color}`}>
                    {todayStatus.icon} {todayStatus.label}
                  </span>
                );
              })()}
            </div>
            {(() => {
              const stats = getAttendanceStats(s.id, app);
              return (
                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-100/60">
                  <div className="flex flex-col">
                    <span className="text-[0.8125rem] font-black text-rose-600">{stats.totalUnexcused}</span>
                    <span className="text-[0.5rem] font-black uppercase tracking-wider text-slate-400">Unentsch.</span>
                  </div>
                  <div className="flex flex-col border-x border-slate-200/60">
                    <span className="text-[0.8125rem] font-black text-amber-600">{stats.totalExcused}</span>
                    <span className="text-[0.5rem] font-black uppercase tracking-wider text-slate-400">Entsch.</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[0.8125rem] font-black text-indigo-600">{stats.totalLatenesses ? `${stats.totalLatenesses}m` : '0m'}</span>
                    <span className="text-[0.5rem] font-black uppercase tracking-wider text-slate-400">Zuspät</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Level & Tags */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[0.5625rem] font-black uppercase text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200/60">Niveau {s.niveau}</span>
            {s.geschlecht && <span className={`text-[0.5625rem] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl border ${s.geschlecht === 'weiblich' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{s.geschlecht}</span>}
            {s.daz && <span className="text-[0.5625rem] font-black text-amber-600 uppercase px-2.5 py-1 bg-amber-50 rounded-xl border border-amber-200">DAZ</span>}
            {(s.spf || s.espf) && <span className="text-[0.5625rem] font-black text-indigo-600 uppercase px-2.5 py-1 bg-indigo-50 rounded-xl border border-indigo-200">SPF</span>}
          </div>

          {/* Character Traits */}
          {s.charakter && s.charakter.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[0.5625rem] font-black uppercase text-slate-400 tracking-widest px-1">Charakter & Merkmale</p>
              <div className="flex flex-wrap gap-1.5">
                {s.charakter.map((chr: string) => {
                  const labelMap: Record<string, string> = {
                    lebhaft: '🏃‍♂️ Lebhaft',
                    interessiert: '💡 Interessiert',
                    ruhig: '🤫 Ruhig',
                    konzentriert: '🎯 Konzentriert',
                    aufmerksam: '👁️ Aufmerksam',
                    hilfsbereit: '🤝 Hilfsbereit',
                    kreativ: '🎨 Kreativ',
                    braucht_ruhepol: '🕊️ Ruhepol',
                    braucht_fokus: '🎯 Fokus',
                    impulsstark: '⚡ Impulsiv',
                    braucht_naehe: '🧑‍🏫 Nähe'
                  };
                  return (
                    <span key={chr} className="text-[0.5625rem] font-bold bg-white text-slate-700 px-2.5 py-1 rounded-xl border border-slate-200/80 shadow-xs">
                      {labelMap[chr] || chr}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Badges */}
          {s.badges && s.badges.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[0.5625rem] font-black uppercase text-slate-400 tracking-widest px-1">Erreichte Abzeichen</p>
              <div className="flex flex-wrap gap-1.5">
                {s.badges.map((b: any, i: number) => (
                  <div key={i} className="flex items-center gap-1.5 bg-amber-50/50 text-amber-850 px-2.5 py-1 rounded-xl border border-amber-100 shadow-xs">
                    <span className="text-[0.75rem] leading-tight">{b.icon}</span>
                    <span className="text-[0.625rem] font-black leading-none">{b.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes Area */}
          <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 relative group">
            <div className="absolute -right-2 -bottom-2 opacity-5 text-slate-900 rotate-12 group-hover:scale-110 transition-transform">
               <Notebook size={48} />
            </div>
            <div className="flex items-center gap-2 text-[0.5625rem] font-black uppercase text-slate-400 mb-2.5 relative z-10">
                <Notebook size={12} className="text-indigo-500" /> Letzte Einträge & Notizen
            </div>
            
            {(() => {
              const latestNotes = getLatestNotes(s.id, app);
              const pedNote = behaviorNote || s.notiz;
              
              if (latestNotes.length === 0 && !pedNote) {
                return (
                  <p className="text-[0.6875rem] text-slate-400 italic font-medium leading-relaxed relative z-10">
                    Keine aktuellen Einträge oder Notizen vorhanden.
                  </p>
                );
              }
              
              return (
                <div className="space-y-2 max-h-[12.5rem] overflow-y-auto pr-1.5 custom-scrollbar relative z-10">
                  {/* Highlighted Pedagogical Focus */}
                  {pedNote && (
                    <div className="p-2 bg-indigo-50/70 border border-indigo-100/50 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-[0.5625rem] font-black text-indigo-600 uppercase tracking-wider">
                        <span className="flex items-center gap-1">📍 Pädagogischer Schwerpunkt</span>
                      </div>
                      <p className="text-[0.6875rem] text-indigo-950 font-medium leading-normal">
                        {pedNote}
                      </p>
                    </div>
                  )}
                  
                  {/* Other Timeline Notes */}
                  {latestNotes.map((note) => (
                    <div key={note.id} className="p-2 bg-white border border-slate-100/60 rounded-xl space-y-1 shadow-xs">
                      <div className="flex items-center justify-between text-[0.5625rem] font-bold text-slate-400">
                        <span className="flex items-center gap-1">
                          <span>{note.icon}</span>
                          <span className="uppercase tracking-wider text-[0.5rem] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">{note.category}</span>
                        </span>
                        <span>{note.date}</span>
                      </div>
                      <p className="text-[0.6875rem] text-slate-600 font-medium leading-normal break-words">
                        {note.content}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
          
          {/* Critical Medical/Support Info */}
          {(s.foerderprofil?.diagnosen || (s.foerderprofil?.foerderbedarfBereiche && s.foerderprofil.foerderbedarfBereiche.length > 0)) && (
            <div className="p-3.5 bg-rose-50/60 rounded-2xl border border-rose-100 relative ">
              <div className="absolute -right-1 -top-1 opacity-10 text-rose-500">
                 <ShieldAlert size={32} />
              </div>
              <div className="flex items-center gap-2 text-[0.5625rem] font-black uppercase text-rose-400 mb-2">
                  <Activity size={12} className="shrink-0" /> Wichtige Hinweise
              </div>
              <div className="space-y-2">
                {s.foerderprofil?.diagnosen && (
                  <p className="text-[0.6875rem] text-rose-950 font-bold leading-snug">
                    {s.foerderprofil.diagnosen}
                  </p>
                )}
                {s.foerderprofil?.foerderbedarfBereiche && s.foerderprofil.foerderbedarfBereiche.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {s.foerderprofil.foerderbedarfBereiche.map((b: string) => (
                      <span key={b} className="text-[0.5rem] font-black uppercase bg-white text-rose-700 px-2 py-0.5 rounded border border-rose-100/50">{b}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
      </div>
    </motion.div>
  );
};

const RulesGeneratorModal = ({ 
  isOpen, 
  onClose, 
  app, 
  setApp 
}: any) => {
  const [newRule, setNewRule] = useState<{
    typ: 'nicht_nebeneinander' | 'nebeneinander' | 'feste_zone' | 'fester_platz';
    schuelerIds: string[];
    zone?: 'vorne' | 'mitte' | 'hinten';
    platzId?: string;
    notiz?: string;
  }>({ typ: 'nicht_nebeneinander', schuelerIds: [] });

  // Filter malformed/legacy rules and capture missing fixed-seat positions safely.
  const existingRules = sanitizeSeatingRules(
    app.sitzplanRegeln || [],
    app.schueler || [],
    app.sitzplan_schueler || {}
  );

  const students = [...app.schueler].sort((a: any, b: any) => a.vorname.localeCompare(b.vorname));

  const handleSave = () => {
    if (newRule.schuelerIds.length === 0) return;
    if (existingRules.length >= 20) {
      alert("Maximal 20 Regeln erlaubt.");
      return;
    }

    const primaryStudentId = newRule.schuelerIds[0];
    const fixedPosition = newRule.typ === 'fester_platz'
      ? app.sitzplan_schueler?.[primaryStudentId]
      : undefined;

    if (newRule.typ === 'fester_platz' && !fixedPosition) {
      alert("Bitte platziere das Kind zuerst im Sitzplan. Erst dann kann dieser Platz fixiert werden.");
      return;
    }

    const rule = {
      ...newRule,
      id: crypto.randomUUID(),
      ...(newRule.typ === 'feste_zone' ? { zone: newRule.zone || 'vorne' } : {}),
      ...(fixedPosition ? { position: { ...fixedPosition } } : {})
    };

    setApp((prev: any) => ({
      ...prev,
      sitzplanRegeln: [
        ...sanitizeSeatingRules(prev.sitzplanRegeln || [], prev.schueler || [], prev.sitzplan_schueler || {}),
        rule
      ]
    }));
    setNewRule({ typ: 'nicht_nebeneinander', schuelerIds: [] });
  };

  const getRuleText = (r: any) => {
    const names = r.schuelerIds.map((id: string) => app.schueler.find((s: any) => s.id === id)?.vorname);
    if (r.typ === 'nicht_nebeneinander') return `${names.join(' & ')} NICHT nebeneinander`;
    if (r.typ === 'nebeneinander') return `${names.join(' & ')} zusammen`;
    if (r.typ === 'feste_zone') return `${names[0]} immer ${r.zone}`;
    if (r.typ === 'fester_platz') return `${names[0]} hat festen Platz`;
    return '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
        <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2"><Sparkles className="text-indigo-500" /> Sitzplan-Regeln</h2>
        
        <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-6 custom-scrollbar">
          
          {/* List existing */}
          {existingRules.length > 0 && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <h3 className="text-[0.6875rem] font-black uppercase text-slate-500 mb-3 tracking-widest">Aktive Regeln</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {existingRules.map((r: any) => (
                  <div key={r.id} className="bg-white border rounded-xl p-2.5 flex items-center justify-between shadow-sm">
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-slate-700 truncate">{getRuleText(r)}</span>
                      {r.notiz && <span className="text-xs text-slate-400 truncate">{r.notiz}</span>}
                    </div>
                    <button 
                      onClick={() => setApp((prev: any) => ({
                        ...prev,
                        sitzplanRegeln: (prev.sitzplanRegeln || []).filter((er: any) => er.id !== r.id)
                      }))}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Rule */}
          <div className="border border-slate-200 rounded-2xl p-4">
             <h3 className="text-[0.6875rem] font-black uppercase text-slate-500 mb-3 tracking-widest">Neue Regel erstellen</h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                {[
                  { typ: 'nicht_nebeneinander', label: 'Trennen' },
                  { typ: 'nebeneinander', label: 'Zusammen' },
                  { typ: 'feste_zone', label: 'Feste Zone' },
                  { typ: 'fester_platz', label: 'Fester Platz' }
                ].map(t => (
                  <button 
                    key={t.typ}
                    onClick={() => {
                      setNewRule({ typ: t.typ as any, schuelerIds: [] });
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${newRule.typ === t.typ ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-slate-50'}`}
                  >
                    {t.label}
                  </button>
                ))}
             </div>

             <div className="space-y-4">
                <div className="flex gap-4">
                  <select 
                    value={newRule.schuelerIds[0] || ''} 
                    onChange={e => setNewRule({ ...newRule, schuelerIds: [e.target.value, newRule.schuelerIds[1]].filter(Boolean) })}
                    className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
                  >
                    <option value="">Kind 1 wählen...</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.vorname} {s.nachname}</option>)}
                  </select>

                  {(newRule.typ === 'nicht_nebeneinander' || newRule.typ === 'nebeneinander') && (
                    <select 
                      value={newRule.schuelerIds[1] || ''} 
                      onChange={e => setNewRule({ ...newRule, schuelerIds: [newRule.schuelerIds[0], e.target.value].filter(Boolean) })}
                      className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
                    >
                      <option value="">Kind 2 wählen...</option>
                      {students.map(s => <option key={s.id} value={s.id} disabled={s.id === newRule.schuelerIds[0]}>{s.vorname} {s.nachname}</option>)}
                    </select>
                  )}

                  {newRule.typ === 'feste_zone' && (
                    <select 
                      value={newRule.zone || 'vorne'} 
                      onChange={e => setNewRule({ ...newRule, zone: e.target.value as any })}
                      className="flex-1 p-2.5 bg-white border border-indigo-200 rounded-xl text-sm font-bold text-indigo-700"
                    >
                      <option value="vorne">Vorne (Tafelnähe)</option>
                      <option value="mitte">Mitte</option>
                      <option value="hinten">Hinten</option>
                    </select>
                  )}

                  {newRule.typ === 'fester_platz' && (
                     <div className="flex-1 flex items-center">
                        <span className="text-xs text-slate-500 italic mr-2 bg-slate-100 p-2 rounded-lg">
                          {newRule.schuelerIds[0] && app.sitzplan_schueler?.[newRule.schuelerIds[0]]
                            ? `Aktueller Platz wird fixiert (${Math.round(app.sitzplan_schueler[newRule.schuelerIds[0]].x)} / ${Math.round(app.sitzplan_schueler[newRule.schuelerIds[0]].y)})`
                            : 'Kind zuerst im Raum platzieren'}
                        </span>
                     </div>
                  )}
                </div>

                <input 
                  type="text" 
                  placeholder="Notiz (optional, z.B. Sieht schlecht)" 
                  value={newRule.notiz || ''}
                  onChange={e => setNewRule({ ...newRule, notiz: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm"
                />

                <button 
                  onClick={handleSave}
                  disabled={
                    newRule.schuelerIds.length === 0 ||
                    ((newRule.typ === 'nicht_nebeneinander' || newRule.typ === 'nebeneinander') && newRule.schuelerIds.length < 2) ||
                    (newRule.typ === 'fester_platz' && !app.sitzplan_schueler?.[newRule.schuelerIds[0]])
                  }
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20"
                >
                  Regel speichern
                </button>
             </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t flex justify-end">
          <button onClick={onClose} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all">Fertig & Schließen</button>
        </div>
      </div>
    </div>
  );
};

const getStudentsOnTable = (obj: any, studentPositions: Record<string, { x: number; y: number }>) => {
  const studentsOnTable: string[] = [];
  const pad = 25; // Good safety pad

  const tableCenterX = obj.x + obj.w / 2;
  const tableCenterY = obj.y + obj.h / 2;
  const rad = ((obj.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(-rad);
  const sin = Math.sin(-rad);

  for (const [studentId, pos] of Object.entries(studentPositions)) {
    if (!pos) continue;
    // Student card center (width is 112px, height is 72px)
    const sCenterX = pos.x + 56;
    const sCenterY = pos.y + 36;

    // Translate to table origin
    const dx = sCenterX - tableCenterX;
    const dy = sCenterY - tableCenterY;

    // Rotate back to unrotated space
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    // Check if within bounds of the table
    const halfW = obj.w / 2 + pad;
    const halfH = obj.h / 2 + pad;

    if (Math.abs(localX) <= halfW && Math.abs(localY) <= halfH) {
      studentsOnTable.push(studentId);
    }
  }
  return studentsOnTable;
};

export default function SeatingPlan() {
  const { app, setApp, setPage } = useApp();
  const [selectedObjId, setSelectedObjId] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [overlayFilter, setOverlayFilter] = useState<'standard' | 'daz' | 'spf' | 'niveau' | 'heatmap' | 'charakter'>('standard');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [gridSnapType, setGridSnapType] = useState<'none' | '10' | '20' | '40'>('20');
  const snapToGrid = gridSnapType !== 'none';
  const [absentStudents, setAbsentStudents] = useState<Record<string, boolean>>({});
  const [hoveredStudentId, setHoveredStudentId] = useState<string | null>(null);
  const [pinnedStudentId, setPinnedStudentId] = useState<string | null>(null);
  const [isLottoRunning, setIsLottoRunning] = useState(false);
  const [lottoWinner, setLottoWinner] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.85);
  const [editMode, setEditMode] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPresentationMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const [activeDrag, setActiveDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const [swapHoverTargetId, setSwapHoverTargetId] = useState<string | null>(null);

  const [activeTableDrag, setActiveTableDrag] = useState<{
    tableId: string;
    dx: number;
    dy: number;
    studentIds: string[];
  } | null>(null);

  const tableDragRef = React.useRef<{
    tableId: string;
    studentIds: string[];
    initialPositions: Record<string, { x: number; y: number }>;
  } | null>(null);
  
  // Emojis default to false (hidden) based on "by default soll nur der Name angezeigt werden!"
  const [showEmojis, setShowEmojis] = useState(() => {
    return localStorage.getItem('seating_plan_show_emojis') === 'true';
  });

  const [showRulesModal, setShowRulesModal] = useState(false);
  const [previewState, setPreviewState] = useState<{ active: boolean, previousSitzplan: any, violatedRules: string[], history: {plan: any, violations: string[]}[], historyIndex: number }>({ active: false, previousSitzplan: null, violatedRules: [], history: [], historyIndex: -1 });
  const [showUndoShuffle, setShowUndoShuffle] = useState(false);
  const [lastShuffleSitzplan, setLastShuffleSitzplan] = useState<any>(null);
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);
  const [highlightedStudentIds, setHighlightedStudentIds] = useState<string[] | null>(null);

  const toggleEmojis = () => {
    setShowEmojis(prev => {
      const next = !prev;
      localStorage.setItem('seating_plan_show_emojis', String(next));
      return next;
    });
  };
  
  // Undo/Redo historical state stack
  const [history, setHistory] = useState<{
    sitzplan_schueler: Record<string, { x: number; y: number }>;
    sitzplan_objekte: any[];
  }[]>([]);

  const pushState = () => {
    setHistory(prev => {
      const currentSchueler = { ...(app.sitzplan_schueler || {}) };
      const currentObjekte = (app.sitzplan_objekte || []).map(obj => ({ ...obj }));
      
      const last = prev[prev.length - 1];
      if (last) {
        const lastSchuelerStr = JSON.stringify(last.sitzplan_schueler);
        const lastObjekteStr = JSON.stringify(last.sitzplan_objekte);
        const currentSchuelerStr = JSON.stringify(currentSchueler);
        const currentObjekteStr = JSON.stringify(currentObjekte);
        
        if (lastSchuelerStr === currentSchuelerStr && lastObjekteStr === currentObjekteStr) {
          return prev;
        }
      }
      return [
        ...prev,
        {
          sitzplan_schueler: currentSchueler,
          sitzplan_objekte: currentObjekte
        }
      ].slice(-40); // Keep last 40 states
    });
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setApp(prev => ({
      ...prev,
      sitzplan_schueler: previous.sitzplan_schueler,
      sitzplan_objekte: previous.sitzplan_objekte
    }));
  };

  const applyRoomPreset = (type: 'rows' | 'u_shape' | 'groups' | 'exam') => {
    pushState();
    
    const allStudents = [...app.schueler];
    if (allStudents.length === 0) return;

    const newPositions: Record<string, { x: number, y: number }> = {};
    const newObjects: any[] = [];

    // Base Tafel & Lehrpult
    newObjects.push({
      id: 'tafel-' + Date.now(),
      type: 'blackboard',
      x: 400,
      y: 15,
      w: 200,
      h: 12,
      rotation: 0
    });
    newObjects.push({
      id: 'lehrpult-' + Date.now(),
      type: 'teacher_desk',
      x: 430,
      y: 55,
      w: 140,
      h: 50,
      rotation: 0
    });

    if (type === 'rows') {
      const numDesks = Math.ceil(allStudents.length / 2);
      const cols = numDesks <= 9 ? 3 : 4;
      const spacingX = cols === 3 ? 290 : 225;
      const startX = cols === 3 ? 120 : 60;
      const spacingY = 125;
      const startY = 160;

      for (let d = 0; d < numDesks; d++) {
        const col = d % cols;
        const row = Math.floor(d / cols);
        const x = startX + col * spacingX;
        const y = startY + row * spacingY;

        const deskId = `tisch-rows-${d}-${Date.now()}`;
        newObjects.push({
          id: deskId,
          type: 'rectangle',
          x,
          y,
          w: 240,
          h: 80,
          rotation: 0
        });

        const s1 = allStudents[2 * d];
        if (s1) {
          newPositions[s1.id] = { x: x + 4, y: y + 4 };
        }
        const s2 = allStudents[2 * d + 1];
        if (s2) {
          newPositions[s2.id] = { x: x + 124, y: y + 4 };
        }
      }
    } else if (type === 'u_shape') {
      const numDesks = Math.ceil(allStudents.length / 2);
      const getUPathPosition = (t: number) => {
        const totalLen = 1360;
        const targetDist = t * totalLen;
        if (targetDist <= 360) {
          return { x: 180, y: 160 + targetDist, rot: 0 };
        } else if (targetDist <= 1000) {
          return { x: 180 + (targetDist - 360), y: 520, rot: 0 };
        } else {
          return { x: 820, y: 520 - (targetDist - 1000), rot: 0 };
        }
      };

      for (let d = 0; d < numDesks; d++) {
        const t = numDesks > 1 ? d / (numDesks - 1) : 0.5;
        const pos = getUPathPosition(t);
        const deskId = `tisch-u-${d}-${Date.now()}`;

        newObjects.push({
          id: deskId,
          type: 'rectangle',
          x: pos.x - 120,
          y: pos.y - 40,
          w: 240,
          h: 80,
          rotation: 0
        });

        const s1 = allStudents[2 * d];
        if (s1) {
          newPositions[s1.id] = { x: pos.x - 120 + 4, y: pos.y - 40 + 4 };
        }
        const s2 = allStudents[2 * d + 1];
        if (s2) {
          newPositions[s2.id] = { x: pos.x - 120 + 124, y: pos.y - 40 + 4 };
        }
      }
    } else if (type === 'groups') {
      const numIslands = Math.ceil(allStudents.length / 4);
      const cols = numIslands <= 4 ? 2 : 3;
      const spacingX = cols === 2 ? 460 : 310;
      const startX = cols === 2 ? 180 : 80;
      const spacingY = 220;
      const startY = 160;

      for (let i = 0; i < numIslands; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = startX + col * spacingX;
        const y = startY + row * spacingY;

        const deskId1 = `tisch-g1-${i}-${Date.now()}`;
        const deskId2 = `tisch-g2-${i}-${Date.now()}`;

        newObjects.push({
          id: deskId1,
          type: 'rectangle',
          x,
          y,
          w: 240,
          h: 80,
          rotation: 0
        });
        newObjects.push({
          id: deskId2,
          type: 'rectangle',
          x,
          y: y + 84,
          w: 240,
          h: 80,
          rotation: 0
        });

        const s1 = allStudents[4 * i];
        if (s1) newPositions[s1.id] = { x: x + 4, y: y + 4 };
        const s2 = allStudents[4 * i + 1];
        if (s2) newPositions[s2.id] = { x: x + 124, y: y + 4 };
        const s3 = allStudents[4 * i + 2];
        if (s3) newPositions[s3.id] = { x: x + 4, y: y + 88 };
        const s4 = allStudents[4 * i + 3];
        if (s4) newPositions[s4.id] = { x: x + 124, y: y + 88 };
      }
    } else if (type === 'exam') {
      const cols = allStudents.length <= 12 ? 3 : (allStudents.length <= 20 ? 4 : 5);
      const spacingX = cols === 3 ? 310 : (cols === 4 ? 230 : 185);
      const startX = cols === 3 ? 180 : (cols === 4 ? 100 : 60);
      const spacingY = 110;
      const startY = 165;

      for (let i = 0; i < allStudents.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = startX + col * spacingX;
        const y = startY + row * spacingY;

        const deskId = `tisch-exam-${i}-${Date.now()}`;
        newObjects.push({
          id: deskId,
          type: 'square',
          x,
          y,
          w: 120,
          h: 80,
          rotation: 0
        });

        const s1 = allStudents[i];
        newPositions[s1.id] = { x: x + 4, y: y + 4 };
      }
    }

    setApp(prev => ({
      ...prev,
      sitzplan_schueler: newPositions,
      sitzplan_objekte: newObjects
    }));
  };

  const planRef = useRef<HTMLDivElement>(null);
  const GRID_SIZE = gridSnapType === '10' ? 10 : gridSnapType === '20' ? 20 : gridSnapType === '40' ? 40 : 10;

  const students = app.schueler;
  
  // Safety fallback for seating data
  const sitzplan_schueler = app.sitzplan_schueler || {};
  const sitzplan_objekte = app.sitzplan_objekte || [];

  // Find students not yet in seating plan
  const unplacedStudents = students.filter(s => !sitzplan_schueler[s.id]);
  const placedStudents = students.filter(s => sitzplan_schueler[s.id]);
  const isPlanEmpty = placedStudents.length === 0 && (app.sitzplan_objekte || []).length === 0;

  // Helper to retrieve canvas dimensions for boundary enforcement
  const getCanvasDimensions = () => {
    const canvasW = planRef.current?.clientWidth || 1200;
    const canvasH = planRef.current?.clientHeight || 800;
    return { canvasW, canvasH };
  };

  const updatePosition = (id: string, x: number, y: number) => {
    pushState();
    const { canvasW, canvasH } = getCanvasDimensions();
    const minX = 10;
    const minY = 10;
    const maxX = Math.max(minX, canvasW - 120);
    const maxY = Math.max(minY, canvasH - 80);

    let finalX = Math.max(minX, Math.min(maxX, x));
    let finalY = Math.max(minY, Math.min(maxY, y));

    if (snapToGrid) {
      finalX = Math.round(finalX / GRID_SIZE) * GRID_SIZE;
      finalY = Math.round(finalY / GRID_SIZE) * GRID_SIZE;
      finalX = Math.max(minX, Math.min(maxX, finalX));
      finalY = Math.max(minY, Math.min(maxY, finalY));
    }
    
    setApp(prev => ({
      ...prev,
      sitzplan_schueler: {
        ...prev.sitzplan_schueler,
        [id]: { x: finalX, y: finalY }
      }
    }));
  };

  // Detect students placed outside visible room boundaries (e.g. negative or off-canvas)
  const outOfBoundsStudents = students.filter(s => {
    const p = sitzplan_schueler[s.id];
    if (!p) return false;
    const { canvasW, canvasH } = getCanvasDimensions();
    return p.x < 0 || p.y < 0 || p.x > canvasW - 30 || p.y > canvasH - 30;
  });

  const handleResetOutOfBoundsToUnplaced = () => {
    pushState();
    setApp(prev => {
      const newPlan = { ...(prev.sitzplan_schueler || {}) };
      outOfBoundsStudents.forEach(s => {
        delete newPlan[s.id];
      });
      return { ...prev, sitzplan_schueler: newPlan };
    });
  };

  const handleBringOutOfBoundsToRoom = () => {
    pushState();
    const { canvasW, canvasH } = getCanvasDimensions();
    setApp(prev => {
      const newPlan = { ...(prev.sitzplan_schueler || {}) };
      let startX = 120;
      let startY = 180;
      outOfBoundsStudents.forEach((s) => {
        newPlan[s.id] = { x: startX, y: startY };
        startX += 130;
        if (startX > canvasW - 150) {
          startX = 120;
          startY += 85;
        }
      });
      return { ...prev, sitzplan_schueler: newPlan };
    });
  };

  const removeStudent = (id: string) => {
    pushState();
    setApp(prev => {
      const newPlan = { ...prev.sitzplan_schueler };
      delete newPlan[id];
      return { ...prev, sitzplan_schueler: newPlan };
    });
  };

  const handleSwap = (id1: string, id2: string) => {
    pushState();
    const s_plan = app.sitzplan_schueler || {};
    const pos1 = s_plan[id1];
    const pos2 = s_plan[id2];
    setApp(prev => ({
      ...prev,
      sitzplan_schueler: {
        ...(prev.sitzplan_schueler || {}),
        [id1]: pos2,
        [id2]: pos1
      }
    }));
  };

  // Helper to optimize student layout by respecting Wunschpartner (+score) and Sperrpartner (-score) rules
  // while fully preserving the underlying categoric distribution (e.g. alternating gender or active/anchor)
  const optimizeSeatingWithRelations = (
    initialStudents: any[],
    coords: { x: number; y: number }[],
    mixType: string
  ): any[] => {
    const count = initialStudents.length;
    if (count <= 1 || coords.length < count) return initialStudents;

    // 1. Build list of index pairs that are considered neighbors.
    // Neighbors are slots close to each other (Euclidean distance < 160px).
    const neighbors: [number, number][] = [];
    const neighborThreshold = 160;

    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = coords[i].x - coords[j].x;
        const dy = coords[i].y - coords[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < neighborThreshold) {
          neighbors.push([i, j]);
        }
      }
    }

    // 2. Classify slots based on the initial student placed there to preserve group mixture structure
    const getImpulseCategory = (s: any) => {
      const t = s.charakter || [];
      if (t.includes('impulsstark') || t.includes('braucht_ruhepol') || t.includes('braucht_fokus') || t.includes('lebhaft')) return 'active';
      if (t.includes('ruhig') || t.includes('konzentriert') || t.includes('aufmerksam') || t.includes('hilfsbereit')) return 'anchor';
      return 'neutral';
    };

    const getSlotCategory = (s: any): string => {
      if (mixType === 'gender') return s.geschlecht || 'unknown';
      if (mixType === 'tandem') return String(s.niveau);
      if (mixType === 'impulse') return getImpulseCategory(s);
      return 'free'; // no grouping constraint
    };

    const slotCategories = initialStudents.map(s => getSlotCategory(s));

    // Running state
    let currentArrangement = [...initialStudents];

    // Score function
    const computeScore = (arr: any[]) => {
      let score = 0;
      for (const [i, j] of neighbors) {
        const s1 = arr[i];
        const s2 = arr[j];
        if (!s1 || !s2) continue;

        // Wunschpartner (+150 for each direction matched)
        if ((s1.wunschpartner || []).includes(s2.id)) score += 150;
        if ((s2.wunschpartner || []).includes(s1.id)) score += 150;

        // Sperrpartner (-500 for each direction matched, extremely heavy weight to avoid being next to each other)
        if ((s1.sperrpartner || []).includes(s2.id)) score -= 500;
        if ((s2.sperrpartner || []).includes(s1.id)) score -= 500;
      }
      return score;
    };

    let bestArrangement = [...currentArrangement];
    let bestScore = computeScore(bestArrangement);

    // Monte Carlo / Local Hill-climbing Optimization (fast & deterministic execution)
    // Run 2500 trials to swap students of the same category slot
    for (let trial = 0; trial < 2500; trial++) {
      const i = Math.floor(Math.random() * count);
      const j = Math.floor(Math.random() * count);
      if (i === j) continue;

      const s1 = currentArrangement[i];
      const s2 = currentArrangement[j];

      if (slotCategories[i] === slotCategories[j]) {
        // Swap trial
        const copyArr = [...currentArrangement];
        copyArr[i] = s2;
        copyArr[j] = s1;

        const score = computeScore(copyArr);
        if (score > bestScore || (score === bestScore && Math.random() < 0.25)) {
          currentArrangement = copyArr;
          if (score > bestScore) {
            bestArrangement = copyArr;
            bestScore = score;
          }
        }
      }
    }

    return bestArrangement;
  };

  const handleGeneratorAction = (type: 'rows' | 'groups' | 'u-shape' | 'gender' | 'tandem' | 'random' | 'impulse' | 'automatik') => {
    pushState();

    const isMixingType = ['gender', 'tandem', 'impulse', 'random', 'automatik'].includes(type);
    const sitzplan_schueler_current = app.sitzplan_schueler || {};
    const currentlyPlaced = students.filter(s => sitzplan_schueler_current[s.id]);

    if (isMixingType && currentlyPlaced.length > 0) {
      // 1. Collect and logically sort all occupied coordinates (top-to-bottom, left-to-right)
      const coordinates = currentlyPlaced
        .map(s => ({ ...sitzplan_schueler_current[s.id] }))
        .sort((a, b) => {
          if (Math.abs(a.y - b.y) > 15) {
            return a.y - b.y;
          }
          return a.x - b.x;
        });

      // 2. Sort/mix the CURRENTLY PLACED students according to the selected strategy
      let sortedCurrentlyPlaced = [...currentlyPlaced];
      
      if (type === 'gender') {
        const boys = currentlyPlaced.filter(s => s.geschlecht === 'männlich');
        const girls = currentlyPlaced.filter(s => s.geschlecht === 'weiblich');
        sortedCurrentlyPlaced = [];
        const max = Math.max(boys.length, girls.length);
        for (let i = 0; i < max; i++) {
          if (boys[i]) sortedCurrentlyPlaced.push(boys[i]);
          if (girls[i]) sortedCurrentlyPlaced.push(girls[i]);
        }
      } else if (type === 'tandem') {
        const l1 = currentlyPlaced.filter(s => s.niveau === 1);
        const l2 = currentlyPlaced.filter(s => s.niveau === 2);
        sortedCurrentlyPlaced = [];
        const max = Math.max(l1.length, l2.length);
        for (let i = 0; i < max; i++) {
          if (l1[i]) sortedCurrentlyPlaced.push(l1[i]);
          if (l2[i]) sortedCurrentlyPlaced.push(l2[i]);
        }
      } else if (type === 'automatik') {
        const spfZorDaz = currentlyPlaced.filter(s => s.spf || s.espf || s.daz);
        const standard = currentlyPlaced.filter(s => !(s.spf || s.espf || s.daz));
        
        spfZorDaz.sort(() => Math.random() - 0.5);
        standard.sort(() => Math.random() - 0.5);
        
        sortedCurrentlyPlaced = [...spfZorDaz, ...standard];
      } else if (type === 'impulse') {
        const active = currentlyPlaced.filter(s => {
          const t = s.charakter || [];
          return t.includes('impulsstark') || t.includes('braucht_ruhepol') || t.includes('braucht_fokus') || t.includes('lebhaft');
        });
        const anchors = currentlyPlaced.filter(s => {
          const t = s.charakter || [];
          if (t.includes('impulsstark') || t.includes('braucht_ruhepol') || t.includes('braucht_fokus') || t.includes('lebhaft')) return false;
          return t.includes('ruhig') || t.includes('konzentriert') || t.includes('aufmerksam') || t.includes('hilfsbereit');
        });
        const neutrals = currentlyPlaced.filter(s => {
          const t = s.charakter || [];
          const isActive = t.includes('impulsstark') || t.includes('braucht_ruhepol') || t.includes('braucht_fokus') || t.includes('lebhaft');
          const isAnchor = t.includes('ruhig') || t.includes('konzentriert') || t.includes('aufmerksam') || t.includes('hilfsbereit');
          return !isActive && !isAnchor;
        });

        sortedCurrentlyPlaced = [];
        const maxLength = Math.max(active.length, anchors.length);
        for (let i = 0; i < maxLength; i++) {
          if (active[i]) sortedCurrentlyPlaced.push(active[i]);
          if (anchors[i]) sortedCurrentlyPlaced.push(anchors[i]);
        }
        neutrals.forEach(s => sortedCurrentlyPlaced.push(s));
      } else if (type === 'random') {
        sortedCurrentlyPlaced.sort(() => Math.random() - 0.5);
      }

      // 3. Optimize the mixed assignment to respect wunsch/sperr partners on active chairs
      const optimizedCurrentlyPlaced = optimizeSeatingWithRelations(sortedCurrentlyPlaced, coordinates, type);

      const newPlan = { ...sitzplan_schueler_current };
      optimizedCurrentlyPlaced.forEach((student, idx) => {
        if (coordinates[idx]) {
          newPlan[student.id] = { x: coordinates[idx].x, y: coordinates[idx].y };
        }
      });

      setApp(prev => ({ ...prev, sitzplan_schueler: newPlan }));
      setShowGenerator(false);
      return;
    }

    let sorted = [...students];
    const newPlan: Record<string, { x: number; y: number }> = {};
    
    const marginX = 80;
    const marginY = 120; // Extra margin for blackboard
    const stepX = 110;
    const stepY = 100;

    if (type === 'gender') {
      const boys = students.filter(s => s.geschlecht === 'männlich');
      const girls = students.filter(s => s.geschlecht === 'weiblich');
      sorted = [];
      const max = Math.max(boys.length, girls.length);
      for (let i = 0; i < max; i++) {
        if (boys[i]) sorted.push(boys[i]);
        if (girls[i]) sorted.push(girls[i]);
      }
    } else if (type === 'tandem') {
      const l1 = students.filter(s => s.niveau === 1);
      const l2 = students.filter(s => s.niveau === 2);
      sorted = [];
      const max = Math.max(l1.length, l2.length);
      for (let i = 0; i < max; i++) {
        if (l1[i]) sorted.push(l1[i]);
        if (l2[i]) sorted.push(l2[i]);
      }
    } else if (type === 'impulse') {
      const active = students.filter(s => {
        const t = s.charakter || [];
        return t.includes('impulsstark') || t.includes('braucht_ruhepol') || t.includes('braucht_fokus') || t.includes('lebhaft');
      });
      const anchors = students.filter(s => {
        const t = s.charakter || [];
        if (t.includes('impulsstark') || t.includes('braucht_ruhepol') || t.includes('braucht_fokus') || t.includes('lebhaft')) return false;
        return t.includes('ruhig') || t.includes('konzentriert') || t.includes('aufmerksam') || t.includes('hilfsbereit');
      });
      const neutrals = students.filter(s => {
        const t = s.charakter || [];
        const isActive = t.includes('impulsstark') || t.includes('braucht_ruhepol') || t.includes('braucht_fokus') || t.includes('lebhaft');
        const isAnchor = t.includes('ruhig') || t.includes('konzentriert') || t.includes('aufmerksam') || t.includes('hilfsbereit');
        return !isActive && !isAnchor;
      });

      sorted = [];
      const maxLength = Math.max(active.length, anchors.length);
      for (let i = 0; i < maxLength; i++) {
        if (active[i]) sorted.push(active[i]);
        if (anchors[i]) sorted.push(anchors[i]);
      }
      neutrals.forEach(s => sorted.push(s));
    } else if (type === 'automatik') {
      const spfZorDaz = students.filter(s => s.spf || s.espf || s.daz);
      const standard = students.filter(s => !(s.spf || s.espf || s.daz));
      
      spfZorDaz.sort(() => Math.random() - 0.5);
      standard.sort(() => Math.random() - 0.5);
      
      sorted = [...spfZorDaz, ...standard];
    } else if (type === 'random') {
      sorted.sort(() => Math.random() - 0.5);
    } else {
      // For freshly generated rows/groups/u-shape layouts, shuffle them initially so they are dynamic!
      sorted.sort(() => Math.random() - 0.5);
    }

    // Generate static coordinates based on selected layout preset
    const coordinates: { x: number; y: number }[] = [];
    const layoutStyle = ['rows', 'groups', 'u-shape'].includes(type) ? type : 'rows';
    const count = sorted.length;

    if (layoutStyle === 'u-shape') {
      const onSide = Math.ceil(count / 3);
      for (let i = 0; i < count; i++) {
        if (i < onSide) { // Left column
          coordinates.push({ x: 100, y: 150 + i * stepY });
        } else if (i < onSide * 2) { // Top row
          coordinates.push({ x: 100 + (i - onSide + 1) * stepX, y: 150 });
        } else { // Right column
          coordinates.push({ x: 100 + (onSide + 1) * stepX, y: 150 + (i - onSide * 2 + 1) * stepY });
        }
      }
    } else if (layoutStyle === 'groups') {
      for (let idx = 0; idx < count; idx++) {
        const groupIndex = Math.floor(idx / 4);
        const inGroupIndex = idx % 4;
        const groupRow = Math.floor(groupIndex / 2);
        const groupCol = groupIndex % 2;
        
        const baseX = marginX + groupCol * (stepX * 3);
        const baseY = marginY + groupRow * (stepY * 2.5);
        
        let dx = 0, dy = 0;
        if (inGroupIndex === 0) { dx = 0; dy = 0; }
        else if (inGroupIndex === 1) { dx = stepX; dy = 0; }
        else if (inGroupIndex === 2) { dx = 0; dy = stepY; }
        else if (inGroupIndex === 3) { dx = stepX; dy = stepY; }
        
        coordinates.push({ x: baseX + dx, y: baseY + dy });
      }
    } else { // 'rows'
      for (let idx = 0; idx < count; idx++) {
        const row = Math.floor(idx / 5);
        const col = idx % 5;
        coordinates.push({ x: marginX + col * stepX, y: marginY + row * stepY });
      }
    }

    // Optimize the fresh layout to satisfy Wunschpartner & Sperrpartner constraints
    const optimizedSorted = optimizeSeatingWithRelations(sorted, coordinates, type);

    optimizedSorted.forEach((s, idx) => {
      if (coordinates[idx]) {
        newPlan[s.id] = { x: coordinates[idx].x, y: coordinates[idx].y };
      }
    });

    setApp(prev => ({ ...prev, sitzplan_schueler: newPlan }));
    setShowGenerator(false);
  };

  const calculateStudentColor = (s: any) => {
    if (overlayFilter === 'standard') return '#ffffff';
    
    if (overlayFilter === 'daz') {
      return s.daz ? '#fef3c7' : '#ffffff'; // Amber 100
    }
    
    if (overlayFilter === 'spf') {
      return (s.spf || s.espf) ? '#e0e7ff' : '#ffffff'; // Indigo 100
    }

    if (overlayFilter === 'charakter') {
      const traits = s.charakter || [];
      const isImpulsstark = traits.includes('impulsstark');
      const needsRuhepol = traits.includes('braucht_ruhepol');
      const needsFokus = traits.includes('braucht_fokus') || traits.includes('braucht_naehe');
      const hasLively = traits.includes('lebhaft');
      const hasQuiet = traits.includes('ruhig') || traits.includes('konzentriert') || traits.includes('aufmerksam');
      
      if (isImpulsstark) return '#ffe4e6'; // Rose 100 (high energy / impulsstark)
      if (needsRuhepol) return '#f0f9ff'; // Sky 50 (seeks calm / needs quiet neighbor)
      if (needsFokus) return '#f5f3ff'; // Violet 50 (needs focus guidance)
      if (hasLively && hasQuiet) return '#f3e8ff'; // Purple 100
      if (hasLively) return '#ffedd5'; // Orange 100 (lively / lebhaft)
      if (hasQuiet) return '#ccfbf1'; // Teal 100 (quiet, anchor student)
      if (traits.length > 0) return '#fef9c3'; // Yellow 100
      return '#ffffff';
    }

    if (overlayFilter === 'niveau') {
      if (s.niveau === 1) return '#ecfdf5'; // Emerald 50
      if (s.niveau === 2) return '#f0f9ff'; // Sky 50
      if (s.niveau === 3) return '#fffbeb'; // Amber 50
      return '#ffffff';
    }

    if (overlayFilter === 'heatmap') {
      const subjects = app.faecher || [];
      let sum = 0;
      let count = 0;
      subjects.forEach(f => {
        const note = berechne(app, s.id, f, '1');
        if (note) {
          sum += note;
          count++;
        }
      });

      if (count === 0) return 'rgba(113, 113, 122, 0.1)'; 
      const avg = sum / count;
      
      if (avg <= 1.5) return 'rgba(34, 197, 94, 0.2)'; 
      if (avg <= 2.5) return 'rgba(59, 130, 246, 0.2)'; 
      if (avg <= 3.5) return 'rgba(234, 179, 8, 0.2)'; 
      if (avg <= 4.5) return 'rgba(249, 115, 22, 0.2)'; 
      return 'rgba(239, 68, 68, 0.2)'; 
    }

    return '#ffffff';
  };

  const handlePrint = () => {
    setApp(prev => ({
      ...prev,
      activePrintTemplate: 'sitzplan'
    }));
    setPage('drucken');
  };

  const addObject = (type: 'rectangle' | 'square' | 'triangle' | 'teacher_desk' | 'door' | 'window' | 'blackboard') => {
     pushState();
     let w = 80, h = 60;
     if (type === 'rectangle') { w = 120; h = 60; }
     if (type === 'square') { w = 80; h = 80; }
     if (type === 'triangle') { w = 100; h = 100; }
     if (type === 'teacher_desk') { w = 140; h = 50; }
     if (type === 'door') { w = 60; h = 10; }
     if (type === 'window') { w = 140; h = 5; }
     if (type === 'blackboard') { w = 200; h = 10; }

     setApp(prev => ({
       ...prev,
       sitzplan_objekte: [
         ...(prev.sitzplan_objekte || []),
         { id: Date.now().toString(), type, x: 100, y: 100, w, h, rotation: 0 }
       ]
     }));
  };

  const updateObject = (id: string, updates: any) => {
    pushState();
    if (updates.x !== undefined || updates.y !== undefined) {
      if (snapToGrid) {
        if (updates.x !== undefined) updates.x = Math.round(updates.x / GRID_SIZE) * GRID_SIZE;
        if (updates.y !== undefined) updates.y = Math.round(updates.y / GRID_SIZE) * GRID_SIZE;
      }
    }
    setApp(prev => ({
      ...prev,
      sitzplan_objekte: prev.sitzplan_objekte.map(obj => 
        obj.id === id ? { ...obj, ...updates } : obj
      )
    }));
  };

  const removeObject = (id: string) => {
    pushState();
    setApp(prev => ({
      ...prev,
      sitzplan_objekte: prev.sitzplan_objekte.filter(obj => obj.id !== id)
    }));
    if (selectedObjId === id) setSelectedObjId(null);
  };

  const duplicateObject = (id: string) => {
    pushState();
    const original = app.sitzplan_objekte.find(obj => obj.id === id);
    if (!original) return;
    const clone = {
      ...original,
      id: Date.now().toString() + '-' + Math.floor(Math.random() * 1000),
      x: original.x + 30,
      y: original.y + 30
    };
    setApp(prev => ({
      ...prev,
      sitzplan_objekte: [...(prev.sitzplan_objekte || []), clone]
    }));
    setSelectedObjId(clone.id);
  };

  const bringToFront = (id: string) => {
    pushState();
    setApp(prev => {
      const objects = prev.sitzplan_objekte || [];
      const target = objects.find(obj => obj.id === id);
      if (!target) return prev;
      const rest = objects.filter(obj => obj.id !== id);
      return {
        ...prev,
        sitzplan_objekte: [...rest, target]
      };
    });
  };

  const sendToBack = (id: string) => {
    pushState();
    setApp(prev => {
      const objects = prev.sitzplan_objekte || [];
      const target = objects.find(obj => obj.id === id);
      if (!target) return prev;
      const rest = objects.filter(obj => obj.id !== id);
      return {
        ...prev,
        sitzplan_objekte: [target, ...rest]
      };
    });
  };

  const runLotto = () => {
    if (placedStudents.length === 0) return;
    setIsLottoRunning(true);
    setLottoWinner(null);
    let counter = 0;
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * placedStudents.length);
      if (placedStudents[idx]) setLottoWinner(placedStudents[idx].id);
      counter++;
      if (counter > 20) {
        clearInterval(interval);
        setIsLottoRunning(false);
        setTimeout(() => setLottoWinner(null), 5000);
      }
    }, 100);
  };

  const checkRuleViolations = (assignments: Record<string, { x: number, y: number }>) => {
    const rules = app.sitzplanRegeln || [];
    const violations: string[] = [];
    
    // Nearest neighbor: dx < 160 && dy < 60 OR dx < 60 && dy < 160
    const areNeighbors = (p1: any, p2: any) => {
      const dx = Math.abs(p1.x - p2.x);
      const dy = Math.abs(p1.y - p2.y);
      return (dx < 160 && dy < 60) || (dx < 60 && dy < 160);
    };

    rules.forEach((r: any) => {
      if (r.typ === 'nicht_nebeneinander') {
        const p1 = assignments[r.schuelerIds[0]];
        const p2 = assignments[r.schuelerIds[1]];
        if (p1 && p2 && areNeighbors(p1, p2)) {
          violations.push(`${app.schueler.find((s:any) => s.id === r.schuelerIds[0])?.vorname} & ${app.schueler.find((s:any) => s.id === r.schuelerIds[1])?.vorname} (zu nah)`);
        }
      }
    });
    return violations;
  };

  const handleShuffleRules = () => {
    const existingPlan = app.sitzplan_schueler || {};
    const rules = app.sitzplanRegeln || [];
    // Only shuffle students that are already placed! So we only use existing positions.
    const currentStudentIds = Object.keys(existingPlan);
    if (currentStudentIds.length === 0) return;

    // Get all chairs
    const availableChairs = currentStudentIds.map(id => existingPlan[id]);
    
    // Find if the blackboard (Tafel) is placed at the bottom of the room
    const blackboard = app.sitzplan_objekte?.find((obj: any) => obj.type === 'blackboard');
    let isBlackboardAtBottom = false;
    if (blackboard && availableChairs.length > 0) {
      const avgY = availableChairs.reduce((sum, c) => sum + c.y, 0) / availableChairs.length;
      if (blackboard.y > avgY) {
        isBlackboardAtBottom = true;
      }
    }

    // Sort vertical for zones. 
    // If the blackboard is at the bottom, higher Y coords are closer to the blackboard ("vorne"), so sort descending.
    // Otherwise, lower Y coords are closer to the blackboard ("vorne"), so sort ascending.
    const sortedChairs = [...availableChairs].sort((a, b) => {
      return isBlackboardAtBottom ? (b.y - a.y) : (a.y - b.y);
    });
    const third = Math.ceil(sortedChairs.length / 3);
    const chairsWithZones = sortedChairs.map((pos, idx) => {
      let zone = 'mitte';
      if (idx < third) zone = 'vorne';
      else if (idx >= sortedChairs.length - third) zone = 'hinten';
      return { pos, zone };
    });

    let bestAssignments: any = null;
    let minViolations = 999;
    let finalViolations: string[] = [];

    for (let attempt = 0; attempt < 50; attempt++) {
      const unusedChairs = [...chairsWithZones];
      const newPlan: any = {};
      const pendingIds: string[] = [];

      // 1. Fester Platz
      currentStudentIds.forEach(id => {
        const isFesterPlatz = rules.find((r:any) => r.typ === 'fester_platz' && r.schuelerIds.includes(id));
        if (isFesterPlatz) {
          newPlan[id] = existingPlan[id];
          const idx = unusedChairs.findIndex(c => c.pos.x === existingPlan[id].x && c.pos.y === existingPlan[id].y);
          if (idx !== -1) unusedChairs.splice(idx, 1);
        } else {
          pendingIds.push(id);
        }
      });

      // 2. Feste Zone
      const stillPendingIds: string[] = [];
      pendingIds.forEach(id => {
        const zoneRule: any = rules.find((r:any) => r.typ === 'feste_zone' && r.schuelerIds.includes(id));
        if (zoneRule) {
          const validChairs = unusedChairs.filter(c => c.zone === zoneRule.zone);
          if (validChairs.length > 0) {
            const chairIdx = Math.floor(Math.random() * validChairs.length);
            newPlan[id] = validChairs[chairIdx].pos;
            const globalIdx = unusedChairs.indexOf(validChairs[chairIdx]);
            unusedChairs.splice(globalIdx, 1);
          } else {
            stillPendingIds.push(id);
          }
        } else {
          stillPendingIds.push(id);
        }
      });

      // 3. Nebeneinander
      const pairsPending: string[] = [];
      rules.filter((r:any) => r.typ === 'nebeneinander').forEach((r:any) => {
        if (stillPendingIds.includes(r.schuelerIds[0]) && stillPendingIds.includes(r.schuelerIds[1])) {
          pairsPending.push(r.schuelerIds[0], r.schuelerIds[1]);
        }
      });

      for (let i = 0; i < pairsPending.length; i += 2) {
        let placed = false;
        const id1 = pairsPending[i];
        const id2 = pairsPending[i+1];
        if (newPlan[id1] || newPlan[id2]) continue;

        // Find neighborhood pair
        for (let j = 0; j < unusedChairs.length; j++) {
           for (let k = j + 1; k < unusedChairs.length; k++) {
              const dx = Math.abs(unusedChairs[j].pos.x - unusedChairs[k].pos.x);
              const dy = Math.abs(unusedChairs[j].pos.y - unusedChairs[k].pos.y);
              if ((dx < 160 && dy < 60) || (dx < 60 && dy < 160)) {
                newPlan[id1] = unusedChairs[j].pos;
                newPlan[id2] = unusedChairs[k].pos;
                unusedChairs.splice(k, 1);
                unusedChairs.splice(j, 1);
                placed = true;
                break;
              }
           }
           if (placed) break;
        }
        if (!placed) {
          // just put them somewhere if no pair available
          const r1 = Math.floor(Math.random() * unusedChairs.length);
          newPlan[id1] = unusedChairs[r1].pos;
          unusedChairs.splice(r1, 1);
          const r2 = Math.floor(Math.random() * unusedChairs.length);
          newPlan[id2] = unusedChairs[r2].pos;
          unusedChairs.splice(r2, 1);
        }
      }

      // 4. Rest
      const remainingIds = stillPendingIds.filter(id => !newPlan[id]);
      for (const idx of remainingIds) {
        if (unusedChairs.length === 0) break;
        const cIdx = Math.floor(Math.random() * unusedChairs.length);
        newPlan[idx] = unusedChairs[cIdx].pos;
        unusedChairs.splice(cIdx, 1);
      }

      const currentViolations = checkRuleViolations(newPlan);
      if (currentViolations.length === 0) {
        bestAssignments = newPlan;
        finalViolations = [];
        break;
      }

      if (currentViolations.length < minViolations) {
        minViolations = currentViolations.length;
        bestAssignments = newPlan;
        finalViolations = currentViolations;
      }
    }

    setPreviewState(prev => {
      const isNew = !prev.active;
      const initialPlan = isNew ? { ...existingPlan } : prev.previousSitzplan;
      const newHistoryItem = { plan: bestAssignments, violations: finalViolations };
      const newHistory = isNew ? [newHistoryItem] : [...prev.history.slice(0, prev.historyIndex + 1), newHistoryItem];
      return {
        active: true,
        previousSitzplan: initialPlan,
        violatedRules: finalViolations,
        history: newHistory,
        historyIndex: newHistory.length - 1
      };
    });
    setApp(prev => ({ ...prev, sitzplan_schueler: bestAssignments }));
  };

  const handleReset = () => {
    if (confirm('Sitzplan wirklich zurücksetzen?')) {
      pushState();
      setApp(prev => ({ ...prev, sitzplan_schueler: {}, sitzplan_objekte: [] }));
    }
  };

  return (
    <div className="space-y-4 flex-1 flex flex-col h-full min-h-0 print:h-auto print:p-0 print:m-0 landscape-page">
      <RulesGeneratorModal isOpen={showRulesModal} onClose={() => setShowRulesModal(false)} app={app} setApp={setApp} />
      <SeatingPlanAnalysis 
        isOpen={showAnalysisPanel} 
        onClose={() => setShowAnalysisPanel(false)} 
        app={app} 
        setApp={setApp} 
        onHighlightStudents={setHighlightedStudentIds}
      />
      
      {/* Preview Banner */}
      <AnimatePresence>
        {previewState.active && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-amber-100 border-b border-amber-200 overflow-hidden shrink-0 no-print rounded-t-2xl">
            <div className="p-3 max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-amber-900">
                <Sparkles />
                <div>
                  <p className="font-bold text-sm">Vorschau – noch nicht gespeichert</p>
                  {previewState.violatedRules.length > 0 ? (
                    <p className="text-xs font-medium text-rose-600">Achtung, nicht alle Regeln erfüllbar: {previewState.violatedRules.join(', ')}</p>
                  ) : (
                    <p className="text-xs font-medium opacity-80">Alle Vorgaben berücksichtigt.</p>
                  )}
                </div>
              </div>
              <div className="flex bg-white rounded-lg p-1 shadow-sm shrink-0 border border-amber-200 items-center justify-center space-x-1">
                 
                 {previewState.history.length > 1 && (
                   <div className="flex items-center space-x-1 mr-2 bg-amber-50 rounded-md p-1 border border-amber-200/50">
                     <button 
                       onClick={() => {
                         const nextIdx = previewState.historyIndex - 1;
                         if (nextIdx >= 0) {
                           const item = previewState.history[nextIdx];
                           setApp(prev => ({ ...prev, sitzplan_schueler: item.plan }));
                           setPreviewState(prev => ({ ...prev, historyIndex: nextIdx, violatedRules: item.violations }));
                         }
                       }}
                       disabled={previewState.historyIndex <= 0}
                       className="p-1 text-amber-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-100 rounded"
                       title="Vorheriger Wurf"
                     >
                       <ChevronLeft size={16} />
                     </button>
                     <span className="text-xs font-bold text-amber-700/70 w-8 text-center">{previewState.historyIndex + 1}/{previewState.history.length}</span>
                     <button 
                       onClick={() => {
                         const nextIdx = previewState.historyIndex + 1;
                         if (nextIdx < previewState.history.length) {
                           const item = previewState.history[nextIdx];
                           setApp(prev => ({ ...prev, sitzplan_schueler: item.plan }));
                           setPreviewState(prev => ({ ...prev, historyIndex: nextIdx, violatedRules: item.violations }));
                         }
                       }}
                       disabled={previewState.historyIndex >= previewState.history.length - 1}
                       className="p-1 text-amber-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-100 rounded"
                       title="Nächster Wurf"
                     >
                       <ChevronRight size={16} />
                     </button>
                   </div>
                 )}
                 <button onClick={() => {
                   setLastShuffleSitzplan(previewState.previousSitzplan);
                   setShowUndoShuffle(true);
                   setPreviewState({ active: false, previousSitzplan: null, violatedRules: [], history: [], historyIndex: -1 });
                 }} className="px-5 py-2 hover:bg-emerald-50 text-emerald-700 rounded-md font-bold text-sm transition-colors border border-transparent hover:border-emerald-200 outline-none">
                    Übernehmen
                 </button>
                 <span className="w-px h-5 bg-amber-200"></span>
                 <button onClick={handleShuffleRules} className="px-5 py-2 hover:bg-amber-50 text-amber-800 rounded-md font-bold text-sm transition-colors outline-none">
                    Nochmal würfeln
                 </button>
                 <span className="w-px h-5 bg-amber-200"></span>
                 <button onClick={() => {
                   setApp(prev => ({ ...prev, sitzplan_schueler: previewState.previousSitzplan }));
                   setPreviewState({ active: false, previousSitzplan: null, violatedRules: [], history: [], historyIndex: -1 });
                 }} className="px-5 py-2 hover:bg-rose-50 text-rose-600 rounded-md font-bold text-sm transition-colors outline-none">
                    Abbrechen
                 </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>



      <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body {
              width: 100% !important;
              height: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
              background: #ffffff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .seating-plan-printable {
              position: relative !important;
              width: 270mm !important;
              height: 180mm !important;
              max-width: 100% !important;
              max-height: 180mm !important;
              background: #ffffff !important;
              padding: 0 !important;
              margin: 0 auto !important;
              overflow: hidden !important;
              display: block !important;
              border: 1pt solid #cbd5e1 !important;
              border-radius: 8pt !important;
              box-shadow: none !important;
              transform: scale(0.92) !important;
              transform-origin: top left !important;
              page-break-inside: avoid !important;
              page-break-after: avoid !important;
              page-break-before: avoid !important;
            }
            .canvas-zoom-container {
              transform: none !important;
              width: 100% !important;
              height: 100% !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              overflow: visible !important;
            }
            .student-card {
              width: 112px !important;
              height: 64px !important;
              print-color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
              border: 1px solid #cbd5e1 !important;
              box-shadow: none !important;
              border-radius: 12px !important;
            }
            .student-card span {
              font-weight: bold !important;
            }
            .room-object {
              print-color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
              border: 1px solid #94a3b8 !important;
              box-shadow: none !important;
              border-radius: 4px !important;
            }
            .room-object div, .room-object span {
              color: #0f172a !important;
              font-weight: 700 !important;
              text-transform: uppercase !important;
              font-size: 9.5pt !important;
            }
            .room-object.bg-slate-900 {
              background: #f1f5f9 !important;
            }
            .room-object svg path {
              stroke: #0f172a !important;
              stroke-width: 1.5px !important;
            }
            .gender-marker { 
              background: transparent !important; 
              border-right: 1.5px solid #cbd5e1 !important;
              display: block !important;
            }
            .grid-dots { display: none !important; }
            .indicator-icon { opacity: 1 !important; }
            @page { size: A4 landscape !important; margin: 8mm 10mm 10mm 10mm !important; }
          }
          .grid-dots {
            background-image: radial-gradient(#cbd5e1 1.5px, transparent 1.5px);
            background-size: ${GRID_SIZE}px ${GRID_SIZE}px;
            display: ${gridSnapType === 'none' ? 'none' : 'block'};
          }
          .print-only { display: none; }
          .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }

          /* Prevent name text overflow for specific targeted element on seating plan */
          div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(5) {
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
          }
        ` }} />

      {/* Toolbar */}
      {!presentationMode && (
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 bg-white/95 backdrop-blur-xl p-3 rounded-2xl border border-slate-200 shadow-sm no-print print:hidden relative z-[150]">
          <div className="flex items-center gap-3 overflow-x-auto pb-1 max-w-full custom-scrollbar flex-1">
             <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider shrink-0">
               {isPlanEmpty ? 'Sitzplan-Status:' : 'Noch nicht platziert:'}
             </span>
             {isPlanEmpty ? (
               <span className="px-3 py-1.5 rounded-xl border border-indigo-100 bg-indigo-50 text-[0.75rem] font-extrabold text-indigo-700 whitespace-nowrap">
                 Noch nicht eingerichtet · {students.length} {students.length === 1 ? 'Kind' : 'Kinder'}
               </span>
             ) : (
             <div className="flex gap-2">
              {unplacedStudents.map(s => (
                 <button
                  key={s.id}
                  onClick={() => {
                    const occupied = Object.values(app.sitzplan_schueler || {}) as { x: number; y: number }[];
                    let nextX = 100;
                    let nextY = 250;
                    while (occupied.some(p => Math.abs(p.x - nextX) < 120 && Math.abs(p.y - nextY) < 75)) {
                      nextX += 130;
                      if (nextX > 900) {
                        nextX = 100;
                        nextY += 80;
                      }
                    }
                    updatePosition(s.id, nextX, nextY);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-[0.75rem] font-bold hover:border-accent hover:text-accent transition-all shadow-sm whitespace-nowrap flex items-center gap-1.5 active:scale-95"
                >
                  <UserPlus size={12} />
                  {s.vorname}
                 </button>
               ))}
             </div>
             )}
             {unplacedStudents.length === 0 && <span className="text-[0.6875rem] text-slate-300 italic">Alle platziert</span>}
             {outOfBoundsStudents.length > 0 && (
               <button
                 onClick={handleBringOutOfBoundsToRoom}
                 className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-[0.6875rem] font-extrabold flex items-center gap-1 shadow-xs transition-all cursor-pointer shrink-0 animate-pulse"
                 title="Verlorene / unauffindbare Kinder sofort wieder in den Raum holen"
               >
                 <Locate size={12} className="text-amber-600" />
                 {outOfBoundsStudents.length} außerhalb (Zurückholen)
               </button>
             )}
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-center lg:justify-end flex-1 lg:flex-none min-w-0 max-w-full">
            {/* Mode Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200" aria-label="Sitzplan-Modus">
              <button 
                onClick={() => { setEditMode(false); setPresentationMode(false); setSelectedObjId(null); }}
                aria-pressed={!editMode}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold uppercase tracking-wider transition-all ${(!editMode) ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                title="Alltägliche Ansicht des Sitzplans"
              >
                <Eye size={14} /> Alltag
              </button>
              <button 
                onClick={() => { setEditMode(true); setPresentationMode(false); }}
                aria-pressed={editMode}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold uppercase tracking-wider transition-all ${(editMode) ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                title="Sitzplan bearbeiten, Möbel verschieben, Schüler neu platzieren"
              >
                <Move size={14} /> Planen
              </button>
            </div>

          {/* Grid Snap Control */}
          {editMode && !isPlanEmpty && (
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200" title="Raster-Magnetismus">
            <span className="flex items-center gap-1 px-2 text-[0.5625rem] font-black uppercase text-slate-400 tracking-wider">
              <Grid size={11} className="text-slate-400" /> Magnet:
            </span>
            {[
              { id: 'none', label: 'Aus' },
              { id: '10', label: 'Fein' },
              { id: '20', label: 'Mittel' },
              { id: '40', label: 'Grob' }
            ].map(density => {
              const active = gridSnapType === density.id;
              return (
                <button
                  key={density.id}
                  onClick={() => setGridSnapType(density.id as any)}
                  aria-label={`Raster-Magnetismus: ${density.label}`}
                  aria-pressed={active}
                  className={`px-2 py-1 rounded-lg text-[0.625rem] font-black uppercase transition-all ${active ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {density.label}
                </button>
              );
            })}
          </div>
          )}

          <div className="hidden lg:block w-px h-6 bg-slate-200 mx-1" />

          {/* Tools */}
          <div className={`${isPlanEmpty ? 'hidden' : 'flex'} flex-wrap gap-1.5 justify-center lg:justify-start`}>
            <div className="relative">
              <button 
                onClick={() => setShowFilterMenu(!showFilterMenu)} 
                className={`px-3 py-2 rounded-xl border text-[0.6875rem] font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-2 ${overlayFilter !== 'standard' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:text-indigo-700 hover:border-indigo-300'}`} 
                title="Farbliche Hervorhebung"
              >
                <Palette size={14} />
                <span>Hervorhebung: {{
                  standard: 'Standard',
                  daz: 'DaZ',
                  spf: 'SPF / ESPF',
                  charakter: 'Charakter',
                  niveau: 'Lern-Niveaus',
                  heatmap: 'Noten-Heatmap'
                }[overlayFilter]}</span>
                <span className="opacity-60 text-[0.5rem] ml-0.5">▼</span>
              </button>
              <AnimatePresence>
                {showFilterMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute top-full right-0 mt-3 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[120] p-2"
                  >
                    {[
                      { id: 'standard', label: 'Standard', icon: EyeOff },
                      { id: 'daz', label: 'DaZ hervorheben', icon: Languages },
                      { id: 'spf', label: 'SPF/ESPF Fokus', icon: Activity },
                      { id: 'charakter', label: 'Charaktereigenschaften', icon: Users },
                      { id: 'niveau', label: 'Leistungsniveau', icon: Star },
                      { id: 'heatmap', label: 'Noten-Heatmap', icon: Flame },
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => { setOverlayFilter(f.id as any); setShowFilterMenu(false); }}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-[0.75rem] font-bold transition-all ${overlayFilter === f.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        <f.icon size={16} /> {f.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button onClick={runLotto} disabled={isLottoRunning} className={`p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-amber-600 transition-all shadow-sm ${isLottoRunning ? 'animate-spin' : ''}`} title="Lotto">
              <RefreshCw size={18} />
            </button>

            <button 
              onClick={() => setShowRulesModal(true)} 
              className={`p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-600 transition-all shadow-sm relative`} 
              title="Sitzplan-Regeln"
            >
              <Sparkles size={18} />
              {(app.sitzplanRegeln?.length || 0) > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">{app.sitzplanRegeln?.length}</span>
              )}
            </button>

            <button 
              onClick={() => setShowAnalysisPanel(!showAnalysisPanel)} 
              className={`p-2 rounded-xl border transition-all shadow-sm flex items-center justify-center relative ${showAnalysisPanel ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-650 hover:text-indigo-600 hover:border-indigo-150'}`} 
              title="Pädagogische Planungs-Analyse"
            >
              <TrendingUp size={18} />
            </button>
            {/* Raumvorlagen (Room Presets) Dropdown */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowPresetsMenu(!showPresetsMenu);
                  setShowFilterMenu(false);
                }} 
                className={`px-3 py-2 rounded-xl border transition-all shadow-sm flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-wider ${showPresetsMenu ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-700 hover:text-indigo-700 hover:border-indigo-300'}`} 
                title="Raum-Vorlagen & Formationen"
              >
                <LayoutTemplate size={14} />
                <span>Raumvorlagen</span>
              </button>
              <AnimatePresence>
                {showPresetsMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-[200] flex flex-col gap-1 text-[0.75rem]"
                  >
                    <div className="px-3 py-1.5 text-[0.625rem] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                      Wähle eine Raumvorlage:
                    </div>
                    {[
                      { id: 'rows', label: 'Klassische Reihen', desc: 'Doppel-Tische in Spalten', icon: Grid },
                      { id: 'u_shape', label: 'U-Form (Hufeisen)', desc: 'Tische entlang der Wände', icon: Layout },
                      { id: 'groups', label: 'Gruppeninseln', desc: '4er-Blocks für Teamarbeit', icon: Users },
                      { id: 'exam', label: 'Einzeltische', desc: 'Einzelne Tische mit Abstand', icon: Square },
                    ].map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => {
                          applyRoomPreset(preset.id as any);
                          setShowPresetsMenu(false);
                        }}
                        className="w-full text-left flex items-start gap-3 p-2 rounded-xl transition-all hover:bg-indigo-50 text-slate-700 hover:text-indigo-700"
                      >
                        <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500 shrink-0 mt-0.5">
                          <preset.icon size={16} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-extrabold">{preset.label}</span>
                          <span className="text-[0.625rem] text-slate-400 mt-0.5">{preset.desc}</span>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={handleShuffleRules} 
              className={`px-3 py-2 rounded-xl border transition-all shadow-sm flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-wider bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100 mx-1`} 
              title="Neue Sitzordnung"
            >
              <Shuffle size={14} className="text-indigo-600" />
              <span>Neue Sitzordnung</span>
            </button>
            
            {showUndoShuffle && (
              <button 
                onClick={() => {
                   setApp(prev => ({ ...prev, sitzplan_schueler: lastShuffleSitzplan }));
                   setShowUndoShuffle(false);
                }} 
                className={`px-3 py-1.5 rounded-xl border transition-all shadow-sm flex items-center gap-1.5 text-[0.6875rem] font-black uppercase bg-white border-amber-200 text-amber-700 hover:bg-amber-50 mr-1`} 
                title="Letzte Ordnung wiederherstellen"
              >
                <Undo size={14} />
                <span>Letzte Ordnung wiederherstellen</span>
              </button>
            )}

            <button 
              onClick={toggleEmojis} 
              className={`px-3 py-1.5 rounded-xl border transition-all shadow-sm flex items-center gap-1.5 text-[0.6875rem] font-black uppercase ${showEmojis ? 'bg-indigo-50 border-indigo-200 text-indigo-650' : 'bg-white border-slate-200 text-slate-650 hover:text-indigo-600 hover:border-indigo-100'}`} 
              title={showEmojis ? "Emojis ausblenden" : "Emojis einblenden"}
            >
              <Smile size={14} className={showEmojis ? 'text-indigo-500' : 'text-slate-400'} />
              <span>Emojis</span>
            </button>
            
            <button 
              onClick={handleUndo} 
              disabled={history.length === 0} 
              className={`p-2 rounded-xl border transition-all shadow-sm flex items-center justify-center ${history.length === 0 ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-50' : 'bg-white border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 active:scale-95'}`} 
              title="Rückgängig"
            >
              <Undo size={18} />
            </button>
          </div>

          <div className="w-px h-6 bg-slate-200 mx-1" />
        </div>
      </div>
      )}

      {/* Main Canvas Area */}
        <div 
          ref={planRef}
          className="seating-plan-printable flex-1 relative bg-slate-50 border border-slate-200 rounded-2xl shadow-sm canvas-area min-h-[31.25rem]"
          onClick={() => setSelectedObjId(null)}
        >
        <div className="absolute inset-0 grid-dots opacity-40 pointer-events-none" />
        
        {/* Out Of Bounds Recovery Alert Banner */}
        <AnimatePresence>
          {outOfBoundsStudents.length > 0 && (
            <motion.div 
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -30, opacity: 0 }}
              className="absolute top-4 left-4 right-4 z-[300] bg-amber-500/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 border border-amber-400 no-print"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-600/60 rounded-xl shrink-0">
                  <AlertTriangle className="animate-bounce text-amber-100" size={20} />
                </div>
                <div>
                  <p className="font-extrabold text-xs">
                    {outOfBoundsStudents.length === 1
                      ? `Ein Kind (${outOfBoundsStudents[0].vorname}) befindet sich außerhalb des sichtbaren Bereichs!`
                      : `${outOfBoundsStudents.length} Kinder befinden sich außerhalb des sichtbaren Bereichs!`}
                  </p>
                  <p className="text-[0.6875rem] text-amber-100 font-medium">
                    Verloren: {outOfBoundsStudents.map(s => s.vorname).join(', ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBringOutOfBoundsToRoom}
                  className="px-3.5 py-2 bg-white text-amber-900 hover:bg-amber-50 font-black text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  title="Platziert das Kind sofort wieder im sichtbaren Raum"
                >
                  <Locate size={14} />
                  In Raum holen
                </button>
                <button
                  onClick={handleResetOutOfBoundsToUnplaced}
                  className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white font-black text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  title="Legt das Kind zurück in die Warteliste"
                >
                  <RotateCcw size={14} />
                  In Warteliste legen
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Presentation Mode Control Panel overlay */}
        <AnimatePresence>
          {presentationMode && (
            <motion.div 
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="absolute top-6 left-1/2 -translate-x-1/2 z-[300] bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-4 border border-white/10 no-print transition-all"
              onClick={(e) => e.stopPropagation()} // Prevent deselections
            >
              <div className="flex items-center gap-2 mr-1">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-200">Präsentations-Modus</span>
              </div>
              <div className="h-4 w-px bg-white/20" />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setPresentationMode(false);
                    setEditMode(true);
                  }}
                  className="flex items-center gap-1.5 bg-indigo-650 hover:bg-indigo-700 text-white px-4 py-2 rounded-full text-xs font-extrabold transition-all hover:scale-105 active:scale-95 shadow-md shadow-indigo-600/20"
                >
                  <Sliders size={13} />
                  <span>Bearbeiten</span>
                </button>
                <button
                  onClick={() => {
                    setPresentationMode(false);
                    setEditMode(false);
                  }}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-xs font-extrabold transition-all hover:scale-105 active:scale-95 border border-white/10"
                >
                  <Eye size={13} />
                  <span>Alltag</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="absolute inset-0 overflow-auto no-scrollbar canvas-zoom-container" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: `${100/zoom}%`, height: `${100/zoom}%` }}>
          {/* ROOM OBJECTS */}
          {sitzplan_objekte.map((obj) => (
            <motion.div
              key={obj.id}
              drag={editMode}
              dragMomentum={false}
              whileDrag={{ scale: 1.05, opacity: 0.95, boxShadow: "0 25px 35px -5px rgb(0 0 0 / 0.15)", zIndex: 9999, cursor: "grabbing" }}
              whileHover={{ scale: 1.02 }}
              onDragStart={(e, info) => {
                const studentsOnTable = getStudentsOnTable(obj, app.sitzplan_schueler);
                tableDragRef.current = {
                  tableId: obj.id,
                  studentIds: studentsOnTable,
                  initialPositions: studentsOnTable.reduce((acc, sid) => {
                    acc[sid] = { ...app.sitzplan_schueler[sid] };
                    return acc;
                  }, {} as Record<string, { x: number; y: number }>)
                };
              }}
              onDrag={(e, info) => {
                if (!tableDragRef.current) return;
                const { studentIds } = tableDragRef.current;
                const dx = info.offset.x / zoom;
                const dy = info.offset.y / zoom;
                setActiveTableDrag({
                  tableId: obj.id,
                  dx,
                  dy,
                  studentIds
                });
              }}
              onDragEnd={(e, info) => {
                const dx = info.offset.x / zoom;
                const dy = info.offset.y / zoom;
                const { canvasW, canvasH } = getCanvasDimensions();
                
                // Calculate final table position with grid snap if enabled
                let finalTableX = obj.x + dx;
                let finalTableY = obj.y + dy;

                const minX = 10;
                const minY = 10;
                const maxX = Math.max(minX, canvasW - (obj.w || 100));
                const maxY = Math.max(minY, canvasH - (obj.h || 100));

                finalTableX = Math.max(minX, Math.min(maxX, finalTableX));
                finalTableY = Math.max(minY, Math.min(maxY, finalTableY));

                if (snapToGrid) {
                  finalTableX = Math.round(finalTableX / GRID_SIZE) * GRID_SIZE;
                  finalTableY = Math.round(finalTableY / GRID_SIZE) * GRID_SIZE;
                  finalTableX = Math.max(minX, Math.min(maxX, finalTableX));
                  finalTableY = Math.max(minY, Math.min(maxY, finalTableY));
                }
                
                // Actual delta of the table after snapping and clamping
                const actualDx = finalTableX - obj.x;
                const actualDy = finalTableY - obj.y;
                
                // Update table position
                updateObject(obj.id, { x: finalTableX, y: finalTableY });
                
                // Update student positions with the exact same actual delta and clamp them
                if (tableDragRef.current) {
                  const { studentIds, initialPositions } = tableDragRef.current;
                  setApp(prev => {
                    const newSchueler = { ...prev.sitzplan_schueler };
                    studentIds.forEach(sid => {
                      if (initialPositions[sid]) {
                        let stX = initialPositions[sid].x + actualDx;
                        let stY = initialPositions[sid].y + actualDy;
                        stX = Math.max(10, Math.min(canvasW - 120, stX));
                        stY = Math.max(10, Math.min(canvasH - 80, stY));
                        newSchueler[sid] = { x: stX, y: stY };
                      }
                    });
                    return { ...prev, sitzplan_schueler: newSchueler };
                  });
                }
                
                tableDragRef.current = null;
                setActiveTableDrag(null);
              }}
              onClick={(e) => { e.stopPropagation(); if(editMode) setSelectedObjId(selectedObjId === obj.id ? null : obj.id); }}
              initial={false}
              animate={{ x: obj.x, y: obj.y, rotate: obj.rotation || 0, width: obj.w, height: obj.h }}
              transition={{
                x: { type: "spring", stiffness: 400, damping: 35 },
                y: { type: "spring", stiffness: 400, damping: 35 },
                scale: { duration: 0.15 }
              }}
              className={`absolute flex items-center justify-center group room-object ${selectedObjId === obj.id ? 'z-40' : 'z-0'} ${editMode ? 'cursor-grab active:cursor-grabbing' : ''} ${['door', 'window'].includes(obj.type) && editMode ? 'before:absolute before:-inset-3 before:content-[""] before:cursor-grab' : ''}`}
            >
              {obj.type === 'triangle' ? (
                <svg className={`absolute inset-0 w-full h-full drop-shadow-sm transition-all duration-300 ${selectedObjId === obj.id ? 'drop-shadow-[0_0_8px_rgba(79,70,229,0.4)]' : ''}`} viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path 
                    d="M 50 0 L 100 100 L 0 100 Z" 
                    fill={obj.color ? obj.color : (selectedObjId === obj.id ? '#f5f7ff' : '#ffffff')} 
                    stroke={selectedObjId === obj.id ? '#4f46e5' : '#cbd5e1'} 
                    strokeWidth="1.5"
                  />
                </svg>
              ) : (
                <div 
                  className={`absolute inset-0 border transition-all duration-300 ${
                    obj.type === 'door' ? 'bg-orange-50 border-orange-200 rounded-none' :
                    obj.type === 'window' ? 'bg-sky-50 border-sky-300 rounded-none' :
                    obj.type === 'teacher_desk' ? 'bg-slate-50 border-slate-400 rounded-sm shadow-sm' :
                    'bg-white border-slate-300 rounded-sm shadow-sm'
                  } ${obj.type === 'blackboard' ? 'bg-slate-900 border-slate-800' : ''} ${selectedObjId === obj.id ? 'border-indigo-500 ring-4 ring-indigo-50' : ''} ${editMode ? 'group-hover:border-slate-400' : ''}`} 
                  style={obj.color ? { backgroundColor: obj.color, borderColor: 'rgba(0,0,0,0.1)' } : {}}
                />
              )}
              
              <div 
                className={`relative overflow-hidden px-1.5 text-[0.5625rem] font-black uppercase text-slate-400 tracking-tighter text-center print:text-black flex flex-col items-center justify-center min-w-0 ${!editMode ? 'pointer-events-none select-none' : 'z-20'}`}
                style={{ 
                  transform: `rotate(${-obj.rotation}deg)`,
                  width: `${(() => {
                    const angle = Math.abs(obj.rotation || 0) % 180;
                    const isTriangle = obj.type === 'triangle';
                    const padding = isTriangle ? 36 : 16;
                    if (angle === 0) return Math.max(30, obj.w - padding);
                    if (angle === 90) return Math.max(30, obj.h - padding);
                    return Math.max(30, Math.min(obj.w, obj.h) - padding);
                  })()}px`,
                  paddingTop: obj.type === 'triangle' ? '12px' : '0px'
                }}
                onClick={(e) => {
                  if (editMode && e.target instanceof HTMLInputElement) {
                    e.stopPropagation();
                  }
                }}
                onMouseDown={(e) => {
                  if (editMode && e.target instanceof HTMLInputElement) {
                    e.stopPropagation();
                  }
                }}
                onTouchStart={(e) => {
                  if (editMode && e.target instanceof HTMLInputElement) {
                    e.stopPropagation();
                  }
                }}
              >
                {editMode && ['rectangle', 'square', 'triangle', 'teacher_desk', 'blackboard'].includes(obj.type) ? (
                  <input
                    type="text"
                    value={obj.label || ''}
                    placeholder={
                      obj.type === 'teacher_desk' ? 'Pult' :
                      obj.type === 'blackboard' ? 'Tafel' : 'Tisch'
                    }
                    onChange={(e) => updateObject(obj.id, { label: e.target.value })}
                    className={`w-full max-w-full px-1 py-0.5 rounded text-center text-[0.625rem] font-bold outline-none transition-all truncate ${
                      obj.type === 'blackboard' 
                        ? 'bg-slate-800/80 border border-slate-700/50 text-white placeholder:text-slate-500 focus:bg-slate-850 focus:border-indigo-500' 
                        : 'bg-slate-100/80 border border-slate-200/50 text-slate-700 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500'
                    }`}
                  />
                ) : (
                  obj.label ? (
                    <span className={`block truncate w-full max-w-full ${obj.type === 'blackboard' ? 'text-white font-bold' : 'text-slate-600 font-bold'}`}>{obj.label}</span>
                  ) : (
                    <span className="block truncate w-full max-w-full">
                      {obj.type === 'teacher_desk' && 'Pult'}
                      {obj.type === 'door' && 'Tür'}
                      {obj.type === 'window' && 'Fenster'}
                      {obj.type === 'blackboard' && <span className="text-white print:text-black text-[0.625rem] tracking-[0.2em] font-bold">TAFEL</span>}
                      {['rectangle', 'square', 'triangle'].includes(obj.type) && 'Tisch'}
                    </span>
                  )
                )}
              </div>

              {editMode && selectedObjId === obj.id && (
                <div className={`absolute ${obj.y < 60 ? 'top-[calc(100%+8px)]' : '-top-14'} left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white shadow-xl rounded-2xl p-1.5 border border-slate-200 z-50`}>
                  <button onClick={(e) => { e.stopPropagation(); updateObject(obj.id, { rotation: ((obj.rotation || 0) + 45) % 360 }); }} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg" title="Rotieren"><RefreshCw size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); updateObject(obj.id, { w: obj.w + 20 }); }} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg" title="Verbreitern"><Maximize2 size={14} className="rotate-90" /></button>
                  <button onClick={(e) => { e.stopPropagation(); updateObject(obj.id, { w: Math.max(40, obj.w - 20) }); }} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg" title="Schmälern"><Minimize2 size={14} className="rotate-90" /></button>
                  <button onClick={(e) => { e.stopPropagation(); duplicateObject(obj.id); }} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg" title="Duplizieren"><Copy size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); removeObject(obj.id); }} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg" title="Löschen"><Trash2 size={14} /></button>
                </div>
              )}
            </motion.div>
          ))}

          {/* LIVE RELATIONSHIP LINES */}
          {activeDrag && (
            <svg className="absolute inset-0 pointer-events-none z-30 w-full h-full">
              {placedStudents.map(other => {
                if (other.id === activeDrag.id) return null;
                const otherPos = app.sitzplan_schueler[other.id] || { x: 0, y: 0 };
                const dx = activeDrag.x - otherPos.x;
                const dy = activeDrag.y - otherPos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 160) {
                  const draggingStudent = placedStudents.find(st => st.id === activeDrag.id);
                  if (!draggingStudent) return null;

                  const isSperr = (draggingStudent.sperrpartner || []).includes(other.id) || 
                                  (other.sperrpartner || []).includes(draggingStudent.id);
                  const isWunsch = (draggingStudent.wunschpartner || []).includes(other.id) || 
                                    (other.wunschpartner || []).includes(draggingStudent.id);

                  if (isSperr) {
                    return (
                      <g key={`sperr-${other.id}`}>
                        <line 
                          x1={activeDrag.x + 56}
                          y1={activeDrag.y + 32}
                          x2={otherPos.x + 56}
                          y2={otherPos.y + 32}
                          stroke="#ef4444"
                          strokeWidth="4"
                          strokeDasharray="6 4"
                          opacity="0.2"
                          className="animate-pulse"
                        />
                        <line 
                          x1={activeDrag.x + 56}
                          y1={activeDrag.y + 32}
                          x2={otherPos.x + 56}
                          y2={otherPos.y + 32}
                          stroke="#ef4444"
                          strokeWidth="2"
                          strokeDasharray="4 2"
                        />
                        <foreignObject
                          x={(activeDrag.x + otherPos.x + 112) / 2 - 14}
                          y={(activeDrag.y + otherPos.y + 64) / 2 - 14}
                          width="28"
                          height="28"
                        >
                          <div className="flex items-center justify-center w-7 h-7 bg-red-600 rounded-full text-white shadow-lg border-2 border-white animate-bounce">
                            <span className="text-[0.6875rem]">⚠️</span>
                          </div>
                        </foreignObject>
                      </g>
                    );
                  }

                  if (isWunsch) {
                    return (
                      <g key={`wunsch-${other.id}`}>
                        <line 
                          x1={activeDrag.x + 56}
                          y1={activeDrag.y + 32}
                          x2={otherPos.x + 56}
                          y2={otherPos.y + 32}
                          stroke="#10b981"
                          strokeWidth="4"
                          strokeDasharray="6 4"
                          opacity="0.2"
                          className="animate-pulse"
                        />
                        <line 
                          x1={activeDrag.x + 56}
                          y1={activeDrag.y + 32}
                          x2={otherPos.x + 56}
                          y2={otherPos.y + 32}
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeDasharray="4 2"
                        />
                        <foreignObject
                          x={(activeDrag.x + otherPos.x + 112) / 2 - 14}
                          y={(activeDrag.y + otherPos.y + 64) / 2 - 14}
                          width="28"
                          height="28"
                        >
                          <div className="flex items-center justify-center w-7 h-7 bg-emerald-500 rounded-full text-white shadow-lg border-2 border-white">
                            <span className="text-[0.6875rem]">❤️</span>
                          </div>
                        </foreignObject>
                      </g>
                    );
                  }
                }
                return null;
              })}
            </svg>
          )}

          {/* STUDENTS */}
          {placedStudents.map(s => {
            const isDragging = activeDrag?.id === s.id;
            let pos = isDragging && activeDrag
              ? { x: activeDrag.x, y: activeDrag.y }
              : (app.sitzplan_schueler[s.id] || { x: 0, y: 0 });
            
            // Apply live dragging offset if table they are sitting on is being dragged
            if (!isDragging && activeTableDrag?.studentIds.includes(s.id)) {
              pos = {
                x: pos.x + activeTableDrag.dx,
                y: pos.y + activeTableDrag.dy
              };
            }
            const isWinner = lottoWinner === s.id;
            
            // General relationship violations for this student (when static)
            let hasSperrViolation = false;
            let hasWunschMatch = false;

            for (const other of placedStudents) {
              if (other.id === s.id) continue;
              const otherPos = app.sitzplan_schueler[other.id] || { x: 0, y: 0 };
              const dist = Math.sqrt(Math.pow(pos.x - otherPos.x, 2) + Math.pow(pos.y - otherPos.y, 2));
              
              if (dist < 160) {
                const isSperr = (s.sperrpartner || []).includes(other.id) || (other.sperrpartner || []).includes(s.id);
                const isWunsch = (s.wunschpartner || []).includes(other.id) || (other.wunschpartner || []).includes(s.id);
                if (isSperr) hasSperrViolation = true;
                if (isWunsch) hasWunschMatch = true;
              }
            }

            // Relations-Glow status during dragging
            let relationHighlight: 'sperr' | 'wunsch' | null = null;
            if (activeDrag) {
              const draggingId = activeDrag.id;
              const draggingStudent = placedStudents.find(st => st.id === draggingId);
              if (draggingStudent) {
                if (s.id === draggingId) {
                  // This is the active dragging student - check if close to any partner
                  const partners = placedStudents.filter(st => st.id !== draggingId);
                  for (const p of partners) {
                    const pPos = app.sitzplan_schueler[p.id] || { x: 0, y: 0 };
                    const dist = Math.sqrt(Math.pow(activeDrag.x - pPos.x, 2) + Math.pow(activeDrag.y - pPos.y, 2));
                    if (dist < 160) {
                      const isSperr = (draggingStudent.sperrpartner || []).includes(p.id) || (p.sperrpartner || []).includes(draggingId);
                      const isWunsch = (draggingStudent.wunschpartner || []).includes(p.id) || (p.wunschpartner || []).includes(draggingId);
                      if (isSperr) { relationHighlight = 'sperr'; break; }
                      if (isWunsch && !relationHighlight) { relationHighlight = 'wunsch'; }
                    }
                  }
                } else {
                  // This is another student: is it near the active drag and does there exist a relationship?
                  const sPos = app.sitzplan_schueler[s.id] || { x: 0, y: 0 };
                  const dist = Math.sqrt(Math.pow(activeDrag.x - sPos.x, 2) + Math.pow(activeDrag.y - sPos.y, 2));
                  if (dist < 160) {
                    const isSperr = (draggingStudent.sperrpartner || []).includes(s.id) || (s.sperrpartner || []).includes(draggingId);
                    const isWunsch = (draggingStudent.wunschpartner || []).includes(s.id) || (s.wunschpartner || []).includes(draggingId);
                    if (isSperr) relationHighlight = 'sperr';
                    else if (isWunsch) relationHighlight = 'wunsch';
                  }
                }
              }
            }
            
            const isSwapTarget = activeDrag && activeDrag.id !== s.id && swapHoverTargetId === s.id;
            
            return (
              <StudentCard
                key={s.id}
                s={s}
                pos={pos}
                editMode={editMode}
                zoom={zoom}
                 isWinner={isWinner}
                 isHovered={hoveredStudentId === s.id && !pinnedStudentId}
                 isPinned={pinnedStudentId === s.id}
                 isAbsent={absentStudents[s.id]}
                overlayFilter={overlayFilter}
                bgColor={calculateStudentColor(s)}
                borderColor={isWinner ? '#f59e0b' : (overlayFilter === 'standard' ? '#e2e8f0' : calculateStudentColor(s))}
                behaviorNote={app.behavior_notes?.[s.id]}
                relationHighlight={relationHighlight}
                hasSperrViolation={hasSperrViolation}
                hasWunschMatch={hasWunschMatch}
                isSwapTarget={isSwapTarget}
                isDragging={activeDrag?.id === s.id}
                showEmojis={showEmojis}
                isHighlighted={highlightedStudentIds ? highlightedStudentIds.includes(s.id) : false}
                isDimmed={highlightedStudentIds ? !highlightedStudentIds.includes(s.id) : false}
                onDrag={(e: any, info: any) => {
                  const distance = Math.sqrt(info.offset.x * info.offset.x + info.offset.y * info.offset.y);
                  if (distance < 5) return;

                  const startPos = app.sitzplan_schueler[s.id] || { x: 0, y: 0 };
                  const currentX = startPos.x + info.offset.x / zoom;
                  const currentY = startPos.y + info.offset.y / zoom;
                  setActiveDrag({ id: s.id, x: currentX, y: currentY });
                  
                  // Real-time hover swap target calculation
                  let hoverTargetId = null;
                  for (const otherId in app.sitzplan_schueler) {
                    if (otherId === s.id) continue;
                    const oPos = app.sitzplan_schueler[otherId];
                    // Rectangular hitbox match for 112px x 72px cards
                    if (Math.abs(currentX - oPos.x) < 75 && Math.abs(currentY - oPos.y) < 55) {
                      hoverTargetId = otherId;
                      break;
                    }
                  }
                  setSwapHoverTargetId(hoverTargetId);
                }}
                onDragEnd={(e: any, info: any) => {
                  setActiveDrag(null);
                  setSwapHoverTargetId(null);
                  setHoveredStudentId(null);

                  const distance = Math.sqrt(info.offset.x * info.offset.x + info.offset.y * info.offset.y);
                  if (distance < 5) return;

                  const dragPos = app.sitzplan_schueler[s.id] || { x: 0, y: 0 };
                  let finalX = dragPos.x + info.offset.x / zoom;
                  let finalY = dragPos.y + info.offset.y / zoom;

                  const { canvasW, canvasH } = getCanvasDimensions();
                  finalX = Math.max(10, Math.min(canvasW - 120, finalX));
                  finalY = Math.max(10, Math.min(canvasH - 80, finalY));
                  
                  let swapTargetId = null;
                  for (const otherId in app.sitzplan_schueler) {
                    if (otherId === s.id) continue;
                    const oPos = app.sitzplan_schueler[otherId];
                    // Rectangular hitbox match for 112px x 72px cards on drop
                    if (Math.abs(finalX - oPos.x) < 75 && Math.abs(finalY - oPos.y) < 55) {
                      swapTargetId = otherId;
                      break;
                    }
                  }
                  if (swapTargetId) handleSwap(s.id, swapTargetId);
                  else updatePosition(s.id, finalX, finalY);
                }}
                onClick={(e: any) => {
                  if (!editMode) {
                    e.stopPropagation();
                    setPinnedStudentId(pinnedStudentId === s.id ? null : s.id);
                  }
                }}
                onMouseEnter={() => !editMode && setHoveredStudentId(s.id)}
                onMouseLeave={() => setHoveredStudentId(null)}
                onDelete={(e: any) => { e.stopPropagation(); removeStudent(s.id); }}
              />
            );
          })}
        </div>

        {/* Floating Utilities (Edit Mode) */}
        <AnimatePresence>
          {editMode && (
            <motion.div 
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 p-2 bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-200 no-print print:hidden z-50"
            >
              <button onClick={() => addObject('rectangle')} className="p-3 bg-white text-slate-600 rounded-xl border border-slate-100 hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm" title="Tisch (Rechteck)"><RectangleHorizontal size={20} /></button>
              <button onClick={() => addObject('square')} className="p-3 bg-white text-slate-600 rounded-xl border border-slate-100 hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm" title="Tisch (Quadrat)"><Square size={20} /></button>
              <button onClick={() => addObject('triangle')} className="p-3 bg-white text-slate-600 rounded-xl border border-slate-100 hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm flex items-center justify-center font-bold" title="Tisch (Dreieck)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3L2 21H22L12 3Z" />
                </svg>
              </button>
              <button onClick={() => addObject('teacher_desk')} className="p-3 bg-slate-100 text-slate-700 rounded-xl border border-slate-200 hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm" title="Lehrpult"><Monitor size={20} /></button>
              <button onClick={() => addObject('blackboard')} className="p-3 bg-slate-900 text-white rounded-xl border border-slate-700 hover:bg-slate-800 transition-all shadow-sm" title="Tafel"><MonitorPlay size={20} /></button>
              <button onClick={() => addObject('door')} className="p-3 bg-white text-orange-600 rounded-xl border border-slate-100 hover:border-orange-500 transition-all shadow-sm" title="Tür"><DoorOpen size={20} /></button>
              <button onClick={() => addObject('window')} className="p-3 bg-white text-sky-600 rounded-xl border border-slate-100 hover:border-sky-500 transition-all shadow-sm" title="Fenster"><RectangleHorizontal size={20} className="scale-y-50" /></button>
              <div className="h-px bg-slate-200 my-1" />
              <button 
                onClick={handleUndo} 
                disabled={history.length === 0} 
                className={`p-3 rounded-xl border transition-all shadow-sm ${history.length === 0 ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-50' : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'}`} 
                title="Rückgängig"
              >
                <Undo size={20} />
              </button>
              <button onClick={handleReset} className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 hover:bg-rose-100 transition-all shadow-sm" title="Zurücksetzen"><RotateCcw size={20} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Möbel-Inspektor (Left side panel, visible when object selected in Edit Mode) */}
        <AnimatePresence>
          {editMode && selectedObjId && (() => {
            const selectedObj = app.sitzplan_objekte?.find((o: any) => o.id === selectedObjId);
            if (!selectedObj) return null;
            return (
              <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -100, opacity: 0 }}
                className="absolute left-6 top-1/2 -translate-y-1/2 w-64 p-4 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-200 no-print print:hidden flex flex-col gap-3.5 z-[150] text-[0.75rem]"
                onClick={(e) => e.stopPropagation()} // Prevent deselecting
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-1">
                  <div className="flex items-center gap-1.5 text-indigo-600">
                    <Sliders size={16} />
                    <span className="font-extrabold uppercase tracking-wide">Möbel-Inspektor</span>
                  </div>
                  <button 
                    onClick={() => setSelectedObjId(null)}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Name / Label */}
                <div className="flex flex-col gap-1">
                  <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider">Beschriftung</label>
                  <input
                    type="text"
                    value={selectedObj.label || ''}
                    placeholder={
                      selectedObj.type === 'teacher_desk' ? 'Lehrerpult' :
                      selectedObj.type === 'blackboard' ? 'Tafel' :
                      selectedObj.type === 'door' ? 'Tür' :
                      selectedObj.type === 'window' ? 'Fenster' : 'Tisch'
                    }
                    onChange={(e) => updateObject(selectedObj.id, { label: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-bold text-slate-700 placeholder:text-slate-300 text-[0.75rem] transition-all bg-slate-50/50"
                  />
                </div>

                {/* Dimensions (Width / Height) with Ranges */}
                <div className="flex flex-col gap-3">
                  {/* Breite (Width) */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider">Breite</label>
                      <span className="font-mono text-[0.6875rem] font-bold text-slate-650 bg-slate-100 px-1.5 py-0.5 rounded">{selectedObj.w}px</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => updateObject(selectedObj.id, { w: Math.max(20, selectedObj.w - 5) })}
                        className="w-6 h-6 flex items-center justify-center text-xs font-black bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-500 active:scale-90 transition-all select-none"
                        title="-5px"
                      >
                        -
                      </button>
                      <input 
                        type="range"
                        min="20"
                        max="400"
                        step="5"
                        value={selectedObj.w}
                        onChange={(e) => updateObject(selectedObj.id, { w: parseInt(e.target.value) })}
                        className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 outline-none"
                      />
                      <button 
                        onClick={() => updateObject(selectedObj.id, { w: Math.min(600, selectedObj.w + 5) })}
                        className="w-6 h-6 flex items-center justify-center text-xs font-black bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-500 active:scale-90 transition-all select-none"
                        title="+5px"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Höhe (Height) */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider">Höhe</label>
                      <span className="font-mono text-[0.6875rem] font-bold text-slate-650 bg-slate-100 px-1.5 py-0.5 rounded">{selectedObj.h}px</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => updateObject(selectedObj.id, { h: Math.max(5, selectedObj.h - 5) })}
                        className="w-6 h-6 flex items-center justify-center text-xs font-black bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-500 active:scale-90 transition-all select-none"
                        title="-5px"
                      >
                        -
                      </button>
                      <input 
                        type="range"
                        min="5"
                        max="300"
                        step="5"
                        value={selectedObj.h}
                        onChange={(e) => updateObject(selectedObj.id, { h: parseInt(e.target.value) })}
                        className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 outline-none"
                      />
                      <button 
                        onClick={() => updateObject(selectedObj.id, { h: Math.min(400, selectedObj.h + 5) })}
                        className="w-6 h-6 flex items-center justify-center text-xs font-black bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-500 active:scale-90 transition-all select-none"
                        title="+5px"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Rotation / Ausrichtung */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider">Drehung & Ausrichtung</label>
                    <span className="font-mono text-[0.6875rem] font-bold text-slate-650 bg-slate-100 px-1.5 py-0.5 rounded">{(selectedObj.rotation || 0)}°</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => updateObject(selectedObj.id, { rotation: ((selectedObj.rotation || 0) - 5 + 360) % 360 })}
                      className="w-6 h-6 flex items-center justify-center text-xs font-black bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-500 active:scale-90 transition-all select-none"
                      title="-5°"
                    >
                      -
                    </button>
                    <input 
                      type="range"
                      min="0"
                      max="359"
                      step="1"
                      value={selectedObj.rotation || 0}
                      onChange={(e) => updateObject(selectedObj.id, { rotation: parseInt(e.target.value) })}
                      className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 outline-none"
                    />
                    <button 
                      onClick={() => updateObject(selectedObj.id, { rotation: ((selectedObj.rotation || 0) + 5) % 360 })}
                      className="w-6 h-6 flex items-center justify-center text-xs font-black bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-500 active:scale-90 transition-all select-none"
                      title="+5°"
                    >
                      +
                    </button>
                  </div>
                  {/* Preset rotation buttons */}
                  <div className="grid grid-cols-4 gap-1 mt-1">
                    {[0, 90, 180, 270].map(angle => (
                      <button
                        key={angle}
                        onClick={() => updateObject(selectedObj.id, { rotation: angle })}
                        className={`py-1 text-[0.625rem] font-bold rounded-lg border transition-all ${
                          (selectedObj.rotation || 0) === angle 
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-650 shadow-xs' 
                            : 'bg-white border-slate-150 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {angle}°
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color presets */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Paintbrush size={11} /> Farbe
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { hex: '', label: 'Standard', class: 'bg-white border-slate-300' },
                      { hex: '#e8f5e9', label: 'Grün', class: 'bg-[#e8f5e9] border-emerald-300' },
                      { hex: '#e3f2fd', label: 'Blau', class: 'bg-[#e3f2fd] border-sky-300' },
                      { hex: '#fffde7', label: 'Gelb', class: 'bg-[#fffde7] border-yellow-300' },
                      { hex: '#ffebee', label: 'Rot', class: 'bg-[#ffebee] border-rose-300' },
                      { hex: '#f3e5f5', label: 'Lila', class: 'bg-[#f3e5f5] border-purple-300' },
                      { hex: '#fff3e0', label: 'Orange', class: 'bg-[#fff3e0] border-orange-300' },
                    ].map(preset => (
                      <button
                        key={preset.label}
                        onClick={() => updateObject(selectedObj.id, { color: preset.hex })}
                        className={`w-5 h-5 rounded-full border-2 transition-transform ${preset.class} ${
                          (selectedObj.color || '') === preset.hex ? 'scale-125 shadow-md border-indigo-500 ring-2 ring-indigo-100' : 'hover:scale-110'
                        }`}
                        title={preset.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Layer order (Bring to Front / Send to Back) */}
                <div className="flex flex-col gap-1">
                  <label className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Layers size={11} /> Ebene
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => bringToFront(selectedObj.id)}
                      className="py-1 px-2 text-[0.625rem] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1"
                      title="Ganz nach vorne bringen"
                    >
                      Nach vorne
                    </button>
                    <button
                      onClick={() => sendToBack(selectedObj.id)}
                      className="py-1 px-2 text-[0.625rem] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1"
                      title="Ganz nach hinten senden"
                    >
                      Nach hinten
                    </button>
                  </div>
                </div>

                {/* Actions: Duplicate / Delete */}
                <div className="flex items-center gap-2 mt-2 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => duplicateObject(selectedObj.id)}
                    className="flex-1 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 rounded-xl font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Copy size={13} />
                    Duplizieren
                  </button>
                  <button
                    onClick={() => removeObject(selectedObj.id)}
                    className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-xl font-bold transition-colors flex items-center justify-center gap-1.5"
                    title="Möbelstück löschen"
                  >
                    <Trash2 size={13} />
                    Löschen
                  </button>
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* Empty State */}
        {!editMode && placedStudents.length === 0 && (app.sitzplan_objekte || []).length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center flex-col p-6 text-slate-400 select-none bg-slate-50/95 backdrop-blur-xs z-40 overflow-y-auto">
            <div className="max-w-2xl w-full text-center space-y-5 my-auto">
              <div className="inline-flex p-3.5 bg-indigo-50 text-indigo-700 rounded-2xl border border-indigo-100">
                <LayoutTemplate size={48} />
              </div>
              
              <div className="space-y-2">
                <p className="font-black text-[1.5rem] leading-normal uppercase tracking-[0.12em] text-slate-900">Sitzplan erstellen</p>
                {students.length === 0 ? (
                  <p className="text-[0.875rem] font-bold text-slate-500 max-w-md mx-auto leading-relaxed">
                    Es wurden noch keine Schüler für die Klasse <span className="text-indigo-600 font-extrabold">{app.klassenbezeichnung || 'deine Klasse'}</span> hinzugefügt. Füge zuerst Kinder in der Schülerliste hinzu!
                  </p>
                ) : (
                  <p className="text-[0.875rem] font-bold text-slate-500 max-w-md mx-auto leading-relaxed">
                    Der Sitzplan für die Klasse <span className="text-indigo-600 font-extrabold">{app.klassenbezeichnung || 'deine Klasse'}</span> ist noch leer. Wähle eine Raumvorlage, um alle <span className="text-indigo-600 font-extrabold">{students.length} Schüler</span> automatisch zu platzieren:
                  </p>
                )}
              </div>

              {/* Class List display so they see the children are here */}
              {students.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 max-w-md mx-auto text-left shadow-sm">
                  <p className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400 mb-2 font-mono">Kinder dieser Klasse ({students.length}):</p>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
                    {students.map(s => (
                      <span key={s.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-700">
                        {s.vorname}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {students.length === 0 ? (
                <button
                  onClick={() => setPage('schueler')}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[0.625rem] shadow-xl hover:bg-indigo-700 transition-all active:scale-95 cursor-pointer inline-flex items-center gap-2"
                >
                  <UserPlus size={14} />
                  Schüler hinzufügen
                </button>
              ) : (
                <>
                  {/* Templates grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
                    <button
                      onClick={() => applyRoomPreset('rows')}
                      className="flex items-center gap-3 p-3 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-left text-slate-700 hover:text-indigo-800 transition-all shadow-sm group active:scale-[0.98] cursor-pointer"
                    >
                      <div className="p-2 bg-slate-50 group-hover:bg-white rounded-xl text-slate-500 group-hover:text-indigo-600 shrink-0">
                        <Grid size={18} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-extrabold text-[0.8125rem]">Klassische Reihen</span>
                        <span className="text-[0.625rem] text-slate-400">Doppel-Tische nebeneinander</span>
                      </div>
                    </button>

                    <button
                      onClick={() => applyRoomPreset('u_shape')}
                      className="flex items-center gap-3 p-3 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-left text-slate-700 hover:text-indigo-800 transition-all shadow-sm group active:scale-[0.98] cursor-pointer"
                    >
                      <div className="p-2 bg-slate-50 group-hover:bg-white rounded-xl text-slate-500 group-hover:text-indigo-600 shrink-0">
                        <Layout size={18} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-extrabold text-[0.8125rem]">U-Form (Hufeisen)</span>
                        <span className="text-[0.625rem] text-slate-400">Tische an den Raumwänden</span>
                      </div>
                    </button>

                    <button
                      onClick={() => applyRoomPreset('groups')}
                      className="flex items-center gap-3 p-3 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-left text-slate-700 hover:text-indigo-800 transition-all shadow-sm group active:scale-[0.98] cursor-pointer"
                    >
                      <div className="p-2 bg-slate-50 group-hover:bg-white rounded-xl text-slate-500 group-hover:text-indigo-600 shrink-0">
                        <Users size={18} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-extrabold text-[0.8125rem]">Gruppeninseln</span>
                        <span className="text-[0.625rem] text-slate-400">4er-Blocks für Gruppenarbeit</span>
                      </div>
                    </button>

                    <button
                      onClick={() => applyRoomPreset('exam')}
                      className="flex items-center gap-3 p-3 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-left text-slate-700 hover:text-indigo-800 transition-all shadow-sm group active:scale-[0.98] cursor-pointer"
                    >
                      <div className="p-2 bg-slate-50 group-hover:bg-white rounded-xl text-slate-500 group-hover:text-indigo-600 shrink-0">
                        <Square size={18} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-extrabold text-[0.8125rem]">Einzeltische</span>
                        <span className="text-[0.625rem] text-slate-400">Einzelne Tische mit Abstand</span>
                      </div>
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <span className="text-xs text-slate-400 font-bold">Oder lieber manuell einrichten?</span>
                    <button 
                      onClick={() => setEditMode(true)}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer"
                    >
                      Leeren Raum planen
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Print Legend */}
        <div className="print-only absolute bottom-4 left-4 flex gap-6 border-t font-bold border-slate-400 pt-4 w-full">
           <div className="flex items-center gap-3">
              <span className="text-[0.625rem] uppercase tracking-widest text-slate-400">Legende:</span>
              <div className="flex items-center gap-1.5">
                <Languages size={12} className="text-black" />
                <span className="text-[0.625rem]">DaZ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldAlert size={12} className="text-black" />
                <span className="text-[0.625rem]">SPF/Förderbedarf</span>
              </div>
           </div>
        </div>

        {/* CENTER DETAIL BOARD (INFO TAFEL IN DER MITTE) */}
        <AnimatePresence>
          {!editMode && pinnedStudentId && (
            <motion.div
              key="student-detail-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 z-[190] no-print rounded-[2.5rem] flex items-center justify-center p-4 overflow-hidden pointer-events-auto"
            >
              {/* Backdrop Blur overlay */}
              <div
                onClick={() => setPinnedStudentId(null)}
                className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] cursor-pointer"
              />
              
              {/* Panel Content (Interactive) */}
              <div className="relative z-[200]">
                {(() => {
                  const activeStudent = students.find((st: any) => st.id === pinnedStudentId);
                  if (!activeStudent) return null;
                  const note = app.behavior_notes?.[pinnedStudentId];
                  return (
                    <StudentDetailPanel
                      s={activeStudent}
                      app={app}
                      isPinned={true}
                      behaviorNote={note}
                      onClose={() => setPinnedStudentId(null)}
                      onUpdateFoto={(base64: string | null) => {
                        setApp((prev: any) => ({
                          ...prev,
                          schueler: prev.schueler.map((st: any) =>
                            st.id === activeStudent.id ? { ...st, foto: base64 } : st
                          )
                        }));
                      }}
                    />
                  );
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      {!presentationMode && (
        <div className="flex justify-between items-center px-2 py-1 text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest no-print print:hidden">
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
              <span>{editMode ? 'Bearbeitungs-Modus aktiv' : 'Ansichts-Modus: Bewegen gesperrt'}</span>
            </div>
            {!editMode && <span>Hovere über Kinder für Details</span>}
            {editMode && <span>Tausche: Kinder aufeinander ziehen</span>}
          </div>
          <div className="flex items-center gap-4">
             {overlayFilter !== 'standard' && (
               <div className="flex items-center gap-2">
                 <span className="text-slate-300 mr-2">Filter:</span>
                 {overlayFilter === 'heatmap' ? (
                   <>
                     <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> <span className="text-[0.5625rem]">A+</span></div>
                     <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> <span className="text-[0.5625rem]">B</span></div>
                     <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> <span className="text-[0.5625rem]">Handlung</span></div>
                   </>
                 ) : overlayFilter === 'niveau' ? (
                   <div className="flex items-center gap-2">
                     <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#ecfdf5] border border-emerald-200" /> <span className="text-[0.5625rem]">L1</span></div>
                     <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#f0f9ff] border border-sky-200" /> <span className="text-[0.5625rem]">L2</span></div>
                     <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#fffbeb] border border-amber-200" /> <span className="text-[0.5625rem]">L3</span></div>
                   </div>
                 ) : overlayFilter === 'charakter' ? (
                   <div className="flex items-center gap-2">
                     <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#ffe4e6] border border-rose-200" /> <span className="text-[0.5625rem]">Impulsiv</span></div>
                     <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#f0f9ff] border border-sky-200" /> <span className="text-[0.5625rem]">Braucht Ruhe</span></div>
                     <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#ffedd5] border border-orange-200" /> <span className="text-[0.5625rem]">Lebhaft</span></div>
                     <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#ccfbf1] border border-teal-200" /> <span className="text-[0.5625rem]">Ruhig (Anker)</span></div>
                     <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#f5f3ff] border border-violet-200" /> <span className="text-[0.5625rem]">Fokus/Nähe</span></div>
                   </div>
                 ) : overlayFilter === 'daz' ? (
                   <div className="flex items-center gap-2">
                     <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#fef3c7] border border-amber-200" /> <span className="text-[0.5625rem]">DaZ-Schüler:in</span></div>
                   </div>
                 ) : overlayFilter === 'spf' ? (
                   <div className="flex items-center gap-2">
                     <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#e0e7ff] border border-indigo-200" /> <span className="text-[0.5625rem]">SPF / ESPF</span></div>
                   </div>
                 ) : (
                   <span className="text-[0.5625rem] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">{overlayFilter}</span>
                 )}
               </div>
             )}
             <div className="flex items-center gap-2">
               <span>Zoom</span>
               <input
                 type="range"
                 min="0.5"
                 max="1.5"
                 step="0.05"
                 value={zoom}
                 aria-label="Sitzplan-Zoom"
                 aria-valuetext={`${Math.round(zoom * 100)} Prozent`}
                 onChange={e => setZoom(parseFloat(e.target.value))}
                 className="w-24 accent-indigo-600"
               />
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
