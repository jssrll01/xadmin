import React, { useMemo, useState } from 'react';
import { Upload } from 'lucide-react';
import Btn from '../components/Btn.jsx';
import { useToast } from '../components/Toast.jsx';
import PageHeader from '../xa/ui/PageHeader.jsx';
import { adm } from '../xa/db.js';
import { parseFaqs } from '../lib/faqParse.js';

const SAMPLE = 'Q: How do I track my order?\nA: Open Orders and tap the order.\n\nQ: Can I return an item?\nA: Yes, within 7 days of delivery.\nscope: orders';

export default function FaqBulkImport() {
  const { show } = useToast();
  const [text, setText] = useState('');
  const [scope, setScope] = useState('general');
  const [busy, setBusy] = useState(false);
  const items = useMemo(() => parseFaqs(text, scope.trim() || 'general'), [text, scope]);
  const good = items.filter((i) => i.ok);

  const run = async () => {
    setBusy(true);
    let done = 0;
    try {
      let order = 1000;
      for (const it of good) {
        await adm('adm_cfg_save', { p_table: 'faqs', p_row: { scope: it.scope, question: it.question, answer: it.answer, active: true, sort_order: order++ } });
        done++;
      }
      show?.(done + ' FAQs added. Apps pick them up within 5 minutes.', 'success');
      setText('');
    } catch (e) { show?.(done + ' added, then failed: ' + e.message, 'error'); }
    setBusy(false);
  };

  return (
    <>
      <PageHeader title="FAQ bulk import" subtitle="Paste many FAQs at once" />
      <div className="table-wrap" style={{ padding: 16, display: 'grid', gap: 12 }}>
        <label style={{ maxWidth: 260 }}><div className="ui-lbl">Default scope</div><input className="neu-input" value={scope} onChange={(e) => setScope(e.target.value)} /></label>
        <label><div className="ui-lbl">FAQs: question on the first line, answer below, blank line between FAQs</div>
          <textarea className="neu-input" rows={12} style={{ width: '100%', fontFamily: 'inherit' }} placeholder={SAMPLE} value={text} onChange={(e) => setText(e.target.value)} /></label>
        <div style={{ fontSize: 13 }}>{items.length ? good.length + ' ready' + (items.length > good.length ? ', ' + (items.length - good.length) + ' skipped (missing question or answer)' : '') : 'Nothing pasted yet'}</div>
        {good.length > 0 && (
          <div style={{ display: 'grid', gap: 6, maxHeight: 260, overflow: 'auto' }}>
            {good.slice(0, 50).map((i, k) => (
              <div key={k} style={{ fontSize: 12.5, padding: 8, borderRadius: 8, border: '1px solid var(--border)' }}>
                <b>{i.question}</b> <span className="neu-badge badge-frozen">{i.scope}</span>
                <div style={{ color: 'var(--text-dim)', whiteSpace: 'pre-wrap' }}>{i.answer.slice(0, 160)}</div>
              </div>
            ))}
          </div>
        )}
        <Btn variant="primary" onClick={run} disabled={busy || !good.length}><Upload size={14} /> {busy ? 'Adding…' : 'Add ' + good.length + ' FAQs'}</Btn>
      </div>
    </>
  );
}
