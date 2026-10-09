import { supabase } from '../supabase.js';

const T = {
  users: 'profiles', products: 'products', orders: 'orders',
  order_items: 'order_items', topups: 'xwallet_topups',
  wallet: 'xwallet_txns', promos: 'promo_codes',
  returns: 'return_requests', bundles: 'bundles',
  xcards: 'xcards', reports: 'report_tickets',
  shops: 'shops',
};

const PK = { promo_codes: 'code' };

async function list(table, order) {
  try {
    let q = supabase.from(table).select('*');
    if (order) q = q.order(order, { ascending: false });
    const { data, error } = await q;
    return { items: Array.isArray(data) ? data : [], error };
  } catch (e) {
    return { items: [], error: e };
  }
}

const crud = (table) => {
  const key = PK[table] || 'id';
  return {
    create: async (p) => supabase.from(table).insert(p).select().single(),
    update: async (id, p) => supabase.from(table).update(p).eq(key, id),
    remove: async (id) => supabase.from(table).delete().eq(key, id),
  };
};

export const fetchUsers    = () => list(T.users, 'created_at');
export const fetchProducts = () => list(T.products, 'created_at');
export const fetchOrders   = () => list(T.orders, 'created_at');
export const fetchTopUps   = () => list(T.topups, 'created_at');
export const fetchWallet   = () => list(T.wallet, 'created_at');
export const fetchPromos   = () => list(T.promos, 'created_at');
export const fetchReturns  = () => list(T.returns, 'created_at');
export const fetchReports  = () => list(T.reports, 'created_at');
export const fetchBundles  = () => list(T.bundles, 'created_at');
export const fetchXCards   = () => list(T.xcards, 'created_at');
export const fetchShops    = () => list(T.shops, 'created_at');
export const fetchOrderItems = () => list(T.order_items);

export async function fetchStats() {
  try {
    const [u, o, p, t, r] = await Promise.all([
      supabase.from(T.users).select('*', { count: 'exact', head: true }),
      supabase.from(T.orders).select('*'),
      supabase.from(T.products).select('*', { count: 'exact', head: true }),
      supabase.from(T.topups).select('*'),
      supabase.from(T.reports).select('*'),
    ]);
    const revenue = (o.data || []).reduce((s, x) => s + Number(x.total || 0), 0);
    return {
      revenue,
      orders: o.count || (o.data?.length || 0),
      users: u.count || 0,
      products: p.count || 0,
      pendingTopups: (t.data || []).filter((x) =>
        ['pending', 'processing'].includes(x.status)).length,
      openReports: (r.data || []).filter((x) =>
        ['open', 'pending', 'new'].includes(x.status)).length,
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
    map[d.toISOString().slice(0, 10)] = 0;
  }
  (data || []).forEach((o) => {
    const k = o.created_at?.slice(0, 10);
    if (k && map[k] !== undefined) map[k] += Number(o.total || 0);
  });
  return Object.entries(map).map(([date, revenue]) => ({ date, revenue }));
}

export const productCrud = crud(T.products);
export const orderCrud   = crud(T.orders);
export const userCrud    = crud(T.users);
export const topupCrud   = crud(T.topups);
export const walletCrud  = crud(T.wallet);
export const promoCrud   = crud(T.promos);
export const returnCrud  = crud(T.returns);
export const reportCrud  = crud(T.reports);
export const bundleCrud  = crud(T.bundles);
export const xcardCrud   = crud(T.xcards);
export const shopCrud    = crud(T.shops);

// Approve topup — explicit server-side function (via trigger) still fires,
// but we ALSO call the RPC to guarantee credit even if trigger isn't installed.
export async function approveTopUp(id, userId, amount) {
  // Set status -> approved. Trigger handles crediting.
  const res = await supabase
    .from(T.topups)
    .update({ status: 'approved' })
    .eq('id', id);
  if (res.error) return res;

  // Safety net: also increment balance directly
  const { data: profile } = await supabase
    .from(T.users).select('xwallet_balance').eq('id', userId).single();
  const newBal = Number(profile?.xwallet_balance || 0) + Number(amount || 0);
  return supabase.from(T.users).update({ xwallet_balance: newBal }).eq('id', userId);
}
