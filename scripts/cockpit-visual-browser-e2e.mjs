import fs from 'node:fs/promises';

const BASE_URL = process.env.KLASSIO_E2E_BASE_URL || 'http://localhost:3100/login';
const DEBUG_URL = process.env.KLASSIO_CHROME_DEBUG_URL || 'http://127.0.0.1:9292';
const ACCESS_CODE = process.env.KLASSIO_E2E_ACCESS_CODE || 'ci-cockpit-visual-access-2026';
const VAULT_PASSWORD = 'Klassio-Cockpit-Visual-E2E-2026!';
const WIDTH = Number(process.env.KLASSIO_E2E_WIDTH || 1600);
const HEIGHT = WIDTH >= 1500 ? 900 : 720;
const TOUCH_PHONE = process.env.KLASSIO_E2E_TOUCH_PHONE === '1' && WIDTH < 640;
const PREFIX = '/tmp/klassio-cockpit-visual-' + WIDTH;
const q = JSON.stringify;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

class CdpClient {
  constructor(url) { this.url=url; this.id=0; this.pending=new Map(); this.navigationCount=0; }
  async connect() {
    await new Promise((resolve,reject)=>{
      this.ws=new WebSocket(this.url);
      this.ws.onopen=resolve; this.ws.onerror=reject;
      this.ws.onmessage=event=>{
        const msg=JSON.parse(String(event.data));
        if (msg.method === 'Page.frameNavigated' && !msg.params.frame?.parentId) this.navigationCount++;
        if (msg.method === 'Page.javascriptDialogOpening' && msg.params.type === 'beforeunload') {
          // Keep the page open while the encrypted write finishes, then retry.
          void this.send('Page.handleJavaScriptDialog', { accept: false }).catch(() => {});
        }
        const p=this.pending.get(msg.id);
        if (!p) return;
        this.pending.delete(msg.id);
        clearTimeout(p.timer);
        if(msg.error) p.reject(Error(msg.error.message)); else p.resolve(msg.result);
      };
    });
  }
  send(method, params={}) {
    return new Promise((resolve,reject)=>{
      const id=++this.id;
      const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('CDP timed out: '+method));},20000);
      this.pending.set(id,{resolve,reject,timer});
      this.ws.send(JSON.stringify({id,method,params}));
    });
  }
  close() { this.ws?.close(); }
}

async function waitForChrome() {
  for(let n=0;n<180;n++) {
    try { if((await fetch(DEBUG_URL+'/json/version')).ok) return; }catch{}
    await sleep(250);
  }
  throw Error('Chrome Debug endpoint unavailable');
}
async function evaluate(client, expression) {
  const r=await client.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});
  if(r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result?.value;
}
async function waitFor(client,name,expression,timeout=30000) {
  const end=Date.now()+timeout;
  while(Date.now()<end) {
    try { if(await evaluate(client,expression)) { console.log('✓ '+name); return; } }catch{}
    await sleep(200);
  }
  throw Error('Timeout: '+name);
}
async function clickButton(client,text) {
  const ok=await evaluate(client,
    '(() => {const t='+q(text)+';const buttons=Array.from(document.querySelectorAll("button")).filter(x=>x.getBoundingClientRect().width>0 && x.getBoundingClientRect().height>0 && !x.disabled);const normalized=x=>x.textContent.replace(/\\s+/g," ").trim();const b=buttons.find(x=>normalized(x)===t)||buttons.find(x=>normalized(x).includes(t));if(!b)return false;b.click();return true;})()');
  if(!ok)throw Error('Button missing: '+text);
}
async function clickLabel(client,label,optional=false) {
  const ok=await evaluate(client,
    '(() => {const b=Array.from(document.querySelectorAll("button")).find(x=>x.getAttribute("aria-label")==='+q(label)+'); if(!b)return false; b.click();return true;})()');
  if(!ok&&!optional)throw Error('Action missing: '+label);
  return ok;
}
async function fill(client,label,value) {
  const expression =
    '(() => {' +
    'const norm=v=>String(v||"").replace(/\\s+/g," ").trim().toLowerCase();' +
    'const expected=norm('+q(label)+');' +
    'const l=Array.from(document.querySelectorAll("label")).find(x=>norm(x.textContent).includes(expected));' +
    'let input=l?.querySelector("input,textarea,select")||null;' +
    'if(!input&&l?.htmlFor) input=document.getElementById(l.htmlFor);' +
    'if(!input&&l?.parentElement) input=l.parentElement.querySelector("input,textarea,select");' +
    'if(!input)input=Array.from(document.querySelectorAll("input,textarea,select")).find(x=>norm(x.getAttribute("aria-label")).includes(expected)||norm(x.getAttribute("placeholder")).includes(expected));' +
    'if(!input)return false;' +
    'const proto=input instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:input instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;' +
    'const setter=Object.getOwnPropertyDescriptor(proto,"value")?.set;' +
    'if(setter)setter.call(input,'+q(value)+');else input.value='+q(value)+';' +
    'input.focus();input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));return true;})()';
  if(!await evaluate(client,expression))throw Error('Input missing: '+label);
}

async function screenshot(client,suffix) {
  const r=await client.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  const path=PREFIX+'-'+suffix+'.png';
  await fs.writeFile(path,Buffer.from(r.data,'base64'));
  console.log('Screenshot: '+path);
}
async function metrics(client) {
  return evaluate(client,`(() => {
    const rect=el=>{const r=el?.getBoundingClientRect();return r?{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}:null;};
    const board=document.querySelector('.klassio-whiteboard');
    const header=document.querySelector('.klassio-cockpit-shell > header');
    const sidebar=document.querySelector('.klassio-student-sidebar');
    const dock=document.querySelector('.klassio-widget-dock');
    const list=sidebar?.querySelector('[role=list]');
    const cards=Array.from(list?.querySelectorAll('[role=listitem]')||[]);
    const boardR=rect(board), sideR=rect(sidebar), dockR=rect(dock), listR=rect(list);
    const cardsWithin=cards.every(el=>{const r=el.getBoundingClientRect();return r.left>=listR.x-2&&r.right<=listR.right+2&&r.top>=listR.y-2&&r.bottom<=listR.bottom+2;});
    const touchTargets=cards.map(el=>el.querySelector('button[aria-label^="Pluspunkt für"]')?.getBoundingClientRect());
    const touchSizeOK=touchTargets.length>0 && touchTargets.every(r=>r && r.width>=43 && r.height>=43);
    const controls=Array.from(document.querySelectorAll('.klassio-cockpit-shell button')).filter(b=>{
      const r=b.getBoundingClientRect();return r.width>0&&r.height>0&&r.top<150;
    }).map(b=>({label:b.getAttribute('aria-label')||b.title||b.textContent.trim(),r:rect(b)}));
    return {viewport:innerWidth,docWidth:document.documentElement.scrollWidth,header:rect(header),board:boardR,
      sidebar:sideR,dock:dockR,studentCount:cards.length,cardsWithin,touchSizeOK,
      controls:controls.filter(x=>x.r.right>innerWidth+2||x.r.x< -2),
      visibleBoardActions:controls.filter(x=>/Tafel groß|Schülerliste|Vollbild/.test(x.label))};
  })()`);
}

const toggleWaldruheDock = client => evaluate(client, `document.querySelector('[data-dock-favorite-id="waldruhe"]').click()`);

async function checkWaldruhePreflight(client, forest, forestProgress) {
  const toggleSettings = () => evaluate(client, `document.querySelector('[data-widget-type="waldruhe"] .cockpit-widget-settings-trigger').click()`);
  const settings = `${forest}.querySelector('[aria-label="Waldruhe-Einstellungen"]')`;
  const noProgress = `!${forest}.querySelector('[role="progressbar"], [data-waldruhe-animal]')`;
  const fixture = 'window.__waldruhePreflight';
  await evaluate(client, `(() => {
    const devices = navigator.mediaDevices;
    const original = devices.getUserMedia;
    const getFrequencyData = AnalyserNode.prototype.getByteFrequencyData;
    const audio = new AudioContext();
    const test = { tracks: [], level: 220, hold: false, denied: false };
    ${fixture} = test;
    devices.getUserMedia = async () => {
      if (test.denied) throw new DOMException('Test permission denied', 'NotAllowedError');
      if (test.hold) await new Promise(resolve => { test.resolve = resolve; });
      const stream = audio.createMediaStreamDestination().stream;
      test.tracks.push(...stream.getAudioTracks());
      return stream;
    };
    AnalyserNode.prototype.getByteFrequencyData = samples => samples.fill(test.level);
    test.restore = async () => {
      devices.getUserMedia = original;
      AnalyserNode.prototype.getByteFrequencyData = getFrequencyData;
      test.tracks.forEach(track => track.stop());
      delete ${fixture};
      await audio.close();
    };
  })()`);

  try {
    await toggleSettings();
    await waitFor(client, 'Mikrofon prüfen is visible when Waldruhe settings open', `(() => {
      const button = Array.from(${settings}.querySelectorAll('button')).find(button => button.textContent.trim() === 'Mikrofon prüfen');
      const { x, y, width, height } = button.getBoundingClientRect();
      return button.contains(document.elementFromPoint(x + width / 2, y + height / 2));
    })()`);
    await evaluate(client, `(() => {
      const choice = ${settings}.querySelector('select[aria-label="Leisezeit pro Tier"]');
      choice.value = '5';
      choice.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await clickButton(client, 'Mikrofon prüfen');
    await waitFor(client, 'the microphone check reports sound above the selected limit',
      `${forest}.dataset.waldruheMode === 'checking' && ${settings}.textContent.includes('Über der Grenze')
        && ${fixture}.tracks.length === 1 && ${noProgress}`);
    await evaluate(client, `${fixture}.level = 80`);
    await waitFor(client, 'the level settles between the partner-work and whisper limits',
      `Number(${settings}.querySelector('[role="meter"]').getAttribute('aria-valuenow')) < 48`);
    await clickButton(client, 'Partnerarbeit');
    await waitFor(client, 'changing the working mode updates the limit without reconnecting',
      `${settings}.textContent.includes('Grenze eingehalten') && ${fixture}.tracks.length === 1`);
    await clickButton(client, 'Flüsterarbeit');
    await waitFor(client, 'the same signal is above the limit for whispering',
      `${settings}.textContent.includes('Über der Grenze')`);
    await evaluate(client, `${fixture}.level = 0`);
    await waitFor(client, 'the microphone check reports a quiet room',
      `${settings}.textContent.includes('Grenze eingehalten')`);
    await screenshot(client, 'waldruhe-mikrofoncheck');
    await sleep(5500);
    if (!await evaluate(client, noProgress)) throw Error('Waldruhe advanced the round during the microphone check');
    await clickButton(client, 'Runde starten');
    await waitFor(client, 'the round starts from zero on the existing microphone track',
      `${forest}.dataset.waldruheMode === 'live' && !${settings}
        && ${forestProgress} > 0 && ${forestProgress} < 30
        && ${forest}.textContent.includes('0 von 5 Tieren')
        && ${fixture}.tracks.length === 1 && ${fixture}.tracks[0].readyState === 'live'`);
    await clickButton(client, 'Mikrofon stoppen');

    await toggleSettings();
    await clickButton(client, 'Mikrofon prüfen');
    await waitFor(client, 'a second microphone check opens a fresh stream',
      `${forest}.dataset.waldruheMode === 'checking' && ${fixture}.tracks.length === 2`);
    await clickButton(client, 'Check beenden');
    await waitFor(client, 'ending the check stops audio without starting a round',
      `${fixture}.tracks[0].readyState === 'ended' && ${fixture}.tracks[1].readyState === 'ended'
        && ${forest}.dataset.waldruheMode === 'idle' && ${noProgress}`);

    await clickButton(client, 'Mikrofon prüfen');
    await waitFor(client, 'a check is running before settings close', `${forest}.dataset.waldruheMode === 'checking'`);
    await toggleSettings();
    await waitFor(client, 'closing settings also releases the microphone check',
      `${fixture}.tracks[2].readyState === 'ended' && ${forest}.dataset.waldruheMode === 'idle'`);

    await toggleSettings();
    await evaluate(client, `${fixture}.hold = true`);
    await clickButton(client, 'Mikrofon prüfen');
    await waitFor(client, 'the check is waiting for microphone access',
      `${forest}.dataset.waldruheMode === 'requesting-check' && Boolean(${fixture}.resolve)`);
    await toggleWaldruheDock(client);
    await waitFor(client, 'minimizing cancels a pending check', `${forest}.dataset.waldruheMode === 'idle'`);
    await evaluate(client, `${fixture}.resolve()`);
    await waitFor(client, 'audio returned after cancellation is released immediately',
      `${fixture}.tracks[3].readyState === 'ended'`);
    await toggleWaldruheDock(client);
    if (!await evaluate(client, `Boolean(${settings})`)) await toggleSettings();
    await evaluate(client, `${fixture}.denied = true`);
    await clickButton(client, 'Mikrofon prüfen');
    await waitFor(client, 'permission denial explains how to continue without a microphone',
      `${forest}.dataset.waldruheMode === 'idle' && ${forest}.querySelector('[role="alert"]')?.textContent.includes('Erlaube das Mikrofon')`);
    await clickButton(client, 'Fertig');
    await clickButton(client, 'Ohne Mikrofon testen');
    await waitFor(client, 'the rehearsal is available after permission denial', `${forest}.dataset.waldruheMode === 'demo'`);
    await clickButton(client, 'Test beenden');
  } finally {
    await evaluate(client, `${fixture}.restore()`);
  }
}

async function checkWaldruheMicrophone(client, forest, forestProgress) {
  const origin = new URL(BASE_URL).origin;
  const capturePermission = { permission: { name: 'microphone' }, origin };
  await client.send('Browser.setPermission', { ...capturePermission, setting: 'granted' });
  await evaluate(client, `(() => {
    const devices = navigator.mediaDevices;
    const original = devices.getUserMedia.bind(devices);
    window.__waldruheTracks = [];
    devices.getUserMedia = async constraints => {
      const stream = await original(constraints);
      window.__waldruheTracks.push(...stream.getAudioTracks());
      return stream;
    };
  })()`);

  await evaluate(client, `document.querySelector('[data-widget-type="waldruhe"] .cockpit-widget-settings-trigger').click()`);
  await evaluate(client, `(() => {
    const choice = ${forest}.querySelector('select[aria-label="Leisezeit pro Tier"]');
    choice.value = '5';
    choice.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await waitFor(client, 'Waldruhe defaults to a one-second noise buffer',
    `${forest}.querySelector('select[aria-label="Puffer für kurze Geräusche"]').value === '1000'`);
  await evaluate(client, `(() => {
    const panel = ${forest};
    const observer = new MutationObserver(() => {
      if (panel.textContent.includes('Ruhezeit pausiert')) panel.dataset.testPauseObserved = 'true';
    });
    observer.observe(panel, { childList: true, characterData: true, subtree: true });
    window.__waldruhePauseObserver = observer;
  })()`);
  await clickButton(client, 'Mikrofon starten');
  await waitFor(client, 'real microphone path opens a live Chromium audio track',
    `window.__waldruheTracks.length === 1 && window.__waldruheTracks[0].readyState === 'live' && ${forest}?.textContent.includes('Mikrofon stoppen')`);
  await waitFor(client, 'quiet microphone samples advance the five-second timer',
    `${forestProgress} >= 5 && ${forest}?.querySelector('[role="progressbar"]').getAttribute('aria-valuemax') === '50'`);
  const liveMeter = `${forest}.querySelector('[role="meter"][aria-label="Relativer Mikrofonpegel"]')`;
  await waitFor(client, 'the settings meter sees the brief microphone spike',
    `Number(${liveMeter}?.getAttribute('aria-valuenow')) > 26`, 2500);
  await waitFor(client, 'the brief spike ends without pausing the scene',
    `Number(${liveMeter}?.getAttribute('aria-valuenow')) < 20 && !${forest}.textContent.includes('Ruhezeit pausiert')`, 1600);
  const briefNoisePaused = await evaluate(client, `(() => {
    window.__waldruhePauseObserver.disconnect();
    return ${forest}.dataset.testPauseObserved === 'true';
  })()`);
  if (briefNoisePaused) throw Error('A brief microphone spike paused the scene');
  await screenshot(client, 'waldruhe-mikrofonpegel');
  await clickButton(client, 'Fertig');
  await waitFor(client, 'the microphone meter stays in the settings', `!${liveMeter}`);
  await waitFor(client, 'loud microphone samples pause the timer', `${forest}?.textContent.includes('Ruhezeit pausiert')`, 10000);
  const pausedAt = await evaluate(client, forestProgress);
  await sleep(550);
  if (await evaluate(client, forestProgress) !== pausedAt) throw Error('Waldruhe microphone: loud sound advanced the timer');
  await waitFor(client, 'quiet microphone samples resume the timer', `${forestProgress} > ${pausedAt}`, 12000);
  await waitFor(client, 'a Waldruhe animal appears from real analyser input', `${forest}?.textContent.includes('1 von 5 Tieren')`, 12000);
  await waitFor(client, 'quiet time accumulates toward the next animal', `${forestProgress} >= 5`);
  await toggleWaldruheDock(client);
  await waitFor(client, 'minimizing stops the microphone track and keeps the animal',
    `window.__waldruheTracks[0].readyState === 'ended' && ${forest}.dataset.waldruheMode === 'paused-live'
      && ${forest}.textContent.includes('1 von 5 Tieren')`);
  const frozen = await evaluate(client, forestProgress);
  if (!(frozen >= 5)) throw Error('Waldruhe lost the quiet time banked before minimizing');
  await toggleWaldruheDock(client);
  await waitFor(client, 'restoring shows an explicit resume action with the microphone off',
    `${forest}.getBoundingClientRect().width > 0 && ${forest}.textContent.includes('Fortsetzen')
      && ${forest}.textContent.includes('Mikrofon aus') && ${forestProgress} === ${frozen}`);
  await sleep(600);
  if (!await evaluate(client, `window.__waldruheTracks.length === 1 && ${forestProgress} === ${frozen}`)) {
    throw Error('Restoring Waldruhe restarted the microphone or the countdown automatically');
  }

  await client.send('Browser.setPermission', { ...capturePermission, setting: 'denied' });
  await clickButton(client, 'Fortsetzen');
  await waitFor(client, 'denied resume keeps the round available',
    `${forest}.dataset.waldruheMode === 'paused-live'
      && ${forest}.querySelector('[role="alert"]')?.textContent.includes('Erlaube das Mikrofon')
      && ${forestProgress} === ${frozen} && window.__waldruheTracks.length === 1`);
  await client.send('Browser.setPermission', { ...capturePermission, setting: 'granted' });
  await clickButton(client, 'Fortsetzen');
  await waitFor(client, 'explicit resume starts a new track and continues the previous countdown',
    `window.__waldruheTracks.length === 2 && window.__waldruheTracks[1].readyState === 'live'
      && ${forest}.textContent.includes('1 von 5 Tieren') && ${forestProgress} > ${frozen}`);
  await clickButton(client, 'Mikrofon stoppen');
  await waitFor(client, 'stop releases the new track and clears the round',
    `window.__waldruheTracks[1].readyState === 'ended' && !${forest}.querySelector('[role="progressbar"]')
      && ${forest}.textContent.includes('0 von 5 Tieren')`);

  await evaluate(client, `(() => {
    const devices = navigator.mediaDevices;
    const wrapped = devices.getUserMedia;
    devices.getUserMedia = async constraints => {
      devices.getUserMedia = wrapped;
      await new Promise(resolve => { window.__resolveWaldruheRequest = resolve; });
      return wrapped(constraints);
    };
  })()`);
  await clickButton(client, 'Mikrofon starten');
  await waitFor(client, 'the microphone request is still pending',
    `${forest}.dataset.waldruheMode === 'requesting' && Boolean(window.__resolveWaldruheRequest)`);
  await toggleWaldruheDock(client);
  await waitFor(client, 'minimizing invalidates the pending microphone request', `${forest}.dataset.waldruheMode === 'paused-live'`);
  await evaluate(client, 'window.__resolveWaldruheRequest()');
  await waitFor(client, 'a track returned after minimizing is immediately stopped',
    `window.__waldruheTracks.length === 3 && window.__waldruheTracks[2].readyState === 'ended'`);
  await toggleWaldruheDock(client);
  await clickButton(client, 'Runde beenden');

  await client.send('Browser.setPermission', { ...capturePermission, setting: 'denied' });
  await clickButton(client, 'Mikrofon starten');
  await waitFor(client, 'denied microphone permission shows the fall-back hint',
    `${forest}?.querySelector('[role="alert"]')?.textContent.includes('Erlaube das Mikrofon') && window.__waldruheTracks.length === 3`);
}

async function searchWidget(client, query) {
  await clickButton(client, 'Widget hinzufügen');
  await fill(client, 'Widget suchen', query);
}

async function checkLinkedNumbers(client) {
  const widget = `document.querySelector('#widget-board-stage [data-widget-type="zahlenraum"]')`;
  const line = `${widget}?.querySelector('svg[data-linked-twenty-line]')`;
  const equation = `${widget}?.querySelector('#zahlenraum-split-panel')`;
  const matches = (value, first, second) => `(() => {
    const line = ${line};
    return line?.getAttribute('aria-valuenow') === ${q(String(value))} &&
      line.querySelector('[data-linked-number-label]').textContent === ${q(String(value))} &&
      ${widget}.querySelectorAll('[data-grid-filled="true"]').length === ${value}
      ${first === undefined ? '' : `&& ${equation}.textContent.trim() === '${value} = ${first} + ${second}' &&
      ${widget}.querySelectorAll('[data-grid-color="primary"]').length === ${first} &&
      ${widget}.querySelectorAll('[data-grid-color="secondary"]').length === ${second}`};
  })()`;
  await clickLabel(client, 'Neue Tafelseite hinzufügen');
  await searchWidget(client, 'Zahlenraum');
  await waitFor(client, 'the curated Zahlenraum card is available', `Boolean(document.querySelector('[data-testid="cockpit-core-group-zahlenraum"] [data-widget-card-action="primary"]'))`);
  await evaluate(client, `document.querySelector('[data-testid="cockpit-core-group-zahlenraum"] [data-widget-card-action="primary"]').click()`);
  await waitFor(client, 'the twenty field and number line open with the same seventeen', matches(17));
  await clickButton(client, 'Schätzfenster');
  await clickButton(client, 'Kurz zeigen');
  const estimate = `${widget}.querySelector('section[aria-label="Schätzfenster"]')`;
  const shown = await evaluate(client, `${estimate}.querySelectorAll('span.bg-accent').length`);
  if (shown < 1 || shown > 20) throw Error('Invalid flash quantity');
  await waitFor(client, 'the estimate is covered automatically', `${estimate}.textContent.includes('Wie viele Punkte') && !${estimate}.querySelector('span.bg-accent')`);
  await clickButton(client, 'Aufdecken');
  await waitFor(client, 'revealing restores the same quantity', `${estimate}.querySelectorAll('span.bg-accent').length === ${shown} && ${estimate}.textContent.includes('${shown} Punkte')`);
  await clickButton(client, 'Zurück zum Zahlenraum');
  await evaluate(client, `${widget}.querySelector('.cockpit-widget-menu-trigger').click()`);
  await clickButton(client, 'Minimieren');
  const dot = `Array.from(document.querySelectorAll('.klassio-widget-dock button')).find(b => b.getAttribute('aria-label')?.includes('Zahlenraum') && b.querySelector('.bg-black'))`;
  await waitFor(client, 'only the dot is visible for the minimized widget', `Boolean(${dot}) && !(${dot}).textContent.trim()`);
  await evaluate(client, `(${dot}).click()`);
  await waitFor(client, 'restoring keeps the original field', matches(17));
  await clickButton(client, 'Zerlegung');
  await waitFor(client, 'the initial decomposition groups seventeen into ten and seven', matches(17, 10, 7));
  await waitFor(client, 'both colours are projected at the mathematically correct positions', `(() => {
    const line = ${line};
    const first = line.querySelector('[data-linked-first-part]');
    const second = line.querySelector('[data-linked-second-part]');
    const firstDot = ${widget}.querySelector('[data-grid-color="primary"]');
    const secondDot = ${widget}.querySelector('[data-grid-color="secondary"]');
    return first.getAttribute('x2') === '500' && second.getAttribute('x1') === '500' &&
      Math.abs(Number(second.getAttribute('x2')) - 822) < 0.01 &&
      getComputedStyle(first).stroke === getComputedStyle(firstDot).backgroundColor &&
      getComputedStyle(second).stroke === getComputedStyle(secondDot).backgroundColor &&
      getComputedStyle(first).stroke !== getComputedStyle(second).stroke;
  })()`);
  const point = await evaluate(client, `(() => {
    const line = ${line};
    const point = line.createSVGPoint();
    point.x = 40 + 14 * 46;
    point.y = 43;
    const actual = point.matrixTransform(line.getScreenCTM());
    return { x: actual.x, y: actual.y, reachable: line.contains(document.elementFromPoint(actual.x, actual.y)) };
  })()`);
  if (!point.reachable) throw Error('Tapping a point on the number line is obstructed.');
  const { x, y } = point;
  await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await waitFor(client, 'tapping fourteen on the line changes the field and decomposition', matches(14, 10, 4));
  await clickLabel(client, 'Menge 19 wählen');
  await waitFor(client, 'a field tap updates the number line', matches(19, 10, 9));
  await evaluate(client, `${line}.focus()`);
  await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
  await waitFor(client, 'keyboard selection updates both maths representations', matches(18, 10, 8));
  await waitFor(client, 'all twenty-field and line controls are reachable without the dock covering them', `(() => {
    const widget = ${widget};
    const controls = widget.querySelectorAll('#zahlenraum-quantity-controls button, #zahlenraum-grid button, #zahlenraum-split-slider, [data-linked-twenty-line]');
    return controls.length >= 25 && Array.from(controls).every(control => {
      const r = control.getBoundingClientRect();
      return r.height >= 43.5 && control.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
    });
  })()`);
  await evaluate(client, `document.activeElement?.blur()`);
  await screenshot(client, 'zwanzigerfeld-zerlegung-zahlenstrahl');
  await reloadSavedCockpit(client);
  await waitFor(client, 'both representations restore the same saved number and decomposition', matches(18, 10, 8));
  await evaluate(client, `${widget}.querySelector('.cockpit-widget-settings-trigger').click()`);
  await waitFor(client, 'the standalone number line remains available through settings', `Boolean(document.querySelector('dialog[open] #zahlenraum-mode-numberline-btn'))`);
  await evaluate(client, `document.querySelector('dialog[open] #zahlenraum-mode-numberline-btn').click()`);
  await clickLabel(client, 'Zahlenraum-Einstellungen schließen');
  await waitFor(client, 'standalone number line still exposes marker and jump controls',
    `!${line} && ${widget}.querySelector('[aria-label="Hauptmarker eingeben"]') && Boolean(${widget}.querySelector('[aria-label="Eigene Sprungweite"]'))`);
  await evaluate(client, `${widget}.querySelector('button[title$=" schließen"][aria-label$=" schließen"]').click()`);
  await waitFor(client, 'the header close button dismisses the widget', `!${widget}`);
}

async function checkSubjectWidgets(client) {
  await clickLabel(client, 'Neue Tafelseite hinzufügen');
  const widget = type => `document.querySelector('#widget-board-stage [data-widget-type="${type}"]')`;
  const chooseCategory = name => evaluate(client, `Array.from(document.querySelectorAll('[aria-label="Widget-Kategorien"] button'))
    .find(button => button.lastElementChild.textContent === ${q(name)}).click()`);
  const open = async (category, type) => {
    await clickButton(client, 'Widget hinzufügen');
    await chooseCategory(category);
    await evaluate(client, `document.querySelector('[data-testid="cockpit-core-group-${type}"] [data-widget-card-action="primary"]').click()`);
    await waitFor(client, `${category} opens ${type} on the board`, `Boolean(${widget(type)})`);
  };
  const close = async type => {
    await evaluate(client, `${widget(type)}.querySelector('button[aria-label="Widget-Menü öffnen"]').click()`);
    await clickButton(client, 'Widget schließen');
    await waitFor(client, `${type} closes cleanly`, `!${widget(type)}`);
  };

  await open('Mathe', 'kopfrechnen');
  await waitFor(client, 'a calculation is shown with its solution covered',
    `${widget('kopfrechnen')}?.querySelector('[data-mental-math-question]') && !${widget('kopfrechnen')}.querySelector('[data-mental-math-answer]')`);
  await clickButton(client, 'Lösung aufdecken');
  await waitFor(client, 'the class can reveal the result after thinking',
    `Boolean(${widget('kopfrechnen')}.querySelector('[data-mental-math-answer]'))`);
  await close('kopfrechnen');

  await open('Deutsch', 'wortsatzwerkstatt');
  await clickButton(client, 'Alle Übungen');
  await clickButton(client, 'Sätze bauen');
  await waitFor(client, 'the word workshop has a working sentence mode',
    `${widget('wortsatzwerkstatt')}.querySelector('#tab-mode-sentence').getAttribute('aria-selected') === 'true'`);
  await close('wortsatzwerkstatt');

  await open('Sachunterricht', 'compass');
  const directions = `${widget('compass')}.querySelectorAll('[aria-label="Himmelsrichtung wählen"] button')`;
  await waitFor(client, 'the compass presents at least the four compass points', `${directions}.length >= 4`);
  await evaluate(client, `${directions}[1].click()`);
  await waitFor(client, 'tapping a compass point selects its direction', `${directions}[1].getAttribute('aria-pressed') === 'true'`);
  await close('compass');

  await open('Sachunterricht', 'watercycle');
  await clickButton(client, 'Puzzle');
  await waitFor(client, 'the water cycle puzzle has steps that pupils can reorder',
    `${widget('watercycle')}.querySelectorAll('button[aria-label$="nach unten"]').length > 1`);
  await close('watercycle');

  await open('Musik', 'sounds');
  await fill(client, 'Musik & Klänge: Bereich auswählen', 'rhythm');
  const rhythm = `${widget('sounds')}.querySelector('[aria-label="Rhythmus-Klopfer"]')`;
  await waitFor(client, 'Rhythmus is available within the music tool',
    `${rhythm}?.querySelectorAll('[data-rhythm-step]').length === 4`);
  await evaluate(client, `${rhythm}.querySelector('[data-rhythm-step="0"]').click()`);
  await waitFor(client, 'a tap edits the rhythm pattern',
    `${rhythm}.querySelector('[data-rhythm-step="0"]').textContent.includes('Patschen')`);
  await close('sounds');

  await open('Spiele', 'dice');
  const dice = `${widget('dice')}.querySelector('[data-classroom-dice]')`;
  const dieButtons = `${dice}.querySelectorAll('button[aria-label^="Würfel "][aria-label$=" werfen"]:not([aria-label="Würfel werfen"])')`;
  await waitFor(client, 'dice opens with one die and a prominent roll button',
    `${dieButtons}.length === 1 && !${dice}.querySelector('[aria-label="Würfelergebnis aufdecken"]')`);
  await clickLabel(client, 'Würfel werfen');
  await waitFor(client, 'pressing Würfeln triggers the roll', `${dice}.dataset.diceRolling === 'true'`);
  await waitFor(client, 'the roll resolves to a valid face', `${dice}.dataset.diceRolling === 'false' && /^[1-6]$/.test(JSON.parse(${dice}.dataset.diceValues)[0])`);
  await screenshot(client, 'spiele-wuerfel');
  await clickLabel(client, '6 Würfel auswählen');
  await clickButton(client, 'Rechenrunde');
  await clickLabel(client, 'Rechenart Differenz');
  await clickLabel(client, 'Würfelergebnis aufdecken');
  await waitFor(client, 'six dice, both labels and the calculation fit without scrolling', `(() => {
    const root = ${dice};
    const result = root.querySelector('[aria-label="Ergebnis wieder verdecken"]');
    const faces = root.querySelector('.overflow-y-auto');
    return ${dieButtons}.length === 6 && result &&
      Number(Array.from(result.querySelectorAll('span')).at(-1).textContent) === JSON.parse(root.dataset.diceValues).reduce((a, b, i) => i === 0 ? b : a - b, 0) &&
      faces.scrollWidth <= faces.clientWidth + 1 && faces.scrollHeight <= faces.clientHeight + 1 &&
      Array.from(root.querySelectorAll('button')).every(button => {
        const {x, y, width, height} = button.getBoundingClientRect();
        return height >= 43.5 && width >= 43.5 && button.contains(document.elementFromPoint(x + width / 2, y + height / 2));
      });
  })()`);
  await screenshot(client, 'spiele-wuerfel-rechenrunde');
}

async function checkReadingWorkshop(client) {
  const widget = `document.querySelector('#widget-board-stage [data-widget-type="wortsatzwerkstatt"]')`;
  const practice = `${widget}?.querySelector('[data-reading-mode]')`;
  const placed = `JSON.stringify(Array.from(${practice}.querySelectorAll('[aria-label="Gelegte Karten"] button'), button => button.textContent))`;
  const heading = `${practice}.querySelector('h3')`;
  const feedback = `${practice}.querySelector('[role="status"]')`;
  const correct = sequence => `${placed} === ${q(JSON.stringify(sequence))} && ${feedback}.textContent === 'Das passt.'`;
  const actOnTile = async (label) => {
    const position = await evaluate(client, `(() => {
      const button = ${practice}.querySelector('button[aria-label="'+${q(label)}+'"]:enabled');
      const rect = button.getBoundingClientRect();
      const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
      return { x, y, reachable: rect.height >= 44 && rect.width >= 44 && button.contains(document.elementFromPoint(x, y)) };
    })()`);
    if (!position.reachable) throw Error('Card is not reachable: ' + label);
    const { x, y } = position;
    await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  };

  await clickLabel(client, 'Neue Tafelseite hinzufügen');
  await searchWidget(client, 'Leseanfang');
  const entry = `document.querySelector('[data-testid="cockpit-core-group-wortsatzwerkstatt"] [data-widget-card-action="primary"]')`;
  await waitFor(client, 'the regular library offers the same workshop entry', `Boolean(${entry})`);
  await evaluate(client, `${entry}.click()`);
  await waitFor(client, 'a new workshop starts with a two-syllable picture clue', `
    ${practice}?.dataset.readingMode === 'syllables' && ${practice}.querySelector('[role="img"]').getAttribute('aria-label') === 'Lama' && ${heading}.textContent.includes('Silben')`);
  await waitFor(client, 'enabled reading controls fit and stay clear of the dock', `(() => {
    const buttons = [...${practice}.querySelectorAll('button:enabled')];
    return buttons.every(button => {
      const rect = button.getBoundingClientRect();
      return rect.height >= 44 && button.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2));
    });
  })()`);
  await screenshot(client, 'leseanfang-silben');
  await actOnTile('ma legen');
  await actOnTile('La legen');
  await clickButton(client, 'Prüfen');
  await waitFor(client, 'checking the wrong order offers a retry', `${feedback}.textContent.includes('noch einmal')`);
  await actOnTile('ma zurücklegen');
  await actOnTile('ma legen');
  await clickButton(client, 'Prüfen');
  await waitFor(client, 'touching the cards in order builds Lama', correct(['La', 'ma']));
  await clickLabel(client, 'Nächste Aufgabe');
  await waitFor(client, 'next syllable task opens with an empty workspace', `${placed} === '[]' && ${practice}.querySelector('[role="img"]').getAttribute('aria-label') === 'Nase'`);

  await clickButton(client, 'Wörter bauen');
  for (const part of ['O', 'm', 'a']) await actOnTile(`${part} legen`);
  await clickButton(client, 'Prüfen');
  await waitFor(client, 'letter cards preserve usual spelling for beginning readers', correct(['O', 'm', 'a']));
  await clickButton(client, 'Sätze bauen');
  for (const part of ['Mia', 'malt', 'gern.']) await actOnTile(`${part} legen`);
  await clickButton(client, 'Prüfen');
  await waitFor(client, 'children can arrange and check a short sentence', correct(['Mia', 'malt', 'gern.']));
  await reloadSavedCockpit(client);
  await waitFor(client, 'the current exercise and correct order survive a reload', correct(['Mia', 'malt', 'gern.']));
  await clickButton(client, 'Alle Übungen');
  await waitFor(client, 'the existing exercises remain accessible', `!${practice} && Boolean(${widget}.querySelector('#tab-mode-compound'))`);
  await evaluate(client, `${widget}.querySelector('.cockpit-widget-settings-trigger').click()`);
  const editor = `document.querySelector('dialog[open][aria-label="Wörter und Sätze bearbeiten"]')`;
  const customWord = `${widget}.querySelector('#target-word-display')?.textContent.trim() === 'MAUS'`;
  await waitFor(client, 'the existing teacher editor is still available', `Boolean(${editor})`);
  await fill(client, 'Zielwort', 'Maus');
  await fill(client, 'Wortbausteine', 'M-AU-S');
  await clickButton(client, 'Hinzufügen');
  await waitFor(client, 'the existing editor accepts a teacher-created word', `!${editor}.querySelector('[role="alert"]') && ${editor}.querySelector('input[aria-label="Zielwort"]').value === ''`);
  await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await waitFor(client, 'teacher editor closes', `!${editor}`);
  await clickLabel(client, 'Vorherige Aufgabe');
  await waitFor(client, 'the new word is available alongside the existing exercises', customWord);
  await clickButton(client, 'Leseanfang');
  await waitFor(client, 'returning from all exercises restores the reading exercise', correct(['Mia', 'malt', 'gern.']));
  await clickButton(client, 'Alle Übungen');
  await waitFor(client, 'going back keeps the teacher-created word in place', customWord);
}

async function checkClassroomMaterials(client) {
  await clickButton(client, 'Widget hinzufügen');
  await clickButton(client, 'Klassenalltag');
  await waitFor(client, 'the daily teaching tools include the material check and the weekly plan', `(() => {
    const items = Array.from(document.querySelectorAll('[data-testid^="cockpit-core-group-"]'));
    return items.length === 6 && items[0].dataset.testid === 'cockpit-core-group-tischcheck'
      && items.some(item => item.dataset.testid === 'cockpit-core-group-classweeklyplan');
  })()`);
  await screenshot(client, 'widget-klassenalltag');
  await clickLabel(client, 'Tisch-Check öffnen');
  const table = `document.querySelector('[data-practice-root="tischcheck"]')`;
  await waitFor(client, 'the open assignment is offered as the source of materials',
    `${table}?.textContent.includes('Material aus Arbeitsauftrag anzeigen')`);
  await clickButton(client, 'Material aus Arbeitsauftrag anzeigen');
  const cards = `Array.from(${table}.querySelectorAll('button[aria-label^="Material "]'))`;
  const firstPage = `${cards}.map(card => card.getAttribute('aria-label').slice(9)).join(',')`;
  await waitFor(client, 'the board displays the chosen materials and a fresh check count',
    `${table}.textContent.includes('0/6 bereit') && ${firstPage}.startsWith('Buch,Heft,Bleistift,Lineal')`);
  if (await evaluate(client, `${cards}.length === 4`)) {
    await clickLabel(client, 'Nächste Materialseite');
    await waitFor(client, 'a smaller board keeps the remaining materials one tap away', `${firstPage} === 'Radiergummi,Schere'`);
    await clickLabel(client, 'Vorherige Materialseite');
  } else {
    await waitFor(client, 'the roomy board includes the six materials at once', `${firstPage} === 'Buch,Heft,Bleistift,Lineal,Radiergummi,Schere'`);
  }
  await waitFor(client, 'the material tiles are unobstructed touch targets', `${cards}.every(card => {
    const { x, y, width, height } = card.getBoundingClientRect();
    return width >= 44 && height >= 44 && card.contains(document.elementFromPoint(x + width / 2, y + height / 2));
  })`);
  await clickLabel(client, 'Material Buch');
  await waitFor(client, 'checking off material updates the classroom counter',
    `${table}.textContent.includes('1/6 bereit') && ${cards}[0].getAttribute('aria-pressed') === 'true'`);
  await screenshot(client, 'tisch-check-arbeitsauftrag');
  await clickButton(client, 'Material wählen');
  await clickButton(client, 'Material aus Arbeitsauftrag anzeigen');
  await waitFor(client, 'starting a fresh material check clears old ticks',
    `${table}.textContent.includes('0/6 bereit') && ${cards}.every(card => card.getAttribute('aria-pressed') === 'false')`);
}

async function checkAssignmentCountdown(client) {
  const dock = `document.querySelector('[data-cockpit-countdown-status]')`;
  const timer = `document.querySelector('[data-timer-widget-status]')`;
  const endOfCountdown = `(() => {
    const key = Object.keys(sessionStorage).find(entry => entry.startsWith('klassio-cockpit-countdown:'));
    return key ? JSON.parse(sessionStorage.getItem(key)).endsAt : null;
  })()`;
  await evaluate(client, `document.querySelector('[data-dock-favorite-id="instruction"]').click()`);
  await waitFor(client, 'the assignment editor is open',
    `Boolean(document.querySelector('[aria-label="Arbeitsauftrag Haupttext"]'))`);
  await fill(client, 'Arbeitsauftrag Haupttext', 'Mathe, Seite 20');
  await evaluate(client, `(() => {
    const editor = document.querySelector('[aria-label="Arbeitsauftrag bearbeiten"][role="dialog"]');
    for (const name of ['Buch', 'Heft', 'Bleistift', 'Lineal', 'Radiergummi', 'Schere']) {
      const button = Array.from(editor.querySelectorAll('button')).find(button => button.lastElementChild?.textContent === name);
      if (!button) throw Error('Material option missing: ' + name);
      button.click();
    }
  })()`);
  await waitFor(client, 'the blank estimate still offers the explicit five-minute default',
    `Array.from(document.querySelectorAll('button')).some(button => button.textContent.trim() === 'Anzeigen und 5 Min. starten' && !button.disabled)`);
  await fill(client, 'Geplante Zeit', '10–15 Minuten');
  await waitFor(client, 'a range can be shown on the board but does not silently start a countdown',
    `Array.from(document.querySelectorAll('button')).some(button => button.textContent.trim() === 'Anzeigen und Timer starten' && button.disabled)`);
  await clickButton(client, '10 Min.');
  await clickButton(client, 'Anzeigen und 10 Min. starten');
  await waitFor(client, 'one click shows the assignment with ten minutes and starts that countdown',
    `document.querySelector('[data-widget-type="instruction"]')?.textContent.includes('Mathe, Seite 20') &&
      document.querySelector('[data-widget-type="instruction"]').textContent.includes('10 Minuten') &&
      ${dock}?.dataset.cockpitCountdownStatus === 'running' &&
      /^(10:00|9:5[0-9])$/.test(${dock}.querySelector('[role="timer"]').textContent.trim())`);
  await checkClassroomMaterials(client);
  await clickLabel(client, 'Unterrichtstimer anzeigen');
  await waitFor(client, 'the timer widget displays the existing countdown',
    `${timer}?.dataset.timerWidgetStatus === 'running'`);
  const initialDeadline = await evaluate(client, endOfCountdown);
  await searchWidget(client, 'Stoppuhr');
  await waitFor(client, 'the result names the stopwatch and its shared widget',
    `document.querySelector('[data-testid="cockpit-core-group-timer"] h3')?.textContent === 'Stoppuhr · Timer'`);
  await clickLabel(client, 'Stoppuhr öffnen');
  const stopwatch = `document.querySelector('[data-time-tool-panel="stopwatch"]')`;
  await waitFor(client, 'search opens the stopwatch while the existing countdown keeps running',
    `${stopwatch}?.hidden === false && ${dock}.dataset.cockpitCountdownStatus === 'running' && ${endOfCountdown} === ${initialDeadline}`);
  await evaluate(client, `${stopwatch}.querySelector('[data-stopwatch-action="start"]').click()`);
  await searchWidget(client, 'Countdown');
  await clickLabel(client, 'Timer öffnen');
  await waitFor(client, 'opening the countdown keeps the running stopwatch mounted',
    `${stopwatch}.hidden && Boolean(${stopwatch}.querySelector('[data-stopwatch-action="stop"]'))
      && ${timer}.dataset.timerWidgetStatus === 'running' && ${endOfCountdown} === ${initialDeadline}`);
  await clickLabel(client, 'Unterrichtstimer pausieren');
  await waitFor(client, 'pausing in the dock also pauses the widget',
    `${timer}?.dataset.timerWidgetStatus === 'paused' && ${dock}?.dataset.cockpitCountdownStatus === 'paused'`);
  const paused = await evaluate(client, `${dock}.querySelector('[role="timer"]').textContent`);
  await sleep(1100);
  if (await evaluate(client, `${dock}.querySelector('[role="timer"]').textContent`) !== paused) throw Error('Paused classroom countdown moved');
  await clickLabel(client, 'Unterrichtstimer fortsetzen');
  await evaluate(client, `document.querySelector('[data-dock-favorite-id="timer"]').click()`);
  await waitFor(client, 'minimizing the timer leaves the dock countdown running',
    `document.querySelector('[data-dock-favorite-id="timer"]').dataset.minimized === 'true' && ${dock}?.dataset.cockpitCountdownStatus === 'running'`);
  await clickLabel(client, 'Neue Tafelseite hinzufügen');
  await waitFor(client, 'the new board page retains the running countdown without the timer widget',
    `!${timer} && ${dock}?.dataset.cockpitCountdownStatus === 'running' &&
      document.querySelector('[role="tablist"][aria-label="Tafelseiten"] [aria-selected="true"]').textContent.trim() === '2'`);
  await waitFor(client, 'the short dock labels and timer remain fully visible during the countdown', `(() => {
    const favorites = document.querySelector('.klassio-dock-favorites');
    const pin = favorites.querySelector('[data-dock-favorite-id="timer"]');
    const forestPin = favorites.querySelector('[data-dock-favorite-id="waldruhe"]');
    const visibleLabel = button => button.querySelector('span:not([aria-hidden])')?.textContent;
    const pinRect = pin.getBoundingClientRect();
    const favoritesRect = favorites.getBoundingClientRect();
    return visibleLabel(pin) === 'Timer' && visibleLabel(forestPin) === 'Waldruhe' &&
      pinRect.left >= favoritesRect.left - 1 && pinRect.right <= favoritesRect.right + 1;
  })()`);
  await screenshot(client, 'arbeitsauftrag-timer-tafelseite');
  const deadline = await evaluate(client, endOfCountdown);
  await clickLabel(client, 'Lehrercockpit schließen · Zurück zu Heute');
  await waitFor(client, 'the cockpit closes with a countdown active', `!document.getElementById('widget-board-stage')`);
  await clickButton(client, 'Lehrercockpit');
  await waitFor(client, 'reopening the cockpit restores the same countdown',
    `${dock}?.dataset.cockpitCountdownStatus === 'running' && ${endOfCountdown} === ${deadline}`);

  await evaluate(client, `(() => {
    const now = Date.now;
    const oscillator = AudioContext.prototype.createOscillator;
    window.__countdownOscillators = 0;
    AudioContext.prototype.createOscillator = function (...args) {
      window.__countdownOscillators++;
      return oscillator.apply(this, args);
    };
    Date.now = () => now() + 601000;
    document.dispatchEvent(new Event('visibilitychange'));
    document.dispatchEvent(new Event('visibilitychange'));
    Date.now = now;
    AudioContext.prototype.createOscillator = oscillator;
  })()`);
  await waitFor(client, 'the countdown signals exactly once on the second board page',
    `${dock}?.dataset.cockpitCountdownStatus === 'expired' && ${dock}.textContent.includes('Zeit vorbei') &&
      window.__countdownOscillators === 6`);
  await clickLabel(client, 'Unterrichtstimer anzeigen');
  await waitFor(client, 'opening the timer after the alarm shows the finished session',
    `${timer}?.dataset.timerWidgetStatus === 'expired'`);
  await clickLabel(client, 'Signalton stummschalten');
  await clickButton(client, 'Nochmals');
  await waitFor(client, 'the timer can be restarted silently', `${dock}?.dataset.cockpitCountdownStatus === 'running'`);
  await evaluate(client, `document.querySelector('[data-dock-favorite-id="timer"]').click()`);
  await evaluate(client, `(() => {
    const now = Date.now;
    const openAudio = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = () => { window.__countdownOscillators++; };
    Date.now = () => now() + 601000;
    document.dispatchEvent(new Event('visibilitychange'));
    Date.now = now;
    AudioContext.prototype.createOscillator = openAudio;
  })()`);
  await waitFor(client, 'the silent timer still shows a persistent finish signal when minimized',
    `${dock}?.querySelector('[role="status"]')?.textContent === 'Zeit vorbei'
      && ${dock}.querySelector('.lucide-flag') && window.__countdownOscillators === 6
      && document.querySelector('[data-dock-favorite-id="timer"]').dataset.minimized === 'true'`);
  await screenshot(client, 'timer-stumm-zeit-vorbei');
  await clickLabel(client, 'Timer-Endsignal schließen');
  await waitFor(client, 'the teacher can clear the finished signal with one tap', `!${dock}`);
  await evaluate(client, `document.querySelector('[data-dock-favorite-id="timer"]').click()`);
  await waitFor(client, 'the classroom timer can be restored after clearing the signal',
    `${timer}?.dataset.timerWidgetStatus === 'ready' &&
      document.querySelector('[data-widget-type="timer"]').dataset.widgetMinimized === 'false'`);
}

async function dragWidgetTo(client, type, left, top) {
  const widgetSelector = `#widget-board-stage [data-widget-type="${type}"]`;
  const frameExpression = `document.querySelector(${q(widgetSelector)})`;
  const measureDrag = `(() => {
    const stage = document.getElementById('widget-board-stage');
    const widget = ${frameExpression};
    if (!stage || !widget) return null;
    for (let node = widget; node; node = node.parentElement) {
      if (node.getAnimations().some(animation => animation.playState !== 'finished' &&
        Number.isFinite(animation.effect?.getComputedTiming().endTime))) return null;
    }
    const board = stage.getBoundingClientRect();
    const frame = widget.getBoundingClientRect();
    const y = frame.top + 22;
    const x = [0.56, 0.48, 0.64, 0.32, 0.14].map(fraction => frame.left + frame.width * fraction).find(candidate => {
      const target = document.elementFromPoint(candidate, y);
      return widget.firstElementChild.contains(target) && !target.closest('button');
    });
    if (x === undefined) return null;
    return { x, y, toX: board.left + stage.clientLeft + stage.clientWidth * ${left} / 100 + x - frame.left,
      toY: board.top + stage.clientTop + stage.clientHeight * ${top} / 100 + 22 };
  })()`;
  await waitFor(client, type + ' header is ready for dragging', measureDrag, 5000);
  const points = await evaluate(client, measureDrag);
  if (!points) throw Error('Widget header is not reachable: ' + type);
  const { x, y, toX, toY } = points;
  await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await waitFor(client, type + ' starts dragging', `${frameExpression}?.dataset.widgetInteracting === 'dragging'`, 3000);
  for (const progress of [0.3, 0.6, 1]) {
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved', x: x + (toX - x) * progress, y: y + (toY - y) * progress, button: 'left', buttons: 1,
    });
  }
  const isAtCorner = `(() => {
    const frame = ${frameExpression};
    return Math.abs(parseFloat(frame.style.left) - ${left}) < 0.4 && Math.abs(parseFloat(frame.style.top) - ${top}) < 0.4;
  })()`;
  try {
    await waitFor(client, type + ' previews the position while dragging', isAtCorner, 3000);
  } catch (error) {
    console.log('Widget drag state', await evaluate(client, `({pointer: ${q(points)}, frame: ${frameExpression}.getAttribute('style'), interaction: ${frameExpression}.dataset.widgetInteracting})`));
    throw error;
  } finally {
    await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: toX, y: toY, button: 'left', clickCount: 1 });
  }
  await waitFor(client, type + ' keeps the position after release',
    `${isAtCorner} && !${frameExpression}?.hasAttribute('data-widget-interacting')`, 3000);
}

async function checkWidgetGeometry(client) {
  await clickLabel(client, 'Schülerliste ausblenden', true);
  await waitFor(client, 'the board has expanded before measuring geometry',
    `!document.querySelector('.klassio-student-sidebar') && document.getElementById('widget-board-stage').clientWidth > innerWidth - 40`);
  const widget = type => `document.querySelector('#widget-board-stage [data-widget-type="${type}"]')`;
  const geometry = (...types) => `JSON.stringify([${types.map(widget).join(',')}].map(node =>
    node && [node.style.left, node.style.top, node.style.width, node.style.height]))`;
  const undo = 'Widget-Anordnung rückgängig machen';
  const undoSelector = `document.querySelector('button[aria-label="${undo}"]')`;
  const initialTimer = await evaluate(client, geometry('timer'));
  await dragWidgetTo(client, 'timer', 5, 6);
  await clickLabel(client, undo);
  await waitFor(client, 'one undo reverts the entire pointer gesture', `${geometry('timer')} === ${q(initialTimer)} && !${undoSelector}`);
  await dragWidgetTo(client, 'timer', 5, 6);

  await evaluate(client, `document.querySelector('[data-dock-favorite-id="waldruhe"]').click()`);
  await waitFor(client, 'Waldruhe opens beside the timer', `Boolean(${widget('waldruhe')})`);
  await dragWidgetTo(client, 'waldruhe', 8, 14);
  const both = geometry('timer', 'waldruhe');
  const overlap = await evaluate(client, both);
  const isOverlap = `${both} === ${q(overlap)}`;
  const arrange = async () => {
    await clickLabel(client, 'Cockpit-Einstellungen');
    await clickButton(client, 'Automatisch anordnen');
    await waitFor(client, 'automatic arrangement changes the overlapping windows', `!(${isOverlap})`);
  };
  await arrange();
  await clickLabel(client, undo);
  await waitFor(client, 'one undo recovers both intentionally overlapping windows', isOverlap);

  const openSlots = async () => {
    await clickLabel(client, 'Cockpit-Einstellungen');
    await clickButton(client, 'Layouts & Schnell-Slots');
  };
  const slotButton = async action => {
    const clicked = await evaluate(client, `(() => {
      const dialog = document.querySelector('[aria-label="Layouts und Schnell-Slots"]');
      const label = Array.from(dialog.querySelectorAll('span')).find(node => node.textContent === 'A');
      const button = Array.from(label.parentElement.parentElement.querySelectorAll('button'))
        .find(node => node.textContent.trim() === ${q(action)});
      if (!button || button.disabled) return false;
      button.click();
      return true;
    })()`);
    if (!clicked) throw Error('Slot A action unavailable: ' + action);
  };
  await openSlots();
  await slotButton('Speichern');
  await clickLabel(client, 'Layouts und Schnell-Slots schließen');
  await arrange();
  await openSlots();
  await slotButton('Laden');
  await waitFor(client, 'a layout slot restores the exact overlap', `${isOverlap} && !${undoSelector}`);

  const selectPage = page => evaluate(client, `Array.from(document.querySelectorAll('[aria-label="Tafelseiten"] [role="tab"]'))
    .find(node => node.textContent.trim() === ${q(page)}).click()`);
  await selectPage('1');
  await waitFor(client, 'the first page has its own geometry', `!(${isOverlap}) &&
    document.querySelector('[aria-label="Tafelseiten"] [aria-selected="true"]').textContent.trim() === '1'`);
  await selectPage('2');
  await waitFor(client, 'both widgets keep their positions after a page round trip', isOverlap);

  await reloadSavedCockpit(client);
  await waitFor(client, 'saved upper-left positions and overlap survive an actual reload', isOverlap);
}

async function reloadSavedApp(client) {
  const beforeReload = client.navigationCount;
  for (let attempt = 0; attempt < 20 && client.navigationCount === beforeReload; attempt++) {
    await client.send('Page.reload');
    await sleep(500);
  }
  if (client.navigationCount === beforeReload) throw Error('Encrypted save did not permit a safe real reload');
  await waitFor(client, 'the browser reloads from saved data',
    `Boolean(document.querySelector('input[placeholder="Passwort eingeben"]')) || Boolean(document.querySelector('.topbar'))`);
  if (await evaluate(client, `Boolean(document.querySelector('input[placeholder="Passwort eingeben"]'))`)) {
    await fill(client, 'Passwort eingeben', VAULT_PASSWORD);
    await clickButton(client, 'Tresor entsperren');
  }
  await waitFor(client, 'the app is ready after reload', `Boolean(document.querySelector('.topbar'))`);
}

async function reloadSavedCockpit(client) {
  await reloadSavedApp(client);
  await clickButton(client, 'Lehrercockpit');
  await waitFor(client, 'the cockpit is ready after reload', `Boolean(document.querySelector('#widget-board-stage'))`);
}

async function checkAttendanceScope(client) {
  const group = `document.querySelector('#widget-board-stage [data-widget-type="groups"]')`;
  const random = `document.querySelector('#widget-board-stage [data-widget-type="randomname"]')`;
  const scope = widget => `${widget}?.querySelector('select[aria-label="Teilnehmende Kinder"]')`;
  const setScope = (widget, value) => evaluate(client, `(() => {
    const control = ${scope(widget)};
    control.value = ${q(value)};
    control.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  const groupCount = `${group}?.querySelector('[data-group-participant-count]').textContent.trim()`;
  const randomCount = `${random}?.querySelector('[data-random-participant-count]').textContent.trim()`;
  const checkInCount = widget => `${widget}?.querySelector('[data-cockpit-check-in-count]').textContent.trim()`;
  const groupCard = `document.querySelector('[data-testid="cockpit-core-group-groups"]')`;
  const openFromGroupCard = async action => {
    await clickButton(client, 'Widget hinzufügen');
    await waitFor(client, 'group card is open in the widget library', `Boolean(${groupCard})`);
    await evaluate(client, `${groupCard}.querySelector('[data-widget-card-action="' + ${q(action)} + '"]').click()`);
  };

  await clickLabel(client, 'Neue Tafelseite hinzufügen');
  await clickLabel(client, 'Ich bin da! öffnen');
  await waitFor(client, 'attendance is on the new board page',
    `Boolean(document.querySelector('#widget-board-stage [data-widget-type="kidattendance"]'))`);
  const openCorrection = () => clickLabel(client, 'Anwesenheit bearbeiten: Da, Fehlt oder Entschuldigt');
  const correction = `document.querySelector('[aria-label="Lehrer-Anwesenheitskorrektur"]')`;
  const closeCorrection = () => evaluate(client, `Array.from(${correction}.querySelectorAll('button'))
    .find(button => button.textContent.trim() === 'Schließen').click()`);
  const attendanceRows = `Array.from(${correction}.querySelectorAll('[aria-label^="Anwesenheit von "]'))`;
  const openCount = `document.querySelector('[data-widget-type="kidattendance"] button[aria-label$="Offene Check-ins anzeigen"]')`;
  const openOnlyDialog = `document.querySelector('[role="dialog"][aria-label="Offene Check-ins"]')`;
  const openOnlyRows = `Array.from(${openOnlyDialog}.querySelectorAll('[aria-label^="Offenen Check-in für "]'))`;
  await openCorrection();
  await waitFor(client, 'three example pupils are available for attendance', `${attendanceRows}.length >= 3`);
  const total = await evaluate(client, `${attendanceRows}.length`);
  await evaluate(client, `${attendanceRows}[1].querySelector('button[aria-label$=": Entschuldigt"]').click()`);
  await closeCorrection();
  await waitFor(client, 'the open check-ins count is an action with the precise number of pupils',
    `${openCount}?.getAttribute('aria-label').startsWith(${q(`${total - 1} offen`)})`);
  await evaluate(client, `${openCount}.click()`);
  await waitFor(client, 'the shortcut shows only pupils who still have an open check-in',
    `${openOnlyDialog} && ${openOnlyRows}.length === ${total - 1}`);
  await clickLabel(client, 'Offene Check-ins schließen');
  await clickLabel(client, 'Ich bin da! einklappen');

  await openFromGroupCard('primary');
  await waitFor(client, 'group widget shows the historical inclusion rule', `${scope(group)}?.value === 'present'`);
  const oldCount = await evaluate(client, `parseInt(${groupCount}, 10)`);
  const attendanceText = await evaluate(client, checkInCount(group));
  if (!(oldCount >= 2) || attendanceText !== '0 da · ' + oldCount + ' offen') {
    throw Error('Example attendance does not have the expected open and absent pupils: ' + attendanceText);
  }
  await setScope(group, 'checked-in');
  await waitFor(client, 'group creation is disabled with no checked-in children',
    `${groupCount} === '0 Kinder machen mit' && Array.from(${group}.querySelectorAll('button')).find(b => b.textContent.trim() === 'Gruppen bilden')?.disabled`);
  await openFromGroupCard('selection');
  await waitFor(client, 'random selection is open', `Boolean(${scope(random)})`);
  await setScope(random, 'checked-in');
  await waitFor(client, 'random drawing is disabled with no checked-in children',
    `${randomCount} === '0 zur Auswahl' && ${random}.querySelector('button[aria-label="Zufälliges Kind ziehen"]')?.disabled`);

  await evaluate(client, `document.querySelector('[data-dock-favorite-id="kidattendance"]').click()`);
  await evaluate(client, `${openCount}.click()`);
  await waitFor(client, 'the shortcut opens the same list after reopening the attendance widget', `Boolean(${openOnlyDialog})`);
  await evaluate(client, `${openOnlyRows}[0].querySelector('button').click()`);
  await waitFor(client, 'marking one pupil present removes only that pupil from the open list', `${openOnlyRows}.length === ${total - 2}`);
  await clickLabel(client, 'Offene Check-ins schließen');
  await clickLabel(client, 'Ich bin da! einklappen');
  const afterCheckIn = q('1 da · ' + (oldCount - 1) + ' offen');
  await waitFor(client, 'the same new check-in appears live in both participant pools',
    `${checkInCount(group)} === ${afterCheckIn} && ${checkInCount(random)} === ${afterCheckIn}
      && ${groupCount} === '1 Kind macht mit' && ${randomCount} === '1 zur Auswahl'`);
  await evaluate(client, `Array.from(${group}.querySelectorAll('button')).find(b => b.textContent.trim() === 'Gruppen bilden').click()`);
  await waitFor(client, 'group generation uses exactly the single checked-in child',
    `${group}.querySelectorAll('[data-group-student]').length === 1`);
  const checkedInId = await evaluate(client, `${group}.querySelector('[data-group-student]').dataset.groupStudent`);
  await evaluate(client, `${random}.querySelector('button[aria-label="Zufälliges Kind ziehen"]').click()`);
  await waitFor(client, 'random drawing uses the same checked-in child',
    `${random}.querySelector('[data-practice-root="randomname"]').dataset.randomCurrent === ${q(checkedInId)}`);
  await evaluate(client, `${random}.querySelector('[data-random-selection-mode="fair"]').click()`);
  await waitFor(client, 'fair selection keeps the same participant choice',
    `${scope(random)}?.value === 'checked-in' && ${random}.querySelector('[data-fair-student-count]')?.dataset.fairStudentCount === '1'`);
  await setScope(random, 'present');
  await setScope(group, 'present');
  await waitFor(client, 'the inclusive choice adds the open pupils but keeps absences out',
    `parseInt(${groupCount}, 10) === ${oldCount} &&
      Number(${random}.querySelector('[data-fair-student-count]').dataset.fairStudentCount) === ${oldCount} &&
      ${group}.querySelector('[data-group-student]').dataset.groupStudent === ${q(checkedInId)}`);

  await setScope(group, 'checked-in');
  await evaluate(client, `document.querySelector('[data-dock-favorite-id="kidattendance"]').click()`);
  await evaluate(client, `${openCount}.click()`);
  await waitFor(client, 'the next late arrival can check in', `Boolean(${openOnlyDialog})`);
  await evaluate(client, `${openOnlyRows}[0].querySelector('button').click()`);
  await clickLabel(client, 'Offene Check-ins schließen');
  await clickLabel(client, 'Ich bin da! einklappen');
  await waitFor(client, 'a late check-in offers assignment without changing the existing group',
    `${group}.querySelector('button[aria-label="Kinder nachträglich zuteilen"]')?.textContent.includes('1 zuteilen')
      && ${group}.querySelectorAll('[data-group-student]').length === 1`);
  await clickLabel(client, 'Kinder nachträglich zuteilen');
  const lateDialog = `document.querySelector('dialog[open][aria-label="Kinder nachträglich zuteilen"]')`;
  await waitFor(client, 'one checked-in child and a suggested group appear',
    `${lateDialog}?.querySelectorAll('select')[0]?.options.length === 1
      && ${lateDialog}.querySelectorAll('select')[1]?.selectedOptions[0]?.textContent.includes('(Vorschlag)')`);
  const lateId = await evaluate(client, `${lateDialog}.querySelector('select').value`);
  const previousTeam = await evaluate(client, `${group}.querySelector('[data-group-id]').dataset.groupId`);
  await screenshot(client, 'gruppen-nachtraeglich-zuteilen');
  await evaluate(client, `${lateDialog}.querySelector('button[type="submit"]').click()`);
  await waitFor(client, 'the new pupil joins the original group and all previous pupils stay',
    `!${lateDialog} && Array.from(${group}.querySelectorAll('[data-group-student]')).map(button => button.dataset.groupStudent).join(',') === ${q(checkedInId + ',' + lateId)}
      && ${group}.querySelector('[data-group-id]').dataset.groupId === ${q(previousTeam)}`);
  await clickLabel(client, 'Einteilung rückgängig machen');
  await waitFor(client, 'undo restores the old group and offers the late child again',
    `${group}.querySelectorAll('[data-group-student]').length === 1
      && ${group}.querySelector('[data-group-student]').dataset.groupStudent === ${q(checkedInId)}
      && Boolean(${group}.querySelector('button[aria-label="Kinder nachträglich zuteilen"]'))`);
}

async function checkRandomModeSearch(client) {
  const studio = `document.querySelector('[data-random-selection-studio]')`;
  const picker = `document.querySelector('[aria-label="Widget-Bibliothek"]')`;
  const wheel = `${studio}.querySelector('[data-random-selection-panel="wheel"]')`;
  const winner = `${wheel}.querySelector('[title="Klicken für nochmal drehen"]')`;
  const activeMode = mode => `${studio}?.querySelector('[data-random-selection-mode="' + ${q(mode)} + '"][aria-pressed="true"]')`;
  await searchWidget(client, 'Glücksrad');
  await waitFor(client, 'the result names the wheel and its shared widget',
    `document.querySelector('[data-testid="cockpit-core-group-groups"] h3')?.textContent === 'Glücksrad · Gruppen & Zufall'`);
  await clickLabel(client, 'Glücksrad öffnen');
  await waitFor(client, 'search opens the wheel in the existing selection widget', `Boolean(${activeMode('wheel')})`);
  await evaluate(client, `${wheel}.querySelector('button[aria-label="Glücksrad drehen"]').click()`);
  await waitFor(client, 'the wheel is drawing', `${studio}.getAttribute('aria-busy') === 'true'`);
  await searchWidget(client, 'Faire Runde');
  await clickLabel(client, 'Faire Runde öffnen');
  await waitFor(client, 'search does not switch away from an ongoing draw',
    `Boolean(${picker}) && Boolean(${activeMode('wheel')})`);
  await waitFor(client, 'the protected draw finishes normally', `Boolean(${winner}) && ${studio}.getAttribute('aria-busy') === 'false'`);
  const result = await evaluate(client, `${winner}.textContent`);
  await clickLabel(client, 'Faire Runde öffnen');
  await waitFor(client, 'the same result opens the fair round after the draw',
    `!${picker} && Boolean(${activeMode('fair')}) && ${wheel}.hidden && ${winner}.textContent === ${q(result)}`);
}

async function checkDayTimeline(client) {
  const timeline = `document.querySelector('#widget-board-stage [data-widget-type="timeline"]')`;
  const nowCard = `${timeline}?.querySelector('section[aria-label="Jetzt"]')`;
  const nextCard = `${timeline}?.querySelector('section[aria-label="Danach"]')`;
  const title = card => `${card}?.querySelector('[data-timeline-title]')?.textContent`;
  const symbol = card => `${card}?.querySelector('[data-timeline-symbol]')`;
  const boardHint = 'Mathebuch auf Seite 24';
  const planningTopic = 'Internes Lernziel zum Zahlenraum';
  const setClock = (day, hour, minute, tickToNextMinute = false) => evaluate(client, `(() => {
    window.__timelineTime = new window.__timelineDate(2026, 8, ${day}, ${hour}, ${minute}, ${tickToNextMinute ? 58 : 0}).getTime();
    window.__timelineClockStartedAt = ${tickToNextMinute ? 'performance.now()' : 'null'};
    window.dispatchEvent(new Event('focus'));
  })()`);

  await clickLabel(client, 'Neue Tafelseite hinzufügen');
  await evaluate(client, `(() => {
    window.__timelineDate = window.Date;
    window.__timelineTime = new Date(2026, 8, 14, 9, 44).getTime();
    window.__timelineClockStartedAt = null;
    window.Date = new Proxy(window.Date, {
      construct: (target, args) => Reflect.construct(target, args.length ? args : [
        window.__timelineTime + (window.__timelineClockStartedAt === null ? 0 : performance.now() - window.__timelineClockStartedAt),
      ]),
    });
  })()`);

  try {
    // The lesson editing fixture uses the weekly grid. At tablet width the
    // planner shows a different layout, so use desktop only to enter the data.
    if (WIDTH < 1000) await client.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: HEIGHT, deviceScaleFactor: 1, mobile: false });
    await clickLabel(client, 'Lehrercockpit schließen · Zurück zu Heute');
    await clickButton(client, 'Planung');
    await waitFor(client, 'the planning workspace is ready', `Boolean(document.querySelector('[data-planning-next-actions] button'))`);
    await evaluate(client, `document.querySelector('[data-planning-next-actions] button').click()`);
    await waitFor(client, 'the weekly planning grid is ready',
      `Array.from(document.querySelectorAll('button')).some(button => button.textContent.trim() === 'Diese Woche')`);
    await clickButton(client, 'Diese Woche');
    const mondaySecondLesson = `Array.from(document.querySelectorAll('div[draggable]')).find(cell =>
      cell.classList.contains('group/cell') && cell.style.gridColumn === '2' && cell.style.gridRow.startsWith('3 /'))`;
    await waitFor(client, 'the second lesson on Monday can be edited', `Boolean(${mondaySecondLesson})`);
    await evaluate(client, `${mondaySecondLesson}.click()`);
    const editor = `document.querySelector('[data-weekly-lesson-editor]')`;
    await waitFor(client, 'the weekly lesson opens directly or via its overview', `Boolean(${editor}) || document.body.innerText.includes('Geplante Einheit')`);
    if (!await evaluate(client, `Boolean(${editor})`)) await clickButton(client, 'Bearbeiten');
    await waitFor(client, 'the second lesson opens the board hint field',
      `${editor}?.textContent.includes('Montag • 2. Stunde • KW 38') && ${editor}.textContent.includes('Tafelhinweis')`);
    await clickButton(client, 'Mathematik');
    await fill(client, 'Was wird gelernt?', planningTopic);
    await fill(client, 'Tafelhinweis', boardHint);
    await clickButton(client, 'Einheit speichern');
    await waitFor(client, 'the planned lesson was saved', `!${editor} && document.body.innerText.includes(${q(planningTopic)})`);
    await clickButton(client, 'Heute');
    if (WIDTH < 1000) await client.send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });
    await clickButton(client, 'Lehrercockpit');
    await waitFor(client, 'the cockpit is ready after editing the weekly plan', `Boolean(document.getElementById('widget-board-stage'))`);

    await evaluate(client, `document.querySelector('[data-dock-favorite-id="timeline"]').click()`);
    await waitFor(client, 'the cards show the current lesson and the next break time', `(() => {
      const now = ${nowCard}, next = ${nextCard};
      return now?.textContent.includes('08:50–09:45') && next?.textContent.includes('09:45–10:00')
        && ${title(nextCard)} === 'Pause'
        && ${symbol(nowCard)}?.classList.contains('lucide-calculator')
        && ${symbol(nextCard)}?.classList.contains('lucide-sandwich')
        && getComputedStyle(next).borderTopColor === 'rgb(245, 158, 11)'
        && now.textContent.includes(${q(boardHint)})
        && !${timeline}.textContent.includes(${q(planningTopic)})
        && !${timeline}.querySelector('[aria-current="time"]');
    })()`);
    const dimensions = await evaluate(client, `(() => {
      const now = ${nowCard}, next = ${nextCard};
      const panel = now.parentElement.parentElement;
      return {
        cards: [now, next].map(card => ({
          width: card.clientWidth, height: card.clientHeight, scrollWidth: card.scrollWidth,
          subjectSize: parseFloat(getComputedStyle(card.querySelector('[data-timeline-title]')).fontSize),
          symbolSize: card.querySelector('[data-timeline-symbol]').getBoundingClientRect().width,
        })),
        panel: { height: panel.clientHeight, scrollHeight: panel.scrollHeight },
      };
    })()`);
    const cardsFit = dimensions.cards.every(card => card.width >= 110 && card.height >= 70
      && card.subjectSize >= 20 && card.symbolSize >= 28 && card.scrollWidth <= card.width + 1);
    if (!cardsFit || dimensions.panel.scrollHeight > dimensions.panel.height + 1) {
      throw Error('Timeline cards do not fit at the default size: ' + JSON.stringify(dimensions));
    }
    await screenshot(client, 'tagesablauf-jetzt-und-danach');
    await evaluate(client, `${timeline}.querySelector('button[aria-label="Widget-Menü öffnen"]').click()`);
    await clickButton(client, 'Maximieren');
    await waitFor(client, 'the classroom display enlarges both subject symbols',
      `${symbol(nowCard)}?.getBoundingClientRect().width >= 44 && ${symbol(nextCard)}?.getBoundingClientRect().width >= 44`);
    await screenshot(client, 'tagesablauf-jetzt-und-danach-gross');
    await evaluate(client, `${timeline}.querySelector('button[aria-label="Widget-Menü öffnen"]').click()`);
    await clickButton(client, 'Vollbild beenden');
    await setClock(14, 8, 25);
    await waitFor(client, 'the board hint is shown only on the upcoming lesson before it starts',
      `${nextCard}?.textContent.includes(${q(boardHint)}) && !${nowCard}?.textContent.includes(${q(boardHint)})`);
    await setClock(14, 9, 44, true);
    await waitFor(client, 'at the boundary the break becomes current without another focus event',
      `${title(nowCard)} === 'Pause' && ${symbol(nowCard)}?.classList.contains('lucide-sandwich') &&
       ${nextCard}?.textContent.includes('10:00–10:50') && !${timeline}.textContent.includes(${q(boardHint)})`, 5000);
    await clickButton(client, 'Tagesverlauf');
    await waitFor(client, 'the optional day overview marks the current break',
      `${timeline}?.querySelector('[aria-current="time"]')?.getAttribute('aria-label') === 'Pause' && !${nowCard}`);
    await evaluate(client, `${timeline}.querySelector('[aria-current="time"]').click()`);
    await waitFor(client, 'the selected break still shows its details',
      `${timeline}.querySelector('[aria-pressed="true"][aria-current="time"]') && ${timeline}.textContent.includes('09:45–10:00')`);
    await evaluate(client, `${timeline}.querySelector('button[aria-label^="2. Stunde:"]').click()`);
    await waitFor(client, 'inspecting a lesson shows its public hint',
      `${timeline}.textContent.includes(${q(boardHint)}) && !${timeline}.textContent.includes(${q(planningTopic)})`);
    await clickButton(client, 'Jetzt und danach');
    await setClock(14, 7, 55);
    await waitFor(client, 'before school the cards show when the first lesson starts',
      `${title(nowCard)} === 'Unterricht beginnt' && ${nowCard}.textContent.includes('In 5 Min.') && ${nextCard}?.textContent.includes('08:00–08:50')`);
    await setClock(14, 12, 15);
    await waitFor(client, 'the last lesson shows the dismissal time under Danach',
      `${title(nextCard)} === 'Schulschluss' && ${nextCard}.textContent.includes('12:30 Uhr')`);
    await setClock(14, 18, 0);
    await waitFor(client, 'after school the cards show the end of the day',
      `${title(nowCard)} === 'Schulschluss' && ${symbol(nowCard)}?.classList.contains('lucide-flag') && !${nextCard}`);
    await setClock(19, 10, 0);
    await waitFor(client, 'an empty Saturday shows a clear empty state',
      `${timeline}.textContent.includes('Heute kein Unterricht eingetragen') && !${nowCard} && !${nextCard}`);
  } catch (error) {
    await screenshot(client, 'tagesablauf-FAIL').catch(() => {});
    throw error;
  } finally {
    await evaluate(client, `(() => {
      window.Date = window.__timelineDate;
      delete window.__timelineDate;
      delete window.__timelineTime;
      delete window.__timelineClockStartedAt;
      window.dispatchEvent(new Event('focus'));
    })()`);
  }
}

async function checkAssignmentReference(client) {
  const editor = `document.querySelector('[role="dialog"][aria-label="Arbeitsauftrag bearbeiten"]')`;
  const widget = `document.querySelector('#widget-board-stage [data-widget-type="instruction"]')`;
  const reference = key => `${widget}.querySelector('[data-instruction-reference="${key}"]')`;
  const bonus = 'Zeig deinem Partner, wie du gerechnet hast.';
  const hasAssignment = `!${editor} && ${reference('material')}?.textContent === 'TRAX-Arbeitsheft' &&
    ${reference('material')}.querySelector('[aria-label="Heftfarbe Grün"]') &&
    ${reference('page')}.textContent === '12' && ${reference('exercises')}.textContent === '1–3' &&
    ${widget}.textContent.includes('Schon fertig?') && ${widget}.textContent.includes(${q(bonus)})`;

  await clickLabel(client, 'Neue Tafelseite hinzufügen');
  await evaluate(client, `document.querySelector('[data-dock-favorite-id="instruction"]').click()`);
  await waitFor(client, 'a newly opened assignment is ready', `Boolean(${editor} || ${widget}?.querySelector('button[aria-label="Bearbeiten"]'))`);
  if (!await evaluate(client, `Boolean(${editor})`)) await clickLabel(client, 'Bearbeiten');
  await fill(client, 'Arbeitsauftrag Haupttext', '');
  await fill(client, 'Heft oder Buch', 'TRAX-Arbeitsheft');
  await clickButton(client, 'Grün');
  await fill(client, 'Seite', '12');
  await fill(client, 'Aufgabe', '1–3');
  await fill(client, 'Schon fertig?', bonus);
  await waitFor(client, 'structured assignments can start the timer without duplicate main text',
    `Array.from(${editor}.querySelectorAll('button')).some(button => button.textContent.trim() === 'Anzeigen und 5 Min. starten' && !button.disabled)`);
  await clickButton(client, 'Anzeigen und 5 Min. starten');
  await waitFor(client, 'the complete assignment appears and the shared timer starts',
    `${hasAssignment} && Boolean(document.querySelector('[data-cockpit-countdown-status="running"]'))`);
  await waitFor(client, 'the full assignment fits in the default window without scrolling', `(() => {
    const group = ${widget}.querySelector('dl');
    const pane = ${widget}.querySelector('[data-instruction-board-content]');
    const cards = Array.from(group.querySelectorAll('dd span:last-child'));
    return pane.scrollHeight <= pane.clientHeight + 1 && pane.scrollWidth <= pane.clientWidth + 1 &&
      cards.length === 3 && cards.every(card => parseFloat(getComputedStyle(card).fontSize) >= 18);
  })()`);
  await screenshot(client, 'arbeitsauftrag-heft-seite-aufgabe');

  await clickLabel(client, 'Bearbeiten');
  await fill(client, 'Seite', '99');
  await clickButton(client, 'Abbrechen');
  await waitFor(client, 'cancel keeps the original page reference', hasAssignment);
  await reloadSavedCockpit(client);
  await waitFor(client, 'the reference is saved with the board and reloads directly in pupil view', hasAssignment);
  await clickLabel(client, 'Neuer Auftrag');
  await clickLabel(client, 'Neuer Auftrag');
  await waitFor(client, 'clearing the assignment also clears the reference and bonus',
    `${editor} && Array.from(${editor}.querySelectorAll('fieldset input')).every(input => input.value === '') &&
      ${editor}.querySelector('[role="group"] button[aria-pressed="true"]') === null &&
      ${editor}.querySelector('input[placeholder^="z. B. Zeig deinem Partner"]').value === ''`);
}

async function checkWidgetArchive(client) {
  const archive = `document.querySelector('dialog[open][aria-labelledby="cockpit-archive-title"]')`;
  const savedPin = `[data-archived-widget="clock"]`;
  const archivedTodo = `[data-archived-widget="todo"]`;
  const todo = `document.querySelector('#widget-board-stage [data-widget-type="todo"]')`;
  const timer = `document.querySelector('#widget-board-stage [data-widget-type="timer"]')`;
  const marker = 'Archivtest: Lesebuch bereitlegen';
  const openArchive = async () => {
    await clickLabel(client, 'Cockpit-Einstellungen');
    await clickButton(client, 'Widget-Archiv');
    await waitFor(client, 'the archive opens as its own dialog', `Boolean(${archive})`);
  };

  await clickLabel(client, 'Neue Tafelseite hinzufügen');
  await evaluate(client, `document.querySelector('[data-dock-favorite-id="timer"]').click()`);
  await waitFor(client, 'timer opens on the teaching board', `${timer}?.dataset.widgetMinimized === 'false'`);
  await evaluate(client, `(() => {
    const dock = document.querySelector('.klassio-widget-dock');
    const key = Object.keys(dock).find(key => key.startsWith('__reactFiber$'));
    for (let fiber = dock[key]; fiber; fiber = fiber.return) {
      if (typeof fiber.memoizedProps?.onOpenWidget !== 'function') continue;
      fiber.memoizedProps.onChange(settings => ({ ...settings, itemIds: [...settings.itemIds, 'clock'] }));
      return;
    }
    throw Error('Could not seed a legacy dock pin');
  })()`);
  await openArchive();
  await waitFor(client, '91 retired tools are listed and the former pin is marked',
    `${archive}.querySelectorAll('[data-archived-widget]').length === 91 &&
      ${archive}.querySelector('${savedPin}').textContent.includes('Früher angeheftet') &&
      !document.querySelector('[data-dock-favorite-id="clock"]')`);
  await screenshot(client, 'widget-archiv');
  await fill(client, 'Archivierte Widgets suchen', 'Aufgaben-Checkliste');
  await waitFor(client, 'archive search finds the original checklist',
    `${archive}.querySelectorAll('[data-archived-widget]').length === 1 && Boolean(${archive}.querySelector('${archivedTodo}'))`);
  await evaluate(client, `${archive}.querySelector('${archivedTodo}').click()`);
  await waitFor(client, 'the retired widget opens only in the archive view',
    `Boolean(${todo}) && !${archive} && ${timer}.dataset.widgetMinimized === 'true' && !document.querySelector('.klassio-widget-dock')`);
  await fill(client, 'Neuer Aufgabenschritt', marker);
  await clickLabel(client, 'Schritt zur Liste hinzufügen');
  await waitFor(client, 'an archived tool can read and save its original data', `${todo}.textContent.includes(${q(marker)})`);
  await clickButton(client, 'Zurück zur Tafel');
  await waitFor(client, 'the board returns with neither the old pin nor the saved retired widget',
    `!${todo} && ${timer}.dataset.widgetMinimized === 'false' && !document.querySelector('[data-dock-favorite-id="clock"]')`);

  await clickLabel(client, 'Cockpit-Einstellungen');
  await clickButton(client, 'Layouts & Schnell-Slots');
  await clickButton(client, 'Leere Ausgangsfläche laden');
  await clickLabel(client, 'Meine Widget-Leiste anpassen');
  await clickButton(client, 'Standard wiederherstellen');
  await clickButton(client, 'Ja, Standard laden');
  await reloadSavedCockpit(client);
  await waitFor(client, 'old widgets and pins stay off the teaching board after reload',
    `!${todo} && !document.querySelector('[data-dock-favorite-id="clock"]')`);
  await openArchive();
  await waitFor(client, 'resetting the teaching board and dock keeps the retired data',
    `${archive}.querySelector('${archivedTodo}').textContent.includes('Auf dieser Tafel gespeichert') &&
      ${archive}.querySelector('${savedPin}').textContent.includes('Früher angeheftet')`);
  await evaluate(client, `${archive}.querySelector('${archivedTodo}').click()`);
  await waitFor(client, 'the saved checklist opens again', `Boolean(${todo})`);
  for (let page = 0; page < 10; page++) {
    if (await evaluate(client, `${todo}.textContent.includes(${q(marker)})`)) break;
    const nextPage = await evaluate(client, `(() => {
      const next = ${todo}.querySelector('button[aria-label="Nächste Aufgabenseite"]');
      if (!next || next.disabled) return false;
      next.click();
      return true;
    })()`);
    if (!nextPage) break;
    await sleep(100);
  }
  await waitFor(client, 'checklist content survives both resets and reloading', `${todo}.textContent.includes(${q(marker)})`);
  await clickButton(client, 'Zurück zur Tafel');
}

async function checkDashboardCustomization(client) {
  const dialog = `document.querySelector('dialog[open][aria-labelledby="dashboard-customize-title"]')`;
  const compact = `document.querySelector('[data-dashboard-overview]')`;
  const more = `document.querySelector('button[title="Weitere Optionen & Werkzeuge"]')`;
  const editButtons = `Array.from(document.querySelectorAll('button[aria-label="Heute bearbeiten"]')).filter(button => button.getClientRects().length)`;
  const edit = `(${editButtons})[0]`;
  const mobileMore = `document.querySelector('#klassio-mobile-quick-mode [data-kind="more"]')`;
  const usesTopbarMenu = WIDTH < 640 && !TOUCH_PHONE;
  const focusReturn = usesTopbarMenu ? more : edit;
  const choose = label => evaluate(client, `Array.from(${dialog}.querySelectorAll('label')).find(el => el.textContent.trim() === ${q(label)}).click()`);
  const openEditor = async () => {
    if (usesTopbarMenu) {
      await evaluate(client, `${more}.click()`);
      await clickButton(client, 'Heute bearbeiten');
    } else {
      await evaluate(client, `(() => {const button = ${edit}; button.focus(); button.click();})()`);
    }
    await waitFor(client, 'the visible entry opens Heute bearbeiten', `Boolean(${dialog})`);
  };

  await waitFor(client, 'the compact dashboard is ready', `Boolean(${compact})`);
  if (TOUCH_PHONE) {
    await waitFor(client, 'the dedicated touch interface exposes the dashboard edit action',
      `document.documentElement.dataset.klassioMobileQuick === 'true' && Boolean(${edit}) &&
        (${edit}).getBoundingClientRect().height >= 44`);
  }
  if (!usesTopbarMenu) {
    await waitFor(client, 'the dashboard has just one visible edit action', `(${editButtons}).length === 1`);
  }
  await openEditor();
  await waitFor(client, 'compact settings show the current controls within the viewport', `(() => {
    const dialog = ${dialog};
    const rect = dialog.getBoundingClientRect();
    return rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight &&
      dialog.textContent.includes('Tagesvorschau') && !dialog.querySelector('details') &&
      !/Zone 1|Starr Heute|Schriftgestaltung/.test(dialog.textContent);
  })()`);
  await screenshot(client, 'dashboard-heute-bearbeiten');
  await choose('Nächster Werktag');
  await waitFor(client, 'the live compact dashboard date changes to the preview',
    `/^(Morgen|Vorschau)/.test(${compact}.querySelector('header p span').textContent) && !${dialog}.querySelector('#dashboard-preview-hour')`);
  await choose('Automatisch');
  await fill(client, 'Wechsel ab', '15');
  await waitFor(client, 'the automatic preview hour is saved', `localStorage.getItem('dashboard_vorschau_stunde') === '15'`);
  await choose('Erweitert');
  await waitFor(client, 'the expanded view replaces the compact dashboard', `!${compact} && Boolean(${dialog}.querySelector('details'))`);
  await evaluate(client, `${dialog}.querySelector('summary').click()`);
  await fill(client, 'Schwerpunkt', 'morning');
  await waitFor(client, 'Morgenstart shows the working appointment card', `document.body.textContent.includes('Anstehende Termine & Events')`);
  await choose('Anstehende Termine');
  await waitFor(client, 'the appointments toggle hides its card immediately', `!document.body.textContent.includes('Anstehende Termine & Events')`);
  await clickButton(client, 'Karten anordnen');
  await waitFor(client, 'expanded cards are editable on the page after the modal closes', `!${dialog} &&
    document.activeElement?.textContent.trim() === 'Anordnung fertig' &&
    Boolean(document.querySelector('button[title="Widget ausblenden"]'))`);
  await clickButton(client, 'Anordnung fertig');
  await waitFor(client, 'finishing the arrangement returns to settings', `Boolean(${dialog})`);
  await clickButton(client, 'Fertig');
  await waitFor(client, 'the dashboard stays expanded with its setting applied', `!${dialog} && !${compact}`);

  await reloadSavedApp(client);
  await waitFor(client, 'the expanded dashboard restores after a browser reload',
    `Boolean(document.querySelector('button[title="Zur kompakten Ansicht wechseln"]')) ||
    Array.from(document.querySelectorAll('button')).some(button => button.textContent.trim() === 'Zur kompakten Startseite')`);
  await openEditor();
  await waitFor(client, 'the saved hour and hidden appointment card are restored',
    `${dialog}.querySelector('#dashboard-preview-hour')?.value === '15' &&
      !document.body.textContent.includes('Anstehende Termine & Events')`);
  await choose('Kompakt');
  await choose('Heutiger Tag');
  await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await waitFor(client, 'Escape returns focus to the dashboard opener',
    `!${dialog} && document.activeElement === (${focusReturn}) &&
    ${compact}?.querySelector('header p span').textContent === 'Heute'`);

  if (TOUCH_PHONE) {
    await evaluate(client, `(() => {
      (${mobileMore}).click();
      const actions = document.querySelectorAll('#klassio-mobile-quick-mode [data-sheet="more"] .kqm-action');
      Array.from(actions).find(button => button.querySelector('strong')?.textContent === 'Einstellungen').click();
    })()`);
  } else {
    await evaluate(client, `${more}.click()`);
    await clickButton(client, 'Haupteinstellungen');
  }
  await waitFor(client, 'settings open from the same topbar',
    `Array.from(document.querySelectorAll('button')).some(button => button.textContent.trim().startsWith('Darstellung'))`);
  await clickButton(client, 'Darstellung');
  await waitFor(client, 'the global font settings are in Darstellung',
    `Boolean(document.querySelector('#klassio-display-font'))`);
  const fontWeight = `Array.from(document.querySelectorAll('label')).find(label => label.textContent.trim() === 'Fett')`;
  await evaluate(client, `${fontWeight}.click()`);
  await waitFor(client, 'the retained font style still applies to the app',
    `document.documentElement.dataset.fontWeight === 'bold'`);
  await evaluate(client, `${fontWeight}.click()`);
  await clickButton(client, 'Heute bearbeiten');
  await waitFor(client, 'the settings shortcut opens the same editor after navigation',
    `Boolean(${dialog}) && Boolean(${compact})`);
}

async function main() {
  await waitForChrome();
  const target=await (await fetch(DEBUG_URL+'/json/new?'+encodeURIComponent(BASE_URL),{method:'PUT'})).json();
  const client=new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();
  try {
    await client.send('Page.enable');await client.send('Runtime.enable');
    await client.send('Emulation.setDeviceMetricsOverride',{width:WIDTH,height:HEIGHT,deviceScaleFactor:1,mobile:TOUCH_PHONE});
    if (TOUCH_PHONE) await client.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    await client.send('Page.navigate',{url:BASE_URL});
    await waitFor(client,'access gate','document.body?.innerText.toLowerCase().includes("geschützter zugang")');
    await waitFor(client,'access form ready',`Array.from(document.querySelectorAll('input')).some(i => String(i.placeholder || '').includes('Zugangscode eingeben'))`);
    await fill(client,'Zugangscode',ACCESS_CODE);
    await clickButton(client,'Klassio öffnen');
    await waitFor(client,'new vault','document.body?.innerText.toLowerCase().includes("tresor auf diesem gerät einrichten")');
    await fill(client,'Eigenes Tresor-Passwort',VAULT_PASSWORD);
    await fill(client,'Passwort bestätigen',VAULT_PASSWORD);
    await clickButton(client,'Weiter zum Wiederherstellungscode');
    await waitFor(client,'recovery screen','document.body?.innerText.toLowerCase().includes("dein einmaliger wiederherstellungscode")');
    await evaluate(client,'Array.from(document.querySelectorAll("label")).find(x=>x.textContent.includes("Ich habe den Wiederherstellungscode sicher notiert")).querySelector("input").click()');
    await clickButton(client,'Einrichtung abschließen');
    await waitFor(client,'first run','document.body?.innerText.toLowerCase().includes("willkommen bei klassio")');
    await clickButton(client,'Beispielklasse erkunden');
    await waitFor(client,'dashboard ready','Array.from(document.querySelectorAll("button")).some(x=>x.textContent.trim()==="Heute")');
    if (process.env.KLASSIO_E2E_WIDGET_FOCUS === 'dashboard') {
      await checkDashboardCustomization(client);
      return;
    }
    await clickButton(client,'Lehrercockpit');
    await waitFor(client,'cockpit board','Boolean(document.querySelector(".klassio-whiteboard"))');
    if (process.env.KLASSIO_E2E_WIDGET_FOCUS === 'archive') {
      await checkWidgetArchive(client);
      return;
    }
    if (process.env.KLASSIO_E2E_WIDGET_FOCUS === 'instruction') {
      await checkAssignmentReference(client);
      return;
    }
    if (process.env.KLASSIO_E2E_WIDGET_FOCUS === 'timeline') {
      await checkDayTimeline(client);
      return;
    }
    if (process.env.KLASSIO_E2E_WIDGET_FOCUS === 'zahlenraum') {
      await checkLinkedNumbers(client);
      return;
    }
    if (process.env.KLASSIO_E2E_WIDGET_FOCUS === 'leseanfang') {
      await checkReadingWorkshop(client);
      return;
    }
    const toggleCount = await evaluate(client, `document.querySelectorAll('.klassio-cockpit-shell button[aria-label="Schülerliste einblenden"]').length`);
    if (toggleCount !== 1) throw Error('Expected exactly one student list entry');
    await clickLabel(client,'Schülerliste einblenden',true);
    await waitFor(client,'student sidebar','Boolean(document.querySelector(".klassio-student-sidebar"))');
    await sleep(850);
    const opened=await metrics(client);
    console.log('OPEN '+JSON.stringify(opened));
    if(!opened.board || !opened.sidebar || !opened.dock || opened.studentCount<10)throw Error('Cockpit main surfaces or demo student list missing');
    if(opened.docWidth>WIDTH+10||opened.header?.h>56||opened.sidebar.w>309||opened.board.w<WIDTH*0.64||!opened.cardsWithin||!opened.touchSizeOK||opened.controls.length)throw Error('Cockpit width/card/button clipping: '+JSON.stringify(opened));
    await screenshot(client,'board-with-students');
    await clickLabel(client,'Schülerliste ausblenden');
    await waitFor(client,'sidebar hidden',`!document.querySelector('.klassio-student-sidebar') && Boolean(document.querySelector('button[aria-label="Schülerliste einblenden"]'))`);
    await sleep(650);
    const focused=await metrics(client);
    console.log('FOCUS '+JSON.stringify(focused));
    if(focused.sidebar||focused.board.w<=opened.board.w+70||focused.board.w<WIDTH*0.6)throw Error('Tafel was not enlarged');
    await screenshot(client,'board-focused');
    await clickLabel(client,'Schülerliste einblenden');
    await waitFor(client,'student sidebar restored','Boolean(document.querySelector(".klassio-student-sidebar"))');
    await sleep(650);
    const restored=await metrics(client);
    console.log('RESTORED '+JSON.stringify(restored));
    if(restored.studentCount!==opened.studentCount||Math.abs(restored.board.w-opened.board.w)>18)throw Error('Sidebar restore changed the board/card state');
    const openCockpitSettings = () => clickLabel(client, 'Cockpit-Einstellungen');
    const cockpitSettings = '#klassio-cockpit-settings';
    await openCockpitSettings();
    await waitFor(client, 'one cockpit settings entry groups board, pupil list and widgets',
      `Array.from(document.querySelectorAll('${cockpitSettings} [data-cockpit-settings-section]')).map(x=>x.dataset.cockpitSettingsSection).join(',')==='board,students,widgets,actions'`);
    await clickButton(client, 'Widget-Leiste anpassen');
    await waitFor(client, 'central entry opens the existing dock editor',
      `Boolean(document.querySelector('[role="dialog"][aria-label="Widget-Leiste anpassen"]')) && !document.querySelector('${cockpitSettings}')`);
    const dockAdd = `document.querySelector('[aria-labelledby="dock-available-heading"]')`;
    await evaluate(client, `document.querySelector('[aria-label="Widget-Leiste anpassen"] [role="tab"]:last-child').click()`);
    await waitFor(client, 'the dock offers only the fifteen unpinned teaching tools, grouped by use',
      `${dockAdd}?.querySelectorAll('button[aria-label$="zur Widget-Leiste hinzufügen"]').length === 15
        && Array.from(${dockAdd}.querySelectorAll('h4')).map(heading => heading.textContent).join(',') === 'Kernwidgets,Klassenalltag,Mathe,Deutsch,Sachunterricht,Musik,Spiele'`);
    await fill(client, 'Widgets für die Leiste suchen', 'Zahnputz');
    await waitFor(client, 'retired tools cannot be newly pinned', `${dockAdd}.textContent.includes('Keine weiteren Widgets passen zur Suche.')`);
    await clickLabel(client, 'Widget-Leiste schließen');
    await openCockpitSettings();
    await clickButton(client, 'Widget-Voreinstellungen');
    await waitFor(client, 'central entry opens widget defaults directly',
      `document.querySelector('#cockpit-widget-settings')?.getClientRects().length > 0 && !document.querySelector('${cockpitSettings}')`);
    await clickLabel(client, 'Widget-Bibliothek schließen');
    await openCockpitSettings();
    await clickButton(client, 'Mitarbeit einstellen');
    await waitFor(client, 'central entry opens pupil participation settings',
      `Boolean(document.querySelector('[role="dialog"][aria-label="Mitarbeit einstellen"]')) && !document.querySelector('${cockpitSettings}')`);
    await clickLabel(client, 'Mitarbeit-Einstellungen schließen');
    await openCockpitSettings();
    await clickButton(client, 'Klassenmaskottchen einstellen');
    await waitFor(client, 'central entry opens mascot settings',
      `Boolean(document.querySelector('[aria-label="Klassenmaskottchen-Einstellungen"]')) && !document.querySelector('${cockpitSettings}')`);
    await clickLabel(client, 'Klassenmaskottchen-Einstellungen schließen');

    const modes=await evaluate(client,
      `Array.from(document.querySelectorAll('.klassio-student-sidebar [role=group][aria-label="Pluspunkt-Art"] button')).map(b=>b.textContent.trim())`);
    if(modes.length!==2||!modes[0].startsWith('Mitarbeit')||modes[1]!=='Sozialverhalten')throw Error('Mode labels incorrect: '+JSON.stringify(modes));
    // Award one real demo badge, then verify the public display is opt-in.
    const badgeCountBefore = await evaluate(client, `document.querySelectorAll('.klassio-student-sidebar [data-earned-badge]').length`);
    if (badgeCountBefore !== 0) throw Error('Badges must be hidden by default.');
    const badgePickerOpened = await evaluate(client, `(() => {const b=document.querySelector('.klassio-student-sidebar button[aria-label^="Badges für"]');if(!b)return false;b.click();return true;})()`);
    if(!badgePickerOpened)throw Error('Existing badge picker not accessible from student name.');
    await waitFor(client,'badge picker',`Boolean(document.querySelector('.klassio-student-sidebar [role="dialog"][aria-label^="Badges für"]'))`);
    const awarded = await evaluate(client, `(() => {const b=document.querySelector('.klassio-student-sidebar [role="dialog"] button[aria-label$="vergeben"]:not(:disabled)');if(!b)return false;b.click();return true;})()`);
    if (!awarded)throw Error('No available demo badge to award.');
    await clickLabel(client,'Badge-Auswahl schließen');
    await clickLabel(client,'Verdiente Badges anzeigen');
    await waitFor(client,'earned badge visible',`document.querySelectorAll('.klassio-student-sidebar [data-earned-badge]').length >= 1`);
    await screenshot(client,'earned-badges-visible');
    const badgeDetailsOpened = await evaluate(client,`(() => {const b=document.querySelector('.klassio-student-sidebar button[aria-label^="Verdiente Badges von"]');if(!b)return false;b.click();return true;})()`);
    if(!badgeDetailsOpened)throw Error('Earned-badge preview button missing');
    await waitFor(client,'read-only badge details',`Boolean(document.querySelector('.klassio-student-sidebar [role="dialog"][aria-label^="Verdiente Badges von"]'))`);
    const badgesHaveDates = await evaluate(client,`document.querySelector('.klassio-student-sidebar [role="dialog"][aria-label^="Verdiente Badges von"]')?.textContent.includes('Vergeben am')`);
    if(!badgesHaveDates)throw Error('Badge details must include earned date.');
    await screenshot(client,'earned-badge-details');
    await clickLabel(client,'Badge-Übersicht schließen');

    await clickLabel(client,'Verdiente Badges ausblenden');
    await waitFor(client,'earned badge hidden again',`document.querySelectorAll('.klassio-student-sidebar [data-earned-badge]').length === 0`);
    await clickLabel(client,'Verdiente Badges anzeigen');

    await clickButton(client,'Sozialverhalten');
    await waitFor(client,'separate blue social scoring',`Boolean(document.querySelector('.klassio-student-sidebar button[aria-label^="Sozialpunkt für"].bg-sky-600'))`);
    await screenshot(client,'social-blue');
    const firstSocialScore = `document.querySelector('.klassio-student-sidebar [role="listitem"] [aria-label$="Pluspunkte"]')?.textContent`;
    const socialBefore = await evaluate(client, firstSocialScore);
    const socialClicked = await evaluate(client,`(() => {const b=document.querySelector('.klassio-student-sidebar button[aria-label^="Sozialpunkt für"]');if(!b)return false;b.click();return true;})()`);
    if(!socialClicked)throw Error('Social +1 action missing');
    await waitFor(client,'social award confirmation',`Boolean(document.querySelector('.klassio-student-sidebar [role="status"]')?.textContent.includes('Sozialverhalten'))`);
    await screenshot(client,'social-award-confirmation');
    const socialUndoOK=await evaluate(client,`(() => {const b=document.querySelector('.klassio-student-sidebar button[aria-label^="Letzte Sozialbewertung"]');if(!b)return false;const r=b.getBoundingClientRect();b.click();return r.height>=43;})()`);
    if(!socialUndoOK)throw Error('Social undo must be a 44px control');
    await waitFor(client,'social undo restoration',`!document.querySelector('.klassio-student-sidebar button[aria-label^="Letzte Sozialbewertung"]')`);
    if((await evaluate(client,firstSocialScore))!==socialBefore)throw Error('Social +1 was not undone');

    await clickButton(client,'Mitarbeit');
    await waitFor(client,'green subject scoring',`Boolean(document.querySelector('.klassio-student-sidebar button[aria-label^="Pluspunkt für"].bg-emerald-600'))`);
    await screenshot(client,'restored-subject-green');
    const subjectLabel=await evaluate(client,`document.querySelector('.klassio-student-sidebar [role="group"][aria-label="Pluspunkt-Art"] button')?.textContent`);
    if(!subjectLabel?.includes('Fach:')&&!subjectLabel?.includes('Fach auswählen'))throw Error('Mitarbeit must show explicit subject');
    const subjectBefore = await evaluate(client,`document.querySelector('.klassio-student-sidebar [role="listitem"] [aria-label$="Pluspunkte"]')?.textContent`);
    await evaluate(client,`document.querySelector('.klassio-student-sidebar button[aria-label^="Pluspunkt für"]').click()`);
    const needsSubject=await evaluate(client,`Boolean(document.querySelector('.klassio-student-sidebar [role="dialog"][aria-label="Fach für Mitarbeit auswählen"]'))`);
    if(needsSubject){
      const picked=await evaluate(client,`(() => {const buttons=Array.from(document.querySelectorAll('.klassio-student-sidebar [role="dialog"] button')); const b=buttons.find(x=>x.textContent.trim()==='Deutsch');if(!b)return false;b.click();return true;})()`);
      if(!picked)throw Error('Expected explicit Deutsch subject in picker');
    }
    await waitFor(client,'subject award confirmation',`Boolean(document.querySelector('.klassio-student-sidebar [role="status"]')?.textContent.includes('Mitarbeit ·'))`);
    await screenshot(client,'subject-award-confirmation');
    const subjectUndo=await evaluate(client,`(() => {const b=document.querySelector('.klassio-student-sidebar button[aria-label^="Letzte Mitarbeit"]');if(!b)return false;b.click();return true;})()`);
    if(!subjectUndo)throw Error('Subject undo missing');
    await waitFor(client,'subject undo restoration',`!document.querySelector('.klassio-student-sidebar button[aria-label^="Letzte Mitarbeit"]')`);
    const subjectAfter=await evaluate(client,`document.querySelector('.klassio-student-sidebar [role="listitem"] [aria-label$="Pluspunkte"]')?.textContent`);
    if(subjectBefore!==subjectAfter)throw Error('Subject award not undone');

    await clickLabel(client, 'Klassenmaskottchen einblenden');
    const mascot = `document.querySelector('[data-widget-type="pet"]')`;
    const character = `${mascot}?.querySelector('.class-mascot-character')`;
    const menu = `${mascot}?.querySelector('[role="menu"][aria-label="Haustier-Aktionen"]')`;
    const action = name => `${mascot}.querySelector('[data-mascot-ritual="' + ${q(name)} + '"]')`;
    const pointOnMascot = () => evaluate(client, `(() => {
      const character = ${character};
      const box = character.getBoundingClientRect();
      for (const yRatio of [.46, .37, .55, .62]) {
        const x = box.left + box.width / 2;
        const y = box.top + box.height * yRatio;
        if (character.contains(document.elementFromPoint(x, y))) return { x, y };
      }
      throw Error('The mascot artwork cannot receive a click');
    })()`);
    const mouseClick = async (point, clickCount = 1) => {
      await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount });
      await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount });
    };
    const openMascotMenu = async () => {
      const point = await pointOnMascot();
      await mouseClick(point);
      await mouseClick(point, 2);
      await waitFor(client, 'double-click opens the actions menu', `Boolean(${menu})`);
    };
    const selectMascotAction = label => evaluate(client,
      `Array.from(${menu}.querySelectorAll('button')).find(button => button.textContent.trim().includes(${q(label)})).click()`);
    const mascotHasNoOverlay = `${mascot}.querySelector('[data-practice-root="pet"]').textContent.trim() === ''
      && !${mascot}.querySelector('[role="timer"], [data-mascot-cue], .cockpit-widget-menu-trigger, [data-widget-resize]')`;

    await waitFor(client, 'class mascot appears', `Boolean(${character})`);
    const initialPoint = await pointOnMascot();
    await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...initialPoint });
    await mouseClick(initialPoint);
    await waitFor(client, 'hover and a single click leave only the mascot visible',
      `!${menu} && ${mascotHasNoOverlay} && ${mascot}.querySelector('[data-practice-root="pet"]').dataset.mascotReaction === 'true'`);
    await openMascotMenu();
    await waitFor(client, 'the opened menu sits beside the mascot artwork', `(() => {
      const m = ${menu}.getBoundingClientRect();
      const c = ${character}.getBoundingClientRect();
      return m.right <= c.left || m.left >= c.right || m.bottom <= c.top || m.top >= c.bottom;
    })()`);
    await selectMascotAction('Klasse begrüßen');
    await waitFor(client, 'greeting is a silent gesture with the menu closed',
      `Boolean(${action('greet')}) && !${menu} && ${mascotHasNoOverlay}`);

    await openMascotMenu();
    await selectMascotAction('Tafelruhe');
    await waitFor(client, 'quiet mode clears the activity entirely', `!${action('greet')} && !${menu}`);
    await openMascotMenu();
    await waitFor(client, 'quiet mode can be turned off from the double-click menu',
      `${menu}.querySelector('[role="menuitemcheckbox"]').getAttribute('aria-checked') === 'true'
        && Array.from(${menu}.querySelectorAll('[role="menuitem"]')).find(button => button.textContent.includes('Geschafft!')).disabled`);
    await selectMascotAction('Tafelruhe');

    await clickButton(client, 'Widget hinzufügen');
    await clickLabel(client, 'Widget-Voreinstellungen öffnen');
    await clickButton(client, 'Klassenmaskottchen ändern');
    await clickLabel(client, 'Katze Mimi als Klassenmaskottchen auswählen');
    if (WIDTH === 1280) {
      await evaluate(client, `Array.from(document.querySelectorAll('[aria-label="Maskottchengröße"] button')).find(button => button.textContent.trim() === 'Klein').click()`);
    }
    await clickLabel(client, 'Klassenmaskottchen-Einstellungen schließen');
    await waitFor(client, 'Mimi is visible with her curved tail', `Boolean(${mascot}?.querySelector('[data-mascot-kind="cat"] [data-mimi-tail]'))`);

    await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    const touchPoint = await pointOnMascot();
    const tapMascot = async () => {
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touchPoint] });
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    await tapMascot();
    if (await evaluate(client, `Boolean(${menu})`)) throw Error('A single touch opened the mascot menu');
    await tapMascot();
    await waitFor(client, 'a double tap on the Smartboard opens the actions menu', `Boolean(${menu})`);
    await selectMascotAction('Flüsterlesen');
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await waitFor(client, 'Mimi immediately opens her book without a timer or card', `(() => {
      const book = ${mascot}.querySelector('[data-mimi-reading="reading"] [data-mimi-book="open"] .mimi-book-spread');
      return book && getComputedStyle(book).opacity === '1' && book.getBoundingClientRect().width >= 20
        && !${menu} && ${mascotHasNoOverlay};
    })()`);
    await screenshot(client, 'mimi-reading');
    await openMascotMenu();
    await selectMascotAction('Aufräumen');
    await waitFor(client, 'choosing another action replaces the book with a visible basket',
      `Boolean(${mascot}.querySelector('[data-mascot-ritual-accent="tidy"]')) && !${mascot}.querySelector('[data-mimi-book]') && ${mascotHasNoOverlay}`);
    await openMascotMenu();
    await selectMascotAction('Abschlussrunde');
    await waitFor(client, 'reflection never puts a question card over the pet',
      `Boolean(${action('reflect')}) && !${menu} && ${mascotHasNoOverlay}`);
    await openMascotMenu();
    await selectMascotAction('Normal');
    await waitFor(client, 'Normal clears the activity and leaves Mimi visible',
      `!${mascot}.querySelector('[data-mascot-ritual]') && Boolean(${character}) && ${mascotHasNoOverlay}`);

    await clickLabel(client, 'Klassenmaskottchen ausblenden');

    const dockIds = `Array.from(document.querySelectorAll('[data-dock-favorite-id]')).map(button => button.dataset.dockFavoriteId).join(',')`;
    await waitFor(client, 'the default dock starts with attendance and Waldruhe',
      `${dockIds} === 'kidattendance,waldruhe,timeline,instruction,timer'`);
    await clickLabel(client, 'Ich bin da! öffnen');
    await waitFor(client, 'attendance opens directly from the dock', `Boolean(document.querySelector('[data-widget-type="kidattendance"]'))`);
    await clickLabel(client, 'Ich bin da! einklappen');
    await waitFor(client, 'attendance stays restorable from the dock',
      `document.querySelector('[data-dock-favorite-id="kidattendance"]').dataset.minimized === 'true'`);
    await clickButton(client, 'Widget hinzufügen');
    const picker = `document.querySelector('[aria-label="Widget-Bibliothek"]')`;
    const coreCards = `Array.from(${picker}.querySelectorAll('[data-testid^="cockpit-core-group-"]')).map(card => card.dataset.testid.replace('cockpit-core-group-', '')).join(',')`;
    await waitFor(client, 'the picker starts with six core widgets, including attendance and Waldruhe',
      `${coreCards} === 'kidattendance,waldruhe,timeline,instruction,timer,groups'`);
    await waitFor(client, 'one core card provides distinct actions for groups and drawing a name',
      `Boolean(${picker}.querySelector('[data-testid="cockpit-core-group-groups"] [data-widget-card-action="selection"]')) &&
        ${picker}.querySelector('[data-testid="cockpit-core-group-groups"] [data-widget-card-action="primary"]').textContent.includes('Gruppen bilden')`);
    await waitFor(client, 'all six core cards and their open buttons fit above the scroll fold',
      `(() => {
        const content = ${picker}.querySelector('.klassio-widget-library-content').getBoundingClientRect();
        return Array.from(${picker}.querySelectorAll('[data-widget-core-start="true"] [data-widget-card-action="primary"]')).every(button => {
          const box = button.getBoundingClientRect();
          return box.height >= 43.5 && box.top >= content.top && box.bottom <= content.bottom &&
            Boolean(button.querySelector('svg.lucide-panel-top-open[aria-hidden="true"]'));
        });
      })()`);
    await sleep(250);
    await screenshot(client, 'widget-kernwidgets');
    await clickButton(client, 'Klassenalltag');
    await waitFor(client, 'the classroom category contains six practical tools',
      `${coreCards} === 'tischcheck,classweeklyplan,homework,dienste,image,qrcode'`);
    for (const [category, tools] of [
      ['Mathe', 'zahlenraum,kopfrechnen'],
      ['Deutsch', 'vocabulary,wortsatzwerkstatt'],
      ['Sachunterricht', 'compass,watercycle'],
      ['Musik', 'sounds'],
      ['Spiele', 'dice'],
    ]) {
      await evaluate(client, `Array.from(${picker}.querySelectorAll('[aria-label="Widget-Kategorien"] button'))
        .find(button => button.lastElementChild.textContent === ${q(category)}).click()`);
      await waitFor(client, category + ' shows only its selected teaching tools', `${coreCards} === ${q(tools)}`);
    }
    await fill(client, 'Widget suchen', 'Zahnputz');
    await waitFor(client, 'retired tools never appear in the library or a fallback catalogue',
      `${coreCards} === '' && ${picker}.textContent.includes('Keine passenden Widgets gefunden')
        && !${picker}.textContent.includes('Weitere Widgets')`);
    await fill(client, 'Widget suchen', 'Zahlenstrahl');
    await waitFor(client, 'the number line is discoverable as part of the number space',
      `${coreCards} === 'zahlenraum'`);
    await fill(client, 'Widget suchen', 'Stoppuhr');
    await waitFor(client, 'stopwatch search returns one integrated timer entry', `${coreCards} === 'timer'`);
    await fill(client, 'Widget suchen', 'Shy Safari');
    await waitFor(client, 'Waldruhe is findable under Shy Safari',
      `Boolean(document.querySelector('button[aria-label="Waldruhe (Shy Safari) öffnen"]'))`);
    await clickLabel(client, 'Waldruhe (Shy Safari) öffnen');
    const forest = `document.querySelector('[data-practice-root="waldruhe"]')`;
    const forestProgress = `Number(${forest}?.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow'))`;
    await waitFor(client, 'Waldruhe opens with its updated title',
      `Boolean(${forest}) && document.querySelector('[data-widget-type="waldruhe"]')?.getAttribute('data-widget-title')?.includes('Waldruhe (Shy Safari)')`);
    await clickButton(client, 'Ohne Mikrofon testen');
    await waitFor(client, 'quiet time visibly advances', `${forestProgress} >= 5`);
    await waitFor(client, 'Waldruhe actions fit without scrolling, including the test buttons', `(() => {
      const widget = ${forest};
      const frame = widget.getBoundingClientRect();
      const controls = widget.querySelector('[data-waldruhe-controls]');
      const buttons = Array.from(controls.querySelectorAll('button'));
      return buttons.length === 5 && widget.scrollHeight <= widget.clientHeight + 1 &&
        getComputedStyle(controls.querySelector('.waldruhe-primary')).webkitTextFillColor === 'rgb(255, 255, 255)' && buttons.every(button => {
        const bounds = button.getBoundingClientRect();
        return bounds.height >= 43.5 && bounds.bottom <= frame.bottom + 1 &&
          button.contains(document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2));
      });
    })()`);
    await clickButton(client, 'Laut');
    await waitFor(client, 'loud signal pauses the quiet countdown', `${forest}?.textContent.includes('Ruhezeit pausiert')`);
    const pausedForestProgress = await evaluate(client, forestProgress);
    await sleep(650);
    if (await evaluate(client, forestProgress) !== pausedForestProgress) throw Error('Waldruhe gained quiet time during the loud signal');
    await screenshot(client, 'waldruhe-paused');
    await clickButton(client, 'Leise');
    await waitFor(client, 'quiet resumes from the previous progress', `${forestProgress} > ${pausedForestProgress}`);
    await waitFor(client, 'the first animal appears after quiet time', `${forest}?.textContent.includes('1 von 5 Tieren')`);
    const animalArtworkVisible = animal => `(() => {
      const img = ${forest}.querySelector('[data-waldruhe-animal="' + ${q(animal)} + '"] img');
      if (!img || !img.complete || !img.naturalWidth) return false;
      const rect = img.getBoundingClientRect();
      const scene = img.closest('[data-waldruhe-landscape]').getBoundingClientRect();
      const labels = Array.from(img.closest('[data-waldruhe-landscape]').querySelectorAll('[data-waldruhe-scene-label]'));
      const labelsLegible = labels.length >= 3 && labels.every(label =>
        getComputedStyle(label).color === 'rgb(255, 255, 255)' &&
        getComputedStyle(label).backgroundColor === 'rgba(7, 36, 33, 0.92)');
      return labelsLegible && rect.width >= 24 && rect.height >= 24 &&
        rect.left >= scene.left && rect.right <= scene.right &&
        rect.top >= scene.top && rect.bottom <= scene.bottom;
    })()`;
    const fullHabitat = (scene, animals) => `(() => {
      if (${forest}.dataset.waldruheScene !== ${q(scene)}) return false;
      const habitat = ${forest}.querySelector('[data-waldruhe-landscape]');
      const figures = Array.from(habitat.querySelectorAll('figure'));
      if (figures.map(figure => figure.dataset.waldruheAnimal).join(',') !== ${q(animals.join(','))}) return false;
      const bounds = habitat.getBoundingClientRect();
      const labels = Array.from(habitat.querySelectorAll('[data-waldruhe-scene-label]'), label => label.getBoundingClientRect());
      return labels.every((label, index) =>
        label.left >= bounds.left && label.right <= bounds.right &&
        label.top >= bounds.top && label.bottom <= bounds.bottom &&
        labels.slice(index + 1).every(other =>
          label.right <= other.left || label.left >= other.right ||
          label.bottom <= other.top || label.top >= other.bottom)) &&
        figures.every(figure => getComputedStyle(figure).opacity === '1') &&
        ${animals.map(animalArtworkVisible).join(' && ')};
    })()`;
    await waitFor(client, 'the hedgehog illustration is visible in the scene', animalArtworkVisible('igel'));
    await screenshot(client, 'waldruhe-waldtiere');
    await waitFor(client, 'the test round has partial progress toward another animal', `${forestProgress} >= 4`);
    await toggleWaldruheDock(client);
    await waitFor(client, 'minimizing also pauses a test round', `${forest}.dataset.waldruheMode === 'paused-demo'`);
    const frozenDemo = await evaluate(client, forestProgress);
    await toggleWaldruheDock(client);
    await waitFor(client, 'restoring a test round keeps the hedgehog and quiet time',
      `${forest}.textContent.includes('Fortsetzen') && ${forest}.querySelector('figcaption')?.textContent === 'Igel'
        && ${forest}.querySelector('[role="progressbar"]').getAttribute('aria-valuemax') === '30'
        && ${forestProgress} === ${frozenDemo}`);
    await clickButton(client, 'Fortsetzen');
    await waitFor(client, 'test mode resumes with its previous countdown',
      `${forest}.dataset.waldruheMode === 'demo' && ${forestProgress} > ${frozenDemo}`);
    const openForestSettings = () => evaluate(client, `document.querySelector('[data-widget-type="waldruhe"] .cockpit-widget-settings-trigger').click()`);
    const selectScene = scene => evaluate(client, `(() => {
      const choice = ${forest}.querySelector('select[aria-label="Schauplatz"]');
      choice.value = ${q(scene)};
      choice.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await openForestSettings();
    await waitFor(client, 'Waldruhe settings scroll independently of the controls', `(() => {
      const settings = ${forest}.querySelector('[aria-label="Waldruhe-Einstellungen"]');
      const controls = ${forest}.querySelector('[data-waldruhe-controls]');
      return settings && getComputedStyle(settings).overflowY === 'auto' &&
        settings.getBoundingClientRect().bottom <= controls.getBoundingClientRect().top;
    })()`);
    await selectScene('aquarium');
    await clickButton(client, 'Fertig');
    await waitFor(client, 'aquarium has its own quiet progress', `${forest}.dataset.waldruheScene === 'aquarium' && ${forest}.textContent.includes('0 von 5 Tieren')`);
    await waitFor(client, 'the first aquarium animal appears in its own scene', `${forest}.querySelector('figcaption')?.textContent === 'Neonfisch'`);
    await waitFor(client, 'the neon tetra illustration is visible in the aquarium', animalArtworkVisible('neonfisch'));
    await screenshot(client, 'waldruhe-aquarium');
    await openForestSettings();
    await evaluate(client, `Array.from(${forest}.querySelectorAll('label')).find(label => label.textContent.includes('Ruhezeit anzeigen')).querySelector('input').click()`);
    await waitFor(client, 'the teacher can hide the countdown', `!${forest}.querySelector('[role="progressbar"]') && ${forest}.querySelector('figcaption')?.textContent === 'Neonfisch'`);
    await evaluate(client, `Array.from(${forest}.querySelectorAll('label')).find(label => label.textContent.includes('Ruhezeit anzeigen')).querySelector('input').click()`);
    await selectScene('forest');
    await clickButton(client, 'Fertig');
    await waitFor(client, 'the forest keeps its own animal when returning', `${forest}.dataset.waldruheScene === 'forest' && ${forest}.querySelector('figcaption')?.textContent === 'Igel'`);
    await openForestSettings();
    await selectScene('aquarium');
    await clickButton(client, 'Fertig');
    await waitFor(client, 'the aquarium also retains its animal when returning', `${forest}.dataset.waldruheScene === 'aquarium' && ${forest}.querySelector('figcaption')?.textContent === 'Neonfisch'`);
    const swimmingFish = `${forest}.querySelector('[data-waldruhe-movement="swim"]')`;
    await waitFor(client, 'aquarium fish move gently during quiet time',
      `getComputedStyle(${swimmingFish}).animationName === 'waldruhe-swim' && getComputedStyle(${swimmingFish}).animationPlayState === 'running'`);
    await clickButton(client, 'Laut');
    await waitFor(client, 'aquarium movement pauses in a loud classroom',
      `getComputedStyle(${swimmingFish}).animationPlayState === 'paused'`);
    await client.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await waitFor(client, 'reduced motion disables swimming and reveal animations',
      `getComputedStyle(${swimmingFish}).animationName === 'none' &&
        getComputedStyle(${swimmingFish}.closest('figure')).animationName === 'none'`);
    await client.send('Emulation.setEmulatedMedia', { features: [] });
    await clickButton(client, 'Leise');
    await waitFor(client, 'all five aquarium animals have visible artwork and separate labels',
      fullHabitat('aquarium', ['neonfisch', 'guppy', 'garnele', 'rennschnecke', 'panzerwels']));
    await screenshot(client, 'waldruhe-aquarium-komplett');
    await openForestSettings();
    await selectScene('forest');
    await clickButton(client, 'Fertig');
    await waitFor(client, 'all five woodland animals have visible artwork and separate labels',
      fullHabitat('forest', ['igel', 'eichhoernchen', 'reh', 'fuchs', 'eule']));
    await screenshot(client, 'waldruhe-waldlichtung-komplett');
    await openForestSettings();
    await waitFor(client, 'the Vorarlberg meadow is listed in the habitat settings',
      `${forest}.querySelector('select[aria-label="Schauplatz"] option[value="meadow"]')?.textContent === 'Vorarlberger Bergwiese'`);
    await selectScene('meadow');
    await clickButton(client, 'Fertig');
    await waitFor(client, 'the meadow starts a separate round with its own landscape',
      `(async () => {
        if (${forest}.dataset.waldruheScene !== 'meadow' || !${forest}.textContent.includes('0 von 5 Tieren')) return false;
        const landscape = ${forest}.querySelector('[data-waldruhe-landscape]');
        const url = new URL('/cockpit/waldruhe-bergwiese.webp', location.href).href;
        if (!getComputedStyle(landscape).backgroundImage.includes(url)) return false;
        const backdrop = new Image();
        backdrop.src = url;
        await backdrop.decode();
        return backdrop.naturalWidth >= 1000;
      })()`);
    await waitFor(client, 'the chamois is the first alpine animal to appear', animalArtworkVisible('gaemse'));
    await openForestSettings();
    await selectScene('aquarium');
    await clickButton(client, 'Fertig');
    await waitFor(client, 'the aquarium is still complete after visiting the meadow',
      `${forest}.dataset.waldruheScene === 'aquarium' && ${forest}.textContent.includes('5 von 5 Tieren')`);
    await openForestSettings();
    await selectScene('meadow');
    await clickButton(client, 'Fertig');
    await waitFor(client, 'the meadow resumes with its chamois instead of starting over',
      `${forest}.dataset.waldruheScene === 'meadow' && ${forest}.querySelector('figcaption')?.textContent === 'Gämse'`);
    const alpineAnimals = ['gaemse', 'steinbock', 'alpendohle', 'schmetterling', 'murmeltier'];
    await waitFor(client, 'all five alpine animals are visible, with the marmot appearing last',
      fullHabitat('meadow', alpineAnimals));
    const marmot = `${forest}.querySelector('[data-waldruhe-animal="murmeltier"] img')`;
    await waitFor(client, 'the marmot finishes emerging from its burrow',
      `getComputedStyle(${marmot}).animationName === 'waldruhe-murmeltier-emerge' &&
        ${marmot}.getAnimations().every(animation => animation.playState === 'finished')`);
    await screenshot(client, 'waldruhe-bergwiese-komplett');
    await clickButton(client, 'Neu beginnen');
    await waitFor(client, 'restarting resets the meadow round', `${forest}.textContent.includes('0 von 5 Tieren')`);
    await openForestSettings();
    await selectScene('forest');
    await clickButton(client, 'Fertig');
    await waitFor(client, 'resetting the meadow leaves the forest round complete',
      `${forest}.dataset.waldruheScene === 'forest' && ${forest}.textContent.includes('5 von 5 Tieren')`);
    await openForestSettings();
    await selectScene('meadow');
    await clickButton(client, 'Fertig');
    await clickButton(client, 'Test beenden');
    await waitFor(client, 'stopping clears the countdown and the animals', `!${forest}?.querySelector('[role="progressbar"]') && ${forest}?.textContent.includes('0 von 5 Tieren')`);

    await openForestSettings();
    const toleranceControl = `${forest}.querySelector('input[aria-label="Lautstärkegrenze"]')`;
    for (const [label, level] of [['Stillarbeit', '1'], ['Partnerarbeit', '5'], ['Flüsterarbeit', '3']]) {
      await clickButton(client, label);
      await waitFor(client, label + ' applies the right microphone threshold',
        `${toleranceControl}.value === ${q(level)} && Array.from(${forest}.querySelectorAll('fieldset button[aria-pressed="true"]')).some(button => button.textContent.trim() === ${q(label)})`);
    }
    await evaluate(client, `(() => {
      const slider = ${toleranceControl};
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(slider, '2');
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await waitFor(client, 'fine adjustment clears the preset selection',
      `${toleranceControl}.value === '2' && !${forest}.querySelector('fieldset button[aria-pressed="true"]')`);
    await clickButton(client, 'Fertig');
    await openForestSettings();
    await waitFor(client, 'the fine adjustment is kept after closing settings', `${toleranceControl}.value === '2'`);
    await clickButton(client, 'Flüsterarbeit');
    await clickButton(client, 'Fertig');

    await checkWaldruhePreflight(client, forest, forestProgress);
    if (process.env.KLASSIO_E2E_FAKE_MIC === '1') await checkWaldruheMicrophone(client, forest, forestProgress);

    await checkAssignmentCountdown(client);
    await checkWidgetGeometry(client);
    await checkAttendanceScope(client);
    await checkRandomModeSearch(client);
    await checkDayTimeline(client);
    await checkSubjectWidgets(client);
    await checkWidgetArchive(client);
    await checkAssignmentReference(client);
    await checkLinkedNumbers(client);
    await checkReadingWorkshop(client);

    console.log('✓ Cockpit visual QA passed for '+WIDTH+'×'+HEIGHT+'. Board primary, students restorable, award modes distinct.');
  } catch(error) {
    try {await screenshot(client,'FAIL');}catch{}
    throw error;
  } finally {client.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
