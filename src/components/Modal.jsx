import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import useOverlay from '../xa/ui/useOverlay.js';

export default function Modal({ open, onClose, title, children, wide, closeOnEsc = true }) {
  const box = useRef(null);
  useOverlay(open, onClose, closeOnEsc);
  useEffect(() => { if (open && box.current) box.current.focus(); }, [open]);
  if (!open) return null;
  return (
    <div className="ui-ov" onMouseDown={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div className={'ui-modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title} ref={box} tabIndex={-1}>
        <div className="ui-mh"><h3>{title}</h3><button type="button" className="ui-x" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
        {children}
      </div>
    </div>
  );
}
