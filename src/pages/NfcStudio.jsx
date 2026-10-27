import React, { useEffect, useRef, useState } from 'react';
import { useToast } from '../components/Toast.jsx';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import AnimatedNumber from '../components/AnimatedNumber.jsx';
import { Nfc, Link2, Type, Trash2, ArrowUp, ArrowDown, Copy, Save, CheckCircle2, AlertTriangle } from 'lucide-react';
import { newText, newUrl, validateRecord, estimateSize, removeAt, move, duplicate, sameMessage, parseTemplates } from '../lib/nfc/ndef.js';
import { checkSupport, readTag, writeTag, mapError } from '../lib/nfc/service.js';

const KEY = 'xadmin_nfc_templates';
const BUILTIN = [
  { name: 'XMARKET storefront', records: [{ type: 'url', url: 'https://xmarket-app.shop' }] },
  { name: 'Landing page', records: [{ type: 'url', url: 'https://xmarket-landing.onrender.com' }] },
  { name: 'Create account', records: [{ type: 'url', url: 'https://xmarket-app.onrender.com/signup' }] },
];
const lab = { fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 };

const fromTpl = (r) => (r.type === 'text' ? newText(r.text, r.lang || 'en') : newUrl(r.url));

function Stat({ icon: Icon, value, label }) {
  return (
    <div className="stat">
      {Icon && <div className="stat-icon" style={{ background: 'linear-gradient(135deg,#3B82F6,#7C3AED)' }}><Icon size={20} /></div>}
      <div><div className="stat-label">{label}</div><div className="stat-value"><AnimatedNumber value={value} /></div></div>
    </div>
  );
}

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
  const [saves, setSaves] = useState(0);
  const [reads, setReads] = useState(0);
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

  const doRead = () => run('read', async (s) => { const r = await readTag(s); setReadRes(r); setReads((n) => n + 1); });

  const doWrite = () => {
    if (!records.length || hasErr) return;
    if (size.over && !confirm('This message is probably larger than the tag (' + size.totalBytes + ' of ' + size.capacity + ' bytes, estimate). Try anyway?')) return;
    const note = warnings.length ? '\n\nWarning:\n' + warnings.join('\n') : '';
    if (!confirm('Writing replaces whatever is on the tag. Its current content is unknown unless you read it first. Continue?' + note)) return;
    const snap = records.map((r) => ({ ...r }));
    run('write', async (s) => {
      await writeTag(snap, s);
      setWritten(snap); setVerify(null);
      setSaves((n) => n + 1);
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

  const confirmReplace = () => !records.length || confirm('Replace the current editor content?');

  const loadRead = () => {
    const usable = readRes.records.filter((r) => r.type === 'text' || r.type === 'url');
    const lost = readRes.records.length - usable.length;
    if (!confirmReplace()) return;
    if (lost && !confirm(lost + ' record(s) of unsupported type will NOT be kept if you write this back. Continue?')) return;
    setRecords(usable.map(fromTpl));
  };

  const upd = (i, patch) => setRecords((l) => l.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const loadTpl = (t) => { if (!confirmReplace()) return; setRecords(t.records.map(fromTpl)); };
  const saveTpl = () => {
    if (!records.length || hasErr) return;
    const name = (prompt('Template name?') || '').trim();
    if (!name) return;
    const next = [...saved.filter((t) => t.name !== name), { name, records: records.map(({ id, ...r }) => r) }];
    setSaves((n) => n + 1);
    setSaved(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); show?.('Template saved on this device', 'success'); }
    catch { show?.('Could not save template', 'error'); }
  };
  const clearAll = () => { if (!records.length) return; if (!confirm('Clear all records?')) return; setRecords([]); };
  const copy = async (t) => { try { await navigator.clipboard.writeText(t); show?.('Copied', 'success'); } catch { show?.('Copy failed', 'error'); } };

  return (
    <>
      <div className="page-head">
        <div><h1>NFC Studio</h1><p>Read and write text and link records on NFC tags</p></div>
      </div>

      <div className="stat-grid">
        <Stat icon={Save} value={saves} label="Operations this session" />
        <Stat icon={Nfc} value={reads} label="Tags read" />
        <Stat icon={Type} value={records.length} label="Records in editor" />
        <Stat icon={Link2} value={[...BUILTIN, ...saved].length} label="Templates" />
      </div>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>Compatibility</div>
        <div style={{ fontSize: 13, lineHeight: 1.8 }}>
          Secure connection (HTTPS or localhost): <b>{support.secure ? 'Yes' : 'No'}</b><br />
          Web NFC in this browser: <b>{support.api ? 'Available' : 'Not available'}</b><br />
          Android detected: <b>{support.android ? 'Yes' : 'No'}</b>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
          Whether NFC is switched on can't be detected in advance; you'll find out when you start a read or write. Use Chrome on Android.
        </div>
      </Card>

      <div role="status" aria-live="polite" style={{ minHeight: 40, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, fontSize: 13.5, fontWeight: 700 }}>
        {busy && (
          <span className="xa-nfc-ring" aria-hidden="true"><i /><i /><i /></span>
        )}
        <span>{busy && !msg ? `Waiting for a tag (${mode})…` : msg}</span>
      </div>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Read a tag</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn variant="primary" disabled={!canStart || busy} onClick={doRead}>Read tag</Btn>
          {busy && <Btn onClick={() => ctl.current && ctl.current.abort()}>Cancel</Btn>}
        </div>
        {readRes && (readRes.records.length === 0 ? <div style={{ marginTop: 10, color: 'var(--text-dim)' }}>The tag has no NDEF records.</div> : (
          <div style={{ marginTop: 10 }}>
            {readRes.records.map((r, i) => (
              <div key={i} style={{ padding: '8px 0', borderTop: '1px solid var(--border)', wordBreak: 'break-word', fontSize: 13 }}>
                {r.type === 'text' && <><b>Text</b> ({r.lang || 'no language'}): {r.text} <button type="button" className="xa-icon-btn" onClick={() => copy(r.text)} aria-label="Copy text"><Copy size={14} /></button></>}
                {r.type === 'url' && <><b>Link</b>: {r.url} <button type="button" className="xa-icon-btn" onClick={() => copy(r.url)} aria-label="Copy link"><Copy size={14} /></button></>}
                {r.type === 'unsupported' && <><b>Unsupported</b>: {r.recordType}{r.mediaType ? ' (' + r.mediaType + ')' : ''}, {r.bytes} bytes</>}
              </div>
            ))}
            <Btn onClick={loadRead} style={{ marginTop: 8 }}>Load into editor</Btn>
          </div>
        ))}
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Compose</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <Btn onClick={() => setRecords((l) => [...l, newText()])}><Type size={14} /> Text</Btn>
          <Btn onClick={() => setRecords((l) => [...l, newUrl('https://')])}><Link2 size={14} /> Link</Btn>
          <Btn onClick={clearAll} disabled={!records.length}>Clear</Btn>
        </div>
        {records.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
            No records yet. Add one, load a template, or read a tag.
          </div>
        )}
        {records.map((r, i) => (
          <div key={r.id} style={{ padding: '12px 0', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 800, marginBottom: 6, fontSize: 13 }}>
              {i + 1}. {r.type === 'text' ? 'Text' : 'Link'}
            </div>
            {r.type === 'text' ? (
              <>
                <div style={lab}>Text</div>
                <textarea className="neu-input" rows={3} value={r.text} onChange={(e) => upd(i, { text: e.target.value })} />
                <div style={{ ...lab, marginTop: 8 }}>Language</div>
                <input className="neu-input" value={r.lang} onChange={(e) => upd(i, { lang: e.target.value })} />
                <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 4 }}>{r.text.length} characters</div>
              </>
            ) : (
              <>
                <div style={lab}>URL</div>
                <input className="neu-input" value={r.url} inputMode="url" onChange={(e) => upd(i, { url: e.target.value })} />
              </>
            )}
            {checks[i].errors.map((m) => <div key={m} style={{ color: 'var(--danger)', fontSize: 12.5, marginTop: 4 }}><AlertTriangle size={12} /> Error: {m}</div>)}
            {checks[i].warnings.map((m) => <div key={m} style={{ color: 'var(--warn, #92400E)', fontSize: 12.5, marginTop: 4 }}><AlertTriangle size={12} /> Warning: {m}</div>)}
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <button type="button" className="xa-icon-btn" aria-label="Move up" onClick={() => setRecords((l) => move(l, i, -1))}><ArrowUp size={14} /></button>
              <button type="button" className="xa-icon-btn" aria-label="Move down" onClick={() => setRecords((l) => move(l, i, 1))}><ArrowDown size={14} /></button>
              <Btn onClick={() => setRecords((l) => duplicate(l, i))}><Copy size={14} /> Duplicate</Btn>
              <Btn variant="danger" onClick={() => setRecords((l) => removeAt(l, i))}><Trash2 size={14} /> Delete</Btn>
            </div>
          </div>
        ))}
        {records.length > 0 && (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: 'var(--surface-2)', fontSize: 12, color: 'var(--text-dim)' }}>
            <b style={{ color: 'var(--text)' }}>Preview of what will be written:</b>{' '}
            {records.map((r) => (r.type === 'text' ? `Text: ${r.text}` : `URL: ${r.url}`)).join(' · ')}
          </div>
        )}
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Write</div>
        <div style={{ fontSize: 13, marginBottom: 8 }}>
          Estimated size: about <b>{size.totalBytes}</b> of <b>{size.capacity}</b> bytes (an estimate; the real size and the tag's real free space can differ).
        </div>
        {size.over && <div style={{ color: 'var(--danger)', fontSize: 12.5, marginBottom: 8 }}><AlertTriangle size={12} /> This probably will not fit on the tag.</div>}
        {!size.over && size.near && <div style={{ color: 'var(--warn, #92400E)', fontSize: 12.5, marginBottom: 8 }}><AlertTriangle size={12} /> Close to the limit.</div>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn variant="primary" disabled={!canStart || busy || !records.length || hasErr} onClick={doWrite}>Write tag</Btn>
          <Btn disabled={!canStart || busy || !written} onClick={doVerify}>Verify (read back)</Btn>
        </div>
        {verify === 'ok' && <div style={{ marginTop: 10, color: 'var(--success)', fontSize: 13, fontWeight: 700 }}><CheckCircle2 size={13} /> Verified: the tag matches.</div>}
        {verify === 'bad' && <div style={{ marginTop: 10, color: 'var(--danger)', fontSize: 13, fontWeight: 700 }}><AlertTriangle size={13} /> Mismatch: the tag does not match what was written.</div>}
      </Card>

      <Card>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Templates</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {[...BUILTIN, ...saved].map((t) => <Btn key={t.name} onClick={() => loadTpl(t)}>{t.name}</Btn>)}
        </div>
        <Btn variant="primary" disabled={!records.length || hasErr} onClick={saveTpl}><Save size={14} /> Save current as template</Btn>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
          Saved templates stay on this device and browser only.
        </div>
      </Card>
    </>
  );
}
