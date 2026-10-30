import { YL_URL, YL_KEY } from '../supabase.js';
import { api, getPin } from './ylApi.js';

let cache = null;

export const prettify = (n) => String(n).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export function loadSchema(force) {
  if (cache && !force) return cache;
  cache = (async () => {
    const found = {};
    let error = null;
    if (!YL_URL || !YL_KEY) {
      error = 'YUELIN env vars are missing (VITE_YL_SUPABASE_URL / VITE_YL_SUPABASE_ANON_KEY).';
    } else if (getPin()) {
      try {
        const data = await api.schema();
        (data || []).forEach((t) => { found[t.name] = t.columns || []; });
      } catch (e) {
        error = e.message || String(e);
      }
    }
    const tables = Object.keys(found)
      .filter((n) => !/admin/i.test(n) && n !== 'game_plays')
      .sort()
      .map((name) => ({ name, label: prettify(name), columns: found[name] }));
    return { tables, error };
  })();
  return cache;
}
