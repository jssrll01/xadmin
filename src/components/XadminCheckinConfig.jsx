import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function XadminCheckinConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    async function fetchConfig() {
      setLoading(true);
      const { data, error } = await supabase
        .from('checkin_configs')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (!error && data) {
        setConfig(data);
      } else {
        setConfig({
          id: 1,
          is_enabled: true,
          day_1_points: 10,
          day_2_points: 15,
          day_3_points: 20,
          day_4_points: 25,
          day_5_points: 30,
          day_6_points: 40,
          day_7_points: 100,
          vip_multiplier: 1.5,
          reset_hour: 1
        });
      }
      setLoading(false);
    }
    fetchConfig();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    if (!config) return;

    setSaving(true);
    setMsg(null);

    const { error } = await supabase
      .from('checkin_configs')
      .upsert({
        id: 1,
        is_enabled: config.is_enabled,
        day_1_points: Number(config.day_1_points),
        day_2_points: Number(config.day_2_points),
        day_3_points: Number(config.day_3_points),
        day_4_points: Number(config.day_4_points),
        day_5_points: Number(config.day_5_points),
        day_6_points: Number(config.day_6_points),
        day_7_points: Number(config.day_7_points),
        vip_multiplier: Number(config.vip_multiplier),
        reset_hour: Number(config.reset_hour),
        updated_at: new Date().toISOString(),
      });

    if (error) {
      setMsg({ type: 'error', text: error.message });
    } else {
      setMsg({ type: 'success', text: 'Daily check-in rules updated successfully.' });
    }
    setSaving(false);
  }

  if (loading) return <div className="p-6 bg-neutral-900 animate-pulse text-neutral-400 text-xs">Loading YUÉLÍN check-in config...</div>;

  return (
    <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl max-w-2xl text-xs">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-base font-serif text-amber-100">Daily Check-in Settings (YUÉLÍN)</h2>
          <p className="text-neutral-400">Configure 7-day point rewards, VIP multipliers, and Manila 1:00 AM reset schedules.</p>
        </div>
        <button
          type="button"
          onClick={() => setConfig({ ...config, is_enabled: !config.is_enabled })}
          className={`px-3 py-1.5 rounded-lg font-semibold transition ${
            config.is_enabled ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'
          }`}
        >
          {config.is_enabled ? 'System Active' : 'System Disabled'}
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
            const key = `day_${day}_points`;
            return (
              <div key={day}>
                <label className="block text-neutral-400 mb-1">Day {day} Points</label>
                <input
                  type="number"
                  value={config[key] || 0}
                  onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                  required
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-neutral-200 focus:border-amber-400 outline-none"
                />
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-800">
          <div>
            <label className="block text-neutral-400 mb-1">VIP Multiplier</label>
            <input
              type="number"
              step="0.1"
              value={config.vip_multiplier || 1.5}
              onChange={(e) => setConfig({ ...config, vip_multiplier: e.target.value })}
              required
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-200 focus:border-amber-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-neutral-400 mb-1">Reset Hour (0-23 Manila Time)</label>
            <input
              type="number"
              min="0"
              max="23"
              value={config.reset_hour || 1}
              onChange={(e) => setConfig({ ...config, reset_hour: e.target.value })}
              required
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-200 focus:border-amber-400 outline-none"
            />
          </div>
        </div>

        {msg && (
          <div className={`p-3 rounded-lg border ${
            msg.type === 'success' ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200' : 'bg-red-950/60 border-red-800 text-red-200'
          }`}>
            {msg.text}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold rounded-lg transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </form>
    </div>
  );
}
