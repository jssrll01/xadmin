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
export async function verifyPin(client, pin) {
  const { data, error } = await client.rpc('admin_check', { code: String(pin) });
  if (error) throw error;
  return data === true;
}
