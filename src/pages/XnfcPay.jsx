import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase.js';
import { getAdminPin } from '../lib/pin.js';
import { peso, dateTime } from '../lib/format.js';
import { useToast } from '../components/Toast.jsx';

const call = async (fn, args = {}) => {
  const { data, error } = await supabase.rpc(fn, { p_code: getAdminPin(), ...args });
  if (error) throw error;
  return data;
};
const hasNfc = typeof window !== 'undefined' && 'NDEFReader' in window;
const newId = () => (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
const box = { background: 'var(--bg, #e0e5ec)', borderRadius: 16, padding: 14, boxShadow: '6px 6px 12px rgba(163,177,198,.5), -6px -6px 12px rgba(255,255,255,.7)' };
const btn = (bg) => ({ border: 0, borderRadius: 12, padding: '12px 14px', fontWeight: 800, fontSize: 14, color: '#fff', background: bg, cursor: 'pointer' });
const inp = { width: '100%', padding: 12, fontSize: 16, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', background: '#fff', boxSizing: 'border-box' };

export default function XnfcPay() {
  const { show } = useToast();
  const [partners, setPartners] = useState(null);
  const [partner, setPartner] = useState('');
  const [recent, setRecent] = useState([]);
  const [amount, setAmount] = useState('');
  const [scanning, setScanning] = useState(false);
  const [token, setToken] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const ctrl = useRef(null);
  const idem = useRef('');

  const load = useCallback(async () => {
    try {
      const p = await call('admin_nfc_partners');
      const list = Array.isArray(p) ? p : [];
      setPartners(list);
      setPartner((cur) => cur || (list[0] ? list[0].user_id : ''));
      const r = await call('admin_nfc_recent', { p_limit: 20 });
      setRecent(Array.isArray(r) ? r : []);
    } catch (e) { setPartners([]); show?.(e.message, 'error'); }
  }, [show]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { if (ctrl.current) ctrl.current.abort(); }, []);

  const stopScan = () => { if (ctrl.current) ctrl.current.abort(); setScanning(false); };

  const startScan = async () => {
    const amt = Math.round(Number(amount) * 100) / 100;
    if (!(amt >= 1)) return show?.('Enter an amount of at least ₱1', 'error');
    try {
      const ndef = new window.NDEFReader();
      ctrl.current = new AbortController();
      await ndef.scan({ signal: ctrl.current.signal });
      setScanning(true);
      ndef.onreadingerror = () => show?.('Could not read that card. Try again.', 'error');
      ndef.onreading = (ev) => {
        for (const rec of ev.message.records) {
          if (rec.recordType !== 'text') continue;
          const txt = new TextDecoder(rec.encoding || 'utf-8').decode(rec.data);
          if (txt.indexOf('XM1:') === 0) {
            ctrl.current.abort();
            setScanning(false);
            idem.current = newId();
            setPin('');
            setToken(txt.slice(4));
            return;
          }
        }
        show?.('This is not an Xmarket card.', 'error');
      };
    } catch (e) {
      setScanning(false);
      show?.('Could not start NFC. Turn NFC on and allow it for this site.', 'error');
    }
  };

  const pay = async () => {
    if (!/^\d{4}$/.test(pin)) return show?.('Enter the 4-digit PIN', 'error');
    setBusy(true);
    try {
      const d = await call('admin_nfc_pay', { p_partner: partner || null, p_token: token, p_amount: Number(amount), p_pin: pin, p_idem: idem.current });
      if (!d || !d.ok) { show?.((d && d.error) || 'Payment failed', 'error'); }
      else { setDone(d); setToken(''); setAmount(''); load(); }
    } catch (e) { show?.('Network problem. Check Recent before charging again.', 'error'); }
    setPin('');
    setBusy(false);
  };

  const overlay = { position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px' }}>xnfc215 · Tap to pay</h2>
      {!hasNfc && <p style={{ fontSize: 12.5, color: '#DC2626' }}>Card reading needs Chrome on Android with NFC on.</p>}
      <div style={box}>
        {partners === null ? <p>Loading…</p> : partners.length === 0 ? (
          <p style={{ margin: 0 }}>No NFC partner is registered yet.</p>
        ) : (
          <>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#8a93a3' }}>Payments go to</label>
            <select value={partner} onChange={(e) => setPartner(e.target.value)} style={{ ...inp, margin: '6px 0 12px' }}>
              {partners.map((p) => <option key={p.user_id} value={p.user_id}>{p.name} · {p.email}</option>)}
            </select>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#8a93a3' }}>Amount (₱)</label>
            <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
              style={{ ...inp, margin: '6px 0 12px', fontSize: 24, fontWeight: 800, textAlign: 'center' }} />
            {scanning ? (
              <>
                <p style={{ textAlign: 'center', fontWeight: 800 }}>Hold the customer card near the back of this phone…</p>
                <button onClick={stopScan} style={{ ...btn('#64748B'), width: '100%' }}>Cancel</button>
              </>
            ) : (
              <button disabled={!hasNfc} onClick={startScan} style={{ ...btn('#2563EB'), width: '100%' }}>Tap card to charge</button>
            )}
          </>
        )}
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 800, margin: '16px 0 8px' }}>Recent payments</h3>
      {recent.length === 0 ? <p style={{ color: '#8a93a3', fontSize: 13 }}>No payments yet.</p> : recent.map((r) => (
        <div key={r.receipt_no + r.created_at} style={{ ...box, marginBottom: 8, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.customer}</div>
            <div style={{ fontSize: 11, color: '#8a93a3' }}>{dateTime(r.created_at)} · {r.receipt_no}{r.partner ? ' · ' + r.partner : ''}</div>
          </div>
          <b style={{ color: '#059669' }}>{peso(r.amount)}</b>
        </div>
      ))}

      {token && (
        <div style={overlay}>
          <div style={{ ...box, width: '100%', maxWidth: 340 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Customer PIN</div>
            <p style={{ fontSize: 13, margin: '6px 0 12px' }}>Charge <b>{peso(Number(amount))}</b>. Ask the customer to enter their 4-digit Xwallet PIN.</p>
            <input type="password" inputMode="numeric" maxLength={4} autoFocus value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              style={{ ...inp, height: 54, textAlign: 'center', fontSize: 24, letterSpacing: 10, marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setToken(''); setPin(''); }} style={{ ...btn('#64748B'), flex: 1 }}>Cancel</button>
              <button disabled={busy || pin.length !== 4} onClick={pay} style={{ ...btn('#059669'), flex: 1 }}>{busy ? 'Processing…' : 'Pay'}</button>
            </div>
          </div>
        </div>
      )}

      {done && (
        <div style={overlay}>
          <div style={{ ...box, width: '100%', maxWidth: 340, textAlign: 'center' }}>
            <div style={{ fontSize: 40 }}>✅</div>
            <div style={{ fontSize: 26, fontWeight: 800, margin: '6px 0' }}>{peso(done.amount)}</div>
            {done.customer && <div style={{ fontSize: 13, color: '#8a93a3' }}>from {done.customer}</div>}
            <div style={{ fontSize: 12, color: '#8a93a3', marginTop: 4 }}>Receipt {done.receipt_no}</div>
            <button onClick={() => setDone(null)} style={{ ...btn('#2563EB'), width: '100%', marginTop: 14 }}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
