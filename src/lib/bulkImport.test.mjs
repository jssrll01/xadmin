import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePrice, normalizeRow, processImages } from './bulkImport.js';
const base = { product_name: 'Test  Item', selling_price: '100', category: 'Fashion', description: '', image_urls: 'https://a.com/1.jpg', variants: '', stock_status: 'in_stock' };
test('valid single image', () => { const r = normalizeRow(base); assert.equal(r.status, 'imported'); assert.equal(r.normalized.name, 'Test Item'); assert.deepEqual(r.normalized.variant_prices, { Standard: 100 }); assert.equal(r.normalized.flags.show_fashion, true); });
test('multiple images keep order', () => { const r = normalizeRow({ ...base, image_urls: 'https://a.com/1.jpg|https://a.com/2.jpg' }); assert.deepEqual(r.normalized.source_images, ['https://a.com/1.jpg', 'https://a.com/2.jpg']); });
test('variants', () => { const r = normalizeRow({ ...base, variants: '[{"name":"Color","options":["Black","White"]}]' }); assert.deepEqual(r.normalized.variant_config, { Color: ['Black', 'White'] }); assert.equal(r.normalized.variant_prices.White, 100); });
test('missing description is generated', () => { const r = normalizeRow(base); assert.equal(r.normalized.description_generated, true); assert.equal(r.status, 'imported'); });
test('invalid price', () => { assert.equal(parsePrice('-5'), null); assert.equal(parsePrice('abc'), null); assert.equal(parsePrice('₱1,299.50'), 1299.5); assert.equal(normalizeRow({ ...base, selling_price: '0' }).status, 'needs_review'); });
test('invalid category', () => { assert.equal(normalizeRow({ ...base, category: 'Spaceships' }).status, 'needs_review'); });
test('duplicate in csv and in catalog', () => { const seen = new Map(); normalizeRow(base, { seen, rowNo: 1 }); assert.match(normalizeRow(base, { seen, rowNo: 2 }).errors.join(), /Duplicate of row 1/); assert.match(normalizeRow(base, { existing: new Set(['test item']) }).errors.join(), /already exists/); });
test('ambiguous variants flagged', () => { const r = normalizeRow({ ...base, variants: '[{"name":"A","options":["x"]},{"name":"B","options":["y"]}]' }); assert.equal(r.status, 'needs_review'); assert.match(r.errors.join(), /Multiple variant types/); });
test('missing stock_status stays draft', () => { assert.equal(normalizeRow({ ...base, stock_status: '' }).status, 'needs_review'); });
test('image failure keeps order and reports', async () => {
  const up = async (u) => { if (u.includes('bad')) throw new Error('boom'); return 'https://res.cloudinary.com/bvw3okdf/' + u.slice(-3); };
  const r = await processImages(['https://a.com/ok1', 'https://a.com/bad', 'https://a.com/ok2'], up);
  assert.equal(r.ok, false); assert.equal(r.status[1].ok, false); assert.deepEqual(r.images, ['https://res.cloudinary.com/bvw3okdf/ok1', 'https://res.cloudinary.com/bvw3okdf/ok2']);
});
