import React, { useState } from 'react';
import { uploadImage } from '../lib/cloud.js';

const btn = { padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', fontWeight: 600, cursor: 'pointer' };

export default function UploadPhotos() {
  const [urls, setUrls] = useState([]);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const pick = async (e) => {
    const files = Array.from(e.target.files || []);
    setErr(''); setMsg('');
    const done = [];
    for (let i = 0; i < files.length; i++) {
      setBusy('Uploading ' + (i + 1) + ' of ' + files.length + '...');
      try { done.push(await uploadImage(files[i])); }
      catch (ex) { setErr(files[i].name + ': ' + ex.message); }
    }
    setUrls((u) => u.concat(done));
    setBusy('');
    e.target.value = '';
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(urls.join('\n')); setMsg('Copied. Paste into Image URLs.'); }
    catch (x) { setMsg('Copy failed. Long-press the box to copy.'); }
  };

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12, maxWidth: 700 }}>
      <h2 style={{ margin: 0 }}>Upload photos</h2>
      <label style={{ ...btn, textAlign: 'center' }}>
        Choose photos
        <input type="file" accept="image/*" multiple onChange={pick} style={{ display: 'none' }} />
      </label>
      {busy && <div>{busy}</div>}
      {err && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{err}</div>}
      {urls.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          <textarea readOnly rows={Math.min(10, urls.length + 1)} value={urls.join('\n')} style={{ width: '100%', padding: 10, borderRadius: 10, fontSize: 12 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btn} onClick={copy}>Copy all links</button>
            <button style={btn} onClick={() => { setUrls([]); setMsg(''); }}>Clear</button>
          </div>
          {msg && <div style={{ fontSize: 13 }}>{msg}</div>}
        </div>
      )}
    </div>
  );
}
