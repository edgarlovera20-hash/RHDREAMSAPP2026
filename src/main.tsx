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

const requestIdleCallback = window.requestIdleCallback;

if (typeof requestIdleCallback === "function") {
  requestIdleCallback(registerPushWhenIdle, { timeout: 3500 });
} else {
  window.setTimeout(registerPushWhenIdle, 2500);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
