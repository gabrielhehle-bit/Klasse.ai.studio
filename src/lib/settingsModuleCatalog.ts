export type KlassioModuleCatalogEntry = {
  id: string;
  label: string;
  desc: string;
  category: string;
  condition?: (app: any) => boolean;
};

// Nur Bereiche, die in der kompakten Sidebar tatsächlich ein-/ausblendbar sind.
// Zusätzliche Funktionsseiten bleiben über ihre Fachbereiche erreichbar und blähen
// weder Sidebar noch Modulverwaltung wieder auf.
export const AVAILABLE_MODULES: KlassioModuleCatalogEntry[] = [
  { id: 'dashboard', label: 'Dashboard', desc: 'Tagesübersicht mit Unterricht, Aufgaben und Terminen', category: 'Unterricht' },
  { id: 'cockpit', label: 'Lehrercockpit', desc: 'Weiße Arbeitsfläche, Schreiben, Zeichnen und Widgets', category: 'Unterricht' },
  { id: 'ki-helfer', label: 'KI-Helfer', desc: 'KI-Werkzeuge für Planung, Differenzierung und Texte', category: 'Unterricht' },
  { id: 'lehrerzimmer', label: 'Lehrerzimmer', desc: 'Schulweiter Austausch mit Beiträgen, Fragen, @Erwähnungen und Antworten', category: 'Unterricht' },

  { id: 'schueler', label: 'Schüler:innen', desc: 'Schülerliste, Dossiers, Stammdaten und Lernentwicklung', category: 'Werkzeuge' },
  { id: 'sitzplan', label: 'Sitzplan', desc: 'Sitzordnung und Gruppen organisieren', category: 'Werkzeuge' },
  { id: 'anwesenheit', label: 'Anwesenheit', desc: 'Präsenz, Befinden und Tagesstatus erfassen', category: 'Werkzeuge' },
  { id: 'noten', label: 'Notenmappe', desc: 'Noten, Prozent, Punkte, Gewichtungen und Leistungen', category: 'Werkzeuge' },
  { id: 'orga', label: 'Kasse & Orga', desc: 'Klassenkasse, Geldsammlungen und Organisation', category: 'Werkzeuge', condition: (app: any) => app.klassenvorstand },

  { id: 'planungszentrale', label: 'Planungs-Zentrale', desc: 'Planungsbereiche zentral überblicken', category: 'Planung' },
  { id: 'jahresplanung', label: 'Jahresplanung', desc: 'Langfristige Stoff- und Jahresplanung', category: 'Planung' },
  { id: 'wochenplanung', label: 'Wochenplan', desc: 'Wochenplanung, Aufgaben und Hausübungen', category: 'Planung' },
  { id: 'materialien', label: 'Materialbibliothek', desc: 'Unterrichtsmaterialien verwalten', category: 'Planung' },
  { id: 'uebergabemappe', label: 'Übergabemappe', desc: 'Klassenübergabe und Schülerbeurteilungen', category: 'Planung', condition: (app: any) => app.klassenvorstand },

  { id: 'statistik', label: 'Statistik & Profile', desc: 'Leistungsprofile und Klassenanalysen', category: 'Extras' },
  { id: 'diagnostik', label: 'Diagnostik', desc: 'Lese-, Rechen- und Beobachtungschecks', category: 'Extras', condition: (app: any) => app.klassenvorstand },
  { id: 'klassengemeinschaft', label: 'Wir-Gefühl', desc: 'Klassengemeinschaft und soziales Lernen begleiten', category: 'Extras', condition: (app: any) => app.klassenvorstand },
  { id: 'jahresbericht', label: 'Jahresbericht', desc: 'Jahresrückblick und Berichte erstellen', category: 'Extras', condition: (app: any) => app.klassenvorstand },
  { id: 'archiv', label: 'Archiv', desc: 'Abgeschlossene Schuljahre und Verläufe', category: 'Extras' },
];
