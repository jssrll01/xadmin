import { supabase } from '../supabase.js';

const T = {
  users: 'profiles', products: 'products', orders: 'orders',
  order_items: 'order_items', topups: 'xwallet_topups',
  wallet: 'xwallet_txns', promos: 'promo_codes',
  returns: 'return_requests', bundles: 'bundles',
  xcards: 'xcards', reports: 'report_tickets', receipts: 'xquote_receipts', reviews: 'reviews',
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
export const receiptCrud = crud(T.receipts);
export const reviewCrud  = crud(T.reviews);

export const fetchReceipts = () => list(T.receipts, 'created_at');
export const fetchReviews  = () => list(T.reviews, 'created_at');

export async function fetchReceiptsStats() {
  try {
    const { data } = await supabase.from(T.receipts).select('*');
    const arr = data || [];
    const paid = arr.filter(r => (r.status || '').toLowerCase() === 'paid');
    return {
      total: arr.length,
      paid: paid.length,
      unpaid: arr.filter(r => (r.status || '').toLowerCase() === 'unpaid').length,
      pending: arr.filter(r => (r.status || '').toLowerCase() === 'pending').length,
      overdue: arr.filter(r => (r.status || '').toLowerCase() === 'overdue').length,
      revenue: paid.reduce((s, r) => s + Number(r.total || 0), 0),
    };
  } catch {
    return { total: 0, paid: 0, unpaid: 0, pending: 0, overdue: 0, revenue: 0 };
  }
}

export async function fetchReviewsStats() {
  try {
    const { data } = await supabase.from(T.reviews).select('*');
    const arr = data || [];
    const rated = arr.filter(r => typeof r.rating === 'number');
    const avg = rated.length ? (rated.reduce((s, r) => s + r.rating, 0) / rated.length) : 0;
    return {
      total: arr.length,
      avg: Number(avg.toFixed(2)),
      fiveStar: arr.filter(r => r.rating === 5).length,
      replied: arr.filter(r => r.seller_reply).length,
    };
  } catch {
    return { total: 0, avg: 0, fiveStar: 0, replied: 0 };
  }
}

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


/* ============================================================
   SHOPS derived from products.store
   ============================================================ */
export async function fetchShopsFromProducts() {
  try {
    const { data, error } = await supabase.from('products').select('store, name, price, stock, category, seller_id');
    if (error) throw error;

    const map = new Map();
    (data || []).forEach((p) => {
      const key = p.store || '(No store)';
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          store: key,
          product_count: 0,
          total_stock: 0,
          categories: new Set(),
          min_price: null,
          max_price: null,
          seller_ids: new Set(),
        });
      }
      const s = map.get(key);
      s.product_count += 1;
      s.total_stock += Number(p.stock || 0);
      if (p.category) s.categories.add(p.category);
      const price = Number(p.price || 0);
      if (s.min_price === null || price < s.min_price) s.min_price = price;
      if (s.max_price === null || price > s.max_price) s.max_price = price;
      if (p.seller_id) s.seller_ids.add(p.seller_id);
    });

    const items = Array.from(map.values()).map((s) => ({
      id: s.id,
      store: s.store,
      product_count: s.product_count,
      total_stock: s.total_stock,
      categories: Array.from(s.categories).join(', '),
      price_range:
        s.min_price === null
          ? '—'
          : s.min_price === s.max_price
          ? `₱${s.min_price}`
          : `₱${s.min_price} – ₱${s.max_price}`,
      seller_count: s.seller_ids.size,
    }));

    items.sort((a, b) => b.product_count - a.product_count);
    return { items, error: null };
  } catch (e) {
    return { items: [], error: e };
  }
}


/* ============================================================
   AUDIT LOG
   ============================================================ */
export async function logAudit(action, table = null, recordId = null, before = null, after = null) {
  try {
    const actor = sessionStorage.getItem('xadmin_actor') || 'admin';
    await supabase.rpc('log_audit', {
      p_actor: actor,
      p_action: action,
      p_table: table,
      p_record_id: recordId ? String(recordId) : null,
      p_before: before,
      p_after: after,
    });
  } catch (e) {
    console.warn('logAudit failed:', e);
  }
}

export async function fetchAuditLog({ limit = 200 } = {}) {
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    return { items: Array.isArray(data) ? data : [], error };
  } catch (e) {
    return { items: [], error: e };
  }
}

/* ============================================================
   SETTINGS (transaction fee etc)
   ============================================================ */
export async function fetchSettings() {
  try {
    const { data, error } = await supabase.from('settings').select('*');
    return { items: Array.isArray(data) ? data : [], error };
  } catch (e) {
    return { items: [], error: e };
  }
}

export async function upsertSetting(key, value) {
  try {
    const { error } = await supabase
      .from('settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    return { error };
  } catch (e) {
    return { error: e };
  }
}

/* ============================================================
   PRODUCTS with stock-aware sorting/filtering
   ============================================================ */
export async function fetchProductsSorted() {
  const { data, error } = await supabase.from('products').select('*');
  if (error) return { items: [], error };
  const items = (data || []).slice();
  // In-stock first, sold-out last; secondary: newest first
  items.sort((a, b) => {
    const aStock = Number(a.stock || 0) > 0 ? 1 : 0;
    const bStock = Number(b.stock || 0) > 0 ? 1 : 0;
    if (aStock !== bStock) return bStock - aStock;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
  return { items, error: null };
}

export async function updateStock(id, newStock) {
  return supabase.from('products').update({ stock: Number(newStock) }).eq('id', id);
}


/* ============================================================
   NOTIFICATIONS CRUD
   ============================================================ */
export async function fetchNotifications({ limit = 200 } = {}) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    return { items: Array.isArray(data) ? data : [], error };
  } catch (e) {
    return { items: [], error: e };
  }
}

export const notificationCrud = {
  create: async (p) => supabase.from('notifications').insert(p).select().single(),
  update: async (id, p) => supabase.from('notifications').update(p).eq('id', id),
  remove: async (id) => supabase.from('notifications').delete().eq('id', id),
};

/* ============================================================
   AUDIT LOG DELETE
   ============================================================ */
export async function deleteAuditLog(id) {
  return supabase.from('audit_log').delete().eq('id', id);
}

export async function deleteAuditLogAll() {
  return supabase.from('audit_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');
}

/* ============================================================
   SOLD-OUT STATS
   ============================================================ */
export async function fetchSoldOutProducts() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, stock, sold, price, category, store')
      .lte('stock', 0)
      .order('sold', { ascending: false });
    return { items: Array.isArray(data) ? data : [], error };
  } catch (e) {
    return { items: [], error: e };
  }
}


/* ============================================================
   ANALYTICS
   ============================================================ */
export async function fetchRevenueByPeriod(period = 'monthly', limit = 12) {
  try {
    const { data, error } = await supabase.rpc('revenue_by_period', {
      p_period: period,
      p_limit: limit,
    });
    if (error) throw error;
    return { items: Array.isArray(data) ? data : [], error: null };
  } catch (e) {
    return { items: [], error: e };
  }
}

export async function fetchTopSellingProducts(limit = 10) {
  try {
    const { data, error } = await supabase.rpc('top_selling_products', {
      p_limit: limit,
    });
    if (error) throw error;
    return { items: Array.isArray(data) ? data : [], error: null };
  } catch (e) {
    return { items: [], error: e };
  }
}

export async function fetchRevenueSnapshot() {
  try {
    const { data, error } = await supabase.rpc('revenue_snapshot');
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return {
      today: Number(row?.today || 0),
      thisWeek: Number(row?.this_week || 0),
      thisMonth: Number(row?.this_month || 0),
      thisYear: Number(row?.this_year || 0),
      allTime: Number(row?.all_time || 0),
      error: null,
    };
  } catch (e) {
    return { today: 0, thisWeek: 0, thisMonth: 0, thisYear: 0, allTime: 0, error: e };
  }
}
