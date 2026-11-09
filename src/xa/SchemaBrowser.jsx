import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, MoreVertical, Trash2, Edit2, Table as TableIcon } from 'lucide-react';
import { adm, getTables } from './db.js';
import { SkRows, ErrorState, EmptyState, Badge, ConfirmDialog, useXaToast } from './Kit.jsx';
import { supabase } from '../supabase.js';
import { getAdminPin } from '../lib/pin.js';
import Modal from '../components/Modal.jsx';
import Btn from '../components/Btn.jsx';
import Dropdown from './ui/Dropdown.jsx';

const TYPES = ['text', 'integer', 'bigint', 'smallint', 'numeric', 'double precision', 'boolean', 'timestamptz', 'date', 'jsonb', 'uuid'];
const DK = [['none', 'No default'], ['value', 'Fixed value'], ['now', 'Current time'], ['uuid', 'Random uuid']];
const NAME = /^[a-z_][a-z0-9_]*$/;
const sec = { fontSize: 11.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '16px 0 6px' };
const blankCol = (o) => ({ name: '', type: 'text', dk: 'none', dv: '', notNull: false, pk: false, ...(o || {}) });
const payload = (c) => ({ name: c.name.trim(), type: c.type, default_kind: c.dk, default_value: c.dv, not_null: c.notNull, pk: c.pk });

async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, { p_code: getAdminPin(), ...args });
  if (error) throw error;
  return data;
}

function ColFields({ c, set, pk }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <input className="xa-input" placeholder="column_name" aria-label="Column name" value={c.name} onChange={(e) => set({ ...c, name: e.target.value })} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select className="xa-input" style={{ flex: '1 1 120px', width: 'auto' }} aria-label="Type" value={c.type} onChange={(e) => set({ ...c, type: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        <select className="xa-input" style={{ flex: '1 1 120px', width: 'auto' }} aria-label="Default" value={c.dk} onChange={(e) => set({ ...c, dk: e.target.value })}>{DK.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        {c.dk === 'value' && <input className="xa-input" style={{ flex: '1 1 120px', width: 'auto' }} placeholder="value" aria-label="Default value" value={c.dv} onChange={(e) => set({ ...c, dv: e.target.value })} />}
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={c.notNull} onChange={(e) => set({ ...c, notNull: e.target.checked })} /> Not null</label>
        {pk && <label style={{ fontSize: 13, fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={c.pk} onChange={(e) => set({ ...c, pk: e.target.checked, notNull: e.target.checked || c.notNull })} /> Primary key</label>}
      </div>
    </div>
  );
}

export default function SchemaBrowser() {
  const { table } = useParams();
  const nav = useNavigate();
  const { push } = useXaToast();
  const [tables, setTables] = useState(null);
  const [q, setQ] = useState('');
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [nt, setNt] = useState(null);
  const [addCol, setAddCol] = useState(null);
  const [act, setAct] = useState(null);
  const [ren, setRen] = useState(null);
  const [dropT, setDropT] = useState(false);
  const [dropC, setDropC] = useState(null);

  const loadTables = () => getTables(true).then(setTables).catch((e) => setErr(e.message));
  const loadDetail = () => (table ? adm('adm_schema', { p_table: table }).then(setD).catch((e) => setErr(e.message)) : null);
  useEffect(() => { getTables().then(setTables).catch((e) => setErr(e.message)); }, []);
  useEffect(() => { setD(null); setErr(''); loadDetail(); /* eslint-disable-next-line */ }, [table]);
  const list = useMemo(() => (tables || []).filter((t) => t.name.toLowerCase().includes(q.trim().toLowerCase())), [tables, q]);

  const run = async (fn, args, ok) => {
    setBusy(true);
    try {
      const r = await rpc(fn, args);
      if (!r || r.ok === false) { push((r && r.error) || 'Failed', 'error'); setBusy(false); return false; }
      push(ok, 'success');
      await loadTables();
      if (table) await loadDetail();
      setBusy(false);
      return true;
    } catch (e) { push(e.message || 'Failed', 'error'); setBusy(false); return false; }
  };

  const checkCol = (c) => (NAME.test(c.name.trim()) ? '' : 'Column name: lowercase letters, digits and underscores only.');

  const createTable = async () => {
    const n = nt.name.trim();
    if (!NAME.test(n)) return push('Table name: lowercase letters, digits and underscores only.', 'error');
    for (const c of nt.cols) { const m = checkCol(c); if (m) return push(m, 'error'); }
    if (await run('admin_schema_create_table', { p_name: n, p_cols: nt.cols.map(payload), p_rls: nt.rls }, 'Table created')) { setNt(null); nav('/schema/' + n); }
  };
  const addColumn = async () => {
    const m = checkCol(addCol);
    if (m) return push(m, 'error');
    if (await run('admin_schema_add_column', { p_tbl: table, p_col: payload(addCol) }, 'Column added')) setAddCol(null);
  };
  const colAct = (action, col) => {
    if (['set_not_null', 'drop_not_null', 'drop_default'].includes(action)) { run('admin_schema_alter_column', { p_tbl: table, p_col: col.name, p_action: action, p_arg: {} }, 'Column updated'); return; }
    if (action === 'drop') { setDropC(col); return; }
    setAct({ action, col, v: action === 'rename' ? col.name : '', type: 'text', dk: 'value', dv: '' });
  };
  const submitAct = async () => {
    const { action, col } = act;
    let arg;
    if (action === 'rename') { if (!NAME.test(act.v.trim())) return push('Column name: lowercase letters, digits and underscores only.', 'error'); arg = { name: act.v.trim() }; }
    else if (action === 'type') arg = { type: act.type };
    else arg = { kind: act.dk, value: act.dv };
    if (await run('admin_schema_alter_column', { p_tbl: table, p_col: col.name, p_action: action, p_arg: arg }, 'Column updated')) setAct(null);
  };
  const renameTable = async () => {
    const n = ren.trim();
    if (!NAME.test(n)) return push('Table name: lowercase letters, digits and underscores only.', 'error');
    if (await run('admin_schema_rename_table', { p_tbl: table, p_new: n }, 'Table renamed')) { setRen(null); nav('/schema/' + n); }
  };
  const doDropTable = async () => { if (await run('admin_schema_drop_table', { p_tbl: table }, 'Table dropped')) { setDropT(false); nav('/schema'); } };
  const doDropCol = async () => { if (await run('admin_schema_alter_column', { p_tbl: table, p_col: dropC.name, p_action: 'drop', p_arg: {} }, 'Column dropped')) setDropC(null); };

  const popups = (
    <>
      <Modal open={!!nt} wide onClose={() => !busy && setNt(null)} title="New table">
        {nt && (
          <div style={{ display: 'grid', gap: 12 }}>
            <input className="xa-input" placeholder="table_name" aria-label="Table name" autoFocus value={nt.name} onChange={(e) => setNt({ ...nt, name: e.target.value })} />
            {nt.cols.map((c, i) => (
              <div key={i} className="neu-card" style={{ padding: 10 }}>
                <ColFields c={c} pk set={(x) => setNt({ ...nt, cols: nt.cols.map((y, j) => (j === i ? x : y)) })} />
                {nt.cols.length > 1 && <button type="button" className="neu-btn" style={{ marginTop: 8, color: 'var(--danger)' }} onClick={() => setNt({ ...nt, cols: nt.cols.filter((_, j) => j !== i) })}>Remove column</button>}
              </div>
            ))}
            <button type="button" className="neu-btn" onClick={() => setNt({ ...nt, cols: [...nt.cols, blankCol()] })}><Plus size={14} /> Add column</button>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={nt.rls} onChange={(e) => setNt({ ...nt, rls: e.target.checked })} /> Turn on row level security (recommended)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="primary" loading={busy} onClick={createTable} style={{ flex: 1 }}>{busy ? 'Creating...' : 'Create table'}</Btn>
              <Btn onClick={() => setNt(null)} disabled={busy} style={{ flex: 1 }}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>
      <Modal open={!!addCol} onClose={() => !busy && setAddCol(null)} title={'Add a column to ' + table}>
        {addCol && (
          <div style={{ display: 'grid', gap: 12 }}>
            <ColFields c={addCol} set={setAddCol} />
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>A not-null column on a table that already has rows needs a default value.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="primary" loading={busy} onClick={addColumn} style={{ flex: 1 }}>{busy ? 'Adding...' : 'Add column'}</Btn>
              <Btn onClick={() => setAddCol(null)} disabled={busy} style={{ flex: 1 }}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>
      <Modal open={!!act} onClose={() => !busy && setAct(null)} title={act ? { rename: 'Rename ', type: 'Change type of ', set_default: 'Set default for ' }[act.action] + act.col.name : ''}>
        {act && (
          <div style={{ display: 'grid', gap: 12 }}>
            {act.action === 'rename' && <input className="xa-input" autoFocus aria-label="New name" value={act.v} onChange={(e) => setAct({ ...act, v: e.target.value })} />}
            {act.action === 'type' && <>
              <select className="xa-input" aria-label="New type" value={act.type} onChange={(e) => setAct({ ...act, type: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Existing values are converted. The change fails, and nothing is lost, if a value cannot be converted.</div>
            </>}
            {act.action === 'set_default' && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select className="xa-input" style={{ flex: '1 1 130px', width: 'auto' }} aria-label="Default" value={act.dk} onChange={(e) => setAct({ ...act, dk: e.target.value })}>{DK.filter(([k]) => k !== 'none').map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              {act.dk === 'value' && <input className="xa-input" style={{ flex: '1 1 130px', width: 'auto' }} placeholder="value" aria-label="Default value" value={act.dv} onChange={(e) => setAct({ ...act, dv: e.target.value })} />}
            </div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="primary" loading={busy} onClick={submitAct} style={{ flex: 1 }}>{busy ? 'Saving...' : 'Save'}</Btn>
              <Btn onClick={() => setAct(null)} disabled={busy} style={{ flex: 1 }}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>
      <Modal open={ren !== null} onClose={() => !busy && setRen(null)} title={'Rename ' + table}>
        <div style={{ display: 'grid', gap: 12 }}>
          <input className="xa-input" autoFocus aria-label="New table name" value={ren || ''} onChange={(e) => setRen(e.target.value)} />
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>The app and admin pages that use the old name will stop finding this table until they are updated.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="primary" loading={busy} onClick={renameTable} style={{ flex: 1 }}>{busy ? 'Saving...' : 'Rename'}</Btn>
            <Btn onClick={() => setRen(null)} disabled={busy} style={{ flex: 1 }}>Cancel</Btn>
          </div>
        </div>
      </Modal>
      <ConfirmDialog open={dropT} title={'Drop table ' + table + '?'} message="The table and all its rows are deleted. Tables that other tables depend on are refused. This cannot be undone." confirmText="Drop table" danger typeToConfirm={table} busy={busy} onConfirm={doDropTable} onCancel={() => setDropT(false)} />
      <ConfirmDialog open={!!dropC} title={'Drop column ' + (dropC ? dropC.name : '') + '?'} message="The column and its data are deleted. This cannot be undone." confirmText="Drop column" danger typeToConfirm={dropC ? dropC.name : ''} busy={busy} onConfirm={doDropCol} onCancel={() => setDropC(null)} />
    </>
  );

  if (!table) {
    return (
      <div style={{ padding: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Schema browser</h2>
          <Btn variant="primary" style={{ marginLeft: 'auto' }} onClick={() => setNt({ name: '', rls: true, cols: [blankCol({ name: 'id', type: 'uuid', dk: 'uuid', notNull: true, pk: true }), blankCol({ name: 'created_at', type: 'timestamptz', dk: 'now', notNull: true })] })}><Plus size={15} /> New table</Btn>
        </div>
        <input className="xa-input" style={{ marginBottom: 10 }} placeholder="Find a table" aria-label="Find a table" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="neu-card" style={{ padding: 8 }}>
          {err && <ErrorState message={err} />}
          {!err && !tables && <SkRows rows={8} cols={3} />}
          {tables && list.length === 0 && <EmptyState title="No matching table" />}
          {tables && list.map((t) => (
            <button type="button" key={t.name} onClick={() => nav('/schema/' + t.name)} style={{ display: 'flex', width: '100%', gap: 10, padding: '11px 12px', textAlign: 'left', alignItems: 'center' }}>
              <b style={{ fontSize: 14 }}>{t.name}</b><span style={{ marginLeft: 'auto', color: 'var(--text-dim)', fontSize: 12 }}>{t.cols.length} columns</span>
            </button>
          ))}
        </div>
        {popups}
      </div>
    );
  }

  return (
    <div style={{ padding: 4 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        <button type="button" className="neu-btn" onClick={() => nav('/schema')} aria-label="Back to tables">←</button>
        <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>{table}</h2>
        {d && <><Badge tone={d.rls ? 'ok' : 'warn'}>RLS {d.rls ? 'on' : 'off'}</Badge><Badge>~{Number(d.rows_est).toLocaleString()} rows</Badge><Badge>{d.size}</Badge></>}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        <Btn onClick={() => nav('/data/' + table)}><TableIcon size={14} /> Edit rows</Btn>
        <Btn onClick={() => nav('/db/' + table)}>Open data</Btn>
        <Btn onClick={() => setRen(table)}><Edit2 size={14} /> Rename</Btn>
        <Btn variant="danger" onClick={() => setDropT(true)}><Trash2 size={14} /> Drop table</Btn>
      </div>
      {err && <div className="neu-card"><ErrorState message={err} /></div>}
      {!err && !d && <div className="neu-card"><SkRows rows={8} cols={4} /></div>}
      {d && (<>
        <div style={{ ...sec, display: 'flex', alignItems: 'center' }}>Columns<button type="button" className="neu-btn" style={{ marginLeft: 'auto', textTransform: 'none', letterSpacing: 0 }} onClick={() => setAddCol(blankCol())}><Plus size={14} /> Add column</button></div>
        <div className="neu-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: 'var(--surface-2)', textAlign: 'left', color: 'var(--text-dim)' }}>{['Name', 'Type', 'Null', 'Default', ''].map((h, i) => <th key={i} style={{ padding: '8px 12px' }}>{h}</th>)}</tr></thead>
            <tbody>{d.columns.map((c) => (
              <tr key={c.name} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px', fontWeight: 700 }}>{c.name}</td>
                <td style={{ padding: '8px 12px' }}>{c.type}</td>
                <td style={{ padding: '8px 12px' }}>{c.nullable ? 'yes' : 'no'}</td>
                <td style={{ padding: '8px 12px', color: 'var(--text-dim)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.default || ''}</td>
                <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                  <Dropdown label={'Actions for ' + c.name} trigger={<MoreVertical size={15} />} items={[
                    { label: 'Rename', onClick: () => colAct('rename', c) },
                    { label: 'Change type', onClick: () => colAct('type', c) },
                    { label: 'Set default', onClick: () => colAct('set_default', c) },
                    ...(c.default ? [{ label: 'Remove default', onClick: () => colAct('drop_default', c) }] : []),
                    { label: c.nullable ? 'Make required' : 'Allow empty', onClick: () => colAct(c.nullable ? 'set_not_null' : 'drop_not_null', c) },
                    { label: 'Drop column', danger: true, onClick: () => colAct('drop', c) },
                  ]} />
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        {[['Constraints', d.constraints, (x) => x.name + ': ' + x.def], ['Indexes', d.indexes, (x) => x.def], ['Triggers', d.triggers, (x) => x]].map(([t, arr, f]) => (
          <div key={t}><div style={sec}>{t} ({arr.length})</div>
            <div className="neu-card" style={{ padding: 10, fontSize: 12, fontFamily: 'ui-monospace,monospace', wordBreak: 'break-all' }}>{arr.length === 0 ? <span style={{ color: 'var(--text-dim)' }}>None</span> : arr.map((x, i) => <div key={i} style={{ padding: '4px 0' }}>{f(x)}</div>)}</div></div>
        ))}
        <div style={sec}>Row-level security policies ({d.policies.length})</div>
        <div className="neu-card" style={{ padding: 10, fontSize: 12.5 }}>
          {d.policies.length === 0 && <span style={{ color: 'var(--text-dim)' }}>{d.rls ? 'RLS is on with no policies: only the service role and admin functions can read this table.' : 'No policies.'}</span>}
          {d.policies.map((p, i) => <div key={i} style={{ padding: '6px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}><b>{p.name}</b> <Badge>{p.cmd}</Badge><div style={{ fontFamily: 'ui-monospace,monospace', fontSize: 11.5, color: 'var(--text-dim)', wordBreak: 'break-all', marginTop: 3 }}>using {p.using || 'true'}{p.check ? ' · check ' + p.check : ''}</div></div>)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 12 }}>Indexes, triggers, constraints and policies are still managed in the <a href="/sql" onClick={(e) => { e.preventDefault(); nav('/sql'); }} style={{ color: 'var(--primary)' }}>SQL editor</a>.</div>
      </>)}
      {popups}
    </div>
  );
}
