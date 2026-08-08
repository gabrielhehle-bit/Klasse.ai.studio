import React, { useEffect, useState } from "react";
import { Clock, Settings, Save, Edit3 } from "lucide-react";
import { motion } from "motion/react";
import { AppState, ClassPetHistory } from "../../types";
import { PET_BREEDS } from "../ClassPetWidget";

interface TimelineWidgetContentProps {
  app: AppState;
  setApp: any;
}

export const TimelineWidgetContent: React.FC<TimelineWidgetContentProps> = ({
  app,
  setApp,
}) => {
  const [time, setTime] = useState(new Date());
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isEditing) return;
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isEditing]);

  const tageShort = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  const tageFull = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  const tagShort = tageShort[time.getDay()];
  const tagFull = tageFull[time.getDay()];
  const isWeekend = tagFull === "Sonntag" || tagFull === "Samstag";
  const displayTag = isWeekend ? "Montag" : tagFull;

  const dayPlan = isWeekend 
    ? (app?.tageplan?.["Montag"] || { stunden: [1,2,3,4,5] }) 
    : (app?.tageplan?.[tagFull] || { stunden: [1,2,3,4,5] });
    
  const stundenZeiten = app?.stundenZeiten || {
    1: '08:00–08:50',
    2: '08:50–09:45',
    3: '10:00–10:50',
    4: '10:50–11:45',
    5: '11:45–12:30',
    6: '13:30–14:20',
    7: '14:20–15:10',
    8: '15:10–16:00',
  };

  const parseTime = (timeStr: string) => {
    const matches = timeStr.match(/\d{1,2}[:.]?\d{0,2}/g);
    if (!matches || matches.length < 2) return { start: 0, end: 0 };
    
    const timeMatches = matches.slice(-2);
    
    const parse = (s: string) => {
      const clean = s.replace('.', ':');
      const parts = clean.split(':');
      const h = parseInt(parts[0], 10);
      const m = parts.length > 1 && parts[1] ? parseInt(parts[1], 10) : 0;
      return h * 60 + (m || 0);
    };
    
    let start = parse(timeMatches[0]);
    let end = parse(timeMatches[1]);
    
    // Fallback if end is earlier than start (e.g. typos)
    if (end <= start) end = start + 50; 
    
    return { start, end };
  };

  const buildZeiten = () => {
    let result: any[] = [];
    let lastEnd = 0;
    (dayPlan.stunden || []).forEach((stundenIdx: number) => {
      const timeStr = stundenZeiten[stundenIdx];
      if (timeStr) {
        const { start, end } = parseTime(timeStr);
        if (lastEnd > 0 && start > lastEnd) {
          result.push({ start: lastEnd, end: start, label: "Pause" });
        }
        result.push({ start, end, label: `${stundenIdx}. Stunde`, idx: stundenIdx });
        lastEnd = end;
      }
    });
    return result;
  };

  const zeiten = buildZeiten();

  const exactNowMinutes = time.getHours() * 60 + time.getMinutes() + time.getSeconds() / 60;
  
  const startTime = zeiten.length > 0 ? zeiten[0].start : 480;
  const endTime = zeiten.length > 0 ? zeiten[zeiten.length - 1].end : 750;
  const totalDuration = endTime - startTime || 1;

  const currentProgress = Math.max(0, Math.min(100, ((exactNowMinutes - startTime) / totalDuration) * 100));

  const petState = app?.classPet || { animalType: "dino", name: "Spike" };
  const petBreed = PET_BREEDS.find((b) => b.id === petState.animalType) || PET_BREEDS[0];
  const petEmoji = petBreed ? petBreed.emoji : "🦕";
  const petName = petState.name || petBreed?.nameDefault || "Spike";

  // Find the exact current lesson or pause
  const currentUnit = zeiten.find(z => exactNowMinutes >= z.start && exactNowMinutes < z.end);

  const getSubjectForLesson = (lesson: any) => {
    if (lesson.label === "Pause") return "Pause";
    
    // ISO Week
    const getWeek = (date: Date) => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    };
    
    const kw = getWeek(time);
    const daysDe = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
    const dayIndex = daysDe.indexOf(displayTag);
    const dayPlan = dayIndex !== -1 ? (app?.wochenplanung?.[kw]?.[dayIndex] || {}) : {};
    const wochenplanFach = dayPlan[lesson.idx - 1]?.fach;
    if (wochenplanFach) return wochenplanFach;
    
    const stammplanFach = app?.stammplan?.[displayTag]?.[lesson.idx];
    return stammplanFach || "Freiarbeit";
  };

  const getShortSubjectForLesson = (lesson: any) => {
    const full = getSubjectForLesson(lesson);
    if (!full || full === "Freiarbeit") return "Frei";
    if (full === "Deutsch") return "D";
    if (full === "Mathematik") return "M";
    if (full === "Sachunterricht") return "SU";
    if (full === "Englisch") return "E";
    if (full === "Religion") return "REL";
    if (full === "Bildnerische Erziehung") return "BE";
    if (full === "Bewegung und Sport") return "BS";
    if (full === "Werken (TEC)" || full === "Werken (TEX)") return "WE";
    if (full === "Musikerziehung") return "ME";
    if (full.length > 7) return full.slice(0, 5) + ".";
    return full;
  };

  const getFachColorKey = (fachName?: string) => {
    if (!fachName) return 'slate';
    const configColor = app?.fachConfig?.[fachName]?.color;
    const ln = fachName.toLowerCase();
    
    if (!configColor || configColor === 'slate') {
      if (ln.includes('werken') || ln.includes('technik') || ln.includes('design')) return 'orange';
      if (ln.includes('bewegung') || ln.includes('sport')) return 'teal';
      if (ln.includes('fremdsprache') || ln.includes('englisch')) return 'sky';
      if (ln.includes('deutsch')) return 'blue';
      if (ln.includes('mathematik')) return 'red';
      if (ln.includes('sachunterricht')) return 'emerald';
      if (ln.includes('bildnerische') || ln.includes('kunst') || ln.includes('gestaltung')) return 'purple';
      if (ln.includes('musik')) return 'pink';
      if (ln.includes('religion')) return 'indigo';
    }
    
    return configColor || 'slate';
  };

  const getFachStyle = (fach: string) => {
    const c = getFachColorKey(fach);
    
    const colorMap: Record<string, { bg: string, text: string, border: string, activeBg: string }> = {
      blue: { bg: 'bg-blue-50 border-blue-200/50', text: 'text-blue-700', border: 'border-blue-200', activeBg: 'bg-blue-500' },
      red: { bg: 'bg-red-50 border-red-200/50', text: 'text-red-700', border: 'border-red-200', activeBg: 'bg-red-500' },
      emerald: { bg: 'bg-emerald-50 border-emerald-200/50', text: 'text-emerald-700', border: 'border-emerald-200', activeBg: 'bg-emerald-500' },
      indigo: { bg: 'bg-indigo-50 border-indigo-200/50', text: 'text-indigo-700', border: 'border-indigo-200', activeBg: 'bg-indigo-500' },
      sky: { bg: 'bg-sky-50 border-sky-200/50', text: 'text-sky-700', border: 'border-sky-200', activeBg: 'bg-sky-500' },
      purple: { bg: 'bg-purple-50 border-purple-200/50', text: 'text-purple-700', border: 'border-purple-200', activeBg: 'bg-purple-500' },
      pink: { bg: 'bg-pink-50 border-pink-200/50', text: 'text-pink-700', border: 'border-pink-200', activeBg: 'bg-pink-500' },
      orange: { bg: 'bg-orange-50 border-orange-200/50', text: 'text-orange-700', border: 'border-orange-200', activeBg: 'bg-orange-500' },
      teal: { bg: 'bg-teal-50 border-teal-200/50', text: 'text-teal-700', border: 'border-teal-200', activeBg: 'bg-teal-500' },
      slate: { bg: 'bg-slate-50 border-slate-200/50', text: 'text-slate-700', border: 'border-slate-200', activeBg: 'bg-slate-400' },
      stone: { bg: 'bg-stone-50 border-stone-200/50', text: 'text-stone-700', border: 'border-stone-200', activeBg: 'bg-stone-400' },
      amber: { bg: 'bg-amber-50 border-amber-200/50', text: 'text-amber-700', border: 'border-amber-200', activeBg: 'bg-amber-500' },
      yellow: { bg: 'bg-yellow-50 border-yellow-200/50', text: 'text-yellow-700', border: 'border-yellow-200', activeBg: 'bg-yellow-500' },
      lime: { bg: 'bg-lime-50 border-lime-200/50', text: 'text-lime-700', border: 'border-lime-200', activeBg: 'bg-lime-550' },
      green: { bg: 'bg-green-50 border-green-200/50', text: 'text-green-700', border: 'border-green-200', activeBg: 'bg-green-500' },
      cyan: { bg: 'bg-cyan-50 border-cyan-200/50', text: 'text-cyan-700', border: 'border-cyan-200', activeBg: 'bg-cyan-500' },
      violet: { bg: 'bg-violet-50 border-violet-200/50', text: 'text-violet-700', border: 'border-violet-200', activeBg: 'bg-violet-500' },
      fuchsia: { bg: 'bg-fuchsia-50 border-fuchsia-200/50', text: 'text-fuchsia-700', border: 'border-fuchsia-200', activeBg: 'bg-fuchsia-500' },
      rose: { bg: 'bg-rose-50 border-rose-200/50', text: 'text-rose-700', border: 'border-rose-200', activeBg: 'bg-rose-500' },
    };
    return colorMap[c] || colorMap.slate;
  };

  const getExactTotalHours = () => {
     return zeiten.filter(z => z.label !== "Pause").length;
  };

  const hasStammplan = app?.stammplan && Object.keys(app.stammplan).some(tag => Object.keys(app.stammplan![tag]).length > 0);

  return (
    <div className="w-full h-full flex flex-col p-3 text-slate-800" style={{ backgroundColor: "#fafafa", borderRadius: "1rem" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-indigo-500" />
            <h3 className="font-bold text-sm tracking-wide">Tages-Zeitstrahl</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[0.625rem] font-medium text-slate-500 uppercase tracking-wider">{getExactTotalHours()} Stunden {isWeekend ? '(Beispiel Montag)' : ''}</span>
            {!hasStammplan && (
               <span className="text-[0.5rem] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse">Kein Stundenplan</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
             <button onClick={() => setIsEditing(false)} className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all">
               <Save size={14} /> Speichern
             </button>
          ) : (
             <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all border border-slate-200">
               <Edit3 size={14} /> Zeiten ändern
             </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="flex-1 overflow-y-auto pr-2 space-y-3 pb-4">
           {dayPlan.stunden?.map((stundenIdx: number) => {
             const currentTimeStr = stundenZeiten[stundenIdx] || '';
             const currentFach = app?.stammplan?.[displayTag]?.[stundenIdx] || '';
             
             return (
               <div key={stundenIdx} className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2">
                 <div className="text-xs font-black text-slate-500">{stundenIdx}. Stunde</div>
                 <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-[0.5625rem] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Zeit (z.B. 08:00-08:50)</label>
                      <input 
                        type="text" 
                        value={currentTimeStr}
                        onChange={(e) => {
                          setApp((prev: any) => ({
                            ...prev,
                            stundenZeiten: {
                              ...(prev.stundenZeiten || {}),
                              [stundenIdx]: e.target.value
                            }
                          }));
                        }}
                        className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[0.5625rem] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Fach ({displayTag})</label>
                      <input 
                        type="text" 
                        value={currentFach}
                        onChange={(e) => {
                          setApp((prev: any) => {
                            const pStamm = prev.stammplan || {};
                            return {
                              ...prev,
                              stammplan: {
                                ...pStamm,
                                [displayTag]: {
                                  ...(pStamm[displayTag] || {}),
                                  [stundenIdx]: e.target.value
                                }
                              }
                            };
                          });
                        }}
                        className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:border-indigo-500 outline-none"
                        placeholder="Freiarbeit"
                      />
                    </div>
                 </div>
               </div>
             )
           })}
        </div>
      ) : (
        <div className="flex flex-col flex-1 relative min-h-[120px]">
          <div className="flex justify-end mb-4 absolute right-0 -top-12 z-20">
            <div className={`text-xs font-bold px-3 py-2 rounded-xl flex flex-col items-end min-w-[160px] border shadow-sm ${currentUnit && currentUnit.label !== 'Pause' ? getFachStyle(getSubjectForLesson(currentUnit)).bg + ' ' + getFachStyle(getSubjectForLesson(currentUnit)).border : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
              {currentUnit ? (
                <>
                  <span className={`mb-0.5 font-medium text-[0.625rem] uppercase tracking-widest ${currentUnit.label !== 'Pause' ? getFachStyle(getSubjectForLesson(currentUnit)).text : 'text-slate-400'}`}>{currentUnit.label}</span>
                  <span className={`mb-1.5 font-black text-sm ${currentUnit.label !== 'Pause' ? getFachStyle(getSubjectForLesson(currentUnit)).text.replace('700', '900') : 'text-slate-800'}`}>{getSubjectForLesson(currentUnit)}</span>
                  {(() => {
                     const currentUnitRemainingMinutes = Math.max(0, currentUnit.end - exactNowMinutes);
                     const currentUnitDuration = currentUnit.end - currentUnit.start;
                     const currentUnitProgress = ((exactNowMinutes - currentUnit.start) / currentUnitDuration) * 100;
                     
                     const remainingMins = Math.floor(currentUnitRemainingMinutes);
                     const remainingSecs = Math.floor((currentUnitRemainingMinutes * 60) % 60);
                     
                     const formatTime = (mins: number) => {
                       const h = Math.floor(mins / 60);
                       const m = Math.floor(mins % 60);
                       return `${h}:${m.toString().padStart(2, '0')}`;
                     };
                     
                     return (
                       <div className="flex flex-col items-end w-full gap-1">
                         <span className={`text-[0.625rem] font-bold font-mono ${currentUnit.label !== 'Pause' ? getFachStyle(getSubjectForLesson(currentUnit)).text : 'text-slate-500'}`}>
                           {formatTime(currentUnit.start)} - {formatTime(currentUnit.end)}
                         </span>
                         <div className="flex items-center gap-2 w-full justify-end mt-0.5">
                           <div className="w-16 h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
                              <div className={`h-full transition-all duration-1000 ${currentUnit.label !== 'Pause' ? getFachStyle(getSubjectForLesson(currentUnit)).activeBg : 'bg-orange-400'}`} style={{ width: `${currentUnitProgress}%`}} />
                           </div>
                           <span className={`text-[0.625rem] font-medium whitespace-nowrap min-w-[34px] text-right ${currentUnit.label !== 'Pause' ? getFachStyle(getSubjectForLesson(currentUnit)).text : 'text-slate-400'}`}>
                             -{remainingMins}:{remainingSecs.toString().padStart(2, '0')}
                           </span>
                         </div>
                       </div>
                     );
                  })()}
                </>
              ) : (
                <div className="flex items-center justify-center h-full w-full py-2">
                  <span className="text-slate-400 font-black">Freizeit</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center relative px-4">
            {/* The Track */}
            <div className="absolute top-1/2 left-4 right-4 h-8 bg-slate-100 rounded-xl -translate-y-1/2 shadow-inner overflow-visible border border-slate-200/60 flex z-10">
               {zeiten.map((z, i) => {
                 const width = ((z.end - z.start) / totalDuration) * 100;
                 const isPause = z.label === "Pause";
                 const style = !isPause ? getFachStyle(getSubjectForLesson(z)) : { bg: 'bg-slate-200/50', text: '', border: '', activeBg: 'bg-slate-300' };
                 
                 const isDone = exactNowMinutes >= z.end;
                 const isCurrent = exactNowMinutes >= z.start && exactNowMinutes < z.end;
                 
                 let bgClass = style.bg;
                 if (isDone) bgClass = style.activeBg + ' opacity-40';
                 if (isCurrent) bgClass = style.activeBg + ' shadow-[inset_0_0_12px_rgba(255,255,255,0.4)] relative z-10 scale-y-110 scale-x-[1.02] rounded-md';
                 if (isPause && isCurrent) bgClass = 'bg-orange-300 relative z-10 scale-y-110 scale-x-[1.02] rounded-md';
                 if (isPause && isDone) bgClass = 'bg-slate-300 opacity-50';

                 return (
                   <div 
                     key={i} 
                     style={{ width: `${width}%` }} 
                     className={`h-full border-r border-white/40 flex items-center justify-center transition-all duration-700 ${bgClass}`}
                     title={!isPause ? `${z.label}: ${getSubjectForLesson(z)} (${Math.floor(z.start/60)}:${(z.start%60).toString().padStart(2,'0')} - ${Math.floor(z.end/60)}:${(z.end%60).toString().padStart(2,'0')})` : `Pause (${Math.floor(z.start/60)}:${(z.start%60).toString().padStart(2,'0')} - ${Math.floor(z.end/60)}:${(z.end%60).toString().padStart(2,'0')})`}
                   >
                     {!isPause && width > 8 && (
                       <span className={`text-[0.625rem] font-black uppercase tracking-wider ${isDone || isCurrent ? 'text-white' : style.text} ${isCurrent ? 'animate-pulse' : ''}`}>
                         {getShortSubjectForLesson(z)}
                       </span>
                     )}
                   </div>
                 );
               })}
            </div>

            {/* The Avatar Indicator */}
            <motion.div 
              className="absolute top-1/2 -translate-y-1/2 -ml-4 z-30 flex flex-col items-center pointer-events-none"
              initial={false}
              animate={{ left: `calc(1rem + (100% - 2rem) * ${currentProgress / 100})` }}
              transition={{ type: "spring", stiffness: 50, damping: 20 }}
            >
              <div className="flex flex-col items-center select-none mt-[-52px] mb-1">
                {/* Pet Name Badge */}
                <div className="bg-slate-800 text-white dark:bg-zinc-900 border border-slate-700/50 dark:border-white/10 px-1.5 py-0.5 rounded shadow-md text-[0.4375rem] font-bold uppercase tracking-wider mb-1 leading-none max-w-[65px] truncate">
                  {petName}
                </div>
                {/* Pet Emoji Bubble */}
                <div className="w-8 h-8 bg-white border-2 border-indigo-500 rounded-full shadow-xl flex items-center justify-center text-lg z-30 relative animate-bounce">
                  {petEmoji}
                </div>
              </div>
              <div className="absolute top-[32px] left-1/2 -translate-x-1/2 w-[2px] h-[36px] bg-indigo-500 rounded-full opacity-30" />
            </motion.div>
            
            {/* Start & End Times */}
            <div className="absolute top-1/2 left-4 right-4 translate-y-6 flex justify-between pointer-events-none px-1 z-0">
              <span className="text-[0.625rem] font-bold text-slate-400 bg-[#fafafa] px-1 rounded">
                {Math.floor(startTime / 60)}:{(startTime % 60).toString().padStart(2, '0')}
              </span>
              <span className="text-[0.625rem] font-bold text-slate-400 bg-[#fafafa] px-1 rounded">
                {Math.floor(endTime / 60)}:{(endTime % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
