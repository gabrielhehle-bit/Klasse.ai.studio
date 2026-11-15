/**
 * Real Chrome mobile smoke test. Uses a throwaway local server, a fresh
 * vault and the explicitly selected demo class; reads only UI/layout.
 */
import fs from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

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
  const lzkSelector='#gradebook-add-assessment-menu button[aria-label="Lernzielkontrolle für die Klasse anlegen"]:not(:disabled)';
  const canLzk = await evalPage(c, 'Boolean(document.querySelector('+q(lzkSelector)+'))');
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

  // Create eight distinct dated pupil assessments via the real Dossier form.
  // No direct AppContext or persisted-vault injection is involved.
  const selectedSubjectCard = await evalPage(c, '(() => {' +
    'const button=Array.from(document.querySelectorAll("[data-dossier-subject-grid] button")).find(b=>' +
    'b.textContent?.includes('+q(originalSubject)+'));if(!button)return false;button.click();return true;})()');
  if(!selectedSubjectCard)throw new Error('No visible Dossier subject card for '+originalSubject);
  await until(c,'Dossier subject assessment editor available',
    'Boolean(document.querySelector("[data-dossier-performance-header]"))');
  const values=['4','3','3','1','1','2','2','2'];
  const dates=['2026-09-02','2026-09-20','2026-10-01','2026-10-15',
    '2026-10-28','2026-11-03','2026-11-10','2026-11-12'];
  const setField=async(sel,val)=>{
    const expr='(() => {const el=document.querySelector('+q(sel)+');if(!el)return false;' +
      'const proto=el instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;' +
      'Object.getOwnPropertyDescriptor(proto,"value").set.call(el,'+q(val)+');' +
      'el.dispatchEvent(new Event("input",{bubbles:true}));' +
      'el.dispatchEvent(new Event("change",{bubbles:true}));return true;})()';
    if(!await evalPage(c,expr))throw new Error('Cannot fill assessment '+sel);
  };
  for(let i=0;i<dates.length;i++){
    await clickText(c,'Leistungsnachweis eintragen');
    await until(c,'assessment editor '+i,'Boolean(document.querySelector("[data-dossier-assessment-editor]"))');
    await setField('[data-dossier-assessment-category]','lzk');
    await setField('[data-dossier-assessment-title]','Mobiltest '+String(i+1).padStart(2,'0'));
    await setField('[data-dossier-assessment-date]',dates[i]);
    await setField('[data-dossier-assessment-grade]',values[i]);
    await click(c,'[data-dossier-assessment-save]');
    await until(c,'assessment saved '+(i+1),
      '!document.querySelector("[data-dossier-assessment-editor]") && ' +
      'document.querySelectorAll("[data-assessment-row]").length >= '+(i+1));
  }
  await until(c,'actual dated chart has multiple points',
    'Number(document.querySelector("[data-dossier-assessment-chart] span")?.textContent.match(/\\d+/)?.[0]||0)>=8');
  await c.send('Emulation.setDeviceMetricsOverride',
    {width:360,height:780,deviceScaleFactor:1,mobile:true});
  await sleep(500);
  await until(c,'assessment SVG rendered at 360px',
    'Boolean(document.querySelector("[data-dossier-assessment-scroll] svg.recharts-surface"))');
  const chartMetrics=await evalPage(c,'(() => {' +
    'const sc=document.querySelector("[data-dossier-assessment-scroll]");' +
    'const plot= document.querySelector("[data-dossier-assessment-chart-plot]");' +
    'const svg=plot.querySelector("svg.recharts-surface");' +
    'const dots=svg.querySelectorAll(".recharts-line-dots circle").length;' +
    'const x=svg.querySelectorAll(".recharts-xAxis .recharts-cartesian-axis-tick").length;' +
    'const pane=sc.getBoundingClientRect();sc.scrollLeft=sc.scrollWidth;return {' +
    'screen:document.documentElement.clientWidth,scrollWidth:sc.scrollWidth,' +
    'clientWidth:sc.clientWidth,scrollLeft:sc.scrollLeft,' +
    'plotWidth:plot.getBoundingClientRect().width,plotHeight:plot.getBoundingClientRect().height,' +
    'paneRight:pane.right,dots,x};})()');
  console.log('Dossier 360px dated assessment chart metrics:',JSON.stringify(chartMetrics));
  if(chartMetrics.screen!==360||chartMetrics.dots<8||chartMetrics.x<3||
    chartMetrics.plotWidth<620||chartMetrics.plotHeight<200||
    chartMetrics.scrollWidth<=chartMetrics.clientWidth+80||chartMetrics.scrollLeft<80||
    chartMetrics.paneRight>chartMetrics.screen+2)
    throw new Error('Dated assessment chart clipped or unreadable on 360px phone');
  console.log('PASS 8 real dated grade observations in a horizontally readable 360px chart');

  await click(c,'[data-student-dossier-areas] button[role="tab"]:first-child');
  await until(c,'Dossier overview returns','Boolean(document.querySelector("[data-dossier-overview]"))');
  await click(c,'[aria-label="Zeitraum der Alltagsdiagramme"] button:last-child');
  await until(c,'year view selected',
    'document.querySelector("[aria-label=\\\"Zeitraum der Alltagsdiagramme\\\"] button:last-child")?.getAttribute("aria-pressed")==="true"');
  const yearGraphs=await evalPage(c,'(() => [' +
    '"participation","wellbeing"].map(name=>{' +
    'const el=document.querySelector("[data-dossier-trend-scroll="+JSON.stringify(name)+"]");' +
    'if(!el)return {name,error:"missing"};' +
    'const plot=el.firstElementChild;el.scrollLeft=el.scrollWidth;' +
    'return {name,client:el.clientWidth,scroll:el.scrollWidth,' +
    'scrollLeft:el.scrollLeft,plot:plot.getBoundingClientRect().width,' +
    'right:el.getBoundingClientRect().right};' +
    '}) )()');
  console.log('Dossier 360px school-year timelines:',JSON.stringify(yearGraphs));
  const moodGraph=yearGraphs.find(g=>g.name==='wellbeing');
  const participationGraph=yearGraphs.find(g=>g.name==='participation');
  // In November the current school year has only four monthly buckets.
  // Its compact participation chart should NOT be artificially widened.
  if(!moodGraph || !participationGraph ||
    yearGraphs.some(g=>g.error || g.right>362) ||
    moodGraph.scroll<=moodGraph.client+40 || moodGraph.scrollLeft<40 ||
    participationGraph.scroll<participationGraph.client-2)
    throw new Error('School-year timelines are clipped or not appropriately sized on phone');
  console.log('PASS School-year weekly development timeline scrolls while short monthly history stays compact');


  // Full UI check: six child moods are entered via Attendance's real date and
  // dropdown controls, then six daily statuses via the Dossier's own editor.
  // All changes belong to the CI-only demo vault, never to school accounts.
  await c.send('Emulation.setTouchEmulationEnabled',{enabled:false});
  await c.send('Emulation.setDeviceMetricsOverride',
    {width:1440,height:980,deviceScaleFactor:1,mobile:false});
  const pupilName=first.replace(/^Schülerdossier und KEL für /,'').replace(/ öffnen$/,'');
  if(!pupilName)throw new Error('Cannot resolve selected synthetic pupil from KEL button');
  const controlChange=async (selector,value)=>{
    const expression='(() => {const el=document.querySelector('+q(selector)+');' +
      'if(!el)return false;const p=el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;' +
      'Object.getOwnPropertyDescriptor(p,"value").set.call(el,'+q(value)+');' +
      'el.dispatchEvent(new Event("input",{bubbles:true}));' +
      'el.dispatchEvent(new Event("change",{bubbles:true}));return true;})()';
    if(!await evalPage(c,expression))throw new Error('UI control not found: '+selector);
  };
  const datedMoods=[
    ['2026-10-05','5'],['2026-10-12','4'],['2026-10-19','3'],
    ['2026-10-23','2'],['2026-11-03','1'],['2026-11-09','2']
  ];
  await click(c,'[data-menu-id="anwesenheit"]');
  const pupilMoodSelector='select[aria-label='+q('Befinden für '+pupilName)+']';
  await until(c,'Attendance mood editor',
    'Boolean(document.querySelector("[aria-label=Anwesenheitsdatum]")) && ' +
    'Boolean(document.querySelector('+q(pupilMoodSelector)+'))');
  for(const [day,value] of datedMoods){
    await controlChange('input[aria-label="Anwesenheitsdatum"]',day);
    await until(c,'selected attendance day '+day,
      'document.querySelector("[aria-label=Anwesenheitsdatum]")?.value==='+q(day));
    await sleep(100); // Allow the school-calendar-dependent pupil rows to rerender.
    await until(c,'mood selector available on school day '+day,
      'Boolean(document.querySelector('+q(pupilMoodSelector)+'))');
    await controlChange(pupilMoodSelector,value);
    await until(c,'mood '+value+' saved on '+day,
      'document.querySelector('+q(pupilMoodSelector)+')?.value==='+q(value));
  }
  // Revisiting an earlier day forces a fresh read of the date-specific value.
  await controlChange('input[aria-label="Anwesenheitsdatum"]',datedMoods[0][0]);
  await until(c,'first mood persisted after changing the day',
    'document.querySelector('+q(pupilMoodSelector)+')?.value==='+q(datedMoods[0][1]));
  console.log('PASS Six real dated child-mood selections entered in Attendance');

  await click(c,'[data-menu-id="kel"]');
  await until(c,'KEL portal reopened for selected synthetic pupil',
    'Boolean(document.querySelector("[data-kel-shared-dossier-portal]"))');
  await click(c,'button[aria-label='+q(first)+']');
  await until(c,'Dossier reopened for child','Boolean(document.querySelector("[data-student-dossier-areas]"))');
  await click(c,'[data-student-dossier-areas] button[role="tab"]:nth-child(3)');
  await until(c,'observation charts from pupil records',
    'Boolean(document.querySelector("[data-dossier-observation-charts]"))');
  await until(c,'six mood records in observations',
    'document.querySelector("[data-observation-mood]")?.textContent.includes("6 Rückmeldungen")');

  const stageIds=['3','4','2','1','2','3'];
  const behaviorDates=datedMoods.map(x=>x[0]);
  for(let i=0;i<behaviorDates.length;i++){
    await controlChange('[data-observation-behavior-date]',behaviorDates[i]);
    await controlChange('[data-observation-behavior-stage]',stageIds[i]);
    await click(c,'[data-observation-behavior-save]');
    await until(c,'daily behavior record '+(i+1),
      'document.querySelector("[data-observation-behavior]")?.textContent.includes('+
      q((i+1)+' erfasste Tage')+')');
  }
  // Recording a revised status for one day changes only the visible daily
  // summary, while the previous event remains in the history.
  await controlChange('[data-observation-behavior-date]',behaviorDates.at(-1));
  await controlChange('[data-observation-behavior-stage]','4');
  await sleep(120);
  const selectedStage=await evalPage(c,
    'document.querySelector("[data-observation-behavior-stage]")?.value');
  if(selectedStage!=='4')throw new Error('Teacher selection did not retain behavior stage 4');
  await click(c,'[data-observation-behavior-save]');
  await until(c,'one displayed behavior per calendar day',
    'document.querySelector("[data-observation-behavior]")?.textContent.includes("6 erfasste Tage")');
  const behaviorDisplay=await evalPage(c,'(() => ({' +
    'selected:document.querySelector("[data-observation-behavior-stage]")?.value,' +
    'current:document.querySelector("[data-observation-behavior]")?.getAttribute("data-observation-latest-stage"),' +
    'summary:document.querySelector("[data-observation-behavior] p.font-semibold")?.textContent' +
    '}) )()');
  console.log('Dossier corrected daily behavior stage:',JSON.stringify(behaviorDisplay));
  await until(c,'revised daily behavior stage displayed',
    'document.querySelector("[data-observation-behavior]")?.getAttribute("data-observation-latest-stage")==="4"');

  await c.send('Emulation.setDeviceMetricsOverride',
    {width:360,height:780,deviceScaleFactor:1,mobile:true});
  await c.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await click(c,'[aria-label="Beobachtungszeitraum"] button:last-child');
  await until(c,'observation school-year selected',
    'document.querySelector("[aria-label=Beobachtungszeitraum] button:last-child")?.getAttribute("aria-pressed")==="true"');
  await until(c,'dated mood SVG rendered on a phone',
    'Boolean(document.querySelector("[data-observation-chart-scroll=mood] svg.recharts-surface"))');
  const metrics=await evalPage(c,'(() => ["behavior","mood"].map(name=>{' +
    'const scroll=document.querySelector("[data-observation-chart-scroll="+JSON.stringify(name)+"]");' +
    'const svg=scroll?.querySelector("svg.recharts-surface");' +
    'if(!scroll||!svg)return {name,error:"missing"};' +
    'scroll.scrollLeft=scroll.scrollWidth;' +
    'return {name,width:scroll.clientWidth,total:scroll.scrollWidth,left:scroll.scrollLeft,' +
    'right:scroll.getBoundingClientRect().right,' +
    'points:svg.querySelectorAll(".recharts-line-dots circle").length,' +
    'bars:svg.querySelectorAll(".recharts-rectangle").length};}) )()');
  console.log('Dossier real mood and behavior charts at 360px:',JSON.stringify(metrics));
  if(metrics.some(m=>m.error||m.total<=m.width+100||m.left<100||m.right>362) ||
     metrics.find(m=>m.name==='mood')?.points<5 ||
     metrics.find(m=>m.name==='behavior')?.bars<6)
    throw new Error('Recorded child mood or behavior chart is unreadable at 360px');
  console.log('PASS 6 mood dates aggregate to 5 weekly chart points and 6 behavior days at 360px');
  console.log('Preparing parent A4 trend verification');
  await c.send('Emulation.setTouchEmulationEnabled',{enabled:false});
  await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:980,deviceScaleFactor:1,mobile:false});
  await clickText(c,'Druckzentrum');
  await until(c,'Druckzentrum after recorded observations','document.body?.textContent.includes("DRUCKZENTRUM")');
  await clickText(c,'KEL-Elternblatt');
  await until(c,'parent report controls','Boolean(document.querySelector("[data-kel-parent-report-controls]"))');
  const reportStudentId=await evalPage(c,'(() => {const text='+q(pupilName.split(' ').reverse().join(' '))+';' +
    'const option=Array.from(document.querySelector("#kel-parent-student")?.options||[]).find(o=>o.textContent?.trim()===text);return option?.value||null;})()');
  if(!reportStudentId)throw new Error('Synthetic pupil missing from KEL parent selector');
  await controlChange('#kel-parent-student',reportStudentId);
  await controlChange('#kel-parent-period','recent');

  await until(c,'recorded pupil loaded in parent print',
    'document.querySelector(".print-center-overlay [data-kel-parent-report]")?.getAttribute("data-kel-parent-student-id")==='+q(reportStudentId));
  for(const kind of ['mood','behavior']){
    const coverage='[data-kel-trend-coverage='+kind+']';
    await until(c,'documented '+kind+' periods explained',
      'document.querySelector(".print-center-overlay '+coverage+'")?.textContent.includes("5 von 6 Wochen")');
    const chart=await evalPage(c,'(() => {const root=document.querySelector(".print-center-overlay [data-kel-parent-report]");' +
      'const box=root?.querySelector("[data-kel-trend='+kind+']");const svg=box?.querySelector("svg");' +
      'return {coverage:box?.querySelector("[data-kel-trend-coverage]")?.textContent.trim(),' +
      'svg:!!svg,ratio:svg?.getAttribute("preserveAspectRatio"),width:svg?.getBoundingClientRect().width,' +
      'height:svg?.getBoundingClientRect().height};})()');
    console.log('KEL parent chart '+kind+':',JSON.stringify(chart));
    if(!chart.svg||chart.ratio!=='xMidYMid meet')
      throw new Error('KEL parent '+kind+' trend chart is not printable/readable');
  }
  console.log('PASS Both KEL parent timelines distinguish 5 documented of 6 available weeks');

  await evalPage(c,'document.body.classList.add("print-center-active","print-center-kel-parent-active")');
  await c.send('Emulation.setEmulatedMedia',{media:'print'});
  const printMetrics=await evalPage(c,'(() => {const root=document.querySelector(".print-center-overlay [data-kel-parent-report]");' +
    'return ["mood","behavior"].map(kind=>{const chart=root?.querySelector("[data-kel-trend="+kind+"]");' +
    'const svg=chart?.querySelector("svg");const r=svg?.getBoundingClientRect();return {kind,width:r?.width,height:r?.height,' +
    'sheetRight:root?.getBoundingClientRect().right,chartRight:chart?.getBoundingClientRect().right};});})()');
  console.log('KEL charts in actual A4 print media:',JSON.stringify(printMetrics));
  if(printMetrics.some(m=>!m.width||m.width<200||!m.height||m.height<40||m.chartRight>m.sheetRight+2))
    throw new Error('KEL parent trend chart clipped in A4 print media');
  const output=await c.send('Page.printToPDF',{printBackground:true,preferCSSPageSize:true});
  const bytes=new Uint8Array(Buffer.from(output.data,'base64'));
  await fs.writeFile('/tmp/klassio-kel-trends-a4.pdf',bytes);
  const document=await getDocument({data:bytes,useSystemFonts:true,disableFontFace:true}).promise;
  const pages=[];
  for(let pageNo=1;pageNo<=document.numPages;pageNo++){
    const page=await document.getPage(pageNo);
    pages.push((await page.getTextContent()).items.map(item=>'str' in item?item.str:'').join(' '));
  }
  const printed=pages.join(' ');

  console.log('Populated KEL A4 PDF diagnostic:',JSON.stringify({
    pages:document.numPages,
    mood:printed.includes('Befinden im Zeitverlauf'),
    behavior:printed.includes('Dokumentation im Zeitverlauf'),
    coverage:printed.includes('5 von 6 Wochen'),
    guardians:printed.includes('Erziehungsberechtigte'),
    teacher:printed.includes('Lehrperson'),
    blank:pages.map(p=>!p.trim()),
    excerpt:printed.slice(0,800)
  }));

  if(!printed.includes('Befinden im Zeitverlauf') ||
    !printed.includes('Dokumentation im Zeitverlauf') ||
    !printed.includes('5 von 6 Wochen') ||
    !printed.includes('Erziehungsberechtigte') ||
    !printed.includes('Lehrperson') ||
    pages.some(text=>!text.trim()) ||
    document.numPages>3)
    throw new Error('KEL A4 PDF lacks chart coverage, signature boxes or readable pages');
  if(!pages.some(text=>text.includes('Befinden im Zeitverlauf')&&text.includes('Dokumentation im Zeitverlauf')))
    throw new Error('KEL mood and behavior chart panels split across pages');
  console.log('PASS Real populated KEL A4 PDF retains both trends, honest coverage and signatures');



}finally{c.close();}
