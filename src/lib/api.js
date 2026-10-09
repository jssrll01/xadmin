import { supabase } from '../supabase.js';

/* ============================================================
   TABLE MAP — edit these if your real table names differ.
   ============================================================ */
const T = {
  users:               'profiles',
  products:            'products',
  orders:              'orders',
  order_items:         'order_items',
  topups:              'xwallet_topups',
  wallet_transactions: 'xwallet_txns',
  promo_codes:         'promo_codes',
  returns:             'return_requests',
  sellers:             'profiles',
  bundles:             'bundles',
  xcards:              'xcards',
  reports:             'report_tickets',
  bot_messages:        'bot_messages',
  settings:            'profiles',
  bots:                'bot_messages',
};

/* ============================================================
   DASHBOARD
   ============================================================ */
export async function fetchStats() {
  try {
    const [u, o, p, t, r] = await Promise.all([
      supabase.from(T.users).select('id', { count: 'exact', head: true }),
      supabase.from(T.orders).select('id, total', { count: 'exact' }),
      supabase.from(T.products).select('id', { count: 'exact', head: true }),
      supabase.from(T.topups).select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from(T.reports).select('id', { count: 'exact' }).eq('status', 'open'),
    ]);
    const revenue = (o.data || []).reduce((s, x) => s + Number(x.total || 0), 0);
    return {
      revenue,
      orders: o.count || 0,
      users: u.count || 0,
      products: p.count || 0,
      pendingTopups: t.count || 0,
      openReports: r.count || 0,
    };
  } catch (err) {
    console.error('fetchStats:', err);
    return { revenue: 0, orders: 0, users: 0, products: 0, pendingTopups: 0, openReports: 0 };
  }
}

export async function fetchRevenueSeries(days = 30) {
  const since = new Date(); since.setDate(since.getDate() - days);
  const { data } = await supabase.from(T.orders)
    .select('created_at, total').gte('created_at', since.toISOString());
  const map = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
    map[d.toISOString().slice(0, 10)] = 0;
  }
  (data || []).forEach(o => {
    const k = o.created_at?.slice(0, 10);
    if (k && map[k] !== undefined) map[k] += Number(o.total || 0);
  });
  return Object.entries(map).map(([date, revenue]) => ({ date, revenue }));
}

/* ============================================================
   USERS
   ============================================================ */
export async function fetchUsers({ search = '', limit = 100 } = {}) {
  let q = supabase.from(T.users).select('*').order('created_at', { ascending: false }).limit(limit);
  if (search) q = q.or(`username.ilike.%${search}%,email.ilike.%${search}%,first_name.ilike.%${search}%`);
  const { data, error } = await q;
  return { items: data || [], error };
}
export async function updateUser(id, patch) {
  const { error } = await supabase.from(T.users).update(patch).eq('id', id);
  return { error };
}
export async function deleteUser(id) {
  const { error } = await supabase.from(T.users).delete().eq('id', id);
  return { error };
}

/* ============================================================
   PRODUCTS
   ============================================================ */
export async function fetchProducts() {
  const { data, error } = await supabase.from(T.products).select('*').order('created_at', { ascending: false });
  return { items: data || [], error };
}
export async function createProduct(payload) {
  const { data, error } = await supabase.from(T.products).insert(payload).select().single();
  return { data, error };
}
export async function updateProduct(id, patch) {
  const { error } = await supabase.from(T.products).update(patch).eq('id', id);
  return { error };
}
export async function deleteProduct(id) {
  const { error } = await supabase.from(T.products).delete().eq('id', id);
  return { error };
}

/* ============================================================
   ORDERS
   ============================================================ */
export async function fetchOrders({ status = '' } = {}) {
  let q = supabase.from(T.orders).select('*').order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  return { items: data || [], error };
}
export async function updateOrderStatus(id, status) {
  const { error } = await supabase.from(T.orders).update({ status }).eq('id', id);
  return { error };
}
export async function fetchOrderItems(orderId) {
  const { data, error } = await supabase.from(T.order_items).select('*').eq('order_id', orderId);
  return { items: data || [], error };
}

/* ============================================================
   TOPUPS
   ============================================================ */
export async function fetchTopUps({ status = '' } = {}) {
  let q = supabase.from(T.topups).select('*').order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  return { items: data || [], error };
}
export async function approveTopUp(id, userId, amount) {
  const { error: tErr } = await supabase.from(T.topups).update({ status: 'approved' }).eq('id', id);
  if (tErr) return { error: tErr };
  const { data: u } = await supabase.from(T.users).select('xwallet_balance').eq('id', userId).single();
  const newBal = Number(u?.xwallet_balance || 0) + Number(amount);
  const { error: uErr } = await supabase.from(T.users).update({ xwallet_balance: newBal }).eq('id', userId);
  return { error: uErr };
}
export async function rejectTopUp(id) {
  const { error } = await supabase.from(T.topups).update({ status: 'rejected' }).eq('id', id);
  return { error };
}

/* ============================================================
   WALLET
   ============================================================ */
export async function fetchAllTxns({ limit = 200 } = {}) {
  const { data, error } = await supabase.from(T.wallet_transactions).select('*')
    .order('created_at', { ascending: false }).limit(limit);
  return { items: data || [], error };
}
export async function adminCreditWallet(userId, amount, note = 'Admin credit') {
  const { data: u, error: fErr } = await supabase.from(T.users).select('xwallet_balance').eq('id', userId).single();
  if (fErr) return { error: fErr };
  const newBal = Number(u?.xwallet_balance || 0) + Number(amount);
  const { error: uErr } = await supabase.from(T.users).update({ xwallet_balance: newBal }).eq('id', userId);
  if (uErr) return { error: uErr };
  await supabase.from(T.wallet_transactions).insert({ user_id: userId, amount: Number(amount), type: 'credit', note });
  return {};
}
export async function adminDebitWallet(userId, amount, note = 'Admin debit') {
  const { data: u, error: fErr } = await supabase.from(T.users).select('xwallet_balance').eq('id', userId).single();
  if (fErr) return { error: fErr };
  const newBal = Math.max(0, Number(u?.xwallet_balance || 0) - Number(amount));
  const { error: uErr } = await supabase.from(T.users).update({ xwallet_balance: newBal }).eq('id', userId);
  if (uErr) return { error: uErr };
  await supabase.from(T.wallet_transactions).insert({ user_id: userId, amount: -Math.abs(Number(amount)), type: 'debit', note });
  return {};
}

/* ============================================================
   REPORTS
   ============================================================ */
export async function fetchReports({ status = '' } = {}) {
  let q = supabase.from(T.reports).select('*').order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  return { items: data || [], error };
}
export async function updateReport(id, patch) {
  const { error } = await supabase.from(T.reports).update(patch).eq('id', id);
  return { error };
}

/* ============================================================
   BOT MESSAGES
   ============================================================ */
export async function fetchBotMessages({ bot = 'support', limit = 100 } = {}) {
  const { data, error } = await supabase.from(T.bot_messages).select('*')
    .eq('bot', bot).order('created_at', { ascending: false }).limit(limit);
  return { items: (data || []).reverse(), error };
}
export async function sendBotTest(bot, text) {
  try {
    const res = await fetch(`/api/admin/bot-test/${bot}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    return await res.json();
  } catch (err) { return { ok: false, error: err.message }; }
}

/* ============================================================
   PROMOS
   ============================================================ */
export async function fetchPromoCodes() {
  const { data, error } = await supabase.from(T.promo_codes).select('*').order('created_at', { ascending: false });
  return { items: data || [], error };
}
export async function createPromoCode(payload) {
  const { data, error } = await supabase.from(T.promo_codes).insert(payload).select().single();
  return { data, error };
}
export async function updatePromoCode(id, patch) {
  const { error } = await supabase.from(T.promo_codes).update(patch).eq('id', id);
  return { error };
}
export async function deletePromoCode(id) {
  const { error } = await supabase.from(T.promo_codes).delete().eq('id', id);
  return { error };
}

/* ============================================================
   RETURNS
   ============================================================ */
export async function fetchReturns() {
  const { data, error } = await supabase.from(T.returns).select('*').order('created_at', { ascending: false });
  return { items: data || [], error };
}
export async function updateReturn(id, patch) {
  const { error } = await supabase.from(T.returns).update(patch).eq('id', id);
  return { error };
}

/* ============================================================
   SELLERS
   ============================================================ */
export async function fetchSellers() {
  const { data, error } = await supabase.from(T.sellers).select('*').order('created_at', { ascending: false });
  return { items: data || [], error };
}
export async function updateSeller(id, patch) {
  const { error } = await supabase.from(T.sellers).update(patch).eq('id', id);
  return { error };
}

/* ============================================================
   BUNDLES
   ============================================================ */
export async function fetchBundles() {
  const { data, error } = await supabase.from(T.bundles).select('*').order('created_at', { ascending: false });
  return { items: data || [], error };
}
export async function createBundle(payload) {
  const { data, error } = await supabase.from(T.bundles).insert(payload).select().single();
  return { data, error };
}
export async function deleteBundle(id) {
  const { error } = await supabase.from(T.bundles).delete().eq('id', id);
  return { error };
}
export async function upsertBundle(payload) {
  if (payload.id) {
    const { data, error } = await supabase.from(T.bundles).update(payload).eq('id', payload.id).select().single();
    return { data, error };
  }
  return createBundle(payload);
}

/* ============================================================
   XCARDS
   ============================================================ */
export async function fetchXCards() {
  const { data, error } = await supabase.from(T.xcards).select('*').order('created_at', { ascending: false });
  return { items: data || [], error };
}
export async function createXCard(payload) {
  const { data, error } = await supabase.from(T.xcards).insert(payload).select().single();
  return { data, error };
}
export async function deleteXCard(id) {
  const { error } = await supabase.from(T.xcards).delete().eq('id', id);
  return { error };
}
export async function voidXcard(id) {
  const { error } = await supabase.from(T.xcards).update({ status: 'void' }).eq('id', id);
  return { error };
}

/* ============================================================
   ALIASES
   ============================================================ */
export const fetchPromos = fetchPromoCodes;
export const deletePromo = deletePromoCode;
export async function upsertPromo(payload) {
  if (payload.id) {
    const { data, error } = await supabase.from(T.promo_codes).update(payload).eq('id', payload.id).select().single();
    return { data, error };
  }
  return createPromoCode(payload);
}
export const fetchAllXcards = fetchXCards;
export const sendTestBotMessage = sendBotTest;

/* ============================================================
   SETTINGS / BOTS / MISC
   ============================================================ */
export async function fetchSettings() {
  const { data, error } = await supabase.from(T.settings).select('*');
  return { items: data || [], error };
}
export async function updateSettings(id, patch) {
  const { error } = await supabase.from(T.settings).update(patch).eq('id', id);
  return { error };
}
export async function fetchBots() {
  const { data, error } = await supabase.from(T.bots).select('*');
  return { items: data || [], error };
}
export async function updateBot(id, patch) {
  const { error } = await supabase.from(T.bots).update(patch).eq('id', id);
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
