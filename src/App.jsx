import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PinLock from './components/PinLock.jsx';
import Layout from './components/Layout.jsx';
import { ToastProvider } from './components/Toast.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Users from './pages/Users.jsx';
import Products from './pages/Products.jsx';
import Orders from './pages/Orders.jsx';
import TopUps from './pages/TopUps.jsx';
import Returns from './pages/Returns.jsx';
import Reports from './pages/Reports.jsx';
import Sellers from './pages/Sellers.jsx';
import Wallet from './pages/Wallet.jsx';
import Xcards from './pages/Xcards.jsx';
import PromoCodes from './pages/PromoCodes.jsx';
import Bundles from './pages/Bundles.jsx';
import Bots from './pages/Bots.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('xadmin_unlocked') === '1');

  const lock = () => {
    sessionStorage.removeItem('xadmin_unlocked');
    setUnlocked(false);
  };

  if (!unlocked) {
    return (
      <PinLock onUnlock={() => {
        sessionStorage.setItem('xadmin_unlocked', '1');
        setUnlocked(true);
      }} />
    );
  }

  return (
    <ToastProvider>
      <Routes>
        <Route element={<Layout onLock={lock} />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/products" element={<Products />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/topups" element={<TopUps />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/sellers" element={<Sellers />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/xcards" element={<Xcards />} />
          <Route path="/promos" element={<PromoCodes />} />
          <Route path="/bundles" element={<Bundles />} />
          <Route path="/bots" element={<Bots />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
