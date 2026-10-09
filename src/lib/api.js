import { supabase } from '../supabase.js';

/* ============================================================
   ON-SCREEN ERROR LOGGER — visible on every page
   ============================================================ */
if (typeof window !== 'undefined') {
  window.__XADMIN_ERRORS = window.__XADMIN_ERRORS || [];
  window.__xadminLog = function (msg) {
    window.__XADMIN_ERRORS.push(msg);
    console.error('[XADMIN]', msg);
    const el = document.getElementById('__xadmin_err');
    if (el) {
      el.style.display = 'block';
      el.textContent = 'API ERRORS:\n' + window.__XADMIN_ERRORS.slice(-6).join('\n');
    }
  };
}

async function q(name, fn) {
  try {
    const r = await fn();
    if (r.error) window.__xadminLog?.(`${name}: ${r.error.message}`);
    return r;
  } catch (e) {
    window.__xadminLog?.(`${name} CRASH: ${e.message}`);
    return { items: [], error: e };
  }
}

const T = {
  users: 'profiles', products: 'products', orders: 'orders',
  order_items: 'order_items', topups: 'xwallet_topups',
  wallet_transactions: 'xwallet_txns', promo_codes: 'promo_codes',
  returns: 'return_requests', sellers: 'profiles', bundles: 'bundles',
  xcards: 'xcards', reports: 'report_tickets', bot_messages: 'bot_messages',
};

/* ============================================================
   DASHBOARD
   ============================================================ */
export async function fetchStats() {
  const [u, o, p, t, r] = await Promise.all([
    q('stats.users',  () => supabase.from(T.users).select('*', { count: 'exact', head: true })),
    q('stats.orders', () => supabase.from(T.orders).select('*', { count: 'exact' })),
    q('stats.prods',  () => supabase.from(T.products).select('*', { count: 'exact', head: true })),
    q('stats.topups', () => supabase.from(T.topups).select('*', { count: 'exact' })),
    q('stats.reports',() => supabase.from(T.reports).select('*', { count: 'exact' })),
  ]);
  const revenue = (o.data || []).reduce((s, x) =>
    s + Number(x.total || x.amount || x.total_amount || x.subtotal || 0), 0);
  return {
    revenue,
    orders: o.count || 0,
    users: u.count || 0,
    products: p.count || 0,
    pendingTopups: (t.data || []).filter(x => x.status === 'pending').length,
    openReports: (r.data || []).filter(x => ['open','pending','new'].includes(x.status)).length,
  };
}

export async function fetchRevenueSeries(days = 30) {
  const since = new Date(); since.setDate(since.getDate() - days);
  const { data } = await q('revenue', () =>
    supabase.from(T.orders).select('*').gte('created_at', since.toISOString()));
  const map = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
    map[d.toISOString().slice(0, 10)] = 0;
  }
  (data || []).forEach(o => {
    const k = o.created_at?.slice(0, 10);
    if (k && map[k] !== undefined)
      map[k] += Number(o.total || o.amount || o.total_amount || o.subtotal || 0);
  });
  return Object.entries(map).map(([date, revenue]) => ({ date, revenue }));
}

/* ============================================================
   USERS
   ============================================================ */
export async function fetchUsers({ search = '', limit = 100 } = {}) {
  let query = supabase.from(T.users).select('*').limit(limit);
  if (search) query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
  const { data, error } = await q('fetchUsers', () => query);
  return { items: data || [], error };
}
export async function updateUser(id, patch) {
  const { error } = await q('updateUser', () => supabase.from(T.users).update(patch).eq('id', id));
  return { error };
}
export async function deleteUser(id) {
  const { error } = await q('deleteUser', () => supabase.from(T.users).delete().eq('id', id));
  return { error };
}

/* ============================================================
   PRODUCTS
   ============================================================ */
export async function fetchProducts() {
  const { data, error } = await q('fetchProducts', () => supabase.from(T.products).select('*'));
  return { items: data || [], error };
}
export async function createProduct(payload) {
  const { data, error } = await q('createProduct', () =>
    supabase.from(T.products).insert(payload).select().single());
  return { data, error };
}
export async function updateProduct(id, patch) {
  const { error } = await q('updateProduct', () =>
    supabase.from(T.products).update(patch).eq('id', id));
  return { error };
}
export async function deleteProduct(id) {
  const { error } = await q('deleteProduct', () => supabase.from(T.products).delete().eq('id', id));
  return { error };
}

/* ============================================================
   ORDERS
   ============================================================ */
export async function fetchOrders({ status = '' } = {}) {
  let query = supabase.from(T.orders).select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await q('fetchOrders', () => query);
  return { items: data || [], error };
}
export async function updateOrderStatus(id, status) {
  const { error } = await q('updateOrderStatus', () =>
    supabase.from(T.orders).update({ status }).eq('id', id));
  return { error };
}
export async function fetchOrderItems(orderId) {
  const { data, error } = await q('fetchOrderItems', () =>
    supabase.from(T.order_items).select('*').eq('order_id', orderId));
  return { items: data || [], error };
}

/* ============================================================
   TOPUPS
   ============================================================ */
export async function fetchTopUps({ status = '' } = {}) {
  let query = supabase.from(T.topups).select('*');
  if (status) query = query.eq('status', status);
  const { data, error } = await q('fetchTopUps', () => query);
  return { items: data || [], error };
}
export async function approveTopUp(id, userId, amount) {
  const { error: tErr } = await q('approveTopUp', () =>
    supabase.from(T.topups).update({ status: 'approved' }).eq('id', id));
  if (tErr) return { error: tErr };
  await supabase.from(T.wallet_transactions).insert({
    user_id: userId, amount: Number(amount), type: 'topup',
  });
  return {};
}
export async function rejectTopUp(id) {
  const { error } = await q('rejectTopUp', () =>
    supabase.from(T.topups).update({ status: 'rejected' }).eq('id', id));
  return { error };
}

/* ============================================================
   WALLET
   ============================================================ */
export async function fetchAllTxns({ limit = 200 } = {}) {
  const { data, error } = await q('fetchAllTxns', () =>
    supabase.from(T.wallet_transactions).select('*').limit(limit));
  return { items: data || [], error };
}
export async function adminCreditWallet(userId, amount, note = 'Admin credit') {
  const { error } = await q('adminCreditWallet', () =>
    supabase.from(T.wallet_transactions).insert({
      user_id: userId, amount: Number(amount), type: 'credit', note,
    }));
  return { error };
}
export async function adminDebitWallet(userId, amount, note = 'Admin debit') {
  const { error } = await q('adminDebitWallet', () =>
    supabase.from(T.wallet_transactions).insert({
      user_id: userId, amount: -Math.abs(Number(amount)), type: 'debit', note,
    }));
  return { error };
}

/* ============================================================
   REPORTS
   ============================================================ */
export async function fetchReports({ status = '' } = {}) {
  let query = supabase.from(T.reports).select('*');
  if (status) query = query.eq('status', status);
  const { data, error } = await q('fetchReports', () => query);
  return { items: data || [], error };
}
export async function updateReport(id, patch) {
  const { error } = await q('updateReport', () =>
    supabase.from(T.reports).update(patch).eq('id', id));
  return { error };
}

/* ============================================================
   BOTS
   ============================================================ */
export async function fetchBotMessages({ bot = 'support', limit = 100 } = {}) {
  let query = supabase.from(T.bot_messages).select('*').limit(limit);
  if (bot) query = query.eq('bot', bot);
  const { data, error } = await q('fetchBotMessages', () => query);
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
   PROMOS / RETURNS / SELLERS / BUNDLES / XCARDS
   ============================================================ */
export async function fetchPromoCodes() {
  const { data, error } = await q('fetchPromoCodes', () => supabase.from(T.promo_codes).select('*'));
  return { items: data || [], error };
}
export async function createPromoCode(payload) {
  const { data, error } = await q('createPromoCode', () =>
    supabase.from(T.promo_codes).insert(payload).select().single());
  return { data, error };
}
export async function updatePromoCode(id, patch) {
  const { error } = await q('updatePromoCode', () =>
    supabase.from(T.promo_codes).update(patch).eq('id', id));
  return { error };
}
export async function deletePromoCode(id) {
  const { error } = await q('deletePromoCode', () => supabase.from(T.promo_codes).delete().eq('id', id));
  return { error };
}
export async function fetchReturns() {
  const { data, error } = await q('fetchReturns', () => supabase.from(T.returns).select('*'));
  return { items: data || [], error };
}
export async function updateReturn(id, patch) {
  const { error } = await q('updateReturn', () =>
    supabase.from(T.returns).update(patch).eq('id', id));
  return { error };
}
export async function fetchSellers() {
  const { data, error } = await q('fetchSellers', () => supabase.from(T.sellers).select('*'));
  return { items: data || [], error };
}
export async function updateSeller(id, patch) {
  const { error } = await q('updateSeller', () =>
    supabase.from(T.sellers).update(patch).eq('id', id));
  return { error };
}
export async function fetchBundles() {
  const { data, error } = await q('fetchBundles', () => supabase.from(T.bundles).select('*'));
  return { items: data || [], error };
}
export async function createBundle(payload) {
  const { data, error } = await q('createBundle', () =>
    supabase.from(T.bundles).insert(payload).select().single());
  return { data, error };
}
export async function deleteBundle(id) {
  const { error } = await q('deleteBundle', () => supabase.from(T.bundles).delete().eq('id', id));
  return { error };
}
export async function upsertBundle(payload) {
  if (payload.id) {
    const { data, error } = await q('upsertBundle', () =>
      supabase.from(T.bundles).update(payload).eq('id', payload.id).select().single());
    return { data, error };
  }
  return createBundle(payload);
}
export async function fetchXCards() {
  const { data, error } = await q('fetchXCards', () => supabase.from(T.xcards).select('*'));
  return { items: data || [], error };
}
export async function createXCard(payload) {
  const { data, error } = await q('createXCard', () =>
    supabase.from(T.xcards).insert(payload).select().single());
  return { data, error };
}
export async function deleteXCard(id) {
  const { error } = await q('deleteXCard', () => supabase.from(T.xcards).delete().eq('id', id));
  return { error };
}
export async function voidXcard(id) {
  const { error } = await q('voidXcard', () =>
    supabase.from(T.xcards).update({ status: 'void' }).eq('id', id));
  return { error };
}

/* ============================================================
   ALIASES
   ============================================================ */
export const fetchPromos = fetchPromoCodes;
export const deletePromo = deletePromoCode;
export async function upsertPromo(payload) {
  if (payload.id) {
    const { data, error } = await q('upsertPromo', () =>
      supabase.from(T.promo_codes).update(payload).eq('id', payload.id).select().single());
    return { data, error };
  }
  return createPromoCode(payload);
}
export const fetchAllXcards = fetchXCards;
export const sendTestBotMessage = sendBotTest;
export const fetchWalletTransactions = fetchAllTxns;
export const fetchWalletTxns = fetchAllTxns;
export const fetchTransactions = fetchAllTxns;
export const fetchPromoCodesList = fetchPromoCodes;
export const fetchXCardList = fetchXCards;
export const fetchBotLog = fetchBotMessages;
export const fetchXWallet = fetchTopUps;
export const fetchBotChat = fetchBotMessages;
export async function fetchSettings() { return { items: [], error: null }; }
export async function updateSettings() { return {}; }
export async function fetchBots() { return fetchBotMessages({ bot: '' }); }
export async function updateBot() { return {}; }
export async function fetchDashboard() { return fetchStats(); }
