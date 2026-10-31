import React, { useState } from 'react';
import XadminCheckinConfig from '../components/XadminCheckinConfig';
import XadminReferralFraud from '../components/XadminReferralFraud';
import XadminRedemptionQueue from '../components/XadminRedemptionQueue';
import XadminMissionManager from '../components/XadminMissionManager';
import XadminPointsAdjuster from '../components/XadminPointsAdjuster';

export default function YuelinAdminDashboard() {
  const [activeTab, setActiveTab] = useState('checkin');

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
      <header className="max-w-6xl mx-auto mb-8 border-b border-neutral-800 pb-4 flex justify-between items-center">
        <div>
          <span className="text-xs bg-amber-500/10 text-amber-400 font-semibold px-2.5 py-1 rounded-full border border-amber-500/20">
            YUÉLÍN System
          </span>
          <h1 className="text-2xl font-serif text-amber-100 mt-2">YUÉLÍN Master Administration</h1>
          <p className="text-xs text-neutral-400 mt-1">Manage check-in multipliers, referral risk scores, engagement missions, and point redemptions.</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        <div className="flex flex-wrap gap-2 mb-8 border-b border-neutral-800/80 pb-3">
          {[
            { id: 'checkin', label: 'Daily Check-in' },
            { id: 'referrals', label: 'Referrals & Fraud' },
            { id: 'redemptions', label: 'Redemption Queue' },
            { id: 'missions', label: 'Mission Manager' },
            { id: 'points', label: 'Points Adjuster' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-medium rounded-xl transition ${
                activeTab === tab.id
                  ? 'bg-amber-400 text-neutral-950 font-bold shadow-lg shadow-amber-400/10'
                  : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {activeTab === 'checkin' && <XadminCheckinConfig />}
          {activeTab === 'referrals' && <XadminReferralFraud />}
          {activeTab === 'redemptions' && <XadminRedemptionQueue />}
          {activeTab === 'missions' && <XadminMissionManager />}
          {activeTab === 'points' && <XadminPointsAdjuster />}
        </div>
      </main>
    </div>
  );
}
