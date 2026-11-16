# KLASSIO – praktische Freigabe mit zwei Lehrpersonen und echten Geräten

**Status:** Noch nicht durchgeführt. Automatisierte Tests sind keine Bestätigung realer Benutzerfreundlichkeit. Dieser Ablauf ergänzt die UX-Gesamtprüfung vom 16. November 2026.

## Sichere Vorbereitung
- Zwei **berechtigte** Lehrpersonen mit jeweils eigenem Schulkonto und getrennten Geräten/Browserprofilen verwenden.
- Für erste Versuche nur eine **Testklasse bzw. Beispieldaten ohne echte Kinder** einsetzen.
- Beide bestätigen vor dem Test, dass sie die nötigen Zugänge zur gemeinsamen Klasse haben.
- Vor einem Test mit produktiven Daten: aktuelle verschlüsselte Sicherung prüfen. Keine echten Datensätze absichtlich überschreiben oder Konflikte provozieren.

## A. Teamteaching aus Sicht einer Lehrperson

- [ ] **A1 — Einladung (Person A):** In `Klassenteam` die gemeinsame Klasse aktivieren und Person B einladen. Erwartet: eindeutige Einladung und keine Aufforderung, eine zweite Klasse anzulegen.
- [ ] **A2 — Beitritt (Person B):** Einladung mit eigenem Schulkonto öffnen. Erwartet: Die bereits geteilte Klasse erscheint eindeutig; die Gerätefreigabe wird, falls nötig, verständlich erklärt.
- [ ] **A3 — Automatisches Speichern (Person A):** In einer Testplanung eine erkennbare Änderung schreiben. Erwartet: Lokaler Speicherstatus und bestätigter Teamstand sind klar unterscheidbar; A muss nicht jedes Mal „Senden“ auswählen.
- [ ] **A4 — Zweites Gerät (Person B):** Dieselbe Testplanung auf Gerät B öffnen. Erwartet: Der neue Inhalt erscheint nach dem vorgesehenen Abgleich, ohne manuelles Neuanlegen der Klasse.
- [ ] **A5 — Rückrichtung:** B verändert einen anderen, ungefährlichen Testeintrag. A sieht den neuen Stand; keine bereits eingetragene Änderung verschwindet.
- [ ] **A6 — Offline:** Gerät B kurz vom Netz trennen, einen eigenen Testeintrag lokal speichern, wieder verbinden. Erwartet: Deutlich lesbarer Status, keine verlorenen Eingaben, nachvollziehbare Abgleichbestätigung.
- [ ] **A7 — Gleichzeitige Bearbeitung (nur Testklasse):** Beide bearbeiten parallel einen eigenen Testeintrag. Erwartet: Kein stilles Überschreiben; falls Konflikt erkannt, verständlicher Hinweis und sichere Vergleichs-/Kopiermöglichkeit.
- [ ] **A8 — Ohne Anleitung:** B soll nach dem ersten Beitritt die nächste Änderung selbstständig finden. Notieren: War die Bedienung wirklich selbstverständlich?

## B. Mobil und Surface

- [ ] **B1 — Smartphone:** Auf einem echten Android- oder iOS-Gerät bei schmaler Breite navigieren. Erwartet: Navigation, Speicherstatus und aktive Einstellungen-Reiter bleiben erreichbar.
- [ ] **B2 — Touch:** Einfachmodus, Backup-Erinnerungen, Druckvorlagenfilter und Druckformat antippen. Erwartet: Große, verlässlich reagierende Flächen ohne Fehlbedienungen.
- [ ] **B3 — Druckzentrum:** Vorlagensuche, Schnellvorlagen, KEL-Elternblatt und A4-Vorschau öffnen. Erwartet: Kein horizontales Abschneiden zentraler Aktionen.
- [ ] **B4 — Datensparsam drucken:** Im KEL-Elternblatt wird zunächst kein Kind vorausgewählt; nur die absichtlich ausgewählten Beobachtungen dürfen auf dem Ausdruck erscheinen.
- [ ] **B5 — Surface:** Dieselben Wege im Touchmodus und mit Tastatur testen; Fokus sichtbar, keine Funktion ausschließlich auf Hover angewiesen.

## C. Abnahme dokumentieren

Je Fehler notieren: **Gerät/Browser, Schritt, erwartetes Ergebnis, tatsächliches Ergebnis, Screenshot ohne personenbezogene Daten**. Bei kritischem Verlust von Testeingaben: Veröffentlichung weiterer Änderungen stoppen und Ursache dokumentieren.

**Freigabe:** Technische GitHub-/World4You-Checks und die hier dokumentierte Praxisabnahme getrennt bewerten. Diese Checkliste gilt erst als „erledigt“, wenn reale Personen die Kästchen tatsächlich geprüft haben.