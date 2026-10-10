# Klassio: Natur und Geographie, 10. Oktober 2026

Fortsetzung der Roadmap-Prüfung in gemeinsamen Fünferblöcken nach PR #506.

| Widget | Mindestfläche | Gemeinsamer Chrome-Nachweis |
| --- | --- | --- |
| Sternbilder-Zeichner | 720×560 | Alle vorhandenen Himmelsmuster entdecken und wirklich verbinden; falscher Stern; begonnenes Paar und vollständige Linien wiederherstellen |
| Planetensystem | 720×560 | Sonne und alle acht Planeten direkt anwählen; eigenes Erdalter; echtes Quiz mit falschen/richtigen Antworten und Ergebnis |
| Flaggenquiz | 700×560 | Abgebildete Flaggen falsch/richtig beantworten; nächste Runde; Kontinentfilter; Einstellungen und Escape |
| Bundesländer-Forscher | 700×560 | Alle neun Bundesländer gleichzeitig; jede Hauptstadt falsch/richtig prüfen; St. / Sankt Pölten; Entwurf und Lösung |
| Müll-Trenner | 820×560 | Alle 15 Beispiele einmal pro Durchlauf; alle fünf Kategorien; falsche/richtige Antwort samt Begründung und tatsächlichem Zähler |

Alle fünf nutzen native Bedienelemente und speichern fachlichen Zustand in der
vorhandenen Widget-Lifecycle-Struktur. Minimieren und vollständiges Schließen
werden getrennt geprüft; der sichtbare Text und Eingabewerte müssen nach dem
Wiederöffnen identisch sein. Gespeicherte Fenster werden innerhalb der nutzbaren
Tafel oberhalb des Docks wiederhergestellt. Der Chrome-Test zieht jedes Fenster
mit dem Zeiger auf die Mindestgröße und prüft 44px-Ziele, Grenzen und Erreichbarkeit.

Sternbilder speichern verbundene Kanten als Array, rekonstruieren daraus ein Set
und setzen nur bei echtem Muster-/Modus-/Filterwechsel zurück. Planetenauswahl
steht in einem Raster, damit Neptun ohne horizontales Scrollen erreichbar ist.
Quizlänge und Flaggenfilter setzen nur bei tatsächlicher Änderung zurück.

Der bisherige Bundesländer-Forscher hatte nur fünf Länder und versuchte,
Zusatzinhalte über die deaktivierte KI zu laden. Der neue lokale Lernmodus umfasst
alle neun Länder und Hauptstädte ohne Netz- oder KI-Anfrage. Fachbasis:
[Österreichische Bundesländer und Landeshauptstädte](https://www.migration.gv.at/de/leben-und-arbeiten-in-oesterreich/oesterreich-stellt-sich-vor/geografie-und-bevoelkerung/).
St. Pölten wird auch als Sankt Pölten akzeptiert, Klagenfurt als
Klagenfurt am Wörthersee. Andere Städte gelten weiterhin als falsch.

Flaggenbilder aller 195 Quizländer sind als lokale SVGs aus flag-icons 7.5.0
(MIT-Lizenz, unveränderte Grafiken) gebündelt und durch den bestehenden PWA-Build
vorab zwischengespeichert. Das Quiz hängt dadurch nicht mehr vom externen CDN ab.
Ein Test prüft jede vorhandene Grafik und die enthaltene Lizenz. Fachliche Entsorgungsregeln und regionale Hinweise des
Müll-Trenners bleiben erhalten; ein Durchlauf wiederholt kein Beispiel vorzeitig.

Freigabe: lokale Tests, TypeScript und Build; beide Chrome-Viewportläufe;
alle acht GitHub-Prüfungen auf dem endgültigen PR-Commit. Nach Merge zusätzlich
Pre-Deployment Audit, Teamteaching und erfolgreicher Production Deploy sowie
öffentlicher Nachweis des exakten Releases und `status: ok`.
Echte Touch-Hardware und Hörprüfung gehören nicht zu diesem Browsernachweis.
