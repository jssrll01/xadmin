import test from 'node:test';
import assert from 'node:assert/strict';
import { newText, newUrl, normalizeUrl, validateRecord, estimateSize, move, duplicate, removeAt, sameMessage, parseTemplates } from './ndef.js';

test('url validation', () => {
  assert.equal(normalizeUrl('https://xmarket-app.shop').ok, true);
  for (const bad of ['', 'xmarket', 'http://a.com', 'javascript:alert(1)']) assert.equal(normalizeUrl(bad).ok, false);
});
test('text validation', () => {
  assert.equal(validateRecord(newText('hi', 'en')).errors.length, 0);
  assert.ok(validateRecord(newText('', 'en')).errors.length);
  assert.ok(validateRecord(newText('x', '??')).errors.length);
});
test('unknown host warns', () => {
  assert.ok(validateRecord(newUrl('https://example.com')).warnings.length);
  assert.equal(validateRecord(newUrl('https://xmarket-app.shop')).warnings.length, 0);
});
test('size counts bytes, not characters', () => {
  assert.ok(estimateSize([newText('😀', 'en')]).messageBytes > estimateSize([newText('ab', 'en')]).messageBytes);
  assert.equal(estimateSize([newText('x'.repeat(600))]).over, true);
});
test('ordering ops', () => {
  const a = newText('a'), b = newText('b');
  assert.equal(move([a, b], 0, 1)[0].text, 'b');
  assert.equal(duplicate([a, b], 0).length, 3);
  assert.notEqual(duplicate([a], 0)[1].id, a.id);
  assert.equal(removeAt([a, b], 0)[0].text, 'b');
});
test('read-back compare', () => {
  assert.equal(sameMessage([newUrl('https://xmarket-app.shop')], [{ type: 'url', url: 'https://xmarket-app.shop/' }]), true);
  assert.equal(sameMessage([newText('a')], [{ type: 'text', text: 'b', lang: 'en' }]), false);
});
test('template parsing', () => {
  assert.equal(parseTemplates('nope').length, 0);
  assert.equal(parseTemplates('[{"name":"x","records":[{"type":"url","url":"https://a.com"}]}]').length, 1);
});
