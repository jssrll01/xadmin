export const HEADERS = ['product_name','selling_price','category','description','image_urls','variants','stock_status'];
export const CATEGORIES = ['Groceries & Pantry','Toys & Collectibles','Health & Wellness','Automotive & Motorcycle','Books & Stationery','Pet Supplies','Sports & Outdoors','Baby & Kids','Beauty & Personal Care','Home & Living','Fashion','Electronics','Others'];
export const DEFAULT_STOCK = 99;
const FLAGS = { 'Fashion':'show_fashion','Groceries & Pantry':'show_groceries','Sports & Outdoors':'show_sports','Books & Stationery':'show_books' };
const ALIAS = { groceries:'Groceries & Pantry', pantry:'Groceries & Pantry', toys:'Toys & Collectibles', health:'Health & Wellness', automotive:'Automotive & Motorcycle', books:'Books & Stationery', stationery:'Books & Stationery', pets:'Pet Supplies', sports:'Sports & Outdoors', baby:'Baby & Kids', beauty:'Beauty & Personal Care', home:'Home & Living', other:'Others' };
const CLOUD = 'https://res.cloudinary.com/bvw3okdf/';
export const isOwn = (u) => String(u).startsWith(CLOUD);
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

export function parsePrice(v) {
  const s = clean(v).replace(/^(₱|php|p)\s*/i, '').replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  return n > 0 && n <= 1000000 ? n : null;
}
export function mapCategory(v) {
  const c = clean(v).toLowerCase();
  if (!c) return null;
  return CATEGORIES.find((x) => x.toLowerCase() === c) || ALIAS[c] || null;
}
export function parseStock(v) {
  const s = clean(v).toLowerCase().replace(/[\s-]+/g, '_');
  if (s === 'in_stock' || s === 'instock') return 'in_stock';
  if (s === 'out_of_stock' || s === 'outofstock') return 'out_of_stock';
  return null;
}
export function parseVariants(text, basePrice, stockStatus) {
  const base = stockStatus === 'in_stock' ? DEFAULT_STOCK : 0;
  const fail = (m) => ({ config: null, prices: null, stock: null, errors: [m] });
  const t = String(text ?? '').trim();
  if (!t) return { config: { Variant: ['Standard'] }, prices: { Standard: basePrice }, stock: { Standard: base }, errors: [] };
  let dims;
  if (t[0] === '[') { try { dims = JSON.parse(t); } catch { return fail('variants is not valid JSON'); } }
  else { const m = t.match(/^([^:|]{1,40}):(.+)$/); dims = [{ name: m ? clean(m[1]) : 'Variation', options: (m ? m[2] : t).split('|') }]; }
  if (!Array.isArray(dims) || !dims.length) return fail('variants must list at least one variant type');
  if (dims.length > 1) return fail('Multiple variant types need manual combination setup');
  const name = clean(dims[0] && dims[0].name) || 'Variation';
  const opts = Array.isArray(dims[0] && dims[0].options) ? dims[0].options : [];
  if (!opts.length || opts.length > 50) return fail('variants needs 1 to 50 options');
  const prices = {}, stock = {}, labels = [];
  for (const o of opts) {
    const label = clean(typeof o === 'string' ? o : o && o.name);
    if (!label || label.length > 60) return fail('Each variant option needs a name up to 60 characters');
    if (labels.includes(label)) return fail('Duplicate variant option: ' + label);
    const p = o && typeof o === 'object' && o.price != null ? parsePrice(o.price) : basePrice;
    if (p == null) return fail('Invalid price for option ' + label);
    let s = base;
    if (o && typeof o === 'object' && o.stock != null) { if (!Number.isInteger(Number(o.stock)) || Number(o.stock) < 0) return fail('Invalid stock for option ' + label); s = Number(o.stock); }
    labels.push(label); prices[label] = p; stock[label] = s;
  }
  return { config: { [name]: labels }, prices, stock, errors: [] };
}
export function normalizeRow(raw, ctx = {}) {
  const errors = [];
  const name = clean(raw.product_name);
  if (!name) errors.push('product_name is required'); else if (name.length > 200) errors.push('product_name is over 200 characters');
  const price = parsePrice(raw.selling_price);
  if (price == null) errors.push('selling_price must be a positive PHP amount like 199 or 199.50');
  const category = mapCategory(raw.category);
  if (!category) errors.push('category "' + clean(raw.category) + '" is not recognised');
  const ss = parseStock(raw.stock_status);
  if (!ss) errors.push('stock_status must be in_stock or out_of_stock');
  const urls = String(raw.image_urls ?? '').split(/[\s|;,]+/).filter(Boolean);
  if (!urls.length) errors.push('At least one https image URL is required');
  else if (urls.length > 9) errors.push('Max 9 images per product');
  else if (urls.some((u) => !/^https:\/\/[^\s/]+\.[^\s]+$/i.test(u) || u.length > 1000)) errors.push('image_urls contains an invalid or non-https URL');
  let v = { config: null, prices: null, stock: null, errors: [] };
  if (price != null) { v = parseVariants(raw.variants, price, ss); errors.push(...v.errors); }
  if (name) {
    const key = name.toLowerCase();
    if (ctx.seen) { if (ctx.seen.has(key)) errors.push('Duplicate of row ' + ctx.seen.get(key)); else ctx.seen.set(key, ctx.rowNo); }
    if (ctx.existing && ctx.existing.has(key)) errors.push('A product with this name already exists in the catalog');
  }
  const opts = v.config ? Object.values(v.config)[0] : [];
  let description = clean(raw.description).slice(0, 2000), generated = false;
  if (!description && name) {
    generated = true;
    description = name + (category ? ' (' + category + ').' : '.') + (opts.length > 1 ? ' Available options: ' + opts.join(', ') + '.' : '');
  }
  const normalized = { name, description, description_generated: generated, category: category || '', store: 'XMALL', source_images: urls, images: [], stock_status: ss, price,
    variant_config: v.config, variant_prices: v.prices, variant_stock: v.stock, flags: FLAGS[category] ? { [FLAGS[category]]: true } : {} };
  return { normalized, errors, status: errors.length ? 'needs_review' : 'imported' };
}
export async function processImages(urls, upload, { concurrency = 3, retries = 1, cache = new Map() } = {}) {
  const out = new Array(urls.length), status = new Array(urls.length);
  let i = 0;
  const one = async (k) => {
    const u = urls[k];
    if (isOwn(u)) { out[k] = u; status[k] = { url: u, ok: true }; return; }
    if (cache.has(u)) { out[k] = cache.get(u); status[k] = { url: u, ok: true, dedup: true }; return; }
    let last;
    for (let a = 0; a <= retries; a++) {
      try { const r = await upload(u); cache.set(u, r); out[k] = r; status[k] = { url: u, ok: true }; return; } catch (e) { last = e; }
    }
    status[k] = { url: u, ok: false, error: String((last && last.message) || last).slice(0, 200) };
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, async () => { while (i < urls.length) await one(i++); }));
  return { images: out.filter(Boolean), status, ok: status.every((s) => s.ok) };
}
