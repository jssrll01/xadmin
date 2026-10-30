import { useAdminContext } from "../context/AdminContext";
import React, { useEffect, useState, useCallback } from 'react';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import { useToast } from '../components/Toast.jsx';
import { getDb, supabase } from '../supabase.js';
import * as P from '../lib/pricingApi.js';

const L = { fontSize: 12, fontWeight: 700, margin: '6px 0 2px', display: 'block' };

export default function CashbackCosts() {
  const { activeSystem } = useAdminContext();
  const supabase = getDb(activeSystem);
  const { show } = useToast();
  const [cb, setCb] = useState(null);
  const [products, setProducts] = useState([]);
  const [pid, setPid] = useState('');
  const [vk, setVk] = useState('');
  const [cost, setCost] = useState('');
  const [log, setLog] = useState([]);

  const load = useCallback(async () => {
    const { data } = await P.pricingRead();
    if (data && data.cashback) setCb(data.cashback);
    const pr = await supabase.from('products').select('id,name').order('name').limit(1000);
    setProducts(pr.data || []);
    const a = await P.readAudit();
    setLog(Array.isArray(a.data) ? a.data : (a.data && a.data.rows) || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const upd = (k, v) => setCb((c) => ({ ...c, [k]: v }));
  const done = (r, msg) => {
    if (r && r.ok === false) show(r.error || 'Failed', 'error');
    else { show(msg, 'success'); load(); }
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontWeight: 900 }}>Cashback {cb ? (cb.is_enabled ? '(ON)' : '(OFF)') : ''}</div>
          {cb && (
            <Btn variant={cb.is_enabled ? 'danger' : 'success'} onClick={async () => {
              const n = { ...cb, is_enabled: !cb.is_enabled };
              done(await P.saveCashback(n), n.is_enabled ? 'Cashback enabled' : 'Cashback disabled');
            }}>{cb.is_enabled ? 'Disable' : 'Enable'}</Btn>
          )}
        </div>
        {!cb ? 'Loading...' : (<>
          <label style={L}><input type="checkbox" checked={!!cb.is_enabled}
            onChange={(e) => upd('is_enabled', e.target.checked)} /> Enabled</label>
          <label style={L}>Percentage (%)</label>
          <input className="neu-input" type="number" value={cb.cashback_percentage ?? ''} onChange={(e) => upd('cashback_percentage', e.target.value)} />
          <label style={L}>Minimum order (₱)</label>
          <input className="neu-input" type="number" value={cb.min_order_amount ?? ''} onChange={(e) => upd('min_order_amount', e.target.value)} />
          <label style={L}>Maximum cashback (₱)</label>
          <input className="neu-input" type="number" value={cb.max_cashback_amount ?? ''} onChange={(e) => upd('max_cashback_amount', e.target.value)} />
          <label style={L}>Calculation basis</label>
          <input className="neu-input" value={cb.calculation_basis ?? ''} onChange={(e) => upd('calculation_basis', e.target.value)} />
          <label style={L}>Release status</label>
          <input className="neu-input" value={cb.release_status ?? ''} onChange={(e) => upd('release_status', e.target.value)} />
          <div style={{ marginTop: 10 }}>
            <Btn variant="primary" onClick={async () => done(await P.saveCashback(cb), 'Cashback saved')}>Save cashback</Btn>
          </div>
        </>)}
      </Card>

      <Card>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Product cost</div>
        <label style={L}>Product</label>
        <select className="neu-input" value={pid} onChange={(e) => setPid(e.target.value)}>
          <option value="">Select...</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <label style={L}>Variant key (blank if no variant)</label>
        <input className="neu-input" value={vk} onChange={(e) => setVk(e.target.value)} />
        <label style={L}>Cost (₱)</label>
        <input className="neu-input" type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
        <div style={{ marginTop: 10 }}>
          <Btn variant="primary" onClick={async () => {
            if (!pid || cost === '') return show('Pick a product and enter a cost', 'error');
            done(await P.saveCost(pid, vk.trim(), cost), 'Cost saved');
          }}>Save cost</Btn>
        </div>
      </Card>

      <Card>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Change history</div>
        {log.length === 0 ? 'No entries' : log.map((r, i) => (
          <div key={i} style={{ fontSize: 11, marginBottom: 4, wordBreak: 'break-all' }}>
            {JSON.stringify(r).slice(0, 200)}
          </div>
        ))}
      </Card>
    </div>
  );
}
