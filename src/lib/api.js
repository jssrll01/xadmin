import { supabase } from '../supabase.js';

// ============================================================
// STATS
// ============================================================
export async function fetchStats() {
  const [
    { count: users },
    { count: products },
    { count: orders },
    { count: pendingTopups },
    { count: pendingReturns },
    { count: openReports },
    { data: txns },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('xwallet_topups').select('*', { count: 'exact', head: true }).eq('status', 'awaiting_verification'),
    supabase.from('return_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('report_tickets').select('*', { count: 'exact', head: true }).neq('status', 'completed'),
    supabase.from('xwallet_txns').select('amount, created_at').order('created_at', { ascending: false }).limit(2000),
  ]);

  const revenue = (txns || [])
    .filter(t => t.amount > 0 && t.type === 'purchase')
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  return { users, products, orders, pendingTopups, pendingReturns, openReports, revenue };
}

export async function fetchRevenueSeries(days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await supabase
    .from('xwallet_txns')
    .select('amount, created_at, type')
    .gte('created_at', since)
    .eq('type', 'purchase');
  const byDay = {};
  (data || []).forEach(t => {
    const d = t.created_at.slice(0, 10);
    byDay[d] = (byDay[d] || 0) + Math.abs(Number(t.amount));
  });
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    out.push({ date: d.slice(5), revenue: +(byDay[d] || 0).toFixed(2) });
  }
  return out;
}

// ============================================================
// USERS
// ============================================================
export async function fetchUsers({ search = '', limit = 100 } = {}) {
  let q = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(limit);
  if (search) q = q.or(`username.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
  const { data, error } = await q;
  return { items: data || [], error };
}

export async function updateUser(id, patch) {
  return supabase.from('profiles').update(patch).eq('id', id);
}

export async function deleteUser(id) {
  return supabase.from('profiles').delete().eq('id', id);
}

// ============================================================
// PRODUCTS
// ============================================================
export async function fetchProducts({ search = '', store = '', limit = 200 } = {}) {
  let q = supabase.from('products').select('*').order('created_at', { ascending: false }).limit(limit);
  if (search) q = q.ilike('name', `%${search}%`);
  if (store) q = q.eq('store', store);
  const { data, error } = await q;
  return { items: data || [], error };
}

export async function updateProduct(id, patch) {
  return supabase.from('products').update(patch).eq('id', id);
}

export async function deleteProduct(id) {
  return supabase.from('products').delete().eq('id', id);
}

// ============================================================
// ORDERS
// ============================================================
export async function fetchOrders({ status = '', search = '', limit = 200 } = {}) {
  let q = supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(limit);
  if (status) q = q.eq('status', status);
  if (search) q = q.ilike('order_code', `%${search}%`);
  const { data, error } = await q;
  return { items: data || [], error };
}

export async function fetchOrderItems(orderId) {
  const { data } = await supabase.from('order_items').select('*').eq('order_id', orderId);
  return data || [];
}

export async function updateOrderStatus(orderId, status, note = '') {
  return supabase.from('orders').update({ status, admin_note: note }).eq('id', orderId);
}

// ============================================================
// TOP-UPS
// ============================================================
export async function fetchTopups({ status = '', limit = 200 } = {}) {
  let q = supabase.from('xwallet_topups').select('*').order('created_at', { ascending: false }).limit(limit);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  return { items: data || [], error };
}

export async function approveTopup(id, adminId, note = 'Approved') {
  return supabase.rpc('approve_topup', { topup_id: id, admin_id: adminId, note });
}

export async function rejectTopup(id, adminId, note = 'Rejected') {
  return supabase.from('xwallet_topups').update({ status: 'rejected', approved_by: adminId, admin_note: note }).eq('id', id);
}

// ============================================================
// RETURNS
// ============================================================
export async function fetchReturns({ status = '', limit = 200 } = {}) {
  let q = supabase.from('return_requests').select('*').order('created_at', { ascending: false }).limit(limit);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  return { items: data || [], error };
}

export async function updateReturn(id, patch) {
  return supabase.from('return_requests').update(patch).eq('id', id);
}

// ============================================================
// REPORTS
// ============================================================
export async function fetchReports({ category = '', status = '', limit = 200 } = {}) {
  let q = supabase.from('report_tickets').select('*').order('created_at', { ascending: false }).limit(limit);
  if (category) q = q.eq('category', category);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  return { items: data || [], error };
}

export async function updateReport(id, patch) {
  return supabase.from('report_tickets').update(patch).eq('id', id);
}

// ============================================================
// SELLERS
// ============================================================
export async function fetchSellers() {
  const { data } = await supabase.from('products').select('store, verified');
  const map = {};
  (data || []).forEach(p => {
    if (!p.store) return;
    if (!map[p.store]) map[p.store] = { name: p.store, products: 0, verified: !!p.verified };
    map[p.store].products += 1;
  });
  return Object.values(map).sort((a, b) => b.products - a.products);
}

// ============================================================
// WALLET
// ============================================================
export async function fetchAllTxns({ type = '', limit = 300 } = {}) {
  let q = supabase.from('xwallet_txns').select('*').order('created_at', { ascending: false }).limit(limit);
  if (type) q = q.eq('type', type);
  const { data, error } = await q;
  return { items: data || [], error };
}

export async function adminCreditWallet(userId, amount, note) {
  return supabase.rpc('xwallet_credit', { uid: userId, amt: amount, ttype: 'topup', ref: 'ADMIN', nt: note });
}

export async function adminDebitWallet(userId, amount, note) {
  return supabase.rpc('xwallet_debit', { uid: userId, amt: amount, ttype: 'purchase', ref: 'ADMIN', nt: note });
}

// ============================================================
// XCARDS
// ============================================================
export async function fetchAllXcards({ status = '', limit = 300 } = {}) {
  let q = supabase.from('xcards').select('*').order('created_at', { ascending: false }).limit(limit);
  if (status === 'active') q = q.eq('active', true).is('redeemed_by', null);
  if (status === 'redeemed') q = q.not('redeemed_by', 'is', null);
  const { data, error } = await q;
  return { items: data || [], error };
}

export async function voidXcard(id) {
  return supabase.from('xcards').update({ active: false }).eq('id', id);
}

// ============================================================
// PROMO CODES
// ============================================================
export async function fetchPromos() {
  const { data } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false });
  return data || [];
}

export async function upsertPromo(promo) {
  return supabase.from('promo_codes').upsert(promo, { onConflict: 'code' });
}

export async function deletePromo(code) {
  return supabase.from('promo_codes').delete().eq('code', code);
}

// ============================================================
// BUNDLES
// ============================================================
export async function fetchBundles() {
  const { data } = await supabase.from('bundles').select('*').order('created_at', { ascending: false });
  return data || [];
}

export async function upsertBundle(bundle) {
  return bundle.id
    ? supabase.from('bundles').update(bundle).eq('id', bundle.id)
    : supabase.from('bundles').insert(bundle);
}

export async function deleteBundle(id) {
  return supabase.from('bundles').delete().eq('id', id);
}

// ============================================================
// BOT MESSAGES (for Bots page)
// ============================================================
export async function fetchBotMessages({ bot = '', limit = 100 } = {}) {
  let q = supabase.from('bot_messages').select('*').order('created_at', { ascending: false }).limit(limit);
  if (bot) q = q.eq('bot', bot);
  const { data, error } = await q;
  return { items: data || [], error };
}

export async function sendTestBotMessage(bot, text) {
  const API = 'https://xmarket-telegram-bot.onrender.com/api/admin/bot-test';
  return fetch(`${API}/${bot}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  }).then(r => r.json()).catch(e => ({ error: e.message }));
}
