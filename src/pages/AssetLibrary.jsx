import React, { useMemo, useState } from 'react';
import { card, muted, inp, sel, num, useLoad, Shell, Stat, Grid } from '../tw/pages.jsx';
import { useToast } from '../components/Toast.jsx';

const CLOUD = 'bvw3okdf';
const RX = new RegExp('https://res\\.cloudinary\\.com/' + CLOUD + '/[^\\s"\'<>)\\\\]+', 'g');
const TABLES = ['products', 'banners', 'stores', 'shops', 'reviews', 'orders', 'return_requests', 'xwallet_topups', 'creator_applications', 'profiles', 'bundles', 'xcards', 'report_tickets', 'xquote_receipts'];
const thumb = (u) => (u.includes('/image/upload/') ? u.replace('/image/upload/', '/image/upload/w_320,h_320,c_fill,f_auto,q_auto/') : u);
const isImg = (u) => /\/image\/upload\//.test(u) || /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(u);

async function scan(extra) {
  const found = {}; const report = [];
  for (const t of [...TABLES, ...extra]) {
    try {
      const rows = await sel(t);
      let n = 0;
      rows.forEach((r) => Object.entries(r).forEach(([k, v]) => {
        if (v == null || typeof v === 'number' || typeof v === 'boolean') return;
        const s = typeof v === 'string' ? v : JSON.stringify(v);
        (s.match(RX) || []).forEach((u) => {
          const it = (found[u] = found[u] || { url: u, uses: [] });
          const tag = t + '.' + k;
          if (!it.uses.includes(tag)) it.uses.push(tag);
          n++;
        });
      }));
      report.push({ t, ok: true, rows: rows.length, n });
    } catch (e) { report.push({ t, ok: false, err: e.message || String(e) }); }
  }
  return { items: Object.values(found), report };
}

export default function AssetLibrary() {
  const { show } = useToast();
  const [extra, setExtra] = useState([]);
  const [draft, setDraft] = useState('');
  const { rows, err, loading, reload } = useLoad(() => scan(extra), [extra.join(',')]);
  const [q, setQ] = useState('');
  const [src, setSrc] = useState('all');
  const [only, setOnly] = useState('all');
  const [limit, setLimit] = useState(60);
  const [bad, setBad] = useState({});
  const items = rows?.items || [];
  const report = rows?.report || [];
  const sources = useMemo(() => [...new Set(items.flatMap((i) => i.uses.map((u) => u.split('.')[0])))].sort(), [items]);
  const list = items.filter((i) => (src === 'all' || i.uses.some((u) => u.startsWith(src + '.'))) && (!q.trim() || (i.url + ' ' + i.uses.join(' ')).toLowerCase().includes(q.trim().toLowerCase())) && (only === 'all' || (only === 'broken' ? bad[i.url] : !bad[i.url])));
  const copy = async (u) => { try { await navigator.clipboard.writeText(u); show?.('URL copied', 'success'); } catch (e) { show?.('Copy blocked by the browser', 'error'); } };
  const failed = report.filter((r) => !r.ok);
  return (
    <Shell title="Asset library" sub={'Cloudinary images (' + CLOUD + ') referenced by your database tables.'} onRefresh={reload} loading={loading} err={err}>
      <div style={{ ...card, fontSize: 13 }}>
        Images are found by scanning table rows for Cloudinary URLs. Files in Cloudinary that no row uses will not appear, and deleting is not possible here because uploads use an unsigned preset.
      </div>
      <Grid>
        <Stat label="Unique images" value={items.length} />
        <Stat label="Tables scanned" value={report.filter((r) => r.ok).length} sub={failed.length ? failed.length + ' skipped' : ''} />
        <Stat label="Broken (seen)" value={Object.keys(bad).length} sub="found while scrolling" />
      </Grid>
      {report.some((r) => r.ok && r.rows >= 5000) && <div style={{ ...card, color: '#DC2626', fontSize: 13 }}>A table hit the 5000 row cap. Some images may be missing.</div>}
      <div style={{ ...card, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 13 }}>
        <input style={{ ...inp, flex: 1, minWidth: 160 }} placeholder="Search URL or source" value={q} onChange={(e) => { setQ(e.target.value); setLimit(60); }} />
        <select style={inp} value={src} onChange={(e) => { setSrc(e.target.value); setLimit(60); }}><option value="all">All sources</option>{sources.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <select style={inp} value={only} onChange={(e) => setOnly(e.target.value)}><option value="all">All</option><option value="broken">Broken only</option><option value="ok">Not broken</option></select>
      </div>
      <div style={{ ...card, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 13 }}>
        <span>Scan another table:</span>
        <input style={inp} placeholder="exact table name" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button className="neu-btn" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => { const t = draft.trim(); if (t && !extra.includes(t) && !TABLES.includes(t)) setExtra([...extra, t]); setDraft(''); }}>Add</button>
        {failed.length > 0 && <span style={muted}>Skipped (missing or not readable): {failed.map((f) => f.t).join(', ')}</span>}
      </div>
      {list.length === 0 && !loading && <div style={{ ...card, opacity: .7 }}>No images match.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
        {list.slice(0, limit).map((i) => (
          <div key={i.url} style={{ ...card, marginBottom: 0, padding: 8 }}>
            <a href={i.url} target="_blank" rel="noreferrer" style={{ display: 'block', aspectRatio: '1', background: 'rgba(0,0,0,.05)', borderRadius: 8, overflow: 'hidden' }}>
              {isImg(i.url) && !bad[i.url] ? <img src={thumb(i.url)} alt="" loading="lazy" onError={() => setBad((b) => ({ ...b, [i.url]: true }))} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ padding: 8, fontSize: 11, color: bad[i.url] ? '#DC2626' : '#8a93a3' }}>{bad[i.url] ? 'BROKEN LINK' : 'not an image'}</div>}
            </a>
            <div style={{ ...muted, fontSize: 11, marginTop: 6, wordBreak: 'break-word' }}>{i.uses.slice(0, 3).join(', ')}{i.uses.length > 3 ? ' +' + (i.uses.length - 3) : ''}</div>
            <button className="neu-btn" onClick={() => copy(i.url)} style={{ padding: '4px 8px', fontSize: 11, marginTop: 6, width: '100%' }}>Copy URL</button>
          </div>
        ))}
      </div>
      {list.length > limit && <div style={{ textAlign: 'center', marginTop: 12 }}><button className="neu-btn" onClick={() => setLimit(limit + 60)} style={{ padding: '8px 16px' }}>Load more ({list.length - limit} left)</button></div>}
    </Shell>
  );
}
