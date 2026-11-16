# KLASSIO – abschließende UX-Gesamtprüfung (16. November 2026)

## Umfang
Prüfung der Navigation, Schaltflächen, Begriffe, mobilen Erreichbarkeit und Release-Nachweise in den Hauptpfaden **Einstellungen**, **Klassenteam/Teamteaching** und **Druckzentrum**. Die Prüfung verbindet eine gezielte Codeinspektion und vorhandene automatisierte Browserprüfungen; sie ist **kein** vollständiger Praxistest mit zwei realen Schulaccounts auf physischen Geräten.

## Nachweise vor diesem Prüfvermerk
- PR #649: Lesbarer Status im Handy-Schnellmodus, erkennbare aktive Einstellungen-Reiter und 360px-Chrome-Browserpfad integriert.
- PR #648: Echte Chrome-Prüfung der A4-Vorschau, Druckformat-Zugang und zoomfähigen Vorschau.
- Klassenteam: eine primäre Lehrpersonen-Aktion „Jetzt synchronisieren“; Senden/Laden und Konfliktbearbeitung liegen unter „Weitere Möglichkeiten bei Problemen“.
- GitHub-main-Stand **5aac391edf31ebcd9e864bd0fb2e96bd70297e4c**: Produktionslauf #43853659236 erfolgreich inklusive Public-Health und öffentlichem Commit-Abgleich für klassio.at.
- PR #650 / Head **ffcc07e2fd663f44a9b7671423b60a93b5bc5eb1**: bei der Detailprüfung gefundene 24px-Touchflächen bei den Schaltern „Einfachmodus“ und „Backup-Erinnerungen“ auf mindestens 44px vergrößert, bei unverändert 24px sichtbarer Schalterspur. Automatisierte Validierung, Teamteaching-, Konto-Zweigeräte-, Schulverifizierungs- und Sicherheitsprüfungen waren grün.
- Der Code von PR #650 ist als Squash-Commit **a0f9059775d9d6a1e671e0bdccf11428c0da20a4** auf `main` vorhanden. Ein Connector-Timeout ließ die PR-Metadaten anschließend zunächst offen und löste zunächst keinen nachweisbaren Produktionslauf für diesen neuen Commit aus. Dieser Prüfvermerk dient zugleich dem erneuten Anstoß der normalen main-Pipeline; der neue Live-Stand darf erst nach deren Bestätigung als veröffentlicht gelten.

## UX-Abnahme
- **Begriffe:** „Klassenteam öffnen“, „Jetzt synchronisieren“, „Vorlagen & Tipps“, „Druckformat anpassen“, „A4-Vorschau ansehen“ bezeichnen konkrete Tätigkeiten; technische Konfliktaktionen bleiben im Ausnahmebereich.
- **Schaltflächen:** Wesentliche Navigation und normale Hauptaktionen sind beschriftet. Die zwei aufgefallenen zu kleinen Einstellungs-Schalter wurden behoben. Für selten benutzte Detailaktionen im umfangreichen Druckzentrum ist keine flächendeckende 44px-Garantie durch diese Prüfung ausgesprochen.
- **Mobil:** 360px-Chrome-E2E prüft Schnellmodus, Speicherstatus, Navigation, Einstellungen-Deep-Link und fehlende Seiten-Überläufe. Dies ersetzt keinen Handgeräte-Test unter iOS/Android.
- **Druck:** KEL-Elternblatt darf private Beobachtungen nur nach individueller Auswahl ausgeben; A4-Ausdrucke und Unterschriftsbereiche sind browserbasiert geprüft.

## Noch nicht als abgeschlossen behaupten
1. Praxistest mit **zwei realen Lehrpersonen** und deren echten, berechtigten Geräten, inklusive Konfliktsituation im Teamteaching.
2. Sichtprüfung auf mindestens einem echten Android-/iOS-Smartphone und Surface-Gerät.
3. Für den nach diesem Prüfvermerk aktuellen main-Commit erneute CI-/Produktionsfreigabe inklusive `/api/release`-Gleichheit mit dem produktiven Server.

Keine echten Schülerdaten oder personenbezogenen Datensätze wurden für diesen Prüfvermerk verwendet.
