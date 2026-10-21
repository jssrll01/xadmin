import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { BUSINESS, CURRENCIES, PAYMENT_METHODS, DELIVERY_METHODS, STATUSES } from './constants-quote.js';

const fmt = (receipt) => {
  const cur = CURRENCIES[receipt.currency] || CURRENCIES.PHP;
  const money = (n) => cur.symbol + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const payLabel = PAYMENT_METHODS.find(p => p.value === receipt.payment_method)?.label || receipt.payment_method;
  const delLabel = DELIVERY_METHODS.find(d => d.value === receipt.delivery_method)?.label || receipt.delivery_method;
  const stLabel = STATUSES.find(s => s.value === receipt.status)?.label || receipt.status;
  return { cur, money, payLabel, delLabel, stLabel };
};

/* ─── PDF (A4) ─── */
export async function exportPDF(receipt) {
  const { money, payLabel, delLabel, stLabel } = fmt(receipt);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  let y = 20;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(BUSINESS.name, 20, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(BUSINESS.address, 20, y); y += 4;
  doc.text(`${BUSINESS.phone}  ·  ${BUSINESS.email}`, 20, y); y += 8;

  doc.setDrawColor(200);
  doc.line(20, y, W - 20, y); y += 8;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RECEIPT', 20, y);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`No: ${receipt.receipt_no}`, W - 20, y, { align: 'right' });
  y += 5;
  doc.text(`Date: ${new Date(receipt.created_at || Date.now()).toLocaleString()}`, W - 20, y, { align: 'right' });
  y += 5;
  doc.text(`Status: ${stLabel}`, W - 20, y, { align: 'right' });
  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', 20, y); y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(receipt.customer_name || '—', 20, y); y += 4;
  doc.text(receipt.customer_email || '—', 20, y); y += 4;
  const addrLines = doc.splitTextToSize(receipt.customer_address || '—', 100);
  doc.text(addrLines, 20, y); y += addrLines.length * 4 + 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Payment', 20, y);
  doc.text('Delivery', 90, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(payLabel, 20, y);
  doc.text(delLabel, 90, y);
  y += 10;

  // table
  doc.setFillColor(238, 241, 246);
  doc.rect(20, y - 5, W - 40, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('Item', 22, y);
  doc.text('Qty', 130, y, { align: 'right' });
  doc.text('Price', 155, y, { align: 'right' });
  doc.text('Total', W - 22, y, { align: 'right' });
  y += 6;

  doc.setFont('helvetica', 'normal');
  (receipt.items || []).forEach(it => {
    const name = doc.splitTextToSize(it.name || '—', 100);
    doc.text(name, 22, y);
    doc.text(String(it.quantity ?? 1), 130, y, { align: 'right' });
    doc.text(money(it.price), 155, y, { align: 'right' });
    doc.text(money((Number(it.quantity) || 0) * (Number(it.price) || 0)), W - 22, y, { align: 'right' });
    y += Math.max(5, name.length * 4);
  });

  y += 4;
  doc.setDrawColor(220);
  doc.line(130, y, W - 20, y); y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal', 130, y); doc.text(money(receipt.subtotal), W - 22, y, { align: 'right' }); y += 5;
  doc.text(`Tax (${receipt.tax_rate}%)`, 130, y); doc.text(money(receipt.tax_amount), W - 22, y, { align: 'right' }); y += 5;
  doc.text(`Discount`, 130, y); doc.text('-' + money(receipt.discount_amount), W - 22, y, { align: 'right' }); y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL', 130, y); doc.text(money(receipt.total), W - 22, y, { align: 'right' }); y += 10;

  if (receipt.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Notes', 20, y); y += 4;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(receipt.notes, W - 40);
    doc.text(lines, 20, y); y += lines.length * 4;
  }

  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text('Thank you for shopping with XMARKET.', W / 2, 285, { align: 'center' });

  doc.save(`${receipt.receipt_no || 'receipt'}.pdf`);
}

/* ─── Thermal 80mm ─── */
export async function exportThermal(receipt) {
  const { money, payLabel, delLabel } = fmt(receipt);
  const doc = new jsPDF({ unit: 'mm', format: [80, 297] });
  let y = 8;
  const W = 80;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(BUSINESS.name, W / 2, y, { align: 'center' }); y += 5;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(BUSINESS.address, W / 2, y, { align: 'center' }); y += 4;
  doc.text(BUSINESS.phone, W / 2, y, { align: 'center' }); y += 4;
  doc.text(BUSINESS.email, W / 2, y, { align: 'center' }); y += 6;

  doc.setLineWidth(0.2);
  doc.line(5, y, W - 5, y); y += 5;

  doc.setFontSize(8);
  doc.text(`No:  ${receipt.receipt_no}`, 5, y); y += 4;
  doc.text(`Date: ${new Date(receipt.created_at || Date.now()).toLocaleString()}`, 5, y); y += 4;
  doc.text(`Cust: ${receipt.customer_name || '—'}`, 5, y); y += 4;
  if (receipt.customer_email) { doc.text(`Mail: ${receipt.customer_email}`, 5, y); y += 4; }
  doc.text(`Pay:  ${payLabel}`, 5, y); y += 4;
  doc.text(`Ship: ${delLabel}`, 5, y); y += 5;

  doc.line(5, y, W - 5, y); y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Item', 5, y);
  doc.text('Qty', 47, y, { align: 'right' });
  doc.text('Total', W - 5, y, { align: 'right' }); y += 4;
  doc.setFont('helvetica', 'normal');

  (receipt.items || []).forEach(it => {
    const name = doc.splitTextToSize(it.name || '—', 38);
    doc.text(name, 5, y);
    doc.text(String(it.quantity ?? 1), 47, y, { align: 'right' });
    doc.text(money((Number(it.quantity) || 0) * (Number(it.price) || 0)), W - 5, y, { align: 'right' });
    y += Math.max(4, name.length * 3.6);
  });

  y += 2;
  doc.line(5, y, W - 5, y); y += 5;
  doc.text('Subtotal', 5, y); doc.text(money(receipt.subtotal), W - 5, y, { align: 'right' }); y += 4;
  doc.text(`Tax ${receipt.tax_rate}%`, 5, y); doc.text(money(receipt.tax_amount), W - 5, y, { align: 'right' }); y += 4;
  doc.text('Discount', 5, y); doc.text('-' + money(receipt.discount_amount), W - 5, y, { align: 'right' }); y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL', 5, y); doc.text(money(receipt.total), W - 5, y, { align: 'right' }); y += 8;

  if (receipt.notes) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize('Note: ' + receipt.notes, W - 10);
    doc.text(lines, 5, y); y += lines.length * 4;
  }

  doc.setFontSize(8);
  doc.text('Thank you!', W / 2, y + 4, { align: 'center' });

  doc.save(`${receipt.receipt_no || 'receipt'}-thermal.pdf`);
}

/* ─── Excel (.xlsx) ─── */
export function exportExcel(receipt) {
  const { payLabel, delLabel, stLabel } = fmt(receipt);
  const header = [
    ['XMARKET — Receipt'],
    ['Receipt No', receipt.receipt_no],
    ['Date', new Date(receipt.created_at || Date.now()).toLocaleString()],
    ['Status', stLabel],
    [],
    ['Bill to'],
    ['Customer', receipt.customer_name],
    ['Email', receipt.customer_email],
    ['Address', receipt.customer_address],
    [],
    ['Payment', payLabel, 'Delivery', delLabel],
    ['Currency', receipt.currency],
    [],
    ['Item', 'Quantity', 'Price', 'Line Total'],
    ...(receipt.items || []).map(it => [
      it.name,
      Number(it.quantity) || 0,
      Number(it.price) || 0,
      (Number(it.quantity) || 0) * (Number(it.price) || 0),
    ]),
    [],
    ['Subtotal', receipt.subtotal],
    [`Tax ${receipt.tax_rate}%`, receipt.tax_amount],
    ['Discount', -receipt.discount_amount],
    ['TOTAL', receipt.total],
    [],
    ['Notes', receipt.notes || ''],
  ];
  const ws = XLSX.utils.aoa_to_sheet(header);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Receipt');
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([out], { type: 'application/octet-stream' }), `${receipt.receipt_no || 'receipt'}.xlsx`);
}

/* ─── CSV ─── */
export function exportCSV(receipt) {
  const { payLabel, delLabel, stLabel } = fmt(receipt);
  const rows = [
    ['XMARKET Receipt'],
    ['Receipt No', receipt.receipt_no],
    ['Date', new Date(receipt.created_at || Date.now()).toLocaleString()],
    ['Status', stLabel],
    ['Customer', receipt.customer_name],
    ['Email', receipt.customer_email],
    ['Address', receipt.customer_address],
    ['Payment', payLabel],
    ['Delivery', delLabel],
    ['Currency', receipt.currency],
    [],
    ['Item', 'Quantity', 'Price', 'Line Total'],
    ...(receipt.items || []).map(it => [
      it.name,
      Number(it.quantity) || 0,
      Number(it.price) || 0,
      (Number(it.quantity) || 0) * (Number(it.price) || 0),
    ]),
    [],
    ['Subtotal', receipt.subtotal],
    [`Tax ${receipt.tax_rate}%`, receipt.tax_amount],
    ['Discount', -receipt.discount_amount],
    ['TOTAL', receipt.total],
    ['Notes', receipt.notes || ''],
  ];
  const csv = rows.map(r => r.map(v => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n');

  saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${receipt.receipt_no || 'receipt'}.csv`);
}

/* ─── PNG (from DOM node) ─── */
export async function exportPNG(node, receiptNo) {
  if (!node) throw new Error('No printable node found');
  const canvas = await html2canvas(node, {
    backgroundColor: '#ffffff', scale: 2, useCORS: true,
  });
  canvas.toBlob((blob) => {
    if (blob) saveAs(blob, `${receiptNo || 'receipt'}.png`);
  }, 'image/png');
}
