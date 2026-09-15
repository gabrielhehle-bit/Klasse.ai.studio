import React, { forwardRef, InputHTMLAttributes, ReactNode, useId } from 'react';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string | boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  size?: InputSize;
}

/**
 * Standardisiertes semantisches Textfeld nach F-DS2 Spezifikation.
 * Basiert auf Theme-Tokens für Surface, Border, Text, Placeholder und Focus.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  helperText,
  error,
  leftIcon,
  rightIcon,
  size = 'md',
  id,
  className = '',
  disabled,
  ...rest
}, ref) => {
  const autoId = useId();
  const inputId = id || autoId;
  const isError = Boolean(error);
  const errorMessage = typeof error === 'string' ? error : undefined;

  const sizeClasses: Record<InputSize, string> = {
    sm: 'min-h-[36px] px-2.5 py-1.5 text-xs rounded-lg',
    md: 'min-h-[44px] px-3.5 py-2 text-sm rounded-xl',
    lg: 'min-h-[52px] px-4 py-3 text-base rounded-xl'
  };

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-[var(--text-secondary,var(--text2))]"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center w-full">
        {leftIcon && (
          <span
            className="absolute left-3 flex items-center pointer-events-none text-[var(--text-muted,var(--text3))]"
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={isError ? true : undefined}
          aria-describedby={
            errorMessage
              ? `${inputId}-error`
              : helperText
                ? `${inputId}-helper`
                : undefined
          }
          className={`
            w-full transition-all duration-150
            bg-[var(--surface-card,var(--surface))]
            text-[var(--text-primary,var(--text))]
            placeholder:text-[var(--text-muted,var(--text3))]
            border
            ${isError
              ? 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-2 focus:ring-[var(--danger)]/25'
              : 'border-[var(--border-default,var(--border2))] hover:border-[var(--border-strong,var(--border2))] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--focus-ring,var(--accent))]/25'
            }
            focus:outline-none
            disabled:opacity-50 disabled:bg-[var(--surface-muted,var(--surface3))] disabled:cursor-not-allowed
            ${leftIcon ? 'pl-9' : ''}
            ${rightIcon ? 'pr-9' : ''}
            ${sizeClasses[size]}
            ${className}
          `.trim()}
          {...rest}
        />

        {rightIcon && (
          <span
            className="absolute right-3 flex items-center pointer-events-none text-[var(--text-muted,var(--text3))]"
            aria-hidden="true"
          >
            {rightIcon}
          </span>
        )}
      </div>

      {errorMessage && (
        <p
          id={`${inputId}-error`}
          className="text-xs font-medium text-[var(--danger)]"
          role="alert"
        >
          {errorMessage}
        </p>
      )}

      {!errorMessage && helperText && (
        <p
          id={`${inputId}-helper`}
          className="text-xs text-[var(--text-muted,var(--text3))]"
        >
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
