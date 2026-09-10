import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { berechne } from '../lib/GradeUtils';
import { polishText } from '../services/aiService';
import { 
  Printer, Award, FileText, CheckCircle2, Save, Sparkles, RefreshCw, 
  Settings, User, Calendar, CheckSquare, ShieldAlert, BadgeInfo, Trash2, Plus
} from 'lucide-react';

interface OberauSkalaProps {
  schuelerId: string;
}

interface OberauCriterion {
  id: string;
  label: string;
}

interface OberauSubsection {
  id: string;
  label: string;
  items: OberauCriterion[];
}

interface OberauCategory {
  id: string;
  label: string;
  color: string;
  badgeBg: string;
  textCol: string;
  scaleColor?: string; // Add scaleColor for dynamic styling
  subsections?: OberauSubsection[];
  items?: OberauCriterion[];
}

// 1. STANDARD STRUCTURE (Without educational needs / Ohne SPF)
export const OBERAU_STANDARD_STRUCTURE: OberauCategory[] = [
  {
    id: 'de',
    label: 'Deutsch',
    color: 'border-blue-500/10 bg-blue-500/5',
    badgeBg: 'bg-blue-600 text-white border-blue-700 shadow-sm',
    textCol: 'text-blue-600',
    scaleColor: 'blue',
    subsections: [
      {
        id: 'hoeren',
        label: 'Hören und Sprechen',
        items: [
          { id: 'de_hoeren_gespraeche', label: 'Gespräche führen und Texte vortragen' },
          { id: 'de_hoeren_standardsprache', label: 'In Standardsprache sprechen' },
          { id: 'de_hoeren_zuhoeren', label: 'Bewusstes Zuhören' }
        ]
      },
      {
        id: 'lesen',
        label: 'Lesen',
        items: [
          { id: 'de_lesen_fliessend', label: 'Fließend und betont lesen' },
          { id: 'de_lesen_verstaendnis', label: 'Leseverständnis' },
          { id: 'de_lesen_info_verarbeit', label: 'Informationen verarbeiten' }
        ]
      },
      {
        id: 'rechtschreiben',
        label: 'Rechtschreiben und Sprachbetrachtung',
        items: [
          { id: 'de_rechtschreiben_richtig', label: 'Wörter und Texte richtig schreiben' },
          { id: 'de_rechtschreiben_lernwoerter', label: 'Lernwörter richtig schreiben' },
          { id: 'de_rechtschreiben_wortfamilie', label: 'Wortfamilie und Wortstamm' },
          { id: 'de_rechtschreiben_wortarten', label: 'Wortarten' },
          { id: 'de_rechtschreiben_zeitformen', label: 'Zeitformen' }
        ]
      },
      {
        id: 'verfassen',
        label: 'Verfassen von Texten',
        items: [
          { id: 'de_verfassen_planen', label: 'Texte planen und verfassen' },
          { id: 'de_verfassen_ueberarbeiten', label: 'Texte überarbeiten' }
        ]
      }
    ]
  },
  {
    id: 'ma',
    label: 'Mathematik',
    color: 'border-red-500/10 bg-red-500/5',
    badgeBg: 'bg-red-600 text-white border-red-700 shadow-sm',
    textCol: 'text-red-600',
    scaleColor: 'red',
    subsections: [
      {
        id: 'zahlen',
        label: 'Zahlen und Daten',
        items: [
          { id: 'ma_zahlen_zahlenraum', label: 'Orientierung im Zahlenraum 1000' },
          { id: 'ma_zahlen_stellenwert', label: 'Stellenwert' },
          { id: 'ma_zahlen_daten', label: 'Daten erheben und aufzeichnen' }
        ]
      },
      {
        id: 'rechnen',
        label: 'Rechenoperationen',
        items: [
          { id: 'ma_rechnen_addition', label: 'Schriftliche Addition' },
          { id: 'ma_rechnen_subtraktion', label: 'Schriftliche Subtraktion' },
          { id: 'ma_rechnen_multiplikation', label: 'Schriftliche Multiplikation' },
          { id: 'ma_rechnen_division', label: 'Schriftliche Division' },
          { id: 'ma_rechnen_sachaufgaben', label: 'Sachaufgaben' }
        ]
      },
      {
        id: 'groessen',
        label: 'Größen',
        items: [
          { id: 'ma_groessen_umwandeln', label: 'Gelernte Größen und Umwandlungen' }
        ]
      },
      {
        id: 'raum',
        label: 'Ebene und Raum',
        items: [
          { id: 'ma_raum_figuren', label: 'Figuren und Körper' },
          { id: 'ma_raum_umfang', label: 'Umfangberechnung' }
        ]
      }
    ]
  },
  {
    id: 'su',
    label: 'Sachunterricht',
    color: 'border-emerald-500/10 bg-emerald-500/5',
    badgeBg: 'bg-emerald-600 text-white border-emerald-700 shadow-sm',
    textCol: 'text-emerald-700',
    scaleColor: 'emerald',
    items: [
      { id: 'su_interesse', label: 'Interesse an den Themenbereichen' },
      { id: 'su_wiedergabe', label: 'Lerninhalte wiedergeben' }
    ]
  },
  {
    id: 'me',
    label: 'Musikerziehung',
    color: 'border-violet-500/10 bg-violet-500/5',
    badgeBg: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    textCol: 'text-violet-400',
    items: [
      { id: 'me_interesse', label: 'Interesse an Musik und Bewegung' }
    ]
  },
  {
    id: 'td',
    label: 'Technik und Design',
    color: 'border-violet-500/10 bg-violet-500/5',
    badgeBg: 'bg-violet-600 text-white border-violet-700 shadow-sm',
    textCol: 'text-violet-600',
    scaleColor: 'blue',
    items: [
      { id: 'td_planung', label: 'Planung und Gestaltung' }
    ]
  },
  {
    id: 'kg',
    label: 'Kunst und Gestaltung',
    color: 'border-purple-500/10 bg-purple-500/5',
    badgeBg: 'bg-purple-600 text-white border-purple-700 shadow-sm',
    textCol: 'text-purple-600',
    scaleColor: 'emerald',
    items: [
      { id: 'kg_gestaltung', label: 'Kreative, sorgfältige Gestaltung' }
    ]
  },
  {
    id: 'bs',
    label: 'Bewegung und Sport',
    color: 'border-teal-500/10 bg-teal-500/5',
    badgeBg: 'bg-teal-600 text-white border-teal-700 shadow-sm',
    textCol: 'text-teal-600',
    scaleColor: 'emerald',
    items: [
      { id: 'bs_freude', label: 'Freude an Bewegung und Fairness' }
    ]
  },
  {
    id: 're',
    label: 'Religion',
    color: 'border-fuchsia-500/10 bg-fuchsia-500/5',
    badgeBg: 'bg-fuchsia-600 text-white border-fuchsia-700 shadow-sm',
    textCol: 'text-fuchsia-600',
    scaleColor: 'blue',
    items: [
      { id: 're_interesse', label: 'Interesse und aktive Beteiligung' }
    ]
  },
  {
    id: 'al',
    label: 'Allgemeines',
    color: 'border-slate-300 bg-slate-50',
    badgeBg: 'bg-slate-700 text-white border-slate-800 shadow-sm',
    textCol: 'text-slate-700',
    scaleColor: 'emerald',
    items: [
      { id: 'al_mitarbeit', label: 'Mitarbeit' },
      { id: 'al_konzentration', label: 'Konzentration und Ausdauer' },
      { id: 'al_arbeitstempo', label: 'Arbeitstempo' },
      { id: 'al_ordnung', label: 'Ordnung' },
      { id: 'al_selbststaendigkeit', label: 'Selbstständigkeit' },
      { id: 'al_hausuebungen', label: 'Hausübungen' }
    ]
  }
];

// 2. SPF STRUCTURE (With educational needs / Mit Förderbedarf)
export const OBERAU_SPF_STRUCTURE: OberauCategory[] = [
  ...OBERAU_STANDARD_STRUCTURE.map(cat => {
    if (cat.id === 'de') {
      return {
        ...cat,
        subsections: [
          {
            id: 'hoeren',
            label: 'Hören und Sprechen',
            items: [
              { id: 'de_hoeren_gespraeche', label: 'Beteiligung am Gespräch' },
              { id: 'de_hoeren_standardsprache', label: 'Sprachlicher Ausdruck' },
              { id: 'de_hoeren_zuhoeren', label: 'Bewusstes Zuhören' }
            ]
          },
          {
            id: 'lesen',
            label: 'Lesen',
            items: [
              { id: 'de_lesen_fliessend', label: 'Flüssig lesen' },
              { id: 'de_lesen_verstaendnis', label: 'Leseverständnis' },
              { id: 'de_lesen_info_verarbeit', label: 'Auseinandersetzung mit Texten' }
            ]
          },
          {
            id: 'rechtschreiben',
            label: 'Rechtschreiben und Sprachbetrachtung',
            items: [
              { id: 'de_rechtschreiben_richtig', label: 'Texte richtig und leserlich abschreiben' },
              { id: 'de_rechtschreiben_lernwoerter', label: 'Geübter Schreibwortschatz' },
              { id: 'de_rechtschreiben_wortfamilie', label: 'Groß – und Kleinschreibung' },
              { id: 'de_rechtschreiben_wortarten', label: 'Verschiedene Satzstrukturen anwenden' },
              { id: 'de_rechtschreiben_zeitformen', label: 'Wortarten' }
            ]
          },
          {
            id: 'verfassen',
            label: 'Verfassen von Texten',
            items: [
              { id: 'de_verfassen_planen', label: 'Kurze Texte verfassen' },
              { id: 'de_verfassen_ueberarbeiten', label: 'Kurze Texte überarbeiten' }
            ]
          }
        ]
      };
    }
    if (cat.id === 'ma') {
      return {
        ...cat,
        subsections: [
          {
            id: 'zahlen',
            label: 'Zahlen und Daten',
            items: [
              { id: 'ma_zahlen_zahlenraum', label: 'Orientierung im Zahlenraum 100' },
              { id: 'ma_zahlen_stellenwert', label: 'Stellenwerte richtig lesen und schreiben' }
            ]
          },
          {
            id: 'rechnen',
            label: 'Rechenoperationen',
            items: [
              { id: 'ma_rechnen_addition', label: 'Addition im ZR 100' },
              { id: 'ma_rechnen_subtraktion', label: 'Subtraktion im ZR 100' },
              { id: 'ma_rechnen_multiplikation', label: 'Erlernte Malreihen' },
              { id: 'ma_rechnen_division', label: 'Division' },
              { id: 'ma_rechnen_sachaufgaben', label: 'Sachaufgaben' }
            ]
          },
          {
            id: 'groessen',
            label: 'Größen',
            items: [
              { id: 'ma_groessen_umwandeln', label: 'Gelernte Größen' }
            ]
          },
          {
            id: 'raum',
            label: 'Ebene und Raum',
            items: [
              { id: 'ma_raum_figuren', label: 'Figuren und Körper' },
              { id: 'ma_raum_umfang', label: 'Geometrische Muster' }
            ]
          }
        ]
      };
    }
    return cat;
  })
];

export default function OberauSkala({ schuelerId }: OberauSkalaProps) {
  const { app, setApp } = useApp();
  const student = app.schueler.find(s => s.id === schuelerId);

  const isSpf = student?.spf || false;

  // States
  const [evaluationData, setEvaluationData] = useState<Record<string, number | null>>({});
  const [remarks, setRemarks] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isPolishing, setIsPolishing] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Custom Scale Headers
  const [scaleHeader1, setScaleHeader1] = useState(() => localStorage.getItem('oberau_scale_header1') || 'Mindestanforderung');
  const [scaleHeader2, setScaleHeader2] = useState(() => localStorage.getItem('oberau_scale_header2') || 'Lernziel im Wesentlichen erreicht');
  const [scaleHeader3, setScaleHeader3] = useState(() => localStorage.getItem('oberau_scale_header3') || 'Lernziel über das Wesentliche erreicht');

  // Custom Curriculum Structure
  const [customCategories, setCustomCategories] = useState<OberauCategory[]>([]);

  // Custom metadata for printing
  const [klassenlehrer, setKlassenlehrer] = useState('');
  const [direktorin, setDirektorin] = useState('Inge Fitzi');
  const [integrationslehrer, setIntegrationslehrer] = useState('Martina Deuschle');
  const [datum, setDatum] = useState('05.07.2024');
  const [semester, setSemester] = useState('2. Semester');
  const [schuljahr, setSchuljahr] = useState('2023/24');
  const [showSettings, setShowSettings] = useState(false);

  // Memoized categories with injected colors from app config
  const categories = React.useMemo(() => {
    return customCategories.map(cat => {
      const config = (app.fachConfig || {})[cat.label];
      if (!config) return cat;

      const c = config.color;
      let badgeBg = `bg-${c}-600 text-white border-${c}-700 shadow-sm`;
      let textCol = `text-${c}-600`;
      let color = `border-${c}-500/10 bg-${c}-500/5`;

      if (c === 'slate') {
        badgeBg = 'bg-slate-700 text-white border-slate-800 shadow-sm';
        textCol = 'text-slate-700';
        color = 'border-slate-300 bg-slate-50';
      }

      return {
        ...cat,
        color,
        badgeBg,
        textCol,
        scaleColor: config.scaleColor || cat.scaleColor || 'emerald'
      };
    });
  }, [customCategories, app.fachConfig]);

  // Remarks Section Titles
  const [remarksTitle, setRemarksTitle] = useState(() => localStorage.getItem('oberau_remarks_title') || 'Erläuterung');
  const [remarksSubtitle, setRemarksSubtitle] = useState(() => localStorage.getItem('oberau_remarks_subtitle') || 'Individuell verfasster Freitext ergänzend zur Bewertungsmatrix');

  // Load correct structure (standard or special educational needs)
  useEffect(() => {
    const savedStr = localStorage.getItem(`oberau_structure_${isSpf ? 'spf' : 'std'}`);
    if (savedStr) {
      try {
        setCustomCategories(JSON.parse(savedStr));
      } catch (e) {
        setCustomCategories(isSpf ? OBERAU_SPF_STRUCTURE : OBERAU_STANDARD_STRUCTURE);
      }
    } else {
      setCustomCategories(isSpf ? OBERAU_SPF_STRUCTURE : OBERAU_STANDARD_STRUCTURE);
    }
  }, [isSpf]);

  // Save structure changes helper
  const saveStructureToStorage = (updated: OberauCategory[]) => {
    localStorage.setItem(`oberau_structure_${isSpf ? 'spf' : 'std'}`, JSON.stringify(updated));
  };

  // Add / Remove criteria
  const handleCreateCriterion = (catId: string, subId: string | null, text: string) => {
    if (!text.trim()) return;
    const newId = `custom_${catId}_${subId || ''}_${Date.now()}`;
    const newItem = { id: newId, label: text.trim() };

    setCustomCategories(prev => {
      const updated = prev.map(cat => {
        if (cat.id !== catId) return cat;
        if (subId && cat.subsections) {
          return {
            ...cat,
            subsections: cat.subsections.map(sub => {
              if (sub.id !== subId) return sub;
              return {
                ...sub,
                items: [...sub.items, newItem]
              };
            })
          };
        } else {
          const currentItems = cat.items || [];
          return {
            ...cat,
            items: [...currentItems, newItem]
          };
        }
      });
      saveStructureToStorage(updated);
      return updated;
    });
  };

  const handleDeleteCriterion = (catId: string, subId: string | null, criterionId: string) => {
    setCustomCategories(prev => {
      const updated = prev.map(cat => {
        if (cat.id !== catId) return cat;
        if (subId && cat.subsections) {
          return {
            ...cat,
            subsections: cat.subsections.map(sub => {
              if (sub.id !== subId) return sub;
              return {
                ...sub,
                items: sub.items.filter(item => item.id !== criterionId)
              };
            })
          };
        } else if (cat.items) {
          return {
            ...cat,
            items: cat.items.filter(item => item.id !== criterionId)
          };
        }
        return cat;
      });
      saveStructureToStorage(updated);
      return updated;
    });
  };

  // Rename helpers
  const handleRenameCategory = (catId: string, newLabel: string) => {
    if (!newLabel.trim()) return;
    setCustomCategories(prev => {
      const updated = prev.map(cat => {
        if (cat.id === catId) {
          return { ...cat, label: newLabel.trim() };
        }
        return cat;
      });
      saveStructureToStorage(updated);
      return updated;
    });
  };

  const handleRenameSubsection = (catId: string, subId: string, newLabel: string) => {
    if (!newLabel.trim()) return;
    setCustomCategories(prev => {
      const updated = prev.map(cat => {
        if (cat.id !== catId || !cat.subsections) return cat;
        return {
          ...cat,
          subsections: cat.subsections.map(sub => {
            if (sub.id === subId) {
              return { ...sub, label: newLabel.trim() };
            }
            return sub;
          })
        };
      });
      saveStructureToStorage(updated);
      return updated;
    });
  };

  const handleRenameCriterion = (catId: string, subId: string | null, criterionId: string, newLabel: string) => {
    if (!newLabel.trim()) return;
    setCustomCategories(prev => {
      const updated = prev.map(cat => {
        if (cat.id !== catId) return cat;
        if (subId && cat.subsections) {
          return {
            ...cat,
            subsections: cat.subsections.map(sub => {
              if (sub.id !== subId) return sub;
              return {
                ...sub,
                items: sub.items.map(item => {
                  if (item.id === criterionId) {
                    return { ...item, label: newLabel.trim() };
                  }
                  return item;
                })
              };
            })
          };
        } else if (cat.items) {
          return {
            ...cat,
            items: cat.items.map(item => {
              if (item.id === criterionId) {
                return { ...item, label: newLabel.trim() };
              }
              return item;
            })
          };
        }
        return cat;
      });
      saveStructureToStorage(updated);
      return updated;
    });
  };

  // Create & Delete helpers for Categories and Subsections
  const handleCreateCategory = (label: string) => {
    if (!label.trim()) return;
    const newId = `cat_${Date.now()}`;
    const newCat: OberauCategory = {
      id: newId,
      label: label.trim(),
      color: 'border-slate-300 bg-slate-100',
      badgeBg: 'bg-slate-100 text-slate-500 border-slate-300',
      textCol: 'text-slate-600',
      items: []
    };
    setCustomCategories(prev => {
      const updated = [...prev, newCat];
      saveStructureToStorage(updated);
      return updated;
    });
  };

  const handleDeleteCategory = (catId: string) => {
    const catName = customCategories.find(c => c.id === catId)?.label || '';
    if (confirm(`Möchten Sie das gesamte Fach "${catName}" wirklich löschen?`)) {
      setCustomCategories(prev => {
        const updated = prev.filter(c => c.id !== catId);
        saveStructureToStorage(updated);
        return updated;
      });
    }
  };

  const handleCreateSubsection = (catId: string, label: string) => {
    if (!label.trim()) return;
    const newId = `sub_${catId}_${Date.now()}`;
    setCustomCategories(prev => {
      const updated = prev.map(cat => {
        if (cat.id !== catId) return cat;
        const subs = cat.subsections || [];
        return {
          ...cat,
          subsections: [...subs, { id: newId, label: label.trim(), items: [] }]
        };
      });
      saveStructureToStorage(updated);
      return updated;
    });
  };

  const handleDeleteSubsection = (catId: string, subId: string) => {
    if (confirm("Möchten Sie diesen Bereich inklusive aller Kriterien löschen?")) {
      setCustomCategories(prev => {
        const updated = prev.map(cat => {
          if (cat.id !== catId || !cat.subsections) return cat;
          return {
            ...cat,
            subsections: cat.subsections.filter(s => s.id !== subId)
          };
        });
        saveStructureToStorage(updated);
        return updated;
      });
    }
  };

  // Reset structures to defaults
  const handleResetStructure = () => {
    if (confirm("Möchten Sie die Kriterien-Struktur wirklich auf den Standard zurücksetzen? Ihre vorgenommenen Anpassungen gehen verloren.")) {
      const defaultData = isSpf ? OBERAU_SPF_STRUCTURE : OBERAU_STANDARD_STRUCTURE;
      setCustomCategories(defaultData);
      localStorage.removeItem(`oberau_structure_${isSpf ? 'spf' : 'std'}`);
    }
  };

  // React to student change - load saved values (Datenschutz B6/B8: Bevorzuge verschlüsselten AppState, migriere Legacy-Klartext)
  useEffect(() => {
    if (schuelerId) {
      try {
        const appOberau = (app as any).oberauData?.[schuelerId];
        if (appOberau) {
          setEvaluationData(appOberau.evaluationData || {});
          setRemarks(appOberau.remarks !== undefined ? appOberau.remarks : (student?.foerderprofil?.zusatzinfo || ''));
          setKlassenlehrer(appOberau.klassenlehrer || 'Klassenlehrer Name');
          setDirektorin(appOberau.direktorin || 'Inge Fitzi');
          setIntegrationslehrer(appOberau.integrationslehrer || 'Martina Deuschle');
          setDatum(appOberau.datum || 'Feldkirch, am 5.7.2024');
          setSemester(appOberau.semester || '2. Semester');
          setSchuljahr(app.schuljahr || '2023/24');
          return;
        }

        // Einmalige Migration aus Legacy-Klartextspeicher
        const savedEval = localStorage.getItem(`oberau_eval_${schuelerId}`);
        const parsedEval = savedEval ? JSON.parse(savedEval) : {};
        setEvaluationData(parsedEval);

        const savedRemarks = localStorage.getItem(`oberau_remarks_${schuelerId}`);
        const finalRemarks = savedRemarks !== null ? savedRemarks : (student?.foerderprofil?.zusatzinfo || '');
        setRemarks(finalRemarks);

        // Loading printing metadata
        const savedLehrer = localStorage.getItem(`oberau_lehrer_${schuelerId}`) || 'Klassenlehrer Name';
        setKlassenlehrer(savedLehrer);

        const savedDir = localStorage.getItem(`oberau_dir_${schuelerId}`) || 'Inge Fitzi';
        setDirektorin(savedDir);

        const savedIntLehrer = localStorage.getItem(`oberau_int_lehrer_${schuelerId}`) || 'Martina Deuschle';
        setIntegrationslehrer(savedIntLehrer);

        const savedDatum = localStorage.getItem(`oberau_datum_${schuelerId}`) || 'Feldkirch, am 5.7.2024';
        setDatum(savedDatum);

        const savedSem = localStorage.getItem(`oberau_semester_${schuelerId}`) || '2. Semester';
        setSemester(savedSem);

        setSchuljahr(app.schuljahr || '2023/24');

        // Falls Legacy-Daten vorhanden waren, in AppState überführen und Klartext bereinigen
        if (savedEval || savedRemarks) {
          setApp(prev => ({
            ...prev,
            oberauData: {
              ...((prev as any).oberauData || {}),
              [schuelerId]: {
                evaluationData: parsedEval,
                remarks: finalRemarks,
                klassenlehrer: savedLehrer,
                direktorin: savedDir,
                integrationslehrer: savedIntLehrer,
                datum: savedDatum,
                semester: savedSem
              }
            }
          }));
          localStorage.removeItem(`oberau_eval_${schuelerId}`);
          localStorage.removeItem(`oberau_remarks_${schuelerId}`);
          localStorage.removeItem(`oberau_lehrer_${schuelerId}`);
          localStorage.removeItem(`oberau_dir_${schuelerId}`);
          localStorage.removeItem(`oberau_int_lehrer_${schuelerId}`);
          localStorage.removeItem(`oberau_datum_${schuelerId}`);
          localStorage.removeItem(`oberau_semester_${schuelerId}`);
        }
      } catch (e) {
        console.error("Error loading Oberau evaluation details", e);
      }
    }
  }, [schuelerId, app.schuljahr, (app as any).oberauData, student?.foerderprofil?.zusatzinfo]);

  if (!student) {
    return (
      <div className="p-8 text-center text-slate-400">
        Kein Student ausgewählt.
      </div>
    );
  }

  // Save evaluations to encrypted AppState (Datenschutz B6/B8: Keine unverschlüsselten Schülerdaten im localStorage)
  const handleSave = () => {
    setSaveStatus('saving');
    try {
      // Lösche eventuelle Alt-Schlüssel
      try {
        localStorage.removeItem(`oberau_eval_${schuelerId}`);
        localStorage.removeItem(`oberau_remarks_${schuelerId}`);
        localStorage.removeItem(`oberau_lehrer_${schuelerId}`);
        localStorage.removeItem(`oberau_dir_${schuelerId}`);
        localStorage.removeItem(`oberau_int_lehrer_${schuelerId}`);
        localStorage.removeItem(`oberau_datum_${schuelerId}`);
        localStorage.removeItem(`oberau_semester_${schuelerId}`);
      } catch {}

      // Synchronize to shared student state (foerderprofil.zusatzinfo) & AppState
      setApp(prev => ({
        ...prev,
        oberauData: {
          ...((prev as any).oberauData || {}),
          [schuelerId]: {
            evaluationData,
            remarks,
            klassenlehrer,
            direktorin,
            integrationslehrer,
            datum,
            semester
          }
        },
        schueler: prev.schueler.map(s => s.id === schuelerId ? {
          ...s,
          foerderprofil: { ...s.foerderprofil, zusatzinfo: remarks }
        } : s)
      }));

      // Save non-sensitive general headers
      localStorage.setItem('oberau_scale_header1', scaleHeader1);
      localStorage.setItem('oberau_scale_header2', scaleHeader2);
      localStorage.setItem('oberau_scale_header3', scaleHeader3);

      setTimeout(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }, 500);
    } catch (e) {
      console.error(e);
      setSaveStatus('idle');
    }
  };

  // Change specific criterion rating (toggle support)
  const handleRatingChange = (criterionId: string, rating: number | null) => {
    setEvaluationData(prev => ({
      ...prev,
      [criterionId]: prev[criterionId] === rating ? null : rating
    }));
  };

  // Pre-fill grades suggestion based on existing grades averages utilizing 6 levels
  const handleLoadSuggestions = () => {
    const updated: Record<string, number | null> = { ...evaluationData };

    customCategories.forEach(cat => {
      let mathFachName = 'Mathematik';
      let deFachName = 'Deutsch';
      
      let average: number | null = null;
      if (cat.id === 'de') average = berechne(app, schuelerId, deFachName, '1');
      if (cat.id === 'ma') average = berechne(app, schuelerId, mathFachName, '1');

      let suggestedRating: number | null = null;
      if (average && average !== 0) {
        if (average <= 1.5) {
          suggestedRating = 6;
        } else if (average <= 2.0) {
          suggestedRating = 5;
        } else if (average <= 2.8) {
          suggestedRating = 4;
        } else if (average <= 3.5) {
          suggestedRating = 3;
        } else if (average <= 4.5) {
          suggestedRating = 2;
        } else {
          suggestedRating = 1;
        }
      } else {
        suggestedRating = 4; // Default to level 4
      }

      if (cat.subsections) {
        cat.subsections.forEach(sub => {
          sub.items.forEach(item => {
            updated[item.id] = suggestedRating;
          });
        });
      } else if (cat.items) {
        cat.items.forEach(item => {
          updated[item.id] = suggestedRating;
        });
      }
    });

    setEvaluationData(updated);
  };

  // AI Polisher trigger
  const handlePolishRemarks = async () => {
    if (!remarks.trim()) return;
    setIsPolishing(true);
    try {
      const response = await polishText(`Erläuterungen zum Zeugnis für ${student.vorname}: ${remarks}`);
      if (response) {
        setRemarks(response);
      }
    } catch (err) {
      console.error("Polishing failed", err);
    } finally {
      setIsPolishing(false);
    }
  };

  // Open standard native print layout (Datenschutz B6/B8: Keine Klartext-Schülerdaten im localStorage)
  const handlePrint = () => {
    try {
      localStorage.removeItem(`oberau_eval_${schuelerId}`);
      localStorage.removeItem(`oberau_remarks_${schuelerId}`);
      localStorage.removeItem(`oberau_lehrer_${schuelerId}`);
      localStorage.removeItem(`oberau_dir_${schuelerId}`);
      localStorage.removeItem(`oberau_int_lehrer_${schuelerId}`);
      localStorage.removeItem(`oberau_datum_${schuelerId}`);
      localStorage.removeItem(`oberau_semester_${schuelerId}`);
    } catch {}

    // Synchronize to shared student state (foerderprofil.zusatzinfo) & AppState
    setApp(prev => ({
      ...prev,
      oberauData: {
        ...((prev as any).oberauData || {}),
        [schuelerId]: {
          evaluationData,
          remarks,
          klassenlehrer,
          direktorin,
          integrationslehrer,
          datum,
          semester
        }
      },
      schueler: prev.schueler.map(s => s.id === schuelerId ? {
        ...s,
        foerderprofil: { ...s.foerderprofil, zusatzinfo: remarks }
      } : s)
    }));

    localStorage.setItem('oberau_scale_header1', scaleHeader1);
    localStorage.setItem('oberau_scale_header2', scaleHeader2);
    localStorage.setItem('oberau_scale_header3', scaleHeader3);

    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="space-y-8 select-none">
      
      {/* 1. BENTO CARD AREA */}
      <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 shadow-2xl space-y-6 text-slate-800 relative  print:hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10" />
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-2xl flex items-center justify-center shadow-sm w-14 h-14">
              <Award size={22} />
            </div>
            <div>
              <h3 className="text-[1.875rem] leading-tight md:text-4xl font-black text-slate-900 tracking-tight">
                Erläuterung
              </h3>
              <p className="text-[0.875rem] leading-snug font-black text-slate-500 uppercase tracking-widest mt-0.5">
                {isSpf ? "Schriftliche Erläuterung für Kinder mit Förderbedarf (SPF)" : "Schriftliche Erläuterung zum offiziellen Jahreszeugnis • Digitaler Zeugnisbeirat"}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-4 py-2 rounded-xl text-[0.75rem] leading-tight font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                editMode 
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/45 shadow-[0_0_12px_rgba(244,63,94,0.1)]' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
              }`}
              title="Kriterien hinzufügen oder löschen"
            >
              <CheckSquare size={14} /> {editMode ? 'Bearbeiten beenden' : 'Kriterien bearbeiten'}
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl text-[0.75rem] leading-tight font-bold transition-all cursor-pointer hover:bg-slate-50 shadow-sm"
              title="Druck-Einstellungen & Skalen"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={handleLoadSuggestions}
              className="px-4 py-2 bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm rounded-xl text-[0.75rem] leading-tight font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw size={14} className="animate-pulse" /> Suggestionen laden
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white border border-slate-900 shadow-md rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2"
            >
              <Printer size={15} /> A4 Drucken
            </button>
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-slate-800 hover:text-white rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-900/10"
            >
              {saveStatus === 'saving' ? (
                <span>Sichern...</span>
              ) : saveStatus === 'saved' ? (
                <>
                  <CheckCircle2 size={15} /> Gesichert!
                </>
              ) : (
                <>
                  <Save size={15} /> Speichern
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic warning if SPF mismatch found */}
        {isSpf ? (
          <div className="p-4 bg-indigo-950/30 border border-indigo-900/50 rounded-2xl flex items-start gap-3 text-[0.75rem] leading-tight text-indigo-300 leading-relaxed">
            <ShieldAlert size={18} className="shrink-0 text-indigo-400" />
            <div>
              <span className="font-bold block text-slate-800">Sonderpädagogischer Status (SPF) erkannt</span>
              Diese Matrix verwendet automatisch das modifizierte Begutachtungsproblem für Förderbedarf (ZR 100, flüssiges Abschreiben, etc.).
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-100 border border-slate-300 rounded-2xl flex items-start gap-3 text-[0.75rem] leading-tight text-slate-500 leading-relaxed">
            <BadgeInfo size={18} className="shrink-0 text-slate-400" />
            <div>
              <span className="font-bold block text-slate-700">Standard-Bewertungsmatrix</span>
              Diese Matrix verwendet die Standardlogik der Volksschule Oberau mit Orientierung bis 1000.
            </div>
          </div>
        )}

        {/* 2. PRINT & SCALE SETTINGS CONFIGURATOR */}
        {showSettings && (
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-6 animate-fadeIn text-slate-600">
            
            {/* System Info & Reset Structure */}
            <div className="flex justify-between items-center border-b border-slate-300 pb-2">
              <h4 className="text-[0.75rem] leading-tight font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Settings size={12} className="text-emerald-500" /> Zeugnisdruck-Daten & Skalen verwalten
              </h4>
              <button
                onClick={handleResetStructure}
                className="px-2.5 py-1 text-[0.625rem] uppercase font-black tracking-wider text-rose-400 border border-rose-950 hover:bg-rose-950/10 rounded-lg transition-all"
              >
                Kriterien auf Standard zurücksetzen
              </button>
            </div>

            {/* Scale Header Configuration */}
            <div className="space-y-3">
              <h5 className="text-[0.625rem] font-black uppercase text-slate-500 tracking-wider">Skalen-Spaltentitel anpassen</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[0.5625rem] font-black uppercase text-slate-400 tracking-wider block mb-1">Spalte 1 & 2 (z.B. Mindestanforderung)</label>
                  <input
                    type="text"
                    value={scaleHeader1}
                    onChange={e => {
                      setScaleHeader1(e.target.value);
                      localStorage.setItem('oberau_scale_header1', e.target.value);
                    }}
                    className="w-full bg-white border border-slate-200 text-slate-800 p-2 rounded-xl text-[0.75rem] leading-tight text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[0.5625rem] font-black uppercase text-slate-400 tracking-wider block mb-1">Spalte 3 & 4 (z.B. Lernziel erreicht)</label>
                  <input
                    type="text"
                    value={scaleHeader2}
                    onChange={e => {
                      setScaleHeader2(e.target.value);
                      localStorage.setItem('oberau_scale_header2', e.target.value);
                    }}
                    className="w-full bg-white border border-slate-200 text-slate-800 p-2 rounded-xl text-[0.75rem] leading-tight text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[0.5625rem] font-black uppercase text-slate-400 tracking-wider block mb-1">Spalte 5 & 6 (z.B. Lernziel übertroffen)</label>
                  <input
                    type="text"
                    value={scaleHeader3}
                    onChange={e => {
                      setScaleHeader3(e.target.value);
                      localStorage.setItem('oberau_scale_header3', e.target.value);
                    }}
                    className="w-full bg-white border border-slate-200 text-slate-800 p-2 rounded-xl text-[0.75rem] leading-tight text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Custom Remarks Titles configuration */}
            <div className="space-y-3 pt-2">
              <h5 className="text-[0.625rem] font-black uppercase text-slate-500 tracking-wider">Freitext Erläuterungs-Schriftzug</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[0.5625rem] font-black uppercase text-slate-400 tracking-wider block mb-1">Erläuterung Titel</label>
                  <input
                    type="text"
                    value={remarksTitle}
                    onChange={e => {
                      setRemarksTitle(e.target.value);
                      localStorage.setItem('oberau_remarks_title', e.target.value);
                    }}
                    className="w-full bg-white border border-slate-200 text-slate-800 p-2 rounded-xl text-[0.75rem] leading-tight text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="z.B. Erläuterung"
                  />
                </div>
                <div>
                  <label className="text-[0.5625rem] font-black uppercase text-slate-400 tracking-wider block mb-1">Erläuterung Beschreibung</label>
                  <input
                    type="text"
                    value={remarksSubtitle}
                    onChange={e => {
                      setRemarksSubtitle(e.target.value);
                      localStorage.setItem('oberau_remarks_subtitle', e.target.value);
                    }}
                    className="w-full bg-white border border-slate-200 text-slate-800 p-2 rounded-xl text-[0.75rem] leading-tight text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="z.B. Individuell verfasster Freitext..."
                  />
                </div>
              </div>
            </div>

            {/* Classic Metadata configuration */}
            <div className="space-y-3 pt-2">
              <h5 className="text-[0.625rem] font-black uppercase text-slate-500 tracking-wider">Offizielle Angaben zum Zeugnisdatenblatt</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[0.5625rem] font-black uppercase text-slate-400 tracking-wider block mb-1">Klassenlehrer Name & Titel</label>
                  <input
                    type="text"
                    value={klassenlehrer}
                    onChange={e => setKlassenlehrer(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 p-2 rounded-xl text-[0.75rem] leading-tight text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="z.B. Lisa Müller, BEd"
                  />
                </div>
                <div>
                  <label className="text-[0.5625rem] font-black uppercase text-slate-400 tracking-wider block mb-1">Direktor Name & Titel</label>
                  <input
                    type="text"
                    value={direktorin}
                    onChange={e => setDirektorin(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 p-2 rounded-xl text-[0.75rem] leading-tight text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="Direktorin Name"
                  />
                </div>
                {isSpf && (
                  <div>
                    <label className="text-[0.5625rem] font-black uppercase text-slate-400 tracking-wider block mb-1">Integrationslehrer/in Name</label>
                    <input
                      type="text"
                      value={integrationslehrer}
                      onChange={e => setIntegrationslehrer(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-800 p-2 rounded-xl text-[0.75rem] leading-tight text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="Integrationslehrer Name"
                    />
                  </div>
                )}
                <div>
                  <label className="text-[0.5625rem] font-black uppercase text-slate-400 tracking-wider block mb-1">Gemeinde & Ausstellungsdatum</label>
                  <input
                    type="text"
                    value={datum}
                    onChange={e => setDatum(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 p-2 rounded-xl text-[0.75rem] leading-tight text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="Ausstellungsbasis"
                  />
                </div>
                <div>
                  <label className="text-[0.5625rem] font-black uppercase text-slate-400 tracking-wider block mb-1">Semester</label>
                  <input
                    type="text"
                    value={semester}
                    onChange={e => setSemester(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 p-2 rounded-xl text-[0.75rem] leading-tight text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[0.5625rem] font-black uppercase text-slate-400 tracking-wider block mb-1">Schuljahr</label>
                  <input
                    type="text"
                    value={schuljahr}
                    onChange={e => setSchuljahr(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 p-2 rounded-xl text-[0.75rem] leading-tight text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. INTERACTIVE FORM MATRIX */}
        <div className="space-y-6 pt-2">
          {categories.map(category => (
            <div key={category.id} className={`${category.color} p-5 rounded-3xl space-y-4 shadow-sm hover:border-black/5 transition duration-300`}>
              
              {/* Category Subject title */}
              <div className="flex items-center justify-between gap-4">
                {editMode ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={category.label}
                      onChange={e => handleRenameCategory(category.id, e.target.value)}
                      className="bg-slate-100 border border-slate-200 text-slate-800 text-[0.75rem] leading-tight px-2.5 py-1 rounded-xl max-w-[150px] font-bold select-text focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 rounded-xl transition-all shrink-0 cursor-pointer text-[0.75rem] leading-tight text-rose-400 flex items-center gap-1"
                      title="Gesamtes Fach löschen"
                    >
                      <Trash2 size={13} /> Löschen
                    </button>
                  </div>
                ) : (
                  <span className={`text-[0.75rem] leading-tight font-black uppercase px-3 py-1 border rounded-lg ${category.badgeBg} tracking-widest`}>
                    {category.label}
                  </span>
                )}
                
                {/* Visual average badge from AppState */}
                {['de', 'ma'].includes(category.id) && (
                  <span className="text-[0.75rem] leading-tight text-slate-600 font-semibold bg-slate-200/50 px-3 py-0.5 rounded-md border border-slate-300 shrink-0 text-slate-700">
                    Notenschnitt: {berechne(app, schuelerId, category.label, '1')?.toFixed(2) || '–'}
                  </span>
                )}
              </div>

              {/* Sub-Criteria Table / List Block */}
              <div className="space-y-4 divide-y divide-slate-200 font-medium">
                {category.subsections ? (
                  // Subsection layouts (like for Deutsch & Mathematik)
                  category.subsections.map(sub => (
                    <div key={sub.id} className="pt-4 pb-1 first:pt-0">
                      <div className="flex justify-between items-center mb-3">
                        {editMode ? (
                          <div className="flex items-center gap-1.5 pl-1">
                            <span className="text-slate-400 text-[0.75rem] leading-tight">•</span>
                            <input
                              type="text"
                              value={sub.label}
                              onChange={e => handleRenameSubsection(category.id, sub.id, e.target.value)}
                              className="bg-slate-50 border border-slate-200 text-slate-700 text-[0.75rem] leading-tight px-2 py-0.5 rounded-lg font-bold select-text focus:ring-1 focus:ring-emerald-500 focus:outline-none max-w-[200px]"
                            />
                            <button
                              onClick={() => handleDeleteSubsection(category.id, sub.id)}
                              className="p-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/10 rounded-lg shrink-0 transition select-none cursor-pointer"
                              title="Bereich löschen"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ) : (
                          <h4 className="text-[1rem] leading-normal text-slate-600 font-black tracking-wider uppercase pl-1">
                            • {sub.label}
                          </h4>
                        )}
                      </div>
                      
                      <div className="space-y-3 pl-2">
                        {sub.items.map(criterion => {
                          const currentVal = evaluationData[criterion.id] || null;
                          return (
                            <div key={criterion.id} className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 py-2.5 border-b border-slate-200 last:border-0 hover:bg-white rounded-xl px-2.5 transition-all">
                              <div className="flex items-center gap-2 flex-grow min-w-0 w-full">
                                {editMode ? (
                                  <div className="flex items-center gap-2 flex-grow min-w-0 w-full">
                                    <button
                                      onClick={() => handleDeleteCriterion(category.id, sub.id, criterion.id)}
                                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/25 text-rose-400 rounded-lg transition-all shrink-0 cursor-pointer"
                                      title="Kriterium löschen"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                    <input
                                      type="text"
                                      value={criterion.label}
                                      onChange={e => handleRenameCriterion(category.id, sub.id, criterion.id, e.target.value)}
                                      className="bg-slate-100 border border-slate-300 text-slate-800 text-[0.75rem] leading-tight px-2.5 py-1 rounded-xl flex-grow font-semibold select-text focus:ring-1 focus:ring-emerald-500 focus:outline-none min-w-0"
                                    />
                                  </div>
                                ) : (
                                  <span className="text-[1rem] leading-normal md:text-[1.125rem] leading-normal text-slate-800 font-bold leading-relaxed break-words">
                                    {criterion.label}
                                  </span>
                                )}
                              </div>
                              
                              {/* 6-part compact scale grouped into 3 scale blocks */}
                                                                                          {/* 6-part Continuous Scale */}
                              <div className="flex items-center shrink-0 self-end xl:self-auto ml-2 mt-4 md:mt-0">
                                <div className="flex items-stretch bg-white rounded-[1rem] shadow-sm border border-slate-200  divide-x divide-slate-100">
                                  
                                  {/* 0 Reset Button */}
                                  <button
                                    type="button"
                                    onClick={() => setEvaluationData(prev => ({ ...prev, [criterion.id]: null }))}
                                    title="Wert auf 0 / gelöscht setzen"
                                    className={`w-9 h-10 md:w-10 md:h-11 text-[0.75rem] leading-tight font-black transition-all cursor-pointer flex items-center justify-center ${
                                      currentVal === null 
                                        ? 'bg-slate-100 text-slate-400 font-bold' 
                                        : 'bg-white text-slate-300 hover:bg-rose-50 hover:text-rose-500'
                                    }`}
                                  >
                                    0
                                  </button>
                                  
                                  {/* M Group */}
                                  <div className="flex relative group/scale">
                                    <div className="absolute -top-5 left-0 w-full text-center text-[0.5625rem] font-black uppercase text-slate-500 opacity-100 pointer-events-none" title={scaleHeader1}>M</div>
                                    {[1, 2].map((num) => {
                                      const isActive = currentVal !== null && currentVal >= num;
                                      const scaleColor = category.scaleColor || 'emerald';
                                      const activeClass = scaleColor === 'blue' ? 'bg-blue-600 text-white' : scaleColor === 'red' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white';
                                      
                                      return (
                                        <button
                                          key={num}
                                          onClick={() => handleRatingChange(criterion.id, num)}
                                          className={`w-10 h-10 md:w-11 md:h-11 text-[0.875rem] leading-snug md:text-[1rem] leading-normal font-black transition-all cursor-pointer border-r border-slate-50 last:border-0 ${
                                            isActive ? `${activeClass} shadow-inner` : 'bg-white text-slate-400 hover:bg-slate-50'
                                          }`}
                                        >{num}</button>
                                      );
                                    })}
                                  </div>
                                  
                                  <div className="w-1 bg-slate-100 shrink-0" />
                                  
                                  {/* E Group */}
                                  <div className="flex relative group/scale">
                                    <div className="absolute -top-5 left-0 w-full text-center text-[0.5625rem] font-black uppercase text-slate-500 opacity-100 pointer-events-none" title={scaleHeader2}>E</div>
                                    {[3, 4].map((num) => {
                                      const isActive = currentVal !== null && currentVal >= num;
                                      const scaleColor = category.scaleColor || 'emerald';
                                      const activeClass = scaleColor === 'blue' ? 'bg-blue-600 text-white' : scaleColor === 'red' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white';
                                      
                                      return (
                                        <button
                                          key={num}
                                          onClick={() => handleRatingChange(criterion.id, num)}
                                          className={`w-10 h-10 md:w-11 md:h-11 text-[0.875rem] leading-snug md:text-[1rem] leading-normal font-black transition-all cursor-pointer border-r border-slate-50 last:border-0 ${
                                            isActive ? `${activeClass} shadow-inner` : 'bg-white text-slate-400 hover:bg-slate-50'
                                          }`}
                                        >{num}</button>
                                      );
                                    })}
                                  </div>

                                  <div className="w-1 bg-slate-100 shrink-0" />
                                  
                                  {/* Ü Group */}
                                  <div className="flex relative group/scale">
                                    <div className="absolute -top-5 left-0 w-full text-center text-[0.5625rem] font-black uppercase text-slate-500 opacity-100 pointer-events-none" title={scaleHeader3}>Ü</div>
                                    {[5, 6].map((num) => {
                                      const isActive = currentVal !== null && currentVal >= num;
                                      const scaleColor = category.scaleColor || 'emerald';
                                      const activeClass = scaleColor === 'blue' ? 'bg-blue-600 text-white' : scaleColor === 'red' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white';
                                      
                                      return (
                                        <button
                                          key={num}
                                          onClick={() => handleRatingChange(criterion.id, num)}
                                          className={`w-10 h-10 md:w-11 md:h-11 text-[0.875rem] leading-snug md:text-[1rem] leading-normal font-black transition-all cursor-pointer border-r border-slate-50 last:border-0 ${
                                            isActive ? `${activeClass} shadow-inner` : 'bg-white text-slate-400 hover:bg-slate-50'
                                          }`}
                                        >{num}</button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
</div>
                          );
                        })}

                        {/* Inline Custom Creator support */}
                        {editMode && (
                          <div className="flex items-center gap-2 pt-2.5 animate-fadeIn max-w-lg">
                            <input
                              type="text"
                              placeholder="Neues Kriterium in diesen Bereich eintragen..."
                              id={`add_${category.id}_${sub.id}`}
                              className="bg-slate-100 border border-slate-300 text-slate-800 text-[0.75rem] leading-tight p-2 rounded-xl flex-grow focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const text = e.currentTarget.value;
                                  handleCreateCriterion(category.id, sub.id, text);
                                  e.currentTarget.value = '';
                                }
                              }}
                            />
                            <button
                              onClick={() => {
                                const el = document.getElementById(`add_${category.id}_${sub.id}`) as HTMLInputElement;
                                if (el && el.value.trim()) {
                                  handleCreateCriterion(category.id, sub.id, el.value);
                                  el.value = '';
                                }
                              }}
                              className="px-3.5 py-2 bg-emerald-600/90 hover:bg-emerald-600 text-slate-800 rounded-lg text-[0.625rem] font-bold uppercase tracking-wider transition cursor-pointer shrink-0"
                            >
                              <Plus size={10} className="inline mr-1" /> Neu
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  // Direct items list inside category
                  <div className="space-y-3 pt-1">
                    {category.items?.map(criterion => {
                      const currentVal = evaluationData[criterion.id] || null;
                      return (
                        <div key={criterion.id} className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 py-2.5 border-b border-slate-200 last:border-0 hover:bg-white rounded-xl px-2.5 transition-all">
                          <div className="flex items-center gap-2 flex-grow min-w-0 w-full">
                            {editMode ? (
                              <div className="flex items-center gap-2 flex-grow min-w-0 w-full">
                                <button
                                  onClick={() => handleDeleteCriterion(category.id, null, criterion.id)}
                                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/25 text-rose-400 rounded-lg transition-all shrink-0 cursor-pointer"
                                  title="Kriterium löschen"
                                >
                                  <Trash2 size={12} />
                                </button>
                                <input
                                  type="text"
                                  value={criterion.label}
                                  onChange={e => handleRenameCriterion(category.id, null, criterion.id, e.target.value)}
                                  className="bg-slate-100 border border-slate-300 text-slate-800 text-[0.75rem] leading-tight px-2.5 py-1 rounded-xl flex-grow font-semibold select-text focus:ring-1 focus:ring-emerald-500 focus:outline-none min-w-0"
                                />
                              </div>
                            ) : (
                              <span className="text-[1rem] leading-normal md:text-[1.125rem] leading-normal text-slate-800 font-bold leading-relaxed break-words">
                                {criterion.label}
                              </span>
                            )}
                          </div>
                          
                          {/* 6-part compact scale */}
                                                              {/* 6-part Continuous Scale */}
                              <div className="flex items-center shrink-0 self-end xl:self-auto ml-2 mt-4 md:mt-0">
                                <div className="flex items-stretch bg-white rounded-[1rem] shadow-sm border border-slate-200  divide-x divide-slate-100">
                                  
                                  {/* 0 Reset Button */}
                                  <button
                                    type="button"
                                    onClick={() => setEvaluationData(prev => ({ ...prev, [criterion.id]: null }))}
                                    title="Wert auf 0 / gelöscht setzen"
                                    className={`w-9 h-10 md:w-10 md:h-11 text-[0.75rem] leading-tight font-black transition-all cursor-pointer flex items-center justify-center ${
                                      currentVal === null 
                                        ? 'bg-slate-100 text-slate-400 font-bold' 
                                        : 'bg-white text-slate-300 hover:bg-rose-50 hover:text-rose-500'
                                    }`}
                                  >
                                    0
                                  </button>
                                  
                                  {/* M Group */}
                                  <div className="flex relative group/scale">
                                    <div className="absolute -top-5 left-0 w-full text-center text-[0.5625rem] font-black uppercase text-slate-500 opacity-100 pointer-events-none" title={scaleHeader1}>M</div>
                                    {[1, 2].map((num) => {
                                      const isActive = currentVal !== null && currentVal >= num;
                                      const scaleColor = category.scaleColor || 'emerald';
                                      const activeClass = scaleColor === 'blue' ? 'bg-blue-600 text-white' : scaleColor === 'red' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white';
                                      
                                      return (
                                        <button
                                          key={num}
                                          onClick={() => handleRatingChange(criterion.id, num)}
                                          className={`w-10 h-10 md:w-11 md:h-11 text-[0.875rem] leading-snug md:text-[1rem] leading-normal font-black transition-all cursor-pointer border-r border-slate-50 last:border-0 ${
                                            isActive ? `${activeClass} shadow-inner` : 'bg-white text-slate-400 hover:bg-slate-50'
                                          }`}
                                        >{num}</button>
                                      );
                                    })}
                                  </div>
                                  
                                  <div className="w-1 bg-slate-100 shrink-0" />
                                  
                                  {/* E Group */}
                                  <div className="flex relative group/scale">
                                    <div className="absolute -top-5 left-0 w-full text-center text-[0.5625rem] font-black uppercase text-slate-500 opacity-100 pointer-events-none" title={scaleHeader2}>E</div>
                                    {[3, 4].map((num) => {
                                      const isActive = currentVal !== null && currentVal >= num;
                                      const scaleColor = category.scaleColor || 'emerald';
                                      const activeClass = scaleColor === 'blue' ? 'bg-blue-600 text-white' : scaleColor === 'red' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white';
                                      
                                      return (
                                        <button
                                          key={num}
                                          onClick={() => handleRatingChange(criterion.id, num)}
                                          className={`w-10 h-10 md:w-11 md:h-11 text-[0.875rem] leading-snug md:text-[1rem] leading-normal font-black transition-all cursor-pointer border-r border-slate-50 last:border-0 ${
                                            isActive ? `${activeClass} shadow-inner` : 'bg-white text-slate-400 hover:bg-slate-50'
                                          }`}
                                        >{num}</button>
                                      );
                                    })}
                                  </div>

                                  <div className="w-1 bg-slate-100 shrink-0" />
                                  
                                  {/* Ü Group */}
                                  <div className="flex relative group/scale">
                                    <div className="absolute -top-5 left-0 w-full text-center text-[0.5625rem] font-black uppercase text-slate-500 opacity-100 pointer-events-none" title={scaleHeader3}>Ü</div>
                                    {[5, 6].map((num) => {
                                      const isActive = currentVal !== null && currentVal >= num;
                                      const scaleColor = category.scaleColor || 'emerald';
                                      const activeClass = scaleColor === 'blue' ? 'bg-blue-600 text-white' : scaleColor === 'red' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white';
                                      
                                      return (
                                        <button
                                          key={num}
                                          onClick={() => handleRatingChange(criterion.id, num)}
                                          className={`w-10 h-10 md:w-11 md:h-11 text-[0.875rem] leading-snug md:text-[1rem] leading-normal font-black transition-all cursor-pointer border-r border-slate-50 last:border-0 ${
                                            isActive ? `${activeClass} shadow-inner` : 'bg-white text-slate-400 hover:bg-slate-50'
                                          }`}
                                        >{num}</button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
</div>
                      );
                    })}

                    {/* Flat Creator support */}
                    {editMode && (
                      <div className="flex items-center gap-2 pt-2.5 animate-fadeIn max-w-lg">
                        <input
                          type="text"
                          placeholder="Neues Kriterium eintragen..."
                          id={`add_${category.id}_flat`}
                          className="bg-slate-100 border border-slate-300 text-slate-800 text-[0.75rem] leading-tight p-2 rounded-xl flex-grow focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const text = e.currentTarget.value;
                              handleCreateCriterion(category.id, null, text);
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            const el = document.getElementById(`add_${category.id}_flat`) as HTMLInputElement;
                            if (el && el.value.trim()) {
                              handleCreateCriterion(category.id, null, el.value);
                              el.value = '';
                            }
                          }}
                          className="px-3.5 py-2 bg-emerald-600/90 hover:bg-emerald-600 text-slate-800 rounded-lg text-[0.625rem] font-bold uppercase tracking-wider transition cursor-pointer"
                        >
                          <Plus size={10} className="inline mr-1" /> Neu
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Inline Subsection Creator inside this category */}
              {editMode && (
                <div className="flex items-center gap-2 border-t border-slate-300 pt-3 mt-2 animate-fadeIn max-w-sm">
                  <input
                    type="text"
                    placeholder="Neuer Bereich (z.B. Geometrie)..."
                    id={`add_sub_${category.id}`}
                    className="bg-slate-100 border border-slate-300 text-slate-800 text-[0.6875rem] p-2 rounded-xl flex-grow focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        handleCreateSubsection(category.id, e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const el = document.getElementById(`add_sub_${category.id}`) as HTMLInputElement;
                      if (el && el.value.trim()) {
                        handleCreateSubsection(category.id, el.value);
                        el.value = '';
                      }
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-100 text-slate-600 rounded-xl text-[0.625rem] font-bold uppercase cursor-pointer shrink-0"
                  >
                    + Bereich
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Neues Fach hinzufügen (Category level) */}
        {editMode && (
          <div className="p-5 border border-dashed border-slate-200 rounded-3xl bg-slate-100 flex flex-col sm:flex-row items-center gap-4 justify-between animate-fadeIn">
            <div className="space-y-1 text-left w-full sm:w-auto">
              <h4 className="text-[0.75rem] leading-tight font-black uppercase text-slate-500 tracking-wider">Neues Fach hinzufügen</h4>
              <p className="text-[0.625rem] text-slate-400">Erstelle ein neues Fach mit eigenen Kriterien für dieses Zeugnisblatt.</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <input
                type="text"
                placeholder="z.B. Englisch..."
                id="new_subject_input"
                className="bg-slate-100 border border-slate-300 text-slate-800 text-[0.75rem] leading-tight px-3 py-2 rounded-xl flex-grow sm:flex-initial focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleCreateCategory(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
              <button
                onClick={() => {
                  const el = document.getElementById('new_subject_input') as HTMLInputElement;
                  if (el && el.value.trim()) {
                    handleCreateCategory(el.value);
                    el.value = '';
                  }
                }}
                className="px-4 py-2 bg-emerald-600/90 hover:bg-emerald-600 text-slate-800 text-[0.75rem] leading-tight font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Plus size={14} /> Fach hinzufügen
              </button>
            </div>
          </div>
        )}

        {/* 4. FREE TEXT REMARKS */}
        <div className="p-5 bg-slate-100 border border-slate-300 rounded-3xl space-y-4">
          <div className="flex justify-between items-center pb-1 gap-4">
            <div className="flex-grow">
              {editMode ? (
                <div className="space-y-1.5 max-w-xl">
                  <input
                    type="text"
                    value={remarksTitle}
                    onChange={e => {
                      setRemarksTitle(e.target.value);
                      localStorage.setItem('oberau_remarks_title', e.target.value);
                    }}
                    className="w-full bg-white border border-slate-200 text-slate-800 px-3 py-1.5 rounded-xl text-[0.75rem] leading-tight text-slate-800 font-bold focus:outline-none"
                    placeholder="Erläuterung Titel"
                  />
                  <input
                    type="text"
                    value={remarksSubtitle}
                    onChange={e => {
                      setRemarksSubtitle(e.target.value);
                      localStorage.setItem('oberau_remarks_subtitle', e.target.value);
                    }}
                    className="w-full bg-white border border-slate-200 text-slate-800 px-3 py-1 rounded-md text-[0.625rem] text-slate-500 focus:outline-none"
                    placeholder="Erläuterung Beschreibung"
                  />
                </div>
              ) : (
                <>
                  <h4 className="text-[0.75rem] leading-tight font-black uppercase tracking-wider text-slate-600 font-sans">
                    {remarksTitle}
                  </h4>
                  <p className="text-[0.75rem] leading-tight text-slate-600 font-bold uppercase mt-0.5 tracking-widest leading-relaxed break-words">
                    {remarksSubtitle}
                  </p>
                </>
              )}
            </div>
            
            <button
              onClick={handlePolishRemarks}
              disabled={isPolishing || !remarks.trim()}
              className="text-[0.625rem] font-black uppercase tracking-widest border border-slate-300 bg-slate-100 px-4 py-2 hover:border-slate-300 hover:text-slate-500 text-indigo-400 cursor-pointer flex items-center gap-1.5 transition-colors rounded-xl font-mono"
            >
              {isPolishing ? (
                <>
                  <div className="w-2.5 h-2.5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                  Korrektur...
                </>
              ) : (
                <>
                  <Sparkles size={11} className="text-indigo-400 animate-pulse" /> KI Formulierer
                </>
              )}
            </button>
          </div>
          
          <textarea
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder="Beschreibe das Lern- und Sozialverhalten während des Semesters zusätzlich zur standardisierten Bewertung..."
            rows={4}
            className="w-full bg-slate-100 border border-slate-300 p-4 rounded-2xl text-[0.75rem] leading-tight font-semibold leading-relaxed focus:ring-1 focus:ring-emerald-500 focus:outline-none text-slate-800 placeholder-zinc-550"
          />
        </div>

        {/* Save & Status Actions Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-slate-800 hover:text-white rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-900/10 w-full sm:w-auto justify-center"
          >
            {saveStatus === 'saving' ? (
              <span>Sichern...</span>
            ) : saveStatus === 'saved' ? (
              <>
                <CheckCircle2 size={15} /> Noten und Erläuterungen gesichert!
              </>
            ) : (
              <>
                <Save size={15} /> Sichern & abschließen
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. A4 STRICT PRINCIPLE PRINTABLE VIEW (Hidden on monitor, prints perfectly) */}
      {/* ========================================================================= */}
      <div className="hidden print:block bg-white text-black p-0 m-0 print-layout select-text font-sans">
        
        {/* --- PAGE 1: AUTHENTIC VS OBERAU PRINT-COVER --- */}
        <div className="print:page-break-after-always flex flex-col justify-between" style={{ minHeight: '277mm', padding: '15mm 10mm 15mm 10mm', boxSizing: 'border-box' }}>
          
          {/* Logo and Header details */}
          <div className="flex justify-end mb-6">
            <div className="flex items-center gap-3">
              <svg width="60" height="60" viewBox="0 0 100 100" className="overflow-visible">
                {/* Sun */}
                <circle cx="85" cy="20" r="10" fill="#facc15" opacity="0.9" />
                {/* Sun rays */}
                <g stroke="#facc15" strokeWidth="2" strokeLinecap="round">
                  <line x1="85" y1="5" x2="85" y2="0" />
                  <line x1="85" y1="35" x2="85" y2="40" />
                  <line x1="70" y1="20" x2="65" y2="20" />
                  <line x1="100" y1="20" x2="105" y2="20" />
                  <line x1="74.4" y1="9.4" x2="70.9" y2="5.9" />
                  <line x1="95.6" y1="30.6" x2="99.1" y2="34.1" />
                  <line x1="74.4" y1="30.6" x2="70.9" y2="34.1" />
                  <line x1="95.6" y1="9.4" x2="99.1" y2="5.9" />
                </g>
                
                {/* Stylized Red Child */}
                <g stroke="#dc2626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
                  {/* Head */}
                  <circle cx="45" cy="35" r="12" strokeWidth="3" fill="#ffffff" />
                  {/* Hair / Pigtails */}
                  <path d="M 33 30 Q 25 22 25 32" strokeWidth="2.5" />
                  <path d="M 57 30 Q 65 22 65 32" strokeWidth="2.5" />
                  {/* Face eyes and smile */}
                  <circle cx="41" cy="33" r="1.5" fill="#dc2626" stroke="none" />
                  <circle cx="49" cy="33" r="1.5" fill="#dc2626" stroke="none" />
                  <path d="M 40 40 Q 45 44 50 40" strokeWidth="2" />
                  {/* Body (Dress structure like stick child) */}
                  <path d="M 45 47 L 35 72 L 55 72 Z" fill="#dc2626" fillOpacity="0.1" />
                  <path d="M 45 47 L 35 72 L 55 72 Z" />
                  {/* Arms wide open */}
                  <path d="M 41 53 L 23 48" />
                  <path d="M 49 53 L 67 48" />
                  {/* Tiny hands */}
                  <circle cx="23" cy="48" r="2.5" fill="#dc2626" />
                  <circle cx="67" cy="48" r="2.5" fill="#dc2626" />
                  {/* Legs */}
                  <path d="M 40 72 L 36 90" />
                  <path d="M 50 72 L 54 90" />
                  {/* Feet */}
                  <path d="M 36 90 L 30 90" />
                  <path d="M 54 90 L 60 90" />
                </g>
              </svg>
              <div className="flex flex-col text-left font-sans">
                <div className="flex items-baseline leading-none">
                  <span className="text-[1.25rem] font-semibold tracking-tight text-slate-700">Volksschule</span>
                  <span className="text-[1.25rem] font-black tracking-tight text-slate-900 ml-1">Oberau</span>
                </div>
                <span className="text-[0.46875rem] text-slate-500 font-bold uppercase tracking-widest mt-1 leading-none">
                  Hämmerlestraße 2 | 6800 Feldkirch–Gisingen
                </span>
              </div>
            </div>
          </div>

          {/* Central Title details */}
          <div className="text-center my-auto space-y-8 py-4 print:break-after-avoid">
            <div className="space-y-3 print:break-after-avoid">
              <h1 className="text-[1.5rem] font-bold tracking-normal text-slate-900 leading-snug print:break-after-avoid">
                Schriftliche Erläuterung zum
              </h1>
              <h1 className="text-[1.75rem] font-black uppercase tracking-wider text-slate-950 leading-tight print:break-after-avoid">
                {isSpf ? "Jahreszeugnis für Kinder mit Förderbedarf" : "Jahreszeugnis"}
              </h1>
            </div>

            <div className="flex justify-between items-center max-w-sm mx-auto border-b border-stone-250 pb-2 text-[0.75rem] text-stone-800 font-bold uppercase tracking-wider print:break-after-avoid">
              <span>Schuljahr {schuljahr}</span>
              <span>{semester}</span>
            </div>

            <div className="space-y-2 py-6 print:break-after-avoid">
              <h2 className="text-[2.25rem] font-black text-rose-800 leading-none tracking-wide select-all print:break-after-avoid">
                {student.vorname} {student.nachname}
              </h2>
              <p className="text-[0.875rem] font-black text-rose-700/80 uppercase tracking-widest print:break-after-avoid">
                {student.geschlecht === 'w' ? 'Schülerin' : 'Schüler'} der Klasse {app.klassenbezeichnung || '3b'}, {app.stufe || '3'}. Schulstufe
              </p>
            </div>

            <div className="max-w-md mx-auto space-y-4 border-t border-b border-stone-250 py-5">
              <div className="flex justify-between items-center px-4">
                <span className="text-[0.75rem] font-black uppercase tracking-widest text-[#78716c]">Geburtsdatum</span>
                <span className="text-[0.875rem] font-black text-rose-600 tracking-wide">{student.geburtstag || '–'}</span>
              </div>
              <div className="flex justify-between items-center px-4">
                <span className="text-[0.75rem] font-black uppercase tracking-widest text-[#78716c]">Religionsbekenntnis</span>
                <span className="text-[0.875rem] font-black text-rose-600 tracking-wide">{student.religion || 'o.B.'}</span>
              </div>
            </div>

            {/* Circular Official Municipal Seal Stamp */}
            <div className="flex justify-center py-2">
              <div className="relative w-32 h-32 opacity-70 print:opacity-60">
                <svg width="128" height="128" viewBox="0 0 120 120" className="w-full h-full text-slate-400">
                  {/* Outer dotted circle */}
                  <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                  {/* Inner solid circle */}
                  <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="1" />
                  {/* Core circle */}
                  <circle cx="60" cy="60" r="32" fill="none" stroke="currentColor" strokeWidth="0.75" />
                  
                  {/* Top curving text */}
                  <path id="seal-text-path-top" d="M 18 60 A 42 42 0 0 1 102 60" fill="none" stroke="none" />
                  <text className="fill-current text-[0.3125rem] font-black tracking-[0.16em]" textAnchor="middle">
                    <textPath href="#seal-text-path-top" startOffset="50%">
                      VOLKSSCHULE GISINGEN-OBERAU
                    </textPath>
                  </text>

                  {/* Bottom curving text */}
                  <path id="seal-text-path-bottom" d="M 102 60 A 42 42 0 0 1 18 60" fill="none" stroke="none" />
                  <text className="fill-current text-[0.28125rem] font-black tracking-[0.16em]" textAnchor="middle">
                    <textPath href="#seal-text-path-bottom" startOffset="50%">
                      ★ FELDKIRCH VORARLBERG ★
                    </textPath>
                  </text>

                  {/* Center content: Date & Stylized Emblem */}
                  <g className="stroke-current fill-none stroke-[1]" strokeLinecap="round" strokeLinejoin="round" transform="translate(48, 35) scale(0.4)">
                    <path d="M 10 5 L 50 5 L 50 45 L 30 55 L 10 45 Z" fill="currentColor" fillOpacity="0.08" />
                    <path d="M 20 5 L 20 40 M 30 5 L 30 45 M 40 5 L 40 40" />
                  </g>
                  <text x="60" y="70" className="fill-current text-[0.25rem] font-bold tracking-wider" textAnchor="middle">
                    Feldkirch, am
                  </text>
                  <text x="60" y="76" className="fill-current text-[0.3rem] font-black tracking-widest uppercase" textAnchor="middle">
                    {datum}
                  </text>
                </svg>
              </div>
            </div>
          </div>

          {/* Footer signatures */}
          <div className="space-y-6 pt-6 border-t border-stone-250">
            <div className="grid grid-cols-2 gap-12">
              <div className="text-center flex flex-col justify-end space-y-1">
                {/* Simulated handwritten ink signature in Class Blue */}
                <div className="h-10 flex items-center justify-center relative">
                  <svg width="120" height="35" viewBox="0 0 150 40" className="stroke-blue-700 fill-none stroke-[1.5] opacity-85 select-none pointer-events-none -mb-2">
                    <path d="M 15 25 C 22 8, 28 5, 32 15 C 36 25, 30 38, 42 28 C 52 18, 65 12, 70 20 C 75 28, 68 35, 82 25 C 92 15, 105 10, 115 15 C 125 20, 110 35, 130 30" />
                    <path d="M 8 30 Q 60 32, 125 28" strokeWidth="1" />
                  </svg>
                </div>
                <div className="border-b border-dashed border-stone-400 w-full max-w-[180px] mx-auto" />
                <span className="text-[0.5625rem] font-black uppercase text-stone-400 tracking-wider pt-1">
                  Klassenlehrer/in:
                </span>
                <span className="text-[0.6875rem] font-bold text-slate-800 leading-none">{klassenlehrer || '_________________'}</span>
              </div>

              <div className="text-center flex flex-col justify-end space-y-1">
                {/* Simulated handwritten ink signature in Executive Black */}
                <div className="h-10 flex items-center justify-center relative">
                  <svg width="120" height="35" viewBox="0 0 150 40" className="stroke-stone-800 fill-none stroke-[1.5] opacity-90 select-none pointer-events-none -mb-2">
                    <path d="M 10 28 C 15 10, 20 2, 28 8 C 32 12, 25 35, 35 25 C 45 15, 60 5, 64 12 C 68 18, 55 38, 68 28 C 80 18, 92 10, 100 18 C 105 22, 100 32, 112 28 C 122 24, 135 15, 145 22" />
                    <path d="M 5 32 Q 55 35, 120 30 Q 140 28, 110 33" strokeWidth="1" />
                  </svg>
                </div>
                <div className="border-b border-dashed border-stone-400 w-full max-w-[180px] mx-auto" />
                <span className="text-[0.5625rem] font-black uppercase text-stone-400 tracking-wider pt-1">
                  Direktor/in:
                </span>
                <span className="text-[0.6875rem] font-bold text-slate-800 leading-none">{direktorin}</span>
              </div>
            </div>

            {isSpf && (
              <div className="text-center flex flex-col justify-end space-y-1 pt-2">
                {/* Simulated handwritten ink signature in Assistant Green */}
                <div className="h-10 flex items-center justify-center relative">
                  <svg width="120" height="35" viewBox="0 0 150 40" className="stroke-emerald-700 fill-none stroke-[1.5] opacity-85 select-none pointer-events-none -mb-2">
                    <path d="M 20 22 C 25 10, 32 5, 38 18 C 42 26, 48 32, 58 20 C 68 8, 80 10, 85 22 C 90 32, 100 12, 112 18 C 122 24, 130 30, 140 22" />
                    <path d="M 12 26 Q 70 28, 135 24" strokeWidth="1" />
                  </svg>
                </div>
                <div className="border-b border-dashed border-stone-400 w-full max-w-[180px] mx-auto" />
                <span className="text-[0.5625rem] font-black uppercase text-stone-400 tracking-wider pt-1">
                  Integrationslehrer/in:
                </span>
                <span className="text-[0.6875rem] font-bold text-slate-800 leading-none">{integrationslehrer}</span>
              </div>
            )}
          </div>
        </div>

        {/* --- PAGE 2: MAIN SUBJECTS (Deutsch & Mathematik) --- */}
        <div className="print:page-break-after-always flex flex-col" style={{ minHeight: '277mm', padding: '15mm 10mm 15mm 10mm', boxSizing: 'border-box' }}>
          {customCategories.filter(cat => ['de', 'ma'].includes(cat.id)).map(category => {
            const isDe = category.id === 'de';
            const headerBg = isDe ? '#dbeafe' : '#fee2e2';
            const shadeColor = isDe ? '#bae6fd' : '#fecdd3';
            
            return (
              <div key={category.id} className="mb-6 last:mb-0 print:break-inside-avoid">
                <div className="flex justify-between items-baseline border-b border-stone-400 pb-1.5 mb-3 print:break-after-avoid">
                  <h2 className="text-[1.125rem] font-black uppercase tracking-wider text-slate-900 font-sans print:break-after-avoid">
                    {category.label}
                  </h2>
                  <span className="text-[0.5rem] font-extrabold uppercase tracking-widest text-[#78716c]">
                    Erläuterung • {student.vorname} {student.nachname}
                  </span>
                </div>

                <div className="space-y-4 print:break-after-avoid">
                  {category.subsections?.map(sub => (
                    <div key={sub.id} className=" border border-stone-400 rounded-lg print:border print:border-gray-300 print:shadow-none print:break-inside-avoid">
                      <table className="w-full border-collapse text-left bg-white text-[0.65625rem] print:text-[0.875rem] leading-snug print:w-full">
                        <thead>
                          <tr style={{ backgroundColor: headerBg, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} className="print:break-inside-avoid">
                            <th className="p-2 font-black uppercase text-[0.59375rem] text-slate-800 border-r border-stone-400 w-[55%] leading-normal print:border-r print:border-gray-300">
                              {sub.label}
                            </th>
                            <th className="p-2 font-bold text-center uppercase text-[0.5rem] text-slate-700 border-r border-stone-400 w-[15%] leading-tight print:border-r print:border-gray-300">
                              {scaleHeader1}
                            </th>
                            <th className="p-2 font-bold text-center uppercase text-[0.5rem] text-slate-700 border-r border-stone-400 w-[15%] leading-tight print:border-r print:border-gray-300">
                              {scaleHeader2}
                            </th>
                            <th className="p-2 font-bold text-center uppercase text-[0.5rem] text-slate-700 w-[15%] leading-tight">
                              {scaleHeader3}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200">
                          {sub.items.map(criterion => {
                            const val = evaluationData[criterion.id] || null;
                            const shade1 = val !== null && val >= 1;
                            const shade2 = val !== null && val >= 3;
                            const shade3 = val !== null && val >= 5;

                            return (
                              <tr key={criterion.id} className="print:break-inside-avoid print:border-b print:border-gray-300">
                                <td className="p-2 font-medium text-slate-800 border-r border-stone-400 leading-relaxed max-w-[300px] print:border-r print:border-gray-300">
                                  {criterion.label}
                                </td>
                                <td 
                                  className="p-2 border-r border-stone-400 border-dotted print:border-r print:border-gray-300" 
                                  style={{ 
                                    backgroundColor: shade1 ? shadeColor : 'transparent',
                                    WebkitPrintColorAdjust: 'exact',
                                    printColorAdjust: 'exact'
                                  }}
                                />
                                <td 
                                  className="p-2 border-r border-stone-400 border-dotted" 
                                  style={{ 
                                    backgroundColor: shade2 ? shadeColor : 'transparent',
                                    WebkitPrintColorAdjust: 'exact',
                                    printColorAdjust: 'exact'
                                  }}
                                />
                                <td 
                                  className="p-2" 
                                  style={{ 
                                    backgroundColor: shade3 ? shadeColor : 'transparent',
                                    WebkitPrintColorAdjust: 'exact',
                                    printColorAdjust: 'exact'
                                  }}
                                />
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* --- PAGE 3: SECONDARY SUBJECTS & GENERAL ASSESSMENT --- */}
        <div className="print:page-break-after-always flex flex-col" style={{ minHeight: '277mm', padding: '15mm 10mm 15mm 10mm', boxSizing: 'border-box' }}>
          <div className="flex justify-between items-baseline border-b border-stone-400 pb-1.5 mb-4 print:break-after-avoid">
            <h2 className="text-[1.125rem] font-black uppercase tracking-wider text-slate-900 font-sans print:break-after-avoid">
              Weitere Unterrichtsgegenstände & Allgemeines
            </h2>
            <span className="text-[0.5rem] font-extrabold uppercase tracking-widest text-[#78716c]">
              Erläuterung • {student.vorname} {student.nachname}
            </span>
          </div>

          <div className="space-y-4 print:break-after-avoid">
            {customCategories.filter(cat => !['de', 'ma'].includes(cat.id)).map(category => {
              const shadeColor = '#e9d5ff'; // Lavender/Violet for general assessments
              const headerBg = '#f3e8ff';
              
              if (!category.items || category.items.length === 0) return null;

              return (
                <div key={category.id} className=" border border-stone-400 rounded-lg print:border print:border-gray-300 print:shadow-none print:break-inside-avoid">
                  <table className="w-full border-collapse text-left bg-white text-[0.65625rem] print:text-[0.875rem] leading-snug print:w-full">
                    <thead>
                      <tr style={{ backgroundColor: headerBg, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} className="print:break-inside-avoid">
                        <th className="p-2 font-black uppercase text-[0.59375rem] text-slate-800 border-r border-stone-400 w-[55%] leading-normal print:border-r print:border-gray-300">
                          {category.label}
                        </th>
                        <th className="p-2 font-bold text-center uppercase text-[0.5rem] text-slate-700 border-r border-stone-400 w-[15%] leading-tight print:border-r print:border-gray-300">
                          {scaleHeader1}
                        </th>
                        <th className="p-2 font-bold text-center uppercase text-[0.5rem] text-slate-700 border-r border-stone-400 w-[15%] leading-tight print:border-r print:border-gray-300">
                          {scaleHeader2}
                        </th>
                        <th className="p-2 font-bold text-center uppercase text-[0.5rem] text-slate-700 w-[15%] leading-tight">
                          {scaleHeader3}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {category.items.map(criterion => {
                        const val = evaluationData[criterion.id] || null;
                        const shade1 = val !== null && val >= 1;
                        const shade2 = val !== null && val >= 3;
                        const shade3 = val !== null && val >= 5;

                        return (
                          <tr key={criterion.id} className="print:break-inside-avoid print:border-b print:border-gray-300">
                            <td className="p-2 font-medium text-slate-800 border-r border-stone-400 leading-relaxed max-w-[300px] print:border-r print:border-gray-300">
                              {criterion.label}
                            </td>
                            <td 
                              className="p-2 border-r border-stone-400 border-dotted print:border-r print:border-gray-300" 
                              style={{ 
                                backgroundColor: shade1 ? shadeColor : 'transparent',
                                WebkitPrintColorAdjust: 'exact',
                                printColorAdjust: 'exact'
                              }}
                            />
                            <td 
                              className="p-2 border-r border-stone-400 border-dotted" 
                              style={{ 
                                backgroundColor: shade2 ? shadeColor : 'transparent',
                                WebkitPrintColorAdjust: 'exact',
                                printColorAdjust: 'exact'
                              }}
                            />
                            <td 
                              className="p-2" 
                              style={{ 
                                backgroundColor: shade3 ? shadeColor : 'transparent',
                                WebkitPrintColorAdjust: 'exact',
                                printColorAdjust: 'exact'
                              }}
                            />
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>

        {/* --- PAGE 4: INDIVIDUAL FREITEXT REMARKS (Autonomous backing page) --- */}
        {remarks.trim() && (
          <div className="flex flex-col justify-between" style={{ minHeight: '277mm', padding: '15mm 10mm 15mm 10mm', boxSizing: 'border-box' }}>
            <div>
              <div className="border-b-2 border-stone-900 pb-2 mb-6">
                <h3 className="text-[1.25rem] font-black uppercase tracking-wider text-rose-800">
                  {remarksTitle}
                </h3>
                <p className="text-[0.5625rem] font-extrabold uppercase tracking-widest text-[#78716c] mt-1 pr-1 border-stone-300">
                  Individueller Freitext zur schriftlichen Erläuterung • {student.vorname} {student.nachname}
                </p>
              </div>
              
              <div className="p-8 border border-stone-300 bg-stone-50/50 rounded-2xl text-[0.75rem] leading-relaxed font-semibold italic whitespace-pre-wrap select-all text-slate-800">
                "{remarks}"
              </div>
            </div>
            
            <div className="text-center font-bold text-[0.5625rem] text-[#a8a29e] tracking-widest uppercase py-4 border-t border-stone-100">
              Volksschule Oberau • Schriftlicher Zeugnisnachweis {schuljahr} • {semester}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
