export const TAG_CAPACITY = 504; // NTAG215 nominal user memory (estimate only)
const TRUSTED = ['xmarket-app.shop', 'xmarket-landing.onrender.com', 'xmarket-app.onrender.com', 'facebook.com'];
const SCHEMES = ['https:', 'mailto:', 'tel:'];
const enc = new TextEncoder();
let n = 0;
const uid = () => 'r' + Date.now().toString(36) + (n++);

export const newText = (text = '', lang = 'en') => ({ id: uid(), type: 'text', text, lang });
export const newUrl = (url = '') => ({ id: uid(), type: 'url', url });

export function normalizeUrl(input) {
  const s = String(input || '').trim();
  if (!s) return { ok: false, error: 'URL is empty.' };
  let u;
  try { u = new URL(s); } catch { return { ok: false, error: 'Not a valid URL. Include https://' }; }
  if (!SCHEMES.includes(u.protocol)) return { ok: false, error: 'Only https:, mailto: and tel: links are allowed.' };
  return { ok: true, href: u.href, host: u.hostname };
}

export function validateRecord(r) {
  const errors = [], warnings = [];
  if (r.type === 'text') {
    if (!String(r.text || '').trim()) errors.push('Text is empty.');
    if (!/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(r.lang || '')) errors.push('Language code is invalid (example: en).');
  } else if (r.type === 'url') {
    const u = normalizeUrl(r.url);
    if (!u.ok) errors.push(u.error);
    else if (u.host && !TRUSTED.some((t) => u.host === t || u.host.endsWith('.' + t)))
      warnings.push('Not one of your known sites: ' + u.host);
  } else errors.push('Unsupported record type.');
  return { errors, warnings };
}

const recBytes = (typeLen, payloadLen) => 2 + (payloadLen > 255 ? 4 : 1) + typeLen + payloadLen;

// Rough estimate: record headers + payload bytes (UTF-8) + tag TLV wrapper.
export function estimateSize(records) {
  let msg = 0;
  for (const r of records) {
    if (r.type === 'text') msg += recBytes(1, 1 + enc.encode(r.lang || 'en').length + enc.encode(r.text || '').length);
    else if (r.type === 'url') {
      const u = normalizeUrl(r.url);
      msg += recBytes(1, 1 + enc.encode(u.ok ? u.href : String(r.url || '')).length);
    }
  }
  const total = msg + (msg > 254 ? 4 : 2) + 1;
  return { messageBytes: msg, totalBytes: total, capacity: TAG_CAPACITY, over: total > TAG_CAPACITY, near: total > TAG_CAPACITY * 0.9 };
}

export const removeAt = (l, i) => l.filter((_, k) => k !== i);
export function move(l, i, d) {
  const j = i + d;
  if (j < 0 || j >= l.length) return l;
  const c = [...l]; [c[i], c[j]] = [c[j], c[i]]; return c;
}
export function duplicate(l, i) {
  const c = [...l]; c.splice(i + 1, 0, { ...l[i], id: uid() }); return c;
}

export const toWebNfc = (records) => records.map((r) =>
  r.type === 'text'
    ? { recordType: 'text', data: r.text, lang: r.lang }
    : { recordType: 'url', data: normalizeUrl(r.url).href });

const key = (r) => r.type === 'text' ? 'text|' + (r.lang || '').toLowerCase() + '|' + r.text
  : r.type === 'url' ? 'url|' + (normalizeUrl(r.url).href || r.url) : 'other|' + r.type;
export const sameMessage = (a, b) => a.length === b.length && a.every((r, i) => key(r) === key(b[i]));

export function parseTemplates(json) {
  try {
    const arr = JSON.parse(json || '[]');
    if (!Array.isArray(arr)) return [];
    return arr.filter((t) => t && typeof t.name === 'string' && Array.isArray(t.records) &&
      t.records.every((r) => (r.type === 'text' && typeof r.text === 'string') || (r.type === 'url' && typeof r.url === 'string')));
  } catch { return []; }
}
