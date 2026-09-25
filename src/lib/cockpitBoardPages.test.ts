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

test("board page metadata is bounded, unique and always has page one fallback", () => {
  assert.deepEqual(normalizeCockpitBoardPageIds(undefined), ["page-1"]);
  assert.deepEqual(normalizeCockpitBoardPageIds(["bad", "page-1", "page-1", "page-3"]), ["page-1", "page-3"]);
  const many = Array.from({ length: 30 }, (_, index) => `page-${index + 1}`);
  assert.equal(normalizeCockpitBoardPageIds(many).length, MAX_COCKPIT_BOARD_PAGES);
  assert.equal(normalizeCockpitActiveBoardPage("page-9", ["page-1", "page-2"]), "page-1");
  assert.equal(createNextCockpitBoardPageId(["page-1", "page-2", "page-4"]), "page-3");
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
