// Read-only, unauthenticated public release diagnostic. NEVER send credentials, tokens or student records.
const base = 'https://klassio.at';
const routes = ['/', '/api/health', '/api/access/status'];
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
    messages.push(report);
    if (response.status !== 200) failures.push(route + ' HTTP ' + response.status);
    if (!report.hsts || !report.noSniff || !report.scriptCspPresent) failures.push(route + ' missing security headers');
    if (route.startsWith('/api/') && !report.cacheControl.includes('no-store')) failures.push(route + ' no no-store');
    if (report.scriptAllowsUnsafeEval || report.scriptAllowsUnsafeInline) failures.push(route + ' permissive script CSP');
    await response.body?.cancel();
  } catch (error) {
    failures.push(route + ': ' + (error instanceof Error ? error.message : String(error)));
  }
}

for (const result of messages) console.log(JSON.stringify(result));
if (failures.length) {
  // An existing production deployment is intentionally not treated as the new PR's quality gate.
  console.log('LIVE_BASELINE_WARNINGS=' + JSON.stringify(failures));
  process.exitCode = 1;
} else {
  console.log('Public HTTPS and read-only security-header baseline checks passed.');
}
