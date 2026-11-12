import React, { useMemo, useRef, useState } from 'react';
import { Film } from 'lucide-react';
import { adm } from './db.js';
import { Badge, ConfirmDialog, LoadingBtn, useXaToast } from './Kit.jsx';

const CHUNK = 100;
const MAX_ROWS = 2000;
const MAX_BYTES = 5 * 1024 * 1024;
const YT_RX = /^[A-Za-z0-9_-]{11}$/;
const URL_RX = /(?:[?&]v=|youtu\.be\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/;
const SAMPLE = [{ id: 'pinoy-example', youtubeId: 'dQw4w9WgXcQ', title: 'Sample Film', year: 2001, rating: 'NR', duration: '1h 45m', genres: ['Pinoy', 'Drama'], description: 'Short description', channel: 'Studio name' }];

function toRow(rec, orderNo, useOrder) {
  const issues = [];
  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return { row: null, issues: ['Not an object'] };
  let yid = String(rec.youtube_id || rec.youtubeId || '').trim();
  if (!YT_RX.test(yid)) {
    const m = URL_RX.exec(String(rec.url || rec.link || ''));
    if (m) yid = m[1];
  }
  if (!YT_RX.test(yid)) issues.push('Needs an 11 character YouTube id (youtubeId) or a YouTube link (url)');
  const title = String(rec.title || '').trim();
  if (!title) issues.push('Title is required');
  else if (title.length > 200) issues.push('Title is longer than 200 characters');
  const id = String(rec.id || '').trim() || 'yt-' + yid;
  if (id.length > 80) issues.push('Id is longer than 80 characters');
  const row = { id, youtube_id: yid, title, rating: String(rec.rating || 'NR').trim().slice(0, 10), active: !(rec.active === false || rec.active === 'false') };
  if (rec.year !== undefined && rec.year !== null && rec.year !== '') {
    const y = Number(rec.year);
    if (!Number.isInteger(y) || y < 1890 || y > 2100) issues.push('Year must be between 1890 and 2100');
    else row.year = y;
  }
  if (rec.duration) row.duration = String(rec.duration).trim().slice(0, 20);
  if (rec.description) {
    const t = String(rec.description).trim();
    if (t.length > 2000) issues.push('Description is longer than 2000 characters');
    else row.description = t;
  }
  if (rec.channel) row.channel = String(rec.channel).trim().slice(0, 80);
  let g = rec.genres;
  if (typeof g === 'string') g = g.split(',');
  if (Array.isArray(g)) {
    const list = g.map((x) => String(x).trim()).filter(Boolean);
    if (list.length > 8) issues.push('More than 8 genres');
    else row.genres = list.map((x) => x.slice(0, 40));
  }
  if (rec.sort !== undefined && rec.sort !== null && rec.sort !== '') {
    const s = Number(rec.sort);
    if (!Number.isInteger(s)) issues.push('Sort must be a whole number');
    else row.sort = s;
  } else if (useOrder) {
    row.sort = orderNo;
  }
  return { row, issues };
}

function parseText(text, useOrder) {
  const t = String(text || '').replace(/^\uFEFF/, '').trim();
  if (!t) return null;
  let data;
  try { data = JSON.parse(t); } catch (e) { return { error: 'That is not valid JSON: ' + e.message }; }
  let list = Array.isArray(data) ? data : null;
  if (!list && data && typeof data === 'object') {
    const k = ['titles', 'movies', 'films', 'rows', 'items', 'data'].find((x) => Array.isArray(data[x]));
    list = k ? data[k] : null;
  }
  if (!list) return { error: 'Expected a list of films, or an object with a "titles" list.' };
  if (!list.length) return { error: 'The file has no films.' };
  if (list.length > MAX_ROWS) return { error: 'Too many films (' + list.length + '). Import up to ' + MAX_ROWS + ' at a time.' };
  const rows = [];
  const problems = [];
  const seen = new Set();
  list.forEach((rec, i) => {
    const { row, issues } = toRow(rec, i + 1, useOrder);
    if (row && seen.has(row.id)) issues.push('Duplicate id in this file: ' + row.id);
    if (row) seen.add(row.id);
    if (issues.length) problems.push({ row: i + 1, error: issues.join('. ') });
    if (row) rows.push(row);
  });
  return { rows, problems, total: list.length };
}

export default function YtImport() {
  const { push } = useXaToast();
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [useOrder, setUseOrder] = useState(true);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState('');
  const [prog, setProg] = useState(null);
  const [ask, setAsk] = useState(false);
  const [done, setDone] = useState(null);
  const fileRef = useRef(null);

  const parsed = useMemo(() => parseText(text, useOrder), [text, useOrder]);
  const blocked = !parsed || !!parsed.error || parsed.problems.length > 0;
  const validated = !!res && res.dry && res.bad === 0;

  const pickFile = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > MAX_BYTES) { push('That file is bigger than 5 MB.', 'error'); return; }
    const fr = new FileReader();
    fr.onload = () => { setText(String(fr.result || '')); setName(f.name); setRes(null); setDone(null); };
    fr.onerror = () => push('Could not read that file.', 'error');
    fr.readAsText(f);
  };

  const template = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(SAMPLE, null, 2)], { type: 'application/json' }));
    a.download = 'yt-titles-template.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const run = async (dry) => {
    if (blocked || busy) return;
    setBusy(dry ? 'check' : 'import');
    setDone(null);
    const tot = { ok: 0, bad: 0, inserted: 0, updated: 0, errors: [], dry };
    try {
      const n = Math.ceil(parsed.rows.length / CHUNK);
      for (let c = 0; c < n; c += 1) {
        setProg({ i: c + 1, n });
        const r = await adm('adm_yt_import', { p_rows: parsed.rows.slice(c * CHUNK, (c + 1) * CHUNK), p_dry: dry });
        tot.ok += Number(r.ok || 0);
        tot.bad += Number(r.bad || 0);
        tot.inserted += Number(r.inserted || 0);
        tot.updated += Number(r.updated || 0);
        (r.errors || []).forEach((er) => tot.errors.push({ row: c * CHUNK + Number(er.row), error: er.error }));
        if (r.bad > 0) break;
      }
      if (dry) {
        setRes(tot);
      } else if (tot.bad > 0) {
        setRes(tot);
        push('Some films failed. Fix them and try again.', 'error', 6000);
      } else {
        setDone(tot);
        setRes(null);
        setText('');
        setName('');
        push('Imported ' + tot.ok + ' title' + (tot.ok === 1 ? '' : 's'), 'success');
      }
    } catch (e) {
      push(e.message, 'error', 7000);
    }
    setBusy('');
    setProg(null);
    setAsk(false);
  };

  return (
    <div style={{ padding: 4 }}>
      <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}><Film size={22} /> YT Import</h2>
      <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 14 }}>Import films from a JSON file into the YT PREMIUM catalogue. Titles with the same id are updated.</div>

      <div className="neu-card" style={{ padding: 14, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <button type="button" className="neu-btn" onClick={() => fileRef.current && fileRef.current.click()}>Choose JSON file</button>
          <button type="button" className="neu-btn" onClick={template}>Download template</button>
          {name && <Badge>{name}</Badge>}
          <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={pickFile} />
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
          <input type="checkbox" checked={useOrder} onChange={(e) => { setUseOrder(e.target.checked); setRes(null); }} />
          Keep the order of the file (sets sort when a film has none)
        </label>
        <textarea className="xa-input" rows={6} spellCheck={false} placeholder="Or paste JSON here" value={text}
          style={{ fontFamily: 'ui-monospace,monospace', fontSize: 12 }}
          onChange={(e) => { setText(e.target.value); setRes(null); setDone(null); }} />
      </div>

      {parsed && parsed.error && <div style={{ color: 'var(--danger)', fontSize: 13.5, fontWeight: 700, marginBottom: 12 }}>{parsed.error}</div>}

      {parsed && !parsed.error && (
        <div className="neu-card" style={{ padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 8 }}>{parsed.total} film{parsed.total === 1 ? '' : 's'} read{parsed.problems.length ? ', ' + parsed.problems.length + ' with problems' : ''}</div>
          {parsed.problems.slice(0, 15).map((p) => (
            <div key={p.row} style={{ color: 'var(--danger)', fontSize: 12.5, marginBottom: 3 }}>Row {p.row}: {p.error}</div>
          ))}
          {parsed.problems.length > 15 && <div style={{ fontSize: 12, opacity: 0.7 }}>and {parsed.problems.length - 15} more</div>}
          {!parsed.problems.length && parsed.rows.slice(0, 8).map((r) => (
            <div key={r.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 0', borderTop: '1px solid var(--border)' }}>
              <img src={'https://img.youtube.com/vi/' + r.youtube_id + '/mqdefault.jpg'} alt="" loading="lazy" style={{ width: 64, height: 36, objectFit: 'cover', borderRadius: 6, background: 'var(--surface-2)', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                <div style={{ fontSize: 11.5, opacity: 0.65 }}>{[r.year, r.channel, (r.genres || []).join(', ')].filter(Boolean).join(' / ')}</div>
              </div>
            </div>
          ))}
          {!parsed.problems.length && parsed.rows.length > 8 && <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}>and {parsed.rows.length - 8} more</div>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <LoadingBtn loading={busy === 'check'} disabled={blocked || !!busy} onClick={() => run(true)}>Validate</LoadingBtn>
        <LoadingBtn variant="primary" loading={busy === 'import'} disabled={blocked || !validated || !!busy} onClick={() => setAsk(true)}>Import {parsed && parsed.rows ? parsed.rows.length : ''}</LoadingBtn>
        {prog && <span style={{ fontSize: 12.5, opacity: 0.7 }}>Batch {prog.i} of {prog.n}</span>}
      </div>

      {res && (
        <div className="neu-card" style={{ padding: 14, marginBottom: 12 }}>
          {res.bad === 0 && res.dry && <div style={{ color: 'var(--success)', fontWeight: 800, fontSize: 13.5 }}>Validation passed: {res.inserted} new, {res.updated} to update. Nothing was saved yet.</div>}
          {res.bad > 0 && <div style={{ color: 'var(--danger)', fontWeight: 800, fontSize: 13.5, marginBottom: 6 }}>{res.bad} film{res.bad === 1 ? '' : 's'} failed. Nothing was saved in that batch.</div>}
          {res.errors.slice(0, 15).map((er, i) => <div key={i} style={{ color: 'var(--danger)', fontSize: 12.5, marginTop: 2 }}>Row {er.row}: {er.error}</div>)}
        </div>
      )}

      {done && (
        <div className="neu-card" style={{ padding: 14 }}>
          <div style={{ color: 'var(--success)', fontWeight: 800, fontSize: 14 }}>Done: {done.inserted} added, {done.updated} updated.</div>
          <div style={{ fontSize: 12.5, opacity: 0.7, marginTop: 4 }}>The apps cache the catalogue for up to 5 minutes, so changes can take a few minutes to appear.</div>
        </div>
      )}

      <ConfirmDialog open={ask} busy={busy === 'import'} title={'Import ' + (parsed && parsed.rows ? parsed.rows.length : 0) + ' titles?'}
        message="New titles are added and titles with the same id are overwritten. Every import is recorded in the audit log."
        confirmText="Import now" onConfirm={() => run(false)} onCancel={() => setAsk(false)} />
    </div>
  );
}
