# Zwei separat fehlende Katalogeinträge · 12.10.2026

Anschluss nach veröffentlichtem PR #519, `main` 7ebe6afe.
Der erfolgreiche Browserlauf öffnete 110 von 112 Katalogtypen einzeln.
`weather` und `aiquiz` fehlten; das gemeinsame Quiz im Rätsel-Widget
ersetzt keinen Nachweis für den eigenständigen Eintrag.

## Aktueller Wetterbericht

Der frühere Wetterbericht erlaubte frei durchschaltbare Symbole neben echten
Temperaturen, setzte seltene unbekannte Codes auf bewölkt, verlor den Ort bei
Wiederöffnung und fragte den Standort schon beim Einhängen ab.

Jetzt: separates Ortssuchfeld, aktuelle Daten mit Abrufzeit, persistierter
letzter Stand und Suchentwurf. Alte Daten sind beim Laden/Fehler ausdrücklich
als letzter gespeicherter Stand bezeichnet. Kein erfundenes Ersatzwetter.
Standort erst per Knopfdruck; Ablehnung verändert den ausgewählten Ort nicht.
Neuere Suche entwertet alte Geocoding-, Wetter- und Standortantworten.
Abbruchcontroller, Zeitbegrenzung und Unmount räumen Anfragen auf.

WMO-Zuordnung nach https://open-meteo.com/en/docs: bedeckt ist Code 3;
56/57 gefrierender Nieselregen, 66/67 gefrierender Regen; 95/96/97/99 Gewitter.
Unbekannte Codes und nicht endliche/ungültige Temperatur- oder Ortsdaten
werden nicht als aktuelle Messung übernommen.

Chrome-Fälle: alle 29 dokumentierten Codes, echte Sucheingabe, negative
Temperatur, nicht gefundener Ort, malformed Response, Offline/Korrektur,
Minimieren und vollständiges Schließen mit gespeicherten Daten/Entwurf,
verspätete Geocoding-Antwort, expliziter/abgelehnter/verspäteter Standort.
Providerantworten und Standort sind synthetische Fixtures; keine reale
Standortfreigabe und keine Behauptung echter Wetterwerte im Test.
Mindestfläche 460×480, aktive Ziele ≥44 Pixel und frei vom Größenänderungsgriff.

## Eigenständiges KI-Lernquiz

Die bestehenden vollständigen Quizfälle werden über beide tatsächlichen
Katalogeinträge ausgeführt: `riddle` im Quizmodus und separat `aiquiz`.
Falsche/richtige Antwort, tatsächliche Lösung, gespeicherte Antwort/Thema/Niveau,
Abbruch einer laufenden Anfrage, ungültige Ausgabe ohne Frageverlust,
neue Antwortposition sowie lange Frage/Antwort mit Lesedialog/Escape/Fokus.
Kontrollierte Antwort am bestehenden Serverpfad, keine kostenpflichtige Anfrage.
Mindestfläche 700×560. Der bestehende KI-Dienst und das kombinierte Quiz bleiben.

## Abschlussgrenzen

Drei neue Logiktests prüfen Wettercodes, reale negative Temperaturen,
beschädigte Daten, Koordinaten und gespeicherte Abrufzeit.
Vollständige lokale Tests, TypeScript, Build, endgültige 360/820-Matrix und
CI-/Live-Nachweis sind vor Freigabe zu bestätigen.
112 einzeln geöffnete Typen wären nur ein Katalog-Abgleich, keine vollständige
Abnahme jeder Konfiguration. Echte Touch-/Stift-/Audiohardware und zusätzliche
Material-/Webquellen beim Tafelbild bleiben separate offene Prüfungen.
