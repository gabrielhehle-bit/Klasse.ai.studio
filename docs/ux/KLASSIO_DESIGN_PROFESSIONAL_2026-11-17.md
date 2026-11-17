# KLASSIO – professionelles Erscheinungsbild (17. November 2026)

## Leitlinie
KLASSIO soll sich wie eine solide, alltäglich nutzbare Schulsoftware anfühlen – nicht wie eine Demo mit übermäßigen Farbverläufen, Leuchteffekten, Mikrotypografie oder ständig animierten Karten. Ein klarer Arbeitsbereich, ruhige Statusanzeigen und erkennbare Hauptaktionen stehen im Vordergrund.

**Nicht gemeint:** Kinderfreundliche Unterrichtswerkzeuge entfernen, vorhandene Themen erzwingen oder hilfreiche KI-Funktionen verstecken. Spielerische Darstellungen dürfen in ausdrücklich pädagogischen Bereichen bestehen bleiben.

## Designentscheidungen
1. **Farben:** Für `classic_light` neutrale, leicht kühle Arbeitsflächen und dunkelgraue Schrift. Petrol ist eine bewusst sparsame Akzentfarbe für fokussierte/aktive Aktionen. Andere auswählbare Designs, persönliche Akzentfarben und Dark Mode bleiben unverändert.
2. **Typografie:** `Inter` im Classic-Design; echte Seitentitel in der Topbar, lesbare 12–16px-Beschriftungen statt 8–10px-Metadaten in den Haupt-Navigationen. Keine künstlich weit gesperrten Versalien in der Seitenleiste.
3. **Navigation:** Aktive Seite mit ruhigem Hintergrund und schmalem Akzentindikator anstelle vollflächiger Farbkachel. Schuljahr, Profil und Klassenwechsel sichtbar, ohne Schmuckverlauf.
4. **Einstiegskarten:** Klasse, Planung und Leistungen nutzen dieselben neutralen Karten, gedämpfte Icon-Flächen, leicht erkennbare Pfeile und Fokuszustände. Kein optisches Hüpfen beim Hover.
5. **Details:** Weniger dominante Rundungen/Schatten und ein funktionales statt dekorativ funkelndes Symbol für den Einfachmodus.
6. **Intuitivität:** Alle bisherigen Ziele, Schreib- und Druckvorgänge, Klassenwechsel, Konto-/Gerätesynchronisierung und Personalisierungen bleiben erhalten.

## Gegenstand dieser konkreten PR
- `src/index.css`: nur Default- und `classic_light`-Palette, keine Umgestaltung anderer Themen.
- `src/ui-polish.css`: kleine Anpassung gemeinsamer Radien/Schatten.
- `src/components/Sidebar.tsx`: ruhigere Hierarchie, aktive Navigation, lesbarer Klassenwechsel, Tastaturzugang.
- `src/components/Topbar.tsx`: sachlicher Seitenheader ohne Glaseffekt, Titellinie auch mobil, klarer Backup-/Hilfe-Zugang.
- `src/components/KlasseHub.tsx`, `PlanungHub.tsx`, `LeistungenHub.tsx`: einheitliche Einstiegskarten.
- `src/components/settings/SettingsHeader.tsx`: neutrales Symbol für den Einfachmodus.
- `src/lib/professionalWorkspaceDesign.test.ts`: statische Regressionstests für visuelle Konsistenz, Navigation und bestehende Aktionen.

## Freigabeschritte
Die relevanten GitHub-Checks für Feature Validation, Planung und Synchronisierung müssen erfolgreich sein. Ein Merge nach `main` allein ist kein Live-Nachweis: World4You und die exakte `/api/release`-Version separat prüfen. Für echte visuelle Abnahme zusätzlich mindestens einen Browser-/Geräte-Screenshot in 360px und Desktop-Breite prüfen und ggf. Kontrast, Zeilenumbrüche und Sichtbarkeit korrigieren.

## Noch nicht abgenommen
Ein vollständiger Bild-für-Bild-Review aller Spezialmodule, zwei reale Schulaccounts in derselben Klasse und ein echter Drucktest sind durch diese Designarbeit nicht ersetzt. Lehrercockpit bleibt wie vereinbart zurückgestellt.
