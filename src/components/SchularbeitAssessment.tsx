import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Save,
  Calculator,
  FileText,
  ChevronRight,
  Info,
  Plus,
  Minus,
  Trash2,
  Settings2,
  Sparkles,
  RotateCcw,
  BarChart2,
  Table,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useApp } from "../context/AppContext";
import { logActivity } from "../lib/utils";
import SchularbeitClassStats from "./SchularbeitClassStats";
import SchularbeitClassTable from "./SchularbeitClassTable";

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

const PRESETS: Record<
  string,
  { title: string; config?: any; aspects: Aspect[] }
> = {
  erlebniserzaehlung: {
    title: "Erlebniserzählung",
    aspects: [
      {
        id: "inhalt",
        title: "1. Inhalt",
        criteria: [
          {
            id: "i1",
            label: "Thema getroffen",
            description: "Thema wurde erfasst und umgesetzt",
            maxPoints: 2,
            points: 0,
          },
          {
            id: "i2",
            label: "Logischer Zusammenhang",
            description:
              "Zusammenhängender Darstellungsverlauf, vollständig, genau",
            maxPoints: 2,
            points: 0,
          },
          {
            id: "i3",
            label: "Gliederung & Höhepunkt",
            description:
              "Erkennbare Gliederung mit wirksamem Höhepunkt, Schluss, Pointe",
            maxPoints: 2,
            points: 0,
          },
        ],
      },
      {
        id: "ausdruck",
        title: "2. Ausdruck",
        criteria: [
          {
            id: "a1",
            label: "Wortschatz",
            description:
              "Abwechslungsreicher Wortschatz, keine Wortwiederholungen",
            maxPoints: 2,
            points: 0,
          },
          {
            id: "a2",
            label: "Wortwahl",
            description: "Angemessene, treffende Wortwahl (Verben, Adjektive)",
            maxPoints: 2,
            points: 0,
          },
          {
            id: "a3",
            label: "Satzbau",
            description:
              "Abwechslungsreicher Satzbau und Satzverbindungen, wörtliche Rede",
            maxPoints: 2,
            points: 0,
          },
        ],
      },
      {
        id: "sprachrichtigkeit",
        title: "3. Sprachrichtigkeit",
        criteria: [
          {
            id: "s1",
            label: "Zeitformen",
            description: "Erzählzeit gehalten, Zeiten bewältigt, Modi richtig",
            maxPoints: 2,
            points: 0,
          },
          {
            id: "s2",
            label: "Grammatik",
            description:
              "Fälle, Artikel, Präteritum u. Mehrzahlformen richtig verwendet",
            maxPoints: 2,
            points: 0,
          },
          {
            id: "s3",
            label: "Wortstellung",
            description: "Wortstellung richtig, vollständige Sätze",
            maxPoints: 2,
            points: 0,
          },
        ],
      },
    ],
  },
  bildgeschichte: {
    title: "Bildgeschichte",
    aspects: [
      {
        id: "inhalt",
        title: "1. Inhalt",
        criteria: [
          {
            id: "i1",
            label: "Sinn erfasst",
            description: "Sinn der Geschichte erfasst, Thema getroffen",
            maxPoints: 2,
            points: 0,
          },
          {
            id: "i2",
            label: "Logik & Verknüpfung",
            description:
              "Reihenfolge und logische Verknüpfung der Bilder beachtet",
            maxPoints: 2,
            points: 0,
          },
          {
            id: "i3",
            label: "Gliederung",
            description: "Anfang, Höhepunkt und Abschluss erkennbar formuliert",
            maxPoints: 2,
            points: 0,
          },
        ],
      },
      {
        id: "ausdruck",
        title: "2. Ausdruck",
        criteria: [
          {
            id: "a1",
            label: "Wortschatz",
            description:
              "Abwechslungsreicher Wortschatz, keine Wortwiederholungen",
            maxPoints: 2,
            points: 0,
          },
          {
            id: "a2",
            label: "Wortwahl",
            description: "Angemessene, treffende Wortwahl (Verben, Adjektive)",
            maxPoints: 2,
            points: 0,
          },
          {
            id: "a3",
            label: "Satzbau",
            description:
              "Abwechslungsreicher Satzbau und Satzverbindungen, wörtliche Rede",
            maxPoints: 2,
            points: 0,
          },
        ],
      },
      {
        id: "sprachrichtigkeit",
        title: "3. Sprachrichtigkeit",
        criteria: [
          {
            id: "s1",
            label: "Zeitformen",
            description: "Erzählzeit gehalten, Zeiten bewältigt, Modi richtig",
            maxPoints: 2,
            points: 0,
          },
          {
            id: "s2",
            label: "Grammatik",
            description:
              "Fälle, Artikel, Präteritum u. Mehrzahlformen richtig verwendet",
            maxPoints: 2,
            points: 0,
          },
          {
            id: "s3",
            label: "Wortstellung",
            description: "Wortstellung richtig, vollständige Sätze",
            maxPoints: 2,
            points: 0,
          },
        ],
      },
    ],
  },
  nacherzaehlung: {
    title: "Nacherzählung",
    config: {
      weightText: 3,
      weightSpelling: 1,
      spellingFactor: 800,
      grade1Points: 25.5,
      grade2Points: 21.5,
      grade3Points: 17.5,
      grade4Points: 13.5,
      spelling1Q: 10,
      spelling2Q: 29,
      spelling3Q: 59,
      spelling4Q: 89,
    },
    aspects: [
      {
        id: "ausdruck",
        title: "1. Ausdruck (7 Pkt) - Wortwahl & Satzgefüge",
        criteria: [
          {
            id: "a1",
            label: "Verschiedene Satzanfänge",
            description:
              "Abwechslungsrijke Satzanfänge (jeder Fehler/Wortwiederholung minus 0,5)",
            maxPoints: 2,
            points: 0,
          },
          {
            id: "a2",
            label: "Treffende Ausdrücke",
            description:
              "Treffende, bildliche Bezeichnungen & Adjektive (jeder Fehler minus 0,5)",
            maxPoints: 2,
            points: 0,
          },
          {
            id: "a3",
            label: "Keine Wortwiederholungen",
            description:
              "Vermeidung von monotonen Wortwiederholungen (minus 0,5)",
            maxPoints: 2,
            points: 0,
          },
          {
            id: "a4",
            label: "Besondere Formulierungen, Direkte Rede",
            description:
              "Stilistische Ausdrücke & wörtliche Rede mit passenden Begleitsätzen (jede plus 0,5)",
            maxPoints: 1,
            points: 0,
          },
        ],
      },
      {
        id: "sprachrichtigkeit",
        title: "2. Sprachrichtigkeit (8 Pkt)",
        criteria: [
          {
            id: "s1",
            label: "Erzählzeit beibehalten",
            description:
              "Erzählzeit (Präteritum) im Verlauf konsequent halten (jeder weitere Fehler minus 0,5)",
            maxPoints: 2,
            points: 0,
          },
          {
            id: "s2",
            label: "Richtiger Satzbau",
            description:
              "Reihenfolge Satzglieder, keine Satzbaufehler (jeder Fehler minus 0,5). Zu lange Sätze, Wortstellung falsch",
            maxPoints: 2,
            points: 0,
          },
          {
            id: "s3",
            label: "Satzzeichen",
            description:
              "Satzzeichen, auch in der direkten Rede richtig gesetzt (jeder Fehler minus 0,5)",
            maxPoints: 2,
            points: 0,
          },
          {
            id: "s4",
            label: "Richtiger Fall",
            description:
              "Grammatikalische Fälle (Nominativ, Genitiv, Dativ, Akkusativ) richtig gebildet (jeder Fehler minus 0,5)",
            maxPoints: 2,
            points: 0,
          },
        ],
      },
      {
        id: "inhalt",
        title: "3. Inhalt (13 Pkt) - Vollständigkeit & Logik",
        criteria: [
          {
            id: "i1",
            label: "Nichts Erfundenes hinzugefügt",
            description:
              "Sinnhaftes, texttreues Nacherzählen ohne Erfindungen (jeder Verstoß minus 0,5)",
            maxPoints: 2,
            points: 0,
          },
          {
            id: "i2",
            label: "Alles Wichtige ist vorhanden",
            description: "",
            maxPoints: 4,
            points: 0,
          },
          {
            id: "i3",
            label: "Richtiger Handlungsablauf / roter Faden",
            description:
              "Logische, chronologische Abfolge der Geschichtenabschnitte",
            maxPoints: 1,
            points: 0,
          },
          {
            id: "i4",
            label: "Erkennbare Gliederung (E, H, S)",
            description:
              "Einleitung, Hauptteil, Schluss (Absatz Einleitung -> Hauptteil minus 0,5, Absatz Hauptteil -> Schluss minus 0,5)",
            maxPoints: 1,
            points: 0,
          },
          {
            id: "i5",
            label: "Moral in eigene Worte fassen",
            description:
              "Lehre richtig erkannt und selbstständig formuliert (abgeschrieben 0 Pkt, Satzglieder nur verstellt minus 0,5)",
            maxPoints: 1,
            points: 0,
          },
          {
            id: "i6",
            label: "Erzählung als Einheit",
            description:
              "Der Gesamttext fließt erzählerisch, nicht nur ein reiner Dialog (jeder Fehler minus 0,5)",
            maxPoints: 1,
            points: 0,
          },
          {
            id: "i7",
            label: "Eigene Worte verwenden",
            description:
              "Eigenständige Formulierung (Satzglieder verstellen: jew. 2 Sätze minus 0,5; Sätze identisch minus 0,5; die Hälfte identisch minus 0,5)",
            maxPoints: 3,
            points: 0,
          },
        ],
      },
    ],
  },
  beschreibung: {
    title: "Beschreibung",
    aspects: [
      {
        id: "inhalt",
        title: "1. Inhalt",
        criteria: [
          {
            id: "i1",
            label: "Aufbau & Abfolge",
            description: "Die Beschreibung ist klar in Aufbau und Abfolge",
            maxPoints: 2,
            points: 0,
          },
          {
            id: "i2",
            label: "Erkennbarkeit",
            description: "Der (die, das) Beschriebene ist klar erkennbar",
            maxPoints: 2,
            points: 0,
          },
          {
            id: "i3",
            label: "Merkmale",
            description: "Alle wesentlichen Merkmale scheinen auf",
            maxPoints: 2,
            points: 0,
          },
        ],
      },
      {
        id: "ausdruck",
        title: "2. Ausdruck",
        criteria: [
          {
            id: "a1",
            label: "Wortschatz",
            description:
              "Abwechslungsreicher Wortschatz, keine Wortwiederholungen",
            maxPoints: 2,
            points: 0,
          },
          {
            id: "a2",
            label: "Wortwahl",
            description: "Angemessene, treffende Wortwahl (Verben, Adjektive)",
            maxPoints: 2,
            points: 0,
          },
          {
            id: "a3",
            label: "Satzbau",
            description:
              "Abwechslungsreicher Satzbau und Satzverbindungen, wörtliche Rede",
            maxPoints: 2,
            points: 0,
          },
        ],
      },
      {
        id: "sprachrichtigkeit",
        title: "3. Sprachrichtigkeit",
        criteria: [
          {
            id: "s1",
            label: "Zeitformen",
            description: "Erzählzeit gehalten, Zeiten bewältigt, Modi richtig",
            maxPoints: 2,
            points: 0,
          },
          {
            id: "s2",
            label: "Grammatik",
            description:
              "Fälle, Artikel, Präteritum u. Mehrzahlformen richtig verwendet",
            maxPoints: 2,
            points: 0,
          },
          {
            id: "s3",
            label: "Wortstellung",
            description: "Wortstellung richtig, vollständige Sätze",
            maxPoints: 2,
            points: 0,
          },
        ],
      },
    ],
  },
  mathe_grund: {
    title: "Grundrechenarten & Zahlenraum",
    config: {
      enableSpelling: false,
      enableGrammar: false,
      weightText: 1,
      weightSpelling: 0,
      grade1Points: 18,
      grade2Points: 15,
      grade3Points: 12,
      grade4Points: 8,
    },
    aspects: [
      {
        id: "grund",
        title: "1. Grundrechenarten",
        criteria: [
          { id: "g1", label: "Addition & Subtraktion", description: "Sicheres Rechnen und korrekter Übertrag", maxPoints: 5, points: 0 },
          { id: "g2", label: "Multiplikation & Division", description: "Sichere Beherrschung des Einmaleins", maxPoints: 5, points: 0 },
        ]
      },
      {
        id: "zahlen",
        title: "2. Zahlenraum & Verständnis",
        criteria: [
          { id: "z1", label: "Zahlen ordnen / runden", description: "Sicheres Zuordnen der Zahlen am Zahlenstrahl und Runden", maxPoints: 5, points: 0 },
          { id: "z2", label: "Größer/Kleiner Vergleiche", description: "Korrekte Anwendung der Relationszeichen", maxPoints: 5, points: 0 },
        ]
      }
    ]
  },
  mathe_sach: {
    title: "Sachaufgaben & Textaufgaben",
    config: {
      enableSpelling: false,
      enableGrammar: false,
      weightText: 1,
      weightSpelling: 0,
      grade1Points: 18,
      grade2Points: 15,
      grade3Points: 12,
      grade4Points: 8,
    },
    aspects: [
      {
        id: "verstaendnis",
        title: "1. Textverständnis & Skizze",
        criteria: [
          { id: "v1", label: "Erfassen des Problems", description: "Markieren wichtiger Informationen im Text", maxPoints: 3, points: 0 },
          { id: "v2", label: "Skizze oder Plan", description: "Erstellung einer sachgerechten Skizze oder Tabelle", maxPoints: 3, points: 0 }
        ]
      },
      {
        id: "rechnung",
        title: "2. Mathematische Ausführung",
        criteria: [
          { id: "r1", label: "Rechenweg", description: "Richtigen Rechenweg gewählt", maxPoints: 4, points: 0 },
          { id: "r2", label: "Ausführung", description: "Rechnung richtig durchgeführt ohne Flüchtigkeitsfehler", maxPoints: 6, points: 0 }
        ]
      },
      {
        id: "antwort",
        title: "3. Antwort",
        criteria: [
          { id: "a1", label: "Antwortsatz", description: "Antwortsatz passt logisch zur Textfrage", maxPoints: 2, points: 0 },
          { id: "a2", label: "Einheiten", description: "Maßeinheiten oder Geldbeträge richtig angeschrieben", maxPoints: 2, points: 0 }
        ]
      }
    ]
  },
  mathe_geo: {
    title: "Geometrie",
    config: {
      enableSpelling: false,
      enableGrammar: false,
      weightText: 1,
      weightSpelling: 0,
      grade1Points: 18,
      grade2Points: 15,
      grade3Points: 12,
      grade4Points: 8,
    },
    aspects: [
      {
        id: "konstruktion",
        title: "1. Geometrie & Konstruktion",
        criteria: [
          { id: "k1", label: "Figuren & Eigenschaften", description: "Flächen, Umfang und Eigenschaften richtig erkannt/berechnet", maxPoints: 5, points: 0 },
          { id: "k2", label: "Maßgenauigkeit & Zeichnen", description: "Längen und Abstände exakt eingehalten, sauber gezeichnet", maxPoints: 5, points: 0 }
        ]
      }
    ]
  },
  mathe_groessen: {
    title: "Größen & Maße",
    config: {
      enableSpelling: false,
      enableGrammar: false,
      weightText: 1,
      weightSpelling: 0,
      grade1Points: 18,
      grade2Points: 15,
      grade3Points: 12,
      grade4Points: 8,
    },
    aspects: [
      {
        id: "groessen",
        title: "1. Größen & Maße",
        criteria: [
          { id: "gr1", label: "Einheiten umwandeln", description: "Sicheres Umwandeln von Längen, Gewichten, Zeiten oder Geld", maxPoints: 5, points: 0 },
          { id: "gr2", label: "Rechnen mit Maßen", description: "Korrekte Berechnung inklusive Einheiten", maxPoints: 5, points: 0 }
        ]
      }
    ]
  },
  mathe_brueche: {
    title: "Brüche & Dezimalzahlen",
    config: {
      enableSpelling: false,
      enableGrammar: false,
      weightText: 1,
      weightSpelling: 0,
      grade1Points: 18,
      grade2Points: 15,
      grade3Points: 12,
      grade4Points: 8,
    },
    aspects: [
      {
        id: "brueche",
        title: "1. Brüche & Dezimalzahlen",
        criteria: [
          { id: "b1", label: "Bruchverständnis & Darstellung", description: "Brüche korrekt gezeichnet und erkannt (z.B. auf ein Ganzes ergänzt)", maxPoints: 4, points: 0 },
          { id: "b2", label: "Rechnen & Teil vom Ganzen", description: "Korrekte Berechnung von Bruchteilen (z.B. 1/4 von 20)", maxPoints: 6, points: 0 }
        ]
      }
    ]
  },
  mathe_daten: {
    title: "Daten & Häufigkeit",
    config: {
      enableSpelling: false,
      enableGrammar: false,
      weightText: 1,
      weightSpelling: 0,
      grade1Points: 18,
      grade2Points: 15,
      grade3Points: 12,
      grade4Points: 8,
    },
    aspects: [
      {
        id: "daten",
        title: "1. Daten & Diagramme",
        criteria: [
          { id: "d1", label: "Diagramme auslesen", description: "Daten aus Tabellen und Diagrammen korrekt entnommen", maxPoints: 5, points: 0 },
          { id: "d2", label: "Diagramme erstellen", description: "z.B. Balkendiagramm korrekt und lesbar gezeichnet", maxPoints: 5, points: 0 }
        ]
      }
    ]
  }
};

interface Props {
  studentId: string;
  studentName: string;
  saIndex: number;
  subject: string;
  semester: string;
  onClose: () => void;
}

function getDefaultPreset(subject: string, saIndex: number) {
  if (subject === "Deutsch") {
    if (saIndex === 0) return PRESETS.erlebniserzaehlung;
    if (saIndex === 1) return PRESETS.bildgeschichte;
    if (saIndex === 2 || saIndex === 3) return PRESETS.nacherzaehlung;
  }
  if (subject === "Mathe" || subject === "Mathematik") {
    if (saIndex === 0) return PRESETS.mathe_grund;
    if (saIndex === 1) return PRESETS.mathe_sach;
    return PRESETS.mathe_geo;
  }
  return PRESETS.erlebniserzaehlung;
}

export default function SchularbeitAssessment({
  studentId,
  studentName,
  saIndex,
  subject,
  semester,
  onClose,
}: Props) {
  const { app, setApp } = useApp();

  // Load existing data if available
  const existingData = useMemo(() => {
    return app.saAssessments?.[studentId]?.[subject]?.[semester]?.[saIndex];
  }, [app.saAssessments, studentId, subject, semester, saIndex]);

  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState(() => {
    const defaultPreset = getDefaultPreset(subject, saIndex);
    const defaultConf = defaultPreset.config || {
      weightText: 3,
      weightSpelling: 1,
      grade1Points: 16,
      grade2Points: 13,
      grade3Points: 10,
      grade4Points: 7,
      spelling1Q: 10,
      spelling2Q: 29,
      spelling3Q: 59,
      spelling4Q: 90,
      spellingFactor: 1000,
    };

    // Check if there is a class-wide default config saved for this Schularbeit
    let loadedDefaultConf = defaultConf;
    try {
      const savedDefaultConf = localStorage.getItem(
        `sa_default_config_${subject}_${semester}_${saIndex}`,
      );
      if (savedDefaultConf) {
        loadedDefaultConf = JSON.parse(savedDefaultConf);
      }
    } catch (e) {
      console.error(e);
    }

    const raw = existingData?.config || loadedDefaultConf;
    return {
      spellingFactor: 1000,
      enableGrammar: false,
      weightArbeit: 1,
      weightGrammar: 1,
      grammar1Points: 18,
      grammar2Points: 15,
      grammar3Points: 11,
      grammar4Points: 7,
      maxGrammarPoints: 20,
      ...raw,
    };
  });

  const [activeAspects, setActiveAspects] = useState<Aspect[]>(() => {
    if (existingData?.aspects) return existingData.aspects;
    let baseAspects: Aspect[];
    try {
      const savedDefaults = localStorage.getItem(
        `sa_default_aspects_${subject}_${semester}_${saIndex}`,
      );
      if (savedDefaults) {
        baseAspects = JSON.parse(savedDefaults);
      } else {
        baseAspects = getDefaultPreset(subject, saIndex).aspects;
      }
    } catch (e) {
      console.error(e);
      baseAspects = getDefaultPreset(subject, saIndex).aspects;
    }
    // Reset points to 0 to prevent carrying over points from default template saves
    return baseAspects.map((aspect) => ({
      ...aspect,
      criteria: aspect.criteria.map((crit) => ({
        ...crit,
        points: 0,
      })),
    }));
  });

  const [isFullscreen, setIsFullscreen] = useState(true);

  // Lock body scroll to prevent page double scrolling behind the modal
  React.useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const [wordCount, setWordCount] = useState<number>(
    existingData?.wordCount || 0,
  );
  const [tendency, setTendency] = useState<string>(
    typeof existingData?.gesamtnote === 'string' ? existingData.gesamtnote.replace(/[0-9]/g, '') : ''
  );
  const [isTendencyManuallySet, setIsTendencyManuallySet] = useState<boolean>(() => {
    return typeof existingData?.gesamtnote === 'string' && existingData.gesamtnote.replace(/[0-9]/g, '').length > 0;
  });
  const [manualGradeOverride, setManualGradeOverride] = useState<string>(
    existingData?.manualGradeOverride || ""
  );

  React.useEffect(() => {
    setIsTendencyManuallySet(
      typeof existingData?.gesamtnote === 'string' && existingData.gesamtnote.replace(/[0-9]/g, '').length > 0
    );
    setManualGradeOverride(existingData?.manualGradeOverride || "");
  }, [studentId, existingData]);

  const [errorCount, setErrorCount] = useState<number>(
    existingData?.errorCount || 0,
  );
  const [grammarAchievedPoints, setGrammarAchievedPoints] = useState<number | string>(
    existingData?.grammarAchievedPoints || 0,
  );
  const [spellingPoints, setSpellingPoints] = useState<number>(
    existingData?.spellingPoints || 0,
  );
  const [manualQuotientOverride, setManualQuotientOverride] = useState<
    number | undefined
  >(existingData?.manualQuotientOverride);
  const [feedback, setFeedback] = useState<string>(
    existingData?.feedback || "",
  );

  // Custom aspects/criteria and templates state
  const [isEditingCriteria, setIsEditingCriteria] = useState(false);
  const [showPresetManager, setShowPresetManager] = useState(false);
  const [showClassStats, setShowClassStats] = useState(false);
  const [showClassTable, setShowClassTable] = useState(false);
  const [isTableFullScreen, setIsTableFullScreen] = useState(false);
  const [newPresetTitle, setNewPresetTitle] = useState("");
  const [customPresets, setCustomPresets] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("hehle_custom_sa_presets");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveCustomPreset = (title: string) => {
    if (!title.trim()) {
      alert("Bitte gib einen Namen für das Raster ein!");
      return;
    }
    // Deep clone activeAspects but reset actual points to 0 so it's a clean template ready for scoring!
    const cleanAspects = activeAspects.map((aspect) => ({
      ...aspect,
      criteria: aspect.criteria.map((crit) => ({
        ...crit,
        points: 0, // Reset awarded points so it's a clean template!
      })),
    }));
    const newPreset = {
      id: "cp_" + Date.now(),
      title: title.trim(),
      aspects: cleanAspects,
      config,
    };
    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    localStorage.setItem("hehle_custom_sa_presets", JSON.stringify(updated));
    setNewPresetTitle("");
    alert(
      `Vorlage "${title}" wurde erfolgreich als eigenes Raster gespeichert! Sie kann nun bei jedem Schüler oder jeder Schularbeit als Basis geladen werden.`,
    );
  };

  const deleteCustomPreset = (id: string, name: string) => {
    if (confirm(`Möchtest du die Vorlage "${name}" wirklich löschen?`)) {
      const updated = customPresets.filter((p) => p.id !== id);
      setCustomPresets(updated);
      localStorage.setItem("hehle_custom_sa_presets", JSON.stringify(updated));
    }
  };

  const saveAsSchularbeitDefault = () => {
    try {
      // Clean points to 0 before saving as default template!
      const cleanAspects = activeAspects.map((aspect) => ({
        ...aspect,
        criteria: aspect.criteria.map((crit) => ({
          ...crit,
          points: 0,
        })),
      }));
      localStorage.setItem(
        `sa_default_aspects_${subject}_${semester}_${saIndex}`,
        JSON.stringify(cleanAspects),
      );
      localStorage.setItem(
        `sa_default_config_${subject}_${semester}_${saIndex}`,
        JSON.stringify(config),
      );
      alert(
        "Dieses Raster & die maximalen Kriterienpunkte wurden erfolgreich als Standard für diese Schularbeit gespeichert! Alle Schüler ohne gespeicherte Noten laden zukünftig automatisch dieses leere Raster zum individuellen Ausfüllen.",
      );
    } catch (e) {
      console.error(e);
      alert("Fehler beim Speichern der Standards.");
    }
  };

  const resetToFactoryDefault = () => {
    if (
      confirm(
        "Möchtest du dieses Raster wirklich auf den ursprünglichen Standard-Entwurf zurücksetzen? Alle individuellen Anpassungen dieses Rasters für diese Schularbeit gehen verloren.",
      )
    ) {
      localStorage.removeItem(
        `sa_default_aspects_${subject}_${semester}_${saIndex}`,
      );
      localStorage.removeItem(
        `sa_default_config_${subject}_${semester}_${saIndex}`,
      );
      setActiveAspects(getDefaultPreset(subject, saIndex).aspects);
      alert("Erfolgreich zurückgesetzt!");
    }
  };

  const applyConfigToAll = () => {
    if (!confirm("Sollen diese Konfiguration, Beurteilungsschwellen (Punkte, Fehlkoeffizienten) und Grammatik-Einstellungen für ALLE Schüler in dieser Schularbeit übernommen werden? (Vorhandene Punkte u. Fehlerquotienten der Schüler bleiben erhalten, aber die daraus resultierenden Note werden neu berechnet!)")) {
      return;
    }
    
    // 1. Zuerst auch als Standard speichern für künftige Schüler
    saveAsSchularbeitDefault();

    // 2. Jetzt für alle bereits existierenden Noten derselben SA anwenden
    const newAssessments = { ...(app.saAssessments || {}) };
    const notenState = { ...(app.noten || {}) };
    let changedCount = 0;

    Object.keys(newAssessments).forEach((sid) => {
      const existing = newAssessments[sid]?.[subject]?.[semester]?.[saIndex];
      // Only modify if an assessment already exists for this student
      if (existing) {
        // Create an optimized lookup for previous points
        const oldPointsMap: Record<string, number> = {};
        existing.aspects?.forEach((asp: any) => {
          asp.criteria?.forEach((crit: any) => {
            oldPointsMap[`${asp.id}_${crit.id}`] = crit.points || 0;
          });
        });

        // Map the current template (activeAspects) with the student's existing points
        const mergedAspects = activeAspects.map((tmplAspect) => ({
          ...tmplAspect,
          criteria: tmplAspect.criteria.map((tmplCrit) => ({
            ...tmplCrit,
            points: oldPointsMap[`${tmplAspect.id}_${tmplCrit.id}`] || 0
          }))
        }));

        // Prepare calculation values for the student using the NEW config
        let totalArbeitsPoints = 0;
        mergedAspects.forEach((aspect: any) => {
          aspect.criteria.forEach((crit: any) => {
            totalArbeitsPoints += crit.points || 0;
          });
        });

        // Compute grades with new config
        let aNote = 5;
        if (totalArbeitsPoints >= config.grade1Points) aNote = 1;
        else if (totalArbeitsPoints >= config.grade2Points) aNote = 2;
        else if (totalArbeitsPoints >= config.grade3Points) aNote = 3;
        else if (totalArbeitsPoints >= config.grade4Points) aNote = 4;

        let sQuotient = existing.spellingPoints; // this holds the actually calculated quotient
        if (existing.manualQuotientOverride !== undefined && existing.manualQuotientOverride !== null) {
          sQuotient = existing.manualQuotientOverride;
        } else if (existing.wordCount > 0) {
          const factor = config.spellingFactor || 1000;
          sQuotient = (existing.errorCount * factor) / existing.wordCount;
        }

        let sNote = 5;
        if (sQuotient <= config.spelling1Q) sNote = 1;
        else if (sQuotient <= config.spelling2Q) sNote = 2;
        else if (sQuotient <= config.spelling3Q) sNote = 3;
        else if (sQuotient <= config.spelling4Q) sNote = 4;

        let arbeitsNote = 0;
        let rechtschreibNote = sNote;
        
        let gNoteInner = 0;
        let grammatikNote = 0;

        const hasGrammar = config.enableGrammar && subject !== "Mathematik" && subject !== "Mathe" && !existing.exemptFromGrammar;

        if (hasGrammar) {
          let parsedGrammarPoints = 0;
          if (typeof existing.grammarAchievedPoints === 'string') {
            parsedGrammarPoints = parseFloat(existing.grammarAchievedPoints.replace(',', '.')) || 0;
          } else if (typeof existing.grammarAchievedPoints === 'number') {
            parsedGrammarPoints = existing.grammarAchievedPoints;
          }

          if (parsedGrammarPoints >= config.grammar1Points) grammatikNote = 1;
          else if (parsedGrammarPoints >= config.grammar2Points) grammatikNote = 2;
          else if (parsedGrammarPoints >= config.grammar3Points) grammatikNote = 3;
          else if (parsedGrammarPoints >= config.grammar4Points) grammatikNote = 4;
          else grammatikNote = 5;
        }

        // To keep logic fully consistent across components:
        // Text-Arbeitsnote combines points (aNote) + spelling (sNote)
        arbeitsNote = Math.round((aNote * 3 + sNote) / 4);

        if (hasGrammar) {
          const wArbeit = config.weightArbeit || 1;
          const wGrammatik = config.weightGrammar || 1;
          const totalWeight = wArbeit + wGrammatik;
          const weightedSum = arbeitsNote * wArbeit + grammatikNote * wGrammatik;
          gNoteInner = Math.round(weightedSum / totalWeight);
        } else {
          gNoteInner = arbeitsNote;
        }

        // Update the assessment
        newAssessments[sid][subject][semester][saIndex] = {
          ...existing,
          aspects: mergedAspects,
          spellingPoints: sQuotient,
          arbeitsNote,
          rechtschreibNote,
          grammatikNote: hasGrammar ? grammatikNote : undefined,
          gesamtnote: gNoteInner,
          config: { ...config }
        };

        // Also update the main gradebook array
        if (!notenState[sid]) notenState[sid] = {};
        if (!notenState[sid][subject]) notenState[sid][subject] = {};
        if (!notenState[sid][subject][semester]) notenState[sid][subject][semester] = { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] };
        
        const saArray = [...(notenState[sid][subject][semester].sa || [])];
        saArray[saIndex] = gNoteInner;
        notenState[sid][subject][semester].sa = saArray;

        changedCount++;
      }
    });

    if (changedCount > 0) {
      setApp({ ...app, saAssessments: newAssessments, noten: notenState });
      alert(`Die Konfiguration wurde erfolgreich auf alle ${changedCount} bisher angelegten Schularbeiten dieser Klasse übertragen.`);
    } else {
      alert(`Die Konfiguration wurde als Standard gesichert. Es wurden keine bestehenden Daten gefunden, die aktualisiert werden mussten.`);
    }
  };

  const generatePedagogicalFeedback = () => {
    const student = app.schueler?.find((s) => s.id === studentId);
    const firstName = student ? student.vorname : studentName;
    const traits = student?.charakter || [];

    let intro = "";
    if (traits.includes("kreativ")) {
      intro = `Liebe/r ${firstName}, deine kreative Vorstellungskraft glänzt in dieser Schularbeit förmlich auf! `;
    } else if (traits.includes("lebhaft")) {
      intro = `Liebe/r ${firstName}, mit deiner lebendigen und dynamischen Art hast du eine wirklich schwungvolle Geschichte verfasst. `;
    } else if (
      traits.includes("konzentriert") ||
      traits.includes("aufmerksam")
    ) {
      intro = `Liebe/r ${firstName}, deine konzentrierte Arbeitsweise spiegelt sich wunderbar in der Struktur deines Textes wider. `;
    } else if (traits.includes("ruhig") || traits.includes("interessiert")) {
      intro = `Liebe/r ${firstName}, deine besonnene und interessierte Herangehensweise ist beim Lesen der Zeilen deutlich spürbar. `;
    } else {
      intro = `Liebe/r ${firstName}, du hast dir bei dieser Schularbeit viel Mühe gegeben! `;
    }

    let textFeeback = "";
    if (arbeitsNote === 1) {
      textFeeback =
        "Inhaltlich und sprachlich ist dir ein meisterhafter Bogen gelungen. Deine Satzstrukturen sind abwechslungsreich und der rote Faden zieht sich schlüssig durch.";
    } else if (arbeitsNote === 2) {
      textFeeback =
        "Du hast die Geschichte gut aufgebaut, einen passenden Wortschatz gewählt und dich sehr präzise ausgedrückt. Ein paar kleine Formulierungen könnten noch runder sein.";
    } else if (arbeitsNote === 3) {
      textFeeback =
        "Die grundlegenden Elemente deiner Erzählung sind vorhanden und gut verständlich. Achte nächstes Mal noch bewusster auf die abwechslungsreiche Satzgestaltung und die Zeitenfolge.";
    } else if (arbeitsNote === 4) {
      textFeeback =
        "Deine Erzählung ist im Kern verständlich und du hast das Thema umgesetzt. Es wäre jedoch hilfreich, den Wortschatz weiter auszubauen und Erzählschritte genauer auszuführen.";
    } else {
      textFeeback =
        "Um deinen Schreibstil und den Textaufbau zu festigen, werden wir in den nächsten Wochen gemeinsam noch ein paar gezielte Schreib- und Strukturierungsübungen machen.";
    }

    let spellingFeedback = "";
    if (rechtschreibNote === 1) {
      spellingFeedback =
        "Besonders erfreulich ist deine hervorragende Rechtschreibung. Deine Fokussierung beim Schreiben zahlt sich voll aus!";
    } else if (rechtschreibNote === 2) {
      spellingFeedback =
        "Auch deine Rechtschreibkompetenz ist gut ausgeprägt, nur wenige Flüchtigkeitsfehler haben sich eingeschlichen.";
    } else if (rechtschreibNote === 3) {
      spellingFeedback =
        "Rechtschreiblich gibt es noch ein paar Unsicherheiten, z.B. bei der Wortschreibung oder den Satzanfängen, die wir gemeinsam festigen können.";
    } else if (rechtschreibNote === 4) {
      spellingFeedback =
        "Bezüglich der Rechtschreibung ist es ratsam, künftig noch sorgfältiger Korrektur zu lesen und bekannte Regeln (wie Groß- und Kleinschreibung) intensiv anzuwenden.";
    } else {
      spellingFeedback =
        "In der Rechtschreibung zeigen sich größere Lücken. Mit gezieltem Wörter-Training und Silbenlesen werden wir hier Schritt für Schritt Sicherheit gewinnen.";
    }

    let closing = "";
    if (gesamtnote <= 2) {
      closing =
        " Mach weiter so, ich bin sehr stolz auf deine hervorragende Leistung!";
    } else if (gesamtnote === 3) {
      closing =
        " Ein schöner Erfolg! Mit etwas mehr Schreibübung kletterst du bald noch weiter nach oben.";
    } else if (gesamtnote === 4) {
      closing =
        " Ein solider Schritt nach vorn! Lass den Kopf nicht hängen – wir üben weiter und das nächste Mal klappt es noch besser.";
    } else {
      closing =
        " Lass uns diesen Bogen als Motivation nehmen. Ich unterstütze dich voll und ganz dabei, beim nächsten Mal wieder durchzustarten!";
    }

    return `${intro}${textFeeback} ${spellingFeedback}${closing}`;
  };

  const pointsToGrade = (points: number) => {
    if (points >= config.grade1Points) return 1;
    if (points >= config.grade2Points) return 2;
    if (points >= config.grade3Points) return 3;
    if (points >= config.grade4Points) return 4;
    return 5;
  };

  const quotientToSpellingGrade = (q: number) => {
    if (q <= config.spelling1Q) return 1;
    if (q <= config.spelling2Q) return 2;
    if (q <= config.spelling3Q) return 3;
    if (q <= config.spelling4Q) return 4;
    return 5;
  };

  const totalArbeitsPoints = useMemo(() => {
    return activeAspects.reduce((acc, aspect) => {
      return acc + aspect.criteria.reduce((a, c) => a + c.points, 0);
    }, 0);
  }, [activeAspects]);

  const maxPossibleArbeitsPoints = useMemo(() => {
    return activeAspects.reduce((acc, aspect) => {
      return acc + aspect.criteria.reduce((a, c) => a + c.maxPoints, 0);
    }, 0);
  }, [activeAspects]);

  const arbeitsNote = useMemo(
    () => pointsToGrade(totalArbeitsPoints),
    [totalArbeitsPoints],
  );

  const currentSpellingQuotient = useMemo(() => {
    if (manualQuotientOverride !== undefined && manualQuotientOverride !== null)
      return manualQuotientOverride;
    if (wordCount > 0) {
      const factor = config.spellingFactor || 1000;
      return (errorCount * factor) / wordCount;
    }
    return spellingPoints; // fallback to manual quotient/points
  }, [
    wordCount,
    errorCount,
    spellingPoints,
    manualQuotientOverride,
    config.spellingFactor,
  ]);

  const rechtschreibNote = useMemo(
    () => quotientToSpellingGrade(currentSpellingQuotient),
    [currentSpellingQuotient],
  );

  const grammatikNote = useMemo(() => {
    if (!config.enableGrammar) return 0;
    
    let parsedPoints = 0;
    if (typeof grammarAchievedPoints === 'string') {
      parsedPoints = parseFloat(grammarAchievedPoints.replace(',', '.')) || 0;
    } else if (typeof grammarAchievedPoints === 'number') {
      parsedPoints = grammarAchievedPoints;
    }

    if (parsedPoints >= config.grammar1Points) return 1;
    if (parsedPoints >= config.grammar2Points) return 2;
    if (parsedPoints >= config.grammar3Points) return 3;
    if (parsedPoints >= config.grammar4Points) return 4;
    return 5;
  }, [grammarAchievedPoints, config]);

  const showGrammar = config.enableGrammar && subject !== "Mathematik" && subject !== "Mathe";

  const exactGradeValue = useMemo(() => {
    let totalWeight = config.weightText;
    let weightedSum = arbeitsNote * config.weightText;
    
    if (config.enableSpelling !== false) {
      totalWeight += config.weightSpelling || 0;
      weightedSum += rechtschreibNote * (config.weightSpelling || 0);
    }
    if (showGrammar) {
      totalWeight += config.weightGrammar || 1;
      weightedSum += grammatikNote * (config.weightGrammar || 1);
    }
    return totalWeight > 0 ? weightedSum / totalWeight : arbeitsNote;
  }, [arbeitsNote, rechtschreibNote, grammatikNote, config, showGrammar]);

  const exactGrade = useMemo(() => {
    return exactGradeValue.toFixed(2).replace(".", ",");
  }, [exactGradeValue]);

  const parsedManualGrade = useMemo(() => {
    if (!manualGradeOverride || manualGradeOverride === "auto") {
      return null;
    }
    const match = manualGradeOverride.match(/^([1-5])([+-])?$/);
    if (match) {
      const grade = parseInt(match[1]);
      const tend = match[2] || "";
      return { grade, tend };
    }
    return null;
  }, [manualGradeOverride]);

  const gesamtnote = useMemo(() => {
    if (parsedManualGrade) {
      return parsedManualGrade.grade;
    }
    if (subject === "Deutsch") {
      const val = exactGradeValue;
      const G = Math.floor(val);
      const roundedFrac = Math.round((val - G) * 100) / 100;

      // 1. .3 or .4 -> base grade G
      if (roundedFrac >= 0.25 && roundedFrac <= 0.49) {
        return G;
      }
      // 2. .5 -> decision: G- (or G) vs (G+1)+ (or G+1)
      if (Math.abs(roundedFrac - 0.5) < 0.01) {
        if (tendency === "-") return G;
        if (tendency === "+") return G + 1;
        return Math.round(val);
      }
      // 3. .6 or .7 -> base grade G + 1
      if (roundedFrac >= 0.51 && roundedFrac <= 0.75) {
        return G + 1;
      }
      // traditional
      return Math.round(val);
    }
    return Math.round(exactGradeValue);
  }, [exactGradeValue, subject, tendency, parsedManualGrade]);

  // Automated tendency according to user requirements
  React.useEffect(() => {
    if (isTendencyManuallySet) return;
    if (manualGradeOverride && manualGradeOverride !== "auto") return;

    if (subject === "Deutsch") {
      const val = exactGradeValue;
      const G = Math.floor(val);
      const roundedFrac = Math.round((val - G) * 100) / 100;

      let detectedTendency = "";

      if (roundedFrac >= 0.25 && roundedFrac <= 0.49) {
        detectedTendency = "-";
      } else if (Math.abs(roundedFrac - 0.5) < 0.01) {
        detectedTendency = "-"; // Default to 3- for 3.5, teacher can change to 4+
      } else if (roundedFrac >= 0.51 && roundedFrac <= 0.75) {
        detectedTendency = "-";
      }

      setTendency(detectedTendency);
    } else if (subject === "Mathe" || subject === "Mathematik") {
      const p = totalArbeitsPoints;
      const limits = [
        { grade: 1, limit: config.grade1Points },
        { grade: 2, limit: config.grade2Points },
        { grade: 3, limit: config.grade3Points },
        { grade: 4, limit: config.grade4Points },
      ];

      let detectedTendency = "";
      
      // Look for plus tendency (exactly 1 point below next limit)
      for (let i = 0; i < limits.length; i++) {
        const lim = limits[i];
        if (typeof lim.limit === "number" && Math.abs(p - (lim.limit - 1)) <= 0.1) {
          detectedTendency = "+";
          break;
        }
      }

      // Look for minus tendency (exactly on the limit or 1 point above)
      if (!detectedTendency) {
        for (let i = 0; i < limits.length; i++) {
          const lim = limits[i];
          if (typeof lim.limit === "number" && (Math.abs(p - lim.limit) <= 0.1 || Math.abs(p - (lim.limit + 1)) <= 0.1)) {
            detectedTendency = "-";
            break;
          }
        }
      }

      setTendency(detectedTendency);
    }
  }, [exactGradeValue, totalArbeitsPoints, subject, config.grade1Points, config.grade2Points, config.grade3Points, config.grade4Points, isTendencyManuallySet]);

  const handleSave = () => {
    setApp((prev) => {
      const assessments = { ...(prev.saAssessments || {}) };
      const sData = { ...(assessments[studentId] || {}) };
      const fData = { ...(sData[subject] || {}) };
      const semData = { ...(fData[semester] || {}) };
      const saList = { ...(semData || []) };

      const assessmentData = {
        aspects: activeAspects,
        spellingPoints: currentSpellingQuotient,
        manualQuotientOverride,
        wordCount,
        errorCount,
        grammarAchievedPoints: typeof grammarAchievedPoints === 'string' 
          ? parseFloat(grammarAchievedPoints.replace(',', '.')) || 0 
          : grammarAchievedPoints,
        arbeitsNote,
        rechtschreibNote,
        grammatikNote,
        gesamtnote,
        timestamp: Date.now(),
        config,
        feedback,
        manualGradeOverride,
      };

      // Also update the main gradebook entry
      const sidData = { ...(prev.noten[studentId] || {}) };
      const fachData = { ...(sidData[subject] || {}) };
      const mainSemData = {
        ...(fachData[semester] || {
          sa: [],
          lzk: [],
          wp: [],
          aufgaben: [],
          hue: 0,
          hueAnm: [],
        }),
      };
      const saArray = [...(mainSemData.sa || [])];
      saArray[saIndex] = tendency ? `${gesamtnote}${tendency}` : gesamtnote;

      return {
        ...prev,
        saAssessments: {
          ...assessments,
          [studentId]: {
            ...sData,
            [subject]: {
              ...fData,
              [semester]: {
                ...semData,
                [saIndex]: { ...assessmentData, gesamtnote: tendency ? `${gesamtnote}${tendency}` : gesamtnote, manualGradeOverride },
              },
            },
          },
        },
        noten: {
          ...prev.noten,
          [studentId]: {
            ...sidData,
            [subject]: {
              ...fachData,
              [semester]: {
                ...mainSemData,
                sa: saArray,
              },
            },
          },
        },
      };
    });

    logActivity(
      setApp,
      `Beurteilung für ${studentName} (${subject}, SA ${saIndex + 1}) gespeichert`,
      "note",
      studentId,
    );
    onClose();
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-all ${
        isFullscreen ? "p-0" : "p-2 md:p-4"
      }`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`bg-zinc-50 border border-white/20  flex flex-col transition-all duration-300 ${
          isFullscreen
            ? "w-screen h-screen max-w-none max-h-none rounded-none border-none"
            : "w-full h-full max-w-[98vw] max-h-[96vh] xl:max-w-[95vw] xl:max-h-[92vh] rounded-[1.5rem] shadow-2xl"
        }`}
      >
        {/* Header - Highly compact padding in fullscreen */}
        <div
          className={`bg-white border-b border-zinc-100 flex justify-between items-center shrink-0 transition-all ${
            isFullscreen ? "px-4 py-2" : "px-6 py-4"
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[0.5625rem] font-black uppercase text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-full tracking-wider leading-none">
                Beurteilungsbogen
              </span>
              <span className="text-[0.5625rem] font-extrabold uppercase text-zinc-400 tracking-wider">
                {subject} • {saIndex + 1}. Schularbeit
              </span>
            </div>
            <h2
              className={`font-black text-zinc-900 tracking-tight transition-all leading-tight ${
                isFullscreen ? "text-[1.125rem] leading-normal" : "text-[1.5rem] leading-normal"
              }`}
            >
              {studentName}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-zinc-50 px-3.5 py-1.5 rounded-[0.75rem] border border-zinc-200/50 shadow-inner">
              <div className="text-center border-r border-zinc-200 pr-3.5">
                <div className="text-[0.5rem] font-black uppercase text-zinc-400 tracking-wider leading-none">
                  Arbeit
                </div>
                <div className="text-[1rem] leading-normal font-black text-indigo-650 leading-none mt-0.5">
                  {arbeitsNote}
                </div>
              </div>
              <div className="text-center border-r border-zinc-200 pr-3.5 pl-0.5">
                <div className="text-[0.5rem] font-black uppercase text-zinc-400 tracking-wider leading-none">
                  RS
                </div>
                <div className="text-[1rem] leading-normal font-black text-rose-500 leading-none mt-0.5">
                  {rechtschreibNote}
                </div>
              </div>
              <div className="text-center pl-0.5 flex items-center gap-2 relative">
                <div>
                  <div className="text-[0.5rem] font-black uppercase text-emerald-600 tracking-wider leading-none">
                    Note
                  </div>
                  <div className="text-[1.25rem] leading-normal font-black text-emerald-600 leading-none mt-0.5 flex items-start gap-0.5">
                    {gesamtnote}
                    {tendency && <span className="text-[0.875rem] inline-block -mt-1">{tendency}</span>}
                  </div>
                </div>
                <div
                  className="text-[0.5625rem] font-black text-zinc-400 bg-zinc-200/60 px-1 py-0.5 rounded leading-none"
                  title={`Exakter Wert: ${exactGrade}`}
                >
                  Ø {exactGrade}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 rounded-xl transition-all flex items-center gap-1 text-[0.625rem] font-black uppercase tracking-wider"
              title={
                isFullscreen
                  ? "Fenster-Modus verlassen"
                  : "In Vollbild-Modus wechseln"
              }
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              <span className="hidden sm:inline text-[0.53125rem] font-black tracking-widest">
                {isFullscreen ? "Fenster" : "Vollbild"}
              </span>
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-650 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className={`flex-1 overflow-y-auto lg: space-y-4 custom-scrollbar flex flex-col min-h-0 transition-all ${
            isFullscreen ? "p-3 md:p-4" : "p-6 md:p-8"
          }`}
        >
          {/* Preset Selector */}
          <div className="flex flex-wrap gap-1.5 pb-2.5 border-b border-zinc-200/60 items-center">
            <span className="text-[0.59375rem] font-black uppercase text-zinc-400 mr-0.5 select-none">
              Standards:
            </span>
            {Object.entries(PRESETS)
              .filter(([key]) => {
                const isMath = subject === 'Mathematik' || subject === 'Mathe';
                if (isMath) return key.startsWith('mathe_');
                return !key.startsWith('mathe_');
              })
              .map(([key, preset]) => (
              <button
                key={key}
                onClick={() => {
                  const isMath = subject === 'Mathematik' || subject === 'Mathe';
                  if (isMath) {
                      setActiveAspects(prev => {
                        const newAspects = JSON.parse(JSON.stringify(preset.aspects)).map((a: any, i: number) => ({
                          ...a,
                          id: a.id + '_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
                          title: (prev.length + i + 1) + '. ' + a.title.replace(/^\d+\.\s*/, '')
                        }));
                        return [...prev, ...newAspects];
                      });
                  } else {
                      setActiveAspects(JSON.parse(JSON.stringify(preset.aspects)));
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider transition-all ${
                  PRESETS[key as keyof typeof PRESETS].title ===
                  activeAspects[0]?.title // simplification
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "bg-white text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 border border-zinc-200/60 shadow-xs"
                }`}
              >
                {preset.title}
              </button>
            ))}

            {(subject === 'Mathematik' || subject === 'Mathe') && activeAspects.length > 0 && (
                <button
                  onClick={() => setActiveAspects([])}
                  className="ml-auto px-2.5 py-1 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider transition-all bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600 border border-rose-200/60 shadow-xs"
                  title="Alle Kriterien entfernen"
                >
                  X Leeren
                </button>
            )}

            {customPresets.length > 0 && (
              <>
                <div className="h-3 w-[1px] bg-zinc-300 mx-1 self-center hidden sm:block" />
                <span className="text-[0.59375rem] font-black uppercase text-emerald-600 mr-0.5 select-none">
                  Eigene:
                </span>
                {customPresets.map((ps) => {
                  const isCurrentlyActive =
                    activeAspects.length === ps.aspects.length &&
                    activeAspects.every(
                      (a, i) =>
                        a.title === ps.aspects[i]?.title &&
                        a.criteria.length === ps.aspects[i]?.criteria.length,
                    );
                  return (
                    <button
                      key={ps.id}
                      onClick={() => {
                        if (
                          confirm(
                            `Möchtest du das Beurteilungsraster "${ps.title}" jetzt laden? Bestehende Änderungen für diese Bewertung werden überschrieben.`,
                          )
                        ) {
                          const loadedAspects = JSON.parse(
                            JSON.stringify(ps.aspects),
                          );
                          const cleanLoadedAspects = loadedAspects.map(
                            (aspect: any) => ({
                              ...aspect,
                              criteria: aspect.criteria.map((crit: any) => ({
                                ...crit,
                                points: 0,
                              })),
                            }),
                          );
                          setActiveAspects(cleanLoadedAspects);
                          if (ps.config) {
                            setConfig((prev) => ({ ...prev, ...ps.config }));
                          }
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider flex items-center gap-1 transition-all border ${
                        isCurrentlyActive
                          ? "bg-emerald-605 text-white border-emerald-700 shadow-sm"
                          : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200/60 shadow-xs animate-fade-in"
                      }`}
                      title={`Klicke, um deine Vorlage "${ps.title}" zu laden`}
                    >
                      <Sparkles
                        size={10}
                        className={
                          isCurrentlyActive
                            ? "text-amber-200"
                            : "text-emerald-500"
                        }
                      />{" "}
                      {ps.title}
                    </button>
                  );
                })}
              </>
            )}

            <button
              onClick={() => {
                setShowPresetManager(!showPresetManager);
                setIsEditingCriteria(false);
                setShowClassStats(false);
                setShowClassTable(false);
                setShowConfig(false);
              }}
              className={`px-2.5 py-1 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider flex items-center gap-1 ml-auto transition-all shadow-xs ${
                showPresetManager
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 hover:bg-emerald-105 border border-emerald-100 text-emerald-700"
              }`}
            >
              <FileText size={10} /> Vorlagen{" "}
              {customPresets.length > 0 && `(${customPresets.length})`}
            </button>

            <button
              onClick={() => {
                setShowClassTable(!showClassTable);
                setShowClassStats(false);
                setShowPresetManager(false);
                setIsEditingCriteria(false);
                setShowConfig(false);
              }}
              className={`px-2.5 py-1 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-xs border ${
                showClassTable
                  ? "bg-indigo-600 text-white border-indigo-700 shadow-sm scale-[1.02]"
                  : "bg-white text-indigo-750 border-indigo-200/60 hover:bg-indigo-50/50"
              }`}
              title="Öffne eine tabellarische Matrix, um Punkte aller Schüler gleichzeitig einzutragen"
            >
              <Table size={11} /> Tabelle 📑
            </button>

            <button
              onClick={() => {
                setShowClassStats(!showClassStats);
                setShowPresetManager(false);
                setIsEditingCriteria(false);
                setShowClassTable(false);
                setShowConfig(false);
              }}
              className={`px-2.5 py-1 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-xs border ${
                showClassStats
                  ? "bg-indigo-600 text-white border-indigo-700"
                  : "bg-white text-indigo-705 border-indigo-200/60 hover:bg-indigo-50/50"
              }`}
              title="Zeigt die Noten- und Kriterienpunkte-Statistik aller Schüler für diese Schularbeit an"
            >
              <BarChart2 size={11} /> Statistik 📊
            </button>

            <button
              onClick={() => {
                setIsEditingCriteria(!isEditingCriteria);
                setShowPresetManager(false);
                setShowClassStats(false);
                setShowClassTable(false);
                setShowConfig(false);
              }}
              className={`px-2.5 py-1 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-xs border ${
                isEditingCriteria
                  ? "bg-amber-500 text-white border-amber-600 shadow-sm scale-[1.02]"
                  : "bg-white text-amber-600 border-amber-200/80 hover:bg-amber-50"
              }`}
              title="Aktiviert den Bearbeitungsmodus für Kriterien, Bezeichnungen und Punkte"
            >
              <Settings2 size={11} />{" "}
              {isEditingCriteria ? "Fertig ✓" : "Kürzel 📋"}
            </button>

            <button
              onClick={() => {
                setShowConfig(!showConfig);
                setIsEditingCriteria(false);
                setShowPresetManager(false);
                setShowClassStats(false);
                setShowClassTable(false);
              }}
              className={`px-2.5 py-1 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-xs border ${
                showConfig
                  ? "bg-rose-500 text-white border-rose-600 shadow-sm scale-[1.02]"
                  : "bg-white text-rose-600 border-rose-200/80 hover:bg-rose-50"
              }`}
              title="Öffne die Einstellungsseite für Notenschlüssel und Gewichtungen"
            >
              <Settings2 size={11} /> Konfiguration ⚙️
            </button>
          </div>

          <AnimatePresence>
            {showClassTable && (
              <div className={`fixed inset-0 z-[30000] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-all duration-300 ${isTableFullScreen ? 'p-0' : 'p-4 sm:p-6 lg:p-8'}`}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className={`w-full h-full flex flex-col bg-white shadow-2xl relative transition-all duration-300 ${isTableFullScreen ? 'max-w-none rounded-none' : 'max-w-7xl rounded-[2rem]'}`}
                >
                  <div className={`absolute z-[60] ${isTableFullScreen ? 'top-6 right-6' : 'top-4 right-4 sm:right-6'}`}>
                    <button
                      onClick={() => setShowClassTable(false)}
                      className="bg-white/80 hover:bg-zinc-100 border border-zinc-200 text-zinc-600 rounded-full p-2.5 sm:px-4 shadow-sm flex items-center gap-2 transition-all"
                    >
                      <X size={16} />{" "}
                      <span className="hidden sm:inline text-[0.625rem] uppercase font-black tracking-widest leading-none">
                        Schließen
                      </span>
                    </button>
                  </div>
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <SchularbeitClassTable
                      subject={subject}
                      semester={semester}
                      saIndex={saIndex}
                      schueler={app.schueler || []}
                      currentTemplate={activeAspects}
                      config={config}
                      onClose={() => setShowClassTable(false)}
                      isFullScreen={isTableFullScreen}
                      onToggleFullScreen={() => setIsTableFullScreen(!isTableFullScreen)}
                    />
                  </div>
                </motion.div>
              </div>
            )}

            {showClassStats && (
              <div className="fixed inset-0 z-[30000] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 lg:p-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="w-full max-w-7xl h-full flex flex-col bg-white rounded-[2rem] shadow-2xl relative "
                >
                  <div className="absolute top-4 right-4 sm:right-6 z-[60]">
                    <button
                      onClick={() => setShowClassStats(false)}
                      className="bg-white/80 hover:bg-zinc-100 border border-zinc-200 text-zinc-600 rounded-full p-2.5 sm:px-4 shadow-sm flex items-center gap-2 transition-all"
                    >
                      <X size={16} />{" "}
                      <span className="hidden sm:inline text-[0.625rem] uppercase font-black tracking-widest leading-none">
                        Schließen
                      </span>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto w-full custom-scrollbar bg-slate-50">
                    <div className="p-4 sm:p-8 md:p-12">
                      <SchularbeitClassStats
                        subject={subject}
                        semester={semester}
                        saIndex={saIndex}
                        schueler={app.schueler || []}
                        saAssessments={app.saAssessments || {}}
                      />
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {showPresetManager && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className=" bg-white rounded-3xl border border-emerald-100 shadow-xl shadow-emerald-950/5 p-6 space-y-5"
              >
                <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                  <h3 className="text-[0.875rem] leading-snug font-black text-emerald-800 flex items-center gap-2">
                    <Sparkles size={16} className="text-emerald-500" /> Eigene
                    Beurteilungsraster-Vorlagen (Templates)
                  </h3>
                  <button
                    onClick={() => setShowPresetManager(false)}
                    className="text-[0.75rem] leading-tight font-bold text-zinc-400 hover:text-zinc-600"
                  >
                    Schließen ×
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Save current grid as template */}
                  <div className="bg-emerald-50/40 border border-emerald-100/80 p-5 rounded-2xl space-y-3.5">
                    <h4 className="text-[0.75rem] leading-tight font-black uppercase tracking-wider text-emerald-800">
                      Aktuelles Raster als Vorlage speichern
                    </h4>
                    <p className="text-[0.6875rem] font-medium text-zinc-500 leading-relaxed">
                      Speichere das momentan angezeigte Beurteilungsraster
                      (inkl. aller customizierten Kriterien, Punktegrenzen und
                      Gewichtungen), um es für andere Schüler laden zu können.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPresetTitle}
                        onChange={(e) => setNewPresetTitle(e.target.value)}
                        placeholder="z.B. Deutsch - Erlebniserzählung 4B"
                        className="flex-1 bg-white border border-emerald-100 rounded-xl px-3.5 py-2 text-[0.75rem] leading-tight font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
                      />
                      <button
                        onClick={() => saveCustomPreset(newPresetTitle)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-wider transition-colors shrink-0 shadow-sm"
                      >
                        Speichern
                      </button>
                    </div>
                  </div>

                  {/* Load/Delete templates */}
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    <h4 className="text-[0.75rem] leading-tight font-black uppercase tracking-wider text-zinc-700">
                      Deine gespeicherten Vorlagen ({customPresets.length})
                    </h4>
                    {customPresets.length === 0 ? (
                      <div className="text-center py-6 text-[0.75rem] leading-tight text-zinc-400 font-bold border border-dashed border-zinc-150 rounded-2xl bg-zinc-50/50">
                        Keine eigenen Raster-Vorlagen vorhanden.
                        <br />
                        Passe das Raster an und speichere es links ab!
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {customPresets.map((ps) => (
                          <div
                            key={ps.id}
                            className="bg-white border border-zinc-200/60 p-3 rounded-xl flex items-center justify-between gap-3 shadow-sm hover:border-emerald-300 transition-all"
                          >
                            <div>
                              <div className="text-[0.75rem] leading-tight font-black text-zinc-800">
                                {ps.title}
                              </div>
                              <div className="text-[0.625rem] font-bold text-zinc-400 mt-0.5">
                                {ps.aspects?.length || 0} Kategorien •{" "}
                                {ps.aspects?.reduce(
                                  (a: number, c: any) =>
                                    a + (c.criteria?.length || 0),
                                  0,
                                ) || 0}{" "}
                                Kriterien • Max.{" "}
                                {ps.aspects?.reduce(
                                  (a: number, c: any) =>
                                    a +
                                    (c.criteria?.reduce(
                                      (b: number, r: any) => b + r.maxPoints,
                                      0,
                                    ) || 0),
                                  0,
                                ) || 0}{" "}
                                Pkt
                              </div>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Möchtest du das Beurteilungsraster "${ps.title}" jetzt laden? Bestehende Änderungen für diese Bewertung werden überschrieben.`,
                                    )
                                  ) {
                                    // Deep clone to safely import custom criteria configurations
                                    const loadedAspects = JSON.parse(
                                      JSON.stringify(ps.aspects),
                                    );
                                    const cleanLoadedAspects =
                                      loadedAspects.map((aspect: any) => ({
                                        ...aspect,
                                        criteria: aspect.criteria.map(
                                          (crit: any) => ({
                                            ...crit,
                                            points: 0, // Keep awarded points at 0 for a fresh evaluation
                                          }),
                                        ),
                                      }));
                                    setActiveAspects(cleanLoadedAspects);
                                    if (ps.config) {
                                      setConfig((prev) => ({
                                        ...prev,
                                        ...ps.config,
                                      }));
                                    }
                                    setShowPresetManager(false);
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[0.625rem] font-black uppercase tracking-wider transition-all"
                              >
                                Laden
                              </button>
                              <button
                                onClick={() =>
                                  deleteCustomPreset(ps.id, ps.title)
                                }
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all"
                                title="Löschen"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isEditingCriteria && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50/70 border border-amber-200 rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
            >
              <div className="space-y-1">
                <div className="text-[0.75rem] leading-tight font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                  🛠️ Bearbeitungsmodus für Beurteilungsbogen aktiv
                </div>
                <p className="text-[0.6875rem] font-bold text-zinc-650 leading-relaxed max-w-2xl">
                  Du kannst alle Kriterienbeschreibungen direkt bearbeiten, neue
                  Kriterien hinzufügen oder die Punkte anpassen. Gefällt dir die
                  Punkte-Einteilung? Klicke rechts auf "Als Standard für diese
                  SA sichern", damit diese Kriterien & maximale Gesamtpunkte
                  automatisch für alle restlichen Schüler geladen werden!
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  onClick={saveAsSchularbeitDefault}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-indigo-600/15 transition-all active:scale-[0.98]"
                  title="Speichert dieses Raster als Standard für alle Schüler dieser Schularbeit (Klasse, Gegenstand, Semester)"
                >
                  <Save size={13} /> Als Standard für diese SA sichern
                </button>
                <button
                  type="button"
                  onClick={resetToFactoryDefault}
                  className="px-3 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-[0.98]"
                  title="Setzt das Raster für diese Schularbeit auf das Standard-Layout zurück"
                >
                  <RotateCcw size={13} /> Standard zurücksetzen
                </button>
              </div>
            </motion.div>
          )}

          <div
            className={`grid grid-cols-1 ${isFullscreen ? "xl:grid-cols-4 lg:grid-cols-3" : "lg:grid-cols-3"} gap-4 lg:gap-5 lg:flex-1 lg:min-h-0 lg:`}
          >
            {/* Main Criteria Columns */}
            <div
              className={`space-y-4 lg:h-full lg:overflow-y-auto lg:pr-2 custom-scrollbar min-h-0 ${isFullscreen ? "xl:col-span-3 lg:col-span-2" : "lg:col-span-2"}`}
            >
              {activeAspects.map((aspect, aspectIdx) => (
                <div
                  key={aspect.id}
                  className="space-y-3 bg-zinc-100/60 p-4 rounded-[1.25rem] border border-zinc-200/50"
                >
                  <div className="flex justify-between items-center pb-0.5">
                    {isEditingCriteria ? (
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          type="text"
                          value={aspect.title}
                          onChange={(e) => {
                            const next = [...activeAspects];
                            next[aspectIdx].title = e.target.value;
                            setActiveAspects(next);
                          }}
                          className="bg-white border border-indigo-200 rounded-xl px-3 py-1.5 font-black text-indigo-955 text-[0.75rem] leading-tight tracking-wider uppercase flex-1 outline-none focus:ring-2 focus:ring-indigo-500/20"
                          placeholder="z.B. 1. Ausdruck"
                        />
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Möchtest du die Kategorie "${aspect.title}" samt aller Kriterien löschen?`,
                              )
                            ) {
                              setActiveAspects(
                                activeAspects.filter(
                                  (_, idx) => idx !== aspectIdx,
                                ),
                              );
                            }
                          }}
                          className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all"
                          title="Kategorie löschen"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <h3 className="text-[0.65625rem] font-black uppercase tracking-[0.18em] text-indigo-900 border-l-4 border-indigo-400 pl-2.5 leading-none py-0.5">
                        {aspect.title}
                      </h3>
                    )}
                  </div>

                  {/* Criteria Wrapper - Grouped Divide Layout for Standard View! */}
                  {isEditingCriteria ? (
                    <div className="grid gap-3">
                      {aspect.criteria.map((criterion, critIdx) => (
                        <div
                          key={criterion.id}
                          className="bg-white border border-zinc-200/60 p-4 rounded-xl shadow-xs"
                        >
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[0.5625rem] font-black text-zinc-400 uppercase tracking-wider block mb-0.5">
                                  Kriterium Bezeichnung
                                </label>
                                <input
                                  type="text"
                                  value={criterion.label}
                                  onChange={(e) => {
                                    const next = [...activeAspects];
                                    next[aspectIdx].criteria[critIdx].label =
                                      e.target.value;
                                    setActiveAspects(next);
                                  }}
                                  className="w-full bg-zinc-50 border border-zinc-200/60 rounded-xl px-3 py-1.5 text-[0.75rem] leading-tight font-bold text-zinc-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
                                  placeholder="z.B. Treffende Ausdrücke"
                                />
                              </div>
                              <div>
                                <label className="text-[0.5625rem] font-black text-zinc-400 uppercase tracking-wider block mb-0.5">
                                  Max. Punkte (Arbeit)
                                </label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="0.5"
                                    max="50"
                                    step="0.5"
                                    value={criterion.maxPoints}
                                    onChange={(e) => {
                                      const val =
                                        parseFloat(e.target.value) || 1;
                                      const next = [...activeAspects];
                                      next[aspectIdx].criteria[
                                        critIdx
                                      ].maxPoints = val;
                                      if (
                                        next[aspectIdx].criteria[critIdx]
                                          .points > val
                                      ) {
                                        next[aspectIdx].criteria[
                                          critIdx
                                        ].points = val;
                                      }
                                      setActiveAspects(next);
                                    }}
                                    className="w-24 bg-zinc-50 border border-zinc-200/60 rounded-xl px-3 py-1.5 text-[0.75rem] leading-tight font-black text-zinc-800 text-center outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
                                  />
                                  <button
                                    onClick={() => {
                                      const next = [...activeAspects];
                                      next[aspectIdx].criteria = next[
                                        aspectIdx
                                      ].criteria.filter(
                                        (_, idx) => idx !== critIdx,
                                      );
                                      setActiveAspects(next);
                                    }}
                                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all ml-auto"
                                    title="Kriterium löschen"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div>
                              <label className="text-[0.5625rem] font-black text-zinc-400 uppercase tracking-wider block mb-0.5">
                                Beschreibung / Abzugs-Hinweise
                              </label>
                              <input
                                type="text"
                                value={criterion.description}
                                onChange={(e) => {
                                  const next = [...activeAspects];
                                  next[aspectIdx].criteria[
                                    critIdx
                                  ].description = e.target.value;
                                  setActiveAspects(next);
                                }}
                                className="w-full bg-zinc-50 border border-zinc-200/60 rounded-xl px-3 py-1.5 text-[0.75rem] leading-tight font-semibold text-zinc-650 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
                                placeholder="Abzugstexte wie: jeder Fehler minus 0,5..."
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      className={`bg-white border border-zinc-200/55 rounded-xl  shadow-xs ${isFullscreen ? "grid grid-cols-1 2xl:grid-cols-2 gap-[1px] bg-zinc-200/50" : "divide-y divide-zinc-200/50"}`}
                    >
                      {aspect.criteria.map((criterion, critIdx) => (
                        <div
                          key={criterion.id}
                          className={`p-3 bg-white hover:bg-zinc-50/50 transition-colors flex flex-col justify-between items-start gap-2 ${isFullscreen ? "" : "xl:flex-row xl:items-center xl:gap-4"}`}
                        >
                          <div className="flex-1 min-w-0 pr-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-[0.75rem] font-black text-zinc-800 leading-tight">
                                {criterion.label}
                              </h4>
                              <div className="inline-flex items-center gap-1 text-[0.53125rem] font-black text-indigo-705 bg-indigo-50 border border-indigo-100/50 px-1.5 py-0.5 rounded shrink-0 select-none leading-none">
                                <span>
                                  Max:{" "}
                                  {criterion.maxPoints
                                    .toString()
                                    .replace(".", ",")}{" "}
                                  Pkt
                                </span>
                                <div className="flex items-center gap-0.5 border-l border-indigo-200/40 pl-1 ml-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = [...activeAspects];
                                      const currentMax = criterion.maxPoints;
                                      if (currentMax > 0.5) {
                                        const newVal = currentMax - 0.5;
                                        next[aspectIdx].criteria[
                                          critIdx
                                        ].maxPoints = newVal;
                                        if (criterion.points > newVal) {
                                          next[aspectIdx].criteria[
                                            critIdx
                                          ].points = newVal;
                                        }
                                        setActiveAspects(next);
                                      }
                                    }}
                                    className="p-0.5 hover:bg-indigo-100/80 active:scale-95 text-indigo-700 rounded transition-all"
                                    title="Limit -0.5"
                                  >
                                    <Minus size={8} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = [...activeAspects];
                                      const currentMax = criterion.maxPoints;
                                      const newVal = currentMax + 0.5;
                                      next[aspectIdx].criteria[
                                        critIdx
                                      ].maxPoints = newVal;
                                      setActiveAspects(next);
                                    }}
                                    className="p-0.5 hover:bg-indigo-100/80 active:scale-95 text-indigo-700 rounded transition-all"
                                    title="Limit +0.5"
                                  >
                                    <Plus size={8} />
                                  </button>
                                </div>
                              </div>
                            </div>
                            {criterion.description && (
                              <p className="text-[0.625rem] font-bold text-zinc-450 mt-0.5 leading-snug">
                                {criterion.description}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 justify-end xl:max-w-[420px] shrink-0">
                            {Array.from(
                              { length: criterion.maxPoints * 2 + 1 },
                              (_, i) => i / 2,
                            ).map((p) => (
                              <button
                                key={p}
                                onClick={() => {
                                  const next = [...activeAspects];
                                  next[aspectIdx].criteria[critIdx].points = p;
                                  setActiveAspects(next);
                                }}
                                className={`w-7 h-7 rounded-md font-black text-[0.65625rem] transition-all flex items-center justify-center ${
                                  criterion.points === p
                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-650/25 scale-[1.05]"
                                    : "bg-zinc-50 text-zinc-455 border border-zinc-200/50 hover:bg-indigo-50 hover:text-indigo-600"
                                }`}
                              >
                                {p % 1 === 0
                                  ? p
                                  : p.toString().replace(".", ",")}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isEditingCriteria && (
                    <button
                      onClick={() => {
                        const next = [...activeAspects];
                        next[aspectIdx].criteria.push({
                          id:
                            "crit_" +
                            Date.now() +
                            "_" +
                            Math.random().toString(36).substr(2, 4),
                          label: "Neues Kriterium",
                          description: "Beschreibung des Kriteriums...",
                          maxPoints: 2,
                          points: 0,
                        });
                        setActiveAspects(next);
                      }}
                      className="w-full py-1.5 border border-dashed border-indigo-200/60 hover:border-indigo-400 rounded-xl text-[0.5625rem] font-black text-indigo-500 hover:text-indigo-600 flex items-center justify-center gap-1.5 transition-all bg-white hover:bg-indigo-50/20"
                    >
                      <Plus size={11} /> Kriterium hinzufügen
                    </button>
                  )}
                </div>
              ))}

              {isEditingCriteria && (
                <button
                  type="button"
                  onClick={() => {
                    const next = [...activeAspects];
                    next.push({
                      id: "asp_" + Date.now(),
                      title: `${next.length + 1}. Neuer Bereich`,
                      criteria: [
                        {
                          id: "crit_" + Date.now(),
                          label: "Neues Kriterium",
                          description: "Beschreibung...",
                          maxPoints: 2,
                          points: 0,
                        },
                      ],
                    });
                    setActiveAspects(next);
                  }}
                  className="py-2.5 px-6 border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-2xl text-[0.625rem] font-black text-emerald-600 hover:text-emerald-700 flex items-center justify-center gap-2 transition-all bg-emerald-50/10 hover:bg-emerald-50/20 w-full uppercase tracking-widest"
                >
                  <Plus size={12} /> Neuer Bereich (z.B. Ausdruck, Sprache)
                </button>
              )}
            </div>

            {/* Right Column: Rechtschreibung & Stats */}
            <div className="space-y-3 lg:h-full lg:overflow-y-auto lg:pl-0.5 custom-scrollbar min-h-0 pb-12 lg:pb-0">
              {config.enableSpelling !== false && (
                <div className="bg-rose-50/70 border border-rose-100/60 p-3 rounded-2xl space-y-2 shadow-xs">
                  <h3 className="text-[0.625rem] font-black uppercase tracking-widest text-rose-805 flex items-center gap-1.5 justify-between">
                    <span className="flex items-center gap-1">
                      <FileText size={12} /> Rechtschreibung
                    </span>
                    <span className="text-[0.5625rem] font-bold text-rose-700/80 tracking-normal normal-case">
                      Basis: {config.spellingFactor || 1000}
                    </span>
                  </h3>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[0.5rem] font-black uppercase text-rose-500/80 tracking-wider">
                        Wörter
                      </label>
                      <input
                        type="number"
                        value={wordCount || ""}
                        onChange={(e) => {
                          setWordCount(parseInt(e.target.value) || 0);
                          setManualQuotientOverride(undefined);
                        }}
                        placeholder="z.B. 120"
                        className="w-full bg-white border border-rose-200/60 rounded-lg px-2 py-1 font-black text-[0.75rem] leading-tight outline-none focus:ring-2 focus:ring-rose-500/20 shadow-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[0.5rem] font-black uppercase text-rose-500/80 tracking-wider">
                        Fehler
                      </label>
                      <input
                        type="number"
                        value={errorCount || ""}
                        onChange={(e) => {
                          setErrorCount(parseInt(e.target.value) || 0);
                          setManualQuotientOverride(undefined);
                        }}
                        placeholder="z.B. 8"
                        className="w-full bg-white border border-rose-200/60 rounded-lg px-2 py-1 font-black text-[0.75rem] leading-tight outline-none focus:ring-2 focus:ring-rose-500/20 shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-rose-200/60">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex flex-col">
                        <span className="text-[0.625rem] font-bold text-rose-700 uppercase tracking-widest leading-none">
                          Quotient (x{config.spellingFactor || 1000})
                        </span>
                        {manualQuotientOverride !== undefined && (
                          <button
                            type="button"
                            onClick={() => setManualQuotientOverride(undefined)}
                            className="text-[0.5rem] font-black uppercase text-amber-600 hover:text-amber-800 bg-amber-50 px-2 py-0.5 mt-1.5 rounded border border-amber-200 cursor-pointer self-start transition-all"
                            title="Auf automatische Berechnung zurücksetzen"
                          >
                            Autom./Reset 🔄
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        value={
                          manualQuotientOverride !== undefined &&
                          manualQuotientOverride !== null
                            ? manualQuotientOverride
                            : wordCount > 0
                              ? (
                                  (errorCount * (config.spellingFactor || 1000)) /
                                  wordCount
                                ).toFixed(1)
                              : spellingPoints
                        }
                        onChange={(e) => {
                          const val =
                            e.target.value === ""
                              ? undefined
                              : parseFloat(e.target.value);
                          setManualQuotientOverride(
                            isNaN(val as number) ? undefined : val,
                          );
                        }}
                        className="w-20 text-right bg-transparent border-b border-rose-200 font-black text-[1.125rem] leading-normal text-rose-800 outline-none focus:border-rose-400 focus:bg-white focus:rounded-t px-1"
                      />
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-[0.625rem] font-bold text-rose-700 uppercase tracking-widest">
                        RS-Note
                      </span>
                      <span
                        className={`px-4 py-1.5 rounded-lg bg-rose-600 shadow-md shadow-rose-600/20 text-white text-[0.75rem] leading-tight font-black`}
                      >
                        {rechtschreibNote}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Grammatik */}
              {showGrammar && (
                <div className="bg-amber-50/50 p-4 xl:p-6 rounded-[1.5rem] border border-amber-200/60 shadow-sm space-y-4 relative">
                  <div
                    className="flex justify-between items-center bg-amber-100/50 -mx-4 xl:-mx-6 -mt-4 xl:-mt-6 px-4 xl:px-6 py-3 rounded-t-[1.5rem] border-b border-amber-200/60 transition-colors cursor-pointer"
                    onClick={() =>
                      setConfig({ ...config, enableGrammar: false })
                    }
                  >
                    <h4 className="text-[0.6875rem] font-black uppercase tracking-widest text-amber-800">
                      Grammatik
                    </h4>
                    <label
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[0.5625rem] font-bold text-amber-700 uppercase tracking-widest">
                        Aktiviert
                      </span>
                      <input
                        type="checkbox"
                        checked={config.enableGrammar}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            enableGrammar: e.target.checked,
                          })
                        }
                        className="accent-amber-600 scale-110"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[0.625rem] font-black uppercase text-amber-800 tracking-widest">
                        Punkte
                      </label>
                      <input
                        type="text"
                        value={grammarAchievedPoints === 0 ? '0' : grammarAchievedPoints || ""}
                        onChange={(e) =>
                          setGrammarAchievedPoints(e.target.value)
                        }
                        placeholder="0"
                        className="w-full bg-white border border-amber-200/60 rounded-xl px-3 py-2 font-black text-[0.875rem] leading-snug outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 justify-center">
                      <span className="text-[0.625rem] font-black uppercase text-amber-800 tracking-widest">
                        Note
                      </span>
                      <div className="bg-amber-500 shadow-md shadow-amber-500/20 text-white rounded-xl px-4 py-1.5 font-black text-center text-[0.875rem] leading-snug">
                        {grammatikNote}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-amber-200/60 text-[0.59375rem] font-bold text-amber-700 flex flex-wrap gap-x-2 gap-y-1">
                    <span className="opacity-80">
                      Max: {config.maxGrammarPoints || 20} |{" "}
                    </span>
                    <span>1: {config.grammar1Points || 18}+ |</span>
                    <span>2: {config.grammar2Points || 15}+ |</span>
                    <span>3: {config.grammar3Points || 11}+ |</span>
                    <span>4: {config.grammar4Points || 7}+</span>
                  </div>
                </div>
              )}

              {!config.enableGrammar && subject !== "Mathematik" && subject !== "Mathe" && (
                <div className="flex justify-end opacity-80 hover:opacity-100 transition-opacity">
                  <label className="flex items-center gap-2 cursor-pointer bg-zinc-50 border border-zinc-200/80 px-3 py-1.5 rounded-xl hover:bg-zinc-100 transition-colors shadow-sm">
                    <input
                      type="checkbox"
                      checked={config.enableGrammar}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          enableGrammar: e.target.checked,
                        })
                      }
                      className="accent-amber-600 scale-110"
                    />
                    <span className="text-[0.625rem] font-black text-zinc-600 uppercase tracking-widest">
                      + Grammatikteil
                    </span>
                  </label>
                </div>
              )}

              <div className="bg-zinc-900 border border-zinc-800 p-4 xl:p-6 rounded-[1.5rem] text-white space-y-4 shadow-xl">
                <h3 className="text-[0.6875rem] font-black uppercase tracking-widest text-zinc-400">
                  Ergebnis
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[0.75rem] leading-tight">
                    <span className="text-zinc-400 uppercase tracking-wider text-[0.625rem] font-bold">
                      Arbeit
                    </span>
                    <span className="font-black text-white">
                      {totalArbeitsPoints} / {maxPossibleArbeitsPoints} (Note:{" "}
                      {arbeitsNote})
                    </span>
                  </div>
                  {config.enableSpelling !== false && (
                    <div className="flex justify-between items-center text-[0.75rem] leading-tight">
                      <span className="text-zinc-400 uppercase tracking-wider text-[0.625rem] font-bold">
                        RS
                      </span>
                      <span className="font-black text-rose-400">
                        Note {rechtschreibNote}
                      </span>
                    </div>
                  )}
                  {showGrammar && (
                    <div className="flex justify-between items-center text-[0.75rem] leading-tight">
                      <span className="text-zinc-400 uppercase tracking-wider text-[0.625rem] font-bold">
                        Grammatik
                      </span>
                      <span className="font-black text-amber-400">
                        {grammarAchievedPoints} /{" "}
                        {config.maxGrammarPoints || 20} (Note: {grammatikNote})
                      </span>
                    </div>
                  )}

                  {/* Manual Tendency Override Dropdown Option */}
                  <div className="pt-2 mt-1 border-t border-zinc-800 space-y-1.5">
                    <div className="flex justify-between items-center text-[0.625rem] font-bold text-zinc-400 uppercase tracking-wider">
                      <span>Manuelle Tendenz / Note</span>
                      {manualGradeOverride && manualGradeOverride !== "auto" && (
                        <span className="text-emerald-400 text-[0.5625rem] font-black tracking-widest uppercase">Manuell Aktiv</span>
                      )}
                    </div>
                    <select
                      id="manual-tendency-dropdown"
                      value={manualGradeOverride || "auto"}
                      onChange={(e) => {
                        const val = e.target.value;
                        setManualGradeOverride(val);
                        if (val === "auto") {
                          setIsTendencyManuallySet(false);
                        } else {
                          setIsTendencyManuallySet(true);
                          // Extract tendency from the override value
                          const match = val.match(/^([1-5])([+-])?$/);
                          if (match) {
                            setTendency(match[2] || "");
                          }
                        }
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-300 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm transition-all focus:border-zinc-700 cursor-pointer"
                    >
                      <option value="auto">💡 Automatisch berechnen (Standard)</option>
                      <optgroup label="Manuelle Gesamtnote & Tendenz festlegen">
                        <option value="1+">1+ (Sehr Gut mit Tendenz +)</option>
                        <option value="1">1 (Sehr Gut)</option>
                        <option value="1-">1- (Sehr Gut mit Tendenz -)</option>
                        <option value="2+">2+ (Gut mit Tendenz +)</option>
                        <option value="2">2 (Gut)</option>
                        <option value="2-">2- (Gut mit Tendenz -)</option>
                        <option value="3+">3+ (Befriedigend mit Tendenz +)</option>
                        <option value="3">3 (Befriedigend)</option>
                        <option value="3-">3- (Befriedigend mit Tendenz -)</option>
                        <option value="4+">4+ (Genügend mit Tendenz +)</option>
                        <option value="4">4 (Genügend)</option>
                        <option value="4-">4- (Genügend mit Tendenz -)</option>
                        <option value="5+">5+ (Nicht Genügend mit Tendenz +)</option>
                        <option value="5">5 (Nicht Genügend)</option>
                        <option value="5-">5- (Nicht Genügend mit Tendenz -)</option>
                      </optgroup>
                    </select>

                    {subject === "Deutsch" && (() => {
                      const G = Math.floor(exactGradeValue);
                      const roundedFrac = Math.round((exactGradeValue - G) * 100) / 100;
                      if (Math.abs(roundedFrac - 0.5) < 0.01) {
                        return (
                          <div className="p-2.5 border border-amber-500/20 bg-amber-500/10 text-amber-200 text-[0.6875rem] rounded-xl leading-normal space-y-1 font-mono">
                            <span className="font-bold flex items-center gap-1 text-[0.75rem]">⚖️ Entscheidungsbereich ({exactGrade})</span>
                            <p className="font-sans">Bei einem Notenschnitt von genau {G},50 liegt die Entscheidung bei dir. Wähle:</p>
                            <ul className="list-disc list-inside space-y-1 font-sans pl-1 text-[0.625rem] text-amber-300/90">
                              <li>Den Tendenz-Button <strong className="bg-zinc-800 text-white px-1 py-0.5 rounded">-</strong> für eine <strong className="text-white font-black">{G}-</strong></li>
                              <li>Den Tendenz-Button <strong className="bg-zinc-800 text-white px-1 py-0.5 rounded">+</strong> für eine <strong className="text-white font-black">{G + 1}+</strong></li>
                              <li>Oder überschreibe im Dropdown direkt deine Wunschnote</li>
                            </ul>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  <div className="pt-3 mt-1 border-t border-zinc-800 flex justify-between items-end">
                    <div className="flex flex-col gap-1">
                      <span className="text-[0.5625rem] font-black uppercase text-zinc-500 tracking-widest leading-none">
                        Berechnet
                      </span>
                      <span className="text-[0.625rem] font-black text-emerald-400">
                        Ø {exactGrade}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-zinc-800 rounded-lg p-1 gap-1">
                        {['+', '', '-'].map(t => (
                          <button
                            key={t || 'none'}
                            onClick={() => {
                              setTendency(t);
                              setIsTendencyManuallySet(true);
                            }}
                            className={`w-7 h-7 rounded flex items-center justify-center text-xs font-black transition-all ${tendency === t ? 'bg-emerald-500 text-zinc-950' : 'bg-transparent text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'}`}
                          >
                            {t || '•'}
                          </button>
                        ))}
                      </div>
                      <span className="text-4xl xl:text-5xl font-black text-emerald-400 leading-none flex items-start">
                        {gesamtnote}
                        {tendency && <span className="text-2xl -mt-1 ml-0.5">{tendency}</span>}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  className="w-full mt-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 rounded-xl font-black uppercase text-[0.6875rem] tracking-[0.2em] shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Save size={16} /> Speichern
                </button>
              </div>

              {/* Pädagogisches Feedback */}
              <div className="bg-white p-4 xl:p-6 rounded-[1.5rem] border border-zinc-200/60 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-[0.625rem] xl:text-[0.6875rem] font-black uppercase tracking-widest text-zinc-800 flex items-center gap-1.5">
                    <FileText size={12} className="text-indigo-500" />{" "}
                    Pädagogische Rückmeldung
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const generated = generatePedagogicalFeedback();
                      setFeedback(generated);
                    }}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                    title="Generiert einen feinfühligen und personalisierten Feedbacktext basierend auf den berechneten Noten und den Merkmalen des Schülers."
                  >
                    <Sparkles
                      size={11}
                      className="text-indigo-600 animate-pulse"
                    />{" "}
                    KI-Vorschlag
                  </button>
                </div>

                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Beschreibe kurz die Stärken und nächsten Lernschritte oder generiere eine feinfühlige, personalisierte Verbalbeurteilung per 'KI-Vorschlag'..."
                  className="w-full h-24 xl:h-32 p-3 text-[0.75rem] leading-tight font-semibold text-zinc-700 bg-zinc-50 border border-zinc-200/60 rounded-xl outline-none focus:border-indigo-500 focus:bg-white resize-none shadow-inner leading-relaxed transition-all"
                />

                {feedback && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setFeedback("")}
                      className="text-[0.5625rem] font-bold text-zinc-400 hover:text-rose-500 transition-colors uppercase tracking-widest cursor-pointer"
                    >
                      Löschen
                    </button>
                  </div>
                )}
              </div>

              {/* mini config box removed */}
            </div>

            <AnimatePresence>
              {showConfig && (
                <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 sm:p-6 lg:p-12 focus-within:outline-none">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    onClick={() => setShowConfig(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-[95vw] lg:max-w-[98vw] bg-white rounded-[2rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden"
                  >
                    <div className="flex justify-between items-center p-6 md:p-8 border-b border-zinc-100 bg-zinc-50/50 shrink-0">
                      <div>
                        <h3 className="text-[1.25rem] leading-normal font-black text-zinc-900 tracking-tight flex items-center gap-2">
                          <Settings2 className="text-zinc-400" />
                          Erweiterte Einstellungen
                        </h3>
                        <p className="text-[0.75rem] leading-tight font-bold text-zinc-500 uppercase tracking-widest mt-1">
                          Gewichtungen & Schwellenwerte für die Beurteilung
                          anpassen
                        </p>
                      </div>
                      <button
                        onClick={() => setShowConfig(false)}
                        className="p-2 hover:bg-zinc-200/50 rounded-full text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        <X size={24} />
                      </button>
                    </div>

                    <div className="p-6 md:p-8 overflow-y-auto space-y-12 flex-1 custom-scrollbar">
                      {/* Weights section with Visual Bar */}
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-[0.75rem] leading-tight font-black uppercase tracking-[0.2em] text-zinc-800 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-zinc-100 flex items-center justify-center">⚖️</span>
                            Gewichtung der Teilbereiche
                          </h4>
                          <p className="text-[0.625rem] font-bold text-zinc-400 mt-1 uppercase tracking-widest pl-8">
                            Multiplikatoren zur Berechnung der Gesamtnote
                          </p>
                        </div>
                        
                        {(() => {
                           const wArbeit = config.weightArbeit || 1;
                           const wGrammatik = config.enableGrammar ? (config.weightGrammar || 1) : 0;
                           const totalWeight = wArbeit + wGrammatik;
                           const arbeitPct = Math.round((wArbeit/totalWeight)*100);
                           const gramPct = config.enableGrammar ? Math.round((wGrammatik/totalWeight)*100) : 0;
                           
                           return (
                             <div className="bg-zinc-50 border border-zinc-200/60 p-5 rounded-2xl space-y-6 shadow-sm">
                               {/* Visual Stacked Bar */}
                               <div className="w-full h-4 rounded-full flex  shadow-inner overflow-hidden">
                                 <div style={{ width: `${arbeitPct}%` }} className="bg-indigo-500 hover:opacity-90 transition-all flex items-center justify-center text-[0.5rem] font-black text-white">{arbeitPct > 10 ? `${arbeitPct}%` : ''}</div>
                                 {showGrammar && (
                                    <div style={{ width: `${gramPct}%` }} className="bg-amber-500 hover:opacity-90 transition-all flex items-center justify-center text-[0.5rem] font-black text-white">{gramPct > 10 ? `${gramPct}%` : ''}</div>
                                 )}
                               </div>

                               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {/* Arbeitsnote */}
                                  <div className="flex flex-col gap-2 p-3 rounded-xl bg-white border border-zinc-200 shadow-sm relative group">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                                    <label className="text-[0.625rem] font-black text-indigo-900 uppercase tracking-wider pl-2 flex justify-between items-center">
                                      <span>Arbeitsnote</span>
                                      <span className="text-indigo-400 font-bold">{arbeitPct}%</span>
                                    </label>
                                    <p className="text-[0.5rem] font-bold text-zinc-400 leading-tight pl-2">
                                      {config.enableSpelling !== false ? '(Inhalt x3 + Rechtschr.) / 4' : 'Direkte Punktebewertung'}
                                    </p>
                                    <div className="flex items-center gap-3 pl-2 mt-auto">
                                      <input
                                        type="number" min="1" max="10"
                                        className="w-12 p-1.5 rounded-lg border-2 border-indigo-100 bg-indigo-50/50 text-center font-black text-indigo-700 outline-none focus:border-indigo-400 transition-all"
                                        value={config.weightArbeit || 1}
                                        onChange={(e) => setConfig({ ...config, weightArbeit: Number(e.target.value) || 1 })}
                                      />
                                      <span className="text-[0.625rem] font-black text-zinc-400 tracking-wider">Faktor</span>
                                    </div>
                                  </div>

                                  {/* Grammar */}
                                  {showGrammar && (
                                    <div className="flex flex-col gap-2 p-3 rounded-xl bg-white border border-zinc-200 shadow-sm relative ">
                                      <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                                      <label className="text-[0.625rem] font-black text-amber-900 uppercase tracking-wider pl-2 flex justify-between items-center">
                                        <span>Grammatik</span>
                                        <span className="text-amber-400 font-bold">{gramPct}%</span>
                                      </label>
                                      <div className="flex items-center gap-3 pl-2 mt-auto">
                                        <input
                                          type="number" min="1" max="10"
                                          className="w-12 p-1.5 rounded-lg border-2 border-amber-200 bg-amber-50/50 text-center font-black text-amber-700 outline-none focus:border-amber-400 transition-all"
                                          value={config.weightGrammar || 1}
                                          onChange={(e) => setConfig({ ...config, weightGrammar: Number(e.target.value) || 1 })}
                                        />
                                        <span className="text-[0.625rem] font-black text-zinc-400 tracking-wider">Faktor</span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Spelling Factor Basis */}
                                  {config.enableSpelling !== false && (
                                    <div className="flex flex-col gap-2 p-3 rounded-xl bg-white border border-zinc-200 shadow-sm relative ">
                                       <div className="absolute top-0 left-0 w-1 h-full bg-zinc-300" />
                                       <label className="text-[0.625rem] font-black text-zinc-600 uppercase tracking-wider pl-2 flex justify-between items-center" title="Basiswortanzahl zur Berechnung des Fehlerquotienten">
                                        <span>RS-Fehlerbasis</span>
                                      </label>
                                      <div className="flex items-center gap-3 pl-2">
                                        <input
                                          type="number" min="50" max="10000"
                                          className="w-16 p-1.5 rounded-lg border-2 border-zinc-200 bg-zinc-50/50 text-center font-black text-zinc-700 outline-none focus:border-zinc-400 transition-all"
                                          value={config.spellingFactor || 1000}
                                          onChange={(e) => setConfig({ ...config, spellingFactor: Number(e.target.value) || 1000 })}
                                        />
                                        <span className="text-[0.625rem] font-black text-zinc-400 tracking-wider">Wörter</span>
                                      </div>
                                    </div>
                                  )}
                               </div>
                             </div>
                           );
                        })()}
                      </div>

                      <div className="space-y-6">
                        <div>
                          <h4 className="text-[0.75rem] leading-tight font-black uppercase tracking-[0.2em] text-zinc-800 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-zinc-100 flex items-center justify-center">🎯</span>
                            Benotungsschwellen
                          </h4>
                          <p className="text-[0.625rem] font-bold text-zinc-400 mt-1 uppercase tracking-widest pl-8">
                            Ab welcher Punkte-/Fehleranzahl welche Note vergeben wird
                          </p>
                        </div>
                        <div
                          className={`grid ${config.enableGrammar ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2"} gap-4 items-start`}
                        >
                          {/* Text Points */}
                          <div className="space-y-3 bg-indigo-50/30 border border-indigo-100/60 rounded-2xl p-4 shadow-sm relative ">
                            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500" />
                            <h5 className="text-[0.625rem] font-black uppercase tracking-widest text-indigo-800 flex items-center gap-1.5">
                              Inhalt & Struktur <span className="text-[0.5rem] px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-600">Punkte</span>
                            </h5>
                            <div className="bg-white/60 rounded-xl p-3 space-y-2 border border-indigo-100/40">
                              {[1, 2, 3, 4].map((g) => (
                                <div
                                  key={g}
                                  className="flex items-center justify-between"
                                >
                                  <span className="text-[0.6875rem] font-bold text-zinc-600">
                                    Note {g} <span className="text-zinc-400 font-medium">ab</span>
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      className="w-14 p-1.5 rounded-lg border-2 border-transparent bg-white shadow-sm text-center font-black text-[0.6875rem] text-indigo-900 outline-none focus:border-indigo-400 transition-all hover:border-indigo-200"
                                      value={(config as any)[`grade${g}Points`]}
                                      onChange={(e) =>
                                        setConfig({ ...config, [`grade${g}Points`]: Number(e.target.value) })
                                      }
                                    />
                                    <span className="text-[0.5625rem] font-bold text-zinc-400">Pkt</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Grammar Points */}
                          {showGrammar && (
                            <div className="space-y-3 bg-amber-50/30 border border-amber-200/50 rounded-2xl p-4 shadow-sm relative ">
                              <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
                              <div className="flex items-center justify-between">
                                <h5 className="text-[0.625rem] font-black uppercase tracking-widest text-amber-800 flex items-center gap-1.5">
                                  Grammatik <span className="text-[0.5rem] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700">Punkte</span>
                                </h5>
                                <div className="flex items-center gap-1" title="Maximale Grammatikpunkte">
                                  <span className="text-[0.5625rem] font-bold text-amber-600">Max:</span>
                                  <input
                                    type="number"
                                    className="w-12 p-1 rounded-md border-0 bg-amber-100 text-center font-black text-[0.625rem] text-amber-900 outline-none focus:ring-1 ring-amber-400"
                                    value={config.maxGrammarPoints || 20}
                                    onChange={(e) => setConfig({ ...config, maxGrammarPoints: Number(e.target.value) })}
                                  />
                                </div>
                              </div>
                              <div className="bg-white/60 rounded-xl p-3 space-y-2 border border-amber-100/40">
                                {[1, 2, 3, 4].map((g) => (
                                  <div
                                    key={`gram${g}`}
                                    className="flex items-center justify-between"
                                  >
                                    <span className="text-[0.6875rem] font-bold text-zinc-600">
                                      Note {g} <span className="text-zinc-400 font-medium">ab</span>
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        className="w-14 p-1.5 rounded-lg border-2 border-transparent bg-white shadow-sm text-center font-black text-[0.6875rem] text-amber-900 outline-none focus:border-amber-400 transition-all hover:border-amber-200"
                                        value={(config as any)[`grammar${g}Points`] || 0}
                                        onChange={(e) => setConfig({ ...config, [`grammar${g}Points`]: Number(e.target.value) })}
                                      />
                                      <span className="text-[0.5625rem] font-bold text-zinc-400">Pkt</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Spelling Quotient */}
                          {config.enableSpelling !== false && (
                            <div className="space-y-3 bg-emerald-50/30 border border-emerald-100/60 rounded-2xl p-4 shadow-sm relative ">
                              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
                              <h5 className="text-[0.625rem] font-black uppercase tracking-widest text-emerald-800 flex items-center gap-1.5" title="Fehler je eingestellter Basiswortanzahl">
                                Rechtschreibung <span className="text-[0.5rem] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700">F-Q</span>
                              </h5>
                              <div className="bg-white/60 rounded-xl p-3 space-y-2 border border-emerald-100/40">
                                {[1, 2, 3, 4].map((g) => (
                                  <div
                                    key={`spell${g}`}
                                    className="flex items-center justify-between"
                                  >
                                    <span className="text-[0.6875rem] font-bold text-zinc-600">
                                      Note {g} <span className="text-zinc-400 font-medium">bis</span>
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number" step="0.1"
                                        className="w-14 p-1.5 rounded-lg border-2 border-transparent bg-white shadow-sm text-center font-black text-[0.6875rem] text-emerald-900 outline-none focus:border-emerald-400 transition-all hover:border-emerald-200"
                                        value={(config as any)[`spelling${g}Q`]}
                                        onChange={(e) => setConfig({ ...config, [`spelling${g}Q`]: Number(e.target.value) })}
                                      />
                                      <span className="text-[0.5625rem] font-bold text-zinc-400">F</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Apply to All Button */}
                      <div className="mt-8 pt-8 border-t border-zinc-100 flex flex-col gap-3">
                        <p className="text-[0.625rem] font-bold text-zinc-500 uppercase tracking-widest text-center">
                          Aktionen
                        </p>
                        <button
                          onClick={applyConfigToAll}
                          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-wider text-[0.75rem] shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                          <Save size={16} /> Auf gesamte Schularbeit (für alle Kinder) anwenden
                        </button>
                      </div>

                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
