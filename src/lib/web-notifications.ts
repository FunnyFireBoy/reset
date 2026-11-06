function installedOnIos() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && navigator.standalone === true);
  return { ios, standalone };
}

export function webNotificationPermission() {
  return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
}

export async function requestWebNotifications() {
  const { ios, standalone } = installedOnIos();
  if (ios && !standalone) throw new Error('On iPhone, add RESET to your Home Screen in Safari, then open its icon to enable notifications (iOS 16.4 or later).');
  if (!window.isSecureContext) throw new Error('Open the published HTTPS app to enable notifications.');
  if (window.top !== window.self) throw new Error('Open RESET in its own tab or from its Home Screen icon to enable notifications.');
  if (!('Notification' in window) || !('serviceWorker' in navigator)) throw new Error('This browser does not support phone notifications. Try Chrome on Android or the Home Screen app on iPhone.');
  if (Notification.permission === 'denied') throw new Error('Notifications are blocked. Allow notifications for RESET in your browser or phone settings, then try again.');
  // Ask immediately within the user's tap, before any asynchronous preparation.
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return false;
  await navigator.serviceWorker.register('/reset-notifications.js', { scope: '/' });
  return true;
}

export async function showWebNotification(title: string, body: string) {
  if (webNotificationPermission() !== 'granted') return;
  const registration = await navigator.serviceWorker.register('/reset-notifications.js', { scope: '/' });
  if (!registration.active) {
    const worker = registration.installing ?? registration.waiting;
    if (worker) await new Promise<void>((resolve, reject) => {
      const check = () => {
        if (worker.state === 'activated') { worker.removeEventListener('statechange', check); resolve(); }
        if (worker.state === 'redundant') { worker.removeEventListener('statechange', check); reject(new Error('Notifications could not start. Please try again.')); }
      };
      worker.addEventListener('statechange', check);
      check();
    });
  }
  await registration.showNotification(title, { body, icon: '/favicon.png', badge: '/favicon.png', tag: 'reset-quest' });
}