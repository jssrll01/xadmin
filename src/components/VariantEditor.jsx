import React, { useMemo } from 'react';
import { Plus, X } from 'lucide-react';

/**
 * Multi-dimension variant editor.
 * Value shape (from CrudPage): { variant_config, variant_prices, variant_stock }
 *   variant_config: { Color: ['Red', 'Blue'], Size: ['S', 'M'] }
 *   variant_prices: { 'Red / S': 199, 'Red / M': 219, ... }
 *   variant_stock:  { 'Red / S': 5,   'Red / M': 3,   ... }
 */
export default function VariantEditor({ value, onChange }) {
  const v = value && typeof value === 'object' ? value : {};
  const config = v.variant_config || {};
  const prices = v.variant_prices || {};
  const stock = v.variant_stock || {};

  const dims = Object.keys(config);

  const commit = (patch) => {
    onChange({
      variant_config: patch.variant_config ?? config,
      variant_prices: patch.variant_prices ?? prices,
      variant_stock: patch.variant_stock ?? stock,
    });
  };

  const addDimension = () => {
    const name = window.prompt('Dimension name (e.g. Color, Size, Material)');
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed || config[trimmed]) return;
    commit({ variant_config: { ...config, [trimmed]: [] } });
  };

  const removeDimension = (dim) => {
    const next = { ...config };
    delete next[dim];
    // Recompute combos
    const nextCombos = allCombos(next);
    const nextPrices = {};
    const nextStock = {};
    for (const k of nextCombos) {
      if (prices[k] != null) nextPrices[k] = prices[k];
      if (stock[k] != null) nextStock[k] = stock[k];
    }
    commit({ variant_config: next, variant_prices: nextPrices, variant_stock: nextStock });
  };

  const addOption = (dim) => {
    const opt = window.prompt(`Add option to "${dim}"`);
    if (!opt) return;
    const trimmed = opt.trim();
    if (!trimmed) return;
    const existing = config[dim] || [];
    if (existing.includes(trimmed)) return;
    const nextConfig = { ...config, [dim]: [...existing, trimmed] };
    commit({ variant_config: nextConfig });
  };

  const removeOption = (dim, opt) => {
    const nextConfig = { ...config, [dim]: (config[dim] || []).filter(o => o !== opt) };
    const nextCombos = allCombos(nextConfig);
    const nextPrices = {};
    const nextStock = {};
    for (const k of nextCombos) {
      if (prices[k] != null) nextPrices[k] = prices[k];
      if (stock[k] != null) nextStock[k] = stock[k];
    }
    commit({ variant_config: nextConfig, variant_prices: nextPrices, variant_stock: nextStock });
  };

  const setPrice = (k, val) => {
    const nextPrices = { ...prices };
    if (val === '' || val == null) delete nextPrices[k];
    else nextPrices[k] = Number(val);
    commit({ variant_prices: nextPrices });
  };

  const setStock = (k, val) => {
    const nextStock = { ...stock };
    if (val === '' || val == null) delete nextStock[k];
    else nextStock[k] = Number(val);
    commit({ variant_stock: nextStock });
  };

  const combos = useMemo(() => allCombos(config), [JSON.stringify(config)]);

  const grid = useMemo(() => buildGrid(config, combos), [JSON.stringify(config), JSON.stringify(combos)]);

  return (
    <div className="ve-root">
      {dims.length === 0 && (
        <div className="ve-empty">No dimensions yet. Add Color, Size, or any option.</div>
      )}

      {dims.map((dim) => (
        <div key={dim} className="ve-dim">
          <div className="ve-dim-head">
            <div className="ve-dim-name">{dim}</div>
            <button type="button" className="ve-dim-remove" onClick={() => removeDimension(dim)} title="Remove dimension">
              <X size={13} />
            </button>
          </div>
          <div className="ve-dim-options">
            {(config[dim] || []).map((opt) => (
              <span key={opt} className="ve-opt-chip">
                {opt}
                <button type="button" className="ve-opt-x" onClick={() => removeOption(dim, opt)} title="Remove option">
                  <X size={11} />
                </button>
              </span>
            ))}
            <button type="button" className="ve-opt-add" onClick={() => addOption(dim)}>
              <Plus size={12} /> Add
            </button>
          </div>
        </div>
      ))}

      <button type="button" className="ve-add-dim" onClick={addDimension}>
        <Plus size={13} /> Add dimension
      </button>

      {grid && combos.length > 0 && (
        <div className="ve-grid-wrap">
          <div className="ve-grid-title">Price &amp; stock per combination</div>
          <table className="ve-grid">
            <thead>
              <tr>
                <th></th>
                {grid.cols.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.rows.map((row) => (
                <tr key={row.key}>
                  <th scope="row">{row.label}</th>
                  {grid.cols.map((col) => {
                    const k = row.key && col.key ? `${row.key} / ${col.key}` : (row.key || col.key);
                    return (
                      <td key={col.key}>
                        <input
                          type="number"
                          className="ve-input"
                          placeholder="₱"
                          value={prices[k] ?? ''}
                          onChange={(e) => setPrice(k, e.target.value)}
                        />
                        <input
                          type="number"
                          className="ve-input ve-input-stock"
                          placeholder="Stock"
                          value={stock[k] ?? ''}
                          onChange={(e) => setStock(k, e.target.value)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- helpers ---------- */

function allCombos(config) {
  const dims = Object.keys(config).filter(d => (config[d] || []).length > 0);
  if (dims.length === 0) return [];
  const out = [];
  const walk = (idx, prefix) => {
    if (idx === dims.length) {
      if (prefix.length) out.push(prefix.join(' / '));
      return;
    }
    const dim = dims[idx];
    for (const opt of config[dim]) {
      walk(idx + 1, [...prefix, opt]);
    }
  };
  walk(0, []);
  return out;
}

function buildGrid(config, combos) {
  const dims = Object.keys(config).filter(d => (config[d] || []).length > 0);
  if (dims.length === 0) return null;

  if (dims.length === 1) {
    // Single dimension: two-column layout (dim | price/stock)
    const d = dims[0];
    return {
      rows: (config[d] || []).map(opt => ({ key: opt, label: opt })),
      cols: [{ key: '', label: d }],
    };
  }

  // Two or more dimensions: use first dim as row key, remaining as columns
  const [rowDim, ...colDims] = dims;
  const rowOpts = config[rowDim] || [];
  const cols = [];
  const colValueLists = colDims.map(d => config[d] || []);
  const walkCol = (idx, prefix) => {
    if (idx === colValueLists.length) {
      cols.push({ key: prefix.join(' / '), label: prefix.join(' / ') });
      return;
    }
    for (const opt of colValueLists[idx]) walkCol(idx + 1, [...prefix, opt]);
  };
  walkCol(0, []);
  return {
    rows: rowOpts.map(opt => ({ key: opt, label: opt })),
    cols,
  };
}
