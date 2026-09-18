import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync('server.ts', 'utf8');
const service = readFileSync('src/services/aiService.ts', 'utf8');
const assistant = readFileSync('src/components/AIAssistant.tsx', 'utf8');
const env = readFileSync('.env.example', 'utf8');

test('Gemini key stays server-side and quota settings are configurable', () => {
  assert.match(server, /process\.env\.GEMINI_API_KEY/);
  assert.doesNotMatch(service, /GEMINI_API_KEY/);
  assert.doesNotMatch(assistant, /GEMINI_API_KEY/);
  assert.match(env, /KLASSIO_AI_DAILY_USER_LIMIT=20/);
  assert.match(env, /KLASSIO_AI_DAILY_GLOBAL_LIMIT=200/);
  assert.match(env, /KLASSIO_AI_PER_MINUTE_LIMIT=5/);
});

test('all billable Gemini routes use the persistent daily quota', () => {
  assert.match(server, /consumeAIQuota\(req, res\)/);
  assert.match(server, /app\.post\("\/api\/ai", async \(req, res\) =>/);
  assert.match(server, /app\.post\("\/api\/ai\/analyze-ikm", async \(req, res\) =>/);
  assert.match(server, /app\.post\("\/api\/ai\/analyze-antolin", async \(req, res\) =>/);
  const matches = server.match(/const aiUsage = await consumeAIQuota\(req, res\);/g) || [];
  assert.equal(matches.length, 3);
});

test('KI helper shows remaining daily quota and blocks sending when exhausted', () => {
  assert.match(assistant, /KI heute: \{aiUsage\.remaining\} von \{aiUsage\.limit\} Anfragen übrig/);
  assert.match(assistant, /aiUsage\?\.blocked \|\| aiUsage\?\.remaining === 0/);
  assert.match(service, /klassio:ai-usage/);
  assert.match(service, /AI_DAILY_LIMIT_REACHED/);
});
