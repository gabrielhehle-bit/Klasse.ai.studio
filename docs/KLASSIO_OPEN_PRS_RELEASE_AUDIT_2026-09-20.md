# KLASSIO – Audit aller offenen Pull Requests / Release-Candidate (20.09.2026, 09:08 MESZ)

**Source of truth:** GitHub `main` `b40f56f64ed9f8aeff57cb8a853ff2bf4a83042b` bei Beginn; vor Freigabe HEAD erneut prüfen. Im GitHub-API-Abruf waren **46 offene PRs**, darunter **39 Drafts**. Dieses Dokument ist eine **Abhängigkeits- und Release-Prüfung** nach PR-Metadaten, den aktuellen Diffs der Release-PRs und konkreten jüngsten Komponenten. Es behauptet keine vollständige manuelle Prüfung jeder Codezeile der 46 PRs.

## Kombinierter aktueller Kandidat (noch nicht freigeben)

| Ursprung | Integration in diesem Candidate | Stand/Grenze |
|---|---|---|
| #185 | Basis-HEAD 56bfbade | Cockpit/Papier, Text, Geburtstag nur unter Optionen; Klassenkasse direkt; Canva-OAuth und verschlüsselte Attachment-*Grundlagen*. Erweiterte Attachment-Funktion produktiv deaktiviert. Produktive Canva-Keys, persistente Pfade, Konto-/Backup-/Browserprüfung erforderlich. |
| #186 | technischer PR #193, Merge 097adfa0 | Todo-Widget mit Navigationsseiten. Nicht alle Legacy-Widgets ohne Innen-Scrollen, kein echter Smartboardtest. |
| #187 | technischer PR #194, Merge 2a16a35 | „Ich bin da“ A/B/C, Gruppenbildung mit zentralen Einstellungen, kinderbezogene Daten/Interaktionen. Browser/Privacy- und Tests offen. |
| #189 | technischer PR #195, Merge e7f1599 | Doppelte verschiebbare Pluspunkteliste aus Katalog/Ansicht entfernen; Schülerseitenleiste/gespeicherte Punkte behalten, historische Layouttypen lesbar. Im Candidate zusätzliche Katalog-Testkorrektur. |
| #190 | technischer PR #196, Merge 8d5dab0 | Volksschule Mellau `vsml.vobs.at`, Krumbach `vskr.vobs.at` behalten; Schultrennungs- und E-Mail-Browserprüfung erforderlich. |
| #191 | technischer PR #197, Merge be83c5e | Sonntag bleibt im Auto-Modus Sonntag, Ferien-/Feiertagsgrüße; Browserprüfung und Kalender-Grenzfälle offen. |
| #192 | **inhaltlich durch #185 abgedeckt, NICHT separat gemergt** | Stift/Radierer aus der externen Leiste entfernt, bisherige Zeichnungen weiter nur lesbar, 🎂 Geburtstag nur unter Optionen; die noch offene PR #192 baut direkt auf älterem main und würde die inzwischen veränderte `Unterrichtsmodus.tsx`-Datei überschreiben/konfliktieren. |

Die technischen Merges #193–#197 betreffen ausschließlich `feature/klassio-latest-release-candidate-20260920`, **nicht main und nicht klassio.at**. Für ein Produktiv-Release reicht ein erfolgreicher Merge in diesen Branch ausdrücklich nicht.

## Weitere ältere offene PRs – nicht stillschweigend mitmergen

- **#181/#182 (ältere Release-Kandidaten):** Der Diff gegen aktuelles `main` umfasst bei #182 nur acht zusätzliche Zeilen in `Unterrichtsmodus.tsx`. Der Beschreibungstext fordert ausdrücklich Stift/Radierer und einen separaten Geburtstags-Button; das widerspricht der neuesten Nutzerentscheidung. Nicht parallel mit #185/#192 mergen oder als neueste Gesamtversion deklarieren.
- **#168/#179 sowie #163/#164/#166/#167, #159/#158, #149–#157 und #145–#148:** Frühere, teilweise mehrstufige Reintegration von Planung, Material, Canva, Vertretung, Diagnostik/Jahresbericht, Statistik, Notenmappe und KEL. #168 ist gegenüber main als **dirty** markiert und ändert 129 Dateien (+6.996/-7.342). Hier dürfen keine großen historischen Branches auf main gespielt werden, ohne jede betroffene Funktion gegen den inzwischen integrierten main-Stand und die neue Kandidatenversion abzugleichen. Dokumentierte Arbeit kann teilweise schon in main enthalten sein; ein offener PR ist kein Beweis, dass Funktionen fehlen.
- **#123 und #99:** Konto-Sync/Lehrerzimmer bzw. PayPal/Textanalyse sind eigenständige, separat zu verifizierende sicherheits-/abrechnungsrelevante Vorhaben, ohne nachgewiesene Integration in diesen Release-Candidate.
- **#95/#93/#90/#89/#88/#87/#86/#85/#84/#83/#80/#79/#78/#77:** Ältere, gestapelte UX/Sidebar/Login/Schulregister/Deployment/Browser/Design/Lehrerzimmer-Branches. Deren Basiszweige und aktuelle Funktion in main separat diffen; nicht automatisch zusammenführen. Aktuelles `main` hat neuere konkurrierende Änderungen.

Dies deckt **alle 46 zum Prüfzeitpunkt offenen Nummern** ab: #192, #191, #190, #189, #187, #186, #185, #182, #181, #179, #168, #167, #166, #164, #163, #159, #158, #157, #156, #155, #154, #153, #152, #151, #150, #149, #148, #147, #146, #145, #123, #99, #95, #93, #90, #89, #88, #87, #86, #85, #84, #83, #80, #79, #78, #77. Geschlossene #188 ist ausdrücklich **nicht** zu reaktivieren.

## Noch blockierende Release-Gates

1. Neue vollständige Feature-Validation (TypeScript, `tsx --test src/lib/*.test.ts`, Produktionsbuild) auf **exakt dem finalen Candidate-HEAD**. GitHub Actions liefen beim Audit auf diversen aktuellen Heads noch `queued`/`in_progress`; alte grüne Builds sind kein Nachweis für den kombinierten HEAD.
2. Schulidentität/Teamteaching, Materialbibliothek sowie echte Browser-/Smartboardprüfungen mit synthetischen Daten: Anmeldung `vskr`/`vsml` und Schultrennung; alte verschlüsselte JSON-Backups/Restore; 17/25/30 Kinder im Cockpit; Befinden bleibt privat; alle Navigationsseiten/Touchgrößen; Sonntag/Ferien bei Vorarlberg und anderen Bundesländern.
3. **Noch nicht vollständig umgesetzt:** Die Nutzervorgabe „ALLE Einstellungen sämtlicher Widgets ausschließlich unter Widget hinzufügen“ ist im aktuellen Candidate für „Ich bin da“ und „Gruppen bilden“ umgesetzt. Viele übrige Legacy-Widgets haben weiterhin Einstellungen an alten Orten. Gleichfalls wurden nicht alle 108 Legacy-Widgettypen auf inneres Scrollen geprüft. Das darf nicht als bereits erledigt kommuniziert werden.
4. Die serverseitigen Canva-Token-/Attachment-Grundlagen aus #185 benötigen Prüfung des persistierten `KLASSIO_DATA_DIR`, der secrets/Backups und der Produktivkonfiguration. Die verschlüsselte externe Materialablage bleibt bewusst **deaktiviert**; keine höheren Datei-Limits oder bezahlten Speicherzusagen.
5. Vor Produktion: Test-/Freigabe-PR dieses Candidate nach `main`, CI auf finalem `main`, World4You-Release-ZIP **aus dem geprüften SHA** und dessen `KLASSIO_DEPLOYMENT_COMMIT.txt` prüfen, Server-Datenbackup + Rollback, Deployment über `deploy/deploy-release.sh <ZIP> <SHA>`, `/api/health`, tatsächlicher Browserlogin. **Kein ZIP aus älteren Google-AI-Studio-Ständen oder aus einem ungeprüften Draft verwenden.**

**Ergebnis des Audits:** Die aktuellen Nutzeränderungen sind in einem prüfbaren Kandidaten zusammengeführt. Sie sind **noch kein freigegebenes Produktionsrelease**; die 46 historisch offenen PRs ergeben keine automatisch konfliktfreie und getestete „Alles ist online“-Version.
