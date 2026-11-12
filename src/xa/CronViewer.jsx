import React, { useCallback, useEffect, useState } from 'react';
import { Clock, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { adm } from './db.js';
import { Badge, EmptyState, ErrorState, SkRows } from './Kit.jsx';
import { ago, cronText, fmtMs, when } from './xaFmt.js';

const tone = (s) => (s === 'succeeded' ? 'ok' : s === 'failed' ? 'bad' : s ? 'warn' : undefined);

function Job({ j, open, runs, onToggle }) {
  return (
    <div className="neu-card" style={{ padding: 0, marginBottom: 10, overflow: 'hidden' }}>
      <button type="button" data-xa-skip aria-expanded={open} onClick={onToggle}
        style={{ display: 'flex', width: '100%', gap: 10, alignItems: 'flex-start', padding: 14, textAlign: 'left' }}>
        <span style={{ marginTop: 2 }}>{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <b style={{ fontSize: 14.5, wordBreak: 'break-word' }}>{j.name}</b>
            {!j.active && <Badge tone="warn">paused</Badge>}
            {Number(j.fails_24h) > 0 && <Badge tone="bad">{j.fails_24h} failed in 24h</Badge>}
          </span>
          <span style={{ display: 'block', fontSize: 12.5, opacity: 0.75, marginTop: 3 }}>{cronText(j.schedule)} <code style={{ opacity: 0.7 }}>({j.schedule})</code></span>
          <span style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap', fontSize: 12 }}>
            {j.last_status ? <Badge tone={tone(j.last_status)}>{j.last_status}</Badge> : <Badge>no runs yet</Badge>}
            {j.last_at && <span style={{ opacity: 0.7 }}>{ago(j.last_at)}{j.last_ms != null ? ' - ' + fmtMs(j.last_ms) : ''}</span>}
            <span style={{ opacity: 0.55 }}>{j.runs_24h} runs in 24h</span>
          </span>
        </span>
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, opacity: 0.6, margin: '10px 0 4px' }}>COMMAND</div>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, background: 'var(--surface-2)', padding: 10, borderRadius: 10 }}>{j.command}</pre>
          <div style={{ fontSize: 11.5, fontWeight: 800, opacity: 0.6, margin: '12px 0 4px' }}>RECENT RUNS</div>
          {!runs && <SkRows rows={3} cols={3} />}
          {runs && runs.length === 0 && <div style={{ fontSize: 13, opacity: 0.6 }}>No runs recorded.</div>}
          {runs && runs.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '6px 0', borderTop: i ? '1px solid var(--border)' : 'none', fontSize: 12.5 }}>
              <Badge tone={tone(r.status)}>{r.status}</Badge>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ opacity: 0.75 }}>{when(r.started)}{r.ms != null ? ' - ' + fmtMs(r.ms) : ''}</span>
                {r.status === 'failed' && r.message && <span style={{ display: 'block', color: 'var(--danger)', wordBreak: 'break-word' }}>{r.message}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CronViewer() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(null);
  const [runs, setRuns] = useState({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try { setData(await adm('adm_cron_list')); setErr(''); } catch (e) { setErr(e.message); }
    setBusy(false);
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 30000);
    return () => clearInterval(t);
  }, [load]);

  const toggle = async (j) => {
    if (open === j.jobid) { setOpen(null); return; }
    setOpen(j.jobid);
    if (!runs[j.jobid]) {
      let r = [];
      try { r = await adm('adm_cron_runs', { p_jobid: j.jobid, p_limit: 20 }); } catch (e) { r = []; }
      setRuns((o) => ({ ...o, [j.jobid]: r }));
    }
  };

  const jobs = (data && data.jobs) || [];
  const failing = jobs.filter((j) => Number(j.fails_24h) > 0).length;

  return (
    <div style={{ padding: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={22} /> Cron jobs</h2>
        {data && data.enabled && <Badge>{jobs.length} jobs</Badge>}
        {data && data.enabled && <Badge tone={failing ? 'bad' : 'ok'}>{failing ? failing + ' failing' : 'all healthy'}</Badge>}
        <button type="button" className="neu-btn" style={{ marginLeft: 'auto' }} onClick={load} disabled={busy} aria-label="Refresh"><RefreshCw size={14} /></button>
      </div>
      <div style={{ fontSize: 12.5, opacity: 0.65, marginBottom: 12 }}>Read-only view of scheduled database jobs. Times are UTC. Refreshes every 30 seconds.</div>
      {err && <ErrorState message={err} onRetry={load} />}
      {!err && !data && <div className="neu-card"><SkRows rows={5} cols={3} /></div>}
      {data && !data.enabled && <EmptyState title="pg_cron is not enabled" hint="Enable the pg_cron extension in Supabase under Database, Extensions." />}
      {data && data.enabled && jobs.length === 0 && <EmptyState title="No scheduled jobs" />}
      {jobs.map((j) => <Job key={j.jobid} j={j} open={open === j.jobid} runs={runs[j.jobid]} onToggle={() => toggle(j)} />)}
    </div>
  );
}
