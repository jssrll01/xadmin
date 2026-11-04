import { useAdminContext } from "../context/AdminContext";
import React from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import { InsightsBlock, panelsForPath } from '../analytics/TabInsights.jsx';

export default function Layout({ children }) {
  const { activeSystem } = useAdminContext();
  const loc = useLocation();
  // XMARKET tabs get an analytics block above the page. YUELIN and ACCESS add their own.
  const panels = activeSystem === 'XMARKET' ? panelsForPath(loc.pathname) : [];
  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        <Topbar />
        <div key={activeSystem}>
          {panels.length > 0 && <InsightsBlock key={loc.pathname} panels={panels} />}
          {children}
        </div>
      </main>
    </div>
  );
}
