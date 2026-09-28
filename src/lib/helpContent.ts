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
  { id: 'overview', title: 'Einstellungen – Übersicht', area: 'Einstellungen', purpose: 'Alle persönlichen, schulbezogenen und technischen Einstellungen an einem Ort erreichen.', canDo: 'Zwischen Konto, Allgemein, Darstellung, Modulen, Synchronisierung, Backup, Unterstützung, Sicherheit und Hilfe wechseln und den Einfachmodus umschalten.', steps: ['Öffne „Einstellungen“ in der Seitenleiste.', 'Wähle oben eine Kategorie oder eine Kachel in der Übersicht.', 'Nutze den Einfachmodus, wenn du nur die wichtigsten Optionen sehen möchtest; schalte ihn aus, wenn du alle Details brauchst.', 'Prüfe besonders Import-, Wiederherstellungs- und Löschaktionen, bevor du sie bestätigst.'] },
  { id: 'account', title: 'Konto & Schulmail', area: 'Einstellungen', purpose: 'Deine persönliche Anmeldung, Schulidentität, Gerätesynchronisierung und Wiederherstellung verwalten.', canDo: 'Mit E-Mail-Einmalcode anmelden, Schulmail/Schulzuordnung prüfen, Geräte-Sync kontrollieren, andere Sitzungen abmelden und E-Mail-Recovery für den Datentresor vorbereiten.', steps: ['Öffne Einstellungen → Konto & Schulmail.', 'Melde dich mit deiner E-Mail-Adresse an und prüfe den angezeigten Konto- und Synchronisierungsstatus.', 'Für schulweite Funktionen wie Lehrerzimmer, Lehrmittel oder Teamteaching muss die Schulidentität beziehungsweise Schulmail bestätigt sein.', 'Richte bei entsperrtem Tresor bei Bedarf die Wiederherstellung per E-Mail ein und verwahre dein Tresor-Passwort beziehungsweise deinen Recovery-Code weiterhin sicher.', 'Nutze „Sitzungen und Geräte schützen“, wenn du andere angemeldete Geräte abmelden musst.'] },
  { id: 'general', title: 'Allgemein', area: 'Einstellungen', purpose: 'Grunddaten für Schuljahr, Schule, Ferien und Fächer festlegen.', canDo: 'Schuljahr, Lehrkraft- und Schulname, Bundesland/Ferien, Fachfarben und Fachzuordnung, Klassenglas-Ziel sowie die Einführungstour verwalten.', steps: ['Öffne Einstellungen → Allgemein.', 'Kontrolliere zuerst Schuljahr, Lehrkraftname, Schulname und Bundesland, weil mehrere Ansichten diese Angaben verwenden.', 'Passe anschließend Fächer und Fachfarben an; Änderungen wirken in den zugehörigen Planungs- und Leistungsbereichen.', 'Lege bei Bedarf Zielwert und Symbol des Klassenglases fest.', 'Die Einführungstour kannst du hier erneut starten; die aktuelle Klasse verwaltest du im unteren Bereich separat.'] },
  { id: 'display', title: 'Darstellung & Cockpit', area: 'Einstellungen', purpose: 'KLASSIO an Laptop, Desktop und Smartboard sowie an deine bevorzugte Lesbarkeit anpassen.', canDo: 'Farbschema, eigene Farben, App- und Tafelschrift, Anzeigegröße, weiße Cockpit-Arbeitsfläche und Dashboard-Darstellung einstellen.', steps: ['Öffne Einstellungen → Darstellung.', 'Wähle Farbschema und Schriftart; im erweiterten Modus kannst du einzelne Farben zusätzlich anpassen.', 'Stelle die Anzeigegröße auf Kompakt, Standard oder Groß und prüfe sie auf dem Gerät, auf dem du KLASSIO wirklich verwendest.', 'Passe bei Bedarf die Schrift der digitalen Tafel sowie Cockpit- und Dashboard-Optionen an.', 'Die Inhalte und Positionen von Widgets bearbeitest du anschließend direkt im Lehrercockpit.'] },
  { id: 'modules', title: 'Module & Bereiche', area: 'Einstellungen', purpose: 'Festlegen, welche KLASSIO-Bereiche in deiner Navigation sichtbar sein sollen.', canDo: 'Seiten suchen, ein- oder ausblenden und die Navigation vereinfachen, ohne die Daten dieser Bereiche zu löschen.', steps: ['Öffne Einstellungen → Module.', 'Suche nach dem gewünschten Bereich oder öffne die passende Kategorie.', 'Schalte das Modul ein oder aus; dadurch ändert sich nur seine Sichtbarkeit in der Navigation.', 'Falls dir später eine Seite fehlt, prüfe zuerst hier, ob sie ausgeblendet wurde.'] },
  { id: 'sync', title: 'Smartboard & Synchronisierung', area: 'Einstellungen', purpose: 'Eine verschlüsselte Live-Verbindung zwischen Smartboard und einem zweiten Gerät herstellen.', canDo: 'Dieses Gerät als Smartboard-Host starten oder ein Smartphone beziehungsweise anderes Gerät als Fernbedienung koppeln und die Sitzung wieder trennen.', steps: ['Öffne Einstellungen → Smartboard & Synchronisierung.', 'Am Smartboard wählst du „Dieses Gerät als Smartboard freigeben“ und startest die sichere Sitzung.', 'Am zweiten Gerät scannst du am besten den QR-Code; alternativ gibst du Code beziehungsweise Link und den Sitzungsschlüssel ein.', 'Prüfe den angezeigten Verbindungsstatus und trenne Host oder Fernbedienung nach dem Unterricht wieder.', 'Die Live-Verbindung ist nur für die laufende Sitzung gedacht und ersetzt keine Datensicherung.'] },
  { id: 'backup', title: 'Daten & Backup', area: 'Einstellungen', purpose: 'Den KLASSIO-Datenstand zusätzlich sichern, frühere Stände prüfen und bei Bedarf wiederherstellen.', canDo: 'Verschlüsselte Sicherungsdateien exportieren/importieren, automatische Kontosynchronisierung und Notfallkopien prüfen, lokale Wiederherstellungspunkte und frühere Kontostände öffnen sowie die PWA installieren.', steps: ['Öffne Einstellungen → Daten & Backup und prüfe zuerst, ob dein E-Mail-Konto-Sync aktiv ist.', 'Erstelle zusätzlich eine verschlüsselte Sicherungsdatei und bewahre sie getrennt vom Gerät auf.', 'Vor einem Import oder einer Wiederherstellung prüfst du Quelle, Tresor und den angezeigten Stand; ein Backup mit anderem Tresor darf nicht unbedacht den aktuellen Tresor ersetzen.', 'Nutze lokale Wiederherstellungspunkte oder frühere Kontostände nur bewusst und lade sie bei Unsicherheit zuerst als Datei herunter.', 'Die Installation als App findest du im Abschnitt „Klassio auf dem Gerät installieren (PWA)“.'] },
  { id: 'support', title: 'Unterstützung', area: 'Einstellungen', purpose: 'Informationen zur freiwilligen finanziellen Unterstützung von KLASSIO anzeigen.', canDo: 'Einmalige, monatliche oder jährliche Unterstützungsoptionen sowie die Unterstützer:innen-Informationen aufrufen.', steps: ['Öffne Einstellungen → Unterstützung.', 'Wähle nur dann eine angebotene Unterstützungsoption, wenn du KLASSIO freiwillig unterstützen möchtest.', 'Die regulären KLASSIO-Funktionen hängen nicht von einer Unterstützung ab.'] },
  { id: 'advanced', title: 'Erweitert & Sicherheit', area: 'Einstellungen', purpose: 'Datenschutz, Datentresor, Systemdiagnose und bewusst riskante Wartungsaktionen verwalten.', canDo: 'KI-Pseudonymisierung umschalten, Tresor sperren und Inaktivitätszeit wählen, Browser-/Speicherchecks ausführen sowie Klassen-, Beispiel- oder lokale App-Daten löschen.', steps: ['Öffne Einstellungen → Erweitert & Sicherheit.', 'Lass die Schülernamen-Anonymisierung für KI-Anfragen aktiviert, sofern du keinen ausdrücklich begründeten anderen Arbeitsweg brauchst.', 'Unter Datentresor kannst du die Sitzung sofort sperren und die automatische Inaktivitätssperre einstellen.', 'Bei technischen Problemen führe zuerst Systempflege & Diagnose aus, bevor du Daten löschst.', 'Sichere deinen Datenstand vor Aktionen im Gefahrenbereich und lies genau, ob nur eine Klasse, Beispieldaten oder sämtliche lokalen App-Daten betroffen sind.'] },
  { id: 'hilfe', title: 'Hilfe – KLASSIO-Anleitungen', area: 'Einstellungen', purpose: 'Konkrete Schritt-für-Schritt-Anleitungen für KLASSIO-Seiten, Widgets und Einstellungen nachschlagen.', canDo: 'Zwischen App-Seiten, Unterrichts-Widgets und Einstellungen wechseln, nach Begriffen suchen und die passende Anleitung aufklappen.', steps: ['Öffne Einstellungen → Hilfe.', 'Wähle „App-Seiten & Tools“, „Unterrichts-Widgets“ oder „Einstellungen“.', 'Nutze die Suche, wenn du den Bereich nicht sofort findest.', 'Öffne den Eintrag; unter „Was kann ich damit machen?“ und „So geht’s“ findest du Zweck und konkrete Arbeitsschritte.'] },
];

const MODULE_HOWTO: Record<string, { canDo: string; steps: string[] }> = {
  dashboard: { canDo: 'Den aktuellen Schultag schnell überblicken; je nach Schulart werden heutiger Unterricht und weitere verfügbare Tagesinformationen gebündelt.', steps: ['Öffne „Heute“ nach der Anmeldung.', 'Prüfe Datum, aktive Klasse beziehungsweise deine heutigen Unterrichtsstunden.', 'Öffne einen angezeigten Eintrag oder eine Direktaktion, wenn du in den zugehörigen Bereich wechseln möchtest.', 'Für weitere Funktionen nutzt du die Seitenleiste; „Heute“ ist die Übersicht, nicht der Ort für alle Detailbearbeitungen.'] },
  klasse: { canDo: 'Alle zentralen Werkzeuge für Kinder, Klassenalltag, Organisation und Zusammenarbeit gebündelt öffnen.', steps: ['Wähle zuerst die richtige aktive Klasse.', 'Öffne „Klasse“ und entscheide, ob du zu Klassenliste/Dossier, Anwesenheit, Sitzplan, Notizen oder einem organisatorischen Bereich wechseln möchtest.', 'Einige Organisationsbereiche werden nur angezeigt, wenn du für die Klasse die passende Rolle hast.', 'Die eigentliche Bearbeitung erfolgt im gewählten Unterbereich; die Klasse-Seite selbst ist die zentrale Navigation.'] },
  planung: { canDo: 'Wochenplan, Jahresplanung, Wochen-Check, Materialbibliothek und Vertretung über einen gemeinsamen Einstieg erreichen.', steps: ['Öffne „Planung“.', 'Für konkrete Stunden öffnest du „Wochenplan“; für langfristige Stoffverteilung „Jahresplanung“.', '„Wochen-Check“ hilft beim Überblick, während Materialbibliothek und Vertretung die Vorbereitung ergänzen.', 'Die Planung-Seite selbst speichert keine Unterrichtsinhalte – sie führt dich in den passenden Arbeitsbereich.'] },
  leistungen: { canDo: 'Notenmappe, Lernziele/Portfolio, Diagnostik, verbale Beurteilung und KEL-Gespräche über einen gemeinsamen Einstieg erreichen.', steps: ['Öffne „Leistungen“.', 'Wähle den Arbeitsweg: bewerten, Lernentwicklung dokumentieren, diagnostizieren oder Gespräch/Beurteilung vorbereiten.', 'Prüfe im geöffneten Unterbereich immer aktive Klasse, Kind und gegebenenfalls Fach.', 'Die Leistungen-Seite selbst ist eine Übersicht; Einträge werden in den jeweiligen Modulen vorgenommen.'] },
  tools: { canDo: 'Textanalyse, Stationenbetrieb, Canva und Druckzentrum schnell an einem Ort öffnen.', steps: ['Öffne „Tools“.', 'Wähle Textanalyse, Stationenbetrieb, Canva oder Druckzentrum.', 'Bearbeite die Aufgabe im geöffneten Werkzeug; die Tools-Seite dient nur als gemeinsamer Einstieg.', 'Für Details findest du in dieser Hilfe zusätzlich eine eigene Anleitung zu jedem Werkzeug.'] },
  textanalyse: { canDo: 'Die formale Schwierigkeit eines Textes lokal anhand nachvollziehbarer Kennzahlen untersuchen.', steps: ['Öffne „Textanalyse“ und füge den zu prüfenden Text ein.', 'Lies Kennzahlen wie Flesch DE, Wiener Sachtextformel, Satzlänge, Silben und Wortmerkmale ab.', 'Nutze die angezeigten Prüfpunkte als Orientierung für eine Überarbeitung.', 'Die Kennzahlen beschreiben Textmerkmale und ersetzen keine pädagogische Einschätzung des konkreten Kindes.'] },
  cockpit: { canDo: 'Eine weiße Unterrichtsfläche mit Stift, Text und frei platzierbaren Unterrichts-Widgets am Laptop oder Smartboard verwenden.', steps: ['Öffne „Lehrercockpit“.', 'Nutze Stift beziehungsweise Text direkt auf der weißen Arbeitsfläche.', 'Öffne über „Widget hinzufügen“ das benötigte Werkzeug und verschiebe oder vergrößere es nach Bedarf.', 'Blende nicht benötigte Widgets wieder aus; die genaue Bedienung eines Widgets findest du im Hilfe-Reiter „Unterrichts-Widgets“.'] },
  'ki-helfer': { canDo: 'Zwischen pädagogischer Beratung, Fachwissen, Reflexion, Lernzielanalyse und geführten KI-Werkzeugen für Elternkommunikation, Differenzierung, Leistungsfeedback oder Textprüfung wechseln.', steps: ['Öffne „KI-Helfer“ und wähle links den passenden Bereich.', 'Beschreibe den Auftrag möglichst konkret, aber ohne unnötige personenbezogene Daten.', 'Bei geführten Werkzeugen füllst du die angezeigten Felder aus; in Beratungsbereichen arbeitest du im Chat.', 'Prüfe jede KI-Ausgabe fachlich und datenschutzrechtlich und überarbeite sie vor der Verwendung.'] },
  lehrerzimmer: { canDo: 'Mit verifizierten Kolleg:innen derselben Schule kurze Nachrichten, Beiträge, Fragen und Antworten austauschen und Personen mit @ erwähnen.', steps: ['Verifiziere zuerst deine Schul-E-Mail beziehungsweise Schulidentität.', 'Für eine schnelle Nachricht nutzt du „Nachricht ans Kollegium“; für strukturierte Inhalte erstellst du einen Beitrag mit Kategorie, Art, Titel und Text.', 'Mit @vorname, @nachname oder dem angezeigten Handle kannst du Kolleg:innen erwähnen; Vorschläge helfen bei der Zuordnung.', 'Öffne einen Beitrag für Antworten und lösche beziehungsweise bearbeite nur eigene Inhalte bewusst.', 'Teile im schulweiten Lehrerzimmer keine unnötigen personenbezogenen Schülerdaten.'] },
  lehrmittel: { canDo: 'Den schulweiten Lehrmittelbestand erfassen, vorhandene Listen importieren, Kästen verwalten, Ausleihen dokumentieren und QR-Codes erzeugen.', steps: ['Verifiziere zuerst deine Schul-E-Mail; der Inventarbestand gehört zur Schule und wird mit verifizierten Kolleg:innen derselben Schule geteilt.', 'Wenn bereits Listen vorhanden sind, öffne „Import & QR“ und übernimm Excel, CSV, PDF oder kopierten Text. Prüfe die Vorschau vor dem Import.', 'Lege Kästen, Räume und Lagerorte unter „Standorte“ an oder übernimm vorhandene Bezeichnungen beim Import.', 'Finde Lehrmittel über Bezeichnung, Inventarnummer, Fach, Standort oder den Namen einer ausleihenden Person.', 'Zum Ausleihen öffnest du das Lehrmittel. Bei „Wer nimmt es mit?“ kannst du @vorname, @nachname oder @vorname.nachname tippen und den vorgeschlagenen Kollegen auswählen.', 'Für Personen ohne KLASSIO-Konto gibst du den Namen ohne @ ein.', 'Unter „Ausleihen“ erledigst du Rückgaben mit einem Klick; QR-Codes für Kästen oder einzelne Lehrmittel erzeugt KLASSIO selbst.', 'Markiere beschädigte, fehlende oder zu wartende Lehrmittel über den Zustand, damit „Zu prüfen“ aktuell bleibt.'] },
  arbeitsblatt: { canDo: 'Ein didaktisches Arbeitsblatt aus Thema und gewählten Rahmenbedingungen erzeugen, bearbeiten, speichern, kopieren oder drucken.', steps: ['Öffne „Arbeitsblatt-Generator“ und wähle eine passende Schnellvorlage oder beginne mit einer eigenen Konfiguration.', 'Lege die angebotenen Angaben wie Fach, Schulstufe beziehungsweise Zielgruppe, Thema und zusätzliche Arbeitsanweisungen fest.', 'Erzeuge das Arbeitsblatt und prüfe Aufgaben, Lösungsteil, Sprache und Schwierigkeitsgrad sorgfältig.', 'Passe bei Bedarf Titel oder Inhalt an und speichere das Blatt in der Mediathek/Materialbibliothek.', 'Nutze anschließend Kopieren oder Drucken; ein KI-erzeugtes Blatt sollte vor der Ausgabe immer fachlich kontrolliert werden.'] },
  stationenbetrieb: { canDo: 'Stationenbetriebe anlegen, Stationen ordnen und den Bearbeitungsstand der Kinder samt Beobachtungsnotizen verfolgen.', steps: ['Öffne „Stationenbetrieb“ und lege einen neuen Plan mit Titel an.', 'Erstelle die benötigten Stationen, benenne sie und ordne sie bei Bedarf neu.', 'Wechsle zu „Tracker & Analyse“, um den Fortschritt der Kinder zu markieren.', 'Du kannst Stationen gesammelt abschließen/zurücksetzen und zu einzelnen Kindern Notizen festhalten.', 'Nutze die Fortschrittsanzeige als Arbeitsübersicht und prüfe die Einträge vor einer pädagogischen Bewertung.'] },
  differenzierung: { canDo: 'Entweder KI-gestützte Aufgaben für unterschiedliche Lernbedürfnisse erstellen oder dauerhaft feste Schülergruppen verwalten.', steps: ['Öffne „Differenzierung“ und wähle oben „KI-Differenzierung“ oder „Feste Gruppen“.', 'Für KI-Differenzierung beschreibst du Grobthema/Kontext und wählst DaZ, Förderbedarf, Standard oder Begabung als Zielgruppe.', 'Erzeuge die Aufgaben, prüfe sie fachlich und kopiere beziehungsweise speichere nur die passende Fassung.', 'Unter „Feste Gruppen“ verwaltest du wiederkehrende Gruppenzuordnungen unabhängig von der KI-Funktion.', 'Gib bei KI-Aufträgen keine Namen oder identifizierenden Angaben zu Kindern ein.'] },
  elternbrief: { canDo: 'Aus Thema, Stichpunkten und gewünschter Tonalität einen Entwurf für Elternbrief, Mitteilungsheft-Eintrag oder E-Mail erstellen.', steps: ['Öffne „Elternbrief“ und trage Betreff/Thema sowie die wichtigen Inhalte als Stichpunkte ein.', 'Wähle die gewünschte Tonalität, zum Beispiel freundlich, direkt oder sachlich.', 'Erstelle den Entwurf und prüfe Daten, Formulierungen und Vollständigkeit.', 'Personalisierende Angaben wie Namen, Adressen oder Telefonnummern ergänzt du erst danach lokal; sie sollen nicht in die KI-Eingabe.', 'Kopiere den fertigen Text oder speichere ihn über die angebotene Funktion für die weitere Verwendung.'] },
  schueler: { canDo: 'Kinder der aktiven Klasse suchen, Stammdaten bearbeiten, Klassenlisten importieren und direkt in das jeweilige Schülerdossier wechseln.', steps: ['Öffne „Klassenliste“ und kontrolliere die aktive Klasse.', 'Nutze Suche, Sortierung, Filter oder die angebotenen Listen-/Kartenansichten, um ein Kind zu finden.', 'Öffne ein Kind für Stammdaten beziehungsweise über das Dossier-Symbol für die vollständige Schülerakte.', 'Vorhandene Klassenlisten kannst du importieren; kontrolliere danach besonders Zusammenführungen und die Zuordnung zur aktuellen Klasse.', 'Ändere Förderkennzeichen oder andere sensible Daten nur, wenn sie fachlich und organisatorisch korrekt sind.'] },
  dossier: { canDo: 'Die vollständige Schülerakte eines Kindes mit Lern- und Leistungsdaten, Entwicklung, Diagnostik, Förderung, Beobachtungen, Stammdaten, Kontakten und Organisation öffnen.', steps: ['Öffne „Schülerdossier“, suche das Kind und öffne dessen Dossier.', '„Übersicht“ zeigt die zentrale Gesamtschau des Kindes.', 'Unter „Lernen & Leistungen“ findest du Leistungsübersicht, Leistungsfeedback, Lernziele & Kompetenzen, Portfolio, Lernziel-Erläuterung, Sprachstand sowie Lesen & Antolin.', 'Unter „Entwicklung & Diagnostik“ liegen Entwicklungsübersicht, Diagnostik, Förderung, Beobachtungen & Verlauf sowie Entwicklungslisten.', 'Unter „Stammdaten & Organisation“ verwaltest du Stammdaten, Kontakte & Einwilligungen sowie Finanzen & Organisation; Berichte und Materialien liegen im eigenen Bereich.', 'Prüfe vor jeder Änderung Kind und aktive Klasse und erfasse nur Informationen, die für den konkreten schulischen Zweck erforderlich sind.'] },
  sitzplan: { canDo: 'Raum und Sitzordnung gestalten, Kinder platzieren, Regeln berücksichtigen und unterschiedliche Sitzplanvarianten verwalten.', steps: ['Öffne „Sitzplan & Gruppen“ und kontrolliere die aktive Klasse.', 'Lege Tische beziehungsweise Raumstruktur fest und platziere die Kinder auf den gewünschten Plätzen.', 'Nutze Sitzplan-Regeln für feste Plätze, gewünschte oder zu vermeidende Nachbarschaften und prüfe angezeigte Konflikte.', 'Wenn du automatisch neu verteilst, kontrolliere die Vorschau und übernimm sie erst, wenn sie passt.', 'Speichere sinnvolle Sitzordnungen als Variante; für schnelle zufällige Unterrichtsgruppen kannst du zusätzlich das Gruppen-Widget im Lehrercockpit verwenden.'] },
  anwesenheit: { canDo: 'Anwesenheit pro Schultag und bei Bedarf pro Unterrichtsstunde erfassen, Abwesenheitsgründe dokumentieren und die Tageserfassung abschließen.', steps: ['Öffne „Anwesenheit & Befinden“ und kontrolliere Klasse und Datum.', 'Wenn „Standardmäßig anwesend“ aktiviert ist, ist Anwesenheit nur vorausgewählt – bestätige den Tag trotzdem täglich.', 'Markiere Abweichungen und ergänze bei Bedarf Grund beziehungsweise Notiz; für genaue Fehlstunden wechselst du in die Stunden-Detailansicht.', 'Mit „Nur offene anwesend“ kannst du noch nicht erfasste Stunden gesammelt bestätigen, ohne vorhandene Fehlzeiten zu überschreiben.', 'Schließe die Tagesprüfung ab; über „Mehr“ stehen weitere Ansichten sowie Drucken/PDF-Export zur Verfügung.'] },
  klassenstundenplan: { canDo: 'Festlegen, an welchen Stunden die aktive Klasse Unterricht hat und welches Fach im Stammstundenplan steht.', steps: ['Öffne „Klassenstundenplan“ und kontrolliere die aktive Klasse.', 'Klicke die gewünschte Zelle aus Wochentag und Stunde an.', 'Aktiviere oder deaktiviere „Unterricht an diesem Tag“ und trage bei einer aktiven Stunde das Fach beziehungsweise den Unterricht ein.', 'Speichere die Änderung; sie wird auch von der Anwesenheit und weiteren klassenbezogenen Ansichten verwendet.', 'Räume oder zusätzliche Stundenhinweise werden auf dieser Seite nicht eingetragen.'] },
  teamteaching: { canDo: 'Eine Klasse mit verifizierten Kolleg:innen derselben Schule teilen und gemeinsame Änderungen verschlüsselt synchronisieren.', steps: ['Melde dich mit einer verifizierten Schulmail an und öffne „Teamteaching / Klassenteam“.', 'Aktiviere die Freigabe für die aktuelle Klasse und füge die gewünschte Kollegin beziehungsweise den Kollegen hinzu; deren Gerät muss gegebenenfalls zuerst registriert sein.', 'Beachte den Synchronisierungsstatus und lade bei Bedarf die neueste Teamversion.', 'Bei einem Konflikt bleiben lokale Änderungen erhalten; vergleiche die Fassungen und nutze das sichere Zusammenführen statt eine Version blind zu überschreiben.', 'Entferne Teammitglieder oder Gerätefreigaben wieder, wenn sie die Klasse nicht mehr bearbeiten sollen.'] },
  verhalten: { canDo: 'Klassen- und Schülernotizen sowie persönliche To-dos erfassen, kategorisieren, durchsuchen und in einer Chronik verwalten.', steps: ['Öffne „Notizen“ und entscheide, ob du eine Notiz oder ein To-do erfassen möchtest.', 'Für eine Schülernotiz wählst du das richtige Kind und bei Bedarf Fach/Fachbereich sowie eine passende Kategorie.', 'Speichere sachlich formulierte Beobachtungen; Diktat und KI-Überarbeitung sind optionale Hilfen und müssen kontrolliert werden.', 'Nutze Chronik-Suche, Kategorie- und Zeitraumfilter, um Einträge wiederzufinden.', 'To-dos kannst du als erledigt markieren; Notizen lassen sich anheften, bearbeiten oder löschen.'] },
  orga: { canDo: 'Klassenkasse, Geldsammlungen, Kassenbuch sowie organisatorische Checklisten, Zugangsdaten und flexible Listen verwalten.', steps: ['Öffne „Kasse & Orga“; die Startseite zeigt zuerst offene organisatorische Punkte.', 'Für eine Geldsammlung legst du Titel, Betrag und gegebenenfalls Fälligkeit an und markierst Zahlungen pro Kind als offen, teilweise oder bezahlt.', 'Im Kassenbuch dokumentierst du Einnahmen und Ausgaben und gleichst den Stand mit deinen realen Belegen ab.', 'Über die weiteren Bereiche kannst du Checklisten, geschützte Zugangsdaten und flexible eigene Listen anlegen.', 'Behandle gespeicherte Passwörter besonders sorgfältig und lösche organisatorische Daten nur bewusst.'] },
  elternfotos: { canDo: 'Elternalben in KLASSIO organisieren, die Bilddateien direkt im schulischen Microsoft-365-OneDrive speichern und zeitlich begrenzte Freigabelinks verwalten.', steps: ['Öffne „Elternfotos“ und verbinde ein schulisches beziehungsweise geschäftliches Microsoft-365-OneDrive; ein privates OneDrive wird dafür nicht verwendet.', 'Lege ein Album an und wähle die auf den Bildern vorkommenden Kinder entsprechend der hinterlegten Fotoeinwilligungen aus.', 'Lade die Fotos hoch; die Dateien liegen im verbundenen OneDrive und nicht als großer Bildbestand auf dem KLASSIO-Server.', 'Erstelle erst danach den zeitlich begrenzten Elternlink und teile ihn nur mit den vorgesehenen Empfänger:innen.', 'Wenn du Kinderzuordnung oder Fotos einer bereits freigegebenen Sammlung ändern willst, beende zuerst die bestehende OneDrive-Freigabe, damit kein unkontrollierter Elternlink bestehen bleibt.'] },
  noten: { canDo: 'Bewertungen pro Fach als Noten, Punkte oder Prozent erfassen, Gewichtungen festlegen und Auswertungen beziehungsweise Drucke erzeugen.', steps: ['Öffne „Notenmappe“ und wähle das richtige Fach.', 'Lege über „+ Bewertung“ die benötigte Leistungsart und – falls relevant – Datum, Höchstpunkte oder Bezeichnung fest.', 'Trage die Ergebnisse der Kinder ein und kontrolliere, welche Bewertungsart für das Fach eingestellt ist.', 'Nutze „Gewichtung“ nur bewusst; Änderungen wirken auf die berechneten Übersichten.', 'Unter „Mehr“ findest du unter anderem Notenrechner, Statistik/Notenspiegel und Export/Drucken.'] },
  diagnostik: { canDo: 'Einzelchecks und Klassenscreenings durchführen sowie Ergebnisse aus Kind- oder Klassenperspektive einordnen.', steps: ['Öffne „Diagnostik“ und wähle „Einzelkind“, „Klasse“ oder „Verstehen & Fördern“.', 'Unter „Einzelkind“ wählst du ein Kind und anschließend Lernbereich beziehungsweise Kompetenz für einen kurzen 1:1-Check.', 'Unter „Klasse“ wählst du Lernbereich, Kompetenz, Niveau und die teilnehmenden Kinder; nach dem Screening prüfst du die Vorschau und speicherst erst dann die Ergebnisse.', 'Unter „Verstehen & Fördern“ wechselst du zwischen Kind-Perspektive und Klassen-Perspektive, öffnest Kompetenzdetails und leitest nächste Schritte aus bereits gespeicherten Ergebnissen ab.', '„Archiv & bisherige Diagnostik“ führt zu älteren Verfahren und historischen Einträgen.', 'Diagnostikergebnisse sind eine Grundlage für Förderung und Beobachtung, aber keine automatische Leistungs- oder Förderentscheidung.'] },
  portfolio: { canDo: 'Pro Kind und Fach Noten/Notizen gemeinsam betrachten und Lernziele mit einer eigenen Einschätzung dokumentieren.', steps: ['Öffne „Lernziele & Portfolio“ und wähle Kind sowie Fach.', 'Prüfe im oberen Bereich die vorhandenen Noten und fachbezogenen Notizen und ergänze bei Bedarf eine neue Notiz.', 'Im Lernzielbereich bewertest du einzelne Lernziele mit der angebotenen mehrstufigen Skala.', 'Eigene Lernziele und die Bezeichnungen der Bewertungsstufen kannst du in den angebotenen Einstellungen ergänzen beziehungsweise anpassen.', 'Nutze die Visualisierung als Lernentwicklungsübersicht und nicht als automatische Zeugnisnote.'] },
  verbal: { canDo: 'Aus ausgewählten Fächern und konkreten Beobachtungen einen bearbeitbaren Entwurf für eine verbale Beurteilung erstellen.', steps: ['Öffne „Verbale Beurteilung“ und wähle das richtige Kind.', 'Wähle die Fächer beziehungsweise vorhandenen Beobachtungen, die inhaltlich berücksichtigt werden sollen, oder ergänze konkrete eigene Beobachtungen.', 'Erzeuge den Entwurf und überarbeite ihn im Textfeld, bis er fachlich und sprachlich passt.', 'Speichere den fertigen Text bei Bedarf im Dossier oder kopiere ihn für die weitere Verwendung.', 'Gib in freie KI-Felder keine unnötigen Namen, Kontaktdaten oder Gesundheitsangaben ein.'] },
  kel: { canDo: 'Für ein KEL-Gespräch die vorhandenen Leistungs-, Anwesenheits-, Portfolio-, Förder- und Gesprächsdaten eines Kindes gebündelt vorbereiten.', steps: ['Öffne „KEL-Gespräche“ und wähle das richtige Kind.', 'Prüfe das zusammengestellte Gesprächsdossier mit Leistung, Fehlzeiten, Portfolio und vorhandenen Förder- beziehungsweise KEL-Daten.', 'Pädagogische Beobachtungs- und Verhaltensnotizen werden nur bewusst über „Notizen einblenden“ zugeschaltet.', 'Nutze die vorgesehenen Bereiche für Selbsteinschätzung, Gesprächspunkte, Ziele und Vereinbarungen.', 'Kontrolliere vor Gespräch oder Ausdruck, welche sensiblen Informationen tatsächlich gezeigt werden sollen.'] },
  planungszentrale: { canDo: 'Den Stand einer Unterrichtswoche prüfen, fehlende Themen erkennen und schnell in Wochenplan, Jahresplanung oder Materialien wechseln.', steps: ['Öffne „Wochen-Check“ und kontrolliere die angezeigte Kalenderwoche.', 'Prüfe, welche Stunden bereits ein Thema beziehungsweise eine Planung enthalten und wo noch etwas fehlt.', 'Öffne eine Stunde beziehungsweise den Wochenplan, wenn du die konkrete Unterrichtsplanung bearbeiten willst.', 'Im erweiterten Modus stehen zusätzlich Wochenraster, Jahresübersicht, Historie/Parkgarage und ein optionaler KI-Wocheneinblick zur Verfügung.', 'Der Wochen-Check ist vor allem Kontroll- und Einstiegspunkt; die ausführliche Stundenplanung bleibt im Wochenplan.'] },
  jahresplanung: { canDo: 'Themen, Stoff und Lernziele fachbezogen über die Schulwochen verteilen und den Jahresplan bei Bedarf importieren, kopieren oder verschieben.', steps: ['Öffne „Jahresplanung“. Das aktive Schuljahr kommt aus deinen allgemeinen Einstellungen.', 'Wähle „Themen & Stoff“ oder „Lernziele-Tracker“; im Jahresplan kannst du zusätzlich zwischen Tabelle und Monatsübersicht wechseln.', 'In der Tabelle stehen die Fächer als Spalten: Klicke die gewünschte Kalenderwoche im passenden Fach an und trage Thema beziehungsweise Planung ein.', 'Unter „Weitere Werkzeuge“ findest du – abhängig von Schulart und Konfiguration – Themen-Assistent, Lehrplan, Farbschema und Fächer; außerdem stehen Excel-Import und der Sprung zum Druckzentrum bereit.', 'Nutze Kennzeichnungen wie Schularbeit/Test nur dort, wo sie für deine Schulart sinnvoll sind, und kontrolliere nach Kopieren oder Verschieben immer die betroffenen Wochen.', 'Beim Excel-Import prüfst du besonders sorgfältig, ob vorhandene Planung zusammengeführt oder überschrieben werden soll.'] },
  wochenplanung: { canDo: 'Die konkrete Unterrichtswoche stundenweise planen und Hausübungen getrennt als Tagesaufträge verwalten.', steps: ['Öffne „Wochenplan“ und wähle die gewünschte Kalenderwoche.', 'Klicke eine Unterrichtsstunde an und plane dort Unterrichtsinhalt, Material, Ablauf beziehungsweise die angebotenen Stundenoptionen.', 'Hausübungen gehören nicht in den normalen Stundeneditor: Nutze den separaten HÜ-Button beim jeweiligen Tagesdatum und trage Fach, Aufgabe und Fälligkeit ein.', 'Prüfe anschließend Wochen- oder Tagesansicht; bei Bedarf kannst du Wochen aus Excel importieren oder mit dem Stammplan synchronisieren.', 'Achte beim Synchronisieren darauf: Fächer können an den Stammplan angepasst werden, vorhandene Themen und Hausübungen sollen dabei erhalten bleiben.'] },
  materialien: { canDo: 'Dateien, Links, Unterrichtsentwürfe und weitere Materialien sammeln, kategorisieren, filtern und für spätere Planung wiederfinden.', steps: ['Öffne „Materialbibliothek“ und lege neues Material über die angebotene Hinzufügen-Funktion an.', 'Wähle eine passende Materialart und ergänze Titel sowie die dafür vorgesehenen Angaben.', 'Nutze Kategorien, Fach/Schulstufe, Tags, persönliche Sammlungen und Favoriten, damit Material später wieder auffindbar bleibt.', 'Suche oder filtere nach dem benötigten Material und öffne es für Details beziehungsweise weitere Verwendung.', 'Lösche größere Mengen nur über die bewussten Auswahl-/Sammelaktionen und prüfe vorher, was markiert ist.'] },
  canva: { canDo: 'Canva-Designs aus KLASSIO anlegen beziehungsweise öffnen, im offiziellen Canva-Editor bearbeiten und anschließend exportieren oder in KLASSIO verwenden.', steps: ['Öffne „Canva“ und prüfe, ob die Integration serverseitig eingerichtet ist und dein KLASSIO-Konto angemeldet ist.', 'Verbinde dein Canva-Konto über die angebotene Canva-Anmeldung.', 'Erstelle ein Design oder öffne ein vorhandenes Design; die eigentliche Bearbeitung erfolgt im offiziellen Canva-Editor.', 'Exportiere fertige Designs bei Bedarf als PDF, PNG, JPG oder PPTX.', 'Geeignete Canva-Bilder kannst du außerdem als Cockpit-Hintergrund, Bild-Widget oder Material in die KLASSIO-Materialbibliothek übernehmen.'] },
  vertretung: { canDo: 'Eine Vertretung für einen Tag, mehrere Tage oder eine Woche mit Stundenablauf, Hinweisen, Material und Druckunterlagen vorbereiten.', steps: ['Öffne „Vertretung & Übergabe“ und wähle Einzeltermin, Zeitraum oder Woche.', 'Kontrolliere die aus der Planung übernommenen Stunden und ergänze pro Stunde Fach, Thema, Arbeitsauftrag, Material und gegebenenfalls Hausübung.', 'Ergänze allgemeine Klassenregeln, organisatorische Tageshinweise und die Vorbereitung/Checkliste.', 'Prüfe die weiteren bereitgestellten Unterlagen wie Klassenliste, Sitzplan oder Rückmeldebogen und entferne unnötige sensible Angaben.', 'Erzeuge beziehungsweise drucke erst danach die Unterlagen für die Vertretung.'] },
  klassengemeinschaft: { canDo: 'Klassenklima mit Aktivitäten, gemeinsamen Zielen, Reflexion, Klassenrat und Klassen-Briefkasten begleiten.', steps: ['Öffne „Wir-Gefühl“ und starte im Reiter „Heute“ mit einer passenden Aktivität oder Empfehlung.', 'Unter „Gemeinsam“ kannst du Ziele beziehungsweise Missionen verfolgen, Murmeln sammeln und gemeinsame Reflexionen durchführen.', 'Im „Klassenrat“ nutzt du die vorgesehenen Gesprächs- und Briefkastenfunktionen.', 'Weitere Einstellungen und ergänzende Funktionen findest du unter „Mehr“.', 'Nutze Bewertungen und Reflexionen als Gesprächsanlass für die Klasse, nicht als versteckte Benotung einzelner Kinder.'] },
  jahresbericht: { canDo: 'Aus ausdrücklich ausgewählten schulischen Daten einen Jahresbericht-Entwurf erzeugen, bearbeiten, freigeben und drucken.', steps: ['Öffne „Jahresbericht“ und wähle das richtige Kind.', 'Lege Tonalität, Aufbau und Perspektive fest und wähle bewusst, welche Datenquellen einbezogen werden sollen, zum Beispiel ausgewählte Fächer, Beobachtungen, KEL-Ziele, Förderziele oder Portfolioarbeiten.', 'Erzeuge den KI-Entwurf erst, wenn belegbare Daten ausgewählt sind; Bilddateien aus dem Portfolio werden dabei nicht an die KI gesendet.', 'Überarbeite den Bericht vollständig und markiere ihn erst nach deiner fachlichen Prüfung als freigegeben.', 'Der Sammeldruck druckt nur freigegebene Berichte; Entwürfe dürfen nicht ungeprüft weitergegeben werden.'] },
  archiv: { canDo: 'Schreibgeschützte Klassenstände abgeschlossener Schuljahre erstellen, suchen, ansehen und bei Bedarf löschen.', steps: ['Öffne „Archiv“ und wähle „Aktuelle Klasse archivieren“, wenn du einen vollständigen schreibgeschützten Stand anlegen möchtest; die aktive Klasse bleibt dabei unverändert.', 'Ein bestehender Stand desselben Schuljahres kann bewusst aktualisiert werden.', 'Suche Archivstände nach Klasse oder Kind beziehungsweise filtere nach Schuljahr und öffne „Archiv ansehen“ für Details.', 'Beachte, dass pädagogisch relevante Daten archiviert werden, laufende operative Daten wie Klassenkassa, Sitzplan, Zugangsdaten und Unterrichtsplanung aber bewusst nicht Teil des Archivstands sind.', 'Löschen entfernt den Archivstand aus dem aktuellen Datenbestand; ältere Backups können frühere Stände weiterhin enthalten.'] },
  profil: { canDo: 'Deine persönliche KLASSIO-Profilanzeige, deinen eigenen Stundenplan und deine Planungsstatistik verwalten.', steps: ['Öffne „Mein Profil & Stundenplan“ und bleibe zunächst im Reiter „Mein Profil“.', 'Über „Profil bearbeiten“ kannst du Profil-/Titelbild, angezeigte persönliche Angaben, Schule, Motto/Spruch und Akzentfarbe anpassen.', 'Im Reiter „Mein Stundenplan“ pflegst du deinen persönlichen Lehrerstundenplan über mehrere Klassen.', 'Unter „Planungsstatistik“ findest du die dazugehörige persönliche Planungsübersicht.', 'Diese Profilangaben sind von den Stammdaten einzelner Schüler:innen getrennt.'] },
  drucken: { canDo: 'Die für deine Schulart verfügbaren Druckvorlagen auswählen, anpassen und über den Browser drucken beziehungsweise als PDF speichern.', steps: ['Öffne „Druckzentrum“ und suche nach dem gewünschten Dokument oder wähle eine Kategorie.', 'Öffne die passende Vorlage und stelle die angebotenen Optionen wie Zeitraum, Auswahl oder Darstellung ein.', 'Kontrolliere die Vorschau und blende nur Daten ein, die auf dem Ausdruck wirklich benötigt werden.', 'Starte „Drucken“; „Als PDF speichern“ wählst du anschließend im Druckdialog des Browsers.', 'Die verfügbaren Vorlagen unterscheiden sich je nach Schulart, deshalb können einzelne Drucke in Volksschule und Sekundarstufe unterschiedlich sein.'] },
  datensicherung: { canDo: 'Den Datenstand als verschlüsselte Sicherung exportieren oder eine vorhandene Sicherung kontrolliert wiederherstellen.', steps: ['Öffne „Datensicherung“ beziehungsweise Einstellungen → Daten & Backup.', 'Erstelle eine verschlüsselte Sicherungsdatei und verwahre sie geschützt an einem getrennten Speicherort.', 'Vor einer Wiederherstellung prüfst du Datei, Tresor und den angezeigten Zielstand.', 'Nutze nach einem Import die angebotene Rückgängig-/Notfallkopie, falls du unmittelbar feststellst, dass der falsche Stand übernommen wurde.'] },
  stundenplan: { canDo: 'Den persönlichen Lehrerstundenplan über mehrere Klassen beziehungsweise den Klassenstundenplan der gewählten Schulart anzeigen.', steps: ['Öffne „Mein Stundenplan“ beziehungsweise den angebotenen Stundenplan-Bereich.', 'Prüfe Klasse, Wochentag und Unterrichtszeiten.', 'Bearbeite persönliche Fachstunden im Profil-Stundenplan; den Stammstundenplan einer Klasse änderst du separat im Klassenstundenplan.', 'Achte darauf, persönlichen und klassenbezogenen Stundenplan nicht miteinander zu verwechseln.'] },
  settings: { canDo: 'Persönliche, schulbezogene und technische Einstellungen verwalten und zu jeder Kategorie eine eigene Anleitung öffnen.', steps: ['Öffne „Einstellungen“.', 'Wähle oben die gewünschte Kategorie oder nutze die Übersicht.', 'Im Reiter „Hilfe“ findest du die Schritt-für-Schritt-Anleitungen zu allen aktuellen KLASSIO-Seiten, Widgets und Einstellungsbereichen.'] },
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

export const MISSING_PAGE_HELP_IDS = AVAILABLE_MODULES
  .filter(module => !MODULE_HOWTO[module.id])
  .map(module => module.id);

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
