import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('vServer systemd service runs Klassio unprivileged behind localhost port', () => {
  const service = read('deploy/systemd/klassio.service');
  assert.match(service, /User=klassio/);
  assert.match(service, /Group=klassio/);
  assert.match(service, /Environment=PORT=3100/);
  assert.match(service, /ExecStart=\/usr\/bin\/node \/srv\/klassio\/current\/dist\/server\.cjs/);
  assert.match(service, /NoNewPrivileges=true/);
  assert.match(service, /ProtectSystem=strict/);
});

test('Nginx proxies public traffic only to local Klassio process', () => {
  const config = read('deploy/nginx/klassio.conf');
  assert.match(config, /server_name klassio\.at www\.klassio\.at/);
  assert.match(config, /proxy_pass http:\/\/127\.0\.0\.1:3100/);
  assert.match(config, /X-Forwarded-Proto/);
  assert.match(config, /client_max_body_size 64m/);
});

test('deployment verifies commit and rolls back on failed healthcheck', () => {
  const script = read('deploy/deploy-release.sh');
  assert.match(script, /KLASSIO_DEPLOYMENT_COMMIT\.txt/);
  assert.match(script, /EXPECTED_COMMIT/);
  assert.match(script, /bun install --production --frozen-lockfile/);
  assert.match(script, /127\.0\.0\.1:3100\/api\/health/);
  assert.match(script, /Rollback auf vorheriges Release/);
});

test('production env example contains placeholders but no real secret', () => {
  const env = read('deploy/klassio.env.example');
  assert.match(env, /APP_URL=https:\/\/klassio\.at/);
  assert.match(env, /LEHRERAPP_ALLOWED_EMAIL_DOMAINS=vsfoa\.vobs\.at/);
  assert.match(env, /SESSION_SECRET=CHANGE_ME_/);
  assert.doesNotMatch(env, /AIza[0-9A-Za-z_-]{20,}/);
  assert.doesNotMatch(env, /SMTP_PASS=\S{8,}/);
});

test('staging checklist pins the first real walkthrough to exact reconciliation commit', () => {
  const checklist = read('KLASSIO_STAGING_CHECKLIST.md');
  assert.match(checklist, /c6d5d52cae1af082b1b8447decbb17678ec4d1b9/);
  assert.match(checklist, /Wiederherstellungscode/);
  assert.match(checklist, /Notenmodus/);
  assert.match(checklist, /Wochenplanung Vollbild/);
  assert.match(checklist, /Backup und Restore/);
  assert.match(checklist, /Touch/);
  assert.match(checklist, /Erst danach PR #5/);
});
