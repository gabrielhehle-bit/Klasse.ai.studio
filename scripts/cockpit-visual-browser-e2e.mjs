import fs from 'node:fs/promises';

const BASE_URL = process.env.KLASSIO_E2E_BASE_URL || 'http://localhost:3100/login';
const DEBUG_URL = process.env.KLASSIO_CHROME_DEBUG_URL || 'http://127.0.0.1:9292';
const ACCESS_CODE = process.env.KLASSIO_E2E_ACCESS_CODE || 'ci-cockpit-visual-access-2026';
const VAULT_PASSWORD = 'Klassio-Cockpit-Visual-E2E-2026!';
const WIDTH = Number(process.env.KLASSIO_E2E_WIDTH || 1600);
const HEIGHT = WIDTH >= 1500 ? 900 : 720;
const PREFIX = '/tmp/klassio-cockpit-visual-' + WIDTH;
const q = JSON.stringify;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

class CdpClient {
  constructor(url) { this.url=url; this.id=0; this.pending=new Map(); }
  async connect() {
    await new Promise((resolve,reject)=>{
      this.ws=new WebSocket(this.url);
      this.ws.onopen=resolve; this.ws.onerror=reject;
      this.ws.onmessage=event=>{
        const msg=JSON.parse(String(event.data));
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
  await clickButton(client, 'Mikrofon stoppen');
  await waitFor(client, 'stop releases the captured audio track', `window.__waldruheTracks[0].readyState === 'ended' && !${forest}?.querySelector('[role="progressbar"]')`);

  await client.send('Browser.setPermission', { ...capturePermission, setting: 'denied' });
  await clickButton(client, 'Mikrofon starten');
  await waitFor(client, 'denied microphone permission shows the fall-back hint',
    `${forest}?.querySelector('[role="alert"]')?.textContent.includes('Erlaube das Mikrofon') && window.__waldruheTracks.length === 1`);
}

async function main() {
  await waitForChrome();
  const target=await (await fetch(DEBUG_URL+'/json/new?'+encodeURIComponent(BASE_URL),{method:'PUT'})).json();
  const client=new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();
  try {
    await client.send('Page.enable');await client.send('Runtime.enable');
    await client.send('Emulation.setDeviceMetricsOverride',{width:WIDTH,height:HEIGHT,deviceScaleFactor:1,mobile:false});
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
    await clickButton(client,'Lehrercockpit');
    await waitFor(client,'cockpit board','Boolean(document.querySelector(".klassio-whiteboard"))');
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
    await waitFor(client, 'class mascot appears', `Boolean(${mascot}?.querySelector('.class-mascot-character'))`);
    const openMascotMenu = () => evaluate(client, `${mascot}.querySelector('.mascot-quick-actions .cockpit-widget-menu-trigger').click()`);
    const mascotQuietButton = `${mascot}.querySelector('[role="menuitemcheckbox"]')`;
    const mascotPraiseButton = `Array.from(${mascot}.querySelectorAll('[role="menuitem"]')).find(button => button.textContent.includes('Geschafft!'))`;
    await evaluate(client, `${mascot}.querySelector('.class-mascot-character').focus()`);
    await openMascotMenu();
    await waitFor(client, 'quick mascot actions are visible', `${mascotQuietButton}?.getBoundingClientRect().width > 0 && Boolean(${mascotPraiseButton})`);
    await evaluate(client, `${mascotPraiseButton}.click()`);
    await waitFor(client, 'praise from board menu plays the ritual', `Boolean(${mascot}.querySelector('[data-mascot-ritual="praise"]'))`);
    await openMascotMenu();
    await evaluate(client, `${mascotQuietButton}.click()`);
    await openMascotMenu();
    await waitFor(client, 'quiet mode disables rituals immediately', `${mascotQuietButton}?.getAttribute('aria-checked') === 'true' && ${mascotPraiseButton}?.disabled`);
    await evaluate(client, `${mascotQuietButton}.click()`);
    await openMascotMenu();
    await waitFor(client, 'quiet mode can be turned off on the board', `${mascotQuietButton}?.getAttribute('aria-checked') === 'false' && !${mascotPraiseButton}?.disabled`);
    const playMascotAction = label => evaluate(client,
      `Array.from(${mascot}.querySelectorAll('[role="menuitem"]')).find(button => button.textContent.includes(${q(label)})).click()`);
    const mascotCue = action => `${mascot}.querySelector('[data-mascot-cue="${action}"]')`;
    await playMascotAction('Klasse begrüßen');
    await waitFor(client, 'greeting cue appears on the board', `${mascotCue('greet')}?.textContent.includes('Guten Morgen')`);
    await openMascotMenu();
    await playMascotAction('Bewegungspause');
    await waitFor(client, 'movement replaces greeting with the first exercise', `!${mascotCue('greet')} && ${mascotCue('move')}?.textContent.includes('1 von 3')`);
    await waitFor(client, 'movement advances to the next exercise', `${mascotCue('move')}?.textContent.includes('2 von 3') && ${mascotCue('move')}?.textContent.includes('Schultern')`, 13000);
    await evaluate(client, `${mascotCue('move')}.querySelector('[aria-label="Ritual beenden"]').click()`);
    await waitFor(client, 'movement can be stopped from the board', `!${mascotCue('move')}`);
    await openMascotMenu();
    await playMascotAction('Arbeitsstart');
    await waitFor(client, 'work routine starts with the assignment', `${mascotCue('ready')}?.textContent.includes('Arbeitsauftrag')`);
    await openMascotMenu();
    await evaluate(client, `${mascotQuietButton}.click()`);
    await waitFor(client, 'quiet mode clears an active cue', `!${mascotCue('ready')}`);
    await openMascotMenu();
    await evaluate(client, `${mascotQuietButton}.click()`);
    await clickButton(client, 'Widget hinzufügen');
    await clickLabel(client, 'Widget-Voreinstellungen öffnen');
    await clickButton(client, 'Klassenmaskottchen ändern');
    await clickLabel(client, 'Katze Mimi als Klassenmaskottchen auswählen');
    if (WIDTH === 1280) {
      await evaluate(client, `Array.from(document.querySelectorAll('[aria-label="Maskottchengröße"] button')).find(button => button.textContent.trim() === 'Klein').click()`);
    }
    await clickLabel(client, 'Klassenmaskottchen-Einstellungen schließen');
    await waitFor(client, 'Mimi is visible with her curved tail', `Boolean(${mascot}?.querySelector('[data-mascot-kind="cat"] [data-mimi-tail]'))`);

    await openMascotMenu();
    await playMascotAction('Flüsterlesen');
    const cueButton = (action, label) => evaluate(client, `${mascotCue(action)}.querySelector(${q('[aria-label="' + label + '"]')}).click()`);
    const readingTimer = `${mascotCue('read')}?.querySelector('[role="timer"]')?.textContent.trim()`;
    await waitFor(client, 'reading offers a choice of minutes', `Boolean(${mascotCue('read')}?.querySelector('[aria-label="2 Minuten lesen"]'))`);
    await waitFor(client, 'Mimi has a closed book while the time is selected', `Boolean(${mascot}.querySelector('[data-mimi-reading="ready"] [data-mimi-book="closed"]'))`);
    await cueButton('read', '2 Minuten lesen');
    await waitFor(client, 'reading starts on the board', `${readingTimer} === '2:00' || ${readingTimer} === '1:59'`);
    await waitFor(client, 'Mimi opens her book on start', `(() => {
      const scene = ${mascot}.querySelector('[data-mimi-reading="reading"]');
      const book = scene?.querySelector('[data-mimi-book="open"] .mimi-book-spread');
      const cue = ${mascotCue('read')};
      if (!book || !cue) return false;
      const bounds = book.getBoundingClientRect();
      return getComputedStyle(book).opacity === '1' && bounds.width >= 20 && bounds.bottom <= cue.getBoundingClientRect().top + 1;
    })()`);
    await screenshot(client, 'mimi-reading');
    await cueButton('read', 'Ritual pausieren');
    await waitFor(client, 'reading pause is shown', `${mascotCue('read')}?.textContent.includes('Pausiert')`);
    const pausedTime = await evaluate(client, readingTimer);
    await sleep(1250);
    if (await evaluate(client, readingTimer) !== pausedTime) throw Error('Reading countdown continued while paused');
    await cueButton('read', 'Ritual fortsetzen');
    await waitFor(client, 'reading countdown resumes', `${readingTimer} !== ${q(pausedTime)} && !${mascotCue('read')}?.textContent.includes('Pausiert')`, 4000);

    await openMascotMenu();
    await playMascotAction('Aufräumen');
    await waitFor(client, 'tidying replaces the reading countdown', `!${mascotCue('read')} && ${mascotCue('tidy')}?.textContent.includes('Hefte und Stifte')`);
    await cueButton('tidy', 'Nächster Schritt');
    await waitFor(client, 'tidying advances from its board control', `${mascotCue('tidy')}?.textContent.includes('2 von 3')`);
    await cueButton('tidy', 'Nächster Schritt');
    await waitFor(client, 'tidying reaches the last step', `${mascotCue('tidy')}?.textContent.includes('Boden sauber')`);
    await cueButton('tidy', 'Ritual abschließen');
    await waitFor(client, 'tidying can finish from the board', `!${mascotCue('tidy')}`);

    await openMascotMenu();
    await playMascotAction('Abschlussrunde');
    await waitFor(client, 'reflection prompts appear', `${mascotCue('reflect')}?.textContent.includes('heute gelernt')`);
    await cueButton('reflect', 'Nächster Schritt');
    await waitFor(client, 'reflection advances at the teacher’s pace', `${mascotCue('reflect')}?.textContent.includes('gut geklappt')`);
    await cueButton('reflect', 'Ritual beenden');
    await waitFor(client, 'reflection can be stopped', `!${mascotCue('reflect')}`);

    await openMascotMenu();
    await playMascotAction('Flüsterlesen');
    // Accelerate only the next two-minute reading timeout. All UI transitions
    // still go through the real timer callback and the click below.
    await evaluate(client, `(() => {
      const timeout = window.setTimeout;
      window.setTimeout = (callback, delay, ...args) => {
        if (delay > 110_000 && delay <= 120_000) {
          window.setTimeout = timeout;
          return timeout(callback, 700, ...args);
        }
        return timeout(callback, delay, ...args);
      };
    })()`);
    await cueButton('read', '2 Minuten lesen');
    await waitFor(client, 'Mimi closes the book when the timer ends', `(() => {
      const book = ${mascot}.querySelector('[data-mimi-reading="finished"] [data-mimi-book="closed"] .mimi-book-cover');
      return book && getComputedStyle(book).opacity === '1' && ${mascotCue('read')}?.textContent.includes('Lesezeit vorbei');
    })()`);
    await screenshot(client, 'mimi-finished');
    await cueButton('read', 'Ritual abschließen');
    await waitFor(client, 'Mimi returns to her normal pose with no book', `!${mascot}.querySelector('[data-mimi-book]')`);

    await clickLabel(client, 'Klassenmaskottchen ausblenden');

    await clickButton(client, 'Widget hinzufügen');
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
    const openForestSettings = () => evaluate(client, `document.querySelector('[data-widget-type="waldruhe"] .cockpit-widget-settings-trigger').click()`);
    const selectScene = scene => evaluate(client, `(() => {
      const choice = ${forest}.querySelector('select[aria-label="Schauplatz"]');
      choice.value = ${q(scene)};
      choice.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await openForestSettings();
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

    if (process.env.KLASSIO_E2E_FAKE_MIC === '1') await checkWaldruheMicrophone(client, forest, forestProgress);

    console.log('✓ Cockpit visual QA passed for '+WIDTH+'×'+HEIGHT+'. Board primary, students restorable, award modes distinct.');
  } catch(error) {
    try {await screenshot(client,'FAIL');}catch{}
    throw error;
  } finally {client.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
