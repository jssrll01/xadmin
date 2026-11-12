// Parses pasted FAQs. Blocks are separated by a blank line.
// Line 1 = question, remaining lines = answer. "Q:" / "A:" prefixes are optional.
// Add a "scope: xyz" line anywhere to set the scope (default "general").
export function parseFaqs(text, defaultScope = 'general') {
  const blocks = String(text || '').replace(/\r/g, '').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const out = [];
  for (const b of blocks) {
    let scope = defaultScope;
    const lines = [];
    for (const ln of b.split('\n')) {
      const m = ln.match(/^\s*scope\s*:\s*(\S+)\s*$/i);
      if (m) scope = m[1].toLowerCase(); else lines.push(ln);
    }
    if (!lines.length) continue;
    const q = lines[0].replace(/^\s*Q\s*[:.)-]\s*/i, '').trim();
    const a = lines.slice(1).join('\n').replace(/^\s*A\s*[:.)-]\s*/i, '').trim();
    out.push({ scope, question: q, answer: a, ok: !!(q && a) });
  }
  return out;
}
