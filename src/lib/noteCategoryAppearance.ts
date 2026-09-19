export type NoteCategoryKey = 'Journal' | 'Verhalten' | 'Erfolg' | 'Eltern' | 'Notiz';

const NOTE_STYLES: Record<NoteCategoryKey, { label: string; badge: string; card: string; field: string }> = {
  Erfolg: {
    label: 'Lob / Stärke',
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    card: 'border-emerald-200 bg-emerald-50/50',
    field: 'border-emerald-300 focus:border-emerald-500',
  },
  Verhalten: {
    label: 'Verhalten / Beobachtung',
    badge: 'bg-amber-100 text-amber-900 border-amber-300',
    card: 'border-amber-200 bg-amber-50/50',
    field: 'border-amber-300 focus:border-amber-500',
  },
  Eltern: {
    label: 'Elternkontakt',
    badge: 'bg-violet-100 text-violet-900 border-violet-300',
    card: 'border-violet-200 bg-violet-50/50',
    field: 'border-violet-300 focus:border-violet-500',
  },
  Journal: {
    label: 'Klassenjournal',
    badge: 'bg-sky-100 text-sky-900 border-sky-300',
    card: 'border-sky-200 bg-sky-50/50',
    field: 'border-sky-300 focus:border-sky-500',
  },
  Notiz: {
    label: 'Notiz',
    badge: 'bg-slate-100 text-slate-800 border-slate-300',
    card: 'border-slate-200 bg-white',
    field: 'border-slate-300 focus:border-slate-500',
  },
};

export function noteCategoryAppearance(category?: string | null) {
  return NOTE_STYLES[category as NoteCategoryKey] || NOTE_STYLES.Notiz;
}
