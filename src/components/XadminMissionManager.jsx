import React, { useState } from 'react';
import { supabase } from '../supabase';

export default function XadminMissionManager() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('daily');
  const [rewardPoints, setRewardPoints] = useState(50);
  const [targetCount, setTargetCount] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);

    const { error } = await supabase.from('missions').insert({
      title,
      description,
      category,
      reward_points: Number(rewardPoints),
      event_trigger: 'manual_action',
      target_count: Number(targetCount),
      start_date: new Date().toISOString(),
      is_active: true,
    });

    if (error) {
      setStatus(`Error: ${error.message}`);
    } else {
      setStatus('Mission created successfully.');
      setTitle('');
      setDescription('');
    }
    setSubmitting(false);
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl max-w-lg text-xs">
      <h2 className="text-base font-serif text-amber-100 mb-1">Create Engagement Mission (YUÉLÍN)</h2>
      <p className="text-neutral-400 mb-4">Define new tasks and point incentives for members.</p>

      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label className="block text-neutral-300 mb-1">Mission Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-200 focus:border-amber-400 outline-none"
            placeholder="e.g. Complete First Redemption"
          />
        </div>

        <div>
          <label className="block text-neutral-300 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={2}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-200 focus:border-amber-400 outline-none"
            placeholder="Explain what the user needs to achieve..."
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-neutral-300 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-200 outline-none"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="special">Special</option>
              <option value="seasonal">Seasonal</option>
            </select>
          </div>

          <div>
            <label className="block text-neutral-300 mb-1">Reward (pts)</label>
            <input
              type="number"
              value={rewardPoints}
              onChange={(e) => setRewardPoints(e.target.value)}
              required
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-neutral-300 mb-1">Target Count</label>
            <input
              type="number"
              value={targetCount}
              onChange={(e) => setTargetCount(e.target.value)}
              required
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-200 outline-none"
            />
          </div>
        </div>

        {status && <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-amber-300">{status}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold rounded-lg transition"
        >
          {submitting ? 'Creating...' : 'Publish Mission'}
        </button>
      </form>
    </div>
  );
}
