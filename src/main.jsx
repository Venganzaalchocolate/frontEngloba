import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { LoggedProvider } from './context/LoggedProvider.jsx';
import React from 'react';

const RELOAD_GUARD_KEY = 'vite-chunk-reload-once';

const shouldReloadForChunkError = (value = '') => {
  const text = String(value || '');

  return (
    text.includes('Failed to fetch dynamically imported module') ||
    text.includes('Importing a module script failed') ||
    text.includes('Failed to load module script') ||
    text.includes('error loading dynamically imported module') ||
    text.includes('ChunkLoadError') ||
    text.includes('Loading chunk')
  );
};

const reloadOnce = () => {
  if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return;
  sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
  window.location.reload();
};

window.addEventListener('error', (event) => {
  const msg =
    event?.message ||
    event?.error?.message ||
    event?.target?.src ||
    '';

  if (shouldReloadForChunkError(msg)) {
    reloadOnce();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const msg =
    event?.reason?.message ||
    String(event?.reason || '');

  if (shouldReloadForChunkError(msg)) {
    reloadOnce();
  }
});

sessionStorage.removeItem(RELOAD_GUARD_KEY);

ReactDOM.createRoot(document.getElementById('root')).render(
  <LoggedProvider>
    <App />
  </LoggedProvider>
);