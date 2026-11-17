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
    '(() => {const t='+q(text)+'; const b=Array.from(document.querySelectorAll("button")).find(x=>x.textContent.replace(/\\s+/g," ").trim()===t && x.getBoundingClientRect().width>0);if(!b)return false;b.click();return true;})()');
  if(!ok)throw Error('Button missing: '+text);
}
async function clickLabel(client,label,optional=false) {
  const ok=await evaluate(client,
    '(() => {const b=Array.from(document.querySelectorAll("button")).find(x=>x.getAttribute("aria-label")==='+q(label)+'); if(!b)return false; b.click();return true;})()');
  if(!ok&&!optional)throw Error('Action missing: '+label);
  return ok;
}
async function fill(client,label,value) {
  const ok=await evaluate(client,
    '(() => {const l=Array.from(document.querySelectorAll("label")).find(x=>x.textContent.includes('+q(label)+'));' +
    'const input=l?.querySelector("input")||(l?.htmlFor?document.getElementById(l.htmlFor):null);if(!input)return false;' +
    'Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,'+q(value)+');' +
    'input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));return true;})()');
  if(!ok)throw Error('Input missing: '+label);
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
    const sidebar=document.querySelector('.klassio-student-sidebar');
    const dock=document.querySelector('.klassio-widget-dock');
    const list=sidebar?.querySelector('[role=list]');
    const cards=Array.from(list?.querySelectorAll('[role=listitem]')||[]);
    const boardR=rect(board), sideR=rect(sidebar), dockR=rect(dock), listR=rect(list);
    const cardsWithin=cards.every(el=>{const r=el.getBoundingClientRect();return r.left>=listR.x-2&&r.right<=listR.right+2;});
    const controls=Array.from(document.querySelectorAll('.klassio-cockpit-shell button')).filter(b=>{
      const r=b.getBoundingClientRect();return r.width>0&&r.height>0&&r.top<150;
    }).map(b=>({label:b.getAttribute('aria-label')||b.title||b.textContent.trim(),r:rect(b)}));
    return {viewport:innerWidth,docWidth:document.documentElement.scrollWidth,board:boardR,
      sidebar:sideR,dock:dockR,studentCount:cards.length,cardsWithin,
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
    await clickLabel(client,'Schülerliste einblenden',true);
    await waitFor(client,'student sidebar','Boolean(document.querySelector(".klassio-student-sidebar"))');
    await sleep(850);
    const opened=await metrics(client);
    console.log('OPEN '+JSON.stringify(opened));
    if(!opened.board || !opened.sidebar || !opened.dock || opened.studentCount<10)throw Error('Cockpit main surfaces or demo student list missing');
    if(opened.docWidth>WIDTH+10||opened.board.w<WIDTH*0.45||!opened.cardsWithin||opened.controls.length)throw Error('Cockpit width/card/button clipping: '+JSON.stringify(opened));
    await screenshot(client,'board-with-students');
    await clickLabel(client,'Tafel groß anzeigen');
    await waitFor(client,'sidebar hidden',`!document.querySelector('.klassio-student-sidebar') && Boolean(document.querySelector('button[aria-label="Schülerliste wieder anzeigen"]'))`);
    await sleep(650);
    const focused=await metrics(client);
    console.log('FOCUS '+JSON.stringify(focused));
    if(focused.sidebar||focused.board.w<=opened.board.w+70||focused.board.w<WIDTH*0.6)throw Error('Tafel was not enlarged');
    await screenshot(client,'board-focused');
    await clickLabel(client,'Schülerliste wieder anzeigen');
    await waitFor(client,'student sidebar restored','Boolean(document.querySelector(".klassio-student-sidebar"))');
    await sleep(650);
    const restored=await metrics(client);
    console.log('RESTORED '+JSON.stringify(restored));
    if(restored.studentCount!==opened.studentCount||Math.abs(restored.board.w-opened.board.w)>18)throw Error('Sidebar restore changed the board/card state');
    const modes=await evaluate(client,
      `Array.from(document.querySelectorAll('.klassio-student-sidebar [role=group][aria-label="Pluspunkt-Art"] button')).map(b=>b.textContent.trim())`);
    if(JSON.stringify(modes)!==JSON.stringify(['Mitarbeit','Sozialverhalten']))throw Error('Mode labels incorrect: '+JSON.stringify(modes));
    await clickButton(client,'Sozialverhalten');
    await waitFor(client,'separate blue social scoring',`Boolean(document.querySelector('.klassio-student-sidebar button[aria-label^="Sozialpunkt für"].bg-sky-600'))`);
    await screenshot(client,'social-blue');
    await clickButton(client,'Mitarbeit');
    await waitFor(client,'green subject scoring',`Boolean(document.querySelector('.klassio-student-sidebar button[aria-label^="Pluspunkt für"].bg-emerald-600'))`);
    await screenshot(client,'restored-subject-green');
    console.log('✓ Cockpit visual QA passed for '+WIDTH+'×'+HEIGHT+'. Board primary, students restorable, award modes distinct.');
  } catch(error) {
    try {await screenshot(client,'FAIL');}catch{}
    throw error;
  } finally {client.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
