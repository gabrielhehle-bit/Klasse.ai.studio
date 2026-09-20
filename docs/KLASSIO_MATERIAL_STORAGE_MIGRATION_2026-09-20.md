# KLASSIO – material storage: secure, non-destructive rollout contract

Updated: 2026-09-20. Source: GitHub `main` `b40f56f64ed9f8aeff57cb8a853ff2bf4a83042b` at branch creation; review HEAD again before merge. **Proposal, NOT activated.**

## Current verified implementation

`MaterialItem.dateiInhalt` is a Base64 data URL embedded in the encrypted AppState. `src/lib/materialLibraryUtils.ts` currently limits the whole library to 5 MB and each file to 3 MB. `src/server/accountSyncStore.ts` caps account-sync encrypted states at 20 MiB; `server.ts` uses JSON body size limits. Raising `MATERIAL_LIBRARY_MAX_MB` alone would break these paths and risk lost data. Legacy JSON imports, encrypted backups, existing classes and the material attachment references must stay readable.

## Implementation progress (still not released or used by the app)

- `src/lib/materialAttachmentCrypto.ts`: tested client-side AES-GCM-256 envelope, fresh random file key per binary attachment, vault-wrapped key, unique IVs and authenticated association with the pre-existing random material ID. File plaintext/title never reaches the server. Only the opaque binary ciphertext is suitable for upload; the manifest remains **inside the existing encrypted AppState**. At this stage the component is not invoked by the material UI.
- `src/server/encryptedAttachmentStore.ts`: per-email-account opaque ciphertext blobs in `KLASSIO_DATA_DIR/material-attachments/<account-id>/<opaque-id>.blob` (0600), immutable writes, checked 25-MiB-plus-GCM-tag binary size, serialized free-account quota at **100 MiB ciphertext**, no student/class/file metadata. `server.ts` introduces account-authenticated binary POST/GET/DELETE/usage endpoints **behind `KLASSIO_ENCRYPTED_ATTACHMENTS_ENABLED=false`**; all disabled endpoints return 404 by default. This flag must stay false on production.
- Synthetic tests cover encryption/decryption, wrong vault, tampered bytes/metadata, account separation, disk restart, server access guard, race/overwrite and free quota. These are *foundational pieces*, not an end-to-end material migration or a paid entitlement system.
- A verified fail-safe attachment-inclusive manual JSON/ZIP backup, restore and per-device/offline caching are **still missing**. Nothing removes, rewrites or replaces existing `MaterialItem.dateiInhalt` values. Current 5-MB library/3-MB file limits are intentionally unchanged.

## Separate encrypted file contract (partially implemented; feature remains OFF)

1. A logged-in teacher obtains a **client-side random per-file key**, wrapped by the current vault key. The client encrypts file bytes and a manifest using AES-GCM with unique nonces and authenticated version/user/material reference. The server **never** receives plaintext filenames, content, vault keys, passwords or recovery codes.
2. Store ciphertext outside the app-state JSON, under a persistent `KLASSIO_DATA_DIR` path with server-side *email-account ID* authorization and opaque random attachment IDs; reject traversal, malformed ciphertext descriptors, oversized uploads and cross-account access. Deduplicate only within the same account after authenticated proof; never use content hash as globally visible ID.
3. Keep small metadata and encrypted attachment manifests in the current encrypted AppState. Preserve old `dateiInhalt` records without automatic deletion or migration. For every migrated file, verify upload/checksum/read/decryption and a verified backup/recovery path **before** clearing the old inline copy; on failure retain the old bytes.
4. Implement client-side download/offline cache with explicit missing-file and quota errors. A JSON backup must remain restorable **without** silently losing attachments: provide export of encrypted attachment bundles or a tested immutable recovery manifest with redundant storage and retrieval. A JSON containing only remote references is NOT equivalent to a complete offline backup.
5. Quota enforcement must be transactional on the server, count actual ciphertext overhead and concurrent uploads, and be based on a verified authenticated entitlement. Never trust a browser checkbox, localStorage, manually entered PayPal link or an unverified callback for membership.
6. Keep the current 5 MB / 3 MB behavior until deployment disk, data directory, free space, local+offsite encrypted backup and recovery have been tested. Proposed but **not enabled**: 100 MB per free account, 1 GiB per confirmed member, and up to 25 MB per file. No account-level promise can be made solely from a 120 GB advertised SSD figure.
7. Verify on the real vServer before rollout: `df -h`, filesystem quotas, `systemctl cat klassio.service` (`KLASSIO_DATA_DIR`), backups and retention, growth projections, concurrency, rollback across old/new client versions and access revocation. Never include real pupils, passwords, secrets or PayPal credentials in logs/artifacts.

## Related release gates

PR #185 improves the cockpit, class-fund entry and Canva UI **but does not implement this storage migration**. It must not enable paid tiers or lift material limits. Canva OAuth requires the real server credentials and a real signed-in browser test. Existing PayPal plan IDs and prices are unchanged; any annual/monthly repricing requires actual plan links, grandfathering policy and verifiable server-side payment/entitlement handling.
