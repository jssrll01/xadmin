// One shared realtime channel. Receives {t: table, op} signals from the database.
export function createLiveBus(client, { topic = 'admin-live', event = 'change' } = {}) {
  const subs = new Set();
  const statusSubs = new Set();
  let ch = null;
  let status = 'idle';
  let wasLive = false;
  const setStatus = (s) => { status = s; statusSubs.forEach((f) => f(s)); };
  const open = () => {
    if (ch) return;
    setStatus('connecting');
    ch = client.channel(topic, { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event }, (msg) => { const p = (msg && msg.payload) || {}; subs.forEach((f) => f(p)); })
      .subscribe((st) => {
        if (st === 'SUBSCRIBED') {
          setStatus('live');
          if (wasLive) subs.forEach((f) => f({ t: '*', resync: true })); // reconnected: catch up
          wasLive = true;
        } else if (st === 'CLOSED') setStatus('off');
        else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') setStatus('error');
      });
  };
  const close = () => {
    if (ch) { client.removeChannel(ch); ch = null; }
    wasLive = false;
    setStatus('idle');
  };
  return {
    subscribe(fn) { subs.add(fn); open(); return () => { subs.delete(fn); if (!subs.size) close(); }; },
    onStatus(fn) { statusSubs.add(fn); fn(status); return () => statusSubs.delete(fn); },
    get status() { return status; },
  };
}
