import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createTeacherIdentityForSchool } from '../server/teacherIdentity';
import { INITIAL_VERIFIED_AUSTRIAN_SCHOOLS } from '../data/austrianSchoolRegistry.seed';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Private E-Mail und Schulverifizierung sind getrennte Ebenen', () => {
  const server = read('server.ts');

  assert.match(server, /const emailLoginEnabled = Boolean\(SMTP_HOST && SMTP_FROM\)/);
  assert.doesNotMatch(server, /emailLoginEnabled = Boolean\([^\n]*ALLOWED_EMAIL_DOMAINS/);
  assert.match(server, /klassio_email_account/);
  assert.match(server, /const verifiedSchool = await schoolRegistryStore\.findVerifiedSchoolByEmail\(email\)/);
  assert.match(server, /createTeacherIdentityForSchool\(email, verifiedSchool\)/);
  assert.match(server, /school: identity \? \{/);
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

test('Schul-E-Mail schaltet zusätzlich eine konkrete registrierte Schulidentität frei', () => {
  const school = INITIAL_VERIFIED_AUSTRIAN_SCHOOLS[0] as any;
  const identity = createTeacherIdentityForSchool('gabriel.hehle@vsfoa.vobs.at', {
    ...school,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  });
  assert.ok(identity);
  assert.equal(identity.schoolDomain, 'vsfoa.vobs.at');
  assert.equal(identity.schoolId, 'at-vbg-vs-oberau');

  const privateAddress = createTeacherIdentityForSchool('gabriel@example.com', {
    ...school,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  });
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

  assert.match(gate, /Mit deiner E-Mail anmelden und deine verschlüsselten KLASSIO-Daten auf diesem Gerät laden/);
  assert.match(gate, /Deine E-Mail ist dein KLASSIO-Konto/);
  assert.match(gate, /Auch private E-Mail-Adressen funktionieren für deinen persönlichen Geräte-Sync/);
  assert.match(gate, /verifizierte Schul-E-Mail schaltet zusätzlich schulinterne Funktionen wie das Lehrerzimmer frei/);
  assert.doesNotMatch(gate, /Es funktionieren nur die auf diesem Klassio-Server freigegebenen Schul-Domains/);
});
