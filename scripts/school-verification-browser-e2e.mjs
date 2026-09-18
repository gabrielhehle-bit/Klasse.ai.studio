import fs from 'node:fs/promises';

const BASE_URL = process.env.KLASSIO_E2E_BASE_URL || 'http://localhost:3100';
const DEBUG_TEACHER = process.env.KLASSIO_CHROME_DEBUG_TEACHER || 'http://127.0.0.1:9232';
const DEBUG_ADMIN = process.env.KLASSIO_CHROME_DEBUG_ADMIN || 'http://127.0.0.1:9233';
const TEACHER_EMAIL = process.env.KLASSIO_E2E_TEACHER_EMAIL || 'lehrkraft.e2e@vs-neu.wien';
const ADMIN_EMAIL = process.env.KLASSIO_E2E_ADMIN_EMAIL || 'admin.e2e@klassio.local';
const TEACHER_VAULT = process.env.KLASSIO_E2E_TEACHER_VAULT || 'Klassio-E2E-Lehrkraft-2026!';
const ADMIN_VAULT = process.env.KLASSIO_E2E_ADMIN_VAULT || 'Klassio-E2E-Admin-2026!';
const SMTP_CODES = process.env.KLASSIO_E2E_SMTP_CODES || '/tmp/klassio-school-mail.json';
const SCREENSHOT_TEACHER = process.env.KLASSIO_E2E_SCREENSHOT_TEACHER || '/tmp/klassio-school-teacher.png';
const SCREENSHOT_ADMIN = process.env.KLASSIO_E2E_SCREENSHOT_ADMIN || '/tmp/klassio-school-admin.png';
const LEGACY_IMPORT_FILE = '/tmp/klassio-legacy-import.json';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const q = value => JSON.stringify(value);

class CdpClient {
  constructor(url, name) {
    this.url = url;
    this.name = name;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.ws = null;
  }
  async connect() {
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      this.ws = ws;
      ws.onopen = resolve;
      ws.onerror = reject;
      ws.onmessage = event => {
        const message = JSON.parse(String(event.data));
        if (message.id) {
          const pending = this.pending.get(message.id);
          if (!pending) return;
          this.pending.delete(message.id);
          if (message.error) pending.reject(new Error(message.error.message || 'CDP error'));
          else pending.resolve(message.result);
          return;
        }
        if (message.method) {
          for (const handler of this.listeners.get(message.method) || []) handler(message.params || {});
        }
      };
      ws.onclose = () => {
        for (const pending of this.pending.values()) pending.reject(new Error(this.name + ': Chrome DevTools connection closed.'));
        this.pending.clear();
      };
    });
  }
  on(method, handler) {
    const handlers = this.listeners.get(method) || [];
    handlers.push(handler);
    this.listeners.set(method, handlers);
  }
  send(method, params = {}) {
    if (!this.ws) throw new Error(this.name + ': CDP client is not connected.');
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.ws?.close(); }
}

async function waitForChrome(debugUrl) {
  let lastError;
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const response = await fetch(debugUrl + '/json/version');
      if (response.ok) return;
    } catch (error) { lastError = error; }
    await sleep(250);
  }
  throw new Error(debugUrl + ': Chrome DevTools endpoint did not become ready: ' + String(lastError || 'timeout'));
}

async function createClient(debugUrl, name) {
  await waitForChrome(debugUrl);
  const response = await fetch(debugUrl + '/json/new?' + encodeURIComponent(BASE_URL), { method: 'PUT' });
  if (!response.ok) throw new Error(name + ': could not create Chrome target: HTTP ' + response.status);
  const target = await response.json();
  const client = new CdpClient(target.webSocketDebuggerUrl, name);
  await client.connect();
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Network.enable');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false,
  });
  return client;
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (result.exceptionDetails) throw new Error(client.name + ': ' + (result.exceptionDetails.text || 'Browser evaluation failed.'));
  return result.result?.value;
}

async function waitFor(client, description, expression, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  let lastValue;
  while (Date.now() < deadline) {
    try {
      lastValue = await evaluate(client, expression);
      if (lastValue) {
        console.log('✓ ' + client.name + ': ' + description);
        return lastValue;
      }
    } catch {}
    await sleep(200);
  }
  throw new Error(client.name + ': timeout waiting for ' + description + ' (last value: ' + String(lastValue) + ')');
}

async function setInputByLabel(client, labelText, value) {
  const expression =
    '(() => {' +
    'const norm=v=>String(v||"").replace(/\\s+/g," ").trim().toLowerCase();' +
    'const expected=norm(' + q(labelText) + ');' +
    'const labels=Array.from(document.querySelectorAll("label")).filter(label=>norm(label.textContent).includes(expected));' +
    'const label=labels[0]; let input=null;' +
    'if(label){input=label.querySelector("input,textarea,select");' +
      'if(!input&&label.htmlFor)input=document.getElementById(label.htmlFor);' +
      'if(!input&&label.parentElement)input=label.parentElement.querySelector("input,textarea,select");}' +
    'if(!input){input=Array.from(document.querySelectorAll("input,textarea,select")).find(field=>norm(field.getAttribute("aria-label")).includes(expected)||norm(field.getAttribute("placeholder")).includes(expected));}' +
    'if(!input)return false;' +
    'const proto=input instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:input instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;' +
    'const setter=Object.getOwnPropertyDescriptor(proto,"value")?.set;' +
    'if(setter)setter.call(input,' + q(value) + '); else input.value=' + q(value) + ';' +
    'input.focus(); input.dispatchEvent(new Event("input",{bubbles:true})); input.dispatchEvent(new Event("change",{bubbles:true})); return true;' +
    '})()';
  if (!await evaluate(client, expression)) throw new Error(client.name + ': could not fill field "' + labelText + '".');
}

async function clickButton(client, text, exact = false) {
  const comparison = exact ? 'current===expected' : 'current.includes(expected)';
  const expression =
    '(() => {' +
    'const norm=v=>String(v||"").replace(/\\s+/g," ").trim(); const expected=' + q(text) + ';' +
    'const node=Array.from(document.querySelectorAll("button")).find(el=>{' +
      'const current=norm(el.textContent); if(!(' + comparison + '))return false;' +
      'const style=getComputedStyle(el); const rect=el.getBoundingClientRect();' +
      'return !el.disabled&&style.visibility!=="hidden"&&style.display!=="none"&&rect.width>0&&rect.height>0;});' +
    'if(!node)return false; node.click(); return true;' +
    '})()';
  if (!await evaluate(client, expression)) throw new Error(client.name + ': could not click button "' + text + '".');
}

async function clickSidebar(client, label) {
  const visible = await evaluate(client,
    'Array.from(document.querySelectorAll("button")).some(button=>{' +
    'const text=String(button.textContent||"").replace(/\\s+/g," ").trim();' +
    'const style=getComputedStyle(button); const rect=button.getBoundingClientRect();' +
    'return text===' + q(label) + '&&style.visibility!=="hidden"&&style.display!=="none"&&rect.width>0&&rect.height>0;' +
    '})'
  );
  if (!visible) {
    const hasMore = await evaluate(client,
      'Array.from(document.querySelectorAll("button")).some(button=>String(button.textContent||"").replace(/\\s+/g," ").trim().startsWith("Mehr ("))'
    );
    if (hasMore) {
      await clickButton(client, 'Mehr');
      await sleep(250);
    }
  }
  await clickButton(client, label, true);
  await waitFor(
    client,
    'sidebar page ' + label,
    'Array.from(document.querySelectorAll("button[aria-current=page]")).some(current=>String(current.textContent||"").replace(/\\s+/g," ").trim()===' + q(label) + ')',
  );
}

async function clickCheckboxNearText(client, text) {
  const expression =
    '(() => {' +
    'const norm=v=>String(v||"").replace(/\\s+/g," ").trim(); const expected=' + q(text) + ';' +
    'const label=Array.from(document.querySelectorAll("label")).find(item=>norm(item.textContent).includes(expected));' +
    'const checkbox=label?.querySelector("input[type=checkbox]"); if(!checkbox)return false; checkbox.click(); return checkbox.checked;' +
    '})()';
  if (!await evaluate(client, expression)) throw new Error(client.name + ': could not tick checkbox "' + text + '".');
}

async function saveScreenshot(client, path) {
  const screenshot = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await fs.writeFile(path, Buffer.from(screenshot.data, 'base64'));
}

async function waitForMailCode(email) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const data = JSON.parse(await fs.readFile(SMTP_CODES, 'utf8'));
      const code = data[email.toLowerCase()]?.code;
      if (/^\d{6}$/.test(String(code || ''))) return String(code);
    } catch {}
    await sleep(150);
  }
  throw new Error('No captured SMTP login code for ' + email);
}

async function waitForAdminNotification() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const data = JSON.parse(await fs.readFile(SMTP_CODES, 'utf8'));
      const messages = Array.isArray(data.__messages) ? data.__messages : [];
      if (messages.some(item => item.to === ADMIN_EMAIL.toLowerCase() && item.code === null)) {
        console.log('✓ SMTP: school verification notification reached admin mailbox');
        return;
      }
    } catch {}
    await sleep(150);
  }
  throw new Error('No captured school verification notification for ' + ADMIN_EMAIL);
}

async function setFileInput(client, selector, filePath) {
  const document = await client.send('DOM.getDocument', { depth: -1, pierce: true });
  const match = await client.send('DOM.querySelector', {
    nodeId: document.root.nodeId,
    selector,
  });
  if (!match.nodeId) throw new Error(client.name + ': file input not found for ' + selector);
  await client.send('DOM.setFileInputFiles', {
    nodeId: match.nodeId,
    files: [filePath],
  });
}

async function accountRevision(client) {
  return Number(await evaluate(
    client,
    'fetch("/api/account-sync",{cache:"no-store"}).then(async r=>r.status===404?0:Number((await r.json()).revision||0))'
  )) || 0;
}

async function importLegacyJsonAndVerifySync(client) {
  const legacy = {
    version: 2,
    activeClassId: 'legacy-browser-3a',
    schuljahr: '2025/26',
    klassen: [
      {
        id: 'legacy-browser-3a',
        name: 'Legacy 3A',
        stufe: 3,
        schuljahr: '2025/26',
        schueler: [
          { id: 'legacy-emma', vorname: 'Emma', nachname: 'Altbestand' },
          { id: 'legacy-ben', vorname: 'Ben', nachname: 'Altbestand' },
        ],
        wochenplanung: {
          '38': {
            Mittwoch: {
              1: { fach: 'Mathematik', thema: 'Zahlenraum 100' },
            },
          },
        },
        noten: {
          Mathematik: {
            'legacy-emma': [{ id: 'legacy-note-1', wert: 2, titel: 'Kopfrechnen' }],
          },
        },
      },
    ],
  };
  await fs.writeFile(LEGACY_IMPORT_FILE, JSON.stringify(legacy), 'utf8');

  const beforeRevision = await accountRevision(client);
  await clickSidebar(client, 'Datensicherung');
  await waitFor(client, 'backup page', 'document.body?.innerText.includes("Backup wiederherstellen")', 20000);
  await evaluate(client, 'window.confirm=()=>true');
  await setFileInput(
    client,
    'input[aria-label="Klassio-Sicherungsdatei auswählen (.json / Legacy .lehrerapp)"]',
    LEGACY_IMPORT_FILE,
  );

  await waitFor(client, 'legacy backup restored', 'document.body?.innerText.includes("Wiederhergestellt")', 30000);
  await waitFor(
    client,
    'legacy import pushed to account sync',
    'fetch("/api/account-sync",{cache:"no-store"}).then(async r=>r.ok&&Number((await r.json()).revision||0)>' + beforeRevision + ')',
    30000,
  );

  await clickSidebar(client, 'Klassenliste');
  await waitFor(
    client,
    'legacy JSON student visible',
    'document.body?.innerText.includes("Altbestand Emma") || document.body?.innerText.includes("Emma Altbestand")',
    20000,
  );
  await waitFor(client, 'legacy JSON class visible', 'document.body?.innerText.includes("Legacy 3A")', 20000);
  console.log('✓ Legacy JSON import restored old data and advanced encrypted account sync revision');
}

async function finishVaultSetup(client, password) {
  await waitFor(client, 'local vault setup', 'document.body?.innerText.toLowerCase().includes("lokalen datentresor einrichten")', 30000);
  await setInputByLabel(client, 'Tresor-Passwort vergeben', password);
  await setInputByLabel(client, 'Passwort bestätigen', password);
  await clickButton(client, 'Weiter zum Wiederherstellungscode');
  await waitFor(client, 'recovery code screen', 'document.body?.innerText.toLowerCase().includes("dein einmaliger wiederherstellungscode")', 30000);
  await clickCheckboxNearText(client, 'Ich habe den Wiederherstellungscode sicher notiert');
  await clickButton(client, 'Einrichtung abschließen');
  await waitFor(client, 'first-run intro', 'document.body?.innerText.toLowerCase().includes("klassio passt sich dir an")', 30000);
  await clickButton(client, 'Überspringen');
  await waitFor(client, 'daily dashboard', 'Array.from(document.querySelectorAll("button")).some(button=>String(button.textContent||"").trim()==="Heute")', 30000);
}

async function loginWithMail(client, email, password) {
  await client.send('Page.navigate', { url: BASE_URL });
  await waitFor(client, 'email login field', 'Boolean(document.querySelector("input[type=email]"))', 30000);
  await setInputByLabel(client, 'E-Mail', email);
  await clickButton(client, 'Anmeldecode senden');
  await waitFor(client, 'six digit login code field', 'document.body?.innerText.toLowerCase().includes("6-stelliger anmeldecode")', 20000);
  const code = await waitForMailCode(email);
  await setInputByLabel(client, '6-stelliger Anmeldecode', code);
  await clickButton(client, 'Klassio öffnen');
  await finishVaultSetup(client, password);
}

async function createClassInUi(client, className) {
  const opened = await evaluate(client,
    '(() => {' +
    'const norm=v=>String(v||"").replace(/\\s+/g," ").trim();' +
    'const candidates=Array.from(document.querySelectorAll("div")).filter(el=>norm(el.textContent).includes("Klasse Ohne Namen"));' +
    'const node=candidates.sort((a,b)=>a.getBoundingClientRect().width-b.getBoundingClientRect().width).find(el=>{' +
      'const style=getComputedStyle(el); const rect=el.getBoundingClientRect();' +
      'return style.visibility!=="hidden"&&style.display!=="none"&&rect.width>0&&rect.height>0&&style.cursor==="pointer";' +
    '});' +
    'if(!node)return false; node.click(); return true;' +
    '})()'
  );
  if (!opened) throw new Error(client.name + ': could not open class selector.');
  await waitFor(client, 'class dropdown', 'document.body?.innerText.includes("Klasse hinzufügen")');
  await clickButton(client, 'Klasse hinzufügen');
  await waitFor(client, 'new class setup', 'document.body?.innerText.includes("Klasse & Theme")', 20000);
  await setInputByLabel(client, 'Klassenbezeichnung', className);
  for (const step of ['Fächer', 'Stundenplan', 'Schüler']) {
    await clickButton(client, 'Nächster Schritt');
    await waitFor(client, 'setup step ' + step, 'document.body?.innerText.includes(' + q(step) + ')');
  }
  await clickButton(client, 'Nächster Schritt');
  await waitFor(client, 'setup step Übersicht', 'document.body?.innerText.includes("Bereit für deine Klasse")');
  await clickButton(client, 'Einrichtung abschließen');
  await waitFor(client, 'class setup retained', 'document.body?.innerText.includes(' + q(className) + ')', 30000);
}

async function addStudentInUi(client, firstName, lastName) {
  await clickSidebar(client, 'Klassenliste');
  await waitFor(client, 'student list', 'document.body?.innerText.includes("Schüler hinzufügen")', 20000);
  await clickButton(client, 'Schüler hinzufügen');
  await waitFor(client, 'new student form', 'document.body?.innerText.includes("Neuer Schüler")', 20000);
  await setInputByLabel(client, 'Vorname', firstName);
  await setInputByLabel(client, 'Nachname', lastName);
  await clickButton(client, 'Anlegen');
  await waitFor(
    client,
    'new student saved',
    'document.body?.innerText.includes(' + q(lastName + ' ' + firstName) + ') || document.body?.innerText.includes(' + q(firstName + ' ' + lastName) + ')',
    20000,
  );
  console.log('✓ Student creation button saves a new student');
}

async function openAccountSettings(client) {
  await clickSidebar(client, 'Einstellungen');
  await waitFor(client, 'settings page', 'document.body?.innerText.includes("Was möchtest du in Klassio anpassen?")', 20000);
  await clickButton(client, 'Konto', true);
  await waitFor(client, 'account settings', 'document.body?.innerText.includes("Konto & Schulmail")', 20000);
}

async function main() {
  await fs.rm(SMTP_CODES, { force: true }).catch(() => {});
  const teacher = await createClient(DEBUG_TEACHER, 'Bestehende Lehrkraft');
  const admin = await createClient(DEBUG_ADMIN, 'Klassio Admin');
  const uncaught = [];
  for (const client of [teacher, admin]) {
    client.on('Runtime.exceptionThrown', params => {
      const details = params.exceptionDetails || {};
      uncaught.push(client.name + ': ' + (details.exception?.description || details.text || 'Unknown browser exception'));
    });
  }

  try {
    await loginWithMail(teacher, TEACHER_EMAIL, TEACHER_VAULT);
    await createClassInUi(teacher, 'Heute eingerichtet 1A');
    await addStudentInUi(teacher, 'Browser', 'Kind');
    await importLegacyJsonAndVerifySync(teacher);
    await openAccountSettings(teacher);

    await waitFor(teacher, 'unknown school can be connected', 'document.body?.innerText.includes("Schule verbinden")', 20000);
    await setInputByLabel(teacher, 'Name der Schule', 'Volksschule Neu');
    await setInputByLabel(teacher, 'Bundesland', 'Wien');
    await clickButton(teacher, 'Schulverifizierung anfordern');
    await waitFor(teacher, 'school request is pending', 'document.body?.innerText.includes("Schulverifizierung läuft")', 20000);
    await waitForAdminNotification();

    await loginWithMail(admin, ADMIN_EMAIL, ADMIN_VAULT);
    await openAccountSettings(admin);
    await waitFor(admin, 'admin school queue visible', 'document.body?.innerText.includes("Schulverwaltung") && document.body?.innerText.includes("Volksschule Neu")', 20000);
    await clickButton(admin, 'Freigeben');
    await waitFor(admin, 'school approved', 'document.body?.innerText.includes("Volksschule Neu wurde freigeschaltet")', 20000);

    await clickButton(teacher, 'Status aktualisieren');
    await waitFor(teacher, 'school identity becomes verified', 'document.body?.innerText.includes("Schule verifiziert") && document.body?.innerText.includes("Volksschule Neu")', 20000);
    await waitFor(teacher, 'imported class remains after school approval', 'document.body?.innerText.includes("Legacy 3A")', 20000);
    await clickSidebar(teacher, 'Klassenliste');
    await waitFor(teacher, 'legacy student remains after school approval', 'document.body?.innerText.includes("Altbestand Emma") || document.body?.innerText.includes("Emma Altbestand")', 20000);

    const identityActive = await evaluate(teacher,
      'fetch("/api/access/status",{cache:"no-store"}).then(r=>r.json()).then(data=>Boolean(data.identity&&data.identity.schoolName==="Volksschule Neu"))'
    );
    if (!identityActive) throw new Error('Teacher school identity did not activate automatically after approval.');
    console.log('✓ Existing teacher data survived email/school integration and identity activated automatically');

    await saveScreenshot(teacher, SCREENSHOT_TEACHER);
    await saveScreenshot(admin, SCREENSHOT_ADMIN);

    if (uncaught.length) throw new Error('Uncaught browser exceptions:\n' + uncaught.join('\n---\n'));
    console.log('Klassio school verification browser E2E passed.');
  } catch (error) {
    try { await saveScreenshot(teacher, SCREENSHOT_TEACHER); } catch {}
    try { await saveScreenshot(admin, SCREENSHOT_ADMIN); } catch {}
    throw error;
  } finally {
    teacher.close();
    admin.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
