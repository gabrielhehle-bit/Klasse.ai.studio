# Widget-Prüfung: Klassenroutinen · 11.10.2026

Fortsetzung des Wohlbefindenblocks aus PR #514.

| Widget | Ergebnis |
| --- | --- |
| Morgen-Mottos | Offline-Sammlung mit Themen und Rotation beibehalten. Titel- und Satzentwurf über Schließen gespeichert. Themen/eigenes Motto/KI auf getrennten, sichtbaren Einstellungsseiten. Veraltete KI-Antworten nach Bearbeiten, Themenwechsel oder Schließen verworfen. Kein Schülerkontext im Prompt. |
| Unterrichtsphasen | Tatsächliche aktive Phase und Änderungen bleiben gespeichert. Phasenverwaltung und Auswahl mit blätterbaren Seiten; keine horizontale Scrollleiste. Ungültige oder doppelte gespeicherte IDs abgefangen; neue IDs kollisionsfrei. Löschen der aktiven Phase wählt Nachfolger bzw. Vorgänger, letzte Phase bleibt erhalten. Entwürfe für Umbenennen/Hinzufügen gespeichert. Untertitel und Symbole bleiben bei der Rückgabe an den Unterrichtsmodus erhalten. |
| Tisch-Check | Entwürfe, eigener Gegenstand und gewählter Bearbeitungsbereich bleiben beim Schließen erhalten. Explizites Anzeigen übernimmt den Entwurf. Abbrechen nach Entfernen/Löschen bewahrt Materialien und Häkchen. Häkchen zurücksetzen löscht keine Materialauswahl. Alle Materialkarten per Tastatur bedienbare Buttons. Auswahl, eigene Materialien und Reihenfolge auf begrenzten Seiten. |
| Fair-Call | Runde an Klasse und Datum gebunden; anwesende Neuzugänge ergänzt, entfernte/abwesende IDs und Duplikate bereinigt. Pausierte Kinder zählen nicht als aufgerufen. Rücknahme und Wiederöffnung behalten Runde. Animationsintervall beim Schließen/Neustart/Kontextwechsel beendet; sofortige Ziehungssperre. Tastenkürzel nur im fokussierten Widget, keine Doppelaktion auf Buttons. AudioContext nach Tonende geschlossen. Rundenübersicht mit Seiten. |
| Zufallsauswahl | Vorhandene Logik für Klasse/Tag, Abwesenheiten, eindeutige Namen, Ziehungssperre, Abbruch und Rücknahme geprüft. Sitzungsauswahl bewusst weiterhin ohne dauerhaft gespeicherte Schülerhistorie. Sichtbarer Hinweis erklärt den Neustart beim vollständigen Schließen. Browserprüfung für echte Ziehung, Rücknahme und Auswahlmodal ergänzt. |

Bedienziele mindestens 44 Pixel. Mindestfenster für Mottos, Tisch-Check und Fair-Call: 640×560 Pixel; Unterrichtsphasen: 460×560 Pixel. Smartphone-Schnellmodus bleibt unverändert; die Tafelroutine läuft innerhalb derselben 360/820-Startbreiten zusätzlich mit echter 1366×768-Tafelansicht.

Lokale Validierung: 2.396 Bibliothekstests bestanden, TypeScript und Produktionsbuild erfolgreich. Neue Logiktests prüfen Klassen-/Tageswechsel, Neuzugänge, ungültige Daten, Pausen, Phasen-ID-Kollisionen und aktive Löschfälle. Die permanente Browserroutine prüft echte UI-Aktionen, Entwurfs-/Inhaltswiederherstellung und erreichbare Bedienelemente. CI- und Produktionsnachweis werden in der PR nach tatsächlich abgeschlossenem Lauf dokumentiert.

Reale Lautsprecher-/Touchtafelprüfung bleibt offen. Es gibt keine Aufgabenlösungen in diesen fünf Routinewidgets; geprüft werden die angezeigten Inhalte und Zustandsübergänge.
