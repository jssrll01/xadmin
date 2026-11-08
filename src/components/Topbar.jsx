import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, Lock, Sun, Moon, Menu, Search } from 'lucide-react';
import InstallButton from './InstallButton.jsx';
import LiveDot from './LiveDot.jsx';
import { useAdminContext } from '../context/AdminContext';
import { locate } from '../xa/shellNav.js';
import { clearAdminPin } from '../lib/pin.js';

const pretty = (s) => decodeURIComponent(s).replace(/[-_]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export default function Topbar() {
  const loc = useLocation();
  const { activeSystem } = useAdminContext();
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');
  const segs = loc.pathname.split('/').filter(Boolean);
  const here = activeSystem === 'XMARKET' ? locate(loc.pathname) : null;
  const crumbs = [];
  crumbs.push(activeSystem === 'XMARKET' ? 'XMARKET' : activeSystem);
  if (here && here.to !== '/') crumbs.push(here.group);
  const lastLabel = here ? here.label : (segs.length ? pretty(segs[segs.length - 1]) : 'Dashboard');
  const extra = here && here.to !== '/' ? segs.slice(here.to.split('/').filter(Boolean).length) : [];

  useEffect(() => {
    const h = () => setTheme(document.documentElement.dataset.theme || 'light');
    window.addEventListener('xs:theme', h);
    return () => window.removeEventListener('xs:theme', h);
  }, []);
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('xadmin_theme', next); } catch (e) { /* storage blocked */ }
    setTheme(next);
  };
  const lock = () => {
    try { sessionStorage.removeItem('xadmin_unlocked'); sessionStorage.removeItem('xadmin_actor'); } catch (e) { /* storage blocked */ }
    clearAdminPin();
    window.location.reload();
  };

  return (
    <header className="xs-top">
      <button type="button" className="xs-menu" onClick={() => window.dispatchEvent(new Event('xs:menu'))} aria-label="Open menu"><Menu size={20} /></button>
      <nav className="xs-crumbs" aria-label="Breadcrumb">
        {crumbs.map((c, i) => <React.Fragment key={i}><span>{c}</span><i>/</i></React.Fragment>)}
        {extra.length > 0 ? <><Link to={here.to} style={{ color: 'inherit' }}>{lastLabel}</Link><i>/</i><b>{pretty(extra.join(' / '))}</b></> : <b>{lastLabel}</b>}
      </nav>
      <div className="xs-right">
        <button type="button" className="xs-search" onClick={() => window.dispatchEvent(new Event('xa:palette'))} aria-label="Open command palette">
          <Search size={15} /><span>Search</span><span className="xa-kbd">Ctrl K</span>
        </button>
        <LiveDot />
        <InstallButton />
        <button type="button" className="xs-ico" onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} aria-pressed={theme === 'dark'}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <Link to="/notifications" className="xs-ico" aria-label="Notifications"><Bell size={18} /></Link>
        <button type="button" className="xs-ico" onClick={lock} aria-label="Lock admin"><Lock size={18} /></button>
      </div>
    </header>
  );
}
