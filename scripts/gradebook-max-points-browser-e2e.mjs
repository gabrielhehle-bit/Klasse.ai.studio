/**
 * Real Chrome mobile smoke test. Uses a throwaway local server, a fresh
 * vault and the explicitly selected demo class; reads only UI/layout.
 */
import fs from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

// Focused Chrome regression for KLASSIO Issue #571: one isolated synthetic class.
const BASE_URL = process.env.KLASSIO_E2E_BASE_URL || 'http://127.0.0.1:3100/login';
const DEBUG_URL = process.env.KLASSIO_CHROME_DEBUG_URL || 'http://127.0.0.1:9282';
const CODE = process.env.KLASSIO_E2E_ACCESS_CODE || 'ci-mobile-audit-access-2026';
const PASSWORD = 'Klassio-Only-Demo-Mobile-2026!';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const q = JSON.stringify;

class Client {
  constructor(url) { this.url=url; this.seq=0; this.pending=new Map(); this.confirmCount=0; this.exceededCount=0; this.unexpectedDialogs=[]; this.approveNextMax=false; }
  async connect() {
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url); this.ws=ws;
      ws.onopen=resolve; ws.onerror=reject;
      ws.onmessage=e=>{
        const m=JSON.parse(String(e.data));
        if(m.method==='Page.javascriptDialogOpening') {
          const message=m.params?.message||'';
          const confirming=m.params?.type==='confirm' && message.startsWith('Für diese Bewertung sind bereits ') &&
            message.includes('Maximalpunkten ändern sich die Prozentwerte');
          const tooSmall=m.params?.type==='alert' && message.startsWith('Maximalpunkte nicht geändert:');
          if(!confirming && !tooSmall) {
            this.unexpectedDialogs.push({type:m.params?.type,message});
          }
          if(confirming) this.confirmCount++;
          if(tooSmall) this.exceededCount++;
          const accept=tooSmall || (confirming && this.approveNextMax===true);
          this.approveNextMax=false;
          void this.send('Page.handleJavaScriptDialog',{accept}).catch(()=>{});
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
async function openBrowser() {
  let target;
  for(let i=0;i<100;i++){
    try{
      const res=await fetch(DEBUG_URL+'/json/new?'+encodeURIComponent(BASE_URL),{method:'PUT'});
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

const c=await openBrowser();
try {
  await c.send('Page.navigate',{url:BASE_URL});
  await until(c,'access screen','document.body?.textContent.toLowerCase().includes("geschützter zugang")');
  await fill(c,'Zugangscode',CODE);
  await clickText(c,'Klassio öffnen');
  await until(c,'new demo vault','document.body?.textContent.toLowerCase().includes("tresor auf diesem gerät einrichten")');
  await fill(c,'Eigenes Tresor-Passwort',PASSWORD);
  await fill(c,'Passwort bestätigen',PASSWORD);
  await clickText(c,'Weiter zum Wiederherstellungscode');
  await until(c,'recovery code','document.body?.textContent.toLowerCase().includes("dein einmaliger wiederherstellungscode")');
  const acknowledged=await evalPage(c,'(() => {const l=Array.from(document.querySelectorAll("label")).find(x=>x.textContent?.includes("Ich habe den Wiederherstellungscode sicher notiert"));const b=l?.querySelector("input[type=checkbox]");if(!b)return false;b.click();return b.checked;})()');
  if(!acknowledged)throw new Error('Recovery code acknowledgement missing');
  await clickText(c,'Einrichtung abschließen');
  await until(c,'initial demo selection','document.body?.textContent.toLowerCase().includes("willkommen bei klassio")');
  await clickText(c,'Beispielklasse erkunden');
  await until(c,'teacher dashboard','Array.from(document.querySelectorAll("button")).some(b=>b.textContent?.trim()==="Heute")');
  if(!await evalPage(c,'Boolean(document.querySelector("[data-menu-id=noten]"))')) {
    await click(c,'button[aria-label^="Mehr ("]');
  }
  await until(c,'Notenmappe navigation','Boolean(document.querySelector("[data-menu-id=noten]"))');
  await click(c,'[data-menu-id="noten"]');
  await until(c,'Notenmappe table','Boolean(document.querySelector("[data-gradebook-scroll-container]"))');

  await click(c,'#gradebook-add-assessment-trigger');
  await until(c,'new assessment menu','Boolean(document.querySelector("#gradebook-add-assessment-menu"))');
  await click(c,'#gradebook-add-assessment-menu button[aria-label="Lernzielkontrolle für die Klasse anlegen"]');
  await until(c,'new assessment editor','Boolean(document.querySelector("#assessment-item-modal-content"))');
  await click(c,'input[name="assessment-item-mode"][value="points"]');
  await until(c,'point maximum input','Boolean(document.querySelector("#assessment-item-max-points-input"))');
  await fill(c,'Bezeichnung / Titel','Chrome-Punktetest');
  await fill(c,'Maximal erreichbare Punkte','20');
  await click(c,'#btn-save-assessment-modal');
  await until(c,'points column created',
    'document.querySelectorAll("[data-gradebook-scroll-container] input[data-col]:not(:disabled)").length>=2');
  const sampleInput=await evalPage(c,'(() => {const e=document.querySelector("[data-gradebook-scroll-container] input[data-col]:not(:disabled)");return e?{col:e.dataset.col,label:e.getAttribute("aria-label")}:null;})()');
  if(!sampleInput?.label||!sampleInput.col)throw new Error('Synthetic score cell not found');
  const selector='[data-gradebook-scroll-container] input[data-col][aria-label='+q(sampleInput.label)+']';
  const filled=await evalPage(c,'(() => {const e=document.querySelector('+q(selector)+');if(!e)return false;' +
    'e.scrollIntoView({block:"nearest",inline:"nearest"});e.focus();' +
    'Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(e,"12");' +
    'e.dispatchEvent(new InputEvent("input",{bubbles:true,inputType:"insertText",data:"12"}));' +
    'return true;})()');
  if(!filled)throw new Error('Score could not be entered');
  await evalPage(c,'document.querySelector('+q(selector)+')?.blur()');
  await until(c,'saved synthetic 12-point result',
    'document.querySelector('+q(selector)+')?.value==="12"');
  const optionSelector='button[aria-label*="Spaltenoptionen"]';
  const openOptions=async ()=>{
    await click(c,optionSelector);
    await until(c,'assessment column options dialog',
      'Boolean(document.querySelector("#assessment-item-modal-content"))');
    await until(c,'existing 20-point maximum loaded',
      'Boolean(document.querySelector("#assessment-item-max-points-input"))');
  };
  await openOptions();
  const before=await evalPage(c,'document.querySelector("#assessment-item-max-points-input")?.value');
  if(before!=='20')throw new Error('Expected previously stored maximum 20, found '+before);
  console.log('PASS Reopened populated point-column options without blocking Chrome');

  // Changing the denominator must ask for confirmation. First reject safely.
  await fill(c,'Maximal erreichbare Punkte','24');
  await until(c,'new maximum is in editable form',
    'document.querySelector("#assessment-item-max-points-input")?.value==="24"');
  await click(c,'#btn-save-assessment-modal');
  await until(c,'rejected denominator change remains open',
    'Boolean(document.querySelector("#assessment-item-modal-content"))');
  if(c.confirmCount!==1 || c.unexpectedDialogs.length)
    throw new Error('Reject path lacks explicit native confirmation: '+JSON.stringify({count:c.confirmCount,unexpected:c.unexpectedDialogs}));
  await click(c,'#btn-cancel-assessment-modal');
  await until(c,'reject closes editor','!document.querySelector("#assessment-item-modal-content")');
  await openOptions();
  const unchanged=await evalPage(c,'document.querySelector("#assessment-item-max-points-input")?.value');
  if(unchanged!=='20')throw new Error('Rejected denominator change modified stored maximum: '+unchanged);
  console.log('PASS Rejecting the confirmation preserves saved maximum and existing points');

  // Accept the explicit warning: score must remain 12 and denominator become 24.
  await fill(c,'Maximal erreichbare Punkte','24');
  await until(c,'corrected denominator draft',
    'document.querySelector("#assessment-item-max-points-input")?.value==="24"');
  c.approveNextMax=true;
  await click(c,'#btn-save-assessment-modal');
  await until(c,'accepted denominator change closes editor',
    '!document.querySelector("#assessment-item-modal-content")');
  if(c.confirmCount!==2 || c.unexpectedDialogs.length)
    throw new Error('Accept path lacks explicit expected confirmation: '+JSON.stringify({count:c.confirmCount,unexpected:c.unexpectedDialogs}));
  if(await evalPage(c,'document.querySelector('+q(selector)+')?.value')!=='12')
    throw new Error('Existing 12-point score was overwritten');
  await openOptions();
  const accepted=await evalPage(c,'document.querySelector("#assessment-item-max-points-input")?.value');
  if(accepted!=='24')throw new Error('Accepted denominator did not persist: '+accepted);
  await click(c,'#btn-cancel-assessment-modal');
  await until(c,'editor closes after verification','!document.querySelector("#assessment-item-modal-content")');
  console.log('PASS Accepted point-scale change persists while original child score stays unchanged');

  // A saved 12-point result must make a reduction to 10 invalid.
  await openOptions();
  await fill(c,'Maximal erreichbare Punkte','10');
  await until(c,'lower draft visible',
    'document.querySelector("#assessment-item-max-points-input")?.value==="10"');
  await click(c,'#btn-save-assessment-modal');
  await until(c,'invalid scale keeps editor open',
    'Boolean(document.querySelector("#assessment-item-modal-content"))');
  if(c.exceededCount!==1||c.unexpectedDialogs.length)
    throw new Error('Too-small maximum did not show expected safeguard: '+JSON.stringify({alerts:c.exceededCount,unexpected:c.unexpectedDialogs}));
  await click(c,'#btn-cancel-assessment-modal');
  await openOptions();
  const finalMax=await evalPage(c,'document.querySelector("#assessment-item-max-points-input")?.value');
  if(finalMax!=='24')throw new Error('Invalid maximum overwrote saved maximum: '+finalMax);
  await click(c,'#btn-cancel-assessment-modal');
  console.log('PASS A maximum smaller than an existing result is blocked without data loss');
  console.log('PASS KLASSIO Issue #571 focused browser coverage completed');
} finally {
  c.close();
}
