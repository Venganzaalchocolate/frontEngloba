import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { LoggedProvider } from './context/LoggedProvider.jsx'
import React, { createContext, useContext } from 'react';

ReactDOM.createRoot(document.getElementById('root')).render(
    <LoggedProvider>
      <App />
    </LoggedProvider>
)
