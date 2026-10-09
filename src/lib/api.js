import { supabase } from '../supabase.js';

/* ============================================================
   DASHBOARD STATS
   ============================================================ */
export async function fetchStats() {
  try {
    const [users, orders, products, topups, reports] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('id, total', { count: 'exact' }),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('topups').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('reports').select('id', { count: 'exact' }).eq('status', 'open'),
    ]);

    const revenue = orders.data?.reduce((sum, o) => sum + Number(o.total || 0), 0) || 0;

    return {
      revenue,
      orders: orders.count || 0,
      users: users.count || 0,
      products: products.count || 0,
      pendingTopups: topups.count || 0,
      openReports: reports.count || 0,
    };
  } catch (err) {
    console.error('fetchStats failed:', err);
    return { revenue: 0, orders: 0, users: 0, products: 0, pendingTopups: 0, openReports: 0 };
  }
}

export async function fetchRevenueSeries(days = 30) {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const { data, error } = await supabase
      .from('orders')
      .select('created_at, total')
      .gte('created_at', since.toISOString());
    if (error) throw error;

    const map = {};
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      map[d.toISOString().slice(0, 10)] = 0;
    }
    (data || []).forEach(o => {
      const key = o.created_at?.slice(0, 10);
      if (key && map[key] !== undefined) map[key] += Number(o.total || 0);
    });
    return Object.entries(map).map(([date, revenue]) => ({ date, revenue }));
  } catch (err) {
    console.error('fetchRevenueSeries failed:', err);
    return [];
  }
}

/* ============================================================
   USERS
   ============================================================ */
export async function fetchUsers({ search = '', limit = 100 } = {}) {
  let q = supabase.from('users').select('*').order('created_at', { ascending: false }).limit(limit);
  if (search) q = q.or(`username.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
  const { data, error } = await q;
  if (error) return { items: [], error };
  return { items: data || [] };
}

export async function updateUser(id, patch) {
  const { error } = await supabase.from('users').update(patch).eq('id', id);
  return { error };
}

export async function deleteUser(id) {
  const { error } = await supabase.from('users').delete().eq('id', id);
  return { error };
}

/* ============================================================
   PRODUCTS
   ============================================================ */
export async function fetchProducts() {
  const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
  return { items: data || [], error };
}

export async function createProduct(payload) {
  const { data, error } = await supabase.from('products').insert(payload).select().single();
  return { data, error };
}

export async function updateProduct(id, patch) {
  const { error } = await supabase.from('products').update(patch).eq('id', id);
  return { error };
}

export async function deleteProduct(id) {
  const { error } = await supabase.from('products').delete().eq('id', id);
  return { error };
}

/* ============================================================
   ORDERS
   ============================================================ */
export async function fetchOrders({ status = '' } = {}) {
  let q = supabase.from('orders').select('*, users(first_name, last_name, email)').order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  return { items: data || [], error };
}

export async function updateOrderStatus(id, status) {
  const { error } = await supabase.from('orders').update({ status }).eq('id', id);
  return { error };
}

/* ============================================================
   WALLET / TOPUPS
   ============================================================ */
export async function fetchTopUps({ status = '' } = {}) {
  let q = supabase.from('topups').select('*, users(first_name, last_name, email)').order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  return { items: data || [], error };
}

export async function approveTopUp(id, userId, amount) {
  // 1. Mark topup as approved
  const { error: tErr } = await supabase.from('topups').update({ status: 'approved' }).eq('id', id);
  if (tErr) return { error: tErr };
  // 2. Credit user's wallet
  const { error: uErr } = await supabase.rpc('increment_wallet', { user_id: userId, amount });
  // Fallback if RPC doesn't exist: manually fetch & update
  if (uErr) {
    const { data: u } = await supabase.from('users').select('xwallet_balance').eq('id', userId).single();
    const newBal = Number(u?.xwallet_balance || 0) + Number(amount);
    await supabase.from('users').update({ xwallet_balance: newBal }).eq('id', userId);
  }
  return {};
}

export async function rejectTopUp(id) {
  const { error } = await supabase.from('topups').update({ status: 'rejected' }).eq('id', id);
  return { error };
}

/* ============================================================
   REPORTS
   ============================================================ */
export async function fetchReports({ status = '' } = {}) {
  let q = supabase.from('reports').select('*').order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  return { items: data || [], error };
}

export async function updateReport(id, patch) {
  const { error } = await supabase.from('reports').update(patch).eq('id', id);
  return { error };
}

/* ============================================================
   BOT MESSAGES (Chat viewer)
   ============================================================ */
export async function fetchBotMessages({ bot = 'support', limit = 100 } = {}) {
  const { data, error } = await supabase
    .from('bot_messages')
    .select('*')
    .eq('bot', bot)
    .order('created_at', { ascending: false })
    .limit(limit);
  return { items: (data || []).reverse(), error };
}

export async function sendBotTest(bot, text) {
  // Calls your backend endpoint
  const res = await fetch(`/api/admin/bot-test/${bot}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  return await res.json();
}

/* ============================================================
   PROMO CODES
   ============================================================ */
export async function fetchPromoCodes() {
  const { data, error } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false });
  return { items: data || [], error };
}

export async function createPromoCode(payload) {
  const { data, error } = await supabase.from('promo_codes').insert(payload).select().single();
  return { data, error };
}

export async function updatePromoCode(id, patch) {
  const { error } = await supabase.from('promo_codes').update(patch).eq('id', id);
  return { error };
}

export async function deletePromoCode(id) {
  const { error } = await supabase.from('promo_codes').delete().eq('id', id);
  return { error };
}

/* ============================================================
   RETURNS
   ============================================================ */
export async function fetchReturns() {
  const { data, error } = await supabase.from('returns').select('*').order('created_at', { ascending: false });
  return { items: data || [], error };
}

export async function updateReturn(id, patch) {
  const { error } = await supabase.from('returns').update(patch).eq('id', id);
  return { error };
}

/* ============================================================
   SELLERS
   ============================================================ */
export async function fetchSellers() {
  const { data, error } = await supabase.from('sellers').select('*').order('created_at', { ascending: false });
  return { items: data || [], error };
}

export async function updateSeller(id, patch) {
  const { error } = await supabase.from('sellers').update(patch).eq('id', id);
  return { error };
}

/* ============================================================
   BUNDLES
   ============================================================ */
export async function fetchBundles() {
  const { data, error } = await supabase.from('bundles').select('*').order('created_at', { ascending: false });
  return { items: data || [], error };
}

export async function createBundle(payload) {
  const { data, error } = await supabase.from('bundles').insert(payload).select().single();
  return { data, error };
}

export async function deleteBundle(id) {
  const { error } = await supabase.from('bundles').delete().eq('id', id);
  return { error };
}

/* ============================================================
   XCARDS
   ============================================================ */
export async function fetchXCards() {
  const { data, error } = await supabase.from('xcards').select('*').order('created_at', { ascending: false });
  return { items: data || [], error };
}

export async function createXCard(payload) {
  const { data, error } = await supabase.from('xcards').insert(payload).select().single();
  return { data, error };
}

export async function deleteXCard(id) {
  const { error } = await supabase.from('xcards').delete().eq('id', id);
  return { error };
}

/* ============================================================
   ORDER ITEMS (for Orders.jsx detail view)
   ============================================================ */
export async function fetchOrderItems(orderId) {
  const { data, error } = await supabase
    .from('order_items')
    .select('*, products(name, price)')
    .eq('order_id', orderId);
  return { items: data || [], error };
}

/* ============================================================
   EXTRA ALIASES (so any page import won't break the build)
   ============================================================ */
export const fetchXWallet = fetchTopUps;
export const fetchBotChat = fetchBotMessages;

/* Fallbacks for pages not yet fully wired */
export async function fetchWalletTransactions(opts = {}) {
  const { data, error } = await supabase.from('wallet_transactions').select('*').order('created_at', { ascending: false }).limit(200);
  return { items: data || [], error };
}
export async function fetchSettings() {
  const { data, error } = await supabase.from('settings').select('*');
  return { items: data || [], error };
}
export async function updateSettings(id, patch) {
  const { error } = await supabase.from('settings').update(patch).eq('id', id);
  return { error };
}
export async function fetchBots() {
  const { data, error } = await supabase.from('bots').select('*');
  return { items: data || [], error };
}
export async function updateBot(id, patch) {
  const { error } = await supabase.from('bots').update(patch).eq('id', id);
  return { error };
}
export async function fetchDashboard() { return fetchStats(); }

/* ============================================================
   MISSING EXPORTS — required by Wallet / Promos / Xcards / Bundles
   ============================================================ */

/* -------- WALLET TRANSACTIONS -------- */
export async function fetchAllTxns({ limit = 200 } = {}) {
  const { data, error } = await supabase
    .from('wallet_transactions')
    .select('*, users(first_name, last_name, email)')
    .order('created_at', { ascending: false })
    .limit(limit);
  return { items: data || [], error };
}

export async function adminCreditWallet(userId, amount, note = 'Admin credit') {
  const { data: u, error: fErr } = await supabase
    .from('users').select('xwallet_balance').eq('id', userId).single();
  if (fErr) return { error: fErr };
  const newBal = Number(u?.xwallet_balance || 0) + Number(amount);
  const { error: uErr } = await supabase
    .from('users').update({ xwallet_balance: newBal }).eq('id', userId);
  if (uErr) return { error: uErr };
  await supabase.from('wallet_transactions').insert({
    user_id: userId, amount: Number(amount), type: 'credit', note,
  });
  return {};
}

export async function adminDebitWallet(userId, amount, note = 'Admin debit') {
  const { data: u, error: fErr } = await supabase
    .from('users').select('xwallet_balance').eq('id', userId).single();
  if (fErr) return { error: fErr };
  const newBal = Math.max(0, Number(u?.xwallet_balance || 0) - Number(amount));
  const { error: uErr } = await supabase
    .from('users').update({ xwallet_balance: newBal }).eq('id', userId);
  if (uErr) return { error: uErr };
  await supabase.from('wallet_transactions').insert({
    user_id: userId, amount: -Math.abs(Number(amount)), type: 'debit', note,
  });
  return {};
}

/* -------- PROMOS (aliases) -------- */
export const fetchPromos = fetchPromoCodes;
export const deletePromo = deletePromoCode;
export async function upsertPromo(payload) {
  if (payload.id) {
    const { data, error } = await supabase
      .from('promo_codes').update(payload).eq('id', payload.id).select().single();
    return { data, error };
  }
  return createPromoCode(payload);
}

/* -------- XCARDS (aliases) -------- */
export const fetchAllXcards = fetchXCards;
export async function voidXcard(id) {
  const { error } = await supabase.from('xcards').update({ status: 'void' }).eq('id', id);
  return { error };
}

/* -------- BUNDLES (aliases) -------- */
export async function upsertBundle(payload) {
  if (payload.id) {
    const { data, error } = await supabase
      .from('bundles').update(payload).eq('id', payload.id).select().single();
    return { data, error };
  }
  return createBundle(payload);
}

/* -------- BOT TEST (alias) -------- */
export const sendTestBotMessage = sendBotTest;

/* ============================================================
   FINAL DEFENSIVE ALIASES (prevent future build breaks)
   ============================================================ */
export const fetchWalletTxns = fetchAllTxns;
export const fetchTransactions = fetchAllTxns;
export const fetchPromoCodesList = fetchPromoCodes;
export const fetchXCardList = fetchXCards;
export const fetchBotLog = fetchBotMessages;
