import fs from 'node:fs/promises';

const BASE_URL = process.env.KLASSIO_E2E_BASE_URL || 'http://localhost:3100';
const DEBUG_URL = process.env.KLASSIO_CHROME_DEBUG_URL || 'http://127.0.0.1:9242';
const ACCESS_CODE = process.env.KLASSIO_E2E_ACCESS_CODE || 'ci-planning-access-code-2026';
const VAULT_PASSWORD = process.env.KLASSIO_E2E_VAULT_PASSWORD || 'Klassio-Planning-E2E-2026!';
const SCREENSHOT_PATH = process.env.KLASSIO_E2E_SCREENSHOT || '/tmp/klassio-mobile-attendance-e2e.png';

const WIDTH = Number(process.env.KLASSIO_E2E_WIDTH || 360);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const q = value => JSON.stringify(value);

class CdpClient {
  constructor(url) {
    this.url = url;
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
        for (const pending of this.pending.values()) pending.reject(new Error('Chrome DevTools connection closed.'));
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
    if (!this.ws) throw new Error('CDP client is not connected.');
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.ws?.close(); }
}

async function waitForChrome() {
  let lastError;
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const response = await fetch(DEBUG_URL + '/json/version');
      if (response.ok) return;
    } catch (error) { lastError = error; }
    await sleep(250);
  }
  throw new Error('Chrome DevTools endpoint did not become ready: ' + String(lastError || 'timeout'));
}

async function createClient() {
  await waitForChrome();
  const response = await fetch(DEBUG_URL + '/json/new?' + encodeURIComponent(BASE_URL), { method: 'PUT' });
  if (!response.ok) throw new Error('Could not create Chrome target: HTTP ' + response.status);
  const target = await response.json();
  const client = new CdpClient(target.webSocketDebuggerUrl);
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
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Browser evaluation failed.');
  return result.result?.value;
}

async function waitFor(client, description, expression, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  let lastValue;
  while (Date.now() < deadline) {
    try {
      lastValue = await evaluate(client, expression);
      if (lastValue) {
        console.log('✓ ' + description);
        return lastValue;
      }
    } catch {}
    await sleep(200);
  }
  throw new Error('Timeout while waiting for ' + description + ' (last value: ' + String(lastValue) + ')');
}

async function setInputByLabel(client, labelText, value) {
  const expression =
    '(() => {' +
    'const norm=v=>String(v||"").replace(/\\s+/g," ").trim().toLowerCase();' +
    'const expected=norm(' + q(labelText) + ');' +
    'const label=Array.from(document.querySelectorAll("label")).find(item=>norm(item.textContent).includes(expected));' +
    'let input=label?.querySelector("input,textarea,select")||null;' +
    'if(!input&&label?.htmlFor)input=document.getElementById(label.htmlFor);' +
    'if(!input&&label?.parentElement)input=label.parentElement.querySelector("input,textarea,select");' +
    'if(!input)input=Array.from(document.querySelectorAll("input,textarea,select")).find(field=>norm(field.getAttribute("aria-label")).includes(expected)||norm(field.getAttribute("placeholder")).includes(expected));' +
    'if(!input)return false;' +
    'const proto=input instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:input instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;' +
    'const setter=Object.getOwnPropertyDescriptor(proto,"value")?.set;' +
    'if(setter)setter.call(input,' + q(value) + '); else input.value=' + q(value) + ';' +
    'input.focus();input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));return true;' +
    '})()';
  if (!await evaluate(client, expression)) throw new Error('Could not fill field labelled "' + labelText + '".');
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

async function clickButton(client, text, exact = false) {
  const comparison = exact ? 'current===expected' : 'current.includes(expected)';
  const expression =
    '(() => {' +
    'const norm=v=>String(v||"").replace(/\\s+/g," ").trim(); const expected=' + q(text) + ';' +
    'const node=Array.from(document.querySelectorAll("button")).find(el=>{' +
      'const current=norm(el.textContent); if(!(' + comparison + '))return false;' +
      'const style=getComputedStyle(el); const rect=el.getBoundingClientRect();' +
      'return !el.disabled&&style.visibility!=="hidden"&&style.display!=="none"&&rect.width>0&&rect.height>0;});' +
    'if(!node)return false;node.click();return true;' +
    '})()';
  if (!await evaluate(client, expression)) throw new Error('Could not click button "' + text + '".');
}

async function clickSidebar(client, label) {
  const visible = await evaluate(client,
    'Array.from(document.querySelectorAll("button")).some(button=>{' +
    'const text=String(button.textContent||"").replace(/\\s+/g," ").trim();' +
    'const style=getComputedStyle(button);const rect=button.getBoundingClientRect();' +
    'return text===' + q(label) + '&&style.visibility!=="hidden"&&style.display!=="none"&&rect.width>0&&rect.height>0;})'
  );
  if (!visible) {
    const hasMore = await evaluate(client,
      'Array.from(document.querySelectorAll("button")).some(button=>String(button.textContent||"").replace(/\\s+/g," ").trim().startsWith("Mehr"))'
    );
    if (hasMore) {
      await clickButton(client, 'Mehr');
      await sleep(250);
    }
  }
  await clickButton(client, label, true);
  await waitFor(client, 'sidebar page ' + label,
    'Array.from(document.querySelectorAll("button[aria-current=page]")).some(current=>String(current.textContent||"").replace(/\\s+/g," ").trim()===' + q(label) + ')'
  );
}

async function clickCheckboxNearText(client, text) {
  const expression =
    '(() => {' +
    'const norm=v=>String(v||"").replace(/\\s+/g," ").trim();const expected=' + q(text) + ';' +
    'const label=Array.from(document.querySelectorAll("label")).find(item=>norm(item.textContent).includes(expected));' +
    'const checkbox=label?.querySelector("input[type=checkbox]");if(!checkbox)return false;checkbox.click();return checkbox.checked;' +
    '})()';
  if (!await evaluate(client, expression)) throw new Error('Could not tick checkbox near "' + text + '".');
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

async function clickText(client, text) {
  const expression =
    '(() => {' +
    'const norm=v=>String(v||"").replace(/\\s+/g," ").trim();const expected=' + q(text) + ';' +
    'const nodes=Array.from(document.querySelectorAll("div,span,p,h1,h2,h3,h4"));' +
    'const node=nodes.find(el=>norm(el.textContent)===expected&&getComputedStyle(el).visibility!=="hidden"&&el.getBoundingClientRect().width>0);' +
    'if(!node)return false;node.click();return true;' +
    '})()';
  if (!await evaluate(client, expression)) throw new Error('Could not click text "' + text + '".');
}

async function saveScreenshot(client) {
  const screenshot = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await fs.writeFile(SCREENSHOT_PATH, Buffer.from(screenshot.data, 'base64'));
}



async function openPage(client, label) {
  const toggle = await evaluate(client, '(() => { const b=document.querySelector("button[aria-label=\\"Navigation öffnen\\"]"); if (!b || !b.getBoundingClientRect().width) return false; b.click(); return true; })()');
  await clickSidebar(client, label);
}
async function clickSelector(client, selector) {
  if (!await evaluate(client, '(() => { const b=document.querySelector(' + q(selector) + '); if (!b) return false; b.scrollIntoView({block:"center"}); b.click(); return true; })()')) {
    throw new Error('Missing control: ' + selector);
  }
}
async function openPupil(client, nameParts) {
  await openPage(client, 'Schülerdossier');
  await waitFor(client, 'pupil selection', 'Boolean(document.querySelector("input[placeholder=\\"Kind suchen …\\"]"))');
  const expression='(() => { const parts=' + q(nameParts) + '; const b=Array.from(document.querySelectorAll("button")).find(b=>b.querySelector("svg.lucide-chevron-right") && parts.every(p=>b.innerText.includes(p))); if (!b) return false; b.scrollIntoView({block:"center"}); b.click(); return true; })()';
  if (!await evaluate(client, expression)) throw new Error('Test pupil missing from dossier selection.');
  await waitFor(client, 'dossier opened', 'Boolean(document.querySelector("button[title=\\"Zur Schülerauswahl\\"]"))');
}
async function openObservations(client) {
  await clickButton(client, 'Entwicklung & Diagnostik');
  await waitFor(client, 'development subnavigation', 'Array.from(document.querySelectorAll("button")).some(b=>b.textContent.includes("Beobachtungen & Verlauf"))');
  await clickButton(client, 'Beobachtungen & Verlauf');
  await waitFor(client, 'observation page', 'document.body.innerText.includes("Beobachtung notieren")');
}
async function reloadAndUnlock(client) {
  await client.send('Page.reload');
  await waitFor(client, 'reload reached vault or app', 'Boolean(document.querySelector("input[placeholder=\\"Passwort eingeben\\"]")) || Boolean(document.querySelector(".topbar"))', 30000);
  if (await evaluate(client, 'Boolean(document.querySelector("input[placeholder=\\"Passwort eingeben\\"]"))')) {
    await setInputByPlaceholder(client, 'Passwort eingeben', VAULT_PASSWORD);
    await clickButton(client, 'Tresor entsperren');
  }
  await waitFor(client, 'app restored after reload', 'Boolean(document.querySelector(".topbar"))', 30000);
}
async function checkRoutine(client) {
  const pupilParts = await evaluate(client, '(() => { const note=document.querySelector("button[aria-label=\\"Notiz oder Grund eintragen\\"]"); let row=note; const nameButton=el=>Array.from(el?.querySelectorAll("button")||[]).find(b=>!b.querySelector("svg") && b.textContent.trim()); while(row && !nameButton(row)) row=row.parentElement; return nameButton(row)?.textContent.trim().split(/\\s+/); })()');
  if (!pupilParts?.length) throw new Error('Cannot identify attendance pupil.');
  await clickButton(client, 'fehlt', true);
  // Clicking "fehlt" records an excused absence; dismiss its reason menu by opening the note.
  await clickSelector(client, 'button[aria-label="Notiz oder Grund eintragen"]');
  await setInputByPlaceholder(client, 'Grund der Abwesenheit oder wichtige Notiz', 'Synthetischer Browser-Testgrund');
  await clickButton(client, 'Speichern', true);
  await openPupil(client, pupilParts);
  await openObservations(client);
  await clickButton(client, 'Beobachtung notieren');
  await setInputByPlaceholder(client, 'Konkrete, wertfreie Unterrichtsbeobachtung', 'Synthetische Browser-Testnotiz');
  await setInputByLabel(client, 'Päd. Einordnung', 'positiv');
  await clickButton(client, 'Beobachtung speichern');
  await waitFor(client, 'positive note visibly saved', 'document.body.innerText.includes("Synthetische Browser-Testnotiz") && document.body.innerText.includes("Stärke / Ressource")');
  // Navigate to another pupil through the actual selector and ensure no note leakage.
  const next = await evaluate(client, '(() => { const b=document.querySelector("button[aria-label^=\\"Nächstes Kind:\\"]") || document.querySelector("button[aria-label^=\\"Vorheriges Kind:\\"]"); if (!b) return false; b.click(); return true; })()');
  if (!next) throw new Error('No second sample pupil available.');
  await openObservations(client);
  if (await evaluate(client, 'document.body.innerText.includes("Synthetische Browser-Testnotiz")')) throw new Error('Note leaked to another pupil.');
  // Return using the selection screen, then verify a real encrypted IndexedDB reload.
  await clickSelector(client, 'button[title="Zur Schülerauswahl"]');
  await openPupil(client, pupilParts);
  await openObservations(client);
  await waitFor(client, 'original pupil note still present', 'document.body.innerText.includes("Synthetische Browser-Testnotiz")');
  await reloadAndUnlock(client);
  await openPupil(client, pupilParts);
  await openObservations(client);
  await waitFor(client, 'positive note restored after encrypted reload', 'document.body.innerText.includes("Synthetische Browser-Testnotiz") && document.body.innerText.includes("Stärke / Ressource")');
  const width = await evaluate(client, 'document.documentElement.scrollWidth');
  if (width > WIDTH + 5) throw new Error('Dossier overflows viewport: ' + width + ' > ' + WIDTH);
  await openPage(client, 'Anwesenheit & Befinden');
  await waitFor(client, 'attendance restored', 'document.body.innerText.includes("Anwesenheit")');
  await clickSelector(client, 'button[aria-label="Notiz oder Grund eintragen"]');
  await waitFor(client, 'absence reason restored after reload', 'document.querySelector("textarea")?.value === "Synthetischer Browser-Testgrund"');
  await clickButton(client, 'Abbrechen', true);
  await saveScreenshot(client);
  console.log('Classroom routine passed at ' + WIDTH + 'px: absence, reason, pupil isolation, positive note and encrypted reload.');
}

async function main() {
  const client = await createClient();
  try {
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: WIDTH, height: 1000, deviceScaleFactor: 1, mobile: true,
    });
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    await client.send('Page.navigate', { url: BASE_URL });
    await waitFor(client, 'access gate', 'document.body?.innerText.toLowerCase().includes("geschützter zugang")', 30000);
    await waitFor(client, 'access input',
      'Array.from(document.querySelectorAll("input")).some(i=>String(i.placeholder||"").includes("Zugangscode eingeben"))', 30000);
    await setInputByLabel(client, 'Zugangscode', ACCESS_CODE);
    await clickButton(client, 'Klassio öffnen');
    await waitFor(client, 'new encrypted vault',
      'document.body?.innerText.toLowerCase().includes("tresor auf diesem gerät einrichten")', 30000);
    await setInputByLabel(client, 'Eigenes Tresor-Passwort', VAULT_PASSWORD);
    await setInputByLabel(client, 'Passwort bestätigen', VAULT_PASSWORD);
    await clickButton(client, 'Weiter zum Wiederherstellungscode');
    await waitFor(client, 'vault recovery screen',
      'document.body?.innerText.toLowerCase().includes("dein einmaliger wiederherstellungscode")', 30000);
    await clickCheckboxNearText(client, 'Ich habe den Wiederherstellungscode sicher notiert');
    await clickButton(client, 'Einrichtung abschließen');
    await waitFor(client, 'first-run setup',
      'document.body?.innerText.toLowerCase().includes("willkommen bei klassio")', 30000);
    await clickButton(client, 'Beispielklasse erkunden');
    await waitFor(client, 'dashboard ready',
      'Array.from(document.querySelectorAll("button")).some(b=>String(b.textContent||"").trim()==="Heute")', 30000);
    await waitFor(client, 'phone navigation toggle',
      'Boolean(document.querySelector("button[aria-label=\\\"Navigation öffnen\\\"]"))', 15000);
    const menuOpened = await evaluate(client,
      '(() => {const b=document.querySelector("button[aria-label=\\\"Navigation öffnen\\\"]");if(!b)return false;b.click();return true;})()');
    if (!menuOpened) throw new Error('Phone navigation is not accessible.');
    await clickSidebar(client, 'Anwesenheit & Befinden');
    await waitFor(client, 'attendance ready',
      'Array.from(document.querySelectorAll("h1")).some(h=>String(h.textContent||"").trim()==="Anwesenheit")', 30000);
    const result = await evaluate(client, `(() => {
      const visible = el => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const c = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none';
      };
      const phone = innerWidth;
      const topbar = document.querySelector('.topbar');
      const mainHeader = Array.from(document.querySelectorAll('header')).find(h =>
        Array.from(h.querySelectorAll('h1')).some(t => t.textContent.trim() === 'Anwesenheit'));
      const rows = Array.from(document.querySelectorAll('button')).filter(b =>
        b.getAttribute('aria-label')?.includes('Fehlstunden'));
      const firstStudent = rows[0]?.closest('div.p-2\\\\.5');
      const summary = mainHeader?.nextElementSibling;
      const headerActions = Array.from(mainHeader?.querySelectorAll('button') || []);
      const presentButton = headerActions.find(b => b.title?.includes('Nur offene Stunden'));
      const confirm = headerActions.find(b => b.textContent.includes('Tag bestätigen') || b.textContent.includes('Tag geprüft'));
      const more = headerActions.find(b => b.textContent.includes('Mehr') || b.querySelector('svg.lucide-ellipsis'));
      const topbarButtons = Array.from(topbar?.querySelectorAll('button') || []).filter(visible);
      const rect = el => { const r=el?.getBoundingClientRect(); return r ? { x:r.x,right:r.right,width:r.width,height:r.height } : null; };
      return {
        phone, docWidth: document.documentElement.scrollWidth,
        topbarWidth: rect(topbar),
        header: rect(mainHeader),
        rowCount: rows.length,
        row: rect(firstStudent),
        present: rect(presentButton), confirm: rect(confirm),
        topbarVisible: topbarButtons.map(b => ({ label: b.getAttribute('aria-label') || b.title || '', r:rect(b) })),
        hasMobilePreset: !!mainHeader?.querySelector('label input[type=checkbox]'),
        summary: summary?.textContent?.slice(0,90),
      };
    })()`);
    console.log('Synthetic 360px phone layout metrics:', JSON.stringify(result));
    if (result.phone !== WIDTH || result.docWidth > WIDTH + 5) throw new Error('Phone layout overflows the viewport.');
    if (!result.header || result.header.width > WIDTH || result.header.height > 260) throw new Error('Attendance header is oversized on the phone.');
    if (!result.rowCount || !result.hasMobilePreset) throw new Error('Student actions or default-presence toggle are missing.');
    if (!result.present || !result.confirm || result.present.height < 40 || result.confirm.height < 40) {
      throw new Error('Phone attendance primary actions are not accessible touch targets.');
    }
    const topButtons = result.topbarVisible.filter(x => !x.label.includes('Navigation'));
    if (topButtons.some(x => x.r && x.r.right > WIDTH + 3)) throw new Error('Phone toolbar action is clipped.');
    await checkRoutine(client);
  } catch (error) {
    await saveScreenshot(client).catch(() => {});
    throw error;
  } finally { client.close(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
