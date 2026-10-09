import React from 'react';
import Card from '../components/Card.jsx';

export default function Settings() {
  return (
    <>
      <div className="page-head"><div><h1>Settings</h1><p>Console configuration</p></div></div>
      <Card>
        <div style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.7 }}>
          <div><b>Supabase project:</b> dmdjytkuwfudkqepkxkl</div>
          <div><b>PIN:</b> 1010 (change in <code>src/components/PinLock.jsx</code>)</div>
          <div><b>Data source:</b> profiles, products, orders, xwallet_topups, xwallet_txns, promo_codes, return_requests, report_tickets, bundles, xcards, bot_messages</div>
        </div>
      </Card>
    </>
  );
}
