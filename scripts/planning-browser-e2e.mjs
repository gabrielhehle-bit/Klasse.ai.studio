import fs from 'node:fs/promises';

const BASE_URL = process.env.KLASSIO_E2E_BASE_URL || 'http://localhost:3100';
const DEBUG_URL = process.env.KLASSIO_CHROME_DEBUG_URL || 'http://127.0.0.1:9242';
const ACCESS_CODE = process.env.KLASSIO_E2E_ACCESS_CODE || 'ci-planning-access-code-2026';
const VAULT_PASSWORD = process.env.KLASSIO_E2E_VAULT_PASSWORD || 'Klassio-Planning-E2E-2026!';
const SCREENSHOT_PATH = process.env.KLASSIO_E2E_SCREENSHOT || '/tmp/klassio-planning-e2e.png';

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

async function main() {
  const client = await createClient();
  const uncaught = [];
  const topic = 'E2E Planungscheck ' + Date.now();

  try {
    client.on('Runtime.exceptionThrown', params => {
      const details = params.exceptionDetails || {};
      uncaught.push(details.exception?.description || details.text || 'Unknown browser exception');
    });

    await client.send('Page.navigate', { url: BASE_URL });
    await waitFor(client, 'Klassio access gate', 'document.body?.innerText.toLowerCase().includes("geschützter zugang")');
    const accessCodeVisible = await evaluate(client,
      'Array.from(document.querySelectorAll("input")).some(el=>String(el.placeholder||"").includes("Zugangscode eingeben"))');
    if (!accessCodeVisible) {
      await clickButton(client, 'Nur Zugangscode verwenden (ohne Geräte-Sync)', true);
      await waitFor(client, 'access code input',
        'Array.from(document.querySelectorAll("input")).some(el=>String(el.placeholder||"").includes("Zugangscode eingeben"))');
    }
    await setInputByLabel(client, 'Zugangscode', ACCESS_CODE);
    await clickButton(client, 'Klassio öffnen');

    await waitFor(client, 'local vault setup', 'document.body?.innerText.toLowerCase().includes("lokalen datentresor einrichten")', 30000);
    await setInputByLabel(client, 'Tresor-Passwort vergeben', VAULT_PASSWORD);
    await setInputByLabel(client, 'Passwort bestätigen', VAULT_PASSWORD);
    await clickButton(client, 'Weiter zum Wiederherstellungscode');
    await waitFor(client, 'recovery code screen', 'document.body?.innerText.toLowerCase().includes("dein einmaliger wiederherstellungscode")', 30000);
    await clickCheckboxNearText(client, 'Ich habe den Wiederherstellungscode sicher notiert');
    await clickButton(client, 'Einrichtung abschließen');
    await waitFor(client, 'first setup', 'document.body?.innerText.toLowerCase().includes("klassio passt sich dir an")||document.body?.innerText.toLowerCase().includes("willkommen bei klassio")', 30000);

    const canExplore = await evaluate(client, 'Array.from(document.querySelectorAll("button")).some(b=>String(b.textContent||"").includes("Beispielklasse erkunden"))');
    if (canExplore) await clickButton(client, 'Beispielklasse erkunden');
    else {
      const canSkip = await evaluate(client, 'Array.from(document.querySelectorAll("button")).some(b=>String(b.textContent||"").trim()==="Überspringen")');
      if (canSkip) await clickButton(client, 'Überspringen', true);
    }
    await waitFor(client, 'daily dashboard', 'Array.from(document.querySelectorAll("button")).some(button=>String(button.textContent||"").trim()==="Heute")', 30000);

    await clickSidebar(client, 'Wochen-Check');
    await waitFor(client, 'week check renders instead of duplicate daily editor',
      'Array.from(document.querySelectorAll("h1")).some(h=>h.textContent?.trim()==="Wochen-Check")&&document.body?.innerText.includes("Eingetragene Unterrichtsstunden")&&document.body?.innerText.includes("Eingetragene Stunden ohne Thema")');
    const truthfulWeekCheck = await evaluate(client,
      '(() => {const t=document.body?.innerText||"";return t.includes("Leere Stundenplanfelder werden hier nicht automatisch als offene Vorbereitung gewertet")&&!t.includes("Was ist heute geplant?")&&!t.includes("Morgen stehen 6 Stunden an");})()'
    );
    if (!truthfulWeekCheck) throw new Error('Wochen-Check still contains duplicate planning UI or misleading preparation status.');
    console.log('✓ week check uses the selected plan without invented daily status');
    await clickButton(client, 'Wochenplan öffnen', true);
    await waitFor(client, 'weekly plan after week check',
      'document.body?.innerText.toLowerCase().includes("wochenplan")');
    console.log('✓ week check links directly to the single weekly editing surface');

    await clickSidebar(client, 'Wochenplan');
    await waitFor(client, 'weekly plan', 'document.body?.innerText.toLowerCase().includes("wochenplan")||document.body?.innerText.toLowerCase().includes("wochenplanung")');

    // A sidebar route can become active before the lazy-loaded weekly grid
    // finishes rendering. Wait for a real editable cell instead of clicking
    // immediately and misreporting missing planning functionality.
    await waitFor(client, 'weekly editing grid with an empty, schedulable cell',
      'Array.from(document.querySelectorAll("svg.lucide-plus")).some(svg=>{let n=svg.parentElement;while(n&&n!==document.body){if(String(n.className||"").includes("group/cell")&&String(n.className||"").includes("min-h-[5.3125rem]"))return true;n=n.parentElement;}return false;})', 30000);
    await clickFirstSchedulableWeeklyCell(client);
    await waitFor(client, 'large weekly editor', 'document.body?.innerText.includes("Einheit planen")');
    const weeklyLarge = await evaluate(client,
      '(() => {const heading=Array.from(document.querySelectorAll("h3")).find(el=>el.textContent?.trim()==="Einheit planen");const node=heading?.closest(".max-w-none");if(!node)return false;const r=node.getBoundingClientRect();return r.width>1000&&r.height>window.innerHeight*0.85;})()'
    );
    if (!weeklyLarge) {
      const diagnostic = await evaluate(client,
        '(() => ({viewport: [innerWidth,innerHeight], headings: Array.from(document.querySelectorAll("h3")).filter(e=>String(e.textContent).includes("Einheit planen")).map(e=>({text:e.textContent,classes:e.parentElement?.className,outer:e.closest(".max-w-none")?.className,rect:(()=>{const r=e.closest(".max-w-none")?.getBoundingClientRect();return r?[r.width,r.height]:null;})()})), largeCandidates:Array.from(document.querySelectorAll("div.max-w-none")).slice(0,5).map(e=>({classes:e.className,rect:[e.getBoundingClientRect().width,e.getBoundingClientRect().height]}))}))()'
      );
      throw new Error('Weekly editor did not open in the expected large layout: ' + JSON.stringify(diagnostic));
    }
    console.log('✓ weekly editor uses the large planning workspace');

    await setInputByPlaceholder(client, 'Was wird gelernt?', topic);
    const religionVisible = await evaluate(client, 'Array.from(document.querySelectorAll("button")).some(b=>String(b.textContent||"").replace(/\\s+/g," ").trim()==="Religion"&&!b.disabled)');
    if (religionVisible) await clickButton(client, 'Religion', true);
    await clickButton(client, 'Einheit speichern');
    await waitFor(client, 'weekly editor closed after save',
      '!Array.from(document.querySelectorAll("h3")).some(e=>e.textContent?.trim()==="Einheit planen")');
    const savedHourlyCell =
      'Array.from(document.querySelectorAll("div")).find(el=>String(el.className||"").includes("group/cell")&&String(el.className||"").includes("min-h-[5.3125rem]")&&String(el.textContent||"").includes(' + q(topic) + '))';
    await waitFor(client, 'saved topic visible in the actual hourly weekly grid', 'Boolean(' + savedHourlyCell + ')', 20000);
    if (!await evaluate(client, '(() => {const cell=' + savedHourlyCell + ';if(!cell)return false;cell.click();return true;})()'))
      throw new Error('Could not open the saved hourly lesson.');
    await waitFor(client, 'planned lesson overview', 'document.body?.innerText.includes("Geplante Einheit")&&document.body?.innerText.includes("Bearbeiten")');
    const syncState = await evaluate(client,
      '(() => {const text=document.body?.innerText||"";if(text.includes("In Jahresplan übernehmen"))return "available";if(text.includes("bereits belegt"))return "occupied";return "missing";})()'
    );
    if (syncState === 'available') {
      await clickButton(client, 'In Jahresplan übernehmen');
      await waitFor(client, 'weekly to yearly sync confirmation', 'document.body?.innerText.includes("Im Jahresplan ergänzt")');
      console.log('✓ weekly lesson added to an empty yearly-plan cell');
    } else if (syncState === 'occupied') {
      console.log('✓ occupied yearly-plan cell is protected against overwrite');
    } else {
      throw new Error('Weekly→yearly sync state was not rendered.');
    }

    await clickButton(client, 'Bearbeiten');
    await waitFor(client, 'editor reopened from overview', 'document.body?.innerText.includes("Einheit planen")');
    const reopenedLarge = await evaluate(client,
      '(() => {const heading=Array.from(document.querySelectorAll("h3")).find(el=>el.textContent?.trim()==="Einheit planen");const node=heading?.closest(".max-w-none");if(!node)return false;const r=node.getBoundingClientRect();return r.width>1000&&r.height>window.innerHeight*0.85;})()'
    );
    if (!reopenedLarge) throw new Error('Weekly editor was not large after overview → edit.');
    await clickButton(client, 'Einheit speichern');

    await clickSidebar(client, 'Jahresplanung');
    await waitFor(client, 'yearly plan', 'document.body?.innerText.toLowerCase().includes("jahresplan")||document.body?.innerText.toLowerCase().includes("jahresplanung")');
    if (syncState === 'available') {
      await waitFor(client, 'synced topic visible in yearly plan', 'document.body?.innerText.includes(' + q(topic) + ')', 20000);
      await clickText(client, topic);
      await waitFor(client, 'yearly overview', 'document.body?.innerText.includes("Jahresplanung · Übersicht")&&document.body?.innerText.includes("Bearbeiten")');
      await clickButton(client, 'Bearbeiten');
      await waitFor(client, 'large yearly editor', 'Array.from(document.querySelectorAll("div")).some(el=>String(el.className||"").includes("max-w-[1400px]"))');
      const yearlyLarge = await evaluate(client,
        '(() => {const node=Array.from(document.querySelectorAll("div")).find(el=>String(el.className||"").includes("max-w-[1400px]"));if(!node)return false;const r=node.getBoundingClientRect();return r.width>950&&r.height>window.innerHeight*0.82;})()'
      );
      if (!yearlyLarge) throw new Error('Yearly editor did not open in the expected large layout.');
      console.log('✓ yearly overview → edit opens the large yearly workspace');
    }

    await saveScreenshot(client);
    if (uncaught.length) throw new Error('Uncaught browser exceptions:\n' + uncaught.join('\n---\n'));
    console.log('Klassio planning browser E2E passed.');
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
