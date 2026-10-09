import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PinLock from './components/PinLock.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Layout from './components/Layout.jsx';

import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import Orders from './pages/Orders.jsx';
import Users from './pages/Users.jsx';
import TopUps from './pages/TopUps.jsx';
import Wallet from './pages/Wallet.jsx';
import Reports from './pages/Reports.jsx';
import Returns from './pages/Returns.jsx';
import Sellers from './pages/Sellers.jsx';
import Bundles from './pages/Bundles.jsx';
import Xcards from './pages/Xcards.jsx';
import Promos from './pages/Promos.jsx';
import Bots from './pages/Bots.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem('xadmin_unlocked') === '1'
  );

  if (!unlocked) {
    return <PinLock onUnlock={() => {
      sessionStorage.setItem('xadmin_unlocked', '1');
      setUnlocked(true);
    }} />;
  }

  return (
    <ErrorBoundary>
      <Layout>
        <Routes>
          <Route path="/"         element={<Dashboard />} />
          <Route path="/users"    element={<Users />} />
          <Route path="/products" element={<Products />} />
          <Route path="/orders"   element={<Orders />} />
          <Route path="/topups"   element={<TopUps />} />
          <Route path="/wallet"   element={<Wallet />} />
          <Route path="/returns"  element={<Returns />} />
          <Route path="/reports"  element={<Reports />} />
          <Route path="/sellers"  element={<Sellers />} />
          <Route path="/xcards"   element={<Xcards />} />
          <Route path="/promos"   element={<Promos />} />
          <Route path="/bundles"  element={<Bundles />} />
          <Route path="/bots"     element={<Bots />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*"         element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  );
}
