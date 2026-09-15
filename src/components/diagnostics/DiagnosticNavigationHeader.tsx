import React from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface DiagnosticNavigationHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  onBack: () => void;
  backLabel?: string;
  actionSlot?: React.ReactNode;
}

export const DiagnosticNavigationHeader: React.FC<DiagnosticNavigationHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs = [],
  onBack,
  backLabel = 'Zurück',
  actionSlot,
}) => {
  return (
    <div className="mb-6 rounded-2xl border border-[var(--border-subtle,var(--border))] bg-[var(--surface-card,var(--surface))] p-4 sm:p-5 shadow-sm">
      {/* Breadcrumb Navigation & Back Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-diagnostic-back"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-[var(--text-secondary,var(--text2))] bg-[var(--surface-subtle,var(--surface2))] border border-[var(--border-default,var(--border2))] rounded-xl hover:bg-[var(--surface-muted,var(--surface3))] hover:text-[var(--text-primary,var(--text))] transition-colors"
            title="Zurück zum vorherigen Schritt"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--text-muted,var(--text3))]" />
            <span>{backLabel}</span>
          </button>

          {breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1.5 text-xs text-[var(--text-muted,var(--text3))] ml-2" aria-label="Breadcrumb">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={idx}>
                    {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted,var(--text3))] shrink-0" />}
                    {crumb.onClick && !isLast ? (
                      <button
                        onClick={crumb.onClick}
                        className="hover:text-[var(--accent)] font-medium transition-colors cursor-pointer text-left"
                      >
                        {crumb.label}
                      </button>
                    ) : (
                      <span className={isLast ? 'font-semibold text-[var(--text-primary,var(--text))]' : ''}>
                        {crumb.label}
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>
          )}
        </div>

        {actionSlot && <div>{actionSlot}</div>}
      </div>

      {/* Main Title & Subtitle */}
      <div>
        <h2 className="text-xl font-bold text-[var(--text-primary,var(--text))] tracking-[-0.015em]">{title}</h2>
        {subtitle && <p className="text-sm text-[var(--text-secondary,var(--text2))] mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
};
