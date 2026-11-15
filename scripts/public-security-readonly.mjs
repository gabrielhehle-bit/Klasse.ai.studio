// Read-only, unauthenticated public release diagnostic. NEVER send credentials, tokens or student records.
const base = 'https://klassio.at';
const routes = ['/', '/api/health', '/api/access/status', '/api/release'];
const failures = [];
const messages = [];

for (const route of routes) {
  try {
    const response = await fetch(base + route, {
      method: 'GET', redirect: 'manual',
      headers: { 'Accept': route === '/' ? 'text/html' : 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    const h = (key) => response.headers.get(key) || '';
    const csp = h('content-security-policy');
    const scriptDirective = csp.split(';').map(part => part.trim()).find(part => part.startsWith('script-src ')) || '';
    const report = {
      route,
      status: response.status,
      https: response.url.startsWith('https://'),
      hsts: Boolean(h('strict-transport-security')),
      noSniff: h('x-content-type-options').toLowerCase() === 'nosniff',
      xFrame: h('x-frame-options'),
      cacheControl: h('cache-control'),
      scriptCspPresent: Boolean(scriptDirective),
      scriptAllowsUnsafeEval: scriptDirective.includes("'unsafe-eval'"),
      scriptAllowsUnsafeInline: scriptDirective.includes("'unsafe-inline'"),
      frameAncestors: csp.split(';').map(part => part.trim()).find(part => part.startsWith('frame-ancestors ')) || '',
    };
    // The live release marker is public metadata. Never print response bodies
    // from login, account, student-data or unrelated endpoints.
    if (route === '/api/release' && response.ok) {
      const payload = await response.json();
      report.releaseCommit = typeof payload?.commit === 'string' && /^[a-f0-9]{40}$/.test(payload.commit)
        ? payload.commit : null;
      if (!report.releaseCommit) failures.push('/api/release did not return a valid commit');
    }
    messages.push(report);
    if (response.status !== 200) failures.push(route + ' HTTP ' + response.status);
    if (!report.hsts || !report.noSniff || !report.scriptCspPresent) failures.push(route + ' missing security headers');
    if (route.startsWith('/api/') && !report.cacheControl.includes('no-store')) failures.push(route + ' no no-store');
    if (report.scriptAllowsUnsafeEval || report.scriptAllowsUnsafeInline) failures.push(route + ' permissive script CSP');
    if (!response.bodyUsed) await response.body?.cancel();
  } catch (error) {
    failures.push(route + ': ' + (error instanceof Error ? error.message : String(error)));
  }
}

// The expected SHA is supplied by GitHub Actions (PR base or pushed main HEAD).
// A mismatch is a release status, not a failed change-quality test.
const expectedCommit = process.env.EXPECTED_KLASSIO_COMMIT || '';
const liveCommit = messages.find(result => result.route === '/api/release')?.releaseCommit || null;
if (expectedCommit && !/^[a-f0-9]{40}$/.test(expectedCommit)) {
  failures.push('GitHub expected deployment commit is malformed');
}
const releaseState = !/^[a-f0-9]{40}$/.test(expectedCommit) || !liveCommit
  ? 'UNKNOWN'
  : liveCommit === expectedCommit ? 'MATCH' : 'DIFFERENT';
const releaseParity = { state: releaseState, expectedCommit: expectedCommit || null, liveCommit };
console.log('LIVE_RELEASE_PARITY=' + JSON.stringify(releaseParity));
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import('node:fs');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    '### Klassio live deployment (read-only)\n\n' +
    '| GitHub expected | World4You live | Result |\n|---|---|---|\n' +
    '| ' + (expectedCommit || 'unknown') + ' | ' + (liveCommit || 'unknown') +
    ' | **' + releaseState + '** |\n\n' +
    'A mismatch means production has not been confirmed on the expected commit. No deployment was performed.\n');
}

for (const result of messages) console.log(JSON.stringify(result));
if (failures.length) {
  // An existing production deployment is intentionally not treated as the new PR's quality gate.
  console.log('LIVE_BASELINE_WARNINGS=' + JSON.stringify(failures));
  process.exitCode = 1;
} else {
  console.log('Public HTTPS and read-only security-header baseline checks passed.');
}
