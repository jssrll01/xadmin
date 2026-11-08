import React, { useCallback, useEffect, useState } from 'react';
import PageHeader from '../xa/ui/PageHeader.jsx';
import DataTable from '../xa/ui/DataTable.jsx';

export default function DataPage({ title, subtitle, fetcher, columns, searchKeys }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetcher();
      setItems(Array.isArray(res?.items) ? res.items : []);
      setFailed(false);
    } catch {
      setItems([]);
      setFailed(true);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <DataTable
        columns={columns}
        rows={items}
        loading={loading}
        error={failed}
        onRetry={load}
        searchKeys={searchKeys || columns.map((c) => c.key)}
        exportName={String(title).toLowerCase().replace(/\s+/g, '-')}
        emptyHint="This table is empty or has no readable rows."
      />
    </>
  );
}
