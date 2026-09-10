import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Calendar, 
  Tag, 
  Award, 
  Percent, 
  Hash, 
  FileText, 
  CheckCircle2, 
  Sparkles,
  Info,
  Layers
} from 'lucide-react';

interface AssessmentItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (label: string, date: string, maxPoints?: number) => void;
  onOpenSchularbeitRaster?: () => void;
  typ: 'sa' | 'lzk' | 'wp' | 'obj';
  idx: number;
  initialLabel: string;
  initialDate: string;
  initialMaxPoints: number;
  assessmentMode: 'grades' | 'percent' | 'points';
  subject: string;
  semester: string;
  isNew?: boolean;
}

export const AssessmentItemModal: React.FC<AssessmentItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onOpenSchularbeitRaster,
  typ,
  idx,
  initialLabel,
  initialDate,
  initialMaxPoints,
  assessmentMode,
  subject,
  semester,
  isNew = false
}) => {
  const [label, setLabel] = useState(initialLabel);
  const [date, setDate] = useState(initialDate);
  const [maxPoints, setMaxPoints] = useState<number>(initialMaxPoints || (typ === 'sa' ? 40 : typ === 'wp' ? 10 : 20));

  useEffect(() => {
    if (isOpen) {
      setLabel(initialLabel);
      setDate(initialDate);
      setMaxPoints(initialMaxPoints || (typ === 'sa' ? 40 : typ === 'wp' ? 10 : 20));
    }
  }, [isOpen, initialLabel, initialDate, initialMaxPoints, typ]);

  if (!isOpen) return null;

  const typeNames: Record<string, { singular: string; defaultName: string; icon: any; color: string; badgeBg: string }> = {
    sa: { 
      singular: 'Schularbeit', 
      defaultName: `${idx + 1}. Schularbeit`, 
      icon: Award, 
      color: 'text-indigo-600',
      badgeBg: 'bg-indigo-50 border-indigo-200 text-indigo-800'
    },
    lzk: { 
      singular: 'Lernzielkontrolle (LZK)', 
      defaultName: `LZK ${idx + 1}`, 
      icon: Tag, 
      color: 'text-blue-600',
      badgeBg: 'bg-blue-50 border-blue-200 text-blue-800'
    },
    wp: { 
      singular: 'Wochenplan (WOPL)', 
      defaultName: `WOPL ${idx + 1}`, 
      icon: Layers, 
      color: 'text-purple-600',
      badgeBg: 'bg-purple-50 border-purple-200 text-purple-800'
    },
    obj: { 
      singular: 'Leistungsobjekt', 
      defaultName: `Aufgabe ${idx + 1}`, 
      icon: FileText, 
      color: 'text-emerald-600',
      badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-800'
    }
  };

  const currentTypeInfo = typeNames[typ] || typeNames.obj;
  const TypeIcon = currentTypeInfo.icon;

  const handleQuickDate = (offsetDays: number | null) => {
    if (offsetDays === null) {
      setDate('');
      return;
    }
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const iso = d.toISOString().split('T')[0];
    setDate(iso);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalLabel = label.trim() || currentTypeInfo.defaultName;
    const finalMaxP = assessmentMode === 'points' ? Math.max(1, maxPoints || 20) : undefined;
    onSave(finalLabel, date, finalMaxP);
    onClose();
  };

  return (
    <AnimatePresence>
      <div 
        id="assessment-item-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        onClick={onClose}
      >
        <motion.div
          id="assessment-item-modal-content"
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center gap-3.5">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-xs ${currentTypeInfo.badgeBg}`}>
                <TypeIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">
                  {isNew ? `${currentTypeInfo.singular} erstellen` : `${currentTypeInfo.singular} bearbeiten`}
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Fach: <span className="font-bold text-slate-800">{subject}</span> · <span className="font-bold text-slate-800">{semester}. Semester</span>
                </p>
              </div>
            </div>
            <button
              id="btn-close-assessment-modal"
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              aria-label="Schließen"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
            
            {/* Top row: Title and Date side-by-side on wide screens, stacked on small */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Title Field */}
              <div className="space-y-1.5">
                <label 
                  htmlFor="assessment-item-title-input"
                  className="block text-xs font-black uppercase tracking-wider text-slate-700"
                >
                  Bezeichnung / Titel
                </label>
                <div className="relative">
                  <input
                    id="assessment-item-title-input"
                    type="text"
                    autoFocus
                    value={label}
                    onChange={e => setLabel(e.target.value)}
                    placeholder={currentTypeInfo.defaultName}
                    className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm font-bold text-slate-800 outline-hidden transition-all placeholder:text-slate-400"
                  />
                </div>
                <p className="text-[0.6875rem] text-slate-400 font-medium">
                  z. B. „{typ === 'sa' ? '1. Schularbeit - Aufsatz' : typ === 'lzk' ? 'Geometrie-Check' : typ === 'wp' ? 'WOPL 3 - Satzglieder' : 'Präsentation'}“
                </p>
              </div>

              {/* Date Field */}
              <div className="space-y-1.5">
                <label 
                  htmlFor="assessment-item-date-input"
                  className="block text-xs font-black uppercase tracking-wider text-slate-700"
                >
                  Datum der Durchführung
                </label>
                <div className="relative">
                  <input
                    id="assessment-item-date-input"
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm font-bold text-slate-800 outline-hidden transition-all"
                  />
                </div>
                {/* Date shortcuts */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleQuickDate(0)}
                    className="px-2 py-0.5 text-[0.625rem] font-bold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 border border-slate-200/80 rounded-md transition-colors"
                  >
                    Heute
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDate(1)}
                    className="px-2 py-0.5 text-[0.625rem] font-bold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 border border-slate-200/80 rounded-md transition-colors"
                  >
                    Morgen
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDate(7)}
                    className="px-2 py-0.5 text-[0.625rem] font-bold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 border border-slate-200/80 rounded-md transition-colors"
                  >
                    In 1 Woche
                  </button>
                  {date && (
                    <button
                      type="button"
                      onClick={() => handleQuickDate(null)}
                      className="px-2 py-0.5 text-[0.625rem] font-bold text-rose-600 hover:bg-rose-50 rounded-md transition-colors ml-auto"
                    >
                      Löschen
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Assessment Mode Section */}
            <div className="pt-2">
              {assessmentMode === 'points' && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shadow-xs">
                        <Hash size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-amber-950 leading-tight">
                          Bewertungsart: Punkte
                        </h4>
                        <p className="text-xs font-semibold text-amber-800/80 mt-0.5">
                          Punkteeingabe mit automatischer Prozentberechnung
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-200/70 text-amber-900 border border-amber-300/80 rounded-lg text-xs font-black tracking-wide">
                      Punkte / Max
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-1 border-t border-amber-200/60">
                    <div className="space-y-1.5">
                      <label 
                        htmlFor="assessment-item-max-points-input"
                        className="block text-xs font-black text-amber-950 uppercase tracking-wider"
                      >
                        Maximal erreichbare Punkte
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          id="assessment-item-max-points-input"
                          type="number"
                          min="1"
                          max="1000"
                          value={maxPoints}
                          onChange={e => setMaxPoints(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="w-28 px-3 py-2 bg-white border-2 border-amber-300 focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10 rounded-xl text-base font-black text-amber-950 outline-hidden text-center shadow-xs"
                        />
                        <span className="text-xs font-black text-amber-800">Punkte</span>
                      </div>
                    </div>

                    <div className="bg-white/80 rounded-xl p-3 border border-amber-200/80 space-y-1">
                      <p className="text-[0.6875rem] font-black uppercase text-amber-800 tracking-wider">
                        Beispiel-Umrechnung:
                      </p>
                      <div className="flex items-center justify-between text-xs font-black text-amber-950">
                        <span>Erreicht: {Math.round(maxPoints * 0.85)} / {maxPoints} Pkt.</span>
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          = 85 %
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-amber-900/90 leading-relaxed font-medium">
                    <span className="font-bold">Funktionsweise:</span> Bei den Kindern gibst du die erreichte Punktzahl ein (z. B. 17). Die LehrerAPP ermittelt automatisch den Prozentwert und bezieht ihn in die Gesamtauswertung ein.
                  </p>
                </div>
              )}

              {assessmentMode === 'percent' && (
                <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-xs">
                        <Percent size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-blue-950 leading-tight">
                          Bewertungsart: Prozent
                        </h4>
                        <p className="text-xs font-semibold text-blue-800/80 mt-0.5">
                          Direkte Eingabe von Werten von 0 % bis 100 %
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-blue-200/70 text-blue-900 border border-blue-300/80 rounded-lg text-xs font-black tracking-wide">
                      0 – 100 %
                    </span>
                  </div>
                  
                  <div className="bg-white/80 rounded-xl p-3.5 border border-blue-200/80 flex items-center gap-3">
                    <Info size={18} className="text-blue-600 shrink-0" />
                    <p className="text-xs text-blue-950 font-medium leading-relaxed">
                      Pro Kind wird ein Wert von <span className="font-bold">0 bis 100 %</span> erfasst (z. B. 84 %). Dieser fließt mit der hinterlegten Gewichtung direkt in die Notenmappen-Auswertung ein.
                    </p>
                  </div>
                </div>
              )}

              {assessmentMode === 'grades' && (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
                        <Award size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-emerald-950 leading-tight">
                          Bewertungsart: Noten
                        </h4>
                        <p className="text-xs font-semibold text-emerald-800/80 mt-0.5">
                          Klassische Noteneingabe von 1 bis 5
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-200/70 text-emerald-900 border border-emerald-300/80 rounded-lg text-xs font-black tracking-wide">
                      Notenskala 1 – 5
                    </span>
                  </div>

                  <div className="bg-white/80 rounded-xl p-3.5 border border-emerald-200/80 flex items-center gap-3">
                    <Info size={18} className="text-emerald-600 shrink-0" />
                    <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                      Erfassung von Notenwerten 1 (Sehr gut) bis 5 (Nicht genügend) inklusive optionaler Tendenzen (z. B. 2+ oder 3-).
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* If Schularbeit: extra jump-to-raster action */}
            {typ === 'sa' && onOpenSchularbeitRaster && (
              <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Sparkles size={20} className="text-indigo-600 shrink-0" />
                  <div>
                    <h5 className="text-xs font-black text-indigo-950">
                      Schularbeits-Bewertungsraster
                    </h5>
                    <p className="text-[0.6875rem] text-indigo-800 font-medium">
                      Ausführliche Kriterienmatrix, Punkte, Rechtschreibung und Klassenübersicht.
                    </p>
                  </div>
                </div>
                <button
                  id="btn-open-sa-raster-from-modal"
                  type="button"
                  onClick={() => {
                    const finalLabel = label.trim() || currentTypeInfo.defaultName;
                    const finalMaxP = assessmentMode === 'points' ? Math.max(1, maxPoints || 40) : undefined;
                    onSave(finalLabel, date, finalMaxP);
                    onOpenSchularbeitRaster();
                  }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-sm transition-all"
                >
                  Raster öffnen
                </button>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                id="btn-cancel-assessment-modal"
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
              >
                Abbrechen
              </button>
              <button
                id="btn-save-assessment-modal"
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/20 hover:shadow-lg transition-all flex items-center gap-2"
              >
                <CheckCircle2 size={16} />
                {isNew ? 'Leistungsobjekt anlegen' : 'Änderungen speichern'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
