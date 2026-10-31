import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function XadminReferralFraud() {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReferrals() {
      setLoading(true);
      const { data } = await supabase
        .from('referral_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) setReferrals(data);
      setLoading(false);
    }
    fetchReferrals();
  }, []);

  return (
    <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl text-xs">
      <h2 className="text-base font-serif text-amber-100 mb-1">Referral & Fraud Audit (YUÉLÍN)</h2>
      <p className="text-neutral-400 mb-6">Inspect member referral links, risk scores, and registration patterns.</p>

      {loading ? (
        <div className="h-48 bg-neutral-950 animate-pulse rounded-xl" />
      ) : referrals.length === 0 ? (
        <p className="text-neutral-500 py-6 text-center">No referral logs recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Referrer UUID</th>
                <th className="py-2 px-3">Referred User</th>
                <th className="py-2 px-3">Risk Score</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 text-neutral-200">
              {referrals.map((ref) => (
                <tr key={ref.id} className="hover:bg-neutral-950/40">
                  <td className="py-2.5 px-3 text-neutral-400">{new Date(ref.created_at).toLocaleDateString()}</td>
                  <td className="py-2.5 px-3 font-mono">{ref.referrer_id?.slice(0, 8)}...</td>
                  <td className="py-2.5 px-3 font-mono">{ref.referred_user_id?.slice(0, 8)}...</td>
                  <td className="py-2.5 px-3">
                    {ref.risk_score > 70 ? (
                      <span className="text-red-400 font-bold bg-red-950/80 px-2 py-0.5 rounded border border-red-800">
                        High ({ref.risk_score}%)
                      </span>
                    ) : (
                      <span className="text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded">
                        Normal ({ref.risk_score || 0}%)
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 capitalize">{ref.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
