import { useEffect, useRef } from 'react';
import { liveBus } from './live.js';
import { getDbSystem } from '../supabase.js';

// Runs `callback` whenever the database changes (debounced). Safety refresh every `fallbackMs`.
// tables: optional list of table names to listen to. Without it, any change triggers a refresh.
export default function useLive(callback, { tables = null, wait = 400, fallbackMs = 15000, enabled = true } = {}) {
  const cb = useRef(callback);
  cb.current = callback;
  const key = tables ? tables.join(',') : '';
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    let timer = null;
    const run = () => { if (alive) Promise.resolve().then(() => cb.current()).catch(() => {}); };
    const soon = () => { clearTimeout(timer); timer = setTimeout(run, wait); };
    const isXm = getDbSystem() !== 'YUELIN'; // YUELIN is another database: no signals, so it polls
    const off = isXm ? liveBus.subscribe((p) => { if (!tables || !p.t || p.t === '*' || tables.includes(p.t)) soon(); }) : () => {};
    const poll = fallbackMs ? setInterval(() => { if (document.visibilityState === 'visible') run(); }, fallbackMs) : null;
    const vis = () => { if (document.visibilityState === 'visible') soon(); };
    document.addEventListener('visibilitychange', vis);
    return () => { alive = false; clearTimeout(timer); off(); if (poll) clearInterval(poll); document.removeEventListener('visibilitychange', vis); };
  }, [enabled, wait, fallbackMs, key]); // eslint-disable-line
}
