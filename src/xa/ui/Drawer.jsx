import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import useOverlay from './useOverlay.js';

// Floating popup (kept under the name Drawer so every page that uses it gets the new look)
export default function Drawer({ open, onClose, title, children, footer, closeOnEsc = true, wide }) {
  const box = useRef(null);
  useOverlay(open, onClose, closeOnEsc);
  useEffect(() => { if (open && box.current) box.current.focus(); }, [open]);
  if (!open) return null;
  return createPortal(
    <div className="ui-ov" onMouseDown={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div className={'ui-modal ui-float' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title} ref={box} tabIndex={-1}>
        <div className="ui-mh"><h3>{title}</h3><button type="button" className="ui-x" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
        <div className="ui-fbody">{children}</div>
        {footer ? <div className="ui-ffoot">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}
