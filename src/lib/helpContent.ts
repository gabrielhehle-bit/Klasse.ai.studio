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
  dashboard: { canDo: "Auf einen Blick sehen, was heute wichtig ist: Unterricht, Termine, Hinweise, offene Punkte und direkte Einstiege in die nächsten Aufgaben.", steps: ["Öffne „Heute“. Oben siehst du den aktuellen Tag; mit den Pfeilen kannst du auch andere Tage beziehungsweise Wochen ansehen.","Prüfe zuerst die heutigen Unterrichtsstunden und Hinweise. Eine Stunde oder Karte kannst du anklicken, wenn du mehr Details brauchst.","Termine und Ereignisse kannst du direkt auf „Heute“ ergänzen; offene Notizen beziehungsweise Denkzettel lassen sich als erledigt markieren.","Über die Schnellaktionen wechselst du zum Beispiel in Wochenplan, Lehrercockpit, Klassenliste oder Druckzentrum.","„Heute“ ist deine Startübersicht. Ausführliche Änderungen machst du anschließend im jeweiligen Fachbereich."] },
  klasse: { canDo: "Alle wichtigen Bereiche rund um die aktive Klasse von einer einzigen Übersichtsseite aus öffnen.", steps: ["Kontrolliere zuerst oben, welche Klasse aktiv ist.","Unter „Kinder & Alltag“ öffnest du Klassenliste, Schülerdossier, Anwesenheit, Sitzplan oder Notizen.","Unter „Organisation & Gemeinschaft“ findest du – je nach Rolle – Klassenkasse, Jahresabschluss, KEL-Gespräche, Wir-Gefühl und Teamteaching.","Klicke einfach die passende Kachel an. Die eigentliche Bearbeitung erfolgt danach im gewählten Bereich.","Wenn eine Kachel fehlt, kann sie rollenbedingt ausgeblendet sein oder unter Einstellungen → Module deaktiviert worden sein."] },
  planung: { canDo: "Den passenden Planungsbereich finden: aktuelle Woche, ganzes Schuljahr, Wochenkontrolle, Materialien oder Vertretung.", steps: ["Öffne „Planung“.","Für die konkrete Unterrichtswoche wählst du „Wochenplan“; für die langfristige Stoffverteilung „Jahresplanung“.","Mit „Wochen-Check“ siehst du schnell, wo in einer Woche noch Themen oder Planungen fehlen.","In der „Materialbibliothek“ sammelst du wiederverwendbare Unterlagen; „Vertretung & Übergabe“ bereitet Unterlagen für eine andere Lehrperson vor.","Die Planung-Startseite selbst ist nur die Übersicht – deine Inhalte speicherst du in den jeweiligen Unterseiten."] },
  leistungen: { canDo: "Den richtigen Bereich für Bewertung, Lernentwicklung, Diagnostik, Beurteilungen und KEL-Gespräche öffnen.", steps: ["Öffne „Leistungen“.","Für Noten, Punkte oder Prozentwerte wählst du „Notenmappe“.","Für Lernziele und Lernentwicklung öffnest du „Lernziele & Portfolio“; für Kompetenzchecks „Diagnostik“.","„Verbale Beurteilung“ hilft bei einem ausführlichen Beurteilungstext, „KEL-Gespräche“ bei Vorbereitung und Dokumentation eines Gesprächs.","Prüfe im geöffneten Bereich immer Klasse, Kind und – falls vorhanden – Fach, bevor du etwas speicherst."] },
  tools: { canDo: "Kleine Zusatzwerkzeuge wie Textanalyse, Stationenbetrieb, Canva und Druckzentrum schnell erreichen.", steps: ["Öffne „Tools“.","Wähle die Kachel für Textanalyse, Stationenbetrieb, Canva oder Druckzentrum.","Das Werkzeug öffnet sich sofort; dort findest du die eigentlichen Eingaben und Aktionen.","Für jedes dieser Werkzeuge gibt es in dieser Hilfe zusätzlich eine eigene Schritt-für-Schritt-Anleitung."] },
  textanalyse: { canDo: "Einen Text lokal auf formale Lesbarkeit und sprachliche Schwierigkeit prüfen.", steps: ["Öffne „Textanalyse“ und füge den Text in das große Textfeld ein.","Die Auswertung erscheint automatisch und zeigt Kennzahlen und Textmerkmale, zum Beispiel Satzlänge, Wortlänge und Lesbarkeitswerte.","Lies darunter die „Prüfpunkte“: Sie helfen dir zu erkennen, welche Stellen möglicherweise zu schwierig oder unübersichtlich sind.","Ändere den Text bei Bedarf und vergleiche die Werte erneut.","Die Kennzahlen sind eine Orientierung. Ob ein Text für ein bestimmtes Kind passt, entscheidest weiterhin du."] },
  cockpit: { canDo: "Eine digitale Unterrichtsfläche mit mehreren Tafelseiten, Stift, Text, Radierer und frei platzierbaren Widgets verwenden.", steps: ["Öffne „Lehrercockpit“. Es erscheint als eigene Vollbild-Unterrichtsfläche.","Oben im Tafelbereich wechselst du zwischen Tafelseiten oder legst mit „+“ eine neue Tafelseite an.","Wähle unten beziehungsweise im Werkzeugbereich „Stift“, „Text“ oder „Radierer“. Beim Stift kannst du Farbe und weitere Zeichenoptionen einstellen.","Klicke auf „Widget hinzufügen“, wähle das gewünschte Unterrichtswerkzeug und öffne es auf der Tafel.","Widgets kannst du verschieben, vergrößern, minimieren oder wieder schließen. Widget-Einstellungen findest du ebenfalls im Menü „Widget hinzufügen“.","Mit dem Schließen-Button des Lehrercockpits kommst du zurück zu „Heute“. Die einzelnen Widget-Anleitungen findest du hier im Reiter „Unterrichts-Widgets“."] },
  'ki-helfer': { canDo: "Pädagogische Fragen stellen und geführte KI-Werkzeuge für Fachwissen, Reflexion, Lernziele, Elternkommunikation, Differenzierung, Leistungsfeedback und Textprüfung verwenden.", steps: ["Öffne „KI-Helfer“ und wähle links den passenden Bereich, zum Beispiel „Pädagogik“, „Fachwissen“ oder „Reflexion“.","In den Chat-Bereichen formulierst du deine Frage direkt. Mit „Neuer Chat“ startest du einen frischen Verlauf.","Für geführte Werkzeuge wie Elternkommunikation, Differenzierung oder Leistungsfeedback öffnest du den entsprechenden Eintrag und füllst die dort angebotenen Felder aus.","Arbeitsblätter, Wochenplanung und Lernwerkstätten erreichst du über die zusätzlichen Schnelllinks im KI-Helfer.","Gib nur Daten ein, die für die Aufgabe wirklich nötig sind, und prüfe jede KI-Ausgabe fachlich, sprachlich und datenschutzrechtlich, bevor du sie verwendest."] },
  lehrerzimmer: { canDo: "Mit Kolleg:innen derselben verifizierten Schule kurze Nachrichten, Beiträge, Fragen und Antworten austauschen.", steps: ["Falls KLASSIO noch keine verifizierte Schule erkennt, folge zuerst den Hinweisen zur Schulverifizierung beziehungsweise melde dich mit deiner Schulmail an.","Für etwas Kurzes nutzt du „Nachricht ans Kollegium“.","Für einen ausführlicheren Eintrag erstellst du einen Beitrag und wählst Kategorie sowie „Beitrag / Information“ oder „Frage ans Kollegium“.","Mit @vorname, @nachname oder dem angezeigten Handle erwähnst du eine Kollegin oder einen Kollegen; KLASSIO zeigt passende Vorschläge.","Antworten schreibst du direkt unter dem Beitrag. Eigene Beiträge und Antworten kannst du bearbeiten beziehungsweise löschen.","Keine unnötigen personenbezogenen Schülerdaten ins schulweite Lehrerzimmer schreiben."] },
  lehrmittel: { canDo: "Den gemeinsamen Lehrmittelbestand der Schule erfassen, finden, ausleihen, zurücknehmen und über QR-Codes schneller öffnen.", steps: ["Falls noch kein Bestand vorhanden ist, starte am einfachsten unter „Import & QR“: Excel/CSV, PDF oder kopierten Text einlesen und die Vorschau kontrollieren.","Unter „Standorte“ legst du Kästen, Räume oder Lagerorte an. Danach können Lehrmittel einem Standort zugeordnet werden.","Unter „Bestand“ suchst du nach Bezeichnung, Inventarnummer, Fach, Standort oder ausleihender Person. Einzelne Lehrmittel kannst du auch manuell anlegen.","Zum Ausleihen öffnest du ein Lehrmittel. Bei „Wer nimmt es mit?“ tippst du zum Beispiel @anna, @muster oder @anna.muster und wählst den Vorschlag aus.","Für Personen ohne KLASSIO-Konto gibst du den Namen ohne @ ein. Unter „Ausleihen“ erledigst du die Rückgabe mit einem Klick.","Unter „Import & QR“ erzeugst beziehungsweise druckst du QR-Codes für Standorte. Zustände wie „Beschädigt“, „Fehlt“ oder „Wartung“ halten die Prüfliste aktuell."] },
  arbeitsblatt: { canDo: "Ein KI-gestütztes Arbeitsblatt erstellen, nachbearbeiten, speichern, kopieren und drucken.", steps: ["Öffne „Arbeitsblatt-Generator“. Wähle entweder eine Schnell-Vorlage oder den einfachen beziehungsweise erweiterten Modus.","Wähle Fach und Aufgabentyp und beschreibe im Themenfeld genau, was geübt werden soll. Im erweiterten Modus kannst du zusätzlich Kinder, Niveau, Interessen und Unterstützungsbedarf festlegen.","Klicke auf „Arbeitsblatt generieren“ und prüfe Aufgaben, Lösung, Sprache und Schwierigkeitsgrad.","Mit „Bearbeiten“ kannst du den erzeugten Inhalt manuell verändern und anschließend übernehmen.","Gib dem Blatt einen sinnvollen Titel und speichere es bei Bedarf in der Mediathek/Materialbibliothek.","Danach kannst du es kopieren oder für den Druck vorbereiten. Vor der Ausgabe immer fachlich kontrollieren."] },
  stationenbetrieb: { canDo: "Eine Lernwerkstatt mit Pflicht- und Kürstationen planen und anschließend den Arbeitsstand jedes Kindes verfolgen.", steps: ["Öffne „Stationenbetrieb“ und lege einen neuen Stationenbetrieb an oder öffne einen vorhandenen Plan.","Wechsle zu „Stationen & Settings“, gib Titel, Datum und Fachbereich an und füge Pflicht- oder Kürstationen hinzu.","Benenn die Stationen und ordne sie bei Bedarf mit den Pfeilen neu.","Wechsle zu „Tracker & Analyse“. Dort markierst du pro Kind und Station, was erledigt ist.","Über die Spaltenaktionen kannst du eine Station für alle abschließen oder zurücksetzen; pro Kind stehen zusätzliche Notizfunktionen zur Verfügung.","Nutze die Matrix als Arbeitsübersicht. Sie ersetzt keine automatische Leistungsbeurteilung."] },
  differenzierung: { canDo: "Aufgaben für unterschiedliche Lernbedürfnisse erzeugen oder feste Gruppen für die Klasse verwalten.", steps: ["Öffne „Differenzierung“ und wähle oben „KI-Differenzierung“ oder „Feste Gruppen“.","Bei „KI-Differenzierung“ beschreibst du Grobthema/Kontext und wählst DaZ, Förderbedarf, Standard oder Begabung.","Klicke auf „Aufgaben generieren“, lies die Ausgabe vollständig durch und passe sie bei Bedarf an.","Den fertigen Text kannst du kopieren beziehungsweise über die angebotene Speicherfunktion weiterverwenden.","Unter „Feste Gruppen“ verwaltest du wiederkehrende Gruppenzuordnungen unabhängig von der KI.","Keine Namen oder identifizierenden Angaben einzelner Kinder in freie KI-Eingaben schreiben."] },
  elternbrief: { canDo: "Aus Thema, Stichpunkten und Tonalität einen Entwurf für Elternbrief, Mitteilungsheft-Eintrag oder E-Mail erstellen.", steps: ["Öffne „Elternbrief“.","Trage bei „Betreff / Thema“ ein, worum es geht, und schreibe unter „Wichtige Inhalte“ alle Daten und Informationen als Stichpunkte hinein.","Wähle eine Tonalität wie höflich, freundlich, direkt, empathisch oder sachlich.","Klicke auf „Entwurf erstellen“ und prüfe Termin, Zahlen, Formulierungen und Vollständigkeit.","Persönliche Namen, Adressen, Telefonnummern oder E-Mail-Adressen ergänzt du erst danach lokal und nicht in der KI-Eingabe.","Den geprüften Entwurf kannst du kopieren oder über die Speicherfunktion weiterverwenden."] },
  schueler: { canDo: "Die Kinder der aktiven Klasse suchen, filtern, Stammdaten bearbeiten, importieren und direkt ins jeweilige Dossier wechseln.", steps: ["Öffne „Klassenliste“ und kontrolliere, dass die richtige Klasse aktiv ist.","Über die Suche findest du Namen oder Schülernummern; Sortierung und Filter helfen bei größeren Klassen.","Wechsle bei Bedarf zwischen Liste, Kacheln und Karte und blende nur die Spalten ein, die du gerade brauchst.","Klicke auf den Namen beziehungsweise das Dossier-Symbol, um das vollständige Schülerdossier zu öffnen. Über „Bearbeiten“ änderst du Basisdaten, Pädagogik sowie Kontakte/Freigaben.","Mit „Klassenliste importieren“ übernimmst du eine vorhandene Liste. Kontrolliere danach unbedingt, welche Kinder neu angelegt oder aktualisiert wurden.","DaZ-, SPF- und andere sensible Angaben nur ändern, wenn die Zuordnung fachlich korrekt ist."] },
  dossier: { canDo: "Alle wichtigen Informationen zu einem Kind in einer zusammenhängenden Schülerakte ansehen und bearbeiten.", steps: ["Öffne „Schülerdossier“, suche das Kind und öffne es.","„Übersicht“ zeigt dir zuerst die zentrale Gesamtschau.","Unter „Lernen & Leistungen“ findest du Leistungsübersicht, Leistungsfeedback, Lernziele & Kompetenzen, Portfolio, Lernziel-Erläuterung, Sprachstand sowie Lesen & Antolin.","Unter „Entwicklung & Diagnostik“ liegen Entwicklungsübersicht, Diagnostik, Förderung, Beobachtungen & Verlauf sowie Entwicklungslisten.","Unter „Stammdaten & Organisation“ findest du Stammdaten, Kontakte & Einwilligungen sowie Finanzen & Organisation. „Berichte & Materialien“ bündelt Berichte, Beurteilungen, Gespräche und individuelle Materialien.","Oben kannst du zum vorherigen/nächsten Kind wechseln, das gesamte Dossier drucken beziehungsweise als PDF ausgeben oder den Fokus-Modus verwenden.","Vor jeder Änderung prüfen: Bin ich beim richtigen Kind und in der richtigen Klasse?"] },
  sitzplan: { canDo: "Den Klassenraum gestalten, Kinder platzieren, Sitzregeln berücksichtigen und mehrere Sitzordnungen speichern.", steps: ["Öffne „Sitzplan & Gruppen“ und kontrolliere die aktive Klasse.","Wechsle in den Bearbeitungsmodus, wähle bei Bedarf eine Raum-Vorlage und platziere Tische beziehungsweise andere Möbel.","Ziehe die Kinder auf die gewünschten Plätze. Mit Raster-Magnetismus kannst du die Anordnung sauber ausrichten.","Unter „Sitzplan-Regeln“ legst du zum Beispiel „Trennen“, „Zusammen“, „Feste Zone“ oder „Fester Platz“ fest.","Wenn du eine automatische neue Sitzordnung erzeugst, prüfe die Vorschau und mögliche Regelkonflikte, bevor du sie übernimmst.","Speichere gute Varianten als benannte Sitzordnung. Für eine reine Smartboard-Anzeige kannst du pädagogische Zusatzangaben ausblenden."] },
  anwesenheit: { canDo: "Anwesenheit, Fehlstunden, Verspätungen und Entschuldigungen für einen Schultag erfassen und kontrollieren.", steps: ["Öffne „Anwesenheit & Befinden“ und kontrolliere oben Klasse und Datum. Die eigentliche Seite erfasst hier die Anwesenheit; das freiwillige Befinden wird über den Check-in „Ich bin da!“ im Lehrercockpit geführt.","Wenn „Standardmäßig anwesend“ aktiviert ist, ist die Anwesenheit nur vorausgewählt. Du musst den Tag trotzdem täglich bestätigen.","Markiere bei einem Kind die tatsächliche Abweichung und ergänze bei Bedarf Entschuldigung, Verspätung oder Notiz.","Für genaue Fehlstunden öffnest du über „Mehr“ die „Stunden-Detailansicht“.","Mit „Nur offene anwesend“ bestätigst du noch offene Stunden, ohne bereits eingetragene Fehlzeiten zu überschreiben.","Zum Schluss klickst du auf „Offene Einträge als anwesend bestätigen“. Unter „Mehr“ findest du außerdem Statistik, Eingabehilfe, Rückgängig und Drucken/PDF."] },
  klassenstundenplan: { canDo: "Den regelmäßigen Wochenstundenplan der aktiven Klasse festlegen, den auch Anwesenheit und andere Klassenbereiche verwenden.", steps: ["Öffne „Klassenstundenplan“ und kontrolliere die aktive Klasse.","Klicke die Zelle des gewünschten Wochentags und der gewünschten Stunde an.","Aktiviere „Unterricht an diesem Tag“, wenn die Stunde stattfinden soll.","Trage bei „Fach / Unterricht“ das Fach ein und klicke auf „Speichern“.","Zum Entfernen einer Stunde öffnest du die Zelle erneut und deaktivierst „Unterricht an diesem Tag“.","Auf dieser Seite werden keine Räume oder ausführlichen Stundenhinweise gepflegt – sie gehört nur zum Stammstundenplan der Klasse."] },
  teamteaching: { canDo: "Eine Klasse sicher mit ausgewählten Kolleg:innen derselben Schule gemeinsam führen und Änderungen synchronisieren.", steps: ["Öffne „Teamteaching / Klassenteam“. Jede beteiligte Person muss mit dem eigenen verifizierten Schulkonto arbeiten.","Wenn die Klasse noch nicht geteilt ist, klicke auf „Gemeinsame Klasse aktivieren“.","Unter „Kolleg:in hinzufügen“ wählst du eine Person aus. Falls noch kein Gerät verfügbar ist, muss diese Person KLASSIO zunächst einmal mit ihrer Schulmail öffnen.","Für Teammitglieder kannst du „Bearbeiten“ oder „Nur ansehen“ festlegen und neu registrierte Geräte ausdrücklich freigeben.","Beachte oben den Synchronisierungsstatus. Bei einem Konflikt zuerst „Neueste Version laden“ beziehungsweise die Vergleichsansicht öffnen – lokale Arbeit wird dabei nicht einfach verworfen.","Beim sicheren Zusammenführen entscheidest du für geänderte Bereiche bewusst zwischen „Meine Fassung“ und „Fassung im Team“.","Entferne Personen oder beende Teamteaching nur bewusst; die lokale Klasse bleibt dabei erhalten."] },
  verhalten: { canDo: "Allgemeine Klassen- und Schülernotizen sowie persönliche To-dos erfassen und später wiederfinden.", steps: ["Öffne „Notizen“ und wähle, ob du eine Notiz oder ein To-do erfassen möchtest.","Für eine Schülernotiz wählst du zuerst das Kind; danach kannst du Kategorie und bei Bedarf Fach/Fachbereich festlegen.","Schreibe die Beobachtung sachlich in das Textfeld und speichere sie. Diktieren und KI-Überarbeitung sind optionale Hilfen.","Unter „Meine To-Do-Liste“ markierst du Aufgaben als erledigt oder öffnest sie wieder.","In der Chronik filterst du nach Kind, Kategorie und Zeitraum oder suchst nach Begriffen.","Gespeicherte Notizen kannst du anheften, bearbeiten oder löschen. Bei KI-Überarbeitung vorher prüfen, ob der Text personenbezogene Daten enthält."] },
  orga: { canDo: "Klassenkasse und organisatorische Listen an einem Ort führen.", steps: ["Öffne „Kasse & Orga“. Die Startseite zeigt zuerst offene Geldsammlungen und wichtige Punkte.","Für eine neue Geldsammlung gibst du Titel, Betrag und optional eine Fälligkeit an. Danach markierst du pro Kind „offen“, Teilbetrag oder „bezahlt“.","Im „Kassenbuch & Journal“ erfasst du zusätzliche Einnahmen und Ausgaben und kontrollierst den tatsächlichen Saldo mit deinen Belegen.","Unter „Ausflüge & Checklisten“ legst du organisatorische Checklisten an.","„Passwörter & Zugänge“ ist für notwendige schulische Zugangsdaten; „Flexible Listen“ erlaubt eigene Spalten wie Text, Zahl, Ja/Nein oder Auswahl.","Abgeschlossene Sammlungen findest du im internen Archiv. Beträge und Zugangsdaten vor dem Löschen besonders sorgfältig prüfen."] },
  elternfotos: { canDo: "Fotoalben für Eltern vorbereiten, wobei die Bilddateien im schulischen Microsoft-365-OneDrive liegen und KLASSIO die Freigabe organisiert.", steps: ["Öffne „Elternfotos“. Falls noch nicht geschehen, verbinde ein schulisches beziehungsweise geschäftliches Microsoft-365-OneDrive.","Lege unter „Fotos vorbereiten“ ein Album an und wähle die Kinder aus, die auf den Bildern erkennbar sind – oder bestätige ausdrücklich, dass keine Kinder erkennbar sind.","Prüfe die angezeigte Fotoerlaubnis. Erst danach lädst du die Bilder direkt in das verbundene OneDrive hoch.","Wenn alle Fotos vollständig hochgeladen sind, erstellst du einen zeitlich begrenzten Elternlink und wählst die gewünschte Laufzeit.","Teile nur den erzeugten Link mit den vorgesehenen Eltern. Die vorbereitete Elternnachricht kannst du kopieren.","Wenn du Fotos oder die Kinderzuordnung eines bereits freigegebenen Albums ändern willst, beende zuerst die bestehende OneDrive-Freigabe.","Beim Löschen unterscheiden: Ein Album aus KLASSIO entfernen lässt OneDrive-Dateien bestehen; ein einzelnes Foto kann ausdrücklich in den OneDrive-Papierkorb verschoben werden."] },
  noten: { canDo: "Leistungen pro Fach als Noten, Punkte oder Prozent dokumentieren, Mitarbeit ergänzen und Auswertungen erstellen.", steps: ["Öffne „Notenmappe“ und wähle oben das Fach. Falls noch kein Fach vorhanden ist, öffnet „Fach hinzufügen“ das Klassen-Setup.","Über „Bewertung“ legst du eine neue Bewertung an. Je nach Art kannst du Bezeichnung, Datum und Höchstpunkte festlegen.","Trage die Ergebnisse in der Tabelle bei den Kindern ein. Welche Skala verwendet wird – Noten, Punkte oder Prozent – hängt von der Fach-Einstellung ab.","Wechsle bei Bedarf zwischen „Leistungen“, „Mitarbeit“ und den weiteren angebotenen Bereichen.","Unter „Gewichtung“ legst du fest, wie verschiedene Bereiche in Berechnungen einfließen. Änderungen dort wirken auf die Auswertungen.","Unter „Mehr“ findest du Notenrechner, Statistik/Notenspiegel, Heatmap und „Export / Drucken“. Die einfache Ansicht ändert nur die Darstellung, nicht die Berechnung."] },
  diagnostik: { canDo: "Einzelchecks und Klassenscreenings durchführen und gespeicherte Ergebnisse aus Sicht eines Kindes oder der ganzen Klasse einordnen.", steps: ["Öffne „Diagnostik“. Die Startseite bietet „Einzelkind“, „Klasse“ und „Verstehen & Fördern“.","Für einen 1:1-Check wählst du „Einzelkind“, suchst das Kind und gehst anschließend über Lernbereich und Kompetenz bis zum passenden Check.","Für ein Klassenscreening wählst du „Klasse“, danach Lernbereich, Kompetenz, Niveau und die teilnehmenden Kinder.","Nach einem Screening siehst du zuerst die Ergebnisvorschau. Speichere erst, wenn die Zuordnung stimmt.","Unter „Verstehen & Fördern“ wechselst du zwischen Kind-Perspektive und Klassen-Perspektive und öffnest bei Bedarf Kompetenz- oder Ergebnisdetails.","„Archiv & bisherige Diagnostik“ führt zu älteren Verfahren und historischen Einträgen.","Diagnostikergebnisse helfen bei Beobachtung und Förderung; sie treffen keine automatische Leistungs- oder Förderentscheidung."] },
  portfolio: { canDo: "Für ein Kind und ein Fach vorhandene Noten/Notizen gemeinsam ansehen und Lernziele nachvollziehbar einschätzen.", steps: ["Öffne „Lernziele & Portfolio“ und wähle oben zuerst das Kind und danach das Fach.","Im Bereich „Noten“ siehst du vorhandene Bewertungen; unter „Notizen“ kannst du eine fachbezogene Notiz ergänzen.","Darunter findest du die Lernziele nach Bereichen. Klicke bei jedem Ziel auf die passende Bewertungsstufe.","Über die Einstellungen kannst du eigene Lernziele hinzufügen und die Bezeichnungen beziehungsweise Diagrammwerte der Bewertungsstufen anpassen.","Die Blumen-/Radarvisualisierung zeigt den dokumentierten Stand. Sie ist eine Lernentwicklungsübersicht und keine automatisch erzeugte Zeugnisnote."] },
  verbal: { canDo: "Aus vorhandenen Fächern und bewusst ausgewählten Beobachtungen einen bearbeitbaren Entwurf für Leistungsfeedback oder eine verbale Beurteilung erstellen.", steps: ["Öffne „Verbale Beurteilung“ und wähle das richtige Kind.","Wähle mindestens ein Fach oder übernimm passende vorhandene Beobachtungen. Du kannst zusätzlich eine konkrete eigene Beobachtung formulieren.","Klicke auf die Schaltfläche zum Formulieren des Feedbacks beziehungsweise der Beurteilung.","Der Text erscheint unter „Entwurf zum Bearbeiten“. Lies ihn vollständig und ändere Formulierungen direkt im Textfeld.","Den geprüften Entwurf kannst du in „Beobachtungen & Verlauf“ des Schülerdossiers speichern oder in die Zwischenablage kopieren.","In freie KI-Eingaben keine unnötigen Namen, Kontaktdaten oder Gesundheitsangaben schreiben."] },
  kel: { canDo: "KEL-Gespräche vorbereiten, Kind- und Lehrperson-Einschätzungen dokumentieren, Ziele vereinbaren und vorhandene Schuldaten für das Gespräch bündeln.", steps: ["Öffne „KEL-Gespräche“. In der Übersicht kannst du ein Kind suchen oder ein vorhandenes Gespräch öffnen.","Für ein neues beziehungsweise zu bearbeitendes Gespräch gehst du im Editor durch vier Schritte: „1. Vorbereitung“, „2. Selbsteinschätzung“, „3. Lehrperson“ und „4. Ziele & Abschluss“.","In der Selbsteinschätzung bewertet das Kind die vorgesehenen Bereiche; im Lehrperson-Schritt ergänzt du deine Einschätzung und Erläuterungen.","Unter „Ziele & Abschluss“ hältst du Lernziele, Sicht der Eltern, gemeinsame Vereinbarungen, nächsten Termin und Unterschriftenstatus fest.","Die visuelle Analyse bündelt unter anderem Leistung, Fehlzeiten, Klassenkasse, Portfolio, Stärken und Förderziele.","Pädagogische Beobachtungs- und Verhaltensnotizen werden dort nur angezeigt, wenn du ausdrücklich „Notizen einblenden“ wählst.","Vor Präsentation oder Ausdruck prüfen, welche Informationen im konkreten Gespräch wirklich gezeigt werden sollen."] },
  planungszentrale: { canDo: "Eine Woche schnell auf Lücken prüfen und bei Bedarf direkt in die eigentliche Planung wechseln.", steps: ["Öffne „Wochen-Check“ und wähle mit den Pfeilen die gewünschte Kalenderwoche.","In der normalen Übersicht zeigt „Was braucht diese Woche noch Aufmerksamkeit?“, welche Stunden noch kein Thema oder keine Planung haben.","Über „Zum Wochenplan“ beziehungsweise eine betroffene Stunde wechselst du in die ausführliche Wochenplanung.","Mit dem Umschalter für die Planungswerkzeuge öffnest du den erweiterten Bereich: Wochenstunden-Gitter, Jahresübersicht, Historie/Parkgarage und optionalen KI-Wocheneinblick.","Im erweiterten Gitter kannst du eine Stunde auch schnell ergänzen; ausführliche Stundenentwürfe und die normale Wochenarbeit bleiben im Wochenplan.","Nutze die Links zu Jahresplanung und Materialbibliothek, wenn dir langfristige Themen oder Material fehlen."] },
  jahresplanung: { canDo: "Themen, Stoff, Termine und Lernziele über die Schulwochen des aktiven Schuljahres verteilen.", steps: ["Öffne „Jahresplanung“. Das Schuljahr kommt aus Einstellungen → Allgemein.","Wähle oben „Themen & Stoff“ oder „Lernziele-Tracker“. Bei „Themen & Stoff“ kannst du zwischen „Tabelle“ und „Monatsübersicht“ wechseln.","In der Tabelle stehen die Fächer als Spalten und die Schulwochen als Zeilen. Klicke die gewünschte Zelle an und trage die Planung ein.","Im Eintrag kannst du – je nach Schulart – normale Themen oder Kennzeichnungen wie Schularbeit, Test/LZK oder Ereignis verwenden.","Unter „Weitere Werkzeuge“ findest du je nach Schulart Themen-Assistent, Lehrplan, Farbschema und Fächer. „Excel importieren“ übernimmt vorhandene Jahrespläne.","Mit „Zum Druckzentrum“ bereitest du einen Ausdruck vor.","Beim Kopieren, Verschieben oder Excel-Import kontrolliere immer die betroffenen Wochen; beim Import besonders „zusammenführen“ gegenüber „überschreiben“."] },
  wochenplanung: { canDo: "Die konkrete Unterrichtswoche planen, Termine und Hausübungen erfassen, einen Kinder-Wochenplan erstellen und die Woche als Klassenbuchansicht kontrollieren.", steps: ["Öffne „Wochenplan“ und wähle oben mit den Pfeilen oder der Wochenwahl die gewünschte Kalenderwoche.","Klicke eine Unterrichtsstunde im Raster an. Im Fenster „Einheit planen“ trägst du Fach, Thema/Lernziel und bei Bedarf ausführlichen Stundenentwurf, Material und weitere angebotene Angaben ein.","Hausübungen gehören nicht in den normalen Stundeneditor: Nutze den separaten HÜ-Button beim jeweiligen Tagesdatum und trage dort Fach, Aufgabe und Fälligkeit ein.","Termine ohne Unterrichtsstunde legst du über „Termin“ im Tageskopf an.","Im Wochenmenü kannst du die letzte Woche kopieren, mit dem Stammplan synchronisieren oder die Woche leeren. Beim Synchronisieren bleiben vorhandene Themen und Hausübungen erhalten.","„Excel importieren“ übernimmt Wochenplan-Daten. „Wochenplan für Kinder erstellen“ erzeugt aus freigegebenen Aufgaben eine kindgerechte Ansicht.","Mit „Wochenplan / Klassenbuch“ wechselst du zur automatisch aus der Planung abgeleiteten Klassenbuch-Wochenansicht."] },
  materialien: { canDo: "Unterrichtsmaterial, Dateien, Links, Stundenentwürfe und KI-Ergebnisse sammeln und später schnell wiederverwenden.", steps: ["Öffne „Materialbibliothek“ und klicke oben auf „Material hinzufügen“.","Wähle, welche Art du anlegen möchtest, und ergänze Titel sowie die dafür vorgesehenen Angaben. Dateien, Links und Textmaterial werden unterschiedlich behandelt.","Ordne Material mit Fach, Stufe, Tags und bei Bedarf einer persönlichen Sammlung ein.","Nutze oben Kategorien, Suche und Filter für Fach, Stufe, Tag oder Sammlung. Zwischen Kachel- und Listenansicht kannst du wechseln.","Öffne ein Material für Details. Je nach Typ kannst du es öffnen/herunterladen, kopieren, bearbeiten, als verwendet markieren oder „In Wochenplan“ übernehmen.","Arbeitsblätter und andere KI-Ergebnisse können direkt aus den jeweiligen Werkzeugen in die Materialbibliothek gespeichert werden.","Beim Sammellöschen vorher prüfen, was markiert ist; gelöschte Verknüpfungen können auch den Wochenplan betreffen."] },
  canva: { canDo: "Canva mit KLASSIO verbinden, neue Designs anlegen, vorhandene Designs öffnen und Ergebnisse wieder in KLASSIO verwenden.", steps: ["Öffne „Canva“. Wenn die Integration für die KLASSIO-Installation noch nicht eingerichtet ist, zeigt die Seite das ausdrücklich an.","Wenn Canva bereit ist, klicke auf „Mit Canva verbinden“ und melde dich in deinem Canva-Konto an.","Für ein neues Design wählst du „A4-Arbeitsblatt“, „Präsentation“, „Whiteboard“ oder „Canva Doc“.","Vorhandene Designs findest du über die Suche. Mit „Bearbeiten“ öffnest du den offiziellen Canva-Editor.","Ein Design kannst du als PDF, PNG, JPG oder PPTX exportieren.","Canva-Bilder kannst du außerdem „Als Cockpit-Hintergrund“, „Als Bild-Widget“ oder „In Materialbibliothek“ übernehmen.","Mit „Trennen“ löst du die Canva-Verbindung wieder."] },
  vertretung: { canDo: "Vertretungsunterlagen für einen Tag, mehrere Tage oder eine Woche vorbereiten, Stundenbilder verwalten und bei Bedarf ein Schulwechsel-Paket erstellen.", steps: ["Öffne „Vertretung & Übergabe“. Im Reiter „Übergabe konfigurieren“ wählst du „Ein Tag“, „Mehrere Tage“ oder „Eine Woche“ und den passenden Zeitraum.","KLASSIO übernimmt vorhandene Unterrichtsstunden. Ergänze pro Stunde bei Bedarf Fach, Thema, Auftrag/Ablauf sowie Material und Hausübung.","Ergänze Tageshinweise und allgemeine Regeln/Rituale. Unter „Vorbereitung und Beilagen“ stellst du die Checkliste und weitere Unterlagen zusammen.","Klicke anschließend auf „Vertretungsunterlagen ansehen & drucken“ und kontrolliere, welche Seiten und sensiblen Angaben wirklich mitgegeben werden sollen.","Im Reiter „Stundenbilder verwalten“ pflegst du wiederverwendbare Stundenbilder.","Wenn du Klassenvorstand bist, steht zusätzlich „Schulwechsel-Paket“ zur Verfügung. Dort wählst du ausdrücklich, welche Daten eines Kindes in das Übergabepaket aufgenommen werden."] },
  klassengemeinschaft: { canDo: "Das Klassenklima mit Check-in, gemeinsamen Zielen, Aktivitäten, Klassenrat und Reflexion begleiten.", steps: ["Öffne „Wir-Gefühl“. Im Reiter „Heute“ siehst du den aktuellen Klassen-Check-in und eine vorgeschlagene Gemeinschaftsaktivität.","Unter „Gemeinsam“ verwaltest du Klassenvereinbarungen, gemeinsame Ziele/Missionen, Murmeln und Reflexionen.","Unter „Klassenrat“ können Lob/Dank, Sorgen, Ideen oder Wünsche für die Agenda gesammelt werden.","Im Reiter „Mehr“ findest du unter anderem Befinden-Verlauf, Verhaltensbeobachtungen und weitere Gemeinschaftsaktivitäten.","Nutze Reflexionen und Murmeln als Gesprächs- und Motivationshilfe für die Gruppe, nicht als versteckte Benotung einzelner Kinder."] },
  jahresbericht: { canDo: "Aus bewusst ausgewählten Schuldaten einen Jahresbericht-Entwurf erstellen, bearbeiten, prüfen, freigeben und drucken.", steps: ["Öffne „Jahresbericht“ und wähle links das richtige Kind.","Folge der Reihenfolge auf der Seite: „1. Daten wählen · 2. Entwurf erstellen · 3. Prüfen & freigeben“.","Lege Tonalität, Aufbau und Perspektive fest. Wähle danach ausdrücklich, welche Datenquellen verwendet werden dürfen – zum Beispiel Fächer, einzelne Beobachtungen, KEL-Ziele, Förderziele oder Portfolioarbeiten.","Klicke auf „Berichtsentwurf erstellen“. KLASSIO fragt vor der KI-Übertragung noch einmal nach.","Lies den Entwurf vollständig, bearbeite den Text manuell oder lasse ihn mit einer eigenen Anweisung überarbeiten.","Markiere einen Bericht erst nach deiner fachlichen Prüfung als freigegeben. Eine neue Generierung setzt die Freigabe zurück und behält die vorherige Fassung.","Der Sammeldruck druckt nur freigegebene Berichte. Ein nicht freigegebener Einzelbericht wird nur nach ausdrücklicher Bestätigung als Entwurf gedruckt."] },
  archiv: { canDo: "Einen schreibgeschützten Stand einer Klasse aufbewahren und frühere Schuljahre später wieder ansehen.", steps: ["Öffne „Archiv“. Für die aktuelle Klasse klickst du auf „Aktuelle Klasse archivieren“.","Die aktive Klasse wird dabei nicht gelöscht oder verändert. Ein bereits vorhandener Archivstand desselben Schuljahres kann über „Archivstand aktualisieren“ erneuert werden.","Suche später nach Klasse oder Schüler:in oder filtere nach Schuljahr.","Mit „Archiv ansehen“ öffnest du den gespeicherten Stand. Archiviert werden pädagogisch relevante Daten wie Schüler:innen, Leistungen, Lernziele, Diagnostik, Beobachtungen, Anwesenheit, KEL und Jahresberichte.","Nicht archiviert werden laufende operative Daten wie Zugangsdaten, Klassenkasse, Sitzplan und aktuelle Unterrichtsplanung.","Das Löschen eines Archivstands entfernt ihn aus dem aktuellen Datenbestand; ältere Sicherungen können frühere Stände weiterhin enthalten."] },
  profil: { canDo: "Dein persönliches KLASSIO-Profil, deinen eigenen Stundenplan, Planungsstatistik und Self-Care-Bereich verwalten.", steps: ["Öffne „Mein Profil & Stundenplan“. Im Reiter „Mein Profil“ siehst du zuerst deine persönliche Profilkarte.","Mit „Profil bearbeiten“ änderst du Profilfoto, Titelbild, angezeigte Angaben, Schule, Motto/Spruch und persönliche Akzentfarbe.","Unter „Mein Stundenplan“ pflegst du deinen persönlichen Wochenplan über mehrere Klassen. Du kannst Unterricht aus einer Klasse übernehmen oder eigene Unterrichts-/Dienst-Einträge ergänzen.","Bei verknüpften Klassenstunden fragt KLASSIO ausdrücklich, ob eine Änderung auch den Klassenstundenplan ändern soll; die Unterrichtsinhalte der Wochenplanung werden dadurch nicht überschrieben.","„Planungsstatistik“ zeigt deine persönliche Planungsübersicht, „Self-Care“ den dafür vorgesehenen persönlichen Bereich.","Diese Profil- und Stundenplandaten sind von den Stammdaten der Schüler:innen getrennt."] },
  drucken: { canDo: "Klassen-, Schüler-, Leistungs-, Planungs- und Organisationsdokumente auswählen, anpassen und drucken oder als PDF speichern.", steps: ["Öffne „Druckzentrum“. Nutze die Suche oder wähle eine Kategorie beziehungsweise eine Schnellkachel wie Klassenliste, Anwesenheit, Notenübersicht oder Wochenplan.","Klicke die gewünschte Vorlage an. Rechts beziehungsweise darunter erscheinen die Optionen dieser Vorlage.","Stelle nur die Felder, Zeiträume und Daten ein, die auf dem Ausdruck wirklich benötigt werden. Bei sensiblen Stammdaten besonders sparsam auswählen.","Passe bei Bedarf globale Druckoptionen wie Schriftgröße, Ränder oder Darstellung an.","Kontrolliere die Vorschau und starte den Druck. „Als PDF speichern“ wählst du anschließend im Druckdialog des Browsers.","Die verfügbaren Vorlagen unterscheiden sich nach Schulart; in der Sekundarstufe ist das Druckzentrum bewusst schlanker."] },
  datensicherung: { canDo: "Zusätzliche verschlüsselte Sicherungen erstellen, optional OneDrive verwenden und einen vorhandenen Datenstand kontrolliert wiederherstellen.", steps: ["Öffne „Datensicherung“. Oben siehst du zuerst, ob der automatische Konto-Sync erfolgreich ist.","Für eine zusätzliche Datei klickst du unter „Jetzt sichern“ auf „Sicherung herunterladen“. Bewahre diese Datei an einem geschützten, getrennten Ort auf.","Für eine Wiederherstellung klickst du auf „Sicherungsdatei auswählen“. KLASSIO prüft die Datei und fragt vor dem Ersetzen des aktuellen Datenstands noch einmal nach.","Die „OneDrive-Sicherung“ ist optional. Wenn sie für die Installation eingerichtet ist, kannst du OneDrive verbinden und „Backup in OneDrive sichern“ beziehungsweise „Backup von OneDrive laden“ verwenden.","Unter „Weitere Optionen“ findest du Speicherinformationen, Schuljahreswechsel, stillgelegte Klassen und weitere Wartungsfunktionen.","Vor Wiederherstellung oder Reset immer genau lesen, welcher Stand ersetzt beziehungsweise gelöscht wird."] },
  stundenplan: { canDo: "Den aus deinen Unterstufenklassen zusammengesetzten Lehrerstundenplan überblicken und zeitliche Überschneidungen erkennen.", steps: ["Öffne „Mein Stundenplan“. KLASSIO zeigt deine Unterrichtsstunden aus allen Unterstufenklassen des aktuellen Schuljahres in einer gemeinsamen Tabelle.","Wenn zwei Klassen zur selben Zeit eingetragen sind, erscheint oben „Zeitliche Überschneidungen prüfen“. KLASSIO überschreibt diese Einträge nicht automatisch.","Klicke eine Unterrichtskarte, um die Schüler:innen der betreffenden Klasse zu öffnen.","Unter „Meine Klassen“ öffnet das Zahnrad den Stundenplan der jeweiligen Klasse; dort bearbeitest du deren Stunden und Fächer.","Mit „Weitere Klasse anlegen“ fügst du eine zusätzliche Unterstufenklasse hinzu.","Dieser Bereich ist die Gesamtübersicht. Den persönlichen, frei ergänzbaren Stundenplan über mehrere Klassen findest du zusätzlich unter „Mein Profil & Stundenplan“ → „Mein Stundenplan“."] },
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
