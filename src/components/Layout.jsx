import { useAdminContext } from "../context/AdminContext";
import React from 'react';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function Layout({ children }) {
  const { activeSystem } = useAdminContext();
  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        <Topbar />
        <div key={activeSystem}>{children}</div>
      </main>
    </div>
  );
}
