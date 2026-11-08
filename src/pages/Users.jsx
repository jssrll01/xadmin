import React, { useState } from 'react';
import { Wallet as WalletIcon, Image as ImageIcon, Award } from 'lucide-react';
import CrudPage from '../components/CrudPage.jsx';
import Modal from '../components/Modal.jsx';
import Btn from '../components/Btn.jsx';
import { useToast } from '../components/Toast.jsx';
import { ConfirmDialog } from '../xa/Kit.jsx';
import { fetchUsers, userCrud } from '../lib/api.js';
import { peso, dateOnly, initials } from '../lib/format.js';
import { getAdminPin } from '../lib/pin.js';
import { supabase } from '../supabase.js';

const TITLES = { wallet: 'Adjust wallet', points: 'Set loyalty points', photo: 'Profile photo' };
const who = (r) => r.email || r.username || String(r.id || '').slice(0, 8);

export default function Users() {
  const { show } = useToast();
  const [dlg, setDlg] = useState(null);
  const [f, setF] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [stat, setStat] = useState(null);

  const call = async (fn, args) => {
    const { error } = await supabase.rpc(fn, { code: getAdminPin(), ...args });
    return error ? error.message : '';
  };
  const open = (kind, row) => {
    setErr('');
    setF(kind === 'wallet' ? { amt: '', note: '' } : kind === 'points' ? { v: String(row.loyalty_points || 0) } : { url: row.avatar_url || '' });
    setDlg({ kind, row });
  };
  const close = () => { if (!busy) setDlg(null); };

  const submit = async () => {
    const { kind, row } = dlg;
    let fn; let args; let ok;
    if (kind === 'wallet') {
      const amt = Number(f.amt);
      if (!String(f.amt).trim() || !Number.isFinite(amt) || amt === 0) return setErr('Enter an amount. Use a minus sign to remove money.');
      fn = 'admin_wallet_adjust'; ok = 'Wallet updated';
      args = { p_uid: row.id, p_amt: amt, p_type: 'adjustment', p_note: (f.note || '').trim() || 'Admin adjustment' };
    } else if (kind === 'points') {
      const n = Number(f.v);
      if (!String(f.v).trim() || !Number.isFinite(n) || n < 0) return setErr('Enter a whole number, 0 or more.');
      fn = 'admin_user_set'; ok = 'Points updated';
      args = { p_uid: row.id, p_points: Math.floor(n) };
    } else {
      const url = (f.url || '').trim();
      if (url && !/^https:\/\/\S+$/i.test(url)) return setErr('The photo link must start with https://');
      fn = 'admin_avatar_set'; ok = url ? 'Photo updated' : 'Photo removed';
      args = { p_code: getAdminPin(), p_user: row.id, p_url: url };
    }
    setBusy(true);
    const m = await call(fn, args);
    setBusy(false);
    if (m) return setErr(m);
    show?.(ok, 'success');
    setDlg(null);
  };

  const applyStatus = async (row, status) => {
    setBusy(true);
    const m = await call('admin_user_set', { p_uid: row.id, p_status: status });
    setBusy(false);
    setStat(null);
    if (m) show?.(m, 'error'); else show?.('Status set to ' + status, 'success');
  };
  const pick = (row, status) => {
    if (status === (row.status || 'active').toLowerCase()) return;
    if (status === 'active') applyStatus(row, status); else setStat({ row, status });
  };

  return (
    <>
      <CrudPage
        title="Users"
        subtitle="All profiles"
        fetcher={fetchUsers}
        searchKeys={['email', 'username', 'first_name', 'last_name', 'phone']}
        columns={[
          { key: 'name', label: 'User', sortValue: (r) => [r.first_name, r.last_name].filter(Boolean).join(' ') || r.username || r.email || '', render: (r) => {
            const name = [r.first_name, r.last_name].filter(Boolean).join(' ') || r.username || r.email || '—';
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#7C3AED,#2563EB)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0, overflow: 'hidden' }}>
                  {r.avatar_url ? <img src={r.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(r.first_name, r.last_name, r.email || name)}
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>{name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{(r.id || '').slice(0, 8)}</div>
                </div>
              </div>
            );
          } },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone', hidden: true, render: (r) => r.phone || '—' },
          { key: 'loyalty_tier', label: 'Tier', hidden: true, render: (r) => r.loyalty_tier || '—' },
          { key: 'xwallet_balance', label: 'Wallet', render: (r) => peso(r.xwallet_balance || 0) },
          { key: 'loyalty_points', label: 'Points', render: (r) => r.loyalty_points || 0 },
          { key: 'status', label: 'Status', render: (r) => {
            const s = (r.status || 'active').toLowerCase();
            return <span className={'neu-badge badge-' + s}>{s}</span>;
          } },
          { key: 'created_at', label: 'Joined', render: (r) => dateOnly(r.created_at) },
        ]}
        formFields={[
          { key: 'email', label: 'Email' },
          { key: 'username', label: 'Username' },
          { key: 'first_name', label: 'First name' },
          { key: 'last_name', label: 'Last name' },
          { key: 'phone', label: 'Phone' },
        ]}
        onCreate={userCrud.create}
        onUpdate={userCrud.update}
        onDelete={userCrud.remove}
        extraRowActions={(row) => (
          <>
            <select className="neu-input-sm" aria-label="Account status" value={(row.status || 'active').toLowerCase()} onChange={(e) => pick(row, e.target.value)}>
              <option value="active">Active</option>
              <option value="frozen">Frozen</option>
              <option value="banned">Banned</option>
            </select>
            <button type="button" className="ui-ic" data-tip="Adjust wallet" aria-label="Adjust wallet" onClick={() => open('wallet', row)}><WalletIcon size={14} /></button>
            <button type="button" className="ui-ic" data-tip="Profile photo" aria-label="Profile photo" onClick={() => open('photo', row)}><ImageIcon size={14} /></button>
            <button type="button" className="ui-ic" data-tip="Set points" aria-label="Set points" onClick={() => open('points', row)}><Award size={14} /></button>
          </>
        )}
      />

      <Modal open={!!dlg} onClose={close} title={dlg ? TITLES[dlg.kind] + ' · ' + who(dlg.row) : ''}>
        {dlg && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {dlg.kind === 'wallet' && (
              <>
                <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Current wallet: <b style={{ color: 'var(--text)' }}>{peso(dlg.row.xwallet_balance || 0)}</b></div>
                <div>
                  <div className="ui-lbl">Amount (use - to remove money)</div>
                  <input className={'neu-input' + (err ? ' bad' : '')} type="number" inputMode="decimal" autoFocus value={f.amt} onChange={(e) => { setF({ ...f, amt: e.target.value }); setErr(''); }} placeholder="e.g. 100 or -50" />
                </div>
                <div>
                  <div className="ui-lbl">Note (optional)</div>
                  <input className="neu-input" maxLength={120} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Admin adjustment" />
                </div>
              </>
            )}
            {dlg.kind === 'points' && (
              <div>
                <div className="ui-lbl">Loyalty points</div>
                <input className={'neu-input' + (err ? ' bad' : '')} type="number" inputMode="numeric" autoFocus value={f.v} onChange={(e) => { setF({ ...f, v: e.target.value }); setErr(''); }} />
              </div>
            )}
            {dlg.kind === 'photo' && (
              <>
                {f.url && /^https:\/\/\S+$/i.test(f.url.trim()) && <img src={f.url.trim()} alt="Preview" style={{ width: 96, height: 96, borderRadius: 14, objectFit: 'cover', border: '1px solid var(--border)' }} />}
                <div>
                  <div className="ui-lbl">Photo link (leave empty to remove)</div>
                  <input className={'neu-input' + (err ? ' bad' : '')} inputMode="url" autoCapitalize="none" autoFocus value={f.url} onChange={(e) => { setF({ ...f, url: e.target.value }); setErr(''); }} placeholder="https://" />
                </div>
              </>
            )}
            {err && <div className="ui-err" role="alert">{err}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="primary" loading={busy} onClick={submit} style={{ flex: 1 }}>{busy ? 'Saving…' : 'Save'}</Btn>
              <Btn onClick={close} disabled={busy} style={{ flex: 1 }}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!stat}
        title={stat ? (stat.status === 'banned' ? 'Ban ' : 'Freeze ') + who(stat.row) + '?' : ''}
        message={stat && stat.status === 'banned' ? 'This account will be banned. You can set it back to Active later.' : 'This account will be frozen. You can set it back to Active later.'}
        confirmText={stat && stat.status === 'banned' ? 'Ban user' : 'Freeze user'}
        danger
        busy={busy}
        onConfirm={() => applyStatus(stat.row, stat.status)}
        onCancel={() => setStat(null)}
      />
    </>
  );
}
