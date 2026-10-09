import React, { useEffect, useState } from 'react';
import { Bug, Package, Store, FileText, Shield } from 'lucide-react';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import Modal from '../components/Modal.jsx';
import Badge from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useToast } from '../components/Toast.jsx';
import { fetchReports, updateReport } from '../lib/api.js';
import { dateTime } from '../lib/format.js';

const CATS = [
  { id: '', label: 'All', icon: FileText },
  { id: 'bug', label: 'Bug', icon: Bug },
  { id: 'order', label: 'Order', icon: Package },
  { id: 'shop', label: 'Shop', icon: Store },
  { id: 'content', label: 'Content', icon: FileText },
  { id: 'security', label: 'Security', icon: Shield },
];

const STATUS_TABS = ['', 'submitted', 'processing', 'completed'];

export default function Reports() {
  const { show } = useToast();
  const [cat, setCat] = useState('');
  const [status, setStatus] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [adminNote, setAdminNote] = useState('');

  const load = () => {
    setLoading(true);
    fetchReports({ category: cat, status }).then(({ items }) => { setItems(Array.isArray(items) ? items : []); setLoading(false); });
  };
  useEffect(load, [cat, status]); // eslint-disable-line

  const setStatusAndSave = async (s) => {
    const { error } = await updateReport(selected.id, { status: s, admin_note: adminNote });
    if (error) return show(error.message, 'error');
    setItems(prev => prev.map(x => x.id === selected.id ? { ...x, status: s, admin_note: adminNote } : x));
    show('Updated', 'success');
    setSelected(null);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Reports</h1>
          <p>{items.length} tickets</p>
        </div>
      </div>

      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {CATS.map(c => (
            <button key={c.id} onClick={() => setCat(c.id)}
              className={'neu-pill' + (cat === c.id ? ' active' : '')}>
              <c.icon size={12} style={{ marginRight: 4 }} /> {c.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {STATUS_TABS.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={'neu-pill' + (status === s ? ' active' : '')}>
              {s || 'All statuses'}
            </button>
          ))}
        </div>
      </Card>

      {loading ? (
        <Card>Loading…</Card>
      ) : items.length === 0 ? (
        <EmptyState title="No reports" message="Nothing to review here." />
      ) : (
        <table className="neu-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Contact</th>
              <th>Concern</th>
              <th>Status</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(t => (
              <tr key={t.id} onClick={() => { setSelected(t); setAdminNote(t.admin_note || ''); }} style={{ cursor: 'pointer' }}>
                <td><b style={{ textTransform: 'capitalize' }}>{t.category}</b></td>
                <td>{t.gmail || '—'}<div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{t.phone}</div></td>
                <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.concern}</td>
                <td><Badge status={t.status} /></td>
                <td>{dateTime(t.created_at)}</td>
                <td style={{ textAlign: 'right' }}>→</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Report ticket" size="lg">
        {selected && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div className="neu-card-inset"><div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Category</div><div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{selected.category}</div></div>
              <div className="neu-card-inset"><div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Status</div><Badge status={selected.status} /></div>
              <div className="neu-card-inset"><div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Gmail</div><div style={{ fontWeight: 700 }}>{selected.gmail || '—'}</div></div>
              <div className="neu-card-inset"><div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Phone</div><div style={{ fontWeight: 700 }}>{selected.phone || '—'}</div></div>
            </div>
            <div className="neu-card-inset" style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Concern</div>
              <div style={{ fontWeight: 500, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selected.concern}</div>
            </div>
            <textarea className="neu-input" placeholder="Admin note"
              value={adminNote} onChange={e => setAdminNote(e.target.value)}
              style={{ minHeight: 80, marginBottom: 12 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <Btn onClick={() => setStatusAndSave('submitted')}>Submitted</Btn>
              <Btn onClick={() => setStatusAndSave('processing')}>Processing</Btn>
              <Btn variant="success" onClick={() => setStatusAndSave('completed')}>Completed</Btn>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
