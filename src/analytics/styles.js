export const CSS = `
.an-wrap{margin:0 0 18px}
.an-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px}
.an-h{font-size:15px;font-weight:800;color:var(--text);display:flex;align-items:center;gap:8px}
.an-sub{font-size:12px;color:var(--text-dim);font-weight:500}
.an-seg{display:inline-flex;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:3px;gap:2px}
.an-seg button{border:0;background:transparent;color:var(--text-dim);font-weight:700;font-size:12px;padding:6px 12px;border-radius:8px;cursor:pointer}
.an-seg button.on{background:var(--primary);color:#fff}
.an-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:12px}
.an-kpi{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px 16px;box-shadow:var(--shadow);min-width:0}
.an-kpi .l{font-size:11.5px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.4px}
.an-kpi .v{font-size:24px;font-weight:800;color:var(--text);margin:4px 0 2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.an-d{font-size:12px;font-weight:700;display:inline-flex;gap:4px;align-items:center}
.an-d.up{color:#059669}.an-d.down{color:#dc2626}.an-d.flat{color:var(--text-dim)}
.an-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px;box-shadow:var(--shadow);margin-bottom:12px;min-width:0}
.an-cols{display:grid;gap:12px;grid-template-columns:1fr}
@media(min-width:960px){.an-cols.two{grid-template-columns:2fr 1fr}.an-cols.eq{grid-template-columns:1fr 1fr}}
.an-row{display:flex;justify-content:space-between;gap:10px;font-size:13px;padding:7px 0;border-bottom:1px solid var(--border)}
.an-row:last-child{border-bottom:0}
.an-bar{height:6px;border-radius:6px;background:var(--border);margin-top:5px;overflow:hidden}
.an-bar i{display:block;height:100%;background:var(--primary);border-radius:6px}
.an-note{font-size:12px;color:var(--text-dim);margin-top:8px}
.an-err{background:var(--danger-soft);color:#991b1b;border-radius:12px;padding:10px 14px;font-size:13px}
.an-skel{display:inline-block;height:14px;width:70px;border-radius:6px;background:var(--border);animation:anp 1.2s ease-in-out infinite}
@keyframes anp{50%{opacity:.45}}
.an-tabs{display:flex;gap:6px;overflow-x:auto;padding:4px 2px 10px;margin-bottom:6px;scrollbar-width:thin}
.an-tab{flex:0 0 auto;border:1px solid var(--border);background:var(--surface);color:var(--text-dim);font-weight:700;font-size:13px;padding:9px 14px;border-radius:12px;cursor:pointer;display:inline-flex;gap:7px;align-items:center;white-space:nowrap}
.an-tab.on{background:var(--primary);border-color:var(--primary);color:#fff;box-shadow:0 4px 12px rgba(37,99,235,.3)}
.an-toggle{border:1px solid var(--border);background:var(--surface);border-radius:10px;padding:6px 12px;font-size:12px;font-weight:700;color:var(--text-dim);cursor:pointer}
`;
