import React, { useState } from 'react';
import { BarChart3, DollarSign, Gift, Globe, HeartHandshake, LayoutDashboard, LifeBuoy, Megaphone, Package, ShoppingBag, Users } from 'lucide-react';
import Panel, { RangeSeg } from './Panel.jsx';
import { CSS } from './styles.js';
import { HUB, P } from './config.js';
import DashboardMain from '../pages/DashboardMain.jsx';

const ICONS = { overview: LayoutDashboard, sales: BarChart3, orders: ShoppingBag, products: Package, financial: DollarSign, customers: Users, marketing: Megaphone, support: LifeBuoy, loyalty: Gift, traffic: Globe };
const LABEL = { overview: 'Overview' };

function Traffic({ days }) {
  return (
    <>
      <div className="an-card" style={{ marginBottom: 14 }}>
        <div className="an-h"><Globe size={16} /> Traffic analytics</div>
        <p className="an-sub" style={{ marginTop: 8, lineHeight: 1.55 }}>
          Nothing is recording visits, page views or traffic sources in your database yet, so there is no real traffic data to chart.
          The charts below use what you do have (new customers and orders) to show how people arrive and convert. To see visitors, sessions and top pages here,
          a page-view tracker needs to be added to the shop app.
        </p>
      </div>
      <Panel cfg={{ ...P.users, id: 'acq_users', title: 'Acquisition: new customers' }} days={days} />
      <Panel cfg={{ ...P.orders, id: 'acq_orders', title: 'Conversion: orders placed', series: P.orders.series.slice(0, 1), extras: [], breakdown: null, top: null }} days={days} />
    </>
  );
}

/** XMARKET home: Overview (the original dashboard) plus one analytics tab per business area. */
export default function DashboardHub() {
  const [tab, setTab] = useState(() => { try { return localStorage.getItem('xadmin_hub_tab') || 'overview'; } catch (e) { return 'overview'; } });
  const [days, setDays] = useState(30);
  const pick = (k) => { setTab(k); try { localStorage.setItem('xadmin_hub_tab', k); } catch (e) { /* ignore */ } };
  const tabs = [['overview', 'Overview', []], ...HUB];
  const cur = tabs.find((t) => t[0] === tab) || tabs[0];
  return (
    <div>
      <style>{CSS}</style>
      <div className="an-tabs" role="tablist" aria-label="Dashboard sections">
        {tabs.map(([k, label]) => { const I = ICONS[k] || BarChart3; return (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={'an-tab' + (tab === k ? ' on' : '')} onClick={() => pick(k)}><I size={15} />{LABEL[k] || label}</button>
        ); })}
      </div>
      {cur[0] === 'overview' ? <DashboardMain /> : (
        <>
          <div className="an-head"><div className="an-h">{cur[1]} analytics</div><RangeSeg days={days} onChange={setDays} /></div>
          {cur[0] === 'traffic' ? <Traffic days={days} /> : cur[2].map((k) => <Panel key={cur[0] + k} cfg={P[k]} days={days} />)}
          {cur[0] === 'loyalty' && <p className="an-note"><HeartHandshake size={13} style={{ verticalAlign: -2 }} /> Points, missions and check-in analytics for the YUELIN app are in the YUELIN section.</p>}
        </>
      )}
    </div>
  );
}
