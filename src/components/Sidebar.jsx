import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, Search, LayoutDashboard, Home as HomeIcon, FolderOpen, Trash2, Settings as Cog, Database, Package, QrCode, Crown } from 'lucide-react';
import { useYlTables } from '../yuelin/useYlTables.js';
import { useAdminContext } from '../context/AdminContext';
import { ACCESS_TABS, accessPath } from '../xaccess/App.jsx';
import { XMARKET_GROUPS, locate } from '../xa/shellNav.js';

const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } };

export default function Sidebar() {
  const { activeSystem, setActiveSystem } = useAdminContext();
  const nav = useNavigate();
  const loc = useLocation();
  const yl = useYlTables(activeSystem === 'YUELIN');
  const [collapsed, setCollapsed] = useState(() => read('xs_collapsed', false));
  const [shut, setShut] = useState(() => read('xs_shut', {}));
  const [mobile, setMobile] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => { const h = () => setMobile((o) => !o); window.addEventListener('xs:menu', h); return () => window.removeEventListener('xs:menu', h); }, []);
  useEffect(() => { setMobile(false); }, [loc.pathname, activeSystem]);
  useEffect(() => {
    if (activeSystem !== 'XMARKET') return;
    const here = locate(loc.pathname);
    if (here && shut[here.groupId]) { const n = { ...shut }; delete n[here.groupId]; setShut(n); write('xs_shut', n); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.pathname, activeSystem]);

  const flat = activeSystem === 'ACCESS'
    ? ACCESS_TABS.map(([k, label]) => [accessPath(k), label, { home: HomeIcon, drive: FolderOpen, revoke: Trash2, settings: Cog }[k] || Cog])
    : activeSystem === 'YUELIN'
    ? [['/', 'Dashboard', LayoutDashboard], ['/yl-ops', 'Operations', Cog], ...yl.tables.map((t) => ['/yl/' + encodeURIComponent(t.name), t.label, Database])]
    : null;
  const groups = flat ? [{ id: 'all', label: '', items: flat }] : XMARKET_GROUPS;
  const ql = q.trim().toLowerCase();
  const shown = groups.map((g) => ({ ...g, items: ql ? g.items.filter((i) => i[1].toLowerCase().includes(ql)) : g.items })).filter((g) => g.items.length);

  const toggleGroup = (id) => { const n = { ...shut, [id]: !shut[id] }; setShut(n); write('xs_shut', n); };
  const toggleCollapse = () => { const n = !collapsed; setCollapsed(n); write('xs_collapsed', n); };
  const sw = (sys) => { setActiveSystem(sys); nav('/'); };

  return (
    <>
      <div className={'xs-scrim' + (mobile ? ' show' : '')} onClick={() => setMobile(false)} />
      <aside className={'xs-side' + (collapsed ? ' col' : '') + (mobile ? ' open' : '')} aria-label="Main navigation">
        <div className="xs-brand">
          <div className="xs-logo">X</div>
          <div><b>XADMIN</b><small>{activeSystem}</small></div>
          <button type="button" className="xs-collapse" onClick={toggleCollapse} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
        <div className="xs-sys" role="tablist" aria-label="System">
          {['XMARKET', 'YUELIN', 'ACCESS'].map((s) => (
            <button key={s} type="button" role="tab" aria-selected={activeSystem === s} className={activeSystem === s ? 'on' : ''} onClick={() => sw(s)}>{s}</button>
          ))}
        </div>
        <label className="xs-find"><Search size={14} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter menu" aria-label="Filter menu" /></label>
        <nav className="xs-nav" key={activeSystem}>
          {shown.map((g, gi) => {
            const isShut = !ql && !!shut[g.id];
            return (
              <div key={g.id}>
                {gi > 0 && <div className="xs-gdiv" />}
                {g.label && (
                  <button type="button" className={'xs-ghead' + (isShut ? ' shut' : '')} onClick={() => toggleGroup(g.id)} aria-expanded={!isShut}>
                    {g.label}<ChevronDown size={14} />
                  </button>
                )}
                {!isShut && g.items.map(([to, label, Icon]) => (
                  <NavLink key={to} to={to} end={to === '/'} title={collapsed ? label : undefined} className={({ isActive }) => 'xs-item' + (isActive ? ' on' : '')}>
                    <Icon size={17} /><span>{label}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
          {shown.length === 0 && <div style={{ padding: 16, fontSize: 13, color: 'var(--text-dim)' }}>No menu match.</div>}
        </nav>
      </aside>
    </>
  );
}
