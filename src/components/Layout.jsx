import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function Layout({ onLock }) {
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  return (
    <div className="shell">
      <Sidebar open={open} onClose={() => setOpen(false)} onLock={onLock} />
      <main className="main">
        <Topbar onMenu={() => setOpen(true)} onLock={onLock} title={loc.pathname.replace('/', '') || 'dashboard'} />
        <div className="page-enter">
          <Outlet />
        </div>
      </main>
      <style>{`
        @media (max-width: 900px) {
          .sidebar + .main .neu-btn-ghost:first-child { display: inline-flex !important; }
        }
      `}</style>
    </div>
  );
}
