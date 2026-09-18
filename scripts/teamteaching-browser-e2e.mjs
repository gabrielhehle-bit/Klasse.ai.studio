import fs from 'node:fs/promises';

const BASE_URL = process.env.KLASSIO_E2E_BASE_URL || 'http://localhost:3100';
const DEBUG_A = process.env.KLASSIO_CHROME_DEBUG_A || 'http://127.0.0.1:9222';
const DEBUG_B = process.env.KLASSIO_CHROME_DEBUG_B || 'http://127.0.0.1:9223';
const DEBUG_RECOVERY = process.env.KLASSIO_CHROME_DEBUG_RECOVERY || 'http://127.0.0.1:9224';
const EMAIL_A = process.env.KLASSIO_E2E_EMAIL_A || 'anna.e2e@vsfoa.vobs.at';
const EMAIL_B = process.env.KLASSIO_E2E_EMAIL_B || 'berta.e2e@vsfoa.vobs.at';
const VAULT_A = process.env.KLASSIO_E2E_VAULT_A || 'Klassio-E2E-Anna-2026!';
const VAULT_B = process.env.KLASSIO_E2E_VAULT_B || 'Klassio-E2E-Berta-2026!';
const SMTP_CODES = process.env.KLASSIO_E2E_SMTP_CODES || '/tmp/klassio-e2e-mail-codes.json';
const SCREENSHOT_A = process.env.KLASSIO_E2E_SCREENSHOT_A || '/tmp/klassio-team-a.png';
const SCREENSHOT_B = process.env.KLASSIO_E2E_SCREENSHOT_B || '/tmp/klassio-team-b.png';
const SCREENSHOT_RECOVERY = process.env.KLASSIO_E2E_SCREENSHOT_RECOVERY || '/tmp/klassio-account-recovery.png';

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

async function setOffline(client, offline) {
  await client.send('Network.emulateNetworkConditions', {
    offline,
    latency: 0,
    downloadThroughput: offline ? 0 : -1,
    uploadThroughput: offline ? 0 : -1,
  });
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
  await waitFor(client, 'local vault setup', 'document.body?.innerText.toLowerCase().includes("lokalen datentresor einrichten")', 30000);
  await setInputByLabel(client, 'Tresor-Passwort vergeben', password);
  await setInputByLabel(client, 'Passwort bestätigen', password);
  await clickButton(client, 'Weiter zum Wiederherstellungscode');
  await waitFor(client, 'recovery code screen', 'document.body?.innerText.toLowerCase().includes("dein einmaliger wiederherstellungscode")', 30000);

  const recoveryCode = await evaluate(client,
    '(() => {const label=Array.from(document.querySelectorAll("label")).find(item=>String(item.textContent||"").includes("Dein einmaliger Wiederherstellungscode")); const box=label?.parentElement?.querySelector(".font-mono"); return String(box?.textContent||"").trim();})()'
  );
  if (!recoveryCode || recoveryCode.length < 20) throw new Error(client.name + ': recovery code was not rendered.');

  await clickCheckboxNearText(client, 'Ich habe den Wiederherstellungscode sicher notiert');
  await clickButton(client, 'Einrichtung abschließen');
  await waitFor(client, 'first-run intro', 'document.body?.innerText.toLowerCase().includes("klassio passt sich dir an")', 30000);
  await clickButton(client, 'Überspringen');
  await waitFor(client, 'daily dashboard', 'Array.from(document.querySelectorAll("button")).some(button=>String(button.textContent||"").trim()==="Heute")', 30000);
  return recoveryCode;
}

async function loginWithSchoolMail(client, email, password) {
  await client.send('Page.navigate', { url: BASE_URL });
  await waitFor(client, 'email login field', 'Boolean(document.querySelector("input[type=email]"))', 30000);
  await setInputByLabel(client, 'E-Mail', email);
  await clickButton(client, 'Anmeldecode senden');
  await waitFor(client, 'six digit login code field', 'document.body?.innerText.toLowerCase().includes("6-stelliger anmeldecode")', 20000);
  const code = await waitForMailCode(email);
  await setInputByLabel(client, '6-stelliger Anmeldecode', code);
  await clickButton(client, 'Klassio öffnen');
  return finishVaultSetup(client, password);
}

async function createClassInUi(client, className, currentClassName = 'Klasse Ohne Namen') {
  const opened = await evaluate(client,
    '(() => {' +
    'const norm=v=>String(v||"").replace(/\\s+/g," ").trim();' +
    'const candidates=Array.from(document.querySelectorAll("div")).filter(el=>norm(el.textContent).includes(' + q(currentClassName) + '));' +
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
  await waitFor(client, 'dashboard after class setup', 'Array.from(document.querySelectorAll("button")).some(button=>String(button.textContent||"").trim()==="Heute")', 30000);
  await waitFor(client, 'class selector contains name', 'document.body?.innerText.includes(' + q(className) + ')', 20000);
}

async function openClassTeam(client) {
  await clickSidebar(client, 'Klasse');
  await waitFor(client, 'class hub', 'document.body?.innerText.includes("Kinder und Klassenalltag im Blick")');
  await clickButton(client, 'Klassenteam');
  await waitFor(client, 'class team workspace', 'document.body?.innerText.includes("Eine Klasse gemeinsam führen")', 30000);
}

async function main() {
  await fs.rm(SMTP_CODES, { force: true }).catch(() => {});

  const anna = await createClient(DEBUG_A, 'Lehrkraft A');
  const berta = await createClient(DEBUG_B, 'Lehrkraft B');
  const recovery = await createClient(DEBUG_RECOVERY, 'Recovery-Gerät');
  const uncaught = [];

  for (const client of [anna, berta, recovery]) {
    client.on('Runtime.exceptionThrown', params => {
      const details = params.exceptionDetails || {};
      uncaught.push(client.name + ': ' + (details.exception?.description || details.text || 'Unknown browser exception'));
    });
  }

  try {
    const recoveryCodeA = await loginWithSchoolMail(anna, EMAIL_A, VAULT_A);
    const initialAccountRevisionA = await evaluate(
      anna,
      'fetch("/api/account-sync",{cache:"no-store"}).then(r=>r.json()).then(data=>Number(data.snapshot?.revision||0))',
    );
    if (!initialAccountRevisionA) throw new Error('Lehrkraft A: initial account sync revision missing.');
    await createClassInUi(anna, 'E2E 1A');
    await openClassTeam(anna);
    await clickButton(anna, 'Gemeinsame Klasse aktivieren');
    await waitFor(anna, 'encrypted shared class active', 'document.body?.innerText.includes("Teamteaching aktiv")', 30000);
    console.log('✓ Lehrkraft A: class encrypted and shared');

    await waitFor(
      anna,
      'encrypted account snapshot includes post-setup app changes',
      'fetch("/api/account-sync",{cache:"no-store"}).then(r=>r.json()).then(data=>Number(data.snapshot?.revision||0)>' + Number(initialAccountRevisionA) + ')',
      30000,
    );
    const preRecoveryAccount = await evaluate(
      anna,
      'fetch("/api/account-sync",{cache:"no-store"}).then(r=>r.json())',
    );
    const postSetupRevisionA = Number(preRecoveryAccount?.snapshot?.revision || 0);
    await fs.writeFile(
      '/tmp/klassio-e2e-data/account-sync/_before-recovery.json',
      JSON.stringify(preRecoveryAccount?.snapshot || null, null, 2),
      'utf8',
    );

    const annaCookies = (await anna.send('Network.getAllCookies')).cookies || [];
    if (!annaCookies.some(cookie => cookie.name === 'klassio_email_account')) {
      throw new Error('Lehrkraft A: account session cookie missing for fresh-device recovery test.');
    }
    await recovery.send('Network.setCookies', { cookies: annaCookies });
    await recovery.send('Page.navigate', { url: BASE_URL });
    await waitFor(
      recovery,
      'fresh device fetches existing remote vault instead of offering a new vault',
      'document.body?.innerText.includes("Tresor entsperren") && !document.body?.innerText.toLowerCase().includes("lokalen datentresor einrichten")',
      30000,
    );
    await clickButton(recovery, 'Passwort vergessen? Mit Wiederherstellungscode entsperren');
    await setInputByLabel(recovery, 'Wiederherstellungscode', recoveryCodeA);
    await clickButton(recovery, 'Mit Code entsperren');
    await waitFor(recovery, 'fresh device restored dashboard', 'Array.from(document.querySelectorAll("button")).some(button=>String(button.textContent||"").trim()==="Heute")', 30000);
    await waitFor(recovery, 'fresh device restored synced class', 'document.body?.innerText.includes("E2E 1A")', 30000);
    await sleep(1800);
    const postRecoveryAccount = await evaluate(
      recovery,
      'fetch("/api/account-sync",{cache:"no-store"}).then(r=>r.json())',
    );
    const revisionAfterRecovery = Number(postRecoveryAccount?.snapshot?.revision || 0);
    await fs.writeFile(
      '/tmp/klassio-e2e-data/account-sync/_after-recovery.json',
      JSON.stringify(postRecoveryAccount?.snapshot || null, null, 2),
      'utf8',
    );
    if (revisionAfterRecovery !== postSetupRevisionA) {
      throw new Error(
        'Recovery-Gerät: Wiederherstellung hat Konto-Revision '
        + postSetupRevisionA + ' -> ' + revisionAfterRecovery + ' verändert.'
      );
    }
    console.log('✓ Konto-Sync: fresh device restored encrypted state without creating a no-op revision');

    await loginWithSchoolMail(berta, EMAIL_B, VAULT_B);
    console.log('✓ Lehrkraft B: separate school-mail login and vault/device identity ready');

    // Lehrerzimmer: echte Zwei-Konten-Prüfung für Schnellnachricht, Dashboard-Hinweis,
    // Sidebar-Punkt, erste Ungelesen-Hervorhebung und persistenten Gelesen-Status.
    const roomMessage = 'Wer hat morgen Aufsicht? E2E Lehrerzimmer';
    await clickSidebar(anna, 'Lehrerzimmer');
    await waitFor(anna, 'quick Lehrerzimmer composer', 'Boolean(document.querySelector("[data-testid=lehrerzimmer-quick-message]"))', 20000);
    await setInputByLabel(anna, 'Nachricht', roomMessage);
    await clickButton(anna, 'Senden', true);
    await waitFor(anna, 'Lehrerzimmer message published', 'document.body?.innerText.includes(' + q(roomMessage) + ')', 20000);
    console.log('✓ Lehrerzimmer: Lehrkraft A published a quick message');

    await waitFor(
      berta,
      'dashboard shows unread Lehrerzimmer message',
      'Boolean(document.querySelector("[data-testid=dashboard-lehrerzimmer-unread]")) && document.body?.innerText.includes(' + q(roomMessage) + ')',
      30000,
    );
    await waitFor(
      berta,
      'sidebar shows unread Lehrerzimmer dot',
      'Boolean(document.querySelector("[aria-label*=\\\"ungelesene Lehrerzimmer-Nachrichten\\\"]"))',
      15000,
    );
    console.log('✓ Lehrerzimmer: Lehrkraft B sees dashboard notification and sidebar dot');

    await clickSidebar(berta, 'Lehrerzimmer');
    await waitFor(
      berta,
      'first view highlights unread message',
      'Array.from(document.querySelectorAll("[data-unread=true]")).some(node=>String(node.textContent||"").includes(' + q(roomMessage) + '))',
      20000,
    );
    await waitFor(
      berta,
      'read state persisted on server',
      'fetch("/api/lehrerzimmer/unread",{cache:"no-store"}).then(r=>r.json()).then(data=>data.count===0)',
      15000,
    );
    console.log('✓ Lehrerzimmer: first view highlighted message and persisted read state');

    // Remount A's team page so the newly registered colleague/device appears.
    await openClassTeam(anna);
    await waitFor(anna, 'second teacher appears', 'document.body?.innerText.toLowerCase().includes("berta")', 30000);
    await clickButton(anna, 'Berta');
    await waitFor(anna, 'second teacher added', 'document.body?.innerText.includes("wurde als Teamlehrkraft hinzugefügt") || document.body?.innerText.includes("2 Lehrperson")', 30000);
    console.log('✓ Lehrkraft A: second teacher added as editor');

    await openClassTeam(berta);
    await waitFor(berta, 'shared class listed', 'document.body?.innerText.includes("E2E 1A")', 30000);
    await clickButton(berta, 'Auf diesem Gerät öffnen');
    await waitFor(berta, 'shared class decrypted locally', 'document.body?.innerText.includes("Aktuelle Klasse: E2E 1A") && document.body?.innerText.includes("Rolle: editor")', 30000);
    console.log('✓ Lehrkraft B: shared class decrypted locally');

    await clickButton(berta, 'Änderungen senden');
    await waitFor(berta, 'editor can push encrypted class', 'document.body?.innerText.includes("Änderungen wurden verschlüsselt")', 30000);
    console.log('✓ Lehrkraft B: editor write path accepted');

    await openClassTeam(anna);
    await clickButton(anna, 'Neueste Version laden');
    await waitFor(anna, 'owner pulls second teacher revision', 'document.body?.innerText.includes("Neuester verschlüsselter Stand wurde geladen")', 30000);
    console.log('✓ Lehrkraft A: pulled newest encrypted revision');

    // Konto-Sync: echter Offline-/Mehrgeräte-Konflikt. Das Recovery-Gerät bleibt
    // auf einer bekannten Baseline offline, während Gerät A serverseitig weiterarbeitet.
    const baselineRevision = await evaluate(
      recovery,
      'JSON.parse(localStorage.getItem("klassio_account_sync_meta_v1")||"null")?.revision || 0',
    );
    if (!baselineRevision) throw new Error('Recovery-Gerät: account sync baseline missing before conflict test.');

    await setOffline(recovery, true);
    await createClassInUi(anna, 'E2E Konflikt A', 'E2E 1A');
    await waitFor(
      anna,
      'device A pushed a newer account revision',
      'fetch("/api/account-sync",{cache:"no-store"}).then(r=>r.json()).then(data=>Number(data.snapshot?.revision||0)>' + Number(baselineRevision) + ')',
      30000,
    );

    await createClassInUi(recovery, 'E2E Konflikt B', 'E2E 1A');
    await sleep(1800);
    await setOffline(recovery, false);

    await clickSidebar(recovery, 'Einstellungen');
    await clickButton(recovery, 'Konto', true);
    await waitFor(recovery, 'account settings opened', 'document.body?.innerText.includes("Konto & Schulmail")', 20000);

    const retryVisible = await evaluate(
      recovery,
      'Array.from(document.querySelectorAll("button")).some(button=>String(button.textContent||"").includes("Erneut versuchen")&&!button.disabled)',
    );
    if (retryVisible) await clickButton(recovery, 'Erneut versuchen');

    await waitFor(
      recovery,
      'multi-device account conflict is shown without overwriting',
      'Boolean(document.querySelector("[data-testid=account-sync-conflict-actions]")) && document.body?.innerText.includes("Änderungen auf zwei Geräten")',
      30000,
    );
    await evaluate(recovery, 'window.confirm=()=>true');
    await clickButton(recovery, 'Stand dieses Geräts verwenden');
    await waitFor(
      recovery,
      'explicit local conflict choice becomes synced',
      'document.body?.innerText.includes("Daten aktuell")',
      30000,
    );
    const resolvedRevision = await evaluate(
      recovery,
      'fetch("/api/account-sync",{cache:"no-store"}).then(r=>r.json()).then(data=>Number(data.snapshot?.revision||0))',
    );
    if (!(resolvedRevision > baselineRevision)) throw new Error('Recovery-Gerät: conflict resolution did not advance server revision.');
    console.log('✓ Konto-Sync: offline local change -> multi-device conflict -> explicit local resolution succeeded');

    const teamFileHasCiphertext = await fs.readFile('/tmp/klassio-e2e-data/teamteaching.json', 'utf8');
    if (!teamFileHasCiphertext.includes('"ciphertext"')) throw new Error('Server teamteaching store has no encrypted snapshot.');
    if (teamFileHasCiphertext.includes('"schueler"') || teamFileHasCiphertext.includes('"noten"')) {
      throw new Error('Server teamteaching store unexpectedly contains class plaintext field names.');
    }
    console.log('✓ Server persistence contains encrypted snapshot, not pupil/class payload fields');

    await saveScreenshot(anna, SCREENSHOT_A);
    await saveScreenshot(berta, SCREENSHOT_B);
    await saveScreenshot(recovery, SCREENSHOT_RECOVERY);

    if (uncaught.length) throw new Error('Uncaught browser exceptions:\n' + uncaught.join('\n---\n'));

    console.log('Klassio Teamteaching browser E2E passed: two school-mail accounts -> separate vaults/devices -> encrypted share -> editor adoption/write -> owner pull.');
  } catch (error) {
    try { await saveScreenshot(anna, SCREENSHOT_A); } catch {}
    try { await saveScreenshot(berta, SCREENSHOT_B); } catch {}
    try { await saveScreenshot(recovery, SCREENSHOT_RECOVERY); } catch {}
    throw error;
  } finally {
    anna.close();
    berta.close();
    recovery.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
