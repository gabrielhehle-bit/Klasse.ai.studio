# KLASSIO – Source of Truth

> **Aktualisierung 2026-09-19:** `main`-HEAD vor Wiederintegration: `05bf54bae5abbfee1d43ce96431a030a42bcc0ed`. Die offenen PRs #145–159 sind **nicht** Bestandteil von `main`. Der neue Arbeitszweig `reconcile/reintegrate-pr145-159` wird kontrolliert aufgebaut; sein tatsächlicher Umfang, Konflikte, Risiken und Abnahmebedingungen sind in [`docs/KLASSIO_REINTEGRATION_2026-09-19.md`](docs/KLASSIO_REINTEGRATION_2026-09-19.md) dokumentiert. Historische Statusangaben weiter unten nicht als Freigabe für diese 15 PRs lesen. `main` und der Server bleiben bis zur vollständigen Abnahme unverändert.

Stand: 2026-09-16

## Verbindliche Quelle

Die einzige verbindliche Entwicklungsquelle für Klassio ist:

- Repository: `gabrielhehle-bit/Klasse.ai.studio`
- Produktionsbranch: `main`
- letzter vollständig geprüfter und integrierter Produktcode-Stand (PR #108): `071c850a114a2e780774a4fdf8ce0b03575aad2d`; der aktuelle `main`-HEAD ist vor jeder neuen Arbeit zusätzlich live zu prüfen
- neue Arbeit ausschließlich in einem frischen Branch vom aktuellen `main` und anschließend per Pull Request zurück nach `main`

`main` enthält die vollständige integrierte App und ist die einzige Entwicklungsgrundlage. Frühere Reconciliation-, Feature-, Fix- oder ZIP-Stände sind niemals Ausgangspunkt für neue Arbeit.

ZIP-Dateien sind ausschließlich Backup- oder Release-Artefakte. Sie sind niemals Entwicklungsgrundlage. Vor jeder Änderung müssen GitHub-`main`-HEAD, bestehende Branches, offene Pull Requests und diese beiden Projektdateien geprüft werden.

## Aktueller verbindlicher Stand

Die Reconciliation ist abgeschlossen. Aussagen weiter unten zu einem noch ausstehenden Merge von `reconcile/klassio-source-of-truth`, PR #5 oder einem zwingenden Staging-Merge sind historisch und **nicht mehr handlungsleitend**.

Aktuell integriert in `main`:

- produktionskritische Backup-, Konto-, Teamteaching- und Diktatkorrekturen aus PR #100
- E-Mail-Einmalcode-Login innerhalb der laufenden App
- Teamteaching direkt erreichbar
- Stimmnotizen unter `Notizen → Diktieren`
- Schulregister mit exakter Schul-Domain und allen neun österreichischen Bundesländern
- PR #101: Schulverifizierung direkt in `Einstellungen → Konto & Schulmail`, automatische Admin-Benachrichtigung, geschützte Schulverwaltung mit Freigeben/Ablehnen und automatische Aktivierung der Schulidentität nach Freigabe
- bestehende lokale Klassen, Planungen, Noten und Tresordaten werden durch E-Mail-/Schul-Onboarding nicht zurückgesetzt oder neu angelegt
- PR #103: Wochen- und Jahresplanung öffnen deutlich größere Arbeitsflächen; bereits geplante Einheiten zeigen zuerst eine Übersicht und werden erst über `Bearbeiten` geöffnet; Wochenplan → Jahresplan ergänzt nur eine freie KW-/Fach-Zelle und überschreibt niemals bestehende Jahresplan-Inhalte
- PR #106: die Bearbeitungsflächen von Wochenplan und Jahresplan nutzen jetzt nahezu die vollständige Viewport-Breite; die bisherigen Maximalbreiten von 1500 px bzw. 1400 px wurden entfernt, kleine Sicherheitsränder bleiben erhalten
- PR #108: `Notizen → Diktieren` bevorzugt lokale On-Device-Spracherkennung auf unterstützten Chromium-Versionen, fällt sonst auf die Browser-Spracherkennung zurück, prüft Mikrofonrechte vorab und behandelt `network`/Mikrofon-/Sprachpaketfehler ohne den Dialog dauerhaft zu blockieren

Letzter vollständig geprüfter Feature-Commit vor dem Merge von PR #101: `14802453536e9f0a8e9d051f0d3be1b57e57c8df`.

Prüfnachweise für PR #101:

- TypeScript: grün
- automatisierte Tests: **1120 bestanden, 0 fehlgeschlagen**
- Produktions-Build: grün
- bestehender Zwei-Konto-Teamteaching-Chrome-E2E: grün
- neuer realer Chrome-E2E für Schulverifizierung: grün; geprüft wurden E-Mail-Login, vorhandene Klasse vor Verifizierung, Antrag einer unbekannten Schule, Admin-Mail, Admin-Freigabe, automatische Schulidentität und Erhalt der bereits eingerichteten Klasse

Prüfnachweise für PR #103:

- Feature-Branch-HEAD vor Merge: `596946cbff7d3ee1790b8fbd115ecae147b6b9ad`
- TypeScript: grün
- automatisierte Tests: **1130 bestanden, 0 fehlgeschlagen**
- Produktions-Build: grün
- Teamteaching Browser E2E: grün
- School Verification Browser E2E: grün; bereits eingerichtete Klasse bleibt erhalten
- zusätzliche Regressionstests sichern große Planungseditoren, Übersicht → Bearbeiten und Wochenplan → Jahresplan ohne Überschreiben ab
- PR #103 anschließend per Squash in `main` integriert: `46e4044c947d54a2ef914793725f7bbb2dacb1c7`

Prüfnachweise für PR #106:

- Feature-Branch-HEAD vor Merge: `94835b9c19b299fbee4baef54f6027859faf91f7`
- Feature Validation: grün
- TypeScript: grün
- automatisierte Tests: grün
- Produktions-Build und Build-Ausgabe: grün
- Teamteaching Browser E2E: grün
- School Verification Browser E2E: grün
- PR #106 anschließend per Squash in `main` integriert: `311d5bc16d3313749be040e3e8edbb44be30bf15`

Prüfnachweise für PR #108:

- Feature-Branch-HEAD vor Merge: `b5502d662abc9f1084ed3e8d4fc709adb817de0a`
- Feature Validation: grün
- TypeScript: grün
- automatisierte Tests: grün, inklusive neuer Diktier-/Permissions-Regressionstests
- Produktions-Build und Build-Ausgabe: grün
- Teamteaching Browser E2E: grün
- School Verification Browser E2E: grün
- PR #108 anschließend per Squash in `main` integriert: `071c850a114a2e780774a4fdf8ce0b03575aad2d`

## Produktions- und Deploymentstatus

Produktivsystem ist der World4You-Linux-vServer mit Nginx und systemd:

- Domain: `klassio.at`
- Dienst: `klassio.service`
- App: `127.0.0.1:3100`
- Releasebasis: `/srv/klassio/releases/`
- aktiv: `/srv/klassio/current`
- vorherige Version: `/srv/klassio/previous`
- Health: `/api/health`
- SMTP-Login ist in der Produktionsumgebung konfiguriert; Secrets bleiben ausschließlich in der Server-Umgebung und niemals im Repository.

Der in diesem Chat zuletzt bestätigte GitHub-Produktcode-Stand ist PR #108 / `071c850a114a2e780774a4fdf8ce0b03575aad2d`; der aktuelle `main` enthält diesen Produktcode. Ein World4You-Deployment dieses PR-#108-Stands wurde in diesem Chat **nicht serverseitig bestätigt**, weil kein SSH-/World4You-Terminal verbunden ist. Daher darf `klassio.at` bis zur Prüfung von `/srv/klassio/current/KLASSIO_DEPLOYMENT_COMMIT.txt` und `/api/health` nicht als auf PR #108 aktualisiert bezeichnet werden. Für jedes weitere Deployment muss unmittelbar davor der aktuelle GitHub-`main`-HEAD erneut geprüft und der gewünschte Produktcode-Commit commitgebunden ausgerollt werden.

## Historischer Reconciliation-Verlauf – nur Historie

Der frühere Abschlussbranch `fix/reconciliation-finalization` wurde vollständig in den Reconciliation-Branch übernommen. Zusätzlich wurde eine commitgebundene World4You-Release-Pipeline ergänzt. Am 14.09.2026 wurde PR #6 (`fix/cockpit-final-requirements`) in den Reconciliation-Branch integriert. Damit sind die final abgestimmten Lehrercockpit-Anforderungen technisch umgesetzt: freie weiße Fläche ohne Startkarte, gemeinsame Schreib-/Widgetfläche, getrenntes Löschen von Schrift und Zeichnung, verständliche Kategorien, vollständiger 108/108-Widgetkatalog, eigene Favoriten, A/B/C-Schnelllayouts, Archivzugang zu alten Tafelinhalten sowie reaktivierte historische Mathematik-Widgets.

Am 14.09.2026 wurde außerdem PR #7 (`fix/class-student-dossier-final`) integriert. Das Schülerdossier besitzt nun dauerhaft die fünf vereinbarten Hauptbereiche; die alte Einfach/Experte-/Sichtbarkeitslogik wurde aus der Oberfläche entfernt, Detailfunktionen bleiben erhalten und der Semesterwechsel 1/2 wurde repariert.

Danach wurden die produktionsrelevanten Restpunkte direkt auf Folgebranches bereinigt und in den Reconciliation-Branch übernommen: lokaler Kalendertag für Anwesenheit, robuste Geburtsdatums-/Alterslogik und Importnormalisierung, konsistente Geschlechtswerte aus CSV/Excel/Sokrates, Entfernung mitgelieferter Demo-Archiv-/Musterprofildaten aus dem normalen Startzustand, neutrale Lehrerstatistik ohne erfundene Werte, sichtbares Branding vollständig auf Klassio/Klassio Quest, Klassio-Dateinamen für neue Backups sowie bereinigte Morgenaufgaben ohne redaktionelle Platzhalterreste. Die Beispielklasse bleibt ausschließlich als bewusst auswählbarer Demo-Modus erhalten.

Im finalen Reconciliation-Lauf am 14.09.2026 wurden zusätzlich die geprüften PRs #9 bis #13 integriert:
- PR #9: Diagnostikdaten klassenlokal isoliert, strukturierte Ergebnisse an die aktive Klasse gebunden, lokaler Kalendertag abgesichert.
- PR #10: KI-Helfer mit echter Serverstatus-Anzeige, datensparsamem Klassenkontext sowie client- und serverseitiger Datenschutzfreigabe für anonymisierte Bilder.
- PR #11: SetupWizard mit strukturiertem Lehrkraftprofil, dynamischer Schuljahrauswahl und Importen ohne erfundene Schülerdaten.
- PR #12: Dashboard/Heute mit korrekter Schultags-/Anwesenheitslogik, lokalen Tagesdaten und vollständiger Erfassung statt angenommener Anwesenheit.
- PR #13: durchgängiger 10-Stunden-Slot-Vertrag für Setup und Dashboard; für Stunde 9/10 werden keine Uhrzeiten erfunden, sie bleiben frei konfigurierbar.

Anschließend wurden die letzten funktionalen Reste aus historischen Divergenzen selektiv auf frischen Branches vom jeweils aktuellen Reconciliation-HEAD umgesetzt:
- PR #15: neue OneDrive-Sicherungen heißen sichtbar `Klassio_Backup.json`; historische `LehrerAPP_Backup.json`, `LehrerAPP_Backup.lehrerapp` und `Lehrermappe_Backup.json` bleiben lesbar.
- PR #16: Sokrates-PDF-Import mit lokal gebündeltem PDF.js-Worker, PWA-Precache für `.mjs`, robuster geometrischer Tabellenerkennung und quelltreuer Stammdatenübernahme ohne erfundene Werte.
- PR #18: Integrationshärtung für Canva-Popup-Origin/Source, Smartboard-Fragment-Key, serverseitige Sync-Ablaufzeit, HttpOnly-only Access-Session sowie automatisierte Verträge für Canva-Exporte, KEL-PPTX/PDF und PWA-PDF-Worker.
- PR #19: Topbar/Wetter/WLAN ohne erfundene Produktivdaten; fehlende Klasse/Wetter/WLAN-Daten werden transparent als fehlend angezeigt statt plausibel simuliert.
- PR #20: vollständiger Werksreset löscht auch das 30-Tage-Gerätevertrauen; abgelaufene, unvollständige oder fremde Trusted-Device-Einträge werden automatisch bereinigt.
- PR #21: letzte sichtbare LehrerAPP-/Lehrermappe-/AI-Studio-Reste in Excel-Exporten und OneDrive-Hilfe auf Klassio/Server-Umgebungsvariablen umgestellt; interne Legacy-Kennungen bleiben kompatibel.
- PR #23: Navigation vollständig gemacht, ohne die vereinfachte Kernnavigation wieder aufzublähen. `Unterricht` ist jetzt ein eigener Hub; Lehrercockpit, KI-Helfer, Arbeitsblatt-Generator, Stationenbetrieb, Stimm-Notizen, Differenzierung und Elternbrief sind dort gebündelt. Klasse, Planung und Leistungen enthalten zusätzlich die zuvor verstreuten Detailwerkzeuge; das Cockpit kehrt beim Schließen in den Unterrichtsbereich zurück. Eine neue Feature-Branch-CI prüft TypeScript, Tests, Build und PWA-Ausgabe bereits vor der Integration.
- PR #25: Detailseiten erhielten eine feste Navigationshierarchie. Die Topbar zeigt den zugehörigen Hauptbereich und bietet einen direkten Zurückweg zu `Unterricht`, `Klasse`, `Planung` oder `Leistungen`; Backup, Einstellungen, Druckzentrum und Archiv bleiben bewusst ohne künstlichen Elternbereich. Regressionstests sichern diese Zuordnung.
- PR #26: Die Hauptbereiche `Klasse`, `Planung` und `Leistungen` wurden weiter aufgeräumt. Doppelte Schnellnavigation wurde entfernt, Karten sind in sinnvolle Untergruppen gegliedert, Klassenvorstand-Sichtbarkeit bleibt erhalten und alle bisherigen Ziele bleiben erreichbar. Regressionstests sichern Struktur und vollständige Zielmenge.
- PR #30: Die Startseite `Heute` wurde navigationssicher gemacht. Die kompakte Lehreransicht bleibt Standard; tote Legacy-Ziele `einstellungen`, `geldsammlung` und `kalender` wurden auf die realen Bereiche Einstellungen, Organisation und Planung umgestellt. Ein neuer Vertragstest gleicht Dashboard-Ziele gegen das echte App-Routing ab.
- PR #32: Die kompakte `Heute`-Ansicht wurde als tägliche Lehrerstartseite final vereinfacht. Die doppelte Dreifach-Leiste `Vorbereiten · Unterrichten · Abschließen` entfällt; die Informationsfolge ist jetzt `Jetzt → Heute → Wichtig → Schnell`. Unterricht, laufende Stunde, Anwesenheit, Hinweise und offene Punkte bleiben erhalten; Schnellzugriffe führen zu Wochenplan, Notizen und Organisation. Backup bleibt im eigenen Datenbereich, die erweiterte Widgetansicht bleibt vollständig verfügbar. Strukturtests sichern diese reduzierte Startansicht.
- PR #35: Das Lehrercockpit wurde im Modul-für-Modul-Abschluss final gehärtet. Die weiße Schreib-/Zeichen-/Widgetfläche und alle 108 Widgettypen bleiben erhalten; sekundäre Ansichtsaktionen liegen gesammelt unter `Optionen → Ansicht`. Cockpit und Tagesplan verwenden die konfigurierten 1–10 Stunden-Slots und daraus abgeleitete Pausen statt acht fest verdrahteter Zeiten. Ein frischer Zustand erfindet weder Klasse `4c` noch ein sichtbares Klassentier. Der tägliche Cockpit-Sicherungsstatus ist klassenlokal und ein zu frühes Schließen markiert den Tag nicht mehr fälschlich als gespeichert. Regressionstests sichern diese Anforderungen.
- PR #37: Der KI-Helfer wurde im Modul-für-Modul-Abschluss datenschutz- und mehrklassensicher gehärtet. Lernzielkontext wird nur bei aktiviertem Klassenkontext ergänzt und ausschließlich aggregiert übertragen; der alte Namenspfad über `student_lernziele_*` entfällt. KI-Chats sind an die aktive Klasse gebunden, Klassenwechsel schließen den geöffneten Chat, Ein-Klassen-Altbestände bleiben kompatibel. Bildanalyse akzeptiert JPG/PNG/WebP bis 8 MB mit bestehender expliziter Datenschutzbestätigung und zusätzlicher serverseitiger Größenprüfung. Remote-Prompt-Inhalte werden nicht mehr protokolliert; schulspezifische `Oberau-Skala`-Alttexte wurden neutralisiert.
- PR #39: `Notizen & Beobachtungen` wurde im Modul-für-Modul-Abschluss mehrklassensicher und alltagstauglich gehärtet. Chronik, Journal und Verhaltens-Statusverlauf werden vollständig pro Klasse gespeichert und geladen; Undo/Redo sowie Schülerauswahl werden beim Klassenwechsel zurückgesetzt. Alte gemischte Mehrklassen-Daten werden anhand der Schüler-ID wieder der passenden Klasse zugeordnet, allgemeine nicht zuordenbare Journal-Einträge bleiben bei der aktiven Klasse. Der Tages-Reset löscht keine ungespeicherten Schnellnotizen mehr; `Nur Schüler-Notizen` filtert tatsächlich nach verknüpftem Kind und die Suche findet auch Schülernamen. Stimm-Notizen bleiben bewusst ein separates Unterrichtswerkzeug.
- PR #41: Der Bereich `Schüler:innen` wurde im Modul-für-Modul-Abschluss daten- und alltagssicher gehärtet. Beim Löschen eines Kindes werden zugehörige Bewertungen, Anwesenheit, Notizen/Chronik, Statusverlauf, Interaktionen, Diagnostik, Lernziele, Sitzplan- und Organisationsbezüge konsistent entfernt; Kassenbuchungen bleiben für die Bilanz erhalten, werden aber personenbezogen entkoppelt. Klassenwechsel übernehmen kein geöffnetes Dossier oder Interaktionsfenster. CSV-/Excel-/Sokrates-Reimporte erkennen bestehende Kinder anhand stabiler Merkmale und aktualisieren Stammdaten, ohne pädagogische Daten zu überschreiben; Sokrates-Metadaten werden tatsächlich übernommen. Alter und Alterssortierung sind kalendergenau. Die Kartenansicht verwendet lokale Leaflet-Marker und weist transparent darauf hin, dass nur PLZ/Ort an Photon gehen.
- PR #43: Der `Sitzplan` wurde im Modul-für-Modul-Abschluss mehrklassensicher und regelkonsistent gehärtet. Sitzpositionen, Möbel und Sitzplan-Regeln sind vollständig klassenlokal; alte globale Regeln werden anhand der referenzierten Schüler:innen zur richtigen Klasse migriert. Alle vier Regeltypen (`nicht nebeneinander`, `nebeneinander`, `feste Zone`, `fester Platz`) werden zentral geprüft; feste Plätze speichern die konkrete Position, Zonen richten sich nach der realen Entfernung zur Tafel und Sitzplatz-Kollisionen werden erkannt. Würfelvorschau und Planungs-Analyse verwenden dieselbe Regeldefinition, der Optimierer berücksichtigt explizite Regeln und hält Fixplätze fest. Abwesenheiten werden im Sitzplan aus den tatsächlichen Anwesenheitsdaten mit lokalem Kalendertag abgeleitet. Sitzplan-spezifische Auswahl-, Vorschau-, Undo-, Analyse- und Lotto-Zustände werden beim Klassenwechsel zurückgesetzt.
- PR #45: Die `Anwesenheit` wurde im Modul-für-Modul-Abschluss tages-, mehrklassen- und statistikfest gehärtet. Lokale Kalendertage ersetzen verbleibende UTC-Datumswege; Wochenenden und Feiertage werden bei der Datumsnavigation korrekt als schulfrei behandelt. Ohne konfigurierte Unterrichtsstunden erfindet Klassio weder sechs Stunden noch angenommene Anwesenheit. Stundenstatus, Fehlstunden, Entschuldigungsstatus, Notizen und Verspätungen bleiben konsistent; die zuvor nicht mehr erreichbare Verspätungseingabe ist wieder direkt zugänglich. Anwesenheits-Undo und offene Dialoge werden beim Klassenwechsel zurückgesetzt, während Anwesenheits- und Detaildaten selbst klassenlokal bleiben. Fehltage, Semesterstatistiken und Trends beziehen sich nur auf das aktive Schuljahr, verwenden die Bundesland-Semestergrenzen und ISO-Kalenderwochen über Jahreswechsel hinweg.
- PR #47: Die `Notenmappe` wurde im Modul-für-Modul-Abschluss eingabe-, fach- und mehrklassensicher gehärtet. Bewertungswerte außerhalb ihres gültigen Bereichs werden abgewiesen statt still auf Grenzwerte zu verändern; Endnoten akzeptieren nur gültige Werte 1–5 sowie SPF/ESPF. HÜ-Bewertungsmodus, Prozentabzug und Mitarbeitsabzug sind fachbezogen, während alte globale Einstellungen als Legacy-Fallback lesbar bleiben. Mitarbeit-Bewertungsmodus und Schwellenwerte sind klassenlokal und werden bei Legacy-Mehrklassenständen einmalig in alle vorhandenen Klassen übernommen. Offene Notenmappe-Dialoge und lokale Gewichtungsentwürfe werden beim Klassenwechsel verworfen bzw. aus der Zielklasse neu geladen. Die optionale WOPL-Spiegelung Deutsch ↔ Mathematik verhindert semantisch falsche Rohwertübernahmen zwischen unterschiedlichen Bewertungsarten; im Punkte-Modus werden unterschiedliche Höchstpunkte proportional umgerechnet.
- PR #49: `Kassa & Orga` wurde im Modul-für-Modul-Abschluss buchungs-, migrations- und mehrklassensicher gehärtet. Geldbeträge werden centgenau verarbeitet; Überzahlungen werden abgewiesen statt still gekappt, Teilzahlungen und `Alle bezahlt` buchen ausschließlich die tatsächliche Differenz und manuelle Buchungen werden beim Löschen korrekt gegengebucht. Automatisch erzeugte Sammlungsbuchungen bleiben vor versehentlichem Löschen geschützt. Neue Sammlungen und manuelle Buchungen arbeiten stets auf dem aktuellen Klassen-State statt auf einem veralteten UI-Snapshot. Alte `beitrag_pro_kind`-Kassenstände werden zentral auch für inaktive Klassen und Backups migriert. Kasse, Checklisten, flexible Listen und die in Kassa & Orga geführten Klassenlogins sind klassenlokal; alte globale Klassenlogins werden beim Laden einmalig in alle bestehenden Klassen übernommen. Offene Kassa-/Orga-Dialoge und Flexible-Listen-Editoren werden beim Klassenwechsel zurückgesetzt.

PR #53 schloss anschließend die Einzelabnahme der Jahresplanung ab: Mehrfachthemen bleiben in Tabellen-, Monats-, CSV- und Excel-Workflows vollständig erhalten; Excel-`Ergänzen` bewahrt vorhandene Themen und dedupliziert neue, `Überschreiben` ersetzt nur importierte Zellen. Schulstart und Schulwochen berücksichtigen das Bundesland und das tatsächliche Wochenjahr über den Jahreswechsel; unbekannte Excel-Fächer werden nicht still falsch zugeordnet. `Alles 1 Woche verschieben` folgt echten Unterrichtswochen, überspringt Ferien und funktioniert über KW 52/1 hinweg. Leere Zellen bleiben echte leere Zellen. Vollbild, Druck, Lehrplan-Drawer und KI-Vorschläge bleiben erhalten.

PR #55 schloss danach die Einzelabnahme der Wochenplanung ab: Raster, Fortschritt, wichtige Termine, Duplizieren, Schnellplanung und Schüler-Wochenplan arbeiten durchgängig mit 10 Stunden-Slots. Stunde 9/10 erhalten keine erfundenen Standardzeiten; aktuelle Stunde und Excel-Vorlage verwenden die tatsächlich konfigurierten Stundenzeiten. Vorwoche, Wochenwahl und wöchentliche Wiederholung folgen der zentralen bundesland- und jahreswechselrichtigen Schulwochenlogik. Mehrstundenblöcke reichen nie über Slot 10 hinaus, die Mittagspause folgt der Klassenkonfiguration und `Restlicher Tag` spannt nur über die verbleibenden Slots. Der Excel-Import akzeptiert ausschließlich Stunde 1–10 und verwirft ungültige oder fehlende Tages-/Stundenangaben statt Montag/1. Stunde zu erfinden. Der Wochenabschluss verwendet den echten `erledigt`-Status, bleibt mit alten `completed`-Daten kompatibel und zeigt Stunden 1-basiert. Der Schüler-Wochenplan übernimmt auch Aufgaben aus Stunde 9 und 10.

PR #57 schloss anschließend die Einzelabnahme der Materialbibliothek ab: Anlegen, Bearbeiten, Suche, Filter, Gruppierung und Favoriten bleiben erhalten; Dateiimporte werden auf PDF/JPG/PNG/WebP/GIF und zentrale Größenlimits begrenzt, Linkmaterial akzeptiert ausschließlich HTTP/HTTPS und beim Typwechsel werden veraltete Datei-/Linkdaten entfernt. Die PDF-Anzeige verwendet keinen `document.write`-Pfad mehr. Material → Wochenplan arbeitet mit allen 10 Stunden-Slots und der aktuell gewählten KW; beim Löschen, Sammellöschen oder vollständigen Leeren der globalen Bibliothek werden Materialverknüpfungen in den Wochenplänen aller Klassen bereinigt, ohne übrige Unterrichtsdaten anzutasten. Verdeckte Auswahl wird bei Filterwechseln entfernt. KI-Material wird per ID aktualisiert statt doppelt angelegt, Speicherlimits gelten auch für KI-/Arbeitsblatt-/Stundenplan-Speicherwege und Erfolgsmeldungen erscheinen nur nach tatsächlichem Speichern. Der Arbeitsblattgenerator und die Material-KI verwenden die aktive Schulstufe statt fest verdrahteter 4./1. Schulstufe.

PR #59 schloss danach die Einzelabnahme der Übergabemappe ab: Die frühere Stundenbild-Sammlung wird einmalig und verlustfrei in die gemeinsame Materialbibliothek migriert; Material-Stundenentwürfe werden für die Übergabe korrekt auf Fach, Schulstufe, Dauer, Lernziel, benötigte Materialien und Tags normalisiert. Tagesvertretung, Stundenbild-Zuordnung, Detailseiten und Druck arbeiten durchgängig mit 10 Stunden-Slots und den tatsächlich konfigurierten Klassenzeiten; für Stunde 9/10 werden keine Zeiten erfunden. Bearbeiten dedupliziert Material-IDs, bewahrt bestehende Metadaten und respektiert das gemeinsame Speicherlimit, Löschen entfernt Wochenplan-Verknüpfungen klassenübergreifend. Vertretungshinweise sind klassenlokal; temporäre Zuordnungen, Tageshinweise, Schülerauswahl und Checkliste werden beim Klassenwechsel zurückgesetzt. Notfallpunkte starten nicht fälschlich als erledigt, hardcodierte Schulpersonen/-kontakte wurden entfernt und Datumsfelder verwenden lokale Kalendertage. Das Schulwechsel-Paket nutzt klassenlokale Chronikdaten und enthält jetzt tatsächlich die auswählbaren Bausteine Leistungsstand, IKM-Plus und kompetenzorientierte Diagnostik/Förderbedarf. Die Datenschutzansicht pseudonymisiert Namen mit Initialen und blendet Geburtsdatum sowie Religionsbekenntnis aus.

PR #61 schloss anschließend die Einzelabnahme von Statistik & Profile ab: Mitgelieferte Demo-/Fake-Schüler und erfundene Vergleichsklassen wurden entfernt. Noten-, Prozent- und Punktestatistiken werden skalenkorrekt berechnet; Klassen- und Schüler-Leistungsindex verwenden dieselbe nachvollziehbare Grundlage. Elterngespräche, KEL, Portfolio, KI-Zusammenfassungen und Profil-Beobachtungen bleiben klassenlokal; alte Browserdaten werden in den verschlüsselten App-State migriert. Die Planungsstatistik liest die reale Wochen-/Jahresplanstruktur statt Ersatzdaten. Lehrerprofile enthalten keine erfundenen Karrierewerte oder pseudo-offiziellen Urkunden mehr. Frühere LRS-/Dyskalkulie-Risikodiagnosen, angeblich behördliche Förderpläne und ein vorgetäuschter Sitzplatz-Algorithmus wurden durch transparent bezeichnete manuelle Hilfen ersetzt. Regressionstests sichern diese Daten-, Skalen- und Ehrlichkeitsanforderungen.

PR #63 schloss danach die Einzelabnahme der Diagnostik ab: Die neue 1:1- und Klassenscreening-Diagnostik ist strikt an die stabile aktive Klassen-ID gebunden; offene Schüler-/Kompetenzauswahl wird beim Klassenwechsel verworfen und Speichern meldet nur nach tatsächlicher Validierung Erfolg. Doppelte Ergebnis-IDs werden dedupliziert. Erfundenen Klassen-Fallbacks wie `2a` oder `klasse-default` wurden entfernt, Datumswerte verwenden lokale Kalendertage. Automatisch erzeugte Texte bleiben ausdrücklich pädagogische Momentaufnahmen statt Diagnosen oder klinischer Befunde; überzogene Aussagen wie „altersgemäß voll ausgeprägt“, „unauffällig“ oder „dringend“ wurden neutralisiert. Auch der Archiv-/Legacy-Bereich wurde von Fake-Klassen- und KI-„fehlerfrei“-Wording bereinigt; Normwerte dürfen nur aus der jeweiligen Originalauswertung übernommen werden. Regressionstests sichern Klassenisolation, Datumslogik, Speichersicherheit und ehrliche Ergebnisformulierungen.

PR #65 schloss anschließend die Einzelabnahme von Wir-Gefühl ab: Das Modul verwendet für „Wie geht es uns heute?“ ausschließlich die freiwillige 5-Smiley-Befindensabfrage aus dem „Ich bin da!“-Widget im Lehrercockpit; der parallele manuelle Klassen-Stimmungsbarometer mit „motiviert/müde/unruhig/…“ wurde entfernt. Verhaltensnotizen und Statusänderungen werden aus dem zentralen Bereich „Notizen & Beobachtungen“ gespiegelt statt in einem zweiten Tagebuch geführt. Der 14-Tage-Verlauf basiert auf realen Check-in-Daten statt auf erfundenem Klima-Score. Demo-Klassenverträge, Demo-Klassenratseinträge, Demo-Klimadaten und die künstliche Klassen-Energie-/XP-Formel wurden entfernt. Klassenvertrag und Klassenrat sind klassenlokal im verschlüsselten App-State; alte Klartext-Browserdaten werden einmalig migriert und danach entfernt. Verhalten und Wir-Gefühl verwenden denselben lokalen Kalendertag. Klassenrat, Klassenvertrag, Klassenglas/Missionen und Gemeinschaftsaktivitäten bleiben erhalten. Regressionstests sichern die Check-in-Verknüpfung, Verhaltensspiegelung, Klassenisolation und das Entfernen der obsoleten Parallelstrukturen.

PR #67 schloss danach die Einzelabnahme des Jahresberichts ab: Entwürfe und Freigabestatus sind klassenlokal im verschlüsselten App-State; Klassenwechsel verwerfen offene Auswahl-/Bearbeitungszustände. Leistungsdaten werden semesterbezogen aus der echten Notenmappe gelesen, KEL-Daten nach Datum gewählt und Journal-/Notes-Spiegelungen dedupliziert. Diagnosefelder aus Förderprofilen werden nicht automatisch an die KI übertragen; der Prompt enthält keine Klarnamen des Kindes und verbietet erfundene Leistungen, Diagnosen, Ereignisse oder Förderbedarfe. Badges sind nur optional und standardmäßig aus. Leere KI-Antworten werden nicht gespeichert; Neu-Generierung, KI-Feinschliff und manuelle Bearbeitung setzen den Freigabestatus wieder auf offen. Die künstliche Kompetenz-Scorecard mit willkürlichen Prozentwerten wurde durch eine transparente Datenbasis aus realen Leistungs-, KEL- und Beobachtungsdaten ersetzt. Der Druck behauptet keine Amtlichkeit, lädt keine externen Google Fonts, escaped Berichtsinhalte und verwendet `srcdoc` statt `document.write`; Sammeldruck umfasst nur freigegebene Berichte.

PR #69 schloss danach die Einzelabnahme des Archivs ab: Das frühere flache Schüler-Statistikarchiv wurde durch schreibgeschützte Klassen-Jahresstände ersetzt. Archivieren kopiert die aktive Klasse, verändert oder löscht sie aber nicht. Neue Archivstände enthalten pädagogisch relevante Schüler-, Leistungs-, Lernziel-, Diagnostik-, Beobachtungs-, Anwesenheits-, KEL- und Jahresberichtsdaten; unnötige Identitäts-/Kontaktdaten wie SV-Nummer, Adresse, Elternkontakte und Foto sowie operative Daten wie Zugangsdaten, Klassenkassa, Sitzplan und laufende Jahres-/Wochenplanung werden bewusst nicht übernommen. Die Detailansicht zeigt nur tatsächlich gespeicherte Endnoten und berechnet keine nachträglichen Durchschnittswerte. Alte `historicalStudents` bleiben klar als Legacy-Zusammenfassung getrennt. Zusätzlich wurde die frühere Doppelbelegung von `archivedClasses` in Backup aufgehoben: `retiredClasses` enthält nun stillgelegte, vollständig wiederherstellbare Live-Klassen; alte Vollklassen aus `archivedClasses` werden beim Laden verlustfrei dorthin migriert. Mindestens eine aktive Klasse muss beim Stilllegen erhalten bleiben.

PR #71 schloss danach die Einzelabnahme des Druckzentrums ab: Druckkopf und Vorlagen behaupten keine amtliche Gültigkeit oder pauschale Rechtsgrundlage mehr und erfinden weder Klasse noch Schuldaten. Personenbezogene Druckauswahlen werden beim Klassenwechsel auf die aktive Klasse zurückgesetzt; ein übergebener Schülerkontext wird nur übernommen, wenn das Kind zur aktiven Klasse gehört. Der frühere pseudo-offizielle SPF-Bescheid wurde durch eine ausdrücklich nicht amtliche pädagogische Förderübersicht ersetzt; Namenskarten und Motivationsurkunden sind klar als nicht amtlich gekennzeichnet. Das Schülerdossier ist datensparsamer: Finanzen, Elternkontakte und KI-Zusammenfassung sind standardmäßig aus, die SV-Nummer wurde aus dem allgemeinen Dossier entfernt. KI-/Profiltexte werden nur aus dem verschlüsselten App-State gelesen, nicht aus alten Klartext-`localStorage`-Caches. Erfundenen Oberau-Fallbacks, pauschale Standarderreichung und automatisch erfundene Lobtexte wurden entfernt. Dossier-, KEL- und Semesterübersichten respektieren die konfigurierte Beurteilungsart Noten/Prozent/Punkte. Der Dossier-Druckpfad verwendet sandboxed `srcdoc` statt `document.write`, und gespeicherter Markdown-Text wird vor HTML-Ausgabe escaped.

PR #73 schloss danach die Einzelabnahme von Datenarchiv / Datensicherung ab: Lokale und OneDrive-Sicherungen synchronisieren vor der Verschlüsselung den aktiven Klassenstand; neue Dateinamen und tägliche Notfallkopien verwenden den lokalen Kalendertag. Die Backup-Erinnerung entspricht nun der sichtbaren 7-Tage-Regel, eine erfolgreiche OneDrive-Sicherung zählt als erledigtes Backup und die Speicheranzeige verwendet die tatsächliche Browser-Speicherschätzung statt eines fiktiven 5-MB-Limits. Beide vollständigen Werksreset-Pfade löschen Gerätevertrauen, App-Daten, Browser-/Sitzungsspeicher und erst zuletzt die separaten Tresor-Metadaten; Fehler brechen den Reset ab statt einen falschen Erfolgs-Reload auszulösen. Die Einstellungen lesen den echten `savedAt`-Zeitpunkt der verschlüsselten Notfallkopie. OneDrive-/Datenschutztexte behaupten keine ungeprüfte TLS-Version, MFA-Konfiguration oder Löschung einer Cloud-Sicherung durch den lokalen Werksreset. Die bestehende verschlüsselte Pre-Import-Rücksicherung sowie Legacy-JSON/JS-Wrapper-, Passwort- und Recovery-Kompatibilität bleiben erhalten.

PR #75 schloss danach die Einzelabnahme der Einstellungen ab: Das aktuelle Schuljahr wird dynamisch bestimmt und historische Schuljahre aus importierten Klassen bleiben auswählbar; der Ferienbereich kennzeichnet schulautonome bzw. kurzfristige freie Tage ausdrücklich als separat zu ergänzen. Die Modulverwaltung verwendet einen gemeinsamen Katalog und deckt alle tatsächlich ausblendbaren Sidebar-Bereiche ab. Drei alte, wirkungslose Whiteboard-/Laser-/Verhaltens-Schalter wurden entfernt; die Darstellung verweist stattdessen auf die reale weiße Schreib-/Zeichen-/Widgetfläche im Lehrercockpit. Speicherdiagnose und Anzeige verwenden die Browser-Quote statt fiktiver 4/5-MB-Grenzen. Offline- und Werksreset-Texte wurden präzisiert; Cloud-Sicherungen werden vom lokalen Werksreset ausdrücklich nicht als gelöscht dargestellt. Der Einfachmodus zeigt seinen tatsächlichen Zustand.

Die historischen divergierenden Branches `audit/production-demo-data`, `audit/visible-legacy-branding`, `audit/visible-legacy-branding-final`, `fix/klassio-visible-branding`, `fix/json-backups-and-critical-data-flows` und `feature/final-app-polish` wurden anschließend gezielt gegen den aktuellen Reconciliation-Stand geprüft. Ihre noch eigenen Commits enthalten entweder nur temporäre Audit-/CI-Workflows oder ältere Varianten von Funktionen, die im aktuellen Stand bereits gleichwertig oder neuer umgesetzt sind. Sie werden deshalb **nicht** in den Produktstand gemergt.

Der historische Branch `feature/final-app-polish` wird nicht gemergt und ist keine Arbeitsgrundlage. Seine relevanten funktionalen Lücken wurden selektiv auf frischen Branches vom jeweils aktuellen Reconciliation-HEAD neu umgesetzt. Verbleibende Unterschiede in Cockpit/BoardInk/Vorlagen stammen aus älteren UI-Varianten und werden nicht über den neueren, bereits getesteten Cockpit-Stand aus PR #6 gelegt.

Interne Legacy-Kennungen wie `LehrerAPP_Encrypted_Backup`, `LehrerAPP|EncryptedPayload|v1`, bestehende Storage-Namen und `gabic*`-Schlüssel bleiben absichtlich unverändert, soweit sie Daten-/Backup-Kompatibilität sichern. Sie sind keine sichtbaren Produktnamen.

Der aktuelle codehaltige Reconciliation-Stand liegt nach PR #81 auf Commit `c3785ab2bbcbc0c6e42bf46e6eb5d806f2001a67` und wurde vollständig geprüft:

- Pre-Deployment Audit #144: erfolgreich
- Feature Validation #659: erfolgreich
- TypeScript: erfolgreich
- Tests: 1010/1010 erfolgreich
- Production Build: erfolgreich
- PWA-/Build-Ausgabe: erfolgreich
- Production-Server- und `/api/health`-Smoke: erfolgreich
- Zugangscode-/Session-/E-Mail-Fallback-Smoke: erfolgreich
- World4You-Artefakt: `klassio-world4you-c3785ab2bbcbc0c6e42bf46e6eb5d806f2001a67`

PR #81 schloss eine historisch belegte Backup-Migrationslücke: ältere Mehrklassenstände, die ihre Klassen unter `klassen` statt `classes` gespeichert haben, werden jetzt verlustfrei ins aktuelle Mehrklassenmodell übernommen. Ein nichtleeres aktuelles `classes`-Array hat weiterhin Vorrang; ein leeres `classes` verdrängt echte historische `klassen` nicht mehr. JSON, BOM, einfache historische JS-Wrapper, verschlüsselte Backups sowie Passwort-/Recovery-Restore bleiben unterstützt. Synthetische Roundtrip-Tests sichern zwei getrennte Klassen inklusive Schüler:innen, Noten, Bewertungsmetadaten/Gewichtungen, Jahres-/Wochenplanung, Anwesenheit, Sitzplan und Diagnostik über Migration, Verschlüsselung und erneuten Restore. Ein echter persönlicher Altbestand bleibt zusätzlich Teil der späteren Staging-Abnahme.

Der aktuelle Branch-HEAD kann danach reine Dokumentationscommits enthalten. Deshalb wird der verbindliche Reconciliation-HEAD **nicht dauerhaft in dieser Datei festgeschrieben**, sondern vor jeder Arbeit live aus GitHub gelesen und mit seinem neuesten erfolgreichen `Pre-Deployment Audit` abgeglichen.

Nach jeder Dokumentations- oder Codeänderung ist ausschließlich der **neue** GitHub-HEAD verbindlich; dessen `Pre-Deployment Audit` muss erneut grün sein. Dieser Audit umfasst TypeScript, vollständige Testsuite, Production-Build, PWA-Ausgabe, Production-Server-Smoke, Zugangscode-/Session-Smoke und die Erzeugung des commitgebundenen World4You-Artefakts. Das Deployment-ZIP enthält `KLASSIO_DEPLOYMENT_COMMIT.txt` und `KLASSIO_DEPLOYMENT_BRANCH.txt`.

## Enthaltener Funktionsstand

Der Reconciliation-Stand enthält unter anderem:

- vereinfachte Kernnavigation mit `Heute`, `Klasse`, `Notizen`, `Planung`, `Leistungen` und `Unterricht`. `Notizen` ist ein direkter Hauptbereich und öffnet sofort die zentrale Erfassung für allgemeine Klassen- oder kindbezogene Notizen mit Kategorie, Suche und Chronik; die frühere Interaktionsaktion ist aus der Klassenliste entfernt. Der Unterricht-Hub bündelt Lehrercockpit, KI-Helfer, Arbeitsblatt-Generator, Stationenbetrieb, Stimm-Notizen, Differenzierung und Elternbrief. Die übrigen Bestandswerkzeuge sind ihren fachlichen Hubs oder `Mehr` zugeordnet, statt unsichtbar zu bleiben. Detailseiten zeigen zusätzlich ihren Hauptbereich und bieten einen eindeutigen Rückweg dorthin.
- Lehrercockpit mit bewusst leerer weißer Smartboard-Fläche ohne Startkarte; Klassio stellt darauf Widgets bereit, während Schreiben/Zeichnen die Smartboard-Werkzeuge übernehmen. 108/108 erhaltene Widgets sind über Suche/Kategorien erreichbar, Favoriten bleiben benutzerdefiniert; sekundäre Ansichtssteuerung ist unter `Optionen → Ansicht` gebündelt, Stunden/Pausen folgen den konfigurierten 1–10 Slots und der tägliche Sicherungsstatus ist klassenlokal
- Dashboard/Heute mit ehrlicher Anwesenheitslogik und kompakter Lehrerstartseite: keine angenommene Präsenz, keine Pflicht an freien Tagen, „geprüft“ erst nach vollständiger Stunden-Erfassung; Standardansicht folgt `Jetzt → Heute → Wichtig → Schnell`, erweiterte Widgets bleiben optional erreichbar
- KI-Helfer mit serverseitiger Verfügbarkeitsprüfung, datensparsamem optionalem Klassenkontext, ausschließlich aggregiertem Lernzielkontext ohne automatisch übermittelte Schülernamen, klassenlokalen Chatverläufen sowie expliziter Bild-Datenschutzfreigabe; JPG/PNG/WebP sind auf 8 MB begrenzt
- Notizen & Beobachtungen mit klassenlokaler Chronik, Journal, Schnellnotizen und Statusverlauf; alte gemischte Mehrklassen-Einträge werden beim Laden anhand der Schüler-ID getrennt, Filter/Suche sind auf den Lehreralltag abgestimmt; Stimm-Notizen bleiben separat
- SetupWizard mit strukturiertem Lehrkraftprofil, dynamischen Schuljahren und 10 frei konfigurierbaren Stunden-Slots
- Anwesenheit mit klassenlokalen Stunden- und Detaildaten, lokalem Kalendertag, echten Schultagen, konsistenten Fehlstunden/Entschuldigungen/Verspätungen sowie schuljahresbezogenen Semester- und Trendstatistiken; ohne konfigurierte Stunden werden keine Stunden oder Anwesenheitswerte erfunden
- Befinden und Schülerliste; das Schülerdossier hat fünf feste Hauptbereiche (Übersicht, Lernen & Leistungen, Entwicklung & Diagnostik, Stammdaten & Organisation, Berichte & Materialien) ohne ausblendbare Alt-Navigation; Schülerimporte normalisieren österreichische/ISO-Geburtsdaten und Geschlechtswerte konsistent, Reimporte aktualisieren erkannte Stammdaten ohne pädagogische Daten zu überschreiben, und das Löschen eines Kindes bereinigt die zugehörigen personenbezogenen Klassendaten konsistent
- Sitzplan mit klassenlokalen Positionen, Möbeln und Regeln, vollständiger Regelprüfung für Trennen/Zusammen/feste Zone/festen Platz, tafelorientierter Zonenlogik, regelbewusster Würfelvorschau und Planungs-Analyse sowie echter Abwesenheitsdarstellung aus den Anwesenheitsdaten
- vollständige Notenmappe mit Noten/Prozent/Punkten, Gewichtung, fachbezogenen Bewertungsabschnitten, Schularbeiten, LZK/WOPL und sonstigen Leistungen; ungültige Bereichswerte werden abgewiesen, HÜ-Regeln sind fachbezogen, Mitarbeit-Bewertungsregeln klassenlokal und WOPL-Spiegelung ist bewertungsartsicher
- Antolin-Klassenberichte sind in `Statistik & Profile` über einen direkt sichtbaren Import erreichbar. Unterstützt werden PDF sowie CSV/TXT/TSV und Copy & Paste; vor der KI-Analyse ist eine ausdrückliche Bestätigung nötig, anschließend wird die Zuordnung als Vorschau gezeigt und klassenlokal gespeichert.
- schnelle Mitarbeit- und Hausübungs-Erfassung mit fachbezogenem HÜ-Modus, Prozentabzug und Mitarbeitsabzug
- Kassa & Orga mit centgenauen Geldsammlungen/Teilzahlungen/Kassenbuch, Checklisten, flexiblen Listen und klassenlokalen Klassenlogins; Legacy-Basisbeiträge und frühere globale Klassenlogins werden verlustfrei migriert
- Planungszentrale mit vollständigem 10-Slot-Vertrag, ehrlichen leeren Fachzuständen, expliziter Wochenwahl ohne stillen Wochenend-Sprung sowie klassenlokaler Parkgarage und Wochenvorlagen; KI-Themenvorschläge werden sichtbar dargestellt und Fehler erzeugen keine erfundenen Ersatzantworten
- Wochen- und Jahresplanung inklusive Vollbild, Excel-Roundtrip und Aufgabenblattgenerator; die Wochenplanung nutzt durchgängig 10 Slots, konfigurierte Stundenzeiten/Mittagspause, jahreswechselrichtige Vorwochen und bundeslandabhängige Schulwochen ohne erfundene Excel-Zuordnungen; die Jahresplanung bewahrt mehrere Themen pro Fach/KW verlustfrei in Excel/CSV/Monatsansicht, nutzt bundeslandrichtige Schulwochen und verschiebt Inhalte entlang echter Unterrichtswochen
- Materialbibliothek mit CRUD, Suche/Filter/Gruppierung/Favoriten, validierten lokalen PDF-/Bilddateien und HTTP/HTTPS-Links, KI-/Arbeitsblatt-Inhalten sowie 10-Slot-Übergabe in den Wochenplan; Löschvorgänge räumen Materialverknüpfungen klassenübergreifend auf
- Übergabemappe mit 10-Slot-Tagesvertretung auf echten Klassenzeiten, Materialbibliothek-Stundenbildern und einmaliger Legacy-Migration, klassenlokalen Vertretungshinweisen, konfigurierbarer Druckmappe sowie Schulwechsel-Dossier mit Stammdaten, Leistungsstand, klassenlokaler Chronik, IKM-Plus und kompetenzorientierter Diagnostik; Datenschutzansicht blendet sensible Identitätsfelder aus
- Sokrates-PDF-Import mit lokal gebündeltem PDF.js-Worker und Offline/PWA-Unterstützung
- verschlüsselten lokalen Datentresor, verschlüsselte JSON-Backups und Legacy-Parser; lokale Sicherungsdateien heißen `Klassio_Sicherung_YYYY-MM-DD.json`, neue OneDrive-Sicherungen `Klassio_Backup.json`; historische OneDrive-Dateinamen und das interne verschlüsselte Legacy-Format bleiben kompatibel
- E-Mail-Einmalcode-Login mit administrativem Zugangscode als Fallback
- optionales 30-Tage-Gerätevertrauen für den Datentresor
- Canva-Integration
- nativen KEL-PowerPoint-`.pptx`-Export
- OneDrive und verschlüsselten Smartboard-Sync
- PWA-/Offline-Unterstützung
- freiwillige Klassio-Unterstützung über einen Herz-Dialog: bestehender PayPal.Me-Link für einmalige Beiträge; separate serverseitig konfigurierbare PayPal-Links für monatliche und jährliche Beiträge. Eine Dankesliste zeigt ausschließlich ausdrücklich zur Veröffentlichung freigegebene Namen und niemals Beträge, E-Mail-Adressen oder Zahlungsdaten.

Die genaue Abnahme steht in `KLASSIO_FEATURE_MATRIX.md`.

## Sicherheitsentscheidungen

### Account-Anmeldung

Klassio kann einen sechsstelligen E-Mail-Einmalcode senden, sofern SMTP und die erlaubten Schul-Domains am Server konfiguriert sind. Eine erfolgreiche Anmeldung setzt eine HttpOnly-Session für bis zu 30 Tage. Der bisherige Zugangscode bleibt als administrativer Fallback.

### Lokaler Datentresor

Die Account-Anmeldung ersetzt den lokalen AES-GCM-256-Datentresor nicht.

Optional kann eine Lehrkraft auf einem persönlichen, geschützten Dienstgerät `Diesem Gerät 30 Tage vertrauen` aktivieren. Dabei wird der Vault-Key nur verschlüsselt gespeichert. Der Geräteschlüssel ist ein nicht exportierbarer Web-Crypto-`CryptoKey` in IndexedDB. Passwort und Wiederherstellungscode werden nicht gespeichert.

### Recovery per E-Mail

Der Wiederherstellungscode des lokalen Datentresors wird bewusst **nicht** unverschlüsselt per E-Mail versendet. Ein kompromittiertes E-Mail-Konto darf nicht automatisch zur Entschlüsselung lokaler Schülerdaten führen.

## Datenmigration und Kompatibilität

Automatisiert abgesichert sind:

- Legacy-Single-Class → Multi-Class
- Klassenwechsel ohne Vermischung von Bewertungen/Metadaten
- Klassenwechsel ohne Vermischung von Chronik, Journal, Schnellnotizen und Verhaltens-Statusverlauf; Legacy-Mehrklassendaten werden nach Schüler-ID getrennt
- Klassenwechsel ohne Vermischung von Sitzpositionen, Möbeln oder Sitzplan-Regeln; alte globale Regeln werden nach referenzierten Schüler:innen auf Klassen verteilt
- Klassenwechsel ohne Vermischung von Anwesenheit und Anwesenheitsdetails; Anwesenheits-Undo und offene Anwesenheitsdialoge werden beim Wechsel zurückgesetzt
- verschlüsselte JSON-Backups
- BOM/JSON und einfache historische JS-Wrapper ohne Codeausführung
- Pre-Import-Sicherungsstand vor Wiederherstellung
- Recovery-Code und fremdes Backup-Passwort
- Abbruch bei beschädigten oder strukturell ungültigen Backups
- Race-Condition-Schutz zwischen Autosave und Restore
- exakte Erkennung und Entfernung des früher gebündelten 25-Schüler-Demoarchivs beim Laden; echte Benutzerarchive bleiben erhalten
- frischer App-Zustand ohne Musterlehrer, erfundene Archivschüler, voreingestellte Schnelllinks oder Beispiel-QR-Wert

Ein echter historischer Benutzer-Backup-Datensatz ist weiterhin ein Abnahmetest, sobald ein solcher bewusst bereitgestellt wird. Synthetische Legacy-Regressionstests sind grün.

## Ferienkalender

Der Ferienalgorithmus für das Schuljahr 2026/27 wurde am 13.09.2026 gegen die offiziellen österreichischen Termine geprüft. Die Semesterferien-Gruppen für alle Bundesländer sowie Weihnachts-, Oster-, Pfingst- und Sommerferien stimmen für 2026/27. Vorarlberg: Semesterferien 15.–20.02.2027.

## World4You-Staging

Die Release-Pipeline erzeugt nur aus einem erfolgreichen GitHub-Build ein commitgebundenes World4You-Artefakt. Das Paket enthält `dist/`, `package.json`, `bun.lock`, `.env.example`, README sowie Branch-/Commitmarker und startet mit `node dist/server.cjs`.

Beim letzten Server-Shell-Check wurde auf World4You `Node v18.20.4`, `npm 9.2.0` und kein Bun festgestellt. Als Shell-Arbeitsverzeichnis wurde `/home/www/web` angezeigt. Eine ältere Notiz nannte `/var/www/klassio`; deshalb darf dieser alte Pfad nicht ungeprüft als aktuelles Ziel verwendet werden.

Vor Merge nach `main` sind noch zwingend:

1. aktuellen Reconciliation-HEAD samt Dokumentationsstand vollständig per CI prüfen und das dazugehörige Artefakt erzeugen
2. exakt dieses Artefakt auf das tatsächlich aktive World4You-Staging-Ziel ausrollen
3. `/api/health` und Serverstart prüfen
4. realen Browser-Walkthrough auf demselben Commit durchführen
5. erst danach PR #5 nach `main` mergen
6. `main` nochmals per CI prüfen und anschließend optional taggen

## Externe Konfiguration für Staging

Für den E-Mail-Login:

- `LEHRERAPP_ALLOWED_EMAIL_DOMAINS`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER` / `SMTP_PASS` falls vom SMTP-Server benötigt
- `SMTP_FROM`

Für Canva:

- `CANVA_CLIENT_ID`
- `CANVA_CLIENT_SECRET`
- optional `CANVA_TOKEN_ENCRYPTION_KEY`

Weitere Produktionswerte wie `SESSION_SECRET`, Zugangscodes, `APP_URL`, Gemini- und OneDrive-Zugangsdaten gehören ausschließlich in die Server-/Deployment-Konfiguration, niemals in GitHub-Dateien oder Commits.


## Verbindliche Modul-für-Modul-Abnahme

Nach dem Reconciliation-Aufbau wird Klassio jetzt bewusst **nicht mehr quer durch mehrere Bereiche gleichzeitig** weiterentwickelt. Die bestehende App wird in dieser festen Reihenfolge einzeln geprüft, verbessert und technisch abgeschlossen:

1. Dashboard / Heute
2. Lehrercockpit
3. KI-Helfer
4. Notizen
5. Schüler:innen
6. Sitzplan
7. Anwesenheit
8. Notenmappe
9. Kassa & Orga
10. Planungszentrale
11. Jahresplanung
12. Wochenplanung
13. Materialbibliothek
14. Übergabemappe
15. Statistik & Profile
16. Diagnostik
17. Wir-Gefühl
18. Jahresbericht
19. Archiv
20. Druckzentrum
21. Datenarchiv / Datensicherung
22. Einstellungen

Für jeden Bereich gilt:
- zuerst aktuellen GitHub-Stand und vorhandene Funktionalität vollständig erfassen
- nichts Vorhandenes versehentlich entfernen
- UX, Verständlichkeit, tote Wege, Doppelungen und Alltagstauglichkeit prüfen
- Änderungen auf einem frischen Branch vom aktuellen Reconciliation-HEAD
- passende Regressionstests ergänzen
- Feature-CI grün
- PR in `reconcile/klassio-source-of-truth`
- vollständigen Pre-Deployment-Audit auf dem neuen Reconciliation-HEAD abwarten
- Status in `KLASSIO_FEATURE_MATRIX.md` aktualisieren
- erst dann zum nächsten Bereich wechseln

**Pflicht für neue Chats:** Solange diese Modul-Abnahme läuft, liest jeder neue Chat nach dem Source-of-Truth-Check zusätzlich diese Reihenfolge und setzt beim **ersten noch nicht technisch abgeschlossenen Modul** fort. Bereits abgeschlossene Module werden nicht ohne konkreten neuen Befund erneut umgebaut.

Aktueller Fortschritt:
- Dashboard / Heute: technisch abgeschlossen; reale visuelle Browser-/Staging-Abnahme bleibt Teil der späteren Gesamtfreigabe.
- Lehrercockpit: technisch abgeschlossen; PR #35 integriert, Audit #101 grün; reale Maus-/Touch-/Stift-/Staging-Abnahme bleibt Teil der späteren Gesamtfreigabe.
- KI-Helfer: technisch abgeschlossen; PR #37 integriert, Audit #104 grün; reale Gemini-/Browser-/Staging-Abnahme bleibt Teil der späteren Gesamtfreigabe.
- Notizen: technisch abgeschlossen; PR #39 integriert, Audit #106 grün; reale Browser-/Staging-Abnahme bleibt Teil der späteren Gesamtfreigabe.
- Schüler:innen: technisch abgeschlossen; PR #41 integriert, Audit #108 grün; reale Browser-/Staging-Abnahme bleibt Teil der späteren Gesamtfreigabe.
- Sitzplan: technisch abgeschlossen; PR #43 integriert, Audit #110 grün; reale Maus-/Touch-/Browser-/Staging-Abnahme bleibt Teil der späteren Gesamtfreigabe.
- Anwesenheit: technisch abgeschlossen; PR #45 integriert, Audit #112 grün; reale Browser-/Touch-/Druck-/Staging-Abnahme bleibt Teil der späteren Gesamtfreigabe.
- Notenmappe: technisch abgeschlossen; PR #47 integriert, Audit #114 grün; reale Browser-/Touch-/Druck-/Staging-Abnahme bleibt Teil der späteren Gesamtfreigabe.
- Kassa & Orga: technisch abgeschlossen; PR #49 integriert, Audit #116 grün; reale Browser-/Touch-/Druck-/Staging-Abnahme bleibt Teil der späteren Gesamtfreigabe.
- Planungszentrale: technisch abgeschlossen; PR #51 integriert, Audit #118 grün; reale Browser-/Touch-/Staging-Abnahme bleibt Teil der späteren Gesamtfreigabe.
- Jahresplanung: technisch abgeschlossen; PR #53 integriert, Audit #120 grün; reale Browser-/Touch-/Druck-/Excel-/Staging-Abnahme bleibt Teil der späteren Gesamtfreigabe.
- Wochenplanung: technisch abgeschlossen; PR #55 integriert, Audit #122 grün; reale Browser-/Touch-/Druck-/Excel-/Staging-Abnahme bleibt Teil der späteren Gesamtfreigabe.
- Materialbibliothek: technisch abgeschlossen; PR #57 integriert, Audit #124 grün; reale Browser-/Touch-/Datei-/Link-/Staging-Abnahme bleibt Teil der späteren Gesamtfreigabe.
- Übergabemappe: technisch abgeschlossen; PR #59 integriert, Audit #126 grün; reale Browser-/Touch-/Druck-/Datenschutz-/Staging-Abnahme bleibt Teil der späteren Gesamtfreigabe.
- Statistik & Profile: technisch abgeschlossen; PR #61 integriert, Audit #128 grün; reale Browser-/Touch-/Druck-/Datenschutz-/Staging-Abnahme bleibt Teil der späteren Gesamtfreigabe.
- Diagnostik: technisch abgeschlossen; PR #63 integriert, Audit #130 grün; reale Browser-/Touch-/Druck-/Datenschutz-/Staging-Abnahme bleibt Teil der späteren Gesamtfreigabe.
- Wir-Gefühl: technisch abgeschlossen; PR #65 integriert, Audit #132 grün; reale Browser-/Touch-/Datenschutz-/Staging-Abnahme bleibt Teil der späteren Gesamtfreigabe.
- Jahresbericht: technisch abgeschlossen; PR #67 integriert, Audit #134 grün; reale Browser-/Touch-/Druck-/Datenschutz-/KI-/Staging-Abnahme bleibt Teil der späteren Gesamtfreigabe.
- Archiv: technisch abgeschlossen; PR #69 integriert, Audit #136 grün; reale Browser-/Touch-/Datenschutz-/Legacy-/Staging-Abnahme bleibt Teil der späteren Gesamtfreigabe.
- Druckzentrum: technisch abgeschlossen; PR #71 integriert, Audit #138 grün; reale Browser-/Touch-/Drucker-/PDF-/Datenschutz-/Staging-Abnahme bleibt Teil der späteren Gesamtfreigabe.
- Datenarchiv / Datensicherung: technisch abgeschlossen; PR #73 integriert, Audit #140 grün; 995/995 Tests; reale Browser-/Restore-/OneDrive-/IndexedDB-/Staging-Abnahme bleibt Teil der späteren Gesamtfreigabe.
- Einstellungen: technisch abgeschlossen; PR #75 integriert, Audit #142 grün; 1004/1004 Tests; reale Browser-/Touch-/PWA-/Sync-/Staging-Abnahme bleibt Teil der Gesamtfreigabe.
- Legacy-Backup-Kompatibilität: PR #81 integriert; Audit #144 grün; historische `klassen`-Mehrklassenstände werden verlustfrei nach `classes` migriert, aktuelle `classes`-Daten behalten Vorrang, beschädigte historische Klassenlisten werden vor dem Restore abgewiesen.
- Alle 22 Einzelmodule sind technisch abgeschlossen. Der eingefrorene Reconciliation-Stand ist auf dem World4You-vServer unter `klassio.at` erreichbar; zusätzlich existiert `staging.klassio.at` als getrennte automatische GitHub-Preview-Umgebung.
- UX-Reconciliation läuft anschließend bewusst in separaten Draft-Branches: PR #84 stellt die kompakte Vor-Reconciliation-Navigation wieder her, ohne neue Funktionen aus dem Code zu entfernen.
- PR #85 trennt das persönliche Klassio-E-Mail-Konto von einer verifizierten Schulidentität. Private E-Mail-Adressen dürfen Klassio verwenden; schulinterne Funktionen bleiben an eine bestätigte Schule gebunden.
- PR #86 führt ein österreichweites serverseitiges Schulregister ein: stabile Schul-ID, Schulname, exakte Schul-Domain und Bundesland. `vobs.at` ist nur Bildungsanbieter und niemals automatisch eine gemeinsame Schule; `vsfoa.vobs.at` ist der erste verifizierte Seed. Neue Schulen aus allen Bundesländern können eine Verifizierungsanfrage stellen und werden erst nach administrativer Freigabe für das Lehrerzimmer aktiviert.
- Diese drei PRs bleiben Draft, bis der jeweilige Preview-Commit die vollständigen Tests/Builds und die reale Staging-Browserabnahme bestanden hat. Erst danach wird die Reconciliation-Kette konsolidiert und PR #5 nach `main` gemergt.

## Aktive Integrationskette am 16.09.2026

Die laufende UX-/Funktionsintegration liegt aktuell auf `feature/usability-widgets-tools-notes` (PR #94 gegen `main`). Der darauf aufgebaute Teamteaching-Block liegt in `feature/teamteaching-shared-classes` (PR #96). `main` bleibt bis zur vollständigen Integrations- und öffentlichen Staging-Abnahme unverändert verbindliche Produktionsbasis; neue Arbeit wird weiterhin ausschließlich von einem live geprüften GitHub-HEAD abgezweigt.

Teamteaching / gemeinsame Klassen ist technisch umgesetzt und automatisiert im echten Chrome mit zwei getrennten Schulmail-Konten geprüft. Der Test verwendet zwei getrennte Browserprofile, zwei getrennte lokale Tresore und Geräteschlüssel sowie echte sechsstellige E-Mail-Einmalcodes über einen lokalen SMTP-Testempfänger. Lehrkraft A legt eine Klasse über die reale UI an und aktiviert die verschlüsselte Freigabe; Lehrkraft B wird als Editor hinzugefügt, übernimmt und entschlüsselt die Klasse lokal, schreibt eine neue verschlüsselte Revision; Lehrkraft A lädt diese Revision anschließend wieder. Die Serverpersistenz wurde zusätzlich darauf geprüft, dass der Klassensnapshot verschlüsselt gespeichert wird und keine Klassen-/Schüler-Klartextfelder enthält. Feature Validation #1124 und Teamteaching Browser E2E #13/#14 waren grün.

Der Browsercheck hat außerdem einen echten Post-Login-Navigationsfehler gefunden und behoben: das erzwungene Landing auf `Heute` galt zuvor für die komplette Sitzung und blockierte nachfolgende Navigation. Seit Commit `50ffcfff86c66d58f76c18b1843f5388809ab97c` wird das Dashboard nur beim ersten authentifizierten Render erzwungen; ein Regressionstest sichert dies ab.

Noch offen bleibt die öffentliche Abnahme auf `staging.klassio.at` mit realem SMTP/World4You und anschließend der vollständige Gesamt-Walkthrough des integrierten Stands. Der grüne CI-Chrome-Lauf ersetzt diese öffentliche Staging-Abnahme ausdrücklich nicht.

## Pflicht für jeden neuen Chat

Ein neuer Chat arbeitet nicht von ZIPs, Erinnerungen oder früheren Berichten aus. Er liest zuerst:

1. aktuellen GitHub-`main`-HEAD
2. Branches und Pull Requests
3. `KLASSIO_SOURCE_OF_TRUTH.md`
4. `KLASSIO_FEATURE_MATRIX.md`
5. solange PR #5 nicht gemergt ist zusätzlich den aktuellen Reconciliation-HEAD und dessen letzten CI-Lauf
