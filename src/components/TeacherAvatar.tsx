import React from 'react';
import { getTeacherFirstName } from '../lib/utils';
import type { AppState } from '../types';

/** Only rasterized, locally stored images; no external image URL or SVG rendering. */
export function safeProfileImage(value: unknown): string | undefined {
  return typeof value === 'string' && /^data:image\/(?:webp|png|jpeg);base64,[a-z0-9+/=]+$/i.test(value)
    && value.length <= 340000 ? value : undefined;
}

export default function TeacherAvatar({ app, size = 'md', className = '' }: {
  app: AppState;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const src = safeProfileImage(app.lehrerProfil?.fotoDataUrl);
  const name = app.lehrerProfil?.name?.trim() || getTeacherFirstName(app) || 'K';
  const initials = name.split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join('').toLocaleUpperCase('de-AT');
  const sizes = { sm: 'h-10 w-10 text-xs', md: 'h-12 w-12 text-sm', lg: 'h-24 w-24 text-2xl' };
  return <span aria-label={src ? 'Profilfoto' : 'Profilbild-Platzhalter'}
    className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--accent)] bg-[var(--accent-soft)] font-black text-[var(--accent)] ${sizes[size]} ${className}`}>
    {src ? <img src={src} alt="" decoding="async" className="h-full w-full object-cover" /> : initials || 'K'}
  </span>;
}
