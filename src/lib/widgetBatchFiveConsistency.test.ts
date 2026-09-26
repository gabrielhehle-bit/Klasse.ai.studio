import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  cockpitWidgetSupportsSettings,
  getCockpitWidgetDisplayLabel,
} from './cockpitWidgetCatalog';

const surface = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const qr = readFileSync('src/components/cockpit/widgets/QRCodeWidget.tsx', 'utf8');
const links = readFileSync('src/components/cockpit/widgets/LinksWidget.tsx', 'utf8');
const image = readFileSync('src/components/cockpit/widgets/ImageWidget.tsx', 'utf8');

test('Batch 5: Ressourcen-Widgets verwenden kanonische kurze Titel', () => {
  assert.equal(getCockpitWidgetDisplayLabel('qrcode'), '🔗 QR-Code');
  assert.equal(getCockpitWidgetDisplayLabel('links'), '🔗 Materialien & Links');
  assert.equal(getCockpitWidgetDisplayLabel('image'), '🖼️ Tafelbild');

  assert.doesNotMatch(qr, />\s*QR-Code für die Klasse\s*<\/span>/);
  assert.doesNotMatch(links, />\s*Materialien & Links\s*<\/span>/);
});

test('Batch 5: gemeinsame Zahnraeder oeffnen echte Einstellungen', () => {
  assert.equal(cockpitWidgetSupportsSettings('qrcode'), true);
  assert.equal(cockpitWidgetSupportsSettings('image'), true);
  assert.equal(cockpitWidgetSupportsSettings('links'), true);

  assert.match(qr, /showSettings = false/);
  assert.match(qr, /aria-label="QR-Code einstellen"/);
  assert.match(qr, /onCloseSettings\?\.\(\)/);
  assert.match(qr, /Beschriftung/);
  assert.match(qr, /Link oder Text/);

  assert.match(image, /showSettings = false/);
  assert.match(image, /aria-label="Tafelbild einstellen"/);
  assert.match(image, /Anderes Bild wählen|Bild auswählen/);
  assert.match(image, /Materialbibliothek/);
  assert.match(image, /Beschriftung/);

  assert.match(links, /showSettings: externalShowSettings/);
  assert.match(links, /const isManaging = hasExternalSettingsControl \? externalShowSettings : localManaging/);
  assert.match(links, /Link-Einstellungen schließen/);

  assert.match(
    surface,
    /<QrCodeWidgetContent[\s\S]{0,900}showSettings=\{\s*widgetSettingsOpenId === widget\.id\s*\}/,
  );
  assert.match(
    surface,
    /<ImageWidgetContent[\s\S]{0,900}showSettings=\{\s*widgetSettingsOpenId === widget\.id\s*\}/,
  );
  assert.match(
    surface,
    /<LinksWidgetContent[\s\S]{0,1000}showSettings=\{widgetSettingsOpenId === widget\.id\}/,
  );
});

test('Batch 5: neutrale Ressourcen-Aktionen folgen der Profil-Akzentfarbe', () => {
  assert.match(qr, /bg-accent text-accent-text/);
  assert.match(qr, /hover:bg-accent-hover/);
  assert.match(qr, /focus:ring-2 focus:ring-accent/);

  assert.match(links, /bg-accent px-3 text-xs font-black text-accent-text/);
  assert.match(links, /ring-2 ring-accent-soft/);
  assert.match(links, /bg-accent-soft text-accent/);

  assert.match(image, /bg-accent hover:bg-accent-hover/);
  assert.match(image, /focus:border-accent/);
  assert.match(image, /border-accent/);
});

test('Batch 5: Datenschutz-, Fehler- und Loeschfarben bleiben semantisch', () => {
  assert.match(qr, /100 % lokal generiert/);
  assert.match(qr, /Kein Schülertracking/);
  assert.match(qr, /bg-rose-100/);
  assert.match(qr, /ShieldCheck/);

  assert.match(image, /externen Bild-URLs wird die angegebene Website beim Laden kontaktiert/);
  assert.match(image, /bg-rose-50/);
  assert.match(image, /text-rose-500/);

  assert.match(links, /text-red-500/);
  assert.match(links, /SECURE_LINK_ATTRIBUTES/);
});

test('Batch 5: zentrale Ressourcen-Aktionen bleiben touchfreundlich', () => {
  assert.match(qr, /min-h-11/);
  assert.match(image, /min-h-11/);
  assert.match(links, /min-h-11/);
  assert.match(links, /min-w-11/);
});
