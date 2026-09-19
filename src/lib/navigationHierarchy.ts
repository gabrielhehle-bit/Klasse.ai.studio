export type NavigationParent = {
  id: 'klasse' | 'verhalten' | 'planung' | 'leistungen' | 'tools' | 'ki-helfer';
  label: string;
};

const PAGE_PARENTS: Record<string, NavigationParent> = {
  // Tools
  textanalyse: { id: 'tools', label: 'Tools' },
  stationenbetrieb: { id: 'tools', label: 'Tools' },

  // KI-gestützte Vorbereitung ist kein Unterbereich des Lehrercockpits.
  arbeitsblatt: { id: 'ki-helfer', label: 'KI-Helfer' },
  differenzierung: { id: 'ki-helfer', label: 'KI-Helfer' },
  elternbrief: { id: 'ki-helfer', label: 'KI-Helfer' },
  stimmnotizen: { id: 'verhalten', label: 'Notizen' },

  // Klasse
  schueler: { id: 'klasse', label: 'Klasse' },
  dossier: { id: 'klasse', label: 'Klasse' },
  sitzplan: { id: 'klasse', label: 'Klasse' },
  anwesenheit: { id: 'klasse', label: 'Klasse' },
  teamteaching: { id: 'klasse', label: 'Klasse' },
  orga: { id: 'klasse', label: 'Klasse' },
  klassengemeinschaft: { id: 'klasse', label: 'Klasse' },
  eltern: { id: 'klasse', label: 'Klasse' },

  // Planung
  planungszentrale: { id: 'planung', label: 'Planung' },
  jahresplanung: { id: 'planung', label: 'Planung' },
  wochenplanung: { id: 'planung', label: 'Planung' },
  stunden: { id: 'planung', label: 'Planung' },
  materialien: { id: 'planung', label: 'Planung' },
  canva: { id: 'planung', label: 'Planung' },
  vertretung: { id: 'planung', label: 'Planung' },
  uebergabemappe: { id: 'planung', label: 'Planung' },

  // Leistungen
  noten: { id: 'leistungen', label: 'Leistungen' },
  portfolio: { id: 'leistungen', label: 'Leistungen' },
  diagnostik: { id: 'leistungen', label: 'Leistungen' },
  statistik: { id: 'leistungen', label: 'Leistungen' },
  kel: { id: 'leistungen', label: 'Leistungen' },
  notenTabelle: { id: 'leistungen', label: 'Leistungen' },
  verbal: { id: 'leistungen', label: 'Leistungen' },
  jahresbericht: { id: 'leistungen', label: 'Leistungen' },
};

const ROOT_PAGES = new Set(['dashboard', 'klasse', 'verhalten', 'planung', 'leistungen', 'unterricht', 'cockpit', 'ki-helfer', 'tools']);

export function getNavigationParent(page: string | undefined | null): NavigationParent | null {
  if (!page || ROOT_PAGES.has(page)) return null;
  if (page === 'ki-helfer' || page.startsWith('ki-')) {
    return { id: 'ki-helfer', label: 'KI-Helfer' };
  }
  return PAGE_PARENTS[page] || null;
}
