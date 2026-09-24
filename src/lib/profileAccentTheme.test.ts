import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getContrastRatio } from './utils';
import { getProfileAccentTokens, resolveAppVisualStyle } from './profileAccentTheme';

test('Personal accent does not switch a selected school design or its light/dark mode', () => {
  for (const theme of ['classic_light', 'deep_dark', 'soft_sage', 'ocean_breeze', 'warm_sand', 'lavender_field', 'cozy_mint']) {
    assert.equal(resolveAppVisualStyle(theme, '#e879f9', undefined), theme);
  }
  assert.equal(resolveAppVisualStyle('custom_theme', '#f97316', '#111827'), 'custom_theme');
  assert.equal(resolveAppVisualStyle('custom_theme', '#e879f9', undefined), 'classic_light',
    'Old profile changes must not strand the layout in a default custom theme.');
  assert.equal(resolveAppVisualStyle('custom_theme', undefined, undefined), 'custom_theme');
});

test('Personal accent affects only accent tokens, never surfaces, borders, text or layout', () => {
  for (const accent of ['#ffffff', '#000000', '#fcba03', '#a12bc3', '#01a2b3']) {
    for (const dark of [false, true]) {
      const tokens = getProfileAccentTokens(accent, dark);
      assert.equal(tokens['--accent'], accent);
      assert.ok(getContrastRatio(accent, tokens['--btn-text']) >= 4.5,
        `Button text must retain WCAG AA contrast on ${accent}`);
      assert.equal(tokens['--accent-text'], tokens['--btn-text']);
      for (const key of Object.keys(tokens)) {
        assert.match(key, /^--(?:accent(?:-text|-hover|-active|-soft)?|btn-text|focus-ring)$/);
      }
      assert.equal(tokens['--bg'], undefined);
      assert.equal(tokens['--surface'], undefined);
      assert.equal(tokens['--text'], undefined);
    }
  }
  assert.deepEqual(getProfileAccentTokens('#zzzzzz', false), {});
  assert.deepEqual(getProfileAccentTokens('red', false), {});
});

test('Saving a profile color no longer forces custom_theme and the scoped app uses palette tokens', () => {
  const profile = readFileSync('src/components/LehrerProfilView.tsx', 'utf8');
  const save = profile.match(/const saveProfile = \(\) => \{[\s\S]*?setIsEditing\(false\);/)?.[0] || '';
  assert.doesNotMatch(save, /theme:\s*'custom_theme'/);
  const app = readFileSync('src/App.tsx', 'utf8');
  assert.match(app, /const activeVisualStyle = resolveAppVisualStyle/);
  assert.match(app, /data-style=\{activeVisualStyle\}/);
  assert.match(app, /style=\{profileAccentTokens as React\.CSSProperties\}/);
  assert.doesNotMatch(app, /app\?\.lehrerProfil\?\.akzentfarbe \? 'custom_theme'/);
});

test('Wheel fills the actual widget viewport while compact controls preserve portrait and landscape layout', () => {
  const wheel = readFileSync('src/components/cockpit/widgets/WheelWidget.tsx', 'utf8');
  assert.match(wheel, /observer\.observe\(wheelArea\)/);
  assert.match(wheel, /wheelAreaSize\.width \|\| containerSize\.width - 16/);
  assert.match(wheel, /wheelAreaSize\.height \|\| containerSize\.height - 144/);
  assert.match(wheel, /w-full min-h-11 rounded-lg font-black/);
  assert.match(wheel, /min-h-11 min-w-11 p-1 rounded-lg border/);
  assert.match(wheel, /h-7 sm:h-8/);
  assert.match(wheel, /my-0\.5 min-h-0/);
  assert.doesNotMatch(wheel, /Math\.max\(180,\s*Math\.min\(containerSize/);
});
