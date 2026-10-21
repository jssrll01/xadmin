import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Trash2, FilePlus2, Download } from 'lucide-react';
import { getReceipt, deleteReceipt } from '../lib/receipts.js';
import { exportPDF, exportThermal, exportExcel, exportCSV, exportPNG } from '../lib/exporters.js';
import ReceiptPreview from '../components/ReceiptPreview.jsx';

export default function ReceiptView() {
  const { id } = useParams();
  const nav = useNavigate();
  const previewRef = useRef(null);
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await getReceipt(id);
      setReceipt(data);
      setLoading(false);
    })();
  }, [id]);

  // expose Export to header
  useEffect(() => {
    if (!receipt) return;
    window.__xquoteViewProps = {
      onExport: () => setExportOpen(o => !o),
    };
    return () => { delete window.__xquoteViewProps; };
  }, [receipt]);

  const doExport = async (kind) => {
    setExportOpen(false);
    try {
      if (kind === 'pdf')   await exportPDF(receipt);
      if (kind === 'therm') await exportThermal(receipt);
      if (kind === 'excel') exportExcel(receipt);
      if (kind === 'csv')   exportCSV(receipt);
      if (kind === 'png')   await exportPNG(previewRef.current, receipt.receipt_no);
    } catch (e) { alert('Export failed: ' + e.message); }
  };

  const remove = async () => {
    if (!confirm(`Delete ${receipt.receipt_no}? This cannot be undone.`)) return;
    const { error } = await deleteReceipt(receipt.id);
    if (error) return alert(error.message);
    nav('/quotations');
  };

  if (loading) return <div style={{ padding: 30, textAlign: 'center' }} className="muted">Loading…</div>;
  if (!receipt) return <div style={{ padding: 30, textAlign: 'center' }} className="muted">Receipt not found</div>;

  return (
    <div className="page-enter" style={{ padding: 16, paddingBottom: 100 }}>
      {/* back / delete row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button onClick={() => nav(-1)} className="neu-btn" style={{ padding: 10, borderRadius: 10 }}>
          <ArrowLeft size={16} style={{ color: '#7A8499' }} />
        </button>
        <button onClick={remove} className="neu-btn" style={{ padding: 10, borderRadius: 10, color: '#DC2626' }}>
          <Trash2 size={16} />
        </button>
      </div>

      {/* receipt preview */}
      <div ref={previewRef}><ReceiptPreview receipt={receipt} /></div>

      {/* export picker (toggle) */}
      {exportOpen && (
        <div className="neu-card" style={{ padding: 12, marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <ExportBtn icon={Download} label="PDF (A4)"      onClick={() => doExport('pdf')} />
          <ExportBtn icon={Download} label="Thermal 80mm"  onClick={() => doExport('therm')} />
          <ExportBtn icon={Download} label="Excel (.xlsx)" onClick={() => doExport('excel')} />
          <ExportBtn icon={Download} label="CSV"           onClick={() => doExport('csv')} />
          <ExportBtn icon={Download} label="Image (PNG)"   onClick={() => doExport('png')} />
        </div>
      )}

      {/* bottom actions: Export toggle + New receipt */}
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button onClick={() => setExportOpen(o => !o)} className="neu-btn"
          style={{ flex: 1, padding: 14, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
          <Download size={16} style={{ color: '#6366F1' }} /> Export
        </button>
        <Link to="/quotations/new" className="neu-btn"
          style={{ flex: 1, padding: 14, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#2B3244', fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>
          <FilePlus2 size={16} /> New receipt
        </Link>
      </div>
    </div>
  );
}

function ExportBtn({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} className="neu-btn"
      style={{ padding: '12px 14px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700 }}>
      <Icon size={16} style={{ color: '#6366F1' }} />
      {label}
    </button>
  );
}
