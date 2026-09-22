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
const SCREENSHOT_COCKPIT = process.env.KLASSIO_E2E_SCREENSHOT_COCKPIT || '/tmp/klassio-school-cockpit.png';
const SCREENSHOT_RANDOM = process.env.KLASSIO_E2E_SCREENSHOT_RANDOM || '/tmp/klassio-random-picker.png';

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
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(this.name + ': Chrome CDP ' + method + ' timed out'));
      }, 20000);
      this.pending.set(id, {
        resolve: value => { clearTimeout(timer); resolve(value); },
        reject: error => { clearTimeout(timer); reject(error); },
      });
      try { this.ws.send(JSON.stringify({ id, method, params })); }
      catch (error) { clearTimeout(timer); this.pending.delete(id); reject(error); }
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

async function finishVaultSetup(client, password) {
  await waitFor(client, 'local vault setup', 'document.body?.innerText.toLowerCase().includes("lokalen datentresor einrichten")', 30000);
  await setInputByLabel(client, 'Tresor-Passwort vergeben', password);
  await setInputByLabel(client, 'Passwort bestätigen', password);
  await clickButton(client, 'Weiter zum Wiederherstellungscode');
  await waitFor(client, 'recovery code screen', 'document.body?.innerText.toLowerCase().includes("dein einmaliger wiederherstellungscode")', 30000);
  await clickCheckboxNearText(client, 'Ich habe den Wiederherstellungscode sicher notiert');
  await clickButton(client, 'Einrichtung abschließen');
  await waitFor(client, 'first-run setup before dashboard', 'document.body?.innerText.includes("Willkommen bei Klassio!")', 30000);
  const prematureTour = await evaluate(client, 'Boolean(document.getElementById("klassio-first-run-title")) || Array.from(document.querySelectorAll("h3")).some(el=>el.textContent==="Dashboard")');
  if (prematureTour) throw new Error(client.name + ': welcome tour appeared before setup was completed.');
}

async function loginWithMail(client, email, password) {
  await client.send('Page.navigate', { url: BASE_URL });
  await waitFor(client, 'email login field', 'Boolean(document.querySelector("input[type=email]"))', 30000);
  await setInputByLabel(client, 'E-Mail', email);
  await clickButton(client, 'Anmeldecode senden');
  await waitFor(client, 'six digit login code field', 'document.body?.innerText.toLowerCase().includes("6-stelliger anmeldecode")', 20000);
  const code = await waitForMailCode(email);
  await setInputByLabel(client, '6-stelliger Anmeldecode', code);
  await clickButton(client, 'Anmelden & Daten laden');
  await finishVaultSetup(client, password);
}

async function createClassInUi(client, className) {
  // A fresh account enters the original setup wizard immediately after
  // vault creation. No dashboard, class selector or welcome tour comes first.
  await waitFor(client, 'start setup', 'document.body?.innerText.includes("Willkommen bei Klassio!")', 30000);
  await clickButton(client, 'Vollständig einrichten');
  await clickButton(client, 'Einrichtung starten');
  await waitFor(client, 'teacher and school step', 'document.body?.innerText.includes("Profil & Schule")', 20000);
  await clickButton(client, 'Nächster Schritt');
  await waitFor(client, 'class setup', 'Boolean(document.querySelector("#klassio-schulart"))', 20000);
  await setInputByLabel(client, 'Klassenbezeichnung', className);
  for (const step of ['Fächer', 'Stundenplan', 'Schüler']) {
    await clickButton(client, 'Nächster Schritt');
    await waitFor(client, 'setup step ' + step, 'document.body?.innerText.includes(' + q(step) + ')');
  }
  await clickButton(client, 'Nächster Schritt');
  await waitFor(client, 'setup step Übersicht', 'document.body?.innerText.includes("Bereit für deine Klasse")');
  await clickButton(client, 'Einrichtung abschließen');
  await waitFor(client, 'welcome tour after setup', 'Array.from(document.querySelectorAll("h3")).some(el=>String(el.textContent||"").trim()==="Dashboard")', 30000);
  await clickButton(client, 'Überspringen');
  await waitFor(client, 'dashboard after class setup', 'Array.from(document.querySelectorAll("button")).some(button=>String(button.textContent||"").trim()==="Heute")', 30000);
  await waitFor(client, 'class setup retained', 'document.body?.innerText.includes(' + q(className) + ')', 30000);
}
async function setInputByPlaceholder(client, placeholder, value) {
  const expression =
    '(() => {' +
    'const input=Array.from(document.querySelectorAll("input,textarea")).find(field=>String(field.getAttribute("placeholder")||"").includes(' + q(placeholder) + '));' +
    'if(!input)return false;' +
    'const proto=input instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;' +
    'const setter=Object.getOwnPropertyDescriptor(proto,"value")?.set;' +
    'if(setter)setter.call(input,' + q(value) + '); else input.value=' + q(value) + ';' +
    'input.focus();input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));return true;' +
    '})()';
  if (!await evaluate(client, expression)) throw new Error('Could not fill field with placeholder "' + placeholder + '".');
}

async function clickFirstSchedulableWeeklyCell(client) {
  const expression =
    '(() => {' +
    'const svgs=Array.from(document.querySelectorAll("svg"));' +
    'for(const svg of svgs){' +
      'if(!String(svg.getAttribute("class")||"").includes("lucide-plus"))continue;' +
      'let node=svg.parentElement;' +
      'while(node&&node!==document.body){' +
        'if(String(node.className||"").includes("group/cell")&&String(node.className||"").includes("min-h-[5.3125rem]")){node.click();return true;}' +
        'node=node.parentElement;' +
      '}' +
    '}' +
    'return false;' +
    '})()';
  if (!await evaluate(client, expression)) throw new Error('Could not find a schedulable empty weekly-plan cell.');
}


async function openAppPage(client, pageId) {
  const selector = 'nav button[data-menu-id="' + pageId + '"]';
  if (!await evaluate(client, 'Boolean(document.querySelector(' + q(selector) + '))')) {
    const expanded = await evaluate(client,
      '(() => {const b=document.querySelector("nav button[title=\\\"Alle Bereiche anzeigen\\\"]");if(!b)return false;b.click();return true;})()');
    if (!expanded) throw new Error(client.name + ': missing sidebar entry ' + pageId + ' and no expand button');
    await waitFor(client, 'expanded menu entry ' + pageId,
      'Boolean(document.querySelector(' + q(selector) + '))');
  }
  const clicked = await evaluate(client,
    '(() => {const b=document.querySelector(' + q(selector) + ');if(!b)return false;b.click();return true;})()');
  if (!clicked) throw new Error(client.name + ': could not open page ' + pageId);
  await waitFor(client, 'active sidebar route ' + pageId,
    'Boolean(document.querySelector(' + q(selector + '[aria-current="page"]') + '))', 25000);
}

const SYNC_EMAIL = 'zwei-geraete-sync@vs-neu.wien';
const TOPIC = 'E2E Zuhause Wochenplan A';
const TOPIC_SCHOOL = 'E2E Schule Wochenplan B';
const NOTE_HOME = 'E2E Zuhause Klassen-Notiz A';
const NOTE_SCHOOL = 'E2E Schule Klassen-Notiz B';

async function waitForCloud(client) {
  await waitFor(client, 'newest local edit confirmed by encrypted account server',
    '(() => {const b=document.querySelector("button[aria-label^=\\\"Speicherstatus:\\\"]");return !!b && String(b.getAttribute("aria-label")).includes("Neuester verschlüsselter Stand vom Server bestätigt");})()', 45000);
}

async function addClassNote(client, text) {
  await openAppPage(client, 'verhalten');
  await waitFor(client, 'class notes input', 'Boolean(document.querySelector("textarea#klassio-note-input"))', 30000);
  await setInputByPlaceholder(client, 'Allgemeine Notiz für die Klasse eingeben...', text);
  await clickButton(client, 'Notiz speichern', true);
  await waitFor(client, 'note visible in chronicle',
    'document.body?.innerText.includes(' + q(text) + ')', 20000);
  await waitForCloud(client);
}

async function openWeeklyAndCheck(client, topic) {
  await openAppPage(client, 'wochenplanung');
  await waitFor(client, 'weekly grid contains previously saved plan',
    'Array.from(document.querySelectorAll("div")).some(el=>String(el.className||"").includes("group/cell")&&String(el.className||"").includes("min-h-[5.3125rem]")&&String(el.textContent||"").includes(' + q(topic) + '))', 30000);
}

async function checkClassNote(client, note) {
  await openAppPage(client, 'verhalten');
  await waitFor(client, 'synced class note is present', 'document.body?.innerText.includes(' + q(note) + ')', 45000);
}

async function loginExistingVault(client, startedFirstLoginAt) {
  const remainingWait = 61500 - (Date.now() - startedFirstLoginAt);
  if (remainingWait > 0) await sleep(remainingWait);
  await fs.rm(SMTP_CODES, { force: true }).catch(() => {});
  await client.send('Page.navigate', { url: BASE_URL });
  await waitFor(client, 'second PC shows account login', 'Boolean(document.querySelector("input[type=email]"))', 30000);
  await setInputByLabel(client, 'E-Mail', SYNC_EMAIL);
  await clickButton(client, 'Anmeldecode senden');
  await waitFor(client, 'second PC login code', 'document.body?.innerText.toLowerCase().includes("6-stelliger anmeldecode")', 20000);
  await setInputByLabel(client, '6-stelliger Anmeldecode', await waitForMailCode(SYNC_EMAIL));
  await clickButton(client, 'Anmelden & Daten laden');
  await waitFor(client, 'existing encrypted cloud vault detected before setup',
    'document.body?.innerText.includes("Deine Daten sind da.") && document.body?.innerText.includes("Tresor-Passwort")', 30000);
  await setInputByLabel(client, 'Passwort eingeben', TEACHER_VAULT);
  await clickButton(client, 'Daten laden & KLASSIO öffnen');
  await waitFor(client, 'school PC opens the same class',
    'document.body?.innerText.includes("Sync Testklasse A") && Array.from(document.querySelectorAll("button")).some(b=>b.textContent.trim()==="Heute")', 45000);
}

async function clientReloadForLogout(client) {
  await client.send('Page.reload', { ignoreCache: true });
  await waitFor(client, 'real new document after logout',
    'document.readyState === "complete" && Boolean(document.querySelector("input[type=email]"))', 45000);
}

async function main() {
  await fs.rm(SMTP_CODES, { force: true }).catch(() => {});
  const home = await createClient(DEBUG_TEACHER, 'Zuhause (isoliertes Browserprofil)');
  const school = await createClient(DEBUG_ADMIN, 'Schul-PC (isoliertes Browserprofil)');
  const errors = [];
  for (const client of [home, school]) client.on('Runtime.exceptionThrown', event => {
    const detail = event.exceptionDetails || {};
    errors.push(client.name + ': ' + (detail.exception?.description || detail.text || 'Unknown exception'));
  });
  try {
    const loginStarted = Date.now();
    await loginWithMail(home, SYNC_EMAIL, TEACHER_VAULT);
    // Keep only an encrypted SYNTHETIC empty first-run snapshot to recreate
    // the real-world bug of an old mobile browser holding a blank local state.
    // No real teacher or student data enters this browser test.
    const earlyEmptySnapshot = await evaluate(home,
      'fetch("/api/account-sync",{cache:"no-store"}).then(r=>r.json()).then(j=>j.snapshot && ({revision:j.snapshot.revision, encryptedState:j.snapshot.encryptedState}))');
    if (!earlyEmptySnapshot?.encryptedState?.ciphertext) {
      throw new Error('Initial encrypted empty snapshot was not yet available for mobile stale-cache regression.');
    }
    await createClassInUi(home, 'Sync Testklasse A');
    await openAppPage(home, 'wochenplanung');
    await waitFor(home, 'editable weekly plan grid',
      'Array.from(document.querySelectorAll("svg.lucide-plus")).some(svg=>{let n=svg.parentElement;while(n&&n!==document.body){if(String(n.className||"").includes("group/cell")&&String(n.className||"").includes("min-h-[5.3125rem]"))return true;n=n.parentElement;}return false;})', 30000);
    await clickFirstSchedulableWeeklyCell(home);
    await waitFor(home, 'real weekly lesson editor', 'document.body?.innerText.includes("Einheit planen")', 30000);
    await setInputByPlaceholder(home, 'Was wird gelernt?', TOPIC);
    await clickButton(home, 'Einheit speichern');
    await waitFor(home, 'saved weekly lesson shown at home',
      'Array.from(document.querySelectorAll("div")).some(el=>String(el.className||"").includes("group/cell")&&String(el.className||"").includes("min-h-[5.3125rem]")&&String(el.textContent||"").includes(' + q(TOPIC) + '))', 20000);
    await waitForCloud(home);
    await addClassNote(home, NOTE_HOME);
    const cloudA = await evaluate(home,
      'fetch("/api/account-sync",{cache:"no-store"}).then(r=>r.json()).then(j=>({revision:j.snapshot?.revision,encrypted:!!j.snapshot?.encryptedState?.ciphertext}))');
    if (!cloudA.encrypted || cloudA.revision < 2) throw new Error('Home account server did not acknowledge the encrypted plan and note: ' + JSON.stringify(cloudA));

    await loginExistingVault(school, loginStarted);
    await openWeeklyAndCheck(school, TOPIC);
    await checkClassNote(school, NOTE_HOME);
    await waitForCloud(school);
    console.log('✓ Real Chrome: home weekly plan and class note appeared on freshly signed-in school PC.');

    // Modify an existing lesson in the school UI: setup creates only one
    // schedulable weekly cell, so do not invent an extra empty timetable slot.
    // The sidebar marks the route active before the lazy weekly grid has rendered.
    // Wait for the actual lesson cell rather than searching the previous page DOM.
    await openWeeklyAndCheck(school, TOPIC);
    const openedLesson = await evaluate(school,
      '(() => {const cell=Array.from(document.querySelectorAll("div")).find(el=>String(el.className||"").includes("group/cell")&&String(el.className||"").includes("min-h-[5.3125rem]")&&String(el.textContent||"").includes(' + q(TOPIC) + '));if(!cell)return false;cell.click();return true;})()');
    if (!openedLesson) throw new Error('School could not open the already-synced home lesson for editing.');
    await waitFor(school, 'lesson overview with edit action',
      'Array.from(document.querySelectorAll("button")).some(b=>String(b.textContent||"").trim()==="Bearbeiten")', 30000);
    await clickButton(school, 'Bearbeiten', true);
    await waitFor(school, 'school weekly lesson editor', 'document.body?.innerText.includes("Einheit planen")', 30000);
    await setInputByPlaceholder(school, 'Was wird gelernt?', TOPIC_SCHOOL);
    await clickButton(school, 'Einheit speichern');
    await openWeeklyAndCheck(school, TOPIC_SCHOOL);
    await waitForCloud(school);
    await openWeeklyAndCheck(home, TOPIC_SCHOOL);
    console.log('✓ Real Chrome: school edited an existing weekly lesson, home received the update.');
    // Note text is rendered only while the note view is open; the home device
    // was left on weekly planning for the reverse-plan verification.
    await openAppPage(home, 'verhalten');
    await waitFor(home, 'home class notes view ready', 'Boolean(document.querySelector("textarea#klassio-note-input"))', 30000);
    await addClassNote(school, NOTE_SCHOOL);
    await waitFor(home, 'school note appears automatically at home without sign-out',
      'document.body?.innerText.includes(' + q(NOTE_SCHOOL) + ')', 45000);
    await openWeeklyAndCheck(home, TOPIC_SCHOOL);
    console.log('✓ Real Chrome: new school note returned automatically to already open home PC.');

    // The real application prompts before leaving while a local write or cloud upload
    // is pending. Never bypass that safety dialog in the test: explicitly wait for
    // both devices to have acknowledged their *latest* encrypted state first.
    await waitForCloud(home);
    await waitForCloud(school);
    // Both profiles reload independently: encrypted state must survive browser refresh.
    console.log('✓ Starting two-profile encrypted persistence check after browser reload');
    // CDP Page.reload acknowledges the request before the old DOM disappears.
    // A class name from the previous page must not be mistaken for a successful
    // reload or a correctly unlocked vault on the new document.
    for (const client of [home, school]) {
      await evaluate(client, 'window.__klassioBeforeSyncReload = true');
      await client.send('Page.reload', { ignoreCache: true });
      await waitFor(client, 'new document after browser reload',
        'document.readyState === "complete" && window.__klassioBeforeSyncReload !== true', 45000);
      console.log('✓ ' + client.name + ': new document loaded');
    }
    for (const client of [home, school]) {
      await waitFor(client, 'after browser reload: class or local vault prompt',
        'document.body?.innerText.includes("Sync Testklasse A") || document.body?.innerText.includes("Tresor entsperren") || document.body?.innerText.includes("Daten laden & KLASSIO öffnen")', 45000);
      const locked = await evaluate(client,
        'Boolean(document.querySelector("input[placeholder=\\\"Passwort eingeben\\\"]"))');
      if (locked) {
        await setInputByLabel(client, 'Passwort eingeben', TEACHER_VAULT);
        const fromAccount = await evaluate(client, 'document.body?.innerText.includes("Daten laden & KLASSIO öffnen")');
        await clickButton(client, fromAccount ? 'Daten laden & KLASSIO öffnen' : 'Tresor entsperren');
      }
      await waitFor(client, 'after vault unlock, same planning class persisted',
        'document.body?.innerText.includes("Sync Testklasse A")', 45000);
    }
    await openWeeklyAndCheck(home, TOPIC_SCHOOL);
    await openWeeklyAndCheck(school, TOPIC_SCHOOL);
    await checkClassNote(home, NOTE_SCHOOL);
    await checkClassNote(school, NOTE_HOME);

    // Regression for the reported production incident: after explicitly signing
    // out for a while, the same teacher must never receive an empty fabricated
    // "4. Klasse Meine Klasse" instead of the existing planning class.
    await waitForCloud(home);
    const signedOut = await evaluate(home,
      'fetch("/api/access/logout",{method:"POST",credentials:"same-origin"}).then(r=>r.ok)');
    if (!signedOut) throw new Error('Home account logout did not complete.');
    await clientReloadForLogout(home);
    await waitFor(home, 'home browser shows login after sign-out',
      'Boolean(document.querySelector("input[type=email]"))', 30000);
    // Simulate the already-logged-out normal mobile browser: an older,
    // *validly encrypted* blank state under the SAME vault, while its account
    // now has the complete planning class. The previous complete local backup
    // and server data are never touched by this synthetic fixture.
    const staleEncryptedLocal = JSON.stringify({
      format: 'LehrerAPP_Encrypted_Local_State', version: 1,
      savedAt: Date.now(), encryptedState: earlyEmptySnapshot.encryptedState,
    });
    const injected = await evaluate(home,
      'new Promise((resolve,reject)=>{const open=indexedDB.open("LehrerApp");' +
      'open.onerror=()=>reject(open.error);open.onsuccess=()=>{' +
      'const db=open.result;if(!db.objectStoreNames.contains("app_state")){' +
      'db.close();reject(new Error("Missing Klassio localforage store"));return;}' +
      'const tx=db.transaction("app_state","readwrite");' +
      'tx.objectStore("app_state").put(' + q(staleEncryptedLocal) + ',"hehle_v3");' +
      'tx.oncomplete=()=>{db.close();resolve(true);};' +
      'tx.onerror=()=>{db.close();reject(tx.error);};' +
      'tx.onabort=()=>{db.close();reject(tx.error);};' +
      '};})');
    if (!injected) throw new Error('Stale mobile encrypted browser snapshot could not be seeded.');
    console.log('✓ Synthetic mobile fixture: logged-out browser holds a validly encrypted old empty snapshot.');
    // Both Chrome profiles request a code for the SAME email. The server
    // enforces a 60-second global email cooldown; the school-profile request
    // happened shortly before this logout. Wait rather than misclassifying
    // the intentional 429 throttle as a classroom recovery failure.
    await sleep(65_000);
    await fs.rm(SMTP_CODES, { force: true }).catch(() => {});
    await setInputByLabel(home, 'E-Mail', SYNC_EMAIL);
    await clickButton(home, 'Anmeldecode senden');
    await waitFor(home, 'home re-login code field',
      'document.body?.innerText.toLowerCase().includes("6-stelliger anmeldecode")', 20000);
    await setInputByLabel(home, '6-stelliger Anmeldecode', await waitForMailCode(SYNC_EMAIL));
    await clickButton(home, 'Anmelden & Daten laden');
    await waitFor(home, 'previous encrypted vault still exists after re-login',
      'Boolean(document.querySelector("input[placeholder=\\\"Passwort eingeben\\\"]"))', 30000);
    await setInputByLabel(home, 'Passwort eingeben', TEACHER_VAULT);
    await clickButton(home, 'Tresor entsperren');
    await waitFor(home, 'real class restored after logout and later login',
      'document.body?.innerText.includes("Sync Testklasse A")', 45000);
    console.log('✓ Stale mobile placeholder was replaced by the verified original encrypted cloud classroom.');
    await openWeeklyAndCheck(home, TOPIC_SCHOOL);
    await checkClassNote(home, NOTE_SCHOOL);
    console.log('✓ Real Chrome: the original planning class and notes survived account logout and a fresh login.');
    if (errors.length) throw new Error('Unexpected browser exceptions: ' + errors.join('\n'));
    console.log('KLASSIO two-browser e-mail account sync and reload E2E passed.');
  } catch (error) {
    try { await saveScreenshot(home, SCREENSHOT_TEACHER); } catch {}
    try { await saveScreenshot(school, SCREENSHOT_ADMIN); } catch {}
    throw error;
  } finally {
    home.close();
    school.close();
  }
}

main().catch(error => { console.error(error); process.exit(1); });
