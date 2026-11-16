import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync('server.ts', 'utf8');
const account = readFileSync('src/components/settings/AccountSettings.tsx', 'utf8');
const antolin = readFileSync('src/components/AntolinImportModal.tsx', 'utf8');
const ikm = readFileSync('src/components/DiagnostikLegacy.tsx', 'utf8');
const excel = readFileSync('src/lib/planerExcelService.ts', 'utf8');
const weeklyExcelUi = readFileSync('src/components/WochenplanExcelModal.tsx', 'utf8');
const yearlyExcelUi = readFileSync('src/components/JahresplanExcelModal.tsx', 'utf8');
const appContext = readFileSync('src/context/AppContext.tsx', 'utf8');
const classroomMode = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const aiService = readFileSync('src/services/aiService.ts', 'utf8');


test('security release keeps direct student report AI uploads disabled at UI and server', () => {
  assert.match(server, /app\.post\("\/api\/ai\/analyze-ikm", async \(req, res\) => \{\s*return res\.status\(403\)/);
  assert.match(server, /app\.post\("\/api\/ai\/analyze-antolin", async \(req, res\) => \{\s*return res\.status\(403\)/);
  assert.match(antolin, /disabled=\{loading \|\| AI_STUDENT_REPORTS_DISABLED\}/);
  assert.match(ikm, /!STUDENT_REPORT_AI_DISABLED && !aiImportPreview/);
});

test('account-wide session invalidation is discoverable but does not claim remote vault deletion', () => {
  assert.match(server, /app\.post\('\/api\/access\/logout-all', requireEmailAccount/);
  assert.match(account, /Alle Geräte abmelden/);
  assert.match(account, /Bereits entsperrte Apps auf anderen Geräten können lokal weiterhin offen sein/);
  assert.match(account, /clearActiveVaultSession\(\)/);
});


test('known-vulnerable SheetJS code is never used to parse user workbooks', () => {
  assert.doesNotMatch(excel, /XLSX\.read|sheet_to_json/);
  assert.match(excel, /Excel-Import ist vorübergehend aus Sicherheitsgründen deaktiviert/);
  assert.match(weeklyExcelUi, /EXCEL_IMPORT_DISABLED = true/);
  assert.match(yearlyExcelUi, /EXCEL_IMPORT_DISABLED = true/);
});


test('vulnerable SheetJS is not a direct dependency and templates use the safe writer', () => {
  const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
  const lock = readFileSync('bun.lock', 'utf8');
  assert.equal(manifest.dependencies.xlsx, undefined);
  assert.doesNotMatch(lock, /"xlsx": \["xlsx@/);
  assert.match(excel, /downloadXlsxWorkbook/);
  assert.doesNotMatch(excel, /from ['"]xlsx['"]/);
  const inventoryUi = readFileSync('src/components/InventoryManager.tsx', 'utf8');
  assert.doesNotMatch(inventoryUi, /import\(['"]xlsx['"]\)|XLSX\.read|sheet_to_json/);
  assert.match(inventoryUi, /Excel-Dateien sind aus Sicherheitsgründen derzeit gesperrt/);
  assert.match(inventoryUi, /parseInventoryCsv/);
});

test('mail transport is hardened against parser, header and content-access abuse', () => {
  assert.match(server, /SIMPLE_MAILBOX_RE/);
  assert.match(server, /disableFileAccess: true/);
  assert.match(server, /disableUrlAccess: true/);
  assert.match(server, /requireTLS: Boolean\(SMTP_USER && SMTP_PASS\) && !SMTP_SECURE/);
  assert.match(server, /safeMailHeaderText\(request\.schoolName, 120\)/);
  assert.match(server, /tls: \{ minVersion: 'TLSv1\.2', rejectUnauthorized: true \}/);
});


test('zero-knowledge sync never accepts encryption keys from URL query strings and protects writes', () => {
  assert.doesNotMatch(appContext, /query\.get\(['"]key['"]\)/);
  assert.doesNotMatch(appContext, /query\.get\(['"]sync['"]\)/);
  assert.match(appContext, /X-Klassio-Sync-Write/);
  assert.match(server, /writeTokenHash/);
  assert.match(server, /verifySyncWriteToken/);
  assert.doesNotMatch(classroomMode, /\?sync=/, 'QR/copy links must never put sync material in query strings');
  assert.match(classroomMode, /createSyncUrl\(/);
});


test('voice AI uses temporary student aliases and server fallback filters structured names', () => {
  assert.match(aiService, /TEMP-ID/);
  assert.match(aiService, /temporaryIds\.get\(tempId\)/);
  assert.doesNotMatch(aiService, /\(ID: \$\{s\.id\}\)/);
  assert.match(server, /'vorname', 'firstname', 'studentname', 'schuelername'/);
  assert.match(server, /isSafeStudentAlias/);
  assert.match(server, /'studentid', 'schuelerid'/);
});


test('verification email delivery is bounded per source and globally', () => {
  assert.match(server, /emailIpWindows/);
  assert.match(server, /emailServerWindow/);
  assert.match(server, /allowVerificationEmailSend/);
  assert.match(server, /const perIpLimit = 30/);
  assert.match(server, /const globalLimit = 200/);
  assert.match(server, /Retry-After/);
});


test('public read-only audit reports exact live version without credentials or writes', () => {
  const diagnostic = readFileSync('scripts/public-security-readonly.mjs', 'utf8');
  assert.match(diagnostic, /'\/api\/release'/);
  assert.match(diagnostic, /report\.releaseCommit/);
  assert.match(diagnostic, /\^\[a-f0-9\]\{40\}\$/);
  assert.match(diagnostic, /method: 'GET'/);
  assert.match(diagnostic, /if \(!response\.bodyUsed\) await response\.body\?\.cancel\(\)/);
  assert.doesNotMatch(diagnostic, /method: 'POST'|method: 'PUT'|Authorization:|Cookie:/);
});


test('release parity is checked against GitHub main without mutating the host', () => {
  const diagnostic = readFileSync('scripts/public-security-readonly.mjs', 'utf8');
  const workflow = readFileSync('.github/workflows/public-security-readonly.yml', 'utf8');
  assert.match(diagnostic, /process\.env\.EXPECTED_KLASSIO_COMMIT/);
  assert.match(diagnostic, /LIVE_RELEASE_PARITY=/);
  assert.match(diagnostic, /liveCommit === expectedCommit \? 'MATCH' : 'DIFFERENT'/);
  assert.match(diagnostic, /GITHUB_STEP_SUMMARY/);
  assert.match(workflow, /push:\s*branches:\s*- main/);
  assert.match(workflow, /github\.event\.pull_request\.base\.sha \|\| github\.sha/);
  assert.match(workflow, /continue-on-error: true/);
});
