import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DEFAULT_COCKPIT_BOARD_PAGE_ID,
  MAX_COCKPIT_BOARD_PAGES,
  createEmptyCockpitBoardLayout,
  createNextCockpitBoardPageId,
  getCockpitBoardPageStorageKey,
  normalizeCockpitActiveBoardPage,
  normalizeCockpitBoardPageIds,
} from "./cockpitBoardPages";

test("board pages keep legacy page one storage without migrating existing content", () => {
  assert.equal(DEFAULT_COCKPIT_BOARD_PAGE_ID, "page-1");
  assert.equal(getCockpitBoardPageStorageKey("class-1", "page-1"), "class-1");
  assert.equal(getCockpitBoardPageStorageKey("class-1", "page-2"), "class-1::page-2");
});

test("board page metadata is bounded and only falls back to page one when metadata is empty", () => {
  assert.deepEqual(normalizeCockpitBoardPageIds(undefined), ["page-1"]);
  assert.deepEqual(normalizeCockpitBoardPageIds(["page-2"]), ["page-2"]);
  assert.deepEqual(normalizeCockpitBoardPageIds(["bad", "page-1", "page-1", "page-3"]), ["page-1", "page-3"]);
  assert.deepEqual(normalizeCockpitBoardPageIds(["page-2", "page-3"]), ["page-2", "page-3"]);
  const many = Array.from({ length: 30 }, (_, index) => `page-${index + 1}`);
  assert.equal(normalizeCockpitBoardPageIds(many).length, MAX_COCKPIT_BOARD_PAGES);
  assert.equal(normalizeCockpitActiveBoardPage("page-9", ["page-1", "page-2"]), "page-1");
  assert.equal(createNextCockpitBoardPageId(["page-1", "page-2", "page-4"]), "page-3");
  assert.equal(createNextCockpitBoardPageId(["page-2", "page-3"]), "page-1");
});

test("new board pages hide widgets without mutating the source definitions", () => {
  const source = [{
    id: "widget-timer",
    type: "timer",
    x: 10,
    y: 10,
    w: 20,
    h: 20,
    visible: true,
    hasBeenOpened: true,
    settings: { example: true },
  }] as any;
  const empty = createEmptyCockpitBoardLayout(source);
  assert.equal(empty[0].visible, false);
  assert.equal(empty[0].hasBeenOpened, false);
  assert.equal(source[0].visible, true);
  assert.notEqual(empty[0].settings, source[0].settings);
});

test("page switches clear transient widget UI but keep page content isolated", () => {
  const surface = readFileSync("src/components/Unterrichtsmodus.tsx", "utf8");
  const switchStart = surface.indexOf("const switchCockpitBoardPage");
  const addStart = surface.indexOf("const addCockpitBoardPage");
  const duplicateStart = surface.indexOf("const duplicateActiveCockpitBoardPage", addStart);
  assert.ok(switchStart >= 0 && addStart > switchStart && duplicateStart > addStart);

  const switchHandler = surface.slice(switchStart, addStart);
  const addHandler = surface.slice(addStart, duplicateStart);
  for (const handler of [switchHandler, addHandler]) {
    assert.match(handler, /setMinimizedWidgetIds\(\[\]\)/);
    assert.match(handler, /setFocusOrder\(\[\]\)/);
    assert.match(handler, /setWidgetSettingsOpenId\(null\)/);
    assert.match(handler, /setBoardTool\("select"\)/);
    assert.match(handler, /setIsBoardTextEditing\(false\)/);
  }

  assert.match(switchHandler, /\[activeBoardPageId\]: currentLayout/);
  assert.match(switchHandler, /\[pageId\]: nextLayout/);
  assert.match(addHandler, /createEmptyCockpitBoardLayout\(DEFAULT_COCKPIT_LAYOUT\)/);
});

test("teacher cockpit exposes compact numbered page tabs and page-local board content", () => {
  const surface = readFileSync("src/components/Unterrichtsmodus.tsx", "utf8");
  assert.match(surface, /role="tablist" aria-label="Tafelseiten"/);
  assert.match(surface, /aria-label="Neue Tafelseite hinzufügen"/);
  assert.match(surface, /switchCockpitBoardPage\(pageId\)/);
  assert.match(surface, /addCockpitBoardPage/);
  assert.match(surface, /cockpitLayoutByBoardPage/);
  assert.match(surface, /cockpitActiveBoardPageByClass/);
  assert.match(surface, /boardPageStorageKey/);
  assert.match(surface, /key=\{boardPageStorageKey\}/);
});


test("board pages can be duplicated, safely deleted and visibly marked when they contain content", () => {
  const surface = readFileSync("src/components/Unterrichtsmodus.tsx", "utf8");

  assert.match(surface, /const boardPageHasContent = useCallback/);
  assert.match(surface, /const duplicateActiveCockpitBoardPage = useCallback/);
  assert.match(surface, /const deleteActiveCockpitBoardPage = useCallback/);
  assert.match(surface, /data-has-content=\{hasContent \? "true" : "false"\}/);
  assert.match(surface, /aria-label="Aktuelle Tafelseite verwalten"/);
  assert.match(surface, /Seite duplizieren/);
  assert.match(surface, /Wirklich löschen\?/);
  assert.match(surface, /boardPageIds\.length <= 1/);

  // Duplication includes the complete page-local teaching surface.
  assert.match(surface, /\[targetStorageKey\]: boardSettings\.cockpitTextByClass\?\.\[boardPageStorageKey\] \|\| ""/);
  assert.match(surface, /\[targetStorageKey\]: sourceInk/);
  assert.match(surface, /\[targetStorageKey\]: boardSettings\.cockpitPaperByClass\?\.\[boardPageStorageKey\] \|\| "blank"/);
  assert.match(surface, /\[pageId\]: duplicatedLayout/);

  // Deleting a page removes all page-local payloads rather than leaving hidden stale data.
  assert.match(surface, /delete nextLayouts\[activeBoardPageId\]/);
  assert.match(surface, /delete nextText\[boardPageStorageKey\]/);
  assert.match(surface, /delete nextInk\[boardPageStorageKey\]/);
  assert.match(surface, /delete nextPaper\[boardPageStorageKey\]/);
  assert.match(surface, /delete nextPaperSpacing\[boardPageStorageKey\]/);
});
