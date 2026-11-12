import AuditClear from './xa/AuditClear.jsx';
import ManageData from './xa/ManageData.jsx';
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PinLock from './components/PinLock.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Layout from './components/Layout.jsx';

import Dashboard from './pages/Dashboard.jsx';
import YuelinHome from './yuelin/YuelinHome.jsx';
import YlOps from './yuelin/YlOps.jsx';
import YlGate from './yuelin/YlGate.jsx';
import YuelinTable from './yuelin/YuelinTable.jsx';
import { InsightsBlock, ylPanelsFor } from './analytics/TabInsights.jsx';
import { useParams } from 'react-router-dom';
import { useAdminContext } from './context/AdminContext.jsx';
import Products from './pages/Products.jsx';
import Orders from './pages/Orders.jsx';
import CashbackCosts from './pages/CashbackCosts.jsx';
import BulkProducts from './pages/BulkProducts.jsx';
import Users from './pages/Users.jsx';
import TopUps from './pages/TopUps.jsx';
import Wallet from './pages/Wallet.jsx';
import WalletPayouts from './pages/WalletPayouts.jsx';
import CreatorApps from './pages/CreatorApps.jsx';
import CreatorMgmt from './pages/CreatorMgmt.jsx';
import SocialMod from './pages/SocialMod.jsx';
import VideoMod from './pages/VideoMod.jsx';
import WalletSecurity from './pages/WalletSecurity.jsx';
import MarketQA from './pages/MarketQA.jsx';
import GiftsAdmin from './pages/GiftsAdmin.jsx';
import DataManager from './pages/DataManager.jsx';
import DmMod from './pages/DmMod.jsx';
import ProductViews from './pages/ProductViews.jsx';
import MembersData from './pages/MembersData.jsx';
import Reports from './pages/Reports.jsx';
import Returns from './pages/Returns.jsx';
import Quotations from './pages/Quotations.jsx';
import NewReceipt from './pages/NewReceipt.jsx';
import ReceiptView from './pages/ReceiptView.jsx';
import Reviews from './pages/Reviews.jsx';
import Shops from './pages/Shops.jsx';
import Stores from './pages/Stores.jsx';
import PlayTime from './pages/PlayTime.jsx';
import { PriceDropsAdmin, DigitalProductsAdmin, DemandPollsAdmin, SponsorshipsAdmin } from './pages/XfAdmin.jsx';
import PopupsAdmin from './pages/PopupsAdmin.jsx';
import LoyaltyAdmin from './xa/LoyaltyAdmin.jsx';
import Airdrop from './pages/Airdrop.jsx';
import Banners from './pages/Banners.jsx';
import { ArticlesAdmin, ScholarshipsAdmin, FreelanceAdmin } from './pages/ContentAdmin.jsx';
import Bundles from './pages/Bundles.jsx';
import Xcards from './pages/Xcards.jsx';
import XmChat from './pages/XmChat.jsx';
import XmVip from './pages/XmVip.jsx';
import DbHome from './xa/DbHome.jsx';
import DbTable from './xa/DbTable.jsx';
import YtImport from './xa/YtImport.jsx';
import CronViewer from './xa/CronViewer.jsx';
import SlowQueries from './xa/SlowQueries.jsx';
import StorageUsage from './xa/StorageUsage.jsx';
import HealthDashboard from './xa/HealthDashboard.jsx';
import FraudFlags from './xa/FraudFlags.jsx';
import DigitalFiles from './xa/DigitalFiles.jsx';
import SqlEditor from './xa/SqlEditor.jsx';
import SchemaBrowser from './xa/SchemaBrowser.jsx';
import Promos from './pages/Promos.jsx';
import Settings from './pages/Settings.jsx';
import AuditLog from './pages/AuditLog.jsx';
import SecurityCheck from './pages/SecurityCheck.jsx';
import AdminSessions from './pages/AdminSessions.jsx';
import LoginAttempts from './pages/LoginAttempts.jsx';
import AuditSearch from './pages/AuditSearch.jsx';
import AuditExport from './pages/AuditExport.jsx';
import BackupManager from './pages/BackupManager.jsx';
import FaqBulkImport from './pages/FaqBulkImport.jsx';
import { useSessionPing } from './lib/sessionPing.js';
import { clearAdminPin as clearPinNow } from './lib/pin.js';
import Notifications from './pages/Notifications.jsx';
import Supplier from './pages/Supplier.jsx';
import Notify from './pages/Notify.jsx';
import AirdropMod from './pages/AirdropMod.jsx';
import WalletReconcile from './ops/WalletReconcile.jsx';
import DailyCloseReport from './ops/DailyCloseReport.jsx';
import XcoinMonitor from './ops/XcoinMonitor.jsx';
import UserTimeline from './ops/UserTimeline.jsx';
import CreatorPayouts from './ops/CreatorPayouts.jsx';
import KillSwitches from './ops/KillSwitches.jsx';
import RateLimitDashboard from './ops/RateLimitDashboard.jsx';
import SuspiciousRules from './ops/SuspiciousRules.jsx';
import FraudScores from './ops/FraudScores.jsx';
import FunctionExposure from './ops/FunctionExposure.jsx';
import DailyNotes from './pages/DailyNotes.jsx';
import XCoinAdmin from './pages/XCoinAdmin.jsx';
import BuyLoad from './pages/BuyLoad.jsx';
import Pricing from './pages/Pricing.jsx';
import NfcStudio from './pages/NfcStudio.jsx';
import QrPortal from './pages/QrPortal.jsx';
import Logistics from './pages/Logistics.jsx';
import ContentSettings from './xa/ContentSettings.jsx';
import AccessApp from './xaccess/App.jsx';
import { TierEditor, HouseEdge, DailyFlow, CronHealth, SuspiciousBets, HourlyActivity, PointsEconomy } from './pa/pages.jsx';
import AssetLibrary from './pages/AssetLibrary.jsx';
import { WithdrawalQueue, ReceiptViewer, DuplicateReceipts, WalletFreeze, Liability, FeeIncome, PendingMoney, TopBalances, DormantBalances, LoyaltyReport } from './tw/pages.jsx';
import { BuyLoadQueue, TopupQueue, OrdersQueue, QuotationQueue, ReturnQueue, CreatorQueue, LogisticsQueue } from './tw/queues.jsx';

function YlTablePage() {
  const { table } = useParams();
  const panels = ylPanelsFor(table);
  return <>{panels.length > 0 && <InsightsBlock key={table} panels={panels} />}<YuelinTable /></>;
}

function HomeSwitch() {
  const { activeSystem } = useAdminContext();
  if (activeSystem === 'ACCESS') return <AccessApp />;
  return activeSystem === 'YUELIN' ? <YlGate><YuelinHome /></YlGate> : <Dashboard />;
}

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

  // Tell the server this tab is unlocked; lock if another admin revoked it
  useSessionPing(unlocked, () => {
    try { sessionStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(ACTOR_KEY); } catch (e) { /* storage blocked */ }
    clearPinNow();
    setUnlocked(false);
  });

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
        <ManageData />
        <AuditClear />
        <Routes>
          <Route path="/" element={<HomeSwitch />} />
          <Route path="/pa/tiers" element={<TierEditor />} />
          <Route path="/pa/rtp" element={<HouseEdge />} />
          <Route path="/pa/daily" element={<DailyFlow />} />
          <Route path="/pa/cron" element={<CronHealth />} />
          <Route path="/pa/suspicious" element={<SuspiciousBets />} />
          <Route path="/pa/hours" element={<HourlyActivity />} />
          <Route path="/pa/economy" element={<PointsEconomy />} />
          <Route path="/assets" element={<AssetLibrary />} />
          <Route path="/tw/withdrawals" element={<WithdrawalQueue />} />
          <Route path="/tw/receipts" element={<ReceiptViewer />} />
          <Route path="/tw/duplicates" element={<DuplicateReceipts />} />
          <Route path="/tw/freeze" element={<WalletFreeze />} />
          <Route path="/tw/liability" element={<Liability />} />
          <Route path="/tw/fees" element={<FeeIncome />} />
          <Route path="/tw/pending" element={<PendingMoney />} />
          <Route path="/tw/top-balances" element={<TopBalances />} />
          <Route path="/tw/dormant" element={<DormantBalances />} />
          <Route path="/tw/loyalty" element={<LoyaltyReport />} />
          <Route path="/tw/q/buy-load" element={<BuyLoadQueue />} />
          <Route path="/tw/q/topups" element={<TopupQueue />} />
          <Route path="/tw/q/orders" element={<OrdersQueue />} />
          <Route path="/tw/q/quotations" element={<QuotationQueue />} />
          <Route path="/tw/q/returns" element={<ReturnQueue />} />
          <Route path="/tw/q/creators" element={<CreatorQueue />} />
          <Route path="/tw/q/logistics" element={<LogisticsQueue />} />
          <Route path="/users"     element={<Users />} />
          <Route path="/products"  element={<Products />} />
          <Route path="/orders"    element={<Orders />} />
          <Route path="/topups"    element={<TopUps />} />
          <Route path="/wallet"    element={<Wallet />} />
          <Route path="/payouts"   element={<WalletPayouts />} />
          <Route path="/creators"  element={<CreatorApps />} />
          <Route path="/creator-mgmt" element={<CreatorMgmt />} />
          <Route path="/social-mod" element={<SocialMod />} />
          <Route path="/video-mod" element={<VideoMod />} />
          <Route path="/wallet-security" element={<WalletSecurity />} />
          <Route path="/market-qa" element={<MarketQA />} />
          <Route path="/gifts" element={<GiftsAdmin />} />
          <Route path="/data" element={<DataManager />} />
          <Route path="/data/:table" element={<DataManager />} />
          <Route path="/dm-mod" element={<DmMod />} />
          <Route path="/product-views" element={<ProductViews />} />
          <Route path="/members-data" element={<MembersData />} />
          <Route path="/returns"   element={<Returns />} />
          <Route path="/reports"   element={<Reports />} />
          <Route path="/shops"     element={<Shops />} />
          <Route path="/stores"    element={<Stores />} />
          <Route path="/play-time" element={<PlayTime />} />
          <Route path="/xf-price-drops" element={<PriceDropsAdmin />} />
          <Route path="/xf-digital" element={<DigitalFiles />} />
          <Route path="/digital-files" element={<DigitalFiles />} />
          <Route path="/xf-polls" element={<DemandPollsAdmin />} />
          <Route path="/xf-sponsor" element={<SponsorshipsAdmin />} />
          <Route path="/xf-popups" element={<PopupsAdmin />} />
          <Route path="/loyalty" element={<LoyaltyAdmin />} />
          
          <Route path="/airdrop" element={<Airdrop />} />
          <Route path="/banners" element={<Banners />} />
          <Route path="/articles" element={<ArticlesAdmin />} />
          <Route path="/scholarships" element={<ScholarshipsAdmin />} />
          <Route path="/freelance" element={<FreelanceAdmin />} />
          <Route path="/xcards"    element={<Xcards />} />
        <Route path="/xm-chat" element={<XmChat />} />
        <Route path="/xm-vip" element={<XmVip />} />
          <Route path="/db" element={<DbHome />} />
          <Route path="/db/:table" element={<DbTable />} />
          <Route path="/yt-import" element={<YtImport />} />
          <Route path="/cron" element={<CronViewer />} />
          <Route path="/slow-queries" element={<SlowQueries />} />
          <Route path="/storage-usage" element={<StorageUsage />} />
          <Route path="/health" element={<HealthDashboard />} />
          <Route path="/fraud-flags" element={<FraudFlags />} />
          <Route path="/sql" element={<SqlEditor />} />
          <Route path="/schema" element={<SchemaBrowser />} />
          <Route path="/schema/:table" element={<SchemaBrowser />} />
          <Route path="/bundles"   element={<Bundles />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/supplier" element={<Supplier />} />
          <Route path="/notify" element={<Notify />} />
          <Route path="/airdrop-mod" element={<AirdropMod />} />
          <Route path="/ops/wallet-reconcile" element={<WalletReconcile />} />
          <Route path="/ops/daily-close" element={<DailyCloseReport />} />
          <Route path="/ops/xcoin-monitor" element={<XcoinMonitor />} />
          <Route path="/ops/user-timeline" element={<UserTimeline />} />
          <Route path="/ops/creator-payouts" element={<CreatorPayouts />} />
          <Route path="/ops/kill-switches" element={<KillSwitches />} />
          <Route path="/ops/rate-limits" element={<RateLimitDashboard />} />
          <Route path="/ops/fraud-rules" element={<SuspiciousRules />} />
          <Route path="/ops/fraud-scores" element={<FraudScores />} />
          <Route path="/ops/function-exposure" element={<FunctionExposure />} />
          <Route path="/quotations" element={<Quotations />} />
          <Route path="/quotations/new" element={<NewReceipt />} />
          <Route path="/quotations/:id" element={<ReceiptView />} />
          <Route path="/reviews"    element={<Reviews />} />
          <Route path="/buy-load" element={<BuyLoad />} />
          <Route path="/xcoin" element={<XCoinAdmin />} />
          <Route path="/daily"     element={<DailyNotes />} />
          <Route path="/audit"     element={<AuditLog />} />
          <Route path="/security-check" element={<SecurityCheck />} />
          <Route path="/admin-sessions" element={<AdminSessions />} />
          <Route path="/login-attempts" element={<LoginAttempts />} />
          <Route path="/audit-search" element={<AuditSearch />} />
          <Route path="/audit-export" element={<AuditExport />} />
          <Route path="/backup" element={<BackupManager />} />
          <Route path="/faq-import" element={<FaqBulkImport />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/cashback" element={<CashbackCosts />} />
          <Route path="/bulk-products" element={<BulkProducts />} />
          <Route path="/nfc" element={<NfcStudio />} />
          <Route path="/qr-portal" element={<QrPortal />} />
          <Route path="/logistics" element={<Logistics />} />
          <Route path="/content" element={<ContentSettings />} />
          <Route path="/settings"  element={<Settings />} />
          <Route path="/yl-ops" element={<YlGate><YlOps /></YlGate>} />
          <Route path="/yl/:table" element={<YlGate><YlTablePage /></YlGate>} />
          <Route path="/access/:tab" element={<AccessApp />} />
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  );
}
