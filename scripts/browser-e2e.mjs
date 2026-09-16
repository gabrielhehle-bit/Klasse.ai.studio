import fs from 'node:fs/promises';

const BASE_URL = process.env.KLASSIO_E2E_BASE_URL || 'http://localhost:3100';
const DEBUG_URL = process.env.KLASSIO_CHROME_DEBUG_URL || 'http://127.0.0.1:9222';
const ACCESS_CODE = process.env.KLASSIO_E2E_ACCESS_CODE || 'ci-team-access-code-2026';
const VAULT_PASSWORD = process.env.KLASSIO_E2E_VAULT_PASSWORD || 'Klassio-CI-Tresor-2026!';
const SCREENSHOT_PATH = process.env.KLASSIO_E2E_SCREENSHOT || '/tmp/klassio-browser-e2e.png';

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
          for (const handler of this.listeners.get(message.method) || []) {
            handler(message.params || {});
          }
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

  close() {
    if (this.ws) this.ws.close();
  }
}

async function waitForChrome() {
  let lastError;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(DEBUG_URL + '/json/version');
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }
  throw new Error('Chrome DevTools endpoint did not become ready: ' + String(lastError || 'timeout'));
}

async function createTarget() {
  await waitForChrome();
  const response = await fetch(DEBUG_URL + '/json/new?' + encodeURIComponent(BASE_URL), { method: 'PUT' });
  if (!response.ok) throw new Error('Could not create Chrome target: HTTP ' + response.status);
  return response.json();
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Browser evaluation failed.');
  return result.result && result.result.value;
}

async function waitFor(client, description, expression, timeoutMs = 15000) {
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
  throw new Error('Timeout while waiting for: ' + description + ' (last value: ' + String(lastValue) + ')');
}

async function setInputByLabel(client, labelText, value, occurrence = 0) {
  const expression =
    '(() => {' +
    'const norm=v=>String(v||"").replace(/\\s+/g," ").trim().toLowerCase();' +
    'const expected=norm(' + q(labelText) + ');' +
    'const labels=Array.from(document.querySelectorAll("label")).filter(label=>norm(label.textContent).includes(expected));' +
    'const label=labels[' + occurrence + '];' +
    'let input=null;' +
    'if(label){' +
      'input=label.querySelector("input,textarea,select");' +
      'if(!input&&label.htmlFor)input=document.getElementById(label.htmlFor);' +
      'if(!input&&label.parentElement)input=label.parentElement.querySelector("input,textarea,select");' +
      'if(!input&&label.nextElementSibling)input=label.nextElementSibling.matches?.("input,textarea,select")?label.nextElementSibling:label.nextElementSibling.querySelector?.("input,textarea,select");' +
    '}' +
    'if(!input){' +
      'const fields=Array.from(document.querySelectorAll("input,textarea,select"));' +
      'input=fields.find(field=>norm(field.getAttribute("aria-label")).includes(expected)||norm(field.getAttribute("placeholder")).includes(expected));' +
    '}' +
    'if(!input)return false;' +
    'const proto=input instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:input instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;' +
    'const setter=Object.getOwnPropertyDescriptor(proto,"value")?.set;' +
    'if(setter)setter.call(input,' + q(value) + '); else input.value=' + q(value) + ';' +
    'input.focus(); input.dispatchEvent(new Event("input",{bubbles:true})); input.dispatchEvent(new Event("change",{bubbles:true})); return true;' +
    '})()';
  if (!await evaluate(client, expression)) throw new Error('Could not fill field labelled "' + labelText + '".');
}
async function setTextareaByPlaceholder(client, placeholder, value) {
  const expression =
    '(() => {' +
    'const field=Array.from(document.querySelectorAll("textarea")).find(el=>String(el.getAttribute("placeholder")||"").includes(' + q(placeholder) + '));' +
    'if(!field)return false;' +
    'const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value")?.set;' +
    'if(setter)setter.call(field,' + q(value) + '); else field.value=' + q(value) + ';' +
    'field.focus(); field.dispatchEvent(new Event("input",{bubbles:true})); field.dispatchEvent(new Event("change",{bubbles:true})); return true;' +
    '})()';
  if (!await evaluate(client, expression)) throw new Error('Could not fill textarea "' + placeholder + '".');
}

async function clickByText(client, text, exact = false) {
  const matchExpression = exact ? 'current===expected' : 'current.includes(expected)';
  const expression =
    '(() => {' +
    'const norm=v=>String(v||"").replace(/\\s+/g," ").trim(); const expected=' + q(text) + ';' +
    'const node=Array.from(document.querySelectorAll("button")).find(el=>{' +
    'const current=norm(el.textContent); if(!(' + matchExpression + '))return false;' +
    'const style=getComputedStyle(el); const rect=el.getBoundingClientRect();' +
    'return style.visibility!=="hidden"&&style.display!=="none"&&rect.width>0&&rect.height>0;});' +
    'if(!node)return false; node.click(); return true;' +
    '})()';
  if (!await evaluate(client, expression)) throw new Error('Could not click visible button "' + text + '".');
}

async function clickCheckboxNearText(client, text) {
  const expression =
    '(() => {' +
    'const norm=v=>String(v||"").replace(/\\s+/g," ").trim(); const expected=' + q(text) + ';' +
    'const label=Array.from(document.querySelectorAll("label")).find(item=>norm(item.textContent).includes(expected));' +
    'const checkbox=label&&label.querySelector("input[type=checkbox]"); if(!checkbox)return false;' +
    'checkbox.click(); return checkbox.checked;' +
    '})()';
  if (!await evaluate(client, expression)) throw new Error('Could not tick checkbox near "' + text + '".');
}

async function clickSidebarPage(client, label) {
  const existsExpression =
    'Array.from(document.querySelectorAll("button")).some(button=>String(button.textContent||"").replace(/\\s+/g," ").trim()===' + q(label) + ')';
  if (!await evaluate(client, existsExpression)) {
    const moreExpression =
      'Array.from(document.querySelectorAll("button")).some(button=>String(button.textContent||"").replace(/\\s+/g," ").trim()==="Mehr")';
    if (await evaluate(client, moreExpression)) {
      await clickByText(client, 'Mehr', true);
      await sleep(250);
    }
  }

  await clickByText(client, label, true);
  await waitFor(
    client,
    'Sidebar marks "' + label + '" as current page',
    '(() => {const current=document.querySelector("button[aria-current=page]"); return String(current?.textContent||"").replace(/\\s+/g," ").trim()===' + q(label) + ';})()',
    12000,
  );
}

async function saveScreenshot(client) {
  const screenshot = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await fs.writeFile(SCREENSHOT_PATH, Buffer.from(screenshot.data, 'base64'));
}

async function main() {
  const target = await createTarget();
  const client = new CdpClient(target.webSocketDebuggerUrl);
  const uncaught = [];

  try {
    await client.connect();
    client.on('Runtime.exceptionThrown', params => {
      const details = params.exceptionDetails || {};
      uncaught.push(details.exception?.description || details.text || 'Unknown browser exception');
    });

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Network.enable');
    await client.send('Page.navigate', { url: BASE_URL });

    await waitFor(client, 'Klassio access gate', 'document.body?.innerText.toLowerCase().includes("geschützter zugang")');
    await setInputByLabel(client, 'Zugangscode', ACCESS_CODE);
    await clickByText(client, 'Klassio öffnen');
    await waitFor(client, 'local vault setup', 'document.body?.innerText.toLowerCase().includes("lokalen datentresor einrichten")', 20000);

    await setInputByLabel(client, 'Tresor-Passwort vergeben', VAULT_PASSWORD);
    await setInputByLabel(client, 'Passwort bestätigen', VAULT_PASSWORD);
    await clickByText(client, 'Weiter zum Wiederherstellungscode');
    await waitFor(client, 'recovery code confirmation', 'document.body?.innerText.toLowerCase().includes("dein einmaliger wiederherstellungscode")', 20000);

    const recoveryCode = await evaluate(
      client,
      '(() => {const label=Array.from(document.querySelectorAll("label")).find(item=>String(item.textContent||"").includes("Dein einmaliger Wiederherstellungscode")); const box=label?.parentElement?.querySelector(".font-mono"); return String(box?.textContent||"").trim();})()'
    );
    if (!recoveryCode || recoveryCode.length < 20) throw new Error('Recovery code was not rendered.');

    await clickCheckboxNearText(client, 'Ich habe den Wiederherstellungscode sicher notiert');
    await clickByText(client, 'Einrichtung abschließen');
    await waitFor(
      client,
      'Klassio first-run intro',
      'document.body?.innerText.toLowerCase().includes("klassio passt sich dir an")',
      25000,
    );
    await clickByText(client, 'Überspringen');
    await waitFor(
      client,
      'daily dashboard after login',
      'Array.from(document.querySelectorAll("button")).some(button=>String(button.textContent||"").trim()==="Heute")',
      25000,
    );

    await clickSidebarPage(client, 'Anwesenheit & Befinden');
    await waitFor(client, 'attendance screen content', 'document.body?.innerText.toLowerCase().includes("anwesenheit")');

    await clickSidebarPage(client, 'Sitzplan & Gruppen');
    await waitFor(client, 'seating plan content', 'document.body?.innerText.toLowerCase().includes("sitzplan")');

    await clickSidebarPage(client, 'Notenmappe');
    await waitFor(client, 'gradebook content', 'document.body?.innerText.toLowerCase().includes("notenmappe")||document.body?.innerText.toLowerCase().includes("bewertung")');

    await clickSidebarPage(client, 'Wochenplan');
    await waitFor(client, 'weekly planning content', 'document.body?.innerText.toLowerCase().includes("wochenplanung")||document.body?.innerText.toLowerCase().includes("wochenplan")');

    await clickSidebarPage(client, 'Diagnostik');
    await waitFor(client, 'diagnostics content', 'document.body?.innerText.toLowerCase().includes("diagnostik")');

    await clickSidebarPage(client, 'Tools');
    await waitFor(client, 'tools hub', 'document.body?.innerText.includes("Kleine, konkrete Helfer an einem Ort")');

    await clickByText(client, 'Textanalyse', true);
    await waitFor(client, 'text analysis tool', 'document.body?.innerText.includes("Textschwierigkeit nachvollziehbar prüfen")');
    await setTextareaByPlaceholder(
      client,
      'Text hier einfügen',
      'Die Kinder lesen gemeinsam einen kurzen Text. Danach sprechen sie über die wichtigsten Aussagen und markieren schwierige Wörter.'
    );
    await waitFor(
      client,
      'text analysis metrics',
      'document.body?.innerText.includes("Flesch DE") && document.body?.innerText.includes("Wiener Sachtextformel 1") && !document.body?.innerText.includes("Noch kein Text")'
    );

    await clickSidebarPage(client, 'Druckzentrum');
    await waitFor(client, 'print center content', 'document.body?.innerText.toLowerCase().includes("druckzentrum")');

    await clickSidebarPage(client, 'Backup & Daten');
    await waitFor(client, 'backup screen content', 'document.body?.innerText.toLowerCase().includes("backup")||document.body?.innerText.toLowerCase().includes("datensicherung")');

    const manifestOk = await evaluate(client, 'fetch("/manifest.webmanifest",{cache:"no-store"}).then(response=>response.ok)');
    if (!manifestOk) throw new Error('PWA manifest could not be fetched in the browser.');
    console.log('✓ PWA manifest available');

    await saveScreenshot(client);

    if (uncaught.length) throw new Error('Uncaught browser exceptions:\n' + uncaught.join('\n---\n'));

    console.log('Klassio browser E2E passed: access -> vault -> dashboard -> attendance -> seating -> gradebook -> weekly plan -> diagnostics -> tools -> text analysis -> print center -> backup.');
  } catch (error) {
    try { await saveScreenshot(client); } catch {}
    throw error;
  } finally {
    client.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
