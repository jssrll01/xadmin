import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAdminContext } from '../context/AdminContext';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import CommandPalette from '../xa/CommandPalette.jsx';
import { PALETTE_ITEMS } from '../xa/nav.js';
import { InsightsBlock, panelsForPath } from '../analytics/TabInsights.jsx';
import '../xa/shell.css';

export default function Layout({ children }) {
  const { activeSystem } = useAdminContext();
  const loc = useLocation();
  // XMARKET tabs get an analytics block above the page. YUELIN and ACCESS add their own.
  const panels = activeSystem === 'XMARKET' ? panelsForPath(loc.pathname) : [];
  return (
    <div className="xs-shell">
      <Sidebar />
      <CommandPalette items={PALETTE_ITEMS} />
      <div className="xs-main">
        <Topbar />
        <main className="xs-content" key={activeSystem}>
          {panels.length > 0 && <InsightsBlock key={loc.pathname} panels={panels} />}
          {children}
        </main>
      </div>
    </div>
  );
}
