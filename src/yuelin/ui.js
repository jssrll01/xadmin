export const ACCENT = '#b8860b';
const out = '6px 6px 14px rgba(163,177,198,0.45), -6px -6px 14px rgba(255,255,255,0.9)';
const inn = 'inset 3px 3px 7px rgba(163,177,198,0.5), inset -3px -3px 7px rgba(255,255,255,0.9)';
const base = { border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 13, padding: '9px 16px', background: 'var(--bg, #f4f6fa)', boxShadow: '4px 4px 9px rgba(163,177,198,0.45), -4px -4px 9px rgba(255,255,255,0.9)' };

export const S = {
  h1: { fontSize: 22, fontWeight: 800, margin: 0, color: 'var(--text, #2b2f3a)' },
  sub: { fontSize: 12, color: '#8a93a3', margin: '4px 0 0' },
  card: { background: 'var(--bg, #f4f6fa)', borderRadius: 18, boxShadow: out, padding: 18 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14 },
  btn: { ...base, color: '#2b2f3a' },
  btnAccent: { ...base, color: ACCENT },
  btnDanger: { ...base, color: '#d64545' },
  input: { width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', borderRadius: 12, padding: '10px 12px', fontSize: 14, background: 'var(--bg, #f4f6fa)', color: '#2b2f3a', boxShadow: inn, fontFamily: 'inherit' },
  label: { display: 'block', fontSize: 12, fontWeight: 700, margin: '12px 0 5px', color: '#4a5160' },
  dim: { color: '#9aa3b2' },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#8a93a3', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(163,177,198,0.35)' },
  td: { padding: '9px 12px', fontSize: 13, color: '#2b2f3a', borderBottom: '1px solid rgba(163,177,198,0.2)', maxWidth: 260, overflow: 'hidden', whiteSpace: 'nowrap' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(30,35,50,0.45)', zIndex: 9000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '4vh 12px' },
  modal: { background: 'var(--bg, #f4f6fa)', borderRadius: 20, boxShadow: out, padding: 22, width: '100%', maxWidth: 560 },
  err: { background: '#fdecec', color: '#b42323', borderRadius: 12, padding: '10px 14px', fontSize: 13, margin: '12px 0' },
  warn: { background: '#fff6e0', color: '#8a6100', borderRadius: 12, padding: '10px 14px', fontSize: 13, margin: '12px 0' },
};
