import React from 'react';
import SetupWizardCore from './SetupWizardCore';

type SetupWizardProps = React.ComponentProps<typeof SetupWizardCore>;

/**
 * AccessGate already handled the site's login before this component mounts.
 * Do not force teachers through a second email/login introduction before they
 * can enter their school and class. Account sync can be linked later under
 * Einstellungen -> Konto & Schulmail.
 */
export default function SetupWizard(props: SetupWizardProps) {
  return <SetupWizardCore {...props} />;
}
