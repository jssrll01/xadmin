import { createClient } from '@supabase/supabase-js';

// Every credential comes from environment variables (Render > Environment).
const xmUrl = import.meta.env.VITE_SUPABASE_URL;
const xmKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const YL_URL = import.meta.env.VITE_YL_SUPABASE_URL;
export const YL_KEY = import.meta.env.VITE_YL_SUPABASE_ANON_KEY;

export const ENV_OK = { xm: !!(xmUrl && xmKey), yl: !!(YL_URL && YL_KEY) };
if (!ENV_OK.xm) console.error('Missing env: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
if (!ENV_OK.yl) console.error('Missing env: VITE_YL_SUPABASE_URL / VITE_YL_SUPABASE_ANON_KEY');

const MISSING = 'https://env-missing.invalid';
export const xmSupabase = createClient(xmUrl || MISSING, xmKey || 'missing');
export const ylSupabase = createClient(YL_URL || MISSING, YL_KEY || 'missing', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

let current = 'XMARKET';
export const setDbSystem = (s) => { current = s === 'YUELIN' ? 'YUELIN' : 'XMARKET'; };
export const getDb = (s) => (s === 'YUELIN' ? ylSupabase : xmSupabase);

// Legacy `import { supabase }` follows the active system
export const supabase = new Proxy({}, {
  get(_, p) { const c = getDb(current); const v = c[p]; return typeof v === 'function' ? v.bind(c) : v; },
});
