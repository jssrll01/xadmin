import { useEffect } from 'react';

/**
 * Calls `callback` immediately and then every `ms` milliseconds.
 * Safe-cleanup — no leaks on unmount.
 */
export default function useAutoRefresh(callback, ms = 1000) {
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      if (!alive) return;
      try { await callback(); } catch {}
    };
    tick();
    const id = setInterval(tick, ms);
    return () => { alive = false; clearInterval(id); };
  }, [callback, ms]);
}
