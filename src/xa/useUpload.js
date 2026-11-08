import { useCallback, useRef, useState } from 'react';

const CLOUD = 'bvw3okdf';
export const fmtSize = (b) => (b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB');
const fmtSpeed = (bps) => (bps > 0 ? fmtSize(bps) + '/s' : '');

// opts: { preset, accept: ['image/'], maxMB: 8, concurrency: 2, multiple: true }
export default function useUpload(opts = {}) {
  const { preset = 'xmarket_products', accept = ['image/'], maxMB = 8, concurrency = 2 } = opts;
  const [items, setItems] = useState([]);
  const xhrs = useRef({});
  const files = useRef({});
  const itemsRef = useRef([]);
  const commit = (fn) => setItems((p) => { const n = fn(p); itemsRef.current = n; return n; });
  const patch = (id, v) => commit((p) => p.map((x) => (x.id === id ? { ...x, ...v } : x)));

  const pump = useCallback(() => {
    const running = itemsRef.current.filter((x) => x.status === 'uploading').length;
    let free = concurrency - running;
    itemsRef.current.filter((x) => x.status === 'queued').forEach((it) => {
      if (free <= 0) return;
      free -= 1;
      start(it.id); // eslint-disable-line no-use-before-define
    });
  }, [concurrency]); // eslint-disable-line

  const start = (id) => {
    const file = files.current[id]; if (!file) return;
    const xhr = new XMLHttpRequest(); xhrs.current[id] = xhr;
    const fd = new FormData(); fd.append('file', file); fd.append('upload_preset', preset);
    const t0 = Date.now(); let lastT = t0; let lastB = 0;
    patch(id, { status: 'uploading', pct: 0, error: '', speed: 0 });
    xhr.open('POST', 'https://api.cloudinary.com/v1_1/' + CLOUD + '/auto/upload');
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const now = Date.now(); const dt = (now - lastT) / 1000;
      let speed;
      if (dt >= 0.4) { speed = (e.loaded - lastB) / dt; lastT = now; lastB = e.loaded; }
      patch(id, speed === undefined ? { pct: Math.min(99, Math.round((e.loaded / e.total) * 100)) } : { pct: Math.min(99, Math.round((e.loaded / e.total) * 100)), speed });
    };
    xhr.onload = () => {
      let d = {}; try { d = JSON.parse(xhr.responseText); } catch (e) { /* non-JSON */ }
      if (xhr.status >= 200 && xhr.status < 300 && d.secure_url) patch(id, { status: 'done', pct: 100, url: d.secure_url, speed: 0 });
      else patch(id, { status: 'error', error: (d.error && d.error.message) || 'Upload failed (' + xhr.status + ')', speed: 0 });
      delete xhrs.current[id]; pump();
    };
    xhr.onerror = () => { patch(id, { status: 'error', error: 'Network error. Check your connection.', speed: 0 }); delete xhrs.current[id]; pump(); };
    xhr.onabort = () => { delete xhrs.current[id]; };
    xhr.send(fd);
  };

  const add = useCallback((list) => {
    const out = [];
    Array.from(list || []).forEach((f) => {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      let error = '';
      if (!accept.some((a) => f.type.startsWith(a))) error = 'File type not allowed (' + (f.type || 'unknown') + ')';
      else if (f.size > maxMB * 1048576) error = 'Too large (max ' + maxMB + ' MB)';
      files.current[id] = f;
      out.push({ id, name: f.name, size: f.size, preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : '', status: error ? 'error' : 'queued', pct: 0, speed: 0, url: '', error, fatal: !!error });
    });
    commit((p) => [...p, ...out]);
    setTimeout(pump, 0);
  }, [accept, maxMB, pump]); // eslint-disable-line

  const cancel = (id) => { if (xhrs.current[id]) xhrs.current[id].abort(); patch(id, { status: 'error', error: 'Cancelled', speed: 0 }); setTimeout(pump, 0); };
  const retry = (id) => { patch(id, { status: 'queued', pct: 0, error: '' }); setTimeout(pump, 0); };
  const remove = (id) => { if (xhrs.current[id]) xhrs.current[id].abort(); const it = itemsRef.current.find((x) => x.id === id); if (it && it.preview) URL.revokeObjectURL(it.preview); delete files.current[id]; commit((p) => p.filter((x) => x.id !== id)); };
  const clear = () => { Object.values(xhrs.current).forEach((x) => x.abort()); itemsRef.current.forEach((it) => it.preview && URL.revokeObjectURL(it.preview)); files.current = {}; commit(() => []); };

  const busy = items.some((x) => x.status === 'uploading' || x.status === 'queued');
  return { items, add, cancel, retry, remove, clear, busy, urls: items.filter((x) => x.status === 'done').map((x) => x.url), fmtSpeed };
}
