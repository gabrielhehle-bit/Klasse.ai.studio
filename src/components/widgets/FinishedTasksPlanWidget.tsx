import React, { useState, useEffect } from 'react';
import { 
  Coffee, Wand2, Loader2, Printer, CheckSquare, Palette, BookOpen, 
  GraduationCap, User, Info, CheckCircle2, Award, Users, Clock, 
  Scissors, Smile, Edit3, HelpCircle, Eye, EyeOff, Sparkles, RefreshCw, Star,
  Flag, Zap, Play, Check, Search, Plus, Trash, ChevronRight, Trophy
} from 'lucide-react';
import { askAI } from '../../services/aiService';
import { MaterialItem } from '../../types';

// 1. Preset classroom themes
const TOPIC_PRESETS = [
  { id: 'math_1x1', label: '🧮 Mathe: Einmaleins (1x1)', desc: 'Multiplikation und Division vertiefen' },
  { id: 'german_word_types', label: '✍️ Deutsch: Wortarten bestimmen', desc: 'Nomen, Verben, Adjektive zuordnen' },
  { id: 'nature_animals', label: '🐿️ Sachkunde: Heimische Waldtiere', desc: 'Lebensräume, Nahrung und Fährten' },
  { id: 'math_addition', label: '➕ Mathe: Schriftliche Rechenverfahren', desc: 'Sichere Addition & Subtraktion im Zahlenraum' },
  { id: 'german_description', label: '🗣️ Deutsch: Personenbeschreibung & Adjektive', desc: 'Kreatives Schreiben und Charakterisierung' },
  { id: 'nature_water', label: '💧 Sachkunde: Wasserkreislauf & Wetter', desc: 'Aggregatzustände und Umweltbeobachtung' },
  { id: 'math_geometry', label: '📐 Mathe: Geometrie & Symmetrie', desc: 'Spiegelachsen und geometrische Formen' },
  { id: 'german_reading', label: '📖 Deutsch: Leseverständnis & Sätze bauen', desc: 'Sinnentnehmendes Lesen und Grammatik' },
  { id: 'nature_geography', label: '🗺️ Sachkunde: Unser Bundesland & Heimat', desc: 'Orientierung, Flüsse und Geographie' },
  { id: 'english_basics', label: '🇬🇧 Englisch: Colors, Animals & Numbers', desc: 'Grundwortschatz spielerisch üben' },
  { id: 'custom', label: '✨ Eigenes aktuelles Unterrichtsthema...', desc: 'Ganz individuelles Thema eintippen' }
];

// 2. Reward Badge presets
const REWARD_STAMPS = [
  { id: 'star_hero', label: '🌟 Sternen-Held/in', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'expert', label: '🏆 Experten-Diplom', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'creative', label: '🎨 Kreativ-Kopf', bg: 'bg-pink-50 text-pink-700 border-pink-200' },
  { id: 'thinker', label: '🧠 Denk-Meister/in', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

// 3. Instant Zero-Prep ideas (No AI needed)
const INSTANT_SPARK_IDEAS = [
  { title: "🔎 Der Klassen-Detektiv", desc: "Finde 5 Gegenstände im Klassenzimmer, die mit dem ersten Buchstaben deines Namens anfangen und zeichne sie.", duration: "5-10 Min", social: "Einzelarbeit" },
  { title: "🎲 Blitzrechen-Duell", desc: "Suche dir eine/n Partner/in, der/die auch fertig ist. Würfelt oder stellt euch abwechselnd 10 Kopfrechen-Aufgaben.", duration: "10 Min", social: "Partnerarbeit" },
  { title: "📝 Wort-Akrobatik", desc: "Finde so viele Wörter wie möglich, die mit dem letzten Buchstaben des vorigen Wortes anfangen (z.B. Hund - Dose - Esel).", duration: "5-10 Min", social: "Einzelarbeit" },
  { title: "👾 Symmetrie-Monster", desc: "Falte ein Papier in der Mitte. Zeichne auf eine Seite ein halbes Monster und versuche, die andere Seite genau spiegelverkehrt zu ergänzen.", duration: "10-15 Min", social: "Einzelarbeit" },
  { title: "🤝 Der fliegende Helfer", desc: "Melde dich leise bei deiner Lehrerin. Hilf einem Mitschüler ganz ruhig bei einer Rechenaufgabe, ohne die Lösung direkt zu verraten.", duration: "15 Min", social: "Helfersystem" },
  { title: "📖 Lesekönig-Zirkel", desc: "Schnapp dir dein Lieblingsbuch aus der Leseecke, lies zwei Seiten flüsternd rückwärts und unterstreiche alle Nomen mit Bleistift.", duration: "10 Min", social: "Einzelarbeit" },
];

// 4. Default mock materials in library for demonstration
const FALLBACK_MATERIALS: MaterialItem[] = [
  {
    id: 'm1',
    titel: '🧩 Die magischen Zahlenpyramiden',
    beschreibung: 'Knifflige Rechenmauern im Zahlenraum 1000 für clevere Rechner.',
    typ: 'sonstiges',
    faecher: ['Mathematik'],
    schulstufen: [2, 3, 4],
    tags: ['Knobeln', 'Arithmetik', 'Rechnen'],
    schwierigkeit: 'anspruchsvoll',
    favorit: true,
    kiGeneriert: false,
    erstelltAm: '2026-06-20',
    inhaltText: `<h3>🧩 Die magischen Zahlenpyramiden</h3>
<p>Löse die Rechenmauern, indem du die Zahlen addierst. Aber Achtung! Manche Steine sind verdeckt und erfordern echtes Detektiv-Gespür.</p>
<ul>
  <li><b>Aufgabe 1:</b> Der untere linke Stein hat die Zahl 15, der mittlere Stein hat 24. Wie heißt der rechte Stein, wenn der obere Stein 50 ergibt?</li>
  <li><b>Aufgabe 2:</b> Baue deine eigene Pyramide mit 4 Etagen, sodass an der Spitze genau die Zahl 100 steht!</li>
</ul>`
  },
  {
    id: 'm2',
    titel: '✍️ Wortarten-Detektive',
    beschreibung: 'Finde die versteckten Nomen und Verben und ordne sie in die richtige Detektiv-Tabelle ein.',
    typ: 'sonstiges',
    faecher: ['Deutsch'],
    schulstufen: [2, 3],
    tags: ['Grammatik', 'Nomen', 'Verben'],
    schwierigkeit: 'mittel',
    favorit: false,
    kiGeneriert: false,
    erstelltAm: '2026-06-18',
    inhaltText: `<h3>✍️ Wortarten-Detektive</h3>
<p>Lies den folgenden Text aufmerksam durch und filtere alle Nomen (Namenwörter) und Verben (Tunwörter) heraus:</p>
<p><i>"Die kleine Eule heult leise im dichten Wald. Sie sucht ihren bunten Ball, der gestern unter den großen Busch rollte."</i></p>
<ul>
  <li><b>Nomen:</b> Eule, Wald, Ball, Busch</li>
  <li><b>Verben:</b> heult, sucht, rollte</li>
  <li><b>Bonus:</b> Finde die zwei Adjektive (Wiewörter) im Text!</li>
</ul>`
  },
  {
    id: 'm3',
    titel: '🐿️ Das heimische Wald-Quiz',
    beschreibung: 'Spannendes Zuordnungsspiel zu Bäumen, Früchten und den Fußspuren der Tiere des Waldes.',
    typ: 'sonstiges',
    faecher: ['Sachunterricht'],
    schulstufen: [1, 2, 3, 4],
    tags: ['Tiere', 'Wald', 'Natur'],
    schwierigkeit: 'einfach',
    favorit: true,
    kiGeneriert: false,
    erstelltAm: '2026-06-25',
    inhaltText: `<h3>🐿️ Das heimische Wald-Quiz</h3>
<p>Beantworte die Fragen rund um den Lebensraum Wald:</p>
<ol>
  <li>Welches Waldtier sammelt Nüsse und vergräbt sie als Vorrat für den Winter? (Tipp: Es hat einen buschigen Schwanz!)</li>
  <li>Welcher Baum hat Blätter mit abgerundeten Zacken und trägt Eicheln als Früchte?</li>
  <li>Welcher Vogel klopft laut an Baumstämme, um Käfer zu finden?</li>
</ol>
<p><b>Zeichenaufgabe:</b> Zeichne die Pfotenspur eines Hasen in dein Heft!</p>`
  },
  {
    id: 'm4',
    titel: '🇬🇧 English: Colors and Animals Zoo',
    beschreibung: 'A playful vocabulary matching and drawing game about safari animals and their colors.',
    typ: 'sonstiges',
    faecher: ['Englisch'],
    schulstufen: [2, 3, 4],
    tags: ['Englisch', 'Colors', 'Animals'],
    schwierigkeit: 'einfach',
    favorit: false,
    kiGeneriert: false,
    erstelltAm: '2026-06-21',
    inhaltText: `<h3>🇬🇧 English: Colors and Animals Zoo</h3>
<p>Draw the following crazy animals in your notebook:</p>
<ul>
  <li>A <b>blue monkey</b> wearing a green hat.</li>
  <li>A <b>pink elephant</b> with yellow ears.</li>
  <li>A <b>black and red tiger</b> sleeping under a tree.</li>
</ul>
<p>Write down the English names for these animals: Löwe, Giraffe, Bär, Schlange.</p>`
  },
  {
    id: 'm5',
    titel: '📐 Geometrie-Meister: Symmetrie-Zeichnen',
    beschreibung: 'Ergänze die Spiegelachsen von anspruchsvollen Mustern und Figuren.',
    typ: 'sonstiges',
    faecher: ['Mathematik'],
    schulstufen: [3, 4],
    tags: ['Geometrie', 'Symmetrie', 'Zeichnen'],
    schwierigkeit: 'mittel',
    favorit: false,
    kiGeneriert: false,
    erstelltAm: '2026-06-26',
    inhaltText: `<h3>📐 Geometrie-Meister: Symmetrie-Zeichnen</h3>
<p>Nimm dein Lineal und ein kariertes Blatt zur Hand:</p>
<ul>
  <li><b>Aufgabe 1:</b> Zeichne eine vertikale Spiegelachse in die Mitte deines Blattes. Zeichne links eine Treppe mit 5 Stufen (jeweils 2 Kästchen hoch und breit). Spiegle die Treppe exakt auf die rechte Seite!</li>
  <li><b>Aufgabe 2:</b> Welche dieser Buchstaben sind symmetrisch? Schreibe sie auf und zeichne ihre Symmetrieachsen ein: A, B, F, H, O, T, S.</li>
</ul>`
  }
];

interface SavedPlan {
  id: string;
  studentName: string;
  topic: string;
  timestamp: string;
  html: string;
}

export default function FinishedTasksPlanWidget({ app }: { app: any }) {
  // Widget Tab State
  const [activeTab, setActiveTab] = useState<'lernpfad' | 'generator'>('lernpfad');

  // Base structures
  const students = app.schueler || [];
  const displayStudents = students.length > 0 ? students : [
    { id: 's_luca', vorname: 'Luca', nachname: 'Müller', notiz: 'Arbeitet schnell, braucht kognitive Forderung', charakter: ['mathematisch begabt', 'ruhig'], foerderprofil: { staerken: ['Rechnen', 'Logik'], foerderbedarfBereiche: [] } },
    { id: 's_emma', vorname: 'Emma', nachname: 'Gruber', notiz: 'Gestaltet leidenschaftlich gerne', charakter: ['kreativ', 'hilfsbereit'], foerderprofil: { staerken: ['Feinmotorik', 'Zeichnen'], foerderbedarfBereiche: ['Rechtschreibung'] } },
    { id: 's_noah', vorname: 'Noah', nachname: 'Brunner', notiz: 'Schnell abgelenkt, braucht klare Struktur', charakter: ['lebhaft', 'auditiv'], foerderprofil: { staerken: ['Sprechen', 'Lesen'], foerderbedarfBereiche: ['Mathematik'] } },
    { id: 's_mia', vorname: 'Mia', nachname: 'Hofer', notiz: 'Braucht visuelle Hilfestellungen', charakter: ['fleißig', 'schüchtern'], foerderprofil: { staerken: ['Leseverständnis'], foerderbedarfBereiche: ['Kopfrechnen'] } },
  ];

  // 1. Interactive Learning Path States
  const [studentStatuses, setStudentStatuses] = useState<Record<string, {
    status: 'idle' | 'waiting' | 'assigned' | 'completed';
    assignedChallengeId?: string;
    assignedChallengeTitle?: string;
    assignedChallengeContent?: string;
    earnedBadgeId?: string;
    earnedStars?: number;
    reflectionSmiley?: 'super' | 'okay' | 'hard';
  }>>({});
  
  const [initialized, setInitialized] = useState(false);
  const [selectedPathStudentId, setSelectedPathStudentId] = useState<string>('');
  const [customMaterials, setCustomMaterials] = useState<MaterialItem[]>([]);
  const [aiGeneratingChallengeForStudent, setAiGeneratingChallengeForStudent] = useState<string | null>(null);
  
  // Learning path search/filter states
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');
  const [materialSubjectFilter, setMaterialSubjectFilter] = useState('all');
  const [studentFilter, setStudentFilter] = useState<'all' | 'idle' | 'waiting' | 'assigned' | 'completed'>('all');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // Completion Dialog States
  const [completingStudentId, setCompletingStudentId] = useState<string | null>(null);
  const [completionBadge, setCompletionBadge] = useState<string>('star_hero');
  const [completionStars, setCompletionStars] = useState<number>(3);
  const [completionSmiley, setCompletionSmiley] = useState<'super' | 'okay' | 'hard'>('super');
  const [confettiActive, setConfettiActive] = useState(false);

  // 2. Sheet Generator States (from previous implementation)
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('math_1x1');
  const [customTopic, setCustomTopic] = useState<string>('');
  const [selectedBadge, setSelectedBadge] = useState<string>('star_hero');
  const [starCount, setStarCount] = useState<number>(3);
  const [socialForm, setSocialForm] = useState<'individual' | 'partner' | 'helper'>('individual');
  const [estimatedDuration, setEstimatedDuration] = useState<'short' | 'medium' | 'long'>('medium');
  const [scaffoldingEnabled, setScaffoldingEnabled] = useState<boolean>(false);
  const [showSolutionKey, setShowSolutionKey] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [editedResult, setEditedResult] = useState<string>('');
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [materials, setMaterials] = useState({
    coloredPencils: true,
    scissorsGlue: false,
    tablet: false,
    notebook: true,
    geometryTools: false,
  });
  const [selectedCategories, setSelectedCategories] = useState({
    artCraft: true,
    sraReading: true,
    academicPractice: true,
  });
  const [difficultyLevel, setDifficultyLevel] = useState<'standard' | 'challenging' | 'creative'>('challenging');

  // States for reflection questions
  const [reflectionQuestions, setReflectionQuestions] = useState<string[] | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [questionsCopied, setQuestionsCopied] = useState<boolean>(false);

  // Initialize status once to give a lively real-time feeling
  useEffect(() => {
    if (!initialized) {
      const initial: Record<string, any> = {};
      const list = students.length > 0 ? students : displayStudents;
      
      list.forEach((s: any, idx: number) => {
        if (idx === 0) {
          initial[s.id] = { 
            status: 'assigned', 
            assignedChallengeId: 'm1', 
            assignedChallengeTitle: '🧩 Die magischen Zahlenpyramiden',
            assignedChallengeContent: FALLBACK_MATERIALS[0].inhaltText
          };
        } else if (idx === 1) {
          initial[s.id] = { status: 'waiting' };
        } else if (idx === 2) {
          initial[s.id] = { status: 'idle' };
        } else {
          initial[s.id] = { 
            status: 'completed', 
            assignedChallengeId: 'm3', 
            assignedChallengeTitle: '🐿️ Das heimische Wald-Quiz', 
            assignedChallengeContent: FALLBACK_MATERIALS[2].inhaltText,
            earnedBadgeId: 'star_hero', 
            earnedStars: 3, 
            reflectionSmiley: 'super' 
          };
        }
      });
      setStudentStatuses(initial);
      setInitialized(true);
      if (list.length > 0) {
        setSelectedPathStudentId(list[0].id);
      }
    }
  }, [students, initialized]);

  // Combine parent materials with session-created ones and fallback presets
  const getMergedMaterials = (): MaterialItem[] => {
    const parentList = app.materialien || [];
    const merged = [...customMaterials, ...parentList];
    FALLBACK_MATERIALS.forEach(item => {
      if (!merged.some(m => m.id === item.id || m.titel.toLowerCase() === item.titel.toLowerCase())) {
        merged.push(item);
      }
    });
    return merged;
  };

  // Automatically suggest materials based on topic, grade & student profile
  const getSuggestedMaterials = (student: any): MaterialItem[] => {
    const allMaterials = getMergedMaterials();
    const activePreset = TOPIC_PRESETS.find(p => p.id === selectedPresetId);
    const topicLabel = selectedPresetId === 'custom' ? customTopic : (activePreset ? activePreset.label : '');
    const normTopic = topicLabel.toLowerCase();

    // Subject mapping
    const subjects: string[] = [];
    if (normTopic.includes('mathe') || normTopic.includes('1x1') || normTopic.includes('rechen') || selectedPresetId.startsWith('math')) {
      subjects.push('Mathematik');
    }
    if (normTopic.includes('deutsch') || normTopic.includes('wort') || normTopic.includes('lese') || selectedPresetId.startsWith('german')) {
      subjects.push('Deutsch');
    }
    if (normTopic.includes('sachkunde') || normTopic.includes('natur') || normTopic.includes('wasser') || normTopic.includes('tier') || selectedPresetId.startsWith('nature')) {
      subjects.push('Sachunterricht', 'Sachkunde');
    }
    if (normTopic.includes('englisch') || selectedPresetId.startsWith('english')) {
      subjects.push('Englisch');
    }

    // Filter by subject & grade
    let matches = allMaterials.filter(m => {
      const subjectMatch = m.faecher.some(f => subjects.some(s => s.toLowerCase() === f.toLowerCase()));
      const studentGrade = app.stufe || 3;
      const gradeMatch = m.schulstufen.includes(studentGrade);
      return subjectMatch && gradeMatch;
    });

    if (matches.length === 0) {
      // Fallback: match subject only
      matches = allMaterials.filter(m => {
        return m.faecher.some(f => subjects.some(s => s.toLowerCase() === f.toLowerCase()));
      });
    }

    if (matches.length === 0) {
      // Ultimate fallback: return everything
      return allMaterials;
    }

    return matches;
  };

  // Toggle student finished status
  const handleToggleStudentFinished = (studentId: string) => {
    setStudentStatuses(prev => {
      const current = prev[studentId]?.status || 'idle';
      let nextStatus: 'idle' | 'waiting' | 'assigned' | 'completed' = 'idle';
      if (current === 'idle') nextStatus = 'waiting';
      else if (current === 'waiting') nextStatus = 'idle';
      else if (current === 'assigned') nextStatus = 'completed';
      else if (current === 'completed') nextStatus = 'idle';

      return {
        ...prev,
        [studentId]: {
          ...prev[studentId],
          status: nextStatus,
          // Reset assigned details if going back to idle/waiting
          ...(nextStatus === 'idle' || nextStatus === 'waiting' ? {
            assignedChallengeId: undefined,
            assignedChallengeTitle: undefined,
            assignedChallengeContent: undefined,
            earnedBadgeId: undefined,
            earnedStars: undefined,
            reflectionSmiley: undefined
          } : {})
        }
      };
    });
  };

  // Assign challenge from library
  const handleAssignChallenge = (studentId: string, item: MaterialItem) => {
    setStudentStatuses(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status: 'assigned',
        assignedChallengeId: item.id,
        assignedChallengeTitle: item.titel,
        assignedChallengeContent: item.inhaltText || item.beschreibung
      }
    }));
  };

  // Launch custom AI generation for a specific student's profile
  const handleGenerateAIChallenge = async (studentId: string) => {
    const student = (students.length > 0 ? students : displayStudents).find((s: any) => s.id === studentId);
    if (!student) return;

    setAiGeneratingChallengeForStudent(studentId);

    const studentName = student.vorname;
    const grade = app.stufe ? `${app.stufe}. Schulstufe` : '3. Klasse';
    const activePreset = TOPIC_PRESETS.find(p => p.id === selectedPresetId);
    const currentTopicLabel = selectedPresetId === 'custom' 
      ? (customTopic.trim() || 'Individuelles Thema') 
      : (activePreset ? activePreset.label : 'Einmaleins');

    const staerken = student.foerderprofil?.staerken?.join(', ') || 'Kreativität & schnelles Denken';
    const bedarf = student.foerderprofil?.foerderbedarfBereiche?.join(', ') || 'Keine akuten';
    const diff = difficultyLevel === 'standard' ? 'Sinnvolle Festigung' : difficultyLevel === 'challenging' ? 'Knifflige Denkaufgabe' : 'Kreatives Problemlösen';

    const prompt = `Erstelle eine kurze, hoch-differenzierte "Ich bin schon fertig!"-Herausforderung (Mini-Arbeitsblatt oder Lese/Knobel-Aufgabe) für das Kind ${studentName} (${grade}).
- Thema: ${currentTopicLabel}
- Stärken des Kindes: ${staerken}
- Förderbedarf: ${bedarf}
- Differenzierung: ${diff}
- Zeitdauer: ~15 Minuten leise Einzelarbeit.

Gib ein kurzes, extrem motivierendes und direkt lösbares HTML-Fragment zurück (ohne \`\`\`html oder \`\`\`, nur reines HTML), das die Aufgabe enthält. Starte mit einer tollen, kindgerechten Ansprache an das Kind (z.B. "Hey ${studentName}! Du bist heute ein echter Raketen-Rechner! Hier ist deine geheime Detektiv-Spezialmission...") und schließe mit einer kleinen Reflexionsfrage ab.`;

    try {
      const response = await askAI('ki-helfer', prompt);
      const cleanedHtml = response.replace(/```html/g, '').replace(/```/g, '').trim();

      const newId = `ai_challenge_${Date.now()}`;
      const newChallenge: MaterialItem = {
        id: newId,
        titel: `🚀 Spezial-Mission: ${currentTopicLabel} (${studentName})`,
        beschreibung: `Maßgeschneiderte Herausforderung für ${studentName} bzgl. ${currentTopicLabel}`,
        typ: 'sonstiges',
        faecher: [currentTopicLabel.includes('Mathe') || currentTopicLabel.includes('1x1') ? 'Mathematik' : 'Deutsch'],
        schulstufen: [app.stufe || 3],
        tags: ['KI-Generiert', studentName, 'Spezial-Mission'],
        schwierigkeit: difficultyLevel === 'standard' ? 'einfach' : difficultyLevel === 'challenging' ? 'anspruchsvoll' : 'mittel',
        favorit: true,
        kiGeneriert: true,
        erstelltAm: new Date().toISOString().split('T')[0],
        inhaltText: cleanedHtml
      };

      setCustomMaterials(prev => [newChallenge, ...prev]);
      setStudentStatuses(prev => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          status: 'assigned',
          assignedChallengeId: newId,
          assignedChallengeTitle: newChallenge.titel,
          assignedChallengeContent: cleanedHtml
        }
      }));

    } catch (err) {
      console.error("AI Challenge generation failed", err);
    } finally {
      setAiGeneratingChallengeForStudent(null);
    }
  };

  // Open Completion Modal
  const handleOpenCompletionDialog = (studentId: string) => {
    setCompletingStudentId(studentId);
    setCompletionBadge('star_hero');
    setCompletionStars(3);
    setCompletionSmiley('super');
  };

  // Complete & award
  const handleSaveCompletion = () => {
    if (!completingStudentId) return;

    setStudentStatuses(prev => ({
      ...prev,
      [completingStudentId]: {
        ...prev[completingStudentId],
        status: 'completed',
        earnedBadgeId: completionBadge,
        earnedStars: completionStars,
        reflectionSmiley: completionSmiley
      }
    }));

    setCompletingStudentId(null);
    setConfettiActive(true);
    setTimeout(() => {
      setConfettiActive(false);
    }, 3000);
  };

  // Reset Student status to idle
  const handleResetStudent = (studentId: string) => {
    setStudentStatuses(prev => ({
      ...prev,
      [studentId]: {
        status: 'idle',
        assignedChallengeId: undefined,
        assignedChallengeTitle: undefined,
        assignedChallengeContent: undefined,
        earnedBadgeId: undefined,
        earnedStars: undefined,
        reflectionSmiley: undefined
      }
    }));
  };

  // Print single assigned challenge as a sheet for the pupil
  const handlePrintChallenge = (studentName: string, challengeTitle: string, challengeHtml: string) => {
    const printWindow = window.open('', '', 'height=800,width=800');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Spezial-Mission für ${studentName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { 
              font-family: 'Inter', sans-serif; 
              line-height: 1.6; 
              color: #1e293b; 
              padding: 2cm;
              background: #fff;
            }
            .header {
              border: 4px dashed #f59e0b;
              border-radius: 1.5rem;
              padding: 1.5rem;
              background-color: #fffbeb;
              margin-bottom: 2.5rem;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            h1 { color: #d97706; margin: 0 0 0.5rem 0; font-size: 24pt; font-weight: 800; }
            h2 { color: #475569; margin: 0; font-size: 14pt; }
            h3 { color: #1e1b4b; border-bottom: 2px solid #f1f5f9; padding-bottom: 0.25rem; font-size: 14pt; font-weight: 800; }
            p { font-size: 11pt; color: #334155; }
            li { font-size: 11pt; color: #334155; margin-bottom: 0.5rem; }
            ul, ol { padding-left: 1.5rem; }
            .badge {
              background-color: #f59e0b;
              color: white;
              font-weight: 800;
              padding: 0.5rem 1rem;
              border-radius: 1rem;
              text-transform: uppercase;
              font-size: 10pt;
              transform: rotate(-2deg);
            }
            .reflection {
              margin-top: 4rem;
              border: 2px dashed #cbd5e1;
              padding: 1rem;
              border-radius: 1rem;
              background: #f8fafc;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Spezial-Mission 🚀</h1>
              <h2>Für: <strong>${studentName}</strong></h2>
            </div>
            <div class="badge">Super-Leistung!</div>
          </div>
          <div style="margin-top: 1.5rem;">
            ${challengeHtml}
          </div>
          <div class="reflection">
            <p style="font-weight: bold; margin-bottom: 0.5rem;">Wie hat dir diese Spezial-Aktivität gefallen?</p>
            <div style="display: flex; gap: 2rem;">
              <span>⬜ 😊 Super</span>
              <span>⬜ 😐 Okay</span>
              <span>⬜ ☹️ Zu schwer/einfach</span>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Print award certificate / diploma for classroom display or taking home
  const handlePrintCertificate = (studentName: string, challengeTitle: string, badgeId: string, stars: number) => {
    const printWindow = window.open('', '', 'height=800,width=800');
    if (!printWindow) return;
    
    const date = new Date().toLocaleDateString('de-DE');
    const badgeLabel = REWARD_STAMPS.find(b => b.id === badgeId)?.label || 'Helden-Auszeichnung';
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Auszeichnung für ${studentName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Inter:wght@400;600;800&display=swap');
            body { 
              padding: 1cm;
              background: #f8fafc;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .border-outer {
              border: 8px double #d97706;
              padding: 2.5rem;
              background: white;
              border-radius: 1.5rem;
              box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 650px;
              width: 100%;
            }
            h1 {
              font-family: 'Playfair Display', serif;
              color: #d97706;
              font-size: 32pt;
              margin: 0 0 1rem 0;
              letter-spacing: 2px;
            }
            p {
              font-family: 'Inter', sans-serif;
              font-size: 13pt;
              color: #475569;
              margin: 0.5rem 0;
            }
            .name {
              font-family: 'Playfair Display', serif;
              font-size: 28pt;
              font-weight: bold;
              color: #1e1b4b;
              border-bottom: 2px solid #f1f5f9;
              display: inline-block;
              padding-bottom: 0.5rem;
              margin: 1.5rem 0;
              font-style: italic;
            }
            .mission {
              font-family: 'Inter', sans-serif;
              font-size: 16pt;
              font-weight: 600;
              color: #4f46e5;
              margin: 1rem 0 1rem 0;
            }
            .badge-label {
              font-family: 'Inter', sans-serif;
              font-size: 14pt;
              font-weight: 800;
              color: #b45309;
              background-color: #fef3c7;
              padding: 0.4rem 1rem;
              border-radius: 1rem;
              display: inline-block;
              margin-bottom: 1.5rem;
            }
            .stars {
              font-size: 20pt;
              color: #f59e0b;
              margin: 0.5rem 0;
            }
            .footer-row {
              display: flex;
              justify-content: space-between;
              margin-top: 3.5rem;
              padding: 0 2rem;
              font-family: 'Inter', sans-serif;
            }
            .sig {
              border-top: 1px solid #cbd5e1;
              width: 160px;
              padding-top: 0.5rem;
              font-size: 10pt;
              color: #64748b;
            }
          </style>
        </head>
        <body>
          <div class="border-outer">
            <h1>🏆 URKUNDE 🏆</h1>
            <p>Diese besondere Auszeichnung wird feierlich verliehen an</p>
            <div class="name">${studentName}</div>
            <p>für das erfolgreiche, selbstständige Meistern der Zusatzaufgabe:</p>
            <div class="mission">"${challengeTitle}"</div>
            <div class="badge-label">${badgeLabel}</div>
            <div class="stars">${'★'.repeat(stars)}</div>
            <p style="font-size: 11pt; color: #94a3b8;">Du hast heute außergewöhnlichen Einsatz und tolle Ausdauer bewiesen!</p>
            
            <div class="footer-row">
              <div class="sig">Unterschrift Lehrkraft</div>
              <div class="sig">Datum: ${date}</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Helper variables for filtering students
  const activeStudentList = students.length > 0 ? students : displayStudents;
  const filteredActiveStudents = activeStudentList.filter((s: any) => {
    const statusInfo = studentStatuses[s.id] || { status: 'idle' };
    const matchesSearch = s.vorname.toLowerCase().includes(studentSearchQuery.toLowerCase()) || 
                          s.nachname.toLowerCase().includes(studentSearchQuery.toLowerCase());
    const matchesFilter = studentFilter === 'all' || statusInfo.status === studentFilter;
    return matchesSearch && matchesFilter;
  });

  // Count active stats
  const countWaiting = Object.values(studentStatuses).filter(v => v.status === 'waiting').length;
  const countAssigned = Object.values(studentStatuses).filter(v => v.status === 'assigned').length;
  const countCompleted = Object.values(studentStatuses).filter(v => v.status === 'completed').length;

  // Active student on detailed path view
  const detailedStudent = activeStudentList.find((s: any) => s.id === selectedPathStudentId);
  const detailedStudentStatus: any = detailedStudent ? (studentStatuses[detailedStudent.id] || { status: 'idle' }) : { status: 'idle' };

  // Materials filter
  const filteredMaterials = getMergedMaterials().filter(m => {
    const matchesSearch = m.titel.toLowerCase().includes(materialSearchQuery.toLowerCase()) || 
                          m.beschreibung.toLowerCase().includes(materialSearchQuery.toLowerCase()) ||
                          m.tags.some(t => t.toLowerCase().includes(materialSearchQuery.toLowerCase()));
    
    const matchesSubject = materialSubjectFilter === 'all' || m.faecher.some(f => f.toLowerCase().includes(materialSubjectFilter.toLowerCase()));
    return matchesSearch && matchesSubject;
  });


  // =======================================================
  // ORIGINAL PRINT SHEET GENERATOR LOGIC & COMPILING
  // =======================================================
  const activeStudent = students.find((s: any) => s.id === selectedStudentId);

  const toggleCategory = (key: 'artCraft' | 'sraReading' | 'academicPractice') => {
    setSelectedCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleMaterial = (key: keyof typeof materials) => {
    setMaterials(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const generatePlan = async () => {
    setLoading(true);
    setResult(null);
    setEditMode(false);

    const studentName = activeStudent ? activeStudent.vorname : 'Ganze Klasse';
    const stNotes = activeStudent?.notiz || 'Keine spezifischen Notizen';
    const stCharakter = activeStudent?.charakter?.join(', ') || 'Keine spezifischen Charaktereigenschaften angegeben';
    const stStaerken = activeStudent?.foerderprofil?.staerken?.join(', ') || 'Keine expliziten Stärken definiert';
    const stWeaknesses = activeStudent?.foerderprofil?.foerderbedarfBereiche?.join(', ') || 'Keine expliziten Förderbereiche definiert';
    const grade = app.stufe ? `${app.stufe}. Schulstufe` : 'Grundschule';

    const activePreset = TOPIC_PRESETS.find(p => p.id === selectedPresetId);
    const currentTopicLabel = selectedPresetId === 'custom' 
      ? (customTopic.trim() || 'Individuelles Thema') 
      : (activePreset ? activePreset.label : 'Einmaleins');

    const durationText = estimatedDuration === 'short' ? '5-10 Minuten (Kurz-Station)' : estimatedDuration === 'medium' ? '15-20 Minuten (Standard)' : '30+ Minuten (Umfangreiches Projekt)';
    const socialFormText = socialForm === 'individual' ? 'Einzelarbeit (Leise Beschäftigung)' : socialForm === 'partner' ? 'Partnerarbeit (Zusammenarbeit mit anderem fertigen Kind)' : 'Helfersystem (Unterstützung für Mitschüler)';
    const badgeLabel = REWARD_STAMPS.find(b => b.id === selectedBadge)?.label || 'Belobigung';

    const activeMaterials = Object.entries(materials)
      .filter(([_, value]) => value)
      .map(([key]) => {
        if (key === 'coloredPencils') return 'Buntstifte/Filzstifte';
        if (key === 'scissorsGlue') return 'Schere & Klebstoff';
        if (key === 'tablet') return 'Klassen-Tablet/PC';
        if (key === 'notebook') return 'eigenes Heft/Schreibpapier';
        if (key === 'geometryTools') return 'Lineal/Geodreieck';
        return key;
      }).join(', ') || 'Keine speziellen Materialien benötigt';

    let categoriesDescription = '';
    if (selectedCategories.artCraft) {
      categoriesDescription += `- **Art and Craft Activities**: Zeichnen, Basteln, Punkt-zu-Punkt oder Gestalten. Perfekt abgestimmt auf "${currentTopicLabel}".\n`;
    }
    if (selectedCategories.sraReading) {
      categoriesDescription += `- **SRA Reading Boxes / Leseverständnis**: Eine spannende, thematische Kurzgeschichte oder Lese-Rätsel zu "${currentTopicLabel}".\n`;
    }
    if (selectedCategories.academicPractice) {
      categoriesDescription += `- **Academic Practice Activities**: Mathematische Knobelaufgaben, Wortspiele oder knifflige Schreibimpulse zu "${currentTopicLabel}".\n`;
    }

    const prompt = `Erstelle einen motivierenden, pädagogisch wertvollen "Ich bin schon fertig!"-Arbeitsplan sowie ein kurzes, direkt lösbares Mini-Arbeitsblatt (inkl. Musterlösung für Lehrkräfte) für ${studentName} (${grade}).

UNTERRICHTS-THEMA:
👉 **${currentTopicLabel}** 👈

AUSRICHTUNG (SCHÜLER-DOSSIER):
- Stärken: ${stStaerken}
- Eigenschaften: ${stCharakter}
- Herausforderungen/Bedarf: ${stWeaknesses}
- Lehrkraftnotizen: ${stNotes}

RAHMENBEDINGUNGEN:
- Erwartete Dauer: ${durationText}
- Didaktische Sozialform: ${socialFormText}
- Gewünschtes Kniffligkeits-Level: ${difficultyLevel === 'standard' ? 'Sinnvolles Festigen des Basisstoffs' : difficultyLevel === 'challenging' ? 'Echte Experten-Kopfnuss' : 'Vollkommen freie kreative Gestaltungsaufgabe'}
- Verfügbare Hilfsmittel im Raum: ${activeMaterials}
- Einfache Sprache / Scaffolding erwünscht?: ${scaffoldingEnabled ? 'JA, schreibe verständlich mit kurzen Sätzen (ideal für DaZ/Inklusion)' : 'NEIN, normaler altersgerechter Ton'}

GEFORDERTE BEREICHE (AUSGEWÄHLT):
${categoriesDescription}

STAMP/BELOHNUNG AM ENDE:
"${badgeLabel}" mit einer Bewertung von ${starCount} von 3 Sternen.

Bitte antworte ausschließlich mit einem formatierten HTML-Fragment (kein \`\`\`html oder \`\`\`, nur reiner Code), das direkt ausgedruckt werden kann.
Das Layout soll elegant, kinderfreundlich und professionell aussehen (saubere Boxen, gepunktete Linien zum Eintragen, Platz für den Namen und Datum, eine kurze Reflexions-Ecke mit Smileys zum Ausmalen).
Am Ende des Dokuments füge eine gestrichelte Linie hinzu mit der Beschriftung "--- NUR FÜR LEHRKRÄFTE ---" und dahinter die Musterlösungen für die Aufgaben.`;

    try {
      const response = await askAI('ki-helfer', prompt);
      const cleanHtml = response.replace(/```html/g, '').replace(/```/g, '').trim();
      setResult(cleanHtml);
      setEditedResult(cleanHtml);
      
      const newPlan: SavedPlan = {
        id: Date.now().toString(),
        studentName,
        topic: currentTopicLabel,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        html: cleanHtml
      };
      setSavedPlans(prev => [newPlan, ...prev]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const generateReflectionQuestions = async () => {
    setLoadingQuestions(true);
    setQuestionsError(null);
    setReflectionQuestions(null);

    const activePreset = TOPIC_PRESETS.find(p => p.id === selectedPresetId);
    const currentTopicLabel = selectedPresetId === 'custom' 
      ? (customTopic.trim() || 'Individuelles Thema') 
      : (activePreset ? activePreset.label : 'Einmaleins');

    const prompt = `Erstelle genau drei vertiefende Reflexionsfragen zum Thema "${currentTopicLabel}", die eine Lehrkraft einem Grundschulschüler (Volksschule, ca. 1. bis 4. Klasse) zur mündlichen oder schriftlichen Bearbeitung stellen kann, nachdem dieser ein Zusatzprojekt oder eine Vertiefungsaufgabe dazu erfolgreich beendet hat.
    
Die Fragen sollen:
- Kindgerecht, motivierend und altersangemessen formuliert sein.
- Zum vertieften Nachdenken über das Thema anregen (Metakognition, Transferleistung, Selbstreflexion).
- Keine reinen Wissensabfragen sein, sondern Verständnis, Anwendung oder kreative Gedanken ansprechen.

Gib das Ergebnis als ein valides JSON-Array aus genau 3 Strings zurück (ohne \`\`\`json oder sonstige Formatierungen, nur das reine JSON-Array wie ["Frage 1", "Frage 2", "Frage 3"]).`;

    try {
      const response = await askAI('ki-helfer', prompt);
      const cleaned = response ? response.replace(/```json/g, '').replace(/```/g, '').trim() : '';
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length === 3) {
        setReflectionQuestions(parsed);
      } else {
        throw new Error("Ungültiges Antwortformat der KI.");
      }
    } catch (error: any) {
      console.error(error);
      setQuestionsError("Die Reflexionsfragen konnten leider nicht generiert werden. Bitte versuche es erneut.");
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=800,width=800');
    if (!printWindow) return;

    let contentToPrint = editedResult || result || '';
    if (!showSolutionKey) {
      const parts = contentToPrint.split(/--- NUR FÜR LEHRKRÄFTE ---/i);
      contentToPrint = parts[0];
    }

    const grade = app.stufe ? `${app.stufe}. Schulstufe` : '3. Klasse';
    printWindow.document.write(`
      <html>
        <head>
          <title>"Ich bin schon fertig!"-Arbeitsplan - ${grade}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { 
              font-family: 'Inter', sans-serif; 
              line-height: 1.5; 
              color: #334155; 
              padding: 2cm;
              background-color: #ffffff;
            }
            h1, h2, h3, h4 { color: #1e293b; font-weight: 700; margin-top: 1.5rem; }
            h1 { font-size: 20pt; border-bottom: 3px double #f59e0b; padding-bottom: 0.5rem; margin-top: 0; }
            h2 { font-size: 14pt; color: #4f46e5; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem; }
            h3 { font-size: 11pt; color: #b45309; }
            p, li { font-size: 10pt; }
            ul, ol { padding-left: 1.2rem; }
            .box {
              border: 2px dashed #cbd5e1;
              padding: 1rem;
              border-radius: 0.75rem;
              background: #f8fafc;
              margin: 1rem 0;
            }
            .dashed-line {
              border-bottom: 2px dashed #94a3b8;
              height: 10px;
              margin: 2rem 0;
            }
            .badge-box {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border: 2px solid #e2e8f0;
              padding: 0.75rem;
              border-radius: 0.5rem;
              background: #fafafa;
              margin-top: 2rem;
            }
          </style>
        </head>
        <body>
          ${contentToPrint}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const loadSavedPlan = (plan: SavedPlan) => {
    setResult(plan.html);
    setEditedResult(plan.html);
    setEditMode(false);
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden" id="finished-tasks-widget">
      
      {/* 5. CSS Confetti Micro-Engine */}
      {confettiActive && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(30)].map((_, i) => {
            const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            const left = Math.random() * 100;
            const delay = Math.random() * 1.2;
            const duration = 1.5 + Math.random() * 1.5;
            return (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-sm"
                style={{
                  backgroundColor: randomColor,
                  left: `${left}%`,
                  top: `-20px`,
                  animation: `fall ${duration}s linear ${delay}s infinite`,
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            );
          })}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes fall {
              0% { top: -20px; transform: translateY(0) rotate(0deg); opacity: 1; }
              100% { top: 100%; transform: translateY(600px) rotate(720deg); opacity: 0; }
            }
          `}} />
        </div>
      )}

      {/* Widget Header & Title */}
      <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Coffee size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">"Ich bin schon fertig!" Arbeitsplan & Lernpfade</h2>
              <span className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-[0.625rem] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm animate-pulse">
                Lernpfad v2.5
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500">
              Automatische Materialvorschläge, KI-Zusatzchallenges & interaktives Klassen-Statusboard
            </p>
          </div>
        </div>

        {/* Tab Selection Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-2xl w-fit self-end md:self-center border border-slate-200/50">
          <button
            onClick={() => setActiveTab('lernpfad')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              activeTab === 'lernpfad' 
                ? 'bg-white text-indigo-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles size={13} />
            <span>🗺️ Interaktiver Lernpfad</span>
          </button>
          <button
            onClick={() => setActiveTab('generator')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              activeTab === 'generator' 
                ? 'bg-white text-amber-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Printer size={13} />
            <span>🖨️ Spezialplan-Schmiede</span>
          </button>
        </div>
      </div>

      {/* ========================== TAB 1: INTERAKTIVER LERNPFAD ========================== */}
      {activeTab === 'lernpfad' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* Left Column (Span 4) - Class Status Board */}
          <div className="xl:col-span-4 space-y-4">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3.5">
              
              <div className="flex items-center justify-between">
                <span className="text-[0.6875rem] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Users size={14} className="text-indigo-500" /> Klassen-Status-Board
                </span>
                <span className="text-[0.625rem] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded-full">
                  {activeStudentList.length} Kinder
                </span>
              </div>

              {/* Stats overview boxes */}
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-1.5">
                  <div className="text-xs font-black text-amber-600">{countWaiting}</div>
                  <div className="text-[0.5625rem] font-bold text-slate-400 uppercase">Fertig ⚡</div>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-1.5">
                  <div className="text-xs font-black text-indigo-600">{countAssigned}</div>
                  <div className="text-[0.5625rem] font-bold text-slate-400 uppercase">Aktiv 📖</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-1.5">
                  <div className="text-xs font-black text-emerald-600">{countCompleted}</div>
                  <div className="text-[0.5625rem] font-bold text-slate-400 uppercase">Geschafft 🏆</div>
                </div>
              </div>

              {/* Student Search and Filters */}
              <div className="space-y-1.5">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Schüler suchen..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 pl-8 pr-3 py-1.5 rounded-lg text-[0.6875rem] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 font-medium"
                  />
                </div>

                <div className="flex flex-wrap gap-1">
                  {(['all', 'idle', 'waiting', 'assigned', 'completed'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setStudentFilter(f)}
                      className={`px-1.5 py-0.5 rounded text-[0.5625rem] font-bold uppercase border transition-all ${
                        studentFilter === f 
                          ? 'bg-slate-800 border-slate-800 text-white' 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {f === 'all' && 'Alle'}
                      {f === 'idle' && '💤 Regulär'}
                      {f === 'waiting' && '⚡ Fertig'}
                      {f === 'assigned' && '🔍 Aktiv'}
                      {f === 'completed' && '✅ Gelöst'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Students interactive list */}
              <div className="space-y-1.5 max-h-[350px] overflow-y-auto custom-scrollbar">
                {filteredActiveStudents.map((s: any) => {
                  const statusInfo = studentStatuses[s.id] || { status: 'idle' };
                  const isSelected = s.id === selectedPathStudentId;

                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedPathStudentId(s.id)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected 
                          ? 'bg-indigo-50/70 border-indigo-300 shadow-sm' 
                          : 'bg-white border-slate-200 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Avatar */}
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          statusInfo.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          statusInfo.status === 'assigned' ? 'bg-indigo-100 text-indigo-700' :
                          statusInfo.status === 'waiting' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {s.vorname.charAt(0)}{s.nachname ? s.nachname.charAt(0) : ''}
                        </div>

                        <div className="min-w-0">
                          <span className="text-[0.6875rem] font-bold text-slate-800 block truncate">
                            {s.vorname} {s.nachname}
                          </span>
                          
                          {/* Subtext description based on status */}
                          <span className="text-[0.5625rem] text-slate-400 block truncate">
                            {statusInfo.status === 'idle' && '💤 Arbeitet regulär'}
                            {statusInfo.status === 'waiting' && '⚡ Wartet auf Aufgabe'}
                            {statusInfo.status === 'assigned' && `📖 ${statusInfo.assignedChallengeTitle}`}
                            {statusInfo.status === 'completed' && `🏆 Gelöst: ${statusInfo.assignedChallengeTitle}`}
                          </span>
                        </div>
                      </div>

                      {/* Status Trigger Action Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStudentFinished(s.id);
                        }}
                        className={`text-[0.5625rem] font-extrabold uppercase px-1.5 py-1 rounded border transition-all ${
                          statusInfo.status === 'waiting' 
                            ? 'bg-amber-500 border-amber-500 text-white animate-bounce' 
                            : statusInfo.status === 'assigned'
                            ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700'
                            : statusInfo.status === 'completed'
                            ? 'bg-emerald-100 border-emerald-200 text-emerald-700'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                        title="Status manuell weiterschalten"
                      >
                        {statusInfo.status === 'idle' && 'Fertig?'}
                        {statusInfo.status === 'waiting' && 'Wartet'}
                        {statusInfo.status === 'assigned' && 'Abgeben'}
                        {statusInfo.status === 'completed' && 'Gelöst ✓'}
                      </button>
                    </div>
                  );
                })}
                
                {filteredActiveStudents.length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-xs italic">
                    Keine Schüler passend zum Filter gefunden.
                  </div>
                )}
              </div>

            </div>

            {/* Quick context presets box */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
              <span className="text-[0.6875rem] font-bold text-slate-400 uppercase tracking-wider block">
                🎯 Aktueller Unterrichtskontext
              </span>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200/60 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 truncate">
                    {TOPIC_PRESETS.find(p => p.id === selectedPresetId)?.label || 'Unbekannt'}
                  </div>
                  <div className="text-[0.625rem] text-slate-400 truncate">
                    Bestimmt die thematische Ausrichtung der Vorschläge.
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('generator')}
                  className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors shrink-0"
                  title="Thema in Spezialplan-Schmiede ändern"
                >
                  <Edit3 size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column (Span 8) - Interactive Learning Path & Challenge Center */}
          <div className="xl:col-span-8 bg-slate-50 border border-slate-200/80 rounded-3xl p-5 flex flex-col min-h-[550px]">
            
            {detailedStudent ? (
              <div className="space-y-5 flex-1 flex flex-col justify-between">
                
                {/* 1. Student Dossier Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0">
                      {detailedStudent.vorname.charAt(0)}{detailedStudent.nachname ? detailedStudent.nachname.charAt(0) : ''}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-slate-800">
                          {detailedStudent.vorname} {detailedStudent.nachname}
                        </h3>
                        <span className="bg-indigo-100 text-indigo-800 text-[0.5625rem] font-extrabold px-1.5 py-0.5 rounded-full uppercase">
                          {app.stufe || 3}. Klasse
                        </span>
                      </div>
                      <p className="text-[0.6875rem] text-slate-500 font-medium line-clamp-1 mt-0.5">
                        💡 {detailedStudent.notiz || 'Keine Notizen im Schülerdossier hinterlegt'}
                      </p>
                    </div>
                  </div>

                  {/* Character Tags */}
                  <div className="flex flex-wrap gap-1 shrink-0">
                    {detailedStudent.foerderprofil?.staerken?.slice(0, 2).map((st: string) => (
                      <span key={st} className="text-[0.5625rem] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md border border-emerald-100">
                        💪 {st}
                      </span>
                    ))}
                    {detailedStudent.charakter?.slice(0, 2).map((c: string) => (
                      <span key={c} className="text-[0.5625rem] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md border border-indigo-100">
                        🌟 {c}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 2. Visual Game-like Learning Path (Map UI) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                  <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest block mb-4">
                    🗺️ Aktueller Lernpfad-Fortschritt
                  </span>

                  <div className="flex items-center justify-between relative max-w-xl mx-auto py-2">
                    {/* Connecting line */}
                    <div className="absolute left-[8%] right-[8%] top-[40%] h-0.5 border-t border-dashed border-slate-200 -z-1"></div>
                    
                    {/* Progress Fill line */}
                    <div 
                      className="absolute left-[8%] top-[40%] h-0.5 bg-indigo-500 transition-all duration-500 -z-1"
                      style={{
                        width: 
                          detailedStudentStatus.status === 'completed' ? '84%' :
                          detailedStudentStatus.status === 'assigned' ? '56%' :
                          detailedStudentStatus.status === 'waiting' ? '28%' : '0%'
                      }}
                    ></div>

                    {/* Step 1: Start */}
                    <div className="flex flex-col items-center gap-1.5 cursor-pointer" onClick={() => handleResetStudent(detailedStudent.id)}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        detailedStudentStatus.status !== 'idle'
                          ? 'bg-indigo-600 text-white shadow-md scale-110' 
                          : 'bg-slate-100 text-slate-400 border-2 border-slate-200'
                      }`}>
                        🏁
                      </div>
                      <span className="text-[0.5625rem] font-bold text-slate-500 uppercase">Start</span>
                    </div>

                    {/* Step 2: Fertig */}
                    <div className="flex flex-col items-center gap-1.5 cursor-pointer" onClick={() => handleToggleStudentFinished(detailedStudent.id)}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        detailedStudentStatus.status === 'waiting' || detailedStudentStatus.status === 'assigned' || detailedStudentStatus.status === 'completed'
                          ? 'bg-amber-500 text-white shadow-md scale-110 ring-4 ring-amber-100 animate-pulse' 
                          : 'bg-slate-100 text-slate-400 border-2 border-slate-200'
                      }`}>
                        ⚡
                      </div>
                      <span className="text-[0.5625rem] font-bold text-slate-500 uppercase">Fertig!</span>
                    </div>

                    {/* Step 3: Zugeordnet */}
                    <div className="flex flex-col items-center gap-1.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        detailedStudentStatus.status === 'assigned' || detailedStudentStatus.status === 'completed'
                          ? 'bg-indigo-600 text-white shadow-md scale-110' 
                          : 'bg-slate-100 text-slate-400 border-2 border-slate-200'
                      }`}>
                        📖
                      </div>
                      <span className="text-[0.5625rem] font-bold text-slate-500 uppercase">Challenge</span>
                    </div>

                    {/* Step 4: Geschafft */}
                    <div className="flex flex-col items-center gap-1.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        detailedStudentStatus.status === 'completed'
                          ? 'bg-emerald-500 text-white shadow-md scale-110 ring-4 ring-emerald-100 animate-bounce' 
                          : 'bg-slate-100 text-slate-400 border-2 border-slate-200'
                      }`}>
                        🏆
                      </div>
                      <span className="text-[0.5625rem] font-bold text-slate-500 uppercase">Gelöst</span>
                    </div>
                  </div>
                </div>

                {/* 3. Dynamic content block based on state */}
                <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 overflow-y-auto max-h-[350px] custom-scrollbar">
                  
                  {/* STATE A: IDLE (Classroom Work) */}
                  {detailedStudentStatus.status === 'idle' && (
                    <div className="text-center py-8 space-y-3">
                      <div className="w-14 h-14 bg-slate-50 text-slate-400 flex items-center justify-center rounded-full mx-auto">
                        <Clock size={28} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{detailedStudent.vorname} arbeitet gerade an regulären Aufgaben</h4>
                        <p className="text-[0.6875rem] text-slate-400 max-w-sm mx-auto mt-1">
                          Sobald das Kind fertig ist, klicke auf "Fertig!" oben oder schalte das Status-Board um, um die automatische Materialauswahl zu starten.
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggleStudentFinished(detailedStudent.id)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[0.625rem] px-3.5 py-1.5 rounded-xl uppercase tracking-widest transition-all"
                      >
                        ⚡ "Ich bin fertig!" melden
                      </button>
                    </div>
                  )}

                  {/* STATE B: WAITING (Needs a Challenge!) */}
                  {detailedStudentStatus.status === 'waiting' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles size={16} className="text-amber-500 animate-pulse" />
                          <span className="text-xs font-bold text-slate-800">
                            Empfehlungen für {detailedStudent.vorname}
                          </span>
                        </div>
                        <span className="text-[0.5625rem] uppercase tracking-widest font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                          Themen-Matche
                        </span>
                      </div>

                      {/* Intelligent suggestions deck */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {getSuggestedMaterials(detailedStudent).slice(0, 4).map(item => (
                          <div 
                            key={item.id}
                            className="border border-slate-200 p-3 rounded-xl hover:border-indigo-400 hover:shadow-sm transition-all flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-1.5">
                                <span className="text-xs font-bold text-slate-800 line-clamp-1">{item.titel}</span>
                                <span className={`text-[0.5rem] font-bold px-1 rounded uppercase tracking-wider shrink-0 ${
                                  item.schwierigkeit === 'anspruchsvoll' ? 'bg-rose-50 text-rose-700' :
                                  item.schwierigkeit === 'mittel' ? 'bg-amber-50 text-amber-700' :
                                  'bg-emerald-50 text-emerald-700'
                                }`}>
                                  {item.schwierigkeit || 'einfach'}
                                </span>
                              </div>
                              <p className="text-[0.625rem] text-slate-400 mt-1 line-clamp-2">{item.beschreibung}</p>
                              
                              <div className="flex flex-wrap gap-1 mt-2">
                                {item.tags.slice(0, 3).map(tag => (
                                  <span key={tag} className="text-[0.5rem] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <button
                              onClick={() => handleAssignChallenge(detailedStudent.id, item)}
                              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[0.5625rem] font-bold uppercase py-1.5 rounded-lg tracking-wider transition-colors mt-3 flex items-center justify-center gap-1"
                            >
                              <Play size={10} />
                              <span>Zuweisen</span>
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* AI Generator button if nothing fits */}
                      <div className="border border-indigo-200 rounded-2xl bg-gradient-to-r from-indigo-50/50 to-purple-50/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                        <div className="text-center sm:text-left">
                          <span className="text-xs font-bold text-slate-800 block">Spezialaufgabe per KI schneidern?</span>
                          <span className="text-[0.625rem] text-slate-400 block mt-0.5">
                            Generiert eine absolut individuelle Mission abgestimmt auf {detailedStudent.vorname}s Stärken und Interessen.
                          </span>
                        </div>

                        <button
                          onClick={() => handleGenerateAIChallenge(detailedStudent.id)}
                          disabled={aiGeneratingChallengeForStudent !== null}
                          className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-extrabold text-[0.625rem] px-3.5 py-2 rounded-xl uppercase tracking-widest transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                        >
                          {aiGeneratingChallengeForStudent === detailedStudent.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Sparkles size={12} />
                          )}
                          <span>AI Challenge generieren</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STATE C: ASSIGNED (Active work on the sheet) */}
                  {detailedStudentStatus.status === 'assigned' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <CheckSquare size={14} className="text-indigo-500 animate-pulse" />
                          Aktiv bearbeitete Herausforderung:
                        </span>
                        <span className="text-[0.5625rem] bg-indigo-50 text-indigo-700 font-extrabold px-2 py-0.5 rounded-md uppercase">
                          In Bearbeitung
                        </span>
                      </div>

                      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40">
                        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          {detailedStudentStatus.assignedChallengeTitle}
                        </h4>
                        
                        {/* Task Text preview */}
                        <div 
                          className="prose prose-slate prose-xs max-w-none text-slate-600 mt-3 text-[0.6875rem] leading-relaxed border-t border-slate-100 pt-3"
                          dangerouslySetInnerHTML={{ __html: detailedStudentStatus.assignedChallengeContent || '' }}
                        />
                      </div>

                      {/* Interactive control buttons */}
                      <div className="flex flex-wrap gap-2 pt-1.5">
                        <button
                          onClick={() => handlePrintChallenge(detailedStudent.vorname, detailedStudentStatus.assignedChallengeTitle || '', detailedStudentStatus.assignedChallengeContent || '')}
                          className="bg-slate-950 hover:bg-slate-900 text-white text-[0.625rem] font-bold uppercase py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Printer size={12} />
                          <span>Aufgabe drucken</span>
                        </button>

                        <button
                          onClick={() => handleOpenCompletionDialog(detailedStudent.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[0.625rem] font-bold uppercase py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Check size={12} />
                          <span>Als gelöst markieren</span>
                        </button>

                        <button
                          onClick={() => handleResetStudent(detailedStudent.id)}
                          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 text-[0.625rem] font-bold uppercase py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition-colors"
                        >
                          <RefreshCw size={12} />
                          <span>Zuteilung löschen</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STATE D: COMPLETED (Badge awarded, self reflection smiley preserved) */}
                  {detailedStudentStatus.status === 'completed' && (
                    <div className="text-center py-6 space-y-4">
                      <div className="w-14 h-14 bg-emerald-50 text-emerald-500 flex items-center justify-center rounded-full mx-auto animate-bounce">
                        <Trophy size={28} />
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-800">
                          {detailedStudent.vorname} hat die Mission glorreich abgeschlossen!
                        </h4>
                        <p className="text-[0.6875rem] text-slate-400">
                          Aufgabe: <b>{detailedStudentStatus.assignedChallengeTitle}</b>
                        </p>
                      </div>

                      {/* Award Details Visual Display */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 max-w-sm mx-auto flex items-center justify-between">
                        <div className="text-left">
                          <span className="text-[0.5625rem] text-slate-400 uppercase tracking-wider block">Verliehener Stempel:</span>
                          <span className={`text-[0.625rem] font-bold uppercase px-2 py-0.5 rounded border block w-fit mt-1 ${
                            REWARD_STAMPS.find(b => b.id === detailedStudentStatus.earnedBadgeId)?.bg || 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {REWARD_STAMPS.find(b => b.id === detailedStudentStatus.earnedBadgeId)?.label || '🌟 Sternen-Held/in'}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[0.5625rem] text-slate-400 uppercase tracking-wider block">Bewertung:</span>
                          <div className="flex text-amber-500 justify-end mt-1">
                            {'★'.repeat(detailedStudentStatus.earnedStars || 3)}
                          </div>
                        </div>

                        <div className="border-l border-slate-200 pl-3 text-center">
                          <span className="text-[0.5625rem] text-slate-400 uppercase tracking-wider block">Feedback:</span>
                          <span className="text-lg mt-0.5 block">
                            {detailedStudentStatus.reflectionSmiley === 'super' ? '😊' :
                             detailedStudentStatus.reflectionSmiley === 'okay' ? '😐' : '☹️'}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-center gap-2 pt-2">
                        <button
                          onClick={() => handlePrintCertificate(detailedStudent.vorname, detailedStudentStatus.assignedChallengeTitle || '', detailedStudentStatus.earnedBadgeId || 'star_hero', detailedStudentStatus.earnedStars || 3)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-[0.625rem] font-bold uppercase py-2 px-4 rounded-xl flex items-center gap-1.5 transition-colors shadow-md shadow-indigo-100"
                        >
                          <Printer size={12} />
                          <span>Erfolgs-Urkunde drucken</span>
                        </button>

                        <button
                          onClick={() => handleResetStudent(detailedStudent.id)}
                          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 text-[0.625rem] font-bold uppercase py-2 px-4 rounded-xl transition-colors"
                        >
                          Neu starten
                        </button>
                      </div>
                    </div>
                  )}

                </div>

                {/* 4. General Manual Materials Library Finder list */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <BookOpen size={12} /> Manueller Material-Finder (Aus Bibliothek)
                    </span>
                    <span className="text-[0.5625rem] font-bold text-slate-400">
                      {getMergedMaterials().length} Vorlagen bereit
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Bibliothek durchsuchen..."
                      value={materialSearchQuery}
                      onChange={(e) => setMaterialSearchQuery(e.target.value)}
                      className="flex-1 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-[0.6875rem] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
                    />

                    <select
                      value={materialSubjectFilter}
                      onChange={(e) => setMaterialSubjectFilter(e.target.value)}
                      className="bg-white border border-slate-200 px-2 py-1 rounded-lg text-[0.6875rem] focus:outline-none font-semibold text-slate-600"
                    >
                      <option value="all">Alle Fächer</option>
                      <option value="Mathematik">Mathematik</option>
                      <option value="Deutsch">Deutsch</option>
                      <option value="Sachunterricht">Sachkunde</option>
                      <option value="Englisch">Englisch</option>
                    </select>
                  </div>

                  <div className="flex gap-2.5 overflow-x-auto py-1 custom-scrollbar max-w-full">
                    {filteredMaterials.map(m => {
                      const isSuggested = getSuggestedMaterials(detailedStudent).some(s => s.id === m.id);
                      return (
                        <div 
                          key={m.id}
                          className="bg-white border border-slate-200/60 p-2 rounded-xl min-w-[200px] max-w-[200px] flex flex-col justify-between hover:border-slate-300 transition-colors shrink-0"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-[0.625rem] font-bold text-slate-800 truncate block mr-1">{m.titel}</span>
                              {isSuggested && (
                                <span className="bg-amber-100 text-amber-800 text-[0.5rem] font-extrabold px-1 rounded uppercase">
                                  Match
                                </span>
                              )}
                            </div>
                            <p className="text-[0.5625rem] text-slate-400 mt-0.5 line-clamp-2">{m.beschreibung}</p>
                          </div>

                          <button
                            onClick={() => handleAssignChallenge(detailedStudent.id, m)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[0.5rem] font-extrabold uppercase py-1 rounded-md transition-colors mt-2 text-center block w-full"
                          >
                            Zuweisen
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto">
                <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-400 flex items-center justify-center mb-4">
                  <Sparkles size={32} />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Kein Kind ausgewählt</h3>
                <p className="text-xs text-slate-500 mt-2 max-w-sm">
                  Wähle links im Klassen-Status-Board ein Kind aus, um dessen aktiven Lernpfad einzusehen, personalisierte Aufgaben zu vergeben oder Auszeichnungen zu verleihen.
                </p>
              </div>
            )}

          </div>

          {/* =======================================================
              COMPLETION / REWARD DIALOG POPUP (MODAL OVERLAY)
             ======================================================= */}
          {completingStudentId && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 max-w-md w-full space-y-4 animate-scale-up">
                
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                      <Trophy size={18} />
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-800">Mission erfolgreich abgeschlossen!</h3>
                  </div>
                  <button 
                    onClick={() => setCompletingStudentId(null)} 
                    className="text-slate-400 hover:text-slate-600 font-extrabold"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-xs text-slate-500">
                  Wähle den passenden Belohnungs-Stempel, die Anzahl der Sterne und trage die Selbsteinschätzung des Kindes ein.
                </p>

                {/* 1. Badge selection */}
                <div className="space-y-1.5">
                  <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Belohnungs-Stempel:</span>
                  <div className="grid grid-cols-2 gap-2">
                    {REWARD_STAMPS.map((stamp) => (
                      <button
                        key={stamp.id}
                        onClick={() => setCompletionBadge(stamp.id)}
                        className={`p-2 rounded-xl border text-[0.6875rem] font-bold text-center transition-all ${
                          completionBadge === stamp.id 
                            ? `${stamp.bg} border-current ring-1 ring-indigo-500` 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {stamp.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Star selector */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">Sternen-Auszeichnung:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3].map((star) => (
                      <button
                        key={star}
                        onClick={() => setCompletionStars(star)}
                        className="text-amber-500 hover:scale-110 transition-transform focus:outline-none"
                      >
                        <Star size={20} fill={star <= completionStars ? '#f59e0b' : 'none'} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Smiley selector */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">Wie fand das Kind die Aufgabe?</span>
                  <div className="flex gap-2">
                    {(['super', 'okay', 'hard'] as const).map(smiley => (
                      <button
                        key={smiley}
                        onClick={() => setCompletionSmiley(smiley)}
                        className={`text-xl p-1.5 rounded-lg border transition-all ${
                          completionSmiley === smiley 
                            ? 'bg-slate-100 border-slate-400 scale-110' 
                            : 'bg-white border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        {smiley === 'super' ? '😊' : smiley === 'okay' ? '😐' : '☹️'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSaveCompletion}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-200"
                  >
                    <CheckCircle2 size={14} />
                    <span>Speichern & Auszeichnen</span>
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================== TAB 2: SPEZIALPLAN-SCHMIEDE (ORIGINAL SHEET GENERATOR) ========================== */}
      {activeTab === 'generator' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Controls Column (Span 5) */}
          <div className="xl:col-span-5 space-y-5">
            
            {/* Section 1: Target student & Profile sync */}
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[0.6875rem] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <User size={14} className="text-amber-500" /> 1. Schüler/in & Dossier-Sync
                </span>
                <span className="text-[0.625rem] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded-full">Automatischer Datenabgleich</span>
              </div>

              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-700"
              >
                <option value="">-- Gesamte Klasse (Generalisierte Aufgaben) --</option>
                {students.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    👤 {s.vorname} {s.nachname}
                  </option>
                ))}
              </select>

              {/* Real-time Dossier Visual Preview */}
              {activeStudent ? (
                <div className="bg-white rounded-xl p-3 border border-slate-200/60 space-y-2.5">
                  {activeStudent.charakter && activeStudent.charakter.length > 0 && (
                    <div>
                      <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Dossier: Eigenschaften</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {activeStudent.charakter.map((c: string) => (
                          <span key={c} className="text-[0.625rem] bg-indigo-50/50 text-indigo-700 font-bold px-2 py-0.5 rounded-md border border-indigo-100/50">
                            🌟 {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeStudent.foerderprofil?.staerken && activeStudent.foerderprofil.staerken.length > 0 && (
                    <div>
                      <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Erkannte Stärken</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {activeStudent.foerderprofil.staerken.map((st: string) => (
                          <span key={st} className="text-[0.625rem] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md border border-emerald-100/50">
                            💪 {st}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeStudent.foerderprofil?.foerderbedarfBereiche && activeStudent.foerderprofil.foerderbedarfBereiche.length > 0 && (
                    <div>
                      <span className="text-[0.625rem] font-bold text-rose-400 uppercase tracking-wider block">Entwicklungsfelder / Sorgen</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {activeStudent.foerderprofil.foerderbedarfBereiche.map((w: string) => (
                          <span key={w} className="text-[0.625rem] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-md border border-rose-100/50">
                            🎯 {w}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[0.6875rem] text-slate-400 italic">
                  Wähle ein Kind aus, um dessen dossierspezifischen Stärken, Schwächen und Notizen direkt in den Generator einfließen zu lassen.
                </div>
              )}
            </div>

            {/* Section 2: Lesson Topic Preset or Custom */}
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <span className="text-[0.6875rem] font-extrabold text-slate-400 uppercase tracking-widest block">
                📚 2. Unterrichts-Zusammenhang
              </span>
              <select
                value={selectedPresetId}
                onChange={(e) => setSelectedPresetId(e.target.value)}
                className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-700"
              >
                {TOPIC_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              
              {selectedPresetId === 'custom' && (
                <input
                  type="text"
                  placeholder="Thema eingeben (z.B. Uhrzeit lesen, Wortschatz Herbst)"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-400 text-slate-800"
                />
              )}
            </div>

            {/* Section 3: Gamification Rewards & Difficulty Stars */}
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <span className="text-[0.6875rem] font-extrabold text-slate-400 uppercase tracking-widest block flex items-center gap-1">
                <Award size={14} className="text-amber-500" /> 3. Motivations-Badge & Sternen-Schwierigkeit
              </span>
              
              <div className="grid grid-cols-2 gap-2">
                {REWARD_STAMPS.map((stamp) => (
                  <button
                    key={stamp.id}
                    onClick={() => setSelectedBadge(stamp.id)}
                    className={`p-2 rounded-xl border text-[0.6875rem] font-bold text-center transition-all ${
                      selectedBadge === stamp.id 
                        ? `${stamp.bg} border-current ring-1 ring-amber-500` 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {stamp.label}
                  </button>
                ))}
              </div>

              {/* Star selector */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-slate-500">Sternen-Level (Kniffligkeit):</span>
                <div className="flex gap-1">
                  {[1, 2, 3].map((star) => (
                    <button
                      key={star}
                      onClick={() => setStarCount(star)}
                      className="text-amber-500 hover:scale-110 transition-transform focus:outline-none"
                    >
                      <Star size={18} fill={star <= starCount ? '#f59e0b' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 4: Social Form & Time Duration */}
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <span className="text-[0.6875rem] font-extrabold text-slate-400 uppercase tracking-widest block flex items-center gap-1">
                <Users size={14} className="text-amber-500" /> 4. Didaktische Sozialform & Zeitdauer
              </span>

              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setSocialForm('individual')}
                  className={`py-1.5 rounded-lg text-[0.625rem] font-bold uppercase transition-all ${socialForm === 'individual' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  👤 Einzel
                </button>
                <button
                  onClick={() => setSocialForm('partner')}
                  className={`py-1.5 rounded-lg text-[0.625rem] font-bold uppercase transition-all ${socialForm === 'partner' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  👥 Partner
                </button>
                <button
                  onClick={() => setSocialForm('helper')}
                  className={`py-1.5 rounded-lg text-[0.625rem] font-bold uppercase transition-all ${socialForm === 'helper' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  🧑‍🏫 Helfer
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1"><Clock size={13} /> Gewünschte Dauer:</span>
                <div className="flex gap-1">
                  {(['short', 'medium', 'long'] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setEstimatedDuration(d)}
                      className={`px-2.5 py-1 rounded-lg text-[0.625rem] font-bold transition-all border ${
                        estimatedDuration === d 
                          ? 'bg-amber-100 text-amber-800 border-amber-300' 
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {d === 'short' ? '5-10m' : d === 'medium' ? '15-20m' : '30m+'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 5: Available materials and language Scaffolding */}
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <span className="text-[0.6875rem] font-extrabold text-slate-400 uppercase tracking-widest block flex items-center gap-1">
                <Scissors size={14} className="text-amber-500" /> 5. Handwerkszeug & Sprach-Scaffolding
              </span>

              {/* Scaffolding Toggle */}
              <button
                onClick={() => setScaffoldingEnabled(!scaffoldingEnabled)}
                className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all ${
                  scaffoldingEnabled 
                    ? 'bg-purple-50 border-purple-200 text-purple-900' 
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Smile size={16} className={scaffoldingEnabled ? 'text-purple-500 animate-bounce' : 'text-slate-400'} />
                  <span className="text-[0.6875rem] font-extrabold">Einfache Sprache (DaZ/SPF/Inklusion)</span>
                </div>
                <input type="checkbox" checked={scaffoldingEnabled} readOnly className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5" />
              </button>

              {/* Materials selection */}
              <div className="space-y-1.5">
                <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block">Verfügbare Hilfsmittel:</span>
                <div className="flex flex-wrap gap-1">
                  {(Object.keys(materials) as Array<keyof typeof materials>).map((m) => (
                    <button
                      key={m}
                      onClick={() => toggleMaterial(m)}
                      className={`px-2 py-1 rounded-lg text-[0.625rem] font-semibold transition-all border ${
                        materials[m]
                          ? 'bg-slate-200 text-slate-800 border-slate-300'
                          : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {m === 'coloredPencils' && '🎨 Buntstifte'}
                      {m === 'scissorsGlue' && '✂️ Schere/Kleber'}
                      {m === 'tablet' && '📱 Tablet'}
                      {m === 'notebook' && '📖 Heft'}
                      {m === 'geometryTools' && '📐 Geodreieck'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 6: Standard Settings (Categories & Mode) */}
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <span className="text-[0.6875rem] font-extrabold text-slate-400 uppercase tracking-widest block">
                ⚙️ 6. Aufgabenbereiche & Schwierigkeit
              </span>
              
              <div className="space-y-1.5">
                <button
                  onClick={() => toggleCategory('artCraft')}
                  className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all ${
                    selectedCategories.artCraft 
                      ? 'bg-amber-50/50 border-amber-200 text-amber-900' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Palette size={14} className={selectedCategories.artCraft ? 'text-amber-500' : 'text-slate-400'} />
                    <span className="text-[0.6875rem] font-extrabold">Art and Craft Activities</span>
                  </div>
                  <input type="checkbox" checked={selectedCategories.artCraft} readOnly className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5" />
                </button>

                <button
                  onClick={() => toggleCategory('sraReading')}
                  className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all ${
                    selectedCategories.sraReading 
                      ? 'bg-indigo-50/50 border-indigo-200 text-indigo-900' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className={selectedCategories.sraReading ? 'text-indigo-500' : 'text-slate-400'} />
                    <span className="text-[0.6875rem] font-extrabold">SRA Reading Boxes</span>
                  </div>
                  <input type="checkbox" checked={selectedCategories.sraReading} readOnly className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" />
                </button>

                <button
                  onClick={() => toggleCategory('academicPractice')}
                  className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all ${
                    selectedCategories.academicPractice 
                      ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GraduationCap size={14} className={selectedCategories.academicPractice ? 'text-emerald-500' : 'text-slate-400'} />
                    <span className="text-[0.6875rem] font-extrabold">Academic Practice Activities</span>
                  </div>
                  <input type="checkbox" checked={selectedCategories.academicPractice} readOnly className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5" />
                </button>
              </div>

              {/* Ausrichtung Segmenter */}
              <div>
                <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block mb-1">Schwierigkeits-Ausrichtung:</span>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setDifficultyLevel('standard')}
                    className={`py-1 text-[0.625rem] font-bold uppercase transition-all ${difficultyLevel === 'standard' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Basis
                  </button>
                  <button
                    onClick={() => setDifficultyLevel('challenging')}
                    className={`py-1 text-[0.625rem] font-bold uppercase transition-all ${difficultyLevel === 'challenging' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Expert
                  </button>
                  <button
                    onClick={() => setDifficultyLevel('creative')}
                    className={`py-1 text-[0.625rem] font-bold uppercase transition-all ${difficultyLevel === 'creative' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Frei/Kreativ
                  </button>
                </div>
              </div>
            </div>

            {/* Action Triggers */}
            <div className="space-y-2">
              <button
                onClick={generatePlan}
                disabled={loading || (!selectedCategories.artCraft && !selectedCategories.sraReading && !selectedCategories.academicPractice)}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold py-3.5 px-4 rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                <span>Individuellen Arbeitsplan generieren</span>
              </button>

              <button
                onClick={generateReflectionQuestions}
                disabled={loadingQuestions}
                className="w-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 text-indigo-700 font-extrabold py-3 px-4 rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingQuestions ? <Loader2 size={16} className="animate-spin text-indigo-600" /> : <Sparkles size={16} className="text-indigo-500" />}
                <span>Vertiefende Reflexionsfragen</span>
              </button>
            </div>
          </div>

          {/* Output & Workspace Display Column (Span 7) */}
          <div className="xl:col-span-7 bg-slate-50 border border-slate-200/80 rounded-3xl min-h-[500px] flex flex-col overflow-hidden relative">
            
            {/* KI Reflexionsfragen Loading State */}
            {loadingQuestions && (
              <div className="bg-indigo-50/50 border-b border-indigo-100 p-6 flex flex-col items-center justify-center text-center animate-pulse">
                <Loader2 size={24} className="animate-spin text-indigo-600 mb-2" />
                <p className="text-xs font-bold text-slate-700">Generiere vertiefende Reflexionsfragen...</p>
                <p className="text-[0.625rem] text-slate-500 mt-1">Erstelle didaktisch wertvolle Metakognitionsfragen für das Thema...</p>
              </div>
            )}

            {/* KI Reflexionsfragen Error State */}
            {questionsError && (
              <div className="bg-rose-50 border-b border-rose-100 p-4 flex items-center justify-between gap-3 text-xs text-rose-800">
                <div className="flex items-center gap-2">
                  <Info size={14} className="text-rose-500 flex-shrink-0" />
                  <span>{questionsError}</span>
                </div>
                <button 
                  onClick={generateReflectionQuestions}
                  className="bg-white hover:bg-rose-100 text-rose-700 font-bold px-2.5 py-1 rounded-lg border border-rose-200 transition-colors shrink-0"
                >
                  Erneut versuchen
                </button>
              </div>
            )}

            {/* KI Reflexionsfragen Result Card */}
            {reflectionQuestions && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50/50 border-b border-indigo-100 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Mündliche/Schriftliche Reflexion</h4>
                      <p className="text-[0.625rem] text-slate-500 font-medium">
                        Drei vertiefende Fragen zum Thema: <strong className="text-indigo-700">
                          {selectedPresetId === 'custom' 
                            ? (customTopic.trim() || 'Eigenes Thema') 
                            : TOPIC_PRESETS.find(p => p.id === selectedPresetId)?.label}
                        </strong>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        const activePreset = TOPIC_PRESETS.find(p => p.id === selectedPresetId);
                        const currentTopicLabel = selectedPresetId === 'custom' 
                          ? (customTopic.trim() || 'Individuelles Thema') 
                          : (activePreset ? activePreset.label : 'Einmaleins');
                        const text = `Reflexionsfragen zum Thema "${currentTopicLabel}":\n\n1. ${reflectionQuestions[0]}\n2. ${reflectionQuestions[1]}\n3. ${reflectionQuestions[2]}`;
                        navigator.clipboard.writeText(text);
                        setQuestionsCopied(true);
                        setTimeout(() => setQuestionsCopied(false), 2000);
                      }}
                      className="bg-white hover:bg-slate-50 text-slate-700 text-[0.6875rem] font-bold px-2.5 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors shadow-sm"
                      title="Fragen kopieren"
                    >
                      {questionsCopied ? (
                        <>
                          <Check size={13} className="text-emerald-500" />
                          <span className="text-emerald-600">Kopiert!</span>
                        </>
                      ) : (
                        <>
                          <CheckSquare size={13} className="text-slate-500" />
                          <span>Kopieren</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setReflectionQuestions(null);
                      }}
                      className="bg-slate-200/60 hover:bg-slate-200 text-slate-600 text-[0.6875rem] font-bold p-1.5 rounded-lg transition-colors border border-slate-300/40"
                      title="Ausblenden"
                    >
                      <EyeOff size={13} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {reflectionQuestions.map((q, idx) => (
                    <div key={idx} className="bg-white p-3.5 rounded-2xl border border-indigo-100/80 shadow-sm flex gap-3 items-start hover:border-indigo-200 transition-colors">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-[0.6875rem]">
                        {idx + 1}
                      </span>
                      <p className="text-xs text-slate-700 font-semibold leading-relaxed pt-0.5">{q}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white animate-pulse">
                <Loader2 size={42} className="animate-spin text-amber-500 mb-4" />
                <p className="text-sm font-bold text-slate-800">Erstelle premium Zusatz-Arbeitsblatt...</p>
                <p className="text-xs text-slate-500 mt-2 max-w-sm">
                  Analysiere {activeStudent ? activeStudent.vorname : 'Klasse'} bzgl. Stärken, koppele an das Unterrichtsthema, erstelle kindgerechte Mission und integriere Selbstreflexion...
                </p>
                <div className="w-48 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-4">
                  <div className="bg-amber-500 h-full w-2/3 animate-pulse rounded-full"></div>
                </div>
              </div>
            ) : result ? (
              <div className="flex-1 flex flex-col h-full bg-white">
                {/* Header inside Preview */}
                <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-700">Arbeitsplan für {activeStudent ? activeStudent.vorname : 'die Klasse'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Toggle Musterlösung */}
                    <button
                      onClick={() => setShowSolutionKey(!showSolutionKey)}
                      className={`text-[0.6875rem] font-bold px-2.5 py-1.5 rounded-xl border flex items-center gap-1 transition-colors ${
                        showSolutionKey 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                      title="Musterlösung für Lehrkräfte am Ende des Blatts einblenden"
                    >
                      {showSolutionKey ? <Eye size={13} /> : <EyeOff size={13} />}
                      <span>Lösung: {showSolutionKey ? 'An' : 'Aus'}</span>
                    </button>

                    {/* Manual Editor Toggle */}
                    <button
                      onClick={() => setEditMode(!editMode)}
                      className={`text-[0.6875rem] font-bold px-2.5 py-1.5 rounded-xl border flex items-center gap-1 transition-colors ${
                        editMode 
                          ? 'bg-amber-100 border-amber-300 text-amber-800' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                      title="Inhalte des Arbeitsplans vor dem Drucken manuell abändern"
                    >
                      <Edit3 size={13} />
                      <span>{editMode ? 'Fertig' : 'Editieren'}</span>
                    </button>

                    {/* Print Button */}
                    <button
                      onClick={handlePrint}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 border border-indigo-700 shadow-sm transition-colors"
                    >
                      <Printer size={13} />
                      <span>Drucken (PDF)</span>
                    </button>
                  </div>
                </div>

                {/* HTML Content Render */}
                <div className="flex-1 p-6 overflow-y-auto max-h-[600px] custom-scrollbar bg-white">
                  
                  {editMode ? (
                    <div className="space-y-2 h-full flex flex-col">
                      <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 mb-2">
                        <Info size={14} />
                        <span>Du kannst den HTML-Code hier frei editieren, um Texte, Formulierungen oder Zahlen anzupassen.</span>
                      </div>
                      <textarea
                        value={editedResult}
                        onChange={(e) => setEditedResult(e.target.value)}
                        className="w-full flex-1 min-h-[400px] h-96 p-4 font-mono text-[0.6875rem] bg-slate-900 text-emerald-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Visual Badge display */}
                      <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200/50">
                        <div className="flex items-center gap-2">
                          <Award size={20} className="text-amber-500" />
                          <span className="text-xs font-extrabold text-slate-700">Druckvorschau mit Stempel:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[0.625rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            REWARD_STAMPS.find(b => b.id === selectedBadge)?.bg || 'bg-slate-100'
                          }`}>
                            {REWARD_STAMPS.find(b => b.id === selectedBadge)?.label}
                          </span>
                          <div className="flex text-amber-500">
                            {'★'.repeat(starCount)}
                          </div>
                        </div>
                      </div>

                      <div 
                        className="prose prose-slate prose-sm max-w-none text-slate-700 space-y-4"
                        dangerouslySetInnerHTML={{ __html: editedResult || result }}
                      />

                      {/* Solutions Preview box (Toggleable) */}
                      {showSolutionKey && (
                        <div className="mt-8 border-t-2 border-dashed border-emerald-300 pt-4 bg-emerald-50/40 p-4 rounded-xl">
                          <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest block mb-1">🔑 Musterlösung für Lehrkraft:</span>
                          <p className="text-xs text-emerald-700">Wird beim Drucken nur mitgedruckt, wenn die Musterlösung aktiv angewählt ist.</p>
                        </div>
                      )}

                      {/* Visual representation of Student self reflection smiley scale in the app preview */}
                      <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50 mt-6">
                        <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block mb-1">Kopfzeile Selbstreflexion für den Schüler:</span>
                        <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                          <span className="text-xs font-bold text-slate-700">Wie hat dir diese Spezial-Aktivität gefallen?</span>
                          <div className="flex gap-4">
                            <span className="text-xs flex items-center gap-1">⬜ 😊 Super</span>
                            <span className="text-xs flex items-center gap-1">⬜ 😐 Okay</span>
                            <span className="text-xs flex items-center gap-1">⬜ ☹️ Zu schwer/einfach</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col p-6 bg-white justify-between">
                
                {/* Ready State */}
                <div className="my-auto text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4">
                    <Sparkles size={32} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">Bereit für die Personalisierung</h3>
                  <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
                    Konfiguriere links die didaktischen Details (Unterrichtsthema, Schüler, Sozialform, Stempel & Dauer) und klicke auf "Arbeitsplan generieren".
                  </p>
                </div>

                {/* Instant Zero-Prep ideas block */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-auto">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-100 text-amber-800 text-[0.625rem] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Schnell-Ideen</span>
                      <span className="text-xs font-bold text-slate-700">Sofortige Analog-Aufgaben (Keine Vorbereitung)</span>
                    </div>
                    <HelpCircle size={14} className="text-slate-400" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {INSTANT_SPARK_IDEAS.map((idea, index) => (
                      <div key={index} className="bg-white p-2.5 rounded-xl border border-slate-200/60 flex flex-col justify-between hover:shadow-sm transition-shadow">
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-800 line-clamp-1">{idea.title}</span>
                            <span className="text-[0.625rem] font-bold text-slate-400 shrink-0">{idea.duration}</span>
                          </div>
                          <p className="text-[0.6875rem] text-slate-500 mt-1 line-clamp-2">{idea.desc}</p>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                          <span className="text-[0.625rem] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                            {idea.social}
                          </span>
                          <span className="text-[0.5625rem] text-slate-400 uppercase tracking-widest font-extrabold">Direkt starten</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
