import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Upload, Trash2 } from 'lucide-react';
import Btn from '../components/Btn.jsx';
import { useToast } from '../components/Toast.jsx';
import PageHeader from '../xa/ui/PageHeader.jsx';
import { ConfirmDialog, EmptyState, ErrorState, SkRows } from '../xa/Kit.jsx';
import { adm } from '../xa/db.js';
import { parseCurrencies } from '../lib/currencyParse.js';

const SAMPLE = 'CAD, CA$, 0.0215, Canadian Dollar\nAUD, A$, 0.0243, Australian Dollar\nINR, ₹, 1.4, Indian Rupee';
const fmt = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const EMPTY = { code: '', symbol: '', name: '', rate: '', active: true };

export default function Currencies() {
  const { show } = useToast();
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [f, setF] = useState(EMPTY);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const load = useCallback(async () => {
    try { setRows(await adm('adm_currency_list')); setErr(''); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (row) => {
    setBusy(true);
    try {
      await adm('adm_currency_save', { p_cur: row.code, p_name: row.name || '', p_symbol: row.symbol, p_rate: Number(row.rate) || 1, p_active: row.active !== false });
      show?.(row.code.toUpperCase() + ' saved. Shoppers see it within a minute of their next page load.', 'success');
      setF(EMPTY); setEditing(false); await load();
    } catch (e) { show?.(e.message, 'error'); }
    setBusy(false);
  };
  const remove = async () => {
    setBusy(true);
    try { await adm('adm_currency_delete', { p_cur: del }); show?.(del + ' removed', 'success'); await load(); }
    catch (e) { show?.(e.message, 'error'); }
    setBusy(false); setDel(null);
  };

  const parsed = useMemo(() => parseCurrencies(text), [text]);
  const good = parsed.filter((p) => !p.bad);
  const runImport = async () => {
    setBusy(true);
    try {
      const r = await adm('adm_currency_import', { p_rows: good.map((g) => ({ code: g.code, symbol: g.symbol, rate: g.rate, name: g.name })) });
      show?.((r && r.saved) + ' saved' + (r && r.skipped ? ', ' + r.skipped + ' skipped' : ''), 'success');
      setText(''); await load();
    } catch (e) { show?.(e.message, 'error'); }
    setBusy(false);
  };

  const ready = f.code.trim() && f.symbol.trim() && Number(f.rate) > 0;
  return (
    <>
      <PageHeader title="Currencies" subtitle="Display only. Orders and wallets always stay in pesos. Rate = how much equals 1 peso."
        actions={<Btn onClick={load}><RefreshCw size={14} /> Refresh</Btn>} />
      {err && <ErrorState message={err} onRetry={load} />}
      {!err && !rows && <div className="table-wrap" style={{ padding: 8 }}><SkRows rows={6} cols={5} /></div>}
      {rows && !rows.length && <div className="table-wrap"><EmptyState title="No currencies" hint="Run the currency SQL first." /></div>}
      {rows && rows.length > 0 && (
        <div className="table-wrap">
          <table className="neu-table stack">
            <thead><tr><th>Code</th><th>Symbol</th><th>Name</th><th>Rate per ₱1</th><th>₱100 shows as</th><th>Shown</th><th style={{ textAlign: 'right', width: 1 }}>Actions</th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.code}>
                  <td data-label="Code"><b>{c.code}</b>{c.code === 'PHP' && <span className="neu-badge badge-frozen" style={{ marginLeft: 6 }}>default</span>}</td>
                  <td data-label="Symbol">{c.symbol}</td>
                  <td data-label="Name">{c.name || '—'}</td>
                  <td data-label="Rate">{c.rate}</td>
                  <td data-label="₱100">{c.symbol}{fmt(100 * Number(c.rate))}</td>
                  <td data-label="Shown"><span className={'neu-badge ' + (c.active ? 'badge-approved' : 'badge-rejected')}>{c.active ? 'Yes' : 'Hidden'}</span></td>
                  <td data-label="Actions" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {c.code !== 'PHP' && (
                      <>
                        <Btn onClick={() => { setF({ code: c.code, symbol: c.symbol, name: c.name || '', rate: String(c.rate), active: c.active }); setEditing(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</Btn>{' '}
                        <Btn onClick={() => save({ ...c, active: !c.active })} disabled={busy}>{c.active ? 'Hide' : 'Show'}</Btn>{' '}
                        <Btn variant="danger" onClick={() => setDel(c.code)}><Trash2 size={13} /></Btn>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="table-wrap" style={{ padding: 16, display: 'grid', gap: 12, marginTop: 16 }}>
        <b>{editing ? 'Edit ' + f.code : 'Add a currency'}</b>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label style={{ flex: '1 1 90px' }}><div className="ui-lbl">Code</div><input className="neu-input" placeholder="CAD" value={f.code} disabled={editing} onChange={set('code')} /></label>
          <label style={{ flex: '1 1 90px' }}><div className="ui-lbl">Symbol</div><input className="neu-input" placeholder="CA$" value={f.symbol} onChange={set('symbol')} /></label>
          <label style={{ flex: '2 1 160px' }}><div className="ui-lbl">Name</div><input className="neu-input" placeholder="Canadian Dollar" value={f.name} onChange={set('name')} /></label>
          <label style={{ flex: '1 1 120px' }}><div className="ui-lbl">Rate per ₱1</div><input className="neu-input" inputMode="decimal" placeholder="0.0215" value={f.rate} onChange={set('rate')} /></label>
        </div>
        {Number(f.rate) > 0 && <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Example: ₱100 will show as {f.symbol}{fmt(100 * Number(f.rate))}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="primary" onClick={() => save(f)} disabled={busy || !ready}>{editing ? 'Save changes' : 'Add currency'}</Btn>
          {editing && <Btn onClick={() => { setF(EMPTY); setEditing(false); }}>Cancel</Btn>}
        </div>
      </div>

      <div className="table-wrap" style={{ padding: 16, display: 'grid', gap: 12, marginTop: 16 }}>
        <b>Import many</b>
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>One per line: CODE, SYMBOL, RATE, Name. The rate is how much of that currency equals 1 peso. Existing codes are updated.</div>
        <textarea className="neu-input" rows={7} style={{ width: '100%', fontFamily: 'inherit' }} placeholder={SAMPLE} value={text} onChange={(e) => setText(e.target.value)} />
        {parsed.length > 0 && (
          <div style={{ display: 'grid', gap: 4, fontSize: 12.5 }}>
            {parsed.map((p) => (
              <div key={p.line} style={{ color: p.bad ? '#DC2626' : undefined }}>
                {p.bad ? 'Line ' + p.line + ': ' + p.bad : p.code + ' · ' + p.symbol + ' · ₱100 = ' + p.symbol + fmt(100 * p.rate)}
              </div>
            ))}
          </div>
        )}
        <Btn variant="primary" onClick={runImport} disabled={busy || !good.length}><Upload size={14} /> {busy ? 'Importing…' : 'Import ' + good.length}</Btn>
      </div>

      <ConfirmDialog open={!!del} title={'Remove ' + (del || '') + '?'} message="Shoppers who picked it go back to PHP." confirmText="Remove" danger busy={busy} onConfirm={remove} onCancel={() => setDel(null)} />
    </>
  );
}
