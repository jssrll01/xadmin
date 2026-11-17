import { xrpc } from '../lib/xrpc.js';

// Public VAPID key, the same one XMARKET uses, so the existing sender can reach these devices.
const PUB = 'BPUM5APrsAz0cP128blqtMRsPsqB-JAO2G-Tg0FvfAtv1ZpnyVdcI1Sqq5g6kdL_i8qeWfZer7qyN0voH2y4U0A';

export const CATS = [
  ['topups', 'Top-up requests'], ['withdrawals', 'Withdrawal requests'], ['orders', 'New orders'],
  ['returns', 'Return requests'], ['loads', 'Buy Load requests'], ['creator_withdrawals', 'Creator withdrawals'],
  ['creator_apps', 'Creator applications'], ['submissions', 'Creator content to review'], ['reports', 'Support tickets'],
];

export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function toKey(s) {
  const p = '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + p).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
function sameKey(buf, key) {
  if (!buf) return false;
  const a = new Uint8Array(buf);
  return a.length === key.length && a.every((v, i) => v === key[i]);
}
const pack = (sub) => {
  const j = sub.toJSON();
  return JSON.stringify({ endpoint: j.endpoint, keys: j.keys });
};

export async function currentToken() {
  if (!pushSupported()) return null;
  try {
    const r = await navigator.serviceWorker.getRegistration();
    const s = r && (await r.pushManager.getSubscription());
    return s ? pack(s) : null;
  } catch (e) { return null; }
}

export async function enablePush(email) {
  if (!pushSupported()) throw new Error('Push is not supported in this browser. Use Chrome on Android over HTTPS.');
  if (Notification.permission === 'denied') throw new Error('Notifications are blocked. Allow them in the browser site settings.');
  if (Notification.permission !== 'granted') {
    const p = await Notification.requestPermission();
    if (p !== 'granted') throw new Error('Permission was not granted.');
  }
  await navigator.serviceWorker.register('/sw.js');
  const reg = await navigator.serviceWorker.ready;
  const key = toKey(PUB);
  let sub = await reg.pushManager.getSubscription();
  if (sub && !sameKey(sub.options && sub.options.applicationServerKey, key)) {
    try { await sub.unsubscribe(); } catch (e) { /* ignore */ }
    sub = null;
  }
  if (!sub) {
    try { sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }); }
    catch (e) { throw new Error('Subscribe error: ' + e.message); }
  }
  const token = pack(sub);
  await xrpc('adm_push_register', { p_email: email, p_token: token, p_ua: navigator.userAgent });
  return token;
}

export async function disablePush() {
  const r = await navigator.serviceWorker.getRegistration();
  const s = r && (await r.pushManager.getSubscription());
  if (!s) return;
  const token = pack(s);
  try { await xrpc('adm_push_unregister', { p_token: token }); }
  finally { try { await s.unsubscribe(); } catch (e) { /* ignore */ } }
}
