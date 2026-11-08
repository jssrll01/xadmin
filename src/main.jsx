import React, { Suspense, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import PinLock from './components/PinLock.jsx';
import { getAdminPin } from './lib/pin.js';
import { AdminProvider } from './context/AdminContext.jsx';
import { ToastProvider } from './components/Toast.jsx';
import './styles/neu.css';
import './styles/futuristic.css';

// The app (and every page) loads only after the PIN has been checked by the server.
const App = React.lazy(() => import('./App.jsx'));
const TTL_MS = Number(import.meta.env.VITE_XADMIN_SESSION_TTL_MS || 900000);

function hasSession() {
  try { return Number(sessionStorage.getItem('xadmin_unlocked') || 0) > Date.now() && !!getAdminPin(); } catch (e) { return false; }
}

function Boot() {
  const [ready, setReady] = useState(hasSession);
  if (!ready) {
    return <PinLock onUnlock={() => { sessionStorage.setItem('xadmin_unlocked', String(Date.now() + TTL_MS)); setReady(true); }} />;
  }
  return <Suspense fallback={null}><App /></Suspense>;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AdminProvider><Boot /></AdminProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
