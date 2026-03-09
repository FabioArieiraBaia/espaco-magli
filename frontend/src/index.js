import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Registrar Service Worker apenas para área administrativa/equipe
const isAppPath = window.location.pathname.includes('/admin') || window.location.pathname.includes('/equipe');
if (isAppPath) {
  serviceWorkerRegistration.register();
} else {
  serviceWorkerRegistration.unregister();
}