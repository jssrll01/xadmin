import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PinLock from './components/PinLock.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import PageBoundary from './components/PageBoundary.jsx';
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
import PromoCodes from './pages/PromoCodes.jsx';
import Bots from './pages/Bots.jsx';
import Settings from './pages/Settings.jsx';

const wrap = (el) => <PageBoundary>{el}</PageBoundary>;

export default function App() {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem('xadmin_unlocked') === '1'
  );

  if (!unlocked) {
    return (
      <PinLock onUnlock={() => {
        sessionStorage.setItem('xadmin_unlocked', '1');
        setUnlocked(true);
      }} />
    );
  }

  return (
    <ErrorBoundary>
      <Layout>
        <Routes>
          <Route path="/"            element={wrap(<Dashboard />)} />
          <Route path="/dashboard"   element={wrap(<Dashboard />)} />
          <Route path="/products"    element={wrap(<Products />)} />
          <Route path="/orders"      element={wrap(<Orders />)} />
          <Route path="/users"       element={wrap(<Users />)} />
          <Route path="/topups"      element={wrap(<TopUps />)} />
          <Route path="/wallet"      element={wrap(<Wallet />)} />
          <Route path="/reports"     element={wrap(<Reports />)} />
          <Route path="/returns"     element={wrap(<Returns />)} />
          <Route path="/sellers"     element={wrap(<Sellers />)} />
          <Route path="/bundles"     element={wrap(<Bundles />)} />
          <Route path="/xcards"      element={wrap(<Xcards />)} />
          <Route path="/promo-codes" element={wrap(<PromoCodes />)} />
          <Route path="/bots"        element={wrap(<Bots />)} />
          <Route path="/settings"    element={wrap(<Settings />)} />
          <Route path="*"            element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  );
}
