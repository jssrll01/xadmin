import { createClient } from '@supabase/supabase-js';

// XMARKET database (the original project values stay as the fallback)
const xmUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dmdjytkuwfudkqepkxkl.supabase.co';
const xmKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1NOK3tZHHDzr8YBlBVmCuw_VvsKOFI7';
export const xmSupabase = createClient(xmUrl, xmKey);

// YUELIN database
const ylUrl = import.meta.env.VITE_YL_SUPABASE_URL || 'https://adwhomwupgnwxowmutuy.supabase.co';
const ylKey = import.meta.env.VITE_YL_SUPABASE_ANON_KEY || 'sb_publishable_20ahxTHpPdtCfyQFq89EJQ_-z4oyrsp';
export const ylSupabase = createClient(ylUrl, ylKey);

export const supabase = xmSupabase;
export const getDb = (system) => (system === 'YUELIN' ? ylSupabase : xmSupabase);
