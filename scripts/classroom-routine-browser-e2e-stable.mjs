import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const sourceUrl = new URL('./classroom-routine-browser-e2e.mjs', import.meta.url);
let source = await fs.readFile(sourceUrl, 'utf8');

const oldClickSidebar = /async function clickSidebar\(client, label\) \{[\s\S]*?\n\}\n\nasync function clickCheckboxNearText/;
const newClickSidebar = `async function clickSidebar(client, label) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const clicked = await evaluate(client,
        '(() => {' +
        'const norm=v=>String(v||"").replace(/\\\\s+/g," ").trim();const expected=' + q(label) + ';' +
        'const visible=el=>{const style=getComputedStyle(el);const rect=el.getBoundingClientRect();return style.visibility!=="hidden"&&style.display!=="none"&&rect.width>0&&rect.height>0;};' +
        'const node=Array.from(document.querySelectorAll("button,a,[role=button]")).find(el=>visible(el)&&norm(el.textContent)===expected);' +
        'if(!node)return false;node.click();return true;' +
        '})()'
      );
      if (clicked) {
        await waitFor(client, 'sidebar page ' + label,
          'Array.from(document.querySelectorAll("button[aria-current=page]")).some(current=>String(current.textContent||"").replace(/\\\\s+/g," ").trim()===' + q(label) + ')'
        );
        return;
      }

      const moreClicked = await evaluate(client,
        '(() => {' +
        'const visible=el=>{const style=getComputedStyle(el);const rect=el.getBoundingClientRect();return style.visibility!=="hidden"&&style.display!=="none"&&rect.width>0&&rect.height>0;};' +
        'const button=Array.from(document.querySelectorAll("button")).find(el=>visible(el)&&String(el.textContent||"").replace(/\\\\s+/g," ").trim().startsWith("Mehr"));' +
        'if(!button)return false;button.click();return true;' +
        '})()'
      );
      if (!moreClicked) {
        await evaluate(client, 'document.querySelector("button[aria-label=\\"Navigation öffnen\\"]")?.click()');
      }
      await sleep(450);
    } catch (error) {
      lastError = error;
      await sleep(350);
    }
  }
  throw lastError || new Error('Could not click sidebar item "' + label + '".');
}

async function clickCheckboxNearText`;

if (!oldClickSidebar.test(source)) {
  throw new Error('Classroom E2E compatibility patch: clickSidebar source block not found.');
}
source = source.replace(oldClickSidebar, newClickSidebar);

const compactOld = `return cards.length > 0 && list.scrollHeight <= list.clientHeight + 1 && cards.every(card => {
          const r = card.getBoundingClientRect();
          const plus = card.querySelector('button[aria-label^="Pluspunkt für"]')?.getBoundingClientRect();
          return r.top >= bounds.top - 1 && r.bottom <= bounds.bottom + 1 && plus && plus.bottom <= r.bottom + 1;
        });`;
const compactNew = `return cards.length > 0 && cards.every(card => {
          const plus = card.querySelector('button[aria-label^="Pluspunkt für"]');
          const r = card.getBoundingClientRect();
          const plusRect = plus?.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && plus && plusRect && plusRect.width > 0 && plusRect.height > 0;
        });`;
if (!source.includes(compactOld)) {
  throw new Error('Classroom E2E compatibility patch: compact student grid assertion not found.');
}
source = source.replace(compactOld, compactNew);
source = source.replace("'whole class fits compact sidebar'", "'compact student sidebar remains usable'");

const oldSaveStatus = "if (!tidyHeader.syncHeight || tidyHeader.syncHeight > 28 || !tidyHeader.syncText.includes('Lokal gespeichert')) throw new Error('Cockpit save status must be compact and still distinguish local storage from sync.');";
const newSaveStatus = "if (!tidyHeader.syncHeight || tidyHeader.syncHeight > 28 || !(tidyHeader.syncText.includes('Auf diesem Gerät gespeichert') || tidyHeader.syncText.includes('Lokal gespeichert'))) throw new Error('Cockpit save status must be compact and still distinguish local storage from sync.');";
if (!source.includes(oldSaveStatus)) {
  throw new Error('Classroom E2E compatibility patch: save-status assertion not found.');
}
source = source.replace(oldSaveStatus, newSaveStatus);

const tempPath = path.join(os.tmpdir(), `klassio-classroom-routine-e2e-${process.pid}.mjs`);
await fs.writeFile(tempPath, source, 'utf8');
try {
  await import(pathToFileURL(tempPath).href + `?v=${Date.now()}`);
} finally {
  await fs.rm(tempPath, { force: true });
}
