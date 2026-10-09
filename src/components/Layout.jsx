import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import DebugBar from './DebugBar.jsx';

export default function Layout({ children }) {
  const loc = useLocation();
  const [errs, setErrs] = useState([]);

  useEffect(() => {
    // Poll the global error array every second
    const id = setInterval(() => {
      if (window.__XADMIN_ERRORS) setErrs([...window.__XADMIN_ERRORS]);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        <Topbar />
        {errs.length > 0 && (
          <div style={{
            background: '#EF4444',
            color: '#fff',
            padding: 10,
            borderRadius: 8,
            fontSize: 11,
            fontFamily: 'monospace',
            marginBottom: 12,
            whiteSpace: 'pre-wrap',
          }}>
            API ERRORS:{'\n'}{errs.slice(-6).join('\n')}
          </div>
        )}
        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>
          URL: {loc.pathname}
        </div>
        {children}
      </main>
    </div>
  );
}
