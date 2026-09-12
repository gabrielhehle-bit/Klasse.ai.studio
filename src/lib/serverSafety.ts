import crypto from 'node:crypto';
/** Escape text and inline-script data at their respective output boundaries. */
export function escapeHTML(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
export function scriptJSON(value: unknown): string {
  return (JSON.stringify(value) ?? 'null').replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

// Stateless, cookie-bound state works across Cloud Run instances sharing SESSION_SECRET.
export function createOAuthState(secret: string, now = Date.now()): string {
  const payload = `${now + 600000}.${crypto.randomBytes(32).toString('hex')}`;
  return `${payload}.${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
}
export function verifyOAuthState(state: string, cookie: string, secret: string, now = Date.now()): boolean {
  if (!state || state !== cookie) return false;
  const parts = state.split('.');
  if (parts.length !== 3 || !/^\d+$/.test(parts[0]) || !/^[a-f0-9]{64}$/.test(parts[1]) || !/^[a-f0-9]{64}$/.test(parts[2])) return false;
  if (Number(parts[0]) < now || Number(parts[0]) > now + 600000) return false;
  const signature = crypto.createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest();
  return crypto.timingSafeEqual(signature, Buffer.from(parts[2], 'hex'));
}
