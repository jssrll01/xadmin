import React, { useEffect, useMemo, useState } from 'react';
import { Search, Filter, X, ChevronDown, ChevronUp, Edit3, Trash2, Save, Mail, Phone, Link2, User, FileWarning } from 'lucide-react';
import { fetchReports, reportCrud } from '../lib/api.js';

const STATUSES = ['submitted', 'in_progress', 'resolved', 'closed'];
const color = (s) => {
  const v = (s || 'submitted').toLowerCase();
  return v === 'resolved' ? '#10B981' : v === 'closed' ? '#EF4444' : v === 'in_progress' ? '#3B82F6' : '#F59E0B';
};
const lbl = { fontSize: 11, fontWeight: 800 };
const row2 = { display: 'inline-flex', alignItems: 'center', gap: 4 };

export default function Reports() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [user, setUser] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showF, setShowF] = useState(false);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetchReports();
    const data = Array.isArray(res) ? res : (res && res.data) || [];
    setRows(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const ut = user.trim().toLowerCase();
    const f = from ? new Date(from + 'T00:00:00').getTime() : null;
    const t = to ? new Date(to + 'T23:59:59').getTime() : null;
    return rows.filter((r) => {
      if (status !== 'all' && (r.status || 'submitted').toLowerCase() !== status) return false;
      if (ut && ![r.user_id, r.gmail, r.phone].filter(Boolean).join(' ').toLowerCase().includes(ut)) return false;
      if (f || t) {
        const c = new Date(r.created_at).getTime();
        if (f && c < f) return false;
        if (t && c > t) return false;
      }
      if (term && ![r.concern, r.category, r.gmail, r.phone, r.related_id, r.admin_note, r.id, r.user_id]
        .filter(Boolean).join(' ').toLowerCase().includes(term)) return false;
      return true;
    });
  }, [rows, q, status, user, from, to]);

  const activeCount = (status !== 'all') + !!user + !!from + !!to;
  const clear = () => { setStatus('all'); setUser(''); setFrom(''); setTo(''); };

  const startEdit = (r) => { setEditing(r.id); setDraft({ status: r.status || 'submitted', admin_note: r.admin_note || '' }); };
  const save = async () => {
    setBusy(true);
    try {
      const res = await reportCrud.update(editing, { ...draft, updated_at: new Date().toISOString() });
      if (res && res.error) throw res.error;
      setEditing(null); setDraft({}); await load();
    } catch (e) { alert(e.message || 'Save failed'); }
    setBusy(false);
  };
  const remove = async (id) => {
    if (!confirm('Delete this report? This cannot be undone.')) return;
    try {
      const res = await reportCrud.remove(id);
      if (res && res.error) throw res.error;
      await load();
    } catch (e) { alert(e.message || 'Delete failed'); }
  };

  return (
    <div className="page-enter" style={{ padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Reports</h2>
      <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>User reports &amp; tickets · search &amp; filter</p>

      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: 15, color: '#97A0B5' }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} className="neu-input"
          placeholder="Search concern, category, gmail, phone, related ID…"
          style={{ paddingLeft: 40, paddingRight: q ? 40 : 14 }} />
        {q && (
          <button onClick={() => setQ('')} className="neu-btn"
            style={{ position: 'absolute', right: 8, top: 8, padding: 6, borderRadius: 8 }}><X size={14} /></button>
        )}
      </div>

      <button onClick={() => setShowF((s) => !s)} className="neu-btn"
        style={{ width: '100%', padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={16} style={{ color: '#6366F1' }} /> Advanced filter
          {activeCount > 0 && <span className="neu-badge" style={{ background: '#6366F1', color: 'white' }}>{activeCount}</span>}
        </span>
        {showF ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {showF && (
        <div className="neu-card" style={{ padding: 16, marginTop: 12 }}>
          <label className="muted" style={lbl}>STATUS</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="neu-input" style={{ marginTop: 6, marginBottom: 12 }}>
            {['all', ...STATUSES].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <label className="muted" style={lbl}>USER (id / gmail / phone)</label>
          <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="search by user"
            className="neu-input" style={{ marginTop: 6, marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label className="muted" style={lbl}>FROM</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="neu-input" style={{ marginTop: 6 }} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="muted" style={lbl}>TO</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="neu-input" style={{ marginTop: 6 }} />
            </div>
          </div>
          <button onClick={clear} className="neu-btn"
            style={{ width: '100%', padding: 11, marginTop: 14, fontSize: 12.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <X size={14} /> Clear filters
          </button>
        </div>
      )}

      <div className="muted" style={{ fontSize: 12, fontWeight: 800, margin: '16px 0 10px' }}>
        {loading ? 'LOADING…' : `${filtered.length} RESULT${filtered.length === 1 ? '' : 'S'}`}
      </div>

      {!loading && !filtered.length && (
        <div className="neu-card" style={{ padding: 30, textAlign: 'center' }}>
          <FileWarning size={30} style={{ color: '#97A0B5', marginBottom: 8 }} />
          <div className="muted" style={{ fontSize: 13 }}>No matching tickets</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map((r) => {
          const isEd = editing === r.id;
          const sc = color(r.status);
          return (
            <div key={r.id} className="neu-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="neu-badge" style={{ background: '#EEF1F6', color: '#6366F1', textTransform: 'uppercase' }}>{r.category || 'report'}</span>
                    <span className="muted" style={{ fontSize: 11, fontWeight: 700 }}>#{(r.id || '').slice(0, 8)}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 11 }}>
                    {new Date(r.created_at).toLocaleString()}
                    {r.updated_at && r.updated_at !== r.created_at ? <> · edited {new Date(r.updated_at).toLocaleString()}</> : null}
                  </div>
                </div>
                <span className="neu-badge" style={{ background: sc + '22', color: sc, height: 'fit-content', whiteSpace: 'nowrap' }}>
                  {(r.status || 'submitted').replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="neu-card-inset" style={{ padding: 12, marginBottom: 12 }}>
                <div className="muted" style={{ fontSize: 10, fontWeight: 800, marginBottom: 4 }}>CONCERN</div>
                <div style={{ fontSize: 13.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5 }}>{r.concern || '—'}</div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', fontSize: 11.5, color: '#7A8499', marginBottom: 12 }}>
                {r.gmail && <span style={row2}><Mail size={12} /> {r.gmail}</span>}
                {r.phone && <span style={row2}><Phone size={12} /> {r.phone}</span>}
                {r.user_id && <span style={row2}><User size={12} /> {String(r.user_id).slice(0, 12)}…</span>}
                {r.related_id && <span style={row2}><Link2 size={12} /> {r.related_id}</span>}
              </div>

              {r.admin_note && !isEd && (
                <div className="neu-card-inset" style={{ padding: 10, marginBottom: 12 }}>
                  <div className="muted" style={{ fontSize: 10, fontWeight: 800, marginBottom: 3 }}>ADMIN NOTE</div>
                  <div style={{ fontSize: 12.5, whiteSpace: 'pre-wrap' }}>{r.admin_note}</div>
                </div>
              )}

              {isEd ? (
                <>
                  <label className="muted" style={lbl}>STATUS</label>
                  <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                    className="neu-input" style={{ marginTop: 6, marginBottom: 12 }}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                  <label className="muted" style={lbl}>ADMIN NOTE</label>
                  <textarea rows={3} value={draft.admin_note} onChange={(e) => setDraft({ ...draft, admin_note: e.target.value })}
                    className="neu-input" style={{ marginTop: 6, marginBottom: 12, resize: 'vertical' }} />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={save} disabled={busy} className="neu-btn-primary"
                      style={{ flex: 1, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Save size={14} /> {busy ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => { setEditing(null); setDraft({}); }} className="neu-btn"
                      style={{ flex: 1, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <X size={14} /> Cancel
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => startEdit(r)} className="neu-btn"
                    style={{ flex: 1, padding: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12.5 }}>
                    <Edit3 size={14} /> Edit
                  </button>
                  <button onClick={() => remove(r.id)} className="neu-btn" style={{ padding: '11px 16px', color: '#DC2626' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
