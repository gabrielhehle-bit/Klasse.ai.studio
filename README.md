# Klassio

Klassio ist eine digitale Arbeitsumgebung für Lehrkräfte mit Lehrercockpit,
Planung, Notenmappe, Diagnostik, Schülerdossiers, KEL-Präsentationen,
verschlüsselten lokalen Daten und optionalen KI-/Cloud-Funktionen.

## Source of Truth

Verbindliche Quelle ist ausschließlich GitHub:

- Repository: `gabrielhehle-bit/Klasse.ai.studio`
- Produktionsbasis: `main`
- Vor Änderungen immer aktuellen HEAD, Branches und Pull Requests prüfen.
- ZIP-Dateien sind nur Backup oder Release, niemals Entwicklungsgrundlage.

Details stehen in `KLASSIO_SOURCE_OF_TRUTH.md` und `KLASSIO_FEATURE_MATRIX.md`.

## Lokal starten

Voraussetzung: Node.js 18.20 oder neuer.

```bash
npm install
npm run dev
```

Die vollständige Konfigurationsvorlage steht in `.env.example`.
Lokale `.env`-Dateien und Secrets werden niemals in Git eingecheckt.

## Anmeldung

Klassio unterstützt zwei Zugangswege:

1. **Schul-E-Mail + Einmalcode:** Wenn SMTP konfiguriert ist, kann ein sechsstelliger,
   zehn Minuten gültiger Code an freigegebene Schul-Domains gesendet werden.
2. **Administrativer Zugangscode:** `LEHRERAPP_ACCESS_TEAM` bzw.
   `LEHRERAPP_ACCESS_EXTERNAL` bleibt als kontrollierter Fallback bestehen.

Eine erfolgreiche Anmeldung setzt eine HttpOnly-Session für bis zu 30 Tage.
Sie ersetzt nicht den lokalen Datentresor: dessen AES-256-Schlüssel bleibt getrennt
und wird weder per E-Mail versendet noch serverseitig gespeichert.

Für den E-Mail-Login werden benötigt:

```env
LEHRERAPP_ALLOWED_EMAIL_DOMAINS=vsfoa.vobs.at
SMTP_HOST=smtp.example.at
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=Klassio <klassio@example.at>
```

Mehrere erlaubte Domains werden durch Kommas getrennt.

## Produktionsprüfung

```bash
npm run lint
npm test
npm run build
npm start
```

Der Build erzeugt die Web-App und den gebündelten Server im Ordner `dist`.
Der Server stellt `/api/health` für den Runtime-Smoke-Test bereit.

## Optionale Integrationen

- KI: `GEMINI_API_KEY`
- OneDrive: `MICROSOFT_CLIENT_ID` und `MICROSOFT_CLIENT_SECRET`
- Canva: `CANVA_CLIENT_ID`, `CANVA_CLIENT_SECRET` und optional
  `CANVA_TOKEN_ENCRYPTION_KEY`
- E-Mail-Anmeldung: SMTP-Werte und `LEHRERAPP_ALLOWED_EMAIL_DOMAINS`

Zugangsdaten, API-Schlüssel, SMTP-Passwörter und OAuth-Secrets dürfen niemals
direkt in Quellcodedateien oder Commits gespeichert werden.
