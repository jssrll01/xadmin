import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './index.css';
import HomePage from './pages/HomePage';
import DriveFilesPage from './pages/DriveFilesPage';
import RevokeAccessPage from './pages/RevokeAccessPage';
import SettingsPage from './pages/SettingsPage';
import { API_BASE, API_MISSING } from './api';

export const ACCESS_TABS = [['home', 'Home', HomePage], ['drive', 'Files', DriveFilesPage], ['revoke', 'Revoke', RevokeAccessPage], ['settings', 'Settings', SettingsPage]];
export const accessPath = (k) => (k === 'home' ? '/' : '/access/' + k);

export default function AccessApp() {
  const loc = useLocation();
  const nav = useNavigate();
  const seg = loc.pathname.startsWith('/access/') ? loc.pathname.split('/')[2] : 'home';
  const tab = ACCESS_TABS.find((t) => t[0] === seg) || ACCESS_TABS[0];
  // Pages inside Access ask to switch tab with this event.
  useEffect(() => {
    const go = (e) => nav(accessPath(e.detail));
    window.addEventListener('access-go', go);
    return () => window.removeEventListener('access-go', go);
  }, [nav]);
  const Page = tab[2];
  return (
    <div className="xa-root">
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
