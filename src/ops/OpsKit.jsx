import React from 'react';
export const box = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 14, marginBottom: 12 };
export const th = { textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: '#64748B', padding: '8px 10px', borderBottom: '1px solid #E2E8F0' };
export const td = { padding: '8px 10px', borderBottom: '1px solid #F1F5F9', fontSize: 13 };
export const btn = { border: 0, borderRadius: 10, padding: '9px 16px', background: '#2563EB', color: '#fff', fontWeight: 600, cursor: 'pointer' };
export const input = { padding: '9px 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 14 };
export function Page({ title, sub, children }) {
  return <div style={{ padding: 20, maxWidth: 1100 }}><h2 style={{ margin: 0 }}>{title}</h2><p style={{ color: '#64748B', margin: '4px 0 16px' }}>{sub}</p>{children}</div>;
}
export const Err = ({ e }) => (e ? <div style={{ ...box, color: '#991B1B', background: '#FEF2F2' }}>{e}</div> : null);
export const Empty = ({ t }) => <div style={{ color: '#64748B', padding: 20, textAlign: 'center' }}>{t}</div>;
export function Table({ cols, rows }) {
  return (
    <div style={{ ...box, padding: 0, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{cols.map((c) => <th key={c[0]} style={th}>{c[0]}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{cols.map((c) => <td key={c[0]} style={td}>{c[1](r)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
export function useLoad(fn, deps) {
  const [data, setData] = React.useState(null);
  const [err, setErr] = React.useState('');
  const [busy, setBusy] = React.useState(true);
  const run = React.useCallback(async () => {
    setBusy(true); setErr('');
    try { setData(await fn()); } catch (e) { setErr(e.message); }
    setBusy(false);
  }, deps); // eslint-disable-line
  React.useEffect(() => { run(); }, [run]);
  return { data, err, busy, run };
}
