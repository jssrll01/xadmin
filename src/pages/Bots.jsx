import React, { useEffect, useRef, useState } from 'react';
import { Send, Bot as BotIcon, RefreshCw } from 'lucide-react';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import { useToast } from '../components/Toast.jsx';
import { fetchBotMessages, sendTestBotMessage } from '../lib/api.js';
import { dateTime, timeAgo } from '../lib/format.js';

const BOTS = [
  { id: 'bug', name: 'Bug & Technical', handle: '@XmarketBugTechnicalReportBot', color: '#DC2626' },
  { id: 'order', name: 'Order & Product', handle: '@XmarketOrderProductReportBot', color: '#F59E0B' },
  { id: 'shop', name: 'Shop / Seller', handle: '@XmarketShopReportBot', color: '#2563EB' },
  { id: 'content', name: 'Content & Review', handle: '@XmarketContentReviewReportBot', color: '#7C3AED' },
  { id: 'security', name: 'Account Security', handle: '@XmarketAccountSecurityReportBot', color: '#059669' },
];

export default function Bots() {
  const { show } = useToast();
  const [active, setActive] = useState('bug');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState('');
  const scrollRef = useRef(null);

  const load = async () => {
    setLoading(true);
    const { items } = await fetchBotMessages({ bot: active, limit: 100 });
    setMessages(items.reverse());
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-line */ }, [active]);

  // Poll every 5s
  useEffect(() => {
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [active]); // eslint-disable-line

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    if (!test.trim()) return;
    const { error } = await sendTestBotMessage(active, test.trim());
    if (error) return show(error, 'error');
    show('Test message sent', 'success');
    setTest('');
  };

  const current = BOTS.find(b => b.id === active);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Telegram bots</h1>
          <p>View incoming reports and send test messages</p>
        </div>
        <Btn onClick={load}><RefreshCw size={16} /> Refresh</Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
        {BOTS.map(b => (
          <button key={b.id} onClick={() => setActive(b.id)}
            className={'neu-card ' + (active === b.id ? '' : '')}
            style={{
              padding: 14, cursor: 'pointer', textAlign: 'left', width: '100%',
              border: active === b.id ? `2px solid ${b.color}` : '2px solid transparent',
            }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, marginBottom: 8,
              background: `linear-gradient(135deg, ${b.color}, ${b.color}dd)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            }}>
              <BotIcon size={16} />
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 800 }}>{b.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.handle}</div>
          </button>
        ))}
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>{current?.name} · incoming messages</div>
        <div ref={scrollRef} style={{
          maxHeight: 460, overflowY: 'auto', padding: 12,
          background: 'var(--surface-in)', borderRadius: 14, boxShadow: 'var(--neu-inset)',
        }}>
          {loading && messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 20 }}>Loading…</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 40 }}>
              No messages yet. When users submit a report, it lands here.
            </div>
          ) : (
            messages.map(m => (
              <div key={m.id} style={{
                display: 'flex', justifyContent: 'flex-start', marginBottom: 10,
              }}>
                <div style={{
                  maxWidth: '80%', padding: '10px 14px', borderRadius: 14,
                  background: 'var(--surface)', boxShadow: 'var(--neu-soft)',
                  fontSize: 12.5, lineHeight: 1.6,
                }}>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>
                    {m.from_name || 'User'} · {timeAgo(m.created_at)}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Send test message</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input className="neu-input" placeholder="Type a test message…"
            value={test} onChange={e => setTest(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()} />
          <Btn variant="primary" onClick={send}><Send size={16} /> Send</Btn>
        </div>
      </Card>
    </>
  );
}
