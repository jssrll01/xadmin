import React, { useEffect, useState } from 'react';
import './index.css';
import HomePage from './pages/HomePage';
import DriveFilesPage from './pages/DriveFilesPage';
import RevokeAccessPage from './pages/RevokeAccessPage';
import SettingsPage from './pages/SettingsPage';
import { API_BASE, API_MISSING } from './api';

const TABS = [['home', '🏠 Home', HomePage], ['drive', '📁 Files', DriveFilesPage], ['revoke', '🗑️ Revoke', RevokeAccessPage], ['settings', '⚙️ Settings', SettingsPage]];

export default function AccessApp() {
  const [tab, setTab] = useState(() => { try { return localStorage.getItem('xadmin_access_tab') || 'home'; } catch { return 'home'; } });
  useEffect(() => {
    const go = (e) => setTab(e.detail);
    window.addEventListener('access-go', go);
    return () => window.removeEventListener('access-go', go);
  }, []);
  useEffect(() => { try { localStorage.setItem('xadmin_access_tab', tab); } catch { /* ignore */ } }, [tab]);
  const Page = (TABS.find((t) => t[0] === tab) || TABS[0])[2];
  return (
    <div className="xa-root">
      <nav className="w-full flex justify-center pt-6 pb-4">
        <div className="nm-flat flex items-center gap-2 px-4 py-3 flex-wrap justify-center">
          {TABS.map(([k, label]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ' + (tab === k ? 'nm-pressed text-brand' : 'hover:text-brand')}>
              {label}
            </button>
          ))}
        </div>
      </nav>
      {API_MISSING && (
        <div className="max-w-2xl mx-auto px-4 mb-4">
          <div className="nm-pressed p-4 rounded-2xl text-sm text-red-500">
            Access backend is not set. Add <b>VITE_API_URL</b> (your Drive server URL, e.g. https://your-access-server.onrender.com) in Render &rarr; Environment, then redeploy. Currently trying <b>{API_BASE}</b>.
          </div>
        </div>
      )}
      <Page />
    </div>
  );
}
