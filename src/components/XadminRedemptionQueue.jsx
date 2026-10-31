import React, { useState, useEffect } from 'react';

import { supabase as defaultSupabase } from '../supabase';

const supabase = ylDbModule.yuelinSupabase || ylDbModule.supabase || ylDbModule.default || defaultSupabase;

export default function XadminRedemptionQueue() {
  const [redemptions, setRedemptions] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  async function loadRedemptions() {
    setLoading(true);
    let query = supabase
      .from('reward_redemptions')
      .select('*, rewards(name)')
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data } = await query;
    if (data) setRedemptions(data);
    setLoading(false);
  }

  useEffect(() => {
    loadRedemptions();
  }, [filter]);

  async function updateStatus(redemptionId, targetStatus, reason) {
    setProcessingId(redemptionId);
    const { data: { user } } = await supabase.auth.getUser();

    if (targetStatus === 'rejected' || targetStatus === 'canceled') {
      await supabase.rpc('fn_cancel_or_reject_redemption', {
        p_redemption_id: redemptionId,
        p_admin_or_user_id: user?.id,
        p_target_status: targetStatus,
        p_reason: reason,
      });
    } else {
      await supabase
        .from('reward_redemptions')
        .update({ status: 'completed', processed_by: user?.id, updated_at: new Date().toISOString() })
        .eq('id', redemptionId);
    }

    setProcessingId(null);
    loadRedemptions();
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl text-xs">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-base font-serif text-amber-100">Redemption Queue (YUÉLÍN)</h2>
          <p className="text-neutral-400">Process reward claims or trigger automatic point reversals.</p>
        </div>

        <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800">
          {['pending', 'processing', 'completed', 'rejected', 'all'].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1 rounded-md capitalize transition ${
                filter === st ? 'bg-amber-500/20 text-amber-300 font-medium' : 'text-neutral-400'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-48 bg-neutral-950 animate-pulse rounded-xl" />
      ) : redemptions.length === 0 ? (
        <p className="text-neutral-500 py-6 text-center">No redemptions found for filter "{filter}".</p>
      ) : (
        <div className="space-y-3">
          {redemptions.map((item) => (
            <div key={item.id} className="bg-neutral-950 border border-neutral-800/80 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-amber-300 font-bold">{item.reference_code}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                    item.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                    item.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {item.status}
                  </span>
                </div>
                <p className="text-neutral-200 mt-1">{item.quantity}x {item.rewards?.name || 'Reward Item'}</p>
                <p className="text-neutral-400 text-[10px]">User: {item.user_id} | Spent: {item.points_spent} pts</p>
              </div>

              {item.status === 'pending' && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    disabled={processingId === item.id}
                    onClick={() => updateStatus(item.id, 'completed', 'Fulfilling reward')}
                    className="flex-1 sm:flex-initial px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-800 rounded-lg font-medium"
                  >
                    Complete
                  </button>
                  <button
                    disabled={processingId === item.id}
                    onClick={() => updateStatus(item.id, 'rejected', 'Admin out of stock refund')}
                    className="flex-1 sm:flex-initial px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-800 rounded-lg font-medium"
                  >
                    Reject & Refund
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
