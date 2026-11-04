import fs from 'fs';
const rd = (p) => fs.readFileSync(p, 'utf8');
const wr = (p, s) => { fs.writeFileSync(p, s); console.log('wrote', p); };
const rep = (p, a, b, all) => { let s = rd(p); if (!s.includes(a)) { console.log('SKIP (not found) in', p, ':', a.slice(0, 50)); return; } s = all ? s.split(a).join(b) : s.replace(a, b); wr(p, s); };

wr('tailwind.config.js', `/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: { colors: { brand: { DEFAULT: '#2563eb', dark: '#1d4ed8' } } } },
  plugins: [],
}
`);

let css = rd('src/xaccess/index.css');
const start = css.indexOf('/* ============ NEUMORPHISM');
const end = css.indexOf('/* Global smooth transitions */');
let mid = css.slice(start, end);
wr('src/xaccess/index.css', `@tailwind components;

.xa-root {
  --nm-bg: #e6e9ef; --nm-shadow-dark: #c3c7d1; --nm-shadow-light: #ffffff;
  --nm-accent: #2563eb; --nm-text: #3a3f4b; --nm-text-muted: #6b7280; --nm-text-faint: #9aa0ac;
  background: var(--nm-bg); color: var(--nm-text);
  font-family: 'Segoe UI', system-ui, sans-serif;
  min-height: calc(100vh - 120px); border-radius: 22px; padding: 4px 0 40px;
}
.xa-root *, .xa-root *::before, .xa-root *::after { box-sizing: border-box; border-width: 0; border-style: solid; border-color: #e5e7eb; }
.xa-root button { font-family: inherit; cursor: pointer; background: none; }
.xa-root input, .xa-root select, .xa-root textarea { font-family: inherit; }
.xa-root h1, .xa-root h2, .xa-root h3, .xa-root p { margin: 0; }
.xa-root img { max-width: 100%; display: inline-block; }

@tailwind utilities;

${mid}
`);

for (const f of ['components/AuthGate.jsx', 'components/LoginPage.jsx', 'context/AuthContext.jsx']) {
  try { fs.unlinkSync('src/xaccess/' + f); console.log('deleted', f); } catch { /* already gone */ }
}

wr('src/xaccess/App.jsx', `import React, { useEffect, useState } from 'react';
import './index.css';
import HomePage from './pages/HomePage';
import DriveFilesPage from './pages/DriveFilesPage';
import RevokeAccessPage from './pages/RevokeAccessPage';
import SettingsPage from './pages/SettingsPage';
import { API_BASE, API_MISSING } from './api';

const TABS = [['home', '🏠 Home', HomePage], ['drive', '📁 Files', DriveFilesPage], ['revoke', '🗑️ Revoke', RevokeAccessPage], ['settings', '⚙️ Settings', SettingsPage]];

export default function AccessApp() {
  const [tab, setTab] = useState(() => { try { return localStorage.getItem('xadmin_access_tab') || 'home'; } catch { return 'home'; } });
  useEffect(() => {
    const go = (e) => setTab(e.detail);
    window.addEventListener('access-go', go);
    return () => window.removeEventListener('access-go', go);
  }, []);
  useEffect(() => { try { localStorage.setItem('xadmin_access_tab', tab); } catch { /* ignore */ } }, [tab]);
  const Page = (TABS.find((t) => t[0] === tab) || TABS[0])[2];
  return (
    <div className="xa-root">
      <nav className="w-full flex justify-center pt-6 pb-4">
        <div className="nm-flat flex items-center gap-2 px-4 py-3 flex-wrap justify-center">
          {TABS.map(([k, label]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ' + (tab === k ? 'nm-pressed text-brand' : 'hover:text-brand')}>
              {label}
            </button>
          ))}
        </div>
      </nav>
      {API_MISSING && (
        <div className="max-w-2xl mx-auto px-4 mb-4">
          <div className="nm-pressed p-4 rounded-2xl text-sm text-red-500">
            Access backend is not set. Add <b>VITE_API_URL</b> (your Drive server URL, e.g. https://your-access-server.onrender.com) in Render &rarr; Environment, then redeploy. Currently trying <b>{API_BASE}</b>.
          </div>
        </div>
      )}
      <Page />
    </div>
  );
}
`);

wr('src/xaccess/api.js', `const raw = import.meta.env.VITE_API_URL || '';
export const API_BASE = (raw || 'http://localhost:5000').replace(/\\/+$/, '');
export const API_MISSING = !raw && typeof window !== 'undefined' && !/^(localhost|127\\.)/.test(window.location.hostname);
`);

for (const f of ['HomePage', 'DriveFilesPage', 'RevokeAccessPage']) {
  const p = `src/xaccess/pages/${f}.jsx`;
  rep(p, "const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';", "import { API_BASE } from '../api';");
}
rep('src/xaccess/pages/HomePage.jsx', "import { useNavigate } from 'react-router-dom';\n", '');
rep('src/xaccess/pages/HomePage.jsx', 'const navigate = useNavigate();', "const navigate = (p) => window.dispatchEvent(new CustomEvent('access-go', { detail: p.replace('/', '') }));");

wr('src/xaccess/pages/SettingsPage.jsx', `import React from 'react';
import { API_BASE } from '../api';

export default function SettingsPage() {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 pb-16">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-bold">Settings</h1>
        <p className="text-sm text-gray-500 mt-2">Access runs inside Xadmin and uses the Xadmin PIN lock.</p>
      </header>
      <div className="nm-flat p-6 space-y-4">
        <div className="nm-pressed p-5 rounded-2xl">
          <p className="text-sm font-semibold text-gray-700">Drive server</p>
          <p className="text-xs text-gray-500 mt-1 break-all">{API_BASE}</p>
        </div>
      </div>
    </div>
  );
}
`);

rep('src/App.jsx', "import XAccessApp from './xaccess/App.jsx';", "import AccessApp from './xaccess/App.jsx';");
rep('src/App.jsx', "  return activeSystem === 'YUELIN' ? <YlGate><YuelinHome /></YlGate> : <Dashboard />;",
"  if (activeSystem === 'ACCESS') return <AccessApp />;\n  return activeSystem === 'YUELIN' ? <YlGate><YuelinHome /></YlGate> : <Dashboard />;");
rep('src/App.jsx', '          <Route path="/access/*" element={<XAccessApp />} />\n', '');

let sb = rd('src/components/Sidebar.jsx');
sb = sb.replace(/\n\s*\['\/access', 'XAccess', Database\],?/g, '\n');
sb = sb.replace("const items = activeSystem === 'YUELIN'", "const items = activeSystem === 'ACCESS'\n    ? [['/', 'Access', Database]]\n    : activeSystem === 'YUELIN'");
sb = sb.replace(`style={seg(activeSystem === 'YUELIN', '#b8860b')}>YUELIN</button>`,
`style={seg(activeSystem === 'YUELIN', '#b8860b')}>YUELIN</button>
        <button type="button" onClick={() => { setActiveSystem('ACCESS'); nav('/'); }} style={seg(activeSystem === 'ACCESS', '#059669')}>ACCESS</button>`);
wr('src/components/Sidebar.jsx', sb);
console.log('Done.');
