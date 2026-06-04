import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerPushServiceWorker } from './lib/pushNotifications';

const registerPushWhenIdle = () => {
  registerPushServiceWorker().catch((error) => {
    console.warn('No se pudo registrar el service worker de push:', error);
  });
};

if ('requestIdleCallback' in window) {
  window.requestIdleCallback(registerPushWhenIdle, { timeout: 3500 });
} else {
  window.setTimeout(registerPushWhenIdle, 2500);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
