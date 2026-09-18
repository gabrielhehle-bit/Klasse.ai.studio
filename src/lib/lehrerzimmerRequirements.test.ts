import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createTeacherIdentity } from '../server/teacherIdentity';
import { createLehrerzimmerStore } from '../server/lehrerzimmerStore';

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('Schul-E-Mail wird deterministisch genau einer Schulgruppe zugeordnet', () => {
  const identity = createTeacherIdentity('gabriel.hehle@vsfoa.vobs.at', ['vsfoa.vobs.at']);
  assert.ok(identity);
  assert.equal(identity.schoolId, 'vsfoa.vobs.at');
  assert.equal(identity.schoolCode, 'vsfoa');
  assert.equal(identity.schoolDomain, 'vsfoa.vobs.at');
  assert.equal(identity.handle, 'gabriel.hehle');
  assert.equal(identity.displayName, 'Gabriel Hehle');

  assert.equal(
    createTeacherIdentity('gabriel@example.com', ['vsfoa.vobs.at']),
    null,
    'Fremde Domains dürfen keine Schulidentität erhalten.'
  );

  const broadAllowed = createTeacherIdentity('gabriel.hehle@vsfoa.vobs.at', ['vobs.at']);
  assert.ok(broadAllowed);
  assert.equal(
    broadAllowed.schoolId,
    'vsfoa.vobs.at',
    'Eine breite Freigabe darf verschiedene Schul-Domains nicht zu einer gemeinsamen Gruppe zusammenfassen.'
  );
});

test('Lehrerzimmer trennt Beiträge strikt nach verifizierter Schulgruppe', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'klassio-lehrerzimmer-'));
  try {
    const store = createLehrerzimmerStore(dir);
    const oberau = createTeacherIdentity('anna.test@vsfoa.vobs.at', ['vsfoa.vobs.at']);
    const andere = createTeacherIdentity('max.test@vstest.vobs.at', ['vstest.vobs.at']);
    assert.ok(oberau && andere);

    await store.createPost(oberau, {
      category: 'organisation',
      kind: 'beitrag',
      title: 'Konferenz',
      body: 'Bitte Termin beachten.',
    });

    await store.createPost(andere, {
      category: 'info',
      kind: 'beitrag',
      title: 'Andere Schule',
      body: 'Darf in Oberau nicht auftauchen.',
    });

    const oberauPosts = await store.listPosts(oberau);
    const anderePosts = await store.listPosts(andere);

    assert.equal(oberauPosts.length, 1);
    assert.equal(oberauPosts[0].title, 'Konferenz');
    assert.equal(anderePosts.length, 1);
    assert.equal(anderePosts[0].title, 'Andere Schule');
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

test('@Erwähnungen werden auf Kollegiumsbenutzer derselben Schule aufgelöst', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'klassio-lehrerzimmer-mention-'));
  try {
    const store = createLehrerzimmerStore(dir);
    const anna = createTeacherIdentity('anna.test@vsfoa.vobs.at', ['vsfoa.vobs.at']);
    const bob = createTeacherIdentity('bob.test@vsfoa.vobs.at', ['vsfoa.vobs.at']);
    assert.ok(anna && bob);

    await store.ensureUser(anna);
    await store.ensureUser(bob);

    const post = await store.createPost(anna, {
      category: 'unterricht',
      kind: 'frage',
      title: 'Material',
      body: '@bob.test hast du das Arbeitsblatt?',
    });

    assert.deepEqual(post.mentions, [bob.userId]);

    const reply = await store.addReply(bob, post.id, '@anna.test ja, ich schicke es dir.');
    assert.deepEqual(reply.mentions, [anna.userId]);
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

test('Lehrerzimmer speichert Gelesen-Status pro Lehrperson und macht neue Antworten wieder ungelesen', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'klassio-lehrerzimmer-unread-'));
  try {
    const store = createLehrerzimmerStore(dir);
    const anna = createTeacherIdentity('anna.test@vsfoa.vobs.at', ['vsfoa.vobs.at']);
    const bob = createTeacherIdentity('bob.test@vsfoa.vobs.at', ['vsfoa.vobs.at']);
    assert.ok(anna && bob);

    await store.ensureUser(anna);
    await store.ensureUser(bob);
    const post = await store.createPost(bob, {
      category: undefined,
      kind: undefined,
      title: undefined,
      body: 'Wer hat morgen Aufsicht?',
    });

    assert.equal(post.quick, true);
    assert.equal(post.category, 'info');
    assert.equal(post.kind, 'beitrag');

    const annaPosts = await store.listPosts(anna);
    assert.equal(annaPosts[0].unread, true);
    assert.equal((await store.getUnreadSummary(anna)).count, 1);
    assert.equal((await store.getUnreadSummary(bob)).count, 0);

    await store.markPostsRead(anna, [post.id]);
    assert.equal((await store.getUnreadSummary(anna)).count, 0);

    await store.addReply(bob, post.id, 'Ich tausche mit dir.');
    assert.equal((await store.getUnreadSummary(anna)).count, 1);
    assert.equal((await store.listPosts(anna))[0].unread, true);
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

test('Lehrerzimmer ist direkter Hauptbereich und im App-Routing vorhanden', () => {
  const sidebar = read('src/components/Sidebar.tsx');
  const nav = read('src/lib/sidebarNavigation.ts');
  const app = read('src/App.tsx');
  const catalog = read('src/lib/settingsModuleCatalog.ts');

  assert.match(sidebar, /id: 'lehrerzimmer'.*label: 'Lehrerzimmer'/s);
  assert.match(nav, /DAILY_PAGES = \[[^\]]*'lehrerzimmer'/s);
  assert.match(app, /case 'lehrerzimmer': return <Lehrerzimmer \/>/);
  assert.match(app, /case 'lehrerzimmer': return 'Lehrerzimmer'/);
  assert.match(catalog, /id: 'lehrerzimmer'.*@Erwähnungen/s);
});

test('Lehrerzimmer benötigt eine verifizierte Schulidentität getrennt vom persönlichen Konto', () => {
  const server = read('server.ts');

  assert.match(server, /klassio_email_account/);
  assert.match(server, /klassio_email_identity/);
  assert.match(server, /requireTeacherIdentity/);
  assert.match(server, /nur mit einer verifizierten Schulidentität verfügbar/);
  assert.match(server, /findVerifiedSchoolByEmail\(account\.email\)/);
  assert.match(server, /clearEmailSessions\(req, res\)/);
});

test('Lehrerzimmer UI greift nicht auf lokale Klassen- oder Schülerdaten zu', () => {
  const component = read('src/components/Lehrerzimmer.tsx');

  assert.doesNotMatch(component, /useApp\(/);
  assert.doesNotMatch(component, /AppContext/);
  assert.doesNotMatch(component, /schueler|noten|diagnostik/i);
  assert.match(component, /\/api\/lehrerzimmer\//);
});


test('Nur der Autor darf einen Lehrerzimmer-Beitrag ändern oder löschen', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'klassio-lehrerzimmer-rights-'));
  try {
    const store = createLehrerzimmerStore(dir);
    const anna = createTeacherIdentity('anna.test@vsfoa.vobs.at', ['vsfoa.vobs.at']);
    const bob = createTeacherIdentity('bob.test@vsfoa.vobs.at', ['vsfoa.vobs.at']);
    assert.ok(anna && bob);

    await store.ensureUser(anna);
    await store.ensureUser(bob);

    const post = await store.createPost(anna, {
      category: 'organisation',
      kind: 'beitrag',
      title: 'Alt',
      body: 'Alter Text',
    });

    const updated = await store.updatePost(anna, post.id, {
      category: 'info',
      kind: 'frage',
      title: 'Neu',
      body: '@bob.test neue Frage',
    });

    assert.equal(updated.title, 'Neu');
    assert.equal(updated.category, 'info');
    assert.equal(updated.kind, 'frage');
    assert.deepEqual(updated.mentions, [bob.userId]);

    await assert.rejects(
      () => store.updatePost(bob, post.id, {
        category: 'info',
        kind: 'beitrag',
        title: 'Fremd',
        body: 'Darf nicht funktionieren',
      }),
      /FORBIDDEN/
    );

    await assert.rejects(
      () => store.deletePost(bob, post.id),
      /FORBIDDEN/
    );

    await store.deletePost(anna, post.id);
    assert.equal((await store.listPosts(anna)).length, 0);
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

test('Nur der Autor einer Antwort darf diese Antwort löschen', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'klassio-lehrerzimmer-reply-rights-'));
  try {
    const store = createLehrerzimmerStore(dir);
    const anna = createTeacherIdentity('anna.test@vsfoa.vobs.at', ['vsfoa.vobs.at']);
    const bob = createTeacherIdentity('bob.test@vsfoa.vobs.at', ['vsfoa.vobs.at']);
    assert.ok(anna && bob);

    const post = await store.createPost(anna, {
      category: 'unterricht',
      kind: 'frage',
      title: 'Frage',
      body: 'Wer weiß Bescheid?',
    });
    const reply = await store.addReply(bob, post.id, 'Ich.');

    await assert.rejects(
      () => store.deleteReply(anna, post.id, reply.id),
      /FORBIDDEN/
    );

    await store.deleteReply(bob, post.id, reply.id);
    const [remaining] = await store.listPosts(anna);
    assert.equal(remaining.replies.length, 0);
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

test('Bearbeiten- und Löschen-APIs sind durch Schulidentität geschützt', () => {
  const server = read('server.ts');

  assert.match(server, /app\.put\('\/api\/lehrerzimmer\/posts\/:postId', requireTeacherIdentity/);
  assert.match(server, /app\.delete\('\/api\/lehrerzimmer\/posts\/:postId', requireTeacherIdentity/);
  assert.match(server, /app\.delete\('\/api\/lehrerzimmer\/posts\/:postId\/replies\/:replyId', requireTeacherIdentity/);
  assert.match(server, /code === 'FORBIDDEN'.*status\(403\)/s);
});

test('Lehrerzimmer zeigt Bearbeiten und Löschen nur für eigene Inhalte', () => {
  const component = read('src/components/Lehrerzimmer.tsx');

  assert.match(component, /const isOwnPost = me\?\.user\.userId === post\.authorId/);
  assert.match(component, /const isOwnReply = me\?\.user\.userId === reply\.authorId/);
  assert.match(component, /startEditingPost\(post\)/);
  assert.match(component, /deleteOwnPost\(post\.id\)/);
  assert.match(component, /deleteOwnReply\(post\.id, reply\.id\)/);
});


test('Lehrerzimmer ist fest unter Tools sichtbar und signalisiert ungelesene Nachrichten', () => {
  const sidebar = read('src/components/Sidebar.tsx');
  const dashboard = read('src/components/Dashboard.tsx');
  const component = read('src/components/Lehrerzimmer.tsx');
  const server = read('server.ts');
  const unreadHook = read('src/hooks/useLehrerzimmerUnread.ts');

  assert.match(
    unreadHook,
    /const timer = window\.setInterval\(\(\) => \{\s*void refresh\(\);\s*\}, pollMs\);/
  );

  assert.match(sidebar, /'tools',[\s\S]*'lehrerzimmer'/);
  assert.match(sidebar, /id: 'lehrerzimmer'.*section: 'Tools'/);
  assert.match(sidebar, /item\.id === 'lehrerzimmer'/);
  assert.match(sidebar, /toolsIndex/);
  assert.match(sidebar, /lehrerzimmerUnread\.count > 0/);
  assert.match(dashboard, /data-testid="dashboard-lehrerzimmer-unread"/);
  assert.match(dashboard, /setPage\("lehrerzimmer"\)/);
  assert.match(component, /data-testid="lehrerzimmer-quick-message"/);
  assert.match(component, /JSON\.stringify\(\{ body: message \}\)/);
  assert.match(component, /data-unread=\{post\.unread/);
  assert.match(server, /app\.get\('\/api\/lehrerzimmer\/unread', requireTeacherIdentity/);
  assert.match(server, /app\.post\('\/api\/lehrerzimmer\/read', requireTeacherIdentity/);
});
