import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/* ---------- Skeleton ---------- */
export const Sk = ({ w = '100%', h = 14, r, style }) => <span className="xa-sk" style={{ width: w, height: h, borderRadius: r, ...style }} />;
export const SkRows = ({ rows = 8, cols = 5 }) => (
  <div aria-busy="true" aria-label="Loading">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14, padding: '13px 8px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
        {Array.from({ length: cols }).map((__, j) => <Sk key={j} w={j === 0 ? '70%' : '85%'} />)}
      </div>
    ))}
  </div>
);
export const SkCards = ({ n = 4 }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }} aria-busy="true">
    {Array.from({ length: n }).map((_, i) => <div key={i} className="neu-card" style={{ padding: 14 }}><Sk w="55%" h={11} /><Sk w="40%" h={24} style={{ marginTop: 10 }} /></div>)}
  </div>
);

/* ---------- Toasts ---------- */
const ToastCtx = createContext({ push: () => {} });
export const useXaToast = () => useContext(ToastCtx);
export function XaToasts({ children }) {
  const [list, setList] = useState([]);
  const push = useCallback((message, type = 'info', ms = 4000) => {
    const id = Date.now() + Math.random();
    setList((p) => [...p.slice(-3), { id, message, type }]);
    if (ms) setTimeout(() => setList((p) => p.filter((t) => t.id !== id)), ms);
  }, []);
  const api = useRef({ push }); api.current.push = push;
  return (
    <ToastCtx.Provider value={api.current}>
      {children}
      <div className="xa-toasts" role="status" aria-live="polite">
        {list.map((t) => (
          <div key={t.id} className={'xa-toast ' + t.type}>
            <span>{t.message}</span>
            <button type="button" aria-label="Dismiss" onClick={() => setList((p) => p.filter((x) => x.id !== t.id))}>✕</button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Confirm dialog (type-to-confirm for dangerous actions) ---------- */
export function ConfirmDialog({ open, title, message, confirmText = 'Confirm', danger, typeToConfirm, busy, onConfirm, onCancel }) {
  const [typed, setTyped] = useState('');
  useEffect(() => { if (open) setTyped(''); }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const h = (e) => { if (e.key === 'Escape' && !busy) onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, busy, onCancel]);
  if (!open) return null;
  const locked = typeToConfirm && typed.trim() !== typeToConfirm;
  return (
    <div className="xa-ov center" onClick={() => !busy && onCancel()}>
      <div className="xa-dialog" role="alertdialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        {typeToConfirm && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>Type <b style={{ color: 'var(--text)' }}>{typeToConfirm}</b> to confirm</div>
            <input className="xa-input" autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} />
          </div>
        )}
        <div className="row">
          <button type="button" className="neu-btn" disabled={busy} onClick={onCancel}>Cancel</button>
          <button type="button" className={'neu-btn ' + (danger ? 'neu-btn-danger' : 'neu-btn-primary')} disabled={busy || locked} onClick={onConfirm}>
            {busy ? 'Working…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Button with loading state ---------- */
export function LoadingBtn({ loading, children, variant, ...rest }) {
  const cls = 'neu-btn' + (variant === 'primary' ? ' neu-btn-primary' : variant === 'danger' ? ' neu-btn-danger' : variant === 'success' ? ' neu-btn-success' : '');
  return (
    <button type="button" className={cls} {...rest} disabled={loading || rest.disabled} aria-busy={!!loading}>
      {loading && <span className="xa-sk" style={{ width: 12, height: 12, borderRadius: 6, marginRight: 6 }} />}
      {children}
    </button>
  );
}

export const EmptyState = ({ title = 'Nothing here yet', hint }) => <div className="xa-empty"><b>{title}</b>{hint}</div>;
export const ErrorState = ({ message, onRetry }) => (
  <div className="xa-empty"><b style={{ color: 'var(--danger)' }}>Something went wrong</b>{message}
    {onRetry && <div style={{ marginTop: 12 }}><button type="button" className="neu-btn" onClick={onRetry}>Try again</button></div>}
  </div>
);
export const Badge = ({ tone, children }) => <span className={'xa-badge' + (tone ? ' ' + tone : '')}>{children}</span>;
