import fs from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const BASE_URL = process.env.KLASSIO_E2E_BASE_URL || 'http://127.0.0.1:3100/login';
const DEBUG_URL = process.env.KLASSIO_CHROME_DEBUG_URL || 'http://127.0.0.1:9282';
const ACCESS_CODE = process.env.KLASSIO_E2E_ACCESS_CODE || 'ci-parent-print-access-2026';
const VAULT_PASSWORD = process.env.KLASSIO_E2E_VAULT_PASSWORD || 'Klassio-KEL-Print-2026!';
const PDF_PATH = process.env.KLASSIO_E2E_PDF || '/tmp/klassio-kel-parent-e2e.pdf';
const SCREENSHOT_PATH = process.env.KLASSIO_E2E_SCREENSHOT || '/tmp/klassio-kel-parent-e2e.png';
const LONG_PDF_PATH = process.env.KLASSIO_E2E_LONG_PDF || '/tmp/klassio-kel-parent-e2e-long.pdf';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const q = value => JSON.stringify(value);

class CdpClient {
  constructor(url) { this.url = url; this.nextId = 1; this.pending = new Map(); }
  async connect() {
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      this.ws = ws; ws.onopen = resolve; ws.onerror = reject;
      ws.onmessage = event => {
        const message = JSON.parse(String(event.data));
        const p = this.pending.get(message.id);
        if (!p) return;
        this.pending.delete(message.id);
        clearTimeout(p.timer);
        if (message.error) p.reject(new Error(message.error.message || 'CDP error'));
        else p.resolve(message.result);
      };
      ws.onclose = () => {
        for (const p of this.pending.values()) p.reject(new Error('Chrome DevTools connection closed'));
        this.pending.clear();
      };
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('Timed out: ' + method)); }, 30000);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.ws?.close(); }
}
async function createClient() {
  let target;
  for (let i = 0; i < 180; i++) {
    try {
      const response = await fetch(DEBUG_URL + '/json/new?' + encodeURIComponent(BASE_URL), { method: 'PUT' });
      if (response.ok) { target = await response.json(); break; }
    } catch {}
    await sleep(250);
  }
  if (!target?.webSocketDebuggerUrl) throw new Error('Chrome debugging target unavailable');
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();
  await client.send('Runtime.enable');
  await client.send('Page.enable');
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  return client;
}
async function evaluate(c, expression) {
  const result = await c.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Page JavaScript error');
  return result.result?.value;
}
async function waitFor(c, title, expression, timeout = 30000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    try { if (await evaluate(c, expression)) { console.log('PASS ' + title); return; } } catch {}
    await sleep(250);
  }
  throw new Error('Timed out waiting for ' + title);
}
async function clickButton(c, label) {
  const expr = '(() => {const text=' + q(label) +
    '; const button=Array.from(document.querySelectorAll("button")).find(b=>String(b.textContent||"").trim().includes(text)&&!b.disabled&&getComputedStyle(b).display!=="none");' +
    'if(!button)return false;button.click();return true})()';
  if (!await evaluate(c, expr)) throw new Error('Button unavailable: ' + label);
}
async function fillInput(c, label, value) {
  const expr = '(() => {' +
    'const norm=v=>String(v||"").replace(/\\s+/g," ").trim().toLowerCase();' +
    'const expected=norm(' + q(label) + ');' +
    'const node=Array.from(document.querySelectorAll("label")).find(el=>norm(el.textContent).includes(expected));' +
    'let field=node?.querySelector("input,textarea,select")||null;' +
    'if(!field&&node?.htmlFor)field=document.getElementById(node.htmlFor);' +
    'if(!field&&node?.parentElement)field=node.parentElement.querySelector("input,textarea,select");' +
    'if(!field)field=Array.from(document.querySelectorAll("input,textarea,select")).find(el=>norm(el.getAttribute("placeholder")).includes(expected)||norm(el.getAttribute("aria-label")).includes(expected));' +
    'if(!field)return false;' +
    'const proto=field instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:field instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;' +
    'const setter=Object.getOwnPropertyDescriptor(proto,"value")?.set;' +
    'if(setter)setter.call(field,' + q(value) + ');else field.value=' + q(value) + ';' +
    'field.focus();field.dispatchEvent(new Event("input",{bubbles:true}));field.dispatchEvent(new Event("change",{bubbles:true}));return true;' +
    '})()';
  // The access screen can paint its heading before its controlled input.
  // Retry only locating/filling the real field; never skip the access gate.
  for (let attempt = 0; attempt < 40; attempt++) {
    if (await evaluate(c, expr)) return;
    await sleep(250);
  }
  throw new Error('Could not fill ' + label);
}
async function clickCheckbox(c, label) {
  const expr = '(() => {const node=Array.from(document.querySelectorAll("label")).find(el=>String(el.textContent||"").includes(' + q(label) + '));' +
    'const checkbox=node?.querySelector("input[type=checkbox]");if(!checkbox)return false;if(!checkbox.checked)checkbox.click();return checkbox.checked;})()';
  if (!await evaluate(c, expr)) throw new Error('Checkbox not found: ' + label);
}

const client = await createClient();
try {
  await client.send('Page.navigate', { url: BASE_URL });
  await waitFor(client, 'access code gate', 'document.body?.innerText.toLowerCase().includes("geschützter zugang")');
  await fillInput(client, 'Zugangscode', ACCESS_CODE);
  await clickButton(client, 'Klassio öffnen');
  await waitFor(client, 'new vault setup', 'document.body?.innerText.toLowerCase().includes("tresor auf diesem gerät einrichten")');
  await fillInput(client, 'Eigenes Tresor-Passwort', VAULT_PASSWORD);
  await fillInput(client, 'Passwort bestätigen', VAULT_PASSWORD);
  await clickButton(client, 'Weiter zum Wiederherstellungscode');
  await waitFor(client, 'recovery code', 'document.body?.innerText.toLowerCase().includes("dein einmaliger wiederherstellungscode")');
  await clickCheckbox(client, 'Ich habe den Wiederherstellungscode sicher notiert');
  await clickButton(client, 'Einrichtung abschließen');
  await waitFor(client, 'first-run setup', 'document.body?.innerText.toLowerCase().includes("willkommen bei klassio")');
  await clickButton(client, 'Beispielklasse erkunden');
  await waitFor(client, 'teacher dashboard', 'Array.from(document.querySelectorAll("button")).some(b=>String(b.textContent||"").trim()==="Heute")');
  await clickButton(client, 'Druckzentrum');
  await waitFor(client, 'print center', 'document.body?.textContent.includes("DRUCKZENTRUM")');
  await clickButton(client, 'KEL-Elternblatt');
  await waitFor(client, 'KEL options', 'Boolean(document.querySelector("[data-kel-parent-report-controls]"))');
  await waitFor(client, 'pupil in KEL parent sheet', 'Boolean(document.querySelector("[data-kel-parent-student-id]"))');
  await fillInput(client, 'Das gelingt schon gut', 'Arbeitet freundlich mit anderen Kindern');
  await fillInput(client, 'Daran arbeiten wir weiter', 'Aufgaben zunehmend selbstständig beginnen');
  await fillInput(client, 'Gesprächsnotizen & Vereinbarungen', 'Wir üben gemeinsam täglich zehn Minuten.');
  await waitFor(client, 'parent text reflected in print DOM',
    'document.querySelector(".print-center-overlay [data-kel-parent-report]")?.textContent.includes("Arbeitet freundlich mit anderen Kindern")');

  // Emulate the same print media and body classes as the browser print command.
  await evaluate(client, 'document.body.classList.add("print-center-active","print-center-kel-parent-active")');
  await client.send('Emulation.setEmulatedMedia', { media: 'print' });
  const metrics = await evaluate(client, '(() => {' +
    'const parent=document.querySelector(".print-center-overlay [data-kel-parent-report]");' +
    'const heading=parent?.querySelector("[data-kel-report-head]");' +
    'const sheet=parent?.closest("[data-kel-parent-print-sheet]");' +
    'const rect=el=>{const r=el?.getBoundingClientRect();return r?{top:r.top,width:r.width,height:r.height}:null};' +
    'const visible=el=>el&&getComputedStyle(el).display!=="none"&&getComputedStyle(el).visibility!=="hidden";' +
    'return {parent:rect(parent),heading:rect(heading),sheet:rect(sheet),headingVisible:Boolean(visible(heading)),' +
    'text:parent?.textContent.slice(0,800),genericVisible:Array.from(document.querySelectorAll(".global-print-header")).some(visible),' +
    'signatureFields:Array.from(parent?.querySelectorAll("[data-kel-signature-field]")||[]).filter(visible).length,' +
    'signatureSpaceHeights:Array.from(parent?.querySelectorAll("[data-kel-signature-space]")||[]).map(el=>el.getBoundingClientRect().height)};' +
    '})()');
  console.log('Actual print-media KEL layout:', JSON.stringify(metrics));
  if (!metrics.parent || !metrics.headingVisible || !metrics.heading || metrics.heading.width < 450) throw new Error('KEL heading invisible in Chrome print CSS');
  if (!metrics.sheet || metrics.sheet.width < 650 || metrics.sheet.width > 810) throw new Error('KEL sheet width does not fit A4');
  if (metrics.genericVisible || metrics.text.includes('Schulunterlagen')) throw new Error('Generic school header leaked into printed KEL report');
  if (metrics.signatureFields !== 2 || metrics.signatureSpaceHeights.length !== 2 || metrics.signatureSpaceHeights.some(h => h < 115)) {
    throw new Error('Parent and teacher signature fields do not retain 34mm writing room in A4 print: ' + JSON.stringify(metrics.signatureSpaceHeights));
  }

  const screenshot = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await fs.writeFile(SCREENSHOT_PATH, Buffer.from(screenshot.data, 'base64'));
  const pdf = await client.send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true });
  const bytes = new Uint8Array(Buffer.from(pdf.data, 'base64'));
  await fs.writeFile(PDF_PATH, bytes);
  const document = await getDocument({ data: bytes, useSystemFonts: true, disableFontFace: true }).promise;
  let content = '';
  for (let i = 1; i <= document.numPages; i++) {
    const page = await document.getPage(i);
    const texts = await page.getTextContent();
    content += '\n' + texts.items.map(item => ('str' in item ? item.str : '')).join(' ');
  }
  console.log('Actual printed PDF pages:', document.numPages, 'Text:', content.slice(0, 1100));
  for (const phrase of ['Lern-', 'Entwicklungsübersicht', 'Arbeitet freundlich', 'Aufgaben zunehmend', 'Wir üben gemeinsam', 'Erziehungsberechtigte', 'Lehrperson', 'Unterschrift']) {
    if (!content.includes(phrase)) throw new Error('Printed KEL PDF missing: ' + phrase);
  }
  if (content.includes('Schulunterlagen')) throw new Error('Printed PDF still includes generic Schulunterlagen header');
  if (document.numPages !== 1) throw new Error('Compact default KEL test unexpectedly spans ' + document.numPages + ' PDF pages');
  console.log('PASS Compact A4 PDF with parent/teacher signatures and readable text');

  // A realistic longer conversation must produce a complete multi-page PDF rather
  // than silently omitting the last written agreement or clipping signatures.
  await client.send('Emulation.setEmulatedMedia', { media: 'screen' });
  const longAgreements = Array.from({ length: 32 }, (_, i) =>
    'Zusatzvereinbarung ' + String(i + 1).padStart(2, '0') + ': Weiterarbeit wird beim nächsten Gespräch besprochen.').join('\\n');
  await fillInput(client, 'Gesprächsnotizen & Vereinbarungen', longAgreements);
  await waitFor(client, 'long notes in KEL document',
    'document.querySelector(".print-center-overlay [data-kel-parent-report]")?.textContent.includes("Zusatzvereinbarung 32")');
  await client.send('Emulation.setEmulatedMedia', { media: 'print' });
  const longResult = await client.send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true });
  const longBytes = new Uint8Array(Buffer.from(longResult.data, 'base64'));
  await fs.writeFile(LONG_PDF_PATH, longBytes);
  const longDocument = await getDocument({ data: longBytes, useSystemFonts: true, disableFontFace: true }).promise;
  const pageTexts = [];
  for (let i = 1; i <= longDocument.numPages; i++) {
    const page = await longDocument.getPage(i);
    const text = await page.getTextContent();
    pageTexts.push(text.items.map(item => ('str' in item ? item.str : '')).join(' '));
  }
  console.log('Long KEL print PDF pages:', longDocument.numPages);
  if (longDocument.numPages < 2 || longDocument.numPages > 5) throw new Error('Long KEL content pagination unexpected: ' + longDocument.numPages);
  if (!pageTexts.join(' ').includes('Zusatzvereinbarung 32')) throw new Error('Last agreement missing in multi-page KEL PDF');
  if (!pageTexts.some(text => text.includes('Erziehungsberechtigte') && text.includes('Lehrperson') && text.includes('Unterschrift'))) {
    throw new Error('Parent and teacher signature boxes split across pages or missing');
  }
  if (pageTexts.some(text => !text.trim())) throw new Error('Unexpected completely blank KEL PDF page');
  console.log('PASS Multi-page A4 KEL PDF preserves full text and signature fields');
} finally {
  client.close();
}
