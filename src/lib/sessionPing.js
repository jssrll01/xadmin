import { useEffect, useRef } from 'react';
import { xmSupabase } from '../supabase.js';
import { getAdminPin, getSid, clearSid } from './pin.js';

const PING_MS = 60000;

// Tells the server this admin tab is still unlocked. If the session was revoked, the app locks itself.
export function useSessionPing(unlocked, onRevoked) {
  const cb = useRef(onRevoked);
  cb.current = onRevoked;
  useEffect(() => {
    if (!unlocked) return undefined;
    let dead = false;
    const ping = async () => {
      const sid = getSid();
      if (!sid) return;
      try {
        const { data, error } = await xmSupabase.rpc('adm_session_ping', { p_code: getAdminPin(), p_sid: sid });
        if (!dead && !error && data === false) { clearSid(); cb.current(); }
      } catch (e) { /* offline: try again next time */ }
    };
    ping();
    const t = setInterval(ping, PING_MS);
    return () => { dead = true; clearInterval(t); };
  }, [unlocked]);
}

// Marks this session as locked (best effort, never blocks the lock for more than 1.5s)
export async function endSession() {
  const sid = getSid();
  if (!sid) return;
  try {
    await Promise.race([
      xmSupabase.rpc('adm_session_end', { p_code: getAdminPin(), p_sid: sid }),
      new Promise((res) => setTimeout(res, 1500)),
    ]);
  } catch (e) { /* ignore */ }
  clearSid();
}

export function deviceOf(ua) {
  const s = String(ua || '');
  if (!s) return 'Unknown device';
  const os = /Android/i.test(s) ? 'Android' : /iPhone|iPad|iPod/i.test(s) ? 'iOS' : /Windows/i.test(s) ? 'Windows' : /Mac OS X|Macintosh/i.test(s) ? 'Mac' : /Linux/i.test(s) ? 'Linux' : 'Other';
  const br = /Edg\//i.test(s) ? 'Edge' : /OPR\/|Opera/i.test(s) ? 'Opera' : /Firefox/i.test(s) ? 'Firefox' : /Chrome|CriOS/i.test(s) ? 'Chrome' : /Safari/i.test(s) ? 'Safari' : 'Browser';
  return os + ' · ' + br;
}

export function ago(v) {
  if (!v) return '—';
  const sec = Math.max(0, Math.round((Date.now() - new Date(v).getTime()) / 1000));
  if (sec < 10) return 'just now';
  if (sec < 60) return sec + 's ago';
  if (sec < 3600) return Math.floor(sec / 60) + 'm ago';
  if (sec < 86400) return Math.floor(sec / 3600) + 'h ago';
  return Math.floor(sec / 86400) + 'd ago';
}
