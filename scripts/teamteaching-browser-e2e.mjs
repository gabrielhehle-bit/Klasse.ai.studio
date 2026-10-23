import fs from 'node:fs/promises';

const BASE_URL = process.env.KLASSIO_E2E_BASE_URL || 'http://localhost:3100';
const DEBUG_A = process.env.KLASSIO_CHROME_DEBUG_A || 'http://127.0.0.1:9222';
const DEBUG_B = process.env.KLASSIO_CHROME_DEBUG_B || 'http://127.0.0.1:9223';
const EMAIL_A = process.env.KLASSIO_E2E_EMAIL_A || 'anna.e2e@vsfoa.vobs.at';
const EMAIL_B = process.env.KLASSIO_E2E_EMAIL_B || 'berta.e2e@vsfoa.vobs.at';
const VAULT_A = process.env.KLASSIO_E2E_VAULT_A || 'Klassio-E2E-Anna-2026!';
const VAULT_B = process.env.KLASSIO_E2E_VAULT_B || 'Klassio-E2E-Berta-2026!';
const SMTP_CODES = process.env.KLASSIO_E2E_SMTP_CODES || '/tmp/klassio-e2e-mail-codes.json';
const SCREENSHOT_A = process.env.KLASSIO_E2E_SCREENSHOT_A || '/tmp/klassio-team-a.png';
const SCREENSHOT_B = process.env.KLASSIO_E2E_SCREENSHOT_B || '/tmp/klassio-team-b.png';

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
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(this.name + ': Chrome request timed out: ' + method));
      }, 30000);
      this.pending.set(id, {
        resolve: result => { clearTimeout(timeout); resolve(result); },
        reject: error => { clearTimeout(timeout); reject(error); },
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws?.close();
  }
}

async function waitForChrome(debugUrl) {
  let lastError;
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const response = await fetch(debugUrl + '/json/version');
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
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
    height: 1000,
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

async function setInputByLabel(client, labelText, value, occurrence = 0) {
  const expression =
    '(() => {' +
    'const norm=v=>String(v||"").replace(/\\s+/g," ").trim().toLowerCase();' +
    'const expected=norm(' + q(labelText) + ');' +
    'const labels=Array.from(document.querySelectorAll("label")).filter(label=>norm(label.textContent).includes(expected));' +
    'const label=labels[' + occurrence + '];' +
    'let input=null;' +
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

async function clickAnyText(client, text) {
  const expression =
    '(() => {' +
    'const norm=v=>String(v||"").replace(/\\s+/g," ").trim(); const expected=' + q(text) + ';' +
    'const nodes=Array.from(document.querySelectorAll("button,[role=button],div,span")).filter(el=>norm(el.textContent).includes(expected));' +
    'const node=nodes.find(el=>{' +
      'const style=getComputedStyle(el); const rect=el.getBoundingClientRect();' +
      'return style.visibility!=="hidden"&&style.display!=="none"&&rect.width>0&&rect.height>0&&style.pointerEvents!=="none";});' +
    'if(!node)return false; node.click(); return true;' +
    '})()';
  if (!await evaluate(client, expression)) throw new Error(client.name + ': could not click visible text "' + text + '".');
}

async function clickSidebar(client, label) {
  const id = label === 'Wochenplan' ? 'wochenplanung' : label === 'Klasse' ? 'klasse' : null;
  if (id) {
    const selector = 'nav button[data-menu-id="' + id + '"]';
    if (!await evaluate(client, 'Boolean(document.querySelector(' + q(selector) + '))')) {
      const expanded = await evaluate(client,
        '(() => {const b=document.querySelector("nav button[title=\\"Alle Bereiche anzeigen\\"]");if(!b)return false;b.click();return true;})()');
      if (!expanded) throw new Error(client.name + ': could not reveal sidebar ' + label);
      await waitFor(client, 'expanded sidebar entry ' + label, 'Boolean(document.querySelector(' + q(selector) + '))');
    }
    const clicked = await evaluate(client,
      '(() => {const b=document.querySelector(' + q(selector) + ');if(!b)return false;b.click();return true;})()');
    if (!clicked) throw new Error(client.name + ': could not open sidebar ' + label);
    await waitFor(client, 'sidebar page ' + label,
      'Boolean(document.querySelector(' + q(selector + '[aria-current="page"]') + '))');
    return;
  }
  await clickButton(client, label, true);
  await waitFor(client, 'sidebar page ' + label,
    'Array.from(document.querySelectorAll("button[aria-current=page]")).some(current=>String(current.textContent||"").replace(/\\s+/g," ").trim()===' + q(label) + ')');
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

async function finishVaultSetup(client, password) {
  await waitFor(client, 'local vault setup', 'document.body?.innerText.toLowerCase().includes("tresor auf diesem gerät einrichten")', 30000);
  await setInputByLabel(client, 'Eigenes Tresor-Passwort', password);
  await setInputByLabel(client, 'Passwort bestätigen', password);
  await clickButton(client, 'Weiter zum Wiederherstellungscode');
  await waitFor(client, 'recovery code screen', 'document.body?.innerText.toLowerCase().includes("dein einmaliger wiederherstellungscode")', 30000);

  const recoveryCode = await evaluate(client,
    '(() => {const label=Array.from(document.querySelectorAll("label")).find(item=>String(item.textContent||"").includes("Dein einmaliger Wiederherstellungscode")); const box=label?.parentElement?.querySelector(".font-mono"); return String(box?.textContent||"").trim();})()'
  );
  if (!recoveryCode || recoveryCode.length < 20) throw new Error(client.name + ': recovery code was not rendered.');

  await clickCheckboxNearText(client, 'Ich habe den Wiederherstellungscode sicher notiert');
  await clickButton(client, 'Einrichtung abschließen');
  await waitFor(client, 'first-run setup before dashboard', 'document.body?.innerText.includes("Willkommen bei Klassio!")', 30000);
  const prematureTour = await evaluate(client, 'Boolean(document.getElementById("klassio-first-run-title")) || Array.from(document.querySelectorAll("h3")).some(el=>el.textContent==="Dashboard")');
  if (prematureTour) throw new Error(client.name + ': welcome tour appeared before setup was completed.');
}

async function loginWithSchoolMail(client, email, password) {
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
  await waitFor(client, 'start setup', 'document.body?.innerText.includes("Willkommen bei Klassio!")', 30000);
  await clickButton(client, 'Vollständig einrichten');
  await clickButton(client, 'Einrichtung starten');
  await waitFor(client, 'teacher and school setup', 'document.body?.innerText.includes("Profil & Schule")', 20000);
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
  await waitFor(client, 'class selector contains name', 'document.body?.innerText.includes(' + q(className) + ')', 20000);
}

async function openClassTeam(client) {
  await clickSidebar(client, 'Klasse');
  await waitFor(client, 'class hub', 'Boolean(document.querySelector("[data-class-hub] h1"))');
  await clickButton(client, 'Klassenteam');
  await waitFor(client, 'class team workspace', 'document.body?.innerText.includes("Eine Klasse gemeinsam führen")', 30000);
}

async function reloadExistingTeamVault(client, password) {
  await evaluate(client, 'window.__klassioBeforeTeamReload = true');
  client.allowTeamTestReload = true;
  await client.send('Page.reload', { ignoreCache: true });
  await waitFor(client, 'new document after team browser reload',
    'document.readyState === "complete" && window.__klassioBeforeTeamReload !== true', 45000);
  client.allowTeamTestReload = false;
  await waitFor(client, 'team class or vault unlock after reload',
    'document.body?.innerText.includes("E2E 1A") || document.body?.innerText.includes("Tresor entsperren") || document.body?.innerText.includes("Daten laden & KLASSIO öffnen")', 45000);
  if (await evaluate(client, 'Boolean(document.querySelector("input[placeholder=\\"Passwort eingeben\\"]"))')) {
    await setInputByLabel(client, 'Passwort eingeben', password);
    const fromAccount = await evaluate(client, 'document.body?.innerText.includes("Daten laden & KLASSIO öffnen")');
    await clickButton(client, fromAccount ? 'Daten laden & KLASSIO öffnen' : 'Tresor entsperren');
  }
  await waitFor(client, 'same shared class restored', 'document.body?.innerText.includes("E2E 1A")', 45000);
}

async function main() {
  await fs.rm(SMTP_CODES, { force: true }).catch(() => {});

  const anna = await createClient(DEBUG_A, 'Lehrkraft A');
  const berta = await createClient(DEBUG_B, 'Lehrkraft B');
  const uncaught = [];

  for (const client of [anna, berta]) {
    client.on('Page.javascriptDialogOpening', params => {
      if (params.type === 'beforeunload' && client.allowTeamTestReload) {
        console.log('✓ ' + client.name + ': acknowledging reload dialog for saved synthetic fixture');
        void client.send('Page.handleJavaScriptDialog', { accept: true });
      }
      if (params.type === 'confirm' && client.deviceApprovalCode && params.message.includes('Prüfcode ' + client.deviceApprovalCode)) {
        void client.send('Page.handleJavaScriptDialog', { accept: true });
      }
    });
    client.on('Runtime.exceptionThrown', params => {
      const details = params.exceptionDetails || {};
      uncaught.push(client.name + ': ' + (details.exception?.description || details.text || 'Unknown browser exception'));
    });
  }

  try {
    await loginWithSchoolMail(anna, EMAIL_A, VAULT_A);
    await createClassInUi(anna, 'E2E 1A');
    await openClassTeam(anna);
    await clickButton(anna, 'Diese Klasse gemeinsam nutzen');
    await waitFor(anna, 'encrypted shared class active', 'document.body?.innerText.includes("Teamteaching aktiv")', 30000);
    console.log('✓ Lehrkraft A: class encrypted and shared');

    await loginWithSchoolMail(berta, EMAIL_B, VAULT_B);
    const bertaFirstLoginAt = Date.now();
    // The invited teacher stays in first-run setup until the owner shares a real
    // class. No synthetic empty classroom or duplicate class is created.
    await waitFor(berta, 'invited teacher registration without creating a duplicate class', 'document.querySelector("[data-testid=first-run-team-join]")?.textContent.includes("Einladungen aktualisieren") && !document.querySelector("[data-testid=first-run-team-join]")?.textContent.includes("Einladungen werden geprüft")', 30000);
    console.log('✓ Lehrkraft B: separate school-mail login, first setup and vault/device identity ready');

    // Remount A's team page so the newly registered colleague/device appears.
    await openClassTeam(anna);
    await waitFor(anna, 'second teacher appears', 'document.body?.innerText.toLowerCase().includes("berta")', 30000);
    await clickButton(anna, 'Berta');
    await waitFor(anna, 'second teacher added', 'document.body?.innerText.includes("wurde als Teamlehrkraft hinzugefügt") || document.body?.innerText.includes("2 Lehrperson")', 30000);
    console.log('✓ Lehrkraft A: second teacher added as editor');

    await clickButton(berta, 'Einladungen aktualisieren');
    await waitFor(berta, 'shared class invitation appears in first-run setup', 'document.querySelector("[data-testid=first-run-team-join]")?.textContent.includes("E2E 1A")', 30000);
    await clickButton(berta, 'Klasse öffnen');
    await waitFor(berta, 'first-run join exits setup after class has been adopted',
      '!document.querySelector("[data-testid=first-run-team-join]") && document.body?.innerText.includes("E2E 1A")', 30000);
    await openClassTeam(berta);
    await waitFor(berta, 'shared class decrypted locally', 'document.body?.innerText.includes("Aktuelle Klasse: E2E 1A") && document.body?.innerText.includes("Rolle: editor")', 30000);
    console.log('✓ Lehrkraft B: shared class decrypted locally');

    // Unlike the previous smoke test, check an actual weekly lesson on a
    // second, separately signed-in teacher account BEFORE any manual push.
    const weeklyTopic = 'E2E Teamteaching gemeinsamer Wochenplan';
    await clickSidebar(anna, 'Wochenplan');
    await waitFor(anna, 'weekly planning grid', 'Boolean(document.querySelector("[data-weekly-header] h1"))');
    await waitFor(anna, 'editable weekly cell', 'Array.from(document.querySelectorAll("svg.lucide-plus")).some(svg=>{let n=svg.parentElement;while(n&&n!==document.body){if(String(n.className||"").includes("group/cell")&&String(n.className||"").includes("min-h-[5.3125rem]"))return true;n=n.parentElement;}return false;})', 30000);
    const opened = await evaluate(anna,
      '(() => { for(const svg of document.querySelectorAll("svg.lucide-plus")) { let el=svg.parentElement; while(el && el!==document.body) { if(String(el.className||"").includes("group/cell") && String(el.className||"").includes("min-h-[5.3125rem]")) { el.click(); return true; } el=el.parentElement; } } return false; })()');
    if (!opened) throw new Error('Could not open first editable weekly cell on teacher A.');
    await waitFor(anna, 'weekly lesson edit dialog', 'document.body?.innerText.includes("Einheit planen")');
    await setInputByLabel(anna, 'Was wird gelernt?', weeklyTopic);
    await clickButton(anna, 'Einheit speichern');
    await waitFor(anna, 'teacher A saved weekly lesson', 'document.body?.innerText.includes(' + q(weeklyTopic) + ')');
    await clickSidebar(berta, 'Wochenplan');
    try {
      await waitFor(berta, 'teacher B sees teacher A weekly lesson automatically',
        'document.body?.innerText.includes(' + q(weeklyTopic) + ')', 18000);
    } catch (failure) {
      // Diagnose real cross-account failures without reading actual user data:
      // these browser profiles contain only synthetic E2E classroom records.
      for (const client of [anna, berta]) {
        const state = await evaluate(client,
          '({teamStatus:document.querySelector("[data-testid=weekly-team-status]")?.textContent, ' +
          'page:document.querySelector("nav button[aria-current=page]")?.getAttribute("data-menu-id"),' +
          'week:document.querySelector("h1")?.parentElement?.textContent?.slice(0,130)})');
        const team = await evaluate(client,
          'fetch("/api/teamteaching/classes",{cache:"no-store"}).then(r=>r.json()).then(j=>(j.classes||[]).map(c=>({id:c.id,revision:c.revision,role:c.myRole,classLabel:c.classLabel})))');
        console.log('DIAGNOSTIC ' + client.name + ': ' + JSON.stringify({state,team}));
      }
      // Distinguish missing automatic refresh from a failed source upload:
      // never silently turn this failed automatic-sync regression green.
      await openClassTeam(berta);
      const manualStatus = await evaluate(berta,
        'document.body?.innerText.slice(0,1800)');
      console.log('DIAGNOSTIC teacher B Klassenteam: ' + manualStatus);
      await clickButton(berta, 'Neueste Version laden');
      await clickSidebar(berta, 'Wochenplan');
      const visibleAfterManual = await evaluate(berta,
        'document.body?.innerText.includes(' + q(weeklyTopic) + ')');
      console.log('DIAGNOSTIC teacher B receives lesson after manual pull: ' + visibleAfterManual);
      throw failure;
    }
    console.log('✓ Cross-account weekly lesson shared automatically without manual send');

    await openClassTeam(berta);
    await clickButton(berta, 'Änderungen senden');
    await waitFor(berta, 'editor can push encrypted class', 'document.body?.innerText.includes("Änderungen wurden verschlüsselt")', 30000);
    console.log('✓ Lehrkraft B: editor write path accepted');

    await openClassTeam(anna);
    await clickButton(anna, 'Neueste Version laden');
    await waitFor(anna, 'owner pulls second teacher revision', 'document.body?.innerText.includes("Neuester verschlüsselter Stand wurde geladen")', 30000);
    console.log('✓ Lehrkraft A: pulled newest encrypted revision');

    // Reproduce the reported dead end: local profile/class is still visible,
    // but the server session is gone. Re-login must be possible in Klassenteam.
    await openClassTeam(berta);
    await evaluate(berta, 'fetch("/api/access/logout",{method:"POST"}).then(r=>{if(!r.ok)throw new Error("Logout failed");return true;})');
    await waitFor(berta, 'expired team session offers inline re-login',
      'document.body?.innerText.includes("Deine Anmeldung ist abgelaufen") && Boolean(document.querySelector("input[type=email]"))', 20000);
    // The same email cannot request another code within 60 seconds. Keep the
    // production throttle intact and also verify the inline form stays mounted.
    const codeCooldownRemaining = 61_000 - (Date.now() - bertaFirstLoginAt);
    if (codeCooldownRemaining > 0) await sleep(codeCooldownRemaining);
    await fs.rm(SMTP_CODES, { force: true });
    await setInputByLabel(berta, 'vorname.nachname@schule.at', EMAIL_B);
    await clickButton(berta, 'Anmeldecode per E-Mail senden');
    await waitFor(berta, 'inline email code field', 'Boolean(document.querySelector("input[autocomplete=one-time-code]"))');
    await setInputByLabel(berta, '000000', await waitForMailCode(EMAIL_B));
    await clickButton(berta, 'Anmelden & Sync starten');
    await waitFor(berta, 'same shared class reconnects after re-login',
      '!document.querySelector("input[type=email]") && document.body?.innerText.includes("Rolle: editor") && /Gemeinsamer Teamstand: Version \\d+/.test(document.body?.innerText||"")', 30000);
    await clickSidebar(berta, 'Wochenplan');
    await waitFor(berta, 'weekly lesson retained after session recovery',
      'document.body?.innerText.includes(' + q(weeklyTopic) + ')');
    console.log('✓ Expired session: inline school-mail login reconnects existing team without losing weekly planning');

    const recoveredTopic = 'E2E Teamänderung nach erneuter Anmeldung';
    const recoveryCellOpened = await evaluate(berta,
      '(() => { for(const svg of document.querySelectorAll("svg.lucide-plus")) { let el=svg.parentElement; while(el && el!==document.body) { if(String(el.className||"").includes("group/cell") && String(el.className||"").includes("min-h-[5.3125rem]")) { el.click(); return true; } el=el.parentElement; } } return false; })()');
    if (!recoveryCellOpened) throw new Error('Could not open a weekly cell after team session recovery.');
    await waitFor(berta, 'weekly lesson edit after re-login', 'document.body?.innerText.includes("Einheit planen")');
    await setInputByLabel(berta, 'Was wird gelernt?', recoveredTopic);
    await clickButton(berta, 'Einheit speichern');
    await clickSidebar(anna, 'Wochenplan');
    await waitFor(anna, 'teacher A receives new teacher B lesson after session recovery',
      'document.body?.innerText.includes(' + q(recoveredTopic) + ')', 18000);
    console.log('✓ Team sync resumes after re-login: new editor lesson reaches owner automatically');

    const deviceIds = 'new Promise((resolve,reject)=>{const req=indexedDB.open("Klassio_TeamTeaching");req.onerror=()=>reject(req.error);req.onblocked=()=>reject(new Error("Team device database blocked"));req.onsuccess=()=>{const db=req.result;try{const read=db.transaction("device_keys","readonly").objectStore("device_keys").getAll();read.onerror=()=>{db.close();reject(read.error);};read.onsuccess=()=>{db.close();resolve(read.result.filter(d=>d&&typeof d.deviceId==="string").map(d=>d.deviceId).sort());};}catch(e){db.close();reject(e);}};})';
    for (const [client, password] of [[anna, VAULT_A], [berta, VAULT_B]]) {
      console.log('✓ Starting persisted device reload check: ' + client.name);
      await waitFor(client, 'local team state durably saved before reload',
        'Boolean(document.querySelector("header[data-account-sync-status=synced]"))', 45000);
      const before = await evaluate(client, deviceIds);
      if (!before.length) throw new Error(client.name + ': no persisted team device identity');
      console.log('✓ ' + client.name + ': persisted team identity read before reload');
      await reloadExistingTeamVault(client, password);
      await openClassTeam(client);
      const after = await evaluate(client, deviceIds);
      if (JSON.stringify(after) !== JSON.stringify(before)) throw new Error(client.name + ': team device identity changed across reload');
      await clickButton(client, 'Neueste Version laden');
      await waitFor(client, 'team class still decrypts after browser reload',
        'document.body?.innerText.includes("Neuester verschlüsselter Stand wurde geladen")', 30000);
      await clickSidebar(client, 'Wochenplan');
      await waitFor(client, 'latest team lesson survived identity reload',
        'document.body?.innerText.includes(' + q(recoveredTopic) + ')');
    }
    console.log('✓ Both teacher browsers keep the same persisted device identity and decrypt the latest team class after reload');

    // Synthetic production regression: the owner loses ONLY the browser's RSA
    // identity. Vault/class data remain present; the editor still has the team key.
    await waitFor(anna, 'owner account saved before synthetic key loss',
      'Boolean(document.querySelector("header[data-account-sync-status=synced]"))', 45000);
    await evaluate(anna, 'new Promise((resolve,reject)=>{const req=indexedDB.open("Klassio_TeamTeaching");req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result;const tx=db.transaction("device_keys","readwrite");tx.objectStore("device_keys").clear();tx.oncomplete=()=>{db.close();resolve(true);};tx.onerror=()=>{db.close();reject(tx.error);};};})');
    await reloadExistingTeamVault(anna, VAULT_A);
    await openClassTeam(anna);
    await waitFor(anna, 'owner can request missing device access',
      'Array.from(document.querySelectorAll("button")).some(b=>b.textContent.trim()==="Freigabe anfordern")', 30000);
    await clickButton(anna, 'Freigabe anfordern', true);
    await waitFor(anna, 'owner device request is pending', 'document.body?.innerText.includes("Deine Anfrage ist gesendet")');
    const pending = await evaluate(anna, 'fetch("/api/teamteaching/classes",{cache:"no-store"}).then(r=>r.json()).then(d=>d.classes.flatMap(c=>c.deviceAccessRequests||[])[0])');
    if (!pending?.verificationCode) throw new Error('No pending owner device request was persisted');
    await openClassTeam(berta);
    await waitFor(berta, 'existing editor sees exact owner request code',
      'document.body?.innerText.includes(' + q(pending.verificationCode) + ') && document.body?.innerText.includes("Ein Teamgerät braucht deine Bestätigung")', 30000);
    berta.deviceApprovalCode = pending.verificationCode;
    await clickButton(berta, 'Gerät freigeben', true);
    berta.deviceApprovalCode = null;
    await waitFor(berta, 'editor approval confirmed', 'document.body?.innerText.includes("ist freigegeben")');
    await waitFor(anna, 'owner device resumes decrypted team sync after editor approval',
      'Boolean(document.querySelector("[data-team-sync-status=synced]"))', 30000);
    await clickSidebar(anna, 'Wochenplan');
    await waitFor(anna, 'latest editor lesson survives owner key recovery',
      'document.body?.innerText.includes(' + q(recoveredTopic) + ')');
    const rolesAfterRecovery = await evaluate(anna,
      'fetch("/api/teamteaching/classes",{cache:"no-store"}).then(r=>r.json()).then(d=>d.classes.find(c=>c.classLabel==="E2E 1A")).then(c=>({myRole:c.myRole,editors:c.members.filter(m=>m.role==="editor").length,pending:c.deviceAccessRequests.length}))');
    if (rolesAfterRecovery.myRole !== 'owner' || rolesAfterRecovery.editors !== 1 || rolesAfterRecovery.pending !== 0) throw new Error('Owner recovery changed roles or left a reusable request');
    console.log('✓ Lost owner key recovered through explicit request and existing editor confirmation; roles and latest team lesson preserved');

    const teamFileHasCiphertext = await fs.readFile('/tmp/klassio-e2e-data/teamteaching.json', 'utf8');
    if (!teamFileHasCiphertext.includes('"ciphertext"')) throw new Error('Server teamteaching store has no encrypted snapshot.');
    if (teamFileHasCiphertext.includes('"schueler"') || teamFileHasCiphertext.includes('"noten"')) {
      throw new Error('Server teamteaching store unexpectedly contains class plaintext field names.');
    }
    console.log('✓ Server persistence contains encrypted snapshot, not pupil/class payload fields');

    await saveScreenshot(anna, SCREENSHOT_A);
    await saveScreenshot(berta, SCREENSHOT_B);

    if (uncaught.length) throw new Error('Uncaught browser exceptions:\n' + uncaught.join('\n---\n'));

    console.log('Klassio Teamteaching browser E2E passed: two school-mail accounts -> separate vaults/devices -> encrypted share -> editor adoption/write -> owner pull.');
  } catch (error) {
    try { await saveScreenshot(anna, SCREENSHOT_A); } catch {}
    try { await saveScreenshot(berta, SCREENSHOT_B); } catch {}
    throw error;
  } finally {
    anna.close();
    berta.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
