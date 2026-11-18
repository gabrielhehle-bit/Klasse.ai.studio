import fs from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const BASE_URL = process.env.KLASSIO_E2E_BASE_URL || 'http://127.0.0.1:3100/login';
const DEBUG_URL = process.env.KLASSIO_CHROME_DEBUG_URL || 'http://127.0.0.1:9282';
const ACCESS_CODE = process.env.KLASSIO_E2E_ACCESS_CODE || 'ci-parent-print-access-2026';
const VAULT_PASSWORD = process.env.KLASSIO_E2E_VAULT_PASSWORD || 'Klassio-KEL-Print-2026!';
const PDF_PATH = process.env.KLASSIO_E2E_PDF || '/tmp/klassio-kel-parent-e2e.pdf';
const SCREENSHOT_PATH = process.env.KLASSIO_E2E_SCREENSHOT || '/tmp/klassio-kel-parent-e2e.png';
const LONG_PDF_PATH = process.env.KLASSIO_E2E_LONG_PDF || '/tmp/klassio-kel-parent-e2e-long.pdf';
const SELECTED_PDF_PATH = process.env.KLASSIO_E2E_SELECTED_PDF || '/tmp/klassio-kel-parent-e2e-selected.pdf';
const TREND_PDF_PATH = '/tmp/klassio-kel-parent-e2e-trends.pdf';
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

async function setControl(c, selector, value) {
  const expr = '(() => {const f=document.querySelector(' + q(selector) + ');if(!f)return false;' +
    'const proto=f instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:' +
    'f instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;' +
    'Object.getOwnPropertyDescriptor(proto,"value").set.call(f,' + q(value) + ');' +
    'f.dispatchEvent(new Event("input",{bubbles:true}));' +
    'f.dispatchEvent(new Event("change",{bubbles:true}));return true;})()';
  for (let i=0;i<40;i++){if(await evaluate(c,expr))return;await sleep(250);}
  throw new Error('Field unavailable: '+selector);
}
async function clickSelector(c, selector) {
  const ok=await evaluate(c,'(() => {const n=document.querySelector(' + q(selector) +
    ');if(!n||n.disabled)return false;n.click();return true;})()');
  if(!ok)throw new Error('Control unavailable: '+selector);
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
  // Create an isolated example-only KEL meeting through the same UI teachers use.
  if (!await evaluate(client, 'Boolean(document.querySelector("[data-menu-id=kel]"))')) {
    await clickSelector(client, 'button[aria-label^="Mehr ("]');
  }
  await waitFor(client, 'KEL menu', 'Boolean(document.querySelector("[data-menu-id=kel]"))');
  await clickSelector(client, '[data-menu-id="kel"]');
  await waitFor(client, 'KEL page rendered', 'Boolean(document.querySelector("[data-kel-shared-dossier-portal]")) || Array.from(document.querySelectorAll("button")).some(b=>b.textContent?.includes("Neues Protokoll"))');
  if (await evaluate(client, 'Array.from(document.querySelectorAll("button")).some(b=>b.textContent?.includes("Zu den Protokollen"))')) {
    await clickButton(client, 'Zu den Protokollen');
  } else {
    await clickButton(client, 'Protokolle');
  }
  await clickButton(client, 'Neues Protokoll');
  await waitFor(client, 'KEL quick editor', 'Boolean(document.querySelector("[data-kel-quick-entry]"))');
  const sampleStudentId=await evaluate(client,'document.querySelector("#kel-quick-student")?.options[1]?.value');
  if(!sampleStudentId)throw new Error('No sample child in explicit demo class');
  await setControl(client, '#kel-quick-student', sampleStudentId);
  await clickSelector(client, '[data-kel-quick-add-goal]');
  await setControl(client, '[data-kel-quick-goals] input[placeholder="Konkretes Ziel"]','Synthetisches Ziel: Silben sicher lesen');
  await clickSelector(client, '[data-kel-open-completion-review]');
  await waitFor(client, 'KEL review', 'Boolean(document.querySelector("[data-kel-review-confirm-save]"))');
  await clickSelector(client, '[data-kel-review-confirm-save]');
  await waitFor(client, 'saved KEL meeting', 'Array.from(document.querySelectorAll("button")).some(b=>b.textContent?.includes("Protokoll ansehen"))');
  await clickButton(client, 'Protokoll ansehen');
  await waitFor(client, 'KEL progress section', 'Boolean(document.querySelector("[data-kel-goal-progress-add]"))');

  await clickSelector(client, '[data-kel-goal-progress-add]');
  await waitFor(client, 'progress editor 1', 'Boolean(document.querySelector("[data-kel-goal-progress-editor]"))');
  await setControl(client, '[data-kel-goal-progress-editor] textarea', 'AUSGEWAEHLT: Liest drei Silben korrekt.');
  await clickSelector(client, '[data-kel-goal-progress-save]');
  await waitFor(client, 'first saved observation',
    'document.querySelector("[data-kel-goal-progress-history]")?.textContent.includes("AUSGEWAEHLT")');
  await clickSelector(client, '[data-kel-goal-progress-add]');
  await setControl(client, '[data-kel-goal-progress-editor] textarea', 'NICHT FREIGEGEBEN: Benötigt weitere Uebung.');
  await clickSelector(client, '[data-kel-goal-progress-save]');
  await waitFor(client, 'second saved observation',
    'document.querySelector("[data-kel-goal-progress-history]")?.textContent.includes("NICHT FREIGEGEBEN")');
  console.log('PASS Two dated KEL observations saved for a sample child');

  await clickButton(client, 'Druckzentrum');
  await waitFor(client, 'print center', 'Boolean(document.querySelector("#print-center-catalog") && document.querySelector("[data-testid=print-center-primary-print]"))');

  // Real Chrome phone layout: entry points must stay legible, tappable,
  // and horizontally reachable at 360 CSS pixels before checking A4 printing.
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 360, height: 780, deviceScaleFactor: 1, mobile: true,
  });
  await waitFor(client, '360px phone width', 'window.innerWidth === 360');
  await clickButton(client, 'Vorlagen & Tipps');
  await waitFor(client, 'mobile quick templates visible',
    'document.querySelectorAll("[data-testid=print-quick-preset]").length===4');
  const mobileControls=await evaluate(client, '(() => {' +
    'const root=document.querySelector(".print-center-overlay-parent");' +
    'const pick=selector=>Array.from(root?.querySelectorAll(selector)||[]);' +
    'const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,height:r.height};};' +
    'return {phone:innerWidth,search:pick("[data-testid=print-template-search]").map(rect),' +
    'help:pick("[data-testid=print-template-more-button]").map(rect),' +
    'presets:pick("[data-testid=print-quick-preset]").map(rect),' +
    'categoryPicker:pick("#print-mobile-category").map(rect),' +
    'categoryOptions:document.querySelector("#print-mobile-category")?.options.length,' +
    'cards:pick("[data-testid=print-template-grid] button").slice(0,6).map(rect)};' +
    '})()');
  const mobileTargets=[
    ...mobileControls.search, ...mobileControls.help,
    ...mobileControls.presets, ...mobileControls.categoryPicker, ...mobileControls.cards,
  ];
  if(mobileControls.phone!==360 || mobileControls.search.length!==1 ||
     mobileControls.help.length!==1 || mobileControls.presets.length!==4 ||
     mobileControls.categoryPicker.length!==1 || mobileControls.categoryOptions!==6 ||
     mobileControls.cards.length<5 ||
     mobileTargets.some(r=>r.width<44 || r.height<44 || r.left < -1 || r.right>361)){
    throw new Error('Print center mobile controls are too small or offscreen: '+JSON.stringify(mobileControls));
  }
  await setControl(client, '#print-mobile-category', 'schueler');
  await waitFor(client, 'mobile category filter changes actual template list',
    'document.querySelector("#print-mobile-category")?.value==="schueler" && ' +
    'Array.from(document.querySelectorAll("[data-testid=print-template-grid] button")).some(b=>b.textContent?.includes("KEL-Elternblatt")) && ' +
    '!Array.from(document.querySelectorAll("[data-testid=print-template-grid] button")).some(b=>b.textContent?.includes("Klassenliste"))');
  await setControl(client, '#print-mobile-category', 'all');
  await waitFor(client, 'mobile category reset', 'document.querySelector("#print-mobile-category")?.value==="all"');
  await clickButton(client, 'Druckformat anpassen');
  await waitFor(client, 'mobile print-format editor open',
    'document.querySelector("[data-testid=print-center-advanced-format]")?.open===true');
  const mobileFormats=await evaluate(client, '(() => {' +
    'const root=document.querySelector("[data-testid=print-center-advanced-format]");' +
    'const buttons=Array.from(root?.querySelectorAll("button[aria-pressed]")||[]).slice(0,10);' +
    'return buttons.map(b=>{const r=b.getBoundingClientRect();return {label:b.getAttribute("aria-label")||b.textContent.trim(),left:r.left,right:r.right,width:r.width,height:r.height};});' +
    '})()');
  if(mobileFormats.length!==10 || mobileFormats.some(r=>r.height<44 || r.width<44 || r.left< -1 || r.right>361)){
    throw new Error('Print-format phone controls are too small or clipped: '+JSON.stringify(mobileFormats));
  }
  const fittedPaper = `(() => {
    const frame = document.querySelector('[data-print-preview-frame]');
    const paper = frame?.querySelector('[data-print-preview-paper]');
    if (!paper) return false;
    const box = paper.getBoundingClientRect();
    const frameBox = frame.getBoundingClientRect();
    return box.width > 0 && box.left >= frameBox.left && box.right <= frameBox.right && frame.scrollWidth <= frame.clientWidth + 1;
  })()`;
  await clickButton(client, 'Hochformat');
  await clickButton(client, 'Seite einpassen');
  await waitFor(client, 'portrait preview fits the actual phone frame', fittedPaper);
  const portraitZoom = await evaluate(client, 'Number(document.querySelector("#print-preview-zoom-slider").value)');
  await clickButton(client, 'Querformat');
  await waitFor(client, 'landscape preview fits the phone frame after orientation change',
    `Number(document.querySelector('#print-preview-zoom-slider').value) < ${portraitZoom} && ${fittedPaper}`);
  await clickButton(client, '100 % Zoom');
  await waitFor(client, '100 percent preview scrolls inside its frame only', `(() => {
    const frame = document.querySelector('[data-print-preview-frame]');
    return frame.scrollWidth > frame.clientWidth && document.documentElement.scrollWidth <= innerWidth + 1;
  })()`);
  await clickButton(client, 'Seite einpassen');
  await waitFor(client, 'fit removes side scrolling again', fittedPaper);
  await clickButton(client, 'Angaben bearbeiten');
  await waitFor(client, 'preview links back to the actual configuration', 'document.activeElement?.id === "print-center-configuration"');
  await clickButton(client, 'Hochformat');
  await evaluate(client, 'window.scrollTo(0,0)');
  const mobileShot=await client.send('Page.captureScreenshot', {format:'png',captureBeyondViewport:false});
  await fs.writeFile('/tmp/klassio-kel-parent-mobile.png',Buffer.from(mobileShot.data,'base64'));
  console.log('PASS Real 360px Chrome print center: search, category selection, filtered templates, quick presets and format controls are touch accessible');

  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false,
  });
  await waitFor(client, 'desktop print view restored', 'window.innerWidth===1440');
  // Teachers can find the ONE formatting section without hunting for
  // orientation and header controls in multiple places.
  await clickButton(client, 'Vorlagen & Tipps');
  await waitFor(client, 'print presets and help visible',
    'Boolean(document.querySelector("[data-testid=print-center-presets-and-tips]"))');
  await clickButton(client, 'Druckformat anpassen');
  await waitFor(client, 'single print format section expanded',
    'document.querySelector("[data-testid=print-center-advanced-format]")?.open === true && !document.querySelector("#print-center-more-panel")');
  console.log('PASS Single print-format editor opens from the top help panel');

  await clickButton(client, 'KEL-Elternblatt');
  await waitFor(client, 'KEL options', 'Boolean(document.querySelector("[data-kel-parent-report-controls]"))');
  await clickButton(client, '100 % Zoom');
  await waitFor(client, '100 percent preview selected',
    'document.querySelector("#print-preview-zoom-slider")?.value === "1" && document.querySelector("[data-testid=print-preview-zoom-controls] button[aria-pressed=true]")?.textContent.includes("100 % Zoom")');
  await clickButton(client, 'Seite einpassen');
  await waitFor(client, 'fitted print preview selected',
    `document.querySelector('[data-testid=print-preview-zoom-controls] button[aria-pressed=true]')?.textContent.includes('Seite einpassen') && ${fittedPaper}`);
  console.log('PASS A4 preview chooses fit or 100 percent without modifying the printed document');
  // No child's private record should appear until the teacher explicitly
  // chooses the recipient. Printing must be blocked in the empty state.
  await waitFor(client, 'parent sheet awaits pupil selection',
    'document.querySelector("#kel-parent-student")?.value === "" && !document.querySelector("[data-kel-parent-student-id]") && document.querySelector("[data-testid=print-center-primary-print]")?.disabled === true');
  await setControl(client, '#kel-parent-student', sampleStudentId);
  await waitFor(client, 'parent print unlocked for selected child',
    'document.querySelector("[data-testid=print-center-primary-print]")?.disabled === false && document.querySelector("[data-testid=kel-parent-print-preflight]")?.textContent.includes("Elternblatt für")');
  await waitFor(client, 'selected sample child', 'document.querySelector("[data-kel-parent-student-id]")?.getAttribute("data-kel-parent-student-id")===' + q(sampleStudentId));
  await waitFor(client, 'new meeting offered for sample child', 'document.querySelector("#kel-parent-meeting")?.options.length > 1');
  const sampleMeetingId=await evaluate(client,'document.querySelector("#kel-parent-meeting")?.options[1]?.value');
  await setControl(client, '#kel-parent-meeting', sampleMeetingId);
  await waitFor(client, 'goal opt-in enabled by selected meeting',
    'Boolean(document.querySelector("[data-kel-parent-goal-progress-enable]:not([disabled])"))');
  const beforeConsent = await evaluate(client,
    '(() => {const p=document.querySelector("[data-kel-parent-report]");return {enabled:document.querySelector("[data-kel-parent-goal-progress-enable]")?.checked,private:p?.textContent.includes("AUSGEWAEHLT")||p?.textContent.includes("NICHT FREIGEGEBEN")};})()');
  if(beforeConsent.enabled || beforeConsent.private)throw new Error('Default parent report exposes private observations');
  await clickSelector(client, '[data-kel-parent-goal-progress-enable]');
  await waitFor(client, 'both observations separately selectable',
    'document.querySelectorAll("[data-kel-parent-goal-progress-checkbox]").length===2');
  if(await evaluate(client,'Boolean(document.querySelector("[data-kel-parent-goal-progress-print]"))'))
    throw new Error('Checking section toggle alone exposed goal progress');
  await clickSelector(client, '[data-kel-parent-goal-progress-checkbox]');
  await waitFor(client, 'one approved observation in print preview',
    'document.querySelector(".print-center-overlay [data-kel-parent-report]")?.querySelectorAll("[data-kel-parent-goal-progress-item]").length===1');
  const afterConsent=await evaluate(client,
    '(() => {const p=document.querySelector("[data-kel-parent-report]");return {selected:p?.textContent.includes("AUSGEWAEHLT"),excluded:p?.textContent.includes("NICHT FREIGEGEBEN")};})()');
  if(!afterConsent.selected || afterConsent.excluded)
    throw new Error('Individual observation approval failed: ' + JSON.stringify(afterConsent));

  await evaluate(client,'document.body.classList.add("print-center-active","print-center-kel-parent-active")');
  await client.send('Emulation.setEmulatedMedia',{media:'print'});
  const approvedPdf=await client.send('Page.printToPDF',{printBackground:true,preferCSSPageSize:true});
  const approvedBytes=new Uint8Array(Buffer.from(approvedPdf.data,'base64'));
  await fs.writeFile(SELECTED_PDF_PATH,approvedBytes);
  const approvedDoc=await getDocument({data:approvedBytes,useSystemFonts:true,disableFontFace:true}).promise;
  const approvedPages=[];
  for(let n=1;n<=approvedDoc.numPages;n++){
    const p=await approvedDoc.getPage(n);
    approvedPages.push((await p.getTextContent()).items.map(i=>'str'in i?i.str:'').join(' '));
  }
  const approvedText=approvedPages.join(' ');
  if(!approvedText.includes('AUSGEWAEHLT')||approvedText.includes('NICHT FREIGEGEBEN')||
     !approvedText.includes('Erziehungsberechtigte')||!approvedText.includes('Lehrperson'))
    throw new Error('Selected A4 PDF leaks unapproved progress or loses signatures');
  console.log('PASS Actual A4 parent PDF prints only one selected progress observation');
  await client.send('Emulation.setEmulatedMedia',{media:'screen'});
  await evaluate(client,'document.body.classList.remove("print-center-active","print-center-kel-parent-active")');
  await clickSelector(client,'[data-kel-parent-goal-progress-checkbox]');
  await waitFor(client,'revoked consent removes selected observation',
    '!document.querySelector("[data-kel-parent-goal-progress-print]")');
  await clickSelector(client,'[data-kel-parent-goal-progress-enable]');
  if(await evaluate(client,'document.querySelector("[data-kel-parent-goal-progress-enable]")?.checked'))
    throw new Error('Disabling observation approval did not reset parent preview');
  console.log('PASS Observation consent is individually reversible');

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
    'Zusatzvereinbarung ' + String(i + 1).padStart(2, '0') + ': Weiterarbeit wird beim nächsten Gespräch besprochen.').join('\n');
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
  if (longDocument.numPages !== 2) throw new Error('Long KEL document should fit in 2 A4 pages, got ' + longDocument.numPages);
  if (!pageTexts[0].includes('Zusatzvereinbarung 01')) {
    throw new Error('Long agreements were unnecessarily pushed to the next page');
  }
  if (!pageTexts.join(' ').includes('Zusatzvereinbarung 32')) throw new Error('Last agreement missing in multi-page KEL PDF');
  if (!pageTexts.some(text => text.includes('Erziehungsberechtigte') && text.includes('Lehrperson') && text.includes('Unterschrift'))) {
    throw new Error('Parent and teacher signature boxes split across pages or missing');
  }
  if (pageTexts.some(text => !text.trim())) throw new Error('Unexpected completely blank KEL PDF page');
  console.log('PASS Multi-page A4 KEL PDF preserves full text and signature fields');

  await client.send('Emulation.setEmulatedMedia', { media: 'screen' });
  await clickSelector(client, '[data-menu-id="kel"]');
  await waitFor(client, 'KEL child picker', 'Boolean(document.querySelector("[data-kel-shared-dossier-portal]"))');
  const nextChildId = await evaluate(client,
    'Array.from(document.querySelectorAll("[data-kel-child]")).map(b=>b.getAttribute("data-kel-child")).find(id=>id!==' + q(sampleStudentId) + ')');
  if (!nextChildId) throw new Error('A second sample child is required for the new conversation');
  await clickSelector(client, '[data-kel-child=' + q(nextChildId) + ']');
  await waitFor(client, 'direct conversation preparation', 'Array.from(document.querySelectorAll("h1")).some(h=>h.textContent==="Gespräch vorbereiten")');

  // A selected subject without a released note or selected learning areas may
  // still have a reportable overall grade, but must never get an empty slide.
  const emptySubjectLabel = await evaluate(client,
    'Array.from(document.querySelectorAll("[data-testid=kel-gradebook-preparation] label")).find(l=>l.textContent.includes(": noch keine Gesamtbewertung"))?.textContent.trim()');
  if (!emptySubjectLabel) throw new Error('No ungraded sample subject available');
  const emptySubject = emptySubjectLabel.split(':')[0];
  await clickCheckbox(client, emptySubjectLabel);
  await clickButton(client, 'Vorschau ansehen');
  await waitFor(client, 'child prompt slide available',
    'Boolean(Array.from(document.querySelectorAll("[aria-label^=Folie]")).find(b=>b.getAttribute("aria-label").includes("So sehen wir es")))');
  if (await evaluate(client, 'Array.from(document.querySelectorAll("[aria-label^=Folie]")).some(b=>b.getAttribute("aria-label").endsWith(' + q(': ' + emptySubject) + '))')) {
    throw new Error('A subject without selected conversation material generated a slide');
  }
  await clickSelector(client, '[aria-label^="Folie"][aria-label$="So sehen wir es"]');
  await waitFor(client, 'undocumented child perspective becomes a live prompt',
    'document.body.innerText.includes("Worauf bist du stolz? Was möchtest du uns zeigen?")');
  await clickSelector(client, '[aria-label^="Folie"][aria-label$="Meine nächsten Schritte"]');
  await fillInput(client, 'Was machen wir?', 'Wir spielen zusammen Anlautspiele.');
  await fillInput(client, 'Wer hilft und wie?', 'Die Lehrperson legt die Karten bereit.');
  await fillInput(client, 'Woran erkennen wir den Fortschritt?', 'Das Kind nennt die ersten Laute.');
  await fillInput(client, 'Wann schauen wir wieder darauf?', '25.11.2026');
  await clickButton(client, 'Gespräch speichern');
  await waitFor(client, 'conversation saved before printing',
    'Array.from(document.querySelectorAll("button")).some(b=>b.textContent.trim()==="Elternblatt ansehen"&&!b.disabled)');
  await clickSelector(client, '[aria-label^="Folie"][aria-label$="Das nehmen wir mit"]');
  await waitFor(client, 'closing slide shows the saved agreement and follow-up',
    'document.body.innerText.includes("Wir spielen zusammen Anlautspiele.") && document.body.innerText.includes("25.11.2026")');
  await clickButton(client, 'Elternblatt ansehen');
  await waitFor(client, 'same child and agreement copied into the parent sheet',
    'document.querySelector("#kel-parent-student")?.value===' + q(nextChildId) + ' && document.querySelector("#kel-parent-agreements")?.value.includes("Die Lehrperson legt die Karten bereit.") && document.querySelector("#kel-parent-agreements")?.value.includes("25.11.2026")');

} finally {
  client.close();
}
