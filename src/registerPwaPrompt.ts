// Keep PWA prompt handling in a same-origin asset so production CSP needs no inline scripts.
(window as any).deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (event: Event) => {
  event.preventDefault();
  (window as any).deferredPrompt = event;
  window.dispatchEvent(new CustomEvent('pwasupported'));
});
