import React, { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import Btn from '../components/Btn.jsx';
import { useToast } from '../components/Toast.jsx';
import PageHeader from '../xa/ui/PageHeader.jsx';
import { ErrorState, SkRows } from '../xa/Kit.jsx';
import { adm } from '../xa/db.js';
import { fetchAllRows } from '../xa/rowsAll.js';
import { downloadText, stamp } from '../lib/download.js';

export default function BackupManager() {
  const { show } = useToast();
  const [tables, setTables] = useState(null);
  const [err, setErr] = useState('');
  const [pick, setPick] = useState({});
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState('');

  useEffect(() => {
    adm('adm_tables').then((t) => setTables((Array.isArray(t) ? t : (t && t.items) || []).filter((x) => x.kind === 'r').map((x) => x.name).sort())).catch((e) => setErr(e.message));
  }, []);
  const list = useMemo(() => (tables || []).filter((n) => n.toLowerCase().includes(q.trim().toLowerCase())), [tables, q]);
  const chosen = (tables || []).filter((n) => pick[n]);
  const toggle = (n) => setPick((p) => ({ ...p, [n]: !p[n] }));
  const setMany = (names, v) => setPick((p) => { const c = { ...p }; names.forEach((n) => { c[n] = v; }); return c; });

  const run = async () => {
    setBusy(true);
    try {
      const out = { exported_at: new Date().toISOString(), tables: {}, truncated: [] };
      for (const n of chosen) {
        setProg(n + '…');
        const r = await fetchAllRows(n, { max: 50000, step: 1000, onProgress: (c) => setProg(n + ' ' + c) });
        out.tables[n] = r.rows;
        if (r.truncated) out.truncated.push(n);
      }
      downloadText('xmarket-backup-' + stamp() + '.json', JSON.stringify(out, null, 1), 'application/json');
      show?.(chosen.length + ' tables saved' + (out.truncated.length ? '. Cut at 50000 rows: ' + out.truncated.join(', ') : ''), 'success');
    } catch (e) { show?.(e.message, 'error'); }
    setBusy(false); setProg('');
  };

  return (
    <>
      <PageHeader title="Backup" subtitle="Save tables to one JSON file on this device"
        actions={<Btn variant="primary" onClick={run} disabled={busy || !chosen.length}><Download size={14} /> {busy ? prog : 'Download ' + chosen.length + ' table' + (chosen.length === 1 ? '' : 's')}</Btn>} />
      {err && <ErrorState message={err} />}
      {!err && !tables && <div className="table-wrap" style={{ padding: 8 }}><SkRows rows={6} cols={2} /></div>}
      {tables && (
        <>
          <div className="ui-tools">
            <div className="ui-search"><input className="neu-input" placeholder="Filter tables" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <Btn onClick={() => setMany(list, true)}>Select shown</Btn>
            <Btn onClick={() => setMany(tables, false)}>Clear</Btn>
          </div>
          <div className="table-wrap" style={{ padding: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 4 }}>
            {list.map((n) => (
              <label key={n} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 8px', fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={!!pick[n]} onChange={() => toggle(n)} /> {n}
              </label>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>The file contains the data as it is now, including soft-deleted rows. Keep it private: it can hold customer details.</p>
        </>
      )}
    </>
  );
}
