import { useAdminContext } from "../context/AdminContext";
import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Edit3, Check, Search } from 'lucide-react';
import { getDb } from '../supabase.js';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import { useToast } from '../components/Toast.jsx';

const PIN = import.meta.env.VITE_XADMIN_PIN;
const actor = () => sessionStorage.getItem('xadmin_actor') || 'admin';
async function rpc(fn, args = {}) {
  const { data, error } = await supabase.rpc(fn, { p_pin: PIN, ...args });
  if (error) throw error;
  if (data && data.ok === false) throw new Error(data.error || 'Failed');
  return data;
}
const PR = { high: '#EF4444', normal: '#2563EB', low: '#6B7280' };
const lbl = { fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 5 };
const tabBtn = (on) => ({ padding: '9px 16px', borderRadius: 10, fontWeight: 800, fontSize: 13,
  background: on ? 'var(--primary)' : 'var(--surface)', color: on ? '#fff' : 'var(--text)', border: '1px solid var(--border)' });

function Tasks() {
  const { show } = useToast();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null);
  const [hist, setHist] = useState(null);
  const [day, setDay] = useState(null);

  const load = useCallback(async () => {
    try { setErr(''); setData(await rpc('xt_today')); } catch (e) { setErr(e.message || 'Load failed'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (it) => {
    if (busy) return;
    const next = !it.is_completed;
    setBusy(true);
    setData((d) => ({ ...d, items: d.items.map((x) => x.task_id === it.task_id ? { ...x, is_completed: next } : x) }));
    try { await rpc('xt_task_toggle', { p_task: it.task_id, p_done: next }); }
    catch (e) { show(e.message, 'error'); await load(); }
    setBusy(false);
  };
  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await rpc('xt_task_save', { p_id: form.id || null, p_title: form.title, p_desc: form.description || '', p_priority: form.priority, p_actor: actor() });
      show('Saved', 'success'); setForm(null); await load();
    } catch (e) { show(e.message, 'error'); }
    setBusy(false);
  };
  const archive = async (it) => {
    if (!window.confirm('Remove "' + it.title + '" from future checklists? Past history is kept.')) return;
    try { await rpc('xt_task_archive', { p_id: it.task_id }); show('Removed', 'success'); await load(); }
    catch (e) { show(e.message, 'error'); }
  };
  const openHistory = async () => {
    try { setHist(await rpc('xt_history', { p_days: 60 })); } catch (e) { show(e.message, 'error'); }
  };
  const openDay = async (d) => {
    try { setDay({ date: d, items: await rpc('xt_history_day', { p_date: d }) }); } catch (e) { show(e.message, 'error'); }
  };

  if (err) return <Card><div style={{ color: 'var(--danger)', marginBottom: 10 }}>{err}</div><Btn onClick={load}>Retry</Btn></Card>;
  if (!data) return <Card>Loading…</Card>;
  const items = data.items, done = items.filter((i) => i.is_completed).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  if (hist) return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <b>{day ? 'Checklist ' + day.date : 'Previous days'}</b>
        <Btn onClick={() => (day ? setDay(null) : setHist(null))}>Back</Btn>
      </div>
      {!day && !hist.length && <div className="muted">No history yet.</div>}
      {!day && hist.map((h) => (
        <div key={h.date} onClick={() => openDay(h.date)} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
          <span>{h.date}</span><b>{h.done}/{h.total} · {Math.round((h.done / h.total) * 100)}%</b>
        </div>
      ))}
      {day && day.items.map((i, k) => (
        <div key={k} style={{ padding: '8px 0', opacity: i.is_completed ? 0.7 : 1 }}>
          {i.is_completed ? '✅' : '⬜'} {i.title}
        </div>
      ))}
    </Card>
  );

  return (
    <>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Checklist day (resets 1:00 AM Manila)</div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>{data.date}</div>
          </div>
          <div style={{ fontWeight: 900 }}>{done} of {items.length} completed</div>
        </div>
        <div style={{ height: 8, background: 'var(--border)', borderRadius: 6, marginTop: 10, overflow: 'hidden' }}>
          <div style={{ width: pct + '%', height: '100%', background: 'var(--success)', transition: 'width .2s' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <Btn variant="primary" onClick={() => setForm({ title: '', description: '', priority: 'normal' })}><Plus size={14} /> Add task</Btn>
          <Btn onClick={openHistory}>History</Btn>
        </div>
      </Card>

      {form && (
        <Card style={{ marginBottom: 12 }}>
          <div style={lbl}>Task</div>
          <input className="neu-input" value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ marginBottom: 10 }} />
          <div style={lbl}>Description (optional)</div>
          <textarea className="neu-input" rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ marginBottom: 10 }} />
          <div style={lbl}>Priority</div>
          <select className="neu-input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={{ marginBottom: 12 }}>
            <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option>
          </select>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Btn>
            <Btn onClick={() => setForm(null)}>Cancel</Btn>
          </div>
        </Card>
      )}

      {!items.length && <Card><div className="muted">No tasks yet. Add your first daily task.</div></Card>}
      {items.map((it) => (
        <Card key={it.task_id} style={{ marginBottom: 8, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input type="checkbox" checked={!!it.is_completed} disabled={busy} onChange={() => toggle(it)} style={{ width: 24, height: 24, flexShrink: 0 }} aria-label={'Complete ' + it.title} />
            <div style={{ flex: 1, minWidth: 0, opacity: it.is_completed ? 0.55 : 1 }}>
              <div style={{ fontWeight: 800, textDecoration: it.is_completed ? 'line-through' : 'none' }}>
                {it.title} <span style={{ fontSize: 10, color: PR[it.priority], fontWeight: 800 }}>{it.priority.toUpperCase()}</span>
              </div>
              {it.description && <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{it.description}</div>}
            </div>
            <button onClick={() => setForm({ id: it.task_id, title: it.title, description: it.description, priority: it.priority })} aria-label="Edit"><Edit3 size={16} /></button>
            <button onClick={() => archive(it)} aria-label="Delete" style={{ color: '#DC2626' }}><Trash2 size={16} /></button>
          </div>
        </Card>
      ))}
    </>
  );
}

function Notes() {
  const { show } = useToast();
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [ed, setEd] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try { setErr(''); setRows(await rpc('xt_notes_list', { p_search: q || null, p_limit: 100 })); }
    catch (e) { setErr(e.message || 'Load failed'); }
  }, [q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await rpc('xt_note_save', { p_id: ed.id || null, p_title: ed.title, p_content: ed.content, p_actor: actor() });
      show('Note saved', 'success'); setEd(null); await load();
    } catch (e) { show(e.message, 'error'); }
    setBusy(false);
  };
  const del = async (n) => {
    if (!window.confirm('Delete this note permanently?')) return;
    try { await rpc('xt_note_delete', { p_id: n.id }); show('Deleted', 'success'); if (ed && ed.id === n.id) setEd(null); await load(); }
    catch (e) { show(e.message, 'error'); }
  };
  const cancel = () => { if (ed && (ed.title || ed.content) && !window.confirm('Discard unsaved changes?')) return; setEd(null); };

  if (ed) return (
    <Card>
      <div style={lbl}>Title</div>
      <input className="neu-input" value={ed.title} onChange={(e) => setEd({ ...ed, title: e.target.value })} style={{ marginBottom: 10 }} />
      <div style={lbl}>Note</div>
      <textarea className="neu-input" rows={12} value={ed.content} onChange={(e) => setEd({ ...ed, content: e.target.value })} style={{ marginBottom: 12, whiteSpace: 'pre-wrap' }} />
      {ed.updated_at && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10 }}>Created {new Date(ed.created_at).toLocaleString()} · Updated {new Date(ed.updated_at).toLocaleString()}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Btn>
        <Btn onClick={cancel}>Cancel</Btn>
        {ed.id && <Btn variant="danger" onClick={() => del(ed)}>Delete</Btn>}
      </div>
    </Card>
  );

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-dim)' }} />
          <input className="neu-input" placeholder="Search notes" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 34 }} />
        </div>
        <Btn variant="primary" onClick={() => setEd({ title: '', content: '' })}><Plus size={14} /> New</Btn>
      </div>
      {err && <Card><div style={{ color: 'var(--danger)', marginBottom: 8 }}>{err}</div><Btn onClick={load}>Retry</Btn></Card>}
      {!rows && !err && <Card>Loading…</Card>}
      {rows && !rows.length && <Card><div className="muted">No notes found.</div></Card>}
      {rows && rows.map((n) => (
        <Card key={n.id} style={{ marginBottom: 8, padding: 12 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setEd({ ...n })}>
              <div style={{ fontWeight: 800 }}>{n.title || '(untitled)'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(n.content || '').replace(/\s+/g, ' ')}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>Updated {new Date(n.updated_at).toLocaleString()}</div>
            </div>
            <button onClick={() => setEd({ ...n })} aria-label="Edit"><Edit3 size={16} /></button>
            <button onClick={() => del(n)} aria-label="Delete" style={{ color: '#DC2626' }}><Trash2 size={16} /></button>
          </div>
        </Card>
      ))}
    </>
  );
}

export default function DailyNotes() {
  const { activeSystem } = useAdminContext();
  const supabase = getDb(activeSystem);
  const [tab, setTab] = useState('tasks');
  return (
    <>
      <div className="page-head"><div><h1>Daily Tasks &amp; Notes</h1><p>Checklist resets daily at 1:00 AM Manila time</p></div></div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button style={tabBtn(tab === 'tasks')} onClick={() => setTab('tasks')}><Check size={13} /> Daily Tasks</button>
        <button style={tabBtn(tab === 'notes')} onClick={() => setTab('notes')}>Notes</button>
      </div>
      {tab === 'tasks' ? <Tasks /> : <Notes />}
    </>
  );
}
