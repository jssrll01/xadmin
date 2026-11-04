import { hasField, measure } from './series.js';

const DONE = ['cancelled', 'canceled', 'refunded', 'rejected', 'failed'];
const notDone = (r) => !DONE.includes(String(r.status || '').toLowerCase());
const OK_TOPUP = ['approved', 'completed', 'paid', 'success', 'successful'];
const isOk = (r) => OK_TOPUP.includes(String(r.status || '').toLowerCase());
const OPEN = ['submitted', 'in_progress', 'pending', 'open', 'processing'];
const isOpen = (r) => OPEN.includes(String(r.status || '').toLowerCase());
const count = (rows, f) => rows.filter(f).length;
const sumOf = (rows, field, f) => rows.reduce((a, r) => (f && !f(r) ? a : a + (Number(r[field]) || 0)), 0);
const needs = (field, fn) => (rows) => (hasField(rows, field) ? fn(rows) : null);

// Each config = one panel. Series are measured from the table's real rows; anything the table does not have is hidden.
export const P = {
  orders: { id: 'orders', title: 'Order analytics', table: 'orders', chartTitle: 'Orders and revenue over time',
    series: [{ id: 'n', label: 'Orders', mode: 'count', fmt: 'num' }, { id: 'rev', label: 'Revenue', mode: 'sum', field: 'total', filter: notDone, fmt: 'peso', needs: 'total' }, { id: 'aov', label: 'Avg order value', mode: 'avg', field: 'total', filter: notDone, fmt: 'peso', needs: 'total' }],
    extras: [{ label: 'Cancel / refund rate', fmt: 'pct', fn: needs('status', (r) => (r.length ? (count(r, (x) => !notDone(x)) / r.length) * 100 : 0)) }],
    breakdown: { field: 'status', label: 'Orders by status' }, top: { group: 'user_id', value: 'total', label: 'Top customers by spend', fmt: 'peso' } },
  users: { id: 'users', title: 'Customer analytics', table: 'profiles', chartTitle: 'New customers over time',
    series: [{ id: 'n', label: 'New customers', mode: 'count', fmt: 'num' }], extras: [{ label: 'Total customers', fmt: 'num', fn: (r) => r.length }],
    breakdown: { field: 'status', label: 'Customers by status' } },
  products: { id: 'products', title: 'Product analytics', table: 'products', chartTitle: 'Products added over time',
    series: [{ id: 'n', label: 'Products added', mode: 'count', fmt: 'num' }],
    extras: [{ label: 'Total products', fmt: 'num', fn: (r) => r.length },
      { label: 'Out of stock', fmt: 'num', fn: needs('stock', (r) => count(r, (x) => Number(x.stock) <= 0)) },
      { label: 'Low stock (1-5)', fmt: 'num', fn: needs('stock', (r) => count(r, (x) => Number(x.stock) > 0 && Number(x.stock) <= 5)) },
      { label: 'Stock value (price x stock)', fmt: 'peso', fn: needs('stock', (r) => (hasField(r, 'price') ? r.reduce((a, x) => a + (Number(x.price) || 0) * (Number(x.stock) || 0), 0) : null)) }],
    breakdown: { field: 'category', label: 'Products by category' } },
  topups: { id: 'topups', title: 'Top-up analytics', table: 'xwallet_topups', chartTitle: 'Top-ups over time',
    series: [{ id: 'n', label: 'Top-up requests', mode: 'count', fmt: 'num' }, { id: 'amt', label: 'Approved amount', mode: 'sum', field: 'amount', filter: isOk, fmt: 'peso', needs: 'amount' }],
    extras: [{ label: 'Waiting for approval', fmt: 'num', fn: needs('status', (r) => count(r, isOpen)) }], breakdown: { field: 'status', label: 'Top-ups by status' }, top: { group: 'user_id', value: 'amount', label: 'Top top-up users', fmt: 'peso' } },
  wallet: { id: 'wallet', title: 'Wallet analytics', table: 'xwallet_txns', chartTitle: 'Wallet activity over time',
    series: [{ id: 'n', label: 'Transactions', mode: 'count', fmt: 'num' }, { id: 'amt', label: 'Volume', mode: 'sum', field: 'amount', fmt: 'peso', needs: 'amount' }],
    breakdown: { field: 'type', label: 'Transactions by type' } },
  returns: { id: 'returns', title: 'Returns analytics', table: 'return_requests', chartTitle: 'Return requests over time',
    series: [{ id: 'n', label: 'Return requests', mode: 'count', fmt: 'num' }], extras: [{ label: 'Open requests', fmt: 'num', fn: needs('status', (r) => count(r, isOpen)) }],
    breakdown: { field: 'status', label: 'Returns by status' }, top: { group: 'reason', label: 'Most common reasons' } },
  reports: { id: 'reports', title: 'Customer support analytics', table: 'report_tickets', chartTitle: 'Support tickets over time',
    series: [{ id: 'n', label: 'Tickets', mode: 'count', fmt: 'num' }], extras: [{ label: 'Open tickets', fmt: 'num', fn: needs('status', (r) => count(r, isOpen)) }],
    breakdown: { field: 'status', label: 'Tickets by status' }, top: { group: 'category', label: 'Tickets by category' } },
  reviews: { id: 'reviews', title: 'Review analytics', table: 'reviews', chartTitle: 'Reviews and rating over time',
    series: [{ id: 'n', label: 'Reviews', mode: 'count', fmt: 'num' }, { id: 'avg', label: 'Average rating', mode: 'avg', field: 'rating', fmt: 'rating', needs: 'rating' }],
    extras: [{ label: 'All-time average', fmt: 'rating', fn: needs('rating', (r) => measure(r, { mode: 'avg', field: 'rating' })) }], breakdown: { field: 'rating', label: 'Rating distribution' } },
  quotes: { id: 'quotes', title: 'Quotation analytics', table: 'xquote_receipts', chartTitle: 'Quotations over time',
    series: [{ id: 'n', label: 'Quotations', mode: 'count', fmt: 'num' }, { id: 'tot', label: 'Quoted value', mode: 'sum', field: 'total', fmt: 'peso', needs: 'total' }], breakdown: { field: 'status', label: 'Quotations by status' } },
  promos: { id: 'promos', title: 'Promo analytics', table: 'promo_codes', chartTitle: 'Promo codes created over time',
    series: [{ id: 'n', label: 'Codes created', mode: 'count', fmt: 'num' }], extras: [{ label: 'Total redemptions', fmt: 'num', fn: needs('used_count', (r) => sumOf(r, 'used_count')) }],
    breakdown: { field: 'discount_type', label: 'Codes by discount type' }, top: { group: 'code', value: 'used_count', label: 'Most used codes' } },
  bundles: { id: 'bundles', title: 'Bundle analytics', table: 'bundles', chartTitle: 'Bundles created over time', series: [{ id: 'n', label: 'Bundles created', mode: 'count', fmt: 'num' }], extras: [{ label: 'Total bundles', fmt: 'num', fn: (r) => r.length }] },
  xcards: { id: 'xcards', title: 'Xcard analytics', table: 'xcards', chartTitle: 'Xcards issued over time', series: [{ id: 'n', label: 'Xcards issued', mode: 'count', fmt: 'num' }], extras: [{ label: 'Total Xcards', fmt: 'num', fn: (r) => r.length }], breakdown: { field: 'status', label: 'Xcards by status' } },
  shops: { id: 'shops', title: 'Shop analytics', table: 'shops', chartTitle: 'Shops added over time', series: [{ id: 'n', label: 'Shops added', mode: 'count', fmt: 'num' }], extras: [{ label: 'Total shops', fmt: 'num', fn: (r) => r.length }] },
  notifications: { id: 'notifications', title: 'Notification analytics', table: 'notifications', chartTitle: 'Notifications over time', series: [{ id: 'n', label: 'Notifications', mode: 'count', fmt: 'num' }], breakdown: { field: 'type', label: 'By type' } },
  audit: { id: 'audit', title: 'Admin activity', table: 'audit_log', chartTitle: 'Admin actions over time', series: [{ id: 'n', label: 'Actions', mode: 'count', fmt: 'num' }], breakdown: { field: 'action', label: 'Actions by type' }, top: { group: 'actor', label: 'Most active admins' } },
};

// Which panels appear above each XMARKET tab.
export const ROUTE_PANELS = {
  '/orders': ['orders'], '/users': ['users'], '/products': ['products'], '/topups': ['topups'], '/wallet': ['wallet'], '/returns': ['returns'],
  '/reports': ['reports'], '/reviews': ['reviews'], '/quotations': ['quotes'], '/promos': ['promos'], '/bundles': ['bundles'], '/xcards': ['xcards'],
  '/shops': ['shops'], '/notifications': ['notifications'], '/audit': ['audit'],
};

// Dashboard category tabs.
export const HUB = [
  ['sales', 'Sales', ['orders']], ['orders', 'Orders', ['orders', 'returns']], ['products', 'Products', ['products', 'reviews']],
  ['financial', 'Financial', ['topups', 'wallet', 'quotes']], ['customers', 'Customers', ['users', 'xcards']],
  ['marketing', 'Marketing', ['promos', 'bundles', 'notifications']], ['support', 'Support', ['reports', 'returns', 'reviews']],
  ['loyalty', 'Loyalty', ['xcards', 'wallet']], ['traffic', 'Traffic', []],
];

// YUELIN tabs (points system), keyed by table name.
const yl = (table, title, extra = {}) => ({ id: 'yl_' + table, source: 'yl', table, title, ...extra });
export const YL_PANELS = {
  points_ledger: yl('points_ledger', 'Points activity', { chartTitle: 'Points earned and spent',
    series: [{ id: 'earn', label: 'Points earned', mode: 'sum', field: 'delta', filter: (r) => Number(r.delta) > 0, fmt: 'num' }, { id: 'spent', label: 'Points spent', mode: 'sum', field: 'delta', filter: (r) => Number(r.delta) < 0, fmt: 'num' }], breakdown: { field: 'reason', label: 'By reason' } }),
  redemptions: yl('redemptions', 'Reward exchanges', { chartTitle: 'Exchanges over time',
    series: [{ id: 'n', label: 'Exchanges', mode: 'count', fmt: 'num' }, { id: 'pts', label: 'Points spent', mode: 'sum', field: 'points_spent', fmt: 'num', needs: 'points_spent' }], breakdown: { field: 'status', label: 'By status' } }),
  profiles: yl('profiles', 'Members', { chartTitle: 'New members', series: [{ id: 'n', label: 'New members', mode: 'count', fmt: 'num' }], extras: [{ label: 'Total members', fmt: 'num', fn: (r) => r.length }, { label: 'Points held', fmt: 'num', fn: needs('points', (r) => sumOf(r, 'points')) }] }),
  daily_checkins: yl('daily_checkins', 'Daily check-ins', { chartTitle: 'Check-ins over time', series: [{ id: 'n', label: 'Check-ins', mode: 'count', fmt: 'num' }] }),
  code_redemptions: yl('code_redemptions', 'Code redemptions', { chartTitle: 'Codes redeemed', series: [{ id: 'n', label: 'Codes redeemed', mode: 'count', fmt: 'num' }] }),
  referrals: yl('referrals', 'Referrals', { chartTitle: 'Referrals over time', series: [{ id: 'n', label: 'Referrals', mode: 'count', fmt: 'num' }] }),
  notifications: yl('notifications', 'Notifications', { chartTitle: 'Notifications sent', series: [{ id: 'n', label: 'Notifications', mode: 'count', fmt: 'num' }], breakdown: { field: 'category', label: 'By category' } }),
  user_mission_progress: yl('user_mission_progress', 'Mission progress', { chartTitle: 'Mission activity', series: [{ id: 'n', label: 'Mission records', mode: 'count', fmt: 'num' }], breakdown: { field: 'is_completed', label: 'Completed' } }),
  app_reviews: yl('app_reviews', 'App reviews', { chartTitle: 'Reviews and rating', series: [{ id: 'n', label: 'Reviews', mode: 'count', fmt: 'num' }, { id: 'avg', label: 'Average rating', mode: 'avg', field: 'rating', fmt: 'rating', needs: 'rating' }], breakdown: { field: 'rating', label: 'Rating distribution' } }),
};
