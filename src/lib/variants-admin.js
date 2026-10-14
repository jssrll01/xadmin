/**
 * Lightweight variant helpers for admin table rendering.
 * Mirrors xmarket/src/lib/variants.js — keep in sync.
 */

export function priceRange(product) {
  if (!product) return { display: '—' };
  const prices = product.variant_prices;
  const hasConfig = product.variant_config && Object.keys(product.variant_config).length > 0;
  const values = (hasConfig && prices && typeof prices === 'object')
    ? Object.values(prices).map(Number).filter(n => n > 0)
    : [];
  if (values.length === 0) return { display: '—' };
  const min = Math.min(...values);
  const max = Math.max(...values);
  return {
    min, max,
    display: min !== max
      ? `₱${min.toLocaleString()}–₱${max.toLocaleString()}`
      : `₱${min.toLocaleString()}`,
  };
}

export function totalStock(product) {
  if (!product) return 0;
  const hasConfig = product.variant_config && Object.keys(product.variant_config).length > 0;
  if (!hasConfig) return Infinity;
  const map = product.variant_stock;
  if (!map || typeof map !== 'object') return 0;
  let sum = 0;
  for (const k of Object.keys(map)) {
    const v = Number(map[k]) || 0;
    if (v > 0) sum += v;
  }
  return sum;
}
