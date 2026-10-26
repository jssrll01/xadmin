import React, { useEffect, useRef, useState } from 'react';
import { useToast } from '../components/Toast.jsx';
import { newText, newUrl, validateRecord, estimateSize, removeAt, move, duplicate, sameMessage, parseTemplates } from '../lib/nfc/ndef.js';
import { checkSupport, readTag, writeTag, mapError } from '../lib/nfc/service.js';

const KEY = 'xadmin_nfc_templates';
const BUILTIN = [
  { name: 'XMARKET storefront', records: [{ type: 'url', url: 'https://xmarket-app.shop' }] },
  { name: 'Landing page', records: [{ type: 'url', url: 'https://xmarket-landing.onrender.com' }] },
  { name: 'Create account', records: [{ type: 'url', url: 'https://xmarket-app.onrender.com/signup' }] },
];
const box = { border: '1px solid rgba(0,0,0,.12)', borderRadius: 16, padding: 16, marginBottom: 14 };
const btn = { minHeight: 44, padding: '0 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,.18)', background: 'transparent', color: 'inherit', fontWeight: 700, cursor: 'pointer' };
const primary = { ...btn, background: '#2563eb', color: '#fff', border: 0 };
const field = { width: '100%', minHeight: 44, padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,.25)', font: 'inherit', boxSizing: 'border-box', background: 'transparent', color: 'inherit' };
const err = { color: '#b91c1c', fontSize: 13, marginTop: 4 };
const warn = { color: '#92400e', fontSize: 13, marginTop: 4 };

const fromTpl = (r) => (r.type === 'text' ? newText(r.text, r.lang || 'en') : newUrl(r.url));

export default function NfcStudio() {
  const { show } = useToast();
  const support = useRef(checkSupport()).current;
  const ctl = useRef(null);
  const [records, setRecords] = useState([]);
  const [mode, setMode] = useState('idle');
  const [msg, setMsg] = useState('');
  const [readRes, setReadRes] = useState(null);
  const [written, setWritten] = useState(null);
  const [verify, setVerify] = useState(null);
  const [saved, setSaved] = useState(() => { try { return parseTemplates(localStorage.getItem(KEY)); } catch { return []; } });

  useEffect(() => () => ctl.current && ctl.current.abort(), []);

  const busy = mode !== 'idle';
  const checks = records.map(validateRecord);
  const hasErr = checks.some((c) => c.errors.length);
  const warnings = checks.flatMap((c) => c.warnings);
  const size = estimateSize(records);
  const canStart = support.secure && support.api;

  const run = async (kind, fn) => {
    if (busy) return;
    ctl.current = new AbortController();
    setMode(kind);
    setMsg('Hold the tag against the back of your phone…');
    try { await fn(ctl.current.signal); setMsg(''); }
    catch (e) {
      const m = mapError(e);
      setMsg(m.message);
      if (m.code !== 'cancelled') show?.(m.message, 'error');
    } finally { setMode('idle'); ctl.current = null; }
  };

  const doRead = () => run('read', async (s) => { setReadRes(await readTag(s)); });

  const doWrite = () => {
    if (!records.length || hasErr) return;
    if (size.over && !confirm('This message is probably larger than the tag (' + size.totalBytes + ' of ' + size.capacity + ' bytes, estimate). Try anyway?')) return;
    const note = warnings.length ? '\n\nWarning:\n' + warnings.join('\n') : '';
    if (!confirm('Writing replaces whatever is on the tag. Its current content is unknown unless you read it first. Continue?' + note)) return;
    const snap = records.map((r) => ({ ...r }));
    run('write', async (s) => {
      await writeTag(snap, s);
      setWritten(snap); setVerify(null);
      show?.('Write reported success. Use Verify to read it back.', 'success');
    });
  };

  const doVerify = () => run('verify', async (s) => {
    const r = await readTag(s);
    setReadRes(r);
    const ok = sameMessage(written, r.records);
    setVerify(ok ? 'ok' : 'bad');
    show?.(ok ? 'Verified: tag matches what was written.' : 'Mismatch: tag differs from what was written.', ok ? 'success' : 'error');
  });

  const loadRead = () => {
    const usable = readRes.records.filter((r) => r.type === 'text' || r.type === 'url');
    const lost = readRes.records.length - usable.length;
    if (records.length && !confirm('Replace the current editor content?')) return;
    if (lost && !confirm(lost + ' record(s) of unsupported type will NOT be kept if you write this back. Continue?')) return;
    setRecords(usable.map(fromTpl));
  };

  const upd = (i, patch) => setRecords((l) => l.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const loadTpl = (t) => {
    if (records.length && !confirm('Replace the current editor content?')) return;
    setRecords(t.records.map(fromTpl));
  };
  const saveTpl = () => {
    if (!records.length || hasErr) return;
    const name = (prompt('Template name?') || '').trim();
    if (!name) return;
    const next = [...saved.filter((t) => t.name !== name), { name, records: records.map(({ id, ...r }) => r) }];
    setSaved(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); show?.('Template saved on this device', 'success'); }
    catch { show?.('Could not save template', 'error'); }
  };
  const copy = async (t) => { try { await navigator.clipboard.writeText(t); show?.('Copied', 'success'); } catch { show?.('Copy failed', 'error'); } };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 4px' }}>NFC Studio</h2>
      <p style={{ marginTop: 0, color: 'var(--text-dim)' }}>Read and write text and link records on NFC tags.</p>

      <section style={box} aria-label="Compatibility">
        <b>Compatibility</b>
        <div>Secure connection (HTTPS or localhost): {support.secure ? 'Yes' : 'No'}</div>
        <div>Web NFC in this browser: {support.api ? 'Available' : 'Not available'}</div>
        <div>Android detected: {support.android ? 'Yes' : 'No'}</div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 6 }}>
          Whether NFC is switched on can't be detected in advance; you'll find out when you start a read or write. Use Chrome on Android.
        </div>
      </section>

      <div role="status" aria-live="polite" style={{ minHeight: 24, marginBottom: 8, fontWeight: 700 }}>
        {busy && <>Waiting for a tag ({mode}). </>}{msg}
      </div>

      <section style={box} aria-label="Read">
        <b>Read a tag</b>
        <div style={{ margin: '8px 0' }}>
          <button style={primary} disabled={!canStart || busy} onClick={doRead}>Read tag</button>{' '}
          {busy && <button style={btn} onClick={() => ctl.current && ctl.current.abort()}>Cancel</button>}
        </div>
        {readRes && (readRes.records.length === 0 ? <div>The tag has no NDEF records.</div> : (
          <>
            {readRes.records.map((r, i) => (
              <div key={i} style={{ padding: '6px 0', borderTop: '1px solid rgba(0,0,0,.08)', wordBreak: 'break-word' }}>
                {r.type === 'text' && <>Text ({r.lang || 'no language'}): {r.text} <button style={btn} onClick={() => copy(r.text)}>Copy</button></>}
                {r.type === 'url' && <>Link: {r.url} <button style={btn} onClick={() => copy(r.url)}>Copy</button></>}
                {r.type === 'unsupported' && <>Unsupported record: {r.recordType}{r.mediaType ? ' (' + r.mediaType + ')' : ''}, {r.bytes} bytes</>}
              </div>
            ))}
            <button style={btn} onClick={loadRead}>Load into editor</button>
          </>
        ))}
      </section>

      <section style={box} aria-label="Editor">
        <b>Compose</b>
        <div style={{ margin: '8px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={btn} onClick={() => setRecords((l) => [...l, newText()])}>+ Text</button>
          <button style={btn} onClick={() => setRecords((l) => [...l, newUrl('https://')])}>+ Link</button>
          <button style={btn} disabled={!records.length} onClick={() => { if (confirm('Clear all records?')) setRecords([]); }}>Clear</button>
        </div>
        {records.length === 0 && <div style={{ color: 'var(--text-dim)' }}>No records yet. Add one, load a template, or read a tag.</div>}
        {records.map((r, i) => (
          <div key={r.id} style={{ padding: '10px 0', borderTop: '1px solid rgba(0,0,0,.08)' }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{i + 1}. {r.type === 'text' ? 'Text' : 'Link'}</div>
            {r.type === 'text' ? (
              <>
                <label>Text<textarea style={{ ...field, minHeight: 80 }} value={r.text} onChange={(e) => upd(i, { text: e.target.value })} /></label>
                <label>Language<input style={field} value={r.lang} onChange={(e) => upd(i, { lang: e.target.value })} /></label>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{r.text.length} characters</div>
              </>
            ) : (
              <label>URL<input style={field} value={r.url} inputMode="url" onChange={(e) => upd(i, { url: e.target.value })} /></label>
            )}
            {checks[i].errors.map((m) => <div key={m} style={err}>Error: {m}</div>)}
            {checks[i].warnings.map((m) => <div key={m} style={warn}>Warning: {m}</div>)}
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <button style={btn} aria-label="Move up" onClick={() => setRecords((l) => move(l, i, -1))}>↑</button>
              <button style={btn} aria-label="Move down" onClick={() => setRecords((l) => move(l, i, 1))}>↓</button>
              <button style={btn} onClick={() => setRecords((l) => duplicate(l, i))}>Duplicate</button>
              <button style={btn} onClick={() => setRecords((l) => removeAt(l, i))}>Delete</button>
            </div>
          </div>
        ))}
      </section>

      <section style={box} aria-label="Write">
        <b>Write</b>
        <div style={{ margin: '6px 0' }}>
          Estimated size: about {size.totalBytes} of {size.capacity} bytes (an estimate; the real size and the tag's real free space can differ).
          {size.over && <div style={err}>Warning: this probably will not fit on the tag.</div>}
          {!size.over && size.near && <div style={warn}>Warning: close to the limit.</div>}
        </div>
        <button style={primary} disabled={!canStart || busy || !records.length || hasErr} onClick={doWrite}>Write tag</button>{' '}
        <button style={btn} disabled={!canStart || busy || !written} onClick={doVerify}>Verify (read back)</button>
        {verify === 'ok' && <div style={{ marginTop: 6 }}>Result: verified, the tag matches.</div>}
        {verify === 'bad' && <div style={err}>Result: mismatch, the tag does not match what was written.</div>}
      </section>

      <section style={box} aria-label="Templates">
        <b>Templates</b>
        <div style={{ margin: '8px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[...BUILTIN, ...saved].map((t) => <button key={t.name} style={btn} onClick={() => loadTpl(t)}>{t.name}</button>)}
        </div>
        <button style={btn} disabled={!records.length || hasErr} onClick={saveTpl}>Save current as template</button>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>Saved templates stay on this device and browser only.</div>
      </section>
    </div>
  );
}
