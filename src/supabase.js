import { createClient } from '@supabase/supabase-js';

// XMARKET Database (Your existing xmarket env variables)
const xmUrl = import.meta.env.VITE_SUPABASE_URL;
const xmKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const xmSupabase = createClient(xmUrl, xmKey);

// YUELIN Database (Hardcoded as fallback, or you can add to Render env vars later)
const ylUrl = import.meta.env.VITE_YL_SUPABASE_URL || 'https://adwhomwupgnwxowmutuy.supabase.co';
const ylKey = import.meta.env.VITE_YL_SUPABASE_ANON_KEY || 'sb_publishable_20ahxTHpPdtCfyQFq89EJQ_-z4oyrsp';
export const ylSupabase = createClient(ylUrl, ylKey);

// Helper function so components can just call `getDb(activeSystem)`
export const getDb = (system) => (system === 'YUELIN' ? ylSupabase : xmSupabase);
