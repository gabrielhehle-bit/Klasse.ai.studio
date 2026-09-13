import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import LZString from 'lz-string';
import { getCurrentSchuljahr } from '../lib/utils';
import { FAECHER_ALLE, DEFAULT_TAGEPLAN, DEFAULT_FACH_COLORS, STUNDEN_INFO, TAGE_NAMEN, STUNDENTAFEL, DEUTSCH_UNTERFAECHER } from '../constants';
import { 
  GraduationCap, Users, Clock, Calendar, 
  Sparkles, User, Palette, Check, Trash2, Upload, AlertCircle, Play, Edit3, FileUp,
  RotateCcw, ShieldCheck, ListChecks, Settings2
} from 'lucide-react';
import { parseSokratesCSV } from '../lib/importUtils';
import { KlassenlistenImport } from './KlassenlistenImport';
import { parseSokratesFile, ParsedSokratesResult } from '../lib/sokratesParser';
import { SokratesImportModal } from './SokratesImportModal';
import { Bundesland, BUNDESLAND_NAMEN } from '../lib/ferienOesterreich';
import { FachColorPicker } from './FachColorPicker';
import { getFachHexColor, STANDARD_COLOR_MAP } from '../lib/fachColorUtils';
import { getActiveVaultKey } from '../lib/vaultStorage';
import { prepareBackupRestore, parseBackupText } from '../lib/backupRestore';

function parseLegacyTeacherName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  let anrede = '';
  if (parts[0] === 'Herr' || parts[0] === 'Frau') anrede = parts.shift() || '';
  if (parts.length === 0) return { anrede, vorname: '', nachname: '' };
  if (parts.length === 1) return { anrede, vorname: '', nachname: parts[0] };
  const nachname = parts.pop() || '';
  return { anrede, vorname: parts.join(' '), nachname };
}

export default function SetupWizard({ onComplete, isNewClass }: { onComplete: () => void, isNewClass?: boolean }) {
  const { app, setApp, restoreAppData } = useApp();
  
  const setupAbgeschlossen = 
    (app?.klassenbezeichnung && app.klassenbezeichnung.trim().length > 0) ||
    (app?.classes && app.classes.length > 0) ||
    (app?.schueler && app.schueler.length > 0);

  const isEditing = setupAbgeschlossen && !isNewClass;
  const isFirstSetup = !setupAbgeschlossen;
  
  const activeClassLocal = (!isNewClass && app.classes) ? (app.classes.find(c => c.id === app.activeClassId) || app.classes[0]) : null;

  const legacyTeacherName = (app.lehrerName || app.lehrerProfil?.name || '').trim();
  const legacyTeacherParts = parseLegacyTeacherName(legacyTeacherName);
  const [lehrerName, setLehrerName] = useState(legacyTeacherName);
  const [anrede, setAnrede] = useState(app.anrede || legacyTeacherParts.anrede);
  const [vorname, setVorname] = useState(app.vorname || legacyTeacherParts.vorname);
  const [nachname, setNachname] = useState(app.nachname || legacyTeacherParts.nachname);
  const applyTeacherName = (value: string) => {
    setLehrerName(value);
    const parsed = parseLegacyTeacherName(value);
    setAnrede(parsed.anrede);
    setVorname(parsed.vorname);
    setNachname(parsed.nachname);
  };
  const [schulName, setSchulName] = useState(app.schulName || '');
  const [schulkennzahl, setSchulkennzahl] = useState(app.schulkennzahl || '');
  const [schulOrt, setSchulOrt] = useState(app.schulOrt || '');
  const [schulPlz, setSchulPlz] = useState(app.schulPlz || '');
  const [bundesland, setBundesland] = useState<Bundesland>((app.bundesland as Bundesland) || 'VBG');

  const [klassenbezeichnung, setKlassenbezeichnung] = useState(isNewClass ? '' : (activeClassLocal ? activeClassLocal.name : app.klassenbezeichnung || ''));
  const [schuljahr, setSchuljahr] = useState(isNewClass ? getCurrentSchuljahr() : (activeClassLocal?.schuljahr || app.schuljahr || getCurrentSchuljahr()));
  const [stufe, setStufe] = useState<number>(isNewClass ? 1 : (activeClassLocal?.stufe !== undefined ? Number(activeClassLocal.stufe) : (app.stufe !== undefined ? Number(app.stufe) : 1)));
  const [theme] = useState<any>(activeClassLocal?.theme || (activeClassLocal?.settings as any)?.theme || app.theme || (app.settings as any)?.theme || 'classic_light');
  const [fontFamily] = useState<any>(activeClassLocal?.settings?.fontFamily || (activeClassLocal as any)?.fontFamily || app.settings?.fontFamily || 'standard');

  const [faecher, setFaecher] = useState<string[]>(isNewClass ? FAECHER_ALLE : (activeClassLocal?.faecher?.length ? activeClassLocal.faecher : FAECHER_ALLE));
  const [fachConfig, setFachConfig] = useState<any>(isNewClass ? DEFAULT_FACH_COLORS : (activeClassLocal?.fachConfig || DEFAULT_FACH_COLORS));
  const [newFach, setNewFach] = useState('');

  const [stundenZeiten, setStundenZeiten] = useState<any>(activeClassLocal?.stundenZeiten || app.stundenZeiten || STUNDEN_INFO);
  const [mittagspauseNachStunde, setMittagspauseNachStunde] = useState<number>(activeClassLocal?.mittagspauseNachStunde || app.mittagspauseNachStunde || 5);
  const [tageplan, setTageplan] = useState<any>(isNewClass ? DEFAULT_TAGEPLAN : (activeClassLocal?.tageplan || app.tageplan || DEFAULT_TAGEPLAN));
  const [stammplan, setStammplan] = useState<any>(isNewClass ? {} : (activeClassLocal?.stammplan || app.stammplan || {}));

  const initialStudents = isNewClass ? [] : (activeClassLocal?.schueler?.length ? activeClassLocal.schueler : (isEditing ? (app.schueler || []) : []));
  const [studentsList, setStudentsList] = useState<any[]>(initialStudents);
  const [currentStudent, setCurrentStudent] = useState({ vorname: '', nachname: '' });
  const [uiScale] = useState<number>(activeClassLocal?.settings?.uiScale || app.settings?.uiScale || (app as any).uiScale || 1);

  const [csvPreview, setCsvPreview] = useState<any[] | null>(null);
  const [csvError, setCsvError] = useState(false);
  const [isKlassenlistImportOpen, setIsKlassenlistImportOpen] = useState(false);
  const [sokratesResult, setSokratesResult] = useState<ParsedSokratesResult | null>(null);
  const [showSokratesModal, setShowSokratesModal] = useState(false);
  const [isAnalyzingSokrates, setIsAnalyzingSokrates] = useState(false);
  const [activeInputMode, setActiveInputMode] = useState<'choice' | 'manual'>(() => {
    if (isEditing && initialStudents.length > 0) return 'manual';
    return 'choice';
  });
  const [setupMode, setSetupMode] = useState<'quick' | 'expert'>(() => {
    if (isEditing || isNewClass) return 'expert';
    try {
      return JSON.parse(localStorage.getItem('klassio_setup_wizard_ui_v1') || '{}').setupMode === 'expert' ? 'expert' : 'quick';
    } catch {
      return 'quick';
    }
  });
  const [showMissingKlassenbezeichnung, setShowMissingKlassenbezeichnung] = useState(false);
  const [studentMessage, setStudentMessage] = useState<string | null>(null);
  const [lastRemovedStudent, setLastRemovedStudent] = useState<any | null>(null);
  const [activeMobileDay, setActiveMobileDay] = useState(TAGE_NAMEN[0]);
  const initialAppearance = useRef({
    className: document.documentElement.className,
    style: document.documentElement.getAttribute('style'),
    dataStyle: document.documentElement.getAttribute('data-style'),
    dataTheme: document.documentElement.getAttribute('data-theme'),
    dataZoom: document.documentElement.getAttribute('data-zoom')
  });

  const vornameRef = useRef<HTMLInputElement>(null);
  const nachnameRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const sokratesFileInputRef = useRef<HTMLInputElement>(null);

  // Only non-sensitive wizard UI state may be persisted in plaintext.
  const WIZARD_PROGRESS_KEY = 'klassio_setup_wizard_ui_v1';
  const LEGACY_WIZARD_PROGRESS_KEY = 'gabic_setup_wizard_progress';

  const magicAutofillStammplan = () => {
    if (!window.confirm("Klassio erstellt einen Vorschlag anhand der Stundentafel. Dein aktuell eingetragener Stammstundenplan wird dabei überschrieben. Fortfahren?")) return;
    
    let newStammplan: any = {};
    const emptySlots: { tag: string, h: number }[] = [];
    
    // initialize and gather available slots
    TAGE_NAMEN.forEach(tag => {
      newStammplan[tag] = {};
      const activeStunden = tageplan[tag]?.stunden || [];
      activeStunden.forEach((h: number) => {
         emptySlots.push({tag, h});
      });
    });

    const safeStufe = stufe === 0 ? 1 : stufe;
    const currentStundentafelLocal = STUNDENTAFEL[safeStufe] || STUNDENTAFEL[1];

    // Gather subjects to distribute
    const toDistribute: string[] = [];
    Object.entries(currentStundentafelLocal).forEach(([fach, anzahl]) => {
      if (fach === 'Gesamt') return;
      if (typeof anzahl === 'number') {
        for (let i = 0; i < anzahl; i++) toDistribute.push(fach);
      }
    });

    // We want subjects spread out. Let's sort them so subjects with more hours come first.
    const counts: Record<string, number> = {};
    toDistribute.forEach(f => counts[f] = (counts[f] || 0) + 1);
    toDistribute.sort((a, b) => {
       if (counts[b] !== counts[a]) return counts[b] - counts[a];
       return a.localeCompare(b);
    });

    for (const fach of toDistribute) {
       // sort empty slots by heuristic:
       // 1. fewest occurrences of this subject on the day
       // 2. random/round-robin to spread across early/late hours
       emptySlots.sort((a, b) => {
         const aHas = Object.values(newStammplan[a.tag]).filter(f => f === fach).length;
         const bHas = Object.values(newStammplan[b.tag]).filter(f => f === fach).length;
         if (aHas !== bHas) return aHas - bHas;
         // minor preference to fill days uniformly
         const aTotal = Object.keys(newStammplan[a.tag]).length;
         const bTotal = Object.keys(newStammplan[b.tag]).length;
         if (aTotal !== bTotal) return aTotal - bTotal;
         return a.h - b.h;
       });

       if (emptySlots.length > 0) {
         const slot = emptySlots.shift()!; // remove the slot
         newStammplan[slot.tag][slot.h] = fach;
       }
    }
    
    setStammplan(newStammplan);
  };

  // Datenschutz: alte Klartext-Setupstände können Schüler-/Schuldaten enthalten.
  // Sie werden beim Öffnen des Wizards entfernt und nicht mehr wiederhergestellt.
  useEffect(() => {
    sessionStorage.removeItem(LEGACY_WIZARD_PROGRESS_KEY);
    localStorage.removeItem(LEGACY_WIZARD_PROGRESS_KEY);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.className = theme;
    root.setAttribute('data-style', theme);
    const isLightTheme = theme !== 'deep_dark';
    root.setAttribute('data-theme', isLightTheme ? 'light' : 'dark');
    
    // Map font string to explicit font-family fallback chains
    let sansFont = '"DM Sans", ui-sans-serif, system-ui, sans-serif';
    switch (fontFamily) {
      case 'geometric': sansFont = '"Outfit", "DM Sans", ui-sans-serif, system-ui, sans-serif'; break;
      case 'friendly': sansFont = '"Fredoka", "Quicksand", sans-serif'; break;
      case 'handwritten': sansFont = '"Patrick Hand", "Kalam", cursive, sans-serif'; break;
      case 'elegant': sansFont = '"Cinzel", "Playfair Display", ui-serif, Georgia, serif'; break;
      case 'comfort': sansFont = '"Comfortaa", "Quicksand", cursive, sans-serif'; break;
      case 'serif': sansFont = 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif'; break;
      case 'dyslexic': sansFont = '"Lexend", "OpenDyslexic", "Lexend Deca", ui-sans-serif, sans-serif'; break;
      case 'playful': sansFont = '"Quicksand", "Comic Sans MS", cursive, sans-serif'; break;
      case 'mono': sansFont = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'; break;
      case 'standard': default: break;
    }
    
    root.style.setProperty('--font-sans', sansFont);
    
    let zoomLevel = 'standard';
    if (uiScale < 0.95) zoomLevel = 'compact';
    else if (uiScale > 1.05) zoomLevel = 'large';
    root.setAttribute('data-zoom', zoomLevel);
  }, [theme, fontFamily, uiScale]);

  const triggerBackupSelect = () => { fileInputRef.current?.click(); };
  const handleBackupImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const key = getActiveVaultKey();
        if (!key) throw new Error('Bitte zuerst den lokalen Tresor entsperren.');
        const importedData = await prepareBackupRestore(
          parseBackupText(String(event.target?.result || '')), key,
          () => prompt('Bitte gib das Tresor-Passwort oder den Recovery-Code dieses Backups ein. Dein lokales Tresor-Passwort bleibt unverändert.')
        );
        if (!importedData) return;

        const classCount = Array.isArray(importedData.classes) ? importedData.classes.length : (importedData.klassenbezeichnung ? 1 : 0);
        const studentCount = Array.isArray(importedData.schueler)
          ? importedData.schueler.length
          : (Array.isArray(importedData.classes)
              ? importedData.classes.reduce((sum: number, c: any) => sum + (Array.isArray(c?.schueler) ? c.schueler.length : 0), 0)
              : 0);
        if (!window.confirm(
          `Backup geprüft:\n\n${classCount} Klasse(n)\n${studentCount} Schüler:innen\n\nDer aktuelle Datenstand wird vorher gesichert. Backup jetzt wiederherstellen?`
        )) {
          e.target.value = '';
          return;
        }

        await restoreAppData(importedData);
        sessionStorage.removeItem(WIZARD_PROGRESS_KEY);
        localStorage.removeItem(WIZARD_PROGRESS_KEY);
        sessionStorage.removeItem(LEGACY_WIZARD_PROGRESS_KEY);
        localStorage.removeItem(LEGACY_WIZARD_PROGRESS_KEY);
        onComplete();
      } catch (err: any) {
        alert(err?.message || 'Fehler beim Wiederherstellen des Backups.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const triggerCSVSelect = () => { csvInputRef.current?.click(); };
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = parseSokratesCSV(event.target?.result as string);
      if (result.students && result.students.length > 0) {
        const newKids = result.students.map((s: any) => ({
          id: crypto.randomUUID(), vorname: s.vorname || '', nachname: s.nachname || '', name: `${s.vorname||''} ${s.nachname||''}`.trim(),
          geschlecht: s.geschlecht || 'w', niveau: 1, geburtstag: s.geburtstag || '', staatsbuergerschaft: 'Österreich',
          religion: s.religion || '', gruppen: [], erstelltAm: new Date().toISOString()
        }));
        setCsvPreview(newKids);
        setCsvError(false);
      } else { 
        setCsvError(true); 
      }
    };
    reader.readAsText(file, 'utf-8');
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const handleSokratesFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzingSokrates(true);
    try {
      const result = await parseSokratesFile(file);
      if (result.students.length === 0) {
        alert('In dieser Datei konnten keine Schülerdaten erkannt werden. Bitte prüfe das Format (Sokrates-PDF oder CSV).');
      } else {
        setSokratesResult(result);
        setShowSokratesModal(true);
      }
    } catch (err: any) {
      console.error('Fehler beim Sokrates-Import:', err);
      alert('Fehler beim Einlesen: ' + (err.message || 'Unbekannter Fehler'));
    } finally {
      setIsAnalyzingSokrates(false);
      e.target.value = '';
    }
  };

  const addStudent = () => {
    if (!currentStudent.vorname.trim() || !currentStudent.nachname.trim()) return;
    const normalizedName = `${currentStudent.vorname} ${currentStudent.nachname}`.trim().toLocaleLowerCase('de');
    if (studentsList.some(s => `${s.vorname || ''} ${s.nachname || ''}`.trim().toLocaleLowerCase('de') === normalizedName)) {
      setStudentMessage('Diese Person ist bereits in der Liste.');
      return;
    }
    const newKid = {
      id: crypto.randomUUID(), vorname: currentStudent.vorname.trim(), nachname: currentStudent.nachname.trim(),
      name: `${currentStudent.vorname.trim()} ${currentStudent.nachname.trim()}`, geschlecht: '', niveau: 1,
      geburtstag: '', staatsbuergerschaft: 'Österreich', religion: '', gruppen: [], erstelltAm: new Date().toISOString()
    };
    setStudentsList(prev => [...prev, newKid]);
    setStudentMessage(null);
    setCurrentStudent({ vorname: '', nachname: '' });
    // Focus instantly after render loop, much snappier than 10ms
    setTimeout(() => vornameRef.current?.focus(), 0);
  };
  const removeStudent = (id: string) => {
    const removed = studentsList.find(s => s.id === id);
    if (removed) setLastRemovedStudent(removed);
    setStudentsList(prev => prev.filter(s => s.id !== id));
    setStudentMessage('Eintrag entfernt.');
  };

  const mergeStudents = (incoming: any[]) => {
    const existing = new Set(studentsList.map(s => `${s.vorname || ''} ${s.nachname || ''}`.trim().toLocaleLowerCase('de')));
    const unique = incoming.filter(s => {
      const key = `${s.vorname || ''} ${s.nachname || ''}`.trim().toLocaleLowerCase('de');
      if (!key || existing.has(key)) return false;
      existing.add(key);
      return true;
    });
    setStudentsList(prev => [...prev, ...unique]);
    setActiveInputMode('manual');
    setStudentMessage(unique.length === incoming.length
      ? `${unique.length} Schüler:innen importiert.`
      : `${unique.length} importiert, ${incoming.length - unique.length} doppelte Einträge übersprungen.`);
  };

  const handleSaveAndComplete = (overrideStudents?: any[]) => {
    const finalStudents = overrideStudents !== undefined ? overrideStudents : studentsList;
    if (!klassenbezeichnung.trim()) {
      setShowMissingKlassenbezeichnung(true);
      const classStepIdx = STEPS.findIndex(s => s.title === 'Klasse');
      if (currStep !== classStepIdx && classStepIdx !== -1) setCurrStep(classStepIdx);
      return;
    }

    const hatBeispieldaten = app.schueler?.some((s: any) => s.id?.startsWith('demo-'));
    let removeDemo = false;
    if (hatBeispieldaten && window.confirm('Es sind noch Beispieldaten vorhanden. Sollen sie entfernt werden?')) {
      removeDemo = true;
    }
    
    const filterDemo = (prev: any) => {
      if (!removeDemo) return prev;
      const newState = { ...prev };
      const filterMap = (map: any) => {
        if (!map) return {};
        const newMap = { ...map };
        Object.keys(newMap).forEach(key => {
          if (key.startsWith('demo-')) delete newMap[key];
        });
        return newMap;
      };

      newState.schueler = (prev.schueler || []).filter((s: any) => !s.id.startsWith('demo-'));
      newState.classes = (prev.classes || []).filter((c: any) => !c.id.startsWith('demo-'));
      newState.notes = (prev.notes || []).filter((n: any) => !n.id.startsWith('demo-') && !n.schuelerId.startsWith('demo-'));
      newState.differenzierungsGruppen = (prev.differenzierungsGruppen || []).filter((g: any) => !g.id.startsWith('demo-'));
      newState.diagnostikErgebnisse = (prev.diagnostikErgebnisse || []).filter((d: any) => !d.id.startsWith('demo-') && !d.schuelerId.startsWith('demo-'));
      
      newState.noten = filterMap(prev.noten);
      newState.mitarbeit = filterMap(prev.mitarbeit);
      newState.anwesenheit = filterMap(prev.anwesenheit);
      newState.demoModusAktiv = false;
      return newState;
    };
    
    const yearlySubjects = faecher
      .map(f => {
        const c = getFachColorKey(f) || 'slate';
        return { id: 'fach_' + f.toLowerCase().replace(/[^a-z0-9]/g, '_'), label: f, color: `bg-${c}-50 border-${c}-200 text-${c}-800` };
      });
    yearlySubjects.push({ id: 'checks', label: 'Checks/SA', color: 'bg-red-50 border-red-200 text-red-800' });

    if (isEditing && activeClassLocal) {
       let updatedClasses = [...(app.classes || [])];
       const activeIndex = updatedClasses.findIndex(c => c.id === activeClassLocal.id);
       if (activeIndex >= 0) {
           updatedClasses[activeIndex] = {
               ...updatedClasses[activeIndex],
               name: klassenbezeichnung,
               stufe,
               theme,
               settings: { ...(updatedClasses[activeIndex].settings || {} as any), fontFamily, uiScale },
               faecher,
               fachConfig,
               schueler: finalStudents,
               tageplan,
               stammplan,
               stundenZeiten,
               mittagspauseNachStunde,
               jahresplan_faecher: yearlySubjects
           };
       }
       setApp((prevOrig: any) => {
         const prev = filterDemo(prevOrig);
         const oldStamm = prev.stammplan || {};
         const newStamm = stammplan || {};
         const wpCopy = { ...(prev.wochenplanung || {}) };

          // Iterate over all weeks in wochenplanung to synchronize modified subjects
          Object.keys(wpCopy).forEach(kw => {
            const weekObj = { ...(wpCopy[kw] || {}) };
            let weekChanged = false;

            const WOC_TAGE = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag'];
            WOC_TAGE.forEach(tag => {
              const dayLessons = { ...(weekObj[tag] || {}) };
              let dayChanged = false;

              // Collect all indices from old and new stammplan for this day to check for changes
              const allIdxs = new Set<number>();
              if (oldStamm[tag]) Object.keys(oldStamm[tag]).forEach(idStr => allIdxs.add(parseInt(idStr)));
              if (newStamm[tag]) Object.keys(newStamm[tag]).forEach(idStr => allIdxs.add(parseInt(idStr)));

              allIdxs.forEach((idx: number) => {
                const lesson = { ...(dayLessons[idx] || {}) };
                const oldFach = oldStamm[tag]?.[idx] || '';
                const newFach = newStamm[tag]?.[idx] || '';

                if (oldFach !== newFach) {
                  // If the subject was not explicitly customized or matches old stammplan, synchronize it
                  if (!lesson.fach || lesson.fach === oldFach) {
                    if (newFach) {
                      lesson.fach = newFach;
                      dayLessons[idx] = lesson;
                    } else {
                      delete lesson.fach;
                      if (Object.keys(lesson).length === 0 || (Object.keys(lesson).length === 1 && lesson.erledigt !== undefined)) {
                        delete dayLessons[idx];
                      } else {
                        dayLessons[idx] = lesson;
                      }
                    }
                    dayChanged = true;
                  }
                }
              });

              if (dayChanged) {
                weekObj[tag] = dayLessons;
                weekChanged = true;
              }
            });

            if (weekChanged) {
              wpCopy[kw] = weekObj;
            }
          });

         // Build final classes array
         const classes = [...(prev.classes || [])];
         const activeIdx = classes.findIndex(c => c.id === activeClassLocal.id);
         if (activeIdx >= 0) {
           classes[activeIdx] = {
             ...classes[activeIdx],
             name: klassenbezeichnung,
             stufe,
             theme,
             settings: { ...(classes[activeIdx].settings || {} as any), fontFamily, uiScale },
             faecher,
             fachConfig,
             schueler: finalStudents,
             tageplan,
             stammplan,
             stundenZeiten,
             mittagspauseNachStunde,
             jahresplan_faecher: yearlySubjects,
             wochenplanung: wpCopy,
             schuljahr: schuljahr
           };
         }

         return {
           ...prev,
           lehrerName: resolvedLehrerName,

           anrede,

           vorname,

           nachname,

           lehrerProfil: { ...(prev.lehrerProfil || {}), name: resolvedLehrerName, schule: schulName },

           schulName, schulkennzahl, schulOrt, schulPlz, bundesland,
           klassenbezeichnung, stufe, schueler: finalStudents,
           classes,
           currentPage: 'dashboard',
           schuljahr: schuljahr,
           // Synchronize class root active state properties so they are immediately available everywhere
           stammplan,
           tageplan,
           stundenZeiten,
           mittagspauseNachStunde,
           faecher,
           fachConfig,
           wochenplanung: wpCopy,
           jahresplan_faecher: yearlySubjects,
           settings: { ...(prev.settings || {}), fontFamily, uiScale, theme }
         };
       });
    } else {
       const classId = isFirstSetup ? (app.activeClassId || 'class_first_setup') : 'class-' + Math.random().toString(36).substring(2, 9);
       const mainClass = {
         id: classId, name: klassenbezeichnung, stufe, theme, settings: { theme, fontFamily, uiScale, verhaltenSymbol: 'star', showVerhaltenOnBoard: true },
         faecher, fachConfig, klassenvorstand: true, schueler: finalStudents,
         noten: {}, mitarbeit: {}, verhalten: {}, karten: {}, jahresplanung: {}, jahresplan_faecher: yearlySubjects, wochenplanung: {},
         anwesenheit: {}, anwesenheitDetail: {}, dienste: [], saAssessments: {}, klassenglas_count: 0, klassenglas_ziel: 20,
         klassenkasse: { kontostand: 0, sammlungen: [], transaktionen: [] }, behavior_status: {}, behavior_notes: {},
         sue_kontrolle: {}, sitzplan_schueler: {}, sitzplan_objekte: [],
         tageplan, stammplan, stundenZeiten, mittagspauseNachStunde,
         schuljahr: schuljahr
       };
       
       setApp((prevOrig: any) => {
         const prev = filterDemo(prevOrig);
         return {
           ...prev,
         ...(isFirstSetup ? {
           lehrerName: resolvedLehrerName,

           anrede,

           vorname,

           nachname,

           lehrerProfil: { ...(prev.lehrerProfil || {}), name: resolvedLehrerName, schule: schulName },

           schulName, schulkennzahl, schulOrt, schulPlz, bundesland,
           klassenbezeichnung, stufe, schuljahr: schuljahr, schueler: finalStudents,
           classes: [mainClass], activeClassId: classId, firstLogin: true, tourAbgeschlossen: false
         } : {
           classes: [...(prev.classes || []), mainClass], 
           activeClassId: classId,
           klassenbezeichnung, stufe, schuljahr: schuljahr, schueler: finalStudents
         }),
         currentPage: 'dashboard',
         schuljahr: schuljahr,
         // Synchronize class root active state properties so they are immediately available everywhere
         stammplan,
         tageplan,
         stundenZeiten,
         mittagspauseNachStunde,
         faecher,
         fachConfig,
         wochenplanung: {},
         jahresplan_faecher: yearlySubjects,
         settings: { ...(prev.settings || {}), fontFamily, uiScale, theme }
       };
      });
    }
    
    if (isFirstSetup) {
      localStorage.removeItem(WIZARD_PROGRESS_KEY);
      sessionStorage.removeItem(LEGACY_WIZARD_PROGRESS_KEY);
      localStorage.removeItem(LEGACY_WIZARD_PROGRESS_KEY);
    }
    onComplete();
  };

  const expertSteps = isEditing
    ? [ { title: 'Profil & Schule', icon: User }, { title: 'Klasse', icon: GraduationCap }, { title: 'Fächer', icon: Palette }, { title: 'Stundenplan', icon: Calendar }, { title: 'Schüler', icon: Users }, { title: 'Übersicht', icon: ListChecks } ]
    : isNewClass
      ? [ { title: 'Klasse', icon: GraduationCap }, { title: 'Fächer', icon: Palette }, { title: 'Stundenplan', icon: Calendar }, { title: 'Schüler', icon: Users }, { title: 'Übersicht', icon: ListChecks } ]
      : [ { title: 'Start', icon: Sparkles }, { title: 'Profil & Schule', icon: User }, { title: 'Klasse', icon: GraduationCap }, { title: 'Fächer', icon: Palette }, { title: 'Stundenplan', icon: Calendar }, { title: 'Schüler', icon: Users }, { title: 'Übersicht', icon: ListChecks } ];
  const quickSteps = [
    { title: 'Start', icon: Sparkles },
    { title: 'Profil & Schule', icon: User },
    { title: 'Klasse', icon: GraduationCap },
    { title: 'Schüler', icon: Users },
    { title: 'Übersicht', icon: ListChecks }
  ];
  const STEPS = setupMode === 'quick' && !isEditing && !isNewClass ? quickSteps : expertSteps;
    
  const [currStep, setCurrStep] = useState(() => {
    if (app?.setupInitialStepMode) {
      const idx = STEPS.findIndex(s => s.title === app.setupInitialStepMode);
      if (idx !== -1) return idx;
    }
    if (isFirstSetup) {
      try {
        const saved = JSON.parse(localStorage.getItem(WIZARD_PROGRESS_KEY) || '{}');
        if (Number.isInteger(saved.currStep)) return Math.max(0, Math.min(STEPS.length - 1, saved.currStep));
      } catch {}
    }
    return 0;
  });

  useEffect(() => {
    if (!isFirstSetup) return;
    const saved = localStorage.getItem(WIZARD_PROGRESS_KEY);
    let progress: any = {};
    try { progress = saved ? JSON.parse(saved) : {}; } catch {}
    localStorage.setItem(WIZARD_PROGRESS_KEY, JSON.stringify({ ...progress, currStep, setupMode }));
  }, [currStep, setupMode, isFirstSetup]);

  useEffect(() => {
    if (app?.setupInitialStepMode) {
       // Clear it so it doesn't stick around forever
       setApp((prev: any) => {
         const copy = { ...prev };
         delete copy.setupInitialStepMode;
         return copy;
       });
    }
  }, [app?.setupInitialStepMode, setApp]);

  const handleStepClick = (idx: number) => {
    if (idx === currStep) return;
    const classStepIdx = STEPS.findIndex(s => s.title === 'Klasse');
    // Any jump beyond the class step requires a class name, even when the user
    // navigates there from an earlier step via the progress indicator.
    if (classStepIdx !== -1 && idx > classStepIdx && !klassenbezeichnung.trim()) {
      setShowMissingKlassenbezeichnung(true);
      setCurrStep(classStepIdx);
      return;
    }
    setShowMissingKlassenbezeichnung(false);
    setCurrStep(idx);
  };

  const nextStep = () => {
    const classStepIdx = STEPS.findIndex(s => s.title === 'Klasse');
    if (currStep === classStepIdx && !klassenbezeichnung.trim()) {
      setShowMissingKlassenbezeichnung(true);
      return;
    }
    setShowMissingKlassenbezeichnung(false);
    setCurrStep(p => Math.min(STEPS.length - 1, p + 1));
  };
  const prevStep = () => {
    setShowMissingKlassenbezeichnung(false);
    setCurrStep(p => Math.max(0, p - 1));
  };

  const handleCancel = () => {
    const root = document.documentElement;
    root.className = initialAppearance.current.className;
    if (initialAppearance.current.style === null) root.removeAttribute('style');
    else root.setAttribute('style', initialAppearance.current.style);
    (['data-style', 'data-theme', 'data-zoom'] as const).forEach(key => {
      const value = initialAppearance.current[key === 'data-style' ? 'dataStyle' : key === 'data-theme' ? 'dataTheme' : 'dataZoom'];
      if (value === null) root.removeAttribute(key);
      else root.setAttribute(key, value);
    });
    setApp((prev: any) => ({ ...prev, currentPage: 'dashboard' }));
    onComplete();
  };

  const getSubjectCount = (fach: string) => {
    let count = 0;
    TAGE_NAMEN.forEach(tag => {
      const activeStunden = tageplan[tag]?.stunden || [];
      if (stammplan[tag]) {
        Object.entries(stammplan[tag]).forEach(([h, f]) => {
          // Nur Stunden zählen, die aktuell im Tagesplan aktiv sind
          if (!activeStunden.includes(Number(h))) return;

          if (f === fach) {
            count++;
            return;
          }

          // Mapping für Lebende Fremdsprache
          if (fach === 'Lebende Fremdsprache' && typeof f === 'string' && (f === 'Englisch' || f === 'English' || f === 'Türkisch' || f.toLowerCase().includes('fremdsprache') || f.toLowerCase().includes('english') || f.toLowerCase().includes('englisch'))) {
            count++;
            return;
          }

          // Mapping für Deutsch (inkl. Unterfächer)
          const isDeutschRelated = typeof f === 'string' && (
            f === 'Deutsch' || 
            f.startsWith('Deutsch') || 
            DEUTSCH_UNTERFAECHER.includes(f) ||
            f === 'Lesen' || f === 'Schreiben' || f === 'Rechtschreiben' || f === 'Sprachbetrachtung' || f === 'Texte verfassen'
          );

          if (fach === 'Deutsch' && isDeutschRelated) {
            count++;
            return;
          }

          // Fallback matching for Werken
          if (fach === 'Technisches/Textiles Werken' && typeof f === 'string' && (f.includes('Werken') || f.includes('Technik und Design') || f.includes('Kunst und Gestaltung'))) {
            count++;
            return;
          }
        });
      }
    });
    return count;
  };

  const safeStufe = stufe === 0 ? 1 : stufe;
  const currentStundentafel = STUNDENTAFEL[safeStufe] || STUNDENTAFEL[1];
  const maxStunden = Math.max(...Object.values(currentStundentafel).map(v => typeof v === 'number' ? v : 0));

  const bgDict: any = new Proxy(STANDARD_COLOR_MAP, {
    get(target, prop: string) {
      if (typeof prop === 'string' && prop.startsWith('#')) return prop;
      return target[prop] || '#64748b';
    }
  });

  const getFachColorKey = (fachName?: string) => {
    if (!fachName) return null;
    const configColor = fachConfig[fachName]?.color;
    if (configColor && configColor !== 'slate') return configColor;
    const ln = fachName.toLowerCase();
    
    if (ln.includes('werken') || ln.includes('technik') || ln.includes('design')) return 'orange';
    if (ln.includes('bewegung') || ln.includes('sport')) return 'teal';
    if (ln.includes('fremdsprache') || ln.includes('englisch')) return 'sky';
    if (ln.includes('deutsch')) return 'blue';
    if (ln.includes('mathematik')) return 'red';
    if (ln.includes('sachunterricht')) return 'emerald';
    if (ln.includes('bildnerische') || ln.includes('kunst') || ln.includes('gestaltung')) return 'purple';
    if (ln.includes('musik')) return 'pink';
    if (ln.includes('religion')) return 'indigo';
    return configColor || 'slate';
  };

  const sortedFaecher = [...faecher.filter(f => fachConfig[f]?.unterrichtet !== false)].sort((a, b) => {
    const specialOrder = ['Deutsch', 'Mathematik', 'Sachunterricht'];
    const indexA = specialOrder.indexOf(a);
    const indexB = specialOrder.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  const stammplanFaecher = [...faecher].sort((a, b) => {
    const specialOrder = ['Deutsch', 'Mathematik', 'Sachunterricht'];
    const indexA = specialOrder.indexOf(a);
    const indexB = specialOrder.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  const activeSubjects = faecher.filter(f => fachConfig[f]?.unterrichtet !== false);
  const availableLessonSlots = TAGE_NAMEN.reduce((sum, tag) => sum + (tageplan[tag]?.stunden?.length || 0), 0);
  const assignedLessonSlots = TAGE_NAMEN.reduce((sum, tag) => {
    const active = new Set<number>(tageplan[tag]?.stunden || []);
    return sum + Object.entries(stammplan[tag] || {}).filter(([hour, subject]) => active.has(Number(hour)) && Boolean(subject)).length;
  }, 0);
  const resolvedLehrerName = [anrede, vorname, nachname].filter(Boolean).join(' ').trim() || lehrerName.trim();

  const schoolYearOptions = React.useMemo(() => {
    const current = getCurrentSchuljahr();
    const startYear = Number(current.slice(0, 4));
    const options = Number.isFinite(startYear)
      ? Array.from({ length: 5 }, (_, index) => {
          const year = startYear + index;
          return `${year}/${String((year + 1) % 100).padStart(2, '0')}`;
        })
      : [current];
    if (schuljahr && !options.includes(schuljahr)) options.unshift(schuljahr);
    return options;
  }, [schuljahr]);

  const wizardTitle = isNewClass
    ? 'Neue Klasse'
    : isEditing
      ? 'Klassen-Einstellungen'
      : 'Klassio einrichten';

  const setupWarnings = [
    studentsList.length === 0 ? 'Noch keine Schüler:innen angelegt – das kannst du später nachholen.' : null,
    assignedLessonSlots === 0 ? 'Noch kein Stammstundenplan ausgefüllt.' : null,
    assignedLessonSlots > availableLessonSlots ? 'Der Stundenplan enthält mehr Einträge als verfügbare Stunden.' : null,
    !resolvedLehrerName ? 'Der Name der Lehrkraft ist noch leer.' : null,
    !schulName.trim() ? 'Der Schulname ist noch leer.' : null
  ].filter(Boolean) as string[];

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-50 flex items-start justify-center p-0 md:p-8">
      <input type="file" accept=".json,.js,.lehrerapp,.lehrerapp-backup,application/json,text/javascript,text/plain" ref={fileInputRef} onChange={handleBackupImport} className="hidden" />
      <input type="file" accept=".csv" ref={csvInputRef} onChange={handleCSVImport} className="hidden" />
      <input type="file" accept=".pdf,.csv,.txt" ref={sokratesFileInputRef} onChange={handleSokratesFileUpload} className="hidden" />

      {isAnalyzingSokrates && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-800">Sokrates-PDF wird analysiert...</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Wir extrahieren Namen, Adressen, SVNR, Besuchsjahre (BJ) und Elternkontakte strukturiert aus dem Dokument.
            </p>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-2/3 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      )}

      {showSokratesModal && sokratesResult && (
        <SokratesImportModal
          isOpen={showSokratesModal}
          importResult={sokratesResult}
          onClose={() => setShowSokratesModal(false)}
          onApply={(importedStudents, meta) => {
            setStudentsList(importedStudents);
            if (meta?.klasse) setKlassenbezeichnung(meta.klasse);
            if (meta?.schuljahr) setSchuljahr(meta.schuljahr);
            if (meta?.lehrerName) applyTeacherName(meta.lehrerName);
            if (meta?.schulName) setSchulName(meta.schulName);
            if (meta?.schulkennzahl) setSchulkennzahl(meta.schulkennzahl);
            setActiveInputMode('manual');
            setShowSokratesModal(false);
            setStudentMessage(`${importedStudents.length} Schüler:innen aus Sokrates erfolgreich übernommen.`);
          }}
        />
      )}

      <div className="bg-white md:rounded-[32px] border border-slate-200 shadow-2xl w-full max-w-6xl relative min-h-screen md:min-h-[85vh] my-0 flex flex-col ">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 border-b border-slate-100 bg-white sticky top-0 z-50 shrink-0 gap-4">
          <div>
            <h2 className="text-[1.25rem] leading-normal font-black text-slate-900 tracking-tight">{wizardTitle}</h2>
            <p className="text-[0.75rem] leading-tight font-medium text-slate-500 mt-1 uppercase tracking-wider">
              Schritt {currStep + 1} von {STEPS.length}: {STEPS[currStep].title}
            </p>
          </div>
          
          {/* Progress Bar (Desktop) */}
          <div className="hidden md:flex items-center gap-2">
            {STEPS.map((step, idx) => {
              const isActive = idx === currStep;
              const isPast = idx < currStep;
              const Icon = step.icon;
              return (
                <div key={idx} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => handleStepClick(idx)}
                    title={`Gehe zu Schritt: ${step.title}`}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[0.625rem] font-bold shadow-sm transition-all cursor-pointer hover:scale-115 active:scale-90 ${isActive ? 'bg-emerald-500 text-white scale-110 shadow-emerald-500/20 ring-2 ring-emerald-400 ring-offset-2' : isPast ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                  >
                    <Icon size={14} />
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div className={`w-6 h-1 mx-1 rounded-full ${isPast ? 'bg-emerald-200' : 'bg-slate-100'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {(isEditing || isNewClass) && (
            <button onClick={handleCancel} className="w-full sm:w-auto px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-[0.75rem] leading-tight uppercase tracking-wider rounded-xl transition-all">
              Abbrechen
            </button>
          )}
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto w-full p-4 md:p-8 pb-8 soft-scrollbar relative">
           
           {STEPS[currStep].title === 'Start' && (
              <div className="max-w-2xl mx-auto text-center space-y-8 py-8 md:py-16 bg-emerald-50/50 rounded-[32px] border border-emerald-100/50 mb-12 animate-in fade-in slide-in-from-bottom-2 duration-700 ease-out">
                 <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-sm">
                   <Sparkles size={41} />
                 </div>
                 <div className="px-6">
                   <h1 className="text-[1.875rem] leading-tight md:text-4xl font-black text-slate-900 tracking-tight mb-3">Willkommen bei Klassio!</h1>
                   <p className="text-[0.875rem] font-black text-emerald-600 tracking-widest uppercase mb-4">Deine digitale Lehrermappe</p>
                   <p className="text-slate-500 font-medium max-w-lg mx-auto">Klicke auf Weiter, um deine Klasse einzurichten. Alternativ kannst du hier ein Backup hochladen, um dort weiterzumachen, wo du aufgehört hast.</p>
                 </div>

                 <div className="mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3 px-6 max-w-xl">
                   <button
                     type="button"
                     onClick={() => setSetupMode('quick')}
                     className={`p-4 rounded-2xl border-2 text-left transition-all ${setupMode === 'quick' ? 'border-emerald-500 bg-white shadow-md' : 'border-slate-200 bg-white/50 hover:border-slate-300'}`}
                   >
                     <div className="flex items-center gap-2 font-black text-slate-800"><Sparkles size={17} className="text-emerald-500" /> Schnell einrichten</div>
                     <p className="mt-1 text-[0.75rem] text-slate-500">In wenigen Minuten starten. Fächer und Stundenplan später ergänzen.</p>
                   </button>
                   <button
                     type="button"
                     onClick={() => setSetupMode('expert')}
                     className={`p-4 rounded-2xl border-2 text-left transition-all ${setupMode === 'expert' ? 'border-indigo-500 bg-white shadow-md' : 'border-slate-200 bg-white/50 hover:border-slate-300'}`}
                   >
                     <div className="flex items-center gap-2 font-black text-slate-800"><Settings2 size={17} className="text-indigo-500" /> Vollständig einrichten</div>
                     <p className="mt-1 text-[0.75rem] text-slate-500">Fächer und Stammstundenplan direkt konfigurieren.</p>
                   </button>
                 </div>
                 
                 <div className="flex flex-col sm:flex-row justify-center mt-8 pb-4 px-6 relative z-10 gap-4">
                    <button onClick={triggerBackupSelect} className="px-6 py-4 border-2 border-slate-200 hover:border-emerald-500 hover:bg-white bg-white/50 rounded-2xl flex items-center gap-3 transition-all text-slate-700 font-bold w-full sm:w-auto shadow-sm hover:shadow-md pointer-events-auto cursor-pointer relative z-50">
                       <Upload size={20} className="text-emerald-500" />
                       <div className="text-left">
                         <div className="text-[0.875rem] leading-snug font-black whitespace-nowrap">Backup wiederherstellen</div>
                         <div className="text-[0.625rem] text-slate-500 font-medium uppercase tracking-wider">Aus einer Sicherungsdatei (.json)</div>
                       </div>
                    </button>

                 </div>
              </div>
           )}

           {STEPS[currStep].title === 'Profil & Schule' && (
           <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700 ease-out">
             <div className="border-b border-slate-100 pb-2">
                <h3 className="text-[1.25rem] leading-normal font-black text-slate-800 flex items-center gap-3"><User className="text-emerald-500" size={22}/> Profil & Schule</h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-[24px] border border-slate-100">
                <div className="space-y-1.5">
                  <label className="text-[0.6875rem] font-black text-slate-700 uppercase tracking-wide">Anrede</label>
                  <select autoFocus value={anrede} onChange={e => setAnrede(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-slate-800 text-[0.875rem] leading-snug font-semibold outline-none transition-all shadow-sm">
                    <option value="">Keine Angabe</option>
                    <option value="Frau">Frau</option>
                    <option value="Herr">Herr</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[0.6875rem] font-black text-slate-700 uppercase tracking-wide">Vorname</label>
                  <input type="text" value={vorname} onChange={e => setVorname(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-slate-800 text-[0.875rem] leading-snug font-semibold outline-none transition-all shadow-sm" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[0.6875rem] font-black text-slate-700 uppercase tracking-wide">Nachname</label>
                  <input type="text" value={nachname} onChange={e => setNachname(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-slate-800 text-[0.875rem] leading-snug font-semibold outline-none transition-all shadow-sm" />
                  {legacyTeacherName && !app.nachname && (
                    <p className="text-[0.625rem] text-slate-500">Bestehender Anzeigename wurde übernommen. Bitte kurz prüfen.</p>
                  )}
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[0.6875rem] font-black text-slate-700 uppercase tracking-wide">Schulname</label>
                  <input type="text" value={schulName} onChange={e => setSchulName(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-slate-800 text-[0.875rem] leading-snug font-semibold outline-none transition-all shadow-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[0.6875rem] font-black text-slate-700 uppercase tracking-wide">Schulkennzahl</label>
                  <input type="text" value={schulkennzahl} onChange={e => setSchulkennzahl(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-slate-800 text-[0.875rem] leading-snug font-semibold outline-none transition-all shadow-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[0.6875rem] font-black text-slate-700 uppercase tracking-wide">Ort der Schule</label>
                  <input type="text" value={schulOrt} onChange={e => setSchulOrt(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-slate-800 text-[0.875rem] leading-snug font-semibold outline-none transition-all shadow-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[0.6875rem] font-black text-slate-700 uppercase tracking-wide">Bundesland</label>
                  {/* Kommentar: Schulautonome Tage und kurzfristige Änderungen sind nicht abgebildet. */}
                  <select 
                     value={bundesland} 
                     onChange={e => setBundesland(e.target.value as Bundesland)} 
                     className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-slate-800 text-[0.875rem] leading-snug font-semibold outline-none transition-all shadow-sm"
                  >
                    {Object.entries(BUNDESLAND_NAMEN).map(([code, name]) => (
                      <option key={code} value={code}>{name}</option>
                    ))}
                  </select>
                  <p className="text-[0.625rem] text-slate-500 font-medium leading-normal mt-1">
                    Ohne Gewähr – schulautonome Tage bitte selbst im Jahresplan ergänzen.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[0.6875rem] font-black text-slate-700 uppercase tracking-wide">Postleitzahl</label>
                  <input type="text" value={schulPlz} onChange={e => setSchulPlz(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-slate-800 text-[0.875rem] leading-snug font-semibold outline-none transition-all shadow-sm" />
                </div>
             </div>
           </div>
           )}

           {STEPS[currStep].title === 'Klasse' && (
             <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
               <div className="border-b border-slate-100 pb-2">
                 <h3 className="text-[1.25rem] leading-normal font-black text-slate-800 flex items-center gap-3">
                   <GraduationCap className="text-emerald-500" size={22}/> Klasse
                 </h3>
                 <p className="mt-1 text-[0.75rem] text-slate-500">
                   Lege hier nur die Grunddaten deiner Klasse fest. Design, Schrift und Darstellung kannst du später jederzeit in den Einstellungen ändern.
                 </p>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-[24px] border border-slate-100">
                 <div className="space-y-1.5">
                   <label className="text-[0.6875rem] font-black text-slate-700 uppercase tracking-wide">Klassenbezeichnung *</label>
                   <input
                     autoFocus
                     type="text"
                     placeholder="z. B. 3a"
                     value={klassenbezeichnung}
                     onChange={e => {
                       setKlassenbezeichnung(e.target.value);
                       if (e.target.value.trim()) setShowMissingKlassenbezeichnung(false);
                     }}
                     className={`w-full px-4 py-2.5 bg-white shadow-sm border focus:ring-4 rounded-xl text-slate-800 text-[0.875rem] leading-snug font-semibold outline-none transition-all ${showMissingKlassenbezeichnung ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/10' : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/10'}`}
                   />
                   {showMissingKlassenbezeichnung && (
                     <p className="text-[0.75rem] leading-tight text-rose-500 font-bold mt-1">Bitte gib eine Klassenbezeichnung ein.</p>
                   )}
                 </div>

                 <div className="space-y-1.5">
                   <label className="text-[0.6875rem] font-black text-slate-700 uppercase tracking-wide">Schuljahr *</label>
                   <select
                     value={schuljahr}
                     onChange={e => setSchuljahr(e.target.value)}
                     className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-slate-800 text-[0.875rem] leading-snug font-semibold outline-none transition-all shadow-sm cursor-pointer"
                   >
                     {schoolYearOptions.map(year => <option key={year} value={year}>{year}</option>)}
                   </select>
                 </div>

                 <div className="space-y-2 sm:col-span-2">
                   <label className="text-[0.6875rem] font-black text-slate-700 uppercase tracking-wide">Schulstufe *</label>
                   <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                     {[0, 1, 2, 3, 4].map(level => (
                       <button
                         key={level}
                         type="button"
                         onClick={() => setStufe(level)}
                         className={`py-2.5 rounded-xl text-[0.875rem] leading-snug font-black border transition-all ${stufe === level ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/10' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'}`}
                       >
                         {level === 0 ? 'Vorschule' : `${level}. Klasse`}
                       </button>
                     ))}
                   </div>
                 </div>
               </div>
             </div>
           )}

           {STEPS[currStep].title === 'Fächer' && (
           <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700 ease-out">
             <div className="border-b border-slate-100 pb-2">
                <h3 className="text-[1.25rem] leading-normal font-black text-slate-800 flex items-center gap-3"><Palette className="text-emerald-500" size={22}/> Fächer</h3>
                 <p className="mt-1 text-[0.75rem] text-slate-500">Wähle die Fächer deiner Klasse. Mit „Leistungen“ legst du fest, welche Fächer später in der Notenmappe geführt werden.</p>
             </div>
             
             <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100 space-y-5">
               <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Neues Fach..." 
                    value={newFach} 
                    onChange={e => setNewFach(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newFach.trim() && !faecher.includes(newFach.trim())) {
                        e.preventDefault();
                        setFaecher([...faecher, newFach.trim()]);
                        setFachConfig({...fachConfig, [newFach.trim()]: { color: 'slate' }});
                        setNewFach('');
                      }
                    }}
                    className="flex-1 px-4 py-2.5 bg-white shadow-sm border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-[0.875rem] leading-snug font-semibold transition-all"
                  />
                  <button onClick={() => {
                      if (newFach.trim() && !faecher.includes(newFach.trim())) {
                        setFaecher([...faecher, newFach.trim()]);
                        setFachConfig({...fachConfig, [newFach.trim()]: { color: 'slate' }});
                        setNewFach('');
                      }
                  }} className="px-6 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-all shadow-sm">
                    Hinzufügen
                  </button>
               </div>

               <div className="flex flex-wrap gap-2 pt-1 pb-1">
                  {FAECHER_ALLE.map(f => (
                    !faecher.includes(f) && (
                      <button key={f} onClick={() => {
                          setFaecher([...faecher, f]);
                          const color = DEFAULT_FACH_COLORS[f]?.color || 'slate';
                          setFachConfig({...fachConfig, [f]: { color: color }});
                      }} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[0.625rem] font-bold transition-all shadow-sm border border-slate-200">
                        + {f}
                      </button>
                    )
                  ))}
               </div>

               <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60 mt-4">
                 <button onClick={() => {
                    const newConfig = { ...fachConfig };
                    faecher.forEach(f => newConfig[f] = { ...(newConfig[f] || {}), unterrichtet: true });
                    setFachConfig(newConfig);
                 }} className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[0.625rem] font-black uppercase tracking-wider transition-all shadow-sm border border-emerald-200">
                   Alle für Leistungen aktivieren
                 </button>
                 <button onClick={() => {
                    const newConfig = { ...fachConfig };
                    faecher.forEach(f => newConfig[f] = { ...(newConfig[f] || {}), unterrichtet: false });
                    setFachConfig(newConfig);
                 }} className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[0.625rem] font-black uppercase tracking-wider transition-all shadow-sm border border-rose-200">
                   Alle für Leistungen deaktivieren
                 </button>
                 <button onClick={() => {
                    if (window.confirm("Bist du sicher? Alle benutzerdefinierten Fächer werden entfernt und die Standardfarben wiederhergestellt.")) {
                      setFaecher(FAECHER_ALLE);
                      setFachConfig(DEFAULT_FACH_COLORS);
                    }
                 }} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[0.625rem] font-black uppercase tracking-wider transition-all shadow-sm border border-slate-200 ml-auto">
                   Auf Standard zurücksetzen
                 </button>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                 {faecher.map(fach => {
                   const isUnterrichtet = fachConfig[fach]?.unterrichtet ?? true;
                   return (
                   <div key={fach} className={`flex items-center gap-2 bg-white p-2 rounded-xl border ${isUnterrichtet ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200'} shadow-sm transition-all`}>
                      <FachColorPicker
                        fach={fach}
                        currentColor={fachConfig[fach]?.color}
                        onChange={(newColor) => {
                          setFachConfig({
                            ...fachConfig,
                            [fach]: { ...(fachConfig[fach] || {}), color: newColor }
                          });
                        }}
                        compact={true}
                      />
                      
                      <span className="flex-1 text-[0.6875rem] font-bold text-slate-700 text-wrap leading-tight break-words">{fach}</span>
                      
                      <label className="flex items-center gap-1.5 cursor-pointer mr-2 bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm hover:border-emerald-200">
                        <input 
                          type="checkbox" 
                          checked={isUnterrichtet}
                          onChange={e => setFachConfig({...fachConfig, [fach]: { ...(fachConfig[fach]||{}), unterrichtet: e.target.checked }})}
                          className="w-3.5 h-3.5 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className={`text-[0.5625rem] font-black uppercase tracking-wider ${isUnterrichtet ? 'text-emerald-700' : 'text-slate-500'}`}>Leistungen</span>
                      </label>
                      <button onClick={() => setFaecher(faecher.filter(f => f !== fach))} className="text-slate-400 hover:text-rose-500 p-1 rounded-md transition-all shrink-0 bg-slate-50 hover:bg-rose-50 border border-transparent hover:border-rose-100">
                         <Trash2 size={14} />
                      </button>
                   </div>
                 );})}
               </div>
             </div>
           </div>
           )}

           {STEPS[currStep].title === 'Stundenplan' && (
           <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700 ease-out">
             <div className="border-b border-slate-100 pb-2">
                <h3 className="text-[1.25rem] leading-normal font-black text-slate-800 flex items-center gap-3"><Calendar className="text-emerald-500" size={22}/> Stundenplan</h3>
                 <p className="mt-1 text-[0.75rem] text-slate-500">Richte deinen Stammstundenplan in drei Schritten ein. Du kannst alles später jederzeit ändern.</p>
             </div>

             {/* Zeiten Setup Row */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
               <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100">
                  <div>
                    <h4 className="text-[0.6875rem] font-black text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-2">1. Unterrichtszeiten</h4>
                    <p className="text-[0.625rem] text-slate-500 font-medium leading-tight mb-4">Trage Beginn und Ende deiner Unterrichtsstunden ein. Nicht benötigte Stunden können leer bleiben.</p>
                  </div>
                 <div className="grid grid-cols-2 gap-3">
                   {[1,2,3,4,5,6,7,8,9,10].map(h => (
                       <div key={h} className="relative group">
                         <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[0.625rem] font-black text-slate-400 group-hover:text-emerald-500 transition-colors">{h}.</span>
                         <input type="text" value={stundenZeiten[h] || ''} onChange={e => setStundenZeiten((prev: any) => ({ ...prev, [h]: e.target.value }))} className="w-full pl-8 pr-8 py-2.5 text-[0.6875rem] bg-white border border-slate-200 focus:border-emerald-500 hover:border-emerald-300 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-slate-800 font-bold outline-none transition-all shadow-sm group-hover:shadow-md cursor-text" placeholder={`Zeit definieren`} />
                         <Edit3 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-emerald-500 transition-colors pointer-events-none" />
                       </div>
                   ))}
                 </div>
                 <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[0.6875rem] font-black text-slate-700 tracking-wide">Mittagspause einfügen nach Stunde:</div>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    {[4, 5, 6].map(h => (
                      <button key={h} onClick={() => setMittagspauseNachStunde(h)} className={`px-3 py-1 text-[0.6875rem] font-bold rounded-lg transition-all ${mittagspauseNachStunde === h ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>
                        {h}. Stunde
                      </button>
                    ))}
                  </div>
                 </div>
               </div>
               
               <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100">
                 <div className="flex justify-between items-center mb-4">
                   <h4 className="text-[0.6875rem] font-black text-slate-700 uppercase tracking-wide">2. Stunden pro Tag</h4>
                   <div className="flex items-center gap-2">
                     <button onClick={magicAutofillStammplan} className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[0.625rem] font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5">
                       <Sparkles size={12} /> Automatisch verteilen
                     </button>
                     <span className="text-[0.625rem] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Unterrichtstage festlegen</span>
                   </div>
                 </div>
                 <div className="space-y-2">
                   {TAGE_NAMEN.map(tag => {
                        const stundenArr = tageplan[tag]?.stunden || [1,2,3,4,5];
                        return (
                          <div key={tag} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-[0.75rem] leading-tight font-bold text-slate-700">{tag}</span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(h => {
                                const isActive = stundenArr.includes(h);
                                return (
                                  <button 
                                    key={h}
                                    onClick={() => {
                                      setTageplan((p: any) => {
                                        const currentArr = p[tag]?.stunden || [1,2,3,4,5];
                                        const newArr = isActive ? currentArr.filter((x: number) => x !== h) : [...currentArr, h].sort((a: number, b: number) => a - b);
                                        return { ...p, [tag]: { stunden: newArr } };
                                      });
                                      if (isActive) {
                                        setStammplan((p: any) => {
                                          const newStamm = { ...p };
                                          if (newStamm[tag]) {
                                            const updatedDay = { ...newStamm[tag] };
                                            delete updatedDay[h];
                                            newStamm[tag] = updatedDay;
                                          }
                                          return newStamm;
                                        });
                                      }
                                    }}
                                    className={`w-6 h-6 rounded flex items-center justify-center text-[0.625rem] font-black transition-all ${isActive ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                  >
                                    {h}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                    })}
                 </div>
               </div>
             </div>

             <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
               {/* 5. Stammstundenplan */}
               <div className="xl:col-span-8 sm:overflow-x-auto border border-slate-200 rounded-[24px] bg-slate-50 p-4 sm:p-6 soft-scrollbar">
                   <div className="mb-4">
                     <h4 className="text-[0.6875rem] font-black text-slate-700 uppercase tracking-wide">3. Fächer eintragen</h4>
                     <p className="mt-1 text-[0.625rem] text-slate-500 font-medium leading-tight">Wähle für jede aktive Stunde das passende Fach. Freie Stunden können leer bleiben.</p>
                   </div>
                   
                   {/* Mobile View */}
                   <div className="block sm:hidden">
                      <div className="flex bg-slate-200/50 p-1 rounded-xl mb-4 overflow-x-auto hide-scrollbar">
                         {TAGE_NAMEN.map(tag => (
                           <button 
                             key={tag}
                             onClick={() => setActiveMobileDay(tag)}
                             className={`flex-1 min-w-[60px] py-2 text-[0.625rem] font-black uppercase tracking-wider rounded-lg transition-all ${activeMobileDay === tag ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                           >
                             {tag.slice(0,2)}
                           </button>
                         ))}
                      </div>
                      
                      <div className="space-y-2">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(h => {
                            if (h === mittagspauseNachStunde + 1) {
                              return (
                                <div key={`pause-${h}`} className="flex items-center justify-center gap-4 my-3">
                                  <div className="h-px bg-slate-200 flex-1"></div>
                                  <div className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">Mittagspause</div>
                                  <div className="h-px bg-slate-200 flex-1"></div>
                                </div>
                              );
                            }

                            const isActive = tageplan[activeMobileDay]?.stunden?.includes(h);
                            if (!isActive) return null;
                            
                            const selectedFach = stammplan[activeMobileDay]?.[h];
                             const configColorKey = getFachColorKey(selectedFach);
                            let colorClass = '';
                            let inlineStyle: any = undefined;
                            if(configColorKey) {
                              const bgc = bgDict[configColorKey];
                              if(bgc) inlineStyle = { backgroundColor: `${bgc}20`, borderColor: `${bgc}40`, color: bgc };
                              colorClass = `font-black border-2`;
                            } else if (selectedFach) {
                              colorClass = `font-black border-2 bg-slate-50 border-slate-200 text-slate-700`;
                            } else {
                              colorClass = 'bg-slate-50 border-2 border-dashed border-slate-200 hover:bg-slate-100 text-slate-500';
                            }

                            return (
                              <div key={h} className="flex grid grid-cols-[30px_1fr] gap-3 items-center">
                                <div className="text-[0.625rem] font-black text-slate-500 text-center bg-white border border-slate-200 w-8 h-8 rounded-lg shadow-sm flex items-center justify-center">
                                  {h}.
                                </div>
                                <div className="relative">
                                  <select 
                                    className={`w-full h-10 text-[0.6875rem] font-bold shadow-sm border rounded-xl appearance-none px-3 pr-4 focus:border-emerald-500 transition-all ${colorClass}`}
                                    style={inlineStyle}
                                    value={selectedFach || ''}
                                    onChange={e => setStammplan((prev: any) => ({
                                      ...prev,
                                      [activeMobileDay]: { ...(prev[activeMobileDay] || {}), [h]: e.target.value }
                                    }))}
                                  >
                                    <option value="">— (Frei)</option>
                                    {stammplanFaecher.map(f => {
                                      const label = f === 'Bildnerische Erziehung' ? 'Bildn. Erz.' : f === 'Technisches/Textiles Werken' ? 'Werken' : f === 'Bewegung und Sport' ? 'Bew. & Sport' : f === 'Sachunterricht' ? 'Sachunterr.' : f === 'Werken (TEC)' ? 'Werken (Tech.)' : f === 'Werken (TEX)' ? 'Werken (Textil)' : f.length > 20 ? f.slice(0, 18) + '...' : f;
                                      return <option key={f} value={f}>{label}</option>;
                                    })}
                                  </select>
                                </div>
                              </div>
                            );
                        })}
                      </div>
                   </div>

                   {/* Desktop View */}
                   <div className="hidden sm:block min-w-[500px] space-y-2">
                     <div className="grid grid-cols-6 gap-2">
                       <div className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest text-center pt-2">Std.</div>
                       {TAGE_NAMEN.map(tag => (
                         <div key={tag} className="text-[0.625rem] font-black text-slate-700 uppercase tracking-widest text-center">{tag.slice(0,2)}</div>
                       ))}
                     </div>
                     {Array.from({ length: 10 }, (_, i) => i + 1).map(h => (
                       <React.Fragment key={h}>
                         {h === mittagspauseNachStunde + 1 && (
                           <div className="grid grid-cols-6 gap-2 my-2 items-center">
                             <div className="col-span-6 flex items-center justify-center gap-4">
                               <div className="h-px bg-slate-200 flex-1"></div>
                               <div className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">Mittagspause</div>
                               <div className="h-px bg-slate-200 flex-1"></div>
                             </div>
                           </div>
                         )}
                         <div className="grid grid-cols-6 gap-2 items-center">
                           <div className="text-[0.625rem] font-black text-slate-500 text-center bg-white border border-slate-200 w-8 h-8 mx-auto flex items-center justify-center rounded-lg shadow-sm">{h}.</div>
                           {TAGE_NAMEN.map(tag => {
                             const isActive = tageplan[tag]?.stunden?.includes(h);
                             if (!isActive) return <div key={tag} className="bg-slate-50/50 border border-dashed border-slate-200 rounded-lg h-8 opacity-40 mix-blend-multiply" />;
                             const selectedFach = stammplan[tag]?.[h];
                             const configColorKey = getFachColorKey(selectedFach);
                             let colorClass = '';
                             let inlineStyle: any = undefined;
                             if(configColorKey) {
                               const bgc = bgDict[configColorKey];
                               if(bgc) inlineStyle = { backgroundColor: `${bgc}20`, borderColor: `${bgc}40`, color: bgc };
                               colorClass = `font-black border-2`;
                             } else if (selectedFach) {
                               colorClass = `font-black border-2 bg-white border-slate-200 text-slate-700`;
                             } else {
                               colorClass = 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600';
                             }
                             
                             return (
                               <div key={tag} className="relative"
                                 onDragOver={e => e.preventDefault()}
                                 onDrop={e => {
                                   e.preventDefault();
                                   try {
                                     const data = JSON.parse(e.dataTransfer.getData('application/json'));
                                     if(data && data.type === 'fach' && data.value) {
                                       setStammplan((prev: any) => ({
                                         ...prev,
                                         [tag]: { ...(prev[tag] || {}), [h]: data.value }
                                       }));
                                     }
                                   } catch(err) {}
                                 }}
                               >
                                 <select 
                                   className={`w-full h-8 text-[0.625rem] shadow-sm border rounded-lg appearance-none px-2 pr-4 focus:border-emerald-500 transition-all ${colorClass}`}
                                   style={inlineStyle}
                                   value={selectedFach || ''}
                                   onChange={e => setStammplan((prev: any) => ({
                                     ...prev,
                                     [tag]: { ...(prev[tag] || {}), [h]: e.target.value }
                                   }))}
                                 >
                                   <option value="">— (Frei)</option>
                                   {stammplanFaecher.map(f => {
                                     const label = f === 'Bildnerische Erziehung' ? 'Bildnerische' : f === 'Technisches/Textiles Werken' ? 'Werken' : f === 'Bewegung und Sport' ? 'Bew. & Sport' : f === 'Sachunterricht' ? 'Sachunterricht' : f === 'Werken (TEC)' ? 'Werken (Tech.)' : f === 'Werken (TEX)' ? 'Werken (Textil)' : f.length > 20 ? f.slice(0, 18) + '...' : f;
                                     return <option key={f} value={f}>{label}</option>;
                                   })}
                                 </select>
                               </div>
                             );
                           })}
                         </div>
                       </React.Fragment>
                     ))}
                   </div>
                 </div>

               {/* Stundentafel Widget (Visual Chart) */}
               <div className="xl:col-span-4 bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm xl:sticky top-[100px]">
                 <div className="flex justify-between items-end mb-4 border-b border-slate-100 pb-3">
                   <div>
                     <h4 className="text-[0.6875rem] font-black text-slate-700 uppercase tracking-wide mb-1">Wochenstunden im Blick</h4>
                     <p className="text-[0.625rem] text-slate-500 font-medium leading-tight">Wochenstunden lt. Lehrplan {stufe === 0 ? 'V' : stufe}.Klasse</p>
                   </div>
                   <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100"><Calendar size={14} /></div>
                 </div>
                 
                 <div className="space-y-3">
                   {Object.entries(currentStundentafel).map(([fach, defaultAnzahl]) => {
                     if (fach === 'Gesamt') return null;
                     const istZahl = typeof defaultAnzahl === 'number';
                     const selectedCount = getSubjectCount(fach);
                     
                     // Style calculation
                     const targetBase = istZahl && (defaultAnzahl as number) > 0 ? (defaultAnzahl as number) : 1;
                     const displayPercent = Math.min(100, (selectedCount / targetBase) * 100);
                     
                     const isComplete = istZahl && selectedCount >= (defaultAnzahl as number);
                     const isOver = istZahl && selectedCount > (defaultAnzahl as number);

                     const configColor = getFachColorKey(fach) || 'slate';
                     const hexColor = bgDict[configColor];

                     return (
                       <div key={fach} 
                         className="group cursor-grab active:cursor-grabbing hover:bg-slate-50 p-1.5 -mx-1.5 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                         draggable
                         onDragStart={(e) => {
                           e.dataTransfer.setData('application/json', JSON.stringify({ type: 'fach', value: fach }));
                         }}
                       >
                         <div className="flex justify-between items-center mb-1">
                           <span className="text-[0.625rem] font-bold text-slate-700 text-wrap leading-tight break-words mr-2" title={fach}>
                             {fach === 'Bildnerische Erziehung' ? 'Bildnerische Erz.' : fach === 'Technisches/Textiles Werken' ? 'Werken (TEC/TEX)' : fach === 'Bewegung und Sport' ? 'Bewegung & Sport' : fach === 'Werken (TEC)' ? 'Werken (Technisch)' : fach === 'Werken (TEX)' ? 'Werken (Textil)' : fach}
                           </span>
                           <div className="flex items-center gap-1 text-[0.625rem] shrink-0">
                             {istZahl ? (
                               <span className={`font-black ${isComplete ? (isOver ? 'text-amber-600' : 'text-emerald-600') : 'text-slate-500'}`}>
                                 {selectedCount} <span className="text-slate-300 font-medium">/ {defaultAnzahl as React.ReactNode}</span>
                               </span>
                             ) : (
                               <span className="font-bold text-slate-400">{defaultAnzahl as React.ReactNode}</span>
                             )}
                           </div>
                         </div>
                         
                         {istZahl && (
                           <div className="relative h-2.5 w-full bg-slate-100 rounded-full ">
                             {/* Actual progress bar */}
                             <div 
                               className={`absolute top-0 left-0 bottom-0 rounded-full transition-all duration-500 z-10 ${isOver ? 'bg-amber-400' : isComplete ? 'bg-emerald-500' : 'bg-emerald-400/80'}`}
                               style={{ width: `${displayPercent}%`, backgroundColor: displayPercent > 0 && !isComplete ? hexColor : undefined }}
                             />
                           </div>
                         )}
                       </div>
                     );
                   })}
                 </div>
               </div>
             </div>
           </div>
           )}

           {STEPS[currStep].title === 'Schüler' && (
           <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700 ease-out">
             <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
                <div>
                  <h3 className="text-[1.25rem] leading-normal font-black text-slate-800 flex items-center gap-3"><Users className="text-emerald-500" size={22}/> Schülerliste ({studentsList.length})</h3>
                </div>
               <button onClick={() => setIsKlassenlistImportOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[0.625rem] font-bold uppercase tracking-wider rounded-lg transition-all border border-emerald-100 shadow-sm">
                    <FileUp size={12} /> Liste / Excel importieren
               </button>
             </div>

             {studentMessage && (
               <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[0.75rem] font-semibold text-slate-600">
                 <span>{studentMessage}</span>
                 <div className="flex items-center gap-2">
                   {lastRemovedStudent && (
                     <button
                       type="button"
                       onClick={() => {
                         setStudentsList(prev => [...prev, lastRemovedStudent]);
                         setLastRemovedStudent(null);
                         setStudentMessage('Löschen rückgängig gemacht.');
                       }}
                       className="flex items-center gap-1 font-black text-emerald-700 hover:text-emerald-800"
                     >
                       <RotateCcw size={13} /> Rückgängig
                     </button>
                   )}
                   <button type="button" onClick={() => { setStudentMessage(null); setLastRemovedStudent(null); }} className="text-slate-400 hover:text-slate-700">Schließen</button>
                 </div>
               </div>
             )}

             {csvError && (
               <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl flex items-start gap-3">
                 <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                 <div>
                   <h4 className="font-bold text-[0.875rem] leading-snug">Fehler beim Einlesen</h4>
                   <p className="text-[0.75rem] leading-tight mt-1 opacity-90">Es konnten keine Schüler in der CSV-Datei gefunden werden. Bitte überprüfe das Format (Sokrates).</p>
                   <button onClick={() => setCsvError(false)} className="mt-2 text-[0.625rem] font-black uppercase tracking-wider bg-rose-200 hover:bg-rose-300 px-3 py-1.5 rounded-lg transition-colors">Verstanden</button>
                 </div>
               </div>
             )}

             {csvPreview && (
               <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl animate-in fade-in zoom-in-95 duration-200">
                 <div className="flex items-center justify-between mb-4">
                   <h4 className="font-black text-indigo-900 flex items-center gap-2">
                     <Check size={18} className="text-indigo-500" />
                     {csvPreview.length} Schüler gefunden
                   </h4>
                   <div className="flex items-center gap-2">
                     <button onClick={() => setCsvPreview(null)} className="px-3 py-1.5 text-[0.625rem] font-bold text-slate-500 hover:bg-slate-200/50 rounded-lg transition-colors uppercase tracking-wider">
                       Abbrechen
                     </button>
                     <button onClick={() => {
                       mergeStudents(csvPreview);
                       setCsvPreview(null);
                     }} className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-[0.625rem] font-black uppercase tracking-wider rounded-lg transition-colors shadow-sm">
                       Jetzt Importieren
                     </button>
                   </div>
                 </div>
                 
                 <div className="bg-white border border-indigo-100 rounded-xl ">
                   <div className="max-h-48 overflow-y-auto w-full">
                     <table className="w-full text-left text-[0.75rem] leading-tight">
                       <thead className="bg-slate-50 sticky top-0 z-10">
                         <tr>
                           <th className="px-3 py-2 font-black text-slate-500 border-b border-slate-100">#</th>
                           <th className="px-3 py-2 font-black text-slate-500 border-b border-slate-100">Vorname</th>
                           <th className="px-3 py-2 font-black text-slate-500 border-b border-slate-100">Nachname</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                         {csvPreview.slice(0, 10).map((s, idx) => (
                           <tr key={idx} className="hover:bg-slate-50/50">
                             <td className="px-3 py-1.5 text-slate-400 font-medium">{idx + 1}</td>
                             <td className="px-3 py-1.5 font-bold text-slate-700">{s.vorname}</td>
                             <td className="px-3 py-1.5 font-bold text-slate-700">{s.nachname}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                     {csvPreview.length > 10 && (
                       <div className="p-2 text-center text-[0.625rem] font-bold text-slate-400 bg-slate-50/50 border-t border-slate-100">
                         ... und {csvPreview.length - 10} weitere
                       </div>
                     )}
                   </div>
                 </div>
               </div>
             )}

             {studentsList.length === 0 && activeInputMode === 'choice' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-6">
                <div 
                  onClick={() => setActiveInputMode('manual')}
                  className="p-6 bg-white border border-slate-200 rounded-[24px] shadow-sm hover:border-emerald-500 hover:shadow-lg hover:shadow-slate-100 cursor-pointer transition-all flex flex-col items-center text-center group"
                >
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Users size={20} />
                  </div>
                  <h4 className="text-[0.875rem] font-black text-slate-800">Jetzt eingeben</h4>
                  <p className="text-[0.75rem] text-slate-400 mt-2 leading-relaxed">
                    Tippe deine Schülerinnen und Schüler manuell nacheinander ein.
                  </p>
                </div>

                <div 
                  onClick={nextStep}
                  className="p-6 bg-white border border-slate-200 rounded-[24px] shadow-sm hover:border-slate-400 hover:shadow-lg hover:shadow-slate-100 cursor-pointer transition-all flex flex-col items-center text-center group"
                >
                  <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Clock size={20} />
                  </div>
                  <h4 className="text-[0.875rem] font-black text-slate-800">Später eingeben</h4>
                  <p className="text-[0.75rem] text-slate-400 mt-2 leading-relaxed">
                    Füge die Namen deiner Schülerinnen und Schüler zu einem späteren Zeitpunkt hinzu.
                  </p>
                </div>

                <div 
                  onClick={() => setIsKlassenlistImportOpen(true)}
                  className="p-6 bg-white border border-emerald-200 rounded-[24px] shadow-sm hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/5 cursor-pointer transition-all flex flex-col items-center text-center group"
                >
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <FileUp size={20} />
                  </div>
                  <h4 className="text-[0.875rem] font-black text-emerald-700 border-b border-transparent">📋 Liste / Excel importieren</h4>
                  <p className="text-[0.75rem] text-emerald-600 mt-2 leading-relaxed">
                    Bequemer Import als CSV-Datei oder per Copy-Paste direkt aus Excel.
                  </p>
                </div>

                <div 
                  onClick={() => sokratesFileInputRef.current?.click()}
                  className="p-6 bg-white border border-indigo-200 rounded-[24px] shadow-sm hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/5 cursor-pointer transition-all flex flex-col items-center text-center group"
                >
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <FileUp size={20} />
                  </div>
                  <h4 className="text-[0.875rem] font-black text-indigo-700">Sokrates importieren</h4>
                  <p className="text-[0.75rem] text-indigo-600 mt-2 leading-relaxed">
                    Übernimm Schülerdaten aus einer Sokrates-PDF oder CSV und prüfe sie vor dem Import.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100 relative">
                <div className="flex justify-between items-center mb-4 gap-2">
                  {studentsList.length === 0 ? (
                    <button 
                      onClick={() => setActiveInputMode('choice')}
                      className="text-[0.6875rem] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors animate-in fade-in"
                    >
                      ← Zurück zur Auswahl
                    </button>
                  ) : (
                    <div />
                  )}

                </div>
               <div className="flex flex-col sm:flex-row gap-3 mb-6">
                 <input type="text" ref={vornameRef} autoFocus placeholder="Vorname" value={currentStudent.vorname} onChange={e => setCurrentStudent(p => ({ ...p, vorname: e.target.value }))} className="flex-1 px-4 py-3 text-[0.875rem] leading-snug border border-slate-200 bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl font-semibold shadow-sm transition-all"         onKeyDown={e => {
          if (e.key === 'Enter' && currentStudent.vorname) {
            e.preventDefault();
            nachnameRef.current?.focus();
          }
        }}/>
                 <input type="text" ref={nachnameRef} placeholder="Nachname" value={currentStudent.nachname} onChange={e => setCurrentStudent(p => ({ ...p, nachname: e.target.value }))} className="flex-1 px-4 py-3 text-[0.875rem] leading-snug border border-slate-200 bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl font-semibold shadow-sm transition-all"         onKeyDown={e => {
          if (e.key === 'Enter' && currentStudent.nachname) {
            e.preventDefault();
            addStudent();
          }
        }} />
                 <button onClick={addStudent} disabled={!currentStudent.vorname.trim() || !currentStudent.nachname.trim()} className="px-8 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-black uppercase tracking-wider text-[0.75rem] leading-tight transition-all shadow-sm h-12 flex items-center justify-center w-full sm:w-auto">Hinzufügen</button>
               </div>

               {studentsList.length > 0 ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                   {studentsList.map((kid, kIdx) => (
                     <div key={kid.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-emerald-200 transition-all group">
                       <div className="flex items-center gap-3 ">
                         <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-500 text-[0.625rem] font-black flex items-center justify-center shrink-0">
                           {kIdx + 1}
                         </div>
                         <span className="text-[0.75rem] font-black text-slate-700 text-wrap leading-tight break-words">{kid.name}</span>
                       </div>
                       <button aria-label={`${kid.name} entfernen`} onClick={() => removeStudent(kid.id)} className="text-slate-400 hover:text-rose-500 p-1.5 bg-slate-50 hover:bg-rose-50 rounded-lg transition-all shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100">
                         <Trash2 size={14} />
                       </button>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
                   <Users size={48} className="text-slate-200" />
                   <p className="text-[0.875rem] leading-snug font-medium">Bisher keine Schüler hinzugefügt.</p>
                 </div>
               )}
             </div>
             )}
           </div>
           )}

           {STEPS[currStep].title === 'Übersicht' && (
             <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
               <div className="text-center">
                 <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                   <ListChecks size={30} />
                 </div>
                 <h3 className="text-2xl font-black text-slate-900">Bereit für deine Klasse</h3>
                 <p className="text-slate-500 mt-2">Prüfe die wichtigsten Angaben. Hinweise verhindern das Speichern nicht.</p>
               </div>

               <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                 {[
                   ['Klasse', klassenbezeichnung || '–'],
                   ['Schuljahr', schuljahr || '–'],
                   ['Schulstufe', stufe === 0 ? 'Vorschule' : `${stufe}. Klasse`],
                   ['Schüler:innen', String(studentsList.length)],
                   ['Aktive Fächer', String(activeSubjects.length)],
                   ['Stundenplan', `${assignedLessonSlots} von ${availableLessonSlots} Feldern`]
                 ].map(([label, value]) => (
                   <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                     <div className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400">{label}</div>
                     <div className="mt-1 text-[0.9375rem] font-black text-slate-800">{value}</div>
                   </div>
                 ))}
               </div>

               <div className={`rounded-2xl border p-5 ${setupWarnings.length ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
                 <div className="flex items-center gap-2 font-black text-slate-800">
                   {setupWarnings.length ? <AlertCircle size={18} className="text-amber-600" /> : <ShieldCheck size={18} className="text-emerald-600" />}
                   {setupWarnings.length ? 'Noch offene Hinweise' : 'Alles Wesentliche ist eingerichtet'}
                 </div>
                 {setupWarnings.length > 0 && (
                   <ul className="mt-3 space-y-2 text-[0.8125rem] text-slate-700">
                     {setupWarnings.map(warning => <li key={warning}>• {warning}</li>)}
                   </ul>
                 )}
               </div>

               {setupMode === 'quick' && (
                 <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-[0.8125rem] text-indigo-800">
                   <strong>Schnellmodus:</strong> Fächer und Stammstundenplan kannst du jederzeit unter „Klassen-Einstellungen“ ergänzen.
                 </div>
               )}
             </div>
           )}

        </div>

        <div className="shrink-0 border-t border-slate-100 bg-white/95 backdrop-blur-sm px-4 md:px-6 py-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={prevStep}
            disabled={currStep === 0}
            className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-0 disabled:pointer-events-none font-bold text-[0.75rem] leading-tight uppercase tracking-wider rounded-xl transition-all"
          >
            Zurück
          </button>

          <div className="hidden sm:block text-[0.6875rem] font-semibold text-slate-400">
            {STEPS[currStep].title}
          </div>

          {currStep === STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => handleSaveAndComplete()}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[0.75rem] leading-tight uppercase tracking-wider rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              {isEditing ? 'Änderungen speichern' : isNewClass ? 'Klasse anlegen' : 'Einrichtung abschließen'} <Check size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[0.75rem] leading-tight uppercase tracking-wider rounded-xl shadow-md shadow-emerald-900/20 transition-all"
            >
              {currStep === 0 ? 'Einrichtung starten' : 'Weiter'}
            </button>
          )}
        </div>
      </div>
      {isKlassenlistImportOpen && (
        <KlassenlistenImport
          onClose={() => setIsKlassenlistImportOpen(false)}
          onImport={(importedStudents, meta) => {
            mergeStudents(importedStudents);
            if (meta?.klasse) setKlassenbezeichnung(meta.klasse);
            if (meta?.schuljahr) setSchuljahr(meta.schuljahr);
            if (meta?.lehrerName) applyTeacherName(meta.lehrerName);
            if (meta?.schulName) setSchulName(meta.schulName);
            if (meta?.schulkennzahl) setSchulkennzahl(meta.schulkennzahl);
            setActiveInputMode('manual');
            setIsKlassenlistImportOpen(false);
          }}
        />
      )}
    </div>
  );
}
