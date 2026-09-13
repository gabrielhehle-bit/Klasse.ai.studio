# Klassio – Feature Matrix / Reconciliation

Legende:

- ✅ bestätigt vorhanden
- 🟡 vorhanden, aber Reconciliation/Regressionstest nötig
- 🔴 fehlt oder ist gegenüber beschlossener Produktlogik regrediert
- ⚪ bewusst noch offen / noch nicht implementiert

Stand: 2026-09-13

| Bereich | Status | Verbindliches Soll / Prüfauftrag |
|---|---:|---|
| Source of Truth | 🔴 | GitHub `main` muss nach Reconciliation alleinige Quelle werden |
| Sidebar / Hauptnavigation | 🟡 | vereinfachte Alltagsnavigation aus classroom-usability beibehalten und gegen spätere UX-Entscheidungen prüfen |
| Dashboard / Heute im Blick | 🟡 | kompakter Tagesfokus, direkte Wege zu Anwesenheit, Cockpit, Wochenplan, Notenmappe |
| Klassio Designsystem | 🟡 | Off-White/Weiß/Graphit/Petrol, Theme-System, Typografie getrennt von Farbwelt |
| Lehrercockpit – weiße Fläche | 🟡 | eine gemeinsame weiße Fläche für Schreiben, Zeichnen und Widgets |
| Lehrercockpit – leerer Start | 🟡 | keine Beispielwidgets, keine Beispiel-Layouts, keine vorgefüllte Schnellwahl |
| Cockpit Widget-Bereinigung | 🔴 | entfernte Gimmick-Widgets nicht wieder einführen; Fachtools in Fachmodule verschieben |
| Cockpit Runtime | 🟡 | tldraw/useEditor-Kontextfehler dauerhaft beheben und testen |
| Anwesenheit & Befinden | 🟡 | gemeinsame Datenlogik, 5 Befindensstufen, kein Auto-Speichern als anwesend |
| Schülerliste | 🟡 | reduzierte Standardansicht; Dossier Hauptaktion; kritische Flags nur Anzeige |
| Schülerdossier | 🟡 | 5 Bereiche; keine erfundenen pädagogischen Aussagen |
| Stammdaten | 🟡 | Fotoerlaubnis 3 Stufen, echte Abbrechen-Funktion, keine erfundenen Elternkontakte |
| Förderprofil | 🟡 | Ziele, Maßnahmen, Zuständigkeiten, Status |
| Notenmappe – Noten/Prozent/Punkte | 🟡 | alle drei Bewertungsmodi fachbezogen erhalten |
| Notenmappe – Abschnitte je Fach | 🟡 | keine Übernahme von Bezeichnungen in andere Fächer |
| Gewichtungen | 🟡 | fach-/klassenbezogen, kompatibel mit bestehender Datenstruktur |
| Neue Bewertung | 🟡 | Spalte erst bei Speichern; Abbrechen hinterlässt keine Leerspalte |
| Sonstige Leistung | 🟡 | darf niemals als WOPL gespeichert werden |
| Schularbeiten | 🟡 | keine erfundenen Wort-/Fehlerwerte oder pädagogischen Interpretationen |
| Mitarbeit | 🔴 | spätere schnelle Alltags-UX gegen Projektanforderungen rekonstruieren |
| Hausübungen | 🔴 | spätere Hausübungs-UX gegen Projektanforderungen rekonstruieren |
| Wochenplan | 🟡 | Vollbild, Excel-Roundtrip, nicht-destruktiver Import, Aufgabenblattgenerator |
| Jahresplan | 🟡 | Vollbild, Excel-Roundtrip, mehrere Themen pro Fachwoche |
| Planungszentrale | 🟡 | aktuelle Woche, Jahresplan, Material, Vertretung zuerst; Werkzeuge nachrangig |
| Materialbibliothek | 🟡 | Material -> Wochenplan; Ergänzen/Ersetzen; keine Duplikate beim Bearbeiten |
| Vertretungsplan | 🟡 | nur echte Stunden-/Wochenplandaten; keine eingebauten vertraulichen Beispielhinweise |
| Druckzentrum | 🟡 | bestehende Druckbereiche erhalten |
| Diagnostik | 🟡 | bestehende fachliche Engine erhalten, UI später vereinfachen |
| Österreich Ferien 2026/27 | 🟡 | alle 9 Bundesländer, Vorarlberg offiziell gegengeprüft |
| Lokale Verschlüsselung | 🟡 | AES-GCM-256; keine sensiblen Klartext-Nebenspeicher |
| JSON-Backup | 🟡 | AES-GCM/PBKDF2; Legacy-Import mit Warnung; echter Altbackup-Test fehlt |
| OneDrive | 🟡 | vor Upload verschlüsseln; OAuth-Tokens nicht dauerhaft lokal speichern |
| Smartboard-Sync | 🟡 | E2E; Server nur Ciphertext; Schlüssel nicht serverseitig |
| KI | 🟡 | Gemini-Key nur Backend; zentrale Pseudonymisierung fail-closed |
| Magic-Code E-Mail Login | ⚪ | Architektur noch offen; nicht als bestehende Funktion behandeln |
| Tresor / vertrauenswürdiges Gerät | ⚪ | UX/Architektur noch finalisieren |
| Recovery per E-Mail | ⚪ | Account-Recovery strikt von Datenentschlüsselung trennen |
| PowerPoint mit Grafiken | 🔴 | im aktuellen Stand nicht bestätigt; gezielt rekonstruieren/implementieren |
| Canva-Integration | 🔴 | im aktuellen Stand nicht bestätigt; gezielt rekonstruieren/implementieren |
| PWA / Service Worker | 🟡 | Build vorhanden; API nicht cachen; Runtime erneut prüfen |
| World4You | 🟡 | Build/Health intern ok; öffentliche Node-Routen bei Shared Hosting noch ungelöst |
| Tests | 🟡 | Tests aus `fix/pre-deployment-blockers` vollständig behalten und mit BF/BG-Tests ergänzen |
| Browser-Walkthrough | 🔴 | nach Reconciliation Seite für Seite durchführen |

## Reconciliation-Quellen

Zu prüfen und gezielt zusammenzuführen:

- `fix/pre-deployment-blockers`
- `feat/classroom-usability` (bereits in obigem Branch enthalten)
- `Klassio_Phase_BE_Final_Walkthrough_Sourcecode.zip`
- `Klassio_Phase_BF_SourceOfTruth_Merge_Sourcecode.zip`
- BG/BG2/BG3-Hotfixes
- `klasse.ai.studio(5).zip`
- projektweite Produktentscheidungen und spätere UX-Anforderungen

## Freigaberegel

Kein Haken wird allein aufgrund eines früheren Chat-Berichts gesetzt. Für ✅ ist mindestens Codeprüfung plus – wenn runtime-relevant – echter Browser-/Testnachweis nötig.
