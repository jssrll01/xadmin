import React, { useRef, useState } from 'react';
import { uploadImageWithProgress } from '../lib/cloud.js';
import { useToast } from './Toast.jsx';

const MAX_MB = 10;
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const lines = (v) => String(v || '').split('\n').map((s) => s.trim()).filter(Boolean);

export default function ImageUrlsField({ value, onChange, placeholder }) {
  const { show } = useToast();
  const [busy, setBusy] = useState('');
  const val = useRef(value); val.current = value;
  const cb = useRef(onChange); cb.current = onChange;
  const seen = useRef(new Set());
  const urls = lines(value);

  const pick = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const key = f.name + '|' + f.size + '|' + f.lastModified;
      if (seen.current.has(key)) { show?.(f.name + ': already added', 'error'); continue; }
      if (!OK_TYPES.includes(f.type)) { show?.(f.name + ': only JPG, PNG or WebP images', 'error'); continue; }
      if (f.size > MAX_MB * 1024 * 1024) { show?.(f.name + ': must be under ' + MAX_MB + ' MB', 'error'); continue; }
      const label = 'Uploading ' + (i + 1) + ' of ' + files.length;
      setBusy(label + '…');
      try {
        const u = await uploadImageWithProgress(f, (p) => setBusy(label + ' · ' + p + '%'));
        seen.current.add(key);
        cb.current(lines(val.current).concat(u).join('\n'));
      } catch (ex) { show?.(f.name + ': ' + ex.message, 'error'); }
    }
    setBusy('');
  };

  return (
    <div>
      {urls.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 8, marginBottom: 10 }}>
          {urls.map((u, i) => (
            <div key={u + i} style={{ position: 'relative' }}>
              <img src={u} alt="" loading="lazy" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 10, display: 'block' }} />
              {i === 0 && <span style={{ position: 'absolute', left: 4, bottom: 4, fontSize: 10, fontWeight: 800, background: 'rgba(0,0,0,.65)', color: '#fff', borderRadius: 6, padding: '1px 6px' }}>Main</span>}
              <button type="button" aria-label="Remove image" onClick={() => cb.current(urls.filter((_, j) => j !== i).join('\n'))}
                style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 800, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      )}
      <label className="neu-btn" style={{ padding: '8px 14px', fontSize: 12, cursor: busy ? 'default' : 'pointer', display: 'inline-block', marginBottom: 8, opacity: busy ? 0.6 : 1 }}>
        {busy || '📁 Choose images'}
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={!!busy} onChange={pick} style={{ display: 'none' }} />
      </label>
      <textarea className="neu-input" rows={3} placeholder={placeholder || 'or paste image URLs, one per line'}
        value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
