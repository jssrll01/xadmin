import { supabase } from '../supabase.js';
const CODE = import.meta.env.VITE_XADMIN_PIN;
export async function xrpc(fn, args = {}) {
  const { data, error } = await supabase.rpc(fn, { p_code: CODE, ...args });
  if (error) throw error;
  return data;
}
