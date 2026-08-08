import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Save, Search, Info, HelpCircle, Check, Sparkles, RefreshCw, AlertCircle, Minus, Plus, Maximize2, Minimize2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { logActivity } from '../lib/utils';

interface Criterion {
  id: string;
  label: string;
  description: string;
  maxPoints: number;
  points: number;
}

interface Aspect {
  id: string;
  title: string;
  criteria: Criterion[];
}

interface Student {
  id: string;
  vorname: string;
  nachname: string;
  charakter?: string[];
}

interface Props {
  subject: string;
  semester: string;
  saIndex: number;
  schueler: Student[];
  currentTemplate: Aspect[];
  config: any;
  onClose: () => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

// Flat structure representation for each student in the grid
interface RowState {
  studentId: string;
  name: string;
  wordCount: number;
  errorCount: number;
  grammarAchievedPoints: number | string;
  exemptFromGrammar?: boolean;
  pointsMap: Record<string, number>; // Maps 'aspectId_criterionId' to points awarded
  feedback: string;
  hasChanged: boolean;
  manualQuotientOverride?: number;
  tendenz?: '+' | '-' | '';
}

export default function SchularbeitClassTable({
  subject,
  semester,
  saIndex,
  schueler = [],
  currentTemplate,
  config,
  onClose,
  isFullScreen = false,
  onToggleFullScreen
}: Props) {
  const { app, setApp } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Load or build rows for each student
  const [rows, setRows] = useState<RowState[]>(() => {
    // Get class default aspects template just in case
    let saDefaultAspects = currentTemplate;
    try {
      const savedDefaults = localStorage.getItem(`sa_default_aspects_${subject}_${semester}_${saIndex}`);
      if (savedDefaults) {
        saDefaultAspects = JSON.parse(savedDefaults);
      }
    } catch (e) {
      console.error(e);
    }

    return schueler.map(student => {
      const existing = app.saAssessments?.[student.id]?.[subject]?.[semester]?.[saIndex];
      
      // Map existing points or start with 0
      const pointsMap: Record<string, number> = {};
      const activeAspects: Aspect[] = existing?.aspects || saDefaultAspects;

      activeAspects.forEach(aspect => {
        aspect.criteria.forEach(crit => {
          // If no existing assessment exists for this student, initialize points to 0 instead of propagating template scores
          pointsMap[`${aspect.id}_${crit.id}`] = existing ? (crit.points || 0) : 0;
        });
      });

      return {
        studentId: student.id,
        name: `${student.vorname} ${student.nachname}`,
        wordCount: existing?.wordCount || 0,
        errorCount: existing?.errorCount || 0,
        grammarAchievedPoints: existing?.grammarAchievedPoints || 0,
        exemptFromGrammar: existing?.exemptFromGrammar || false,
        manualQuotientOverride: existing?.manualQuotientOverride,
        pointsMap,
        feedback: existing?.feedback || '',
        tendenz: existing?.tendenz || '',
        hasChanged: false
      };
    });
  });

  // Flat helper list of all criteria in the template for columns
  const flatCriteria = useMemo(() => {
    const list: { aspectId: string; aspectTitle: string; id: string; label: string; maxPoints: number; description: string }[] = [];
    currentTemplate.forEach(aspect => {
      aspect.criteria.forEach(crit => {
        list.push({
          aspectId: aspect.id,
          aspectTitle: aspect.title,
          id: crit.id,
          label: crit.label,
          maxPoints: crit.maxPoints,
          description: crit.description
        });
      });
    });
    return list;
  }, [currentTemplate]);

  // Grade calculation helpers corresponding to the parent settings
  const pointsToGrade = (points: number) => {
    if (points >= config.grade1Points) return 1;
    if (points >= config.grade2Points) return 2;
    if (points >= config.grade3Points) return 3;
    if (points >= config.grade4Points) return 4;
    return 5;
  };

  const pointsToGrammarGrade = (points: number) => {
    if (!config.enableGrammar) return 0;
    if (points >= config.grammar1Points) return 1;
    if (points >= config.grammar2Points) return 2;
    if (points >= config.grammar3Points) return 3;
    if (points >= config.grammar4Points) return 4;
    return 5;
  };

  const quotientToSpellingGrade = (q: number) => {
    if (q <= config.spelling1Q) return 1;
    if (q <= config.spelling2Q) return 2;
    if (q <= config.spelling3Q) return 3;
    if (q <= config.spelling4Q) return 4;
    return 5;
  };

  // Compute calculated values per row in real-time
  const computedRows = useMemo(() => {
    return rows.map(row => {
      // 1. Calculate sum of criteria points
      let aspectPointsSum = 0;
      flatCriteria.forEach(col => {
        aspectPointsSum += row.pointsMap[`${col.aspectId}_${col.id}`] || 0;
      });

      // 2. Calculations for Spelling quotient
      let spellingQuotient = 0;
      if (row.manualQuotientOverride !== undefined && row.manualQuotientOverride !== null) {
        spellingQuotient = row.manualQuotientOverride;
      } else if (row.wordCount > 0) {
        const factor = config.spellingFactor || 1000;
        spellingQuotient = (row.errorCount * factor) / row.wordCount;
      }

      // 3. Compute grades
      const aNote = pointsToGrade(aspectPointsSum); // Inhaltsnote
      const sNote = config.enableSpelling !== false ? quotientToSpellingGrade(spellingQuotient) : 0; // Rechtschreibnote
      
      // Arbeitsnote: (Inhaltsnote x 3 + Rechtschreibnote) / 4
      const arbeitsNote = config.enableSpelling !== false 
        ? Math.round((aNote * 3 + sNote) / 4)
        : aNote;

      let gNoteInner = 0;
      let grammatikNote = 0;
      
      const hasGrammar = config.enableGrammar && !row.exemptFromGrammar;
      
      if (hasGrammar) {
        let parsedGrammarPoints = 0;
        if (typeof row.grammarAchievedPoints === 'string') {
          parsedGrammarPoints = parseFloat(row.grammarAchievedPoints.replace(',', '.')) || 0;
        } else if (typeof row.grammarAchievedPoints === 'number') {
          parsedGrammarPoints = row.grammarAchievedPoints;
        }
        grammatikNote = pointsToGrammarGrade(parsedGrammarPoints);
        const wArbeit = config.weightArbeit || 1;
        const wGrammatik = config.weightGrammar || 1;
        const totalWeight = wArbeit + wGrammatik;
        const weightedSum = arbeitsNote * wArbeit + grammatikNote * wGrammatik;
        gNoteInner = Math.round(weightedSum / totalWeight);
      } else {
        gNoteInner = arbeitsNote;
      }

      return {
        ...row,
        totalPoints: aspectPointsSum,
        arbeitsNote: aNote, // Keep standard 'aNote' reference so feedback texts reflect text performance
        echteArbeitsNote: arbeitsNote,
        spellingPoints: spellingQuotient,
        rechtschreibNote: sNote,
        grammatikNote,
        gesamtnote: gNoteInner
      };
    });
  }, [rows, flatCriteria, config]);

  // Handle cell changes
  const handlePointsChange = (studentId: string, aspectId: string, criterionId: string, val: number) => {
    setRows(prev => prev.map(row => {
      if (row.studentId !== studentId) return row;
      return {
        ...row,
        pointsMap: {
          ...row.pointsMap,
          [`${aspectId}_${criterionId}`]: val
        },
        hasChanged: true
      };
    }));
  };

  const handleWordCountChange = (studentId: string, val: number) => {
    setRows(prev => prev.map(row => {
      if (row.studentId !== studentId) return row;
      return {
        ...row,
        wordCount: Math.max(0, val),
        hasChanged: true
      };
    }));
  };

  const handleManualFeedbackChange = (studentId: string, val: string) => {
    setRows(prev => prev.map(row => {
      if (row.studentId !== studentId) return row;
      return {
        ...row,
        feedback: val,
        hasChanged: true
      };
    }));
  };

  const handleTendenzChange = (studentId: string, val: '+' | '-' | '') => {
    setRows(prev => prev.map(row => {
      if (row.studentId !== studentId) return row;
      return {
        ...row,
        tendenz: val,
        hasChanged: true
      };
    }));
  };

  const handleFeedbackGenerator = (studentId: string) => {
    const student = schueler.find(s => s.id === studentId);
    if (!student) return;

    const rowData = computedRows.find(r => r.studentId === studentId);
    if (!rowData) return;

    const firstName = student.vorname;
    const traits = student.charakter || [];
    const isMath = subject === 'Mathematik';

    let intro = "";
    if (traits.includes('kreativ')) {
      intro = isMath 
        ? `Liebe/r ${firstName}, deine kreative Herangehensweise an die Aufgabenstellungen hat sich gelohnt! ` 
        : `Liebe/r ${firstName}, deine kreative Vorstellungskraft glänzt in dieser Schularbeit förmlich auf! `;
    } else if (traits.includes('lebhaft')) {
      intro = isMath
        ? `Liebe/r ${firstName}, mit deiner dynamischen Art hast du schwungvoll gearbeitet. `
        : `Liebe/r ${firstName}, mit deiner lebendigen und dynamischen Art hast du eine wirklich schwungvolle Geschichte verfasst. `;
    } else if (traits.includes('konzentriert') || traits.includes('aufmerksam')) {
      intro = isMath
        ? `Liebe/r ${firstName}, deine konzentrierte Arbeitsweise spiegelt sich wunderbar in deinen Rechenwegen wider. `
        : `Liebe/r ${firstName}, deine konzentrierte Arbeitsweise spiegelt sich wunderbar in der Struktur deines Textes wider. `;
    } else if (traits.includes('ruhig') || traits.includes('interessiert')) {
      intro = isMath
        ? `Liebe/r ${firstName}, deine besonnene und systematische Herangehensweise ist bei deinen Lösungen deutlich spürbar. `
        : `Liebe/r ${firstName}, deine besonnene und interessierte Herangehensweise ist beim Lesen der Zeilen deutlich spürbar. `;
    } else {
      intro = `Liebe/r ${firstName}, du hast dir bei dieser Schularbeit viel Mühe gegeben! `;
    }

    let textFeedback = "";
    if (isMath) {
      if (rowData.arbeitsNote === 1) {
        textFeedback = "Du hast die mathematischen Konzepte hervorragend verstanden und die Aufgaben fehlerfrei gelöst.";
      } else if (rowData.arbeitsNote === 2) {
        textFeedback = "Du hast sehr gut gerechnet. Nur ganz kleine Rechen- oder Flüchtigkeitsfehler haben sich eingeschlichen.";
      } else if (rowData.arbeitsNote === 3) {
        textFeedback = "Die wesentlichen Rechenwege beherrschst du gut. Achte beim nächsten Mal darauf, noch genauer zu arbeiten und die Ergebnisse zu überprüfen.";
      } else if (rowData.arbeitsNote === 4) {
        textFeedback = "Die Grundkonzepte hast du größtenteils verstanden. Wir werden noch etwas üben müssen, damit du beim Rechnen sicherer wirst.";
      } else {
        textFeedback = "Das Rechnen fällt dir teilweise noch schwer. Wir werden die wichtigsten Bausteine in der nächsten Zeit gemeinsam in Ruhe noch einmal üben.";
      }
    } else {
      if (rowData.arbeitsNote === 1) {
        textFeedback = "Inhaltlich und sprachlich ist dir ein meisterhafter Bogen gelungen. Deine Satzstrukturen sind abwechslungsreich und der rote Faden zieht sich schlüssig durch.";
      } else if (rowData.arbeitsNote === 2) {
        textFeedback = "Du hast die Geschichte gut aufgebaut, einen passenden Wortschatz gewählt und dich sehr präzise ausgedrückt. Ein paar kleine Formulierungen könnten noch runder sein.";
      } else if (rowData.arbeitsNote === 3) {
        textFeedback = "Die grundlegenden Elemente deiner Erzählung sind vorhanden und gut verständlich. Achte nächstes Mal noch bewusster auf die abwechslungsreiche Satzgestaltung und die Zeitenfolge.";
      } else if (rowData.arbeitsNote === 4) {
        textFeedback = "Deine Erzählung ist im Kern verständlich und du hast das Thema umgesetzt. Es wäre jedoch hilfreich, den Wortschatz weiter auszubauen und Erzählschritte genauer auszuführen.";
      } else {
        textFeedback = "Um deinen Schreibstil und den Textaufbau zu festigen, werden wir in den nächsten Wochen gemeinsam noch ein paar gezielte Schreib- und Strukturierungsübungen machen.";
      }
    }

    let spellingFeedback = "";
    if (!isMath && config.enableSpelling !== false) {
      if (rowData.rechtschreibNote === 1) {
        spellingFeedback = "Besonders erfreulich ist deine hervorragende Rechtschreibung. Deine Fokussierung beim Schreiben zahlt sich voll aus!";
      } else if (rowData.rechtschreibNote === 2) {
        spellingFeedback = "Auch deine Rechtschreibkompetenz ist gut ausgeprägt, nur wenige Flüchtigkeitsfehler haben sich eingeschlichen.";
      } else if (rowData.rechtschreibNote === 3) {
        spellingFeedback = "Rechtschreiblich gibt es noch ein paar Unsicherheiten, z.B. bei der Wortschreibung oder den Satzanfängen, die wir gemeinsam festigen können.";
      } else if (rowData.rechtschreibNote === 4) {
        spellingFeedback = "Bezüglich der Rechtschreibung ist es ratsam, künftig noch sorgfältiger Korrektur zu lesen und bekannte Regeln (wie Groß und Klein) anzuwenden.";
      } else {
        spellingFeedback = "In der Rechtschreibung zeigen sich größere Lücken. Mit gezieltem Wörter-Training werden wir hier Schritt für Schritt Sicherheit gewinnen.";
      }
      spellingFeedback = " " + spellingFeedback;
    }

    let closing = "";
    if (rowData.gesamtnote <= 2) {
      closing = " Mach weiter so, ich bin sehr stolz auf deine hervorragende Leistung!";
    } else if (rowData.gesamtnote === 3) {
      closing = " Ein schöner Erfolg! Mit etwas mehr Übung kletterst du bald noch weiter nach oben.";
    } else if (rowData.gesamtnote === 4) {
      closing = " Ein solider Schritt nach vorn! Lass den Kopf nicht hängen – wir üben weiter und das nächste Mal klappt es noch besser.";
    } else {
      closing = " Lass uns diesen Bogen als Motivation nehmen. Ich unterstütze dich voll und ganz dabei, beim nächsten Mal wieder durchzustarten!";
    }

    const generatedText = `${intro}${textFeedback}${spellingFeedback}${closing}`;
    
    setRows(prev => prev.map(row => {
      if (row.studentId !== studentId) return row;
      return {
        ...row,
        feedback: generatedText,
        hasChanged: true
      };
    }));
  };

  const handleErrorsChange = (studentId: string, val: number) => {
    setRows(prev => prev.map(row => {
      if (row.studentId !== studentId) return row;
      return {
        ...row,
        errorCount: Math.max(0, val),
        hasChanged: true
      };
    }));
  };

  const handleGrammarPointsChange = (studentId: string, val: number | string) => {
    setRows(prev => prev.map(row => {
      if (row.studentId !== studentId) return row;
      
      let parsedVal: number | string = val;
      if (typeof val === 'string') {
        // Just store the string so that things like '1.' or '1,' don't immediately lose their decimal mark
        parsedVal = val;
      } else if (typeof val === 'number') {
        parsedVal = Math.max(0, val);
      }
      
      return {
        ...row,
        grammarAchievedPoints: parsedVal,
        hasChanged: true
      };
    }));
  };

  const toggleExemptFromGrammar = (studentId: string) => {
    setRows(prev => prev.map(row => {
      if (row.studentId !== studentId) return row;
      return {
        ...row,
        exemptFromGrammar: !row.exemptFromGrammar,
        hasChanged: true
      };
    }));
  };

  // Copy values from Row 1 to all other students to quickly initialize values (optional but super cool feature!)
  const handleAutoFillWithDefault = () => {
    if (confirm('Möchtest du alle unausgefüllten Schüler mit 0 % Punkten initialisieren? Bereits ausgefüllte Bögen bleiben unberührt.')) {
      setRows(prev => prev.map(row => {
        // Only autofill if they didn't have any inputs yet (wordcount is 0 and sum of points is 0)
        let totalPoints = 0;
        flatCriteria.forEach(col => {
          totalPoints += row.pointsMap[`${col.aspectId}_${col.id}`] || 0;
        });
        
        if (row.wordCount === 0 && totalPoints === 0) {
          const defaultPoints: Record<string, number> = {};
          flatCriteria.forEach(col => {
            // Fill with full points as a starting benchmark
            defaultPoints[`${col.aspectId}_${col.id}`] = col.maxPoints;
          });
          return {
            ...row,
            wordCount: 150, // default placeholder word count
            errorCount: 2,  // default spelling benchmark
            pointsMap: defaultPoints,
            hasChanged: true
          };
        }
        return row;
      }));
    }
  };

  // Main multi-save process
  const saveAllRows = () => {
    setSaveStatus('saving');
    try {
      setApp(prev => {
        const assessments = { ...(prev.saAssessments || {}) };
        const notenState = { ...(prev.noten || {}) };

        computedRows.forEach(row => {
          // We always want to save in case the global Config has changed
          // const alreadyExists = !!assessments[row.studentId]?.[subject]?.[semester]?.[saIndex];
          // if (!row.hasChanged && alreadyExists) {
          //   return;
          // }

          // Build custom structured activeAspects array for this specific student save
          const studentAspects = currentTemplate.map(tmplAspect => {
            return {
              ...tmplAspect,
              criteria: tmplAspect.criteria.map(tmplCrit => {
                const awarded = row.pointsMap[`${tmplAspect.id}_${tmplCrit.id}`] ?? 0;
                return {
                  ...tmplCrit,
                  points: awarded
                };
              })
            };
          });

          // Compute pedagogical feedback text if none provided
          let finalFeedback = row.feedback;
          if (!finalFeedback.trim()) {
            // Auto generation placeholder to keep data coherent
            const studentObj = schueler.find(s => s.id === row.studentId);
            const fn = studentObj ? studentObj.vorname : row.name;
            finalFeedback = `Liebe/r ${fn}, deine Bewertung wurde über das Klassenraster eingetragen. Ein sehr solider Leistungsnachweis.`;
          }

          let savedGrammarPoints = 0;
          if (typeof row.grammarAchievedPoints === 'string') {
            savedGrammarPoints = parseFloat(row.grammarAchievedPoints.replace(',', '.')) || 0;
          } else if (typeof row.grammarAchievedPoints === 'number') {
            savedGrammarPoints = row.grammarAchievedPoints;
          }

          const assessmentData = {
            aspects: studentAspects,
            spellingPoints: row.spellingPoints,
            manualQuotientOverride: row.manualQuotientOverride,
            wordCount: row.wordCount,
            errorCount: row.errorCount,
            grammarAchievedPoints: savedGrammarPoints,
            exemptFromGrammar: row.exemptFromGrammar,
            arbeitsNote: row.arbeitsNote,
            rechtschreibNote: row.rechtschreibNote,
            grammatikNote: (row as any).grammatikNote,
            gesamtnote: row.gesamtnote,
            tendenz: row.tendenz,
            timestamp: Date.now(),
            config,
            feedback: finalFeedback
          };

          // Update assessments node
          const sData = assessments[row.studentId] || {};
          const fData = sData[subject] || {};
          const semData = fData[semester] || {};
          
          assessments[row.studentId] = {
            ...sData,
            [subject]: {
              ...fData,
              [semester]: {
                ...semData,
                [saIndex]: assessmentData
              }
            }
          };

          // Update main Gradebook Array
          const sidData = notenState[row.studentId] || {};
          const fachData = sidData[subject] || {};
          const mainSemData = fachData[semester] || { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] };
          const saArray = [...(mainSemData.sa || [])];
          saArray[saIndex] = row.tendenz ? `${row.gesamtnote}${row.tendenz}` : row.gesamtnote;

          notenState[row.studentId] = {
            ...sidData,
            [subject]: {
              ...fachData,
              [semester]: {
                ...mainSemData,
                sa: saArray
              }
            }
          };
        });

        return {
          ...prev,
          saAssessments: assessments,
          noten: notenState
        };
      });

      logActivity(setApp, `Klassen-Punkte-Grid für ${subject} (${saIndex + 1}. SA) aktualisiert`, 'note');
      setSaveStatus('success');

      // Mark all as saved
      setRows(prev => prev.map(row => ({ ...row, hasChanged: false })));

      setTimeout(() => {
        setSaveStatus('idle');
        onClose();
      }, 1000);

    } catch (e) {
      console.error(e);
      setSaveStatus('error');
    }
  };

  const filteredComputedRows = useMemo(() => {
    return computedRows.filter(row => 
      row.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [computedRows, searchTerm]);

  const hasAnyChanges = useMemo(() => {
    return rows.some(r => r.hasChanged);
  }, [rows]);

  return (
    <div className={`bg-white border border-zinc-200 shadow-sm space-y-6 h-full flex flex-col transition-all duration-300 ${isFullScreen ? 'rounded-none p-8' : 'rounded-[2rem] p-6'}`}>
      {/* Table Header and Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-5 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[0.625rem] font-black uppercase tracking-widest bg-indigo-50 border border-indigo-150 text-indigo-700 px-2.5 py-0.5 rounded-full">
              Klassen-Eingabe-Modus 📊
            </span>
            <span className="text-[0.75rem] leading-tight font-black text-amber-600 bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded-lg select-none">
              In Echtzeit rechnen
            </span>
          </div>
          <h3 className="text-[0.875rem] leading-snug font-black text-zinc-800 uppercase tracking-tight">
            Punktematrix & Schnelleingabe für alle Schüler
          </h3>
          <p className="text-[0.65625rem] font-bold text-zinc-400">
            Du kannst hier bequem alle Spalten befüllen. Die Noten berechnen sich direkt gemäß deinen Schularbeits-Kriterien!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start">
          {onToggleFullScreen && (
            <button
              type="button"
              onClick={onToggleFullScreen}
              className="px-3.5 py-2 hover:bg-zinc-100 text-zinc-500 border border-zinc-200 rounded-xl text-[0.625rem] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm"
              title={isFullScreen ? "Vollbild beenden" : "Vollbild aktivieren"}
            >
              {isFullScreen ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
              {isFullScreen ? "Fenster verkleinern" : "Vollbildmodus"}
            </button>
          )}

          <button
            type="button"
            onClick={handleAutoFillWithDefault}
            className="px-3.5 py-2 hover:bg-zinc-100 text-zinc-500 border border-zinc-200 rounded-xl text-[0.625rem] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
            title="Sorgt für eine schnelle Voreinstellung aller noch unausgefüllten Schüler auf Höchstpunktzahl/Standardwerte"
          >
            <RefreshCw size={11} /> Schnell-Ausfüllen Voreinstellung
          </button>

          <button
            type="button"
            disabled={saveStatus === 'saving'}
            onClick={saveAllRows}
            className={`px-4 py-2 text-white text-[0.75rem] leading-tight font-black uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-lg transition-all active:scale-[0.98] ${
              true || hasAnyChanges || saveStatus === 'success'
              ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/15'
              : 'bg-zinc-400 cursor-not-allowed shadow-zinc-400/5'
            }`}
          >
            {saveStatus === 'saving' && <span className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full inline-block" />}
            {saveStatus === 'success' && <Check size={13} className="text-emerald-250 animate-bounce" />}
            {saveStatus === 'idle' && <Save size={13} />}
            {saveStatus === 'success' ? 'Erfolgreich gesichert ✓' : 'Alle Änderungen & Einstellungen speichern'}
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-zinc-50 border border-zinc-200/50 p-3 rounded-2xl">
        <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-3 py-1.5 shadow-sm w-full sm:w-72">
          <Search size={13} className="text-zinc-400 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Schüler filtern..."
            className="bg-transparent border-none text-[0.75rem] leading-tight font-bold outline-none placeholder-zinc-400 w-full"
          />
        </div>
        
        <div className="flex items-center gap-3 text-[0.625rem] font-bold text-zinc-500">
          <span className="flex items-center gap-1 text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Gesichert</span>
          <span className="flex items-center gap-1 text-amber-605 text-amber-600"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block animate-pulse" /> Geändert (ungespeichert)</span>
        </div>
      </div>

      {/* Spreadsheet Table Container */}
      <div className="border border-zinc-200 rounded-[2rem] bg-white flex flex-col flex-1 min-h-[400px] shadow-2xl relative overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar relative flex-1 h-full">
          <table className="w-full text-left border-collapse table-auto min-w-[1600px]">
            <thead className="sticky top-0 z-30">
              <tr className="bg-zinc-50/80 backdrop-blur-md border-b border-zinc-200">
                {/* 1. Name Column (Sticky left) */}
                <th className="sticky left-0 bg-zinc-50 z-[40] px-6 py-4 border-r border-zinc-200 text-[0.625rem] font-black uppercase text-zinc-400 tracking-[0.2em] w-56 shadow-[4px_0_10px_0_rgba(0,0,0,0.02)]">
                  Schüler/in
                </th>

                {/* 2. Criteria Matrix Column Headers */}
                {flatCriteria.map((col, idx) => (
                  <th 
                    key={`${col.aspectId}_${col.id}`}
                    className="px-4 py-4 border-r border-zinc-250/30 text-[0.625rem] font-black uppercase text-zinc-500 text-center relative group min-w-[100px]"
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-[0.5rem] text-indigo-500 font-extrabold mb-1 px-1.5 py-0.5 bg-indigo-50 rounded uppercase tracking-tighter">
                        {col.aspectTitle.split(' ').slice(1).join(' ').substring(0, 12)}
                      </span>
                      <span className="text-zinc-800 tracking-tight leading-none text-center h-8 flex items-center justify-center">
                        {col.label}
                      </span>
                      <div className="mt-2 w-full flex items-center justify-center gap-1">
                         <span className="w-1.5 h-1.5 rounded-full bg-zinc-200" />
                         <span className="text-[0.5rem] text-zinc-400 font-black uppercase">Max {col.maxPoints}</span>
                      </div>
                    </div>

                    {/* Tooltip */}
                    <div className="hidden group-hover:block absolute left-1/2 -bottom-16 -translate-x-1/2 bg-zinc-900 text-white p-3 rounded-2xl text-[0.625rem] font-bold leading-normal w-56 shadow-2xl z-[100] text-left border border-white/10 animate-in fade-in zoom-in-95">
                      <p className="font-black text-amber-400 uppercase tracking-widest text-[0.5625rem] mb-1">{col.aspectTitle}</p>
                      <p className="font-black text-[0.6875rem] mb-1.5">{col.label}</p>
                      <p className="text-zinc-300 font-medium leading-relaxed italic">{col.description}</p>
                    </div>
                  </th>
                ))}

                {/* 3. Aggregate totals and language scores columns */}
                <th className="px-4 py-4 border-r border-zinc-200 text-[0.625rem] font-black uppercase text-indigo-600 text-center bg-indigo-50/40 min-w-[80px]">
                  Punkte
                </th>
                {config.enableSpelling !== false && (
                  <>
                    <th className="px-4 py-4 border-r border-zinc-200 text-[0.625rem] font-black uppercase text-rose-500 text-center bg-rose-50/30 min-w-[90px]">
                      Wörter
                    </th>
                    <th className="px-4 py-4 border-r border-zinc-200 text-[0.625rem] font-black uppercase text-rose-600 text-center bg-rose-50/50 min-w-[90px]">
                      Fehler
                    </th>
                    <th className="px-4 py-4 border-r border-zinc-200 text-[0.625rem] font-black uppercase text-rose-700 text-center bg-rose-100/30 min-w-[70px]">
                      Note
                    </th>
                  </>
                )}
                
                {config.enableGrammar && (
                   <th className="px-4 py-4 border-r border-zinc-200 text-[0.625rem] font-black uppercase text-amber-600 text-center bg-amber-50/50 min-w-[80px]">
                     Gramm.
                   </th>
                )}
                
                <th className="px-6 py-4 text-[0.75rem] font-black uppercase text-zinc-900 text-center bg-zinc-100/80 sticky right-0 z-[40] w-32 shadow-[-4px_0_10px_0_rgba(0,0,0,0.02)]">
                  Note
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredComputedRows.map((row) => {
                const isChanged = row.hasChanged;
                
                return (
                  <tr 
                    key={row.studentId} 
                    className={`group border-b border-zinc-150 last:border-0 hover:bg-zinc-50/60 transition-colors ${
                      isChanged ? 'bg-amber-50/20' : ''
                    }`}
                  >
                    {/* Name column */}
                    <td className={`sticky left-0 bg-white group-hover:bg-zinc-50/60 z-20 px-6 py-3 border-r border-zinc-200 font-extrabold text-[0.8125rem] transition-colors ${
                      isChanged ? 'bg-amber-50/20' : ''
                    }`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-zinc-900 truncate max-w-[200px]">{row.name}</span>
                        {isChanged && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/20 animate-pulse shrink-0" />}
                      </div>
                    </td>

                    {/* Criteria point cell entries */}
                    {flatCriteria.map((col) => {
                      const value = row.pointsMap[`${col.aspectId}_${col.id}`] ?? 0;
                      const optionsCount = col.maxPoints * 2 + 1;
                      const pointOptions = Array.from({ length: optionsCount }, (_, i) => i / 2);

                      return (
                        <td 
                          key={`${col.aspectId}_${col.id}`}
                          className="px-2 py-3 border-r border-zinc-100/50 text-center"
                        >
                          <select
                            value={value}
                            onChange={(e) => handlePointsChange(row.studentId, col.aspectId, col.id, parseFloat(e.target.value))}
                            className={`text-[0.6875rem] font-black text-center rounded-xl p-2 min-w-[70px] outline-none transition-all cursor-pointer appearance-none hover:scale-105 border-2 ${
                              value === col.maxPoints 
                              ? 'border-emerald-100 text-emerald-700 bg-emerald-50' 
                              : value === 0 
                              ? 'border-zinc-100 text-zinc-300 bg-zinc-50/50' 
                              : 'border-zinc-200 text-zinc-700 bg-white'
                            }`}
                          >
                            {pointOptions.map(p => (
                              <option key={p} value={p}>
                                {p.toString().replace('.', ',')}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    })}

                    {/* Text results */}
                    <td className="px-4 py-3 border-r border-zinc-100 text-center font-black text-[0.8125rem] text-indigo-700 bg-indigo-50/20">
                      {row.totalPoints.toString().replace('.', ',')}
                    </td>

                    {/* Spelling inputs */}
                    {config.enableSpelling !== false && (
                      <>
                        <td className="px-3 py-3 border-r border-zinc-100 text-center bg-rose-50/10">
                          <input
                            type="number"
                            min="0"
                            value={row.wordCount || ''}
                            onChange={(e) => handleWordCountChange(row.studentId, parseInt(e.target.value) || 0)}
                            className="w-16 bg-white border border-zinc-200 rounded-xl px-2 py-2 text-center text-[0.75rem] font-black outline-rose-500 shadow-sm"
                          />
                        </td>
                        <td className="px-3 py-3 border-r border-zinc-100 text-center bg-rose-50/20">
                          <input
                            type="number"
                            min="0"
                            value={row.errorCount || ''}
                            onChange={(e) => handleErrorsChange(row.studentId, parseInt(e.target.value) || 0)}
                            className="w-16 bg-white border border-rose-100 rounded-xl px-2 py-2 text-center text-[0.75rem] font-black outline-rose-500 shadow-sm"
                          />
                        </td>
                        <td className="px-3 py-3 border-r border-zinc-100 text-center font-black text-[0.875rem] text-rose-600 bg-rose-50/40">
                          {row.rechtschreibNote}
                        </td>
                      </>
                    )}

                    {config.enableGrammar && (
                       <td className="px-3 py-3 border-r border-zinc-100 text-center bg-amber-50/20">
                         {!row.exemptFromGrammar ? (
                            <input
                              type="text"
                              value={row.grammarAchievedPoints === 0 ? '0' : row.grammarAchievedPoints || ''}
                              onChange={(e) => handleGrammarPointsChange(row.studentId, e.target.value)}
                              className="w-14 bg-white border border-amber-200 rounded-xl px-2 py-2 text-center text-[0.75rem] font-bold outline-amber-500 shadow-sm"
                            />
                         ) : (
                            <span className="text-zinc-300 font-bold">-</span>
                         )}
                       </td>
                    )}

                    {/* Final Grade */}
                    <td className={`sticky right-0 text-center px-4 py-3 border-l border-zinc-200/50 font-black text-[1.125rem] z-30 group-hover:bg-zinc-100/80 transition-colors ${
                      isChanged ? 'bg-amber-50/20 animate-pulse' : 'bg-zinc-50/80 shadow-[-4px_0_10px_0_rgba(0,0,0,0.02)]'
                    }`}>
                       <div className="flex flex-col items-center justify-center gap-1.5">
                         <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black shadow-lg relative ${
                           row.gesamtnote === 5 ? 'bg-rose-500 text-white shadow-rose-200' :
                           row.gesamtnote === 1 ? 'bg-emerald-500 text-white shadow-emerald-200' :
                           'bg-zinc-800 text-white shadow-zinc-200'
                         }`}>
                           {row.gesamtnote}
                           {row.tendenz && <span className="absolute -top-1 -right-2 text-[0.6875rem] w-4 h-4 bg-white text-zinc-900 rounded-full flex items-center justify-center shadow-sm border border-zinc-200 leading-none">{row.tendenz}</span>}
                         </div>
                         
                         {/* Tendency toggles */}
                         <div className="flex items-center bg-white rounded-md border border-zinc-200 shadow-sm overflow-hidden" title="Notentendez (+/-) festlegen. Sichtbar in der Notenmappe.">
                           <button 
                             onClick={() => handleTendenzChange(row.studentId, row.tendenz === '+' ? '' : '+')}
                             className={`w-5 h-4 flex items-center justify-center text-[0.65rem] font-black transition-colors ${row.tendenz === '+' ? 'bg-indigo-100 text-indigo-700' : 'text-zinc-400 hover:bg-zinc-50'}`}>+</button>
                           <button 
                             onClick={() => handleTendenzChange(row.studentId, row.tendenz === '-' ? '' : '-')}
                             className={`w-5 h-4 flex items-center justify-center text-[0.65rem] font-black transition-colors border-l border-zinc-100 ${row.tendenz === '-' ? 'bg-indigo-100 text-indigo-700' : 'text-zinc-400 hover:bg-zinc-50'}`}>-</button>
                         </div>
                       </div>
                    </td>

                    {/* Feedback / Note description column */}
                    <td className="px-2 py-1.5 text-center flex items-center gap-1 bg-zinc-50/20 justify-center h-[52px]">
                      <textarea
                        value={row.feedback}
                        onChange={(e) => handleManualFeedbackChange(row.studentId, e.target.value)}
                        placeholder="Feedback..."
                        className="flex-1 min-w-[100px] max-h-[38px] text-[0.5625rem] font-medium border border-zinc-200 rounded-lg p-1 resize-none bg-white text-zinc-600 leading-none outline-indigo-500 placeholder-zinc-400"
                        title={row.feedback || 'Kein Feedback'}
                      />
                      <button
                        type="button"
                        onClick={() => handleFeedbackGenerator(row.studentId)}
                        className="p-1 hover:bg-indigo-50 border border-zinc-200 text-indigo-500 hover:text-indigo-600 rounded-lg shrink-0 transition-colors"
                        title="AI Feedback"
                      >
                        <Sparkles size={11} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scoring scale display / reference table beneath the spreadsheet */}
      <div className="bg-amber-50/40 border border-amber-150/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-[0.625rem] font-black uppercase text-amber-805 text-amber-800 tracking-wider flex items-center gap-1.5 leading-none">
            <Info size={12} /> Aktuelle Notenskala (Text-Arbeit)
          </h4>
          <p className="text-[0.625rem] font-bold text-zinc-500">
            Sehr gut (1): ≥ {config.grade1Points} Pkt • Gut (2): ≥ {config.grade2Points} Pkt • Befriedigend (3): ≥ {config.grade3Points} Pkt • Genügend (4): ≥ {config.grade4Points} Pkt • Nicht genügend (5): Behebt den Rest.
          </p>
        </div>
        {config.enableSpelling !== false && (
          <div className="text-[0.59375rem] font-black uppercase tracking-wider text-rose-800 bg-rose-50 border border-rose-200/50 px-3 py-1.5 rounded-xl">
            RS-Quotient: {config.spellingFactor} * Fehler / Wörter (1er: ≤ {config.spelling1Q} | 4er: ≤ {config.spelling4Q})
          </div>
        )}
      </div>
    </div>
  );
}
