import type { KELGespraech } from '../types';

export type KelConversationText = Pick<KELGespraech, 'vereinbarungen' | 'naechsterTermin' | 'elternEindruck'>
  & Required<Pick<KELGespraech, 'kindStimme' | 'gespraechStaerke' | 'vereinbarungUnterstuetzung' | 'vereinbarungErfolgskriterium'>>;

export function getKelConversationText(meeting?: Partial<KelConversationText> | null): KelConversationText {
  const text = (value: unknown) => typeof value === 'string' ? value : '';
  return {
    gespraechStaerke: text(meeting?.gespraechStaerke),
    kindStimme: text(meeting?.kindStimme),
    elternEindruck: text(meeting?.elternEindruck),
    vereinbarungen: text(meeting?.vereinbarungen),
    vereinbarungUnterstuetzung: text(meeting?.vereinbarungUnterstuetzung),
    vereinbarungErfolgskriterium: text(meeting?.vereinbarungErfolgskriterium),
    naechsterTermin: text(meeting?.naechsterTermin),
  };
}

export function formatKelAgreement(meeting?: Partial<KelConversationText> | null): string {
  const agreement = getKelConversationText(meeting);
  const followUp = agreement.naechsterTermin.trim();
  const followUpLabel = /^\d{4}-\d{2}-\d{2}$/.test(followUp) ? followUp.split('-').reverse().join('.') : followUp;
  return [
    agreement.vereinbarungen.trim(),
    agreement.vereinbarungUnterstuetzung.trim() && `Unterstützung: ${agreement.vereinbarungUnterstuetzung.trim()}`,
    agreement.vereinbarungErfolgskriterium.trim() && `Daran erkennen wir den Fortschritt: ${agreement.vereinbarungErfolgskriterium.trim()}`,
    followUpLabel && `Nächster Rückblick: ${followUpLabel}`,
  ].filter(Boolean).join('\n');
}
