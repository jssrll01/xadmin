import { useEffect } from 'react';

// Escape closes, page scroll is locked while open
export default function useOverlay(open, onClose, closeOnEsc = true) {
  useEffect(() => {
    if (!open) return undefined;
    const k = (e) => { if (e.key === 'Escape' && closeOnEsc && onClose) onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [open, onClose, closeOnEsc]);
}
