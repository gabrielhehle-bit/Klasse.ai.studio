import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/components/settings/SchoolIdentitySettings.tsx', 'utf8');

test('school support e-mail is visible for pending and new school verification', () => {
  assert.match(source, /SCHOOL_SUPPORT_EMAIL = 'noreply@klassio\.at'/);
  assert.match(source, /E-Mail an \{SCHOOL_SUPPORT_EMAIL\} schreiben/);
  assert.match(source, /makeSchoolVerificationMailto\(/);
});

test('support e-mail contains school name, code, actual work address and concrete domain', () => {
  assert.match(source, /Name der Schule:/);
  assert.match(source, /Schulkürzel:/);
  assert.match(source, /Dienstliche Schul-E-Mail-Adresse:/);
  assert.match(source, /Konkrete Schul-Domain:/);
  assert.match(source, /@vsfoa\.vobs\.at/);
  assert.match(source, /@vs-beispielschule\.at/);
  assert.match(source, /encodeURIComponent\(body\)/);
});

test('contact link is not an approval path and cannot switch the logged-in domain', () => {
  assert.match(source, /Die Schulverifizierung erfolgt erst nach eurer Prüfung und Freigabe/);
  assert.match(source, /verwendet weiterhin die Domain deines angemeldeten KLASSIO-Kontos/);
  assert.match(source, /body: JSON\.stringify\(\{ schoolName: schoolName\.trim\(\), federalState \}\)/);
});
test('E-Mail-Anmeldung und SMTP-Konfiguration verwenden keine zweite, kostenpflichtige Support-Mailbox', () => {
  const login = readFileSync('src/components/EmailAccountLogin.tsx', 'utf8');
  const server = readFileSync('server.ts', 'utf8');
  const exampleEnv = readFileSync('.env.example', 'utf8');
  for (const content of [source, login, server, exampleEnv]) {
    assert.doesNotMatch(content, /(?<!no)reply@klassio\\.at/);
  }
  assert.match(login, /mailto:noreply@klassio\\.at/);
  assert.match(exampleEnv, /SMTP_FROM="KLASSIO <noreply@klassio\\.at>"/);
});
