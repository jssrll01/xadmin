export function csvCell(v) {
  if (v === null || v === undefined) return '';
  let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (/^(=|@|\t|\r|[+-](?![0-9.]))/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
export function toCsv(rows, cols) {
  const head = cols.map(csvCell).join(',');
  const body = rows.map((r) => cols.map((c) => csvCell(r[c])).join(','));
  return '\uFEFF' + [head].concat(body).join('\r\n');
}
export function downloadText(name, text, mime = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
export const stamp = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Manila' }).replace(/[: ]/g, '-').slice(0, 16);
