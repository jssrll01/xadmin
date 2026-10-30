import { useAdminContext } from "../context/AdminContext";
import React, { useState } from 'react';
import Modal from '../components/Modal.jsx';
import CrudPage from '../components/CrudPage.jsx';
import { fetchTopUps, topupCrud } from '../lib/api.js';
import { getDb } from '../supabase.js';
import { peso, dateTime } from '../lib/format.js';
import { Check, X } from 'lucide-react';
import { useToast } from '../components/Toast.jsx';

export default function TopUps() {
  const { activeSystem } = useAdminContext();
  const supabase = getDb(activeSystem);
  const { show } = useToast();
  const [viewer, setViewer] = useState(null);

  const decide = async (row, status) => {
    const { data, error } = await supabase.rpc('admin_topup_set', { code: import.meta.env.VITE_XADMIN_PIN, p_id: row.id, p_status: status });
    if (error) return show?.(error.message, 'error');
    show?.(status === 'approved' ? 'Approved · wallet credited' : 'Rejected', 'success');
  };
  const handleApprove = (row) => decide(row, 'approved');

  return (
    <>
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
        { key: 'receipt', label: 'Receipt', render: (r) => {
          const rc = r.receipt_data || r.receipt || {};
          const src = rc.url || rc.dataUrl;
          if (!src) return '—';
          const img = <img src={src} alt="receipt" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />;
          return <span onClick={() => setViewer(src)} style={{ cursor: 'pointer' }}>{img}</span>;
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
                onClick={() => decide(row, 'rejected')} title="Reject">
                <X size={14} />
              </button>
            </>
          )}
        </>
      )}
    />
    <Modal open={!!viewer} onClose={() => setViewer(null)} title="Receipt">
      {viewer && <img src={viewer} alt="receipt" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 12 }} />}
    </Modal>
    </>
  );
}
