import { supabase } from '../supabase.js';
const PIN = import.meta.env.VITE_XADMIN_PIN;
const actor = () => sessionStorage.getItem('xadmin_actor') || 'admin';

async function call(fn, args) {
  const { data, error } = await supabase.rpc(fn, { p_pin: PIN, ...args });
  if (error) return { ok: false, error: error.message };
  if (data && typeof data === 'object' && 'ok' in data) return data;
  return { ok: true, data };
}

export async function pricingRead() {
  const { data, error } = await supabase.rpc('admin_pricing_read', { p_pin: PIN });
  return { data, error };
}
export const num = (v) => (v === '' || v == null ? null : Number(v));

export const saveTier = (r) => call('admin_discount_tier_save', {
  p_id: r.id || null, p_min: num(r.min_price), p_max: num(r.max_price),
  p_rate: num(r.rate_pct), p_cap: num(r.max_discount),
  p_active: !!r.is_active, p_order: num(r.display_order) || 0, p_actor: actor() });
export const deleteTier = (id) => call('admin_discount_tier_delete', { p_id: id, p_actor: actor() });

export const saveShip = (r) => call('admin_shipping_rule_save', {
  p_id: r.id || null, p_min: num(r.min_subtotal), p_max: num(r.max_subtotal),
  p_fee: num(r.shipping_fee), p_active: !!r.is_active,
  p_order: num(r.display_order) || 0, p_actor: actor() });
export const deleteShip = (id) => call('admin_shipping_rule_delete', { p_id: id, p_actor: actor() });

export const saveSetting = (key, value) =>
  call('admin_platform_setting_save', { p_key: key, p_value: value, p_actor: actor() });

export async function previewDiscount(price, cost) {
  const { data, error } = await supabase.rpc('calculate_unit_discount',
    { p_price: Number(price), p_cost: cost === '' || cost == null ? null : Number(cost) });
  return { data, error };
}
