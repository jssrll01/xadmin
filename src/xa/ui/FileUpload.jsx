import React, { useEffect, useRef, useState } from 'react';
import { UploadCloud, X, RotateCw, Check } from 'lucide-react';

const fmt = (b) => (b < 1024 * 1024 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1024 / 1024).toFixed(1) + ' MB');
const MAX_PARALLEL = 2;

// Helper for upload(): POSTs FormData with real progress. Resolves with parsed JSON.
export function xhrUpload(url, formData, onProgress, signal) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('POST', url);
    x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    x.onload = () => {
      let body = null;
      try { body = JSON.parse(x.responseText); } catch { /* not json */ }
      if (x.status >= 200 && x.status < 300) resolve(body);
      else reject(new Error(body?.error?.message || 'Upload failed (' + x.status + ')'));
    };
    x.onerror = () => reject(new Error('Network error'));
    x.onabort = () => reject(new Error('Canceled'));
    signal?.addEventListener('abort', () => x.abort());
    x.send(formData);
  });
}

// upload(file, onProgress(0-100), signal) -> Promise<url string>
export default function FileUpload({ upload, onDone, accept = 'image/*', maxSizeMB = 5, multiple = true, label = 'Drop files here or tap to choose' }) {
  const [items, setItems] = useState([]);
  const [over, setOver] = useState(false);
  const [note, setNote] = useState('');
  const ctrls = useRef({});
  const input = useRef(null);
  const latest = useRef(items);
  latest.current = items;

  const patch = (id, p) => setItems((l) => l.map((i) => (i.id === id ? { ...i, ...p } : i)));

  const okType = (f) => accept.split(',').map((a) => a.trim()).some((a) =>
    a === '*/*' || (a.endsWith('/*') ? f.type.startsWith(a.slice(0, -1)) : a.startsWith('.') ? f.name.toLowerCase().endsWith(a.toLowerCase()) : f.type === a));

  const add = (files) => {
    const bad = [];
    const good = [];
    [...files].slice(0, multiple ? 50 : 1).forEach((f) => {
      if (!okType(f)) bad.push(f.name + ': file type not allowed');
      else if (f.size > maxSizeMB * 1024 * 1024) bad.push(f.name + ': over ' + maxSizeMB + ' MB');
      else good.push({ id: Math.random().toString(36).slice(2), file: f, status: 'queued', progress: 0,
        preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null });
    });
    setNote(bad.join(' · '));
    if (good.length) setItems((l) => (multiple ? [...l, ...good] : good));
  };

  const run = async (it) => {
    const c = new AbortController();
    ctrls.current[it.id] = c;
    try {
      const url = await upload(it.file, (p) => patch(it.id, { progress: p }), c.signal);
      patch(it.id, { status: 'done', progress: 100, url });
      onDone?.(url, it.file);
    } catch (e) {
      patch(it.id, c.signal.aborted ? { status: 'canceled' } : { status: 'error', error: e.message || 'Upload failed' });
    } finally {
      delete ctrls.current[it.id];
    }
  };

  useEffect(() => {
    const active = items.filter((i) => i.status === 'uploading').length;
    items.filter((i) => i.status === 'queued' && !ctrls.current[i.id]).slice(0, MAX_PARALLEL - active)
      .forEach((i) => { patch(i.id, { status: 'uploading' }); run(i); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  useEffect(() => () => {
    Object.values(ctrls.current).forEach((c) => c.abort());
    latest.current.forEach((i) => i.preview && URL.revokeObjectURL(i.preview));
  }, []);

  const cancel = (i) => { ctrls.current[i.id]?.abort(); if (i.status === 'queued') patch(i.id, { status: 'canceled' }); };
  const retry = (i) => patch(i.id, { status: 'queued', progress: 0, error: '' });
  const remove = (i) => { ctrls.current[i.id]?.abort(); if (i.preview) URL.revokeObjectURL(i.preview); setItems((l) => l.filter((x) => x.id !== i.id)); };

  return (
    <div>
      <div className={'fu-drop' + (over ? ' over' : '')} role="button" tabIndex={0} aria-label={label}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}>
        <UploadCloud size={22} />
        <span>{label}</span>
        <span style={{ fontSize: 11.5 }}>Max {maxSizeMB} MB each</span>
        <input ref={input} type="file" hidden multiple={multiple} accept={accept}
          onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      </div>
      {note && <div className="ui-err" role="alert">{note}</div>}
      {items.length > 0 && (
        <div className="fu-list" aria-live="polite">
          {items.map((i) => (
            <div key={i.id} className="fu-item">
              {i.preview ? <img className="fu-thumb" src={i.preview} alt="" /> : <div className="fu-thumb" />}
              <div className="fu-main">
                <div className="fu-name">{i.file.name}</div>
                <div className={'fu-meta' + (i.status === 'error' ? ' err' : '')}>
                  {fmt(i.file.size)} · {i.status === 'uploading' ? i.progress + '%' : i.status === 'error' ? i.error : i.status}
                </div>
                {(i.status === 'uploading' || i.status === 'done') && (
                  <div className={'fu-bar' + (i.status === 'done' ? ' done' : '')} role="progressbar" aria-valuenow={i.progress} aria-valuemin={0} aria-valuemax={100}><i style={{ width: i.progress + '%' }} /></div>
                )}
              </div>
              {i.status === 'done' && <Check size={16} color="#10B981" aria-label="Uploaded" />}
              {(i.status === 'error' || i.status === 'canceled') && <button type="button" className="fu-btn" onClick={() => retry(i)} aria-label={'Retry ' + i.file.name}><RotateCw size={15} /></button>}
              {(i.status === 'uploading' || i.status === 'queued') && <button type="button" className="fu-btn" onClick={() => cancel(i)} aria-label={'Cancel ' + i.file.name}><X size={15} /></button>}
              {(i.status === 'done' || i.status === 'error' || i.status === 'canceled') && <button type="button" className="fu-btn" onClick={() => remove(i)} aria-label={'Remove ' + i.file.name}><X size={15} /></button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
