/**
 * Real Chrome mobile smoke test. Uses a throwaway local server, a fresh
 * vault and the explicitly selected demo class; reads only UI/layout.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.KLASSIO_E2E_BASE_URL || 'http://127.0.0.1:3100/login';
const DEBUG_URL = process.env.KLASSIO_CHROME_DEBUG_URL || 'http://127.0.0.1:9282';
const CODE = process.env.KLASSIO_E2E_ACCESS_CODE || 'ci-mobile-audit-access-2026';
const PASSWORD = 'Klassio-Only-Demo-Mobile-2026!';
const OTHER_PASSWORD = 'Klassio-Other-Demo-Only-2026!';
const DOWNLOAD_DIR = '/tmp/klassio-fresh-restore-downloads';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const q = JSON.stringify;

class Client {
  constructor(url) { this.url=url; this.seq=0; this.pending=new Map(); this.dialogQueue=[]; this.dialogSeen=[]; this.dialogErrors=[]; }
  async connect() {
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url); this.ws=ws;
      ws.onopen=resolve; ws.onerror=reject;
      ws.onmessage=e=>{
        const m=JSON.parse(String(e.data));
        if(m.method==='Page.javascriptDialogOpening'){
          const next=this.dialogQueue.shift();
          this.dialogSeen.push(m.params?.type||'unknown');
          if(!next || next.type!==m.params?.type) this.dialogErrors.push('Unexpected browser dialog type: '+String(m.params?.type));
          void this.send('Page.handleJavaScriptDialog', {
            accept: Boolean(next?.accept && next.type===m.params?.type),
            ...(next?.type==='prompt' ? {promptText:next.text||''} : {}),
          }).catch(()=>this.dialogErrors.push('Could not dismiss dialog'));
          return;
        }
        const p=this.pending.get(m.id);
        if(!p)return;
        clearTimeout(p.timer); this.pending.delete(m.id);
        if(m.error)p.reject(new Error(m.error.message));else p.resolve(m.result);
      };
      ws.onclose=()=>{for(const p of this.pending.values())p.reject(new Error('Chrome closed'));this.pending.clear();};
    });
  }
  send(method, params={}) {
    return new Promise((resolve,reject)=>{
      const id=++this.seq;
      const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('CDP timeout: '+method));},30000);
      this.pending.set(id,{resolve,reject,timer});
      this.ws.send(JSON.stringify({id,method,params}));
    });
  }
  close(){this.ws?.close();}
}
async function openBrowser(debugUrl=DEBUG_URL) {
  let target;
  for(let i=0;i<100;i++){
    try{
      const res=await fetch(debugUrl+'/json/new?'+encodeURIComponent(BASE_URL),{method:'PUT'});
      if(res.ok){target=await res.json();break;}
    }catch{}
    await sleep(250);
  }
  if(!target?.webSocketDebuggerUrl)throw new Error('Chrome target not available');
  const c=new Client(target.webSocketDebuggerUrl);await c.connect();
  await c.send('Page.enable');await c.send('Runtime.enable');
  await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:980,deviceScaleFactor:1,mobile:false});
  return c;
}
async function evalPage(c,expression){
  const r=await c.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});
  if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result?.value;
}
async function until(c,label,expr){
  for(let i=0;i<150;i++){
    try{if(await evalPage(c,expr)){console.log('PASS '+label);return;}}catch{}
    await sleep(200);
  }
  throw new Error('Timed out waiting for '+label);
}
async function click(c,selector){
  const ok=await evalPage(c,'(() => {const n=document.querySelector('+q(selector)+');if(!n||n.disabled)return false;n.click();return true;})()');
  if(!ok)throw new Error('Control not available: '+selector);
}
async function clickText(c,text){
  const ok=await evalPage(c,'(() => {const n=Array.from(document.querySelectorAll("button")).find(b=>b.textContent?.includes('+q(text)+')&&!b.disabled);if(!n)return false;n.click();return true;})()');
  if(!ok)throw new Error('Button not available: '+text);
}
async function fill(c,label,value) {
  const expr='(() => {' +
    'const norm=v=>String(v||"").replace(/\s+/g," ").trim().toLowerCase();' +
    'const expected=norm(' + q(label) + ');' +
    'const lab=Array.from(document.querySelectorAll("label")).find(el=>norm(el.textContent).includes(expected));' +
    'let f=lab?.querySelector("input,textarea,select")||null;' +
    'if(!f&&lab?.htmlFor)f=document.getElementById(lab.htmlFor);' +
    'if(!f&&lab?.parentElement)f=lab.parentElement.querySelector("input,textarea,select");' +
    'if(!f)f=Array.from(document.querySelectorAll("input,textarea,select")).find(el=>' +
    'norm(el.getAttribute("placeholder")).includes(expected)||norm(el.getAttribute("aria-label")).includes(expected));' +
    'if(!f)return false;' +
    'const proto=f instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:' +
    'f instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;' +
    'Object.getOwnPropertyDescriptor(proto,"value")?.set?.call(f,'+q(value)+');' +
    'f.dispatchEvent(new Event("input",{bubbles:true}));' +
    'f.dispatchEvent(new Event("change",{bubbles:true}));return true;})()';
  for(let i=0;i<50;i++){if(await evalPage(c,expr))return;await sleep(200);}
  throw new Error('Input not found: '+label);
}
async function usePhone(c){
  await c.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await c.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await sleep(400);
}


const markerA = 'Nur Gerät A – Sicherungstest';
const markerB = 'Nur Gerät B – vor Wiederherstellung';

async function enterDemo(c, password) {
  await c.send('Page.navigate',{url:BASE_URL});
  await until(c,'access screen','document.body?.textContent.toLowerCase().includes("geschützter zugang")');
  await fill(c,'Zugangscode',CODE);
  await clickText(c,'Klassio öffnen');
  await until(c,'new vault setup','document.body?.textContent.toLowerCase().includes("tresor auf diesem gerät einrichten")');
  await fill(c,'Eigenes Tresor-Passwort',password);
  await fill(c,'Passwort bestätigen',password);
  await clickText(c,'Weiter zum Wiederherstellungscode');
  await until(c,'recovery code setup','document.body?.textContent.toLowerCase().includes("dein einmaliger wiederherstellungscode")');
  const code=await evalPage(c,'(() => {const label=Array.from(document.querySelectorAll("label")).find(x=>x.textContent?.includes("Dein einmaliger Wiederherstellungscode"));return label?.nextElementSibling?.textContent?.trim()||null;})()');
  if(!code || code.replace(/[^A-Z0-9]/gi,'').length < 30)throw new Error('Synthetic recovery code could not be read from setup');
  const accepted=await evalPage(c,'(() => {const l=Array.from(document.querySelectorAll("label")).find(x=>x.textContent?.includes("Ich habe den Wiederherstellungscode sicher notiert"));const b=l?.querySelector("input[type=checkbox]");if(!b)return false;b.click();return b.checked;})()');
  if(!accepted)throw new Error('Recovery acknowledgement missing');
  await clickText(c,'Einrichtung abschließen');
  await until(c,'new demo setup','document.body?.textContent.toLowerCase().includes("willkommen bei klassio")');
  await clickText(c,'Beispielklasse erkunden');
  await until(c,'demo dashboard','Array.from(document.querySelectorAll("button")).some(b=>b.textContent?.trim()==="Heute")');
  return code;
}
async function goTo(c,id,expected) {
  // Datensicherung lives in the distinct fixed "Persönlich & Daten" footer,
  // not in the expandable main navigation. Check the user-facing route.
  if(id==='datensicherung') {
    await click(c,'[aria-label="Persönlich und Daten"] button[title="Datensicherung"]');
    await until(c,'actual backup screen','Boolean(Array.from(document.querySelectorAll("h2")).find(h=>h.textContent.trim()==="Datensicherung"))');
    return;
  }
  if(!await evalPage(c,'Boolean(document.querySelector("[data-menu-id='+id+']"))')) {
    await click(c,'button[aria-label^="Mehr ("]');
  }
  await until(c,'sidebar '+id,'Boolean(document.querySelector("[data-menu-id='+id+']"))');
  await click(c,'[data-menu-id='+id+']');
  await until(c,expected, 'document.body?.textContent.includes('+q(expected)+')');
}
async function setAssessment(c,title) {
  await goTo(c,'noten','Notenmappe');
  await until(c,'gradebook open','Boolean(document.querySelector("[data-gradebook-scroll-container]"))');
  await click(c,'#gradebook-add-assessment-trigger');
  await until(c,'add-assessment choice','Boolean(document.querySelector("#gradebook-add-assessment-menu"))');
  await click(c,'#gradebook-add-assessment-menu button[aria-label="Lernzielkontrolle für die Klasse anlegen"]');
  await until(c,'assessment edit form','Boolean(document.querySelector("#assessment-item-modal-content"))');
  await fill(c,'Bezeichnung / Titel',title);
  await click(c,'#btn-save-assessment-modal');
  await until(c,'assessment title visible','document.body.textContent.includes('+q(title)+')');
  await until(c,'assessment closed','!document.querySelector("#assessment-item-modal-content")');
}
async function assertMarker(c,marker,present) {
  await goTo(c,'noten','Notenmappe');
  await until(c,'gradebook visible','Boolean(document.querySelector("[data-gradebook-scroll-container]"))');
  const value=await evalPage(c,'document.querySelector("[data-gradebook-scroll-container]")?.textContent.includes('+q(marker)+')');
  if(value!==present)throw new Error('Restore data marker mismatch for '+(present?'expected':'absent')+' marker');
}
async function chooseFile(c,fileName,dialogPlan) {
  c.dialogQueue.push(...dialogPlan);
  const doc=await c.send('DOM.getDocument');
  const input=await c.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'input[type="file"][aria-label^="Klassio-Sicherungsdatei"]'});
  if(!input.nodeId)throw new Error('Backup file input unavailable in UI');
  await c.send('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[fileName]});
  for(let count=0;count<180;count++){
    if(c.dialogQueue.length===0)break;
    await sleep(200);
  }
  if(c.dialogQueue.length || c.dialogErrors.length)throw new Error('Backup confirmation dialog sequence incomplete: '+JSON.stringify(c.dialogErrors));
  await until(c,'restore form available',
    'Array.from(document.querySelectorAll("button")).some(b=>b.textContent?.includes("Sicherungsdatei auswählen")&&!b.disabled)||Array.from(document.querySelectorAll("button")).some(b=>b.textContent?.includes("Wiederhergestellt"))');
  await sleep(200);
}
function plan(type,accept,text){return {type,accept,text};}

await fs.mkdir(DOWNLOAD_DIR,{recursive:true});
const first=await openBrowser(process.env.KLASSIO_CHROME_A_URL||'http://127.0.0.1:9282');
const second=await openBrowser(process.env.KLASSIO_CHROME_B_URL||'http://127.0.0.1:9283');
try {
  const codeA=await enterDemo(first,PASSWORD);
  await setAssessment(first,markerA);
  await goTo(first,'datensicherung','Datensicherung');
  await first.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:DOWNLOAD_DIR});
  await clickText(first,'Sicherung herunterladen');
  let downloaded=null;
  for(let attempt=0;attempt<100;attempt++){
    const found=(await fs.readdir(DOWNLOAD_DIR)).filter(n=>/^Klassio_Sicherung_.*\.json$/.test(n));
    if(found.length===1){downloaded=path.join(DOWNLOAD_DIR,found[0]);break;}
    await sleep(200);
  }
  if(!downloaded)throw new Error('No physical encrypted backup was downloaded');
  const raw=await fs.readFile(downloaded,'utf8');
  const safe=JSON.parse(raw);
  if(safe.format!=='LehrerAPP_Encrypted_Backup'||safe.version!==1||!safe.encryptedState||!safe.vaultRecord||
     raw.includes(markerA)||raw.includes(PASSWORD)||raw.includes(codeA))
    throw new Error('Downloaded file is missing encrypted format or leaks plaintext');
  console.log('PASS Device A creates a real encrypted, non-plaintext backup file');

  await enterDemo(second,OTHER_PASSWORD);
  await setAssessment(second,markerB);
  await assertMarker(second,markerB,true);
  await assertMarker(second,markerA,false);
  await goTo(second,'datensicherung','Datensicherung');

  // Wrong password must fail closed; keep all existing local data.
  await chooseFile(second,downloaded,[
    plan('prompt',true,'Demo-only-incorrect-password'),
    plan('alert',true),
  ]);
  await assertMarker(second,markerB,true);
  await assertMarker(second,markerA,false);
  console.log('PASS Device B wrong backup password preserves its existing data');

  // Cancellation of the credential prompt also must not replace local data.
  await goTo(second,'datensicherung','Datensicherung');
  await chooseFile(second,downloaded,[plan('prompt',false)]);
  await assertMarker(second,markerB,true);
  console.log('PASS Cancelling credential input preserves existing data');

  // The correct password is sufficient to decrypt, but replacing must be confirmed.
  await goTo(second,'datensicherung','Datensicherung');
  await chooseFile(second,downloaded,[
    plan('prompt',true,PASSWORD),
    plan('confirm',false),
  ]);
  await assertMarker(second,markerB,true);
  await assertMarker(second,markerA,false);
  console.log('PASS Correct backup password followed by refusal keeps local data');

  // Recovery code from Device A restores on a second independent Chrome profile.
  await goTo(second,'datensicherung','Datensicherung');
  await chooseFile(second,downloaded,[
    plan('prompt',true,codeA),
    plan('confirm',true),
  ]);
  await assertMarker(second,markerA,true);
  await assertMarker(second,markerB,false);
  console.log('PASS Recovery code restores Device A state on independent Device B');

  await second.send('Page.reload',{ignoreCache:true});
  await until(second,'reload remains authenticated',
    'document.body?.textContent.includes("Heute") || document.body?.textContent.includes("Tresor entsperren")');
  await assertMarker(second,markerA,true);
  await assertMarker(second,markerB,false);
  console.log('PASS Fresh-device recovery survives an encrypted browser reload');

  if(first.dialogErrors.length || second.dialogErrors.length)throw new Error('Unexpected Chrome dialog during backup journey');
  console.log('PASS Two-profile file-based fresh-device recovery, cancellation and failure safety');
} finally {
  first.close();
  second.close();
}
