# KLASSIO – Usability-/Funktionspaket 2026-09-16 – Arbeitscheckliste

Ausgangs-`main`: `11c9891d71f3451bd73dacf559ed62695fa9a8f2`

Arbeitsbranch: `feature/usability-widgets-tools-notes`

Der Branch wurde **vom geprüften `main` erstellt** und anschließend nach Prüfung der offenen PR-Kette auf den aktuellen, von `main` abstammenden Release-HEAD `3eae1848d76434d91c4ca41546d1a92c80fb52c8` vorgezogen. Der Release-HEAD ist 877 Commits vor `main` und 0 Commits dahinter. Damit bleibt `main` die Basis, während bereits vorhandene, noch nicht gemergte Arbeit nicht verloren geht.

## Statuslegende

- ✅ umgesetzt und automatisiert geprüft
- 🟡 teilweise vorhanden / muss gegen Anforderung gehärtet werden
- 🔴 fehlt / muss umgesetzt werden
- 🔍 noch vollständig zu auditieren
- 🌐 externe Fachquellen vor Einbau erforderlich
- 🧪 Browser-/Praxisprüfung offen

## Verbindliche Checkliste

| # | Anforderung | Status | Aktueller Befund |
|---:|---|---:|---|
| 1 | Source-of-Truth-Check | ✅ | `main`-HEAD, Branches, offene PRs und Projektdateien geprüft. |
| 2 | Arbeitsbranch vom aktuellen `main` | ✅ | Frischer Branch erstellt; bestehende Release-Kette danach verlustfrei integriert. |
| 3 | Nichts Bestehendes verlieren | 🟡 | Bestehende Release-Kette übernommen; vollständige Regression/Backup/JSON/Migration am Ende Pflicht. |
| 4 | „Unterrichtshilfen“ → „Widgets“ | 🔴 | Im Lehrercockpit sind noch mehrere sichtbare „Unterrichtshilfe(n)“-Texte vorhanden. |
| 5 | Direkt sichtbare Widget-Vorlagen | 🟡 | Vorlagenlogik existiert, Erstellen liegt aber noch hinter dem Optionen-/Vorlagenweg. |
| 6 | Widgets deutlich kompakter | 🟡 | Responsive Mindestgrößen existieren; 2×2-Ziel und Innenlayouts müssen systematisch geprüft/gehärtet werden. |
| 7 | Große obere Widget-Bearbeitungsleiste entfernen | 🔴 | Widget-Header enthält aktuell mehrere Einzelbuttons; kompaktes Kontextmenü fehlt. |
| 8 | „Ich bin da“ – Namen immer sichtbar | 🟡 | Standardansicht zeigt Namen; kompakte Ansicht reduziert auf Zusammenfassung/offene Kinder. Muss korrigiert werden. |
| 9 | Sidebar sortierbar + Pin/Flagge | 🟡 | Sortierung + Persistenz vorhanden; Anpinnen/Flagge fehlt. |
| 10 | Geschlecht sichtbar in Liste/Dossier/Stammdaten | 🔍 | Bestehendes Feld verwenden; drei Oberflächen gezielt prüfen. |
| 11 | Klassenliste und Schülerdossier getrennt | 🔍 | Direkte Einstiege und Navigation gezielt prüfen/ggf. ergänzen. |
| 12 | Fortlaufende flexible Entwicklungslisten | 🔴 | Allgemeine, frei definierbare Schüler-Verlaufslisten fehlen als einheitliche Funktion. |
| 13 | Klassenbuch Deutsch neu ordnen | 🟡 | Klassenbuch kennt „Sprachbetrachtung“, Wochenplan führt noch „Sprache“; „Sprechen & Hören“ fehlt. |
| 14 | Klassenbuch Mathematik-Unterbereiche | 🔴 | Geforderte vier Bereiche müssen konsistent in Klassenbuch + Wochenplan ergänzt werden. |
| 15 | Förderung (FÖ) / D-FÖ | 🟡 | D-FÖ wird teilweise erkannt; generische Förderkategorie und konsistente Auswahl müssen geprüft/gehärtet werden. |
| 16 | Unterrichtseinheit halbieren | 🔴 | Aktuell ganze Stunden/Mehrstunden, keine zwei gleich großen Hälften. |
| 17 | Klassenbuch als echte DOCX | 🔴 | Echter `.docx`-Export für Woche/Monat/Semester/gesamt fehlt. |
| 18 | Zentraler Notizen-Hub | 🟡 | Neuer direkter Hauptbereich existiert; parallele Notizwege noch vollständig zusammenführen. |
| 19 | Verhalten & Notizen → Schülerdossier | 🔍 | Automatische Dossier-Sichtbarkeit aller kindbezogenen Hub-Einträge prüfen/härten. |
| 20 | Transkription im Notizen-Hub | 🔴 | Workflow Aufnahme → Transkript → Korrektur → Speichern fehlt im zentralen Hub. |
| 21 | Stationenbetrieb → Notizen-Hub | 🔍 | Stimm-/Sprachnotizen auf einheitliches Notizmodell umstellen. |
| 22 | KEL: Verhaltens-/Beobachtungsnotizen optional anzeigen | 🔍 | Muss gezielt geprüft/ergänzt werden; keine automatische Ausgabe an Eltern. |
| 23 | KEL-Ladefehler vollständig beheben | 🔍 | Reproduzieren, Ursache beheben, Browserworkflow prüfen. |
| 24 | Sitzplan intuitiver | 🔍 | Tisch-/Kind-Drag&Drop und versteckte Modi im Browser auditieren. |
| 25 | Niveau 1–5; „schwach/stark“ nur in Einstellung | 🔍 | Globales Wording durchsuchen und absichern. |
| 26 | Lesediagnostik 100 Wörter / Fehler / letztes Wort / Intonation | 🔴 | Bestehende Leseflüssigkeit reicht für den geforderten 1:1-Ablauf noch nicht. |
| 27 | Richtwerte 2./3. Klasse | 🌐 | Vor Einbau seriöse Quellen + Verfahren dokumentieren; keine erfundenen Werte. |
| 28 | Hauptbereich Tools | 🔴 | Zentrale Tools-Navigation mit bestehenden Werkzeugen muss angelegt werden. |
| 29 | Tools → Textanalyse | 🔴 | Eigenes Lesbarkeits-/Textschwierigkeitswerkzeug samt dokumentierten Formeln fehlt. |
| 30 | Gültige Sitzung → direkt Heute | 🟡 | Dashboard-Landing wurde bereits vorbereitet; Session/Tresor-Trennung noch gegen Browserworkflow prüfen. |
| 31 | Unklare Punkte nicht erfinden | ✅ | Keine Notenmappe-Antolin-Sonderintegration und keine unklare Monatsübersicht ableiten. |
| 32 | Migration/Kompatibilität | 🟡 | Bestehende Migrationen vorhanden; neue Datenmodelle brauchen explizite, getestete Migrationen. |
| 33 | Vollständige Tests | 🧪 | Erst nach Umsetzung final: komplette Suite, TS, Build, Migration, Backup/Restore, JSON usw. |
| 34 | Echter Browsercheck | 🧪 | Muss alle im Paket genannten Workflows abdecken. |
| 35 | Source-of-Truth-Dateien aktualisieren | 🔴 | Erst nach erfolgreichem Abschluss mit finalem HEAD/Test/Build/Browser/Deployment. |
| 36 | Abschluss/Merge | 🔴 | Kein Merge/Produktivdeploy vor grünen Tests, Migration und Browsercheck. |

## Zusätzliche Regeln

- Kein Punkt wird allein wegen vorhandenen Codes als „fertig“ markiert.
- Kein bestehendes Feature wird für eine Vereinfachung entfernt.
- Neue Datenstrukturen werden nur eingeführt, wenn vorhandene Modelle nicht sauber erweiterbar sind.
- Vor finalem Merge wird `main` erneut geprüft und gegebenenfalls sauber integriert.
- `klassio.at` bleibt bis zum grünen Abschluss auf dem aktuellen Produktivstand.
