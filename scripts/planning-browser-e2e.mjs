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
    // The access-gate heading appears before the async login choices settle.
    // Wait for either valid choice rather than racing the first render.
    await waitFor(client, 'access-code login option',
      'Array.from(document.querySelectorAll("input")).some(el=>String(el.placeholder||"").includes("Zugangscode eingeben"))||Array.from(document.querySelectorAll("button")).some(el=>String(el.textContent||"").includes("Nur Zugangscode verwenden"))');
    const accessCodeVisible = await evaluate(client,
      'Array.from(document.querySelectorAll("input")).some(el=>String(el.placeholder||"").includes("Zugangscode eingeben"))');
    if (!accessCodeVisible) {
      await clickButton(client, 'Nur Zugangscode verwenden');
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
    // Homework has a standalone day-level action and must not require a lesson.
    const openedHomework = await evaluate(client, '(() => {const b=Array.from(document.querySelectorAll("button[aria-label^=\\\"Hausübung für Montag\\\"]")).find(b=>b.getBoundingClientRect().width>0);if(!b)return false;b.click();return true;})()');
    if (!openedHomework) throw new Error('Daily homework button under Monday date is missing.');
    await waitFor(client, 'independent dated homework editor',
      'Boolean(document.querySelector("[role=dialog][aria-label^=\\\"Hausübungen Montag\\\"]"))');
    const dayHomework = 'Synthetische Hausübung: Arbeitsheft Seite 14';
    await setInputByPlaceholder(client, 'z. B. Deutsch', 'Deutsch');
    await setInputByPlaceholder(client, 'z. B. Arbeitsheft Seite 12', dayHomework);
    const dueSet = await evaluate(client,
      '(() => {const input=document.querySelector("[role=dialog][aria-label^=\\\"Hausübungen Montag\\\"] input[type=date]");if(!input)return false;const d=new Date(input.min+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+2);const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;const value=d.toISOString().slice(0,10);if(setter)setter.call(input,value);else input.value=value;input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));return true;})()');
    if (!dueSet) throw new Error('Homework due date input is missing.');
    await clickButton(client, 'Hausübung speichern');
    await waitFor(client, 'new standalone homework visible in day editor',
      'document.querySelector("[role=dialog][aria-label^=\\\"Hausübungen Montag\\\"]")?.textContent.includes(' + q(dayHomework) + ')', 12000);
    await evaluate(client, 'Array.from(document.querySelectorAll("button")).find(b => b.getAttribute("aria-label") === "Hausübungen schließen")?.click()');
    console.log('✓ independent day-level homework saved without a lesson');
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
    const obsoleteLessonHomework = await evaluate(client,
      'Boolean(document.querySelector("[role=dialog] textarea[placeholder*=\\\"Hausaufgabe notieren\\\"]"))');
    if (obsoleteLessonHomework) throw new Error('Homework field still attached to lesson planning.');


    await setInputByPlaceholder(client, 'Was wird gelernt?', topic);
    const religionVisible = await evaluate(client, 'Array.from(document.querySelectorAll("button")).some(b=>String(b.textContent||"").replace(/\\s+/g," ").trim()==="Religion"&&!b.disabled)');
    if (religionVisible) await clickButton(client, 'Religion', true);
    await clickButton(client, '4 · Ablauf & Optionen');
    await waitFor(client, 'child weekly-plan option',
      'Boolean(document.querySelector("section[aria-label=\\\"Kinder-Wochenplan\\\"] input[type=checkbox]"))');
    await clickCheckboxNearText(client, 'Im Wochenplan der Kinder anzeigen');
    await setInputByPlaceholder(client, 'z. B. Arbeitsheft S. 12', 'Arbeitsheft Seite 12');
    await clickButton(client, 'Einheit speichern');
    await waitFor(client, 'weekly editor closed after save',
      '!Array.from(document.querySelectorAll("h3")).some(e=>e.textContent?.trim()==="Einheit planen")');
    const savedHourlyCell =
      'Array.from(document.querySelectorAll("div")).find(el=>String(el.className||"").includes("group/cell")&&String(el.className||"").includes("min-h-[5.3125rem]")&&String(el.textContent||"").includes(' + q(topic) + '))';
    await waitFor(client, 'saved topic visible in the actual hourly weekly grid', 'Boolean(' + savedHourlyCell + ')', 20000);
    await waitFor(client, 'published lesson has one-click control in weekly planning',
      'Boolean((' + savedHourlyCell + ')?.querySelector("button[aria-label=\\\"Aus Kinderplan entfernen\\\"]"))');
    const removedFromBoard = await evaluate(client,
      '(() => {const b=(' + savedHourlyCell + ')?.querySelector("button[aria-label=\\\"Aus Kinderplan entfernen\\\"]");if(!b)return false;b.click();return true;})()');
    if (!removedFromBoard) throw new Error('One-click unpublishing from teacher weekly grid failed.');
    await waitFor(client, 'weekly plan task can be added back directly',
      'Boolean((' + savedHourlyCell + ')?.querySelector("button[aria-label=\\\"Zum Kinderplan hinzufügen\\\"]"))');
    const addedToBoard = await evaluate(client,
      '(() => {const b=(' + savedHourlyCell + ')?.querySelector("button[aria-label=\\\"Zum Kinderplan hinzufügen\\\"]");if(!b)return false;b.click();return true;})()');
    if (!addedToBoard) throw new Error('One-click publishing from teacher weekly grid failed.');
    await waitFor(client, 'one-click published lesson visible in weekly plan',
      'Boolean((' + savedHourlyCell + ')?.querySelector("button[aria-label=\\\"Aus Kinderplan entfernen\\\"]"))');
    // End-to-end teaching journey: one real synthetic pupil confirms one lesson
    // at the board; the shared plan never publishes individual feedback.
    await clickSidebar(client, 'Klassenliste');
    // Demo classrooms already contain synthetic pupils; the old test assumed an empty class.
    // Accept both supported student-list states, then add one synthetic pupil for the journey.
    await waitFor(client, 'pupil list ready',
      'document.body?.innerText.includes("Willkommen in deiner neuen Klasse!")||Array.from(document.querySelectorAll("button")).some(b=>String(b.textContent||"").trim()==="Schüler hinzufügen")', 20000);
    const emptyStudentList = await evaluate(client,
      'document.body?.innerText.includes("Willkommen in deiner neuen Klasse!")');
    await clickButton(client, emptyStudentList ? 'Schüler:in hinzufügen' : 'Schüler hinzufügen');
    await waitFor(client, 'new pupil form', 'document.body?.innerText.includes("Neuer Schüler")');
    await setInputByPlaceholder(client, 'z.B. Lukas', 'Testkind');
    await setInputByPlaceholder(client, 'z.B. Müller', 'Wochenplan');
    await clickButton(client, 'Weiter', true);
    await clickButton(client, 'Weiter', true);
    await clickButton(client, 'Anlegen', true);
    await waitFor(client, 'synthetic pupil saved', '!document.querySelector("#student-dialog-title")', 15000);
    await clickSidebar(client, 'Lehrercockpit');
    await waitFor(client, 'white classroom board', 'Boolean(document.getElementById("widget-board-stage"))', 30000);
    await clickButton(client, 'Widget hinzufügen');
    await waitFor(client, 'classroom weekly-plan picker entry',
      'Array.from(document.querySelectorAll("button")).some(b=>b.getAttribute("aria-label")==="Wochenplan der Kinder hinzufügen")');
    const addedWidget = await evaluate(client, '(() => {const b=Array.from(document.querySelectorAll("button")).find(b=>b.getAttribute("aria-label")==="Wochenplan der Kinder hinzufügen");if(!b)return false;b.click();return true;})()');
    if (!addedWidget) throw new Error('Could not add weekly-plan widget.');
    // Current classroom widget: task → child → feedback, not the retired
    // personal-plan dialog with public pupil-name buttons.
    await waitFor(client, 'published task visible on public board',
      '(() => {const b=document.querySelector("[aria-label=\\\"Wochenplan der Klasse\\\"]");return !!b&&b.textContent.includes(' + q(topic) + ')&&b.textContent.includes("Arbeitsheft Seite 12")&&!!b.querySelector("button")&&!b.textContent.includes("Das war sehr schwer");})()', 20000);
    await waitFor(client, 'standalone homework visible in weekly-plan widget',
      '(() => {const b=document.querySelector("[aria-label=\\\"Wochenplan der Klasse\\\"]");return !!b&&b.querySelector("[aria-label=\\\"Hausübungen im Wochenplan\\\"]")?.textContent.includes(' + q(dayHomework) + ');})()', 20000);
    await clickButton(client, 'Ich bin fertig mit einer Aufgabe');
    await waitFor(client, 'task selection dialog',
      'Boolean(document.querySelector("[role=dialog][aria-label=\\\"Ich bin fertig mit einer Aufgabe\\\"] [aria-label=\\\"Aufgabe auswählen\\\"]"))');
    const selectedTask = await evaluate(client,
      '(() => {const b=Array.from(document.querySelectorAll("[aria-label=\\\"Aufgabe auswählen\\\"] button")).find(b=>b.textContent.includes(' + q(topic) + '));if(!b)return false;b.click();return true;})()');
    if (!selectedTask) throw new Error('Could not select published classroom task.');
    await waitFor(client, 'child selection',
      'Boolean(document.querySelector("[role=dialog] [aria-label=\\\"Kind auswählen\\\"]"))');
    const choseChild = await evaluate(client,
      '(() => {const b=Array.from(document.querySelectorAll("[aria-label=\\\"Kind auswählen\\\"] button")).find(b=>b.textContent.trim().startsWith("Testkind"));if(!b)return false;b.click();return true;})()');
    if (!choseChild) throw new Error('Could not select synthetic pupil for task feedback.');
    await waitFor(client, 'child feedback options',
      'Array.from(document.querySelectorAll("[role=dialog] button")).some(b=>b.getAttribute("aria-label")==="Aufgabe fertig: Das war sehr schwer")');
    const feedbackSaved = await evaluate(client,
      '(() => {const b=Array.from(document.querySelectorAll("[role=dialog] button")).find(b=>b.getAttribute("aria-label")==="Aufgabe fertig: Das war sehr schwer");if(!b)return false;b.click();return true;})()');
    if (!feedbackSaved) throw new Error('Could not submit synthetic pupil feedback.');
    await waitFor(client, 'public board restored without individual feedback',
      '(() => {const b=document.querySelector("[aria-label=\\\"Wochenplan der Klasse\\\"]");return !!b&&b.textContent.includes(' + q(topic) + ')&&!document.querySelector("[role=dialog][aria-label=\\\"Ich bin fertig mit einer Aufgabe\\\"]")&&!b.textContent.includes("Das war sehr schwer");})()');
    console.log('✓ real Chrome: classroom task, pupil feedback and private board verified');
    const closedCockpit = await evaluate(client,
      '(() => {const b=document.querySelector("button[aria-label=\\\"Lehrercockpit schließen · Zurück zu Heute\\\"]");if(!b)return false;b.click();return true;})()');
    if (!closedCockpit) throw new Error('Cannot return to planning after cockpit weekly-plan use.');
    await waitFor(client, 'dashboard after classroom board',
      'Array.from(document.querySelectorAll("button[aria-current=page]")).some(b=>b.textContent.trim()==="Heute")');
    await clickSidebar(client, 'Wochenplan');
    await waitFor(client, 'saved selected week after cockpit journey', 'Boolean(' + savedHourlyCell + ')', 20000);
    await waitFor(client, 'individual child completion reflected in teacher weekly planning',
      '(() => {const cell=' + savedHourlyCell + ';const b=cell?.querySelector("button[aria-label=\\\"Aus Kinderplan entfernen\\\"]");return !!b&&b.textContent.includes("1/1 fertig");})()', 12000);
    if (!await evaluate(client, '(() => {const cell=' + savedHourlyCell + ';if(!cell)return false;cell.click();return true;})()'))
      throw new Error('Could not open the saved hourly lesson.');
    try {
      await waitFor(client, 'planned lesson overview', 'document.body?.innerText.toLocaleLowerCase("de").includes("geplante einheit")&&document.body?.innerText.includes("Bearbeiten")', 6000);
    } catch (error) {
      const details = await evaluate(client, '(() => ({overview:document.body?.innerText.includes("Geplante Einheit"),editor:Array.from(document.querySelectorAll("h3")).some(e=>e.textContent?.trim()==="Einheit planen"),savedCells:Array.from(document.querySelectorAll("div")).filter(el=>String(el.className||"").includes("group/cell")&&String(el.className||"").includes("min-h-[5.3125rem]")&&String(el.textContent||"").includes(' + q(topic) + ')).map(el=>({text:el.textContent?.slice(0,140),class:el.className,rect:[el.getBoundingClientRect().width,el.getBoundingClientRect().height]})),visibleDialogs:Array.from(document.querySelectorAll("[role=dialog]")).map(el=>el.getAttribute("aria-label")),bodyTail:document.body?.innerText.slice(-650)}))()');
      throw new Error('Planned lesson overview not available after clicking saved hourly card: ' + JSON.stringify(details) + ' / ' + String(error));
    }
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
      // The toast may also contain the saved topic; only the actual year-plan
      // table cell may be used to open a saved lesson.
      const syncedYearCell = 'Array.from(document.querySelectorAll("td[role=button][aria-label]")).find(el=>String(el.getAttribute("aria-label")||"").includes(' + q(topic) + '))';
      await waitFor(client, 'synced topic visible in actual yearly table', 'Boolean(' + syncedYearCell + ')', 20000);
      if (!await evaluate(client, '(() => {const cell=' + syncedYearCell + ';if(!cell)return false;cell.click();return true;})()')) {
        throw new Error('Could not open the saved lesson in the yearly table.');
      }
      await waitFor(client, 'yearly overview', 'document.body?.innerText.toLocaleLowerCase("de").includes("jahresplanung · übersicht")&&document.body?.innerText.includes("Bearbeiten")');
      await clickButton(client, 'Bearbeiten');
      await waitFor(client, 'large yearly editor', 'Array.from(document.querySelectorAll("h3")).some(el=>el.textContent?.trim()==="Jahresplanung bearbeiten"&&el.closest(".max-w-none"))');
      const yearlyLarge = await evaluate(client,
        '(() => {const heading=Array.from(document.querySelectorAll("h3")).find(el=>el.textContent?.trim()==="Jahresplanung bearbeiten");const node=heading?.closest(".max-w-none");if(!node)return false;const r=node.getBoundingClientRect();return r.width>950&&r.height>window.innerHeight*0.82;})()'
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
