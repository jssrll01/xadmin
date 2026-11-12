// The admin PIN is never built into the app. It is checked by the server, then kept for this tab only.
const KEY = 'xadmin_pin';

export function getAdminPin() {
  try { return sessionStorage.getItem(KEY) || ''; } catch (e) { return ''; }
}
export function setAdminPin(p) {
  try { sessionStorage.setItem(KEY, String(p)); } catch (e) { /* storage blocked */ }
}
export function clearAdminPin() {
  try { sessionStorage.removeItem(KEY); } catch (e) { /* storage blocked */ }
}
// Asks the database whether this PIN is right (wrong guesses are delayed by the server).
const SID = 'xadmin_sid';
export function getSid() { try { return sessionStorage.getItem(SID) || ''; } catch (e) { return ''; } }
export function clearSid() { try { sessionStorage.removeItem(SID); } catch (e) { /* storage blocked */ } }
export async function verifyPin(client, pin) {
  // New path: logs the attempt and opens a tracked session. Falls back if the security SQL is not installed.
  try {
    const r = await client.rpc('adm_pin_login', { p_code: String(pin), p_ua: String(navigator.userAgent || '').slice(0, 300) });
    if (!r.error && r.data && typeof r.data === 'object') {
      if (r.data.ok && r.data.sid) { try { sessionStorage.setItem(SID, String(r.data.sid)); } catch (e) { /* storage blocked */ } }
      return r.data.ok === true;
    }
  } catch (e) { /* use the old check */ }
  const { data, error } = await client.rpc('admin_check', { code: String(pin) });
  if (error) throw error;
  return data === true;
}
