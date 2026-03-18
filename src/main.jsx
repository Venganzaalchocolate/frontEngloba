import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { LoggedProvider } from './context/LoggedProvider.jsx'
import React from 'react';

window.addEventListener('error', (event) => {
  const msg = event?.message || '';

  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed')
  ) {
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <LoggedProvider>
    <App />
  </LoggedProvider>
)