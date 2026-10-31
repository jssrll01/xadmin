import React, { useState } from 'react';

import { supabase as defaultSupabase } from '../supabase';

const supabase = ylDbModule.yuelinSupabase || ylDbModule.supabase || ylDbModule.default || defaultSupabase;

export default function XadminPointsAdjuster() {
  const [targetUserId, setTargetUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleAdjustment(e) {
    e.preventDefault();
    if (!targetUserId || !amount || !reason) return;

    setSubmitting(true);
    setStatus(null);

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase.rpc('fn_admin_manual_points_adjustment', {
      p_target_user_id: targetUserId,
      p_admin_id: user?.id,
      p_amount: Number(amount),
      p_reason: reason,
    });

    if (error) {
      setStatus({ type: 'error', message: error.message });
    } else {
      setStatus({ type: 'success', message: `Manual point adjustment issued. Ref: ${data.ref}` });
      setTargetUserId('');
      setAmount('');
      setReason('');
    }
    setSubmitting(false);
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl max-w-lg text-xs">
      <h3 className="text-base font-serif text-amber-100 mb-1">Manual Points Adjuster (YUÉLÍN Ledger)</h3>
      <p className="text-neutral-400 mb-4">Audited override to add or deduct member points balance directly in the points ledger.</p>

      <form onSubmit={handleAdjustment} className="space-y-4">
        <div>
          <label className="block text-neutral-300 mb-1">Target Member User UUID</label>
          <input
            type="text"
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            required
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-200 focus:border-amber-400 outline-none"
            placeholder="e.g. e4a1b02c-..."
          />
        </div>

        <div>
          <label className="block text-neutral-300 mb-1">Points Amount (Positive to add, Negative to deduct)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-200 focus:border-amber-400 outline-none"
            placeholder="e.g. 500 or -250"
          />
        </div>

        <div>
          <label className="block text-neutral-300 mb-1">Adjustment Reason / Audit Note</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            rows={3}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-200 focus:border-amber-400 outline-none"
            placeholder="State the explicit mandate or customer service reason for this adjustment..."
          />
        </div>

        {status && (
          <div className={`p-3 rounded-lg border text-xs ${
            status.type === 'success' ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200' : 'bg-red-950/60 border-red-800 text-red-200'
          }`}>
            {status.message}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold rounded-lg transition disabled:opacity-50"
        >
          {submitting ? 'Recording Audit Transaction...' : 'Submit Points Adjustment'}
        </button>
      </form>
    </div>
  );
}
