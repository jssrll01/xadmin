import React, { useEffect, useState, useCallback } from 'react';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import { useToast } from '../components/Toast.jsx';
import * as P from '../lib/pricingApi.js';

const peso = (n) => '₱' + Number(n ?? 0).toLocaleString('en-PH', { maximumFractionDigits: 2 });
const lbl = { fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 };
const Fld = ({ label, children }) => (<div><div style={lbl}>{label}</div>{children}</div>);
const Badge = ({ ok, children }) => (
  <span className="neu-badge" style={{ background: ok ? 'var(--success-soft)' : 'var(--danger-soft)',
    color: ok ? 'var(--success)' : 'var(--danger)' }}>{children}</span>);

function gaps(rows, minK, maxK, halfOpen) {
  const a = rows.filter((r) => r.is_active).sort((x, y) => Number(x[minK]) - Number(y[minK]));
  const w = [];
  for (let i = 1; i < a.length; i++) {
    const gap = Number(a[i][minK]) - Number(a[i - 1][maxK]);
    const bad = halfOpen ? gap !== 0 : gap > 0.011 || gap < 0;
    if (a[i - 1][maxK] != null && bad) w.push(`Gap or overlap between ${peso(a[i - 1][maxK])} and ${peso(a[i][minK])}`);
  }
  return w;
}

function Editor({ title, rows, cols, fields, blank, onSave, onDelete, warnings }) {
  const [ed, setEd] = useState(null);
  const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); const ok = await onSave(ed); setBusy(false); if (ok) setEd(null); };
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 10px' }}>
        <div style={{ fontWeight: 800 }}>{title}</div>
        <Btn variant="primary" onClick={() => setEd(blank())}>+ Add</Btn>
      </div>
      {warnings.map((w, i) => (
        <div key={i} style={{ background: 'var(--warn-soft)', color: 'var(--warn)', padding: '8px 12px',
          borderRadius: 10, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{w}</div>))}
      <Card>
        <div className="table-wrap">
          <table className="neu-table">
            <thead><tr>{cols.map((c) => <th key={c.k}>{c.label}</th>)}<th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  {cols.map((c) => <td key={c.k}>{c.fmt(r)}</td>)}
                  <td><Badge ok={r.is_active}>{r.is_active ? 'Active' : 'Off'}</Badge></td>
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <Btn onClick={() => setEd({ ...r })}>Edit</Btn>{' '}
                    <Btn variant="danger" onClick={() => onDelete(r)}>Delete</Btn>
                  </td>
                </tr>))}
              {rows.length === 0 && <tr><td colSpan={cols.length + 2} style={{ color: 'var(--text-dim)' }}>No rows yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      {ed && (
        <Card style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>{ed.id ? 'Edit' : 'New'} {title.toLowerCase()}</div>
          <div style={grid}>
            {fields.map((f) => (
              <Fld key={f.k} label={f.label}>
                <input className="neu-input" type="number" step="0.01" inputMode="decimal"
                  placeholder={f.nullable ? 'blank = no limit' : ''}
                  value={ed[f.k] ?? ''} onChange={(e) => setEd({ ...ed, [f.k]: e.target.value })} />
              </Fld>))}
            <Fld label="Active">
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', height: 40 }}>
                <input type="checkbox" checked={!!ed.is_active}
                  onChange={(e) => setEd({ ...ed, is_active: e.target.checked })} /> Enabled
              </label>
            </Fld>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Btn variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Btn>
            <Btn onClick={() => setEd(null)}>Cancel</Btn>
          </div>
        </Card>)}
    </>);
}

export default function Pricing() {
  const { show } = useToast();
  const [tab, setTab] = useState('overview');
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [floor, setFloor] = useState('');
  const [calcSub, setCalcSub] = useState('');
  const [pp, setPp] = useState({ price: '', cost: '' });
  const [pr, setPr] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await P.pricingRead();
    if (error) show(error.message, 'error');
    else { setD(data); setFloor(String(data?.settings?.min_profit_floor ?? '5')); }
    setLoading(false);
  }, [show]);
  useEffect(() => { load(); }, [load]);

  const run = (fn, okMsg) => async (...a) => {
    const r = await fn(...a);
    if (!r.ok) { show(r.error || 'Failed', 'error'); return false; }
    show(okMsg, 'success'); await load(); return true;
  };
  const delRow = (fn, what) => async (r) => {
    if (!confirm(`Delete this ${what}? This cannot be undone.`)) return;
    await run(fn, 'Deleted')(r.id);
  };

  if (loading) return <Card>Loading…</Card>;
  if (!d) return <Card>Could not load pricing settings.</Card>;

  const tiers = d.tiers || [], ship = d.shipping || [], s = d.settings || {}, cb = d.cashback;
  const reqCost = String(s.discount_requires_cost).replace(/"/g, '') === 'true';
  const shipMatch = ship.find((r) => r.is_active && Number(calcSub) >= Number(r.min_subtotal) && Number(calcSub) <= Number(r.max_subtotal ?? 1e12));
  const noCost = d.products_total - d.products_with_cost;

  const tabs = [['overview', 'Overview'], ['shipping', 'Shipping'], ['discounts', 'Discounts'], ['settings', 'Settings']];

  return (
    <>
      <div className="page-head"><div><h1>Pricing</h1><p>Shipping, discounts and profit protection</p></div></div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto' }}>
        {tabs.map(([k, l]) => (
          <Btn key={k} variant={tab === k ? 'primary' : 'default'} onClick={() => setTab(k)}>{l}</Btn>))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="stat-grid">
            <div className="stat"><div className="stat-label">Discount tiers</div><div className="stat-value">{tiers.filter((t) => t.is_active).length}</div></div>
            <div className="stat"><div className="stat-label">Shipping tiers</div><div className="stat-value">{ship.filter((t) => t.is_active).length}</div></div>
            <div className="stat"><div className="stat-label">Profit floor</div><div className="stat-value">{peso(s.min_profit_floor)}</div></div>
            <div className="stat"><div className="stat-label">Products with cost</div><div className="stat-value">{d.products_with_cost}/{d.products_total}</div></div>
          </div>
          <Card style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Status</div>
            <div style={{ fontSize: 13, lineHeight: 1.9 }}>
              Cashback: {cb ? <><Badge ok={cb.is_enabled}>{cb.is_enabled ? 'On' : 'Off'}</Badge> {cb.cashback_percentage}% · min order {peso(cb.min_order_amount)}</> : 'not configured'}<br />
              Discount requires cost: <Badge ok={reqCost}>{reqCost ? 'Yes' : 'No'}</Badge><br />
              Shipping basis: {String(s.shipping_basis).replace(/"/g, '')}<br />
              Last settings update: {d.settings_updated ? new Date(d.settings_updated).toLocaleString() : '—'}
            </div>
            {noCost > 0 && !reqCost && (
              <div style={{ marginTop: 10, background: 'var(--warn-soft)', color: 'var(--warn)', padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700 }}>
                {noCost} products have no cost entered, so the profit floor is not protecting them.
              </div>)}
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-dim)' }}>
              Cashback editing and history come in the next update.
            </div>
          </Card>
        </>)}

      {tab === 'shipping' && (
        <>
          <Editor title="Shipping tier" rows={ship}
            warnings={gaps(ship, 'min_subtotal', 'max_subtotal', false)}
            cols={[{ k: 'r', label: 'Subtotal', fmt: (r) => `${peso(r.min_subtotal)} – ${r.max_subtotal == null ? '∞' : peso(r.max_subtotal)}` },
                   { k: 'f', label: 'Fee', fmt: (r) => peso(r.shipping_fee) }]}
            fields={[{ k: 'min_subtotal', label: 'Min (₱)' }, { k: 'max_subtotal', label: 'Max (₱)', nullable: true },
                     { k: 'shipping_fee', label: 'Fee (₱)' }, { k: 'display_order', label: 'Order' }]}
            blank={() => ({ id: null, min_subtotal: '', max_subtotal: '', shipping_fee: '', display_order: ship.length + 1, is_active: true })}
            onSave={run(P.saveShip, 'Saved')} onDelete={delRow(P.deleteShip, 'shipping tier')} />
          <Card style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Fee calculator</div>
            <div style={grid}>
              <Fld label="Subtotal (₱)"><input className="neu-input" type="number" inputMode="decimal" value={calcSub} onChange={(e) => setCalcSub(e.target.value)} /></Fld>
            </div>
            {calcSub !== '' && <div style={{ marginTop: 10, fontWeight: 800 }}>
              {shipMatch ? `Shipping: ${peso(shipMatch.shipping_fee)}` : 'No active tier matches — checkout would charge ₱0'}</div>}
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-dim)' }}>
              Shipping is based on the subtotal before discounts. These are your customer-facing fees, not courier rates, and one fee does not cover multi-seller parcels.
            </div>
          </Card>
        </>)}

      {tab === 'discounts' && (
        <>
          <Editor title="Discount tier" rows={tiers}
            warnings={gaps(tiers, 'min_price', 'max_price', true)}
            cols={[{ k: 'r', label: 'Price', fmt: (r) => `${peso(r.min_price)} – ${r.max_price == null ? '∞' : peso(r.max_price)}` },
                   { k: 'p', label: 'Rate', fmt: (r) => r.rate_pct + '%' },
                   { k: 'c', label: 'Max / unit', fmt: (r) => peso(r.max_discount) }]}
            fields={[{ k: 'min_price', label: 'Min (₱)' }, { k: 'max_price', label: 'Max, exclusive (₱)', nullable: true },
                     { k: 'rate_pct', label: 'Rate (%)' }, { k: 'max_discount', label: 'Cap (₱)' }, { k: 'display_order', label: 'Order' }]}
            blank={() => ({ id: null, min_price: '', max_price: '', rate_pct: '', max_discount: '', display_order: tiers.length + 1, is_active: true })}
            onSave={run(P.saveTier, 'Saved')} onDelete={delRow(P.deleteTier, 'discount tier')} />
          <Card style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Discount preview</div>
            <div style={grid}>
              <Fld label="Price (₱)"><input className="neu-input" type="number" inputMode="decimal" value={pp.price} onChange={(e) => setPp({ ...pp, price: e.target.value })} /></Fld>
              <Fld label="Cost (₱, optional)"><input className="neu-input" type="number" inputMode="decimal" value={pp.cost} onChange={(e) => setPp({ ...pp, cost: e.target.value })} /></Fld>
            </div>
            <div style={{ marginTop: 10 }}>
              <Btn variant="primary" onClick={async () => {
                const { data, error } = await P.previewDiscount(pp.price, pp.cost);
                if (error) return show(error.message, 'error'); setPr(data); }}>Calculate</Btn>
            </div>
            {pr && <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.8 }}>
              Discount: <b>{peso(pr.discount)}</b> ({pr.effective_pct}%)<br />
              Final price: <b>{peso(Number(pp.price) - Number(pr.discount))}</b><br />
              {pr.blocked_reason && <span style={{ color: 'var(--warn)' }}>Note: {pr.blocked_reason}</span>}
            </div>}
          </Card>
        </>)}

      {tab === 'settings' && (
        <>
          <Card style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>Minimum profit floor</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>
              Per unit. Only applies to products that have a cost entered.</div>
            <div style={grid}><Fld label="Floor (₱)"><input className="neu-input" type="number" inputMode="decimal" value={floor} onChange={(e) => setFloor(e.target.value)} /></Fld></div>
            <div style={{ marginTop: 10 }}>
              <Btn variant="primary" onClick={() => {
                if (floor === '' || Number(floor) < 0) return show('Enter 0 or more', 'error');
                run(P.saveSetting, 'Saved')('min_profit_floor', Number(floor)); }}>Save floor</Btn>
            </div>
          </Card>
          <Card>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>Require cost before discounting</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>
              When on, products without a cost get no discount. Currently {reqCost ? 'ON' : 'OFF'}; {noCost} of {d.products_total} products have no cost.</div>
            <Btn variant={reqCost ? 'default' : 'primary'} onClick={() => {
              const next = !reqCost;
              if (next && !confirm(`Turn ON? ${noCost} products will lose their discount until a cost is entered.`)) return;
              run(P.saveSetting, 'Saved')('discount_requires_cost', next); }}>
              {reqCost ? 'Turn off' : 'Turn on'}</Btn>
          </Card>
        </>)}
    </>);
}
