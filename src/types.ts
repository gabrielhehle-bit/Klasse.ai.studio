
import { DiagnosticResult } from './types/diagnosticCore';
export * from './types/diagnosticCore';

export const COMMUNITY_MISSIONS_POOL = [
  {
    id: 'fluestern',
    title: 'Die flüsternde Festung',
    description: 'Arbeitet heute 15 Minuten lang in absoluter Stille. Nur Flüstern ist erlaubt, wenn jemand Hilfe braucht!',
    rewardClassMarbles: 3,
    icon: '🤫',
    category: 'Fokus & Stille'
  },
  {
    id: 'kompliment_dusche',
    title: 'Geheime Lob-Agenten',
    description: 'Jedes Kind probiert heute unauffällig aus, einem anderen Kind aus der Klasse eine freundliche Geste oder ein Kompliment zu schenken.',
    rewardClassMarbles: 4,
    icon: '💖',
    category: 'Gemeinschaft'
  },
  {
    id: 'blitz_aufraeumen',
    title: 'Der 2-Minuten-Blitzwirbel',
    description: 'Stellt eine Stoppuhr auf 2 Minuten. Schafft es die ganze Klasse, alle Tische, den Boden und die Tafel vor Ablauf makellos aufzuräumen?',
    rewardClassMarbles: 2,
    icon: '🧹',
    category: 'Blitz-Ordnung'
  },
  {
    id: 'tischteam_hilfe',
    title: 'Starke Tisch-Kapitäne',
    description: 'Schafft es heute jeder Gruppentisch, dass alle am Tisch sitzenden Kinder ihre Aufgaben fertigstellen, indem sie sich tatkräftig gegenseitig helfen?',
    rewardClassMarbles: 3,
    icon: '🤝',
    category: 'Teamwork'
  },
  {
    id: 'energiespar_ritter',
    title: 'Die Energiespar-Ritter',
    description: 'Beim Verlassen des Raumes schalten wir sofort das Licht aus und lüften nur stoßweise. Ein ganzer Unit-Morgen ohne Energieverschwendung!',
    rewardClassMarbles: 2,
    icon: '🌱',
    category: 'Umweltschutz'
  },
  {
    id: 'super_begruessung',
    title: 'Die freundliche Welle',
    description: 'Wir grüßen heute jede Lehrkraft oder Besuchsperson auf dem Gang besonders höflich mit einem strahlenden Lächeln!',
    rewardClassMarbles: 2,
    icon: '👋',
    category: 'Herzlichkeit'
  },
  {
    id: 'klassen_polonaise',
    title: 'Der lachende Hofkreis',
    description: 'Wir schaffen ein gemeinsames Pausenspiel im Schulhof, bei dem mindestens 10 Kinder zusammen lachend an einem Strang ziehen!',
    rewardClassMarbles: 4,
    icon: '🎉',
    category: 'Gemeinschaft'
  },
  {
    id: 'stille_helden',
    title: 'Lautlose Ninja-Schritte',
    description: 'Wir schaffen es heute, in einer perfekten Einerreihe und völlig unhörbar wie Ninjas den Flur zum Sportsaal zu durchqueren!',
    rewardClassMarbles: 3,
    icon: '🥷',
    category: 'Fokus & Disziplin'
  },
  {
    id: 'mutmachende_worte',
    title: 'Mut-Macher',
    description: 'Ermutigt euch heute gegenseitig! Sagt mindestens 3 Mal am Tag zu einem Mitschüler (z.B. bei Schwierigkeiten): "Du schaffst das!" oder "Gib nicht auf!".',
    rewardClassMarbles: 3,
    icon: '💪',
    category: 'Herzlichkeit'
  },
  {
    id: 'helden_der_pause',
    title: 'Helden der Pause',
    description: 'Achtet in der Pause darauf, dass niemand alleine steht. Ladet gezielt Kinder, die alleine sind, zum Mitspielen ein.',
    rewardClassMarbles: 4,
    icon: '🦸‍♂️',
    category: 'Gemeinschaft'
  },
  {
    id: 'saubere_schuhe',
    title: 'Hallen-Detektive',
    description: 'Achten wir heute darauf, in der Garderobe alle Straßenschuhe / Jacken ordentlich aufzuräumen und keinen Schmutz in die Klasse zu tragen.',
    rewardClassMarbles: 2,
    icon: '👞',
    category: 'Ordnung'
  },
  {
    id: 'fragen_fee',
    title: 'Die 3-Fragen-Regel',
    description: 'Bevor wir die Lehrkraft fragen, fragen wir zuerst 3 andere Kinder am Tisch, ob sie helfen können. Schaffen wir das einen ganzen Tag lang?',
    rewardClassMarbles: 4,
    icon: '🧚',
    category: 'Teamwork'
  },
  {
    id: 'fehler_feier',
    title: 'Fehler-Entdecker',
    description: 'Wer heute einen Fehler bei sich entdeckt, sagt laut "Juhu, ich lerne etwas!" und wird von der Klasse beklatscht.',
    rewardClassMarbles: 3,
    icon: '🥳',
    category: 'Mindset'
  },
  {
    id: 'papierkorb_treffsicher',
    title: 'Papierkorb-Profis',
    description: 'Es landet heute kein einziges Stück Papier neben dem Mülleimer, und am Ende des Tages ist der Boden besenrein.',
    rewardClassMarbles: 2,
    icon: '🗑️',
    category: 'Ordnung'
  },
  {
    id: 'danke_sager',
    title: 'Hundertmal "Danke"',
    description: 'Versuchen wir heute als Klasse insgesamt mindestens 100 Mal "Danke" zu sagen (für geborgte Stifte, beim Austeilen, beim Helfen etc.).',
    rewardClassMarbles: 4,
    icon: '🙏',
    category: 'Herzlichkeit'
  },
  {
    id: 'material_teilen',
    title: 'Rettung in der Not',
    description: 'Verleihe einem Mitschüler ein Arbeitsmaterial (Stift, Radiergummi, Schere), bevor er überhaupt danach fragen muss!',
    rewardClassMarbles: 3,
    icon: '🖍️',
    category: 'Hilfsbereitschaft'
  }
];

export const VORSCHLAG_DIAGNOSTIK_TESTS: DiagnostikTest[] = [
  { id: 'sls-2-9', name: 'SLS 2-9', kategorie: 'lesen', kurzbeschreibung: 'Salzburger Lesescreening', einheit: 'prozentrang', schwellenwert: 15, schwellenrichtung: 'unter', schulstufen: [2, 3, 4, 5, 6, 7, 8, 9] },
  { id: 'slrt-ii', name: 'SLRT-II', kategorie: 'lesen', kurzbeschreibung: 'Salzburger Lese- und Rechtschreibtest', einheit: 'prozentrang', schwellenwert: 15, schwellenrichtung: 'unter', schulstufen: [1, 2, 3, 4] },
  { id: 'elfe-ii', name: 'ELFE-II', kategorie: 'lesen', kurzbeschreibung: 'Leseverständnistest für Erst- bis Sechstklässler', einheit: 'prozentrang', schwellenwert: 15, schwellenrichtung: 'unter', schulstufen: [1, 2, 3, 4, 5, 6] },
  { id: 'live-lesefluessigkeit', name: '1:1 Leseflüssigkeit (RGW)', kategorie: 'lesen', kurzbeschreibung: 'Mund-zu-Ohr-Leseflüssigkeitsdiagnose (Richtig gelesene Wörter pro Minute)', einheit: 'rohwert', schwellenwert: 40, schwellenrichtung: 'unter', schulstufen: [1, 2, 3, 4] },
  { id: 'hsp', name: 'HSP', kategorie: 'rechtschreiben', kurzbeschreibung: 'Hamburger Schreib-Probe', einheit: 'prozentrang', schwellenwert: 15, schwellenrichtung: 'unter', schulstufen: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  { id: 'ert-0-plus', name: 'ERT 0+', kategorie: 'mathematik', kurzbeschreibung: 'Eggenberger Rechentest', einheit: 'prozentrang', schwellenwert: 15, schwellenrichtung: 'unter', schulstufen: [0, 1] },
  { id: 'ert-1-plus', name: 'ERT 1+', kategorie: 'mathematik', kurzbeschreibung: 'Eggenberger Rechentest', einheit: 'prozentrang', schwellenwert: 15, schwellenrichtung: 'unter', schulstufen: [1, 2] },
  { id: 'ert-2-plus', name: 'ERT 2+', kategorie: 'mathematik', kurzbeschreibung: 'Eggenberger Rechentest', einheit: 'prozentrang', schwellenwert: 15, schwellenrichtung: 'unter', schulstufen: [2, 3] },
  { id: 'ert-3-plus', name: 'ERT 3+', kategorie: 'mathematik', kurzbeschreibung: 'Eggenberger Rechentest', einheit: 'prozentrang', schwellenwert: 15, schwellenrichtung: 'unter', schulstufen: [3, 4] },
  { id: 'ert-4-plus', name: 'ERT 4+', kategorie: 'mathematik', kurzbeschreibung: 'Eggenberger Rechentest', einheit: 'prozentrang', schwellenwert: 15, schwellenrichtung: 'unter', schulstufen: [4, 5] },
  { id: 'live-kopfrechnen', name: '1:1 Kopfrechen-Check', kategorie: 'mathematik', kurzbeschreibung: 'Automatisierung und Zehnerübergangs-Diagnose im Kopfrechnen', einheit: 'punkte', schwellenwert: 7, schwellenrichtung: 'unter', schulstufen: [1, 2, 3, 4] },
  { id: 'cft-1-r', name: 'CFT 1-R', kategorie: 'kognition', kurzbeschreibung: 'Culture Fair Intelligence Test', einheit: 'tWert', schwellenwert: 40, schwellenrichtung: 'unter', schulstufen: [1, 2, 3] },
  { id: 'mika-d', name: 'MIKA-D', kategorie: 'sprache', kurzbeschreibung: 'Messinstrument zur Kompetenzanalyse - Deutsch', einheit: 'punkte', schwellenwert: 14, schwellenrichtung: 'unter', schulstufen: [0, 1] },
  { id: 'besk', name: 'BESK', kategorie: 'sprache', kurzbeschreibung: 'Beobachtungsbogen zur Erfassung von Sprachkompetenzen', einheit: 'punkte', schwellenwert: 60, schwellenrichtung: 'unter', schulstufen: [0, 1] },
  { id: 'live-phonologie', name: '1:1 Phonologische Bewusstheit', kategorie: 'sprache', kurzbeschreibung: 'Anlaut- und Silbenbewusstheit zur Lese-Rechtschreibvorbereitung (10 Punkte)', einheit: 'punkte', schwellenwert: 8, schwellenrichtung: 'unter', schulstufen: [1, 2] },
  { id: 'live-farben', name: '1:1 Farbunterscheidungs-Check', kategorie: 'sonstige', kurzbeschreibung: 'Bildschirmbasierter Farbmuster-Check; keine medizinische Farbsinn-Diagnostik', einheit: 'punkte', schwellenwert: 3, schwellenrichtung: 'unter', schulstufen: [1, 2, 3, 4] },
  { id: 'live-raum-lage', name: '1:1 Raum-Lage-Orientierung', kategorie: 'kognition', kurzbeschreibung: 'Prüfung der visuomotorischen Orientierung und Links-Rechts-Unterscheidung', einheit: 'punkte', schwellenwert: 3, schwellenrichtung: 'unter', schulstufen: [1, 2, 3, 4] },
  { id: 'live-silben-reim', name: '1:1 Silben & Reimerkennung', kategorie: 'sprache', kurzbeschreibung: 'Diagnose zur phonologischen Bewusstheit im Vorschul- und Volksschulalter', einheit: 'punkte', schwellenwert: 3, schwellenrichtung: 'unter', schulstufen: [1, 2] },
  { id: 'live-mundmotorik', name: '1:1 Mundmotorik & Lautbildung', kategorie: 'sprache', kurzbeschreibung: 'Screening für Logopädie: Lippen-, Zungen- und Artikulationsbewegungen', einheit: 'punkte', schwellenwert: 3, schwellenrichtung: 'unter', schulstufen: [1, 2, 3, 4] },
  { id: 'live-aufmerksamkeit', name: '1:1 Konzentration & Aufmerksamkeit', kategorie: 'konzentration', kurzbeschreibung: 'Selektives Emojis-Suchspiel zur Konzentrationsspanne unter Zeitdruck', einheit: 'punkte', schwellenwert: 10, schwellenrichtung: 'unter', schulstufen: [1, 2, 3, 4] },
  { id: 'live-mengen', name: '1:1 Mengenverständnis', kategorie: 'mathematik', kurzbeschreibung: 'Simultanerfassung von Mengen auf einen Blick (Subitizing)', einheit: 'punkte', schwellenwert: 4, schwellenrichtung: 'unter', schulstufen: [1, 2] },
  { id: 'live-merkfaehigkeit', name: '1:1 Auditives Gedächtnis', kategorie: 'kognition', kurzbeschreibung: 'Prüfung des Arbeitsgedächtnisses durch Zahlennachsprechen', einheit: 'punkte', schwellenwert: 3, schwellenrichtung: 'unter', schulstufen: [1, 2, 3, 4] },
  { id: 'live-feinmotorik', name: '1:1 Feinmotorik', kategorie: 'sonstige', kurzbeschreibung: 'Screening für Stifthaltung, Scherengebrauch und Handgeschicklichkeit', einheit: 'punkte', schwellenwert: 3, schwellenrichtung: 'unter', schulstufen: [1, 2] },
  { id: 'live-zehneruebergang', name: '1:1 Zehnerübergang & Strategie', kategorie: 'mathematik', kurzbeschreibung: 'Diagnose von Rechenstrategien und Zählendem Rechnen im ZR20/100', einheit: 'punkte', schwellenwert: 1, schwellenrichtung: 'unter', schulstufen: [1, 2, 3] },
  { id: 'live-sozialemotional', name: '1:1 Sozial-Emotionales Screening', kategorie: 'verhalten', kurzbeschreibung: 'Screening für Empathie, Gruppenverhalten und Frustrationstoleranz', einheit: 'punkte', schwellenwert: 4, schwellenrichtung: 'unter', schulstufen: [1, 2, 3, 4] },
  { id: 'live-zahlenspanne', name: '1:1 Digit-Span (Zahlenspanne)', kategorie: 'kognition', kurzbeschreibung: 'Prüfung des auditiven Arbeitsgedächtnisses (Vorwärts/Rückwärts)', einheit: 'punkte', schwellenwert: 4, schwellenrichtung: 'unter', schulstufen: [1, 2, 3, 4] },
  { id: 'live-subitizing', name: '1:1 Mengen blitzen', kategorie: 'mathematik', kurzbeschreibung: 'Simultane Mengenerfassung (Subitizing) im Zahlenraum bis 10', einheit: 'punkte', schwellenwert: 10, schwellenrichtung: 'unter', schulstufen: [1, 2, 3] },
  { id: 'live-gonogo', name: '1:1 Stopp-Signal (Go/No-Go)', kategorie: 'konzentration', kurzbeschreibung: 'Prüfung der Impulskontrolle und Reaktionsgeschwindigkeit', einheit: 'punkte', schwellenwert: 5, schwellenrichtung: 'über', schulstufen: [1, 2, 3, 4] },
  { id: 'live-anfangsdiagnostik', name: '1:1 Anfangsdiagnostik 1. Klasse', kategorie: 'mathematik', kurzbeschreibung: 'Erstes Buchstabenscreening, Zahlen erkennen, Mengenlehre und diverse Zahlenbilder (Würfel, Finger, Striche, Zehnerfeld) für Schulanfänger.', einheit: 'punkte', schwellenwert: 15, schwellenrichtung: 'unter', schulstufen: [1] }
];

export interface DiagnostikTest {
  id: string;
  name: string;
  kategorie: 'lesen' | 'rechtschreiben' | 'mathematik' | 'sprache' | 'konzentration' | 'kognition' | 'sonstige' | 'verhalten';
  kurzbeschreibung: string;
  einheit: 'prozentrang' | 'tWert' | 'stanine' | 'rohwert' | 'punkte';
  schwellenwert: number;
  schwellenrichtung: 'unter' | 'über';
  schulstufen: number[];
}

export interface DiagnostikErhebung {
  id: string;
  schuelerId: string;
  testId: string;
  datum: string;
  schuljahr: string;
  schulstufe: number;
  rohwert: number;
  ergebniswert: number;
  kommentar?: string;
  durchgefuehrtVon: string;
  foerderbedarfErkannt: boolean;
  /** Eindeutige Klasse zum Zeitpunkt der Erhebung. Bei Altdaten optional. */
  classId?: string;
  /** Ein Schwellenwert-Hinweis ist noch kein bestätigter Förderbedarf. */
  auffaelligkeitErkannt?: boolean;
  quelle?: 'manuell' | 'import' | 'live' | 'ipsativ' | 'beobachtung';
  meta?: any;
  type?: 'ipsativ' | 'exekutiv' | string;
}

export interface IkmRecord {
  id: string;
  schuelerId: string;
  datum: string;
  schuljahr: string;
  schulstufe: number;
  classId?: string;
  quelle?: 'manuell' | 'import';
  deutschLesenPR?: number;
  deutschZuhoerenPR?: number;
  deutschSprachbewusstseinPR?: number;
  mathematikPR?: number;
  pdfInhalt?: string; // base64 encoded pdf
  pdfName?: string;
  kommentar?: string;
  diagnoseStaerken?: string; // Analysis of strengths
  diagnoseHerausforderungen?: string; // Analysis of areas needing development
  matheDetails?: {
    zahlen?: number;
    operationen?: number;
    groessen?: number;
    ebeneRaum?: number;
    modellieren?: number;
    operieren?: number;
    kommunizieren?: number;
    problemloesen?: number;
  };
}

export interface AntolinRecord {
  id: string;
  schuelerId: string;
  datum: string; // YYYY-MM-DD
  schuljahr: string; // e.g. "2025/2026"
  classId?: string;
  quelle?: 'manuell' | 'import';
  anzahlBuecher: number;
  punkte: number;
  leistung: number; // success percentage, e.g. 87.8
  schwierigkeit: number; // average difficulty, e.g. 1.8
}

export interface SchuelerGoal {
  id: string;
  schuelerId: string;
  bereich: 'schule' | 'leben'; // "schule" (in der Schule) or "leben" (im Leben)
  zielText: string;
  datum: string; // YYYY-MM-DD
  status: 'aktiv' | 'erreicht' | 'verworfen';
  erledigtAm?: string;
  reflexion?: string;
}

export interface KELBereich {
  id: string;
  label: string;
  kategorie: "lernen" | "arbeitsverhalten" | "sozialverhalten" | "interessen";
  kindgerecht: string;
}

export const STANDARD_KEL_BEREICHE: KELBereich[] = [
  { id: 'zuzuhoeren', label: 'Zuhören & Verstehen', kategorie: 'lernen', kindgerecht: 'Ich kann gut zuhören und verstehe, was zu tun ist.' },
  { id: 'lesen', label: 'Lesefreude & Technik', kategorie: 'lernen', kindgerecht: 'Ich lese gerne und verstehe, was ich lese.' },
  { id: 'rechnen', label: 'Mathematisches Denken', kategorie: 'lernen', kindgerecht: 'Mir gefällt das Rechnen und ich finde Lösungen.' },
  { id: 'sprechen', label: 'Ausdruck & Wortschatz', kategorie: 'lernen', kindgerecht: 'Ich kann meine Gedanken gut in Worte fassen.' },
  
  { id: 'konzentration', label: 'Ausdauer & Fokus', kategorie: 'arbeitsverhalten', kindgerecht: 'Ich arbeite konzentriert an einer Sache.' },
  { id: 'ordnung', label: 'Ordnung & Materialien', kategorie: 'arbeitsverhalten', kindgerecht: 'Ich halte meinen Platz und meine Sachen ordentlich.' },
  { id: 'selbststaendigkeit', label: 'Selbstständiges Arbeiten', kategorie: 'arbeitsverhalten', kindgerecht: 'Ich fange eigenständig mit der Arbeit an.' },
  { id: 'tempo', label: 'Arbeitstempo', kategorie: 'arbeitsverhalten', kindgerecht: 'Ich teile mir meine Zeit gut ein.' },

  { id: 'hilfsbereitschaft', label: 'Empathie & Hilfe', kategorie: 'sozialverhalten', kindgerecht: 'Ich helfe anderen Kindern gerne.' },
  { id: 'regeln', label: 'Regeln & Vereinbarungen', kategorie: 'sozialverhalten', kindgerecht: 'Ich halte mich an unsere Klassenregeln.' },
  { id: 'konflikte', label: 'Konfliktlösung', kategorie: 'sozialverhalten', kindgerecht: 'Ich versuche Streit friedlich zu lösen.' },
  { id: 'mitarbeit_gruppe', label: 'Teamarbeit', kategorie: 'sozialverhalten', kindgerecht: 'In der Gruppe arbeite ich gut mit anderen zusammen.' },

  { id: 'neues', label: 'Neugier & Mut', kategorie: 'interessen', kindgerecht: 'Ich traue mir Neues zu.' },
  { id: 'kreativitaet', label: 'Kreatives Gestalten', kategorie: 'interessen', kindgerecht: 'Ich habe eigene Ideen beim Malen, Bauen oder Basteln.' },
  { id: 'bewegung', label: 'Sport & Bewegung', kategorie: 'interessen', kindgerecht: 'Ich bewege mich gerne und probiere Sportarten aus.' }
];

export interface KELGespraech {
  id: string;
  schuelerId: string;
  datum: string;
  schuljahr: string;
  teilnehmer: string[];
  selbsteinschaetzungKind: Record<string, { wert: 1 | 2 | 3 | 4; kommentar?: string }>;
  einschaetzungLehrperson: Record<string, { wert: 1 | 2 | 3 | 4; kommentar?: string }>;
  elternEindruck: string;
  zieleKind: { id: string; ziel: string; woranErkennbar: string; bisWann: string }[];
  vereinbarungen: string;
  naechsterTermin: string;
  unterschriftKind: boolean;
  unterschriftEltern: boolean;
  unterschriftLehrperson: boolean;
  notiz: string;
}

export interface SkillRadar {
  konzentration: number;
  teamfaehigkeit: number;
  frustrationstoleranz: number;
  selbstorganisation: number;
  anstrengungsbereitschaft: number;
}

export interface Foerderprofil {
  staerken?: string[];
  skillRadar?: SkillRadar;
  foerderbedarfBereiche?: string[];
  diagnosen?: string;
  mikaDStatus?: "1" | "2" | "3" | "ordentlich" | "ausreichend" | "mangelhaft" | "ungenuegend" | "nicht erhoben";
  mikaDDatum?: string;
  mikaDVersion?: "MIKA-D" | "MIKA-D 2.0";
  mikaDNotiz?: string;
  foerderziele?: {
    id: string;
    ziel: string;
    bereich: string;
    startDatum: string;
    zielDatum: string;
    status: "offen" | "in Arbeit" | "erreicht" | "verworfen";
    notiz?: string;
    diagnostikErhebungId?: string;
  }[];
  massnahmen?: {
    id: string;
    datum: string;
    beschreibung?: string;
    bezeichnung?: string;
    wirksamkeit: "hoch" | "mittel" | "gering" | "unklar";
    notiz?: string;
    zielId?: string;
    kontrollDatum?: string;
  }[];
  zusatzinfo?: string;
  zusammenarbeit?: string;
  letzteAktualisierung?: string;
}

export interface AppNote {
  id: string;
  datum: string;
  kategorie: 'Journal' | 'Verhalten' | 'Eltern' | 'Erfolg' | 'Notiz' | 'reflexion' | 'allgemein';
  inhalt: string;
  schuelerId?: string;
  quelle?: string;
  icon?: string;
}

export interface NoteEntry extends AppNote {}

export interface Observation extends AppNote {
  // Legacy support for Observation type
  date: string;
  text: string;
  category: any;
}

export interface PortfolioEntry {
  id: string;
  datum: string;
  titel: string;
  beschreibung?: string;
  /** Legacy portfolio metadata retained during migration. */
  fach?: string;
  bewertung?: string;
  bildUrl?: string; // base64 or file reference
  tags?: string[];
  isInKEL?: boolean; // Highlight for KEL
  matchedLernziele?: {fach: string, text: string, id: string}[];
}

export type FotoFreigabeStatus = 'erlaubt' | 'nur_homepage' | 'nicht_erlaubt';

export interface Student {
  id: string;
  vorname: string;
  nachname: string;
  name: string;
  niveau: number;
  notiz: string;
  allergien?: string;
  fotoFreigabe?: FotoFreigabeStatus;
  geburtstag: string;
  staatsbuergerschaft: string;
  religion: string;
  besuchsjahr: string;
  espf: boolean;
  spf: boolean;
  erstsprache: string;
  daz?: boolean;
  zweitsprache?: string;
  geschlecht: string;
  gruppen: string[];
  anschrift?: string;
  plz?: string;
  ort?: string;
  telefon_mutter?: string;
  telefon_vater?: string;
  email_eltern?: string;
  sv_nummer?: string;
  stammdatenAktualisiertAm?: string;
  ikmNummer?: number; // Customizable number for matching IKM Plus records
  foerderprofil?: Foerderprofil;
  foto?: string;
  emoji?: string;
  badges?: { id: string, name: string, date: string, icon: string }[];
  charakter?: string[];
  wunschpartner?: string[]; // student IDs
  sperrpartner?: string[];  // student IDs
  portfolio?: PortfolioEntry[];
  geburtsdatum?: string; // Standardized name for birthday if needed
  warnThresholds?: Record<string, number>; // Individual warning threshold mapped by testId
  erlaeuterungsmatrix?: {
    bewertungen: Record<string, number | null>;
    bemerkung: string;
    schuljahr: string;
    semester: '1' | '2';
    semesterBewertungen?: Partial<Record<'1' | '2', Record<string, number | null>>>;
    semesterBemerkungen?: Partial<Record<'1' | '2', string>>;
    schema: 'oberau-standard' | 'oberau-spf';
    aktualisiertAm: string;
  };
}

export interface VertretungsStundenbild {
  id: string;
  titel: string;
  fach: string;
  schulstufen: number[];
  dauer: number;
  schwierigkeit: 'einfach' | 'mittel' | 'anspruchsvoll';
  beschreibung: string; // Phasen: Einstieg, Arbeitsphase, Reflexion
  benoetigtesMaterial: string[];
  lernziel: string;
  tags: string[];
  erstelltAm: string;
  zuletztVerwendet?: string;
  istEigeneVorlage: boolean;
}

export const VORLAGEN_VERTRETUNGSSTUNDEN: VertretungsStundenbild[] = [
  {
    id: 'vorlage-1',
    titel: 'Wörter-Bingo',
    fach: 'Deutsch',
    schulstufen: [1, 2, 3, 4],
    dauer: 45,
    schwierigkeit: 'einfach',
    lernziel: 'Festigung des aktuellen Wortschatzes und Schulung der auditiven Merkfähigkeit.',
    benoetigtesMaterial: ['Papier', 'Stifte', 'Tafel'],
    beschreibung: 'Einstieg: Die Kinder zeichnen ein 3x3 Raster auf ein Blatt Papier. Gemeinsam werden 15 Wörter an die Tafel geschrieben, die aktuell im Unterricht vorkommen.\nArbeitsphase: Jedes Kind wählt 9 dieser Wörter aus und schreibt sie in sein Raster. Die Lehrperson (oder ein Kind) liest die Wörter in zufälliger Reihenfolge vor. Wer das Wort hat, streicht es durch.\nReflexion: Wer zuerst eine Reihe (waagrecht, senkrecht, diagonal) voll hat, ruft "Bingo". Wir besprechen schwierige Wörter noch einmal.',
    tags: ['Spiel', 'Wortschatz', 'Bingo'],
    erstelltAm: '2024-01-01',
    istEigeneVorlage: false
  },
  {
    id: 'vorlage-2',
    titel: 'Kopfrechen-Olympiade',
    fach: 'Mathematik',
    schulstufen: [1, 2, 3, 4],
    dauer: 30,
    schwierigkeit: 'mittel',
    lernziel: 'Automatisierung der Grundrechenarten im Kopf.',
    benoetigtesMaterial: ['Tafel', 'Kreide'],
    beschreibung: 'Einstieg: Kurze Aufwärmrunde mit "Blitzrechnen" im Plenum. Die Regeln der Olympiade werden erklärt (Fairness, Schnelligkeit).\nArbeitsphase: Zwei Kinder treten an der Tafel gegeneinander an. Die Lehrperson nennt eine Rechnung. Wer zuerst das richtige Ergebnis sagt/schreibt, bekommt einen Punkt. Das Gewinner-Kind bleibt stehen, ein neues fordert es heraus.\nReflexion: Medaillenübergabe (symbolisch) an die Tagessieger. Kurze Feedbackrunde: Welche Aufgaben waren besonders knifflig?',
    tags: ['Rechnen', 'Wettbewerb', 'Kopfrechnen'],
    erstelltAm: '2024-01-01',
    istEigeneVorlage: false
  },
  {
    id: 'vorlage-3',
    titel: 'Klassenraum-Schatzsuche',
    fach: 'Sachunterricht',
    schulstufen: [1, 2, 3, 4],
    dauer: 45,
    schwierigkeit: 'einfach',
    lernziel: 'Genaues Beobachten und Orientierung im vertrauten Raum.',
    benoetigtesMaterial: ['Papier', 'Stifte'],
    beschreibung: 'Einstieg: Die Lehrperson erklärt, dass im Klassenraum "Schätze" (bestimmte Gegenstände oder Informationen) versteckt sind. Suchliste wird ausgegeben.\nArbeitsphase: Die Kinder suchen in Partnerarbeit nach Informationen (z.B. "Wie viele Beine hat der Klassentisch?", "Welche Farbe hat der dicke Ordner im Regal?"). Die Ergebnisse werden notiert.\nReflexion: Gemeinsames Vergleichen der Fundstücke. Wer hat alles entdeckt? Besprechung von Besonderheiten im Raum.',
    tags: ['Orientierung', 'Entdecken', 'Partnerarbeit'],
    erstelltAm: '2024-01-01',
    istEigeneVorlage: false
  },
  {
    id: 'vorlage-4',
    titel: 'Pantomime-Wörterraten',
    fach: 'Deutsch',
    schulstufen: [1, 2, 3, 4],
    dauer: 30,
    schwierigkeit: 'einfach',
    lernziel: 'Förderung der Ausdrucksfähigkeit und der Interpretation körpersprachlicher Signale.',
    benoetigtesMaterial: ['Papier-Zettel'],
    beschreibung: 'Einstieg: Kurze Erklärung, was Pantomime bedeutet (kein Sprechen, nur Körper). Ein Beispiel wird von der Lehrperson vorgemacht.\nArbeitsphase: Kinder ziehen Zettel mit Begriffen (Tiere, Berufe, Tätigkeiten). Ein Kind stellt den Begriff pantomimisch vor der Klasse dar, die anderen raten.\nReflexion: Besprechung: Was war leicht darzustellen, was schwer? Welche Bewegungen haben den entscheidenden Hinweis gegeben?',
    tags: ['Spiel', 'Ausdruck', 'Körpersprache'],
    erstelltAm: '2024-01-01',
    istEigeneVorlage: false
  },
  {
    id: 'vorlage-5',
    titel: 'Bewegungsspiele in der Klasse',
    fach: 'Bewegung und Sport',
    schulstufen: [1, 2, 3, 4],
    dauer: 20,
    schwierigkeit: 'einfach',
    lernziel: 'Abbau von Spannungen und Förderung der Konzentration durch Bewegung.',
    benoetigtesMaterial: ['Keines'],
    beschreibung: 'Einstieg: Kurzes Auflockern am Platz (Recken und Strecken). Erklärung des ersten Spiels "Kommando Pimperle".\nArbeitsphase: Durchführung verschiedener Spiele wie "Ozean-Welle" (Kinder stehen nacheinander auf und setzen sich wieder), "Spiegelbild" (Partnerübung) oder "Stille Post mit Bewegung".\nReflexion: Kurze Beruhigungsphase (Tiefes Ein- und Ausatmen). Die Kinder reflektieren, wie sie sich nach der Bewegung fühlen.',
    tags: ['Bewegung', 'Pause', 'Konzentration'],
    erstelltAm: '2024-01-01',
    istEigeneVorlage: false
  },
  {
    id: 'vorlage-6',
    titel: 'Stille-Übungen',
    fach: 'Sachunterricht',
    schulstufen: [1, 2, 3, 4],
    dauer: 15,
    schwierigkeit: 'einfach',
    lernziel: 'Schulung der auditiven Wahrnehmung und Selbstregulation.',
    benoetigtesMaterial: ['Glöckchen oder Klangschale (optional)'],
    beschreibung: 'Einstieg: Die Kinder setzen sich bequem hin, schließen die Augen. Ein Signal (Klang oder leises Klatschen) leitet die Stille ein.\nArbeitsphase: 5 Minuten absolute Stille. Die Kinder lauschen auf Geräusche von draußen oder aus dem Schulhaus. Danach kurzes "Blind-Malen" einer Form auf den Tisch.\nReflexion: Was hast du in der Stille gehört? War es schwer, ganz ruhig zu sein? Wie fühlst du dich jetzt?',
    tags: ['Stille', 'Wahrnehmung', 'Entspannung'],
    erstelltAm: '2024-01-01',
    istEigeneVorlage: false
  },
  {
    id: 'vorlage-7',
    titel: 'Bildgeschichte zeichnen',
    fach: 'Bildnerische Erziehung',
    schulstufen: [1, 2, 3, 4],
    dauer: 60,
    schwierigkeit: 'mittel',
    lernziel: 'Visualisierung einer Handlung in logischer Abfolge.',
    benoetigtesMaterial: ['Papier', 'Buntstifte'],
    beschreibung: 'Einstieg: Ein kurzer Handlungsimpuls wird gegeben (z.B. "Ein Hund findet einen Zauberknochen"). Wir sammeln Ideen für den Verlauf.\nArbeitsphase: Die Kinder unterteilen ihr Blatt in 4-6 Felder und zeichnen die Geschichte chronologisch als Comic oder Bildfolge.\nReflexion: Die Kinder präsentieren ihre Geschichten in kleinen Gruppen. Welche Wendung war am lustigsten oder spannendsten?',
    tags: ['Zeichnen', 'Kreativität', 'Storytelling'],
    erstelltAm: '2024-01-01',
    istEigeneVorlage: false
  },
  {
    id: 'vorlage-8',
    titel: 'Stop-Tanz mit Klatschrhythmen',
    fach: 'Musikerziehung',
    schulstufen: [1, 2, 3, 4],
    dauer: 30,
    schwierigkeit: 'einfach',
    lernziel: 'Schulung des Rhythmusgefühls und der Reaktionsfähigkeit.',
    benoetigtesMaterial: ['Musik-Player (optional) oder Klatschen'],
    beschreibung: 'Einstieg: Ein einfacher Klatschrhythmus wird vorgegeben und von den Kindern im Echo wiederholt.\nArbeitsphase: Die Kinder bewegen sich zur Musik (oder zum Trommeln/Klatschen der LP). Wenn die Musik stoppt, müssen sie einfrieren und einen bestimmten Rhythmus nachklatschen, bevor es weitergeht.\nReflexion: Welcher Rhythmus war am schwersten? Wie haben sich die Bewegungen zur Musik verändert?',
    tags: ['Musik', 'Rhythmus', 'Bewegung'],
    erstelltAm: '2024-01-01',
    istEigeneVorlage: false
  },
  {
    id: 'vorlage-9',
    titel: 'Reisen durch Österreich',
    fach: 'Sachunterricht',
    schulstufen: [3, 4],
    dauer: 45,
    schwierigkeit: 'anspruchsvoll',
    lernziel: 'Festigung des Wissens über die Bundesländer und Landeshauptstädte.',
    benoetigtesMaterial: ['Tafel', 'Papier', 'Stifte'],
    beschreibung: 'Einstieg: Wir sammeln an der Tafel die Namen der 9 Bundesländer Österreichs und ordnen (wenn möglich) die Hauptstädte zu.\nArbeitsphase: Die Kinder erstellen in Gruppen einen kleinen "Reiseplan" durch Österreich (Stationen, Sehenswürdigkeiten). Ein fiktiver Reiseweg wird auf Papier skizziert.\nReflexion: Präsentation der Reiserouten. Welches Bundesland würden die Kinder gerne einmal wirklich besuchen?',
    tags: ['Österreich', 'Geografie', 'Gruppenarbeit'],
    erstelltAm: '2024-01-01',
    istEigeneVorlage: false
  },
  {
    id: 'vorlage-10',
    titel: 'Reimwörter-Spiel',
    fach: 'Deutsch',
    schulstufen: [1, 2],
    dauer: 30,
    schwierigkeit: 'einfach',
    lernziel: 'Schulung der phonologischen Bewusstheit durch Erkennen von Endreimen.',
    benoetigtesMaterial: ['Papier', 'Stifte'],
    beschreibung: 'Einstieg: Die LP nennt ein Wort (z.B. HAUS) und die Kinder rufen Reimwörter (MAUS, KLAUS, RAUS).\nArbeitsphase: Die Kinder bekommen ein Blatt mit 5 Startwörtern und sollen so viele Reimwörter wie möglich dazu finden und aufschreiben/aufzeichnen.\nReflexion: Gemeinsames Vorlesen der Reim-Listen. Wer hat das lustigste Reimwort gefunden? Kurze Reim-Kette im Kreis.',
    tags: ['Deutsch', 'Reime', 'Sprache'],
    erstelltAm: '2024-01-01',
    istEigeneVorlage: false
  },
  {
    id: 'vorlage-11',
    titel: 'Schätz-Aufgaben Mathematik',
    fach: 'Mathematik',
    schulstufen: [1, 2, 3, 4],
    dauer: 30,
    schwierigkeit: 'mittel',
    lernziel: 'Entwicklung eines Gefühls für Mengen und Längen.',
    benoetigtesMaterial: ['Alltagsgegenstände (Stifte, Klammern, Buch)'],
    beschreibung: 'Einstieg: Die LP hält ein Glas mit Murmeln oder Klammern hoch. Wie viele könnten das sein? Erste Schätzungen werden gesammelt.\nArbeitsphase: An verschiedenen Stationen müssen Längen geschätzt (Tischbreite) oder Mengen bestimmt werden. Danach wird genau nachgemessen oder gezählt.\nReflexion: Wie nah waren die Schätzungen am Ergebnis? Warum ist Schätzen im Alltag wichtig?',
    tags: ['Schätzen', 'Mengen', 'Größen'],
    erstelltAm: '2024-01-01',
    istEigeneVorlage: false
  },
  {
    id: 'vorlage-12',
    titel: 'Klassenmusikinstrumenten-Bau',
    fach: 'Musikerziehung',
    schulstufen: [1, 2, 3, 4],
    dauer: 45,
    schwierigkeit: 'mittel',
    lernziel: 'Kreative Nutzung von Alltagsmaterialien zur Tonerzeugung.',
    benoetigtesMaterial: ['Lineal', 'Stifte', 'Dose', 'Gummibänder (wenn vorhanden)'],
    beschreibung: 'Einstieg: Wir untersuchen, wie man mit Schreibutensilien Töne erzeugen kann (Zupfen am Lineal, Klopfen auf die Dose).\nArbeitsphase: Jedes Kind "baut" ein Instrument aus seinem Federpönnal-Inhalt. In kleinen Musikgruppen wird ein gemeinsamer Rhythmus einstudiert.\nReflexion: Das Klassen-Orchester spielt auf. Wir besprechen, welche Materialien welche Art von Tönen (hoch, tief, laut, leise) erzeugen.',
    tags: ['Musik', 'Instrumente', 'Kreativität'],
    erstelltAm: '2024-01-01',
    istEigeneVorlage: false
  },
  {
    id: 'vorlage-13',
    titel: 'Sinnesparcours',
    fach: 'Sachunterricht',
    schulstufen: [1, 2, 3, 4],
    dauer: 45,
    schwierigkeit: 'mittel',
    lernziel: 'Bewusstsein für die eigenen Sinne (Tasten, Hören, Riechen) schärfen.',
    benoetigtesMaterial: ['Tücher zum Verbinden der Augen', 'Gegenstände zum Fühlen'],
    beschreibung: 'Einstieg: Kurze Wiederholung der 5 Sinne. Einer wird heute besonders gefordert: das Tastgefühl.\nArbeitsphase: Kinder führen sich gegenseitig mit verbundenen Augen durch einen kleinen Parcours (oder befühlen verdeckte Gegenstände in Säckchen/Boxen).\nReflexion: Wie war es, nichts zu sehen? Welche Sinne haben geholfen? Was war am schwersten zu erkennen?',
    tags: ['Sinne', 'Wahrnehmung', 'Vertrauen'],
    erstelltAm: '2024-01-01',
    istEigeneVorlage: false
  },
  {
    id: 'vorlage-14',
    titel: 'Mathe-Memory',
    fach: 'Mathematik',
    schulstufen: [1, 2],
    dauer: 45,
    schwierigkeit: 'mittel',
    lernziel: 'Verknüpfung von Rechenaufgabe und Ergebnis.',
    benoetigtesMaterial: ['Papier', 'Schere', 'Stifte'],
    beschreibung: 'Einstieg: Das Prinzip von Memory wird kurz erklärt (Paare finden: Rechnung und Ergebnis).\nArbeitsphase: Die Kinder stellen in Partnerarbeit eigene Memory-Karten her (10 Paare). Danach wird das selbstgemachte Spiel gespielt.\nReflexion: Tausch der Spiele mit anderen Gruppen. Welche Aufgaben waren besonders schwierig für den Partner?',
    tags: ['Rechnen', 'Spiel', 'Basteln'],
    erstelltAm: '2024-01-01',
    istEigeneVorlage: false
  },
  {
    id: 'vorlage-15',
    titel: 'Vorlesegeschichten mit Aufgaben',
    fach: 'Deutsch',
    schulstufen: [1, 2, 3, 4],
    dauer: 45,
    schwierigkeit: 'einfach',
    lernziel: 'Förderung des Hörverstehens und der Fantasie.',
    benoetigtesMaterial: ['Buch oder Textvorlage', 'Papier', 'Stifte'],
    beschreibung: 'Einstieg: Einleitung in eine spannende Geschichte. Die Kinder machen es sich gemütlich.\nArbeitsphase: Die LP liest eine Geschichte vor. An einer spannenden Stelle wird gestoppt. Die Kinder malen oder schreiben das Ende der Geschichte.\nReflexion: Vergleich der verschiedenen Enden. Das richtige Ende (wenn vorhanden) wird vorgelesen. Was hat den Kindern besser gefallen?',
    tags: ['Lesen', 'Hören', 'Kreativität'],
    erstelltAm: '2024-01-01',
    istEigeneVorlage: false
  },
  {
    id: 'vorlage-16',
    titel: 'Buchstabensalat-Rätsel',
    fach: 'Deutsch',
    schulstufen: [2, 3, 4],
    dauer: 30,
    schwierigkeit: 'mittel',
    lernziel: 'Festigung der Rechtschreibung und optischen Differenzierung.',
    benoetigtesMaterial: ['Tafel', 'Papier', 'Stifte'],
    beschreibung: 'Einstieg: An der Tafel steht ein Wort mit vertauschten Buchstaben (z.B. ELSUCH -> SCHULE). Wer findet es zuerst?\nArbeitsphase: Die Kinder entwerfen für ihren Nachbarn 5 solcher Buchstabensalat-Rätsel aus einem bestimmten Fachbereich oder zu einem aktuellen Thema.\nReflexion: Gegenseitiges Lösen und Kontrollieren. Besprechung von Strategien: Wonach sucht man zuerst (Großbuchstaben, bekannte Silben)?',
    tags: ['Deutsch', 'Rätsel', 'Rechtschreibung'],
    erstelltAm: '2024-01-01',
    istEigeneVorlage: false
  },
  {
    id: 'vorlage-17',
    titel: 'Geometrische Formen-Suche',
    fach: 'Mathematik',
    schulstufen: [1, 2, 3, 4],
    dauer: 30,
    schwierigkeit: 'einfach',
    lernziel: 'Erkennen von geometrischen Grundformen in der Umwelt.',
    benoetigtesMaterial: ['Papier', 'Stifte'],
    beschreibung: 'Einstieg: Kurze Wiederholung: Quadrat, Rechteck, Kreis, Dreieck. Wo sehen wir diese Formen gerade im Raum?\nArbeitsphase: "Formendetektive" im Klassenzimmer: Die Kinder suchen Gegenstände, die einer dieser Formen entsprechen und listen sie auf.\nReflexion: Besprechung der Listen. Welche Form kommt am häufigsten vor? Warum haben Fenster oft dieselbe Form?',
    tags: ['Geometrie', 'Entdecken', 'Formen'],
    erstelltAm: '2024-01-01',
    istEigeneVorlage: false
  },
  {
    id: 'vorlage-18',
    titel: 'Pausenhof-Skizze',
    fach: 'Bildnerische Erziehung',
    schulstufen: [2, 3, 4],
    dauer: 45,
    schwierigkeit: 'anspruchsvoll',
    lernziel: 'Schulung der perspektivischen Wahrnehmung und Detailtreue.',
    benoetigtesMaterial: ['Papier', 'Bleistift'],
    beschreibung: 'Einstieg: Blick aus dem Fenster oder kurzer Gang zum Pausenhof. Worauf achten wir beim Zeichnen (Größenverhältnisse, Position)?\nArbeitsphase: Die Kinder skizzieren den Pausenhof oder Teile davon. Fokus liegt auf den stationären Objekten (Klettergerüst, Baum, Bank).\nReflexion: Vergleich der Zeichnungen. Was wurde von allen gezeichnet, was wurde übersehen?',
    tags: ['Zeichnen', 'Beobachtung', 'Skizze'],
    erstelltAm: '2024-01-01',
    istEigeneVorlage: false
  },
  {
    id: 'vorlage-19',
    titel: 'Wetter-Protokoll',
    fach: 'Sachunterricht',
    schulstufen: [1, 2, 3, 4],
    dauer: 30,
    schwierigkeit: 'einfach',
    lernziel: 'Systematisches Beobachten und Dokumentieren von Wetterphänomenen.',
    benoetigtesMaterial: ['Tafel', 'Papier', 'Stifte'],
    beschreibung: 'Einstieg: Wie ist das Wetter heute? Wir sammeln Begriffe und Symbole an der Tafel (Sonne, Wolken, Regen).\nArbeitsphase: Die Kinder gestalten ein kleines Wetter-Logbuch für eine Woche (oder den aktuellen Tag) mit Temperatur-Schätzung und Symbolen.\nReflexion: Vergleich der Schätzungen. Wie ändert sich das Wetter im Laufe eines Tages? Wieso ist ein Wetterbericht nützlich?',
    tags: ['Wetter', 'Beobachtung', 'Dokumentation'],
    erstelltAm: '2024-01-01',
    istEigeneVorlage: false
  },
  {
    id: 'vorlage-20',
    titel: 'Klassenglas-Reflexion',
    fach: 'Sachunterricht',
    schulstufen: [1, 2, 3, 4],
    dauer: 20,
    schwierigkeit: 'einfach',
    lernziel: 'Förderung des Klassenzusammenhalts und der positiven Reflexion.',
    benoetigtesMaterial: ['Klassenglas (wenn vorhanden) oder Papier-Sterne'],
    beschreibung: 'Einstieg: Wir besprechen, was heute (oder in dieser Woche) besonders gut geklappt hat in der Klassengemeinschaft.\nArbeitsphase: Jedes Kind darf einen "Belohnungspunkt" (oder Papierstern) für ein anderes Kind oder die ganze Klasse begründen und ins Glas werfen.\nReflexion: Kurze Abschlussrunde: Wie fühlen wir uns, wenn wir Lob hören? Was wollen wir morgen genauso gut machen?',
    tags: ['Soziales', 'Reflexion', 'Zusammenhalt'],
    erstelltAm: '2024-01-01',
    istEigeneVorlage: false
  }
];

export interface MorgenAufgabe {
  id: string;
  text: string;
  completed: boolean;
}

export interface Zugangsdaten {
  id: string;
  bezeichnung: string;
  benutzername: string;
  passwort: string;
  url?: string;
  kategorie: string;
  notiz?: string;
}

export type AssessmentMode = 'grades' | 'percent' | 'points';

export interface SubjectNotenMeta {
  saCount?: number;
  assessmentMode?: AssessmentMode;
  /** Subject-specific homework handling. Legacy global settings are only migration fallbacks. */
  hueMode?: 'document' | 'grade';
  hueDeduction?: number;
  hueMitarbeitWeight?: number;
  maxPoints?: {
    sa?: number[];
    lzk?: number[];
    wp?: number[];
    obj?: number[];
    [key: string]: number[] | undefined;
  };
  colCounts?: { lzk: number; wp: number; obj: number };
  colLabels?: { sa?: Record<number, string>; lzk?: Record<number, string>; wp?: Record<number, string>; obj?: Record<number, string> };
  colDates?: { sa?: Record<number, string>; lzk?: Record<number, string>; wp?: Record<number, string>; obj?: Record<number, string> };
  [key: string]: any;
}

export interface GradeData {
  sa: (number | string | null)[];
  lzk: (number | string | null)[];
  wp: (number | string | null)[];
  aufgaben: (number | string | null)[];
  hue: number;
  hueAnm: string[];
  hueErfasst?: boolean;
  miDirekt?: number;
  freitext?: string;
  endnote?: string;
  mode?: 'absolute' | 'relative' | 'manual';
}

export interface ParentMeeting {
  id: string;
  schuelerId: string;
  datum: string;
  thema: string;
  notizen: string;
  vereinbarungen: string;
  bewertungsModus?: 'zahlen' | 'skala3' | 'skala4' | 'skala6';
  bewertung?: Record<string, number>;
  bildungsziele?: Record<string, number>;
  custom_bewertung?: { id: string; label: string; value: number | null }[];
  teilnehmer?: string;
  naechste_schritte?: string;
}

export interface Note {
  id: string;
  titel: string;
  inhalt: string;
  icon: string;
  timestamp: number;
  termin?: string;
  schuelerId?: string; // If present, this note belongs to a student
  kategorie?: string;
}

export interface MaterialItem {
  id: string;
  titel: string;
  beschreibung: string;
  typ: 'datei' | 'link' | 'stundenentwurf' | 'notfallplan' | 'elternbrief' | 'notiz' | 'beurteilung' | 'reflexion' | 'sonstiges';
  dateiName?: string;
  dateiTyp?: string; // MIME-Type
  dateiInhalt?: string; // Base64-codiert
  externerLink?: string;
  inhaltText?: string; // Für Stundenentwürfe, KI-Generiertes etc.
  
  // Erweiterung für Stundenentwürfe aus Übergabemappe (optional)
  dauer?: number;
  schwierigkeit?: 'einfach' | 'mittel' | 'anspruchsvoll';
  lernziel?: string;
  benoetigtesMaterial?: string[];
  istEigeneVorlage?: boolean;

  faecher: string[];
  schulstufen: number[];
  tags: string[];
  lehrplanZuordnung?: {
    fach: string;
    kompetenzbereichId: string;
    anwendungsbereichIds: string[];
  };
  erstelltAm: string;
  zuletztVerwendet?: string;
  favorit: boolean;
  kiGeneriert: boolean;
  quelleModul?: string; // z.B. „ki-helfer", „uebergabemappe", „manuell"
}

export interface ActivityLogEntry {
  id: string;
  timestamp: number;
  action: string;
  entityType: 'kel' | 'foerderprofil' | 'diagnostik' | 'wochenplan' | 'note' | 'schueler' | 'material' | 'sonstiges';
  entityId?: string;
}

export interface Geldsammlung {
  id: string;
  titel: string;
  betrag: number;
  erstelltAm: string;
  faelligkeit?: string;
  abgeschlossen?: boolean;
  kategorie?: string;
  beschreibung?: string;
  status: Record<string, 'offen' | 'teilweise' | 'bezahlt'>;
  betraege: Record<string, number>;
}

export interface KassenTransaktion {
  id: string;
  datum: string;
  titel: string;
  betrag: number;
  typ: 'plus' | 'minus';
  kategorie?: 'sammlung' | 'ausgabe' | 'sonstiges';
  geldsammlungId?: string;
  schuelerId?: string;
}

export interface OrgCheckliste {
  id: string;
  titel: string;
  datum?: string;
  spalten: { id: string; label: string }[];
  eintraege: Record<string, Record<string, boolean>>;
}

export type CustomListColumnType = 'text' | 'number' | 'boolean' | 'select';

export interface CustomListColumn {
  id: string;
  label: string;
  name?: string;
  type: CustomListColumnType;
  options?: string[]; // e.g. ['Fleisch', 'vegetarisch', 'vegan'] or ['S', 'M', 'L', 'XL']
}

export interface CustomList {
  id: string;
  titel: string;
  beschreibung?: string;
  erstelltAm?: string;
  updatedAm?: string;
  spalten?: CustomListColumn[];
  werte?: Record<string, Record<string, any>>;
  // For backwards-compatibility
  spaltenName?: string;
}

export interface KlassenDienst {
  id: string;
  titel: string;
  icon: string | any; // Allow for lucide icons as components or strings
  emoji?: string;
  schuelerIds: string[];
  rotationEnabled?: boolean;
  anzahl?: number;
  substitutions?: Record<string, string>; // originalStudentId -> substituteStudentId
  substitutionsDate?: string;
}

export interface ChatEntry {
  id: string;
  timestamp: number;
  frage: string; // The first user question
  nachrichten: Message[];
}

export interface Message {
  role: 'user' | 'ai';
  content: string;
}

export interface StatusHistory {
  id: string;
  schuelerId: string;
  datum: string;
  iconId: string;
  timestamp: number;
  comment?: string;
}

export interface ClassRoom {
  /** Class-local detailed assessments; same shape as the active-class projection. */
  saAssessments?: AppState['saAssessments'];
  id: string;
  name: string;
  stufe: number;
  schuljahr?: string;
  klassenvorstand: boolean;
  schueler: Student[];
  noten: Record<string, Record<string, Record<string, GradeData>>>;
  /** Per-class assessment modes, column metadata/labels and related gradebook configuration. */
  notenMeta?: Record<string, any>;
  /** Per-class subject/category weightings. */
  notenGewichtung?: Record<string, any>;
  /** Class-local learning-goal tracker and individual ratings. */
  lernzielTracker?: AppState['lernzielTracker'];
  studentLernzielBewertungen?: AppState['studentLernzielBewertungen'];
  studentLernzielSemesterBewertungen?: AppState['studentLernzielSemesterBewertungen'];
  /** Class-local diagnostic and student-development data. */
  diagnostikErgebnisse?: AppState['diagnostikErgebnisse'];
  diagnostikErhebungen?: AppState['diagnostikErhebungen'];
  diagnosticResults?: AppState['diagnosticResults'];
  ikmRecords?: AppState['ikmRecords'];
  antolinRecords?: AppState['antolinRecords'];
  schuelerGoals?: AppState['schuelerGoals'];
  observations?: AppState['observations'];
  metaKognitionsProtokolle?: AppState['metaKognitionsProtokolle'];
  interaktionsLog?: AppState['interaktionsLog'];
  mitarbeit: Record<string, Record<string, Record<string, number>>>;
  /** Class-local participation grading thresholds/mode used by the gradebook. */
  mitarbeit_settings?: AppState['mitarbeit_settings'];
  verhalten: Record<string, number>;
  karten: Record<string, { gelb: number; rot: number; archiv: any[] }>;
  jahresplanung: Record<number, any>;
  jahresplan_faecher?: { id: string; label: string; color: string }[];
  wochenplanung: Record<number, any>;
  wochenplanSyncSet?: string[];
  scheduleAnalysis?: Record<number, any>;
  stammplan: Record<string, Record<number, string>>;
  anwesenheit: Record<string, Record<string, Record<string, string>>>;
  anwesenheitDetail?: Record<string, Record<string, { verspaetung?: number; notiz?: string; dismissedAlerts?: string[]; fehlstunden?: number }>>;
  schuelerStimmung?: Record<string, Record<string, number>>;
  dienste?: KlassenDienst[];
  klassenglas_count: number;
  klassenglas_ziel: number;
  klassenglas_belohnung?: string;
  klassenglas_missions?: any[];
  klassenglas_completed_missions?: any[];
  checklisten?: OrgCheckliste[];
  customLists?: CustomList[];
  /** Class-local portal/login credentials shown in Kassa & Orga. */
  zugangsdaten?: Zugangsdaten[];
  klassenkasse?: {
    kontostand: number;
    sammlungen: Geldsammlung[];
    transaktionen: KassenTransaktion[];
  };
  behavior_status?: Record<string, string>;
  behavior_notes?: Record<string, string>;
  /** Class-local chronicle/observation entries. */
  notes?: AppNote[];
  /** Legacy mirror of class-local chronicle entries. */
  journal?: NoteEntry[];
  /** Class-local behavior status history. */
  statusLog?: StatusHistory[];
  stundenZeiten?: Record<number, string>;
  mittagspauseNachStunde?: number;
  sue_kontrolle: Record<string, Record<string, string>>;
  lastGroups?: string[][];
  sitzplan_schueler: Record<string, { x: number; y: number }>;
  sitzplan_objekte: any[];
  sitzplanRegeln?: SitzplanRegel[];
  tageplan?: Record<string, any>;
  faecher?: string[];
  fachConfig?: Record<string, { color: string; scaleColor?: 'blue' | 'red' | 'emerald'; unterrichtet?: boolean }>;
  theme?: 'classic_light' | 'deep_dark' | 'soft_sage' | 'ocean_breeze' | 'warm_sand' | 'lavender_field' | 'peach_blossom' | 'cozy_mint' | 'sakura_dream' | 'custom_theme';
  customBgColor?: string;
  customAccentColor?: string;
  customTextColor?: string;
  customText2Color?: string;
  settings?: {
    uiScale?: number;
    fontFamily?: 'inter' | 'outfit' | 'space_grotesk';
    sidebarCollapsed?: boolean;
    useAmPm?: boolean;
    showSeconds?: boolean;
    yearlyColorPalette?: string;
    yearlyDensityMode?: 'kompakt' | 'normal' | 'detail';
  };
  schuelerWochenplaene?: Record<string, SchuelerWochenplan>;
}

export type SchuelerWochenplanDarstellung = 'fach' | 'tag' | 'liste' | 'gitter';
export type SchuelerAufgabeTyp = 'pflicht' | 'zusatz' | 'freiwillig';
export type SchuelerDifferenzierung = 'alle' | 'basis' | 'standard' | 'plus' | 'gruppeA' | 'gruppeB' | 'gruppeC';

export interface SchuelerWochenplanAufgabe {
  id: string;
  fach: string;
  tag: string;
  stunde?: number;
  titel: string;
  detail?: string;
  typ: SchuelerAufgabeTyp;
  originalThema?: string;
  originalMaterial?: string;
  originalHousework?: string;
  kategorie?: 'buch' | 'arbeitsblatt' | 'heft' | 'lernziel' | 'projekt' | 'stationen' | 'wochenplan' | 'freiarbeit' | 'sonstiges';
  differenzierung?: SchuelerDifferenzierung;
  zeitAufwandMin?: number;
  icon?: string;
  selected: boolean;
  order: number;
}

export interface SchuelerWochenplan {
  id: string;
  kw: number;
  schuljahr: string;
  datumVon: string;
  datumBis: string;
  titel: string;
  untertitel?: string;
  motto?: string;
  showNameField: boolean;
  showKw: boolean;
  showDatum: boolean;
  showReflexion: boolean;
  showUnterschrift: boolean;
  darstellung: SchuelerWochenplanDarstellung;
  fontSize: 'kompakt' | 'normal' | 'gross';
  orientierung: 'portrait' | 'landscape';
  differenzierungFilter?: SchuelerDifferenzierung;
  aufgaben: SchuelerWochenplanAufgabe[];
  erstelltAm: string;
  aktualisiertAm: string;
  originalPlanHash?: string;
}

export type MorningWidgetType = 'deutsch' | 'mathe' | 'logik' | 'spass' | 'spiel' | 'diskussion' | 'achtsamkeit';

export interface MorningWidget {
  id: string;
  type: MorningWidgetType;
  stufe: number | 'all'; // z.B. 1, 2, 3, 4 oder 'all'
  frage: string;
  loesung: string;
}

export interface DifferenzierungsGruppe {
  id: string;
  name: string;
  farbe: string;
  emoji: string;
  schuelerIds: string[];
  beschreibung?: string;
  erstellt: string;
  zuletzt: string;
}

export interface StimmNotiz {
  id: string;
  datum: string;
  dauer: number;
  transkription: string;
  rohText?: string;
  kategorie?: string;
  schuelerId?: string;
  gespeichertAls?: string;
}

export interface SitzplanRegel {
  id: string;
  typ: 'nicht_nebeneinander' | 'nebeneinander' | 'feste_zone' | 'fester_platz';
  schuelerIds: string[]; // 1 oder 2 IDs
  zone?: 'vorne' | 'mitte' | 'hinten'; // nur bei feste_zone
  platzId?: string; // Legacy-Feld für ältere Sitzplatzreferenzen
  position?: { x: number; y: number }; // exakte Position für einen festen Platz
  notiz?: string; // optionaler Grund
}

export type Bundesland = 'W' | 'NOE' | 'BGL' | 'KTN' | 'OOE' | 'SBG' | 'STMK' | 'T' | 'VBG';

export interface InteraktionsEintrag {
  id: string;
  schuelerId: string;
  datum: string;
  typ: 'gespraech' | 'feedback' | 'beobachtung' | 'konflikt' | 'lob' | 'foerderung';
  kontext: string;
  dauer?: number;
  notiz?: string;
  war1zu1: boolean;
}

export type LernStrategie =
  | 'active_recall' // Sich selbst abfragen ohne Unterlagen
  | 'spaced_repetition' // Über mehrere Tage verteilt lernen
  | 'chunking' // Stoff in kleine Blöcke aufteilen
  | 'elaboration' // Eigene Erklärungen formulieren
  | 'lernkarten' // Karteikarten
  | 'vorlesen' // Laut vorlesen/erklären
  | 'abschreiben' // Passives Abschreiben/Unterstreichen
  | 'ueben' // Aufgaben üben/Beispiele rechnen
  | 'nichts' // Nicht gelernt
  | 'sonstiges';

export interface MetaKognitionsProtokoll {
  id: string;
  schuelerId: string;
  pruefungsName: string; // z.B. "Mathe-Schularbeit 3"
  fach: string;
  pruefungsDatum: string; // ISO-Datum
  
  // VOR der Prüfung (Phase 1):
  vorPhase: {
    erfasstAm: string;
    lernStrategien: LernStrategie[]; // mehrere wählbar
    lernDauer: number; // Minuten geschätzt
    selbstEinschaetzung: number; // 1-5: wie gut fühlt sich das Kind vorbereitet?
    lernOrt: string; // Zuhause/Schule/Nachhilfe/andere
    notiz?: string;
  } | null;
  
  // NACH der Korrektur (Phase 2):
  nachPhase: {
    erfasstAm: string;
    note: number; // 1-5
    punkteProzent?: number; // optional falls Punkte bekannt
    kindReaktion: 'zufrieden' | 'ok' | 'enttaeuscht' | 'ueberrascht_positiv' | 'ueberrascht_negativ';
    strategieWirksam: boolean | null; // Einschätzung der Lehrerin
    feedbackText?: string; // KI-generiert oder manuell
    notiz?: string;
  } | null;
}

export interface Station {
  id: string;
  name: string;
  typ: 'pflicht' | 'kuer';
  material?: string;
  notiz?: string;
}

export interface Stationenbetrieb {
  id: string;
  titel: string;
  datum: string;
  fach: string;
  stationen: Station[];
  erledigt: Record<string, Record<string, boolean>>; // schuelerId -> stationId -> true/false
}

export interface AppState {
  savedWeekTemplates?: Record<string, any>;
  selectedStunde?: { tag: string; idx: number; kw: number };
  autoSuggestSchwerpunkte?: boolean;
  verpassteInhalte?: {
    id: string;
    schuelerId: string;
    kw: number;
    tag: string;
    date: string;
    fach: string;
    thema: string;
    stunde: number;
    status: 'offen' | 'nachgeholt';
    timestamp: number;
  }[];
  dossierFocusMode?: boolean;
  stationenbetriebe?: Stationenbetrieb[];
  metaKognitionsProtokolle?: MetaKognitionsProtokoll[];
  ipsativeGewichtung?: number;
  bundesland?: Bundesland;
  sitzplanRegeln?: SitzplanRegel[];
  lernwoerter?: {
    aktuelleListe: string[];
    kw: number;
    archiv: { kw: number; jahr: number; woerter: string[] }[];
  };
  pseudonymisierungAktiv?: boolean;
  classContracts?: any[];
  councilNotes?: any[];
  backupEinstellungen?: {
    letztesBackup: string | null;
    erinnerungAktiv: boolean;
  };
  dismissedActionItems?: string[];
  stimmNotizen?: StimmNotiz[];
  stimmNotizModal?: string | boolean;
  showDenkzettel?: boolean;
  jahresberichte?: {
    [schuelerId: string]: {
      inhalt: string;
      generiert: string;
      schuljahr: string;
    }
  };
  wochenrueckblick?: {
    datum: string;
    inhalt: string;
    kw: number;
  } | null;
  lernzielTracker?: {
    [fach: string]: {
      [lernzielId: string]: {
        text: string;
        abgehakt: boolean;
        abgehaktAm: string | null;
        kw: number;
      }
    }
  };
  /** Individuelle Lehrplan-Zielbewertungen je Kind; wird mit den übrigen App-Daten gesichert. */
  studentLernzielBewertungen?: {
    [schuelerId: string]: {
      [lernzielId: string]: number | null;
    }
  };
  /** Lehrplan-Zielbewertungen getrennt nach Semester; Altbestand bleibt oben lesbar. */
  studentLernzielSemesterBewertungen?: {
    [schuelerId: string]: Partial<Record<'1' | '2', {
      [lernzielId: string]: number | null;
    }>>;
  };
  differenzierungsGruppen?: DifferenzierungsGruppe[];
  schuljahr: string;
  klasse?: string;
  termine?: any[];
  activeClassId?: string;
  archivedClasses?: ClassRoom[];
  activePrintTemplate?: string;
  activePrintStudentId?: string;
  openPrintModalOnLoad?: boolean;
  selectedRoom?: string;
  demoModusAktiv?: boolean;
  classes?: ClassRoom[];
  morningWidgets?: MorningWidget[];
  customRiddles?: any[];
  // Global / User settings
  stufe: number;
  lehrplanText: string;
  tageplan: Record<string, any> | null;
  letzteKW: number | null;
  vorname: string;
  nachname: string;
  anrede: string;
  klassenbezeichnung: string;
  klassenvorstand: boolean;
  faecher: string[] | null;
  stammplan: Record<string, Record<number, string>>;
  sitzplan_schueler: Record<string, { x: number; y: number }>;
  sitzplan_objekte: any[];
  orga_listen: any[];
  sue_kontrolle: Record<string, Record<string, string>>;
  gruppen: string[];
  schueler: Student[];
  noten: Record<string, Record<string, Record<string, GradeData>>>;
  mitarbeit: Record<string, Record<string, Record<string, number>>>;
  verhalten: Record<string, number>;
  karten: Record<string, { gelb: number; rot: number; archiv: any[] }>;
  jahresplanung: Record<number, any>;
  jahresplan_faecher?: { id: string; label: string; color: string }[];
  wochenplanung: Record<number, any>;
  wochenplanSyncSet?: string[];
  scheduleAnalysis?: Record<number, any>;
  whiteboardText?: string;
  whiteboardSnapshot?: any;
  motto?: string;
  theme?: 'classic_light' | 'deep_dark' | 'soft_sage' | 'ocean_breeze' | 'warm_sand' | 'lavender_field' | 'peach_blossom' | 'cozy_mint' | 'sakura_dream' | 'custom_theme';
  customBgColor?: string;
  customAccentColor?: string;
  customTextColor?: string;
  customText2Color?: string;
  firstLogin?: boolean;
  currentPage?: string;
  previousPage?: string;
  currentKW?: number;
  parkgarage?: any[];
  wochenend_checkins?: any[];
  notenMeta: Record<string, any>;
  notenGewichtung: Record<string, any>;
  stundenentwuerfe: any[];
  interaktionsLog?: {
    eintraege: InteraktionsEintrag[];
    wochenEmpfehlung: {
      kw: number;
      jahr: number;
      schuelerIds: string[];
      generiert: string;
    } | null;
  };
  elterngespraeche: ParentMeeting[];
  kelGespraeche?: KELGespraech[];
  diagnostikTests?: DiagnostikTest[];
  /** Legacy diagnostic result collection retained for migration/compatibility. */
  diagnostikErgebnisse?: any[];
  diagnostikErhebungen?: DiagnostikErhebung[];
  /** Neues strukturiertes, kompetenzorientiertes Diagnostik-Ergebnis-Modell (Schritt 1) */
  diagnosticResults?: DiagnosticResult[];
  /** Neue Diagnostik UI-State Steuerung (Schritte 8-10) */
  activeDiagnosticView?: 'home' | 'results' | 'individual' | 'class' | 'screening' | 'legacy';
  selectedDiagnosticStudentId?: string;
  selectedDiagnosticCompetencyId?: string;
  selectedDiagnosticGradeLevel?: number;
  ikmRecords?: IkmRecord[];
  antolinRecords?: AntolinRecord[];
  schuelerGoals?: SchuelerGoal[];
  observations?: Observation[];
  notizen: Note[];
  mitarbeitLogs?: {id: string; sid: string; points: number; timestamp: string}[];
  journal: NoteEntry[];
  notes?: AppNote[];
  dashboardTodos?: {id: string, text: string, done: boolean}[];
  denkzettelNotes?: {id: string, text: string, color: 'blue' | 'coral' | 'yellow' | 'mint', completed?: boolean, category?: 'allgemein' | 'wichtig' | 'eltern' | 'idee' | 'unterricht' | 'termin', createdAt?: number}[];
  luuise_active?: boolean;
  anwesenheit: Record<string, Record<string, Record<string, string>>>;
  anwesenheitDetail?: Record<string, Record<string, { verspaetung?: number; notiz?: string; dismissedAlerts?: string[]; fehlstunden?: number }>>;
  schuelerStimmung?: Record<string, Record<string, number>>;
  hueBuch: Record<string, Record<string, any>>;
  awGruende: Record<string, string>;
  verbal: Record<string, any>;
  notenmappe?: any;
  saAssessments?: Record<string, Record<number, any>>;
  klassenglas_count: number;
  klassenglas_ziel: number;
  klassenglas_belohnung?: string;
  klassenglas_missions?: any[];
  klassenglas_completed_missions?: any[];
  ampel_status: string;
  lottoWinner?: string;
  stundenbilderMigriert?: boolean;
  vertretungsStundenbilder?: VertretungsStundenbild[];
  materialien?: MaterialItem[];
  vertretungsZeitraum?: string;
  vertretungsHinweise?: string;
  zugangsdaten?: Zugangsdaten[];
  historicalStudents?: any[];
  dienste?: KlassenDienst[];
  checklisten?: OrgCheckliste[];
  customLists?: CustomList[];
  lernpfade?: Record<string, any>;
  errorDetectiveRecords?: any[];
  lehrerName?: string;
  tourAbgeschlossen?: boolean;
  setupInitialStepMode?: string;
  
  klassenkasse?: {
    kontostand: number;
    sammlungen: Geldsammlung[];
    transaktionen: KassenTransaktion[];
  };
  behavior_stages?: { id: string; label: string; color: string; icon: string }[];
  behavior_default_stage_id?: string;
  behavior_status?: Record<string, string>;
  behavior_notes?: Record<string, string>;
  behavior_class_note?: string;
  behavior_rules?: string;
  custom_badges?: { icon: string; name: string }[];

  savedBoardTemplates?: any[];
  settings: { 
    theme: string;
    fontFamily?: string;
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
    fontSize?: 'compact' | 'standard' | 'large';
    verhaltenSymbol: 'diamond' | 'smiley' | 'trophy' | 'plus' | 'star' | 'apple' | 'clover';
    showVerhaltenOnBoard: boolean;
    zoomLevel?: 'compact' | 'standard' | 'large';
    uiScale?: number;
    sidebarCollapsed?: boolean;
    dashboard_widgets?: { id: string; label: string; visible: boolean; width: 'normal' | 'full' | 'half' | 'third'; size?: 'small' | 'medium' | 'large' }[];
    noiseLevel?: 'silence' | 'whisper' | 'group' | 'presentation';
    disableBackupReminders?: boolean;
    hueGewichten?: boolean;
    hueWeight?: number;
    huePercentDeduction?: number;
    hueMode?: 'document' | 'grade';
    disabledModules?: string[];
    klassenglasIcon?: string;
    behaviorStartDate?: string;
    enableKlimaBehaviorIntegration?: boolean;
    behaviorKlimaWeights?: { [stageId: string]: number };
    planTab?: 'jahresplan' | 'lernziele';
    isFocusMode?: boolean;
    enableWhiteboardLaser?: boolean;
    whiteboardBackground?: string;
    showMascotOnDashboard?: boolean;
    privacyPin?: string;
    vaultAutoLockMinutes?: number; // 15, 30, 60 (Standard), 120, oder 0 (nur beim Schließen)
    yearlyColorPalette?: string;
  };
  mitarbeit_settings?: {
    mode?: 'absolute' | 'relative' | 'manual';
    symbol?: string;
    custom_icon?: string;
    thresholds?: Record<number, number>;
    relative_thresholds?: Record<number, number>;
    relative_confirmed?: boolean;
  };
  vertretungHinweise?: string;
  stimmungsArchiv?: any[];
  stundenZeiten?: Record<number, string>;
  mittagspauseNachStunde?: number;
  lastGroups?: string[][];
  dashboardEditMode?: boolean;
  selectedStudentForPortfolio?: string;
  customWebLinks?: { url: string; title: string; desc?: string }[];
  quickLinks?: { id: string; label: string; url: string; icon: string; color?: string }[];
  wochenNotizen?: string;
  wochenZiele?: { id: string; text: string; done: boolean }[];
  schuelerNotizen?: Record<string, string>;
  morgenAufgaben?: MorgenAufgabe[];
  tempQrValue?: string;
  rewardSound?: boolean;
  cockpitTheme?: 'dark' | 'lavender' | 'earth' | 'nordic';
  sidebarState?: 'full' | 'mini' | 'closed';
  unterrichtsmodus_sidebar_open?: boolean;
  classPet?: ClassPetState;
  classPetShowBeamer?: boolean;
  ampelLabels?: { red: string; yellow: string; green: string };
  notenLabels?: Record<string, string>;
  lessonFocus?: string;
  lessonMaterials?: string[];
  boardWidgets?: { id: string; type: string; x: number; y: number; h?: number; w?: number; scale?: number; meta?: any }[];
  workspaceProfiles?: { id: string; name: string; layout: CockpitWidgetConfig[]; icon?: string; category?: string; description?: string; createdAt?: string }[];
  cockpitLayout?: CockpitWidgetConfig[];
  cockpitLayoutA?: CockpitWidgetConfig[];
  cockpitLayoutB?: CockpitWidgetConfig[];
  cockpitLayoutC?: CockpitWidgetConfig[];
  boardSettings: {
    paperType?: 'blank' | 'lined' | 'squared' | 'writing-lines' | 'millimeter';
    paperSize?: number;
    boardMode?: 'text' | 'whiteboard' | 'smartboard';
    notepadBackground?: 'empty' | 'lines' | 'grid' | 'squares' | 'checklist';
    studentNameStyle?: 'vorname_nachname' | 'nachname_vorname' | 'nur_initialen' | 'nur_emoji' | 'nur_vorname' | 'nur_nachname' | 'vorname_initiale' | 'emoji_vorname';
    showStudentEmojiInList?: boolean;
    splitSmartboardMode?: boolean;
    whiteboardSnapshot?: any;
    showAmpel: boolean;
    showKlassenglas: boolean;
    showTimer: boolean;
    showLottowinner: boolean;
    showArbeitsauftrag: boolean;
    timerEnd?: number;
    timerRunning?: boolean;
    timerTotal?: number;
    currentAlert?: { type: 'warning' | 'success' | 'info'; text: string; id: string };
    lastWinner?: string;
    groupMode?: 'count' | 'size';
    groupStrategy?: string;
    boardFontFamily?: 'sans' | 'display' | 'serif' | 'mono' | 'handwritten';
    boardFontSize?: number;
    boardTextAlign?: 'left' | 'center';
    boardTextColor?: string;
    boardFontWeight?: 'normal' | 'bold' | 'black';
    timerType?: 'digital' | 'hourglass' | 'circle' | 'stoppuhr';
    activeSyncCode?: string;
    wifiSettings?: {
      ssid: string;
      password?: string;
      security?: 'WPA' | 'WEP' | 'nopass';
      temporaryPin?: string;
    };
    isRemoteController?: boolean;
    remoteLastActiveTs?: number;
    remoteTextEntries?: Array<{
      text: string;
      color?: string;
      fontSize?: number;
      fontFamily?: string;
      textAlign?: 'left' | 'center' | 'right';
      timestamp: number;
      x?: number;
      y?: number;
    }>;
    remoteDrawingImage?: { dataUrl: string; timestamp: number };
    clearTafelTrigger?: number;
    isTafelOpen?: boolean;
    tafelCommand?: import('./lib/tafelCommands').TafelCommand;
    cockpitInkByClass?: Record<string, import('./components/cockpit/BoardInk').InkItem[]>;
    sidebarMode?: 'expanded' | 'mini' | 'hidden';
    activeFont?: string;
    toolbarWidgets?: string[]; // IDs of visible widgets in order
    hiddenToolbarWidgets?: string[]; // IDs of hidden widgets
    remoteSoundToPlay?: { type: 'beep' | 'tada' | 'fanfare' | 'applause' | 'error' | 'bell' | 'laser' | 'timer' | 'nature' | 'bowl'; timestamp: number };
    activeAIPrompt?: { text: string; timestamp: number };
    tickerText?: string;
    tickerTimestamp?: number;
    activeFach?: string;
    gabicRole?: 'child' | 'teacher';
    hideStudentStars?: boolean;
  };
  gabicState?: {
    currentQuestStep: number;
    selectedStudentId: string;
    childDraftAnswer: string | null;
    companionChoice: 'treah' | 'camil' | null;
    questObservations: Record<number, any>;
    selectedGrade: '1' | '2' | '3' | '4';
  };
  aiChats?: Record<string, ChatEntry[]>;
  wochenplan_lehrplan?: Record<string, LehrplanZuordnung[]>;
  schulName?: string;
  schulkennzahl?: string;
  schulOrt?: string;
  schulPlz?: string;
  activityLog?: ActivityLogEntry[];
  statusLog?: StatusHistory[];
  calendarOverrides?: Record<string, 'school' | 'free'>;
  calendarSettings?: {
    disabledHolidays?: string[]; // IDs of VOBS holidays that are toggled OFF
  };
  fachConfig?: Record<string, { color: string; scaleColor?: 'blue' | 'red' | 'emerald'; unterrichtet?: boolean }>;
  unterrichtsmodus_aktuellerModus?: UnterrichtsmodusModus;
  unterrichtsmodus_themeProModus?: Record<UnterrichtsmodusModus, UnterrichtsmodusThemeId>;
  unterrichtsmodus_hintergrundProModus?: Record<UnterrichtsmodusModus, UnterrichtsmodusHintergrundId>;
  unterrichtsmodus_eigenesBildProModus?: Record<UnterrichtsmodusModus, string>;
  unterrichtsmodus_theme?: UnterrichtsmodusThemeId;
  unterrichtsmodus_hintergrund?: UnterrichtsmodusHintergrundId;
  unterrichtsmodus_eigenesBild?: string;
  unterrichtsmodus_geburtstagskinder?: string[];
  spacedPractices?: {
    id: string;
    thema: string;
    fach: string;
    ursprungsDatum: string;
    naechsteWiederholung: string;
    intervallStufe: number;
  }[];
  luuiseTracker?: {
    aktiv: boolean;
    thema: string;
    startDatum: string;
    eintraege: Record<string, 'gruen' | 'gelb' | 'rot'>;
  };
  lehrerProfil?: LehrerProfil;
  
  dailyReflections?: Record<string, string>;
  activeKW?: number;
  students?: any;
  tafelVorlagen?: TafelVorlage[];
  lehrplanChecksHistory?: any[];
  yearlyDensityMode?: 'kompakt' | 'normal' | 'detail';
  weeklyDensityMode?: 'kompakt' | 'normal' | 'detail';
  schuelerWochenplaene?: Record<string, SchuelerWochenplan>;
}

export interface Anekdote {
  id: string;
  datum: string;
  text: string;
  schuelerId?: string;
  tags?: string[];
}

export interface LehrerProfil {
  schulstundenJaehrlich?: number;
  schularbeitenManuell?: number;
  testsManuell?: number;
  ausfluegeManuell?: number;
  name?: string;
  schule?: string;
  motto?: string;
  gegruendetYear?: string;
  anekdoten?: Anekdote[];
  selfCareChecks?: string[];
  timelineHighlights?: Record<string, string>;
  reflections?: any[];
}

export interface TafelVorlage {
  id: string;
  titel: string;
  erstellt: string; // ISO-Datum
  hintergrund: string;
  muster: string;
  bildDaten: string; // Canvas als DataURL (PNG, komprimiert)
  geteilt?: boolean;
}

export type UnterrichtsmodusModus = "lehrperson" | "kinder";
export type UnterrichtsmodusThemeId = "classic_light" | "deep_dark" | "soft_sage" | "ocean_breeze" | "warm_sand" | "lavender_field" | "cozy_mint" | "sakura_dream" | "candy" | "custom_theme";
export type UnterrichtsmodusHintergrundId = "kein" | "sterne" | "tafel" | "wolken" | "wald" | "papier" | "candy" | "eigenes";

export interface LehrplanZuordnung {
  fach: string;
  kompetenzbereichId: string;
  anwendungsbereichIds: string[];
}

export interface ClassPetHistory {
  id: string;
  action: string;
  datum: string;
  energyDelta: number;
  text: string;
}

export interface ClassPetState {
  enabled?: boolean;
  animalType: string;
  name: string;
  energy: number; // 0 - 100 (overall health based on needs)
  knowledge?: number; // 0 - 100 (Wissen)
  hunger?: number; // 0 - 100 (lower means more hungry - wait, maybe 'satiation' so 100 is full)
  fun?: number; // 0 - 100 (Spaß)
  accessories: string[]; // e.g. ['wizard_hat', 'glasses', 'tie']
  behaviorMode?: 'wander' | 'sleep' | 'learn' | 'idle' | 'auto';
  history: ClassPetHistory[];
  showMascotOnDashboard?: boolean;
  memories?: string[]; // things the pet has learned/remembered
  homeStyle?: 'basket' | 'nest' | 'tent' | 'capsule' | 'branch' | 'cloud';
  xp?: number;
  level?: number;
  discoveries?: string[];
  activeMission?: string;
  scale?: number;
  dailyReset?: boolean;
  lastResetDate?: string;
  mood?: number;
  lastInteraction?: string;
  isLocked?: boolean;
}

export interface CockpitWidgetConfig {
  id: string;
  type: 'clock' | 'timer' | 'trafficlight' | 'randomname' | 'instruction' | 'noisemeter' | 'vocabulary' | 'studentlist' | 'groups' | 'qrcode' | 'image' | 'phases' | 'sounds' | 'todo' | 'dienste' | 'klassenglas' | 'links' | 'pet' | 'drawing' | 'stopwatch' | 'calculator' | 'dice' | 'weather' | 'aiquiz' | 'riddle' | 'scoreboard' | 'wheel' | 'breathing' | 'kidweather' | 'mathcards' | 'wortsatzwerkstatt' | 'scrambler' | 'watertracker' | 'wordchain' | 'moodmeter' | 'colormixer' | 'wordgrid' | 'rhythm' | 'geometry' | 'fractions' | 'wordclock' | 'sorting' | 'dailyquotes' | 'dictionary' | 'piano' | 'bodyparts' | 'toothbrush' | 'challenge' | 'compass' | 'weekdays' | 'piggybank' | 'noisescales' | 'wordscramble' | 'shadowshapes' | 'emotions' | 'clocksync' | 'soundmemory' | 'spellingdetective' | 'numberline' | 'mathchain' | 'thermometer' | 'compoundsplit' | 'soundquiz' | 'mathduel' | 'shapepuzzle' | 'guitartuner' | 'secretagent' | 'fractioncake' | 'sentencebuilding' | 'patternmaker' | 'wordexplorer' | 'weightscale' | 'geographyquiz' | 'calmrain' | 'estimationjar' | 'reflexgame' | 'mathpyramid' | 'wastebin' | 'tonetrainer' | 'angledetective' | 'rhymemachine' | 'alphabetsoup' | 'divrobot' | 'classtarget' | 'morsecode' | 'punctuationzoo' | 'secretcode' | 'clockpuzzle' | 'fractiongrid' | 'trafficquiz' | 'wordbuilder' | 'watercycle' | 'soundmachine' | 'mathbalancer' | 'animalvoice' | 'constellation' | 'multitrainer' | 'moneycalc' | 'storyemojis' | 'abcorder' | 'planetarium' | 'tischcheck' | 'faircall' | 'hangman' | 'timeline' | 'anschauung' | 'kidattendance' | 'zahlenraum' | 'kopfrechnen' | 'fractionvisualizer';
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
  settings?: any;
  hasBeenOpened?: boolean;
}

export const UNIFIED_DEFAULT_BADGES = [
  { id: 'cleanup', name: 'Super aufgeräumt', icon: '🧹' },
  { id: 'helper', name: 'Toll geholfen', icon: '🤝' },
  { id: 'creative', name: 'Kreative Idee', icon: '💡' },
  { id: 'focus', name: 'Super Fokus', icon: '🎯' },
  { id: 'courage', name: 'Großer Mut', icon: '🦁' },
  { id: 'ant', name: 'Fleißige Ameise', icon: '🐜' },
  { id: 'artist', name: 'Künstler/in', icon: '🎨' },
  { id: 'genie', name: 'Mathe-Genie', icon: '🧠' },
  { id: 'book', name: 'Leseratte', icon: '📚' },
  { id: 'clown', name: 'Klassenclown', icon: '🤡' },
  { id: 'sport', name: 'Sport-Champ', icon: '🏆' },
  { id: 'music', name: 'Musik-Genie', icon: '🎵' },
  { id: 'trash', name: 'Müllmeister', icon: '🧼' },
  { id: 'presentation', name: 'Super-Referat', icon: '🎤' },
  { id: 'silent', name: 'Leisetreter', icon: '🤫' }
];

