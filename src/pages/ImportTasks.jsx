import React, { useState } from 'react';

const TEMPLATE = [
  { title: 'Post a product review video', description: 'Review an XMARKET product on video.', requirements: ['Video at least 30 seconds', 'Mention XMARKET', 'Public link'], notes: 'Payment after review.', reward: 20, deadline: '2026-12-31T23:59:00+08:00', active: true },
  { title: 'Share XMARKET on social media', description: 'Post about XMARKET.', requirements: 'Public post\nTag @xmarket', reward: 10 },
];
const box = { background: 'var(--bg, #e0e5ec)', borderRadius: 16, padding: 14, marginBottom: 12, boxShadow: '6px 6px 12px rgba(163,177,198,.5), -6px -6px 12px rgba(255,255,255,.7)' };

export default function ImportTasks({ call, onDone }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const parse = () => {
    let v;
    try { v = JSON.parse(text); } catch (e) { throw new Error('Invalid JSON: ' + e.message); }
    if (v && !Array.isArray(v) && Array.isArray(v.tasks)) v = v.tasks;
    if (!Array.isArray(v)) throw new Error('Expected an array of tasks, or {"tasks": [...]}');
    return v;
  };
  const onFile = (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => { setText(String(r.result || '')); setMsg(''); }; r.readAsText(f); e.target.value = '';
  };
  const run = async () => {
    setMsg(''); setOk(false);
    let items;
    try { items = parse(); } catch (e) { return setMsg(e.message); }
    if (!window.confirm(`Import ${items.length} task(s)? Titles that already exist are skipped.`)) return;
    setBusy(true);
    try {
      const r = await call('admin_creator_tasks_import', { p_items: items });
      setOk(true); setMsg(`Created ${r.created}, skipped ${r.skipped} duplicate(s).`); setText(''); onDone && onDone();
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  };

  return (
    <div style={box}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <b>Bulk import tasks (JSON)</b>
        <button className="neu-btn" type="button" onClick={() => setOpen(!open)} style={{ padding: '6px 12px', fontSize: 12 }}>{open ? 'Close' : 'Open'}</button>
      </div>
      {open && (
        <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder='[{"title":"...","reward":20}]' spellCheck={false}
            style={{ padding: 10, borderRadius: 10, minHeight: 180, fontFamily: 'monospace', fontSize: 12 }} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="neu-btn" type="button" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => { setText(JSON.stringify(TEMPLATE, null, 2)); setMsg(''); }}>Load template</button>
            <label className="neu-btn" style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}>Upload .json<input type="file" accept=".json,application/json" onChange={onFile} style={{ display: 'none' }} /></label>
            <button className="neu-btn" type="button" disabled={busy || !text.trim()} style={{ padding: '8px 14px', fontSize: 12, fontWeight: 800 }} onClick={run}>{busy ? 'Importing…' : 'Import'}</button>
          </div>
          <div style={{ fontSize: 11, color: '#8a93a3' }}>Fields: title (required), description, requirements (text or list), notes, reward, deadline (ISO date), active. Max 100.</div>
          {msg && <div style={{ fontSize: 13, fontWeight: 700, color: ok ? '#059669' : '#DC2626' }}>{msg}</div>}
        </div>
      )}
    </div>
  );
}
