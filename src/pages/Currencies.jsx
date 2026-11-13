import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Upload, Trash2, Plus } from 'lucide-react';
import Btn from '../components/Btn.jsx';
import { useToast } from '../components/Toast.jsx';
import PageHeader from '../xa/ui/PageHeader.jsx';
import Drawer from '../xa/ui/Drawer.jsx';
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
  const [form, setForm] = useState(null); // null = closed, otherwise { ...fields, __edit }
  const [importing, setImporting] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const load = useCallback(async () => {
    try { setRows(await adm('adm_currency_list')); setErr(''); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (row, close) => {
    setBusy(true);
    try {
      await adm('adm_currency_save', { p_cur: row.code, p_name: row.name || '', p_symbol: row.symbol, p_rate: Number(row.rate) || 1, p_active: row.active !== false });
      show?.(row.code.toUpperCase() + ' saved. Shoppers see it on their next page load.', 'success');
      if (close) setForm(null);
      await load();
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
      setText(''); setImporting(false); await load();
    } catch (e) { show?.(e.message, 'error'); }
    setBusy(false);
  };

  const ready = form && form.code.trim() && form.symbol.trim() && Number(form.rate) > 0;
  return (
    <>
      <PageHeader title="Currencies" subtitle="Display only. Orders and wallets always stay in pesos. Rate = how much equals 1 peso."
        actions={<>
          <Btn onClick={load}><RefreshCw size={14} /> Refresh</Btn>
          <Btn onClick={() => setImporting(true)}><Upload size={14} /> Import</Btn>
          <Btn variant="primary" onClick={() => setForm({ ...EMPTY, __edit: false })}><Plus size={14} /> Add</Btn>
        </>} />
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
                        <Btn onClick={() => setForm({ code: c.code, symbol: c.symbol, name: c.name || '', rate: String(c.rate), active: c.active, __edit: true })}>Edit</Btn>{' '}
                        <Btn onClick={() => save({ ...c, active: !c.active }, false)} disabled={busy}>{c.active ? 'Hide' : 'Show'}</Btn>{' '}
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

      <Drawer open={!!form} onClose={() => setForm(null)} title={form && form.__edit ? 'Edit ' + form.code : 'Add a currency'}
        footer={form ? (
          <>
            <Btn variant="primary" onClick={() => save(form, true)} loading={busy} disabled={busy || !ready}>{busy ? 'Saving…' : form.__edit ? 'Save changes' : 'Add currency'}</Btn>
            <Btn onClick={() => setForm(null)} disabled={busy}>Cancel</Btn>
          </>
        ) : null}>
        {form && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><div className="ui-lbl">Code</div><input className="neu-input" placeholder="CAD" value={form.code} disabled={form.__edit} onChange={set('code')} /></div>
            <div><div className="ui-lbl">Symbol</div><input className="neu-input" placeholder="CA$" value={form.symbol} onChange={set('symbol')} /></div>
            <div><div className="ui-lbl">Name</div><input className="neu-input" placeholder="Canadian Dollar" value={form.name} onChange={set('name')} /></div>
            <div><div className="ui-lbl">Rate per ₱1</div><input className="neu-input" inputMode="decimal" placeholder="0.0215" value={form.rate} onChange={set('rate')} /></div>
            {Number(form.rate) > 0 && <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Example: ₱100 will show as {form.symbol}{fmt(100 * Number(form.rate))}</div>}
          </div>
        )}
      </Drawer>

      <Drawer open={importing} onClose={() => setImporting(false)} title="Import currencies"
        footer={
          <>
            <Btn variant="primary" onClick={runImport} loading={busy} disabled={busy || !good.length}><Upload size={14} /> {busy ? 'Importing…' : 'Import ' + good.length}</Btn>
            <Btn onClick={() => setImporting(false)} disabled={busy}>Cancel</Btn>
          </>
        }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>One per line: CODE, SYMBOL, RATE, Name. The rate is how much of that currency equals 1 peso. Existing codes are updated.</div>
          <textarea className="neu-input" rows={8} style={{ width: '100%', fontFamily: 'inherit' }} placeholder={SAMPLE} value={text} onChange={(e) => setText(e.target.value)} />
          {parsed.length > 0 && (
            <div style={{ display: 'grid', gap: 4, fontSize: 12.5 }}>
              {parsed.map((p) => (
                <div key={p.line} style={{ color: p.bad ? '#DC2626' : undefined }}>
                  {p.bad ? 'Line ' + p.line + ': ' + p.bad : p.code + ' · ' + p.symbol + ' · ₱100 = ' + p.symbol + fmt(100 * p.rate)}
                </div>
              ))}
            </div>
          )}
        </div>
      </Drawer>

      <ConfirmDialog open={!!del} title={'Remove ' + (del || '') + '?'} message="Shoppers who picked it go back to PHP." confirmText="Remove" danger busy={busy} onConfirm={remove} onCancel={() => setDel(null)} />
    </>
  );
}
