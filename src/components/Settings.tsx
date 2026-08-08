import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'motion/react';
import { Settings as SettingsIcon, Shield, Palette, Type, Smartphone, Monitor, Trash2, History, Calendar, Check, X, AlertTriangle, EyeOff, Layout, BookOpen, Sliders, Sparkles, Download, Upload, Cpu, Database, HardDrive, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { getFerien, Bundesland, BUNDESLAND_NAMEN } from '../lib/ferienOesterreich';
import { AESTHETIC_THEMES, COLOR_OPTIONS, FAECHER_ALLE, FONTS } from '../constants';
import { getSpeicherStatus, safeJsonParse } from '../lib/utils';
import localforage from 'localforage';

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
  const { app, setApp, setPage } = useApp();
  const { showToast } = useToast();

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

  const [speicherInfo, setSpeicherInfo] = useState<{
    localStorageBytes: number;
    indexedDbBytes: number | null;
    quotaBytes: number | null;
    groessteEintraege: { key: string; bytes: number }[];
  } | null>(null);

  const [showBigEntries, setShowBigEntries] = useState(false);
  const [showSubjectColors, setShowSubjectColors] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [checkResults, setCheckResults] = useState<{ id: string; label: string; status: 'ok' | 'warn' | 'error'; info: string }[] | null>(null);

  const [installPrompt, setInstallPrompt] = useState<any>(() => (window as any).deferredPrompt);
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
  });

  useEffect(() => {
    const handlePwaSupported = () => {
      setInstallPrompt((window as any).deferredPrompt);
    };
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

  const [syncCode, setSyncCode] = useState('');
  const [isSyncConnecting, setIsSyncConnecting] = useState(false);
  const [syncErrorMsg, setSyncErrorMsg] = useState<string | null>(null);

  const hatBeispieldaten = app.schueler?.some((s: any) => s.id?.startsWith('demo-'));

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
        newState.notes = (prev.notes || []).filter(n => !n.id.startsWith('demo-') && !n.schuelerId.startsWith('demo-'));
        newState.differenzierungsGruppen = (prev.differenzierungsGruppen || []).filter(g => !g.id.startsWith('demo-'));
        (newState as any).diagnostikErgebnisse = ((prev as any).diagnostikErgebnisse || []).filter((d: any) => !d.id.startsWith('demo-') && !d.schuelerId.startsWith('demo-'));
        (newState as any).diagnostikErhebungen = ((prev as any).diagnostikErhebungen || []).filter((d: any) => !d.id.startsWith('demo-') && !d.schuelerId.startsWith('demo-'));
        
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

  const refreshSpeicher = React.useCallback(async () => {
    const status = await getSpeicherStatus();
    setSpeicherInfo(status);
  }, []);

  useEffect(() => {
    refreshSpeicher();
  }, [refreshSpeicher]);

  const handleClearAICache = React.useCallback(async () => {
    if (confirm('Bist du sicher? Alle KI-generierten Berichte und Zusammenfassungen werden aus dem Zwischenspeicher gelöscht. Deine App-Daten bleiben erhalten.')) {
      let count = 0;
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('ki_portfolio_summary_') || key.startsWith('ai_parent_report_') || key.startsWith('dashboard_insight'))) {
          localStorage.removeItem(key);
          count++;
        }
      }
      showToast(`${count} Cache-Einträge wurden gelöscht.`, 'success');
      refreshSpeicher();
    }
  }, [refreshSpeicher]);

  const runSystemCheck = React.useCallback(async () => {
    setIsChecking(true);
    const results: { id: string; label: string; status: 'ok' | 'warn' | 'error'; info: string }[] = [];

    try {
      // 1. Hauptspeicher
      try {
        const mainData = localStorage.getItem('hehle_v3');
        if (mainData) {
          results.push({ id: 'main', label: 'Hauptspeicher', status: 'ok', info: 'Hauptspeicher OK' });
        } else {
          results.push({ id: 'main', label: 'Hauptspeicher', status: 'warn', info: 'Keine Daten im Hauptspeicher' });
        }
      } catch (e) {
        results.push({ id: 'main', label: 'Hauptspeicher', status: 'error', info: 'Lesezugriff verweigert' });
      }

      // 2. Sicherungskette
      const backup = localStorage.getItem('hehle_v3_backup');
      const fallback = localStorage.getItem('hehle_v3_fallback');
      if (backup || fallback) {
        results.push({ id: 'backup_chain', label: 'Sicherungskette', status: 'ok', info: 'Sicherungskopie vorhanden' });
      } else {
        results.push({ id: 'backup_chain', label: 'Sicherungskette', status: 'warn', info: 'Keine lokale Sicherungskopie vorhanden' });
      }

      // 3. Notfallkopie
      const notfallTime = localStorage.getItem('hehle_v3_notfallkopie_time');
      const notfallData = localStorage.getItem('hehle_v3_notfallkopie');
      if (notfallData && notfallTime) {
        const dateStr = localStorage.getItem('hehle_v3_notfallkopie_date') || '';
        const lastDate = new Date(dateStr);
        const diff = (new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diff <= 2) {
          results.push({ id: 'emergency', label: 'Notfallkopie', status: 'ok', info: `Vom ${notfallTime}` });
        } else {
          results.push({ id: 'emergency', label: 'Notfallkopie', status: 'warn', info: `Ältere Kopie vom ${notfallTime}` });
        }
      } else {
        results.push({ id: 'emergency', label: 'Notfallkopie', status: 'warn', info: 'Nicht vorhanden' });
      }

      // 4. Namensliste für Pseudonymisierung
      try {
        const names = localStorage.getItem('hehle_v3_namen');
        if (names) {
          JSON.parse(names);
          results.push({ id: 'names', label: 'Pseudonymisierung', status: 'ok', info: 'Einsatzbereit' });
        } else {
          results.push({ id: 'names', label: 'Pseudonymisierung', status: 'error', info: 'Namensliste fehlt – Klarnamen-Gefahr!' });
        }
      } catch (e) {
        results.push({ id: 'names', label: 'Pseudonymisierung', status: 'error', info: 'Namensliste korrupt' });
      }

      // 5. KI-Server
      try {
        const res = await fetch('/api/check-ki-key');
        if (res.ok) {
          const data = await res.json();
          if (data.hasKey) {
            results.push({ id: 'ki_server', label: 'KI-Server', status: 'ok', info: 'Server bereit' });
          } else {
            results.push({ id: 'ki_server', label: 'KI-Server', status: 'error', info: 'Kein API-Key auf dem Server' });
          }
        } else {
          results.push({ id: 'ki_server', label: 'KI-Server', status: 'error', info: 'Server-Fehler' });
        }
      } catch (e) {
        results.push({ id: 'ki_server', label: 'KI-Server', status: 'error', info: 'Server nicht erreichbar' });
      }

      // 6. Letztes Backup
      const lastAction = app.backupEinstellungen?.letztesBackup || localStorage.getItem('lehrkraft_last_backup_time');
      if (lastAction) {
        const lastDate = new Date(lastAction);
        const days = Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (days < 7) {
          results.push({ id: 'last_backup', label: 'Letztes Backup', status: 'ok', info: `Vor ${days} Tagen` });
        } else {
          results.push({ id: 'last_backup', label: 'Letztes Backup', status: 'warn', info: `Letzte Sicherung vor ${days} Tagen` });
        }
      } else {
        results.push({ id: 'last_backup', label: 'Letztes Backup', status: 'error', info: 'Noch nie gesichert' });
      }

      // 7. Datenbestand
      const sCount = app.schueler?.length || 0;
      const cCount = app.classes?.length || 1;
      results.push({ id: 'stats', label: 'Datenbestand', status: 'ok', info: `${cCount} Klassen, ${sCount} Schüler:innen` });

      // 8. App-Modus
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      results.push({ id: 'app_mode', label: 'App-Modus', status: 'ok', info: isStandaloneMode ? 'Installiert (PWA)' : 'Browser-Modus (Web)' });

    } catch (e) {
      console.error('Check failed', e);
    }
    
    setCheckResults(results);
    setIsChecking(false);
  }, [app]);

  // Modal and custom config states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [resetType, setResetType] = useState<'all' | 'history'>('all');
  const [notfallDate, setNotfallDate] = useState<string | null>(null);

  React.useEffect(() => {
    const time = localStorage.getItem('hehle_v3_notfallkopie_time');
    const kopie = localStorage.getItem('hehle_v3_notfallkopie');
    if (time && kopie) {
      setNotfallDate(time);
    }
  }, []);

  const handleRestoreNotfall = React.useCallback(() => {
    const kopie = localStorage.getItem('hehle_v3_notfallkopie');
    if (!kopie) return;
    if (confirm(`Stand vom ${notfallDate} wiederherstellen? Deine aktuellen nicht-gesicherten Daten gehen dabei verloren!`)) {
      try {
        const parsed = JSON.parse(kopie);
        setApp(prev => ({
          ...prev,
          ...parsed,
          differenzierungsGruppen: parsed.differenzierungsGruppen ?? [],
          stimmNotizen: parsed.stimmNotizen ?? [],
          jahresberichte: parsed.jahresberichte ?? {},
          wochenrueckblick: parsed.wochenrueckblick ?? null,
          lernzielTracker: parsed.lernzielTracker ?? {},
          ikmRecords: parsed.ikmRecords ?? [],
          klassenglas_completed_missions: parsed.klassenglas_completed_missions ?? [],
          dienste: parsed.dienste ?? [],
          settings: { ...prev.settings, ...(parsed.settings || {}) },
          boardSettings: { ...prev.boardSettings, ...(parsed.boardSettings || {}) }
        }));
        alert('Notfallkopie wurde erfolgreich wiederhergestellt!');
      } catch (e) {
        alert('Fehler beim Wiederherstellen der Notfallkopie.');
      }
    }
  }, [notfallDate, setApp]);

  // Input bindings for colorpicker hex display
  const customBg = app?.customBgColor || '#f3f4f6';
  const customAccent = app?.customAccentColor || '#10b981';
  const customText = app?.customTextColor || '#171717';
  const customText2 = app?.customText2Color || '#525252';

  const toggleBackupReminders = React.useCallback(() => {
    setApp(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        disableBackupReminders: !prev.settings.disableBackupReminders
      }
    }));
  }, [setApp]);

  const handleExportJSON = React.useCallback(() => {
    try {
      const backupData = JSON.stringify(app, null, 2);
      const blob = new Blob([backupData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const today = new Date().toISOString().split('T')[0];
      link.download = `lehrercockpit_backup_${today}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert('Fehler beim Exportieren des Backups.');
    }
  }, [app]);

  const handleImportJSON = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        
        if (parsed && typeof parsed === 'object' && (Array.isArray(parsed.schueler) || Array.isArray(parsed.classes))) {
          if (confirm('Bist du sicher? Alle aktuellen Daten werden durch dieses Backup überschrieben!')) {
            // Sichern vor dem Überschreiben
            try {
              localStorage.setItem('hehle_v3_notfallkopie', JSON.stringify(app));
              localStorage.setItem('hehle_v3_notfallkopie_date', new Date().toISOString().split('T')[0]);
              localStorage.setItem('hehle_v3_notfallkopie_time', new Date().toLocaleString('de-DE'));
            } catch (backupError) {
              console.warn('Konnte Notfallkopie vor Import nicht speichern.', backupError);
            }

            setApp({
              ...parsed,
              backupEinstellungen: {
                letztesBackup: null,
                erinnerungAktiv: parsed.backupEinstellungen?.erinnerungAktiv ?? true
              }
            });
            alert('Daten-Backup wurde erfolgreich eingelesen und wiederhergestellt!');
          }
        } else {
          alert('Diese Datei ist kein gültiges Lehrermappe-Backup.');
        }
      } catch (err) {
        alert('Fehler beim Lesen der Sicherungsdatei. Bitte stelle sicher, dass es eine intakte JSON-Datei ist.');
      }
    };
    reader.readAsText(file);
    // Zurücksetzen des Input-Werts, damit dieselbe Datei direkt wieder ausgewählt werden kann
    e.target.value = '';
  }, [app, setApp]);

  const toggleHoliday = React.useCallback((id: string) => {
    setApp(prev => {
      const disabled = prev.calendarSettings?.disabledHolidays || [];
      const nextDisabled = disabled.includes(id) 
        ? disabled.filter(d => d !== id)
        : [...disabled, id];
      return {
        ...prev,
        calendarSettings: {
          ...prev.calendarSettings,
          disabledHolidays: nextDisabled
        }
      };
    });
  }, [setApp]);

  const handleResetExecute = React.useCallback(async () => {
    if (deleteConfirmText !== 'LÖSCHEN') return;
    setDeleteModalOpen(false);

    if (resetType === 'all') {
      try {
        await localforage.clear();
      } catch (error) {
        console.error('Primärer lokaler Speicher konnte nicht vollständig geleert werden.', error);
        showToast('Der Hauptspeicher konnte nicht vollständig gelöscht werden.', 'error');
        return;
      }
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } else {
      setApp(prev => ({ ...prev, statusLog: [] }));
      alert('Der Icon-Verlauf wurde erfolgreich geleert.');
    }
  }, [deleteConfirmText, resetType, setApp, showToast]);

  return (
    <div className="py-4 max-w-7xl mx-auto space-y-7 px-4">
      {/* Page Title */}
      <div className="flex items-center gap-4 bg-white p-6 rounded-3xl border border-stone-200/60 shadow-sm">
        <div className="w-14 h-14 bg-accent/10 text-accent rounded-2xl flex items-center justify-center shadow-inner shrink-0">
          <SettingsIcon size={26} />
        </div>
        <div>
          <h2 className="text-2 text-[1.5rem] leading-normal font-black text-slate-900 tracking-tight">Einstellungen</h2>
          <p className="text-[0.75rem] text-slate-500 font-medium">Klasse, Darstellung, Funktionen und Datenschutz zentral verwalten.</p>
        </div>
      </div>

      <nav aria-label="Bereiche der Einstellungen" className="sticky top-2 z-20 bg-white/95 backdrop-blur-md border border-stone-200/70 shadow-sm rounded-2xl p-2 flex gap-2 overflow-x-auto">
        {[
          ['settings-class', 'Klasse'],
          ['settings-modules', 'Module'],
          ['settings-design', 'Design'],
          ['settings-subjects', 'Fächer'],
          ['settings-board', 'Smartboard'],
          ['settings-security', 'Sicherheit'],
          ['settings-calendar', 'Kalender'],
          ['settings-system', 'System']
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="shrink-0 px-4 h-9 rounded-xl bg-slate-50 hover:bg-accent hover:text-white text-slate-650 text-[0.6875rem] font-black transition-colors cursor-pointer"
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        <div className="space-y-8">
          {/* Class Settings Section */}
          <section id="settings-class" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-3 px-2">
            <Monitor size={18} className="text-slate-400" />
            <h3 className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400">Aktuelle Klasse: {app.klassenbezeichnung}</h3>
          </div>
          <div className="bg-white rounded-[2.5rem] border border-stone-200/60 shadow-xl shadow-slate-900/[0.02] p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4">
                  <div className="flex flex-col gap-1 px-1">
                    <label className="text-[0.6875rem] font-black uppercase tracking-wider text-slate-900">Klassenbezeichnung</label>
                    <p className="text-[0.6875rem] text-slate-400 font-medium">Der Name deiner Klasse (z.B. 4b).</p>
                  </div>
                  <input 
                    type="text" 
                    aria-label="Klassenbezeichnung"
                    value={app.klassenbezeichnung} 
                    onChange={(e) => setApp(prev => ({ ...prev, klassenbezeichnung: e.target.value }))}
                    className="w-full h-12 px-4 rounded-2xl border border-stone-200 bg-white text-[0.875rem] leading-snug font-bold text-slate-800 outline-none focus:ring-2 focus:ring-accent transition-all shadow-sm"
                  />
               </div>

               <div className="space-y-4">
                  <div className="flex flex-col gap-1 px-1">
                    <label className="text-[0.6875rem] font-black uppercase tracking-wider text-slate-900">Schulstufe</label>
                    <p className="text-[0.6875rem] text-slate-400 font-medium">Die aktuelle Leistungsstufe (1-12).</p>
                  </div>
                  <input 
                    type="number" 
                    aria-label="Schulstufe"
                    min={1}
                    max={12}
                    value={app.stufe} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setApp(prev => ({ ...prev, stufe: isNaN(val) ? 1 : val }));
                    }}
                    className="w-full h-12 px-4 rounded-2xl border border-stone-200 bg-white text-[0.875rem] leading-snug font-bold text-slate-800 outline-none focus:ring-2 focus:ring-accent transition-all shadow-sm"
                  />
               </div>
            </div>

            <div className="flex items-center justify-between p-5 bg-accent/5 rounded-3xl border border-accent/10 mt-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-[0.875rem] font-black text-slate-900">Klassenvorstand-Modus</h4>
                  {app.klassenvorstand ? (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[0.5rem] font-black uppercase rounded-md">KV Aktiv</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-500 text-[0.5rem] font-black uppercase rounded-md">Fachlehrer</span>
                  )}
                </div>
                <p className="text-[0.75rem] text-slate-500 font-medium leading-relaxed max-w-md">
                  Aktiviert/Deaktiviert KV-Funktionen wie Klassenglas, Kasse, KEL-Gespräche und Übergabemappe.
                </p>
              </div>
              
              <button 
                type="button"
                role="switch"
                aria-checked={app.klassenvorstand}
                aria-label="Klassenvorstand-Modus"
                onClick={() => setApp(prev => ({ ...prev, klassenvorstand: !prev.klassenvorstand }))}
                className={`relative w-14 h-7 rounded-full transition-all duration-300 flex items-center px-1 cursor-pointer shrink-0 ${!app.klassenvorstand ? 'bg-slate-300' : 'bg-emerald-500 shadow-md shadow-emerald-500/15'}`}
              >
                <motion.div 
                  animate={{ x: !app.klassenvorstand ? 0 : 28 }}
                  className="w-5 h-5 bg-white rounded-full shadow-sm"
                />
              </button>
            </div>

            {/* Re-run setup action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-amber-500/5 rounded-3xl border border-amber-500/10 mt-6">
              <div className="space-y-1">
                <h4 className="text-[0.875rem] font-black text-slate-900 flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
                  Klassen-Einrichtungsassistent (Setup)
                </h4>
                <p className="text-[0.75rem] text-slate-500 font-medium leading-relaxed max-w-md">
                  Öffnet den geführten Assistenten für deine aktive Klasse, um Schülerdaten (z.B. per CSV/Sokrates-Import) einzupflegen oder den Stundenplan und die Schulfächer neu zu konfigurieren.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPage('setup')}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-[0.75rem] leading-tight font-black uppercase tracking-wider rounded-2xl transition-all shadow-md shadow-amber-500/20 whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98] self-start sm:self-center"
              >
                Setup starten
              </button>
            </div>
          </div>
        </section>

        {/* Module Toggles Section */}
        <section id="settings-modules" className="space-y-4 scroll-mt-20">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <Sliders size={18} className="text-slate-400" />
              <h3 className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400">Modul-Aktivierung („Weniger ist mehr“)</h3>
            </div>
            <div className="flex items-center gap-2 text-[0.625rem] font-black uppercase tracking-wider">
              <button 
                type="button"
                onClick={() => setApp(prev => ({ ...prev, settings: { ...prev.settings, disabledModules: [] } }))}
                className="text-accent hover:underline px-2 py-1 bg-accent/5 rounded-md cursor-pointer"
              >
                Alle an
              </button>
              <button 
                type="button"
                onClick={() => setApp(prev => ({ ...prev, settings: { ...prev.settings, disabledModules: ['cockpit', 'ki-helfer', 'jahresplanung', 'wochenplanung', 'materialien', 'uebergabemappe', 'statistik', 'diagnostik', 'archiv'] } }))}
                className="text-stone-500 hover:text-stone-800 px-2 py-1 bg-stone-100 rounded-md cursor-pointer"
              >
                Minimalansicht
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-stone-200/60 shadow-xl shadow-slate-900/[0.02] p-8 space-y-6">
            <div>
              <h4 className="text-[1rem] leading-normal font-black text-slate-900 tracking-tight">Einfachheit nach Maß</h4>
              <p className="text-[0.75rem] text-slate-500 font-medium leading-relaxed max-w-2xl mt-1">
                Deaktiviere ungenutzte Module, um deine Benutzeroberfläche radikal aufzuräumen. Die ausgeblendeten Funktionen verschwinden sofort aus der Seitenleiste und dem Haupt-Dashboard. Du kannst sie jederzeit hier wieder einschalten.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {AVAILABLE_MODULES.filter(m => m.condition === undefined || m.condition(app)).map(m => {
                const isDisabled = (app.settings?.disabledModules || []).includes(m.id);
                return (
                  <div 
                    key={m.id}
                    className={`flex items-center justify-between p-5 rounded-3xl border transition-all duration-300 ${isDisabled ? 'bg-slate-50/50 border-stone-250 opacity-60' : 'bg-white border-stone-200 shadow-sm'}`}
                  >
                    <div className="space-y-1 pr-4 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[0.75rem] font-black text-slate-900 text-wrap leading-tight break-words leading-none">{m.label}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[0.5rem] font-black uppercase tracking-wider ${
                          m.category === 'Unterricht' ? 'bg-indigo-50 text-indigo-700' :
                          m.category === 'Werkzeuge' ? 'bg-emerald-50 text-emerald-700' :
                          m.category === 'Planung' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-650'
                        }`}>
                          {m.category}
                        </span>
                      </div>
                      <p className="text-[0.6875rem] text-slate-400 font-medium leading-snug line-clamp-2">{m.desc}</p>
                    </div>

                    <button 
                      type="button"
                      role="switch"
                      aria-checked={!isDisabled}
                      aria-label={`${m.label} ${isDisabled ? 'aktivieren' : 'deaktivieren'}`}
                      onClick={() => toggleModuleDisable(m.id)}
                      className={`relative w-12 h-6 rounded-full transition-all duration-300 flex items-center px-0.5 cursor-pointer shrink-0 ${isDisabled ? 'bg-slate-200' : 'bg-accent shadow-md shadow-accent/15'}`}
                    >
                      <motion.div 
                        animate={{ x: isDisabled ? 0 : 24 }}
                        className="w-5 h-5 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* DIAGNOSTIK IPSATIVE EINSTELLUNGEN */}
        <section id="settings-learning" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-3 px-2">
            <Sliders size={18} className="text-slate-400" />
            <h3 className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400">Diagnostik: Lernentwicklung</h3>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-stone-200/60 shadow-xl shadow-slate-900/[0.02] p-8 space-y-6">
            <div>
              <h4 className="text-[1rem] leading-normal font-black text-slate-900 tracking-tight">Gewichtung Fortschritt (ipsativ)</h4>
              <p className="text-[0.75rem] text-slate-500 font-medium leading-relaxed max-w-2xl mt-1">
                Bestimme, wie stark der relative Lernfortschritt im Vergleich zum absoluten Notendurchschnitt bei der ipsativen Auswertung ins Gewicht fällt.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between text-[0.75rem] font-black text-slate-700">
                <span>Notendurchschnitt (absolut): {100 - (app.ipsativeGewichtung ?? 70)}%</span>
                <span className="text-indigo-600">Lernfortschritt (individuell): {app.ipsativeGewichtung ?? 70}%</span>
              </div>
              <input
                type="range"
                aria-label="Gewichtung des individuellen Lernfortschritts in Prozent"
                min="30"
                max="90"
                step="5"
                value={app.ipsativeGewichtung ?? 70}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setApp(prev => ({ ...prev, ipsativeGewichtung: val }));
                }}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[0.5625rem] font-bold text-slate-400 uppercase tracking-wider px-1">
                <span>Konservativ (30%)</span>
                <span>Ausgeglichen (60%)</span>
                <span>Fortschrittsfokus (90%)</span>
              </div>
            </div>
          </div>
        </section>
      </div>

        {/* RECHTS: Design, Fach-Konfig, Schuljahr */}
        <div className="space-y-8">
          {/* Core Design & Styling Controls */}
          <section id="settings-design" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-3 px-2">
            <Palette size={18} className="text-slate-400" />
            <h3 className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400">Design & Theme-Einstellungen</h3>
          </div>
          
          <div className="bg-white rounded-[2.5rem] border border-stone-200/60 shadow-xl shadow-slate-900/[0.02] p-8 space-y-8">
            {/* Split layout for Theme Dropdown and Custom Colorpickers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Dropdowns are aligned perfectly bündig with descriptions */}
              <div className="space-y-4 md:col-span-2">
                <div className="flex flex-col gap-1 px-1">
                  <label className="text-[0.6875rem] font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Layout size={14} className="text-accent" />
                    Farbschema
                  </label>
                  <p className="text-[0.6875rem] text-slate-400 font-medium leading-normal">
                    Wähle ein speziell designtes Theme mit perfekt abgestimmter Typografie und Farbpalette.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: 'classic_light', name: 'Klassisch Hell', font: 'Inter', colors: 'bg-white border-slate-200 text-slate-800' },
                    { id: 'ocean_breeze', name: 'Ozean', font: 'Lexend', colors: 'bg-[#f4f8fc] border-[#a1bede] text-[#1e3a63]' },
                    { id: 'deep_dark', name: 'Dark Mode', font: 'Outfit', colors: 'bg-[#09090b] border-[#3f3f46] text-zinc-300' },
                    { id: 'soft_sage', name: 'Natur Salbei', font: 'Quicksand', colors: 'bg-[#f1f4f1] border-[#b4c9b4] text-[#2d452d]' },
                    { id: 'warm_sand', name: 'Dünensand', font: 'Source Serif', colors: 'bg-[#fdfaf6] border-[#e0c29f] text-[#5c4125]' },
                    { id: 'lavender_field', name: 'Lavendel', font: 'DM Sans', colors: 'bg-[#f8f6fc] border-[#c5b3eb] text-[#3a2670]' },
                    { id: 'cozy_mint', name: 'Cozy Mint', font: 'Lexend', colors: 'bg-[#f2fcf7] border-[#92d6b7] text-[#064e43]' },
                    { id: 'sakura_dream', name: 'Kirschblüte', font: 'Outfit', colors: 'bg-[#fff5f8] border-[#faa2b8] text-[#85062c]' },
                    { id: 'custom_theme', name: 'Eigenes Theme', font: 'Manuell', colors: 'bg-slate-50 border-dashed border-slate-300 text-slate-600' },
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={app.theme === t.id}
                      onClick={() => setApp(prev => ({ ...prev, theme: t.id as any }))}
                      className={`relative flex flex-col items-start p-3 rounded-2xl border transition-all active:scale-95 ${t.colors} ${app.theme === t.id ? 'ring-2 ring-emerald-500 ring-offset-2 ' : 'hover:scale-[1.02] opacity-80 hover:opacity-100 shadow-sm'}`}
                    >
                      <div className="font-bold text-[0.75rem] leading-tight tracking-tight">{t.name}</div>
                      <div className="text-[0.5625rem] font-medium opacity-60 mt-0.5">{t.font}</div>
                      {app.theme === t.id && (
                        <div className="absolute top-2 right-2 w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-md">
                          <Check size={10} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Choice Dropdown bündig aligned */}
              <div className="space-y-4">
                <div className="flex flex-col gap-1 px-1">
                  <label className="text-[0.6875rem] font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Type size={14} className="text-accent" />
                    System-Schriftart (Websafe)
                  </label>
                  <p className="text-[0.6875rem] text-slate-400 font-medium leading-normal">
                    Schriftfamilie für optimale Tafel-Lesbarkeit oder technische Code-Übersichten anpassen.
                  </p>
                </div>

                <select
                  aria-label="System-Schriftart"
                  value={app?.settings?.fontFamily || 'standard'}
                  onChange={(e) => setApp(prev => ({ ...prev, settings: { ...prev.settings, fontFamily: e.target.value as any } }))}
                  className="w-full h-12 px-4 rounded-2xl border border-stone-200 bg-white text-[0.75rem] leading-tight font-black text-slate-800 outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all cursor-pointer shadow-sm appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='6' fill='none' viewBox='0 0 12 6'><path stroke='%23475569' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m1 1 5 4 5-4'/></svg>")`, backgroundPosition: 'right 16px center', backgroundRepeat: 'no-repeat' }}
                >
                  {FONTS.map(f => (
                    <option key={f.id} value={f.id}>{f.label} ({f.description})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Theme Color Picker Subsection (Stretched smoothly) */}
            <AnimatePresence>
              {app.theme === 'custom_theme' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className=" border-t border-stone-100 pt-6"
                >
                  {(() => {
                    const getLuminanceVal = (hex: string) => {
                      const cleanHex = hex.replace('#', '');
                      if (cleanHex.length !== 6) return 0.5;
                      const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
                      const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
                      const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
                      const a = [r, g, b].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
                      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
                    };

                    const getContrastVal = (bgCol: string, fgCol: string) => {
                      const l1 = getLuminanceVal(bgCol);
                      const l2 = getLuminanceVal(fgCol);
                      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
                    };

                    const contrastValue = getContrastVal(customBg, customText);
                    const isBgLight = getLuminanceVal(customBg) > 0.5;

                    let contrastClass = 'bg-rose-500/10 text-rose-500 border border-rose-500/30';
                    let contrastLabel = 'Kritisch schlecht! ❌';
                    let contrastAdvice = 'Viel zu geringer Kontrast. Deine Schüler werden diesen Text nicht an der Tafel lesen können! Bitte ändere die Textfarbe (z. B. auf reines Schwarz oder Weiß) oder nutze unten die automatische Kontrastoptimierung.';

                    if (contrastValue >= 7.0) {
                      contrastClass = 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30';
                      contrastLabel = 'Hervorragend 🌟';
                      contrastAdvice = 'Perfektes Kontrastverhältnis. Der Text ist gestochen scharf und für alle Schüler (auch aus der Ferne oder am Smartboard) exzellent lesbar. (WCAG AAA bestanden)';
                    } else if (contrastValue >= 4.5) {
                      contrastClass = 'bg-teal-500/10 text-teal-400 border border-teal-500/30';
                      contrastLabel = 'Gut & Barrierefrei ✅';
                      contrastAdvice = 'Gutes Kontrastverhältnis. Sehr gut lesbar auf den meisten Bildschirmen. Erfüllt die offiziellen Richtlinien für digitale Barrierefreiheit. (WCAG AA bestanden)';
                    } else if (contrastValue >= 3.0) {
                      contrastClass = 'bg-amber-500/10 text-amber-500 border border-amber-500/30';
                      contrastLabel = 'Eingeschränkt ⚠️';
                      contrastAdvice = 'Ausreichend für große Überschriften, reicht aber für kleineren Text an der Tafel nicht aus. Erhöhe den Kontrast für eine bessere Lesbarkeit im Klassenzimmer.';
                    }

                    const handleAutoOptimize = () => {
                      setApp(prev => ({
                        ...prev,
                        customTextColor: isBgLight ? '#121212' : '#f8fafc',
                        customText2Color: isBgLight ? '#4b5563' : '#cbd5e1'
                      }));
                    };

                    const applyDarkPreset = () => {
                      setApp(prev => ({
                        ...prev,
                        customBgColor: '#0f172a',
                        customTextColor: '#f8fafc',
                        customText2Color: '#cbd5e1',
                        customAccentColor: '#10b981'
                      }));
                    };

                    const applyLightPreset = () => {
                      setApp(prev => ({
                        ...prev,
                        customBgColor: '#f8fafc',
                        customTextColor: '#121212',
                        customText2Color: '#4b5563',
                        customAccentColor: '#10b981'
                      }));
                    };

                    return (
                      <div className="space-y-6">
                        <div className="flex flex-col gap-1.5 mb-2 px-1">
                          <h4 className="text-[0.6875rem] font-black uppercase tracking-wider text-amber-700 font-sans">Custom-Theme Farben anpassen</h4>
                          <p className="text-[0.6875rem] text-slate-400 font-medium font-sans">Bestimme die Farben komplett selbst. Zur Vorbeugung von Lesbarkeitsproblemen überwacht unser Kontrast-Rechner deine Farbwahl live.</p>
                        </div>

                        {/* Color Pickers Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-sans">
                          {/* Hintergrund-Farbe */}
                          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-stone-200/40">
                            <input 
                              type="color" 
                              value={customBg}
                              onChange={(e) => setApp(prev => ({ ...prev, customBgColor: e.target.value }))}
                              className="w-10 h-10 rounded-xl cursor-pointer border border-stone-200 p-0  shrink-0"
                            />
                            <div className="flex-1 space-y-0.5 min-w-0">
                              <label className="text-[0.5rem] font-black uppercase tracking-widest text-slate-500 block leading-none">Hintergrund</label>
                              <input 
                                type="text" 
                                value={customBg}
                                onChange={(e) => setApp(prev => ({ ...prev, customBgColor: e.target.value }))}
                                className="w-full text-[0.75rem] leading-tight font-mono font-black text-slate-700 bg-transparent uppercase border-none focus:ring-0 p-0"
                              />
                            </div>
                          </div>

                          {/* Haupttext-Farbe */}
                          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-stone-200/40">
                            <input 
                              type="color" 
                              value={customText}
                              onChange={(e) => setApp(prev => ({ ...prev, customTextColor: e.target.value }))}
                              className="w-10 h-10 rounded-xl cursor-pointer border border-stone-200 p-0  shrink-0"
                            />
                            <div className="flex-1 space-y-0.5 min-w-0">
                              <label className="text-[0.5rem] font-black uppercase tracking-widest text-slate-500 block leading-none">Haupttext (Schrift)</label>
                              <input 
                                type="text" 
                                value={customText}
                                onChange={(e) => setApp(prev => ({ ...prev, customTextColor: e.target.value }))}
                                className="w-full text-[0.75rem] leading-tight font-mono font-black text-slate-700 bg-transparent uppercase border-none focus:ring-0 p-0"
                              />
                            </div>
                          </div>

                          {/* Infotext-Farbe (Sekundär) */}
                          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-stone-200/40">
                            <input 
                              type="color" 
                              value={customText2}
                              onChange={(e) => setApp(prev => ({ ...prev, customText2Color: e.target.value }))}
                              className="w-10 h-10 rounded-xl cursor-pointer border border-stone-200 p-0  shrink-0"
                            />
                            <div className="flex-1 space-y-0.5 min-w-0">
                              <label className="text-[0.5rem] font-black uppercase tracking-widest text-slate-500 block leading-none">Infotext (Sekundär)</label>
                              <input 
                                type="text" 
                                value={customText2}
                                onChange={(e) => setApp(prev => ({ ...prev, customText2Color: e.target.value }))}
                                className="w-full text-[0.75rem] leading-tight font-mono font-black text-slate-700 bg-transparent uppercase border-none focus:ring-0 p-0"
                              />
                            </div>
                          </div>

                          {/* Akzent-Farbe */}
                          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-stone-200/40">
                            <input 
                              type="color" 
                              value={customAccent}
                              onChange={(e) => setApp(prev => ({ ...prev, customAccentColor: e.target.value }))}
                              className="w-10 h-10 rounded-xl cursor-pointer border border-stone-200 p-0  shrink-0"
                            />
                            <div className="flex-1 space-y-0.5 min-w-0">
                              <label className="text-[0.5rem] font-black uppercase tracking-widest text-slate-500 block leading-none">Akzent-Farbe</label>
                              <input 
                                type="text" 
                                value={customAccent}
                                onChange={(e) => setApp(prev => ({ ...prev, customAccentColor: e.target.value }))}
                                className="w-full text-[0.75rem] leading-tight font-mono font-black text-slate-700 bg-transparent uppercase border-none focus:ring-0 p-0"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Legibilitäts-Barometer & Contrast Indicator */}
                        <div className="p-4 rounded-2xl bg-white border border-stone-200/50 space-y-3 font-sans">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-[0.625rem] font-black uppercase tracking-wider text-slate-500">Live-Lesbarkeitsprüfung (Kontrastverhältnis)</span>
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.75rem] leading-tight font-black ${contrastClass}`}>
                              <span>Kontrast: {contrastValue.toFixed(1)}:1</span>
                              <span className="opacity-80">•</span>
                              <span>{contrastLabel}</span>
                            </div>
                          </div>
                          <p className="text-[0.6875rem] text-slate-500 leading-relaxed font-semibold">
                            {contrastAdvice}
                          </p>
                        </div>

                        {/* Quick-Preset Actions */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 font-sans">
                          <button
                            type="button"
                            onClick={handleAutoOptimize}
                            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 border border-amber-600/30 text-white text-[0.6875rem] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                          >
                            <Sliders size={12} />
                            Schriftfarbe automatisch optimieren
                          </button>

                          <button
                            type="button"
                            onClick={applyDarkPreset}
                            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 border border-slate-700/60 text-slate-200 text-[0.6875rem] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                          >
                            <Palette size={12} className="text-indigo-400" />
                            Dunkles Kontrast-Preset
                          </button>

                          <button
                            type="button"
                            onClick={applyLightPreset}
                            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-stone-200 text-slate-700 text-[0.6875rem] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                          >
                            <Palette size={12} className="text-amber-500" />
                            Helles Kontrast-Preset
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Display Modus / Zoom settings row */}
            <div className="space-y-4 pt-6 border-t border-stone-150">
              <div className="flex flex-col gap-1">
                <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 px-1">Anzeige-Modus</label>
                <p className="text-[0.75rem] text-slate-500 font-medium px-1">Passe die Skalierung der Benutzeroberfläche für Laptops oder Smartboards an.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'compact', label: 'Kompakt', desc: '14px • Laptop (Admin)', icon: Smartphone },
                  { id: 'standard', label: 'Standard', desc: '16px • Desktop (Normal)', icon: Monitor },
                  { id: 'large', label: 'Groß', desc: '20px • Smartboard', icon: Type }
                ].map(mode => {
                  const Icon = mode.icon;
                  const isActive = (app.settings.zoomLevel || 'standard') === mode.id;
                  
                  return (
                    <button
                      key={mode.id}
                      onClick={() => setApp(prev => ({ 
                        ...prev, 
                        settings: { ...prev.settings, zoomLevel: mode.id as any } 
                      }))}
                      className={`flex flex-col items-center gap-4 p-5 rounded-3xl border-2 transition-all text-center group cursor-pointer ${isActive ? 'border-accent bg-accent/5 ring-4 ring-accent/5' : 'border-slate-50 bg-slate-50/50 hover:border-slate-100 hover:bg-slate-50'}`}
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isActive ? 'bg-accent text-white shadow-lg' : 'bg-white text-slate-400 shadow-sm'}`}>
                        <Icon size={20} />
                      </div>
                      <div className="space-y-0.5">
                        <div className={`text-[0.75rem] font-black uppercase tracking-widest transition-colors ${isActive ? 'text-accent' : 'text-slate-900'}`}>{mode.label}</div>
                        <div className="text-[0.5625rem] font-bold text-slate-400 uppercase tracking-tighter">{mode.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Whiteboard / Smartboard Settings */}
            <div className="space-y-4 pt-6 border-t border-stone-150">
              <div className="flex flex-col gap-1">
                <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 px-1">Smartboard & Whiteboard Optimiereungen</label>
                <p className="text-[0.75rem] text-slate-500 font-medium px-1">Wichtige Werkzeuge für das interaktive Arbeiten im Unterrichts-Modus.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="p-4 bg-slate-50 rounded-2xl border border-stone-200/40 space-y-3">
                   <div className="text-[0.6875rem] font-black uppercase tracking-wider text-slate-700">Laserpointer-Funktion</div>
                   <p className="text-[0.625rem] text-slate-500 font-medium">Zeichnet rote Linien, die nach 2 Sekunden automatisch verblassen (Sichtbarkeit am Smartboard).</p>
                   <button 
                     onClick={() => setApp(prev => ({ ...prev, settings: { ...prev.settings, enableWhiteboardLaser: !prev.settings.enableWhiteboardLaser } }))}
                     className={`w-full py-2.5 rounded-xl transition-all cursor-pointer text-[0.75rem] leading-tight font-black uppercase tracking-wider ${app.settings.enableWhiteboardLaser ? 'bg-rose-500 text-white shadow-md' : 'bg-white border text-slate-500'}`}
                   >
                     {app.settings.enableWhiteboardLaser ? 'Aktiviert' : 'Aktivieren'}
                   </button>
                 </div>

                 <div className="p-4 bg-slate-50 rounded-2xl border border-stone-200/40 space-y-3">
                   <div className="text-[0.6875rem] font-black uppercase tracking-wider text-slate-700">Whiteboard Hintergrund</div>
                   <p className="text-[0.625rem] text-slate-500 font-medium">Standard-Muster (Liniatur, Karo) statt weißer Fläche.</p>
                   <select
                     value={app.settings.whiteboardBackground || 'karo'}
                     onChange={(e) => setApp(prev => ({ ...prev, settings: { ...prev.settings, whiteboardBackground: e.target.value } }))}
                     className="w-full h-10 px-3 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-accent text-[0.875rem] leading-snug font-bold shadow-sm"
                   >
                     <option value="none">Standard Weiß</option>
                     <option value="karo">Karopapier (Mathematik)</option>
                     <option value="liniert_2">Liniatur (2. Klasse)</option>
                     <option value="liniert_3">Liniatur (3. Klasse)</option>
                     <option value="liniert_4">Liniatur (4. Klasse)</option>
                     <option value="noten">Notenlinien (Musik)</option>
                     <option value="haeuschen">Häuschen (Schulstart)</option>
                     <option value="punktraster">Punktraster (Dot Grid)</option>
                     <option value="koordinaten">Koordinatensystem</option>
                     <option value="isometrisch">Isometrisch (3D)</option>
                     <option value="waben">Waben / Chemie</option>
                     <option value="ttabelle">2-Spalten T-Tabelle</option>
                     <option value="drespalten">3-Spalten Tabelle</option>
                   </select>
                 </div>
              </div>
            </div>

            {/* Visibility switches and defaults */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-stone-150">
              <div className="space-y-3">
                <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 px-1">Schutz & Sichtbarkeit</label>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-stone-200/40">
                  <span className="text-[0.75rem] font-bold text-slate-700">Verhalten auf dem Board zeigen</span>
                  <button 
                    onClick={() => setApp(prev => ({ ...prev, settings: { ...prev.settings, showVerhaltenOnBoard: !prev.settings.showVerhaltenOnBoard } }))}
                    className={`w-12 h-6 rounded-full transition-all relative flex items-center px-1 cursor-pointer shrink-0 ${app.settings.showVerhaltenOnBoard ? 'bg-accent shadow-md' : 'bg-slate-350'}`}
                  >
                    <motion.div 
                      animate={{ x: app.settings.showVerhaltenOnBoard ? 24 : 0 }}
                      className="w-4 h-4 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 px-1">Klassenglas Einstellungen</label>
                <div className="flex gap-4">
                  <div className="flex flex-col gap-1.5 flex-1">
                    <span className="text-[0.6875rem] font-bold text-slate-500">Ziel (Maximalwert)</span>
                    <input 
                      type="number" 
                      min={1}
                      className="h-11 px-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:border-accent focus:bg-white transition-all w-full" 
                      value={app.klassenglas_ziel || 100} 
                      onChange={(e) => setApp(prev => ({ ...prev, klassenglas_ziel: Math.max(1, parseInt(e.target.value) || 100) }))} 
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 w-32">
                    <span className="text-[0.6875rem] font-bold text-slate-500">Eigenes Symbol</span>
                    <input 
                      type="text" 
                      className="h-11 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:border-accent focus:bg-white transition-all text-center text-[1.25rem] leading-normal w-full" 
                      value={app.settings?.klassenglasIcon ?? "💎"} 
                      placeholder="💎"
                      onChange={(e) => setApp(prev => ({ ...prev, settings: { ...prev.settings, klassenglasIcon: e.target.value } }))} 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Fach-Konfiguration Section */}
        <section id="settings-subjects" className="space-y-4 scroll-mt-20">
          <div className="flex items-center justify-between gap-3 px-2">
            <div className="flex items-center gap-3">
            <BookOpen size={18} className="text-slate-400" />
            <h3 className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400">Fach-Konfiguration & Farben</h3>
            </div>
            <button
              type="button"
              aria-expanded={showSubjectColors}
              onClick={() => setShowSubjectColors(value => !value)}
              className="flex items-center gap-2 px-3 h-9 rounded-xl bg-white border border-stone-200 text-slate-700 text-[0.6875rem] font-black hover:border-accent hover:text-accent transition-colors cursor-pointer"
            >
              {showSubjectColors ? 'Farben schließen' : 'Farben bearbeiten'}
              {showSubjectColors ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
          
          {showSubjectColors ? (
          <div className="bg-white rounded-3xl border border-stone-200/60 shadow-sm p-6 space-y-6">
            <div className="flex flex-col gap-1">
              <label className="text-[0.875rem] font-black text-slate-900">Fach-Farben anpassen</label>
              <p className="text-[0.75rem] text-slate-500 font-medium">Wähle die Farben für deine Fächer. Diese werden im Wochenplan, Jahresplan und im Kompetenzraster verwendet.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(app.faecher || FAECHER_ALLE).map(f => {
                const config = (app.fachConfig || {})[f] || { color: 'slate' };
                const colorOption = COLOR_OPTIONS.find(c => c.id === config.color) || COLOR_OPTIONS.find(c => c.id === 'slate') || COLOR_OPTIONS[0];
                
                return (
                  <div key={f} className="flex flex-col gap-2 p-4 bg-slate-50 rounded-2xl border border-stone-200/40">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${colorOption.bg} shadow-sm`} />
                      <span className="text-[0.75rem] font-black text-slate-700 text-wrap leading-tight break-words">{f}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {COLOR_OPTIONS.map(c => (
                        <button
                          key={c.id}
                          onClick={() => setApp(prev => ({
                            ...prev,
                            fachConfig: {
                              ...(prev.fachConfig || {}),
                              [f]: { 
                                color: c.id, 
                                scaleColor: (c.id === 'red' || c.id === 'amber' || c.id === 'rose') ? 'red' : (c.id === 'emerald' || c.id === 'teal') ? 'emerald' : 'blue' 
                              }
                            }
                          }))}
                          className={`w-5 h-5 rounded-full ${c.bg} border-2 transition-all ${config.color === c.id ? 'border-amber-600 scale-110 shadow-md ring-2 ring-amber-600/20' : 'border-white hover:scale-110'}`}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSubjectColors(true)}
              className="w-full bg-white rounded-3xl border border-stone-200/60 shadow-sm p-5 flex items-center justify-between gap-4 text-left hover:border-accent/40 transition-colors cursor-pointer"
            >
              <div>
                <p className="text-[0.875rem] font-black text-slate-900">{(app.faecher || FAECHER_ALLE).length} Fächer konfiguriert</p>
                <p className="text-[0.75rem] text-slate-500 font-medium mt-1">Farben werden in Wochenplan, Jahresplanung und Kompetenzrastern verwendet.</p>
              </div>
              <Palette size={20} className="text-accent shrink-0" />
            </button>
          )}
        </section>

        {/* Smartboard-Kopplung & Fernbedienung (Multi-Device Sync) */}
        <section id="settings-board" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-3 px-2">
            <Smartphone size={18} className="text-slate-400" />
            <h3 className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400">Smartboard & Fernbedienung</h3>
          </div>
          
          <div className="bg-white rounded-[2.5rem] border border-stone-200/60 shadow-xl shadow-slate-900/[0.02] ">
            <div className="p-8 space-y-6">
              <div className="max-w-xl space-y-2">
                <h4 className="text-[0.875rem] font-black text-slate-900">Geräte-Synchronisierung (Live-Fernbedienung)</h4>
                <p className="text-[0.75rem] text-slate-500 font-medium leading-relaxed">
                  Steuere dein LEHRERCOCKPIT wireless von deinem Smartphone oder Tablet aus, während auf dem Smartboard/Laptop ein datenschutzfreundliches, ablenkungsfreies Anwesenheits-Raster oder Board angezeigt wird.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Option A: Verbindung herstellen oder trennen */}
                <div className="bg-slate-50/80 p-6 rounded-3xl border border-stone-150 flex flex-col justify-between gap-4">
                  <div className="space-y-1.5">
                    <h5 className="text-[0.75rem] font-black text-slate-800 uppercase tracking-wider font-sans">Option A: Dieses Gerät als Smartboard freigeben</h5>
                    <p className="text-[0.625rem] text-slate-400 font-medium leading-normal">
                      Erzeugt eine temporäre, sichere Sitzung auf unserem Server, die du über einen QR-Code auf deinem Handy als Fernbedienung laden kannst.
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {app.boardSettings?.activeSyncCode ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-indigo-50 border border-indigo-100/50 rounded-2xl flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="text-[0.5625rem] text-indigo-500 font-bold uppercase tracking-wider">Aktive Sitzung</span>
                            <div className="font-mono text-[1.125rem] leading-normal font-black text-indigo-950 tracking-widest">{app.boardSettings.activeSyncCode}</div>
                          </div>
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[0.5rem] font-black uppercase rounded-md">Host aktiv</span>
                        </div>
                        
                        <button
                          onClick={() => setApp(p => ({
                            ...p,
                            boardSettings: {
                              ...p.boardSettings,
                              activeSyncCode: undefined,
                              isRemoteController: undefined
                            }
                          }))}
                          className="w-full h-11 bg-rose-500 text-white hover:bg-rose-600 transition-all rounded-xl font-black text-[0.5625rem] uppercase tracking-wider cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          Sitzung beenden
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/sync/create', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ state: app })
                            });
                            const data = await res.json();
                            if (data && data.code) {
                              setApp(p => ({
                                ...p,
                                boardSettings: {
                                  ...p.boardSettings,
                                  activeSyncCode: data.code,
                                  isRemoteController: false
                                }
                              }));
                            }
                          } catch (e) {
                            console.error("Failed to start sync session:", e);
                          }
                        }}
                        className="w-full h-11 bg-indigo-600 text-white hover:bg-indigo-700 transition-all rounded-xl font-black text-[0.5625rem] uppercase tracking-wider cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/15"
                      >
                        Kopplung aktivieren
                      </button>
                    )}
                  </div>
                </div>

                {/* Option B: Mit Smartboard-Sitzung verbinden */}
                <div className="bg-slate-50/80 p-6 rounded-3xl border border-stone-150 flex flex-col justify-between gap-4 relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-slate-900/[0.02]">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Smartphone size={16} className="text-indigo-600 animate-pulse" />
                      <h5 className="text-[0.75rem] font-black text-slate-800 uppercase tracking-wider font-sans">Option B: Als Fernbedienung mit Smartboard koppeln</h5>
                    </div>
                    <p className="text-[0.625rem] text-slate-400 font-medium leading-normal">
                      Gib hier den 6-stelligen Code ein, welcher am Smartboard-Bildschirm angezeigt wird, um dieses Gerät als Fernbedienung zu verwenden.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {app.boardSettings?.isRemoteController && app.boardSettings?.activeSyncCode ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-emerald-50 border border-emerald-100/50 rounded-2xl flex items-center justify-between shadow-sm">
                          <div className="space-y-0.5">
                            <span className="text-[0.5625rem] text-emerald-600 font-bold uppercase tracking-wider flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                              Kopplung aktiv
                            </span>
                            <div className="text-emerald-950 text-[0.6875rem] font-black uppercase">Fernbedienung aktiv</div>
                          </div>
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[0.625rem] font-mono font-black uppercase rounded-lg border border-emerald-200/50 shadow-inner">
                            {app.boardSettings.activeSyncCode}
                          </span>
                        </div>
                        
                        <button
                          onClick={() => {
                            setSyncCode('');
                            setSyncErrorMsg(null);
                            setApp(p => ({
                              ...p,
                              boardSettings: {
                                ...p.boardSettings,
                                activeSyncCode: undefined,
                                isRemoteController: undefined
                              }
                            }));
                            showToast("Fernbedienung erfolgreich entkoppelt.", "success");
                          }}
                          className="w-full h-11 bg-rose-500 text-white hover:bg-rose-600 active:translate-y-[1px] transition-all rounded-xl font-black text-[0.5625rem] uppercase tracking-wider cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-rose-500/10"
                        >
                          <X size={12} />
                          Fernbedienung trennen
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              id="sync-code-input"
                              type="text"
                              value={syncCode}
                              onChange={(e) => {
                                const val = e.target.value.trim().toUpperCase();
                                setSyncCode(val);
                                if (syncErrorMsg) setSyncErrorMsg(null);
                              }}
                              placeholder="Z.B. X8J9P1"
                              maxLength={6}
                              disabled={isSyncConnecting}
                              className={`w-full bg-white border rounded-xl px-3 py-2 text-center text-[0.75rem] font-mono font-bold uppercase tracking-widest outline-none transition-all duration-200 ${
                                syncErrorMsg 
                                  ? 'border-rose-400 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 bg-rose-50/10' 
                                  : 'border-stone-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500'
                              }`}
                            />
                            {syncCode.length > 0 && (
                              <button 
                                onClick={() => setSyncCode('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-350 hover:text-slate-500 rounded-full"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                          <button
                            disabled={isSyncConnecting || syncCode.trim().length !== 6}
                            onClick={async () => {
                              const code = syncCode.trim().toUpperCase();
                              if (code.length !== 6) return;
                              setIsSyncConnecting(true);
                              setSyncErrorMsg(null);
                              
                              try {
                                const res = await fetch(`/api/sync/${code}`);
                                if (!res.ok) throw new Error("Code invalid");
                                const data = await res.json();
                                if (data && data.state) {
                                  setApp({
                                    ...data.state,
                                    boardSettings: {
                                      ...data.state.boardSettings,
                                      activeSyncCode: code,
                                      isRemoteController: true
                                    }
                                  });
                                  showToast("Erfolgreich als Fernbedienung mit Smartboard gekoppelt!", "success");
                                } else {
                                  throw new Error("Daten unvollständig");
                                }
                              } catch (e) {
                                setSyncErrorMsg("Code ungültig oder abgelaufen");
                                showToast("Kopplung fehlgeschlagen. Bitte Code prüfen.", "error");
                              } finally {
                                setIsSyncConnecting(false);
                              }
                            }}
                            className={`px-5 h-11 rounded-xl font-black text-[0.5625rem] uppercase tracking-wider cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 transition-all shrink-0 ${
                              syncCode.trim().length === 6 && !isSyncConnecting
                                ? 'bg-slate-900 text-white hover:bg-black shadow-md shadow-slate-900/10'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {isSyncConnecting ? (
                              <>
                                <RefreshCw size={12} className="animate-spin" />
                                Koppele...
                              </>
                            ) : (
                              <>
                                <Check size={12} />
                                Verbinden
                              </>
                            )}
                          </button>
                        </div>

                        <AnimatePresence>
                          {syncErrorMsg && (
                            <motion.div
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-700 text-[0.625rem] font-bold leading-none shadow-sm shadow-rose-500/5"
                            >
                              <AlertTriangle size={12} className="text-rose-500 shrink-0 animate-bounce" />
                              <span>{syncErrorMsg}. Bitte überprüfe die Eingabe.</span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Datenschutz (Pseudonymisierung) */}
        <section id="settings-security" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-3 px-2">
            <Shield size={18} className="text-slate-400" />
            <h3 className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400">Datenschutz</h3>
          </div>
          
          <div className="bg-white rounded-[2.5rem] border border-stone-200/60 shadow-xl shadow-slate-900/[0.02] ">
            <div className="p-8 space-y-8">
              <div className="flex items-center justify-between gap-8">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[0.875rem] font-black text-slate-900">Pseudonymisierung aktiv</h4>
                    {app.pseudonymisierungAktiv !== false ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[0.5rem] font-black uppercase rounded-md">Aktiv</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-[0.5rem] font-black uppercase rounded-md">Inaktiv</span>
                    )}
                  </div>
                  <p className="text-[0.75rem] text-slate-500 font-medium leading-relaxed max-w-xl pr-8">
                    Soweit die jeweilige KI-Funktion die zentrale Pseudonymisierung verwendet, werden bekannte Schülernamen vor dem Senden durch Platzhalter ersetzt. Freitexte können dennoch identifizierende Angaben enthalten und müssen vor dem Absenden geprüft werden.
                    {app.pseudonymisierungAktiv === false && (
                      <span className="block mt-2 text-rose-500 font-bold">
                        Nicht empfohlen: Schülernamen würden an die KI übertragen.
                      </span>
                    )}
                  </p>
                </div>
                
                <button 
                  type="button"
                  role="switch"
                  aria-checked={app.pseudonymisierungAktiv !== false}
                  aria-label="Pseudonymisierung für KI-Anfragen"
                  onClick={() => setApp(prev => ({ ...prev, pseudonymisierungAktiv: prev.pseudonymisierungAktiv === false ? true : false }))}
                  className={`relative w-14 h-7 rounded-full transition-all duration-300 flex items-center px-1 cursor-pointer shrink-0 ${app.pseudonymisierungAktiv === false ? 'bg-slate-200' : 'bg-emerald-500 shadow-md shadow-emerald-500/15'}`}
                >
                  <motion.div 
                    animate={{ x: app.pseudonymisierungAktiv === false ? 0 : 28 }}
                    className="w-5 h-5 bg-white rounded-full shadow-sm"
                  />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Datensicherung & Privatsphäre Card */}
        <section id="settings-administration" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-3 px-2">
            <Sliders size={18} className="text-slate-400" />
            <h3 className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400">Administration & Sicherheit</h3>
          </div>
          
          <div className="bg-white rounded-[2.5rem] border border-stone-200/60 shadow-xl shadow-slate-900/[0.02] ">
            <div className="p-8 space-y-8">
              <div className="flex items-center justify-between gap-8">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[0.875rem] font-black text-slate-900">Backup-Erinnerungen</h4>
                    {!app.settings.disableBackupReminders ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[0.5rem] font-black uppercase rounded-md">Aktiv</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[0.5rem] font-black uppercase rounded-md">Inaktiv</span>
                    )}
                  </div>
                  <p className="text-[0.75rem] text-slate-500 font-medium leading-relaxed max-w-md">
                    Die App erinnert Sie alle sieben Tage an den Export Ihrer Daten.
                  </p>
                </div>
                
                <button 
                  type="button"
                  role="switch"
                  aria-checked={!app.settings.disableBackupReminders}
                  aria-label="Backup-Erinnerungen"
                  onClick={toggleBackupReminders}
                  className={`relative w-14 h-7 rounded-full transition-all duration-300 flex items-center px-1 cursor-pointer shrink-0 ${app.settings.disableBackupReminders ? 'bg-slate-200' : 'bg-emerald-500 shadow-md shadow-emerald-500/15'}`}
                >
                  <motion.div 
                    animate={{ x: app.settings.disableBackupReminders ? 0 : 28 }}
                    className="w-5 h-5 bg-white rounded-full shadow-sm"
                  />
                </button>
              </div>

              {/* Backup Import / Export */}
              <div className="pt-6 border-t border-stone-150 space-y-4">
                <div className="space-y-1">
                  <h4 className="text-[0.875rem] font-black text-slate-900">Daten sichern & wiederherstellen</h4>
                  <p className="text-[0.75rem] text-slate-500 font-medium leading-relaxed max-w-2xl">
                    Lade den gesamten Zustand der App (inkl. Schülerdaten, Notizen, Stundenbilder, Fächer und Sitzpläne) direkt als JSON-Datei auf dein Gerät herunter. So kannst du deine Fortschritte manuell archivieren oder auf ein anderes Smartphone/Tablett migrieren.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    className="flex-1 px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-[0.6875rem] uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-95"
                  >
                    <Download size={14} />
                    <span>Sicherung exportieren</span>
                  </button>

                  <div className="flex-1 relative">
                    <input
                      id="backup-file-input"
                      type="file"
                      aria-label="JSON-Sicherungsdatei auswählen"
                      accept=".json"
                      onChange={handleImportJSON}
                      className="hidden"
                    />
                    <label
                      htmlFor="backup-file-input"
                      className="w-full h-full px-5 py-3.5 bg-white border-2 border-dashed border-stone-250 hover:border-accent text-slate-700 hover:text-accent rounded-2xl font-black text-[0.6875rem] uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer text-center"
                    >
                      <Upload size={14} />
                      <span>Sicherung einlesen</span>
                    </label>
                  </div>
                </div>

                {/* Notfall-Wiederherstellung */}
                {notfallDate && (
                  <div className="pt-4 border-t border-stone-150 border-dashed mt-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-[0.875rem] font-bold text-slate-900 flex items-center gap-2">
                        <History size={16} className="text-amber-500" /> Letzte Notfallkopie: {notfallDate}
                      </h4>
                      <p className="text-[0.7rem] text-slate-500 mt-1">Automatische Sicherung vom letzten App-Start.</p>
                    </div>
                    <button
                      onClick={handleRestoreNotfall}
                      className="px-4 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 rounded-xl font-bold text-xs uppercase tracking-wide transition-all border border-amber-200"
                    >
                      Wiederherstellen
                    </button>
                  </div>
                )}
              </div>

              {/* App Tour Zurücksetzen */}
              <div className="flex items-center justify-between gap-8 pt-6 border-t border-stone-150">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[0.875rem] font-black text-slate-900">App-Tour erneut starten</h4>
                  </div>
                  <p className="text-[0.75rem] text-slate-500 font-medium leading-relaxed max-w-md">
                    Setzt den Tour-Status zurück, sodass die interaktive Erklärung beim nächsten Wechsel auf das Cockpit erneut startet.
                  </p>
                </div>
                
                <button 
                  onClick={() => {
                    setApp(prev => ({
                      ...prev,
                      tourAbgeschlossen: false,
                      currentPage: 'cockpit'
                    }));
                    alert('Die App-Tour wurde zurückgesetzt und startet beim nächsten Besuch des Cockpits.');
                  }}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white transition-all rounded-xl font-black text-[0.6875rem] uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-500/10 cursor-pointer text-center justify-center shrink-0"
                >
                  <Sparkles size={13} />
                  <span>Tour starten</span>
                </button>
              </div>

              {/* Reset History and Database buttons - Perfectly aligned */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-stone-150">
                <div className="bg-slate-50 p-5 rounded-3xl border border-stone-200/30 flex justify-between items-center gap-4">
                  <div className="space-y-0.5">
                    <h4 className="text-[0.6875rem] font-black text-slate-900">Verlauf leeren</h4>
                    <p className="text-[0.625rem] text-slate-400 font-medium leading-tight">Geleistete Icon-Historie (Fisolen etc.) löschen.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setResetType('history');
                      setDeleteConfirmText('');
                      setDeleteModalOpen(true);
                    }}
                    className="px-4 h-10 bg-white border border-stone-200 text-slate-600 hover:bg-slate-900 hover:text-white transition-all rounded-xl font-black text-[0.5625rem] uppercase tracking-wider flex items-center gap-1.5 shrink-0"
                  >
                    <History size={13} />
                    Leeren
                  </button>
                </div>

                <div className="bg-rose-50/40 p-5 rounded-3xl border border-rose-150 flex justify-between items-center gap-4">
                  <div className="space-y-0.5">
                    <h4 className="text-[0.6875rem] font-black text-rose-950">Daten löschen</h4>
                    <p className="text-[0.625rem] text-rose-700 font-medium leading-tight font-extrabold">App in die Werkseinstellungen versetzen.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setResetType('all');
                      setDeleteConfirmText('');
                      setDeleteModalOpen(true);
                    }}
                    className="px-4 h-10 bg-white border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white transition-all rounded-xl font-black text-[0.5625rem] uppercase tracking-wider flex items-center gap-1.5 shrink-0"
                  >
                    <Trash2 size={13} />
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Verhalten & Icon-Verlauf section */}
        <section id="settings-behavior" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-3 px-2">
            <Shield size={18} className="text-slate-400" />
            <h3 className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400">Verhalten & Icon-Verlauf</h3>
          </div>
          <div className="bg-white rounded-[2.5rem] border border-stone-200/60 shadow-xl shadow-slate-900/[0.02] p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Start Date Settings */}
              <div className="space-y-4">
                <div className="flex flex-col gap-1 px-1">
                  <label className="text-[0.6875rem] font-black uppercase tracking-wider text-slate-900">Verlauf zählen ab</label>
                  <p className="text-[0.6875rem] text-slate-400 font-medium">Definiere, ab wann die gesammelten Symbole in den Statistiken gezählt werden (z.B. Semesterstart).</p>
                </div>
                <div className="relative">
                  <input 
                    type="date" 
                    aria-label="Startdatum für den Verhaltensverlauf"
                    value={app.settings?.behaviorStartDate || ''} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setApp(prev => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          behaviorStartDate: val || undefined
                        }
                      }));
                    }}
                    className="w-full h-12 px-4 rounded-2xl border border-stone-200 bg-white text-[0.875rem] leading-snug font-bold text-slate-800 outline-none focus:ring-2 focus:ring-accent transition-all shadow-sm"
                  />
                  {app.settings?.behaviorStartDate && (
                    <button 
                      type="button"
                      aria-label="Startdatum des Verhaltensverlaufs zurücksetzen"
                      onClick={() => setApp(prev => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          behaviorStartDate: undefined
                        }
                      }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 text-[0.75rem] leading-tight font-bold"
                    >
                      Zurücksetzen
                    </button>
                  )}
                </div>
              </div>

              {/* Reset Individual Statuses Action */}
              <div className="space-y-4">
                <div className="flex flex-col gap-1 px-1">
                  <label className="text-[0.6875rem] font-black uppercase tracking-wider text-slate-900">Schnelles Zurücksetzen</label>
                  <p className="text-[0.6875rem] text-slate-400 font-medium">Setze alle aktuellen Schüler-Ränge auf die Standard-Stufe zurück.</p>
                </div>
                <button 
                  onClick={() => {
                    if (confirm('Möchten Sie alle Schüler:innen auf die Standard-Stufe zurücksetzen?')) {
                      const stages = app.behavior_stages || [
                        { id: '1', label: 'Super', color: '#10b981', icon: '🌟' }
                      ];
                      const defaultStageId = app.behavior_default_stage_id || stages[0]?.id;
                      const newStatusMap: Record<string, string> = {};
                      const now = new Date().toISOString().split('T')[0];
                      const timestamp = Date.now();
                      
                      const newHistoryEntries = app.schueler.map((s: any) => ({
                        id: Math.random().toString(36).substr(2, 9),
                        schuelerId: s.id,
                        datum: now,
                        iconId: defaultStageId,
                        timestamp
                      }));

                      app.schueler.forEach((s: any) => { newStatusMap[s.id] = defaultStageId; });
                      setApp((prev: any) => ({ 
                        ...prev, 
                        behavior_status: newStatusMap, 
                        behavior_notes: {},
                        statusLog: [...newHistoryEntries, ...(prev.statusLog || [])]
                      }));
                      alert('Ränge wurden erfolgreich zurückgesetzt.');
                    }
                  }}
                  className="w-full h-12 bg-slate-50 border border-stone-200 text-slate-700 hover:bg-slate-900 hover:text-white rounded-2xl font-black text-[0.6875rem] uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
                >
                  <History size={14} />
                  Tages-Ränge zurücksetzen
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Schuljahr & Termine section */}
        <section id="settings-calendar" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-3 px-2">
            <Calendar size={18} className="text-slate-400" />
            <h3 className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400">Schuljahr & Termine</h3>
          </div>
          
          <div className="bg-white rounded-[2.5rem] border border-stone-200/60 shadow-xl shadow-slate-900/[0.02] p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-6">
              <div className="flex flex-col gap-1 px-1 max-w-xl">
                <label className="text-[0.6875rem] font-black uppercase tracking-widest text-slate-400">{BUNDESLAND_NAMEN[app.bundesland || 'VBG']}er Schulkalender</label>
                <p className="text-[0.75rem] text-slate-500 font-medium">Deaktiviere Tage, die an deiner Schule unterrichtsbefreit oder autonom belegt sind:</p>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0 w-full md:w-64">
                <label className="text-[0.6875rem] font-black uppercase tracking-widest text-slate-400">Bundesland</label>
                {/* Kommentar: Schulautonome Tage und kurzfristige Änderungen sind nicht abgebildet. */}
                <select 
                  value={app.bundesland || 'VBG'} 
                  onChange={e => {
                    const selected = e.target.value as Bundesland;
                    setApp(prev => ({ ...prev, bundesland: selected }));
                  }} 
                  className="w-full px-4 py-2.5 bg-white border border-stone-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-slate-800 text-[0.875rem] leading-snug font-semibold outline-none transition-all shadow-sm"
                >
                  {Object.entries(BUNDESLAND_NAMEN).map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </select>
                <p className="text-[0.625rem] text-slate-400 font-medium leading-normal mt-0.5">
                  Ohne Gewähr – schulautonome Tage bitte selbst im Jahresplan ergänzen.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {getFerien(app.bundesland || 'VBG', app.schuljahr || '2025/26').map(h => {
                const isDisabled = app.calendarSettings?.disabledHolidays?.includes(h.id);
                return (
                  <button
                    key={h.id}
                    onClick={() => toggleHoliday(h.id)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${isDisabled ? 'bg-slate-50 border-slate-100 opacity-50' : 'bg-white border-stone-200 shadow-sm hover:border-accent'}`}
                  >
                    <div className="flex flex-col items-start gap-0.5 text-left">
                      <span className={`text-[0.75rem] font-black tracking-tight ${isDisabled ? 'text-slate-400 line-through font-bold' : 'text-slate-900'}`}>{h.name}</span>
                      {h.month !== undefined && h.day !== undefined && (
                        <span className="text-[0.5625rem] font-bold text-slate-400 uppercase tracking-tighter">
                          {new Date(h.year || 2026, h.month, h.day).toLocaleDateString('de-AT', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </div>
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all shrink-0 ${isDisabled ? 'bg-slate-200 text-slate-400' : 'bg-emerald-500 text-white'}`}>
                      {isDisabled ? <X size={11} strokeWidth={3} /> : <Check size={11} strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Speicher & Systemstatus section */}
        <section id="settings-system" className="space-y-4 scroll-mt-20">
          <div className="flex items-center gap-3 px-2">
            <Database size={18} className="text-slate-400" />
            <h3 className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400">Speicher & Systemstatus</h3>
          </div>
          
          <div className="bg-white rounded-[2.5rem] border border-stone-200/60 shadow-xl shadow-slate-900/[0.02] p-8 space-y-8">
            {/* Storage Display */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-[0.875rem] font-black text-slate-900 flex items-center gap-2">
                    <Database size={14} className="text-accent" />
                    Speicherbelegung
                  </h4>
                  <p className="text-[0.75rem] text-slate-500 font-medium">Browser-Schnellspeicher (localStorage)</p>
                </div>
                {speicherInfo && (
                  <button 
                    onClick={refreshSpeicher}
                    className="p-2 text-slate-400 hover:text-accent transition-colors cursor-pointer"
                    title="Aktualisieren"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
              </div>

              {speicherInfo && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[0.6875rem] font-black uppercase tracking-wider mb-1">
                    <span className="text-slate-500">Belegung</span>
                    <span className={speicherInfo.localStorageBytes > 4.25 * 1024 * 1024 ? 'text-rose-500' : 'text-slate-900'}>
                      {(speicherInfo.localStorageBytes / (1024 * 1024)).toFixed(1)} MB / 5.0 MB
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (speicherInfo.localStorageBytes / (5 * 1024 * 1024)) * 100)}%` }}
                      className={`h-full transition-all duration-500 ${
                        (speicherInfo.localStorageBytes / (5 * 1024 * 1024)) > 0.85 ? 'bg-rose-500' :
                        (speicherInfo.localStorageBytes / (5 * 1024 * 1024)) > 0.60 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    />
                  </div>
                  
                  {speicherInfo.localStorageBytes > 4.25 * 1024 * 1024 && (
                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 flex items-start gap-2 mt-4 text-rose-600 text-[0.6875rem] font-semibold leading-relaxed">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      Der Schnellspeicher ist fast voll. Lösche alte Tafel-Vorlagen oder KI-Caches, sonst können Sicherungskopien fehlschlagen.
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 border-t border-slate-50">
                <div className="flex items-center justify-between text-[0.75rem] font-medium text-slate-500">
                  <div className="flex items-center gap-2">
                    <HardDrive size={14} />
                    <span>Hauptspeicher (IndexedDB)</span>
                  </div>
                  <span className="text-slate-900 font-bold">
                    {speicherInfo?.indexedDbBytes 
                      ? `${(speicherInfo.indexedDbBytes / (1024 * 1024)).toFixed(1)} MB belegt`
                      : 'Lade...'}
                  </span>
                </div>
                {speicherInfo?.quotaBytes && (
                  <p className="text-[0.625rem] text-slate-400 mt-1">
                    Verfügbare Browser-Quota: {(speicherInfo.quotaBytes / (1024 * 1024)).toFixed(0)} MB
                  </p>
                )}
              </div>

              {/* Greatest entries */}
              <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                <button 
                  onClick={() => setShowBigEntries(!showBigEntries)}
                  className="w-full p-4 flex items-center justify-between text-[0.6875rem] font-black uppercase tracking-wider text-slate-500 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Sliders size={14} />
                    Größte Einträge
                  </div>
                  {showBigEntries ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <AnimatePresence>
                  {showBigEntries && speicherInfo && (
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="px-4 pb-4 space-y-2 overflow-hidden"
                    >
                      {speicherInfo.groessteEintraege.map(entry => {
                        let label = entry.key;
                        if (entry.key === 'hehle_v3_backup') label = 'Sicherungskopie';
                        else if (entry.key === 'hehle_v3_fallback') label = 'Notfall-Fallback';
                        else if (entry.key === 'hehle_v3_notfallkopie') label = 'Tägliche Notfallkopie';
                        else if (entry.key.startsWith('dashboard_')) label = 'Dashboard-Einstellungen';
                        else if (entry.key.startsWith('ki_portfolio_summary_') || entry.key.startsWith('ai_parent_report_') || entry.key.startsWith('dashboard_insight')) label = 'KI-Cache';
                        
                        return (
                          <div key={entry.key} className="flex items-center justify-between py-1 border-b border-white last:border-0">
                            <span className="text-[0.6875rem] font-bold text-slate-600">{label}</span>
                            <span className="text-[0.625rem] font-mono font-bold text-slate-400">{(entry.bytes / 1024).toFixed(0)} KB</span>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* App installieren */}
              <div className="pt-4 border-t border-slate-150/80">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone size={14} className="text-emerald-500" />
                  <span className="text-[0.75rem] font-black uppercase tracking-wider text-slate-900">Als App installieren (PWA)</span>
                </div>
                
                {isStandalone ? (
                  <div className="p-3 bg-emerald-50/80 border border-emerald-100 rounded-xl flex items-center gap-2 text-emerald-800 text-[0.6875rem] font-bold">
                    <Check size={14} className="text-emerald-500" />
                    <span>✓ Als App installiert</span>
                  </div>
                ) : (
                  <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                    <p className="text-[0.6875rem] text-slate-600 leading-relaxed font-semibold">
                      Nutze den Schulplaner auf deinem Handy, Tablet oder Desktop wie eine native App – im Vollbild und ohne störende Browser-Leiste.
                    </p>
                    
                    {installPrompt || (window as any).deferredPrompt ? (
                      <button
                        type="button"
                        onClick={triggerInstall}
                        className="w-full px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white text-[0.6875rem] leading-tight font-black uppercase tracking-wider rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        📲 Als App installieren
                      </button>
                    ) : (
                      <div className="space-y-1.5 text-[0.625rem] text-slate-500 leading-normal font-bold border-t border-slate-100 pt-2 text-left">
                        <div className="flex items-start gap-1">
                          <span className="text-emerald-600 shrink-0">iPhone/iPad:</span>
                          <span>Teilen-Symbol → „Zum Home-Bildschirm“.</span>
                        </div>
                        <div className="flex items-start gap-1">
                          <span className="text-emerald-600 shrink-0">Android/Chrome:</span>
                          <span>Menü ⋮ → „App installieren“.</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClearAICache}
                  className="flex-1 px-5 py-3 bg-white border border-stone-200 hover:border-rose-300 hover:text-rose-600 text-slate-700 text-[0.75rem] leading-tight font-black uppercase tracking-wider rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 size={14} />
                  KI-Caches leeren
                </button>
                <button
                  type="button"
                  onClick={runSystemCheck}
                  disabled={isChecking}
                  className="flex-1 px-5 py-3 bg-accent hover:bg-accent-dark text-white text-[0.75rem] leading-tight font-black uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isChecking ? <RefreshCw size={14} className="animate-spin" /> : <Cpu size={14} />}
                  System-Check ausführen
                </button>
              </div>

              {hatBeispieldaten && (
                <div className="pt-2 animate-in fade-in slide-in-from-bottom-2">
                  <button
                    type="button"
                    onClick={removeDemoDataAction}
                    className="w-full px-5 py-3 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 text-[0.75rem] leading-tight font-black uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm group"
                  >
                    <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
                    Beispieldaten vollständig entfernen
                  </button>
                </div>
              )}
            </div>

            {/* Check Results */}
            <AnimatePresence>
              {checkResults && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-3 pt-6 border-t border-slate-100"
                >
                  <h4 className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 px-1 mb-2">Ergebnisse des System-Checks</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {checkResults.map(res => (
                      <div 
                        key={res.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white ${
                            res.status === 'ok' ? 'bg-emerald-500' :
                            res.status === 'warn' ? 'bg-amber-500' : 'bg-rose-500'
                          }`}>
                            {res.status === 'ok' ? <Check size={12} /> : 
                             res.status === 'warn' ? <AlertTriangle size={12} /> : <X size={12} />}
                          </div>
                          <span className="text-[0.75rem] font-bold text-slate-700">{res.label}</span>
                        </div>
                        <span className={`text-[0.6875rem] font-black ${
                          res.status === 'ok' ? 'text-emerald-600' :
                          res.status === 'warn' ? 'text-amber-600' : 'text-rose-600'
                        }`}>
                          {res.info}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </div>

      {/* Warning Dialog Modal with highest backdrop z-index and blurred background */}
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
              aria-labelledby="settings-reset-dialog-title"
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
                  <h3 id="settings-reset-dialog-title" className="text-[1.125rem] leading-normal font-black text-slate-900">Bestätigung erforderlich</h3>
                  <p className="text-[0.6875rem] text-rose-600 font-extrabold uppercase tracking-widest">
                    {resetType === 'all' ? 'Daten löschen' : 'Verlauf leeren'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 border-t border-b border-stone-100 py-4">
                <p className="text-[0.8125rem] text-slate-655 font-medium leading-relaxed">
                  {resetType === 'all' 
                    ? 'Hiermit werden alle Schülerdaten, Leistungsnotizen, Sitzpläne und Einstellungen in diesem Browser gelöscht. Dies lässt sich nicht rückgängig machen.'
                    : 'Möchten Sie den gesamten Icon- und Verhaltensverlauf wirklich leeren? Die aktuellen Schüler:innen bleiben erhalten.'
                  }
                </p>
                <p className="text-[0.6875rem] text-slate-500 font-bold">
                  Bitte tippen Sie zur Bestätigung <strong className="text-slate-900 font-black">LÖSCHEN</strong> in das Feld:
                </p>
                <input 
                  type="text" 
                  aria-label="Bestätigungstext LÖSCHEN"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Hier Bestätigung eingeben..."
                  className="w-full h-11 px-4 rounded-xl border border-stone-250 bg-stone-50 text-[0.8125rem] font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:bg-white transition-all text-center"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="flex-1 h-12 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-[0.6875rem] uppercase tracking-wider transition-all cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  disabled={deleteConfirmText !== 'LÖSCHEN'}
                  onClick={handleResetExecute}
                  className={`flex-1 h-12 rounded-xl font-black text-[0.6875rem] uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    deleteConfirmText === 'LÖSCHEN'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg active:scale-95'
                      : 'bg-stone-100 text-stone-300 cursor-not-allowed'
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
        <p className="text-[0.625rem] font-bold text-slate-300 uppercase tracking-[0.4em]">Lehrkraft Manager v4.2.0 • Lokale Web-App</p>
      </div>
    </div>
  );
}
