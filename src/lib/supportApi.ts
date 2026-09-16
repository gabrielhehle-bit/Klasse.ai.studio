export type SupportCadence = 'monthly' | 'yearly' | 'one-time';

export type PublicSupporter = {
  displayName: string;
  cadence?: SupportCadence;
  since?: string;
};

export type SupportInfo = {
  message: string;
  paypal: {
    oneTime: string | null;
    monthly: string | null;
    yearly: string | null;
  };
  supporters: PublicSupporter[];
  privacy: string;
};

export const EMPTY_SUPPORT_INFO: SupportInfo = {
  message: 'Klassio bleibt kostenlos und für alle frei zugänglich. Die laufenden Serverkosten werden durch freiwillige Unterstützung mitgetragen.',
  paypal: {
    oneTime: 'https://paypal.me/gabrielhehle',
    monthly: null,
    yearly: null,
  },
  supporters: [],
  privacy: 'Auf der öffentlichen Dankesliste erscheinen nur Namen, deren Veröffentlichung ausdrücklich erlaubt wurde. Beträge und Zahlungsdaten werden nicht angezeigt.',
};

export async function loadSupportInfo(): Promise<SupportInfo> {
  const response = await fetch('/api/support', { credentials: 'same-origin' });
  if (!response.ok) throw new Error('SUPPORT_INFO_UNAVAILABLE');
  const data = await response.json();
  return {
    ...EMPTY_SUPPORT_INFO,
    ...data,
    paypal: {
      ...EMPTY_SUPPORT_INFO.paypal,
      ...(data?.paypal || {}),
    },
    supporters: Array.isArray(data?.supporters) ? data.supporters : [],
  };
}

export function cadenceLabel(cadence?: SupportCadence): string {
  if (cadence === 'monthly') return 'monatlich';
  if (cadence === 'yearly') return 'jährlich';
  if (cadence === 'one-time') return 'einmalig';
  return 'Unterstützer:in';
}
