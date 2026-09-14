import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const trustedDevice = readFileSync(new URL('./trustedDeviceVault.ts', import.meta.url), 'utf8');
const backup = readFileSync(new URL('../components/Backup.tsx', import.meta.url), 'utf8');
const settings = readFileSync(new URL('../components/Settings.tsx', import.meta.url), 'utf8');

test('full factory reset clears the separate trusted-device database', () => {
  assert.match(backup, /await clearTrustedDeviceUnlock\(\);[\s\S]*await localforage\.clear\(\)/);
  assert.match(settings, /await clearTrustedDeviceUnlock\(\);[\s\S]*localStorage\.clear\(\);[\s\S]*sessionStorage\.clear\(\);[\s\S]*await localforage\.clear\(\)/);
});

test('trusted-device unlock purges stale or mismatched records', () => {
  assert.match(
    trustedDevice,
    /if \(!deviceKey \|\| !record \|\| record\.version !== 1 \|\| record\.vaultId !== vaultRecord\.id\)[\s\S]*if \(deviceKey \|\| record\) await clearTrustedDeviceUnlock\(\);/
  );
  assert.match(trustedDevice, /record\.expiresAt <= Date\.now\(\)[\s\S]*await clearTrustedDeviceUnlock\(\)/);
});

test('trusted-device key remains wrapped by a non-exportable device key', () => {
  assert.match(trustedDevice, /const deviceKey = await generateAESKey\(false\)/);
  assert.match(trustedDevice, /wrappedVaultKey = await encryptData\(payload, deviceKey\)/);
  assert.doesNotMatch(trustedDevice, /localStorage\.setItem/);
  assert.doesNotMatch(trustedDevice, /sessionStorage\.setItem/);
});
