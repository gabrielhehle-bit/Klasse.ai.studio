import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '..', 'components', 'AIAssistant.tsx'), 'utf8');
const prompts = readFileSync(join(here, '..', 'kiSystemPrompts.ts'), 'utf8');

test('KI-Helfer: Lernzielkontext wird nur bei aktivem Klassenkontext ergänzt', () => {
  assert.match(
    source,
    /if \(useClassContext && modusId === 'ki-lernziele' && activeMessages\.length === 0\)/,
  );
  assert.match(source, /buildAiLearningGoalContext\(app\)/);
  assert.doesNotMatch(source, /student_lernziele_/);
  assert.doesNotMatch(source, /studentProgressStr/);
});

test('KI-Helfer: Chatverläufe sind an die aktive Klasse gebunden', () => {
  assert.match(source, /getAiChatHistoryKey\(app\.activeClassId, tab\)/);
  assert.match(source, /getAiChatHistory\(/);
  assert.match(source, /\[app\.activeClassId\]/);
  assert.match(source, /activeChatHistory\.slice\(0, 4\)/);
  assert.doesNotMatch(source, /app\.aiChats\?\.\[activeTab\]/);
});

test('KI-Helfer: sensible Remote-Prompts werden nicht in die Browser-Konsole geschrieben', () => {
  assert.match(source, /Sync-Prompt empfangen/);
  assert.doesNotMatch(source, /Processing sync prompt from mobile phone.*remotePrompt\.text/);
});

test('KI-Helfer: Fotoanalyse akzeptiert nur unterstützte Bildformate und 8 MB', () => {
  assert.match(source, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(source, /\['image\/jpeg', 'image\/png', 'image\/webp'\]\.includes\(file\.type\)/);
  assert.match(source, /file\.size > 8 \* 1024 \* 1024/);
  assert.match(source, /fkPrivacyConfirmed/);
});

test('KI-Helfer: Status- und Mobilbeschriftung sind verständlich', () => {
  assert.match(source, /fetch\('\/api\/ai\/status'\)/);
  assert.match(source, />KI-Helfer<\/span>/);
  assert.doesNotMatch(source, />AI Expert<\/span>/);
});


test('KI-Helfer: Systemprompts enthalten keine schulspezifische Oberau-Altlast', () => {
  assert.doesNotMatch(prompts, /Oberau/i);
  assert.match(prompts, /aggregierten Lernziel-Einschätzungen/);
});
