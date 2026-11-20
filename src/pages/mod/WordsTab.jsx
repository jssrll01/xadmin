import React, { useCallback, useEffect, useState } from 'react';
import { call, card, inp, Btn } from './shared.jsx';

export default function WordsTab() {
  const [words, setWords] = useState(null);
  const [text, setText] = useState('');
  const [action, setAction] = useState('flag');
  const [test, setTest] = useState('');
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const d = await call('mod_words_list'); setWords(Array.isArray(d) ? d : []); setErr(''); }
    catch (e) { setWords([]); setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (fn, args, ok) => {
    setBusy(true); setMsg('');
    try { const d = await call(fn, args); await load(); if (ok) setMsg(ok(d)); setErr(''); } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const doTest = async () => { try { setRes(await call('mod_test', { p_text: test })); setErr(''); } catch (e) { setErr(e.message); } };

  return (
    <div>
      <div style={{ ...card, marginBottom: 12 }}>
        <b>Add words</b>
        <p style={{ fontSize: 12, color: '#8a93a3', margin: '4px 0 8px' }}>One per line or separated by commas. Spellings like b@d, b4d and baaad are caught automatically.</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} style={{ ...inp, width: '100%', boxSizing: 'border-box' }} placeholder="word one&#10;word two" />
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <select value={action} onChange={(e) => setAction(e.target.value)} style={inp}>
            <option value="flag">Flag (allow, log for review)</option>
            <option value="block">Block (reject the message)</option>
          </select>
          <Btn disabled={busy || !text.trim()} onClick={() => run('mod_words_add', { p_words: text, p_action: action }, (d) => 'Saved ' + d.count + ' word(s).').then(() => setText(''))}>Add</Btn>
        </div>
      </div>
      <div style={{ ...card, marginBottom: 12 }}>
        <b>Test a phrase</b>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <input value={test} onChange={(e) => { setTest(e.target.value); setRes(null); }} placeholder="Type something to check" style={{ ...inp, flex: 1 }} />
          <Btn onClick={doTest} disabled={!test.trim()}>Check</Btn>
        </div>
        {res && <p style={{ margin: '8px 0 0', color: res.action ? '#DC2626' : '#059669', fontWeight: 700 }}>{res.action ? 'Would ' + res.action + ' (matched "' + res.word + '")' : 'No match'}</p>}
      </div>
      {err && <p style={{ color: '#DC2626' }}>{err}</p>}
      {msg && <p style={{ color: '#059669' }}>{msg}</p>}
      {!words && <div style={card}>Loading...</div>}
      {words && words.length === 0 && <div style={{ ...card, textAlign: 'center', color: '#8a93a3' }}>No banned words yet.</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {words && words.map((w) => (
          <span key={w.id} style={{ ...card, padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <b>{w.word}</b>
            <button title="Click to switch flag/block" onClick={() => run('mod_word_set', { p_id: w.id, p_action: w.action === 'block' ? 'flag' : 'block' })}
              style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 99, color: '#fff', background: w.action === 'block' ? '#DC2626' : '#D97706' }}>{w.action}</button>
            <button aria-label="Delete" onClick={() => window.confirm('Remove "' + w.word + '"?') && run('mod_word_delete', { p_id: w.id })} style={{ color: '#8a93a3', fontWeight: 800 }}>x</button>
          </span>
        ))}
      </div>
    </div>
  );
}
