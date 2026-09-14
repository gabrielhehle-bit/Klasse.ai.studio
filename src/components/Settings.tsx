import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import localforage from 'localforage';
import { getSpeicherStatus } from '../lib/utils';
import { clearTrustedDeviceUnlock } from '../lib/trustedDeviceVault';

// Subcomponents
import SettingsHeader, { SettingsCategory } from './settings/SettingsHeader';
import SettingsDashboard from './settings/SettingsDashboard';
import GeneralSettings from './settings/GeneralSettings';
import DisplaySettings from './settings/DisplaySettings';
import ModuleSettings from './settings/ModuleSettings';
import SyncSettings from './settings/SyncSettings';
import BackupSettings from './settings/BackupSettings';
import AdvancedSettings from './settings/AdvancedSettings';
import DeleteClassModal from './settings/DeleteClassModal';

export const AVAILABLE_MODULES = [
  { id: 'cockpit', label: 'LEHRERCOCKPIT', desc: 'Sperren, Timer, Lärmampel, Klassenglas & Tafel', category: 'Unterricht' },
  { id: 'ki-helfer', label: 'KI Helfer & Assistenten', desc: 'Kreative KI-Tools, Differenzierung, Elternbrief-Generator', category: 'Unterricht' },
  { id: 'schueler', label: 'Schülerdaten & Profile', desc: 'Schülerliste, Portfolios, Notizen und Stammdaten', category: 'Werkzeuge' },
  { id: 'sitzplan', label: 'Sitzplan und Gruppen', desc: 'Zufallsgenerator, Gruppenarbeiten & Raumordnung', category: 'Werkzeuge' },
  { id: 'anwesenheit', label: 'Anwesenheitskontrolle', desc: 'Tägliche Präsenzliste, Fehltage & Verspätungen', category: 'Werkzeuge' },
  { id: 'noten', label: 'Notenmappe & Mitarbeit', desc: 'Prüfungen, Hausübungen & Mitarbeitspunkte-System', category: 'Werkzeuge' },
  { id: 'orga', label: 'Klassenkasse & Geldsammlungen', desc: 'Kassenbuch, Belege, Einnahmen/Ausgaben pro Kind', category: 'Werkzeuge', condition: (app: any) => app.klassenvorstand },
  { id: 'jahresplanung', label: 'Jahres- & Stoffplanung', desc: 'Langzeit-Planer nach Themen & Kalenderwochen', category: 'Planung' },
  { id: 'wochenplanung', label: 'Wochenplaner & HÜs', desc: 'HÜ-Abgaben, wöchentliche Meilensteine & Pläne', category: 'Planung' },
  { id: 'materialien', label: 'Materialbibliothek & Entwürfe', desc: 'Unterrichtsmaterialien & fertige Stundenbilder', category: 'Planung' },
  { id: 'uebergabemappe', label: 'Übergabemappe', desc: 'Klassenübergabe & Schülerbeurteilungen', category: 'Planung', condition: (app: any) => app.klassenvorstand },
  { id: 'statistik', label: 'Statistik & Profile', desc: 'Analysen und Klassenschnitt-Grafiken', category: 'Extras' },
  { id: 'diagnostik', label: 'Diagnostik & Förderung', desc: 'Lese- & Rechentests, standardisierte Porträtbögen', category: 'Extras', condition: (app: any) => app.klassenvorstand },
  { id: 'archiv', label: 'Daten-Archiv', desc: 'Abgeschlossene Schuljahre & Verläufe', category: 'Extras' },
  { id: 'datensicherung', label: 'Datensicherung (Backup)', desc: 'Daten exportieren, wiederherstellen & löschen', category: 'Extras' }
];

export default function Settings() {
  const { app, setApp, deleteClass } = useApp();
  const { showToast } = useToast();

  // Active Category tab
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('overview');

  // Einfachmodus State (Defaults to true for quiet, clear experience)
  const einfachModus = (app.settings as any)?.einfachModus !== false;
  const setEinfachModus = (val: boolean) => {
    setApp(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        einfachModus: val
      }
    }));
  };

  // Delete Modal state (Factory Reset & History)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [resetType, setResetType] = useState<'all' | 'history'>('all');

  // Delete Class Modal state
  const [deleteClassModalOpen, setDeleteClassModalOpen] = useState(false);

  const activeClassName = app.klassenbezeichnung || '';
  const activeClassFullName = app.stufe 
    ? `${app.stufe}. Klasse ${app.klassenbezeichnung || ''}`.trim() 
    : (app.klassenbezeichnung || 'Aktuelle Klasse');
  const studentCount = app.schueler?.length || 0;
  const otherClasses = (app.classes || []).filter(c => c.id !== app.activeClassId);
  const hasOtherClasses = otherClasses.length > 0;
  const nextClassName = otherClasses[0]?.name 
    ? `${otherClasses[0].stufe ? `${otherClasses[0].stufe}. Klasse ` : ''}${otherClasses[0].name}`
    : undefined;

  const handleDeleteClassConfirm = () => {
    const deletedName = activeClassFullName;
    deleteClass();
    setDeleteClassModalOpen(false);
    showToast(`Klasse „${deletedName}“ wurde erfolgreich gelöscht.`, 'success');
  };

  // Speicher status
  const [speicherInfo, setSpeicherInfo] = useState<any>(null);

  const refreshSpeicher = React.useCallback(async () => {
    const status = await getSpeicherStatus();
    setSpeicherInfo(status);
  }, []);

  useEffect(() => {
    refreshSpeicher();
  }, [refreshSpeicher]);

  // PWA Install Handling
  const [installPrompt, setInstallPrompt] = useState<any>(() => (window as any).deferredPrompt);
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
  });

  useEffect(() => {
    const handlePwaSupported = () => setInstallPrompt((window as any).deferredPrompt);
    const handleAppInstalled = () => {
      setIsStandalone(true);
      setInstallPrompt(null);
      (window as any).deferredPrompt = null;
    };
    
    window.addEventListener('pwasupported', handlePwaSupported);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    return () => {
      window.removeEventListener('pwasupported', handlePwaSupported);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    const promptEvent = installPrompt || (window as any).deferredPrompt;
    if (!promptEvent) return;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      setIsStandalone(true);
      setInstallPrompt(null);
      (window as any).deferredPrompt = null;
    }
  };

  // Module toggle function
  const toggleModuleDisable = React.useCallback((moduleId: string) => {
    setApp(prev => {
      const currentDisabled = prev.settings?.disabledModules || [];
      const nextDisabled = currentDisabled.includes(moduleId)
        ? currentDisabled.filter(id => id !== moduleId)
        : [...currentDisabled, moduleId];

      let nextPage = prev.currentPage;
      if (nextPage === moduleId || (moduleId === 'orga' && nextPage === 'orga')) {
        nextPage = 'cockpit';
      }

      return {
        ...prev,
        currentPage: nextPage,
        settings: {
          ...prev.settings,
          disabledModules: nextDisabled
        }
      };
    });
  }, [setApp]);

  // Demo data check
  const hatBeispieldaten = app.schueler?.some((s: any) => s.id?.startsWith('demo-')) || false;

  const removeDemoDataAction = () => {
    if (confirm('Möchtest du wirklich alle Beispieldaten entfernen?')) {
      setApp(prev => {
        const newState = { ...prev };
        
        const filterMap = (map: any) => {
          if (!map) return {};
          const newMap = { ...map };
          Object.keys(newMap).forEach(key => {
            if (key.startsWith('demo-')) delete newMap[key];
          });
          return newMap;
        };

        newState.schueler = (prev.schueler || []).filter(s => !s.id.startsWith('demo-'));
        newState.classes = (prev.classes || []).filter(c => !c.id.startsWith('demo-'));
        newState.notes = (prev.notes || []).filter(n => !n.id.startsWith('demo-') && !n.schuelerId?.startsWith('demo-'));
        newState.differenzierungsGruppen = (prev.differenzierungsGruppen || []).filter(g => !g.id.startsWith('demo-'));
        (newState as any).diagnostikErgebnisse = ((prev as any).diagnostikErgebnisse || []).filter((d: any) => !d.id.startsWith('demo-') && !d.schuelerId?.startsWith('demo-'));
        (newState as any).diagnostikErhebungen = ((prev as any).diagnostikErhebungen || []).filter((d: any) => !d.id.startsWith('demo-') && !d.schuelerId?.startsWith('demo-'));
        
        newState.noten = filterMap(prev.noten);
        newState.mitarbeit = filterMap(prev.mitarbeit);
        newState.anwesenheit = filterMap(prev.anwesenheit);
        
        newState.demoModusAktiv = false;
        
        if (prev.activeClassId?.startsWith('demo-')) {
          newState.activeClassId = newState.classes.length > 0 ? newState.classes[0].id : undefined;
        }
        
        return newState;
      });
      showToast('Beispieldaten wurden erfolgreich entfernt.', 'success');
      refreshSpeicher();
    }
  };

  // Notfall datum
  const notfallDate = useMemo(() => {
    try {
      const raw = localStorage.getItem('hehle_v3_notfallkopie');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.lastBackupDate) {
        return new Date(parsed.lastBackupDate).toLocaleDateString('de-AT', {
          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
      }
    } catch (e) {
      return null;
    }
    return null;
  }, []);

  const openDeleteModal = (type: 'all' | 'history') => {
    setResetType(type);
    setDeleteConfirmText('');
    setDeleteModalOpen(true);
  };

  const handleResetExecute = async () => {
    if (deleteConfirmText !== 'LÖSCHEN') return;

    if (resetType === 'all') {
      try {
        await clearTrustedDeviceUnlock();
        localStorage.clear();
        sessionStorage.clear();
        await localforage.clear();
        window.location.reload();
      } catch (e) {
        console.error('Reset error:', e);
        window.location.reload();
      }
    } else {
      setApp(prev => ({
        ...prev,
        statusLog: [],
        behavior_status: {},
        behavior_notes: {}
      }));
      setDeleteModalOpen(false);
      showToast('Verlauf wurde geleert.', 'success');
    }
  };

  const disabledModulesCount = app.settings?.disabledModules?.length || 0;
  const hasActiveSync = !!app.boardSettings?.activeSyncCode;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 pb-24">
      {/* Top Header & Pill Navigation */}
      <SettingsHeader
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        einfachModus={einfachModus}
        setEinfachModus={setEinfachModus}
      />

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
        >
          {activeCategory === 'overview' && (
            <SettingsDashboard
              onSelectCategory={setActiveCategory}
              disabledModulesCount={disabledModulesCount}
              hasActiveSync={hasActiveSync}
              hasDemoData={hatBeispieldaten}
            />
          )}

          {activeCategory === 'general' && (
            <GeneralSettings
              app={app}
              setApp={setApp}
              showToast={showToast}
              einfachModus={einfachModus}
              onOpenDeleteClassModal={() => setDeleteClassModalOpen(true)}
            />
          )}

          {activeCategory === 'display' && (
            <DisplaySettings
              app={app}
              setApp={setApp}
              einfachModus={einfachModus}
            />
          )}

          {activeCategory === 'modules' && (
            <ModuleSettings
              app={app}
              toggleModuleDisable={toggleModuleDisable}
            />
          )}

          {activeCategory === 'sync' && (
            <SyncSettings
              app={app}
              setApp={setApp}
              showToast={showToast}
            />
          )}

          {activeCategory === 'backup' && (
            <BackupSettings
              app={app}
              setApp={setApp}
              showToast={showToast}
              notfallDate={notfallDate}
              installPrompt={installPrompt}
              isStandalone={isStandalone}
              triggerInstall={triggerInstall}
            />
          )}

          {activeCategory === 'advanced' && (
            <AdvancedSettings
              app={app}
              setApp={setApp}
              showToast={showToast}
              einfachModus={einfachModus}
              speicherInfo={speicherInfo}
              refreshSpeicher={refreshSpeicher}
              hatBeispieldaten={hatBeispieldaten}
              removeDemoDataAction={removeDemoDataAction}
              openDeleteModal={openDeleteModal}
              onOpenDeleteClassModal={() => setDeleteClassModalOpen(true)}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Delete Class Modal */}
      <DeleteClassModal
        isOpen={deleteClassModalOpen}
        onClose={() => setDeleteClassModalOpen(false)}
        onConfirm={handleDeleteClassConfirm}
        className={activeClassName}
        classFullName={activeClassFullName}
        studentCount={studentCount}
        hasOtherClasses={hasOtherClasses}
        nextClassName={nextClassName}
      />

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {deleteModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            
            <motion.div 
              role="dialog"
              aria-modal="true"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] border border-stone-200 shadow-2xl p-8 max-w-md w-full relative z-10 space-y-6"
            >
              <div className="flex items-center gap-4 text-rose-600">
                <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center shadow-inner">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-lg leading-normal font-black text-slate-900">Bestätigung erforderlich</h3>
                  <p className="text-xs text-rose-600 font-extrabold uppercase tracking-widest">
                    {resetType === 'all' ? 'Werkseinstellungen / Daten löschen' : 'Verlauf leeren'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 border-t border-b border-stone-100 py-4">
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {resetType === 'all' 
                    ? 'Hiermit werden alle Schülerdaten, Leistungsnotizen, Sitzpläne und Einstellungen in diesem Browser gelöscht. Dies lässt sich nicht rückgängig machen.'
                    : 'Möchten Sie den gesamten Icon- und Verhaltensverlauf wirklich leeren? Die aktuellen Schüler:innen bleiben erhalten.'
                  }
                </p>
                <p className="text-xs text-slate-500 font-bold">
                  Bitte tippen Sie zur Bestätigung <strong className="text-slate-900 font-black">LÖSCHEN</strong> in das Feld:
                </p>
                <input 
                  type="text" 
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="LÖSCHEN"
                  className="w-full h-11 px-4 rounded-xl border border-stone-200 bg-stone-50 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 text-center uppercase"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="flex-1 h-12 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  disabled={deleteConfirmText !== 'LÖSCHEN'}
                  onClick={handleResetExecute}
                  className={`flex-1 h-12 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    deleteConfirmText === 'LÖSCHEN'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg active:scale-95'
                      : 'bg-stone-100 text-slate-300 cursor-not-allowed'
                  }`}
                >
                  <Trash2 size={14} />
                  Ausführen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="pt-4 text-center">
        <p className="text-[0.625rem] font-bold text-slate-300 uppercase tracking-[0.4em]">
          Klassio • Lokale, verschlüsselte Web-App
        </p>
      </div>
    </div>
  );
}
