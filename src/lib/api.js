import { supabase } from '../supabase.js';

/* ============================================================
   DYNAMIC TABLE RESOLVER
   Detects real table names once, caches the result.
   ============================================================ */
let _tables = null;
async function getTables() {
  if (_tables) return _tables;
  try {
    const { data, error } = await supabase.rpc('xadmin_list_tables').select('*');
    if (error) throw error;
    _tables = new Set((data || []).map(r => r.table_name || r));
  } catch {
    // Fallback: assume common names
    _tables = new Set([
      'profiles','users','accounts','user_profiles',
      'wallets','balances','wallet_balances',
      'topups','wallet_topups','top_up_requests',
      'wallet_transactions','wallet_ledger','transactions','ledger',
      'returns','refunds','return_requests',
      'sellers','merchants','vendors','shops',
      'reports','user_reports','complaints','tickets',
      'products','orders','order_items','promo_codes','promos',
      'bundles','xcards','bot_messages','banners','carts','cart_items',
      'loyalty_ledger','loyalty_vouchers','notifications','settings','bots'
    ]);
  }
  return _tables;
}

async function pick(...candidates) {
  const tables = await getTables();
  for (const c of candidates) if (tables.has(c)) return c;
  return candidates[0]; // fallback to first, will error visibly
}

/* ============================================================
   DASHBOARD STATS
   ============================================================ */
export async function fetchStats() {
  try {
    const uT = await pick('profiles', 'users', 'accounts', 'user_profiles');
    const oT = await pick('orders');
    const pT = await pick('products');
    const tT = await pick('topups', 'wallet_topups', 'top_up_requests');
    const rT = await pick('reports', 'user_reports', 'complaints', 'tickets');

    const [users, orders, products, topups, reports] = await Promise.all([
      supabase.from(uT).select('id', { count: 'exact', head: true }),
      supabase.from(oT).select('id, total', { count: 'exact' }),
      supabase.from(pT).select('id', { count: 'exact', head: true }),
      supabase.from(tT).select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from(rT).select('id', { count: 'exact' }).eq('status', 'open'),
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
    const oT = await pick('orders');
    const since = new Date();
    since.setDate(since.getDate() - days);
    const { data, error } = await supabase
      .from(oT).select('created_at, total')
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
   USERS / PROFILES
   ============================================================ */
export async function fetchUsers({ search = '', limit = 100 } = {}) {
  const T = await pick('profiles', 'users', 'accounts', 'user_profiles');
  let q = supabase.from(T).select('*').order('created_at', { ascending: false }).limit(limit);
  if (search) q = q.or(`username.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
  const { data, error } = await q;
  return { items: data || [], error };
}
export async function updateUser(id, patch) {
  const T = await pick('profiles', 'users', 'accounts', 'user_profiles');
  const { error } = await supabase.from(T).update(patch).eq('id', id);
  return { error };
}
export async function deleteUser(id) {
  const T = await pick('profiles', 'users', 'accounts', 'user_profiles');
  const { error } = await supabase.from(T).delete().eq('id', id);
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
  const uT = await pick('profiles', 'users', 'accounts', 'user_profiles');
  let q = supabase.from('orders').select(`*, ${uT}(first_name, last_name, email)`).order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  return { items: data || [], error };
}
export async function updateOrderStatus(id, status) {
  const { error } = await supabase.from('orders').update({ status }).eq('id', id);
  return { error };
}
export async function fetchOrderItems(orderId) {
  const { data, error } = await supabase
    .from('order_items').select('*, products(name, price)').eq('order_id', orderId);
  return { items: data || [], error };
}

/* ============================================================
   TOPUPS
   ============================================================ */
export async function fetchTopUps({ status = '' } = {}) {
  const T = await pick('topups', 'wallet_topups', 'top_up_requests');
  const uT = await pick('profiles', 'users', 'accounts', 'user_profiles');
  let q = supabase.from(T).select(`*, ${uT}(first_name, last_name, email)`).order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  return { items: data || [], error };
}
export async function approveTopUp(id, userId, amount) {
  const T = await pick('topups', 'wallet_topups', 'top_up_requests');
  const uT = await pick('profiles', 'users', 'accounts', 'user_profiles');
  const { error: tErr } = await supabase.from(T).update({ status: 'approved' }).eq('id', id);
  if (tErr) return { error: tErr };
  const { data: u } = await supabase.from(uT).select('xwallet_balance').eq('id', userId).single();
  const newBal = Number(u?.xwallet_balance || 0) + Number(amount);
  const { error: uErr } = await supabase.from(uT).update({ xwallet_balance: newBal }).eq('id', userId);
  return { error: uErr };
}
export async function rejectTopUp(id) {
  const T = await pick('topups', 'wallet_topups', 'top_up_requests');
  const { error } = await supabase.from(T).update({ status: 'rejected' }).eq('id', id);
  return { error };
}

/* ============================================================
   WALLET
   ============================================================ */
export async function fetchAllTxns({ limit = 200 } = {}) {
  const T = await pick('wallet_transactions', 'wallet_ledger', 'transactions', 'ledger');
  const uT = await pick('profiles', 'users', 'accounts', 'user_profiles');
  const { data, error } = await supabase
    .from(T).select(`*, ${uT}(first_name, last_name, email)`)
    .order('created_at', { ascending: false }).limit(limit);
  return { items: data || [], error };
}
export async function adminCreditWallet(userId, amount, note = 'Admin credit') {
  const uT = await pick('profiles', 'users', 'accounts', 'user_profiles');
  const tT = await pick('wallet_transactions', 'wallet_ledger', 'transactions', 'ledger');
  const { data: u, error: fErr } = await supabase.from(uT).select('xwallet_balance').eq('id', userId).single();
  if (fErr) return { error: fErr };
  const newBal = Number(u?.xwallet_balance || 0) + Number(amount);
  const { error: uErr } = await supabase.from(uT).update({ xwallet_balance: newBal }).eq('id', userId);
  if (uErr) return { error: uErr };
  await supabase.from(tT).insert({ user_id: userId, amount: Number(amount), type: 'credit', note });
  return {};
}
export async function adminDebitWallet(userId, amount, note = 'Admin debit') {
  const uT = await pick('profiles', 'users', 'accounts', 'user_profiles');
  const tT = await pick('wallet_transactions', 'wallet_ledger', 'transactions', 'ledger');
  const { data: u, error: fErr } = await supabase.from(uT).select('xwallet_balance').eq('id', userId).single();
  if (fErr) return { error: fErr };
  const newBal = Math.max(0, Number(u?.xwallet_balance || 0) - Number(amount));
  const { error: uErr } = await supabase.from(uT).update({ xwallet_balance: newBal }).eq('id', userId);
  if (uErr) return { error: uErr };
  await supabase.from(tT).insert({ user_id: userId, amount: -Math.abs(Number(amount)), type: 'debit', note });
  return {};
}

/* ============================================================
   REPORTS
   ============================================================ */
export async function fetchReports({ status = '' } = {}) {
  const T = await pick('reports', 'user_reports', 'complaints', 'tickets');
  let q = supabase.from(T).select('*').order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  return { items: data || [], error };
}
export async function updateReport(id, patch) {
  const T = await pick('reports', 'user_reports', 'complaints', 'tickets');
  const { error } = await supabase.from(T).update(patch).eq('id', id);
  return { error };
}

/* ============================================================
   BOT MESSAGES
   ============================================================ */
export async function fetchBotMessages({ bot = 'support', limit = 100 } = {}) {
  const { data, error } = await supabase
    .from('bot_messages').select('*').eq('bot', bot)
    .order('created_at', { ascending: false }).limit(limit);
  return { items: (data || []).reverse(), error };
}
export async function sendBotTest(bot, text) {
  try {
    const res = await fetch(`/api/admin/bot-test/${bot}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    return await res.json();
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/* ============================================================
   PROMOS
   ============================================================ */
export async function fetchPromoCodes() {
  const T = await pick('promo_codes', 'promos');
  const { data, error } = await supabase.from(T).select('*').order('created_at', { ascending: false });
  return { items: data || [], error };
}
export async function createPromoCode(payload) {
  const T = await pick('promo_codes', 'promos');
  const { data, error } = await supabase.from(T).insert(payload).select().single();
  return { data, error };
}
export async function updatePromoCode(id, patch) {
  const T = await pick('promo_codes', 'promos');
  const { error } = await supabase.from(T).update(patch).eq('id', id);
  return { error };
}
export async function deletePromoCode(id) {
  const T = await pick('promo_codes', 'promos');
  const { error } = await supabase.from(T).delete().eq('id', id);
  return { error };
}

/* ============================================================
   RETURNS
   ============================================================ */
export async function fetchReturns() {
  const T = await pick('returns', 'refunds', 'return_requests');
  const { data, error } = await supabase.from(T).select('*').order('created_at', { ascending: false });
  return { items: data || [], error };
}
export async function updateReturn(id, patch) {
  const T = await pick('returns', 'refunds', 'return_requests');
  const { error } = await supabase.from(T).update(patch).eq('id', id);
  return { error };
}

/* ============================================================
   SELLERS
   ============================================================ */
export async function fetchSellers() {
  const T = await pick('sellers', 'merchants', 'vendors', 'shops');
  const { data, error } = await supabase.from(T).select('*').order('created_at', { ascending: false });
  return { items: data || [], error };
}
export async function updateSeller(id, patch) {
  const T = await pick('sellers', 'merchants', 'vendors', 'shops');
  const { error } = await supabase.from(T).update(patch).eq('id', id);
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
export async function upsertBundle(payload) {
  if (payload.id) {
    const { data, error } = await supabase.from('bundles').update(payload).eq('id', payload.id).select().single();
    return { data, error };
  }
  return createBundle(payload);
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
export async function voidXcard(id) {
  const { error } = await supabase.from('xcards').update({ status: 'void' }).eq('id', id);
  return { error };
}

/* ============================================================
   PROMOS / XCARDS / BUNDLES / BOTS — ALIASES
   ============================================================ */
export const fetchPromos = fetchPromoCodes;
export const deletePromo = deletePromoCode;
export async function upsertPromo(payload) {
  if (payload.id) {
    const T = await pick('promo_codes', 'promos');
    const { data, error } = await supabase.from(T).update(payload).eq('id', payload.id).select().single();
    return { data, error };
  }
  return createPromoCode(payload);
}

export const fetchAllXcards = fetchXCards;
export const sendTestBotMessage = sendBotTest;

/* ============================================================
   SETTINGS / BOTS
   ============================================================ */
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
export async function fetchWalletTransactions(opts = {}) { return fetchAllTxns(opts); }
export const fetchWalletTxns = fetchAllTxns;
export const fetchTransactions = fetchAllTxns;
export const fetchPromoCodesList = fetchPromoCodes;
export const fetchXCardList = fetchXCards;
export const fetchBotLog = fetchBotMessages;
export const fetchXWallet = fetchTopUps;
export const fetchBotChat = fetchBotMessages;
