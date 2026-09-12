import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';

test('E3: Produktionshärtung von server.ts', async (t) => {
  process.env.IS_TEST_RUNNER = "true";
  const { createApp } = await import('../../server.ts');

  // App im Testmodus initialisieren
  const app = await createApp({ isTest: true });
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

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
    assert.ok(perm.includes("geolocation=()"));

    const csp = res.headers.get("content-security-policy") || "";
    assert.ok(csp.includes("default-src 'self'"));
    assert.ok(csp.includes("fonts.googleapis.com"));
    assert.ok(csp.includes("tile.openstreetmap.org"));
  });

  await t.test('GET /api/ai/status leakt keine Secrets', async () => {
    const res = await fetch(`${baseUrl}/api/ai/status`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(typeof data.available, "boolean");
    assert.equal((data as any).apiKey, undefined);
  });

  await t.test('POST /api/ai validiert Whitelist für Aktionen', async () => {
    const res = await fetch(`${baseUrl}/api/ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unauthorizedEvilAction", params: {} })
    });
    assert.equal(res.status, 400);
  });

  await t.test('POST /api/sync/create erzwingt AES-GCM und weist Klartext ab', async () => {
    const legacyRes = await fetch(`${baseUrl}/api/sync/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: { students: [] } })
    });
    assert.equal(legacyRes.status, 400);

    const validPayload = {
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
    const validRes = await fetch(`${baseUrl}/api/sync/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload)
    });
    assert.equal(validRes.status, 200);
    const data = await validRes.json();
    assert.ok(/^[A-HJ-NP-Z2-9]{6}$/.test(data.code));

    // Cleanup session
    const delRes = await fetch(`${baseUrl}/api/sync/${data.code}`, { method: "DELETE" });
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

  server.close();

  await t.test('HSTS Header ist in Produktion aktiv', async () => {
    const names = ['NODE_ENV', 'SESSION_SECRET', 'APP_URL', 'LEHRERAPP_ACCESS_TEAM', 'LEHRERAPP_ACCESS_EXTERNAL'];
    const original = Object.fromEntries(names.map(name => [name, process.env[name]]));
    process.env.SESSION_SECRET = 'a'.repeat(64);
    process.env.APP_URL = 'https://example.test';
    process.env.LEHRERAPP_ACCESS_TEAM = 'Test-Team-Only';
    process.env.LEHRERAPP_ACCESS_EXTERNAL = 'Test-Guest-Only';
    process.env.NODE_ENV = "production";
    try {
      const prodApp = await createApp({ isTest: true });
      const prodServer = http.createServer(prodApp);
      await new Promise<void>((resolve) => prodServer.listen(0, "127.0.0.1", () => resolve()));
      const prodAddress = prodServer.address() as any;
      const res = await fetch(`http://127.0.0.1:${prodAddress.port}/api/health`);
      assert.equal(res.headers.get("strict-transport-security"), "max-age=31536000; includeSubDomains");
      prodServer.close();
    } finally {
      for (const name of names) { if (original[name] === undefined) delete process.env[name]; else process.env[name] = original[name]; }
    }
  });
});
