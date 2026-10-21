import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save } from 'lucide-react';
import {
  BUSINESS, CURRENCIES, PAYMENT_METHODS, DELIVERY_METHODS,
  STATUSES, TAX_PRESETS,
} from '../lib/constants-quote.js';
import { nextReceiptNo, saveReceipt, computeTotals } from '../lib/receipts.js';
import { exportPDF, exportThermal, exportExcel, exportCSV, exportPNG } from '../lib/exporters.js';
import ReceiptPreview from '../components/ReceiptPreview.jsx';

const emptyItem = () => ({ name: '', quantity: 1, price: '' });

export default function NewReceipt() {
  const nav = useNavigate();
  const previewRef = useRef(null);

  const [receiptNo, setReceiptNo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [currency, setCurrency] = useState('PHP');
  const [paymentMethod, setPaymentMethod] = useState('gcash');
  const [deliveryMethod, setDeliveryMethod] = useState('pickup');
  const [status, setStatus] = useState('unpaid');
  const [items, setItems] = useState([emptyItem()]);
  const [taxRate, setTaxRate] = useState(0);
  const [discountType, setDiscountType] = useState('percent');
  const [discountValue, setDiscountValue] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    nextReceiptNo().then(setReceiptNo).catch((e) => console.warn(e));
  }, []);

  const totals = computeTotals({ items, taxRate, discountType, discountValue });

  const draft = {
    receipt_no: receiptNo,
    customer_name: customerName,
    customer_email: customerEmail,
    customer_address: customerAddress,
    currency,
    payment_method: paymentMethod,
    delivery_method: deliveryMethod,
    status,
    items: items.map(it => ({
      name: it.name,
      quantity: Number(it.quantity) || 0,
      price: Number(it.price) || 0,
    })),
    subtotal: totals.subtotal,
    tax_rate: Number(taxRate) || 0,
    tax_amount: totals.taxAmount,
    discount_type: discountType,
    discount_value: Number(discountValue) || 0,
    discount_amount: totals.discountAmount,
    total: totals.total,
    notes,
    created_at: new Date().toISOString(),
  };

  // ── expose handlers to Layout via window ──
  useEffect(() => {
    window.__xquoteNewProps = {
      showSave: true,
      onSave: doSave,
      onExport: () => {
        const which = prompt('Export as: pdf / thermal / excel / csv / png', 'pdf');
        if (!which) return;
        const k = which.toLowerCase();
        if (k === 'pdf')     exportPDF(draft);
        if (k === 'thermal') exportThermal(draft);
        if (k === 'excel')   exportExcel(draft);
        if (k === 'csv')     exportCSV(draft);
        if (k === 'png')     exportPNG(previewRef.current, receiptNo);
      },
    };
    return () => { delete window.__xquoteNewProps; };
  });

  const updateItem = (i, patch) => {
    setItems(arr => arr.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  };
  const addItem = () => setItems(arr => [...arr, emptyItem()]);
  const removeItem = (i) => setItems(arr => arr.length === 1 ? arr : arr.filter((_, idx) => idx !== i));

  const doSave = async () => {
    if (!customerName.trim()) return alert('Customer name is required');
    if (!customerEmail.trim()) return alert('Customer email is required');
    if (!customerAddress.trim()) return alert('Customer address is required');
    if (!items.some(it => it.name.trim() && Number(it.price) > 0)) {
      return alert('Add at least one item with name and price');
    }
    setSaving(true);
    const { data, error } = await saveReceipt(draft);
    setSaving(false);
    if (error) return alert('Save failed: ' + error.message);
    nav(`/quotations/${data.id}`);
  };

  return (
    <div className="page-enter" style={{ padding: 16, paddingBottom: 120 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>New receipt</div>
        <div className="muted" style={{ fontSize: 12 }}>No: {receiptNo || '…'}</div>
      </div>

      {/* Business info */}
      <div className="neu-card" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <img src={BUSINESS.logo} alt="logo" style={{ width: 48, height: 48, borderRadius: 12 }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{BUSINESS.name}</div>
            <div className="muted" style={{ fontSize: 11.5 }}>{BUSINESS.address}</div>
            <div className="muted" style={{ fontSize: 11.5 }}>{BUSINESS.phone} · {BUSINESS.email}</div>
          </div>
        </div>
      </div>

      <Section title="Customer information">
        <Field label="Name *">
          <input className="neu-input" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Full name" />
        </Field>
        <Field label="Email *">
          <input className="neu-input" type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="email@example.com" />
        </Field>
        <Field label="Address *">
          <textarea className="neu-input" rows={2} value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} placeholder="Street, City, Province" />
        </Field>
      </Section>

      <Section title="Receipt details">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Receipt no"><input className="neu-input" value={receiptNo} readOnly /></Field>
          <Field label="Date"><input className="neu-input" value={new Date().toLocaleString()} readOnly /></Field>
          <Field label="Currency">
            <select className="neu-input" value={currency} onChange={e => setCurrency(e.target.value)}>
              {Object.values(CURRENCIES).map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className="neu-input" value={status} onChange={e => setStatus(e.target.value)}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Payment">
            <select className="neu-input" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              {PAYMENT_METHODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Field>
          <Field label="Delivery">
            <select className="neu-input" value={deliveryMethod} onChange={e => setDeliveryMethod(e.target.value)}>
              {DELIVERY_METHODS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Items" action={
        <button onClick={addItem} className="neu-btn" style={{ padding: '7px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Plus size={14} /> Add item
        </button>
      }>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px 36px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <input className="neu-input" placeholder="Product name" value={it.name} onChange={e => updateItem(i, { name: e.target.value })} />
            <input className="neu-input" type="number" min="1" value={it.quantity} onChange={e => updateItem(i, { quantity: e.target.value })} />
            <input className="neu-input" type="number" min="0" step="0.01" placeholder="Price" value={it.price} onChange={e => updateItem(i, { price: e.target.value })} />
            <button onClick={() => removeItem(i)} className="neu-btn" style={{ padding: 8, color: '#DC2626' }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </Section>

      <Section title="Tax, Discount & Notes">
        <Field label="Tax rate (%)">
          <input className="neu-input" type="number" min="0" max="100" value={taxRate} onChange={e => setTaxRate(e.target.value)} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {TAX_PRESETS.map(t => (
              <button key={t} onClick={() => setTaxRate(t)} className="neu-btn"
                style={{ padding: '6px 12px', fontSize: 11.5, borderRadius: 10, boxShadow: Number(taxRate) === t ? 'inset 3px 3px 6px rgba(163,177,198,.55), inset -3px -3px 6px rgba(255,255,255,.95)' : undefined }}>
                {t}%
              </button>
            ))}
          </div>
        </Field>

        <Field label="Discount">
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="neu-input" style={{ width: 130 }} value={discountType} onChange={e => setDiscountType(e.target.value)}>
              <option value="percent">Percentage</option>
              <option value="fixed">Fixed amount</option>
            </select>
            <input className="neu-input" type="number" min="0" step="0.01" value={discountValue} onChange={e => setDiscountValue(e.target.value)} />
          </div>
        </Field>

        <Field label="Notes (optional)">
          <textarea className="neu-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any extra details…" />
        </Field>
      </Section>

      <div className="neu-card" style={{ padding: 16, marginBottom: 14 }}>
        <TotalRow label="Subtotal" value={fmtMoney(currency, totals.subtotal)} />
        <TotalRow label={`Tax (${taxRate}%)`} value={fmtMoney(currency, totals.taxAmount)} />
        <TotalRow label="Discount" value={'-' + fmtMoney(currency, totals.discountAmount)} />
        <div style={{ height: 1, background: '#D6DEE9', margin: '10px 0' }} />
        <TotalRow label="TOTAL" value={fmtMoney(currency, totals.total)} bold />
      </div>

      <div style={{ marginBottom: 20 }}>
        <div className="muted" style={{ fontSize: 11, fontWeight: 800, letterSpacing: .4, marginBottom: 8 }}>PREVIEW</div>
        <div ref={previewRef}><ReceiptPreview receipt={draft} /></div>
      </div>

      <button type="button" className="neu-btn" style={{ width: '100%', padding: 14, borderRadius: 14, marginBottom: 10 }}
        onClick={() => window.__xquoteNewProps && window.__xquoteNewProps.onExport()}>Export (PDF / Excel / CSV / PNG)</button>
      <button onClick={doSave} disabled={saving} className="neu-btn-primary"
        style={{ width: '100%', padding: 16, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, marginBottom: 30 }}>
        <Save size={16} /> {saving ? 'Saving…' : 'Save receipt'}
      </button>
    </div>
  );
}

function Section({ title, action, children }) {
  return (
    <div className="neu-card" style={{ padding: 16, marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="muted" style={{ fontSize: 11, fontWeight: 800, letterSpacing: .4, marginBottom: 6 }}>{label.toUpperCase()}</div>
      {children}
    </div>
  );
}
function TotalRow({ label, value, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontWeight: bold ? 800 : 600, fontSize: bold ? 16 : 13 }}>
      <span style={{ color: bold ? '#2B3244' : '#7A8499' }}>{label}</span><span>{value}</span>
    </div>
  );
}
function fmtMoney(currency, n) {
  const cur = CURRENCIES[currency] || CURRENCIES.PHP;
  return cur.symbol + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
