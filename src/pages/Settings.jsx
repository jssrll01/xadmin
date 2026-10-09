import React, { useEffect, useState } from 'react';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import { useToast } from '../components/Toast.jsx';
import { fetchSettings, upsertSetting, logAudit } from '../lib/api.js';

export default function Settings() {
  const { show } = useToast();
  const [fee, setFee] = useState({ enabled: true, percent: 1, min_fee: 0, max_fee: null, apply_to: 'topup' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings().then(({ items }) => {
      const found = (items || []).find((s) => s.key === 'transaction_fee');
      if (found?.value) setFee({ ...fee, ...found.value });
    });
    // eslint-disable-next-line
  }, []);

  const save = async () => {
    setSaving(true);
    const before = fee;
    const { error } = await upsertSetting('transaction_fee', fee);
    setSaving(false);
    if (error) return show(error.message, 'error');
    await logAudit('update', 'settings', 'transaction_fee', before, fee);
    show('Saved', 'success');
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Console & application configuration</p>
        </div>
      </div>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Transaction fee</div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <input type="checkbox" checked={!!fee.enabled}
            onChange={(e) => setFee({ ...fee, enabled: e.target.checked })} />
          <span style={{ fontSize: 13 }}>Enabled</span>
        </label>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 5 }}>
            Fee percentage (%)
          </div>
          <input className="neu-input" type="number" step="0.1"
            value={fee.percent ?? 0}
            onChange={(e) => setFee({ ...fee, percent: Number(e.target.value) })} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 5 }}>
            Minimum fee (₱)
          </div>
          <input className="neu-input" type="number"
            value={fee.min_fee ?? 0}
            onChange={(e) => setFee({ ...fee, min_fee: Number(e.target.value) })} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 5 }}>
            Maximum fee (₱) — blank = no cap
          </div>
          <input className="neu-input" type="number"
            value={fee.max_fee ?? ''}
            onChange={(e) => setFee({ ...fee, max_fee: e.target.value === '' ? null : Number(e.target.value) })} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 5 }}>
            Apply to
          </div>
          <select className="neu-input" value={fee.apply_to || 'topup'}
            onChange={(e) => setFee({ ...fee, apply_to: e.target.value })}>
            <option value="topup">Top-ups only</option>
            <option value="checkout">Checkout only</option>
            <option value="both">Both</option>
          </select>
        </div>

        <Btn variant="primary" onClick={save} disabled={saving} style={{ width: '100%' }}>
          {saving ? 'Saving…' : 'Save fee configuration'}
        </Btn>
      </Card>

      <Card>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Environment</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.7 }}>
          <div><b>Supabase project:</b> dmdjytkuwfudkqepkxkl</div>
          <div><b>Admin PIN:</b> from <code>VITE_XADMIN_PIN</code> env</div>
          <div><b>Session TTL:</b> {Math.round(Number(import.meta.env.VITE_XADMIN_SESSION_TTL_MS || 900000) / 60000)} minutes</div>
          <div><b>Actor:</b> {import.meta.env.VITE_XADMIN_ACTOR || 'admin'}</div>
        </div>
      </Card>
    </>
  );
}
