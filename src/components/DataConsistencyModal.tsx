import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, AlertTriangle, CheckCircle, ShieldAlert, Sparkles, 
  Trash2, RefreshCw, ArrowRight, Check, UserPlus, Info, FileText
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { 
  scanDataConsistency, 
  resolveConsistencyIssue, 
  autoCleanAllOrphanedData, 
  ConsistencyIssue 
} from '../lib/DataConsistencyService';
import { generateDataConsistencyReport } from '../lib/pdfEngine';

interface DataConsistencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DataConsistencyModal({ isOpen, onClose }: DataConsistencyModalProps) {
  const { app, setApp } = useApp();
  const { showToast } = useToast();
  const [selectedFixIssueId, setSelectedFixIssueId] = useState<string | null>(null);
  const [migrationTargetId, setMigrationTargetId] = useState<string>('');

  const issues = useMemo(() => scanDataConsistency(app), [app]);
  
  const activeStudents = useMemo(() => app.schueler || [], [app.schueler]);

  const handleFixDelete = (issue: ConsistencyIssue) => {
    try {
      const updatedApp = resolveConsistencyIssue(app, issue, 'delete');
      setApp(updatedApp);
      showToast(`Bereinigung abgeschlossen: ${issue.title}`, 'success');
      setSelectedFixIssueId(null);
    } catch (err) {
      showToast('Konnte Daten nicht löschen.', 'error');
    }
  };

  const handleFixMigrate = (issue: ConsistencyIssue) => {
    if (!migrationTargetId) {
      showToast('Bitte wähle einen Zielschüler aus.', 'error');
      return;
    }
    try {
      const targetStudent = activeStudents.find(s => s.id === migrationTargetId);
      const targetName = targetStudent ? `${targetStudent.vorname} ${targetStudent.nachname}` : 'ausgewählten Schüler';
      const updatedApp = resolveConsistencyIssue(app, issue, 'migrate', migrationTargetId);
      setApp(updatedApp);
      showToast(`Daten erfolgreich zu ${targetName} zusammengeführt.`, 'success');
      setSelectedFixIssueId(null);
      setMigrationTargetId('');
    } catch (err) {
      showToast('Fehler bei der Migration.', 'error');
    }
  };

  const handleFixRename = (issue: ConsistencyIssue) => {
    if (!issue.suggestedAction?.suggestedValue) return;
    try {
      const updatedApp = resolveConsistencyIssue(app, issue, 'rename');
      setApp(updatedApp);
      showToast(`Namens-Formatierung erfolgreich korrigiert!`, 'success');
      setSelectedFixIssueId(null);
    } catch (err) {
      showToast('Konnte Namen nicht korrigieren.', 'error');
    }
  };

  const handleFixMerge = (issue: ConsistencyIssue) => {
    const targetId = issue.suggestedAction?.targetId;
    if (!targetId) {
      showToast('Kein Zielschüler definiert.', 'error');
      return;
    }
    try {
      const targetStudent = activeStudents.find(s => s.id === targetId);
      const targetName = targetStudent ? `${targetStudent.vorname} ${targetStudent.nachname}` : 'Zielschüler';
      const updatedApp = resolveConsistencyIssue(app, issue, 'migrate', targetId);
      setApp(updatedApp);
      showToast(`Tippfehler-Profil erfolgreich mit ${targetName} zusammengeführt.`, 'success');
      setSelectedFixIssueId(null);
    } catch (err) {
      showToast('Konnte Datensätze nicht zusammenführen.', 'error');
    }
  };

  const handleAutoCleanAll = () => {
    if (window.confirm('Möchtest du wirklich alle verwaisten Einträge aus der Notenmappe, den Diagnose-Daten, Checklisten und dem Sitzplan löschen? Dieser Schritt kann nicht rückgängig gemacht werden.')) {
      try {
        const cleanedApp = autoCleanAllOrphanedData(app);
        setApp(cleanedApp);
        showToast('Globale System-Reparatur erfolgreich durchgeführt!', 'success');
        onClose();
      } catch (err) {
        showToast('Fehler bei der globalen automatischen Bereinigung.', 'error');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm cursor-pointer"
      />

      {/* Modal Card */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden relative shadow-2xl border border-slate-100 flex flex-col z-10 max-h-[85vh] text-left"
      >
        {/* Header */}
        <div className="p-6 sm:p-8 bg-slate-900 text-white shrink-0 relative">
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-slate-350 hover:text-white transition-colors cursor-pointer border-0 outline-none"
            title="Schließen"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-4">
            <div className={`p-3.5 rounded-2xl ${issues.length > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'} text-white`}>
              <ShieldAlert size={28} />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-none">Daten-Konsistenz-Center</h3>
              <p className="text-stone-300 text-[0.75rem] font-bold uppercase tracking-wider mt-1.5 flex items-center gap-2">
                {issues.length === 0 ? (
                  <span className="text-emerald-400">✓ Alle Module sind absolut synchron</span>
                ) : (
                  <span className="text-amber-400">⚠️ {issues.length} Konsistenz-Abweichungen erkannt</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {issues.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 text-4xl shadow-sm border border-emerald-100">
                <CheckCircle size={36} />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h4 className="font-black text-slate-900 text-lg">System läuft einwandfrei!</h4>
                <p className="text-xs leading-relaxed text-slate-500 font-bold">
                  Sämtliche Notenmappen-Aufzeichnungen, Diagnose-Erhebungen, Verhaltensampeln, Dienste, Kassenbucheinträge und Checklisten sind perfekt mit deinen Schülerprofilen synchronisiert. Keine verwaisten Schlüssel oder Namensdiskrepanzen gefunden.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3 leading-relaxed">
                <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[0.75rem] leading-snug font-bold text-amber-900/80">
                  <span className="font-extrabold text-amber-950 block mb-0.5">Automatisches Diagnosetool</span>
                  Wenn du Schüler löschst oder umbenennst, können im Hintergrund ungenutzte Fragmente verwaister ID-Einträge verbleiben. Wähle unten das gewünschte Element, um die Daten nahtlos zu reparieren oder zusammenzuführen.
                </div>
              </div>

              {/* Bulk Action Flag */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-150 p-4 rounded-2xl">
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-slate-800">Systemweite automatische Reparatur</span>
                  <span className="text-[10px] font-semibold text-slate-500 block">Entfernt alle nicht mehr zuordenbaren Datensätze auf einmal</span>
                </div>
                <button
                  type="button"
                  onClick={handleAutoCleanAll}
                  className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-[0.625rem] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer border-0"
                >
                  <Sparkles size={12} className="text-amber-400" />
                  Alles Bereinigen
                </button>
              </div>

              {/* List of Issues */}
              <div className="space-y-3">
                {issues.map(issue => {
                  const isFixing = selectedFixIssueId === issue.id;
                  let badgeColor = 'bg-amber-50 border-amber-100 text-amber-600';
                  if (issue.severity === 'error') badgeColor = 'bg-rose-50 border-rose-100 text-rose-600';
                  else if (issue.severity === 'info') badgeColor = 'bg-sky-50 border-sky-100 text-sky-600';

                  return (
                    <div 
                      key={issue.id}
                      className={`border-2 rounded-2xl transition-all ${isFixing ? 'border-indigo-600 bg-indigo-50/10' : 'border-slate-100 hover:border-slate-250 bg-white'}`}
                    >
                      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1 text-left min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 border text-[9px] font-black uppercase tracking-wider rounded-lg ${badgeColor}`}>
                              {issue.title}
                            </span>
                            <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">
                              Modul: {issue.module}
                            </span>
                          </div>
                          
                          <h4 className="text-[0.875rem] font-bold text-slate-800 leading-snug break-words">
                            {issue.description}
                          </h4>
                          
                          {issue.details && (
                            <code className="block bg-slate-50 p-2 rounded-lg text-[9px] font-mono text-slate-500 mt-1 truncate">
                              {issue.details}
                            </code>
                          )}
                        </div>

                        {issue.fixable && (
                          <div className="flex md:flex-col items-center gap-2 self-start md:self-center">
                            {!isFixing ? (
                              <button
                                type="button"
                                onClick={() => setSelectedFixIssueId(issue.id)}
                                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700/90 text-[0.625rem] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 cursor-pointer border-0"
                              >
                                <RefreshCw size={12} />
                                Reparieren
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSelectedFixIssueId(null)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer border-0"
                              >
                                Abbrechen
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Interactive Healing Drawer */}
                      <AnimatePresence>
                        {isFixing && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-slate-50/60 border-t border-slate-100 p-4 space-y-4"
                          >
                            {issue.type === 'format_name_discrepancy' ? (
                              <div className="bg-white p-4 border border-indigo-150 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="space-y-1 text-left">
                                  <span className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-wider block">Option: Formatierung korrigieren</span>
                                  <span className="text-xs font-bold text-slate-800">
                                    Vorschlag: {issue.suggestedAction?.suggestedValue}
                                  </span>
                                  <span className="text-[10px] font-semibold text-slate-500 leading-normal block">
                                    Korrigiert nicht-standardisierte Groß-/Kleinschreibung, doppelte Leerzeichen und Trims im Schülerdossier u. Notenmappe.
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleFixRename(issue)}
                                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[0.625rem] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 shrink-0 cursor-pointer border-0"
                                >
                                  <Check size={12} />
                                  Formatierung anwenden
                                </button>
                              </div>
                            ) : issue.type === 'typo_name_discrepancy' ? (
                              <div className="bg-white p-4 border border-amber-150 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="space-y-1 text-left flex-1">
                                  <span className="text-[11px] font-extrabold text-amber-600 uppercase tracking-wider block">Option: Profile zusammenführen</span>
                                  <span className="text-xs font-bold text-slate-800">
                                    Unterkunft in das Hauptprofil transferieren
                                  </span>
                                  <span className="text-[10px] font-semibold text-slate-500 leading-normal block">
                                    Konsolidiert dieses Doppeleintrag-Profil. Notenmappe, Mitarbeit und Diagnostik werden komplett mit dem ProfilID {issue.suggestedAction?.targetId} gemergt. Der fehlerhafte Zweit-Eintrag wird danach gelöscht.
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleFixMerge(issue)}
                                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[0.625rem] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 shrink-0 cursor-pointer border-0"
                                >
                                  <Sparkles size={12} className="text-amber-200" />
                                  Auto-Fix Zusammenführen
                                </button>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Option A: Delete Orphans */}
                                <div className="bg-white p-4 border border-slate-150 rounded-xl flex flex-col justify-between space-y-3">
                                  <div className="space-y-0.5">
                                    <span className="text-[11px] font-extrabold text-rose-600 uppercase tracking-wider block">Option A: Komplett löschen</span>
                                    <span className="text-[10px] font-semibold text-slate-500 leading-normal block">
                                      Löscht alle nicht zuzuordnenden Reste dieses Eintrags endgültig aus der Datenbank.
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleFixDelete(issue)}
                                    className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-[0.625rem] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                                  >
                                    <Trash2 size={12} />
                                    Daten Löschen
                                  </button>
                                </div>

                                {/* Option B: Remap/Migrate to Active Student */}
                                <div className="bg-white p-4 border border-slate-150 rounded-xl flex flex-col justify-between space-y-3">
                                  <div className="space-y-0.5">
                                    <span className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-wider block">Option B: Zu Schüler zuweisen (Merge)</span>
                                    <span className="text-[10px] font-semibold text-slate-500 leading-normal block">
                                      Verschiebt und migriert alle Fragmente nahtlos an den ausgewählten Schüler.
                                    </span>
                                  </div>

                                  <div className="space-y-2">
                                    <select
                                      value={migrationTargetId}
                                      onChange={(e) => setMigrationTargetId(e.target.value)}
                                      className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    >
                                      <option value="">-- Aktiven Schüler wählen --</option>
                                      {activeStudents.map(s => (
                                        <option key={s.id} value={s.id}>
                                          {s.vorname} {s.nachname} ({s.id})
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => handleFixMigrate(issue)}
                                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[0.625rem] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-0"
                                      disabled={!migrationTargetId}
                                    >
                                      <UserPlus size={12} />
                                      Daten Transferieren
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={async () => {
              try {
                await generateDataConsistencyReport(app, issues);
                showToast('Konsistenzbericht-PDF erfolgreich heruntergeladen!', 'success');
              } catch (err) {
                showToast('Fehler beim Generieren des PDF-Berichts.', 'error');
              }
            }}
            className="px-4 h-11 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 rounded-xl text-[0.6875rem] font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer flex items-center gap-2"
          >
            <FileText size={14} className="text-rose-500" />
            PDF Export
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-6 h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[0.6875rem] font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer border-0"
          >
            Fertig
          </button>
        </div>
      </motion.div>
    </div>
  );
}
