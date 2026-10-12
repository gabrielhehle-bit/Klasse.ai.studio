# Lernzielkontrollen: Unterbereiche, Teilnahme und Klassenschnitt

Fortsetzung von PR #526 (schnelle Klassen-Spalteneingabe). Bestehende Eingaben,
relative Mitarbeitberechnung und manuelle Punkt-/Prozentskalen bleiben erhalten.

## Verhalten

- Das aktuelle Notenmappenfach ist das Fach der Kontrolle. Im LZK-Dialog lässt
  sich zusätzlich ein Unterbereich aus den bestehenden Lernzielbereichen wählen
  oder genauer eingeben (z. B. Größen → Längen). Auch alte Spalten können
  nachträglich zugeordnet und umgeordnet werden. Ohne Zuordnung wird nichts geraten.
- Die Zuordnung steht im Spaltenkopf. Schülerdossier (Leistungsübersicht und
  Fachansicht) und individuelles Portfolio lesen dieselben gespeicherten Kontrollen
  nach Fach/Bereich; es entstehen keine duplizierten Portfolioeinträge.
- Punkte werden pro Kontrolle anhand ihrer Höchstpunkte normalisiert. Noten und
  Prozentskalen werden getrennt gehalten. Gruppenmittel sind einfache Mittel der
  vergleichbaren LZK-Ergebnisse; sie ändern keine Fachgewichtung oder Endnote.
- „Im Klassenschnitt mitzählen“ ist eine gespeicherte Kinder-Einstellung in
  Stammdaten und Notenmappentabelle. Sie hat Vorrang vor dem jetzt gespeicherten,
  fachspezifischen SPF/ESPF-Standardfilter. SPF/ESPF-Merkmale sind schon vorhanden.
  Der bisherige Notenmappenstandard (SPF/ESPF nicht einbeziehen) bleibt bestehen,
  solange keine individuelle Einstellung oder Fachausnahme gesetzt wird.
- Dieselbe Kinderregel gilt für Spaltenmittel, Notenmappenstatistik,
  Leistungs-Auswertungen, Klassendossier, Notenverlauf und LZK-Bereichsmittel.
  Kinder bleiben in der Klasse; eigene Bewertungen bleiben im Dossier sichtbar.
- Jede LZK bietet je Kind Teilnahme/nimmt nicht teil. Nichtteilnahme nimmt die
  Kontrolle aus persönlicher Berechnung, Klassenschnitt und Bereichsauswertung.
  Bereits gespeicherte Ergebnisse bleiben erhalten und erscheinen bei Rücknahme
  wieder. 0 Punkte sind echte Ergebnisse; fehlende Ergebnisse sind keine Null.
  Erfasst/offen zählt nur teilnehmende Kinder und weist Ausnahmen separat aus.
- Gelöschte Spalten verlieren auch Bereich und Teilnahme; leere, aber bereits
  zugeordnete oder von der Teilnahme ausgenommene Spalten werden nicht neu benutzt.

## Prüfung

Sechs Logikfälle prüfen SPF/ESPF-Standards, individuelle Vorrangregeln, getrennte
persönliche Ergebnisse, einheitliche Klassenmetriken, unterschiedliche Höchstpunkte,
0/offen/Nichtteilnahme, Rücknahme ohne Datenverlust, JSON-Wiederherstellung,
nachträgliche Zuordnung, Metadaten-Erhaltung und Spaltenlöschung.

Die bestehende Chrome-Matrix wurde ergänzt: LZK mit Bereich erstellen, verschlüsselt
neu laden, Teilnahme ausschalten, Nullpunkte des anderen Kindes erhalten,
Teilnahme wieder einschalten und ursprüngliche Punkte wiederfinden, Kind aus dem
Klassenschnitt nehmen, Einstellung nach verschlüsseltem Neuladen prüfen und eigene
Ergebnisse im Schülerdossier sehen. Screenshots erfassen Dossier und Klassen-Spalte.
Der Flaggenquiz-Lauf wartet nun auf den angewendeten Filter, bevor Escape gesendet
wird, damit eine parallele Zustandsänderung das Schließen nicht überholt.

Lokale Gesamtprüfung: 2.438 Logiktests, TypeScript, Produktionsbuild und
Syntaxprüfung beider Browser-Skripte. Browserausführung und visuelle Prüfung
müssen vor Veröffentlichung erfolgreich abgeschlossen werden.
