/**
 * Real Chrome mobile smoke test. Uses a throwaway local server, a fresh
 * vault and the explicitly selected demo class; reads only UI/layout.
 */
const BASE_URL = process.env.KLASSIO_E2E_BASE_URL || 'http://127.0.0.1:3100/login';
const DEBUG_URL = process.env.KLASSIO_CHROME_DEBUG_URL || 'http://127.0.0.1:9282';
const CODE = process.env.KLASSIO_E2E_ACCESS_CODE || 'ci-mobile-audit-access-2026';
const PASSWORD = 'Klassio-Only-Demo-Mobile-2026!';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const q = JSON.stringify;

class Client {
  constructor(url) { this.url=url; this.seq=0; this.pending=new Map(); }
  async connect() {
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url); this.ws=ws;
      ws.onopen=resolve; ws.onerror=reject;
      ws.onmessage=e=>{
        const m=JSON.parse(String(e.data)), p=this.pending.get(m.id);
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
  if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);
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
try{
  await c.send('Page.navigate',{url:BASE_URL});
  await until(c,'access screen','document.body?.textContent.toLowerCase().includes("geschützter zugang")');
  await fill(c,'Zugangscode',CODE);await clickText(c,'Klassio öffnen');
  await until(c,'demo vault setup','document.body?.textContent.toLowerCase().includes("tresor auf diesem gerät einrichten")');
  await fill(c,'Eigenes Tresor-Passwort',PASSWORD);await fill(c,'Passwort bestätigen',PASSWORD);
  await clickText(c,'Weiter zum Wiederherstellungscode');
  await until(c,'demo recovery screen','document.body?.textContent.toLowerCase().includes("dein einmaliger wiederherstellungscode")');
  const accepted=await evalPage(c,'(() => {const x=Array.from(document.querySelectorAll("label")).find(e=>e.textContent?.includes("Ich habe den Wiederherstellungscode sicher notiert"));const b=x?.querySelector("input[type=checkbox]");if(!b)return false;b.click();return b.checked;})()');
  if(!accepted)throw new Error('Recovery confirmation missing');
  await clickText(c,'Einrichtung abschließen');
  await until(c,'first-run setup','document.body?.textContent.toLowerCase().includes("willkommen bei klassio")');
  await clickText(c,'Beispielklasse erkunden');
  await until(c,'sample teacher dashboard','Array.from(document.querySelectorAll("button")).some(b=>b.textContent?.trim()==="Heute")');
  // The desktop sidebar intentionally hides secondary destinations under "Mehr".
  if(!await evalPage(c,'Boolean(document.querySelector("[data-menu-id=noten]"))')) {
    await click(c,'button[aria-label^="Mehr ("]');
  }
  await until(c,'gradebook available in sidebar','Boolean(document.querySelector("[data-menu-id=noten]"))');
  await click(c,'[data-menu-id="noten"]');
  await until(c,'real gradebook table','Boolean(document.querySelector("[data-gradebook-scroll-container]"))');
  // Set up an assessment through the actual Gradebook UI in this disposable demo vault.
  // Unlike a CSS probe, these rows exercise input validation, committing and readback.
  const initiallyEmpty = await evalPage(c,
    'document.querySelectorAll("[data-gradebook-scroll-container] input[data-col]").length === 0');
  if (!initiallyEmpty) throw new Error('Expected a fresh demo gradebook without assessments');
  await click(c,'#gradebook-add-assessment-trigger');
  await until(c,'assessment chooser','Boolean(document.querySelector("#gradebook-add-assessment-menu"))');
  const canLzk = await evalPage(c,
    'Boolean(document.querySelector("#gradebook-add-assessment-menu button[aria-label=\"Lernzielkontrolle für die Klasse anlegen\"]:not(:disabled)"))');
  if (canLzk) {
    await click(c,'#gradebook-add-assessment-menu button[aria-label="Lernzielkontrolle für die Klasse anlegen"]');
  } else {
    await clickText(c,'Sonstige Leistung / bewertete HÜ');
  }
  await until(c,'assessment item editor','Boolean(document.querySelector("#assessment-item-modal-content"))');
  await fill(c,'Bezeichnung / Titel','Mobile Demo-Bewertung');
  await click(c,'#btn-save-assessment-modal');
  await until(c,'new visible editable grade column',
    'document.querySelectorAll("[data-gradebook-scroll-container] input[data-col]:not(:disabled)").length >= 2');
  const gradeCellInfo=await evalPage(c,'(() => {' +
    'const a=Array.from(document.querySelectorAll("[data-gradebook-scroll-container] input[data-col]:not(:disabled)"));' +
    'return a.slice(0,2).map(x=>({label:x.getAttribute("aria-label"),column:x.getAttribute("data-col")}));})()');
  if(gradeCellInfo.length!==2 || !gradeCellInfo.every(c=>c.label&&c.column) ||
      gradeCellInfo[0].label===gradeCellInfo[1].label)
    throw new Error('New assessment does not have two distinct editable child rows');
  console.log('PASS Created a genuine named assessment for two synthetic pupils');
  await usePhone(c);
  await until(c,'390px mobile gradebook','document.documentElement.clientWidth === 390');
  const grades=await evalPage(c,'(() => {'+
    'const area=document.querySelector("[data-gradebook-scroll-container]");' +
    'const cells=Array.from(area.querySelectorAll("input[data-col]:not(:disabled)")).filter(e=>e.getClientRects().length>0);' +
    'const input=cells[0];' +
    'const arrows=Array.from(document.querySelectorAll("[data-gradebook-scroll-controls] button"));' +
    'return {width:document.documentElement.clientWidth,coarse:matchMedia("(pointer: coarse)").matches,' +
    'scrollWidth:area.scrollWidth,clientWidth:area.clientWidth,inputCount:cells.length,' +
    'inputSource:"real populated assessment input",' +
    'inputHeight:input?.getBoundingClientRect().height,inputWidth:input?.getBoundingClientRect().width,' +
    'inputFont:input?parseFloat(getComputedStyle(input).fontSize):null,' +
    'buttons:arrows.map(e=>({height:e.getBoundingClientRect().height,width:e.getBoundingClientRect().width})),' +
    'sticky:getComputedStyle(area.querySelector("tbody td:nth-child(2)")).position};})()');
  console.log('Gradebook mobile metrics:',JSON.stringify(grades));
  if(!grades.coarse)throw new Error('Chrome did not emulate coarse pointer: touch sizes not verified');
  if(!grades.inputCount||grades.inputHeight<43||grades.inputWidth<43||grades.inputFont<15.9)
    throw new Error('Grade input is not readable/finger-sized on phone');
  if(grades.buttons.some(b=>b.height<43||b.width<43))throw new Error('Gradebook scroll buttons too small');
  if(grades.sticky!=='sticky')throw new Error('Student names no longer sticky');
  if(grades.scrollWidth<=grades.clientWidth)throw new Error('Expected scrollable mobile gradebook table');
  console.log('PASS Real populated grade inputs on 390px phone: 44px target, 16px font, sticky names');
  const enterGrade=async (label,value)=>{
    const selector='[data-gradebook-scroll-container] input[data-col][aria-label='+q(label)+']';
    const inputExpr='(() => {const e=document.querySelector('+q(selector)+');if(!e)return false;' +
      'e.scrollIntoView({block:"nearest",inline:"nearest"});e.focus();' +
      'Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(e,'+q(value)+');' +
      'e.dispatchEvent(new InputEvent("input",{bubbles:true,inputType:"insertText",data:'+q(value)+'}));' +
      'return true;})()';
    if(!await evalPage(c,inputExpr))throw new Error('Cannot type into '+label);
    await sleep(150);
    await evalPage(c,'document.querySelector('+q(selector)+')?.blur()');
    await until(c,'visible grade '+value+' in '+label,
      'document.querySelector('+q(selector)+')?.value==='+q(value));
  };
  await enterGrade(gradeCellInfo[0].label,'2');
  await enterGrade(gradeCellInfo[1].label,'4');
  // Force a React unmount/remount by changing the subject, not by editing app state.
  const originalSubject=await evalPage(c,'document.querySelector("#gradebook-active-subject")?.value');
  const otherSubject=await evalPage(c,'(() => {const s=document.querySelector("#gradebook-active-subject");return Array.from(s.options).find(o=>o.value&&o.value!==s.value)?.value})()');
  if(!otherSubject)throw new Error('Demo lacks a second subject for isolation and persistence checks');
  const chooseSubject=async val=>{
    const expr='(() => {const s=document.querySelector("#gradebook-active-subject");' +
      'Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value").set.call(s,'+q(val)+');' +
      's.dispatchEvent(new Event("change",{bubbles:true}));return true;})()';
    await evalPage(c,expr);
    await until(c,'subject selected '+val,'document.querySelector("#gradebook-active-subject")?.value==='+q(val));
  };
  await chooseSubject(otherSubject);
  await until(c,'other subject has no demo grade entry',
    '!Array.from(document.querySelectorAll("[data-gradebook-scroll-container] input[data-col]")).some(e=>e.value==="2"||e.value==="4")');
  await chooseSubject(originalSubject);
  await until(c,'both saved demo grades reappear',
    '(() => {const f=Array.from(document.querySelectorAll("[data-gradebook-scroll-container] input[data-col]"));return f.some(x=>x.getAttribute("aria-label")==='+q(gradeCellInfo[0].label)+'&&x.value==="2")&&f.some(x=>x.getAttribute("aria-label")==='+q(gradeCellInfo[1].label)+'&&x.value==="4");})()');
  console.log('PASS Two real 1–5 grades committed and survive switching subjects without cross-subject leakage');

  // Switch back to desktop to use the regular sidebar, then return to phone
  // for layout assertions inside the same student's dossier.
  await c.send('Emulation.setTouchEmulationEnabled',{enabled:false});
  await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:980,deviceScaleFactor:1,mobile:false});
  await click(c,'[data-menu-id="kel"]');
  await until(c,'KEL portal','Boolean(document.querySelector("[data-kel-shared-dossier-portal]"))');
  const first=await evalPage(c,'Array.from(document.querySelectorAll("button[aria-label]")).find(b=>b.getAttribute("aria-label")?.startsWith("Schülerdossier und KEL für"))?.getAttribute("aria-label")');
  if(!first)throw new Error('Demo dossier entry not found');
  await click(c,'button[aria-label^="Schülerdossier und KEL für"]');
  await until(c,'dossier main tabs','Boolean(document.querySelector("[data-student-dossier-areas] [role=tablist]"))');
  await usePhone(c);
  const dossier=await evalPage(c,'(() => {const list=document.querySelector("[data-student-dossier-areas] [role=tablist]");' +
    'const hint=document.querySelector("[data-dossier-mobile-nav-hint]");const parent=list.closest(".flex-1");' +
    'const initial=list.scrollLeft;list.scrollLeft=list.scrollWidth;return {' +
    'width:document.documentElement.clientWidth,hint:hint?.textContent.trim(),hintVisible:hint?.getClientRects().length>0,' +
    'overflow:parent?getComputedStyle(parent).overflow:null,tabIndex:list.tabIndex,' +
    'contentWidth:list.scrollWidth,availableWidth:list.clientWidth,scrollLeft:list.scrollLeft,' +
    'tabCount:list.querySelectorAll("button[role=tab]").length,' +
    'smallTargets:Array.from(list.querySelectorAll("button")).filter(x=>x.getBoundingClientRect().height<43).length};})()');
  console.log('Dossier mobile metrics:',JSON.stringify(dossier));
  if(!dossier.hintVisible || !dossier.hint.includes('seitlich wischen'))
    throw new Error('Mobile dossier navigation cue is missing');
  if(dossier.overflow!=='visible')throw new Error('Mobile dossier container clips tab content');
  if(dossier.tabIndex!==0 || dossier.tabCount<3)
    throw new Error('Dossier tablist cannot be focused or lost sections');
  if(dossier.contentWidth>dossier.availableWidth+3 && dossier.scrollLeft<3)
    throw new Error('Dossier horizontal navigation is not scrollable');
  if(dossier.smallTargets)throw new Error('Dossier tab touch targets below 44px');
  console.log('PASS Dossier phone tab scrolling, visible cue and unclipped content');
}finally{c.close();}
