export interface SafePhotoSharePermission {
  ok: true;
  shareUrl: string;
  permissionId: string;
  expirationDateTime: string;
}

export interface UnsafePhotoSharePermission {
  ok: false;
  reason: string;
}

export type PhotoSharePermissionValidation = SafePhotoSharePermission | UnsafePhotoSharePermission;

export function validatePhotoSharePermission(
  permission: any,
  requestedExpirationDateTime: string,
  now = Date.now(),
): PhotoSharePermissionValidation {
  const shareUrl = typeof permission?.link?.webUrl === 'string' ? permission.link.webUrl.trim() : '';
  const permissionId = typeof permission?.id === 'string' ? permission.id.trim() : '';
  const linkType = typeof permission?.link?.type === 'string' ? permission.link.type : '';
  const linkScope = typeof permission?.link?.scope === 'string' ? permission.link.scope : '';
  const returnedExpiration = typeof permission?.expirationDateTime === 'string'
    ? permission.expirationDateTime
    : '';

  const requestedMs = Date.parse(requestedExpirationDateTime);
  const returnedMs = Date.parse(returnedExpiration);
  const expiryToleranceMs = 5 * 60 * 1000;

  if (!shareUrl || !permissionId) {
    return { ok: false, reason: 'Microsoft hat keinen eindeutig widerrufbaren Freigabelink zurückgegeben.' };
  }
  if (linkType !== 'view' || linkScope !== 'anonymous') {
    return { ok: false, reason: 'Microsoft hat nicht den angeforderten schreibgeschützten anonymen Elternlink bestätigt.' };
  }
  if (!Number.isFinite(requestedMs) || requestedMs <= now) {
    return { ok: false, reason: 'Das angeforderte Ablaufdatum ist ungültig.' };
  }
  if (!returnedExpiration || !Number.isFinite(returnedMs) || returnedMs <= now) {
    return { ok: false, reason: 'Microsoft hat für den Elternlink kein gültiges Ablaufdatum bestätigt. Die Freigabe wurde deshalb nicht übernommen.' };
  }
  if (returnedMs > requestedMs + expiryToleranceMs) {
    return { ok: false, reason: 'Microsoft hat ein späteres Ablaufdatum als angefordert zurückgegeben. Die Freigabe wurde deshalb nicht übernommen.' };
  }

  return {
    ok: true,
    shareUrl,
    permissionId,
    expirationDateTime: new Date(returnedMs).toISOString(),
  };
}
