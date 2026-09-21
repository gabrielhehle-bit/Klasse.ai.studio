import { AVAILABLE_MODULES } from './settingsModuleCatalog';

/**
 * User-facing help is based on the modules in the actual sidebar and on
 * the currently selectable cockpit widget catalog (not the planned catalog).
 * Descriptions explain the available function, not a promise of enabled AI,
 * paid integrations or an external network connection.
 */
export type HelpTopic = {
  id: string;
  title: string;
  area: string;
  purpose: string;
  canDo: string;
  steps: string[];
};

const SETTING_GUIDES: HelpTopic[] = [
  { id: 'overview', title: 'Einstellungen – Übersicht', area: 'Einstellungen', purpose: 'Hier liegen alle persönlichen und schulbezogenen Einstellungen.', canDo: 'Zwischen Konto, Allgemein, Darstellung, Modulen, Synchronisierung, Backup, Unterstützung und Sicherheit wechseln.', steps: ['Öffne Einstellungen in der Seitenleiste.', 'Wähle eine Kachel oder einen Reiter.', 'Änderungen werden im App-Datenstand gespeichert; überprüfe besonders Lösch- und Importaktionen vor dem Bestätigen.'] },
  { id: 'account', title: 'Konto & Schulmail', area: 'Einstellungen', purpose: 'Verknüpfe dein persönliches E-Mail-Konto und prüfe deine Schulidentität.', canDo: 'E-Mail-Einmalcode anfordern, Schulmail bestätigen und – falls verfügbar – Schulteam/Lehrerzimmer verwenden.', steps: ['Öffne Einstellungen → Konto & Schulmail.', 'Melde dich mit einem Einmalcode an oder überprüfe die hinterlegte Schulmail.', 'Falls die Schulmail nicht erkannt wird oder kein Code ankommt, schreib an noreply@klassio.at. Das ist die einzige KLASSIO-Kontaktadresse.', 'Schuldaten und Teamzugang sind erst nach bestätigter Schulidentität verfügbar.'] },
  { id: 'general', title: 'Allgemein', area: 'Einstellungen', purpose: 'Lege die Grunddaten deines Schulalltags fest.', canDo: 'Lehrkraft/Schule, Schuljahr, Bundesland, Ferienauswahl, Fachfarben, Klassenglas-Ziel und Einführungstour verwalten.', steps: ['Öffne Einstellungen → Allgemein.', 'Kontrolliere Schuljahr und Bundesland; ergänze schulautonome Tage gesondert in deiner Planung.', 'Passe bei Bedarf Fachfarben oder den Klassenglas-Zielwert an.', 'Die Willkommenstour kannst du hier bewusst über „Tour erneut starten“ wiederholen; für Klassenänderungen nutze „Aktuelle Klasse verwalten“.'] },
  { id: 'display', title: 'Darstellung & Cockpit', area: 'Einstellungen', purpose: 'Passe die Ansicht an Gerät und persönliche Lesbarkeit an.', canDo: 'Farbschema, Schriftgröße und Display-Darstellung sowie die Ansicht des Dashboards und der weißen Unterrichtsfläche einstellen.', steps: ['Öffne Einstellungen → Darstellung.', 'Wähle ein Farbschema und eine gut lesbare Schriftgröße.', 'Prüfe die Ansicht am Laptop beziehungsweise Smartboard.', 'Widgets und Zeichnungen bearbeitest du direkt auf der Unterrichtsfläche, nicht in den Farbeinstellungen.'] },
  { id: 'modules', title: 'Module & Bereiche', area: 'Einstellungen', purpose: 'Bestimme, welche App-Bereiche in deiner Navigation sichtbar sind.', canDo: 'Nicht benötigte Seiten aus- und wieder einblenden, ohne dadurch Klassen- oder Leistungsdaten zu löschen.', steps: ['Öffne Einstellungen → Module.', 'Suche den gewünschten Bereich und passe seine Sichtbarkeit an.', 'Falls dir eine Seite in der Seitenleiste fehlt, überprüfe diese Modul-Einstellungen und den Bereich „Mehr“ der Navigation.'] },
  { id: 'sync', title: 'Smartboard & Synchronisierung', area: 'Einstellungen', purpose: 'Verbinde eine Unterrichts- oder Smartboard-Sitzung mit einem weiteren Gerät.', canDo: 'Eine zeitlich begrenzte Live-Kopplung für die Unterrichtsfläche einrichten und bei Bedarf beenden.', steps: ['Öffne Einstellungen → Synchronisierung.', 'Starte die Kopplung am Gerät mit der Unterrichtsfläche.', 'Öffne die angezeigte Verbindungsadresse/den QR-Code am zweiten Gerät und beachte die dort gezeigten Bestätigungsschritte.', 'Beende die Sitzung nach dem Unterricht; eine Live-Kopplung ersetzt keine Datensicherung.'] },
  { id: 'backup', title: 'Daten & Backup', area: 'Einstellungen', purpose: 'Erstelle und verwalte zusätzliche Kopien deines KLASSIO-Datenstands.', canDo: 'Verschlüsselte Sicherungen und Notfallkopien verwalten, Sicherungserinnerungen anpassen und die Web-App bei unterstütztem Browser installieren.', steps: ['Öffne Einstellungen → Daten & Backup.', 'Erstelle bei Bedarf eine Sicherung und verwahre Datei sowie notwendige Zugangsdaten getrennt und geschützt.', 'Vor dem Wiederherstellen kontrolliere, welcher Stand übernommen wird; beachte die eingeblendeten Hinweise zum bestehenden Datenstand.', 'Für die App-Installation nutze die angebotene Browser-/PWA-Funktion, sofern verfügbar.'] },
  { id: 'support', title: 'Unterstützung', area: 'Einstellungen', purpose: 'Informiere dich über die freiwillige Unterstützung von KLASSIO.', canDo: 'Informationen zu freiwilligen Beiträgen und – bei Zustimmung – einer Dankesliste ansehen.', steps: ['Öffne Einstellungen → Unterstützung.', 'Lies die Informationen in Ruhe durch.', 'Die Unterstützung ist freiwillig und nicht erforderlich, um die regulären App-Funktionen zu verwenden.'] },
  { id: 'advanced', title: 'Erweitert & Sicherheit', area: 'Einstellungen', purpose: 'Verwalte Datenschutz- und technische Wartungsoptionen.', canDo: 'Pseudonymisierung für KI, Tresor-Sperre, System-/Speicherchecks und ausdrücklich bestätigte Löschfunktionen steuern.', steps: ['Öffne Einstellungen → Erweitert & Sicherheit.', 'Kontrolliere bei KI-Nutzung die Schülernamen-Anonymisierung und teile keine unnötigen personenbezogenen Daten.', 'Nutze System- und Speicherdiagnose, wenn etwas ungewöhnlich funktioniert.', 'Sichere deinen Datenstand vor Aktionen im Gefahrenbereich: lokale App-Daten löschen ist nicht durch simples Schließen rückgängig zu machen.'] },
  { id: 'hilfe', title: 'Hilfe – KLASSIO-Anleitungen', area: 'Einstellungen', purpose: 'Alle KLASSIO-Bereiche und aktuell auswählbaren Unterrichtswidgets verständlich nachschlagen.', canDo: 'Nach Seitennamen, Werkzeugen oder Funktionen suchen und eine konkrete Anleitung aufklappen.', steps: ['Öffne Einstellungen → Hilfe.', 'Wähle „App-Seiten“, „Widgets“ oder „Einstellungen“ beziehungsweise nutze die Suche.', 'Klappe den gewünschten Eintrag auf; der Abschnitt „So geht’s“ beschreibt die ersten Schritte.'] },
];

const MODULE_HOWTO: Record<string, { canDo: string; steps: string[] }> = {
  dashboard: { canDo: 'Heutigen Unterricht, anstehende Termine, offene Aufgaben und wichtige Hinweise gebündelt sehen.', steps: ['Öffne „Heute“ nach der Anmeldung.', 'Prüfe die Angaben zum aktuellen Tag und wähle einen Eintrag, um in den passenden Bereich zu wechseln.', 'Öffne die Seitenleiste für weitere Module.'] },
  klasse: { canDo: 'Kinder, Anwesenheit und wichtige Abläufe deiner aktiven Klasse zentral erreichen.', steps: ['Wähle oben die richtige Klasse.', 'Öffne „Klasse“ und wähle dort den Bereich, den du bearbeiten möchtest.', 'Prüfe vor Einträgen, ob du in der richtigen Klasse arbeitest.'] },
  planung: { canDo: 'Wochenplan, Jahresplanung und Unterrichtsmaterialien über einen gemeinsamen Einstieg erreichen.', steps: ['Öffne „Planung“.', 'Wähle Wochenplan, Jahresplanung oder Materialien.', 'Trage Inhalte im jeweiligen Fachbereich ein und kontrolliere Zeitraum und Klasse.'] },
  leistungen: { canDo: 'Leistungsbeurteilung, Diagnostik, Lernziele und passende Übersichten aufrufen.', steps: ['Öffne „Leistungen“.', 'Wähle das passende Modul, etwa Notenmappe oder Lernziele.', 'Prüfe Schüler:in und Fach, bevor du eine Bewertung einträgst.'] },
  tools: { canDo: 'Textanalyse, Stationenbetrieb, Canva und Druckzentrum an einem Ort erreichen.', steps: ['Öffne „Tools“.', 'Wähle eine Werkzeug-Kachel.', 'Die jeweilige Anleitung findest du hier in der Hilfe unter dem Werkzeugnamen.'] },
  textanalyse: { canDo: 'Lesbarkeit und formale Merkmale eines Textes lokal untersuchen.', steps: ['Öffne „Textanalyse“.', 'Füge den zu prüfenden Text ein beziehungsweise nutze die angebotene Eingabe.', 'Sieh dir die berechneten Kennzahlen als Orientierung an; sie ersetzen keine pädagogische Einschätzung des konkreten Kindes.'] },
  cockpit: { canDo: 'Weiße Unterrichtsfläche zum Schreiben, Zeichnen und für frei platzierbare Widgets nutzen.', steps: ['Öffne „Lehrercockpit“.', 'Nutze die Zeichen-/Textwerkzeuge auf der Arbeitsfläche.', 'Wähle „Widget hinzufügen“ und öffne das gewünschte Werkzeug; verschiebe oder vergrößere es bei Bedarf.', 'Die Anleitung zu jedem auswählbaren Widget findest du im Hilfe-Reiter „Widgets“.'] },
  'ki-helfer': { canDo: 'Unterrichtsideen und Textvorschläge mit den bereitgestellten KI-Werkzeugen bearbeiten, sofern KI eingerichtet ist.', steps: ['Öffne „KI-Helfer“ und wähle einen konkreten Auftrag.', 'Formuliere Lernziel, Schulstufe und gewünschte Ausgabe.', 'Überprüfe jede Antwort fachlich und datenschutzrechtlich, bevor du sie im Unterricht verwendest.'] },
  lehrerzimmer: { canDo: 'Schulinterne Beiträge, Fragen und Antworten austauschen, wenn die Schulmail verifiziert ist.', steps: ['Verifiziere deine Schul-E-Mail unter Einstellungen → Konto & Schulmail.', 'Öffne „Lehrerzimmer“ und wähle den passenden Beitrag oder erstelle eine neue Frage.', 'Teile keine personenbezogenen Schülerdaten in öffentlichen beziehungsweise schulweiten Beiträgen.'] },
  arbeitsblatt: { canDo: 'Arbeitsblätter zu einem Thema vorbereiten und zur Verwendung im Unterricht ausgeben.', steps: ['Öffne „Arbeitsblatt-Generator“.', 'Wähle Thema, Schulstufe und die verfügbaren Optionen.', 'Prüfe Aufgaben und Lösungen vor dem Ausgeben.'] },
  stationenbetrieb: { canDo: 'Lernstationen planen, einen Ablauf strukturieren und den Fortschritt im Blick behalten.', steps: ['Öffne „Stationenbetrieb“.', 'Lege die Stationen und ihre Aufgaben an.', 'Kontrolliere den Fortschritt während der Durchführung.'] },
  differenzierung: { canDo: 'Material und Aufgaben an verschiedene Lernstände anpassen.', steps: ['Öffne „Differenzierung“.', 'Beschreibe Lernziel und benötigte Niveaus.', 'Prüfe die vorgeschlagenen Aufgaben und passe sie deiner Lerngruppe an.'] },
  elternbrief: { canDo: 'Elterninformationen vorbereiten und als Brief ausgeben.', steps: ['Öffne „Elternbrief“.', 'Trage Anlass, Termin und wichtige Informationen ein.', 'Prüfe Anschrift und Inhalt vor dem Weitergeben.'] },
  schueler: { canDo: 'Kinder der aktiven Klasse finden und deren Stammdaten einsehen beziehungsweise bearbeiten.', steps: ['Öffne „Klassenliste“.', 'Wähle ein Kind, um seine weiteren Einträge zu erreichen.', 'Überprüfe beim Import und Bearbeiten die Zuordnung zur aktiven Klasse.'] },
  dossier: { canDo: 'Entwicklung, Lernen, Beobachtungen und Stammdaten eines einzelnen Kindes bündeln.', steps: ['Öffne „Schülerdossier“ über die Klasse oder die Klassenliste.', 'Wähle das richtige Kind und anschließend den gewünschten Dossierbereich.', 'Dokumentiere nachvollziehbar und beschränke Angaben auf pädagogisch notwendige Informationen.'] },
  sitzplan: { canDo: 'Sitzplätze und Gruppen für deine Klasse übersichtlich planen.', steps: ['Öffne „Sitzplan & Gruppen“.', 'Wähle die aktive Klasse, ordne Plätze und Kinder zu und kontrolliere den Plan.', 'Nutze für eine schnelle zufällige Unterrichtseinteilung das separate Gruppenwidget im Lehrercockpit.'] },
  anwesenheit: { canDo: 'Anwesenheit und gegebenenfalls das freiwillige Befinden im Tagesverlauf erfassen.', steps: ['Öffne „Anwesenheit & Befinden“.', 'Prüfe Datum und Klasse.', 'Erfasse die Anwesenheit; Angaben zum Befinden erfolgen freiwillig, sofern diese Funktion aktiviert ist.'] },
  teamteaching: { canDo: 'Eine Klasse gezielt mit verifizierten Kolleg:innen derselben Schule teilen.', steps: ['Verifiziere zuerst die Schulmail und prüfe die richtige Schulzuordnung.', 'Öffne „Teamteaching“ und folge den angezeigten Schritten zum Teilen.', 'Beachte den Synchronisierungsstatus und kläre mögliche Konflikte, bevor du weiterarbeitest.'] },
  verhalten: { canDo: 'Klassen- und Schülernotizen zentral erfassen und wiederfinden.', steps: ['Öffne „Notizen“.', 'Wähle die richtige Klasse beziehungsweise das richtige Kind.', 'Erfasse die Notiz sachlich; kontrolliere Datum und Sichtbarkeit.'] },
  orga: { canDo: 'Klassenkasse und organisatorische Geldsammlungen verwalten.', steps: ['Öffne „Kasse & Orga“.', 'Lege eine Sammlung oder Buchung an.', 'Prüfe Beträge und Zuordnung sorgfältig; gleiche den Stand regelmäßig mit deinen Belegen ab.'] },
  noten: { canDo: 'Bewertungen je Fach als Note, Punkte oder Prozent dokumentieren und zusammenfassen.', steps: ['Öffne „Notenmappe“ und wähle Fach und Kind beziehungsweise Bewertung.', 'Lege die Bewertungsart und erreichbare Punkte gegebenenfalls vor der Eingabe fest.', 'Kontrolliere Gewichtung und Ergebnisse, bevor du Beurteilungen übernimmst.'] },
  diagnostik: { canDo: 'Lese-, Rechen- und weitere Kompetenzchecks vorbereiten, durchführen und auswerten.', steps: ['Öffne „Diagnostik“ und wähle einen passenden Check.', 'Führe ihn nach der angezeigten Anleitung durch und erfasse die Ergebnisse.', 'Nutze die Auswertung als eine Informationsquelle für deine Förderplanung.'] },
  portfolio: { canDo: 'Lernziele und Portfolioeinträge zu einem Kind begleiten.', steps: ['Öffne „Lernziele & Portfolio“.', 'Wähle Kind und Ziel.', 'Halte Lernfortschritt oder einen passenden Nachweis fest.'] },
  verbal: { canDo: 'Verbale Rückmeldungen beziehungsweise Beurteilungstexte vorbereiten.', steps: ['Öffne „Verbale Beurteilung“.', 'Wähle den passenden Zeitraum und das Kind.', 'Verfasse und überprüfe die Formulierungen vor der Verwendung.'] },
  kel: { canDo: 'Kinder-Eltern-Lehrperson-Gespräche strukturiert vorbereiten.', steps: ['Öffne „KEL-Gespräche“.', 'Sammle relevante Gesprächspunkte und Vereinbarungen.', 'Prüfe die Angaben vor dem Gespräch und dokumentiere Ergebnisse sachlich.'] },
  planungszentrale: { canDo: 'Die aktuelle Unterrichtswoche prüfen und zu geplanten Stunden wechseln.', steps: ['Öffne „Wochen-Check“.', 'Wähle die gewünschte Woche.', 'Prüfe, welche Stunden vorbereitet sind, und wechsle zur passenden Planung.'] },
  jahresplanung: { canDo: 'Langfristige Themen und Lernschwerpunkte über das Schuljahr verteilen.', steps: ['Öffne „Jahresplanung“.', 'Wähle Schuljahr und Fach.', 'Trage Themen und geplante Zeiträume ein und überprüfe sie regelmäßig.'] },
  wochenplanung: { canDo: 'Stammstundenplan, Unterrichtsinhalte und Aufgaben für einzelne Wochen organisieren.', steps: ['Öffne „Wochenplan“.', 'Wähle Woche und Unterrichtsstunde.', 'Ergänze Inhalt, Material oder Aufgaben und kontrolliere die Daten im Wochenüberblick.'] },
  materialien: { canDo: 'Unterrichtsmaterialien sammeln und für geplante Stunden wiederfinden.', steps: ['Öffne „Materialbibliothek“.', 'Lege Materialien geordnet ab.', 'Suche oder wähle ein Material für deine Unterrichtsvorbereitung.'] },
  canva: { canDo: 'Grafische Unterrichtsmaterialien über die vorhandene Canva-Integration gestalten oder exportieren, soweit verbunden.', steps: ['Öffne „Canva“.', 'Prüfe bei Bedarf die Verbindung beziehungsweise angebotenen Optionen.', 'Erstelle oder bearbeite ein Design und kontrolliere das Ausgabeformat.'] },
  vertretung: { canDo: 'Informationen und einen Tagesablauf für Vertretungen oder Übergaben vorbereiten.', steps: ['Öffne „Vertretung & Übergabe“.', 'Ergänze die für den Termin notwendigen Stunden- und Klasseninformationen.', 'Kontrolliere die Druck-/Weitergabeansicht und vermeide unnötige sensible Daten.'] },
  klassengemeinschaft: { canDo: 'Aktivitäten und Impulse zum sozialen Lernen der Klasse begleiten.', steps: ['Öffne „Wir-Gefühl“.', 'Wähle ein passendes Thema oder eine Aktivität.', 'Besprich die Ergebnisse altersgerecht mit der Klasse.'] },
  jahresbericht: { canDo: 'Einen Rückblick auf das Schuljahr und geeignete Berichte vorbereiten.', steps: ['Öffne „Jahresbericht“.', 'Wähle die passende Klasse und den Zeitraum.', 'Prüfe den Inhalt vor dem Speichern oder Weitergeben.'] },
  archiv: { canDo: 'Abgeschlossene Schuljahre und archivierte Einträge wiederfinden.', steps: ['Öffne „Archiv“.', 'Wähle das richtige Schuljahr oder den gesuchten Verlauf.', 'Kontrolliere die Daten, bevor du sie weiterverwendest oder löschst.'] },
  drucken: { canDo: 'Listen, Klassenbuch und andere angebotene Dokumente für Druck oder Ausgabe vorbereiten.', steps: ['Öffne „Druckzentrum“.', 'Wähle den gewünschten Ausdruck.', 'Kontrolliere Datenschutz, Seitenvorschau und Papierformat, bevor du druckst.'] },
  datensicherung: { canDo: 'Sicherungen erstellen und den Datenstand bei Bedarf wiederherstellen.', steps: ['Öffne „Datensicherung“.', 'Erstelle und verwahre eine geschützte Sicherung.', 'Prüfe vor dem Import Quelle, Inhalt und die Auswirkungen auf den vorhandenen Stand.'] },
  stundenplan: { canDo: 'Den eigenen Unterrichtsstundenplan bei mehreren Unterstufenklassen überblicken.', steps: ['Öffne „Mein Stundenplan“ in einer Unterstufenklasse.', 'Prüfe die ausgewählten Fachstunden und Zeiten.', 'Nimm Änderungen in der zugehörigen Klassenplanung vor.'] },
  settings: { canDo: 'Persönliche und schulbezogene Einstellungen verwalten.', steps: ['Öffne „Einstellungen“.', 'Wähle den passenden Bereich; unter „Hilfe“ findest du die einzelnen Anleitungen.'] },
};

const widgetCatalog: Array<{ id: string; title: string; purpose: string; group: string }> = [
  {
    "id": "timeline",
    "title": "🛤 Tages-Zeitstrahl",
    "purpose": "Interaktiver visueller Ablaufplan",
    "group": "struct"
  },
  {
    "id": "clock",
    "title": "⏱️ Uhrzeit & Datum",
    "purpose": "Analoge/Digitale Zeitanzeige",
    "group": "struct"
  },
  {
    "id": "timer",
    "title": "⏳ Timer / Sanduhr",
    "purpose": "Countdown-Timer & Sanduhr",
    "group": "struct"
  },
  {
    "id": "stopwatch",
    "title": "⏱️ Stoppuhr",
    "purpose": "Rundenzeitzähler",
    "group": "struct"
  },
  {
    "id": "trafficlight",
    "title": "🚦 Status-Ampel",
    "purpose": "Verhalten und Lernampel",
    "group": "struct"
  },
  {
    "id": "todo",
    "title": "📝 Aufgaben-Checkliste",
    "purpose": "Schnelle Tafel-To-Do-Listen",
    "group": "struct"
  },
  {
    "id": "dienste",
    "title": "🧹 Klassendienste",
    "purpose": "Ämter- & Diensteverteilung",
    "group": "struct"
  },
  {
    "id": "links",
    "title": "🔗 Link- & Dateispeicher",
    "purpose": "Eigene Verknüpfungen ablegen",
    "group": "struct"
  },
  {
    "id": "phases",
    "title": "🧭 Unterrichtsphasen",
    "purpose": "Erarbeitung, Reflexion, etc.",
    "group": "struct"
  },
  {
    "id": "wordclock",
    "title": "⏰ Deutsche Wort-Uhr",
    "purpose": "Kindgerechtes Uhrlernen",
    "group": "struct"
  },
  {
    "id": "classweeklyplan",
    "title": "📋 Wochenplan der Kinder",
    "purpose": "Gemeinsamer Plan, persönliche Häkchen und Schwierigkeitseinschätzung",
    "group": "struct"
  },
  {
    "id": "randomname",
    "title": "🎯 Zufallsauswahl",
    "purpose": "Namen aus Schülerliste ziehen",
    "group": "interactivity"
  },
  {
    "id": "groups",
    "title": "👥 Gruppen-Einteiler",
    "purpose": "Zufällige Teams auslosen",
    "group": "interactivity"
  },
  {
    "id": "wheel",
    "title": "🎡 Glücksrad",
    "purpose": "Zufallsauswahl Rad",
    "group": "interactivity"
  },
  {
    "id": "kidattendance",
    "title": "🖐️ Ich bin da!",
    "purpose": "Kinder bestätigen ihre Anwesenheit selbst",
    "group": "interactivity"
  },
  {
    "id": "scoreboard",
    "title": "🏆 Gruppen-Punkte",
    "purpose": "Team-Punktetafel",
    "group": "interactivity"
  },
  {
    "id": "challenge",
    "title": "🎯 Klassen-Challenge",
    "purpose": "Herausforderungen für die Klasse",
    "group": "interactivity"
  },
  {
    "id": "secretagent",
    "title": "🕵️‍♂️ Klassen-Kryptograph",
    "purpose": "Caesar-Chiffre & Safe-Knacker Rätsel",
    "group": "interactivity"
  },
  {
    "id": "weightscale",
    "title": "⚖️ Waagen-Schätzer",
    "purpose": "Gewichte vergleichen & ausbalancieren",
    "group": "interactivity"
  },
  {
    "id": "reflexgame",
    "title": "⚡ Blitz-Reaktions-Trainer",
    "purpose": "Reaktionsgeschwindigkeit-Duell für Kinder",
    "group": "interactivity"
  },
  {
    "id": "zahlenraum",
    "title": "🔢 Zahlenraum-Studio",
    "purpose": "Mengenbilder, Hunderterfeld & Zahlenstrahl (ZR 10 bis 1000)",
    "group": "mathe"
  },
  {
    "id": "kopfrechnen",
    "title": "🧠 Kopfrechentrainer",
    "purpose": "Blitzrechnen, Einmaleins/Einsineins & Rechenketten",
    "group": "mathe"
  },
  {
    "id": "fractionvisualizer",
    "title": "◐ Bruch-Visualisierer",
    "purpose": "Brüche im Kreis & Streifen darstellen und vergleichen",
    "group": "mathe"
  },
  {
    "id": "mathbalancer",
    "title": "⚖️ Gewichte-Waage",
    "purpose": "Gleiche die Balkenwaage aus",
    "group": "mathe"
  },
  {
    "id": "moneycalc",
    "title": "💶 Taschengeld-Zähler",
    "purpose": "Geldbeträge zusammenzählen",
    "group": "mathe"
  },
  {
    "id": "mathpyramid",
    "title": "📐 Mathe-Pyramide",
    "purpose": "Löse die Zahlenpyramide durch Addition",
    "group": "mathe"
  },
  {
    "id": "clockpuzzle",
    "title": "⏰ Uhren-Lern-Trainer",
    "purpose": "Lerne analoge Uhrzeiten einzustellen",
    "group": "mathe"
  },
  {
    "id": "geometry",
    "title": "📐 Geometrie-Muster",
    "purpose": "Bunte geometrische Collagen",
    "group": "mathe"
  },
  {
    "id": "angledetective",
    "title": "📐 Winkel-Detektiv",
    "purpose": "Schätze Winkel im rotierenden Scheinwerferstrahl",
    "group": "mathe"
  },
  {
    "id": "estimationjar",
    "title": "🫙 Schätz-Glas",
    "purpose": "Mengen und Murmel-Anzahlen schätzen",
    "group": "mathe"
  },
  {
    "id": "vocabulary",
    "title": "🔤 Lernwörter-Studio",
    "purpose": "Lernkartei, Stolperstellen & ABC-Ordnung",
    "group": "deutsch"
  },
  {
    "id": "wortsatzwerkstatt",
    "title": "✍️ Wort- & Satzwerkstatt",
    "purpose": "Wörter bauen, zerlegen & Sätze ordnen",
    "group": "deutsch"
  },
  {
    "id": "wordchain",
    "title": "🔗 Wortketten-Spiel",
    "purpose": "Kettenwörter-Generator",
    "group": "deutsch"
  },
  {
    "id": "wordgrid",
    "title": "🔍 Buchstaben-Suchgitter",
    "purpose": "Wortsuchspiel auf Deutsch",
    "group": "deutsch"
  },
  {
    "id": "dictionary",
    "title": "📚 Emoji-Wörterbuch",
    "purpose": "Flips-Vokabelkarten DE & EN",
    "group": "deutsch"
  },
  {
    "id": "wordscramble",
    "title": "🍲 Wort-Salat (Anagramm)",
    "purpose": "Anagramme entschlüsseln",
    "group": "deutsch"
  },
  {
    "id": "secretcode",
    "title": "🕵️ Geheimsprachen-Box",
    "purpose": "Verschlüssle Botschaften",
    "group": "deutsch"
  },
  {
    "id": "storyemojis",
    "title": "🎭 Story-Emojis",
    "purpose": "Bildimpulse für Geschichten & Erzählungen",
    "group": "deutsch"
  },
  {
    "id": "wordexplorer",
    "title": "🔍 Wort-Analysator",
    "purpose": "Silben, Vokale & Wortart bestimmen",
    "group": "deutsch"
  },
  {
    "id": "patternmaker",
    "title": "🎨 Sequenz-Muster-Macher",
    "purpose": "Logische Muster fortführen",
    "group": "deutsch"
  },
  {
    "id": "rhymemachine",
    "title": "🎰 Reim-Maschine",
    "purpose": "Finde das passende Reimwort",
    "group": "deutsch"
  },
  {
    "id": "alphabetsoup",
    "title": "🥣 Buchstaben-Suppe",
    "purpose": "Wörter buchstabieren",
    "group": "deutsch"
  },
  {
    "id": "morsecode",
    "title": "🔦 Morse-Code-Station",
    "purpose": "Sende Lichtsignale",
    "group": "deutsch"
  },
  {
    "id": "punctuationzoo",
    "title": "🐒 Satzzeichen-Zoo",
    "purpose": "Finde die fehlenden Satzzeichen",
    "group": "deutsch"
  },
  {
    "id": "bodyparts",
    "title": "🦴 Körper-Entdecker",
    "purpose": "Kindgerechte Anatomie-Fakten",
    "group": "sachunterricht"
  },
  {
    "id": "compass",
    "title": "🧭 Geographie-Kompass",
    "purpose": "Orientierung & Himmelsrichtungen lernen",
    "group": "sachunterricht"
  },
  {
    "id": "weekdays",
    "title": "📅 Wochentage-Trainer",
    "purpose": "Wochentage und Monate lernen",
    "group": "sachunterricht"
  },
  {
    "id": "trafficquiz",
    "title": "🚴 Fahrrad-Führerschein",
    "purpose": "Lerne wichtige Verkehrszeichen",
    "group": "sachunterricht"
  },
  {
    "id": "watercycle",
    "title": "💧 Wasserkreislauf-Puzzle",
    "purpose": "Stationen des Wasserkreislaufs",
    "group": "sachunterricht"
  },
  {
    "id": "constellation",
    "title": "✨ Sternbilder-Zeichner",
    "purpose": "Verbinde Sterne zu echten Himmels-Sternbildern",
    "group": "sachunterricht"
  },
  {
    "id": "planetarium",
    "title": "🌍 Planetensystem",
    "purpose": "Planeten unseres Sonnensystems entdecken",
    "group": "sachunterricht"
  },
  {
    "id": "geographyquiz",
    "title": "🗺️ Bundesländer-Forscher",
    "purpose": "Bundesländer & Hauptstädte raten",
    "group": "sachunterricht"
  },
  {
    "id": "instruction",
    "title": "📝 Arbeitsanweisung",
    "purpose": "Großes Textfeld für Aufgaben",
    "group": "tools"
  },
  {
    "id": "tischcheck",
    "title": "🎒 Tisch-Check",
    "purpose": "Visualisiere benötigte Materialien am Platz",
    "group": "tools"
  },
  {
    "id": "faircall",
    "title": "🙋‍♀️ Fair-Call",
    "purpose": "Gerechter Zufallsaufrufer mit Aufrufhistorie",
    "group": "tools"
  },
  {
    "id": "hangman",
    "title": "🌸 Blumen-Rätsel",
    "purpose": "Sätze oder Wörter schrittweise erraten",
    "group": "play"
  },
  {
    "id": "calculator",
    "title": "🧮 Grundschulrechner",
    "purpose": "Klarer Smartboard-Rechner für Grundrechenarten",
    "group": "tools"
  },
  {
    "id": "noisemeter",
    "title": "🔊 Lärmampel / Messer",
    "purpose": "Lautstärkekontrolle visualisiert",
    "group": "tools"
  },
  {
    "id": "image",
    "title": "🖼️ Tafelbild-Projektor",
    "purpose": "Eigene Tafelfiles hochladen",
    "group": "tools"
  },
  {
    "id": "qrcode",
    "title": "🔗 QR-Code-Generator",
    "purpose": "Links für Schüler bereitstellen",
    "group": "tools"
  },
  {
    "id": "drawing",
    "title": "🖍️ Zeichenfeld",
    "purpose": "Skizzen & Handschrift auf Tafel",
    "group": "tools"
  },
  {
    "id": "sounds",
    "title": "🎵 Soundboard Töne",
    "purpose": "Klassenzimmersignale abspielen",
    "group": "tools"
  },
  {
    "id": "klassenglas",
    "title": "💎 Klassenziel & Belohnungsglas",
    "purpose": "Gemeinsames Klassenziel (Glas, Thermometer, Barometer)",
    "group": "tools"
  },
  {
    "id": "noisescales",
    "title": "🤫 Lautstärke-Modelle",
    "purpose": "Lautstärke-Pegel als Orientierung",
    "group": "tools"
  },
  {
    "id": "guitartuner",
    "title": "🎸 Gitarren-Stimmgerät",
    "purpose": "Saiten stimmen mit Referenztönen",
    "group": "tools"
  },
  {
    "id": "aiquiz",
    "title": "🤖 KI Lern-Quiz",
    "purpose": "Lernfragen beantworten",
    "group": "mindfulness"
  },
  {
    "id": "riddle",
    "title": "🧩 Scherz- & Logikrätsel",
    "purpose": "Tägliche Knobelfragen für Kinder",
    "group": "mindfulness"
  },
  {
    "id": "colormixer",
    "title": "🎨 Kunst Farbmischung",
    "purpose": "Farbzusammenstellungen spielerisch",
    "group": "mindfulness"
  },
  {
    "id": "dice",
    "title": "🎲 Tafel-Würfel",
    "purpose": "Zweifarbwürfel werfen",
    "group": "mindfulness"
  },
  {
    "id": "shadowshapes",
    "title": "🦋 Symmetrie-Spiel",
    "purpose": "Schattenmotive spiegeln",
    "group": "mindfulness"
  },
  {
    "id": "clocksync",
    "title": "⏰ Uhrzeit-Macher",
    "purpose": "Stelle analoge Zeiger passend zur digitalen Uhr",
    "group": "mindfulness"
  },
  {
    "id": "soundmemory",
    "title": "🎵 Klang-Memory",
    "purpose": "Finde gleiche Töne über Gehör",
    "group": "mindfulness"
  },
  {
    "id": "breathing",
    "title": "🍃 Atempause",
    "purpose": "Ruhige angeleitete Atemübung",
    "group": "mindfulness"
  },
  {
    "id": "kidweather",
    "title": "🕶️ Wetterfrosch Station",
    "purpose": "Wie zieht man sich passend an?",
    "group": "mindfulness"
  },
  {
    "id": "pet",
    "title": "🦦 Klassenmaskottchen",
    "purpose": "Olivia, Bruno, Mimi oder Hauself Elio · ruhig & ohne Floating",
    "group": "mindfulness"
  },
  {
    "id": "weather",
    "title": "☁️ Aktueller Wetterbericht",
    "purpose": "Wetterdaten abrufen",
    "group": "mindfulness"
  },
  {
    "id": "moodmeter",
    "title": "🙂 Stimmungsmesser",
    "purpose": "Befinden der Schüler erfassen",
    "group": "mindfulness"
  },
  {
    "id": "watertracker",
    "title": "💧 Wasserbedarf-Tracker",
    "purpose": "Tagesbedarfskontrolle",
    "group": "mindfulness"
  },
  {
    "id": "rhythm",
    "title": "🥁 Rhythmus-Klopfer",
    "purpose": "Beats & Takte interaktiv üben",
    "group": "mindfulness"
  },
  {
    "id": "dailyquotes",
    "title": "💡 Morgen-Mottos",
    "purpose": "Positive Affirmationen am Morgen",
    "group": "mindfulness"
  },
  {
    "id": "toothbrush",
    "title": "🪥 Zahnputz-Station",
    "purpose": "Schritt-für-Schritt Putzanleitung",
    "group": "mindfulness"
  },
  {
    "id": "emotions",
    "title": "🎭 Gefühls-Barometer",
    "purpose": "Auseinandersetzung mit Gefühlen",
    "group": "mindfulness"
  },
  {
    "id": "animalvoice",
    "title": "🤖 Roboter-Sounds",
    "purpose": "Welcher Roboter macht dieses Geräusch?",
    "group": "mindfulness"
  },
  {
    "id": "piano",
    "title": "🎹 Klassen-Klavier",
    "purpose": "Spielbare Tonleiter & Musik",
    "group": "mindfulness"
  },
  {
    "id": "calmrain",
    "title": "🌧️ Fokus-Klänge",
    "purpose": "Beruhigende Natur- und Fokusgeräusche für Stillarbeit",
    "group": "mindfulness"
  },
  {
    "id": "wastebin",
    "title": "♻️ Müll-Trenner",
    "purpose": "Ordne Abfallprodukte richtig ein",
    "group": "mindfulness"
  },
  {
    "id": "tonetrainer",
    "title": "🎵 Tonleiter-Entdecker",
    "purpose": "Spiele Töne und lerne Melodien nach Gehör",
    "group": "mindfulness"
  },
  {
    "id": "scrambler",
    "title": "✍️ Wort- & Satzwerkstatt",
    "purpose": "Wörter und Sätze spielerisch ordnen und untersuchen",
    "group": "deutsch"
  },
  {
    "id": "fractions",
    "title": "◐ Bruch-Visualisierer",
    "purpose": "Brüche anschaulich darstellen",
    "group": "mathe"
  },
  {
    "id": "sorting",
    "title": "🔢 Zahlensortierer",
    "purpose": "Zahlen vergleichen und sortieren",
    "group": "mathe"
  },
  {
    "id": "piggybank",
    "title": "🐷 Klassen-Sparschwein",
    "purpose": "Geldbeträge spielerisch darstellen",
    "group": "mathe"
  },
  {
    "id": "spellingdetective",
    "title": "🔤 Rechtschreib-Detektiv",
    "purpose": "Wörter untersuchen und Rechtschreibung trainieren",
    "group": "deutsch"
  },
  {
    "id": "numberline",
    "title": "🔢 Zahlenstrahl",
    "purpose": "Zahlen auf dem Zahlenstrahl verorten",
    "group": "mathe"
  },
  {
    "id": "mathchain",
    "title": "🧠 Rechenkette",
    "purpose": "Rechenketten gemeinsam bearbeiten",
    "group": "mathe"
  },
  {
    "id": "thermometer",
    "title": "🌡️ Ziel-Thermometer",
    "purpose": "Fortschritt und Ziele sichtbar machen",
    "group": "struct"
  },
  {
    "id": "compoundsplit",
    "title": "✍️ Zusammengesetzte Wörter",
    "purpose": "Wortbausteine erkennen und zusammensetzen",
    "group": "deutsch"
  },
  {
    "id": "mathduel",
    "title": "⚔️ Mathe-Duell",
    "purpose": "Kurze Rechenduelle für die Klasse",
    "group": "mathe"
  },
  {
    "id": "shapepuzzle",
    "title": "📐 Formen-Entdecker",
    "purpose": "Geometrische Formen entdecken und zuordnen",
    "group": "mathe"
  },
  {
    "id": "fractioncake",
    "title": "🍰 Bruch-Kuchen",
    "purpose": "Bruchteile mit anschaulichen Flächen darstellen",
    "group": "mathe"
  },
  {
    "id": "sentencebuilding",
    "title": "✍️ Satzbau",
    "purpose": "Sätze aufbauen und Satzteile ordnen",
    "group": "deutsch"
  },
  {
    "id": "divrobot",
    "title": "🤖 Teilbarkeits-Roboter",
    "purpose": "Teilbarkeit spielerisch untersuchen",
    "group": "mathe"
  },
  {
    "id": "classtarget",
    "title": "🎯 Klassen-Ziel",
    "purpose": "Gemeinsame Ziele sichtbar verfolgen",
    "group": "interactivity"
  },
  {
    "id": "fractiongrid",
    "title": "◐ Bruch-Raster",
    "purpose": "Brüche im Raster visualisieren",
    "group": "mathe"
  },
  {
    "id": "wordbuilder",
    "title": "🔤 Wort-Baukasten",
    "purpose": "Wörter aus Bausteinen zusammensetzen",
    "group": "deutsch"
  },
  {
    "id": "soundmachine",
    "title": "🎵 Klang-Maschine",
    "purpose": "Klänge und Signale im Unterricht einsetzen",
    "group": "tools"
  },
  {
    "id": "multitrainer",
    "title": "🧠 Multi-Trainer",
    "purpose": "Verschiedene Rechenarten trainieren",
    "group": "mathe"
  },
  {
    "id": "abcorder",
    "title": "🔤 ABC-Sortierer",
    "purpose": "Wörter alphabetisch ordnen",
    "group": "deutsch"
  },
  {
    "id": "anschauung",
    "title": "🔢 Zahlenraum-Studio",
    "purpose": "Zahlenräume anschaulich darstellen",
    "group": "mathe"
  }
];

const widgetSections: Record<string, string> = {
  struct: 'Struktur & Zeit', interactivity: 'Interaktion', mathe: 'Mathematik',
  deutsch: 'Deutsch', tools: 'Weitere Unterrichtswerkzeuge', science: 'Sachunterricht',
  creative: 'Kreativ & Musik',
};

const widgetSpecificSteps: Record<string, string[]> = {
  groups: ['Öffne das Lehrercockpit → Widget hinzufügen → Gruppen bilden; konfiguriere dort Gruppengröße/Anzahl und ob nur anwesende oder alle Kinder mitmachen.', 'Tippe auf „Gruppen bilden“ und kontrolliere die Einteilung. Über „Alle Gruppen anzeigen“ siehst du jede Gruppe; auf kleinen Bildschirmen kannst du in der Großansicht scrollen.', 'Für eine neue Einteilung wähle „Neu mischen“. Die Einstellungen werden erst beim nächsten Mischen auf eine bestehende Einteilung angewendet.'],
  kidattendance: ['Wähle in Widget hinzufügen → „Ich bin da!“ und stelle den Check-in-Modus ein.', 'Lass die Kinder ihre Anwesenheit im gewählten Modus bestätigen oder erfasse sie selbst.', 'Eine Befindensabfrage ist freiwillig und lässt sich bei Bedarf deaktivieren.'],
  randomname: ['Öffne „Zufallsauswahl“ im Lehrercockpit und prüfe den ausgewählten Ziehmodus.', 'Starte die Ziehung; bei einer fairen Runde kommt jedes teilnehmende Kind einmal an die Reihe, bevor eine neue Runde beginnt.', 'Ändere Ziehmodus, Ton und Animation über Widget hinzufügen → Einstellungen.'],
  classweeklyplan: ['Öffne „Wochenplan der Kinder“ auf der Unterrichtsfläche.', 'Prüfe die Aufgaben der aktuellen Woche und die Zuordnung zu den Kindern.', 'Lass Fortschritt beziehungsweise persönliche Häkchen im vorgesehenen Modus erfassen.'],
  timer: ['Öffne „Timer / Sanduhr“.', 'Stelle die gewünschte Dauer ein und starte den Countdown.', 'Stoppe oder setze die Zeit über die angezeigten Bedienelemente zurück.'],
  clock: ['Öffne „Uhrzeit & Datum“ auf dem Lehrercockpit.', 'Wähle je nach verfügbaren Optionen eine analoge oder digitale Anzeige.', 'Nutze die Uhr als Orientierung während des Unterrichts.'],
  stopwatch: ['Öffne „Stoppuhr“.', 'Starte die Zeitmessung und nutze bei Bedarf die Rundenfunktion.', 'Stoppe oder setze die Messung nach dem Durchgang zurück.'],
  todo: ['Füge „Aufgaben-Checkliste“ zur Unterrichtsfläche hinzu.', 'Erfasse die nächsten Arbeitsschritte und markiere erledigte Aufgaben.', 'Prüfe die Liste vor der Projektion auf personenbezogene Angaben.'],
  dienste: ['Öffne „Klassendienste“.', 'Lege die für deine Klasse vorgesehenen Dienste und eine Zuständigkeit fest.', 'Überprüfe die Einteilung bei einem Wechsel.'],
  trafficlight: ['Öffne die „Status-Ampel“.', 'Wähle den passenden Ampelstatus für die Unterrichtssituation.', 'Besprich mit der Klasse vorab, was die Farben bedeuten.'],
  noisemeter: ['Öffne den „Lärm-Messer“.', 'Erteile dem Browser bei Bedarf die Mikrofonberechtigung.', 'Stelle die Empfindlichkeit passend zum Raum ein und beende die Messung nach dem Einsatz.'],
  zahlenraum: ['Öffne „Zahlenraum-Studio“.', 'Wähle den Zahlenraum und eine passende Darstellung, etwa Mengenbild oder Zahlenstrahl.', 'Nutze die Ansicht zum Erklären und gemeinsamen Üben.'],
  kopfrechnen: ['Öffne „Kopfrechentrainer“.', 'Wähle die passende Rechenart beziehungsweise Schwierigkeit.', 'Löse Aufgaben gemeinsam oder lass einzelne Kinder rechnen; überprüfe die Rückmeldungen.'],
  fractionvisualizer: ['Öffne „Bruch-Visualisierer“.', 'Wähle Zähler und Nenner beziehungsweise die angebotene Visualisierung.', 'Vergleiche die Bruchteile im Kreis oder Streifen.'],
  vocabulary: ['Öffne „Lernwörter-Studio“.', 'Wähle die Wortliste beziehungsweise eine Übungsform.', 'Übe Stolperstellen, Kartei oder alphabetische Ordnung mit der Klasse.'],
  wortsatzwerkstatt: ['Öffne „Wort- & Satzwerkstatt“.', 'Wähle den gewünschten Bereich für Wörter oder Sätze.', 'Lass die Kinder Bausteine zusammensetzen, zerlegen oder in die richtige Reihenfolge bringen.'],
  image: ['Öffne „Bild & Material“.', 'Wähle die angebotene Bildquelle beziehungsweise lade ein geeignetes Unterrichtsbild.', 'Vergrößere das Widget, wenn Details für die Klasse lesbar sein sollen.'],
  qrcode: ['Öffne „QR-Code“.', 'Trage eine geprüfte Zieladresse ein und erzeuge den Code.', 'Teste den Code vor der Ausgabe und achte darauf, keine internen Zugangsdaten zu teilen.'],
  links: ['Öffne „Link- & Dateispeicher“.', 'Ergänze den gewünschten Link beziehungsweise eine angebotene Verknüpfung.', 'Prüfe das Ziel, bevor du es öffentlich am Smartboard öffnest.'],
  drawing: ['Öffne die Zeichenfläche im Lehrercockpit.', 'Wähle Stift beziehungsweise Textwerkzeug.', 'Bearbeite die Tafel und sichere wichtige Inhalte mit der dafür vorgesehenen Funktion.'],
  scoreboard: ['Öffne „Gruppen-Punkte“.', 'Lege die benötigten Teams und deren Ausgangswerte fest.', 'Passe den Punktestand während des Spiels an.'],
  timeline: ['Öffne „Tages-Zeitstrahl“.', 'Prüfe den Ablauf der Unterrichtsphasen und verfügbare Zeitangaben.', 'Zeige den Zeitstrahl während des Tages für die Klasse an.'],
  sounds: ['Öffne „Musik & Klänge“.', 'Wähle einen angebotenen Klang und passe die Lautstärke an.', 'Stoppe die Wiedergabe nach dem Einsatz.'],
};

export const SETTINGS_HELP: readonly HelpTopic[] = SETTING_GUIDES;
export const PAGE_HELP: readonly HelpTopic[] = [
  ...AVAILABLE_MODULES.map(module => ({
    id: module.id,
    title: module.label,
    area: module.category,
    purpose: module.desc,
    canDo: MODULE_HOWTO[module.id]?.canDo || module.desc,
    steps: MODULE_HOWTO[module.id]?.steps || [
      `Öffne „${module.label}“ über die Seitenleiste oder den zugehörigen Übersichtsbereich.`,
      `Wähle die gewünschte Funktion. ${module.desc}.`,
      'Prüfe anschließend den ausgewählten Zeitraum und die aktive Klasse.',
    ],
  })),
  { id: 'datensicherung', title: 'Datensicherung', area: 'Ausgabe & Daten', purpose: 'Geschützte App-Daten sichern und wiederherstellen.', ...MODULE_HOWTO.datensicherung },
  { id: 'stundenplan', title: 'Mein Stundenplan (Unterstufe)', area: 'Planung', purpose: 'Fachstunden in mehreren Klassen überblicken.', ...MODULE_HOWTO.stundenplan },
];
export const WIDGET_HELP: readonly HelpTopic[] = widgetCatalog.map(widget => ({
  id: widget.id,
  title: widget.title,
  area: widgetSections[widget.group] || 'Unterrichts-Widgets',
  purpose: widget.purpose,
  canDo: widget.purpose,
  steps: widgetSpecificSteps[widget.id] || [
    `Öffne das Lehrercockpit → „Widget hinzufügen“ und wähle „${widget.title}“.`,
    `Nutze die angezeigten Bedienelemente für die Funktion: ${widget.purpose}.`,
    'Vergrößere das Widget bei Bedarf für das Smartboard; schließe es nach dem Unterricht über seine Widget-Steuerung.',
  ],
}));
