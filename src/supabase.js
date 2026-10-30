import { createClient } from '@supabase/supabase-js';

// XMARKET database
const xmUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dmdjytkuwfudkqepkxkl.supabase.co';
const xmKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1NOK3tZHHDzr8YBlBVmCuw_VvsKOFI7';
export const xmSupabase = createClient(xmUrl, xmKey);

// YUELIN database: values come ONLY from env vars (set them in Render)
const ylUrl = import.meta.env.VITE_YL_SUPABASE_URL;
const ylKey = import.meta.env.VITE_YL_SUPABASE_ANON_KEY;
if (!ylUrl || !ylKey) console.error('YUELIN env vars missing: set VITE_YL_SUPABASE_URL and VITE_YL_SUPABASE_ANON_KEY');
export const ylSupabase = createClient(ylUrl || 'https://yuelin-env-missing.invalid', ylKey || 'missing');

let current = 'XMARKET';
export const setDbSystem = (s) => { current = s === 'YUELIN' ? 'YUELIN' : 'XMARKET'; };
export const getDb = (s) => (s === 'YUELIN' ? ylSupabase : xmSupabase);

// Legacy imports of { supabase } now follow the active system
export const supabase = new Proxy({}, {
  get(_, p) { const c = getDb(current); const v = c[p]; return typeof v === 'function' ? v.bind(c) : v; },
});
