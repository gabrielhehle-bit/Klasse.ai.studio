import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import crypto from 'node:crypto';

test('E3: Produktionshärtung von server.ts', async (t) => {
  process.env.IS_TEST_RUNNER = "true";
  process.env.SESSION_SECRET = 'test-only-session-secret-at-least-32-characters';
  process.env.LEHRERAPP_ACCESS_TEAM = 'test-only-team-access';
  process.env.LEHRERAPP_ACCESS_EXTERNAL = 'test-only-external-access';
  process.env.MICROSOFT_CLIENT_ID = 'test-client';
  const { createApp } = await import('../../server.ts');

  // App im Testmodus initialisieren
  const app = await createApp({ isTest: true });
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  t.after(() => server.close());
  const login = await fetch(`${baseUrl}/api/access/verify`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: process.env.LEHRERAPP_ACCESS_TEAM }),
  });
  const cookie = login.headers.get('set-cookie')!.split(';')[0];
  const authenticatedFetch = (url: string, init: RequestInit = {}) => fetch(url, {
    ...init, headers: { ...Object.fromEntries(new Headers(init.headers)), Cookie: cookie },
  });

  await t.test('AI, OneDrive und Sync-Erstellung lehnen fehlende oder manipulierte Anmeldung ab', async () => {
    for (const [route, method] of [['/api/ai/status', 'GET'], ['/api/ai', 'POST'], ['/api/onedrive/auth-url', 'GET'], ['/api/sync/create', 'POST'], ['/api/sync/ABCDEF', 'DELETE']]) {
      for (const headers of [{}, { Cookie: 'lehrerapp_access_token=forged' }, { Cookie: 'lehrerapp_access_token=%ZZ' }]) {
        const response = await fetch(baseUrl + route, { method, headers });
        assert.equal(response.status, 401);
      }
    }
  });

  await t.test('OAuth requires matching state and escapes HTML and script contexts', async () => {
    const noState = await fetch(`${baseUrl}/api/onedrive/callback?error_description=bad`);
    assert.equal(noState.status, 400);
    const auth = await authenticatedFetch(`${baseUrl}/api/onedrive/auth-url`);
    const { url } = await auth.json();
    const state = new URL(url).searchParams.get('state')!;
    const stateCookie = auth.headers.get('set-cookie')!.split(';')[0];
    const attack = '</script><script>alert(1)</script><b>AUDIT</b>';
    const query = new URLSearchParams({ state, error: 'denied', error_description: attack });
    const wrongCookie = await fetch(`${baseUrl}/api/onedrive/callback?${query}`);
    assert.equal(wrongCookie.status, 400);
    const response = await fetch(`${baseUrl}/api/onedrive/callback?${query}`, { headers: { Cookie: stateCookie } });
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(!html.includes(attack));
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(html.includes('\\u003c/script\\u003e'));
    assert.ok(!html.includes("}, '*')"));
    assert.ok(response.headers.get('set-cookie')?.includes('Expires='));
  });


  await t.test('GET /api/health liefert 200 OK und Status ok', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, "ok");
  });

  await t.test('Sicherheitsheader sind vollständig gesetzt', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(res.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
    assert.equal(res.headers.get("x-frame-options"), "SAMEORIGIN");
    assert.equal(res.headers.get("x-powered-by"), null);
    assert.ok(res.headers.get("cache-control")?.includes("no-store"));

    const perm = res.headers.get("permissions-policy") || "";
    assert.ok(perm.includes("camera=(self)"));
    assert.ok(perm.includes("microphone=(self)"));
    assert.ok(perm.includes("on-device-speech-recognition=(self)"));
    assert.ok(perm.includes("geolocation=()"));

    const csp = res.headers.get("content-security-policy") || "";
    assert.ok(csp.includes("default-src 'self'"));
    assert.ok(csp.includes("fonts.googleapis.com"));
    assert.ok(csp.includes("tile.openstreetmap.org"));
  });

  await t.test('GET /api/ai/status leakt keine Secrets', async () => {
    const res = await authenticatedFetch(`${baseUrl}/api/ai/status`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(typeof data.available, "boolean");
    assert.equal((data as any).apiKey, undefined);
  });

  await t.test('POST /api/ai validiert Whitelist für Aktionen', async () => {
    const res = await authenticatedFetch(`${baseUrl}/api/ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unauthorizedEvilAction", params: {} })
    });
    assert.equal(res.status, 400);
  });

  await t.test('POST /api/sync/create erzwingt AES-GCM und weist Klartext ab', async () => {
    const legacyRes = await authenticatedFetch(`${baseUrl}/api/sync/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: { students: [] } })
    });
    assert.equal(legacyRes.status, 400);

    const syncWriteToken = 'abcdefghijklmnopqrstuvwxyz0123456789-_ABCDE';
    const writeTokenHash = crypto.createHash('sha256')
      .update('klassio-sync-write-verifier:v1:' + syncWriteToken)
      .digest('hex');
    const validPayload = {
      writeTokenHash,
      encryptedPayload: {
        protocolVersion: 1,
        updatedAt: Date.now(),
        encryptedState: {
          version: 1,
          algorithm: "AES-GCM-256",
          iv: "0123456789abcdef",
          ciphertext: "abcdef0123456789"
        }
      }
    };
    const validRes = await authenticatedFetch(`${baseUrl}/api/sync/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload)
    });
    assert.equal(validRes.status, 200);
    const data = await validRes.json();
    assert.ok(/^[A-HJ-NP-Z2-9]{6}$/.test(data.code));

    const unauthorizedWrite = await fetch(baseUrl + '/api/sync/' + data.code, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ encryptedPayload: validPayload.encryptedPayload }),
    });
    assert.equal(unauthorizedWrite.status, 403, 'pairing code alone must not authorize writes');

    const authorizedWrite = await fetch(baseUrl + '/api/sync/' + data.code, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Klassio-Sync-Write': syncWriteToken },
      body: JSON.stringify({ encryptedPayload: validPayload.encryptedPayload }),
    });
    assert.equal(authorizedWrite.status, 200);

    // Cleanup session
    const delRes = await authenticatedFetch(`${baseUrl}/api/sync/${data.code}`, { method: "DELETE" });
    assert.equal(delRes.status, 200);
  });

  await t.test('AccessGate Cookie besitzt HttpOnly, SameSite=Lax und Path=/', async () => {
    const validCode = process.env.LEHRERAPP_ACCESS_TEAM || "team2026";
    const res = await fetch(`${baseUrl}/api/access/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: validCode })
    });
    assert.equal(res.status, 200);
    const rawCookies = (res.headers as any).getSetCookie ? (res.headers as any).getSetCookie() : [res.headers.get("set-cookie") || ""];
    const cookieStr = rawCookies.join("; ");
    assert.ok(cookieStr.includes("HttpOnly"));
    assert.ok(cookieStr.includes("SameSite=Lax"));
    assert.ok(cookieStr.includes("Path=/"));
    const payload = await res.json();
    assert.equal(payload.success, true);
    assert.equal('token' in payload, false, 'Session-Token darf nicht zusätzlich an Browser-JavaScript zurückgegeben werden');
  });

  await t.test('Unbekannte API-Routen liefern sauberes JSON 404', async () => {
    const res = await fetch(`${baseUrl}/api/unbekannter-endpunkt`);
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.equal(data.error, "API-Endpunkt nicht gefunden.");
  });

  await t.test('Request Size Limit schützt vor DoS (HTTP 413)', async () => {
    const oversizedBody = "x".repeat(2 * 1024 * 1024);
    const res = await fetch(`${baseUrl}/api/access/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: oversizedBody })
    });
    assert.equal(res.status, 413);
  });


  await t.test('External AI defaults to off', async () => {
    const status = await authenticatedFetch(baseUrl + '/api/ai/status');
    const meta = await status.json();
    assert.equal(meta.available, false);
    assert.equal(meta.privacyRestricted, true);
    const response = await authenticatedFetch(baseUrl + '/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'askAI', params: { modusId: 'ki-helfer', userMessage: 'Test request' } }),
    });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'AI_EXTERNAL_DISABLED');
  });

  await t.test('Student assessment imports never forward PDFs or names to Gemini', async () => {
    for (const route of ['/api/ai/analyze-ikm', '/api/ai/analyze-antolin']) {
      const response = await authenticatedFetch(baseUrl + route, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64: 'SENSITIVE_TEST_DATA', students: [{ name: 'Dummy Student' }] }),
      });
      assert.equal(response.status, 403, route);
      assert.equal((await response.json()).code, 'AI_STUDENT_IMPORT_DISABLED');
    }
  });

  await t.test('Cross-origin writes are blocked even with a valid session cookie', async () => {
    const response = await authenticatedFetch(baseUrl + '/api/access/logout', {
      method: 'POST',
      headers: { Origin: 'https://evil.invalid', 'Sec-Fetch-Site': 'cross-site' },
    });
    assert.equal(response.status, 403);
    assert.equal((await authenticatedFetch(baseUrl + '/api/access/status')).status, 200);
    const status = await authenticatedFetch(baseUrl + '/api/access/status');
    assert.equal((await status.json()).authenticated, true);
  });

  await t.test('Logout revokes issued sessions; a copied cookie cannot be replayed', async () => {
    const response = await authenticatedFetch(baseUrl + '/api/access/logout', { method: 'POST' });
    assert.equal(response.status, 200);
    const replay = await authenticatedFetch(baseUrl + '/api/access/status');
    assert.equal((await replay.json()).authenticated, false);
    const protectedRoute = await authenticatedFetch(baseUrl + '/api/ai/status');
    assert.equal(protectedRoute.status, 401);
  });

  await t.test('Forwarded-for spoofing cannot reset failed access-code throttles', async () => {
    for (let i = 0; i < 10; i++) {
      const failed = await fetch(baseUrl + '/api/access/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '198.51.100.' + (i + 1) },
        body: JSON.stringify({ code: 'wrong-' + i }),
      });
      assert.equal((await failed.json()).success, false);
    }
    const blocked = await fetch(baseUrl + '/api/access/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '203.0.113.250' },
      body: JSON.stringify({ code: 'wrong-again' }),
    });
    assert.equal(blocked.status, 429);
  });

  await t.test('Unknown Smartboard pairing codes are rate-limited without exposing encrypted sessions', async () => {
    for (let i = 0; i < 30; i++) {
      const code = 'AAAA' + i.toString(32).padStart(2, '0').toUpperCase();
      const res = await fetch(baseUrl + '/api/sync/' + code);
      assert.equal(res.status, 404);
    }
    const blocked = await fetch(baseUrl + '/api/sync/AAAAZZ');
    assert.equal(blocked.status, 429);
  });

  server.close();

  await t.test('Production refuses missing secrets and default access codes', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.SESSION_SECRET;
    const originalTeam = process.env.LEHRERAPP_ACCESS_TEAM;
    process.env.NODE_ENV = 'production';
    try {
      delete process.env.SESSION_SECRET;
      await assert.rejects(createApp({ isTest: true }), /SESSION_SECRET/);
      process.env.SESSION_SECRET = originalSecret;
      process.env.LEHRERAPP_ACCESS_TEAM = 'team2026';
      await assert.rejects(createApp({ isTest: true }), /Standardcodes/);
    } finally {
      if (originalEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalEnv;
      process.env.SESSION_SECRET = originalSecret;
      process.env.LEHRERAPP_ACCESS_TEAM = originalTeam;
    }
  });

  await t.test('HSTS Header ist in Produktion aktiv', async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const prodApp = await createApp({ isTest: true });
      const prodServer = http.createServer(prodApp);
      await new Promise<void>((resolve) => prodServer.listen(0, "127.0.0.1", () => resolve()));
      const prodAddress = prodServer.address() as any;
      const res = await fetch(`http://127.0.0.1:${prodAddress.port}/api/health`);
      assert.equal(res.headers.get("strict-transport-security"), "max-age=31536000; includeSubDomains");
      const csp = res.headers.get('content-security-policy') || '';
      assert.match(csp, /script-src 'self' 'nonce-[^']+'/);
      const scripts = csp.split(';').map(part => part.trim()).find(part => part.startsWith('script-src ')) || '';
      assert.doesNotMatch(scripts, /'unsafe-inline'|'unsafe-eval'/, 'production JavaScript must require a nonce or same-origin asset');
      assert.ok(!csp.includes("'unsafe-eval'"));
      assert.match(csp, /frame-ancestors 'self'/);
      prodServer.close();
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });
});
