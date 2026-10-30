import { useCallback, useEffect, useState } from 'react';
import { loadSchema } from './schema.js';

export function useYlTables(enabled = true) {
  const [state, setState] = useState({ tables: [], error: null, loading: enabled });
  const load = useCallback(async (force) => {
    setState((s) => ({ ...s, loading: true }));
    const r = await loadSchema(force);
    setState({ tables: r.tables, error: r.error, loading: false });
  }, []);
  useEffect(() => {
    if (!enabled) return undefined;
    load(false);
    const h = () => load(true);
    window.addEventListener('yl-tables-changed', h);
    return () => window.removeEventListener('yl-tables-changed', h);
  }, [enabled, load]);
  return { ...state, reload: () => load(true) };
}
