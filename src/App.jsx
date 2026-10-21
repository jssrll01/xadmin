import React, { useEffect, useState } from 'react';
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
import Quotations from './pages/Quotations.jsx';
import NewReceipt from './pages/NewReceipt.jsx';
import ReceiptView from './pages/ReceiptView.jsx';
import Reviews from './pages/Reviews.jsx';
import Shops from './pages/Shops.jsx';
import Stores from './pages/Stores.jsx';
import PlayTime from './pages/PlayTime.jsx';
import Airdrop from './pages/Airdrop.jsx';
import Banners from './pages/Banners.jsx';
import Bundles from './pages/Bundles.jsx';
import Xcards from './pages/Xcards.jsx';
import Promos from './pages/Promos.jsx';
import Settings from './pages/Settings.jsx';
import AuditLog from './pages/AuditLog.jsx';
import Notifications from './pages/Notifications.jsx';
import Supplier from './pages/Supplier.jsx';
import Notify from './pages/Notify.jsx';
import AirdropMod from './pages/AirdropMod.jsx';

const SESSION_KEY = 'xadmin_unlocked';
const ACTOR_KEY = 'xadmin_actor';
const TTL_MS = Number(import.meta.env.VITE_XADMIN_SESSION_TTL_MS || 900000);

function isSessionValid() {
  const exp = Number(sessionStorage.getItem(SESSION_KEY) || 0);
  return exp > Date.now();
}

export default function App() {
  const [unlocked, setUnlocked] = useState(() => isSessionValid());

  // Watch for session expiry every 30s
  useEffect(() => {
    if (!unlocked) return;
    const tick = setInterval(() => {
      if (!isSessionValid()) {
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(ACTOR_KEY);
        setUnlocked(false);
      }
    }, 30000);
    return () => clearInterval(tick);
  }, [unlocked]);

  // Extend session on any user activity (throttled)
  useEffect(() => {
    if (!unlocked) return;
    let last = 0;
    const extend = () => {
      const now = Date.now();
      if (now - last < 30000) return;
      last = now;
      sessionStorage.setItem(SESSION_KEY, String(now + TTL_MS));
    };
    window.addEventListener('click', extend);
    window.addEventListener('keydown', extend);
    return () => {
      window.removeEventListener('click', extend);
      window.removeEventListener('keydown', extend);
    };
  }, [unlocked]);

  if (!unlocked) {
    return (
      <PinLock
        onUnlock={() => {
          sessionStorage.setItem(SESSION_KEY, String(Date.now() + TTL_MS));
          setUnlocked(true);
        }}
      />
    );
  }

  return (
    <ErrorBoundary>
      <Layout>
        <Routes>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/users"     element={<Users />} />
          <Route path="/products"  element={<Products />} />
          <Route path="/orders"    element={<Orders />} />
          <Route path="/topups"    element={<TopUps />} />
          <Route path="/wallet"    element={<Wallet />} />
          <Route path="/returns"   element={<Returns />} />
          <Route path="/reports"   element={<Reports />} />
          <Route path="/shops"     element={<Shops />} />
          <Route path="/stores"    element={<Stores />} />
          <Route path="/play-time" element={<PlayTime />} />
          <Route path="/airdrop" element={<Airdrop />} />
          <Route path="/banners" element={<Banners />} />
          <Route path="/xcards"    element={<Xcards />} />
          <Route path="/promos"    element={<Promos />} />
          <Route path="/bundles"   element={<Bundles />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/supplier" element={<Supplier />} />
          <Route path="/notify" element={<Notify />} />
          <Route path="/airdrop-mod" element={<AirdropMod />} />
          <Route path="/quotations" element={<Quotations />} />
          <Route path="/quotations/new" element={<NewReceipt />} />
          <Route path="/quotations/:id" element={<ReceiptView />} />
          <Route path="/reviews"    element={<Reviews />} />
          <Route path="/audit"     element={<AuditLog />} />
          <Route path="/settings"  element={<Settings />} />
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  );
}
