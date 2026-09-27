import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/components/cockpit/NewWidgets.tsx', 'utf8');
const start = source.indexOf('export const MoneycalcWidgetContent');
const end = source.indexOf('// 33. WIDGET: STORY-EMOJIS', start);
const widget = source.slice(start, end);

test('Taschengeld-Zähler trennt Geld zählen und passend zahlen sauber', () => {
  assert.match(widget, /const enterCountMode = \(\) =>/);
  assert.match(widget, /const enterQuizMode = \(\) =>/);
  assert.match(widget, /role="tablist"/);
  assert.match(widget, /aria-selected=\{activeTab === 'count'\}/);
  assert.match(widget, /aria-selected=\{activeTab === 'quiz'\}/);
});

test('Taschengeld-Zähler erzeugt beim Levelwechsel genau eine neue Aufgabe', () => {
  assert.doesNotMatch(widget, /useEffect\(\(\) => \{[\s\S]*startNewQuiz/);
  assert.match(widget, /const changeDifficulty = \(diff:/);
  assert.match(widget, /setDifficulty\(diff\);[\s\S]*startNewQuiz\(diff\)/);
});

test('Taschengeld-Zähler gruppiert gleiche Münzen und Scheine statt Mini-Chips zu stapeln', () => {
  assert.match(widget, /const groupedItems = useMemo/);
  assert.match(widget, /item\.count \+= 1/);
  assert.match(widget, /Ein Stück entfernen/);
  assert.match(widget, /×\{item\.count\}/);
});

test('Taschengeld-Zähler hat touchfreundliche Geld- und Aktionsflächen', () => {
  assert.match(widget, /min-h-14 rounded-lg border-2/);
  assert.match(widget, /min-h-12 min-w-12 rounded-full/);
  assert.match(widget, /min-h-11 px-3 rounded-xl bg-accent/);
  assert.doesNotMatch(widget, /text-\[(?:5\.5|6|6\.5|7|7\.5|8)px\]/);
});

test('Taschengeld-Zähler nutzt KLASSIO-Akzent und semantisches Quizfeedback', () => {
  assert.doesNotMatch(widget, /indigo-/);
  assert.match(widget, /bg-accent text-accent-text/);
  assert.match(widget, /bg-emerald-50/);
  assert.match(widget, /bg-amber-50/);
  assert.match(widget, /bg-rose-50/);
  assert.match(widget, /aria-live="polite"/);
});

test('Taschengeld-Zähler besitzt keine eigene vertikale Scrollfläche oder doppelten Innentitel', () => {
  assert.doesNotMatch(widget, /overflow-y-auto/);
  assert.doesNotMatch(widget, />\s*💶 Taschengeld-Zähler\s*</);
  assert.match(widget, /min-h-full w-full/);
  assert.match(widget, /overflow-visible/);
});


test('Taschengeld-Zähler zeigt Zielrelation und verständlichen Lernfortschritt', () => {
  assert.match(widget, /const targetProgress =/);
  assert.match(widget, /Fortschritt zum Zielbetrag/);
  assert.match(widget, /Noch \$\{formatEuro\(difference\)\} €/);
  assert.match(widget, /Ziel erreicht/);
  assert.match(widget, /bg-rose-500/);
  assert.match(widget, /bg-emerald-500/);
});

test('Taschengeld-Zähler benennt Geldstücke eindeutig und vermeidet irreführende Zählaufgabe', () => {
  assert.match(widget, /Geldbörse/);
  assert.match(widget, /Lege Geld hinein/);
  assert.doesNotMatch(widget, /Wie viel Geld ist es\?/);
  assert.match(widget, /aria-label=\{\`\$\{bill\.label\} hinzufügen\`\}/);
  assert.match(widget, /aria-label=\{\`\$\{coin\.label\} hinzufügen\`\}/);
  assert.match(widget, />Schein<\/span>/);
});
