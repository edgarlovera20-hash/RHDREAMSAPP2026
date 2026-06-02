import { appUrl } from './basePath';

export type BrowserPushStatus = NotificationPermission | 'unsupported';

export interface BrowserNotificationPayload {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  actionUrl?: string;
  tag?: string;
}

const SERVICE_WORKER_PATH = appUrl('/sw.js');
const APP_ICON = appUrl('/assets/heavenly-dreams-logo.svg');

export const isBrowserPushSupported = () => (
  typeof window !== 'undefined' &&
  window.isSecureContext &&
  'Notification' in window &&
  'serviceWorker' in navigator
);

export const getBrowserPushStatus = (): BrowserPushStatus => {
  if (!isBrowserPushSupported()) return 'unsupported';
  return Notification.permission;
};

export const registerPushServiceWorker = async () => {
  if (!isBrowserPushSupported()) return null;

  const registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH);
  return registration;
};

export const ensurePushServiceWorker = async () => {
  if (!isBrowserPushSupported()) {
    throw new Error('Este navegador no soporta notificaciones push en este contexto.');
  }

  const existingRegistration = await navigator.serviceWorker.getRegistration();
  if (existingRegistration) return existingRegistration;

  return registerPushServiceWorker();
};

export const showBrowserNotification = async (payload: BrowserNotificationPayload) => {
  if (getBrowserPushStatus() !== 'granted') return false;

  const registration = await ensurePushServiceWorker();
  if (!registration) return false;

  await registration.showNotification(payload.title, {
    body: payload.message,
    icon: APP_ICON,
    badge: APP_ICON,
    tag: payload.tag,
    requireInteraction: payload.type === 'warning' || payload.type === 'error',
    data: {
      url: payload.actionUrl || '/',
      type: payload.type || 'info',
    },
  });

  return true;
};
