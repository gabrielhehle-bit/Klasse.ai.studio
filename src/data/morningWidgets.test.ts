import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_MORNING_WIDGETS } from './morningWidgets';

test('morning widget catalog has unique ids and no editorial leftovers', () => {
  const ids = DEFAULT_MORNING_WIDGETS.map(widget => widget.id);
  assert.equal(new Set(ids).size, ids.length);

  const editorialMarker = /oh wait|lass uns|besser:/i;
  for (const widget of DEFAULT_MORNING_WIDGETS) {
    assert.ok(widget.frage.trim().length > 0, `Leere Frage bei ${widget.id}`);
    assert.ok(widget.loesung.trim().length > 0, `Leere Lösung bei ${widget.id}`);
    assert.equal(
      editorialMarker.test(`${widget.frage} ${widget.loesung}`),
      false,
      `Redaktionsrest bei ${widget.id}`
    );
  }
});
