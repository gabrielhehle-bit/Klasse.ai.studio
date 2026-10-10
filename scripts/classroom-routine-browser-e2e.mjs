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
  // Keep the attendance and duty fixtures on the same school day on weekend CI runs.
  // Shift the browser calendar only; elapsed time and native timers still advance.
  await client.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
    const NativeDate = Date, now = new NativeDate(), schoolDay = new NativeDate(now);
    const weekday = now.getDay();
    if (weekday !== 0 && weekday !== 6) return;
    schoolDay.setDate(now.getDate() - (weekday === 6 ? 1 : 2));
    const offset = schoolDay.getTime() - now.getTime();
    window.Date = class extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [NativeDate.now() + offset])); }
      static now() { return NativeDate.now() + offset; }
    };
  })()` });
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
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Browser evaluation failed.');
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
    const readLongWidgetText = async (type, text, title) => {
      const trigger = `[data-widget-type="${type}"] [data-widget-text-reader="true"]`;
      await waitFor(client, 'long '+title+' has explicit reading action', `Boolean(document.querySelector('${trigger}'))`);
      await clickSelector(client, trigger);
      await waitFor(client, 'complete '+title+' opens in modal', `document.querySelector('dialog[open] [data-widget-full-text]')?.textContent === ${q(text)}`);
      // Smartphone quick mode intentionally leaves the cockpit below 768px.
      // Exercise a 390px reader within a supported tablet viewport instead.
      for (const [width, readerWidth] of [[820, 390], [820, null], [1366, null]]) {
        await client.send('Emulation.setDeviceMetricsOverride', {width,height:768,deviceScaleFactor:1,mobile:false});
        await evaluate(client, `document.querySelector('dialog[open]').style.width = ${q(readerWidth ? readerWidth+'px' : '')}`);
        await sleep(150);
        const fits = await evaluate(client, `(() => {
          const dialog=document.querySelector('dialog[open]'),body=dialog.querySelector('[data-widget-full-text]'),close=dialog.querySelector('button');
          const r=dialog.getBoundingClientRect(),b=close.getBoundingClientRect();body.scrollTop=body.scrollHeight;
          const range=document.createRange();range.setStart(body.firstChild,body.firstChild.length-12);range.setEnd(body.firstChild,body.firstChild.length);
          const end=range.getBoundingClientRect(),content=body.getBoundingClientRect();
          return (${readerWidth ? 'Math.abs(r.width-390)<1' : 'true'}) && r.left>=0 && r.right<=innerWidth && r.bottom<=innerHeight && b.height>=44 && b.bottom<=r.bottom && body.scrollWidth<=body.clientWidth+1 && end.top>=content.top && end.bottom<=content.bottom+1;
        })()`);
        if (!fits) throw new Error(title+' full text or closing action is clipped at '+width+'px.');
      }
      await client.send('Input.dispatchKeyEvent', {type:'keyDown',key:'Escape',code:'Escape'});
      await client.send('Input.dispatchKeyEvent', {type:'keyUp',key:'Escape',code:'Escape'});
      await waitFor(client, 'reading closes and returns keyboard focus', `!document.querySelector('dialog[open]') && document.activeElement?.matches('${trigger}')`);
      await sleep(250);
    };
    const auditDutyOverview = async (count, suffix) => {
      await waitFor(client,'every duty visible together without pages or scrolling',`(() => {
        const body=document.querySelector('#dienste-content-scrollable'),r=body?.getBoundingClientRect(),cards=Array.from(document.querySelectorAll('[data-dienst-overview]'));
        return cards.length===${count} && !document.querySelector('[aria-label="Klassendienste-Seiten"]') && body.scrollHeight<=body.clientHeight+1 && body.scrollWidth<=body.clientWidth+1 && cards.every(card=>{
          const c=card.getBoundingClientRect();return c.height>=44 && c.left>=r.left && c.right<=r.right+1 && c.top>=r.top && c.bottom<=r.bottom+1 && Array.from(card.querySelectorAll('[data-dienst-overview-title],[data-dienst-overview-student]')).every(text=>{const t=text.getBoundingClientRect();return t.left>=c.left && t.right<=c.right+1 && t.bottom<=c.bottom && parseFloat(getComputedStyle(text).fontSize)>=14;});
        });
      })()`);
      await saveScreenshot(client,SCREENSHOT_PATH.replace(/\.png$/, '-duty-overview'+suffix+'.png'));
    };
    await openAuditWidget('dienste','Klassendienste');
    if (await evaluate(client,"Boolean(document.querySelector('#dienste-empty-state'))")) await clickButton(client,'Dienste einrichten',true);
    await auditDutyOverview(8,'');
    const overviewDuties=await evaluate(client,"Array.from(document.querySelectorAll('[data-dienst-overview]')).map(e=>e.dataset.dienstOverview)");
    await clickSelector(client,'[data-dienst-overview]');
    await waitFor(client,'empty overview card opens assignment',"Boolean(document.querySelector('dialog[open][aria-label=\"Kinder zuordnen\"]'))");
    await clickButton(client,'Schließen ✕',true);
    await waitFor(client,'closing returns to overview card',"document.activeElement.matches('[data-dienst-overview]')");
    if (await evaluate(client,"Boolean(document.querySelector('button[aria-label=\"Klassendienste bearbeiten\"]'))")) await clickSelector(client,'button[aria-label="Klassendienste bearbeiten"]');
    if (await evaluate(client,"Boolean(document.querySelector('#dienste-empty-state'))")) await clickButton(client,'Dienste einrichten',true);
    const firstDienst = await evaluate(client,"document.querySelector('#dienste-content-scrollable [id^=dienst-item-]').id");
    await clickSelector(client,'#'+firstDienst+' button[title="Kinder zuordnen"]');
    const drawer='#'+firstDienst.replace('dienst-item-','dienst-assign-drawer-');
    await waitFor(client,'duty assignment roster available',"document.querySelectorAll("+q(drawer+' button[aria-pressed]')+").length >= 2");
    const assignmentDialog='dialog[open][aria-label="Kinder zuordnen"]';
    const assignmentTrigger='#'+firstDienst+' button[title="Kinder zuordnen"]';
    const auditDutyAssignment=async suffix => {
      await waitFor(client,'assignment opens outside the duty card',"Boolean(document.querySelector("+q(assignmentDialog)+")) && !document.querySelector("+q('#'+firstDienst)+").contains(document.querySelector("+q(assignmentDialog)+"))");
      for(const [width,dialogWidth] of [[820,390],[820,null],[1366,null]]){
        await client.send('Emulation.setDeviceMetricsOverride',{width,height:768,deviceScaleFactor:1,mobile:false});
        await evaluate(client,"document.querySelector("+q(assignmentDialog)+").style.width = "+q(dialogWidth ? dialogWidth+'px' : ''));
        await sleep(150);
        const fits=await evaluate(client,"(() => {const d=document.querySelector("+q(assignmentDialog)+"),r=d.getBoundingClientRect(),body=d.querySelector('[data-dienst-assignment-list]'),header=d.querySelector('header'),close=header.querySelector('button').getBoundingClientRect(),search=header.querySelector('input').getBoundingClientRect(),buttons=Array.from(body.querySelectorAll('[data-dienst-assign-student]'));buttons.at(-1).scrollIntoView({block:'end'});const last=buttons.at(-1).getBoundingClientRect(),b=body.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth && r.top>=0 && r.bottom<=innerHeight && close.height>=44 && close.top>=r.top && close.bottom<=r.bottom && search.height>=44 && search.bottom<=b.top+1 && body.scrollWidth<=body.clientWidth+1 && last.top>=b.top && last.bottom<=b.bottom+1 && buttons.every(button=>{const t=button.getBoundingClientRect(),name=button.querySelector('span').getBoundingClientRect();return t.height>=44 && name.width>=100 && t.left>=r.left && t.right<=r.right;});})()");
        if(!fits) throw new Error('Duty assignment clips names, search or touch controls at '+width+'px.');
        if(dialogWidth) await saveScreenshot(client,SCREENSHOT_PATH.replace(/\.png$/, '-duty-assignment-narrow'+suffix+'.png'));
      }
      await evaluate(client,"document.querySelector("+q(assignmentDialog+' [data-dienst-assignment-list]')+").scrollTop=0");
      await saveScreenshot(client,SCREENSHOT_PATH.replace(/\.png$/, '-duty-assignment'+suffix+'.png'));
    };
    await auditDutyAssignment('');
    while(await evaluate(client,"Boolean(document.querySelector("+q(drawer+' button[aria-pressed="true"]')+"))")) await clickSelector(client,drawer+' button[aria-pressed="true"]');
    const searchCandidate=await evaluate(client,"(() => {const button=Array.from(document.querySelectorAll("+q(drawer+' [data-dienst-assign-student]')+")).find(b=>!b.textContent.includes('fehlt'));return {id:button.dataset.dienstAssignStudent,name:button.querySelector('span').textContent};})()");
    await setInputByLabel(client,'Dienstkinder suchen','  '+searchCandidate.name.toUpperCase()+'  ');
    await waitFor(client,'search finds child regardless of case and surrounding spaces',"document.querySelectorAll("+q(drawer+' [data-dienst-assign-student]')+").length===1 && document.querySelector("+q(drawer+' [data-dienst-assign-student]')+").dataset.dienstAssignStudent === "+q(searchCandidate.id));
    await clickSelector(client,drawer+' [data-dienst-assign-student='+q(searchCandidate.id)+']');
    await waitFor(client,'filtered child selection is visibly retained',"document.querySelector("+q(drawer+' [data-dienst-assign-student]')+").getAttribute('aria-pressed')==='true'");
    await setInputByLabel(client,'Dienstkinder suchen','KeinTestkindMitDiesemNamen');
    await waitFor(client,'empty search gives explicit feedback',"document.querySelector("+q(drawer+' [role="status"]')+")?.textContent === 'Keine Kinder gefunden.' && document.querySelector("+q(drawer+' header')+").textContent.includes('1 Kind zugeteilt')");
    await setInputByLabel(client,'Dienstkinder suchen','');
    await waitFor(client,'clearing search keeps selected child',"document.querySelectorAll("+q(drawer+' [data-dienst-assign-student]')+").length>=12 && document.querySelector("+q(drawer+' [data-dienst-assign-student='+q(searchCandidate.id)+']')+").getAttribute('aria-pressed')==='true'");
    await clickSelector(client,drawer+' [data-dienst-assign-student='+q(searchCandidate.id)+']');
    await setInputByLabel(client,'Dienstkinder suchen',searchCandidate.name);
    await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
    await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
    await waitFor(client,'closing assignment returns keyboard focus',"!document.querySelector("+q(assignmentDialog.replace('[open]',''))+") && document.activeElement.matches("+q(assignmentTrigger)+")");
    await clickSelector(client,assignmentTrigger);
    await waitFor(client,'reopening assignment resets search and keeps empty selection',"document.querySelector("+q(drawer+' input')+").value==='' && document.querySelectorAll("+q(drawer+' [data-dienst-assign-student]')+").length>=12 && !document.querySelector("+q(drawer+' [aria-pressed="true"]')+")");
    const absentDienstStudents=await evaluate(client,"Array.from(document.querySelectorAll("+q(drawer+' button[data-dienst-assign-student]')+")).filter(b=>b.textContent.includes('fehlt')).map(b=>b.dataset.dienstAssignStudent)");
    const dienstRosterCount=await evaluate(client,"document.querySelectorAll("+q(drawer+' button[data-dienst-assign-student]')+").length");
    if(!absentDienstStudents.length) throw new Error('Substitution fixture needs the excused absence created through Attendance.');
    const selectedChildren=await evaluate(client,"Array.from(document.querySelectorAll("+q(drawer+' button[aria-pressed]')+")).sort((a,b)=>Number(b.textContent.includes('fehlt'))-Number(a.textContent.includes('fehlt'))).slice(0,2).map(b=>b.getAttribute('aria-label'))");
    for (const label of selectedChildren) await clickSelector(client,drawer+' button[aria-label='+q(label)+']');
    await clickButton(client,'Schließen ✕',true);
    const assignedState="JSON.stringify(Array.from(document.querySelectorAll("+q('#'+firstDienst+' [data-dienst-student]')+")).map(e=>[e.dataset.dienstStudent,e.dataset.dienstSubstitute||null]))";
    await waitFor(client,'two children assigned to duty',assignedState+".length > 2 && document.querySelectorAll("+q('#'+firstDienst+' [data-dienst-student]')+").length === 2");
    const dutyState=await evaluate(client,assignedState);
    await auditMenu('dienste','Minimieren');
    await openAuditWidget('dienste','Klassendienste');
    if (await evaluate(client,"Boolean(document.querySelector('button[aria-label=\"Klassendienste bearbeiten\"]'))")) await clickSelector(client,'button[aria-label="Klassendienste bearbeiten"]');
    await waitFor(client,'duty assignments survive restore',assignedState+" === "+q(dutyState));
    const longDienstTitle='Synthetischer Dienst '+('a'.repeat(59));
    await clickSelector(client,'#'+firstDienst+' button[title="Dienst umbenennen"]');
    await setInputByLabel(client,'Diensttitel bearbeiten',longDienstTitle);
    await clickSelector(client,'#'+firstDienst+' button[title="Speichern"]');
    await waitFor(client,'long duty title saved',"document.querySelector("+q('#'+firstDienst+' [data-widget-text-preview]')+").textContent === "+q(longDienstTitle));
    // Restoring the widget animates its scale; measure the settled touch targets.
    await waitFor(client,'duty title reading action and controls fit after restore',"(() => {const root=document.querySelector("+q('#'+firstDienst)+"),r=root.getBoundingClientRect(),reader=root.querySelector('[data-widget-text-preview]').closest('button');return reader.getBoundingClientRect().width>=100 && Array.from(root.querySelectorAll('button[title=\"Kinder zuordnen\"],button[title=\"Dienst umbenennen\"],button[title=\"Dienst löschen\"]')).every(b=>{const t=b.getBoundingClientRect();return t.height>=44 && t.left>=r.left && t.right<=r.right+1;});})()");
    const dutyFits="(() => {const root=document.querySelector('#widget-dienste-container'),body=document.querySelector('#dienste-content-scrollable'),b=body.getBoundingClientRect(),r=root.getBoundingClientRect(),pages=root.querySelector('[aria-label=\"Klassendienste-Seiten\"]'),p=pages?.getBoundingClientRect(),controls=Array.from(body.querySelectorAll('button'));return body.scrollHeight<=body.clientHeight+1 && body.scrollWidth<=body.clientWidth+1 && controls.every(control=>{const c=control.getBoundingClientRect();return c.height>=44 && c.left>=b.left && c.right<=b.right+1 && c.top>=b.top && c.bottom<=b.bottom+1;}) && (!pages || (!body.contains(pages) && p.top>=b.bottom-1 && p.bottom<=r.bottom+1 && Array.from(pages.querySelectorAll('button')).every(button=>button.getBoundingClientRect().height>=44)));})()";
    const assertDutyFits=async () => {
      try { await waitFor(client,'duty content and page controls fit without scrolling',dutyFits); }
      catch(error){ console.log('Duty layout failure',await evaluate(client,"(() => {const body=document.querySelector('#dienste-content-scrollable'),root=document.querySelector('#widget-dienste-container');return {body:body.getBoundingClientRect().toJSON(),scrollHeight:body.scrollHeight,clientHeight:body.clientHeight,root:root.getBoundingClientRect().toJSON(),buttons:Array.from(body.querySelectorAll('button')).map(b=>({title:b.title,label:b.getAttribute('aria-label'),r:b.getBoundingClientRect().toJSON()}))};})()"));throw error; }
    };
    const resizeDuty=async (width,height) => {
      await waitFor(client,'duty resize interaction settled',"!document.querySelector('[data-widget-type=\"dienste\"]').hasAttribute('data-widget-interacting')");
      await sleep(300);
      const box=await evaluate(client,"(() => {const root=document.querySelector('[data-widget-type=\"dienste\"]'),r=root.getBoundingClientRect(),handle=root.querySelector('[data-widget-resize=\"se\"]'),h=handle.getBoundingClientRect(),x=h.x+h.width/2,y=h.y+h.height/2;return {x,y,width:r.width,height:r.height,hit:document.elementFromPoint(x,y)?.closest('[data-widget-resize]')?.dataset.widgetResize};})()");
      if(box.hit!=='se') throw new Error('Duty resize handle is covered.');
      await client.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:box.x,y:box.y});
      await client.send('Input.dispatchMouseEvent',{type:'mousePressed',x:box.x,y:box.y,button:'left',clickCount:1});
      await client.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:box.x+width-box.width,y:box.y+height-box.height,button:'left',buttons:1});
      await client.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:box.x+width-box.width,y:box.y+height-box.height,button:'left',clickCount:1});
      await sleep(350);
      await waitFor(client,'requested duty widget dimensions reached',"(() => {const r=document.querySelector('[data-widget-type=\"dienste\"]').getBoundingClientRect();return Math.abs(r.width-"+width+")<3 && Math.abs(r.height-"+height+")<3;})()");
      await assertDutyFits();
      if(await evaluate(client,assignedState)!==dutyState) throw new Error('Resizing duties changes the original assignments.');
      await saveScreenshot(client,SCREENSHOT_PATH.replace(/\.png$/, '-duty-layout-'+width+'x'+height+'.png'));
    };
    for(const [width,height] of [[640,560],[760,560],[880,560],[640,560]]) await resizeDuty(width,height);
    await readLongWidgetText('dienste',longDienstTitle,'Diensttitel');
    await waitFor(client,'reading duty title keeps assignments',assignedState+" === "+q(dutyState));
    const absentDienstId=await evaluate(client,"Array.from(document.querySelectorAll("+q('#'+firstDienst+' [data-dienst-student]')+")).find(e=>e.textContent.includes('abwesend')).dataset.dienstStudent");
    const absentChip='#'+firstDienst+' [data-dienst-student='+q(absentDienstId)+']';
    const substitutionTrigger=absentChip+' button[title="Heutige Vertretung auswählen"]';
    await clickSelector(client,substitutionTrigger);
    const substituteDialog='dialog[open][aria-label="Vertretung auswählen"]';
    await waitFor(client,'substitution selection opens as native modal',"Boolean(document.querySelector("+q(substituteDialog)+"))");
    const substituteChoices=await evaluate(client,"Array.from(document.querySelectorAll("+q(substituteDialog+' [data-dienst-substitute-choice]')+")).map(b=>b.dataset.dienstSubstituteChoice)");
    if(substituteChoices.length!==dienstRosterCount-absentDienstStudents.length || substituteChoices.some(id=>absentDienstStudents.includes(id))) throw new Error('Substitution selection includes absent children or hides a present child.');
    for(const width of [820,1366]){
      await client.send('Emulation.setDeviceMetricsOverride',{width,height:768,deviceScaleFactor:1,mobile:false});
      await sleep(150);
      const fits=await evaluate(client,"(() => {const d=document.querySelector("+q(substituteDialog)+"),r=d.getBoundingClientRect(),close=d.querySelector('[aria-label=\"Vertretungsauswahl schließen\"]').getBoundingClientRect(),cancel=Array.from(d.querySelectorAll('button')).find(b=>b.textContent.trim()==='Abbrechen').getBoundingClientRect();return r.left>=0 && r.right<=innerWidth && r.top>=0 && r.bottom<=innerHeight && close.height>=44 && close.bottom<=r.bottom && cancel.height>=44 && cancel.bottom<=r.bottom && Array.from(d.querySelectorAll('[data-dienst-substitute-choice]')).every(b=>b.getBoundingClientRect().height>=44);})()");
      if(!fits) throw new Error('Substitution dialog clips its closing controls or touch targets.');
    }
    await saveScreenshot(client,SCREENSHOT_PATH.replace(/\.png$/, '-duty-substitution.png'));
    const originalAssignedIds=JSON.parse(dutyState).map(row=>row[0]);
    const substituteId=substituteChoices.find(id=>!originalAssignedIds.includes(id));
    if(!substituteId) throw new Error('No independent present substitute available.');
    await clickSelector(client,substituteDialog+' [data-dienst-substitute-choice='+q(substituteId)+']');
    await waitFor(client,'temporary substitution assigned',"!document.querySelector("+q(substituteDialog)+") && document.querySelector("+q(absentChip)+").dataset.dienstSubstitute === "+q(substituteId));
    await assertDutyFits();
    const substitutionState=await evaluate(client,assignedState);
    await clickSelector(client,'button[aria-label="Alle Klassendienste anzeigen"]');
    await auditDutyOverview(8,'-substitution');
    await waitFor(client,'overview visibly retains absent child and today substitute',"(() => {const chip=document.querySelector("+q('[data-dienst-overview-student='+q(absentDienstId)+']')+");return chip?.dataset.dienstSubstitute === "+q(substituteId)+" && chip.textContent.includes('(fehlt)') && chip.textContent.includes('→') && Boolean(chip.querySelector('.line-through'));})()");
    await clickSelector(client,'button[aria-label="Klassendienste bearbeiten"]');
    await waitFor(client,'return from overview preserves substitution',assignedState+" === "+q(substitutionState));

    await auditMenu('dienste','Minimieren');
    await openAuditWidget('dienste','Klassendienste');
    if (await evaluate(client,"Boolean(document.querySelector('button[aria-label=\"Klassendienste bearbeiten\"]'))")) await clickSelector(client,'button[aria-label="Klassendienste bearbeiten"]');
    await waitFor(client,'substitution and long title survive restore',assignedState+" === "+q(substitutionState)+" && document.querySelector("+q('#'+firstDienst+' [data-widget-text-preview]')+").textContent === "+q(longDienstTitle));
    await clickSelector(client,absentChip+' button[title="Vertretung aufheben"]');
    await waitFor(client,'removing substitute preserves original duties',assignedState+" === "+q(dutyState));
    await clickSelector(client,substitutionTrigger);
    await waitFor(client,'substitution selection reopened',"Boolean(document.querySelector("+q(substituteDialog)+"))");
    await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
    await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
    await waitFor(client,'cancel substitution returns focus without assigning',"!document.querySelector("+q(substituteDialog)+") && document.activeElement.matches("+q(substitutionTrigger)+") && "+assignedState+" === "+q(dutyState));
    await clickSelector(client,'[data-widget-type="dienste"] button[aria-label$="Einstellungen öffnen"]');
    await clickButton(client,'Zuweisungen leeren',true);
    await waitFor(client,'clearing duties requires confirmation',"document.querySelector('#dienste-manage-dropdown').textContent.includes('Wirklich alle Zuweisungen leeren?')");
    await clickButton(client,'Nein',true);
    await clickSelector(client,'[data-widget-type="dienste"] button[aria-label$="Einstellungen schließen"]');
    await waitFor(client,'cancel clearing keeps duty assignments',assignedState+" === "+q(dutyState));
    // Assign the entire fixture through the UI: the card must not grow with the roster.
    await clickSelector(client,'#'+firstDienst+' button[title="Kinder zuordnen"]');
    await auditDutyAssignment('-long-title');
    const allDutyIds=await evaluate(client,"Array.from(document.querySelectorAll("+q(drawer+' [data-dienst-assign-student]')+")).map(b=>b.dataset.dienstAssignStudent)");
    let threeChildrenHeight;
    for(const id of allDutyIds){
      const choice=drawer+' [data-dienst-assign-student='+q(id)+']';
      if(!await evaluate(client,"document.querySelector("+q(choice)+").getAttribute('aria-pressed') === 'true'")) await clickSelector(client,choice);
      const count=await evaluate(client,"document.querySelectorAll("+q(drawer+' [aria-pressed="true"]')+").length");
      if(count===3) threeChildrenHeight=await evaluate(client,"document.querySelector("+q('#'+firstDienst+' [data-dienst-children-summary]')+").getBoundingClientRect().height");
    }
    await clickButton(client,'Schließen ✕',true);
    const childrenSummary='#'+firstDienst+' [data-dienst-children-summary]';
    await waitFor(client,'large duty list stays compact',"document.querySelector("+q(childrenSummary)+").textContent.includes("+q('Alle '+dienstRosterCount+' Kinder ansehen')+") && document.querySelectorAll("+q('#'+firstDienst+' [data-dienst-student]')+").length === 0");
    const fullSummaryHeight=await evaluate(client,"document.querySelector("+q(childrenSummary)+").getBoundingClientRect().height");
    if(!threeChildrenHeight || Math.abs(fullSummaryHeight-threeChildrenHeight)>1) throw new Error('Duty summary grows with the number of assigned children.');
    await clickSelector(client,'button[aria-label="Alle Klassendienste anzeigen"]');
    await auditDutyOverview(8,'-all-children');
    const overviewChildrenSelector='[data-dienst-overview='+q(firstDienst.replace('dienst-item-',''))+'] [data-dienst-overview-student]';
    const overviewChildren=await evaluate(client,'Array.from(document.querySelectorAll('+q(overviewChildrenSelector)+')).map(e=>e.dataset.dienstOverviewStudent)');
    if(overviewChildren.length!==dienstRosterCount || allDutyIds.some(id=>!overviewChildren.includes(id))) throw new Error('Overview hides assigned children behind a count or dialog.');
    await clickSelector(client,'[data-dienst-overview='+q(firstDienst.replace('dienst-item-',''))+']');
    await waitFor(client,'assigned overview card opens children',"Boolean(document.querySelector('dialog[open][aria-label=\"Eingeteilte Kinder\"]'))");
    await clickSelector(client,'dialog[open][aria-label="Eingeteilte Kinder"] header button');
    await waitFor(client,'children list returns to overview card',"document.activeElement.matches('[data-dienst-overview]')");
    if (await evaluate(client,"Boolean(document.querySelector('button[aria-label=\"Klassendienste bearbeiten\"]'))")) await clickSelector(client,'button[aria-label="Klassendienste bearbeiten"]');
    await clickSelector(client,childrenSummary);
    const childrenDialog='dialog[open][aria-label="Eingeteilte Kinder"]';
    const childrenRows=childrenDialog+' [data-dienst-student]';
    await waitFor(client,'all assigned children available in full list',"document.querySelectorAll("+q(childrenRows)+").length === "+dienstRosterCount);
    const allAssignedState="JSON.stringify(Array.from(document.querySelectorAll("+q(childrenRows)+")).map(e=>[e.dataset.dienstStudent,e.dataset.dienstSubstitute||null]))";
    const allAssigned=await evaluate(client,allAssignedState);
    if(new Set(JSON.parse(allAssigned).map(row=>row[0])).size!==dienstRosterCount) throw new Error('Assigned children are duplicated or missing.');
    for(const [width,listWidth] of [[820,390],[820,null],[1366,null]]){
      await client.send('Emulation.setDeviceMetricsOverride',{width,height:768,deviceScaleFactor:1,mobile:false});
      await evaluate(client,"document.querySelector("+q(childrenDialog)+").style.width = "+q(listWidth ? listWidth+'px' : ''));
      await sleep(150);
      const fits=await evaluate(client,"(() => {const d=document.querySelector("+q(childrenDialog)+"),r=d.getBoundingClientRect(),body=d.querySelector('[data-dienst-children-list]'),close=d.querySelector('header button').getBoundingClientRect();const cards=Array.from(body.querySelectorAll('[data-dienst-student]'));cards.at(-1).scrollIntoView({block:'end'});const last=cards.at(-1).getBoundingClientRect(),b=body.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth && r.top>=0 && r.bottom<=innerHeight && close.height>=44 && close.top>=r.top && close.bottom<=r.bottom && body.scrollWidth<=body.clientWidth+1 && last.bottom<=b.bottom+1 && last.top>=b.top && cards.every(card=>{const c=card.getBoundingClientRect(),name=card.querySelector('span').getBoundingClientRect();return name.width>=100 && Array.from(card.querySelectorAll('button')).every(button=>{const t=button.getBoundingClientRect();return t.height>=44 && t.left>=c.left && t.right<=c.right+1;});});})()");
      if(!fits) throw new Error('Full duty children list clips names, touch targets or closing action at '+width+'px.');
      if(listWidth) await saveScreenshot(client,SCREENSHOT_PATH.replace(/\.png$/, '-duty-children-narrow.png'));
    }
    await evaluate(client,"document.querySelector("+q(childrenDialog+' [data-dienst-children-list]')+").scrollTop=0");
    await saveScreenshot(client,SCREENSHOT_PATH.replace(/\.png$/, '-duty-children.png'));
    const nestedSubstituteTrigger=childrenDialog+' [data-dienst-student='+q(absentDienstId)+'] button[title="Heutige Vertretung auswählen"]';
    await clickSelector(client,nestedSubstituteTrigger);
    await waitFor(client,'substitution opens above assigned children',"Boolean(document.querySelector("+q(substituteDialog)+"))");
    await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
    await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
    await waitFor(client,'Escape returns to unchanged full children list',"!document.querySelector("+q(substituteDialog)+") && document.activeElement.matches("+q(nestedSubstituteTrigger)+") && "+allAssignedState+" === "+q(allAssigned));
    await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
    await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
    await waitFor(client,'closing children list returns focus to summary',"!document.querySelector("+q(childrenDialog.replace('[open]',''))+") && document.activeElement.matches("+q(childrenSummary)+")");
    await clickSelector(client,childrenSummary);
    await waitFor(client,'children list can be reopened',"document.querySelectorAll("+q(childrenRows)+").length === "+dienstRosterCount);
    const lastDutyChild=allDutyIds.at(-1);
    await clickSelector(client,childrenDialog+' [data-dienst-student='+q(lastDutyChild)+'] button[title="Schüler abteilen"]');
    await waitFor(client,'removing child updates full list and compact summary',"document.querySelectorAll("+q(childrenRows)+").length === "+(dienstRosterCount-1)+" && document.querySelector("+q(childrenSummary)+").textContent.includes("+q('Alle '+(dienstRosterCount-1)+' Kinder ansehen')+")");
    for(const id of allDutyIds.filter(id=>!originalAssignedIds.includes(id) && id!==lastDutyChild)){
      await clickSelector(client,childrenDialog+' [data-dienst-student='+q(id)+'] button[title="Schüler abteilen"]');
    }
    await waitFor(client,'reducing full list keeps two original children',allAssignedState+" === "+q(dutyState)+" && !document.querySelector("+q(childrenSummary)+")");
    await clickSelector(client,childrenDialog+' header button');
    await waitFor(client,'closing reduced list returns focus to assignment action',"!document.querySelector("+q(childrenDialog.replace('[open]',''))+") && document.activeElement.matches("+q('#'+firstDienst+' button[title="Kinder zuordnen"]')+") && "+assignedState+" === "+q(dutyState));
    const turnDutyPage=async selector => {
      const before=await evaluate(client,"document.querySelector('#dienste-content-scrollable [id^=dienst-item-]').id");
      await clickSelector(client,selector);
      await waitFor(client,'duty page changed',"document.querySelector('#dienste-content-scrollable [id^=dienst-item-]').id !== "+q(before));
      await assertDutyFits();
    };
    const readDuties=async () => {
      while(await evaluate(client,"Boolean(document.querySelector('[aria-label=\"Vorherige Klassendienste\"]:not(:disabled)'))")) await turnDutyPage('[aria-label="Vorherige Klassendienste"]');
      const duties=[];
      for(let page=0;page<30;page++){
        const rows=await evaluate(client,"Array.from(document.querySelectorAll('#dienste-content-scrollable [id^=dienst-item-]')).map(e=>e.id)");
        duties.push(...rows);
        if(!await evaluate(client,"Boolean(document.querySelector('[aria-label=\"Weitere Klassendienste\"]:not(:disabled)'))")) break;
        await turnDutyPage('[aria-label="Weitere Klassendienste"]');
      }
      return duties;
    };
    const allDuties=await readDuties();
    if(allDuties.length<8 || new Set(allDuties).size!==allDuties.length) throw new Error('Duty pagination duplicates or hides a default service.');
    await auditMenu('dienste','Minimieren');
    await openAuditWidget('dienste','Klassendienste');
    if (await evaluate(client,"Boolean(document.querySelector('button[aria-label=\"Klassendienste bearbeiten\"]'))")) await clickSelector(client,'button[aria-label="Klassendienste bearbeiten"]');
    if(JSON.stringify(await readDuties())!==JSON.stringify(allDuties)) throw new Error('Duty pages change on restore.');
    const addDutyDialog='dialog[open][aria-label="Neuen Dienst hinzufügen"]';
    const openAddDuty=async () => {
      await clickSelector(client,'[data-widget-type="dienste"] button[aria-label$="Einstellungen öffnen"]');
      await clickButton(client,'Dienst hinzufügen',true);
      await waitFor(client,'new duty opens outside widget frame',"Boolean(document.querySelector("+q(addDutyDialog)+")) && !document.querySelector("+q('[data-widget-type="dienste"]')+").contains(document.querySelector("+q(addDutyDialog)+"))");
    };
    const addDutyClosed="!document.querySelector('#dienste-add-modal') && document.activeElement.matches('[data-widget-type=\"dienste\"] button[aria-label$=\"Einstellungen öffnen\"]')";
    await openAddDuty();
    await waitFor(client,'empty duty title cannot be added',"document.querySelector("+q(addDutyDialog+' button[type="submit"]')+").disabled");
    await setInputByLabel(client,'Diensttitel','   ');
    await waitFor(client,'whitespace duty title cannot be added',"document.querySelector("+q(addDutyDialog+' button[type="submit"]')+").disabled");
    await setInputByLabel(client,'Diensttitel','Dieser Entwurf wird abgebrochen');
    const newDutyEmoji=await evaluate(client,"Array.from(document.querySelector("+q(addDutyDialog+' select')+").options).find(o=>o.value!=='🧽').value");
    await setInputByLabel(client,'Dienstsymbol',newDutyEmoji);
    await clickSelector(client,addDutyDialog+' footer button[type="button"]');
    await waitFor(client,'cancel adding returns focus without creating duty',addDutyClosed);
    if(JSON.stringify(await readDuties())!==JSON.stringify(allDuties)) throw new Error('Cancelled duty changed the existing services.');
    await openAddDuty();
    await waitFor(client,'cancelled draft is cleared on reopening',"document.querySelector("+q(addDutyDialog+' input')+").value==='' && document.querySelector("+q(addDutyDialog+' select')+").value==='🧽'");
    await setInputByLabel(client,'Diensttitel','Auch dieser Entwurf wird nicht gespeichert');
    await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
    await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
    await waitFor(client,'Escape adding returns focus without creating duty',addDutyClosed);
    await openAddDuty();
    const newDutyTitle='Neuer Dienst '+('b'.repeat(67));
    await setInputByLabel(client,'Diensttitel',newDutyTitle);
    await setInputByLabel(client,'Dienstsymbol',newDutyEmoji);
    for(const [width,dialogWidth] of [[820,390],[820,null],[1366,null]]){
      await client.send('Emulation.setDeviceMetricsOverride',{width,height:768,deviceScaleFactor:1,mobile:false});
      await evaluate(client,"document.querySelector("+q(addDutyDialog)+").style.width = "+q(dialogWidth ? dialogWidth+'px' : ''));
      await sleep(150);
      const fits=await evaluate(client,"(() => {const d=document.querySelector("+q(addDutyDialog)+"),r=d.getBoundingClientRect(),controls=Array.from(d.querySelectorAll('input,select,button'));return r.left>=0 && r.right<=innerWidth && r.top>=0 && r.bottom<=innerHeight && d.scrollWidth<=d.clientWidth+1 && d.querySelector('input').maxLength===80 && controls.every(control=>{const c=control.getBoundingClientRect();return c.height>=44 && c.left>=r.left && c.right<=r.right && c.top>=r.top && c.bottom<=r.bottom;});})()");
      if(!fits) throw new Error('Adding duty clips labelled fields or action controls at '+width+'px.');
      if(dialogWidth) await saveScreenshot(client,SCREENSHOT_PATH.replace(/\.png$/, '-duty-add-narrow.png'));
    }
    await saveScreenshot(client,SCREENSHOT_PATH.replace(/\.png$/, '-duty-add.png'));
    await clickSelector(client,addDutyDialog+' button[type="submit"]');
    await waitFor(client,'adding saves and returns focus',addDutyClosed);
    const dutiesAfterAdd=await readDuties();
    const newDutyIds=dutiesAfterAdd.filter(id=>!allDuties.includes(id));
    if(dutiesAfterAdd.length!==allDuties.length+1 || newDutyIds.length!==1 || !allDuties.every(id=>dutiesAfterAdd.includes(id))) throw new Error('Adding duty duplicates or changes an existing service.');
    const newDutySelector='#'+newDutyIds[0];
    // The new service is appended and is reachable on the final page.
    await waitFor(client,'new duty keeps long title, symbol and empty assignments',"document.querySelector("+q(newDutySelector+' [data-widget-text-preview]')+").textContent==="+q(newDutyTitle)+" && document.querySelector("+q(newDutySelector+' [role="img"]')+").textContent==="+q(newDutyEmoji)+" && document.querySelectorAll("+q(newDutySelector+' [data-dienst-student]')+").length===0");
    await auditMenu('dienste','Minimieren');
    await openAuditWidget('dienste','Klassendienste');
    if (await evaluate(client,"Boolean(document.querySelector('button[aria-label=\"Klassendienste bearbeiten\"]'))")) await clickSelector(client,'button[aria-label="Klassendienste bearbeiten"]');
    if(JSON.stringify(await readDuties())!==JSON.stringify(dutiesAfterAdd)) throw new Error('New duty does not survive restore.');
    await clickSelector(client,'button[aria-label="Alle Klassendienste anzeigen"]');
    await auditDutyOverview(9,'-added');
    const finalOverview=await evaluate(client,"Array.from(document.querySelectorAll('[data-dienst-overview]')).map(e=>e.dataset.dienstOverview)");
    if(!overviewDuties.every(id=>finalOverview.includes(id)) || finalOverview.length!==9) throw new Error('Added duty missing from complete overview.');
    await auditMenu('dienste','Minimieren');
    await openAuditWidget('dienste','Klassendienste');
    await auditDutyOverview(9,'-restored');
    await auditMenu('dienste','Widget schließen');
    if (process.env.KLASSIO_E2E_WIDGET_FOCUS === 'dienste') {
      console.log('Klassendienste browser audit passed at '+WIDTH+'px: all services and children, substitution, native dialogs, resize and restore.');
      return;
    }


    await openAuditWidget('instruction','Arbeitsauftrag');
    if(!await evaluate(client,"Boolean(document.querySelector('[role=dialog][aria-label=\\\"Arbeitsauftrag bearbeiten\\\"]'))")) await clickSelector(client,'[data-widget-type="instruction"] button[aria-label$="Einstellungen öffnen"]');
    await waitFor(client,'assignment editor available',"Boolean(document.querySelector('[role=dialog][aria-label=\"Arbeitsauftrag bearbeiten\"]'))");
    const assignmentText='Synthetischer Arbeitsauftrag: '+('Lies die Silben laut und zeichne das passende Bild. ').repeat(10)+'ENDE DES ARBEITSAUFTRAGS';
    await setInputByLabel(client,'Arbeitsauftrag Haupttext',assignmentText);
    await clickButton(client,'Anzeigen',true);
    const instructionRoot='[data-widget-type="instruction"]';
    await waitFor(client,'long assignment has text pages',"Boolean(document.querySelector("+q(instructionRoot+' [aria-label="Arbeitsauftrag-Textseiten"]')+"))");
    await sleep(250);
    const pages=[];
    for(let page=0;page<40;page++){
      pages.push(await evaluate(client,"document.querySelector('[data-instruction-text-page]').textContent"));
      const fits=await evaluate(client,"(() => {const text=document.querySelector('[data-instruction-text-page]'),root=document.querySelector("+q(instructionRoot)+"),r=root.getBoundingClientRect(),t=text.getBoundingClientRect();return t.top>=r.top && t.bottom<=r.bottom+1 && t.left>=r.left && t.right<=r.right+1 && Array.from(root.querySelectorAll('[aria-label=\"Arbeitsauftrag-Textseiten\"] button')).every(b=>{const t=b.getBoundingClientRect();return t.height>=44 && t.bottom<=r.bottom+1;});})()");
      if(!fits) throw new Error('Assignment text or page controls are clipped.');
      const next=instructionRoot+' [aria-label="Arbeitsauftrag-Textseiten"] button:last-child';
      if(await evaluate(client,"document.querySelector("+q(next)+").disabled")) break;
      await clickSelector(client,next);
    }
    if(pages.length<2 || pages.join('')!==assignmentText) throw new Error('Assignment pages lose original words.');
    const lastAssignmentPage=await evaluate(client,"document.querySelector('[data-instruction-text-page]').textContent");
    await auditMenu('instruction','Minimieren');
    await openAuditWidget('instruction','Arbeitsauftrag');
    await waitFor(client,'assignment restores selected text page',"document.querySelector('[data-instruction-text-page]').textContent === "+q(lastAssignmentPage));
    await clickSelector(client,instructionRoot+' button[aria-label$="Einstellungen öffnen"]');
    await setInputByLabel(client,'Arbeitsauftrag Haupttext','Lies die Silben.');
    for(let index=1;index<=8;index++){
      await setInputByPlaceholder(client,'Schritt hinzufügen','Synthetischer Schritt '+index);
      await evaluate(client,"Array.from(document.querySelectorAll('[role=dialog][aria-label=\"Arbeitsauftrag bearbeiten\"] button')).find(b=>b.textContent.trim()==='Hinzufügen').click()");
    }
    await clickButton(client,'Anzeigen',true);
    await waitFor(client,'assignment checklist displayed',"Boolean(document.querySelector("+q(instructionRoot+' button[aria-pressed]')+"))");
    await clickSelector(client,instructionRoot+' button[aria-pressed]');
    const readSteps=async () => {
      const group=instructionRoot+' [aria-label="Arbeitsschritte-Seiten"]';
      const turn=async selector => {
        const old=await evaluate(client,"document.querySelector("+q(instructionRoot+' button[aria-pressed]')+").getAttribute('aria-label')");
        await clickSelector(client,selector);
        await waitFor(client,'assignment checklist page changed',"document.querySelector("+q(instructionRoot+' button[aria-pressed]')+").getAttribute('aria-label') !== "+q(old));
      };
      while(await evaluate(client,"Boolean(document.querySelector("+q(group+' button:first-child:not(:disabled)')+"))")) await turn(group+' button:first-child');
      const result=[];
      for(let page=0;page<30;page++){
        const rows=await evaluate(client,"Array.from(document.querySelectorAll("+q(instructionRoot+' button[aria-pressed]')+")).map(b=>[b.getAttribute('aria-label'),b.getAttribute('aria-pressed')])");
        const fits=await evaluate(client,"(() => {const root=document.querySelector("+q(instructionRoot)+"),r=root.getBoundingClientRect();return Array.from(root.querySelectorAll('button[aria-pressed]')).every(b=>{const t=b.getBoundingClientRect();return t.height>=44 && t.top>=r.top && t.bottom<=r.bottom+1;});})()");
        if(!fits) throw new Error('Assignment checklist actions are clipped or smaller than touch targets.');
        result.push(...rows);
        if(!await evaluate(client,"Boolean(document.querySelector("+q(group+' button:last-child:not(:disabled)')+"))")) break;
        await turn(group+' button:last-child');
      }
      return result;
    };
    const checkedSteps=await readSteps();
    if(checkedSteps.length!==8 || checkedSteps.filter(row=>row[1]==='true').length!==1) throw new Error('Assignment checklist hides steps or loses completion.');
    await auditMenu('instruction','Minimieren');
    await openAuditWidget('instruction','Arbeitsauftrag');
    if(JSON.stringify(await readSteps())!==JSON.stringify(checkedSteps)) throw new Error('Assignment checklist loses state on restore.');
    await auditMenu('instruction','Widget schließen');

    for (const mode of ['Analog', 'Digital']) {
      await openAuditWidget('clock', 'Uhrzeit & Datum');
      const root='[data-widget-type="clock"]';
      await clickSelector(client, root+' button[aria-label$="Einstellungen öffnen"]');
      await clickButton(client,mode,true);
      await clickSelector(client,root+' [aria-label="Einstellungen schließen"]');
      const face="document.querySelector("+q(root+' svg[viewBox="0 0 100 100"]')+")";
      const display=mode==='Analog' ? "Boolean("+face+") && Array.from("+face+".querySelectorAll('text')).map(e=>e.textContent).join(',') === '12,1,2,3,4,5,6,7,8,9,10,11'" : "!"+face+" && Boolean(document.querySelector("+q(root+' [role="region"][aria-label^="Uhrzeit "]')+"))";
      await waitFor(client,mode+' clock displayed',display);
      await auditMenu('clock','Minimieren');
      await openAuditWidget('clock','Uhrzeit & Datum');
      await waitFor(client,mode+' clock survives restore',display);
      await auditMenu('clock','Widget schließen');
    }
    await openAuditWidget('wordclock','Deutsche Wort-Uhr');
    const wordRoot='[data-widget-type="wordclock"]';
    const wordText="document.querySelector("+q(wordRoot)+").textContent";
    await clickSelector(client,wordRoot+' button[aria-label$="Einstellungen öffnen"]');
    await clickButton(client,'💡 Üben',true);
    for (const [hour,minute,spoken] of [[23,55,'Fünf vor 12'],[23,30,'Halb 12'],[0,0,'Punkt 12 Uhr'],[10,15,'Viertel nach 10']]) {
      await setInputByLabel(client,'Stunde',String(hour));
      await setInputByLabel(client,'Minute',String(minute));
      await clickButton(client,'Fertig',true);
      const time=String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0');
      await waitFor(client,'word-clock practice '+time,wordText+".includes("+q(spoken)+") && "+wordText+".includes("+q(time)+")");
      if (hour !== 10) await clickSelector(client,wordRoot+' button[aria-label$="Einstellungen öffnen"]');
    }
    const practiceState=await evaluate(client,wordText);
    await auditMenu('wordclock','Minimieren');
    await openAuditWidget('wordclock','Deutsche Wort-Uhr');
    await waitFor(client,'word-clock practice survives restore',wordText+" === "+q(practiceState));
    await clickSelector(client,wordRoot+' button[aria-label$="Einstellungen öffnen"]');
    await clickButton(client,'⏱️ Echtzeit',true);
    await clickButton(client,'Fertig',true);
    await waitFor(client,'word-clock returns to live mode',wordText+".includes('⏱️ Echtzeit') && !"+wordText+".includes('💡 Übungsmodus')");
    await auditMenu('wordclock','Widget schließen');

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
      const taskStateExpression = `JSON.stringify(Array.from(document.querySelectorAll('${root} button[aria-pressed][aria-label^="Aufgabe "]')).map(b=>[b.getAttribute('aria-label'),b.getAttribute('aria-pressed')]))`;
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
        const editedState = await evaluate(client, taskStateExpression);
        await clickSelector(client, `${root} [aria-label="Neue Aufgabenliste anlegen"]`);
        await waitFor(client, 'reset requires confirmation', `document.querySelector('${root}').textContent.includes('Aktuelle Liste leeren?')`);
        await evaluate(client, `Array.from(document.querySelectorAll('${root} button')).find(b=>b.textContent.trim()==='Abbrechen').click()`);
        await waitFor(client, 'cancel reset preserves own tasks', `${taskStateExpression} === ${q(editedState)}`);
        const addControlsFit = await evaluate(client, `(() => {const root=document.querySelector('${root}'),r=root.getBoundingClientRect();return Array.from(root.querySelectorAll('form input,form button')).every(e=>{const b=e.getBoundingClientRect();return b.height>=44 && b.bottom<=r.bottom+1 && b.left>=r.left && b.right<=r.right+1;});})()`);
        if (!addControlsFit) throw new Error('Task entry controls are clipped or smaller than 44px.');
        const longTask = 'Synthetischer Langtext: '+('Lies die Silben laut und zeichne das passende Bild. '+ 'https://beispiel.test/'+ 'a'.repeat(90)+' ').repeat(12)+'ENDE DER AUFGABE';
        await setInputByLabel(client, 'Neuer Aufgabenschritt', longTask);
        await clickSelector(client, `${root} [aria-label="Schritt zur Liste hinzufügen"]`);
        await readLongWidgetText('todo', longTask, 'Aufgabe');
        await waitFor(client, 'reading long task never marks it complete', `document.querySelector('${root} button[aria-label=${q('Aufgabe '+longTask+' als erledigt markieren')}]')?.getAttribute('aria-pressed') === 'false'`);
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
      const stateExpression = type === 'todo' ? taskStateExpression : `document.querySelector('${root}').textContent`;
      const before = await evaluate(client, stateExpression);
      await auditMenu(type,'Minimieren');
      await openAuditWidget(type,search);
      await waitFor(client, type+' restores its saved state after layout settles', `${stateExpression} === ${q(before)}`);
      await saveScreenshot(client,SCREENSHOT_PATH.replace(/\.png$/, '-widget-'+type+'.png'));
      await auditMenu(type,'Widget schließen');
    }
    await openAuditWidget('groups', 'Gruppen-Einteiler');
    await clickButton(client, 'Gruppen bilden', true);
    await waitFor(client, 'groups formed inside widget without automatic full screen', `Boolean(document.querySelector('[data-widget-type="groups"] [role="listitem"]')) && !document.querySelector('[role="dialog"][aria-label="Gruppen groß anzeigen"]')`);
    const readAllGroupAssignments = async () => {
      await clickSelector(client, '[data-widget-type="groups"] [aria-label="Alle Gruppen anzeigen"]');
      const state = await waitFor(client, 'all group assignments are available for comparison', `(() => {
        const dialog=document.querySelector('[role="dialog"][aria-label="Gruppen groß anzeigen"]');
        if(!dialog)return false;
        const assignments=Array.from(dialog.querySelectorAll('[data-group-id] [data-group-student]')).map(child=>[child.closest('[data-group-id]').dataset.groupId,child.dataset.groupStudent]);
        return assignments.length>0 && JSON.stringify(assignments.sort((a,b)=>a.join(':').localeCompare(b.join(':'))));
      })()`);
      await evaluate(client, `Array.from(document.querySelectorAll('[role="dialog"][aria-label="Gruppen groß anzeigen"] button')).find(b=>b.textContent.trim()==='Zurück zur Widgetgröße').click()`);
      await waitFor(client, 'groups return to widget size', `!document.querySelector('[role="dialog"][aria-label="Gruppen groß anzeigen"]')`);
      return state;
    };
    const groupState = await readAllGroupAssignments();
    await auditMenu('groups', 'Minimieren');
    await openAuditWidget('groups', 'Gruppen-Einteiler');
    if (await readAllGroupAssignments() !== groupState) throw new Error('Group membership changes after minimize and restore.');
    console.log('✓ all group assignments survive minimize');
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
    const ownHomework = 'Synthetische Widget-Hausübung: '+('Lies die Silben und erkläre das passende Bild. '+ 'https://beispiel.test/'+ 'b'.repeat(90)+' ').repeat(10)+'ENDE DER HAUSÜBUNG';
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
      await readLongWidgetText(type, ownHomework, 'Hausübung');
      await saveScreenshot(client, SCREENSHOT_PATH.replace(/\.png$/, '-widget-'+type+'.png'));
      await auditMenu(type, 'Widget schließen');
    }
    console.log('✓ Homework/children weekly plan: current week despite teacher planning ahead, own homework, navigation and restore.');
    await openAuditWidget('scoreboard', 'Gruppen-Punkte');
    const scoreRoot = '[data-widget-type="scoreboard"]';
    const readScores = `Array.from(document.querySelectorAll('${scoreRoot} [data-scoreboard-team]')).map(row=>({id:row.dataset.scoreboardTeam,score:Number(row.querySelector('[data-scoreboard-score]').textContent),winner:row.dataset.scoreboardWinner==='true'}))`;
    const teams = await evaluate(client, readScores);
    if(teams.length < 2 || teams.some(t=>t.score!==0)) throw new Error('Expected fresh scoreboard teams.');
    const teamRoot = id => scoreRoot+' [data-scoreboard-team='+q(id)+']';
    await clickSelector(client, teamRoot(teams[0].id)+' button[aria-label$="Punkt hinzufügen"]');
    await clickSelector(client, teamRoot(teams[0].id)+' button[aria-label$="Punkt hinzufügen"]');
    await clickSelector(client, teamRoot(teams[0].id)+' button[aria-label$="Punkt korrigieren"]');
    await clickSelector(client, teamRoot(teams[1].id)+' button[aria-label$="Punkt hinzufügen"]');
    await waitFor(client, 'scoreboard corrections produce a tie', `(${readScores}).slice(0,2).every(t=>t.score===1)`);
    await clickSelector(client, scoreRoot+' button[aria-label="Runde beenden"]');
    await waitFor(client, 'scoreboard highlights both tied winners', `(${readScores}).filter(t=>t.winner).length===2 && document.querySelector('${scoreRoot}').textContent.includes('Gleichstand!')`);
    const tiedScores = await evaluate(client, readScores);
    await auditMenu('scoreboard', 'Minimieren');
    await openAuditWidget('scoreboard', 'Gruppen-Punkte');
    await waitFor(client, 'scoreboard scores and winners survive restore', `JSON.stringify(${readScores})===${q(JSON.stringify(tiedScores))}`);
    await clickSelector(client, scoreRoot+' button[aria-label="Neue Runde starten"]');
    await waitFor(client, 'new round confirmation has usable targets', `Array.from(document.querySelectorAll('${scoreRoot} button[aria-label="Neue Runde bestätigen"],${scoreRoot} button[aria-label="Abbrechen"]')).length===2 && Array.from(document.querySelectorAll('${scoreRoot} button[aria-label="Neue Runde bestätigen"],${scoreRoot} button[aria-label="Abbrechen"]')).every(b=>{const r=b.getBoundingClientRect();return r.width>=44&&r.height>=44;})`);
    await clickSelector(client, scoreRoot+' button[aria-label="Abbrechen"]');
    if(JSON.stringify(await evaluate(client, readScores))!==JSON.stringify(tiedScores)) throw new Error('Cancelled round changes scores.');
    await clickSelector(client, scoreRoot+' button[aria-label="Neue Runde starten"]');
    await clickSelector(client, scoreRoot+' button[aria-label="Neue Runde bestätigen"]');
    await waitFor(client, 'new round preserves teams and clears scores and winners', `(${readScores}).every(t=>t.score===0&&!t.winner) && JSON.stringify((${readScores}).map(t=>t.id))===${q(JSON.stringify(teams.map(t=>t.id)))}`);
    await clickSelector(client, scoreRoot+' button[aria-label$="Einstellungen öffnen"]');
    await clickSelector(client, scoreRoot+' button[aria-label="Schrittweite +5"]');
    await waitFor(client, 'scoreboard step selection is announced', `document.querySelector('${scoreRoot} [aria-label="Schrittweite +5"]')?.getAttribute('aria-pressed')==='true'`);
    await clickSelector(client, scoreRoot+' button[aria-label="Scoreboard Optionen schließen"]');
    await clickSelector(client, teamRoot(teams[0].id)+' button[aria-label$="Punkt hinzufügen"]');
    await clickSelector(client, teamRoot(teams[0].id)+' button[aria-label$="Punkt korrigieren"]');
    await waitFor(client, 'step five adds five but correction removes one', `(${readScores})[0].score===4`);
    await auditMenu('scoreboard', 'Minimieren');
    await openAuditWidget('scoreboard', 'Gruppen-Punkte');
    await waitFor(client, 'scoreboard step and score survive restore', `(${readScores})[0].score===4 && document.querySelector('${scoreRoot}').textContent.includes('Schritt +5')`);
    await sleep(500); // Let the restored frame and closing options drawer finish animating.
    await saveScreenshot(client, SCREENSHOT_PATH.replace(/\.png$/, '-widget-scoreboard.png'));
    await auditMenu('scoreboard', 'Widget schließen');
    for (const [type, search, style, styleLabel] of [
      ['klassenglas', 'Klassenziel', 'jar', 'Belohnungsglas'],
      ['thermometer', 'Ziel-Thermometer', 'thermometer', 'Ziel-Thermometer'],
      ['classtarget', 'Klassen-Ziel', 'barometer', 'Fortschritts-Ring'],
      ['piggybank', 'Klassen-Sparschwein', 'jar', 'Belohnungsglas'],
    ]) {
      await openAuditWidget(type, search);
      const goalRoot = `[data-widget-type="${type}"] #class-reward-widget-root`;
      const settings = '[role="dialog"][aria-label="Klassenziel anpassen"]';
      const symbolLabel = type === 'piggybank' ? 'Münze (Sparschwein)' : 'Stern';
      const goalState = `(() => {const r=document.querySelector('${goalRoot}');return r&&{count:Number(r.dataset.classGoalCount),goal:Number(r.dataset.classGoalGoal),style:r.dataset.classGoalStyle};})()`;
      await clickSelector(client, `[data-widget-type="${type}"] button[aria-label$="Einstellungen öffnen"]`);
      await waitFor(client, type+' settings open', `Boolean(document.querySelector('${settings}'))`);
      await setInputByLabel(client, 'Zielanzahl', '0');
      await evaluate(client, `Array.from(document.querySelectorAll('${settings} button')).find(b=>b.textContent.trim()==='Speichern').click()`);
      await waitFor(client, type+' rejects an invalid goal without closing', `Boolean(document.querySelector('${settings} [role="alert"]'))`);
      await setInputByLabel(client, 'Zielanzahl', '3');
      await setInputByLabel(client, 'Belohnung / Ziel-Name', 'Gemeinsames Testziel');
      await clickSelector(client, settings+' button[aria-label='+q(symbolLabel)+']');
      await clickSelector(client, settings+' button[aria-label='+q(styleLabel)+']');
      await waitFor(client, type+' symbol and style selections are announced', `document.querySelector('${settings} [aria-label=${q(symbolLabel)}]')?.getAttribute('aria-pressed')==='true' && document.querySelector('${settings} [aria-label=${q(styleLabel)}]')?.getAttribute('aria-pressed')==='true'`);
      await evaluate(client, `Array.from(document.querySelectorAll('${settings} button')).find(b=>b.textContent.trim()==='Speichern').click()`);
      await waitFor(client, type+' saves goal and its visualization', `!document.querySelector('${settings}') && (${goalState})?.goal===3 && (${goalState})?.style===${q(style)} && document.querySelector('${goalRoot}').textContent.includes('Gemeinsames Testziel')`);
      if((await evaluate(client, goalState)).count!==0) throw new Error('Previous goal reset did not clear shared count.');
      await waitFor(client, type+' cannot correct below zero', `document.querySelector('${goalRoot} #reward-correction-btn')?.disabled===true`);
      await clickSelector(client, goalRoot+' #reward-add-btn');
      await clickSelector(client, goalRoot+' #reward-add-btn');
      await clickSelector(client, goalRoot+' #reward-correction-btn');
      await waitFor(client, type+' adds and corrects shared progress', `(${goalState})?.count===1`);
      await auditMenu(type, 'Minimieren');
      await openAuditWidget(type, search);
      await waitFor(client, type+' count goal style and title survive restore', `(${goalState})?.count===1 && (${goalState})?.goal===3 && (${goalState})?.style===${q(style)} && document.querySelector('${goalRoot}').textContent.includes('Gemeinsames Testziel')`);
      await clickSelector(client, goalRoot+' #reward-reset-btn');
      await waitFor(client, type+' reset asks for confirmation', `Boolean(document.querySelector('[role="alertdialog"][aria-label="Klassenziel zurücksetzen"]'))`);
      await clickButton(client, 'Nein', true);
      await waitFor(client, type+' cancelled reset preserves count', `!document.querySelector('[role="alertdialog"][aria-label="Klassenziel zurücksetzen"]') && (${goalState})?.count===1`);
      await clickSelector(client, goalRoot+' #reward-add-btn');
      await clickSelector(client, goalRoot+' #reward-add-btn');
      await waitFor(client, type+' announces the reached goal', `(${goalState})?.count===3 && document.querySelector('${goalRoot}').textContent.includes('Klassenziel erreicht!')`);
      await waitFor(client, type+' reached banner leaves visualization and controls unobscured', `(() => {const root=document.querySelector('${goalRoot}'),banner=root.querySelector('[data-class-goal-banner]').getBoundingClientRect(),visual=root.querySelector('[data-class-goal-visual]').getBoundingClientRect(),r=root.getBoundingClientRect();return visual.top>=banner.bottom-1 && visual.height>30 && Array.from(root.querySelectorAll('#reward-add-btn,#reward-correction-btn,#reward-reset-btn')).every(b=>{const t=b.getBoundingClientRect();return t.width>=44 && t.height>=44 && t.left>=r.left && t.right<=r.right+1 && t.bottom<=r.bottom+1;});})()`);
      await sleep(500);
      await saveScreenshot(client, SCREENSHOT_PATH.replace(/\.png$/, '-widget-'+type+'.png'));
      if(type==='piggybank' && !await evaluate(client, `document.querySelector('${goalRoot} #reward-add-btn').textContent.includes('🪙')`)) throw new Error('Piggybank loses its chosen coin symbol.');
      await clickSelector(client, goalRoot+' #reward-reset-btn');
      await clickButton(client, 'Ja, leeren', true);
      await waitFor(client, type+' confirmed reset clears only count', `(${goalState})?.count===0 && (${goalState})?.goal===3 && (${goalState})?.style===${q(style)} && document.querySelector('${goalRoot}').textContent.includes('Gemeinsames Testziel')`);
      await auditMenu(type, 'Widget schließen');
    }
    console.log('✓ Scoreboard/class goals: real points, correction, tied winners, new round cancellation/confirmation, step restore; all four goal variants validate settings, reach/reset goal and restore progress.');
    await openAuditWidget('breathing', 'Atempause');
    const breath = '[data-widget-type="breathing"]';
    const breathState = `document.querySelector('${breath} [data-breathing-running]')`;
    if(await evaluate(client, `Boolean(document.querySelector('${breath} [aria-label="Ton ausschalten"]'))`)) await clickSelector(client, breath+' [aria-label="Ton ausschalten"]');
    await clickSelector(client, breath+' [aria-label="Atemdauer 30s"]');
    await clickSelector(client, breath+' [aria-label="Atemmuster 4-2-4 (Ruhe)"]');
    await waitFor(client, 'breathing controls and visual fit together', `(() => {const root=${breathState},r=root.getBoundingClientRect(),v=root.querySelector('[data-breathing-visual]').getBoundingClientRect(),c=root.querySelector('[data-breathing-controls]').getBoundingClientRect();return v.bottom<=c.top+1 && Array.from(root.querySelectorAll('button')).every(b=>{const t=b.getBoundingClientRect();return t.width>=44&&t.height>=44&&t.left>=r.left&&t.right<=r.right+1&&t.top>=r.top&&t.bottom<=r.bottom+1;});})()`);
    await clickSelector(client, breath+' [id^="breathing-toggle-btn-"]');
    await waitFor(client, 'breathing reaches real hold phase after inhaling', `${breathState}?.dataset.breathingRunning==='true' && ${breathState}?.dataset.breathingPhase==='hold'`, 10000);
    await clickSelector(client, breath+' [id^="breathing-toggle-btn-"]');
    const pausedBreath = await evaluate(client, `${breathState}.dataset.breathingElapsed`);
    await sleep(1100);
    if(await evaluate(client, `${breathState}.dataset.breathingElapsed`)!==pausedBreath) throw new Error('Paused breathing clock keeps advancing.');
    await auditMenu('breathing', 'Minimieren');
    await openAuditWidget('breathing', 'Atempause');
    await waitFor(client, 'paused breathing time rhythm duration and mute survive restore', `${breathState}?.dataset.breathingElapsed===${q(pausedBreath)} && ${breathState}?.dataset.breathingRunning==='false' && document.querySelector('${breath} [aria-label="Atemmuster 4-2-4 (Ruhe)"]')?.getAttribute('aria-pressed')==='true' && document.querySelector('${breath} [aria-label="Atemdauer 30s"]')?.getAttribute('aria-pressed')==='true' && Boolean(document.querySelector('${breath} [aria-label="Ton einschalten"]'))`);
    await clickSelector(client, breath+' [id^="breathing-toggle-btn-"]');
    await waitFor(client, 'breathing continues from paused time', `Number(${breathState}?.dataset.breathingElapsed)>${Number(pausedBreath)}`);
    await clickSelector(client, breath+' [aria-label="Atempause zurücksetzen"]');
    await waitFor(client, 'breathing reset preserves chosen settings and clears clock', `${breathState}?.dataset.breathingRunning==='false' && ${breathState}?.dataset.breathingElapsed==='0' && document.querySelector('${breath} [aria-label="Atemmuster 4-2-4 (Ruhe)"]')?.getAttribute('aria-pressed')==='true'`);
    await clickSelector(client, breath+' [aria-label="Atemdauer Endlos"]');
    await clickSelector(client, breath+' [aria-label="Ton einschalten"]');
    await auditMenu('breathing', 'Minimieren');
    await openAuditWidget('breathing', 'Atempause');
    await waitFor(client, 'breathing endless duration and sound choice survive restore', `document.querySelector('${breath} [aria-label="Atemdauer Endlos"]')?.getAttribute('aria-pressed')==='true' && Boolean(document.querySelector('${breath} [aria-label="Ton ausschalten"]'))`);
    await sleep(400);
    await saveScreenshot(client, SCREENSHOT_PATH.replace(/\.png$/, '-widget-breathing.png'));
    await auditMenu('breathing', 'Widget schließen');
    // Observe genuine Chrome AudioContexts/GainNodes, without replacing audio with a mock.
    await evaluate(client, `window.__auditNativeAudioContext=window.AudioContext;window.__auditCalmContexts=[];window.AudioContext=class extends window.__auditNativeAudioContext {constructor(...args){super(...args);this.auditGains=[];window.__auditCalmContexts.push(this);}createGain(){const gain=super.createGain();this.auditGains.push(gain);return gain;}}`);
    try {
      await openAuditWidget('calmrain', 'Fokus-Klänge');
      const calm = '[data-widget-type="calmrain"]';
      const calmState = `document.querySelector('${calm} [data-calm-playing]')`;
      const masterLabel = await evaluate(client, `Array.from(document.querySelectorAll('${calm} input[type="range"]')).find(i=>['Gesamtlautstärke','Master-Lautstärke'].includes(i.getAttribute('aria-label'))).getAttribute('aria-label')`);
      await setInputByLabel(client, masterLabel, '35');
      const windChip = calm+' #calmrain-track-btn-wind';
      if(await evaluate(client, `document.querySelector('${windChip}')?.getAttribute('aria-pressed')!=='true'`)) await clickSelector(client, windChip);
      await evaluate(client, `Array.from(document.querySelectorAll('${calm} button')).find(b=>b.textContent.trim()==='Regler').click()`);
      await waitFor(client, 'focus sound mixer exposes wind volume', `Boolean(document.querySelector('${calm} [aria-label="Lautstärke für Wind"]'))`);
      await setInputByLabel(client, 'Lautstärke für Wind', '25');
      await clickSelector(client, calm+' [aria-label="Klangdauer 5m"]');
      await clickSelector(client, calm+' [id^="calmrain-toggle-btn-"]');
      await waitFor(client, 'focus sounds start a genuine Chrome audio context and timer', `${calmState}?.dataset.calmPlaying==='true' && Number(${calmState}?.dataset.calmRemaining)>290 && window.__auditCalmContexts.length===1 && window.__auditCalmContexts[0].state==='running' && Math.abs(window.__auditCalmContexts[0].auditGains[0].gain.value-0.35)<0.001`);
      await setInputByLabel(client, masterLabel, '0');
      await waitFor(client, 'focus sounds mute the actual master gain completely', `window.__auditCalmContexts[0].auditGains[0].gain.value===0`);
      await auditMenu('calmrain', 'Minimieren');
      await openAuditWidget('calmrain', 'Fokus-Klänge');
      await waitFor(client, 'focus sounds retain playing muted state and timer on restore', `${calmState}?.dataset.calmPlaying==='true' && Number(${calmState}?.dataset.calmRemaining)>280 && window.__auditCalmContexts.length===1 && window.__auditCalmContexts[0].auditGains[0].gain.value===0 && document.querySelector('${calm} [aria-label="Klangdauer 5m"]')?.getAttribute('aria-pressed')==='true'`);
      await waitFor(client, 'focus sound mixer selection and volume survive restore', `document.querySelector('${calm} [aria-label="Lautstärke für Wind"]')?.value==='25' && document.querySelector('${calm} [aria-label="Lautstärke für Wind"]')?.disabled===false`);
      await setInputByLabel(client, masterLabel, '35');
      await waitFor(client, 'focus sounds restore selected audible gain', `Math.abs(window.__auditCalmContexts[0].auditGains[0].gain.value-0.35)<0.001`);
      await clickSelector(client, calm+' [aria-label="Klangdauer Endlos"]');
      await waitFor(client, 'focus sounds switch a running timer to endless', `${calmState}?.dataset.calmRemaining==='endless'`);
      await clickSelector(client, calm+' [id^="calmrain-toggle-btn-"]');
      await waitFor(client, 'focus sounds stop and close audio resources', `${calmState}?.dataset.calmPlaying==='false' && window.__auditCalmContexts.every(c=>c.state==='closed')`);
      await waitFor(client, 'master slider has a 44px interaction surface', `Array.from(document.querySelectorAll('${calm} input[type="range"]')).filter(i=>['Gesamtlautstärke','Master-Lautstärke'].includes(i.getAttribute('aria-label'))).every(i=>i.getBoundingClientRect().height>=44)`);
      for (const track of ['Regen','Wind','Kaminfeuer','Waldvögel','Waldbach']) {
        const slider = calm+' input[aria-label='+q('Lautstärke für '+track)+']';
        await evaluate(client, `document.querySelector(${q(slider)}).scrollIntoView({block:'nearest'})`);
        await waitFor(client, 'mixer reaches '+track+' with primary controls always visible', `(() => {const root=${calmState},r=root.getBoundingClientRect(),m=root.querySelector('[data-calm-mixer]').getBoundingClientRect(),s=document.querySelector(${q(slider)}).getBoundingClientRect();return s.top>=m.top-1&&s.bottom<=m.bottom+1&&Array.from(root.querySelectorAll('[data-calm-primary] button,[data-calm-primary] input')).every(b=>{const t=b.getBoundingClientRect();return t.width>=44&&t.height>=44&&t.left>=r.left&&t.right<=r.right+1&&t.top>=r.top&&t.bottom<=r.bottom+1;});})()`);
      }
      await sleep(400);
      await saveScreenshot(client, SCREENSHOT_PATH.replace(/\.png$/, '-widget-calmrain.png'));
      await clickSelector(client, calm+' [id^="calmrain-toggle-btn-"]');
      await waitFor(client, 'focus sounds restart with a fresh audio context', `window.__auditCalmContexts.length===2 && window.__auditCalmContexts[1].state==='running'`);
      await auditMenu('calmrain', 'Widget schließen');
      await waitFor(client, 'closing focus sounds releases the active audio context', `window.__auditCalmContexts.every(c=>c.state==='closed')`);
    } finally {
      await evaluate(client, `window.AudioContext=window.__auditNativeAudioContext;delete window.__auditNativeAudioContext;delete window.__auditCalmContexts`);
    }
    console.log('✓ Breathing/focus sounds: real breath phase, pause/resume/reset and restore; genuine audio start, exact zero mute, timer switch, stop/restart and close cleanup.');
    await openAuditWidget('dice', 'Tafel-Würfel');
    const diceRoot = '[data-widget-type="dice"]';
    const diceState = `document.querySelector('${diceRoot} [data-classroom-dice]')`;
    const diceValues = `JSON.parse(${diceState}.dataset.diceValues)`;
    await clickSelector(client, diceRoot+' [aria-label="6 Würfel auswählen"]');
    await waitFor(client, 'six dice and all controls fit at native size', `(() => {const root=${diceState},r=root.getBoundingClientRect();return (${diceValues}).length===6&&root.scrollWidth<=root.clientWidth+1&&root.scrollHeight<=root.clientHeight+1&&Array.from(root.querySelectorAll('button')).every(b=>{const t=b.getBoundingClientRect();return t.width>=44&&t.height>=44&&t.left>=r.left&&t.right<=r.right+1&&t.top>=r.top&&t.bottom<=r.bottom+1;});})()`);
    if(!await evaluate(client, `document.querySelector('${diceRoot} [aria-label="Einen Würfel hinzufügen"]').disabled`)) throw new Error('Dice count exceeds six.');
    for (const [mode,label] of [['sum','Summe'],['diff','Differenz'],['prod','Produkt']]) {
      await clickSelector(client, diceRoot+' [aria-label='+q('Rechenart '+label)+']');
      await clickSelector(client, diceRoot+' [aria-label="Würfelergebnis aufdecken"]');
      const expected = await evaluate(client, `(${diceValues}).reduce((a,v,i)=>${mode==='sum'?'a+v':mode==='prod'?'a*v':'i===0?v:a-v'},${mode==='prod'?1:0})`);
      await waitFor(client, 'dice calculate actual '+label, `Number(Array.from(document.querySelector('${diceRoot} [aria-label="Ergebnis wieder verdecken"]').querySelectorAll('span')).at(-1).textContent)===${expected}`);
      await waitFor(client, 'six dice '+label+' result and actions fit without inner scrolling', `(() => {const root=${diceState},r=root.getBoundingClientRect();return root.scrollWidth<=root.clientWidth+1&&root.scrollHeight<=root.clientHeight+1&&Array.from(root.querySelectorAll('button')).every(b=>{const t=b.getBoundingClientRect();return t.width>=44&&t.height>=44&&t.left>=r.left&&t.right<=r.right+1&&t.top>=r.top&&t.bottom<=r.bottom+1;});})()`);
      await clickSelector(client, diceRoot+' [aria-label="Ergebnis wieder verdecken"]');
      await waitFor(client, 'dice cover '+label+' again', `Boolean(document.querySelector('${diceRoot} [aria-label="Würfelergebnis aufdecken"]'))`);
    }
    await clickSelector(client, diceRoot+' [aria-label="Würfel werfen"]');
    await waitFor(client, 'dice block count changes during the real roll', `${diceState}?.dataset.diceRolling==='true' && document.querySelector('${diceRoot} [aria-label="6 Würfel auswählen"]').disabled && document.querySelector('${diceRoot} [aria-label="Einen Würfel entfernen"]').disabled`);
    await waitFor(client, 'dice finish with six valid faces', `${diceState}?.dataset.diceRolling==='false' && (${diceValues}).length===6 && (${diceValues}).every(v=>Number.isInteger(v)&&v>=1&&v<=6)`);
    const rolledDice = await evaluate(client, `${diceState}.dataset.diceValues`);
    await clickSelector(client, diceRoot+' [aria-label="Würfelergebnis aufdecken"]');
    await auditMenu('dice', 'Minimieren');
    await openAuditWidget('dice', 'Tafel-Würfel');
    await waitFor(client, 'dice faces mode and revealed result survive restore', `${diceState}?.dataset.diceValues===${q(rolledDice)} && ${diceState}?.dataset.diceMode==='prod' && Boolean(document.querySelector('${diceRoot} [aria-label="Ergebnis wieder verdecken"]'))`);
    await sleep(400);
    await saveScreenshot(client, SCREENSHOT_PATH.replace(/\.png$/, '-widget-dice.png'));
    await clickSelector(client, diceRoot+' [aria-label="1 Würfel auswählen"]');
    await waitFor(client, 'single die prevents removal and hides arithmetic mode controls', `(${diceValues}).length===1 && document.querySelector('${diceRoot} [aria-label="Einen Würfel entfernen"]').disabled && !document.querySelector('${diceRoot} [aria-label="Rechenart Summe"]')`);
    await clickSelector(client, diceRoot+' [aria-label="Einen Würfel hinzufügen"]');
    await waitFor(client, 'dice add and remove preserve the other face', `(${diceValues}).length===2`);
    const firstFace = await evaluate(client, `(${diceValues})[0]`);
    await clickSelector(client, diceRoot+' [aria-label="Einen Würfel entfernen"]');
    if(await evaluate(client, `(${diceValues})[0]`)!==firstFace) throw new Error('Removing a die changes the remaining face.');
    await auditMenu('dice', 'Widget schließen');
    await evaluate(client, `window.__auditNativePianoContext=window.AudioContext;window.__auditPianoContexts=[];window.AudioContext=class extends window.__auditNativePianoContext {constructor(...a){super(...a);this.auditOscillators=[];window.__auditPianoContexts.push(this);}createOscillator(){const o=super.createOscillator();this.auditOscillators.push(o);return o;}}`);
    try {
      await openAuditWidget('piano', 'Klassen-Klavier');
      const piano = '[data-widget-type="piano"]';
      const pianoRegion = piano+' [aria-label="Klassen-Klavier"]';
      await waitFor(client, 'all eight piano keys have visible 44px targets', `(() => {const root=document.querySelector('${pianoRegion}'),r=root.getBoundingClientRect(),keys=Array.from(root.querySelectorAll('button[aria-label*="Taste "]'));return keys.length===8 && keys.every(b=>{const t=b.getBoundingClientRect();return t.width>=44&&t.height>=44&&t.left>=r.left&&t.right<=r.right+1&&t.top>=r.top&&t.bottom<=r.bottom+1;});})()`);
      const notes = [['Do','C4',261.63],['Re','D4',293.66],['Mi','E4',329.63],['Fa','F4',349.23],['Sol','G4',392],['La','A4',440],['Si','B4',493.88],['Do','C5',523.25]];
      for (let i=0;i<notes.length;i++) {
        const [name,note,hz]=notes[i];
        await clickSelector(client, piano+' button[aria-label='+q(name+', '+note+', Taste '+(i+1))+']');
        await waitFor(client, 'piano plays genuine '+note+' frequency', `window.__auditPianoContexts.length===1 && window.__auditPianoContexts[0].state==='running' && window.__auditPianoContexts[0].auditOscillators.length===${(i+1)*3} && Math.abs(window.__auditPianoContexts[0].auditOscillators[${i*3}].frequency.value-${hz})<0.01 && document.querySelector('${piano} [role="status"]').textContent.includes(${q(note)})`);
      }
      const pressPianoKey = async key => {
        await client.send('Input.dispatchKeyEvent',{type:'keyDown',key,code:'Digit'+key});
        await client.send('Input.dispatchKeyEvent',{type:'keyUp',key,code:'Digit'+key});
      };
      await evaluate(client, `document.querySelector('${pianoRegion}').focus()`);
      await pressPianoKey('3');
      await waitFor(client, 'piano number key plays the matching note', `window.__auditPianoContexts[0].auditOscillators.length===27 && Math.abs(window.__auditPianoContexts[0].auditOscillators[24].frequency.value-329.63)<0.01`);
      await clickSelector(client, piano+' button[aria-label$="Einstellungen öffnen"]');
      const pianoSetting = async text => evaluate(client, `Array.from(document.querySelectorAll('${piano} button')).find(b=>b.textContent.trim()===${q(text)}).click()`);
      await pianoSetting('C D E');
      await pianoSetting('Leise');
      await pianoSetting('Farbpunkte anzeigen');
      await pressPianoKey('2');
      if(await evaluate(client, `window.__auditPianoContexts[0].auditOscillators.length`)!==27) throw new Error('Piano keyboard plays while settings are open.');
      await pianoSetting('Fertig');
      await auditMenu('piano', 'Minimieren');
      await openAuditWidget('piano', 'Klassen-Klavier');
      await clickSelector(client, piano+' button[aria-label$="Einstellungen öffnen"]');
      await waitFor(client, 'piano label volume and color settings survive restore', `['C D E','Leise','Farbpunkte ausblenden'].every(text=>Array.from(document.querySelectorAll('${piano} button')).some(b=>b.textContent.trim()===text && b.getAttribute('aria-pressed')===(text==='Farbpunkte ausblenden'?'false':'true')))`);
      await pianoSetting('Fertig');
      await evaluate(client, `document.querySelector('${pianoRegion}').focus()`);
      await pressPianoKey('4');
      await waitFor(client, 'piano reuses its audio context after restore', `window.__auditPianoContexts.length===1 && window.__auditPianoContexts[0].auditOscillators.length===30 && Math.abs(window.__auditPianoContexts[0].auditOscillators[27].frequency.value-349.23)<0.01`);
      await sleep(400);
      await saveScreenshot(client, SCREENSHOT_PATH.replace(/\.png$/, '-widget-piano.png'));
      await auditMenu('piano', 'Widget schließen');
      await waitFor(client, 'closing piano releases its genuine audio context', `window.__auditPianoContexts.every(c=>c.state==='closed')`);
    } finally {
      await evaluate(client, `window.AudioContext=window.__auditNativePianoContext;delete window.__auditNativePianoContext;delete window.__auditPianoContexts`);
    }
    console.log('✓ Dice/piano: six dice, real arithmetic and roll, count bounds and restore; eight genuine note frequencies, keyboard/settings guard, persisted options and audio cleanup.');



    // Five-widget math batch: independently calculate displayed tasks, then use the real UI.
    const auditWidgetMinimum = async type => {
      const minimumSizes={bodyparts:[620,560],compass:[620,560],weekdays:[620,560],trafficquiz:[800,560],watercycle:[760,560],dictionary:[460,540],patternmaker:[580,520],alphabetsoup:[640,560],morsecode:[620,560],hangman:[640,560],sorting:[420,520],vocabulary:[640,560],spellingdetective:[640,560],wordbuilder:[620,560],scrambler:[620,560],compoundsplit:[620,560],wordchain:[500,520],wordgrid:[640,560],wordscramble:[600,560],secretcode:[440,420],storyemojis:[640,560],abcorder:[640,560],sentencebuilding:[620,560],wordexplorer:[520,540],rhymemachine:[500,540],punctuationzoo:[620,560]};
      const [minimumWidth,minimumHeight]=minimumSizes[type]||[460,560];
      await waitFor(client,type+' resize grip is reachable after opening', `(() => {const h=document.querySelector('[data-widget-type=${q(type)}] [data-widget-resize="se"]'),r=h.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('[data-widget-resize]')?.dataset.widgetResize==='se';})()`);
      const point=await evaluate(client, `(() => {const h=document.querySelector('[data-widget-type=${q(type)}] [data-widget-resize="se"]'),r=h.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
      await client.send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});
      await client.send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
      const end={x:Math.max(1,point.x-500),y:Math.max(1,point.y-500)};
      await client.send('Input.dispatchMouseEvent',{type:'mouseMoved',...end,button:'left',buttons:1});
      // Let the live resize frame apply before releasing the pointer.
      await waitFor(client,type+' live drag reaches its configured minimum', `(() => {const r=document.querySelector('[data-widget-type=${q(type)}]').getBoundingClientRect();return Math.abs(r.width-${minimumWidth})<4&&Math.abs(r.height-${minimumHeight})<4;})()`);
      await client.send('Input.dispatchMouseEvent',{type:'mouseReleased',...end,button:'left',clickCount:1});
      await waitFor(client,type+' really reaches its configured minimum', `(() => {const r=document.querySelector('[data-widget-type=${q(type)}]').getBoundingClientRect();return Math.abs(r.width-${minimumWidth})<4&&Math.abs(r.height-${minimumHeight})<4;})()`);
    };
    const pressAuditKey = async (key,code=key) => {
      await client.send('Input.dispatchKeyEvent',{type:'keyDown',key,code});
      await client.send('Input.dispatchKeyEvent',{type:'keyUp',key,code});
    };
    const clickMathText = async (scope,text) => {
      await evaluate(client, `(() => {const b=Array.from(document.querySelectorAll(${q(scope+' button')})).find(b=>b.textContent.trim()===${q(text)});if(!b)throw new Error('Math control missing: '+${q(text)});b.click();})()`);
    };
    const calculateMathQuestion = question => {
      const missing=question.match(/^\? × (\d+) = (\d+)$/);
      if(missing) return Number(missing[2])/Number(missing[1]);
      const divisor=question.match(/^(\d+) ÷ \? = (\d+)$/);
      if(divisor) return Number(divisor[1])/Number(divisor[2]);
      const tokens=question.split(' ');
      if(tokens.length<3||tokens.length%2!==1) throw new Error('Unexpected displayed math task: '+question);
      let result=Number(tokens[0]);
      for(let i=1;i<tokens.length;i+=2){const operand=Number(tokens[i+1]);switch(tokens[i]){case '+':result+=operand;break;case '-':result-=operand;break;case '×':result*=operand;break;case '÷':result/=operand;break;default:throw new Error('Unknown math operator');}}
      if(!Number.isInteger(result)||result<0)throw new Error('Invalid displayed math result: '+question);
      return result;
    };
    const mathDialog='dialog[open][aria-label="Kopfrechnen-Einstellungen"]';
    for(const [type,search,mode] of [
      ['kopfrechnen','Kopfrechentrainer','flash'],
      ['mathcards','Mathe-Karten','flash'],
      ['multitrainer','Multi-Trainer','tables'],
      ['mathchain','Rechenkette','chain'],
    ]) {
      await openAuditWidget(type,search);
      const frame='[data-widget-type="'+type+'"]', root=frame+' [data-mental-math-mode]';
      const state=`document.querySelector(${q(root)})`, task=`document.querySelector(${q(root+' [data-mental-math-question]')})`;
      await waitFor(client,type+' opens its migrated mode',`${state}?.dataset.mentalMathMode===${q(mode)}`);
      await auditWidgetMinimum(type);
      await clickSelector(client,frame+' button[aria-label$="Einstellungen öffnen"]');
      await waitFor(client,type+' opens a native settings dialog',`Boolean(document.querySelector(${q(mathDialog)}))`);
      if(mode==='flash'){
        await clickMathText(mathDialog,type==='mathcards'?'ZR1000':'ZR20');
        // Exercise operation toggles without allowing an empty set.
        for(const op of ['+','-','×','÷']){
          const selected=await evaluate(client,`document.querySelector(${q(mathDialog+' [aria-label="Rechenart '+op+'"]')}).getAttribute('aria-pressed')==='true'`);
          if(selected !== (op==='+'))await clickSelector(client,mathDialog+' [aria-label="Rechenart '+op+'"]');
        }
      } else if(mode==='tables'){
        await clickMathText(mathDialog,'Kernaufgaben (2, 5, 10)');
        await clickMathText(mathDialog,'? × 4 = 24');
      } else {
        await clickMathText(mathDialog,'5');
        await clickMathText(mathDialog,'Anspruchsvoll');
        await clickMathText(mathDialog,'Zwischenschritte einblenden');
      }
      await waitFor(client,type+' settings do not overflow horizontally and have reachable 44px controls',`(() => {const d=document.querySelector(${q(mathDialog)}),r=d.getBoundingClientRect();return d.scrollWidth<=d.clientWidth+1&&r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&Array.from(d.querySelectorAll('button')).every(b=>b.getBoundingClientRect().height>=44);})()`);
      await pressAuditKey('Escape');
      await waitFor(client,type+' closes settings and returns focus',`!document.querySelector(${q(mathDialog)}) && document.activeElement?.matches(${q(frame+' button[aria-label$="Einstellungen öffnen"]')})`);
      const question=await evaluate(client,`${task}.dataset.mentalMathQuestion`), expected=calculateMathQuestion(question);
      if(!await evaluate(client,`${task}.textContent.replace(/\\s/g,'').includes(${q(question.replace(/\s/g,''))})`))throw new Error(type+' task instrumentation disagrees with the visible formula.');
      if(await evaluate(client,`Boolean(document.querySelector(${q(root+' [data-mental-math-answer]')}))`))throw new Error(type+' starts with its answer exposed.');
      await clickMathText(root,'Lösung aufdecken');
      await waitFor(client,type+' reveals independently calculated answer',`Number(document.querySelector(${q(root+' [data-mental-math-answer]')})?.textContent)===${expected}`);
      await clickMathText(root,'Lösung verbergen');
      await clickSelector(client,root+' [aria-label="Schüler-Modus"]');
      await waitFor(client,type+' presentation changes preserve the problem',`${task}.dataset.mentalMathQuestion===${q(question)} && ${state}.dataset.mentalMathPresentation==='student'`);
      const fits=`(() => {const el=${state},r=el.getBoundingClientRect();const f=${task}.getBoundingClientRect();return f.top>=el.firstElementChild.getBoundingClientRect().bottom-1&&f.bottom<=el.lastElementChild.getBoundingClientRect().top+1&&el.scrollWidth<=el.clientWidth+1&&el.scrollHeight<=el.clientHeight+1&&Array.from(el.querySelectorAll('button,input')).every(b=>{const t=b.getBoundingClientRect();return t.width>=44&&t.height>=44&&t.left>=r.left-1&&t.right<=r.right+1&&t.top>=r.top-1&&t.bottom<=r.bottom+1;});})()`;
      await waitFor(client,type+' student keypad and actions fit at the true minimum',fits);
      await setInputByLabel(client,'Ergebnis eingeben',String(expected+1));
      await clickMathText(root,'Prüfen');
      await waitFor(client,type+' wrong answer preserves task and hides solution',`${state}.dataset.mentalMathFeedback==='try_again' && ${task}.dataset.mentalMathQuestion===${q(question)} && !document.querySelector(${q(root+' [data-mental-math-answer]')})`);
      await waitFor(client,type+' retry feedback fits with the keypad',fits);
      await clickSelector(client,root+' [aria-label="Ergebnis löschen"]');
      for(const digit of String(expected))await clickMathText(root,digit);
      await clickMathText(root,'0');
      await clickSelector(client,root+' [aria-label="Letzte Ziffer löschen"]');
      await waitFor(client,type+' touchscreen keypad enters and deletes actual digits',`document.querySelector(${q(root+' input[aria-label="Ergebnis eingeben"]')}).value===${q(String(expected))}`);
      await evaluate(client,`document.querySelector(${q(root+' input')}).focus()`);
      await pressAuditKey('Enter');
      await waitFor(client,type+' keyboard checks the genuine result',`${state}.dataset.mentalMathFeedback==='correct' && Number(document.querySelector(${q(root+' [data-mental-math-answer]')})?.textContent)===${expected}`);
      await auditMenu(type,'Minimieren');
      await openAuditWidget(type,search);
      await waitFor(client,type+' task answer feedback and presentation survive restore',`${state}?.dataset.mentalMathFeedback==='correct' && ${state}.dataset.mentalMathPresentation==='student' && ${task}.dataset.mentalMathQuestion===${q(question)} && document.querySelector(${q(root+' input')}).value===${q(String(expected))}`);
      await waitFor(client,type+' correct feedback fits after restore',fits);
      await sleep(400);
      await saveScreenshot(client,SCREENSHOT_PATH.replace(/\.png$/,'-widget-'+type+'.png'));
      await clickMathText(root,'Weiter');
      await waitFor(client,type+' continue clears input feedback and answer',`${state}.dataset.mentalMathFeedback==='idle' && document.querySelector(${q(root+' input')}).value==='' && !document.querySelector(${q(root+' [data-mental-math-answer]')})`);
      // Every alias must also retain settings without changing the current task.
      const nextQuestion=await evaluate(client,`${task}.dataset.mentalMathQuestion`);
      await clickSelector(client,frame+' button[aria-label$="Einstellungen öffnen"]');
      const setting=mode==='flash'?(type==='mathcards'?'ZR1000':'ZR20'):mode==='tables'?'? × 4 = 24':'5';
      if(!await evaluate(client,`Array.from(document.querySelectorAll(${q(mathDialog+' button')})).some(b=>b.textContent.trim()===${q(setting)}&&b.getAttribute('aria-pressed')==='true')`))throw new Error(type+' loses its selected setting.');
      await clickSelector(client,mathDialog+' [aria-label="Kopfrechnen-Einstellungen schließen"]');
      await waitFor(client,type+' closing settings does not generate a new task',`!document.querySelector(${q(mathDialog)}) && ${task}.dataset.mentalMathQuestion===${q(nextQuestion)}`);
      if(mode==='tables') {
        for(const variant of ['24 ÷ 6 = ?','6 × 4 = ?']){
          await clickSelector(client,frame+' button[aria-label$="Einstellungen öffnen"]');
          await clickMathText(mathDialog,variant);
          await clickSelector(client,mathDialog+' [aria-label="Kopfrechnen-Einstellungen schließen"]');
          const answer=calculateMathQuestion(await evaluate(client,`${task}.dataset.mentalMathQuestion`));
          await setInputByLabel(client,'Ergebnis eingeben',String(answer));
          await clickMathText(root,'Prüfen');
          await waitFor(client,'table variant '+variant+' checks actual arithmetic',`${state}.dataset.mentalMathFeedback==='correct' && Number(document.querySelector(${q(root+' [data-mental-math-answer]')})?.textContent)===${answer}`);
        }
      }
      await auditMenu(type,'Widget schließen');
    }
    await openAuditWidget('sorting','Zahlensortierer');
    const sortingFrame='[data-widget-type="sorting"]',sortingRoot=sortingFrame+' [aria-label="Zahlensortierer"]';
    const sortingNumbers=`Array.from(document.querySelectorAll(${q(sortingRoot+' button[aria-label$=" wählen"]')})).map(b=>Number(b.textContent.trim().replace(',','.')))`;
    const sortingResult=`Array.from(document.querySelectorAll(${q(sortingRoot+' [aria-label="Bereits richtig sortierte Zahlen"] span')})).map(el=>el.textContent.trim())`;
    const sortingStatus=`document.querySelector(${q(sortingRoot+' [role="status"]')}).textContent`;
    await auditWidgetMinimum('sorting');
    await clickSelector(client,sortingFrame+' button[aria-label$="Einstellungen öffnen"]');
    await clickMathText(sortingRoot,'7 Zahlen');
    await clickMathText(sortingRoot,'Bestätigungston an');
    await clickMathText(sortingRoot,'Zahlenraum 1000');
    await clickMathText(sortingRoot,'Fertig');
    for(const [range,direction] of [['Zahlenraum 1000','asc'],['Dezimalzahlen 0–10','asc'],['Negative Zahlen −50 bis 50','desc']]){
      if(range!=='Zahlenraum 1000'){
        await clickSelector(client,sortingFrame+' button[aria-label$="Einstellungen öffnen"]');
        await clickMathText(sortingRoot,range);
        await clickMathText(sortingRoot,direction==='asc'?'Klein → groß':'Groß → klein');
        await clickMathText(sortingRoot,'Fertig');
      }
      await waitFor(client,'seven sorting numbers fit natively without inner scrolling',`(() => {const root=document.querySelector(${q(sortingRoot)}),r=root.getBoundingClientRect();return (${sortingNumbers}).length===7&&root.scrollWidth<=root.clientWidth+1&&root.scrollHeight<=root.clientHeight+1&&Array.from(root.querySelectorAll('button')).every(b=>{const t=b.getBoundingClientRect();return t.width>=44&&t.height>=44&&t.left>=r.left&&t.right<=r.right+1&&t.top>=r.top&&t.bottom<=r.bottom+1;});})()`);
      const numbers=await evaluate(client,sortingNumbers),ordered=[...numbers].sort((a,b)=>direction==='asc'?a-b:b-a);
      if(new Set(numbers).size!==7)throw new Error('Sorting task contains duplicates.');
      const numberSelector=n=>sortingRoot+' [aria-label='+q(String(n).replace('.',',')+' wählen')+']';
      await clickSelector(client,numberSelector(ordered.at(-1)));
      await waitFor(client,'wrong sorting choice leaves every result slot empty',`(${sortingStatus}).includes(${q(direction==='asc'?'zu groß':'zu klein')}) && (${sortingResult}).every(text=>text==='·')`);
      await clickSelector(client,numberSelector(ordered[0]));
      await auditMenu('sorting','Minimieren');
      await openAuditWidget('sorting','Zahlensortierer');
      await waitFor(client,'sorting numbers and first correct step survive restore',`JSON.stringify(${sortingNumbers})===${q(JSON.stringify(numbers))} && (${sortingResult})[0]===${q(String(ordered[0]).replace('.',','))}`);
      for(const number of ordered.slice(1))await clickSelector(client,numberSelector(number));
      await waitFor(client,'sorting completes the genuine '+direction+' order',`(${sortingStatus}).includes('Geschafft!') && JSON.stringify(${sortingResult})===${q(JSON.stringify(ordered.map(n=>String(n).replace('.',','))))} && Array.from(document.querySelectorAll(${q(sortingRoot+' button[aria-label$=" wählen"]')})).every(b=>b.disabled)`);
      await sleep(400);
      await saveScreenshot(client,SCREENSHOT_PATH.replace(/\.png$/,'-widget-sorting-'+direction+(range.includes('Dezimal')?'-decimal':'')+'.png'));
      await clickMathText(sortingRoot,'Neue Aufgabe');
      await waitFor(client,'new sorting task clears results and re-enables seven choices',`(${sortingResult}).every(text=>text==='·') && Array.from(document.querySelectorAll(${q(sortingRoot+' button[aria-label$=" wählen"]')})).every(b=>!b.disabled)`);
    }
    await clickSelector(client,sortingFrame+' button[aria-label$="Einstellungen öffnen"]');
    for(const label of ['7 Zahlen','Groß → klein','Negative Zahlen −50 bis 50'])if(!await evaluate(client,`Array.from(document.querySelectorAll(${q(sortingRoot+' button')})).some(b=>b.textContent.trim()===${q(label)}&&b.getAttribute('aria-pressed')==='true')`))throw new Error('Sorting loses setting '+label);
    if(!await evaluate(client,`Array.from(document.querySelectorAll(${q(sortingRoot+' button')})).some(b=>b.textContent.trim()==='Bestätigungston aus'&&b.getAttribute('aria-pressed')==='false')`))throw new Error('Sorting loses disabled audio setting.');
    await clickMathText(sortingRoot,'Fertig');
    await auditMenu('sorting','Widget schließen');
    console.log('✓ Five math widgets: independently calculated answers, wrong/correct input, real keypad and keyboard, native minimum layouts/settings, restore and continue; sorting seven integers/decimals/negative numbers in both directions.');

    // Five German widgets: edit real lists/tasks, then exercise their actual lesson workflows.
    const languageFits = root => `(() => {const el=document.querySelector(${q(root)}),r=el.getBoundingClientRect();return el.scrollWidth<=el.clientWidth+1&&el.scrollHeight<=el.clientHeight+1&&Array.from(el.querySelectorAll('button,input,[role="button"],[data-abc-word]')).every(b=>{const t=b.getBoundingClientRect();return t.width>=44&&t.height>=44&&t.left>=r.left-1&&t.right<=r.right+1&&t.top>=r.top-1&&t.bottom<=r.bottom+1&&(b.disabled||b.contains(document.elementFromPoint(t.x+t.width/2,t.y+t.height/2)));});})()`;
    const listDialog='dialog[open][aria-label="Lernwortliste verwalten"]';
    for(const [type,search,initialMode] of [['vocabulary','Lernwörter-Studio','cards'],['spellingdetective','Rechtschreib-Detektiv','spelling'],['abcorder','ABC-Sortierer','alphabet']]){
      await openAuditWidget(type,search);
      const frame='[data-widget-type="'+type+'"]',root=frame+' [data-learning-word-mode]',state=`document.querySelector(${q(root)})`;
      await waitFor(client,type+' opens the right learning mode',`${state}?.dataset.learningWordMode===${q(initialMode)}`);
      await auditWidgetMinimum(type);
      await clickSelector(client,frame+' button[aria-label$="Einstellungen öffnen"]');
      await waitFor(client,type+' opens the native list editor',`Boolean(document.querySelector(${q(listDialog)}))`);
      // Only seeded CI data is changed. Replace the sample words with a known teacher list.
      await evaluate(client,`(() => {const dialog=document.querySelector(${q(listDialog)});for(const b of Array.from(dialog.querySelectorAll('button[aria-label$=" löschen"]')))b.click();})()`);
      await waitFor(client,type+' deletes the sample word list',`document.querySelectorAll(${q(listDialog+' [data-managed-word]')}).length===0`);
      await clickMathText(listDialog,'Import (Liste / Komma)');
      const words=['Sommer','Apfel','Zebra','Biene','Hase','Katze','Wasser'];
      await setInputByLabel(client,'Lernwörter importieren',words.concat('Sommer').join('\n'));
      await clickMathText(listDialog,'Wörter importieren');
      await waitFor(client,type+' imports seven words and skips a duplicate',`document.querySelectorAll(${q(listDialog+' [data-managed-word]')}).length===7 && document.querySelector(${q(listDialog)}).textContent.includes('Dublette')`);
      await clickSelector(client,listDialog+' [aria-label="Wort Zebra bearbeiten"]');
      await setInputByLabel(client,'Lernwort bearbeiten','Ziege');
      await clickSelector(client,listDialog+' [aria-label="Wortänderung speichern"]');
      await waitFor(client,type+' edits the real word rather than adding another',`document.querySelectorAll(${q(listDialog+' [data-managed-word]')}).length===7 && Boolean(document.querySelector(${q(listDialog+' [data-managed-word="Ziege"]')})) && !document.querySelector(${q(listDialog+' [data-managed-word="Zebra"]')})`);
      await clickSelector(client,listDialog+' [aria-label="Wort Ziege löschen"]');
      await setInputByLabel(client,'Neues Lernwort','Blume');
      await clickMathText(listDialog,'Hinzufügen');
      await waitFor(client,type+' adds a single replacement word',`document.querySelectorAll(${q(listDialog+' [data-managed-word]')}).length===7 && Boolean(document.querySelector(${q(listDialog+' [data-managed-word="Blume"]')}))`);
      await pressAuditKey('Escape');
      await waitFor(client,type+' closes list editor with focus on its gear',`!document.querySelector(${q(listDialog)}) && document.activeElement?.matches(${q(frame+' .cockpit-widget-settings-trigger')})`);
      await clickSelector(client,root+' #mode-btn-cards');
      await waitFor(client,type+' shows the first actual teacher word',`document.querySelector(${q(root+' [data-learning-word-visible]')})?.textContent.trim()==='Sommer' && ${state}.dataset.learningWordCount==='7'`);
      await waitFor(client,type+' card controls fit at the dragged minimum',languageFits(root));
      await evaluate(client,`document.querySelector(${q(root+' [role="button"]')}).focus()`);
      await pressAuditKey(' ','Space');
      await waitFor(client,type+' Space covers the card exactly once',`${state}.dataset.learningWordCovered==='true' && !document.querySelector(${q(root+' [data-learning-word-visible]')})`);
      await pressAuditKey(' ','Space');
      await waitFor(client,type+' Space reveals the same card',`${state}.dataset.learningWordCovered==='false' && document.querySelector(${q(root+' [data-learning-word-visible]')})?.textContent.trim()==='Sommer'`);
      await evaluate(client,`${state}.focus()`);
      await pressAuditKey('ArrowRight');
      await waitFor(client,type+' keyboard advances exactly one word',`${state}.dataset.learningWordIndex==='1' && document.querySelector(${q(root+' [data-learning-word-visible]')})?.textContent.trim()==='Apfel'`);
      await clickSelector(client,root+' #cards-btn-prev');
      await clickSelector(client,root+' #cards-btn-prev');
      await waitFor(client,type+' previous wraps to the last teacher word',`${state}.dataset.learningWordIndex==='6' && document.querySelector(${q(root+' [data-learning-word-visible]')})?.textContent.trim()==='Blume'`);
      await clickSelector(client,root+' #cards-btn-next');
      await clickSelector(client,root+' #mode-btn-spelling');
      await clickMathText(root,'Doppel-Konsonant');
      await clickSelector(client,root+' [aria-label="Buchstabe 3: m"]');
      await clickSelector(client,root+' [aria-label="Buchstabe 4: m"]');
      await waitFor(client,type+' marks both actual double consonants',`document.querySelectorAll(${q(root+' [data-word-highlight="doppelkonsonant"]')}).length===2`);
      await waitFor(client,type+' spelling letters categories and marked range all fit',languageFits(root));
      await auditMenu(type,'Minimieren');
      await openAuditWidget(type,search);
      await waitFor(client,type+' spelling word list and highlights survive restore',`${state}?.dataset.learningWordMode==='spelling' && ${state}.dataset.learningWordCount==='7' && document.querySelectorAll(${q(root+' [data-word-highlight="doppelkonsonant"]')}).length===2`);
      await waitFor(client,type+' spelling controls fit after restore',languageFits(root));
      await sleep(400);
      await saveScreenshot(client,SCREENSHOT_PATH.replace(/\.png$/,'-widget-'+type+'-spelling.png'));
      await clickSelector(client,root+' #mode-btn-alphabet');
      await waitFor(client,type+' ABC list has multiple native pages',`!document.querySelector(${q(root+' [aria-label="Nächste ABC-Seite"]')}).disabled`);
      await clickSelector(client,root+' [aria-label="Wort Apfel nach oben verschieben"]');
      await waitFor(client,type+' ABC move changes the genuine word order',`document.querySelector(${q(root+' [data-abc-word]')})?.dataset.abcWord==='Apfel'`);
      await clickMathText(root,'Automatisch sortieren (de-AT)');
      const expectedWords=['Sommer','Apfel','Biene','Hase','Katze','Wasser','Blume'].sort((a,b)=>a.localeCompare(b,'de-AT'));
      const allWords=[];
      for(let page=0;page<10;page++){
        await waitFor(client,type+' ABC page '+page+' fits without a scroll pane',languageFits(root));
        allWords.push(...await evaluate(client,`Array.from(document.querySelectorAll(${q(root+' [data-abc-word]')})).map(el=>el.dataset.abcWord)`));
        if(await evaluate(client,`document.querySelector(${q(root+' [aria-label="Nächste ABC-Seite"]')}).disabled`))break;
        await clickSelector(client,root+' [aria-label="Nächste ABC-Seite"]');
      }
      if(JSON.stringify(allWords)!==JSON.stringify(expectedWords))throw new Error(type+' ABC pages lose or misorder teacher words: '+JSON.stringify(allWords));
      await waitFor(client,type+' last ABC word cannot move down',`document.querySelector(${q(root+' [aria-label="Wort Wasser nach unten verschieben"]')}).disabled`);
      await sleep(400);
      await saveScreenshot(client,SCREENSHOT_PATH.replace(/\.png$/,'-widget-'+type+'-abc.png'));
      await clickSelector(client,frame+' button[aria-label$="Einstellungen öffnen"]');
      await waitFor(client,type+' word editor retains the actual seven-word list',`document.querySelectorAll(${q(listDialog+' [data-managed-word]')}).length===7`);
      await clickSelector(client,listDialog+' [aria-label="Lernwortliste schließen"]');
      await auditMenu(type,'Widget schließen');
    }
    const workshopDialog='dialog[open][aria-label="Wörter und Sätze bearbeiten"]';
    for(const [type,search,label,mode,target,parts] of [
      ['wordbuilder','Wort-Baukasten','Wort-Baukasten','word','SOMMER',['SOM','MER']],
      ['scrambler','scrambler','Wort- & Satzwerkstatt','sentence','Wir lesen heute im Garten.',['Wir','lesen','heute','im','Garten.']],
      ['compoundsplit','Zusammengesetzte Wörter','Zusammengesetzte Wörter','compound','Schultasche',['Schul','tasche']],
      ['sentencebuilding','Satzbau','Satzbau','sentence','Wir lesen heute im Garten.',['Wir','lesen','heute','im','Garten.']],
    ]){
      await openAuditWidget(type,search,label);
      const frame='[data-widget-type="'+type+'"]',root=frame+' [data-language-workshop-mode]',state=`document.querySelector(${q(root)})`;
      const cards=`Array.from(document.querySelectorAll(${q(root+' button[id^="card-item-"]')})).map(b=>b.querySelector('span').textContent)`;
      await waitFor(client,type+' starts its migrated task mode',`${state}?.dataset.languageWorkshopMode===${q(mode)}`);
      await auditWidgetMinimum(type);
      await clickSelector(client,frame+' button[aria-label$="Einstellungen öffnen"]');
      await waitFor(client,type+' gear opens its native task editor',`Boolean(document.querySelector(${q(workshopDialog)}))`);
      if(mode==='word'){
        await setInputByLabel(client,'Zielwort',target);
        await setInputByLabel(client,'Wortbausteine','SON-MER');
        await clickMathText(workshopDialog,'Hinzufügen');
        await waitFor(client,'impossible word parts are rejected in the real editor',`document.querySelector(${q(workshopDialog+' [role="alert"]')})?.textContent.includes('genau das Zielwort')`);
        await setInputByLabel(client,'Wortbausteine',parts.join('|'));
      }else if(mode==='compound'){
        await setInputByLabel(client,'Zusammengesetztes Wort',target);
        await setInputByLabel(client,'Wortbestandteile','Schuh|tasche');
        await clickMathText(workshopDialog,'Hinzufügen');
        await waitFor(client,'impossible compound parts are rejected in the real editor',`document.querySelector(${q(workshopDialog+' [role="alert"]')})?.textContent.includes('zusammengesetzte Wort')`);
        await setInputByLabel(client,'Wortbestandteile',parts.join('|'));
      }else await setInputByLabel(client,'Vollständiger Satz',target);
      await clickMathText(workshopDialog,'Hinzufügen');
      await waitFor(client,type+' accepts the corrected teacher task',`!document.querySelector(${q(workshopDialog+' [role="alert"]')}) && Array.from(document.querySelectorAll(${q(workshopDialog+' input')})).every(input=>input.value==='')`);
      await pressAuditKey('Escape');
      await waitFor(client,type+' Escape closes editor and returns gear focus',`!document.querySelector(${q(workshopDialog)}) && document.activeElement?.matches(${q(frame+' .cockpit-widget-settings-trigger')})`);
      await clickSelector(client,root+' #btn-prev-task'); // Wrap from the first preset to the new teacher task.
      await waitFor(client,type+' actual cards contain the teacher task',`JSON.stringify((${cards}).slice().sort())===${q(JSON.stringify(parts.slice().sort()))}`);
      const orderCards=async desired=>{
        for(let destination=0;destination<desired.length;destination++){
          let values=await evaluate(client,cards),position=values.indexOf(desired[destination],destination);
          if(position<0)throw new Error('Teacher card missing: '+desired[destination]);
          if(position===destination)continue;
          await clickSelector(client,root+' #card-item-'+position);
          while(position>destination){await clickSelector(client,root+' #btn-move-left');position--;}
        }
      };
      await orderCards(parts.slice().reverse());
      await clickSelector(client,root+' #btn-check');
      await waitFor(client,type+' wrong real arrangement is not accepted',`Boolean(document.querySelector(${q(root+' #feedback-incorrect')}))`);
      await waitFor(client,type+' wrong arrangement and all controls fit at minimum',languageFits(root));
      await orderCards(parts);
      await clickSelector(client,root+' #btn-check');
      await waitFor(client,type+' manually ordered teacher task checks correctly',`Boolean(document.querySelector(${q(root+' #feedback-correct')})) && JSON.stringify(${cards})===${q(JSON.stringify(parts))}`);
      // Genuine local keyboard move must not be intercepted by another widget.
      await clickSelector(client,root+' #card-item-1');
      await evaluate(client,`${state}.focus()`);
      await pressAuditKey('ArrowLeft');
      await waitFor(client,type+' focused keyboard moves the selected card once',`(${cards})[0]===${q(parts[1])}`);
      await clickSelector(client,root+' #btn-show-solution');
      await waitFor(client,type+' visible solution restores the genuine teacher order',`JSON.stringify(${cards})===${q(JSON.stringify(parts))} && Boolean(document.querySelector(${q(root+' #feedback-correct')}))`);
      if(mode==='word')await clickSelector(client,root+' #btn-toggle-cover');
      if(mode==='compound')await clickSelector(client,root+' #btn-toggle-compound-split');
      await auditMenu(type,'Minimieren');
      await openAuditWidget(type,search,label);
      await waitFor(client,type+' task mode cards and success survive restore',`${state}?.dataset.languageWorkshopMode===${q(mode)} && JSON.stringify(${cards})===${q(JSON.stringify(parts))} && Boolean(document.querySelector(${q(root+' #feedback-correct')}))`);
      if(mode==='word'&&!await evaluate(client,`document.querySelector(${q(root+' #btn-toggle-cover')}).textContent.includes('Aufdecken')`))throw new Error('Word cover state is lost.');
      if(mode==='compound'&&!await evaluate(client,`document.querySelector(${q(root+' #btn-toggle-compound-split')}).textContent.includes('Zusammenfügen')`))throw new Error('Compound separation state is lost.');
      await waitFor(client,type+' solution and controls fit after restore',languageFits(root));
      await sleep(400);
      await saveScreenshot(client,SCREENSHOT_PATH.replace(/\.png$/,'-widget-'+type+'.png'));
      await clickSelector(client,root+' #btn-next-task');
      await waitFor(client,type+' next task clears previous feedback',`!document.querySelector(${q(root+' #feedback-correct')}) && !document.querySelector(${q(root+' #feedback-incorrect')})`);
      await auditMenu(type,'Widget schließen');
    }
    console.log('✓ Five German widgets: native editors/gear/focus, seven teacher words with import/edit/delete, card Space and navigation, spelling ranges, complete ABC pages, real word/sentence/compound tasks, wrong/correct order, keyboard/solution and restore at exact minimum sizes.');

    // Five further German widgets: solve the visible game, rather than seeding lifecycle answers.
    const wordplayScreens = async type => { await waitFor(client,type+' all native lesson controls fit',languageFits('[data-widget-type="'+type+'"] [data-wordplay-root]')); await sleep(400);await saveScreenshot(client,SCREENSHOT_PATH.replace(/\.png$/,'-widget-'+type+'.png')); };
    await openAuditWidget('wordchain','Wortketten-Spiel');
    await auditWidgetMinimum('wordchain');
    const chainRoot='[data-widget-type="wordchain"] [data-wordchain-count]';
    await evaluate(client,`document.querySelector(${q(chainRoot)}).dataset.wordplayRoot=''`);
    await setInputByLabel(client,'Nächstes Kettenwort','Maus');
    await clickMathText(chainRoot,'Senden');
    await waitFor(client,'wordchain rejects an incorrect first letter',`document.querySelector(${q(chainRoot+' [role="status"]')})?.textContent.includes("'R'") && document.querySelector(${q(chainRoot)}).dataset.wordchainCount==='4'`);
    await clickMathText(chainRoot,'💡 Tipp');
    await waitFor(client,'wordchain offers real R word hints',`Array.from(document.querySelectorAll(${q(chainRoot+' button')})).some(b=>b.textContent.trim().startsWith('Robbe')||b.textContent.trim().startsWith('Rakete')||b.textContent.trim().startsWith('Regen')||b.textContent.trim().startsWith('Ring')||b.textContent.trim().startsWith('Rad'))`);
    const appended=['Robbe','Ente','Eis','Sonne','Erde','Eimer','Rad','Dach','Hund','Dino','Opa','Ast','Tanne'];
    for(const word of appended){await setInputByLabel(client,'Nächstes Kettenwort',word);await clickMathText(chainRoot,'Senden');}
    await waitFor(client,'wordchain stores seventeen actual chain words',`document.querySelector(${q(chainRoot)}).dataset.wordchainCount==='17'`);
    await setInputByLabel(client,'Nächstes Kettenwort','Esel');await clickMathText(chainRoot,'Senden');
    await waitFor(client,'wordchain rejects a duplicate',`document.querySelector(${q(chainRoot+' [role="status"]')})?.textContent.includes('bereits verwendet') && document.querySelector(${q(chainRoot)}).dataset.wordchainCount==='17'`);
    await clickMathText(chainRoot,'Zurück ⬅️');
    await waitFor(client,'wordchain removes precisely its last word',`document.querySelector(${q(chainRoot)}).dataset.wordchainCount==='16' && document.querySelector(${q(chainRoot)}).dataset.wordchainLetter==='T'`);
    while(!await evaluate(client,`document.querySelector(${q(chainRoot+' [aria-label="Vorherige Kettenseite"]')}).disabled`))await clickSelector(client,chainRoot+' [aria-label="Vorherige Kettenseite"]');
    const chainWords=[];
    for(let page=0;page<10;page++){await waitFor(client,'wordchain page '+page+' remains readable',languageFits(chainRoot));chainWords.push(...await evaluate(client,`Array.from(document.querySelectorAll(${q(chainRoot+' [data-chain-word]')})).map(b=>b.dataset.chainWord)`));if(await evaluate(client,`document.querySelector(${q(chainRoot+' [aria-label="Nächste Kettenseite"]')}).disabled`))break;await clickSelector(client,chainRoot+' [aria-label="Nächste Kettenseite"]');}
    if(JSON.stringify(chainWords)!==JSON.stringify(['Esel','Löwe','Elefant','Tiger',...appended.slice(0,-1)]))throw Error('Wortketten pages lost real words');
    await setInputByLabel(client,'Nächstes Kettenwort','Tanne');
    await auditMenu('wordchain','Minimieren');await openAuditWidget('wordchain','Wortketten-Spiel');
    await waitFor(client,'wordchain restores chain and draft',`document.querySelector(${q(chainRoot)}).dataset.wordchainCount==='16' && document.querySelector(${q(chainRoot+' input')}).value==='Tanne'`);
    await evaluate(client,`document.querySelector(${q(chainRoot)}).dataset.wordplayRoot=''`);await wordplayScreens('wordchain');await auditMenu('wordchain','Widget schließen');

    await openAuditWidget('wordgrid','Buchstaben-Suchgitter');await auditWidgetMinimum('wordgrid');
    const gridRoot='[data-widget-type="wordgrid"] [data-wordgrid-difficulty]';
    for(const [difficulty,label,count,size] of [['easy','Leicht (5×5)',3,5],['medium','Mittel (6×6)',4,6],['hard','Schwer (9×9)',5,9]]){
      await clickMathText(gridRoot,label);
      await waitFor(client,'wordgrid '+difficulty+' has the expected genuine grid',`document.querySelectorAll(${q(gridRoot+' [data-grid-cell]')}).length===${size*size} && document.querySelector(${q(gridRoot)}).dataset.wordgridDifficulty===${q(difficulty)}`);
      await clickSelector(client,gridRoot+' [data-grid-cell="0-0"]');
      await evaluate(client,`Array.from(document.querySelectorAll(${q(gridRoot+' button')})).find(b=>b.textContent.startsWith('Wort prüfen')).click()`);
      await waitFor(client,'wordgrid rejects a single unrelated letter',`document.querySelector(${q(gridRoot)}).dataset.wordgridStars==='0' && document.querySelector(${q(gridRoot+' [role="status"]')}).textContent.includes('Kein passendes Wort')`);
      const targets=await evaluate(client,`Array.from(document.querySelectorAll(${q(gridRoot+' [data-grid-target]')})).map(b=>b.dataset.gridTarget)`);
      if(targets.length!==count)throw Error('Unexpected target count');
      for(const word of targets){
        const path=await evaluate(client,`(() => {const cells=Array.from(document.querySelectorAll(${q(gridRoot+' [data-grid-cell]')})),map=new Map(cells.map(b=>[b.dataset.gridCell,b.textContent.trim()]));for(let r=0;r<${size};r++)for(let c=0;c<${size};c++)for(const [dr,dc] of [[0,1],[1,0]]){const keys=Array.from({length:${word.length}},(_,i)=>(r+i*dr)+'-'+(c+i*dc));if(keys.map(k=>map.get(k)||'').join('')===${q(word)})return keys;}return null;})()`);
        if(!path)throw Error('Impossible requested word: '+word);
        for(const key of path)await clickSelector(client,gridRoot+' [data-grid-cell="'+key+'"]');
        await evaluate(client,`Array.from(document.querySelectorAll(${q(gridRoot+' button')})).find(b=>b.textContent.startsWith('Wort prüfen')).click()`);
        await waitFor(client,'wordgrid actually accepts '+word,`document.querySelector(${q(gridRoot+' [data-grid-target="'+word+'"]')}).dataset.gridFound==='true'`);
      }
      await waitFor(client,'wordgrid '+difficulty+' completes all requested words',`document.querySelector(${q(gridRoot)}).dataset.wordgridStars===${q(String(count))} && document.querySelector(${q(gridRoot+' [role="status"]')}).textContent.includes('alle Wörter')`);
      await waitFor(client,'wordgrid '+difficulty+' all letters and controls fit',languageFits(gridRoot));
    }
    const gridSnapshot=await evaluate(client,`Array.from(document.querySelectorAll(${q(gridRoot+' [data-grid-cell]')})).map(b=>b.textContent).join('')`);
    await auditMenu('wordgrid','Minimieren');await openAuditWidget('wordgrid','Buchstaben-Suchgitter');
    await waitFor(client,'wordgrid restores the exact solved hard grid and stars',`document.querySelector(${q(gridRoot)}).dataset.wordgridDifficulty==='hard' && document.querySelector(${q(gridRoot)}).dataset.wordgridStars==='5' && Array.from(document.querySelectorAll(${q(gridRoot+' [data-grid-cell]')})).map(b=>b.textContent).join('')===${q(gridSnapshot)}`);
    await evaluate(client,`document.querySelector(${q(gridRoot)}).dataset.wordplayRoot=''`);await wordplayScreens('wordgrid');await auditMenu('wordgrid','Widget schließen');

    await openAuditWidget('wordscramble','Wort-Salat');await auditWidgetMinimum('wordscramble');
    const saladRoot='[data-widget-type="wordscramble"] [data-wordscramble-difficulty]';
    await clickMathText(saladRoot,'Experte');
    await waitFor(client,'word salad expert loads its eleven-letter first task',`document.querySelector(${q(saladRoot)}).dataset.wordscrambleDifficulty==='expert' && document.querySelectorAll(${q(saladRoot+' [data-scramble-letter]')}).length===11`);
    const chooseSaladLetter=async char=>{await evaluate(client,`Array.from(document.querySelectorAll(${q(saladRoot+' [data-scramble-letter]')})).find(b=>!b.disabled&&b.textContent.trim()===${q(char)}).click()`);};
    await chooseSaladLetter('A');await chooseSaladLetter('H');
    await waitFor(client,'word salad does not accept a wrong prefix',`document.querySelector(${q(saladRoot)}).dataset.wordscrambleSolved==='false' && document.querySelector(${q(saladRoot)}).dataset.wordscrambleScore==='0'`);
    await clickMathText(saladRoot,'Tipp 💡');
    await waitFor(client,'word salad hint reuses a misplaced selected letter',`Array.from(document.querySelectorAll(${q(saladRoot+' [data-scramble-slot]')})).map(b=>b.textContent.trim()).join('')==='H'`);
    await clickMathText(saladRoot,'Tipp 💡');
    await waitFor(client,'word salad second hint adds the next real letter',`Array.from(document.querySelectorAll(${q(saladRoot+' [data-scramble-slot]')})).map(b=>b.textContent.trim()).join('')==='HA'`);
    for(const char of 'USAUFGABE')await chooseSaladLetter(char);
    await waitFor(client,'word salad scores the real solved expert word exactly once',`document.querySelector(${q(saladRoot)}).dataset.wordscrambleSolved==='true' && document.querySelector(${q(saladRoot)}).dataset.wordscrambleScore==='1'`);
    await auditMenu('wordscramble','Minimieren');await openAuditWidget('wordscramble','Wort-Salat');
    await waitFor(client,'word salad restores solution without scoring it twice',`document.querySelector(${q(saladRoot)}).dataset.wordscrambleSolved==='true' && document.querySelector(${q(saladRoot)}).dataset.wordscrambleScore==='1'`);
    await evaluate(client,`document.querySelector(${q(saladRoot)}).dataset.wordplayRoot=''`);await wordplayScreens('wordscramble');
    await clickMathText(saladRoot,'Nächstes Wort ➔');await waitFor(client,'word salad next task clears the previous answer',`document.querySelector(${q(saladRoot)}).dataset.wordscrambleIndex==='1' && document.querySelector(${q(saladRoot)}).dataset.wordscrambleSolved==='false'`);await auditMenu('wordscramble','Widget schließen');

    await openAuditWidget('secretcode','Geheimsprachen-Box');await auditWidgetMinimum('secretcode');
    const codeRoot='[data-widget-type="secretcode"] [data-secretcode-method]';
    await setInputByLabel(client,'Klartext','XYZ ABC!');await setInputByLabel(client,'Caesar-Verschiebung','10');
    await waitFor(client,'Caesar encryption wraps Z to A correctly',`document.querySelector(${q(codeRoot+' output')}).textContent.trim()==='HIJ KLM!'`);
    await clickMathText(codeRoot,'ROT13');
    await waitFor(client,'ROT13 displays the independently calculated code',`document.querySelector(${q(codeRoot+' output')}).textContent.trim()==='KLM NOP!'`);
    await setInputByLabel(client,'Klartext','KLM NOP!');await waitFor(client,'ROT13 decrypts the same message',`document.querySelector(${q(codeRoot+' output')}).textContent.trim()==='XYZ ABC!'`);
    await auditMenu('secretcode','Minimieren');await openAuditWidget('secretcode','Geheimsprachen-Box');
    await waitFor(client,'secret code restores method text and encoded result',`document.querySelector(${q(codeRoot)}).dataset.secretcodeMethod==='rot13' && document.querySelector(${q(codeRoot+' input')}).value==='KLM NOP!' && document.querySelector(${q(codeRoot+' output')}).textContent.trim()==='XYZ ABC!'`);
    await evaluate(client,`document.querySelector(${q(codeRoot)}).dataset.wordplayRoot=''`);await wordplayScreens('secretcode');await auditMenu('secretcode','Widget schließen');

    await openAuditWidget('storyemojis','Story-Emojis');await auditWidgetMinimum('storyemojis');
    const storyRoot='[data-widget-type="storyemojis"] [id^="storyemojis-widget-"]',storyDialog='dialog[open][aria-label="Story-Emojis Einstellungen"]';
    await clickSelector(client,'[data-widget-type="storyemojis"] .cockpit-widget-settings-trigger');
    await waitFor(client,'Story Emojis gear opens the native editor',`Boolean(document.querySelector(${q(storyDialog)}))`);
    await clickSelector(client,storyDialog+' #storyemojis-popover-count-6');
    await setInputByLabel(client,'Oder eigener Arbeitsauftrag:','Erzähle eine Geschichte über Freundschaft.');await clickMathText(storyDialog,'Setzen');
    await clickSelector(client,storyDialog+' #storyemojis-toggle-labels-btn');
    await pressAuditKey('Escape');
    await waitFor(client,'Story Emojis editor closes and returns gear focus',`!document.querySelector(${q(storyDialog)}) && document.activeElement?.matches('[data-widget-type="storyemojis"] .cockpit-widget-settings-trigger')`);
    await waitFor(client,'Story Emojis displays six impulses and the teacher prompt',`document.querySelectorAll(${q(storyRoot+' [data-story-emoji-id]')}).length===6 && document.querySelector(${q(storyRoot)}).textContent.includes('Erzähle eine Geschichte über Freundschaft.')`);
    const firstStoryId=await evaluate(client,`document.querySelector(${q(storyRoot+' #storyemojis-card-0')}).dataset.storyEmojiId`);
    await clickSelector(client,storyRoot+' #storyemojis-lock-toggle-0');await clickSelector(client,storyRoot+' #storyemojis-roll-new-button');
    await waitFor(client,'Story Emojis locked picture survives a new story',`document.querySelector(${q(storyRoot+' #storyemojis-card-0')}).dataset.storyEmojiId===${q(firstStoryId)} && document.querySelector(${q(storyRoot+' #storyemojis-card-0')}).dataset.storyLocked==='true'`);
    await clickSelector(client,storyRoot+' #storyemojis-move-right-0');
    await waitFor(client,'Story Emojis moves the real locked picture one position',`document.querySelector(${q(storyRoot+' #storyemojis-card-1')}).dataset.storyEmojiId===${q(firstStoryId)} && document.querySelector(${q(storyRoot+' #storyemojis-card-1')}).dataset.storyLocked==='true'`);
    const secondStoryId=await evaluate(client,`document.querySelector(${q(storyRoot+' #storyemojis-card-0')}).dataset.storyEmojiId`);
    await clickSelector(client,storyRoot+' #storyemojis-reroll-item-0');
    await waitFor(client,'Story Emojis replaces only the requested unlocked picture',`document.querySelector(${q(storyRoot+' #storyemojis-card-0')}).dataset.storyEmojiId!==${q(secondStoryId)} && document.querySelector(${q(storyRoot+' #storyemojis-card-1')}).dataset.storyEmojiId===${q(firstStoryId)}`);
    const storySnapshot=await evaluate(client,`Array.from(document.querySelectorAll(${q(storyRoot+' [data-story-emoji-id]')})).map(b=>[b.dataset.storyEmojiId,b.dataset.storyLocked])`);
    await auditMenu('storyemojis','Minimieren');await openAuditWidget('storyemojis','Story-Emojis');
    await waitFor(client,'Story Emojis restores exact picture order locks and teacher prompt',`JSON.stringify(Array.from(document.querySelectorAll(${q(storyRoot+' [data-story-emoji-id]')})).map(b=>[b.dataset.storyEmojiId,b.dataset.storyLocked]))===${q(JSON.stringify(storySnapshot))} && document.querySelector(${q(storyRoot)}).textContent.includes('Erzähle eine Geschichte über Freundschaft.')`);
    await evaluate(client,`document.querySelector(${q(storyRoot)}).dataset.wordplayRoot=''`);await wordplayScreens('storyemojis');await auditMenu('storyemojis','Widget schließen');
    // Next five German catalog entries: aliases above plus three distinct lesson tools.
    await openAuditWidget('wordexplorer','Wort-Analysator');await auditWidgetMinimum('wordexplorer');
    const explorerRoot='[data-widget-type="wordexplorer"] [data-wordplay-root]';
    for(const [word,count,capital] of [['Schule',2,'Ja (Groß)'],['feiern',2,'Nein (Klein)'],['Äpfel',2,'Ja (Groß)'],['',0,'Nein (Klein)']]){
      await setInputByLabel(client,'Wort untersuchen',word);
      await waitFor(client,'word explorer analyzes '+word,`document.querySelector(${q(explorerRoot)}).dataset.wordexplorerWord===${q(word)} && document.querySelector('[aria-label="Silbenzahl korrigieren"]').value===${q(String(count))} && document.querySelector(${q(explorerRoot)}).textContent.includes(${q(capital)})`);
    }
    const longWord='Donaudampfschifffahrtsgesellschaft';
    await setInputByLabel(client,'Wort untersuchen',longWord);
    await setInputByLabel(client,'Silbenzahl korrigieren','9');
    await waitFor(client,'word explorer shows uncertainty and corrected count',`document.querySelector(${q(explorerRoot)}).textContent.includes('Schätzung') && !document.querySelector(${q(explorerRoot)}).textContent.includes('Nomen?') && document.querySelector('[aria-label="Silbenzahl korrigieren"]').value==='9'`);
    await wordplayScreens('wordexplorer');
    await auditMenu('wordexplorer','Minimieren');await openAuditWidget('wordexplorer','Wort-Analysator');
    await waitFor(client,'word explorer restores exact casing and teacher correction',`document.querySelector('[aria-label="Wort untersuchen"]').value===${q(longWord)} && document.querySelector('[aria-label="Silbenzahl korrigieren"]').value==='9'`);
    await auditMenu('wordexplorer','Widget schließen');

    await openAuditWidget('rhymemachine','Reim-Maschine');await auditWidgetMinimum('rhymemachine');
    const rhymeRoot='[data-widget-type="rhymemachine"] [data-wordplay-root]';
    await waitFor(client,'rhyme round is ready',`document.querySelectorAll(${q(rhymeRoot+' [data-rhyme-choice]')}).length===4 && !Array.from(document.querySelectorAll(${q(rhymeRoot+' button')})).find(b=>b.textContent.includes('Drehen!')).disabled`);
    const controlledRandom = async (value,action) => {
      await evaluate(client,`window.klassioAuditRandom=Math.random;Math.random=()=>${value}`);
      try {await action();} finally {await evaluate(client,'Math.random=window.klassioAuditRandom;delete window.klassioAuditRandom');}
    };
    for(const [index,base,right,wrong] of [[0,'Maus','Haus','Katze'],[5,'Hand','Sand','Wolke'],[2,'Katze','Tatze','Mund']]){
      await controlledRandom((index+0.1)/20,async()=>{
        await clickMathText(rhymeRoot,'🎰 Drehen!');
        await waitFor(client,'real rhyme round '+base,`document.querySelector(${q(rhymeRoot)}).dataset.rhymeBase===${q(base)} && document.querySelectorAll(${q(rhymeRoot+' [data-rhyme-choice]')}).length===4 && !Array.from(document.querySelectorAll(${q(rhymeRoot+' button')})).find(b=>b.textContent.includes('Drehen!')).disabled`);
      });
      await clickSelector(client,rhymeRoot+' [data-rhyme-choice="'+wrong+'"]');
      await waitFor(client,'rhyme wrong answer remains correctable',`document.querySelector(${q(rhymeRoot+' [role="status"]')}).textContent.includes('Daneben')`);
      await clickSelector(client,rhymeRoot+' [data-rhyme-choice="'+right+'"]');
      await waitFor(client,'rhyme real answer accepted',`document.querySelector(${q(rhymeRoot+' [role="status"]')}).textContent.includes('Absolut richtig')`);
    }
    const rhymeSnapshot=await evaluate(client,`document.querySelector(${q(rhymeRoot)}).innerText`);
    await wordplayScreens('rhymemachine');await auditMenu('rhymemachine','Minimieren');await openAuditWidget('rhymemachine','Reim-Maschine');
    await sleep(1000);
    await waitFor(client,'rhyme restores exact round choices and solved feedback',`document.querySelector(${q(rhymeRoot)}).innerText===${q(rhymeSnapshot)}`);
    await auditMenu('rhymemachine','Widget schließen');

    await openAuditWidget('punctuationzoo','Satzzeichen-Zoo');await auditWidgetMinimum('punctuationzoo');
    const zooRoot='[data-widget-type="punctuationzoo"] [data-wordplay-root]';
    const zooSentences=['Wohin hüpft der kleine grüne Frosch','Das gestreifte Zebra knabbert an frischem Heu','Lauf schnell weg vor dem hungrigen Löwen'];
    for(const [index,mark] of [[0,'?'],[1,'.'],[2,'!']]){
      const current=await evaluate(client,`document.querySelector(${q(zooRoot)}).dataset.zooSentence`);
      if(current!==zooSentences[index])await controlledRandom((index+0.1)/10,async()=>{
        await clickMathText(zooRoot,'Nächstes Tier 🦒 →');
        await waitFor(client,'real zoo sentence '+index,`document.querySelector(${q(zooRoot)}).dataset.zooSentence===${q(zooSentences[index])}`);
      });
      const wrong=mark==='?'?'.':'?';
      await evaluate(client,`Array.from(document.querySelectorAll(${q(zooRoot+' [data-zoo-choice]')})).find(b=>b.querySelector('span').textContent===${q(wrong)}).click()`);
      await waitFor(client,'zoo keeps cage locked after wrong mark',`document.querySelector(${q(zooRoot)}).dataset.zooLocked==='true' && document.querySelector(${q(zooRoot)}).textContent.includes('Das passt leider nicht')`);
      await evaluate(client,`Array.from(document.querySelectorAll(${q(zooRoot+' [data-zoo-choice]')})).find(b=>b.querySelector('span').textContent===${q(mark)}).click()`);
      await waitFor(client,'zoo accepts '+mark+' once and shows explanation',`document.querySelector(${q(zooRoot)}).dataset.zooLocked==='false' && document.querySelector(${q(zooRoot)}).dataset.zooStreak==='1' && Array.from(document.querySelectorAll(${q(zooRoot+' [data-zoo-choice]')})).every(b=>b.disabled)`);
      await wordplayScreens('punctuationzoo');
    }
    const zooSnapshot=await evaluate(client,`document.querySelector(${q(zooRoot)}).innerText`);
    await auditMenu('punctuationzoo','Minimieren');await openAuditWidget('punctuationzoo','Satzzeichen-Zoo');
    await waitFor(client,'zoo restores solved sentence and explanation',`document.querySelector(${q(zooRoot)}).innerText===${q(zooSnapshot)} && document.querySelector(${q(zooRoot)}).dataset.zooLocked==='false'`);
    await auditMenu('punctuationzoo','Widget schließen');
    console.log('✓ Next five German widgets: actual ABC list and sentence task, corrected word analysis, unambiguous rhymes, all three punctuation types, native minima and saved restore.');
    console.log('✓ Five wordplay widgets: paged real chains/errors/hints/drafts, all grid words solved at every level including 9×9, expert anagram/hint repair/scoring, Caesar wrap and ROT13 roundtrip, six story images/lock/move/reroll/prompt/native gear, exact minimums and restore.');



    // Fourth five-widget language/play block: real actions and preserved rounds.
    await openAuditWidget('dictionary','Bildwörterbuch');await auditWidgetMinimum('dictionary');
    const dictRoot='[data-widget-type="dictionary"] [data-wordplay-root]';
    await clickMathText(dictRoot,'Weiter');
    const dictSnapshot=await evaluate(client,`document.querySelector(${q(dictRoot)}).innerText`);
    await wordplayScreens('dictionary');await auditMenu('dictionary','Minimieren');await openAuditWidget('dictionary','Bildwörterbuch');
    await waitFor(client,'dictionary restores current learning card',`document.querySelector(${q(dictRoot)}).innerText===${q(dictSnapshot)}`);
    await clickMathText(dictRoot,'Zuordnen');
    const dictAnswer=await evaluate(client,`document.querySelector(${q(dictRoot+' [aria-label$=" vorlesen"]')}).getAttribute('aria-label').replace(/ vorlesen$/,'')`);
    await evaluate(client,`Array.from(document.querySelectorAll(${q(dictRoot+' [aria-label^="Bild auswählen:"]')})).find(b=>b.getAttribute('aria-label')!==${q('Bild auswählen: '+dictAnswer)}).click()`);
    await waitFor(client,'dictionary wrong choice can be retried',`document.querySelector(${q(dictRoot+' [role="status"]')}).textContent.includes('noch einmal')`);
    await clickSelector(client,dictRoot+' [aria-label="Bild auswählen: '+dictAnswer+'"]');
    await waitFor(client,'dictionary accepts visible matching picture',`document.querySelector(${q(dictRoot+' [role="status"]')}).textContent.includes('Richtig')`);
    await wordplayScreens('dictionary');await auditMenu('dictionary','Widget schließen');

    await openAuditWidget('patternmaker','Sequenz-Muster-Macher');await auditWidgetMinimum('patternmaker');
    const patternRoot='[data-widget-type="patternmaker"] [data-wordplay-root]';
    await clickMathText(patternRoot,'Leicht');
    await waitFor(client,'pattern shows real alternating colors',`document.querySelector(${q(patternRoot)}).textContent.includes('🔴') && document.querySelector(${q(patternRoot)}).dataset.patternCorrect==='🔵'`);
    await clickSelector(client,patternRoot+' [data-pattern-choice="🔴"]');
    await waitFor(client,'pattern wrong answer is retryable',`document.querySelector(${q(patternRoot+' [role="status"]')}).textContent.includes('nochmal')`);
    await clickSelector(client,patternRoot+' [data-pattern-choice="🔵"]');
    await waitFor(client,'pattern scores once',`document.querySelector(${q(patternRoot)}).dataset.patternStreak==='1' && document.querySelector(${q(patternRoot)}).dataset.patternSolved==='true'`);
    await sleep(1300);await wordplayScreens('patternmaker');await auditMenu('patternmaker','Minimieren');await openAuditWidget('patternmaker','Sequenz-Muster-Macher');
    await waitFor(client,'pattern solved round survives restore',`document.querySelector(${q(patternRoot)}).dataset.patternStreak==='1' && document.querySelector(${q(patternRoot)}).dataset.patternSolved==='true'`);
    await clickMathText(patternRoot,'Nächstes Muster');await waitFor(client,'next pattern unlocks',`document.querySelector(${q(patternRoot)}).dataset.patternSolved==='false'`);await auditMenu('patternmaker','Widget schließen');

    await openAuditWidget('alphabetsoup','Buchstaben-Suppe');await auditWidgetMinimum('alphabetsoup');
    const soupRoot='[data-widget-type="alphabetsoup"] [data-wordplay-root]';
    await clickMathText(soupRoot,'💥 Extrem');
    await waitFor(client,'expert soup letters rendered',`document.querySelectorAll(${q(soupRoot+' [data-soup-letter]')}).length>=19`);
    const soupWord=await evaluate(client,`document.querySelector(${q(soupRoot)}).dataset.soupWord`);
    await evaluate(client,`Array.from(document.querySelectorAll(${q(soupRoot+' [data-soup-letter]')})).find(b=>b.dataset.soupLetter!==${q(soupWord[0])}).click()`);
    await waitFor(client,'soup wrong letter resets attempt',`document.querySelector(${q(soupRoot)}).dataset.soupInput==='' && document.querySelector(${q(soupRoot+' [role="status"]')}).textContent.includes('falsch')`);
    for(let i=0;i<soupWord.length;i++){
      await evaluate(client,`Array.from(document.querySelectorAll(${q(soupRoot+' [data-soup-letter]')})).find(b=>!b.disabled && b.dataset.soupLetter===${q(soupWord[i])}).click()`);
      await waitFor(client,'soup accepts letter '+i,`document.querySelector(${q(soupRoot)}).dataset.soupInput===${q(soupWord.slice(0,i+1))}`);
    }
    await sleep(1400);await wordplayScreens('alphabetsoup');await auditMenu('alphabetsoup','Minimieren');await openAuditWidget('alphabetsoup','Buchstaben-Suppe');
    await waitFor(client,'soup solved word survives restore',`document.querySelector(${q(soupRoot)}).dataset.soupInput===${q(soupWord)} && document.querySelector(${q(soupRoot)}).dataset.soupWord===${q(soupWord)}`);await auditMenu('alphabetsoup','Widget schließen');

    await openAuditWidget('morsecode','Morse-Code-Station');await auditWidgetMinimum('morsecode');
    const morseRoot='[data-widget-type="morsecode"] [data-wordplay-root]';
    await clickMathText(morseRoot,'📚 Anleitung');await wordplayScreens('morsecode');await clickMathText(morseRoot,'📚 Spiel');
    await setInputByLabel(client,'Morse-Wort entschlüsseln','NEIN');await clickMathText(morseRoot,'Raten 🔎');
    await waitFor(client,'morse wrong answer shown',`document.querySelector(${q(morseRoot+' [role="status"]')}).textContent.includes('Huch')`);
    await setInputByLabel(client,'Morse-Wort entschlüsseln','SOS');await pressAuditKey('Enter');
    await waitFor(client,'morse keyboard answer accepted',`document.querySelector(${q(morseRoot+' [role="status"]')}).textContent.includes('Perfekt entschlüsselt')`);
    await wordplayScreens('morsecode');await clickMathText(morseRoot,'🔊 Abspielen!');
    await waitFor(client,'morse playback starts',`document.querySelector(${q(morseRoot)}).dataset.morsePlaying==='true'`);
    await auditMenu('morsecode','Minimieren');await openAuditWidget('morsecode','Morse-Code-Station');
    await waitFor(client,'morse interrupted playback is stopped but input restored',`document.querySelector(${q(morseRoot)}).dataset.morsePlaying==='false' && document.querySelector('[aria-label="Morse-Wort entschlüsseln"]').value==='SOS'`);
    await auditMenu('morsecode','Widget schließen');

    await openAuditWidget('hangman','Blumen-Rätsel');await auditWidgetMinimum('hangman');
    const flowerRoot='[data-widget-type="hangman"] [data-wordplay-root]';
    await setInputByLabel(client,'Geheimes Wort für das Blumen-Rätsel','ÄPFEL');await clickMathText(flowerRoot,'Spiel Starten');
    await clickSelector(client,flowerRoot+' [aria-label="Buchstabe X wählen"]');await clickSelector(client,flowerRoot+' [aria-label="Buchstabe Ä wählen"]');
    await waitFor(client,'flower counts wrong attempt once',`document.querySelector(${q(flowerRoot+' [role="status"]')}).textContent.includes('1 von 6')`);
    await wordplayScreens('hangman');await auditMenu('hangman','Minimieren');await openAuditWidget('hangman','Blumen-Rätsel');
    await waitFor(client,'flower restores guesses and mistakes',`document.querySelector(${q(flowerRoot+' [aria-label="Buchstabe Ä – richtig"]')})?.disabled && document.querySelector(${q(flowerRoot+' [role="status"]')}).textContent.includes('1 von 6')`);
    for(const letter of ['P','F','E','L'])await clickSelector(client,flowerRoot+' [aria-label="Buchstabe '+letter+' wählen"]');
    await waitFor(client,'flower real word is won',`document.querySelector(${q(flowerRoot+' [role="status"]')}).textContent.includes('Richtig gelöst')`);await wordplayScreens('hangman');await auditMenu('hangman','Widget schließen');
    console.log('✓ Fourth five-widget block: dictionary matching/retry, pattern score/explicit next, expert soup spelling/grid, Morse guide/keyboard/playback cleanup, flower mistakes/umlaut/win; native minima and exact restore.');

    const discoveryFixture={"body":[["Welcher Körperteil verarbeitet Sinneseindrücke und steuert Denken und Erinnern?","Gehirn"],["Welches Organ versorgt den Körper beim Atmen mit Sauerstoff?","Lunge"],["Welcher Muskel pumpt das Blut durch deinen Körper?","Herz"],["Welches Organ verarbeitet Nährstoffe und übernimmt viele Aufgaben im Stoffwechsel?","Leber"],["Welches Organ sammelt Nahrung und vermischt sie mit Magensaft?","Magen"],["Wo werden viele Nährstoffe aus der Nahrung in den Körper aufgenommen?","Darm"],["Was stützt deinen Körper und schützt zum Beispiel Gehirn, Herz und Lunge?","Knochen"]],"traffic":[["Was ordnet das Verkehrszeichen „HALT“ an?","Anhalten und anschließend Vorrang geben"],["Was bedeutet das umgedrehte Dreieck „VORRANG GEBEN“?","Ich muss dem bevorrechtigten Verkehr Vorrang geben"],["Was zeigt die gelbe Raute „VORRANGSTRASSE“ an?","Beginn und Verlauf einer Vorrangstraße"],["Was bedeutet der rote Kreis mit weißem Querbalken?","Einfahrt verboten"],["Was gilt beim Verkehrszeichen „FAHRVERBOT FÜR FAHRRÄDER“?","Radfahren ist verboten, Schieben ist erlaubt"],["Was bedeutet das runde blaue Radweg-Zeichen?","Einspurige Fahrräder müssen diesen Radweg benützen"],["Was bedeutet das eckige blaue Radweg-Zeichen?","Der Radweg darf benutzt werden, muss aber nicht"],["Was zeigt das Hinweiszeichen „EINBAHNSTRASSE“ an?","Die zulässige Fahrtrichtung der Einbahnstraße"],["Du willst mit dem Fahrrad einen Schutzweg („Zebrastreifen“) benutzen. Was ist richtig?","Absteigen und das Fahrrad als Fußgänger schieben"],["Wie schnell darfst du dich einer ungeregelten Radfahrerüberfahrt grundsätzlich höchstens nähern?","10 km/h"],["Keine Ampel, kein Vorrangzeichen und keine besondere Regelung: Was gilt grundsätzlich?","Der von rechts kommende Verkehr hat Vorrang"],["Wer hat in Österreich im Kreisverkehr automatisch Vorrang?","Niemand automatisch – die Beschilderung entscheidet"],["Was musst du vor einer Fahrtrichtungsänderung mit dem Fahrrad tun?","Prüfen, ob es sicher ist, und die Änderung rechtzeitig deutlich anzeigen"],["Für wen besteht beim Radfahren in Österreich gesetzliche Helmpflicht?","Für Kinder unter 12 Jahren"],["Darfst du während des Radfahrens mit dem Handy telefonieren?","Nur mit einer zulässigen Freisprecheinrichtung"],["Warum ist der Bereich neben einem rechts abbiegenden Lkw besonders gefährlich?","Du kannst trotz Spiegeln für den Fahrer schwer oder gar nicht sichtbar sein"]],"water":[["Was passiert bei der Kondensation?","Wasserdampf wird zu winzigen Wassertröpfchen oder Eiskristallen"],["Woraus bestehen Wolken hauptsächlich?","Aus winzigen Wassertröpfchen und/oder Eiskristallen"],["Was kann Niederschlag sein?","Regen, Schnee, Graupel oder Hagel"],["Was bedeutet Versickerung oder Infiltration?","Wasser dringt in Boden und Gestein ein"],["Was ist Oberflächenabfluss?","Wasser fließt über die Landoberfläche zu Bächen, Flüssen und Seen"],["Kann Grundwasser wieder an die Oberfläche gelangen?","Ja, zum Beispiel über Quellen oder als Zufluss zu Flüssen und Meeren"],["Was ist Transpiration?","Pflanzen geben Wasser über ihre Blätter an die Atmosphäre ab"],["Hat der Wasserkreislauf einen einzigen festen Anfang und ein einziges Ende?","Nein, Wasser bewegt sich ständig zwischen verschiedenen Speichern und auf verschiedenen Wegen"],["Was treibt einen großen Teil der Verdunstung im Wasserkreislauf an?","Energie der Sonne"],["Was kann nach einem Niederschlag auf dem Land passieren?","Ein Teil fließt oberirdisch ab, ein Teil versickert und ein Teil wird gespeichert"]],"paths":[["Oberflächenweg",["Verdunstung","Kondensation","Niederschlag","Oberflächenabfluss","Gewässer"]],["Grundwasserweg",["Verdunstung","Kondensation","Niederschlag","Versickerung","Grundwasser","Gewässer"]]]};
    // Five discovery widgets: real answers, exact restore, settings and minimum-size controls.
    const discoveryRoot = type => '[data-widget-type="'+type+'"] [role="region"]';
    const discoveryScreen = async type => {
      await waitFor(client,type+' native controls and contents fit',languageFits(discoveryRoot(type)));
      await saveScreenshot(client,SCREENSHOT_PATH.replace(/\.png$/,'-widget-'+type+'.png'));
    };
    const restoreDiscovery = async (type,label) => {
      const root=discoveryRoot(type);
      const snapshot=await evaluate(client,`document.querySelector(${q(root)}).innerText`);
      await auditMenu(type,'Minimieren');await openAuditWidget(type,label);
      await waitFor(client,type+' exact task, answer and feedback survive restore',`document.querySelector(${q(root)}).innerText===${q(snapshot)}`);
      await discoveryScreen(type);
    };
    const discoverySettings = async type => {
      await clickSelector(client,'[data-widget-type="'+type+'"] button[aria-label$="Einstellungen öffnen"]');
      await waitFor(client,type+' native settings open',`document.querySelector(${q(discoveryRoot(type))}).textContent.includes('Einstellungen')`);
      await pressAuditKey('Escape');
      await waitFor(client,type+' Escape closes settings',`!document.querySelector(${q(discoveryRoot(type))}).textContent.includes('Einstellungen')`);
    };
    await openAuditWidget('bodyparts','Körper-Entdecker');await auditWidgetMinimum('bodyparts');
    const bodyRoot=discoveryRoot('bodyparts');
    for(const name of ['Gehirn','Lunge','Herz','Leber','Magen','Darm','Knochen']) {
      await evaluate(client,`Array.from(document.querySelectorAll(${q(bodyRoot+' button')})).find(b=>b.textContent.trim().endsWith(${q(name)})).click()`);
      await discoveryScreen('bodyparts');
    }
    await clickMathText(bodyRoot,'Zuordnen');
    await waitFor(client,'body quiz question appears',`Boolean(document.querySelector(${q(bodyRoot+' p.text-accent')}))`);
    const bodyQuestion=await evaluate(client,`document.querySelector(${q(bodyRoot+' p.text-accent')}).textContent`);
    const bodyExpected=discoveryFixture.body.find(([question])=>question===bodyQuestion)?.[1];
    if(!bodyExpected)throw Error('Unknown visible body question: '+bodyQuestion);
    await evaluate(client,`Array.from(document.querySelectorAll(${q(bodyRoot+' button')})).find(b=>!b.textContent.trim().endsWith(${q(bodyExpected)})&&b.className.includes('min-h-16')).click()`);
    await waitFor(client,'body allows wrong answer retry',`document.querySelector(${q(bodyRoot+' [role="status"]')}).textContent.includes('noch einmal')`);
    await evaluate(client,`Array.from(document.querySelectorAll(${q(bodyRoot+' button')})).find(b=>b.textContent.trim().endsWith(${q(bodyExpected)})).click()`);
    await waitFor(client,'body correct organ feedback',`document.querySelector(${q(bodyRoot+' [role="status"]')}).textContent.includes('Richtig')`);
    await restoreDiscovery('bodyparts','Körper-Entdecker');await discoverySettings('bodyparts');await clickMathText(bodyRoot,'Nächste Aufgabe');await auditMenu('bodyparts','Widget schließen');

    await openAuditWidget('compass','Geographie-Kompass');await auditWidgetMinimum('compass');
    const compassRoot=discoveryRoot('compass');
    for(const label of ['N','NO','O','SO','S','SW','W','NW']) {
      await evaluate(client,`Array.from(document.querySelectorAll(${q(compassRoot+' [aria-label="Himmelsrichtung wählen"] button')})).find(b=>b.querySelector('span').textContent===${q(label)}).click()`);
      await discoveryScreen('compass');
    }

    await clickMathText(compassRoot,'Üben');
    await sleep(100); // Let the mode effect finish preparing its new round.
    const compassTarget=await evaluate(client,`document.querySelector(${q(compassRoot+' h3')}).textContent.match(/Stelle (.+) ein/)[1]`);
    const directionNames=['Norden','Nordosten','Osten','Südosten','Süden','Südwesten','Westen','Nordwesten'];
    const directionLabels=['N','NO','O','SO','S','SW','W','NW'];
    const expectedDirection=directionLabels[directionNames.indexOf(compassTarget)];
    if(!expectedDirection)throw Error('Unknown visible compass direction: '+compassTarget);
    const wrongDirection=await evaluate(client,`Array.from(document.querySelectorAll(${q(compassRoot+' [aria-label="Himmelsrichtung wählen"] button')})).find(b=>b.textContent.trim()!==${q(expectedDirection)}).textContent.trim()`);
    await clickMathText(compassRoot,wrongDirection);await clickMathText(compassRoot,'Prüfen');
    await waitFor(client,'compass rejects wrong direction',`document.querySelector(${q(compassRoot+' [role="status"]')}).textContent.includes('Noch nicht')`);
    await clickMathText(compassRoot,expectedDirection);await clickMathText(compassRoot,'Prüfen');
    await waitFor(client,'compass accepts correct direction',`document.querySelector(${q(compassRoot+' [role="status"]')}).textContent.includes('Richtig')`);
    await restoreDiscovery('compass','Geographie-Kompass');await discoverySettings('compass');await clickMathText(compassRoot,'Nächste Aufgabe');await auditMenu('compass','Widget schließen');

    await openAuditWidget('weekdays','Wochentage-Trainer');await auditWidgetMinimum('weekdays');
    const calendarRoot=discoveryRoot('weekdays');
    const otherDay=await evaluate(client,`Array.from(document.querySelectorAll(${q(calendarRoot+' [aria-label="Wochentage auswählen"] button')})).find(b=>b.getAttribute('aria-pressed')==='false').querySelector('span').textContent`);
    await clickMathText(calendarRoot,otherDay);
    await waitFor(client,'calendar distinguishes a selected day from the real today',`document.querySelector(${q(calendarRoot+' .grid-cols-3')}).textContent.includes('Ausgewählt') && document.querySelector(${q(calendarRoot+' .grid-cols-3')}).textContent.includes('Davor')`);

    for(const [view,items] of [['Wochentage',['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag']],['Monate',['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']]]) {
      await clickMathText(calendarRoot,view);await clickMathText(calendarRoot,'Üben');
      await sleep(100); // View/mode changes prepare a new round after the render.
      const prompt=await evaluate(client,`document.querySelector(${q(calendarRoot+' p.text-accent')}).textContent`);
      const match=prompt.match(/kommt (vor|nach) (.+)\?/);
      const expected=items[(items.indexOf(match[2])+(match[1]==='vor'?-1:1)+items.length)%items.length];
      await clickMathText(calendarRoot,items.find(item=>item!==expected));await clickMathText(calendarRoot,'Prüfen');
      await waitFor(client,'calendar retries wrong '+view,`document.querySelector(${q(calendarRoot+' [role="status"]')}).textContent.includes('Noch nicht')`);
      await clickMathText(calendarRoot,expected);await clickMathText(calendarRoot,'Prüfen');
      await waitFor(client,'calendar solves visible '+view,`document.querySelector(${q(calendarRoot+' [role="status"]')}).textContent.includes('Richtig')`);
      await restoreDiscovery('weekdays','Wochentage-Trainer');await clickMathText(calendarRoot,'Nächste Aufgabe');await discoveryScreen('weekdays');
    }
    await discoverySettings('weekdays');await auditMenu('weekdays','Widget schließen');

    await openAuditWidget('trafficquiz','Fahrrad-Führerschein');await auditWidgetMinimum('trafficquiz');
    const trafficRoot=discoveryRoot('trafficquiz');
    const answerVisibleTraffic = async wrong => {
      const question=await evaluate(client,`document.querySelector(${q(trafficRoot+' h3')}).textContent`);
      const expected=discoveryFixture.traffic.find(([text])=>text===question)?.[1];
      if(!expected)throw Error('Unknown visible traffic question: '+question);
      const option=wrong?await evaluate(client,`Array.from(document.querySelectorAll(${q(trafficRoot+' [aria-label="Antworten"] button')})).find(b=>b.textContent.trim()!==${q(expected)}).textContent.trim()`):expected;
      await clickMathText(trafficRoot,option);
      await waitFor(client,'traffic gives answer feedback',`document.querySelector(${q(trafficRoot+' [role="status"]')}).textContent.includes(${q(wrong?'Nicht ganz':'Richtig')})`);
      await discoveryScreen('trafficquiz');
    };
    await answerVisibleTraffic(true);await restoreDiscovery('trafficquiz','Fahrrad-Führerschein');await clickMathText(trafficRoot,'Nächste Frage');await answerVisibleTraffic(false);
    await discoverySettings('trafficquiz');await clickMathText(trafficRoot,'Übungsprüfung');
    for(let i=0;i<5;i++) {
      await answerVisibleTraffic(false);
      if(i===1)await restoreDiscovery('trafficquiz','Fahrrad-Führerschein');
      await clickMathText(trafficRoot,i===4?'Ergebnis':'Weiter');
    }
    await waitFor(client,'traffic real five question exam complete',`document.querySelector(${q(trafficRoot)}).textContent.includes('5 von 5 Antworten richtig')`);
    await restoreDiscovery('trafficquiz','Fahrrad-Führerschein');await auditMenu('trafficquiz','Widget schließen');

    await openAuditWidget('watercycle','Wasserkreislauf-Puzzle');await auditWidgetMinimum('watercycle');
    const waterRoot=discoveryRoot('watercycle');
    await discoveryScreen('watercycle');await clickMathText(waterRoot,'Puzzle');
    await clickMathText(waterRoot,'Prüfen');
    await waitFor(client,'water puzzle starts unsolved',`document.querySelector(${q(waterRoot+' [role="status"]')}).textContent.includes('Noch nicht')`);
    const waterTitle=await evaluate(client,`document.querySelector(${q(waterRoot+' p.text-accent')}).textContent`);
    const waterPath=discoveryFixture.paths.find(([title])=>title===waterTitle)?.[1];
    if(!waterPath)throw Error('Unknown visible water path: '+waterTitle);
    for(let target=0;target<waterPath.length;target++) {
      let current=await evaluate(client,`Array.from(document.querySelectorAll(${q(waterRoot+' button[aria-label$=" nach oben"]')})).findIndex(b=>b.getAttribute('aria-label')===${q(waterPath[target]+' nach oben')})`);
      while(current>target){await clickSelector(client,waterRoot+' button[aria-label='+q(waterPath[target]+' nach oben')+']');current--;}
    }
    await clickMathText(waterRoot,'Prüfen');
    await waitFor(client,'water solves displayed path using arrows',`document.querySelector(${q(waterRoot+' [role="status"]')}).textContent.includes('Richtig')`);
    await restoreDiscovery('watercycle','Wasserkreislauf-Puzzle');await discoverySettings('watercycle');await clickMathText(waterRoot,'Quiz');
    for(let i=0;i<5;i++) {
      const question=await evaluate(client,`document.querySelector(${q(waterRoot+' h3')}).textContent`);
      const expected=discoveryFixture.water.find(([text])=>text===question)?.[1];
      if(!expected)throw Error('Unknown visible water question: '+question);
      await clickMathText(waterRoot,expected);await discoveryScreen('watercycle');
      if(i===1)await restoreDiscovery('watercycle','Wasserkreislauf-Puzzle');
      await clickMathText(waterRoot,i===4?'Neues Quiz':'Weiter');
    }
    await auditMenu('watercycle','Widget schließen');
    console.log('✓ Discovery block: seven organs/retry, compass directions, weekday/month arithmetic, real traffic exam and water puzzle/quiz; exact state restore, gear/Escape, native minima and reachable controls.');
    console.log('✓ Widget block: groups stay in widget, real wheel winner restored, all star children reachable without inner scrolling.');
    console.log('✓ Widget block: 12 widgets checked; stopwatch pause and traffic light mode survive restore.');
    console.log('✓ Audit regression: calculator keys/result/restore, compass layout at 100/125/150%, QR alias/readability/title/mode restore');
    // Class behavior uses the pupil scale: 1 is positive and must be above 5.
    await clickSelector(client, '[aria-label="Weitere Optionen und Layout-Werkzeuge"]');
    const publicBehaviorOption='[aria-label="Verhalten der Kinder öffentlich in der Schülerliste anzeigen"]';
    await waitFor(client, 'public behavior option is visible', `Boolean(document.querySelector(${q(publicBehaviorOption)}))`);
    if(!await evaluate(client, `document.querySelector(${q(publicBehaviorOption)}).checked`))await clickSelector(client,publicBehaviorOption);
    await clickSelector(client, '[aria-label="Weitere Optionen und Layout-Werkzeuge"]');
    const behaviorButton='[aria-label="Öffentliche Schülerliste und Pluspunkte"] button[aria-label^="Verhalten von"]';
    await waitFor(client,'public behavior controls available',`Boolean(document.querySelector(${q(behaviorButton)}))`);
    const behaviorChild=await evaluate(client,`document.querySelector(${q(behaviorButton)}).getAttribute('aria-label').match(/^Verhalten von (.+):/)[1]`);
    await waitFor(client,'synthetic behavior starts at neutral',`document.querySelector(${q(behaviorButton)}).getAttribute('aria-label').includes(': OK;')`);
    for(const stageLabel of ['Achtung','Stopp','Super','Gut','OK','Achtung']){
      await clickSelector(client,behaviorButton);
      await waitFor(client,'actual behavior stage '+stageLabel,`document.querySelector(${q(behaviorButton)}).getAttribute('aria-label').includes(${q(': '+stageLabel+';')})`);
    }
    await openPage(client, 'Klasse');
    await waitFor(client, 'class overview visible', `Boolean(document.querySelector('[data-class-hub] h1'))`);
    for (const width of [360, 820, 1360]) {
      await client.send('Emulation.setDeviceMetricsOverride', {width, height:1000, deviceScaleFactor:1, mobile:false});
      await sleep(350);
      const layout = await evaluate(client, `(() => {const hub=document.querySelector('[data-class-hub]');const cards=Array.from(hub.querySelectorAll('section button'));return {overflow:document.documentElement.scrollWidth>innerWidth+3,cardCount:cards.length,smallTarget:cards.some(card=>card.getBoundingClientRect().height<44),heading:hub.querySelector('h1').textContent.trim()};})()`);
      if(layout.overflow || layout.smallTarget || layout.cardCount < 6 || !layout.heading) throw new Error('Class overview layout failed at '+width+': '+JSON.stringify(layout));
    }
    await clickButton(client,'Klassendossier');
    await waitFor(client,'class dossier opens',`Boolean(document.querySelector('[data-class-dossier]'))`);
    await clickSelector(client,'[data-class-period="today"]');
    // Existing neutral daily record plus real changes 4,5,1,2,3,4: 22/7 = 3.1, not 2.9.
    await waitFor(client,'class dossier preserves actual stage numbering',`Array.from(document.querySelectorAll('[data-class-student-table] tbody tr')).some(row=>row.firstElementChild.textContent.startsWith(${q(behaviorChild)}) && row.children[5].textContent.trim()==='3,1 / 5')`);
    await waitFor(client,'positive class share still counts the first two stages',`document.querySelector('[aria-label="Klassendossier Kennzahlen"]').textContent.includes('18 Einträge · 11 % positiv')`);
    for(const width of [360,820,1360]){
      await client.send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
      await evaluate(client,`document.querySelector('[data-class-chart="behavior"]').scrollIntoView({block:'center'})`);
      await waitFor(client,'class behavior good above poor at '+width,`(() => {const root=document.querySelector('[data-class-chart="behavior"]'),ticks=Array.from(root.querySelectorAll('.recharts-cartesian-axis-tick-value'));const good=ticks.find(t=>t.textContent==='1'),poor=ticks.find(t=>t.textContent==='5');return good&&poor&&good.getBoundingClientRect().top<poor.getBoundingClientRect().top&&root.textContent.includes('1 = sehr positiv');})()`);
      await saveScreenshot(client,SCREENSHOT_PATH.replace('.png','-class-behavior-'+width+'.png'));
    }
    await clickButton(client,'Zur Klassenübersicht',true);
    await waitFor(client,'class overview returns after behavior check',`Boolean(document.querySelector('[data-class-hub] h1'))`);
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
