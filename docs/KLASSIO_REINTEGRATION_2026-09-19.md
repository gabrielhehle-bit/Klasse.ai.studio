# KLASSIO – kontrollierte Wiederintegration, Stand 2026-09-19

> **NICHT PRODUKTIV / KEINE FREIGABE.** Dieses Dokument protokolliert den Integrationsbranch. Einzelne als „integriert“ bezeichnete Funktionen sind nur in diesem Branch, **nicht** auf `main` oder klassio.at. Der echte Produktiv-Commit ist ohne Serverzugriff noch zu verifizieren.

## Verbindliche Basis und Schutz

- Source of Truth: GitHub `gabrielhehle-bit/Klasse.ai.studio`, `main`; vor Beginn des Integrationszweigs verifizierter HEAD `05bf54bae5abbfee1d43ce96431a030a42bcc0ed` (einschließlich #140–144).
- Integrationsbranch: `reconcile/reintegrate-pr145-159` aus diesem `main`. Kein ZIP als Entwicklungsbasis.
- Keine Datenmigration, kein automatisches Löschen von Legacy-Daten, kein Merge nach `main`, kein Live-Deployment vor Abnahme.
- Die 15 offenen ursprünglichen PRs #145–159 wurden einzeln auf Draft/Merge-Status, HEAD und Dateiumfang geprüft; der frühere Bericht über „14 fehlende PRs + #159“ ist bezogen auf `main` durch GitHub bestätigt, nicht automatisch auf die echte Live-Installation übertragbar.

## Tatsächlich in diesem Integrationsbranch aufgenommen

- #153: Begrüßung ohne erfundene/leere Lehrkraftnamen, über Integrations-PR #160; HEAD-Merge `ab5c1db32a7d0c59dbb42ab2a985474c8d7ef43f`.
- #146 und #147 zusammen: Stundenentwürfe im Wochenplan und Materialbibliothek, über Integrations-PR #161; HEAD-Merge `3d77cfd7a7befea9ea20d02736ccfae4999e3796`.
- #148: Canva-Bild-/Hintergrundimport für das Lehrercockpit, über Integrations-PR #162; HEAD-Merge `13715d24673c2dcf4bca4b420f227b06602c65fc`.
- **Wichtig:** Diese Integrations-Merges sind noch keine Gesamtabnahme. Ursprüngliche Draft-PRs sind weiterhin offen und `main` bleibt unverändert.

## Noch nicht aufgenommen / konkrete Hindernisse

| Original-PR | Funktion | Integrationsstand |
|---|---|---|
| #145 | Wochen-Check statt doppelter Planungszentrale | offen; `Planning Browser E2E` am Branch-HEAD fehlgeschlagen, erst reparieren |
| #149 | Vertretung & Übergabe | Integrations-PR #163 offen; GitHub meldet echten Mergekonflikt mit dem bereits integrierten Planungs-/Material-Zweig. Nicht blind überschreiben |
| #150–152, #155–157 | Notenmappe, Feedback, Statistik, KEL und PowerPoint | noch nicht integriert; Branch #157 enthält die Entwicklungskette #150→#151→#152→#155→#156→#157, dabei #153/#154 **nicht** automatisch enthalten; historische Fehler aus #152/#156 im Gesamttest neu nachprüfen |
| #154 | klassenlokale Lernziel-Bewertungsmodelle | offen, mit Dossier/KEL aus der Notenkette abgleichen |
| #158 | Jahresbericht/Dossier/Jahresabschluss | offen, Überschneidung mit Dossier und Navigation prüfen |
| #159 | Lehrercockpit, Design, Wochenplan-, Tagesverhalten-, Karten- und Druckkorrekturen | offen; #159 ist unabhängig von Canva-PR #148 verzweigt. Cockpit-, Sidebar-, Widget-, Druck- und Planungsänderungen gezielt kombinieren statt eine Variante zu überschreiben |

## Verbindliche fachliche Abnahme

1. **Daten zuerst:** vorhandene Klassen, Schülerdossiers, Planungen, Notenmappe, KEL, Materialsammlungen und selbst erstellte Cockpit-Layouts mit anonymisierten Alt-JSON und verschlüsselten Backups öffnen, speichern, ab- und wieder anmelden; Export/Restore-Roundtrip ohne Datenverlust, keine wiederholte manuelle Backup-Einfuhr nötig. Persistenz lokal, Konto und dauerhaftes Server-Datenverzeichnis prüfen. Schlüssel/Personendaten nie in Logs.
2. **Regressions- und Integrationstests:** `npm run lint`, `npm test`, `npm run build`, Server-/Health-, E-Mail-/Session-, Offline/PWA- und die einschlägigen echten Browser-E2E; PR #145, #152 und #156 betreffende Fehler explizit reproduzieren und dauerhaft fixen.
3. **Lehrercockpit real:** reine weiße Fläche mit optionalem TEXT ohne Widget-Blockade, ohne Stift als unmittelbares Standardwerkzeug, Design/Farben/Papierarten, frei platzierbare Widgets, Canva-Hintergründe/Bild-Widgets, Birthday-Feieransicht, volle Lesbarkeit und sichere alte Layouts. 20-Ziel-Widgets nicht durch Löschen bestehender 108 Legacy-Widget-IDs erzwingen.
4. **Unterrichtsablauf:** Wochen-Check, Wochenplan inkl. Stundenentwürfen, Materialbibliothek, Vertretung, Klassenbuch und Jahresplan miteinander; Zähler für „vorbereitet“/„erledigt“ korrekt, kein doppelter Editor.
5. **Noten/Dossier/KEL:** originale Noten-/Punkte-/Prozent-/Gewichtungsformeln unverändert; differenzierte Leistung, Lernziele, Statistik, Jahresberichte und nur ausdrücklich ausgewählte, kindbezogene KEL-Evidenz/PowerPoint; keine fremden Schülerdaten in Elternansichten.
6. **Live-Fehler:** Klassenliste druckt ausschließlich über Druckzentrum, Karte funktioniert und behauptet keine genauen Positionen aus PLZ/Ort, Verhalten höchstens ein nichtkommentierter Tagessnapshot je Kind/Tag ohne alte Historie zu löschen.
7. **Release-Gate:** vor jeder Produktivänderung SSH-gestützt tatsächlichen Live-Commit, dauerhaftes `KLASSIO_DATA_DIR`, Backups und getesteten Rollback dokumentieren. Commitgebundenes Staging-ZIP ausschließlich aus fertig geprüftem GitHub-HEAD bauen, dann Browser-/Smartboard-Abnahme. 

## Überlappungen, die nicht mit pauschalem „ours/theirs“ aufgelöst werden dürfen

`Sidebar.tsx` (#145, #146, #147, #149, #151, #155, #156, #158, #159), `App.tsx` (#149, #151, #152, #155, #156, #159), `StudentDossier.tsx` (#152, #154, #155, #156, #158), `Unterrichtsmodus.tsx` (#148, #159), `WeeklyPlan.tsx` (#146, #159), `Gradebook.tsx` (#150, #151, #152, #155, #156), `src/types.ts` (#147, #148, #149, #154, #157, #158).

**Status ist nur dann „fertig“, wenn die Funktion im selben geprüften Integrations-HEAD vorhanden ist und anschließend bewusst in `main` übernommen wurde.**
