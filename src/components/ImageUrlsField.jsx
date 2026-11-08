import React, { useEffect, useRef, useState } from 'react';
import { uploadManaged } from '../lib/cloud.js';
import { useXaToast } from '../xa/Kit.jsx';

const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PAR = 2;
const lines = (v) => String(v || '').split('\n').map((s) => s.trim()).filter(Boolean);
const fmtSize = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
const fmtSpeed = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB/s' : Math.round(b / 1024) + ' KB/s');
const fmtEta = (s) => (s >= 60 ? Math.floor(s / 60) + 'm ' + Math.round(s % 60) + 's' : Math.max(1, Math.round(s)) + 's');

function statusText(it) {
  if (it.status === 'queued') return 'Waiting…';
  if (it.status === 'uploading') return it.pct + '% · ' + fmtSpeed(it.speed) + (it.eta > 0 ? ' · ' + fmtEta(it.eta) + ' left' : '');
  if (it.status === 'done') return 'Uploaded';
  if (it.status === 'canceled') return 'Canceled';
  return it.error || 'Failed';
}

export default function ImageUrlsField({ value, onChange, placeholder, preset = 'xmarket_products', maxMb = 10 }) {
  const { push } = useXaToast();
  const val = useRef(value); val.current = value;
  const cb = useRef(onChange); cb.current = onChange;
  const presetRef = useRef(preset); presetRef.current = preset;
  const q = useRef([]);
  const aborts = useRef({});
  const seen = useRef(new Set());
  const pick = useRef(null);
  const [, bump] = useState(0);
  const [drag, setDrag] = useState(false);
  const render = () => bump((n) => n + 1);
  const urls = lines(value);

  const startOne = (it) => {
    it.status = 'uploading'; it.pct = 0; it.error = ''; it.t0 = Date.now(); it.speed = 0; it.eta = 0;
    render();
    const { promise, abort } = uploadManaged(it.file, {
      preset: presetRef.current,
      onProgress: (loaded, total) => {
        const sec = Math.max(0.2, (Date.now() - it.t0) / 1000);
        it.pct = Math.min(99, Math.round((loaded / total) * 100));
        it.speed = loaded / sec;
        it.eta = it.speed > 0 ? (total - loaded) / it.speed : 0;
        render();
      },
    });
    aborts.current[it.id] = abort;
    promise.then((url) => {
      it.status = 'done'; it.pct = 100;
      seen.current.add(it.key);
      const next = lines(val.current).concat(url).join('\n');
      val.current = next; cb.current(next);
    }).catch((e) => {
      if (it.status === 'canceled') return;
      if (e && e.canceled) it.status = 'canceled';
      else { it.status = 'error'; it.error = (e && e.message) || 'Upload failed'; }
    }).finally(() => { delete aborts.current[it.id]; render(); pump(); });
  };
  const pump = () => {
    const running = q.current.filter((i) => i.status === 'uploading').length;
    q.current.filter((i) => i.status === 'queued').slice(0, Math.max(0, PAR - running)).forEach(startOne);
  };

  const add = (fileList) => {
    let added = 0;
    Array.from(fileList || []).forEach((f) => {
      const key = f.name + '|' + f.size + '|' + f.lastModified;
      if (seen.current.has(key) || q.current.some((i) => i.key === key && (i.status === 'queued' || i.status === 'uploading'))) { push(f.name + ': already added', 'error'); return; }
      if (!OK_TYPES.includes(f.type)) { push(f.name + ': only JPG, PNG or WebP images', 'error'); return; }
      if (f.size > maxMb * 1048576) { push(f.name + ': must be under ' + maxMb + ' MB', 'error'); return; }
      q.current.push({ id: Math.random().toString(36).slice(2), key, file: f, name: f.name, size: f.size, preview: URL.createObjectURL(f), status: 'queued', pct: 0, speed: 0, eta: 0, error: '' });
      added += 1;
    });
    if (added) { render(); pump(); }
  };
  const cancel = (it) => { it.status = 'canceled'; if (aborts.current[it.id]) aborts.current[it.id](); else render(); pump(); };
  const retry = (it) => { it.status = 'queued'; render(); pump(); };
  const dismiss = (it) => { try { URL.revokeObjectURL(it.preview); } catch (e) { /* ignore */ } q.current = q.current.filter((x) => x !== it); render(); };
  const clearFinished = () => { q.current.filter((i) => i.status === 'done' || i.status === 'canceled').forEach((i) => { try { URL.revokeObjectURL(i.preview); } catch (e) { /* ignore */ } }); q.current = q.current.filter((i) => i.status !== 'done' && i.status !== 'canceled'); render(); };

  const active = q.current.some((i) => i.status === 'uploading' || i.status === 'queued');
  useEffect(() => {
    if (!active) return undefined;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [active]);
  useEffect(() => () => {
    Object.values(aborts.current).forEach((a) => { try { a(); } catch (e) { /* ignore */ } });
    q.current.forEach((i) => { try { URL.revokeObjectURL(i.preview); } catch (e) { /* ignore */ } });
  }, []);

  const finished = q.current.some((i) => i.status === 'done' || i.status === 'canceled');
  return (
    <div>
      {urls.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 8, marginBottom: 10 }}>
          {urls.map((u, i) => (
            <div key={u + i} style={{ position: 'relative' }}>
              <img src={u} alt="" loading="lazy" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 10, display: 'block' }} />
              {i === 0 && <span style={{ position: 'absolute', left: 4, bottom: 4, fontSize: 10, fontWeight: 800, background: 'rgba(0,0,0,.65)', color: '#fff', padding: '1px 6px', borderRadius: 6 }}>Cover</span>}
              <button type="button" aria-label="Remove image" onClick={() => { const n = urls.filter((_, j) => j !== i).join('\n'); val.current = n; cb.current(n); }}
                style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, background: '#dc2626', color: '#fff', fontSize: 12, lineHeight: '24px' }}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div role="button" tabIndex={0} aria-label="Add images" onClick={() => pick.current && pick.current.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (pick.current) pick.current.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
        style={{ border: '2px dashed ' + (drag ? 'var(--primary)' : 'var(--border-strong)'), background: drag ? 'var(--primary-soft)' : 'var(--surface-2)', borderRadius: 12, padding: '16px 12px', textAlign: 'center', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 10 }}>
        Drop images here or tap to choose
        <div style={{ fontSize: 11.5, fontWeight: 600, marginTop: 3 }}>JPG, PNG or WebP · up to {maxMb} MB each</div>
      </div>
      <input ref={pick} type="file" accept="image/jpeg,image/png,image/webp" multiple style={{ display: 'none' }} onChange={(e) => { add(e.target.files); e.target.value = ''; }} />

      {q.current.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {q.current.map((it) => (
            <div key={it.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--border)' }}>
              <img src={it.preview} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name} <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>· {fmtSize(it.size)}</span></div>
                <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={it.pct} aria-label={'Upload progress for ' + it.name}
                  style={{ height: 6, borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', overflow: 'hidden', margin: '5px 0 3px' }}>
                  <div style={{ height: '100%', width: it.pct + '%', transition: 'width .15s', background: it.status === 'error' ? 'var(--danger)' : it.status === 'done' ? 'var(--success)' : 'var(--primary)' }} />
                </div>
                <div style={{ fontSize: 11.5, color: it.status === 'error' ? 'var(--danger)' : 'var(--text-dim)' }}>{statusText(it)}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {(it.status === 'queued' || it.status === 'uploading') && <button type="button" className="neu-btn" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => cancel(it)}>Cancel</button>}
                {(it.status === 'error' || it.status === 'canceled') && <button type="button" className="neu-btn" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => retry(it)}>Retry</button>}
                {(it.status === 'error' || it.status === 'canceled' || it.status === 'done') && <button type="button" className="neu-btn" style={{ padding: '6px 10px', fontSize: 12 }} aria-label="Dismiss" onClick={() => dismiss(it)}>✕</button>}
              </div>
            </div>
          ))}
          {finished && <button type="button" onClick={clearFinished} style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginTop: 4 }}>Clear finished</button>}
        </div>
      )}

      <textarea className="neu-input" rows={3} placeholder={placeholder || 'or paste image URLs, one per line'}
        value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
