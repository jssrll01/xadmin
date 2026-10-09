import React from 'react';
import CrudPage from '../components/CrudPage.jsx';
import { fetchTopUps, topupCrud, approveTopUp } from '../lib/api.js';
import { peso, dateTime } from '../lib/format.js';
import { Check, X } from 'lucide-react';
import { useToast } from '../components/Toast.jsx';

export default function TopUps() {
  const { show } = useToast();

  const handleApprove = async (row, update) => {
    const res = await approveTopUp(row.id, row.user_id, row.amount);
    if (res?.error) return show?.(res.error.message, 'error');
    show?.('Approved · wallet credited', 'success');
  };

  return (
    <CrudPage
      title="Top-ups"
      subtitle="Wallet funding"
      fetcher={fetchTopUps}
      searchKeys={['status']}
      columns={[
        { key: 'id', label: 'ID', render: (r) => <code style={{ fontSize: 11 }}>{(r.id || '').slice(0, 8)}</code> },
        { key: 'user_id', label: 'User', render: (r) => (r.user_id || '').slice(0, 8) || '—' },
        { key: 'amount', label: 'Amount', render: (r) => <b>{peso(r.amount)}</b> },
        { key: 'status', label: 'Status', render: (r) => {
          const s = (r.status || 'processing').toLowerCase();
          const cls = s === 'approved' ? 'badge-approved'
                    : s === 'rejected' ? 'badge-rejected'
                    : 'badge-pending';
          return <span className={`neu-badge ${cls}`}>{s}</span>;
        } },
        { key: 'created_at', label: 'Requested', render: (r) => dateTime(r.created_at) },
      ]}
      formFields={[
        { key: 'user_id', label: 'User ID', required: true },
        { key: 'amount', label: 'Amount', type: 'number', required: true },
        { key: 'status', label: 'Status', type: 'select',
          options: ['processing', 'approved', 'rejected'], default: 'processing' },
      ]}
      onCreate={topupCrud.create}
      onUpdate={topupCrud.update}
      onDelete={topupCrud.remove}
      extraRowActions={(row, { update }) => (
        <>
          {['processing', 'pending'].includes((row.status || '').toLowerCase()) && (
            <>
              <button className="neu-btn neu-btn-success" style={{ padding: 7 }}
                onClick={() => handleApprove(row, update)} title="Approve & credit">
                <Check size={14} />
              </button>
              <button className="neu-btn" style={{ padding: 7, color: 'var(--danger)', borderColor: '#FCA5A5' }}
                onClick={() => update(row.id, { status: 'rejected' })} title="Reject">
                <X size={14} />
              </button>
            </>
          )}
        </>
      )}
    />
  );
}
