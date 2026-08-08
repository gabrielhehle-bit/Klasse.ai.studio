import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import Markdown from 'react-markdown';
import { useMaterialLibrary } from './Materialbibliothek';
import { LEHRPLAN_VS_2023 } from '../lehrplan';
import { 
  Sparkles, FileText, Printer, Copy, Check, Save, Trash2, 
  UserCheck, AlertCircle, RefreshCw, PenTool, CheckCircle, 
  Plus, X, HelpCircle, BookOpen, Layers, History, Settings,
  Award, Globe, Smile, Lightbulb, Compass, FileCheck
} from 'lucide-react';

interface SavedWorksheet {
  id: string;
  title: string;
  subject: string;
  topic: string;
  level: string;
  targetStudents: string[]; // names or IDs
  content: string;
  timestamp: number;
  modus?: string;
  interessen?: string;
}

interface WorksheetGeneratorProps {
  initialStudentId?: string;
  embeddedMode?: boolean;
}

export default function WorksheetGenerator({ initialStudentId, embeddedMode = false }: WorksheetGeneratorProps = {}) {
  const { app } = useApp();
  const { showToast } = useToast();
  const { addMaterialFromAI } = useMaterialLibrary();

  const students = app.schueler || [];
  const studentNotes = app.schuelerNotizen || {};

  // Form states
  const [selectedStudents, setSelectedStudents] = useState<string[]>(initialStudentId ? [initialStudentId] : []);
  const [subject, setSubject] = useState<string>('Deutsch');
  const [worksheetType, setWorksheetType] = useState<string>('Lückentext mit Lösungsbox');
  const [level, setLevel] = useState<'easy' | 'medium' | 'hard' | 'gifted'>('medium');
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  const [manualInstructions, setManualInstructions] = useState<string>('');
  
  // Austrian curriculum new options
  const [modus, setModus] = useState<'förderung' | 'klassenuebung' | 'test' | 'schularbeit'>('förderung');
  const [interessen, setInteressen] = useState<string>('Kein Storytelling (Klassisch)');
  const [customInteressen, setCustomInteressen] = useState<string>('');
  const [isCustomInteressenActive, setIsCustomInteressenActive] = useState<boolean>(false);

  // Layout expansion states (horizontal alignment collapsible details)
  const [showPresets, setShowPresets] = useState<boolean>(false);
  const [showMediathek, setShowMediathek] = useState<boolean>(false);

  // User Mode Option Preferences (Simple vs Expert / Stack vs Split Layout)
  const [generatorMode, setGeneratorMode] = useState<'simple' | 'expert'>('simple');

  useEffect(() => {
    if (initialStudentId) {
      setSelectedStudents([initialStudentId]);
      const student = students.find(s => s.id === initialStudentId);
      if (student) {
        const hasGiftedNotiz = student.notiz?.toLowerCase().includes('begab') || student.notiz?.toLowerCase().includes('hochbegab') || student.notiz?.toLowerCase().includes('stark');
        const hasStaerken = student.foerderprofil?.staerken && student.foerderprofil.staerken.length > 0;
        if (hasGiftedNotiz || hasStaerken) {
          setLevel('gifted');
        }
      }
    } else if (embeddedMode) {
      setSelectedStudents([]);
    }
  }, [initialStudentId, students, embeddedMode]);
  
  // Custom subject/type inputs
  const [customSubject, setCustomSubject] = useState<string>('');
  const [isCustomSubjectActive, setIsCustomSubjectActive] = useState<boolean>(false);
  const [customType, setCustomType] = useState<string>('');
  const [isCustomTypeActive, setIsCustomTypeActive] = useState<boolean>(false);

  // Result states
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [worksheetTitle, setWorksheetTitle] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [tempEditedContent, setTempEditedContent] = useState<string>('');
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  // Library/History state
  const [savedWorksheets, setSavedWorksheets] = useState<SavedWorksheet[]>([]);
  const [activeSavedId, setActiveSavedId] = useState<string | null>(null);

  // Load history from localStorage
  useEffect(() => {
    const localData = localStorage.getItem('school_worksheets');
    if (localData) {
      try {
        setSavedWorksheets(JSON.parse(localData));
      } catch (e) {
        console.error('Error loading saved worksheets', e);
      }
    }
  }, []);

  // Sync saved list to localStorage
  const saveToLocal = (updated: SavedWorksheet[]) => {
    setSavedWorksheets(updated);
    localStorage.setItem('school_worksheets', JSON.stringify(updated));
  };

  // Pre-defined values
  const subjects = ['Deutsch', 'Mathematik', 'Sachunterricht', 'Englisch'];
  
  const worksheetTypes: Record<string, string[]> = {
    'Deutsch': [
      'Diagnostischer Kurztest',
      'Lückentext mit Lösungsbox',
      'Leseverständnistext mit 3-5 Fragen',
      'Rechtschreib-Suchspiel (Fehler finden)',
      'Satzglieder-Puzzle / Satzbau-Übungen',
      'Schreibanlass mit Reizwörtern & Satzanfängen',
      'Grammatik-Übung (Wortarten bestimmen)',
      'Silben- und Lesetraining'
    ],
    'Mathematik': [
      'Diagnostischer Kurztest',
      'Rechenrätsel & Sachaufgaben',
      'Einmaleins-Malreihen Training',
      'Kopfrechen-Blatt (Grundrechenarten)',
      'Zahlenraum-Orientierung & Zahlenstrahl',
      'Schriftliches Rechnen Schritt-für-Schritt',
      'Geometrische Formen & Logik-Rätsel',
      'Größen umwandeln (Zeit, Geld, Längen)'
    ],
    'Sachunterricht': [
      'Lesegrundlage & Wissensfragen',
      'Begriffe zuordnen (Bild/Text)',
      'Steckbrief-Vorlage erstellen',
      'Richtig-oder-Falsch-Quiz',
      'Experimentier-Protokoll & Lückentext'
    ],
    'Englisch': [
      'Vocabulary Matching (Bild/Wort)',
      'Satzstrukturen & einfache Antworten',
      'Liedtext/Reim mit Lücken'
    ],
    'Sonstiges': [
      'Wissens-Suchsel / Wortgitter',
      'Assoziations-Übung / Brainstorming',
      'Kreatives Malen und Schreiben kombiniert'
    ]
  };

  const currentTypes = worksheetTypes[isCustomSubjectActive ? 'Sonstiges' : subject] || worksheetTypes['Sonstiges'];

  // Automatically fetch needs and strengths for selected students
  const aggregatedStudentInfo = useMemo(() => {
    if (selectedStudents.length === 0) return { needs: [], strengths: [], notes: [] };

    const collectedNeeds: string[] = [];
    const collectedStrengths: string[] = [];
    const collectedNotes: string[] = [];

    selectedStudents.forEach(id => {
      const student = students.find(s => s.id === id);
      if (!student) return;

      // Strengths
      if (student.foerderprofil?.staerken) {
        student.foerderprofil.staerken.forEach(s => {
          if (s && !collectedStrengths.includes(s)) collectedStrengths.push(s);
        });
      }

      // Needs
      if (student.foerderprofil?.foerderbedarfBereiche) {
        student.foerderprofil.foerderbedarfBereiche.forEach(n => {
          if (n && !collectedNeeds.includes(n)) collectedNeeds.push(n);
        });
      }

      // Goals
      if (student.foerderprofil?.foerderziele) {
        student.foerderprofil.foerderziele.forEach(g => {
          if (g.ziel && g.status !== 'erreicht') {
            const goalText = `Ziel: ${g.ziel} (${g.bereich || ''})`;
            if (!collectedNeeds.includes(goalText)) collectedNeeds.push(goalText);
          }
        });
      }

      // Attributes
      if (student.charakter) {
        student.charakter.forEach(c => {
          if (c && !collectedStrengths.includes(`Charakter: ${c}`)) collectedStrengths.push(`Charakter: ${c}`);
        });
      }

      // Specific manual notes
      const note = studentNotes[id];
      if (note && typeof note === 'string') {
        collectedNotes.push(`${student.vorname}: ${note}`);
      } else if (student.notiz) {
        collectedNotes.push(`${student.vorname}: ${student.notiz}`);
      }
    });

    return {
      needs: collectedNeeds.filter(Boolean),
      strengths: collectedStrengths.filter(Boolean),
      notes: collectedNotes.filter(Boolean)
    };
  }, [selectedStudents, students, studentNotes]);

  // Handle select/deselect all student needs
  const toggleNeed = (need: string) => {
    setSelectedNeeds(prev => 
      prev.includes(need) ? prev.filter(n => n !== need) : [...prev, need]
    );
  };

  // Toggle single student selection
  const toggleStudent = (id: string) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  // Select all kids with SPF or DAZ or diagnosed need
  const selectSpecialNeedsKids = () => {
    const targetIds = students
      .filter(s => s.spf || s.daz || s.foerderprofil?.foerderbedarfBereiche?.length)
      .map(s => s.id);
    
    if (targetIds.length > 0) {
      setSelectedStudents(targetIds);
      showToast('Kinder mit Förderbedarf/DAZ/SPF ausgewählt.', 'success');
    } else {
      showToast('Keine Kinder mit explizit eingetragenem Förderbedarf gefunden.', 'info');
    }
  };

  // Select all students helper
  const selectAllStudents = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.id));
    }
  };

  // API worksheet generator trigger
  const handleGenerate = async () => {
    const finalSubject = isCustomSubjectActive ? customSubject : subject;
    const finalType = isCustomTypeActive ? customType : worksheetType;
    const finalInteressen = isCustomInteressenActive ? customInteressen : interessen;

    if (!finalSubject.trim()) {
      showToast('Bitte wähle oder schreibe ein Schulfach.', 'error');
      return;
    }
    if (!finalType.trim()) {
      showToast('Bitte wähle oder schreibe einen Aufgabentyp.', 'error');
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');

    // Pre-calculate title
    const computedLevel = level === 'easy' 
      ? 'Basis A (Unterstützend)' 
      : level === 'hard' 
        ? 'Erweitert C (Zusatz)' 
        : level === 'gifted'
          ? 'Begabung fördern 🌟'
          : 'Regulär B (Standard)';
    
    const labelModus = modus === 'förderung' ? 'Förderung' : modus === 'klassenuebung' ? 'Klassenuerbung' : modus === 'test' ? 'Test LZK' : 'Schularbeit';
    
    const computedTitle = `Arbeitsblatt: ${finalType} - ${finalSubject} [${labelModus} - ${computedLevel}]`;
    setWorksheetTitle(computedTitle);

    // Build variables for AI Prompt
    const selectedNames = selectedStudents
      .map(id => students.find(s => s.id === id)?.vorname)
      .filter(Boolean)
      .join(', ');

    const systemPrompt = `Du bist ein erfahrener Volksschullehrer und Experte für Didaktik der 4. Schulstufe gemäß dem österreichischen Lehrplan. 
Deine Aufgabe ist es, ein perfekt formatiertes, druckfertiges Arbeitsblatt oder eine Lernzielkontrolle im HTML/Tailwind-Format zu generieren.

STRIKTE REGELN FÜR DEN INHALT:
1. Gamification & Storytelling: Wenn bei INTERESSEN ein Thema (wie Detektive, Weltraum) angegeben ist, bette die Aufgabenstellungen in dieses Abenteuer ein. Wenn "Kein Storytelling" oder ähnliches gewählt wurde, bleibe sachlich, klar und klassisch ohne Story.
2. Individualisierung: Wenn der Modus "Individuelle Förderung" ist, nutze die STÄRKEN des Kindes/der Kinder, um Selbstbewusstsein aufzubauen (z.B. indem eine etwas anspruchsvollere, aber lösbare Einstiegsaufgabe in diesem Bereich integriert wird) und stütze gezielt den FÖRDERBEDARF durch kleinschrittigere Erklärungen im selben Arbeitsblatt.
3. Differenzierung (bei Klassen-Übungen): Wenn der Modus "Klassen-Übung" ist, erstelle 3 Level (Bronze, Silber, Gold) klar strukturiert auf demselben Blatt, damit jedes Kind auf seinem Niveau arbeiten kann.
4. Selbsteinschätzung: Füge am Ende JEDES Arbeitsblattes (gemäß Hattie-Studie) eine kleine, ansprechende Box zur Selbsteinschätzung ein ("Wie gut habe ich das verstanden?" mit 3 leeren Smileys [ ] 😊  [ ] 😐  [ ] 🙁 zum Ankreuzen).

STRIKTE REGELN FÜR DAS LAYOUT (A4-PRINT-PERFEKTION):
1. Code-Format: Generiere AUSSCHLIESSLICH sauberes, valides HTML5. Bette alle Elemente mit standardmäßigen Tailwind-Klassen ein. Gib keinerlei Markdown-Text, Erklärungen oder einleitende/abschließende Worte außerhalb des HTML-Codes aus. Beginne direkt mit dem Hauptcontainer-Element (<div style="width: 210mm; min-height: 297mm; ...">) und schließe damit ab.
2. A4-Spezifikation: Das Haupt-Container-Element MUSS exakt folgende CSS-Eigenschaften haben:
   \`width: 210mm; min-height: 297mm; padding: 15mm; margin: 0 auto; background: white; color: black; box-sizing: border-box;\`
3. Print-Optimierung: Verwende keine dunklen Hintergrundfarben (Tinte sparen!). Nutze maximal feine, hellgraue Rahmen. Bette Schreibtrennlinien (border-b border-dashed border-gray-300 h-6 w-full) ein, damit Kinder handschriftliche Antworten eintragen können.
4. Typografie: Verwende klare, serifenlose Schriften (Sans-Serif wie Inter, Arial). Schriftgröße für die 4. Klasse muss mindestens 12pt (16px) betragen. Verwende großzügigen Zeilenabstand (leading-relaxed oder leading-loose) und freie Schreiblinien, um ausreichend Platz für handschriftliche Notizen und Rechnungen zu lassen.
5. Struktur und 2-Seiten-Fluss (Word-Dokument-Verhalten):
   Generiere das Arbeitsblatt so, dass es exakt ZWEI getrennte Seiten ausdruckt:
   - Seite 1 (Aufgaben für die Schüler):
     - Enthält Kopfzeile (Name, Datum, Klasse in einer schlichten Tabelle oder Grid-Leiste).
     - Titel (groß, motivierend, in die Gamification-Story eingebettet).
     - Hauptteil mit abwechslungsreichen Aufgabenblöcken (mit Schreiblinien/Kästchen für handschriftliche Eingaben).
     - Box zur Selbsteinschätzung (Smileys).
   - Seitenwechsel-Trenner (EXAKT DIAGNOSTIZIERT):
     - Füge an der Stelle, wo Seite 1 endet und Seite 2 beginnt, folgendes Element ein:
       <div style="page-break-before: always; break-before: page;" class="page-break"></div>
   - Seite 2 (Lösungsblatt für die Lehrkraft oder Selbstkontrolle):
     - Ein großer zentrierter Titel "Lösungsbogen: [Titel des Arbeitsblatts]".
     - Übersichtliche, leicht lesbare Lösungen für alle Aufgaben von Seite 1.
     - Gestalte Seite 2 schlicht, elegant und so, dass sie beim Drucken sauber auf ein separates unbeschriebenes Blatt Papier fließt.`;

    const userPrompt = `
Generiere jetzt das Arbeitsblatt basierend auf folgenden Variablen und Vorgaben:

=== EINGABEVARIABLEN ===
- Modus: ${modus === 'förderung' ? 'Individuelle Förderung' : modus === 'klassenuebung' ? 'Klassen-Übung' : modus === 'test' ? 'Test' : 'Schularbeit'}
- Thema: ${finalSubject} - ${finalType}
- Differenzierung: ${computedLevel}
- Schulstufe: 4. Schulstufe (Österreichischer Lehrplan)
- Schülerdaten:
  * Name der Schüler: ${selectedNames || 'Die ganze Klasse'}
  * Stärken: ${aggregatedStudentInfo.strengths.join(', ') || 'Ausgewogene Stärken'}
  * Förderbedarf: ${selectedNeeds.length > 0 ? selectedNeeds.join(', ') : 'Allgemeine Festigung / Standard-Lehrplan'}
- Interessen (für Gamification & Storytelling): ${finalInteressen}

=== LEHRER-SPEZIFISCHE ANWEISUNGEN ===
${manualInstructions.trim() ? `"${manualInstructions.trim()}"` : 'Gestalte die Aufgaben abwechslungsreich, motivierend und didaktisch hochwertig gemäß Volksschul-Standards.'}

Schreibe direkt und ausschließlich den sauberen HTML-Code (beginnend mit <div style="width: 210mm; ...">) für das Arbeitsblatt, gefolgt vom Lösungsbogen. Keinerlei Einleitungstexte oder Markdown-Ticker außerhalb des HTML-Tags.
WICHTIG: Verwende KEINE Trennlinien wie "Hier abschneiden", da die 2. Seite separat gedruckt wird.
WICHTIG: Erzeuge keine "Schülerverifizierung".
WICHTIG: Lass Meta-Informationen (z.B. "Fokus Differenzierung:", "Nicht benötigte Wörter:", "Kreativaufgabe:") KOMPLETT WEG! Es soll nur das fertige Arbeitsblatt entstehen.
Das Arbeitsblatt MUSS exakt 1 A4-Seite einnehmen. Der Lösungsbogen MUSS exakt 1 Seite einnehmen.`;

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generateContent',
          params: {
            contents: userPrompt,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.7,
            }
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Fehler bei der Verbindung zum KI-Server.');
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      let cleanText = data.text || '';
      // Clean possible wrapper code boundaries commonly produced by LLMs
      if (cleanText.trim().startsWith('```')) {
        cleanText = cleanText.replace(/^```(html)?\n/, '').replace(/\n```$/, '');
      }

      setGeneratedContent(cleanText);
      setTempEditedContent(cleanText);
      setActiveSavedId(null);
      showToast('Arbeitsblatt erfolgreich maßgeschneidert generiert!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Generierung fehlgeschlagen.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Edit action
  const toggleEditMode = () => {
    if (isEditing) {
      setGeneratedContent(tempEditedContent);
      showToast('Änderungen übernommen.', 'success');
    } else {
      setTempEditedContent(generatedContent);
    }
    setIsEditing(!isEditing);
  };

  // Copy to clipboard helper
  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    setHasCopied(true);
    showToast('In die Zwischenablage kopiert!', 'success');
    setTimeout(() => setHasCopied(false), 2000);
  };

  // Print worksheet helper
  const handlePrint = () => {
    window.print();
  };

  // Save current sheet to library + general school materials database
  const handleSaveWorksheet = () => {
    if (!generatedContent) return;

    const finalSubject = isCustomSubjectActive ? customSubject : subject;
    const finalType = isCustomTypeActive ? customType : worksheetType;
    const finalInteressen = isCustomInteressenActive ? customInteressen : interessen;

    const selectedAndValidNames = selectedStudents
      .map(id => students.find(s => s.id === id)?.vorname)
      .filter(Boolean) as string[];

    const computedLevelLabel = level === 'easy' ? 'A (Basis)' : level === 'hard' ? 'C (Erweitert)' : level === 'gifted' ? 'Elite (Talente)' : 'B (Regulär)';

    if (activeSavedId) {
      // Update existing
      const updated = savedWorksheets.map(w => {
        if (w.id === activeSavedId) {
          return {
            ...w,
            title: worksheetTitle,
            content: generatedContent,
            timestamp: Date.now()
          };
        }
        return w;
      });
      saveToLocal(updated);
      showToast('Arbeitsblatt in der Mediathek aktualisiert!', 'success');
    } else {
      // Create new
      const newSheet: SavedWorksheet = {
        id: 'ws_' + Math.random().toString(36).substr(2, 9),
        title: worksheetTitle,
        subject: finalSubject,
        topic: finalType,
        level: computedLevelLabel,
        targetStudents: selectedAndValidNames.length > 0 ? selectedAndValidNames : ['Ganze Klasse'],
        content: generatedContent,
        timestamp: Date.now(),
        modus,
        interessen: finalInteressen
      };
      
      const updated = [newSheet, ...savedWorksheets];
      saveToLocal(updated);
      setActiveSavedId(newSheet.id);
      
      // Save directly into the shared Teacher's Material Library (Materialbibliothek)
      addMaterialFromAI({
        id: newSheet.id,
        titel: newSheet.title || `Arbeitsblatt: ${finalType} - ${finalSubject}`,
        beschreibung: `Österreichischer Lehrplan 4. Schulstufe | Modus: ${modus === 'förderung' ? 'Individuelle Förderung' : modus === 'klassenuebung' ? 'Klassen-Übung' : modus === 'test' ? 'Test LZK' : 'Schularbeit'} | Niveau: ${computedLevelLabel} | Story: ${finalInteressen} | Für: ${newSheet.targetStudents.join(', ')}`,
        typ: 'sonstiges', // Valid material type under types.ts Category
        faecher: [finalSubject],
        schulstufen: [4],
        tags: [finalSubject, 'Arbeitsblatt', computedLevelLabel, modus].filter(Boolean) as string[],
        inhaltText: generatedContent
      }, 'ki-arbeitsblatt');

      showToast('Arbeitsblatt gespeichert & in Materialbibliothek hinterlegt! 💾', 'success');
    }
  };

  // Load worksheet from history
  const loadSavedWorksheet = (ws: SavedWorksheet) => {
    setGeneratedContent(ws.content);
    setTempEditedContent(ws.content);
    setWorksheetTitle(ws.title);
    setActiveSavedId(ws.id);
    setIsEditing(false);
    showToast(`"${ws.title}" geladen.`, 'success');
  };

  // Delete worksheet from library
  const deleteSavedWorksheet = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Dieses Arbeitsblatt wirklich permanent löschen?')) {
      const updated = savedWorksheets.filter(w => w.id !== id);
      saveToLocal(updated);
      if (activeSavedId === id) {
        setActiveSavedId(null);
        setGeneratedContent('');
      }
      showToast('Arbeitsblatt gelöscht.', 'success');
    }
  };

  // Quick preset loader helper
  const handleLoadPresetOptions = (subj: string, type: string, lvl: 'easy' | 'medium' | 'hard' | 'gifted', desc: string, md: typeof modus = 'förderung', story: string = 'Detektive / Kriminalfälle') => {
    setSubject(subj);
    setIsCustomSubjectActive(false);
    setWorksheetType(type);
    setIsCustomTypeActive(false);
    setLevel(lvl);
    setManualInstructions(desc);
    setModus(md);
    setInteressen(story);
    showToast('Vorlage geladen – klicke auf "Arbeitsblatt generieren"!', 'info');
  };

  return (
    <div className="worksheet-generator-container flex-1 flex flex-col min-h-0 bg-slate-50/30 print:bg-white pb-10">
      
      {/* Print-general styles to ensure perfect responsiveness on screen and flawless flow on paper */}
      <style>{`
        @media screen {
          /* 1. Prevent hardcoded A4 static widths from overflowing the responsive workspace area */
          .print-sheet-area {
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          
          /* Target any LLM generated outermost div (usually has style width: 210mm) */
          .worksheet-html-view > div,
          .worksheet-html-view div[style*="210mm"],
          .worksheet-html-view div[style*="21cm"] {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
          }

          /* Ensure images and tables inside the worksheet adapt responsively on screen */
          .worksheet-html-view img,
          .worksheet-html-view table,
          .worksheet-html-view iframe {
            max-width: 100% !important;
            height: auto !important;
          }
        }

        @media print {
          /* 2. Hide unwanted elements, including sidebars, menus, buttons, overlays, toasts, floating elements etc. */
          .global-print-header,
          .no-print,
          .no-print-hidden,
          .topbar,
          .sidebar,
          header,
          nav,
          button,
          aside,
          select,
          input,
          textarea,
          .floating-utilities,
          .denkzettel-widget,
          .unified-fab,
          .floating-action-button,
          .toast-container,
          .toast,
          .modal-backdrop,
          .ui-controls,
          [class*="sidebar"],
          [class*="topbar"],
          [class*="UnifiedFAB"],
          [class*="Toast"] {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            opacity: 0 !important;
          }

          /* 3. Reset all parent constraints of .print-sheet-area so the flow is unconstrained across multiple pages, preserving nested layout */
          html,
          body,
          #root,
          .App,
          main,
          .page-container,
          .app-scale-container,
          .print-page-wrapper,
          .worksheet-generator-container,
          .container,
          [class*="container"] {
            display: block !important;
            overflow: visible !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            width: 100% !important;
            max-width: 100% !important;
            position: static !important;
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            transform: none !important;
          }

          /* 4. Format the printable sheet container beautifully */
          .print-sheet-area {
            display: block !important;
            width: 210mm !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 29.7cm !important;
            overflow: visible !important;
            position: relative !important;
            background: white !important;
            color: black !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }

          /* Force the generated outer div (which might have inline width 210mm) to span full width */
          .worksheet-html-view > div,
          .worksheet-html-view div[style*="210mm"],
          .worksheet-html-view div[style*="21cm"] {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }

          /* General typography adjustments for crisp, highly-legible layout on A4 paper */
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: #ffffff !important;
            color: #000000 !important;
          }

          /* Elegant spacing and break controls for print page-breaks */
          h1, h2, h3, h4, h5, h6 {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          img, table, tr, .worksheet-section, .task-item {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Split Worksheet into page 1 = exercises and page 2 = solutions */
          .page-break {
            page-break-before: always !important;
            break-before: page !important;
            display: block !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            opacity: 0 !important;
          }
        }
      `}</style>

      {/* Main Content Dashboard Layout */}
      <div className={`flex-1 flex min-h-0 container mx-auto px-4 py-4 print:p-0 animate-fade-in flex-col gap-6`}>
        
        {/* TOP PANEL: Controls deck structured horizontally or side-aligned based on paneLayout */}
        <div className={`flex flex-col gap-4 no-print w-full`}>
          
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex flex-col gap-5">
            {/* Header / Module Control Deck */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                  <Compass size={20} className="animate-spin-slow" />
                </div>
                <div>
                  <h2 className="text-[0.875rem] leading-snug font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                    Didaktischer Arbeitsblatt-Generator 
                    <span className="text-[0.5625rem] font-black uppercase tracking-wider bg-indigo-100 px-2 py-0.5 rounded-full text-indigo-700">4. Schulstufe</span>
                  </h2>
                  <p className="text-[0.625rem] text-slate-400 font-bold">Inklusions-optimiertes & gamifiziertes Unterrichtsmaterial für den österreichischen Lehrplan</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button 
                  type="button"
                  onClick={() => { setShowPresets(!showPresets); if(showMediathek) setShowMediathek(false); }}
                  className={`px-3 py-1.5 rounded-xl text-[0.75rem] leading-tight font-black transition-all flex items-center gap-1 border cursor-pointer ${
                    showPresets ? 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  <BookOpen size={13} />
                  Presets
                </button>
                <button 
                  type="button"
                  onClick={() => { setShowMediathek(!showMediathek); if(showPresets) setShowPresets(false); }}
                  className={`px-3 py-1.5 rounded-xl text-[0.75rem] leading-tight font-black transition-all flex items-center gap-1 border cursor-pointer ${
                    showMediathek ? 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                  title="Öffnet gespeicherte Arbeitsblätter"
                >
                  <History size={13} />
                  Mediathek ({savedWorksheets.length})
                </button>
              </div>
            </div>

            {/* NEW: MODE AND LAYOUT SELECTOR BAR (Simple vs Expert, Split vs Stack workspace layout) */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 bg-slate-50 border border-slate-150/40 rounded-2xl">
              {/* Simple vs Expert mode */}
              <div className="flex items-center gap-2.5">
                <span className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400">Arbeitsblatt-Optionen:</span>
                <div className="flex bg-white border border-slate-200/80 rounded-xl p-0.5 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setGeneratorMode('simple')}
                    className={`px-3 py-1.5 rounded-lg text-[0.75rem] leading-tight font-bold leading-none flex items-center gap-1.5 transition-all cursor-pointer ${
                      generatorMode === 'simple'
                        ? 'bg-indigo-600 text-white shadow-sm font-black'
                        : 'text-slate-655 hover:bg-slate-50'
                    }`}
                  >
                    <span>⚡ Einfacher Modus</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGeneratorMode('expert')}
                    className={`px-3 py-1.5 rounded-lg text-[0.75rem] leading-tight font-bold leading-none flex items-center gap-1.5 transition-all cursor-pointer ${
                      generatorMode === 'expert'
                        ? 'bg-indigo-600 text-white shadow-sm font-black'
                        : 'text-slate-655 hover:bg-slate-50'
                    }`}
                  >
                    <span>🛠️ Experten-Modus</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Expanded Preset Options */}
            {showPresets && (
              <div className="bg-slate-50/50 p-4 border border-slate-150 rounded-2xl space-y-3 animate-slide-down">
                <div className="flex items-center gap-1.5">
                  <BookOpen size={14} className="text-indigo-600" />
                  <h3 className="text-[0.75rem] leading-tight font-black uppercase tracking-wider text-slate-700">Didaktische Schnell-Vorlagen</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[0.6875rem]">
                  <button 
                    type="button"
                    onClick={() => handleLoadPresetOptions('Deutsch', 'Silben- und Lesetraining', 'easy', 'Einfache 2-Silben Wörter mit bunten Lücken stiften, Lesetempo binnendifferenziert steigern.', 'förderung', 'Detektive / Kriminalfälle')}
                    className="p-2.5 bg-white hover:bg-indigo-50 border border-slate-200 rounded-xl text-left font-bold text-slate-800 transition-all cursor-pointer hover:border-indigo-200"
                  >
                    📖 Silbentext (Förderung / Niveau A)
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleLoadPresetOptions('Mathematik', 'Einmaleins-Malreihen Training', 'medium', 'Die Reihen von 2, 5 und 10 mit bildhaften Alltagsrätseln festigen.', 'klassenuebung', 'Weltraum & Astronauten')}
                    className="p-2.5 bg-white hover:bg-emerald-50 border border-slate-200 rounded-xl text-left font-bold text-slate-800 transition-all cursor-pointer hover:border-emerald-200"
                  >
                    🧮 1x1 Abenteuer (Klasse / Niveau B)
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleLoadPresetOptions('Deutsch', 'Rechtschreib-Suchspiel (Fehler finden)', 'hard', 'Fokus auf Groß- und Kleinschreibung an Satzanfängen und bekannten Nomen im Reizwortkontext.', 'test', 'Zauberschule & Magie')}
                    className="p-2.5 bg-white hover:bg-amber-50 border border-slate-200 rounded-xl text-left font-bold text-slate-800 transition-all cursor-pointer hover:border-amber-200"
                  >
                    ✍️ Rechtschreibtest (LZK / Niveau C)
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleLoadPresetOptions('Mathematik', 'Rechenrätsel & Sachaufgaben', 'gifted', 'Knifflige Entdeckeraufgaben, logische Brüche, Entschlüsselungen und Querdenker-Mathematik.', 'förderung', 'Computerspiele (Minecraft-Style)')}
                    className="p-2.5 bg-white hover:bg-purple-50 border border-slate-200 rounded-xl text-left font-bold text-slate-800 transition-all cursor-pointer hover:border-purple-200"
                  >
                    🧠 Elite Knobeln (Talente 🌟)
                  </button>
                </div>
              </div>
            )}

            {/* Expanded Mediathek History */}
            {showMediathek && (
              <div className="bg-slate-50/50 p-4 border border-slate-150 rounded-2xl space-y-3 animate-slide-down">
                <div className="flex items-center gap-1.5">
                  <History size={14} className="text-indigo-600" />
                  <h3 className="text-[0.75rem] leading-tight font-black uppercase tracking-wider text-slate-700">Deine gespeicherten Blätter</h3>
                </div>
                {savedWorksheets.length === 0 ? (
                  <div className="text-center p-6 bg-white rounded-xl text-[0.6875rem] text-slate-400 font-bold border border-dashed border-slate-200">
                    Noch keine Arbeitsblätter in der Mediathek gespeichert.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto custom-scrollbar">
                    {savedWorksheets.map((ws) => (
                      <div
                        key={ws.id}
                        onClick={() => loadSavedWorksheet(ws)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between group ${
                          activeSavedId === ws.id
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-950'
                            : 'bg-white hover:bg-slate-50 border-slate-150 text-slate-700'
                        }`}
                      >
                        <div className="text-wrap leading-tight break-words flex-1 pr-4">
                          <div className="text-[0.75rem] leading-tight font-black text-wrap leading-tight break-words leading-tight">{ws.title}</div>
                          <div className="flex flex-wrap gap-1 text-[0.5rem] font-black text-slate-400 mt-1 uppercase">
                            <span className="bg-slate-50 px-1 py-0.5 rounded border border-slate-150/50">{ws.subject}</span>
                            <span className="bg-slate-50 px-1 py-0.5 rounded border border-slate-150/50">{ws.level}</span>
                            <span className="text-wrap leading-tight break-words max-w-[100px]">Für: {ws.targetStudents.join(', ')}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => deleteSavedWorksheet(ws.id, e)}
                          className="p-1.5 text-slate-350 hover:text-rose-500 rounded-lg hover:bg-slate-100 opacity-60 group-hover:opacity-100 transition-all cursor-pointer shrink-0 border border-transparent"
                          title="Aus Mediathek löschen"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Conditionally render control deck based on Simple vs Expert preference */}
            {generatorMode === 'simple' ? (
              /* SIMPLE FORM LAYOUT - Minimalist & focused */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                
                {/* Column 1: Pupil checkbox scrollable list */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[0.625rem] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1">
                      <UserCheck size={13} className="text-slate-400" />
                      1. Kind(er) auswählen
                    </label>
                    <button 
                      type="button"
                      onClick={selectAllStudents}
                      className="text-[0.5625rem] font-black text-slate-500 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-lg border border-slate-200 transition-all cursor-pointer"
                    >
                      {selectedStudents.length === students.length ? 'Keines' : 'Ganze Klasse'}
                    </button>
                  </div>

                  {students.length === 0 ? (
                    <div className="text-center p-3.5 bg-slate-50 rounded-xl text-[0.625rem] text-slate-400 font-bold border border-dashed border-slate-150">
                      Keine Schüler angelegt.
                    </div>
                  ) : (
                    <div className="h-[125px] overflow-y-auto border border-slate-150/40 rounded-xl p-1.5 space-y-1 custom-scrollbar bg-slate-50/50">
                      <div className="grid grid-cols-2 gap-1">
                        {students.map((student) => {
                          const isSelected = selectedStudents.includes(student.id);
                          return (
                            <button
                              key={student.id + '-simple'}
                              type="button"
                              onClick={() => toggleStudent(student.id)}
                              className={`flex items-center gap-1.5 p-1 px-1.5 rounded-lg transition-all text-left text-[0.625rem] font-bold border ${
                                isSelected 
                                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                                  : 'bg-white border-slate-150/65 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span className="shrink-0">{student.emoji || '👤'}</span>
                              <span className="break-words whitespace-normal leading-tight w-full flex-1 min-w-0">{student.vorname}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Under the hood summary note in simple mode */}
                  <p className="text-[0.5625rem] text-slate-400 leading-tight font-medium">
                    ✨ Schwierigkeit & Modus werden automatisch didaktisch optimal eingestellt.
                  </p>
                </div>

                {/* Column 2: Subject and worksheet type */}
                <div className="space-y-3 md:border-l md:border-slate-100 md:pl-5">
                  <label className="text-[0.625rem] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1">
                    <Layers size={13} className="text-slate-400" />
                    2. Fach & Aufgabenstellung
                  </label>

                  {/* Fach Selector */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[0.5625rem] font-semibold text-slate-400 uppercase tracking-wider">Mittel-Fach</span>
                      <button 
                        type="button" 
                        onClick={() => setIsCustomSubjectActive(!isCustomSubjectActive)}
                        className="text-[0.5rem] font-bold text-indigo-500 hover:underline"
                      >
                        {isCustomSubjectActive ? 'Auswahl' : 'Eigenes'}
                      </button>
                    </div>
                    {isCustomSubjectActive ? (
                      <input 
                        type="text"
                        value={customSubject}
                        onChange={e => setCustomSubject(e.target.value)}
                        placeholder="z.B. Religion, Musik..."
                        className="w-full p-2 border border-slate-200 rounded-xl text-[0.75rem] leading-tight font-black bg-slate-50 outline-none focus:border-indigo-500"
                      />
                    ) : (
                      <select
                        value={subject}
                        onChange={e => {
                          setSubject(e.target.value);
                          setWorksheetType(worksheetTypes[e.target.value]?.[0] || 'Wissens-Suchsel / Wortgitter');
                        }}
                        className="w-full p-2 bg-slate-50 border border-slate-250 text-slate-800 rounded-xl text-[0.75rem] leading-tight font-bold focus:border-indigo-500 cursor-pointer"
                      >
                        {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </div>

                  {/* Aufgabentyp Selector */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[0.5625rem] font-semibold text-slate-400 uppercase tracking-wider">Aufgabentyp / Format</span>
                      <button 
                        type="button" 
                        onClick={() => setIsCustomTypeActive(!isCustomTypeActive)}
                        className="text-[0.5rem] font-bold text-indigo-500 hover:underline"
                      >
                        {isCustomTypeActive ? 'Auswahl' : 'Eigenes'}
                      </button>
                    </div>
                    {isCustomTypeActive ? (
                      <input 
                        type="text"
                        value={customType}
                        onChange={e => setCustomType(e.target.value)}
                        placeholder="z.B. Wörterkette..."
                        className="w-full p-2 border border-slate-200 rounded-xl text-[0.75rem] leading-tight font-black bg-slate-50 outline-none focus:border-indigo-500"
                      />
                    ) : (
                      <select
                        value={worksheetType}
                        onChange={e => setWorksheetType(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-255 text-slate-800 rounded-xl text-[0.75rem] leading-tight font-bold focus:border-indigo-500 cursor-pointer"
                      >
                        {currentTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Column 3: Custom wish and generate button */}
                <div className="space-y-3 md:border-l md:border-slate-100 md:pl-5 flex flex-col justify-between">
                  <div className="space-y-1">
                    <label className="text-[0.625rem] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <PenTool size={13} className="text-slate-400" />
                      3. Besondere Wünsche (optional)
                    </label>
                    <textarea
                      value={manualInstructions}
                      onChange={e => setManualInstructions(e.target.value)}
                      placeholder="Thema, zusätzliche Anweisungen für Aufgaben oder Lernbegriffe eingeben..."
                      className="w-full h-[70px] p-2 text-[0.625rem] font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white resize-none shadow-inner leading-normal"
                    />
                  </div>

                  {/* Generate Button! */}
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={handleGenerate}
                    className="w-full py-2.5 bg-gradient-to-tr from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 disabled:from-indigo-300 disabled:to-indigo-400 text-white font-black text-[0.625rem] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-[0.98] transition-all disabled:pointer-events-none"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw size={12} className="animate-spin" />
                        Erstelle Aufgaben...
                      </>
                    ) : (
                      <>
                        <Sparkles size={12} className="text-yellow-300 animate-pulse" />
                        Arbeitsblatt generieren
                      </>
                    )}
                  </button>
                </div>

              </div>
            ) : (
              /* EXPERT FORM LAYOUT - full power granular tools */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                
                {/* Column 1: Ziel-Schüler & Modus */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[0.625rem] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1">
                      <UserCheck size={13} className="text-slate-400" />
                      1. Schüler & Modus
                    </label>
                    <div className="flex gap-1">
                      <button 
                        type="button"
                        onClick={selectSpecialNeedsKids}
                        className="text-[0.5rem] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded"
                        title="Wählt Schüler mit eingetragenen SPF oder Förderbedarf aus."
                      >
                        Bedarf
                      </button>
                      <button 
                        type="button"
                        onClick={selectAllStudents}
                        className="text-[0.5rem] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded"
                      >
                        {selectedStudents.length === students.length ? 'Keine' : 'Alle'}
                      </button>
                    </div>
                  </div>

                  {/* Compact Scrollable checkbox grid for students */}
                  {students.length === 0 ? (
                    <div className="text-center p-3.5 bg-slate-50 rounded-xl text-[0.625rem] text-slate-400 font-bold border border-dashed border-slate-150">
                      Keine Schüler angelegt.
                    </div>
                  ) : (
                    <div className="h-[75px] overflow-y-auto border border-slate-150/40 rounded-xl p-1.5 space-y-1 custom-scrollbar bg-slate-50/50">
                      <div className="grid grid-cols-2 gap-1">
                        {students.map((student) => {
                          const isSelected = selectedStudents.includes(student.id);
                          return (
                            <button
                              key={student.id}
                              type="button"
                              onClick={() => toggleStudent(student.id)}
                              className={`flex items-center gap-1.5 p-1 px-1.5 rounded-lg transition-all text-left text-[0.625rem] font-bold border ${
                                isSelected 
                                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                                  : 'bg-white border-slate-150/65 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span className="shrink-0">{student.emoji || '👤'}</span>
                              <span className="break-words whitespace-normal leading-tight w-full flex-1 min-w-0">{student.vorname}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Modus Selector */}
                  <div className="space-y-1">
                    <span className="text-[0.5625rem] font-semibold text-slate-400 uppercase tracking-wider">Arbeitsblatt-Modus</span>
                    <select
                      value={modus}
                      onChange={e => setModus(e.target.value as any)}
                      className="w-full p-2 bg-slate-50 border border-slate-250 text-slate-800 rounded-xl text-[0.75rem] leading-tight font-bold focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="förderung">❤️ Individuelle Förderung</option>
                      <option value="klassenuebung">👥 Klassen-Übung (Binnendiff.)</option>
                      <option value="test">📝 Test / Lernzielkontrolle</option>
                      <option value="schularbeit">🎓 Formale Schularbeit</option>
                    </select>
                  </div>
                </div>

                {/* Column 2: Fach & Aufgabentyp */}
                <div className="space-y-3 lg:border-l lg:border-slate-100 lg:pl-5">
                  <label className="text-[0.625rem] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1">
                    <Layers size={13} className="text-slate-400" />
                    2. Fach, Typ & Niveau
                  </label>

                  {/* Fach Selector */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[0.5625rem] font-semibold text-slate-400 uppercase tracking-wider">Schulfach</span>
                      <button 
                        type="button" 
                        onClick={() => setIsCustomSubjectActive(!isCustomSubjectActive)}
                        className="text-[0.5rem] font-bold text-indigo-500 hover:underline"
                      >
                        {isCustomSubjectActive ? 'Auswahl' : 'Eigenes'}
                      </button>
                    </div>
                    {isCustomSubjectActive ? (
                      <input 
                        type="text"
                        value={customSubject}
                        onChange={e => setCustomSubject(e.target.value)}
                        placeholder="z.B. Religion, Musik..."
                        className="w-full p-2 border border-slate-200 rounded-xl text-[0.75rem] leading-tight font-black bg-slate-50 outline-none focus:border-indigo-500"
                      />
                    ) : (
                      <select
                        value={subject}
                        onChange={e => {
                          setSubject(e.target.value);
                          setWorksheetType(worksheetTypes[e.target.value]?.[0] || 'Wissens-Suchsel / Wortgitter');
                        }}
                        className="w-full p-2 bg-slate-50 border border-slate-250 text-slate-800 rounded-xl text-[0.75rem] leading-tight font-bold focus:border-indigo-500 cursor-pointer"
                      >
                        {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </div>

                  {/* Aufgabentyp Selector */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[0.5625rem] font-semibold text-slate-400 uppercase tracking-wider">Format / Struktur</span>
                      <button 
                        type="button" 
                        onClick={() => setIsCustomTypeActive(!isCustomTypeActive)}
                        className="text-[0.5rem] font-bold text-indigo-500 hover:underline"
                      >
                        {isCustomTypeActive ? 'Auswahl' : 'Eigenes'}
                      </button>
                    </div>
                    {isCustomTypeActive ? (
                      <input 
                        type="text"
                        value={customType}
                        onChange={e => setCustomType(e.target.value)}
                        placeholder="z.B. Wörterkette..."
                        className="w-full p-2 border border-slate-200 rounded-xl text-[0.75rem] leading-tight font-black bg-slate-50 outline-none focus:border-indigo-500"
                      />
                    ) : (
                      <select
                        value={worksheetType}
                        onChange={e => setWorksheetType(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-255 text-slate-800 rounded-xl text-[0.75rem] leading-tight font-bold focus:border-indigo-500 cursor-pointer"
                      >
                        {currentTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Niveau Selector */}
                  <div className="space-y-1">
                    <span className="text-[0.5625rem] font-semibold text-slate-400 uppercase tracking-wider">Differenzierungsniveau</span>
                    <select
                      value={level}
                      onChange={e => setLevel(e.target.value as any)}
                      className="w-full p-2 bg-slate-50 border border-slate-250 text-slate-800 rounded-xl text-[0.75rem] leading-tight font-bold focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="easy">🟢 Basis A (Unterstützend)</option>
                      <option value="medium">🔵 Regulär B (Standard)</option>
                      <option value="hard">🟡 Erweitert C (Knobeln)</option>
                      <option value="gifted">🌟 Extra Talente (Begabungsförderung)</option>
                    </select>
                  </div>
                </div>

                {/* Column 3: Storytelling & Interessen */}
                <div className="space-y-3 lg:border-l lg:border-slate-100 lg:pl-5">
                  <label className="text-[0.625rem] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1">
                    <Award size={13} className="text-slate-400" />
                    3. Storytelling & Interessen
                  </label>

                  {/* Interessen (for gamified instructions) */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[0.5625rem] font-semibold text-slate-400 uppercase tracking-wider">Gamification-Thema</span>
                      <button 
                        type="button" 
                        onClick={() => setIsCustomInteressenActive(!isCustomInteressenActive)}
                        className="text-[0.5rem] font-bold text-indigo-500 hover:underline"
                      >
                        {isCustomInteressenActive ? 'Auswahl' : 'Eigenes'}
                      </button>
                    </div>
                    {isCustomInteressenActive ? (
                      <input 
                        type="text"
                        value={customInteressen}
                        onChange={e => setCustomInteressen(e.target.value)}
                        placeholder="z.B. Hexenwald, Weltumsegelung..."
                        className="w-full p-2 border border-slate-200 rounded-xl text-[0.75rem] leading-tight font-black bg-slate-50 outline-none focus:border-indigo-500"
                      />
                    ) : (
                      <select
                        value={interessen}
                        onChange={e => setInteressen(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-250 text-slate-800 rounded-xl text-[0.75rem] leading-tight font-bold focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="Kein Storytelling (Klassisch)">📝 Kein Storytelling (Klassisch)</option>
                        <option value="Detektive / Kriminalfälle">🔍 Detektive & Kriminallösungen</option>
                        <option value="Weltraum & Astronauten">🚀 Weltall-Expedition</option>
                        <option value="Zauberschule & Magie">✨ Zauberwald & Magie</option>
                        <option value="Dinos & Urzeit">🦖 Dinosaurier & Urzeit</option>
                        <option value="Ritter, Burgen & Drachen">🏰 Ritter & Drachengeschichten</option>
                        <option value="Tierschutz & Wildnis">🦊 Tiere & Förster im Wald</option>
                        <option value="Sport-Event & Olympiade">⚽ Sport-Abenteuer & Pokaljagd</option>
                        <option value="Computerspiele (Minecraft-Style)">⛏️ Pixel-Abend & Mine-Abenteuer</option>
                        <option value="Forscher & Entdecker">🗺️ Dschungel & Schatzkarte</option>
                      </select>
                    )}
                  </div>

                  {/* Student specific Need pills matching selected students */}
                  <div className="space-y-1 text-left">
                    <span className="text-[0.5625rem] font-semibold text-slate-400 uppercase tracking-wider block">Fördereinflüsse der Kinder</span>
                    {selectedStudents.length > 0 && (aggregatedStudentInfo.needs.length > 0 || aggregatedStudentInfo.notes.length > 0) ? (
                      <div className="flex flex-wrap gap-1 max-h-[70px] overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50 custom-scrollbar">
                        {aggregatedStudentInfo.needs.slice(0, 5).map((need, idx) => {
                          const isSelected = selectedNeeds.includes(need);
                          return (
                            <button
                              key={`need-${idx}`}
                              type="button"
                              onClick={() => toggleNeed(need)}
                              className={`text-[0.5rem] font-bold px-1.5 py-0.5 rounded-full border transition-all text-wrap leading-tight break-words max-w-[130px] cursor-pointer ${
                                isSelected 
                                  ? 'bg-amber-500 border-amber-600 text-white' 
                                  : 'bg-white hover:bg-amber-50 text-amber-800 border-amber-200/40'
                              }`}
                            >
                              {isSelected ? '✓' : '+'} {need}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-[0.5625rem] text-slate-400 font-semibold block italic pt-0.5">Keine eingetragenen Defizite</span>
                    )}
                  </div>
                </div>

                {/* Column 4: Manuelle Wünsche & Trigger */}
                <div className="space-y-3 lg:border-l lg:border-slate-100 lg:pl-5 flex flex-col justify-between">
                  <label className="text-[0.625rem] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <PenTool size={13} className="text-slate-400" />
                    4. Eigene Wünsche
                  </label>

                  {/* Additional instructions */}
                  <textarea
                    value={manualInstructions}
                    onChange={e => setManualInstructions(e.target.value)}
                    placeholder="z.B. Übe die Lernwörter: Haus, Maus, Laus..."
                    className="w-full h-[64px] p-2 text-[0.625rem] font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white resize-none shadow-inner leading-normal"
                  />

                  {/* Generate Button! */}
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={handleGenerate}
                    className="w-full py-2.5 bg-gradient-to-tr from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 disabled:from-indigo-300 disabled:to-indigo-400 text-white font-black text-[0.625rem] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-[0.98] transition-all disabled:pointer-events-none"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw size={12} className="animate-spin" />
                        Erstelle Aufgaben...
                      </>
                    ) : (
                      <>
                        <Sparkles size={12} className="text-yellow-300 animate-pulse" />
                        Arbeitsblatt generieren
                      </>
                    )}
                  </button>
                </div>

              </div>
            )}
          </div>

        </div>

        {/* BOTTOM PANEL: Worksheet preview paper or empty display */}
        <div className={`flex flex-col min-h-0 relative pt-2 w-full`}>
          
          {/* Header toolbar with actions mapping (no-print) */}
          {generatedContent && (
            <div className="bg-white rounded-3xl p-4 border border-slate-150 shadow-sm flex flex-wrap items-center justify-between gap-3 mb-4 no-print relative z-10 animate-slide-up">
              <div className="flex items-center gap-2">
                <FileCheck size={16} className="text-emerald-500 shrink-0" />
                <input 
                  type="text"
                  value={worksheetTitle}
                  onChange={e => setWorksheetTitle(e.target.value)}
                  className="bg-transparent border-b border-dashed border-slate-300 font-bold text-[0.75rem] leading-tight text-slate-800 outline-none focus:border-indigo-500 py-0.5 w-[200px] sm:w-[320px] text-wrap leading-tight break-words"
                  placeholder="Arbeitsblatt-Titel"
                />
              </div>

              <div className="flex items-center gap-1.5">
                {/* Save action (Saves to Mediathek AND Materialbibliothek automatically!) */}
                <button
                  type="button"
                  onClick={handleSaveWorksheet}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[0.75rem] leading-tight font-bold leading-none flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                  title="In deiner lokalen Mediathek && der globalen Materialbibliothek archivieren"
                >
                  <Save size={13} className="text-indigo-600" />
                  <span>Speichern & Archivieren</span>
                </button>

                {/* Edit Toggle Action */}
                <button
                  type="button"
                  onClick={toggleEditMode}
                  className={`px-3 py-1.5 rounded-xl text-[0.75rem] leading-tight font-bold leading-none flex items-center gap-1 shadow-sm transition-colors cursor-pointer ${
                    isEditing 
                      ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <PenTool size={13} />
                  <span>{isEditing ? '✓ Schließen' : 'Editieren'}</span>
                </button>

                {/* Copy Action */}
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-750 rounded-xl text-[0.75rem] leading-tight font-bold leading-none flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                  title="Kopiert das Arbeitsblatt"
                >
                  {hasCopied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>

                {/* Print Sheet Action */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-wider leading-none flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  title="Arbeitsblatt bereitstellen für den Drucker."
                >
                  <Printer size={13} />
                  <span>Drucken</span>
                </button>
              </div>
            </div>
          )}

          {/* Paper View sheet wrapper (Simulating white Din-A4 format papel sheet) */}
          <div className="flex-1 overflow-y-auto w-full flex justify-center bg-slate-100/50 p-2 sm:p-5 rounded-[2rem] border border-slate-150 shadow-inner-white custom-scrollbar print:p-0 print:border-none print:shadow-none print:bg-white print:overflow-visible">
            
            {/* If loading / generating */}
            {isGenerating && (
              <div className="flex flex-col items-center justify-center p-12 text-center h-[400px] w-full max-w-2xl bg-white rounded-3xl border border-slate-100 shadow-md">
                <div className="relative mb-6">
                  <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <Sparkles size={24} className="text-yellow-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" />
                </div>
                <h3 className="text-[1rem] leading-normal font-black text-slate-800 tracking-tight">Erstelle didaktisches Arbeitsblatt</h3>
                <p className="text-[0.75rem] leading-tight text-slate-400 mt-2 font-medium max-w-sm leading-relaxed">
                  Die KI strukturiert das Arbeitsblatt im gewünschten Gamification-Kontext, passt die Schwierigkeitslevel gemäß Niveau an und formuliert ein sauberes Lösungsblatt. Bitte warte kurz.
                </p>
                <div className="mt-8 space-y-1.5 w-full max-w-xs animate-pulse">
                  <div className="h-2.5 bg-slate-100 rounded-full w-full" />
                  <div className="h-2.5 bg-slate-100 rounded-full w-[90%] mx-auto" />
                  <div className="h-2.5 bg-slate-100 rounded-full w-[70%] mx-auto" />
                </div>
              </div>
            )}

            {/* Generated Worksheet Paper View */}
            {!isGenerating && generatedContent && (
              <div className={`print-sheet-area w-full max-w-[21cm] min-h-[29.7cm] bg-white border border-slate-200 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow relative leading-relaxed font-sans text-slate-900 overflow-visible print:shadow-none print:border-none print:p-0 print:mx-0 print:my-0 print:rounded-none ${
                ((generatedContent.trim().startsWith('<') || generatedContent.toLowerCase().includes('</div>') || generatedContent.toLowerCase().includes('<table')) && !isEditing)
                  ? 'p-0 sm:p-0' 
                  : 'p-8 sm:p-12'
              }`}>
                
                {/* Edit notification (no-print) */}
                {isEditing && (
                  <div className="absolute top-4 right-4 text-[0.625rem] bg-amber-500 text-white font-extrabold uppercase tracking-widest px-2.5 py-1 rounded shadow animate-pulse no-print select-none">
                    Editier-Modus aktiv
                  </div>
                )}

                {/* Core worksheet representation */}
                {isEditing ? (
                  <div className="h-full flex flex-col no-print">
                    <span className="text-[0.625rem] font-black text-amber-600 uppercase tracking-widest mb-1 select-none">Rohdaten bearbeiten (HTML oder Markdown):</span>
                    <textarea
                      value={tempEditedContent}
                      onChange={e => setTempEditedContent(e.target.value)}
                      className="w-full flex-1 min-h-[500px] p-4 text-[0.75rem] leading-tight font-mono font-medium text-slate-800 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-amber-500 leading-relaxed shadow-inner resize-vertical"
                    />
                    <div className="flex justify-end gap-2 mt-4 select-none animate-fade-in">
                      <button
                        type="button"
                        onClick={() => { setTempEditedContent(generatedContent); setIsEditing(false); }}
                        className="px-3 py-1.5 bg-slate-150 hover:bg-slate-200 text-slate-700 rounded-lg text-[0.75rem] leading-tight font-bold"
                      >
                        Abbrechen
                      </button>
                      <button
                        type="button"
                        onClick={() => { setGeneratedContent(tempEditedContent); setIsEditing(false); showToast('Änderungen gespeichert.', 'success'); }}
                        className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[0.75rem] leading-tight font-black uppercase tracking-wider"
                      >
                        Übernehmen & Speichern
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Render dynamic print HTML directly if generated content contains HTML-like tags, else fallback to FormattedText parser */}
                    {generatedContent.trim().startsWith('<') || generatedContent.toLowerCase().includes('</div>') || generatedContent.toLowerCase().includes('<table') ? (
                      <div 
                        className="worksheet-html-view text-left" 
                        dangerouslySetInnerHTML={{ __html: generatedContent }} 
                      />
                    ) : (
                      <div className="prose prose-slate prose-xs sm:prose-sm max-w-none break-words markdown-body">
                        <Markdown>{generatedContent}</Markdown>
                      </div>
                    )}
                  </div>
                )}
                
              </div>
            )}

            {/* Empty view context details */}
            {!isGenerating && !generatedContent && (
              <div className="flex flex-col items-center justify-center p-12 text-center h-[500px] w-full max-w-xl bg-white rounded-3xl border border-slate-150/80 shadow-sm relative no-print select-none animate-fade-in">
                <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-[1.5rem] flex items-center justify-center text-[1.875rem] leading-tight mb-4 shadow-inner">
                  📄
                </div>
                <h3 className="text-[0.875rem] leading-snug font-black text-slate-800 tracking-tight">Dein A4-Arbeitsblatt wartet</h3>
                <p className="text-[0.75rem] leading-tight text-slate-400 mt-1 max-w-xs font-medium leading-relaxed">
                  Konfiguriere im horizontalen Kontrollzentrum oben die Parameter, binde die Interessen deiner Schüler ein und klicke auf "Arbeitsblatt generieren"!
                </p>

                <div className="mt-8 border-t border-slate-100 pt-6 w-full text-left space-y-3">
                  <span className="text-[0.5625rem] font-black text-indigo-500 uppercase tracking-widest block text-center">Inklusions-Features:</span>
                  <div className="grid grid-cols-2 gap-3 text-[0.625rem] font-bold text-slate-500">
                    <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      🎯 <strong>Bedarfs-Einfluss:</strong> Wähle Kinder aus, um deren Förderbedarf (SPF, Logopädie, Mathe-Lernhilfe) direkt didaktisch einfließen zu lassen.
                    </div>
                    <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      💾 <strong>Archiv-Garantie:</strong> Beim Klick auf Speichern wird das Material sicher in der Mediathek UND deiner Haupt-Materialbibliothek abgelegt!
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
