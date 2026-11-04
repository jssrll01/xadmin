import React, { useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import Panel, { RangeSeg } from './Panel.jsx';
import { CSS } from './styles.js';
import { P, ROUTE_PANELS, YL_PANELS } from './config.js';

const store = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, String(v)); } catch (e) { /* ignore */ } },
};

/** Analytics block shown above a tab. Pass `panels` (config objects). Collapsible, remembers range. */
export function InsightsBlock({ panels }) {
  const [days, setDays] = useState(() => Number(store.get('xadmin_an_days', 30)) || 30);
  const [open, setOpen] = useState(() => store.get('xadmin_an_open', '1') === '1');
  const [tick, setTick] = useState(0);
  if (!panels.length) return null;
  return (
    <section aria-label="Analytics" style={{ marginBottom: 6 }}>
      <style>{CSS}</style>
      <div className="an-head">
        <div className="an-h"><BarChart3 size={18} /> Analytics</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {open && <RangeSeg days={days} onChange={(d) => { setDays(d); store.set('xadmin_an_days', d); }} />}
          {open && <button type="button" className="an-toggle" onClick={() => setTick((t) => t + 1)} aria-label="Refresh analytics"><RefreshCw size={13} /></button>}
          <button type="button" className="an-toggle" onClick={() => { setOpen(!open); store.set('xadmin_an_open', open ? '0' : '1'); }}>
            {open ? <>Hide <ChevronUp size={13} /></> : <>Show <ChevronDown size={13} /></>}
          </button>
        </div>
      </div>
      {open && panels.map((p) => <Panel key={p.id} cfg={p} days={days} tick={tick} />)}
    </section>
  );
}

export const panelsForPath = (path) => (ROUTE_PANELS[path] || []).map((k) => P[k]).filter(Boolean);
export const ylPanelsFor = (table) => (YL_PANELS[table] ? [YL_PANELS[table]] : []);
