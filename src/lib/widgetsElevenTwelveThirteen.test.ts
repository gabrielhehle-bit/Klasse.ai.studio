import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getCanonicalQRSettings, parseQRCodeInput } from './qrcodeAlgorithm';
import { resolveCanonicalWidgetLinks, addLink, isAllowedUrl } from './linksAlgorithm';
import { getCanonicalImageSettings, isSafeImageUrl, calculateDownscaledDimensions } from './imageAlgorithm';

const dice = readFileSync('src/components/cockpit/CockpitWidgetContents.tsx', 'utf8');
const board = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const image = readFileSync('src/components/cockpit/widgets/ImageWidget.tsx', 'utf8');
const qr = readFileSync('src/components/cockpit/widgets/QRCodeWidget.tsx', 'utf8');
const links = readFileSync('src/components/cockpit/widgets/LinksWidget.tsx', 'utf8');

test('Widget 11 dice: preserve valid legacy dice, bound 1–6 and keep modes/restored results on board', () => {
  const code = dice.slice(dice.indexOf('type ClassroomDiceMode ='), dice.indexOf('// --- AI Quiz & Riddle Helpers ---'));
  assert.ok(code.length > 1000);
  assert.match(code, /validDice\(widget\?\.settings\?\.diceValues\)/);
  assert.match(code, /diceValues: values, diceMathMode: mode/);
  assert.match(code, /values\.every\(value => Number\.isInteger\(value\)/);
  assert.match(code, /dice\.length < 6/);
  assert.match(code, /dice\.length > 1/);
  assert.match(code, /if \(rollTimerRef\.current\) return;/);
  assert.match(code, /return \(\) => \{ if \(rollTimerRef\.current\) clearInterval/);
  assert.match(code, /aria-pressed=\{dice\.length === num\}/);
  assert.match(code, /aria-pressed=\{mathMode === item\.mode\}/);
  assert.match(code, /role="button" tabIndex=\{0\}/);
  assert.match(board, /<DiceWidgetContent\s+widget=\{widget\}\s+onUpdate=/);
});

test('Widget 12 image: never directly mutate widget props, keep legacy compatible data and warn on external fetch', () => {
  assert.match(image, /onUpdate\(\{ settings: \{ \.\.\.\(widget\.settings \|\| \{\}\), \.\.\.merged \} \}\)/);
  assert.doesNotMatch(image, /widget\.settings\s*=/);
  assert.match(image, /window\.confirm\('Ein externes Bild lädt Daten/);
  assert.match(image, /\!\/\^https:/);
  assert.match(image, /Externes Bild wird vom angegebenen Server geladen/);
  assert.equal(isSafeImageUrl('javascript:alert(1)'), false);
  assert.equal(isSafeImageUrl('https://schule.at/mathe.png'), true);
  assert.equal(getCanonicalImageSettings({ imageUrl: 'data:image/png;base64,dGVzdA==', rotation: 90 }).rotation, 90);
  assert.deepEqual(calculateDownscaledDimensions(4096, 2048), { width: 2048, height: 1024, wasResized: true });
});

test('Widget 13 QR + link: empty QR remains empty and existing lists/legacy settings survive', () => {
  assert.equal(getCanonicalQRSettings({ content: '', link: 'https://anton.app' }).content, '');
  assert.equal(getCanonicalQRSettings({ content: '', label: '' }).label, '');
  assert.equal(getCanonicalQRSettings({ link: 'https://schule.at/lesen' }).content, 'https://schule.at/lesen');
  assert.equal(parseQRCodeInput('https://anton.app').isSafeUrl, true);
  assert.equal(parseQRCodeInput('javascript:alert(1)').isSafeUrl, false);
  const original = [{ id: 'own', title: 'Mathe', url: 'https://anton.app' }];
  const existing = resolveCanonicalWidgetLinks({ linksState: { links: original } }, []);
  assert.equal(existing.shouldPersistMigration, false);
  assert.equal(existing.links[0].id, 'own');
  assert.deepEqual(resolveCanonicalWidgetLinks({ linksState: { links: [] } }, original).links, []);
  assert.equal(isAllowedUrl('javascript:alert(1)'), false);
  assert.equal(addLink([], { title: 'Lesen', url: 'https://schule.at/lesen' }).success, true);
  assert.match(qr, /<LinksWidget widget=\{widget\} app=\{app\} onUpdate=\{onUpdate\}/);
  assert.match(qr, /persistSettings\(inputVal, inputLabel, true\)/);
  assert.match(qr, /new TextEncoder\(\)\.encode\(contentInfo\.encodedValue\)\.length > 1000/);
  assert.match(qr, /role="dialog" aria-modal="true" aria-label="QR-Code Großanzeige"/);
  assert.match(qr, /document\.body/);
  assert.match(qr, /setCopyError\(true\)/);
  assert.match(links, /linksState: \{/);
  assert.match(board, /<QrCodeWidgetContent\s+widget=\{widget\}\s+app=\{app\}/);
});
