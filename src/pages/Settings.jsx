import React, { useEffect, useState } from 'react';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import { useToast } from '../components/Toast.jsx';
import { fetchSettings, upsertSetting, logAudit } from '../lib/api.js';
import PageHeader from '../xa/ui/PageHeader.jsx';
import { SkRows } from '../xa/Kit.jsx';

const DEFAULT = { enabled: true, percent: 1, min_fee: 0, max_fee: null, apply_to: 'topup' };

export default function Settings() {
  const { show } = useToast();
  const [fee, setFee] = useState(DEFAULT);
  const [saved, setSaved] = useState(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errs, setErrs] = useState({});

  useEffect(() => {
    fetchSettings().then(({ items }) => {
      const found = (items || []).find((s) => s.key === 'transaction_fee');
      const next = found?.value ? { ...DEFAULT, ...found.value } : DEFAULT;
      setFee(next); setSaved(next);
    }).finally(() => setLoading(false));
  }, []);

  const dirty = JSON.stringify(fee) !== JSON.stringify(saved);
  const set = (k, v) => { setFee({ ...fee, [k]: v }); setErrs({ ...errs, [k]: '' }); };

  const save = async () => {
    const e = {};
    if (!(fee.percent >= 0 && fee.percent <= 100)) e.percent = 'Enter 0 to 100';
    if (!(fee.min_fee >= 0)) e.min_fee = 'Cannot be negative';
    if (fee.max_fee !== null && !(fee.max_fee >= fee.min_fee)) e.max_fee = 'Must be at least the minimum fee';
    setErrs(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    const { error } = await upsertSetting('transaction_fee', fee);
    setSaving(false);
    if (error) return show(error.message, 'error');
    await logAudit('update', 'settings', 'transaction_fee', saved, fee);
    setSaved(fee);
    show('Saved', 'success');
  };

  const num = (k, extra = {}) => (
    <div style={{ marginBottom: 14 }}>
      <div className="ui-lbl">{extra.label}</div>
      <input className={'neu-input' + (errs[k] ? ' bad' : '')} type="number" inputMode="decimal" step={extra.step}
        value={fee[k] ?? ''}
        onChange={(e) => set(k, e.target.value === '' ? (extra.nullable ? null : 0) : Number(e.target.value))} />
      {errs[k] && <div className="ui-err" role="alert">{errs[k]}</div>}
    </div>
  );

  return (
    <>
      <PageHeader title="Settings" subtitle="Console and application configuration" />

      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Transaction fee</div>
        {loading ? <SkRows rows={4} cols={2} /> : (
          <>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, minHeight: 36 }}>
              <input type="checkbox" style={{ width: 18, height: 18 }} checked={!!fee.enabled} onChange={(e) => set('enabled', e.target.checked)} />
              <span style={{ fontSize: 14 }}>Enabled</span>
            </label>
            {num('percent', { label: 'Fee percentage (%)', step: '0.1' })}
            {num('min_fee', { label: 'Minimum fee (₱)' })}
            {num('max_fee', { label: 'Maximum fee (₱), blank = no cap', nullable: true })}
            <div style={{ marginBottom: 14 }}>
              <div className="ui-lbl">Apply to</div>
              <select className="neu-input" value={fee.apply_to || 'topup'} onChange={(e) => set('apply_to', e.target.value)}>
                <option value="topup">Top-ups only</option>
                <option value="checkout">Checkout only</option>
                <option value="both">Both</option>
              </select>
            </div>
            <Btn variant="primary" loading={saving} onClick={save} disabled={saving || !dirty} style={{ width: '100%' }}>
              {saving ? 'Saving…' : dirty ? 'Save fee configuration' : 'No changes'}
            </Btn>
          </>
        )}
      </Card>

      <Card>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Environment</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.7 }}>
          <div><b>Supabase project:</b> dmdjytkuwfudkqepkxkl</div>
          <div><b>Admin PIN:</b> checked by the server, never stored in the app</div>
          <div><b>Session TTL:</b> {Math.round(Number(import.meta.env.VITE_XADMIN_SESSION_TTL_MS || 900000) / 60000)} minutes</div>
          <div><b>Actor:</b> {import.meta.env.VITE_XADMIN_ACTOR || 'admin'}</div>
        </div>
      </Card>
    </>
  );
}
