import React, { forwardRef, TextareaHTMLAttributes, useId } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string | boolean;
}

/**
 * Standardisierter semantischer mehrzeiliger Textbereich nach F-DS2 Spezifikation.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  helperText,
  error,
  id,
  className = '',
  disabled,
  rows = 3,
  ...rest
}, ref) => {
  const autoId = useId();
  const textareaId = id || autoId;
  const isError = Boolean(error);
  const errorMessage = typeof error === 'string' ? error : undefined;

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={textareaId}
          className="text-xs font-semibold text-[var(--text-secondary,var(--text2))]"
        >
          {label}
        </label>
      )}

      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        disabled={disabled}
        aria-invalid={isError ? true : undefined}
        aria-describedby={
          errorMessage
            ? `${textareaId}-error`
            : helperText
              ? `${textareaId}-helper`
              : undefined
        }
        className={`
          w-full px-3.5 py-2.5 text-sm rounded-xl transition-all duration-150
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
          ${className}
        `.trim()}
        {...rest}
      />

      {errorMessage && (
        <p
          id={`${textareaId}-error`}
          className="text-xs font-medium text-[var(--danger)]"
          role="alert"
        >
          {errorMessage}
        </p>
      )}

      {!errorMessage && helperText && (
        <p
          id={`${textareaId}-helper`}
          className="text-xs text-[var(--text-muted,var(--text3))]"
        >
          {helperText}
        </p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';
