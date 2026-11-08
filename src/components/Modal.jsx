import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// Rendered straight into <body> so no parent (transform, overflow, animation) can clip or misplace it.
export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="xa-ov center" onClick={onClose}>
      <div className="xa-dialog" style={{ maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }} role="dialog" aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Dialog'} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button type="button" className="xa-icon-btn" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
