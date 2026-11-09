import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyRound, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import '../styles/nfc.css';

const supported = () => typeof window !== 'undefined' && 'NDEFReader' in window;

function pinsFromRecords(records) {
  const found = [];
  for (const r of records || []) {
    try {
      const text = r.data ? new TextDecoder(r.encoding || 'utf-8').decode(r.data).trim() : '';
      if (!text) continue;
      const m = text.match(/[#?&]pin=([^&#\s]+)/i) || text.match(/^pin=([^&#\s]+)/i);
      if (m) found.push(decodeURIComponent(m[1]));
      else if (r.recordType === 'text' && /^\d{4,12}$/.test(text)) found.push(text);
    } catch (e) { /* ignore unreadable record */ }
  }
  return found;
}

export default function NfcScan({ onPin, onFallback }) {
  const [state, setState] = useState(supported() ? 'idle' : 'unsupported');
  const [note, setNote] = useState('');
  const abortRef = useRef(null);
  const busyRef = useRef(false);
  const aliveRef = useRef(true);
  const stateRef = useRef(state);
  const onPinRef = useRef(onPin);
  stateRef.current = state;
  onPinRef.current = onPin;

  const stop = () => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
  };

  const start = useCallback(async () => {
    if (!supported()) { setState('unsupported'); return; }
    stop();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const reader = new window.NDEFReader();
      await reader.scan({ signal: ac.signal });
      if (!aliveRef.current || ac.signal.aborted) return;
      setState('scanning');
      setNote('');
      reader.onreadingerror = () => {
        if (busyRef.current) return;
        setState('bad');
        setNote('That card could not be read. Hold it steady and try again.');
        setTimeout(() => { if (aliveRef.current && stateRef.current === 'bad') setState('scanning'); }, 2400);
      };
      reader.onreading = async (ev) => {
        if (busyRef.current) return;
        busyRef.current = true;
        setState('reading');
        const pins = pinsFromRecords(ev.message && ev.message.records);
        let ok = false;
        for (const p of pins) {
          try { ok = !!(await onPinRef.current(p)); } catch (e) { ok = false; }
          if (ok) break;
        }
        busyRef.current = false;
        if (!aliveRef.current) return;
        if (ok) {
          stop();
          setState('ok');
          if (navigator.vibrate) navigator.vibrate(40);
        } else {
          setState('bad');
          setNote(pins.length ? 'This card is not authorized.' : 'No admin credential found on this card.');
          setTimeout(() => { if (aliveRef.current && stateRef.current === 'bad') setState('scanning'); }, 2400);
        }
      };
    } catch (err) {
      if (!aliveRef.current || ac.signal.aborted) return;
      if (err && err.name === 'NotAllowedError') { setState('blocked'); setNote('Tap Start to allow NFC access.'); }
      else if (err && err.name === 'NotSupportedError') setState('unsupported');
      else { setState('off'); setNote('NFC is off or unavailable. Turn it on in your phone settings, then tap Start.'); }
    }
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    start();
    const vis = () => {
      if (!document.hidden && ['scanning', 'bad', 'blocked', 'off'].includes(stateRef.current)) start();
    };
    document.addEventListener('visibilitychange', vis);
    return () => {
      aliveRef.current = false;
      document.removeEventListener('visibilitychange', vis);
      stop();
    };
  }, [start]);

  const copy = {
    idle: ['Preparing scanner…', 'One moment.'],
    scanning: ['Scan your admin NFC card', 'Hold the card against the back of your phone.'],
    reading: ['Verifying card…', 'Keep the card in place.'],
    ok: ['Access granted', 'Opening Xadmin…'],
    bad: ['Card not accepted', note],
    blocked: ['Allow NFC to continue', note],
    off: ['NFC unavailable', note],
    unsupported: ['NFC not supported here', 'Open Xadmin in Chrome on an Android phone with NFC, or use your PIN.'],
  }[state];
  const needsStart = state === 'blocked' || state === 'off';

  return (
    <div className={'nfc ' + state} role="status" aria-live="polite">
      <div className="nfc-stage" aria-hidden="true">
        <i className="nfc-ring" /><i className="nfc-ring" /><i className="nfc-ring" />
        <div className="nfc-card">
          <b className="nfc-chip" />
          <svg className="nfc-wave" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 8.5a6 6 0 0 1 0 7" /><path d="M10 6.5a9 9 0 0 1 0 11" /><path d="M14 4.5a12 12 0 0 1 0 15" />
          </svg>
          <span className="nfc-sweep" />
        </div>
        <span className="nfc-badge">
          {state === 'ok' ? <ShieldCheck size={20} /> : state === 'bad' ? <ShieldAlert size={20} /> : null}
        </span>
      </div>
      <h2 className="nfc-title">{copy[0]}</h2>
      <p className="nfc-sub">{copy[1]}</p>
      {needsStart && (
        <button type="button" className="nfc-btn" onClick={start}><RefreshCw size={16} /> Start scanning</button>
      )}
      {onFallback && state !== 'ok' && (
        <button type="button" className="nfc-link" onClick={onFallback}><KeyRound size={14} /> Use PIN instead</button>
      )}
    </div>
  );
}
