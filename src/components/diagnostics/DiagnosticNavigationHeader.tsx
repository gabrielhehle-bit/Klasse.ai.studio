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
    <div className="mb-6">
      {/* Breadcrumb Navigation & Back Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-diagnostic-back"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
            title="Zurück zum vorherigen Schritt"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>{backLabel}</span>
          </button>

          {breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1.5 text-sm text-slate-500 ml-2" aria-label="Breadcrumb">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={idx}>
                    {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                    {crumb.onClick && !isLast ? (
                      <button
                        onClick={crumb.onClick}
                        className="hover:text-indigo-600 font-medium transition-colors cursor-pointer text-left"
                      >
                        {crumb.label}
                      </button>
                    ) : (
                      <span className={isLast ? 'font-semibold text-slate-800' : ''}>
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
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
};
