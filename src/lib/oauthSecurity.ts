import crypto from 'node:crypto';

export function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
}

// JSON escaping alone does not prevent </script> from ending an HTML script element.
export function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

export function createOAuthState(secret: string, now = Date.now()): string {
  const payload = `${now + 10 * 60 * 1000}.${crypto.randomBytes(32).toString('hex')}`;
  return `${payload}.${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
}

export function verifyOAuthState(state: unknown, cookie: unknown, secret: string, now = Date.now()): boolean {
  if (typeof state !== 'string' || typeof cookie !== 'string' || state !== cookie) return false;
  if (!/^\d+\.[a-f0-9]{64}\.[a-f0-9]{64}$/.test(state)) return false;
  const [expires, nonce, mac] = state.split('.');
  const expiry = Number(expires);
  if (expiry <= now || expiry > now + 10 * 60 * 1000) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${expires}.${nonce}`).digest();
  return crypto.timingSafeEqual(Buffer.from(mac, 'hex'), expected);
}
