import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAILY_QUOTES,
  DEFAULT_DAILY_QUOTES_WIDGET_SETTINGS,
  getActiveDailyQuote,
  getDailyQuotesForTheme,
  getNextDailyQuoteId,
  normalizeDailyQuotesWidgetSettings,
  parseAiDailyQuote,
} from './dailyQuotesWidgetModel';

test('morning motto settings normalize safely', () => {
  assert.deepEqual(normalizeDailyQuotesWidgetSettings(null), DEFAULT_DAILY_QUOTES_WIDGET_SETTINGS);
  assert.deepEqual(normalizeDailyQuotesWidgetSettings({
    theme: 'team',
    currentQuoteId: 'team-listen',
    customTitle: '  Gemeinsam ',
    customText: '  Wir helfen einander. ',
    useCustom: true,
  }), {
    theme: 'team',
    currentQuoteId: 'team-listen',
    customTitle: 'Gemeinsam',
    customText: 'Wir helfen einander.',
    useCustom: true,
  });
});

test('theme collections and next quote stay inside the selected theme', () => {
  const team = getDailyQuotesForTheme('team');
  assert.ok(team.length >= 2);
  assert.ok(team.every(quote => quote.theme === 'team'));
  const next = getNextDailyQuoteId(team[0].id, 'team');
  assert.equal(next, team[1].id);
});

test('custom motto has priority only when it contains text', () => {
  const custom = getActiveDailyQuote({
    ...DEFAULT_DAILY_QUOTES_WIDGET_SETTINGS,
    customTitle: '💬 Heute',
    customText: 'Wir hören einander zu.',
    useCustom: true,
  });
  assert.deepEqual(custom, {
    title: '💬 Heute',
    text: 'Wir hören einander zu.',
    custom: true,
  });

  const fallback = getActiveDailyQuote({
    ...DEFAULT_DAILY_QUOTES_WIDGET_SETTINGS,
    customText: '',
    useCustom: true,
  });
  assert.equal(fallback.custom, false);
  assert.equal(fallback.title, DAILY_QUOTES[0].title);
});

test('AI motto parser accepts the documented title-semicolon-text format', () => {
  assert.deepEqual(
    parseAiDailyQuote('🌱 Kleiner Schritt;Heute probieren wir eine Sache mutig aus.'),
    {
      title: '🌱 Kleiner Schritt',
      text: 'Heute probieren wir eine Sache mutig aus.',
    },
  );
  assert.equal(parseAiDailyQuote('Kein Trennzeichen'), null);
});
