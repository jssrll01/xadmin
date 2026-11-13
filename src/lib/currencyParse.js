// One currency per line:  CODE, SYMBOL, RATE, Name   (rate = how much equals 1 peso)
// Separators can be comma, semicolon, pipe or tab. Without those, spaces are used.
export function parseCurrencies(text) {
  const out = [];
  String(text || '').replace(/\r/g, '').split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    let parts = /[,;|\t]/.test(line) ? line.split(/[,;|\t]/).map((s) => s.trim()) : line.split(/\s+/);
    if (parts.length > 4) parts = parts.slice(0, 3).concat(parts.slice(3).join(' '));
    const [code = '', symbol = '', rate = '', name = ''] = parts;
    const r = Number(rate);
    let bad = '';
    if (!/^[A-Za-z]{3,5}$/.test(code)) bad = 'code must be 3 to 5 letters';
    else if (code.toUpperCase() === 'PHP') bad = 'PHP is the default';
    else if (!symbol || symbol.length > 6) bad = 'symbol missing or too long';
    else if (!(r > 0) || !isFinite(r)) bad = 'rate must be a number above 0';
    out.push({ line: i + 1, code: code.toUpperCase(), symbol, rate: r, name, bad });
  });
  return out;
}
