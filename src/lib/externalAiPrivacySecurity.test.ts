import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

test('Even an explicitly enabled Gemini client cannot receive pupil reports or photo bytes', async (t) => {
  const before = process.env.KLASSIO_AI_EXTERNAL_ENABLED;
  const previousSecret = process.env.SESSION_SECRET;
  const previousTeam = process.env.LEHRERAPP_ACCESS_TEAM;
  const previousExternal = process.env.LEHRERAPP_ACCESS_EXTERNAL;
  const previousRunner = process.env.IS_TEST_RUNNER;
  // server.ts has a module-level startServer() fallback. Prevent an unwanted
  // development listener from being created by this dynamic import.
  process.env.IS_TEST_RUNNER = 'true';
  process.env.KLASSIO_AI_EXTERNAL_ENABLED = 'true';
  process.env.SESSION_SECRET = 'test-only-key-32-characters-minimum-2026';
  process.env.LEHRERAPP_ACCESS_TEAM = 'test-only-team-code';
  process.env.LEHRERAPP_ACCESS_EXTERNAL = 'test-only-external-code';
  t.after(() => {
    if (before === undefined) delete process.env.KLASSIO_AI_EXTERNAL_ENABLED; else process.env.KLASSIO_AI_EXTERNAL_ENABLED = before;
    if (previousSecret === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET = previousSecret;
    if (previousTeam === undefined) delete process.env.LEHRERAPP_ACCESS_TEAM; else process.env.LEHRERAPP_ACCESS_TEAM = previousTeam;
    if (previousExternal === undefined) delete process.env.LEHRERAPP_ACCESS_EXTERNAL; else process.env.LEHRERAPP_ACCESS_EXTERNAL = previousExternal;
    if (previousRunner === undefined) delete process.env.IS_TEST_RUNNER; else process.env.IS_TEST_RUNNER = previousRunner;
  });
  const { createApp } = await import('../../server.ts');
  const app = await createApp({ isTest: true });
  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const port = (server.address() as any).port;
  const base = 'http://127.0.0.1:' + port;
  const login = await fetch(base + '/api/access/verify', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: process.env.LEHRERAPP_ACCESS_TEAM }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie')!.split(';')[0];
  const request = (action: string, params: unknown) => fetch(base + '/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ action, params }),
  });
  const summary = await request('portfolioSummary', { studentName: 'Dummy', portfolioEntries: [] });
  assert.equal(summary.status, 403);
  assert.equal((await summary.json()).code, 'AI_STUDENT_PROFILE_DISABLED');
  const projection = await request('gradeProjection', { studentName: 'Dummy', history: [2, 3] });
  assert.equal(projection.status, 403);
  assert.equal((await projection.json()).code, 'AI_STUDENT_PROFILE_DISABLED');
  const photo = await request('askAI', {
    modusId: 'ki-foto-korrektur',
    userMessage: 'Dummy prompt',
    imageBase64: { data: 'YmFzZTY0', mimeType: 'image/jpeg' },
    imagePrivacyConfirmed: true,
  });
  assert.equal(photo.status, 403);
  assert.equal((await photo.json()).code, 'AI_MEDIA_DISABLED');
  for (const route of ['/api/ai/analyze-ikm', '/api/ai/analyze-antolin']) {
    const response = await fetch(base + route, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ pdfBase64: 'DUMMY_TEST_CONTENT' }),
    });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, 'AI_STUDENT_IMPORT_DISABLED');
  }
});
