import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, CheckCircle, ShieldAlert, Sparkles,
  Trash2, RefreshCw, Check, UserPlus, Info, FileText
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
import { Button, IconButton, Badge, Select } from './ui';

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
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
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
      } catch {
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
        className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
      />

      {/* Modal Card */}
      <motion.div 
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="bg-[var(--surface-card,var(--surface))] rounded-[2rem] w-full max-w-2xl overflow-hidden relative shadow-2xl border border-[var(--border-default,var(--border))] flex flex-col z-10 max-h-[85vh] text-left text-[var(--text-primary)]"
      >
        {/* Header */}
        <div className="p-6 bg-[var(--surface-subtle,var(--surface2))] border-b border-[var(--border-default,var(--border))] shrink-0 relative flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-2xl ${issues.length > 0 ? 'bg-[var(--warning-soft)] text-[var(--warning-text)] border border-[var(--warning-border)]' : 'bg-[var(--success-soft)] text-[var(--success-text)] border border-[var(--success-border)]'}`}>
              <ShieldAlert size={24} />
            </div>
            <div>
              <h3 className="text-[1.125rem] font-black tracking-tight leading-none">Daten-Konsistenz-Center</h3>
              <p className="text-[0.6875rem] font-bold uppercase tracking-wider mt-1.5 flex items-center gap-2">
                {issues.length === 0 ? (
                  <span className="text-[var(--success-text)]">✓ Alle Module sind synchron</span>
                ) : (
                  <span className="text-[var(--warning-text)]">⚠️ {issues.length} Konsistenz-Abweichungen erkannt</span>
                )}
              </p>
            </div>
          </div>

          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Schließen"
            onClick={onClose}
          >
            <X size={20} />
          </IconButton>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {issues.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-16 h-16 bg-[var(--success-soft)] rounded-full flex items-center justify-center text-[var(--success-text)] shadow-xs border border-[var(--success-border)]">
                <CheckCircle size={32} />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h4 className="font-black text-[1.125rem]">System läuft einwandfrei!</h4>
                <p className="text-xs leading-relaxed text-[var(--text-muted)] font-medium">
                  Sämtliche Notenmappen-Aufzeichnungen, Diagnose-Erhebungen, Verhaltensampeln, Dienste, Kassenbucheinträge und Checklisten sind perfekt mit deinen Schülerprofilen synchronisiert. Keine verwaisten Schlüssel oder Namensdiskrepanzen gefunden.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-[var(--warning-soft)] border border-[var(--warning-border)] rounded-2xl flex items-start gap-3 leading-relaxed">
                <Info size={18} className="text-[var(--warning-text)] shrink-0 mt-0.5" />
                <div className="text-[0.75rem] leading-snug font-medium text-[var(--warning-text)]">
                  <span className="font-bold block mb-0.5">Automatisches Diagnosetool</span>
                  Wenn du Schüler löschst oder umbenennst, können im Hintergrund ungenutzte Fragmente verwaister ID-Einträge verbleiben. Wähle unten das gewünschte Element, um die Daten nahtlos zu reparieren oder zusammenzuführen.
                </div>
              </div>

              {/* Bulk Action Flag */}
              <div className="flex items-center justify-between bg-[var(--surface-subtle,var(--surface2))] border border-[var(--border-default,var(--border))] p-4 rounded-2xl gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-black">Systemweite automatische Reparatur</span>
                  <span className="text-[11px] text-[var(--text-muted)] block">Entfernt alle nicht mehr zuordenbaren Datensätze auf einmal</span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Sparkles size={13} />}
                  onClick={handleAutoCleanAll}
                >
                  Alles Bereinigen
                </Button>
              </div>

              {/* List of Issues */}
              <div className="space-y-3">
                {issues.map(issue => {
                  const isFixing = selectedFixIssueId === issue.id;
                  let badgeVariant: 'danger' | 'warning' | 'info' = 'warning';
                  if (issue.severity === 'error') badgeVariant = 'danger';
                  else if (issue.severity === 'info') badgeVariant = 'info';

                  return (
                    <div 
                      key={issue.id}
                      className={`border rounded-2xl transition-all overflow-hidden ${isFixing ? 'border-[var(--accent)] ring-1 ring-[var(--accent)] bg-[var(--accent-soft)]/20' : 'border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))]'}`}
                    >
                      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1 text-left min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={badgeVariant} size="sm">
                              {issue.title}
                            </Badge>
                            <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]">
                              Modul: {issue.module}
                            </span>
                          </div>
                          
                          <h4 className="text-[0.875rem] font-bold text-[var(--text-primary)] leading-snug break-words">
                            {issue.description}
                          </h4>
                          
                          {issue.details && (
                            <code className="block bg-[var(--surface-subtle,var(--surface2))] p-2 rounded-lg text-[10px] font-mono text-[var(--text-muted)] mt-1 truncate border border-[var(--border-default,var(--border))]/50">
                              {issue.details}
                            </code>
                          )}
                        </div>

                        {issue.fixable && (
                          <div className="flex md:flex-col items-center gap-2 self-start md:self-center shrink-0">
                            {!isFixing ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                leftIcon={<RefreshCw size={12} />}
                                onClick={() => setSelectedFixIssueId(issue.id)}
                              >
                                Reparieren
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedFixIssueId(null)}
                              >
                                Abbrechen
                              </Button>
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
                            className="bg-[var(--surface-subtle,var(--surface2))] border-t border-[var(--border-default,var(--border))] p-4 space-y-4"
                          >
                            {issue.type === 'format_name_discrepancy' ? (
                              <div className="bg-[var(--surface-card,var(--surface))] p-4 border border-[var(--border-default,var(--border))] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="space-y-1 text-left">
                                  <span className="text-[11px] font-bold text-[var(--accent)] uppercase tracking-wider block">Option: Formatierung korrigieren</span>
                                  <span className="text-xs font-bold text-[var(--text-primary)]">
                                    Vorschlag: {issue.suggestedAction?.suggestedValue}
                                  </span>
                                  <span className="text-[11px] text-[var(--text-muted)] leading-normal block">
                                    Korrigiert nicht-standardisierte Groß-/Kleinschreibung, doppelte Leerzeichen und Trims im Schülerdossier u. Notenmappe.
                                  </span>
                                </div>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  leftIcon={<Check size={12} />}
                                  onClick={() => handleFixRename(issue)}
                                >
                                  Formatierung anwenden
                                </Button>
                              </div>
                            ) : issue.type === 'typo_name_discrepancy' ? (
                              <div className="bg-[var(--surface-card,var(--surface))] p-4 border border-[var(--border-default,var(--border))] rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="space-y-1 text-left flex-1">
                                  <span className="text-[11px] font-bold text-[var(--warning-text)] uppercase tracking-wider block">Option: Profile zusammenführen</span>
                                  <span className="text-xs font-bold text-[var(--text-primary)]">
                                    Unterkunft in das Hauptprofil transferieren
                                  </span>
                                  <span className="text-[11px] text-[var(--text-muted)] leading-normal block">
                                    Konsolidiert dieses Doppeleintrag-Profil. Notenmappe, Mitarbeit und Diagnostik werden komplett mit dem ProfilID {issue.suggestedAction?.targetId} gemergt. Der fehlerhafte Zweit-Eintrag wird danach gelöscht.
                                  </span>
                                </div>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  leftIcon={<Sparkles size={12} />}
                                  onClick={() => handleFixMerge(issue)}
                                >
                                  Auto-Fix Zusammenführen
                                </Button>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Option A: Delete Orphans */}
                                <div className="bg-[var(--surface-card,var(--surface))] p-4 border border-[var(--border-default,var(--border))] rounded-xl flex flex-col justify-between space-y-3">
                                  <div className="space-y-0.5">
                                    <span className="text-[11px] font-bold text-[var(--danger-text)] uppercase tracking-wider block">Option A: Komplett löschen</span>
                                    <span className="text-[11px] text-[var(--text-muted)] leading-normal block">
                                      Löscht alle nicht zuzuordnenden Reste dieses Eintrags endgültig aus der Datenbank.
                                    </span>
                                  </div>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    className="w-full"
                                    leftIcon={<Trash2 size={12} />}
                                    onClick={() => handleFixDelete(issue)}
                                  >
                                    Daten Löschen
                                  </Button>
                                </div>

                                {/* Option B: Remap/Migrate to Active Student */}
                                <div className="bg-[var(--surface-card,var(--surface))] p-4 border border-[var(--border-default,var(--border))] rounded-xl flex flex-col justify-between space-y-3">
                                  <div className="space-y-0.5">
                                    <span className="text-[11px] font-bold text-[var(--accent)] uppercase tracking-wider block">Option B: Zu Schüler zuweisen (Merge)</span>
                                    <span className="text-[11px] text-[var(--text-muted)] leading-normal block">
                                      Verschiebt und migriert alle Fragmente nahtlos an den ausgewählten Schüler.
                                    </span>
                                  </div>

                                  <div className="space-y-2">
                                    <Select
                                      value={migrationTargetId}
                                      onChange={(e) => setMigrationTargetId(e.target.value)}
                                      className="w-full"
                                    >
                                      <option value="">-- Aktiven Schüler wählen --</option>
                                      {activeStudents.map(s => (
                                        <option key={s.id} value={s.id}>
                                          {s.vorname} {s.nachname} ({s.id})
                                        </option>
                                      ))}
                                    </Select>
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      className="w-full"
                                      leftIcon={<UserPlus size={12} />}
                                      onClick={() => handleFixMigrate(issue)}
                                      disabled={!migrationTargetId}
                                    >
                                      Daten Transferieren
                                    </Button>
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
        <div className="p-4 sm:p-6 bg-[var(--surface-subtle,var(--surface2))] border-t border-[var(--border-default,var(--border))] flex items-center justify-between shrink-0">
          <Button
            variant="secondary"
            size="md"
            leftIcon={<FileText size={15} className="text-rose-500" />}
            onClick={async () => {
              try {
                await generateDataConsistencyReport(app, issues);
                showToast('Konsistenzbericht-PDF erfolgreich heruntergeladen!', 'success');
              } catch {
                showToast('Fehler beim Generieren des PDF-Berichts.', 'error');
              }
            }}
          >
            PDF Export
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={onClose}
          >
            Fertig
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
