import React, { useCallback, useEffect, useState } from 'react';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import { SkCards, ErrorState } from '../xa/Kit.jsx';
import { adm } from '../xa/db.js';
import { downloadText, stamp } from '../lib/download.js';

const SEV = { high: ['#DC2626', 'High'], medium: ['#D97706', 'Medium'], low: ['#2563EB', 'Low'], ok: ['#059669', 'Passed'] };
const RANK = { high: 0, medium: 1, low: 2, ok: 3 };
const chip = (sev) => ({
  background: SEV[sev][0] + '1A', color: SEV[sev][0], borderRadius: 20, padding: '2px 10px',
  fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap',
});
const sorted = (d) => d.findings.slice().sort((a, b) => RANK[a.severity] - RANK[b.severity]);

function report(d) {
  const out = ['XMARKET security check', 'Run: ' + new Date(d.checked_at).toLocaleString(), ''];
  sorted(d).forEach((f) => {
    out.push('[' + SEV[f.severity][1].toUpperCase() + '] ' + f.title + ' (' + f.count + ')');
    if (f.count) {
      out.push('  ' + f.detail);
      f.items.forEach((i) => out.push('  - ' + i));
      if (f.count > f.items.length) out.push('  ... and ' + (f.count - f.items.length) + ' more');
    }
  });
  return out.join('\n');
}

export default function SecurityCheck() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState({});

  const run = useCallback(async () => {
    setBusy(true); setErr('');
    try { setData(await adm('adm_security_check')); } catch (e) { setErr(e.message); }
    setBusy(false);
  }, []);
  useEffect(() => { run(); }, [run]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(report(data)); setErr(''); } catch (e) { setErr('Copy failed. Use Download report instead.'); }
  };
  const sm = data ? data.summary : {};
  const tiles = [['high', 'High risk'], ['medium', 'Medium'], ['low', 'Low'], ['ok', 'Passed']];

  return (
    <div style={{ padding: 16, maxWidth: 980, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Security check</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>Row security, grants and function checks, run live against your database. Read-only.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn onClick={copy} disabled={!data}>Copy report</Btn>
          <Btn onClick={() => downloadText('security-check-' + stamp() + '.txt', report(data), 'text/plain;charset=utf-8')} disabled={!data}>Download report</Btn>
          <Btn variant="primary" loading={busy} onClick={run}>Run check</Btn>
        </div>
      </div>

      {err && <ErrorState message={err} onRetry={run} />}
      {!data && !err && <SkCards n={4} />}

      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 14 }}>
            {tiles.map(([k, label]) => (
              <Card key={k}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: SEV[k][0] }}>{sm[k] || 0}</div>
              </Card>
            ))}
          </div>

          {sorted(data).map((f) => (
            <Card key={f.id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={chip(f.severity)}>{SEV[f.severity][1]}</span>
                <b style={{ fontSize: 14.5, flex: 1, minWidth: 180 }}>{f.title}</b>
                {f.count > 0 && (
                  <Btn onClick={() => setOpen({ ...open, [f.id]: !open[f.id] })} style={{ padding: '4px 10px', fontSize: 12 }}>
                    {open[f.id] ? 'Hide ' : 'Show '}{f.count}
                  </Btn>
                )}
              </div>
              {f.count > 0 && <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--muted)' }}>{f.detail}</p>}
              {open[f.id] && (
                <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {f.items.map((i, k) => (
                    <code key={k} style={{ fontSize: 12, padding: '3px 8px', borderRadius: 8, border: '1px solid var(--border)', wordBreak: 'break-all' }}>{i}</code>
                  ))}
                  {f.count > f.items.length && <span style={{ fontSize: 12, color: 'var(--muted)' }}>and {f.count - f.items.length} more</span>}
                </div>
              )}
            </Card>
          ))}
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>Checked {new Date(data.checked_at).toLocaleString()}. These checks catch common risks and cannot prove the database is secure.</p>
        </>
      )}
    </div>
  );
}
