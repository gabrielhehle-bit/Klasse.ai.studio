import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createTeacherIdentity } from '../server/teacherIdentity';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Private E-Mail und Schulverifizierung sind getrennte Ebenen', () => {
  const server = read('server.ts');

  assert.match(server, /const emailLoginEnabled = Boolean\(SMTP_HOST && SMTP_FROM\)/);
  assert.doesNotMatch(server, /emailLoginEnabled = Boolean\([^\n]*ALLOWED_EMAIL_DOMAINS/);
  assert.match(server, /klassio_email_account/);
  assert.match(server, /const identity = createTeacherIdentity\(email, ALLOWED_EMAIL_DOMAINS\)/);
  assert.match(server, /school: identity \? \{ code: identity\.schoolCode, domain: identity\.schoolDomain \} : null/);
});

test('Private Adressen dürfen ein persönliches Klassio-Konto erhalten', () => {
  const server = read('server.ts');
  const requestStart = server.indexOf('app.post("/api/access/email/request"');
  const verifyStart = server.indexOf('app.post("/api/access/email/verify"');
  assert.ok(requestStart >= 0 && verifyStart > requestStart);

  const requestBlock = server.slice(requestStart, verifyStart);
  assert.match(requestBlock, /const email = normalizeEmail\(req\.body\?\.email\)/);
  assert.doesNotMatch(requestBlock, /isAllowedEmail/);
  assert.doesNotMatch(requestBlock, /ALLOWED_EMAIL_DOMAINS/);
});

test('Schul-E-Mail schaltet zusätzlich eine konkrete Schulidentität frei', () => {
  const school = createTeacherIdentity('gabriel.hehle@vsfoa.vobs.at', ['vobs.at']);
  assert.ok(school);
  assert.equal(school.schoolDomain, 'vsfoa.vobs.at');
  assert.equal(school.schoolId, 'vsfoa.vobs.at');

  const privateAddress = createTeacherIdentity('gabriel@example.com', ['vobs.at']);
  assert.equal(privateAddress, null);
});

test('Lehrerzimmer bleibt an verifizierte Schulidentität gebunden', () => {
  const server = read('server.ts');
  assert.match(server, /requireTeacherIdentity/);
  assert.match(server, /verifyIdentityToken\(cookies\.klassio_email_identity\)/);
  assert.match(server, /requiresSchoolEmail: true/);
});

test('Login-Oberfläche erklärt Konto und Schulverifizierung getrennt', () => {
  const gate = read('src/components/AccessGate.tsx');

  assert.match(gate, /Mit deiner E-Mail-Adresse anmelden\./);
  assert.match(gate, /Private E-Mail-Adressen funktionieren für dein persönliches Klassio-Konto/);
  assert.match(gate, /Schul-E-Mail wird zusätzlich deine Schule verifiziert und das Lehrerzimmer freigeschaltet/);
  assert.doesNotMatch(gate, /Es funktionieren nur die auf diesem Klassio-Server freigegebenen Schul-Domains/);
});
