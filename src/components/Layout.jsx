import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAdminContext } from '../context/AdminContext';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import CommandPalette from '../xa/CommandPalette.jsx';
import { PALETTE_ITEMS } from '../xa/nav.js';
import { XMARKET_GROUPS } from '../xa/shellNav.js';
import { InsightsBlock, panelsForPath } from '../analytics/TabInsights.jsx';
import '../xa/shell.css';
import '../xa/ui.css';

// every sidebar page, plus anything DbHome adds to PALETTE_ITEMS at runtime
function paletteItems() {
  const seen = new Set();
  const out = [];
  XMARKET_GROUPS.forEach((g) => g.items.forEach(([p, l, I]) => { if (!seen.has(p)) { seen.add(p); out.push([p, l, I, g.label]); } }));
  PALETTE_ITEMS.forEach((it) => { if (!seen.has(it[0])) { seen.add(it[0]); out.push(it); } });
  return out;
}

export default function Layout({ children }) {
  const { activeSystem } = useAdminContext();
  const loc = useLocation();
  // XMARKET tabs get an analytics block above the page. YUELIN and ACCESS add their own.
  const panels = activeSystem === 'XMARKET' ? panelsForPath(loc.pathname) : [];
  return (
    <div className="xs-shell">
      <Sidebar />
      <CommandPalette items={paletteItems()} />
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
