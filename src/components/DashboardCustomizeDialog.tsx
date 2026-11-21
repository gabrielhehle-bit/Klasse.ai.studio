import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Clock, LayoutGrid, X } from 'lucide-react';
import type { DashboardPreviewMode } from '../lib/dashboardDayContext';
import { Button, IconButton } from './ui';

const previewModes: { value: DashboardPreviewMode; label: string }[] = [
  { value: 'heute', label: 'Heutiger Tag' },
  { value: 'automatik', label: 'Automatisch' },
  { value: 'morgen', label: 'Nächster Werktag' },
];

const previewHours = [12, 14, 15, 16, 17, 18, 20];
const fieldClass = 'min-h-11 rounded-xl border border-border bg-surface px-3 text-sm font-medium text-text-primary focus-visible:outline-2 focus-visible:outline-accent';
const optionClass = 'flex min-h-11 items-center gap-3 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-text-primary has-checked:border-accent has-checked:bg-accent-soft';
const inputClass = 'size-4 shrink-0 accent-accent';

type Props = {
  simpleMode: boolean;
  onSimpleModeChange: (simple: boolean) => void;
  previewMode: DashboardPreviewMode;
  onPreviewModeChange: (mode: DashboardPreviewMode) => void;
  previewHour: number;
  onPreviewHourChange: (hour: number) => void;
  children: ReactNode;
  onArrange?: () => void;
  onClose: () => void;
};

export default function DashboardCustomizeDialog({
  simpleMode,
  onSimpleModeChange,
  previewMode,
  onPreviewModeChange,
  previewHour,
  onPreviewHourChange,
  children,
  onArrange,
  onClose,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  const closeDialog = () => {
    dialogRef.current?.close();
    onClose();
  };

  const hours = previewHours.includes(previewHour)
    ? previewHours
    : [...previewHours, previewHour].sort((a, b) => a - b);

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby="dashboard-customize-title"
      onCancel={event => {
        event.preventDefault();
        closeDialog();
      }}
      onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation(); }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-lg overflow-hidden rounded-2xl border border-border bg-surface p-0 text-text-primary shadow-2xl backdrop:bg-slate-950/50"
    >
      <div className="flex max-h-[calc(100dvh-1.5rem)] flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          <h2 id="dashboard-customize-title" className="text-xl font-bold">Heute bearbeiten</h2>
          <IconButton autoFocus aria-label="Heute-Einstellungen schließen" icon={<X size={20} />}
            variant="ghost" size="md" onClick={closeDialog} />
        </header>

        <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
          <fieldset className="min-w-0">
            <legend className="mb-2 flex items-center gap-2 text-sm font-bold">
              <LayoutGrid size={16} aria-hidden="true" /> Ansicht
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className={optionClass}>
                <input type="radio" name="dashboard-view" className={inputClass} checked={simpleMode}
                  onChange={() => onSimpleModeChange(true)} />
                Kompakt
              </label>
              <label className={optionClass}>
                <input type="radio" name="dashboard-view" className={inputClass} checked={!simpleMode}
                  onChange={() => onSimpleModeChange(false)} />
                Erweitert
              </label>
            </div>
          </fieldset>

          <fieldset className="min-w-0">
            <legend className="mb-2 flex items-center gap-2 text-sm font-bold">
              <Clock size={16} aria-hidden="true" /> Tagesvorschau
            </legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {previewModes.map(mode => (
                <label className={optionClass} key={mode.value}>
                  <input type="radio" name="dashboard-preview" className={inputClass} checked={previewMode === mode.value}
                    onChange={() => onPreviewModeChange(mode.value)} />
                  {mode.label}
                </label>
              ))}
            </div>
            {previewMode === 'automatik' && (
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                <label htmlFor="dashboard-preview-hour" className="text-sm font-semibold">Wechsel ab</label>
                <select id="dashboard-preview-hour" className={fieldClass} value={previewHour}
                  onChange={event => onPreviewHourChange(Number(event.target.value))}>
                  {hours.map(hour => <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00 Uhr</option>)}
                </select>
                <p className="basis-full text-sm text-text-secondary">Am Wochenende und an schulfreien Tagen bleibt das heutige Datum sichtbar.</p>
              </div>
            )}
          </fieldset>

          {!simpleMode && children}
          {onArrange && (
            <Button variant="secondary" className="min-h-11 w-full justify-between"
              rightIcon={<ArrowRight size={16} aria-hidden="true" />} onClick={() => {
                closeDialog();
                onArrange();
              }}>
              Karten anordnen
            </Button>
          )}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 sm:px-6">
          <p className="text-xs text-text-secondary">Änderungen werden direkt übernommen.</p>
          <Button variant="primary" className="min-h-11" onClick={closeDialog}>Fertig</Button>
        </footer>
      </div>
    </dialog>,
    document.body,
  );
}
