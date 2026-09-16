import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync('server.ts', 'utf8');
const api = readFileSync('src/lib/supportApi.ts', 'utf8');
const modal = readFileSync('src/components/SupportModal.tsx', 'utf8');
const settings = readFileSync('src/components/settings/SupportSettings.tsx', 'utf8');
const button = readFileSync('src/components/PayPalSubscriptionButton.tsx', 'utf8');
const env = readFileSync('.env.example', 'utf8');

test('PayPal subscriptions are configured via public client id and plan ids', () => {
  for (const key of [
    'KLASSIO_PAYPAL_CLIENT_ID',
    'KLASSIO_PAYPAL_MONTHLY_PLAN_ID',
    'KLASSIO_PAYPAL_YEARLY_PLAN_ID',
  ]) {
    assert.match(server, new RegExp(key));
    assert.match(env, new RegExp(key));
  }
  assert.match(api, /monthlyPlanId: string \| null/);
  assert.match(api, /yearlyPlanId: string \| null/);
});

test('Support UI renders real PayPal subscription buttons with graceful URL fallback', () => {
  assert.match(modal, /PayPalSubscriptionButton/);
  assert.match(settings, /PayPalSubscriptionButton/);
  assert.match(button, /intent=subscription/);
  assert.match(button, /actions\.subscription\.create\(\{ plan_id: planId \}\)/);
  assert.match(modal, /fallbackUrl/);
  assert.match(settings, /fallbackUrl/);
});

test('CSP explicitly permits PayPal SDK, frames and API connections', () => {
  assert.match(server, /script-src[^\n]*paypal\.com/);
  assert.match(server, /connect-src[^\n]*paypal\.com/);
  assert.match(server, /frame-src[^\n]*paypal\.com/);
  assert.match(server, /form-action[^\n]*paypal\.com/);
});
