import test from 'node:test';
import assert from 'node:assert/strict';
import { createVault } from './vaultService';
import { encryptData } from './crypto';
import { verifyRecoveryCodeReadOnly } from './recoveryCodeCheck';

test('read-only recovery check validates the current cloud snapshot without sending the code', async () => {
  const { vaultRecord, vaultKey, recoveryCode } = await createVault('KLASSIO-Test-Vault-2026!');
  const encryptedState = await encryptData({
    classes: [{ id: 'synthetic-established-class', schueler: [] }],
    schueler: [],
    wochenplanung: {},
  }, vaultKey);
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return Response.json({ snapshot: { vaultRecord, encryptedState, revision: 7, updatedAt: new Date().toISOString() } });
  };

  try {
    const result = await verifyRecoveryCodeReadOnly(recoveryCode);
    assert.equal(result.hasEstablishedClassroom, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, '/api/account-sync');
    assert.equal(calls[0].init?.method ?? 'GET', 'GET');
    assert.ok(!JSON.stringify(calls).includes(recoveryCode), 'Code must never enter a network request');

    await assert.rejects(
      verifyRecoveryCodeReadOnly('0000-0000-0000-0000-0000-0000-0000-0000'),
      /Code passt nicht zum aktuellen Datentresor/,
    );
    assert.ok(!JSON.stringify(calls).includes(recoveryCode), 'No secret in any network request');
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('read-only recovery check distinguishes a correct code from damaged encrypted account data', async () => {
  const { vaultRecord, vaultKey, recoveryCode } = await createVault('KLASSIO-Test-Vault-2026!');
  const encryptedState = await encryptData({ classes: [{ id: 'synthetic' }], schueler: [] }, vaultKey);
  const damagedState = { ...encryptedState, ciphertext: encryptedState.ciphertext.slice(0, -4) + 'AAAA' };
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ snapshot: { vaultRecord, encryptedState: damagedState, revision: 1 } });
  try {
    await assert.rejects(verifyRecoveryCodeReadOnly(recoveryCode), /Code öffnet den Tresorschlüssel/);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
