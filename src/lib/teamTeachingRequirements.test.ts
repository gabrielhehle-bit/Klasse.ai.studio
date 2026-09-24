import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

test('Teamteaching ist an verifizierte Schulidentität und eigene API gebunden', () => {
  const server = read('server.ts');
  assert.match(server, /createClassCollaborationStore/);
  assert.match(server, /app\.get\('\/api\/teamteaching\/me', requireTeacherIdentity/);
  assert.match(server, /app\.put\('\/api\/teamteaching\/devices', requireTeacherIdentity/);
  assert.match(server, /app\.post\('\/api\/teamteaching\/classes', requireTeacherIdentity/);
  assert.match(server, /app\.put\('\/api\/teamteaching\/classes\/:classId\/snapshot', requireTeacherIdentity/);
  assert.match(server, /REVISION_CONFLICT/);
  assert.match(server, /MEMBER_DEVICE_REQUIRED/);
});

test('Teamteaching verschlüsselt ausschließlich die Klasse und entfernt lokale Sync-Metadaten', () => {
  const crypto = read('src/lib/teamTeachingCrypto.ts');
  assert.match(crypto, /AES/);
  assert.match(crypto, /RSA-OAEP/);
  assert.match(crypto, /delete clone\.teamTeaching/);
  assert.match(crypto, /encryptData\(classRoomWithoutTeamMetadata\(room\), classKey\)/);
});

test('Klassenteam ist als Klassenwerkzeug erreichbar', () => {
  const app = read('src/App.tsx');
  const hub = read('src/components/KlasseHub.tsx');
  assert.match(app, /ClassTeam/);
  assert.match(app, /case 'teamteaching': return <ClassTeam/);
  assert.match(hub, /id: 'teamteaching'/);
  assert.match(hub, /title: 'Teamteaching \/ Klassenteam'/);
  const sidebar = read('src/components/Sidebar.tsx');
  assert.match(sidebar, /id: 'teamteaching'.*label: 'Teamteaching'/);
});

test('Teamteaching bietet bei fehlender Schulidentität die E-Mail-Anmeldung direkt an', () => {
  const team = read('src/components/ClassTeam.tsx');
  const login = read('src/components/EmailAccountLogin.tsx');
  assert.match(team, /EmailAccountLogin/);
  assert.match(team, /needsSchoolLogin/);
  assert.match(team, /verifizierten Schulmail/);
  assert.match(login, /\/api\/access\/email\/request/);
  assert.match(login, /\/api\/access\/email\/verify/);
});

test('Hintergrundsync überschreibt Konflikte nicht still', () => {
  const context = read('src/context/AppContext.tsx');
  assert.match(context, /remote\.detail\.revision > meta\.revision/);
  assert.match(context, /localHash !== baseline/);
  assert.match(context, /syncStatus: 'conflict'|setLocalTeamStatus\(\s*'conflict'/s);
  assert.match(context, /pushSharedClass\(latestRoom\)/);
  assert.match(context, /const latest = syncActiveClass\(currentAppRef\.current\)/);
  assert.match(context, /classRoomFingerprint\(stillActive\) !== expectedHash/);
});
