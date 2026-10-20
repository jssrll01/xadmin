import React, { useEffect, useState } from 'react';
import { FileText, Search, Trash2, Edit3, Save, X, PlusCircle } from 'lucide-react';
import { fetchReceipts, receiptCrud } from '../lib/api.js';

const STATUSES = ['paid', 'unpaid', 'pending', 'overdue'];

function statusColor(s) {
  const v = (s || 'unpaid').toLowerCase();
  if (v === 'paid') return '#10B981';
  if (v === 'overdue') return '#EF4444';
  if (v === 'pending') return '#3B82F6';
  return '#F59E0B';
}

const emptyDraft = { receipt_no: '', customer_name: '', customer_email: '', customer_address: '', currency: 'PHP', payment_method: 'gcash', delivery_method: 'doortodoor', status: 'unpaid', total: 0, notes: '' };

export default function Quotations() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newDraft, setNewDraft] = useState(emptyDraft);

  const load = async () => {
    setLoading(true);
    const { items } = await fetchReceipts();
    setRows(items || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const startEdit = (row) => {
    setEditing(row.id);
    setDraft({
      receipt_no: row.receipt_no || '',
      customer_name: row.customer_name || '',
      customer_email: row.customer_email || '',
      customer_address: row.customer_address || '',
      currency: row.currency || 'PHP',
      payment_method: row.payment_method || 'gcash',
      delivery_method: row.delivery_method || 'doortodoor',
      status: row.status || 'unpaid',
      total: Number(row.total) || 0,
      notes: row.notes || '',
    });
  };

  const saveEdit = async () => {
    setBusy(true);
    const { error } = await receiptCrud.update(editing, draft);
    setBusy(false);
    if (error) return alert(error.message);
    setEditing(null);
    load();
  };

  const remove = async (id, no) => {
    if (!confirm(`Delete receipt ${no || id.slice(0,8)}? Cannot be undone.`)) return;
    const { error } = await receiptCrud.remove(id);
    if (error) return alert(error.message);
    load();
  };

  const submitNew = async () => {
    if (!newDraft.receipt_no || !newDraft.customer_name) return alert('receipt_no and customer_name are required');
    setBusy(true);
    const { error } = await receiptCrud.create({
      ...newDraft,
      items: [],
      subtotal: 0,
      tax_rate: 0,
      tax_amount: 0,
      discount_type: 'percent',
      discount_value: 0,
      discount_amount: 0,
      total: Number(newDraft.total) || 0,
    });
    setBusy(false);
    if (error) return alert(error.message);
    setCreating(false);
    setNewDraft(emptyDraft);
    load();
  };

  const filtered = rows.filter(r => {
    if (!q.trim()) return true;
    const t = q.trim().toLowerCase();
    return [r.receipt_no, r.customer_name, r.customer_email, r.status].filter(Boolean).join(' ').toLowerCase().includes(t);
  });

  const totalShown = filtered.reduce((s, r) => s + Number(r.total || 0), 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Quotations</h1>
          <p>Receipts issued via XQuote · {filtered.length} shown · ₱{totalShown.toLocaleString()}</p>
        </div>
        <button className="neu-btn-primary" onClick={() => setCreating(c => !c)}
          style={{ padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <PlusCircle size={14} /> {creating ? 'Close' : 'New'}
        </button>
      </div>

      {creating && (
        <div className="neu-card" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>New receipt</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input className="neu-input" placeholder="Receipt no *" value={newDraft.receipt_no} onChange={e => setNewDraft({ ...newDraft, receipt_no: e.target.value })} />
            <input className="neu-input" placeholder="Customer name *" value={newDraft.customer_name} onChange={e => setNewDraft({ ...newDraft, customer_name: e.target.value })} />
            <input className="neu-input" placeholder="Email" value={newDraft.customer_email} onChange={e => setNewDraft({ ...newDraft, customer_email: e.target.value })} />
            <input className="neu-input" placeholder="Total (₱)" type="number" value={newDraft.total} onChange={e => setNewDraft({ ...newDraft, total: e.target.value })} />
            <select className="neu-input" value={newDraft.status} onChange={e => setNewDraft({ ...newDraft, status: e.target.value })}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="neu-input" value={newDraft.currency} onChange={e => setNewDraft({ ...newDraft, currency: e.target.value })}>
              <option value="PHP">PHP</option>
              <option value="USD">USD</option>
            </select>
            <textarea className="neu-input" rows={2} placeholder="Address" value={newDraft.customer_address} onChange={e => setNewDraft({ ...newDraft, customer_address: e.target.value })} style={{ gridColumn: '1 / -1' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button onClick={submitNew} disabled={busy} className="neu-btn-primary" style={{ flex: 1, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Save size={14} /> {busy ? 'Saving…' : 'Create'}
            </button>
            <button onClick={() => setCreating(false)} className="neu-btn" style={{ flex: 1, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: 15, color: '#97A0B5' }} />
        <input className="neu-input" style={{ paddingLeft: 40 }} placeholder="Search receipt no, customer, email…" value={q} onChange={e => setQ(e.target.value)} />
      </div>

      {loading && <div className="muted" style={{ padding: 30, textAlign: 'center' }}>Loading…</div>}
      {!loading && !filtered.length && (
        <div className="neu-card" style={{ padding: 30, textAlign: 'center' }}>
          <FileText size={30} style={{ color: '#97A0B5', marginBottom: 8 }} />
          <div className="muted">No quotations yet</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(row => {
          const isEditing = editing === row.id;
          const sc = statusColor(row.status);
          return (
            <div key={row.id} className="neu-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{row.receipt_no}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{new Date(row.created_at).toLocaleString()}</div>
                </div>
                <span className="neu-badge" style={{ background: sc + '22', color: sc }}>{(row.status || 'unpaid').toUpperCase()}</span>
              </div>

              <div style={{ fontSize: 13, marginBottom: 4 }}><b>{row.customer_name}</b></div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 2 }}>{row.customer_email}</div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>{row.customer_address}</div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 800, marginBottom: 10 }}>
                <span className="muted">Total</span>
                <span>{row.currency === 'USD' ? '$' : '₱'}{Number(row.total || 0).toLocaleString()}</span>
              </div>

              {row.notes && <div className="muted" style={{ fontSize: 12, marginBottom: 8, whiteSpace: 'pre-wrap' }}>{row.notes}</div>}

              {isEditing ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <input className="neu-input" value={draft.customer_name} onChange={e => setDraft({ ...draft, customer_name: e.target.value })} placeholder="Name" />
                  <input className="neu-input" value={draft.customer_email} onChange={e => setDraft({ ...draft, customer_email: e.target.value })} placeholder="Email" />
                  <input className="neu-input" type="number" value={draft.total} onChange={e => setDraft({ ...draft, total: e.target.value })} placeholder="Total" />
                  <select className="neu-input" value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <textarea className="neu-input" rows={2} style={{ gridColumn: '1 / -1' }} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="Notes" />
                </div>
              ) : null}

              <div style={{ display: 'flex', gap: 8 }}>
                {isEditing ? (
                  <>
                    <button onClick={saveEdit} disabled={busy} className="neu-btn-primary" style={{ flex: 1, padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Save size={14} /> Save
                    </button>
                    <button onClick={() => setEditing(null)} className="neu-btn" style={{ flex: 1, padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <X size={14} /> Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(row)} className="neu-btn" style={{ flex: 1, padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Edit3 size={14} /> Edit
                    </button>
                    <button onClick={() => remove(row.id, row.receipt_no)} className="neu-btn" style={{ padding: '10px 14px', color: '#DC2626' }}>
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
