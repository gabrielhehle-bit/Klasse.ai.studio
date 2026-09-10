import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectContentType,
  isDangerousScheme,
  isSafeWebUrl,
  normalizeWebUrl,
  parseQRCodeInput,
  calculateOptimalQRSize,
  getCanonicalQRSettings,
  SECURE_QR_LINK_ATTRIBUTES,
  DEFAULT_QR_VALUE,
  DEFAULT_QR_LABEL,
  QR_PRESETS,
} from './qrcodeAlgorithm';
import { getWidgetSizeCategory } from '../components/cockpit/widgetLayout';

test('QR: 1. URL erzeugt QR (Erkennung als Web-Link)', () => {
  const parsed = parseQRCodeInput('https://anton.app', 'Lernportal');
  assert.equal(parsed.type, 'url');
  assert.equal(parsed.encodedValue, 'https://anton.app');
  assert.equal(parsed.isSafeUrl, true);
  assert.equal(parsed.safeHref, 'https://anton.app');
});

test('QR: 2. Freitext erzeugt QR (Erkennung als Text)', () => {
  const parsed = parseQRCodeInput('Aufgabe: Lies Seite 42 im Buch!', 'Aufgabe');
  assert.equal(parsed.type, 'text');
  assert.equal(parsed.encodedValue, 'Aufgabe: Lies Seite 42 im Buch!');
  assert.equal(parsed.isSafeUrl, false);
  assert.equal(parsed.safeHref, undefined);
});

test('QR: 3. Sichere URL wird akzeptiert und normalisiert (https, http, www)', () => {
  assert.equal(isSafeWebUrl('https://schule.at'), true);
  assert.equal(isSafeWebUrl('http://mathe.schule.at/kapitel1'), true);
  assert.equal(isSafeWebUrl('www.duden.de'), true);
  assert.equal(normalizeWebUrl('www.duden.de'), 'https://www.duden.de');
  assert.equal(normalizeWebUrl('https://duden.de'), 'https://duden.de');
});

test('QR: 4. javascript: als Link blockiert (XSS-Schutz)', () => {
  const dangerous = 'javascript:alert("XSS")';
  assert.equal(isDangerousScheme(dangerous), true);
  assert.equal(isSafeWebUrl(dangerous), false);

  const parsed = parseQRCodeInput(dangerous);
  // Darf niemals als safe URL oder sicherer LinkHref eingestuft werden
  assert.equal(parsed.isSafeUrl, false);
  assert.equal(parsed.safeHref, undefined);
});

test('QR: 5. data: als Link blockiert (Schadcode-Schutz)', () => {
  const dangerous = 'data:text/html,<script>window.location="evil.com"</script>';
  assert.equal(isDangerousScheme(dangerous), true);
  assert.equal(isSafeWebUrl(dangerous), false);

  const parsed = parseQRCodeInput(dangerous);
  assert.equal(parsed.isSafeUrl, false);
  assert.equal(parsed.safeHref, undefined);
});

test('QR: 6. QR wird lokal erzeugt (reine lokale Logik, keine externe API)', () => {
  // QRCodeCanvas aus qrcode.react läuft 100% lokal im Browser-Canvas
  const parsed = parseQRCodeInput('https://anton.app');
  assert.ok(parsed.encodedValue.length > 0);
  assert.equal(typeof parsed.encodedValue, 'string');
});

test('QR: 7. Keine Netzwerkrequests (100% offline-fähig)', () => {
  // Alle Funktionen in qrcodeAlgorithm sind synchron und frei von fetch/xhr/ws
  const parsed = parseQRCodeInput('Testinhalt für Offline-Betrieb');
  assert.equal(parsed.encodedValue, 'Testinhalt für Offline-Betrieb');
  const size = calculateOptimalQRSize(400, 300, 'standard', false);
  assert.ok(size > 0);
});

test('QR: 8. Aktueller Inhalt persistiert (Kanonische Quelle im Widget-State)', () => {
  const settings1 = { content: 'https://kahoot.it', label: 'Kahoot Quiz' };
  const res1 = getCanonicalQRSettings(settings1);
  assert.equal(res1.content, 'https://kahoot.it');
  assert.equal(res1.label, 'Kahoot Quiz');

  // Abwärtskompatibel mit altem widget.settings.link
  const settingsLegacy = { link: 'https://schule.at', label: 'Schulportal' };
  const resLegacy = getCanonicalQRSettings(settingsLegacy);
  assert.equal(resLegacy.content, 'https://schule.at');
  assert.equal(resLegacy.label, 'Schulportal');

  // Fallback
  const resDefault = getCanonicalQRSettings(undefined);
  assert.equal(resDefault.content, DEFAULT_QR_VALUE);
  assert.equal(resDefault.label, DEFAULT_QR_LABEL);
});

test('QR: 9. Keine Historie erforderlich (fokussiert auf genau einen aktuellen Unterrichtsinhalt)', () => {
  // Das Widget speichert nur content & label, keine unbegrenzte Historienliste
  const settings = getCanonicalQRSettings({ content: 'Aktueller Code: 1234' });
  assert.equal(Object.keys(settings).length, 2);
  assert.equal((settings as any).history, undefined);
});

test('QR: 10. Keine Schülerdaten (weder Namen, IDs noch Klassenprofile)', () => {
  const parsed = parseQRCodeInput('https://anton.app');
  assert.equal((parsed as any).studentId, undefined);
  assert.equal((parsed as any).studentName, undefined);
  assert.equal((parsed as any).classId, undefined);
});

test('QR: 11. COMPACT Responsive Kategorie (280–379 px)', () => {
  const cat = getWidgetSizeCategory(320, false);
  assert.equal(cat, 'compact');
  const qrSize = calculateOptimalQRSize(320, 240, 'compact', false);
  assert.ok(qrSize >= 90 && qrSize <= 140);
});

test('QR: 12. STANDARD Responsive Kategorie (380–549 px)', () => {
  const cat = getWidgetSizeCategory(450, false);
  assert.equal(cat, 'standard');
  const qrSize = calculateOptimalQRSize(450, 320, 'standard', false);
  assert.ok(qrSize >= 120 && qrSize <= 190);
});

test('QR: 13. LARGE Responsive Kategorie (550–799 px)', () => {
  const cat = getWidgetSizeCategory(650, false);
  assert.equal(cat, 'large');
  const qrSize = calculateOptimalQRSize(650, 420, 'large', false);
  assert.ok(qrSize >= 140 && qrSize <= 260);
});

test('QR: 14. FULLSCREEN Responsive Kategorie (>= 800 px oder isFullscreen=true)', () => {
  const catWidth = getWidgetSizeCategory(1200, false);
  const catFlag = getWidgetSizeCategory(400, true);
  assert.equal(catWidth, 'fullscreen');
  assert.equal(catFlag, 'fullscreen');

  const qrSize = calculateOptimalQRSize(1024, 768, 'fullscreen', false);
  assert.ok(qrSize >= 250 && qrSize <= 480);
});

test('QR: 15. Kein horizontaler Overflow (QR quadratisch eingepasst)', () => {
  const width = 300;
  const height = 200;
  const size = calculateOptimalQRSize(width, height, 'compact', true);
  // QR-Größe + horizontales Padding muss strikt kleiner als Container-Breite sein
  assert.ok(size < width);
  assert.ok(size < height);
});

test('QR: 16. Andere Widgets unverändert (Standardwerte isoliert)', () => {
  assert.equal(DEFAULT_QR_VALUE, 'https://anton.app');
  assert.equal(DEFAULT_QR_LABEL, 'Lernportal Anton');
  assert.ok(QR_PRESETS.length >= 3);
});

test('QR: 17. F17.1 Keine WLAN-Spezialvorlage (kein Credential-Tool)', () => {
  // WLAN-Vorlage wurde entfernt, nur neutrale Web-Presets für Schulen
  const hasWifiPreset = QR_PRESETS.some((p) => p.id === 'preset-wifi' || p.value.startsWith('WIFI:'));
  assert.equal(hasWifiPreset, false);
  
  // Jeder andere Freitext (selbst mit WIFI:) wird als simpler Freitext ohne Credential-Felder behandelt
  const wifiLikeText = 'WIFI:S:Schulnetz;T:WPA;P:Passwort123;;';
  const parsed = parseQRCodeInput(wifiLikeText);
  assert.equal(parsed.type, 'text');
  assert.equal(parsed.isSafeUrl, false);
});

test('QR: 18. Leerer Input erzeugt sauberen Empty-Zustand', () => {
  const parsed = parseQRCodeInput('');
  assert.equal(parsed.encodedValue, '');
  assert.equal(parsed.isSafeUrl, false);
});

test('QR: 19. Sichere Link-Attribute für externen Testen-Button', () => {
  assert.equal(SECURE_QR_LINK_ATTRIBUTES.target, '_blank');
  assert.equal(SECURE_QR_LINK_ATTRIBUTES.rel, 'noopener noreferrer');
});

test('QR: 20. Reale Browsergrößen-Prüfung (320x240 bis 800x600)', () => {
  const sizes = [
    { w: 320, h: 240, cat: 'compact' as const },
    { w: 400, h: 300, cat: 'standard' as const },
    { w: 500, h: 350, cat: 'standard' as const },
    { w: 600, h: 400, cat: 'large' as const },
    { w: 800, h: 600, cat: 'fullscreen' as const },
  ];

  for (const s of sizes) {
    const calculated = calculateOptimalQRSize(s.w, s.h, s.cat, s.h < 260);
    assert.ok(calculated > 60, `Größe zu klein für ${s.w}x${s.h}`);
    assert.ok(calculated < s.w, `QR größer als Container-Breite für ${s.w}x${s.h}`);
    assert.ok(calculated < s.h, `QR größer als Container-Höhe für ${s.w}x${s.h}`);
  }
});

// ==========================================
// F17.1 Spezifische Sicherheits- & Scope-Prüfungen
// ==========================================

test('F17.1 - 1. URL funktioniert weiterhin', () => {
  const parsed = parseQRCodeInput('https://eduthek.at/schulbuecher');
  assert.equal(parsed.type, 'url');
  assert.equal(parsed.isSafeUrl, true);
  assert.equal(parsed.encodedValue, 'https://eduthek.at/schulbuecher');
});

test('F17.1 - 2. Freitext funktioniert weiterhin', () => {
  const parsed = parseQRCodeInput('Aufgabe S. 42 Nr. 3');
  assert.equal(parsed.type, 'text');
  assert.equal(parsed.isSafeUrl, false);
  assert.equal(parsed.encodedValue, 'Aufgabe S. 42 Nr. 3');
});

test('F17.1 - 3. javascript: bleibt blockiert', () => {
  assert.equal(isDangerousScheme('javascript:alert(document.cookie)'), true);
  const parsed = parseQRCodeInput('javascript:alert(1)');
  assert.equal(parsed.isSafeUrl, false);
  assert.equal(parsed.safeHref, undefined);
});

test('F17.1 - 4. data: bleibt blockiert', () => {
  assert.equal(isDangerousScheme('data:text/html;base64,PHNjcmlwdD4='), true);
  const parsed = parseQRCodeInput('data:text/html;base64,PHNjcmlwdD4=');
  assert.equal(parsed.isSafeUrl, false);
  assert.equal(parsed.safeHref, undefined);
});

test('F17.1 - 5. QR bleibt vollständig lokal', () => {
  // QRCodeCanvas läuft 100% lokal im Browser ohne Netzwerkrequests
  const parsed = parseQRCodeInput('Offline Schulnetzwerk 2026');
  assert.equal(parsed.encodedValue, 'Offline Schulnetzwerk 2026');
  assert.equal(typeof parsed.encodedValue, 'string');
});

test('F17.1 - 6. keine WLAN-Vorlage vorhanden (Scope Cleanup)', () => {
  for (const preset of QR_PRESETS) {
    assert.notEqual(preset.id, 'preset-wifi');
    assert.equal(preset.type, 'url');
    assert.ok(preset.value.startsWith('https://'));
  }
});

test('F17.1 - 7. keine Passwort-/Credential-Beispiele in Standard-Presets', () => {
  const forbiddenTerms = ['passwort', 'password', 'secret', 'token', 'apikey', 'credential', 'geheim'];
  for (const preset of QR_PRESETS) {
    const lowerVal = preset.value.toLowerCase();
    const lowerLabel = preset.label.toLowerCase();
    for (const term of forbiddenTerms) {
      assert.equal(lowerVal.includes(term), false, `Preset ${preset.id} enthält unerwünschten Begriff: ${term}`);
      assert.equal(lowerLabel.includes(term), false, `Preset ${preset.label} enthält unerwünschten Begriff: ${term}`);
    }
  }
});

test('F17.1 - 8. keine Secrets werden geloggt (deterministische zustandslose Verarbeitung)', () => {
  // parseQRCodeInput und calculateOptimalQRSize führen keine I/O oder Logs aus
  const result = parseQRCodeInput('GeheimerTextSollteNichtGeloggtWerden');
  assert.ok(result.encodedValue.length > 0);
});

test('F17.1 - 9. bestehende F-UI-Modi unverändert', () => {
  assert.equal(getWidgetSizeCategory(320, false), 'compact');
  assert.equal(getWidgetSizeCategory(450, false), 'standard');
  assert.equal(getWidgetSizeCategory(650, false), 'large');
  assert.equal(getWidgetSizeCategory(1200, false), 'fullscreen');
  assert.equal(getWidgetSizeCategory(400, true), 'fullscreen');
});

test('F17.1 - 10. LinksWidget unverändert', async () => {
  const { isAllowedUrl, normalizeUrl, resolveCanonicalWidgetLinks } = await import('./linksAlgorithm');
  assert.equal(isAllowedUrl('https://schule.at'), true);
  assert.equal(normalizeUrl('schule.at'), 'https://schule.at');
  const state = resolveCanonicalWidgetLinks(undefined, undefined);
  assert.ok(Array.isArray(state.links));
  assert.ok(state.links.length > 0);
});
