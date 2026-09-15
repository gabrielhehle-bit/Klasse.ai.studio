export type KlassioModuleCatalogEntry = {
  id: string;
  label: string;
  desc: string;
  category: string;
  condition?: (app: any) => boolean;
};

export const AVAILABLE_MODULES: KlassioModuleCatalogEntry[] = [
  { id: 'dashboard', label: 'Heute', desc: 'Tagesübersicht mit Unterricht, Aufgaben und Terminen', category: 'Hauptbereiche' },
  { id: 'klasse', label: 'Klasse', desc: 'Zentrale Übersicht für Kinder, Anwesenheit und Organisation', category: 'Hauptbereiche' },
  { id: 'planung', label: 'Planung', desc: 'Zentrale Übersicht für Jahres-, Wochen- und Stundenplanung', category: 'Hauptbereiche' },
  { id: 'leistungen', label: 'Leistungen', desc: 'Zentrale Übersicht für Noten, Diagnostik und Lernentwicklung', category: 'Hauptbereiche' },
  { id: 'unterricht', label: 'Unterricht', desc: 'Schneller Einstieg in Cockpit und Unterrichtswerkzeuge', category: 'Hauptbereiche' },
  { id: 'lehrerzimmer', label: 'Lehrerzimmer', desc: 'Schulweiter Austausch mit Beiträgen, Fragen, @Erwähnungen und Antworten', category: 'Hauptbereiche' },

  { id: 'cockpit', label: 'Lehrercockpit', desc: 'Weiße Arbeitsfläche, Schreiben, Zeichnen und Widgets', category: 'Unterricht & Helfer' },
  { id: 'ki-helfer', label: 'KI-Helfer', desc: 'KI-Werkzeuge für Planung, Differenzierung und Texte', category: 'Unterricht & Helfer' },
  { id: 'arbeitsblatt', label: 'Arbeitsblatt-Generator', desc: 'Arbeitsblätter und Aufgabenmaterial erstellen', category: 'Unterricht & Helfer' },
  { id: 'stationenbetrieb', label: 'Stationenbetrieb', desc: 'Stationen für offenen Unterricht organisieren', category: 'Unterricht & Helfer' },
  { id: 'stimmnotizen', label: 'Stimm-Notizen', desc: 'Beobachtungen und Gedanken schnell erfassen', category: 'Unterricht & Helfer' },
  { id: 'differenzierung', label: 'Differenzierung', desc: 'Gruppen und differenzierte Lernangebote verwalten', category: 'Unterricht & Helfer' },
  { id: 'elternbrief', label: 'Elternbrief', desc: 'Elterninformationen und Schreiben vorbereiten', category: 'Unterricht & Helfer' },

  { id: 'schueler', label: 'Kinder & Dossiers', desc: 'Schülerliste, Dossiers, Stammdaten und Lernentwicklung', category: 'Klasse & Kinder' },
  { id: 'sitzplan', label: 'Sitzplan & Gruppen', desc: 'Sitzordnung und Gruppen organisieren', category: 'Klasse & Kinder' },
  { id: 'anwesenheit', label: 'Anwesenheit & Befinden', desc: 'Präsenz, Befinden und Tagesstatus erfassen', category: 'Klasse & Kinder' },
  { id: 'verhalten', label: 'Notizen & Beobachtungen', desc: 'Beobachtungen und Verhaltensnotizen dokumentieren', category: 'Klasse & Kinder' },
  { id: 'orga', label: 'Organisation', desc: 'Klassenkasse, Geldsammlungen und Organisation', category: 'Klasse & Kinder', condition: (app: any) => app.klassenvorstand },

  { id: 'noten', label: 'Notenmappe', desc: 'Noten, Prozent, Punkte, Gewichtungen und Leistungen', category: 'Leistungen' },
  { id: 'statistik', label: 'Statistik & Profile', desc: 'Leistungsprofile und Klassenanalysen', category: 'Leistungen' },
  { id: 'diagnostik', label: 'Diagnostik', desc: 'Lese-, Rechen- und Beobachtungschecks', category: 'Leistungen', condition: (app: any) => app.klassenvorstand },
  { id: 'portfolio', label: 'Lernziele & Portfolio', desc: 'Lernziele und Portfolioentwicklung begleiten', category: 'Leistungen' },
  { id: 'notenTabelle', label: 'Notenübersicht', desc: 'Klassenweite Leistungsübersicht', category: 'Leistungen' },
  { id: 'verbal', label: 'Verbale Beurteilung', desc: 'Verbale Rückmeldungen und Beurteilungen vorbereiten', category: 'Leistungen' },
  { id: 'kel', label: 'KEL-Gespräche', desc: 'Kinder-Eltern-Lehrpersonen-Gespräche vorbereiten', category: 'Leistungen' },

  { id: 'planungszentrale', label: 'Planungsübersicht', desc: 'Planungsbereiche zentral überblicken', category: 'Planung' },
  { id: 'jahresplanung', label: 'Jahresplanung', desc: 'Langfristige Stoff- und Jahresplanung', category: 'Planung' },
  { id: 'wochenplanung', label: 'Wochenplan', desc: 'Wochenplanung, Aufgaben und Hausübungen', category: 'Planung' },
  { id: 'materialien', label: 'Materialbibliothek', desc: 'Unterrichtsmaterialien verwalten', category: 'Planung' },
  { id: 'stunden', label: 'Stundenentwürfe', desc: 'Unterrichtsstunden planen und dokumentieren', category: 'Planung' },
  { id: 'canva', label: 'Canva', desc: 'Canva-Integration für Unterrichtsmaterialien', category: 'Planung' },
  { id: 'vertretung', label: 'Vertretung', desc: 'Vertretungsunterlagen vorbereiten', category: 'Planung' },
  { id: 'uebergabemappe', label: 'Übergabemappe', desc: 'Klassenübergabe und Schülerbeurteilungen', category: 'Planung', condition: (app: any) => app.klassenvorstand },

  { id: 'klassengemeinschaft', label: 'Wir-Gefühl', desc: 'Klassengemeinschaft und soziales Lernen begleiten', category: 'Entwicklung & Berichte', condition: (app: any) => app.klassenvorstand },
  { id: 'jahresbericht', label: 'Jahresbericht', desc: 'Jahresrückblick und Berichte erstellen', category: 'Entwicklung & Berichte', condition: (app: any) => app.klassenvorstand },
  { id: 'archiv', label: 'Archiv', desc: 'Abgeschlossene Schuljahre und Verläufe', category: 'Entwicklung & Berichte' },
  { id: 'drucken', label: 'Druckzentrum', desc: 'Druckvorlagen und Übersichten ausgeben', category: 'Ausgabe & Daten' },
];
