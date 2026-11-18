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
    await clickLabel(client, 'Klassenmaskottchen ausblenden');

    console.log('✓ Cockpit visual QA passed for '+WIDTH+'×'+HEIGHT+'. Board primary, students restorable, award modes distinct.');
  } catch(error) {
    try {await screenshot(client,'FAIL');}catch{}
    throw error;
  } finally {client.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
