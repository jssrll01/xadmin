import { YL_URL, YL_KEY, ylSupabase } from '../supabase.js';

const LS = 'xadmin_yl_tables';
let cache = null;

export const prettify = (n) => String(n).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export function getManualTables() {
  const env = (import.meta.env.VITE_YL_TABLES || '').split(',').map((s) => s.trim()).filter(Boolean);
  let ls = [];
  try { ls = JSON.parse(localStorage.getItem(LS) || '[]'); } catch (e) { ls = []; }
  return { env, ls };
}

function saveLs(list) {
  try { localStorage.setItem(LS, JSON.stringify(list)); } catch (e) { /* ignore */ }
  window.dispatchEvent(new Event('yl-tables-changed'));
}
export function addManualTable(name) {
  const n = String(name || '').trim();
  if (!/^[A-Za-z0-9_]+$/.test(n)) return false;
  const { ls } = getManualTables();
  if (!ls.includes(n)) saveLs([...ls, n]);
  return true;
}
export function removeManualTable(name) {
  saveLs(getManualTables().ls.filter((x) => x !== name));
}

async function fromOpenApi() {
  if (!YL_URL || !YL_KEY) throw new Error('YUELIN env vars are missing (VITE_YL_SUPABASE_URL / VITE_YL_SUPABASE_ANON_KEY).');
  const r = await fetch(`${YL_URL}/rest/v1/`, { headers: { apikey: YL_KEY } });
  if (!r.ok) throw new Error(`Schema request failed (${r.status}). The API may hide its table list from the publishable key.`);
  const j = await r.json();
  const defs = j.definitions || (j.components && j.components.schemas) || {};
  const out = {};
  Object.entries(defs).forEach(([name, def]) => {
    const props = def.properties || {};
    const req = def.required || [];
    out[name] = Object.entries(props).map(([c, p]) => ({
      name: c,
      type: p.format || p.type || 'text',
      pk: /Primary Key/i.test(p.description || ''),
      required: req.includes(c),
      hasDefault: p.default !== undefined,
    }));
  });
  return out;
}

export function loadSchema(force) {
  if (cache && !force) return cache;
  cache = (async () => {
    let found = {};
    let error = null;
    if (!YL_URL || !YL_KEY) {
      error = 'YUELIN env vars are missing (VITE_YL_SUPABASE_URL / VITE_YL_SUPABASE_ANON_KEY).';
    } else {
      const { data, error: rpcErr } = await ylSupabase.rpc('yl_schema');
      if (!rpcErr && Array.isArray(data)) {
        data.forEach((t) => { found[t.name] = t.columns || []; });
      } else {
        try { found = await fromOpenApi(); } catch (e) { error = 'Run the yl_schema SQL in the YUELIN project. ' + (rpcErr ? rpcErr.message : ''); }
      }
    }
    const m = getManualTables();
    [...m.env, ...m.ls].forEach((n) => { if (!found[n]) found[n] = null; });
    const tables = Object.keys(found).filter((n) => !/admin/i.test(n) && n !== 'game_plays').sort().map((name) => ({ name, label: prettify(name), columns: found[name] }));
    return { tables, error };
  })();
  return cache;
}
