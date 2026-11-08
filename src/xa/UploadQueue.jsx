import React, { useEffect, useRef, useState } from 'react';
import useUpload, { fmtSize } from './useUpload.js';

const sp = (b) => (b > 0 ? fmtSize(b) + '/s' : '');

// <UploadQueue upload={useUpload({preset})} multiple onUrls={(urls)=>...} />
export default function UploadQueue({ upload, multiple = true, accept = 'image/*', label = 'Drop images here or click to choose', onDone }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef(null);
  const { items, add, cancel, retry, remove, clear, busy, urls } = upload;

  useEffect(() => {
    if (!busy) { const h = (e) => { if (e.preventDefault) e.preventDefault(); }; window.removeEventListener('beforeunload', h); return undefined; }
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [busy]);
  useEffect(() => { if (onDone && !busy && urls.length) onDone(urls); }, [busy]); // eslint-disable-line

  return (
    <div>
      <div role="button" tabIndex={0} aria-label="Upload files"
        onClick={() => ref.current && ref.current.click()} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ref.current && ref.current.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(multiple ? e.dataTransfer.files : [e.dataTransfer.files[0]].filter(Boolean)); }}
        style={{ border: '2px dashed ' + (drag ? 'var(--primary)' : 'var(--border-strong, var(--border))'), background: drag ? 'var(--primary-soft)' : 'var(--surface-2)', borderRadius: 14, padding: '20px 14px', textAlign: 'center', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-dim)' }}>
        {label}
        <input ref={ref} type="file" accept={accept} multiple={multiple} style={{ display: 'none' }} onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      </div>
      {items.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((it) => (
            <div key={it.id} className="neu-card" style={{ padding: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
              {it.preview ? <img src={it.preview} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} /> : <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--surface-2)', flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
                <div style={{ fontSize: 11, color: it.status === 'error' ? 'var(--danger)' : 'var(--text-dim)', margin: '2px 0 4px' }}>
                  {it.status === 'error' ? it.error : it.status === 'done' ? 'Uploaded · ' + fmtSize(it.size) : it.status === 'queued' ? 'Waiting · ' + fmtSize(it.size) : it.pct + '% · ' + fmtSize(it.size) + (it.speed ? ' · ' + sp(it.speed) : '')}
                </div>
                {(it.status === 'uploading' || it.status === 'queued') && (
                  <div role="progressbar" aria-valuenow={it.pct} aria-valuemin={0} aria-valuemax={100} style={{ height: 6, borderRadius: 6, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ width: it.pct + '%', height: '100%', background: 'var(--primary)', transition: 'width .2s' }} />
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {it.status === 'uploading' && <button type="button" className="neu-btn" onClick={() => cancel(it.id)}>Cancel</button>}
                {it.status === 'error' && !it.fatal && <button type="button" className="neu-btn" onClick={() => retry(it.id)}>Retry</button>}
                {it.status !== 'uploading' && <button type="button" className="neu-btn" aria-label="Remove" onClick={() => remove(it.id)}>✕</button>}
              </div>
            </div>
          ))}
          {items.length > 1 && !busy && <button type="button" className="neu-btn" onClick={clear}>Clear all</button>}
        </div>
      )}
    </div>
  );
}
export { useUpload };
