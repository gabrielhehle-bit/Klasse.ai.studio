export type KlassioModuleCatalogEntry = {
  id: string;
  label: string;
  desc: string;
  category: string;
  condition?: (app: any) => boolean;
};

// Alle echten Klassio-Bereiche, die in der persönlichen Sidebar ein-/ausblendbar sind.
// Detailfunktionen bleiben damit vollständig erreichbar; die Reihenfolge wird separat
// über die Sidebar-Anpassung gesteuert.
export const AVAILABLE_MODULES: KlassioModuleCatalogEntry[] = [
  { id: 'dashboard', label: 'Heute', desc: 'Tagesübersicht mit Unterricht, Aufgaben und Terminen', category: 'Start' },
  { id: 'klasse', label: 'Klasse', desc: 'Zentrale Übersicht für Kinder, Anwesenheit und Klassenalltag', category: 'Start' },
  { id: 'planung', label: 'Planung', desc: 'Zentrale Übersicht für Wochen-, Jahres- und Materialplanung', category: 'Start' },
  { id: 'leistungen', label: 'Leistungen', desc: 'Zentrale Übersicht für Noten, Diagnostik und Lernentwicklung', category: 'Start' },
  { id: 'unterricht', label: 'Unterricht', desc: 'Zentrale Übersicht für Cockpit und Unterrichtswerkzeuge', category: 'Start' },
  { id: 'tools', label: 'Tools', desc: 'Zentrale Sammlung kleiner Werkzeuge für den Lehreralltag', category: 'Start' },
  { id: 'textanalyse', label: 'Textanalyse', desc: 'Lesbarkeit und formale Textschwierigkeit lokal analysieren', category: 'Tools' },

  { id: 'cockpit', label: 'Lehrercockpit', desc: 'Weiße Smartboard-Fläche mit frei platzierbaren Widgets', category: 'Unterricht' },
  { id: 'ki-helfer', label: 'KI-Helfer', desc: 'KI-Werkzeuge für Planung, Differenzierung und Texte', category: 'Unterricht' },
  { id: 'lehrerzimmer', label: 'Lehrerzimmer', desc: 'Schulweiter Austausch mit Beiträgen, Fragen, @Erwähnungen und Antworten', category: 'Unterricht' },
  { id: 'arbeitsblatt', label: 'Arbeitsblatt-Generator', desc: 'Arbeitsblätter direkt in Klassio erstellen', category: 'Unterricht' },
  { id: 'stationenbetrieb', label: 'Stationenbetrieb', desc: 'Stationen planen und verwalten', category: 'Unterricht' },
  { id: 'differenzierung', label: 'Differenzierung', desc: 'Unterricht differenziert vorbereiten', category: 'Unterricht' },
  { id: 'elternbrief', label: 'Elternbrief', desc: 'Elterninformationen und Briefe erstellen', category: 'Unterricht' },

  { id: 'schueler', label: 'Klassenliste', desc: 'Kinder, Stammdaten und Klassenübersicht', category: 'Klasse & Kinder' },
  { id: 'dossier', label: 'Schülerdossier', desc: 'Individuelle Dossiers, Entwicklung und Stammdaten', category: 'Klasse & Kinder' },
  { id: 'sitzplan', label: 'Sitzplan & Gruppen', desc: 'Sitzordnung und Gruppen organisieren', category: 'Klasse & Kinder' },
  { id: 'anwesenheit', label: 'Anwesenheit & Befinden', desc: 'Präsenz, Befinden und Tagesstatus erfassen', category: 'Klasse & Kinder' },
  { id: 'teamteaching', label: 'Teamteaching', desc: 'Klasse gezielt mit Kolleg:innen derselben Schule teilen', category: 'Klasse & Kinder' },
  { id: 'verhalten', label: 'Notizen', desc: 'Alle Klassen- und Schülernotizen zentral erfassen und durchsuchen', category: 'Start' },
  { id: 'orga', label: 'Kasse & Orga', desc: 'Klassenkasse, Geldsammlungen und Organisation', category: 'Klasse & Kinder', condition: (app: any) => app.klassenvorstand },

  { id: 'noten', label: 'Notenmappe', desc: 'Noten, Prozent, Punkte, Gewichtungen und Leistungen', category: 'Leistungen' },
  { id: 'statistik', label: 'Statistik & Profile', desc: 'Leistungsprofile und Klassenanalysen', category: 'Leistungen' },
  { id: 'diagnostik', label: 'Diagnostik', desc: 'Lese-, Rechen- und Beobachtungschecks', category: 'Leistungen', condition: (app: any) => app.klassenvorstand },
  { id: 'portfolio', label: 'Lernziele & Portfolio', desc: 'Lernziele und Portfolioeinträge begleiten', category: 'Leistungen' },
  { id: 'notenTabelle', label: 'Notenübersicht', desc: 'Leistungen tabellarisch überblicken', category: 'Leistungen' },
  { id: 'verbal', label: 'Verbale Beurteilung', desc: 'Verbale Rückmeldungen vorbereiten', category: 'Leistungen' },
  { id: 'kel', label: 'KEL-Gespräche', desc: 'Kinder-Eltern-Lehrperson-Gespräche vorbereiten', category: 'Leistungen' },

  { id: 'planungszentrale', label: 'Planungs-Zentrale', desc: 'Planungsbereiche zentral überblicken', category: 'Planung' },
  { id: 'jahresplanung', label: 'Jahresplanung', desc: 'Langfristige Stoff- und Jahresplanung', category: 'Planung' },
  { id: 'wochenplanung', label: 'Wochenplan', desc: 'Wochenplanung, Aufgaben und Hausübungen', category: 'Planung' },
  { id: 'materialien', label: 'Materialbibliothek', desc: 'Unterrichtsmaterialien verwalten', category: 'Planung' },
  { id: 'stunden', label: 'Stundenentwürfe', desc: 'Unterrichtsstunden vorbereiten und speichern', category: 'Planung' },
  { id: 'canva', label: 'Canva', desc: 'Canva-bezogene Export- und Gestaltungsfunktionen', category: 'Planung' },
  { id: 'vertretung', label: 'Vertretung', desc: 'Vertretungsunterricht vorbereiten', category: 'Planung' },
  { id: 'uebergabemappe', label: 'Übergabemappe', desc: 'Klassenübergabe und Vertretungsinformationen', category: 'Planung', condition: (app: any) => app.klassenvorstand },

  { id: 'klassengemeinschaft', label: 'Wir-Gefühl', desc: 'Klassengemeinschaft und soziales Lernen begleiten', category: 'Entwicklung & Berichte', condition: (app: any) => app.klassenvorstand },
  { id: 'jahresbericht', label: 'Jahresbericht', desc: 'Jahresrückblick und Berichte erstellen', category: 'Entwicklung & Berichte', condition: (app: any) => app.klassenvorstand },
  { id: 'archiv', label: 'Archiv', desc: 'Abgeschlossene Schuljahre und Verläufe', category: 'Entwicklung & Berichte' },

  { id: 'drucken', label: 'Druckzentrum', desc: 'Druck- und Ausgabeformate zentral aufrufen', category: 'Ausgabe & Daten' },
];
