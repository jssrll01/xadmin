import { supabase } from '../supabase.js';

const T = {
  users: 'profiles', products: 'products', orders: 'orders',
  order_items: 'order_items', topups: 'xwallet_topups',
  wallet: 'xwallet_txns', promos: 'promo_codes',
  returns: 'return_requests', bundles: 'bundles',
  xcards: 'xcards', reports: 'report_tickets', bots: 'bot_messages',
};

async function safe(table, build) {
  try {
    const { data, error } = await build(supabase.from(table));
    return { items: Array.isArray(data) ? data : [], error };
  } catch (e) {
    return { items: [], error: e };
  }
}

export const fetchProducts    = () => safe(T.products, (q) => q.select('*'));
export const fetchOrders      = () => safe(T.orders,   (q) => q.select('*').order('created_at', { ascending: false }));
export const fetchUsers       = () => safe(T.users,    (q) => q.select('*'));
export const fetchTopUps      = () => safe(T.topups,   (q) => q.select('*'));
export const fetchWallet      = () => safe(T.wallet,   (q) => q.select('*'));
export const fetchPromos      = () => safe(T.promos,   (q) => q.select('*'));
export const fetchReturns     = () => safe(T.returns,  (q) => q.select('*'));
export const fetchBundles     = () => safe(T.bundles,  (q) => q.select('*'));
export const fetchXCards      = () => safe(T.xcards,   (q) => q.select('*'));
export const fetchReports     = () => safe(T.reports,  (q) => q.select('*'));
export const fetchBotMessages = () => safe(T.bots,     (q) => q.select('*'));
export const fetchOrderItems  = () => safe(T.order_items,(q) => q.select('*'));

export async function fetchStats() {
  try {
    const [u, o, p] = await Promise.all([
      supabase.from(T.users).select('*', { count: 'exact', head: true }),
      supabase.from(T.orders).select('*'),
      supabase.from(T.products).select('*', { count: 'exact', head: true }),
    ]);
    const revenue = (o.data || []).reduce((s, x) =>
      s + Number(x.total || x.amount || x.total_amount || x.subtotal || 0), 0);
    return {
      revenue,
      orders: o.count || (o.data?.length || 0),
      users: u.count || 0,
      products: p.count || 0,
      pendingTopups: 0,
      openReports: 0,
    };
  } catch {
    return { revenue: 0, orders: 0, users: 0, products: 0, pendingTopups: 0, openReports: 0 };
  }
}

export async function fetchRevenueSeries(days = 30) {
  const since = new Date(); since.setDate(since.getDate() - days);
  const { data } = await supabase.from(T.orders).select('*').gte('created_at', since.toISOString());
  const map = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
    map[d.toISOString().slice(0,10)] = 0;
  }
  (data || []).forEach((o) => {
    const k = o.created_at?.slice(0,10);
    if (k && map[k] !== undefined) map[k] += Number(o.total || o.amount || 0);
  });
  return Object.entries(map).map(([date, revenue]) => ({ date, revenue }));
}

// Mutations (all return { error } or { data, error })
export async function deleteProduct(id) { return supabase.from(T.products).delete().eq('id', id); }
export async function createProduct(p)  { return supabase.from(T.products).insert(p).select().single(); }
export async function updateProduct(id, p) { return supabase.from(T.products).update(p).eq('id', id); }
export async function deleteUser(id)    { return supabase.from(T.users).delete().eq('id', id); }
export async function updateUser(id, p) { return supabase.from(T.users).update(p).eq('id', id); }
export async function deletePromo(id)   { return supabase.from(T.promos).delete().eq('id', id); }
export async function createPromo(p)    { return supabase.from(T.promos).insert(p).select().single(); }
export async function deleteBundle(id)  { return supabase.from(T.bundles).delete().eq('id', id); }
export async function createBundle(p)   { return supabase.from(T.bundles).insert(p).select().single(); }
export async function deleteXCard(id)   { return supabase.from(T.xcards).delete().eq('id', id); }
export async function approveTopUp(id)  { return supabase.from(T.topups).update({ status: 'approved' }).eq('id', id); }
export async function rejectTopUp(id)   { return supabase.from(T.topups).update({ status: 'rejected' }).eq('id', id); }
