import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import useOverlay from './useOverlay.js';

export default function Drawer({ open, onClose, title, children, footer, closeOnEsc = true }) {
  const box = useRef(null);
  useOverlay(open, onClose, closeOnEsc);
  useEffect(() => { if (open && box.current) box.current.focus(); }, [open]);
  if (!open) return null;
  return (
    <div className="ui-ov right" onMouseDown={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <aside className="ui-drawer" role="dialog" aria-modal="true" aria-label={title} ref={box} tabIndex={-1}>
        <div className="ui-dh"><h3>{title}</h3><button type="button" className="ui-x" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
        <div className="ui-db">{children}</div>
        {footer ? <div className="ui-df">{footer}</div> : null}
      </aside>
    </div>
  );
}
