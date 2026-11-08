import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfirmDialog } from './Kit.jsx';
import Btn from '../components/Btn.jsx';

function mount(render) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  return new Promise((resolve) => {
    const finish = (v) => { resolve(v); setTimeout(() => { root.unmount(); host.remove(); }, 0); };
    root.render(render(finish));
  });
}

// await askConfirm({ title, message, confirmText, danger }) -> true | false
export function askConfirm({ title = 'Are you sure?', message = '', confirmText = 'Confirm', danger = false } = {}) {
  return mount((finish) => (
    <ConfirmDialog open title={title} message={message} confirmText={confirmText} danger={danger}
      onConfirm={() => finish(true)} onCancel={() => finish(false)} />
  ));
}

function PromptBox({ title, message, initial, placeholder, required, multiline, confirmText, onSubmit, onCancel }) {
  const [v, setV] = useState(initial || '');
  const [err, setErr] = useState('');
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const submit = () => {
    if (required && !v.trim()) return setErr('This field is required');
    onSubmit(v.trim());
  };
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onCancel]);
  const Field = multiline ? 'textarea' : 'input';
  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-label={title} className="neu-card" onClick={(e) => e.stopPropagation()} style={{ width: 'min(420px, 100%)' }}>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>{title}</div>
        {message && <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 10, whiteSpace: 'pre-wrap' }}>{message}</div>}
        <Field ref={ref} className={'neu-input' + (err ? ' bad' : '')} value={v} rows={multiline ? 4 : undefined} placeholder={placeholder}
          onChange={(e) => { setV(e.target.value); setErr(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !multiline) { e.preventDefault(); submit(); } }} />
        {err && <div className="ui-err" role="alert">{err}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <Btn variant="primary" onClick={submit} style={{ flex: 1 }}>{confirmText}</Btn>
          <Btn onClick={onCancel} style={{ flex: 1 }}>Cancel</Btn>
        </div>
      </div>
    </div>
  );
}

// await askPrompt({ title, message, initial, required, multiline }) -> string | null (null = canceled)
export function askPrompt(opts = {}) {
  return mount((finish) => (
    <PromptBox title="Enter a value" confirmText="OK" {...opts} onSubmit={(v) => finish(v)} onCancel={() => finish(null)} />
  ));
}
