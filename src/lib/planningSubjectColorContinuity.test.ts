import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getFachHexColor, getFachThemeStyles } from './fachColorUtils';

const source = (path: string) => readFileSync(path, 'utf8');
const mobile = source('src/components/wochenplan/MobileDayLessonCards.tsx');
const weekly = source('src/components/WeeklyPlan.tsx');
const center = source('src/components/PlanungsZentrale.tsx');
const a4 = source('src/components/wochenplan/SchuelerWochenplanA4Sheet.tsx');
const generator = source('src/components/wochenplan/WochenplanGeneratorModal.tsx');
const css = source('src/weekly-plan-ux.css');
const main = source('src/main.tsx');

test('Standard subjects and explicitly chosen colors use the same configured fach color', () => {
  const config = {
    Deutsch: { color: '#bb6633' },
    Mathematik: { color: 'violet' },
    Musik: { color: '#20a0df' },
  };
  assert.equal(getFachHexColor('Deutsch', config), '#bb6633');
  assert.equal(getFachThemeStyles('Deutsch', config).hex, '#bb6633');
  assert.equal(getFachThemeStyles('Mathematik', config).hex, '#8b5cf6');
  assert.equal(getFachThemeStyles('Musik', config).hex, '#20a0df');
  assert.equal(getFachThemeStyles('Sachunterricht').hex, '#10b981');
  assert.equal(getFachThemeStyles('Bewegung und Sport').hex, '#14b8a6');
  assert.notEqual(getFachThemeStyles('Deutsch', config).bgLight, getFachThemeStyles('Mathematik', config).bgLight);
});

test('Fachfarben survive the neutral KLASSIO theme (including slate and custom HEX)', () => {
  assert.match(main, /import '\.\/weekly-plan-ux\.css'/);
  assert.match(css, /\[data-klassio-subject-card\]/);
  assert.match(css, /background-color: var\(--fach-card-bg\) !important/);
  for (const color of ['#eab308', '#123abc', '#64748b']) {
    const theme = getFachThemeStyles(color);
    assert.match(theme.bgLight, /^rgba\(\d+, \d+, \d+, 0\.10\)$/);
    assert.match(theme.hex, /^#[0-9a-f]{6}$/i);
  }
});

test('Mobile day cards use saved and timetable subject colors, with a distinct current status', () => {
  assert.match(mobile, /const subject = item\?\.fach \|\| app\.stammplan/);
  assert.match(mobile, /getFachThemeStyles\(subject, app\.fachConfig\)/);
  assert.match(mobile, /data-klassio-subject-card=\{subject \|\| undefined\}/);
  assert.match(mobile, /'--fach-card-bg': fachTheme\?\.bgLight/);
  assert.match(mobile, /borderLeftColor: fachTheme\?\.hex/);
  assert.match(mobile, /current && <span/);
  assert.match(mobile, /data-weekly-day-actions/);
  assert.match(mobile, /getMobileWeeklyLessonPermissions/);
  assert.match(mobile, /data-weekly-mobile-help-needed/);
});

test('Desktop week grid retains subject color for completed lessons and own subject HEX', () => {
  assert.match(weekly, /getFachThemeStyles\(displayFach, app\.fachConfig\)/);
  assert.match(weekly, /data-klassio-subject-card=\{displayFach \|\| undefined\}/);
  assert.match(weekly, /'--fach-card-bg': fachTheme\?\.bgLight/);
  assert.doesNotMatch(weekly, /item\.erledigt \? '!bg-white/);
  assert.match(weekly, /item\.erledigt \? 'ring-2 ring-emerald-500\/20 opacity-70/);
  assert.match(weekly, /getFachHexColor\(app\.fachConfig\?\./);
  assert.match(weekly, /item\.halves\?\.enabled/);
});

test('Quick plan matrix and subject selection use fach colors, not generic active indigo', () => {
  assert.match(center, /getFachThemeStyles\(lesson\.fach, app\.fachConfig\)/);
  assert.match(center, /data-klassio-subject-card=\{lesson\.fach\}/);
  assert.match(center, /data-klassio-subject-card=\{defaultFach \|\| undefined\}/);
  assert.match(center, /getFachThemeStyles\(defaultFach, app\.fachConfig\)/);
  assert.match(center, /const fachTheme = getFachThemeStyles\(subj, app\.fachConfig\)/);
  assert.match(center, /data-klassio-subject-card=\{subj\}/);
  assert.match(center, /isActive \? fachTheme\.bgMedium : fachTheme\.bgLight/);
  assert.match(center, /aria-pressed=\{isActive\}/);
  assert.match(center, /onClick=\{\(\) => openSlotForQuickPlan\(dIdx, hourIdx\)\}/);
  assert.match(center, /onClick=\{\(\) => setActiveSubject\(subj\)\}/);
});

test('A4 color mode reflects configured subjects; black-and-white copies remain monochrome', () => {
  assert.match(a4, /fachConfig\?: Record<string, any>/);
  assert.match(a4, /colorMode === 'mono'/);
  assert.match(a4, /colorMode === 'color' \? getFachThemeStyles\(fach, fachConfig\) : null/);
  assert.match(a4, /data-klassio-subject-card=\{fachTheme \? fach : undefined\}/);
  assert.match(a4, /'--fach-card-bg': fachTheme\.bgLight/);
  assert.match(a4, /borderLeft: \`5px solid \$\{fachTheme\.hex\}\`/);
  assert.equal((generator.match(/fachConfig=\{app\.fachConfig\}/g) || []).length, 2);
  assert.match(a4, /printColorAdjust: 'exact'/);
  assert.doesNotMatch(a4, /if \(f\.includes\('deutsch'\)\) return 'bg-blue-50/);
});
