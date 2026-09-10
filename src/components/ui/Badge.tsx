import React, { ReactNode, HTMLAttributes } from 'react';

export type BadgeVariant =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: ReactNode;
  children: ReactNode;
}

/**
 * Standardisiertes semantisches Badge nach F-DS2 Spezifikation.
 * Verwendet ausschließlich semantische Theme- und Status-Tokens.
 */
export function Badge({
  variant = 'neutral',
  size = 'md',
  icon,
  children,
  className = '',
  ...rest
}: BadgeProps) {
  const sizeClasses: Record<BadgeSize, string> = {
    sm: 'text-[11px] px-2 py-0.5 rounded-md gap-1 font-semibold',
    md: 'text-xs px-2.5 py-1 rounded-lg gap-1.5 font-semibold'
  };

  const variantClasses: Record<BadgeVariant, string> = {
    neutral:
      'bg-[var(--surface-subtle,var(--surface2))] text-[var(--text-secondary,var(--text2))] ' +
      'border border-[var(--border-default,var(--border2))]',

    accent:
      'bg-[var(--accent-soft)] text-[var(--accent)] ' +
      'border border-[var(--accent)]/30 font-bold',

    success:
      'bg-[var(--success-soft)] text-[var(--success-text)] ' +
      'border border-[var(--success)]/30 font-semibold',

    warning:
      'bg-[var(--warning-soft)] text-[var(--warning-text)] ' +
      'border border-[var(--warning)]/30 font-semibold',

    danger:
      'bg-[var(--danger-soft)] text-[var(--danger-text)] ' +
      'border border-[var(--danger)]/30 font-semibold',

    info:
      'bg-[var(--info-soft)] text-[var(--info-text)] ' +
      'border border-[var(--info)]/30 font-semibold'
  };

  return (
    <span
      className={`inline-flex items-center justify-center select-none ${sizeClasses[size]} ${variantClasses[variant]} ${className}`.trim()}
      {...rest}
    >
      {icon && <span className="inline-flex shrink-0" aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
