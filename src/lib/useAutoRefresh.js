import { useEffect } from 'react';
import useLive from './useLive.js';
import { getDbSystem } from '../supabase.js';

/**
 * Calls `callback` immediately, then again whenever the database changes (realtime).
 * `ms` is now only the safety refresh for YUELIN (no realtime there); XMARKET uses at most every 15s.
 */
export default function useAutoRefresh(callback, ms = 1000) {
  useEffect(() => {
    let alive = true;
    (async () => { if (alive) { try { await callback(); } catch (e) { /* ignore */ } } })();
    return () => { alive = false; };
  }, [callback]);
  useLive(callback, { fallbackMs: getDbSystem() === 'YUELIN' ? ms : Math.max(ms, 15000) });
}
