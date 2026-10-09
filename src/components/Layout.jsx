import React from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function Layout({ children }) {
  const loc = useLocation();
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  // Poll the global error array — CLEAN interval with proper cleanup
  React.useEffect(() => {
    const id = window.setInterval(() => {
      forceUpdate();
    }, 1500);
    return () => window.clearInterval(id);   // <-- this is the fix
  }, []);

  const errs = (typeof window !== 'undefined' && Array.isArray(window.__XADMIN_ERRORS))
    ? window.__XADMIN_ERRORS
    : [];

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
