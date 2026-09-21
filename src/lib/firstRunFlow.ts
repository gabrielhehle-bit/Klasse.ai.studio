/**
 * Only a real saved class (or a valid legacy class designation / existing child list)
 * permits leaving first-run setup. Missing data is not proof of a completed setup.
 * Never use firstLogin or a browser-global tour marker to infer school setup:
 * restored/existing installations keep their own class data.
 */
export function hasCompletedInitialSetup(app: {
  klassenbezeichnung?: string | null;
  classes?: Array<{ name?: string | null }> | null;
  schueler?: readonly unknown[] | null;
} | null | undefined): boolean {
  if (!app) return false;
  return Boolean(
    app.klassenbezeichnung?.trim()
    || app.classes?.some(room => Boolean(room?.name?.trim()))
    || app.schueler?.length,
  );
}

export function shouldShowInitialDashboardTour(
  hasSetup: boolean,
  firstLogin: boolean,
  tourCompleted: boolean,
  onboardingCompleted: boolean,
  currentPage: string,
): boolean {
  return hasSetup && !firstLogin && !tourCompleted && !onboardingCompleted
    && currentPage === 'dashboard';
}
