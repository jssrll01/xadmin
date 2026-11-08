import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const parse = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
};
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// value: 'YYYY-MM-DD' (or 'YYYY-MM-DDTHH:mm' when withTime). onChange gets the same format, or '' when cleared.
export default function DatePicker({ value, onChange, min, max, withTime = false, placeholder = 'Select date', disabled, invalid, label }) {
  const [open, setOpen] = useState(false);
  const sel = parse(value);
  const [view, setView] = useState(() => { const d = sel || new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const ref = useRef(null);
  const time = (value && value.length >= 16 ? value.slice(11, 16) : '') || '00:00';

  useEffect(() => {
    if (!open) return;
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const key = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('touchstart', away);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('touchstart', away);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  const emit = (d, t) => onChange?.(d ? (withTime ? iso(d) + 'T' + (t || time) : iso(d)) : '');
  const minD = parse(min), maxD = parse(max);
  const y = view.getFullYear(), m = view.getMonth();
  const blanks = new Date(y, m, 1).getDay();
  const count = new Date(y, m + 1, 0).getDate();
  const todayIso = iso(new Date());
  const shown = sel ? (withTime ? iso(sel) + ' ' + time : iso(sel)) : '';

  return (
    <div className="dp" ref={ref}>
      <button type="button" className={'neu-input dp-btn' + (invalid ? ' bad' : '')} disabled={disabled}
        aria-haspopup="dialog" aria-expanded={open} aria-label={label || placeholder} onClick={() => setOpen((o) => !o)}>
        <Calendar size={15} />
        <span className={shown ? '' : 'ph'}>{shown || placeholder}</span>
      </button>
      {open && (
        <div className="dp-pop" role="dialog" aria-label="Choose date">
          <div className="dp-head">
            <button type="button" className="dp-nav" aria-label="Previous month" onClick={() => setView(new Date(y, m - 1, 1))}><ChevronLeft size={16} /></button>
            <span aria-live="polite">{view.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</span>
            <button type="button" className="dp-nav" aria-label="Next month" onClick={() => setView(new Date(y, m + 1, 1))}><ChevronRight size={16} /></button>
          </div>
          <div className="dp-grid">
            {DOW.map((d) => <div key={d} className="dp-dow">{d}</div>)}
            {Array.from({ length: blanks }).map((_, i) => <span key={'b' + i} />)}
            {Array.from({ length: count }).map((_, i) => {
              const d = new Date(y, m, i + 1);
              const off = (minD && d < minD) || (maxD && d > maxD);
              const id = iso(d);
              return (
                <button key={id} type="button" disabled={off} aria-label={d.toDateString()} aria-pressed={!!sel && iso(sel) === id}
                  className={'dp-day' + (id === todayIso ? ' today' : '') + (sel && iso(sel) === id ? ' sel' : '')}
                  onClick={() => { emit(d); if (!withTime) setOpen(false); }}>{i + 1}</button>
              );
            })}
          </div>
          {withTime && (
            <div style={{ marginTop: 8 }}>
              <input type="time" className="neu-input" value={time} aria-label="Time"
                onChange={(e) => sel && emit(sel, e.target.value || '00:00')} disabled={!sel} />
            </div>
          )}
          <div className="dp-foot">
            <button type="button" className="neu-input" style={{ width: 'auto', padding: '6px 12px' }}
              onClick={() => { emit(new Date()); setView(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); if (!withTime) setOpen(false); }}>Today</button>
            <button type="button" className="neu-input" style={{ width: 'auto', padding: '6px 12px' }}
              onClick={() => { emit(null); setOpen(false); }}>Clear</button>
          </div>
        </div>
      )}
    </div>
  );
}
