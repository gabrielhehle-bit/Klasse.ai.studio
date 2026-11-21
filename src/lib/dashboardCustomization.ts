export const DASHBOARD_CUSTOMIZE_EVENT = 'open-dashboard-customize';

let openOnMount = false;

export function openDashboardCustomization(currentPage: string, setPage: (page: string) => void) {
  openOnMount = true;
  if (currentPage === 'dashboard') {
    window.dispatchEvent(new Event(DASHBOARD_CUSTOMIZE_EVENT));
    return;
  }

  setPage('dashboard');
}

export function takeDashboardCustomizationRequest() {
  const requested = openOnMount;
  openOnMount = false;
  return requested;
}
