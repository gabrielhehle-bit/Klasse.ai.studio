import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveWeeklyPlanOpeningWeek } from './planningWeekNavigation';

test('opening the weekly plan from Planung keeps exactly the viewed calendar week', () => {
  assert.equal(resolveWeeklyPlanOpeningWeek('planung', 43, 47), 43);
  assert.equal(resolveWeeklyPlanOpeningWeek('planung', 47, 47), 47);
  assert.equal(resolveWeeklyPlanOpeningWeek('planung', '45', 47), 45);
});

test('other entry points retain the old default: current calendar week', () => {
  for (const origin of ['dashboard', 'cockpit', 'klasse', 'wochenplanung', '', undefined]) {
    assert.equal(resolveWeeklyPlanOpeningWeek(origin, 42, 47), 47);
  }
});

test('invalid or unselected calendar weeks never cause jumps to a bogus week', () => {
  for (const week of [undefined, null, 0, 54, -1, 2.5, NaN, '', 'abc', '2026-47']) {
    assert.equal(resolveWeeklyPlanOpeningWeek('planung', week, 47), 47);
  }
  assert.equal(resolveWeeklyPlanOpeningWeek('planung', 53, 47), 53);
});

test('weekly planner uses the source-aware opening week only on mount', () => {
  const source = readFileSync('src/components/WeeklyPlan.tsx', 'utf8');
  const hub = readFileSync('src/components/PlanungHub.tsx', 'utf8');
  const context = readFileSync('src/context/AppContext.tsx', 'utf8');
  assert.match(source, /resolveWeeklyPlanOpeningWeek\(app\.previousPage, app\.currentKW, actualKW\)/);
  assert.match(source, /if \(app\.currentKW !== openingKW\)/);
  assert.match(source, /currentKW: openingKW/);
  assert.doesNotMatch(source, /if \(app\.currentKW !== actualKW\)/);
  assert.match(hub, /data-testid="planning-selected-week-handoff"/);
  assert.match(hub, /Beim Öffnen des Wochenplans bleibst du in KW/);
  assert.match(context, /prev\.currentPage && prev\.currentPage !== 'cockpit'/);
  assert.match(context, /previousPage,\s*currentPage: page/);
});
