import React from 'react';

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: Record<string, unknown>) => {
        render: (target: HTMLElement) => Promise<void>;
        close?: () => void;
      };
    };
  }
}

let paypalSdkPromise: Promise<void> | null = null;
let paypalSdkClientId: string | null = null;

function loadPayPalSdk(clientId: string): Promise<void> {
  if (window.paypal) return Promise.resolve();
  if (paypalSdkPromise && paypalSdkClientId === clientId) return paypalSdkPromise;

  paypalSdkClientId = clientId;
  paypalSdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-klassio-paypal-sdk="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('PAYPAL_SDK_LOAD_FAILED')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&vault=true&intent=subscription`;
    script.async = true;
    script.dataset.klassioPaypalSdk = 'true';
    script.dataset.sdkIntegrationSource = 'button-factory';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('PAYPAL_SDK_LOAD_FAILED'));
    document.head.appendChild(script);
  });

  return paypalSdkPromise;
}

interface PayPalSubscriptionButtonProps {
  clientId: string;
  planId: string;
  cadence: 'monthly' | 'yearly';
}

export default function PayPalSubscriptionButton({ clientId, planId, cadence }: PayPalSubscriptionButtonProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  React.useEffect(() => {
    let active = true;
    let instance: { close?: () => void } | null = null;

    const render = async () => {
      setStatus('loading');
      try {
        await loadPayPalSdk(clientId);
        if (!active || !containerRef.current || !window.paypal) return;
        containerRef.current.innerHTML = '';
        instance = window.paypal.Buttons({
          style: {
            shape: 'pill',
            color: 'gold',
            layout: 'horizontal',
            label: 'subscribe',
          },
          createSubscription: (_data: unknown, actions: any) =>
            actions.subscription.create({ plan_id: planId }),
          onApprove: () => {
            if (active) setStatus('success');
          },
          onCancel: () => {
            if (active) setStatus('idle');
          },
          onError: () => {
            if (active) setStatus('error');
          },
        });
        await instance.render(containerRef.current);
        if (active) setStatus('idle');
      } catch {
        if (active) setStatus('error');
      }
    };

    void render();
    return () => {
      active = false;
      instance?.close?.();
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [clientId, planId]);

  return (
    <div className="space-y-2">
      <div ref={containerRef} aria-label={cadence === 'monthly' ? 'Monatliches PayPal-Abo' : 'Jährliches PayPal-Abo'} />
      {status === 'loading' && <p className="text-[0.65rem] font-semibold text-slate-400">PayPal wird geladen …</p>}
      {status === 'success' && (
        <p className="text-[0.68rem] font-bold text-emerald-700">Danke! Das PayPal-Abo wurde bestätigt.</p>
      )}
      {status === 'error' && (
        <p className="text-[0.68rem] font-bold text-rose-600">PayPal konnte nicht geladen werden. Bitte später erneut versuchen.</p>
      )}
    </div>
  );
}
