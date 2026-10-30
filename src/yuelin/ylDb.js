import { ylSupabase } from '../supabase.js';

const PIN = import.meta.env.VITE_XADMIN_PIN;

async function call(args) {
  const { data, error } = await ylSupabase.rpc('yl_db', { code: PIN, ...args });
  return { data, error };
}

// Mimics the small part of the supabase query builder the YUELIN pages use.
function builder(table) {
  const st = { action: 'select', payload: null, match: null, order: null, from: 0, to: 24, head: false, since: null };
  const run = async () => {
    if (st.action === 'select') {
      const lim = st.head ? 1 : st.to - st.from + 1;
      const { data, error } = await call({ action: 'select', tbl: table, match: st.match, lim, off: st.from, order_col: st.order });
      if (error) return { data: null, error, count: null };
      let rows = data.rows || [];
      let count = data.count;
      if (st.since) {
        rows = rows.filter((r) => r[st.since.col] >= st.since.val);
        count = rows.length;
      }
      return { data: st.head ? null : rows, error: null, count };
    }
    const { data, error } = await call({ action: st.action, tbl: table, payload: st.payload, match: st.match });
    if (error) return { data: null, error };
    return { data: Array.isArray(data.rows) ? data.rows : new Array(data.rows || 0).fill({}), error: null };
  };
  const b = {
    select(_cols, opts) { st.head = !!(opts && opts.head); return b; },
    range(a, z) { st.from = a; st.to = z; return b; },
    order(col) { st.order = col; return b; },
    gte(col, val) { st.since = { col, val }; return b; },
    match(m) { st.match = m; return b; },
    insert(p) { st.action = 'insert'; st.payload = p; return b; },
    update(p) { st.action = 'update'; st.payload = p; return b; },
    delete() { st.action = 'delete'; return b; },
    then(res, rej) { return run().then(res, rej); },
  };
  return b;
}

export const ylDb = { from: builder };
