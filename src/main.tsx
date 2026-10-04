import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import PublicFreePromise from './components/PublicFreePromise';
import './index.css';
import './planning-dialog.css';
import './weekly-plan-ux.css';

const smartphoneQuickMode = window.matchMedia('(max-width: 767px) and (pointer: coarse)');
if (smartphoneQuickMode.matches) {
  void import('./mobileQuickMode');
}

// Render app
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <PublicFreePromise />
      <App />
    </ErrorBoundary>
  </StrictMode>,
);