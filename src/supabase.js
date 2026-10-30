import { createClient } from '@supabase/supabase-js';

// YUELIN database: env vars only (set in Render).
export const YL_URL = import.meta.env.VITE_YL_SUPABASE_URL;
export const YL_KEY = import.meta.env.VITE_YL_SUPABASE_ANON_KEY;

// XMARKET database. The key is a public publishable key (safe in browsers).
// Env vars win, unless they point at YUELIN by mistake.
const FALLBACK_URL = 'https://dmdjytkuwfudkqepkxkl.supabase.co';
const FALLBACK_KEY = 'sb_publishable_1NOK3tZHHDzr8YBlBVmCuw_VvsKOFI7';
const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const clean = (u) => String(u || '').replace(/\/+$/, '');
const mistaken = !!envUrl && !!YL_URL && clean(envUrl) === clean(YL_URL);
if (mistaken) console.warn('VITE_SUPABASE_URL points at YUELIN. Using the XMARKET fallback. Fix the Render variable.');
const useEnv = !!envUrl && !!envKey && !mistaken;
const xmUrl = useEnv ? envUrl : FALLBACK_URL;
const xmKey = useEnv ? envKey : FALLBACK_KEY;

export const ENV_OK = { xm: true, yl: !!(YL_URL && YL_KEY) };
if (!ENV_OK.yl) console.error('YUELIN env vars missing: set VITE_YL_SUPABASE_URL and VITE_YL_SUPABASE_ANON_KEY');

export const xmSupabase = createClient(xmUrl, xmKey, { auth: { persistSession: false } });
const MISSING = 'https://env-missing.invalid';
export const ylSupabase = createClient(YL_URL || MISSING, YL_KEY || 'missing', { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });

let current = 'XMARKET';
export const setDbSystem = (s) => { current = s === 'YUELIN' ? 'YUELIN' : 'XMARKET'; };
export const getDb = (s) => (s === 'YUELIN' ? ylSupabase : xmSupabase);

// Legacy `import { supabase }` follows the active system
export const supabase = new Proxy({}, {
  get(_, p) { const c = getDb(current); const v = c[p]; return typeof v === 'function' ? v.bind(c) : v; },
});
