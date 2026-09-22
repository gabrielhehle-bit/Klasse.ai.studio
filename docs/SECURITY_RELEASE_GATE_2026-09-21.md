# KLASSIO security release gate — 21 September 2026

This document records what the security branch changes **and what it cannot establish**.
Status: DRAFT / NOT DEPLOYED. Do not handle new live pupil reports through the affected AI import endpoints.

## Implemented in this branch
- Block Antolin and IKM Gemini document analysis server-side (403) and stop the two UIs from uploading the documents. These features intentionally remain unavailable until an independently reviewed local parser and lawful workflow exist.
- Disable weekly/yearly Excel workbook imports that used the vulnerable `xlsx@0.18.5` parser. Excel template/export generation remains available; no untrusted workbook bytes are parsed on this branch.
- Trust reverse-proxy client addresses only from explicit `KLASSIO_TRUSTED_PROXY_ADDRESSES`; add per-address, per-IP and global verification-email limits.
- Validate Origin/Fetch Metadata for state-changing API requests. Review any legitimate cross-origin integrations before release.
- Persist SHA-256 access-token hashes in a server-side allowlist. Logout revokes the current token; the email-account logout-all API revokes all sessions for that account. Sessions are valid for at most seven days.
- Use per-response CSP script nonces in production; no unsafe-eval or unsafe-inline JavaScript. Permit only same-origin framing in production.
- Keep Smartboard pairing secrets fragment-only (`#sync=...&key=...`), remove the legacy query-string fallback, and require a session-key-derived write token for sync PUT operations so the six-character code alone cannot overwrite ciphertext.
- Replace persistent student IDs with temporary `S01`-style aliases for voice AI and expand the server AI fallback to filter structured student-name and student-ID fields.
- Harden SMTP use with strict mailbox parsing, header sanitization, TLS requirements, content-access restrictions and timeouts.
- Add API and unit regression tests for origin filtering, blocked AI imports, throttling, revocation, and CSP.

## Required deployment checks (not yet completed)
1. Run complete PR checks: TypeScript, tests, production build, two-account school-verification and team-teaching Chrome E2E. Do not merge a failing check.
2. Confirm the live reverse proxy exposes only HTTPS; direct Node/Express port must not be publicly reachable. Confirm APP_URL matches the canonical scheme/host and check production CSP, HSTS, secure cookies, and Cache-Control using an unauthenticated read-only request.
3. Set KLASSIO_DATA_DIR to a writable persistent location **outside the public web root**; ensure it survives deployments and restarts, has restricted filesystem permissions, and is included in encrypted operational backups. The access-session allowlist is intentionally fail-closed on unreadable records; do not silently clear it.
4. Current file-backed session store assumes **one application process**. For multiple servers/processes switch to a transaction-safe shared session database before scaling. The socket-peer limiter may group clients behind a shared reverse proxy; verify real-user login behavior with the actual proxy.
5. Existing access sessions will require sign-in after release. Verify one account can log out and that copied cookies fail after logout and after process restart. Verify logout-all on multiple browsers; separately lock decrypted local vaults on devices.
6. With **dummy records only**, verify that user A cannot read/update user B's private account snapshot, that uninvited users cannot access team classes, and that viewer roles cannot write. Include simultaneous sync conflicts and offline/reconnect.
7. Inspect all remaining AI actions for plaintext personally identifiable information and document a permissible external AI processing agreement before using them with identifiable pupils. The text-pattern filter is not reliable anonymization.
8. Dependency follow-up remains tracked in GitHub issue #270. The reachable `xlsx@0.18.5` import path is disabled in this release, but the dependency must still be replaced before Excel imports return. Before upgrading Nodemailer to the current 10.x line, verify the actual World4You Node.js runtime supports Node 20+; regenerate `bun.lock` and run mail, browser and build tests.
9. Obtain an independent security/privacy review and appropriate school-level approval before broadening processing of real pupil data.

## Rollback and incident response
- Stop the impacted AI import functionality at the server if a privacy regression is found. Never re-enable it based on a checkbox alone.
- Record release commit + deployment time and compare to production code. Preserve access and application audit logs without pupil plaintext or tokens.
- Keep a secure snapshot of the persistent data directory before migration; review incident-response, notification and restoration procedures with the school/data controller.
- No production exploit traffic, login-brute-force tests, requests with real student data, or live penetration testing were performed for this code review.
