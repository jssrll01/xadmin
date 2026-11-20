import React from 'react';
import { supabase } from '../../supabase.js';
import { getAdminPin } from '../../lib/pin.js';

export const call = async (fn, args = {}) => {
  const { data, error } = await supabase.rpc(fn, { p_code: getAdminPin(), ...args });
  if (error) throw error;
  return data;
};
export const card = { background: 'var(--bg, #e0e5ec)', borderRadius: 16, padding: 12, boxShadow: '6px 6px 12px rgba(163,177,198,.5), -6px -6px 12px rgba(255,255,255,.7)' };
export const inp = { padding: 8, borderRadius: 10, minWidth: 150 };
export const Btn = ({ style, ...p }) => <button className="neu-btn" style={{ padding: '8px 14px', fontWeight: 700, ...style }} {...p} />;
