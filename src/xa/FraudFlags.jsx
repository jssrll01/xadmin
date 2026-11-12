import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { adm } from './db.js';
import { Badge, EmptyState, ErrorState, SkRows, useXaToast } from './Kit.jsx';
import { ago, peso, when } from './xaFmt.js';

const FLAGS = {
  duplicate_reference: ['Duplicate reference', 'The same payment reference was used on more than one top-up.'],
  duplicate_receipt: ['Duplicate receipt', 'The same receipt image was used on more than one top-up.'],
  rapid_repeat: ['Rapid repeats', '3 or more top-ups from one user within an hour.'],
  same_amount_repeat: ['Same amount repeated', 'The same amount 3 or more times within 24 hours.'],
  unusually_large: ['Unusually large', "At least 5 times this user's average top-up, and 2,000 pesos or more."],
  new_account_large: ['New account', 'A top-up of 2,000 pesos or more within 24 hours of signing up.'],
};
const SEV = { 3: ['bad', 'High'], 2: ['warn', 'Medium'], 1: [undefined, 'Low'] };

function Item({ it, onCopy }) {
  const [tone, label] = SEV[it.severity] || SEV[1];
  return (
    <div className="neu-card" style={{ padding: 12, marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Badge tone={tone}>{label}</Badge>
        <b style={{ fontSize: 15 }}>{peso(it.amount)}</b>
        <Badge>{it.status}</Badge>
        <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.65 }}>{ago(it.created_at)}</span>
      </div>
      <div style={{ fontSize: 13, marginTop: 6, wordBreak: 'break-word' }}>
        <b>{it.username ? '@' + it.username : 'Unknown user'}</b> <span style={{ opacity: 0.7 }}>{it.email || ''}</span>
      </div>
      <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>{when(it.created_at)}{it.payment_method ? ' - ' + it.payment_method : ''}</div>
      {it.reference && (
        <div style={{ fontSize: 12.5, marginTop: 6, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ opacity: 0.7 }}>Ref</span> <code style={{ wordBreak: 'break-all' }}>{it.reference}</code>
          <button type="button" data-xa-skip className="neu-btn" style={{ padding: '3px 9px', fontSize: 11.5 }} onClick={() => onCopy(it.reference)}>Copy</button>
        </div>
      )}
      <div style={{ marginTop: 8 }}>
        {(it.flags || []).map((f) => (
          <div key={f} style={{ fontSize: 12.5, marginTop: 3 }}>
            <b style={{ color: 'var(--danger)' }}>{(FLAGS[f] || [f])[0]}</b> <span style={{ opacity: 0.7 }}>{(FLAGS[f] || [])[1]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FraudFlags() {
  const nav = useNavigate();
  const { push } = useXaToast();
  const [days, setDays] = useState('30');
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [flag, setFlag] = useState('all');

  const load = useCallback(async () => {
    setD(null);
    setErr('');
    try { setD(await adm('adm_fraud_flags', { p_days: Number(days) })); } catch (e) { setErr(e.message); }
  }, [days]);
  useEffect(() => { load(); }, [load]);

  const items = useMemo(() => ((d && d.items) || []).filter((it) => flag === 'all' || (it.flags || []).includes(flag)), [d, flag]);
  const sum = (d && d.summary) || {};
  const copy = async (t) => {
    try { await navigator.clipboard.writeText(t); push('Copied', 'success', 1500); } catch (e) { push('Could not copy', 'error'); }
  };

  return (
    <div style={{ padding: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><ShieldAlert size={22} /> Fraud flags</h2>
        <select className="xa-input" style={{ width: 'auto', marginLeft: 'auto' }} value={days} aria-label="Time window" onChange={(e) => setDays(e.target.value)}>
          {['7', '30', '90'].map((v) => <option key={v} value={v}>Last {v} days</option>)}
        </select>
        <button type="button" className="neu-btn" onClick={load} aria-label="Refresh"><RefreshCw size={14} /></button>
        <button type="button" className="neu-btn" data-xa-skip onClick={() => nav('/topups')}>Open top-ups</button>
      </div>
      <div style={{ fontSize: 12.5, opacity: 0.65, marginBottom: 12 }}>Top-ups that look repeated or odd. A flag is a reason to look closer, not proof of fraud. Review and decide on the Top-ups page.</div>
      {err && <ErrorState message={err} onRetry={load} />}
      {!err && !d && <div className="neu-card"><SkRows rows={5} cols={3} /></div>}
      {d && (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <button type="button" data-xa-skip className={'neu-btn' + (flag === 'all' ? ' neu-btn-primary' : '')} onClick={() => setFlag('all')}>All ({sum.flagged || 0} of {sum.topups_scanned || 0})</button>
            {Object.keys(FLAGS).map((k) => (
              <button key={k} type="button" data-xa-skip className={'neu-btn' + (flag === k ? ' neu-btn-primary' : '')} onClick={() => setFlag(k)}>{FLAGS[k][0]} ({sum[k] || 0})</button>
            ))}
          </div>
          {items.length === 0 && <EmptyState title="Nothing flagged" hint="No top-ups match these rules in this time window." />}
          {items.map((it) => <Item key={it.id} it={it} onCopy={copy} />)}
        </>
      )}
    </div>
  );
}
