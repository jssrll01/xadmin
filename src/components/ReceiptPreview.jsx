import React from 'react';
import { BUSINESS, CURRENCIES, PAYMENT_METHODS, DELIVERY_METHODS, STATUSES } from '../lib/constants-quote.js';

export default function ReceiptPreview({ receipt }) {
  const cur = CURRENCIES[receipt.currency] || CURRENCIES.PHP;
  const money = (n) => cur.symbol + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const payLabel = PAYMENT_METHODS.find(p => p.value === receipt.payment_method)?.label || receipt.payment_method;
  const delLabel = DELIVERY_METHODS.find(d => d.value === receipt.delivery_method)?.label || receipt.delivery_method;
  const statusObj = STATUSES.find(s => s.value === receipt.status) || STATUSES[1];

  return (
    <div className="print-area" style={{
      background: 'white', color: '#1F2637', padding: 24,
      borderRadius: 14, border: '1px solid #E5E9F0',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <img src={BUSINESS.logo} alt="logo" style={{ width: 52, height: 52, borderRadius: 12 }} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{BUSINESS.name}</div>
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{BUSINESS.address}</div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>{BUSINESS.phone} · {BUSINESS.email}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: .5 }}>RECEIPT</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>No: <b>{receipt.receipt_no}</b></div>
          <div style={{ fontSize: 11, color: '#6B7280' }}>
            {new Date(receipt.created_at || Date.now()).toLocaleString()}
          </div>
          <div style={{
            display: 'inline-block', marginTop: 6, padding: '3px 10px', borderRadius: 20,
            background: statusObj.color + '22', color: statusObj.color,
            fontSize: 10.5, fontWeight: 800, letterSpacing: .4,
          }}>
            {statusObj.label.toUpperCase()}
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: '#E5E9F0', margin: '16px 0' }} />

      {/* Bill to + details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: '#94A0B4', letterSpacing: .5, marginBottom: 6 }}>BILL TO</div>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>{receipt.customer_name || '—'}</div>
          <div style={{ fontSize: 12, color: '#4B5563', marginTop: 2 }}>{receipt.customer_email || '—'}</div>
          <div style={{ fontSize: 12, color: '#4B5563', marginTop: 2, whiteSpace: 'pre-wrap' }}>{receipt.customer_address || '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: '#94A0B4', letterSpacing: .5, marginBottom: 6 }}>DETAILS</div>
          <div style={{ fontSize: 12, marginBottom: 2 }}><span style={{ color: '#6B7280' }}>Payment:</span> {payLabel}</div>
          <div style={{ fontSize: 12, marginBottom: 2 }}><span style={{ color: '#6B7280' }}>Delivery:</span> {delLabel}</div>
          <div style={{ fontSize: 12 }}><span style={{ color: '#6B7280' }}>Currency:</span> {cur.label}</div>
        </div>
      </div>

      {/* Items */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr style={{ background: '#F4F6FA' }}>
            <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 800, color: '#4B5563' }}>Item</th>
            <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 11, fontWeight: 800, color: '#4B5563', width: 60 }}>Qty</th>
            <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 11, fontWeight: 800, color: '#4B5563', width: 100 }}>Price</th>
            <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 11, fontWeight: 800, color: '#4B5563', width: 110 }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {(receipt.items || []).map((it, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #EEF1F6' }}>
              <td style={{ padding: '8px 10px', fontSize: 12.5 }}>{it.name || '—'}</td>
              <td style={{ padding: '8px 10px', fontSize: 12.5, textAlign: 'right' }}>{it.quantity || 0}</td>
              <td style={{ padding: '8px 10px', fontSize: 12.5, textAlign: 'right' }}>{money(it.price)}</td>
              <td style={{ padding: '8px 10px', fontSize: 12.5, textAlign: 'right', fontWeight: 700 }}>
                {money((Number(it.quantity) || 0) * (Number(it.price) || 0))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: 280 }}>
          <Row label="Subtotal" value={money(receipt.subtotal)} />
          <Row label={`Tax (${receipt.tax_rate}%)`} value={money(receipt.tax_amount)} />
          <Row label={`Discount${receipt.discount_type === 'percent' ? ` (${receipt.discount_value}%)` : ''}`} value={'-' + money(receipt.discount_amount)} />
          <div style={{ height: 1, background: '#E5E9F0', margin: '8px 0' }} />
          <Row label="TOTAL" value={money(receipt.total)} bold />
        </div>
      </div>

      {receipt.notes && (
        <>
          <div style={{ height: 1, background: '#E5E9F0', margin: '16px 0' }} />
          <div style={{ fontSize: 10.5, fontWeight: 800, color: '#94A0B4', letterSpacing: .5, marginBottom: 6 }}>NOTES</div>
          <div style={{ fontSize: 12.5, whiteSpace: 'pre-wrap', color: '#4B5563' }}>{receipt.notes}</div>
        </>
      )}

      <div style={{ textAlign: 'center', fontSize: 11, color: '#94A0B4', marginTop: 24 }}>
        Thank you for shopping with XMARKET.
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: bold ? 15 : 12.5, fontWeight: bold ? 800 : 500 }}>
      <span style={{ color: bold ? '#1F2637' : '#4B5563' }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
