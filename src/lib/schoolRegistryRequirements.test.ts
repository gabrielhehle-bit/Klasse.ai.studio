import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSchoolRegistryStore } from '../server/schoolRegistry';
import { createTeacherIdentityForSchool } from '../server/teacherIdentity';
import { INITIAL_VERIFIED_AUSTRIAN_SCHOOLS } from '../data/austrianSchoolRegistry.seed';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Schulregister ordnet nur die exakte konkrete Schul-Domain zu', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'klassio-schools-'));
  try {
    const store = createSchoolRegistryStore(dir);
    await store.ensureSeedSchools(INITIAL_VERIFIED_AUSTRIAN_SCHOOLS);

    const oberau = await store.findVerifiedSchoolByEmail('lehrperson@vsfoa.vobs.at');
    assert.ok(oberau);
    assert.equal(oberau.id, 'at-vbg-vs-oberau');
    assert.equal(oberau.federalState, 'Vorarlberg');

    const krumbach = await store.findVerifiedSchoolByEmail('lehrperson@vskr.vobs.at');
    assert.ok(krumbach);
    assert.equal(krumbach.id, 'at-vbg-vs-krumbach');
    assert.equal(krumbach.name, 'Volksschule Krumbach');
    assert.equal(krumbach.federalState, 'Vorarlberg');
    assert.notEqual(krumbach.id, oberau.id, 'Krumbach und Oberau müssen getrennte Schulgruppen bleiben.');

    const mellau = await store.findVerifiedSchoolByEmail('lehrperson@vsml.vobs.at');
    assert.ok(mellau);
    assert.equal(mellau.id, 'at-vbg-vs-mellau');
    assert.equal(mellau.code, 'vsml');
    assert.equal(mellau.name, 'Volksschule Mellau');
    assert.equal(mellau.federalState, 'Vorarlberg');
    assert.deepEqual(mellau.domains, ['vsml.vobs.at']);
    assert.notEqual(mellau.id, krumbach.id, 'Mellau und Krumbach dürfen nie dieselbe Schulgruppe sein.');
    assert.notEqual(mellau.id, oberau.id, 'Mellau und Oberau dürfen nie dieselbe Schulgruppe sein.');
    const mellauTeacher = createTeacherIdentityForSchool('lehrperson@vsml.vobs.at', mellau);
    assert.equal(mellauTeacher.schoolId, mellau.id);
    assert.notEqual(mellauTeacher.schoolId, createTeacherIdentityForSchool('lehrperson@vskr.vobs.at', krumbach).schoolId);

    // A release reseeds an already existing registry: no school or pending
    // requests may be erased and no duplicate schools may be created.
    await store.ensureSeedSchools(INITIAL_VERIFIED_AUSTRIAN_SCHOOLS);
    const verified = await store.listVerifiedSchools();
    assert.equal(verified.filter(school => school.id === mellau.id).length, 1);
    assert.equal(verified.filter(school => school.id === krumbach.id).length, 1);
    assert.equal(verified.filter(school => school.id === oberau.id).length, 1);

    assert.equal(
      await store.findVerifiedSchoolByEmail('lehrperson@andere-schule.vobs.at'),
      null,
      'Gleicher Bildungsserver darf Schulen nicht in ein gemeinsames Lehrerzimmer zusammenfassen.'
    );
    assert.equal(
      await store.findVerifiedSchoolByEmail('lehrperson@vobs.at'),
      null,
      'Provider-Domain allein darf nicht automatisch als konkrete Schule gelten.'
    );
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

test('Neue Schule aus anderem Bundesland kann angefragt und einmalig freigegeben werden', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'klassio-school-request-'));
  try {
    const store = createSchoolRegistryStore(dir);
    const request = await store.requestVerification({
      requestedByEmail: 'anna@vs-muster.tirol',
      schoolName: 'Volksschule Muster',
      federalState: 'Tirol',
    });

    assert.equal(request.status, 'pending');
    assert.equal(request.emailDomain, 'vs-muster.tirol');
    assert.equal(request.federalState, 'Tirol');
    assert.equal(await store.findVerifiedSchoolByEmail('anna@vs-muster.tirol'), null);

    const approved = await store.approveRequest(request.id);
    assert.equal(approved.school.name, 'Volksschule Muster');
    assert.equal(approved.school.federalState, 'Tirol');
    assert.deepEqual(approved.school.domains, ['vs-muster.tirol']);

    const resolved = await store.findVerifiedSchoolByEmail('max@vs-muster.tirol');
    assert.ok(resolved);
    assert.equal(resolved.id, approved.school.id);

    const teacher = createTeacherIdentityForSchool('max@vs-muster.tirol', resolved);
    assert.ok(teacher);
    assert.equal(teacher.schoolId, approved.school.id);
    assert.equal(teacher.schoolFederalState, 'Tirol');
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

test('Admin-Queue listet offene Anfragen und Entscheidungen nachvollziehbar', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'klassio-school-admin-'));
  try {
    const store = createSchoolRegistryStore(dir);
    const first = await store.requestVerification({
      requestedByEmail: 'anna@schule-a.at',
      schoolName: 'VS Schule A',
      federalState: 'Wien',
    });
    const second = await store.requestVerification({
      requestedByEmail: 'berta@schule-b.at',
      schoolName: 'VS Schule B',
      federalState: 'Salzburg',
    });

    assert.equal((await store.listVerificationRequests('pending')).length, 2);
    await store.approveRequest(first.id);
    await store.rejectRequest(second.id);

    const all = await store.listVerificationRequests();
    assert.equal(all.length, 2);
    assert.equal(all.find(item => item.id === first.id)?.status, 'verified');
    assert.equal(all.find(item => item.id === second.id)?.status, 'rejected');
    assert.equal((await store.listVerificationRequests('pending')).length, 0);
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

test('Private Mailanbieter können nicht als Schule verifiziert werden', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'klassio-public-mail-'));
  try {
    const store = createSchoolRegistryStore(dir);
    await assert.rejects(
      () => store.requestVerification({
        requestedByEmail: 'anna@gmail.com',
        schoolName: 'Keine Schule',
        federalState: 'Wien',
      }),
      /PUBLIC_EMAIL_DOMAIN/
    );
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

test('Alle neun österreichischen Bundesländer sind vorgesehen', () => {
  const source = read('src/server/schoolRegistry.ts');
  for (const state of [
    'Burgenland', 'Kärnten', 'Niederösterreich', 'Oberösterreich', 'Salzburg',
    'Steiermark', 'Tirol', 'Vorarlberg', 'Wien',
  ]) {
    assert.match(source, new RegExp(state));
  }
});

test('Server trennt persönliches Konto, Schulregister und Lehrerzimmer', () => {
  const server = read('server.ts');
  assert.match(server, /createSchoolRegistryStore/);
  assert.match(server, /findVerifiedSchoolByEmail\(email\)/);
  assert.match(server, /createTeacherIdentityForSchool\(email, verifiedSchool\)/);
  assert.match(server, /app\.get\('\/api\/schools\/me'/);
  assert.match(server, /app\.post\('\/api\/schools\/verification-requests'/);
  assert.match(server, /verification-requests\/:requestId\/approve/);
  assert.match(server, /app\.get\('\/api\/admin\/schools\/verification-requests'/);
  assert.match(server, /KLASSIO_SCHOOL_ADMIN_EMAILS/);
  assert.match(server, /notifySchoolAdmins/);
  assert.match(server, /notifySchoolVerificationResult/);
  assert.match(server, /setEmailIdentitySession\(req, res, identity\)/);
  assert.match(server, /KLASSIO_SCHOOL_ADMIN_TOKEN/);
});

test('Lehrerzimmer bietet bei unbekannter Schule eine österreichweite Verifizierungsanfrage an', () => {
  const component = read('src/components/Lehrerzimmer.tsx');
  assert.match(component, /Schule zur Verifizierung melden/);
  assert.match(component, /Das funktioniert österreichweit und ist nicht an VOBS gebunden/);
  assert.match(component, /Schulverifizierung anfordern/);
  assert.match(component, /AUSTRIAN_FEDERAL_STATES/);
});

test('Schulverwaltung ist für Admin-Konten in den Konto-Einstellungen integriert', () => {
  const account = read('src/components/settings/AccountSettings.tsx');
  const admin = read('src/components/settings/SchoolVerificationAdmin.tsx');
  const identity = read('src/components/settings/SchoolIdentitySettings.tsx');

  assert.match(account, /SchoolIdentitySettings/);
  assert.match(account, /SchoolVerificationAdmin/);
  assert.match(account, /Auf einem neuen PC genügt dieselbe E-Mail-Adresse, der Anmeldecode und einmal dein bestehendes Tresor-Passwort/);
  assert.match(admin, /Schulverwaltung/);
  assert.match(admin, /\/api\/admin\/schools\/verification-requests/);
  assert.match(admin, /Freigeben/);
  assert.match(admin, /Ablehnen/);
  assert.match(identity, /Du musst nichts neu einrichten/);
  assert.match(identity, /Schulverifizierung anfordern/);
});


test('VOBS-Import enthält 164 eigenständige Schulen mit eindeutiger Schul-Domain', async () => {
  assert.equal(INITIAL_VERIFIED_AUSTRIAN_SCHOOLS.length, 164);
  const allDomains = INITIAL_VERIFIED_AUSTRIAN_SCHOOLS.flatMap(school => school.domains);
  assert.equal(new Set(allDomains).size, 164, 'Keine Domain darf mehrere Schulen verbinden.');
  assert.ok(INITIAL_VERIFIED_AUSTRIAN_SCHOOLS.every(school => school.federalState === 'Vorarlberg'));
  assert.ok(INITIAL_VERIFIED_AUSTRIAN_SCHOOLS.every(school => school.domains.length === 1));
  assert.equal(allDomains.filter(domain => domain.endsWith('.vobs.at')).length, 101);

  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'klassio-vobs-import-'));
  try {
    const store = createSchoolRegistryStore(dir);
    await store.ensureSeedSchools(INITIAL_VERIFIED_AUSTRIAN_SCHOOLS);
    const schools = await store.listVerifiedSchools();
    assert.equal(schools.length, 164);
    for (const school of INITIAL_VERIFIED_AUSTRIAN_SCHOOLS) {
      const resolved = await store.findVerifiedSchoolByEmail('lehrperson@' + school.domains[0]);
      assert.equal(resolved?.id, school.id, school.name);
      assert.equal(resolved?.name, school.name, school.name);
    }
    assert.equal((await store.findVerifiedSchoolByEmail('lehrperson@vobs.at')), null);
    // Separat genannte IT-Kontakt-Domains dürfen die Schule nicht automatisch freischalten.
    for (const alias of ['vsan.vobs.at', 'vsbzm.vobs.at', 'vsegg.vobs.at',
      'vshor.vobs.at', 'vshos.vobs.at', 'vsneb.vobs.at', 'vssb.vobs.at']) {
      assert.equal(await store.findVerifiedSchoolByEmail('lehrperson@' + alias), null, alias);
    }
    await store.ensureSeedSchools(INITIAL_VERIFIED_AUSTRIAN_SCHOOLS);
    assert.equal((await store.listVerifiedSchools()).length, 164);
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

test('Alte Domain-Platzhalter erhalten offizielle Schulnamen ohne ihre Gruppen-ID zu ändern', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'klassio-legacy-vobs-'));
  try {
    const store = createSchoolRegistryStore(dir);
    await store.ensureLegacyDomains(['vsbuc.vobs.at']);
    const old = await store.findVerifiedSchoolByEmail('lehrperson@vsbuc.vobs.at');
    assert.equal(old?.name, 'vsbuc.vobs.at');
    await store.ensureSeedSchools(INITIAL_VERIFIED_AUSTRIAN_SCHOOLS);
    const updated = await store.findVerifiedSchoolByEmail('lehrperson@vsbuc.vobs.at');
    assert.equal(updated?.id, old?.id);
    assert.equal(updated?.name, 'Volksschule Buch');
    assert.equal((await store.listVerifiedSchools()).length, 164);
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

test('Fehlende Schulmail und ausbleibende Codes verweisen auf das Antwortpostfach', () => {
  const login = read('src/components/EmailAccountLogin.tsx');
  const schoolSettings = read('src/components/settings/SchoolIdentitySettings.tsx');
  assert.match(login, /reply@klassio\\.at/);
  assert.match(login, /Bestätigungscode kommt nicht an/);
  assert.match(schoolSettings, /SCHOOL_SUPPORT_EMAIL = 'reply@klassio\\.at'/);
});
