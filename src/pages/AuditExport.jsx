import React, { useState } from 'react';
import { Download } from 'lucide-react';
import Btn from '../components/Btn.jsx';
import { useToast } from '../components/Toast.jsx';
import PageHeader from '../xa/ui/PageHeader.jsx';
import { SOURCES, EMPTY_FILTER, loadAudit, filterAudit, distinct, manila } from '../lib/auditData.js';
import { toCsv, downloadText, stamp } from '../lib/download.js';

const COLS = ['created_at', 'actor', 'action', 'table_name', 'record_id', 'ip', 'before_data', 'after_data'];

export default function AuditExport() {
  const { show } = useToast();
  const [source, setSource] = useState('audit_log');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [action, setAction] = useState('all');
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState('');

  const run = async () => {
    setBusy(true); setProg('Loading…');
    try {
      const r = await loadAudit(source, { max: 20000, onProgress: (n, t) => setProg(n + (t ? ' of ' + t : '') + ' rows') });
      const rows = filterAudit(r.rows, { ...EMPTY_FILTER, from, to, action }).map((x) => ({ ...x, created_at: manila(x.created_at) }));
      if (!rows.length) { show?.('Nothing matches those filters', 'error'); }
      else {
        downloadText(source + '-' + stamp() + '.csv', toCsv(rows, COLS));
        show?.(rows.length + ' rows exported' + (r.truncated ? ' (newest 20000 only)' : ''), 'success');
      }
    } catch (e) { show?.(e.message, 'error'); }
    setBusy(false); setProg('');
  };

  return (
    <>
      <PageHeader title="Audit export" subtitle="Download the audit log as a CSV file (Manila time)" />
      <div className="table-wrap" style={{ padding: 16, display: 'grid', gap: 12, maxWidth: 520 }}>
        <label><div className="ui-lbl">Log</div>
          <select className="neu-input" value={source} onChange={(e) => setSource(e.target.value)}>{SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label><div className="ui-lbl">Action</div>
          <select className="neu-input" value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="all">All actions</option><option>create</option><option>update</option><option>delete</option></select></label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label style={{ flex: '1 1 140px' }}><div className="ui-lbl">From</div><input className="neu-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label style={{ flex: '1 1 140px' }}><div className="ui-lbl">To</div><input className="neu-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
        <Btn variant="primary" onClick={run} disabled={busy}><Download size={14} /> {busy ? prog : 'Export CSV'}</Btn>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>Leave the dates empty for everything (newest 20,000 rows).</p>
      </div>
    </>
  );
}
