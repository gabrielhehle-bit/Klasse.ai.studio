import React, { useState, useMemo } from 'react';
import { STANDARD_KEL_BEREICHE, SkillRadar } from '../types';
import { useApp } from '../context/AppContext';
import { Target, Info } from 'lucide-react';
import { motion } from 'motion/react';

export const KEL_GRADES_INFO = [
  { item: 0, icon: '🛑', text: 'Kaum / Noch unzuverlässig', bg: 'bg-slate-50 text-slate-600 border-slate-200' },
  { item: 1, icon: '⏳', text: 'In Ansätzen / Selten', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
  { item: 2, icon: '✍️', text: 'Teilweise / Manchmal', bg: 'bg-orange-50 text-orange-700 border-orange-200' },
  { item: 3, icon: '👍', text: 'Gut / Meistens', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
  { item: 4, icon: '🌟', text: 'Sehr gut / Fast immer', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { item: 5, icon: '🏆', text: 'Hervorragend / Sicher / Immer', bg: 'bg-violet-50 text-violet-850 border-violet-200' }
];

export const DEVELOPMENT_DIAGRAM_FIELDS = [
  { id: 'konzentration', label: 'Konzentration', kategorie: 'arbeitsverhalten', kindgerecht: 'Ich kann mich lange auf eine Aufgabe konzentrieren.' },
  { id: 'teamfaehigkeit', label: 'Teamfähigkeit', kategorie: 'sozialverhalten', kindgerecht: 'Ich arbeite gut mit anderen Kindern zusammen.' },
  { id: 'frustrationstoleranz', label: 'Frustrations-Toleranz', kategorie: 'arbeitsverhalten', kindgerecht: 'Ich bleibe ruhig, auch wenn mal etwas nicht sofort klappt.' },
  { id: 'selbstorganisation', label: 'Selbstorganisation', kategorie: 'arbeitsverhalten', kindgerecht: 'Ich kann meine Schulsachen und meine Zeit gut ordnen.' },
  { id: 'anstrengungsbereitschaft', label: 'Anstrengung', kategorie: 'arbeitsverhalten', kindgerecht: 'Ich gebe mir bei meinen Aufgaben viel Mühe.' },
  { id: 'selbststaendigkeit', label: 'Selbstständigkeit', kategorie: 'lernen', kindgerecht: 'Ich weiß oft selbst, was ich als nächstes tun muss.' },
  { id: 'hilfsbereitschaft', label: 'Empathie & Hilfe', kategorie: 'sozialverhalten', kindgerecht: 'Ich merke, wie es anderen Kindern geht und helfe gerne.' },
  { id: 'begeisterung', label: 'Lernfreude', kategorie: 'interessen', kindgerecht: 'Ich habe Spaß daran, neue Dinge zu lernen.' }
];

interface FlowerChartProps {
  studentId: string;
  app: any;
  selectedKats?: string[]; 
  isDark?: boolean;
  isCollaborative?: boolean;
  editable?: boolean;
  customData?: any[]; // Allow custom data (merged fields)
  activeId?: string; // Selected field ID
  onSelect?: (id: string) => void; // Selection callback
  hideDetails?: boolean;
  large?: boolean;
}

export const FlowerChart: React.FC<FlowerChartProps> = ({ 
  studentId, 
  app, 
  selectedKats = [], 
  isDark = false,
  isCollaborative = false,
  editable = false,
  customData,
  activeId,
  onSelect,
  hideDetails = false,
  large = false
}) => {
  const { setApp } = useApp();
  const [internalHover, setInternalHover] = useState<any | null>(null);

  const activeFields = useMemo(() => {
    if (customData) return customData;
    
    const base = [...STANDARD_KEL_BEREICHE.filter(b => selectedKats.length === 0 || selectedKats.includes(b.kategorie))];
    
    if (isCollaborative) {
      // Add Development fields if they are not already in base
      DEVELOPMENT_DIAGRAM_FIELDS.forEach(f => {
        if (!base.find(b => b.id === f.id)) {
          base.push({
            id: f.id,
            label: f.label,
            kategorie: f.kategorie as any,
            kindgerecht: f.kindgerecht
          });
        }
      });
    }
    return base;
  }, [selectedKats, isCollaborative, customData]);

  const latestKel = useMemo(() => {
    return (app.kelGespraeche || []).find((k: any) => k.schuelerId === studentId);
  }, [app.kelGespraeche, studentId]);

  const student = useMemo(() => {
    return (app.schueler || []).find((s: any) => s.id === studentId);
  }, [app.schueler, studentId]);

  const hoveredField = useMemo(() => {
    if (internalHover) return internalHover;
    if (activeId) return activeFields.find(f => f.id === activeId);
    return null;
  }, [internalHover, activeId, activeFields]);

  const handleUpdateValue = (fieldId: string, value: number) => {
    if (!editable) return;
    
    setApp((prev: any) => ({
      ...prev,
      schueler: prev.schueler.map((s: any) => s.id === studentId ? {
        ...s,
        foerderprofil: {
          ...s.foerderprofil,
          skillRadar: {
            ...(s.foerderprofil?.skillRadar || {}),
            [fieldId]: value
          }
        }
      } : s)
    }));
  };

  const cx = 220;
  const cy = 220;
  const N = activeFields.length;

  if (N === 0) {
    return (
      <div className={`h-80 flex flex-col items-center justify-center p-6 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'} rounded-[2rem] border-2 border-dashed`}>
        <span className="text-[1.875rem] leading-tight pb-2">🌸</span>
        <p className="text-[0.75rem] leading-tight font-bold font-sans">Bitte wählen Sie mindestens einen Bereich aus.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-6 ${isDark ? 'bg-slate-900/40 border-white/5 shadow-2xl backdrop-blur-xl' : 'bg-transparent'} p-0 rounded-[3rem] w-full`}>
      {!customData && (
        <div className="flex flex-col items-center text-center">
          <span className={`text-[0.625rem] font-black uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'} tracking-[0.2em] font-sans mb-1`}>
            {isCollaborative ? 'Gemeinsame Entwicklung' : 'Visuelle Gegenüberstellung'}
          </span>
          <h5 className={`text-[1.125rem] font-black ${isDark ? 'text-white' : 'text-slate-900'} flex items-center gap-2 uppercase tracking-tight`}>
            🌸 {isCollaborative ? 'Kollaboratives Entwicklungsdiagramm' : 'Interaktives Blütendiagramm (Skala 0-5)'}
          </h5>
          <div className="flex gap-4 mt-3 justify-center flex-wrap">
            <div className="flex items-center gap-2 bg-white/40 px-3 py-1 rounded-full border border-slate-100">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-500 shadow-sm" />
              <span className={`text-[0.625rem] font-black uppercase ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>SELBSTBILD (KIND)</span>
            </div>
            <div className="flex items-center gap-2 bg-white/40 px-3 py-1 rounded-full border border-slate-100">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 border border-indigo-500 shadow-sm" />
              <span className={`text-[0.625rem] font-black uppercase ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>FEEDBACK (LEHRPERSON)</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-8 justify-center py-2 relative w-full">
        
        {/* Detail Panel ABOVE the diagram */}
        {!hideDetails && (
          <div className="w-full max-w-2xl mx-auto flex flex-col justify-center h-[280px] overflow-hidden shrink-0">
            {hoveredField ? (
              <div className={`${isDark ? 'bg-slate-800 border-slate-700 shadow-black/20' : 'bg-white border-slate-200 shadow-md'} p-6 rounded-[2.5rem] border flex flex-col justify-start h-full space-y-4 overflow-y-auto snap-y`}>
                <div className="shrink-0">
                  <div className="flex items-center gap-1.5 pb-1">
                    <span className={`text-[0.5625rem] font-black uppercase ${isDark ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' : 'text-indigo-600 bg-indigo-50 border-indigo-100'} px-2 py-0.5 rounded-md`}>
                      {hoveredField.kategorie?.toUpperCase()}
                    </span>
                  </div>
                  <h6 className={`text-[1rem] leading-normal font-black ${isDark ? 'text-white' : 'text-slate-900'} leading-tight`}>{hoveredField.label}</h6>
                  <p className={`text-[0.6875rem] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'} italic mt-1 leading-normal`}>
                    "{hoveredField.kindgerecht}"
                  </p>
                </div>

                <div className={`grid grid-cols-2 gap-3.5 pt-2 shrink-0`}>
                  <div className={`${isDark ? 'bg-amber-500/5' : 'bg-amber-50/45'} p-3.5 rounded-2xl border border-amber-500/20`}>
                    <span className="text-[0.5rem] font-black uppercase text-amber-500 block text-[0.625rem] leading-tight mb-1">KIND (SELBSTBILD)</span>
                    <span className={`text-[1.25rem] leading-normal font-black ${isDark ? 'text-amber-400' : 'text-amber-900'}`}>{hoveredField.kindValue} / 5</span>
                    <span className={`text-[0.59375rem] font-black ${isDark ? 'text-amber-500' : 'text-amber-800'} block mt-0.5 max-w-[130px] text-wrap leading-tight break-words`}>
                      {KEL_GRADES_INFO.find(g => g.item === hoveredField.kindValue)?.icon} {KEL_GRADES_INFO.find(g => g.item === hoveredField.kindValue)?.text.split(' / ')[0]}
                    </span>
                  </div>

                  <div className="bg-indigo-50/45 p-3.5 rounded-2xl border border-indigo-100">
                    <span className="text-[0.5rem] font-black uppercase text-indigo-600 block text-[0.625rem] leading-tight mb-1">LEHRPERSON (FEEDBACK)</span>
                    <span className="text-[1.25rem] leading-normal font-black text-indigo-900">{hoveredField.lehrerValue} / 5</span>
                    <span className="text-[0.59375rem] font-black text-indigo-800 block mt-0.5 max-w-[130px] text-wrap leading-tight break-words">
                      {KEL_GRADES_INFO.find(g => g.item === hoveredField.lehrerValue)?.icon} {KEL_GRADES_INFO.find(g => g.item === hoveredField.lehrerValue)?.text.split(' / ')[0]}
                    </span>
                  </div>
                </div>

                {editable && (
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2 shrink-0">
                     <Info size={14} className="text-indigo-500 shrink-0" />
                     <p className="text-[0.625rem] text-slate-500 font-bold leading-tight uppercase">Tipp: Klicke auf die Blütenblätter, um das Feedback anzupassen!</p>
                  </div>
                )}

                {(hoveredField.kindComment || hoveredField.lehrerComment) && (
                  <div className={`border-t pt-3 flex flex-col gap-2 shrink-0 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                    <span className={`text-[0.5625rem] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Notizen:</span>
                    
                    {hoveredField.kindComment && (
                      <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 text-[0.6875rem] text-slate-700 font-bold italic leading-normal">
                        <span className="font-extrabold text-amber-600 block text-[0.5rem] uppercase tracking-wider mb-0.5">Kind:</span>
                        "{hoveredField.kindComment}"
                      </div>
                    )}

                    {hoveredField.lehrerComment && (
                      <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100 text-[0.6875rem] text-slate-700 font-bold leading-normal">
                        <span className="font-extrabold text-indigo-600 block text-[0.5rem] uppercase tracking-wider mb-0.5">Lehrperson:</span>
                        "{hoveredField.lehrerComment}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center bg-white border border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center h-full">
                <span className="text-[1.875rem] leading-tight animate-bounce drop-shadow-sm pb-1">🌸</span>
                <p className="text-[0.75rem] leading-tight font-black text-indigo-950 uppercase tracking-widest mt-1">
                  Kollaboratives Entwicklungsdiagramm
                </p>
                <p className="text-[0.625rem] text-slate-500 font-bold leading-relaxed mt-2 max-w-[220px] mx-auto">
                  Führe den Mauszeiger über ein Blütenblatt, um Detailwerte zu sehen! {editable && 'Klicke zum Bearbeiten.'}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-center relative w-full shrink-0">
          <svg 
            viewBox="-60 -60 560 560" 
            className={`w-full aspect-square drop-shadow-sm select-none overflow-visible transition-all duration-300 ${
              large 
                ? 'max-w-[340px] sm:max-w-[450px] md:max-w-[540px] lg:max-w-[620px] xl:max-w-[680px] 2xl:max-w-[760px]' 
                : 'max-w-[280px] sm:max-w-[340px] md:max-w-[400px] lg:max-w-[460px] xl:max-w-[500px]'
            }`}
          >
            <defs>
              <radialGradient id="flower-center" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="100%" stopColor="#facc15" />
              </radialGradient>
              <linearGradient id="kind-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.45" />
              </linearGradient>
              <linearGradient id="lehrer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.45" />
              </linearGradient>
            </defs>

            {[35, 70, 105, 140, 175].map((r, i) => (
              <g key={r}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={isDark ? "#475569" : "#cbd5e1"}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <text
                  x={cx + 4}
                  y={cy - r + 3}
                  fill={isDark ? "#64748b" : "#94a3b8"}
                  fontSize={large ? "11" : "8"}
                  fontWeight="950"
                  fontFamily="sans-serif"
                >
                  {i + 1}
                </text>
              </g>
            ))}
            
            <circle cx={cx} cy={cy} r="14" fill="none" stroke={isDark ? "#475569" : "#cbd5e1"} strokeWidth="1" strokeDasharray="3 3" />
            <text x={cx + 4} y={cy - 14 + 3} fill={isDark ? "#64748b" : "#94a3b8"} fontSize={large ? "11" : "8"} fontWeight="950">0</text>

            {activeFields.map((field, idx) => {
              const angle = (idx * 2 * Math.PI) / N - Math.PI / 2;
              const cos = Math.cos(angle);
              const sin = Math.sin(angle);

              let kindValue = 0;
              let lehrerValue = 0;

              if (isCollaborative) {
                kindValue = latestKel?.selbsteinschaetzungKind?.[field.id]?.wert !== undefined
                  ? Number(latestKel.selbsteinschaetzungKind[field.id].wert)
                  : 0;
                
                lehrerValue = latestKel?.einschaetzungLehrperson?.[field.id]?.wert !== undefined
                  ? Number(latestKel.einschaetzungLehrperson[field.id].wert)
                  : 0;
              } else {
                kindValue = latestKel?.selbsteinschaetzungKind?.[field.id]?.wert !== undefined
                  ? Number(latestKel.selbsteinschaetzungKind[field.id].wert)
                  : (student?.foerderprofil?.skillRadar?.[field.id as keyof SkillRadar] !== undefined 
                     ? Number(student.foerderprofil.skillRadar[field.id as keyof SkillRadar]) 
                     : 0);
                lehrerValue = latestKel?.einschaetzungLehrperson?.[field.id]?.wert !== undefined
                  ? Number(latestKel.einschaetzungLehrperson[field.id].wert)
                  : (student?.foerderprofil?.skillRadar?.[field.id as keyof SkillRadar] !== undefined 
                     ? Number(student.foerderprofil.skillRadar[field.id as keyof SkillRadar]) 
                     : 0);
              }

              const kindComment = latestKel?.selbsteinschaetzungKind?.[field.id]?.kommentar || '';
              const lehrerComment = latestKel?.einschaetzungLehrperson?.[field.id]?.kommentar || '';

              const kindL = (kindValue / 5) * 175;
              const lehrerL = (lehrerValue / 5) * 175;

              const lineX = cx + 175 * cos;
              const lineY = cy + 175 * sin;

              const labelX = cx + 195 * cos;
              const labelY = cy + 195 * sin;
              const textAnchor = cos < -0.05 ? 'end' : cos > 0.05 ? 'start' : 'middle';

              const getPetalPath = (L: number) => {
                if (L < 5) return '';
                const cAngle1 = angle - (0.35 / Math.sqrt(L / 35));
                const cAngle2 = angle + (0.35 / Math.sqrt(L / 35));
                const ctrlX1 = cx + (L * 0.45) * Math.cos(cAngle1);
                const ctrlY1 = cy + (L * 0.45) * Math.sin(cAngle1);
                const ctrlX2 = cx + (L * 0.45) * Math.cos(cAngle2);
                const ctrlY2 = cy + (L * 0.45) * Math.sin(cAngle2);
                const tipX = cx + L * cos;
                const tipY = cy + L * sin;
                return `M ${cx} ${cy} Q ${ctrlX1} ${ctrlY1} ${tipX} ${tipY} Q ${ctrlX2} ${ctrlY2} ${cx} ${cy} Z`;
              };

              const kindPath = getPetalPath(kindL);
              const lehrerPath = getPetalPath(lehrerL);

              const isHovered = hoveredField?.id === field.id;
              const isActive = activeId === field.id;

              return (
                <g 
                  key={field.id}
                  onMouseEnter={() => setInternalHover({ ...field, kindValue, lehrerValue, kindComment, lehrerComment })}
                  onMouseLeave={() => setInternalHover(null)}
                  onClick={() => onSelect?.(field.id)}
                  className="cursor-pointer transition-all duration-250 select-none group"
                >
                  <line
                    x1={cx}
                    y1={cy}
                    x2={lineX}
                    y2={lineY}
                    stroke={isHovered || isActive ? '#6366f1' : isDark ? '#334155' : '#f1f5f9'}
                    strokeWidth={isHovered || isActive ? 1.5 : 1}
                  />

                  {kindPath && (
                    <motion.path
                      initial={false}
                      animate={{ d: kindPath }}
                      transition={{ type: 'spring', stiffness: 80, damping: 20 }}
                      fill="url(#kind-gradient)"
                      stroke="#f59e0b"
                      strokeWidth={isHovered || isActive ? 2.5 : 1.5}
                      className="transition-[stroke-width] duration-300 pointer-events-none"
                    />
                  )}

                  {lehrerPath && (
                    <motion.path
                      initial={false}
                      animate={{ d: lehrerPath }}
                      transition={{ type: 'spring', stiffness: 80, damping: 20 }}
                      fill="url(#lehrer-gradient)"
                      stroke="#6366f1"
                      strokeWidth={isHovered || isActive ? 2.5 : 1.5}
                      className="transition-[stroke-width] duration-300 pointer-events-none"
                    />
                  )}

                  <motion.circle 
                    animate={{ cx: cx + kindL * cos, cy: cy + kindL * sin }}
                    r={isHovered || isActive ? 6 : 4} 
                    fill="#fbbf24" 
                    stroke="white" 
                    strokeWidth={1.5}
                    transition={{ type: 'spring', stiffness: 80, damping: 20 }}
                  />
                  <motion.circle 
                    animate={{ cx: cx + lehrerL * cos, cy: cy + lehrerL * sin }}
                    r={isHovered || isActive ? 6 : 4} 
                    fill="#6366f1" 
                    stroke="white" 
                    strokeWidth={1.5}
                    transition={{ type: 'spring', stiffness: 80, damping: 20 }}
                  />

                  <text
                    x={labelX}
                    y={labelY + 2}
                    textAnchor={textAnchor}
                    fill={(isHovered || isActive) ? (isDark ? '#fff' : '#1e1b4b') : (isDark ? '#94a3b8' : '#64748b')}
                    fontSize={large ? ((isHovered || isActive) ? '14' : '11.5') : ((isHovered || isActive) ? '10.5' : '9')}
                    fontWeight={(isHovered || isActive) ? '950' : '855'}
                    className="font-sans transition-all"
                  >
                    {field.label.substring(0, 18)}{field.label.length > 18 ? '..' : ''}
                  </text>
                </g>
              );
            })}

            <circle cx={cx} cy={cy} r="14" fill="url(#flower-center)" stroke="white" strokeWidth="2" className="shadow-md" />
            <circle cx={cx} cy={cy} r="5" fill="#f59e0b" />
          </svg>
        </div>
      </div>
    </div>
  );
};
