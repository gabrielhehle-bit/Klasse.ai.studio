import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldApplyTafelCommand } from './tafelCommands';
const command = { id: 'new', classId: 'a', open: true, createdAt: 2000 };
test('stored flag without a command never opens the board', () => {
  assert.equal(shouldApplyTafelCommand(undefined, 'a', 1000, undefined, 2000), false);
});
test('new live command applies only once and only to the active classroom', () => {
  assert.equal(shouldApplyTafelCommand(command, 'a', 1000, 'old', 2000), true);
  assert.equal(shouldApplyTafelCommand(command, 'a', 1000, 'new', 2000), false);
  assert.equal(shouldApplyTafelCommand(command, 'b', 1000, 'old', 2000), false);
});
test('commands predating entry, expired commands and invalid future times are ignored', () => {
  assert.equal(shouldApplyTafelCommand(command, 'a', 3000, undefined, 4000), false);
  assert.equal(shouldApplyTafelCommand(command, 'a', 1000, undefined, 33000), false);
  assert.equal(shouldApplyTafelCommand({...command, createdAt: 99999}, 'a', 1000, undefined, 2000), false);
});
test('explicit close commands remain supported', () => {
  assert.equal(shouldApplyTafelCommand({...command, open: false}, 'a', 1000, undefined, 2000), true);
});
