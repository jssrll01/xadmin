import React, { useEffect, useMemo, useState } from 'react';
import { Search, ArrowUp, ArrowDown, SlidersHorizontal, Download, X } from 'lucide-react';
import Dropdown from './Dropdown.jsx';
import Pagination from './Pagination.jsx';
import { SkRows, EmptyState, ErrorState } from '../Kit.jsx';

const cell = (v) => (v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
const csvCell = (v) => {
  let s = cell(v);
  if (typeof v === 'string' && /^[=+@-]/.test(s)) s = "'" + s; // blocks spreadsheet formula injection
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
function save(name, text, type) {
  const u = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = u; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}

// columns: [{ key, label, render?, sortable?, sortValue?, exportValue?, wrap? }]
export default function DataTable({
  columns, rows, loading, error, onRetry, rowKey = 'id', searchKeys = [], searchPlaceholder = 'Search…', pageSize = 25,
  selectable, bulkActions = [], rowActions, onRowClick, exportName = 'export', toolbar, emptyTitle, emptyHint,
}) {
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [sort, setSort] = useState({ key: '', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(pageSize);
  const [hidden, setHidden] = useState({});
  const [sel, setSel] = useState({});

  useEffect(() => { const t = setTimeout(() => { setDq(q.trim().toLowerCase()); setPage(1); }, 200); return () => clearTimeout(t); }, [q]);

  const shown = columns.filter((c) => !hidden[c.key]);
  const list = useMemo(() => {
    let out = rows || [];
    if (dq && searchKeys.length) out = out.filter((r) => searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(dq)));
    if (sort.key) {
      const col = columns.find((c) => c.key === sort.key);
      const val = (r) => (col && col.sortValue ? col.sortValue(r) : r[sort.key]);
      const s = sort.dir === 'asc' ? 1 : -1;
      out = [...out].sort((a, b) => {
        const x = val(a), y = val(b);
        if (x == null && y == null) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        if (typeof x === 'number' && typeof y === 'number') return (x - y) * s;
        return String(x).localeCompare(String(y)) * s;
      });
    }
    return out;
  }, [rows, dq, searchKeys, sort, columns]);

  const pages = Math.max(1, Math.ceil(list.length / size));
  const cur = Math.min(page, pages);
  const pageRows = list.slice((cur - 1) * size, cur * size);
  const selRows = (rows || []).filter((r) => sel[r[rowKey]]);
  const allOnPage = pageRows.length > 0 && pageRows.every((r) => sel[r[rowKey]]);

  const toggleSort = (k) => setSort((s) => (s.key === k ? { key: k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'asc' }));
  const togglePage = () => setSel((s) => { const n = { ...s }; pageRows.forEach((r) => { if (allOnPage) delete n[r[rowKey]]; else n[r[rowKey]] = true; }); return n; });
  const toggleRow = (r) => setSel((s) => { const n = { ...s }; if (n[r[rowKey]]) delete n[r[rowKey]]; else n[r[rowKey]] = true; return n; });

  const exportCsv = () => {
    const head = shown.map((c) => csvCell(c.label)).join(',');
    const body = list.map((r) => shown.map((c) => csvCell(c.exportValue ? c.exportValue(r) : r[c.key])).join(',')).join('\n');
    save(exportName + '.csv', head + '\n' + body, 'text/csv;charset=utf-8');
  };
  const exportJson = () => save(exportName + '.json', JSON.stringify(list, null, 2), 'application/json');

  const busy = loading && (!rows || rows.length === 0);
  const colSpan = shown.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0);

  return (
    <div>
      <div className="ui-tools">
        {searchKeys.length > 0 && (
          <label className="ui-search">
            <Search size={15} />
            <input className="neu-input" value={q} placeholder={searchPlaceholder} aria-label="Search" onChange={(e) => setQ(e.target.value)} />
          </label>
        )}
        {toolbar}
        <div className="ui-sp">
          <Dropdown label="Choose columns" trigger={<><SlidersHorizontal size={15} /> Columns</>}>
            {columns.map((c) => (
              <label key={c.key}>
                <input type="checkbox" checked={!hidden[c.key]} onChange={() => setHidden((h) => ({ ...h, [c.key]: !h[c.key] }))} />{c.label}
              </label>
            ))}
          </Dropdown>
          <Dropdown label="Export" trigger={<><Download size={15} /> Export</>} items={[
            { label: 'CSV (' + list.length + ' rows)', onClick: exportCsv, disabled: list.length === 0 },
            { label: 'JSON (' + list.length + ' rows)', onClick: exportJson, disabled: list.length === 0 },
          ]} />
        </div>
      </div>

      {selectable && selRows.length > 0 && (
        <div className="ui-bulk">
          <span>{selRows.length} selected</span>
          {bulkActions.map((a) => (
            <button key={a.label} type="button" className={'neu-btn' + (a.danger ? ' neu-btn-danger' : '')} onClick={() => a.onClick(selRows)}>{a.label}</button>
          ))}
          <button type="button" className="neu-btn" onClick={() => setSel({})}><X size={14} /> Clear</button>
        </div>
      )}

      {busy ? <div className="table-wrap" style={{ padding: 8 }}><SkRows rows={8} cols={Math.min(5, Math.max(2, shown.length))} /></div>
        : error ? <div className="table-wrap"><ErrorState message="Could not load data." onRetry={onRetry} /></div>
        : list.length === 0 ? <div className="table-wrap"><EmptyState title={(rows || []).length === 0 ? (emptyTitle || 'No data yet') : 'No matches'} hint={(rows || []).length === 0 ? emptyHint : 'Try a different search or filter.'} /></div>
        : (
          <div className="table-wrap">
            <table className="neu-table">
              <thead>
                <tr>
                  {selectable && <th className="chk"><input type="checkbox" checked={allOnPage} onChange={togglePage} aria-label="Select all on this page" /></th>}
                  {shown.map((c) => {
                    const on = sort.key === c.key;
                    const can = c.sortable !== false;
                    return (
                      <th key={c.key} className={can ? 'srt' : undefined} scope="col" aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                        tabIndex={can ? 0 : undefined} onClick={can ? () => toggleSort(c.key) : undefined}
                        onKeyDown={can ? (e) => { if (e.key === 'Enter') toggleSort(c.key); } : undefined}>
                        {c.label}{on ? (sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : null}
                      </th>
                    );
                  })}
                  {rowActions && <th style={{ textAlign: 'right', width: 1 }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => (
                  <tr key={r[rowKey] ?? i} className={sel[r[rowKey]] ? 'sel' : undefined} style={onRowClick ? { cursor: 'pointer' } : undefined} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                    {selectable && <td className="chk" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={!!sel[r[rowKey]]} onChange={() => toggleRow(r)} aria-label="Select row" /></td>}
                    {shown.map((c) => <td key={c.key} className={c.wrap ? 'cell-wrap' : undefined}>{c.render ? c.render(r) : String(r[c.key] ?? '—')}</td>)}
                    {rowActions && <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}><div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>{rowActions(r)}</div></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      {!busy && !error && list.length > 0 && <Pagination page={cur} pages={pages} total={list.length} size={size} onPage={setPage} onSize={(n) => { setSize(n); setPage(1); }} />}
      <span hidden>{colSpan}</span>
    </div>
  );
}
