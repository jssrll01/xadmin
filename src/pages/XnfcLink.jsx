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
const COLORS = { pending: '#F59E0B', active: '#059669', frozen: '#0284C7', rejected: '#DC2626', revoked: '#64748B' };
const LABEL = { pending: 'Pending', active: 'Activated', frozen: 'Frozen', rejected: 'Rejected', revoked: 'Removed' };
const TABS = [['pending', 'Pending'], ['active', 'Activated'], ['', 'All']];
const box = { background: 'var(--bg, #e0e5ec)', borderRadius: 16, padding: 14, boxShadow: '6px 6px 12px rgba(163,177,198,.5), -6px -6px 12px rgba(255,255,255,.7)' };
const btn = (bg) => ({ border: 0, borderRadius: 12, padding: '10px 14px', fontWeight: 800, fontSize: 13, color: '#fff', background: bg, cursor: 'pointer' });

export default function XnfcLink() {
  const { show } = useToast();
  const [tab, setTab] = useState('pending');
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [writing, setWriting] = useState(null);
  const ctrl = useRef(null);

  const load = useCallback(async () => {
    try {
      const d = await call('admin_nfc_requests', { p_status: tab || null });
      setRows(Array.isArray(d) ? d : []);
    } catch (e) { setRows([]); show?.(e.message, 'error'); }
  }, [tab, show]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);
  useEffect(() => () => { if (ctrl.current) ctrl.current.abort(); }, []);

  const activate = async (r) => {
    if (!hasNfc) return show?.('Writing cards needs Chrome on Android with NFC turned on.', 'error');
    setWriting(r);
    let prep;
    try { prep = await call('admin_nfc_prepare', { p_id: r.id }); }
    catch (e) { setWriting(null); return show?.(e.message, 'error'); }
    if (!prep || !prep.ok) { setWriting(null); return show?.((prep && prep.error) || 'Could not start', 'error'); }
    try {
      ctrl.current = new AbortController();
      const ndef = new window.NDEFReader();
      await ndef.write({ records: [{ recordType: 'text', data: 'XM1:' + prep.token }] }, { overwrite: true, signal: ctrl.current.signal });
    } catch (e) {
      setWriting(null);
      if (!(e && e.name === 'AbortError')) show?.('Could not write the card. Hold it against the back of the phone and try again.', 'error');
      return;
    }
    try {
      const c = await call('admin_nfc_confirm', { p_id: r.id });
      if (!c || !c.ok) throw new Error((c && c.error) || 'Could not activate');
      show?.('Card activated for ' + (r.user_name || r.email), 'success');
    } catch (e) { show?.(e.message, 'error'); }
    setWriting(null);
    load();
  };

  const reject = async (r) => {
    const note = window.prompt('Reason for rejection (shown to the user). The ₱' + r.fee + ' fee will be refunded.', '');
    if (note === null) return;
    setBusy(true);
    try {
      const d = await call('admin_nfc_reject', { p_id: r.id, p_note: note });
      if (!d || !d.ok) throw new Error((d && d.error) || 'Failed');
      show?.('Rejected and refunded', 'success');
      load();
    } catch (e) { show?.(e.message, 'error'); }
    setBusy(false);
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px' }}>xnfc215 · Link cards</h2>
      <p style={{ fontSize: 12.5, color: '#8a93a3', margin: '0 0 12px' }}>
        Tap Activate on a pending request, then tap a blank NFC 215 card on the back of this phone.
        {!hasNfc && <b style={{ color: '#DC2626' }}> Card writing needs Chrome on Android.</b>}
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {TABS.map(([k, l]) => (
          <button key={l} onClick={() => setTab(k)} style={{ ...btn(tab === k ? '#2563EB' : '#94A3B8'), padding: '8px 14px' }}>{l}</button>
        ))}
      </div>
      {rows === null ? <p>Loading…</p> : rows.length === 0 ? <p style={{ color: '#8a93a3' }}>Nothing here.</p> : rows.map((r) => (
        <div key={r.id} style={{ ...box, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{r.label || 'NFC card'}</div>
              <div style={{ fontSize: 12.5 }}>{r.user_name}</div>
              <div style={{ fontSize: 11.5, color: '#8a93a3' }}>{r.email}</div>
            </div>
            <span style={{ alignSelf: 'flex-start', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 99, color: COLORS[r.status], background: (COLORS[r.status] || '#64748B') + '22' }}>{LABEL[r.status] || r.status}</span>
          </div>
          <div style={{ fontSize: 11.5, color: '#8a93a3', marginTop: 6 }}>
            Requested {dateTime(r.created_at)} · Fee {peso(r.fee)}
            {r.activated_at ? ' · Activated ' + dateTime(r.activated_at) : ''}
            {r.reject_note ? ' · Reason: ' + r.reject_note : ''}
          </div>
          {r.status === 'pending' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button disabled={busy || !!writing} onClick={() => activate(r)} style={{ ...btn('#059669'), flex: 1 }}>Activate (tap card)</button>
              <button disabled={busy || !!writing} onClick={() => reject(r)} style={btn('#DC2626')}>Reject</button>
            </div>
          )}
        </div>
      ))}
      {writing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ ...box, maxWidth: 340, textAlign: 'center' }}>
            <div style={{ fontSize: 36 }}>💳</div>
            <div style={{ fontWeight: 800, fontSize: 16, margin: '8px 0 4px' }}>Tap the card now</div>
            <div style={{ fontSize: 13, color: '#8a93a3' }}>Hold a blank NFC 215 card against the back of this phone for {writing.user_name || writing.email} ({writing.label}).</div>
            <button onClick={() => { if (ctrl.current) ctrl.current.abort(); }} style={{ ...btn('#64748B'), marginTop: 14 }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
