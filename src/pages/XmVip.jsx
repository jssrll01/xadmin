import React, { useCallback, useEffect, useState } from 'react';
import useAutoClear from '../xa/useAutoClear.js';
import { Crown, Search, Plus, Edit2, Trash2, Ban, RefreshCw } from 'lucide-react';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import Modal from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { xrpc } from '../lib/xrpc.js';

const inp = { width: '100%', border: 'none', outline: 'none', borderRadius: 12, padding: '10px 12px', fontSize: 13, background: 'var(--bg, #e0e5ec)', color: 'inherit', boxShadow: 'inset 4px 4px 8px rgba(163,177,198,0.6), inset -4px -4px 8px rgba(255,255,255,0.7)' };
const lbl = { fontSize: 11, fontWeight: 800, opacity: 0.65, margin: '10px 0 4px', display: 'block' };
const peso = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
const fdt = (d) => (d ? new Date(d).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '-');
const toLocalInput = (iso) => { const d = new Date(iso); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };

function Stat({ label, value }) {
  return (
    <Card style={{ padding: 14, textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 900 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.6 }}>{label}</div>
    </Card>
  );
}

export default function XmVip() {
  const { show } = useToast();
  const [sum, setSum] = useState(null);
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  useAutoClear(q, setQ);
  const [loading, setLoading] = useState(true);
  const [grant, setGrant] = useState(null);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (search) => {
    try {
      const [s, l] = await Promise.all([
        xrpc('admin_vip_summary'),
        xrpc('admin_vip_list', { p_search: (search ?? '') || null, p_limit: 300 }),
      ]);
      setSum(s); setRows(Array.isArray(l) ? l : []);
    } catch (e) { show?.(e.message || 'Failed to load', 'error'); }
    setLoading(false);
  }, [show]);

  useEffect(() => { load(''); }, [load]);
  useEffect(() => { const t = setTimeout(() => load(q.trim()), 350); return () => clearTimeout(t); }, [q, load]);

  const run = async (fn, args, okMsg) => {
    setBusy(true);
    try { await xrpc(fn, args); show?.(okMsg, 'success'); await load(q.trim()); return true; }
    catch (e) { show?.(e.message || 'Failed', 'error'); return false; }
    finally { setBusy(false); }
  };

  const doGrant = async () => {
    if (!grant?.user?.trim()) return show?.('Enter an email or user ID', 'error');
    if (await run('admin_vip_grant', { p_user: grant.user.trim(), p_days: Number(grant.days) || 30 }, 'VIP granted')) setGrant(null);
  };
  const doEdit = async () => {
    if (await run('admin_vip_update', { p_id: edit.id, p_expires_at: new Date(edit.expires).toISOString(), p_amount: Number(edit.amount) }, 'Membership updated')) setEdit(null);
  };
  const revoke = (r) => { if (window.confirm('End VIP now for ' + (r.email || r.user_id) + '?')) run('admin_vip_revoke', { p_user: r.user_id }, 'VIP revoked'); };
  const remove = (r) => { if (window.confirm('Delete this membership record permanently?')) run('admin_vip_delete', { p_id: r.id }, 'Record deleted'); };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}><Crown size={22} /> VIP Members</div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>Manage XMARKET VIP memberships</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={() => load(q.trim())}><RefreshCw size={14} /></Btn>
          <Btn variant="primary" onClick={() => setGrant({ user: '', days: 30 })}><Plus size={14} /> Grant VIP</Btn>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 14 }}>
        <Stat label="Active members" value={sum?.active_members ?? '-'} />
        <Stat label="Paid purchases" value={sum?.total_purchases ?? '-'} />
        <Stat label="Revenue" value={sum ? peso(sum.revenue) : '-'} />
        <Stat label="Expiring in 7 days" value={sum?.expiring_7d ?? '-'} />
      </div>

      <Card style={{ padding: 12 }}>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: 12, opacity: 0.5 }} />
          <input style={{ ...inp, paddingLeft: 34 }} placeholder="Search email, username or user ID" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 720 }}>
            <thead>
              <tr style={{ textAlign: 'left', opacity: 0.6 }}>
                {['User', 'Status', 'Started', 'Expires', 'Paid', ''].map((h) => <th key={h} style={{ padding: '8px 6px', fontWeight: 800 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', opacity: 0.6 }}>Loading…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', opacity: 0.6 }}>No memberships found</td></tr>}
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <td style={{ padding: '8px 6px' }}>
                    <div style={{ fontWeight: 800 }}>{[r.first_name, r.last_name].filter(Boolean).join(' ') || r.username || '-'}</div>
                    <div style={{ opacity: 0.6, fontSize: 11 }}>{r.email}</div>
                  </td>
                  <td style={{ padding: '8px 6px' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999, color: r.active ? '#047857' : '#64748B', background: r.active ? 'rgba(5,150,105,.14)' : 'rgba(100,116,139,.15)' }}>{r.active ? 'ACTIVE' : 'EXPIRED'}</span>
                  </td>
                  <td style={{ padding: '8px 6px' }}>{fdt(r.starts_at)}</td>
                  <td style={{ padding: '8px 6px' }}>{fdt(r.expires_at)}</td>
                  <td style={{ padding: '8px 6px' }}>{Number(r.amount) === 0 ? 'Free' : peso(r.amount)}</td>
                  <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>
                    <Btn onClick={() => setEdit({ id: r.id, expires: toLocalInput(r.expires_at), amount: r.amount })}><Edit2 size={13} /></Btn>{' '}
                    {r.active && <><Btn onClick={() => revoke(r)} disabled={busy}><Ban size={13} /></Btn>{' '}</>}
                    <Btn variant="danger" onClick={() => remove(r)} disabled={busy}><Trash2 size={13} /></Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={!!grant} onClose={() => setGrant(null)} title="Grant VIP">
        <label style={lbl}>User email or ID</label>
        <input style={inp} value={grant?.user || ''} onChange={(e) => setGrant({ ...grant, user: e.target.value })} placeholder="user@email.com" />
        <label style={lbl}>Days</label>
        <input style={inp} type="number" min="1" max="3650" value={grant?.days || ''} onChange={(e) => setGrant({ ...grant, days: e.target.value })} />
        <div style={{ fontSize: 11, opacity: 0.6, marginTop: 8 }}>If the user is already VIP, the days are added after their current expiry. No wallet charge.</div>
        <Btn variant="primary" style={{ width: '100%', marginTop: 14 }} onClick={doGrant} disabled={busy}>{busy ? 'Saving…' : 'Grant VIP'}</Btn>
      </Modal>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit membership">
        <label style={lbl}>Expires at</label>
        <input style={inp} type="datetime-local" value={edit?.expires || ''} onChange={(e) => setEdit({ ...edit, expires: e.target.value })} />
        <label style={lbl}>Amount paid (₱)</label>
        <input style={inp} type="number" min="0" value={edit?.amount ?? ''} onChange={(e) => setEdit({ ...edit, amount: e.target.value })} />
        <Btn variant="primary" style={{ width: '100%', marginTop: 14 }} onClick={doEdit} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Btn>
      </Modal>
    </div>
  );
}
