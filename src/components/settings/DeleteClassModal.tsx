import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  Users, 
  GraduationCap, 
  Calendar, 
  FileText, 
  Wallet, 
  CheckCircle2, 
  ArrowRight, 
  ShieldAlert,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DeleteClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  className: string;
  classFullName: string;
  studentCount: number;
  hasOtherClasses: boolean;
  nextClassName?: string;
}

export default function DeleteClassModal({
  isOpen,
  onClose,
  onConfirm,
  className,
  classFullName,
  studentCount,
  hasOtherClasses,
  nextClassName
}: DeleteClassModalProps) {
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Expected confirmation phrase: the class name, or 'LÖSCHEN' if no class name is set
  const expectedConfirmation = (className || '').trim() || 'LÖSCHEN';
  const isMatch = confirmInput.trim().toLowerCase() === expectedConfirmation.toLowerCase();

  useEffect(() => {
    if (isOpen) {
      setConfirmInput('');
      setIsDeleting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = () => {
    if (!isMatch || isDeleting) return;
    setIsDeleting(true);
    setTimeout(() => {
      onConfirm();
    }, 150);
  };

  return (
    <AnimatePresence>
      <div 
        id="delete-class-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-class-modal-title"
      >
        <motion.div
          id="delete-class-modal-container"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-rose-100 overflow-hidden my-8"
        >
          {/* Top Banner Header */}
          <div className="bg-rose-50 border-b border-rose-100 p-6 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20 shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[0.625rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-200/70 text-rose-900">
                    Gefahrenbereich
                  </span>
                </div>
                <h2 id="delete-class-modal-title" className="text-xl font-bold text-slate-900 mt-1">
                  Klasse unwiderruflich löschen
                </h2>
              </div>
            </div>
            <button
              id="delete-class-modal-close-btn"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/80 rounded-xl transition-colors cursor-pointer"
              title="Abbrechen"
              aria-label="Modal schließen"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-5 text-sm text-slate-600">
            {/* Target Class Badge */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                  <Layers size={20} />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Ausgewählte Klasse</div>
                  <div className="text-base font-bold text-slate-900">{classFullName || 'Aktuelle Klasse'}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 font-medium">Schüler:innen</div>
                <div className="text-sm font-semibold text-slate-800">{studentCount} erfasst</div>
              </div>
            </div>

            {/* Warning Details */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Folgende Daten dieser Klasse werden gelöscht:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50/50 border border-rose-100/60 text-slate-700">
                  <Users size={14} className="text-rose-500 shrink-0" />
                  <span>Alle Schüler:innen & Profile</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50/50 border border-rose-100/60 text-slate-700">
                  <GraduationCap size={14} className="text-rose-500 shrink-0" />
                  <span>Noten & Mitarbeit</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50/50 border border-rose-100/60 text-slate-700">
                  <Calendar size={14} className="text-rose-500 shrink-0" />
                  <span>Anwesenheiten & Fehlzeiten</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50/50 border border-rose-100/60 text-slate-700">
                  <FileText size={14} className="text-rose-500 shrink-0" />
                  <span>Wochenpläne & Notizen</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50/50 border border-rose-100/60 text-slate-700">
                  <Wallet size={14} className="text-rose-500 shrink-0" />
                  <span>Klassenkasse & Listen</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50/50 border border-rose-100/60 text-slate-700">
                  <ShieldAlert size={14} className="text-rose-500 shrink-0" />
                  <span>Sitzpläne & Klassenglas</span>
                </div>
              </div>
            </div>

            {/* Transition Note */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-amber-900 text-xs flex items-start gap-2.5">
              <ArrowRight size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                {hasOtherClasses ? (
                  <span>
                    Nach dem Löschen wechselt die App automatisch zu deiner Klasse <strong>{nextClassName || 'einer anderen Klasse'}</strong>. Daten anderer Klassen bleiben <strong>vollständig erhalten</strong>.
                  </span>
                ) : (
                  <span>
                    Dies ist deine einzige Klasse. Nach dem Löschen wirst du automatisch zur <strong>Klassen-Ersteinrichtung</strong> weitergeleitet.
                  </span>
                )}
              </div>
            </div>

            {/* Safety Confirmation Input */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label 
                htmlFor="delete-class-confirm-input" 
                className="block text-xs font-semibold text-slate-700"
              >
                Zum endgültigen Löschen bitte „<strong className="text-rose-600 select-all">{expectedConfirmation}</strong>“ eingeben:
              </label>
              <div className="relative">
                <input
                  id="delete-class-confirm-input"
                  type="text"
                  autoFocus
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && isMatch) {
                      handleDelete();
                    }
                  }}
                  placeholder={`Hier „${expectedConfirmation}“ eingeben...`}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium transition-all outline-none ${
                    isMatch 
                      ? 'border-rose-400 bg-rose-50/30 text-rose-900 focus:ring-4 focus:ring-rose-500/10' 
                      : 'border-slate-300 bg-white text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
                  }`}
                />
                {isMatch && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-rose-600 text-xs font-bold gap-1 animate-fadeIn">
                    <CheckCircle2 size={16} className="text-rose-500" />
                    <span>Bestätigt</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
            <button
              id="delete-class-cancel-btn"
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 font-semibold text-xs transition-colors cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              id="delete-class-confirm-submit-btn"
              type="button"
              disabled={!isMatch || isDeleting}
              onClick={handleDelete}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                isMatch && !isDeleting
                  ? 'bg-rose-600 hover:bg-rose-700 active:scale-95 text-white shadow-rose-600/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Trash2 size={14} />
              {isDeleting ? 'Wird gelöscht...' : 'Klasse endgültig löschen'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
