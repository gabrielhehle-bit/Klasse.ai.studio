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
          clearTimeout(pending.timer);
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
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('CDP command timed out: ' + method));
      }, 15000);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.ws?.close(); }
}

async function waitForChrome() {
  let lastError;
  for (let attempt = 0; attempt < 180; attempt++) {
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
  client.navigationCount = 0;
  client.on('Page.frameNavigated', event => {
    if (!event.frame?.parentId) client.navigationCount += 1;
  });
  client.on('Page.javascriptDialogOpening', event => {
    if (event.type === 'alert' && event.message === 'Gewichtungen erfolgreich gespeichert!') {
      void client.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
    } else if (event.type === 'beforeunload') {
      // Keep the page open while its encrypted write finishes, then retry reload.
      void client.send('Page.handleJavaScriptDialog', { accept: false }).catch(() => {});
    }
  });
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

async function saveScreenshot(client, path = SCREENSHOT_PATH) {
  const screenshot = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await fs.writeFile(path, Buffer.from(screenshot.data, 'base64'));
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
  await clickButton(client, 'Beobachtungen', true);
  await waitFor(client, 'observation page', 'document.body.innerText.includes("Beobachtung notieren")');
  await clickButton(client, 'Pädagogische Notizen');
}
async function reloadAndUnlock(client) {
  const before = client.navigationCount;
  for (let attempt = 0; attempt < 20 && client.navigationCount === before; attempt++) {
    await client.send('Page.reload');
    await sleep(500);
  }
  if (client.navigationCount === before) throw new Error('Encrypted save did not permit a safe real reload.');
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
  const moodSelector='[data-attendance-student] select[aria-label^="Befinden für"]';
  const attendanceDate = await evaluate(client, `document.querySelector('[aria-label="Anwesenheitsdatum"]').value`);
  await evaluate(client, `(() => {const select=document.querySelector(${q(moodSelector)});select.value='2';select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await waitFor(client, 'daily mood shown in attendance', `document.querySelector(${q(moodSelector)})?.value === '2'`);

  await clickButton(client, 'fehlt', true);
  // Clicking "fehlt" records an excused absence; dismiss its reason menu by opening the note.
  await clickSelector(client, 'button[aria-label="Notiz oder Grund eintragen"]');
  await setInputByPlaceholder(client, 'Grund der Abwesenheit oder wichtige Notiz', 'Synthetischer Browser-Testgrund');
  await clickButton(client, 'Speichern', true);
  await openPupil(client, pupilParts);
  await waitFor(client, 'attendance mood reaches shared pupil dossier', `document.querySelector('[data-dossier-overview]')?.innerText.includes('🙂 Gut')`);
  await waitFor(client, 'dossier overview charts', 'Boolean(document.querySelector("[data-dossier-overview]")) && document.body.innerText.includes("Alle Fächer auf einen Blick") && document.body.innerText.includes("Befinden")');
  const assertWellbeingAxis = async () => {
    await evaluate(client, `document.querySelector('[data-dossier-trend-card="wellbeing"]').scrollIntoView({block:'center'})`);
    try {
    await waitFor(client, 'dossier places positive behavior and mood values at the top', `(() => {
      const ticks=Array.from(document.querySelectorAll('[data-dossier-trend-card="wellbeing"] .recharts-cartesian-axis-tick-value'));
      const good=ticks.find(t=>t.textContent.trim()==='1'),poor=ticks.find(t=>t.textContent.trim()==='5');
      return Boolean(good && poor && good.getBoundingClientRect().y < poor.getBoundingClientRect().y);
    })()`);
    } catch (error) {
      console.log('Wellbeing axis diagnostics',await evaluate(client, `document.querySelector('[data-dossier-trend-card="wellbeing"]').outerHTML.slice(0,12000)`));
      throw error;
    }
    await waitFor(client, 'dossier names both wellbeing lines', `document.querySelector('[aria-label="Legende für Verhalten und Befinden"]')?.textContent.includes('Verhalten') && document.querySelector('[aria-label="Legende für Verhalten und Befinden"]')?.textContent.includes('Befinden')`);
  };
  await assertWellbeingAxis();
  const overviewOrder = await evaluate(client, `Boolean(document.querySelector('[data-dossier-trend-card="attendance"]').compareDocumentPosition(document.querySelector('[data-dossier-subject-grid]')) & Node.DOCUMENT_POSITION_FOLLOWING)`);
  if (!overviewOrder) throw new Error('Dossier overview must show everyday charts before detailed subject cards.');
  for (const label of ['Schuljahr', '6 Wochen']) {
    await evaluate(client, `Array.from(document.querySelectorAll('[aria-label="Zeitraum der Alltagsdiagramme"] button')).find(b=>b.textContent===${q(label)}).click()`);
    await waitFor(client, 'dossier calendar covers ' + label, `(() => {
      const calendar=document.querySelector('[data-attendance-heatmap]');
      const dates=Array.from(calendar.querySelectorAll('[data-attendance-day]')).map(day=>day.dataset.date);
      const start=calendar.dataset.periodStart,end=calendar.dataset.periodEnd;
      const count=Math.round((Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000)+1;
      return dates.length===Math.max(0,count) && (!dates.length || (dates[0]===start && dates.at(-1)===end));
    })()`);
  }
  const overviewWidth = await evaluate(client, 'document.documentElement.scrollWidth');
  if (overviewWidth > WIDTH + 5) throw new Error('Dossier overview overflows viewport: ' + overviewWidth);
  await saveScreenshot(client, SCREENSHOT_PATH.replace('.png', '-dossier.png'));
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1360, height: 1000, deviceScaleFactor: 1, mobile: false });
  await sleep(500);
  await assertWellbeingAxis();
  await saveScreenshot(client, SCREENSHOT_PATH.replace('.png', '-dossier-desktop.png'));
  await client.send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: 1000, deviceScaleFactor: 1, mobile: true });
  await clickSelector(client, '[data-dossier-overview] section[aria-label="Notenstand aller Fächer"] .grid button');
  await waitFor(client, 'direct subject entry with chart', 'Boolean(document.querySelector("[data-dossier-assessment-chart]")) && Boolean(document.querySelector("select[aria-label=\\"Fach auswählen\\"]"))');
  const firstSubject = await evaluate(client, 'document.querySelector("select[aria-label=\\"Fach auswählen\\"]").value');
  await clickSelector(client, 'button[aria-label="Nächstes Fach"]');
  await waitFor(client, 'next subject updates selection', 'document.querySelector("select[aria-label=\\"Fach auswählen\\"]")?.value !== ' + q(firstSubject));
  await clickSelector(client, 'button[aria-label="Vorheriges Fach"]');
  await waitFor(client, 'previous subject restores selection', 'document.querySelector("select[aria-label=\\"Fach auswählen\\"]")?.value === ' + q(firstSubject));
  for (const assessment of [{ label: 'Späterer Test', date: '2026-09-22', grade: '2' }, { label: 'Früherer Test', date: '2026-09-08', grade: '4' }]) {
    await clickButton(client, 'Leistungsnachweis eintragen');
    await waitFor(client, 'assessment form', 'Boolean(document.querySelector("input[type=date]"))');
    await setInputByLabel(client, 'Bezeichnung', assessment.label);
    await setInputByLabel(client, 'Datum', assessment.date);
    await setInputByLabel(client, 'Note (1 bis 5)', assessment.grade);
    await clickButton(client, 'Speichern', true);
    await waitFor(client, 'assessment form closed', '!document.querySelector("input[type=date]")');
  }
  await waitFor(client, 'dated grade dots visible in chronological order', '(() => { const c=document.querySelector("[data-dossier-assessment-chart]"); const dots=Array.from(c?.querySelectorAll(".recharts-line-dot")||[]); return dots.length===2 && Number(dots[0].getAttribute("cy")) > Number(dots[1].getAttribute("cy")) && c.innerText.indexOf("08.09.") < c.innerText.indexOf("22.09."); })()');
  const subjectWidth = await evaluate(client, 'document.documentElement.scrollWidth');
  if (subjectWidth > WIDTH + 5) throw new Error('Subject detail overflows viewport: ' + subjectWidth);
  await saveScreenshot(client, SCREENSHOT_PATH.replace('.png', '-subject.png'));
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1360, height: 1000, deviceScaleFactor: 1, mobile: false });
  await sleep(500);
  await saveScreenshot(client, SCREENSHOT_PATH.replace('.png', '-subject-desktop.png'));
  await client.send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: 1000, deviceScaleFactor: 1, mobile: true });
  await clickButton(client, 'Beobachtungen', true);
  await waitFor(client, 'observation charts shown first', 'Boolean(document.querySelector("[data-dossier-observation-charts]")) && Boolean(document.querySelector("[data-observation-attendance] .recharts-bar"))');
  await clickButton(client, 'Gesamtes Schuljahr', true);
  await waitFor(client, 'school year selected', 'document.querySelector("[aria-label=\\"Beobachtungszeitraum\\"] button[aria-pressed=true]")?.innerText === "Gesamtes Schuljahr"');
  await clickButton(client, 'Letzte 6 Wochen', true);
  await clickSelector(client, '[aria-label="Tagesdaten auswählen"] button:last-child');
  await waitFor(client, 'attendance day and reason shown', 'document.querySelector("[data-observation-records]")?.innerText.includes("Synthetischer Browser-Testgrund") && document.querySelector("[data-observation-records]")?.innerText.includes("Entschuldigt")');
  if (await evaluate(client, 'document.documentElement.scrollWidth') > WIDTH + 5) throw new Error('Observation charts overflow viewport.');
  await evaluate(client, 'document.querySelectorAll(".custom-scrollbar").forEach(el => el.scrollTop = 0)');
  await saveScreenshot(client, SCREENSHOT_PATH.replace('.png', '-observations.png'));
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1360, height: 1000, deviceScaleFactor: 1, mobile: false });
  await sleep(500);
  await saveScreenshot(client, SCREENSHOT_PATH.replace('.png', '-observations-desktop.png'));
  await client.send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: 1000, deviceScaleFactor: 1, mobile: true });
  await openObservations(client);
  await clickButton(client, 'Beobachtung notieren');
  await setInputByPlaceholder(client, 'Konkrete, wertfreie Unterrichtsbeobachtung', 'Synthetische Browser-Testnotiz');
  await setInputByLabel(client, 'Päd. Einordnung', 'positiv');
  await clickButton(client, 'Beobachtung speichern');
  await waitFor(client, 'positive note visibly saved', 'document.body.innerText.includes("Synthetische Browser-Testnotiz") && document.body.innerText.includes("Stärke / Ressource")');
  await clickSelector(client, 'button[aria-label="Beobachtung bearbeiten"]');
  await setInputByPlaceholder(client, 'Konkrete, wertfreie Unterrichtsbeobachtung', 'Synthetische Browser-Testnotiz korrigiert');
  await clickButton(client, 'Beobachtung speichern');
  await waitFor(client, 'note edited without duplication', 'Array.from(document.querySelectorAll("p")).filter(p=>p.textContent.includes("Synthetische Browser-Testnotiz")).length === 1 && document.body.innerText.includes("Synthetische Browser-Testnotiz korrigiert")');
  // Navigate to another pupil through the actual selector and ensure no note leakage.
  const selectionBefore = await evaluate(client, 'Array.from(document.querySelectorAll("select")).find(s=>Array.from(s.options).some(o=>' + q(pupilParts) + '.every(p=>o.textContent.includes(p))))?.value');
  const next = await evaluate(client, '(() => { const b=document.querySelector("button[aria-label^=\\"Nächstes Kind:\\"]") || document.querySelector("button[aria-label^=\\"Vorheriges Kind:\\"]"); if (!b) return false; b.click(); return true; })()');
  if (!next) throw new Error('No second sample pupil available.');
  await waitFor(client, 'selected pupil changed', 'Array.from(document.querySelectorAll("select")).some(s=>Array.from(s.options).some(o=>' + q(pupilParts) + '.every(p=>o.textContent.includes(p))) && s.value!==' + q(selectionBefore) + ')');
  await openObservations(client);
  // The previous child's card may remain briefly during the exit animation.
  await waitFor(client, 'note absent from the other pupil', '!document.body.innerText.includes("Synthetische Browser-Testnotiz")');
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
  await waitFor(client, 'attendance restored', 'Boolean(document.querySelector("button[aria-label=\\"Notiz oder Grund eintragen\\"]"))');
  await waitFor(client, 'daily mood survives encrypted reload', `document.querySelector(${q(moodSelector)})?.value === '2'`);
  await evaluate(client, `Array.from(document.querySelectorAll('header')).find(header=>header.querySelector('h1')?.textContent.trim()==='Anwesenheit').querySelector('button svg.lucide-ellipsis').closest('button').click()`);
  await waitFor(client, 'attendance report menu', `Array.from(document.querySelectorAll('button')).some(button=>button.textContent.trim()==='Statistik & Monatsübersicht')`);
  await clickButton(client, 'Statistik & Monatsübersicht', true);
  await waitFor(client, 'attendance period filter', `Boolean(document.querySelector('[aria-label="Zeitraum der Fehlstunden"]'))`);
  await evaluate(client, `(() => {const select=document.querySelector('[aria-label="Zeitraum der Fehlstunden"]');select.value='custom';select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await setInputByLabel(client, 'Fehlstunden von', attendanceDate);
  await setInputByLabel(client, 'Fehlstunden bis', attendanceDate);
  await waitFor(client, 'custom period shows the selected absence', `document.querySelector('[data-attendance-range-label]')?.textContent.includes(${q(attendanceDate.split('-').reverse().join('.'))}) && Number(document.querySelector('[data-attendance-period-table] tbody tr td:nth-child(6)')?.textContent) > 0`);
  await saveScreenshot(client, SCREENSHOT_PATH.replace('.png', '-attendance-period.png'));
  await setInputByLabel(client, 'Fehlstunden bis', '1900-01-01');
  await waitFor(client, 'invalid period is empty without changing attendance', `!document.querySelector('[data-attendance-range-label]') && Array.from(document.querySelectorAll('[data-attendance-period-table] tbody td:not(:first-child)')).every(cell=>Number(cell.textContent)===0)`);
  await evaluate(client, `(() => {const select=document.querySelector('[aria-label="Zeitraum der Fehlstunden"]');select.value='year';select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await waitFor(client, 'school year totals return after invalid range', `Number(document.querySelector('[data-attendance-period-table] tbody tr td:nth-child(6)')?.textContent) > 0`);
  await evaluate(client, `Array.from(document.querySelectorAll('button')).find(button=>button.textContent.trim()==='Schließen ✕').click()`);

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
    // Exercise the single sidebar view switch twice at a normal laptop viewport.
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 720, deviceScaleFactor: 1, mobile: false,
    });
    await clickSidebar(client, 'Lehrercockpit');
    await waitFor(client, 'student sidebar or its open action', 'Boolean(document.querySelector(".klassio-student-sidebar, button[aria-label=\\\"Schülerliste einblenden\\\"]"))', 30000);
    await evaluate(client, 'document.querySelector("button[aria-label=\\\"Schülerliste einblenden\\\"]")?.click()');
    await waitFor(client, 'student sidebar', 'Boolean(document.querySelector(".klassio-student-sidebar"))', 30000);
    for (const entry of ['first', 'second']) {
      await evaluate(client, `(() => {
        const sidebar = document.querySelector('.klassio-student-sidebar');
        const button = sidebar.querySelector('button[aria-label="Schüler-Seitenleiste kompakt anzeigen"]');
        if (!button) throw new Error('Compact entry missing');
        button.click();
      })()`);
      await waitFor(client, 'whole class fits compact sidebar', `(() => {
        const list = document.querySelector('.klassio-student-sidebar [data-compact-student-grid]');
        if (!list) return false;
        const bounds = list.getBoundingClientRect();
        const cards = Array.from(list.querySelectorAll('[role=listitem]'));
        return cards.length > 0 && list.scrollHeight <= list.clientHeight + 1 && cards.every(card => {
          const r = card.getBoundingClientRect();
          const plus = card.querySelector('button[aria-label^="Pluspunkt für"]')?.getBoundingClientRect();
          return r.top >= bounds.top - 1 && r.bottom <= bounds.bottom + 1 && plus && plus.bottom <= r.bottom + 1;
        });
      })()`, 15000);
      await evaluate(client, 'document.querySelector("button[aria-label=\\\"Schüler-Seitenleiste groß anzeigen\\\"]").click()');
      await waitFor(client, 'expanded sidebar restored', `Boolean(document.querySelector('.klassio-student-sidebar button[aria-label="Schüler-Seitenleiste kompakt anzeigen"]'))`);
    }
    await waitFor(client, 'latest local save shown in compact cockpit status', `Boolean(document.querySelector('.klassio-cockpit-shell summary[aria-label^="Speicherstatus:"]')?.closest('details[data-local-save-status="saved"]'))`);
    const tidyHeader = await evaluate(client, `(() => {
      const sidebar = document.querySelector('.klassio-student-sidebar');
      const list = sidebar.querySelector('[role=list]');
      const sync = document.querySelector('.klassio-cockpit-shell summary[aria-label^="Speicherstatus:"]');
      return { headerHeight: list.getBoundingClientRect().top - sidebar.getBoundingClientRect().top,
        closeButtons: sidebar.querySelectorAll('button[aria-label="Schülerliste schließen"]').length,
        syncHeight: sync?.getBoundingClientRect().height,
        syncText: sync?.textContent,
        extraHeading: sidebar.textContent.includes('Unsere Pluspunkte'),
        settingHint: sidebar.textContent.includes('Name antippen') };
    })()`);
    console.log('Compact cockpit controls:', JSON.stringify(tidyHeader));
    if (tidyHeader.headerHeight > 115 || tidyHeader.closeButtons !== 1 || tidyHeader.extraHeading || tidyHeader.settingHint) throw new Error('Student sidebar header must stay compact with one close action.');
    if (!tidyHeader.syncHeight || tidyHeader.syncHeight > 28 || !tidyHeader.syncText.includes('Lokal gespeichert')) throw new Error('Cockpit save status must be compact and still distinguish local storage from sync.');
    const studentName = await evaluate(client, `document.querySelector('.klassio-student-sidebar button[aria-label^="Pluspunkt für"]').getAttribute('aria-label').replace('Pluspunkt für ', '').replace(' vergeben', '')`);
    const leaveCockpit = () => evaluate(client, `document.querySelector('button[aria-label^="Lehrercockpit schließen"]').click()`);
    const openGradebook = async () => {
      await leaveCockpit();
      await waitFor(client, 'dashboard after cockpit', `Boolean(document.querySelector('button[aria-current=page]'))`);
      await clickSidebar(client, 'Notenmappe');
      await waitFor(client, 'gradebook subject selection', `Boolean(document.querySelector('#gradebook-active-subject'))`);
      await evaluate(client, `(() => { const select = document.querySelector('#gradebook-active-subject'); select.value = 'Deutsch'; select.dispatchEvent(new Event('change', {bubbles:true})); })()`);
      await clickButton(client, 'Mitarbeit');
      await waitFor(client, 'German participation rows', `document.querySelector('#gradebook-active-subject')?.value === 'Deutsch' && Boolean(document.querySelector('input[data-quick-entry="mitarbeit"]'))`);
    };
    const bookPointsExpression = `Number(Array.from(document.querySelectorAll('tbody tr')).find(row => row.textContent.includes(${q(studentName)}))?.querySelector('input[data-quick-entry="mitarbeit"]')?.value || 0)`;
    await openGradebook();
    const initialBookPoints = await evaluate(client, bookPointsExpression);
    await clickSidebar(client, 'Lehrercockpit');
    await waitFor(client, 'student sidebar restored', `Boolean(document.querySelector('.klassio-student-sidebar button[aria-label^="Pluspunkt für"]'))`);
    await evaluate(client, `document.querySelector('button[aria-label="Mitarbeit-Einstellungen der Schüler-Seitenleiste öffnen"]').click()`);
    await waitFor(client, 'simple sidebar participation settings', `Boolean(document.querySelector('.klassio-student-sidebar [role=dialog][aria-label="Mitarbeit einstellen"]'))`);
    const settingsAreLocal = await evaluate(client, `!document.body.innerText.includes('Widget-Bibliothek')`);
    if (!settingsAreLocal) throw new Error('Participation settings must not open the widget library.');
    await evaluate(client, `document.querySelector('.klassio-student-sidebar input[type=radio][value=choose]').click()`);
    await clickButton(client, 'Fertig');
    const pointsExpression = `Number(document.querySelector('.klassio-student-sidebar [role=listitem] [aria-label$="Pluspunkte"]').textContent.match(/\\d+/)?.[0] || 0)`;
    const initialPoints = await evaluate(client, pointsExpression);
    const clickPlus = () => evaluate(client, `document.querySelector('.klassio-student-sidebar button[aria-label^="Pluspunkt für"]').click()`);
    await clickPlus();
    await waitFor(client, 'inline subject picker', `Boolean(document.querySelector('.klassio-student-sidebar [role=dialog][aria-label="Fach für Mitarbeit auswählen"]'))`);
    if (await evaluate(client, pointsExpression) !== initialPoints) throw new Error('Opening subject picker must not award a point.');
    await clickButton(client, 'Abbrechen');
    if (await evaluate(client, pointsExpression) !== initialPoints) throw new Error('Cancelling subject picker must not award a point.');
    await clickPlus();
    await waitFor(client, 'subject picker reopened', `Boolean(document.querySelector('.klassio-student-sidebar [role=dialog][aria-label="Fach für Mitarbeit auswählen"]'))`);
    await evaluate(client, `Array.from(document.querySelectorAll('.klassio-student-sidebar [role=dialog] button')).find(button => button.textContent.trim() === 'Deutsch').click()`);
    await waitFor(client, 'chosen subject commits one participation point', pointsExpression + ' === ' + (initialPoints + 1));
    await evaluate(client, `document.querySelector('button[aria-label="Mitarbeit-Einstellungen der Schüler-Seitenleiste öffnen"]').click()`);
    await waitFor(client, 'settings reopened', `Boolean(document.querySelector('.klassio-student-sidebar input[type=radio][value=current]'))`);
    await evaluate(client, `document.querySelector('.klassio-student-sidebar input[type=radio][value=current]').click()`);
    const automaticSubject = await evaluate(client, `document.querySelector('.klassio-student-sidebar [role=dialog] strong').textContent`);
    await clickButton(client, 'Fertig');
    await clickPlus();
    await waitFor(client, 'automatic subject awards immediately', pointsExpression + ' === ' + (initialPoints + 2));
    if (await evaluate(client, `Boolean(document.querySelector('[role=dialog][aria-label="Fach für Mitarbeit auswählen"]'))`)) throw new Error('Automatic mode must not ask for a subject.');
    await clickButton(client, '🤝 Sozial +1');
    await waitFor(client, 'social star counter', `document.querySelector('.klassio-student-sidebar [role=listitem] [aria-label$="Pluspunkte"]').textContent.includes('⭐') && !document.querySelector('.klassio-student-sidebar [role=listitem] [aria-label$="Pluspunkte"]').textContent.includes('/10')`);
    for (let stars = 1; stars <= 10; stars++) {
      await evaluate(client, `document.querySelector('.klassio-student-sidebar button[aria-label^="Sozialpunkt für"]').click()`);
      await waitFor(client, 'social star ' + stars, pointsExpression + ' === ' + stars);
      const hasBadge = await evaluate(client, `Boolean(document.querySelector('.klassio-student-sidebar [role=listitem] [aria-label="Badge für 10 soziale Sterne"]'))`);
      if (hasBadge) throw new Error('Social stars must never award automatic badges.');
    }
    await evaluate(client, `document.querySelector('.klassio-student-sidebar button[aria-label^="Letzten Pluspunkt"]').click()`);
    await waitFor(client, 'social correction removes tenth star', pointsExpression + ` === 9 && !document.querySelector('.klassio-student-sidebar [role=listitem] [aria-label="Badge für 10 soziale Sterne"]')`);
    await evaluate(client, `document.querySelector('.klassio-student-sidebar button[aria-label^="Sozialpunkt für"]').click()`);
    await waitFor(client, 'social tenth star without an automatic badge', pointsExpression + ` === 10 && document.querySelectorAll('.klassio-student-sidebar [role=listitem] [aria-label="Badge für 10 soziale Sterne"]').length === 0`);
    await clickButton(client, 'Fach +1');
    await waitFor(client, 'subject and social counters remain separate', pointsExpression + ' === ' + (initialPoints + 2));
    await evaluate(client, `document.querySelector('.klassio-student-sidebar button[aria-label^="Badges für"]').click()`);
    await waitFor(client, 'badge picker opened by student name', `Boolean(document.querySelector('.klassio-student-sidebar [role=dialog][aria-label^="Badges für"]'))`);
    await clickButton(client, 'Sport');
    await evaluate(client, `document.querySelector('.klassio-student-sidebar button[aria-label^="Fußball-Badge an"]').click()`);
    await waitFor(client, 'football badge awarded once', `document.querySelector('.klassio-student-sidebar button[aria-label^="Fußball-Badge an"]')?.disabled === true`);
    await clickButton(client, 'Deutsch');
    await evaluate(client, `document.querySelector('.klassio-student-sidebar button[aria-label^="Leseratte an"]').click()`);
    await waitFor(client, 'reading badge awarded', `document.querySelector('.klassio-student-sidebar button[aria-label^="Leseratte an"]')?.disabled === true`);
    await clickButton(client, 'Fertig');
    await waitFor(client, 'manual badges leave participation points unchanged', pointsExpression + ' === ' + (initialPoints + 2));
    // Sidebar overview uses the same journal as awarding and gradebook updates.
    const chooseSidebarStars = async (label, value) => {
      await evaluate(client, `(() => { const select = Array.from(document.querySelectorAll('select')).find(el => el.getAttribute('aria-label') === ${q(label)}); select.value = ${q(value)}; select.dispatchEvent(new Event('change', { bubbles:true })); })()`);
    };
    await chooseSidebarStars('Widget der Seitenleiste', 'stars');
    await waitFor(client, 'sidebar stars chart visible', `Boolean(document.querySelector('[aria-label="Balkendiagramm der gesammelten Sterne pro Kind"]'))`);
    await chooseSidebarStars('Sterne auswählen', 'social');
    await waitFor(client, 'social journal totals appear in chart', `Array.from(document.querySelectorAll('[aria-label="Balkendiagramm der gesammelten Sterne pro Kind"] > div')).some(el=>el.getAttribute('aria-label')?.endsWith(': 10 Sterne'))`);
    for (const period of ['all', 'month', 'semester', 'week']) {
      await chooseSidebarStars('Zeitraum der Sterne', period);
      await waitFor(client, 'star chart period ' + period, `document.querySelector('select[aria-label="Zeitraum der Sterne"]').value === ${q(period)}`);
    }
    await chooseSidebarStars('Sterne auswählen', 'subject:Deutsch');
    await waitFor(client, 'subject chart excludes social stars', `document.querySelector('select[aria-label="Sterne auswählen"]').value === 'subject:Deutsch'`);
    await chooseSidebarStars('Sterne auswählen', 'unassigned');
    await chooseSidebarStars('Widget der Seitenleiste', 'students');
    await waitFor(client, 'student list restored after chart', pointsExpression + ' === ' + (initialPoints + 2));
    console.log('✓ Sidebar: all/social/unassigned/subject stars with total/month/semester/week chart; gradebook still shares awarded subject data.');
    await openGradebook();
    const expectedBookPoints = initialBookPoints + 1 + (automaticSubject === 'Deutsch' ? 1 : 0);
    await waitFor(client, 'subject awards appear in gradebook and social stars do not change it', bookPointsExpression + ' === ' + expectedBookPoints);
    await clickSidebar(client, 'Lehrercockpit');
    await waitFor(client, 'cockpit reopened for multiple-point correction', `Boolean(document.querySelector('.klassio-student-sidebar button[aria-label^="Pluspunkt für"]'))`);
    await evaluate(client, `document.querySelector('button[aria-label="Mitarbeit-Einstellungen der Schüler-Seitenleiste öffnen"]').click()`);
    await waitFor(client, 'targeted correction child selection', `Boolean(document.querySelector('select[aria-label="Kind für Sterne zurücksetzen"]'))`);
    await evaluate(client, `(() => {const child=document.querySelector('select[aria-label="Kind für Sterne zurücksetzen"]'); child.value=Array.from(child.options).find(option=>option.textContent === ${q(studentName)}).value;child.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await waitFor(client, 'subject correction selector', `Boolean(document.querySelector('select[aria-label="Fach für Punktekorrektur"]'))`);
    await evaluate(client, `(() => {const subject=document.querySelector('select[aria-label="Fach für Punktekorrektur"]');subject.value='Deutsch';subject.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await waitFor(client, 'German correction enabled', `document.querySelector('button[aria-label="1 Deutsch korrigieren"]')?.disabled === false`);
    await evaluate(client, `document.querySelector('button[aria-label="1 Deutsch korrigieren"]').click()`);
    await clickButton(client, 'Fertig', true);
    await waitFor(client, 'one subject point corrected in sidebar', pointsExpression + ' === ' + (initialPoints + 1));
    await openGradebook();
    await waitFor(client, 'targeted correction also reaches gradebook', bookPointsExpression + ' === ' + (expectedBookPoints - 1));
    await clickSidebar(client, 'Lehrercockpit');
    await waitFor(client, 'cockpit restored before bulk reset', `Boolean(document.querySelector('button[aria-label="Mitarbeit-Einstellungen der Schüler-Seitenleiste öffnen"]'))`);
    const resetStars = async kind => {
      await evaluate(client, `document.querySelector('button[aria-label="Mitarbeit-Einstellungen der Schüler-Seitenleiste öffnen"]').click()`);
      await waitFor(client, 'reset controls available in participation settings', `Boolean(document.querySelector('select[aria-label="Kind für Sterne zurücksetzen"]'))`);
      await evaluate(client, `(() => {
        const kindSelect = document.querySelector('select[aria-label="Art der Sterne zurücksetzen"]');
        kindSelect.value = ${q(kind)}; kindSelect.dispatchEvent(new Event('change', {bubbles:true}));
        const child = document.querySelector('select[aria-label="Kind für Sterne zurücksetzen"]');
        child.value = Array.from(child.options).find(option => option.textContent === ${q(studentName)}).value;
        child.dispatchEvent(new Event('change', {bubbles:true}));
      })()`);
      await evaluate(client, `Array.from(document.querySelectorAll('section[aria-label="Sterne zurücksetzen"] button')).find(button => button.textContent.includes('Sterne zurücksetzen')).click()`);
      await waitFor(client, 'reset confirmation names its scope', `Boolean(document.querySelector('[aria-label="Zurücksetzen bestätigen"]'))`);
      await clickButton(client, 'Abbrechen', true);
      await evaluate(client, `Array.from(document.querySelectorAll('section[aria-label="Sterne zurücksetzen"] button')).find(button => button.textContent.includes('Sterne zurücksetzen')).click()`);
      await clickButton(client, 'Jetzt zurücksetzen', true);
      await clickButton(client, 'Fertig', true);
    };
    await resetStars('subject');
    await waitFor(client, 'multiple subject errors reset the counter', pointsExpression + ' === 0');
    await clickButton(client, '🤝 Sozial +1');
    await waitFor(client, 'subject reset preserves social stars', pointsExpression + ' === 10');
    await resetStars('social');
    await waitFor(client, 'social counter resets independently', pointsExpression + ' === 0');
    await evaluate(client, `document.querySelector('.klassio-student-sidebar button[aria-label^="Badges für"]').click()`);
    await waitFor(client, 'manual badges survive resetting stars', `document.querySelector('.klassio-student-sidebar button[aria-label^="Fußball-Badge an"]')?.disabled === true`);
    await clickButton(client, 'Fertig', true);
    await openGradebook();
    await waitFor(client, 'reset also corrects subject participation in the gradebook', bookPointsExpression + ' === ' + initialBookPoints);
    await clickSidebar(client, 'Lehrercockpit');
    await client.send('Emulation.setDeviceMetricsOverride', { width:1366, height:768, deviceScaleFactor:1, mobile:false });
    const openAuditWidget = async (type, search, label) => {
      await clickButton(client, 'Widget hinzufügen');
      await waitFor(client, 'widget audit search field', `Boolean(document.querySelector('input[aria-label="Widget suchen"]'))`);
      await setInputByLabel(client, 'Widget suchen', search);
      await waitFor(client, 'widget audit search result: ' + search, `Array.from(document.querySelectorAll('[role=dialog][aria-label="Widget-Bibliothek"] button[data-widget-card-action="primary"]')).some(b=>b.getAttribute('aria-label').startsWith(${q(label || search)}))`);
      await evaluate(client, `(() => {const buttons=Array.from(document.querySelectorAll('[role=dialog][aria-label="Widget-Bibliothek"] button[data-widget-card-action="primary"]'));const button=buttons.find(b=>b.getAttribute("aria-label").startsWith(${q(label || search)}));if(!button)throw new Error("Widget entry missing");button.click();})()`);
      await waitFor(client, 'widget audit opens ' + type, `Array.from(document.querySelectorAll('[data-widget-type=${q(type)}]')).some(el=>el.getClientRects().length)`);
    };
    const auditMenu = async (type, action) => {
      await evaluate(client, `Array.from(document.querySelectorAll('[data-widget-type=${q(type)}]')).find(el=>el.getClientRects().length).querySelector('button[aria-label="Widget-Menü öffnen"]').click()`);
      await clickButton(client, action, true);
    };
    await openAuditWidget('calculator', 'Grundschulrechner');
    const calculatorFits = await evaluate(client, `(() => {const root=document.querySelector('#smartboard-calculator');const r=root.getBoundingClientRect();return Array.from(root.querySelector('[data-calculator-keypad]').querySelectorAll('button')).every(b=>{const t=b.getBoundingClientRect();return t.top>=r.top && t.bottom<=r.bottom+1 && t.height>=43;});})()`);
    if(!calculatorFits) throw new Error('Calculator clips a key or shrinks a touch target in its default size.');
    for(const [kind,value] of [['digit','2'],['selector','button[title="Addition (+)"]'],['digit','3'],['selector','button[title="Gleich (= / Enter)"]']]) {
      await evaluate(client, `(() => {const root=document.querySelector('#smartboard-calculator');const b=${q(kind)} === 'digit' ? Array.from(root.querySelectorAll('button')).find(b=>b.textContent.trim()===${q(value)}) : root.querySelector(${q(value)});b.click();})()`);
    }
    await waitFor(client, 'calculator result before minimize', `Boolean(document.querySelector('#smartboard-calculator div[title="5"]'))`);
    const calculatorState = await evaluate(client, `document.querySelector('#smartboard-calculator').textContent`);
    await auditMenu('calculator', 'Minimieren');
    await openAuditWidget('calculator', 'Grundschulrechner');
    if(await evaluate(client, `document.querySelector('#smartboard-calculator').textContent`) !== calculatorState) throw new Error('Calculator loses its state on restore.');
    await auditMenu('calculator', 'Größe');
    await clickButton(client, 'Tafelfläche', true);
    await evaluate(client, `document.querySelector('[data-widget-type="calculator"] button[aria-label="Größeneinstellung schließen"]').click()`);
    await sleep(400);
    const resizeBox = () => evaluate(client, `(() => {const r=document.querySelector('[data-widget-type="calculator"]').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};})()`);
    const dragResize = async (direction, dx, dy) => {
      await waitFor(client, 'resize interaction settled', `!document.querySelector('[data-widget-type="calculator"]').hasAttribute('data-widget-interacting')`);
      await sleep(300);
      const point = await evaluate(client, `(() => {const handle=document.querySelector('[data-widget-type="calculator"] [data-widget-resize=${q(direction)}]');const r=handle.getBoundingClientRect();for(const fraction of [0.5,0.2,0.8,0.05,0.95]){const x=r.x+r.width*(r.width>r.height?fraction:0.5),y=r.y+r.height*(r.height>r.width?fraction:0.5);const hit=document.elementFromPoint(x,y)?.closest('[data-widget-resize]')?.getAttribute('data-widget-resize');if(hit===${q(direction)})return {x,y,hit};}return {hit:null};})()`);
      if(point.hit !== direction) throw new Error('Resize handle is covered: ' + direction + ' hit ' + point.hit);
      await client.send('Input.dispatchMouseEvent', {type:'mouseMoved',x:point.x,y:point.y});
      await client.send('Input.dispatchMouseEvent', {type:'mousePressed',x:point.x,y:point.y,button:'left',clickCount:1});
      await client.send('Input.dispatchMouseEvent', {type:'mouseMoved',x:point.x+dx,y:point.y+dy,button:'left',buttons:1});
      await client.send('Input.dispatchMouseEvent', {type:'mouseReleased',x:point.x+dx,y:point.y+dy,button:'left',clickCount:1});
      await sleep(350);
    };
    for (const direction of ['n','ne','e','se','s','sw','w','nw']) {
      const before = await resizeBox();
      const dx = direction.includes('w') ? -12 : direction.includes('e') ? 12 : 0;
      const dy = direction.includes('n') ? -12 : direction.includes('s') ? 12 : 0;
      await dragResize(direction, dx, dy);
      await waitFor(client, 'widget grows from ' + direction, `(() => {const r=document.querySelector('[data-widget-type="calculator"]').getBoundingClientRect();return ${dx ? 'r.width > ' + (before.w+8) : 'Math.abs(r.width - ' + before.w + ') < 3'} && ${dy ? 'r.height > ' + (before.h+8) : 'Math.abs(r.height - ' + before.h + ') < 3'};})()`);
      const grown = await resizeBox();
      const anchorX = direction.includes('w') ? grown.x+grown.w : grown.x;
      const anchorY = direction.includes('n') ? grown.y+grown.h : grown.y;
      if(Math.abs(anchorX-(direction.includes('w') ? before.x+before.w : before.x)) > 3 || Math.abs(anchorY-(direction.includes('n') ? before.y+before.h : before.y)) > 3) throw new Error('Resize moves opposite edge: ' + direction);
      await dragResize(direction, -dx, -dy);
      console.log('Resize round trip', direction, {before, grown, shrunk:await resizeBox()});
      await waitFor(client, 'widget shrinks from ' + direction, `(() => {const r=document.querySelector('[data-widget-type="calculator"]').getBoundingClientRect();return Math.abs(r.width-${before.w})<3 && Math.abs(r.height-${before.h})<3 && !document.querySelector('[data-widget-type="calculator"]').hasAttribute('data-widget-interacting');})()`);
    }
    console.log('✓ Widget resizes from all four sides and all four corners; opposite edges remain anchored.');
    await auditMenu('calculator', 'Widget schließen');
    await openAuditWidget('compass', 'Geographie-Kompass');
    for(const zoom of [1,1.25,1.5]) {
      await evaluate(client, `document.documentElement.style.zoom=${q(String(zoom))}`);
      const overlap = await evaluate(client, `(() => {const a=document.querySelector('[data-compass-instrument]').getBoundingClientRect(),b=document.querySelector('[data-compass-explanation]').getBoundingClientRect();return Math.min(a.right,b.right)>Math.max(a.left,b.left)+1 && Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+1;})()`);
      if(overlap) throw new Error('Compass covers its explanation at zoom ' + zoom);
    }
    await evaluate(client, `document.documentElement.style.zoom='1'`);
    await clickButton(client, 'Üben', true);
    await waitFor(client, 'compass practice task', `document.querySelector('[data-compass-explanation]').textContent.includes('Stelle')`);
    await auditMenu('compass', 'Widget schließen');
    await openAuditWidget('qrcode', 'QR-Code & Link', 'QR-Code');
    await setInputByLabel(client, 'URL oder Text für den QR-Code', 'Aufgabe Regenbogen 3');
    await waitFor(client, 'readable QR preview', `document.querySelector('#qrcode-canvas-wrapper canvas')?.getBoundingClientRect().width >= 159`);
    await evaluate(client, `document.querySelector('#qrcode-zoom-btn').click()`);
    await waitFor(client, 'QR dialog has current content and no stale preset title', `Boolean(document.querySelector('#qrcode-lightbox-dialog')) && document.querySelector('#qrcode-lightbox-dialog').textContent.includes('Aufgabe Regenbogen 3') && !document.querySelector('#qrcode-lightbox-dialog h3').textContent.includes('Lernportal Anton')`);
    await evaluate(client, `document.querySelector('#qrcode-lightbox-close-btn').click()`);
    await clickButton(client, 'Meine Links', true);
    await auditMenu('qrcode', 'Minimieren');
    await openAuditWidget('qrcode', 'QR-Code & Link', 'QR-Code');
    if(await evaluate(client, `document.querySelector('[aria-label="QR-Code und Links"] button[aria-pressed=true]').textContent.trim()`) !== 'Meine Links') throw new Error('QR mode resets after restoring.');
    await auditMenu('qrcode', 'Widget schließen');
    for(const [type,search,label] of [['timer','Timer / Sanduhr','Timer / Sanduhr'],['timeline','Tagesablauf','Tagesablauf'],['fractionvisualizer','Bruch-Visualisierer','Bruch-Visualisierer'],['fractions','Bruch-Visualisierer · Vergleich','Bruch-Visualisierer · Vergleich'],['wheel','Glücksrad','Glücksrad']]) {
      await openAuditWidget(type,search,label);
      if(type === 'timer') {
        const setTimerTime = async (minutes,seconds) => {
          await evaluate(client, `(() => {const root=document.querySelector('[data-widget-type="timer"]');const own=Array.from(root.querySelectorAll('button')).find(b=>b.getClientRects().length && b.textContent.includes('Eigene Zeit'));if(own)own.click();else root.querySelector('[aria-label="Weitere Optionen"]').click();})()`);
          if(!await evaluate(client, `Boolean(document.querySelector('[aria-label="Timer-Minuten"]'))`)) {
            await waitFor(client,'timer quick menu',`Boolean(document.querySelector('[role="dialog"][aria-label="Timer-Schnellauswahl"]'))`);
            await clickButton(client,'Eigene Zeit eingeben',true);
          }
          await waitFor(client,'custom timer dialog',`Boolean(document.querySelector('[role="dialog"][aria-label="Eigene Timer-Zeit"]'))`);
          await setInputByLabel(client,'Timer-Minuten',minutes);
          await setInputByLabel(client,'Timer-Sekunden',seconds);
          await evaluate(client, `Array.from(document.querySelectorAll('[aria-label="Eigene Timer-Zeit"] button')).find(b=>b.textContent.includes('Übernehmen')).click()`);
          await waitFor(client,'custom timer accepted',`!document.querySelector('[aria-label="Timer-Minuten"]')`);
        };
        await setTimerTime('720','0');
        const maximumText=await evaluate(client,`document.querySelector('[data-widget-type="timer"] [data-widget-content]').textContent`);
        await evaluate(client,`document.querySelector('[data-widget-type="timer"] button[title="1 Minute hinzufügen"]').click()`);
        if(await evaluate(client,`document.querySelector('[data-widget-type="timer"] [data-widget-content]').textContent`) !== maximumText) throw new Error('Timer exceeds twelve hours via minute control.');
        await setTimerTime('0','30');
        if(!await evaluate(client,`document.querySelector('[data-widget-type="timer"] button[title="1 Minute abziehen"]').disabled`)) throw new Error('Ready timer allows subtracting its last minute.');
        await clickButton(client,'Start',true);await clickButton(client,'Pause',true);
        await waitFor(client,'paused timer before restore',`document.querySelector('[data-widget-type="timer"]').textContent.includes('Weiter')`);
      }
      const stateBefore = await evaluate(client, `document.querySelector('[data-widget-type=${q(type)}] [data-widget-content]').textContent`);
      await auditMenu(type,'Minimieren');
      await openAuditWidget(type,search,label);
      if(type !== 'timeline') {
        // Restoring a hidden widget triggers ResizeObserver and its responsive layout.
        // Require the complete original content after layout settles, not on the first frame.
        await waitFor(client, type + ' restores its complete state after resize',
          `document.querySelector('[data-widget-type=${q(type)}] [data-widget-content]').textContent === ${q(stateBefore)}`);
      }
      await auditMenu(type,'Widget schließen');
    }
    for(const [type,search] of [['stopwatch','Stoppuhr'],['trafficlight','Status-Ampel'],['todo','Aufgaben-Checkliste'],['links','Materialien & Links']]) {
      await openAuditWidget(type,search);
      const root = `[data-widget-type="${type}"] [data-widget-content]`;
      if(type === 'stopwatch') {
        await evaluate(client, `document.querySelector('[data-stopwatch-action="start"]').click()`);
        await sleep(350);
        await evaluate(client, `document.querySelector('[data-stopwatch-action="stop"]').click()`);
        await waitFor(client,'stopwatch paused',`document.querySelector('${root}').textContent.includes('Weiter')`);
      }
      if(type === 'trafficlight') {
        await evaluate(client, `Array.from(document.querySelectorAll('${root} button')).find(b=>b.textContent.trim()==='Lautstärke').click()`);
        await waitFor(client,'traffic light scale mode',`Array.from(document.querySelectorAll('${root} button')).some(b=>b.textContent.trim()==='Lautstärke' && b.getAttribute('aria-pressed')==='true')`);
      }
      if(type === 'todo') {
        for (const task of ['Synthetischer Schritt: Seite 24 lesen', 'Synthetischer Zusatz: Bild zeichnen']) {
          if (task.includes('Zusatz')) await clickSelector(client, `${root} [aria-label="Neue Aufgabe als Zusatzaufgabe"]`);
          await setInputByLabel(client, 'Neuer Aufgabenschritt', task);
          await clickSelector(client, `${root} [aria-label="Schritt zur Liste hinzufügen"]`);
          await waitFor(client, 'own task is added once', `document.querySelectorAll('${root} button[aria-label=${q('Aufgabe '+task+' als erledigt markieren')}]').length === 1`);
        }
        const originalTask = 'Synthetischer Zusatz: Bild zeichnen';
        const correctedTask = 'Synthetischer Zusatz: Zwei Bilder zeichnen';
        const originalCheckbox = `${root} button[aria-label=${q('Aufgabe '+originalTask+' als erledigt markieren')}]`;
        await clickSelector(client, originalCheckbox);
        await waitFor(client, 'own task completion is stored', `document.querySelector('${root} button[aria-label=${q('Aufgabe '+originalTask+' als offen markieren')}]')?.getAttribute('aria-pressed') === 'true'`);
        await clickSelector(client, '[data-widget-type="todo"] button[aria-label$="Einstellungen öffnen"]');
        await evaluate(client, `document.querySelector('${root} button[aria-label=${q('Aufgabe '+originalTask+' als offen markieren')}]').closest('.group').querySelector('button[title="Text korrigieren"]').click()`);
        await setInputByLabel(client, 'Aufgabentext bearbeiten', correctedTask);
        await clickSelector(client, `${root} [aria-label="Aufgabentext speichern"]`);
        await clickSelector(client, `${root} [aria-label="Aufgaben-Einstellungen schließen"]`);
        await waitFor(client, 'editing preserves completed task', `document.querySelector('${root} button[aria-label=${q('Aufgabe '+correctedTask+' als offen markieren')}]')?.getAttribute('aria-pressed') === 'true'`);
        const editedState = await evaluate(client, `document.querySelector('${root}').textContent`);
        await clickSelector(client, `${root} [aria-label="Neue Aufgabenliste anlegen"]`);
        await waitFor(client, 'reset requires confirmation', `document.querySelector('${root}').textContent.includes('Aktuelle Liste leeren?')`);
        await evaluate(client, `Array.from(document.querySelectorAll('${root} button')).find(b=>b.textContent.trim()==='Abbrechen').click()`);
        await waitFor(client, 'cancel reset preserves own tasks', `document.querySelector('${root}').textContent === ${q(editedState)}`);
        const addControlsFit = await evaluate(client, `(() => {const root=document.querySelector('${root}'),r=root.getBoundingClientRect();return Array.from(root.querySelectorAll('form input,form button')).every(e=>{const b=e.getBoundingClientRect();return b.height>=44 && b.bottom<=r.bottom+1 && b.left>=r.left && b.right<=r.right+1;});})()`);
        if (!addControlsFit) throw new Error('Task entry controls are clipped or smaller than 44px.');
      }
      if(type === 'links') {
        await waitFor(client,'link page navigation',`Boolean(document.querySelector('[aria-label="Linkseiten"]'))`);
        await evaluate(client,`document.querySelector('[aria-label="Nächste Linkseite"]').click()`);
        await waitFor(client,'second link page',`document.querySelector('[aria-label="Linkseiten"]').textContent.includes('Seite 2')`);
        const fits = await evaluate(client,`(() => {const root=document.querySelector('#widget-links-container'),r=root.getBoundingClientRect();return Array.from(root.querySelectorAll('[id^="link-open-btn"],[id^="link-qr-btn"],nav button')).every(b=>{const t=b.getBoundingClientRect();return t.height>=43 && t.bottom<=r.bottom+1 && t.top>=r.top;});})()`);
        if(!fits) throw new Error('Link actions or page controls are clipped.');
        const scroll = await evaluate(client,`(() => {const e=document.querySelector('#links-content-scrollable');return e.scrollHeight>e.clientHeight+2;})()`);
        if(scroll) throw new Error('Teaching links still require inner scrolling.');
      }
      const before = await evaluate(client, `document.querySelector('${root}').textContent`);
      await auditMenu(type,'Minimieren');
      await openAuditWidget(type,search);
      if(await evaluate(client, `document.querySelector('${root}').textContent`) !== before) throw new Error(type+' loses its state when restored.');
      await saveScreenshot(client,SCREENSHOT_PATH.replace(/\.png$/, '-widget-'+type+'.png'));
      await auditMenu(type,'Widget schließen');
    }
    await openAuditWidget('groups', 'Gruppen-Einteiler');
    await clickButton(client, 'Gruppen bilden', true);
    await waitFor(client, 'groups formed inside widget without automatic full screen', `Boolean(document.querySelector('[data-widget-type="groups"] [role="listitem"]')) && !document.querySelector('[role="dialog"][aria-label="Gruppen groß anzeigen"]')`);
    const groupState = await evaluate(client, `document.querySelector('[data-widget-type="groups"] [data-widget-content]').textContent`);
    await auditMenu('groups', 'Minimieren');
    await openAuditWidget('groups', 'Gruppen-Einteiler');
    await waitFor(client, 'group assignment survives minimize', `document.querySelector('[data-widget-type="groups"] [data-widget-content]').textContent === ${q(groupState)}`);
    await auditMenu('groups', 'Widget schließen');

    await openAuditWidget('wheel', 'Glücksrad');
    await evaluate(client, `document.querySelector('[data-widget-type="wheel"] button[aria-label="Glücksrad drehen"]').click()`);
    await waitFor(client, 'wheel finishes a real draw', `Boolean(document.querySelector('[data-widget-type="wheel"] [title="Klicken für nochmal drehen"]'))`, 30000);
    const winner = await evaluate(client, `document.querySelector('[data-widget-type="wheel"] [title="Klicken für nochmal drehen"]').textContent`);
    await auditMenu('wheel', 'Minimieren');
    await openAuditWidget('wheel', 'Glücksrad');
    await waitFor(client, 'wheel winner survives minimize', `document.querySelector('[data-widget-type="wheel"] [title="Klicken für nochmal drehen"]')?.textContent === ${q(winner)}`);
    await auditMenu('wheel', 'Widget schließen');

    await openAuditWidget('starsreview', 'Sterne der Woche');
    if (await evaluate(client, `Boolean(document.querySelector('[data-stars-student]'))`)) throw new Error('Star rankings are revealed before consent.');
    await evaluate(client, `document.querySelector('[data-widget-type="starsreview"] button[aria-label$="Einstellungen öffnen"]').click()`);
    await waitFor(client, 'star ranking settings', `Boolean(document.querySelector('[aria-label="Sterne-Auswertung konfigurieren"]'))`);
    await clickButton(client, 'Alle Kinder', true);
    await clickButton(client, 'Fertig', true);
    await clickButton(client, '⭐ Ergebnisse jetzt zeigen', true);
    await waitFor(client, 'star results and pages', `Boolean(document.querySelector('[data-stars-results] [data-stars-student]'))`);
    const expectedStars = await evaluate(client, `Number(document.querySelector('[data-stars-results] > p').textContent.match(/(\\d+) Kinder/)[1])`);
    const starChildren = new Set();
    for (let page = 0; page < expectedStars; page++) {
      const layout = await waitFor(client, 'star rows and page controls fit without inner scrolling', `(() => {
        const root=document.querySelector('[data-stars-results]'),r=root.getBoundingClientRect();
        const rows=Array.from(root.querySelectorAll('[data-stars-student]'));
        const controls=Array.from(root.querySelectorAll('nav button'));
        const fits=root.scrollHeight<=root.clientHeight+2 && rows.length>0 && [...rows,...controls].every(e=>{const b=e.getBoundingClientRect();return b.top>=r.top && b.bottom<=r.bottom+1 && b.height>=44;});
        return fits && rows.map(e=>e.dataset.starsStudent);
      })()`);
      layout.forEach(id => starChildren.add(id));
      const hasNext = await evaluate(client, `Boolean(document.querySelector('[aria-label="Nächste Sterneseite"]:not(:disabled)'))`);
      if (!hasNext) break;
      const beforePage=await evaluate(client, `document.querySelector('[aria-label="Sterneseiten"]').textContent`);
      await clickSelector(client, '[aria-label="Nächste Sterneseite"]');
      await waitFor(client, 'next star page selected', `document.querySelector('[aria-label="Sterneseiten"]').textContent !== ${q(beforePage)}`);
    }
    if (starChildren.size !== expectedStars) throw new Error('Star pages omit or duplicate children: '+starChildren.size+'/'+expectedStars);
    const starsState=await evaluate(client, `Array.from(document.querySelectorAll('[data-stars-student]')).map(e=>e.dataset.starsStudent).join(',')`);
    await auditMenu('starsreview', 'Minimieren');
    await openAuditWidget('starsreview', 'Sterne der Woche');
    await waitFor(client, 'star page survives minimize', `Array.from(document.querySelectorAll('[data-stars-student]')).map(e=>e.dataset.starsStudent).join(',') === ${q(starsState)}`);
    await auditMenu('starsreview', 'Widget schließen');
    await openAuditWidget('kidattendance', 'Ich bin da!', 'Ich bin da!');
    const checkInRoot = `Array.from(document.querySelectorAll('[data-widget-type="kidattendance"]')).find(el=>el.getClientRects().length)`;
    const checkInContent = `${checkInRoot}?.querySelector('[data-widget-content]')?.textContent`;
    const checkInBefore = await evaluate(client, checkInContent);
    const statsTabs = `${checkInRoot}?.querySelector('[data-presence-behavior-stats] [role="tablist"]')`;
    for (let attempt = 0; attempt < 2; attempt++) {
      await evaluate(client, `${checkInRoot}.querySelector('button[aria-label="Ich bin da Statistik öffnen"]').click()`);
      await waitFor(client, 'check-in statistics opens with recent weeks', `${statsTabs}?.querySelector('[aria-selected="true"]')?.textContent === 'Letzte 6 Wochen'`);
      await evaluate(client, `Array.from(${statsTabs}.querySelectorAll('[role="tab"]')).find(b=>b.textContent==='Gesamtes Schuljahr').click()`);
      await waitFor(client, 'check-in statistics selects school year', `${statsTabs}?.querySelector('[aria-selected="true"]')?.textContent === 'Gesamtes Schuljahr'`);
      if (attempt === 0) {
        await saveScreenshot(client, SCREENSHOT_PATH.replace(/\.png$/, '-widget-checkin-statistics.png'));
        await auditMenu('kidattendance', 'Minimieren');
        await openAuditWidget('kidattendance', 'Ich bin da!', 'Ich bin da!');
        await waitFor(client, 'check-in school year survives minimize and restore', `${statsTabs}?.querySelector('[aria-selected="true"]')?.textContent === 'Gesamtes Schuljahr'`);
      }
      await evaluate(client, `Array.from(${statsTabs}.querySelectorAll('[role="tab"]')).find(b=>b.textContent==='Letzte 6 Wochen').click()`);
      await waitFor(client, 'check-in statistics returns to recent weeks', `${statsTabs}?.querySelector('[aria-selected="true"]')?.textContent === 'Letzte 6 Wochen'`);
      await evaluate(client, `Array.from(${checkInRoot}.querySelectorAll('button')).find(b=>b.textContent.trim()==='Zur Anwesenheit zurück').click()`);
      await waitFor(client, 'check-in attendance survives statistics round trip', `!${checkInRoot}?.querySelector('[data-presence-behavior-stats]') && ${checkInContent} === ${q(checkInBefore)}`);
    }
    await auditMenu('kidattendance', 'Widget schließen');
    console.log('✓ Check-in widget: statistics opens twice, recent/year switches, selected year survives minimize, attendance remains unchanged.');
    await openPage(client, 'Wochenplan');
    await waitFor(client, 'weekly planner week selector', `Boolean(document.querySelector('button[title="Woche wählen"]'))`);
    const currentWidgetWeek = await evaluate(client, `Number(document.querySelector('button[title="Woche wählen"]').textContent.match(/KW\\s+(\\d+)/)[1])`);
    const ownHomework = 'Synthetische Widget-Hausübung: Silben lesen';
    await clickSelector(client, 'button[aria-label^="Hausübung für Montag"]');
    await waitFor(client, 'widget homework day editor', `Boolean(document.querySelector('[role="dialog"][aria-label^="Hausübungen Montag"]'))`);
    await setInputByPlaceholder(client, 'z. B. Deutsch', 'Deutsch');
    await setInputByLabel(client, 'Welche Hausübung?', ownHomework);
    const homeworkIssueDate = await evaluate(client, `document.querySelector('[role="dialog"][aria-label^="Hausübungen Montag"] input[type="date"]').min`);
    await setInputByLabel(client, 'Bis wann?', homeworkIssueDate);
    await clickButton(client, 'Hausübung speichern', true);
    await waitFor(client, 'own homework saved for current week', `Array.from(document.querySelectorAll('[role="dialog"][aria-label^="Hausübungen Montag"] [aria-label="Eingetragene Hausübungen"] article')).some(article=>article.textContent.includes(${q(ownHomework)}))`);
    await clickSelector(client, '[aria-label="Hausübungen schließen"]');
    await clickSelector(client, 'button[aria-label="Nächste Woche"]');
    await waitFor(client, 'teacher planner intentionally moved ahead', `Number(document.querySelector('button[title="Woche wählen"]')?.textContent.match(/KW\\s+(\\d+)/)[1]) !== ${currentWidgetWeek}`);
    await clickSidebar(client, 'Lehrercockpit');
    for (const [type, search, boardSelector, nextLabel, todayLabel] of [
      ['homework', 'Hausübungen', '.classroom-homework-widget', 'Nächste HÜ-Woche', null],
      ['classweeklyplan', 'Wochenplan der Kinder', '.classroom-weekly-plan', 'Nächste Woche', 'Aktuelle Woche anzeigen'],
    ]) {
      await openAuditWidget(type, search);
      const board = `[data-widget-type="${type}"] ${boardSelector}`;
      const weekExpression = `Number(document.querySelector('${board}')?.querySelector('p')?.textContent.match(/KW\\s+(\\d+)/)?.[1])`;
      await waitFor(client, type+' starts with actual week despite teacher planning ahead', `${weekExpression} === ${currentWidgetWeek} && document.querySelector('${board}').textContent.includes(${q(ownHomework)})`);
      await clickSelector(client, `${board} [aria-label="${nextLabel}"]`);
      await waitFor(client, type+' permits deliberate week navigation', `${weekExpression} !== ${currentWidgetWeek} && !document.querySelector('${board}').textContent.includes(${q(ownHomework)})`);
      const navigatedWeek = await evaluate(client, weekExpression);
      await auditMenu(type, 'Minimieren');
      await openAuditWidget(type, search);
      await waitFor(client, type+' chosen week survives minimize', `${weekExpression} === ${navigatedWeek}`);
      await evaluate(client, `Array.from(document.querySelectorAll('${board} button')).find(b=>${todayLabel ? `b.getAttribute('aria-label') === ${q(todayLabel)}` : `b.textContent.trim() === 'Heute'`}).click()`);
      await waitFor(client, type+' returns to current homework', `${weekExpression} === ${currentWidgetWeek} && document.querySelector('${board}').textContent.includes(${q(ownHomework)})`);
      await saveScreenshot(client, SCREENSHOT_PATH.replace(/\.png$/, '-widget-'+type+'.png'));
      await auditMenu(type, 'Widget schließen');
    }
    console.log('✓ Homework/children weekly plan: current week despite teacher planning ahead, own homework, navigation and restore.');
    console.log('✓ Widget block: groups stay in widget, real wheel winner restored, all star children reachable without inner scrolling.');
    console.log('✓ Widget block: 12 widgets checked; stopwatch pause and traffic light mode survive restore.');
    console.log('✓ Audit regression: calculator keys/result/restore, compass layout at 100/125/150%, QR alias/readability/title/mode restore');
    await openPage(client, 'Klasse');
    await waitFor(client, 'class overview visible', `Boolean(document.querySelector('[data-class-hub] h1'))`);
    for (const width of [360, 820, 1360]) {
      await client.send('Emulation.setDeviceMetricsOverride', {width, height:1000, deviceScaleFactor:1, mobile:false});
      await sleep(350);
      const layout = await evaluate(client, `(() => {const hub=document.querySelector('[data-class-hub]');const cards=Array.from(hub.querySelectorAll('section button'));return {overflow:document.documentElement.scrollWidth>innerWidth+3,cardCount:cards.length,smallTarget:cards.some(card=>card.getBoundingClientRect().height<44),heading:hub.querySelector('h1').textContent.trim()};})()`);
      if(layout.overflow || layout.smallTarget || layout.cardCount < 6 || !layout.heading) throw new Error('Class overview layout failed at '+width+': '+JSON.stringify(layout));
    }
    await saveScreenshot(client);
    await evaluate(client, `document.querySelector('[data-class-hub] header button').click()`);
    await waitFor(client, 'class attendance shortcut opens attendance', `Array.from(document.querySelectorAll('button[aria-current="page"]')).some(button=>button.textContent.includes('Anwesenheit'))`);
    console.log('✓ Class overview: responsive layout, usable card targets and attendance shortcut at 360/820/1360px.');
    await openPage(client, 'Heute');
    await waitFor(client, 'daily overview visible', `Boolean(document.querySelector('[data-dashboard-overview] h1'))`);
    for (const width of [360, 820, 1360]) {
      await client.send('Emulation.setDeviceMetricsOverride', {width, height:1000, deviceScaleFactor:1, mobile:false});
      await sleep(350);
      const layout = await evaluate(client, `(() => {const hub=document.querySelector('[data-dashboard-overview]');const header=hub.querySelector('header');return {overflow:document.documentElement.scrollWidth>innerWidth+3,heading:hub.querySelector('h1').textContent.trim(),hasDayLabel:/Heute|Morgen|Vorschau/.test(header.textContent),smallTarget:Array.from(header.querySelectorAll('button')).some(button=>button.getBoundingClientRect().height<44)};})()`);
      if(layout.overflow || layout.smallTarget || !layout.heading || !layout.hasDayLabel) throw new Error('Daily overview layout failed at '+width+': '+JSON.stringify(layout));
      await saveScreenshot(client);
    }
    console.log('✓ Daily overview: responsive layout, clear day label and usable header targets at 360/820/1360px.');
    for (const [page, selector, key] of [
      ['Leistungen', '[data-performance-hub]', 'performance'],
      ['Notenmappe', '[data-gradebook]', 'gradebook'],
    ]) {
      await client.send('Emulation.setDeviceMetricsOverride', {width:1360,height:1000,deviceScaleFactor:1,mobile:false});
      await openPage(client, page);
      await waitFor(client, page+' visible', `Boolean(document.querySelector('${selector} h1'))`);
      for (const width of [390,820,1360]) {
        await client.send('Emulation.setDeviceMetricsOverride', {width,height:1000,deviceScaleFactor:1,mobile:false});
        await sleep(350);
        if(key === 'gradebook' && width === 390) {
          await evaluate(client, `Array.from(document.querySelectorAll('[data-gradebook-actions] button')).find(b=>b.textContent.trim()==='Mehr').click()`);
          await sleep(200);
          const available = await evaluate(client, `['Notenrechner','Gewichtung','Auswertungen','Leistungsfeedback'].every(label=>Array.from(document.querySelectorAll('[data-gradebook-actions] button')).some(b=>b.textContent.trim().endsWith(label)&&b.getBoundingClientRect().width>0))`);
          if(!available) throw new Error('Gradebook mobile tools missing.');
          await client.send('Input.dispatchKeyEvent', {type:'keyDown', key:'Escape', code:'Escape'});
          await client.send('Input.dispatchKeyEvent', {type:'keyUp', key:'Escape', code:'Escape'});
          await sleep(200);
        }
        const layout = await evaluate(client, `(() => {const node=document.querySelector('${selector}');return {overflow:document.documentElement.scrollWidth>innerWidth+3,heading:node.querySelector('h1')?.textContent.trim(),smallTargets:Array.from(node.querySelectorAll('${key === 'gradebook' ? '[data-gradebook-header] button, [data-gradebook-actions] button' : 'section button'}')).filter(b=>b.getBoundingClientRect().width>0&&b.getBoundingClientRect().height<43).map(b=>b.textContent.trim())};})()`);
        if(layout.overflow || !layout.heading || layout.smallTargets.length) throw new Error(page+' layout at '+width+': '+JSON.stringify(layout));
        await saveScreenshot(client,SCREENSHOT_PATH.replace(/\.png$/, '-'+key+'-'+width+'.png'));
      }
      if(key === 'gradebook') {
        await client.send('Emulation.setDeviceMetricsOverride', {width:1360,height:1000,deviceScaleFactor:1,mobile:false});
        await evaluate(client, `Array.from(document.querySelectorAll('[data-gradebook-header] button')).find(b=>b.textContent.trim()==='Notenübersicht').click()`);
        await waitFor(client, 'embedded grade overview', `Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='Zur Notenmappe')`);
        await clickButton(client,'Zur Notenmappe');
        await waitFor(client, 'back to gradebook subject', `Boolean(document.querySelector('#gradebook-active-subject'))`);
        await evaluate(client, `(() => {const s=document.querySelector('#gradebook-active-subject');s.value='Mathematik';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
        await clickButton(client, 'Gewichtung', true);
        await clickButton(client, 'Punkte');
        await waitFor(client, 'point percentage option available', `Boolean(Array.from(document.querySelectorAll('label')).find(l=>l.textContent.includes('Prozentwerte bei Punkten anzeigen'))?.querySelector('input[type=checkbox]'))`);
        await clickButton(client, 'Speichern', true);
        for(const [typ,points,max] of [['sa','18','24'],['lzk','7','20']]) {
          await clickSelector(client, `input[data-col="${typ}-0"]`);
          await evaluate(client, `(() => {const input=document.querySelector('input[data-col="${typ}-0"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${q(points)});input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));input.blur();})()`);
          await sleep(650);
          const headerSelector=typ==='sa'?'button[aria-label*=\"Schularbeiten 1\"]':'button[aria-label*=\"Lernzielkontrollen 1\"]';
          await clickSelector(client, headerSelector);
          await setInputByLabel(client, 'Maximal erreichbare Punkte', max);
          await clickSelector(client, '#btn-save-assessment-modal');
        }
        const percentageFor=typ=>`document.querySelector('input[data-col="${typ}-0"]')?.closest('td')?.querySelector('[data-points-percent]')?.textContent.trim()`;
        await waitFor(client, 'SA and LZK calculate against their own maximum', percentageFor('sa')+` === '75 %' && `+percentageFor('lzk')+` === '35 %'`);
        await saveScreenshot(client,SCREENSHOT_PATH.replace(/\.png$/, '-points-percent.png'));
        await clickButton(client, 'Gewichtung', true);
        await evaluate(client, `Array.from(document.querySelectorAll('label')).find(l=>l.textContent.includes('Prozentwerte bei Punkten anzeigen')).querySelector('input').click()`);
        await clickButton(client, 'Speichern', true);
        await waitFor(client, 'percentage labels can be hidden', `!document.querySelector('[data-points-percent]')`);
        if(await evaluate(client, `document.querySelector('input[data-col="sa-0"]').value`) !== '18') throw new Error('Display setting changed stored points.');
        await reloadAndUnlock(client);
        await openPage(client,'Notenmappe');
        await waitFor(client, 'gradebook after reload', `Boolean(document.querySelector('#gradebook-active-subject'))`);
        await evaluate(client, `(() => {const s=document.querySelector('#gradebook-active-subject');s.value='Mathematik';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
        await waitFor(client, 'hidden percentage preference persisted', `document.querySelector('input[data-col="sa-0"]')?.value === '18' && !document.querySelector('[data-points-percent]')`);
        await clickButton(client, 'Gewichtung', true);
        await evaluate(client, `Array.from(document.querySelectorAll('label')).find(l=>l.textContent.includes('Prozentwerte bei Punkten anzeigen')).querySelector('input').click()`);
        await clickButton(client, 'Speichern', true);
        await waitFor(client, 'percentages return without reentering points', percentageFor('sa')+` === '75 %' && `+percentageFor('lzk')+` === '35 %'`);
        console.log('✓ Points: SA/LZK percentages, different maxima, hide/show and encrypted reload preserve points.');
        await clickButton(client, 'Mitarbeit', true);
        await waitFor(client, 'participation journal overview', `Boolean(document.querySelector('[aria-label="Zeitraum der Mitarbeit"]')) && Boolean(document.querySelector('input[data-quick-entry="mitarbeit"]'))`);
        const firstParticipation = await evaluate(client, `(() => {const input=document.querySelector('input[data-quick-entry="mitarbeit"]');return {label:input.getAttribute('aria-label'),value:Number(input.value||0)};})()`);
        await evaluate(client, `document.querySelector('button[aria-label$=" erhöhen"]').click()`);
        await waitFor(client, 'gradebook plus updates journal and total', `Number(document.querySelector('input[data-quick-entry="mitarbeit"]').value) === ${firstParticipation.value+1}`);
        await evaluate(client, `(() => {const s=document.querySelector('[aria-label="Zeitraum der Mitarbeit"]');s.value='week';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
        await waitFor(client, 'direct gradebook plus appears in weekly chart', `document.querySelector('[data-participation-period-total]')?.textContent === '1 Fachpunkte'`);
        await evaluate(client, `document.querySelector('button[aria-label$=" verringern"]').click()`);
        await waitFor(client, 'gradebook minus corrects journal and total', `Number(document.querySelector('input[data-quick-entry="mitarbeit"]').value) === ${firstParticipation.value} && document.querySelector('[data-participation-period-total]')?.textContent === '0 Fachpunkte'`);
        await saveScreenshot(client,SCREENSHOT_PATH.replace(/\.png$/, '-participation-period.png'));
        await reloadAndUnlock(client);
        await openPage(client,'Notenmappe');
        await waitFor(client, 'gradebook restored for participation', `Boolean(document.querySelector('#gradebook-active-subject'))`);
        await evaluate(client, `(() => {const s=document.querySelector('#gradebook-active-subject');s.value='Mathematik';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
        await clickButton(client, 'Mitarbeit', true);
        await waitFor(client, 'participation counter survives encrypted reload', `Number(document.querySelector('input[data-quick-entry="mitarbeit"]')?.value || 0) === ${firstParticipation.value} && Boolean(document.querySelector('[data-participation-period-total]'))`);
        console.log('✓ Direct gradebook participation plus/minus updates weekly chart and survives encrypted reload.');

      }
      console.log('✓ '+page+': responsive controls and mobile tool access at 390/820/1360px.');
    }


  } catch (error) {
    await saveScreenshot(client).catch(() => {});
    throw error;
  } finally { client.close(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
