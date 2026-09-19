import fs from 'node:fs/promises';

const BASE_URL = process.env.KLASSIO_E2E_BASE_URL || 'http://localhost:3100';
const DEBUG_URL = process.env.KLASSIO_CHROME_DEBUG_URL || 'http://127.0.0.1:9242';
const ACCESS_CODE = process.env.KLASSIO_E2E_ACCESS_CODE || 'ci-material-access-code-2026';
const VAULT_PASSWORD = process.env.KLASSIO_E2E_VAULT_PASSWORD || 'Klassio-Material-E2E-2026!';
const SCREENSHOT_PATH = process.env.KLASSIO_E2E_SCREENSHOT || '/tmp/klassio-material-e2e.png';

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
        'if(String(node.className||"").includes("group/cell")){node.click();return true;}' +
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


async function main() {
  const client = await createClient();
  const uncaught = [];
  const title = 'E2E MINT Material ' + Date.now();
  try {
    client.on('Runtime.consoleAPICalled', params => {
      if (params.type === 'error') uncaught.push(params.args?.map(arg => arg.value || arg.description || arg.preview?.description || '').join(' ') || 'Console error');
    });
    client.on('Runtime.exceptionThrown', params => {
      const details = params.exceptionDetails || {};
      uncaught.push(details.exception?.description || details.text || 'Unknown browser exception');
    });
    await client.send('Page.navigate', { url: BASE_URL });
    await waitFor(client, 'Klassio gate', 'document.body?.innerText.toLowerCase().includes("geschützter zugang")', 30000);
    await waitFor(client, 'access code field ready after login-mode check',
      'Array.from(document.querySelectorAll("input")).some(i=>String(i.placeholder||"").includes("Zugangscode eingeben"))', 30000);
    await setInputByLabel(client, 'Zugangscode', ACCESS_CODE);
    await clickButton(client, 'Klassio öffnen');
    await waitFor(client, 'local vault setup', 'document.body?.innerText.toLowerCase().includes("lokalen datentresor einrichten")', 30000);
    await setInputByLabel(client, 'Tresor-Passwort vergeben', VAULT_PASSWORD);
    await setInputByLabel(client, 'Passwort bestätigen', VAULT_PASSWORD);
    await clickButton(client, 'Weiter zum Wiederherstellungscode');
    await waitFor(client, 'recovery code screen', 'document.body?.innerText.toLowerCase().includes("dein einmaliger wiederherstellungscode")', 30000);
    await clickCheckboxNearText(client, 'Ich habe den Wiederherstellungscode sicher notiert');
    await clickButton(client, 'Einrichtung abschließen');
    await waitFor(client, 'first-run intro', 'document.body?.innerText.toLowerCase().includes("klassio passt sich dir an")', 30000);
    await clickButton(client, 'Überspringen');
    await waitFor(client, 'daily dashboard',
      'Array.from(document.querySelectorAll("button")).some(button=>String(button.textContent||"").trim()==="Heute")', 30000);

    await clickSidebar(client, 'Materialbibliothek');
    await waitFor(client, 'compact teacher-oriented library', 'document.body?.innerText.includes("Meine Materialbibliothek")&&document.body?.innerText.includes("Material hinzufügen")');
    const honestLimit = await evaluate(client, 'document.body?.innerText.includes("Speicher & Dateigrößen")&&!document.body?.innerText.includes("Verfügbar sind insgesamt 5 MB")');
    if (!honestLimit) throw new Error('Material library still displays misleading storage information.');
    await clickButton(client, 'Material hinzufügen');
    await waitFor(client, 'material type picker', 'document.body?.innerText.includes("Externen Link einfügen")');
    await clickButton(client, 'Externen Link einfügen');
    await waitFor(client, 'material detail dialog', 'document.body?.innerText.includes("Meine Sammlungen (optional)")');
    await setInputByLabel(client, 'URL / Link', 'https://example.org/mint');
    await setInputByLabel(client, 'Titel *', title);
    await setInputByLabel(client, 'Meine Sammlungen (optional)', 'MINT, Mathematik 1');
    await clickButton(client, 'Speichern', true);
    await waitFor(client, 'saved material card', 'document.body?.innerText.includes(' + q(title) + ')', 30000);
    await waitFor(client, 'collection filter available', 'Array.from(document.querySelectorAll("select")).some(s=>s.getAttribute("aria-label")==="Persönliche Sammlung auswählen"&&s.options.length>=3)');
    console.log('✓ new link and two personal collections saved in the real UI');

    await setInputByPlaceholder(client, 'Materialien, Themen', 'Dieses Material gibt es nicht');
    await waitFor(client, 'distinct empty search state', 'document.body?.innerText.includes("Keine passenden Materialien gefunden")');
    await setInputByPlaceholder(client, 'Materialien, Themen', title);
    await waitFor(client, 'material reappears after search', 'document.body?.innerText.includes(' + q(title) + ')');
    const quickUse = await evaluate(client,
      'Array.from(document.querySelectorAll("button")).filter(b=>String(b.textContent||"").trim()==="Im Wochenplan verwenden").length>0');
    if (!quickUse) throw new Error('Material card has no direct weekly-plan action.');
    await clickButton(client, 'Im Wochenplan verwenden', true);
    const afterClick = await evaluate(client, '({body:document.body?.innerText?.slice(-500),dialogs:document.querySelectorAll("[role=dialog]").length})');
    console.log('After card action:', JSON.stringify(afterClick));
    await waitFor(client, 'selected material transfer modal', 'document.body?.innerText.toLowerCase().includes("material → wochenplan")');
    const subjectRequired = await evaluate(client,
      'Array.from(document.querySelectorAll("select")).some(el=>Array.from(el.options).some(option=>option.textContent?.includes("Fach auswählen")))');
    if (subjectRequired) await setInputByLabel(client, 'Fach für diese Stunde', 'Mathematik');
    await clickButton(client, 'In Wochenplan übernehmen');
    await waitFor(client, 'weekly plan after library action', 'document.body?.innerText.includes("WOCHENPLANUNG")', 30000);
    await waitFor(client, 'linked material visible in weekly lesson', 'Array.from(document.querySelectorAll("[title]")).some(node=>String(node.getAttribute("title")||"").includes(' + q(title) + '))', 20000);
    console.log('✓ material card links to a visible weekly lesson without creating an invisible orphan slot');
    await saveScreenshot(client);
    if (uncaught.length) throw new Error('Uncaught browser exceptions:\n' + uncaught.join('\n---\n'));
    console.log('Klassio material-library browser E2E passed.');
  } catch (error) {
    try {
      const visibleState = await evaluate(client, '({visible:document.body?.innerText?.slice(-2500),dialogs:Array.from(document.querySelectorAll("[role=dialog]")).map(e=>e.textContent?.slice(0,250))})');
      console.error('Material browser state:', JSON.stringify(visibleState));
      if (uncaught.length) console.error('Browser runtime exceptions:', uncaught.join(' | '));
    } catch {}
    try { await saveScreenshot(client); } catch {}
    throw error;
  } finally {
    client.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
