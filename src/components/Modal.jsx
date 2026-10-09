import React from 'react';
import { X } from 'lucide-react';
export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(20,25,40,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--surface)', borderRadius: 20,
        padding: 22, width: '100%', maxWidth: 480,
        boxShadow: 'var(--neu-float)', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 900 }}>{title}</div>
          <button onClick={onClose} style={{ padding: 6 }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
