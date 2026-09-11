# LehrerAPP: Bedienungspaket 1

Dieses Paket baut auf `fix/data-safety-phase-1` auf und wird separat geprüft. Es ist keine Freigabe für die Veröffentlichung der Anwendung.

## Änderungen

- Navigation: verständliche Bezeichnungen wie Übersicht, Lehrercockpit, Planungsübersicht und KI-Assistent; bestehende Navigationsziele bleiben erhalten.
- Cockpit: startet mit gesperrter Anordnung. Über „Anordnung ändern“ und „Anordnung fertig“ wird das Verschieben und Vergrößern bewusst aktiviert. Fachliche Widget-Einstellungen bleiben auch im Bedienmodus erreichbar.
- Gemeinsamer Widget-Rahmen: größere Kopfzeile und Schaltflächen, besser lesbare Titel, sichtbarer Tastaturfokus. Leeres Cockpit bietet direkte Einstiege zur Widget-Auswahl und zu gespeicherten Anordnungen.
- Wochenplan: Vollbild wird über ein Portal direkt am Dokument dargestellt; animierte Layout-Eltern können den Vollbildbereich dadurch nicht mehr begrenzen. Breite Inhalte bleiben horizontal erreichbar.
- Digitale Tafel: separates Overlay ebenfalls direkt am Dokument; auf kleinen Bildschirmen starten die Werkzeuge eingeklappt.
- Tafelsteuerung: ein gespeichertes `isTafelOpen` wird nicht mehr als Öffnungsauftrag interpretiert. Die Remote-Steuerung und Zeichenübergabe erzeugen explizite, klassenbezogene Aufträge. Cockpit-Einstieg und Klassenwechsel schließen die Tafel.

## Daten und Kompatibilität

Keine Klassen-, Schüler-, Bewertungs- oder Planungsdaten werden migriert oder gelöscht. Bestehende Widget-Anordnungen werden weiter geladen; der Bearbeitungsmodus ist lediglich beim Einstieg gesperrt. Verschlüsselung, Tresor und Backupformat bleiben wie im vorherigen Sicherheitspaket.

`boardSettings.tafelCommand` ist ein optionales zusätzliches Feld (ID, Klasse, Öffnen/Schließen, Zeitpunkt). Aufträge werden nur einmal und nur für die aktive Klasse verarbeitet. Sie müssen nach dem Cockpit-Einstieg erstellt worden und höchstens 30 Sekunden alt sein. Künftig datierte Aufträge mit mehr als 30 Sekunden Vorlauf werden abgelehnt.

Beide Geräte müssen für die neue Tafel-Fernsteuerung aktualisiert sein. Ein älteres Mobilgerät, das nur das gespeicherte Boolean schreibt, kann die neue Tafel nicht öffnen. Abweichende Geräteuhren, verzögerte Synchronisierung und das Aufwachen aus dem Standby können einen Auftrag verwerfen. Diese Grenzen sind vor Veröffentlichung auf zwei Geräten zu prüfen; das Paket ersetzt nicht die noch ausstehende Absicherung des gesamten Synchronisationssystems.

## Prüfung

- 656 automatisierte Tests bestanden, einschließlich vier Tests für neue Tafelaufträge, Wiederholung, Klassenbezug, Alter und Schließen.
- TypeScript-Prüfung und Produktionsbuild erfolgreich.
- Prüfung mit lokal installierten npm-Abhängigkeiten innerhalb der angegebenen Versionsbereiche; kein Nachweis einer Installation exakt aus `bun.lock`.
- Der lokale Vorschau-Server startet. Der verfügbare Browser blockiert den Zugriff mit `ERR_BLOCKED_BY_CLIENT`. Deshalb keine bestätigte visuelle oder durchgängige Browserprüfung.

Vor Freigabe praktisch prüfen:

1. Cockpit leer und mit gespeicherter Anordnung öffnen; Timer bedienen, Einstellungen öffnen, Anordnung bearbeiten und wieder sperren.
2. Wochenplan bei 1366×768, 1920×1080 und Tabletgröße öffnen, Vollbild umschalten, scrollen, Dialoge bedienen und mit Escape verlassen. Beim Portalwechsel können untergeordnete Komponenten neu eingehängt werden; aktive Eingaben und Fokus prüfen.
3. Digitale Tafel öffnen, zeichnen, schließen, Klasse wechseln und Cockpit erneut öffnen: kein automatisches Wiederöffnen; Zeichnungen und Plandaten erhalten.
4. Zwei aktualisierte Geräte koppeln: Tafel öffnen/schließen, Text/Zeichnung übertragen, verzögerte Aufträge und Standby testen.
5. Kleine Widgets, direkte Zeichen-Widgets, Touchbedienung, Tastaturfokus sowie helle und dunkle Darstellung kontrollieren.

## Weitere Entwicklung

Als Nächstes die häufigsten Abläufe im Cockpit vereinfachen (Unterricht starten, Arbeitsauftrag, Timer, Anwesenheit), einzelne Widgets konsistent gestalten und responsive Layouts praktisch prüfen. Danach Tresor-Sessionkomfort und fachbezogene Bewertungsabschnitte gezielt bearbeiten. Aufgabenblatt-Generator und Excel-Unterstützung bleiben eigene, spätere Pakete. Die offenen Sicherheits- und Datenprüfungen aus `phase-1-data-safety.md` gelten weiterhin.

## Überarbeitung: gemeinsame Unterrichtsfläche (11. September)

Die weiße Cockpit-Fläche selbst ist jetzt beschreibbar. `BoardInk.tsx` zeichnet eine SVG-Ebene über den Widgets. Im Zeichenmodus fängt sie Stift-/Maus-/Touch-Eingaben ab; im Bedienmodus lässt sie Eingaben durch, während die Zeichnung sichtbar bleibt. Die Zeichenebene liegt auch über maximierten Widgets. Die Fläche bleibt weiß, unabhängig vom dunklen Rahmen der App.

- Hauptaktionen: Unterrichtshilfe hinzufügen, Anordnung ändern, Schreiben & Zeichnen. Das alte separate Tafel-Fenster ist kein primärer Einstieg mehr.
- Stiftfarbe/-breite, Texteingabe an einer gewählten Position, Radierer für ganze Striche oder Texte, Rückgängig/Wiederholen und bestätigtes Löschen nur der Zeichnung.
- Der leere Einstieg bietet Zeichnen, Timer und Arbeitsauftrag direkt an. Die Widget-Auswahl beginnt mit acht Alltagshilfen; die gesamte Sammlung einschließlich Mathematik bleibt über Kategorien/Suche erreichbar. Größere Karten zeigen lesbare Beschreibungen.
- Zeichnungen liegen klassenbezogen unter `boardSettings.cockpitInkByClass` im bestehenden App-Zustand und durchlaufen dessen Persistenz/Backup-Pfad. Keine zusätzlichen Browser-Klartextschlüssel. Klassenwechsel setzt den Zeichenmodus zurück und zeigt die jeweilige Zeichnung. Alte Snapshots ohne das optionale Feld bleiben lesbar.
- Rückgängig umfasst höchstens 30 lokale Bearbeitungsschritte und wird bei einem extern ersetzten Zeichnungsstand verworfen, um keine importierten oder synchronisierten Daten durch alte Undo-Snapshots zu überschreiben.

### Grenzen dieses Zwischenstands

Bestehende separate Tafelinhalte werden nicht automatisch konvertiert: Zugang über „Weitere Funktionen → Bisherige Tafelinhalte öffnen“. Alte Zeichen-Widgets und deren Daten bleiben erhalten. Die bisherige Remote-Text-/Bildübergabe sowie Vorlagen-, PDF- und erweiterte Tafelwerkzeuge sind noch nicht vollständig in die neue Zeichenebene überführt. Das ist kein vollständiger Ersatz sämtlicher alter Tafel-Funktionen.

Das SVG verwendet ein normiertes 1600×900-Koordinatensystem und skaliert mit der Fläche; wechselnde Seitenverhältnisse können Schrift/Striche verzerren. Striche bleiben auf der Fläche, wenn ein Widget verschoben wird. Radieren entfernt ganze Elemente. Texte sind einzeilig und werden für Änderungen gelöscht und neu eingefügt. Diese Grenzen sowie Stiftpräzision, Handballenerkennung, Touch, sehr große Zeichnungen und Dialog-/Toolbar-Überlagerungen müssen praktisch geprüft werden.

658 Tests bestanden; zwei zusätzliche Regressionen prüfen Klassenwechsel/Reload mit Zeichnungen und alte Snapshots ohne Zeichnung. TypeScript und Produktionsbuild für diesen Stand erfolgreich. Der Browserzugriff war mit ERR_BLOCKED_BY_CLIENT blockiert; weiterhin keine bestätigte visuelle oder End-to-End-Freigabe. Main/Live bleiben unverändert.
