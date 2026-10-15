// APP_URL names the public site, including deployments served at both the
// apex and www host. Do not grant access to other same-site subdomains.
export function isAllowedApiOrigin(origin: string, publicUrl: string): boolean {
  try {
    const candidate = new URL(origin);
    const configured = new URL(publicUrl);
    if (!['http:', 'https:'].includes(candidate.protocol)
      || candidate.origin !== origin
      || candidate.protocol !== configured.protocol
      || candidate.port !== configured.port) return false;
    if (candidate.hostname === configured.hostname) return true;
    const apex = configured.hostname.replace(/^www\./, '');
    // Local development and IP addresses do not have a www alias.
    if (!apex.includes('.') || /^[\d.]+$/.test(apex) || apex.includes(':')) return false;
    return candidate.hostname === apex || candidate.hostname === 'www.' + apex;
  } catch {
    return false;
  }
}
