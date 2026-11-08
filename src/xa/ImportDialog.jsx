import React, { useMemo, useRef, useState } from 'react';
import { adm, typeKind, parseCell } from './db.js';
import { LoadingBtn, useXaToast, Badge } from './Kit.jsx';

const MAX = 500;

function parseCsv(text) {
  const out = []; let row = []; let cur = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; out.push(row); row = []; }
    else cur += ch;
  }
  if (cur !== '' || row.length) { row.push(cur); out.push(row); }
  return out.filter((r) => r.some((c) => c !== ''));
}

function conv(kind, v, nullable) {
  if (v === '' || v === null || v === undefined) return undefined;
  if (typeof v !== 'string') {
    if (kind === 'json' || kind === 'array' || kind === 'number' || kind === 'bool') return v;
    return String(v);
  }
  if (kind === 'number' || kind === 'bool' || kind === 'json' || kind === 'array') return parseCell(kind, v, nullable);
  return v;
}

export default function ImportDialog({ table, meta, onClose, onDone }) {
  const { push } = useXaToast();
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const fileRef = useRef(null);
  const colMap = useMemo(() => Object.fromEntries(meta.cols.map((c) => [c.name, c])), [meta]);

  const parsed = useMemo(() => {
    const t = text.replace(/^\uFEFF/, '').trim();
    if (!t) return null;
    let records;
    try {
      if (t[0] === '[' || t[0] === '{') { const j = JSON.parse(t); records = Array.isArray(j) ? j : (Array.isArray(j.rows) ? j.rows : [j]); }
      else {
        const grid = parseCsv(t);
        if (grid.length < 2) return { error: 'CSV needs a header row and at least one data row.' };
        const head = grid[0].map((h) => h.trim());
        records = grid.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] === undefined ? '' : r[i]])));
      }
    } catch (e) { return { error: 'Could not read the data: ' + e.message }; }
    if (!records.length) return { error: 'No rows found.' };
    if (records.length > MAX) return { error: 'Too many rows (' + records.length + '). Import up to ' + MAX + ' at a time.' };
    const unknown = new Set(); const issues = []; const rows = [];
    records.forEach((rec, i) => {
      if (!rec || typeof rec !== 'object' || Array.isArray(rec)) { issues.push('Row ' + (i + 1) + ': not an object'); return; }
      const out = {};
      Object.keys(rec).forEach((k) => {
        const key = k.trim();
        if (!key) return;
        const c = colMap[key];
        if (!c) { unknown.add(key); return; }
        try { const v = conv(typeKind(c.type, !!c.enum), rec[k], c.nullable); if (v !== undefined) out[key] = v; }
        catch (e) { issues.push('Row ' + (i + 1) + ', ' + key + ': ' + e.message); }
      });
      rows.push(out);
    });
    return { rows, unknown: [...unknown], issues: issues.slice(0, 20), n: records.length };
  }, [text, colMap]);

  const blocked = !parsed || !!parsed.error || parsed.unknown.length > 0 || parsed.issues.length > 0;
  const validated = !!res && res.dry && res.bad === 0 && !res.applied;
  const heads = parsed && parsed.rows ? [...new Set(parsed.rows.flatMap((r) => Object.keys(r)))] : [];

  const pickFile = (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) { push('File is too big (3 MB max).', 'error'); return; }
    const fr = new FileReader();
    fr.onload = () => { setText(String(fr.result || '')); setName(f.name); setRes(null); };
    fr.onerror = () => push('Could not read that file.', 'error');
    fr.readAsText(f);
  };
  const template = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([meta.cols.map((c) => c.name).join(',') + '\n'], { type: 'text/csv' }));
    a.download = table + '-template.csv'; a.click(); URL.revokeObjectURL(a.href);
  };
  const run = async (dry) => {
    if (blocked || busy) return;
    setBusy(true);
    try {
      const r = await adm('adm_import', { p_table: table, p_rows: parsed.rows, p_dry: dry });
      setRes(r);
      if (r.applied) { push('Imported ' + r.ok + ' row' + (r.ok === 1 ? '' : 's'), 'success'); onDone(); }
      else if (!dry) push('Nothing was imported. Fix the errors and try again.', 'error', 6000);
    } catch (e) { push(e.message, 'error', 6000); }
    setBusy(false);
  };

  return (
    <div className="xa-ov center" onClick={() => !busy && onClose()}>
      <div className="xa-dialog" style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }} role="dialog" aria-modal="true" aria-label="Import rows" onClick={(e) => e.stopPropagation()}>
        <h3>Import into {table}</h3>
        <p>CSV (with a header row) or JSON (array of objects). Column names must match the table. Empty cells use the column default. All-or-nothing, up to {MAX} rows.</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <button type="button" className="neu-btn" onClick={() => fileRef.current && fileRef.current.click()}>Choose file</button>
          <button type="button" className="neu-btn" onClick={template}>Download CSV template</button>
          {name && <Badge>{name}</Badge>}
          <input ref={fileRef} type="file" accept=".csv,.json,text/csv,application/json" style={{ display: 'none' }} onChange={pickFile} />
        </div>
        <textarea className="xa-input" rows={5} style={{ fontFamily: 'ui-monospace,monospace', fontSize: 12 }} placeholder="…or paste CSV / JSON here" value={text} onChange={(e) => { setText(e.target.value); setRes(null); }} />

        {parsed && parsed.error && <div style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 700, marginTop: 8 }}>{parsed.error}</div>}
        {parsed && !parsed.error && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{parsed.n} row{parsed.n === 1 ? '' : 's'} read</div>
            {parsed.unknown.length > 0 && <div style={{ color: 'var(--danger)', fontSize: 12.5, marginTop: 4 }}>Unknown columns: {parsed.unknown.join(', ')}. Rename them to match the table or remove them.</div>}
            {parsed.issues.map((m, i) => <div key={i} style={{ color: 'var(--danger)', fontSize: 12.5, marginTop: 2 }}>{m}</div>)}
            {!blocked && (
              <div style={{ overflowX: 'auto', marginTop: 8, border: '1px solid var(--border)', borderRadius: 10 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead><tr style={{ background: 'var(--surface-2)', textAlign: 'left' }}>{heads.map((h) => <th key={h} style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
                  <tbody>{parsed.rows.slice(0, 5).map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>{heads.map((h) => <td key={h} style={{ padding: '5px 8px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r[h] === undefined ? '' : typeof r[h] === 'object' ? JSON.stringify(r[h]) : String(r[h])}</td>)}</tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {res && (
          <div style={{ marginTop: 10, fontSize: 13 }}>
            {res.bad === 0 && res.dry && <div style={{ color: 'var(--success)', fontWeight: 700 }}>Validation passed: {res.ok} row{res.ok === 1 ? '' : 's'} are ready to import.</div>}
            {res.bad > 0 && <div style={{ color: 'var(--danger)', fontWeight: 700 }}>{res.bad} row{res.bad === 1 ? '' : 's'} failed. Nothing was imported.</div>}
            {(res.errors || []).map((er, i) => <div key={i} style={{ color: 'var(--danger)', fontSize: 12.5, marginTop: 2 }}>Row {er.row}: {er.error}</div>)}
          </div>
        )}

        <div className="row" style={{ marginTop: 14 }}>
          <button type="button" className="neu-btn" disabled={busy} onClick={onClose}>Close</button>
          <LoadingBtn loading={busy} disabled={blocked} onClick={() => run(true)}>Validate</LoadingBtn>
          <LoadingBtn variant="primary" loading={busy} disabled={blocked || !validated} onClick={() => run(false)}>Import {parsed && parsed.n ? parsed.n : ''}</LoadingBtn>
        </div>
      </div>
    </div>
  );
}
