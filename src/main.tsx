import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerPushServiceWorker } from './lib/pushNotifications';

registerPushServiceWorker().catch((error) => {
  console.warn('No se pudo registrar el service worker de push:', error);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
