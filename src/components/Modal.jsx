import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);

  if (!open) return null;
  const maxW = size === 'lg' ? 720 : size === 'sm' ? 380 : 520;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 900,
      background: 'rgba(30,35,45,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, backdropFilter: 'blur(4px)',
    }}>
      <div onClick={e => e.stopPropagation()} className="page-enter" style={{
        background: 'var(--surface)', borderRadius: 'var(--r-xl)',
        boxShadow: 'var(--neu-float)', width: '100%', maxWidth: maxW,
        maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{title}</div>
          <button onClick={onClose} className="neu-btn neu-btn-ghost" style={{ padding: 8, borderRadius: 12 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 22, overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}
