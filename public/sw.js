const APP_NAME = 'RHDreams';
const APP_ICON = 'assets/heavenly-dreams-logo.svg';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {
    title: APP_NAME,
    message: 'Tienes una nueva notificacion.',
    actionUrl: '/',
    type: 'info',
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch (_error) {
      payload.message = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || APP_NAME, {
      body: payload.message || payload.body || 'Tienes una nueva notificacion.',
      icon: payload.icon || APP_ICON,
      badge: payload.badge || APP_ICON,
      tag: payload.tag,
      renotify: Boolean(payload.tag),
      requireInteraction: payload.type === 'warning' || payload.type === 'error',
      data: {
        url: payload.actionUrl || payload.url || '/',
        type: payload.type || 'info',
      },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});
