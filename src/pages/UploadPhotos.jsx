import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UploadCloud, X, RotateCcw, Copy } from 'lucide-react';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import AnimatedNumber from '../components/AnimatedNumber.jsx';
import { useToast } from '../components/Toast.jsx';
import { uploadImageWithProgress } from '../lib/cloud.js';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 10;
const PARALLEL = 2;
const fmt = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
let seq = 0;

function Count({ label, n }) {
  return (
    <div className="stat">
      <div><div className="stat-label">{label}</div><div className="stat-value"><AnimatedNumber value={n} /></div></div>
    </div>
  );
}

export default function UploadPhotos() {
  const { show } = useToast();
  const [items, setItems] = useState([]);
  const [drag, setDrag] = useState(false);
  const [running, setRunning] = useState(false);
  const ref = useRef([]);
  ref.current = items;

  const patch = useCallback((id, o) => setItems((p) => p.map((i) => (i.id === id ? { ...i, ...o } : i))), []);

  useEffect(() => () => ref.current.forEach((i) => i.preview && URL.revokeObjectURL(i.preview)), []);
  useEffect(() => {
    if (!running) return undefined;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [running]);

  const add = (list) => {
    const have = new Set(ref.current.map((i) => i.key));
    const next = [];
    let dup = 0;
    for (const f of Array.from(list || [])) {
      const key = f.name + '|' + f.size + '|' + f.lastModified;
      if (have.has(key)) { dup++; continue; }
      have.add(key);
      let err = '';
      if (!TYPES.includes(f.type)) err = 'Use a JPG, PNG or WebP image';
      else if (f.size > MAX_MB * 1048576) err = 'Larger than ' + MAX_MB + ' MB';
      next.push({ id: ++seq, key, file: f, preview: err ? '' : URL.createObjectURL(f), status: err ? 'invalid' : 'queued', pct: 0, url: '', error: err });
    }
    if (next.length) setItems((p) => p.concat(next));
    if (dup) show(dup + ' duplicate file' + (dup > 1 ? 's' : '') + ' skipped');
  };

  const uploadOne = async (id) => {
    const it = ref.current.find((i) => i.id === id);
    if (!it) return;
    patch(id, { status: 'uploading', pct: 0, error: '' });
    try {
      const url = await uploadImageWithProgress(it.file, (pct) => patch(id, { pct }));
      patch(id, { status: 'done', pct: 100, url });
    } catch (ex) {
      patch(id, { status: 'error', error: ex.message || 'Upload failed' });
    }
  };

  const start = async (ids) => {
    if (running || !ids.length) return;
    const queue = ids.slice();
    setRunning(true);
    const worker = async () => { while (queue.length) await uploadOne(queue.shift()); };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length) }, () => worker()));
    setRunning(false);
  };

  const remove = (id) => {
    const it = ref.current.find((i) => i.id === id);
    if (it && it.preview) URL.revokeObjectURL(it.preview);
    setItems((p) => p.filter((i) => i.id !== id));
  };
  const clearAll = () => {
    if (running) return;
    const done = ref.current.some((i) => i.status === 'done');
    if (done && !confirm('Clear the list? Uploaded photos stay on Cloudinary, but you will lose these links unless you copied them.')) return;
    ref.current.forEach((i) => i.preview && URL.revokeObjectURL(i.preview));
    setItems([]);
  };
  const copy = async (text, what) => {
    try { await navigator.clipboard.writeText(text); show(what + ' copied', 'success'); }
    catch (e) { show('Copy failed. Long-press the box to copy.', 'error'); }
  };

  const c = useMemo(() => ({
    queued: items.filter((i) => i.status === 'queued'),
    uploading: items.filter((i) => i.status === 'uploading'),
    done: items.filter((i) => i.status === 'done'),
    failed: items.filter((i) => i.status === 'error'),
    invalid: items.filter((i) => i.status === 'invalid'),
  }), [items]);
  const urls = c.done.map((i) => i.url);

  return (
    <>
      <div className="page-head"><div><h1>Upload photos</h1><p>Upload to Cloudinary, then copy the links into a product</p></div></div>

      <label className={'xa-drop' + (drag ? ' on' : '')}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}>
        <UploadCloud size={26} />
        <b>Tap to choose photos</b>
        <span>or drag and drop here · JPG, PNG or WebP · up to {MAX_MB} MB each</span>
        <input className="xa-sr" type="file" accept="image/jpeg,image/png,image/webp" multiple
          onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      </label>

      {items.length > 0 && (
        <>
          <div className="stat-grid">
            <Count label="Waiting" n={c.queued.length} />
            <Count label="Uploading" n={c.uploading.length} />
            <Count label="Uploaded" n={c.done.length} />
            <Count label="Failed" n={c.failed.length + c.invalid.length} />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <Btn variant="primary" disabled={running || !c.queued.length}
              onClick={() => start(c.queued.map((i) => i.id))}>
              {running ? 'Uploading…' : 'Upload ' + c.queued.length + ' photo' + (c.queued.length === 1 ? '' : 's')}
            </Btn>
            {c.failed.length > 0 && (
              <Btn disabled={running} onClick={() => start(c.failed.map((i) => i.id))}>Retry failed ({c.failed.length})</Btn>
            )}
            <Btn disabled={running} onClick={clearAll}>Clear list</Btn>
          </div>

          <Card>
            {items.map((i) => (
              <div className="xa-up-row" key={i.id}>
                {i.preview
                  ? <img className="xa-up-thumb" src={i.preview} alt="" loading="lazy" decoding="async" />
                  : <div className="xa-up-thumb" />}
                <div className="xa-up-main">
                  <b className="xa-up-name">{i.file.name}</b>
                  <small>{fmt(i.file.size)}{i.status === 'queued' ? ' · waiting' : ''}</small>
                  {i.status === 'uploading' && (
                    <div className="xa-prog" role="progressbar" aria-label={'Uploading ' + i.file.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={i.pct}>
                      <i style={{ width: i.pct + '%' }} />
                    </div>
                  )}
                  {i.status === 'done' && <small className="xa-up-ok">Uploaded</small>}
                  {i.error && <small className="xa-up-err">{i.error}</small>}
                </div>
                <div className="xa-up-act">
                  {i.status === 'done' && (
                    <button type="button" className="xa-icon-btn" aria-label={'Copy link for ' + i.file.name} onClick={() => copy(i.url, 'Link')}><Copy size={16} /></button>
                  )}
                  {i.status === 'error' && (
                    <button type="button" className="xa-icon-btn" aria-label={'Retry ' + i.file.name} disabled={running} onClick={() => start([i.id])}><RotateCcw size={16} /></button>
                  )}
                  {i.status !== 'uploading' && (
                    <button type="button" className="xa-icon-btn" aria-label={'Remove ' + i.file.name + ' from the list'} onClick={() => remove(i.id)}><X size={16} /></button>
                  )}
                </div>
              </div>
            ))}
          </Card>

          {urls.length > 0 && (
            <Card style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Uploaded links ({urls.length})</div>
              <textarea className="neu-input" readOnly rows={Math.min(10, urls.length + 1)} value={urls.join('\n')} />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <Btn variant="primary" onClick={() => copy(urls.join('\n'), 'Links')}>Copy all links</Btn>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-dim)' }}>
                Removing a photo from this list does not delete it from Cloudinary.
              </div>
            </Card>
          )}
        </>
      )}
    </>
  );
}
