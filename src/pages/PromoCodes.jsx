import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Save, X } from 'lucide-react';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useToast } from '../components/Toast.jsx';
import { fetchPromos, upsertPromo, deletePromo } from '../lib/api.js';
import { peso, dateTime } from '../lib/format.js';

const EMPTY = { code: '', discount_type: 'percent', discount_value: 10, min_spend: 0, max_uses: null, active: true, per_user_limit: 1 };

export default function PromoCodes() {
  const { show } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null);

  const load = () => {
    setLoading(true);
    fetchPromos().then(rows => { setItems(rows); setLoading(false); });
  };
  useEffect(load, []);

  const save = async () => {
    if (!edit.code) return show('Enter a code', 'error');
    const payload = {
      ...edit,
      code: edit.code.trim().toUpperCase(),
      discount_value: Number(edit.discount_value),
      min_spend: Number(edit.min_spend),
      max_uses: edit.max_uses ? Number(edit.max_uses) : null,
      per_user_limit: Number(edit.per_user_limit) || 1,
    };
    const { error } = await upsertPromo(payload);
    if (error) return show(error.message, 'error');
    show('Saved', 'success');
    setEdit(null);
    load();
  };

  const del = async (code) => {
    if (!confirm(`Delete promo ${code}?`)) return;
    const { error } = await deletePromo(code);
    if (error) return show(error.message, 'error');
    setItems(prev => prev.filter(x => x.code !== code));
    show('Deleted', 'success');
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Promo codes</h1>
          <p>{items.length} codes</p>
        </div>
        <Btn variant="primary" onClick={() => setEdit({ ...EMPTY })}><Plus size={16} /> New promo</Btn>
      </div>

      {loading ? (
        <Card>Loading…</Card>
      ) : items.length === 0 ? (
        <EmptyState title="No promos" message="Create your first promo code." />
      ) : (
        <table className="neu-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Type</th>
              <th>Value</th>
              <th>Min spend</th>
              <th>Uses</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(p => (
              <tr key={p.code}>
                <td><b style={{ fontFamily: 'monospace' }}>{p.code}</b></td>
                <td style={{ textTransform: 'capitalize' }}>{p.discount_type}</td>
                <td><b>{p.discount_type === 'percent' ? p.discount_value + '%' : peso(p.discount_value)}</b></td>
                <td>{peso(p.min_spend)}</td>
                <td>{p.used_count || 0}{p.max_uses ? ` / ${p.max_uses}` : ''}</td>
                <td>
                  {p.active ? (
                    <span className="neu-badge" style={{ background: '#D1FAE5', color: '#065F46' }}>Active</span>
                  ) : (
                    <span className="neu-badge" style={{ background: '#E0E4EC', color: '#374151' }}>Inactive</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Btn size="sm" onClick={() => setEdit(p)} style={{ marginRight: 6 }}>Edit</Btn>
                  <Btn size="sm" variant="danger" onClick={() => del(p.code)}><Trash2 size={12} /></Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.code ? 'Edit promo' : 'New promo'}>
        {edit && (
          <>
            <input className="neu-input" placeholder="CODE" value={edit.code}
              onChange={e => setEdit({ ...edit, code: e.target.value.toUpperCase() })}
              style={{ marginBottom: 10, fontFamily: 'monospace' }} />
            <select className="neu-input" value={edit.discount_type}
              onChange={e => setEdit({ ...edit, discount_type: e.target.value })}
              style={{ marginBottom: 10 }}>
              <option value="percent">Percent off</option>
              <option value="fixed">Fixed amount off</option>
              <option value="shipping">Free shipping</option>
            </select>
            <input className="neu-input" type="number" placeholder="Discount value" value={edit.discount_value}
              onChange={e => setEdit({ ...edit, discount_value: e.target.value })} style={{ marginBottom: 10 }} />
            <input className="neu-input" type="number" placeholder="Min spend ₱" value={edit.min_spend}
              onChange={e => setEdit({ ...edit, min_spend: e.target.value })} style={{ marginBottom: 10 }} />
            <input className="neu-input" type="number" placeholder="Max uses (blank = unlimited)" value={edit.max_uses || ''}
              onChange={e => setEdit({ ...edit, max_uses: e.target.value })} style={{ marginBottom: 10 }} />
            <input className="neu-input" type="number" placeholder="Per-user limit" value={edit.per_user_limit}
              onChange={e => setEdit({ ...edit, per_user_limit: e.target.value })} style={{ marginBottom: 14 }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontWeight: 600 }}>
              <input type="checkbox" checked={edit.active} onChange={e => setEdit({ ...edit, active: e.target.checked })} />
              Active
            </label>
            <Btn variant="primary" onClick={save} style={{ width: '100%' }}>
              <Save size={16} /> Save promo
            </Btn>
          </>
        )}
      </Modal>
    </>
  );
}
