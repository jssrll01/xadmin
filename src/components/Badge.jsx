import React from 'react';
const COLORS = {
  pending: { bg: '#FEF3C7', fg: '#78350F' },
  awaiting_verification: { bg: '#DBEAFE', fg: '#1E40AF' },
  approved: { bg: '#D1FAE5', fg: '#065F46' },
  completed: { bg: '#D1FAE5', fg: '#065F46' },
  delivered: { bg: '#D1FAE5', fg: '#065F46' },
  shipped: { bg: '#DBEAFE', fg: '#1E40AF' },
  processing: { bg: '#FEF3C7', fg: '#78350F' },
  rejected: { bg: '#FEE2E2', fg: '#991B1B' },
  cancelled: { bg: '#FEE2E2', fg: '#991B1B' },
  submitted: { bg: '#DBEAFE', fg: '#1E40AF' },
  active: { bg: '#D1FAE5', fg: '#065F46' },
  verified: { bg: '#D1FAE5', fg: '#065F46' },
  refunded: { bg: '#E0E7FF', fg: '#3730A3' },
  received: { bg: '#DBEAFE', fg: '#1E40AF' },
};
export default function Badge({ status, children }) {
  const c = COLORS[status] || { bg: '#E0E4EC', fg: '#374151' };
  return (
    <span className="neu-badge" style={{ background: c.bg, color: c.fg }}>
      {children || status}
    </span>
  );
}
