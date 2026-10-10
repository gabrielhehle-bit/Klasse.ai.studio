# Widget-Prüfung: Musik · 11.10.2026

Dieser Fünferblock setzt PR #512 (Interaktion/Uhrentrainer) fort.

| Widget | Korrigierter Inhalt und Verhalten | Nachweis |
| --- | --- | --- |
| Rhythmus-Klopfer | Echte Zeitbewertung mit maximal 150 ms Toleranz, höchstens ein Treffer je Schlag; Pausen geben keine Treffer. Viertelschläge passen zu 3/4 bzw. 4/4 und einem/zwei Takten. Muster, Tempo, Stummschaltung und Ergebnis bleiben gespeichert. Wiedergabe startet nach Schließen bewusst nicht selbständig. | Rechenfälle für Timing, Doppelklopfen und Pause; im Browser sechs/acht sichtbare Schläge, ein Treffer trotz Doppelklick, echtes Pausenfeld, gespeichertes Muster. |
| Klang-Memory | Kartenreihenfolge, Klangfarbe, offene Karten und gefundene Paare werden gespeichert. Jede Tonhöhe kommt exakt zweimal vor. Falsche Paare bleiben bis „Weiter“ offen, damit sich Kinder die Positionen merken können; kein ungespeicherter Rückdreh-Timer. Unterschiedliche synthetische Klangfarben mit eigener Hüllkurve/Obertönen. | Alle fünf Größen (4/6/8/12/16) anhand tatsächlicher Web-Audio-Frequenzaufrufe gelöst; fünf Klangfarben, falsches/offenes Paar und Abschluss wiederhergestellt. |
| Tonleiter-Entdecker | Acht Tonhöhen einschließlich H und Oktav-C; Glockenspiel spielt jetzt dieselbe bezeichnete Tonhöhe wie die anderen Klangfarben. Modus, Hörfolge, Fortschritt, Liedausschnitt und Feedback bleiben erhalten. Tastatur 1–8 gilt nur bei Fokus innerhalb des sichtbaren Widgets. Abgebrochene Wiedergabe wird angezeigt und lässt sich erneut anhören. Vorhandene kurze Melodien werden ausdrücklich als Ausschnitte bezeichnet. | Alle acht Grundfrequenzen in drei Klangfarben, hörbare Oktavfolge, Hörfolgen mit 3/4/6 Tönen samt falscher/richtiger Antwort, drei geführte Liedausschnitte, Tastatur und Schließen. |
| Roboter-Sounds | Programm, Tonhöhe, Filterresonanz und Rückmeldung bleiben gespeichert. Sechs elektronische Effekte; sachliche Rückmeldungen statt unbelegter physikalischer Behauptungen. Große Regler/Programmtasten, bereinigte Texte und Akzentfarben. | Alle sechs Programme erzeugen Web-Audio-Oszillatoren; Reglergrenzen 150/1800 Hz und Q=1/15, Wiederöffnung und Audio-Aufräumen. |
| Gitarren-Stimmgerät | Saiten von tief nach hoch E–A–D–G–H–e. Auswahl und Automatik bleiben gespeichert. Referenz-Oszillator endet tatsächlich; Mikrofon nutzt seinen eigenen AudioContext und dessen Abtastrate. Ausstehende Berechtigungsanfragen werden bei Stop/Schließen ungültig; Tracks/Animationen/Kontexte werden beendet. Stille zeigt keine falsche Stimmung mehr. Cent-Abweichung und logarithmischer Saitenabstand. | Alle sechs Referenztöne; reine Signale für sechs Saiten, 44,1/48 kHz, ±30 Cent; tatsächlicher Browser-Analyzer mit synthetischem E4, zu tief/hoch/Stille, Track-Freigabe und verweigerter Berechtigung. |

Die tatsächlichen Unterrichtsmodus-Komponenten und die Rhythmus-/Tontrainer-Bereiche von „Musik & Klänge“ erhalten `onUpdate`. Mindestgröße inklusive Kopf: 760×560 Pixel, beim Tontrainer und gemeinsamen Musik-Studio 840×560. Die Ecke für die Größenänderung bleibt frei; Bedienelemente mindestens 44×44 Pixel. Im gemeinsamen Studio werden Einstellungen separat vom Instrumentbereich angezeigt, damit beide bedienbar bleiben.

## Prüfung

- Alle 2383 Bibliothekstests bestanden, TypeScript und Produktionsbuild erfolgreich.
- Tatsächliche Komponenten im gemeinsamen CockpitWidget-Rahmen: native Größen, Klickmitten, kein inneres Scrollen; Screenshots visuell geprüft.
- Dauerhafte Unterrichtsroutine prüft Inhalte, Minimieren und vollständiges Schließen/Wiederöffnen.
- Audio-Prüfung beobachtet native Oszillator-Erzeugung und Frequenz-Automation. Das ist keine Hörprüfung. Beim Stimmgerät gelangt ein synthetischer Web-Audio-Ton durch einen echten MediaStream/Analyzer; das ersetzt keine echte Gitarrensaite oder Hardware-Berechtigungsprüfung.
- Grundlage für AudioContext-Abtastrate, Oszillatorende und Ressourcenfreigabe: [Web Audio API 1.1](https://webaudio.github.io/web-audio-api/).
- Veröffentlichung erst nach grüner CI des endgültigen PR-Commits und anschließendem Produktionsaudit. Öffentlicher Release-Hash und Health-Endpunkt werden unabhängig kontrolliert.

Offen bleiben reale Lautsprecher/Hörprüfung, Gitarren-/Mikrofonprüfung und echte Touchtafel. Nächster Schritt nach Veröffentlichung: nächster noch nicht inhaltlich geprüfter Fünferblock.
