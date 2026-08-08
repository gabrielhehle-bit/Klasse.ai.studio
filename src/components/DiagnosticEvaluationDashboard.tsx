import React, { useMemo, useState } from "react";
import {
  Trophy,
  BookOpen,
  Info,
  Sparkles,
  Printer,
  Award,
  Calendar,
  Star,
  User,
  ShieldAlert,
  Download,
  CheckCircle2,
  Bookmark,
  TrendingUp,
  Compass,
  FileText,
  Brain,
  ChevronRight,
  TrendingDown,
  Activity,
  Heart
} from "lucide-react";
import { useApp } from "../context/AppContext";

export interface QuestTask {
  id: number;
  title: string;
  category: "lesen" | "rechtschreiben" | "mathematik" | "mathe" | "sprache" | "kognition";
  categoryLabel: string;
  storyDescription: string;
  instructions: string;
  character: "Elias" | "Kimi" | "Treah" | "Camil" | "Fridolin" | "Lumi";
  characterMood: "happy" | "thinking" | "excited" | "wise" | "curious";
  quote: string;
  correctAnswerId: string;
  choices: { id: string; label: string; icon?: string; detail?: string }[];
  visualType: string;
  extraData?: any;
  bildungsstandard?: string;
}

interface DiagnosticEvaluationDashboardProps {
  questTasks: QuestTask[];
  questObservations: Record<
    number,
    {
      rating: "excellent" | "satisfied" | "support_needed" | "not_satisfied" | null;
      notes: string;
      timestamp: string;
    }
  >;
  collectedCrystals: boolean[];
  childDraftAnswer: string | null;
  selectedGrade: "1" | "2" | "3" | "4";
  activeStudentName: string;
}

const DiagnosticEvaluationDashboard: React.FC<
  DiagnosticEvaluationDashboardProps
> = ({
  questTasks,
  questObservations,
  collectedCrystals,
  childDraftAnswer,
  selectedGrade,
  activeStudentName,
}) => {
  const { app } = useApp();
  const [showCertificate, setShowCertificate] = useState(false);
  const [activeTab, setActiveTab] = useState<"cockpit" | "foerderplan" | "standards" | "historie">("cockpit");

  // Fetch historically completed evaluations for this student
  const historicalRuns = useMemo(() => {
    const studentId = app.students.find(s => s.name === activeStudentName)?.id;
    if (!studentId || !app.diagnostikErhebungen) return [];
    
    return app.diagnostikErhebungen
      .filter(e => e.testId === "gabic-quest-diagnostik" && e.schuelerId === studentId)
      .sort((a,b) => new Date(a.datum).getTime() - new Date(b.datum).getTime());
  }, [app.students, app.diagnostikErhebungen, activeStudentName]);

  // Group competence areas matching Austrian BiST standards
  const domainData = useMemo(() => {
    const domains = [
      {
        id: "lesen",
        title: "Leseverständnis & Phonologie",
        icon: "📖",
        color: "#6366f1", // indigo-500
        bgGradient: "from-indigo-950/40 to-indigo-900/20",
        tasks: questTasks.filter((t) => t.category === "lesen"),
      },
      {
        id: "schreiben",
        title: "Rechtschreiben & Wortkunde",
        icon: "✍️",
        color: "#ec4899", // pink-500
        bgGradient: "from-pink-950/40 to-pink-900/20",
        tasks: questTasks.filter(
          (t) => t.category === "rechtschreiben" || t.category === "sprache"
        ),
      },
      {
        id: "mathe",
        title: "Zahlenraum & Arithmetik",
        icon: "🧮",
        color: "#10b981", // emerald-500
        bgGradient: "from-emerald-950/40 to-indigo-900/20",
        tasks: questTasks.filter((t) => t.category === "mathe" || t.category === "mathematik"),
      },
      {
        id: "kognition",
        title: "Logische Muster & Kognition",
        icon: "🧠",
        color: "#f59e0b", // amber-500
        bgGradient: "from-amber-950/40 to-amber-900/20",
        tasks: questTasks.filter((t) => t.category === "kognition"),
      },
    ];

    return domains.map((dom) => {
      let evaluatedCount = 0;
      let scoreSum = 0;

      dom.tasks.forEach((task) => {
        if (task.id === 0 || task.id === 20 || task.id === 99) return;

        const obs = questObservations[task.id];
        if (obs && obs.rating) {
          evaluatedCount++;
          if (obs.rating === "excellent") scoreSum += 1.0;
          else if (obs.rating === "satisfied") scoreSum += 0.75;
          else if (obs.rating === "support_needed") scoreSum += 0.4;
          else if (obs.rating === "not_satisfied") scoreSum += 0.0;
        } else {
          // Fallback to absolute task status
          const answeredCorrectly = collectedCrystals[task.id - 1];
          if (answeredCorrectly) {
            evaluatedCount++;
            scoreSum += 1.0;
          }
        }
      });

      const maxScore = dom.tasks.filter(
        (t) => t.id !== 0 && t.id !== 20 && t.id !== 99
      ).length || 5;

      const percent = Math.min(
        100,
        Math.max(0, Math.round((scoreSum / maxScore) * 100))
      );

      // Status labels for school diagnostic purposes
      let level: "souveraen" | "beratung" | "foerdert" = "souveraen";
      let statusLabel = "Souverän";
      let statusColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      let recommendation = "";

      if (evaluatedCount === 0) {
        statusLabel = "Im Spiel";
        statusColor = "text-slate-400 bg-slate-500/10 border-slate-500/20";
        recommendation = "Noch kein Spielabschluss in diesem Bereich erfasst.";
      } else if (percent >= 75) {
        level = "souveraen";
        statusLabel = "Souverän";
        statusColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
        recommendation = `Hervorragende Kompetenzen in der ${selectedGrade}. Schulstufe. Das Kind löst Aufgaben schnell und selbstständig. Keine unmittelbare Intervention erforderlich.`;
      } else if (percent >= 55) {
        level = "beratung";
        statusLabel = "Teilsicher";
        statusColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
        recommendation = `Teilsicherer Lernstand gemäß Bildungsstandard. Das Kind profitiert von visuellen Hilfestellungen und logischen Analogien. Gezielte Vertiefung empfohlen.`;
      } else {
        level = "foerdert";
        statusLabel = "Förderbedarf";
        statusColor = "text-rose-400 bg-rose-500/10 border-rose-500/20";
        recommendation = `Substanzieller Förderbedarf erkennbar. Gezielte Förderung mit konkretem Anschauungsmaterial und Einzelförderung zur Festigung der Basiskompetenzen dringend empfohlen.`;
      }

      return {
        ...dom,
        evaluatedCount,
        scoreSum: parseFloat(scoreSum.toFixed(1)),
        maxScore,
        percent,
        statusLabel,
        statusColor,
        recommendation,
        level,
      };
    });
  }, [questTasks, questObservations, collectedCrystals, selectedGrade]);

  const totalPoints = useMemo(() => {
    return domainData.reduce((acc, d) => acc + d.scoreSum, 0);
  }, [domainData]);

  // Construct custom inline mathematical SVG Radar Chart Coordinates
  const radarChartSvg = useMemo(() => {
    const cx = 150;
    const cy = 150;
    const r = 100;

    const pLesen = domainData[0]?.percent / 100 || 0;
    const pSchreiben = domainData[1]?.percent / 100 || 0;
    const pMathe = domainData[2]?.percent / 100 || 0;
    const pKognition = domainData[3]?.percent / 100 || 0;

    const ptLesen = { x: cx, y: cy - r * pLesen };
    const ptSchreiben = { x: cx + r * pSchreiben, y: cy };
    const ptMathe = { x: cx, y: cy + r * pMathe };
    const ptKognition = { x: cx - r * pKognition, y: cy };

    return (
      <svg viewBox="0 0 300 300" className="w-full max-w-[200px] mx-auto drop-shadow-xl">
        {/* Background polar circles grid */}
        {[0.25, 0.5, 0.75, 1.0].map((scale, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r * scale}
            className="fill-none stroke-slate-800 stroke-1"
            strokeDasharray={scale === 1.0 ? "none" : "3,3"}
          />
        ))}

        {/* Axes lines */}
        <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} className="stroke-slate-800 stroke-1" />
        <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} className="stroke-slate-800 stroke-1" />

        {/* Axis Labels */}
        <text x={cx} y={cy - r - 8} className="text-[0.625rem] font-black fill-indigo-400 font-sans text-center" textAnchor="middle">📖 Lesen & Phonetik</text>
        <text x={cx + r + 6} y={cy + 3} className="text-[0.625rem] font-black fill-pink-400 font-sans text-left" textAnchor="start">✍️ R. & Wort</text>
        <text x={cx} y={cy + r + 13} className="text-[0.625rem] font-black fill-emerald-400 font-sans text-center" textAnchor="middle">🧮 Mathe & Mengen</text>
        <text x={cx - r - 6} y={cy + 3} className="text-[0.625rem] font-black fill-amber-400 font-sans text-right" textAnchor="end">🧠 Logik</text>

        {/* Active Score Polygon with glowing outline */}
        <polygon
          points={`${ptLesen.x},${ptLesen.y} ${ptSchreiben.x},${ptSchreiben.y} ${ptMathe.x},${ptMathe.y} ${ptKognition.x},${ptKognition.y}`}
          className="fill-indigo-500/20 stroke-indigo-400 stroke-2"
          style={{ filter: "drop-shadow(0 0 4px rgba(99,102,241,0.4))" }}
        />

        {/* Level points dots */}
        <circle cx={ptLesen.x} cy={ptLesen.y} r={pLesen > 0 ? 4 : 0} className="fill-indigo-300 stroke-indigo-500 stroke-1" />
        <circle cx={ptSchreiben.x} cy={ptSchreiben.y} r={pSchreiben > 0 ? 4 : 0} className="fill-pink-300 stroke-pink-500 stroke-1" />
        <circle cx={ptMathe.x} cy={ptMathe.y} r={pMathe > 0 ? 4 : 0} className="fill-emerald-300 stroke-emerald-500 stroke-1" />
        <circle cx={ptKognition.x} cy={ptKognition.y} r={pKognition > 0 ? 4 : 0} className="fill-amber-300 stroke-amber-500 stroke-1" />
      </svg>
    );
  }, [domainData]);

  // Comprehensive custom Austrian curricula support suggestions
  const foerderplanData = useMemo(() => {
    const plans: Record<
      string,
      Record<string, { title: string; goals: string[]; activities: string[]; materials: string[] }>
    > = {
      lesen: {
        "1": {
          title: "Erstlesen und Silben-Synthese (Silbentreppchen-Training)",
          goals: [
            "Festigung der Graphem-Phonem-Korrespondenz (Kombination Buchstabe-Laut)",
            "Flüssiges Verbinden von Konsonant und Vokal (Zusammenlauten)",
            "Vermeidung von Raum-Lage-Verwechslungen (z.B. b/d/p/q)"
          ],
          activities: [
            "Tägliches 5-Minuten Silbenteppich-Sprechen (ba, be, bi, bo, bu, ma, me...)",
            "Erlesen lautsynthetischer Silben-Dominos gemeinsam mit einem Partnerkind",
            "Malerische Silben-Rätsel: Wörter lesen, Silbenbögen zeichnen und Motiv anmalen"
          ],
          materials: [
            "Österreichischer Silbenkasten mit farbigen Buchstabenplättchen",
            "Erstlesefibel mit alternierender Silben-Farbe (blau/rot)",
            "Laute-Karten für den taktil-visuellen Stationenbetrieb"
          ]
        },
        "2": {
          title: "Sinnerfassendes Ganzsatz-Lesen & Sichtwortschatz",
          goals: [
            "Aufbau eines automatisierten Sichtwortschatzes zur Erhöhung des Lesetempos",
            "Sinnerfassendes Lesen strukturierter, mehrgliedriger Sätze",
            "Sicheres Auffinden von Detail-Informationen im Text"
          ],
          activities: [
            "Tägliches Tandemlesen: Ein lesestärkeres Kind liest synchron mit",
            "Lese-Mal-Befehle: Sätze genau erarbeiten und zeichnerisch anwenden",
            "Einfache Lese-Rätsel (Logicals für Erstleser) lösen"
          ],
          materials: [
            "Lese-Dominos und Kärtchenspiele mit Selbstkontrollfunktion",
            "Schulbuchbegleitendes Lesetraining mit kurzen, motivierenden Tiergeschichten",
            "Wortschatz-Gitterrätsel (Suchsel) zur optischen Diskriminierung"
          ]
        },
        "3": {
          title: "Sachtext-Sinnerfassung & Textdetektiv-Strategien",
          goals: [
            "Nutzung von grundlegenden Lesestrategien (Markieren, Abschnitte gliedern)",
            "Erschließen von unbekannten Wörtern aus dem Satzzusammenhang",
            "Sicheres schriftliches Beantworten von W-Fragen zum Text"
          ],
          activities: [
            "Anwendung der 5-Schritt-Lesemethode an Sach- und Sachtexten",
            "Gezieltes Einüben von Schlüsselwort-Markierungen mit Leuchtstift",
            "Kooperatives Lesen in Lesekonferenzen mit Rollenverteilung (z.B. Fragesteller)"
          ],
          materials: [
            "Lesequests mit Lückentexten und integriertem Verständnisquiz",
            "Didaktische Lese-Detektivkartei mit ansteigender Lesekomplexität",
            "Antolin-Begleitfragen zu altersgerechter Kinderliteratur"
          ]
        },
        "4": {
          title: "Literarische Interpretation & Kritisches Sachtext-Lesen",
          goals: [
            "Verstehen von impliziter Bedeutung und bildhaften Wendungen (Metaphern)",
            "Kritische Reflexion von Sachtexten (Unterscheidung Nachricht vs. Meinung)",
            "Sichere, strukturierte Zusammenfassung komplexer Sachtexte"
          ],
          activities: [
            "Vergleichen verschiedener Zeitungs- und Internetauszüge zu einem Thema",
            "Verfassen einer bewertenden Buchrezension oder eines Lese-Tagebuchs",
            "Projektarbeit: Erarbeitung eines Expertenvortrags auf Basis von Text-Quellen"
          ],
          materials: [
            "Anspruchsvolle Textblätter zur Argumentationskette",
            "Klassische literarische Sagen und Auszüge moderner Jugendromane",
            "Analytische Arbeitsblätter zur Charakterisierung von Akteuren"
          ]
        }
      },
      schreiben: {
        "1": {
          title: "Lauttreues Schreiben & Phonologische Bewusstheit",
          goals: [
            "Sichere phonematische Analyse von Wörtern (Anlaut-Inlaut-Auslaut hören)",
            "Graphemtreue Wiedergabe aller gesprochenen Laute eines Wortes",
            "Einhaltung der korrekten Schreibrichtung und Motorik"
          ],
          activities: [
            "Wörter kneten und Buchstaben-Pfad mit Zeigefinger nachspuren",
            "Silben klatschen und auf der motorischen Laute-Tafel weglaufen",
            "Anlaut-Lokalisierung mit Wäscheklammer-Karten"
          ],
          materials: [
            "Sandwanne zur sensomotorischen Schwungübung",
            "Lauttreues Erstschreibhefterl mit illustrativen Bildrätseln",
            "Magnetische Buchstaben-Tafel zur Silbenlegung"
          ]
        },
        "2": {
          title: "Regelgestütztes Orthografie-Training (Wortstämme & Nomen)",
          goals: [
            "Anwendung der Großschreibung bei konkreten Nomen",
            "Erkennen kurzer Stammvokale für die Mitlautverdopplung (z.B. rennen)",
            "Verstehen der Umlautableitung bei Pluralbildung (u-ü, a-ä)"
          ],
          activities: [
            "Das Dosen- oder Schleichdiktat mit Rechtschreibschwerpunkten",
            "Lernwörterschatz sortieren nach Wortarten und Dehnungs-H",
            "Wortstämme-Baukasten: Verwandte Wörter zusammensuchen"
          ],
          materials: [
            "Karteikartensystem ('Wörterklinik') für die Einzelförderung",
            "Lernwortkarten mit farbig abgehobenen Signalstellen",
            "Wortkisten-Sortierbrett für den Freiarbeitsbereich"
          ]
        },
        "3": {
          title: "Phonematische und Morphematische Regelstrukturen",
          goals: [
            "Systematisches Nachweisen von Auslautverhärtungen durch Wortverlängerung",
            "Orthografisch richtige Trennung von St- / Sp- Lauten am Wortanfang",
            "Festigung der Unterscheidung der Wortarten im Satzzusammenhang"
          ],
          activities: [
            "Wortarten-Satzsterne bauen nach Montessori-Farbcodierung",
            "Das Partner-Laufdiktat zur Festigung schwieriger Konsonantenhäufungen",
            "Falsch-Schreib-Detektiv: Fehlertexte korrigieren und Regel benennen"
          ],
          materials: [
            "Symbolklötzchen für Wortartenanalyse (Nomen, Verb, Adjektiv)",
            "Regelgeleitete Diagnose-Kartei für differenzierte Übungsphasen",
            "Österreichischer Grundwortschatz-Lernzirkel"
          ]
        },
        "4": {
          title: "Morphemische Analyse & Grammatikalische Deklination",
          goals: [
            "Sicheres Erkennen schwieriger Fremdwortbestandteile und Dopplungsausnahmen",
            "Beugung substantivierter Verben/Adjektive nach grammatikalischen Regeln",
            "Analytische Bestimmung der 4 Fälle (Nominativ, Genitiv, Dativ, Akkusativ)"
          ],
          activities: [
            "Fall-Würfelspiele: Nomen anhand gewürfelten Kasus beugen",
            "Systematisches Morphem-Training zur Ableitung von Stammwörtern",
            "Satzglied-Schachteln: Sätze zerschneiden, umstellen und bestimmen"
          ],
          materials: [
            "Grammatikalische Arbeitsmappe mit Kasus-Rätseln",
            "Übersichtstafeln zur Mitlaut-Verdopplung und Auslauten",
            "Wortsuchkartei zur Lokalisierung von Nominalisierungspfaden"
          ]
        }
      },
      mathe: {
        "1": {
          title: "Zahlzerlegung & Operationsverständnis ZR 10",
          goals: [
            "Automatisierung der Zahlzerlegung im Bereich bis 10 ('Verliebte Zahlen')",
            "Mengen-Zahl-Zuordnung bis 10 und Simultanerfassung bis 5 (Kraft der 5)",
            "Verständnis der Rechenoperationen Addition (+) und Subtraktion (-)"
          ],
          activities: [
            "Schüttelbecher-Übungen mit Bohnen (Zerlegung spielerisch festigen)",
            "Blitzblick-Spiele: Punktebilder auf einen Blick erfassen und nennen",
            "Wortgestützte Sachaufgaben mit Rechenmaterial nachlegen"
          ],
          materials: [
            "Zehnerfeld-Legebrett und rote/blaue Wendeplättchen",
            "Rechenschiffchen für das haptische Handeln",
            "Schüttelboxen mit transparenter Kontrollscheibe"
          ]
        },
        "2": {
          title: "Zahlenraumerweiterung ZR 100 & Kleines Einmaleins",
          goals: [
            "Sicherer Zehnerübergang beim Addieren und Subtrahieren im ZR 100",
            "Verständnis der Multiplikation als wiederholte Addition",
            "Automatisierung der grundlegenden Einmaleinsreihen (2er, 5er, 10er)"
          ],
          activities: [
            "Hüpfen am Rechenstrich auf dem Fußboden zur Visualisierung der Schritte",
            "Einmaleins-Reihen singend oder klatschend im Rhythmus rhythmisieren",
            "Zahlenrätsel: Zehner-Einer-Spiele mit Stellenwertplättchen"
          ],
          materials: [
            "Das Hunderterfeld mit Abdeckplättchen für Strukturübungen",
            "Dienes-Mehrsystem-Stäbchen (Zehnerstangen, Einerwürfel)",
            "Einmaleins-Fächer für das schnelle selbstständige Üben"
          ]
        },
        "3": {
          title: "Stellenwert-Festigung & Halbschriftliche Rechenverfahren",
          goals: [
            "Tiefes Verständnis des Stellenwertsystems im ZR 1000 (H, Z, E)",
            "Flüssiges halbschriftliches Addieren und Subtrahieren dreistelliger Zahlen",
            "Umkehroperator bei Divisionen sicher nutzen (Verteilen und Aufteilen)"
          ],
          activities: [
            "Stellenwerthüpfen: Beträge mit Dezimalmaterial legen und tauschen (10E -> 1Z)",
            "Brombeeren-Verteilspiele: Rechengeld gerecht an Kobolde aufteilen",
            "Tägliches 10-Aufgaben-Einmaleins-Feuerwerk als Erwärmung"
          ],
          materials: [
            "Stellenwert-Schieber (H-Z-E) für das haptische Begreifen des Systems",
            "Rechengeld-Koffersätze für alltagsnahe Sachrechnungen",
            "Übungskartei für halbschriftliche Division und Multiplikation"
          ]
        },
        "4": {
          title: "Formale Gleichungen, Winkel & Komplexe Flächenberechnungen",
          goals: [
            "Lösen einfacher Gleichungen mit Variablen durch logisches Umkehren",
            "Flächen- und Umfangsberechnung bei rechteckigen Körpern mit Formeln",
            "Ablesen und Bestimmen geometrischer Winkel (Rechter Winkel)"
          ],
          activities: [
            "Gleichungs-Waage: Gewichte verschieben um X links/rechts freizustellen",
            "Heilkräuter-Beet zeichnen, Flächen m² berechnen und einfärben",
            "Winkel-Suchjagd in der Klasse mit dem Geodreieck"
          ],
          materials: [
            "Geodreieck und Zirkel für präzises konstruktives Arbeiten",
            "Modell-Balkenwaage zur Gleichungsveranschaulichung",
            "Kartei mit anspruchsvollen Sachrechenaufgaben"
          ]
        }
      },
      kognition: {
        "1": {
          title: "Seriation, Symmetrie und Visuelle Diskriminierung",
          goals: [
            "Logisches Fortsetzen visueller Musterreihen nach Form und Farbe",
            "Präzises Unterscheiden von Figur und Grund (Suchbilder)",
            "Koordinierung und Orientierung im zweidimensionalen Raum"
          ],
          activities: [
            "Legen logischer Muster nach Vorlage mit farbigen Holzsteinchen",
            "Zuordnen von symmetrischen Schnittflächen und Schattenumrissen",
            "Spiegelbildliche Muster zeichnen am Raster"
          ],
          materials: [
            "Pattern Blocks mit Vorlagenkarten (ansteigendes Niveau)",
            "Schattenzuordnungsmemory aus festem Karton",
            "Spiegelbox zur achsensymmetrischen Selbstkontrolle"
          ]
        },
        "2": {
          title: "Räumliches Vorstellungsvermögen & Zeitlich-Logische Rhythmen",
          goals: [
            "Mentale Rotation einfacher zweidimensionaler geometrischer Formen",
            "Erfassen zyklischer Zeitabläufe (Wochentage, Monate, Jahreszeiten)",
            "Systematik logischer Kategorisierungen im Alltag"
          ],
          activities: [
            "Tägliches Drehen der Datumsuhr und Zuordnung der Jahreszeitenbilder",
            "Mentale Zuordnung von gedrehten Puzzlestücken",
            "Experimentieren mit flüssigen Lebensmittelfarben (Komplementärmischung)"
          ],
          materials: [
            "Didaktische Wochentags- und Monatsräder",
            "Farbkreis-Drehscheibe nach Itten",
            "Symmetriespiegel für Freiarbeitsphasen"
          ]
        },
        "3": {
          title: "Orientierung im Raum, Kartenkunde & Logische Abläufe",
          goals: [
            "Verständnis der vier Himmelsrichtungen zur räumlichen Orientierung",
            "Kartenverständnis und Maßstabsrechnen an einfachen Skizzen",
            "Logisches Strukturieren komplexerer biologischer Gliederungsketten"
          ],
          activities: [
            "Klassenzimmer-Schnitzeljagd anhand von Himmelsrichtungsbefehlen",
            "Stammbäume und Tierklassen logisch gliedern",
            "Spiegelbildkartierung von anspruchsvollen asymmetrischen Mustern"
          ],
          materials: [
            "Funktionstüchtiger Wanderkompass für den Schulhofbetrieb",
            "Lageplan des Schulgeländes mit Kompassrose",
            "Logicals für Kinder zur strukturierten Informationsverknüpfung"
          ]
        },
        "4": {
          title: "Historische Kausalkonstruktion & Systemische Wechselwirkungen",
          goals: [
            "Erfassen systemischer Kreisläufe (Sonnensystem, Organsysteme)",
            "Erkennen historischer Schüsselereignisse und Kausalitäten",
            "Komplexes logisches Schließen und Ableiten von Sachverhalten"
          ],
          activities: [
            "Ursache-Wirkungsketten als Mindmap zeichnen",
            "Modellbau des Planetenkarussells nach astronomischen Kennwerten",
            "Vorbereitung und Durchführung einer Debatte zu Erfindungen (Buchdruck)"
          ],
          materials: [
            "Anspruchsvolle Rätselhefte (Bento-grid Logicals, Sudoku)",
            "Schulmodell des menschlichen Körpers mit herausnehmbaren Organen",
            "Detaillierte Geschichtsdokumente zum Zeitalter Gutenbergs"
          ]
        }
      }
    };
    return plans;
  }, []);

  const activeRank = useMemo(() => {
    if (totalPoints >= 15) return { label: "Magischer Großmeister 🌟", sub: "Herausragende Leistungen in allen Bereichen", medal: "🥇" };
    if (totalPoints >= 10) return { label: "Talentierter Waldhüter 🌲", sub: "Sichere Kenntnisse mit kleinen Fehltritten", medal: "🥈" };
    return { label: "Ehrgeiziger Zauberlehrling 🧪", sub: "Gute Ansätze, vertiefende Übungen empfohlen", medal: "🥉" };
  }, [totalPoints]);

  return (
    <div className="bg-slate-900 border border-slate-800 p-5 sm:p-7 rounded-[2rem] space-y-6 text-slate-100 flex flex-col justify-between w-full h-full font-sans">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-[1rem] leading-normal sm:text-[1.125rem] leading-normal font-black text-amber-300 flex items-center gap-2">
            <Trophy size={18} className="text-amber-400 shrink-0 animate-bounce" />
            <span>Koppelungsprofil & Diagnose: {activeStudentName}</span>
          </h3>
          <p className="text-[0.625rem] text-slate-400 uppercase tracking-widest font-black mt-0.5">
            Österreichischer Bildungsstandard • Schulstufe {selectedGrade}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCertificate(true)}
            className="bg-gradient-to-tr from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 px-3.5 py-1.5 rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Award size={14} /> Meisterurkunde
          </button>
        </div>
      </div>

      {/* Navigation tabs for feedback options */}
      <div className="flex border-b border-slate-800/80 p-0.5 max-w-2xl">
        {[
          { id: "cockpit", label: "📊 Kompetenz-Cockpit", icon: <Activity size={12} /> },
          { id: "foerderplan", label: "🌱 Pädagogischer Förderplan", icon: <Heart size={12} /> },
          { id: "standards", label: "📜 BiST-Standards Log", icon: <FileText size={12} /> },
          { id: "historie", label: "📈 Entwicklungsverlauf", icon: <TrendingUp size={12} /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 px-3 text-[0.6875rem] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white font-black shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            {tab.icon}
            <span>{tab.label.split(" ")[1] || tab.label}</span>
          </button>
        ))}
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeTab === "cockpit" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Radar polar diagram */}
            <div className="col-span-1 lg:col-span-6 bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col items-center justify-center min-h-[290px]">
              <span className="text-[0.625rem] font-black uppercase tracking-widest text-indigo-400 mb-2 block border-b border-slate-800 w-full pb-1.5 text-center">
                🌌 Kompetenz-Netzdiagramm (Stärken-Kompass)
              </span>
              {radarChartSvg}
            </div>

            {/* Baseline Benchmarking Bar Chart */}
            <div className="col-span-1 lg:col-span-6 bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[290px]">
              <span className="text-[0.625rem] font-black uppercase tracking-widest text-emerald-400 mb-2 block border-b border-slate-800 w-full pb-1.5 text-center">
                📊 Standard-Vergleich (Österreichische BiST Schwelle)
              </span>
              <div className="space-y-4 py-2 flex-1 flex flex-col justify-center">
                {domainData.map((dom) => {
                  const isAboveBaseline = dom.percent >= 60; // Austrian BiST minimum benchmark is 60%
                  return (
                    <div key={dom.id} className="space-y-1">
                      <div className="flex justify-between items-center text-[0.625rem] font-black">
                        <span className="flex items-center gap-1.5 text-slate-200">
                          <span>{dom.icon}</span>
                          <span className="uppercase">{dom.id}</span>
                        </span>
                        <span className={isAboveBaseline ? "text-emerald-400" : "text-amber-400"}>
                          {dom.percent}% {isAboveBaseline ? "(Standard erfüllt ✓)" : "(Bedarf Vertiefung ⚠)"}
                        </span>
                      </div>
                      <div className="relative w-full h-3 bg-slate-900 rounded-full  border border-slate-800">
                        {/* 60% standard line separator */}
                        <div className="absolute left-[60%] top-0 bottom-0 w-0.5 bg-rose-500/50 z-10 border-dashed border-l" title="BiST Mindest-Standard (60%)" />
                        
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            dom.percent >= 75
                              ? "bg-gradient-to-r from-emerald-600 to-teal-400"
                              : dom.percent >= 55
                                ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                                : "bg-gradient-to-r from-rose-600 to-orange-400"
                          }`}
                          style={{ width: `${dom.percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="text-[0.5625rem] text-slate-500 font-bold border-t border-slate-800 pt-2 flex justify-between">
                  <span className="flex items-center gap-1 text-rose-400">
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full inline-block" /> 60% Mindest-Schwelle
                  </span>
                  <span>Zielwert: &gt;= 75% Souverän</span>
                </div>
              </div>
            </div>

          </div>

          {/* Detailed Competences & Recommendations */}
          <div className="space-y-3.5">
            <span className="text-[0.625rem] font-black uppercase tracking-widest text-indigo-400 block border-b border-slate-800 pb-1.5 text-left">
              🎯 Förderschwerpunkte und Vorschläge
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {domainData.map((dom) => (
                <div
                  key={dom.id}
                  className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2.5 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between font-black border-b border-slate-800/80 pb-1.5">
                    <span className="text-[0.6875rem] text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <span>{dom.icon}</span>
                      <span>{dom.title}</span>
                    </span>
                    <span className={`text-[0.625rem] px-1.5 py-0.5 rounded font-black border ${dom.statusColor}`}>
                      {dom.statusLabel} ({dom.percent}%)
                    </span>
                  </div>
                  
                  <p className="text-[0.75rem] leading-tight text-slate-400 leading-relaxed font-semibold flex-1">
                    {dom.recommendation}
                  </p>
                  
                  <div className="text-[0.625rem] text-slate-500 font-bold flex justify-between pt-1">
                    <span>Score: {dom.scoreSum} / {dom.maxScore} Pk.</span>
                    <span>{dom.evaluatedCount} Quests abgeschlossen</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REMEDIATION PLAN */}
      {activeTab === "foerderplan" && (
        <div className="space-y-6">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-2">
            <h4 className="text-[0.875rem] leading-snug font-black text-amber-300 flex items-center gap-1.5">
              <Star size={16} className="text-amber-400" />
              <span>Gezielte Förderplanung nach den Österreichischen Leistungsstandards</span>
            </h4>
            <p className="text-[0.75rem] leading-tight text-slate-400 leading-relaxed">
              Basierend auf den Spielergebnissen von <strong className="text-slate-200">{activeStudentName}</strong> wurden die folgenden Übungspläne ermittelt. Drucke diesen Förderplan für Teambesprechungen oder für Elterngespräche aus.
            </p>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {domainData.map((dom) => {
              const details = foerderplanData[dom.id]?.[selectedGrade] || foerderplanData[dom.id]?.["1"];
              const needsSupport = dom.percent < 75;

              return (
                <div
                  key={dom.id}
                  className={`p-5 rounded-2xl border ${
                    needsSupport
                      ? "bg-slate-950/90 border-amber-500/20 shadow-lg shadow-amber-500/5 text-slate-100"
                      : "bg-slate-950/40 border-slate-800 text-slate-400"
                  } space-y-4`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[1.5rem] leading-normal">{dom.icon}</span>
                      <div>
                        <span className="text-[0.75rem] leading-tight font-black uppercase text-slate-400 block">Förderbereich {dom.id.toUpperCase()}</span>
                        <h4 className="text-[0.75rem] leading-tight sm:text-[0.875rem] leading-snug font-extrabold text-slate-100">{details.title}</h4>
                      </div>
                    </div>
                    <span className={`text-[0.625rem] px-2 py-0.5 font-black uppercase rounded border ${
                      needsSupport 
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                        : "bg-slate-900 text-slate-500 border-slate-800"
                    }`}>
                      {needsSupport ? "⚠ Dringlicher Fokus" : "✓ Kompetenz Gesichert"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    
                    {/* Goals card */}
                    <div className="md:col-span-4 space-y-2 bg-black/40 p-3.5 rounded-xl border border-slate-900">
                      <span className="text-[0.625rem] font-black uppercase tracking-wider text-indigo-400 block">🎯 Entwicklungsziele:</span>
                      <ul className="space-y-1.5">
                        {details.goals.map((g, i) => (
                          <li key={i} className="text-[0.6875rem] leading-relaxed font-semibold flex items-start gap-1 text-slate-300">
                            <span className="text-indigo-400 shrink-0 mt-0.5">▪</span>
                            <span>{g}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Weekly activities */}
                    <div className="md:col-span-4 space-y-2 bg-black/40 p-3.5 rounded-xl border border-slate-900">
                      <span className="text-[0.625rem] font-black uppercase tracking-wider text-emerald-400 block">🏃 Wochen-Aktivitäten (Klasse & Hausaufgabe):</span>
                      <ul className="space-y-1.5">
                        {details.activities.map((act, i) => (
                          <li key={i} className="text-[0.6875rem] leading-relaxed font-semibold flex items-start gap-1 text-slate-300">
                            <span className="text-emerald-400 shrink-0 mt-0.5">{i+1}.</span>
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Tools and Concrete materials */}
                    <div className="md:col-span-4 space-y-2 bg-black/40 p-3.5 rounded-xl border border-slate-900">
                      <span className="text-[0.625rem] font-black uppercase tracking-wider text-amber-400 block">📦 Empfohlenes Lernmaterial (Österreich):</span>
                      <ul className="space-y-1.5">
                        {details.materials.map((mat, i) => (
                          <li key={i} className="text-[0.6875rem] leading-relaxed font-semibold flex items-start gap-1 text-slate-300">
                            <span className="text-amber-400 shrink-0 mt-0.5">🛠</span>
                            <span>{mat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: STANDARDS LOG */}
      {activeTab === "standards" && (
        <div className="space-y-4">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
            <span className="text-[0.625rem] font-black uppercase tracking-widest text-indigo-400 block mb-1">
              📜 Lehrplan-Abstimmung der Quests
            </span>
            <p className="text-[0.75rem] leading-tight text-slate-400 leading-relaxed">
              Jede GabicQuest-Prüfung wurde exakt nach den Vorgaben der österreichischen Bundesministerien akkreditiert. Nachstehend ist die lückenlose Zuordnung des Tests gelistet:
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl ">
            <div className="max-h-[460px] overflow-y-auto">
              <table className="w-full text-left text-[0.75rem] leading-tight border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 font-black text-slate-300">
                    <th className="p-3">Nummer</th>
                    <th className="p-3">Aufgabentitel</th>
                    <th className="p-3">Bereich</th>
                    <th className="p-3">Österreichischer Bildungsstandard (BiST)</th>
                    <th className="p-3 text-right">Diagnose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {questTasks
                    .filter((t) => t.id !== 0 && t.id !== 20 && t.id !== 99)
                    .map((task) => {
                      const obs = questObservations[task.id];
                      let ratingLabel = "Nicht erfasst";
                      let ratingColor = "text-slate-500 bg-slate-900/40 border-slate-800";

                      if (obs?.rating) {
                        if (obs.rating === "excellent") {
                          ratingLabel = "Souverän";
                          ratingColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
                        } else if (obs.rating === "satisfied") {
                          ratingLabel = "Teilsicher";
                          ratingColor = "text-blue-400 bg-blue-500/10 border-blue-500/20";
                        } else if (obs.rating === "support_needed") {
                          ratingLabel = "Unterstützung";
                          ratingColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
                        } else if (obs.rating === "not_satisfied") {
                          ratingLabel = "Nicht gelöst";
                          ratingColor = "text-rose-400 bg-rose-500/10 border-rose-500/20";
                        }
                      } else {
                        const crystalSolved = collectedCrystals[task.id - 1];
                        if (crystalSolved) {
                          ratingLabel = "Gelöst";
                          ratingColor = "text-emerald-400 bg-emerald-500/10 border-emerald-550/20";
                        }
                      }

                      return (
                        <tr key={task.id} className="hover:bg-slate-900/30 transition-all">
                          <td className="p-3 font-mono font-black text-slate-500">Q-{task.id}</td>
                          <td className="p-3 font-extrabold text-slate-200">{task.title}</td>
                          <td className="p-3 uppercase text-[0.625rem] font-black text-slate-400">{task.categoryLabel}</td>
                          <td className="p-3 italic text-[0.6875rem] text-indigo-400 font-medium">
                            {task.bildungsstandard || "BiST Allgemeinstandard"}
                          </td>
                          <td className="p-3 text-right">
                            <span className={`px-2 py-0.5 rounded text-[0.625rem] font-black border ${ratingColor}`}>
                              {ratingLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: HISTORIE */}
      {activeTab === "historie" && (
        <div className="space-y-4">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
            <span className="text-[0.625rem] font-black uppercase tracking-widest text-indigo-400 block mb-1">
              📈 Entwicklungsverlauf
            </span>
            <p className="text-[0.75rem] leading-tight text-slate-400 leading-relaxed">
              Verfolge die Leistungsentwicklung von über mehreren Quest-Durchläufe hinweg. Jeder abgeschlossene Durchlauf wird hier mit Datum und Rohwert festgehalten.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
            {historicalRuns.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <Activity className="mx-auto mb-2 opacity-50" size={32} />
                <p className="text-[0.875rem] font-bold">Noch keine abgeschlossenen Durchläufe für dieses Kind gespeichert.</p>
                <p className="text-[0.75rem]">Sobald GabicQuest für {activeStudentName} abgeschlossen und gespeichert wird, erscheint hier der Verlauf.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex w-full items-end h-[150px] border-b border-slate-800 pb-2 relative  gap-4 px-4 overflow-x-auto">
                  {historicalRuns.map((run, i) => {
                    const maxRohwert = 20; // 20 tasks
                    const percent = Math.min(100, Math.max(0, (run.rohwert / maxRohwert) * 100));
                    return (
                      <div key={run.id} className="flex flex-col items-center justify-end h-full gap-2 group min-w-[60px]">
                        <div className="text-[0.625rem] font-black text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          {run.rohwert} Pkt
                        </div>
                        <div 
                          className="w-8 bg-indigo-500/80 rounded-t-sm group-hover:bg-indigo-400 transition-colors relative "
                          style={{ height: `${Math.max(5, percent)}%` }}
                        >
                          <div className="absolute -top-1.5 inset-x-0 h-1 bg-indigo-300 rounded-t-sm"></div>
                        </div>
                        <div className="text-[0.5625rem] font-bold text-slate-500 pt-2 whitespace-nowrap">
                          {new Date(run.datum).toLocaleDateString("de-AT")}
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                <table className="w-full text-left text-[0.75rem] leading-tight border-collapse mt-8">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[0.625rem]">
                      <th className="pb-2">Datum</th>
                      <th className="pb-2 text-right">Rohwert (Punkte)</th>
                      <th className="pb-2 text-right">Fortschritt</th>
                      <th className="pb-2 px-4">Anmerkung</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {[...historicalRuns].reverse().map((run, i, arr) => {
                      const prevIndex = arr.length - 1 - i - 1; // get index in original (non-reversed) array
                      const prevRun = prevIndex >= 0 ? historicalRuns[prevIndex] : null;
                      const diff = prevRun ? run.rohwert - prevRun.rohwert : 0;
                      return (
                        <tr key={run.id} className="hover:bg-slate-900/40">
                          <td className="py-3 text-slate-300 font-bold">{new Date(run.datum).toLocaleDateString("de-AT")}</td>
                          <td className="py-3 text-right text-indigo-300 font-black font-mono">{run.rohwert} / 20</td>
                          <td className="py-3 text-right text-[0.6875rem] font-bold">
                            {diff > 0 && <span className="text-emerald-400">+{diff} Pkt</span>}
                            {diff < 0 && <span className="text-rose-400">{diff} Pkt</span>}
                            {diff === 0 && prevRun && <span className="text-slate-500">Unverändert</span>}
                            {!prevRun && <span className="text-slate-600">-</span>}
                          </td>
                          <td className="py-3 px-4 text-slate-400 italic truncate max-w-[200px]" title={run.kommentar || "-"}>
                            {run.kommentar || "-"} <span className="text-slate-600 block text-[0.5rem] not-italic">{run.durchgefuehrtVon}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom info banner */}
      <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between gap-4 text-left">
        <div className="flex items-center gap-2.5">
          <span className="text-[1.875rem] leading-tight">{activeRank.medal}</span>
          <div>
            <span className="text-[0.75rem] leading-tight font-black text-amber-300 block">{activeRank.label}</span>
            <span className="text-[0.625rem] text-slate-400 font-semibold">{activeRank.sub}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[0.5625rem] font-black uppercase text-slate-500 block">Gesamtbericht</span>
          <span className="text-[0.875rem] leading-snug font-mono font-black text-slate-100">{totalPoints.toFixed(1)} / 20.0 Pk.</span>
        </div>
      </div>

      {/* =========================================================================
          WIZARD MASTER CERTIFICATE MODAL
          ========================================================================= */}
      {showCertificate && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 p-4 overflow-y-auto backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 max-w-2xl w-full text-slate-100 shadow-2xl space-y-6">
            
            {/* Modal Controls */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-880 no-print">
              <span className="text-[0.75rem] leading-tight font-black uppercase tracking-widest text-amber-300 flex items-center gap-1">
                🏰 Abenteuer-Druckstudio
              </span>
              <div className="flex gap-2">
                
                <button
                  onClick={() => setShowCertificate(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[0.75rem] leading-tight font-black uppercase"
                >
                  Schließen
                </button>
              </div>
            </div>

            {/* Printable Area with Beautiful Golden Wizard Seals & Borders */}
            <div className="print-area bg-amber-50 rounded-[1.5rem] border-[10px] border-double border-amber-600 text-slate-900 p-6 sm:p-10 relative  shadow-2xl text-center font-sans space-y-6 mx-auto max-w-lg min-h-[480px]">
              
              {/* Corner Ornaments */}
              <div className="absolute top-3 left-3 w-8 h-8 border-t-4 border-l-4 border-amber-600" />
              <div className="absolute top-3 right-3 w-8 h-8 border-t-4 border-r-4 border-amber-600" />
              <div className="absolute bottom-3 left-3 w-8 h-8 border-b-4 border-l-4 border-amber-600" />
              <div className="absolute bottom-3 right-3 w-8 h-8 border-b-4 border-r-4 border-amber-600" />

              {/* Header Medallions */}
              <div className="flex justify-center items-center flex-col space-y-2 mt-4">
                <span className="text-slate-500 font-mono tracking-[0.2em] text-[0.625rem] font-black uppercase">
                  🌲 ZAUBERWALD-AKADEMIE DER MEISTER 🌲
                </span>
                <span className="block h-0.5 w-24 bg-gradient-to-r from-transparent via-amber-600 to-transparent" />
              </div>

              {/* Title Header */}
              <div className="space-y-1.5">
                <h1 className="text-[1.5rem] leading-normal sm:text-[1.875rem] leading-tight font-serif font-black tracking-wide text-amber-900 uppercase">
                  MAGIERURKUNDE
                </h1>
                <p className="text-[0.75rem] leading-tight text-slate-600 italic leading-relaxed max-w-md mx-auto font-medium">
                  Für außergewöhnliche Geistesleistungen, linguistische Bravour und arithmetischen Heldenmut im verzauberten Buchstabenwald.
                </p>
              </div>

              {/* Student Frame */}
              <div className="py-2 inline-block">
                <span className="text-[0.625rem] uppercase font-black tracking-widest text-slate-400 block">Draufgänger-Ritter</span>
                <h2 className="text-[1.25rem] leading-normal sm:text-[1.5rem] leading-normal font-serif font-black underline decoration-amber-600 decoration-offset-4 decoration-2 text-slate-800">
                  {activeStudentName}
                </h2>
              </div>

              {/* Statement Description */}
              <div className="space-y-4 text-[0.75rem] leading-tight font-medium text-slate-700 max-w-md mx-auto leading-relaxed">
                <p>
                  Das königliche Kind hat erfolgreich alle <strong className="font-extrabold text-amber-900">20 magischen Prüfungen</strong> des Elfenpults in der{" "}
                  <strong className="font-extrabold text-slate-800">Schulstufe Klasse {selectedGrade}</strong> durchquert.
                </p>
                <p className="italic bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl font-semibold text-slate-800">
                  🏆 Mit Bravour erworbenes Prädikat: <span className="font-black text-amber-950 uppercase">{activeRank.label}</span>
                </p>
              </div>

              {/* Footer seals and signature lines */}
              <div className="grid grid-cols-2 gap-4 items-center pt-6 pb-2 border-t border-dashed border-slate-300">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-amber-50 font-black shadow-lg shadow-amber-600/20 text-[1.875rem] leading-tight select-none outline-4 outline-double outline-amber-700 border border-amber-500">
                    👑
                  </div>
                  <span className="text-[0.5rem] tracking-wide text-amber-800 font-black uppercase mt-1">SIEGEL DES WALDES</span>
                </div>
                
                <div className="text-center space-y-1">
                  <div className="h-8 border-b-2 border-slate-400 w-28 mx-auto flex items-end justify-center">
                    <span className="font-serif text-[0.6875rem] italic text-slate-600 select-none">Elias & Kimi</span>
                  </div>
                  <span className="text-[0.5rem] text-slate-500 uppercase font-black block">DIE WALDBEGLEITER</span>
                </div>
              </div>

              {/* Date banner */}
              <p className="text-[0.5625rem] text-slate-500 font-bold tracking-wider pt-2 flex items-center justify-center gap-1 font-mono">
                <Calendar size={11} className="text-slate-400" /> Ausgefertigt am {new Date().toLocaleDateString("de-DE")} • GABICQUEST ENGINE
              </p>
            </div>
            
          </div>
        </div>
      )}

      {/* Embedded styles for print optimization */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100vw;
            height: 100vh;
            border: 20px double #b45309 !important;
            padding: 40px !important;
            box-shadow: none !important;
            margin: 0 !important;
            background-color: #fffbeb !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default DiagnosticEvaluationDashboard;
